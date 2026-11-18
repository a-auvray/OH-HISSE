"""Données fictives d'un bac à sable démo (note 07 : « données fictives pré-remplies »).

Tout est daté par rapport au jour de la visite : le visiteur arrive sur un
espace vivant, où les croisements se voient déjà (séance du jour calculée,
récupération en cours, verdict d'écart, briefings remplis).
"""

import datetime as dt
from zoneinfo import ZoneInfo

from sqlmodel import Session, select

from app.models import Bloc, CheatMeal, Exercice, Nuit, Objectif, Pesee, Seance, Serie, SortieMer, Utilisateur
from app.services.marine import spots

PARIS = ZoneInfo("Europe/Paris")

PROGRAMME = [
    {
        "nom": "A — Tirage lourd",
        "exercices": [
            {"exercice": "traction", "series": [3, 5], "reps": 5, "rpe_cible": 8.0},
            {"exercice": "dips", "series": 4, "reps": 6, "rpe_cible": 7.5},
        ],
    },
    {
        "nom": "B — Muscle-up et volume",
        "exercices": [
            {"exercice": "muscle-up", "series": [4, 6], "reps": 1, "rpe_cible": 8.0},
            {"exercice": "traction", "series": 3, "reps": 8, "rpe_cible": 7.0},
        ],
    },
    {
        "nom": "C — Singles",
        "exercices": [
            {"exercice": "traction", "series": [2, 3], "reps": 1, "rpe_cible": 9.0},
            {"exercice": "dips", "series": [2, 3], "reps": 1, "rpe_cible": 9.0},
        ],
    },
]

SerieDemo = tuple[str, int, float, float]  # (exercice, reps, lest, RPE)


def series(nombre: int, exercice: str, reps: int, lest: float, rpe: float) -> list[SerieDemo]:
    return [(exercice, reps, lest, rpe)] * nombre


# Huit séances sur trois semaines : (jours avant aujourd'hui, rang du modèle, séries, ressenti).
# Les charges progressent, les RPE racontent l'histoire (singles à RPE 9, séance ratée il y a 2 jours).
SEANCES: list[tuple[int, int, list[SerieDemo], int]] = [
    (19, 0, series(4, "traction", 5, 20, 8) + series(4, "dips", 6, 30, 7.5), 7),
    (17, 1, series(5, "muscle-up", 1, 0, 8) + series(3, "traction", 8, 10, 7), 8),
    (15, 2, series(2, "traction", 1, 40, 9) + series(2, "dips", 1, 55, 8.5), 8),
    (12, 0, series(4, "traction", 5, 22.5, 8) + series(4, "dips", 6, 32.5, 7.5), 7),
    (10, 1, series(5, "muscle-up", 1, 2.5, 8.5) + series(3, "traction", 8, 12.5, 7.5), 6),
    (8, 2, series(3, "traction", 1, 42.5, 9) + series(2, "dips", 1, 57.5, 9), 9),
    (5, 0, series(5, "traction", 5, 22.5, 7.5) + series(4, "dips", 6, 35, 8), 8),
    (2, 1, series(4, "muscle-up", 1, 5, 8.5) + series(3, "traction", 8, 12.5, 8.5), 4),
]

PESEES = [(21, 76.0), (14, 75.6), (7, 75.4), (0, 75.1)]

# Heures de sommeil des 21 dernières nuits (la dernière est celle de cette nuit).
NUITS = [7.5, 8, 6.5, 7, 7.5, 5.5, 8, 7, 7.5, 6, 8.5, 7, 7, 6.5, 7.5, 8, 7, 5, 7.5, 7, 6.5]

# (jours avant, heure, type, minutes, rang du spot, eau, air, vent, vagues, détails)
SORTIES: list[tuple[int, int, str, int, int, float, float, float, float, dict[str, float | str]]] = [
    (13, 16, "nage", 35, 1, 12.6, 14, 12, 0.4, {"distance_m": 1200.0}),
    (9, 11, "baignade", 15, 0, 12.4, 13, 8, 0.3, {}),
    (
        6,
        15,
        "plongee",
        25,
        2,
        12.3,
        15,
        6,
        0.2,
        {"profondeur_max_m": 6.0, "visibilite_m": 2.5, "materiel": "Combinaison 7 mm, palmes"},
    ),
    (1, 16, "nage", 40, 1, 12.2, 12, 18, 0.6, {"distance_m": 1500.0}),
]


def peupler(session: Session, utilisateur: Utilisateur, aujourdhui: dt.date) -> None:
    """Remplit un bac à sable tout neuf (appelé à sa création)."""
    assert utilisateur.id is not None  # noqa: S101
    uid = utilisateur.id

    def jour(jours_avant: int) -> dt.date:
        return aujourdhui - dt.timedelta(days=jours_avant)

    exercices = {
        e.slug: e.id
        for e in session.exec(select(Exercice).where(Exercice.utilisateur_id == None)).all()  # noqa: E711
        if e.id is not None
    }

    objectif = Objectif(
        utilisateur_id=uid,
        titre="55 kg de lest aux tractions",
        type="max",
        exercice_id=exercices["traction"],
        valeur_cible_kg=55,
        date_cible=aujourdhui + dt.timedelta(days=60),
        principal=True,
    )
    session.add(objectif)
    session.add(
        Objectif(
            utilisateur_id=uid,
            titre="Muscle-up lesté à +15 kg",
            type="max",
            exercice_id=exercices["muscle-up"],
            valeur_cible_kg=15,
            date_cible=aujourdhui + dt.timedelta(days=120),
        )
    )
    session.flush()

    bloc = Bloc(
        utilisateur_id=uid,
        nom="Force — cap 55 kg",
        type="force",
        cycles=4,
        programme=PROGRAMME,
        debut=jour(20),
        objectif_id=objectif.id,
    )
    session.add(bloc)
    session.flush()

    for jours_avant, rang, faites, ressenti in SEANCES:
        seance = Seance(
            utilisateur_id=uid,
            date=jour(jours_avant),
            nom=str(PROGRAMME[rang]["nom"]),
            ressenti=ressenti,
            bloc_id=bloc.id,
            rang_modele=rang,
        )
        session.add(seance)
        session.flush()
        assert seance.id is not None  # noqa: S101
        for i, (slug, reps, lest, rpe) in enumerate(faites):
            session.add(
                Serie(
                    seance_id=seance.id,
                    ordre=i,
                    exercice_id=exercices[slug],
                    reps=reps,
                    lest_kg=lest,
                    rpe=rpe,
                )
            )

    for jours_avant, kg in PESEES:
        session.add(Pesee(utilisateur_id=uid, date=jour(jours_avant), poids_kg=kg))

    for i, heures in enumerate(reversed(NUITS)):
        session.add(Nuit(utilisateur_id=uid, date=jour(i), heures=heures, qualite=3 if heures < 6.5 else 4))

    session.add(CheatMeal(utilisateur_id=uid, date=jour(6), note="Burger après la plongée"))

    plages = spots(session, utilisateur)
    for jours_avant, heure, type_, minutes, rang, eau, air, vent, vagues, details in SORTIES:
        sortie = SortieMer(
            utilisateur_id=uid,
            spot_id=plages[rang].id,
            type=type_,
            debut=dt.datetime.combine(jour(jours_avant), dt.time(heure), PARIS),
            duree_min=minutes,
            ressenti=8,
            eau_c=eau,
            air_c=air,
            vent_kmh=vent,
            rafales_kmh=round(vent * 1.5),
            vagues_m=vagues,
        )
        for champ, valeur in details.items():
            setattr(sortie, champ, valeur)
        session.add(sortie)
