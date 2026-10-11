/**
 * Datei: public/leitstand/chat-laufstand.test.mjs
 *
 * Zweck: F-986 (b) — Zustandsabbildung des Chats für einen ausstehenden Lauf (chat-laufstand.js):
 * gestartet/laufend, erfolgreich, verweigert bzw. beendet, nie gestartet (mit und ohne Grund),
 * normale Lage direkt nach dem 202, Detail nicht abrufbar (mit und ohne Startfehler-Eintrag), Zeitgrenze.
 * F45 B0: wirksame Lauf-Zeitgrenze (laufZeitgrenzeMs vor Startvorlage), Chat-Modus eines laufenden Laufs
 * aus aktiverLauf (Übernahme nach Neuladen).
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { ERSATZ_ZEITGRENZE_MS, GRUND_SCHLUESSEL, ZEITGRENZE_PUFFER_MS, NACHLAUF_FENSTER_MS, chatModusDesAktivenLaufs, grundCodeDesEintrags, klartextDesEintrags, laufstandSignatur, ordneLaufstandEin, sperreDurchAnderenLauf, warteGrenzeMs, wirksameLaufZeitgrenzeMs, zeitgrenzeUeberschritten } from './chat-laufstand.js'
import de from './i18n/de.js'
import en from './i18n/en.js'
import ru from './i18n/ru.js'
import tr from './i18n/tr.js'

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

test('F45 B0: wirksame Zeitgrenze — laufZeitgrenzeMs vor startvorlageZeitgrenzeMs, sonst null', () => {
  assert.equal(wirksameLaufZeitgrenzeMs({ laufZeitgrenzeMs: 180000, startvorlageZeitgrenzeMs: 1800000 }), 180000)
  assert.equal(wirksameLaufZeitgrenzeMs({ startvorlageZeitgrenzeMs: 1800000 }), 1800000)
  assert.equal(wirksameLaufZeitgrenzeMs({ laufZeitgrenzeMs: null, startvorlageZeitgrenzeMs: null }), null)
  assert.equal(wirksameLaufZeitgrenzeMs(null), null)
  // Chat-Grenze 180 s: der Chat hört bei einem nicht aktiven, unveränderten Lauf nach 180 s + Puffer auf zu warten.
  assert.equal(warteGrenzeMs(wirksameLaufZeitgrenzeMs({ laufZeitgrenzeMs: 180000 })), 180000 + ZEITGRENZE_PUFFER_MS)
})

test('F45 B0: chatModusDesAktivenLaufs — Jarvis und Coach aus dem laufId-Präfix, sonst null', () => {
  assert.equal(chatModusDesAktivenLaufs({ aktiv: true, laufId: 'jarvis-jarvis-chat-1' }), 'jarvis')
  assert.equal(chatModusDesAktivenLaufs({ aktiv: true, laufId: 'product-coach-product-coach-sparring-1' }), 'sparring')
  assert.equal(chatModusDesAktivenLaufs({ aktiv: true, laufId: 'router-auftrag-1' }), null)
  assert.equal(chatModusDesAktivenLaufs({ aktiv: true, laufId: 'jarvis-adhoc-1' }), null)
  assert.equal(chatModusDesAktivenLaufs({ aktiv: false, laufId: 'jarvis-jarvis-chat-1' }), null)
  assert.equal(chatModusDesAktivenLaufs({ aktiv: true, laufId: null }), null)
  assert.equal(chatModusDesAktivenLaufs(undefined), null)
})

test('F45 P (F-1016 c): Grund-Code — fehler.code zuerst, sonst ein Grund in Code-Form, nie Fließtext', () => {
  assert.equal(grundCodeDesEintrags({ art: 'nicht_gestartet', grund: 'F6a-Ablehnung: Text', code: 'startfreigabe_abgelehnt' }), 'startfreigabe_abgelehnt')
  assert.equal(grundCodeDesEintrags({ art: 'nicht_erfolgreich', grund: 'beobachtungsbasis_unvollstaendig' }), 'beobachtungsbasis_unvollstaendig')
  assert.equal(grundCodeDesEintrags({ art: 'nicht_gestartet', grund: 'F6a-Ablehnung: Arbeitsverzeichnis weicht ab' }), null)
  assert.equal(grundCodeDesEintrags({ art: 'klaerung', grund: null, code: null }), null)
  assert.equal(grundCodeDesEintrags(null), null)
})

test('F45 P (F-1016 c): jeder bekannte Grund-Code hat einen Text in allen vier Sprachen, jeder Klassifikationscode ist bekannt', () => {
  for (const schluessel of Object.values(GRUND_SCHLUESSEL)) {
    for (const [sprache, woerter] of Object.entries({ de, en, tr, ru })) assert.equal(typeof woerter[schluessel], 'string', `${sprache}: ${schluessel}`)
  }
  for (const sprache of [de, en, tr, ru]) assert.match(sprache['chat.grund.unbekannt'], /{code}/)
  // Klassifikationscodes des Auswerters (src/result-evaluator): Drift-Schutz gegen einen neuen Code ohne Text.
  const auswerter = readFileSync(new URL('../../src/result-evaluator/index.ts', import.meta.url), 'utf8')
  const codes = new Set([...auswerter.matchAll(/grund: '([a-z_]+)'/g)].map((treffer) => treffer[1]))
  assert.ok(codes.size >= 8)
  for (const code of codes) assert.ok(Object.hasOwn(GRUND_SCHLUESSEL, code), `Klassifikationscode ohne Text: ${code}`)
})

test('F45 P (F-1016 c): Klartext nur, wenn der Grund kein Code ist', () => {
  assert.equal(klartextDesEintrags({ grund: 'F6a-Ablehnung: Arbeitsverzeichnis weicht ab' }), 'F6a-Ablehnung: Arbeitsverzeichnis weicht ab')
  assert.equal(klartextDesEintrags({ grund: 'timeout' }), null)
  assert.equal(klartextDesEintrags({ grund: '  ' }), null)
  assert.equal(klartextDesEintrags(null), null)
})

test('F45 P (F-1016 d): Sende-Sperre — anderer Modus lokal, aktiverLauf, Nachlauf-Fenster', () => {
  const jetzt = 1_000_000
  const frei = { jarvis: null, sparring: null }
  const basis = { ausstehend: frei, sendet: { jarvis: false, sparring: false }, kuerzlichBeendet: new Map(), jetzt }
  assert.equal(sperreDurchAnderenLauf({ aktiv: false, laufId: null }, basis, 'jarvis'), null)
  assert.equal(sperreDurchAnderenLauf(null, basis, 'jarvis'), null)
  // eigener ausstehender Lauf im angezeigten Modus: die bestehende Sperre („läuft“) greift, keine zweite
  assert.equal(sperreDurchAnderenLauf({ aktiv: true, laufId: 'jarvis-jarvis-chat-1' }, { ...basis, ausstehend: { jarvis: 'jarvis-jarvis-chat-1', sparring: null } }, 'jarvis'), null)
  // anderer Modus hat lokal einen Lauf oder sendet gerade: sofort „anderer Reiter“, ohne Poll
  assert.deepEqual(sperreDurchAnderenLauf(null, { ...basis, ausstehend: { jarvis: null, sparring: 'product-coach-product-coach-sparring-1' } }, 'jarvis'), { art: 'andererReiter', modus: 'sparring' })
  assert.deepEqual(sperreDurchAnderenLauf(null, { ...basis, sendet: { jarvis: true, sparring: false } }, 'sparring'), { art: 'andererReiter', modus: 'jarvis' })
  // aus dem Poll: Baulauf / anderes Projekt, laufId unbekannt
  assert.deepEqual(sperreDurchAnderenLauf({ aktiv: true, laufId: 'ausfuehrung-123' }, basis, 'jarvis'), { art: 'andererLauf' })
  assert.deepEqual(sperreDurchAnderenLauf({ aktiv: true, laufId: null }, basis, 'sparring'), { art: 'andererLauf' })
  // Chat-Lauf aus dem Poll, noch nicht übernommen (Neuladen): gleicher Modus „läuft“, anderer Modus „anderer Reiter“
  assert.deepEqual(sperreDurchAnderenLauf({ aktiv: true, laufId: 'jarvis-jarvis-chat-fremd' }, basis, 'jarvis'), { art: 'laeuft' })
  assert.deepEqual(sperreDurchAnderenLauf({ aktiv: true, laufId: 'jarvis-jarvis-chat-fremd' }, basis, 'sparring'), { art: 'andererReiter', modus: 'jarvis' })
  // eigener, eben beendeter Lauf: frei innerhalb des Nachlauf-Fensters, danach sperrt er wieder (z. B. nach Projektwechsel nicht geleert)
  const beendet = new Map([['jarvis-jarvis-chat-alt', jetzt - NACHLAUF_FENSTER_MS]])
  assert.equal(sperreDurchAnderenLauf({ aktiv: true, laufId: 'jarvis-jarvis-chat-alt' }, { ...basis, kuerzlichBeendet: beendet }, 'jarvis'), null)
  const alt = new Map([['jarvis-jarvis-chat-alt', jetzt - NACHLAUF_FENSTER_MS - 1]])
  assert.deepEqual(sperreDurchAnderenLauf({ aktiv: true, laufId: 'jarvis-jarvis-chat-alt' }, { ...basis, kuerzlichBeendet: alt }, 'jarvis'), { art: 'laeuft' })
})
