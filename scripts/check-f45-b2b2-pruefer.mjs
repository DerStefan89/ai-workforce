#!/usr/bin/env node
/**
 * Datei: scripts/check-f45-b2b2-pruefer.mjs
 *
 * Zweck: Gate für F45 B2b-2a „Review vollständig“ (features/F45/plan-b2b2a.md, Plan v2 + Entscheidung Stefan A1 = a) und
 * F45 B2b-2b-1 „qa-Schritt, Kern“ (features/F45/plan-b2b2b.md, Plan v2.1; Fixture-Abläufe mit qa-Schritt, Vorlagen erst 2b-2).
 * Nachweis am REALEN Aufrufpfad (Muster scripts/check-f45-b2b1-rueckweg.mjs): echter HTTP-Testserver, echte
 * Workflow-Artefakte, gestubbter Worker (fuehreAufgabeDurchFn) mit REAL registrierten Laufakten — Automat,
 * Rückweg-Automatik, Korrekturschleife und GET …/abnahme lesen Urteil und Befunde am tatsächlichen Lesepfad; kein Netz.
 *
 * Prüft:
 * (s0) schemas/ergebnis-code-reviewer.schema.json entspricht der im Spike B2b-2a an claude-code real belegten Fassung
 *      (SHA-256 in features/F45/nachweise/b2b2a/spike-reviewer-schema.md) — ein geändertes Schema braucht einen neuen Lauf.
 * (k1) F-1085 (3): Review BLOCKIERT mit Befund v2 → automatischer Rückweg → der Auftragstext des Neubaus nennt Befund-ID,
 *      Evidenz und Korrekturrichtung — die Korrekturrichtung genau einmal (A1 = a: nicht zusätzlich aus der Begründung);
 *      der Re-Review-Auftrag nennt sie ebenfalls.
 * (k2) Befund v1 (ohne die Felder) → Rückweg läuft, Neubau-Auftrag mit der Befundzeile, ohne „Befund-ID“/„Korrekturrichtung:“.
 * (h1) F-1085 (4): BEREIT mit einem HOCH-Befund → ABGESCHLOSSEN; GET …/abnahme urteil.schwere_bei_bereit 1; keine
 *      Abnahme-Version (kein Neubau), genau ein Ausführungslauf. (h2) BEREIT ohne Befunde → 0.
 * (h3) Mensch-Pfad (qa 3): BEREIT mit HOCH → POST …/abnahme ANPASSUNG_ANGEFORDERT → Neubau mit Befund-ID und
 *      Korrekturrichtung (einmal), Re-Review mit B1; danach BEREIT ohne Befunde → 0.
 * (h4) qa 2: der Hinweis gilt nur bei offener Abnahme — nach ANGENOMMEN schwere_bei_bereit 0.
 * (r1) F-1085 (2): Review-Schritt claude-code mit output_schema 'ergebnis-code-reviewer' startet ohne Regel-4b-Klärung;
 *      der Lauf trägt aufrufEingaben.jsonSchema (ohne $schema/$id); GET …/abnahme zeigt Urteil und Befunde, worker
 *      'claude-code' (aus der Laufakte); der Codex-Review aus (h1) zeigt worker 'codex'.
 * (r2) claude-code-Reviewer BLOCKIERT → derselbe automatische Rückweg wie bei Codex.
 * (r3) claude-code-Reviewer FEHLGESCHLAGEN → GET …/abnahme reviewWiederholbar true, POST …/pruefer-wiederholen 200.
 * (g1) Gegenprobe: claude-code mit dem nicht belegten 'ergebnis-architektur' → KLAERUNG_ERFORDERLICH (Regel 4b), kein Lauf;
 *      zweite Sicherung loeseAusfuehrungsEingabenAuf lehnt ab, der Reviewer mit Schema bekommt jsonSchema.
 * (f)  Quelltext: starteWorkflowSchritt( genau 6-mal im Server (wie f45-b2a3/b2a3b).
 * B2b-2b-1 (Ablauf Ausführung → Review → qa, qa claude-code mit 'ergebnis-qa'):
 * (s1) schemas/ergebnis-qa.schema.json = Spike-Fassung (SHA-256 in features/F45/nachweise/b2b2b/spike-qa-schema.md).
 * (q1) Review und qa BEREIT ⇒ ABGESCHLOSSEN; Läufe in der Reihenfolge Ausführung, Review, qa; der qa mit jsonSchema und
 *      Rolleninstruktion samt AK des Auftrags.
 * (q2) qa BLOCKIERT ⇒ eine Korrekturrunde, bezug.qa_lauf_id; Neubau mit dem qa-Abschnitt (Herkunft) und Q1, ohne
 *      Review-Abschnitt; der qa der neuen Runde mit seinen Vorbefunden.
 * (q3) Review BLOCKIERT und qa BLOCKIERT ⇒ der qa läuft trotzdem, genau eine Runde, Neubau mit beiden Abschnitten.
 * (q4) zweite Runde wieder beanstandet ⇒ keine zweite Kern-Version, Halt am qa mit dem Grenz-Grund.
 * (q5) qa mit Schemaverstoß ⇒ Halt am qa, POST …/pruefer-wiederholen 200, qa zurückgesetzt, keine Runde; nach dem Start
 *      läuft der qa erneut und der Ablauf endet ABGESCHLOSSEN (qa-Prüfpass 4a).
 * (q6) Advisor A1: Review BLOCKIERT ohne Befunde und ohne Pflichtsatz (Regel 1k) ⇒ der qa läuft, die Runde löst aus.
 * (q8) qa FEHLGESCHLAGEN nach beanstandetem Review ⇒ Halt nennt die Beanstandung, wiederholbar; nach Wiederholung und Start
 *      entscheidet die Runde über beide Prüfer (eine Kern-Version, Neubau mit dem Review-Befund).
 * (q11) zweite Runde mit denselben Befunden ⇒ Wiederholungs-Grund über beide Prüfer (Lesepfad der Vorrunde im Server).
 * (q9) Review BEREIT mit AK-Verstoß, qa BEREIT ⇒ der qa läuft, eine Runde, der Neubau nennt das verletzte AK.
 * (q10) Mensch-Pfad: qa BLOCKIERT bei max_replans 0 ⇒ Halt am qa; „Anpassung wünschen“ ⇒ bezug.qa_lauf_id, Neubau mit Q1.
 *
 * Wird aufgerufen von: `npm run check`.
 *
 * Aufruf: node scripts/check-f45-b2b2-pruefer.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ladeArtefaktVersion, listeVersionen, registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { KEINE_BEFUNDE_SATZ } from '../src/review-policy/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { erzeugeRequestHandler, loeseAusfuehrungsEingabenAuf } from './leitstand-server.mjs'

const befunde = []
console.log('\n=== F45-B2b-2-Prüfer-Check (2a Review, 2b-1 qa) ===\n')

const STILL = () => {}
const INSTALL_WURZEL = process.cwd()
const FEATURE_ID = 'F9993'
const SPIKE_SHA256 = 'c2c3a498f2cbc3356cbec745adef00bb6eaea5f4c1dd7016382fcc5e16518bd2'
const SPIKE_QA_SHA256 = '37749f8d6242f80f094da0b81c37f098dbbc7167637efa3e760445ff7ab9e6f6'
const AKTE = `# ${FEATURE_ID} — Gate-Feature B2b-2a

## Ziel
Ziel des Gate-Features B2b-2a.

## Akzeptanzkriterien
- Erstes Kriterium.
`
const AK_OK = [{ ak_id: 'AK1', urteil: 'ERFUELLT', beleg: 'src/beispiel.ts:1' }]
const KORREKTUR = 'Grenze in src/a.ts:3 auf < length setzen.'
const befundV2 = (id, schwere) => ({ id, dimension: 'bugs', schwere, fundstelle: 'src/a.ts:3', zusammenfassung: `Gate-Befund ${id}.`, beleg: 'Synthetischer Beleg.', korrekturrichtung: KORREKTUR, evidenz: 'confirmed' })
const BEFUND_V1 = { schwere: 'MITTEL', fundstelle: 'src/b.ts:7', zusammenfassung: 'Gate-Befund v1.', beleg: 'Synthetischer Beleg.' }
const review = (urteil, liste) => ({ ausgang: 'ERFOLGREICH', text: JSON.stringify({ urteil, befunde: liste, empfehlung: liste.length === 0 ? `${KEINE_BEFUNDE_SATZ}.` : 'Gate.', ak_urteile: AK_OK }) })
const FEHLSCHLAG = { ausgang: 'FEHLGESCHLAGEN', text: 'Werkzeug ausgefallen.' }
const AK_VERLETZT = [{ ak_id: 'AK1', urteil: 'NICHT_ERFUELLT', beleg: 'src/beispiel.ts:1' }]
const befundQa = (id, schwere, fundstelle = 'src/liste.ts:8') => ({ id, schwere, evidenz: 'confirmed', fundstelle, zusammenfassung: `qa-Befund ${id}.`, korrekturrichtung: `Korrektur ${id}.`, beleg: 'Durchgespielt.' })
const TESTFALL = { name: 'AK1 Grundfall', schritte: ['Aufruf mit Beispiel'], erwartet: 'Ergebnis wie im AK', ergebnis: 'bestanden' }
const qa = (urteil, liste, testfaelle = [TESTFALL]) => ({ ausgang: 'ERFOLGREICH', text: JSON.stringify({ urteil, befunde: liste, testfaelle, empfehlung: 'Gate.' }) })

function git(wurzel, argumente) {
  return execFileSync('git', argumente, { cwd: wurzel, encoding: 'utf8' })
}

/** Wegwerf-Fremdprojekt mit nur features/<id>/feature.md (Muster check-f45-b2b1). @returns Pfad */
function baueFremdprojekt() {
  const wurzel = mkdtempSync(join(tmpdir(), 'check-f45-b2b2-fremd-'))
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

const basisVerzeichnis = `kontrollzustand-test-f45-b2b2-${randomUUID()}`
raeumeVerzeichnis(basisVerzeichnis)
const ladeOptionen = { basisVerzeichnis, schreiber: STILL }
const fremdprojekt = baueFremdprojekt()
const verzeichnis = mkdtempSync(join(tmpdir(), 'check-f45-b2b2-'))
const startvorlagePfad = join(verzeichnis, 'startvorlage.json')
writeFileSync(
  startvorlagePfad,
  JSON.stringify({ ...ladeStartvorlage('startvorlagen/beispielprojekt.json'), worker: { codex: { startziel: [String.raw`C:\f45b2b2-gate-dummy\codex.exe`], versionDeklariert: 'codex-cli-gate-fixture', sandbox: 'read-only' } } }, null, 2)
)
const vorlage = ladeStartvorlage(startvorlagePfad)
const profilReferenz = leiteProfilReferenzAb(vorlage)

// Je Workflow eine Warteschlange von Review- bzw. qa-Ausgängen; die Attrappe nimmt je Lauf den nächsten.
const reviewAusgaenge = new Map()
const qaAusgaenge = new Map()
const laeufe = [] // { workflowId, laufId, rolle, worker, aufrufEingaben, auftragstext }
const aktiv = { workflowId: null }

/**
 * Rohstrom im Format des Workers: Codex als '--json'-Ereignisse mit letzter agent_message (Muster check-f15-automat-real),
 * claude-code als result-Zeile — gelesen wird nach laufakte.worker (leseErgebnistextAusRohstrom).
 * @param worker - 'codex' | 'claude-code'
 * @param text - Ergebnistext
 * @returns stdout-Text
 */
function rohstromStdout(worker, text) {
  if (worker === 'codex') {
    return [JSON.stringify({ type: 'turn.started' }), JSON.stringify({ type: 'item.completed', item: { id: 'item_0', type: 'agent_message', text } }), JSON.stringify({ type: 'turn.completed' })].join('\n')
  }
  return JSON.stringify({ type: 'result', result: text })
}

/** Attrappe des Workers: jede Rolle wird gezählt; Review-Läufe bekommen eine echte Laufakte mit Rohstrom ihres Workers. */
async function attrappe(laufId, _profil, eingaben) {
  const workflowId = aktiv.workflowId
  const worker = eingaben.worker ?? 'claude-code'
  laeufe.push({ laufId, rolle: eingaben.rolle, worker, workflowId, aufrufEingaben: eingaben.aufrufEingaben, auftragstext: eingaben.auftragstext })
  if (eingaben.rolle !== 'code-reviewer' && eingaben.rolle !== 'qa') return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  const ausgang = (eingaben.rolle === 'qa' ? qaAusgaenge : reviewAusgaenge).get(workflowId)?.shift() ?? { ausgang: 'ERFOLGREICH', text: 'kein Ausgang hinterlegt' }
  mkdirSync(basisVerzeichnis, { recursive: true })
  const rohstromPfad = join(basisVerzeichnis, `${laufId}-rohstrom.json`)
  writeFileSync(rohstromPfad, JSON.stringify({ stdout: rohstromStdout(worker, ausgang.text) }), 'utf8')
  // review (Policy-Version) wie die Gateways in die Laufakte spiegeln — sonst prüfte Regel 1k nichts.
  const laufakte = { worker, rohstrom_referenz: { pfad: rohstromPfad }, ...(eingaben.review !== undefined ? { review: eingaben.review } : {}) }
  registriereKernArtefakt(`laufakte-${laufId}`, profilReferenz, { erzeuger: 'check-f45-b2b2-fake' }, laufakte, undefined, ladeOptionen)
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
const SCHRITT_REVIEW_CODEX = {
  schritt_id: 'schritt-2-review',
  rolle: 'code-reviewer',
  werkzeugsatz: 'lesend',
  worker: 'codex',
  modell: 'gpt-6-astra',
  eingaben: [],
  output_schema: 'ergebnis-code-reviewer',
  freigabe: 'AUTOMATISCH',
  risiko: 'Gate-Fixture.',
  zeitgrenze_ms: 600000,
  nachfolger: null,
  status: 'OFFEN',
  lauf_id: null,
}
const SCHRITT_REVIEW_CLAUDE = { ...SCHRITT_REVIEW_CODEX, worker: 'claude-code', modell: 'claude-sonnet-5' }
// B2b-2b-1: qa-Schritt hinter dem Review (Form der künftigen Vorlage standard, 2b-2).
const SCHRITT_QA = {
  ...SCHRITT_REVIEW_CODEX,
  schritt_id: 'schritt-3-qa',
  rolle: 'qa',
  worker: 'claude-code',
  modell: 'claude-sonnet-5',
  eingaben: ['artefakt:ergebnis-@schritt-2-review'],
  output_schema: 'ergebnis-qa',
}

/** Legt Auftrag und Workflow an und hinterlegt die Review-Ausgänge. @returns workflowId oder null */
async function legeAn(kennung, ausgaenge, review = SCHRITT_REVIEW_CODEX, mitQa = null) {
  const antwort = await fetch(`${basisUrl}/api/features/${encodeURIComponent(FEATURE_ID)}/auftrag`, { method: 'POST' })
  const koerper = await antwort.json().catch(() => ({}))
  if (antwort.status !== 201 || typeof koerper.auftragId !== 'string') {
    befunde.push(`(${kennung}) Vorbedingung POST …/auftrag: ${antwort.status} ${JSON.stringify(koerper)}`)
    return null
  }
  const workflowId = `f45-b2b2-${kennung}-${randomUUID()}`
  registriereWorkflow(
    {
      workflow_schema: 'v0',
      workflow_id: workflowId,
      auftrag_id: koerper.auftragId,
      version: 1,
      ziel: 'Gate B2b-2a.',
      status: 'OFFEN',
      aktiver_schritt_id: 'schritt-1-ausfuehrung',
      grenzen: { max_schritte: 20, max_replans: mitQa?.maxReplans ?? 1 },
      schritte: mitQa === null ? [SCHRITT_AUSFUEHRUNG, review] : [SCHRITT_AUSFUEHRUNG, { ...review, nachfolger: 'schritt-3-qa' }, SCHRITT_QA],
    },
    profilReferenz,
    ladeOptionen
  )
  reviewAusgaenge.set(workflowId, [...ausgaenge])
  qaAusgaenge.set(workflowId, [...(mitQa?.qaAusgaengeListe ?? [])])
  return workflowId
}

/** B2b-2b-1: Ablauf Ausführung → Review (codex) → qa mit hinterlegten Ausgängen. @returns workflowId oder null */
const legeAnMitQa = (kennung, reviews, qas, maxReplans = 1) => legeAn(kennung, reviews, SCHRITT_REVIEW_CODEX, { qaAusgaengeListe: qas, maxReplans })
const letzteAbnahme = (id) => abnahmen(id).at(-1) ?? null

const ladeWorkflow = (id) => ladeArtefaktVersion(`workflow-${id}`, undefined, ladeOptionen)?.daten ?? null
const abnahmen = (id) => listeVersionen(`entscheidung-workflow-${id}-abnahme`, ladeOptionen)
const kernAnzahl = (id) => abnahmen(id).filter((v) => v.herkunft?.erzeuger === 'kern').length
const laeufeVon = (id, rolle) => laeufe.filter((l) => l.workflowId === id && l.rolle === rolle)
const post = (pfad, koerper = {}) => fetch(`${basisUrl}${pfad}`, { method: 'POST', body: JSON.stringify(koerper) })
const holeAbnahme = async (id) => (await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(id)}/abnahme`)).json()
const zaehleText = (text, teil) => (typeof text === 'string' ? text.split(teil).length - 1 : 0)

/** Wartet, bis der Workflow nicht mehr läuft. @returns Workflow-Daten oder null */
async function warteAufHalt(workflowId) {
  return warteBis(() => {
    const daten = ladeWorkflow(workflowId)
    const laeuft = daten?.status === 'LAEUFT' || daten?.status === 'OFFEN' || daten?.schritte?.some((s) => s.status === 'LAEUFT')
    return daten !== null && !laeuft ? daten : null
  }, 4000)
}

/** Startet den Ablauf (POST …/starten, z. B. nach „Prüfer wiederholen“) und wartet auf den Halt. @returns Workflow-Daten oder null */
async function starteUndWarte(kennung, workflowId) {
  aktiv.workflowId = workflowId
  const antwort = await post(`/api/workflows/${encodeURIComponent(workflowId)}/starten`)
  if (antwort.status !== 200 && antwort.status !== 202) {
    befunde.push(`(${kennung}) Start erwartet 200/202, erhalten ${antwort.status}: ${await antwort.text()}`)
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
  // ── (s0) Schemafassung = Spike-Fassung ─────────────────────────────────────────────────
  {
    const sha = createHash('sha256').update(readFileSync('schemas/ergebnis-code-reviewer.schema.json')).digest('hex')
    pruefe(sha === SPIKE_SHA256, '(s0) ergebnis-code-reviewer.schema.json = im Spike B2b-2a an claude-code belegte Fassung.', `(s0) Schema geändert (SHA-256 ${sha}) — neuer echter Lauf an claude-code nötig (F-638/F-1086), Wert in spike-reviewer-schema.md und hier nachziehen`)
  }

  // ── (k1) Befund v2 → Neubau mit ID, Evidenz, Korrekturrichtung ─────────────────────────
  {
    const id = await legeAn('k1', [review('BLOCKIERT', [befundV2('B1', 'HOCH')]), review('BEREIT', [])])
    const erst = id && (await gibFreiUndWarte('k1', id))
    if (erst) {
      pruefe(erst.status === 'WARTET_FREIGABE' && kernAnzahl(id) === 1, '(k1) BLOCKIERT mit Befund v2: automatischer Rückweg.', `(k1) Rückweg erwartet — ${erst.status}, kern ${kernAnzahl(id)}`)
      const zweit = await gibFreiUndWarte('k1', id)
      const neubau = laeufeVon(id, 'ausfuehrung')[1]?.auftragstext
      const reReview = laeufeVon(id, 'code-reviewer')[1]?.auftragstext
      pruefe(
        zweit?.status === 'ABGESCHLOSSEN' && neubau?.includes('   Befund-ID: B1 · Evidenz: confirmed') && zaehleText(neubau, `Korrekturrichtung: ${KORREKTUR}`) === 1,
        '(k1) Neubau-Auftrag nennt Befund-ID, Evidenz und Korrekturrichtung — die Korrekturrichtung genau einmal (A1 = a).',
        `(k1) Neubau-Auftrag ohne v2-Felder oder doppelt — status ${zweit?.status}, Korrekturrichtung ${zaehleText(neubau, `Korrekturrichtung: ${KORREKTUR}`)}×, Text: ${JSON.stringify(neubau?.slice(-900))}`
      )
      pruefe(reReview?.includes('Befund-ID: B1') && reReview.includes(`Korrekturrichtung: ${KORREKTUR}`), '(k1) Re-Review-Auftrag nennt Befund-ID und Korrekturrichtung (gezielt nachprüfen, Spec §10).', `(k1) Re-Review-Auftrag ohne v2-Felder: ${JSON.stringify(reReview?.slice(-900))}`)
    }
  }

  // ── (k2) Befund v1 → Rückweg ohne Abbruch, kein Zusatz ─────────────────────────────────
  {
    const id = await legeAn('k2', [review('BLOCKIERT', [BEFUND_V1]), review('BEREIT', [])])
    const erst = id && (await gibFreiUndWarte('k2', id))
    if (erst) {
      const zweit = await gibFreiUndWarte('k2', id)
      const neubau = laeufeVon(id, 'ausfuehrung')[1]?.auftragstext
      pruefe(
        kernAnzahl(id) === 1 && zweit?.status === 'ABGESCHLOSSEN' && neubau?.includes('1. [MITTEL] src/b.ts:7 — Gate-Befund v1. (Beleg: Synthetischer Beleg.)\n\n') && !neubau.includes('Befund-ID') && !neubau.includes('Korrekturrichtung:'),
        '(k2) Befund v1: Rückweg läuft, Neubau-Auftrag mit der Befundzeile wie bisher, ohne Zusatzzeilen.',
        `(k2) erwartet Rückweg ohne Zusatz — kern ${kernAnzahl(id)}, status ${zweit?.status}, Text: ${JSON.stringify(neubau?.slice(-700))}`
      )
    }
  }

  // ── (h1)/(h2) BEREIT mit HOCH ⇒ Hinweis, kein Neubau; Worker codex ──────────────────────
  {
    const id = await legeAn('h1', [review('BEREIT', [befundV2('B1', 'HOCH'), befundV2('B2', 'NIEDRIG')])])
    const daten = id && (await gibFreiUndWarte('h1', id))
    if (daten) {
      const abnahme = await holeAbnahme(id)
      pruefe(
        daten.status === 'ABGESCHLOSSEN' && abnahme.urteil?.status === 'ok' && abnahme.urteil.schwere_bei_bereit === 1 && abnahmen(id).length === 0 && laeufeVon(id, 'ausfuehrung').length === 1,
        '(h1) BEREIT mit HOCH: ABGESCHLOSSEN, GET …/abnahme schwere_bei_bereit 1, keine Abnahme-Version, ein Ausführungslauf (kein Neubau).',
        `(h1) erwartet Hinweis ohne Neubau — status ${daten.status}, urteil ${JSON.stringify(abnahme.urteil)}, Abnahmen ${abnahmen(id).length}, Ausführungen ${laeufeVon(id, 'ausfuehrung').length}`
      )
      pruefe(abnahme.urteil?.worker === 'codex', "(r1) Gegenstück: der Codex-Review zeigt worker 'codex' (aus der Laufakte).", `(r1) worker des Codex-Reviews erwartet 'codex', erhalten ${JSON.stringify(abnahme.urteil?.worker)}`)
    }
    const id2 = await legeAn('h2', [review('BEREIT', [])])
    const daten2 = id2 && (await gibFreiUndWarte('h2', id2))
    if (daten2) {
      const abnahme = await holeAbnahme(id2)
      pruefe(abnahme.urteil?.schwere_bei_bereit === 0, '(h2) BEREIT ohne Befunde: schwere_bei_bereit 0.', `(h2) erwartet 0, erhalten ${JSON.stringify(abnahme.urteil)}`)
    }
  }

  // ── (h3) Mensch-Pfad (qa 3): BEREIT mit HOCH → Stefan wünscht eine Anpassung → Neubau mit ID/Korrekturrichtung ──
  {
    const id = await legeAn('h3', [review('BEREIT', [befundV2('B1', 'HOCH')]), review('BEREIT', [])])
    const erst = id && (await gibFreiUndWarte('h3', id))
    if (erst) {
      const anpassung = await post(`/api/workflows/${encodeURIComponent(id)}/abnahme`, { ergebnis: 'ANPASSUNG_ANGEFORDERT', begruendung: 'Befund B1 vor der Abnahme beheben.' })
      const zweit = anpassung.status === 200 ? await gibFreiUndWarte('h3', id) : null
      const neubau = laeufeVon(id, 'ausfuehrung')[1]?.auftragstext
      const reReview = laeufeVon(id, 'code-reviewer')[1]?.auftragstext
      const abnahme = await holeAbnahme(id)
      pruefe(
        zweit?.status === 'ABGESCHLOSSEN' && neubau?.includes('   Befund-ID: B1 · Evidenz: confirmed') && zaehleText(neubau, `Korrekturrichtung: ${KORREKTUR}`) === 1 && reReview?.includes('Befund-ID: B1') && abnahme.urteil?.schwere_bei_bereit === 0,
        '(h3) Mensch-Pfad: nach „Anpassung wünschen“ trägt der Neubau Befund-ID und Korrekturrichtung (einmal), der Re-Review B1; danach BEREIT ohne Befunde ⇒ 0.',
        `(h3) Mensch-Pfad — Anpassung ${anpassung.status}, status ${zweit?.status}, Korrekturrichtung ${zaehleText(neubau, `Korrekturrichtung: ${KORREKTUR}`)}×, schwere ${abnahme.urteil?.schwere_bei_bereit}`
      )
    }
  }

  // ── (h4) nach der Abnahme (qa 2): ANGENOMMEN trotz HOCH ⇒ kein Hinweis mehr ──────────────
  {
    const id = await legeAn('h4', [review('BEREIT', [befundV2('B1', 'HOCH')])])
    const daten = id && (await gibFreiUndWarte('h4', id))
    if (daten) {
      const vorher = (await holeAbnahme(id)).urteil?.schwere_bei_bereit
      const angenommen = await post(`/api/workflows/${encodeURIComponent(id)}/abnahme`, { ergebnis: 'ANGENOMMEN', begruendung: 'Risiko B1 bewusst angenommen.' })
      const nachher = (await holeAbnahme(id)).urteil?.schwere_bei_bereit
      pruefe(vorher === 1 && angenommen.status === 200 && nachher === 0, '(h4) Hinweis nur bei offener Abnahme: vorher 1, nach ANGENOMMEN 0.', `(h4) erwartet 1 → 0 — vorher ${vorher}, POST ${angenommen.status}, nachher ${nachher}`)
    }
  }

  // ── (r1) claude-code-Reviewer mit Schema ───────────────────────────────────────────────
  {
    const id = await legeAn('r1', [review('BEREIT', [befundV2('B1', 'MITTEL')])], SCHRITT_REVIEW_CLAUDE)
    const daten = id && (await gibFreiUndWarte('r1', id))
    if (daten) {
      const lauf = laeufeVon(id, 'code-reviewer')[0]
      const schema = typeof lauf?.aufrufEingaben?.jsonSchema === 'string' ? JSON.parse(lauf.aufrufEingaben.jsonSchema) : null
      const abnahme = await holeAbnahme(id)
      pruefe(
        daten.status === 'ABGESCHLOSSEN' && lauf?.worker === 'claude-code' && schema !== null && schema.$schema === undefined && schema.$id === undefined && schema.properties?.urteil !== undefined,
        "(r1) claude-code-Reviewer mit 'ergebnis-code-reviewer': startet ohne Regel-4b-Klärung, Lauf mit jsonSchema (ohne $schema/$id).",
        `(r1) erwartet Start mit jsonSchema — status ${daten.status}, grund ${JSON.stringify(daten.grund)}, lauf ${JSON.stringify(lauf?.aufrufEingaben)?.slice(0, 300)}`
      )
      pruefe(
        abnahme.urteil?.status === 'ok' && abnahme.urteil.urteil === 'BEREIT' && abnahme.urteil.befunde?.[0]?.id === 'B1' && abnahme.urteil.worker === 'claude-code',
        "(r1) GET …/abnahme zeigt Urteil und Befunde des claude-code-Reviewers, worker 'claude-code'.",
        `(r1) Abnahme-Projektion erwartet ok/BEREIT/B1/claude-code — ${JSON.stringify(abnahme.urteil)}`
      )
    }
  }

  // ── (r2) claude-code-Reviewer BLOCKIERT ⇒ derselbe Rückweg ─────────────────────────────
  {
    const id = await legeAn('r2', [review('BLOCKIERT', [befundV2('B1', 'HOCH')])], SCHRITT_REVIEW_CLAUDE)
    const daten = id && (await gibFreiUndWarte('r2', id))
    if (daten) pruefe(daten.status === 'WARTET_FREIGABE' && kernAnzahl(id) === 1, '(r2) claude-code-Reviewer BLOCKIERT: automatischer Rückweg wie bei Codex.', `(r2) Rückweg erwartet — ${daten.status}, kern ${kernAnzahl(id)}, grund ${JSON.stringify(daten.grund)}`)
  }

  // ── (r3) claude-code-Reviewer FEHLGESCHLAGEN ⇒ Review wiederholen ──────────────────────
  {
    const id = await legeAn('r3', [FEHLSCHLAG], SCHRITT_REVIEW_CLAUDE)
    const daten = id && (await gibFreiUndWarte('r3', id))
    if (daten) {
      const abnahme = await holeAbnahme(id)
      const antwort = await post(`/api/workflows/${encodeURIComponent(id)}/pruefer-wiederholen`)
      pruefe(
        daten.status === 'KLAERUNG_ERFORDERLICH' && abnahme.reviewWiederholbar === true && antwort.status === 200,
        '(r3) claude-code-Reviewer FEHLGESCHLAGEN: reviewWiederholbar true, POST …/pruefer-wiederholen 200.',
        `(r3) erwartet wiederholbar — ${daten.status}, ${abnahme.reviewWiederholbar}, POST ${antwort.status}: ${await antwort.text()}`
      )
    }
  }

  // ── (g1) Gegenprobe: nicht belegtes Schema an claude-code ⇒ Regel 4b ───────────────────
  {
    const id = await legeAn('g1', [], { ...SCHRITT_REVIEW_CLAUDE, rolle: 'architekt', output_schema: 'ergebnis-architektur' })
    const daten = id && (await gibFreiUndWarte('g1', id))
    if (daten) {
      pruefe(
        daten.status === 'KLAERUNG_ERFORDERLICH' && daten.aktiver_schritt_id === 'schritt-2-review' && (daten.grund ?? '').includes("löst dieses Ausgabeschema nicht ein") && laeufeVon(id, 'architekt').length === 0,
        "(g1) claude-code mit 'ergebnis-architektur' (nicht belegt): KLAERUNG_ERFORDERLICH nach Regel 4b, kein Lauf.",
        `(g1) Regel-4b-Halt erwartet — ${daten.status}, ${daten.aktiver_schritt_id}, grund ${JSON.stringify(daten.grund)}`
      )
    }
    const basis = { worker: 'claude-code', anfragen: [{ pfad: `features/${FEATURE_ID}/feature.md`, zweck: 'Gate' }], budget: { maxElemente: 5 }, aufrufEingaben: { modell: 'gate-modell' }, auftragId: 'gate-auftrag' }
    const reviewer = loeseAusfuehrungsEingabenAuf({ ...basis, rolle: 'code-reviewer', ausgabeSchemaPfad: join(INSTALL_WURZEL, 'schemas', 'ergebnis-code-reviewer.schema.json') }, 'lesend', 'Gate', vorlage, fremdprojekt)
    const architekt = loeseAusfuehrungsEingabenAuf({ ...basis, rolle: 'architekt', ausgabeSchemaPfad: join(INSTALL_WURZEL, 'schemas', 'ergebnis-architektur.schema.json') }, 'lesend', 'Gate', vorlage, fremdprojekt)
    pruefe(
      reviewer.ok && typeof reviewer.eingaben.aufrufEingaben.jsonSchema === 'string' && !architekt.ok && /löst nur 'ergebnis-architecture-advisor', 'ergebnis-code-reviewer'/.test(architekt.grund),
      "(g1) zweite Sicherung: Reviewer mit Schema → jsonSchema; 'ergebnis-architektur' an claude-code → abgelehnt.",
      `(g1) zweite Sicherung erwartet ok/abgelehnt — ${JSON.stringify(reviewer).slice(0, 200)}, ${JSON.stringify(architekt)}`
    )
  }

  // ══ F45 B2b-2b-1: qa-Schritt nach dem Review ════════════════════════════════════════════

  // ── (s1) Schemafassung qa = Spike-Fassung ──────────────────────────────────────────────
  {
    const sha = createHash('sha256').update(readFileSync('schemas/ergebnis-qa.schema.json')).digest('hex')
    pruefe(sha === SPIKE_QA_SHA256, '(s1) ergebnis-qa.schema.json = im Spike B2b-2b an claude-code belegte Fassung.', `(s1) qa-Schema geändert (SHA-256 ${sha}) — neuer echter Lauf an claude-code nötig, Wert in spike-qa-schema.md und hier nachziehen`)
  }

  // ── (q1) Ausführung → Review → qa, beide tragen ────────────────────────────────────────
  {
    const id = await legeAnMitQa('q1', [review('BEREIT', [])], [qa('BEREIT', [])])
    const daten = id && (await gibFreiUndWarte('q1', id))
    if (daten) {
      const reihenfolge = laeufe.filter((l) => l.workflowId === id).map((l) => l.rolle)
      const lauf = laeufeVon(id, 'qa')[0]
      const schema = typeof lauf?.aufrufEingaben?.jsonSchema === 'string' ? JSON.parse(lauf.aufrufEingaben.jsonSchema) : null
      pruefe(
        daten.status === 'ABGESCHLOSSEN' && JSON.stringify(reihenfolge) === JSON.stringify(['ausfuehrung', 'code-reviewer', 'qa']),
        '(q1) Review und qa BEREIT: ABGESCHLOSSEN, Läufe Ausführung → Review → qa.',
        `(q1) erwartet ABGESCHLOSSEN in der Reihenfolge Ausführung, Review, qa — ${daten.status}, ${JSON.stringify(reihenfolge)}, grund ${JSON.stringify(daten.grund)}`
      )
      pruefe(
        schema !== null && schema.$schema === undefined && schema.properties?.testfaelle !== undefined && lauf.auftragstext.startsWith("Du bist als Rolle 'qa'") && lauf.auftragstext.includes('- AK1: '),
        "(q1) qa-Lauf mit jsonSchema 'ergebnis-qa' (ohne $schema) und Rolleninstruktion samt AK des Auftrags.",
        `(q1) qa-Lauf erwartet Schema und Rolleninstruktion — ${JSON.stringify(lauf?.aufrufEingaben)?.slice(0, 200)}, Text ${JSON.stringify(lauf?.auftragstext?.slice(0, 300))}`
      )
    }
  }

  // ── (q2) qa BLOCKIERT ⇒ eine Runde mit den qa-Befunden ─────────────────────────────────
  {
    const id = await legeAnMitQa('q2', [review('BEREIT', []), review('BEREIT', [])], [qa('BLOCKIERT', [befundQa('Q1', 'HOCH')]), qa('BEREIT', [])])
    const erst = id && (await gibFreiUndWarte('q2', id))
    if (erst) {
      const ersterQa = laeufeVon(id, 'qa')[0]?.laufId
      pruefe(
        erst.status === 'WARTET_FREIGABE' && kernAnzahl(id) === 1 && letzteAbnahme(id)?.daten?.bezug?.qa_lauf_id === ersterQa,
        '(q2) qa BLOCKIERT: automatische Korrekturrunde, bezug.qa_lauf_id = qa-Lauf.',
        `(q2) Runde erwartet — ${erst.status}, kern ${kernAnzahl(id)}, bezug ${JSON.stringify(letzteAbnahme(id)?.daten?.bezug)}, grund ${JSON.stringify(erst.grund)}`
      )
      const zweit = await gibFreiUndWarte('q2', id)
      const neubau = laeufeVon(id, 'ausfuehrung')[1]?.auftragstext ?? ''
      const qaNeu = laeufeVon(id, 'qa')[1]?.auftragstext ?? ''
      pruefe(
        zweit?.status === 'ABGESCHLOSSEN' &&
          neubau.includes('Offene Befunde der vorherigen Prüfung aus Nutzersicht (qa), die diese Iteration beheben muss:\n1. [HOCH] src/liste.ts:8 — qa-Befund Q1.') &&
          neubau.includes('   Befund-ID: Q1 · Evidenz: confirmed') &&
          zaehleText(neubau, 'Korrekturrichtung: Korrektur Q1.') === 1 &&
          !neubau.includes('Offene Befunde des vorherigen Reviews'),
        '(q2) Neubau nennt die qa-Befunde mit Herkunft, ID und Korrekturrichtung (einmal), ohne leeren Review-Abschnitt.',
        `(q2) Neubau-Auftrag ohne qa-Abschnitt — status ${zweit?.status}, Text ${JSON.stringify(neubau.slice(-900))}`
      )
      pruefe(qaNeu.includes('Die vorherige Prüfung aus Nutzersicht (qa) meldete zusätzlich die folgenden Befunde:\n1. [HOCH] src/liste.ts:8 — qa-Befund Q1.'), '(q2) der qa der neuen Runde bekommt seine Vorbefunde (gezielt nachprüfen).', `(q2) qa-Auftrag ohne Vorbefunde: ${JSON.stringify(qaNeu.slice(-700))}`)
    }
  }

  // ── (q3) Review und qa BLOCKIERT ⇒ trotzdem eine Runde ─────────────────────────────────
  {
    const id = await legeAnMitQa('q3', [review('BLOCKIERT', [befundV2('B1', 'HOCH')]), review('BEREIT', [])], [qa('BLOCKIERT', [befundQa('Q1', 'MITTEL')]), qa('BEREIT', [])])
    const erst = id && (await gibFreiUndWarte('q3', id))
    if (erst) {
      pruefe(
        erst.status === 'WARTET_FREIGABE' && laeufeVon(id, 'qa').length === 1 && kernAnzahl(id) === 1,
        '(q3) Review und qa BLOCKIERT: der qa lief trotz BLOCKIERT des Reviews, genau eine Korrekturrunde.',
        `(q3) erwartet qa-Lauf und eine Runde — ${erst.status}, qa ${laeufeVon(id, 'qa').length}, kern ${kernAnzahl(id)}, grund ${JSON.stringify(erst.grund)}`
      )
      await gibFreiUndWarte('q3', id)
      const neubau = laeufeVon(id, 'ausfuehrung')[1]?.auftragstext ?? ''
      const r = neubau.indexOf('Offene Befunde des vorherigen Reviews')
      const q = neubau.indexOf('Offene Befunde der vorherigen Prüfung aus Nutzersicht (qa)')
      pruefe(r >= 0 && q > r && neubau.includes('Befund-ID: B1') && neubau.includes('Befund-ID: Q1') && kernAnzahl(id) === 1, '(q3) Neubau mit beiden Abschnitten (Review, dann qa), B1 und Q1.', `(q3) Neubau erwartet beide Abschnitte — ${JSON.stringify(neubau.slice(-1200))}`)
    }
  }

  // ── (q4) zweite beanstandete Runde ⇒ Grenze ────────────────────────────────────────────
  {
    const id = await legeAnMitQa('q4', [review('BEREIT', []), review('BEREIT', [])], [qa('BLOCKIERT', [befundQa('Q1', 'HOCH')]), qa('BLOCKIERT', [befundQa('Q2', 'HOCH', 'src/anders.ts:3')])])
    const erst = id && (await gibFreiUndWarte('q4', id))
    if (erst) {
      const zweit = await gibFreiUndWarte('q4', id)
      pruefe(
        zweit?.status === 'KLAERUNG_ERFORDERLICH' && zweit.aktiver_schritt_id === 'schritt-3-qa' && kernAnzahl(id) === 1 && (zweit.grund ?? '').includes('Die Bau-Stufe hatte ihre eine automatische Korrekturrunde schon.'),
        '(q4) zweite beanstandete Runde: keine zweite Kern-Version, Halt am qa mit dem Grenz-Grund.',
        `(q4) erwartet Halt an der Grenze — ${zweit?.status}, ${zweit?.aktiver_schritt_id}, kern ${kernAnzahl(id)}, grund ${JSON.stringify(zweit?.grund)}`
      )
    }
  }

  // ── (q5) qa mit Schemaverstoß ⇒ Halt + Prüfer wiederholen ──────────────────────────────
  {
    const id = await legeAnMitQa('q5', [review('BEREIT', [])], [qa('BEREIT', [], []), qa('BEREIT', [])])
    const daten = id && (await gibFreiUndWarte('q5', id))
    if (daten) {
      const antwort = await post(`/api/workflows/${encodeURIComponent(id)}/pruefer-wiederholen`)
      const nachher = ladeWorkflow(id)
      const qaSchritt = nachher?.schritte?.find((s) => s.schritt_id === 'schritt-3-qa')
      pruefe(
        daten.status === 'KLAERUNG_ERFORDERLICH' && daten.aktiver_schritt_id === 'schritt-3-qa' && (daten.grund ?? '').includes('qa-Schema') && kernAnzahl(id) === 0 && antwort.status === 200 && qaSchritt?.lauf_id === null && qaSchritt?.status === 'OFFEN',
        '(q5) qa mit Schemaverstoß: Halt am qa, keine Runde; POST …/pruefer-wiederholen 200 setzt den qa zurück.',
        `(q5) erwartet Halt + Wiederholung — ${daten.status}, ${daten.aktiver_schritt_id}, grund ${JSON.stringify(daten.grund)}, kern ${kernAnzahl(id)}, POST ${antwort.status}, qa ${JSON.stringify(qaSchritt)}`
      )
      const danach = antwort.status === 200 ? await starteUndWarte('q5', id) : null
      pruefe(danach?.status === 'ABGESCHLOSSEN' && laeufeVon(id, 'qa').length === 2 && laeufeVon(id, 'code-reviewer').length === 1, '(q5) nach dem Start läuft nur der qa erneut, der Ablauf endet ABGESCHLOSSEN.', `(q5) nach Wiederholung erwartet ABGESCHLOSSEN — ${danach?.status}, qa ${laeufeVon(id, 'qa').length}, Review ${laeufeVon(id, 'code-reviewer').length}, grund ${JSON.stringify(danach?.grund)}`)
    }
  }

  // ── (q6) Advisor A1: BLOCKIERT ohne Befunde und ohne Pflichtsatz (1k) ⇒ qa läuft, Runde ──
  {
    const blockiertLeer = { ausgang: 'ERFOLGREICH', text: JSON.stringify({ urteil: 'BLOCKIERT', befunde: [], empfehlung: 'Gate.', ak_urteile: AK_OK }) }
    const id = await legeAnMitQa('q6', [blockiertLeer], [qa('BEREIT', [])])
    const daten = id && (await gibFreiUndWarte('q6', id))
    if (daten) {
      pruefe(
        laeufeVon(id, 'qa').length === 1 && daten.status === 'WARTET_FREIGABE' && kernAnzahl(id) === 1,
        '(q6) Review BLOCKIERT ohne Befunde und Pflichtsatz: der qa läuft, die Korrekturrunde löst aus (Vorrang 1b vor 1k wie bisher).',
        `(q6) erwartet qa-Lauf und Runde — qa ${laeufeVon(id, 'qa').length}, ${daten.status}, kern ${kernAnzahl(id)}, grund ${JSON.stringify(daten.grund)}`
      )
    }
  }

  // ── (q8) qa fällt aus nach beanstandetem Review ────────────────────────────────────────
  {
    const id = await legeAnMitQa('q8', [review('BLOCKIERT', [befundV2('B1', 'HOCH')]), review('BEREIT', [])], [FEHLSCHLAG, qa('BEREIT', [])])
    const daten = id && (await gibFreiUndWarte('q8', id))
    if (daten) {
      const antwort = await post(`/api/workflows/${encodeURIComponent(id)}/pruefer-wiederholen`)
      pruefe(
        daten.status === 'KLAERUNG_ERFORDERLICH' && daten.aktiver_schritt_id === 'schritt-3-qa' && (daten.grund ?? '').includes('der Review dieser Runde hat beanstandet') && kernAnzahl(id) === 0 && antwort.status === 200,
        '(q8) qa FEHLGESCHLAGEN nach BLOCKIERT des Reviews: Halt nennt die Beanstandung, keine Runde, wiederholbar.',
        `(q8) erwartet Halt mit Beanstandung — ${daten.status}, grund ${JSON.stringify(daten.grund)}, kern ${kernAnzahl(id)}, POST ${antwort.status}`
      )
      const danach = antwort.status === 200 ? await starteUndWarte('q8', id) : null
      pruefe(
        danach?.status === 'WARTET_FREIGABE' && kernAnzahl(id) === 1 && laeufeVon(id, 'qa').length === 2,
        '(q8) nach Wiederholung und Start: die Runde entscheidet über beide Prüfer (eine Kern-Version).',
        `(q8) nach Wiederholung erwartet Korrekturrunde — ${danach?.status}, kern ${kernAnzahl(id)}, qa ${laeufeVon(id, 'qa').length}, grund ${JSON.stringify(danach?.grund)}`
      )
    }
  }

  // ── (q9) Review BEREIT mit AK-Verstoß, qa BEREIT ⇒ Runde nach dem qa ───────────────────
  {
    const akVerletzt = { ausgang: 'ERFOLGREICH', text: JSON.stringify({ urteil: 'BEREIT', befunde: [], empfehlung: `${KEINE_BEFUNDE_SATZ}.`, ak_urteile: AK_VERLETZT }) }
    const id = await legeAnMitQa('q9', [akVerletzt, review('BEREIT', [])], [qa('BEREIT', []), qa('BEREIT', [])])
    const erst = id && (await gibFreiUndWarte('q9', id))
    if (erst) {
      const qaLaeufe = laeufeVon(id, 'qa').length
      await gibFreiUndWarte('q9', id)
      const neubau = laeufeVon(id, 'ausfuehrung')[1]?.auftragstext ?? ''
      pruefe(
        qaLaeufe === 1 && erst.status === 'WARTET_FREIGABE' && kernAnzahl(id) === 1 && neubau.includes('Verletzte Akzeptanzkriterien:') && neubau.includes('AK1'),
        '(q9) AK-Verstoß des Reviews: der qa läuft, danach eine Runde; der Neubau nennt das verletzte AK.',
        `(q9) erwartet qa-Lauf und Runde mit AK — qa ${qaLaeufe}, ${erst.status}, kern ${kernAnzahl(id)}, Text ${JSON.stringify(neubau.slice(-700))}`
      )
    }
  }

  // ── (q10) Mensch-Pfad bei Halt am qa ───────────────────────────────────────────────────
  {
    const id = await legeAnMitQa('q10', [review('BEREIT', []), review('BEREIT', [])], [qa('BLOCKIERT', [befundQa('Q1', 'HOCH')]), qa('BEREIT', [])], 0)
    const erst = id && (await gibFreiUndWarte('q10', id))
    if (erst) {
      const qaLauf = laeufeVon(id, 'qa')[0]?.laufId
      const anpassung = await post(`/api/workflows/${encodeURIComponent(id)}/abnahme`, { ergebnis: 'ANPASSUNG_ANGEFORDERT', begruendung: 'Q1 vor der Abnahme beheben.' })
      const bezug = letzteAbnahme(id)?.daten?.bezug
      const zweit = anpassung.status === 200 ? await gibFreiUndWarte('q10', id) : null
      const neubau = laeufeVon(id, 'ausfuehrung')[1]?.auftragstext ?? ''
      pruefe(
        erst.status === 'KLAERUNG_ERFORDERLICH' && erst.aktiver_schritt_id === 'schritt-3-qa' && kernAnzahl(id) === 0 && anpassung.status === 200 && bezug?.qa_lauf_id === qaLauf && zweit?.status === 'ABGESCHLOSSEN' && neubau.includes('Befund-ID: Q1'),
        '(q10) Mensch-Pfad: Halt am qa (max_replans 0), „Anpassung wünschen“ mit bezug.qa_lauf_id, Neubau mit Q1.',
        `(q10) Mensch-Pfad — ${erst.status}/${erst.aktiver_schritt_id}, kern ${kernAnzahl(id)}, POST ${anpassung.status}, bezug ${JSON.stringify(bezug)}, danach ${zweit?.status}`
      )
    }
  }

  // ── (q11) dieselben Befunde in der zweiten Runde ⇒ Wiederholungs-Grund über beide Prüfer ──
  {
    const id = await legeAnMitQa('q11', [review('BEREIT', []), review('BEREIT', [])], [qa('BLOCKIERT', [befundQa('Q1', 'HOCH')]), qa('BLOCKIERT', [befundQa('Q1', 'HOCH', 'src/liste.ts:40')])])
    const erst = id && (await gibFreiUndWarte('q11', id))
    if (erst) {
      const zweit = await gibFreiUndWarte('q11', id)
      pruefe(
        zweit?.status === 'KLAERUNG_ERFORDERLICH' && kernAnzahl(id) === 1 && (zweit.grund ?? '').includes('Die Prüfer melden nach der Korrektur dieselben Befunde wie zuvor (HOCH in src/liste.ts)'),
        '(q11) zweite Runde mit denselben Befunden: Wiederholungs-Grund über beide Prüfer, keine zweite Kern-Version.',
        `(q11) erwartet Wiederholungs-Halt — ${zweit?.status}, kern ${kernAnzahl(id)}, grund ${JSON.stringify(zweit?.grund)}`
      )
    }
  }

  // ── (f) Quelltext-Invariante ───────────────────────────────────────────────────────────
  {
    const anzahl = readFileSync('scripts/leitstand-server.mjs', 'utf8').split('starteWorkflowSchritt(').length - 1
    pruefe(anzahl === 6, '(f) starteWorkflowSchritt( genau 6-mal im Server.', `(f) starteWorkflowSchritt( ${anzahl}-mal im Server (erwartet 6)`)
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
