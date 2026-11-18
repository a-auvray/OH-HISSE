"""Table des objectifs."""

import datetime as dt

from sqlmodel import Field

from app.models.commun import Personnel


class Objectif(Personnel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    titre: str = Field(max_length=120)
    type: str = Field(default="max", max_length=20)  # max, competition
    exercice_id: int = Field(foreign_key="exercice.id")
    # Cible en lest (kg) : « 55 kg de lest aux tractions ».
    valeur_cible_kg: float
    date_cible: dt.date
    statut: str = Field(default="en_cours", max_length=20)  # en_cours, atteint, abandonne
    principal: bool = False
