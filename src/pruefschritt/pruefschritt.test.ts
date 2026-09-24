/**
 * Datei: src/pruefschritt/pruefschritt.test.ts
 *
 * Zweck: node:test-Fälle für den deterministischen Prüfschritt (F-652,
 * state/findings.md F-652). Testkommandos sind kleine node-Einzeiler (via
 * process.execPath, keine Shell) — NICHT das echte `npm run check`
 * (Bauauftrag Punkt "Tests"). Jeder Rotfall (ROT/ZEITGRENZE) ist real belegt,
 * nicht nur behauptet.
 */

import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  baueAusgabeEnde,
  entferneLeitstandUmgebungsvariablen,
  filtereStderrRauschen,
  fuehrePruefungDurch,
  klassifizierePruefergebnis,
  kuerzeAusgabeEnde,
  letzteZeilen,
  STDERR_ENDE_MAX_BYTES,
  STDOUT_ENDE_MAX_BYTES,
  validierePruefergebnisDaten,
} from './index.ts'

/** argv-Präfix für einen node-Einzeiler ohne Shell (Muster startvorlagen/ai-workforce.json' pruefbefehl). */
function knotenBefehl(...ausdruecke: string[]): string[] {
  return [process.execPath, '-e', ...ausdruecke]
}

test('GRUEN: ein mit Exitcode 0 endender Befehl liefert ergebnis GRUEN und exit_code 0', async () => {
  const daten = await fuehrePruefungDurch('test-lauf-gruen', knotenBefehl('console.log("ok"); process.exit(0)'), process.cwd(), 5000)
  assert.strictEqual(daten.ergebnis, 'GRUEN')
  assert.strictEqual(daten.exit_code, 0)
  assert.deepStrictEqual(validierePruefergebnisDaten(daten), [])
})

test('ROT: ein mit Exitcode 1 endender Befehl liefert ergebnis ROT, exit_code 1, ausgabe_ende enthält den Ausgabetext', async () => {
  const daten = await fuehrePruefungDurch('test-lauf-rot', knotenBefehl('console.error("FEHLER: irgendwas ist kaputt"); process.exit(1)'), process.cwd(), 5000)
  assert.strictEqual(daten.ergebnis, 'ROT')
  assert.strictEqual(daten.exit_code, 1)
  assert.match(daten.ausgabe_ende, /FEHLER: irgendwas ist kaputt/)
  assert.deepStrictEqual(validierePruefergebnisDaten(daten), [])
})

test('ZEITGRENZE: ein Befehl, der die Zeitgrenze überschreitet, liefert ergebnis ZEITGRENZE mit exit_code null — der Prozess wird real beendet', async () => {
  // Schreibt eine Markerdatei erst nach 6s — bei einer 200ms-Zeitgrenze darf sie danach nie
  // erscheinen, wenn der Prozessbaum wirklich beendet wurde (nicht nur der Promise aufgelöst).
  // Großer Abstand (200ms Zeitgrenze vs. 6s Marker) statt einer knappen Wanduhr-Assertion: unter
  // Systemlast (paralleler npm-run-check-Lauf, Virenscanner, Cloud-Sync) kann selbst ein real
  // gekillter Prozess länger als eine knappe Sekunde bis zur endgültigen Auflösung brauchen — die
  // beweiskräftige Prüfung ist "die Markerdatei existiert nicht", nicht "wie schnell genau".
  const verzeichnis = mkdtempSync(join(tmpdir(), 'f652-pruefschritt-zeitgrenze-'))
  const markerPfad = join(verzeichnis, 'marker.txt').replace(/\\/g, '\\\\')
  const daten = await fuehrePruefungDurch(
    'test-lauf-zeitgrenze',
    knotenBefehl(`setTimeout(() => { require('node:fs').writeFileSync('${markerPfad}', 'zu spät'); process.exit(0) }, 6000)`),
    process.cwd(),
    200
  )
  assert.strictEqual(daten.ergebnis, 'ZEITGRENZE')
  assert.strictEqual(daten.exit_code, null)
  // Kurze Nachlauffrist für den Kill selbst (Windows-Jobobjekt/taskkill, prozessstart.ts), dann
  // darf die 6s-Markerdatei nicht existieren.
  await new Promise((resolve) => setTimeout(resolve, 300))
  assert.strictEqual(existsSync(join(verzeichnis, 'marker.txt')), false, 'Markerdatei existiert — der Prozess lief trotz Zeitgrenze bis zum Ende durch')
})

test('FEHLER: ein nicht existierendes Startziel liefert ergebnis FEHLER statt eines Wurfs', async () => {
  const daten = await fuehrePruefungDurch('test-lauf-fehler', ['C:\\pfad\\der\\nicht\\existiert\\programm.exe'], process.cwd(), 5000)
  assert.strictEqual(daten.ergebnis, 'FEHLER')
  assert.strictEqual(daten.exit_code, null)
  assert.deepStrictEqual(validierePruefergebnisDaten(daten), [])
})

test('LEITSTAND_*-Umgebungsvariablen erreichen den Kindprozess nicht, andere (PATH) bleiben erhalten', async () => {
  const vorher = process.env.LEITSTAND_TEST_MARKER_F652
  process.env.LEITSTAND_TEST_MARKER_F652 = 'sollte-nicht-ankommen'
  try {
    const daten = await fuehrePruefungDurch(
      'test-lauf-env',
      knotenBefehl(
        'if (process.env.LEITSTAND_TEST_MARKER_F652 !== undefined) { console.error("LEITSTAND_-Variable ist angekommen"); process.exit(1) } ' +
          'if (!process.env.PATH && !process.env.Path) { console.error("PATH fehlt komplett"); process.exit(1) } ' +
          'process.exit(0)'
      ),
      process.cwd(),
      5000
    )
    assert.strictEqual(daten.ergebnis, 'GRUEN', `erwartet GRUEN, erhalten ${daten.ergebnis}: ${daten.ausgabe_ende}`)
  } finally {
    if (vorher === undefined) delete process.env.LEITSTAND_TEST_MARKER_F652
    else process.env.LEITSTAND_TEST_MARKER_F652 = vorher
  }
})

test('entferneLeitstandUmgebungsvariablen filtert nur LEITSTAND_*-Schlüssel, sonst identisch', () => {
  const gefiltert = entferneLeitstandUmgebungsvariablen({ PATH: '/usr/bin', LEITSTAND_PORT: '4000', LEITSTAND_X: 'y', SONSTIGES: '1' })
  assert.deepStrictEqual(gefiltert, { PATH: '/usr/bin', SONSTIGES: '1' })
})

test('kuerzeAusgabeEnde lässt kurze Texte unverändert und schneidet lange auf die letzten maxBytes', () => {
  assert.strictEqual(kuerzeAusgabeEnde('kurz', 100), 'kurz')
  const lang = 'a'.repeat(50) + 'ENDE'
  const gekuerzt = kuerzeAusgabeEnde(lang, 10)
  assert.strictEqual(gekuerzt, 'aaaaaaENDE')
  assert.ok(Buffer.byteLength(gekuerzt, 'utf8') <= 10)
})

test('letzteZeilen liefert genau die letzten n Zeilen', () => {
  const text = ['1', '2', '3', '4', '5'].join('\n')
  assert.strictEqual(letzteZeilen(text, 2), '4\n5')
  assert.strictEqual(letzteZeilen(text, 100), text)
})

test('filtereStderrRauschen entfernt nur die Git-CRLF-Warnzeile, sonst nichts', () => {
  const text = [
    "warning: in the working copy of 'a.txt', LF will be replaced by CRLF the next time Git touches it",
    'FEHLER: echt kaputt',
    "warning: in the working copy of 'schemas/x.schema.json', LF will be replaced by CRLF the next time Git touches it",
  ].join('\n')
  assert.strictEqual(filtereStderrRauschen(text), 'FEHLER: echt kaputt')
  assert.strictEqual(filtereStderrRauschen(''), '')
  assert.strictEqual(filtereStderrRauschen('FEHLER: echt kaputt'), 'FEHLER: echt kaputt')
})

test('baueAusgabeEnde: leeres stderr liefert nur stdout, sonst steht stdout am Stringende', () => {
  assert.strictEqual(baueAusgabeEnde('nur stdout', ''), 'nur stdout')
  // stderr besteht NUR aus der gefilterten Rauschzeile — nach dem Filtern bleibt nichts übrig,
  // das Ergebnis ist also bitgenau wie ganz ohne stderr.
  assert.strictEqual(baueAusgabeEnde('nur stdout', "warning: in the working copy of 'a.txt', LF will be replaced by CRLF the next time Git touches it"), 'nur stdout')
  const kombiniert = baueAusgabeEnde('STDOUT-ENDE', 'STDERR-RAUSCHEN')
  assert.match(kombiniert, /STDERR-RAUSCHEN[\s\S]*STDOUT-ENDE$/)
})

test('baueAusgabeEnde: stdout und stderr werden UNABHÄNGIG gekürzt — großes stderr verdrängt eine kurze stdout-Zeile nicht (F-655)', () => {
  const riesigesStderr = 'x'.repeat(STDERR_ENDE_MAX_BYTES * 3)
  const ergebnis = baueAusgabeEnde('KURZE-STDOUT-ZEILE', riesigesStderr)
  assert.match(ergebnis, /KURZE-STDOUT-ZEILE$/)
  assert.ok(Buffer.byteLength(ergebnis, 'utf8') <= STDOUT_ENDE_MAX_BYTES + STDERR_ENDE_MAX_BYTES + 100)
})

test('F-655 Rotfall: eine Fehlerzeile auf stdout bleibt trotz viel stderr-Rauschen im Artefakt UND im Halt-Grund erhalten (real beobachtet, Lauf 9397a9dd, F39 Versuch 4)', async () => {
  // ~52 KB stderr-Rauschen (weit über dem alten gemeinsamen 16-KB-Schnitt UND über
  // STDERR_ENDE_MAX_BYTES), im Kindprozess selbst per Schleife erzeugt statt als Literal in argv
  // eingebettet — eine 600-fach wiederholte Zeile als argv-String sprengt sonst reale
  // Windows-Kommandozeilenlängengrenzen (real beobachtet: der Prozessstart selbst scheiterte,
  // ergebnis 'FEHLER' statt 'ROT'). Die Zeile wird NICHT gefiltert — anders als der CRLF-Rotfall
  // oben belegt dieser Test die UNABHÄNGIGE Kürzung, nicht den Filter.
  const skript = `for (let i = 0; i < 600; i++) console.error("[leitstand] Lauf 'x' fehlgeschlagen: Error: synthetischer Wurf aus der Attrappe (AK6)"); console.log("FEHLERZEILE-F655: echter Testfehler"); process.exit(1)`
  const daten = await fuehrePruefungDurch('test-lauf-f655-rot', knotenBefehl(skript), process.cwd(), 5000)
  assert.strictEqual(daten.ergebnis, 'ROT')
  // Artefakt: die stdout-Fehlerzeile ist trotz des stderr-Rauschens enthalten (vorher durch den
  // gemeinsamen 16-KB-Tail-Schnitt verdrängt).
  assert.match(daten.ausgabe_ende, /FEHLERZEILE-F655: echter Testfehler/)
  // Halt-Grund (Regel 1f, scripts/leitstand-server.mjs letzteZeilen(daten.ausgabe_ende, 40)):
  // stdout steht am Stringende, die Fehlerzeile bleibt also auch im gekürzten Grund sichtbar.
  assert.match(letzteZeilen(daten.ausgabe_ende, 40), /FEHLERZEILE-F655: echter Testfehler/)
})

test('klassifizierePruefergebnis: TIMEOUT vor Startfehler vor Exitcode (Reihenfolge egal, Ergebnis eindeutig)', () => {
  assert.strictEqual(klassifizierePruefergebnis({ exitCode: null, startfehler: null, beendigungsart: 'TIMEOUT' }), 'ZEITGRENZE')
  assert.strictEqual(klassifizierePruefergebnis({ exitCode: null, startfehler: { code: null, message: 'x' }, beendigungsart: null }), 'FEHLER')
  assert.strictEqual(klassifizierePruefergebnis({ exitCode: 0, startfehler: null, beendigungsart: null }), 'GRUEN')
  assert.strictEqual(klassifizierePruefergebnis({ exitCode: 1, startfehler: null, beendigungsart: null }), 'ROT')
  assert.strictEqual(klassifizierePruefergebnis({ exitCode: null, startfehler: null, beendigungsart: null }), 'FEHLER')
})

test('validierePruefergebnisDaten: additionalProperties:false und Pflichtfelder', () => {
  const gueltig = {
    pruefergebnis_schema: 'v0',
    lauf_id: 'l1',
    befehl: ['node'],
    exit_code: 0,
    ergebnis: 'GRUEN',
    dauer_ms: 10,
    ausgabe_ende: '',
    gestartet_am: new Date().toISOString(),
  }
  assert.deepStrictEqual(validierePruefergebnisDaten(gueltig), [])
  assert.notDeepStrictEqual(validierePruefergebnisDaten({ ...gueltig, unbekannt: 1 }), [])
  assert.notDeepStrictEqual(validierePruefergebnisDaten({ ...gueltig, ergebnis: 'GELB' }), [])
  const { lauf_id: _entfernt, ...ohnePflichtfeld } = gueltig
  assert.notDeepStrictEqual(validierePruefergebnisDaten(ohnePflichtfeld), [])
})

test('Schema-Datei ist gültiges JSON und beschreibt dieselben Pflichtfelder wie der Validator', () => {
  const schema = JSON.parse(readFileSync('schemas/kontrollzustand-pruefergebnis-payload.schema.json', 'utf8'))
  assert.deepStrictEqual(new Set(schema.required), new Set(['pruefergebnis_schema', 'lauf_id', 'befehl', 'exit_code', 'ergebnis', 'dauer_ms', 'ausgabe_ende', 'gestartet_am']))
})
