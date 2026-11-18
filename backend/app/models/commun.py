"""Socle commun des tables personnelles."""

from sqlmodel import Field, SQLModel


class Personnel(SQLModel):
    """Toute donnée personnelle appartient à un utilisateur.

    La suppression de l'utilisateur (fin d'un bac à sable démo) efface ses
    données en cascade. Les routes ne lisent et n'écrivent que les lignes
    dont `utilisateur_id` est celui de la session.
    """

    utilisateur_id: int = Field(foreign_key="utilisateur.id", ondelete="CASCADE", index=True)
