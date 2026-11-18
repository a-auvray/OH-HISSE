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
| Je code tout moi-même | L'apprentissage est l'objectif |
| Jours flexibles : bloc = suite ordonnée de séances, sans jour fixe | Décaler une séance ne doit rien casser |
| Blocs importés depuis un fichier JSON, pas d'IA branchée | Pas d'IA dans l'appli ; l'import est un vrai morceau de backend |
| 1RM en lest = formule RPE (poids du corps + lest, puis retirer le poids du corps) | Le calcul sur le lest seul sous-estime fortement |
| L'algorithme n'ajuste que la charge (et les séries dans la plage du bloc) | Le programme reste celui défini par l'utilisateur |
| Système de badges reporté en V+ ; en V1, seul l'easter egg « Essuyer une tempête ! » | Garder la V1 simple ; le badge est une anecdote, pas un objectif |
| Easter egg secret : affiché uniquement au retour d'une nage validée en tempête | Un clin d'œil qui ne pousse pas à sortir par mauvais temps |

## Questions ouvertes

### Prioritaires (avant de coder)
- [ ] Nom du projet
- [ ] Programme type d'un bloc : d'où vient la structure de base des séances (exercices, format 5×5…) ? L'algorithme n'ajuste-t-il que les charges ?
- [ ] Blocs : créés à la main, ou proposés automatiquement à partir d'un objectif ?
- [ ] Source des données de marée : gratuite, fiable et précise pour la Normandie ?

### Streetlifting
- [x] Poids du corps : pesée hebdomadaire séparée (lundi matin), moyenne mobile 2-3 semaines pour le 1RM
- [ ] Cibles de RPE par format et par bloc : quelles valeurs de départ ?

### Marine
- [ ] Seuils des niveaux de danger vert / rouge / noir
- [ ] Temps d'exposition en eau froide : quelles sources fiables ? ⚠️ information de sécurité, marges prudentes
- [ ] Carte : Leaflet ou Mapbox ? Comment représenter le sable découvert selon la marée ?

### Vie courante
- [ ] Durées de récupération (≈ 96 h, ≈ 48 h…) : calibrées sur quelles références ?
- [ ] Règles du verdict cheat meal

### Transversal
- [ ] Mode démo : lecture seule, ou modifiable avec réinitialisation régulière ?
- [ ] Easter egg : seuil de tempête (force 10 Beaufort, ou rafales ?)
- [ ] Easter egg : si le danger avait déconseillé la sortie, le badge s'affiche-t-il quand même ?
- [ ] Librairie de graphiques
- [ ] Hébergement (au moment de la mise en ligne)
- [ ] Formation CSS avancée avant d'attaquer le design ?
