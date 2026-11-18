"""Objectifs : progression vers la cible (partagée par les routes et les briefings)."""

import datetime as dt

from sqlmodel import Session, col, select

from app.models import Bloc, Exercice, Objectif, Utilisateur
from app.schemas.objectifs import BlocAssocie, ObjectifLu, Progression
from app.services import streetlifting as service

# Le 1RM « actuel » : le meilleur estimé sur les quatre dernières semaines.
FENETRE_PROGRESSION = dt.timedelta(weeks=4)


def progression(
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


def lecture(session: Session, utilisateur: Utilisateur, objectif: Objectif) -> ObjectifLu:
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
        progression=progression(session, utilisateur, objectif, jour),
        blocs=[BlocAssocie(id=b.id, nom=b.nom) for b in blocs if b.id is not None],
    )


def objectif_principal(session: Session, utilisateur: Utilisateur) -> ObjectifLu | None:
    """L'objectif principal en cours, sinon le premier objectif en cours."""
    en_cours = session.exec(
        select(Objectif)
        .where(Objectif.utilisateur_id == utilisateur.id, Objectif.statut == "en_cours")
        .order_by(col(Objectif.principal).desc(), col(Objectif.date_cible))
    ).first()
    return lecture(session, utilisateur, en_cours) if en_cours else None
