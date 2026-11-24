// Budget de poids : échoue si un morceau du build dépasse sa limite (tailles gzip, en ko).
// Lancé après « npm run build ». Les thèmes ne doivent jamais alourdir le départ de l'appli.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const dossier = fileURLToPath(new URL('../dist/assets/', import.meta.url))

/** [motif du nom de fichier, extension, limite en ko gzip, description] — la première règle qui correspond s'applique. */
const REGLES = [
  [/^index-/, 'js', 150, 'paquet de départ (connexion + navigation, aucun thème)'],
  [/^index-/, 'css', 12, 'styles de départ'],
  [/^Carte-/, 'js', 320, 'carte (MapLibre), chargée à l’ouverture de son onglet'],
  [/^Carte-/, 'css', 15, 'styles de la carte'],
  [/^maplibre-gl-worker/, 'js', 200, 'travailleur de la carte, chargé avec elle'],
  // Un thème (son accueil et ses outils communs) et chacun de ses espaces, chargés à la demande.
  [/.*/, 'js', 80, 'morceau chargé à la demande (thème ou espace)'],
  [/.*/, 'css', 50, 'styles d’un morceau chargé à la demande'],
]

const ko = (octets) => octets / 1024
let echecs = 0

for (const nom of readdirSync(dossier).sort()) {
  const extension = nom.endsWith('.js') ? 'js' : nom.endsWith('.css') ? 'css' : null
  if (!extension) continue
  const regle = REGLES.find(([motif, ext]) => ext === extension && motif.test(nom))
  if (!regle) continue
  const taille = ko(gzipSync(readFileSync(join(dossier, nom)), { level: 9 }).length)
  const [, , limite, description] = regle
  const ok = taille <= limite
  if (!ok) echecs += 1
  console.log(
    `${ok ? 'ok ' : 'KO '} ${taille.toFixed(1).padStart(7)} / ${String(limite).padStart(3)} ko  ${nom}  (${description})`,
  )
}

// Sans son travailleur (fichier à part, voir vite.config.ts) la carte reste vide : le serveur répond 404.
if (!readdirSync(dossier).includes('maplibre-gl-worker.js')) {
  echecs += 1
  console.log('KO  maplibre-gl-worker.js est absent du build : la carte ne s’afficherait pas.')
}

if (echecs > 0) {
  console.error(
    `\n${echecs} morceau(x) au-dessus du budget. Alléger, ou relever la limite dans scripts/budget.mjs avec une justification.`,
  )
  process.exit(1)
}
