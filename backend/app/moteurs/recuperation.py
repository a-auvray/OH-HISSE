"""Récupération : combien de temps avant le prochain effort intense (note 05).

Chaque séance et chaque sortie en mer déplace l'heure de fin de récupération.
Les événements sont rejoués dans l'ordre :

- une séance fixe une fin à « son heure + sa durée » (si c'est plus tard que la fin en cours) ;
- une sortie dure (longue nage, eau froide) repousse la fin en cours ;
- une baignade courte en eau douce est une récupération active : elle l'avance.

Fonctions pures ; règles dans `regles/vie_courante.toml` (validées le 18/11/2026).
"""

import datetime as dt
import tomllib
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from statistics import mean
from typing import Any, Literal

FICHIER_REGLES = Path(__file__).parent / "regles" / "vie_courante.toml"


@lru_cache
def regles_vie_courante() -> dict[str, dict[str, Any]]:
    with FICHIER_REGLES.open("rb") as f:
        return tomllib.load(f)


TypeSeance = Literal["max", "force", "volume", "legere"]


@dataclass(frozen=True)
class SerieResumee:
    reps: int
    rpe: float | None
    echec: bool = False


@dataclass(frozen=True)
class SeanceResumee:
    jour: dt.date
    series: tuple[SerieResumee, ...]
    ressenti: int | None = None


@dataclass(frozen=True)
class SortieResumee:
    debut: dt.datetime
    duree_min: int
    type: Literal["baignade", "nage", "plongee"]
    eau_c: float | None


@dataclass(frozen=True)
class NuitResumee:
    jour: dt.date  # jour du réveil
    heures: float


@dataclass(frozen=True)
class EtatRecuperation:
    restant_h: float
    total_h: float  # durée de la récupération en cours (pour la jauge)
    fin: dt.datetime | None  # prochain effort intense conseillé
    raisons: tuple[str, ...] = field(default=())

    @property
    def recupere(self) -> bool:
        return self.restant_h <= 0

    @property
    def progression(self) -> float:
        """De 0 (tout juste fini) à 1 (récupéré)."""
        if self.total_h <= 0:
            return 1.0
        return max(0.0, min(1.0, 1 - self.restant_h / self.total_h))


def majuscule(texte: str) -> str:
    """Première lettre en majuscule, sans toucher au reste (« °C » reste « °C »)."""
    return texte[:1].upper() + texte[1:]


def _rpe(serie: SerieResumee) -> float | None:
    return 10.0 if serie.echec else serie.rpe


def type_de_seance(seance: SeanceResumee) -> TypeSeance:
    """Classe une séance : tentative de max, force, volume ou légère."""
    rpes = [r for s in seance.series if (r := _rpe(s)) is not None]
    if any(s.reps <= 2 and (_rpe(s) or 0) >= 9 for s in seance.series):
        return "max"
    reps_max = max((s.reps for s in seance.series), default=0)
    if rpes and reps_max <= 5 and max(rpes) >= 8:
        return "force"
    if rpes and mean(rpes) <= 7:
        return "legere"
    return "volume"


LIBELLES: dict[TypeSeance, str] = {
    "max": "tentative de max",
    "force": "séance de force",
    "volume": "séance de volume",
    "legere": "séance légère",
}


def duree_seance(
    seance: SeanceResumee, nuits: list[NuitResumee], regles: dict[str, Any]
) -> tuple[float, list[str]]:
    genre = type_de_seance(seance)
    heures = float(regles[f"{genre}_h"])
    raisons = [f"{majuscule(LIBELLES[genre])} du {seance.jour:%d/%m} : {heures:.0f} h"]
    if seance.ressenti is not None and seance.ressenti <= int(regles["ressenti_rouge_max"]):
        heures += float(regles["ressenti_rouge_h"])
        raisons.append(f"Ressenti {seance.ressenti}/10 : +{regles['ressenti_rouge_h']} h")
    nuit_suivante = next((n for n in nuits if n.jour == seance.jour + dt.timedelta(days=1)), None)
    if nuit_suivante and nuit_suivante.heures < float(regles["nuit_courte_max_h"]):
        heures += float(regles["nuit_courte_h"])
        raisons.append(f"Nuit courte ensuite ({nuit_suivante.heures:g} h) : +{regles['nuit_courte_h']} h")
    return heures, raisons


def etat(
    seances: list[SeanceResumee],
    sorties: list[SortieResumee],
    nuits: list[NuitResumee],
    maintenant: dt.datetime,
    regles: dict[str, Any] | None = None,
) -> EtatRecuperation:
    r = regles or regles_vie_courante()["recuperation"]
    fuseau = maintenant.tzinfo
    evenements: list[tuple[dt.datetime, str, Any]] = []
    for s in seances:
        instant = dt.datetime.combine(s.jour, dt.time(int(r["heure_seance"])), fuseau)
        evenements.append((instant, "seance", s))
    for mer in sorties:
        evenements.append((mer.debut, "sortie", mer))
    evenements = sorted((e for e in evenements if e[0] <= maintenant), key=lambda e: e[0])

    fin: dt.datetime | None = None
    debut_fenetre: dt.datetime | None = None
    raisons: list[str] = []
    for instant, genre, objet in evenements:
        if genre == "seance":
            heures, details = duree_seance(objet, nuits, r)
            candidate = instant + dt.timedelta(hours=heures)
            if fin is None or candidate > fin:
                fin, debut_fenetre, raisons = candidate, instant, details
            continue
        sortie: SortieResumee = objet
        froide = sortie.eau_c is not None and sortie.eau_c < float(r["sortie_dure_eau_c"])
        longue = sortie.type == "nage" and sortie.duree_min > int(r["sortie_dure_minutes"])
        douce = sortie.eau_c is not None and sortie.eau_c >= float(r["recup_active_eau_c"])
        if longue or froide:
            base = fin if fin is not None and fin > instant else instant
            if base == instant:
                debut_fenetre, raisons = instant, []
            fin = base + dt.timedelta(hours=float(r["sortie_dure_h"]))
            cause = f"{sortie.duree_min} min de {sortie.type}" + (
                f" dans une eau à {sortie.eau_c:g} °C" if froide else ""
            )
            raisons.append(f"{majuscule(cause)} : +{r['sortie_dure_h']} h")
        elif (
            sortie.duree_min <= int(r["recup_active_minutes"]) and douce and fin is not None and fin > instant
        ):
            fin = max(instant, fin - dt.timedelta(hours=float(r["recup_active_h"])))
            raisons.append(f"Baignade de récupération active : −{r['recup_active_h']} h")

    if fin is None or debut_fenetre is None:
        return EtatRecuperation(0, 0, None, ("Aucun effort récent",))
    restant = max(0.0, (fin - maintenant).total_seconds() / 3600)
    total = (fin - debut_fenetre).total_seconds() / 3600
    return EtatRecuperation(round(restant, 1), round(total, 1), fin, tuple(raisons))


@dataclass(frozen=True)
class Consigne:
    """Ce que la récupération change à la séance du jour et à l'assistant de sortie."""

    rpe_baisse: float
    rpe_plafond: float | None
    series_au_minimum: bool
    recup_active_conseillee: bool
    raison: str | None


def consigne(etat_recup: EtatRecuperation, regles: dict[str, Any] | None = None) -> Consigne:
    r = regles or regles_vie_courante()["recuperation"]
    restant = etat_recup.restant_h
    if restant > float(r["sans_max_au_dela_h"]):
        return Consigne(
            float(r["allegement_rpe"]),
            float(r["rpe_plafond"]),
            True,
            True,
            f"Récupération incomplète ({restant:.0f} h restantes) : pas de tentative de max",
        )
    if restant > float(r["allegement_au_dela_h"]):
        return Consigne(
            float(r["allegement_rpe"]),
            None,
            True,
            False,
            f"Récupération incomplète ({restant:.0f} h restantes) : séance allégée",
        )
    return Consigne(0.0, None, False, False, None)
