"""Environnement Alembic : la base et les tables viennent de l'application."""

from logging.config import fileConfig

from sqlmodel import SQLModel

import app.models  # noqa: F401  (enregistre toutes les tables dans SQLModel.metadata)
from alembic import context
from app.core.base_de_donnees import moteur
from app.core.config import parametres

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

URL = parametres().url_base_de_donnees
METADATA = SQLModel.metadata
# SQLite ne sait pas modifier une colonne en place : Alembic recrée alors la table.
EN_LOT = URL.startswith("sqlite")


def migrer_hors_ligne() -> None:
    context.configure(
        url=URL,
        target_metadata=METADATA,
        literal_binds=True,
        render_as_batch=EN_LOT,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def migrer_en_ligne() -> None:
    with moteur.connect() as connexion:
        context.configure(
            connection=connexion,
            target_metadata=METADATA,
            render_as_batch=EN_LOT,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    migrer_hors_ligne()
else:
    migrer_en_ligne()
