"""En ligne : un seul service sert l'API et l'interface, sur PostgreSQL."""

from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.config import Parametres
from app.main import servir_interface


@pytest.fixture
def interface(tmp_path: Path) -> TestClient:
    (tmp_path / "assets").mkdir()
    (tmp_path / "index.html").write_text("<div id=root></div>", encoding="utf-8")
    (tmp_path / "assets" / "index-abc123.js").write_text("console.log(1)", encoding="utf-8")
    (tmp_path / "favicon.svg").write_text("<svg/>", encoding="utf-8")
    (tmp_path.parent / "secret.txt").write_text("à ne pas servir", encoding="utf-8")

    application = FastAPI()

    @application.get("/api/sante")
    def sante() -> dict[str, str]:
        return {"statut": "ok"}

    servir_interface(application, tmp_path)
    return TestClient(application)


def test_l_accueil_et_les_adresses_de_l_interface_renvoient_index(interface: TestClient) -> None:
    for adresse in ("/", "/marine/carte", "/vie-courante/briefings"):
        reponse = interface.get(adresse)
        assert reponse.status_code == 200
        assert "root" in reponse.text
        assert reponse.headers["cache-control"] == "no-cache"


def test_les_fichiers_sont_servis_tels_quels(interface: TestClient) -> None:
    script = interface.get("/assets/index-abc123.js")
    assert script.text == "console.log(1)"
    assert "immutable" in script.headers["cache-control"]
    assert interface.get("/assets/absent.js").status_code == 404
    assert interface.get("/favicon.svg").text == "<svg/>"


def test_l_api_garde_ses_routes_et_ses_404(interface: TestClient) -> None:
    assert interface.get("/api/sante").json() == {"statut": "ok"}
    assert interface.get("/api/inconnue").status_code == 404
    assert interface.get("/api").status_code == 404


def test_on_ne_sort_pas_du_dossier_de_l_interface(interface: TestClient) -> None:
    assert "ne pas servir" not in interface.get("/../secret.txt").text
    assert "ne pas servir" not in interface.get("/%2e%2e/secret.txt").text


@pytest.mark.parametrize(
    ("donnee", "attendue"),
    [
        (
            "postgresql://u:p@ep-x.neon.tech/oh?sslmode=require",
            "postgresql+psycopg://u:p@ep-x.neon.tech/oh?sslmode=require",
        ),
        ("postgres://u:p@hote/oh", "postgresql+psycopg://u:p@hote/oh"),
        ("postgresql+psycopg://u:p@hote/oh", "postgresql+psycopg://u:p@hote/oh"),
        ("sqlite:///./ci.db", "sqlite:///./ci.db"),
    ],
)
def test_l_url_postgresql_utilise_psycopg(donnee: str, attendue: str) -> None:
    assert Parametres(url_base_de_donnees=donnee).url_base_de_donnees == attendue
