"""Routes des objectifs."""

import datetime as dt

from fastapi import APIRouter, status
from sqlmodel import Session, col, select

from app.core.acces import a_moi
from app.core.authentification import UtilisateurDep
from app.core.base_de_donnees import SessionDep
from app.models import Bloc, Exercice, Objectif, Utilisateur
from app.schemas.objectifs import BlocAssocie, ObjectifEcrit, ObjectifLu, ObjectifStatut, Progression
from app.services import streetlifting as service

routeur = APIRouter(prefix="/objectifs", tags=["objectifs"])

# Le 1RM « actuel » : le meilleur estimé sur les quatre dernières semaines.
FENETRE_PROGRESSION = dt.timedelta(weeks=4)


def _progression(
    session: Session, utilisateur: Utilisateur, objectif: Objectif, jour: dt.date
) -> Progression | None:
    points = [
        p for p in service.evolution(session, utilisateur, objectif.exercice_id) if p.e1rm_lest_kg is not None
    ]
    if not points:
        return None
    recents = [p for p in points if p.date > jour - FENETRE_PROGRESSION] or [points[-1]]
    meilleur = max(recents, key=lambda p: p.e1rm_lest_kg or 0)
    assert meilleur.e1rm_lest_kg is not None  # noqa: S101
    cible = objectif.valeur_cible_kg
    pourcentage = 100.0 if cible <= 0 else min(100.0, max(0.0, meilleur.e1rm_lest_kg / cible * 100))
    return Progression(
        e1rm_lest_kg=meilleur.e1rm_lest_kg,
        le=meilleur.date,
        pourcentage=round(pourcentage, 1),
        cible_atteinte=meilleur.e1rm_lest_kg >= cible,
    )


def _lecture(session: Session, utilisateur: Utilisateur, objectif: Objectif) -> ObjectifLu:
    jour = dt.date.today()
    exercice = session.get(Exercice, objectif.exercice_id)
    blocs = session.exec(select(Bloc).where(Bloc.objectif_id == objectif.id).order_by(col(Bloc.debut))).all()
    assert objectif.id is not None and exercice is not None  # noqa: S101
    return ObjectifLu(
        id=objectif.id,
        titre=objectif.titre,
        type=objectif.type,
        exercice_id=objectif.exercice_id,
        exercice=exercice.nom,
        valeur_cible_kg=objectif.valeur_cible_kg,
        date_cible=objectif.date_cible,
        principal=objectif.principal,
        statut=objectif.statut,
        jours_restants=(objectif.date_cible - jour).days,
        progression=_progression(session, utilisateur, objectif, jour),
        blocs=[BlocAssocie(id=b.id, nom=b.nom) for b in blocs if b.id is not None],
    )


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
    return [_lecture(session, utilisateur, o) for o in objectifs]


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
    return _lecture(session, utilisateur, objectif)


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
    return _lecture(session, utilisateur, objectif)


@routeur.patch("/{objectif_id}/statut", responses={404: {}})
def changer_statut(
    objectif_id: int, donnees: ObjectifStatut, utilisateur: UtilisateurDep, session: SessionDep
) -> ObjectifLu:
    objectif = a_moi(session, Objectif, objectif_id, utilisateur)
    objectif.statut = donnees.statut
    session.add(objectif)
    session.commit()
    session.refresh(objectif)
    return _lecture(session, utilisateur, objectif)


@routeur.delete("/{objectif_id}", status_code=status.HTTP_204_NO_CONTENT, responses={404: {}})
def supprimer(objectif_id: int, utilisateur: UtilisateurDep, session: SessionDep) -> None:
    session.delete(a_moi(session, Objectif, objectif_id, utilisateur))
    session.commit()
