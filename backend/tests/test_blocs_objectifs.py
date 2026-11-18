import json
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from tests.conftest import DIPS, TRACTION

EXEMPLE = Path(__file__).parents[2] / "docs" / "exemples" / "bloc-force.json"
JOUR = "2026-11-18"


def bloc(**extra: Any) -> dict[str, Any]:
    return {
        "nom": "Force test",
        "type": "force",
        "cycles": 2,
        "debut": "2026-11-01",
        "seances": [
            {"nom": "A", "exercices": [{"exercice": "traction", "series": [3, 5], "reps": 5}]},
            {"nom": "B", "exercices": [{"exercice": "dips", "series": 4, "reps": 8, "rpe_cible": 7}]},
        ],
        **extra,
    }


def realiser(client: TestClient, bloc_id: int, rang: int, date: str, rpe: float = 8) -> None:
    exercice = TRACTION if rang == 0 else DIPS
    reps = 5 if rang == 0 else 8
    series = [{"exercice_id": exercice, "reps": reps, "lest_kg": 20, "rpe": rpe} for _ in range(4)]
    corps = {"date": date, "bloc_id": bloc_id, "rang_modele": rang, "series": series}
    assert client.post("/api/streetlifting/seances", json=corps).status_code == 201


def du_jour(client: TestClient) -> dict[str, Any]:
    reponse = client.get("/api/streetlifting/seance-du-jour", params={"jour": JOUR})
    assert reponse.status_code == 200
    resultat: dict[str, Any] = reponse.json()
    return resultat


# --- Import ------------------------------------------------------------------------


def test_l_exemple_de_la_documentation_s_importe(connecte: TestClient) -> None:
    reponse = connecte.post("/api/streetlifting/blocs", json=json.loads(EXEMPLE.read_text(encoding="utf-8")))

    assert reponse.status_code == 201
    assert reponse.json()["seances_total"] == 18  # 3 séances × 6 cycles


@pytest.mark.parametrize(
    ("modification", "message"),
    [
        ({"type": "endurance"}, None),
        ({"cycles": 0}, None),
        ({"seances": []}, None),
        ({"seances": [{"nom": "A", "exercices": [{"exercice": "squat", "series": 3, "reps": 5}]}]}, "squat"),
        ({"seances": [{"nom": "A", "exercices": [{"exercice": "dips", "series": [5, 3], "reps": 5}]}]}, None),
        ({"seances": [{"nom": "A", "exercices": [{"exercice": "dips", "series": 3, "reps": 15}]}]}, None),
    ],
)
def test_un_bloc_invalide_est_refuse(
    connecte: TestClient, modification: dict[str, Any], message: str | None
) -> None:
    reponse = connecte.post("/api/streetlifting/blocs", json=bloc(**modification))

    assert reponse.status_code == 422
    if message:
        assert message in reponse.json()["detail"]


# --- Séance du jour ----------------------------------------------------------------------


def test_sans_bloc_un_message_invite_a_en_importer_un(connecte: TestClient) -> None:
    seance = du_jour(connecte)

    assert seance["bloc"] is None
    assert "importe un bloc" in seance["message"]


def test_sans_pesee_le_programme_s_affiche_sans_charge(connecte: TestClient) -> None:
    connecte.post("/api/streetlifting/blocs", json=bloc())

    proposition = du_jour(connecte)["propositions"][0]

    assert proposition["lest_kg"] is None
    assert "pesée" in proposition["justifications"][0]


def test_la_suite_du_bloc_avance_a_chaque_seance_realisee(connecte: TestClient) -> None:
    identifiant = connecte.post("/api/streetlifting/blocs", json=bloc()).json()["id"]
    connecte.post("/api/vie-courante/pesees", json={"date": "2026-11-02", "poids_kg": 75})

    premiere = du_jour(connecte)
    assert (premiere["nom"], premiere["bloc"]["numero"]) == ("A", 1)
    assert premiere["propositions"][0]["lest_kg"] is None  # pas encore d'historique

    realiser(connecte, identifiant, 0, "2026-11-03", rpe=7)
    deuxieme = du_jour(connecte)
    assert (deuxieme["nom"], deuxieme["bloc"]["numero"]) == ("B", 2)

    realiser(connecte, identifiant, 1, "2026-11-05")
    troisieme = du_jour(connecte)
    assert troisieme["nom"] == "A"  # deuxième cycle
    traction = troisieme["propositions"][0]
    assert traction["lest_kg"] == 22.5  # RPE 7 la dernière fois : la charge monte
    assert traction["series"] == 5
    assert traction["justifications"][0] == "+2,5 kg : RPE 7 la dernière fois"


def test_un_bloc_termine_n_est_plus_actif(connecte: TestClient) -> None:
    identifiant = connecte.post("/api/streetlifting/blocs", json=bloc(cycles=1)).json()["id"]
    realiser(connecte, identifiant, 0, "2026-11-03")
    realiser(connecte, identifiant, 1, "2026-11-05")

    assert du_jour(connecte)["bloc"] is None
    assert connecte.get("/api/streetlifting/blocs").json()[0]["actif"] is False


def test_un_bloc_futur_n_est_pas_encore_actif(connecte: TestClient) -> None:
    connecte.post("/api/streetlifting/blocs", json=bloc(debut="2026-12-01"))

    assert du_jour(connecte)["bloc"] is None


def test_supprimer_un_bloc_garde_ses_seances(connecte: TestClient) -> None:
    identifiant = connecte.post("/api/streetlifting/blocs", json=bloc()).json()["id"]
    realiser(connecte, identifiant, 0, "2026-11-03")

    connecte.delete(f"/api/streetlifting/blocs/{identifiant}")

    seances = connecte.get("/api/streetlifting/seances").json()
    assert len(seances) == 1
    assert seances[0]["bloc_id"] is None


# --- Objectifs ------------------------------------------------------------------------


def objectif(**extra: Any) -> dict[str, Any]:
    return {
        "titre": "55 kg aux tractions",
        "exercice_id": TRACTION,
        "valeur_cible_kg": 55,
        "date_cible": "2026-12-31",
        **extra,
    }


def test_progression_vers_la_cible(connecte: TestClient) -> None:
    connecte.post("/api/vie-courante/pesees", json={"date": "2026-11-02", "poids_kg": 75})
    series = [{"exercice_id": TRACTION, "reps": 5, "lest_kg": 20, "rpe": 8}]
    connecte.post("/api/streetlifting/seances", json={"date": "2026-11-16", "series": series})

    lu = connecte.post("/api/objectifs", json=objectif()).json()

    assert lu["exercice"] == "Tractions"
    assert lu["progression"]["e1rm_lest_kg"] == pytest.approx(42.1, abs=0.1)
    assert lu["progression"]["pourcentage"] == pytest.approx(76.6, abs=0.2)
    assert lu["progression"]["cible_atteinte"] is False
    assert lu["statut"] == "en_cours"


def test_un_seul_objectif_principal(connecte: TestClient) -> None:
    premier = connecte.post("/api/objectifs", json=objectif(principal=True)).json()
    connecte.post("/api/objectifs", json=objectif(titre="Dips 60 kg", exercice_id=DIPS, principal=True))

    objectifs = {o["id"]: o for o in connecte.get("/api/objectifs").json()}

    assert objectifs[premier["id"]]["principal"] is False
    assert sum(o["principal"] for o in objectifs.values()) == 1


def test_un_bloc_rattache_apparait_sur_l_objectif(connecte: TestClient) -> None:
    identifiant = connecte.post("/api/objectifs", json=objectif()).json()["id"]
    connecte.post("/api/streetlifting/blocs", json=bloc(objectif_id=identifiant))

    lu = connecte.get("/api/objectifs").json()[0]

    assert [b["nom"] for b in lu["blocs"]] == ["Force test"]


def test_marquer_un_objectif_atteint(connecte: TestClient) -> None:
    identifiant = connecte.post("/api/objectifs", json=objectif()).json()["id"]

    lu = connecte.patch(f"/api/objectifs/{identifiant}/statut", json={"statut": "atteint"}).json()

    assert lu["statut"] == "atteint"


def test_les_objectifs_des_autres_sont_invisibles(connecte: TestClient) -> None:
    identifiant = connecte.post("/api/objectifs", json=objectif()).json()["id"]

    connecte.cookies.clear()
    connecte.post("/api/auth/demo")

    assert connecte.get("/api/objectifs").json() == []
    assert connecte.delete(f"/api/objectifs/{identifiant}").status_code == 404
    assert connecte.post("/api/streetlifting/blocs", json=bloc(objectif_id=identifiant)).status_code == 404
