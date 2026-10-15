#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/b2b2b2/instanz.mjs
 *
 * Zweck: Leitstand-Testinstanz für den Render-Nachweis F45 B2b-2b-2 „qa-Schritt live“ (render/erzeuge-nachweis.mjs, Muster
 * features/F45/nachweise/b2b2a/instanz.mjs). Wegwerf-Ablage, Projekt = Wegwerf-Repo mit CLAUDE.md dieses Repos, Startvorlage
 * ohne Prüfbefehl. Drei Abläufe aus der ECHTEN Vorlage standard (waehleWorkflowVorlage: Ausführung → Review (Codex) → qa
 * (Claude)) laufen nacheinander über den echten HTTP-Pfad; die Attrappe (kein CLI, kein Netz) antwortet je Rolle mit einer
 * echten Laufakte im Rohstromformat ihres Workers:
 * (a) bereit-hoch: Review BEREIT mit einem MITTEL-Befund, qa BEREIT mit einem HOCH-Befund (lange Fundstelle) und drei
 *     Testfällen (bestanden, durchgefallen, nicht prüfbar) ⇒ Abnahme mit Review-Kachel und qa-Karte, amber Hinweis;
 * (b) halt: qa im ersten Lauf FEHLGESCHLAGEN, im zweiten BEREIT ⇒ Halt am qa mit roter Notiz und Knopf; der Klick lässt nur
 *     den qa erneut laufen ⇒ Abnahme;
 * (c) blockiert: qa BLOCKIERT bei max_replans 0 ⇒ Halt am qa mit gültigem Ergebnis (Urteil, qa-Befunde, neutraler Satz,
 *     kein Knopf; Advisor A1/A3);
 * (d) review-beanstandet (zweite Runde, F-1119 (1)): Review BLOCKIERT, qa BEREIT, max_replans 0 ⇒ Halt am qa; der
 *     Vorab-Block zeigt zusätzlich die Befunde des Reviews.
 *
 * Wird aufgerufen von: Hand — `node features/F45/nachweise/b2b2b2/instanz.mjs`; gibt die drei workflowIds aus und bleibt
 * offen, bis der Prozess beendet wird. Nicht Teil von `npm run check`.
 */

import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { erzeugeRequestHandler } from '../../../../scripts/leitstand-server.mjs'
import { fuehreGitSync } from '../../../../src/git-starter/index.ts'
import { registriereKernArtefakt } from '../../../../src/lineage-registry/index.ts'
import { waehleWorkflowVorlage } from '../../../../src/router/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../../../../src/startvorlage/index.ts'
import { registriereWorkflow } from '../../../../src/workflow/index.ts'

const INSTALL = join(import.meta.dirname, '..', '..', '..', '..')
const PORT = Number(process.env.B2B2B2_PORT ?? 4402)
const wurzel = mkdtempSync(join(tmpdir(), 'f45-b2b2b2-render-'))
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

const REVIEW_BEREIT = JSON.stringify({
  urteil: 'BEREIT',
  befunde: [{ id: 'B1', dimension: 'wartbarkeit', schwere: 'MITTEL', fundstelle: 'src/export/csv.ts:7', zusammenfassung: 'Das Trennzeichen steht als Literal an zwei Stellen.', beleg: 'Zeilen 7 und 31.', korrekturrichtung: 'Eine Konstante TRENNZEICHEN.', evidenz: 'likely' }],
  empfehlung: 'Abnehmen ist vertretbar.',
  ak_urteile: [],
})
const QA_BEFUND_HOCH = {
  id: 'Q1',
  schwere: 'HOCH',
  evidenz: 'confirmed',
  fundstelle: 'Export-Dialog → „Als CSV speichern“ (sehr/langer/pfad/zur/fundstelle/die/umbrechen/muss/ohne/das/layout/zu/sprengen.ts)',
  zusammenfassung: 'Eine Notiz mit Zeilenumbruch zerfällt beim Öffnen in einer Tabellenkalkulation in zwei Zeilen.',
  korrekturrichtung: 'Felder mit Zeilenumbruch in Anführungszeichen setzen und den Fall als Testfall aufnehmen.',
  beleg: 'Durchgespielt mit einer Notiz „Zeile 1⏎Zeile 2“.',
}
const TESTFAELLE = [
  { name: 'Export einer kurzen Liste', schritte: ['Liste mit drei Einträgen öffnen', '„Als CSV speichern“ wählen', 'Datei in einer Tabellenkalkulation öffnen'], erwartet: 'Drei Zeilen mit allen Spalten.', ergebnis: 'bestanden' },
  { name: 'Notiz mit Zeilenumbruch', schritte: ['Eintrag mit zweizeiliger Notiz anlegen', 'Exportieren und öffnen'], erwartet: 'Die Notiz bleibt in einer Zelle.', ergebnis: 'durchgefallen' },
  { name: 'Sehr große Liste (10 000 Einträge)', schritte: ['Große Liste exportieren'], erwartet: 'Export in unter zwei Sekunden.', ergebnis: 'nicht_pruefbar' },
]
const qaText = (urteil, befunde, empfehlung) => JSON.stringify({ urteil, befunde, testfaelle: TESTFAELLE, empfehlung })

// Je Workflow eine Warteschlange von Ausgängen je Rolle; die Attrappe nimmt je Lauf den nächsten.
const ausgaenge = new Map()
const aktiv = { workflowId: null }

/**
 * Rohstrom im Format des Workers (Muster scripts/check-f45-b2b2-pruefer.mjs): Codex als '--json'-Ereignisse, claude-code als
 * result-Zeile.
 * @param worker - 'codex' | 'claude-code'
 * @param text - Ergebnistext
 * @returns stdout-Text
 */
function rohstromStdout(worker, text) {
  if (worker === 'codex') return [JSON.stringify({ type: 'turn.started' }), JSON.stringify({ type: 'item.completed', item: { id: 'item_0', type: 'agent_message', text } }), JSON.stringify({ type: 'turn.completed' })].join('\n')
  return JSON.stringify({ type: 'result', result: text })
}

/**
 * Attrappe für fuehreAufgabeDurch: Ausführung „Fertig.“, Review und qa aus der Warteschlange des aktiven Ablaufs; jede Rolle
 * bekommt eine echte Laufakte mit Rohstrom.
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
  const ergebnis = ausgang.fehlschlag === true ? 'FEHLGESCHLAGEN' : 'ERFOLGREICH'
  return { ok: true, klassifikation: { ergebnis, bypass_verdacht_anzahl: 0, ...(ergebnis === 'FEHLGESCHLAGEN' ? { grund: 'werkzeugausfall' } : {}) }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis } }
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
 * Legt Auftrag und Ablauf aus der Vorlage standard an (Ausführung vorab freigegeben), startet ihn und wartet auf den Halt.
 * @param titel - Titel des Auftrags
 * @param warteschlange - { 'code-reviewer': [...], qa: [...] }
 * @param maxReplans - grenzen.max_replans (Vorlage: 1)
 * @returns workflowId
 */
async function fahreAblauf(titel, warteschlange, maxReplans) {
  const { auftragId } = await (await fetch(`${basis}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel, auftragstext: 'Füge einen CSV-Export der Liste hinzu.' }) })).json()
  const daten = waehleWorkflowVorlage({ kontrolltiefe: 'standard', risikoklasse: 'mittel', task_typen: ['feature'], rueckfragen: [], begruendung: 'Render-Nachweis.' }, auftragId, `${titel}.`, INSTALL)
  daten.schritte[0].freigabe_erteilt = true
  if (maxReplans !== undefined) daten.grenzen.max_replans = maxReplans
  registriereWorkflow(daten, profilReferenz, ladeOptionen)
  ausgaenge.set(daten.workflow_id, warteschlange)
  aktiv.workflowId = daten.workflow_id
  const start = await fetch(`${basis}/api/workflows/${daten.workflow_id}/starten`, { method: 'POST' })
  if (start.status >= 400) console.log(`starten ${start.status} ${await start.text()}`)
  const ende = Date.now() + 30000
  let status
  while (Date.now() < ende) {
    status = (await (await fetch(`${basis}/api/workflows/${daten.workflow_id}`)).json())?.daten?.status
    if (status !== undefined && status !== 'LAEUFT' && status !== 'OFFEN') break
    await new Promise((r) => setTimeout(r, 200))
  }
  console.log(`${titel}: ${daten.workflow_id} — ${status}`)
  return daten.workflow_id
}

const bereitHoch = await fahreAblauf('CSV-Export, qa bereit mit schwerem Befund', { 'code-reviewer': [{ text: REVIEW_BEREIT }], qa: [{ text: qaText('BEREIT', [QA_BEFUND_HOCH], 'Abnehmen ist vertretbar; Q1 vor dem nächsten Export beheben.') }] })
const halt = await fahreAblauf('CSV-Export, qa ausgefallen', { 'code-reviewer': [{ text: REVIEW_BEREIT }], qa: [{ text: 'Werkzeug ausgefallen.', fehlschlag: true }, { text: qaText('BEREIT', [], 'Abnehmen.') }] })
const blockiert = await fahreAblauf('CSV-Export, qa blockiert ohne Korrekturrunde', { 'code-reviewer': [{ text: REVIEW_BEREIT }], qa: [{ text: qaText('BLOCKIERT', [QA_BEFUND_HOCH], 'Nicht abnehmen, Q1 zuerst beheben.') }] }, 0)
const REVIEW_BLOCKIERT = JSON.stringify({
  urteil: 'BLOCKIERT',
  befunde: [{ id: 'B1', dimension: 'bugs', schwere: 'HOCH', fundstelle: 'src/export/csv.ts:42', zusammenfassung: 'Felder mit Zeilenumbruch werden nicht in Anführungszeichen gesetzt.', beleg: 'Statisch: escapeFeld prüft nur Komma und Anführungszeichen.', korrekturrichtung: 'Zeilenumbruch in die Bedingung von escapeFeld aufnehmen.', evidenz: 'confirmed' }],
  empfehlung: 'Nicht abnehmen, B1 zuerst beheben.',
  ak_urteile: [],
})
const reviewBeanstandet = await fahreAblauf('CSV-Export, Review blockiert, qa bereit', { 'code-reviewer': [{ text: REVIEW_BLOCKIERT }], qa: [{ text: qaText('BEREIT', [], 'Aus Nutzersicht abnehmbar.') }] }, 0)
// Der Klick in Folge (b) startet den qa erneut — die Attrappe muss dann den Ablauf (b) bedienen.
aktiv.workflowId = halt
console.log(`Testinstanz B2b-2b-2 offen: ${basis}\n  a ${bereitHoch}\n  b ${halt}\n  c ${blockiert}\n  d ${reviewBeanstandet}\n(beenden mit Strg+C)`)
