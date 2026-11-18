import datetime as dt

from app.moteurs.briefing import (
    FaitsBloc,
    FaitsJour,
    FaitsMer,
    FaitsObjectif,
    FaitsSeance,
    FaitsSemaine,
    fin_de_bloc,
    hebdomadaire,
    quotidien,
)

JOUR = dt.date(2026, 11, 18)
OBJECTIF = FaitsObjectif("55 kg aux tractions", 48.8, 55, 88.7, 43)


def test_briefing_du_jour_complet() -> None:
    b = quotidien(
        FaitsJour(
            jour=JOUR,
            mer=FaitsMer(
                "rouge",
                "Vent de terre de 27 km/h : il pousse vers le large",
                12.3,
                13,
                21,
                "Pleine mer à 06:00",
            ),
            seance=FaitsSeance("B — Volume", 3, 4, 18, ("Nuit de 5 h : séance adaptée",)),
            recuperation_restant_h=30,
            sommeil_h=5,
            sommeil_moyenne_h=6.8,
            cheat_meal="Séance lourde : un petit écart, oui.",
            objectif=OBJECTIF,
        )
    )

    assert b.sous_titre == "Mercredi 18 novembre"
    par_espace = {s.espace: s for s in b.sections}
    assert par_espace["marine"].valeur == "Rouge"
    assert "Eau 12,3 °C, air 13 °C, vent 21 km/h" in par_espace["marine"].lignes
    assert par_espace["streetlifting"].lignes == (
        "Séance 4 sur 18 · 3 exercices",
        "Nuit de 5 h : séance adaptée",
    )
    assert par_espace["vie-courante"].valeur == "Encore 30 h"
    assert par_espace["vie-courante"].lignes[0] == "Nuit de 5 h (moyenne 6,8 h)"
    assert par_espace["objectifs"].valeur == "+48,8 / 55 kg"


def test_briefing_du_jour_sans_donnees() -> None:
    b = quotidien(
        FaitsJour(
            JOUR, None, None, 0, None, None, "Pas d'effort ces deux derniers jours : pas cette fois.", None
        )
    )

    par_espace = {s.espace: s for s in b.sections}
    assert par_espace["marine"].lignes == ("Conditions indisponibles pour l'instant",)
    assert par_espace["vie-courante"].valeur == "Récupéré"
    assert "objectifs" not in par_espace


def test_bilan_de_semaine() -> None:
    b = hebdomadaire(
        FaitsSemaine(
            lundi=dt.date(2026, 11, 16),
            seances=3,
            series=36,
            tonnage_kg=12_480,
            sorties=2,
            minutes_en_mer=75,
            sommeil_moyenne_h=7.2,
            nuits=6,
            progres=(("Tractions", 48.8, 46.3),),
            poids_kg=75.2,
        )
    )

    assert b.sous_titre == "Du 16 novembre au 22 novembre"
    volume = b.sections[0]
    assert volume.valeur == "3 séances"
    assert volume.lignes == ("36 séries · tonnage 12,5 t", "Tractions : 1RM +48,8 kg (+2,5 kg)")
    assert b.sections[1].lignes == ("75 min dans l'eau",)


def test_fin_de_bloc() -> None:
    b = fin_de_bloc(
        FaitsBloc(
            nom="Force — cap 55 kg",
            type="force",
            debut=dt.date(2026, 10, 1),
            fin=dt.date(2026, 11, 12),
            seances_prevues=18,
            seances_realisees=16,
            exercices=("Tractions", "Dips"),
            objectif=OBJECTIF,
            progression=(("Tractions", 44.0, 48.8), ("Dips", None, None)),
            rpe_moyen=8.2,
        )
    )

    assert b.sections[0].valeur == "89 %"
    assert b.sections[1].lignes == ("Tractions : +44 → +48,8 kg (+4,8 kg)",)
    assert b.sections[2].valeur == "89 %"
