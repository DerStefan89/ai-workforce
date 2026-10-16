#!/usr/bin/env node
/**
 * Datei: scripts/check-f45-b2b3c-budget.mjs
 *
 * Zweck: Gate für F45 B2b-3c „Budget je Arbeitspaket“ (F-981, features/F45/plan-b2b3c-v2.md mit Delta-Advisor-Auflage D1).
 * Nachweis am REALEN Aufrufpfad (Muster scripts/check-f45-b2b2-pruefer.mjs): echter HTTP-Testserver, echte Workflow- und
 * Auftragsartefakte, gestubbter Worker (fuehreAufgabeDurchFn) mit REAL registrierten Laufakten samt `verbrauch` — Nachlauf,
 * Korrekturautomatik, Prüfer-/Prüfung-Wiederholen, Start, Freigabe und GET-Projektionen lesen die Summe am echten Lesepfad.
 *
 * Prüft:
 * (b1) Budget überschritten nach dem Ausführungslauf ⇒ KLAERUNG_ERFORDERLICH mit Budget-Grund, Review startet nicht, Cursor
 *      auf dem Review; GET …/abnahme budget (Summe, Budget, Quelle, ueberschritten, erhoehbar); GET /api/workflows/<id>
 *      naechster = haltKlaerung. Vorher eine GET-Abfrage (D1: ein vor dem Lauf gespeicherter Stand verspätet den Halt nicht).
 * (b2) POST …/starten im Budget-Halt ⇒ 409 budgetErreicht, kein Lauf.
 * (b3) POST …/budget ⇒ neue Auftragsversion budget_tokens = Summe + Budget, naechster 'starte'; danach …/starten ⇒ Review
 *      läuft, ABGESCHLOSSEN, keine Kern-Abnahme (kein Rückweg); zweiter Aufruf 409; falscher Body 400.
 * (b4) Arbeitspaket ohne budget_tokens ⇒ Default der Kontrolltiefe (standard, fast-lane).
 * (b5) letzter Schritt über Budget ⇒ ABGESCHLOSSEN (kein Halt), ueberschritten true, erhoehbar false, POST …/budget 409.
 * (b6) Review beanstandet + qa startbereit + Budget überschritten ⇒ Halt mit Cursor auf dem qa, keine Kern-Abnahme (Advisor B1).
 * (b7) „Prüfer wiederholen“ im überschrittenen Budget ⇒ Budget-Halt statt Start; nach der Erhöhung läuft der Review.
 *      WARTET_FREIGABE mit überschrittenem Budget ⇒ Freigabe 409 ohne festgehaltene Entscheidung, erhoehbar, nach der
 *      Erhöhung Freigabe-Verdikt und Lauf (Advisor B2).
 * (b8) „Prüfung wiederholen“ GRÜN im überschrittenen Budget ⇒ Budget-Halt mit Cursor auf dem Review (Advisor B3).
 * (b9) Korrekturrunde bei überschrittenem Budget ⇒ Neubau zurückgesetzt, Halt mit Budget-Grund statt Freigabe-Frage; nach der
 *      Erhöhung grundVeraltet, Freigabe startet den Neubau, ABGESCHLOSSEN mit einer Kern-Version (kein zweiter Rückweg).
 * (k)  Liste = Detail im Budget-Halt (code-reviewer 1, qa Q1): GET /api/workflows meldet haltKlaerung (nicht starte bzw.
 *      haltFreigabe) — am Review (b1) und am Neubau (b9).
 * (b10) Summe genau gleich Budget ⇒ kein Halt, der Review läuft. (b11) Lauf ohne verbrauch ⇒ ohneMessung, nicht in der Summe.
 * (b12) POST …/budget auf unbekanntem Ablauf ⇒ 404.
 * (f)  Quelltext: starteWorkflowSchritt( 6×, Workflow-Schreiber 14 / .eingefroren 13 (F-228 unverändert).
 *
 * Wird aufgerufen von: `npm run check:gates` (und damit `npm run check`).
 *
 * Aufruf: node scripts/check-f45-b2b3c-budget.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { optionenAusAuftrag, registriereAuftrag } from '../src/auftrag/index.ts'
import { BUDGET_DEFAULTS } from '../src/budget/index.ts'
import { ladeArtefaktVersion, listeVersionen, registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { KEINE_BEFUNDE_SATZ } from '../src/review-policy/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { erzeugeRequestHandler } from './leitstand-server.mjs'

const befunde = []
console.log('\n=== F45-B2b-3c-Budget-Check ===\n')

const STILL = () => {}
const INSTALL_WURZEL = process.cwd()
const FEATURE_ID = 'F9992'
const AKTE = `# ${FEATURE_ID} — Gate-Feature B2b-3c

## Ziel
Ziel des Gate-Features B2b-3c.

## Akzeptanzkriterien
- Erstes Kriterium.
`
const AK_OK = [{ ak_id: 'AK1', urteil: 'ERFUELLT', beleg: 'src/beispiel.ts:1' }]
const befundV2 = (id, schwere) => ({ id, dimension: 'bugs', schwere, fundstelle: 'src/a.ts:3', zusammenfassung: `Gate-Befund ${id}.`, beleg: 'Synthetischer Beleg.', korrekturrichtung: 'Grenze korrigieren.', evidenz: 'confirmed' })
const review = (urteil, liste) => ({ ausgang: 'ERFOLGREICH', text: JSON.stringify({ urteil, befunde: liste, empfehlung: liste.length === 0 ? `${KEINE_BEFUNDE_SATZ}.` : 'Gate.', ak_urteile: AK_OK }) })
const BEREIT = review('BEREIT', [])
const FEHLSCHLAG = { ausgang: 'FEHLGESCHLAGEN', text: 'Werkzeug ausgefallen.' }
const TESTFALL = { name: 'AK1 Grundfall', schritte: ['Aufruf'], erwartet: 'wie im AK', ergebnis: 'bestanden' }
const qa = (urteil) => ({ ausgang: 'ERFOLGREICH', text: JSON.stringify({ urteil, befunde: [], testfaelle: [TESTFALL], empfehlung: 'Gate.' }) })

function git(wurzel, argumente) {
  return execFileSync('git', argumente, { cwd: wurzel, encoding: 'utf8' })
}

/** Wegwerf-Fremdprojekt mit nur features/<id>/feature.md (Muster check-f45-b2b2). @returns Pfad */
function baueFremdprojekt() {
  const wurzel = mkdtempSync(join(tmpdir(), 'check-f45-b2b3c-fremd-'))
  git(wurzel, ['init', '--quiet'])
  git(wurzel, ['config', 'user.email', 'test@example.invalid'])
  git(wurzel, ['config', 'user.name', 'Test'])
  git(wurzel, ['branch', '-m', 'wegwerf-branch'])
  mkdirSync(join(wurzel, 'features', FEATURE_ID), { recursive: true })
  writeFileSync(join(wurzel, 'features', FEATURE_ID, 'feature.md'), AKTE, 'utf8')
  git(wurzel, ['add', '.'])
  git(wurzel, ['commit', '--quiet', '-m', 'init'])
  return wurzel
}

const verzoegerung = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Pollt bis pruefen() einen Wert liefert oder die Zeit abläuft. @returns letzter Wert */
async function warteBis(pruefen, maxMs) {
  const start = Date.now()
  let wert = await pruefen()
  while (!wert && Date.now() - start < maxMs) {
    await verzoegerung(50)
    wert = await pruefen()
  }
  return wert
}

const basisVerzeichnis = `kontrollzustand-test-f45-b2b3c-${randomUUID()}`
raeumeVerzeichnis(basisVerzeichnis)
const ladeOptionen = { basisVerzeichnis, schreiber: STILL }
const fremdprojekt = baueFremdprojekt()
const verzeichnis = mkdtempSync(join(tmpdir(), 'check-f45-b2b3c-'))
// (b8): die Prüfung ist ROT, solange die Markerdatei existiert, und löscht sie dabei — der nächste Aufruf ist GRÜN.
const markerPfad = join(verzeichnis, 'rot.txt')
const startvorlagePfad = join(verzeichnis, 'startvorlage.json')
writeFileSync(
  startvorlagePfad,
  JSON.stringify(
    {
      ...ladeStartvorlage('startvorlagen/beispielprojekt.json'),
      worker: { codex: { startziel: [String.raw`C:\f45b2b3c-gate-dummy\codex.exe`], versionDeklariert: 'codex-cli-gate-fixture', sandbox: 'read-only' } },
      pruefbefehl: [process.execPath, '-e', `const fs=require('node:fs'); const m=${JSON.stringify(markerPfad)}; if (fs.existsSync(m)) { fs.unlinkSync(m); console.error('FEHLER: Gate-B2b-3c rot'); process.exit(1) } process.exit(0)`],
      pruefZeitgrenzeMs: 10000,
    },
    null,
    2
  )
)
const vorlage = ladeStartvorlage(startvorlagePfad)
const profilReferenz = leiteProfilReferenzAb(vorlage)

// Je Workflow eine Warteschlange von Review-/qa-Ausgängen und je Rolle eine von Token-Mengen (Standard 100).
const reviewAusgaenge = new Map()
const qaAusgaenge = new Map()
const tokenPlan = new Map()
const laeufe = []
const aktiv = { workflowId: null }

/** Verbrauch in der Form der Laufakte (F32 WS-1) — alles als input_tokens. @param tokens - Summe @returns verbrauch */
const verbrauch = (tokens) => ({ input_tokens: tokens, output_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0, dauer_ms: 1, dauer_api_ms: null, turns: null, quelle: 'claude-code' })

/** Attrappe des Workers: jede Rolle bekommt eine echte Laufakte mit verbrauch und Rohstrom (claude-code-Format). */
async function attrappe(laufId, _profil, eingaben) {
  const workflowId = aktiv.workflowId
  const rolle = eingaben.rolle
  laeufe.push({ laufId, rolle, workflowId })
  // Plan je Kurzname (bau/review/qa) — keine Rollennamen als Objektschlüssel (Gate f17 AK1).
  const kurz = rolle === 'ausfuehrung' ? 'bau' : rolle === 'code-reviewer' ? 'review' : rolle
  const geplant = tokenPlan.get(workflowId)?.[kurz]?.shift()
  const tokens = geplant === undefined ? 100 : geplant
  const ausgang =
    rolle === 'code-reviewer' || rolle === 'qa'
      ? ((rolle === 'qa' ? qaAusgaenge : reviewAusgaenge).get(workflowId)?.shift() ?? { ausgang: 'ERFOLGREICH', text: 'kein Ausgang hinterlegt' })
      : { ausgang: 'ERFOLGREICH', text: 'Bau erledigt.' }
  mkdirSync(basisVerzeichnis, { recursive: true })
  const rohstromPfad = join(basisVerzeichnis, `${laufId}-rohstrom.json`)
  writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: ausgang.text }) }), 'utf8')
  // tokens null ⇒ Laufakte ohne verbrauch (Lauf ohne Messung, b11).
  const laufakte = { worker: eingaben.worker ?? 'claude-code', rohstrom_referenz: { pfad: rohstromPfad }, ...(tokens !== null ? { verbrauch: verbrauch(tokens) } : {}), ...(eingaben.review !== undefined ? { review: eingaben.review } : {}) }
  registriereKernArtefakt(`laufakte-${laufId}`, profilReferenz, { erzeuger: 'check-f45-b2b3c-fake' }, laufakte, undefined, ladeOptionen)
  if (ausgang.ausgang === 'FEHLGESCHLAGEN') return { ok: true, klassifikation: { ergebnis: 'FEHLGESCHLAGEN', grund: 'werkzeugausfall' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'FEHLGESCHLAGEN' } }
  return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
}

const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, fuehreAufgabeDurchFn: attrappe, repoWurzel: fremdprojekt, installWurzel: INSTALL_WURZEL, startvorlagePfad }))
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const basisUrl = `http://127.0.0.1:${server.address().port}`

const SCHRITT_AUSFUEHRUNG = {
  schritt_id: 'schritt-1-ausfuehrung',
  rolle: 'ausfuehrung',
  werkzeugsatz: 'schreibend',
  worker: 'claude-code',
  modell: 'claude-sonnet-5',
  eingaben: [],
  output_schema: null,
  freigabe: 'ZWINGEND',
  risiko: 'Gate-Fixture.',
  zeitgrenze_ms: 600000,
  nachfolger: 'schritt-2-review',
  status: 'OFFEN',
  lauf_id: null,
}
const SCHRITT_REVIEW = {
  schritt_id: 'schritt-2-review',
  rolle: 'code-reviewer',
  werkzeugsatz: 'lesend',
  worker: 'claude-code',
  modell: 'claude-sonnet-5',
  eingaben: [],
  output_schema: 'ergebnis-code-reviewer',
  freigabe: 'AUTOMATISCH',
  risiko: 'Gate-Fixture.',
  zeitgrenze_ms: 600000,
  nachfolger: null,
  status: 'OFFEN',
  lauf_id: null,
}
const SCHRITT_QA = { ...SCHRITT_REVIEW, schritt_id: 'schritt-3-qa', rolle: 'qa', eingaben: ['artefakt:ergebnis-@schritt-2-review'], output_schema: 'ergebnis-qa' }

/** Workflow-Daten in der Fixture-Form. @returns WORKFLOW_V0 */
function baueWorkflowDaten(workflowId, auftragId, schritte, ueberschreibung = {}) {
  return {
    workflow_schema: 'v0',
    workflow_id: workflowId,
    auftrag_id: auftragId,
    version: 1,
    ziel: 'Gate B2b-3c.',
    status: 'OFFEN',
    aktiver_schritt_id: 'schritt-1-ausfuehrung',
    grenzen: { max_schritte: 20, max_replans: 1 },
    schritte,
    ...ueberschreibung,
  }
}

/**
 * Legt Auftrag (über die Feature-Akte) und Workflow an, setzt optional budget_tokens (neue Auftragsversion) und hinterlegt
 * Ausgänge und Token-Mengen. art: 'standard' (Ausführung → Review), 'qa' (… → qa), 'fast-lane' (nur Ausführung).
 * @returns { workflowId, auftragId } oder null
 */
async function legeAn(kennung, { art = 'standard', budget, reviews = [], qas = [], tokens = {} } = {}) {
  const antwort = await fetch(`${basisUrl}/api/features/${encodeURIComponent(FEATURE_ID)}/auftrag`, { method: 'POST' })
  const koerper = await antwort.json().catch(() => ({}))
  if (antwort.status !== 201 || typeof koerper.auftragId !== 'string') {
    befunde.push(`(${kennung}) Vorbedingung POST …/auftrag: ${antwort.status} ${JSON.stringify(koerper)}`)
    return null
  }
  const auftragId = koerper.auftragId
  if (budget !== undefined) setzeBudget(auftragId, budget)
  const workflowId = `f45-b2b3c-${kennung}-${randomUUID()}`
  const schritte =
    art === 'fast-lane' ? [{ ...SCHRITT_AUSFUEHRUNG, nachfolger: null }] : art === 'qa' ? [SCHRITT_AUSFUEHRUNG, { ...SCHRITT_REVIEW, nachfolger: 'schritt-3-qa' }, SCHRITT_QA] : [SCHRITT_AUSFUEHRUNG, SCHRITT_REVIEW]
  registriereWorkflow(baueWorkflowDaten(workflowId, auftragId, schritte), profilReferenz, ladeOptionen)
  reviewAusgaenge.set(workflowId, [...reviews])
  qaAusgaenge.set(workflowId, [...qas])
  tokenPlan.set(workflowId, Object.fromEntries(Object.entries(tokens).map(([rolle, liste]) => [rolle, [...liste]])))
  return { workflowId, auftragId }
}

/** Neue Auftragsversion mit budget_tokens (wie ein Arbeitspaket mit eigenem Budget). */
function setzeBudget(auftragId, tokens) {
  const daten = ladeArtefaktVersion(`auftrag-${auftragId}`, undefined, ladeOptionen).daten
  registriereAuftrag(auftragId, profilReferenz, daten.titel, daten.auftragstext, { ...optionenAusAuftrag(daten), budget_tokens: tokens, basisVerzeichnis, schreiber: STILL })
}

const ladeWorkflow = (id) => ladeArtefaktVersion(`workflow-${id}`, undefined, ladeOptionen)?.daten ?? null
const ladeAuftrag = (id) => ladeArtefaktVersion(`auftrag-${id}`, undefined, ladeOptionen)?.daten ?? null
const kernAnzahl = (id) => listeVersionen(`entscheidung-workflow-${id}-abnahme`, ladeOptionen).filter((v) => v.herkunft?.erzeuger === 'kern').length
const laeufeVon = (id, rolle) => laeufe.filter((l) => l.workflowId === id && l.rolle === rolle)
const post = (pfad, koerper = {}) => fetch(`${basisUrl}${pfad}`, { method: 'POST', body: JSON.stringify(koerper) })
const holeAbnahme = async (id) => (await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(id)}/abnahme`)).json()
const holeDetail = async (id) => (await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(id)}`)).json()
/** Kopfdaten eines Ablaufs aus der Liste GET /api/workflows (dieselbe Quelle wie „Wartet auf dich“). */
const holeKopf = async (id) => {
  const liste = await (await fetch(`${basisUrl}/api/workflows`)).json()
  return (Array.isArray(liste) ? liste : (liste.workflows ?? [])).find((w) => w.workflowId === id) ?? null
}
const erhoehe = (id, koerper = { aktion: 'erhoehen' }) => post(`/api/workflows/${encodeURIComponent(id)}/budget`, koerper)
const istBudgetGrund = (grund) => typeof grund === 'string' && grund.startsWith('Budget erreicht: ')

/** Wartet, bis der Workflow nicht mehr läuft. @returns Workflow-Daten oder null */
async function warteAufHalt(workflowId) {
  return warteBis(() => {
    const daten = ladeWorkflow(workflowId)
    const laeuft = daten?.status === 'LAEUFT' || daten?.status === 'OFFEN' || daten?.schritte?.some((s) => s.status === 'LAEUFT')
    return daten !== null && !laeuft ? daten : null
  }, 6000)
}

/** Startet (POST …/starten) und wartet auf den Halt. @returns Workflow-Daten oder null */
async function starteUndWarte(kennung, workflowId) {
  aktiv.workflowId = workflowId
  const antwort = await post(`/api/workflows/${encodeURIComponent(workflowId)}/starten`)
  if (antwort.status !== 202) {
    befunde.push(`(${kennung}) Start erwartet 202, erhalten ${antwort.status}: ${await antwort.text()}`)
    return null
  }
  const daten = await warteAufHalt(workflowId)
  if (daten === null) befunde.push(`(${kennung}) kein Halt nach dem Start innerhalb der Wartezeit`)
  return daten
}

/** Gibt die Ausführung frei und wartet auf den Halt. @returns Workflow-Daten oder null */
async function gibFreiUndWarte(kennung, workflowId) {
  aktiv.workflowId = workflowId
  const antwort = await post(`/api/workflows/${encodeURIComponent(workflowId)}/freigabe`, { schrittId: 'schritt-1-ausfuehrung', entscheidung: 'FREIGEGEBEN', begruendung: `Gate (${kennung}).` })
  if (antwort.status !== 200 && antwort.status !== 202) {
    befunde.push(`(${kennung}) Freigabe erwartet 200/202, erhalten ${antwort.status}: ${await antwort.text()}`)
    return null
  }
  const daten = await warteAufHalt(workflowId)
  if (daten === null) befunde.push(`(${kennung}) kein Halt innerhalb der Wartezeit`)
  return daten
}

const pruefe = (bedingung, ok, fehler) => {
  if (bedingung) console.log(`✓ ${ok}`)
  else befunde.push(fehler)
}

try {
  // ── (b1)–(b3) Halt nach dem Bau, Start gesperrt, Erhöhung, Fortsetzung ───────────────────
  {
    const a = await legeAn('b1', { budget: 1000, reviews: [BEREIT], tokens: { bau: [1500] } })
    if (a) {
      const { workflowId: id, auftragId } = a
      // D1: eine Anzeige-Abfrage VOR dem Lauf darf den Halt nicht verspäten (Zwischenspeicher nur für GET).
      const vorher = await holeAbnahme(id)
      const daten = await gibFreiUndWarte('b1', id)
      if (daten) {
        const abnahme = await holeAbnahme(id)
        const detail = await holeDetail(id)
        const b = abnahme.budget ?? {}
        pruefe(
          vorher.budget?.summe === 0 &&
            daten.status === 'KLAERUNG_ERFORDERLICH' &&
            daten.aktiver_schritt_id === 'schritt-2-review' &&
            istBudgetGrund(daten.grund) &&
            daten.grund.includes('1.500 von 1.000 Tokens') &&
            laeufeVon(id, 'code-reviewer').length === 0 &&
            b.status === 'ok' &&
            b.summe === 1500 &&
            b.tokens === 1000 &&
            b.quelle === 'arbeitspaket' &&
            b.ueberschritten === true &&
            b.erhoehbar === true &&
            detail.naechster?.art === 'haltKlaerung' &&
            detail.budget?.ueberschritten === true &&
            abnahme.urteil?.status === 'noch_nicht_gelaufen',
          '(b1) Budget überschritten nach dem Bau ⇒ KLAERUNG_ERFORDERLICH „Budget erreicht: 1.500 von 1.000 Tokens“, Cursor auf dem Review, kein Review-Lauf; Abnahme und Detail zeigen den Halt (auch nach einer Abfrage vor dem Lauf).',
          `(b1) erwartet Budget-Halt — ${daten.status}/${daten.aktiver_schritt_id}/${daten.grund}; budget ${JSON.stringify(b)}; naechster ${JSON.stringify(detail.naechster)}; vorher ${JSON.stringify(vorher.budget)}; urteil ${JSON.stringify(abnahme.urteil)}`
        )

        const start = await post(`/api/workflows/${encodeURIComponent(id)}/starten`)
        const startKoerper = await start.json().catch(() => ({}))
        pruefe(
          start.status === 409 && startKoerper.art === 'budgetErreicht' && laeufeVon(id, 'code-reviewer').length === 0,
          '(b2) POST …/starten im Budget-Halt ⇒ 409 budgetErreicht, kein Lauf.',
          `(b2) Start im Budget-Halt — ${start.status} ${JSON.stringify(startKoerper)}`
        )
        const kopf = await holeKopf(id)
        pruefe(
          kopf?.naechster?.art === 'haltKlaerung' && kopf.naechster.art === detail.naechster?.art && b.halt === true && b.neu === 2500,
          '(k) Liste = Detail im Budget-Halt am Review: GET /api/workflows meldet haltKlaerung (nicht „starte“); Projektion halt, neues Budget 2500.',
          `(k) Liste ${JSON.stringify(kopf?.naechster)} gegen Detail ${JSON.stringify(detail.naechster)}, budget ${JSON.stringify(b)}`
        )

        const falsch = await erhoehe(id, { aktion: 'verdoppeln' })
        const erhoeht = await erhoehe(id)
        const erhoehtKoerper = await erhoeht.json().catch(() => ({}))
        const auftrag = ladeAuftrag(auftragId)
        pruefe(
          falsch.status === 400 && erhoeht.status === 200 && erhoehtKoerper.naechster === 'starte' && erhoehtKoerper.budget?.tokens === 2500 && erhoehtKoerper.budget?.ueberschritten === false && auftrag?.budget_tokens === 2500,
          '(b3) POST …/budget ⇒ 200, Auftragsversion budget_tokens 2500 (Summe + Budget), nächster Ausgang „starte“; falscher Body 400.',
          `(b3) Erhöhung — falsch ${falsch.status}, ${erhoeht.status} ${JSON.stringify(erhoehtKoerper)}, Auftrag ${auftrag?.budget_tokens}`
        )
        const ende = await starteUndWarte('b3', id)
        const zweite = await erhoehe(id)
        pruefe(
          ende?.status === 'ABGESCHLOSSEN' && laeufeVon(id, 'code-reviewer').length === 1 && kernAnzahl(id) === 0 && zweite.status === 409,
          '(b3) nach der Erhöhung: …/starten ⇒ Review läuft, ABGESCHLOSSEN, keine Kern-Abnahme (kein Rückweg); zweite Erhöhung 409.',
          `(b3) Fortsetzung — ${ende?.status}, Reviews ${laeufeVon(id, 'code-reviewer').length}, Kern ${kernAnzahl(id)}, zweite ${zweite.status}`
        )
      }
    }
  }

  // ── (b4) ohne budget_tokens ⇒ Default der Kontrolltiefe ────────────────────────────────
  {
    const a = await legeAn('b4', { reviews: [BEREIT] })
    const f = await legeAn('b4f', { art: 'fast-lane' })
    const daten = a && (await gibFreiUndWarte('b4', a.workflowId))
    const datenF = f && (await gibFreiUndWarte('b4f', f.workflowId))
    if (daten && datenF) {
      const b = (await holeAbnahme(a.workflowId)).budget ?? {}
      const bf = (await holeAbnahme(f.workflowId)).budget ?? {}
      pruefe(
        daten.status === 'ABGESCHLOSSEN' &&
          b.quelle === 'default' &&
          b.tokens === BUDGET_DEFAULTS.standard &&
          b.summe === 200 &&
          b.ueberschritten === false &&
          datenF.status === 'ABGESCHLOSSEN' &&
          bf.quelle === 'default' &&
          bf.tokens === BUDGET_DEFAULTS['fast-lane'],
        `(b4) ohne budget_tokens ⇒ Default (standard ${BUDGET_DEFAULTS.standard}, fast-lane ${BUDGET_DEFAULTS['fast-lane']}), Ablauf läuft durch.`,
        `(b4) Default — ${daten.status} ${JSON.stringify(b)}; fast-lane ${datenF.status} ${JSON.stringify(bf)}`
      )
    }
  }

  // ── (b5) letzter Schritt über Budget ⇒ kein Halt ───────────────────────────────────────
  {
    const a = await legeAn('b5', { budget: 1000, reviews: [BEREIT], tokens: { bau: [500], review: [800] } })
    const daten = a && (await gibFreiUndWarte('b5', a.workflowId))
    if (daten) {
      const b = (await holeAbnahme(a.workflowId)).budget ?? {}
      const erhoeht = await erhoehe(a.workflowId)
      pruefe(
        daten.status === 'ABGESCHLOSSEN' && b.ueberschritten === true && b.erhoehbar === false && erhoeht.status === 409,
        '(b5) Überschreitung im letzten Schritt ⇒ ABGESCHLOSSEN (fertig bleibt fertig), Abnahme zeigt überschritten, nicht erhöhbar (409).',
        `(b5) — ${daten.status} ${JSON.stringify(b)} Erhöhung ${erhoeht.status}`
      )
    }
  }

  // ── (b6) Review beanstandet + qa startbereit + Budget überschritten ⇒ Halt am qa, keine Runde ─
  {
    const a = await legeAn('b6', { art: 'qa', budget: 1000, reviews: [review('BLOCKIERT', [befundV2('B1', 'HOCH')])], qas: [qa('BEREIT')], tokens: { bau: [500], review: [800] } })
    const daten = a && (await gibFreiUndWarte('b6', a.workflowId))
    if (daten) {
      const qaProjektion = (await holeAbnahme(a.workflowId)).qaErgebnis
      pruefe(
        daten.status === 'KLAERUNG_ERFORDERLICH' &&
          daten.aktiver_schritt_id === 'schritt-3-qa' &&
          istBudgetGrund(daten.grund) &&
          kernAnzahl(a.workflowId) === 0 &&
          laeufeVon(a.workflowId, 'qa').length === 0 &&
          laeufeVon(a.workflowId, 'ausfuehrung').length === 1 &&
          qaProjektion?.halt === false,
        '(b6) Review beanstandet, qa startbereit, Budget überschritten ⇒ Budget-Halt mit Cursor auf dem qa, keine automatische Korrekturrunde (Advisor B1); die Abnahme ordnet den Halt nicht dem qa zu.',
        `(b6) — ${daten.status}/${daten.aktiver_schritt_id}/${daten.grund}, Kern ${kernAnzahl(a.workflowId)}, qa ${laeufeVon(a.workflowId, 'qa').length}, qaErgebnis ${JSON.stringify(qaProjektion)}`
      )
    }
  }

  // ── (b7) Prüfer wiederholen und WARTET_FREIGABE im überschrittenen Budget ───────────────
  {
    const a = await legeAn('b7', { budget: 1000, reviews: [FEHLSCHLAG, BEREIT], tokens: { bau: [500], review: [800] } })
    const daten = a && (await gibFreiUndWarte('b7', a.workflowId))
    if (daten) {
      const id = a.workflowId
      const vor = (await holeAbnahme(id)).budget ?? {}
      const zurueck = await post(`/api/workflows/${encodeURIComponent(id)}/pruefer-wiederholen`)
      const zurueckKoerper = await zurueck.json().catch(() => ({}))
      const nach = ladeWorkflow(id)
      const review = nach?.schritte?.find((s) => s.schritt_id === 'schritt-2-review')
      const b = (await holeAbnahme(id)).budget ?? {}
      pruefe(
        daten.status === 'KLAERUNG_ERFORDERLICH' &&
          vor.ueberschritten === true &&
          vor.erhoehbar === false &&
          zurueck.status === 200 &&
          zurueckKoerper.status === 'KLAERUNG_ERFORDERLICH' &&
          istBudgetGrund(zurueckKoerper.grund) &&
          review?.lauf_id === null &&
          nach.aktiver_schritt_id === 'schritt-2-review' &&
          laeufeVon(id, 'code-reviewer').length === 1 &&
          b.erhoehbar === true,
        '(b7) Review FEHLGESCHLAGEN über Budget: erst nicht erhöhbar (anderer Halt); „Prüfer wiederholen“ ⇒ zurückgesetzt, Budget-Halt statt Start, jetzt erhöhbar.',
        `(b7) — vor ${JSON.stringify(vor)}, ${zurueck.status} ${JSON.stringify(zurueckKoerper)}, review ${JSON.stringify(review)}, nach ${JSON.stringify(b)}`
      )
      const erhoeht = await erhoehe(id)
      const ende = erhoeht.status === 200 ? await starteUndWarte('b7', id) : null
      pruefe(ende?.status === 'ABGESCHLOSSEN' && laeufeVon(id, 'code-reviewer').length === 2, '(b7) nach der Erhöhung läuft der Review erneut, ABGESCHLOSSEN.', `(b7) Fortsetzung — ${erhoeht.status}, ${ende?.status}`)
    }
  }
  {
    // WARTET_FREIGABE mit überschrittenem Budget: v1 mit gelaufenem Bau (5000 Tokens), v2 zurückgesetzt auf die Freigabe.
    const a = await legeAn('b7w', { budget: 1000, reviews: [BEREIT] })
    if (a) {
      const id = a.workflowId
      const alterLauf = randomUUID()
      registriereKernArtefakt(`laufakte-${alterLauf}`, profilReferenz, { erzeuger: 'check-f45-b2b3c-fake' }, { worker: 'claude-code', verbrauch: verbrauch(5000) }, undefined, ladeOptionen)
      registriereWorkflow(
        baueWorkflowDaten(id, a.auftragId, [{ ...SCHRITT_AUSFUEHRUNG, status: 'ERFOLGREICH', lauf_id: alterLauf }, SCHRITT_REVIEW], { status: 'KLAERUNG_ERFORDERLICH' }),
        profilReferenz,
        ladeOptionen
      )
      registriereWorkflow(baueWorkflowDaten(id, a.auftragId, [SCHRITT_AUSFUEHRUNG, SCHRITT_REVIEW], { status: 'WARTET_FREIGABE' }), profilReferenz, ladeOptionen)
      const b = (await holeAbnahme(id)).budget ?? {}
      const detail = await holeDetail(id)
      aktiv.workflowId = id
      const freigabe = await post(`/api/workflows/${encodeURIComponent(id)}/freigabe`, { schrittId: 'schritt-1-ausfuehrung', entscheidung: 'FREIGEGEBEN', begruendung: 'Gate (b7w).' })
      const freigabeKoerper = await freigabe.json().catch(() => ({}))
      const festgehalten = listeVersionen(`entscheidung-workflow-${id}-schritt-1-ausfuehrung`, ladeOptionen).length
      const kopf = await holeKopf(id)
      pruefe(kopf?.naechster?.art === 'haltKlaerung', '(k) Liste bei WARTET_FREIGABE über Budget: haltKlaerung (keine Freigabe ohne Freigabe-Karte).', `(k) Liste b7w — ${JSON.stringify(kopf?.naechster)}`)
      pruefe(
        b.ueberschritten === true && b.erhoehbar === true && detail.naechster?.art === 'haltKlaerung' && freigabe.status === 409 && freigabeKoerper.art === 'budgetErreicht' && festgehalten === 0 && laeufeVon(id, 'ausfuehrung').length === 0,
        '(b7) WARTET_FREIGABE über Budget ⇒ erhöhbar, Verdikt Budget-Halt, Freigabe 409 ohne festgehaltene Entscheidung.',
        `(b7w) — ${JSON.stringify(b)}, naechster ${JSON.stringify(detail.naechster)}, Freigabe ${freigabe.status} ${JSON.stringify(freigabeKoerper)}, festgehalten ${festgehalten}`
      )
      const erhoeht = await erhoehe(id)
      const erhoehtKoerper = await erhoeht.json().catch(() => ({}))
      const detailNach = await holeDetail(id)
      const ende = erhoeht.status === 200 ? await gibFreiUndWarte('b7w', id) : null
      pruefe(
        erhoehtKoerper.naechster === 'haltFreigabe' && detailNach.naechster?.art === 'haltFreigabe' && ende?.status === 'ABGESCHLOSSEN',
        '(b7) nach der Erhöhung: Verdikt wieder Freigabe (die Freigabe-Karte erscheint), Freigabe startet den Bau, ABGESCHLOSSEN.',
        `(b7w) Fortsetzung — ${erhoeht.status} ${JSON.stringify(erhoehtKoerper)}, naechster ${JSON.stringify(detailNach.naechster)}, ${ende?.status}`
      )
    }
  }

  // ── (b8) Prüfung wiederholen GRÜN im überschrittenen Budget ⇒ Budget-Halt am Review ───────
  {
    const a = await legeAn('b8', { budget: 1000, reviews: [BEREIT], tokens: { bau: [1500] } })
    if (a) {
      writeFileSync(markerPfad, 'rot', 'utf8')
      const id = a.workflowId
      const daten = await gibFreiUndWarte('b8', id)
      if (daten) {
        const rotHalt = daten.status === 'KLAERUNG_ERFORDERLICH' && daten.aktiver_schritt_id === 'schritt-1-ausfuehrung' && !istBudgetGrund(daten.grund) && !existsSync(markerPfad)
        const antwort = await post(`/api/workflows/${encodeURIComponent(id)}/pruefung-wiederholen`)
        const koerper = await antwort.json().catch(() => ({}))
        const nach = ladeWorkflow(id)
        pruefe(
          rotHalt && antwort.status === 200 && koerper.pruefergebnis === 'GRUEN' && nach?.status === 'KLAERUNG_ERFORDERLICH' && nach.aktiver_schritt_id === 'schritt-2-review' && istBudgetGrund(nach.grund) && laeufeVon(id, 'code-reviewer').length === 0,
          '(b8) Prüfung ROT (Halt), „Prüfung wiederholen“ GRÜN über Budget ⇒ Budget-Halt mit Cursor auf dem Review (Advisor B3), kein Review-Lauf.',
          `(b8) — rotHalt ${rotHalt} (${daten.status}/${daten.aktiver_schritt_id}), ${antwort.status} ${JSON.stringify(koerper)}, nach ${nach?.status}/${nach?.aktiver_schritt_id}/${nach?.grund}`
        )
        const erhoeht = await erhoehe(id)
        const ende = erhoeht.status === 200 ? await starteUndWarte('b8', id) : null
        pruefe(ende?.status === 'ABGESCHLOSSEN', '(b8) nach der Erhöhung startet der Review, ABGESCHLOSSEN.', `(b8) Fortsetzung — ${erhoeht.status}, ${ende?.status}`)
      }
    }
  }

  // ── (b9) Korrekturrunde bei überschrittenem Budget ⇒ Halt am Neubau ───────────────────
  {
    const a = await legeAn('b9', { budget: 1000, reviews: [review('BLOCKIERT', [befundV2('B1', 'HOCH')])], tokens: { bau: [500], review: [600] } })
    const daten = a && (await gibFreiUndWarte('b9', a.workflowId))
    if (daten) {
      const id = a.workflowId
      const nach = (await warteBis(() => (kernAnzahl(id) === 1 ? ladeWorkflow(id) : null), 3000)) ?? ladeWorkflow(id)
      const bau = nach?.schritte?.find((s) => s.schritt_id === 'schritt-1-ausfuehrung')
      const detail = await holeDetail(id)
      pruefe(
        kernAnzahl(id) === 1 && nach?.status === 'KLAERUNG_ERFORDERLICH' && nach.aktiver_schritt_id === 'schritt-1-ausfuehrung' && bau?.lauf_id === null && istBudgetGrund(nach.grund) && detail.naechster?.art === 'haltKlaerung',
        '(b9) Korrekturrunde über Budget ⇒ Neubau zurückgesetzt, Budget-Halt statt Freigabe-Frage, Verdikt Budget-Halt.',
        `(b9) — Kern ${kernAnzahl(id)}, ${nach?.status}/${nach?.aktiver_schritt_id}/${nach?.grund}, naechster ${JSON.stringify(detail.naechster)}`
      )
      const kopf = await holeKopf(id)
      pruefe(kopf?.naechster?.art === 'haltKlaerung', '(k) Liste im Budget-Halt am Neubau: haltKlaerung (nicht „Freigabe“).', `(k) Liste am Neubau — ${JSON.stringify(kopf?.naechster)}`)
      const erhoeht = await erhoehe(id)
      const erhoehtKoerper = await erhoeht.json().catch(() => ({}))
      const detailNach = await holeDetail(id)
      const kopfNach = await holeKopf(id)
      pruefe(
        kopfNach?.naechster?.art === 'haltFreigabe',
        '(k) nach der Erhöhung meldet auch die Liste die Freigabe (Kopfdaten-Cache verworfen, code-reviewer-Nachpass 1).',
        `(k) Liste nach der Erhöhung — ${JSON.stringify(kopfNach?.naechster)}`
      )
      pruefe(
        erhoeht.status === 200 && erhoehtKoerper.naechster === 'haltFreigabe' && detailNach.naechster?.art === 'haltFreigabe' && detailNach.budget?.grundVeraltet === true && detailNach.budget?.halt === false,
        '(b9) nach der Erhöhung wartet der Neubau auf die Freigabe; der gespeicherte Grund gilt als veraltet (keine Reparatur-Notiz).',
        `(b9) Erhöhung — ${erhoeht.status} ${JSON.stringify(erhoehtKoerper)}, Detail ${JSON.stringify(detailNach.naechster)} ${JSON.stringify(detailNach.budget)}`
      )
      reviewAusgaenge.set(id, [BEREIT])
      const ende = await gibFreiUndWarte('b9', id)
      pruefe(
        ende?.status === 'ABGESCHLOSSEN' && kernAnzahl(id) === 1 && laeufeVon(id, 'ausfuehrung').length === 2,
        '(b9) Freigabe nach der Erhöhung ⇒ Neubau läuft, ABGESCHLOSSEN, weiter genau eine Kern-Version (die Erhöhung zählt nicht als Rückweg).',
        `(b9) Fortsetzung — ${ende?.status}, Kern ${kernAnzahl(id)}, Bauten ${laeufeVon(id, 'ausfuehrung').length}`
      )
    }
  }

  // ── (b10) Summe genau gleich Budget ⇒ kein Halt ────────────────────────────────────────
  {
    const a = await legeAn('b10', { budget: 1000, reviews: [BEREIT], tokens: { bau: [1000] } })
    const daten = a && (await gibFreiUndWarte('b10', a.workflowId))
    if (daten) {
      pruefe(daten.status === 'ABGESCHLOSSEN' && laeufeVon(a.workflowId, 'code-reviewer').length === 1, '(b10) Summe = Budget nach dem Bau ⇒ kein Halt, der Review läuft.', `(b10) — ${daten.status}/${daten.grund}`)
    }
  }

  // ── (b11) Lauf ohne verbrauch ⇒ ohneMessung ─────────────────────────────────────────────
  {
    const a = await legeAn('b11', { budget: 1000, reviews: [BEREIT], tokens: { bau: [null], review: [300] } })
    const daten = a && (await gibFreiUndWarte('b11', a.workflowId))
    if (daten) {
      const b = (await holeAbnahme(a.workflowId)).budget ?? {}
      pruefe(daten.status === 'ABGESCHLOSSEN' && b.summe === 300 && b.gemessen === 1 && b.ohneMessung === 1, '(b11) Lauf ohne verbrauch ⇒ ohneMessung 1, nicht in der Summe (nie geschätzt).', `(b11) — ${daten.status} ${JSON.stringify(b)}`)
    }
  }

  // ── (b12) POST …/budget auf unbekanntem Ablauf ⇒ 404 ───────────────────────────────────
  {
    const antwort = await erhoehe(`gibt-es-nicht-${randomUUID()}`)
    pruefe(antwort.status === 404, '(b12) POST …/budget auf unbekanntem Ablauf ⇒ 404.', `(b12) — ${antwort.status}`)
  }

  // ── (f) Quelltext-Invarianten ───────────────────────────────────────────────────────────
  {
    const quelltext = readFileSync('scripts/leitstand-server.mjs', 'utf8')
    const starts = quelltext.split('starteWorkflowSchritt(').length - 1
    const schreiber = quelltext.split(`${'schreibeWorkflow'}${'Fortschritt'}(`).length - 1
    const gelesen = quelltext.split(`.${'eingefroren'}`).length - 1
    pruefe(starts === 6 && schreiber === 14 && gelesen === 13, '(f) starteWorkflowSchritt( 6×, Workflow-Schreiber 14 / GESTOPPT-Schutz 13 (F-228 unverändert).', `(f) Zählungen ${starts} / ${schreiber} / ${gelesen} (erwartet 6 / 14 / 13)`)
  }
} finally {
  await new Promise((resolve) => server.close(resolve))
  raeumeVerzeichnis(basisVerzeichnis)
  raeumeVerzeichnis(fremdprojekt)
  raeumeVerzeichnis(verzeichnis)
}

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e):`)
  for (const b of befunde) console.error(`  - ${b}`)
  process.exit(1)
}
console.log('\n✓ Keine Befunde.')
