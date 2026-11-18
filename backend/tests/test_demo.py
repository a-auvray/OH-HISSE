"""Le mode démo arrive pré-rempli : chaque espace est vivant et les croisements se voient (note 07)."""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlmodel import Session, select

from app.main import app as application
from app.models import Nuit, Objectif, Seance, Serie, SortieMer, Spot
from app.services.open_meteo import open_meteo
from tests.test_marine import OpenMeteoEnregistre


@pytest.fixture
def demo(client: TestClient) -> Iterator[TestClient]:
    application.dependency_overrides[open_meteo] = OpenMeteoEnregistre
    assert client.post("/api/auth/demo").status_code == 201
    yield client
    application.dependency_overrides.pop(open_meteo, None)


def test_chaque_espace_a_ses_donnees(demo: TestClient) -> None:
    assert len(demo.get("/api/streetlifting/seances").json()) == 8
    assert len(demo.get("/api/streetlifting/blocs").json()) == 1
    assert len(demo.get("/api/marine/sorties").json()) == 4
    assert len(demo.get("/api/vie-courante/nuits").json()) == 21
    assert len(demo.get("/api/vie-courante/pesees").json()) == 4
    assert len(demo.get("/api/vie-courante/cheat-meals").json()) == 1


def test_la_seance_du_jour_est_calculee_depuis_le_bloc(demo: TestClient) -> None:
    seance = demo.get("/api/streetlifting/seance-du-jour").json()

    assert seance["bloc"]["nom"] == "Force — cap 55 kg"
    assert seance["propositions"]
    # Le croisement se voit : la séance ratée d'avant-hier n'est pas encore récupérée.
    assert seance["forme"]["recuperation_restant_h"] > 0


def test_les_objectifs_progressent_sans_etre_atteints(demo: TestClient) -> None:
    objectifs = demo.get("/api/objectifs").json()

    principal = next(o for o in objectifs if o["principal"])
    assert principal["blocs"]
    for objectif in objectifs:
        assert 50 < objectif["progression"]["pourcentage"] < 100


def test_vie_courante_et_briefings_sont_remplis(demo: TestClient) -> None:
    etat = demo.get("/api/vie-courante/etat").json()
    assert etat["recuperation"]["raisons"]
    assert etat["sommeil"]["nuits_comptees"] == 7
    assert etat["poids"]["a_jour"]

    jour = demo.get("/api/vie-courante/briefings/jour").json()
    assert {s["espace"] for s in jour["sections"]} == {"marine", "streetlifting", "vie-courante", "objectifs"}


def test_les_sorties_sont_rattachees_aux_plages_de_la_zone(demo: TestClient) -> None:
    spots = {s["id"] for s in demo.get("/api/marine/spots").json()}

    assert {s["spot_id"] for s in demo.get("/api/marine/sorties").json()} <= spots


def test_quitter_la_demo_efface_toutes_ses_donnees(demo: TestClient, moteur: Engine) -> None:
    demo.post("/api/auth/deconnexion")

    with Session(moteur) as session:
        for table in (Seance, Serie, Objectif, Nuit, SortieMer, Spot):
            assert session.exec(select(table)).all() == [], table.__name__
