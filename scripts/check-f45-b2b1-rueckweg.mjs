#!/usr/bin/env node
/**
 * Datei: scripts/check-f45-b2b1-rueckweg.mjs
 *
 * Zweck: Gate für F45 B2b-1a „Rückweg, Bau-Stufe“ (features/F45/plan-b2b1.md, Plan v2 + Nachträge) und B2b-1b-1
 * „Advisor-Schema“ (features/F45/plan-b2b1b.md, Plan v2 + Entscheidungen Stefan). Nachweis am
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
 * Plan v2 (Rückweg der Plan-Stufe, Fälle c/c2/c3/d) folgt mit B2b-1b-2.
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
const laeufe = [] // { workflowId?, laufId, rolle, aufrufEingaben }
// F-1104 (8): solange gesetzt, hält die Attrappe einen Ausführungs-Lauf offen (aktiver Lauf für die Sperrprüfung).
const blockade = { warten: null }

/** Attrappe des Workers: jede Rolle wird gezählt; Prüfer-Läufe bekommen eine echte Laufakte mit Rohstrom. */
async function attrappe(laufId, _profil, eingaben) {
  const workflowId = aktiv.workflowId
  laeufe.push({ laufId, rolle: eingaben.rolle, workflowId, aufrufEingaben: eingaben.aufrufEingaben })
  if (eingaben.rolle === 'ausfuehrung' && blockade.warten !== null) await blockade.warten
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
