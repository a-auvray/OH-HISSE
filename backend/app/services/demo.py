"""Bacs à sable du mode démo.

Chaque visiteur reçoit son propre utilisateur démo, avec une copie des données
fictives : il peut tout modifier sans gêner personne, et le bac à sable est
effacé (données comprises, par cascade) au bout de 24 h ou quand il quitte la démo.
"""

import secrets
from datetime import timedelta

from sqlmodel import Session, col, delete

from app.core.base_de_donnees import maintenant
from app.models import Utilisateur
from app.services import donnees_demo, vie_courante

DUREE_BAC_A_SABLE = timedelta(hours=24)


def creer_bac_a_sable(session: Session) -> Utilisateur:
    purger_bacs_a_sable_expires(session)
    utilisateur = Utilisateur(
        email=f"demo-{secrets.token_hex(8)}@demo.oh-hisse.invalid",
        nom_affiche="Visiteur",
        est_demo=True,
        expire_le=maintenant() + DUREE_BAC_A_SABLE,
    )
    session.add(utilisateur)
    session.flush()
    peupler(session, utilisateur)
    session.commit()
    session.refresh(utilisateur)
    return utilisateur


def peupler(session: Session, utilisateur: Utilisateur) -> None:
    """Copie les données fictives dans le bac à sable, datées par rapport à aujourd'hui."""
    donnees_demo.peupler(session, utilisateur, vie_courante.maintenant().date())


def purger_bacs_a_sable_expires(session: Session) -> int:
    """Supprime les bacs à sable expirés ; renvoie leur nombre."""
    requete = delete(Utilisateur).where(
        col(Utilisateur.est_demo).is_(True), col(Utilisateur.expire_le) < maintenant()
    )
    resultat = session.exec(requete)
    session.commit()
    return resultat.rowcount
