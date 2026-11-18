"""Mots de passe, jetons de session et limitation des tentatives."""

import time
from collections import defaultdict, deque
from datetime import datetime, timedelta
from threading import Lock

import bcrypt
import jwt

from app.core.base_de_donnees import maintenant
from app.core.config import parametres

ALGORITHME = "HS256"
NOM_COOKIE = "oh_hisse_session"
# bcrypt ne lit que les 72 premiers octets : au-delà, on refuse plutôt que de tronquer en silence.
LONGUEUR_MAX_MDP_OCTETS = 72


# --- Mots de passe -------------------------------------------------------------


def hacher_mot_de_passe(mot_de_passe: str) -> str:
    octets = mot_de_passe.encode()
    if len(octets) > LONGUEUR_MAX_MDP_OCTETS:
        raise ValueError(f"Mot de passe trop long (maximum {LONGUEUR_MAX_MDP_OCTETS} octets).")
    return bcrypt.hashpw(octets, bcrypt.gensalt()).decode()


# Hash factice : vérifié quand l'email est inconnu, pour que la réponse prenne
# le même temps qu'avec un vrai compte (sinon le délai trahirait les emails existants).
_HASH_FACTICE = bcrypt.hashpw(b"oh-hisse-factice", bcrypt.gensalt()).decode()


def verifier_mot_de_passe(mot_de_passe: str, mdp_hash: str | None) -> bool:
    octets = mot_de_passe.encode()
    if len(octets) > LONGUEUR_MAX_MDP_OCTETS:
        octets = octets[:LONGUEUR_MAX_MDP_OCTETS]  # comparaison à coût constant, toujours fausse ensuite
        mdp_hash = None
    valide = bcrypt.checkpw(octets, (mdp_hash or _HASH_FACTICE).encode())
    return valide and mdp_hash is not None


# --- Jetons de session ---------------------------------------------------------


def creer_jeton(utilisateur_id: int, expire_le: datetime | None = None) -> tuple[str, datetime]:
    """Jeton signé et sa date d'expiration (celle du bac à sable si elle est plus proche)."""
    config = parametres()
    expiration = maintenant() + timedelta(minutes=config.duree_jeton_minutes)
    if expire_le is not None:
        expiration = min(expiration, expire_le)
    contenu = {"sub": str(utilisateur_id), "iat": maintenant(), "exp": expiration}
    return jwt.encode(contenu, config.cle_secrete, algorithm=ALGORITHME), expiration


def lire_jeton(jeton: str) -> int | None:
    """Identifiant de l'utilisateur, ou None si le jeton est absent, falsifié ou expiré."""
    try:
        contenu = jwt.decode(
            jeton, parametres().cle_secrete, algorithms=[ALGORITHME], options={"require": ["sub", "exp"]}
        )
        return int(contenu["sub"])
    except jwt.InvalidTokenError, ValueError:
        return None


# --- Limitation des tentatives -------------------------------------------------


class LimiteurTentatives:
    """Fenêtre glissante en mémoire : au plus `maximum` essais par clé sur `fenetre_s`.

    Suffisant pour une instance unique ; à remplacer par Redis si l'API passe
    un jour sur plusieurs serveurs.
    """

    def __init__(self, maximum: int, fenetre_s: float) -> None:
        self.maximum = maximum
        self.fenetre_s = fenetre_s
        self._essais: defaultdict[str, deque[float]] = defaultdict(deque)
        self._verrou = Lock()

    def autoriser(self, cle: str) -> bool:
        instant = time.monotonic()
        with self._verrou:
            essais = self._essais[cle]
            while essais and instant - essais[0] > self.fenetre_s:
                essais.popleft()
            if len(essais) >= self.maximum:
                return False
            essais.append(instant)
            return True

    def reinitialiser(self) -> None:
        with self._verrou:
            self._essais.clear()
