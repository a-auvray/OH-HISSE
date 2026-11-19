from pytest import approx

from app.moteurs.estran import Profil, distance_a_l_eau, distance_sur_profil, marche_courte, marche_longue

# Plage type : digue à 9 m, pente régulière jusqu'à 0 m ZH à 400 m (−2,25 cm/m).
PENTE = Profil(
    distances_m=tuple(float(d) for d in range(0, 401, 10)),
    altitudes_zh_m=tuple(9 - 9 * d / 400 for d in range(0, 401, 10)),
)


def test_le_bord_de_l_eau_suit_la_hauteur_de_maree() -> None:
    assert distance_sur_profil(PENTE, 4.5, 30) == approx(200)
    assert distance_sur_profil(PENTE, 7.2, 30) == approx(80)


def test_a_pleine_mer_de_vives_eaux_l_eau_est_au_pied_de_la_digue() -> None:
    assert distance_sur_profil(PENTE, 9.5, 30) == 0


def test_au_dela_du_releve_la_distance_est_inconnue() -> None:
    assert distance_sur_profil(PENTE, -1.0, 30) is None


def test_une_bache_n_est_pas_la_mer() -> None:
    # Une cuvette de 20 m à 3 m ZH, au milieu d'un banc à 4 m, puis la pente vers le large.
    distances = (0.0, 50.0, 100.0, 110.0, 120.0, 130.0, 200.0, 250.0, 300.0)
    altitudes = (8.0, 6.0, 4.0, 3.0, 3.0, 4.0, 4.0, 2.0, 0.0)
    bache = Profil(distances, altitudes)

    assert distance_sur_profil(bache, 3.5, 30) == approx(212.5)  # la mer, pas la bâche à 105 m


def test_distance_de_la_plage_mediane_arrondie() -> None:
    decale = Profil(PENTE.distances_m, tuple(z + 0.45 for z in PENTE.altitudes_zh_m))
    plus_bas = Profil(PENTE.distances_m, tuple(z - 0.45 for z in PENTE.altitudes_zh_m))

    assert distance_a_l_eau([PENTE, decale, plus_bas], 4.5) == 200
    assert distance_a_l_eau([], 4.5) is None
    assert distance_a_l_eau([PENTE, PENTE], -1.0) is None


def test_reperes_de_marche() -> None:
    assert marche_longue(300) and not marche_longue(120) and not marche_longue(None)
    assert marche_courte(40) and not marche_courte(120) and not marche_courte(None)
