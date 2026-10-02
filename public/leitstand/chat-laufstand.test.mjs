/**
 * Datei: public/leitstand/chat-laufstand.test.mjs
 *
 * Zweck: F-986 (b) — Zustandsabbildung des Chats für einen ausstehenden Lauf (chat-laufstand.js):
 * gestartet/laufend, erfolgreich, verweigert bzw. beendet, nie gestartet (mit und ohne Grund),
 * normale Lage direkt nach dem 202, Detail nicht abrufbar (mit und ohne Startfehler-Eintrag), Zeitgrenze.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { ERSATZ_ZEITGRENZE_MS, ZEITGRENZE_PUFFER_MS, laufstandSignatur, ordneLaufstandEin, warteGrenzeMs, zeitgrenzeUeberschritten } from './chat-laufstand.js'

const GRUND = "Drift im Gültigkeitsschlüssel: 'arbeitsverzeichnis_pfad' (E-188)"

test('gestartet: aktiver Lauf gilt als laufend, auch mit Zwischenlage KLAERUNG_ERFORDERLICH', () => {
  assert.deepStrictEqual(ordneLaufstandEin({ aktiv: true, laufStatus: { status: 'KLAERUNG_ERFORDERLICH' } }), { art: 'laeuft' })
})

test('erfolgreich: ABGESCHLOSSEN/ERFOLGREICH', () => {
  assert.deepStrictEqual(ordneLaufstandEin({ aktiv: false, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }), { art: 'erfolgreich' })
})

test('verweigert nach dem Start: ABGESCHLOSSEN/VERWEIGERT bleibt der bestehende Weg „beendet“', () => {
  assert.deepStrictEqual(ordneLaufstandEin({ aktiv: false, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'VERWEIGERT' } }), { art: 'beendet' })
  assert.deepStrictEqual(ordneLaufstandEin({ aktiv: false, laufStatus: { status: 'KLAERUNG_ERFORDERLICH', grund: 'x' } }), { art: 'beendet' })
})

test('nie gestartet: NICHT_GESTARTET mit terminaler Marke ohne RUN_PREPARED ist terminal, Grund roh', () => {
  const detail = { aktiv: false, laufStatus: { status: 'NICHT_GESTARTET', terminaleOhneRunPrepared: [1] }, nichtGestartet: { ergebnis: 'VERWEIGERT', grund: GRUND } }
  assert.deepStrictEqual(ordneLaufstandEin(detail), { art: 'nichtGestartet', grund: GRUND })
})

test('nie gestartet ohne Grund (Server alt oder Feld fehlt): grund null', () => {
  assert.deepStrictEqual(ordneLaufstandEin({ aktiv: false, laufStatus: { status: 'NICHT_GESTARTET', terminaleOhneRunPrepared: [1] } }), { art: 'nichtGestartet', grund: null })
  assert.deepStrictEqual(ordneLaufstandEin({ aktiv: false, laufStatus: { status: 'NICHT_GESTARTET', terminaleOhneRunPrepared: [2] }, nichtGestartet: { grund: '' } }), { art: 'nichtGestartet', grund: null })
})

test('direkt nach dem 202: NICHT_GESTARTET ohne terminale Marke wartet weiter', () => {
  assert.deepStrictEqual(ordneLaufstandEin({ aktiv: false, laufStatus: { status: 'NICHT_GESTARTET', terminaleOhneRunPrepared: [] } }), { art: 'wartet' })
  assert.deepStrictEqual(ordneLaufstandEin({ aktiv: false, laufStatus: { status: 'NICHT_GESTARTET' } }), { art: 'wartet' })
})

test('Detail nicht abrufbar (404, Netzfehler): wartet', () => {
  assert.deepStrictEqual(ordneLaufstandEin(null), { art: 'wartet' })
})

test('Signatur: ändert sich mit Status und Fortschritt, nicht ohne Änderung', () => {
  const a = { aktiv: true, laufStatus: { status: 'KLAERUNG_ERFORDERLICH' }, fortschritt: { werkzeug: 'Read', ziel: 'a' } }
  assert.strictEqual(laufstandSignatur(a), laufstandSignatur(structuredClone(a)))
  assert.notStrictEqual(laufstandSignatur(a), laufstandSignatur({ ...a, fortschritt: { werkzeug: 'Read', ziel: 'b' } }))
  assert.notStrictEqual(laufstandSignatur(a), laufstandSignatur({ ...a, aktiv: false }))
  assert.strictEqual(laufstandSignatur(null), 'kein-detail')
})

test('Zeitgrenze: Startvorlage plus Puffer, sonst Ersatz; erst danach überschritten', () => {
  assert.strictEqual(warteGrenzeMs(600000), 600000 + ZEITGRENZE_PUFFER_MS)
  assert.strictEqual(warteGrenzeMs(null), ERSATZ_ZEITGRENZE_MS + ZEITGRENZE_PUFFER_MS)
  assert.strictEqual(warteGrenzeMs(0), ERSATZ_ZEITGRENZE_MS + ZEITGRENZE_PUFFER_MS)
  assert.strictEqual(warteGrenzeMs(Number.NaN), ERSATZ_ZEITGRENZE_MS + ZEITGRENZE_PUFFER_MS)
  const grenze = warteGrenzeMs(600000)
  assert.strictEqual(zeitgrenzeUeberschritten(1000, 1000 + grenze, 600000), false)
  assert.strictEqual(zeitgrenzeUeberschritten(1000, 1000 + grenze + 1, 600000), true)
  assert.strictEqual(zeitgrenzeUeberschritten(0, ERSATZ_ZEITGRENZE_MS, undefined), false)
})

test('Detail nicht abrufbar, aber Startfehler zu dieser laufId: nie gestartet mit dessen Grund', () => {
  const startfehler = [{ laufId: 'anderer', fehler: 'x' }, { laufId: 'lauf-1', fehler: 'F5-Ablehnung (unbekannte_rolle)', zeitstempel: '2026-10-02T15:00:00.000Z' }]
  assert.deepStrictEqual(ordneLaufstandEin(null, { laufId: 'lauf-1', startfehler }), { art: 'nichtGestartet', grund: 'F5-Ablehnung (unbekannte_rolle)' })
  assert.deepStrictEqual(ordneLaufstandEin(null, { laufId: 'lauf-2', startfehler }), { art: 'wartet' })
  assert.deepStrictEqual(ordneLaufstandEin(null, { laufId: 'lauf-1', startfehler: null }), { art: 'wartet' })
})

test('Startfehler zu einem Lauf MIT Detail (z. B. Nachbereitung) ändert die Einordnung nicht', () => {
  const startfehler = [{ laufId: 'lauf-1', fehler: 'Nachbereitung fehlgeschlagen: x' }]
  assert.deepStrictEqual(ordneLaufstandEin({ aktiv: false, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }, { laufId: 'lauf-1', startfehler }), { art: 'erfolgreich' })
  assert.deepStrictEqual(ordneLaufstandEin({ aktiv: true, laufStatus: { status: 'KLAERUNG_ERFORDERLICH' } }, { laufId: 'lauf-1', startfehler }), { art: 'laeuft' })
})

test('nie gestartet ohne Grund im Detail: Grund aus dem Startfehler-Eintrag', () => {
  const detail = { aktiv: false, laufStatus: { status: 'NICHT_GESTARTET', terminaleOhneRunPrepared: [1] }, nichtGestartet: { ergebnis: 'VERWEIGERT', grund: null } }
  assert.deepStrictEqual(ordneLaufstandEin(detail, { laufId: 'lauf-1', startfehler: [{ laufId: 'lauf-1', fehler: GRUND }] }), { art: 'nichtGestartet', grund: GRUND })
})

test('Ersatz-Zeitgrenze entspricht startvorlagen/ai-workforce.json (Drift-Schutz)', () => {
  const vorlage = JSON.parse(readFileSync(new URL('../../startvorlagen/ai-workforce.json', import.meta.url), 'utf8'))
  assert.strictEqual(ERSATZ_ZEITGRENZE_MS, vorlage.zeitgrenzeMs)
})
