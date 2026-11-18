"""Tables de la base, un fichier par espace.

Chaque modèle est importé ici pour qu'Alembic les voie tous en lisant
`SQLModel.metadata`.
"""

from app.models.marine import SortieMer, Spot
from app.models.objectifs import Objectif
from app.models.streetlifting import Bloc, Exercice, Seance, Serie
from app.models.utilisateur import Utilisateur
from app.models.vie_courante import Pesee

__all__ = ["Bloc", "Exercice", "Objectif", "Pesee", "Seance", "Serie", "SortieMer", "Spot", "Utilisateur"]
