import pytest

from app.moteurs.recommandations import durees, recommander, sens_de_nage, tenue


@pytest.mark.parametrize(
    ("eau", "conseille", "maximum"),
    [
        (19, None, None),
        (16, 45, 60),
        (13, 25, 40),
        (11, 15, 25),
        (9, 10, 15),
        (6, 5, 10),
        (3, 1, 2),
    ],
)
def test_paliers_valides_sans_combinaison(eau: float, conseille: int | None, maximum: int | None) -> None:
    d = durees(eau)
    assert (d.conseille_min, d.maximum_min) == (conseille, maximum)


def test_combinaison_et_reprise() -> None:
    assert durees(11, combinaison=True).conseille_min == 30
    assert durees(11, reprise=True).conseille_min == 7
    assert durees(11, combinaison=True, reprise=True).maximum_min == 25
    assert "reprise" in durees(11, reprise=True).texte


def test_tenue_selon_l_eau_et_le_mode() -> None:
    froide = tenue(9, 8, "nage", combinaison=False)
    assert "Bonnet néoprène" in froide
    assert "Chaussons et gants néoprène" in froide
    assert "Bouée de nage (tu restes visible)" in froide
    assert any("Boisson chaude" in e for e in froide)

    douce = tenue(19, 24, "baignade", combinaison=False)
    assert douce[0] == "Short de bain"
    assert not any("néoprène" in e for e in douce)


@pytest.mark.parametrize(
    ("vers", "sens"),
    [
        (90, "vers l'ouest"),  # le courant porte vers l'est
        (270, "vers l'est"),
        (0, None),  # perpendiculaire à la côte
    ],
)
def test_partir_face_au_courant(vers: float, sens: str | None) -> None:
    assert sens_de_nage(1.2, vers).sens == sens


def test_courant_faible_ou_inconnu() -> None:
    assert sens_de_nage(0.1, 90).sens is None
    assert "inconnu" in sens_de_nage(None, None).texte


def test_reprise_apres_quatre_semaines_sans_sortie() -> None:
    assert not recommander(12, 12, 1, 90, "nage", False, jours_depuis_derniere_sortie=10).reprise
    reprise = recommander(12, 12, 1, 90, "nage", False, jours_depuis_derniere_sortie=60)
    assert reprise.reprise
    assert reprise.gestes  # rappel des gestes de sécurité
