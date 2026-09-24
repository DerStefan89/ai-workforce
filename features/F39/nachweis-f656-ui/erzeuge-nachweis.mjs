#!/usr/bin/env node
/**
 * Datei: features/F39/nachweis-f656-ui/erzeuge-nachweis.mjs
 *
 * Zweck: erzeugt den Render-Nachweis für F-656 (state/findings.md F-656, PROCESS_IMPROVEMENT
 * P1, Regel F-622) — den Knopf „Prüfung wiederholen" neben der Prüfergebnis-Zeile im
 * Abnahme-Block (public/leitstand/views/workflows.js, renderPruefergebnis). Startet eine eigene,
 * isolierte Leitstand-Instanz (Port 4177 — kollidiert dadurch nie mit einer echten laufenden
 * Instanz oder den F34-/F39-Nachweisen auf 4174/4175/4176) mit DREI Workflow-Fixtures:
 *
 *   (A) 'f656-nachweis-a' — Ausführung ERFOLGREICH, Prüfung ROT (Regel 1f, src/workflow/
 *       index.ts): der Knopf muss sichtbar sein. Anders als F-652s Nachweis (rein statisch) wird
 *       HIER real geklickt: POST /api/workflows/<id>/pruefung-wiederholen läuft echt, mit einem
 *       real 800ms verzögerten pruefbefehl (Muster src/pruefschritt/pruefschritt.test.ts) — lang
 *       genug, um den Zustand 'läuft' (Knopf disabled) real zu fotografieren, bevor der
 *       Prüflauf mit Exitcode 0 (GRUEN) endet und der Review-Schritt automatisch startet
 *       (fuehreAufgabeDurchFn ist gestubbt, Muster scripts/check-f656-pruefung-wiederholen.mjs
 *       baueErfolgAttrappe — kein echter Codex-Prozess nötig, der Review-Dispatch selbst ist
 *       aber real, keine Attrappe für starteWorkflowSchritt).
 *   (B) 'f656-nachweis-b' — Prüfung GRUEN, Review-Schritt bereits LAEUFT: der Knopf darf NICHT
 *       sichtbar sein.
 *   (C) 'f656-nachweis-c' — KLAERUNG_ERFORDERLICH aus einem ANDEREN Grund (Regel 1a: ein
 *       vorgelagerter 'architekt'-Schritt endete VERWEIGERT, der Ausführungsschritt ist noch nie
 *       gelaufen — GET .../abnahme liefert dafür pruefergebnis.status 'noch_nicht_gelaufen',
 *       nicht 'ok'): der Knopf darf NICHT sichtbar sein, obwohl der Workflow KLAERUNG_ERFORDERLICH
 *       ist.
 *
 * Drei Klickfolgen (eine je Fixture, Muster scripts/render-nachweis.mjs — das Werkzeug kennt nur
 * EINE URL pro Lauf, ein SPA-Hash-Wechsel mitten in einer Folge ist damit nicht abbildbar), deren
 * Protokolle/Screenshots am Ende zu EINEM protokoll.md/protokoll.json zusammengeführt werden.
 *
 * Aufruf: node features/F39/nachweis-f656-ui/erzeuge-nachweis.mjs
 * (Muster npm run render-nachweis — kein Teil von npm run check, braucht einen echten Browser.)
 */

import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { erzeugeRequestHandler } from '../../../scripts/leitstand-server.mjs'
import { raeumeVerzeichnis } from '../../../scripts/_aufraeumen.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../../../src/startvorlage/index.ts'
import { registriereKernArtefakt } from '../../../src/lineage-registry/index.ts'
import { registriereWorkflow } from '../../../src/workflow/index.ts'
import { registriereAuftrag } from '../../../src/auftrag/index.ts'

const HIER = dirname(fileURLToPath(import.meta.url))
const REPO_WURZEL = join(HIER, '..', '..', '..')
const AUSGABE_VERZEICHNIS = HIER
const BASISVERZEICHNIS = 'kontrollzustand-test-f656-nachweis'
const PORT = 4177
const AUFTRAG_ID = 'f656-nachweis-auftrag'

const LAUF_A = 'f656-nachweis-a-ausfuehrung-lauf'
const LAUF_B = 'f656-nachweis-b-ausfuehrung-lauf'
const LAUF_B_REVIEW = 'f656-nachweis-b-review-lauf'
const LAUF_C_ARCHITEKT = 'f656-nachweis-c-architekt-lauf'

raeumeVerzeichnis(BASISVERZEICHNIS)
mkdirSync(BASISVERZEICHNIS, { recursive: true })

// Worker-Block für 'codex' (F17-Rollenvertrag verlangt ihn für den Review-Dispatch) — Muster
// scripts/check-f656-pruefung-wiederholen.mjs CODEX_BLOCK. pruefbefehl real 800ms verzögert
// (setTimeout statt sofortigem exit), damit der Zustand 'läuft' beim Klick fotografierbar bleibt.
const vorlageDaten = {
  ...ladeStartvorlage('startvorlagen/beispielprojekt.json'),
  worker: { codex: { startziel: [String.raw`C:\f656-nachweis-dummy\codex.exe`], versionDeklariert: 'codex-cli-nachweis-fixture', sandbox: 'read-only' } },
  pruefbefehl: [process.execPath, '-e', 'setTimeout(() => process.exit(0), 800)'],
  pruefZeitgrenzeMs: 10000,
}
// repoWurzel für POST .../pruefung-wiederholen (cwd des pruefbefehls) UND für den Review-Dispatch
// danach (loeseAusgabeSchemaAuf löst output_schema IMMER relativ zu repoWurzel auf, NIE relativ
// zum echten Produkt-Repo, Muster check-f652-pruefschritt.mjs neuesRepo) — ohne die Kopie
// scheitert starteWorkflowSchritt nach einem GRUEN-Retry real am fehlenden Schema (real
// beobachtet bei der ersten Fassung dieses Skripts).
const REPO_TEMP = mkdtempSync(join(tmpdir(), 'f656-nachweis-repo-'))
mkdirSync(join(REPO_TEMP, 'schemas'), { recursive: true })
cpSync('schemas/ergebnis-code-reviewer.schema.json', join(REPO_TEMP, 'schemas', 'ergebnis-code-reviewer.schema.json'))
const startvorlagePfad = join(REPO_TEMP, 'startvorlage.json')
writeFileSync(startvorlagePfad, JSON.stringify(vorlageDaten, null, 2))
const vorlage = ladeStartvorlage(startvorlagePfad)
const profilReferenz = leiteProfilReferenzAb(vorlage)
const ladeOptionen = { basisVerzeichnis: BASISVERZEICHNIS, schreiber: () => {} }

registriereAuftrag(AUFTRAG_ID, profilReferenz, 'F-656-Render-Nachweis', 'F-656-Render-Nachweis: Auftragstext.', ladeOptionen)

// ─── (A) Ausführung ERFOLGREICH, Prüfung ROT — Regel-1f-Halt, Knopf sichtbar ─────────────────
const AUSGABE_ENDE_A = 'FEHLER: src/beispiel/index.ts(42,7): Type "string" is not assignable to type "number".\nnpm ERR! Test failed. See above for more details.'
registriereKernArtefakt(
  `pruefergebnis-${LAUF_A}`,
  profilReferenz,
  { erzeuger: 'kern', schritt: 'nach-lauf-pruefschritt' },
  { pruefergebnis_schema: 'v0', lauf_id: LAUF_A, befehl: ['node', 'npm-cli.js', 'run', 'check'], exit_code: 1, ergebnis: 'ROT', dauer_ms: 42_318, ausgabe_ende: AUSGABE_ENDE_A, gestartet_am: new Date().toISOString() },
  [],
  ladeOptionen
)
registriereWorkflow(
  {
    workflow_schema: 'v0',
    workflow_id: 'f656-nachweis-a',
    auftrag_id: AUFTRAG_ID,
    version: 1,
    ziel: 'F-656-Render-Nachweis (A): deterministische Prüfung meldet ROT — Knopf sichtbar.',
    status: 'KLAERUNG_ERFORDERLICH',
    aktiver_schritt_id: 'schritt-1-ausfuehrung',
    grund: `Schritt 'schritt-1-ausfuehrung' (ausfuehrung): deterministische Prüfung meldet ROT (Exit-Code 1) — kein automatischer Fortschritt zum Review (Lauf '${LAUF_A}').\nAusgabeende:\n${AUSGABE_ENDE_A}`,
    grenzen: { max_schritte: 6, max_replans: 1 },
    schritte: [
      {
        schritt_id: 'schritt-1-ausfuehrung',
        rolle: 'ausfuehrung',
        werkzeugsatz: 'schreibend',
        worker: 'claude-code',
        modell: 'claude-sonnet-5',
        eingaben: [],
        output_schema: null,
        freigabe: 'AUTOMATISCH',
        risiko: 'Render-Nachweis-Fixture, kein reales Risiko.',
        zeitgrenze_ms: 600000,
        nachfolger: 'schritt-2-review',
        status: 'ERFOLGREICH',
        lauf_id: LAUF_A,
      },
      {
        schritt_id: 'schritt-2-review',
        rolle: 'code-reviewer',
        werkzeugsatz: 'lesend',
        worker: 'codex',
        modell: 'gpt-6-astra',
        eingaben: ['artefakt:pruefergebnis-@schritt-1-ausfuehrung'],
        output_schema: 'ergebnis-code-reviewer',
        freigabe: 'AUTOMATISCH',
        risiko: 'Render-Nachweis-Fixture, kein reales Risiko.',
        zeitgrenze_ms: 600000,
        nachfolger: null,
        status: 'OFFEN',
        lauf_id: null,
      },
    ],
  },
  profilReferenz,
  ladeOptionen
)

// ─── (B) Prüfung GRUEN, Review-Schritt bereits LAEUFT — Knopf NICHT sichtbar ─────────────────
registriereKernArtefakt(
  `pruefergebnis-${LAUF_B}`,
  profilReferenz,
  { erzeuger: 'kern', schritt: 'nach-lauf-pruefschritt' },
  { pruefergebnis_schema: 'v0', lauf_id: LAUF_B, befehl: ['node', 'npm-cli.js', 'run', 'check'], exit_code: 0, ergebnis: 'GRUEN', dauer_ms: 38_204, ausgabe_ende: 'ok', gestartet_am: new Date().toISOString() },
  [],
  ladeOptionen
)
registriereWorkflow(
  {
    workflow_schema: 'v0',
    workflow_id: 'f656-nachweis-b',
    auftrag_id: AUFTRAG_ID,
    version: 1,
    ziel: 'F-656-Render-Nachweis (B): Prüfung GRUEN, Review läuft — kein Knopf.',
    status: 'LAEUFT',
    aktiver_schritt_id: 'schritt-2-review',
    grund: null,
    grenzen: { max_schritte: 6, max_replans: 1 },
    schritte: [
      {
        schritt_id: 'schritt-1-ausfuehrung',
        rolle: 'ausfuehrung',
        werkzeugsatz: 'schreibend',
        worker: 'claude-code',
        modell: 'claude-sonnet-5',
        eingaben: [],
        output_schema: null,
        freigabe: 'AUTOMATISCH',
        risiko: 'Render-Nachweis-Fixture, kein reales Risiko.',
        zeitgrenze_ms: 600000,
        nachfolger: 'schritt-2-review',
        status: 'ERFOLGREICH',
        lauf_id: LAUF_B,
      },
      {
        schritt_id: 'schritt-2-review',
        rolle: 'code-reviewer',
        werkzeugsatz: 'lesend',
        worker: 'codex',
        modell: 'gpt-6-astra',
        eingaben: ['artefakt:pruefergebnis-@schritt-1-ausfuehrung'],
        output_schema: 'ergebnis-code-reviewer',
        freigabe: 'AUTOMATISCH',
        risiko: 'Render-Nachweis-Fixture, kein reales Risiko.',
        zeitgrenze_ms: 600000,
        nachfolger: null,
        status: 'LAEUFT',
        lauf_id: LAUF_B_REVIEW,
      },
    ],
  },
  profilReferenz,
  ladeOptionen
)

// ─── (C) KLAERUNG_ERFORDERLICH aus einem ANDEREN Grund (Regel 1a) — Knopf NICHT sichtbar ─────
registriereWorkflow(
  {
    workflow_schema: 'v0',
    workflow_id: 'f656-nachweis-c',
    auftrag_id: AUFTRAG_ID,
    version: 1,
    ziel: 'F-656-Render-Nachweis (C): Halt aus einem anderen Grund (Regel 1a) — kein Knopf.',
    status: 'KLAERUNG_ERFORDERLICH',
    aktiver_schritt_id: 'schritt-1-architekt',
    grund: `Schritt 'schritt-1-architekt' endete VERWEIGERT (Lauf '${LAUF_C_ARCHITEKT}')`,
    grenzen: { max_schritte: 6, max_replans: 1 },
    schritte: [
      {
        schritt_id: 'schritt-1-architekt',
        rolle: 'architekt',
        werkzeugsatz: 'lesend',
        worker: 'claude-code',
        modell: 'claude-sonnet-5',
        eingaben: [],
        output_schema: null,
        freigabe: 'AUTOMATISCH',
        risiko: 'Render-Nachweis-Fixture, kein reales Risiko.',
        zeitgrenze_ms: 600000,
        nachfolger: 'schritt-2-ausfuehrung',
        status: 'VERWEIGERT',
        lauf_id: LAUF_C_ARCHITEKT,
      },
      {
        schritt_id: 'schritt-2-ausfuehrung',
        rolle: 'ausfuehrung',
        werkzeugsatz: 'schreibend',
        worker: 'claude-code',
        modell: 'claude-sonnet-5',
        eingaben: [],
        output_schema: null,
        freigabe: 'AUTOMATISCH',
        risiko: 'Render-Nachweis-Fixture, kein reales Risiko.',
        zeitgrenze_ms: 600000,
        nachfolger: null,
        status: 'OFFEN',
        lauf_id: null,
      },
    ],
  },
  profilReferenz,
  ladeOptionen
)

const server = createServer(erzeugeRequestHandler({ basisVerzeichnis: BASISVERZEICHNIS, fuehreAufgabeDurchFn: async () => ({ ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }), repoWurzel: REPO_TEMP, startvorlagePfad }))

await new Promise((resolve, reject) => {
  server.once('error', reject)
  server.listen(PORT, '127.0.0.1', resolve)
})
console.log(`[erzeuge-nachweis] Fixture-Leitstand läuft auf http://127.0.0.1:${PORT}`)

/** Führt render-nachweis.mjs für EINE Klickfolge in ein eigenes Temp-Verzeichnis aus. @returns { protokoll: Array, dateiname -> tempPfad } */
async function fuehreKlickfolgeAus(klickfolgeDateiname) {
  const tempVerzeichnis = mkdtempSync(join(tmpdir(), 'f656-nachweis-lauf-'))
  await new Promise((resolve, reject) => {
    const kind = spawn('node', ['scripts/render-nachweis.mjs', join(AUSGABE_VERZEICHNIS, klickfolgeDateiname), tempVerzeichnis], {
      cwd: REPO_WURZEL,
      stdio: 'inherit',
    })
    kind.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`render-nachweis.mjs (${klickfolgeDateiname}) endete mit Exit-Code ${code}`))))
    kind.on('error', reject)
  })
  const protokoll = JSON.parse(readFileSync(join(tempVerzeichnis, 'protokoll.json'), 'utf-8'))
  return { protokoll, tempVerzeichnis }
}

try {
  const laeufe = await Promise.all(
    ['klickfolge-a-rot.json', 'klickfolge-b-gruen.json', 'klickfolge-c-andere-klaerung.json'].map((datei) => fuehreKlickfolgeAus(datei))
  )

  // Screenshots aus den drei Temp-Verzeichnissen ins Zielverzeichnis verschieben (Dateinamen sind
  // bereits über die drei Klickfolgen hinweg eindeutig durchnummeriert, 01-05).
  const gesamtProtokoll = []
  for (const { protokoll, tempVerzeichnis } of laeufe) {
    for (const dateiname of readdirSync(tempVerzeichnis)) {
      if (dateiname.endsWith('.png')) renameSync(join(tempVerzeichnis, dateiname), join(AUSGABE_VERZEICHNIS, dateiname))
    }
    gesamtProtokoll.push(...protokoll)
    rmSync(tempVerzeichnis, { recursive: true, force: true })
  }

  const spalten = ['Aktion', ...Object.keys(gesamtProtokoll[0] ?? {}).filter((k) => k !== 'label')]
  const kopf = `| ${spalten.join(' | ')} |`
  const trenner = `| ${spalten.map(() => '---').join(' | ')} |`
  const zeilen = gesamtProtokoll.map((eintrag) => `| ${[eintrag.label, ...spalten.slice(1).map((s) => String(eintrag[s]))].join(' | ')} |`)
  const markdown = [kopf, trenner, ...zeilen].join('\n')

  writeFileSync(join(AUSGABE_VERZEICHNIS, 'protokoll.md'), `${markdown}\n`, 'utf-8')
  writeFileSync(join(AUSGABE_VERZEICHNIS, 'protokoll.json'), `${JSON.stringify(gesamtProtokoll, null, 2)}\n`, 'utf-8')
  console.log(markdown)
} finally {
  await new Promise((resolve) => server.close(resolve))
  raeumeVerzeichnis(BASISVERZEICHNIS)
  rmSync(REPO_TEMP, { recursive: true, force: true })
}
console.log('[erzeuge-nachweis] fertig.')
