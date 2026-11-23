"""Qui fait la requête ? Dépendance à placer sur toutes les routes privées.

L'autorisation repose sur une règle unique : chaque donnée appartient à un
utilisateur, et une route ne lit ou n'écrit que les données de
`UtilisateurDep`. Le compte démo ne peut donc jamais atteindre mes données.
"""

from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, status
from sqlmodel import col, select

from app.core.base_de_donnees import SessionDep, en_utc, maintenant
from app.core.config import parametres
from app.core.securite import NOM_COOKIE, lire_jeton
from app.models import Utilisateur

NON_CONNECTE = HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Connexion requise.")


def utilisateur_courant(
    session: SessionDep,
    jeton: Annotated[str | None, Cookie(alias=NOM_COOKIE)] = None,
) -> Utilisateur:
    utilisateur_id = lire_jeton(jeton) if jeton else None
    utilisateur = session.get(Utilisateur, utilisateur_id) if utilisateur_id is not None else None
    if utilisateur is None and parametres().sans_connexion:
        # Mode local sans connexion : le premier compte personnel (jamais un bac à sable démo).
        utilisateur = session.exec(
            select(Utilisateur).where(col(Utilisateur.est_demo).is_(False)).order_by(col(Utilisateur.id))
        ).first()
    if utilisateur is None:
        raise NON_CONNECTE
    if utilisateur.expire_le is not None and en_utc(utilisateur.expire_le) <= maintenant():
        raise NON_CONNECTE
    return utilisateur


UtilisateurDep = Annotated[Utilisateur, Depends(utilisateur_courant)]
