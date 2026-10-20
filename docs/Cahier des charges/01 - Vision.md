---
tags:
  - cdc
statut: brouillon
---

# Vision

← [[00 - Sommaire|Sommaire]]

## Pourquoi ce projet
Après le site vitrine des tableaux (premier projet complet, backend + frontend, plus de 80 h), je veux un projet **long terme**, nettement plus conséquent, à mener en parallèle de mes études et/ou d'un travail.

Point de départ : une première appli de sport, dont j'avais codé une partie du backend avant de faire générer le reste par IA. Résultat : une appli pleine de bugs, dont je n'étais pas fier. Décision : **tout reprendre à zéro, tout coder moi-même**, et voir plus grand qu'un simple carnet d'entraînement.

## Ce que fait l'application
Une application web qui réunit quatre espaces :

| Espace | Rôle |
|---|---|
| 🏋️ Streetlifting | Carnet d'entraînement intelligent : saisie, analyse, génération de la séance suivante |
| 🌊 Marine | Assistant de sortie en mer : conditions, meilleur créneau, équipement, niveau de danger |
| 🛌 Vie courante | Sommeil, récupération, cheat meal, briefings |
| 🎯 Objectifs | Objectifs sportifs qui structurent les blocs d'entraînement |

Le cœur du projet, c'est le **croisement** : chaque espace nourrit les autres (cf. [[08 - Croisements entre modules|Croisements]]). Ce n'est pas un assistant conversationnel : c'est un gestionnaire qui calcule et recommande à partir de règles.

## Ce que le projet doit m'apporter
- Utiliser des **API externes** (météo, météo marine, marées, cartographie)
- **Croiser des données** entre modules et écrire une vraie logique métier
- Modéliser une **base de données relationnelle** bien plus riche que celle du site tableaux
- Aller loin en **design CSS** et en animations
- Travailler avec **Git comme en entreprise** (branches, pull requests, versions)

## Objectif portfolio
- Repo public sur GitHub, présenté sur mon portfolio
- Heures documentées (exports Super Productivity) + journal de développement dans le repo
- Montrer à des recruteurs ou des écoles un projet ambitieux, mené avec régularité en parallèle du reste

## Pour qui
**Moi d'abord.** En V1, l'application est à mon usage personnel, avec un **mode démo** (données fictives) pour que les visiteurs puissent la tester sans voir mes vraies données. Une ouverture à d'autres utilisateurs reste possible plus tard (cf. [[02 - Périmètre|Périmètre]]).

## Règles du jeu
1. **Je code tout moi-même.** L'apprentissage prime sur la vitesse.
2. **Pas de deadline, pas de stress.** Sessions de 1 h à 6 h selon l'énergie du moment.
3. **La V1 reste centrée.** Toute idée qui part loin va dans la liste V+.
4. **Une fonctionnalité = une branche Git.** Jamais de travail direct sur `main`.
5. **Rien n'est isolé.** Chaque donnée saisie doit pouvoir servir ailleurs.

## Estimation
Enveloppe d'environ **500 h**, sur au moins un an — susceptible d'évoluer. Détail dans [[12 - Roadmap et estimation|Roadmap et estimation]].
