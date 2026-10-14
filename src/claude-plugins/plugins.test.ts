/**
 * Datei: src/claude-plugins/plugins.test.ts
 *
 * Zweck: node:test-Fälle für den Plugin-Leser (F45 F-3a-1): Liste parsen, Regeln zerlegen, Pin-Regel (N2), Werkzeugsatz und
 * externe Wirkung (M3), Risiken, Hash (Ausschluss .in_use/.git, Gleichheit mit berechneInhaltHash N1, Symlink, Grenzen),
 * Fixture-Bestand (alle Bestandteile, plugin.json-Hook H2, kaputtes Plugin, @builtin, env/headers nie gelesen),
 * Listenfehler, Programmprüfung, Konfigurationsordner, leseFrontmatterFeld.
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { cpSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { raeumeVerzeichnis } from '../../scripts/_aufraeumen.ts'
import { FIXTURE_COMMIT, FIXTURE_GEHEIMNIS, legePluginFixtureAn } from '../../scripts/_plugin-fixture.ts'
import { berechneInhaltHash, leseFrontmatterFeld } from '../ressourcen/skill-dateien.ts'
import {
  berechnePluginHash,
  bestimmeClaudeOrdner,
  kuerzeAnWortgrenze,
  lesePluginBestand,
  listenErgebnisAusProzess,
  parsePluginListe,
  pinVon,
  pruefeClaudeProgramm,
  regelExterneWirkung,
  regelImWerkzeugsatz,
  zerlegeRegeln,
} from './index.ts'

const SATZ = ['Read', 'Grep', 'Glob', 'Write', 'Edit', 'Bash(npm install)', 'Bash(npm run check:*)']
const REFERENZ = { ok: true as const, referenz: { cli_version: '2.1.296 (Claude Code)', agents: ['claude'], plugins: ['cc-plugin-telemetry@builtin'], plugin_skills: [] } }

test('leseFrontmatterFeld: Inline-Wert, YAML-Liste, fehlend, leer', () => {
  assert.deepEqual(leseFrontmatterFeld('---\nallowed-tools: Read, Bash(a:*)\n---\n', 'allowed-tools'), ['Read, Bash(a:*)'])
  assert.deepEqual(leseFrontmatterFeld('---\ntools:\n  - Read\n  - Grep\nname: x\n---\n', 'tools'), ['Read', 'Grep'])
  assert.equal(leseFrontmatterFeld('---\nname: x\n---\n', 'tools'), null)
  assert.equal(leseFrontmatterFeld('ohne frontmatter', 'tools'), null)
  assert.deepEqual(leseFrontmatterFeld('---\ntools:\nname: x\n---\n', 'tools'), [])
})

test('zerlegeRegeln: Komma auf Ebene 0, Klammern ganz, [ ] und Anführungszeichen', () => {
  assert.deepEqual(zerlegeRegeln(['Bash(gh pr comment:*), Bash(gh pr diff:*), Read']), ['Bash(gh pr comment:*)', 'Bash(gh pr diff:*)', 'Read'])
  assert.deepEqual(zerlegeRegeln(['Bash(a, b)']), ['Bash(a, b)'])
  assert.deepEqual(zerlegeRegeln(['["Read", \'Grep\']']), ['Read', 'Grep'])
  assert.deepEqual(zerlegeRegeln(['Read', 'Grep']), ['Read', 'Grep'])
  assert.deepEqual(zerlegeRegeln(null), [])
})

test('pinVon: gepinnt nur mit exakter Version, @latest/Bereich/ohne → ungepinnt, andere Befehle nicht bewertet', () => {
  assert.equal(pinVon({ command: 'npx', args: ['-y', 'paket@1.2.3'] }).pin, 'gepinnt')
  assert.equal(pinVon({ command: 'npx', args: ['-y', '@scope/name@1.2.3'] }).pin, 'gepinnt')
  assert.equal(pinVon({ command: 'npx', args: ['--package=x@1.0.0', 'x'] }).pin, 'gepinnt')
  assert.equal(pinVon({ command: 'npx', args: ['--package=x@1', 'x'] }).pin, 'ungepinnt')
  assert.equal(pinVon({ command: 'npx', args: ['-y', '@playwright/mcp@latest'] }).pin, 'ungepinnt')
  assert.equal(pinVon({ command: 'npx', args: ['-y', '@gitkraken/gk', 'mcp'] }).pin, 'ungepinnt')
  assert.equal(pinVon({ command: 'npx', args: ['paket@^1.2.3'] }).pin, 'ungepinnt')
  assert.equal(pinVon({ command: 'uvx', args: ['--from', 'werkzeug==0.4.1', 'werkzeug'] }).pin, 'gepinnt')
  assert.equal(pinVon({ command: 'uvx', args: ['werkzeug'] }).pin, 'ungepinnt')
  assert.equal(pinVon({ command: 'C:\\x\\npx.cmd', args: ['a@2.0.0'] }).pin, 'gepinnt')
  assert.equal(pinVon({ command: 'pnpm', args: ['dlx', 'a@latest'] }).pin, 'ungepinnt')
  assert.equal(pinVon({ command: 'node', args: ['server.js'] }).pin, 'anderer_befehl')
  assert.equal(pinVon({ command: 'docker', args: ['run', 'img'] }).pin, 'anderer_befehl')
  assert.equal(pinVon({ type: 'http', url: 'https://x' }).pin, 'entfernt')
  assert.equal(pinVon({ url: 'https://x' }).pin, 'entfernt')
  assert.equal(pinVon({}).pin, 'unbestimmt')
  assert.equal(pinVon({ command: 'npx', args: ['-y'] }).pin, 'unbestimmt')
})

test('regelImWerkzeugsatz: wörtlich oder nackter Name im Satz', () => {
  assert.equal(regelImWerkzeugsatz('Bash(npm run check:*)', SATZ), true)
  assert.equal(regelImWerkzeugsatz('Read(./x)', SATZ), true)
  assert.equal(regelImWerkzeugsatz('Bash(npm run check)', SATZ), false)
  assert.equal(regelImWerkzeugsatz('Bash(gh pr comment:*)', SATZ), false)
  assert.equal(regelImWerkzeugsatz('WebFetch', SATZ), false)
})

test('regelExterneWirkung: erstes Wort, nacktes Bash, Bash(*), Web-Werkzeuge; kein Teilstring', () => {
  for (const r of ['Bash(gh pr comment:*)', 'Bash(curl:*)', 'Bash(git push:*)', 'Bash(npm publish)', 'Bash', 'Bash(*)', 'WebFetch', 'WebSearch', 'Bash(wget https://x)']) assert.equal(regelExterneWirkung(r), true, r)
  for (const r of ['Bash(ghost:*)', 'Bash(git status)', 'Bash(npm run check:*)', 'Read', 'Bash(echo gh)']) assert.equal(regelExterneWirkung(r), false, r)
})

test('parsePluginListe: Format der CLI, Fehlerfälle', () => {
  const ok = parsePluginListe('[{"id":"a@m","version":"1","scope":"user","enabled":true,"installPath":"C:\\\\x"}]')
  assert.equal(ok.ok, true)
  assert.equal(parsePluginListe('kein json').ok, false)
  assert.equal(parsePluginListe('{}').ok, false)
  // Code-Review 5: ein einzelner kaputter Eintrag kippt nicht die Liste.
  const ohnePfad = parsePluginListe('[{"id":"a@m"}, 7]')
  assert.equal(ohnePfad.ok, true)
  assert.deepEqual(
    ohnePfad.ok ? ohnePfad.eintraege.map((e) => [e.id, e.installPath]) : [],
    [
      ['a@m', ''],
      ['(Eintrag 1 ohne id)', ''],
    ],
  )
  assert.deepEqual(parsePluginListe('[]'), { ok: true, eintraege: [] })
})

test('Korrekturrunde: Regel-Formen, YAML ohne Einrückung, Pin-Formen, PowerShell, Kürzen an Wortgrenze', () => {
  assert.deepEqual(zerlegeRegeln(['"Bash(gh pr comment:*), Read"']), ['Bash(gh pr comment:*)', 'Read'])
  assert.deepEqual(zerlegeRegeln(['Read WebFetch']), ['Read', 'WebFetch'])
  assert.deepEqual(zerlegeRegeln(['Bash(npm run check:*) Read']), ['Bash(npm run check:*)', 'Read'])
  assert.deepEqual(leseFrontmatterFeld('---\nallowed-tools:\n- Bash(curl:*)\n- Read\nname: x\n---\n', 'allowed-tools'), ['Bash(curl:*)', 'Read'])
  assert.deepEqual(pinVon({ command: 'cmd', args: ['/c', 'npx', '-y', 'paket'] }), { pin: 'ungepinnt', paket: 'paket' })
  assert.deepEqual(pinVon({ command: 'cmd.exe', args: ['/C', 'npx', 'paket@1.2.3'] }), { pin: 'gepinnt', paket: 'paket@1.2.3' })
  assert.deepEqual(pinVon({ command: 'pipx', args: ['run', 'werkzeug==1.2.3'] }), { pin: 'gepinnt', paket: 'werkzeug==1.2.3' })
  assert.deepEqual(pinVon({ command: 'pipx', args: ['run', '--spec', 'werkzeug==1.2.3', 'werkzeug'] }), { pin: 'gepinnt', paket: 'werkzeug==1.2.3' })
  assert.deepEqual(pinVon({ command: 'uvx', args: ['--python', '3.12', 'werkzeug'] }), { pin: 'ungepinnt', paket: 'werkzeug' })
  assert.deepEqual(pinVon({ command: 'uvx', args: ['--python=3.12', 'werkzeug==0.1.0'] }), { pin: 'gepinnt', paket: 'werkzeug==0.1.0' })
  assert.equal(regelExterneWirkung('PowerShell(Invoke-WebRequest:*)'), true)
  assert.equal(regelExterneWirkung('PowerShell'), true)
  assert.equal(regelExterneWirkung('PowerShell(Get-ChildItem:*)'), false)
  assert.equal(kuerzeAnWortgrenze('kurz', 10), 'kurz')
  assert.equal(kuerzeAnWortgrenze(`fehler ${FIXTURE_GEHEIMNIS}`, 20), 'fehler …')
  assert.equal(kuerzeAnWortgrenze('x'.repeat(30), 10), '…')
})

test('listenErgebnisAusProzess: Zeitgrenze ohne Teilausgabe, Exit ≠ 0, Startfehler', () => {
  assert.deepEqual(listenErgebnisAusProzess({ stdout: '[{"id":', stderr: '', exitCode: null, startfehler: null, beendigungsart: 'TIMEOUT' }), { ok: false, grund: 'claude plugin list: Zeitgrenze überschritten' })
  assert.equal(listenErgebnisAusProzess({ stdout: '', stderr: 'kaputt', exitCode: 1, startfehler: null, beendigungsart: null }).ok, false)
  assert.equal(listenErgebnisAusProzess({ stdout: '', stderr: '', exitCode: null, startfehler: { message: 'ENOENT' }, beendigungsart: null }).ok, false)
  assert.deepEqual(listenErgebnisAusProzess({ stdout: '[]', stderr: '', exitCode: 0, startfehler: null, beendigungsart: null }), { ok: true, stdout: '[]' })
})

test('pruefeClaudeProgramm und bestimmeClaudeOrdner', () => {
  assert.equal(pruefeClaudeProgramm('C:\\Program Files\\claude\\claude.exe'), null)
  assert.equal(pruefeClaudeProgramm('/usr/bin/CLAUDE. '), null)
  assert.match(pruefeClaudeProgramm('C:\\x\\node.exe') ?? '', /nicht die Claude-CLI/)
  assert.match(pruefeClaudeProgramm(undefined) ?? '', /fehlt/)
  assert.equal(bestimmeClaudeOrdner({ CLAUDE_CONFIG_DIR: 'D:\\cfg' }, 'C:\\h'), 'D:\\cfg')
  assert.equal(bestimmeClaudeOrdner({ CLAUDE_CONFIG_DIR: '  ' }, 'C:\\h'), join('C:\\h', '.claude'))
  assert.equal(bestimmeClaudeOrdner({}, 'C:\\h'), join('C:\\h', '.claude'))
})

test('berechnePluginHash: gleich berechneInhaltHash ohne Ausschluss-Ordner (N1), .in_use/.git zählen nicht, Grenzen, Symlink', async () => {
  const w = mkdtempSync(join(tmpdir(), 'f3a-hash-'))
  try {
    const { pfade } = legePluginFixtureAn(w)
    const ohne = join(w, 'ohne')
    cpSync(pfade.voll, ohne, { recursive: true })
    raeumeVerzeichnis(join(ohne, '.in_use'))
    raeumeVerzeichnis(join(ohne, '.git'))
    const mitAusschluss = await berechnePluginHash(pfade.voll)
    assert.equal(mitAusschluss.hash, berechneInhaltHash(ohne))
    assert.equal((await berechnePluginHash(ohne)).hash, mitAusschluss.hash)
    writeFileSync(join(pfade.voll, '.in_use', '456'), 'andere marke')
    assert.equal((await berechnePluginHash(pfade.voll)).hash, mitAusschluss.hash)
    writeFileSync(join(pfade.voll, 'skills', 's-eins', 'SKILL.md'), 'geändert')
    assert.notEqual((await berechnePluginHash(pfade.voll)).hash, mitAusschluss.hash)
    const dateiGrenze = await berechnePluginHash(pfade.voll, { dateien: 3, bytes: 1e9 })
    assert.equal(dateiGrenze.hash, null)
    assert.match(dateiGrenze.grund ?? '', /mehr als 3 Dateien/)
    assert.match((await berechnePluginHash(pfade.voll, { dateien: 1000, bytes: 10 })).grund ?? '', /mehr als 10 Bytes/)
    // Die Grenze zählt nach dem Ausschluss: .git mit vielen Dateien überschreitet sie nicht.
    for (let i = 0; i < 20; i++) writeFileSync(join(pfade.voll, '.git', `obj${i}`), 'x')
    assert.notEqual((await berechnePluginHash(pfade.voll, { dateien: 12, bytes: 1e9 })).hash, null)
    let symlinkMoeglich = true
    try {
      symlinkSync(join(pfade.voll, 'LICENSE'), join(ohne, 'link'))
    } catch {
      symlinkMoeglich = false // Windows ohne Entwicklermodus: kein Symlink anlegbar
    }
    if (symlinkMoeglich) {
      const s = await berechnePluginHash(ohne)
      assert.equal(s.hash, null)
      assert.match(s.grund ?? '', /Symlink/)
    }
  } finally {
    raeumeVerzeichnis(w)
  }
})

test('lesePluginBestand: Fixture — Bestandteile, Pins, Risiken, kaputt, @builtin, Commit, env/headers nie gelesen', async () => {
  const w = mkdtempSync(join(tmpdir(), 'f3a-bestand-'))
  try {
    const f = legePluginFixtureAn(w)
    const bestand = await lesePluginBestand({ liste: async () => ({ ok: true, stdout: f.listeJson }), claudeOrdner: f.claudeOrdner, werkzeugsatz: SATZ, eingebaut: REFERENZ })
    assert.equal(bestand.status, 'ok')
    if (bestand.status !== 'ok') return
    assert.deepEqual(
      bestand.plugins.map((p) => p.id),
      ['voll@markt', 'nur-skill@markt', 'kaputt@markt'],
    )
    assert.deepEqual(bestand.eingebaut, [
      { id: 'cc-plugin-telemetry@builtin', quelle: 'referenzliste', cli_version: '2.1.296 (Claude Code)' },
      { id: 'cc-plugin-fixture@builtin', quelle: 'cli-liste', cli_version: null },
    ])
    const voll = bestand.plugins[0]
    assert.equal(voll.commit, FIXTURE_COMMIT)
    assert.equal(voll.lizenz_datei, true)
    assert.equal(voll.lizenz_feld, 'MIT')
    assert.match(voll.inhalt_hash ?? '', /^[0-9a-f]{64}$/)
    assert.deepEqual(voll.fehler, [])
    assert.deepEqual(voll.bestandteile.skills, [{ name: 's-eins', pfad: 'skills/s-eins/SKILL.md', allowed_tools: ['Read', 'Bash(curl:*)'] }])
    assert.deepEqual(voll.bestandteile.agents, [{ name: 'a-eins', pfad: 'agents/a-eins.md', tools: ['Read', 'Grep'] }])
    assert.deepEqual(voll.bestandteile.commands, [{ name: 'c-eins', pfad: 'commands/c-eins.md', allowed_tools: ['Bash(gh pr comment:*)', 'Bash(npm run check:*)'] }])
    assert.deepEqual(
      voll.bestandteile.hooks.map((h) => [h.ereignis, h.matcher, h.typ, h.quelle]),
      [
        ['SessionStart', 'startup', 'command', 'hooks/hooks.json'],
        ['PostToolUse', 'Write', 'command', 'plugin.json'],
      ],
    )
    assert.deepEqual(
      voll.bestandteile.mcp.map((m) => [m.name, m.art, m.pin, m.paket]),
      [
        ['latest', 'stdio', 'ungepinnt', 'paket@latest'],
        ['fest', 'stdio', 'gepinnt', '@scope/paket@1.2.3'],
        ['fern', 'http', 'entfernt', null],
        ['lokal', 'stdio', 'anderer_befehl', null],
      ],
    )
    assert.deepEqual(voll.bestandteile.lsp, [{ name: 'ts', befehl: 'typescript-language-server', args: ['--stdio'], quelle: '.lsp.json' }])
    assert.deepEqual(
      voll.risiken.map((r) => `${r.art} ${r.bestandteil}`),
      [
        'hook_befehl hook:SessionStart',
        'hook_befehl hook:PostToolUse',
        'mcp_ungepinnt mcp:latest',
        'mcp_entfernt mcp:fern',
        'rechte_ausserhalb skill:s-eins',
        'externe_wirkung skill:s-eins',
        'rechte_ausserhalb command:c-eins',
        'externe_wirkung command:c-eins',
      ],
    )
    // Der Leser liefert den Befehl roh (Maskierung in der Route); env/headers erscheinen nirgends.
    assert.match(JSON.stringify(voll), new RegExp(FIXTURE_GEHEIMNIS))
    assert.doesNotMatch(JSON.stringify(bestand), /geheim-im-header|geheim-in-env/)

    const nurSkill = bestand.plugins[1]
    assert.deepEqual([nurSkill.aktiv, nurSkill.projekt_aktiv, nurSkill.bestandteile.skills.length, nurSkill.risiken.length, nurSkill.lizenz_datei, nurSkill.commit], [false, false, 1, 0, false, null])
    assert.match(nurSkill.projekt_pfad ?? '', /projekt$/)

    const kaputt = bestand.plugins[2]
    assert.equal(kaputt.fehler.length, 2)
    assert.match(kaputt.fehler[0], /plugin\.json ist kein JSON/)
    assert.match(kaputt.fehler[1], /hooks hat eine unbekannte Form/)
    assert.match(kaputt.inhalt_hash ?? '', /^[0-9a-f]{64}$/)

    // Ohne Werkzeugsatz: rechte_nicht_bestimmbar statt rechte_ausserhalb.
    const ohneSatz = await lesePluginBestand({ liste: async () => ({ ok: true, stdout: f.listeJson }), claudeOrdner: f.claudeOrdner, werkzeugsatz: null, eingebaut: { ok: false, grund: 'Referenz fehlt' } })
    assert.equal(ohneSatz.status, 'ok')
    if (ohneSatz.status === 'ok') {
      assert.ok(ohneSatz.plugins[0].risiken.some((r) => r.art === 'rechte_nicht_bestimmbar'))
      assert.ok(!ohneSatz.plugins[0].risiken.some((r) => r.art === 'rechte_ausserhalb'))
      assert.equal(ohneSatz.eingebaut_fehler, 'Referenz fehlt')
    }
  } finally {
    raeumeVerzeichnis(w)
  }
})

test('lesePluginBestand: Listenfehler, Ordner fehlt, relativer installPath, plugin.json-Pfade außerhalb', async () => {
  const w = mkdtempSync(join(tmpdir(), 'f3a-fehler-'))
  try {
    assert.deepEqual(await lesePluginBestand({ liste: async () => ({ ok: false, grund: 'Exit 1' }), claudeOrdner: w, werkzeugsatz: SATZ, eingebaut: REFERENZ }), { status: 'fehler', grund: 'Exit 1' })
    assert.equal((await lesePluginBestand({ liste: async () => ({ ok: true, stdout: 'nein' }), claudeOrdner: w, werkzeugsatz: SATZ, eingebaut: REFERENZ })).status, 'fehler')
    assert.equal((await lesePluginBestand({ liste: async () => Promise.reject(new Error('wurf')), claudeOrdner: w, werkzeugsatz: SATZ, eingebaut: REFERENZ })).status, 'fehler')
    const aussen = join(w, 'aussen')
    mkdirSync(join(aussen, '.claude-plugin'), { recursive: true })
    writeFileSync(join(aussen, '.claude-plugin', 'plugin.json'), JSON.stringify({ name: 'aussen', commands: '../../geheim', mcpServers: 5 }))
    const liste = JSON.stringify([
      { id: 'weg@m', installPath: join(w, 'gibt-es-nicht') },
      { id: 'rel@m', installPath: 'relativ/pfad' },
      { id: 'aussen@m', installPath: aussen },
    ])
    const b = await lesePluginBestand({ liste: async () => ({ ok: true, stdout: liste }), claudeOrdner: w, werkzeugsatz: SATZ, eingebaut: REFERENZ })
    assert.equal(b.status, 'ok')
    if (b.status !== 'ok') return
    assert.match(b.plugins[0].fehler[0], /Plugin-Ordner fehlt/)
    assert.equal(b.plugins[0].inhalt_hash, null)
    assert.match(b.plugins[1].fehler[0], /kein absoluter Pfad/)
    assert.ok(b.plugins[2].fehler.some((x) => /Pfad außerhalb des Plugin-Ordners/.test(x)))
    assert.ok(b.plugins[2].fehler.some((x) => /mcpServers: unbekannte Form/.test(x)))
  } finally {
    raeumeVerzeichnis(w)
  }
})

test('lesePluginBestand: Leerbestand, Command im Unterordner, prompt-Hook, eingebettete mcp/lsp, leere url, JSON null, Junction', async () => {
  const w = mkdtempSync(join(tmpdir(), 'f3a-formen-'))
  try {
    // QA 3: die CLI liefert ohne Plugins (auch ohne Anmeldung, gemessen 14.10.2026) '[]' — Leerbestand ist ok, kein Fehler.
    const leer = await lesePluginBestand({ liste: async () => ({ ok: true, stdout: '[]' }), claudeOrdner: w, werkzeugsatz: SATZ, eingebaut: REFERENZ })
    assert.deepEqual(leer.status === 'ok' ? [leer.plugins.length, leer.eingebaut.length] : null, [0, 1])

    const p = join(w, 'formen')
    const schreibe = (rel: string, inhalt: string): void => {
      const ziel = join(p, ...rel.split('/'))
      mkdirSync(join(ziel, '..'), { recursive: true })
      writeFileSync(ziel, inhalt)
    }
    schreibe(
      '.claude-plugin/plugin.json',
      JSON.stringify({
        name: 'formen',
        hooks: './extra/hooks.json',
        mcpServers: { leer: { type: 'http', url: '' }, wrap: { command: 'cmd', args: ['/c', 'npx', '-y', 'x@latest'] } },
        lspServers: { py: { command: 'pyright-langserver', args: ['--stdio'] } },
      }),
    )
    schreibe('commands/gruppe/tief.md', '---\nallowed-tools: "Bash(curl:*), Read"\n---\nText\n')
    schreibe('extra/hooks.json', JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: 'prompt', prompt: 'prüfe' }] }] } }))
    schreibe('hooks/hooks.json', 'null')
    mkdirSync(join(w, 'ziel'))
    let junction = true
    try {
      symlinkSync(join(w, 'ziel'), join(p, 'agents'), 'junction')
    } catch {
      junction = false
    }
    const b = await lesePluginBestand({ liste: async () => ({ ok: true, stdout: JSON.stringify([{ id: 'formen@m', installPath: p }]) }), claudeOrdner: w, werkzeugsatz: SATZ, eingebaut: REFERENZ })
    assert.equal(b.status, 'ok')
    if (b.status !== 'ok') return
    const e = b.plugins[0]
    assert.deepEqual(e.bestandteile.commands, [{ name: 'gruppe:tief', pfad: 'commands/gruppe/tief.md', allowed_tools: ['Bash(curl:*)', 'Read'] }])
    assert.deepEqual(
      e.bestandteile.hooks.map((h) => [h.ereignis, h.typ, h.befehl, h.quelle]),
      [['Stop', 'prompt', null, 'extra/hooks.json']],
    )
    assert.deepEqual(
      e.bestandteile.mcp.map((m) => [m.name, m.pin, m.quelle]),
      [
        ['leer', 'entfernt', 'plugin.json'],
        ['wrap', 'ungepinnt', 'plugin.json'],
      ],
    )
    assert.deepEqual(e.bestandteile.lsp.map((l) => l.name), ['py'])
    assert.ok(e.risiken.some((r) => r.art === 'hook_andere' && /Typ prompt/.test(r.text)))
    assert.ok(e.risiken.some((r) => r.art === 'mcp_entfernt' && r.text.endsWith('(ohne url)')))
    assert.ok(e.risiken.some((r) => r.art === 'externe_wirkung' && r.bestandteil === 'command:gruppe:tief'))
    assert.ok(e.fehler.some((f) => /hooks\/hooks\.json: hooks hat eine unbekannte Form/.test(f)))
    if (junction) {
      assert.ok(e.fehler.some((f) => /Symlink\/Junction nicht gelesen: agents/.test(f)))
      assert.equal(e.inhalt_hash, null)
      assert.match(e.hash_grund ?? '', /Symlink\/Junction/)
    }
  } finally {
    raeumeVerzeichnis(w)
  }
})
