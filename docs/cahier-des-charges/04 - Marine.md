---
tags:
  - cdc
  - module
module: marine
statut: brouillon
---

# 🌊 Marine

← [[00 - Sommaire|Sommaire]] · [[02 - Périmètre|Périmètre]]

> [!abstract] En une phrase
> Un assistant de sortie en mer : il lit les conditions en temps réel, me dit quand y aller, avec quoi, par où nager et à quel point c'est risqué — puis garde la trace de chaque sortie.
>
> *Exemple visé : « Il est 17 h 30, la mer est basse : 250 m de sable à marcher, dans une eau à moins de 10 °C. Dans 2 h, marée haute : 50 m seulement. »*

## Dashboard météo marine
**Écran :** tableau de bord du module (écran d'arrivée)

**Actions possibles :**
- Consulter les conditions actuelles et les prévisions des prochaines heures / jours

**Données affichées :**
- Température de l'eau et de l'air
- Vent : vitesse et direction
- Vagues et houle : hauteur, période, direction
- Marée : horaires, coefficient, hauteur d'eau
- Couverture nuageuse, lever et coucher du soleil

**Source :** API externes → [[10 - Architecture technique#API externes|pistes à valider]]

## Assistant de sortie
**Écran :** « Planifier une sortie »

**Actions possibles :**
- Choisir le mode (baignade / nage / plongée), le spot et la durée envisagée
- Obtenir le meilleur créneau, comparer plusieurs créneaux

**Données affichées :**
- Créneau recommandé et pourquoi (marée, lumière, températures)
- Distance à marcher jusqu'à l'eau selon l'heure

> [!tip] 💡 Piste pour la distance jusqu'à l'eau
> Pour mes spots habituels, estimer une fois pour toutes la pente de la plage : la distance jusqu'à l'eau se déduit alors de la hauteur de marée à l'instant T. Bien plus simple qu'un modèle complet de la côte.

**Croisements :** reçoit ← une suggestion de sortie « récup active » depuis [[05 - Vie courante#Gestionnaire de récupération|Récupération]]

## Recommandations de sortie
**Écran :** « Préparer ma sortie » (suite de l'assistant)

**Actions possibles :**
- Consulter la checklist
- 💡 Cocher les éléments préparés

**Données affichées :**
- Tenue : combinaison ou short, bonnet…
- Après la sortie : vêtements chauds, boisson chaude, nourriture
- Temps effectif conseillé et temps maximal estimé selon la température de l'eau
- Direction de nage conseillée pour ne pas finir à contre-courant
- Risques identifiés, et rappel des gestes de sécurité si je n'ai pas nagé depuis longtemps (ex. deux mois sans pratique, puis une heure en plein hiver)

> [!warning] ⚠️ Information de sécurité
> Les durées d'exposition au froid doivent venir de sources fiables, avec des marges prudentes : l'app aide à décider, elle ne remplace pas le bon sens sur place ❓

## Niveau de danger
**Écran :** badge affiché sur l'assistant, le dashboard du module et le [[07 - Transversal#Dashboard d'accueil|dashboard d'accueil]]

**Données affichées :**
- 🟢 Vert / 🔴 Rouge / ⚫ Noir, avec les raisons principales (ex. « eau à 6 °C + vent à 40 km/h »)

❓ Seuils de chaque niveau à définir

## Carte interactive
**Écran :** carte plein écran de la côte (bande d'environ 20 km)

**Actions possibles :**
- Zoomer, se déplacer
- Cliquer sur un spot pour voir ses conditions
- Placer le lieu d'une sortie et estimer grossièrement le tracé d'une nage

**Données affichées :**
- Trait de côte et niveau de la mer selon la marée, en temps réel
- Température affichée sur la zone d'eau
- Flèches animées : vent et courants
- Mes spots enregistrés

> [!warning] ⚠️ La partie la plus complexe du projet
> Représenter le sable découvert selon la marée demande des données de relief de la plage. Prévoir un **prototype isolé** avant de l'intégrer au reste (cf. [[12 - Roadmap et estimation|Roadmap]]).

## Carnet de sortie
**Écran :** carnet (liste chronologique) + formulaire de saisie après coup

**Actions possibles :**
- Enregistrer une sortie et choisir son type
- Renseigner les champs communs et ceux propres au type
- Noter le ressenti
- Modifier ou supprimer une sortie

**Données affichées :**
- Communes : date, heure, durée, spot, ressenti — 💡 conditions relevées automatiquement au moment de la sortie
- Nage : distance estimée, tracé
- Plongée : profondeur maximale, temps d'immersion, visibilité, matériel
- Baignade : temps passé dans l'eau

**Croisements :** envoie type, durée et température → [[05 - Vie courante#Gestionnaire de récupération|Récupération]] et [[05 - Vie courante#Gestionnaire de cheat meal|Cheat meal]]
