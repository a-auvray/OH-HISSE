"""Conditions en mer : assemblage des réponses Open-Meteo, et spots."""

import datetime as dt
from typing import Any
from zoneinfo import ZoneInfo

from sqlmodel import Session, col, select

from app.models import SortieMer, Spot, Utilisateur
from app.moteurs import marees
from app.schemas.marine import Conditions, Heure, Instantane, Maree, Soleil, SpotLu
from app.services.open_meteo import ConditionsIndisponibles, OpenMeteo

# Mes plages (décision du 18/11/2026), créées pour chaque utilisateur à sa première visite.
SPOTS_PAR_DEFAUT = [
    ("Ouistreham — Riva-Bella", 49.2910, -0.2600),
    ("Colleville-Montgomery", 49.2968, -0.2930),
    ("Hermanville-sur-Mer", 49.2990, -0.3140),
]

HEURES_DE_PREVISION = 48


def spots(session: Session, utilisateur: Utilisateur) -> list[Spot]:
    lignes = list(
        session.exec(
            select(Spot).where(Spot.utilisateur_id == utilisateur.id).order_by(col(Spot.ordre), col(Spot.id))
        ).all()
    )
    if lignes:
        return lignes
    assert utilisateur.id is not None  # noqa: S101
    for ordre, (nom, latitude, longitude) in enumerate(SPOTS_PAR_DEFAUT):
        session.add(
            Spot(utilisateur_id=utilisateur.id, nom=nom, latitude=latitude, longitude=longitude, ordre=ordre)
        )
    session.commit()
    return spots(session, utilisateur)


def _fuseau() -> ZoneInfo:
    return ZoneInfo(str(marees.regles_marine()["zone"]["fuseau"]))


def _instants(textes: list[str], fuseau: ZoneInfo) -> list[dt.datetime]:
    """Open-Meteo renvoie l'heure locale sans fuseau : on la rattache explicitement."""
    return [dt.datetime.fromisoformat(t).replace(tzinfo=fuseau) for t in textes]


def _serie(bloc: dict[str, Any], fuseau: ZoneInfo) -> marees.Serie:
    return [
        (t, h)
        for t, h in zip(_instants(bloc["time"], fuseau), bloc["sea_level_height_msl"], strict=True)
        if h is not None
    ]


def _valeur(table: dict[str, list[Any]], variable: str, index: int | None) -> Any:
    if index is None or variable not in table:
        return None
    valeurs = table[variable]
    return valeurs[index] if index < len(valeurs) else None


def _index_heure(instants: list[dt.datetime], instant: dt.datetime) -> int | None:
    """Index de l'heure pleine qui contient `instant`."""
    debut = instant.replace(minute=0, second=0, microsecond=0)
    return next((i for i, t in enumerate(instants) if t == debut), None)


def assembler(
    spot: SpotLu,
    meteo: dict[str, Any],
    marine: dict[str, Any],
    brest: dict[str, Any],
    maintenant: dt.datetime,
    perimees: bool = False,
) -> Conditions:
    """Réunit météo, état de la mer, marées et soleil en un seul objet (fonction pure)."""
    fuseau = _fuseau()
    decalage = marees.regles_maree().decalage_zh_m
    serie_zone = _serie(marine["minutely_15"], fuseau)
    serie_brest = _serie(brest["minutely_15"], fuseau)

    heures_meteo = _instants(meteo["hourly"]["time"], fuseau)
    heures_marine = _instants(marine["hourly"]["time"], fuseau)
    hm, hmar = meteo["hourly"], marine["hourly"]
    i_marine = _index_heure(heures_marine, maintenant)
    actuel = meteo["current"]

    instantane = Instantane(
        instant=maintenant,
        air_c=actuel.get("temperature_2m"),
        ressenti_c=actuel.get("apparent_temperature"),
        vent_kmh=actuel.get("wind_speed_10m"),
        rafales_kmh=actuel.get("wind_gusts_10m"),
        vent_direction_deg=actuel.get("wind_direction_10m"),
        nuages_pct=actuel.get("cloud_cover"),
        code_meteo=actuel.get("weather_code"),
        eau_c=_valeur(hmar, "sea_surface_temperature", i_marine),
        vagues_m=_valeur(hmar, "wave_height", i_marine),
        houle_m=_valeur(hmar, "swell_wave_height", i_marine),
        periode_s=_valeur(hmar, "wave_period", i_marine),
        vagues_direction_deg=_valeur(hmar, "wave_direction", i_marine),
        courant_kmh=_valeur(hmar, "ocean_current_velocity", i_marine),
        courant_direction_deg=_valeur(hmar, "ocean_current_direction", i_marine),
        hauteur_eau_m=marees.hauteur_a(serie_zone, maintenant, decalage),
        tendance=marees.tendance(serie_zone, maintenant),
    )

    debut = maintenant.replace(minute=0, second=0, microsecond=0)
    fin = debut + dt.timedelta(hours=HEURES_DE_PREVISION)
    heures = []
    for i, instant in enumerate(heures_meteo):
        if not debut <= instant < fin:
            continue
        j = _index_heure(heures_marine, instant)
        heures.append(
            Heure(
                instant=instant,
                air_c=_valeur(hm, "temperature_2m", i),
                vent_kmh=_valeur(hm, "wind_speed_10m", i),
                rafales_kmh=_valeur(hm, "wind_gusts_10m", i),
                vent_direction_deg=_valeur(hm, "wind_direction_10m", i),
                nuages_pct=_valeur(hm, "cloud_cover", i),
                code_meteo=_valeur(hm, "weather_code", i),
                pluie_pct=_valeur(hm, "precipitation_probability", i),
                eau_c=_valeur(hmar, "sea_surface_temperature", j),
                vagues_m=_valeur(hmar, "wave_height", j),
                hauteur_eau_m=marees.hauteur_a(serie_zone, instant, decalage),
            )
        )

    liste_marees = [
        Maree(type=m.type, instant=m.instant, hauteur_m=m.hauteur_m, coefficient=m.coefficient)
        for m in marees.marees_locales(serie_zone, serie_brest)
        if m.instant >= maintenant - dt.timedelta(hours=7)
    ]

    soleil = [
        Soleil(
            jour=dt.date.fromisoformat(jour),
            lever=dt.datetime.fromisoformat(lever).replace(tzinfo=fuseau),
            coucher=dt.datetime.fromisoformat(coucher).replace(tzinfo=fuseau),
        )
        for jour, lever, coucher in zip(
            meteo["daily"]["time"], meteo["daily"]["sunrise"], meteo["daily"]["sunset"], strict=True
        )
        if dt.date.fromisoformat(jour) >= maintenant.date()
    ]

    return Conditions(
        spot=spot,
        maintenant=instantane,
        heures=heures,
        marees=liste_marees,
        soleil=soleil,
        perimees=perimees,
    )


def conditions(service: OpenMeteo, spot: Spot, maintenant: dt.datetime | None = None) -> Conditions:
    """Interroge Open-Meteo (via le cache) pour un spot."""
    zone = marees.regles_marine()["zone"]
    meteo = service.meteo(spot.latitude, spot.longitude)
    # Une seule maille marine couvre la zone : on l'interroge au point de référence.
    marine = service.marine(float(zone["latitude"]), float(zone["longitude"]))
    brest = service.niveau_brest()
    assert spot.id is not None  # noqa: S101
    return assembler(
        SpotLu(id=spot.id, nom=spot.nom, latitude=spot.latitude, longitude=spot.longitude),
        meteo.donnees,
        marine.donnees,
        brest.donnees,
        maintenant or dt.datetime.now(_fuseau()),
        perimees=meteo.perimee or marine.perimee or brest.perimee,
    )


# --- Carnet de sortie -----------------------------------------------------------------------

CONDITIONS = ("eau_c", "air_c", "vent_kmh", "rafales_kmh", "vagues_m", "hauteur_eau_m")


def releve(meteo: dict[str, Any], marine: dict[str, Any], instant: dt.datetime) -> dict[str, float | None]:
    """Conditions à un instant passé ou futur proche, lues dans les séries horaires (fonction pure)."""
    fuseau = _fuseau()
    instant = instant.astimezone(fuseau)
    i = _index_heure(_instants(meteo["hourly"]["time"], fuseau), instant)
    j = _index_heure(_instants(marine["hourly"]["time"], fuseau), instant)
    return {
        "eau_c": _valeur(marine["hourly"], "sea_surface_temperature", j),
        "air_c": _valeur(meteo["hourly"], "temperature_2m", i),
        "vent_kmh": _valeur(meteo["hourly"], "wind_speed_10m", i),
        "rafales_kmh": _valeur(meteo["hourly"], "wind_gusts_10m", i),
        "vagues_m": _valeur(marine["hourly"], "wave_height", j),
        "hauteur_eau_m": marees.hauteur_a(
            _serie(marine["minutely_15"], fuseau), instant, marees.regles_maree().decalage_zh_m
        ),
    }


def completer_conditions(service: OpenMeteo, sortie: SortieMer, spot: Spot | None) -> None:
    """Complète les conditions laissées vides, si Open-Meteo couvre l'heure de la sortie.

    Hors de la fenêtre couverte (plus de deux jours dans le passé) ou en cas de panne,
    les champs restent vides : la sortie s'enregistre quand même.
    """
    if all(getattr(sortie, c) is not None for c in CONDITIONS):
        return
    zone = marees.regles_marine()["zone"]
    latitude = spot.latitude if spot else float(zone["latitude"])
    longitude = spot.longitude if spot else float(zone["longitude"])
    try:
        meteo = service.meteo(latitude, longitude).donnees
        marine = service.marine(float(zone["latitude"]), float(zone["longitude"])).donnees
    except ConditionsIndisponibles:
        return
    for champ, valeur in releve(meteo, marine, sortie.debut).items():
        if getattr(sortie, champ) is None and valeur is not None:
            setattr(sortie, champ, valeur)
            sortie.conditions_relevees = True
