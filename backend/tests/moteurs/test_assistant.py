import datetime as dt
import itertools
from zoneinfo import ZoneInfo

from app.moteurs.assistant import HeurePrevue, Jour, meilleurs_creneaux
from app.moteurs.danger import Situation

PARIS = ZoneInfo("Europe/Paris")
J1 = dt.datetime(2026, 11, 20, tzinfo=PARIS)
JOURS = [Jour(J1.replace(hour=8, minute=20), J1.replace(hour=17, minute=10))]


def heures(
    vent: dict[int, float] | None = None, hauteur: dict[int, float] | None = None
) -> list[HeurePrevue]:
    vent = vent or {}
    hauteur = hauteur or {}
    return [
        HeurePrevue(
            instant=J1.replace(hour=h),
            situation=Situation(vent_kmh=vent.get(h, 12), vagues_m=0.4, eau_c=12, vent_direction_deg=0),
            air_c=12,
            hauteur_eau_m=hauteur.get(h, 4.5),
        )
        for h in range(24)
    ]


def test_jamais_de_nuit() -> None:
    creneaux = meilleurs_creneaux(heures(), JOURS, 30, J1)

    assert creneaux
    assert all(c.debut.hour >= 8 and c.fin <= JOURS[0].coucher for c in creneaux)


def test_un_creneau_noir_est_ecarte_et_un_rouge_recule() -> None:
    vent: dict[int, float] = {h: 55.0 for h in range(9, 12)} | {h: 32.0 for h in range(12, 15)}

    creneaux = meilleurs_creneaux(heures(vent=vent), JOURS, 30, J1)

    assert all(not 9 <= c.debut.hour < 12 for c in creneaux)  # aucun créneau noir
    assert max(creneaux, key=lambda c: c.score).evaluation.niveau == "vert"  # le vert passe devant


def test_la_mer_haute_est_preferee() -> None:
    hauteur = {15: 6.4}

    meilleur = max(meilleurs_creneaux(heures(hauteur=hauteur), JOURS, 30, J1), key=lambda c: c.score)

    assert meilleur.debut.hour == 15
    assert any("Mer haute" in a for a in meilleur.atouts)


def test_les_creneaux_proposes_sont_espaces() -> None:
    creneaux = meilleurs_creneaux(heures(), JOURS, 30, J1, nombre=3)

    debuts = sorted(c.debut for c in creneaux)
    assert all(b - a >= dt.timedelta(hours=3) for a, b in itertools.pairwise(debuts))


def test_une_longue_sortie_doit_tenir_avant_le_coucher() -> None:
    creneaux = meilleurs_creneaux(heures(), JOURS, 120, J1)

    assert all(c.fin <= JOURS[0].coucher for c in creneaux)


def test_la_marche_jusqu_a_l_eau_remplace_la_hauteur_quand_la_plage_est_relevee() -> None:
    longues = [
        HeurePrevue(h.instant, h.situation, h.air_c, hauteur_eau_m=2.0, distance_eau_m=420) for h in heures()
    ]
    courtes = [
        HeurePrevue(h.instant, h.situation, h.air_c, hauteur_eau_m=7.5, distance_eau_m=10) for h in heures()
    ]

    loin = meilleurs_creneaux(longues, JOURS, 30, J1)[0]
    pres = meilleurs_creneaux(courtes, JOURS, 30, J1)[0]

    assert "≈ 420 m de marche jusqu'à l'eau" in loin.reserves
    assert not any("Mer basse" in r for r in loin.reserves)
    assert "L'eau au pied de la plage (≈ 10 m de sable)" in pres.atouts
