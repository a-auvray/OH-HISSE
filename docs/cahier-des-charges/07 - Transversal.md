---
tags:
  - cdc
statut: brouillon
---

# 🔐 Transversal

← [[00 - Sommaire|Sommaire]] · [[02 - Périmètre|Périmètre]]

## Authentification
**Écran :** écran de connexion (soigné, dans l'esprit du reste)

**Actions possibles :**
- Se connecter à mon compte
- Entrer en **mode démo**, sans compte
- Se déconnecter

**Fonctionnement :**
- **Compte personnel :** mes vraies données, privées
- **Compte démo :** données fictives pré-remplies, pour les visiteurs et les recruteurs ❓ lecture seule ou modifiable ?
- Base pensée **multi-utilisateurs dès le départ** (chaque donnée rattachée à un utilisateur) : ouvrir l'inscription plus tard ne demandera pas de refonte

> [!warning] ⚠️ Sécurité
> **Acquis du site tableaux :** mots de passe hashés (bcrypt), jetons JWT, clé secrète dans `.env`, même message d'erreur pour un email inconnu et un mauvais mot de passe, rate limiting sur la connexion, CORS restreint en production.
>
> **Nouveau ici — l'autorisation :** être connecté ne suffit plus. Chaque requête ne doit renvoyer que les données **de l'utilisateur connecté** : le compte démo ne doit jamais pouvoir lire ou modifier mes vraies données (sommeil, séances… ce sont des données personnelles).

## Dashboard d'accueil
**Écran :** page d'accueil après connexion, avec une animation d'entrée

**Actions possibles :**
- Accéder aux quatre espaces d'un clic
- Consulter le briefing du jour

**Données affichées :**
- Séance du jour → [[03 - Streetlifting#Génération automatique de séance|Streetlifting]]
- État de récupération → [[05 - Vie courante#Gestionnaire de récupération|Vie courante]]
- Conditions en mer et niveau de danger → [[04 - Marine#Niveau de danger|Marine]]
- Progression de l'objectif principal → [[06 - Objectifs|Objectifs]]
- Briefing du jour → [[05 - Vie courante#Briefings|Vie courante]]

## Navigation
Les quatre espaces s'ouvrent **par un clic** depuis l'accueil, selon une disposition fixe : Vie courante en haut, Objectifs en bas, Streetlifting à gauche, Marine à droite. Détail dans [[11 - Design et navigation|Design et navigation]].

## Badges et easter egg
**Badges :** un système de badges (vitrine des récompenses obtenues sur le journal) est prévu en **V+**. Il n'est pas dans la V1.

**Easter egg « Essuyer une tempête ! »** (V1, secret) :
- **Déclencheur :** une sortie en mer validée dans le journal, dont les conditions enregistrées correspondent à une tempête (vent moyen de force 10 Beaufort ou plus ❓ seuil à confirmer)
- **Affichage :** rien n'est annoncé à l'avance. Le badge n'apparaît qu'au retour de la nage, une fois la sortie validée, avec une courte animation d'apparition
- **Intention :** un clin d'œil d'humour, pas une invitation. Il ne doit jamais être présenté comme un objectif ni apparaître dans une aide, une liste ou un tutoriel

> [!warning] ⚠️ Pas de récompense pour le danger
> Si le moteur de danger avait déconseillé la sortie, le badge ne doit pas s'afficher comme une réussite. ❓ Voir [[13 - Décisions et questions ouvertes|Décisions]]

