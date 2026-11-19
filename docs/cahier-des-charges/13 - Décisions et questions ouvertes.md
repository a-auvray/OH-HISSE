---
tags:
  - cdc
statut: brouillon
---

# Décisions et questions ouvertes

← [[00 - Sommaire|Sommaire]]

## Décisions prises
| Décision | Pourquoi |
|---|---|
| Application web, pas d'appli native | Cohérent avec Python + React, pas de nouveau langage à apprendre |
| Desktop uniquement en V1 | Usage perso sur PC ; le design n'a aucune contrainte mobile |
| En ligne : compte perso + mode démo | Les visiteurs testent l'appli sans voir mes vraies données |
| Base multi-utilisateurs dès le départ | Ouvrir l'inscription plus tard sans refonte |
| Navigation par clic, quatre espaces autour de l'accueil | Identité forte de chaque espace |
| Pas d'IA : des moteurs de règles en Python | Logique maîtrisée et explicable ; l'IA reste une piste V+ |
| Pas de module nutrition complet | Je ne m'en servirais pas → gestionnaire de cheat meal à la place |
| Pas d'export PDF | Peu utile |
| Pas de mode hors ligne en V1 | J'ai toujours du réseau |
| Git : GitHub Flow, jamais de commit direct sur `main` | Apprendre à travailler comme en entreprise |
| ~~Je code tout moi-même~~ → développement confié à Claude, sous ma validation | Le projet a changé (novembre 2026) ; tout écart au CDC est validé avant d'être codé |
| Jours flexibles : bloc = suite ordonnée de séances, sans jour fixe | Décaler une séance ne doit rien casser |
| Blocs importés depuis un fichier JSON, pas d'IA branchée | Pas d'IA dans l'appli ; l'import est un vrai morceau de backend |
| 1RM en lest = formule RPE (poids du corps + lest, puis retirer le poids du corps) | Le calcul sur le lest seul sous-estime fortement. Formule RPE seule, sans Epley ni Brzycki (cf. [[03 - Streetlifting#Calcul du 1RM estimé|détail]]) |
| L'algorithme n'ajuste que la charge (et les séries dans la plage du bloc) | Le programme reste celui défini par l'utilisateur |
| Système de badges reporté en V+ ; en V1, seul l'easter egg « Essuyer une tempête ! » | Garder la V1 simple ; le badge est une anecdote, pas un objectif |
| Easter egg secret : affiché uniquement au retour d'une nage validée en tempête | Un clin d'œil qui ne pousse pas à sortir par mauvais temps |
| Nom du projet : **Oh Hisse !** | La traction et la mer, en un cri |
| Zone : Ouistreham, Colleville-Montgomery, Hermanville-sur-Mer | Mes plages ; une seule maille marine Open-Meteo les couvre |
| Marées : Open-Meteo recalé au zéro hydrographique, coefficient calculé via Brest | Gratuit, sans clé ; précision mesurée contre l'annuaire SHOM (cf. [`recherche`](../recherche/api-externes.md)) |
| Front en TypeScript, types générés depuis l'OpenAPI | Le front et le back ne peuvent plus se désynchroniser |
| Carte : MapLibre GL + OpenFreeMap | Gratuit, WebGL, animations fluides |
| Graphiques : visx | Rendu entièrement sur mesure |
| Migrations : Alembic dès le départ | Passage à PostgreSQL sans douleur |
| JWT dans un cookie httpOnly | Protégé contre le vol par script (XSS) |
| Mode démo : bac à sable par visiteur, effacé après 24 h | Tout est testable, rien n'est partagé, mes données restent hors d'atteinte |
| Seuils des moteurs en fichiers de configuration | Ajustables sans toucher au code |
| Qualité outillée : uv, Ruff, mypy, ESLint, Prettier, Vitest, CI GitHub Actions | Chaque pull request est vérifiée automatiquement |
| Suivi Super Productivity abandonné, journal conservé | Je ne code plus moi-même ; le journal garde la trace des choix |
| Animations toujours actives, même si le système demande de les réduire | Elles font partie de l'identité de l'appli |
| Seuils de danger vert / rouge / noir, dont le vent de terre (cf. [[04 - Marine#Seuils validés (18/11/2026)|note 04]]) | Côte orientée au nord : un vent du sud pousse vers le large |
| Durées en eau froide prudentes, ×2 avec combinaison, ÷2 en reprise | Seuil de choc thermique 15 °C (RNLI), règle 1-10-1 (Giesbrecht) |
| Easter egg : force 10 (≥ 89 km/h), ton de clin d'œil inquiet, jamais une réussite | Ne pas encourager à sortir par tempête |
| Distance jusqu'à l'eau : relief Litto3D (Shom), profils perpendiculaires au rivage, ZH = IGN69 − 4,08 m ; arrondie à 10 m | Le relief IGN s'arrête au haut de plage ; Litto3D couvre tout l'estran. Repères : marche longue ≥ 250 m, eau au pied ≤ 60 m |
| Récupération, cheat meal et sommeil : règles de la [[05 - Vie courante#Règles validées (18/11/2026)|note 05]] | Heuristiques explicables, ajustables dans un fichier de configuration |
| Exercices de base : tractions, dips, muscle-up (pas de squat) | Mes trois mouvements ; les autres restent ajoutables |
| Lest arrondi à 1,25 kg | Mon plus petit écart de charge disponible |
| Auto-régulation par la table RPE (1RM récent × % cible), ±5 % max, deload localisé après 2 échecs | Une seule formule pour le 1RM et la charge proposée (cf. [[03 - Streetlifting#Règles validées (18/11/2026)|règles]]) |

## Questions ouvertes

### Prioritaires (avant de coder)
- [x] Nom du projet → **Oh Hisse !**
- [x] Programme type d'un bloc → défini dans le fichier JSON du bloc ; l'algorithme n'ajuste que la charge et les séries dans la plage du bloc
- [x] Blocs → importés depuis un fichier JSON, puis rattachés à un objectif
- [x] Source des données de marée → Open-Meteo recalé, coefficient via Brest (cf. décisions)

### Streetlifting
- [x] Poids du corps : pesée hebdomadaire séparée (lundi matin), moyenne mobile 2-3 semaines pour le 1RM
- [x] Cibles de RPE par format et par bloc → [[03 - Streetlifting#Règles validées (18/11/2026)|tableau validé]]

### Marine
- [x] Seuils des niveaux de danger vert / rouge / noir → note 04
- [x] Temps d'exposition en eau froide → RNLI (15 °C), Giesbrecht (1-10-1), Golden et Tipton ; table prudente en note 04
- [x] Carte : ~~Leaflet ou Mapbox ?~~ MapLibre GL ✓ — le bord de l'eau selon la marée est tracé depuis Litto3D

### Vie courante
- [x] Durées de récupération → 96 / 72 / 48 / 24 h selon le type de séance, ajustables (note 05)
- [x] Règles du verdict cheat meal → points sur 48 h (note 05)

### Transversal
- [x] Mode démo → bac à sable par visiteur, effacé après 24 h
- [x] Easter egg : seuil de tempête → vent moyen de force 10 (≥ 89 km/h)
- [x] Easter egg : si le danger avait déconseillé la sortie → oui, mais en clin d'œil inquiet, jamais en réussite
- [x] Librairie de graphiques → visx
- [x] Hébergement → Render (service web) + Neon (PostgreSQL), un seul service qui sert l'API et l'interface
- [x] ~~Formation CSS avancée~~ → sans objet
