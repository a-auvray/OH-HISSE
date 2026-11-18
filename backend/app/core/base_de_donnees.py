"""Connexion à la base et session par requête."""

from collections.abc import Iterator
from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import Depends
from sqlalchemy import DateTime, Dialect, Engine, TypeDecorator, event
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, create_engine

from app.core.config import parametres


def creer_moteur(url: str, *, connexion_unique: bool = False) -> Engine:
    """`connexion_unique` : une seule connexion partagée (base SQLite en mémoire des tests)."""
    if not url.startswith("sqlite"):
        return create_engine(url, pool_pre_ping=True)

    moteur = create_engine(
        url,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool if connexion_unique else None,
    )

    @event.listens_for(moteur, "connect")
    def _activer_cles_etrangeres(connexion: Any, _: Any) -> None:
        # SQLite n'applique les clés étrangères (et donc les suppressions en
        # cascade) que si on le lui demande, connexion par connexion.
        curseur = connexion.cursor()
        curseur.execute("PRAGMA foreign_keys=ON")
        curseur.close()

    return moteur


moteur = creer_moteur(parametres().url_base_de_donnees)


def obtenir_session() -> Iterator[Session]:
    with Session(moteur) as session:
        yield session


SessionDep = Annotated[Session, Depends(obtenir_session)]


def maintenant() -> datetime:
    """Instant présent en UTC. Toutes les dates-heures stockées sont en UTC."""
    return datetime.now(UTC)


def en_utc(instant: datetime) -> datetime:
    """SQLite rend des dates-heures sans fuseau : on les relit comme de l'UTC."""
    return instant if instant.tzinfo else instant.replace(tzinfo=UTC)


class DateHeureUTC(TypeDecorator[datetime]):
    """Date-heure toujours stockée en UTC, relue avec son fuseau.

    SQLite ignore le fuseau : sans cette conversion, 16 h à Paris serait relu
    comme 16 h UTC. PostgreSQL convertit lui-même ; ce type garantit le même
    résultat sur les deux bases.
    """

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, valeur: datetime | None, dialect: Dialect) -> datetime | None:
        if valeur is None:
            return None
        if valeur.tzinfo is None:
            raise ValueError("Date-heure sans fuseau : impossible de la stocker sans ambiguïté.")
        return valeur.astimezone(UTC)

    def process_result_value(self, valeur: datetime | None, dialect: Dialect) -> datetime | None:
        return en_utc(valeur) if valeur is not None else None
