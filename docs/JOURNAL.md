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
