# Mise en ligne : Render + Neon

Oh Hisse ! tourne en ligne comme **un seul service** : l'image Docker contient l'API FastAPI et l'interface React déjà construite. FastAPI sert les deux sur la même adresse, ce qui permet au cookie de session de circuler sans réglage CORS.

| Pièce | Hébergeur | Offre |
|---|---|---|
| Service web (API + interface) | [Render](https://render.com) | Free, région Francfort |
| Base PostgreSQL | [Neon](https://neon.tech) | Free, région Francfort |

Tout est décrit dans [`render.yaml`](../render.yaml) (le *Blueprint*). Les migrations passent automatiquement avant chaque démarrage (`alembic upgrade head`).

## 1. La base chez Neon

1. Crée un compte sur [neon.tech](https://neon.tech), puis un projet :
   - **Nom** : `oh-hisse`
   - **Postgres** : la version proposée par défaut (17 ou plus)
   - **Région** : *AWS Europe Central 1 (Frankfurt)*
2. Dans **Connect**, choisis la base `neondb` (ou crée `oh_hisse`), et **désactive « Connection pooling »** : l'application n'ouvre que quelques connexions, la connexion directe suffit.
3. Copie l'URL de connexion. Elle ressemble à :

   ```text
   postgresql://neondb_owner:••••••@ep-xxxx-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   ```

   Colle-la telle quelle : l'application la convertit pour son pilote (`psycopg`).

> Cette URL contient le mot de passe de la base. Ne la colle que dans Render et dans ton terminal, jamais dans un fichier commité.

## 2. Le service chez Render

1. Crée un compte sur [render.com](https://render.com) en te connectant avec GitHub.
2. **New → Blueprint**, puis choisis le dépôt `OH-HISSE` (autorise l'accès de Render au dépôt si on te le demande).
3. Render lit `render.yaml` et affiche le service `oh-hisse`. Il demande une seule valeur :
   - `OH_HISSE_URL_BASE_DE_DONNEES` → colle l'URL Neon de l'étape 1.

   La clé secrète (`OH_HISSE_CLE_SECRETE`) est générée par Render, tu n'as rien à faire.
4. **Apply**. Le premier déploiement construit l'image (quelques minutes), joue les migrations sur Neon, puis démarre.
5. Quand le service est *Live*, ouvre `https://oh-hisse.onrender.com/api/sante` (l'adresse exacte est affichée en haut de la page du service). Tu dois lire `{"statut":"ok", …}`.

Ensuite, chaque fusion sur `main` est déployée toute seule, **seulement si la CI est verte** (`autoDeployTrigger: checksPass`).

## 3. Ton compte personnel

L'inscription n'est pas ouverte : le compte se crée avec le script, depuis ton ordinateur, directement sur la base Neon. Dans PowerShell, depuis le dossier `backend` :

```powershell
$env:OH_HISSE_URL_BASE_DE_DONNEES = "colle-ici-l-url-neon"
```

```powershell
uv run python scripts/creer_compte.py
```

```powershell
Remove-Item Env:OH_HISSE_URL_BASE_DE_DONNEES
```

Le script demande ton email, ton nom affiché et ton mot de passe (12 caractères minimum). La dernière commande retire l'URL de la session PowerShell, pour ne plus viser la base de production par erreur.

Tu peux ensuite te connecter sur le site. Le bouton **Explorer en mode démo** crée un bac à sable fictif, séparé de tes données et effacé au bout de 24 h.

## Bon à savoir

- **Réveil lent** : en offre gratuite, Render met le service en veille après 15 min sans visite ; la visite suivante attend environ une minute qu'il redémarre. Neon met aussi la base en pause, et la réveille en une seconde environ.
- **Journaux** : onglet *Logs* du service sur Render.
- **Changer la clé secrète** (*Environment* sur Render) déconnecte tout le monde : les sessions en cours deviennent invalides.
- **Revenir en arrière** : onglet *Events* du service → *Rollback* sur un déploiement précédent. Les migrations, elles, ne sont pas annulées automatiquement.
