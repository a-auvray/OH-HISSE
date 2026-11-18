# Oh Hisse ! en un seul service : FastAPI sert l'API (/api) et l'interface React.

# --- 1. Interface : construite une fois, seuls les fichiers statiques sont gardés ------------
FROM node:24-slim AS interface
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# --- 2. API -----------------------------------------------------------------------------------
FROM python:3.14-slim
COPY --from=ghcr.io/astral-sh/uv:0.11.7 /uv /usr/local/bin/uv

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    PYTHONUNBUFFERED=1 \
    PATH="/app/backend/.venv/bin:$PATH" \
    OH_HISSE_ENVIRONNEMENT=production

WORKDIR /app/backend
# Les dépendances d'abord : cette couche ne bouge que si uv.lock change.
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --locked --no-dev --no-install-project
COPY backend/ ./
RUN uv sync --locked --no-dev

COPY --from=interface /app/frontend/dist /app/frontend/dist

RUN useradd --system --no-create-home oh-hisse
USER oh-hisse

# Render fournit le port dans $PORT. Les migrations passent avant chaque démarrage.
EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
