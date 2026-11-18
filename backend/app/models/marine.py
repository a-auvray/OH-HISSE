"""Tables de Marine : spots (et bientôt le carnet de sortie)."""

from sqlalchemy import CheckConstraint
from sqlmodel import Field

from app.models.commun import Personnel


class Spot(Personnel, table=True):
    __table_args__ = (
        CheckConstraint("latitude BETWEEN -90 AND 90"),
        CheckConstraint("longitude BETWEEN -180 AND 180"),
    )

    id: int | None = Field(default=None, primary_key=True)
    nom: str = Field(max_length=80)
    latitude: float
    longitude: float
    ordre: int = 0
