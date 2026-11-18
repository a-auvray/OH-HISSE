"""Fixtures communes : chaque test reçoit une base SQLite en mémoire, neuve."""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlmodel import Session, SQLModel

import app.models  # noqa: F401  (enregistre les tables)
from app.core.base_de_donnees import creer_moteur, obtenir_session
from app.core.securite import hacher_mot_de_passe
from app.main import app as application
from app.models import Exercice, Utilisateur

EXERCICES_DE_BASE = [("traction", "Tractions"), ("dips", "Dips"), ("muscle-up", "Muscle-up")]
TRACTION, DIPS, MUSCLE_UP = 1, 2, 3
MDP = "une-phrase-de-passe-solide"


@pytest.fixture(autouse=True)
def limiteurs_neufs() -> Iterator[None]:
    """Chaque test part de limiteurs vides : sinon les bacs à sable démo s'accumulent d'un test à l'autre."""
    from app.routers.auth import limiteur_connexion, limiteur_demo

    limiteur_connexion.reinitialiser()
    limiteur_demo.reinitialiser()
    yield


@pytest.fixture
def moteur() -> Iterator[Engine]:
    # Connexion unique : sinon chaque connexion verrait sa propre base en mémoire, vide.
    moteur = creer_moteur("sqlite://", connexion_unique=True)
    SQLModel.metadata.create_all(moteur)
    # Les exercices de base, comme la migration les insère.
    with Session(moteur) as session:
        for slug, nom in EXERCICES_DE_BASE:
            session.add(Exercice(slug=slug, nom=nom))
        session.commit()
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


def creer_compte(moteur: Engine, email: str) -> int:
    with Session(moteur) as session:
        compte = Utilisateur(email=email, nom_affiche=email.split("@")[0], mdp_hash=hacher_mot_de_passe(MDP))
        session.add(compte)
        session.commit()
        assert compte.id is not None
        return compte.id


@pytest.fixture
def connecte(client: TestClient, moteur: Engine) -> TestClient:
    """Client connecté à un compte personnel tout neuf."""
    creer_compte(moteur, "moi@oh-hisse.fr")
    reponse = client.post("/api/auth/connexion", json={"email": "moi@oh-hisse.fr", "mot_de_passe": MDP})
    assert reponse.status_code == 200
    return client
