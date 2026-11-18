# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] (Non publié)

## [0.1.0] — 2026-11-18 — Fondations

### Ajouté
- Backend FastAPI (Python 3.14, uv) : configuration par variables `OH_HISSE_*`, CORS restreint, route de santé.
- Base de données SQLModel + migrations Alembic, table des utilisateurs.
- Authentification : bcrypt, JWT en cookie httpOnly, limitation des tentatives, script de création de compte.
- Mode démo : bac à sable par visiteur, effacé après 24 h ou en quittant la démo.
- Frontend React + TypeScript : client API typé depuis l'OpenAPI du backend, jetons de design par espace.
- Écran de connexion animé, bandeau du mode démo.
- Accueil en croix avec briefing du jour, animation d'entrée, transitions directionnelles entre les espaces.
- Identité de chaque espace : couleur, police et motif animé.
- CI GitHub Actions : format, lint, types, tests, build, migrations et types d'API à jour.
- Note de recherche sur les API externes et prototype de comparaison des marées (phase 0).

### Modifié
- Cahier des charges : décisions de la phase 0 (nom, stack, formule du 1RM, mode démo, source des marées).
- Dossier `docs/Cahier des charges` renommé en `docs/cahier-des-charges`.

### Corrigé (phase 0)
- `.gitignore` : `node_modules/` et `*.db` n'étaient pas ignorés.
- Noms des notes 09 et 13 mal encodés.
- README : la version de npm était présentée comme celle de Vite.