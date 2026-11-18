"""Assistant de sortie : les meilleurs créneaux des prochaines 48 h (note 04).

Un créneau est écarté s'il tombe de nuit ou si une de ses heures est en noir.
Les autres sont classés : niveau de danger d'abord, puis marée haute (moins
de sable à traverser), vent faible, air doux, mer calme.
"""

import datetime as dt
import math
from dataclasses import dataclass, field

from app.moteurs.danger import GRAVITE, Evaluation, Niveau, Raison, Situation, evaluer


@dataclass(frozen=True)
class HeurePrevue:
    instant: dt.datetime
    situation: Situation
    air_c: float | None
    hauteur_eau_m: float | None


@dataclass(frozen=True)
class Jour:
    lever: dt.datetime
    coucher: dt.datetime


@dataclass(frozen=True)
class Creneau:
    debut: dt.datetime
    fin: dt.datetime
    evaluation: Evaluation
    score: float
    atouts: tuple[str, ...] = field(default=())
    reserves: tuple[str, ...] = field(default=())


MER_HAUTE_M = 5.5  # au-dessus du zéro des cartes : peu d'estran découvert
MER_BASSE_M = 3.5
ECART_MINIMAL = dt.timedelta(hours=3)


def _en_journee(debut: dt.datetime, fin: dt.datetime, jours: list[Jour]) -> bool:
    return any(j.lever <= debut and fin <= j.coucher for j in jours)


def _nombre(v: float) -> str:
    return f"{v:.1f}".rstrip("0").rstrip(".").replace(".", ",")


def evaluer_creneau(heures: list[HeurePrevue]) -> Evaluation:
    """Le pire niveau des heures du créneau ; une raison par critère, la plus grave."""
    evaluations = [evaluer(h.situation) for h in heures]
    pire: Niveau = max((e.niveau for e in evaluations), key=lambda n: GRAVITE[n])
    vues: dict[str, Raison] = {}
    for e in evaluations:
        for r in e.raisons:
            if r.critere not in vues or GRAVITE[r.niveau] > GRAVITE[vues[r.critere].niveau]:
                vues[r.critere] = r
    raisons = sorted(vues.values(), key=lambda r: -GRAVITE[r.niveau])
    return Evaluation(pire, tuple(raisons))


def meilleurs_creneaux(
    heures: list[HeurePrevue],
    jours: list[Jour],
    duree_min: int,
    maintenant: dt.datetime,
    nombre: int = 3,
) -> list[Creneau]:
    duree = dt.timedelta(minutes=duree_min)
    nb_heures = max(1, math.ceil(duree_min / 60))
    candidats: list[Creneau] = []

    for i, depart in enumerate(heures):
        debut = depart.instant
        fin = debut + duree
        if debut < maintenant - dt.timedelta(minutes=30) or not _en_journee(debut, fin, jours):
            continue
        fenetre = heures[i : i + nb_heures]
        if len(fenetre) < nb_heures:
            continue
        evaluation = evaluer_creneau(fenetre)
        if evaluation.niveau == "noir":
            continue

        atouts: list[str] = []
        reserves: list[str] = []
        score = 100.0 if evaluation.niveau == "vert" else 0.0

        hauteur = depart.hauteur_eau_m
        if hauteur is not None:
            score += 8 * hauteur
            if hauteur >= MER_HAUTE_M:
                atouts.append(f"Mer haute ({_nombre(hauteur)} m) : peu de sable à traverser")
            elif hauteur <= MER_BASSE_M:
                reserves.append(f"Mer basse ({_nombre(hauteur)} m) : longue marche jusqu'à l'eau")
            fin_hauteur = fenetre[-1].hauteur_eau_m
            if fin_hauteur is not None and fin_hauteur > hauteur + 0.2:
                atouts.append("La mer monte : elle te ramène vers la plage")

        vent = depart.situation.vent_kmh
        if vent is not None:
            score -= 0.6 * vent
            if vent < 15:
                atouts.append(f"Vent faible ({vent:.0f} km/h)")
        vagues = depart.situation.vagues_m
        if vagues is not None:
            score -= 12 * vagues
            if vagues < 0.5:
                atouts.append("Mer calme")
        if depart.air_c is not None:
            score += 0.8 * depart.air_c

        candidats.append(Creneau(debut, fin, evaluation, round(score, 1), tuple(atouts), tuple(reserves)))

    retenus: list[Creneau] = []
    for c in sorted(candidats, key=lambda c: -c.score):
        if all(abs(c.debut - r.debut) >= ECART_MINIMAL for r in retenus):
            retenus.append(c)
        if len(retenus) == nombre:
            break
    return sorted(retenus, key=lambda c: c.debut)
