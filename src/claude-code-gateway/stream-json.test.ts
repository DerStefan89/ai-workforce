/**
 * Datei: src/claude-code-gateway/stream-json.test.ts
 *
 * Zweck: F40 WS-1 (state/spike-f40-streaming.md) — stream-json-Lesepfad des
 * Claude-Code-Gateways. Drei Gates aus dem Auftrag:
 *   (a) Kill mitten im Stream: keine result-Zeile, unvollständige letzte
 *       Zeile — der bestehende ABBRUCH/TIMEOUT-Pfad greift, kein Hänger,
 *       kein Parse-Wurf.
 *   (b) result-Zeile löst den Starter real VOR dem Prozessende auf
 *       (echter Kindprozess, gemessene Differenz > 0).
 *   (c) leseErgebnisobjekt liest dasselbe result-Objekt aus NDJSON wie aus
 *       dem früheren gepufferten json (Rückwärtskompatibilität alter
 *       Rohströme). Die Extraktions-Fallbacks (Codezaun/JSON-Objekt) selbst
 *       prüft scripts/check-f31-gedaechtnis.mjs Abschnitt (i) gegen beide
 *       Formen.
 * Die Kindprozesse sind node -e-Skripte, die die real gemessene
 * stream-json-Zeilenform nachbilden — kein Netz, kein claude.exe.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { leseErgebnisobjekt, leseWerkzeugaufrufe } from './index.ts'
import { darfFruehAufloesen, starteProzess } from './prozessstart.ts'

const STARTZIEL = [process.execPath]

const INIT = JSON.stringify({ type: 'system', subtype: 'init', session_id: 's' })
const TOOL_USE = JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Read', input: { file_path: 'C:\\repo\\docs\\STATUS.md' } }] } })
const RESULT = JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: '{"art":"antwort","antwort":"ok"}', permission_denials: [] })

/** Baut ein node -e-Skript, das die übergebenen Schreibschritte ausführt: string = sofort schreiben, number = so viele ms warten. */
function skript(schritte: Array<string | number>): string {
  let code = ''
  let verzoegerung = 0
  for (const schritt of schritte) {
    if (typeof schritt === 'number') verzoegerung += schritt
    else code += `setTimeout(() => process.stdout.write(${JSON.stringify(schritt)}), ${verzoegerung});`
  }
  return code
}

// ─── (c) leseErgebnisobjekt: NDJSON und gepuffertes json ────────────────────

test('leseErgebnisobjekt liest die result-Zeile aus stream-json-NDJSON (F40 WS-1)', () => {
  const obj = leseErgebnisobjekt(`${INIT}\n${TOOL_USE}\n${RESULT}\n`)
  assert.deepStrictEqual(obj, JSON.parse(RESULT))
})

test('leseErgebnisobjekt liest weiterhin ein gepuffertes json-Objekt (alter Rohstrom) — Regression', () => {
  assert.deepStrictEqual(leseErgebnisobjekt(RESULT), JSON.parse(RESULT))
})

test('leseErgebnisobjekt: ein result-förmiger String IN einer tool_result-Zeile zählt nicht als result-Zeile', () => {
  const koeder = JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', content: RESULT }] } })
  assert.strictEqual(leseErgebnisobjekt(`${INIT}\n${koeder}\n`), null)
})

test('leseErgebnisobjekt: Abbruch mitten im Stream (keine result-Zeile, abgeschnittenes Fragment am Ende) → null, kein Wurf — Rot-Fall (a)', () => {
  assert.strictEqual(leseErgebnisobjekt(`${INIT}\n${TOOL_USE}\n{"type":"assistant","message":{"con`), null)
})

test('leseErgebnisobjekt: leeres stdout und reine Nicht-result-Zeilen → null', () => {
  assert.strictEqual(leseErgebnisobjekt(''), null)
  assert.strictEqual(leseErgebnisobjekt(`${INIT}\n`), null)
})

test('leseErgebnisobjekt: bei mehreren result-Zeilen zählt die letzte', () => {
  const erste = JSON.stringify({ type: 'result', result: 'alt' })
  const obj = leseErgebnisobjekt(`${erste}\n${RESULT}\n`)
  assert.strictEqual(obj?.result, JSON.parse(RESULT).result)
})

test('leseErgebnisobjekt toleriert CRLF-Zeilenenden', () => {
  assert.deepStrictEqual(leseErgebnisobjekt(`${INIT}\r\n${RESULT}\r\n`), JSON.parse(RESULT))
})

// ─── leseWerkzeugaufrufe ────────────────────────────────────────────────────

test('leseWerkzeugaufrufe zieht Werkzeugname und Pfad-Parameter aus einer assistant/tool_use-Zeile', () => {
  assert.deepStrictEqual(leseWerkzeugaufrufe(JSON.parse(TOOL_USE)), [{ werkzeug: 'Read', ziel: 'C:\\repo\\docs\\STATUS.md' }])
  const grep = { type: 'assistant', message: { content: [{ type: 'text', text: 'x' }, { type: 'tool_use', name: 'Grep', input: { pattern: 'F-5', path: 'state' } }] } }
  assert.deepStrictEqual(leseWerkzeugaufrufe(grep), [{ werkzeug: 'Grep', ziel: 'F-5' }])
})

test('leseWerkzeugaufrufe liefert [] für Nicht-assistant-Zeilen und unerwartete Formen, wirft nie', () => {
  assert.deepStrictEqual(leseWerkzeugaufrufe(JSON.parse(RESULT)), [])
  assert.deepStrictEqual(leseWerkzeugaufrufe({ type: 'assistant' }), [])
  assert.deepStrictEqual(leseWerkzeugaufrufe({ type: 'assistant', message: { content: 'kein Array' } }), [])
  assert.deepStrictEqual(leseWerkzeugaufrufe({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Glob', input: null }] } }), [{ werkzeug: 'Glob', ziel: null }])
})

// ─── (b) früher Erfolgspfad: result-Zeile vor Prozessende ───────────────────

test('starteProzess mit ergebnisZeileBeendet löst bei der result-Zeile auf, real vor dem Prozessende — Gate (b)', async () => {
  const start = performance.now()
  let ende: { t: number; exitCode: number | null } | null = null
  let meldeEnde: () => void = () => {}
  const prozessende = new Promise<void>((resolve) => {
    meldeEnde = resolve
  })
  const e = await starteProzess(STARTZIEL, ['-e', `${skript([`${INIT}\n`, 50, `${TOOL_USE}\n`, 50, `${RESULT}\n`])} setTimeout(() => {}, 800)`], {
    ergebnisZeileBeendet: true,
    beiProzessende: (info) => {
      ende = { t: performance.now() - start, exitCode: info.exitCode }
      meldeEnde()
    },
  })
  const tResult = performance.now() - start
  assert.strictEqual(ende, null, 'der Starter muss aufgelöst haben, BEVOR der Prozess endete')
  await prozessende
  const gemessen = ende as unknown as { t: number; exitCode: number | null }
  assert.strictEqual(e.ergebnisZeileVorProzessende, true)
  assert.strictEqual(e.exitCode, null, 'zum Auflösezeitpunkt existiert real noch kein Exitcode — nicht geraten')
  assert.strictEqual(e.beendigungsart, null)
  assert.strictEqual(e.startfehler, null)
  assert.deepStrictEqual(leseErgebnisobjekt(e.stdout), JSON.parse(RESULT))
  assert.strictEqual(gemessen.exitCode, 0)
  const differenz = gemessen.t - tResult
  assert.ok(differenz > 0, `result-Auflösung muss vor dem Prozessende liegen, Differenz ${differenz}ms`)
})

test('starteProzess: result-Zeile über zwei Chunks verteilt wird erst nach dem Zeilenende erkannt, dann früh aufgelöst', async () => {
  const halb = Math.floor(RESULT.length / 2)
  const ergebnis = await starteProzess(STARTZIEL, ['-e', `${skript([`${INIT}\n`, RESULT.slice(0, halb), 150, `${RESULT.slice(halb)}\n`])} setTimeout(() => {}, 1500)`], {
    ergebnisZeileBeendet: true,
  })
  assert.strictEqual(ergebnis.ergebnisZeileVorProzessende, true)
  assert.deepStrictEqual(leseErgebnisobjekt(ergebnis.stdout), JSON.parse(RESULT))
})

test('starteProzess ohne ergebnisZeileBeendet wartet wie bisher auf das Prozessende — Regression (Opt-in, Codex-Pfad)', async () => {
  const ergebnis = await starteProzess(STARTZIEL, ['-e', `${skript([`${RESULT}\n`])} setTimeout(() => {}, 300)`])
  assert.strictEqual(ergebnis.ergebnisZeileVorProzessende, undefined)
  assert.strictEqual(ergebnis.exitCode, 0)
})

test('starteProzess meldet jede vollständige stream-json-Zeile an beiStreamZeile, ein Wurf daraus stört den Lauf nicht', async () => {
  const typen: unknown[] = []
  const ergebnis = await starteProzess(STARTZIEL, ['-e', skript([`${INIT}\n${TOOL_USE}\n`, 30, 'kein json\n', `${RESULT}\n`])], {
    ergebnisZeileBeendet: true,
    beiStreamZeile: (zeile) => {
      typen.push(zeile.type)
      if (zeile.type === 'system') throw new Error('Rückruf-Wurf')
    },
  })
  assert.deepStrictEqual(typen, ['system', 'assistant', 'result'])
  assert.strictEqual(ergebnis.ergebnisZeileVorProzessende, true)
})

// ─── (a) Kill mitten im Stream: bestehender Terminal-Pfad bleibt führend ────

test('Abbruch mitten im Stream (keine result-Zeile, Fragment ohne Zeilenende) → ABBRUCH, kein Hänger, kein Parse-Wurf — Gate (a)', async () => {
  const controller = new AbortController()
  const start = Date.now()
  const laufend = starteProzess(STARTZIEL, ['-e', `${skript([`${INIT}\n${TOOL_USE}\n`, '{"type":"assistant","message":{"con'])} setTimeout(() => {}, 10000)`], {
    ergebnisZeileBeendet: true,
    abbruchSignal: controller.signal,
  })
  setTimeout(() => controller.abort(), 300)
  const ergebnis = await laufend
  assert.strictEqual(ergebnis.beendigungsart, 'ABBRUCH')
  assert.strictEqual(ergebnis.ergebnisZeileVorProzessende, undefined)
  assert.strictEqual(ergebnis.exitCode, null)
  assert.ok(Date.now() - start < 5000, 'Abbruch darf nicht hängen')
  assert.strictEqual(leseErgebnisobjekt(ergebnis.stdout), null)
})

test('Timeout mitten im Stream (keine result-Zeile) → TIMEOUT wie bisher — Gate (a)', async () => {
  const ergebnis = await starteProzess(STARTZIEL, ['-e', `${skript([`${INIT}\n`, 20, `${TOOL_USE}\n`])} setTimeout(() => {}, 10000)`], {
    ergebnisZeileBeendet: true,
    zeitgrenzeMs: 400,
  })
  assert.strictEqual(ergebnis.beendigungsart, 'TIMEOUT')
  assert.strictEqual(ergebnis.ergebnisZeileVorProzessende, undefined)
  assert.strictEqual(leseErgebnisobjekt(ergebnis.stdout), null)
})

test('Prozess endet regulär ohne result-Zeile (Exit 1) → bestehende close-Klassifikation, kein früher Erfolg', async () => {
  const ergebnis = await starteProzess(STARTZIEL, ['-e', `process.stdout.write(${JSON.stringify(`${INIT}\n`)}); process.exitCode = 1`], { ergebnisZeileBeendet: true })
  assert.strictEqual(ergebnis.exitCode, 1)
  assert.strictEqual(ergebnis.ergebnisZeileVorProzessende, undefined)
})

// ─── F-570-Sperre als reine Funktion (Code-Review-Befund F40 WS-1) ──────────

test('darfFruehAufloesen: nur result-Zeile mit ergebnisZeileBeendet und ohne laufenden Abbruch/Timeout/maxBuffer-Kill — F-570', () => {
  const gruen = { ergebnisZeileBeendet: true, zeilentyp: 'result', abbruchErkannt: false, maxBufferUeberschritten: false, gekillt: false }
  assert.strictEqual(darfFruehAufloesen(gruen), true)
  assert.strictEqual(darfFruehAufloesen({ ...gruen, abbruchErkannt: true }), false, 'Abbruch vor der result-Zeile bleibt ABBRUCH')
  assert.strictEqual(darfFruehAufloesen({ ...gruen, gekillt: true }), false, 'Timeout-Kill mit result-Zeile noch in der Pipe bleibt TIMEOUT')
  assert.strictEqual(darfFruehAufloesen({ ...gruen, maxBufferUeberschritten: true }), false, 'maxBuffer bleibt startfehler')
  assert.strictEqual(darfFruehAufloesen({ ...gruen, ergebnisZeileBeendet: false }), false, 'Opt-in')
  assert.strictEqual(darfFruehAufloesen({ ...gruen, zeilentyp: 'assistant' }), false)
})

// ─── Nach der result-Zeile (QA-Befund F40 WS-1) ─────────────────────────────

test('Abbruch NACH der result-Zeile ändert das bereits aufgelöste Ergebnis nicht, der Prozess wird trotzdem beendet', async () => {
  const controller = new AbortController()
  let meldeEnde: (info: { exitCode: number | null; signal: string | null }) => void = () => {}
  const prozessende = new Promise<{ exitCode: number | null; signal: string | null }>((resolve) => {
    meldeEnde = resolve
  })
  const ergebnis = await starteProzess(STARTZIEL, ['-e', `${skript([`${RESULT}\n`])} setTimeout(() => {}, 10000)`], {
    ergebnisZeileBeendet: true,
    abbruchSignal: controller.signal,
    beiProzessende: (info) => meldeEnde(info),
  })
  controller.abort()
  const ende = await prozessende
  assert.strictEqual(ergebnis.ergebnisZeileVorProzessende, true)
  assert.strictEqual(ergebnis.beendigungsart, null)
  assert.notStrictEqual(ende.signal, null, 'der noch lebende Prozess muss durch den Abbruch beendet worden sein')
})

test('Nachlauffrist: lebt der Prozess nach der result-Zeile weiter, wird er nach der Frist beendet', async () => {
  const start = Date.now()
  let meldeEnde: (info: { exitCode: number | null; signal: string | null }) => void = () => {}
  const prozessende = new Promise<{ exitCode: number | null; signal: string | null }>((resolve) => {
    meldeEnde = resolve
  })
  const ergebnis = await starteProzess(STARTZIEL, ['-e', `${skript([`${RESULT}\n`])} setTimeout(() => {}, 20000)`], {
    ergebnisZeileBeendet: true,
    nachlaufFristMs: 300,
    beiProzessende: (info) => meldeEnde(info),
  })
  const ende = await prozessende
  assert.strictEqual(ergebnis.ergebnisZeileVorProzessende, true)
  assert.notStrictEqual(ende.signal, null, 'Prozess muss per Signal beendet worden sein')
  assert.ok(Date.now() - start < 10000, 'Nachlauffrist hat nicht gegriffen')
})

test('Nachlauffrist greift nicht bei einem Prozess, der regulär innerhalb der Frist endet', async () => {
  let meldeEnde: (info: { exitCode: number | null; signal: string | null }) => void = () => {}
  const prozessende = new Promise<{ exitCode: number | null; signal: string | null }>((resolve) => {
    meldeEnde = resolve
  })
  await starteProzess(STARTZIEL, ['-e', `${skript([`${RESULT}\n`])} setTimeout(() => {}, 200)`], {
    ergebnisZeileBeendet: true,
    nachlaufFristMs: 3000,
    beiProzessende: (info) => meldeEnde(info),
  })
  const ende = await prozessende
  assert.strictEqual(ende.exitCode, 0)
  assert.strictEqual(ende.signal, null)
})
