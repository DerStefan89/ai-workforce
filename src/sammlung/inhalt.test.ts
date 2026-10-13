/**
 * Datei: src/sammlung/inhalt.test.ts
 *
 * Zweck: Tests der reinen Inhalts-Bausteine des Prüflaufs (F45 F-2b-2): Segmentprüfung (A6), Neutralisierung (A5, Rot-Fall
 * „.ClAuDe“), Pfad-Zwillinge (F-1075) und Fakten (Lebenszyklus-Skripte, Hooks, Skill-/Agent-Dateien). Der Tar-Leser und seine
 * Tests sind seit F45 F-2b-2b entfernt (F-1075 Variante C).
 *
 * Wird aufgerufen von: npm run test (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { findeNamensKonflikt, istBinaer, neutralisierePfad, ordnerKonflikt, pfadSchluessel, pruefePfad, sammleFakten } from './inhalt.ts'

test('pruefePfad: lehnt ab, was Windows anders auflöst (A6)', () => {
  assert.equal(pruefePfad('src/index.js'), null)
  assert.equal(pruefePfad('skills/a b/SKILL.md'), null)
  for (const p of ['../x', 'a/../b', '/etc/passwd', 'C:/x', 'a\\b', 'a:b', 'nul', 'docs/CON.txt', 'com1.js', 'a./b', 'a /b', 'x/.', '', 'a//b', 'a\u0001b']) assert.notEqual(pruefePfad(p), null, p)
})

test('neutralisierePfad: .claude in jeder Schreibweise und CLAUDE.md (A5)', () => {
  assert.deepEqual(neutralisierePfad('.ClAuDe/skills/x/SKILL.md'), { pfad: '_.ClAuDe/skills/x/SKILL.md', umbenannt: true })
  assert.deepEqual(neutralisierePfad('plugins/p/.claude-plugin/plugin.json'), { pfad: 'plugins/p/_.claude-plugin/plugin.json', umbenannt: true })
  assert.deepEqual(neutralisierePfad('docs/CLAUDE.md'), { pfad: 'docs/_CLAUDE.md', umbenannt: true })
  assert.deepEqual(neutralisierePfad('Claude.Local.md'), { pfad: '_Claude.Local.md', umbenannt: true })
  assert.deepEqual(neutralisierePfad('claude.md/README.md'), { pfad: 'claude.md/README.md', umbenannt: false })
  assert.deepEqual(neutralisierePfad('skills/x/SKILL.md'), { pfad: 'skills/x/SKILL.md', umbenannt: false })
  // NFC: „.claude“ ist ASCII — eine NFD-Variante eines anderen Namens bleibt unverändert, nur der Vergleich normalisiert.
  assert.equal(neutralisierePfad('.CLAUDE'.normalize('NFD')).umbenannt, true)
})

test('istBinaer: NUL in den ersten 8 KB', () => {
  assert.equal(istBinaer(Buffer.from('text')), false)
  assert.equal(istBinaer(Buffer.from([0x41, 0x00, 0x42])), true)
})

test('findeNamensKonflikt / pfadSchluessel (F-1075): Zwillinge wie NTFS sie auflöst; grüne Gegenprobe', () => {
  assert.match(String(findeNamensKonflikt(['SKILL.md', 'skill.md'])), /Pfad-Zwillinge/)
  assert.match(String(findeNamensKonflikt(['caf\u00e9.md', 'cafe\u0301.md'])), /Pfad-Zwillinge/)
  assert.match(String(findeNamensKonflikt(['a.md', 'a.md.'])), /Pfad-Zwillinge/)
  assert.match(String(findeNamensKonflikt(['a', 'A/b'])), /zugleich Datei und Ordner/)
  assert.equal(findeNamensKonflikt(['a/b.md', 'a/c.md', 'B.md']), null)
  assert.equal(pfadSchluessel('Ordner./Datei.MD '), 'ordner/datei.md')
})

test('ordnerKonflikt: Datei und Ordner gleichen Namens (Normalform)', () => {
  assert.equal(ordnerKonflikt(['a', 'a/b']), 'a')
  assert.equal(ordnerKonflikt(['A', 'a/b']), 'a')
  assert.equal(ordnerKonflikt(['a/b', 'a/c']), null)
})

test('sammleFakten: Lebenszyklus, bin, Hooks, Skill- und Agent-Dateien, übersprungen je Grund', () => {
  const datei = (pfad: string, text: string) => ({ pfad, bytes: Buffer.from(text) })
  const fakten = sammleFakten(
    [
      datei('package.json', JSON.stringify({ scripts: { postinstall: 'node x.js', test: 'node --test' }, bin: { ctx: 'dist/cli.js' }, dependencies: { a: '1', b: '2' } })),
      datei('dist/cli.js', ''),
      datei('skills/s/SKILL.md', '---\nname: s\n---'),
      datei('agents/a.md', ''),
      datei('hooks/hooks.json', '{}'),
      datei('cfg/settings.json', '{"hooks": {}}'),
    ],
    [{ pfad: 'l', grund: 'symlink' }],
    [{ von: '.claude/x', nach: '_.claude/x' }]
  )
  assert.deepEqual(fakten.paket, { lebenszyklus: { postinstall: 'node x.js' }, bin: ['ctx'], abhaengigkeiten: 2, bin_ziele: { ctx: 'dist/cli.js' } })
  assert.deepEqual(fakten.hooks, ['hooks/hooks.json', 'cfg/settings.json'])
  assert.deepEqual(fakten.skill_dateien, ['skills/s/SKILL.md'])
  assert.deepEqual(fakten.agent_dateien, ['agents/a.md'])
  assert.deepEqual(fakten.skripte, { '.js': 1 })
  assert.deepEqual(fakten.uebersprungen.je_grund, { symlink: 1 })
  assert.equal(fakten.umbenannt.length, 1)
})


test('sammleFakten (F45 F-2b-2c): bin_ziele — bin als String trägt den Paketnamen ohne Scope, Nicht-Strings fallen weg', () => {
  const datei = (pfad: string, text: string) => ({ pfad, bytes: Buffer.from(text) })
  const alsText = sammleFakten([datei('package.json', JSON.stringify({ name: '@upstash/context7-mcp', bin: './dist/index.js' }))], [], [])
  assert.deepEqual(alsText.paket?.bin_ziele, { 'context7-mcp': './dist/index.js' })
  const gemischt = sammleFakten([datei('package.json', JSON.stringify({ bin: { a: 'a.js', b: 7 } }))], [], [])
  assert.deepEqual(gemischt.paket?.bin_ziele, { a: 'a.js' })
})
