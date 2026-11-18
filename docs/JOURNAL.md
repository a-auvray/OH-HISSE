# Journal de bord

## Modèle d'entrée

**Date :** [JJ/MM/AAAA]
**Branche :** [type/espace-fonctionnalite]

### Ce qui a été fait
- 

### Choix techniques
- 

### Ce qui a bloqué / Solutions trouvées
- 

---

## 18/11/2026 — Phase 0 : cadrage

**Branches :** `chore/hygiene-depot`, `docs/cadrage-phase-0`

### Ce qui a été fait
- Dépôt assaini : `.gitignore` réparé (`node_modules` et `*.db` n'étaient pas ignorés à cause de retours à la ligne manquants), noms de notes réencodés en UTF-8, dossier `docs/cahier-des-charges` aligné sur l'arborescence du CDC.
- API externes testées sur Ouistreham, Colleville-Montgomery et Hermanville-sur-Mer → [`docs/recherche/api-externes.md`](recherche/api-externes.md).
- Prototype de marée (`prototypes/marees/comparer_marees.py`) comparé à l'annuaire SHOM de Ouistreham.
- Décisions de la phase 0 reportées dans le CDC (notes 00, 01, 03, 04, 07, 09 à 13).

### Choix techniques
- **Marées sans service payant.** La hauteur d'eau d'Open-Meteo, décalée de +4,9 m pour la ramener au zéro hydrographique, colle à l'annuaire à ±0,22 m. Les horaires dérivent jusqu'à 1 h 30 en mortes-eaux, à cause de la tenue du plein de la baie de Seine : l'appli affichera donc une estimation.
- **Coefficient recalculé** par sa définition SHOM (marnage à Brest / 6,10 m) : 0 à 3 points d'écart.
- **1RM : formule RPE seule**, sur poids du corps + lest.

### Ce qui a bloqué / Solutions trouvées
- Le service de maree.shom.fr n'est pas une API publique : écarté. La comparaison s'est faite sur l'annuaire publié par maree.info.
- RGE ALTI (IGN) s'arrête au haut de plage (≈ −0,4 m IGN69) : l'estran découvert à marée basse demandera Litto3D, ou la pente par spot.
