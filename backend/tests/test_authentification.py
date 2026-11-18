from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.base_de_donnees import maintenant
from app.core.securite import NOM_COOKIE, creer_jeton, hacher_mot_de_passe, verifier_mot_de_passe
from app.models import Utilisateur
from app.services.demo import purger_bacs_a_sable_expires

EMAIL = "moi@oh-hisse.fr"
MDP = "une-phrase-de-passe-solide"


@pytest.fixture
def mon_compte(session: Session) -> Utilisateur:
    compte = Utilisateur(email=EMAIL, nom_affiche="Antoine", mdp_hash=hacher_mot_de_passe(MDP))
    session.add(compte)
    session.commit()
    session.refresh(compte)
    return compte


def connecter(client: TestClient, email: str = EMAIL, mdp: str = MDP) -> int:
    return client.post("/api/auth/connexion", json={"email": email, "mot_de_passe": mdp}).status_code


# --- Mots de passe et jetons -------------------------------------------------------


def test_un_mot_de_passe_est_hache_et_verifiable() -> None:
    mdp_hash = hacher_mot_de_passe(MDP)

    assert mdp_hash != MDP
    assert verifier_mot_de_passe(MDP, mdp_hash)
    assert not verifier_mot_de_passe("autre", mdp_hash)


def test_un_mot_de_passe_trop_long_est_refuse_sans_troncature() -> None:
    with pytest.raises(ValueError, match="trop long"):
        hacher_mot_de_passe("a" * 73)
    # 72 « a » puis un caractère différent ne doivent pas valoir 72 « a ».
    assert not verifier_mot_de_passe("a" * 72 + "b", hacher_mot_de_passe("a" * 72))


# --- Connexion ---------------------------------------------------------------------


def test_la_connexion_pose_un_cookie_httponly(client: TestClient, mon_compte: Utilisateur) -> None:
    reponse = client.post("/api/auth/connexion", json={"email": EMAIL, "mot_de_passe": MDP})

    assert reponse.status_code == 200
    assert reponse.json()["nom_affiche"] == "Antoine"
    cookie = reponse.headers["set-cookie"]
    assert cookie.startswith(f"{NOM_COOKIE}=")
    assert "HttpOnly" in cookie
    assert "SameSite=lax" in cookie


def test_l_email_est_insensible_a_la_casse(client: TestClient, mon_compte: Utilisateur) -> None:
    assert connecter(client, email="  Moi@Oh-Hisse.FR ") == 200


def test_meme_message_pour_email_inconnu_et_mauvais_mot_de_passe(
    client: TestClient, mon_compte: Utilisateur
) -> None:
    inconnu = client.post("/api/auth/connexion", json={"email": "x@y.fr", "mot_de_passe": MDP})
    mauvais = client.post("/api/auth/connexion", json={"email": EMAIL, "mot_de_passe": "faux"})

    assert inconnu.status_code == mauvais.status_code == 401
    assert inconnu.json() == mauvais.json()


def test_la_connexion_est_limitee_a_cinq_essais_par_minute(
    client: TestClient, mon_compte: Utilisateur
) -> None:
    codes = [connecter(client, mdp="faux") for _ in range(5)]

    assert codes == [401] * 5
    assert connecter(client) == 429  # même avec le bon mot de passe


def test_moi_exige_une_session(client: TestClient, mon_compte: Utilisateur) -> None:
    assert client.get("/api/auth/moi").status_code == 401

    connecter(client)

    assert client.get("/api/auth/moi").json()["nom_affiche"] == "Antoine"


def test_un_jeton_falsifie_est_refuse(client: TestClient, mon_compte: Utilisateur) -> None:
    connecter(client)
    jeton = client.cookies[NOM_COOKIE]
    entete, contenu, signature = jeton.split(".")
    client.cookies.clear()
    client.cookies.set(NOM_COOKIE, f"{entete}.{contenu}.{signature[::-1]}")

    assert client.get("/api/auth/moi").status_code == 401


def test_un_jeton_expire_est_refuse(client: TestClient, mon_compte: Utilisateur) -> None:
    assert mon_compte.id is not None
    jeton, _ = creer_jeton(mon_compte.id, expire_le=maintenant() - timedelta(seconds=1))
    client.cookies.set(NOM_COOKIE, jeton)

    assert client.get("/api/auth/moi").status_code == 401


def test_la_deconnexion_efface_le_cookie(client: TestClient, mon_compte: Utilisateur) -> None:
    connecter(client)

    assert client.post("/api/auth/deconnexion").status_code == 204
    assert client.get("/api/auth/moi").status_code == 401


# --- Mode démo ---------------------------------------------------------------------


def test_chaque_visiteur_recoit_son_propre_bac_a_sable(client: TestClient, session: Session) -> None:
    premier = client.post("/api/auth/demo").json()
    client.cookies.clear()
    second = client.post("/api/auth/demo").json()

    assert premier["est_demo"] and second["est_demo"]
    assert premier["id"] != second["id"]
    assert premier["expire_le"] is not None


def test_un_compte_demo_ne_peut_pas_se_connecter_par_mot_de_passe(
    client: TestClient, session: Session
) -> None:
    client.post("/api/auth/demo")
    demo = session.exec(select(Utilisateur).where(Utilisateur.est_demo == True)).one()  # noqa: E712

    assert connecter(client, email=demo.email, mdp="") == 401


def test_quitter_la_demo_efface_le_bac_a_sable(client: TestClient, session: Session) -> None:
    identifiant = client.post("/api/auth/demo").json()["id"]

    client.post("/api/auth/deconnexion")

    session.expire_all()
    assert session.get(Utilisateur, identifiant) is None


def test_un_bac_a_sable_expire_est_refuse_puis_purge(client: TestClient, session: Session) -> None:
    identifiant = client.post("/api/auth/demo").json()["id"]
    demo = session.get(Utilisateur, identifiant)
    assert demo is not None
    demo.expire_le = maintenant() - timedelta(minutes=1)
    session.add(demo)
    session.commit()

    assert client.get("/api/auth/moi").status_code == 401
    assert purger_bacs_a_sable_expires(session) == 1


def test_la_purge_ne_touche_jamais_mon_compte(session: Session, mon_compte: Utilisateur) -> None:
    assert purger_bacs_a_sable_expires(session) == 0
    assert session.get(Utilisateur, mon_compte.id) is not None
