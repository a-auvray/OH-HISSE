import pytest

from app.moteurs.rpe import Serie, arrondir, e1rm_total, en_lest, meilleur_e1rm, pourcentage_1rm


@pytest.mark.parametrize(
    ("reps", "rpe", "attendu"),
    [
        (1, 10, 1.0),
        (5, 8, 0.811),  # effort équivalent 7
        (7, 10, 0.811),  # même effort, même pourcentage
        (1, 9.5, 0.9775),  # demi-point : entre 100 % et 95,5 %
        (3, 8, 0.863),
        (12, 6, 0.573),  # coin de la table : effort 16
    ],
)
def test_pourcentages_de_la_table(reps: int, rpe: float, attendu: float) -> None:
    assert pourcentage_1rm(reps, rpe) == pytest.approx(attendu)


@pytest.mark.parametrize(("reps", "rpe"), [(0, 8), (13, 8), (5, 5.5), (5, 10.5), (5, 8.3)])
def test_hors_table(reps: int, rpe: float) -> None:
    assert pourcentage_1rm(reps, rpe) is None


def test_exemple_du_cahier_des_charges() -> None:
    # 75 kg, 5 reps à +20 kg, RPE 8 → 95 / 0,811 = 117,1 kg → ≈ 42 kg en lest
    total = e1rm_total(Serie(reps=5, lest_kg=20, rpe=8), poids_du_corps_kg=75)

    assert total == pytest.approx(117.14, abs=0.01)
    assert total is not None
    assert en_lest(total, 75) == pytest.approx(42.14, abs=0.01)


def test_le_lest_seul_sous_estimerait_fortement() -> None:
    # Pourquoi le CDC impose poids du corps + lest : 20 / 0,811 ≈ 24,7 kg, loin de 42 kg.
    total = e1rm_total(Serie(reps=5, lest_kg=20, rpe=8), poids_du_corps_kg=75)
    assert total is not None
    assert en_lest(total, 75) > 20 / 0.811 + 15


def test_sans_rpe_pas_d_estimation() -> None:
    assert e1rm_total(Serie(reps=5, lest_kg=20, rpe=None), 75) is None


def test_un_echec_compte_les_reps_reussies_a_rpe_10() -> None:
    echec = e1rm_total(Serie(reps=3, lest_kg=30, rpe=None, echec=True), 75)
    assert echec == pytest.approx(105 / 0.922)


def test_le_poids_du_corps_seul_compte_aussi() -> None:
    assert e1rm_total(Serie(reps=10, lest_kg=0, rpe=10), 75) == pytest.approx(75 / 0.739)


def test_le_1rm_d_une_seance_est_sa_meilleure_serie() -> None:
    # À charge égale, la série la plus facile (RPE 7) révèle le plus gros 1RM.
    series = [Serie(5, 20, 7), Serie(5, 20, 8), Serie(5, 20, None)]
    assert meilleur_e1rm(series, 75) == pytest.approx(95 / 0.786)
    assert meilleur_e1rm([Serie(5, 20, None)], 75) is None


@pytest.mark.parametrize(("kg", "attendu"), [(21.9, 22.5), (21.8, 21.25), (0.4, 0.0), (-0.7, -1.25)])
def test_arrondi_au_pas_de_lest(kg: float, attendu: float) -> None:
    assert arrondir(kg, 1.25) == attendu
