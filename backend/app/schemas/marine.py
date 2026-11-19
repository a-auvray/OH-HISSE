"""Ce que l'API renvoie pour Marine."""

import datetime as dt
from typing import Literal, Self

from pydantic import BaseModel, Field, model_validator


class SpotLu(BaseModel):
    id: int
    nom: str
    latitude: float
    longitude: float


Niveau = Literal["vert", "rouge", "noir"]


class RaisonLue(BaseModel):
    niveau: Niveau
    texte: str


class Danger(BaseModel):
    niveau: Niveau
    raisons: list[RaisonLue]


class Instantane(BaseModel):
    """Les conditions à cet instant."""

    instant: dt.datetime
    air_c: float | None
    ressenti_c: float | None
    vent_kmh: float | None
    rafales_kmh: float | None
    vent_direction_deg: float | None
    nuages_pct: float | None
    code_meteo: int | None
    eau_c: float | None
    vagues_m: float | None
    houle_m: float | None
    periode_s: float | None
    vagues_direction_deg: float | None
    courant_kmh: float | None
    courant_direction_deg: float | None
    hauteur_eau_m: float | None  # au-dessus du zéro hydrographique
    tendance: Literal["montante", "descendante", "etale"] | None
    # Marche du haut de plage jusqu'à l'eau (relief Litto3D) ; None hors des plages relevées.
    distance_eau_m: float | None = None


class Heure(BaseModel):
    instant: dt.datetime
    air_c: float | None
    vent_kmh: float | None
    rafales_kmh: float | None
    vent_direction_deg: float | None
    nuages_pct: float | None
    code_meteo: int | None
    pluie_pct: float | None
    eau_c: float | None
    vagues_m: float | None
    courant_kmh: float | None
    courant_direction_deg: float | None
    hauteur_eau_m: float | None
    distance_eau_m: float | None = None
    danger: Niveau


class Maree(BaseModel):
    type: Literal["PM", "BM"]
    instant: dt.datetime
    hauteur_m: float
    coefficient: int | None


class Soleil(BaseModel):
    jour: dt.date
    lever: dt.datetime
    coucher: dt.datetime


class Conditions(BaseModel):
    spot: SpotLu
    maintenant: Instantane
    heures: list[Heure]
    marees: list[Maree]
    soleil: list[Soleil]
    danger: Danger
    # Vrai si Open-Meteo ne répond plus et que ces données viennent du cache.
    perimees: bool
    source: str = (
        "Open-Meteo · marées estimées, recalées sur l'annuaire SHOM de Ouistreham · "
        "estran : Litto3D® (Shom - ROLNHDF, 2022)"
    )


class TraitDeCote(BaseModel):
    """Bord de l'eau pour une hauteur de marée, tiré du relief Litto3D."""

    hauteur_m: float  # hauteur relevée la plus proche de celle demandée
    lignes: list[list[list[float]]]  # lignes de points [longitude, latitude]
    source: str


TypeSortie = Literal["baignade", "nage", "plongee"]


class ConditionsSortie(BaseModel):
    """Conditions au moment d'une sortie. Laissées vides, elles sont relevées automatiquement."""

    eau_c: float | None = Field(default=None, ge=-2, le=35)
    air_c: float | None = Field(default=None, ge=-30, le=50)
    vent_kmh: float | None = Field(default=None, ge=0, le=250)
    rafales_kmh: float | None = Field(default=None, ge=0, le=300)
    vagues_m: float | None = Field(default=None, ge=0, le=20)
    hauteur_eau_m: float | None = Field(default=None, ge=-2, le=12)


class SortieEcrite(ConditionsSortie):
    type: TypeSortie
    spot_id: int | None = None
    debut: dt.datetime
    duree_min: int = Field(gt=0, le=24 * 60)
    ressenti: int | None = Field(default=None, ge=1, le=10)
    note: str | None = Field(default=None, max_length=2000)
    distance_m: float | None = Field(default=None, gt=0, le=50_000)
    profondeur_max_m: float | None = Field(default=None, gt=0, le=200)
    visibilite_m: float | None = Field(default=None, ge=0, le=100)
    materiel: str | None = Field(default=None, max_length=200)

    @model_validator(mode="after")
    def _champs_du_mode(self) -> Self:
        """Chaque mode a ses champs (note 04) : on refuse ceux d'un autre mode."""
        propres = {"nage": {"distance_m"}, "plongee": {"profondeur_max_m", "visibilite_m", "materiel"}}
        etrangers = {
            champ
            for mode, champs in propres.items()
            if mode != self.type
            for champ in champs
            if getattr(self, champ) is not None
        }
        if etrangers:
            raise ValueError(
                f"Champs sans rapport avec une sortie « {self.type} » : {', '.join(sorted(etrangers))}."
            )
        if self.debut.tzinfo is None:
            raise ValueError("L'heure de début doit préciser son fuseau horaire.")
        return self


class SortieLue(SortieEcrite):
    id: int
    spot: str | None
    # Vrai si au moins une condition a été complétée automatiquement depuis Open-Meteo.
    conditions_relevees: bool
    # Niveau de danger d'après les conditions enregistrées (None : aucune condition connue).
    danger: Niveau | None
    # Easter egg « Essuyer une tempête ! » (note 07) : vent moyen de force 10 ou plus.
    tempete: bool


Mode = Literal["baignade", "nage", "plongee"]


class CreneauLu(BaseModel):
    debut: dt.datetime
    fin: dt.datetime
    danger: Danger
    atouts: list[str]
    reserves: list[str]


class DureesLues(BaseModel):
    conseille_min: int | None
    maximum_min: int | None
    texte: str


class SensLu(BaseModel):
    sens: Literal["vers l'ouest", "vers l'est"] | None
    texte: str


class RecommandationsLues(BaseModel):
    durees: DureesLues
    tenue: list[str]
    sens: SensLu
    reprise: bool
    gestes: list[str]


class Assistant(BaseModel):
    """Réponse de l'assistant de sortie (note 04)."""

    spot: SpotLu
    mode: Mode
    duree_min: int
    combinaison: bool
    eau_c: float | None
    creneaux: list[CreneauLu]
    recommandations: RecommandationsLues | None
    jours_depuis_derniere_sortie: int | None
    # Croisement avec Vie courante : récupération incomplète → baignade de récupération active.
    recuperation_active: str | None = None
