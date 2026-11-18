"""Configuration lue depuis l'environnement (et le fichier `.env` à la racine du dépôt)."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

RACINE_DEPOT = Path(__file__).resolve().parents[3]


class Parametres(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=RACINE_DEPOT / ".env",
        env_file_encoding="utf-8",
        env_prefix="OH_HISSE_",
        extra="ignore",
    )

    environnement: Literal["developpement", "test", "production"] = "developpement"

    # Base de données : SQLite en local, PostgreSQL en production.
    url_base_de_donnees: str = f"sqlite:///{RACINE_DEPOT / 'backend' / 'oh-hisse.db'}"

    # Sécurité : la clé par défaut n'est acceptée qu'en développement et en test.
    cle_secrete: str = Field(default="dev-uniquement-a-changer", min_length=16)
    duree_jeton_minutes: int = 60 * 24 * 7

    # Origines autorisées à appeler l'API (le frontend Vite en local).
    origines_cors: list[str] = ["http://localhost:5173"]

    @property
    def en_production(self) -> bool:
        return self.environnement == "production"


@lru_cache
def parametres() -> Parametres:
    p = Parametres()
    if p.en_production and p.cle_secrete.startswith("dev-"):
        raise RuntimeError("OH_HISSE_CLE_SECRETE doit être définie en production.")
    return p
