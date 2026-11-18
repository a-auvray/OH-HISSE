"""Tables de Vie courante (la pesée arrive dès la phase 2 : le 1RM en a besoin)."""

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
