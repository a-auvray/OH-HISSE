---
tags:
  - cdc
statut: brouillon
---

# Architecture technique

← [[00 - Sommaire|Sommaire]]

## Stack
| Couche | Choix | Remarque |
|---|---|---|
| Frontend | React (Vite) + CSS personnalisé | Desktop uniquement en V1 |
| Animations | Framer Motion | Transitions entre espaces, jauges, graphiques |
| Graphiques | ❓ Recharts, Chart.js… | À choisir |
| Carte | Leaflet + tuiles OpenStreetMap | Gratuit ; Mapbox en alternative |
| Backend | Python + FastAPI | Même base que le site tableaux |
| ORM | SQLModel | Déjà maîtrisé |
| Base de données | SQLite en local → PostgreSQL | Migration à prévoir avant la mise en ligne |
| Tests | pytest | Au minimum sur les moteurs de règles |

## Moteurs de règles
Toute la logique « intelligente » vit dans un dossier à part, en **fonctions Python pures** : elles reçoivent des données et renvoient un résultat, sans toucher à la base ni aux routes.

| Moteur | Rôle |
|---|---|
| `autoregulation` | Calcule la séance suivante |
| `recuperation` | Estime l'état de récupération |
| `cheat_meal` | Rend le verdict « écart mérité ? » |
| `danger` | Classe une sortie en vert / rouge / noir |
| `recommandations` | Tenue, créneau, direction de nage |
| `briefing` | Assemble les synthèses |

> [!tip] Pourquoi c'est important
> Des moteurs isolés se testent facilement, se modifient sans casser les routes, et montrent à un recruteur une vraie séparation des responsabilités.

## API externes
Principe : **le navigateur n'appelle jamais une API externe directement.** Le backend s'en charge, garde les clés dans `.env`, et met les réponses en cache (ex. 30 à 60 min) pour respecter les limites d'appels.

| Besoin | Piste | Statut |
|---|---|---|
| Météo : air, vent, nuages, lever et coucher du soleil | Open-Meteo | À vérifier |
| Vagues, houle, température de l'eau | Open-Meteo Marine | À vérifier sur la côte normande |
| Marées : horaires, coefficients, hauteurs | Stormglass, SHOM, autre ? | ⚠️ Source à trouver |
| Fond de carte | Leaflet + OpenStreetMap | — |

## Arborescence proposée
Organisée **par espace dès le départ**, pour ne pas se retrouver avec des dizaines de fichiers à plat dans `src/`.

```
projet/
├── backend/
│   ├── app/
│   │   ├── main.py            # lance FastAPI et branche les routes
│   │   ├── core/              # config (.env), sécurité (JWT, hash), connexion BDD
│   │   ├── models/            # tables, un fichier par espace
│   │   ├── routers/           # routes API, un fichier par espace
│   │   ├── moteurs/           # logique métier pure
│   │   └── services/          # appels aux API externes + cache
│   └── tests/                 # tests des moteurs
├── frontend/
│   └── src/
│       ├── accueil/           # connexion, dashboard, animation d'entrée
│       ├── espaces/
│       │   ├── streetlifting/
│       │   ├── marine/
│       │   ├── vie-courante/
│       │   └── objectifs/
│       ├── commun/            # jauges, badges, formulaires partagés
│       └── api/               # tous les fetch + une seule constante API_URL
├── docs/
│   ├── cahier-des-charges/
│   ├── temps/                 # exports Super Productivity
│   └── JOURNAL.md             # journal de développement
├── .env.example               # modèle du .env, sans les vraies valeurs
└── README.md
```

> [!info] Leçon du site tableaux
> Une seule constante `API_URL` dans `frontend/src/api/` : passer du local à ngrok ou à la production ne demandera de modifier qu'une ligne.

## Git — organisation « comme en entreprise »
Modèle : **GitHub Flow**, simple pour un développeur seul et répandu en entreprise.

- `main` est **toujours stable** et protégée sur GitHub : aucun commit direct.
- **Une branche par fonctionnalité**, nommée `type/espace-fonctionnalite` :
  - `feature/streetlifting-saisie-seance`
  - `fix/marine-calcul-maree`
  - `docs/cdc-modele-donnees`
- **Commits** au format `type(espace): description` (convention « Conventional Commits ») → `feat(streetlifting): calcul du 1RM estimé`
- **Fusion par pull request**, même seul : je relis mon propre diff avant de fusionner.
- **Une version taguée à chaque jalon** : `v0.1.0` (fondations) … `v1.0.0` (V1 complète).

## Suivi du temps et portfolio
- Exports **Super Productivity** rangés dans `docs/temps/`
- `docs/JOURNAL.md` : une entrée courte par session (ce que j'ai fait, appris, ce qui a bloqué)
- `README.md` : présentation, captures d'écran, stack, heures cumulées

## Mise en ligne
Plus tard (cf. [[12 - Roadmap et estimation|Roadmap]]) : hébergeur à choisir, HTTPS, CORS limité à l'URL du site, variables d'environnement de production.
