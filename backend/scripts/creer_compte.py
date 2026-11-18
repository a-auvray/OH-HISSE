"""Crée (ou met à jour) un compte personnel.

L'inscription n'est pas ouverte en V1 : c'est la seule façon de créer un compte.

    uv run python scripts/creer_compte.py
"""

import getpass
import sys

from sqlmodel import Session, select

from app.core.base_de_donnees import moteur
from app.core.securite import LONGUEUR_MAX_MDP_OCTETS, hacher_mot_de_passe
from app.models import Utilisateur

LONGUEUR_MIN_MDP = 12


def demander_mot_de_passe() -> str:
    while True:
        mdp = getpass.getpass("Mot de passe : ")
        if len(mdp) < LONGUEUR_MIN_MDP:
            print(f"Au moins {LONGUEUR_MIN_MDP} caractères.")
        elif len(mdp.encode()) > LONGUEUR_MAX_MDP_OCTETS:
            print(f"Au plus {LONGUEUR_MAX_MDP_OCTETS} octets.")
        elif getpass.getpass("Confirmation : ") != mdp:
            print("Les deux saisies diffèrent.")
        else:
            return mdp


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[union-attr]
    email = input("Email : ").strip().lower()
    if "@" not in email:
        sys.exit("Email invalide.")

    with Session(moteur) as session:
        compte = session.exec(select(Utilisateur).where(Utilisateur.email == email)).first()
        if compte and compte.est_demo:
            sys.exit("Cet email appartient à un bac à sable démo.")
        if compte:
            print(f"Le compte existe déjà ({compte.nom_affiche}) : seul le mot de passe sera changé.")
        else:
            compte = Utilisateur(email=email, nom_affiche=input("Nom affiché : ").strip() or "Moi")
        compte.mdp_hash = hacher_mot_de_passe(demander_mot_de_passe())
        session.add(compte)
        session.commit()
    print("Compte enregistré.")


if __name__ == "__main__":
    main()
