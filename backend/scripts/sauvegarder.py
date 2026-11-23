"""Sauvegarde la base locale dans `sauvegardes/` à la racine du dépôt.

    uv run python scripts/sauvegarder.py

Lancé automatiquement par `lancer.bat` à chaque démarrage. Sans effet sur une base PostgreSQL
(Neon sauvegarde de son côté).
"""

from datetime import datetime

from app.core.config import RACINE_DEPOT, parametres
from app.core.sauvegarde import chemin_sqlite, sauvegarder


def main() -> None:
    source = chemin_sqlite(parametres().url_base_de_donnees)
    if source is None or not source.exists():
        print("Pas de base SQLite à sauvegarder.")
        return
    cible = sauvegarder(source, RACINE_DEPOT / "sauvegardes", maintenant=datetime.now())
    print(f"Sauvegarde : {cible}")


if __name__ == "__main__":
    main()
