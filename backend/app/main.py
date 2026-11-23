"""Point d'entrée : crée l'application FastAPI et branche les routes."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from importlib.metadata import version
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session
from starlette.responses import Response
from starlette.types import Scope

from app.core.base_de_donnees import moteur
from app.core.config import parametres
from app.routers import auth, blocs, marine, objectifs, sante, streetlifting, vie_courante
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
    if config.sans_connexion:
        # Sans connexion, seul ce navigateur doit pouvoir parler à l'application : un autre site ne peut pas
        # l'atteindre en faisant résoudre son nom vers localhost (« DNS rebinding »).
        application.add_middleware(TrustedHostMiddleware, allowed_hosts=["localhost", "127.0.0.1", "[::1]"])
    application.include_router(sante.routeur, prefix="/api")
    application.include_router(auth.routeur, prefix="/api")
    application.include_router(streetlifting.routeur, prefix="/api")
    application.include_router(blocs.routeur, prefix="/api")
    application.include_router(objectifs.routeur, prefix="/api")
    application.include_router(marine.routeur, prefix="/api")
    application.include_router(vie_courante.routeur, prefix="/api")
    if (config.dossier_interface / "index.html").is_file():
        servir_interface(application, config.dossier_interface)
    return application


class FichiersAEmpreinte(StaticFiles):
    """Fichiers dont le nom change à chaque construction : le navigateur les garde un an."""

    async def get_response(self, path: str, scope: Scope) -> Response:
        reponse = await super().get_response(path, scope)
        if reponse.status_code == 200:
            reponse.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        return reponse


def servir_interface(application: FastAPI, dossier: Path) -> None:
    """Sert l'interface React depuis la même origine que l'API (un seul service en ligne).

    Les fichiers de `assets/` portent une empreinte dans leur nom : mis en cache pour de bon.
    Toute autre adresse hors de `/api` renvoie `index.html`, et React Router prend le relais.
    """
    dossier = dossier.resolve()
    application.mount("/assets", FichiersAEmpreinte(directory=dossier / "assets"), name="assets")
    sans_cache = {"Cache-Control": "no-cache"}

    @application.get("/{chemin:path}", include_in_schema=False)
    def interface(chemin: str) -> FileResponse:
        if chemin == "api" or chemin.startswith("api/"):
            raise HTTPException(status_code=404)
        fichier = (dossier / chemin).resolve()
        if chemin and fichier.is_file() and fichier.is_relative_to(dossier):
            return FileResponse(fichier, headers=sans_cache)
        return FileResponse(dossier / "index.html", headers=sans_cache)


app = creer_application()
