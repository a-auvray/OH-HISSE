from fastapi.testclient import TestClient

from app.main import app


def test_l_api_repond() -> None:
    reponse = TestClient(app).get("/api/sante")

    assert reponse.status_code == 200
    assert reponse.json()["statut"] == "ok"


def test_le_cors_autorise_le_frontend_local() -> None:
    reponse = TestClient(app).options(
        "/api/sante",
        headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"},
    )

    assert reponse.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert reponse.headers["access-control-allow-credentials"] == "true"


def test_le_cors_refuse_une_origine_inconnue() -> None:
    reponse = TestClient(app).options(
        "/api/sante",
        headers={"Origin": "https://site-pirate.example", "Access-Control-Request-Method": "GET"},
    )

    assert "access-control-allow-origin" not in reponse.headers
