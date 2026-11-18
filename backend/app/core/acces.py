"""Contrôle d'accès aux lignes personnelles.

Une ligne d'un autre utilisateur est traitée exactement comme une ligne
inexistante (404) : on ne révèle même pas qu'elle existe.
"""

from fastapi import HTTPException, status
from sqlmodel import Session, SQLModel

from app.models import Utilisateur

INTROUVABLE = HTTPException(status.HTTP_404_NOT_FOUND, detail="Introuvable.")


def a_moi[T: SQLModel](session: Session, modele: type[T], identifiant: int, utilisateur: Utilisateur) -> T:
    ligne = session.get(modele, identifiant)
    if ligne is None or getattr(ligne, "utilisateur_id", None) != utilisateur.id:
        raise INTROUVABLE
    return ligne
