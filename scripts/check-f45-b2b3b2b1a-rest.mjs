#!/usr/bin/env node
/**
 * Datei: scripts/check-f45-b2b3b2b1a-rest.mjs
 *
 * Zweck: Gate für F45 B2b-3b-2b-1a „Rückfrage-Kanal: Rest-Absicherung, mechanischer Teil“ (features/F45/plan-b2b3b2b1a-v2.md mit
 * Nachtrag, Advisor features/F45/advisor-b2b3b2b1.md und -delta.md). Der Kanal bleibt aus; eingeschaltet wird er hier nur über die
 * Option `rueckfrage` des Gate-Servers. Neue Exporte werden je Fall geprüft, damit jeder Fall gegen main (Rot-Nachweis per git
 * archive) seinen eigenen Befund zeigt statt eines Gesamtabbruchs.
 *
 * Prüft:
 * (r2) F-1128 R2, echter Server im Arbeitsordner: Stefan lehnt im Lauf eine Bash-Rückfrage ab, die Klassifikation kennt sie nicht
 *      (fehlt in permission_denials, kein abgelehnt_durch_stefan) ⇒ alt.txt bleibt, LOESCHLISTE_AUSGESETZT; Gegenprobe ohne
 *      Ablehnung ⇒ gelöscht.
 * (r3) F-1128 R3: angehängte gefälschte Protokoll-Version ⇒ ermittleRueckfrageProtokoll mit laufOptionen.rueckfrageZugang ⇒ null und
 *      ein Eintrag „nicht bestätigt“ dieses Laufs in GET /api/startfehler. Zugang vor oeffneLauf gebaut, danach wirksam (Advisor B6);
 *      Zugang für einen unbekannten Lauf wirft nicht.
 * (g)  Speichergröße: 200 von Stefan abgelehnte lange Bash-Befehle über Vermittlung und echten Schreiber ⇒ alle Versionen zusammen
 *      < 5 MB (vorher ~43 MB); zusammengesetztes Protokoll passt zum Speicher und ergibt ERFOLGREICH.
 * (b7) E-B7: herkunftDerAntwort (same-origin bzw. passender Origin ⇒ browser, sonst nicht_browser); über den echten Server
 *      geschriebene Antworten tragen herkunft im Protokoll; das Schema kennt das Feld.
 * (f)  Grenzen: Produktaufrufer übergeben `rueckfrage` nur über rueckfrageOptionFuer (seit B2b-3b-2b-2a-1) (gegen main grün,
 *      Invariante); ARCHITECTURE §3 nennt E-B7 (gegen main rot).
 *
 * Wird aufgerufen von: `npm run check:gates` (und damit `npm run check`).
 *
 * Nachgezogen in B2b-3b-2b-1b (F-1128 R1, features/F45/plan-b2b3b2b1b-v2.md): eine Ablehnung durch Stefan zählt nur noch, wenn
 * das tool_result ihrer ID genau den eindeutigen Ablehnungstext trägt — (g) und die (r3)-Gegenprobe schreiben deshalb passende
 * tool_result-Zeilen in den Rohstrom (Text aus dem Long-Poll), die Fälschung t3 trägt einen gültigen ablehnung_hash (sonst scheiterte
 * sie am Validator statt an der Länge).
 *
 * Wichtig: (f) erkennt die Option `rueckfrage` nur als Literal in der Argumentliste von erzeugeRequestHandler( (DEKLARIERT, Muster
 * Gate b2b3b2a (f)). (g) misst die Bytes vor jeder Exportprüfung, damit der Größenbefund auch gegen main erscheint.
 *
 * Aufruf: node scripts/check-f45-b2b3b2b1a-rest.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { kanonischesJson, sha256Hex } from '../src/checkpoint-store/index.ts'
import { ladeArtefaktVersion, listeVersionen, registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { klassifiziereLauf } from '../src/result-evaluator/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { pruefeKanalNurUeberOptIn } from './_rueckfrage-aus-pruefung.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { erzeugeRueckfrageProtokollSchreiber } from './leitstand/rueckfrage-protokoll.mjs'
import { erzeugeRequestHandler } from './leitstand-server.mjs'

const befunde = []
console.log('\n=== F45-B2b-3b-2b-1a-Rest-Check ===\n')

const aufraeumen = []
const dienste = []
const PROFIL = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
const STILL = { schreiber: () => {} }

/** Meldet einen Fall: ✓ bei erfüllter Bedingung, sonst ein Befund. */
function pruefe(bedingung, ok, fehler) {
  if (bedingung) console.log(`  ✓ ${ok}`)
  else befunde.push(fehler)
}

/** Lädt ein Modul; ein Ladefehler wird zum Objekt { fehler } statt zu werfen. */
async function lade(pfad) {
  try {
    return await import(pfad)
  } catch (fehler) {
    return { fehler: fehler.message.split('\n')[0] }
  }
}

const verzoegerung = (ms) => new Promise((r) => setTimeout(r, ms))
/** Wartet, bis pruefen() einen wahren Wert liefert (höchstens maxMs), und gibt ihn zurück. */
async function warteBis(pruefen, maxMs = 20000) {
  const ende = Date.now() + maxMs
  let wert = await pruefen()
  while (!wert && Date.now() < ende) {
    await verzoegerung(25)
    wert = await pruefen()
  }
  return wert
}

/** Summe der Dateigrößen unter einem Verzeichnis (rekursiv). */
const bytesUnter = (ordner) =>
  existsSync(ordner)
    ? readdirSync(ordner, { recursive: true })
        .map((d) => join(ordner, d))
        .filter((d) => statSync(d).isFile())
        .reduce((summe, d) => summe + statSync(d).size, 0)
    : 0

const protokollModul = await lade('../src/rueckfrage/protokoll.ts')
const controllerModul = await lade('../src/execution-controller/index.ts')
const vermittlungModul = await lade('./leitstand/rueckfrage-vermittlung.mjs')
const arbeitsordnerModul = await lade('../src/arbeitsordner/index.ts')

const KLASS_BASIS = join(tmpdir(), `f45-b2b3b2b1a-klass-${randomUUID().slice(0, 8)}`)
aufraeumen.push(KLASS_BASIS)

/**
 * Klassifiziert einen Lauf mit den gegebenen permission_denials und dem gegebenen Protokoll (Feld rueckfragen gesetzt).
 * @param laufId - Lauf (der Abgleich prüft lauf_id)
 * @param denials - permission_denials
 * @param rueckfragen - daten oder null
 * @param texte - B2b-3b-2b-1b: Map tool_use_id → Text des tool_result (is_error), vor der result-Zeile im Rohstrom
 * @returns Ergebnis von klassifiziereLauf ohne Wirkungsmarke
 */
function klassifiziere(laufId, denials, rueckfragen, texte = new Map()) {
  const ergebnisZeilen = [...texte].map(([id, text]) => JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, content: text, is_error: true }] } }))
  const roh = { stdout: [...ergebnisZeilen, JSON.stringify({ type: 'result', is_error: false, result: 'fertig', permission_denials: denials })].join('\n'), stderr: '', exitCode: 0 }
  const rohPfad = join(KLASS_BASIS, 'roh', `${laufId}-${randomUUID().slice(0, 8)}.json`)
  mkdirSync(join(KLASS_BASIS, 'roh'), { recursive: true })
  const inhalt = JSON.stringify(roh)
  writeFileSync(rohPfad, inhalt)
  const laufakte = { laufakte_schema: 'v0', lauf_id: laufId, werkzeug_version_deklariert: '2.1.241', berechtigungskontext: 'profil-standard', arbeitsverzeichnis_pfad: process.cwd(), modell_beobachtet: null, beobachtungsbasis_vollstaendig: true, rohstrom_referenz: { pfad: rohPfad, inhalts_hash: sha256Hex(inhalt) }, erstellt_am: '2026-10-16T00:00:00.000Z' }
  const { wirkungsmarke: _w, ...rest } = klassifiziereLauf(laufId, PROFIL, { laufakte, rueckfragen }, { basisVerzeichnis: join(KLASS_BASIS, `kz-${randomUUID().slice(0, 8)}`), schreiber: () => {} })
  return rest
}

const denial = (id, input, toolName = 'Bash') => ({ tool_name: toolName, tool_use_id: id, tool_input: input })
/** Ablehnungstext der gefälschten Version t3 (B2b-3b-2b-1b: gültiger Hash, damit die Fälschung an der Länge scheitert). */
const TEXT_T3 = 'Stefan hat den Befehl abgelehnt. (Ref t3)'

try {
  // ── (g) Speichergröße: nur Zuwachs je Version ──────────────────────────────────────────────────────────────────────────
  if (typeof vermittlungModul.erzeugeRueckfrageVermittlung !== 'function') befunde.push(`(g) Vermittlung nicht ladbar: ${vermittlungModul.fehler ?? 'erzeugeRueckfrageVermittlung fehlt'}`)
  else {
    const basis = join(tmpdir(), `f45-b2b3b2b1a-g-${randomUUID().slice(0, 8)}`)
    aufraeumen.push(basis)
    const laufId = `g-${randomUUID()}`
    const v = vermittlungModul.erzeugeRueckfrageVermittlung({ protokolliere: erzeugeRueckfrageProtokollSchreiber({ profilReferenz: PROFIL, basisVerzeichnis: basis, home: homedir(), temp: tmpdir() }) })
    v.oeffneLauf(laufId, { token: 'c'.repeat(64), arbeitsordner: join(basis, 'arbeit'), werkzeugNamen: ['Bash'] })
    const inputs = []
    const texte = new Map()
    for (let i = 0; i < 200; i++) {
      const input = { command: `npm run x${i} -- ${'abcdefghij'.repeat(189)}` }
      inputs.push(input)
      const gestellt = v.stelle(laufId, { art: 'rechte', tool_name: 'Bash', input, tool_use_id: `g${i}` })
      v.beantworte(gestellt.id, { entscheidung: 'ablehnen' })
      texte.set(`g${i}`, (await v.warte(laufId, gestellt.id)).entscheidung?.message)
    }
    const mb = bytesUnter(basis) / 1e6
    const fehlt = [typeof controllerModul.leseRueckfrageProtokoll !== 'function' ? 'leseRueckfrageProtokoll' : null, typeof protokollModul.bestaetigeProtokoll !== 'function' ? 'bestaetigeProtokoll' : null, typeof v.zugang !== 'function' ? 'Vermittlung.zugang' : null].filter(Boolean)
    let ergebnis = null
    let bestaetigt = null
    if (fehlt.length === 0) {
      const daten = controllerModul.leseRueckfrageProtokoll(laufId, basis)
      bestaetigt = protokollModul.bestaetigeProtokoll(daten, v.zugang(laufId, () => {}).speicher())
      ergebnis = klassifiziere(
        laufId,
        inputs.map((input, i) => denial(`g${i}`, input)),
        bestaetigt.ok ? bestaetigt.daten : null,
        texte
      ).ergebnis
    }
    v.beendeLauf(laufId)
    pruefe(
      mb < 5 && fehlt.length === 0 && bestaetigt?.ok === true && ergebnis === 'ERFOLGREICH',
      `(g) 200 lange Stefan-Ablehnungen ⇒ ${mb.toFixed(2)} MB (< 5 MB, vorher ~43 MB); zusammengesetztes Protokoll passt zum Speicher ⇒ ERFOLGREICH.`,
      `(g) ${mb.toFixed(2)} MB (Grenze 5 MB); fehlt: ${fehlt.join(', ') || '–'}; bestätigt ${JSON.stringify(bestaetigt?.ok === true ? true : bestaetigt?.grund)}; Ergebnis ${ergebnis}`
    )
  }

  // ── (b7) Herkunft, rein ────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const h = vermittlungModul.herkunftDerAntwort
    if (typeof h !== 'function') befunde.push('(b7) scripts/leitstand/rueckfrage-vermittlung.mjs: herkunftDerAntwort fehlt')
    else {
      const faelle = [
        [{ 'sec-fetch-site': 'same-origin', host: '127.0.0.1:1' }, 'browser'],
        [{ origin: 'http://127.0.0.1:1', host: '127.0.0.1:1' }, 'browser'],
        [{ origin: 'http://localhost:2', host: '127.0.0.1:1' }, 'nicht_browser'],
        [{ origin: 'kein url', host: '127.0.0.1:1' }, 'nicht_browser'],
        [{ 'sec-fetch-site': 'none', host: '127.0.0.1:1' }, 'nicht_browser'],
        [{ host: '127.0.0.1:1' }, 'nicht_browser'],
        [{}, 'nicht_browser'],
      ]
      const falsch = faelle.filter(([kopf, soll]) => h(kopf) !== soll).map(([kopf, soll]) => `${JSON.stringify(kopf)} ⇒ ${h(kopf)} statt ${soll}`)
      pruefe(falsch.length === 0, '(b7) herkunftDerAntwort: same-origin bzw. passender Origin ⇒ browser; fremder/ungültiger Origin, none, ohne Kopf ⇒ nicht_browser.', `(b7) ${falsch.join('; ')}`)
    }
    const schema = JSON.parse(readFileSync('schemas/kontrollzustand-rueckfragen-payload.schema.json', 'utf8'))
    const feld = schema.properties?.eintraege?.items?.properties?.herkunft
    pruefe(
      schema.properties?.rueckfragen_schema?.const === 'v1' && schema.required?.includes('ab') && JSON.stringify(feld?.enum) === '["browser","nicht_browser"]',
      '(b7) Schema v1 kennt ab (Pflicht) und herkunft (browser | nicht_browser).',
      `(b7) Schema: rueckfragen_schema ${JSON.stringify(schema.properties?.rueckfragen_schema)}, ab Pflicht ${schema.required?.includes('ab')}, herkunft ${JSON.stringify(feld)}`
    )
  }

  // ── (r3) Zugang vor oeffneLauf, rein (Advisor B6) ──────────────────────────────────────────────────────────────────────
  if (typeof vermittlungModul.erzeugeRueckfrageVermittlung === 'function') {
    const v = vermittlungModul.erzeugeRueckfrageVermittlung({ pfadOptionen: { realpath: (p) => p } })
    if (typeof v.zugang !== 'function') befunde.push('(r3) Vermittlung.zugang fehlt')
    else {
      const gemeldet = []
      const zugang = v.zugang('r3-rein', (fehler) => gemeldet.push(fehler))
      const vorher = zugang.speicher()
      v.oeffneLauf('r3-rein', { token: 'd'.repeat(64), arbeitsordner: process.platform === 'win32' ? 'C:\\proj\\wf' : '/proj/wf', werkzeugNamen: ['Bash'] })
      v.stelle('r3-rein', { art: 'rechte', tool_name: 'Bash', input: { command: 'npm publish' }, tool_use_id: 'r1' })
      const leer = zugang.speicher()
      let unbekanntWirft = false
      try {
        const fremd = v.zugang('unbekannt', () => {
          throw new Error('melde wirft')
        })
        fremd.meldeAbweichung('x')
        unbekanntWirft = fremd.speicher() !== null
      } catch {
        unbekanntWirft = true
      }
      zugang.meldeAbweichung('Länge abweichend')
      v.beendeLauf('r3-rein')
      pruefe(
        vorher === null && Array.isArray(leer) && !unbekanntWirft && gemeldet.length === 1 && /r3-rein/.test(gemeldet[0]) && /Länge abweichend/.test(gemeldet[0]),
        '(r3) Zugang vor oeffneLauf gebaut, danach wirksam; unbekannter Lauf ⇒ speicher() null, meldeAbweichung wirft nicht.',
        `(r3) vorher ${JSON.stringify(vorher)}, nach oeffneLauf ${JSON.stringify(leer)}, unbekannt wirft ${unbekanntWirft}, gemeldet ${JSON.stringify(gemeldet)}`
      )
    }
  }

  // ── (r2)/(r3)/(b7) echter Server ───────────────────────────────────────────────────────────────────────────────────────
  {
    const git = (cwd, argumente) => execFileSync('git', argumente, { cwd, encoding: 'utf8' })
    const basis = join(tmpdir(), `f45-b2b3b2b1a-${randomUUID().slice(0, 8)}`)
    aufraeumen.push(basis)
    const repoWurzel = join(basis, 'projekt')
    mkdirSync(join(repoWurzel, '.claude'), { recursive: true })
    git(repoWurzel, ['init', '--quiet'])
    git(repoWurzel, ['config', 'user.email', 'test@example.invalid'])
    git(repoWurzel, ['config', 'user.name', 'Test'])
    git(repoWurzel, ['config', 'core.autocrlf', 'false'])
    git(repoWurzel, ['checkout', '--quiet', '-b', 'arbeit'])
    writeFileSync(join(repoWurzel, '.claude', 'settings.json'), '{}\n')
    writeFileSync(join(repoWurzel, 'README.md'), 'Zeile 1\n')
    writeFileSync(join(repoWurzel, 'alt.txt'), 'alt\n')
    git(repoWurzel, ['add', '.'])
    git(repoWurzel, ['commit', '--quiet', '-m', 'init'])
    const vorlageRoh = ladeStartvorlage('startvorlagen/beispielprojekt.json')
    const startvorlagePfad = join(basis, 'startvorlage.json')
    writeFileSync(startvorlagePfad, JSON.stringify({ ...vorlageRoh, werkzeugsaetze: { ...vorlageRoh.werkzeugsaetze, schreibend: { ...vorlageRoh.werkzeugsaetze.schreibend, erlaubte_werkzeuge: ['Read', 'Grep', 'Glob', 'Write', 'Edit', 'Bash(npm ci)'] } } }, null, 2))
    const vorlage = ladeStartvorlage(startvorlagePfad)
    const basisVerzeichnis = join(basis, 'kontrollzustand')

    const LOESCHTEXT = 'Fertig.\n\n```zu_loeschen\n{ "zu_loeschen": ["alt.txt"] }\n```\n'
    /** Je Lauf ein Verhalten (Warteschlange): { pruefen?: async (laufId, profil, eingaben, optionen) => void } */
    const verhalten = []
    const aufrufe = []
    async function attrappe(laufId, profil, eingaben, optionen) {
      const v = verhalten.shift() ?? {}
      const aufruf = { laufId, eingaben, optionen }
      aufrufe.push(aufruf)
      try {
        if (v.pruefen !== undefined) await v.pruefen(laufId, profil, eingaben, optionen)
      } catch (fehler) {
        befunde.push(`(Server) Prüfung im Lauf abgebrochen: ${fehler.stack ?? fehler}`)
      }
      const rohPfad = join(basis, `roh-${laufId}.json`)
      writeFileSync(rohPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: LOESCHTEXT }) }))
      registriereKernArtefakt(`laufakte-${laufId}`, profil, { erzeuger: 'kern', schritt: 'test' }, { worker: 'claude-code', rohstrom_referenz: { pfad: rohPfad, inhalts_hash: 'x' } }, [], { basisVerzeichnis: optionen.basisVerzeichnis, ...STILL })
      aufruf.wurzel = optionen.cwd ?? repoWurzel
      // R2: die Ablehnung fehlt in permission_denials — die Klassifikation kennt kein abgelehnt_durch_stefan.
      return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH', bypass_verdacht_anzahl: 0 }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
    }
    let handler = null
    const dienst = createServer((req, res) => handler(req, res))
    await new Promise((r) => dienst.listen(0, '127.0.0.1', r))
    dienste.push(dienst)
    const basisUrl = `http://127.0.0.1:${dienst.address().port}`
    handler = erzeugeRequestHandler({
      basisVerzeichnis,
      repoWurzel,
      startvorlagePfad,
      installWurzel: process.cwd(),
      fuehreAufgabeDurchFn: attrappe,
      arbeitsordner: true,
      arbeitsordnerNpm: async () => ({ code: 0, stdout: '', stderr: '', zeitueberschritten: false }),
      arbeitsordnerE183: () => ({ ok: true }),
      standCacheMs: 0,
      rueckfrage: { an: true, url: `${basisUrl}/api` },
    })

    /** Legt einen Ein-Schritt-Workflow 'ausfuehrung' an und startet ihn (mit Vorbereitung des Arbeitsordners). */
    async function starteAblauf() {
      const { auftragId } = await (await fetch(`${basisUrl}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: 'Gate 3b-2b-1a', auftragstext: 'Lege eine Datei an.' }) })).json()
      const workflowId = `f45-b2b3b2b1a-${randomUUID()}`
      registriereWorkflow(
        {
          workflow_schema: 'v0',
          workflow_id: workflowId,
          auftrag_id: auftragId,
          version: 1,
          ziel: 'Gate 3b-2b-1a.',
          status: 'OFFEN',
          aktiver_schritt_id: 'schritt-1-ausfuehrung',
          grenzen: { max_schritte: 6, max_replans: 1 },
          schritte: [{ schritt_id: 'schritt-1-ausfuehrung', rolle: 'ausfuehrung', werkzeugsatz: 'schreibend', worker: 'claude-code', modell: 'claude-sonnet-5', eingaben: [], output_schema: null, freigabe: 'ZWINGEND', freigabe_erteilt: true, risiko: 'Gate-Fixture.', zeitgrenze_ms: 600000, nachfolger: null, status: 'OFFEN', lauf_id: null }],
        },
        leiteProfilReferenzAb(vorlage),
        { basisVerzeichnis, ...STILL }
      )
      const starte = () => fetch(`${basisUrl}/api/workflows/${workflowId}/starten`, { method: 'POST' })
      let start = await starte()
      if ((await start.clone().json()).vorbereitung === true) {
        await warteBis(async () => (await (await fetch(`${basisUrl}/api/workflows/${workflowId}`)).json()).arbeitsordner?.status === 'BEREIT')
        start = await starte()
      }
      const lauf = await warteBis(() => aufrufe.find((a) => a.eingaben.rolle === 'ausfuehrung' && !a.gesehen))
      if (lauf) lauf.gesehen = true
      const uebersicht = lauf ? await warteBis(() => ladeArtefaktVersion(`aenderungsuebersicht-${lauf.laufId}`, undefined, { basisVerzeichnis, ...STILL })?.daten) : null
      await warteBis(async () => (await (await fetch(`${basisUrl}/api/workflows/${workflowId}`)).json()).status !== 'LAEUFT', 10000)
      return { start, lauf, uebersicht }
    }

    // Lauf A: zwei Bash-Rückfragen — t1 abgelehnt aus dem Browser (same-origin), t2 einmal erlaubt ohne Browser-Kopf; danach
    // eine gefälschte, angehängte Protokoll-Version und ermittleRueckfrageProtokoll über den Zugang des Laufs.
    const a = {}
    verhalten.push({
      pruefen: async (laufId, profil, eingaben, optionen) => {
        a.vorbedingung = eingaben.rueckfrageKanal !== undefined
        a.laufId = laufId
        const tokenKopf = { authorization: `Bearer ${eingaben.rueckfrageKanal?.token}` }
        const stelle = async (id, command) => (await (await fetch(`${basisUrl}/api/rueckfrage/anfrage`, { method: 'POST', headers: tokenKopf, body: JSON.stringify({ art: 'rechte', tool_name: 'Bash', input: { command }, tool_use_id: id }) })).json()).id
        const t1 = await stelle('t1', 'npm publish')
        a.t1 = (await fetch(`${basisUrl}/api/rueckfragen/${t1}/antwort`, { method: 'POST', headers: { 'sec-fetch-site': 'same-origin' }, body: JSON.stringify({ entscheidung: 'ablehnen' }) })).status
        // B2b-3b-2b-1b: Text der Ablehnung, wie ihn das MCP-Skript per Long-Poll holt (für die Gegenprobe alter Pfad).
        a.textT1 = (await (await fetch(`${basisUrl}/api/rueckfrage/anfrage/${t1}/warten`, { method: 'POST', headers: tokenKopf, body: '{}' })).json()).entscheidung?.message
        const t2 = await stelle('t2', 'npm test')
        a.t2 = (await fetch(`${basisUrl}/api/rueckfragen/${t2}/antwort`, { method: 'POST', body: JSON.stringify({ entscheidung: 'einmal_erlauben' }) })).status
        const lese = typeof controllerModul.leseRueckfrageProtokoll === 'function' ? controllerModul.leseRueckfrageProtokoll : () => null
        const echt = lese(laufId, optionen.basisVerzeichnis)
        a.herkunft = echt?.eintraege?.map((e) => `${e.tool_use_id}:${e.herkunft ?? '–'}`).join(',')
        if (typeof optionen.rueckfrageZugang?.speicher !== 'function' || typeof controllerModul.ermittleRueckfrageProtokoll !== 'function') {
          a.fehlt = 'laufOptionen.rueckfrageZugang (Server) bzw. ermittleRueckfrageProtokoll (Controller)'
          return
        }
        // Fälschung: angehängte Version mit ab = aktuelle Länge und stefan_abgelehnt für t3 (lief nie über den Kanal).
        const t3 = { tool_use_id: 't3', tool_name: 'Bash', input_hash: sha256Hex(kanonischesJson({ command: 'rm -rf x' })), art: 'stefan_abgelehnt', grund: 'gefälscht', zeit: '2026-10-16T10:00:00.000Z', ablehnung_hash: sha256Hex(TEXT_T3) }
        registriereKernArtefakt(`rueckfragen-${laufId}`, profil, { erzeuger: 'kern', schritt: 'rueckfrage-protokoll' }, { rueckfragen_schema: 'v1', lauf_id: laufId, ab: echt?.eintraege?.length ?? 0, eintraege: [t3] }, [], { basisVerzeichnis: optionen.basisVerzeichnis, ...STILL })
        a.ermittelt = controllerModul.ermittleRueckfrageProtokoll(laufId, optionen.basisVerzeichnis, optionen.rueckfrageZugang)
      },
    })
    const laufA = await starteAblauf()
    pruefe(laufA.lauf && a.vorbedingung, '(Vorbedingung) Ausführung im Arbeitsordner mit Rückfrage-Kanal gestartet.', `(Vorbedingung) Start ${laufA.start.status}, Lauf ${Boolean(laufA.lauf)}, Kanal ${a.vorbedingung}`)
    verhalten.push({})
    const laufB = await starteAblauf()

    // (r2)
    {
      const ausgesetzt = arbeitsordnerModul.LOESCHLISTE_AUSGESETZT
      const bleibt = laufA.lauf ? existsSync(join(laufA.lauf.wurzel, 'alt.txt')) : null
      const listeA = laufA.uebersicht?.loeschliste
      const geloescht = laufB.lauf ? !existsSync(join(laufB.lauf.wurzel, 'alt.txt')) : null
      const listeB = laufB.uebersicht?.loeschliste
      pruefe(
        a.t1 === 200 && typeof ausgesetzt === 'string' && bleibt === true && listeA?.geloescht?.length === 0 && listeA?.abgelehnt?.[0]?.grund === ausgesetzt && geloescht === true && JSON.stringify(listeB?.geloescht) === '["alt.txt"]',
        '(r2) Stefan-Ablehnung im Speicher, aber nicht in permission_denials ⇒ alt.txt bleibt (LOESCHLISTE_AUSGESETZT); ohne Ablehnung ⇒ gelöscht.',
        `(r2) Antwort ${a.t1}, bleibt ${bleibt}, Liste ${JSON.stringify(listeA)}; Gegenprobe gelöscht ${geloescht}, Liste ${JSON.stringify(listeB)}`
      )
    }
    // (r3)
    {
      const startfehler = await (await fetch(`${basisUrl}/api/startfehler`)).json()
      const eintrag = Array.isArray(startfehler) ? startfehler.find((e) => e.laufId === a.laufId && /nicht bestätigt/.test(e.fehler ?? '')) : undefined
      if (a.fehlt !== undefined) befunde.push(`(r3) fehlt: ${a.fehlt}`)
      else
        pruefe(
          // B2b-3b-2b-2a-3 (Advisor M10/V2): zusätzlich das Feld art des Eintrags (eigene Einordnung statt „Startproblem“); keine Bedingung entfällt.
          a.ermittelt === null && eintrag !== undefined && /Länge abweichend/.test(eintrag.fehler) && eintrag.art === 'rueckfrage_abweichung',
          '(r3) angehängte gefälschte Version ⇒ nicht bestätigt (null) und Eintrag in GET /api/startfehler mit Grund und art rueckfrage_abweichung.',
          `(r3) ermittelt ${JSON.stringify(a.ermittelt)}, Startfehler ${JSON.stringify(startfehler)}`
        )
    }
    // (b7) über den Server
    pruefe(
      a.t2 === 200 && a.herkunft === 't1:browser,t2:nicht_browser',
      '(b7) echter Server: Antwort mit Sec-Fetch-Site same-origin ⇒ herkunft browser, ohne Kopf ⇒ nicht_browser (im Protokoll).',
      `(b7) Herkunft im Protokoll: ${a.herkunft ?? '–'} (Antwort t2 ${a.t2})`
    )
    // Nebenbefund: die Fälschung bleibt Datei-Audit; ohne Speicher (alter Pfad) wäre sie ERFOLGREICH (Gegenprobe zur Absicherung).
    if (typeof protokollModul.setzeProtokollZusammen === 'function' && a.laufId !== undefined) {
      const zusammen = protokollModul.setzeProtokollZusammen(listeVersionen(`rueckfragen-${a.laufId}`, { basisVerzeichnis, ...STILL }), a.laufId)
      const alterPfad = zusammen.ok ? klassifiziere(a.laufId, [denial('t1', { command: 'npm publish' }), denial('t3', { command: 'rm -rf x' })], zusammen.daten, new Map([['t1', a.textT1], ['t3', TEXT_T3]])).ergebnis : null
      pruefe(alterPfad === 'ERFOLGREICH', '(r3) Gegenprobe: dieselbe Fälschung nur aus der Datei zusammengesetzt (ohne Speicher) ⇒ ERFOLGREICH.', `(r3) Gegenprobe alter Pfad: ${alterPfad} (${JSON.stringify(zusammen)})`)
    } else befunde.push('(r3) src/rueckfrage/protokoll.ts: setzeProtokollZusammen fehlt')
  }

  // ── (f) Grenzen ────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const produkt = ['scripts/leitstand-server.mjs', ...readdirSync('scripts/leitstand').filter((n) => n.endsWith('.mjs') && !n.endsWith('.test.mjs')).map((n) => `scripts/leitstand/${n}`)]
    // B2b-3b-2b-2a-1 (Advisor B1/B2): „Kanal aus“ heißt seit dem Opt-in „nur über rueckfrageOptionFuer, also nur mit
    // LEITSTAND_RUECKFRAGE=1“ — gemeinsame, gleich strenge Regel in scripts/_rueckfrage-aus-pruefung.mjs.
    const optIn = pruefeKanalNurUeberOptIn(produkt.map((p) => ({ pfad: p, text: readFileSync(p, 'utf8') })))
    pruefe(optIn.befunde.length === 0 && optIn.handlerAufrufe >= 2, '(f) Kanal nur über das Opt-in: kein Produktaufrufer setzt die Option rueckfrage außerhalb von rueckfrageOptionFuer.', `(f) ${optIn.befunde.join('; ')}`)
    const architektur = readFileSync('ARCHITECTURE.md', 'utf8')
    const abschnitt3 = architektur.slice(architektur.indexOf('## 3. Auth'), architektur.indexOf('## 4. Fehlerbehandlung'))
    pruefe(/E-B7/.test(abschnitt3) && /herkunft/i.test(abschnitt3), '(f) ARCHITECTURE §3 nennt E-B7 (Herkunft je Antwort).', '(f) ARCHITECTURE §3 ohne E-B7/Herkunft')
  }
} catch (fehler) {
  befunde.push(`Gate abgebrochen: ${fehler.stack ?? fehler}`)
} finally {
  for (const dienst of dienste) if (dienst.listening) await new Promise((r) => dienst.close(() => r()))
  for (const pfad of aufraeumen) {
    try {
      execFileSync('git', ['worktree', 'prune'], { cwd: join(pfad, 'projekt'), stdio: 'ignore' })
    } catch {
      // ohne Repo nichts zu tun
    }
    raeumeVerzeichnis(pfad)
  }
}

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e):`)
  for (const b of befunde) console.error(`  - ${b}`)
  process.exit(1)
}
console.log('\n✓ Keine Befunde.')
