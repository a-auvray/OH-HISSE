"""Croisements entre espaces (note 08 du CDC), de bout en bout."""

import datetime as dt
from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.main import app as application
from app.services.open_meteo import open_meteo
from tests.conftest import TRACTION
from tests.test_marine import OpenMeteoEnregistre

AUJOURDHUI = dt.date.today()
HIER = AUJOURDHUI - dt.timedelta(days=1)


@pytest.fixture
def sans_reseau() -> Iterator[None]:
    application.dependency_overrides[open_meteo] = OpenMeteoEnregistre
    yield
    application.dependency_overrides.pop(open_meteo, None)


def bloc() -> dict[str, Any]:
    return {
        "nom": "Force",
        "type": "force",
        "cycles": 4,
        "debut": (AUJOURDHUI - dt.timedelta(days=10)).isoformat(),
        "seances": [{"nom": "A", "exercices": [{"exercice": "traction", "series": [3, 5], "reps": 5}]}],
    }


def max_hier(client: TestClient, bloc_id: int) -> None:
    series = [{"exercice_id": TRACTION, "reps": 1, "lest_kg": 40, "rpe": 9.5} for _ in range(3)]
    corps = {"date": HIER.isoformat(), "bloc_id": bloc_id, "rang_modele": 0, "series": series}
    assert client.post("/api/streetlifting/seances", json=corps).status_code == 201


def test_sommeil_et_recuperation_allegent_la_seance_du_jour(connecte: TestClient) -> None:
    identifiant = connecte.post("/api/streetlifting/blocs", json=bloc()).json()["id"]
    connecte.post("/api/vie-courante/pesees", json={"date": HIER.isoformat(), "poids_kg": 75})
    reposee = connecte.get("/api/streetlifting/seance-du-jour").json()

    max_hier(connecte, identifiant)
    connecte.put(f"/api/vie-courante/nuits/{AUJOURDHUI}", json={"heures": 5})
    fatiguee = connecte.get("/api/streetlifting/seance-du-jour").json()

    assert reposee["propositions"][0]["rpe_cible"] == 8.0
    assert reposee["forme"]["consignes"] == []
    # Nuit de 5 h (−1) et récupération de plus de 48 h (−0,5 puis plafond à 8) : 8 → 6,5
    assert fatiguee["propositions"][0]["rpe_cible"] == 6.5
    assert fatiguee["propositions"][0]["series"] == 3
    assert fatiguee["forme"]["sommeil_h"] == 5
    assert fatiguee["forme"]["recuperation_restant_h"] > 48
    assert fatiguee["forme"]["consignes"][0] == "Nuit de 5 h : séance adaptée"
    assert any("Récupération incomplète" in j for j in fatiguee["propositions"][0]["justifications"])


def test_l_assistant_propose_une_baignade_de_recuperation(connecte: TestClient, sans_reseau: None) -> None:
    sans_effort = connecte.get("/api/marine/assistant").json()
    identifiant = connecte.post("/api/streetlifting/blocs", json=bloc()).json()["id"]
    max_hier(connecte, identifiant)

    apres_un_max = connecte.get("/api/marine/assistant").json()

    assert sans_effort["recuperation_active"] is None
    assert apres_un_max["recuperation_active"] is not None
    assert "baignade" in apres_un_max["recuperation_active"]
