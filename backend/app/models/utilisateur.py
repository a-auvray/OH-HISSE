"""Table des utilisateurs : mon compte, et les bacs à sable du mode démo."""

from datetime import datetime

from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel

from app.core.base_de_donnees import maintenant


class Utilisateur(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True, max_length=255)
    nom_affiche: str = Field(max_length=80)
    # Absent pour un compte démo : on y entre sans mot de passe.
    mdp_hash: str | None = Field(default=None, max_length=255)
    est_demo: bool = Field(default=False, index=True)
    cree_le: datetime = Field(default_factory=maintenant, sa_type=DateTime(timezone=True))
    # Un bac à sable démo est effacé (avec toutes ses données) après cette date.
    expire_le: datetime | None = Field(default=None, sa_type=DateTime(timezone=True), index=True)
