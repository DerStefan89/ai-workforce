/**
 * Datei: src/feature-auftrag/ist-nach-abnahme.test.ts
 *
 * Zweck: node:test für F45 B5b-3 „Ist nach Abnahme“ (R7) — schreibeIstNachAbnahme: eindeutige Zeile ⇒ geschrieben (Status,
 * Ist, Begonnen, Abgenommen, Änderungszeile), 0 und 2 laufende Zeilen ⇒ Hinweis mit Anzahl, CRLF ⇒ Hinweis, zweiter Aufruf ⇒
 * schon_geschrieben, Begonnen-Ersatz, Ist 0 ⇒ „–“, Begonnen nach dem Abnahmetag ⇒ Hinweis, abgeschlossenes Feature ⇒ Hinweis.
 *
 * Wird aufgerufen von: `npm test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { lesePlanung } from '../workboard/feature-planung.ts'
import { schreibeIstNachAbnahme } from './ist-nach-abnahme.ts'

/** Akte mit den angegebenen Tabellenzeilen. @param zeilen - Workstream-Zeilen @param status - Feature-Status @returns Text */
const akte = (zeilen: string[], status = 'IN_ARBEIT') =>
  [
    '# F3 — Gate',
    '',
    '## Status',
    `Status: ${status}`,
    '',
    '## Ziel',
    'Ziel.',
    '',
    '## Workstreams',
    '',
    '| ID | Art | Titel | Status | Schätzung AT | Ist AT | Begonnen | Abgenommen | Notiz |',
    '|---|---|---|---|---|---|---|---|---|',
    ...zeilen,
    '',
    '## Änderungen',
    '- 2026-10-01 · Ziel · alt',
    '',
  ].join('\n')

const A_LAEUFT = '| A | workstream | Eins | laeuft | 0,3 | – | 2026-10-21 | – | n |'
const B_GEPLANT = '| B | fixpaket | Zwei | geplant | – | – | – | – | |'
const EINGABE = { workflowId: 'wf-1', datum: '2026-10-27', begonnenErsatz: '2026-10-26' }

test('eindeutige laufende Zeile ⇒ erledigt, Ist in Arbeitstagen, Abgenommen, Änderungszeile', () => {
  const ergebnis = schreibeIstNachAbnahme(akte([A_LAEUFT, B_GEPLANT]), EINGABE)
  assert.equal(ergebnis.art, 'geschrieben')
  if (ergebnis.art !== 'geschrieben') return
  // Mi 21.10. → Di 27.10. ohne Starttag: Do, Fr, Mo, Di = 4
  assert.equal(ergebnis.ist, 4)
  assert.equal(ergebnis.workstream, 'A')
  assert.ok(ergebnis.inhalt.includes('| A | workstream | Eins | erledigt | 0,3 | 4 | 2026-10-21 | 2026-10-27 | n |'))
  assert.ok(ergebnis.inhalt.includes(B_GEPLANT), 'andere Zeilen bleiben bytegleich')
  assert.ok(ergebnis.inhalt.includes('- 2026-10-01 · Ziel · alt\n- 2026-10-27 · Workstream A erledigt, Ist 4 AT · Abnahme wf-1\n'))
  assert.equal(lesePlanung(ergebnis.inhalt).befunde.length, 0)
})

test('zweiter Aufruf mit derselben Ablauf-ID schreibt nicht doppelt; eine andere ID mit Präfix zählt nicht', () => {
  const erste = schreibeIstNachAbnahme(akte([A_LAEUFT]), EINGABE)
  assert.equal(erste.art, 'geschrieben')
  if (erste.art !== 'geschrieben') return
  assert.deepEqual(schreibeIstNachAbnahme(erste.inhalt, EINGABE), { art: 'schon_geschrieben' })
  const andere = schreibeIstNachAbnahme(erste.inhalt, { ...EINGABE, workflowId: 'wf' })
  assert.deepEqual(andere, { art: 'hinweis', grund: 'Keine Workstream-Zeile steht auf „laeuft“ (vor dem Start setzen und committen) — von Hand nachtragen' })
})

test('0 und 2 laufende Zeilen ⇒ Hinweis mit Anzahl, nichts geschrieben', () => {
  assert.deepEqual(schreibeIstNachAbnahme(akte([B_GEPLANT]), EINGABE), { art: 'hinweis', grund: 'Keine Workstream-Zeile steht auf „laeuft“ (vor dem Start setzen und committen) — von Hand nachtragen' })
  const zwei = schreibeIstNachAbnahme(akte([A_LAEUFT, '| C | workstream | Drei | laeuft | – | – | – | – | |']), EINGABE)
  assert.deepEqual(zwei, { art: 'hinweis', grund: 'Workstream nicht eindeutig (2 laufende Zeilen) — von Hand nachtragen' })
})

test('CRLF ⇒ Hinweis, nichts geschrieben', () => {
  const ergebnis = schreibeIstNachAbnahme(akte([A_LAEUFT]).replace(/\n/g, '\r\n'), EINGABE)
  assert.equal(ergebnis.art, 'hinweis')
  assert.match(ergebnis.art === 'hinweis' ? ergebnis.grund : '', /CRLF/)
})

test('Begonnen leer ⇒ Ersatz aus der Anlage des Ablaufs, Herkunft in der Änderungszeile', () => {
  const ergebnis = schreibeIstNachAbnahme(akte(['| A | workstream | Eins | laeuft | – | – | – | – | |']), EINGABE)
  assert.equal(ergebnis.art, 'geschrieben')
  if (ergebnis.art !== 'geschrieben') return
  assert.equal(ergebnis.ist, 1)
  assert.ok(ergebnis.inhalt.includes('| A | workstream | Eins | erledigt | – | 1 | 2026-10-26 | 2026-10-27 | |'))
  assert.ok(ergebnis.inhalt.includes('Workstream A erledigt, Ist 1 AT, Begonnen aus der Anlage des Ablaufs · Abnahme wf-1'))
})

test('Begonnen leer und kein Ersatz ⇒ Begonnen und Ist „–“; Ist 0 am selben Tag ⇒ „–“ (A3)', () => {
  const ohne = schreibeIstNachAbnahme(akte(['| A | workstream | Eins | laeuft | – | – | – | – | |']), { ...EINGABE, begonnenErsatz: null })
  assert.equal(ohne.art, 'geschrieben')
  if (ohne.art === 'geschrieben') assert.ok(ohne.inhalt.includes('| A | workstream | Eins | erledigt | – | – | – | 2026-10-27 | |'))
  const gleicherTag = schreibeIstNachAbnahme(akte(['| A | workstream | Eins | laeuft | – | – | 2026-10-27 | – | |']), EINGABE)
  assert.equal(gleicherTag.art, 'geschrieben')
  if (gleicherTag.art !== 'geschrieben') return
  assert.equal(gleicherTag.ist, null)
  assert.ok(gleicherTag.inhalt.includes('Workstream A erledigt, Ist – AT · Abnahme wf-1'))
})

test('Begonnen nach dem Abnahmetag ⇒ Hinweis (Advisor A1)', () => {
  const ergebnis = schreibeIstNachAbnahme(akte(['| A | workstream | Eins | laeuft | – | – | 2026-10-28 | – | |']), EINGABE)
  assert.equal(ergebnis.art, 'hinweis')
})

test('Akte ohne „## Änderungen“ ⇒ Abschnitt wird am Ende angelegt (qa 4)', () => {
  const ohne = akte([A_LAEUFT]).replace('\n## Änderungen\n- 2026-10-01 · Ziel · alt\n', '')
  const ergebnis = schreibeIstNachAbnahme(ohne, EINGABE)
  assert.equal(ergebnis.art, 'geschrieben')
  if (ergebnis.art === 'geschrieben') assert.ok(ergebnis.inhalt.endsWith('\n## Änderungen\n- 2026-10-27 · Workstream A erledigt, Ist 4 AT · Abnahme wf-1\n'), ergebnis.inhalt)
})

test('abgeschlossenes Feature, Prosa-Abschnitt und Formfehler ⇒ Hinweis', () => {
  assert.equal(schreibeIstNachAbnahme(akte([A_LAEUFT], 'ABGESCHLOSSEN'), EINGABE).art, 'hinweis')
  assert.equal(schreibeIstNachAbnahme(akte([A_LAEUFT]).replace(/\| ID \|[\s\S]*?\n\n/, '- A läuft\n\n'), EINGABE).art, 'hinweis')
  assert.equal(schreibeIstNachAbnahme(akte([A_LAEUFT, '| X | unbekannt | Y | laeuft | – | – | – | – | |']), EINGABE).art, 'hinweis')
})
