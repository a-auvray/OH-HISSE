# /// script
# requires-python = ">=3.12"
# dependencies = ["numpy>=2", "pyproj>=3.7", "contourpy>=1.3", "shapely>=2", "scipy>=1.14"]
# ///
"""Prépare le relief de l'estran pour l'application, à partir de Litto3D.

À lancer une fois (et à chaque nouveau relevé Litto3D), sur les dalles MNT 1 m
extraites des prépaquets 0455_6920 et 0460_6920 de la « Partie maritime Litto3D®
Normandie et Hauts-de-France 2016-2018 » (Shom, licence ouverte) :

    uv run outils/preparer_estran.py <dossier des dalles .asc> app/donnees/estran.json

Le fichier produit contient :
- pour chaque plage, des profils haut de plage → large, tous les 5 m, en mètres
  au-dessus du zéro hydrographique (ZH) ;
- le trait de côte (bord de l'eau) tous les 0,5 m de hauteur de marée, simplifié : seule
  l'eau reliée au large compte (une bâche coupée de la mer n'est pas le bord de l'eau).

Le relief Litto3D est en IGN69 ; à Ouistreham, ZH = IGN69 − 4,08 m (Références
Altimétriques Maritimes du Shom).
"""

import json
import re
import sys
from pathlib import Path

import contourpy
import numpy as np
from pyproj import Transformer
from scipy import ndimage
from shapely.geometry import LineString

ZH_SOUS_IGN69_M = 4.08
PHMA_ZH_M = 8.32  # plus haute mer astronomique à Ouistreham : au-dessus, on est hors de l'estran
SANS_DONNEE = -99999.0

# Emprise utile (Lambert-93, m) : les trois plages, du haut de plage au large.
X_MIN, X_MAX = 456_000, 465_000
Y_MIN, Y_MAX = 6_914_000, 6_919_000
PAS_GRILLE_M = 2  # le MNT 1 m est moyenné par blocs de 2 × 2 m

PLAGES = [
    ("Ouistreham — Riva-Bella", 49.2910, -0.2600),
    ("Colleville-Montgomery", 49.2968, -0.2930),
    ("Hermanville-sur-Mer", 49.2990, -0.3140),
]
DECALAGES_PROFILS_M = (-300, -200, -100, 0, 100, 200, 300)  # le long de la plage
PAS_PROFIL_M = 5
NIVEAU_MOYEN_ZH_M = 4.8  # niveau moyen à Ouistreham : sert à orienter le rivage
RAYON_RIVAGE_M = 700
LONGUEUR_PROFIL_M = 2_000

NIVEAUX_M = [n / 2 for n in range(0, 18)]  # 0 à 8,5 m ZH
LONGUEUR_MIN_TRAIT_M = 150
TOUJOURS_IMMERGE_ZH_M = -0.5  # sous les plus basses mers : c'est le large
TOLERANCE_SIMPLIFICATION_M = 4

VERS_L93 = Transformer.from_crs(4326, 2154, always_xy=True)
VERS_WGS84 = Transformer.from_crs(2154, 4326, always_xy=True)


def lire_asc(chemin: Path) -> tuple[np.ndarray, float, float, float]:
    """Une dalle Arc ASCII Grid : (altitudes, x du coin bas-gauche, y du coin bas-gauche, pas)."""
    entete: dict[str, float] = {}
    with chemin.open(encoding="ascii") as f:
        for _ in range(6):
            cle, valeur = f.readline().split()
            entete[cle.lower()] = float(valeur)
        valeurs = np.loadtxt(f, dtype=np.float32)
    pas = entete["cellsize"]
    x0 = entete.get("xllcorner", entete.get("xllcenter", 0) - pas / 2)
    y0 = entete.get("yllcorner", entete.get("yllcenter", 0) - pas / 2)
    valeurs[valeurs <= entete.get("nodata_value", SANS_DONNEE) + 1] = np.nan
    return valeurs, x0, y0, pas


def mosaique(dossier: Path) -> np.ndarray:
    """Grille ZH au pas de 2 m sur l'emprise ; ligne 0 = sud. NaN hors relevé."""
    nx = (X_MAX - X_MIN) // PAS_GRILLE_M
    ny = (Y_MAX - Y_MIN) // PAS_GRILLE_M
    somme = np.zeros((ny, nx), dtype=np.float64)
    nombre = np.zeros((ny, nx), dtype=np.int32)
    dalles = sorted(p for p in dossier.rglob("*.asc") if re.search(r"MNT", p.name, re.IGNORECASE))
    for chemin in dalles:
        z, x0, y0, pas = lire_asc(chemin)
        if pas != 1:
            continue  # on ne garde que le MNT 1 m
        hauteur, largeur = z.shape
        if x0 + largeur <= X_MIN or x0 >= X_MAX or y0 + hauteur <= Y_MIN or y0 >= Y_MAX:
            continue
        print(f"  {chemin.name}", file=sys.stderr)
        z = z[::-1] + ZH_SOUS_IGN69_M  # du sud au nord, en ZH
        for j in range(hauteur):
            y = y0 + j
            if not Y_MIN <= y < Y_MAX:
                continue
            gy = int((y - Y_MIN) // PAS_GRILLE_M)
            xs = x0 + np.arange(largeur)
            dedans = (xs >= X_MIN) & (xs < X_MAX) & ~np.isnan(z[j])
            gx = ((xs[dedans] - X_MIN) // PAS_GRILLE_M).astype(int)
            np.add.at(somme[gy], gx, z[j][dedans])
            np.add.at(nombre[gy], gx, 1)
    with np.errstate(invalid="ignore"):
        return np.where(nombre > 0, somme / np.maximum(nombre, 1), np.nan)


def altitude(grille: np.ndarray, x: float, y: float) -> float:
    gx, gy = int((x - X_MIN) // PAS_GRILLE_M), int((y - Y_MIN) // PAS_GRILLE_M)
    if not (0 <= gy < grille.shape[0] and 0 <= gx < grille.shape[1]):
        return float("nan")
    return float(grille[gy, gx])


def direction_du_large(grille: np.ndarray, x: float, y: float) -> tuple[np.ndarray, np.ndarray]:
    """(le long de la plage, vers le large) : vecteurs unitaires tirés du rivage à mi-marée.

    La côte n'est pas plein est-ouest (≈ 25° entre Hermanville et Colleville) : marcher
    « vers le nord » allongerait la distance. On suit la perpendiculaire au rivage.
    """
    xs = X_MIN + PAS_GRILLE_M / 2 + PAS_GRILLE_M * np.arange(grille.shape[1])
    ys = Y_MIN + PAS_GRILLE_M / 2 + PAS_GRILLE_M * np.arange(grille.shape[0])
    generateur = contourpy.contour_generator(xs, ys, np.ma.masked_invalid(grille), line_type="Separate")
    points = np.concatenate([np.asarray(ligne) for ligne in generateur.lines(NIVEAU_MOYEN_ZH_M)])
    proches = points[np.hypot(points[:, 0] - x, points[:, 1] - y) < RAYON_RIVAGE_M]
    centres = proches - proches.mean(axis=0)
    _, _, axes = np.linalg.svd(centres, full_matrices=False)
    le_long = axes[0] / np.linalg.norm(axes[0])
    large = np.array([-le_long[1], le_long[0]])
    if large[1] < 0:  # la mer est au nord
        large = -large
    return le_long, large


def profils(grille: np.ndarray, latitude: float, longitude: float) -> list[dict[str, list[float]]]:
    """Profils perpendiculaires au rivage, partant du dernier point au-dessus de la PHMA."""
    x_spot, y_spot = VERS_L93.transform(longitude, latitude)
    le_long, large = direction_du_large(grille, x_spot, y_spot)
    cap = float(np.degrees(np.arctan2(large[0], large[1])) % 360)
    print(f"  vers le large : cap {cap:.0f}°", file=sys.stderr)
    pas = np.arange(-600, LONGUEUR_PROFIL_M, PAS_PROFIL_M)
    resultat = []
    for decalage in DECALAGES_PROFILS_M:
        origine = np.array([x_spot, y_spot]) + decalage * le_long
        zs = np.array([altitude(grille, *(origine + s * large)) for s in pas])
        connus = np.where(~np.isnan(zs))[0]
        au_dessus = [i for i in connus if zs[i] >= PHMA_ZH_M]
        if not au_dessus:
            continue
        depart = au_dessus[-1]
        # On suit le profil vers le large tant que le relevé est continu.
        fin = depart
        while fin + 1 < len(zs) and not np.isnan(zs[fin + 1]):
            fin += 1
        if fin - depart < 20:
            continue
        resultat.append(
            {
                "distances_m": [float((i - depart) * PAS_PROFIL_M) for i in range(depart, fin + 1)],
                "altitudes_zh_m": [round(float(zs[i]), 2) for i in range(depart, fin + 1)],
            }
        )
    return resultat


def morceaux_de_rivage(brute: np.ndarray, hors_releve: np.ndarray) -> list[np.ndarray]:
    """Coupe une ligne là où elle longe une zone sans relevé ou le bord de l'emprise.

    Le contour du masque « mer » suit aussi la limite du relevé : ce n'est pas le bord
    de l'eau, seulement le bord de ce qu'on connaît.
    """
    gx = ((brute[:, 0] - X_MIN) // PAS_GRILLE_M).astype(int)
    gy = ((brute[:, 1] - Y_MIN) // PAS_GRILLE_M).astype(int)
    hauteur, largeur = hors_releve.shape
    dedans = (gx >= 0) & (gx < largeur) & (gy >= 0) & (gy < hauteur)
    valides = dedans.copy()
    valides[dedans] = ~hors_releve[gy[dedans], gx[dedans]]
    morceaux, debut = [], None
    for i, ok in enumerate([*valides, False]):
        if ok and debut is None:
            debut = i
        elif not ok and debut is not None:
            if i - debut >= 2:
                morceaux.append(brute[debut:i])
            debut = None
    return morceaux


def traits(grille: np.ndarray) -> list[dict[str, object]]:
    xs = X_MIN + PAS_GRILLE_M / 2 + PAS_GRILLE_M * np.arange(grille.shape[1])
    ys = Y_MIN + PAS_GRILLE_M / 2 + PAS_GRILLE_M * np.arange(grille.shape[0])
    sol = np.nan_to_num(grille, nan=np.inf)
    large = sol < TOUJOURS_IMMERGE_ZH_M
    # Zone sans relevé, élargie de quelques mailles, et cadre de l'emprise.
    hors_releve = ndimage.binary_dilation(~np.isfinite(grille), iterations=3)
    hors_releve[:3, :] = hors_releve[-3:, :] = True
    hors_releve[:, :3] = hors_releve[:, -3:] = True
    resultat = []
    for niveau in NIVEAUX_M:
        # L'eau à ce niveau, mais seulement les zones reliées au large.
        mouille = sol < niveau
        zones, _ = ndimage.label(mouille)
        mer = np.isin(zones, np.unique(zones[large & mouille])) & (zones > 0)
        generateur = contourpy.contour_generator(xs, ys, mer.astype(np.float32), line_type="Separate")
        lignes = []
        for brute in generateur.lines(0.5):
            for morceau in morceaux_de_rivage(np.asarray(brute), hors_releve):
                ligne = LineString(morceau)
                if ligne.length < LONGUEUR_MIN_TRAIT_M:
                    continue
                simple = ligne.simplify(TOLERANCE_SIMPLIFICATION_M)
                lon, lat = VERS_WGS84.transform(*np.asarray(simple.coords).T)
                lignes.append(
                    [[round(float(a), 5), round(float(b), 5)] for a, b in zip(lon, lat, strict=True)]
                )
        resultat.append({"hauteur_m": niveau, "lignes": lignes})
        longueur = sum(
            LineString(np.asarray(VERS_L93.transform(*np.asarray(li).T)).T).length for li in lignes
        )
        print(f"  trait à {niveau} m : {len(lignes)} lignes, {longueur / 1000:.1f} km", file=sys.stderr)
    return resultat


def main() -> None:
    dossier, sortie = Path(sys.argv[1]), Path(sys.argv[2])
    print("Mosaïque du MNT 1 m…", file=sys.stderr)
    grille = mosaique(dossier)
    print(f"  {np.isfinite(grille).mean():.0%} de l'emprise relevée", file=sys.stderr)
    plages = []
    for nom, latitude, longitude in PLAGES:
        p = profils(grille, latitude, longitude)
        print(f"{nom} : {len(p)} profils", file=sys.stderr)
        plages.append({"nom": nom, "latitude": latitude, "longitude": longitude, "profils": p})
    print("Traits de côte…", file=sys.stderr)
    donnees = {
        "source": "Litto3D® partie maritime Normandie et Hauts-de-France 2016-2018 — Shom - ROLNHDF, 2022",
        "zh_sous_ign69_m": ZH_SOUS_IGN69_M,
        "plages": plages,
        "traits": traits(grille),
    }
    sortie.parent.mkdir(parents=True, exist_ok=True)
    sortie.write_text(json.dumps(donnees, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"→ {sortie} ({sortie.stat().st_size / 1000:.0f} ko)", file=sys.stderr)


if __name__ == "__main__":
    main()
