"""Auto-régulation : calcule la séance suivante (note 03 du CDC).

Principe : la charge proposée découle de la même table RPE que le 1RM.

    charge totale = 1RM estimé récent × %(reps, RPE cible)
    lest proposé  = charge totale − poids du corps, arrondi au pas de lest

Si la dernière séance a été plus facile que prévu, le 1RM estimé monte et la
charge suit ; plus dure, elle baisse. Des garde-fous bornent les variations,
et chaque décision est justifiée en une phrase.

L'algorithme n'ajuste que la charge et le nombre de séries dans la plage du
bloc : le programme (exercices, répétitions) reste celui de l'utilisateur.
"""

import tomllib
from dataclasses import dataclass, field
from datetime import date
from functools import lru_cache
from pathlib import Path
from statistics import mean
from typing import Literal

from app.moteurs.rpe import Serie, arrondir, meilleur_e1rm, pourcentage_1rm

TypeBloc = Literal["force", "volume", "deload", "specifique"]


# --- Règles (fichier de configuration) -------------------------------------------


@dataclass(frozen=True)
class Regles:
    pas_de_lest_kg: float
    variation_max: float
    echecs_avant_deload: int
    baisse_deload: float
    reduction_series_deload: float
    tolerance_rpe: float
    # (reps max du format, {type de bloc: RPE}) triés par reps croissantes
    rpe_cible: tuple[tuple[int, dict[str, float]], ...]
    sommeil_court_h: float
    sommeil_tres_court_h: float
    rpe_plafond_si_epuise: float

    def rpe_par_defaut(self, type_bloc: TypeBloc, reps: int) -> float:
        colonne = "force" if type_bloc == "specifique" else type_bloc
        for reps_max, valeurs in self.rpe_cible:
            if reps <= reps_max:
                return valeurs[colonne]
        return self.rpe_cible[-1][1][colonne]


FICHIER_REGLES = Path(__file__).parent / "regles" / "autoregulation.toml"


@lru_cache
def charger_regles(chemin: Path = FICHIER_REGLES) -> Regles:
    with chemin.open("rb") as f:
        brut = tomllib.load(f)
    return Regles(
        pas_de_lest_kg=brut["pas_de_lest_kg"],
        variation_max=brut["variation_max"],
        echecs_avant_deload=brut["echecs_avant_deload"],
        baisse_deload=brut["baisse_deload"],
        reduction_series_deload=brut["reduction_series_deload"],
        tolerance_rpe=brut["tolerance_rpe"],
        rpe_cible=tuple(sorted(((int(k), v) for k, v in brut["rpe_cible"].items()), key=lambda kv: kv[0])),
        sommeil_court_h=brut["forme"]["sommeil_court_h"],
        sommeil_tres_court_h=brut["forme"]["sommeil_tres_court_h"],
        rpe_plafond_si_epuise=brut["forme"]["rpe_plafond_si_epuise"],
    )


# --- Entrées et sorties ------------------------------------------------------------


@dataclass(frozen=True)
class ExercicePrevu:
    """Une ligne du programme du bloc."""

    exercice: str
    series_min: int
    series_max: int
    reps: int
    rpe_cible: float | None = None


@dataclass(frozen=True)
class Performance:
    """Ce qui a été réalisé sur cet exercice lors d'une séance passée."""

    date: date
    series: tuple[Serie, ...]
    poids_du_corps_kg: float

    @property
    def charge_max_totale(self) -> float:
        return self.poids_du_corps_kg + max(s.lest_kg for s in self.series)

    @property
    def reps_max(self) -> int:
        """Le format de la séance : le plus grand nombre de répétitions d'une série."""
        return max(s.reps for s in self.series)

    @property
    def lest_max(self) -> float:
        return max(s.lest_kg for s in self.series)

    @property
    def rpe_moyen(self) -> float | None:
        rpes = [10.0 if s.echec else s.rpe for s in self.series if s.echec or s.rpe is not None]
        return mean(r for r in rpes if r is not None) if rpes else None

    @property
    def a_echoue(self) -> bool:
        return any(s.echec for s in self.series)


@dataclass(frozen=True)
class Forme:
    """État du jour, fourni par Vie courante (phase 4). Tout est facultatif."""

    sommeil_h: float | None = None


@dataclass(frozen=True)
class Proposition:
    exercice: str
    series: int
    reps: int
    rpe_cible: float
    # None : pas encore d'historique, l'utilisateur choisit la charge.
    lest_kg: float | None
    justifications: tuple[str, ...] = field(default=())


# --- Calcul ------------------------------------------------------------------------


def kg(valeur: float) -> str:
    """Format français : 2.5 → « 2,5 kg », 20.0 → « 20 kg »."""
    return f"{valeur:.2f}".rstrip("0").rstrip(".").replace(".", ",") + " kg"


def rpe_txt(valeur: float) -> str:
    return f"{valeur:g}".replace(".", ",")


def _cible_selon_forme(rpe: float, forme: Forme, regles: Regles, raisons: list[str]) -> float:
    if forme.sommeil_h is None:
        return rpe
    if forme.sommeil_h < regles.sommeil_tres_court_h:
        if rpe > regles.rpe_plafond_si_epuise:
            raisons.append(f"Nuit très courte ({rpe_txt(forme.sommeil_h)} h) : pas de tentative de max")
            return regles.rpe_plafond_si_epuise
        return rpe
    if forme.sommeil_h < regles.sommeil_court_h:
        raisons.append(f"Nuit courte ({rpe_txt(forme.sommeil_h)} h) : cible de RPE −1")
        return max(6.0, rpe - 1)
    return rpe


def _series(prevu: ExercicePrevu, derniere: Performance | None, rpe_cible: float, regles: Regles) -> int:
    if derniere is None or derniere.rpe_moyen is None:
        return prevu.series_min
    if derniere.a_echoue or derniere.rpe_moyen > rpe_cible + regles.tolerance_rpe:
        return prevu.series_min
    if derniere.rpe_moyen < rpe_cible - regles.tolerance_rpe:
        return prevu.series_max
    return (prevu.series_min + prevu.series_max + 1) // 2


def proposer(
    prevu: ExercicePrevu,
    type_bloc: TypeBloc,
    historique: list[Performance],
    poids_du_corps_kg: float,
    forme: Forme | None = None,
    regles: Regles | None = None,
) -> Proposition:
    """Propose séries, répétitions, RPE cible et lest pour un exercice du programme.

    `historique` : les séances passées sur cet exercice, de la plus ancienne à la plus récente.
    """
    regles = regles or charger_regles()
    forme = forme or Forme()
    raisons: list[str] = []

    rpe_cible = prevu.rpe_cible or regles.rpe_par_defaut(type_bloc, prevu.reps)
    rpe_cible = _cible_selon_forme(rpe_cible, forme, regles, raisons)

    # Le 1RM vient de la dernière séance estimable, tous formats confondus…
    reference = next(
        (p for p in reversed(historique) if meilleur_e1rm(list(p.series), p.poids_du_corps_kg)),
        None,
    )
    # … mais les comparaisons (garde-fous, séries, justification) se font dans le même format :
    # des triples lourds ne disent rien de la charge d'une série de 8.
    meme_format = [p for p in historique if p.reps_max == prevu.reps]
    derniere = meme_format[-1] if meme_format else None

    series = _series(prevu, derniere, rpe_cible, regles)
    if type_bloc == "deload":
        series = max(1, round(series * (1 - regles.reduction_series_deload)))
        raisons.append("Bloc deload : un tiers de séries en moins")

    if reference is None:
        raisons.append("Pas encore d'historique avec RPE : choisis la charge, l'algorithme prendra le relais")
        return Proposition(prevu.exercice, series, prevu.reps, rpe_cible, None, tuple(raisons))

    e1rm = meilleur_e1rm(list(reference.series), reference.poids_du_corps_kg)
    pourcentage = pourcentage_1rm(prevu.reps, rpe_cible)
    assert e1rm is not None and pourcentage is not None  # noqa: S101  (garantis ci-dessus)
    total = e1rm * pourcentage

    echecs_consecutifs = 0
    for performance in reversed(meme_format):
        if not performance.a_echoue:
            break
        echecs_consecutifs += 1

    if derniere is not None:
        # Garde-fous, par rapport à la charge la plus lourde de la dernière séance de ce format.
        precedent = derniere.charge_max_totale
        if echecs_consecutifs >= regles.echecs_avant_deload:
            total = precedent * (1 - regles.baisse_deload)
            raisons.append(
                f"Deload localisé : {echecs_consecutifs} séances de suite en échec, "
                f"−{round(regles.baisse_deload * 100)} %"
            )
        else:
            haut, bas = precedent * (1 + regles.variation_max), precedent * (1 - regles.variation_max)
            if not bas <= total <= haut:
                total = min(max(total, bas), haut)
                raisons.append(
                    f"Variation limitée à ±{round(regles.variation_max * 100)} % d'une séance à l'autre"
                )

    lest = arrondir(total - poids_du_corps_kg, regles.pas_de_lest_kg)
    if lest < 0:
        lest = 0.0
        raisons.append("Au poids du corps : la charge calculée est sous ton poids")

    if derniere is None:
        format_ = f"{prevu.reps} rep{'s' if prevu.reps > 1 else ''}"
        raisons.insert(0, f"Premier passage à {format_} : charge tirée de ton 1RM estimé")
    elif derniere.rpe_moyen is not None and not echecs_consecutifs:
        ecart = lest - derniere.lest_max
        rpe_precedent = rpe_txt(round(derniere.rpe_moyen, 1))
        if ecart > 0:
            raisons.insert(0, f"+{kg(ecart)} : RPE {rpe_precedent} la dernière fois")
        elif ecart < 0:
            raisons.insert(0, f"−{kg(-ecart)} : RPE {rpe_precedent} la dernière fois")
        else:
            raisons.insert(0, "Charge maintenue : la dernière séance était dans la cible")

    return Proposition(prevu.exercice, series, prevu.reps, rpe_cible, lest, tuple(raisons))


def index_prochaine_seance(nb_realisees: int, nb_modeles: int, cycles: int) -> int | None:
    """Rang de la prochaine séance dans la suite du bloc, ou None si le bloc est terminé.

    Jours flexibles (décision du CDC) : la suite avance à chaque séance réalisée,
    quel que soit le jour.
    """
    if nb_modeles == 0 or nb_realisees >= nb_modeles * cycles:
        return None
    return nb_realisees % nb_modeles
