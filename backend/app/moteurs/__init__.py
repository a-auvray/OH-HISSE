"""Moteurs de règles : la logique métier d'Oh Hisse !

Règle d'or : uniquement des fonctions pures. Elles reçoivent des données et
renvoient un résultat, sans jamais toucher à la base, aux routes ni au réseau.
C'est ce qui les rend simples à tester et à faire évoluer.

    autoregulation   séance suivante
    recuperation     état de récupération
    cheat_meal       verdict « écart mérité ? »
    danger           vert / rouge / noir
    recommandations  tenue, créneau, direction de nage
    briefing         synthèses du jour, de la semaine, du bloc
"""
