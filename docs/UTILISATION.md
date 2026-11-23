# Utiliser Oh Hisse ! au quotidien (en local)

## Lancer

Double-clique sur **`Oh Hisse.exe`**. C'est une vraie application : pas de fenêtre noire, Oh Hisse ! s'ouvre dans
**sa propre fenêtre** (sans onglets ni barre d'adresse), et **fermer cette fenêtre arrête tout**. Au démarrage, en
arrière-plan, il :

1. construit l'interface (une dizaine de secondes) ;
2. applique les migrations de la base si besoin ;
3. **sauvegarde ta base** dans `sauvegardes/` (une copie datée, les 30 dernières sont gardées) ;
4. démarre le serveur sur http://localhost:8000, puis ouvre la fenêtre.

Il utilise un navigateur de la famille Chromium (Brave, Chrome, Edge ou Opera ; celui par défaut s'il en est un),
avec un profil à part : tes onglets et ton historique ne sont pas touchés. Si quelque chose ne va pas (un programme
manquant, le port 8000 déjà pris, une erreur), une boîte de dialogue affiche la fin du journal ; le détail complet
est dans `journal-lancement.txt`. Prérequis : [uv](https://docs.astral.sh/uv/) et Node.js 24.

Pour un lancement avec la fenêtre noire (voir ce qui se passe, arrêter avec `Ctrl+C`), utilise **`lancer.bat`** : il
ouvre l'application dans ton navigateur habituel. Pour changer de port, définis la variable `OH_HISSE_PORT`.

**Raccourci sur le Bureau** : `outils\creer-raccourci.ps1` crée « Oh Hisse » sur ton Bureau, avec l'icône (la croix
des quatre espaces autour d'un « ! »). `Oh Hisse.exe` cherche `lancer.bat` à côté de lui, puis dans le dossier du projet,
mémorisé au moment où le programme a été construit : un raccourci ou une copie fonctionnent donc de n'importe où. Si tu
déplaces le dossier du projet, reconstruis-le. Il n'est pas signé : au premier lancement, Windows peut afficher
« Windows a protégé votre ordinateur » ; clique sur « Informations complémentaires » puis « Exécuter quand même ».
L'exécutable n'est pas versionné ; pour le (re)construire (ferme-le d'abord, Windows ne remplace pas un programme
ouvert), puis recréer le raccourci :

```powershell
powershell -ExecutionPolicy Bypass -File outils\construire-exe.ps1
powershell -ExecutionPolicy Bypass -File outils\creer-raccourci.ps1
```

## Pas d'écran de connexion

En usage personnel, **il n'y a pas d'écran de connexion** : l'application s'ouvre directement sur ton compte (le premier
compte non démo de la base). `lancer.bat` et `Oh Hisse.exe` activent ce mode avec la variable `OH_HISSE_SANS_CONNEXION=1`.
Il est **interdit en production** (le serveur refuse de démarrer) et il ne répond qu'aux adresses `localhost` /
`127.0.0.1`, pour qu'un autre site ne puisse pas s'en servir. Pour retrouver l'écran de connexion, retire la ligne
`OH_HISSE_SANS_CONNEXION` de `lancer.bat`. Il faut quand même un compte : le premier se crée avec
`uv run python scripts/creer_compte.py` (dossier `backend`). Le bouton « Se déconnecter » de l'accueil n'a plus
d'intérêt dans ce mode : un rechargement rouvre ton compte.

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

Papier est le thème par défaut. Le point discret en bas à droite de l'écran ouvre le choix du thème (Papier, Classique) et le niveau d'animation ; ton choix est mémorisé.
