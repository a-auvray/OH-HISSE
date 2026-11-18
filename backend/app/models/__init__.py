"""Tables de la base, un fichier par espace.

Chaque modèle est importé ici pour qu'Alembic les voie tous en lisant
`SQLModel.metadata`.
"""

from app.models.utilisateur import Utilisateur

__all__ = ["Utilisateur"]
