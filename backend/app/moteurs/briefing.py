"""Briefings (note 05) : assembler les synthèses de tous les espaces.

Le service rassemble des faits simples ; ce moteur les met en phrases. Une
section par espace, chacune avec une valeur phare et quelques lignes.
"""

import datetime as dt
from dataclasses import dataclass, field
from typing import Literal

from app.moteurs.recuperation import majuscule

Espace = Literal["streetlifting", "marine", "vie-courante", "objectifs"]


@dataclass(frozen=True)
class Section:
    espace: Espace
    titre: str
    valeur: str | None
    lignes: tuple[str, ...] = field(default=())


@dataclass(frozen=True)
class Briefing:
    type: Literal["jour", "semaine", "debut-bloc", "fin-bloc"]
    titre: str
    sous_titre: str
    sections: tuple[Section, ...]


def _n(valeur: float, decimales: int = 1) -> str:
    texte = f"{valeur:.{decimales}f}".rstrip("0").rstrip(".") if decimales else f"{valeur:.0f}"
    return texte.replace(".", ",")


def _pluriel(n: int, mot: str) -> str:
    return f"{n} {mot}{'s' if n > 1 else ''}"


JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
MOIS = [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
]


def date_longue(jour: dt.date) -> str:
    return f"{JOURS[jour.weekday()]} {jour.day} {MOIS[jour.month - 1]}"


# --- Quotidien ---------------------------------------------------------------------------------


@dataclass(frozen=True)
class FaitsMer:
    niveau: Literal["vert", "rouge", "noir"]
    raison: str | None
    eau_c: float | None
    air_c: float | None
    vent_kmh: float | None
    prochaine_maree: str | None  # « PM à 16:47 · coef. 35 »


@dataclass(frozen=True)
class FaitsSeance:
    nom: str
    exercices: int
    numero: int
    total: int
    consignes: tuple[str, ...]


@dataclass(frozen=True)
class FaitsObjectif:
    titre: str
    e1rm_lest_kg: float | None
    cible_kg: float
    pourcentage: float | None
    jours_restants: int


@dataclass(frozen=True)
class FaitsJour:
    jour: dt.date
    mer: FaitsMer | None
    seance: FaitsSeance | None
    recuperation_restant_h: float
    sommeil_h: float | None
    sommeil_moyenne_h: float | None
    cheat_meal: str
    objectif: FaitsObjectif | None


NIVEAUX = {"vert": "Vert", "rouge": "Rouge", "noir": "Noir"}


def quotidien(f: FaitsJour) -> Briefing:
    sections: list[Section] = []

    if f.mer:
        lignes = [f.mer.raison] if f.mer.raison else ["Conditions favorables"]
        mesures = []
        if f.mer.eau_c is not None:
            mesures.append(f"eau {_n(f.mer.eau_c)} °C")
        if f.mer.air_c is not None:
            mesures.append(f"air {_n(f.mer.air_c, 0)} °C")
        if f.mer.vent_kmh is not None:
            mesures.append(f"vent {_n(f.mer.vent_kmh, 0)} km/h")
        if mesures:
            lignes.append(majuscule(", ".join(mesures)))
        if f.mer.prochaine_maree:
            lignes.append(f.mer.prochaine_maree)
        sections.append(Section("marine", "En mer", NIVEAUX[f.mer.niveau], tuple(lignes)))
    else:
        sections.append(Section("marine", "En mer", None, ("Conditions indisponibles pour l'instant",)))

    if f.seance:
        lignes = [
            f"Séance {f.seance.numero} sur {f.seance.total} · {_pluriel(f.seance.exercices, 'exercice')}"
        ]
        lignes += list(f.seance.consignes)
        sections.append(Section("streetlifting", "Séance du jour", f.seance.nom, tuple(lignes)))
    else:
        sections.append(Section("streetlifting", "Séance du jour", None, ("Pas de bloc en cours",)))

    recup = "Récupéré" if f.recuperation_restant_h <= 0 else f"Encore {_n(f.recuperation_restant_h, 0)} h"
    lignes_vie = []
    if f.sommeil_h is not None:
        lignes_vie.append(
            f"Nuit de {_n(f.sommeil_h)} h"
            + (f" (moyenne {_n(f.sommeil_moyenne_h)} h)" if f.sommeil_moyenne_h else "")
        )
    else:
        lignes_vie.append("Nuit pas encore notée")
    lignes_vie.append(f.cheat_meal)
    sections.append(Section("vie-courante", "Récupération", recup, tuple(lignes_vie)))

    if f.objectif:
        valeur = (
            f"+{_n(f.objectif.e1rm_lest_kg)} / {_n(f.objectif.cible_kg)} kg"
            if f.objectif.e1rm_lest_kg is not None
            else f"Cible {_n(f.objectif.cible_kg)} kg"
        )
        lignes = [
            f.objectif.titre,
            f"J−{f.objectif.jours_restants}" if f.objectif.jours_restants >= 0 else "Échéance passée",
        ]
        sections.append(Section("objectifs", "Objectif principal", valeur, tuple(lignes)))

    return Briefing("jour", "Briefing du jour", majuscule(date_longue(f.jour)), tuple(sections))


# --- Hebdomadaire --------------------------------------------------------------------------------


@dataclass(frozen=True)
class FaitsSemaine:
    lundi: dt.date
    seances: int
    series: int
    tonnage_kg: float
    sorties: int
    minutes_en_mer: int
    sommeil_moyenne_h: float | None
    nuits: int
    # (exercice, meilleur 1RM en lest cette semaine, semaine précédente)
    progres: tuple[tuple[str, float, float | None], ...]
    poids_kg: float | None


def hebdomadaire(f: FaitsSemaine) -> Briefing:
    dimanche = f.lundi + dt.timedelta(days=6)
    lignes_muscu = (
        [f"{_pluriel(f.series, 'série')} · tonnage {_n(f.tonnage_kg / 1000, 1)} t"] if f.seances else []
    )
    for exercice, cette, avant in f.progres:
        ecart = f" ({'+' if cette >= avant else '−'}{_n(abs(cette - avant))} kg)" if avant is not None else ""
        lignes_muscu.append(f"{exercice} : 1RM +{_n(cette)} kg{ecart}")
    sections = [
        Section(
            "streetlifting",
            "Volume",
            _pluriel(f.seances, "séance"),
            tuple(lignes_muscu) or ("Semaine sans séance",),
        ),
        Section(
            "marine",
            "Sorties en mer",
            _pluriel(f.sorties, "sortie"),
            (f"{f.minutes_en_mer} min dans l'eau",) if f.sorties else ("Pas de sortie cette semaine",),
        ),
        Section(
            "vie-courante",
            "Sommeil",
            f"{_n(f.sommeil_moyenne_h)} h" if f.sommeil_moyenne_h is not None else None,
            (f"Moyenne sur {_pluriel(f.nuits, 'nuit')} notée{'s' if f.nuits > 1 else ''}",)
            + ((f"Poids {_n(f.poids_kg)} kg",) if f.poids_kg else ()),
        ),
    ]
    titre_dates = f"Du {f.lundi.day} {MOIS[f.lundi.month - 1]} au {dimanche.day} {MOIS[dimanche.month - 1]}"
    return Briefing("semaine", "Bilan de la semaine", titre_dates, tuple(sections))


# --- Blocs -----------------------------------------------------------------------------------


@dataclass(frozen=True)
class FaitsBloc:
    nom: str
    type: str
    debut: dt.date
    fin: dt.date | None
    seances_prevues: int
    seances_realisees: int
    exercices: tuple[str, ...]
    objectif: FaitsObjectif | None
    # (exercice, 1RM en lest au début du bloc, à la fin)
    progression: tuple[tuple[str, float | None, float | None], ...]
    rpe_moyen: float | None


def debut_de_bloc(f: FaitsBloc) -> Briefing:
    lignes = [
        f"{_pluriel(f.seances_prevues, 'séance')} prévues, sans jour fixe",
        f"Exercices : {', '.join(f.exercices)}",
    ]
    sections = [Section("streetlifting", "Le bloc", majuscule(f.type), tuple(lignes))]
    if f.objectif:
        reste = (
            f"Il reste {_n(f.objectif.cible_kg - f.objectif.e1rm_lest_kg)} kg à gagner"
            if f.objectif.e1rm_lest_kg is not None
            else "Premier 1RM estimé à venir"
        )
        sections.append(
            Section(
                "objectifs",
                "Objectif du bloc",
                f"Cible {_n(f.objectif.cible_kg)} kg",
                (f.objectif.titre, reste),
            )
        )
    return Briefing(
        "debut-bloc", f"Début de bloc : {f.nom}", f"À partir du {date_longue(f.debut)}", tuple(sections)
    )


def fin_de_bloc(f: FaitsBloc) -> Briefing:
    respect = f.seances_realisees / f.seances_prevues if f.seances_prevues else 0
    lignes_plan = [f"{f.seances_realisees} séances sur {f.seances_prevues}"]
    if f.rpe_moyen is not None:
        lignes_plan.append(f"RPE moyen {_n(f.rpe_moyen)}")
    lignes_1rm = []
    for exercice, avant, apres in f.progression:
        if avant is not None and apres is not None:
            signe = "+" if apres >= avant else "−"
            lignes_1rm.append(
                f"{exercice} : +{_n(avant)} → +{_n(apres)} kg ({signe}{_n(abs(apres - avant))} kg)"
            )
        elif apres is not None:
            lignes_1rm.append(f"{exercice} : +{_n(apres)} kg")
    sections = [
        Section("streetlifting", "Respect du plan", f"{respect * 100:.0f} %", tuple(lignes_plan)),
        Section(
            "streetlifting",
            "Progression du 1RM",
            None,
            tuple(lignes_1rm) or ("Pas assez de RPE notés pour estimer",),
        ),
    ]
    if f.objectif and f.objectif.pourcentage is not None:
        sections.append(
            Section(
                "objectifs",
                "Objectif",
                f"{f.objectif.pourcentage:.0f} %",
                (f.objectif.titre, f"J−{f.objectif.jours_restants}"),
            )
        )
    periode = f"Du {date_longue(f.debut)}" + (f" au {date_longue(f.fin)}" if f.fin else "")
    return Briefing("fin-bloc", f"Fin de bloc : {f.nom}", periode, tuple(sections))
