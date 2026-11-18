"""Lecture des données du Streetlifting et passage vers les moteurs.

Les moteurs ne connaissent pas la base : ce module traduit les lignes en
données simples (`Serie`, `Performance`, `Pesee` des moteurs) et inversement.
"""

import datetime as dt
from collections import defaultdict
from statistics import mean

from fastapi import HTTPException, status
from sqlalchemy.orm import selectinload
from sqlmodel import Session, col, or_, select

from app.models import Exercice, Pesee, Seance, Serie, Utilisateur
from app.moteurs import poids, rpe
from app.moteurs.autoregulation import Performance
from app.schemas.streetlifting import PointEvolution, Record, SeanceLue, SerieLue


def exercices_accessibles(session: Session, utilisateur: Utilisateur) -> list[Exercice]:
    """Les exercices communs, plus ceux que l'utilisateur a ajoutés."""
    requete = (
        select(Exercice)
        .where(or_(col(Exercice.utilisateur_id).is_(None), Exercice.utilisateur_id == utilisateur.id))
        .order_by(col(Exercice.id))
    )
    return list(session.exec(requete).all())


def verifier_exercices(session: Session, utilisateur: Utilisateur, identifiants: set[int]) -> None:
    connus = {e.id for e in exercices_accessibles(session, utilisateur)}
    if inconnus := identifiants - connus:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f"Exercice inconnu : {sorted(inconnus)}")


def pesees(session: Session, utilisateur: Utilisateur) -> list[poids.Pesee]:
    lignes = session.exec(select(Pesee).where(Pesee.utilisateur_id == utilisateur.id)).all()
    return [poids.Pesee(p.date, p.poids_kg) for p in lignes]


def seances(
    session: Session,
    utilisateur: Utilisateur,
    debut: dt.date | None = None,
    fin: dt.date | None = None,
) -> list[Seance]:
    """Séances de l'utilisateur (séries chargées), de la plus ancienne à la plus récente."""
    requete = (
        select(Seance)
        .where(Seance.utilisateur_id == utilisateur.id)
        .options(selectinload(Seance.series))  # type: ignore[arg-type]
        .order_by(col(Seance.date), col(Seance.id))
    )
    if debut:
        requete = requete.where(Seance.date >= debut)
    if fin:
        requete = requete.where(Seance.date <= fin)
    return list(session.exec(requete).all())


def _series_moteur(series: list[Serie]) -> list[rpe.Serie]:
    return [rpe.Serie(s.reps, s.lest_kg, s.rpe, s.echec) for s in series]


def _par_exercice(seance: Seance) -> dict[int, list[Serie]]:
    groupes: defaultdict[int, list[Serie]] = defaultdict(list)
    for serie in seance.series:
        groupes[serie.exercice_id].append(serie)
    return groupes


def vers_lecture(seance: Seance, toutes_pesees: list[poids.Pesee]) -> SeanceLue:
    """Séance telle que l'API la renvoie, avec le poids du jour et les 1RM estimés."""
    pdc = poids.poids_a_la_date(toutes_pesees, seance.date)
    records = []
    if pdc:
        for exercice_id, series in _par_exercice(seance).items():
            total = rpe.meilleur_e1rm(_series_moteur(series), pdc.kg)
            if total is not None:
                records.append(
                    Record(
                        exercice_id=exercice_id,
                        e1rm_total_kg=round(total, 1),
                        e1rm_lest_kg=round(rpe.en_lest(total, pdc.kg), 1),
                    )
                )
    assert seance.id is not None  # noqa: S101
    return SeanceLue(
        id=seance.id,
        date=seance.date,
        nom=seance.nom,
        ressenti=seance.ressenti,
        note=seance.note,
        bloc_id=seance.bloc_id,
        rang_modele=seance.rang_modele,
        series=[SerieLue.model_validate(s, from_attributes=True) for s in seance.series],
        poids_du_corps_kg=pdc.kg if pdc else None,
        poids_a_jour=pdc.a_jour if pdc else False,
        records=records,
    )


def performances(
    session: Session, utilisateur: Utilisateur, exercice_id: int, avant: dt.date | None = None
) -> list[Performance]:
    """Historique d'un exercice pour l'auto-régulation (séances avec un poids du corps connu)."""
    toutes_pesees = pesees(session, utilisateur)
    resultat = []
    for seance in seances(session, utilisateur, fin=avant):
        series = _par_exercice(seance).get(exercice_id)
        pdc = poids.poids_a_la_date(toutes_pesees, seance.date)
        if series and pdc:
            resultat.append(Performance(seance.date, tuple(_series_moteur(series)), pdc.kg))
    return resultat


def evolution(session: Session, utilisateur: Utilisateur, exercice_id: int) -> list[PointEvolution]:
    toutes_pesees = pesees(session, utilisateur)
    points = []
    for seance in seances(session, utilisateur):
        series = _par_exercice(seance).get(exercice_id)
        if not series:
            continue
        pdc = poids.poids_a_la_date(toutes_pesees, seance.date)
        total = rpe.meilleur_e1rm(_series_moteur(series), pdc.kg) if pdc else None
        rpes = [10.0 if s.echec else s.rpe for s in series if s.echec or s.rpe is not None]
        assert seance.id is not None  # noqa: S101
        points.append(
            PointEvolution(
                seance_id=seance.id,
                date=seance.date,
                e1rm_total_kg=round(total, 1) if total else None,
                e1rm_lest_kg=round(rpe.en_lest(total, pdc.kg), 1) if total and pdc else None,
                tonnage_kg=round(sum(s.reps * ((pdc.kg if pdc else 0) + s.lest_kg) for s in series), 1),
                series=len(series),
                reps=sum(s.reps for s in series),
                rpe_moyen=round(mean(r for r in rpes if r is not None), 1) if rpes else None,
                poids_du_corps_kg=pdc.kg if pdc else None,
            )
        )
    return points
