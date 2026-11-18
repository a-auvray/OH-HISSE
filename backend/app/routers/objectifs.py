"""Routes des objectifs."""

from fastapi import APIRouter, status
from sqlmodel import Session, col, select

from app.core.acces import a_moi
from app.core.authentification import UtilisateurDep
from app.core.base_de_donnees import SessionDep
from app.models import Objectif, Utilisateur
from app.schemas.objectifs import ObjectifEcrit, ObjectifLu, ObjectifStatut
from app.services import streetlifting as service
from app.services.objectifs import lecture

routeur = APIRouter(prefix="/objectifs", tags=["objectifs"])


def _un_seul_principal(session: Session, utilisateur: Utilisateur, garder: Objectif) -> None:
    if not garder.principal:
        return
    for autre in session.exec(
        select(Objectif).where(Objectif.utilisateur_id == utilisateur.id, Objectif.id != garder.id)
    ).all():
        if autre.principal:
            autre.principal = False
            session.add(autre)


@routeur.get("")
def lister(utilisateur: UtilisateurDep, session: SessionDep) -> list[ObjectifLu]:
    objectifs = session.exec(
        select(Objectif)
        .where(Objectif.utilisateur_id == utilisateur.id)
        .order_by(col(Objectif.principal).desc(), col(Objectif.date_cible))
    ).all()
    return [lecture(session, utilisateur, o) for o in objectifs]


@routeur.post("", status_code=status.HTTP_201_CREATED, responses={422: {}})
def creer(donnees: ObjectifEcrit, utilisateur: UtilisateurDep, session: SessionDep) -> ObjectifLu:
    service.verifier_exercices(session, utilisateur, {donnees.exercice_id})
    assert utilisateur.id is not None  # noqa: S101
    objectif = Objectif(utilisateur_id=utilisateur.id, **donnees.model_dump())
    session.add(objectif)
    session.flush()
    _un_seul_principal(session, utilisateur, objectif)
    session.commit()
    session.refresh(objectif)
    return lecture(session, utilisateur, objectif)


@routeur.put("/{objectif_id}", responses={404: {}, 422: {}})
def modifier(
    objectif_id: int, donnees: ObjectifEcrit, utilisateur: UtilisateurDep, session: SessionDep
) -> ObjectifLu:
    objectif = a_moi(session, Objectif, objectif_id, utilisateur)
    service.verifier_exercices(session, utilisateur, {donnees.exercice_id})
    for champ, valeur in donnees.model_dump().items():
        setattr(objectif, champ, valeur)
    _un_seul_principal(session, utilisateur, objectif)
    session.add(objectif)
    session.commit()
    session.refresh(objectif)
    return lecture(session, utilisateur, objectif)


@routeur.patch("/{objectif_id}/statut", responses={404: {}})
def changer_statut(
    objectif_id: int, donnees: ObjectifStatut, utilisateur: UtilisateurDep, session: SessionDep
) -> ObjectifLu:
    objectif = a_moi(session, Objectif, objectif_id, utilisateur)
    objectif.statut = donnees.statut
    session.add(objectif)
    session.commit()
    session.refresh(objectif)
    return lecture(session, utilisateur, objectif)


@routeur.delete("/{objectif_id}", status_code=status.HTTP_204_NO_CONTENT, responses={404: {}})
def supprimer(objectif_id: int, utilisateur: UtilisateurDep, session: SessionDep) -> None:
    session.delete(a_moi(session, Objectif, objectif_id, utilisateur))
    session.commit()
