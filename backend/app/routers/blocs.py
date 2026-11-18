"""Routes des blocs d'entraînement et de la séance du jour."""

import datetime as dt

from fastapi import APIRouter, status

from app.core.acces import a_moi
from app.core.authentification import UtilisateurDep
from app.core.base_de_donnees import SessionDep
from app.models import Bloc, Objectif
from app.schemas.blocs import BlocImporte, BlocLu, BlocModifie, SeanceDuJour
from app.services import blocs as service

routeur = APIRouter(prefix="/streetlifting", tags=["streetlifting"])


@routeur.get("/blocs")
def lister_blocs(utilisateur: UtilisateurDep, session: SessionDep) -> list[BlocLu]:
    jour = dt.date.today()
    return [service.vers_lecture(session, b, jour) for b in service.blocs(session, utilisateur)]


@routeur.post("/blocs", status_code=status.HTTP_201_CREATED, responses={404: {}, 422: {}})
def importer_bloc(donnees: BlocImporte, utilisateur: UtilisateurDep, session: SessionDep) -> BlocLu:
    """Importe le contenu d'un fichier JSON de bloc (format de la note 03 du CDC)."""
    service.verifier_programme(session, utilisateur, donnees)
    if donnees.objectif_id is not None:
        a_moi(session, Objectif, donnees.objectif_id, utilisateur)
    assert utilisateur.id is not None  # noqa: S101
    bloc = Bloc(
        utilisateur_id=utilisateur.id,
        nom=donnees.nom,
        type=donnees.type,
        cycles=donnees.cycles,
        programme=[s.model_dump(mode="json") for s in donnees.seances],
        debut=donnees.debut or dt.date.today(),
        objectif_id=donnees.objectif_id,
    )
    session.add(bloc)
    session.commit()
    session.refresh(bloc)
    return service.vers_lecture(session, bloc, dt.date.today())


@routeur.patch("/blocs/{bloc_id}", responses={404: {}})
def modifier_bloc(
    bloc_id: int, donnees: BlocModifie, utilisateur: UtilisateurDep, session: SessionDep
) -> BlocLu:
    bloc = a_moi(session, Bloc, bloc_id, utilisateur)
    if donnees.nom is not None:
        bloc.nom = donnees.nom
    if donnees.detacher_objectif:
        bloc.objectif_id = None
    elif donnees.objectif_id is not None:
        bloc.objectif_id = a_moi(session, Objectif, donnees.objectif_id, utilisateur).id
    if donnees.fin is not None:
        bloc.fin = donnees.fin
    session.add(bloc)
    session.commit()
    session.refresh(bloc)
    return service.vers_lecture(session, bloc, dt.date.today())


@routeur.delete("/blocs/{bloc_id}", status_code=status.HTTP_204_NO_CONTENT, responses={404: {}})
def supprimer_bloc(bloc_id: int, utilisateur: UtilisateurDep, session: SessionDep) -> None:
    """Supprime le bloc ; ses séances réalisées sont conservées (détachées du bloc)."""
    session.delete(a_moi(session, Bloc, bloc_id, utilisateur))
    session.commit()


@routeur.get("/seance-du-jour")
def seance_du_jour(
    utilisateur: UtilisateurDep, session: SessionDep, jour: dt.date | None = None
) -> SeanceDuJour:
    return service.seance_du_jour(session, utilisateur, jour or dt.date.today())
