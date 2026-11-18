"""Tables de Marine : spots et carnet de sortie."""

import datetime as dt

from sqlalchemy import CheckConstraint
from sqlmodel import Field

from app.core.base_de_donnees import DateHeureUTC
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


class SortieMer(Personnel, table=True):
    """Une sortie en mer, quel que soit son mode (note 04 : carnet commun)."""

    __table_args__ = (
        CheckConstraint("type IN ('baignade', 'nage', 'plongee')"),
        CheckConstraint("duree_min > 0"),
        CheckConstraint("ressenti IS NULL OR ressenti BETWEEN 1 AND 10"),
    )

    id: int | None = Field(default=None, primary_key=True)
    spot_id: int | None = Field(default=None, foreign_key="spot.id", ondelete="SET NULL")
    type: str = Field(max_length=10)
    debut: dt.datetime = Field(sa_type=DateHeureUTC, index=True)
    duree_min: int
    ressenti: int | None = None
    note: str | None = Field(default=None, max_length=2000)
    # Conditions au moment de la sortie : relevées automatiquement, ou saisies.
    eau_c: float | None = None
    air_c: float | None = None
    vent_kmh: float | None = None
    rafales_kmh: float | None = None
    vagues_m: float | None = None
    hauteur_eau_m: float | None = None
    conditions_relevees: bool = False
    # Nage
    distance_m: float | None = None
    # Plongée
    profondeur_max_m: float | None = None
    visibilite_m: float | None = None
    materiel: str | None = Field(default=None, max_length=200)
