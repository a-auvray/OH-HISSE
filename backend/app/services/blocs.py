"""Blocs d'entraînement et séance du jour."""

import datetime as dt

from fastapi import HTTPException, status
from sqlmodel import Session, col, func, select

from app.models import Bloc, Seance, Utilisateur
from app.moteurs import poids, recuperation, sommeil
from app.moteurs.autoregulation import ExercicePrevu, Forme, charger_regles, index_prochaine_seance, proposer
from app.schemas.blocs import (
    AvancementBloc,
    BlocImporte,
    BlocLu,
    FormeDuJour,
    PoidsUtilise,
    Proposition,
    SeanceDuJour,
    SeanceDuProgramme,
)
from app.services import streetlifting as service
from app.services import vie_courante


def slugs_vers_ids(session: Session, utilisateur: Utilisateur) -> dict[str, tuple[int, str]]:
    """slug → (identifiant, nom) des exercices accessibles."""
    return {
        e.slug: (e.id, e.nom) for e in service.exercices_accessibles(session, utilisateur) if e.id is not None
    }


def verifier_programme(session: Session, utilisateur: Utilisateur, bloc: BlocImporte) -> None:
    connus = slugs_vers_ids(session, utilisateur)
    inconnus = sorted({ex.exercice for s in bloc.seances for ex in s.exercices} - connus.keys())
    if inconnus:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            f"Exercice inconnu dans le bloc : {', '.join(inconnus)}. Connus : {', '.join(sorted(connus))}.",
        )


def nb_realisees(session: Session, bloc: Bloc) -> int:
    requete = select(func.count()).select_from(Seance).where(Seance.bloc_id == bloc.id)
    return int(session.exec(requete).one())


def total(bloc: Bloc) -> int:
    return len(bloc.programme) * bloc.cycles


def est_actif(bloc: Bloc, realisees: int, jour: dt.date) -> bool:
    return bloc.debut <= jour and (bloc.fin is None or bloc.fin >= jour) and realisees < total(bloc)


def vers_lecture(session: Session, bloc: Bloc, jour: dt.date) -> BlocLu:
    realisees = nb_realisees(session, bloc)
    assert bloc.id is not None  # noqa: S101
    return BlocLu(
        id=bloc.id,
        nom=bloc.nom,
        type=bloc.type,
        cycles=bloc.cycles,
        seances=[SeanceDuProgramme.model_validate(s) for s in bloc.programme],
        debut=bloc.debut,
        fin=bloc.fin,
        objectif_id=bloc.objectif_id,
        seances_realisees=realisees,
        seances_total=total(bloc),
        actif=est_actif(bloc, realisees, jour),
    )


def blocs(session: Session, utilisateur: Utilisateur) -> list[Bloc]:
    requete = (
        select(Bloc)
        .where(Bloc.utilisateur_id == utilisateur.id)
        .order_by(col(Bloc.debut).desc(), col(Bloc.id).desc())
    )
    return list(session.exec(requete).all())


def bloc_actif(session: Session, utilisateur: Utilisateur, jour: dt.date) -> Bloc | None:
    """Le bloc en cours le plus récent (en cas de chevauchement, le dernier commencé l'emporte)."""
    return next(
        (b for b in blocs(session, utilisateur) if est_actif(b, nb_realisees(session, b), jour)), None
    )


def forme_du_jour(session: Session, utilisateur: Utilisateur, jour: dt.date) -> tuple[Forme, FormeDuJour]:
    """Sommeil de la nuit et consigne de récupération, pour ajuster la séance du jour."""
    instant = vie_courante.maintenant()
    if jour != instant.date():
        instant = dt.datetime.combine(jour, dt.time(12), vie_courante.PARIS)
    donnees = vie_courante.donnees(session, utilisateur, instant)
    nuit = sommeil.tendance(donnees.nuits, jour).derniere_nuit
    etat = vie_courante.etat_recuperation(donnees, instant)
    c = recuperation.consigne(etat)
    forme = Forme(
        sommeil_h=nuit.heures if nuit else None,
        rpe_baisse=c.rpe_baisse,
        rpe_plafond=c.rpe_plafond,
        series_au_minimum=c.series_au_minimum,
        raison_recuperation=c.raison,
    )
    consignes = [c.raison] if c.raison else []
    if nuit and nuit.heures < charger_regles().sommeil_court_h:
        consignes.insert(0, f"Nuit de {nuit.heures:g} h : séance adaptée")
    return forme, FormeDuJour(
        sommeil_h=nuit.heures if nuit else None, recuperation_restant_h=etat.restant_h, consignes=consignes
    )


def seance_du_jour(session: Session, utilisateur: Utilisateur, jour: dt.date) -> SeanceDuJour:
    bloc = bloc_actif(session, utilisateur, jour)
    if bloc is None:
        return SeanceDuJour(
            bloc=None,
            nom=None,
            poids=None,
            propositions=[],
            message="Aucun bloc en cours : importe un bloc pour recevoir ta séance du jour.",
        )

    realisees = nb_realisees(session, bloc)
    rang = index_prochaine_seance(realisees, len(bloc.programme), bloc.cycles)
    assert rang is not None and bloc.id is not None  # noqa: S101  (le bloc est actif)
    modele = SeanceDuProgramme.model_validate(bloc.programme[rang])
    pdc = poids.poids_a_la_date(service.pesees(session, utilisateur), jour)
    exercices = slugs_vers_ids(session, utilisateur)
    regles = charger_regles()
    forme, forme_lue = forme_du_jour(session, utilisateur, jour)

    propositions = []
    for ligne in modele.exercices:
        exercice_id, nom = exercices[ligne.exercice]
        prevu = ExercicePrevu(ligne.exercice, ligne.series_min, ligne.series_max, ligne.reps, ligne.rpe_cible)
        if pdc is None:
            propositions.append(
                Proposition(
                    exercice_id=exercice_id,
                    exercice=nom,
                    series=ligne.series_min,
                    reps=ligne.reps,
                    rpe_cible=ligne.rpe_cible or regles.rpe_par_defaut(bloc.type, ligne.reps),  # type: ignore[arg-type]
                    lest_kg=None,
                    justifications=[
                        "Aucune pesée : enregistre ton poids pour que les charges soient calculées"
                    ],
                )
            )
            continue
        historique = service.performances(session, utilisateur, exercice_id, avant=jour)
        resultat = proposer(prevu, bloc.type, historique, pdc.kg, forme, regles)  # type: ignore[arg-type]
        propositions.append(
            Proposition(
                exercice_id=exercice_id,
                exercice=nom,
                series=resultat.series,
                reps=resultat.reps,
                rpe_cible=resultat.rpe_cible,
                lest_kg=resultat.lest_kg,
                justifications=list(resultat.justifications),
            )
        )

    return SeanceDuJour(
        bloc=AvancementBloc(
            id=bloc.id,
            nom=bloc.nom,
            type=bloc.type,
            numero=realisees + 1,
            total=total(bloc),
            rang_modele=rang,
        ),
        nom=modele.nom,
        poids=PoidsUtilise(kg=pdc.kg, a_jour=pdc.a_jour) if pdc else None,
        propositions=propositions,
        forme=forme_lue,
    )
