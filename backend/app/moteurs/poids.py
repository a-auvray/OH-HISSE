"""Poids du corps à une date : moyenne mobile des pesées (note 05 du CDC).

Le poids varie d'un jour à l'autre (eau, digestion, sel) : le 1RM utilise la
moyenne des pesées des trois dernières semaines, jamais une pesée isolée.
"""

from dataclasses import dataclass
from datetime import date, timedelta

FENETRE = timedelta(days=21)


@dataclass(frozen=True)
class Pesee:
    date: date
    poids_kg: float


@dataclass(frozen=True)
class PoidsDuCorps:
    kg: float
    # Faux quand aucune pesée ne tombe dans la fenêtre : on reprend la dernière connue.
    a_jour: bool
    derniere_pesee: date


def poids_a_la_date(pesees: list[Pesee], jour: date) -> PoidsDuCorps | None:
    """Poids du corps retenu pour `jour`, ou None si aucune pesée n'existe avant."""
    anterieures = sorted((p for p in pesees if p.date <= jour), key=lambda p: p.date)
    if not anterieures:
        return None
    recentes = [p for p in anterieures if p.date > jour - FENETRE]
    if not recentes:
        derniere = anterieures[-1]
        return PoidsDuCorps(kg=derniere.poids_kg, a_jour=False, derniere_pesee=derniere.date)
    moyenne = sum(p.poids_kg for p in recentes) / len(recentes)
    return PoidsDuCorps(kg=round(moyenne, 2), a_jour=True, derniere_pesee=recentes[-1].date)
