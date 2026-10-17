#!/usr/bin/env node
/**
 * Datei: scripts/check-f45-b2b3b2b1b-r1.mjs
 *
 * Zweck: Gate für F45 B2b-3b-2b-1b „R1: Stefan-Ablehnung nur mit eindeutigem Ablehnungstext“ (features/F45/plan-b2b3b2b1b-v2.md,
 * Advisor features/F45/advisor-b2b3b2b1b.md, F-1128 R1). Der Kanal bleibt aus; eingeschaltet wird er hier nur über die Option
 * `rueckfrage` des Gate-Servers. Neue Exporte werden je Fall geprüft, damit jeder Fall gegen main (Rot-Nachweis per git archive)
 * seinen eigenen Befund zeigt.
 *
 * Prüft:
 * (r1t) rein: jede Ablehnung durch Stefan hat einen eigenen Text (Ref), der Speicher trägt dessen Hash; der Abgleich zählt sie nur,
 *       wenn jedes tool_result der ID is_error trägt und genau diesen Text als String (Positivkontrolle ⇒ nur_stefan; fehlt,
 *       is_error false, statischer Text, zweiter abweichender Block, Array-Form, ohne Ergebnisse ⇒ nicht_nur_stefan). Eine Datei mit
 *       dem Hash des statischen Texts weicht vom Speicher ab (ablehnung_hash).
 * (r1d) echter Controller (fuehreAufgabeDurch) über den echten Server mit Kanal: A über die Rückfrage, B statisch gesperrt; ein Prozess
 *       mit Token stellt B nachträglich und lehnt über die Antwort-Route ab ⇒ VERWEIGERT (main: ERFOLGREICH mit 2). Zusatz (Advisor B10,
 *       qa 1): kein Umgehungsverdacht, kein Startfehler „nicht bestätigt“, beide Einträge mit Hash, Hash A = Text des tool_result A, Argv
 *       mit --permission-prompt-tool — VERWEIGERT kommt also aus R1, nicht aus einem anderen Grund.
 * (r1e) Gegenprobe, gleicher Aufbau: nur A, echte Stefan-Ablehnung mit dem Text aus dem Long-Poll ⇒ ERFOLGREICH (1).
 * (f)   Grenzen: starteWorkflowSchritt( im Server 6×; kein Produktaufrufer übergibt `rueckfrage:`; ARCHITECTURE §4 nennt R1
 *       (ablehnung_hash).
 *
 * Wird aufgerufen von: `npm run check:gates` (und damit `npm run check`).
 *
 * Wichtig: In (r1d)/(r1e) sind nur der Prozessstart (Starter-Attrappe, spielt die CLI über die echten Token-Routen) und die
 * F4-Startfreigabe (Fixture nach Muster scripts/check-f14-abbruch.mjs: Startziel, Version, Kontext, settingsPfad) ersetzt; Kanal-Argv,
 * rueckfrageZugang, Protokoll-Schreiber, ermittleRueckfrageProtokoll und klassifiziereLauf sind echt.
 *
 * Aufruf: node scripts/check-f45-b2b3b2b1b-r1.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { homedir, tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { sha256Hex } from '../src/checkpoint-store/index.ts'
import { ermittleIstZustand } from '../src/invocation-policy/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { erzeugeRueckfrageProtokollSchreiber } from './leitstand/rueckfrage-protokoll.mjs'
import { erzeugeRequestHandler } from './leitstand-server.mjs'

const befunde = []
console.log('\n=== F45-B2b-3b-2b-1b-R1-Check ===\n')

const aufraeumen = []
const dienste = []
const PROFIL = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
const STILL = { schreiber: () => {} }
/** Text einer statischen Sperre der CLI (spike.md Z23) — von der CLI geschrieben, nie vom Kanal. */
const STATISCH = (befehl) => `Permission to use Bash with command ${befehl} has been denied.`

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

/** Stream-Zeilen der CLI (NDJSON). */
const toolUse = (id, command) => JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', id, name: 'Bash', input: { command } }] } })
const toolResult = (id, content, isError = true) => JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, content, is_error: isError }] } })
const denial = (id, command) => ({ tool_name: 'Bash', tool_use_id: id, tool_input: { command } })
const ergebnisZeile = (denials) => JSON.stringify({ type: 'result', is_error: false, result: 'fertig', permission_denials: denials })

const protokollModul = await lade('../src/rueckfrage/protokoll.ts')
const gatewayModul = await lade('../src/claude-code-gateway/index.ts')
const controllerModul = await lade('../src/execution-controller/index.ts')
const vermittlungModul = await lade('./leitstand/rueckfrage-vermittlung.mjs')

try {
  // ── (r1t) rein ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    // Der Abgleich-Teil braucht zusätzlich ermittleToolErgebnisse — eigener Befund, damit Text- und Fälschungsfall gegen main
    // ihren eigenen Befund zeigen (Advisor B11).
    const fehlt = [
      typeof vermittlungModul.erzeugeRueckfrageVermittlung !== 'function' ? 'erzeugeRueckfrageVermittlung' : null,
      typeof protokollModul.gleicheAblehnungenAb !== 'function' ? 'gleicheAblehnungenAb' : null,
      typeof controllerModul.leseRueckfrageProtokoll !== 'function' ? 'leseRueckfrageProtokoll' : null,
    ].filter(Boolean)
    if (fehlt.length > 0) befunde.push(`(r1t) fehlt: ${fehlt.join(', ')}`)
    else {
      const basis = join(tmpdir(), `f45-b2b3b2b1b-t-${randomUUID().slice(0, 8)}`)
      aufraeumen.push(basis)
      const laufId = `r1t-${randomUUID()}`
      const v = vermittlungModul.erzeugeRueckfrageVermittlung({ protokolliere: erzeugeRueckfrageProtokollSchreiber({ profilReferenz: PROFIL, basisVerzeichnis: basis, home: homedir(), temp: tmpdir() }) })
      v.oeffneLauf(laufId, { token: 'e'.repeat(64), arbeitsordner: join(basis, 'arbeit'), werkzeugNamen: ['Bash'] })
      const texte = []
      for (const [id, command] of [
        ['t1', 'npm publish'],
        ['t2', 'npm run x'],
      ]) {
        const gestellt = v.stelle(laufId, { art: 'rechte', tool_name: 'Bash', input: { command }, tool_use_id: id })
        v.beantworte(gestellt.id, { entscheidung: 'ablehnen' })
        texte.push((await v.warte(laufId, gestellt.id)).entscheidung?.message)
      }
      const speicher = v.zugang(laufId, () => {}).speicher()
      const datei = controllerModul.leseRueckfrageProtokoll(laufId, basis)
      v.beendeLauf(laufId)
      const muster = /^Stefan hat den Befehl abgelehnt\. \(Ref [0-9a-f-]{36}\)$/
      pruefe(
        texte.every((t) => typeof t === 'string' && muster.test(t)) && texte[0] !== texte[1] && speicher?.[0]?.ablehnung_hash === sha256Hex(texte[0] ?? '') && datei?.eintraege?.[1]?.ablehnung_hash === sha256Hex(texte[1] ?? ''),
        '(r1t) je Ablehnung ein eigener ASCII-Text mit Ref; Speicher und Protokoll tragen dessen Hash.',
        `(r1t) Texte ${JSON.stringify(texte)}, Speicher ${JSON.stringify(speicher?.[0])}, Datei ${JSON.stringify(datei?.eintraege?.[1])}`
      )
      const d1 = [denial('t1', 'npm publish')]
      const nurT1 = { ...datei, eintraege: datei?.eintraege?.slice(0, 1) }
      if (typeof gatewayModul.ermittleToolErgebnisse !== 'function') befunde.push('(r1t) src/claude-code-gateway: ermittleToolErgebnisse fehlt (Abgleich mit tool_result nicht prüfbar)')
      else {
        const gleiche = (zeilen) => protokollModul.gleicheAblehnungenAb(d1, nurT1, laufId, gatewayModul.ermittleToolErgebnisse(zeilen)).art
        const faelle = [
          ['passender Text (Positivkontrolle)', [toolUse('t1', 'npm publish'), toolResult('t1', texte[0])], 'nur_stefan'],
          ['kein tool_result', [toolUse('t1', 'npm publish')], 'nicht_nur_stefan'],
          ['is_error false', [toolResult('t1', texte[0], false)], 'nicht_nur_stefan'],
          ['statischer CLI-Text', [toolResult('t1', STATISCH('npm publish'))], 'nicht_nur_stefan'],
          ['Text einer anderen Ablehnung', [toolResult('t1', texte[1])], 'nicht_nur_stefan'],
          ['zweiter abweichender Block', [toolResult('t1', texte[0]), toolResult('t1', STATISCH('npm publish'))], 'nicht_nur_stefan'],
          ['Array-Form (O6: nur String)', [toolResult('t1', [{ type: 'text', text: texte[0] }])], 'nicht_nur_stefan'],
        ]
        const falsch = faelle.filter(([, zeilen, soll]) => gleiche(zeilen) !== soll).map(([name, zeilen, soll]) => `${name}: ${gleiche(zeilen)} statt ${soll}`)
        const ohne = protokollModul.gleicheAblehnungenAb(d1, nurT1, laufId).art
        pruefe(
          falsch.length === 0 && ohne === 'nicht_nur_stefan',
          '(r1t) Abgleich: nur passender String-Text mit is_error ⇒ nur_stefan; fehlt/is_error false/statisch/fremd/doppelt abweichend/Array/ohne Ergebnisse ⇒ nicht_nur_stefan.',
          `(r1t) ${[...falsch, ohne !== 'nicht_nur_stefan' ? `ohne Ergebnisse: ${ohne}` : null].filter(Boolean).join('; ')}`
        )
      }
      // Fälschung: Datei mit dem Hash des statischen Texts für dieselbe ID — der Speicher ist die Wahrheit.
      const echt = protokollModul.bestaetigeProtokoll(datei, speicher)
      const gefaelscht = protokollModul.bestaetigeProtokoll({ ...datei, eintraege: datei?.eintraege?.map((e, i) => (i === 0 ? { ...e, ablehnung_hash: sha256Hex(STATISCH('npm publish')) } : e)) }, speicher)
      pruefe(
        echt.ok === true && gefaelscht.ok === false && /ablehnung_hash/.test(gefaelscht.grund ?? ''),
        '(r1t) Datei mit dem Hash des statischen Texts ⇒ „weicht ab (ablehnung_hash)“; echte Datei bestätigt.',
        `(r1t) echt ${JSON.stringify(echt.ok === true ? true : echt.grund)}, gefälscht ${JSON.stringify(gefaelscht)}`
      )
    }
  }

  // ── (r1d)/(r1e) echter Controller über den echten Server ───────────────────────────────────────────────────────────────
  if (typeof controllerModul.fuehreAufgabeDurch !== 'function') befunde.push(`(r1d) Controller nicht ladbar: ${controllerModul.fehler ?? 'fuehreAufgabeDurch fehlt'}`)
  else {
    const git = (cwd, argumente) => execFileSync('git', argumente, { cwd, encoding: 'utf8' })
    const basis = join(tmpdir(), `f45-b2b3b2b1b-${randomUUID().slice(0, 8)}`)
    aufraeumen.push(basis)

    // F4-Startfreigabe-Fixture (Muster scripts/check-f14-abbruch.mjs, D5: kein neuer Regelsatz).
    const fixRepo = join(basis, 'startfreigabe')
    mkdirSync(fixRepo, { recursive: true })
    git(fixRepo, ['init', '--quiet'])
    git(fixRepo, ['config', 'user.email', 'test@example.invalid'])
    git(fixRepo, ['config', 'user.name', 'Test'])
    writeFileSync(join(fixRepo, '.gitattributes'), '* -text\n')
    git(fixRepo, ['add', '.gitattributes'])
    git(fixRepo, ['commit', '--quiet', '-m', 'init'])
    const committe = (relativ, inhalt) => {
      const ziel = join(fixRepo, relativ)
      mkdirSync(dirname(ziel), { recursive: true })
      writeFileSync(ziel, inhalt)
      git(fixRepo, ['add', relativ])
      git(fixRepo, ['commit', '--quiet', '-m', relativ])
      return { pfad: ziel, commit_hash: git(fixRepo, ['rev-parse', 'HEAD']).trim(), datei_hash: sha256Hex(inhalt) }
    }
    const fixProjekt = join(basis, 'fixprojekt')
    mkdirSync(join(fixProjekt, '.claude', 'hooks'), { recursive: true })
    writeFileSync(join(fixProjekt, '.claude', 'hooks', 'guard.js'), 'hook-inhalt-fixture')
    const SETTINGS_PFAD = join(fixProjekt, '.claude', 'settings.json')
    writeFileSync(SETTINGS_PFAD, JSON.stringify({ hooks: { PreToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command: 'node .claude/hooks/guard.js' }] }] } }))
    const FIX = { werkzeug_version_deklariert: 'f45-r1-test-1.0.0', berechtigungskontext: 'profil-standard', arbeitsverzeichnis_pfad: process.cwd(), startziel_pfad: process.execPath }
    const ist = ermittleIstZustand(SETTINGS_PFAD)
    const baseline = committe('invocation-policy-baseline/gueltig.json', JSON.stringify({ werkzeug_konfiguration: { pfad: '.claude/settings.json', hash: ist.werkzeug_konfiguration_hash }, schutzskripte: ist.schutzskripte }))
    const nachweis = committe(
      'invocation-policy-wirksamkeitsnachweis/gueltig.json',
      JSON.stringify({ gueltigkeitsschluessel: { werkzeug_konfiguration_hash: ist.werkzeug_konfiguration_hash, schutzskript_hashes: ist.schutzskripte.map((e) => e.hash), ...FIX }, rot_fall_beleg: 'F45-R1-Gate — kein echter Rot-Fall-Nachweis', geprueft_am: new Date().toISOString() })
    )
    const AUTORISIERUNG = join(fixProjekt, 'aktuelle-autorisierung.json')
    writeFileSync(AUTORISIERUNG, JSON.stringify({ baselineReferenz: baseline, wirksamkeitsnachweisReferenz: nachweis }))

    // Projekt mit Arbeitsordner (Muster Gate 2b-1a).
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

    let handler = null
    const dienst = createServer((req, res) => handler(req, res))
    await new Promise((r) => dienst.listen(0, '127.0.0.1', r))
    dienste.push(dienst)
    const basisUrl = `http://127.0.0.1:${dienst.address().port}`

    /** Je Lauf ein Verhalten der CLI-Attrappe: { mitB } — und was sie gesehen hat. */
    const verhalten = []
    const laeufe = []
    /**
     * Spielt die CLI: A über die Token-Route (wie rueckfrage-mcp.mjs), optional B als fremder Prozess mit Token (statisch gesperrt,
     * nachträglich gestellt und über die Antwort-Route abgelehnt), Stefan lehnt A ab, die „CLI“ holt die Entscheidung per Long-Poll.
     */
    async function spieleCli(lauf, token, tokens, zugang) {
      lauf.promptTool = tokens.includes('--permission-prompt-tool')
      const kopf = { authorization: `Bearer ${token}` }
      const post = async (pfad, body, kopfZeilen = kopf) => (await fetch(`${basisUrl}${pfad}`, { method: 'POST', headers: kopfZeilen, body: JSON.stringify(body) })).json()
      const stelle = (id, command) => post('/api/rueckfrage/anfrage', { art: 'rechte', tool_name: 'Bash', input: { command }, tool_use_id: id })
      const a = await stelle('tA', 'npm publish')
      if (lauf.mitB) {
        const b = await stelle('tB', 'npm run b')
        lauf.bAntwort = (await fetch(`${basisUrl}/api/rueckfragen/${b.id}/antwort`, { method: 'POST', body: JSON.stringify({ entscheidung: 'ablehnen' }) })).status
      }
      await fetch(`${basisUrl}/api/rueckfragen/${a.id}/antwort`, { method: 'POST', headers: { 'sec-fetch-site': 'same-origin' }, body: JSON.stringify({ entscheidung: 'ablehnen' }) })
      const entA = (await post(`/api/rueckfrage/anfrage/${a.id}/warten`, {})).entscheidung
      lauf.textA = entA?.message
      lauf.speicher = zugang?.speicher?.() ?? null
      const zeilen = [toolUse('tA', 'npm publish'), ...(lauf.mitB ? [toolUse('tB', 'npm run b')] : []), toolResult('tA', entA?.message ?? ''), ...(lauf.mitB ? [toolResult('tB', STATISCH('npm run b'))] : [])]
      zeilen.push(ergebnisZeile([denial('tA', 'npm publish'), ...(lauf.mitB ? [denial('tB', 'npm run b')] : [])]))
      return zeilen.join('\n')
    }

    handler = erzeugeRequestHandler({
      basisVerzeichnis,
      repoWurzel,
      startvorlagePfad,
      installWurzel: process.cwd(),
      // Echter Controller; ersetzt sind nur der Prozessstart und die F4-Fixture (siehe Kopf).
      fuehreAufgabeDurchFn: async (laufId, profil, eingaben, optionen) => {
        const lauf = { laufId, ...(verhalten.shift() ?? {}) }
        laeufe.push(lauf)
        const starter = async (_startziel, tokens) => {
          try {
            return { stdout: await spieleCli(lauf, eingaben.rueckfrageKanal?.token, tokens, optionen.rueckfrageZugang), stderr: '', exitCode: 0, startfehler: null, beendigungsart: null }
          } catch (fehler) {
            befunde.push(`(r1d) CLI-Attrappe abgebrochen: ${fehler.stack ?? fehler}`)
            return { stdout: '', stderr: String(fehler), exitCode: 1, startfehler: null, beendigungsart: null }
          }
        }
        const ergebnis = await controllerModul.fuehreAufgabeDurch(
          laufId,
          profil,
          { ...eingaben, werkzeugStartziel: [process.execPath], werkzeugVersionDeklariert: FIX.werkzeug_version_deklariert, berechtigungskontext: FIX.berechtigungskontext },
          { ...optionen, starter, settingsPfad: SETTINGS_PFAD, aktuelleAutorisierungPfad: AUTORISIERUNG, startfreigabeRepoWurzel: fixRepo, rohBasisVerzeichnis: join(basis, 'roh') }
        )
        lauf.ergebnis = ergebnis
        return ergebnis
      },
      arbeitsordner: true,
      arbeitsordnerNpm: async () => ({ code: 0, stdout: '', stderr: '', zeitueberschritten: false }),
      arbeitsordnerE183: () => ({ ok: true }),
      standCacheMs: 0,
      rueckfrage: { an: true, url: basisUrl },
    })

    /** Legt einen Ein-Schritt-Workflow 'ausfuehrung' an, startet ihn und wartet auf das Ende des Laufs. */
    async function starteAblauf(mitB) {
      verhalten.push({ mitB })
      const { auftragId } = await (await fetch(`${basisUrl}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: 'Gate 3b-2b-1b', auftragstext: 'Lege eine Datei an.' }) })).json()
      const workflowId = `f45-b2b3b2b1b-${randomUUID()}`
      registriereWorkflow(
        {
          workflow_schema: 'v0',
          workflow_id: workflowId,
          auftrag_id: auftragId,
          version: 1,
          ziel: 'Gate 3b-2b-1b.',
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
      const lauf = await warteBis(() => laeufe.find((l) => l.mitB === mitB && l.ergebnis !== undefined && !l.gesehen), 30000)
      if (lauf) lauf.gesehen = true
      await warteBis(async () => (await (await fetch(`${basisUrl}/api/workflows/${workflowId}`)).json()).status !== 'LAEUFT', 10000)
      return { start, lauf }
    }

    const startfehler = async (laufId) => {
      const liste = await (await fetch(`${basisUrl}/api/startfehler`)).json()
      return Array.isArray(liste) ? liste.filter((e) => e.laufId === laufId) : []
    }
    const kurz = (lauf) => JSON.stringify({ ok: lauf?.ergebnis?.ok, stufe: lauf?.ergebnis?.stufe, grund: lauf?.ergebnis?.grund, klassifikation: lauf?.ergebnis?.klassifikation })

    // (r1d) Waschen einer statischen Sperre.
    const d = await starteAblauf(true)
    const dLauf = d.lauf
    const dFehler = dLauf ? await startfehler(dLauf.laufId) : []
    const dSpeicher = dLauf?.speicher ?? []
    pruefe(
      dLauf?.ergebnis?.ok === true && dLauf.ergebnis.klassifikation?.ergebnis === 'VERWEIGERT',
      '(r1d) A über Rückfrage, B statisch gesperrt und von einem Prozess mit Token nachträglich abgelehnt ⇒ VERWEIGERT (echter Controller).',
      `(r1d) erwartet VERWEIGERT, erhalten ${kurz(dLauf)} (Start ${d.start.status})`
    )
    pruefe(
      dLauf?.ergebnis?.klassifikation?.bypass_verdacht_anzahl === 0 &&
        dLauf?.promptTool === true &&
        dLauf?.bAntwort === 200 &&
        dFehler.length === 0 &&
        dSpeicher.filter((e) => e.art === 'stefan_abgelehnt' && /^[0-9a-f]{64}$/.test(e.ablehnung_hash ?? '')).length === 2 &&
        dSpeicher.find((e) => e.tool_use_id === 'tA')?.ablehnung_hash === sha256Hex(dLauf?.textA ?? ''),
      '(r1d) VERWEIGERT aus R1: kein Umgehungsverdacht, Argv mit --permission-prompt-tool, B über die Antwort-Route abgelehnt, kein Startfehler, beide Einträge mit Hash, Hash A = tool_result A.',
      `(r1d) Umgehungsverdacht ${dLauf?.ergebnis?.klassifikation?.bypass_verdacht_anzahl}, Prompt-Tool ${dLauf?.promptTool}, B-Antwort ${dLauf?.bAntwort}, Startfehler ${JSON.stringify(dFehler)}, Speicher ${JSON.stringify(dSpeicher)}, Text A ${JSON.stringify(dLauf?.textA)}`
    )
    // (r1e) Gegenprobe.
    const e = await starteAblauf(false)
    const eLauf = e.lauf
    const eFehler = eLauf ? await startfehler(eLauf.laufId) : []
    pruefe(
      eLauf?.ergebnis?.ok === true && eLauf.ergebnis.klassifikation?.ergebnis === 'ERFOLGREICH' && eLauf.ergebnis.klassifikation.abgelehnt_durch_stefan === 1 && eFehler.length === 0,
      '(r1e) Gegenprobe: echte Stefan-Ablehnung, tool_result mit dem Text aus dem Long-Poll ⇒ ERFOLGREICH (abgelehnt_durch_stefan 1).',
      `(r1e) erwartet ERFOLGREICH/1, erhalten ${kurz(eLauf)}, Startfehler ${JSON.stringify(eFehler)}`
    )
  }

  // ── (f) Grenzen ────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const server = readFileSync('scripts/leitstand-server.mjs', 'utf8')
    const aufrufe = server.split('starteWorkflowSchritt(').length - 1
    pruefe(aufrufe === 6, '(f) starteWorkflowSchritt( in leitstand-server.mjs 6× (unverändert).', `(f) starteWorkflowSchritt( ${aufrufe}×`)
    const produkt = ['scripts/leitstand-server.mjs', ...readdirSync('scripts/leitstand').filter((n) => n.endsWith('.mjs') && !n.endsWith('.test.mjs')).map((n) => `scripts/leitstand/${n}`)]
    const mitKanal = produkt.filter((p) => /erzeugeRequestHandler\([^)]*\brueckfrage\s*:/s.test(readFileSync(p, 'utf8')))
    pruefe(mitKanal.length === 0, '(f) Kanal aus: kein Produktaufrufer übergibt die Option rueckfrage an erzeugeRequestHandler.', `(f) Option rueckfrage gesetzt in: ${mitKanal.join(', ')}`)
    const architektur = readFileSync('ARCHITECTURE.md', 'utf8')
    const abschnitt4 = architektur.slice(architektur.indexOf('## 4. Fehlerbehandlung'), architektur.indexOf('## 5.'))
    pruefe(/ablehnung_hash/.test(abschnitt4) && /R1/.test(abschnitt4), '(f) ARCHITECTURE §4 nennt R1 (ablehnung_hash).', '(f) ARCHITECTURE §4 ohne R1/ablehnung_hash')
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
