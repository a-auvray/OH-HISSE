"""Tables du Streetlifting : exercices, blocs, séances et séries."""

import datetime as dt
from typing import Any

from sqlalchemy import JSON, CheckConstraint, Column, UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel

from app.models.commun import Personnel


class Exercice(SQLModel, table=True):
    """Liste commune (tractions, dips, muscle-up), ou exercice ajouté par un utilisateur."""

    __table_args__ = (UniqueConstraint("utilisateur_id", "slug"),)

    id: int | None = Field(default=None, primary_key=True)
    slug: str = Field(max_length=60, index=True)
    nom: str = Field(max_length=80)
    # NULL : exercice commun à tous ; sinon, exercice personnel.
    utilisateur_id: int | None = Field(default=None, foreign_key="utilisateur.id", ondelete="CASCADE")


class Bloc(Personnel, table=True):
    """Bloc d'entraînement importé d'un fichier JSON : une suite ordonnée de séances types."""

    __table_args__ = (CheckConstraint("cycles >= 1"),)

    id: int | None = Field(default=None, primary_key=True)
    nom: str = Field(max_length=120)
    type: str = Field(max_length=20)  # force, volume, deload, specifique
    cycles: int
    # Les séances types, telles que validées à l'import (cf. app.schemas.blocs).
    programme: list[dict[str, Any]] = Field(sa_column=Column(JSON, nullable=False))
    debut: dt.date
    fin: dt.date | None = None
    objectif_id: int | None = Field(default=None, foreign_key="objectif.id", ondelete="SET NULL")


class Seance(Personnel, table=True):
    __table_args__ = (CheckConstraint("ressenti IS NULL OR ressenti BETWEEN 1 AND 10"),)

    id: int | None = Field(default=None, primary_key=True)
    date: dt.date = Field(index=True)
    nom: str | None = Field(default=None, max_length=120)
    ressenti: int | None = None
    note: str | None = Field(default=None, max_length=2000)
    bloc_id: int | None = Field(default=None, foreign_key="bloc.id", ondelete="SET NULL", index=True)
    # Rang de la séance type dans le programme du bloc, si elle en vient.
    rang_modele: int | None = None

    series: list["Serie"] = Relationship(  # noqa: UP037  (Serie est déclarée plus bas)
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "order_by": "Serie.ordre"},
    )


class Serie(SQLModel, table=True):
    __table_args__ = (
        CheckConstraint("reps >= 0"),
        CheckConstraint("rpe IS NULL OR (rpe >= 1 AND rpe <= 10)"),
    )

    id: int | None = Field(default=None, primary_key=True)
    seance_id: int = Field(foreign_key="seance.id", ondelete="CASCADE", index=True)
    exercice_id: int = Field(foreign_key="exercice.id", index=True)
    ordre: int
    # Réalisé
    reps: int
    lest_kg: float = 0.0
    rpe: float | None = None
    echec: bool = False
    # Prévu par l'auto-régulation (pour afficher prévu / réalisé)
    reps_prevues: int | None = None
    lest_prevu_kg: float | None = None
    rpe_cible: float | None = None
