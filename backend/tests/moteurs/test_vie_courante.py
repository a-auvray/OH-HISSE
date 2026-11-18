import datetime as dt
from zoneinfo import ZoneInfo

import pytest

from app.moteurs.cheat_meal import verdict
from app.moteurs.recuperation import (
    NuitResumee,
    SeanceResumee,
    SerieResumee,
    SortieResumee,
    consigne,
    etat,
    type_de_seance,
)
from app.moteurs.sommeil import tendance

PARIS = ZoneInfo("Europe/Paris")
LUNDI = dt.date(2026, 11, 16)


def a(jour: dt.date, heure: int) -> dt.datetime:
    return dt.datetime.combine(jour, dt.time(heure), PARIS)


def seance(
    jour: dt.date, reps: int, rpe: float | None, n: int = 4, ressenti: int | None = None
) -> SeanceResumee:
    return SeanceResumee(jour, tuple(SerieResumee(reps, rpe) for _ in range(n)), ressenti)


SINGLE = seance(LUNDI, 1, 9)
CINQ_CINQ = seance(LUNDI, 5, 8.5)
HUIT = seance(LUNDI, 8, 8)
LEGERE = seance(LUNDI, 8, 6.5)


# --- Type de séance --------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("s", "attendu"),
    [
        (SINGLE, "max"),
        (CINQ_CINQ, "force"),
        (HUIT, "volume"),
        (LEGERE, "legere"),
        (seance(LUNDI, 8, None), "volume"),
    ],
)
def test_type_de_seance(s: SeanceResumee, attendu: str) -> None:
    assert type_de_seance(s) == attendu


def test_un_echec_sur_un_single_est_une_tentative_de_max() -> None:
    assert type_de_seance(SeanceResumee(LUNDI, (SerieResumee(1, None, echec=True),))) == "max"


# --- Récupération ------------------------------------------------------------------------------


@pytest.mark.parametrize(("s", "heures"), [(SINGLE, 96), (CINQ_CINQ, 72), (HUIT, 48), (LEGERE, 24)])
def test_durees_validees(s: SeanceResumee, heures: int) -> None:
    e = etat([s], [], [], a(LUNDI, 18))  # juste après la séance (placée à 18 h)

    assert e.restant_h == heures
    assert e.fin == a(LUNDI, 18) + dt.timedelta(hours=heures)


def test_la_jauge_avance_avec_le_temps() -> None:
    e = etat([HUIT], [], [], a(LUNDI + dt.timedelta(days=1), 18))

    assert e.restant_h == 24
    assert e.progression == pytest.approx(0.5)
    assert not e.recupere
    assert etat([HUIT], [], [], a(LUNDI + dt.timedelta(days=3), 18)).recupere


def test_ressenti_rouge_et_nuit_courte_allongent() -> None:
    s = seance(LUNDI, 8, 8, ressenti=3)
    nuit = NuitResumee(LUNDI + dt.timedelta(days=1), 5)

    e = etat([s], [], [nuit], a(LUNDI, 18))

    assert e.restant_h == 48 + 24 + 12
    assert any("Nuit courte" in r for r in e.raisons)


def test_une_nage_froide_repousse_la_fin() -> None:
    nage = SortieResumee(a(LUNDI + dt.timedelta(days=1), 10), 40, "nage", 10)

    e = etat([HUIT], [nage], [], a(LUNDI + dt.timedelta(days=1), 11))

    assert e.fin == a(LUNDI, 18) + dt.timedelta(hours=48 + 12)
    assert any("eau à 10 °C" in r for r in e.raisons)


def test_une_baignade_courte_est_une_recuperation_active() -> None:
    baignade = SortieResumee(a(LUNDI + dt.timedelta(days=1), 10), 15, "baignade", 14)

    e = etat([HUIT], [baignade], [], a(LUNDI + dt.timedelta(days=1), 11))

    assert e.fin == a(LUNDI, 18) + dt.timedelta(hours=48 - 12)


def test_les_evenements_futurs_sont_ignores_et_sans_effort_on_est_recupere() -> None:
    assert etat([], [], [], a(LUNDI, 12)).recupere
    assert etat([seance(LUNDI + dt.timedelta(days=2), 1, 9)], [], [], a(LUNDI, 12)).recupere


@pytest.mark.parametrize(
    ("restant", "baisse", "plafond", "recup_active"),
    [(10, 0, None, False), (30, 0.5, None, False), (60, 0.5, 8.0, True)],
)
def test_consigne_pour_la_seance_et_la_mer(
    restant: float, baisse: float, plafond: float | None, recup_active: bool
) -> None:
    c = consigne(etat([SINGLE], [], [], a(LUNDI, 18) + dt.timedelta(hours=96 - restant)))

    assert (c.rpe_baisse, c.rpe_plafond, c.recup_active_conseillee) == (baisse, plafond, recup_active)


# --- Cheat meal ------------------------------------------------------------------------------


MARDI_SOIR = a(LUNDI + dt.timedelta(days=1), 20)


def test_l_exemple_du_cahier_des_charges() -> None:
    # « 1 h de nage dans une eau à 10 °C + séance lourde le lendemain : ce soir, t'as le droit »
    nage = SortieResumee(a(LUNDI, 17), 60, "nage", 10)
    lourde = seance(LUNDI + dt.timedelta(days=1), 3, 9)

    v = verdict([lourde], [nage], None, MARDI_SOIR)

    assert v.verdict == "oui"
    assert v.points == 4
    assert v.phrase == "Séance lourde + 60 min de nage dans une eau à 10 °C : ce soir, t'as le droit."


def test_une_seance_normale_seule_ne_suffit_pas() -> None:
    v = verdict([seance(LUNDI + dt.timedelta(days=1), 8, 7.5)], [], None, MARDI_SOIR)

    assert (v.verdict, v.points) == ("non", 1)


def test_petit_ecart() -> None:
    assert verdict([seance(LUNDI + dt.timedelta(days=1), 3, 9)], [], None, MARDI_SOIR).verdict == "petit"


def test_un_ecart_recent_retire_deux_points() -> None:
    lourde = seance(LUNDI + dt.timedelta(days=1), 3, 9)
    nage = SortieResumee(a(LUNDI, 17), 60, "nage", 10)

    v = verdict([lourde], [nage], LUNDI - dt.timedelta(days=1), MARDI_SOIR)

    assert v.points == 2
    assert v.verdict == "petit"


def test_les_efforts_de_plus_de_48_h_ne_comptent_plus() -> None:
    assert verdict([seance(LUNDI - dt.timedelta(days=3), 3, 9)], [], None, MARDI_SOIR).points == 0


# --- Sommeil ---------------------------------------------------------------------------------


def test_moyenne_sur_sept_jours() -> None:
    nuits = [NuitResumee(LUNDI - dt.timedelta(days=i), h) for i, h in enumerate([6, 8, 7, 7.5, 9, 5, 6.5, 3])]

    t = tendance(nuits, LUNDI)

    assert t.derniere_nuit == nuits[0]
    assert t.nuits_comptees == 7  # la 8e est hors fenêtre
    assert t.moyenne_h == 7.0
