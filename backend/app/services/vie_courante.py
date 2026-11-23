"""Vie courante : de la base vers les moteurs (récupération, cheat meal, sommeil)."""

import datetime as dt
from dataclasses import dataclass
from zoneinfo import ZoneInfo

from sqlmodel import Session, col, select

from app.models import CheatMeal, Nuit, SortieMer, Utilisateur
from app.moteurs import cheat_meal, recuperation, sommeil
from app.moteurs.recuperation import NuitResumee, SeanceResumee, SerieResumee, SortieResumee
from app.services import streetlifting

PARIS = ZoneInfo("Europe/Paris")
# Assez d'historique pour la plus longue récupération (96 h + allongements).
JOURS_D_HISTORIQUE = 7


def maintenant() -> dt.datetime:
    return dt.datetime.now(PARIS)


def aujourdhui() -> dt.date:
    """Le jour, à Paris : le serveur peut être en UTC, le jour ne change pas à la même heure."""
    return maintenant().date()


@dataclass(frozen=True)
class Donnees:
    seances: list[SeanceResumee]
    sorties: list[SortieResumee]
    nuits: list[NuitResumee]
    dernier_cheat_meal: dt.date | None


def donnees(session: Session, utilisateur: Utilisateur, instant: dt.datetime) -> Donnees:
    depuis = instant.date() - dt.timedelta(days=JOURS_D_HISTORIQUE)
    seances = [
        SeanceResumee(s.date, tuple(SerieResumee(x.reps, x.rpe, x.echec) for x in s.series), s.ressenti)
        for s in streetlifting.seances(session, utilisateur, debut=depuis, fin=instant.date())
    ]
    sorties = [
        SortieResumee(s.debut, s.duree_min, s.type, s.eau_c)  # type: ignore[arg-type]
        for s in session.exec(
            select(SortieMer).where(
                SortieMer.utilisateur_id == utilisateur.id,
                SortieMer.debut >= dt.datetime.combine(depuis, dt.time(), PARIS),
            )
        ).all()
    ]
    nuits = [
        NuitResumee(n.date, n.heures)
        for n in session.exec(
            select(Nuit).where(Nuit.utilisateur_id == utilisateur.id, Nuit.date >= depuis)
        ).all()
    ]
    dernier = session.exec(
        select(CheatMeal)
        .where(CheatMeal.utilisateur_id == utilisateur.id, CheatMeal.date <= instant.date())
        .order_by(col(CheatMeal.date).desc())
    ).first()
    return Donnees(seances, sorties, nuits, dernier.date if dernier else None)


def etat_recuperation(d: Donnees, instant: dt.datetime) -> recuperation.EtatRecuperation:
    return recuperation.etat(d.seances, d.sorties, d.nuits, instant)


def verdict_cheat_meal(d: Donnees, instant: dt.datetime) -> cheat_meal.VerdictCheatMeal:
    return cheat_meal.verdict(d.seances, d.sorties, d.dernier_cheat_meal, instant)


def tendance_sommeil(d: Donnees, instant: dt.datetime) -> sommeil.Tendance:
    return sommeil.tendance(d.nuits, instant.date())
