# Utiliser Oh Hisse ! au quotidien (en local)

## Lancer

Double-clique sur **`Oh Hisse.exe`** (ou sur `lancer.bat`, c'est la même chose), à la racine du dépôt. Il :

1. construit l'interface (une dizaine de secondes) ;
2. applique les migrations de la base si besoin ;
3. **sauvegarde ta base** dans `sauvegardes/` (une copie datée, les 30 dernières sont gardées) ;
4. démarre l'application sur **http://localhost:8000** et ouvre le navigateur.

Le navigateur s'ouvre dès que le serveur répond. Si quelque chose ne va pas (un programme manquant, le port 8000
déjà pris, une erreur), la fenêtre reste ouverte avec un message : copie-le pour comprendre. `Ctrl+C` dans la fenêtre
pour arrêter. Prérequis : [uv](https://docs.astral.sh/uv/) et Node.js 24.

`Oh Hisse.exe` n'est qu'un petit lanceur : il démarre `lancer.bat` qui se trouve à côté de lui, il doit donc
rester dans le dossier du projet. Pour l'avoir sur le Bureau, fais-en un **raccourci** (clic droit sur le fichier,
« Créer un raccourci »). Il n'est pas signé : au premier lancement, Windows peut afficher « Windows a protégé
votre ordinateur » ; clique sur « Informations complémentaires » puis « Exécuter quand même ». L'exécutable n'est pas
versionné ; pour le reconstruire (par exemple après un clone neuf) :

```powershell
powershell -ExecutionPolicy Bypass -File outils\construire-exe.ps1
```

## Où sont tes données

Dans `backend/oh-hisse.db` (SQLite), un seul fichier qui reste d'un lancement à l'autre.
Il n'est jamais envoyé sur GitHub (`*.db` est ignoré).

- **Sauvegarder à la main** : `cd backend` puis `uv run python scripts/sauvegarder.py`.
- **Restaurer** : arrête l'application, copie une sauvegarde de `sauvegardes/` sur `backend/oh-hisse.db`, relance.
- **Changer de machine** : copie `backend/oh-hisse.db` (ou une sauvegarde) au même endroit.

## Première fois

Le compte se crée en ligne de commande (l'inscription n'est pas ouverte) :

```bash
cd backend
uv run python scripts/creer_compte.py
```

Puis, dans **Streetlifting → Blocs**, importe un bloc (un exemple : `docs/exemples/bloc-force.json`).
Enregistre ton poids dans la séance du jour : sans pesée, les charges ne peuvent pas être calculées.

## Noter une séance

1. **Séance du jour** : le bloc propose la séance suivante, avec les charges calculées à partir de ton 1RM
   estimé (le premier jour, sans historique, tu choisis la charge).
2. **Commencer la séance** ouvre la saisie préremplie : renseigne le lest, le RPE de chaque série, ajoute
   ou retire des séries, puis **Valider**.
3. Le **calendrier** montre la séance suivante, **Analyse** trace tes progrès.
4. Une séance déjà notée se corrige depuis le calendrier.

## Marine

L'espace Marine lit Open-Meteo (météo, houle, température de l'eau) : il demande une connexion internet.
Si le service ne répond pas, les dernières données en cache sont affichées et signalées comme telles.

## Choisir son thème

Le point discret en bas à droite de l'écran ouvre le choix du thème (Classique, Papier) et le niveau d'animation.
