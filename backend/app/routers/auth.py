"""Connexion, mode démo, déconnexion."""

from datetime import datetime

from fastapi import APIRouter, HTTPException, Request, Response, status
from pydantic import BaseModel, Field
from sqlmodel import select

from app.core.authentification import UtilisateurDep
from app.core.base_de_donnees import SessionDep, en_utc, maintenant
from app.core.config import parametres
from app.core.securite import NOM_COOKIE, LimiteurTentatives, creer_jeton, verifier_mot_de_passe
from app.models import Utilisateur
from app.services.demo import creer_bac_a_sable

routeur = APIRouter(prefix="/auth", tags=["authentification"])

limiteur_connexion = LimiteurTentatives(maximum=5, fenetre_s=60)
limiteur_demo = LimiteurTentatives(maximum=10, fenetre_s=3600)

# Même message pour un email inconnu et un mauvais mot de passe.
IDENTIFIANTS_INCORRECTS = "Email ou mot de passe incorrect."


class Identifiants(BaseModel):
    email: str = Field(max_length=255)
    mot_de_passe: str = Field(max_length=256)


class UtilisateurPublic(BaseModel):
    id: int
    nom_affiche: str
    est_demo: bool
    expire_le: datetime | None


def _public(utilisateur: Utilisateur) -> UtilisateurPublic:
    assert utilisateur.id is not None  # noqa: S101  (toujours vrai après enregistrement)
    return UtilisateurPublic(
        id=utilisateur.id,
        nom_affiche=utilisateur.nom_affiche,
        est_demo=utilisateur.est_demo,
        expire_le=en_utc(utilisateur.expire_le) if utilisateur.expire_le else None,
    )


def _ouvrir_session(reponse: Response, utilisateur: Utilisateur) -> None:
    assert utilisateur.id is not None  # noqa: S101
    expire_le = en_utc(utilisateur.expire_le) if utilisateur.expire_le else None
    jeton, expiration = creer_jeton(utilisateur.id, expire_le)
    reponse.set_cookie(
        NOM_COOKIE,
        jeton,
        max_age=int((expiration - maintenant()).total_seconds()),
        httponly=True,  # illisible pour le JavaScript : un script injecté ne peut pas le voler
        secure=parametres().en_production,
        samesite="lax",  # pas envoyé par les formulaires d'autres sites
        path="/",
    )


def _ip(requete: Request) -> str:
    return requete.client.host if requete.client else "inconnue"


@routeur.post("/connexion", responses={401: {}, 429: {}})
def connexion(
    identifiants: Identifiants, requete: Request, reponse: Response, session: SessionDep
) -> UtilisateurPublic:
    if not limiteur_connexion.autoriser(_ip(requete)):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS, "Trop de tentatives. Réessaie dans une minute."
        )

    email = identifiants.email.strip().lower()
    utilisateur = session.exec(
        select(Utilisateur).where(Utilisateur.email == email, Utilisateur.est_demo == False)  # noqa: E712
    ).first()
    if not verifier_mot_de_passe(identifiants.mot_de_passe, utilisateur.mdp_hash if utilisateur else None):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, IDENTIFIANTS_INCORRECTS)
    assert utilisateur is not None  # noqa: S101  (le mot de passe a été vérifié)

    _ouvrir_session(reponse, utilisateur)
    return _public(utilisateur)


@routeur.post("/demo", status_code=status.HTTP_201_CREATED, responses={429: {}})
def demo(requete: Request, reponse: Response, session: SessionDep) -> UtilisateurPublic:
    if not limiteur_demo.autoriser(_ip(requete)):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Trop de démos ouvertes. Réessaie plus tard.")
    utilisateur = creer_bac_a_sable(session)
    _ouvrir_session(reponse, utilisateur)
    return _public(utilisateur)


@routeur.get("/moi", responses={401: {}})
def moi(utilisateur: UtilisateurDep) -> UtilisateurPublic:
    return _public(utilisateur)


@routeur.post("/deconnexion", status_code=status.HTTP_204_NO_CONTENT, responses={401: {}})
def deconnexion(utilisateur: UtilisateurDep, reponse: Response, session: SessionDep) -> None:
    if utilisateur.est_demo:
        # Quitter la démo efface le bac à sable tout de suite.
        session.delete(utilisateur)
        session.commit()
    reponse.delete_cookie(NOM_COOKIE, path="/", httponly=True, samesite="lax")
