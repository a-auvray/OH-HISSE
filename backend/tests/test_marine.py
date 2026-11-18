import datetime as dt
import json
from collections.abc import Iterator
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import app as application
from app.schemas.marine import SpotLu
from app.services.marine import assembler
from app.services.open_meteo import ConditionsIndisponibles, OpenMeteo, Reponse, open_meteo

DONNEES = Path(__file__).parent / "donnees"
PARIS = ZoneInfo("Europe/Paris")
MAINTENANT = dt.datetime(2026, 11, 20, 14, 10, tzinfo=PARIS)
SPOT = SpotLu(id=1, nom="Colleville-Montgomery", latitude=49.2968, longitude=-0.293)


def charger(nom: str) -> dict[str, Any]:
    resultat: dict[str, Any] = json.loads((DONNEES / nom).read_text())
    return resultat


METEO = charger("meteo_2026-11-18.json")
MARINE = charger("marine_2026-11-18.json")
BREST = {"minutely_15": charger("marees_2026-11-18.json")["brest"]}


# --- Assemblage (fonction pure, sur de vraies réponses enregistrées) -------------------------


def test_les_conditions_du_moment() -> None:
    conditions = assembler(SPOT, METEO, MARINE, BREST, MAINTENANT)

    m = conditions.maintenant
    assert m.eau_c is not None and 8 < m.eau_c < 16
    assert m.vagues_m is not None
    # Le 20/11, basse mer à 13 h 25 (SHOM) : à 14 h 10 la mer remonte, environ 3 m au-dessus du ZH.
    assert m.tendance == "montante"
    assert m.hauteur_eau_m is not None and 2.5 < m.hauteur_eau_m < 4


def test_48_heures_de_prevision_a_partir_de_l_heure_en_cours() -> None:
    heures = assembler(SPOT, METEO, MARINE, BREST, MAINTENANT).heures

    assert heures[0].instant == dt.datetime(2026, 11, 20, 14, tzinfo=PARIS)
    assert all(h.instant.utcoffset() == dt.timedelta(hours=1) for h in heures)
    assert len(heures) <= 48


def test_les_marees_a_venir_avec_coefficient() -> None:
    marees = assembler(SPOT, METEO, MARINE, BREST, MAINTENANT).marees

    pm = [m for m in marees if m.type == "PM"]
    assert pm and all(m.coefficient is not None for m in pm[:-1])
    assert marees[0].instant >= MAINTENANT - dt.timedelta(hours=7)


def test_lever_et_coucher_du_soleil() -> None:
    soleil = assembler(SPOT, METEO, MARINE, BREST, MAINTENANT).soleil

    assert soleil[0].jour == dt.date(2026, 11, 20)
    assert soleil[0].lever.hour == 8
    assert soleil[0].coucher.hour == 17


# --- Cache et pannes d'Open-Meteo ------------------------------------------------------------


class Horloge:
    def __init__(self) -> None:
        self.t = 0.0

    def __call__(self) -> float:
        return self.t


def service(reponses: list[httpx.Response | Exception]) -> tuple[OpenMeteo, Horloge, list[int]]:
    appels: list[int] = []

    def repondre(requete: httpx.Request) -> httpx.Response:
        appels.append(1)
        suivante = reponses.pop(0)
        if isinstance(suivante, Exception):
            raise suivante
        return suivante

    horloge = Horloge()
    return OpenMeteo(httpx.Client(transport=httpx.MockTransport(repondre)), horloge), horloge, appels


def test_la_reponse_est_gardee_en_cache() -> None:
    meteo, horloge, appels = service([httpx.Response(200, json={"a": 1}), httpx.Response(200, json={"a": 2})])

    assert meteo.meteo(49.3, -0.3).donnees == {"a": 1}
    horloge.t = 29 * 60
    assert meteo.meteo(49.3, -0.3).donnees == {"a": 1}  # encore valide
    assert len(appels) == 1
    horloge.t = 31 * 60
    assert meteo.meteo(49.3, -0.3).donnees == {"a": 2}  # 30 min dépassées : nouvel appel


def test_en_cas_de_panne_on_sert_la_derniere_reponse_perimee() -> None:
    meteo, horloge, _ = service([httpx.Response(200, json={"a": 1}), httpx.ConnectError("hors ligne")])
    meteo.meteo(49.3, -0.3)
    horloge.t = 3600

    reponse = meteo.meteo(49.3, -0.3)

    assert reponse.donnees == {"a": 1}
    assert reponse.perimee


def test_panne_sans_cache() -> None:
    meteo, _, _ = service([httpx.Response(503)])

    with pytest.raises(ConditionsIndisponibles):
        meteo.meteo(49.3, -0.3)


# --- Routes ---------------------------------------------------------------------------


class OpenMeteoEnregistre(OpenMeteo):
    """Rejoue les réponses enregistrées, sans réseau."""

    def __init__(self) -> None:
        super().__init__(httpx.Client())

    def _obtenir(self, url: str, parametres: dict[str, Any], validite_min: float) -> Reponse:
        if "forecast" in url:
            return Reponse(METEO, perimee=False)
        return Reponse(BREST if parametres["latitude"] < 49 else MARINE, perimee=False)


@pytest.fixture
def sans_reseau() -> Iterator[None]:
    application.dependency_overrides[open_meteo] = OpenMeteoEnregistre
    yield
    application.dependency_overrides.pop(open_meteo, None)


def test_mes_trois_plages_sont_creees_a_la_premiere_visite(connecte: TestClient) -> None:
    spots = connecte.get("/api/marine/spots").json()

    assert [s["nom"] for s in spots] == [
        "Ouistreham — Riva-Bella",
        "Colleville-Montgomery",
        "Hermanville-sur-Mer",
    ]
    assert len(connecte.get("/api/marine/spots").json()) == 3  # pas de doublons


def test_conditions_d_un_spot(connecte: TestClient, sans_reseau: None) -> None:
    spot = connecte.get("/api/marine/spots").json()[1]

    reponse = connecte.get("/api/marine/conditions", params={"spot_id": spot["id"]})

    assert reponse.status_code == 200
    assert reponse.json()["spot"]["nom"] == "Colleville-Montgomery"


def test_le_spot_d_un_autre_est_introuvable(connecte: TestClient, sans_reseau: None) -> None:
    spot = connecte.get("/api/marine/spots").json()[0]
    connecte.cookies.clear()
    connecte.post("/api/auth/demo")

    assert connecte.get("/api/marine/conditions", params={"spot_id": spot["id"]}).status_code == 404


def test_open_meteo_injoignable(connecte: TestClient) -> None:
    class EnPanne(OpenMeteo):
        def __init__(self) -> None:
            super().__init__(httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(503))))

    application.dependency_overrides[open_meteo] = EnPanne
    try:
        reponse = connecte.get("/api/marine/conditions")
    finally:
        application.dependency_overrides.pop(open_meteo, None)

    assert reponse.status_code == 503
    assert "indisponibles" in reponse.json()["detail"]


# --- Carnet de sortie -------------------------------------------------------------------------


def sortie(**extra: Any) -> dict[str, Any]:
    return {"type": "nage", "debut": "2026-11-20T14:00:00+01:00", "duree_min": 40, "ressenti": 8, **extra}


def test_les_conditions_sont_relevees_a_l_heure_de_la_sortie(connecte: TestClient, sans_reseau: None) -> None:
    spot = connecte.get("/api/marine/spots").json()[1]

    lue = connecte.post("/api/marine/sorties", json=sortie(spot_id=spot["id"], distance_m=1200)).json()

    assert lue["conditions_relevees"] is True
    assert lue["spot"] == "Colleville-Montgomery"
    assert lue["eau_c"] is not None and 8 < lue["eau_c"] < 16
    assert lue["vent_kmh"] is not None
    assert lue["hauteur_eau_m"] is not None and 2.5 < lue["hauteur_eau_m"] < 4.5  # peu après la BM de 13 h 25
    assert lue["distance_m"] == 1200


def test_une_valeur_saisie_n_est_jamais_ecrasee(connecte: TestClient, sans_reseau: None) -> None:
    lue = connecte.post("/api/marine/sorties", json=sortie(eau_c=9.5)).json()

    assert lue["eau_c"] == 9.5
    assert lue["air_c"] is not None  # le reste est complété


def test_sans_open_meteo_la_sortie_s_enregistre_quand_meme(connecte: TestClient) -> None:
    class EnPanne(OpenMeteo):
        def __init__(self) -> None:
            super().__init__(httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(503))))

    application.dependency_overrides[open_meteo] = EnPanne
    try:
        reponse = connecte.post("/api/marine/sorties", json=sortie(type="baignade"))
    finally:
        application.dependency_overrides.pop(open_meteo, None)

    assert reponse.status_code == 201
    assert reponse.json()["conditions_relevees"] is False
    assert reponse.json()["eau_c"] is None


@pytest.mark.parametrize(
    "modification",
    [
        {"type": "baignade", "distance_m": 500},  # distance : propre à la nage
        {"type": "nage", "profondeur_max_m": 12},  # profondeur : propre à la plongée
        {"type": "surf"},
        {"duree_min": 0},
        {"debut": "2026-11-20T14:00:00"},  # sans fuseau
        {"eau_c": 60},
    ],
)
def test_sorties_invalides(connecte: TestClient, sans_reseau: None, modification: dict[str, Any]) -> None:
    assert connecte.post("/api/marine/sorties", json=sortie(**modification)).status_code == 422


def test_plongee_avec_ses_champs(connecte: TestClient, sans_reseau: None) -> None:
    corps = sortie(type="plongee", profondeur_max_m=8, visibilite_m=3, materiel="Combinaison 7 mm, palmes")

    lue = connecte.post("/api/marine/sorties", json=corps).json()

    assert (lue["profondeur_max_m"], lue["visibilite_m"]) == (8, 3)


def test_carnet_du_plus_recent_au_plus_ancien(connecte: TestClient, sans_reseau: None) -> None:
    connecte.post("/api/marine/sorties", json=sortie(debut="2026-11-19T10:00:00+01:00"))
    connecte.post("/api/marine/sorties", json=sortie(debut="2026-11-21T16:00:00+01:00"))

    debuts = [s["debut"] for s in connecte.get("/api/marine/sorties").json()]

    assert debuts == ["2026-11-21T15:00:00Z", "2026-11-19T09:00:00Z"]


def test_modifier_et_supprimer_une_sortie(connecte: TestClient, sans_reseau: None) -> None:
    identifiant = connecte.post("/api/marine/sorties", json=sortie()).json()["id"]

    modifiee = connecte.put(f"/api/marine/sorties/{identifiant}", json=sortie(duree_min=55)).json()
    assert modifiee["duree_min"] == 55

    assert connecte.delete(f"/api/marine/sorties/{identifiant}").status_code == 204
    assert connecte.get("/api/marine/sorties").json() == []


def test_le_carnet_des_autres_est_invisible(connecte: TestClient, sans_reseau: None) -> None:
    identifiant = connecte.post("/api/marine/sorties", json=sortie()).json()["id"]
    connecte.cookies.clear()
    connecte.post("/api/auth/demo")

    assert connecte.get("/api/marine/sorties").json() == []
    assert connecte.put(f"/api/marine/sorties/{identifiant}", json=sortie()).status_code == 404
    assert connecte.delete(f"/api/marine/sorties/{identifiant}").status_code == 404


# --- Danger, assistant, tempête --------------------------------------------------------------


def test_chaque_heure_et_l_instant_ont_un_niveau_de_danger() -> None:
    conditions = assembler(SPOT, METEO, MARINE, BREST, MAINTENANT)

    assert conditions.danger.niveau in ("vert", "rouge", "noir")
    assert all(h.danger in ("vert", "rouge", "noir") for h in conditions.heures)
    # Les heures de nuit sont au moins rouges.
    nuit = [h for h in conditions.heures if h.instant.hour in (2, 3)]
    assert nuit and all(h.danger != "vert" for h in nuit)


def test_l_assistant_propose_des_creneaux_de_jour(connecte: TestClient, sans_reseau: None) -> None:
    reponse = connecte.get("/api/marine/assistant", params={"mode": "nage", "duree_min": 40})

    assert reponse.status_code == 200
    corps = reponse.json()
    assert corps["recommandations"]["durees"]["texte"].startswith("Eau à")
    assert corps["recommandations"]["reprise"] is True  # aucune sortie notée : on part prudent
    for creneau in corps["creneaux"]:
        assert creneau["danger"]["niveau"] != "noir"
        assert 8 <= int(creneau["debut"][11:13]) <= 17


def test_essuyer_une_tempete(connecte: TestClient, sans_reseau: None) -> None:
    lue = connecte.post("/api/marine/sorties", json=sortie(vent_kmh=95, eau_c=11)).json()

    assert lue["tempete"] is True
    assert lue["danger"] == "noir"  # le badge ne sera jamais présenté comme une réussite


def test_une_sortie_sans_aucune_condition_n_a_pas_de_niveau(connecte: TestClient) -> None:
    class EnPanne(OpenMeteo):
        def __init__(self) -> None:
            super().__init__(httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(503))))

    application.dependency_overrides[open_meteo] = EnPanne
    try:
        lue = connecte.post("/api/marine/sorties", json=sortie()).json()
    finally:
        application.dependency_overrides.pop(open_meteo, None)

    assert lue["danger"] is None
    assert lue["tempete"] is False
