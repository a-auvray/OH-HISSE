"""Route de santé : permet au frontend et à l'hébergeur de vérifier que l'API répond."""

from importlib.metadata import version
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

routeur = APIRouter(tags=["santé"])


class EtatSante(BaseModel):
    statut: Literal["ok"]
    version: str


@routeur.get("/sante")
def sante() -> EtatSante:
    return EtatSante(statut="ok", version=version("oh-hisse-backend"))
