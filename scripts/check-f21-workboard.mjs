/**
 * Datei: scripts/check-f21-workboard.mjs
 *
 * Zweck: F21-WS-1-Gate (features/F21/feature.md, AK1/AK2/AK3/AK4/AK6). Vier
 * Teile: (1) drei kalibrierte Rot-Fälle aus AK1/AK6 gegen den echten
 * parseFindings — nicht parsebare Kopfzeile, doppelte ID, fehlendes
 * Titel-Feld — plus ein Grünfall daneben (Beleg, dass die Prüfung nicht
 * pauschal alles rot meldet, Muster scripts/check-f15-workflow.mjs). (2) das
 * reale state/findings.md und alle realen features/<id>/feature.md müssen
 * befundfrei parsen (Regressionsschutz F-367) — die erwartete Workitem-Zahl
 * wird gegen die tatsächliche Kopfzeilen-/Aktenzahl der Dateien geprüft,
 * NIE gegen eine Stichtagszahl in Prosa (F-368). (3) ein echter
 * HTTP-Server-Test für GET /api/workitems (Merge, Filter, Sortierung
 * P0→P4) gegen eine isolierte Fixture unter os.tmpdir() (AK3). (4) ein
 * echter HTTP-Server-Test für das kenntnisgenommen-Kopfdatum (AK4, F-370).
 *
 * F34-Fixpaket-Nachtrag (löst F-630) ergänzt: (5) erlaubte Typ-/Prioritätswerte in state/findings.md
 * — parseFindings akzeptiert strukturell jeden Typ/jede P0-P4-Priorität, ohne eigene Prüfung rutscht
 * ein Tippfehler wie 'PROCESS_GAP' (real passiert, F-626) unbemerkt durch. Erlaubt: BUG/
 * HARNESS_IMPROVEMENT/TECH_DEBT/PROCESS_IMPROVEMENT, Priorität P0-P3 — ein realer Alt-Bestand von 23
 * P4-Einträgen (Scan 23.09.2026) ist per Allowlist grandfathered statt massenhaft umgeschrieben, jede
 * NEUE P4-Vergabe ist ab jetzt ein Befund.
 *
 * Wird aufgerufen von: npm run check.
 *
 * Aufruf: node scripts/check-f21-workboard.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { erzeugeRequestHandler } from './leitstand-server.mjs'
import { schreibeWirkungsmarke } from '../src/checkpoint-store/index.ts'
import { registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { parseFeatureAkten, parseFindings } from '../src/workboard/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
console.log('\n=== F21-WS-1-Check (Workboard: Parser, GET /api/workitems, kenntnisgenommen) ===\n')

const PROFIL_REFERENZ = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
const STILL = () => {}

/** @param optionen - an erzeugeRequestHandler durchgereicht @returns { basisUrl, schliessen } eines echten HTTP-Testservers auf einem Ephemeral-Loopback-Port (Muster check-f20-zustand-poll.mjs) */
async function starteTestserver(optionen) {
  const server = createServer(erzeugeRequestHandler(optionen))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  return {
    basisUrl: `http://127.0.0.1:${port}`,
    schliessen: () => new Promise((resolve) => server.close(resolve)),
  }
}

// ─── (1) parseFindings: drei kalibrierte Rot-Fälle (AK1/AK6) plus ein Grünfall ──
{
  const befundeVor1 = befunde.length
  const rotFaelle = [
    { name: 'nicht parsebare Kopfzeile', inhalt: '**F-901** BUG P1 offen (falsche Trenner)\nTitel: Wird nie erreicht.\n', erwarteteArt: 'nicht_parsebare_kopfzeile' },
    { name: 'doppelt vergebene ID', inhalt: '**F-902** · `BUG` · P1 · offen\nTitel: Erster.\n\n**F-902** · `BUG` · P1 · offen\nTitel: Zweiter, gleiche ID.\n', erwarteteArt: 'doppelte_id' },
    { name: 'fehlendes Titel-Feld', inhalt: '**F-903** · `BUG` · P1 · offen\nBeschreibung: Kein Titel.\n', erwarteteArt: 'fehlendes_titel_feld' },
  ]
  for (const fall of rotFaelle) {
    const { befunde: gefundene } = parseFindings(fall.inhalt)
    if (!gefundene.some((b) => b.art === fall.erwarteteArt)) {
      befunde.push(`(1) Rot-Fall '${fall.name}': parseFindings meldete NICHT den erwarteten Befund '${fall.erwarteteArt}' — erhalten: ${JSON.stringify(gefundene)}`)
    }
  }

  const { workitems: gruenWorkitems, befunde: gruenBefunde } = parseFindings('**F-904** · `BUG` · P1 · offen\nTitel: Vollständiger Eintrag.\n')
  if (gruenBefunde.length !== 0 || gruenWorkitems.length !== 1) {
    befunde.push(`(1) Grünfall: ein vollständiger Eintrag sollte befundfrei parsen — erhalten workitems=${gruenWorkitems.length} befunde=${JSON.stringify(gruenBefunde)}`)
  }

  if (befunde.length === befundeVor1) {
    console.log('✓ (1) parseFindings: alle drei Rot-Fälle aus AK1/AK6 kalibriert (nicht parsebare Kopfzeile, doppelte ID, fehlendes Titel-Feld), Grünfall bleibt befundfrei.')
  }
}

// ─── (2) Das reale Register und die realen Feature-Akten parsen befundfrei ──
{
  const befundeVor2 = befunde.length

  const findingsInhalt = readFileSync('state/findings.md', 'utf-8')
  const { workitems: findingWorkitems, befunde: findingBefunde } = parseFindings(findingsInhalt)
  if (findingBefunde.length > 0) {
    befunde.push(`(2) state/findings.md hat reale Parser-Befunde (Regression zu F-367?): ${JSON.stringify(findingBefunde)}`)
  }
  const echteKopfzeilenzahl = (findingsInhalt.match(/^\*\*F-\d+\*\* · `[A-Z_]+` · P[0-4] · /gm) ?? []).length
  if (findingWorkitems.length !== echteKopfzeilenzahl) {
    befunde.push(`(2) AK1: Anzahl Workitems (${findingWorkitems.length}) weicht von der Anzahl gültiger Kopfzeilen in state/findings.md (${echteKopfzeilenzahl}) ab — Invariante, keine Stichtagszahl (F-368).`)
  }

  const featuresDir = 'features'
  const featureDateien = readdirSync(featuresDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .map((ordner) => ({ ordner, pfad: join(featuresDir, ordner, 'feature.md') }))
    .map((d) => ({ ...d, inhalt: existsSync(d.pfad) ? readFileSync(d.pfad, 'utf-8') : null }))
  const { workitems: featureWorkitems, befunde: featureBefunde } = parseFeatureAkten(featureDateien)
  if (featureBefunde.length > 0) {
    befunde.push(`(2) features/<id>/feature.md hat reale Parser-Befunde: ${JSON.stringify(featureBefunde)}`)
  }
  if (featureWorkitems.length !== featureDateien.length) {
    befunde.push(`(2) AK2: Anzahl Feature-Workitems (${featureWorkitems.length}) weicht von der Anzahl vorhandener feature.md-Dateien (${featureDateien.length}) ab.`)
  }

  if (befunde.length === befundeVor2) {
    console.log(`✓ (2) state/findings.md (${findingWorkitems.length} Workitems) und ${featureWorkitems.length} Feature-Akten parsen befundfrei (AK1/AK2, Regressionsschutz F-367).`)
  }
}

// ─── (3) GET /api/workitems: Merge, Filter, Sortierung P0→P4 (AK3) ─────────
{
  const befundeVor3 = befunde.length
  const repoWurzel = mkdtempSync(join(tmpdir(), 'f21-workboard-repowurzel-'))
  try {
    mkdirSync(join(repoWurzel, 'state'), { recursive: true })
    writeFileSync(join(repoWurzel, 'state', 'findings.md'), '**F-001** · `BUG` · P2 · offen\nTitel: b.\n\n**F-002** · `TECH_DEBT` · P0 · offen\nTitel: a.\n', 'utf-8')
    mkdirSync(join(repoWurzel, 'features', 'F50'), { recursive: true })
    writeFileSync(join(repoWurzel, 'features', 'F50', 'feature.md'), '## Titel\n\nZ\n\n## Status\n\nStatus: ENTWURF\n', 'utf-8')

    const { basisUrl, schliessen } = await starteTestserver({ repoWurzel })
    try {
      const alle = await fetch(`${basisUrl}/api/workitems`).then((r) => r.json())
      if (alle.befunde.length !== 0) {
        befunde.push(`(3) AK3-Fixture: unerwartete Befunde: ${JSON.stringify(alle.befunde)}`)
      }
      const reihenfolge = alle.workitems.map((w) => w.id)
      if (JSON.stringify(reihenfolge) !== JSON.stringify(['F-002', 'F-001', 'F50'])) {
        befunde.push(`(3) AK3: Sortierung P0→P4 (Feature-Akten ohne Priorität zuletzt) falsch — erwartet ['F-002','F-001','F50'], erhalten ${JSON.stringify(reihenfolge)}`)
      }
      const nurFeature = await fetch(`${basisUrl}/api/workitems?typ=FEATURE`).then((r) => r.json())
      if (nurFeature.workitems.length !== 1 || nurFeature.workitems[0]?.id !== 'F50') {
        befunde.push(`(3) AK3: Filter typ=FEATURE liefert nicht genau die eine Feature-Akte — erhalten ${JSON.stringify(nurFeature.workitems)}`)
      }
      const nurP0 = await fetch(`${basisUrl}/api/workitems?prioritaet=P0`).then((r) => r.json())
      if (nurP0.workitems.length !== 1 || nurP0.workitems[0]?.id !== 'F-002') {
        befunde.push(`(3) AK3: Filter prioritaet=P0 liefert nicht genau F-002 — erhalten ${JSON.stringify(nurP0.workitems)}`)
      }
    } finally {
      await schliessen()
    }
  } finally {
    raeumeVerzeichnis(repoWurzel)
  }

  if (befunde.length === befundeVor3) {
    console.log('✓ (3) GET /api/workitems: Merge aus Findings/Feature-Akten, Sortierung P0→P4, Filter typ/prioritaet korrekt.')
  }
}

// ─── (4) kenntnisgenommen-Kopfdatum (AK4, F-370) ───────────────────────────
{
  const befundeVor4 = befunde.length
  const basisVerzeichnis = `kontrollzustand-test-f21-ws1-kenntnisnahme-${randomUUID()}`
  const laufId = `f21-ws1-lauf-${randomUUID()}`
  try {
    schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis, schreiber: STILL })
    schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'terminal', { ergebnis: 'FEHLGESCHLAGEN', daten: { mensch_begruendung: 'F21-WS-1-Gate-Fixture.' } }, { basisVerzeichnis, schreiber: STILL })

    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis })
    try {
      const vor = await fetch(`${basisUrl}/api/laeufe`).then((r) => r.json())
      const kopfdatenVor = vor.find((l) => l.laufId === laufId)
      if (kopfdatenVor?.kenntnisgenommen !== false) {
        befunde.push(`(4) AK4: kenntnisgenommen sollte vor jeder Entscheidung false sein — erhalten ${JSON.stringify(kopfdatenVor)}`)
      }

      registriereKernArtefakt(
        `entscheidung-${laufId}`,
        PROFIL_REFERENZ,
        { erzeuger: 'mensch', schritt: 'entscheidung-kenntnisnahme' },
        { entscheidung_schema: 'v0', ergebnis: 'FEHLGESCHLAGEN', begruendung: 'F21-WS-1-Gate-Fixture, Kenntnisnahme.', entschieden_am: new Date().toISOString() },
        [],
        { basisVerzeichnis, schreiber: STILL }
      )

      const nach = await fetch(`${basisUrl}/api/laeufe`).then((r) => r.json())
      const kopfdatenNach = nach.find((l) => l.laufId === laufId)
      if (kopfdatenNach?.kenntnisgenommen !== true) {
        befunde.push(`(4) AK4: kenntnisgenommen sollte nach dem Registrieren einer 'entscheidung-kenntnisnahme'-Artefaktversion true sein — erhalten ${JSON.stringify(kopfdatenNach)}`)
      }
    } finally {
      await schliessen()
    }
  } finally {
    raeumeVerzeichnis(basisVerzeichnis)
  }

  if (befunde.length === befundeVor4) {
    console.log("✓ (4) sammleLaufKopfdaten: kenntnisgenommen ist false ohne Entscheidung, true nach einer 'entscheidung-kenntnisnahme'-Artefaktversion (AK4).")
  }
}

// ─── (5) F34 Fixpaket-Nachtrag (löst F-630): erlaubte Typ-/Prioritätswerte in state/findings.md ──
//
// Rot-/Grünfall direkt gegen parseFindings (Muster Abschnitt 1) belegt zuerst: ein unbekannter Typ
// wie 'PROCESS_GAP' parst strukturell UNGEHINDERT durch (kein eigener Regelsatz in parseFindings, D5
// — die Prüfung gehört hier, nicht in den Parser). Danach die REALE state/findings.md gegen die
// erlaubten Werte geprüft.
{
  const befundeVor5 = befunde.length
  const ERLAUBTE_TYPEN = new Set(['BUG', 'HARNESS_IMPROVEMENT', 'TECH_DEBT', 'PROCESS_IMPROVEMENT'])
  const ERLAUBTE_PRIORITAETEN = new Set(['P0', 'P1', 'P2', 'P3'])
  // Realer Scan 23.09.2026 (VOR dieser Prüfung, F34-Fixpaket): ausschließlich P4-Verstöße gefunden,
  // keine Typ-Verstöße — alle 23 hier gelistet und bewusst grandfathered (Auftrags-Vorgabe: nicht
  // massenhaft umschreiben). Eine NICHT gelistete ID mit P4 (neu vergeben oder hier vergessen) bleibt
  // ein Befund — kein Freifahrtschein für zukünftige P4-Vergabe.
  const P4_ALT_ALLOWLIST = new Set([
    'F-010', 'F-011', 'F-015', 'F-017', 'F-018', 'F-019', 'F-221', 'F-237', 'F-242', 'F-250',
    'F-256', 'F-265', 'F-266', 'F-267', 'F-594', 'F-597', 'F-599', 'F-600', 'F-601', 'F-602',
    'F-607', 'F-608', 'F-616',
  ])

  const { workitems: rotTypWorkitems } = parseFindings('**F-905** · `PROCESS_GAP` · P2 · offen\nTitel: Unbekannter Typ.\n')
  if (rotTypWorkitems[0]?.typ !== 'PROCESS_GAP') {
    befunde.push(`(5) Vorbedingung: parseFindings sollte 'PROCESS_GAP' strukturell noch parsen (sonst könnte DIESE Prüfung ihn nie sehen) — erhalten ${JSON.stringify(rotTypWorkitems)}`)
  }
  const { workitems: gruenTypWorkitems } = parseFindings('**F-906** · `BUG` · P1 · offen\nTitel: Erlaubter Typ.\n')
  if (!ERLAUBTE_TYPEN.has(gruenTypWorkitems[0]?.typ)) {
    befunde.push(`(5) Vorbedingung: 'BUG' sollte als erlaubter Typ gelten — erhalten ${JSON.stringify(gruenTypWorkitems)}`)
  }

  const findingsInhaltFuerTypPruefung = readFileSync('state/findings.md', 'utf-8')
  const { workitems: realeWorkitems } = parseFindings(findingsInhaltFuerTypPruefung)
  for (const w of realeWorkitems) {
    if (!ERLAUBTE_TYPEN.has(w.typ)) {
      befunde.push(`(5) ${w.id} (Zeile ${w.zeile}): Typ '${w.typ}' ist keiner der erlaubten Typen (${[...ERLAUBTE_TYPEN].join(', ')})`)
    }
    if (!ERLAUBTE_PRIORITAETEN.has(w.prioritaet) && !P4_ALT_ALLOWLIST.has(w.id)) {
      befunde.push(`(5) ${w.id} (Zeile ${w.zeile}): Priorität '${w.prioritaet}' ist weder P0-P3 noch ein grandfathered Alt-Bestand-Eintrag (P4_ALT_ALLOWLIST) — neue P4-Vergabe ist nicht mehr erlaubt`)
    }
  }

  if (befunde.length === befundeVor5) {
    console.log(`✓ (5) state/findings.md: alle ${realeWorkitems.length} Einträge tragen einen erlaubten Typ (BUG/HARNESS_IMPROVEMENT/TECH_DEBT/PROCESS_IMPROVEMENT); Priorität P0-P3 oder ein grandfathered Alt-Bestand-P4-Eintrag (${P4_ALT_ALLOWLIST.size} Einträge, Scan 23.09.2026) — löst F-630.`)
  }
}

// ─── Ergebnis ───────────────────────────────────────────────────────────────
console.log('')
if (befunde.length === 0) {
  console.log('✓ Keine Befunde.\n')
  process.exitCode = 0
} else {
  console.log(`✗ ${befunde.length} Befund(e):\n`)
  for (const b of befunde) console.log(`  - ${b}`)
  console.log('')
  process.exitCode = 1
}
