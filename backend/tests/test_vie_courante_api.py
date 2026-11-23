import datetime as dt
from typing import Any

from fastapi.testclient import TestClient

from app.services import vie_courante
from tests.conftest import TRACTION

AUJOURDHUI = vie_courante.maintenant().date()  # l'heure de Paris, comme le service (la CI tourne en UTC)
HIER = AUJOURDHUI - dt.timedelta(days=1)


def seance_lourde(jour: dt.date) -> dict[str, Any]:
    series = [{"exercice_id": TRACTION, "reps": 1, "lest_kg": 40, "rpe": 9.5} for _ in range(3)]
    return {"date": jour.isoformat(), "series": series}


def test_sans_rien_on_est_recupere_et_pas_d_ecart(connecte: TestClient) -> None:
    etat = connecte.get("/api/vie-courante/etat").json()

    assert etat["recuperation"]["recupere"] is True
    assert etat["cheat_meal"]["verdict"] == "non"
    assert etat["sommeil"]["moyenne_h"] is None
    assert etat["poids"] is None


def test_une_tentative_de_max_hier_laisse_plus_de_48_h(connecte: TestClient) -> None:
    connecte.post("/api/streetlifting/seances", json=seance_lourde(HIER))

    recup = connecte.get("/api/vie-courante/etat").json()["recuperation"]

    assert recup["recupere"] is False
    assert 48 < recup["restant_h"] <= 96
    assert recup["recup_active_conseillee"] is True
    assert recup["raisons"][0].startswith("Tentative de max du")


def test_la_nuit_se_saisit_et_se_remplace(connecte: TestClient) -> None:
    assert connecte.put(f"/api/vie-courante/nuits/{AUJOURDHUI}", json={"heures": 5.5}).status_code == 200
    remplacee = connecte.put(f"/api/vie-courante/nuits/{AUJOURDHUI}", json={"heures": 7, "qualite": 4}).json()

    nuits = connecte.get("/api/vie-courante/nuits").json()
    assert len(nuits) == 1
    assert (remplacee["heures"], remplacee["qualite"]) == (7, 4)
    assert connecte.get("/api/vie-courante/etat").json()["sommeil"]["derniere_nuit_h"] == 7


def test_un_ecart_recent_fait_baisser_le_verdict(connecte: TestClient) -> None:
    connecte.post("/api/streetlifting/seances", json=seance_lourde(AUJOURDHUI))
    avant = connecte.get("/api/vie-courante/etat").json()["cheat_meal"]

    connecte.post("/api/vie-courante/cheat-meals", json={"date": HIER.isoformat(), "note": "Pizza"})
    apres = connecte.get("/api/vie-courante/etat").json()["cheat_meal"]

    assert avant["points"] == 2
    assert apres["points"] == 0
    assert apres["verdict"] == "non"


def test_nuit_invalide(connecte: TestClient) -> None:
    assert connecte.put(f"/api/vie-courante/nuits/{AUJOURDHUI}", json={"heures": 20}).status_code == 422
    assert (
        connecte.put(f"/api/vie-courante/nuits/{AUJOURDHUI}", json={"heures": 7, "qualite": 6}).status_code
        == 422
    )


def test_le_sommeil_et_les_ecarts_des_autres_sont_invisibles(connecte: TestClient) -> None:
    nuit = connecte.put(f"/api/vie-courante/nuits/{AUJOURDHUI}", json={"heures": 7}).json()
    ecart = connecte.post("/api/vie-courante/cheat-meals", json={"date": HIER.isoformat()}).json()

    connecte.cookies.clear()
    connecte.post("/api/auth/demo")

    assert nuit["id"] not in {e["id"] for e in connecte.get("/api/vie-courante/nuits").json()}
    assert ecart["id"] not in {e["id"] for e in connecte.get("/api/vie-courante/cheat-meals").json()}
    assert connecte.delete(f"/api/vie-courante/nuits/{nuit['id']}").status_code == 404
    assert connecte.delete(f"/api/vie-courante/cheat-meals/{ecart['id']}").status_code == 404
