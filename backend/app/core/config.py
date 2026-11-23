"""Configuration lue depuis l'environnement (et le fichier `.env` à la racine du dépôt)."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
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
    # 32 caractères minimum : en dessous, une clé HMAC-SHA256 est jugée trop faible (RFC 7518).
    cle_secrete: str = Field(
        default="dev-uniquement-cle-de-developpement-a-ne-jamais-deployer", min_length=32
    )
    duree_jeton_minutes: int = 60 * 24 * 7

    # Usage personnel en local : pas d'écran de connexion, l'application s'ouvre directement sur le compte
    # personnel. Refusé en production ; limité aux adresses localhost (voir app/main.py).
    sans_connexion: bool = False

    # Origines autorisées à appeler l'API (le frontend Vite en local).
    # En production, l'interface est servie par la même origine : rien à autoriser.
    origines_cors: list[str] = ["http://localhost:5173"]

    # Interface construite (`npm run build`) : servie par FastAPI si le dossier existe.
    dossier_interface: Path = RACINE_DEPOT / "frontend" / "dist"

    @field_validator("url_base_de_donnees")
    @classmethod
    def _pilote_postgresql(cls, url: str) -> str:
        # Neon, Render… donnent une URL « postgresql:// » ; SQLAlchemy y mettrait psycopg2.
        for prefixe in ("postgres://", "postgresql://"):
            if url.startswith(prefixe):
                return "postgresql+psycopg://" + url.removeprefix(prefixe)
        return url

    @property
    def en_production(self) -> bool:
        return self.environnement == "production"


@lru_cache
def parametres() -> Parametres:
    p = Parametres()
    if p.en_production and p.cle_secrete.startswith("dev-"):
        raise RuntimeError("OH_HISSE_CLE_SECRETE doit être définie en production.")
    if p.en_production and p.sans_connexion:
        raise RuntimeError("OH_HISSE_SANS_CONNEXION est interdit en production : tout le monde y entrerait.")
    return p
