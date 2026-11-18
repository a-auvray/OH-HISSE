"""Fixtures communes : chaque test reçoit une base SQLite en mémoire, neuve."""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlmodel import Session, SQLModel

import app.models  # noqa: F401  (enregistre les tables)
from app.core.base_de_donnees import creer_moteur, obtenir_session
from app.main import app as application


@pytest.fixture
def moteur() -> Iterator[Engine]:
    # Connexion unique : sinon chaque connexion verrait sa propre base en mémoire, vide.
    moteur = creer_moteur("sqlite://", connexion_unique=True)
    SQLModel.metadata.create_all(moteur)
    yield moteur
    moteur.dispose()


@pytest.fixture
def session(moteur: Engine) -> Iterator[Session]:
    with Session(moteur) as session:
        yield session


@pytest.fixture
def client(moteur: Engine, monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    # Le ménage du démarrage (cycle de vie) doit lui aussi viser la base de test.
    monkeypatch.setattr("app.main.moteur", moteur)

    def session_de_test() -> Iterator[Session]:
        with Session(moteur) as session:
            yield session

    application.dependency_overrides[obtenir_session] = session_de_test
    with TestClient(application) as client:
        yield client
    application.dependency_overrides.clear()
