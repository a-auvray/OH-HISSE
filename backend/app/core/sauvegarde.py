"""Sauvegarde de la base SQLite locale : une copie datée, les plus anciennes sont effacées."""

import sqlite3
from datetime import datetime
from pathlib import Path

from sqlalchemy.engine import make_url

PREFIXE = "oh-hisse-"


def chemin_sqlite(url: str) -> Path | None:
    """Fichier de la base si c'est du SQLite sur disque, sinon None (PostgreSQL, mémoire)."""
    adresse = make_url(url)
    if adresse.get_backend_name() != "sqlite" or not adresse.database or adresse.database == ":memory:":
        return None
    return Path(adresse.database)


def sauvegarder(source: Path, dossier: Path, *, maintenant: datetime, garder: int = 30) -> Path:
    """Copie `source` dans `dossier` (cohérente même si l'appli tourne) et garde les `garder` dernières."""
    dossier.mkdir(parents=True, exist_ok=True)
    cible = dossier / f"{PREFIXE}{maintenant:%Y%m%d-%H%M%S}.db"
    origine = sqlite3.connect(source)
    copie = sqlite3.connect(cible)
    try:
        origine.backup(copie)
    finally:
        copie.close()
        origine.close()
    anciennes = sorted(dossier.glob(f"{PREFIXE}*.db"))
    for ancienne in anciennes[: max(0, len(anciennes) - garder)]:
        ancienne.unlink()
    return cible
