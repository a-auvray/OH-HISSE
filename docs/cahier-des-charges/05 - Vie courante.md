---
tags:
  - cdc
  - module
module: vie-courante
statut: brouillon
---

# 🛌 Vie courante

← [[00 - Sommaire|Sommaire]] · [[02 - Périmètre|Périmètre]]

> [!abstract] En une phrase
> Le carrefour de l'application : il reçoit ce que je fais en muscu et en mer, y ajoute mon sommeil, et en tire des verdicts — suis-je récupéré, ai-je mérité un écart — qui modifient en retour la suite du programme.

> [!info] Cause, conséquence
> - **Cause** : la donnée influence les autres espaces
> - **Conséquence** : la donnée est calculée à partir des autres espaces

## Suivi du sommeil
*Cause*

**Écran :** saisie rapide de la nuit + historique

**Actions possibles :**
- Saisir les heures dormies (💡 et une note de qualité)
- Consulter la tendance

**Données affichées :**
- Heures de la nuit, moyenne sur 7 jours

**Croisements :** envoie → [[03 - Streetlifting#Génération automatique de séance|Génération de séance]] (ex. 2 h de sommeil → tentative de max reportée d'une semaine)

## Gestionnaire de cheat meal
*Conséquence*

**Écran :** jauge « écart mérité ? »

**Actions possibles :**
- Consulter le verdict du jour
- 💡 Enregistrer un cheat meal pris, pour que le gestionnaire sache quand a eu lieu le dernier

**Données affichées :**
- Charge d'effort récente (séances + sorties en mer, froid compris)
- Verdict (ex. « 1 h de nage dans une eau à 10 °C + séance lourde le lendemain : ce soir, t'as le droit »)

**Croisements :** reçoit ← [[03 - Streetlifting#Saisie d'une séance|séances]] et [[04 - Marine#Carnet de sortie|sorties en mer]]

## Gestionnaire de récupération
*Cause et conséquence*

**Écran :** jauge d'état de récupération

**Actions possibles :**
- Consulter le temps de récupération restant
- Voir quand le prochain effort intense est conseillé

**Données affichées :**
- Récupération estimée selon le type de séance et le RPE (ex. ~96 h après un single à RPE 9, ~48 h après une séance volume — valeurs à calibrer ❓)
- Suggestion de sortie en mer comme récupération active

**Croisements :**
- reçoit ← [[03 - Streetlifting#Saisie d'une séance|séances]] et [[04 - Marine#Carnet de sortie|sorties en mer]]
- envoie → [[03 - Streetlifting#Génération automatique de séance|Génération de séance]] et [[04 - Marine#Assistant de sortie|Assistant de sortie]]

### Règles validées (18/11/2026)
Heuristiques à calibrer à l'usage ; toutes les valeurs vivent dans `backend/app/moteurs/regles/vie_courante.toml`.

**Récupération** (une séance est placée à 18 h le jour où elle a eu lieu) :

| Séance | Récupération |
|---|---|
| Tentative de max (single ou double, RPE ≥ 9) | 96 h |
| Force (≤ 5 reps, RPE 8 à 9) | 72 h |
| Volume (≥ 6 reps) | 48 h |
| Légère (RPE moyen ≤ 7) | 24 h |

- Ressenti ≤ 4 : +24 h ; nuit de moins de 6 h après la séance : +12 h
- Nage de plus de 30 min ou eau sous 12 °C : +12 h de fatigue ; baignade de 20 min ou moins dans une eau ≥ 12 °C : récupération active, −12 h
- Plus de 24 h restantes : séance du jour allégée (RPE cible −0,5, séries en bas de la plage) ; plus de 48 h : pas de tentative de max (RPE plafonné à 8) et baignade de récupération suggérée

**Cheat meal** (points sur les dernières 48 h) : séance lourde (RPE ≥ 8,5) +2, autre séance +1, nage ≥ 30 min +1, eau < 12 °C +1, dernier écart il y a moins de 4 jours −2. Verdict : ≥ 3 « ce soir, t'as le droit », 2 « un petit écart, oui », ≤ 1 « pas cette fois », toujours avec sa raison.

**Sommeil** : la nuit est datée du jour du réveil ; moyenne sur 7 jours.

## Briefings
**Écran :** briefing du jour sur le [[07 - Transversal#Dashboard d'accueil|dashboard d'accueil]] + écrans de bilan

**Actions possibles :**
- Consulter le briefing du jour
- Ouvrir le bilan de la semaine, de début ou de fin de bloc
- 💡 Revoir les briefings passés

**Données affichées :**
- **Quotidien :** météo du jour, séance prévue, état de récupération, conditions de baignade, verdict cheat meal
- **Hebdomadaire :** volume de la semaine, sorties, sommeil moyen
- **Début de bloc :** objectifs du bloc
- **Fin de bloc :** progression du 1RM, respect du plan

**Croisements :** reçoit ← tous les espaces

## Pesée hebdomadaire
**Rythme :** une pesée par semaine, le lundi matin à jeun, avant le petit-déjeuner.

**Règles :**
- Une seule pesée par semaine suffit pour suivre la tendance.
- Le 1RM utilise une moyenne mobile sur 2 à 3 semaines, pas la dernière valeur seule (eau, digestion et sel font varier le poids).
- Sans pesée, la séance reprend la dernière valeur connue, affichée comme « non mise à jour ».
- Rappel de notification le lundi matin, ou le dimanche soir (version ultérieure).

**Données affichées :** poids actuel, moyenne mobile, force relative (charge totale / poids du corps).

**Croisements :** envoie le poids → [[03 - Streetlifting|Streetlifting]] (calcul du 1RM)

