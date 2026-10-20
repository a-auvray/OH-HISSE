---
tags:
  - cdc
statut: brouillon
---

# Croisements entre modules

← [[00 - Sommaire|Sommaire]]

> [!abstract] Pourquoi cette note
> C'est ici que le projet se distingue : aucune donnée ne reste dans son coin. Cette note sert de référence pour le [[09 - Modèle de données|modèle de données]] et pour les [[10 - Architecture technique#Moteurs de règles|moteurs de règles]].

## Légende
| Couleur | Espace |
|---|---|
| 🟧 | Streetlifting |
| 🟦 | Marine |
| 🟩 | Vie courante |
| 🟪 | Objectifs |
| ⬜ | Transversal |

**Trait plein** = enchaînement à l'intérieur d'un espace · **Pointillé** = croisement entre deux espaces · **Trait épais** = accès donné par l'authentification

## Diagramme

```mermaid
%%{init: {"themeVariables": {"fontSize": "18px", "fontFamily": "Arial, sans-serif"}, "flowchart": {"nodeSpacing": 55, "rankSpacing": 85, "htmlLabels": true}}}%%
flowchart TB

classDef streetlifting fill:#ffd8b0,stroke:#cc6600,stroke-width:2px,color:#3a2400
classDef marine fill:#b0d8ff,stroke:#0066cc,stroke-width:2px,color:#00243a
classDef viecourante fill:#c0e8c0,stroke:#2d8a2d,stroke-width:2px,color:#0a2e0a
classDef objectifs fill:#e0b8e8,stroke:#8a2d8a,stroke-width:2px,color:#2e0a2e
classDef transversal fill:#d9d9d9,stroke:#555555,stroke-width:2px,color:#1a1a1a

AUTH["Authentification<br/>compte perso / démo"]:::transversal

O1["Objectifs"]:::objectifs

S1["Saisie de séance"]:::streetlifting
S2["Historique<br/>calendrier"]:::streetlifting
S3["Calcul du 1RM"]:::streetlifting
S4["Graphiques"]:::streetlifting
S5["Blocs<br/>force / volume / deload"]:::streetlifting
S6["Génération<br/>de séance"]:::streetlifting

M1["Météo marine"]:::marine
M2["Assistant<br/>de sortie"]:::marine
M3["Recommandations"]:::marine
M4["Niveau de danger"]:::marine
M5["Carte interactive"]:::marine
M6["Carnet de sortie"]:::marine

V1["Sommeil"]:::viecourante
V2["Cheat meal"]:::viecourante
V3["Récupération"]:::viecourante
V4["Briefings"]:::viecourante

ACC["Dashboard d'accueil"]:::transversal

AUTH ==> O1
AUTH ==> S1
AUTH ==> M1
AUTH ==> V1

S1 --> S2
S1 --> S3
S1 --> S4
S5 --> S6

M1 --> M2
M2 --> M3
M3 --> M4
M1 --> M5
M5 --> M6

V2 --> V4
V3 --> V4

O1 -.-> S5
S1 -.-> V3
S1 -.-> V2
M6 -.-> V3
M6 -.-> V2
V1 -.-> S6
V3 -.-> S6

S6 -.-> ACC
M4 -.-> ACC
O1 -.-> ACC
V4 -.-> ACC
```

> [!info] Pour garder le schéma lisible
> Deux flux ne figurent que dans le tableau ci-dessous : **1RM → Objectifs** et **Récupération → Assistant de sortie**.

## Tableau des flux
| Source | Donnée transmise | Destination | Effet |
|---|---|---|---|
| Saisie de séance | RPE, type de séance | Récupération | Calcule le temps de récupération nécessaire |
| Saisie de séance | Volume, intensité | Cheat meal | Pèse dans le verdict « écart mérité » |
| Carnet de sortie | Type, durée, température de l'eau | Récupération | Ajoute la fatigue d'une sortie |
| Carnet de sortie | Type, durée, température de l'eau | Cheat meal | Une sortie en eau froide compte comme un effort |
| Suivi du sommeil | Heures dormies | Génération de séance | Allège la séance ou reporte un max |
| Récupération | État de récupération | Génération de séance | Ajuste l'intensité proposée |
| Récupération | Besoin de récup active | Assistant de sortie | Propose une baignade de récupération |
| Objectifs | Cible, date, blocs | Blocs du calendrier | Structure la programmation |
| Calcul du 1RM | 1RM estimé | Objectifs | Calcule la progression vers la cible |
| Tous les espaces | Synthèses | Briefings et dashboard d'accueil | Vue d'ensemble du jour, de la semaine, du bloc |
