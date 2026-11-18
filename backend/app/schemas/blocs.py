"""Format d'un bloc importé (note 03 du CDC) et séance du jour."""

import datetime as dt
from typing import Annotated, Literal, Self

from pydantic import BaseModel, Field, field_validator, model_validator

from app.schemas.streetlifting import Rpe

TypeBloc = Literal["force", "volume", "deload", "specifique"]


class ExerciceDuProgramme(BaseModel):
    exercice: str = Field(description="Identifiant de l'exercice : traction, dips, muscle-up…")
    # Un nombre fixe, ou une plage [min, max] dans laquelle l'algorithme choisit.
    series: int | Annotated[list[int], Field(min_length=2, max_length=2)]
    reps: int = Field(ge=1, le=12, description="De 1 à 12 : la limite de la table RPE")
    rpe_cible: Rpe | None = None

    @field_validator("series")
    @classmethod
    def _series_valides(cls, valeur: int | list[int]) -> int | list[int]:
        bas, haut = (valeur, valeur) if isinstance(valeur, int) else (valeur[0], valeur[1])
        if not 1 <= bas <= haut <= 20:
            raise ValueError("Séries : un nombre de 1 à 20, ou une plage [min, max] croissante.")
        return valeur

    @property
    def series_min(self) -> int:
        return self.series if isinstance(self.series, int) else self.series[0]

    @property
    def series_max(self) -> int:
        return self.series if isinstance(self.series, int) else self.series[1]


class SeanceDuProgramme(BaseModel):
    nom: str = Field(min_length=1, max_length=120)
    exercices: list[ExerciceDuProgramme] = Field(min_length=1, max_length=20)


class BlocImporte(BaseModel):
    """Contenu du fichier JSON d'un bloc."""

    nom: str = Field(min_length=1, max_length=120)
    type: TypeBloc
    cycles: int = Field(ge=1, le=52)
    seances: list[SeanceDuProgramme] = Field(min_length=1, max_length=14)
    debut: dt.date | None = Field(default=None, description="Par défaut : aujourd'hui")
    objectif_id: int | None = None


class BlocModifie(BaseModel):
    nom: str | None = Field(default=None, min_length=1, max_length=120)
    objectif_id: int | None = None
    fin: dt.date | None = None
    detacher_objectif: bool = False


class BlocLu(BaseModel):
    id: int
    nom: str
    type: TypeBloc
    cycles: int
    seances: list[SeanceDuProgramme]
    debut: dt.date
    fin: dt.date | None
    objectif_id: int | None
    seances_realisees: int
    seances_total: int
    actif: bool


class Proposition(BaseModel):
    exercice_id: int
    exercice: str
    series: int
    reps: int
    rpe_cible: float
    lest_kg: float | None
    justifications: list[str]


class AvancementBloc(BaseModel):
    id: int
    nom: str
    type: TypeBloc
    numero: int  # numéro de la séance à faire (1 = la première)
    total: int
    rang_modele: int


class PoidsUtilise(BaseModel):
    kg: float
    a_jour: bool


class SeanceDuJour(BaseModel):
    bloc: AvancementBloc | None
    nom: str | None
    poids: PoidsUtilise | None
    propositions: list[Proposition]
    message: str | None = None

    @model_validator(mode="after")
    def _coherence(self) -> Self:
        if self.bloc is None and self.propositions:
            raise ValueError("Pas de propositions sans bloc actif.")
        return self
