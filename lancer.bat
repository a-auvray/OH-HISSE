@echo off
rem Lance Oh Hisse ! en local : interface + API sur http://localhost:%OH_HISSE_PORT%
rem Les donnees sont dans backend\oh-hisse.db ; une sauvegarde datee est faite a chaque demarrage (dossier sauvegardes).
rem La fenetre reste ouverte en cas de probleme : le message est lisible.
rem Avec /app (utilise par Oh Hisse.exe) : pas de navigateur ouvert ici, pas de pause ; le programme s'en charge.
setlocal
cd /d "%~dp0"
set "APP=0"
if not defined OH_HISSE_PORT set "OH_HISSE_PORT=8000"
rem Usage personnel en local : pas d'ecran de connexion (le compte personnel s'ouvre directement).
rem Retirer cette ligne pour reactiver la connexion. Sans effet, et interdit, en production.
if not defined OH_HISSE_SANS_CONNEXION set "OH_HISSE_SANS_CONNEXION=1"
if /i "%~1"=="/app" set "APP=1"
echo === Oh Hisse ! ===

where uv >nul 2>nul
if errorlevel 1 (
  echo.
  echo [!] Le programme "uv" est introuvable. Installe-le : https://docs.astral.sh/uv/
  echo     Puis ferme cette fenetre et relance.
  goto :fin
)
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [!] Node.js est introuvable. Installe-le : https://nodejs.org/
  echo     Puis ferme cette fenetre et relance.
  goto :fin
)

netstat -ano | findstr /R /C:":%OH_HISSE_PORT% .*LISTENING" >nul
if not errorlevel 1 (
  echo.
  echo [!] Le port %OH_HISSE_PORT% est deja utilise : Oh Hisse ! tourne peut-etre deja
  echo     ^(ouvre http://localhost:%OH_HISSE_PORT%^) ou un autre programme l'occupe.
  if "%APP%"=="0" start "" http://localhost:%OH_HISSE_PORT%
  goto :fin
)

if not exist frontend\node_modules (
  echo Installation de l'interface, premiere fois seulement...
  pushd frontend
  call npm install
  popd
)

echo Construction de l'interface...
pushd frontend
call npx vite build --logLevel warn
if errorlevel 1 (
  popd
  echo.
  echo [!] L'interface n'a pas pu etre construite.
  goto :fin
)
popd

pushd backend
call uv sync --quiet
if errorlevel 1 (
  popd
  echo.
  echo [!] L'installation du serveur a echoue.
  goto :fin
)
call uv run alembic upgrade head
if errorlevel 1 (
  popd
  echo.
  echo [!] La mise a jour de la base a echoue : rien n'a ete modifie, ta derniere sauvegarde est dans le dossier sauvegardes.
  goto :fin
)
call uv run python scripts/sauvegarder.py

rem Le navigateur s'ouvre quand le serveur repond, pas avant.
if "%APP%"=="0" start "" /b powershell -NoProfile -Command "for($i=0;$i -lt 90;$i++){try{Invoke-WebRequest http://localhost:%OH_HISSE_PORT%/api/docs -UseBasicParsing -TimeoutSec 1 | Out-Null;Start-Process http://localhost:%OH_HISSE_PORT%;break}catch{Start-Sleep -Milliseconds 700}}"

echo.
echo Oh Hisse ! demarre sur http://localhost:%OH_HISSE_PORT% ^(Ctrl+C pour arreter^)
call uv run uvicorn app.main:app --port %OH_HISSE_PORT% --timeout-graceful-shutdown 1
popd

:fin
if "%APP%"=="1" exit /b 1
echo.
echo Appuie sur une touche pour fermer cette fenetre.
pause >nul
