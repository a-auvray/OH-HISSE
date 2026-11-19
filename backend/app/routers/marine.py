"""Routes de Marine."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import col, select

from app.core.acces import a_moi
from app.core.authentification import UtilisateurDep
from app.core.base_de_donnees import SessionDep
from app.models import SortieMer, Spot
from app.moteurs import recuperation
from app.schemas.marine import Assistant, Conditions, Mode, SortieEcrite, SortieLue, SpotLu, TraitDeCote
from app.services import estran, vie_courante
from app.services import marine as service
from app.services.open_meteo import ConditionsIndisponibles, OpenMeteo, open_meteo

routeur = APIRouter(prefix="/marine", tags=["marine"])

OpenMeteoDep = Annotated[OpenMeteo, Depends(open_meteo)]


@routeur.get("/spots")
def lister_spots(utilisateur: UtilisateurDep, session: SessionDep) -> list[SpotLu]:
    return [SpotLu.model_validate(s, from_attributes=True) for s in service.spots(session, utilisateur)]


@routeur.get("/conditions", responses={404: {}, 503: {}})
def conditions(
    utilisateur: UtilisateurDep,
    session: SessionDep,
    meteo: OpenMeteoDep,
    spot_id: int | None = None,
) -> Conditions:
    spot = a_moi(session, Spot, spot_id, utilisateur) if spot_id else service.spots(session, utilisateur)[0]
    try:
        return service.conditions(meteo, spot)
    except ConditionsIndisponibles:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Les conditions en mer sont momentanément indisponibles (Open-Meteo ne répond pas).",
        ) from None


@routeur.get("/trait-de-cote", responses={404: {}})
def trait_de_cote(_: UtilisateurDep, hauteur_m: Annotated[float, Query(ge=-2, le=12)]) -> TraitDeCote:
    """Bord de l'eau sur les plages de la zone pour cette hauteur de marée (relief Litto3D)."""
    trait = estran.trait_de_cote(hauteur_m)
    if trait is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pas de relief de l'estran pour cette zone.")
    return TraitDeCote(hauteur_m=trait.hauteur_m, lignes=trait.lignes, source=estran.SOURCE)


@routeur.get("/assistant", responses={404: {}, 503: {}})
def assistant(
    utilisateur: UtilisateurDep,
    session: SessionDep,
    meteo: OpenMeteoDep,
    spot_id: int | None = None,
    mode: Mode = "nage",
    duree_min: Annotated[int, Query(gt=0, le=600)] = 30,
    combinaison: bool = False,
) -> Assistant:
    """Meilleurs créneaux des prochaines 48 h et recommandations pour préparer la sortie."""
    spot = a_moi(session, Spot, spot_id, utilisateur) if spot_id else service.spots(session, utilisateur)[0]
    try:
        conditions_du_spot = service.conditions(meteo, spot)
    except ConditionsIndisponibles:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "L'assistant a besoin des conditions en mer : Open-Meteo ne répond pas.",
        ) from None
    instant = conditions_du_spot.maintenant.instant
    jours = service.jours_depuis_derniere_sortie(session, utilisateur, instant)
    reponse = service.assistant(conditions_du_spot, mode, duree_min, combinaison, jours)
    etat = vie_courante.etat_recuperation(vie_courante.donnees(session, utilisateur, instant), instant)
    if recuperation.consigne(etat).recup_active_conseillee:
        reponse.recuperation_active = (
            f"Ta récupération n'est pas finie ({etat.restant_h:.0f} h restantes) : une baignade de "
            "20 minutes au plus, sans forcer, t'aidera à récupérer."
        )
    return reponse


# --- Carnet de sortie -----------------------------------------------------------------------


def _lecture(sortie: SortieMer, spot: Spot | None) -> SortieLue:
    danger, tempete = service.danger_sortie(sortie)
    return SortieLue(**sortie.model_dump(), spot=spot.nom if spot else None, danger=danger, tempete=tempete)


@routeur.get("/sorties")
def lister_sorties(utilisateur: UtilisateurDep, session: SessionDep) -> list[SortieLue]:
    sorties = session.exec(
        select(SortieMer)
        .where(SortieMer.utilisateur_id == utilisateur.id)
        .order_by(col(SortieMer.debut).desc())
    ).all()
    spots = {s.id: s for s in service.spots(session, utilisateur)}
    return [_lecture(s, spots.get(s.spot_id)) for s in sorties]


def _enregistrer(
    sortie: SortieMer,
    donnees: SortieEcrite,
    utilisateur: UtilisateurDep,
    session: SessionDep,
    meteo: OpenMeteo,
) -> SortieLue:
    spot = a_moi(session, Spot, donnees.spot_id, utilisateur) if donnees.spot_id else None
    for champ, valeur in donnees.model_dump().items():
        setattr(sortie, champ, valeur)
    sortie.conditions_relevees = False
    service.completer_conditions(meteo, sortie, spot)
    session.add(sortie)
    session.commit()
    session.refresh(sortie)
    return _lecture(sortie, spot)


@routeur.post("/sorties", status_code=status.HTTP_201_CREATED, responses={404: {}, 422: {}})
def creer_sortie(
    donnees: SortieEcrite, utilisateur: UtilisateurDep, session: SessionDep, meteo: OpenMeteoDep
) -> SortieLue:
    assert utilisateur.id is not None  # noqa: S101
    sortie = SortieMer(utilisateur_id=utilisateur.id, type=donnees.type, debut=donnees.debut, duree_min=1)
    return _enregistrer(sortie, donnees, utilisateur, session, meteo)


@routeur.put("/sorties/{sortie_id}", responses={404: {}, 422: {}})
def modifier_sortie(
    sortie_id: int,
    donnees: SortieEcrite,
    utilisateur: UtilisateurDep,
    session: SessionDep,
    meteo: OpenMeteoDep,
) -> SortieLue:
    return _enregistrer(
        a_moi(session, SortieMer, sortie_id, utilisateur), donnees, utilisateur, session, meteo
    )


@routeur.delete("/sorties/{sortie_id}", status_code=status.HTTP_204_NO_CONTENT, responses={404: {}})
def supprimer_sortie(sortie_id: int, utilisateur: UtilisateurDep, session: SessionDep) -> None:
    session.delete(a_moi(session, SortieMer, sortie_id, utilisateur))
    session.commit()
