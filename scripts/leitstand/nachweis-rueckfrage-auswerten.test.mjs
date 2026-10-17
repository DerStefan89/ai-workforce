/**
 * Datei: scripts/leitstand/nachweis-rueckfrage-auswerten.test.mjs
 *
 * Zweck: node:test für das Nachweis-Werkzeug des Rückfrage-Kanals (F45 B2b-3b-2b-2b-1, features/F45/plan-b2b3b2b2b1-v2.md): reine
 * Auswertung P1–P13 an gebauten Lauf-Daten (grün, je Punkt ein Rot-Fall, Mindestbasis ⇒ „nicht belegbar“), Markdown ohne absolute Pfade und
 * mit Marken, Argumente und Sperre von `--aus`. Den Weg über einen echten Kontrollzustand (Lesen, nur lesend) prüft Gate f45-b2b3b2b2b1 (b)(c).
 *
 * Wird aufgerufen von: npm run check (node --test)
 */

import assert from 'node:assert/strict'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { kanonischesJson, sha256Hex } from '../../src/checkpoint-store/index.ts'
import { ERFUELLT, ERFUELLT_MIT_ABWEICHUNG, alsMarkdown, leseArgumente, NICHT_BELEGBAR, NICHT_ERFUELLT, pruefeAusZiel, werteNachweisAus } from './nachweis-rueckfrage-auswerten.mjs'

const TEXT = 'Stefan hat den Befehl abgelehnt. (Ref t1)'
const ORDNER = join(tmpdir(), 'nw-test', 'arbeitsordner')
const INPUT_A = { command: "node -e \"require('fs').writeFileSync('a.txt','a')\"", description: 'a' }
const INPUT_B = { command: "node -e \"require('fs').writeFileSync('b.txt','b')\"", description: 'b' }
const INPUT_C = { file_path: join(tmpdir(), 'c.txt'), content: 'c' }
const KONTEXT = { projektId: 'haushaltsbuch2', erwarteterUrlPfad: '/api/projekte/haushaltsbuch2' }

const init = (server = [{ name: 'rueckfrage', status: 'connected' }], tools = ['Bash', 'Write', 'mcp__rueckfrage__frage_stefan']) => ({ type: 'system', subtype: 'init', cwd: ORDNER, session_id: 's1', claude_code_version: '2.1.300', tools, mcp_servers: server })
const ergebnis = (id, text, fehler = true, parent = null) => ({ type: 'user', parent_tool_use_id: parent, message: { content: [{ type: 'tool_result', tool_use_id: id, content: text, is_error: fehler }] } })
const eintrag = (id, tool, input, art, grund, extra = {}) => ({ tool_use_id: id, tool_name: tool, input_hash: sha256Hex(kanonischesJson(input)), art, grund, zeit: '2026-10-17T10:00:00.000Z', ...extra })

/** Lauf A + B in einem Datensatz: (a) erlaubt, (b) abgelehnt, (c) Write außerhalb automatisch, (d) Frage. */
function lauf(aendern = {}) {
  const denials = aendern.denials ?? [
    { tool_name: 'Bash', tool_use_id: 'b', tool_input: INPUT_B },
    { tool_name: 'Write', tool_use_id: 'c', tool_input: INPUT_C },
  ]
  const zeilen = aendern.zeilen ?? [init(), ergebnis('a', 'ok', false), ergebnis('b', TEXT), ergebnis('c', 'Automatisch abgelehnt: Pfad außerhalb des Arbeitsordners'), ergebnis('d', 'Stefan entscheidet: rot', false), { type: 'result', subtype: 'success', permission_denials: denials }]
  const eintraege = aendern.eintraege ?? [
    eintrag('a', 'Bash', INPUT_A, 'stefan_erlaubt', 'Stefan hat erlaubt', { herkunft: 'browser', befehl: INPUT_A.command }),
    eintrag('b', 'Bash', INPUT_B, 'stefan_abgelehnt', 'Stefan hat abgelehnt', { herkunft: 'browser', ablehnung_hash: sha256Hex(TEXT) }),
    eintrag('c', 'Write', INPUT_C, 'auto_deny', 'Pfad außerhalb des Arbeitsordners'),
    eintrag('d', 'frage_stefan', { frage: 'Farbe?', optionen: ['rot', 'blau'] }, 'frage_beantwortet', 'Stefan hat geantwortet', { herkunft: 'browser', antwort: 'rot' }),
  ]
  const zaehlung = aendern.zaehlung ?? { stefan_erlaubt: 1, stefan_abgelehnt: 1, frage_beantwortet: 1, nicht_browser: 0, abgelaufen: 0, lauf_ende: 0, automatisch: 1 }
  return {
    laufId: 'lauf-t',
    laufakte: aendern.laufakte ?? { werkzeug_version_deklariert: '2.1.300 (Claude Code)' },
    roh: aendern.roh ?? { status: 'ok', zeilen: zeilen.map((z) => JSON.stringify(z)) },
    protokoll: aendern.protokoll ?? { status: 'ok', eintraege, versionen: eintraege.length },
    laufStatus: aendern.laufStatus ?? { status: 'ABGESCHLOSSEN' },
    runPrepared: aendern.runPrepared ?? true,
    kettenLaenge: 3,
    terminal: 'terminal' in aendern ? aendern.terminal : { ergebnis: 'VERWEIGERT', daten: { rueckfrage_zaehlung: zaehlung, rueckfrage_abgleich: { art: 'abgleich', grund: 'nicht_von_stefan' } } },
  }
}

/** Ergebnis je Punkt-ID. */
const ergebnisse = (daten) => Object.fromEntries(werteNachweisAus(daten, KONTEXT).punkte.map((p) => [p.id, p.ergebnis]))

test('grüner Lauf: alle belegbaren Punkte erfüllt, P3 und P4b nicht belegbar', () => {
  assert.deepEqual(ergebnisse(lauf()), {
    P1: ERFUELLT,
    P2: ERFUELLT,
    P3: NICHT_BELEGBAR,
    P4: ERFUELLT,
    P4b: NICHT_BELEGBAR,
    P5: ERFUELLT,
    P6: ERFUELLT,
    P7: ERFUELLT,
    P8: ERFUELLT,
    P9: ERFUELLT,
    P10: ERFUELLT,
    P11: ERFUELLT,
    P12: ERFUELLT,
    P13: ERFUELLT,
  })
})

test('Rot je Punkt: Eingabe, doppelte ID, Text, unbekanntes Feld, init, Zählung, Pfadgrund, Herkunft, R3', () => {
  const anderesInput = lauf({ denials: [{ tool_name: 'Bash', tool_use_id: 'b', tool_input: { ...INPUT_B, description: 'anders' } }] })
  assert.equal(ergebnisse(anderesInput).P1, NICHT_ERFUELLT)
  const doppelt = lauf({ denials: [{ tool_name: 'Bash', tool_use_id: 'b', tool_input: INPUT_B }, { tool_name: 'Bash', tool_use_id: 'b', tool_input: INPUT_B }] })
  assert.equal(ergebnisse(doppelt).P2, NICHT_ERFUELLT)
  const text = lauf({ zeilen: [init(), ergebnis('b', 'Permission denied.'), { type: 'result', permission_denials: [] }] })
  assert.equal(ergebnisse(text).P4, NICHT_ERFUELLT)
  const basis = lauf().protokoll.eintraege
  const unbekannt = lauf({ eintraege: [...basis, eintrag('e', 'Bash', { command: 'x', neu: 1 }, 'auto_deny', 'unbekanntes Eingabefeld: neu')] })
  assert.equal(ergebnisse(unbekannt).P5, NICHT_ERFUELLT)
  assert.equal(ergebnisse(lauf({ zeilen: [init([{ name: 'rueckfrage', status: 'failed' }])] })).P7, NICHT_ERFUELLT)
  assert.equal(ergebnisse(lauf({ zaehlung: { stefan_erlaubt: 1, stefan_abgelehnt: 1, frage_beantwortet: 1, nicht_browser: 0, abgelaufen: 0, lauf_ende: 0, automatisch: 2 } })).P9, NICHT_ERFUELLT)
  const pfad = lauf({ eintraege: basis.map((e) => (e.tool_use_id === 'c' ? { ...e, grund: 'nur Bash-Befehle werden Stefan vorgelegt' } : e)) })
  assert.equal(ergebnisse(pfad).P11, NICHT_ERFUELLT)
  const fremd = lauf({ eintraege: basis.map((e) => (e.tool_use_id === 'a' ? { ...e, herkunft: 'nicht_browser' } : e)) })
  assert.equal(ergebnisse(fremd).P13, NICHT_ERFUELLT)
  assert.equal(ergebnisse(lauf({ terminal: { ergebnis: 'VERWEIGERT', daten: { rueckfrage_abweichung: 'Länge abweichend' } } })).P12, NICHT_ERFUELLT)
  const frageAlsRechte = lauf({ eintraege: [...basis, eintrag('f', 'mcp__rueckfrage__frage_stefan', {}, 'auto_deny', "Werkzeug 'mcp__rueckfrage__frage_stefan' nicht im Werkzeugsatz")] })
  assert.equal(ergebnisse(frageAlsRechte).P8, NICHT_ERFUELLT)
})

test('Mindestbasis: ohne Protokoll, ohne Rohstrom, ohne Ablehnung, ohne Kanal nie „erfüllt“', () => {
  const ohneProtokoll = ergebnisse(lauf({ protokoll: { status: 'fehlt', grund: 'kein Protokoll', versionen: 0 } }))
  for (const id of ['P1', 'P4', 'P5', 'P6', 'P8', 'P9', 'P11', 'P13']) assert.equal(ohneProtokoll[id], NICHT_BELEGBAR, id)
  const ohneRoh = ergebnisse(lauf({ roh: { status: 'hash', grund: 'Rohstrom-Hash weicht von der Laufakte ab' } }))
  for (const id of ['P1', 'P2', 'P3', 'P4', 'P7', 'P8', 'P10', 'P11']) assert.equal(ohneRoh[id], NICHT_BELEGBAR, id)
  const leer = ergebnisse(lauf({ denials: [], eintraege: [] }))
  for (const id of ['P1', 'P2', 'P6', 'P9', 'P11', 'P13']) assert.equal(leer[id], NICHT_BELEGBAR, id)
  // Lauf ohne Kanal-Argv: die Startfreigabe galt einem anderen Argv.
  assert.equal(ergebnisse(lauf({ zeilen: [init([], ['Bash'])] })).P10, NICHT_BELEGBAR)
  assert.equal(ergebnisse(lauf({ runPrepared: false })).P10, NICHT_ERFUELLT)
  // Subagent-Zeile mit Stefans Text ⇒ P4b erfüllt.
  const sub = lauf({ zeilen: [init(), ergebnis('b', TEXT), ergebnis('b', TEXT, true, 'toolu_agent'), { type: 'result', permission_denials: [{ tool_name: 'Bash', tool_use_id: 'b', tool_input: INPUT_B }] }] })
  assert.equal(ergebnisse(sub).P4b, ERFUELLT)
})

test('Hinweise der Zählung: nur automatisch bzw. nur lauf_ende größer', () => {
  const p9 = (zaehlung) => werteNachweisAus(lauf({ zaehlung }), KONTEXT).punkte.find((p) => p.id === 'P9').details.join('\n')
  assert.match(p9({ stefan_erlaubt: 1, stefan_abgelehnt: 1, frage_beantwortet: 1, nicht_browser: 0, abgelaufen: 0, lauf_ende: 0, automatisch: 3 }), /Protokollgrenze ohne Eintrag/)
  assert.match(p9({ stefan_erlaubt: 1, stefan_abgelehnt: 1, frage_beantwortet: 1, nicht_browser: 0, abgelaufen: 0, lauf_ende: 1, automatisch: 1 }), /nach dem Lauf-Ende/)
})

test('Markdown: keine absoluten Pfade, Marken für Steuerzeichen, Übersicht mit allen Punkten', () => {
  const h = homedir()
  const varianten = [join(h, 'x'), `${h.replaceAll('\\', '/')}/y`, h.replaceAll('\\', '\\\\'), ...(process.platform === 'win32' ? [h.toUpperCase()] : [])].join(' | ')
  const daten = lauf({ terminal: { ergebnis: 'VERWEIGERT', daten: { rueckfrage_abweichung: `Fehler in ${varianten} ${String.fromCodePoint(0x202e)}` } } })
  const md = alsMarkdown(werteNachweisAus(daten, KONTEXT), { installWurzel: join(tmpdir(), 'nw-test') }, '2026-10-17T10:00:00.000Z')
  // code-reviewer 7: roh, mit '/', JSON-escaped und in anderer Groß-/Kleinschreibung.
  for (const ort of [homedir(), tmpdir()]) for (const form of [ort, ort.replaceAll('\\', '/'), ort.replaceAll('\\', '\\\\'), ort.toUpperCase()]) assert.ok(!md.includes(form), `absoluter Pfad in der Ausgabe: ${form}`)
  assert.match(md, /⟦U\+202E⟧/)
  assert.match(md, /&lt;HOME&gt;/, "Platzhalter als Entität (kein HTML im Markdown)")
  for (const id of ['P1', 'P4b', 'P9', 'P13']) assert.match(md, new RegExp(`\\| ${id} `))
  assert.ok(md.endsWith('\n') && !md.includes('\r'))
})

test('Argumente und Sperre von --aus', () => {
  assert.deepEqual(leseArgumente(['--lauf', 'abc-1', '--projekt', 'p']), { lauf: 'abc-1', projekt: 'p' })
  assert.ok(leseArgumente(['--lauf', '../x']).fehler)
  assert.ok(leseArgumente(['--lauf']).fehler)
  assert.ok(leseArgumente(['--lauf', 'a', '--prozesszeile', 'x']).fehler)
  const basis = join(tmpdir(), 'nw-test', 'kontrollzustand')
  assert.match(pruefeAusZiel(join(basis, 'a.md'), [basis]), /gesperrt/)
  assert.equal(pruefeAusZiel(join(tmpdir(), 'nw-test', 'features', 'a.md'), [basis]), null)
})

test('Korrekturrunde: nicht abgeschlossen, P8 ohne Server-Liste, P3 zwei Sitzungen, P4b negativ, P11 nur „Pfad außerhalb“, P1 ohne Eintrag', () => {
  // code-reviewer 2 / qa 10 (Advisor M9): Lauf nicht terminal ⇒ Terminal-Punkte nicht belegbar, Kopf sagt es.
  const offen = lauf({ laufStatus: { status: 'KLAERUNG_ERFORDERLICH' }, terminal: null })
  const offenE = ergebnisse(offen)
  for (const id of ['P9', 'P12']) assert.equal(offenE[id], NICHT_BELEGBAR, id)
  assert.match(alsMarkdown(werteNachweisAus(offen, KONTEXT), { installWurzel: tmpdir() }), /Lauf nicht abgeschlossen/)
  // code-reviewer 1: init ohne mcp_servers ⇒ --strict-mcp-config nicht belegt ⇒ P8 nie „erfüllt“.
  const ohneServer = { ...init(), mcp_servers: undefined }
  assert.notEqual(ergebnisse(lauf({ zeilen: [ohneServer, ergebnis('b', TEXT), { type: 'result', permission_denials: [] }] })).P8, ERFUELLT)
  // qa 14: zwei Sitzungen ⇒ P3 nicht erfüllt.
  assert.equal(ergebnisse(lauf({ zeilen: [init(), { ...init(), session_id: 's2' }] })).P3, NICHT_ERFUELLT)
  // qa 14: Subagent-Zeile mit anderem Text ⇒ P4b nicht erfüllt.
  const sub = lauf({ zeilen: [init(), ergebnis('b', TEXT), ergebnis('b', 'anderer Text', true, 'toolu_agent'), { type: 'result', permission_denials: [{ tool_name: 'Bash', tool_use_id: 'b', tool_input: INPUT_B }] }] })
  assert.equal(ergebnisse(sub).P4b, NICHT_ERFUELLT)
  // code-reviewer 6: „Pfad fehlt“ ist keine Pfadgrenze ⇒ nicht erfüllt.
  const basis = lauf().protokoll.eintraege
  assert.equal(ergebnisse(lauf({ eintraege: basis.map((e) => (e.tool_use_id === 'c' ? { ...e, grund: 'Pfad fehlt' } : e)) })).P11, NICHT_ERFUELLT)
  // qa 12: Ablehnung ohne Protokolleintrag wird in P1 genannt.
  const ohneEintrag = lauf({ denials: [...lauf().roh.zeilen.map((z) => JSON.parse(z)).at(-1).permission_denials, { tool_name: 'Bash', tool_use_id: 'x', tool_input: {} }] })
  assert.match(werteNachweisAus(ohneEintrag, KONTEXT).punkte.find((p) => p.id === 'P1').details.join('\n'), /1 Ablehnung\(en\) ohne Protokolleintrag/)
  // qa 14: Protokoll nicht zusammensetzbar ⇒ Grund im Kopf, Punkte nicht belegbar.
  const kaputt = werteNachweisAus(lauf({ protokoll: { status: 'ungueltig', grund: 'Version 2 lückenhaft (ab 3, erwartet 1)', versionen: 2 } }), KONTEXT)
  assert.match(kaputt.kopf.protokoll, /lückenhaft/)
  assert.equal(kaputt.punkte.find((p) => p.id === 'P9').ergebnis, NICHT_BELEGBAR)
})

test('E-F-1136 (1) = B: andere CLI-Version ⇒ CLI-abhängige Punkte „erfüllt mit Abweichung“, ohne Version „nicht belegbar“, übrige unverändert', () => {
  const abweichend = werteNachweisAus(lauf({ laufakte: { werkzeug_version_deklariert: '2.1.258 (Claude Code)' } }), KONTEXT)
  const e = Object.fromEntries(abweichend.punkte.map((p) => [p.id, p.ergebnis]))
  for (const id of ['P1', 'P2', 'P4', 'P5', 'P7', 'P8', 'P10', 'P11']) assert.equal(e[id], ERFUELLT_MIT_ABWEICHUNG, id)
  for (const id of ['P6', 'P9', 'P12', 'P13']) assert.equal(e[id], ERFUELLT, id)
  const p10 = abweichend.punkte.find((p) => p.id === 'P10').details.join('\n')
  assert.match(p10, /deklariert 2\.1\.258 \(Claude Code\) \(Laufakte werkzeug_version_deklariert\), im Lauf 2\.1\.300 \(Rohstrom Z1 init claude_code_version\)/)
  assert.match(abweichend.kopf.cliVersion, /^ABWEICHEND/)
  // Ein „nicht erfüllt“ bleibt „nicht erfüllt“.
  const rot = lauf({ laufakte: { werkzeug_version_deklariert: '2.1.258' }, zaehlung: { stefan_erlaubt: 9, stefan_abgelehnt: 1, frage_beantwortet: 1, nicht_browser: 0, abgelaufen: 0, lauf_ende: 0, automatisch: 1 } })
  assert.equal(ergebnisse(rot).P9, NICHT_ERFUELLT)
  // Version nicht ermittelbar (Laufakte ohne Deklaration bzw. init ohne claude_code_version) ⇒ nicht belegbar.
  assert.equal(ergebnisse(lauf({ laufakte: {} })).P10, NICHT_BELEGBAR)
  const ohneIst = lauf({ zeilen: [{ ...init(), claude_code_version: undefined }, ergebnis('b', TEXT), { type: 'result', permission_denials: [{ tool_name: 'Bash', tool_use_id: 'b', tool_input: INPUT_B }] }] })
  const o = ergebnisse(ohneIst)
  assert.equal(o.P10, NICHT_BELEGBAR)
  assert.equal(o.P4, NICHT_BELEGBAR)
  assert.equal(o.P9, ERFUELLT)
  // Gleiche Nummer, andere Schreibweise ⇒ gleich.
  assert.equal(ergebnisse(lauf({ laufakte: { werkzeug_version_deklariert: '2.1.300 (Claude Code)' } })).P10, ERFUELLT)
  assert.match(alsMarkdown(abweichend, { installWurzel: tmpdir() }), /\| P10 .* \| erfüllt mit Abweichung \|/)
})
