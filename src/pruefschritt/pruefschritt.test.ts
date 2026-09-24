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
import { entferneLeitstandUmgebungsvariablen, fuehrePruefungDurch, klassifizierePruefergebnis, kuerzeAusgabeEnde, letzteZeilen, validierePruefergebnisDaten } from './index.ts'

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
