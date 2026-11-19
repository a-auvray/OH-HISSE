"""Relief de l'estran (Litto3D) : distance jusqu'à l'eau et trait de côte, sur le vrai relevé."""

from fastapi.testclient import TestClient

from app.services import estran
from app.services.marine import SPOTS_PAR_DEFAUT, assembler
from tests.test_marine import BREST, MAINTENANT, MARINE, METEO, SPOT


def test_chaque_plage_de_la_zone_a_son_releve() -> None:
    for nom, latitude, longitude in SPOTS_PAR_DEFAUT:
        plage = estran.plage_du_spot(latitude, longitude)
        assert plage is not None and plage.nom == nom
        assert len(plage.profils) >= 5


def test_la_marche_s_allonge_quand_la_mer_descend() -> None:
    _, latitude, longitude = SPOTS_PAR_DEFAUT[0]
    lues = [estran.distance_a_l_eau(latitude, longitude, h) for h in (8.3, 6.5, 4.8, 2.8, 1.15)]
    distances = [d for d in lues if d is not None]

    assert len(distances) == len(lues)
    assert distances[0] == 0  # plus haute mer : l'eau au pied de la digue
    assert distances == sorted(distances)
    assert 250 < distances[-1] < 700  # basse mer de vives eaux : quelques centaines de mètres


def test_hors_des_plages_relevees_pas_de_distance() -> None:
    assert estran.distance_a_l_eau(49.40, -0.10, 3.0) is None  # au large du Havre
    assert estran.distance_a_l_eau(49.2968, -0.293, None) is None


def test_les_conditions_donnent_la_marche_pour_chaque_heure() -> None:
    conditions = assembler(SPOT, METEO, MARINE, BREST, MAINTENANT)

    assert conditions.maintenant.distance_eau_m is not None
    assert all(h.distance_eau_m is not None for h in conditions.heures if h.hauteur_eau_m is not None)
    assert "Litto3D" in conditions.source


def test_trait_de_cote_le_plus_proche(connecte: TestClient) -> None:
    trait = connecte.get("/api/marine/trait-de-cote", params={"hauteur_m": 4.6}).json()

    assert trait["hauteur_m"] == 4.5
    assert trait["lignes"] and all(len(ligne) >= 2 for ligne in trait["lignes"])
    longitude, latitude = trait["lignes"][0][0]
    assert -0.4 < longitude < -0.2 and 49.28 < latitude < 49.34
    assert "Shom" in trait["source"]


def test_trait_de_cote_borne_et_reserve_aux_comptes(client: TestClient, connecte: TestClient) -> None:
    assert connecte.get("/api/marine/trait-de-cote", params={"hauteur_m": 40}).status_code == 422
    connecte.cookies.clear()
    assert connecte.get("/api/marine/trait-de-cote", params={"hauteur_m": 4}).status_code == 401
