"""Routes de Marine."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.acces import a_moi
from app.core.authentification import UtilisateurDep
from app.core.base_de_donnees import SessionDep
from app.models import Spot
from app.schemas.marine import Conditions, SpotLu
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
