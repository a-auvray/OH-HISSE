@echo off
rem Lance Oh Hisse ! en local : interface + API sur http://localhost:8000
rem Les donnees sont dans backend\oh-hisse.db ; une sauvegarde datee est faite a chaque demarrage (dossier sauvegardes).
rem La fenetre reste ouverte en cas de probleme : le message est lisible.
setlocal
cd /d "%~dp0"
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

netstat -ano | findstr /R /C:":8000 .*LISTENING" >nul
if not errorlevel 1 (
  echo.
  echo [!] Le port 8000 est deja utilise : Oh Hisse ! tourne peut-etre deja
  echo     ^(ouvre http://localhost:8000^) ou un autre programme l'occupe.
  start "" http://localhost:8000
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
start "" /b powershell -NoProfile -Command "for($i=0;$i -lt 90;$i++){try{Invoke-WebRequest http://localhost:8000/api/docs -UseBasicParsing -TimeoutSec 1 | Out-Null;Start-Process http://localhost:8000;break}catch{Start-Sleep -Milliseconds 700}}"

echo.
echo Oh Hisse ! demarre sur http://localhost:8000 ^(Ctrl+C pour arreter^)
call uv run uvicorn app.main:app --port 8000 --timeout-graceful-shutdown 1
popd

:fin
echo.
echo Appuie sur une touche pour fermer cette fenetre.
pause >nul
