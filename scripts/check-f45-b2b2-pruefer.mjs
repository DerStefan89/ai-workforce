#!/usr/bin/env node
/**
 * Datei: scripts/check-f45-b2b2-pruefer.mjs
 *
 * Zweck: Gate für F45 B2b-2a „Review vollständig“ (features/F45/plan-b2b2a.md, Plan v2 + Entscheidung Stefan A1 = a).
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
console.log('\n=== F45-B2b-2a-Prüfer-Check ===\n')

const STILL = () => {}
const INSTALL_WURZEL = process.cwd()
const FEATURE_ID = 'F9993'
const SPIKE_SHA256 = 'c2c3a498f2cbc3356cbec745adef00bb6eaea5f4c1dd7016382fcc5e16518bd2'
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

// Je Workflow eine Warteschlange von Review-Ausgängen; die Attrappe nimmt je Review-Lauf den nächsten.
const reviewAusgaenge = new Map()
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
  if (eingaben.rolle !== 'code-reviewer') return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  const ausgang = reviewAusgaenge.get(workflowId)?.shift() ?? { ausgang: 'ERFOLGREICH', text: 'kein Ausgang hinterlegt' }
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

/** Legt Auftrag und Workflow an und hinterlegt die Review-Ausgänge. @returns workflowId oder null */
async function legeAn(kennung, ausgaenge, review = SCHRITT_REVIEW_CODEX) {
  const antwort = await fetch(`${basisUrl}/api/features/${encodeURIComponent(FEATURE_ID)}/auftrag`, { method: 'POST' })
  const koerper = await antwort.json().catch(() => ({}))
  if (antwort.status !== 201 || typeof koerper.auftragId !== 'string') {
    befunde.push(`(${kennung}) Vorbedingung POST …/auftrag: ${antwort.status} ${JSON.stringify(koerper)}`)
    return null
  }
  const workflowId = `f45-b2b2-${kennung}-${randomUUID()}`
  registriereWorkflow(
    { workflow_schema: 'v0', workflow_id: workflowId, auftrag_id: koerper.auftragId, version: 1, ziel: 'Gate B2b-2a.', status: 'OFFEN', aktiver_schritt_id: 'schritt-1-ausfuehrung', grenzen: { max_schritte: 20, max_replans: 1 }, schritte: [SCHRITT_AUSFUEHRUNG, review] },
    profilReferenz,
    ladeOptionen
  )
  reviewAusgaenge.set(workflowId, [...ausgaenge])
  return workflowId
}

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
