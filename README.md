# Oh Hisse !

> Muscu, mer, récup : un seul gestionnaire.

Application web personnelle qui réunit quatre espaces : **Streetlifting**, **Marine**, **Vie courante** et **Objectifs**. Elle croise leurs données pour guider le quotidien : quelle séance faire aujourd'hui, quand aller à l'eau et avec quel équipement, si je suis récupéré, si j'ai mérité mon cheat meal.

Ce n'est pas quatre applis juxtaposées : chaque donnée saisie sert ailleurs. Le sommeil allège la séance du jour, une nage en eau froide pèse dans le verdict cheat meal, l'objectif structure les blocs d'entraînement.

| Espace | Rôle |
|---|---|
| 🏋️ **Streetlifting** | Carnet d'entraînement : saisie, 1RM estimé sur poids du corps + lest, séance suivante auto-régulée |
| 🌊 **Marine** | Assistant de sortie en mer à Ouistreham, Colleville et Hermanville : marée, créneau, tenue, niveau de danger |
| 🛌 **Vie courante** | Sommeil, pesée, récupération, cheat meal, briefings |
| 🎯 **Objectifs** | Un cap (un max, une compétition) qui structure les blocs |

## État d'avancement

| Phase | Contenu | État |
|---|---|---|
| 0 — Cadrage | Cahier des charges, API externes, décisions | ✅ |
| 1 — Fondations | Backend, frontend, base, authentification, navigation | ✅ `v0.1.0` |
| 2 — Streetlifting + Objectifs | Séances, 1RM, blocs, auto-régulation | ✅ `v0.2.0` |
| 3 — Marine | Météo marine, marées, danger, assistant, carnet, carte | ✅ `v0.3.0` |
| 4 — Vie courante + croisements | Sommeil, récupération, cheat meal, briefings | ✅ `v0.4.0` |
| 5 — Accueil, démo, mise en ligne | Données de démo, finitions, production | ⏳ |

Le détail est dans le [cahier des charges](docs/cahier-des-charges/00%20-%20Sommaire.md) (coffre Obsidian) et le [journal de développement](docs/JOURNAL.md).

## Stack

| Couche | Choix |
|---|---|
| Frontend | React 19, TypeScript 7 (strict), Vite 8, Motion, visx, MapLibre GL, CSS Modules |
| Backend | Python 3.14, FastAPI, SQLModel, Alembic |
| Base | SQLite en local, PostgreSQL en production |
| Données externes | Open-Meteo (météo et marine, sans clé), OpenFreeMap (fond de carte) |
| Qualité | pytest, Vitest, Ruff, mypy strict, oxlint, Prettier, GitHub Actions |

Toute la logique « intelligente » (auto-régulation, récupération, danger…) vit dans `backend/app/moteurs/`, sous forme de **fonctions pures et testées** : elles reçoivent des données et renvoient un résultat, sans toucher à la base ni au réseau.

## Lancer en local

Prérequis : [uv](https://docs.astral.sh/uv/) et Node.js 24.

```bash
# Configuration (facultative en local)
cp .env.example .env

# API — http://localhost:8000/api/docs
cd backend
uv sync
uv run alembic upgrade head
uv run python scripts/creer_compte.py   # crée ton compte personnel
uv run uvicorn app.main:app --reload --timeout-graceful-shutdown 1

# Interface — http://localhost:5173
cd frontend
npm install
npm run dev
```

Un exemple de bloc prêt à importer : [`docs/exemples/bloc-force.json`](docs/exemples/bloc-force.json).

Le mode démo ne demande aucun compte : chaque visiteur reçoit son propre bac à sable de données fictives, effacé au bout de 24 h.

## Sécurité

- Mots de passe hashés avec bcrypt, vérification à temps constant
- Session en cookie **httpOnly** (`SameSite=Lax`, `Secure` en production) : un script injecté ne peut pas la lire
- Même message pour un email inconnu et un mauvais mot de passe ; connexion limitée à 5 essais par minute
- Chaque donnée appartient à un utilisateur : un compte démo ne peut jamais lire ni modifier les données personnelles
- Les API externes ne sont appelées que par le backend

## Organisation Git

GitHub Flow : `main` est protégée, chaque brique a sa branche (`feature/…`, `fix/…`, `docs/…`) et passe par une pull request vérifiée par la CI. Les commits suivent [Conventional Commits](https://www.conventionalcommits.org/fr/), et chaque phase est taguée (`v0.1.0` = fondations).

## Licence

[MIT](LICENSE)
