import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

from app.core.sauvegarde import chemin_sqlite, sauvegarder


def creer_base(chemin: Path, valeur: str) -> None:
    connexion = sqlite3.connect(chemin)
    connexion.execute("create table t (v text)")
    connexion.execute("insert into t values (?)", (valeur,))
    connexion.commit()
    connexion.close()


def test_la_sauvegarde_est_une_copie_complete(tmp_path: Path) -> None:
    source = tmp_path / "oh-hisse.db"
    creer_base(source, "séance du lundi")

    cible = sauvegarder(source, tmp_path / "sauvegardes", maintenant=datetime(2026, 11, 24, 8, 30, 5))

    assert cible.name == "oh-hisse-20261124-083005.db"
    assert sqlite3.connect(cible).execute("select v from t").fetchall() == [("séance du lundi",)]


def test_seules_les_dernieres_sauvegardes_sont_gardees(tmp_path: Path) -> None:
    source = tmp_path / "oh-hisse.db"
    creer_base(source, "x")
    debut = datetime(2026, 11, 1, 8)

    for jour in range(5):
        sauvegarder(source, tmp_path / "s", maintenant=debut + timedelta(days=jour), garder=3)

    noms = sorted(p.name for p in (tmp_path / "s").iterdir())
    assert noms == [
        "oh-hisse-20261103-080000.db",
        "oh-hisse-20261104-080000.db",
        "oh-hisse-20261105-080000.db",
    ]


def test_seul_le_sqlite_sur_disque_est_sauvegardable() -> None:
    assert chemin_sqlite("sqlite:///C:/donnees/oh-hisse.db") == Path("C:/donnees/oh-hisse.db")
    assert chemin_sqlite("sqlite://") is None
    assert chemin_sqlite("postgresql://u:p@hote/base") is None
