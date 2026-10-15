#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/b2b3a/spike-rueckfrage.mjs
 *
 * Zweck: Spike F45 B2b-3a (F-1011, F-980 (4)) — trägt ein Workforce-Lauf (`claude -p`, Argv aus baueAufruf) über einen
 * je Lauf per --mcp-config mitgegebenen stdio-MCP-Server (mcp-rueckfrage.mjs) Rechte-Anfragen
 * (`--permission-prompt-tool`) und eine „Frage an Stefan“ (`frage_stefan`)? Nur Nachweis, kein Produktcode.
 * Läuft ausschließlich gegen eine Wegwerf-Wurzel unter os.tmpdir(): Wegwerf-Git-Projekt mit Skelett-.claude
 * (settings.json + Hooks aus vorlagen/projekt-skelett) und einer Deny-Probe-Regel nur in dieser Kopie.
 * Läufe (Name als Argument, ohne Argument alle):
 * - allow:    Richtlinie allow; Schritte außerhalb des Werkzeugsatzes, Sperrregel, Deny-Regel, Hooks, Schreiben außerhalb.
 * - deny:     Richtlinie deny; ein Befehl außerhalb des Werkzeugsatzes.
 * - warten:   Richtlinie allow nach 90 s Wartezeit; ein Befehl außerhalb des Werkzeugsatzes.
 * - frage:    Auftrag mit offener Entscheidung; `frage_stefan` antwortet mit einem festen, nicht naheliegenden Wert.
 * Schreibt je Lauf rohstrom-<name>.ndjson (stdout der CLI), mcp-protokoll-<name>.ndjson und zaehlung-<name>.json
 * neben dieses Skript, beim Schreiben geschwärzt mit features/F45/nachweise/b2b1b/schwaerze.mjs (Temp → <TEMP>, Home → <HOME>).
 *
 * Wird aufgerufen von: Hand (`node features/F45/nachweise/b2b3a/spike-rueckfrage.mjs [lauf…]`), nicht von `npm run check`.
 *
 * Wichtig: Nur gegen die Wegwerf-Wurzel, nie gegen ein Projekt. Ein erneuter Lauf überschreibt die Ablagen; vor dem
 * Commit die Restprüfung (hatRestpfad) über alle Ablagen laufen lassen.
 */
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { baueAufruf, leseErgebnisobjekt, WORKFORCE_LAUF_UMGEBUNG } from '../../../../src/claude-code-gateway/index.ts'
import { fuehreUmgebungZusammen } from '../../../../src/claude-code-gateway/prozessstart.ts'
import { fuehreGitSync } from '../../../../src/git-starter/index.ts'
import { ladeStartvorlage } from '../../../../src/startvorlage/index.ts'
import { raeumeVerzeichnis } from '../../../../scripts/_aufraeumen.ts'
import { schwaerze } from '../b2b1b/schwaerze.mjs'

const HIER = import.meta.dirname
const INSTALLATION = join(HIER, '..', '..', '..', '..')
const KLEIN = 'claude-haiku-4-5'
const AUSFUEHRUNG = 'claude-sonnet-5' // Modell des Ausführungsschritts in workflow-vorlagen/standard.json
const SERVER = 'rueckfrage'
const RECHTE_WERKZEUG = `mcp__${SERVER}__rechte_pruefen`
const FRAGE_WERKZEUG = `mcp__${SERVER}__frage_stefan`
const DENY_PROBE = 'echo DENY_PROBE_B2B3A'
const vorlage = ladeStartvorlage(join(INSTALLATION, 'startvorlagen', 'ai-workforce.json'))
const STARTZIEL = vorlage.werkzeugStartziel
const wurzel = mkdtempSync(join(tmpdir(), 'b2b3a-spike-'))
console.log(`Wegwerf-Wurzel: ${wurzel}`)

/** Wegwerf-Git-Projekt mit Skelett-.claude (Hooks dateiweise) und Deny-Probe-Regel unter <wurzel>/<name>/projekt. */
function baueProjekt(name) {
  const projekt = join(wurzel, name, 'projekt')
  const skelett = join(INSTALLATION, 'vorlagen', 'projekt-skelett', '.claude')
  mkdirSync(join(projekt, '.claude', 'hooks'), { recursive: true })
  const settings = JSON.parse(readFileSync(join(skelett, 'settings.json'), 'utf8'))
  settings.permissions.deny = [`Bash(${DENY_PROBE})`]
  writeFileSync(join(projekt, '.claude', 'settings.json'), `${JSON.stringify(settings, null, 2)}\n`)
  for (const datei of ['guard-settings.js', 'commit-guard.js', 'session-reminder.js', 'zwischenstand-laden.js', 'zwischenstand-pruefen.js']) {
    copyFileSync(join(skelett, 'hooks', datei), join(projekt, '.claude', 'hooks', datei))
  }
  writeFileSync(join(projekt, 'README.md'), 'Wegwerf-Projekt B2b-3a\n')
  const git = (argumente) => fuehreGitSync(argumente, { cwd: projekt, encoding: 'utf8' })
  git(['init', '--quiet'])
  git(['config', 'user.email', 'test@example.invalid'])
  git(['config', 'user.name', 'Test'])
  git(['add', '.'])
  git(['commit', '--quiet', '-m', 'init'])
  return projekt
}

/**
 * Startet einen Lauf wie der Gateway: Argv aus baueAufruf (Werkzeugsatz 'schreibend' + frage_stefan wie baueMcpAufruf),
 * --mcp-config mit dem Spike-Server, --permission-prompt-tool vor -p, Prompt über stdin, WORKFORCE_LAUF_UMGEBUNG.
 */
function starteLauf(name, { modell, prompt, richtlinie, timeoutMs = 360000 }) {
  const projekt = baueProjekt(name)
  const richtlinienPfad = join(wurzel, name, 'richtlinie.json')
  const protokollPfad = join(HIER, `mcp-protokoll-${name}.ndjson`)
  writeFileSync(richtlinienPfad, JSON.stringify(richtlinie))
  writeFileSync(protokollPfad, '')
  const mcpConfig = JSON.stringify({ mcpServers: { [SERVER]: { command: 'node', args: [join(HIER, 'mcp-rueckfrage.mjs'), richtlinienPfad, protokollPfad] } } })
  const werkzeugsatz = { ...vorlage.werkzeugsaetze.schreibend, erlaubte_werkzeuge: [...vorlage.werkzeugsaetze.schreibend.erlaubte_werkzeuge, FRAGE_WERKZEUG] }
  const tokens = baueAufruf({ modell, werkzeugsatz, prompt, mcpConfig })
  const argv = [...tokens.slice(0, -2), '--permission-prompt-tool', RECHTE_WERKZEUG, '-p']
  const start = Date.now()
  const lauf = spawnSync(STARTZIEL[0], [...STARTZIEL.slice(1), ...argv], {
    cwd: projekt,
    input: prompt,
    env: fuehreUmgebungZusammen(process.env, WORKFORCE_LAUF_UMGEBUNG),
    encoding: 'utf8',
    timeout: timeoutMs,
    maxBuffer: 64 * 1024 * 1024,
  })
  const dauerMs = Date.now() - start
  writeFileSync(join(HIER, `rohstrom-${name}.ndjson`), schwaerze(lauf.stdout ?? ''))
  // Der Server protokolliert zeilenweise und roh; nach dem Lauf an Ort und Stelle schwärzen.
  writeFileSync(protokollPfad, schwaerze(readFileSync(protokollPfad, 'utf8')))
  // Startfehler (ENOENT, ENOBUFS, Zeitgrenze) nicht verschlucken — sonst stünde nur exitCode null in der Zählung.
  const fehler = lauf.error?.message ?? null
  if (fehler) console.error(`${name}: Start/Lauf fehlgeschlagen: ${fehler}`)
  return { projekt, argv, stdout: lauf.stdout ?? '', stderr: lauf.stderr ?? '', exitCode: lauf.status, signal: lauf.signal, fehler, dauerMs, protokollPfad }
}

/** Zeilen des Rohstroms als Objekte (nicht-JSON-Zeilen fallen weg). */
const zeilenVon = (stdout) =>
  stdout
    .split('\n')
    .filter(Boolean)
    .flatMap((z) => {
      try {
        return [JSON.parse(z)]
      } catch {
        return []
      }
    })

/** tool_use mit tool_result je Aufruf (Name, Eingabe, is_error, Ergebnistext gekürzt). */
function werkzeugprotokoll(zeilen) {
  const ergebnisse = new Map()
  const aufrufe = []
  for (const z of zeilen) {
    for (const b of z?.message?.content ?? []) {
      if (z.type === 'assistant' && b.type === 'tool_use') aufrufe.push({ id: b.id, name: b.name, eingabe: b.input })
      if (z.type === 'user' && b.type === 'tool_result') {
        const inhalt = typeof b.content === 'string' ? b.content : JSON.stringify(b.content)
        ergebnisse.set(b.tool_use_id, { is_error: b.is_error === true, text: inhalt.slice(0, 400) })
      }
    }
  }
  return aufrufe.map((a) => ({ ...a, ergebnis: ergebnisse.get(a.id) ?? null }))
}

/**
 * Schreibt eine Zählung geschwärzt als JSON neben dieses Skript.
 * @param {string} name Laufname
 * @param {Record<string, unknown>} daten
 */
const schreibeZaehlung = (name, daten) => writeFileSync(join(HIER, `zaehlung-${name}.json`), schwaerze(`${JSON.stringify(daten, null, 2)}\n`))

/** Gemeinsame Felder jeder Zählung aus Lauf und MCP-Protokoll. */
function zaehle(name, modell, lauf, dateien) {
  const zeilen = zeilenVon(lauf.stdout)
  const init = zeilen.find((z) => z.type === 'system' && z.subtype === 'init')
  const ergebnis = leseErgebnisobjekt(lauf.stdout)
  const protokoll = readFileSync(lauf.protokollPfad, 'utf8').split('\n').filter(Boolean).map((z) => JSON.parse(z))
  const daten = {
    lauf: name,
    modell,
    argv_ohne_prompt: lauf.argv,
    exitCode: lauf.exitCode,
    signal: lauf.signal,
    fehler: lauf.fehler,
    dauer_ms_wand: lauf.dauerMs,
    stderr: lauf.stderr.slice(0, 800),
    init_tools_mcp: (init?.tools ?? []).filter((t) => t.startsWith('mcp__')),
    init_mcp_servers: init?.mcp_servers ?? null,
    init_permission_mode: init?.permissionMode ?? null,
    result_subtype: ergebnis?.subtype ?? null,
    result_is_error: ergebnis?.is_error ?? null,
    kosten_usd: ergebnis?.total_cost_usd ?? null,
    num_turns: ergebnis?.num_turns ?? null,
    permission_denials: ergebnis?.permission_denials ?? null,
    result_text: String(ergebnis?.result ?? '').slice(0, 1200),
    werkzeugaufrufe: werkzeugprotokoll(zeilen),
    mcp_werkzeugaufrufe: protokoll.filter((p) => p.methode === 'tools/call' || p.antwort_auf !== undefined),
    dateien: Object.fromEntries(Object.entries(dateien).map(([schluessel, pfad]) => [schluessel, existsSync(pfad)])),
  }
  schreibeZaehlung(name, daten)
  console.log(`\n=== ${name} === exit ${daten.exitCode}, ${daten.dauer_ms_wand} ms, ${daten.kosten_usd} USD`)
  console.log(JSON.stringify({ ...daten, argv_ohne_prompt: undefined, werkzeugaufrufe: daten.werkzeugaufrufe.map((a) => [a.name, a.ergebnis?.is_error, a.ergebnis?.text?.slice(0, 160)]) }, null, 1))
  return daten
}

const VORSPANN = 'Testlauf. Führe diese Schritte genau so und nacheinander aus, ohne Rückfrage. Wird ein Schritt abgelehnt, notiere es und mache mit dem nächsten weiter; versuche keinen anderen Weg.'
const BASH_INNEN = `node -e "require('fs').writeFileSync('BASH_LIEF.txt','x')"`

const LAEUFE = {
  allow: () => {
    const ausserhalb = join(wurzel, 'allow', 'AUSSERHALB.txt')
    const ausserhalbBash = join(wurzel, 'allow', 'AUSSERHALB_BASH.txt')
    const prompt = [
      VORSPANN,
      `1. Bash: führe genau diesen Befehl aus: ${BASH_INNEN}`,
      `2. Write: lege die Datei ${ausserhalb} mit dem Inhalt "x" an.`,
      '3. Bash: führe genau diesen Befehl aus: git status',
      `4. Bash: führe genau diesen Befehl aus: ${DENY_PROBE}`,
      '5. Edit: ersetze in der Datei .claude/settings.json den Text "Bash(npm run *)" durch "Bash(npm run check)".',
      `6. Bash: führe genau diesen Befehl aus: node -e "console.log(require('fs').readFileSync('.claude/settings.json','utf8').length)"`,
      `7. Bash: führe genau diesen Befehl aus: node -e "require('fs').writeFileSync(process.argv[1],'x')" "${ausserhalbBash.replaceAll('\\', '/')}"`,
      '8. Antworte mit einer Zeile je Schritt: angenommen oder abgelehnt (mit Grund).',
    ].join('\n')
    const lauf = starteLauf('allow', { modell: KLEIN, prompt, richtlinie: { rechte: { modus: 'allow' } } })
    const settingsVorlage = readFileSync(join(INSTALLATION, 'vorlagen', 'projekt-skelett', '.claude', 'settings.json'), 'utf8')
    const daten = zaehle('allow', KLEIN, lauf, { bash_lief: join(lauf.projekt, 'BASH_LIEF.txt'), write_ausserhalb: ausserhalb, bash_ausserhalb: ausserhalbBash })
    daten.settings_regel_unveraendert = readFileSync(join(lauf.projekt, '.claude', 'settings.json'), 'utf8').includes('Bash(npm run *)') && settingsVorlage.includes('Bash(npm run *)')
    schreibeZaehlung('allow', daten)
  },
  deny: () => {
    const prompt = [VORSPANN, `1. Bash: führe genau diesen Befehl aus: ${BASH_INNEN}`, '2. Antworte mit einer Zeile: angenommen oder abgelehnt (mit Grund).'].join('\n')
    const lauf = starteLauf('deny', { modell: KLEIN, prompt, richtlinie: { rechte: { modus: 'deny' } } })
    zaehle('deny', KLEIN, lauf, { bash_lief: join(lauf.projekt, 'BASH_LIEF.txt') })
  },
  warten: () => {
    const prompt = [VORSPANN, `1. Bash: führe genau diesen Befehl aus: ${BASH_INNEN}`, '2. Antworte mit einer Zeile: angenommen oder abgelehnt (mit Grund).'].join('\n')
    const lauf = starteLauf('warten', { modell: KLEIN, prompt, richtlinie: { rechte: { modus: 'allow', warte_ms: 90000 } } })
    zaehle('warten', KLEIN, lauf, { bash_lief: join(lauf.projekt, 'BASH_LIEF.txt') })
  },
  frage: () => {
    const prompt = [
      'Du bist die Ausführung eines Arbeitspakets. Arbeitsordner ist das Projekt; kein git, kein Commit.',
      'Lässt der Auftrag eine Entscheidung offen, die nur Stefan (der Auftraggeber) treffen kann, frage ihn mit dem Werkzeug frage_stefan, statt zu raten, und arbeite mit seiner Antwort weiter.',
      '',
      'Auftrag: Lege die Datei dev-server.json im Arbeitsordner an, mit genau einem Feld "port" (Zahl) für den lokalen Entwicklungsserver.',
      'Welcher Port verwendet wird, ist nicht festgelegt; das Projekt hat keine Vorgabe dazu.',
      'Antworte am Ende mit einer Zeile: welcher Port, und woher die Entscheidung stammt.',
    ].join('\n')
    const lauf = starteLauf('frage', { modell: AUSFUEHRUNG, prompt, richtlinie: { rechte: { modus: 'deny' }, frage: { antwort: 'Stefan entscheidet: Port 4711.' } } })
    const datei = join(lauf.projekt, 'dev-server.json')
    const daten = zaehle('frage', AUSFUEHRUNG, lauf, { dev_server_json: datei })
    daten.dev_server_json_inhalt = existsSync(datei) ? readFileSync(datei, 'utf8') : null
    schreibeZaehlung('frage', daten)
  },
}

const gewuenscht = process.argv.slice(2)
try {
  for (const [name, lauf] of Object.entries(LAEUFE)) {
    if (gewuenscht.length === 0 || gewuenscht.includes(name)) lauf()
  }
} finally {
  raeumeVerzeichnis(wurzel)
}
