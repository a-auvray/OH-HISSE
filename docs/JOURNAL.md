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

---

## 23/11/2026 — Thème Papier : l'accueil

**Branches :** `feature/accueil-donnees`, `feature/theme-papier`

### Ce qui a été fait
- Les données du briefing sortent de l'affichage (`useBriefing`) : les thèmes en montrent le même contenu sans le recalculer.
- Phrase du jour calculée à partir des données (repos si la récupération n'est pas finie, sinon le type de bloc ; la mer ouverte, fermée ou « avant 17 h »).
- Thème Papier, accueil : feuille crème aux quatre bords repliés (un mot géant par espace), un bloc par espace avec sa jauge de progression, courbe de marée avec le danger heure par heure, ton jour et ton soir (couleurs inversées). Il apparaît dans le sélecteur ; ses espaces restent ceux de Classique pour l'instant.

### Choix techniques
- **Accueil lisible d'abord** : texte plus gros et mieux contrasté que dans le prototype, détails au survol retirés des infos essentielles.
- **Ton jour/soir propre au thème**, mémorisé dans le navigateur ; couleurs de danger identiques dans les deux tons.
- **Courbe de marée sans bibliothèque** (Catmull-Rom en Bézier) : le thème pèse 4 ko de JS.

### Ce qui a bloqué / Solutions trouvées
- Un test de l'accueil Classique manquait de `heures` et de `marees` dans ses données simulées, que la phrase du jour lit : complété pour coller à l'API réelle.
- Un test du sélecteur a échoué une fois sur une machine chargée : délai des attentes asynchrones élargi.

---

## 23/11/2026 — Thème Papier : la coque des espaces

**Branche :** `feature/papier-coque`

### Ce qui a été fait
- Coque commune des espaces Papier (feuille, en-tête et onglets, dos du pli vers l'accueil, ton jour/soir partagé avec l'accueil), avec une identité par espace : police, couleur et décor propres.
- Streetlifting, Marine et Vie courante passent dans la coque. Leurs pages intérieures s'affichent sur une plaque d'imprimerie qui garde leurs couleurs d'origine, en attendant leurs versions Papier.
- Les données de Marine (plages, conditions) sortent de l'affichage (`useMarine`), partagées par les deux thèmes.

### Choix techniques
- **Plaque plutôt que réécriture des 25 feuilles de style** : recolorer toutes les pages d'un coup mélangeait des fonds sombres écrits en dur et des textes devenus noirs, donc illisibles. Chaque page quitte la plaque quand elle est refaite.
- **Ton partagé par un petit magasin externe** (`useTon`) : le changer sur l'accueil le change dans les espaces, sans contexte à passer.
- **Défilement dans le contenu** : l'en-tête et le dos du pli restent en place.

---

## 23/11/2026 — Thème Papier : Marine, les conditions

**Branche :** `feature/papier-marine`

### Ce qui a été fait
- Page « Conditions » de Marine refaite pour Papier : la réponse d'abord (« Vas-y entre 13h30 et 15h30. », « Pas avant 9h. »), puis la plage en coupe dessinée à la gravure — sable en pointillé, eau en hachures qui monte et recule avec la marée, houle qui dérive selon la période — et un curseur pour voyager dans le temps.
- Instruments au trait (thermomètre avec le seuil de choc thermique à 15 °C, vent, vagues, courant, ciel) et frise de 48 heures (hauteur : le vent, couleur : le danger), qui suivent l'heure choisie.
- Le titre « answer-first » (`titreMarine`) et le meilleur créneau (`useCreneau`) sont communs aux thèmes.

### Choix techniques
- **Coupe schématique mais cohérente** : l'altitude du sable décroît toujours, ce qui permet de trouver la ligne de rivage par dichotomie pour n'importe quelle hauteur de marée.
- **Niveau d'eau animé par ressort** vers la valeur choisie, au lieu de sauter.

### Ce qui a bloqué / Solutions trouvées
- `coupe.ts` (géométrie) et `Coupe.tsx` (composant) ne différaient que par la casse : conflit sous Windows. Géométrie renommée `geometrieCoupe.ts`.
- Étiquettes de marée superposées : décalées et limitées à environ un cycle.

---

## 23/11/2026 — Thème Papier : Streetlifting, séance du jour et analyse

**Branche :** `feature/papier-streetlifting`

### Ce qui a été fait
- Séance du jour en « feuille de séance » : un exercice par ligne (rang en contour, nom en Anton, une case à cocher par série, charge en grand qui compte jusqu'à sa valeur), les raisons de l'auto-régulation en marge, l'avancement du bloc en crans qui montent.
- Analyse en une seule grande planche (tracé qui se dessine, hachures, valeur exacte au survol) et un rail de miniatures, une par grandeur : on compare cinq courbes d'un coup d'œil et on met celle qu'on veut sur la planche, sans tableau de bord.
- Les données sortent de l'affichage : `useSeanceDuJour`, `useAnalyse`, `metriques.ts`, partagés avec Classique.

### Choix techniques
- **Planche sans bibliothèque de graphiques** : tracé lisse et graduations ronds calculés à la main (`courbe.ts`), le thème reste à 19 ko de JS.
- **Un seul graphique grand plutôt que cinq petits** : le rail de miniatures suffit à comparer.

### Ce qui a bloqué / Solutions trouvées
- jsdom n'a pas de `ResizeObserver` : un stub muet dans la préparation des tests (les composants qui lisent leur largeur n'affichent alors pas leur graphique, ce que les tests n'ont pas à voir).
- Un axe ne montrait qu'une graduation : le pas de 2,5 est maintenant permis.

---

## 23/11/2026 — Thème Papier : Vie courante, « Aujourd'hui »

**Branche :** `feature/papier-vie-courante`

### Ce qui a été fait
- Page « Aujourd'hui » refaite pour Papier, calme et aérée : la phrase du jour en grand (Instrument Serif en italique), un anneau qui respire pour la récupération, une assiette dont les parts se remplissent pour l'écart mérité, des champs « sous une ligne » pour la nuit et la pesée. Aucun encadré, beaucoup d'air : tout l'inverse de Streetlifting.
- Les données et les trois gestes (noter l'écart, la nuit, la pesée) sortent de l'affichage dans `espaces/vie-courante/etat.ts`, partagés avec Classique.

### Choix techniques
- **Mêmes gestes dans les deux thèmes** : les fonctions `noterEcart`, `noterNuit` et `peser` sont communes, donc aucune fonctionnalité n'existe dans un seul thème.
- **Mouvement = souffle** : trois anneaux décalés qui respirent sur 7 secondes, rien ne clignote.

---

## 23/11/2026 — Thème Papier : Objectifs

**Branche :** `feature/papier-objectifs`

### Ce qui a été fait
- Espace Objectifs refait pour Papier : chaque objectif est une **drisse**, un fil vertical qu'on hisse. La pince monte (avec un ressort lent) à hauteur du pourcentage atteint, la cible flotte en haut, le fil est plein jusqu'à la pince et en pointillé au-dessus. Le principal est grand, avec sa fiche (mouvement, cible, échéance, 1RM estimé, blocs) ; les autres sont alignés à côté.
- Identité propre : violet, capitales larges (Unbounded), chiffres en mono, règle graduée le long du bord de la page.
- Données et gestes (créer, marquer atteint, abandonner, reprendre, mettre en avant, supprimer) sortent de l'affichage dans `espaces/objectifs/useObjectifs.ts`, partagés avec Classique.

### Choix techniques
- **Un fil par objectif, pas un graphique** : la tension vers la cible se lit sans légende, et c'est ce que le cahier des charges demandait (« la tension vers la cible »).
- **Même formulaire, même validation** : `creerObjectif` est commun.

---

## 23/11/2026 — Thème Papier : la transition

**Branche :** `feature/papier-transition`

### Ce qui a été fait
- Transition propre au thème : en entrant dans un espace, sa page se **déplie comme un rabat**, articulée sur le bord par lequel on y arrive (Marine sur son bord gauche, Vie courante sur son bord bas…), avec l'ombre du pli qui s'efface à mesure qu'elle s'ouvre. L'accueil reste dessous, tassé et assombri. Au retour, la page se replie.
- Le niveau d'animation s'applique : « Sobre » raccourcit la transition et réduit l'angle, « Immobile » la coupe.
- Les quatre espaces sont maintenant ceux de Papier : le thème ne charge plus Classique, et chaque espace ne se charge qu'à son ouverture (le thème pèse 5 ko de JS au départ).

### Choix techniques
- **La scène connaît son espace** (nouvelle propriété `espace` de `PropsScene`, nulle pour l'accueil) : la charnière se déduit de l'espace, pas du sens du trajet, donc l'aller et le retour utilisent le même pli.
- **L'espace est toujours au-dessus de l'accueil** (z-index), que l'on entre ou que l'on sorte : le rabat recouvre ou découvre l'accueil sans calcul de sens.
- **Polices rapatriées dans Papier** (Anton, Fraunces) puisqu'il n'importe plus Classique.

### Ce qui a bloqué / Solutions trouvées
- Après des changements de branche, Vite servait un ancien module (la page Marine montrait l'ancienne vue) : relance du serveur de développement, comme noté dans mes notes de projet.

---

## 24/11/2026 — Usage quotidien en local

**Branche :** `feature/lancement-local`

### Ce qui a été fait
- `lancer.bat` : construit l'interface, migre la base, sauvegarde, démarre sur http://localhost:8000 et ouvre le navigateur.
- Sauvegarde de la base SQLite (`app/core/sauvegarde.py`, `scripts/sauvegarder.py`) : copie datée cohérente même si l'application tourne, les 30 dernières gardées dans `sauvegardes/` (ignoré par Git). Sans effet sur PostgreSQL.
- Mode d'emploi : `docs/UTILISATION.md`.
- Parcours Streetlifting vérifié de bout en bout sur une base jetable : import d'un bloc, pesée, séance du jour, saisie, 1RM estimé, séance suivante avec charges calculées, évolution, suppression. Marine : conditions, assistant et carnet répondent avec les vraies données.

### Choix techniques
- **Sauvegarde par l'API `backup` de SQLite** plutôt qu'une copie de fichier : la copie reste cohérente même pendant une écriture.
- **Une seule adresse** (interface servie par FastAPI) : un seul processus à lancer, aucun proxy.

---

## 24/11/2026 — Un .exe pour lancer l'application

**Branche :** `feature/lanceur-exe`

### Ce qui a été fait
- `Oh Hisse.exe` : un petit lanceur (C#, 8 ko) qui démarre `lancer.bat` depuis son propre dossier et en renvoie le code de sortie, avec une icône (carré encre, « OH » crème, point orange).
- `outils/construire-exe.ps1` le reconstruit en une commande ; `outils/lanceur/Lanceur.cs` en est la source.

### Choix techniques
- **Compilateur fourni avec Windows** (csc.exe du .NET Framework) : rien à télécharger ni à installer, et le code du lanceur est lisible dans le dépôt.
- **Un lanceur, pas une application empaquetée** : la logique reste dans `lancer.bat`, donc une seule chose à maintenir. Le .exe n'est pas versionné (`*.exe` ignoré) ; le script de construction l'est.
- **Non signé** : Windows SmartScreen peut avertir au premier lancement (documenté).

### Correctif : lanceur copié sur le Bureau
- Copié sur le Bureau, le lanceur ne trouvait plus `lancer.bat`. Il mémorise maintenant le dossier du projet à la construction (fichier généré, ignoré par Git) et le cherche à côté de lui, puis à cet endroit.
- Le navigateur n'attend plus d'être ouvert avant le serveur, et la fenêtre reste ouverte en cas de problème (uv ou Node absents, port 8000 pris, erreur).

---

## 24/11/2026 — Une vraie application

**Branche :** `feature/appli-bureau`

### Ce qui a été fait
- `Oh Hisse.exe` devient une application : plus de fenêtre noire ; le serveur démarre en arrière-plan, l'interface s'ouvre dans sa propre fenêtre (navigateur Chromium en mode application, avec un profil à part), et la fermer arrête le serveur. Les erreurs s'affichent dans une boîte de dialogue, le détail dans `journal-lancement.txt`.
- Papier devient le thème par défaut (Classique reste le thème de secours). Les réglages ne sont mémorisés qu'après un vrai choix, et sous une nouvelle clé : l'ancienne avait figé Classique dès la première visite, d'où « ça démarre l'ancienne version ».
- Port configurable (`OH_HISSE_PORT`).

### Choix techniques
- **Mode application d'un navigateur déjà installé** plutôt qu'Electron ou Tauri : aucun téléchargement de plusieurs dizaines de Mo, pas de moteur de plus à maintenir. Brave, Chrome, Edge et Opera sont reconnus.
- **Profil dédié** (`%LOCALAPPDATA%\OhHisse\profil`) : la fenêtre est un processus à elle, que le lanceur peut attendre pour savoir quand arrêter le serveur.

### Ce qui a bloqué / Solutions trouvées
- Le lanceur n'arrivait jamais à voir le serveur : sa vérification passait par le proxy système et par `localhost` (IPv6 d'abord, alors que le serveur n'écoute qu'en IPv4). Elle interroge maintenant `127.0.0.1` sans proxy. Trouvé en suivant l'état du serveur, de la fenêtre et du lanceur seconde par seconde.

---

## 24/11/2026 — Pas d'écran de connexion en local

**Branche :** `feature/sans-connexion-local`

### Ce qui a été fait
- Mode `OH_HISSE_SANS_CONNEXION=1` : sans jeton valide, l'API ouvre le compte personnel (le premier compte non démo). L'interface reçoit un utilisateur connecté dès son premier appel : l'écran de connexion n'apparaît jamais.
- Activé par `lancer.bat` (donc par `Oh Hisse.exe` et le raccourci). Le travail commencé sur un écran de connexion Papier est mis de côté (remisé), « on verra plus tard ».

### Choix techniques
- **Garde-fous plutôt qu'un simple interrupteur** : le serveur refuse de démarrer en production avec ce mode, ne sert que `localhost` / `127.0.0.1` (contre le « DNS rebinding » : un site qui ferait résoudre son nom vers localhost ne peut pas atteindre l'application), et ne choisit jamais un bac à sable démo.
- **Rien ne change pour la mise en ligne** : sans la variable, la connexion reste obligatoire, comme avant.

### Ce qui a bloqué / Solutions trouvées
- Mes nouveaux tests faisaient échouer deux tests d'autres fichiers : la fixture vidait le cache de configuration avant de restaurer l'environnement, ce qui gardait le mode actif pour la suite. L'environnement est restauré d'abord.

---

## 24/11/2026 — Icône et raccourci

**Branche :** `feature/icone-raccourci`

- Nouvelle icône, dessinée par le script de construction : fond nuit en dégradé, la croix des quatre espaces (vert en haut, orange à gauche, bleu à droite, violet en bas) autour d'un « ! » crème. Un seul fichier `.ico` à cinq tailles (256, 64, 48, 32, 16) pour rester net partout.
- `outils/creer-raccourci.ps1` crée le raccourci « Oh Hisse » sur le Bureau avec cette icône.
- Essai en conditions réelles par le raccourci : démarrage en 6 s, fenêtre « Oh Hisse ! », arrêt complet du serveur à la fermeture.
- Corrigé au passage : les routes prenaient le jour du serveur (UTC) au lieu du jour de Paris, donc entre minuit et 1 h ou 2 h à Paris l'application et ses tests n'étaient pas d'accord sur la date. Tout passe par `vie_courante.aujourdhui()`.

---

## 24/11/2026 — Accueil Papier plus lisible

**Branche :** `feature/papier-accueil-lisible`

- Le centre de l'accueil est posé un peu plus haut (surface plus claire, filet, ombre légère) et un filet sépare la croix des quatre espaces : les frontières se lisent mieux.
- La phrase du jour dit enfin quelque chose d'utile : la séance du jour en gros (« Force · séance 9/12 »), son premier exercice dessous, puis la récupération et la mer en clair. Fini « la mer est fermée » : « Mer : danger rouge, vent 15 km/h. Pas de sortie conseillée. »
- Le mode sombre existait déjà (un petit « Soir » presque invisible) : le bouton s'appelle « Mode sombre / Mode clair » et se voit.

---

## 24/11/2026 — Pages intérieures accordées au thème

**Branche :** `feature/papier-pages-accordees`

### Ce qui a été fait

- Fini la « plaque » sombre : saisie, calendrier, blocs, sommeil, briefings, assistant, carte et carnet s'affichent maintenant aux couleurs de la feuille, en clair comme en sombre.
- Les feuilles de style de ces pages n'écrivent plus aucune couleur de surface en dur : elles utilisent des jetons (`--surface`, `--creux`, `--filet`, `--sur-accent`…) que chaque thème redéfinit. Classique garde ses valeurs d'origine, Papier donne les siennes ; un futur thème n'a qu'à faire de même.

### Ce qui a bloqué / Solutions trouvées

- Le panneau « Récapitulatif » de la saisie débordait de sa carte et sous le dos du pli (les champs et les neuf boutons de ressenti avaient une largeur minimale plus grande que la colonne) : colonnes `minmax(0, 1fr)`.
- La carte de Marine reste sombre : c'est son fond de carte.

---

## 24/11/2026 — Panneaux dépliables

**Branche :** `feature/papier-bandeau-panneaux`

- Nouveau composant `Panneau` (thème Papier) : un titre et un résumé toujours visibles, le détail se déplie dessous, et le choix est retenu d'une visite à l'autre. Même geste, même place partout.
- Appliqué là où l'écran était chargé : les raisons de chaque charge (séance du jour), la frise des 48 heures (Marine), le pourquoi de la récupération et le détail des points de l'écart (Vie courante). L'essentiel reste lisible d'un coup d'œil, la précision est à un clic.
- Les lignes de houle derrière le contenu de Marine sont plus discrètes : elles gênaient la lecture du bas de page.

---

## 24/11/2026 — Thème Estampe

**Branche :** `feature/theme-estampe`

### Ce qui a été fait
- Troisième thème : **Estampe**. Un accueil en canvas 2D où quatre faisceaux de fils d'encre partent des bords et disent chacun une donnée par leur mouvement (récupération, bloc, danger de la mer, progression), un centre qui est le briefing, et une transition en « passe d'encre ». Jour ou sombre.
- Les quatre espaces, avec toutes leurs pages, s'affichent dans une coque d'imprimeur (en-tête de relevé, faisceau de fils sur le bord d'entrée). Le mode sombre est maintenant un réglage commun à Papier et Estampe (`themes/ton.ts`).
- Pour que les pages d'origine servent à tous les thèmes : elles ne contiennent plus aucune couleur en dur (jetons de surface, y compris le texte du danger en mer), la page Objectifs est séparée de son enveloppe Classique, et les barres de défilement suivent le ton.

### Ce qui a bloqué / Solutions trouvées
- `fils.ts` et `Fils.tsx` ne diffèrent que par la casse : tsc refuse sous Windows. Le modèle s'appelle `modele.ts`.
- Les libellés des bords tombaient dans la réserve du centre : ils sont maintenant au bord de l'écran, sur une petite plaque qui coupe les fils.

---

## 24/11/2026 — Thème Matière

**Branche :** `feature/theme-matiere`

### Ce qui a été fait
- Quatrième thème : **Matière**, un banc d'essai. Sur une dalle de carbone (sombre) ou de béton (jour), quatre plaques en croix : de l'acier poli par le bloc aux couleurs de revenu de la friction, un estran que la vraie marée couvre, de l'albâtre éclairé par la récupération, un polymère aux franges de contrainte qui se resserrent vers la cible. Au centre, le briefing sur la dalle nue.
- Les espaces portent l'échantillon de leur matière. La transition est une plaque qui se pose.
- Les quatre espaces communs sont maintenant fabriqués par `themes/espacesCommuns.tsx` : un thème n'écrit plus que sa coque, les pages sont partagées et accordées par les jetons. Estampe en profite aussi.

### À savoir
- Pas de WebGL : tout est en canvas 2D, le thème pèse 5 ko de JS.

---

## 24/11/2026 — Panneaux accordés dans Estampe et Matière

**Branche :** `feature/themes-panneaux-accordes`

- Audit page par page d'Estampe et de Matière, clair et sombre. Trois choses n'étaient pas accordées :
  - les titres des cartes de briefing prenaient les polices propres à chaque espace d'origine (Anton, Fraunces…), absentes de ces thèmes : elles sont maintenant des jetons (`--police-streetlifting`…) que chaque coque redéfinit ;
  - les panneaux teintés du carnet, de l'assistant, du sommeil et d'« Aujourd'hui » étaient translucides sur le papier, donc ternes : ils reposent sur `--fond-panneau` ;
  - la carte de Marine restait sombre : elle prend un fond clair dans un thème de jour, et ses surcouches (vent, bord de l'eau, tracé) changent de couleur avec.
- Non vérifié : les tuiles de la carte (pas de réseau dans mon environnement de test) ; seul le cadre et la palette l'ont été.

---

## 24/11/2026 — Vues de Streetlifting propres à Estampe et à Matière

**Branche :** `feature/themes-vues-streetlifting`

- **Estampe :** la séance du jour est un relevé (strates du bloc encrées jusqu'à la séance du jour, tableau réglé, charge en italique) ; l'analyse est mise en page par filets et petites capitales.
- **Matière :** la séance du jour est une plaque d'acier dont les bandes (une par séance du bloc) prennent les couleurs de revenu de la friction, puis une plaque gravée par exercice ; l'analyse est faite de plaques posées sur la dalle.
- Un thème peut maintenant donner ses vues à `EspaceStreetliftingCommun` (celles qu'il ne donne pas restent les pages communes). L'analyse a une structure commune (`AnalyseThemee`) dont la feuille de style fait la page de chaque thème. `Panneau` et la miniature de courbe sont partagés entre thèmes.

---

## 24/11/2026 — Vues de Marine propres à Estampe et à Matière

**Branche :** `feature/themes-vues-marine`

- **Estampe :** les conditions sont un relevé de marégraphe : la marée en courbe d'encre fine hachurée dessous, avec les marées extrêmes en petites capitales et un repère à l'heure choisie ; les instruments sont posés sur des filets, les chiffres en italique.
- **Matière :** la marée est une plaque d'estran (le sable à gauche, l'eau qui arrive par la droite et avance avec la marée, clapot qui dérive, front sombre au rouge, eau noire et figée au noir) ; les instruments sont des plaques gravées.
- Structure commune (`ConditionsThemee`) : la réponse, le graphique du thème, le curseur de temps, cinq instruments, la frise des 48 heures dans un panneau. Le thème fournit sa feuille de style et son graphique.

---

## 24/11/2026 — Vues de Vie courante propres à Estampe et à Matière

**Branche :** `feature/themes-vues-vie-courante`

- **Estampe :** « Aujourd'hui » est un relevé calme : la phrase en italique, la récupération en faisceau de fibres qui s'encrent, l'écart en quatre strates, les rubriques sur filets.
- **Matière :** la récupération est un disque d'albâtre traversé par la lumière du jour (il s'éteint quand on est peu récupéré), l'écart quatre éprouvettes de polymère, les rubriques des plaques.
- Structure commune (`AujourdhuiThemee`) avec les formulaires de nuit et de pesée ; chaque thème donne ses deux jauges et sa feuille de style.

---

## 24/11/2026 — Vues d'Objectifs propres à Estampe et à Matière

**Branche :** `feature/themes-vues-objectifs`

- **Estampe :** chaque objectif est une drisse : des câbles tendus du bord vers le centre, dont le mou disparaît avec la progression ; fiche sur filets, chiffres en italique.
- **Matière :** chaque objectif est une éprouvette de polymère sous lumière polarisée, aux franges de contrainte de plus en plus serrées, cadre net à 100 % ; fiche sur plaque.
- Structure commune `ObjectifsThemee`. Le formulaire de création reste celui des pages communes (aux jetons du thème) : il garde des coins arrondis même dans Estampe, à reprendre si tu veux un formulaire tout en filets.
- Avec cette brique, les quatre espaces ont une vue propre dans Estampe comme dans Matière.

---

## 24/11/2026 — La carte de Marine s'affiche enfin

**Branche :** `fix/carte-travailleur`

- **Cause :** MapLibre 6 charge son travailleur depuis un fichier à part (`maplibre-gl-worker.mjs`) qu'il cherche à côté du morceau de la carte. Vite ne l'embarquait pas : le journal du lanceur montrait `GET /assets/maplibre-gl-worker.mjs → 404`, et la carte restait vide. En développement tout marchait, d'où le piège.
- **Correction :** un petit plugin Vite (`vite.config.ts`) livre le travailleur sous `assets/maplibre-gl-worker.js` (un nom en `.js`, que tout serveur sert en JavaScript), et `Carte.tsx` lui indique cette adresse dans l'application construite.
- **Garde-fou :** `npm run budget` (CI) échoue si le travailleur est absent du build, et lui donne sa propre limite de poids.
- Vérifié dans l'application construite : fond de carte, trait de côte, spots et vent, en ton jour comme en ton sombre.
