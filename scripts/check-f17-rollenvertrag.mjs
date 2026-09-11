/**
 * Datei: scripts/check-f17-rollenvertrag.mjs
 *
 * Zweck: Rollenvertrag-Gate (F17 WS-1 + WS-2). Prüft AK2 (alle vier Rollen mit
 * allen fünf Feldern, byte-gleiche Ausschlussmuster), AK1 (keine zweite
 * Rollenliste im Repo) und AK3 (Context-Builder-Verhalten unverändert nach
 * der Migration) — alle direkt aus src/rollen/ und src/context-builder/
 * importiert (kein zweiter, von Hand nachgebauter Regelsatz, D5-Muster).
 *
 * F17 WS-2 ergänzt Abschnitt (d): AK4 (die Planzeit-Prüfung in
 * validiereWorkflowDaten, src/workflow/index.ts), AK6 (die Startzeit-
 * Durchsetzung in loeseAusfuehrungsEingabenAuf, scripts/leitstand-server.mjs,
 * fünf Rotfälle — inklusive unbekannter Rolle, sowohl direkt gegen die
 * Funktion als auch real über POST /api/laeufe, dem einzigen Pfad ohne
 * Workflow und damit ohne die Planzeit-Prüfung (A) — und drei Grünfälle) und
 * AK7 (die additive Leitstand-Anzeige 'werkzeugsatzDurchsetzung' in GET
 * /api/workflows/<id>) — ebenfalls direkt aus den echten Funktionen
 * importiert.
 *
 * Aufruf: node scripts/check-f17-rollenvertrag.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { baueKontextpaket } from '../src/context-builder/index.ts'
import { bekannteRollen, ROLLENVERTRAEGE } from '../src/rollen/index.ts'
import { validiereWorkflowDaten } from '../src/workflow/index.ts'
import { registriereAuftrag } from '../src/auftrag/index.ts'
import { erzeugeRequestHandler, loeseAusfuehrungsEingabenAuf } from './leitstand-server.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
const BASIS = 'kontrollzustand-test'
const profilReferenz = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
const stillerSchreiber = () => {}

console.log('\n=== F17-Rollenvertrag-Check ===\n')

// ─── (a) AK2: alle vier Rollen, alle fünf Felder, Ausschlussmuster byte-gleich ──
const erwarteteRollen = {
  'architecture-advisor': ['src/**'],
  'code-reviewer': ['state/tasks/**'],
  qa: ['state/tasks/**'],
  ausfuehrung: [],
  // 'router' kam mit F18 WS-1 hinzu — Ausschlussmuster ist neu, keine
  // Migration von einem früheren Wert, daher hier direkt statt erst per
  // separatem Nachweis dokumentiert.
  router: ['src/**'],
}

const gefundeneRollen = Object.keys(ROLLENVERTRAEGE).sort()
const erwarteteNamen = Object.keys(erwarteteRollen).sort()
if (JSON.stringify(gefundeneRollen) !== JSON.stringify(erwarteteNamen)) {
  befunde.push(`AK2: ROLLENVERTRAEGE trägt ${JSON.stringify(gefundeneRollen)}, erwartet ${JSON.stringify(erwarteteNamen)}`)
} else {
  for (const [rolle, vertrag] of Object.entries(ROLLENVERTRAEGE)) {
    if (typeof vertrag.zweck !== 'string' || vertrag.zweck.length === 0) {
      befunde.push(`AK2: '${rolle}'.zweck fehlt oder ist leer`)
    }
    if (!Array.isArray(vertrag.erlaubte_werkzeugsatz_arten) || vertrag.erlaubte_werkzeugsatz_arten.length === 0) {
      befunde.push(`AK2: '${rolle}'.erlaubte_werkzeugsatz_arten fehlt oder ist leer`)
    }
    if (!Array.isArray(vertrag.erlaubte_worker) || vertrag.erlaubte_worker.length === 0) {
      befunde.push(`AK2: '${rolle}'.erlaubte_worker fehlt oder ist leer`)
    }
    if (!('erlaubtes_output_schema' in vertrag)) {
      befunde.push(`AK2: '${rolle}'.erlaubtes_output_schema fehlt`)
    }
    if (!Array.isArray(vertrag.ausschlussmuster)) {
      befunde.push(`AK2: '${rolle}'.ausschlussmuster fehlt oder ist kein Array`)
    } else if (JSON.stringify(vertrag.ausschlussmuster) !== JSON.stringify(erwarteteRollen[rolle])) {
      befunde.push(
        `AK2: '${rolle}'.ausschlussmuster ist ${JSON.stringify(vertrag.ausschlussmuster)}, erwartet byte-gleich ${JSON.stringify(erwarteteRollen[rolle])}`
      )
    }
  }
  if (befunde.length === 0) {
    console.log('✓ AK2: alle erwarteten Rollen vorhanden, alle fünf Felder gesetzt, Ausschlussmuster byte-gleich zu den Werten vor der Migration.')
  }
}

// ─── (b) AK1: keine zweite Rollenliste im Repo ─────────────────────────────
const ausgeschlosseneVerzeichnisse = new Set(['node_modules', 'dist', 'build', 'out', '.next', '.git'])
// Eigene Datei ausgenommen — sie nennt ROLLEN_AUSSCHLUSSMUSTER zwangsläufig
// selbst, um genau dessen Abwesenheit zu prüfen.
const eigenerPfad = 'scripts/check-f17-rollenvertrag.mjs'

function sammleDateien(dir, endungen, sammlung = []) {
  for (const eintrag of readdirSync(dir, { withFileTypes: true })) {
    if (ausgeschlosseneVerzeichnisse.has(eintrag.name)) continue
    const pfad = join(dir, eintrag.name)
    if (eintrag.isDirectory()) sammleDateien(pfad, endungen, sammlung)
    else if (endungen.some((endung) => pfad.endsWith(endung))) {
      sammlung.push(pfad.split(String.fromCharCode(92)).join('/'))
    }
  }
  return sammlung
}

const geprueftDateien = [...sammleDateien('src', ['.ts', '.mjs', '.cjs']), ...sammleDateien('scripts', ['.ts', '.mjs', '.cjs'])].filter(
  (pfad) => pfad !== eigenerPfad
)

let altenBezeichnerGefunden = null
for (const pfad of geprueftDateien) {
  if (readFileSync(pfad, 'utf-8').includes('ROLLEN_AUSSCHLUSSMUSTER')) {
    altenBezeichnerGefunden = pfad
    break
  }
}
if (altenBezeichnerGefunden !== null) {
  befunde.push(`AK1: Bezeichner 'ROLLEN_AUSSCHLUSSMUSTER' noch vorhanden in ${altenBezeichnerGefunden}`)
} else {
  console.log("✓ AK1: Bezeichner 'ROLLEN_AUSSCHLUSSMUSTER' kommt in src/ und scripts/ nirgends mehr vor.")
}

// Kein Rollenname aus bekannteRollen() als Objektschlüssel einer zweiten
// Rollenliste außerhalb von src/rollen/.
const zweiteRollenlisteGefunden = []
for (const pfad of geprueftDateien) {
  if (pfad.startsWith('src/rollen/')) continue
  const inhalt = readFileSync(pfad, 'utf-8')
  for (const rolle of bekannteRollen()) {
    const musterAnfuehrungszeichen = new RegExp(`['"]${rolle}['"]\\s*:`, 'm')
    // ':' zusätzlich zum Bezeichner-Ausschluss: verhindert einen Fehltreffer
    // bei Fremdformat-Pfaden wie Rusts 'codex_core::tools::router:' (kein
    // gültiger JS/TS-Objektschlüssel, real beobachtet bei F18 WS-1 in
    // src/codex-gateway/codex-gateway.test.ts).
    const musterBezeichner = new RegExp(`(?<![\\w'"-:])${rolle}\\s*:`, 'm')
    if (musterAnfuehrungszeichen.test(inhalt) || musterBezeichner.test(inhalt)) {
      zweiteRollenlisteGefunden.push(`${pfad} (Rolle '${rolle}')`)
    }
  }
}
if (zweiteRollenlisteGefunden.length > 0) {
  befunde.push(`AK1: möglicher zweiter Rollenlisten-Eintrag außerhalb von src/rollen/: ${zweiteRollenlisteGefunden.join(', ')}`)
} else {
  console.log('✓ AK1: kein Rollenname aus bekannteRollen() als Objektschlüssel außerhalb von src/rollen/.')
}

// ─── (c) AK3: Context-Builder-Verhalten unverändert ────────────────────────
const laufIdUnbekannt = 'check-f17-unbekannte-rolle'
try {
  const optionen = { basisVerzeichnis: BASIS, schreiber: stillerSchreiber }
  const ergebnis = baueKontextpaket(laufIdUnbekannt, 'nicht-existent', [], profilReferenz, {}, optionen)
  if (ergebnis.ok !== false || ergebnis.grund !== 'unbekannte_rolle') {
    befunde.push(`AK3: unbekannte Rolle sollte { ok: false, grund: 'unbekannte_rolle' } liefern, erhalten ${JSON.stringify(ergebnis)}`)
  } else {
    console.log("✓ AK3: unbekannte Rolle → { ok: false, grund: 'unbekannte_rolle' }, unverändert nach der Migration.")
  }
} finally {
  raeumeVerzeichnis(join(BASIS, `lineage-kontextpaket-${laufIdUnbekannt}`))
}

const laufIdAusschluss = 'check-f17-ausschlussmuster'
try {
  const optionen = { basisVerzeichnis: BASIS, schreiber: stillerSchreiber }
  const ergebnis = baueKontextpaket(
    laufIdAusschluss,
    'architecture-advisor',
    [{ pfad: 'src/rollen/index.ts', frage: 'x', begruendung: 'x', inhalt: 'x' }],
    profilReferenz,
    {},
    optionen
  )
  const korrekt = ergebnis.ok && ergebnis.paket.elemente.length === 0 && ergebnis.paket.ausgeschlossen.length === 1 && ergebnis.paket.ausgeschlossen[0].grund === 'rolle'
  if (!korrekt) {
    befunde.push(`AK3: 'architecture-advisor' sollte src/** weiterhin ausschließen, erhalten ${JSON.stringify(ergebnis)}`)
  } else {
    console.log("✓ AK3: Ausschlussmuster 'src/**' für 'architecture-advisor' greift unverändert über ROLLENVERTRAEGE.")
  }
} finally {
  raeumeVerzeichnis(join(BASIS, `lineage-kontextpaket-${laufIdAusschluss}`))
}

// ─── (d) F17 WS-2: Planzeit- (AK4) und Startzeit-Durchsetzung (AK6/AK7) ────

// AK4: das neue Invalid-Beispiel (unbekannte Rolle) wird von
// validiereWorkflowDaten abgelehnt, das bestehende valide Beispiel bleibt
// unverändert gültig.
{
  const gueltig = JSON.parse(readFileSync('schemas/examples/kontrollzustand-workflow.valid.json', 'utf-8'))
  const ungueltig = JSON.parse(readFileSync('schemas/examples/kontrollzustand-workflow.invalid-unbekannte-rolle.json', 'utf-8'))
  const verstoesseGueltig = validiereWorkflowDaten(gueltig)
  const verstoesseUngueltig = validiereWorkflowDaten(ungueltig)
  if (verstoesseGueltig.length > 0) {
    befunde.push(`AK4: kontrollzustand-workflow.valid.json sollte weiterhin gültig sein, verletzt: ${verstoesseGueltig.join('; ')}`)
  }
  if (verstoesseUngueltig.length === 0) {
    befunde.push('AK4: kontrollzustand-workflow.invalid-unbekannte-rolle.json sollte an der unbekannten Rolle scheitern, wurde aber als gültig akzeptiert')
  }
  if (verstoesseGueltig.length === 0 && verstoesseUngueltig.length > 0) {
    console.log('✓ AK4: unbekannte Rolle wird von validiereWorkflowDaten abgelehnt, das bestehende valide Beispiel bleibt gültig.')
  }
}

// AK6: loeseAusfuehrungsEingabenAuf gegen ROLLENVERTRAEGE. Eigene, minimale
// Test-Startvorlage (statt startvorlagen/beispielprojekt.json): sie trägt einen
// worker.codex-Block, damit die Codex-Grünfälle nicht an AK10s unabhängiger
// Prüfung "worker.codex fehlt" scheitern, die mit dem Rollenvertrag nichts zu
// tun hat.
{
  const testVorlage = {
    startvorlage_schema: 'v0',
    profilPfad: 'profiles/beispiel.json',
    werkzeugStartziel: ['check-f17-startziel'],
    werkzeugVersionDeklariert: 'check-f17-1',
    berechtigungskontext: 'profil-standard',
    modell: 'check-f17-modell',
    standardBudget: { maxElemente: 5, maxBytes: 5000 },
    werkzeugsaetze: {
      lesend: { art: 'lesend', modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read'] },
      schreibend: { art: 'schreibend', modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read', 'Write'] },
    },
    worker: { codex: { startziel: ['check-f17-codex'], versionDeklariert: 'check-f17-1', sandbox: 'read-only' } },
  }
  const eingaben = (felder) => ({
    rolle: 'code-reviewer',
    anfragen: [],
    budget: { maxElemente: 1 },
    aufrufEingaben: { modell: 'check-f17-modell' },
    auftragId: 'check-f17-auftrag',
    ausgabeSchemaPfad: null,
    ...felder,
  })

  const befundeVorAK6 = befunde.length

  const rotfaelle = [
    {
      // Ablehnung 5 (unbekannte Rolle) direkt gegen loeseAusfuehrungsEingabenAuf — nicht
      // nur mittelbar über AK3 (baueKontextpaket) oder AK4 (validiereWorkflowDaten): diese
      // Funktion ist die EINZIGE Verteidigungslinie auf dem direkten POST /api/laeufe-Pfad,
      // den kein Workflow und damit keine Planzeit-Prüfung (A) durchläuft (QA-Pass 11.09.2026).
      name: "0: unbekannte Rolle",
      eingaben: eingaben({ rolle: 'nicht-existente-rolle' }),
      werkzeugsatz: 'lesend',
      grundMuster: /^unbekannte Rolle 'nicht-existente-rolle'/,
    },
    {
      name: "1: rolle 'code-reviewer' + werkzeugsatz mit art 'schreibend'",
      eingaben: eingaben({ rolle: 'code-reviewer' }),
      werkzeugsatz: 'schreibend',
      grundMuster: /erlaubt die Werkzeugsatz-Art 'schreibend' nicht/,
    },
    {
      name: "2: rolle 'ausfuehrung' + worker 'codex'",
      eingaben: eingaben({ rolle: 'ausfuehrung', worker: 'codex' }),
      werkzeugsatz: 'schreibend',
      grundMuster: /erlaubt den Worker 'codex' nicht/,
    },
    {
      name: "3: rolle 'code-reviewer' + ein anderes output_schema als 'ergebnis-code-reviewer'",
      eingaben: eingaben({ rolle: 'code-reviewer', worker: 'codex', ausgabeSchemaPfad: '/irgendwo/schemas/ein-anderes-schema.schema.json' }),
      werkzeugsatz: 'lesend',
      grundMuster: /erlaubt output_schema 'ein-anderes-schema' nicht/,
    },
    {
      name: "4: rolle 'qa' + irgendein gesetztes output_schema",
      eingaben: eingaben({ rolle: 'qa', worker: 'codex', ausgabeSchemaPfad: '/irgendwo/schemas/ergebnis-code-reviewer.schema.json' }),
      werkzeugsatz: 'lesend',
      grundMuster: /erlaubt output_schema 'ergebnis-code-reviewer' nicht/,
    },
  ]
  for (const fall of rotfaelle) {
    const ergebnis = loeseAusfuehrungsEingabenAuf(fall.eingaben, fall.werkzeugsatz, 'text', testVorlage, 'unbenutzt')
    if (ergebnis.ok !== false || !fall.grundMuster.test(ergebnis.grund)) {
      befunde.push(`AK6 / ${fall.name}: erwartet ok:false mit Grund nach ${fall.grundMuster}, erhalten ${JSON.stringify(ergebnis)}`)
    }
  }

  // Grünfall: dieselbe Besetzung wie kontrollzustand-workflow.valid.json
  // (code-reviewer/codex/lesend/ergebnis-code-reviewer, Schema gesetzt) passiert
  // ohne eine der vier neuen Ablehnungen.
  const gruenReviewer = loeseAusfuehrungsEingabenAuf(
    eingaben({ rolle: 'code-reviewer', worker: 'codex', ausgabeSchemaPfad: '/irgendwo/schemas/ergebnis-code-reviewer.schema.json' }),
    'lesend',
    'text',
    testVorlage,
    'unbenutzt'
  )
  if (!gruenReviewer.ok) {
    befunde.push(`AK6: Grünfall 'code-reviewer/codex/lesend/ergebnis-code-reviewer' erwartet ok:true, erhalten ${JSON.stringify(gruenReviewer)}`)
  }

  // Grünfall: die zweite Besetzung aus kontrollzustand-workflow.valid.json
  // (ausfuehrung/claude-code/schreibend, kein Schema).
  const gruenAusfuehrung = loeseAusfuehrungsEingabenAuf(eingaben({ rolle: 'ausfuehrung' }), 'schreibend', 'text', testVorlage, 'unbenutzt')
  if (!gruenAusfuehrung.ok) {
    befunde.push(`AK6: Grünfall 'ausfuehrung/claude-code/schreibend' erwartet ok:true, erhalten ${JSON.stringify(gruenAusfuehrung)}`)
  }

  // Zusätzlicher Grünfall: erlaubtes_output_schema ist eine ALLOWLIST, keine
  // Pflicht (Rollenvertrag WS-1) — ein Schritt OHNE output_schema bleibt für
  // 'code-reviewer' erlaubt, obwohl die Rolle ein Schema führt.
  const gruenAllowlist = loeseAusfuehrungsEingabenAuf(eingaben({ rolle: 'code-reviewer', worker: 'codex' }), 'lesend', 'text', testVorlage, 'unbenutzt')
  if (!gruenAllowlist.ok) {
    befunde.push(`AK6: Grünfall 'code-reviewer/codex ohne output_schema' (Allowlist, keine Pflicht) erwartet ok:true, erhalten ${JSON.stringify(gruenAllowlist)}`)
  }

  if (befunde.length === befundeVorAK6) {
    console.log(
      '✓ AK6: fünf Rotfälle (unbekannte Rolle, Werkzeugsatz-Art, Worker, output_schema x2) und drei Grünfälle (Besetzung aus valid.json x2, Allowlist ohne output_schema) gegen loeseAusfuehrungsEingabenAuf geprüft.'
    )
  }
}

// AK6 (real, über HTTP): derselbe Rotfall unbekannte Rolle, diesmal über den direkten
// POST /api/laeufe-Pfad selbst statt nur gegen die pure Funktion oben. Belegt, dass
// pruefeStartauftrag -> eingabenRoh -> loeseAusfuehrungsEingabenAuf real verdrahtet ist —
// eine vergessene Feldweitergabe (z. B. rolle: body.rolle) bliebe von einem reinen
// Funktionstest an loeseAusfuehrungsEingabenAuf unentdeckt (QA-Pass 11.09.2026).
{
  const basisVerzeichnis = 'kontrollzustand-test-f17-ak6-http'
  raeumeVerzeichnis(basisVerzeichnis)
  const befundeVorHttp = befunde.length
  const auftragId = `check-f17-ak6-http-auftrag-${randomUUID()}`
  registriereAuftrag(auftragId, profilReferenz, 'AK6-HTTP-Gate-Fixture', 'Auftragstext.', { basisVerzeichnis, schreiber: stillerSchreiber })

  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  const basisUrl = `http://127.0.0.1:${port}`
  try {
    const body = {
      laufId: `check-f17-ak6-http-${randomUUID()}`,
      rolle: 'nicht-existente-rolle',
      anfragen: [],
      budget: {},
      aufrufEingaben: { modell: 'check-f17-modell' },
      werkzeugsatz: 'lesend',
      auftragId,
    }
    const antwort = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(body) })
    const koerper = await antwort.json()
    if (antwort.status !== 400 || !/^unbekannte Rolle 'nicht-existente-rolle'/.test(koerper.grund ?? '')) {
      befunde.push(`AK6 (HTTP): POST /api/laeufe mit unbekannter Rolle erwartet 400 mit "unbekannte Rolle", erhalten ${antwort.status} (${JSON.stringify(koerper)})`)
    }
    if (befunde.length === befundeVorHttp) {
      console.log(
        "✓ AK6 (HTTP): POST /api/laeufe lehnt eine unbekannte Rolle real ab (400) — die Verdrahtung pruefeStartauftrag -> loeseAusfuehrungsEingabenAuf greift auf dem direkten Pfad ohne Workflow."
      )
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// AK7: die additive Leitstand-Projektion zeigt 'DEKLARIERT' für einen
// codex-Schritt und 'ERZWUNGEN' für einen claude-code-Schritt (F-323 Weg a).
{
  const basisVerzeichnis = 'kontrollzustand-test-f17-ak7'
  raeumeVerzeichnis(basisVerzeichnis)
  const befundeVorAK7 = befunde.length
  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  const basisUrl = `http://127.0.0.1:${port}`
  try {
    const workflowId = 'check-f17-ak7-workflow'
    const gateSchritt = (schrittId, worker, nachfolger) => ({
      schritt_id: schrittId,
      rolle: worker === 'codex' ? 'code-reviewer' : 'ausfuehrung',
      werkzeugsatz: worker === 'codex' ? 'lesend' : 'schreibend',
      worker,
      modell: 'check-f17-modell',
      eingaben: [],
      output_schema: null,
      freigabe: 'AUTOMATISCH',
      risiko: 'AK7-Gate-Fixture, kein realer Lauf.',
      zeitgrenze_ms: 600000,
      nachfolger,
      status: 'OFFEN',
      lauf_id: null,
    })
    const workflow = {
      workflow_schema: 'v0',
      workflow_id: workflowId,
      auftrag_id: 'check-f17-ak7-auftrag',
      version: 1,
      ziel: 'F17 WS-2 AK7-Fixture.',
      status: 'OFFEN',
      aktiver_schritt_id: 'schritt-1',
      grenzen: { max_schritte: 8, max_replans: 0 },
      schritte: [gateSchritt('schritt-1', 'codex', 'schritt-2'), gateSchritt('schritt-2', 'claude-code', null)],
    }
    const anlegen = await fetch(`${basisUrl}/api/workflows`, { method: 'POST', body: JSON.stringify(workflow) })
    if (anlegen.status !== 201) {
      befunde.push(`AK7-Vorbereitung: POST /api/workflows erwartet 201, erhalten ${anlegen.status} (${await anlegen.text()})`)
    }
    const detail = await (await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}`)).json()
    const erwartet = [
      { schrittId: 'schritt-1', durchsetzungsgrad: 'DEKLARIERT' },
      { schrittId: 'schritt-2', durchsetzungsgrad: 'ERZWUNGEN' },
    ]
    if (JSON.stringify(detail.werkzeugsatzDurchsetzung) !== JSON.stringify(erwartet)) {
      befunde.push(`AK7: werkzeugsatzDurchsetzung erwartet ${JSON.stringify(erwartet)}, erhalten ${JSON.stringify(detail.werkzeugsatzDurchsetzung)}`)
    }
    if (befunde.length === befundeVorAK7) {
      console.log("✓ AK7: GET /api/workflows/<id> zeigt 'DEKLARIERT' für einen codex-Schritt und 'ERZWUNGEN' für einen claude-code-Schritt.")
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── Ergebnis ───────────────────────────────────────────────────────────────
//
// process.exitCode statt process.exit() (F17 WS-2, Muster check-f15-workflow.mjs,
// dort ausführlich begründet): AK7 schließt einen echten HTTP-Testserver, dessen
// Handler zuvor selbst nach stdout geschrieben hat (registriereWorkflow protokolliert
// sein workflow_registriert-Ereignis) — process.exit() unmittelbar danach reißt
// libuv unter Windows einen noch schließenden Handle unter den Füßen weg
// ("Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), src\win\async.c",
// Exitcode 127, real reproduziert). Mit exitCode läuft der Event-Loop leer, bevor
// der Prozess endet; 0 = sauber, 1 = Befund bleibt unverändert.
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
