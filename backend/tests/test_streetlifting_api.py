from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlmodel import Session, select

from app.models import Serie
from tests.conftest import DIPS, MDP, TRACTION, creer_compte


def seance(date: str = "2026-11-16", **extra: Any) -> dict[str, Any]:
    return {
        "date": date,
        "ressenti": 7,
        "series": [
            {"exercice_id": TRACTION, "reps": 5, "lest_kg": 20, "rpe": 8},
            {"exercice_id": TRACTION, "reps": 5, "lest_kg": 20, "rpe": 8.5},
            {"exercice_id": DIPS, "reps": 8, "lest_kg": 30, "rpe": 7},
        ],
        **extra,
    }


def peser(client: TestClient, date: str = "2026-11-16", kg: float = 75) -> None:
    assert client.post("/api/vie-courante/pesees", json={"date": date, "poids_kg": kg}).status_code == 201


# --- Exercices et séances -----------------------------------------------------------


def test_les_trois_exercices_de_base(connecte: TestClient) -> None:
    noms = [e["nom"] for e in connecte.get("/api/streetlifting/exercices").json()]
    assert noms == ["Tractions", "Dips", "Muscle-up"]


def test_creer_puis_relire_une_seance(connecte: TestClient) -> None:
    creee = connecte.post("/api/streetlifting/seances", json=seance())
    assert creee.status_code == 201

    relue = connecte.get(f"/api/streetlifting/seances/{creee.json()['id']}").json()
    assert [s["ordre"] for s in relue["series"]] == [0, 1, 2]
    assert relue["ressenti"] == 7


def test_le_1rm_de_la_seance_utilise_le_poids_du_jour(connecte: TestClient) -> None:
    peser(connecte, kg=75)

    relue = connecte.post("/api/streetlifting/seances", json=seance()).json()

    traction = next(r for r in relue["records"] if r["exercice_id"] == TRACTION)
    assert relue["poids_du_corps_kg"] == 75
    assert traction["e1rm_lest_kg"] == pytest.approx(42.1, abs=0.1)  # exemple du CDC


def test_sans_pesee_pas_de_1rm(connecte: TestClient) -> None:
    relue = connecte.post("/api/streetlifting/seances", json=seance()).json()

    assert relue["poids_du_corps_kg"] is None
    assert relue["records"] == []


def test_modifier_remplace_les_series(connecte: TestClient, moteur: Engine) -> None:
    identifiant = connecte.post("/api/streetlifting/seances", json=seance()).json()["id"]
    nouvelle = seance(series=[{"exercice_id": DIPS, "reps": 10, "lest_kg": 0, "rpe": 7}])

    relue = connecte.put(f"/api/streetlifting/seances/{identifiant}", json=nouvelle).json()

    assert len(relue["series"]) == 1
    with Session(moteur) as session:
        assert len(session.exec(select(Serie)).all()) == 1  # pas de séries orphelines


def test_supprimer_une_seance_supprime_ses_series(connecte: TestClient, moteur: Engine) -> None:
    identifiant = connecte.post("/api/streetlifting/seances", json=seance()).json()["id"]

    assert connecte.delete(f"/api/streetlifting/seances/{identifiant}").status_code == 204
    with Session(moteur) as session:
        assert session.exec(select(Serie)).all() == []


def test_filtrer_les_seances_par_periode(connecte: TestClient) -> None:
    for jour in ("2026-10-30", "2026-11-03", "2026-11-28"):
        connecte.post("/api/streetlifting/seances", json=seance(jour))

    novembre = connecte.get("/api/streetlifting/seances", params={"debut": "2026-11-01", "fin": "2026-11-30"})

    assert [s["date"] for s in novembre.json()] == ["2026-11-03", "2026-11-28"]


@pytest.mark.parametrize(
    "serie",
    [
        {"exercice_id": TRACTION, "reps": 5, "rpe": 8.3},  # pas un demi-point
        {"exercice_id": TRACTION, "reps": 5, "rpe": 11},
        {"exercice_id": TRACTION, "reps": -1},
        {"exercice_id": 999, "reps": 5},  # exercice inconnu
    ],
)
def test_series_invalides_refusees(connecte: TestClient, serie: dict[str, Any]) -> None:
    assert connecte.post("/api/streetlifting/seances", json=seance(series=[serie])).status_code == 422


def test_une_seance_vide_est_refusee(connecte: TestClient) -> None:
    assert connecte.post("/api/streetlifting/seances", json=seance(series=[])).status_code == 422


# --- Évolution ----------------------------------------------------------------------


def test_evolution_par_exercice(connecte: TestClient) -> None:
    peser(connecte, "2026-11-02", 75)
    connecte.post("/api/streetlifting/seances", json=seance("2026-11-03"))
    connecte.post("/api/streetlifting/seances", json=seance("2026-11-10"))

    points = connecte.get(f"/api/streetlifting/evolution/{TRACTION}").json()

    assert [p["date"] for p in points] == ["2026-11-03", "2026-11-10"]
    assert points[0]["series"] == 2
    assert points[0]["reps"] == 10
    assert points[0]["tonnage_kg"] == 10 * 95
    assert points[0]["rpe_moyen"] == 8.2  # 8 et 8,5


# --- Pesées -------------------------------------------------------------------------


def test_une_seule_pesee_par_jour(connecte: TestClient) -> None:
    peser(connecte)
    doublon = connecte.post("/api/vie-courante/pesees", json={"date": "2026-11-16", "poids_kg": 76})
    assert doublon.status_code == 409


def test_poids_actuel_sans_pesee(connecte: TestClient) -> None:
    assert connecte.get("/api/vie-courante/poids").status_code == 404


# --- Autorisation : personne ne voit les données des autres ------------------------------


def test_un_autre_compte_ne_voit_ni_ne_touche_mes_seances(connecte: TestClient, moteur: Engine) -> None:
    identifiant = connecte.post("/api/streetlifting/seances", json=seance()).json()["id"]
    peser(connecte)

    connecte.cookies.clear()
    creer_compte(moteur, "autre@oh-hisse.fr")
    connecte.post("/api/auth/connexion", json={"email": "autre@oh-hisse.fr", "mot_de_passe": MDP})

    assert connecte.get("/api/streetlifting/seances").json() == []
    assert connecte.get("/api/vie-courante/pesees").json() == []
    assert connecte.get(f"/api/streetlifting/seances/{identifiant}").status_code == 404
    assert connecte.put(f"/api/streetlifting/seances/{identifiant}", json=seance()).status_code == 404
    assert connecte.delete(f"/api/streetlifting/seances/{identifiant}").status_code == 404


def test_la_demo_ne_voit_pas_mes_donnees(connecte: TestClient) -> None:
    identifiant = connecte.post("/api/streetlifting/seances", json=seance()).json()["id"]

    connecte.cookies.clear()
    connecte.post("/api/auth/demo")

    assert identifiant not in {e["id"] for e in connecte.get("/api/streetlifting/seances").json()}


def test_sans_session_tout_est_ferme(client: TestClient) -> None:
    assert client.get("/api/streetlifting/seances").status_code == 401
    assert client.post("/api/streetlifting/seances", json=seance()).status_code == 401
    assert client.get("/api/vie-courante/pesees").status_code == 401


def test_quitter_la_demo_efface_ses_seances(client: TestClient, moteur: Engine) -> None:
    client.post("/api/auth/demo")
    client.post("/api/streetlifting/seances", json=seance())

    client.post("/api/auth/deconnexion")

    with Session(moteur) as session:
        assert session.exec(select(Serie)).all() == []  # cascade jusqu'aux séries
