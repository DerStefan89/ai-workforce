/**
 * Datei: scripts/leitstand-seed.mjs
 *
 * Zweck: Einmaliges Seed-Skript für den F10-Leitstand-Prototyp. Legt über
 * die echten Produktionsfunktionen (registriereKernArtefakt,
 * registriereWerkzeugReferenz aus F2) zwei reale, aussagekräftige
 * Lineage-Einträge in kontrollzustand/ an — kein Fake-JSON, kein
 * kontrollzustand-test/. Ist NICHT Teil des Leitstand-Servers (der bleibt
 * rein lesend) und läuft nicht bei jedem Serverstart mit.
 *
 * Wird aufgerufen von: `npm run leitstand:seed` (manuell, einmalig)
 *
 * Wichtig: Erzeugt Produktionszustand unter kontrollzustand/ — vor
 * erneutem Ausführen prüfen, ob die Artefakt-IDs schon existieren
 * (schreibeCheckpoint hängt sonst weitere Versionen an, statt zu
 * überschreiben — das ist beabsichtigtes F1-Verhalten, kein Bug hier).
 */

import { readFileSync } from 'node:fs'
import { sha256Hex } from '../src/checkpoint-store/index.ts'
import { registriereKernArtefakt, registriereWerkzeugReferenz } from '../src/lineage-registry/index.ts'

const profil = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }

const featureMd = readFileSync('features/F2/feature.md', 'utf8')
const kern = registriereKernArtefakt(
  'f2-feature-beschreibung',
  profil,
  { erzeuger: 'kern', schritt: 'leitstand-seed' },
  { quelle_pfad: 'features/F2/feature.md', inhalts_hash: sha256Hex(featureMd) },
  [{ pfad: 'features/F2/feature.md', zitierter_bereich: 'gesamte Datei', inhalts_hash: sha256Hex(featureMd) }]
)
console.log('kern-erzeugtes Artefakt angelegt:', kern)

const architectureMd = readFileSync('ARCHITECTURE.md', 'utf8')
const werkzeug = registriereWerkzeugReferenz(
  'architecture-referenz',
  profil,
  'ARCHITECTURE.md',
  'gesamte Datei',
  architectureMd,
  { erzeuger: 'werkzeug', schritt: 'leitstand-seed' },
  [{ pfad: 'ARCHITECTURE.md', zitierter_bereich: 'gesamte Datei', inhalts_hash: sha256Hex(architectureMd) }]
)
console.log('werkzeug-erzeugte Referenz angelegt:', werkzeug)
