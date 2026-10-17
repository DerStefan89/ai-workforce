#!/usr/bin/env node
/**
 * Datei: scripts/check-f45-b2b3b1b-auswertung.mjs
 *
 * Zweck: Gate für F45 B2b-3b-1b „Rückfrage-Kanal, Auswertung“ (features/F45/plan-b2b3b1b-v2.md). Einzige Quelle der Fälle
 * e1–e4 und der Protokoll-Prüfungen. Neue Module werden dynamisch geladen, damit jeder Fall einzeln meldet — gegen main
 * (Rot-Nachweis per git archive) zeigt so jeder Fall seinen eigenen Befund statt nur „Modul fehlt“. Der Server-Aufbau
 * (Wegwerf-Projekt, Attrappen-Worker, Attrappen-Client über das echte MCP-Skript) ist eine bewusste, schlanke Kopie aus
 * scripts/check-f45-b2b3b1-rueckfrage.mjs (Plan v2 H7: Import geht wegen der Seiteneffekte jenes Gates nicht).
 *
 * Prüft:
 * (e1) Ablehnung allein durch Stefan (Protokoll stefan_abgelehnt, gleiche ID, gleicher tool_name, gleicher Input-Hash) ⇒
 *      ERFOLGREICH, Terminalmarke daten.abgelehnt_durch_stefan (1 bzw. 2).
 * (e2) gemischt (Stefan + auto_deny, Stefan + Ablehnung ohne Eintrag) ⇒ VERWEIGERT.
 * (e3) nur auto_deny / zeitueberschreitung / lauf_beendet / Werkzeugsatz-Sperre ohne Eintrag ⇒ VERWEIGERT.
 * (e4) ohne Protokoll (Feld fehlt, null, ungültig, fremder Lauf): Ergebnis und Terminalmarke gleich dem Fall „Feld fehlt“.
 * (p1) Abgleich A6, Rotfälle: andere ID, andere Art zur ID (stefan_erlaubt, frage_beantwortet), Nicht-Objekt in den
 *      Ablehnungen, anderer tool_name, anderer Input, zwei Einträge je ID, doppelte Ablehnungs-ID, Ablehnung ohne ID,
 *      Stefan-Ablehnung mit Verbotswert ⇒ VERWEIGERT.
 * (p2) Schema und Validator: Beispiele gültig/ungültig, Arten = Schema-Enum = PROTOKOLL_ARTEN der Vermittlung (eine Quelle).
 * (p3) Schreiber am echten Server (Kanal an, Standard-Vermittlung): auto_deny + Stefan-Ablehnung ⇒ zwei Versionen von
 *      rueckfragen-<laufId>; seit B2b-3b-2b-1a (Schema v1) trägt jede Version nur ihren Zuwachs, gelesen wird wie im Controller
 *      zusammengesetzt (leseRueckfrageProtokoll) ⇒ beide Einträge, gültig; Befehl ohne Arbeitsordner-Pfad (<ARBEITSORDNER>),
 *      Geheimnis maskiert; gelesen über laufOptionen.basisVerzeichnis (dieselbe Ablage wie der Controller) ⇒ Klassifikation
 *      ERFOLGREICH (H3). Prüft den Evaluator mit der Datei; seit B2b-3b-2a braucht der Controller zusätzlich den passenden
 *      Speicherstand der Vermittlung — dieser Pfad ist scripts/check-f45-b2b3b2a-absicherung.mjs (a2).
 * (p4) F-1126 (1): Body über 64 KiB auf der Token-Route ⇒ 413, keine neue Protokoll-Version (Ablehnung ohne Eintrag ⇒ VERWEIGERT, e3).
 * (f)  Quelltext: starteWorkflowSchritt( in leitstand-server.mjs 6×; ARCHITECTURE §4 nennt die Regel mit Durchsetzungsgrad.
 *
 * Wird aufgerufen von: `npm run check:gates` (und damit `npm run check`).
 *
 * Aufruf: node scripts/check-f45-b2b3b1b-auswertung.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync, spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { kanonischesJson, ladeGueltigeCheckpoints, sha256Hex } from '../src/checkpoint-store/index.ts'
import { ladeArtefaktVersion, listeVersionen } from '../src/lineage-registry/index.ts'
import { klassifiziereLauf } from '../src/result-evaluator/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { erzeugeRequestHandler } from './leitstand-server.mjs'

const befunde = []
console.log('\n=== F45-B2b-3b-1b-Auswertung-Check ===\n')

const aufraeumen = []
const dienste = []
const kinder = []
const PROFIL = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }

function pruefe(bedingung, ok, fehler) {
  if (bedingung) console.log(`  ✓ ${ok}`)
  else befunde.push(fehler)
}

/** Lädt ein Modul; fehlt es (gegen main), liefert es { fehler } statt zu werfen — der Fall meldet dann selbst. */
async function lade(pfad) {
  try {
    return await import(pfad)
  } catch (fehler) {
    return { fehler: fehler.message.split('\n')[0] }
  }
}

const hashVon = (input) => sha256Hex(kanonischesJson(input ?? null))
const verzoegerung = (ms) => new Promise((r) => setTimeout(r, ms))
async function warteBis(pruefen, maxMs = 15000) {
  const ende = Date.now() + maxMs
  let wert = await pruefen()
  while (!wert && Date.now() < ende) {
    await verzoegerung(25)
    wert = await pruefen()
  }
  return wert
}

// ─── Klassifikations-Hilfen (e1–e4, p1) ─────────────────────────────────────────────────────────────────────────────────
const KLASS_BASIS = join(tmpdir(), `f45-b2b3b1b-klass-${randomUUID().slice(0, 8)}`)
aufraeumen.push(KLASS_BASIS)

/**
 * Klassifiziert einen Lauf mit den gegebenen permission_denials und optional einem Protokoll.
 * @param denials - permission_denials des Ergebnisobjekts (oder null: kein Ergebnisobjekt)
 * @param protokoll - (laufId) => daten | undefined (Feld weglassen)
 * @returns { ergebnis, rest, payload }
 */
function klassifiziere(denials, protokoll, zusatz = {}) {
  const laufId = `kl-${randomUUID()}`
  const roh = { stdout: denials === null ? '' : JSON.stringify({ type: 'result', is_error: false, result: 'fertig', ...zusatz, permission_denials: denials }), stderr: '', exitCode: 0 }
  const rohPfad = join(KLASS_BASIS, 'roh', `${laufId}.json`)
  mkdirSync(join(KLASS_BASIS, 'roh'), { recursive: true })
  const inhalt = JSON.stringify(roh)
  writeFileSync(rohPfad, inhalt)
  const laufakte = { laufakte_schema: 'v0', lauf_id: laufId, werkzeug_version_deklariert: '2.1.241', berechtigungskontext: 'profil-standard', arbeitsverzeichnis_pfad: process.cwd(), modell_beobachtet: null, beobachtungsbasis_vollstaendig: true, rohstrom_referenz: { pfad: rohPfad, inhalts_hash: sha256Hex(inhalt) }, erstellt_am: '2026-10-16T00:00:00.000Z' }
  const daten = protokoll?.(laufId)
  const eingaben = { laufakte, ...(protokoll !== undefined ? { rueckfragen: daten } : {}) }
  const { wirkungsmarke, ...rest } = klassifiziereLauf(laufId, PROFIL, eingaben, { basisVerzeichnis: join(KLASS_BASIS, 'kz'), schreiber: () => {} })
  const payload = ladeGueltigeCheckpoints(laufId, { basisVerzeichnis: join(KLASS_BASIS, 'kz') }).find((e) => e.payload.selbst_hash === wirkungsmarke.selbstHash)?.payload
  return { ergebnis: rest.ergebnis, rest, payload: { ergebnis: payload?.ergebnis, daten: payload?.daten } }
}

const denial = (id, input = { command: 'npm publish' }, toolName = 'Bash') => ({ tool_name: toolName, tool_use_id: id, tool_input: input })
const eintrag = (id, art = 'stefan_abgelehnt', input = { command: 'npm publish' }, toolName = 'Bash') => ({ tool_use_id: id, tool_name: toolName, input_hash: hashVon(input), art, grund: 'Gate', zeit: '2026-10-16T10:00:00.000Z' })
const protokollMit = (...eintraege) => (laufId) => ({ rueckfragen_schema: 'v1', lauf_id: laufId, ab: 0, eintraege })

try {
  // ── (e1) nur Stefan ──────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const eins = klassifiziere([denial('t1')], protokollMit(eintrag('t1')))
    const zwei = klassifiziere([denial('t1'), denial('t2', { command: 'npm run x' })], protokollMit(eintrag('t1'), eintrag('t2', 'stefan_abgelehnt', { command: 'npm run x' }), eintrag('t3', 'stefan_erlaubt')))
    pruefe(
      eins.ergebnis === 'ERFOLGREICH' && eins.payload.daten?.abgelehnt_durch_stefan === 1 && eins.rest.abgelehnt_durch_stefan === 1 && zwei.ergebnis === 'ERFOLGREICH' && zwei.payload.daten?.abgelehnt_durch_stefan === 2,
      '(e1) Ablehnung allein durch Stefan ⇒ ERFOLGREICH mit daten.abgelehnt_durch_stefan (1 bzw. 2).',
      `(e1) erwartet ERFOLGREICH mit abgelehnt_durch_stefan, erhalten: ${JSON.stringify({ eins: eins.payload, zwei: zwei.payload })}`
    )
  }

  // ── (e2) gemischt ────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const a = klassifiziere([denial('t1'), denial('t2')], protokollMit(eintrag('t1'), eintrag('t2', 'auto_deny')))
    const b = klassifiziere([denial('t1'), denial('t9', { file_path: 'x' }, 'Write')], protokollMit(eintrag('t1')))
    pruefe(a.ergebnis === 'VERWEIGERT' && b.ergebnis === 'VERWEIGERT', '(e2) gemischt (Stefan + auto_deny, Stefan + Ablehnung ohne Eintrag) ⇒ VERWEIGERT.', `(e2) ${a.ergebnis}/${b.ergebnis}`)
  }

  // ── (e3) nur automatische Ablehnungen ───────────────────────────────────────────────────────────────────────────────
  {
    const arten = ['auto_deny', 'zeitueberschreitung', 'lauf_beendet'].map((art) => klassifiziere([denial('t1')], protokollMit(eintrag('t1', art))).ergebnis)
    const sperre = klassifiziere([denial('t1', { file_path: 'x' }, 'Write')], protokollMit()).ergebnis
    pruefe(arten.every((e) => e === 'VERWEIGERT') && sperre === 'VERWEIGERT', '(e3) auto_deny, Zeitüberschreitung, Lauf-Ende, Werkzeugsatz-Sperre ohne Eintrag ⇒ VERWEIGERT.', `(e3) ${arten.join('/')}/${sperre}`)
  }

  // ── (e4) ohne Protokoll gleich zu „Feld fehlt“ ───────────────────────────────────────────────────────────────────────
  {
    const stroeme = [
      ['keine Ablehnung', [], {}],
      ['Stefan-förmige Ablehnung', [denial('t1')], {}],
      ['Verbotswert', [denial('t1', { command: 'npm run test --dangerously-skip-permissions' })], {}],
      ['is_error/non_execution_kind', [denial('t1')], { is_error: true, non_execution_kind: 'x' }],
      ['kein Ergebnisobjekt', null, {}],
    ]
    const varianten = [
      ['null', () => null],
      ['ungültig', (l) => ({ ...protokollMit(eintrag('t1'))(l), rueckfragen_schema: 'v9' })],
      ['fremder Lauf', () => protokollMit(eintrag('t1'))('anderer-lauf')],
    ]
    const abweichungen = []
    for (const [name, denials, zusatz] of stroeme) {
      const soll = JSON.stringify(klassifiziere(denials, undefined, zusatz).payload) + JSON.stringify(klassifiziere(denials, undefined, zusatz).rest)
      for (const [variante, protokoll] of varianten) {
        const k = klassifiziere(denials, protokoll, zusatz)
        if (JSON.stringify(k.payload) + JSON.stringify(k.rest) !== soll) abweichungen.push(`${name}/${variante}`)
      }
    }
    pruefe(abweichungen.length === 0, '(e4) ohne Protokoll (null, ungültig, fremder Lauf): Ergebnis und Terminalmarke gleich „Feld fehlt“ (5 Rohströme).', `(e4) Abweichungen: ${abweichungen.join(', ')}`)
  }

  // ── (p1) Abgleich A6, Rotfälle ──────────────────────────────────────────────────────────────────────────────────────
  {
    const faelle = [
      ['andere ID', [denial('tx')], protokollMit(eintrag('t1'))],
      ['stefan_erlaubt zur ID', [denial('t1')], protokollMit(eintrag('t1', 'stefan_erlaubt'))],
      ['frage_beantwortet zur ID', [denial('t1')], protokollMit(eintrag('t1', 'frage_beantwortet'))],
      ['Nicht-Objekt neben Stefan-Ablehnung', ['x', denial('t1')], protokollMit(eintrag('t1'))],
      ['anderer tool_name', [denial('t1', { command: 'npm publish' }, 'PowerShell')], protokollMit(eintrag('t1'))],
      ['anderer Input', [denial('t1', { command: 'npm publish --force' })], protokollMit(eintrag('t1'))],
      ['zwei Einträge je ID', [denial('t1')], protokollMit(eintrag('t1'), eintrag('t1', 'auto_deny'))],
      ['doppelte Ablehnungs-ID', [denial('t1'), denial('t1')], protokollMit(eintrag('t1'))],
      ['Ablehnung ohne ID', [{ tool_name: 'Bash', tool_input: { command: 'npm publish' } }], protokollMit({ ...eintrag('t1'), tool_use_id: null })],
      ['Verbotswert (E-186)', [denial('t1', { command: 'npm run test --dangerously-skip-permissions' })], protokollMit(eintrag('t1', 'stefan_abgelehnt', { command: 'npm run test --dangerously-skip-permissions' }))],
    ]
    const falsch = faelle.filter(([, denials, p]) => klassifiziere(denials, p).ergebnis !== 'VERWEIGERT').map(([n]) => n)
    pruefe(falsch.length === 0, `(p1) Abgleich A6: ${faelle.length} Abweichungen (ID, tool_name, Input-Hash, Eindeutigkeit, Verbotswert) ⇒ VERWEIGERT.`, `(p1) nicht VERWEIGERT: ${falsch.join(', ')}`)
  }

  // ── (p2) Schema, Beispiele, Arten aus einer Quelle ──────────────────────────────────────────────────────────────────
  {
    const protokollModul = await lade('../src/rueckfrage/protokoll.ts')
    const vermittlung = await lade('./leitstand/rueckfrage-vermittlung.mjs')
    const schemaPfad = 'schemas/kontrollzustand-rueckfragen-payload.schema.json'
    if (protokollModul.fehler !== undefined || !existsSync(schemaPfad)) {
      befunde.push(`(p2) Schema bzw. Validator fehlt: ${existsSync(schemaPfad) ? '' : `${schemaPfad} fehlt; `}${protokollModul.fehler ?? ''}`)
    } else {
      const schema = JSON.parse(readFileSync(schemaPfad, 'utf8'))
      const beispiele = [
        ['schemas/examples/kontrollzustand-rueckfragen-payload.valid.json', true],
        ['schemas/examples/kontrollzustand-rueckfragen-payload.invalid-unbekannte-art.json', false],
        ['schemas/examples/kontrollzustand-rueckfragen-payload.invalid-unbekanntes-feld.json', false],
        ['schemas/examples/kontrollzustand-rueckfragen-payload.invalid-ab-fehlt.json', false],
      ]
      const falsch = beispiele.filter(([pfad, gueltig]) => !existsSync(pfad) || (protokollModul.validiereRueckfrageProtokoll(JSON.parse(readFileSync(pfad, 'utf8'))).length === 0) !== gueltig).map(([p]) => p)
      const schemaArten = schema.properties.eintraege.items.properties.art.enum
      pruefe(falsch.length === 0, '(p2) Schema-Beispiele: gültig/ungültig wie erwartet.', `(p2) falsch bewertet: ${falsch.join(', ')}`)
      pruefe(
        JSON.stringify(schemaArten) === JSON.stringify([...protokollModul.RUECKFRAGE_PROTOKOLL_ARTEN]) && vermittlung.PROTOKOLL_ARTEN === protokollModul.RUECKFRAGE_PROTOKOLL_ARTEN && schema.properties.eintraege.items.additionalProperties === false,
        '(p2) Arten: Schema-Enum = RUECKFRAGE_PROTOKOLL_ARTEN = PROTOKOLL_ARTEN der Vermittlung (eine Quelle); Einträge ohne Zusatzfelder.',
        `(p2) Arten: Schema ${JSON.stringify(schemaArten)}, Quelle ${JSON.stringify(protokollModul.RUECKFRAGE_PROTOKOLL_ARTEN)}, Vermittlung gleich? ${vermittlung.PROTOKOLL_ARTEN === protokollModul.RUECKFRAGE_PROTOKOLL_ARTEN}`
      )
    }
  }

  // ── (p3)/(p4) Schreiber am echten Server ────────────────────────────────────────────────────────────────────────────
  {
    const git = (cwd, argumente) => execFileSync('git', argumente, { cwd, encoding: 'utf8' })
    const basis = join(tmpdir(), `f45-b2b3b1b-${randomUUID().slice(0, 8)}`)
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
    git(repoWurzel, ['add', '.'])
    git(repoWurzel, ['commit', '--quiet', '-m', 'init'])
    const vorlageRoh = ladeStartvorlage('startvorlagen/beispielprojekt.json')
    const startvorlagePfad = join(basis, 'startvorlage.json')
    writeFileSync(startvorlagePfad, JSON.stringify({ ...vorlageRoh, werkzeugsaetze: { ...vorlageRoh.werkzeugsaetze, schreibend: { ...vorlageRoh.werkzeugsaetze.schreibend, erlaubte_werkzeuge: ['Read', 'Grep', 'Glob', 'Write', 'Edit', 'Bash(npm ci)'] } } }, null, 2))
    const vorlage = ladeStartvorlage(startvorlagePfad)
    const basisVerzeichnis = join(basis, 'kontrollzustand')

    let erfuelle
    const ende = new Promise((r) => {
      erfuelle = r
    })
    const aufrufe = []
    async function attrappe(laufId, profil, eingaben, optionen) {
      const aufruf = { laufId, rolle: eingaben.rolle, eingaben, cwd: optionen.cwd, basisVerzeichnis: optionen.basisVerzeichnis }
      aufrufe.push(aufruf)
      if (eingaben.rolle === 'ausfuehrung') await ende
      return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
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
      rueckfrage: { an: true, url: basisUrl },
    })

    const { auftragId } = await (await fetch(`${basisUrl}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: 'Gate 3b-1b', auftragstext: 'Lege eine Datei an.' }) })).json()
    const workflowId = `f45-b2b3b1b-${randomUUID()}`
    registriereWorkflow(
      {
        workflow_schema: 'v0',
        workflow_id: workflowId,
        auftrag_id: auftragId,
        version: 1,
        ziel: 'Gate 3b-1b.',
        status: 'OFFEN',
        aktiver_schritt_id: 'schritt-1-ausfuehrung',
        grenzen: { max_schritte: 6, max_replans: 1 },
        schritte: [{ schritt_id: 'schritt-1-ausfuehrung', rolle: 'ausfuehrung', werkzeugsatz: 'schreibend', worker: 'claude-code', modell: 'claude-sonnet-5', eingaben: [], output_schema: null, freigabe: 'ZWINGEND', freigabe_erteilt: true, risiko: 'Gate-Fixture.', zeitgrenze_ms: 600000, nachfolger: null, status: 'OFFEN', lauf_id: null }],
      },
      leiteProfilReferenzAb(vorlage),
      { basisVerzeichnis, schreiber: () => {} }
    )
    const starte = () => fetch(`${basisUrl}/api/workflows/${workflowId}/starten`, { method: 'POST' })
    let start = await starte()
    if ((await start.clone().json()).vorbereitung === true) {
      await warteBis(async () => (await (await fetch(`${basisUrl}/api/workflows/${workflowId}`)).json()).arbeitsordner?.status === 'BEREIT')
      start = await starte()
    }
    const lauf = await warteBis(() => aufrufe.find((a) => a.rolle === 'ausfuehrung'))
    const server = lauf?.eingaben.aufrufEingaben.mcpConfig !== undefined ? JSON.parse(lauf.eingaben.aufrufEingaben.mcpConfig).mcpServers?.rueckfrage : undefined
    pruefe(lauf && server, '(Vorbedingung) Ausführung mit Rückfrage-Kanal gestartet.', `(Vorbedingung) Start ${start.status}, Kanal ${server !== undefined}`)
    if (lauf && server) {
      const kind = spawn(server.command, server.args, { env: { ...process.env, ...server.env }, stdio: ['pipe', 'pipe', 'pipe'] })
      kinder.push(kind)
      const warter = new Map()
      let rest = ''
      kind.stdout.setEncoding('utf8')
      kind.stdout.on('data', (stueck) => {
        rest += stueck
        for (let i = rest.indexOf('\n'); i >= 0; i = rest.indexOf('\n')) {
          const zeile = rest.slice(0, i)
          rest = rest.slice(i + 1)
          try {
            const m = JSON.parse(zeile)
            warter.get(m.id)?.(m)
            warter.delete(m.id)
          } catch {
            // keine JSON-RPC-Zeile — für dieses Gate ohne Belang (3b-1a-Gate (r7))
          }
        }
      })
      kind.stderr.resume()
      let naechsteId = 1
      const rufe = (method, params) =>
        new Promise((ok, fehl) => {
          const id = naechsteId++
          const zeit = setTimeout(() => fehl(new Error(`Zeitgrenze ${method}`)), 30000)
          warter.set(id, (m) => {
            clearTimeout(zeit)
            ok(m)
          })
          kind.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`)
        })
      const rechte = async (tool_name, input, tool_use_id) => JSON.parse((await rufe('tools/call', { name: 'rechte_pruefen', arguments: { tool_name, input, tool_use_id } })).result?.content?.[0]?.text)
      await rufe('initialize', { protocolVersion: '2025-06-18' })

      const artefaktId = `rueckfragen-${lauf.laufId}`
      const versionen = () => listeVersionen(artefaktId, { basisVerzeichnis, schreiber: () => {} }).length
      // auto_deny (Write außerhalb), dann Bash mit Arbeitsordner-Pfad und Geheimnis ⇒ Stefan lehnt ab.
      const aussen = await rechte('Write', { file_path: join(basis, 'AUSSEN.txt'), content: 'x' }, 'toolu_p3a')
      const geheimnis = 'sk-ant-api03-GEHEIMNISWERT1234567890'
      const bashInput = { command: `node ${join(lauf.cwd, 'skript.mjs')} --api-key=${geheimnis}`, description: 'Probe' }
      const abgelehnt = rechte('Bash', bashInput, 'toolu_p3b')
      const offen = await warteBis(async () => (await (await fetch(`${basisUrl}/api/rueckfragen`)).json()).rueckfragen.find((o) => o.befehl === bashInput.command))
      if (offen) await fetch(`${basisUrl}/api/rueckfragen/${offen.id}/antwort`, { method: 'POST', body: JSON.stringify({ entscheidung: 'ablehnen' }) })
      const antwort = await abgelehnt
      const nachEntscheidungen = versionen()

      // (p4) F-1126 (1): Body über 64 KiB ⇒ 413 und keine neue Version.
      const gross = await fetch(`${basisUrl}/api/rueckfrage/anfrage`, { method: 'POST', headers: { authorization: `Bearer ${server.env.WORKFORCE_RUECKFRAGE_TOKEN}` }, body: JSON.stringify({ art: 'rechte', tool_name: 'Bash', input: { command: 'x'.repeat(70 * 1024) }, tool_use_id: 'toolu_p4' }) })
      const nachGross = versionen()

      // Lesen wie der Controller: alle Zuwachs-Versionen zusammengesetzt über laufOptionen.basisVerzeichnis (H3, B2b-3b-2b-1a).
      const controllerModul = await lade('../src/execution-controller/index.ts')
      const gelesen = typeof controllerModul.leseRueckfrageProtokoll === 'function' ? controllerModul.leseRueckfrageProtokoll(lauf.laufId, lauf.basisVerzeichnis) : (ladeArtefaktVersion(artefaktId, undefined, { basisVerzeichnis: lauf.basisVerzeichnis, schreiber: () => {} })?.daten ?? null)
      const protokollModul = await lade('../src/rueckfrage/protokoll.ts')
      const gueltig = protokollModul.fehler === undefined && gelesen !== null && protokollModul.validiereRueckfrageProtokoll(gelesen).length === 0
      const letzter = gelesen?.eintraege?.at(-1)
      const textGesamt = JSON.stringify(gelesen ?? {})
      pruefe(
        aussen.behavior === 'deny' && antwort.behavior === 'deny' && nachEntscheidungen === 2 && gelesen?.eintraege?.map((e) => e.art).join(',') === 'auto_deny,stefan_abgelehnt' && gueltig,
        '(p3) Schreiber: je Entscheidung eine Version von rueckfragen-<laufId> (nur Zuwachs); zusammengesetzt auto_deny und stefan_abgelehnt, gültig nach Schema.',
        `(p3) Versionen ${nachEntscheidungen}, Arten ${JSON.stringify(gelesen?.eintraege?.map((e) => e.art) ?? null)}, gültig ${gueltig} ${protokollModul.fehler ?? ''}`
      )
      const ordnerVorwaerts = lauf.cwd.replaceAll('\\', '/')
      pruefe(
        letzter !== undefined && letzter.befehl?.startsWith('node <ARBEITSORDNER>') && !textGesamt.includes(lauf.cwd) && !textGesamt.includes(ordnerVorwaerts) && !textGesamt.includes(basis) && !textGesamt.includes(geheimnis) && letzter.input_hash === hashVon(bashInput) && letzter.tool_use_id === 'toolu_p3b',
        '(p3) Befehl neutralisiert (<ARBEITSORDNER>, kein Temp-/Ordnerpfad), Geheimnis maskiert; tool_use_id und Input-Hash wie die Anfrage.',
        `(p3) Eintrag: ${JSON.stringify(letzter)}`
      )
      // Klassifiziert unter der echten laufId (der Abgleich prüft lauf_id, H2); Terminalmarke in der Wegwerf-Ablage.
      const echt = (() => {
        const rohPfad = join(KLASS_BASIS, 'roh', `${lauf.laufId}.json`)
        const inhalt = JSON.stringify({ stdout: JSON.stringify({ type: 'result', is_error: false, result: 'fertig', permission_denials: [denial('toolu_p3b', bashInput)] }), stderr: '', exitCode: 0 })
        writeFileSync(rohPfad, inhalt)
        const laufakte = { laufakte_schema: 'v0', lauf_id: lauf.laufId, werkzeug_version_deklariert: '2.1.241', berechtigungskontext: 'profil-standard', arbeitsverzeichnis_pfad: lauf.cwd, modell_beobachtet: null, beobachtungsbasis_vollstaendig: true, rohstrom_referenz: { pfad: rohPfad, inhalts_hash: sha256Hex(inhalt) }, erstellt_am: '2026-10-16T00:00:00.000Z' }
        return klassifiziereLauf(lauf.laufId, PROFIL, { laufakte, rueckfragen: gelesen }, { basisVerzeichnis: join(KLASS_BASIS, 'kz'), schreiber: () => {} })
      })()
      pruefe(
        lauf.basisVerzeichnis === basisVerzeichnis && echt.ergebnis === 'ERFOLGREICH' && echt.abgelehnt_durch_stefan === 1,
        '(p3) Schreiber und Leser teilen die Ablage (laufOptionen.basisVerzeichnis); das gelesene Protokoll macht die Stefan-Ablehnung ERFOLGREICH.',
        `(p3) Ablage ${lauf.basisVerzeichnis} vs ${basisVerzeichnis}, Ergebnis ${echt.ergebnis}/${echt.abgelehnt_durch_stefan}`
      )
      pruefe(gross.status === 413 && nachGross === nachEntscheidungen, '(p4) F-1126 (1): Body über 64 KiB ⇒ 413 ohne Protokolleintrag (Ablehnung ohne Eintrag ⇒ VERWEIGERT, e3).', `(p4) Status ${gross.status}, Versionen ${nachEntscheidungen} → ${nachGross}`)
      kind.kill()
    }
    erfuelle()
    await warteBis(async () => (await (await fetch(`${basisUrl}/api/workflows/${workflowId}`)).json()).status !== 'LAEUFT', 5000)
  }

  // ── (f) Quelltext ───────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const server = readFileSync('scripts/leitstand-server.mjs', 'utf8')
    const aufrufe = server.split('starteWorkflowSchritt(').length - 1
    pruefe(aufrufe === 6, '(f) starteWorkflowSchritt( in leitstand-server.mjs 6× (unverändert).', `(f) starteWorkflowSchritt( ${aufrufe}×`)
    const architektur = readFileSync('ARCHITECTURE.md', 'utf8')
    const abschnitt4 = architektur.slice(architektur.indexOf('## 4.'), architektur.indexOf('## 5.'))
    pruefe(/abgelehnt_durch_stefan/.test(abschnitt4) && /DEKLARIERT/.test(abschnitt4) && /ERFOLGREICH/.test(abschnitt4), '(f) ARCHITECTURE §4: Ablehnung allein durch Stefan ⇒ ERFOLGREICH, mit Durchsetzungsgrad DEKLARIERT.', '(f) ARCHITECTURE §4 nennt die Regel (abgelehnt_durch_stefan, ERFOLGREICH, DEKLARIERT) nicht')
  }
} catch (fehler) {
  befunde.push(`Gate abgebrochen: ${fehler.stack ?? fehler}`)
} finally {
  for (const kind of kinder) kind.kill()
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
