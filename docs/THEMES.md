# Thèmes

Décidé le 23/11/2026, à partir du lookbook de design (13 directions, toutes
gardées). L'application a plusieurs **thèmes complets** entre lesquels on
change dans l'interface. Cette décision complète la note 11 du cahier des
charges (« Design et navigation »), qui prévoyait un seul design.

## Principes

- **Un thème est global.** Il fournit l'accueil, les quatre espaces et leur
  transition, qui vont ensemble. On ne mélange pas les pièces de deux thèmes :
  une mer très animée à côté d'un accueil minimaliste sonne faux. Des variantes
  pourront naître d'un thème qui marche particulièrement bien.
- **Le thème ne fait que présenter.** Les données, la logique, les routes et les
  actions sont communes à tous les thèmes. Aucune donnée ni action n'existe dans
  un seul thème (pas de version « gratuite » et de version « payante »).
- **Un socle commun, des extras permis.** Les fonctions principales de chaque
  page sont présentes dans tous les thèmes (au minimum une jauge de progression,
  les badges de danger…). Un thème plus riche peut montrer davantage, à partir
  des mêmes données. La liste des blocs obligatoires par page se précise au fil
  de la construction des thèmes.
- **Les transitions appartiennent au thème.** Elles pourront devenir
  échangeables plus tard, ce n'est pas prioritaire.
- **Les réglages sont discrets** : un point en bas à droite, qui ne se montre
  qu'au survol (`themes/Selecteur.tsx`). Thème, favoris, niveau d'animation.
- **Niveau d'animation : Cinéma / Sobre / Immobile.** Réglage global, mémorisé
  avec le thème. L'attribut `data-animations` de `<html>` permet aux feuilles de
  style de s'y adapter, et « Immobile » coupe les animations de `motion`. Les
  animations restent actives même si le système demande de les réduire
  (décision du 18/11/2026).

## Fonctionnement

```
themes/
  types.ts            Theme (les pièces) et MetaTheme (de quoi l'afficher sans le charger)
  registre.ts         la liste des thèmes ; chacun se charge par import()
  FournisseurTheme    charge le thème choisi, le remplace, mémorise les réglages
  Selecteur           le panneau discret
  classique/          le design d'origine, devenu un thème
  papier/             feuille crème aux bords repliés, ton jour et ton soir (accueil et coque des espaces ; les vues sont refaites une à une)
```

- Seul le thème courant est téléchargé. Un autre thème commence à se
  télécharger quand on survole sa ligne dans le sélecteur ; au clic, un voile de
  200 ms couvre l'écran le temps du changement.
- Si un thème ne se charge pas, celui qui marche reste en place et un message
  s'affiche. Au démarrage, un thème mémorisé introuvable retombe sur « Classique ».
- Les réglages sont dans le `localStorage` du navigateur (`oh-hisse.themes`).
  Les mémoriser dans le profil, pour les retrouver d'un appareil à l'autre, est
  une évolution possible.
- Les feuilles de style d'un thème se rattachent à `[data-theme='<id>']` sur
  `<html>` ; les modules CSS ont déjà des noms uniques.

## Légèreté (exigence)

Rien d'un thème ne doit peser sur l'application tant qu'on ne l'utilise pas, ni
la ralentir quand on l'utilise.

| Règle | Comment |
|---|---|
| Aucun thème dans le paquet de départ | chargement par `import()`, polices comprises : chaque thème importe les siennes |
| Poids contrôlé | `npm run budget` (CI) : départ ≤ 150 ko JS et 12 ko CSS gzip, morceau de thème ou d'espace ≤ 80 ko, carte à part |
| Un seul thème en mémoire à la fois | `Theme.liberer()` est appelé quand on le quitte (contexte WebGL, boucles d'animation) |
| Pas de travail caché | un thème met ses boucles d'animation en pause quand l'onglet est masqué et n'ouvre qu'un seul contexte WebGL |
| WebGL mesuré | résolution plafonnée à 1,5 ; repli automatique vers un rendu plus simple si la fluidité baisse |
| Polices légères | variables et en sous-ensemble latin, chargées seulement avec le thème qui les utilise |
| Images | générées à part, compressées, ajoutées thème par thème |

Mesure du socle : le paquet de départ est passé de 137 à 125 ko gzip (les
polices des espaces ne se chargent plus qu'avec leur thème).

## Créer un thème

1. Créer `themes/<id>/index.ts` qui exporte un `Theme` par défaut : `Accueil`,
   `Espaces` (les quatre), `Scene`, et si besoin `liberer`.
2. Y importer ses polices et ses styles, rattachés à `[data-theme='<id>']`.
3. Ajouter une ligne dans `registre.ts` (nom, description, couleurs d'aperçu).
4. `contrat.test.ts` vérifie que rien ne manque ; `npm run budget` que le poids
   reste dans les limites.

## Où en sont les thèmes

| Thème | Accueil | Espaces | Transition |
|---|---|---|---|
| Classique | fait | fait | fait |
| Papier | fait (jour et soir) | coque et vues principales faites pour les quatre ; pages intérieures accordées par les jetons de surface | faite : un rabat qui se déplie |
| Matière | à faire | à faire | à faire |
| Estampe | à faire | à faire | à faire |

L'accueil de Papier montre les mêmes données que celui de Classique, lues par
`accueil/useBriefing` ; la phrase du jour (`accueil/phrase.ts`) est calculée à
partir de ces données, jamais écrite à la main.

Fait pour Papier : Marine (page Conditions, la plage en coupe), Streetlifting (séance du
jour, analyse en planche avec rail de miniatures), Vie courante (« Aujourd'hui », calme et
aérée) et Objectifs (des drisses qu'on hisse). La transition est un rabat qui se déplie autour du bord par lequel on entre dans
l'espace. Les pages intérieures (saisie, calendrier, blocs, sommeil, briefings, assistant,
carte, carnet) gardent leur mise en page mais prennent les couleurs du thème (voir ci-dessous).
Pour chaque page, les données et les actions sortent d'abord de l'affichage dans
un hook commun, puis le thème en montre une version à lui.

**La coque et les jetons de surface.** Chaque espace Papier est une coque commune (`papier/Coque`) :
la feuille, l'en-tête avec ses onglets, le dos du pli pour retourner à l'accueil, le ton
jour ou sombre, et un décor propre à l'espace (houle pour Marine, hachures pour
Streetlifting, lumière qui respire pour Vie courante, règle graduée pour Objectifs). Les pages
intérieures n'écrivent plus aucune couleur de surface en dur : elles utilisent les jetons de
`styles/tokens.css` (`--surface`, `--surface-haute`, `--creux`, `--voile`, `--filet`,
`--sur-accent`, `--ombre-carte`, `--succes-texte`, `--alerte-texte`, `--danger-texte`, plus
`--accent` et `--accent-clair`), que chaque thème redéfinit. Un nouveau thème n'a donc qu'à
donner ces valeurs pour que toutes les pages lui soient accordées ; il redessine ensuite
celles qui méritent une mise en page à lui.

Le lookbook et ses prototypes sont dans `design-lookbook/` (hors dépôt).

## Thème par défaut

Papier est le thème par défaut ; Classique est le thème de secours, si celui qui est choisi ne se charge pas.
Les réglages ne sont mémorisés qu'après un vrai choix (clé `oh-hisse.themes.v2`) : un simple passage ne fige pas
le thème par défaut.
