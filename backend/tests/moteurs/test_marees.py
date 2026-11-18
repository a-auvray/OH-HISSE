import json
import math
from datetime import datetime, timedelta
from pathlib import Path

import pytest

from app.moteurs.marees import (
    Serie,
    extrema,
    hauteur_a,
    marees_locales,
    regles_maree,
    tendance,
)

DONNEES = json.loads((Path(__file__).parents[1] / "donnees" / "marees_2026-11-18.json").read_text())


def serie_de(cle: str) -> Serie:
    brut = DONNEES[cle]
    return [
        (datetime.fromisoformat(t), h)
        for t, h in zip(brut["time"], brut["sea_level_height_msl"], strict=True)
        if h is not None
    ]


# Annuaire SHOM de Ouistreham (maree.info/25), relevé en phase 0.
SHOM = [
    ("2026-11-20T06:40", "PM", 6.60, 46),
    ("2026-11-20T13:25", "BM", 2.88, None),
    ("2026-11-20T19:00", "PM", 6.70, 51),
    ("2026-11-21T01:51", "BM", 2.49, None),
    ("2026-11-21T07:32", "PM", 6.93, 57),
    ("2026-11-21T14:27", "BM", 2.43, None),
    ("2026-11-21T19:51", "PM", 7.03, 64),
]


def sinusoide(debut: datetime, heures: int, amplitude: float, periode_h: float = 12.42) -> Serie:
    return [
        (debut + timedelta(minutes=15 * i), amplitude * math.cos(2 * math.pi * (i / 4) / periode_h))
        for i in range(heures * 4)
    ]


def test_une_maree_semi_diurne_alterne_pm_et_bm() -> None:
    serie = sinusoide(datetime(2026, 11, 18), 48, amplitude=2.0)

    types = [e.type for e in extrema(serie)]

    assert types == ["BM", "PM", "BM", "PM", "BM", "PM", "BM"][: len(types)]
    assert len(types) >= 6


def test_sur_un_plateau_on_garde_le_milieu() -> None:
    debut = datetime(2026, 11, 18)
    hauteurs = [0.0] * 10 + [1.0] * 9 + [0.0] * 10  # tenue du plein de 2 h
    serie = [(debut + timedelta(minutes=15 * i), h) for i, h in enumerate(hauteurs)]

    pm = [e for e in extrema(serie, demi_fenetre=4) if e.type == "PM"]

    assert len(pm) == 1
    assert pm[0].instant == debut + timedelta(minutes=15 * 14)  # milieu du plateau


def test_les_marees_reelles_collent_a_l_annuaire_shom() -> None:
    marees = marees_locales(serie_de("zone"), serie_de("brest"))

    for instant, type_, hauteur, coefficient in SHOM:
        reference = datetime.fromisoformat(instant)
        proche = min(
            (m for m in marees if m.type == type_),
            key=lambda m: abs((m.instant - reference).total_seconds()),
        )
        assert abs((proche.instant - reference).total_seconds()) <= 30 * 60, instant
        # Écarts mesurés en phase 0 sur ces dates : jusqu'à 0,29 m.
        assert proche.hauteur_m == pytest.approx(hauteur, abs=0.30), instant
        if coefficient is not None:
            assert proche.coefficient is not None
            assert abs(proche.coefficient - coefficient) <= 3, instant


def test_hauteur_interpolee_et_ramenee_au_zero_hydrographique() -> None:
    debut = datetime(2026, 11, 18)
    serie = [(debut, 0.0), (debut + timedelta(minutes=15), 1.0)]

    assert hauteur_a(serie, debut + timedelta(minutes=6), 4.9) == pytest.approx(5.3)
    assert hauteur_a(serie, debut + timedelta(hours=2), 4.9) is None


def test_tendance_de_la_maree() -> None:
    serie = sinusoide(datetime(2026, 11, 18), 24, amplitude=2.0)

    assert tendance(serie, datetime(2026, 11, 18, 3)) == "descendante"  # après la PM de minuit
    assert tendance(serie, datetime(2026, 11, 18, 9)) == "montante"


def test_les_regles_viennent_de_la_configuration() -> None:
    regles = regles_maree()
    assert regles.decalage_zh_m == 4.9
    assert regles.decalage_brest == timedelta(hours=6)
