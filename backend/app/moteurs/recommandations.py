"""Recommandations de sortie : temps dans l'eau, tenue, sens de nage, rappels (note 04).

Fonctions pures ; les valeurs viennent de `regles/marine.toml`. Les durées
s'appuient sur le seuil de choc thermique de 15 °C (RNLI) et la règle 1-10-1
(Giesbrecht) : ce sont des repères prudents, pas une garantie.
"""

import math
from dataclasses import dataclass, field
from typing import Any, Literal

from app.moteurs.marees import regles_marine

Mode = Literal["baignade", "nage", "plongee"]


@dataclass(frozen=True)
class Durees:
    conseille_min: int | None  # None : pas de limite liée au froid
    maximum_min: int | None
    texte: str


def durees(
    eau_c: float, combinaison: bool = False, reprise: bool = False, regles: dict[str, Any] | None = None
) -> Durees:
    r = regles or regles_marine()["eau_froide"]
    palier = next(p for p in r["paliers"] if eau_c >= p[0])
    conseille, maximum = float(palier[1]), float(palier[2])
    if conseille == 0:
        return Durees(None, None, f"Eau à {eau_c:.0f} °C : pas de limite liée au froid.")
    facteur = 1.0
    precisions = []
    if combinaison:
        facteur *= float(r["facteur_combinaison"])
        precisions.append("avec combinaison")
    if reprise:
        facteur *= float(r["facteur_reprise"])
        precisions.append("reprise après une pause : durées divisées par deux")
    conseille_min = max(1, math.floor(conseille * facteur))
    maximum_min = max(conseille_min, math.floor(maximum * facteur))
    suite = f" ({', '.join(precisions)})" if precisions else ""
    return Durees(
        conseille_min,
        maximum_min,
        f"Eau à {eau_c:.0f} °C : {conseille_min} min conseillées, {maximum_min} min au plus{suite}.",
    )


def tenue(eau_c: float, air_c: float | None, mode: Mode, combinaison: bool) -> list[str]:
    """Ce qu'on emporte, avant et après."""
    elements: list[str] = []
    if mode == "plongee" or combinaison:
        elements.append("Combinaison néoprène" + (" épaisse (5 mm ou plus)" if eau_c < 12 else ""))
    elif eau_c < 15:
        elements.append("Short de bain : l'eau est sous 15 °C, entre lentement")
    else:
        elements.append("Short de bain")
    if eau_c < 12:
        elements.append("Bonnet néoprène")
    if eau_c < 10:
        elements.append("Chaussons et gants néoprène")
    if mode == "nage":
        elements += ["Bonnet de couleur vive", "Bouée de nage (tu restes visible)"]
    if mode == "plongee":
        elements += ["Masque, tuba, palmes", "Bouée de signalisation"]
    if eau_c < 15 or (air_c is not None and air_c < 15):
        elements += [
            "Après : vêtements chauds faciles à enfiler, bonnet",
            "Boisson chaude dans un thermos",
            "Un en-cas sucré",
        ]
    else:
        elements.append("Après : serviette et de quoi boire")
    return elements


Sens = Literal["vers l'ouest", "vers l'est"]


@dataclass(frozen=True)
class SensDeNage:
    sens: Sens | None  # par où commencer ; None : indifférent
    texte: str


def sens_de_nage(
    courant_kmh: float | None, courant_vers_deg: float | None, regles: dict[str, Any] | None = None
) -> SensDeNage:
    """Commencer face au courant longeant la côte, pour rentrer porté par lui."""
    r = regles or regles_marine()["cote"]
    if courant_kmh is None or courant_vers_deg is None:
        return SensDeNage(None, "Courant inconnu : reste près du bord et repère un point fixe.")
    long_cote = courant_kmh * math.cos(math.radians(courant_vers_deg - float(r["axe_est_deg"])))
    if abs(long_cote) < float(r["courant_faible_kmh"]):
        return SensDeNage(None, "Courant faible le long de la côte : le sens importe peu.")
    if long_cote > 0:
        return SensDeNage(
            "vers l'ouest", "Le courant porte vers l'est : pars vers l'ouest (Hermanville) et reviens porté."
        )
    return SensDeNage(
        "vers l'est", "Le courant porte vers l'ouest : pars vers l'est (Ouistreham) et reviens porté."
    )


GESTES_DE_SECURITE = [
    "Entre dans l'eau lentement et attends que ta respiration se calme avant de nager.",
    "Si le souffle s'emballe : mets-toi sur le dos, flotte, et attends que ça passe (environ 90 s).",
    "Préviens quelqu'un de ton heure de retour ; ne nage pas seul par mer froide.",
    "Reste parallèle au bord et à portée de pied ou de retour facile.",
    "Sors dès que tes doigts ne t'obéissent plus : c'est le signe que les muscles se refroidissent.",
]


@dataclass(frozen=True)
class Recommandations:
    durees: Durees
    tenue: list[str]
    sens: SensDeNage
    reprise: bool
    gestes: list[str] = field(default_factory=list)


def recommander(
    eau_c: float,
    air_c: float | None,
    courant_kmh: float | None,
    courant_vers_deg: float | None,
    mode: Mode,
    combinaison: bool,
    jours_depuis_derniere_sortie: int | None,
) -> Recommandations:
    seuil = int(regles_marine()["eau_froide"]["jours_avant_reprise"])
    reprise = jours_depuis_derniere_sortie is None or jours_depuis_derniere_sortie > seuil
    return Recommandations(
        durees=durees(eau_c, combinaison, reprise),
        tenue=tenue(eau_c, air_c, mode, combinaison),
        sens=sens_de_nage(courant_kmh, courant_vers_deg),
        reprise=reprise,
        gestes=GESTES_DE_SECURITE if (reprise or eau_c < 15) else [],
    )
