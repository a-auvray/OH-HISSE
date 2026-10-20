---
tags:
  - cdc
statut: brouillon
---

# Design et navigation

← [[00 - Sommaire|Sommaire]]

> [!abstract] L'ambition
> Un design qui marque dès l'arrivée : chaque espace a une identité si forte qu'on sait où l'on est sans lire un mot. Le design est un terrain d'expérimentation assumé.

## Principes
- **Desktop uniquement** en V1 : pas de media queries, tout est pensé pour un écran de PC.
- **Une identité par espace** : couleurs, typographie, animations propres.
- **Des animations riches** avec Framer Motion, au service de la lecture (jauges, transitions, graphiques).

## Écran d'accueil
Une animation d'entrée, puis le dashboard au centre, entouré des quatre espaces :

```
                    ┌──────────────────┐
                    │   VIE COURANTE   │
                    └──────────────────┘
┌──────────────────┐┌──────────────────┐┌──────────────────┐
│  STREETLIFTING   ││     ACCUEIL      ││      MARINE      │
│                  ││    dashboard     ││                  │
└──────────────────┘└──────────────────┘└──────────────────┘
                    ┌──────────────────┐
                    │    OBJECTIFS     │
                    └──────────────────┘
```

- On entre dans un espace **par un clic**.
- 💡 La transition « glisse » dans la direction de l'espace : l'écran monte vers Vie courante, part à gauche vers Streetlifting…

## Identités visuelles — pistes 💡
Les couleurs reprennent celles des diagrammes de ce cahier des charges, pour garder un langage commun.

| Espace | Ambiance | Couleur de base |
|---|---|---|
| 🏋️ Streetlifting | Brut, chaud, métal et craie | Orange / brun |
| 🌊 Marine | Fluide, profond, mouvement de vagues | Bleus |
| 🛌 Vie courante | Calme, apaisé | Verts |
| 🎯 Objectifs | Progression, tension vers la cible | Violets |

## Composants récurrents
- **Jauges animées** : récupération, cheat meal, progression d'un objectif
- **Badges de danger** : 🟢 vert / 🔴 rouge / ⚫ noir
- **Pastilles de ressenti** : vert / orange / rouge
- **Graphiques interactifs** : clic et survol pour le détail

## À faire
- [ ] Un moodboard par espace (captures de sites et d'applis qui m'inspirent)
- [ ] Choisir les typographies
- [ ] ❓ Suivre une formation CSS avancée (OpenClassrooms ?) avant d'attaquer le design
