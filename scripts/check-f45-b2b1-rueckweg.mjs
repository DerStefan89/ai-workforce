#!/usr/bin/env node
/**
 * Datei: scripts/check-f45-b2b1-rueckweg.mjs
 *
 * Zweck: Gate für F45 B2b-1a „Rückweg, Bau-Stufe“ (features/F45/plan-b2b1.md, Plan v2 + Nachträge). Nachweis am
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
 * Die Plan-Stufe (Fälle c/d: Advisor-Schema, Plan v2) folgt mit B2b-1b.
 *
 * Wird aufgerufen von: `npm run check`.
 *
 * Aufruf: node scripts/check-f45-b2b1-rueckweg.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ladeArtefaktVersion, listeVersionen, registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { erzeugeRequestHandler } from './leitstand-server.mjs'

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
const laeufe = [] // { workflowId?, laufId, rolle }

/** Attrappe des Workers: jede Rolle wird gezählt; Prüfer-Läufe bekommen eine echte Laufakte mit Rohstrom. */
async function attrappe(laufId, _profil, eingaben) {
  const workflowId = aktiv.workflowId
  laeufe.push({ laufId, rolle: eingaben.rolle, workflowId })
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
