"""Point d'entrée : crée l'application FastAPI et branche les routes."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from importlib.metadata import version

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session

from app.core.base_de_donnees import moteur
from app.core.config import parametres
from app.routers import auth, sante
from app.services.demo import purger_bacs_a_sable_expires


@asynccontextmanager
async def cycle_de_vie(_: FastAPI) -> AsyncIterator[None]:
    # Au démarrage : on fait le ménage des bacs à sable démo expirés.
    with Session(moteur) as session:
        purger_bacs_a_sable_expires(session)
    yield


def creer_application() -> FastAPI:
    config = parametres()
    application = FastAPI(
        title="Oh Hisse !",
        version=version("oh-hisse-backend"),
        description="Streetlifting, Marine, Vie courante et Objectifs, croisés.",
        # La documentation interactive n'est exposée qu'en local.
        docs_url=None if config.en_production else "/api/docs",
        redoc_url=None,
        openapi_url=None if config.en_production else "/api/openapi.json",
        lifespan=cycle_de_vie,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=config.origines_cors,
        allow_credentials=True,  # le jeton voyage dans un cookie httpOnly
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Content-Type"],
    )
    application.include_router(sante.routeur, prefix="/api")
    application.include_router(auth.routeur, prefix="/api")
    return application


app = creer_application()
