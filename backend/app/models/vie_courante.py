"""Tables de Vie courante : pesées, nuits, cheat meals."""

import datetime as dt

from sqlalchemy import CheckConstraint, UniqueConstraint
from sqlmodel import Field

from app.models.commun import Personnel


class Pesee(Personnel, table=True):
    __table_args__ = (
        UniqueConstraint("utilisateur_id", "date"),
        CheckConstraint("poids_kg > 20 AND poids_kg < 300"),
    )

    id: int | None = Field(default=None, primary_key=True)
    date: dt.date = Field(index=True)
    poids_kg: float


class Nuit(Personnel, table=True):
    """Une nuit de sommeil, datée du jour du réveil."""

    __table_args__ = (
        UniqueConstraint("utilisateur_id", "date"),
        CheckConstraint("heures >= 0 AND heures <= 16"),
        CheckConstraint("qualite IS NULL OR qualite BETWEEN 1 AND 5"),
    )

    id: int | None = Field(default=None, primary_key=True)
    date: dt.date = Field(index=True)
    heures: float
    qualite: int | None = None


class CheatMeal(Personnel, table=True):
    """Un écart pris : le gestionnaire sait quand a eu lieu le dernier (note 05)."""

    id: int | None = Field(default=None, primary_key=True)
    date: dt.date = Field(index=True)
    note: str | None = Field(default=None, max_length=200)
