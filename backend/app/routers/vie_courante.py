"""Routes de Vie courante : pesées, sommeil, cheat meals, état du jour."""

import datetime as dt

from fastapi import APIRouter, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import col, select

from app.core.acces import a_moi
from app.core.authentification import UtilisateurDep
from app.core.base_de_donnees import SessionDep
from app.models import CheatMeal, Nuit, Pesee
from app.moteurs import poids, recuperation
from app.schemas.vie_courante import (
    CheatMealEcrit,
    CheatMealLu,
    EtatDuJour,
    NuitEcrite,
    NuitLue,
    PeseeEcrite,
    PeseeLue,
    PoidsActuel,
    Recuperation,
    Sommeil,
    VerdictCheatMeal,
)
from app.services import streetlifting as service
from app.services import vie_courante as service_vie

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


# --- Sommeil -----------------------------------------------------------------------------------


@routeur.get("/nuits")
def lister_nuits(utilisateur: UtilisateurDep, session: SessionDep, jours: int = 30) -> list[NuitLue]:
    depuis = dt.date.today() - dt.timedelta(days=jours)
    lignes = session.exec(
        select(Nuit)
        .where(Nuit.utilisateur_id == utilisateur.id, Nuit.date >= depuis)
        .order_by(col(Nuit.date))
    ).all()
    return [NuitLue.model_validate(n, from_attributes=True) for n in lignes]


@routeur.put("/nuits/{jour}")
def enregistrer_nuit(
    jour: dt.date, donnees: NuitEcrite, utilisateur: UtilisateurDep, session: SessionDep
) -> NuitLue:
    """Saisie rapide de la nuit dont le réveil est `jour` ; une nouvelle saisie remplace l'ancienne."""
    assert utilisateur.id is not None  # noqa: S101
    nuit = session.exec(select(Nuit).where(Nuit.utilisateur_id == utilisateur.id, Nuit.date == jour)).first()
    nuit = nuit or Nuit(utilisateur_id=utilisateur.id, date=jour, heures=donnees.heures)
    nuit.heures, nuit.qualite = donnees.heures, donnees.qualite
    session.add(nuit)
    session.commit()
    session.refresh(nuit)
    return NuitLue.model_validate(nuit, from_attributes=True)


@routeur.delete("/nuits/{nuit_id}", status_code=status.HTTP_204_NO_CONTENT, responses={404: {}})
def supprimer_nuit(nuit_id: int, utilisateur: UtilisateurDep, session: SessionDep) -> None:
    session.delete(a_moi(session, Nuit, nuit_id, utilisateur))
    session.commit()


# --- Cheat meals -------------------------------------------------------------------------------


@routeur.get("/cheat-meals")
def lister_cheat_meals(utilisateur: UtilisateurDep, session: SessionDep) -> list[CheatMealLu]:
    lignes = session.exec(
        select(CheatMeal)
        .where(CheatMeal.utilisateur_id == utilisateur.id)
        .order_by(col(CheatMeal.date).desc())
    ).all()
    return [CheatMealLu.model_validate(c, from_attributes=True) for c in lignes]


@routeur.post("/cheat-meals", status_code=status.HTTP_201_CREATED)
def enregistrer_cheat_meal(
    donnees: CheatMealEcrit, utilisateur: UtilisateurDep, session: SessionDep
) -> CheatMealLu:
    assert utilisateur.id is not None  # noqa: S101
    ecart = CheatMeal(utilisateur_id=utilisateur.id, **donnees.model_dump())
    session.add(ecart)
    session.commit()
    session.refresh(ecart)
    return CheatMealLu.model_validate(ecart, from_attributes=True)


@routeur.delete("/cheat-meals/{ecart_id}", status_code=status.HTTP_204_NO_CONTENT, responses={404: {}})
def supprimer_cheat_meal(ecart_id: int, utilisateur: UtilisateurDep, session: SessionDep) -> None:
    session.delete(a_moi(session, CheatMeal, ecart_id, utilisateur))
    session.commit()


# --- État du jour ------------------------------------------------------------------------------


@routeur.get("/etat")
def etat_du_jour(utilisateur: UtilisateurDep, session: SessionDep) -> EtatDuJour:
    """Récupération, verdict cheat meal et sommeil, calculés à l'instant (jamais stockés)."""
    instant = service_vie.maintenant()
    d = service_vie.donnees(session, utilisateur, instant)
    recup = service_vie.etat_recuperation(d, instant)
    verdict = service_vie.verdict_cheat_meal(d, instant)
    tendance = service_vie.tendance_sommeil(d, instant)
    pdc = poids.poids_a_la_date(service.pesees(session, utilisateur), instant.date())
    return EtatDuJour(
        instant=instant,
        recuperation=Recuperation(
            restant_h=recup.restant_h,
            total_h=recup.total_h,
            progression=round(recup.progression, 3),
            recupere=recup.recupere,
            fin=recup.fin,
            raisons=list(recup.raisons),
            recup_active_conseillee=recuperation.consigne(recup).recup_active_conseillee,
        ),
        cheat_meal=VerdictCheatMeal(
            verdict=verdict.verdict,
            points=verdict.points,
            phrase=verdict.phrase,
            details=list(verdict.details),
        ),
        sommeil=Sommeil(
            derniere_nuit_h=tendance.derniere_nuit.heures if tendance.derniere_nuit else None,
            moyenne_h=tendance.moyenne_h,
            nuits_comptees=tendance.nuits_comptees,
        ),
        poids=PoidsActuel(kg=pdc.kg, a_jour=pdc.a_jour, derniere_pesee=pdc.derniere_pesee) if pdc else None,
    )
