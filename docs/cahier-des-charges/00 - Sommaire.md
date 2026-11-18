---
tags:
  - cdc
statut: brouillon
---

# Cahier des charges — Projet (nom à définir)

> [!abstract] Le projet en bref
> Une application web personnelle qui réunit quatre espaces — **Streetlifting**, **Marine**, **Vie courante** et **Objectifs** — et qui croise leurs données pour me guider au quotidien : quelle séance faire aujourd'hui, quand aller à l'eau et avec quel équipement, si je suis récupéré, si j'ai mérité mon cheat meal.
>
> Pas quatre applis juxtaposées : un seul gestionnaire.

> [!info] Légende utilisée dans toutes les notes
> - 💡 **Suggestion** ajoutée à la rédaction, pas encore validée → à garder ou supprimer
> - ⚠️ **Vigilance** : point technique ou de sécurité à ne pas négliger
> - ❓ **Question ouverte** : toutes regroupées dans [[13 - Décisions et questions ouvertes|Décisions et questions]]

## 🧭 Cadrage
- [[01 - Vision|Vision]] — pourquoi ce projet, ce qu'il doit m'apporter, les règles du jeu
- [[02 - Périmètre|Périmètre]] — la V1, les idées pour plus tard, ce qu'on ne fera pas

## 🗂️ Les quatre espaces
- [[03 - Streetlifting|🏋️ Streetlifting]] — carnet d'entraînement intelligent
- [[04 - Marine|🌊 Marine]] — assistant de sortie en mer
- [[05 - Vie courante|🛌 Vie courante]] — sommeil, récupération, cheat meal, briefings
- [[06 - Objectifs|🎯 Objectifs]] — objectifs sportifs et blocs d'entraînement
- [[07 - Transversal|🔐 Transversal]] — connexion, mode démo, dashboard d'accueil

## ⚙️ Technique
- [[08 - Croisements entre modules|Croisements entre modules]] — qui envoie quoi à qui
- [[09 - Modèle de données|Modèle de données]] — tables et relations (ébauche)
- [[10 - Architecture technique|Architecture technique]] — stack, arborescence, API externes, Git

## 🎨 Design
- [[11 - Design et navigation|Design et navigation]] — accueil, identités visuelles, animations

## 📍 Pilotage
- [[12 - Roadmap et estimation|Roadmap et estimation]] — les phases dans l'ordre, avec cases à cocher
- [[13 - Décisions et questions ouvertes|Décisions et questions ouvertes]] — ce qui est tranché, ce qui reste à trancher

---

## Où j'en suis
**Phase actuelle :** 0 — Cadrage

- [ ] Relire chaque note, garder ou supprimer les 💡
- [ ] Trancher les questions prioritaires de [[13 - Décisions et questions ouvertes|la note 13]]
- [ ] Trouver le nom du projet
- [ ] Créer le repo GitHub et protéger `main`

> [!tip]- Mode d'emploi Obsidian (clic pour déplier)
> - **Clic** sur un lien : ouvre la note · **Ctrl + clic** : l'ouvre dans un nouvel onglet
> - **Ctrl + G** : vue graphe, toutes les notes et leurs liens
> - Panneau **Plan** (barre de droite) : les titres de la note ouverte, cliquables
> - Diagramme trop petit : **Ctrl + =** / **Ctrl + -** zooment l'interface, **Ctrl + 0** pour revenir. Tu peux aussi désactiver *Réglages → Éditeur → Readable line length* pour que les diagrammes prennent toute la largeur
> - Les cases à cocher se cochent d'un simple clic
> - En haut de chaque note, le champ `statut` : passe-le de `brouillon` à `validé` une fois la note relue
