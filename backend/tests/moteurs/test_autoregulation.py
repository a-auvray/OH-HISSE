from datetime import date, timedelta

import pytest

from app.moteurs.autoregulation import (
    ExercicePrevu,
    Forme,
    Performance,
    charger_regles,
    index_prochaine_seance,
    proposer,
)
from app.moteurs.rpe import Serie

PDC = 75.0
TRACTION_5X5 = ExercicePrevu("traction", series_min=3, series_max=5, reps=5)  # RPE cible par défaut : 8


def seance(rpe: float | None, lest: float = 20.0, echec: bool = False, il_y_a: int = 3) -> Performance:
    return Performance(
        date=date(2026, 11, 18) - timedelta(days=il_y_a),
        series=tuple(Serie(5, lest, rpe, echec) for _ in range(5)),
        poids_du_corps_kg=PDC,
    )


def test_la_cible_par_defaut_vient_de_la_configuration() -> None:
    regles = charger_regles()
    assert regles.rpe_par_defaut("force", 1) == 9.0
    assert regles.rpe_par_defaut("force", 5) == 8.0
    assert regles.rpe_par_defaut("volume", 10) == 7.0
    assert regles.rpe_par_defaut("specifique", 3) == regles.rpe_par_defaut("force", 3)
    assert regles.pas_de_lest_kg == 1.25


def test_seance_trop_facile_la_charge_monte() -> None:
    proposition = proposer(TRACTION_5X5, "force", [seance(rpe=7)], PDC)

    # 1RM : 95 / 78,6 % = 120,9 kg ; cible 5 @ RPE 8 : 81,1 % → 98 kg → +23 kg → arrondi 22,5
    assert proposition.lest_kg == 22.5
    assert proposition.series == 5  # facile : haut de la plage
    assert proposition.rpe_cible == 8.0
    assert proposition.justifications[0] == "+2,5 kg : RPE 7 la dernière fois"


def test_seance_trop_dure_la_charge_baisse() -> None:
    proposition = proposer(TRACTION_5X5, "force", [seance(rpe=9.5)], PDC)

    assert proposition.lest_kg == 16.25
    assert proposition.series == 3  # dur : bas de la plage
    assert proposition.justifications[0] == "−3,75 kg : RPE 9,5 la dernière fois"


def test_seance_dans_la_cible_charge_maintenue() -> None:
    proposition = proposer(TRACTION_5X5, "force", [seance(rpe=8)], PDC)

    assert proposition.lest_kg == 20.0
    assert proposition.series == 4
    assert proposition.justifications[0].startswith("Charge maintenue")


def test_la_hausse_est_bornee_a_5_pourcent() -> None:
    proposition = proposer(TRACTION_5X5, "force", [seance(rpe=6)], PDC)

    assert proposition.lest_kg == 25.0  # 95 × 1,05 = 99,75 → 24,75 → arrondi 25
    assert any("±5 %" in j for j in proposition.justifications)


def test_deux_echecs_de_suite_declenchent_un_deload_localise() -> None:
    historique = [seance(None, echec=True, il_y_a=6), seance(None, echec=True, il_y_a=3)]

    proposition = proposer(TRACTION_5X5, "force", historique, PDC)

    assert proposition.lest_kg == 10.0  # 95 × 0,9 = 85,5 → 10,5 → arrondi 10
    assert proposition.series == 3
    assert any("Deload localisé" in j for j in proposition.justifications)


def test_un_seul_echec_ne_declenche_pas_de_deload() -> None:
    historique = [seance(rpe=8, il_y_a=6), seance(None, echec=True, il_y_a=3)]

    proposition = proposer(TRACTION_5X5, "force", historique, PDC)

    assert not any("Deload" in j for j in proposition.justifications)


def test_sans_historique_l_utilisateur_choisit_la_charge() -> None:
    proposition = proposer(TRACTION_5X5, "force", [], PDC)

    assert proposition.lest_kg is None
    assert proposition.series == 3


def test_sans_rpe_on_remonte_a_la_derniere_seance_estimable() -> None:
    historique = [seance(rpe=8, il_y_a=6), seance(rpe=None, il_y_a=3)]

    assert proposer(TRACTION_5X5, "force", historique, PDC).lest_kg == 20.0


def test_le_poids_du_corps_du_jour_change_le_lest() -> None:
    # Même force, 2 kg de plus sur la balance : il faut 2 kg de lest en moins (arrondi au pas).
    assert proposer(TRACTION_5X5, "force", [seance(rpe=8)], PDC + 2).lest_kg == 17.5


def test_jamais_de_lest_negatif() -> None:
    volume = ExercicePrevu("dips", 3, 4, reps=12, rpe_cible=6)
    proposition = proposer(volume, "volume", [seance(rpe=10, lest=0)], PDC)

    assert proposition.lest_kg == 0.0


def test_bloc_deload_un_tiers_de_series_en_moins() -> None:
    proposition = proposer(TRACTION_5X5, "deload", [seance(rpe=5.5 + 0.5)], PDC)

    assert proposition.rpe_cible == 6.0
    assert proposition.series == 3


@pytest.mark.parametrize(("sommeil", "rpe_attendu"), [(8, 9.0), (5, 8.0), (3, 8.0)])
def test_le_sommeil_module_la_cible(sommeil: float, rpe_attendu: float) -> None:
    single = ExercicePrevu("muscle-up", 3, 3, reps=1)  # cible par défaut 9 en force

    assert proposer(single, "force", [], PDC, Forme(sommeil_h=sommeil)).rpe_cible == rpe_attendu


def test_nuit_tres_courte_pas_de_tentative_de_max() -> None:
    single = ExercicePrevu("muscle-up", 3, 3, reps=1)
    proposition = proposer(single, "force", [], PDC, Forme(sommeil_h=2))

    assert proposition.rpe_cible == 8.0
    assert any("pas de tentative de max" in j for j in proposition.justifications)


@pytest.mark.parametrize(
    ("realisees", "attendu"),
    [(0, 0), (1, 1), (2, 2), (3, 0), (7, 1), (9, None)],
)
def test_la_suite_du_bloc_avance_a_chaque_seance(realisees: int, attendu: int | None) -> None:
    assert index_prochaine_seance(realisees, nb_modeles=3, cycles=3) == attendu


def test_un_autre_format_ne_bride_pas_la_charge() -> None:
    # Triples lourds à +30 kg, RPE 7,5 : 1RM ≈ 123,5 kg. Une série de 8 à RPE 7 vaut 70,7 %,
    # soit ≈ 87,3 kg : +12,5 kg. Le ±5 % des triples (≈ 105 kg) ne doit pas s'appliquer.
    triples = Performance(date(2026, 11, 12), tuple(Serie(3, 30, 7.5) for _ in range(4)), PDC)
    huit = ExercicePrevu("traction", 3, 3, reps=8, rpe_cible=7)

    proposition = proposer(huit, "force", [triples], PDC)

    assert proposition.lest_kg == 12.5
    assert proposition.justifications[0] == "Premier passage à 8 reps : charge tirée de ton 1RM estimé"


def test_le_garde_fou_compare_au_meme_format() -> None:
    huit_faciles = Performance(date(2026, 11, 5), tuple(Serie(8, 5, 6) for _ in range(3)), PDC)
    triples = Performance(date(2026, 11, 12), tuple(Serie(3, 30, 7.5) for _ in range(4)), PDC)
    huit = ExercicePrevu("traction", 3, 3, reps=8, rpe_cible=7)

    proposition = proposer(huit, "force", [huit_faciles, triples], PDC)

    # Calcul : +12,5 kg, mais la dernière série de 8 était à +5 kg : plafonné à 80 kg × 1,05 = 84 kg.
    assert proposition.lest_kg == 8.75
    assert any("±5 %" in j for j in proposition.justifications)
