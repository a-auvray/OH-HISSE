"""Point d'entrée : crée l'application FastAPI et branche les routes."""

from importlib.metadata import version

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import parametres
from app.routers import sante


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
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=config.origines_cors,
        allow_credentials=True,  # le jeton voyage dans un cookie httpOnly
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Content-Type"],
    )
    application.include_router(sante.routeur, prefix="/api")
    return application


app = creer_application()
