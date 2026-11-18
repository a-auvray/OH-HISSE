# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] (Non publié)

### Ajouté
- Note de recherche sur les API externes (météo, marine, marées, relief) pour la zone Ouistreham – Hermanville.
- Prototype de comparaison des marées Open-Meteo / annuaire SHOM.

### Modifié
- Cahier des charges : décisions de la phase 0 (nom, stack, formule du 1RM, mode démo, source des marées).
- Dossier `docs/Cahier des charges` renommé en `docs/cahier-des-charges`.

### Corrigé
- `.gitignore` : `node_modules/` et `*.db` n'étaient pas ignorés.
- Noms des notes 09 et 13 mal encodés.
- README : la version de npm était présentée comme celle de Vite.