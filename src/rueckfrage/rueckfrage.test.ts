/**
 * Datei: src/rueckfrage/rueckfrage.test.ts
 *
 * Zweck: node:test-Fälle für die reine Regel des Rückfrage-Kanals (F45 B2b-3b-1a, features/F45/plan-b2b3b1a-v2.md §1/§5):
 * Pfadgrenze des Arbeitsordners (fail closed: .., UNC, Gerätepfade, Laufwerk, Groß/klein unter Windows, Alternate Data
 * Streams, Junction nach außen), Vorentscheidung (nur Bash geht an Stefan, A9) und Argv-Baustein (aus ⇒ dasselbe Objekt,
 * an ⇒ mcp-config, Werkzeug, permission-prompt-tool; Kollision ⇒ ok:false ohne Wurf, A1/B3).
 */

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { raeumeVerzeichnis } from '../../scripts/_aufraeumen.ts'
import { FRAGE_WERKZEUG, RECHTE_WERKZEUG, RUECKFRAGE_SERVER, ergaenzeRueckfrageAufruf, liegtImArbeitsordner, vorentscheidung, werkzeugNamenAus } from './index.ts'

/** Textuelle Prüfung ohne Dateisystem: jeder Pfad „existiert“ und ist sein eigener realpath. */
const WIN = { plattform: 'win32' as const, realpath: (p: string) => p }
const POSIX = { plattform: 'posix' as const, realpath: (p: string) => p }
const ORDNER_WIN = 'C:\\proj\\wf'
const ORDNER_POSIX = '/proj/wf'

test('liegtImArbeitsordner (win32): innen relativ, absolut, Groß/klein und / statt \\ ⇒ ok', () => {
  for (const pfad of ['x.txt', 'src\\a.ts', 'src/a.ts', '.\\src\\..\\b.ts', 'C:\\proj\\wf\\x', 'c:\\PROJ\\WF\\x', 'C:/proj/wf/x', 'C:\\proj\\wf']) {
    assert.deepEqual(liegtImArbeitsordner(pfad, ORDNER_WIN, WIN), { ok: true }, pfad)
  }
})

test('liegtImArbeitsordner (win32): Rotfälle ⇒ nein (fail closed)', () => {
  const rot = [
    '..\\x',
    '..\\..\\x',
    '../x',
    'src\\..\\..\\x',
    'C:\\proj\\x',
    'D:\\proj\\wf\\x',
    'C:\\proj\\wf2\\x',
    '\\\\server\\share\\x',
    '//server/share/x',
    '\\\\?\\C:\\proj\\wf\\x',
    '\\\\.\\C:\\proj\\wf\\x',
    'C:x',
    'C:',
    'x.txt:strom',
    'C:\\proj\\wf\\x.txt:strom',
    'x.',
    'src\\x \\y',
    '~\\x',
    '~',
    '\\proj\\wf\\x',
    '',
    'a\u0000b',
  ]
  for (const pfad of rot) {
    const ergebnis = liegtImArbeitsordner(pfad, ORDNER_WIN, WIN)
    assert.equal(ergebnis.ok, false, `erwartet nein: ${JSON.stringify(pfad)}`)
  }
  assert.equal(liegtImArbeitsordner(42, ORDNER_WIN, WIN).ok, false)
  assert.equal(liegtImArbeitsordner('x', 'relativ\\ordner', WIN).ok, false, 'Arbeitsordner nicht absolut')
})

test('liegtImArbeitsordner (posix): innen ok, \\ im Pfad und Groß/klein ⇒ nein', () => {
  assert.deepEqual(liegtImArbeitsordner('src/a.ts', ORDNER_POSIX, POSIX), { ok: true })
  assert.deepEqual(liegtImArbeitsordner('/proj/wf/a', ORDNER_POSIX, POSIX), { ok: true })
  for (const pfad of ['../x', '/proj/wf2/x', '/etc/passwd', 'wf\\..\\..\\x', '/PROJ/wf/x', '~/x', '']) {
    assert.equal(liegtImArbeitsordner(pfad, ORDNER_POSIX, POSIX).ok, false, pfad)
  }
})

test('liegtImArbeitsordner: realpath — Junction/Symlink nach außen ⇒ nein, auch für eine noch nicht existierende Datei', () => {
  const wurzel = mkdtempSync(join(tmpdir(), 'rueckfrage-junction-'))
  try {
    const innen = join(wurzel, 'innen')
    const aussen = join(wurzel, 'aussen')
    mkdirSync(innen)
    mkdirSync(aussen)
    mkdirSync(join(innen, 'echt'))
    symlinkSync(aussen, join(innen, 'tor'), 'junction')
    writeFileSync(join(aussen, 'da.txt'), 'x')
    assert.equal(liegtImArbeitsordner(join(innen, 'tor', 'da.txt'), innen).ok, false, 'existierende Datei hinter der Junction')
    assert.equal(liegtImArbeitsordner(join(innen, 'tor', 'neu', 'neu.txt'), innen).ok, false, 'neue Datei hinter der Junction')
    assert.equal(liegtImArbeitsordner('tor/neu.txt', innen).ok, false, 'relativ hinter der Junction')
    assert.deepEqual(liegtImArbeitsordner(join(innen, 'echt', 'neu.txt'), innen), { ok: true })
    assert.deepEqual(liegtImArbeitsordner('neu/tief/x.ts', innen), { ok: true })
  } finally {
    raeumeVerzeichnis(wurzel)
  }
})

test('liegtImArbeitsordner: realpath wirft unerwartet ⇒ nein', () => {
  const realpath = () => {
    throw Object.assign(new Error('EACCES'), { code: 'EACCES' })
  }
  assert.equal(liegtImArbeitsordner('x', ORDNER_WIN, { plattform: 'win32', realpath }).ok, false)
})

const SATZ = ['Read', 'Grep', 'Glob', 'Write', 'Edit', 'Bash', FRAGE_WERKZEUG]
const vor = (name: unknown, input: unknown) => vorentscheidung(name, input, ORDNER_WIN, SATZ, WIN)

test('vorentscheidung: Bash mit Befehl ⇒ frage_stefan', () => {
  assert.deepEqual(vor('Bash', { command: 'node -e "1"' }), { art: 'frage_stefan' })
  assert.deepEqual(vor('Bash', { command: 'npm test', description: 'Tests', timeout: 1000, run_in_background: false }), { art: 'frage_stefan' })
})

test('vorentscheidung: Rotfälle ⇒ auto_deny mit Grund', () => {
  const faelle: [unknown, unknown, RegExp][] = [
    ['WebFetch', { url: 'https://x' }, /nicht im Werkzeugsatz/],
    ['mcp__x__y', {}, /nicht im Werkzeugsatz/],
    ['', {}, /nicht im Werkzeugsatz/],
    [undefined, {}, /nicht im Werkzeugsatz/],
    ['Bash', null, /Eingabe ungültig/],
    ['Bash', [], /Eingabe ungültig/],
    ['Bash', {}, /Befehl/],
    ['Bash', { command: '   ' }, /Befehl/],
    ['Bash', { command: 'sleep 9', run_in_background: true }, /Hintergrund/],
    ['Bash', { command: 'x', run_in_background: 'ja' }, /Eingabe ungültig/],
    ['Bash', { command: 'x', dangerouslyDisableSandbox: true }, /unbekanntes Eingabefeld/],
    ['Bash', { command: 'claude --dangerously-skip-permissions -p x' }, /E-182/],
    ['Bash', { command: 'claude "--bare"' }, /E-182/],
    ['Bash', { command: 'x', file_path: 'C:\\anders\\x' }, /außerhalb/],
    ['Write', { file_path: 'C:\\anders\\x.txt', content: 'x' }, /außerhalb/],
    ['Write', { file_path: '..\\x.txt', content: 'x' }, /außerhalb/],
    ['Write', { content: 'x' }, /Pfad fehlt/],
    ['Edit', { file_path: 42 }, /nicht prüfbar/],
    ['Read', { file_path: '\\\\server\\s\\x' }, /außerhalb|nicht prüfbar/],
    ['Grep', { pattern: 'x', path: 'C:\\' }, /außerhalb/],
    ['Write', { file_path: 'innen.txt', content: 'x' }, /nur Bash/],
    ['Read', { file_path: 'innen.txt' }, /nur Bash/],
    [FRAGE_WERKZEUG, { frage: 'x', optionen: [] }, /nur Bash/],
  ]
  for (const [name, input, grund] of faelle) {
    const ergebnis = vor(name, input)
    assert.equal(ergebnis.art, 'auto_deny', `${String(name)} ${JSON.stringify(input)}`)
    assert.match((ergebnis as { grund: string }).grund, grund, `${String(name)} ${JSON.stringify(input)}`)
  }
})

test('werkzeugNamenAus: Regel von --tools (Name vor der Klammer, eindeutig, stabile Reihenfolge)', () => {
  assert.deepEqual(werkzeugNamenAus(['Read', 'Bash(npm ci)', 'Bash(npm run check:*)', 'Edit(./**)', FRAGE_WERKZEUG]), ['Read', 'Bash', 'Edit', FRAGE_WERKZEUG])
})

const KANAL = { url: 'http://127.0.0.1:4711', token: 'a'.repeat(64), skriptPfad: 'C:\\inst\\scripts\\leitstand\\rueckfrage-mcp.mjs', nodePfad: 'C:\\node\\node.exe', warteGrenzeMs: 600000 }
const EINGABEN = { modell: 'm', werkzeugsatz: { modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read', 'Bash(npm ci)'] } }

test('ergaenzeRueckfrageAufruf: ohne Kanal ⇒ dasselbe Objekt (Argv bitgleich)', () => {
  const ergebnis = ergaenzeRueckfrageAufruf(EINGABEN, undefined)
  assert.equal(ergebnis.ok, true)
  assert.equal((ergebnis as { aufrufEingaben: unknown }).aufrufEingaben, EINGABEN)
})

test('ergaenzeRueckfrageAufruf: mit Kanal ⇒ Server rueckfrage (env, timeout), Katalog-MCP bleibt, frage_stefan, permission-prompt-tool', () => {
  const katalog = JSON.stringify({ mcpServers: { playwright: { command: 'npx', args: ['x'] } } })
  const ergebnis = ergaenzeRueckfrageAufruf({ ...EINGABEN, mcpConfig: katalog }, KANAL)
  assert.equal(ergebnis.ok, true)
  if (!ergebnis.ok) return
  const a = ergebnis.aufrufEingaben
  assert.equal(a.permissionPromptTool, RECHTE_WERKZEUG)
  assert.deepEqual(a.werkzeugsatz.erlaubte_werkzeuge, ['Read', 'Bash(npm ci)', FRAGE_WERKZEUG])
  const config = JSON.parse(String(a.mcpConfig))
  assert.deepEqual(Object.keys(config.mcpServers), ['playwright', RUECKFRAGE_SERVER])
  assert.deepEqual(config.mcpServers[RUECKFRAGE_SERVER], {
    command: KANAL.nodePfad,
    args: [KANAL.skriptPfad],
    env: { WORKFORCE_RUECKFRAGE_URL: KANAL.url, WORKFORCE_RUECKFRAGE_TOKEN: KANAL.token, WORKFORCE_RUECKFRAGE_FRIST_MS: String(660000) },
    timeout: 720000,
  })
  // ohne Katalog-MCP: leere mcp-config wird ergänzt
  const ohne = ergaenzeRueckfrageAufruf(EINGABEN, KANAL)
  assert.equal(ohne.ok, true)
  if (ohne.ok) assert.deepEqual(Object.keys(JSON.parse(String(ohne.aufrufEingaben.mcpConfig)).mcpServers), [RUECKFRAGE_SERVER])
})

test('ergaenzeRueckfrageAufruf: Kollision und kaputte Eingaben ⇒ ok:false, kein Wurf (A1, B3)', () => {
  const faelle: [Record<string, unknown>, typeof KANAL][] = [
    [{ ...EINGABEN, mcpConfig: JSON.stringify({ mcpServers: { rueckfrage: { command: 'x', args: [] } } }) }, KANAL],
    [{ ...EINGABEN, mcpConfig: '{kaputt' }, KANAL],
    [{ ...EINGABEN, mcpConfig: '[]' }, KANAL],
    [{ ...EINGABEN, mcpConfig: '{"mcpServers":[]}' }, KANAL],
    [{ ...EINGABEN, permissionPromptTool: 'x' }, KANAL],
    [{ modell: 'm' }, KANAL],
    [EINGABEN, { ...KANAL, url: 'http://example.com:1' }],
    [EINGABEN, { ...KANAL, url: 'kaputt' }],
    [EINGABEN, { ...KANAL, token: 'kurz' }],
    [EINGABEN, { ...KANAL, skriptPfad: '' }],
    [EINGABEN, { ...KANAL, warteGrenzeMs: 0 }],
  ]
  for (const [eingaben, kanal] of faelle) {
    const ergebnis = ergaenzeRueckfrageAufruf(eingaben as typeof EINGABEN, kanal)
    assert.equal(ergebnis.ok, false, JSON.stringify(eingaben).slice(0, 80))
  }
})
