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
- 1RM estimé sur tractions, dips et muscle-up, par la **formule RPE** appliquée à la charge totale (poids du corps + lest)
- Date et détail de la meilleure performance

> [!warning] ⚠️ Mouvements au poids du corps
> Sur une traction lestée, la charge réellement soulevée = poids du corps + lest. Le calcul doit se faire sur ce total, puis retrancher le poids du corps pour afficher un 1RM « en lest ». Le poids du corps vient de la [[05 - Vie courante#Pesée hebdomadaire|pesée hebdomadaire]] (moyenne mobile à la date de la séance).

> [!example] Formule retenue (décision du 18/11/2026)
> 1. **Charge totale** = poids du corps (moyenne mobile des pesées) + lest
> 2. **Effort équivalent** = répétitions + répétitions en réserve, avec réserve = 10 − RPE
> 3. **% du 1RM** lu dans la table RPE (Tuchscherer) pour cet effort équivalent
> 4. **1RM total** = charge totale ÷ % · **1RM en lest** = 1RM total − poids du corps
>
> *Exemple : 75 kg de poids du corps, 5 reps à +20 kg, RPE 8 → effort équivalent 7 reps → 81,1 % → 95 ÷ 0,811 = 117,1 kg → **1RM en lest ≈ 42 kg**.*
>
> Pas d'Epley ni de Brzycki : une série sans RPE n'entre pas dans le calcul. Une série en échec compte ses répétitions réussies à RPE 10. Le 1RM retenu à une date est le meilleur des séries de la séance.

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
- ~~❓ D'où vient la structure de base d'une séance ?~~ → du fichier JSON du bloc (ci-dessous).

### Règles validées (18/11/2026)

**Exercices de base :** tractions, dips, muscle-up. D'autres exercices peuvent être ajoutés librement.

**Format d'un bloc** (fichier JSON importé) : les séances s'enchaînent sans jour fixe, la suite se répète `cycles` fois, et `"series": [3, 5]` est une plage dans laquelle l'algorithme choisit.

```json
{
  "nom": "Force — cap 55 kg",
  "type": "force",
  "cycles": 6,
  "seances": [
    { "nom": "A — Tirage lourd",
      "exercices": [
        { "exercice": "traction", "series": [3, 5], "reps": 3, "rpe_cible": 8 },
        { "exercice": "dips",     "series": 4,      "reps": 5, "rpe_cible": 7.5 }
      ] }
  ]
}
```

**Charge proposée** — même table RPE que le 1RM :
- charge totale = 1RM estimé récent × %(reps, RPE cible) ; lest = charge totale − poids du corps, **arrondi à 1,25 kg**, jamais négatif
- garde-fous : ±5 % au plus d'une séance à l'autre ; deux séances de suite en échec → deload localisé (−10 %). Ces comparaisons se font **dans le même format** (même nombre de reps) : des triples lourds ne brident pas une série de 8
- séries : bas de la plage si la dernière séance était trop dure (ou en échec), haut si elle était trop facile, milieu sinon
- chaque proposition affiche sa justification (ex. « −3,75 kg : RPE 9,5 la dernière fois »)

**Cibles de RPE par défaut** (quand le bloc n'en donne pas) :

| Format | Force / spécifique | Volume | Deload |
|---|---|---|---|
| Single | 9 | 8 | 6 |
| 2–3 reps | 8,5 | 8 | 6 |
| 4–6 reps (5×5) | 8 | 7,5 | 6 |
| 7 reps et plus | 7,5 | 7 | 6 |

En deload, un tiers de séries en moins. Nuit < 6 h → cible −1 ; nuit < 4 h → pas de tentative de max (RPE plafonné à 8). Toutes ces valeurs vivent dans `backend/app/moteurs/regles/autoregulation.toml`.
