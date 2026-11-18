"""Marées : pleines et basses mers, hauteur au zéro hydrographique, coefficient.

La source est la hauteur d'eau d'Open-Meteo au pas de 15 min, validée en
phase 0 contre l'annuaire SHOM de Ouistreham (±0,22 m, ±36 min en moyenne).
"""

import itertools
import tomllib
from dataclasses import dataclass
from datetime import datetime, timedelta
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

FICHIER_REGLES = Path(__file__).parent / "regles" / "marine.toml"


@dataclass(frozen=True)
class ReglesMaree:
    decalage_zh_m: float
    unite_hauteur_brest_m: float
    decalage_brest: timedelta
    demi_fenetre_pas: int


@lru_cache
def regles_marine() -> dict[str, dict[str, Any]]:
    with FICHIER_REGLES.open("rb") as f:
        return tomllib.load(f)


def regles_maree() -> ReglesMaree:
    brut = regles_marine()["maree"]
    return ReglesMaree(
        decalage_zh_m=float(brut["decalage_zh_m"]),
        unite_hauteur_brest_m=float(brut["unite_hauteur_brest_m"]),
        decalage_brest=timedelta(hours=float(brut["decalage_brest_h"])),
        demi_fenetre_pas=int(brut["demi_fenetre_pas"]),
    )


Serie = list[tuple[datetime, float]]


@dataclass(frozen=True)
class Extremum:
    type: Literal["PM", "BM"]
    instant: datetime
    hauteur_m: float
    coefficient: int | None = None


def extrema(serie: Serie, demi_fenetre: int = 8) -> list[Extremum]:
    """Pleines et basses mers : extremum local sur ± `demi_fenetre` pas.

    En baie de Seine, la pleine mer « tient » longtemps (tenue du plein) : sur
    un plateau, on garde son milieu, puis on impose l'alternance PM / BM en
    gardant le plus marqué de deux extrema consécutifs de même type.
    """
    bruts: list[Extremum] = []
    i = demi_fenetre
    while i < len(serie) - demi_fenetre:
        fenetre = [h for _, h in serie[i - demi_fenetre : i + demi_fenetre + 1]]
        h = serie[i][1]
        type_: Literal["PM", "BM"] | None = "PM" if h == max(fenetre) else "BM" if h == min(fenetre) else None
        if type_ is not None:
            fin_plateau = i
            while fin_plateau + 1 < len(serie) and serie[fin_plateau + 1][1] == h:
                fin_plateau += 1
            bruts.append(Extremum(type_, serie[(i + fin_plateau) // 2][0], h))
            i = fin_plateau
        i += 1

    alternes: list[Extremum] = []
    for e in bruts:
        if alternes and alternes[-1].type == e.type:
            precedent = alternes[-1]
            plus_marque = (
                e.hauteur_m > precedent.hauteur_m if e.type == "PM" else e.hauteur_m < precedent.hauteur_m
            )
            if plus_marque:
                alternes[-1] = e
            continue
        alternes.append(e)
    return alternes


def coefficients_brest(extrema_brest: list[Extremum], unite_m: float) -> list[tuple[datetime, int]]:
    """Coefficient de chaque PM de Brest : marnage depuis la BM précédente / unité de hauteur."""
    return [
        (pm.instant, round((pm.hauteur_m - bm.hauteur_m) / unite_m * 100))
        for bm, pm in itertools.pairwise(extrema_brest)
        if bm.type == "BM" and pm.type == "PM"
    ]


def marees_locales(
    serie_zone: Serie, serie_brest: Serie, regles: ReglesMaree | None = None
) -> list[Extremum]:
    """PM et BM de la zone, au-dessus du zéro hydrographique, avec le coefficient des PM."""
    regles = regles or regles_maree()
    locales = extrema(serie_zone, regles.demi_fenetre_pas)
    coefs = coefficients_brest(extrema(serie_brest, regles.demi_fenetre_pas), regles.unite_hauteur_brest_m)
    resultat = []
    for e in locales:
        coefficient = None
        if e.type == "PM" and coefs:
            cible = e.instant + regles.decalage_brest
            ecart, valeur = min((abs((t - cible).total_seconds()), c) for t, c in coefs)
            if ecart < 3 * 3600:
                coefficient = valeur
        resultat.append(
            Extremum(e.type, e.instant, round(e.hauteur_m + regles.decalage_zh_m, 2), coefficient)
        )
    return resultat


def hauteur_a(serie: Serie, instant: datetime, decalage_zh_m: float) -> float | None:
    """Hauteur d'eau au-dessus du ZH à un instant, par interpolation linéaire."""
    for (t1, h1), (t2, h2) in itertools.pairwise(serie):
        if t1 <= instant <= t2:
            part = (instant - t1) / (t2 - t1) if t2 > t1 else 0
            return round(h1 + (h2 - h1) * part + decalage_zh_m, 2)
    return None


def tendance(serie: Serie, instant: datetime) -> Literal["montante", "descendante", "etale"] | None:
    """La mer monte-t-elle ? Comparaison sur ± 30 min."""
    avant = hauteur_a(serie, instant - timedelta(minutes=30), 0)
    apres = hauteur_a(serie, instant + timedelta(minutes=30), 0)
    if avant is None or apres is None:
        return None
    if abs(apres - avant) < 0.03:
        return "etale"
    return "montante" if apres > avant else "descendante"
