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

