"""Écrit le schéma OpenAPI de l'API sur la sortie standard.

Le frontend en tire ses types TypeScript (`npm run api:types`) : si une route
change côté backend, la compilation du frontend le signale immédiatement.
"""

import json
import sys

from app.main import app

sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[union-attr]
json.dump(app.openapi(), sys.stdout, ensure_ascii=False, indent=2)
sys.stdout.write("\n")
