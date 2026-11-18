import datetime as dt
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.main import app as application
from app.services.open_meteo import open_meteo
from tests.conftest import TRACTION
from tests.test_marine import OpenMeteoEnregistre

AUJOURDHUI = dt.date.today()


@pytest.fixture
def sans_reseau() -> Iterator[None]:
    application.dependency_overrides[open_meteo] = OpenMeteoEnregistre
    yield
    application.dependency_overrides.pop(open_meteo, None)


def test_briefing_du_jour(connecte: TestClient, sans_reseau: None) -> None:
    b = connecte.get("/api/vie-courante/briefings/jour").json()

    assert b["type"] == "jour"
    assert {s["espace"] for s in b["sections"]} >= {"marine", "streetlifting", "vie-courante"}


def test_bilan_de_la_semaine_compte_les_seances(connecte: TestClient) -> None:
    connecte.post("/api/vie-courante/pesees", json={"date": AUJOURDHUI.isoformat(), "poids_kg": 75})
    series = [{"exercice_id": TRACTION, "reps": 5, "lest_kg": 20, "rpe": 8} for _ in range(4)]
    connecte.post("/api/streetlifting/seances", json={"date": AUJOURDHUI.isoformat(), "series": series})

    b = connecte.get("/api/vie-courante/briefings/semaine").json()

    volume = b["sections"][0]
    assert volume["valeur"] == "1 séance"
    assert volume["lignes"][0] == "4 séries · tonnage 1,9 t"  # 4 × 5 × 95 kg
    assert volume["lignes"][1].startswith("Tractions : 1RM +42")


def test_briefings_de_bloc(connecte: TestClient) -> None:
    bloc = {
        "nom": "Force",
        "type": "force",
        "cycles": 2,
        "debut": AUJOURDHUI.isoformat(),
        "seances": [{"nom": "A", "exercices": [{"exercice": "traction", "series": 4, "reps": 5}]}],
    }
    identifiant = connecte.post("/api/streetlifting/blocs", json=bloc).json()["id"]

    debut = connecte.get(f"/api/vie-courante/briefings/bloc/{identifiant}", params={"moment": "debut"}).json()
    fin = connecte.get(f"/api/vie-courante/briefings/bloc/{identifiant}").json()

    assert debut["titre"] == "Début de bloc : Force"
    assert debut["sections"][0]["lignes"] == ["2 séances prévues, sans jour fixe", "Exercices : Tractions"]
    assert fin["sections"][0]["valeur"] == "0 %"


def test_le_bloc_d_un_autre_est_introuvable(connecte: TestClient) -> None:
    bloc = {
        "nom": "X",
        "type": "force",
        "cycles": 1,
        "seances": [{"nom": "A", "exercices": [{"exercice": "dips", "series": 3, "reps": 5}]}],
    }
    identifiant = connecte.post("/api/streetlifting/blocs", json=bloc).json()["id"]
    connecte.cookies.clear()
    connecte.post("/api/auth/demo")

    assert connecte.get(f"/api/vie-courante/briefings/bloc/{identifiant}").status_code == 404
