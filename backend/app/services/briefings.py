"""Briefings : rassembler les faits de chaque espace (note 08 : « Tous les espaces → Briefings »)."""

import datetime as dt
from statistics import mean

from sqlmodel import Session, select

from app.models import Bloc, Nuit, Objectif, SortieMer, Utilisateur
from app.moteurs import briefing, poids
from app.moteurs.briefing import FaitsBloc, FaitsJour, FaitsMer, FaitsObjectif, FaitsSeance, FaitsSemaine
from app.schemas.objectifs import ObjectifLu
from app.services import blocs, marine, streetlifting, vie_courante
from app.services.objectifs import lecture, objectif_principal
from app.services.open_meteo import ConditionsIndisponibles, OpenMeteo


def _faits_objectif(o: ObjectifLu | None) -> FaitsObjectif | None:
    if o is None:
        return None
    return FaitsObjectif(
        titre=o.titre,
        e1rm_lest_kg=o.progression.e1rm_lest_kg if o.progression else None,
        cible_kg=o.valeur_cible_kg,
        pourcentage=o.progression.pourcentage if o.progression else None,
        jours_restants=o.jours_restants,
    )


def _faits_mer(session: Session, utilisateur: Utilisateur, meteo: OpenMeteo) -> FaitsMer | None:
    try:
        c = marine.conditions(meteo, marine.spots(session, utilisateur)[0])
    except ConditionsIndisponibles:
        return None
    m = c.maintenant
    prochaine = next((x for x in c.marees if x.instant > m.instant), None)
    texte_maree = None
    if prochaine:
        texte_maree = f"{'Pleine' if prochaine.type == 'PM' else 'Basse'} mer à {prochaine.instant:%H:%M}" + (
            f" · coef. {prochaine.coefficient}" if prochaine.coefficient else ""
        )
    return FaitsMer(
        niveau=c.danger.niveau,
        raison=c.danger.raisons[0].texte if c.danger.raisons else None,
        eau_c=m.eau_c,
        air_c=m.air_c,
        vent_kmh=m.vent_kmh,
        prochaine_maree=texte_maree,
    )


def quotidien(session: Session, utilisateur: Utilisateur, meteo: OpenMeteo) -> briefing.Briefing:
    instant = vie_courante.maintenant()
    donnees = vie_courante.donnees(session, utilisateur, instant)
    recup = vie_courante.etat_recuperation(donnees, instant)
    sommeil = vie_courante.tendance_sommeil(donnees, instant)
    seance = blocs.seance_du_jour(session, utilisateur, instant.date())
    faits_seance = None
    if seance.bloc and seance.nom:
        faits_seance = FaitsSeance(
            nom=seance.nom,
            exercices=len(seance.propositions),
            numero=seance.bloc.numero,
            total=seance.bloc.total,
            consignes=tuple(seance.forme.consignes) if seance.forme else (),
        )
    return briefing.quotidien(
        FaitsJour(
            jour=instant.date(),
            mer=_faits_mer(session, utilisateur, meteo),
            seance=faits_seance,
            recuperation_restant_h=recup.restant_h,
            sommeil_h=sommeil.derniere_nuit.heures if sommeil.derniere_nuit else None,
            sommeil_moyenne_h=sommeil.moyenne_h,
            cheat_meal=vie_courante.verdict_cheat_meal(donnees, instant).phrase,
            objectif=_faits_objectif(objectif_principal(session, utilisateur)),
        )
    )


def _meilleur_par_exercice(
    session: Session, utilisateur: Utilisateur, debut: dt.date, fin: dt.date
) -> dict[str, float]:
    """Meilleur 1RM estimé en lest par exercice sur une période."""
    resultat: dict[str, float] = {}
    for exercice in streetlifting.exercices_accessibles(session, utilisateur):
        assert exercice.id is not None  # noqa: S101
        valeurs = [
            p.e1rm_lest_kg
            for p in streetlifting.evolution(session, utilisateur, exercice.id)
            if debut <= p.date <= fin and p.e1rm_lest_kg is not None
        ]
        if valeurs:
            resultat[exercice.nom] = max(valeurs)
    return resultat


def hebdomadaire(session: Session, utilisateur: Utilisateur, decalage: int = 0) -> briefing.Briefing:
    aujourdhui = vie_courante.maintenant().date()
    lundi = aujourdhui - dt.timedelta(days=aujourdhui.weekday() + 7 * decalage)
    dimanche = lundi + dt.timedelta(days=6)

    seances = streetlifting.seances(session, utilisateur, lundi, dimanche)
    toutes_pesees = streetlifting.pesees(session, utilisateur)
    tonnage = 0.0
    for s in seances:
        pdc = poids.poids_a_la_date(toutes_pesees, s.date)
        tonnage += sum(x.reps * ((pdc.kg if pdc else 0) + x.lest_kg) for x in s.series)

    cette = _meilleur_par_exercice(session, utilisateur, lundi, dimanche)
    avant = _meilleur_par_exercice(
        session, utilisateur, lundi - dt.timedelta(days=7), lundi - dt.timedelta(days=1)
    )

    sorties = session.exec(
        select(SortieMer).where(
            SortieMer.utilisateur_id == utilisateur.id,
            SortieMer.debut >= dt.datetime.combine(lundi, dt.time(), vie_courante.PARIS),
            SortieMer.debut
            < dt.datetime.combine(dimanche + dt.timedelta(days=1), dt.time(), vie_courante.PARIS),
        )
    ).all()
    nuits = session.exec(
        select(Nuit).where(Nuit.utilisateur_id == utilisateur.id, Nuit.date >= lundi, Nuit.date <= dimanche)
    ).all()
    pdc = poids.poids_a_la_date(toutes_pesees, min(dimanche, aujourdhui))

    return briefing.hebdomadaire(
        FaitsSemaine(
            lundi=lundi,
            seances=len(seances),
            series=sum(len(s.series) for s in seances),
            tonnage_kg=tonnage,
            sorties=len(sorties),
            minutes_en_mer=sum(s.duree_min for s in sorties),
            sommeil_moyenne_h=round(mean(n.heures for n in nuits), 1) if nuits else None,
            nuits=len(nuits),
            progres=tuple((nom, valeur, avant.get(nom)) for nom, valeur in sorted(cette.items())),
            poids_kg=pdc.kg if pdc else None,
        )
    )


def du_bloc(session: Session, utilisateur: Utilisateur, bloc: Bloc, moment: str) -> briefing.Briefing:
    aujourdhui = vie_courante.maintenant().date()
    lu = blocs.vers_lecture(session, bloc, aujourdhui)
    noms = {e.slug: e.nom for e in streetlifting.exercices_accessibles(session, utilisateur)}
    slugs = list(dict.fromkeys(ex.exercice for s in lu.seances for ex in s.exercices))
    fin = bloc.fin or aujourdhui

    seances_du_bloc = [
        s for s in streetlifting.seances(session, utilisateur, bloc.debut, fin) if s.bloc_id == bloc.id
    ]
    rpes = [
        10.0 if x.echec else x.rpe for s in seances_du_bloc for x in s.series if x.echec or x.rpe is not None
    ]
    avant = _meilleur_par_exercice(
        session, utilisateur, bloc.debut - dt.timedelta(days=28), bloc.debut - dt.timedelta(days=1)
    )
    pendant = _meilleur_par_exercice(session, utilisateur, bloc.debut, fin)

    objectif = None
    if bloc.objectif_id is not None:
        ligne = session.get(Objectif, bloc.objectif_id)
        objectif = _faits_objectif(lecture(session, utilisateur, ligne)) if ligne else None

    faits = FaitsBloc(
        nom=bloc.nom,
        type=bloc.type,
        debut=bloc.debut,
        fin=bloc.fin,
        seances_prevues=lu.seances_total,
        seances_realisees=lu.seances_realisees,
        exercices=tuple(noms.get(s, s) for s in slugs),
        objectif=objectif,
        progression=tuple(
            (noms.get(s, s), avant.get(noms.get(s, s)), pendant.get(noms.get(s, s))) for s in slugs
        ),
        rpe_moyen=round(mean(r for r in rpes if r is not None), 1) if rpes else None,
    )
    return briefing.debut_de_bloc(faits) if moment == "debut" else briefing.fin_de_bloc(faits)
