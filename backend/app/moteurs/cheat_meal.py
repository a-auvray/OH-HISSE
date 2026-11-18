"""Verdict « écart mérité ? » (note 05) : des points gagnés sur les dernières 48 h.

Fonctions pures ; règles dans `regles/vie_courante.toml` (validées le 18/11/2026).
"""

import datetime as dt
from dataclasses import dataclass, field
from typing import Any, Literal

from app.moteurs.recuperation import SeanceResumee, SortieResumee, majuscule, regles_vie_courante

Verdict = Literal["oui", "petit", "non"]

PHRASES: dict[Verdict, str] = {
    "oui": "ce soir, t'as le droit",
    "petit": "un petit écart, oui",
    "non": "pas cette fois",
}


@dataclass(frozen=True)
class VerdictCheatMeal:
    verdict: Verdict
    points: int
    phrase: str
    details: tuple[str, ...] = field(default=())


def _rpe_max(seance: SeanceResumee) -> float | None:
    rpes = [10.0 if s.echec else s.rpe for s in seance.series if s.echec or s.rpe is not None]
    return max((r for r in rpes if r is not None), default=None)


def verdict(
    seances: list[SeanceResumee],
    sorties: list[SortieResumee],
    dernier_cheat_meal: dt.date | None,
    maintenant: dt.datetime,
    regles: dict[str, Any] | None = None,
) -> VerdictCheatMeal:
    r = regles or regles_vie_courante()["cheat_meal"]
    depuis = maintenant - dt.timedelta(hours=float(r["fenetre_h"]))
    points = 0
    morceaux: list[str] = []
    details: list[str] = []

    for s in seances:
        if not depuis.date() <= s.jour <= maintenant.date():
            continue
        rpe = _rpe_max(s)
        if rpe is not None and rpe >= float(r["seance_lourde_rpe"]):
            points += int(r["points_seance_lourde"])
            morceaux.append("séance lourde")
            details.append(f"Séance lourde du {s.jour:%d/%m} (RPE {rpe:g}) : +{r['points_seance_lourde']}")
        else:
            points += int(r["points_seance"])
            morceaux.append("séance")
            details.append(f"Séance du {s.jour:%d/%m} : +{r['points_seance']}")

    for sortie in sorties:
        if not depuis <= sortie.debut <= maintenant:
            continue
        gagne = 0
        if sortie.type == "nage" and sortie.duree_min >= int(r["nage_minutes"]):
            gagne += int(r["points_nage"])
        froide = sortie.eau_c is not None and sortie.eau_c < float(r["eau_froide_c"])
        if froide:
            gagne += int(r["points_eau_froide"])
        if gagne:
            points += gagne
            texte = f"{sortie.duree_min} min de {sortie.type}" + (
                f" dans une eau à {sortie.eau_c:g} °C" if froide else ""
            )
            morceaux.append(texte)
            details.append(f"{majuscule(texte)} : +{gagne}")

    if dernier_cheat_meal is not None:
        jours = (maintenant.date() - dernier_cheat_meal).days
        if jours < int(r["jours_depuis_dernier"]):
            points += int(r["points_dernier_recent"])
            details.append(f"Dernier écart il y a {jours} j : {r['points_dernier_recent']}")

    choix: Verdict = (
        "oui" if points >= int(r["seuil_oui"]) else "petit" if points >= int(r["seuil_petit"]) else "non"
    )
    cause = " + ".join(morceaux) if morceaux else "pas d'effort ces deux derniers jours"
    if choix == "non" and dernier_cheat_meal is not None and morceaux:
        cause = f"{cause}, mais le dernier écart est trop récent"
    return VerdictCheatMeal(choix, points, f"{majuscule(cause)} : {PHRASES[choix]}.", tuple(details))
