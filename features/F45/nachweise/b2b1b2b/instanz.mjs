#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/b2b1b2b/instanz.mjs
 *
 * Zweck: Leitstand-Testinstanz für den Render-Nachweis F45 B2b-1b-2b „Anzeige“ (render/erzeuge-nachweis.mjs, Muster
 * features/F45/nachweise/b2b1/instanz.mjs). Wegwerf-Ablage, Projekt = Wegwerf-Repo mit CLAUDE.md dieses Repos (Stack
 * gefüllt ⇒ der Architekt stellt keine Frage), Startvorlage ohne Prüfbefehl. Die Attrappe (kein CLI, kein Netz) liefert
 * je Ablauf Pläne und Advisor-Ergebnisse aus einer Warteschlange. Vier Abläufe laufen nacheinander über den HTTP-Pfad
 * (Architekt → Advisor → Ausführung → Review, Architekt und Advisor vorab freigegeben):
 * (a) Advisor UEBERARBEITEN ⇒ Freigabe des Architekten für Plan v2 (Plan v1 + Befunde);
 * (b) wie (a), danach Freigabe ⇒ Plan v2 ⇒ Freigabe der Ausführung (Plan v2, Befunde eingearbeitet);
 * (c) wie (a) mit max_replans 0 ⇒ Freigabe der Ausführung mit „Kein Plan v2: …“;
 * (d) Advisor-Ergebnis verstößt gegen das Schema ⇒ Halt mit „Advisor wiederholen“.
 *
 * Wird aufgerufen von: Hand — `node features/F45/nachweise/b2b1b2b/instanz.mjs`; gibt die workflowIds aus und bleibt
 * offen, bis der Prozess beendet wird. Nicht Teil von `npm run check`.
 */

import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { erzeugeRequestHandler } from '../../../../scripts/leitstand-server.mjs'
import { fuehreGitSync } from '../../../../src/git-starter/index.ts'
import { registriereKernArtefakt } from '../../../../src/lineage-registry/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../../../../src/startvorlage/index.ts'
import { registriereWorkflow } from '../../../../src/workflow/index.ts'

const INSTALL = join(import.meta.dirname, '..', '..', '..', '..')
const PORT = Number(process.env.B2B1B2B_PORT ?? 4399)
const wurzel = mkdtempSync(join(tmpdir(), 'f45-b2b1b2b-render-'))
const basisVerzeichnis = join(wurzel, 'kontrollzustand')
const projekt = join(wurzel, 'projekt')
for (const datei of ['CLAUDE.md', '.claude/agents/code-reviewer.md', 'docs/projekt/kontext/beschreibung.md']) {
  mkdirSync(dirname(join(projekt, datei)), { recursive: true })
  copyFileSync(join(INSTALL, datei), join(projekt, datei))
}
for (const argumente of [['init', '--quiet'], ['config', 'user.email', 'render@example.invalid'], ['config', 'user.name', 'Render'], ['config', 'core.autocrlf', 'false'], ['checkout', '--quiet', '-b', 'render'], ['add', '.'], ['commit', '--quiet', '-m', 'init']]) {
  fuehreGitSync(argumente, { cwd: projekt, encoding: 'utf8' })
}
const { pruefbefehl: _ohne, ...vorlage } = ladeStartvorlage(join(INSTALL, 'startvorlagen', 'ai-workforce.json'))
const startvorlagePfad = join(wurzel, 'startvorlage.json')
writeFileSync(startvorlagePfad, JSON.stringify({ ...vorlage, worker: { ...(vorlage.worker ?? {}), codex: { startziel: [String.raw`C:\b2b1b2b-render\codex.exe`], versionDeklariert: 'codex-cli-render', sandbox: 'read-only' } } }))
const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage(startvorlagePfad))

const plan = (zusammenfassung, module) => ({
  modus: 'feature',
  zusammenfassung,
  module,
  adr_entwuerfe: [],
  schema_entwuerfe: [],
  entscheidungen_mensch: [],
  capabilities_bedarf: [],
  evidenz: [{ marker: '[Fakt]', aussage: 'Die Auftragsliste liegt in src/auftraege/liste.ts.' }],
  einrichtung: [],
})
const PLAN_V1 = plan('Die Auftragsliste bekommt einen CSV-Export: eine reine Funktion baut die Zeilen, die Route liefert die Datei.', [
  { name: 'src/export/csv.ts', zweck: 'Zeilen und Kopf der CSV-Datei aus der Auftragsliste bauen.', abhaengigkeiten: [] },
  { name: 'scripts/leitstand/routen-export.mjs', zweck: 'GET /api/auftraege/export liefert die Datei.', abhaengigkeiten: ['src/export/csv.ts'] },
])
const PLAN_V2 = plan('Plan v2: CSV-Export mit Escaping nach RFC 4180 und Streaming für lange Listen; die Befunde A1 und A2 sind eingearbeitet, A3 begründet abgelehnt (die Liste ist auf 5000 Einträge begrenzt).', [
  { name: 'src/export/csv.ts', zweck: 'Zeilen nach RFC 4180 (Anführungszeichen, Zeilenumbrüche, Trennzeichen) escapen.', abhaengigkeiten: [] },
  { name: 'scripts/leitstand/routen-export.mjs', zweck: 'GET /api/auftraege/export streamt die Datei zeilenweise.', abhaengigkeiten: ['src/export/csv.ts'] },
  { name: 'src/export/csv.test.ts', zweck: 'Randfälle: leere Liste, Sonderzeichen, sehr lange Felder.', abhaengigkeiten: [] },
])
const BEFUNDE = [
  { id: 'A1', schwere: 'HOCH', evidenz: 'FAKT', fundstelle: 'Plan v1, Modul src/export/csv.ts', zusammenfassung: 'Felder mit Komma, Anführungszeichen oder Zeilenumbruch werden nicht escaped — die Datei zerfällt beim Öffnen.', korrekturrichtung: 'Escaping nach RFC 4180 festlegen und mit Randfällen testen.' },
  { id: 'A2', schwere: 'MITTEL', evidenz: 'SCHLUSSFOLGERUNG', fundstelle: 'scripts/leitstand/routen-export.mjs:sehr/langer/pfad/zur/fundstelle/die/umbrechen/muss/ohne/das/layout/zu/sprengen.mjs:120', zusammenfassung: 'Die Route baut die ganze Datei im Speicher.', korrekturrichtung: 'Zeilenweise streamen.' },
  { id: 'A3', schwere: 'NIEDRIG', evidenz: 'ANNAHME', fundstelle: 'Plan v1, Abschnitt Module', zusammenfassung: 'Unklar, ob die Liste begrenzt ist.', korrekturrichtung: 'Grenze nennen oder begründen.' },
]
const advisor = (urteil, befunde) => JSON.stringify({ urteil, begruendung: 'Der Plan trägt im Kern; das Escaping fehlt und die Route skaliert nicht.', befunde, entlastend: ['Die Trennung reine Funktion / Route passt zu ARCHITECTURE.md.'], grenzen_der_pruefung: 'Nur der Plan, kein Code.' })

/** Je Ablauf eine Warteschlange von Ergebnistexten (Architekt und Advisor in Laufreihenfolge). */
const ausgaenge = new Map()
const aktiv = { workflowId: null }

/**
 * Attrappe für fuehreAufgabeDurch: Architekt und Advisor nehmen den nächsten Ergebnistext ihres Ablaufs, jede andere
 * Rolle meldet „Fertig.“. Jede Rolle bekommt eine echte Laufakte mit Rohstrom (claude-code-Format).
 * @param laufId - Lauf
 * @param _profil - Profilreferenz (ungenutzt)
 * @param eingaben - Eingaben des Laufs
 * @returns Laufergebnis
 */
async function attrappe(laufId, _profil, eingaben) {
  const ergebnis = eingaben.rolle === 'architekt' || eingaben.rolle === 'architecture-advisor' ? (ausgaenge.get(aktiv.workflowId)?.shift() ?? 'kein Ergebnis hinterlegt') : 'Fertig.'
  const rohstromPfad = join(wurzel, `rohstrom-${laufId}.json`)
  writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: ergebnis }) }))
  registriereKernArtefakt(`laufakte-${laufId}`, profilReferenz, { erzeuger: 'kern', schritt: 'render-attrappe' }, { worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad, inhalts_hash: 'x' } }, [], { basisVerzeichnis, schreiber: () => {} })
  return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH', bypass_verdacht_anzahl: 0 }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
}

const leitstand = createServer(
  erzeugeRequestHandler({
    basisVerzeichnis,
    repoWurzel: projekt,
    installWurzel: INSTALL,
    startvorlagePfad,
    projektId: 'ai-workforce',
    istWorkforceInstanz: true,
    fuehreAufgabeDurchFn: attrappe,
    laufausgabeWurzel: join(wurzel, 'laufausgabe'),
    rohBasisVerzeichnis: join(wurzel, 'roh'),
  })
)
await new Promise((r) => leitstand.listen(PORT, '127.0.0.1', r))
const basis = `http://127.0.0.1:${PORT}`
const schritt = (id, rolle, werkzeugsatz, worker, outputSchema, nachfolger, freigabe, felder = {}) => ({
  schritt_id: id,
  rolle,
  werkzeugsatz,
  worker,
  modell: worker === 'codex' ? 'gpt-6-astra' : 'claude-sonnet-5',
  eingaben: [],
  output_schema: outputSchema,
  freigabe,
  risiko: 'Render-Nachweis.',
  zeitgrenze_ms: 600000,
  nachfolger,
  status: 'OFFEN',
  lauf_id: null,
  ...felder,
})
const ARCH = 'schritt-1-architekt'
const ADV = 'schritt-2-advisor'
const AUSF = 'schritt-3-ausfuehrung'
const schritte = () => [
  schritt(ARCH, 'architekt', 'lesend', 'codex', 'ergebnis-architektur', ADV, 'ZWINGEND', { freigabe_erteilt: true }),
  schritt(ADV, 'architecture-advisor', 'lesend', 'claude-code', 'ergebnis-architecture-advisor', AUSF, 'ZWINGEND', { freigabe_erteilt: true, eingaben: [`artefakt:ergebnis-@${ARCH}`] }),
  schritt(AUSF, 'ausfuehrung', 'schreibend', 'claude-code', null, 'schritt-4-review', 'ZWINGEND', { eingaben: [`artefakt:ergebnis-@${ARCH}`, `artefakt:entscheidung-@${ARCH}`] }),
  schritt('schritt-4-review', 'code-reviewer', 'lesend', 'codex', 'ergebnis-code-reviewer', null, 'AUTOMATISCH'),
]

/** Wartet, bis der Ablauf nicht mehr läuft. @returns Status */
async function warteAufHalt(workflowId) {
  const ende = Date.now() + 30000
  let status
  while (Date.now() < ende) {
    const detail = await (await fetch(`${basis}/api/workflows/${workflowId}`)).json()
    status = detail.daten?.status
    if (status !== undefined && status !== 'LAEUFT' && status !== 'OFFEN' && !detail.daten.schritte.some((s) => s.status === 'LAEUFT')) return status
    await new Promise((r) => setTimeout(r, 200))
  }
  return status
}

/**
 * Legt einen Ablauf an und lässt Architekt und Advisor laufen. @returns workflowId
 */
async function legeAblaufAn(kennung, titel, maxReplans, warteschlange) {
  const { auftragId } = await (await fetch(`${basis}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel, auftragstext: 'Füge der Auftragsliste einen CSV-Export hinzu.' }) })).json()
  const workflowId = `wf-b2b1b2b-${kennung}-${Date.now()}`
  registriereWorkflow(
    { workflow_schema: 'v0', workflow_id: workflowId, auftrag_id: auftragId, version: 1, ziel: `${titel}.`, status: 'OFFEN', aktiver_schritt_id: ARCH, grenzen: { max_schritte: 8, max_replans: maxReplans }, schritte: schritte() },
    profilReferenz,
    { basisVerzeichnis, schreiber: () => {} }
  )
  ausgaenge.set(workflowId, [...warteschlange])
  aktiv.workflowId = workflowId
  const start = await fetch(`${basis}/api/workflows/${workflowId}/starten`, { method: 'POST' })
  if (start.status >= 400) console.log(`(${kennung}) starten ${start.status} ${await start.text()}`)
  console.log(`(${kennung}) ${await warteAufHalt(workflowId)}`)
  return workflowId
}

const ids = {}
ids.a = await legeAblaufAn('a', 'CSV-Export, Plan v2 folgt', 2, [JSON.stringify(PLAN_V1), advisor('UEBERARBEITEN', BEFUNDE)])
ids.b = await legeAblaufAn('b', 'CSV-Export, Plan v2 liegt vor', 2, [JSON.stringify(PLAN_V1), advisor('UEBERARBEITEN', BEFUNDE), JSON.stringify(PLAN_V2)])
const freigabe = await fetch(`${basis}/api/workflows/${ids.b}/freigabe`, { method: 'POST', body: JSON.stringify({ schrittId: ARCH, entscheidung: 'FREIGEGEBEN', begruendung: 'Plan v2 mit den Befunden schreiben.' }) })
console.log(`(b) Freigabe Architekt ${freigabe.status}; ${await warteAufHalt(ids.b)}`)
ids.c = await legeAblaufAn('c', 'CSV-Export ohne Korrekturrunde', 0, [JSON.stringify(PLAN_V1), advisor('FREIGEGEBEN_MIT_AUFLAGEN', BEFUNDE.slice(0, 2))])
ids.d = await legeAblaufAn('d', 'CSV-Export, Advisor-Ergebnis unlesbar', 2, [JSON.stringify(PLAN_V1), 'Der Plan sieht gut aus, ich würde ihn freigeben.'])
console.log(`Testinstanz B2b-1b-2b offen: ${basis}`)
console.log(JSON.stringify(ids))
