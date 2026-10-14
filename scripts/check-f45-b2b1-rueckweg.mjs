#!/usr/bin/env node
/**
 * Datei: scripts/check-f45-b2b1-rueckweg.mjs
 *
 * Zweck: Gate für F45 B2b-1a „Rückweg, Bau-Stufe“ (features/F45/plan-b2b1.md, Plan v2 + Nachträge), B2b-1b-1
 * „Advisor-Schema“ (features/F45/plan-b2b1b.md, Plan v2 + Entscheidungen Stefan) und B2b-1b-2a „Plan v2“
 * (features/F45/plan-b2b1b2.md). Nachweis am
 * REALEN Aufrufpfad (Muster scripts/check-f35-ws3-adjust-automatik.mjs): echter HTTP-Testserver, echte
 * Workflow-Artefakte, gestubbter Worker (fuehreAufgabeDurchFn) mit REAL registrierten Laufakten — Automat,
 * Rückweg-Automatik und „Prüfer wiederholen“ lesen Urteil und Befunde am tatsächlichen Lesepfad.
 *
 * Prüft:
 * (a)  Grenze je Stufe: Review BLOCKIERT → ein automatischer Rückweg (kern) → nach der Freigabe Review BLOCKIERT mit
 *      ANDEREN Befunden → KLAERUNG_ERFORDERLICH, kein zweites kern-Artefakt, Grund nennt die Grenze der Bau-Stufe.
 * (a0) max_replans 0 → schon der erste Rückweg ist gesperrt, Grund nennt die Vorlage (ohne Feldnamen).
 * (a2) Urteil BEREIT mit AK-Verstoß löst den ersten Rückweg ebenfalls aus (Auslöser unverändert).
 * (b)  Halt bei Wiederholung: Review BEREIT_NACH_KORREKTUR mit Befund → Stefan wünscht eine Anpassung (mensch) →
 *      Review BLOCKIERT mit DENSELBEN Befunden (andere Zeile) → KLAERUNG_ERFORDERLICH, kein kern-Artefakt, obwohl der
 *      Rückweg der Bau-Stufe noch frei wäre; der Grund nennt die Wiederholung.
 * (e)  Review FEHLGESCHLAGEN (Werkzeugausfall) → GET …/abnahme reviewWiederholbar true → POST …/pruefer-wiederholen
 *      setzt nur den Review zurück (LAEUFT, Ausführungs-lauf_id unverändert, keine Abnahme-Version) → POST …/starten
 *      startet nur den Review (kein zweiter Ausführungs-Lauf) → BEREIT → ABGESCHLOSSEN.
 * (e2) Rotfälle: 409 bei BLOCKIERT (Workflow aus (a)) und bei einem abgeschlossenen Workflow; reviewWiederholbar false.
 * (e3) Advisor ohne erkennbares Urteil (Regel 1d) → POST …/pruefer-wiederholen → WARTET_FREIGABE (ZWINGEND), Schritt
 *      OFFEN/lauf_id null, keine Freigabe übernommen.
 * (e4) Review BEREIT ohne Befunde und ohne Pflichtsatz (Regel 1k, Policy-Version in der Laufakte) → wiederholbar → 200.
 * (e5) Review ERFOLGREICH mit unlesbarem Ergebnis (kein JSON, Regel 1b) → wiederholbar → 200.
 * (e6) 400 bei unzulässiger Kennung, 404 bei unbekanntem Workflow.
 * (e7) F-1104 (8): POST …/pruefer-wiederholen → 409, solange ein anderer Lauf aktiv ist (globale Laufsperre).
 * B2b-1b-1 (Advisor-Schema):
 * (c0) schemas/ergebnis-architecture-advisor.schema.json im Strict-Dialekt (additionalProperties:false und jedes Feld
 *      in required, auf jeder Objektebene); die Beispiele unter schemas/examples/ gegen validiereErgebnisAdvisor.
 * (c1) Übergang (Entscheidung Stefan A5): Advisor mit Schema am Schritt liefert ein gültiges UEBERARBEITEN bzw.
 *      FREIGEGEBEN → der Ablauf geht zur ZWINGEND-Freigabe der Ausführung (WARTET_FREIGABE), Prüfer nicht wiederholbar
 *      (409). Argv: der Advisor-Lauf trägt aufrufEingaben.jsonSchema ohne $schema/$id; ein Advisor ohne Schema am
 *      Schritt (Bestand) und die Ausführung tragen keins.
 * (c4) Advisor-Ergebnis verstößt gegen das Schema (FREIGEGEBEN mit Befund) → KLAERUNG_ERFORDERLICH, Grund nennt den
 *      Verstoß und „Prüfer wiederholen“; POST …/pruefer-wiederholen → 200 WARTET_FREIGABE.
 * (c0b) die Schemadatei entspricht der im Spike F-1105 real belegten Fassung (SHA-256 im Nachweis).
 * (c1b) Bestands-Advisor (output_schema null) mit gültigem JSON → Freigabe der Ausführung.
 * (c4b) JSON im Codezaun mit Text drumherum → gelesen, weiter; (c4e) rohes JSON mit Status-Block danach → gelesen
 *      (nur über jsonObjektFallback), weiter; (c4c) leeres Ergebnis → Halt; (c4d) MIT_AUFLAGEN ohne
 *      Befund → Halt mit lesbarem Grund; (c5) Werkzeugausfall des Advisors → Grund nennt die Ursache.
 * (c6) zweite Sicherung loeseAusfuehrungsEingabenAuf: nur das belegte Schema geht als jsonSchema an claude-code,
 *      'ergebnis-code-reviewer' an claude-code und ein unlesbares Schema werden abgelehnt.
 * (e8) POST /api/laeufe mit aufrufEingaben.jsonSchema → 400.
 * B2b-1b-2a „Plan v2“ (features/F45/plan-b2b1b2.md; Architekt → Advisor → Ausführung, Stack offen, Architekt-Laufakten
 * aus der Attrappe):
 * (c)   UEBERARBEITEN → im selben Schreibvorgang Rückweg (Architekt OFFEN mit rueckweg, WARTET_FREIGABE, Grund „Plan v2“),
 *       Ausführung verliert das Advisor-Ergebnis (B13); Architekt-v2-Auftrag mit Plan v1, Befunden, Antwort, Stack-Regel;
 *       danach Freigabe der Ausführung („Plan v2 liegt vor“), die Ausführung bekommt Plan v2.
 * (c2)  nach Plan v2 kein zweiter Advisor-Lauf; pure Gegenprobe ermittlePlanRueckweg ⇒ gesperrt.
 * (c3)  FREIGEGEBEN_MIT_AUFLAGEN ⇒ derselbe Rückweg; max_replans 0 ⇒ Freigabe der Ausführung, Grund „Kein Plan v2: …“.
 * (c7)  Plan v2 wiederholt die Stack-Frage und stellt eine neue ⇒ Halt nur für die neue (GET-Detail), Antwort nur auf sie ⇒
 *       Freigabe der Ausführung, entscheidung-@ mit beiden Antworten; D1: ohne offene Frage ⇒ 409.
 * (c9)  POST /api/workflows: gespeicherter rueckweg bleibt, Body-Wert verworfen, neuer Ablauf ohne.
 * (c10) Plan v1 fehlt beim v2-Start ⇒ 409, Ausweg im Grund, kein Lauf.
 * (c11) Plan v2 mit wortgleicher Stack-Frage ⇒ kein Halt.
 * (c12) Advisor seit dem Rückweg zurückgesetzt ⇒ kein Sprung; zweites UEBERARBEITEN ⇒ Grenze der Plan-Stufe.
 * (d)   FREIGEGEBEN ⇒ kein zweiter Architekt-Lauf, die Ausführung bekommt Plan v1.
 * (c13) Plan v2 mit anderer Einrichtungsliste ⇒ offen ist der Eintrag aus Plan v2 (Freigabe der Ausführung 409).
 * (c14) Plan v2 scheitert ⇒ Reparaturfassung ohne rueckweg im Body behält ihn ⇒ v2 erneut mit Plan v1, kein 2. Advisor.
 * (c10b) Advisor-Ergebnis beim v2-Start nicht lesbar ⇒ 409, Grund ohne Lauf-Kennung (die Hülle der Freigabe-Route: F-1110 (4)), kein Lauf.
 *
 * Wird aufgerufen von: `npm run check`.
 *
 * Aufruf: node scripts/check-f45-b2b1-rueckweg.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ladeArtefaktVersion, listeVersionen, registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { validiereErgebnisAdvisor } from '../src/architecture-advisor/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { ermittlePlanRueckweg } from './leitstand/f35-ws3-adjust-automatik.mjs'
import { erzeugeRequestHandler, loeseAusfuehrungsEingabenAuf } from './leitstand-server.mjs'

const befunde = []
console.log('\n=== F45-B2b-1a-Rückweg-Check ===\n')

const STILL = () => {}
const INSTALL_WURZEL = process.cwd()
const FEATURE_ID = 'F9992'
const AKTE = `# ${FEATURE_ID} — Gate-Feature B2b-1a

## Ziel
Ziel des Gate-Features B2b-1a.

## Akzeptanzkriterien
- Erstes Kriterium.
- Zweites Kriterium.
`
const AK_OK = [
  { ak_id: 'AK1', urteil: 'ERFUELLT', beleg: 'src/beispiel.ts:1' },
  { ak_id: 'AK2', urteil: 'ERFUELLT', beleg: 'src/beispiel.ts:2' },
]
const AK2_VERLETZT = [AK_OK[0], { ak_id: 'AK2', urteil: 'NICHT_ERFUELLT', beleg: 'Verhalten weicht ab.' }]
const befund = (id, schwere, fundstelle) => ({ id, dimension: 'bugs', schwere, fundstelle, zusammenfassung: `Gate-Befund ${id}.`, beleg: 'Synthetischer Beleg.', korrekturrichtung: 'Beheben.', evidenz: 'confirmed' })
// Ohne Befunde trägt die Empfehlung den Pflichtsatz der Review-Policy (sonst hielte Regel 1k, Fall e4 prüft genau das).
const PFLICHTSATZ = 'Keine belastbaren Findings im geprüften Scope.'
const review = (urteil, liste, akUrteile = AK_OK, empfehlung = liste.length === 0 ? PFLICHTSATZ : 'Gate.') => ({ ausgang: 'ERFOLGREICH', text: JSON.stringify({ urteil, befunde: liste, empfehlung, ak_urteile: akUrteile }) })

function git(wurzel, argumente) {
  return execFileSync('git', argumente, { cwd: wurzel, encoding: 'utf8' })
}

/** Wegwerf-Fremdprojekt mit nur features/<id>/feature.md (Muster check-f35-ws3). */
function baueFremdprojekt() {
  const wurzel = mkdtempSync(join(tmpdir(), 'check-f45-b2b1-fremd-'))
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

function verzoegerung(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

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

const basisVerzeichnis = `kontrollzustand-test-f45-b2b1-${randomUUID()}`
raeumeVerzeichnis(basisVerzeichnis)
const ladeOptionen = { basisVerzeichnis, schreiber: STILL }
const fremdprojekt = baueFremdprojekt()
const verzeichnis = mkdtempSync(join(tmpdir(), 'check-f45-b2b1-'))
const startvorlagePfad = join(verzeichnis, 'startvorlage.json')
writeFileSync(
  startvorlagePfad,
  JSON.stringify({ ...ladeStartvorlage('startvorlagen/beispielprojekt.json'), worker: { codex: { startziel: [String.raw`C:\f45b2b1-gate-dummy\codex.exe`], versionDeklariert: 'codex-cli-gate-fixture', sandbox: 'read-only' } } }, null, 2)
)
const vorlage = ladeStartvorlage(startvorlagePfad)
const profilReferenz = leiteProfilReferenzAb(vorlage)

// Je Workflow eine Warteschlange von Prüfer-Ausgängen; die Attrappe nimmt je Prüfer-Lauf den nächsten.
const prueferAusgaenge = new Map()
// B2b-1b-2a: je Workflow eine Warteschlange von Architekt-Ergebnissen (ergebnis-architektur), je Architekt-Lauf das nächste.
const architektAusgaenge = new Map()
const laeufe = [] // { workflowId?, laufId, rolle, aufrufEingaben, auftragstext, anfragen }
// F-1104 (8): solange gesetzt, hält die Attrappe einen Ausführungs-Lauf offen (aktiver Lauf für die Sperrprüfung).
const blockade = { warten: null }

/** Attrappe des Workers: jede Rolle wird gezählt; Prüfer-Läufe bekommen eine echte Laufakte mit Rohstrom. */
async function attrappe(laufId, _profil, eingaben) {
  const workflowId = aktiv.workflowId
  laeufe.push({ laufId, rolle: eingaben.rolle, workflowId, aufrufEingaben: eingaben.aufrufEingaben, auftragstext: eingaben.auftragstext, anfragen: eingaben.anfragen ?? [] })
  if (eingaben.rolle === 'ausfuehrung' && blockade.warten !== null) await blockade.warten
  if (eingaben.rolle === 'architekt') {
    // Echte Laufakte mit Rohstrom (Laufakte im claude-code-Format; gelesen wird nach laufakte.worker).
    const plan = architektAusgaenge.get(workflowId)?.shift() ?? { zusammenfassung: 'kein Plan hinterlegt' }
    mkdirSync(basisVerzeichnis, { recursive: true })
    const rohstromPfad = join(basisVerzeichnis, `${laufId}-rohstrom.json`)
    writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: JSON.stringify(plan) }) }), 'utf8')
    registriereKernArtefakt(`laufakte-${laufId}`, profilReferenz, { erzeuger: 'check-f45-b2b1-fake' }, { worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad } }, undefined, ladeOptionen)
    // { fehlschlag: true }: der Lauf hat stattgefunden, das Werkzeug ist ausgefallen (Fall c14).
    if (plan.fehlschlag === true) return { ok: true, klassifikation: { ergebnis: 'FEHLGESCHLAGEN', grund: 'werkzeugausfall' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'FEHLGESCHLAGEN' } }
    return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  }
  if (eingaben.rolle !== 'code-reviewer' && eingaben.rolle !== 'architecture-advisor') {
    return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  }
  const ausgang = prueferAusgaenge.get(workflowId)?.shift() ?? { ausgang: 'ERFOLGREICH', text: 'kein Ausgang hinterlegt' }
  mkdirSync(basisVerzeichnis, { recursive: true })
  const rohstromPfad = join(basisVerzeichnis, `${laufId}-rohstrom.json`)
  writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: ausgang.text }) }), 'utf8')
  // review (Policy-Version) wie die Gateways in die Laufakte spiegeln — sonst prüfte Regel 1k nichts (alte Laufakten).
  const laufakte = { worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad }, ...(eingaben.review !== undefined ? { review: eingaben.review } : {}) }
  registriereKernArtefakt(`laufakte-${laufId}`, profilReferenz, { erzeuger: 'check-f45-b2b1-fake' }, laufakte, undefined, ladeOptionen)
  if (ausgang.ausgang === 'FEHLGESCHLAGEN') {
    // ok:true mit FEHLGESCHLAGEN-Klassifikation: der Lauf hat stattgefunden (nicht heilbar), das Werkzeug ist ausgefallen.
    return { ok: true, klassifikation: { ergebnis: 'FEHLGESCHLAGEN', grund: 'werkzeugausfall' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'FEHLGESCHLAGEN' } }
  }
  return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
}
// Nur EIN Workflow läuft je Zeitpunkt (D13) — die Attrappe ordnet den Lauf darüber zu.
const aktiv = { workflowId: null }

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
const SCHRITT_ADVISOR = {
  schritt_id: 'schritt-1-advisor',
  rolle: 'architecture-advisor',
  werkzeugsatz: 'lesend',
  worker: 'claude-code',
  modell: 'claude-sonnet-5',
  eingaben: [],
  output_schema: null,
  freigabe: 'ZWINGEND',
  risiko: 'Gate-Fixture.',
  zeitgrenze_ms: 600000,
  nachfolger: null,
  status: 'OFFEN',
  lauf_id: null,
}

// B2b-1b-1: Advisor mit Schema (wie workflow-vorlagen/hoch.json), danach die Ausführung (ZWINGEND).
const SCHRITT_ADVISOR_SCHEMA = { ...SCHRITT_ADVISOR, output_schema: 'ergebnis-architecture-advisor', nachfolger: 'schritt-1-ausfuehrung' }
const advisorBefund = (id) => ({ id, schwere: 'HOCH', evidenz: 'FAKT', fundstelle: 'Plan v1, Abschnitt 3', zusammenfassung: `Gate-Befund ${id}.`, korrekturrichtung: 'Im Plan v2 beheben.' })
const advisor = (urteil, liste) => ({ ausgang: 'ERFOLGREICH', text: JSON.stringify({ urteil, begruendung: 'Gate.', befunde: liste, entlastend: [], grenzen_der_pruefung: 'Gate-Attrappe.' }) })

/** Legt Auftrag und Workflow an und hinterlegt die Prüfer-Ausgänge. @returns workflowId oder null */
async function legeAn(kennung, maxReplans, ausgaenge, schritte = [SCHRITT_AUSFUEHRUNG, SCHRITT_REVIEW]) {
  const antwort = await fetch(`${basisUrl}/api/features/${encodeURIComponent(FEATURE_ID)}/auftrag`, { method: 'POST' })
  const koerper = await antwort.json().catch(() => ({}))
  if (antwort.status !== 201 || typeof koerper.auftragId !== 'string') {
    befunde.push(`(${kennung}) Vorbedingung POST …/auftrag: ${antwort.status} ${JSON.stringify(koerper)}`)
    return null
  }
  const workflowId = `f45-b2b1-${kennung}-${randomUUID()}`
  registriereWorkflow(
    { workflow_schema: 'v0', workflow_id: workflowId, auftrag_id: koerper.auftragId, version: 1, ziel: 'Gate B2b-1a.', status: 'OFFEN', aktiver_schritt_id: schritte[0].schritt_id, grenzen: { max_schritte: 20, max_replans: maxReplans }, schritte },
    profilReferenz,
    ladeOptionen
  )
  prueferAusgaenge.set(workflowId, [...ausgaenge])
  return workflowId
}

const ladeWorkflow = (id) => ladeArtefaktVersion(`workflow-${id}`, undefined, ladeOptionen)?.daten ?? null
const abnahmen = (id) => listeVersionen(`entscheidung-workflow-${id}-abnahme`, ladeOptionen)
const kernAnzahl = (id) => abnahmen(id).filter((v) => v.herkunft?.erzeuger === 'kern').length
const post = (pfad, koerper = {}) => fetch(`${basisUrl}${pfad}`, { method: 'POST', body: JSON.stringify(koerper) })

/** Wartet, bis der Workflow nicht mehr läuft. @returns Workflow-Daten oder null */
async function warteAufHalt(workflowId) {
  return warteBis(() => {
    const daten = ladeWorkflow(workflowId)
    const laeuft = daten?.status === 'LAEUFT' || daten?.status === 'OFFEN' || daten?.schritte?.some((s) => s.status === 'LAEUFT')
    return daten !== null && !laeuft ? daten : null
  }, 4000)
}

/** Gibt den ersten Schritt frei und wartet auf den Halt. @returns Workflow-Daten oder null */
async function gibFreiUndWarte(kennung, workflowId, schrittId = 'schritt-1-ausfuehrung') {
  aktiv.workflowId = workflowId
  const antwort = await post(`/api/workflows/${encodeURIComponent(workflowId)}/freigabe`, { schrittId, entscheidung: 'FREIGEGEBEN', begruendung: `Gate (${kennung}).` })
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
  // ── (a) Grenze je Stufe ──────────────────────────────────────────────────────────────────
  let workflowA = null
  {
    workflowA = await legeAn('a', 1, [review('BLOCKIERT', [befund('B1', 'HOCH', 'src/a.ts:3')]), review('BLOCKIERT', [befund('B1', 'MITTEL', 'src/b.ts:7')])])
    const erst = workflowA && (await gibFreiUndWarte('a', workflowA))
    if (erst) {
      pruefe(erst.status === 'WARTET_FREIGABE' && kernAnzahl(workflowA) === 1, '(a) erster BLOCKIERT: ein automatischer Rückweg (kern), WARTET_FREIGABE.', `(a) erster Rückweg erwartet (WARTET_FREIGABE, 1 kern) — ${erst.status}, ${kernAnzahl(workflowA)}`)
      const zweit = await gibFreiUndWarte('a', workflowA)
      if (zweit) {
        pruefe(
          zweit.status === 'KLAERUNG_ERFORDERLICH' && kernAnzahl(workflowA) === 1 && (zweit.grund ?? '').includes('Die Bau-Stufe hatte ihre eine automatische Korrekturrunde schon'),
          '(a) zweiter BLOCKIERT (andere Befunde): KLAERUNG_ERFORDERLICH, kein zweites kern-Artefakt, Grund nennt die Grenze der Bau-Stufe.',
          `(a) zweiter Rückweg muss halten — status ${zweit.status}, kern ${kernAnzahl(workflowA)}, grund ${JSON.stringify(zweit.grund)}`
        )
      }
    }
  }

  // ── (a0) max_replans 0 ───────────────────────────────────────────────────────────────────
  {
    const id = await legeAn('a0', 0, [review('BLOCKIERT', [befund('B1', 'HOCH', 'src/a.ts:3')])])
    const daten = id && (await gibFreiUndWarte('a0', id))
    if (daten) {
      pruefe(
        daten.status === 'KLAERUNG_ERFORDERLICH' && abnahmen(id).length === 0 && (daten.grund ?? '').includes('erlaubt keine automatische Korrekturrunde'),
        '(a0) max_replans 0: kein Rückweg, KLAERUNG_ERFORDERLICH, Grund nennt die Vorlage (ohne Feldnamen).',
        `(a0) erwartet KLAERUNG ohne Abnahme mit max_replans-Grund — ${daten.status}, ${abnahmen(id).length}, ${JSON.stringify(daten.grund)}`
      )
    }
  }

  // ── (a2) AK-Verstoß bei BEREIT löst den ersten Rückweg aus ──────────────────────────────
  {
    const id = await legeAn('a2', 1, [review('BEREIT', [], AK2_VERLETZT)])
    const daten = id && (await gibFreiUndWarte('a2', id))
    if (daten) {
      pruefe(daten.status === 'WARTET_FREIGABE' && kernAnzahl(id) === 1, '(a2) BEREIT mit AK-Verstoß: erster Rückweg (kern) wie bisher.', `(a2) erwartet WARTET_FREIGABE mit 1 kern — ${daten.status}, ${kernAnzahl(id)}`)
    }
  }

  // ── (b) Halt bei Wiederholung nach menschlicher Anpassung ───────────────────────────────
  {
    const id = await legeAn('b', 1, [review('BEREIT_NACH_KORREKTUR', [befund('B1', 'HOCH', 'src/a.ts:3')]), review('BLOCKIERT', [befund('B7', 'HOCH', 'src/a.ts:40-44')])])
    const erst = id && (await gibFreiUndWarte('b', id))
    if (erst) {
      if (erst.status !== 'ABGESCHLOSSEN') befunde.push(`(b) Vorbedingung: erster Review BEREIT_NACH_KORREKTUR sollte abschließen — ${erst.status}`)
      const anpassung = await post(`/api/workflows/${encodeURIComponent(id)}/abnahme`, { ergebnis: 'ANPASSUNG_ANGEFORDERT', begruendung: 'Gate (b): bitte B1 beheben.' })
      if (anpassung.status !== 200 && anpassung.status !== 201) befunde.push(`(b) Vorbedingung POST …/abnahme: ${anpassung.status} ${await anpassung.text()}`)
      const zweit = await gibFreiUndWarte('b', id)
      if (zweit) {
        pruefe(
          zweit.status === 'KLAERUNG_ERFORDERLICH' && kernAnzahl(id) === 0 && (zweit.grund ?? '').includes('dieselben Befunde wie zuvor'),
          '(b) dieselben Befunde (Schwere + Datei, andere Zeile) nach der Anpassung: sofort Halt, kein Rückweg, Grund nennt die Wiederholung.',
          `(b) erwartet Halt wegen Wiederholung — status ${zweit.status}, kern ${kernAnzahl(id)}, grund ${JSON.stringify(zweit.grund)}`
        )
      }
    }
  }

  // ── (e) Review wiederholen nach Werkzeugausfall ─────────────────────────────────────────
  {
    const id = await legeAn('e', 1, [{ ausgang: 'FEHLGESCHLAGEN', text: '' }, review('BEREIT', [])])
    const daten = id && (await gibFreiUndWarte('e', id))
    if (daten) {
      const ausfuehrungLaufId = daten.schritte[0].lauf_id
      const abnahme = await (await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(id)}/abnahme`)).json().catch(() => ({}))
      pruefe(daten.status === 'KLAERUNG_ERFORDERLICH' && abnahme.reviewWiederholbar === true, '(e) Review FEHLGESCHLAGEN: KLAERUNG_ERFORDERLICH, GET …/abnahme reviewWiederholbar true.', `(e) erwartet KLAERUNG + reviewWiederholbar — ${daten.status}, ${abnahme.reviewWiederholbar}`)
      const reviewsVorReset = laeufe.filter((l) => l.rolle === 'code-reviewer').length
      const zurueck = await post(`/api/workflows/${encodeURIComponent(id)}/pruefer-wiederholen`)
      const zurueckKoerper = await zurueck.json().catch(() => ({}))
      await verzoegerung(200)
      const nachReset = ladeWorkflow(id)
      pruefe(laeufe.filter((l) => l.rolle === 'code-reviewer').length === reviewsVorReset, '(e) das Zurücksetzen startet keinen Review-Lauf.', '(e) POST …/pruefer-wiederholen hat einen Review-Lauf gestartet')
      pruefe(
        zurueck.status === 200 && zurueckKoerper.status === 'LAEUFT' && nachReset.schritte[1].lauf_id === null && nachReset.schritte[1].status === 'OFFEN' && nachReset.schritte[0].lauf_id === ausfuehrungLaufId && abnahmen(id).length === 0,
        '(e) POST …/pruefer-wiederholen: nur der Review ist zurückgesetzt (LAEUFT), Ausführung unverändert, keine Abnahme-Version, nichts gestartet.',
        `(e) Reset erwartet — ${zurueck.status} ${JSON.stringify(zurueckKoerper)}, Schritte ${JSON.stringify(nachReset?.schritte?.map((s) => [s.status, s.lauf_id]))}`
      )
      const ausfuehrungenVorher = laeufe.filter((l) => l.rolle === 'ausfuehrung').length
      const start = await post(`/api/workflows/${encodeURIComponent(id)}/starten`)
      const ende = start.status === 202 ? await warteAufHalt(id) : null
      pruefe(
        start.status === 202 && ende?.status === 'ABGESCHLOSSEN' && laeufe.filter((l) => l.rolle === 'ausfuehrung').length === ausfuehrungenVorher && ende.schritte[0].lauf_id === ausfuehrungLaufId,
        '(e) POST …/starten startet nur den Review; BEREIT → ABGESCHLOSSEN, kein zweiter Ausführungs-Lauf.',
        `(e) Start erwartet 202 + ABGESCHLOSSEN ohne neue Ausführung — ${start.status}, ${ende?.status}`
      )
      // (e2) Rotfall: abgeschlossener Workflow
      const rot = await post(`/api/workflows/${encodeURIComponent(id)}/pruefer-wiederholen`)
      pruefe(rot.status === 409, '(e2) abgeschlossener Workflow: POST …/pruefer-wiederholen → 409.', `(e2) erwartet 409, erhalten ${rot.status}`)
    }
  }

  // ── (e2) Rotfall: BLOCKIERT ist eine Beanstandung, kein Werkzeugausfall ────────────────
  if (workflowA !== null) {
    const rot = await post(`/api/workflows/${encodeURIComponent(workflowA)}/pruefer-wiederholen`)
    const abnahme = await (await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowA)}/abnahme`)).json().catch(() => ({}))
    pruefe(rot.status === 409 && abnahme.reviewWiederholbar === false, '(e2) Review BLOCKIERT: POST …/pruefer-wiederholen → 409, reviewWiederholbar false.', `(e2) erwartet 409/false — ${rot.status}, ${abnahme.reviewWiederholbar}`)
  }

  // ── (e4)/(e5) Regel 1k und unlesbares Ergebnis: ebenfalls wiederholbar ───────────────────
  for (const fall of [
    { kennung: 'e4', ausgang: review('BEREIT', [], AK_OK, 'Alles gut.'), text: 'Regel 1k (leere Befunde ohne Pflichtsatz)' },
    { kennung: 'e5', ausgang: { ausgang: 'ERFOLGREICH', text: 'kein JSON' }, text: 'unlesbares Ergebnis (Regel 1b)' },
  ]) {
    const id = await legeAn(fall.kennung, 1, [fall.ausgang])
    const daten = id && (await gibFreiUndWarte(fall.kennung, id))
    if (daten) {
      const abnahme = await (await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(id)}/abnahme`)).json().catch(() => ({}))
      const zurueck = await post(`/api/workflows/${encodeURIComponent(id)}/pruefer-wiederholen`)
      pruefe(
        daten.status === 'KLAERUNG_ERFORDERLICH' && abnahme.reviewWiederholbar === true && zurueck.status === 200 && kernAnzahl(id) === 0,
        `(${fall.kennung}) ${fall.text}: wiederholbar, POST …/pruefer-wiederholen → 200, kein Rückweg.`,
        `(${fall.kennung}) erwartet KLAERUNG + wiederholbar + 200 — ${daten.status}, ${abnahme.reviewWiederholbar}, ${zurueck.status}, grund ${JSON.stringify(daten.grund)}`
      )
    }
  }

  // ── (e6) 400/404 ─────────────────────────────────────────────────────────────────────────
  {
    const unzulaessig = await post('/api/workflows/a%2Fb/pruefer-wiederholen')
    const unbekannt = await post(`/api/workflows/gibt-es-nicht-${randomUUID()}/pruefer-wiederholen`)
    pruefe(unzulaessig.status === 400 && unbekannt.status === 404, '(e6) unzulässige Kennung → 400, unbekannter Workflow → 404.', `(e6) erwartet 400/404 — ${unzulaessig.status}/${unbekannt.status}`)
  }

  // ── (e3) Advisor ohne Urteil (Regel 1d) → zurück auf WARTET_FREIGABE ─────────────────────
  {
    const id = await legeAn('e3', 1, [{ ausgang: 'ERFOLGREICH', text: 'Prosa ohne Urteilszeile.' }], [SCHRITT_ADVISOR])
    const daten = id && (await gibFreiUndWarte('e3', id, 'schritt-1-advisor'))
    if (daten) {
      const zurueck = await post(`/api/workflows/${encodeURIComponent(id)}/pruefer-wiederholen`)
      const koerper = await zurueck.json().catch(() => ({}))
      const nach = ladeWorkflow(id)
      pruefe(
        daten.status === 'KLAERUNG_ERFORDERLICH' && zurueck.status === 200 && koerper.status === 'WARTET_FREIGABE' && nach.schritte[0].lauf_id === null && nach.schritte[0].freigabe_erteilt === undefined,
        '(e3) Advisor ohne Urteil: POST …/pruefer-wiederholen → WARTET_FREIGABE, Schritt zurückgesetzt, Freigabe nicht übernommen.',
        `(e3) erwartet Reset auf WARTET_FREIGABE — Halt ${daten.status}, ${zurueck.status} ${JSON.stringify(koerper)}, Schritt ${JSON.stringify(nach?.schritte?.[0])}`
      )
    }
  }

  // ── (c0) Advisor-Schema im Strict-Dialekt, Beispiele ────────────────────────────────────
  {
    const schema = JSON.parse(readFileSync('schemas/ergebnis-architecture-advisor.schema.json', 'utf-8'))
    const ebenen = []
    const sammle = (knoten, ort) => {
      if (knoten?.type === 'object' || knoten?.properties !== undefined) ebenen.push({ knoten, ort })
      for (const [name, kind] of Object.entries(knoten?.properties ?? {})) sammle(kind, `${ort}.${name}`)
      if (knoten?.items !== undefined) sammle(knoten.items, `${ort}[]`)
    }
    sammle(schema, '$')
    const strictVerstoesse = ebenen
      .filter(({ knoten }) => knoten.additionalProperties !== false || JSON.stringify([...(knoten.required ?? [])].sort()) !== JSON.stringify(Object.keys(knoten.properties ?? {}).sort()))
      .map(({ ort }) => ort)
    pruefe(ebenen.length >= 3 && strictVerstoesse.length === 0, `(c0) Advisor-Schema: ${ebenen.length} Objektebenen im Strict-Dialekt.`, `(c0) Strict-Dialekt verletzt an: ${strictVerstoesse.join(', ')} (Ebenen: ${ebenen.length})`)
    for (const [name, gueltig] of [
      ['valid-freigegeben', true],
      ['valid-ueberarbeiten', true],
      ['invalid-freigegeben-mit-befund', false],
      ['invalid-fehlendes-urteil', false],
    ]) {
      const verstoesse = validiereErgebnisAdvisor(JSON.parse(readFileSync(`schemas/examples/ergebnis-architecture-advisor.${name}.json`, 'utf-8')))
      pruefe((verstoesse.length === 0) === gueltig, `(c0) Beispiel ${name}: ${gueltig ? 'gültig' : 'abgelehnt'}.`, `(c0) Beispiel ${name}: erwartet ${gueltig ? 'gültig' : 'Verstoß'}, erhalten ${JSON.stringify(verstoesse)}`)
    }
  }

  // ── (c1) Übergang B2b-1b-1: gültiges Urteil → Freigabe der Ausführung; Argv mit --json-schema ─
  for (const fall of [
    { kennung: 'c1', urteil: 'UEBERARBEITEN', ausgang: advisor('UEBERARBEITEN', [advisorBefund('A1')]) },
    { kennung: 'c1f', urteil: 'FREIGEGEBEN', ausgang: advisor('FREIGEGEBEN', []) },
  ]) {
    const id = await legeAn(fall.kennung, 2, [fall.ausgang], [SCHRITT_ADVISOR_SCHEMA, { ...SCHRITT_AUSFUEHRUNG, nachfolger: null }])
    const daten = id && (await gibFreiUndWarte(fall.kennung, id, 'schritt-1-advisor'))
    if (daten) {
      const zurueck = await post(`/api/workflows/${encodeURIComponent(id)}/pruefer-wiederholen`)
      const lauf = laeufe.find((l) => l.workflowId === id && l.rolle === 'architecture-advisor')
      const schemaText = lauf?.aufrufEingaben?.jsonSchema
      let schemaArgv = null
      try {
        schemaArgv = JSON.parse(schemaText)
      } catch {
        schemaArgv = null
      }
      pruefe(
        daten.status === 'WARTET_FREIGABE' && daten.aktiver_schritt_id === 'schritt-1-ausfuehrung' && laeufe.filter((l) => l.workflowId === id && l.rolle === 'ausfuehrung').length === 0 && zurueck.status === 409,
        `(${fall.kennung}) gültiges ${fall.urteil}: weiter zur ZWINGEND-Freigabe der Ausführung, nichts gestartet, Prüfer nicht wiederholbar (409).`,
        `(${fall.kennung}) erwartet WARTET_FREIGABE an der Ausführung + 409 — ${daten.status}, ${daten.aktiver_schritt_id}, ${zurueck.status}, grund ${JSON.stringify(daten.grund)}`
      )
      pruefe(
        schemaArgv !== null && !('$schema' in schemaArgv) && !('$id' in schemaArgv) && JSON.stringify(schemaArgv.properties?.urteil?.enum) === JSON.stringify(['FREIGEGEBEN', 'FREIGEGEBEN_MIT_AUFLAGEN', 'UEBERARBEITEN']),
        `(${fall.kennung}) Advisor-Lauf trägt aufrufEingaben.jsonSchema (Advisor-Schema ohne $schema/$id).`,
        `(${fall.kennung}) jsonSchema am Advisor-Lauf fehlt oder falsch: ${String(schemaText).slice(0, 120)}`
      )
    }
  }

  // ── (c4) Advisor-Ergebnis verstößt gegen das Schema → Halt, Prüfer wiederholen ──────────
  {
    const id = await legeAn('c4', 2, [advisor('FREIGEGEBEN', [advisorBefund('A1')])], [SCHRITT_ADVISOR_SCHEMA, { ...SCHRITT_AUSFUEHRUNG, nachfolger: null }])
    const daten = id && (await gibFreiUndWarte('c4', id, 'schritt-1-advisor'))
    if (daten) {
      const zurueck = await post(`/api/workflows/${encodeURIComponent(id)}/pruefer-wiederholen`)
      const koerper = await zurueck.json().catch(() => ({}))
      pruefe(
        daten.status === 'KLAERUNG_ERFORDERLICH' && (daten.grund ?? '').includes('FREIGEGEBEN mit 1 Befund') && (daten.grund ?? '').includes('Prüfer wiederholen') && zurueck.status === 200 && koerper.status === 'WARTET_FREIGABE',
        '(c4) FREIGEGEBEN mit Befund: KLAERUNG_ERFORDERLICH, Grund nennt Verstoß und Ausweg; POST …/pruefer-wiederholen → WARTET_FREIGABE.',
        `(c4) erwartet KLAERUNG + Reset — ${daten.status}, ${JSON.stringify(daten.grund)}, ${zurueck.status} ${JSON.stringify(koerper)}`
      )
    }
  }


  // ── (c0b) Schemafassung = die im Spike real belegte (F-638/F-1086) ──────────────────────
  {
    const nachweis = readFileSync('features/F45/nachweise/b2b1b/spike-f1105.md', 'utf-8')
    const belegt = /SHA-256\s*`([0-9a-f]{64})`/.exec(nachweis)?.[1] ?? null
    // Zeilenenden normalisiert: ein Checkout mit CRLF ändert das Schema nicht.
    const aktuell = createHash('sha256').update(readFileSync('schemas/ergebnis-architecture-advisor.schema.json', 'utf-8').replace(/\r\n/g, '\n')).digest('hex')
    pruefe(belegt === aktuell, '(c0b) Advisor-Schema entspricht der im Spike F-1105 real belegten Fassung (SHA-256).', `(c0b) Advisor-Schema geändert (${aktuell}) gegenüber dem Spike (${belegt}) — neuer echter Lauf und neuer Wert in features/F45/nachweise/b2b1b/spike-f1105.md nötig`)
  }

  // ── (c1b)(c4b)(c4c)(c4d)(c5) weitere Advisor-Ausgänge ───────────────────────────────────
  const gueltigerText = JSON.parse(advisor('FREIGEGEBEN', []).text)
  for (const fall of [
    { kennung: 'c1b', schritte: [{ ...SCHRITT_ADVISOR, nachfolger: 'schritt-1-ausfuehrung' }], ausgang: advisor('FREIGEGEBEN', []), halt: false, text: 'Bestands-Advisor (output_schema null) mit gültigem JSON geht zur Freigabe' },
    { kennung: 'c4b', ausgang: { ausgang: 'ERFOLGREICH', text: `Hier mein Ergebnis:\n\`\`\`json\n${JSON.stringify(gueltigerText)}\n\`\`\`\n- [ ] Blockiert` }, halt: false, text: 'JSON im Codezaun mit Text drumherum wird gelesen und geht zur Freigabe' },
    { kennung: 'c4e', ausgang: { ausgang: 'ERFOLGREICH', text: `${JSON.stringify(gueltigerText)}\n\n## Status\n- [x] Freigegeben` }, halt: false, text: 'rohes JSON ohne Codezaun mit Status-Block danach wird gelesen (jsonObjektFallback) und geht zur Freigabe' },
    { kennung: 'c4c', ausgang: { ausgang: 'ERFOLGREICH', text: '' }, halt: true, muster: 'nicht lesbar', text: 'leeres Ergebnis hält an' },
    { kennung: 'c4d', ausgang: advisor('FREIGEGEBEN_MIT_AUFLAGEN', []), halt: true, muster: 'ohne Befund', text: 'MIT_AUFLAGEN ohne Befund hält mit lesbarem Grund' },
    { kennung: 'c5', ausgang: { ausgang: 'FEHLGESCHLAGEN', text: '' }, halt: true, muster: 'Ursache:', text: 'Werkzeugausfall des Advisors: der Grund nennt die Ursache' },
  ]) {
    const schritte = fall.schritte ?? [SCHRITT_ADVISOR_SCHEMA]
    const id = await legeAn(fall.kennung, 2, [fall.ausgang], [...schritte, { ...SCHRITT_AUSFUEHRUNG, nachfolger: null }])
    const daten = id && (await gibFreiUndWarte(fall.kennung, id, 'schritt-1-advisor'))
    if (daten) {
      const ok = fall.halt
        ? daten.status === 'KLAERUNG_ERFORDERLICH' && daten.aktiver_schritt_id === 'schritt-1-advisor' && (daten.grund ?? '').includes(fall.muster)
        : daten.status === 'WARTET_FREIGABE' && daten.aktiver_schritt_id === 'schritt-1-ausfuehrung'
      pruefe(ok, `(${fall.kennung}) ${fall.text}.`, `(${fall.kennung}) ${fall.text} — erhalten ${daten.status}, ${daten.aktiver_schritt_id}, grund ${JSON.stringify(daten.grund)}`)
    }
  }

  // ── (c6) zweite Sicherung in loeseAusfuehrungsEingabenAuf (an Regel 4b vorbei) ──────────
  {
    const basis = { rolle: 'architecture-advisor', worker: 'claude-code', anfragen: [{ pfad: `features/${FEATURE_ID}/feature.md`, zweck: 'Gate' }], budget: { maxElemente: 5 }, aufrufEingaben: { modell: 'gate-modell' }, auftragId: 'gate-auftrag' }
    const advisorPfad = join(INSTALL_WURZEL, 'schemas', 'ergebnis-architecture-advisor.schema.json')
    const gut = loeseAusfuehrungsEingabenAuf({ ...basis, ausgabeSchemaPfad: advisorPfad }, 'lesend', 'Gate', vorlage, fremdprojekt)
    const fremdesSchema = loeseAusfuehrungsEingabenAuf({ ...basis, rolle: 'code-reviewer', ausgabeSchemaPfad: join(INSTALL_WURZEL, 'schemas', 'ergebnis-code-reviewer.schema.json') }, 'lesend', 'Gate', vorlage, fremdprojekt)
    const kaputtOrdner = join(verzeichnis, 'schemas-kaputt')
    mkdirSync(kaputtOrdner, { recursive: true })
    writeFileSync(join(kaputtOrdner, 'ergebnis-architecture-advisor.schema.json'), '[]', 'utf8')
    const kaputt = loeseAusfuehrungsEingabenAuf({ ...basis, ausgabeSchemaPfad: join(kaputtOrdner, 'ergebnis-architecture-advisor.schema.json') }, 'lesend', 'Gate', vorlage, fremdprojekt)
    pruefe(
      gut.ok && typeof gut.eingaben.aufrufEingaben.jsonSchema === 'string' && !fremdesSchema.ok && /löst nur 'ergebnis-architecture-advisor'/.test(fremdesSchema.grund) && !kaputt.ok && /--json-schema/.test(kaputt.grund),
      "(c6) loeseAusfuehrungsEingabenAuf: Advisor-Schema → jsonSchema; 'ergebnis-code-reviewer' an claude-code → abgelehnt (zweite Sicherung); unlesbares Schema → abgelehnt mit Grund.",
      `(c6) erwartet ok/abgelehnt/abgelehnt — ${gut.ok}, ${JSON.stringify(fremdesSchema)}, ${JSON.stringify(kaputt)}`
    )
  }

  // ── (e8) aufrufEingaben.jsonSchema im Body von POST /api/laeufe → 400 ───────────────────
  {
    const antwort = await post('/api/laeufe', { laufId: randomUUID(), auftragId: 'gate-auftrag', werkzeugsatz: 'lesend', rolle: 'ausfuehrung', anfragen: [{ pfad: `features/${FEATURE_ID}/feature.md` }], budget: { maxElemente: 5 }, aufrufEingaben: { modell: 'gate-modell', jsonSchema: '{"type":"object"}' } })
    const koerper = await antwort.json().catch(() => ({}))
    pruefe(antwort.status === 400 && /jsonSchema/.test(koerper.grund ?? ''), '(e8) POST /api/laeufe mit aufrufEingaben.jsonSchema → 400 (nur serverseitig gesetzt).', `(e8) erwartet 400 mit Grund — ${antwort.status} ${JSON.stringify(koerper)}`)
  }

  // ── (c1) Läufe ohne Schema am Schritt tragen kein jsonSchema (Bestands-Advisor aus (e3), Ausführungen) ─
  {
    const ohneSchema = laeufe.filter((l) => l.rolle === 'ausfuehrung' || (l.rolle === 'architecture-advisor' && ladeWorkflow(l.workflowId)?.schritte?.[0]?.output_schema === null))
    const mitAdvisorOhneSchema = ohneSchema.some((l) => l.rolle === 'architecture-advisor')
    pruefe(
      mitAdvisorOhneSchema && ohneSchema.every((l) => l.aufrufEingaben?.jsonSchema === undefined),
      `(c1) ${ohneSchema.length} Läufe ohne Schema am Schritt (Bestands-Advisor, Ausführungen) tragen kein jsonSchema — Argv bitgleich.`,
      `(c1) Lauf ohne Schema am Schritt trägt jsonSchema, oder kein Bestands-Advisor gelaufen (${mitAdvisorOhneSchema})`
    )
  }

  // ── (e7) F-1104 (8): 409 bei aktivem Lauf ───────────────────────────────────────────────
  {
    const wartend = await legeAn('e7', 1, [{ ausgang: 'FEHLGESCHLAGEN', text: '' }])
    const erst = wartend && (await gibFreiUndWarte('e7', wartend))
    const laufend = await legeAn('e7b', 1, [])
    if (erst && laufend) {
      let loesen = () => {}
      blockade.warten = new Promise((resolve) => {
        loesen = resolve
      })
      aktiv.workflowId = laufend
      await post(`/api/workflows/${encodeURIComponent(laufend)}/freigabe`, { schrittId: 'schritt-1-ausfuehrung', entscheidung: 'FREIGEGEBEN', begruendung: 'Gate (e7b).' })
      const laeuft = await warteBis(() => laeufe.some((l) => l.workflowId === laufend && l.rolle === 'ausfuehrung'), 4000)
      const gesperrt = await post(`/api/workflows/${encodeURIComponent(wartend)}/pruefer-wiederholen`)
      blockade.warten = null
      loesen()
      await warteAufHalt(laufend)
      const frei = await post(`/api/workflows/${encodeURIComponent(wartend)}/pruefer-wiederholen`)
      pruefe(
        laeuft && gesperrt.status === 409 && frei.status === 200,
        '(e7) POST …/pruefer-wiederholen → 409, solange ein anderer Lauf aktiv ist; danach 200.',
        `(e7) erwartet 409 bei aktivem Lauf, danach 200 — aktiv ${laeuft}, ${gesperrt.status}, ${frei.status}`
      )
    }
  }

  // ══ B2b-1b-2a „Plan v2“ (features/F45/plan-b2b1b2.md): Architekt → Advisor → Ausführung, Stack offen ══════════
  const ID_ARCH = 'schritt-0-architekt'
  const ID_ADV = 'schritt-1-advisor'
  const ID_AUSF = 'schritt-1-ausfuehrung'
  const SCHRITT_ARCHITEKT = { ...SCHRITT_ADVISOR, schritt_id: ID_ARCH, rolle: 'architekt', worker: 'codex', modell: 'gpt-6-astra', output_schema: 'ergebnis-architektur', nachfolger: ID_ADV }
  const PLAN_SCHRITTE = [
    SCHRITT_ARCHITEKT,
    { ...SCHRITT_ADVISOR_SCHEMA, eingaben: [`artefakt:ergebnis-@${ID_ARCH}`] },
    // Bestands-hoch trägt noch das Advisor-Ergebnis als Eingabe — der Rückweg entfernt es (B13).
    { ...SCHRITT_AUSFUEHRUNG, nachfolger: null, eingaben: [`artefakt:ergebnis-@${ID_ARCH}`, `artefakt:entscheidung-@${ID_ARCH}`, `artefakt:ergebnis-@${ID_ADV}`] },
  ]
  // Das Gate-Fremdprojekt hat keine CLAUDE.md ⇒ Stack offen ⇒ jeder Plan trägt die Stack-Frage (Advisor H1).
  const STACK_FRAGE = { frage: 'Welcher Stack?', optionen: [{ titel: 'TypeScript auf Node', vorteile: ['x'], nachteile: [] }, { titel: 'Python', vorteile: [], nachteile: ['x'] }], auswirkung_bestand: 'keine', empfehlung: 'TypeScript auf Node', begruendung: 'Gate.', kategorie: 'stack' }
  const NEUE_FRAGE = { frage: 'Welche Ablage?', optionen: [{ titel: 'Dateien', vorteile: ['x'], nachteile: [] }, { titel: 'SQLite', vorteile: [], nachteile: ['x'] }], auswirkung_bestand: 'keine', empfehlung: 'Dateien', begruendung: 'Gate.', kategorie: 'fachlich' }
  const plan = (marke, fragen = [STACK_FRAGE]) => ({ modus: 'feature', zusammenfassung: marke, module: [{ name: 'gate', zweck: 'Gate.', abhaengigkeiten: [] }], adr_entwuerfe: [], schema_entwuerfe: [], entscheidungen_mensch: fragen, capabilities_bedarf: [], evidenz: [{ marker: '[Fakt]', aussage: 'Gate.' }], einrichtung: [] })
  const schrittVon = (daten, id) => daten?.schritte?.find((s) => s.schritt_id === id)
  const laeufeVon = (id, rolle) => laeufe.filter((l) => l.workflowId === id && l.rolle === rolle)
  const entscheide = (id, antworten) => post(`/api/workflows/${encodeURIComponent(id)}/entscheidung`, { schrittId: ID_ARCH, antworten })
  const STACK_ANTWORT = { frage: STACK_FRAGE.frage, gewaehlt: 'TypeScript auf Node' }

  /** Bis zum Halt nach dem Advisor: Plan v1 (Stack-Frage) → Entscheidung → Freigabe Advisor. @returns { id, nachAdvisor, v1LaufId } oder null */
  async function bisNachAdvisor(kennung, maxReplans, plaene, advisorAusgaenge) {
    const id = await legeAn(kennung, maxReplans, advisorAusgaenge, PLAN_SCHRITTE)
    if (id === null) return null
    architektAusgaenge.set(id, [...plaene])
    const v1 = await gibFreiUndWarte(kennung, id, ID_ARCH)
    if (v1?.status !== 'KLAERUNG_ERFORDERLICH') {
      befunde.push(`(${kennung}) Vorbedingung: Plan v1 mit Stack-Frage hält an (Regel 1c) — ${v1?.status}, ${JSON.stringify(v1?.grund)}`)
      return null
    }
    const antwort = await entscheide(id, [STACK_ANTWORT])
    if (antwort.status !== 202) {
      befunde.push(`(${kennung}) Vorbedingung POST …/entscheidung: ${antwort.status} ${await antwort.text()}`)
      return null
    }
    const nachAdvisor = await gibFreiUndWarte(kennung, id, ID_ADV)
    return nachAdvisor === null ? null : { id, nachAdvisor, v1LaufId: schrittVon(v1, ID_ARCH).lauf_id }
  }

  // ── (c)(c2) UEBERARBEITEN → Plan v2 → Freigabe der Ausführung mit Plan v2, kein zweiter Advisor ──────────────
  let workflowC7 = null
  {
    const lage = await bisNachAdvisor('c', 2, [plan('PLAN-V1-C'), plan('PLAN-V2-C')], [advisor('UEBERARBEITEN', [advisorBefund('A1'), advisorBefund('A2')])])
    if (lage) {
      const { id, nachAdvisor: d, v1LaufId } = lage
      const arch = schrittVon(d, ID_ARCH)
      const adv = schrittVon(d, ID_ADV)
      pruefe(
        d.status === 'WARTET_FREIGABE' && d.aktiver_schritt_id === ID_ARCH && arch.lauf_id === null && arch.freigabe_erteilt === undefined && arch.rueckweg?.anlass_schritt_id === ID_ADV && arch.rueckweg.anlass_lauf_id === adv.lauf_id && arch.rueckweg.vorheriger_lauf_id === v1LaufId && (d.grund ?? '').includes('Plan v2: Der Architekt überarbeitet den Plan mit 2 Befund(en) des Advisors'),
        '(c) UEBERARBEITEN: im selben Schreibvorgang Rückweg der Plan-Stufe — Architekt OFFEN mit rueckweg, WARTET_FREIGABE am Architekten, Grund nennt Plan v2.',
        `(c) Rückweg erwartet — ${d.status}, ${d.aktiver_schritt_id}, ${JSON.stringify(arch)}, grund ${JSON.stringify(d.grund)}`
      )
      pruefe(!schrittVon(d, ID_AUSF).eingaben.includes(`artefakt:ergebnis-@${ID_ADV}`), '(c) B13: die Ausführung verliert die Eingabe des Advisor-Ergebnisses.', `(c) Ausführung trägt noch das Advisor-Ergebnis: ${JSON.stringify(schrittVon(d, ID_AUSF).eingaben)}`)
      const v2 = await gibFreiUndWarte('c', id, ID_ARCH)
      const v2Lauf = laeufeVon(id, 'architekt').at(-1)
      pruefe(
        laeufeVon(id, 'architekt').length === 2 && v2Lauf.auftragstext.includes('PLAN-V1-C') && v2Lauf.auftragstext.includes('A1 [HOCH, FAKT]') && v2Lauf.auftragstext.includes('A2 [HOCH, FAKT]') && v2Lauf.auftragstext.includes('Welcher Stack? → TypeScript auf Node') && v2Lauf.auftragstext.includes('wortgleich'),
        '(c) der Architekt läuft genau einmal erneut — Auftragstext mit Plan v1, allen Befunden, Stefans Antwort und der Stack-Regel.',
        `(c) Plan-v2-Auftrag unvollständig (Läufe ${laeufeVon(id, 'architekt').length}): ${String(v2Lauf?.auftragstext).slice(-600)}`
      )
      if (v2) {
        pruefe(
          v2.status === 'WARTET_FREIGABE' && v2.aktiver_schritt_id === ID_AUSF && (v2.grund ?? '').includes('Plan v2 liegt vor; der Advisor prüft ihn nicht erneut'),
          '(c) nach Plan v2 (Stack-Frage wortgleich wiederholt, schon beantwortet): weiter zur Freigabe der Ausführung, Grund sagt es.',
          `(c) erwartet WARTET_FREIGABE an der Ausführung — ${v2.status}, ${v2.aktiver_schritt_id}, ${JSON.stringify(v2.grund)}`
        )
        pruefe(laeufeVon(id, 'architecture-advisor').length === 1 && schrittVon(v2, ID_ADV).lauf_id === adv.lauf_id, '(c2) nach Plan v2 kein zweiter Advisor-Lauf, Advisor-lauf_id unverändert.', `(c2) Advisor erneut gelaufen: ${laeufeVon(id, 'architecture-advisor').length}`)
        const v2LaufId = schrittVon(v2, ID_ARCH).lauf_id
        await gibFreiUndWarte('c', id, ID_AUSF)
        const pfade = laeufeVon(id, 'ausfuehrung').at(-1)?.anfragen.map((a) => a.pfad) ?? []
        pruefe(
          pfade.includes(`artefakt:ergebnis-${v2LaufId}`) && !pfade.includes(`artefakt:ergebnis-${v1LaufId}`) && !pfade.includes(`artefakt:ergebnis-${adv.lauf_id}`),
          '(c) die Ausführung bekommt Plan v2 — nicht Plan v1, nicht das Advisor-Ergebnis.',
          `(c) Eingaben der Ausführung: ${JSON.stringify(pfade)}`
        )
      }
      const zweiterVersuch = ermittlePlanRueckweg({ schritte: ladeWorkflow(id).schritte, maxReplans: 2, advisorSchrittId: ID_ADV, urteil: 'UEBERARBEITEN', befundAnzahl: 1, kernVersionen: 0 })
      pruefe(!zweiterVersuch.ausloesen && zweiterVersuch.art === 'grenze', '(c2) pure Gegenprobe: mit Plan v2 am Architekten ist der Rückweg der Plan-Stufe gesperrt.', `(c2) Gegenprobe: ${JSON.stringify(zweiterVersuch)}`)
    }
  }

  // ── (c3) MIT_AUFLAGEN löst denselben Rückweg aus; max_replans 0 sperrt ihn mit Grund ───────────────────────
  {
    const auflagen = await bisNachAdvisor('c3', 2, [plan('PLAN-V1-C3')], [advisor('FREIGEGEBEN_MIT_AUFLAGEN', [advisorBefund('A1')])])
    if (auflagen) {
      const d = auflagen.nachAdvisor
      pruefe(d.status === 'WARTET_FREIGABE' && d.aktiver_schritt_id === ID_ARCH && schrittVon(d, ID_ARCH).rueckweg !== undefined, '(c3) FREIGEGEBEN_MIT_AUFLAGEN: derselbe Rückweg (Freigabe des Architekten für Plan v2).', `(c3) erwartet Rückweg — ${d.status}, ${d.aktiver_schritt_id}`)
    }
    const gesperrt = await bisNachAdvisor('c3b', 0, [plan('PLAN-V1-C3B')], [advisor('UEBERARBEITEN', [advisorBefund('A1')])])
    if (gesperrt) {
      const d = gesperrt.nachAdvisor
      pruefe(
        d.status === 'WARTET_FREIGABE' && d.aktiver_schritt_id === ID_AUSF && schrittVon(d, ID_ARCH).rueckweg === undefined && (d.grund ?? '').includes('Advisor: Urteil „überarbeiten“ mit 1 Befund(en). Kein Plan v2: Die Vorlage dieses Ablaufs erlaubt keine automatische Korrekturrunde.'),
        '(c3) max_replans 0: kein Plan v2, weiter zur Freigabe der Ausführung, Grund nennt Urteil, Befunde und Grenze (Entscheidung Stefan A2).',
        `(c3) erwartet Freigabe der Ausführung mit Grund — ${d.status}, ${d.aktiver_schritt_id}, ${JSON.stringify(d.grund)}`
      )
    }
  }

  // ── (c7) Plan v2 wiederholt die Stack-Frage und stellt eine neue → nur die neue ist offen ─────────────────
  {
    const lage = await bisNachAdvisor('c7', 2, [plan('PLAN-V1-C7'), plan('PLAN-V2-C7', [STACK_FRAGE, NEUE_FRAGE])], [advisor('UEBERARBEITEN', [advisorBefund('A1')])])
    if (lage) {
      const { id } = lage
      workflowC7 = id
      const v2 = await gibFreiUndWarte('c7', id, ID_ARCH)
      const detail = await (await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(id)}`)).json().catch(() => ({}))
      const fragen = detail.architekturEntscheidung?.fragen?.map((f) => f.frage) ?? []
      pruefe(
        v2?.status === 'KLAERUNG_ERFORDERLICH' && v2.aktiver_schritt_id === ID_ARCH && (v2.grund ?? '').includes('1 offene Frage') && JSON.stringify(fragen) === JSON.stringify([NEUE_FRAGE.frage]),
        '(c7) Plan v2 mit neuer Frage: Halt (Regel 1c) nur für die neue Frage, GET-Detail nennt nur sie.',
        `(c7) erwartet Halt mit 1 offener Frage — ${v2?.status}, ${JSON.stringify(v2?.grund)}, fragen ${JSON.stringify(fragen)}`
      )
      const antwort = await entscheide(id, [{ frage: NEUE_FRAGE.frage, gewaehlt: 'SQLite' }])
      const nach = ladeWorkflow(id)
      pruefe(
        antwort.status === 202 && nach.status === 'WARTET_FREIGABE' && nach.aktiver_schritt_id === ID_AUSF && laeufeVon(id, 'architecture-advisor').length === 1 && (nach.grund ?? '').includes('Plan v2 liegt vor'),
        '(c7) POST …/entscheidung nur mit der neuen Antwort → Freigabe der Ausführung, kein zweiter Advisor, Grund sagt es.',
        `(c7) erwartet 202 + WARTET_FREIGABE an der Ausführung — ${antwort.status}, ${nach.status}, ${nach.aktiver_schritt_id}, ${JSON.stringify(nach.grund)}`
      )
      await gibFreiUndWarte('c7', id, ID_AUSF)
      const inhalt = laeufeVon(id, 'ausfuehrung').at(-1)?.anfragen.find((a) => a.pfad.startsWith('artefakt:entscheidung-'))?.inhalt ?? ''
      pruefe(inhalt.includes('Welcher Stack? → TypeScript auf Node') && inhalt.includes('Welche Ablage? → SQLite'), '(c7) entscheidung-@ der Ausführung enthält die Antwort zu Plan v1 und die zu Plan v2.', `(c7) Entscheidung der Ausführung: ${JSON.stringify(inhalt)}`)
      // D1: ein Halt am Architekten ohne offene Frage ist keine Entscheidung — 409, keine leere Entscheidung.
      const fassung = ladeWorkflow(id)
      registriereWorkflow({ ...fassung, status: 'KLAERUNG_ERFORDERLICH', aktiver_schritt_id: ID_ARCH, grund: 'Gate (D1).' }, profilReferenz, ladeOptionen)
      const leer = await entscheide(id, [])
      const leerGrund = (await leer.json().catch(() => ({}))).grund ?? ''
      pruefe(leer.status === 409 && leerGrund === 'Am Architekten ist keine Frage offen — es gibt nichts zu entscheiden.', '(c7/D1) POST …/entscheidung ohne offene Frage → 409 mit lesbarem Grund (ohne Feldnamen).', `(c7/D1) erwartet 409 mit lesbarem Grund, erhalten ${leer.status} ${JSON.stringify(leerGrund)}`)
    }
  }

  // ── (c11) Plan v2 wiederholt nur die Stack-Frage → kein Halt ─────────────────────────────────────────────
  {
    const lage = await bisNachAdvisor('c11', 2, [plan('PLAN-V1-C11'), plan('PLAN-V2-C11')], [advisor('UEBERARBEITEN', [advisorBefund('A1')])])
    const v2 = lage && (await gibFreiUndWarte('c11', lage.id, ID_ARCH))
    if (v2) {
      pruefe(v2.status === 'WARTET_FREIGABE' && v2.aktiver_schritt_id === ID_AUSF, '(c11) Plan v2 mit wortgleicher Stack-Frage: kein erneuter Halt, weiter zur Freigabe der Ausführung.', `(c11) erwartet WARTET_FREIGABE an der Ausführung — ${v2.status}, ${JSON.stringify(v2.grund)}`)
    }
  }

  // ── (d) FREIGEGEBEN → kein zweiter Architekt-Lauf, Ausführung bekommt Plan v1 ──────────────────────────────
  {
    const lage = await bisNachAdvisor('d', 2, [plan('PLAN-V1-D')], [advisor('FREIGEGEBEN', [])])
    if (lage) {
      const { id, nachAdvisor: d, v1LaufId } = lage
      pruefe(
        d.status === 'WARTET_FREIGABE' && d.aktiver_schritt_id === ID_AUSF && schrittVon(d, ID_ARCH).rueckweg === undefined && !(d.grund ?? '').includes('Plan v2'),
        '(d) FREIGEGEBEN: direkt zur Freigabe der Ausführung, kein Rückweg, kein Plan-v2-Satz.',
        `(d) erwartet Freigabe der Ausführung — ${d.status}, ${d.aktiver_schritt_id}, ${JSON.stringify(d.grund)}`
      )
      await gibFreiUndWarte('d', id, ID_AUSF)
      const pfade = laeufeVon(id, 'ausfuehrung').at(-1)?.anfragen.map((a) => a.pfad) ?? []
      pruefe(laeufeVon(id, 'architekt').length === 1 && pfade.includes(`artefakt:ergebnis-${v1LaufId}`), '(d) kein zweiter Architekt-Lauf; die Ausführung bekommt Plan v1.', `(d) Architekt-Läufe ${laeufeVon(id, 'architekt').length}, Eingaben ${JSON.stringify(pfade)}`)
    }
  }

  // ── (c9) rueckweg gehört dem Server: Body-Wert verworfen, gespeicherter übernommen ───────────────────────────
  if (workflowC7 !== null) {
    const fassung = ladeWorkflow(workflowC7)
    const echt = schrittVon(fassung, ID_ARCH).rueckweg
    const gefaelscht = { ...echt, anlass_lauf_id: 'gefaelscht' }
    const koerper = { ...fassung, schritte: fassung.schritte.map((s) => (s.schritt_id === ID_ARCH ? { ...s, rueckweg: gefaelscht } : s)) }
    const neueFassung = await post('/api/workflows', koerper)
    const neueId = `f45-b2b1-c9-${randomUUID()}`
    const neu = await post('/api/workflows', { ...koerper, workflow_id: neueId })
    pruefe(
      (neueFassung.status === 200 || neueFassung.status === 201) && JSON.stringify(schrittVon(ladeWorkflow(workflowC7), ID_ARCH).rueckweg) === JSON.stringify(echt) && (neu.status === 200 || neu.status === 201) && schrittVon(ladeWorkflow(neueId), ID_ARCH)?.rueckweg === undefined,
      '(c9) POST /api/workflows: neue Fassung behält den gespeicherten Rückweg (Body-Wert verworfen); ein neuer Ablauf bekommt keinen.',
      `(c9) erwartet Übernahme/Verwerfen — ${neueFassung.status} ${await neueFassung.text()}, ${JSON.stringify(schrittVon(ladeWorkflow(workflowC7), ID_ARCH).rueckweg)}, neu ${neu.status} ${await neu.text()}`
    )
  }

  // ── (c10) Plan v1 fehlt beim Start des Architekten v2 → Start abgelehnt, Ausweg im Grund ──────────────────
  {
    const id = await legeAn('c10', 2, [], [
      { ...SCHRITT_ARCHITEKT, rueckweg: { anlass_schritt_id: ID_ADV, anlass_lauf_id: 'gibt-es-nicht-adv', vorheriger_lauf_id: 'gibt-es-nicht-v1' } },
      { ...PLAN_SCHRITTE[1], status: 'ERFOLGREICH', lauf_id: 'gibt-es-nicht-adv' },
      PLAN_SCHRITTE[2],
    ])
    if (id) {
      aktiv.workflowId = id
      const antwort = await post(`/api/workflows/${encodeURIComponent(id)}/freigabe`, { schrittId: ID_ARCH, entscheidung: 'FREIGEGEBEN', begruendung: 'Gate (c10).' })
      const koerper = await antwort.json().catch(() => ({}))
      pruefe(
        antwort.status === 409 && (koerper.grund ?? '').includes('Plan v1 des Architekten ist nicht lesbar.') && /neu an/.test(koerper.grund ?? '') && laeufeVon(id, 'architekt').length === 0,
        '(c10) Plan v1 nicht lesbar: der v2-Start wird abgelehnt (409), der Grund nennt den Ausweg, kein Lauf.',
        `(c10) erwartet 409 ohne Lauf — ${antwort.status} ${JSON.stringify(koerper)}, Läufe ${laeufeVon(id, 'architekt').length}`
      )
    }
  }

  // ── (c12) Advisor seit dem Rückweg zurückgesetzt → kein Sprung, er prüft Plan v2; danach Grenze der Plan-Stufe ─
  {
    const lage = await bisNachAdvisor('c12', 2, [plan('PLAN-V1-C12'), plan('PLAN-V2-C12')], [advisor('UEBERARBEITEN', [advisorBefund('A1')]), advisor('UEBERARBEITEN', [advisorBefund('A9')])])
    if (lage) {
      const { id } = lage
      const fassung = ladeWorkflow(id)
      // Wie eine Reparatur, die den Advisor zurücksetzt (der Rückweg am Architekten bleibt serverseitig).
      registriereWorkflow({ ...fassung, schritte: fassung.schritte.map((s) => (s.schritt_id === ID_ADV ? (({ freigabe_erteilt: _f, ...rest }) => ({ ...rest, status: 'OFFEN', lauf_id: null }))(s) : s)) }, profilReferenz, ladeOptionen)
      const v2 = await gibFreiUndWarte('c12', id, ID_ARCH)
      pruefe(v2?.status === 'WARTET_FREIGABE' && v2.aktiver_schritt_id === ID_ADV, '(c12) Advisor zurückgesetzt: nach Plan v2 wartet der Advisor (kein Sprung).', `(c12) erwartet Freigabe des Advisors — ${v2?.status}, ${v2?.aktiver_schritt_id}`)
      const zweit = v2 && (await gibFreiUndWarte('c12', id, ID_ADV))
      if (zweit) {
        pruefe(
          zweit.status === 'WARTET_FREIGABE' && zweit.aktiver_schritt_id === ID_AUSF && laeufeVon(id, 'architekt').length === 2 && (zweit.grund ?? '').includes('Kein Plan v2: Die Plan-Stufe hatte ihre eine automatische Korrekturrunde schon.'),
          '(c12) zweites UEBERARBEITEN: kein dritter Architekt-Lauf, Freigabe der Ausführung, Grund nennt die Grenze der Plan-Stufe.',
          `(c12) erwartet Grenze — ${zweit.status}, ${zweit.aktiver_schritt_id}, Architekt-Läufe ${laeufeVon(id, 'architekt').length}, ${JSON.stringify(zweit.grund)}`
        )
      }
    }
  }

  // ── (c13) Plan v2 bringt eine andere Einrichtungsliste → die Ausführung folgt der von Plan v2 (qa 1, Advisor N5) ──
  {
    const einrichtungPlan = (marke, schritt) => ({ ...plan(marke), einrichtung: [{ schritt, wann: 'vor_dem_bau' }] })
    const lage = await bisNachAdvisor('c13', 2, [einrichtungPlan('PLAN-V1-C13', 'Zugang A einrichten'), einrichtungPlan('PLAN-V2-C13', 'Zugang B einrichten')], [advisor('UEBERARBEITEN', [advisorBefund('A1')])])
    const v2 = lage && (await gibFreiUndWarte('c13', lage.id, ID_ARCH))
    if (v2) {
      aktiv.workflowId = lage.id
      const antwort = await post(`/api/workflows/${encodeURIComponent(lage.id)}/freigabe`, { schrittId: ID_AUSF, entscheidung: 'FREIGEGEBEN', begruendung: 'Gate (c13).' })
      const grund = (await antwort.json().catch(() => ({}))).grund ?? ''
      pruefe(
        antwort.status === 409 && grund.includes('Zugang B einrichten') && !grund.includes('Zugang A einrichten') && laeufeVon(lage.id, 'ausfuehrung').length === 0,
        '(c13) die Einrichtung vor dem Bau folgt Plan v2: offen ist der Eintrag aus Plan v2, nicht der aus Plan v1; der Bau startet nicht.',
        `(c13) erwartet 409 mit dem Eintrag aus Plan v2 — ${antwort.status}, ${JSON.stringify(grund)}`
      )
    }
  }

  // ── (c14) Plan v2 scheitert → Reparaturfassung (ohne rueckweg im Body) → v2 startet erneut mit Plan v1 (qa 2) ──
  {
    const lage = await bisNachAdvisor('c14', 2, [plan('PLAN-V1-C14'), { fehlschlag: true }, plan('PLAN-V2-C14')], [advisor('UEBERARBEITEN', [advisorBefund('A1')])])
    const gescheitert = lage && (await gibFreiUndWarte('c14', lage.id, ID_ARCH))
    if (gescheitert) {
      const echt = schrittVon(gescheitert, ID_ARCH).rueckweg
      const reparatur = {
        ...gescheitert,
        status: 'OFFEN',
        grund: null,
        aktiver_schritt_id: ID_ARCH,
        schritte: gescheitert.schritte.map((s) => (s.schritt_id === ID_ARCH ? (({ rueckweg: _r, ...rest }) => ({ ...rest, status: 'OFFEN', lauf_id: null }))(s) : s)),
      }
      const antwort = await post('/api/workflows', reparatur)
      const nachReparatur = ladeWorkflow(lage.id)
      const v2 = await gibFreiUndWarte('c14', lage.id, ID_ARCH)
      const auftrag = laeufeVon(lage.id, 'architekt').at(-1)?.auftragstext ?? ''
      pruefe(
        gescheitert.status === 'KLAERUNG_ERFORDERLICH' && (antwort.status === 200 || antwort.status === 201) && JSON.stringify(schrittVon(nachReparatur, ID_ARCH).rueckweg) === JSON.stringify(echt) && auftrag.includes('PLAN-V1-C14') && v2?.status === 'WARTET_FREIGABE' && v2.aktiver_schritt_id === ID_AUSF && laeufeVon(lage.id, 'architecture-advisor').length === 1,
        '(c14) Plan v2 gescheitert → Reparaturfassung behält den Rückweg → Plan v2 erneut mit Plan v1, danach Freigabe der Ausführung ohne zweiten Advisor.',
        `(c14) erwartet Reparatur mit Rückweg — Halt ${gescheitert.status}, POST ${antwort.status}, rueckweg ${JSON.stringify(schrittVon(nachReparatur, ID_ARCH)?.rueckweg)}, danach ${v2?.status} ${v2?.aktiver_schritt_id}`
      )
    }
  }

  // ── (c10b) Advisor-Ergebnis nicht lesbar beim Start des Architekten v2 → Start abgelehnt, lesbarer Grund (qa 8) ──
  {
    const lage = await bisNachAdvisor('c10b', 2, [plan('PLAN-V1-C10B')], [advisor('UEBERARBEITEN', [advisorBefund('A1')])])
    if (lage) {
      const fassung = ladeWorkflow(lage.id)
      const arch = schrittVon(fassung, ID_ARCH)
      registriereWorkflow({ ...fassung, schritte: fassung.schritte.map((s) => (s.schritt_id === ID_ARCH ? { ...arch, rueckweg: { ...arch.rueckweg, anlass_lauf_id: 'gibt-es-nicht-adv' } } : s)) }, profilReferenz, ladeOptionen)
      const antwort = await post(`/api/workflows/${encodeURIComponent(lage.id)}/freigabe`, { schrittId: ID_ARCH, entscheidung: 'FREIGEGEBEN', begruendung: 'Gate (c10b).' })
      const grund = (await antwort.json().catch(() => ({}))).grund ?? ''
      pruefe(
        antwort.status === 409 && grund.includes('Das Ergebnis des Advisors ist nicht lesbar.') && !grund.includes('gibt-es-nicht-adv') && laeufeVon(lage.id, 'architekt').length === 1,
        '(c10b) Advisor-Ergebnis nicht lesbar: der v2-Start wird abgelehnt, der Grund ohne Lauf-Kennung, kein Lauf.',
        `(c10b) erwartet 409 ohne Kennung — ${antwort.status}, ${JSON.stringify(grund)}`
      )
    }
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
