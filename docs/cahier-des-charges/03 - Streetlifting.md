---
tags:
  - cdc
  - module
module: streetlifting
statut: brouillon
---

# 🏋️ Streetlifting

← [[00 - Sommaire|Sommaire]] · [[02 - Périmètre|Périmètre]]

> [!abstract] En une phrase
> Un carnet d'entraînement qui ne se contente pas d'enregistrer : il analyse chaque séance et calcule la suivante en fonction du bloc en cours, de l'effort perçu et de mon état de récupération.

## Saisie d'une séance
**Écran :** formulaire de séance

**Actions possibles :**
- Partir de la séance du jour générée, ou d'une séance vierge
- Ajouter un exercice, puis ses séries : répétitions, charge (lest), RPE
- Noter le ressenti global de la séance (1 à 10, code couleur vert / orange / rouge)
- Enregistrer, modifier ou supprimer une séance passée

**Données affichées :**
- Liste des exercices disponibles
- 💡 Prévu vs réalisé, quand la séance vient de la génération automatique
- Récapitulatif avant validation

**Croisements :** envoie le RPE et le type de séance → [[05 - Vie courante#Gestionnaire de récupération|Récupération]] et [[05 - Vie courante#Gestionnaire de cheat meal|Cheat meal]]

## Historique via calendrier
**Écran :** calendrier (vue mois / semaine)

**Actions possibles :**
- Naviguer de mois en mois
- Cliquer sur un jour pour ouvrir la séance réalisée
- 💡 Filtrer par exercice

**Données affichées :**
- Séances réalisées, avec la pastille de ressenti
- Plages colorées selon le bloc (force, volume, deload…)

## Calcul du 1RM estimé
**Écran :** pas d'écran dédié — affiché dans le détail des séances, les graphiques et la fiche de l'objectif

**Actions possibles :**
- Consulter le 1RM estimé actuel de chaque mouvement et son historique

**Données affichées :**
- 1RM estimé (formules Epley / Brzycki) sur tractions, dips et muscle-up
- Date et détail de la meilleure performance

> [!warning] ⚠️ Mouvements au poids du corps
> Sur une traction lestée, la charge réellement soulevée = poids du corps + lest. Le calcul doit se faire sur ce total, puis retrancher le poids du corps pour afficher un 1RM « en lest ». Il faut donc connaître mon poids du corps à la date de la séance ❓

**Croisements :** envoie le 1RM estimé → [[06 - Objectifs|Objectifs]] (calcul de la progression)

## Graphiques d'évolution
**Écran :** page Analyse du module

**Actions possibles :**
- Choisir la période : séance, semaine, mois, bloc
- Choisir le mouvement et la métrique
- Survoler ou cliquer un point pour voir le détail

**Données affichées :**
- 1RM estimé, tonnage, séries, répétitions, RPE moyen

## Organisation par blocs
**Écran :** calendrier + formulaire de bloc

**Actions possibles :**
- Créer un bloc : type (force, volume, deload, spécifique…), dates de début et de fin
- Modifier un bloc, le rattacher à un objectif

**Données affichées :**
- Bloc actif et avancement (ex. semaine 3 / 6)

**Croisements :** reçoit la structure des blocs ← [[06 - Objectifs|Objectifs]]

## Génération automatique de séance
**Écran :** « Séance du jour » — affichée à l'ouverture du module et sur le [[07 - Transversal#Dashboard d'accueil|dashboard d'accueil]]

**Actions possibles :**
- Consulter la séance proposée
- L'accepter telle quelle ou l'ajuster à la main
- Lancer la saisie à partir d'elle

**Données affichées :**
- Exercices, séries, répétitions, charges proposées
- 💡 Justification courte de l'ajustement (ex. « −2,5 kg : RPE 10 sur un 5×5 en bloc volume »)

**Croisements :** reçoit ← le bloc actif, la dernière séance (RPE + ressenti), le [[05 - Vie courante#Suivi du sommeil|sommeil]] et l'[[05 - Vie courante#Gestionnaire de récupération|état de récupération]]

### Principes de l'auto-régulation (à détailler plus tard)
- La cible de RPE dépend du **format** : un single vise un RPE élevé, un 5×5 un RPE modéré, une série de volume autour de RPE 7.
- Elle dépend aussi du **bloc** : en bloc volume, un RPE trop haut signale une séance trop dure ; en bloc force, un RPE 10 sur un single est normal, et un RPE bas valide la montée en charge.
- RPE au-dessus de la cible, échec ou ressenti rouge → maintien ou baisse de charge (ex. −2,5 kg), voire deload localisé.
- Sommeil insuffisant ou récupération incomplète → séance allégée, ou tentative de max reportée.
- ❓ D'où vient la structure de base d'une séance (exercices, format 5×5…) ? Un programme type défini pour chaque bloc, dont l'algorithme n'ajuste que les charges ?
