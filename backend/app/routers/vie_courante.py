"""Routes de Vie courante (pour l'instant : la pesée, dont le 1RM a besoin)."""

import datetime as dt

from fastapi import APIRouter, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import col, select

from app.core.acces import a_moi
from app.core.authentification import UtilisateurDep
from app.core.base_de_donnees import SessionDep
from app.models import Pesee
from app.moteurs import poids
from app.schemas.vie_courante import PeseeEcrite, PeseeLue, PoidsActuel
from app.services import streetlifting as service

routeur = APIRouter(prefix="/vie-courante", tags=["vie courante"])


@routeur.get("/pesees")
def lister_pesees(utilisateur: UtilisateurDep, session: SessionDep) -> list[PeseeLue]:
    lignes = session.exec(
        select(Pesee).where(Pesee.utilisateur_id == utilisateur.id).order_by(col(Pesee.date))
    ).all()
    return [PeseeLue.model_validate(p, from_attributes=True) for p in lignes]


@routeur.post("/pesees", status_code=status.HTTP_201_CREATED, responses={409: {}})
def enregistrer_pesee(donnees: PeseeEcrite, utilisateur: UtilisateurDep, session: SessionDep) -> PeseeLue:
    assert utilisateur.id is not None  # noqa: S101
    pesee = Pesee(utilisateur_id=utilisateur.id, **donnees.model_dump())
    session.add(pesee)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Une pesée existe déjà à cette date.") from None
    session.refresh(pesee)
    return PeseeLue.model_validate(pesee, from_attributes=True)


@routeur.delete("/pesees/{pesee_id}", status_code=status.HTTP_204_NO_CONTENT, responses={404: {}})
def supprimer_pesee(pesee_id: int, utilisateur: UtilisateurDep, session: SessionDep) -> None:
    session.delete(a_moi(session, Pesee, pesee_id, utilisateur))
    session.commit()


@routeur.get("/poids", responses={404: {}})
def poids_actuel(utilisateur: UtilisateurDep, session: SessionDep) -> PoidsActuel:
    resultat = poids.poids_a_la_date(service.pesees(session, utilisateur), dt.date.today())
    if resultat is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Aucune pesée enregistrée.")
    return PoidsActuel(kg=resultat.kg, a_jour=resultat.a_jour, derniere_pesee=resultat.derniere_pesee)
