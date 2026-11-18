import pytest

from app.moteurs.danger import Situation, evaluer, tempete


def niveau(**conditions: object) -> str:
    return evaluer(Situation(**conditions)).niveau  # type: ignore[arg-type]


def test_mer_calme_vert() -> None:
    evaluation = evaluer(Situation(vent_kmh=12, rafales_kmh=20, vagues_m=0.4, courant_kmh=0.5, eau_c=12))

    assert evaluation.niveau == "vert"
    assert evaluation.raisons == ()


@pytest.mark.parametrize(
    ("conditions", "attendu"),
    [
        ({"vent_kmh": 29.9}, "vert"),
        ({"vent_kmh": 30}, "rouge"),  # force 5
        ({"vent_kmh": 50}, "noir"),  # force 7
        ({"rafales_kmh": 60}, "rouge"),
        ({"rafales_kmh": 75}, "noir"),
        ({"vagues_m": 0.9}, "vert"),
        ({"vagues_m": 1.0}, "rouge"),
        ({"vagues_m": 2.0}, "noir"),
        ({"courant_kmh": 2.0}, "rouge"),
        ({"courant_kmh": 3.0}, "noir"),
        ({"eau_c": 8.0}, "vert"),  # l'eau froide joue sur les durées, pas sur le niveau
        ({"eau_c": 7.9}, "rouge"),
        ({"eau_c": 4.9}, "noir"),
        ({"code_meteo": 95}, "noir"),
        ({"code_meteo": 45}, "rouge"),
        ({"de_nuit": True}, "rouge"),
    ],
)
def test_seuils_valides(conditions: dict[str, object], attendu: str) -> None:
    assert niveau(**conditions) == attendu


def test_le_vent_de_terre_pousse_vers_le_large() -> None:
    # 20 km/h : sans danger venant de la mer, rouge venant du sud (de la terre).
    assert niveau(vent_kmh=20, vent_direction_deg=0) == "vert"
    assert niveau(vent_kmh=20, vent_direction_deg=190) == "rouge"
    assert niveau(vent_kmh=35, vent_direction_deg=200) == "noir"
    assert niveau(vent_kmh=20, vent_direction_deg=100) == "vert"  # hors du secteur de terre


def test_le_niveau_est_le_plus_grave_et_les_raisons_sont_triees() -> None:
    evaluation = evaluer(Situation(vent_kmh=32, vagues_m=2.3, eau_c=12))

    assert evaluation.niveau == "noir"
    assert [r.texte for r in evaluation.raisons] == ["Vagues de 2,3 m", "Vent moyen de 32 km/h"]


def test_easter_egg_force_10() -> None:
    assert not tempete(88)
    assert tempete(89)
    assert not tempete(None)
