"""Routes du Streetlifting : exercices, séances, évolution."""

import datetime as dt

from fastapi import APIRouter, status

from app.core.acces import a_moi
from app.core.authentification import UtilisateurDep
from app.core.base_de_donnees import SessionDep
from app.models import Bloc, Seance, Serie
from app.schemas.streetlifting import ExerciceLu, PointEvolution, SeanceEcrite, SeanceLue
from app.services import streetlifting as service

routeur = APIRouter(prefix="/streetlifting", tags=["streetlifting"])


@routeur.get("/exercices")
def lister_exercices(utilisateur: UtilisateurDep, session: SessionDep) -> list[ExerciceLu]:
    return [
        ExerciceLu.model_validate(e, from_attributes=True)
        for e in service.exercices_accessibles(session, utilisateur)
    ]


@routeur.get("/seances")
def lister_seances(
    utilisateur: UtilisateurDep,
    session: SessionDep,
    debut: dt.date | None = None,
    fin: dt.date | None = None,
) -> list[SeanceLue]:
    pesees = service.pesees(session, utilisateur)
    return [service.vers_lecture(s, pesees) for s in service.seances(session, utilisateur, debut, fin)]


@routeur.get("/seances/{seance_id}", responses={404: {}})
def lire_seance(seance_id: int, utilisateur: UtilisateurDep, session: SessionDep) -> SeanceLue:
    seance = a_moi(session, Seance, seance_id, utilisateur)
    return service.vers_lecture(seance, service.pesees(session, utilisateur))


def _remplir(seance: Seance, donnees: SeanceEcrite) -> None:
    seance.date = donnees.date
    seance.nom = donnees.nom
    seance.ressenti = donnees.ressenti
    seance.note = donnees.note
    seance.bloc_id = donnees.bloc_id
    seance.rang_modele = donnees.rang_modele
    seance.series = [Serie(ordre=i, **s.model_dump()) for i, s in enumerate(donnees.series)]


def _verifier(donnees: SeanceEcrite, utilisateur: UtilisateurDep, session: SessionDep) -> None:
    service.verifier_exercices(session, utilisateur, {s.exercice_id for s in donnees.series})
    if donnees.bloc_id is not None:
        a_moi(session, Bloc, donnees.bloc_id, utilisateur)


@routeur.post("/seances", status_code=status.HTTP_201_CREATED, responses={404: {}, 422: {}})
def creer_seance(donnees: SeanceEcrite, utilisateur: UtilisateurDep, session: SessionDep) -> SeanceLue:
    _verifier(donnees, utilisateur, session)
    assert utilisateur.id is not None  # noqa: S101
    seance = Seance(utilisateur_id=utilisateur.id, date=donnees.date)
    _remplir(seance, donnees)
    session.add(seance)
    session.commit()
    session.refresh(seance)
    return service.vers_lecture(seance, service.pesees(session, utilisateur))


@routeur.put("/seances/{seance_id}", responses={404: {}, 422: {}})
def modifier_seance(
    seance_id: int, donnees: SeanceEcrite, utilisateur: UtilisateurDep, session: SessionDep
) -> SeanceLue:
    seance = a_moi(session, Seance, seance_id, utilisateur)
    _verifier(donnees, utilisateur, session)
    _remplir(seance, donnees)
    session.add(seance)
    session.commit()
    session.refresh(seance)
    return service.vers_lecture(seance, service.pesees(session, utilisateur))


@routeur.delete("/seances/{seance_id}", status_code=status.HTTP_204_NO_CONTENT, responses={404: {}})
def supprimer_seance(seance_id: int, utilisateur: UtilisateurDep, session: SessionDep) -> None:
    session.delete(a_moi(session, Seance, seance_id, utilisateur))
    session.commit()


@routeur.get("/evolution/{exercice_id}", responses={422: {}})
def evolution(exercice_id: int, utilisateur: UtilisateurDep, session: SessionDep) -> list[PointEvolution]:
    service.verifier_exercices(session, utilisateur, {exercice_id})
    return service.evolution(session, utilisateur, exercice_id)
