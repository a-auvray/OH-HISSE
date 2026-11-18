"""Client Open-Meteo (météo, marine) avec cache.

Le navigateur n'appelle jamais une API externe (note 10 du CDC) : c'est le
backend qui interroge Open-Meteo et garde les réponses en mémoire. Si le
service ne répond plus, on sert la dernière réponse connue, marquée périmée,
plutôt qu'une erreur.
"""

import time
from collections.abc import Callable
from dataclasses import dataclass
from functools import lru_cache
from threading import Lock
from typing import Any

import httpx

from app.moteurs.marees import regles_marine

URL_METEO = "https://api.open-meteo.com/v1/forecast"
URL_MARINE = "https://marine-api.open-meteo.com/v1/marine"

VARIABLES_METEO = {
    "current": "temperature_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,"
    "wind_gusts_10m,cloud_cover,weather_code",
    "hourly": "temperature_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,wind_gusts_10m,"
    "cloud_cover,weather_code,precipitation_probability",
    "daily": "sunrise,sunset",
}
VARIABLES_MARINE = {
    "hourly": "wave_height,wave_direction,wave_period,swell_wave_height,sea_surface_temperature,"
    "ocean_current_velocity,ocean_current_direction",
    "minutely_15": "sea_level_height_msl",
}


class ConditionsIndisponibles(Exception):
    """Open-Meteo ne répond pas et rien n'est en cache."""


@dataclass(frozen=True)
class Reponse:
    donnees: dict[str, Any]
    perimee: bool


class OpenMeteo:
    def __init__(self, client: httpx.Client, horloge: Callable[[], float] = time.monotonic) -> None:
        self._client = client
        self._horloge = horloge
        self._cache: dict[str, tuple[float, dict[str, Any]]] = {}
        self._verrou = Lock()

    def _obtenir(self, url: str, parametres: dict[str, Any], validite_min: float) -> Reponse:
        cle = url + "?" + "&".join(f"{k}={v}" for k, v in sorted(parametres.items()))
        maintenant = self._horloge()
        with self._verrou:
            en_cache = self._cache.get(cle)
        if en_cache and maintenant - en_cache[0] < validite_min * 60:
            return Reponse(en_cache[1], perimee=False)
        try:
            reponse = self._client.get(url, params=parametres)
            reponse.raise_for_status()
            donnees: dict[str, Any] = reponse.json()
        except (httpx.HTTPError, ValueError) as erreur:
            if en_cache:
                return Reponse(en_cache[1], perimee=True)
            raise ConditionsIndisponibles(str(erreur)) from erreur
        with self._verrou:
            self._cache[cle] = (maintenant, donnees)
        return Reponse(donnees, perimee=False)

    def meteo(self, latitude: float, longitude: float) -> Reponse:
        parametres = {
            "latitude": round(latitude, 4),
            "longitude": round(longitude, 4),
            "timezone": _fuseau(),
            "forecast_days": 4,
            **VARIABLES_METEO,
        }
        return self._obtenir(URL_METEO, parametres, _validite("meteo_min"))

    def marine(self, latitude: float, longitude: float) -> Reponse:
        parametres = {
            "latitude": round(latitude, 4),
            "longitude": round(longitude, 4),
            "timezone": _fuseau(),
            "forecast_days": 4,
            "cell_selection": "sea",
            **VARIABLES_MARINE,
        }
        return self._obtenir(URL_MARINE, parametres, _validite("marine_min"))

    def niveau_brest(self) -> Reponse:
        maree = regles_marine()["maree"]
        parametres = {
            "latitude": maree["brest_latitude"],
            "longitude": maree["brest_longitude"],
            "timezone": _fuseau(),
            "forecast_days": 4,
            "cell_selection": "sea",
            "minutely_15": "sea_level_height_msl",
        }
        return self._obtenir(URL_MARINE, parametres, _validite("brest_min"))


def _fuseau() -> str:
    return str(regles_marine()["zone"]["fuseau"])


def _validite(cle: str) -> float:
    return float(regles_marine()["cache"][cle])


@lru_cache
def open_meteo() -> OpenMeteo:
    """Instance partagée par toute l'application (et donc son cache)."""
    client = httpx.Client(timeout=10, headers={"User-Agent": "oh-hisse/0.3 (application personnelle)"})
    return OpenMeteo(client)
