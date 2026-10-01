/**
 * Datei: public/leitstand/nutzung-daten.test.mjs
 *
 * Zweck: node:test für die reine Aggregation der Seite „Nutzung“ (nutzung-daten.js, F44 WS-6b):
 * Kennzahlen („mit Nutzungsdaten“ = Läufe − ohne Beobachtung), Summen „Gelesen“ inklusive Cache,
 * relative Balken, Gruppierung nach Rolle + Worker (Modelle je Zeile, null als eigene Gruppe) und nach
 * Modell, defensive Eingaben (F-603).
 *
 * Wird aufgerufen von: npm run check (node --test)
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { balkenBreiten, kennzahlen, nachModell, nachRolleUndWorker, verarbeitet } from './nutzung-daten.js'

/** Gruppe wie GET …/verbrauch sie liefert. */
const gruppe = (rolle, worker, modell, anzahlLaeufe, ohneBeobachtung, [ein, aus, cacheLesen, cacheSchreiben] = [0, 0, 0, 0]) => ({
  rolle,
  worker,
  modell,
  auftragId: 'a',
  anzahlLaeufe,
  ohneBeobachtung,
  verbrauch: { inputTokens: ein, outputTokens: aus, cacheReadTokens: cacheLesen, cacheWriteTokens: cacheSchreiben, dauerMs: 1 },
})

const GRUPPEN = [
  gruppe('ausfuehrung', 'claude-code', 'claude-sonnet', 3, 1, [100, 40, 1000, 200]),
  gruppe('ausfuehrung', 'claude-code', null, 1, 1),
  gruppe('code-reviewer', 'codex', 'gpt-5', 2, 0, [50, 10, 0, 0]),
  gruppe(null, 'claude-code', 'claude-sonnet', 1, 0, [5, 5, 5, 5]),
  gruppe('ausfuehrung', 'claude-code', 'claude-sonnet', 2, 0, [10, 10, 10, 10]),
]

test('kennzahlen: Ausführungen, mit Nutzungsdaten = Läufe − ohne Beobachtung, nicht erfasst; nie negativ', () => {
  assert.deepEqual(kennzahlen({ laeufeGesamt: 28, ohneBeobachtungGesamt: 4 }), { ausfuehrungen: 28, mitNutzungsdaten: 24, nichtErfasst: 4 })
  assert.deepEqual(kennzahlen({ laeufeGesamt: 0, ohneBeobachtungGesamt: 0 }), { ausfuehrungen: 0, mitNutzungsdaten: 0, nichtErfasst: 0 })
  assert.deepEqual(kennzahlen({ laeufeGesamt: 1, ohneBeobachtungGesamt: 3 }).mitNutzungsdaten, 0)
  assert.deepEqual(kennzahlen(null), { ausfuehrungen: 0, mitNutzungsdaten: 0, nichtErfasst: 0 })
  assert.deepEqual(kennzahlen({ laeufeGesamt: '5', ohneBeobachtungGesamt: Number.NaN }), { ausfuehrungen: 0, mitNutzungsdaten: 0, nichtErfasst: 0 })
})

test('verarbeitet: Gelesen = Eingabe + Cache gelesen + Cache geschrieben, davon aus dem Zwischenspeicher = Cache gelesen', () => {
  const summe = verarbeitet(GRUPPEN)
  assert.equal(summe.eingabe, 165)
  assert.equal(summe.cacheGelesen, 1015)
  assert.equal(summe.cacheGeschrieben, 215)
  assert.equal(summe.gelesen, 165 + 1015 + 215)
  assert.equal(summe.ausZwischenspeicher, 1015)
  assert.equal(summe.erzeugt, 65)
})

test('verarbeitet und Gruppierungen sind defensiv (F-603): Nicht-Array, null-Einträge, fehlender verbrauch', () => {
  for (const kaputt of [undefined, null, 'x', { a: 1 }]) {
    assert.deepEqual(verarbeitet(kaputt), { eingabe: 0, cacheGelesen: 0, cacheGeschrieben: 0, erzeugt: 0, gelesen: 0, ausZwischenspeicher: 0 })
    assert.deepEqual(nachRolleUndWorker(kaputt), [])
    assert.deepEqual(nachModell(kaputt), [])
  }
  const mitLuecken = [null, { rolle: 'qa', worker: 'claude-code', modell: 'm', anzahlLaeufe: 2, ohneBeobachtung: 2 }]
  assert.equal(verarbeitet(mitLuecken).gelesen, 0)
  assert.deepEqual(nachRolleUndWorker(mitLuecken), [{ rolle: 'qa', worker: 'claude-code', modelle: ['m'], anzahlLaeufe: 2, ohneBeobachtung: 2, eingabe: 0, ausgabe: 0, cacheGelesen: 0, cacheGeschrieben: 0 }])
})

test('balkenBreiten: nur relativ zueinander, größerer Wert voll, beide 0 → 0, ein Wert über 0 mindestens 1 %', () => {
  assert.deepEqual(balkenBreiten(1000000, 1), [100, 1])
  assert.deepEqual(balkenBreiten(1260000, 284000), [100, 23])
  assert.deepEqual(balkenBreiten(10, 40), [25, 100])
  assert.deepEqual(balkenBreiten(5, 5), [100, 100])
  assert.deepEqual(balkenBreiten(0, 0), [0, 0])
  assert.deepEqual(balkenBreiten(0, 7), [0, 100])
})

test('nachRolleUndWorker: je Paar eine Zeile, Modelle je Zeile (null = unbekannt), Cache getrennt, sortiert nach Läufen', () => {
  const zeilen = nachRolleUndWorker(GRUPPEN)
  assert.deepEqual(
    zeilen.map((z) => [z.rolle, z.worker, z.modelle, z.anzahlLaeufe, z.ohneBeobachtung]),
    [
      ['ausfuehrung', 'claude-code', ['claude-sonnet', null], 6, 2],
      ['code-reviewer', 'codex', ['gpt-5'], 2, 0],
      [null, 'claude-code', ['claude-sonnet'], 1, 0],
    ]
  )
  const [erste] = zeilen
  assert.deepEqual([erste.eingabe, erste.ausgabe, erste.cacheGelesen, erste.cacheGeschrieben], [110, 50, 1010, 210])
})

test('nachModell: null bleibt eigene Gruppe, nicht mit dem Text „null“ vermischt', () => {
  const zeilen = nachModell([...GRUPPEN, gruppe('qa', 'claude-code', 'null', 1, 0)])
  assert.deepEqual(
    zeilen.map((z) => [z.modell, z.anzahlLaeufe]),
    [
      ['claude-sonnet', 6],
      ['gpt-5', 2],
      [null, 1],
      ['null', 1],
    ]
  )
})
