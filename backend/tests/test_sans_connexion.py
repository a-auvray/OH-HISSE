from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlmodel import Session

from app.core.config import parametres
from app.core.securite import hacher_mot_de_passe
from app.main import creer_application
from app.models import Utilisateur
from tests.conftest import MDP, creer_compte


@pytest.fixture
def sans_connexion(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    monkeypatch.setenv("OH_HISSE_SANS_CONNEXION", "1")
    parametres.cache_clear()
    yield
    # L'environnement doit être restauré AVANT de vider le cache : sinon un appel intermédiaire remettrait
    # la configuration « sans connexion » en mémoire pour tous les tests suivants.
    monkeypatch.undo()
    parametres.cache_clear()


def test_par_defaut_la_connexion_reste_obligatoire(client: TestClient, moteur: Engine) -> None:
    creer_compte(moteur, "moi@oh-hisse.fr")

    assert client.get("/api/auth/moi").status_code == 401


def test_sans_connexion_l_application_s_ouvre_sur_le_compte_personnel(
    client: TestClient, moteur: Engine, sans_connexion: None
) -> None:
    creer_compte(moteur, "moi@oh-hisse.fr")

    moi = client.get("/api/auth/moi")

    assert moi.status_code == 200
    assert moi.json()["nom_affiche"] == "moi"
    assert moi.json()["est_demo"] is False
    assert client.get("/api/streetlifting/seances").status_code == 200


def test_sans_compte_personnel_il_faut_quand_meme_en_creer_un(
    client: TestClient, sans_connexion: None
) -> None:
    assert client.get("/api/auth/moi").status_code == 401


def test_les_bacs_a_sable_demo_ne_sont_jamais_choisis(
    client: TestClient, moteur: Engine, sans_connexion: None
) -> None:
    with Session(moteur) as session:
        session.add(
            Utilisateur(
                email="demo@x.test", nom_affiche="Visiteur", mdp_hash=hacher_mot_de_passe(MDP), est_demo=True
            )
        )
        session.commit()

    assert client.get("/api/auth/moi").status_code == 401


def test_le_premier_compte_personnel_est_pris(
    client: TestClient, moteur: Engine, sans_connexion: None
) -> None:
    creer_compte(moteur, "premier@oh-hisse.fr")
    creer_compte(moteur, "second@oh-hisse.fr")

    assert client.get("/api/auth/moi").json()["nom_affiche"] == "premier"


def test_la_production_refuse_de_se_passer_de_connexion(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OH_HISSE_ENVIRONNEMENT", "production")
    monkeypatch.setenv("OH_HISSE_CLE_SECRETE", "x" * 48)
    monkeypatch.setenv("OH_HISSE_SANS_CONNEXION", "1")
    parametres.cache_clear()
    try:
        with pytest.raises(RuntimeError, match="SANS_CONNEXION"):
            parametres()
    finally:
        monkeypatch.undo()
        parametres.cache_clear()


def test_sans_connexion_seules_les_adresses_locales_sont_servies(sans_connexion: None) -> None:
    application = creer_application()

    local = TestClient(application, base_url="http://localhost").get("/api/sante")
    pirate = TestClient(application, base_url="http://site-pirate.example").get("/api/sante")

    assert local.status_code == 200
    assert pirate.status_code == 400
