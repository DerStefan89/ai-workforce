#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/b3b2a2/instanz.mjs
 *
 * Zweck: Render-Nachweis F45 B3b-2a-2 „Karte Darstellung (Render-Nachweis) in der Abnahme“ (features/F45/plan-b3b2a2.md,
 * Advisor K4/P2/H4) in neutraler Umgebung, Muster features/F45/nachweise/b2b2b2/instanz.mjs: Wegwerf-Ablage, Projekt =
 * Wegwerf-Repo mit CLAUDE.md dieses Repos, Abläufe aus der ECHTEN Vorlage standard (Ausführung → Review (Codex) → qa (Claude))
 * über den echten HTTP-Pfad, Attrappe statt CLI. Nach dem Halt registriert die Instanz für den Ausführungslauf
 * `pruefergebnis-<laufId>` GRÜN (ein Render gibt es real nur nach GRÜN, Advisor H4) und `render-nachweis-<laufId>`:
 * (gruen) Review BEREIT, qa BEREIT, Render GRÜN ⇒ „entscheidbar“, Karte ohne Hinweis;
 * (rot) wie (gruen), Render ROT mit Befunden ⇒ Karte mit amber Hinweis;
 * (fehler) wie (gruen), Render FEHLER (.gitignore) ⇒ Ausgabe-Ende aufgeklappt;
 * (vorab) Review BLOCKIERT, qa BEREIT, max_replans 0 ⇒ Halt (KLAERUNG_ERFORDERLICH), Render ROT ⇒ Karte (h4) im Block „vorab“.
 * Danach fährt sie die Klickfolgen über scripts/render-nachweis.mjs (WebP, Überlaufmessung) in Unterordner neben diesem
 * Skript und beendet sich.
 *
 * Wird aufgerufen von: Hand — `node features/F45/nachweise/b3b2a2/instanz.mjs` (aus dem Repo). Nicht Teil von `npm run check`.
 */

import '../../../../scripts/neutrale-umgebung-starten.mjs'
import { execFile } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'
import { erzeugeRequestHandler } from '../../../../scripts/leitstand-server.mjs'
import { fuehreGitSync } from '../../../../src/git-starter/index.ts'
import { registriereKernArtefakt } from '../../../../src/lineage-registry/index.ts'
import { waehleWorkflowVorlage } from '../../../../src/router/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../../../../src/startvorlage/index.ts'
import { registriereWorkflow } from '../../../../src/workflow/index.ts'

const INSTALL = join(import.meta.dirname, '..', '..', '..', '..')
const ZIEL = import.meta.dirname
const PORT = Number(process.env.B3B2A2_PORT ?? 4403)
const wurzel = mkdtempSync(join(tmpdir(), 'f45-b3b2a2-render-'))
const basisVerzeichnis = join(wurzel, 'kontrollzustand')
const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }
const projekt = join(wurzel, 'projekt')
for (const datei of ['CLAUDE.md', '.claude/agents/code-reviewer.md', '.claude/agents/qa.md', 'docs/projekt/kontext/beschreibung.md']) {
  mkdirSync(dirname(join(projekt, datei)), { recursive: true })
  copyFileSync(join(INSTALL, datei), join(projekt, datei))
}
for (const argumente of [['init', '--quiet'], ['config', 'user.email', 'render@example.invalid'], ['config', 'user.name', 'Render'], ['config', 'core.autocrlf', 'false'], ['checkout', '--quiet', '-b', 'render'], ['add', '.'], ['commit', '--quiet', '-m', 'init']]) {
  fuehreGitSync(argumente, { cwd: projekt, encoding: 'utf8' })
}
const { pruefbefehl: _ohne, ...vorlage } = ladeStartvorlage(join(INSTALL, 'startvorlagen', 'ai-workforce.json'))
const startvorlagePfad = join(wurzel, 'startvorlage.json')
writeFileSync(startvorlagePfad, JSON.stringify(vorlage))
const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage(startvorlagePfad))

const REVIEW_BEREIT = JSON.stringify({ urteil: 'BEREIT', befunde: [], empfehlung: 'Keine belastbaren Findings im geprüften Scope. Abnehmen ist vertretbar.', ak_urteile: [] })
const REVIEW_BLOCKIERT = JSON.stringify({
  urteil: 'BLOCKIERT',
  befunde: [{ id: 'B1', dimension: 'bugs', schwere: 'HOCH', fundstelle: 'src/export/csv.ts:42', zusammenfassung: 'Felder mit Zeilenumbruch werden nicht in Anführungszeichen gesetzt.', beleg: 'escapeFeld prüft nur Komma und Anführungszeichen.', korrekturrichtung: 'Zeilenumbruch in die Bedingung aufnehmen.', evidenz: 'confirmed' }],
  empfehlung: 'Nicht abnehmen, B1 zuerst beheben.',
  ak_urteile: [],
})
const QA_BEREIT = JSON.stringify({ urteil: 'BEREIT', befunde: [], testfaelle: [{ name: 'Export einer kurzen Liste', schritte: ['Liste öffnen', '„Als CSV speichern“ wählen'], erwartet: 'Drei Zeilen.', ergebnis: 'bestanden' }], empfehlung: 'Keine belastbaren Findings im geprüften Scope. Aus Nutzersicht abnehmbar.' })

/** Ausgabe-Enden im Format des Skeletts (vorlagen/projekt-skelett/scripts/render-nachweis.mjs), ohne Pfade. */
const AUSGABE = {
  GRUEN: ['> check:render', '> npm run build && node scripts/render-nachweis.mjs', '', 'ℹ LCP nicht messbar (start 390×844 hell)', '✓ Render-Nachweis: 6 Ansichten, .render-nachweis/protokoll.md'].join('\n'),
  ROT: ['> check:render', '> npm run build && node scripts/render-nachweis.mjs', '', '✗ start 390×844 dunkel: waagerechter Überlauf', '✗ liste 1440×900 hell: LCP 3120 ms > 2500 ms', '✗ Render-Nachweis: 6 Ansichten, .render-nachweis/protokoll.md'].join('\n'),
  FEHLER: 'nicht ausgeführt: .render-nachweis/ steht nicht in .gitignore — Zeile .render-nachweis/ in .gitignore ergänzen',
}

const ausgaenge = new Map()
const aktiv = { workflowId: null }

/**
 * Rohstrom im Format des Workers (Muster b2b2b2): Codex als '--json'-Ereignisse, claude-code als result-Zeile.
 * @param worker - 'codex' | 'claude-code'
 * @param text - Ergebnistext
 * @returns stdout-Text
 */
function rohstromStdout(worker, text) {
  if (worker === 'codex') return [JSON.stringify({ type: 'turn.started' }), JSON.stringify({ type: 'item.completed', item: { id: 'item_0', type: 'agent_message', text } }), JSON.stringify({ type: 'turn.completed' })].join('\n')
  return JSON.stringify({ type: 'result', result: text })
}

/**
 * Attrappe für fuehreAufgabeDurch: Ausführung „Fertig.“, Review und qa aus der Warteschlange des aktiven Ablaufs.
 * @param laufId - Lauf
 * @param _profil - Profilreferenz (ungenutzt)
 * @param eingaben - Eingaben des Laufs
 * @returns Laufergebnis
 */
async function attrappe(laufId, _profil, eingaben) {
  const worker = eingaben.worker ?? 'claude-code'
  const ausgang = eingaben.rolle === 'code-reviewer' || eingaben.rolle === 'qa' ? (ausgaenge.get(aktiv.workflowId)?.[eingaben.rolle]?.shift() ?? { text: 'kein Ausgang' }) : { text: 'Fertig.' }
  const rohstromPfad = join(wurzel, `rohstrom-${laufId}.json`)
  writeFileSync(rohstromPfad, JSON.stringify({ stdout: rohstromStdout(worker, ausgang.text) }))
  const daten = { worker, rohstrom_referenz: { pfad: rohstromPfad, inhalts_hash: 'x' }, ...(eingaben.review !== undefined ? { review: eingaben.review } : {}) }
  registriereKernArtefakt(`laufakte-${laufId}`, profilReferenz, { erzeuger: 'kern', schritt: 'render-attrappe' }, daten, [], ladeOptionen)
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

/**
 * Prüfergebnis-Daten v0 (src/pruefschritt/types.ts) für einen Lauf.
 * @param laufId - Ausführungslauf
 * @param befehl - argv
 * @param ergebnis - GRUEN | ROT | FEHLER
 * @returns Daten
 */
function pruefDaten(laufId, befehl, ergebnis) {
  const exit = { GRUEN: 0, ROT: 1, FEHLER: null }[ergebnis]
  const ausgabe = befehl.at(-1) === 'check' ? '✓ npm run check' : AUSGABE[ergebnis]
  return { pruefergebnis_schema: 'v0', lauf_id: laufId, befehl, exit_code: exit, ergebnis, dauer_ms: ergebnis === 'FEHLER' ? 40 : 48210, ausgabe_ende: ausgabe, gestartet_am: new Date().toISOString() }
}

/**
 * Legt Auftrag und Ablauf aus der Vorlage standard an, wartet auf den Halt und registriert Prüfergebnis GRÜN und Render-Nachweis.
 * @param titel - Titel des Auftrags
 * @param warteschlange - { 'code-reviewer': [...], qa: [...] }
 * @param render - Ergebnis des Render-Nachweises
 * @param maxReplans - grenzen.max_replans (Vorlage: 1)
 * @returns workflowId
 */
async function fahreAblauf(titel, warteschlange, render, maxReplans) {
  const { auftragId } = await (await fetch(`${basis}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel, auftragstext: 'Füge einen CSV-Export der Liste hinzu.' }) })).json()
  const daten = waehleWorkflowVorlage({ kontrolltiefe: 'standard', risikoklasse: 'mittel', task_typen: ['feature'], rueckfragen: [], begruendung: 'Render-Nachweis.' }, auftragId, `${titel}.`, INSTALL)
  daten.schritte[0].freigabe_erteilt = true
  if (maxReplans !== undefined) daten.grenzen.max_replans = maxReplans
  registriereWorkflow(daten, profilReferenz, ladeOptionen)
  ausgaenge.set(daten.workflow_id, warteschlange)
  aktiv.workflowId = daten.workflow_id
  await fetch(`${basis}/api/workflows/${daten.workflow_id}/starten`, { method: 'POST' })
  const ende = Date.now() + 30000
  let workflow
  while (Date.now() < ende) {
    workflow = (await (await fetch(`${basis}/api/workflows/${daten.workflow_id}`)).json())?.daten
    if (workflow?.status !== undefined && workflow.status !== 'LAEUFT' && workflow.status !== 'OFFEN') break
    await new Promise((r) => setTimeout(r, 200))
  }
  const laufId = workflow.schritte.find((s) => s.rolle === 'ausfuehrung')?.lauf_id
  const herkunft = { erzeuger: 'kern', schritt: 'render-attrappe' }
  registriereKernArtefakt(`pruefergebnis-${laufId}`, profilReferenz, herkunft, pruefDaten(laufId, ['npm', 'run', 'check'], 'GRUEN'), [], ladeOptionen)
  registriereKernArtefakt(`render-nachweis-${laufId}`, profilReferenz, herkunft, pruefDaten(laufId, ['npm', 'run', 'check:render'], render), [], ladeOptionen)
  console.log(`${titel}: ${daten.workflow_id} — ${workflow.status}, Render ${render}`)
  return daten.workflow_id
}

const ids = {
  gruen: await fahreAblauf('CSV-Export, Darstellung grün', { 'code-reviewer': [{ text: REVIEW_BEREIT }], qa: [{ text: QA_BEREIT }] }, 'GRUEN'),
  rot: await fahreAblauf('CSV-Export, Darstellung mit Befunden', { 'code-reviewer': [{ text: REVIEW_BEREIT }], qa: [{ text: QA_BEREIT }] }, 'ROT'),
  fehler: await fahreAblauf('CSV-Export, Render nicht ausgeführt', { 'code-reviewer': [{ text: REVIEW_BEREIT }], qa: [{ text: QA_BEREIT }] }, 'FEHLER'),
  vorab: await fahreAblauf('CSV-Export, Review blockiert', { 'code-reviewer': [{ text: REVIEW_BLOCKIERT }], qa: [{ text: QA_BEREIT }] }, 'ROT', 0),
}

const BEOBACHTUNG = {
  texte: [
    { name: 'Kartentitel', selector: '#abnahme-render-titel' },
    { name: 'Badge', selector: '.abnahme-render .ablauf-status' },
  ],
  vorhanden: [
    { name: 'Karte', selector: '.abnahme-render' },
    { name: 'Karte im Block vorab', selector: '.abnahme-vorab .abnahme-render' },
    { name: 'Hinweis amber', selector: '.abnahme-render .note.amber' },
    { name: 'Badge grün', selector: '.abnahme-render .ablauf-status.ok' },
    { name: 'Badge amber', selector: '.abnahme-render .ablauf-status.warten' },
    { name: 'Ausgabe aufgeklappt', selector: '.abnahme-render details[open]' },
    { name: 'Abnehmen', selector: '#workflow-entscheidung input[type="radio"][value="ANGENOMMEN"]' },
  ],
  ueberlauf: true,
}
const ANSICHTEN = {
  'de-1440': { viewport: { breite: 1440, hoehe: 1600 } },
  'de-1440-hell': { viewport: { breite: 1440, hoehe: 1600 }, farbschema: 'light' },
  'de-390': { viewport: { breite: 390, hoehe: 3600 } },
  'de-390-hell': { viewport: { breite: 390, hoehe: 3600 }, farbschema: 'light' },
  'ru-390-hell': { viewport: { breite: 390, hoehe: 3600 }, farbschema: 'light', localStorageSetzen: { 'leitstand-sprache': 'ru' } },
}
const FOLGEN = {
  gruen: { ansichten: ['de-1440', 'de-1440-hell', 'de-390', 'de-390-hell'], label: 'Render GRÜN, Karte ohne Hinweis' },
  rot: { ansichten: Object.keys(ANSICHTEN), label: 'Render ROT, amber Hinweis, Abnahme möglich', aufklappen: true },
  fehler: { ansichten: ['de-1440'], label: 'Render FEHLER, Grund im aufgeklappten Ausgabe-Ende' },
  vorab: { ansichten: ['de-1440-hell', 'de-390'], label: 'Halt nach Review BLOCKIERT, Karte im Block „vorab“' },
}

const ausfuehren = promisify(execFile)
const nur = process.env.NUR?.split(',') ?? null
for (const [lage, folge] of Object.entries(FOLGEN)) {
  for (const ansicht of folge.ansichten) {
    const name = `${lage}-${ansicht}`
    if (nur !== null && !nur.includes(name)) continue
    const schritte = [{ label: `${folge.label} — ${ansicht}`, warteAufSelector: { selector: '.abnahme-render', timeoutMs: 10000 }, screenshot: '01-karte.webp' }]
    if (folge.aufklappen) schritte.push({ label: 'Ausgabe-Ende aufgeklappt', klick: '.abnahme-render summary', screenshot: '02-ausgabe.webp' })
    const verzeichnis = join(ZIEL, name)
    mkdirSync(verzeichnis, { recursive: true })
    const datei = join(verzeichnis, 'klickfolge.json')
    const klickfolge = { url: `${basis}/#/workflows/${encodeURIComponent(ids[lage])}`, ...ANSICHTEN[ansicht], screenshotVollseite: true, beobachtete: BEOBACHTUNG, schritte }
    writeFileSync(datei, `${JSON.stringify(klickfolge, null, 2)}\n`)
    const { stdout } = await ausfuehren(process.execPath, [join(INSTALL, 'scripts/render-nachweis.mjs'), datei, verzeichnis], { cwd: INSTALL })
    console.log(`=== ${name} ===\n${stdout.trim().split('\n').slice(-3).join('\n')}`)
  }
}
leitstand.close()
process.exit(0)
