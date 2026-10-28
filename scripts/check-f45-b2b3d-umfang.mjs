#!/usr/bin/env node
/**
 * Datei: scripts/check-f45-b2b3d-umfang.mjs
 *
 * Zweck: Gate für F45 B2b-3d „Umfangs-Abgleich + Eingabefeld Bereiche“ (F-978, features/F45/plan-b2b3d-v2.md). Nachweis am
 * REALEN Aufrufpfad (Muster scripts/check-f45-b2b3c-budget.mjs): echter HTTP-Testserver, Auftrag über POST /api/auftraege
 * (der Produktionsweg des Formulars „Auftrag & Start“), Workflow Ausführung → Review → qa, gestubbter Worker, der im
 * Wegwerf-Projekt real Dateien ändert — die echte Änderungsübersicht sieht sie, der Nachlauf hält den Abgleich fest.
 * Je Szenario ein eigenes Wegwerf-Projekt und ein eigener Server (Advisor A4: der Start einer schreibenden Ausführung im
 * Projektordner verlangt einen sauberen Baum).
 *
 * Prüft:
 * (u1) Bereiche ['src/'], Ausführung ändert src/a.ts und docs/x.md ⇒ Übersicht umfang.ausserhalb = ['docs/x.md'], kein Halt
 *      (Review und qa laufen, ABGESCHLOSSEN); GET …/abnahme umfang { ok, ['docs/x.md'] }; Ausführungsauftrag nennt
 *      „Betroffene Bereiche: src/“.
 * (u2) nur src/a.ts geändert ⇒ ausserhalb leer, Review- und qa-Auftrag ohne Zeile.
 * (u3) ohne Bereiche ⇒ kein Feld in der Übersicht, umfang kein_abgleich, Review-Auftrag ohne Zeile.
 * (u4) in (u1) enthalten Review- und qa-Auftrag die Zeile mit docs/x.md, beim Review hinter dem Policy-Block.
 * (u5) POST /api/auftraege: bereiche und budget_tokens werden übernommen; ungültige Werte ⇒ 400; ein kleines budget_tokens
 *      wirkt — nach der Ausführung Budget-Halt mit quelle 'arbeitspaket', ohne Review.
 * (u6) Bereiche gesetzt, aber die Übersicht trägt kein Feld (Alt-Artefakt/degradiert) ⇒ umfang nicht_bestimmbar. Abweichung von
 *      Plan v2 (u7, Projekt ohne git): ohne git hält schon Regel 1j bzw. die Startprüfung — hier wird die Übersicht ohne Feld neu
 *      registriert; der Zweig „degradiert ⇒ kein Feld“ ist per Unit-Test belegt (scripts/leitstand/umfang-stand.test.mjs).
 * (e)  Beispiel schemas/examples/…aenderungsuebersicht-payload.valid-umfang.json ist gültig, mit fehlendem ausserhalb ungültig.
 * (f)  gestrichen in F45 W2b-1 (Zählungen 6/14/13 trägt check-f15-workflow).
 *
 * Wird aufgerufen von: `npm run check:gates` (und damit `npm run check`).
 *
 * Aufruf: node scripts/check-f45-b2b3d-umfang.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { isDeepStrictEqual as gleich } from 'node:util'
import { validiereAenderungsuebersichtDaten } from '../src/aenderungsuebersicht/index.ts'
import { ladeArtefaktVersion, registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { baueReviewPolicyBlock, KEINE_BEFUNDE_SATZ } from '../src/review-policy/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { erzeugeRequestHandler } from './leitstand-server.mjs'
import { schalteGitWartungAb, wegwerfOrdner } from './_wegwerf.ts'

/** Wegwerf-Wurzel dieses Laufs unter os.tmpdir() (F45 W2b-2), beim Prozessende geräumt. */
const WEGWERF = wegwerfOrdner('f45-b2b3d-umfang')

const befunde = []
console.log('\n=== F45-B2b-3d-Umfang-Check ===\n')

const INSTALL_WURZEL = process.cwd()
const ZEILE_ANFANG = 'Diese Dateien liegen außerhalb der vereinbarten Bereiche: '
const BEREIT_REVIEW = JSON.stringify({ urteil: 'BEREIT', befunde: [], empfehlung: `${KEINE_BEFUNDE_SATZ}.`, ak_urteile: [] })
const BEREIT_QA = JSON.stringify({ urteil: 'BEREIT', befunde: [], testfaelle: [{ name: 'Grundfall', schritte: ['Aufruf'], erwartet: 'wie verlangt', ergebnis: 'bestanden' }], empfehlung: 'Gate.' })
const aufraeumen = []
/** Offene Testserver — im finally geschlossen, auch wenn ein Szenario wirft (code-reviewer 7). */
const server = []

function pruefe(bedingung, ok, fehler) {
  if (bedingung) console.log(`  ✓ ${ok}`)
  else befunde.push(fehler)
}

function git(wurzel, argumente) {
  return execFileSync('git', argumente, { cwd: wurzel, encoding: 'utf8' })
}

/** Wegwerf-Projekt mit getrackten Ordnern src/ und docs/ (Advisor A3: neue Dateien erscheinen dann einzeln). @returns Pfad */
function baueProjekt() {
  const wurzel = mkdtempSync(join(tmpdir(), 'check-f45-b2b3d-projekt-'))
  aufraeumen.push(wurzel)
  git(wurzel, ['init', '--quiet'])
  schalteGitWartungAb(wurzel)
  git(wurzel, ['config', 'user.email', 'test@example.invalid'])
  git(wurzel, ['config', 'user.name', 'Test'])
  git(wurzel, ['config', 'core.autocrlf', 'false'])
  git(wurzel, ['branch', '-m', 'wegwerf-branch'])
  mkdirSync(join(wurzel, 'src'), { recursive: true })
  mkdirSync(join(wurzel, 'docs'), { recursive: true })
  writeFileSync(join(wurzel, 'src', 'a.ts'), 'export const a = 1\n', 'utf8')
  writeFileSync(join(wurzel, 'docs', 'liesmich.md'), '# Doku\n', 'utf8')
  git(wurzel, ['add', '.'])
  git(wurzel, ['commit', '--quiet', '-m', 'init'])
  return wurzel
}

const verzoegerung = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const SCHRITT = (schritt_id, rolle, werkzeugsatz, output_schema, nachfolger, freigabe) => ({
  schritt_id,
  rolle,
  werkzeugsatz,
  worker: 'claude-code',
  modell: 'claude-sonnet-5',
  eingaben: [],
  output_schema,
  freigabe,
  ...(freigabe === 'ZWINGEND' ? { freigabe_erteilt: true } : {}),
  risiko: 'Gate-Fixture.',
  zeitgrenze_ms: 600000,
  nachfolger,
  status: 'OFFEN',
  lauf_id: null,
})
const SCHRITTE = [
  SCHRITT('schritt-1-ausfuehrung', 'ausfuehrung', 'schreibend', null, 'schritt-2-review', 'ZWINGEND'),
  SCHRITT('schritt-2-review', 'code-reviewer', 'lesend', 'ergebnis-code-reviewer', 'schritt-3-qa', 'AUTOMATISCH'),
  SCHRITT('schritt-3-qa', 'qa', 'lesend', 'ergebnis-qa', null, 'AUTOMATISCH'),
]

/**
 * Ein Szenario: eigenes Projekt, eigene Ablage, eigener Server. Legt den Auftrag über POST /api/auftraege an (body), den
 * Workflow direkt, startet und wartet, bis der Ablauf steht.
 * @param kennung - Szenario-Kennung
 * @param body - Zusatzfelder des POST-Bodys (bereiche, budget_tokens)
 * @param dateien - { relativerPfad: inhalt } — schreibt die Ausführung ins Projekt
 * @returns { laeufe, workflow, auftrag, abnahme, ausfuehrungLaufId, basis, ladeOptionen, schliesse } oder null
 */
async function szenario(kennung, body, dateien) {
  const projekt = baueProjekt()
  const basisVerzeichnis = join(WEGWERF, `f45-b2b3d-${kennung}-${randomUUID()}`)
  raeumeVerzeichnis(basisVerzeichnis)
  aufraeumen.push(basisVerzeichnis)
  const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }
  const vorlage = ladeStartvorlage('startvorlagen/beispielprojekt.json')
  const profilReferenz = leiteProfilReferenzAb(vorlage)
  const laeufe = []
  /** Attrappe: schreibt bei der Ausführung die Dateien ins Projekt; Review/qa urteilen BEREIT. */
  async function attrappe(laufId, _profil, eingaben) {
    laeufe.push({ laufId, rolle: eingaben.rolle, auftragstext: eingaben.auftragstext })
    if (eingaben.rolle === 'ausfuehrung') for (const [pfad, inhalt] of Object.entries(dateien)) writeFileSync(join(projekt, pfad), inhalt, 'utf8')
    const text = eingaben.rolle === 'code-reviewer' ? BEREIT_REVIEW : eingaben.rolle === 'qa' ? BEREIT_QA : 'Bau erledigt.'
    mkdirSync(basisVerzeichnis, { recursive: true })
    const rohstromPfad = join(basisVerzeichnis, `${laufId}-rohstrom.json`)
    writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: text }) }), 'utf8')
    const verbrauch = { input_tokens: 100, output_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0, dauer_ms: 1, dauer_api_ms: null, turns: null, quelle: 'claude-code' }
    registriereKernArtefakt(`laufakte-${laufId}`, profilReferenz, { erzeuger: 'check-f45-b2b3d-fake' }, { worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad }, verbrauch, ...(eingaben.review !== undefined ? { review: eingaben.review } : {}) }, undefined, ladeOptionen)
    return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH', bypass_verdacht_anzahl: 0 }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  }
  const dienst = createServer(erzeugeRequestHandler({ basisVerzeichnis, fuehreAufgabeDurchFn: attrappe, repoWurzel: projekt, installWurzel: INSTALL_WURZEL }))
  await new Promise((resolve) => dienst.listen(0, '127.0.0.1', resolve))
  const basis = `http://127.0.0.1:${dienst.address().port}`
  server.push(dienst)
  const schliesse = () => new Promise((resolve) => (dienst.listening ? dienst.close(() => resolve()) : resolve()))
  const antwort = await fetch(`${basis}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: `Gate ${kennung}`, auftragstext: 'Füge einen CSV-Export hinzu.', ...body }) })
  const koerper = await antwort.json().catch(() => ({}))
  if (antwort.status !== 201 || typeof koerper.auftragId !== 'string') {
    befunde.push(`(${kennung}) Vorbedingung POST /api/auftraege: ${antwort.status} ${JSON.stringify(koerper)}`)
    await schliesse()
    return null
  }
  const workflowId = `f45-b2b3d-${kennung}-${randomUUID()}`
  registriereWorkflow({ workflow_schema: 'v0', workflow_id: workflowId, auftrag_id: koerper.auftragId, version: 1, ziel: `Gate ${kennung}.`, status: 'OFFEN', aktiver_schritt_id: 'schritt-1-ausfuehrung', grenzen: { max_schritte: 20, max_replans: 1 }, schritte: SCHRITTE }, profilReferenz, ladeOptionen)
  const start = await fetch(`${basis}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST', body: '{}' })
  if (start.status !== 202) befunde.push(`(${kennung}) Start erwartet 202, erhalten ${start.status}: ${await start.text()}`)
  let workflow = null
  for (const ende = Date.now() + 8000; Date.now() < ende; ) {
    const daten = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)?.daten ?? null
    if (daten !== null && daten.status !== 'LAEUFT' && daten.status !== 'OFFEN' && !daten.schritte.some((s) => s.status === 'LAEUFT')) {
      workflow = daten
      break
    }
    await verzoegerung(50)
  }
  if (workflow === null) befunde.push(`(${kennung}) Ablauf steht nicht innerhalb der Wartezeit`)
  const abnahme = await (await fetch(`${basis}/api/workflows/${encodeURIComponent(workflowId)}/abnahme`)).json()
  const ausfuehrungLaufId = laeufe.find((l) => l.rolle === 'ausfuehrung')?.laufId ?? null
  const auftrag = ladeArtefaktVersion(`auftrag-${koerper.auftragId}`, undefined, ladeOptionen)?.daten ?? null
  return { laeufe, workflow, workflowId, auftrag, abnahme, ausfuehrungLaufId, basis, ladeOptionen, profilReferenz, schliesse }
}

const uebersichtVon = (s) => (s.ausfuehrungLaufId === null ? null : (ladeArtefaktVersion(`aenderungsuebersicht-${s.ausfuehrungLaufId}`, undefined, s.ladeOptionen)?.daten ?? null))
const auftragstextVon = (s, rolle) => s.laeufe.find((l) => l.rolle === rolle)?.auftragstext ?? ''

try {
  // ── (u1) + (u4) Datei außerhalb ⇒ Hinweis, kein Halt; Zeile in Review und qa ─────────────
  {
    const s = await szenario('u1', { bereiche: ['src/'] }, { 'src/a.ts': 'export const a = 2\n', 'docs/x.md': '# Neu\n' })
    if (s !== null) {
      const uebersicht = uebersichtVon(s)
      pruefe(gleich(uebersicht?.umfang, { bereiche: ['src/'], ausserhalb: ['docs/x.md'] }), '(u1) Übersicht hält umfang fest: außerhalb docs/x.md.', `(u1) umfang der Übersicht: ${JSON.stringify(uebersicht?.umfang)}`)
      pruefe(s.workflow?.status === 'ABGESCHLOSSEN' && s.laeufe.some((l) => l.rolle === 'code-reviewer') && s.laeufe.some((l) => l.rolle === 'qa'), '(u1) kein Halt — Review und qa laufen, Ablauf ABGESCHLOSSEN.', `(u1) Status ${s.workflow?.status}, Läufe ${s.laeufe.map((l) => l.rolle).join(',')}, grund ${s.workflow?.grund}`)
      pruefe(gleich(s.abnahme.umfang, { status: 'ok', ausserhalb: ['docs/x.md'], bereiche: ['src/'] }), '(u1) GET …/abnahme umfang ok mit docs/x.md.', `(u1) abnahme.umfang ${JSON.stringify(s.abnahme.umfang)}`)
      pruefe(auftragstextVon(s, 'ausfuehrung').includes('Betroffene Bereiche: src/'), '(u1) Ausführungsauftrag nennt „Betroffene Bereiche: src/“.', '(u1) Ausführungsauftrag ohne „Betroffene Bereiche: src/“')
      const review = auftragstextVon(s, 'code-reviewer')
      const qa = auftragstextVon(s, 'qa')
      const zeile = `${ZEILE_ANFANG}docs/x.md`
      pruefe(review.includes(zeile) && qa.includes(zeile), '(u4) Review- und qa-Auftrag enthalten die Zeile mit docs/x.md.', `(u4) Zeile fehlt — Review ${review.includes(zeile)}, qa ${qa.includes(zeile)}`)
      const policy = review.indexOf(baueReviewPolicyBlock())
      pruefe(policy >= 0 && review.indexOf(zeile) > policy, '(u4) beim Review hinter dem Policy-Block.', `(u4) Lage: Policy ${policy}, Zeile ${review.indexOf(zeile)}`)
      await s.schliesse()
    }
  }

  // ── (u2) alle Dateien innerhalb ⇒ kein Hinweis ─────────────────────────────────────────────
  {
    const s = await szenario('u2', { bereiche: ['src'] }, { 'src/a.ts': 'export const a = 3\n' })
    if (s !== null) {
      pruefe(JSON.stringify(uebersichtVon(s)?.umfang?.ausserhalb) === '[]' && gleich(s.abnahme.umfang, { status: 'ok', ausserhalb: [], bereiche: ['src'] }), '(u2) alle innerhalb ⇒ ausserhalb leer, Abnahme ok ohne Dateien.', `(u2) Übersicht ${JSON.stringify(uebersichtVon(s)?.umfang)}, abnahme ${JSON.stringify(s.abnahme.umfang)}`)
      pruefe(!auftragstextVon(s, 'code-reviewer').includes(ZEILE_ANFANG) && !auftragstextVon(s, 'qa').includes(ZEILE_ANFANG) && s.workflow?.status === 'ABGESCHLOSSEN', '(u2) Review- und qa-Auftrag ohne Zeile, ABGESCHLOSSEN.', `(u2) Zeile im Auftrag oder Status ${s.workflow?.status}`)
      await s.schliesse()
    }
  }

  // ── (u3) ohne Bereiche kein Abgleich ────────────────────────────────────────────────────────
  {
    const s = await szenario('u3', {}, { 'src/a.ts': 'export const a = 4\n', 'docs/x.md': '# Neu\n' })
    if (s !== null) {
      const uebersicht = uebersichtVon(s)
      pruefe(uebersicht !== null && !('umfang' in uebersicht) && s.abnahme.umfang?.status === 'kein_abgleich', '(u3) ohne Bereiche: kein Feld, Abnahme kein_abgleich.', `(u3) Übersicht ${uebersicht === null ? 'fehlt' : JSON.stringify(uebersicht.umfang)}, abnahme ${JSON.stringify(s.abnahme.umfang)}`)
      pruefe(!auftragstextVon(s, 'code-reviewer').includes(ZEILE_ANFANG) && !auftragstextVon(s, 'ausfuehrung').includes('Betroffene Bereiche'), '(u3) Review-Auftrag ohne Zeile, kein Arbeitspaket-Block.', '(u3) Zeile oder Arbeitspaket-Block im Auftrag')
      await s.schliesse()
    }
  }

  // ── (u5) Eingabe bereiche/budget_tokens über POST /api/auftraege ─────────────────────────────
  {
    const s = await szenario('u5', { bereiche: ['src/', 'docs/'], budget_tokens: 50 }, { 'src/a.ts': 'export const a = 5\n' })
    if (s !== null) {
      pruefe(JSON.stringify(s.auftrag?.bereiche) === JSON.stringify(['src/', 'docs/']) && s.auftrag?.budget_tokens === 50, '(u5) Auftrag trägt bereiche und budget_tokens aus dem Formular.', `(u5) Auftrag ${JSON.stringify({ bereiche: s.auftrag?.bereiche, budget_tokens: s.auftrag?.budget_tokens })}`)
      pruefe(
        s.workflow?.status === 'KLAERUNG_ERFORDERLICH' && typeof s.workflow?.grund === 'string' && s.workflow.grund.startsWith('Budget erreicht: ') && s.abnahme.budget?.quelle === 'arbeitspaket' && !s.laeufe.some((l) => l.rolle === 'code-reviewer'),
        '(u5) budget_tokens aus der Eingabe wirkt: Budget-Halt nach der Ausführung, Quelle Arbeitspaket, kein Review.',
        `(u5) Status ${s.workflow?.status}, grund ${s.workflow?.grund}, quelle ${s.abnahme.budget?.quelle}`
      )
      const ungueltig = [{ bereiche: [] }, { bereiche: ['  '] }, { bereiche: ['src/', 'src/'] }, { bereiche: 'src/' }, { budget_tokens: 0 }, { budget_tokens: '5' }, { budget_tokens: 1.5 }]
      const stati = []
      for (const zusatz of ungueltig) stati.push((await fetch(`${s.basis}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: 'x', auftragstext: 'y', ...zusatz }) })).status)
      pruefe(stati.every((st) => st === 400), '(u5) ungültige bereiche/budget_tokens ⇒ 400.', `(u5) Status je ungültigem Body: ${stati.join(',')}`)
      await s.schliesse()
    }
  }

  // ── (u6) Bereiche, aber Übersicht ohne Feld ⇒ nicht bestimmbar ───────────────────────────────
  {
    const s = await szenario('u6', { bereiche: ['src/'] }, { 'src/a.ts': 'export const a = 6\n' })
    if (s !== null && s.ausfuehrungLaufId !== null) {
      const { umfang: _weg, ...ohne } = uebersichtVon(s) ?? {}
      registriereKernArtefakt(`aenderungsuebersicht-${s.ausfuehrungLaufId}`, s.profilReferenz, { erzeuger: 'kern', schritt: 'gate-alt-artefakt' }, ohne, [], s.ladeOptionen)
      const abnahme = await (await fetch(`${s.basis}/api/workflows/${encodeURIComponent(s.workflowId)}/abnahme`)).json()
      pruefe(gleich(abnahme.umfang, { status: 'nicht_bestimmbar', ausserhalb: [] }), '(u6) Bereiche ohne festgehaltenes Feld ⇒ nicht_bestimmbar.', `(u6) abnahme.umfang ${JSON.stringify(abnahme.umfang)}`)
      await s.schliesse()
    } else if (s !== null) await s.schliesse()
  }

  // ── (e) Beispiel-Artefakt ─────────────────────────────────────────────────────────────────────
  {
    const beispiel = JSON.parse(readFileSync('schemas/examples/kontrollzustand-aenderungsuebersicht-payload.valid-umfang.json', 'utf8'))
    const kaputt = { ...beispiel, umfang: { bereiche: beispiel.umfang.bereiche } }
    pruefe(validiereAenderungsuebersichtDaten(beispiel).length === 0 && validiereAenderungsuebersichtDaten(kaputt).length > 0, '(e) Beispiel mit umfang gültig, ohne ausserhalb ungültig.', `(e) ${JSON.stringify(validiereAenderungsuebersichtDaten(beispiel))}`)
  }
} finally {
  for (const dienst of server) if (dienst.listening) await new Promise((resolve) => dienst.close(() => resolve()))
  for (const pfad of aufraeumen) raeumeVerzeichnis(pfad)
}

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e):`)
  for (const b of befunde) console.error(`  - ${b}`)
  process.exit(1)
}
console.log('\n✓ Keine Befunde.')
