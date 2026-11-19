# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] (Non publié)

## [0.5.0] — 2026-11-19 — Démo, production et estran

### Ajouté
- Mode démo pré-rempli : trois semaines d'entraînement dans un bloc de force, deux objectifs, sommeil, pesées, un écart et quatre sorties en mer, datés par rapport au jour de la visite.
- Un seul service en ligne : FastAPI sert l'API et l'interface (image Docker, migrations au démarrage).
- Pilote PostgreSQL (psycopg) ; l'URL fournie par l'hébergeur se colle telle quelle.
- CI : migrations et tests rejoués sur PostgreSQL.
- Blueprint Render (`render.yaml`) et guide de mise en ligne Render + Neon.
- Marine : distance à pied jusqu'à l'eau selon la marée, sur le relief Litto3D de l'estran ; le bord de l'eau est tracé sur la carte ; l'assistant parle en mètres de marche.
- Accueil : lien vers le briefing du jour complet.

### Modifié
- Versions du backend et du frontend alignées sur les tags (0.5.0) : `/api/sante` donne la vraie version.

## [0.4.0] — 2026-11-18 — Vie courante et croisements

### Ajouté
- Récupération : durée selon le type de séance, allongée par un ressenti rouge ou une nuit courte, modulée par les sorties en mer.
- Verdict « écart mérité ? » par points sur 48 h, avec sa raison ; suivi des écarts pris.
- Sommeil : saisie rapide de la nuit, moyenne sur 7 jours, 30 dernières nuits.
- Croisements : le sommeil et la récupération allègent la séance du jour ; l'assistant de sortie propose une baignade de récupération.
- Briefings du jour, de la semaine, de début et de fin de bloc.
- Espace Vie courante ; indicateur « Récupération » sur l'accueil.

### Supprimé
- La page d'attente des espaces : les quatre espaces sont construits.

## [0.3.0] — 2026-11-18 — Marine

### Ajouté
- Marées : pleines et basses mers, hauteur au zéro hydrographique, coefficient via Brest ; vérifiées contre l'annuaire SHOM.
- Client Open-Meteo avec cache et repli sur la dernière réponse en cas de panne.
- Espace Marine : conditions en direct, courbe de marée, rose des vents, 48 h heure par heure.
- Niveau de danger vert / rouge / noir avec ses raisons, dont le vent de terre.
- Assistant de sortie : meilleurs créneaux, temps dans l'eau froide, tenue, sens de nage, gestes de sécurité.
- Carnet de sortie (baignade, nage, plongée) avec conditions relevées automatiquement.
- Carte de la côte : spots, eau, vent et courant animés, tracé de nage.
- Easter egg « Essuyer une tempête ! ».
- Accueil : l'indicateur « En mer ».

### Corrigé
- Les dates-heures sont stockées en UTC (SQLite ignorait le fuseau).

## [0.2.0] — 2026-11-18 — Streetlifting et Objectifs

### Ajouté
- Moteurs de règles : table RPE, 1RM estimé sur poids du corps + lest, poids du corps en moyenne mobile, auto-régulation (charge tirée du 1RM, ±5 %, deload localisé, séries dans la plage du bloc, justification).
- Règles de l'auto-régulation dans `backend/app/moteurs/regles/autoregulation.toml`.
- Tables et API : exercices, séances, séries (prévu et réalisé), pesées, blocs, objectifs.
- Blocs importés depuis un fichier JSON ; séance du jour calculée.
- Espace Streetlifting : séance du jour, saisie, calendrier par blocs, graphiques d'évolution (visx), page des blocs.
- Espace Objectifs : jauge de progression vers la cible, objectif principal, statuts.
- Briefing de l'accueil : séance du jour et objectif principal.

### Modifié
- Les sous-pages d'un espace ne font plus glisser tout l'écran.
- Les espaces Streetlifting et Objectifs sont chargés à la demande.

### Corrigé
- Les garde-fous de l'auto-régulation comparent au même format de répétitions.
- Rechargement automatique de l'API bloqué par les connexions du proxy Vite.

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