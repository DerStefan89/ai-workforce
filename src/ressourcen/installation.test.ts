/**
 * Datei: src/ressourcen/installation.test.ts
 *
 * Zweck: node:test-Fälle für src/ressourcen/installation.ts (F36 WS-5a) mit gestubbten Runnern und
 * Wegwerf-Ordnern unter os.tmpdir(): Formprüfung von version/integrity, Sperre „nur eine Installation
 * zur Zeit“, Aufräumen des eigenen Zielordners bei Fehlschlag, und das gezielte Zurückschreiben nur
 * des einen Katalogeintrags (übrige Bytes gleich, CRLF erhalten), Fehlerpfade von Vorbereiten/Installieren (502/422/409),
 * Bindung an den angezeigten Eintrag (eintragHash) und der echte Serverprüfer gegen einen Mini-MCP-Server
 * (node, stdio). Die Szenarien (a)–(k) am
 * HTTP-Rundlauf prüft scripts/check-f36-ws5a-installation.mjs.
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { raeumeVerzeichnis } from '../../scripts/_aufraeumen.ts'
import { validiereRessourcenDaten } from './index.ts'
import { bereiteInstallationVor, ECHTE_RUNNER, eintragsKennung, type InstallationsRunner, installiereRessource, type ProzessErgebnis } from './installation.ts'
import type { Ressource } from './types.ts'

const VERSION = '1.2.3'
const INTEGRITY = 'sha512-QUJD'

/** Katalog mit einem installierbaren MCP 'pw-mcp' zwischen zwei anderen Einträgen, in der Formatierung von ressourcen.json. */
function katalogText(zeilenende = '\n'): string {
  const text = `{
  "ressourcen_schema": "v0",
  "ressourcen": [
    {
      "id": "vorher",
      "typ": "extern",
      "name": "Vorher",
      "beschreibung": "Bleibt bitgleich.",
      "unterart": "skill",
      "capabilities": ["X"],
      "freigabe": "OFFEN",
      "herkunft": { "art": "extern", "url": "https://example.invalid/vorher" }
    },
    {
      "id": "pw-mcp",
      "typ": "extern",
      "name": "PW MCP",
      "beschreibung": "Fixture.",
      "unterart": "mcp",
      "wirkung": "lokal",
      "lizenz": "MIT",
      "capabilities": ["BROWSER_AUTOMATION"],
      "freigabe": "OFFEN",
      "herkunft": { "art": "extern", "url": "https://example.invalid/pw", "paket": "npm:@fixture/pw" },
      "installation_vorlage": { "bin": "cli.js", "args": ["--output-dir", "{ausgabe_ordner}", "--allowed-origins", "{projekt_origins}"], "werkzeuge": ["mcp__pw-mcp__browser_navigate"] },
      "anwendbar_wenn": { "task_typen_any": ["bugfix"] }
    },
    {
      "id": "nachher",
      "typ": "extern",
      "name": "Nachher",
      "beschreibung": "Bleibt bitgleich.",
      "unterart": "skill",
      "capabilities": ["X"],
      "freigabe": "OFFEN",
      "herkunft": { "art": "extern", "url": "https://example.invalid/nachher" }
    }
  ]
}
`
  return text.replaceAll('\n', zeilenende)
}

/** Was „Vorbereiten“ für den Fixture-Eintrag anzeigen würde (version, integrity, eintragHash). */
function angezeigt(text = katalogText()): { version: string; integrity: string; eintragHash: string } {
  const eintrag = JSON.parse(text).ressourcen.find((r: Ressource) => r.id === 'pw-mcp')
  return { version: VERSION, integrity: INTEGRITY, eintragHash: eintragsKennung(eintrag) }
}

/** Stub-Runner: npm install legt Paket + Lockfile an (Werte überschreibbar), der Server meldet die gegebenen Werkzeuge. */
function stubRunner(
  o: { lockVersion?: string; lockIntegrity?: string; werkzeuge?: string[]; npmVerzoegerungMs?: number; view?: ProzessErgebnis; install?: ProzessErgebnis; server?: { ok: false; grund: string }; beimInstall?: () => void } = {}
): InstallationsRunner & { aufrufe: string[][] } {
  const aufrufe: string[][] = []
  const ok = (stdout = ''): ProzessErgebnis => ({ code: 0, stdout, stderr: '', zeitueberschritten: false })
  return {
    aufrufe,
    npm: async (args) => {
      aufrufe.push(args)
      if (o.npmVerzoegerungMs !== undefined) await new Promise((r) => setTimeout(r, o.npmVerzoegerungMs))
      if (args[0] === 'view') return o.view ?? ok(JSON.stringify({ version: VERSION, 'dist.integrity': INTEGRITY, license: 'MIT' }))
      o.beimInstall?.()
      if (o.install !== undefined) return o.install
      const prefix = args[args.indexOf('--prefix') + 1]
      mkdirSync(join(prefix, 'node_modules', '@fixture', 'pw'), { recursive: true })
      writeFileSync(join(prefix, 'node_modules', '@fixture', 'pw', 'cli.js'), '')
      const lock = { packages: { 'node_modules/@fixture/pw': { version: o.lockVersion ?? VERSION, integrity: o.lockIntegrity ?? INTEGRITY } } }
      writeFileSync(join(prefix, 'package-lock.json'), JSON.stringify(lock))
      return ok()
    },
    pruefeServer: async () => o.server ?? { ok: true, werkzeuge: o.werkzeuge ?? ['browser_navigate', 'browser_click'] },
  }
}

/** Wegwerf-Installationswurzel mit Katalog + cap-Wurzel; aufraeumen im finally. */
function umgebung(zeilenende = '\n'): { installWurzel: string; capWurzel: string; katalog: string; aufraeumen: () => void } {
  const installWurzel = mkdtempSync(join(tmpdir(), 'ws5a-test-install-'))
  const capBasis = mkdtempSync(join(tmpdir(), 'ws5a-test-cap-'))
  const katalog = join(installWurzel, 'ressourcen.json')
  writeFileSync(katalog, katalogText(zeilenende))
  return {
    installWurzel,
    capWurzel: join(capBasis, 'cap'),
    katalog,
    aufraeumen: () => {
      raeumeVerzeichnis(installWurzel)
      raeumeVerzeichnis(capBasis)
    },
  }
}

test('Fixture-Katalog ist gültig', () => {
  assert.deepEqual(validiereRessourcenDaten(JSON.parse(katalogText())), [])
})

test('bereiteInstallationVor: liefert exakte Version, integrity und Anzeige-Felder, schreibt nichts', async () => {
  const u = umgebung()
  try {
    const runner = stubRunner()
    const ergebnis = await bereiteInstallationVor('pw-mcp', { installWurzel: u.installWurzel, capWurzel: u.capWurzel, runner })
    assert.ok(ergebnis.ok)
    assert.equal(ergebnis.daten.version, VERSION)
    assert.equal(ergebnis.daten.integrity, INTEGRITY)
    assert.equal(ergebnis.daten.paket, '@fixture/pw')
    assert.deepEqual(runner.aufrufe, [['view', '@fixture/pw@latest', 'version', 'dist.integrity', 'license', '--json']])
    assert.equal(readFileSync(u.katalog, 'utf8'), katalogText())
    assert.equal(existsSync(u.capWurzel), false)
  } finally {
    u.aufraeumen()
  }
})

test('installiereRessource: Form von version/integrity wird vor allem anderen geprüft (400)', async () => {
  const u = umgebung()
  try {
    const kontext = { installWurzel: u.installWurzel, capWurzel: u.capWurzel, runner: stubRunner() }
    for (const version of ['^1.2.3', 'latest', '1.2', 7]) {
      const e = await installiereRessource('pw-mcp', { ...angezeigt(), version }, kontext)
      assert.ok(!e.ok && e.status === 400, `version ${String(version)}`)
    }
    const e = await installiereRessource('pw-mcp', { ...angezeigt(), integrity: 'md5-x' }, kontext)
    assert.ok(!e.ok && e.status === 400)
    const ohneHash = await installiereRessource('pw-mcp', { ...angezeigt(), eintragHash: undefined }, kontext)
    assert.ok(!ohneHash.ok && ohneHash.status === 400 && /eintragHash/.test(ohneHash.grund))
    assert.equal(existsSync(u.capWurzel), false)
  } finally {
    u.aufraeumen()
  }
})

test('installiereRessource: Erfolg schreibt nur den einen Eintrag (Rest bitgleich), LF bleibt LF', async () => {
  const u = umgebung()
  try {
    const e = await installiereRessource('pw-mcp', angezeigt(), { installWurzel: u.installWurzel, capWurzel: u.capWurzel, runner: stubRunner(), nodePfad: '/pfad/node' })
    assert.ok(e.ok, e.ok ? '' : e.grund)
    const neu = readFileSync(u.katalog, 'utf8')
    const alt = katalogText()
    const vorherEnde = alt.indexOf('    {\n      "id": "pw-mcp"')
    const nachherAnfang = alt.indexOf('    {\n      "id": "nachher"')
    assert.equal(neu.slice(0, vorherEnde), alt.slice(0, vorherEnde))
    assert.ok(neu.endsWith(alt.slice(nachherAnfang - 3)), 'Einträge nach pw-mcp bitgleich')
    assert.ok(!neu.includes('\r\n'))
    const daten = JSON.parse(neu)
    assert.deepEqual(validiereRessourcenDaten(daten), [])
    const pw = daten.ressourcen.find((r: { id: string }) => r.id === 'pw-mcp')
    assert.equal(pw.freigabe, 'FREIGEGEBEN')
    assert.equal(pw.installation.mcp_server.command, '/pfad/node')
    assert.deepEqual(pw.installation.mcp_server.args.slice(1), ['--output-dir', '{ausgabe_ordner}', '--allowed-origins', '{projekt_origins}'])
    assert.ok(pw.installation.mcp_server.args[0].endsWith(join('node_modules', '@fixture', 'pw', 'cli.js')))
    assert.deepEqual(Object.keys(pw).slice(-3), ['installation_vorlage', 'installation', 'anwendbar_wenn'])
  } finally {
    u.aufraeumen()
  }
})

test('installiereRessource: CRLF-Datei bleibt CRLF', async () => {
  const u = umgebung('\r\n')
  try {
    const e = await installiereRessource('pw-mcp', angezeigt(), { installWurzel: u.installWurzel, capWurzel: u.capWurzel, runner: stubRunner() })
    assert.ok(e.ok, e.ok ? '' : e.grund)
    const neu = readFileSync(u.katalog, 'utf8')
    assert.equal(neu.split('\n').length - 1, neu.split('\r\n').length - 1, 'jede Zeile endet auf CRLF')
  } finally {
    u.aufraeumen()
  }
})

test('installiereRessource: Fehlschlag entfernt den eigenen Zielordner, Katalog unverändert; zweiter Versuch möglich', async () => {
  const u = umgebung()
  try {
    const kontext = { installWurzel: u.installWurzel, capWurzel: u.capWurzel }
    const falsch = await installiereRessource('pw-mcp', angezeigt(), { ...kontext, runner: stubRunner({ lockIntegrity: 'sha512-QU5ERVJT' }) })
    assert.ok(!falsch.ok && falsch.status === 422 && /integrity/.test(falsch.grund))
    assert.equal(existsSync(join(u.capWurzel, 'pw-mcp')), false)
    assert.equal(readFileSync(u.katalog, 'utf8'), katalogText())
    const richtig = await installiereRessource('pw-mcp', angezeigt(), { ...kontext, runner: stubRunner() })
    assert.ok(richtig.ok)
  } finally {
    u.aufraeumen()
  }
})

test('installiereRessource: nur eine Installation zur Zeit (409), vorhandener Zielordner (409), schon installiert (409)', async () => {
  const u = umgebung()
  try {
    const kontext = { installWurzel: u.installWurzel, capWurzel: u.capWurzel }
    const langsam = installiereRessource('pw-mcp', angezeigt(), { ...kontext, runner: stubRunner({ npmVerzoegerungMs: 200 }) })
    const parallel = await installiereRessource('pw-mcp', angezeigt(), { ...kontext, runner: stubRunner() })
    assert.ok(!parallel.ok && parallel.status === 409 && /bereits eine Installation/.test(parallel.grund))
    assert.ok((await langsam).ok)
    const nochmal = await installiereRessource('pw-mcp', angezeigt(), { ...kontext, runner: stubRunner() })
    assert.ok(!nochmal.ok && nochmal.status === 409 && /bereits installation/.test(nochmal.grund))
    const u2 = umgebung()
    try {
      mkdirSync(join(u2.capWurzel, 'pw-mcp'), { recursive: true })
      const belegt = await installiereRessource('pw-mcp', angezeigt(), { installWurzel: u2.installWurzel, capWurzel: u2.capWurzel, runner: stubRunner() })
      assert.ok(!belegt.ok && belegt.status === 409 && /existiert bereits/.test(belegt.grund))
      assert.ok(existsSync(join(u2.capWurzel, 'pw-mcp')), 'fremder, vorhandener Ordner wird nicht gelöscht')
    } finally {
      u2.aufraeumen()
    }
  } finally {
    u.aufraeumen()
  }
})

test('bereiteInstallationVor: Registry-Fehler → 502 (Exit ≠ 0, Zeitgrenze, kein JSON, keine exakte Version/integrity)', async () => {
  const u = umgebung()
  try {
    const nicht = (stdout: string, code: number | null = 0, zeitueberschritten = false): ProzessErgebnis => ({ code, stdout, stderr: 'E404', zeitueberschritten })
    for (const view of [nicht('', 1), nicht('', null, true), nicht('kein json'), nicht(JSON.stringify({ version: '^1.0.0', 'dist.integrity': INTEGRITY })), nicht(JSON.stringify({ version: VERSION }))]) {
      const e = await bereiteInstallationVor('pw-mcp', { installWurzel: u.installWurzel, capWurzel: u.capWurzel, runner: stubRunner({ view }) })
      assert.ok(!e.ok && e.status === 502, JSON.stringify(view))
    }
  } finally {
    u.aufraeumen()
  }
})

test('installiereRessource: Lockfile-Version, npm-Fehler, Zeitgrenze und Serverfehler → 422, Zielordner weg, Katalog bitgleich', async () => {
  const u = umgebung()
  try {
    const faelle: Array<[Parameters<typeof stubRunner>[0], RegExp]> = [
      [{ lockVersion: '9.9.9' }, /installierte Version '9.9.9'/],
      [{ install: { code: 1, stdout: '', stderr: 'npm ERR! 404', zeitueberschritten: false } }, /fehlgeschlagen \(Exit 1\).*404/],
      [{ install: { code: null, stdout: '', stderr: '', zeitueberschritten: true } }, /Zeitgrenze/],
      [{ server: { ok: false, grund: 'Server beendet ohne tools/list-Antwort (Exit 1)' } }, /Serverstart-Prüfung fehlgeschlagen/],
    ]
    for (const [optionen, muster] of faelle) {
      const e = await installiereRessource('pw-mcp', angezeigt(), { installWurzel: u.installWurzel, capWurzel: u.capWurzel, runner: stubRunner(optionen) })
      assert.ok(!e.ok && e.status === 422 && muster.test(e.grund), e.ok ? 'ok' : e.grund)
      assert.equal(existsSync(join(u.capWurzel, 'pw-mcp')), false)
      assert.equal(readFileSync(u.katalog, 'utf8'), katalogText())
    }
  } finally {
    u.aufraeumen()
  }
})

test('installiereRessource: Eintrag seit der Anzeige geändert (eintragHash) → 409 vor jeder Installation', async () => {
  const u = umgebung()
  try {
    const vorher = angezeigt()
    // Werkzeugliste der Vorlage ändert sich zwischen Vorbereiten und Installieren (z. B. git pull).
    writeFileSync(u.katalog, katalogText().replace('["mcp__pw-mcp__browser_navigate"]', '["mcp__pw-mcp__browser_navigate", "mcp__pw-mcp__browser_run_code_unsafe"]'))
    const runner = stubRunner()
    const e = await installiereRessource('pw-mcp', vorher, { installWurzel: u.installWurzel, capWurzel: u.capWurzel, runner })
    assert.ok(!e.ok && e.status === 409 && /seit der Anzeige geändert/.test(e.grund))
    assert.deepEqual(runner.aufrufe, [])
    assert.equal(existsSync(u.capWurzel), false)
  } finally {
    u.aufraeumen()
  }
})

test('installiereRessource: Katalog ändert sich während der Installation → 409, nichts geschrieben, Zielordner weg', async () => {
  const u = umgebung()
  try {
    const geaendert = katalogText().replace('"Bleibt bitgleich."', '"Von Hand geändert."')
    const runner = stubRunner({ beimInstall: () => writeFileSync(u.katalog, geaendert) })
    const e = await installiereRessource('pw-mcp', angezeigt(), { installWurzel: u.installWurzel, capWurzel: u.capWurzel, runner })
    assert.ok(!e.ok && e.status === 409 && /während der Installation geändert/.test(e.grund))
    assert.equal(readFileSync(u.katalog, 'utf8'), geaendert)
    assert.equal(existsSync(join(u.capWurzel, 'pw-mcp')), false)
  } finally {
    u.aufraeumen()
  }
})

test('installiereRessource: geworfene Serverprüfung räumt den Zielordner ab, zweiter Versuch geht', async () => {
  const u = umgebung()
  try {
    const wirft: InstallationsRunner = { ...stubRunner(), pruefeServer: async () => Promise.reject(new Error('spawn EACCES')) }
    const e = await installiereRessource('pw-mcp', angezeigt(), { installWurzel: u.installWurzel, capWurzel: u.capWurzel, runner: wirft })
    assert.ok(!e.ok && e.status === 422 && /spawn EACCES/.test(e.grund))
    assert.equal(existsSync(join(u.capWurzel, 'pw-mcp')), false)
    assert.ok((await installiereRessource('pw-mcp', angezeigt(), { installWurzel: u.installWurzel, capWurzel: u.capWurzel, runner: stubRunner() })).ok)
  } finally {
    u.aufraeumen()
  }
})

test('ECHTE_RUNNER.pruefeServer: Mini-MCP-Server über stdio liefert die Werkzeugnamen; Server ohne Antwort → Zeitgrenze', async () => {
  const ordner = mkdtempSync(join(tmpdir(), 'ws5a-test-mcp-'))
  try {
    const server = join(ordner, 'server.js')
    writeFileSync(
      server,
      `let p='';process.stdin.setEncoding('utf8');process.stdin.on('data',d=>{p+=d;let i;while((i=p.indexOf('\\n'))>=0){const z=p.slice(0,i);p=p.slice(i+1);if(!z.trim())continue;const m=JSON.parse(z);
if(m.id===1)process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:1,result:{protocolVersion:'2025-06-18',capabilities:{},serverInfo:{name:'mini',version:'0'}}})+'\\n');
if(m.id===2)process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:2,result:{tools:[{name:'browser_navigate'},{name:'browser_ümlaut'}]}})+'\\n');}})`
    )
    const ok = await ECHTE_RUNNER.pruefeServer(process.execPath, [server], { cwd: ordner, timeoutMs: 15000 })
    assert.deepEqual(ok, { ok: true, werkzeuge: ['browser_navigate', 'browser_ümlaut'] })
    const stumm = join(ordner, 'stumm.js')
    writeFileSync(stumm, 'setInterval(() => {}, 1000)')
    const zeit = await ECHTE_RUNNER.pruefeServer(process.execPath, [stumm], { cwd: ordner, timeoutMs: 500 })
    assert.ok(!zeit.ok && /keine vollständige Antwort binnen 500 ms/.test(zeit.grund))
  } finally {
    raeumeVerzeichnis(ordner)
  }
})
