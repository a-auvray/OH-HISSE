"""Sommeil : la dernière nuit et la tendance (note 05)."""

import datetime as dt
from dataclasses import dataclass

from app.moteurs.recuperation import NuitResumee, regles_vie_courante


@dataclass(frozen=True)
class Tendance:
    derniere_nuit: NuitResumee | None  # nuit dont le réveil est aujourd'hui
    moyenne_h: float | None
    nuits_comptees: int


def tendance(nuits: list[NuitResumee], aujourdhui: dt.date) -> Tendance:
    jours = int(regles_vie_courante()["sommeil"]["moyenne_jours"])
    recentes = [n for n in nuits if aujourdhui - dt.timedelta(days=jours) < n.jour <= aujourdhui]
    derniere = next((n for n in nuits if n.jour == aujourdhui), None)
    moyenne = round(sum(n.heures for n in recentes) / len(recentes), 1) if recentes else None
    return Tendance(derniere, moyenne, len(recentes))
