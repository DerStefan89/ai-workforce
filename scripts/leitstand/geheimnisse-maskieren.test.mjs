/**
 * Datei: scripts/leitstand/geheimnisse-maskieren.test.mjs
 *
 * Zweck: Rot- und Grünfall je Muster der Maskierung (F45 S, F-1005): jedes bekannte Geheimnis wird zu
 * MASKE, der Schlüsselname bleibt sichtbar; harmlose Befehle und Pfade bleiben unverändert; env-Block
 * einer Einstellungsdatei vollständig maskiert.
 *
 * Wird aufgerufen von:
 * - npm run test (node --test)
 *
 * Wichtig: Alle „Geheimnisse“ hier sind erfundene Testdaten.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MASKE, MUSTER, maskiereEinstellungenJson, maskiereGeheimnisse } from './geheimnisse-maskieren.mjs'

const M = MASKE

/** Rotfälle: [Muster, Eingabe, erwartete Ausgabe]. */
const ROT = [
  ['url-benutzer-passwort', 'git clone https://stefan:hunter2geheim@example.invalid/repo.git', `git clone https://stefan:${M}@example.invalid/repo.git`],
  ['authorization', 'curl -H "Authorization: Bearer abcdefghijklmnop" https://x.invalid', `curl -H "Authorization: Bearer ${M}" https://x.invalid`],
  ['authorization', 'curl -H "Authorization: Basic dXNlcjpwYXNz" x', `curl -H "Authorization: Basic ${M}" x`],
  ['authorization', '{"Authorization": "token-ohne-schema-123"}', `{"Authorization": "${M}"}`],
  ['bearer', 'wget --header="X: Bearer eyJhbGciOiJIUzI1NiJ9.e30.abc" x', `wget --header="X: Bearer ${M}" x`],
  ['flag', 'mysql --password=hunter2 -u root', `mysql --password=${M} -u root`],
  ['flag', 'tool --token abcdef123 run', `tool --token ${M} run`],
  ['flag', 'gh auth --github-token "abc def" x', `gh auth --github-token "${M}" x`],
  ['flag', 'x --api-key=K123 --secret S456', `x --api-key=${M} --secret ${M}`],
  ['zuweisung', 'GITHUB_TOKEN=abc123 npm run x', `GITHUB_TOKEN=${M} npm run x`],
  ['zuweisung', 'curl "https://x.invalid/a?access_token=abc&x=1"', `curl "https://x.invalid/a?access_token=${M}&x=1"`],
  ['zuweisung', 'export DB_PASSWORD="geheim wort"', `export DB_PASSWORD="${M}"`],
  ['zuweisung', 'passwd=xyz secret=abc api_key=k1 apikey=k2', `passwd=${M} secret=${M} api_key=${M} apikey=${M}`],
  ['zuweisung', '{"apiKey": "k-123", "token": "t-456"}', `{"apiKey": "${M}", "token": "${M}"}`],
  ['zuweisung', 'password: hunter2', `password: ${M}`],
  ['zuweisung', 'AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI', `AWS_SECRET_ACCESS_KEY=${M}`],
  ['openai-anthropic', 'echo sk-ant-api03-ABCDEFGHIJKLMNOPQRST', `echo sk-${M}`],
  ['github', 'echo ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123 und gho_abcdefghijklmnopqrstuvwx', `echo ghp_${M} und gho_${M}`],
  ['github-pat', 'echo github_pat_11ABCDEFG0123456789_abcdefghij', `echo github_pat_${M}`],
  ['slack', 'echo xoxb-1234567890-abcdefghij', `echo xoxb-${M}`],
  ['aws', 'echo AKIAIOSFODNN7EXAMPLE', `echo AKIA${M}`],
  // Korrekturrunde (QA F45 S):
  ['url-benutzer-passwort', 'psql postgres://app:geheim@db.invalid:5432/x', `psql postgres://app:${M}@db.invalid:5432/x`],
  ['url-benutzer-passwort', 'redis-cli -u redis://:nurpasswort@cache.invalid', `redis-cli -u redis://:${M}@cache.invalid`],
  ['url-benutzer-passwort', 'git clone https://u:p@ss@host.invalid/r', `git clone https://u:${M}@host.invalid/r`],
  ['authorization', 'curl -d "{\\"Authorization\\": \\"Basic dXNlcjpwYXNz\\"}"', `curl -d "{\\"Authorization\\": \\"Basic ${M}\\"}"`],
  ['curl-benutzer', 'curl -u stefan:geheim https://x.invalid', `curl -u stefan:${M} https://x.invalid`],
  ['flag', 'Connect-Dienst -Password Geheim1 -Token abc123', `Connect-Dienst -Password ${M} -Token ${M}`],
  ['zuweisung', "$env:GITHUB_TOKEN = 'abc123'", `$env:GITHUB_TOKEN = '${M}'`],
  ['zuweisung', 'curl -H "X-Api-Key: abc123" x', `curl -H "X-Api-Key: ${M}" x`],
  ['zuweisung', '//registry.npmjs.org/:_authToken=npm_abc123', `//registry.npmjs.org/:_authToken=${M}`],
  ['zuweisung', 'curl -d "{\\"password\\":\\"x y\\"}" url', `curl -d "{\\"password\\":\\"${M}\\"}" url`],
  ['zuweisung', '"command": "export TOKEN=\\"abc def\\" && run"', `"command": "export TOKEN=\\"${M}\\" && run"`],
  ['zuweisung', 'Server=x;Password=abc;Database=y', `Server=x;Password=${M};Database=y`],
  ['stripe', 'echo sk_live_ABCDEFGHIJKLMNOP1234', `echo sk_live_${M}`],
  ['gitlab', 'echo glpat-ABCDEFGHIJKLMNOPQRST', `echo glpat-${M}`],
  ['aws', 'echo ASIAIOSFODNN7EXAMPLE', `echo ASIA${M}`],
  ['google', 'echo AIzaSyA-1234567890abcdefghijklmnopqrstu', `echo AIza${M}`],
]

/** Grünfälle: bleiben unverändert. */
const GRUEN = [
  'npm run check',
  'npm run test -- --test-concurrency=4',
  'C:\\Users\\stefa\\Projekte\\ai-workforce\\src\\token-store\\index.ts',
  'src/authorization-boundary/index.ts',
  'git status --porcelain',
  'node scripts/check-f813-csrf.mjs',
  'claude --max-tokens 4096 --tokenizer x',
  'grep -rn "password" src',
  '{"apiKeyHelper": "/usr/local/bin/helfer.sh", "maxTokens": 5}',
  'https://github.com/DerStefan89/ai-workforce.git',
  'git@github.com:DerStefan89/ai-workforce.git',
  'Bearer token im Text',
  'task-runner-skript und risk-assessment',
  'sk-kurz',
  'Connect-Dienst -Verbose -Force',
  'git commit -m "Zeile eins\nsecret\nweiter"',
  '{"secret": { "a": 1 }, "token": [1, 2]}',
  'ssh-keygen -t ed25519',
  // QA-Nachpass: Suchmuster und Windows-Pfade.
  'grep -n "token:" datei.md',
  'grep -rn "apiKey:" src/ | grep -v "test"',
  "grep 'password=' config.ini",
  'python -u C:\\x\\y.py',
  'rg -u "C:\\Users\\stefa" -n muster',
]

test('jedes Muster hat mindestens einen Rotfall', () => {
  for (const [name] of MUSTER) assert.ok(ROT.some(([m]) => m === name), `kein Rotfall für ${name}`)
})

for (const [muster, eingabe, erwartet] of ROT) {
  test(`Rot (${muster}): ${eingabe}`, () => {
    const ergebnis = maskiereGeheimnisse(eingabe)
    assert.equal(ergebnis, erwartet)
    assert.equal(maskiereGeheimnisse(ergebnis), ergebnis, 'idempotent')
  })
}

for (const eingabe of GRUEN) {
  test(`Grün: ${eingabe}`, () => {
    assert.equal(maskiereGeheimnisse(eingabe), eingabe)
  })
}

test('Platzhalter ist längenunabhängig', () => {
  assert.equal(maskiereGeheimnisse('token=a'), maskiereGeheimnisse(`token=${'a'.repeat(500)}`))
})

test('am Textende abgeschnittener gequoteter Wert wird maskiert', () => {
  assert.equal(maskiereGeheimnisse('export TOKEN="abc def'), `export TOKEN="${M}"`)
})

test('kein Text bleibt unverändert', () => {
  assert.equal(maskiereGeheimnisse(null), null)
  assert.equal(maskiereGeheimnisse(''), '')
})

test('64-KB-Texte ohne Treffer bleiben schnell — auch die ungünstigen Folgen (Prüfpass cr 2)', () => {
  const faelle = ['a.b-c_d', 'a-', 'a:', '--', '-a', 'a=', 'a+', '"', "'", '\\"', 'x:/', 'Bearer ', 'tok', 'en-'].map((stueck) => stueck.repeat(Math.ceil((64 * 1024) / stueck.length)))
  for (const lang of faelle) {
    const start = performance.now()
    maskiereGeheimnisse(lang)
    const dauer = performance.now() - start
    assert.ok(dauer < 500, `${JSON.stringify(lang.slice(0, 8))}…: ${Math.round(dauer)} ms`)
  }
})

test('Einstellungsdatei: jeder env-Wert maskiert, Schlüssel und Formatierung bleiben; Muster außerhalb von env greifen', () => {
  const settings = [
    '{',
    '  "env": {',
    '    "ANTHROPIC_BASE_URL": "https://proxy.invalid",',
    '    "MEIN_DIENST": "wert-ohne-muster",',
    '    "ZAHL": 5,',
    '    "MIT_ESCAPE": "a\\"b}"',
    '  },',
    '  "apiKeyHelper": "/pfad/helfer.sh",',
    '  "permissions": { "allow": ["Bash(npm run check)"] },',
    '  "hooks": { "x": { "token": "geheim" } }',
    '}',
  ].join('\n')
  const erwartet = [
    '{',
    '  "env": {',
    `    "ANTHROPIC_BASE_URL": "${M}",`,
    `    "MEIN_DIENST": "${M}",`,
    `    "ZAHL": "${M}",`,
    `    "MIT_ESCAPE": "${M}"`,
    '  },',
    '  "apiKeyHelper": "/pfad/helfer.sh",',
    '  "permissions": { "allow": ["Bash(npm run check)"] },',
    `  "hooks": { "x": { "token": "${M}" } }`,
    '}',
  ].join('\n')
  assert.equal(maskiereEinstellungenJson(settings), erwartet)
})

test('Einstellungsdatei: gekürzt mitten im env-Block und ohne env', () => {
  assert.equal(maskiereEinstellungenJson('{\n  "env": {\n    "A": "x",\n    "B": "y'), `{\n  "env": {\n    "A": "${M}",\n    "B": "${M}"`)
  const ohneEnv = '{\n  "permissions": { "allow": ["Read"] }\n}'
  assert.equal(maskiereEinstellungenJson(ohneEnv), ohneEnv)
})
