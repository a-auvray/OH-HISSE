from datetime import date

from app.moteurs.poids import Pesee, poids_a_la_date

LUNDIS = [Pesee(date(2026, 11, 2), 75.0), Pesee(date(2026, 11, 9), 76.0), Pesee(date(2026, 11, 16), 74.5)]


def test_moyenne_mobile_sur_trois_semaines() -> None:
    poids = poids_a_la_date(LUNDIS, date(2026, 11, 18))

    assert poids is not None
    assert poids.kg == 75.17
    assert poids.a_jour
    assert poids.derniere_pesee == date(2026, 11, 16)


def test_une_pesee_future_est_ignoree() -> None:
    poids = poids_a_la_date(LUNDIS, date(2026, 11, 10))

    assert poids is not None
    assert poids.kg == 75.5


def test_sans_pesee_recente_on_reprend_la_derniere_non_a_jour() -> None:
    poids = poids_a_la_date(LUNDIS, date(2026, 12, 31))

    assert poids is not None
    assert poids.kg == 74.5
    assert not poids.a_jour


def test_aucune_pesee() -> None:
    assert poids_a_la_date([], date(2026, 11, 18)) is None
    assert poids_a_la_date(LUNDIS, date(2026, 10, 1)) is None
