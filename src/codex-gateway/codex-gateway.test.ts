/**
 * Datei: src/codex-gateway/codex-gateway.test.ts
 *
 * Zweck: node:test-Fälle für das Codex-Gateway, WS-1 + WS-2 (F16,
 * features/F16/feature.md, AK1–AK3 und AK7).
 *
 * AK1 — baueCodexAufruf liefert exakt das erwartete Tokens-Array (mit und
 * ohne Ausgabeschema) und wirft bei leerem modell, leerem prompt und einem
 * prompt mit führendem '-'; ein relativer ausgabeSchemaPfad wirft
 * ebenfalls.
 *
 * AK2 — pruefeCodexAufruf ist grün ausschließlich für ein vollständig
 * allowlist-konformes Argv und rot für jeden real existierenden
 * abwählenden Parameter von `codex exec` 0.153.4, für jedes -c/--config,
 * für jeden anderen Sandbox-Wert, für fehlendes/doppeltes Sandbox-Token,
 * für zwei Prompt-Tokens — und für ein frei erfundenes Token. Der
 * erfundene Fall ist der eigentliche Punkt der Bauart: eine Allowlist muss
 * auch ablehnen, was es heute noch gar nicht gibt (F-281). KEINE Fälle für
 * --full-auto oder --yolo: beide existieren in `codex exec` 0.153.4 nicht
 * (F-295), ein Rot-Fall dafür würde eine Grenze belegen, die es nicht
 * gibt.
 *
 * AK3 — leseCodexEreignisse gegen die JSONL-Zeilen der realen Spike-Läufe
 * aus state/tp-m3-01-codex.md, wörtlich übernommen. Die
 * ERROR-Tracing-Zeilen sind bewusst KEIN Bestandteil der Lauf-Fixtures,
 * sondern ein eigener fünfter Fall. Der Widerspruch im Spike (F-296) ist
 * inzwischen aufgelöst: S-M3-01b, Messpunkt (l), hat stdout und stderr in
 * getrennte Dateien geleitet — die Zeilen stehen auf stderr, stdout ist
 * reines JSONL (F-301). Der fünfte Fall belegt deshalb ausschließlich die
 * Robustheit des Parsers gegenüber Fremdzeilen; ein solcher Strom kommt in
 * der Praxis nicht vor.
 *
 * AK7 (WS-2) — starteCodexGateway: Grün-Fall mit protokollierendem Starter
 * (das Argv geht UNVERÄNDERT durch, stdinLeer ist gesetzt), Laufakte mit
 * worker/modell_deklariert/berechtigungskontext, Rohstrom mit ALLEN sieben
 * von AK7 geforderten Feldern (ein Feld, das kein Test liest, ließe sich
 * ersatzlos löschen), die beiden beobachtungsbasis-Fälle, ein
 * Startfehler-Lauf, ein TIMEOUT-Lauf als Naht zum AK8-timeout-Zweig, die
 * Durchreichung von zeitgrenzeMs/abbruchSignal sowie zwei Rot-Fälle mit
 * Spy-Starter (Allowlist-Treffer, ungültiges Startziel), die beide am real
 * geschriebenen Artefakt geprüft werden, nicht am Rückgabewert — beim
 * Allowlist-Treffer inklusive art und ergebnis der Marke, weil ihre bloße
 * Anzahl auch eine falsch geschriebene Marke durchließe.
 *
 * F-307 — stdin: REALE Läufe über prozessstart.ts (kein Spy) gegen ein
 * node -e-Prüfskript, das stdin liest und erst danach beendet. Ohne
 * stdinLeer endet der Lauf in der Zeitgrenze (TIMEOUT), mit stdinLeer
 * regulär mit Exit 0 — ohne diesen Rot-Fall wäre die Wirkung des Feldes
 * nur behauptet. Dazu ein Lauf gegen ein sofort endendes Kind: er belegt,
 * dass der stdin-Fehlerkanal behandelt ist und ein EPIPE nicht den
 * gesamten Node-Prozess abreißt.
 *
 * Gemessen ist damit der MECHANISMUS, nicht ein Codex-Hang: kein
 * Codex-Lauf wurde je ohne stdinLeer gegen eine Zeitgrenze gefahren
 * (F-318).
 */

import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { pruefeCodexAufruf } from './codex-argv-allowlist.ts'
import { validiereLaufakteDaten } from '../claude-code-gateway/index.ts'
import { starteProzess } from '../claude-code-gateway/prozessstart.ts'
import type { Starter, StarterOptionen } from '../claude-code-gateway/types.ts'
import { ladeGueltigeCheckpoints, sha256Hex, stelleLaufstatusFest } from '../checkpoint-store/index.ts'
import type { ProfilReferenz } from '../checkpoint-store/types.ts'
import { baueCodexAufruf, leseCodexEreignisse, starteCodexGateway } from './index.ts'

const ABSOLUTER_SCHEMAPFAD = resolve(process.cwd(), 'schemas', 'ergebnis-code-reviewer.schema.json')

// ─── AK1: baueCodexAufruf ───────────────────────────────────────────────────

test('AK1: baueCodexAufruf liefert ohne Ausgabeschema exakt das erwartete Tokens-Array', () => {
  const tokens = baueCodexAufruf({ modell: 'gpt-5-codex', prompt: 'Prüfe die Änderung.', ausgabeSchemaPfad: null })
  assert.deepStrictEqual(tokens, ['exec', '--json', '--sandbox', 'read-only', '--model', 'gpt-5-codex', 'Prüfe die Änderung.'])
})

test('AK1: baueCodexAufruf hängt ein absolutes Ausgabeschema vor dem Prompt-Token an', () => {
  const tokens = baueCodexAufruf({ modell: 'gpt-5-codex', prompt: 'Prüfe die Änderung.', ausgabeSchemaPfad: ABSOLUTER_SCHEMAPFAD })
  assert.deepStrictEqual(tokens, [
    'exec',
    '--json',
    '--sandbox',
    'read-only',
    '--model',
    'gpt-5-codex',
    '--output-schema',
    ABSOLUTER_SCHEMAPFAD,
    'Prüfe die Änderung.',
  ])
})

test('AK1: baueCodexAufruf wirft bei leerem modell (E-185)', () => {
  assert.throws(() => baueCodexAufruf({ modell: '', prompt: 'Prompt', ausgabeSchemaPfad: null }), /modell ist Pflichtfeld/)
})

test('AK1: baueCodexAufruf wirft bei leerem prompt (F-124)', () => {
  assert.throws(() => baueCodexAufruf({ modell: 'gpt-5-codex', prompt: '', ausgabeSchemaPfad: null }), /prompt ist Pflichtfeld/)
})

test("AK1: baueCodexAufruf wirft bei einem prompt mit führendem '-'", () => {
  assert.throws(
    () => baueCodexAufruf({ modell: 'gpt-5-codex', prompt: '--sandbox danger-full-access', ausgabeSchemaPfad: null }),
    /darf nicht mit '-' beginnen/
  )
})

test('AK1: baueCodexAufruf wirft bei einem relativen ausgabeSchemaPfad', () => {
  assert.throws(
    () => baueCodexAufruf({ modell: 'gpt-5-codex', prompt: 'Prompt', ausgabeSchemaPfad: 'schemas/ergebnis-code-reviewer.schema.json' }),
    /muss ein absoluter Pfad sein/
  )
})

// ─── AK2: pruefeCodexAufruf — Grün ──────────────────────────────────────────

test('AK2 grün: das von baueCodexAufruf erzeugte Argv ohne Ausgabeschema besteht die Allowlist', () => {
  const tokens = baueCodexAufruf({ modell: 'gpt-5-codex', prompt: 'Prompt', ausgabeSchemaPfad: null })
  assert.deepStrictEqual(pruefeCodexAufruf(tokens), { ok: true })
})

test('AK2 grün: das von baueCodexAufruf erzeugte Argv mit Ausgabeschema besteht die Allowlist', () => {
  const tokens = baueCodexAufruf({ modell: 'gpt-5-codex', prompt: 'Prompt', ausgabeSchemaPfad: ABSOLUTER_SCHEMAPFAD })
  assert.deepStrictEqual(pruefeCodexAufruf(tokens), { ok: true })
})

// ─── AK2: pruefeCodexAufruf — Rot, jeder Fall einzeln ───────────────────────

/** Baut ein sonst konformes Argv und schiebt die übergebenen Zusatz-Tokens hinter '--json' ein — so unterscheidet sich jeder Rot-Fall vom Grün-Fall in genau einem Punkt. */
function argvMitZusatz(zusatz: string[]): string[] {
  return ['exec', '--json', ...zusatz, '--sandbox', 'read-only', '--model', 'gpt-5-codex', 'Prompt']
}

const rotFaelleZusatz: Array<{ name: string; zusatz: string[] }> = [
  // Real existierende abwählende Parameter von `codex exec` 0.153.4.
  { name: '--dangerously-bypass-approvals-and-sandbox', zusatz: ['--dangerously-bypass-approvals-and-sandbox'] },
  { name: '--dangerously-bypass-hook-trust', zusatz: ['--dangerously-bypass-hook-trust'] },
  { name: '--ignore-user-config', zusatz: ['--ignore-user-config'] },
  { name: '--ignore-rules', zusatz: ['--ignore-rules'] },
  { name: '--enable X', zusatz: ['--enable', 'X'] },
  { name: '--disable X', zusatz: ['--disable', 'X'] },
  { name: '-p X', zusatz: ['-p', 'X'] },
  { name: '--profile X', zusatz: ['--profile', 'X'] },
  { name: '--add-dir X', zusatz: ['--add-dir', 'X'] },
  { name: '-C X', zusatz: ['-C', 'X'] },
  { name: '--cd X', zusatz: ['--cd', 'X'] },
  { name: '--oss', zusatz: ['--oss'] },
  { name: '--local-provider X', zusatz: ['--local-provider', 'X'] },
  { name: '--approve-for-me', zusatz: ['--approve-for-me'] },
  { name: '--skip-git-repo-check', zusatz: ['--skip-git-repo-check'] },
  // -c/--config ist der generische TOML-Override über einen offenen
  // Schlüsselraum — genau der Grund für die Allowlist-Bauart (F-281).
  { name: '-c mit Sandbox-Override', zusatz: ['-c', 'sandbox_permissions=["disk-full-read-access"]'] },
  { name: '-c mit beliebigem Wert', zusatz: ['-c', 'irgendein.schluessel=1'] },
  { name: '--config mit beliebigem Wert', zusatz: ['--config', 'irgendein.schluessel=1'] },
  // Ein heute nicht existierendes Token: die Allowlist muss auch
  // ablehnen, was sie nicht kennt — das ist der Punkt der Bauart.
  { name: 'frei erfundenes Token --zukunft-unbekannt', zusatz: ['--zukunft-unbekannt'] },
]

for (const { name, zusatz } of rotFaelleZusatz) {
  test(`AK2 rot: '${name}' wird abgelehnt`, () => {
    const ergebnis = pruefeCodexAufruf(argvMitZusatz(zusatz))
    assert.equal(ergebnis.ok, false, `erwartet ok:false für '${name}'`)
    // Der Grund muss das beanstandete Token benennen — eine Ablehnung aus
    // einem anderen Grund würde sonst als Beleg durchgehen und die Grenze
    // nur scheinbar belegen.
    assert.ok(
      !ergebnis.ok && ergebnis.grund.includes(zusatz[0]),
      `Grund soll '${zusatz[0]}' benennen, erhalten: '${ergebnis.ok ? '' : ergebnis.grund}'`
    )
  })
}

// Jeder Fall trägt ein grundMuster. Eine Assertion auf 'grund.length > 0'
// wäre tautologisch — es gibt in pruefeCodexAufruf keinen Pfad mit leerem
// Grund —, und sie könnte nicht unterscheiden, WELCHE Regel abgelehnt hat.
// Genau das ist hier nötig: mehrere dieser Argv würden auch von einer
// anderen als der gemeinten Regel abgewiesen, die Grenze wäre dann nur
// scheinbar gemessen und könnte später unbemerkt wieder herausfallen.
const rotFaelleArgv: Array<{ name: string; tokens: string[]; grundMuster: RegExp }> = [
  { name: '-s workspace-write', tokens: ['exec', '--json', '-s', 'workspace-write', '--model', 'gpt-5-codex', 'Prompt'], grundMuster: /Token '-s' steht nicht in der erlaubten Grammatik/ },
  { name: '-s danger-full-access', tokens: ['exec', '--json', '-s', 'danger-full-access', '--model', 'gpt-5-codex', 'Prompt'], grundMuster: /Token '-s' steht nicht in der erlaubten Grammatik/ },
  {
    name: '--sandbox workspace-write',
    tokens: ['exec', '--json', '--sandbox', 'workspace-write', '--model', 'gpt-5-codex', 'Prompt'],
    grundMuster: /erlaubt ausschließlich 'read-only', gefunden: 'workspace-write'/,
  },
  {
    name: '--sandbox danger-full-access',
    tokens: ['exec', '--json', '--sandbox', 'danger-full-access', '--model', 'gpt-5-codex', 'Prompt'],
    grundMuster: /erlaubt ausschließlich 'read-only', gefunden: 'danger-full-access'/,
  },
  { name: 'fehlendes --sandbox read-only', tokens: ['exec', '--json', '--model', 'gpt-5-codex', 'Prompt'], grundMuster: /Sandbox-Schalter mit 'read-only' fehlt/ },
  {
    name: 'doppeltes --sandbox read-only',
    tokens: ['exec', '--json', '--sandbox', 'read-only', '--sandbox', 'read-only', '--model', 'gpt-5-codex', 'Prompt'],
    grundMuster: /'--sandbox' steht mehr als einmal/,
  },
  {
    name: 'zwei Prompt-Tokens',
    tokens: ['exec', '--json', '--sandbox', 'read-only', '--model', 'gpt-5-codex', 'Prompt eins', 'Prompt zwei'],
    grundMuster: /steht nicht am Ende des Argv/,
  },
  { name: "Position 0 ist nicht 'exec'", tokens: ['--json', '--sandbox', 'read-only', '--model', 'gpt-5-codex', 'Prompt'], grundMuster: /Position 0 muss 'exec' sein/ },
  { name: 'leeres Argv', tokens: [], grundMuster: /Argv ist leer/ },
  { name: 'kein Prompt-Token', tokens: ['exec', '--json', '--sandbox', 'read-only', '--model', 'gpt-5-codex'], grundMuster: /kein abschließendes Prompt-Token/ },
  {
    name: 'doppeltes --json',
    tokens: ['exec', '--json', '--json', '--sandbox', 'read-only', '--model', 'gpt-5-codex', 'Prompt'],
    grundMuster: /'--json' steht mehr als einmal/,
  },
  {
    name: 'relativer --output-schema-Pfad',
    tokens: ['exec', '--json', '--sandbox', 'read-only', '--model', 'gpt-5-codex', '--output-schema', 'schemas/x.schema.json', 'Prompt'],
    grundMuster: /verlangt einen absoluten Pfad/,
  },
  // Wertpositionen als Schlupfloch: ein abwählender Parameter, der an der
  // Stelle eines Schalter-WERTES steht, würde ohne eigene Prüfung
  // mitgeschluckt und das restliche Argv verschöbe sich um eine Position.
  // Genau so bestünde ein '-c'-Override die Grammatik, ohne je als Token
  // geprüft worden zu sein. Das grundMuster pinnt hier die WERTREGEL: ohne
  // es würde der --output-schema-Fall auch von der älteren
  // Absolutpfad-Regel grün getestet, und die Wertregel könnte spurlos
  // wieder entfernt werden.
  {
    name: "-c als Wert hinter '--model' (Wertpositions-Schlupfloch)",
    tokens: ['exec', '--sandbox', 'read-only', '--model', '-c', 'sandbox_permissions=["disk-full-read-access"]'],
    grundMuster: /'--model' trägt einen Wert mit führendem '-': '-c'/,
  },
  {
    name: "abwählender Parameter als Wert hinter '--output-schema'",
    tokens: ['exec', '--json', '--sandbox', 'read-only', '--model', 'gpt-5-codex', '--output-schema', '--ignore-user-config', 'Prompt'],
    grundMuster: /'--output-schema' trägt einen Wert mit führendem '-'/,
  },
  { name: 'leeres Prompt-Token', tokens: ['exec', '--json', '--sandbox', 'read-only', '--model', 'gpt-5-codex', ''], grundMuster: /Prompt-Token ist leer/ },
]

for (const { name, tokens, grundMuster } of rotFaelleArgv) {
  test(`AK2 rot: '${name}' wird abgelehnt`, () => {
    const ergebnis = pruefeCodexAufruf(tokens)
    assert.equal(ergebnis.ok, false, `erwartet ok:false für '${name}'`)
    assert.match(ergebnis.ok ? '' : ergebnis.grund, grundMuster, `Ablehnung aus der erwarteten Regel für '${name}'`)
  })
}

test('AK2: ein Nicht-String-Element bricht die Prüfung nicht, sondern wird abgelehnt', () => {
  // Die Signatur verspricht string[], aber der Argv kann in WS-2 aus einer
  // geparsten Startvorlage stammen. Eine Schutzschicht, die bei
  // Fremdtypen wirft statt abzulehnen, hat die falsche Ausfallrichtung.
  const ergebnis = pruefeCodexAufruf(['exec', '--json', '--sandbox', 'read-only', '--model', 42, 'Prompt'] as unknown as string[])
  assert.equal(ergebnis.ok, false)
  assert.match(ergebnis.ok ? '' : ergebnis.grund, /kein String ist, sondern number/)
})

test("AK1: baueCodexAufruf wirft bei einem modell mit führendem '-'", () => {
  assert.throws(() => baueCodexAufruf({ modell: '-c', prompt: 'Prompt', ausgabeSchemaPfad: null }), /modell darf nicht mit '-' beginnen/)
})

// ─── AK3: leseCodexEreignisse gegen die realen Spike-Fixtures ───────────────
// Alle Zeilen wörtlich aus state/tp-m3-01-codex.md (Spike S-M3-01,
// 09.09.2026) — nicht nachgebaut, nicht gekürzt, nicht ergänzt.

const LAUF_1_ZEILEN = [
  '{"type":"thread.started","thread_id":"01a08733-6b51-7c32-be7a-fa7891bf58e6"}',
  '{"type":"turn.started"}',
  '{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"Ich zähle die Dateien im aktuellen Verzeichnis und lese ihre Namen aus."}}',
  '{"type":"item.completed","item":{"id":"item_1","type":"agent_message","text":"Ich konnte Anzahl und Namen nicht ermitteln: Die Ausführungsrichtlinie hat beide Versuche blockiert, das aktuelle Verzeichnis auszulesen."}}',
  '{"type":"turn.completed","usage":{"input_tokens":46997,"cached_input_tokens":39936,"cache_write_input_tokens":0,"output_tokens":161,"reasoning_output_tokens":0}}',
]

const LAUF_2_ZEILEN = [
  '{"type":"thread.started","thread_id":"01a08734-1a20-7561-a292-2f0054d9a793"}',
  '{"type":"turn.started"}',
  '{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"Ich versuche, die Datei `test.txt` mit dem Inhalt `x` anzulegen."}}',
  '{"type":"item.completed","item":{"id":"item_1","type":"agent_message","text":"Die Datei konnte nicht erstellt werden: Die Umgebung erlaubt nur Lesezugriff und hat den Schreibversuch blockiert."}}',
  '{"type":"turn.completed","usage":{"input_tokens":31160,"cached_input_tokens":27520,"cache_write_input_tokens":0,"output_tokens":125,"reasoning_output_tokens":0}}',
]

// Lauf 3, Fehlversuch (HTTP 400, invalid_json_schema). Die zweite Zeile
// steht im Protokoll abgekürzt als {"type":"turn.failed", ...} — das '...'
// ist kein gültiges JSON. Sie wird hier bewusst unverändert übernommen
// statt um erfundene Felder ergänzt (Muster F-059/F-061: nicht raten) und
// zählt deshalb als unparsbare Zeile; turnFailed folgt aus dem
// {"type":"error"}-Ereignis darüber.
const LAUF_3_FEHLVERSUCH_ZEILEN = [
  '{"type":"error","message":"{\\n  \\"type\\": \\"error\\",\\n  \\"error\\": {\\n    \\"type\\": \\"invalid_request_error\\",\\n    \\"code\\": \\"invalid_json_schema\\",\\n    \\"message\\": \\"Invalid schema for response_format \'codex_output_schema\': In context=(), \'additionalProperties\' is required to be supplied and to be false.\\",\\n    \\"param\\": \\"text.format.schema\\"\\n  },\\n  \\"status\\": 400\\n}"}',
  '{"type":"turn.failed", ...}',
]

const LAUF_3_KORRIGIERT_ZEILEN = [
  '{"type":"thread.started","thread_id":"01a08734-e3a5-75f0-a3b2-5dd03265941c"}',
  '{"type":"turn.started"}',
  '{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"{\\"ok\\":true}"}}',
  '{"type":"turn.completed","usage":{"input_tokens":15490,"cached_input_tokens":0,"cache_write_input_tokens":0,"output_tokens":15,"reasoning_output_tokens":0}}',
]

// Die beiden ERROR-Tracing-Zeilen aus dem Protokoll von Lauf 1, wörtlich.
// Ob sie real in stdout oder stderr standen, war widersprüchlich
// protokolliert (F-301) — hier dienen sie ausschließlich als Fremdzeilen.
// S-M3-01b (l) hat geklärt: die ERROR-Tracing-Zeilen des Routers stehen
// ausschließlich auf stderr, nie auf stdout — dieser Fixture-Fall testet
// deshalb einen Strom, der in der Praxis nicht vorkommt, und dient nur der
// Parser-Robustheit gegen ein hypothetisches Fremdformat.
const ERROR_TRACING_ZEILEN = [
  '2026-09-09T17:24:58.779565Z ERROR codex_core::tools::router: error=exec_command failed: CreateProcess { message: "Rejected(\\"`\\\\\\"C:\\\\\\\\WINDOWS\\\\\\\\System32\\\\\\\\WindowsPowerShell\\\\\\\\v1.0\\\\\\\\powershell.exe\\\\\\" -Command \'$files = @(Get-ChildItem -LiteralPath . -File -Force); Write-Output \\\\\\"Anzahl Dateien: $($files.Count)\\\\\\"; $files | Select-Object -ExpandProperty Name\'` rejected: blocked by policy\\")" }',
  '2026-09-09T17:25:01.747617Z ERROR codex_core::tools::router: error=exec_command failed: CreateProcess { message: "Rejected(\\"`\\\\\\"C:\\\\\\\\WINDOWS\\\\\\\\System32\\\\\\\\WindowsPowerShell\\\\\\\\v1.0\\\\\\\\powershell.exe\\\\\\" -Command \'rg --files --hidden -g !*/**\'` rejected: blocked by policy\\")" }',
]

test('AK3 Lauf 1: turnCompleted true, letzte agent_message ist die zweite Meldung', () => {
  const ergebnis = leseCodexEreignisse(`${LAUF_1_ZEILEN.join('\n')}\n`)
  assert.equal(ergebnis.turnCompleted, true)
  assert.equal(ergebnis.turnFailed, false)
  assert.equal(
    ergebnis.letzteAgentMessage,
    'Ich konnte Anzahl und Namen nicht ermitteln: Die Ausführungsrichtlinie hat beide Versuche blockiert, das aktuelle Verzeichnis auszulesen.'
  )
  assert.equal(ergebnis.unparsbareZeilen, 0)
  assert.equal(ergebnis.ereignisse.length, 5)
})

test('AK3 Lauf 2: turnCompleted true, Schreibverweigerung trägt kein eigenes Ereignis', () => {
  const ergebnis = leseCodexEreignisse(`${LAUF_2_ZEILEN.join('\n')}\n`)
  assert.equal(ergebnis.turnCompleted, true)
  assert.equal(ergebnis.turnFailed, false)
  assert.equal(
    ergebnis.letzteAgentMessage,
    'Die Datei konnte nicht erstellt werden: Die Umgebung erlaubt nur Lesezugriff und hat den Schreibversuch blockiert.'
  )
  assert.equal(ergebnis.unparsbareZeilen, 0)
})

test('AK3 Lauf 3 Fehlversuch: turnFailed true, turnCompleted false', () => {
  const ergebnis = leseCodexEreignisse(`${LAUF_3_FEHLVERSUCH_ZEILEN.join('\n')}\n`)
  assert.equal(ergebnis.turnFailed, true)
  assert.equal(ergebnis.turnCompleted, false)
  assert.equal(ergebnis.letzteAgentMessage, null)
  // Die im Protokoll abgekürzte turn.failed-Zeile ist kein gültiges JSON
  // (siehe Kommentar an LAUF_3_FEHLVERSUCH_ZEILEN).
  assert.equal(ergebnis.unparsbareZeilen, 1)
})

test('AK3 Lauf 3 korrigiert: letzte agent_message ist das schemakonforme JSON-Objekt', () => {
  const ergebnis = leseCodexEreignisse(`${LAUF_3_KORRIGIERT_ZEILEN.join('\n')}\n`)
  assert.equal(ergebnis.turnCompleted, true)
  assert.equal(ergebnis.turnFailed, false)
  assert.equal(ergebnis.letzteAgentMessage, '{"ok":true}')
  assert.equal(ergebnis.unparsbareZeilen, 0)
})

test('AK3 gemischter Strom: zwei ERROR-Tracing-Zeilen werden gezählt, nicht geworfen', () => {
  const gemischt = [LAUF_1_ZEILEN[0], LAUF_1_ZEILEN[1], LAUF_1_ZEILEN[2], ...ERROR_TRACING_ZEILEN, LAUF_1_ZEILEN[3], LAUF_1_ZEILEN[4]]
  const ergebnis = leseCodexEreignisse(`${gemischt.join('\n')}\n`)
  assert.equal(ergebnis.unparsbareZeilen, 2)
  assert.equal(ergebnis.turnCompleted, true)
  assert.equal(ergebnis.ereignisse.length, 5)
  assert.equal(
    ergebnis.letzteAgentMessage,
    'Ich konnte Anzahl und Namen nicht ermitteln: Die Ausführungsrichtlinie hat beide Versuche blockiert, das aktuelle Verzeichnis auszulesen.'
  )
})

test('AK3: CRLF-Zeilenenden und Leerzeilen zerstören den Parser nicht', () => {
  const ergebnis = leseCodexEreignisse(`${LAUF_1_ZEILEN.join('\r\n')}\r\n\r\n`)
  assert.equal(ergebnis.turnCompleted, true)
  assert.equal(ergebnis.unparsbareZeilen, 0)
  assert.equal(ergebnis.ereignisse.length, 5)
})

test('AK3: leerer stdout liefert einen leeren, aber wohlgeformten Befund', () => {
  assert.deepStrictEqual(leseCodexEreignisse(''), {
    ereignisse: [],
    turnCompleted: false,
    turnFailed: false,
    letzteAgentMessage: null,
    unparsbareZeilen: 0,
  })
})

// ─── AK4: LAUFAKTE_V0 trägt worker und modell_deklariert additiv ────────────
// Liegt hier statt bei F6a, weil beide Felder ausschließlich wegen des
// zweiten Workers existieren; validiereLaufakteDaten selbst bleibt die eine
// geprüfte Stelle (kein zweiter Regelsatz, D5).

const LAUFAKTE_OHNE_WORKER = {
  laufakte_schema: 'v0',
  lauf_id: 'lauf-f16-ws1',
  werkzeug_version_deklariert: 'codex-cli 0.153.4',
  berechtigungskontext: 'codex-sandbox-read-only',
  arbeitsverzeichnis_pfad: String.raw`C:\Users\stefa\Projekte\ai-workforce`,
  modell_beobachtet: null,
  beobachtungsbasis_vollstaendig: true,
  rohstrom_referenz: { pfad: 'kontrollzustand-roh/lauf-f16-ws1/rohstrom.json', inhalts_hash: 'a'.repeat(64) },
  erstellt_am: '2026-09-11T10:00:00.000Z',
}

test('AK4: eine Laufakte OHNE worker/modell_deklariert bleibt gültig (append-only, F-207/F-177)', () => {
  assert.deepStrictEqual(validiereLaufakteDaten(LAUFAKTE_OHNE_WORKER), [])
})

test("AK4: worker 'codex' mit modell_deklariert ist gültig", () => {
  const mitWorker = { ...LAUFAKTE_OHNE_WORKER, worker: 'codex', modell_deklariert: 'gpt-5-codex' }
  assert.deepStrictEqual(validiereLaufakteDaten(mitWorker), [])
})

test("AK4: worker 'claude-code' ist gültig", () => {
  const mitWorker = { ...LAUFAKTE_OHNE_WORKER, worker: 'claude-code' }
  assert.deepStrictEqual(validiereLaufakteDaten(mitWorker), [])
})

test('AK4: ein worker-Wert außerhalb der Aufzählung ist ein Verstoß', () => {
  const verstoesse = validiereLaufakteDaten({ ...LAUFAKTE_OHNE_WORKER, worker: 'gemini' })
  assert.ok(verstoesse.some((v) => v.includes("'worker'")))
})

test('AK4: ein leeres modell_deklariert ist ein Verstoß', () => {
  const verstoesse = validiereLaufakteDaten({ ...LAUFAKTE_OHNE_WORKER, modell_deklariert: '' })
  assert.ok(verstoesse.some((v) => v.includes("'modell_deklariert'")))
})

// ─── AK3, Nachtrag: Zweige, die der Spike nicht belegen kann ────────────────
// Die einzige turn.failed-Zeile des Spikes ist im Protokoll abgekürzt und
// damit unparsbar (siehe LAUF_3_FEHLVERSUCH_ZEILEN). Der
// turn.failed-Erkennungszweig bliebe deshalb ohne jeden Test. Die folgende
// Zeile ist AUSDRÜCKLICH SYNTHETISCH: sie stammt NICHT aus S-M3-01,
// sondern ist nur so weit geformt, wie der Parser es liest (type). Welche
// weiteren Felder ein echtes turn.failed trägt, ist unbelegt und wird hier
// nicht behauptet — Klärung in S-M3-01b.
test('AK3 (synthetisch, nicht aus dem Spike): eine wohlgeformte turn.failed-Zeile setzt turnFailed', () => {
  const ergebnis = leseCodexEreignisse('{"type":"thread.started"}\n{"type":"turn.failed"}\n')
  assert.equal(ergebnis.turnFailed, true)
  assert.equal(ergebnis.turnCompleted, false)
  assert.equal(ergebnis.unparsbareZeilen, 0)
})

test('AK3 (synthetisch): error und turn.completed im selben Strom setzen beide Merkmale', () => {
  const ergebnis = leseCodexEreignisse('{"type":"error","message":"x"}\n{"type":"turn.completed"}\n')
  assert.equal(ergebnis.turnFailed, true)
  assert.equal(ergebnis.turnCompleted, true)
})

test('AK3: ein abgeschnittener Strom (Abbruch/Timeout) zählt die Reststücke, statt zu werfen', () => {
  const ergebnis = leseCodexEreignisse(`${LAUF_1_ZEILEN[0]}\n{"type":"turn.st`)
  assert.equal(ergebnis.unparsbareZeilen, 1)
  assert.equal(ergebnis.turnCompleted, false)
  assert.equal(ergebnis.ereignisse.length, 1)
})

test('AK3: JSON-Skalare und -Arrays sind gültiges JSON, aber keine Ereignisse', () => {
  const ergebnis = leseCodexEreignisse('null\n123\n"text"\n[]\n')
  assert.equal(ergebnis.unparsbareZeilen, 4)
  assert.equal(ergebnis.ereignisse.length, 0)
})

// Festgeschriebenes Ist-Verhalten, nicht als wünschenswert behauptet: ein
// letztes agent_message OHNE String-text lässt letzteAgentMessage auf der
// vorherigen Nachricht stehen. Für WS-2 (AK8) ist das relevant, weil dort
// die letzte Nachricht schemageprüft wird — der Fall ist hier gemessen,
// damit die Entscheidung dort auf einem Befund und nicht auf einer
// Annahme beruht.
test('AK3: letztes agent_message ohne String-text lässt die vorherige Nachricht stehen (Ist-Verhalten, WS-2 zu entscheiden)', () => {
  const strom = ['{"type":"item.completed","item":{"id":"a","type":"agent_message","text":"erste"}}', '{"type":"item.completed","item":{"id":"b","type":"agent_message","text":null}}'].join('\n')
  const ergebnis = leseCodexEreignisse(strom)
  assert.equal(ergebnis.letzteAgentMessage, 'erste')
  assert.equal(ergebnis.unparsbareZeilen, 0)
})

test("AK2: die Kurzform '-s read-only' ist bewusst NICHT erlaubt", () => {
  const ergebnis = pruefeCodexAufruf(['exec', '--json', '-s', 'read-only', '--model', 'gpt-5-codex', 'Prompt'])
  assert.equal(ergebnis.ok, false)
  assert.ok(!ergebnis.ok && ergebnis.grund.includes('-s'))
})

test("AK2: '--sandbox read-only' als EIN Token wird abgelehnt (Shell-Denkfehler)", () => {
  const ergebnis = pruefeCodexAufruf(['exec', '--json', '--sandbox read-only', '--model', 'gpt-5-codex', 'Prompt'])
  assert.equal(ergebnis.ok, false)
})

// ─── AK7: starteCodexGateway ────────────────────────────────────────────────

const KONTROLLZUSTAND_BASIS = 'kontrollzustand-test'
const ROH_BASIS = join(tmpdir(), 'f16-codex-gateway-test')
const PROFIL_REFERENZ: ProfilReferenz = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }

/** Ein reales, absolutes und existierendes Startziel, das pruefeStartziel besteht — process.execPath ist node.exe, steht auf keiner Sperrliste und existiert auf jeder Maschine, auf der dieser Test läuft. Kein erfundener Pfad, der den Guard nur scheinbar passierte. */
const STARTZIEL = [process.execPath]

const TOKENS_GUELTIG = baueCodexAufruf({ modell: 'gpt-5-codex', prompt: 'Nenne die Dateien im Verzeichnis.', ausgabeSchemaPfad: null })

/** Wörtlich aus Lauf (a), state/tp-m3-01b-codex-sandbox.md — gekürzt auf die tragenden Zeilen. */
const STDOUT_LAUF_A = [
  '{"type":"thread.started","thread_id":"01a08f5d-1ab2-7ac2-9b41-6bdb224047af"}',
  '{"type":"turn.started"}',
  '{"type":"item.completed","item":{"id":"item_3","type":"agent_message","text":"Im aktuellen Verzeichnis liegen 2 Dateien."}}',
  '{"type":"turn.completed","usage":{"input_tokens":31560,"output_tokens":175}}',
].join('\n')

function neueGatewayLaufId(praefix: string): string {
  return `${praefix}-${randomUUID()}`
}

function raeumeGatewayLauf(laufId: string): void {
  rmSync(join(KONTROLLZUSTAND_BASIS, laufId), { recursive: true, force: true })
  rmSync(join(ROH_BASIS, laufId), { recursive: true, force: true })
  rmSync(join(KONTROLLZUSTAND_BASIS, `lineage-laufakte-${laufId}`), { recursive: true, force: true })
}

/** Starter-Attrappe, die mitschreibt, womit sie aufgerufen wurde — der Grün-Fall prüft daran, dass das Argv UNVERÄNDERT durchgereicht wird (D5, keine zweite Konkatenation) und dass die Optionen (stdinLeer, zeitgrenzeMs, abbruchSignal) wirklich ankommen. startfehler/beendigungsart sind überschreibbar, damit auch die nicht-regulären Prozessausgänge einen eigenen Fall bekommen. */
function protokollierenderStarter(ergebnis: {
  stdout: string
  stderr: string
  exitCode: number | null
  startfehler?: { code: string | null; message: string } | null
  beendigungsart?: 'TIMEOUT' | 'ABBRUCH' | null
}): {
  starter: Starter
  aufrufe: Array<{ startziel: string[]; tokens: string[]; optionen?: StarterOptionen }>
} {
  const aufrufe: Array<{ startziel: string[]; tokens: string[]; optionen?: StarterOptionen }> = []
  const starter: Starter = async (startziel, tokens, optionen) => {
    aufrufe.push({ startziel, tokens, optionen })
    return {
      stdout: ergebnis.stdout,
      stderr: ergebnis.stderr,
      exitCode: ergebnis.exitCode,
      startfehler: ergebnis.startfehler ?? null,
      beendigungsart: ergebnis.beendigungsart ?? null,
    }
  }
  return { starter, aufrufe }
}

/** Eingabenbaukasten für starteCodexGateway — spart in jedem Fall sechs Zeilen Wiederholung und hält die Pflichtfelder an einer Stelle. */
function gatewayEingaben(laufId: string, tokens: string[] = TOKENS_GUELTIG, werkzeugStartziel: string[] = STARTZIEL) {
  return {
    laufId,
    profilReferenz: PROFIL_REFERENZ,
    tokens,
    werkzeugStartziel,
    werkzeugVersionDeklariert: 'codex-cli 0.153.4',
    modellDeklariert: 'gpt-5-codex',
  }
}

test('AK7 grün: starteCodexGateway registriert eine Laufakte mit worker/modell_deklariert/berechtigungskontext', async () => {
  const laufId = neueGatewayLaufId('codex-gw-gruen')
  try {
    const { starter, aufrufe } = protokollierenderStarter({ stdout: STDOUT_LAUF_A, stderr: '', exitCode: 0 })
    const ergebnis = await starteCodexGateway(
      {
        laufId,
        profilReferenz: PROFIL_REFERENZ,
        tokens: TOKENS_GUELTIG,
        werkzeugStartziel: STARTZIEL,
        werkzeugVersionDeklariert: 'codex-cli 0.153.4',
        modellDeklariert: 'gpt-5-codex',
      },
      { basisVerzeichnis: KONTROLLZUSTAND_BASIS, rohBasisVerzeichnis: ROH_BASIS, starter }
    )

    assert.equal(ergebnis.ok, true)
    if (!ergebnis.ok) return
    assert.equal(ergebnis.laufakte.worker, 'codex')
    assert.equal(ergebnis.laufakte.modell_deklariert, 'gpt-5-codex')
    // Rang OBSERVED bleibt leer: der Modellname steht in keinem
    // JSONL-Ereignis (F-305), er wird nicht aus dem Argv abgeschrieben und
    // als beobachtet ausgegeben.
    assert.equal(ergebnis.laufakte.modell_beobachtet, null)
    assert.equal(ergebnis.laufakte.berechtigungskontext, 'codex-sandbox-read-only')
    assert.equal(ergebnis.laufakte.beobachtungsbasis_vollstaendig, true)
    assert.equal(validiereLaufakteDaten(ergebnis.laufakte).length, 0)

    // D5: exakt das Argv von baueCodexAufruf, kein zusätzliches Token.
    assert.equal(aufrufe.length, 1)
    assert.deepStrictEqual(aufrufe[0].tokens, TOKENS_GUELTIG)
    assert.deepStrictEqual(aufrufe[0].startziel, STARTZIEL)
    // F-307: stdinLeer ist für Codex Pflicht, nicht optional.
    assert.equal(aufrufe[0].optionen?.stdinLeer, true)
  } finally {
    raeumeGatewayLauf(laufId)
  }
})

test('AK7 grün: der Rohstrom trägt tokens (neu gegenüber F6a) und der Laufakte-Hash passt zu seinem Inhalt', async () => {
  const laufId = neueGatewayLaufId('codex-gw-rohstrom')
  try {
    // stderr trägt hier bewusst die real gemessene ERROR-Zeile aus Lauf (a)
    // (F-309) — sie MUSS im Rohstrom landen, obwohl der Evaluator sie nie
    // auswertet: der Rohstrom ist Beweismittel, nicht Klassifikationsinput.
    const ECHTES_STDERR = 'ERROR codex_models_manager::manager: failed to refresh available models'
    const { starter } = protokollierenderStarter({ stdout: STDOUT_LAUF_A, stderr: ECHTES_STDERR, exitCode: 0 })
    const ergebnis = await starteCodexGateway(gatewayEingaben(laufId), {
      basisVerzeichnis: KONTROLLZUSTAND_BASIS,
      rohBasisVerzeichnis: ROH_BASIS,
      starter,
    })
    assert.equal(ergebnis.ok, true)
    if (!ergebnis.ok) return

    const rohInhalt = readFileSync(ergebnis.laufakte.rohstrom_referenz.pfad, 'utf8')
    assert.equal(sha256Hex(rohInhalt), ergebnis.laufakte.rohstrom_referenz.inhalts_hash)
    const rohstrom = JSON.parse(rohInhalt)
    // Alle sieben von AK7 geforderten Felder, keines ausgelassen — ein Feld,
    // das kein Test liest, könnte ersatzlos gelöscht werden, ohne dass es
    // auffiele.
    assert.deepStrictEqual(rohstrom.werkzeugStartziel, STARTZIEL)
    assert.deepStrictEqual(rohstrom.tokens, TOKENS_GUELTIG)
    assert.equal(rohstrom.stdout, STDOUT_LAUF_A)
    assert.equal(rohstrom.stderr, ECHTES_STDERR)
    assert.equal(rohstrom.exitCode, 0)
    assert.equal(rohstrom.startfehler, null)
    assert.equal(rohstrom.beendigungsart, null)
  } finally {
    raeumeGatewayLauf(laufId)
  }
})

test('AK7: ein Startfehler (Spawn scheitert) landet im Rohstrom und macht die Beobachtungsbasis unvollständig', async () => {
  const laufId = neueGatewayLaufId('codex-gw-startfehler')
  try {
    const startfehler = { code: 'ENOENT', message: 'spawn ENOENT' }
    const { starter } = protokollierenderStarter({ stdout: '', stderr: '', exitCode: null, startfehler })
    const ergebnis = await starteCodexGateway(gatewayEingaben(laufId), {
      basisVerzeichnis: KONTROLLZUSTAND_BASIS,
      rohBasisVerzeichnis: ROH_BASIS,
      starter,
    })
    assert.equal(ergebnis.ok, true)
    if (!ergebnis.ok) return
    assert.equal(ergebnis.laufakte.beobachtungsbasis_vollstaendig, false)
    const rohstrom = JSON.parse(readFileSync(ergebnis.laufakte.rohstrom_referenz.pfad, 'utf8'))
    assert.deepStrictEqual(rohstrom.startfehler, startfehler)
    // Bekannte Grenze, hier festgehalten statt stillschweigend hingenommen
    // (F-316): der Evaluator meldet für diesen Lauf das generische
    // 'beobachtungsbasis_unvollstaendig' — der konkrete Startfehler steht
    // nur im Rohstrom, nicht im Klassifikationsergebnis.
  } finally {
    raeumeGatewayLauf(laufId)
  }
})

test('AK7: ein TIMEOUT des Starters landet unverändert im Rohstrom (die Naht zu AK8s timeout-Zweig)', async () => {
  const laufId = neueGatewayLaufId('codex-gw-timeout')
  try {
    const { starter } = protokollierenderStarter({ stdout: '', stderr: '', exitCode: null, beendigungsart: 'TIMEOUT' })
    const ergebnis = await starteCodexGateway(gatewayEingaben(laufId), {
      basisVerzeichnis: KONTROLLZUSTAND_BASIS,
      rohBasisVerzeichnis: ROH_BASIS,
      starter,
    })
    assert.equal(ergebnis.ok, true)
    if (!ergebnis.ok) return
    const rohstrom = JSON.parse(readFileSync(ergebnis.laufakte.rohstrom_referenz.pfad, 'utf8'))
    // Genau der Feldname und der Wert, die der Codex-Zweig des Evaluators
    // liest — ohne diesen Fall wäre die Naht zwischen Gateway und Evaluator
    // nur über Typgleichheit begründet, nicht gemessen.
    assert.equal(rohstrom.beendigungsart, 'TIMEOUT')
    assert.equal(rohstrom.exitCode, null)
  } finally {
    raeumeGatewayLauf(laufId)
  }
})

test('AK7: zeitgrenzeMs und abbruchSignal werden unverändert an den Starter durchgereicht', async () => {
  const laufId = neueGatewayLaufId('codex-gw-durchreichung')
  try {
    const { starter, aufrufe } = protokollierenderStarter({ stdout: STDOUT_LAUF_A, stderr: '', exitCode: 0 })
    const abbruchSignal = new AbortController().signal
    await starteCodexGateway(gatewayEingaben(laufId), {
      basisVerzeichnis: KONTROLLZUSTAND_BASIS,
      rohBasisVerzeichnis: ROH_BASIS,
      starter,
      zeitgrenzeMs: 12345,
      abbruchSignal,
    })
    assert.equal(aufrufe.length, 1)
    // Ohne diesen Fall ließen sich beide Durchreichungen ersatzlos
    // streichen, ohne dass ein Test rot würde — Zeitgrenze und Abbruch wären
    // für Codex dann wirkungslos.
    assert.equal(aufrufe[0].optionen?.zeitgrenzeMs, 12345)
    assert.equal(aufrufe[0].optionen?.abbruchSignal, abbruchSignal)
    assert.equal(aufrufe[0].optionen?.stdinLeer, true)
  } finally {
    raeumeGatewayLauf(laufId)
  }
})

test('AK7: ein abgeschnittener Strom (weder turn.completed noch turn.failed) setzt beobachtungsbasis_vollstaendig auf false', async () => {
  const laufId = neueGatewayLaufId('codex-gw-basis')
  try {
    const { starter } = protokollierenderStarter({ stdout: '{"type":"turn.started"}', stderr: '', exitCode: 0 })
    const ergebnis = await starteCodexGateway(
      {
        laufId,
        profilReferenz: PROFIL_REFERENZ,
        tokens: TOKENS_GUELTIG,
        werkzeugStartziel: STARTZIEL,
        werkzeugVersionDeklariert: 'codex-cli 0.153.4',
        modellDeklariert: 'gpt-5-codex',
      },
      { basisVerzeichnis: KONTROLLZUSTAND_BASIS, rohBasisVerzeichnis: ROH_BASIS, starter }
    )
    assert.equal(ergebnis.ok, true)
    if (!ergebnis.ok) return
    assert.equal(ergebnis.laufakte.beobachtungsbasis_vollstaendig, false)
  } finally {
    raeumeGatewayLauf(laufId)
  }
})

test('AK7: ein turn.failed-Strom gilt als vollständig beobachtet (der Ausgang ist beobachtet, nur negativ)', async () => {
  const laufId = neueGatewayLaufId('codex-gw-failed')
  try {
    const { starter } = protokollierenderStarter({ stdout: '{"type":"turn.started"}\n{"type":"turn.failed"}', stderr: '', exitCode: 0 })
    const ergebnis = await starteCodexGateway(
      {
        laufId,
        profilReferenz: PROFIL_REFERENZ,
        tokens: TOKENS_GUELTIG,
        werkzeugStartziel: STARTZIEL,
        werkzeugVersionDeklariert: 'codex-cli 0.153.4',
        modellDeklariert: 'gpt-5-codex',
      },
      { basisVerzeichnis: KONTROLLZUSTAND_BASIS, rohBasisVerzeichnis: ROH_BASIS, starter }
    )
    assert.equal(ergebnis.ok, true)
    if (!ergebnis.ok) return
    assert.equal(ergebnis.laufakte.beobachtungsbasis_vollstaendig, true)
  } finally {
    raeumeGatewayLauf(laufId)
  }
})

test('AK7 rot: bei einem Allowlist-Treffer wird KEIN Prozess gestartet, KEINE Wirkungsmarke und KEINE Laufakte geschrieben', async () => {
  const laufId = neueGatewayLaufId('codex-gw-rot')
  try {
    // Spy-Starter, der bei Aufruf wirft UND zählt: der Rückgabewert
    // ok:false allein belegt nichts — entfiele der Guard, liefe dieser
    // Starter und der Test scheiterte an der Ausnahme, nicht an einer
    // Zusicherung.
    let starterAufrufe = 0
    const spyStarter: Starter = async () => {
      starterAufrufe++
      throw new Error('Der Starter darf bei einem Allowlist-Treffer NIE aufgerufen werden')
    }
    const verbotenesArgv = ['exec', '--json', '--sandbox', 'read-only', '--model', 'gpt-5-codex', '--skip-git-repo-check', 'Prompt']

    const ergebnis = await starteCodexGateway(
      {
        laufId,
        profilReferenz: PROFIL_REFERENZ,
        tokens: verbotenesArgv,
        werkzeugStartziel: STARTZIEL,
        werkzeugVersionDeklariert: 'codex-cli 0.153.4',
        modellDeklariert: 'gpt-5-codex',
      },
      { basisVerzeichnis: KONTROLLZUSTAND_BASIS, rohBasisVerzeichnis: ROH_BASIS, starter: spyStarter }
    )

    assert.equal(ergebnis.ok, false)
    assert.equal(starterAufrufe, 0)

    // Geprüft wird das real geschriebene Artefakt, nicht der Rückgabewert:
    // die Kette trägt GENAU die Verweigerungsmarke aus F4s verweigereStart
    // — keine run_prepared-Marke daneben. Die ANZAHL allein genügt dafür
    // nicht: eine Implementierung, die verweigereStart wegließe und
    // stattdessen run_prepared schriebe, käme ebenfalls auf eins. Deshalb
    // werden art und ergebnis mitgeprüft.
    const checkpoints = ladeGueltigeCheckpoints(laufId, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.equal(checkpoints.length, 1)
    const marke = checkpoints[0].payload as { art?: string; ergebnis?: string }
    assert.equal(marke.art, 'terminal')
    assert.equal(marke.ergebnis, 'VERWEIGERT')
    assert.equal(existsSync(join(ROH_BASIS, laufId, 'rohstrom.json')), false)
    assert.equal(existsSync(join(KONTROLLZUSTAND_BASIS, `lineage-laufakte-${laufId}`)), false)
  } finally {
    raeumeGatewayLauf(laufId)
  }
})

test('AK7 rot: ein ungültiges Startziel verhindert den Prozessstart, bevor der Starter läuft', async () => {
  const laufId = neueGatewayLaufId('codex-gw-startziel')
  try {
    let starterAufrufe = 0
    const spyStarter: Starter = async () => {
      starterAufrufe++
      throw new Error('Der Starter darf bei ungültigem Startziel NIE aufgerufen werden')
    }
    const ergebnis = await starteCodexGateway(
      {
        laufId,
        profilReferenz: PROFIL_REFERENZ,
        tokens: TOKENS_GUELTIG,
        werkzeugStartziel: ['C:\\Windows\\System32\\cmd.exe'],
        werkzeugVersionDeklariert: 'codex-cli 0.153.4',
        modellDeklariert: 'gpt-5-codex',
      },
      { basisVerzeichnis: KONTROLLZUSTAND_BASIS, rohBasisVerzeichnis: ROH_BASIS, starter: spyStarter }
    )
    assert.equal(ergebnis.ok, false)
    assert.equal(starterAufrufe, 0)
    // Der Startziel-Guard ist ein Hygiene-Guard, keine F4-Verweigerung —
    // er schreibt bewusst KEINE Wirkungsmarke (Muster starteGateway).
    assert.equal(existsSync(join(KONTROLLZUSTAND_BASIS, laufId)), false)
  } finally {
    raeumeGatewayLauf(laufId)
  }
})

test('AK7: der Grün-Fall schreibt genau eine run_prepared-Wirkungsmarke und KEINE Terminalmarke (F7-Grenze)', async () => {
  const laufId = neueGatewayLaufId('codex-gw-marke')
  try {
    const { starter } = protokollierenderStarter({ stdout: STDOUT_LAUF_A, stderr: '', exitCode: 0 })
    await starteCodexGateway(
      {
        laufId,
        profilReferenz: PROFIL_REFERENZ,
        tokens: TOKENS_GUELTIG,
        werkzeugStartziel: STARTZIEL,
        werkzeugVersionDeklariert: 'codex-cli 0.153.4',
        modellDeklariert: 'gpt-5-codex',
      },
      { basisVerzeichnis: KONTROLLZUSTAND_BASIS, rohBasisVerzeichnis: ROH_BASIS, starter }
    )
    const status = stelleLaufstatusFest(laufId, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.equal(status.status, 'KLAERUNG_ERFORDERLICH')
  } finally {
    raeumeGatewayLauf(laufId)
  }
})

// ─── F-307: stdin, real und kalibriert (kein Spy) ───────────────────────────
// Alle drei Fälle starten einen ECHTEN Prozess über prozessstart.ts. Das
// Prüfskript liest stdin und beendet sich erst, wenn der Strom endet —
// genau das Verhalten, das Codex real zeigt (state/tp-m3-01b-codex-
// sandbox.md, Nebenbefund zu Lauf (a): `Reading additional input from
// stdin...`).
//
// ZWEI Zeitgrenzen, und der Unterschied ist der Punkt (F-257, achtes
// Auftreten, 11.09.2026 ~12:05 UTC): im ROTEN Fall IST die kurze Grenze der
// Prüfgegenstand — der Prozess soll in sie hineinlaufen, und sie kurz zu
// halten kostet dort nichts. In den GRÜNEN Fällen ist sie es nicht: geprüft
// wird die reguläre Beendigung, und eine kurze Grenze ist dort eine
// Wettlaufbedingung gegen den Node-Start. Genau die ist real eingetreten —
// der grüne Fall meldete unter Last beendigungsart 'TIMEOUT' statt null, bei
// 13,2 s Laufzeit für einen Prozess, der normalerweise in Millisekunden
// endet.
//
// Die lange Grenze kostet keine Laufzeit: ein nicht überlasteter Prozess
// endet sofort und erreicht sie nie. Sie ist ein Notausgang, keine
// Wartezeit. Die frühere Begründung an dieser Stelle — eine kurze Grenze
// halte `npm run check` schnell — galt genau deshalb nur für den roten Fall
// und war für die grünen falsch.

/** Hält den Prozess am Leben, bis stdin EOF meldet. Ohne geschlossenen stdin endet er nie von selbst. */
const STDIN_PRUEFSKRIPT = "process.stdin.resume(); process.stdin.on('end', () => process.exit(0))"

/** Zeitgrenze des ROTEN Falls: hier soll der Prozess hineinlaufen, kurz gehalten spart das echte Wartezeit. */
const STDIN_ZEITGRENZE_ROT_MS = 2000

/** Zeitgrenze der GRÜNEN Fälle: großzügig, weil sie dort nicht der Prüfgegenstand ist, sondern nur der Notausgang. Wird bei regulärer Beendigung nie erreicht. */
const STDIN_ZEITGRENZE_GRUEN_MS = 30000

test('F-307 rot (real gemessen, kein Spy): OHNE stdinLeer läuft ein stdin-lesender Prozess in die Zeitgrenze', async () => {
  const ergebnis = await starteProzess([process.execPath], ['-e', STDIN_PRUEFSKRIPT], { zeitgrenzeMs: STDIN_ZEITGRENZE_ROT_MS })
  assert.equal(ergebnis.beendigungsart, 'TIMEOUT')
  assert.equal(ergebnis.exitCode, null)
})

test('F-307 grün (real gemessen, kein Spy): MIT stdinLeer terminiert derselbe Prozess regulär mit Exit 0', async () => {
  const ergebnis = await starteProzess([process.execPath], ['-e', STDIN_PRUEFSKRIPT], { zeitgrenzeMs: STDIN_ZEITGRENZE_GRUEN_MS, stdinLeer: true })
  assert.equal(ergebnis.beendigungsart, null)
  assert.equal(ergebnis.exitCode, 0)
})

test('F-307: stdinLeer gegen ein Kind, das sofort endet — der stdin-Fehlerkanal reißt den Node-Prozess nicht ab', async () => {
  // Das Kind beendet sich, bevor/während end() auf seinem stdin läuft. Ohne
  // einen error-Listener auf kindprozess.stdin wäre ein EPIPE/
  // ERR_STREAM_DESTROYED hier ein unbehandeltes Stream-Ereignis — das
  // beendet unter Node nicht nur den Lauf, sondern den gesamten Prozess.
  // Dass dieser Test überhaupt bis zur Zusicherung kommt, IST der Nachweis.
  const ergebnis = await starteProzess([process.execPath], ['-e', 'process.exit(0)'], { zeitgrenzeMs: STDIN_ZEITGRENZE_GRUEN_MS, stdinLeer: true })
  assert.equal(ergebnis.exitCode, 0)
  assert.equal(ergebnis.startfehler, null)
})
