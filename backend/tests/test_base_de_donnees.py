import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from app.core.base_de_donnees import en_utc
from app.models import Utilisateur
from tests.conftest import SOUS_POSTGRESQL


@pytest.mark.skipif(SOUS_POSTGRESQL, reason="PostgreSQL applique toujours les clés étrangères")
def test_les_cles_etrangeres_sont_actives_sous_sqlite(session: Session) -> None:
    assert session.exec(text("PRAGMA foreign_keys")).one()[0] == 1  # type: ignore[call-overload]


def test_un_email_ne_sert_qu_une_fois(session: Session) -> None:
    session.add(Utilisateur(email="moi@exemple.fr", nom_affiche="Moi"))
    session.commit()

    session.add(Utilisateur(email="moi@exemple.fr", nom_affiche="Copie"))
    with pytest.raises(IntegrityError):
        session.commit()


def test_les_dates_relues_sont_en_utc(session: Session) -> None:
    utilisateur = Utilisateur(email="moi@exemple.fr", nom_affiche="Moi")
    session.add(utilisateur)
    session.commit()
    session.expire_all()

    relu = session.get(Utilisateur, utilisateur.id)
    assert relu is not None
    assert en_utc(relu.cree_le).utcoffset() is not None


def test_une_heure_de_paris_est_stockee_en_utc_et_relue_juste(session: Session) -> None:
    import datetime as dt
    from zoneinfo import ZoneInfo

    seize_heures_paris = dt.datetime(2026, 11, 21, 16, tzinfo=ZoneInfo("Europe/Paris"))
    compte = Utilisateur(email="moi@exemple.fr", nom_affiche="Moi", expire_le=seize_heures_paris)
    session.add(compte)
    session.commit()
    session.expire_all()

    relu = session.get(Utilisateur, compte.id)
    assert relu is not None and relu.expire_le is not None
    assert relu.expire_le == seize_heures_paris  # même instant
    assert relu.expire_le.utcoffset() == dt.timedelta(0)  # exprimé en UTC
