@echo off
rem Lance Oh Hisse ! en local : interface + API sur http://localhost:8000
rem Les donnees sont dans backend\oh-hisse.db ; une sauvegarde datee est faite a chaque demarrage (dossier sauvegardes).
setlocal
cd /d "%~dp0"
echo === Oh Hisse ! ===

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
  echo L'interface n'a pas pu etre construite.
  pause
  exit /b 1
)
popd

pushd backend
call uv sync --quiet
call uv run alembic upgrade head
call uv run python scripts/sauvegarder.py
echo.
echo Oh Hisse ! tourne sur http://localhost:8000 ^(Ctrl+C pour arreter^)
start "" http://localhost:8000
call uv run uvicorn app.main:app --port 8000 --timeout-graceful-shutdown 1
popd
