"""Table RPE et 1RM estimé, sur la charge totale (poids du corps + lest).

La table de Tuchscherer relie un nombre de répétitions et un RPE à un
pourcentage du 1RM. Elle ne dépend en fait que de l'**effort équivalent** :

    effort = répétitions + répétitions en réserve,   avec  réserve = 10 − RPE

5 reps à RPE 8 et 7 reps à RPE 10 valent toutes deux un effort de 7, soit 81,1 %.
"""

from dataclasses import dataclass
from math import floor

# % du 1RM pour un effort équivalent de 1 à 16 (ligne « RPE 10 » de la table, prolongée).
POURCENTAGES = (
    100.0,
    95.5,
    92.2,
    89.2,
    86.3,
    83.7,
    81.1,
    78.6,
    76.2,
    73.9,
    70.7,
    68.0,
    65.3,
    62.6,
    59.9,
    57.3,
)

RPE_MIN, RPE_MAX = 6.0, 10.0
REPS_MAX = 12


def pourcentage_1rm(reps: int, rpe: float) -> float | None:
    """Fraction du 1RM (0 à 1) que représente une série, ou None hors de la table.

    Les RPE en demi-points tombent entre deux lignes : on interpole.
    """
    if not (1 <= reps <= REPS_MAX) or not (RPE_MIN <= rpe <= RPE_MAX) or (rpe * 2) % 1:
        return None
    effort = reps + (10 - rpe)
    bas = floor(effort)
    if effort == bas:
        return POURCENTAGES[bas - 1] / 100
    return (POURCENTAGES[bas - 1] + POURCENTAGES[bas]) / 200


@dataclass(frozen=True)
class Serie:
    """Une série réalisée. `lest_kg` peut valoir 0 (poids du corps seul)."""

    reps: int
    lest_kg: float
    rpe: float | None
    echec: bool = False


def e1rm_total(serie: Serie, poids_du_corps_kg: float) -> float | None:
    """1RM estimé sur la charge totale, ou None si la série ne permet pas de l'estimer.

    - Sans RPE : pas d'estimation (décision du CDC : formule RPE seule).
    - En échec : les répétitions réussies comptent à RPE 10.
    """
    rpe = 10.0 if serie.echec else serie.rpe
    if rpe is None or serie.reps < 1:
        return None
    pourcentage = pourcentage_1rm(serie.reps, rpe)
    if pourcentage is None:
        return None
    return (poids_du_corps_kg + serie.lest_kg) / pourcentage


def meilleur_e1rm(series: list[Serie], poids_du_corps_kg: float) -> float | None:
    """1RM estimé d'une séance : le meilleur de ses séries."""
    estimations = [e for s in series if (e := e1rm_total(s, poids_du_corps_kg)) is not None]
    return max(estimations, default=None)


def en_lest(e1rm_total_kg: float, poids_du_corps_kg: float) -> float:
    """1RM affiché « en lest » : on retire le poids du corps."""
    return e1rm_total_kg - poids_du_corps_kg


def arrondir(kg: float, pas: float) -> float:
    """Arrondit au pas de lest disponible (1,25 kg par défaut)."""
    return round(round(kg / pas) * pas, 2)
