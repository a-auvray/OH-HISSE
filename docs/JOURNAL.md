# Journal de bord

## Modèle d'entrée

**Date :** [JJ/MM/AAAA]
**Branche :** [type/espace-fonctionnalite]

### Ce qui a été fait
- 

### Choix techniques
- 

### Ce qui a bloqué / Solutions trouvées
- 

---

## 18/11/2026 — Phase 0 : cadrage

**Branches :** `chore/hygiene-depot`, `docs/cadrage-phase-0`

### Ce qui a été fait
- Dépôt assaini : `.gitignore` réparé (`node_modules` et `*.db` n'étaient pas ignorés à cause de retours à la ligne manquants), noms de notes réencodés en UTF-8, dossier `docs/cahier-des-charges` aligné sur l'arborescence du CDC.
- API externes testées sur Ouistreham, Colleville-Montgomery et Hermanville-sur-Mer → [`docs/recherche/api-externes.md`](recherche/api-externes.md).
- Prototype de marée (`prototypes/marees/comparer_marees.py`) comparé à l'annuaire SHOM de Ouistreham.
- Décisions de la phase 0 reportées dans le CDC (notes 00, 01, 03, 04, 07, 09 à 13).

### Choix techniques
- **Marées sans service payant.** La hauteur d'eau d'Open-Meteo, décalée de +4,9 m pour la ramener au zéro hydrographique, colle à l'annuaire à ±0,22 m. Les horaires dérivent jusqu'à 1 h 30 en mortes-eaux, à cause de la tenue du plein de la baie de Seine : l'appli affichera donc une estimation.
- **Coefficient recalculé** par sa définition SHOM (marnage à Brest / 6,10 m) : 0 à 3 points d'écart.
- **1RM : formule RPE seule**, sur poids du corps + lest.

### Ce qui a bloqué / Solutions trouvées
- Le service de maree.shom.fr n'est pas une API publique : écarté. La comparaison s'est faite sur l'annuaire publié par maree.info.
- RGE ALTI (IGN) s'arrête au haut de plage (≈ −0,4 m IGN69) : l'estran découvert à marée basse demandera Litto3D, ou la pente par spot.

---

## 18/11/2026 — Phase 1 : fondations (`v0.1.0`)

**Branches :** `feature/socle-backend`, `feature/socle-frontend`, `feature/base-de-donnees`, `feature/authentification`, `feature/coquille-navigation`

### Ce qui a été fait
- Socle backend (FastAPI, uv, Ruff, mypy strict) et frontend (React 19, TypeScript 7, Vite 8), CI sur les deux.
- Base SQLModel + Alembic, table `utilisateur`.
- Authentification par cookie httpOnly, mode démo en bac à sable, script de création de compte.
- Écran de connexion, accueil en croix, transitions directionnelles, identité visuelle des quatre espaces.

### Choix techniques
- **Types d'API générés** depuis l'OpenAPI de FastAPI. La CI échoue si le backend change sans que les types suivent : le front et le back ne peuvent plus diverger.
- **Cookie httpOnly plutôt que localStorage** : le jeton est hors de portée du JavaScript. Le frontend demande donc l'état de session à `/api/auth/moi`.
- **Proxy Vite** `/api` → FastAPI : même origine en local, donc pas de souci de cookie inter-domaines.
- **Bac à sable démo par visiteur**, supprimé par cascade : l'isolation repose sur la même règle que la protection des données perso (chaque ligne appartient à un utilisateur).
- **Transitions** : la page qui entre et celle qui sort bougent ensemble (`AnimatePresence`). Le sens du trajet est calculé en état dérivé, pas dans une ref, sinon le double rendu de StrictMode le fausse.
- **oxlint** au lieu d'ESLint : c'est le linter du gabarit Vite, et ESLint gère mal TypeScript 7.

### Ce qui a bloqué / Solutions trouvées
- `openapi-fetch` capture `fetch` à sa création, donc les tests ne pouvaient pas simuler le réseau → `fetch` est résolu à chaque appel.
- Le moteur de test SQLite en mémoire donnait une base vide à chaque connexion → connexion unique partagée (`StaticPool`).
- PyJWT signalait une clé HMAC trop courte → 32 caractères minimum imposés dans la configuration.
- Une PR empilée sur une autre a été fermée par GitHub quand sa branche de base a été supprimée → désormais, une branche part toujours de `main`.
- Le navigateur de test signale « réduire les animations » : l'appli coupe alors les transitions, par accessibilité. Elles ont été vérifiées en les forçant temporairement.

---

## 18/11/2026 — Phase 2 : Streetlifting et Objectifs (`v0.2.0`)

**Branches :** `feature/streetlifting-moteurs`, `feature/streetlifting-seances`, `feature/blocs-objectifs-seance-du-jour`, `feature/streetlifting-interface-seance`, `feature/streetlifting-calendrier-analyse`, `feature/blocs-objectifs-interface`

### Ce qui a été fait
- Moteurs purs : table RPE, 1RM sur poids du corps + lest, poids en moyenne mobile, auto-régulation.
- Modèle de données de la note 09 et API complète : séances, séries, pesées, blocs JSON, objectifs, séance du jour, évolution.
- Interface : séance du jour, saisie (prévu / réalisé), calendrier par blocs, graphiques visx, page des blocs, espace Objectifs avec jauge, briefing de l'accueil.

### Choix techniques
- **Une seule formule** pour le 1RM et la charge proposée : la table RPE. La séance suivante découle du 1RM estimé récent × %(reps, RPE cible).
- **Garde-fous par format** : le ±5 % et le deload se comparent à la dernière séance du même nombre de reps.
- **Accès** : une ligne d'un autre utilisateur répond 404, comme une ligne inexistante. Testé pour un autre compte et pour la démo.
- **Prévu et réalisé sur la même série** : pas de table supplémentaire, et le calendrier affiche les deux.
- **Chargement à la demande** des espaces lourds (visx) : le paquet principal reste sous 500 Ko.

### Ce qui a bloqué / Solutions trouvées
- En test manuel, des triples lourds bridaient la charge d'une série de 8 → garde-fous comparés au même format (2 tests ajoutés).
- Le rechargement de l'API restait bloqué par les connexions gardées par le proxy Vite → `--timeout-graceful-shutdown 1`.
- `calendrier.ts` et `Calendrier.tsx` se télescopaient sous Windows (casse ignorée) → la logique est renommée `chronologie.ts`.
- `ParentSize` (visx) attendait un premier signal de ResizeObserver → hook `useLargeur` qui mesure dès le montage.
- Le tuple `[min, max]` de l'API devenait un tableau côté client → le backend émet une liste de deux nombres.

---

## 18/11/2026 — Phase 3 : Marine (`v0.3.0`)

**Branches :** `feature/marine-services`, `feature/marine-interface`, `feature/marine-carnet`, `feature/marine-danger`, `feature/marine-assistant-interface`, `feature/marine-carte`

### Ce qui a été fait
- Moteur des marées testé contre l'annuaire SHOM sur une vraie série enregistrée ; client Open-Meteo avec cache.
- Espace Marine : conditions, courbe de marée, vent, 48 h ; carnet en trois modes avec conditions relevées.
- Moteurs de danger, de recommandations et d'assistant, avec les seuils validés ; badge, onglet Assistant, easter egg.
- Carte MapLibre : spots, eau, vent et courant animés, tracé de nage vers le carnet.

### Choix techniques
- **Aucun appel réseau dans les tests** : les réponses Open-Meteo du 18/11 sont enregistrées dans `tests/donnees/` et rejouées.
- **Panne d'Open-Meteo** : la dernière réponse connue est servie, marquée périmée, plutôt qu'une erreur.
- **Vent de terre** : la côte regarde vers le nord, un vent du sud pousse vers le large ; c'est un critère à part du niveau de danger.
- **Durées en eau froide** : pas de table officielle ; repères RNLI (15 °C) et 1-10-1 (Giesbrecht), marges prudentes, sources notées au CDC.
- **Pas de fausse précision** : la distance jusqu'à l'eau reste qualitative tant que le relief de l'estran (Litto3D) n'est pas intégré.

### Ce qui a bloqué / Solutions trouvées
- SQLite ignorait le fuseau : 16 h à Paris relu comme 16 h UTC → type de colonne `DateHeureUTC`.
- `carnet.ts` et `Carnet.tsx` se seraient télescopés sous Windows → `formulaireSortie.ts`.
- MapLibre 6 n'a plus d'export par défaut → imports nommés ; carte chargée à la demande (~1 Mo).
- L'écart IGN69 / zéro hydrographique à Ouistreham n'est pas trouvable en ligne → à lire dans les Références Altimétriques Maritimes du SHOM avec Litto3D.

---

## 18/11/2026 — Phase 4 : Vie courante et croisements (`v0.4.0`)

**Branches :** `feature/vie-courante-moteurs`, `feature/croisements`, `feature/briefings`, `feature/vie-courante-interface`

### Ce qui a été fait
- Moteurs purs de récupération, de cheat meal, de sommeil et de briefing ; règles validées dans `regles/vie_courante.toml`.
- Croisements : sommeil et récupération → séance du jour ; récupération → assistant de sortie ; tous les espaces → briefings.
- Espace Vie courante (jauges en anneau, saisie rapide, 30 nuits, briefings) ; les quatre indicateurs de l'accueil sont branchés.

### Choix techniques
- **Rien n'est stocké** : récupération, verdict et briefings sont recalculés à chaque demande (note 09), ils ne peuvent pas être périmés.
- **Rejouer les événements dans l'ordre** : chaque séance ou sortie déplace la fin de récupération ; la mer peut l'allonger (nage longue ou froide) ou l'avancer (baignade de récupération active).
- **La forme du jour** passe par le même objet que le sommeil dans le moteur d'auto-régulation : chaque ajustement reste justifié dans la séance.
- **Briefings** : le service rassemble des faits simples, le moteur les met en phrases ; la progression d'un objectif est passée dans un service partagé.

### Ce qui a bloqué / Solutions trouvées
- `str.capitalize()` passait « °C » en « °c » → fonction `majuscule` qui ne touche que la première lettre.
- Un arrondi à la limite (12,45 t) dans un test → donnée de test sans ambiguïté.
- La session de l'aperçu était le compte personnel → vérification de l'interface en lecture seule, sans écrire dans ses données.

---

## 19/11/2026 — Phase 5 : démo, production et estran (`v0.5.0`)

**Branches :** `feature/demo-donnees`, `feature/conteneur`, `feature/postgresql`, `feature/render`, `feature/estran`, `feature/cloture-phase5`

### Ce qui a été fait
- Mode démo pré-rempli : trois semaines de vie cohérente (bloc de force, séances, objectifs, sommeil, pesées, écart, sorties en mer), datées par rapport au jour de la visite.
- Un seul service en ligne : FastAPI sert l'API et l'interface ; image Docker en deux étapes, migrations au démarrage.
- PostgreSQL : pilote psycopg, migrations aller-retour et toute la suite de tests rejouées en CI sur PostgreSQL 17.
- Blueprint Render et guide pas à pas Render + Neon (`docs/DEPLOIEMENT.md`).
- Estran : relief Litto3D du Shom, distance à pied jusqu'à l'eau selon la marée, bord de l'eau tracé sur la carte.

### Choix techniques
- **Même origine pour l'API et l'interface** : le cookie httpOnly circule sans CORS, aucune origine tierce n'est autorisée.
- **Déploiement seulement si la CI est verte** (`autoDeployTrigger: checksPass`) ; la CI construit et démarre aussi l'image.
- **Litto3D préparé une fois** : 2,2 Go téléchargés, 274 ko gardés dans le dépôt (profils et traits de côte). L'outil de préparation déclare ses propres dépendances : l'appli n'embarque ni numpy ni scipy.
- **ZH = IGN69 − 4,08 m** à Ouistreham, trouvé dans les Références Altimétriques Maritimes du Shom (couche WFS publique).
- **Profils perpendiculaires au rivage** : la côte fait ≈ 25° entre Hermanville et Colleville ; marcher « vers le nord » allongeait la distance d'environ 10 %.
- **Bord de l'eau = eau reliée au large** : les bâches et les contours à l'intérieur des terres ne sont pas la mer.

### Ce qui a bloqué / Solutions trouvées
- Les tests d'isolement supposaient une démo vide → ils vérifient maintenant que mes données n'y apparaissent pas.
- Le limiteur de la démo débordait d'un test à l'autre → remis à zéro avant chaque test (`conftest.py`).
- L'URL de Neon (`postgresql://`) aurait chargé psycopg2 → convertie pour psycopg.
- Le téléchargement Litto3D calait → reprise automatique avec détection de blocage (`curl -C -`).
- Le contour du masque « mer » suivait aussi le bord du relevé → lignes coupées là où elles longent une zone sans données.
- Une cuvette mal détectée dans le moteur (le test d'eau continue s'arrêtait un point trop tôt) → trouvée par les tests, corrigée.

---

## 23/11/2026 — Thèmes : le socle

**Branche :** `feature/themes-socle`

### Ce qui a été fait
- Refonte du design décidée à partir d'un lookbook de 13 directions (accueil, transitions, deux par espace), toutes jugées bonnes : plutôt que d'en choisir une, l'application aura plusieurs thèmes complets, changeables dans l'interface (`docs/THEMES.md`).
- Socle : registre de thèmes, fournisseur qui charge seulement le thème choisi, sélecteur discret (thème, favoris, niveau d'animation Cinéma / Sobre / Immobile), voile pendant le changement.
- Le design d'origine devient le thème « Classique », sans aucun changement visible.
- Garde-fous : test de contrat (chaque thème fournit l'accueil, les quatre espaces et sa transition) et budget de poids vérifié en CI.

### Choix techniques
- **Thèmes globaux, transitions comprises** : mélanger les pièces de deux thèmes sonnerait faux.
- **Thème = présentation seulement** : données, logique et routes restent communes, pour éviter les écarts et les bugs entre thèmes.
- **Chargement à la demande, préchauffé au survol** : le paquet de départ passe de 137 à 125 ko gzip, les polices des espaces suivent leur thème.
- **Réglages dans le navigateur** (`localStorage`) pour l'instant ; les mettre dans le profil viendra si besoin.

### Ce qui a bloqué / Solutions trouvées
- Les prototypes du lookbook plantaient dans une fenêtre de taille nulle (onglet en arrière-plan) : leur script attend maintenant une vraie taille. Ils restent un outil de choix, pas du code repris tel quel.
