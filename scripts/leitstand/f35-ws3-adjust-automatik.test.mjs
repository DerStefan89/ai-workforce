/**
 * Datei: scripts/leitstand/f35-ws3-adjust-automatik.test.mjs
 *
 * Zweck: Testet die beiden reinen Funktionen aus
 * scripts/leitstand/f35-ws3-adjust-automatik.mjs (F35 WS-3, features/F35/
 * feature.md) isoliert — ohne HTTP-Server, ohne Kontrollzustand. Der
 * HTTP-Rundlauf inklusive wendeAutomatischeAnpassungAn/zaehleKernVersionen
 * ist scripts/check-f35-ws3-adjust-automatik.mjs vorbehalten (Muster
 * check-f35-ws2-urteil-je-ak.mjs: reine Funktionen hier isoliert, der
 * schreibende/D13-abhängige Teil nur am realen Aufrufpfad).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { baueAutomatischeAnpassungsBegruendung, ermittleAutomatischeAnpassung } from './f35-ws3-adjust-automatik.mjs'

const EIN_BEFUND = { schwere: 'HOCH', fundstelle: 'src/beispiel.ts:12', zusammenfassung: 'Fehlende Fehlerbehandlung beim Schreibpfad.' }

test('baueAutomatischeAnpassungsBegruendung: fester Kopf nennt Iteration und Review-Urteil', () => {
  const text = baueAutomatischeAnpassungsBegruendung('BLOCKIERT', [], [], 1)
  assert.ok(text.startsWith('Automatische Anpassung (Iteration 1 von max. 3) nach Review-Urteil BLOCKIERT:'))
})

test('baueAutomatischeAnpassungsBegruendung: ohne Befunde/AK-Verstöße bleibt der Kopf allein tragend, keine leeren Abschnitte', () => {
  const text = baueAutomatischeAnpassungsBegruendung('BLOCKIERT', [], [], 1)
  assert.ok(text.length > 0)
  assert.ok(!text.includes('Befunde:'))
  assert.ok(!text.includes('Verletzte Akzeptanzkriterien:'))
})

test('baueAutomatischeAnpassungsBegruendung: listet jeden Befund nummeriert mit Schwere/Fundstelle/Zusammenfassung', () => {
  const text = baueAutomatischeAnpassungsBegruendung('BLOCKIERT', [EIN_BEFUND], [], 2)
  assert.ok(text.includes('Iteration 2 von max. 3'))
  assert.ok(text.includes('1. [HOCH] src/beispiel.ts:12 — Fehlende Fehlerbehandlung beim Schreibpfad.'))
})

test('baueAutomatischeAnpassungsBegruendung: nennt AK-Verstöße wörtlich (tragen die AK-ID bereits selbst)', () => {
  const verstoss = "AK 'AK2': Urteil 'NICHT_ERFUELLT' ist nicht 'ERFUELLT'"
  const text = baueAutomatischeAnpassungsBegruendung('BEREIT', [], [verstoss], 1)
  assert.ok(text.includes('Verletzte Akzeptanzkriterien:'))
  assert.ok(text.includes(verstoss))
  assert.ok(text.includes('AK2'))
})

test('baueAutomatischeAnpassungsBegruendung: fehlendes Urteil wird als "unbekannt" benannt, nicht als "null"/"undefined"', () => {
  const text = baueAutomatischeAnpassungsBegruendung(null, [], [], 1)
  assert.ok(text.includes('Review-Urteil unbekannt:'))
})

test('ermittleAutomatischeAnpassung: löst NICHT aus, wenn output_schema nicht ergebnis-code-reviewer ist', () => {
  const ergebnis = ermittleAutomatischeAnpassung({ outputSchema: null, schrittStatus: 'ERFOLGREICH', heilbar: false, urteil: 'BLOCKIERT', akVerstoesse: [], anzahlBisherigerKernVersionen: 0 })
  assert.equal(ergebnis.ausloesen, false)
})

test('ermittleAutomatischeAnpassung: löst NICHT aus bei heilbar (kein auswertbares Ergebnis)', () => {
  const ergebnis = ermittleAutomatischeAnpassung({ outputSchema: 'ergebnis-code-reviewer', schrittStatus: 'ERFOLGREICH', heilbar: true, urteil: 'BLOCKIERT', akVerstoesse: [], anzahlBisherigerKernVersionen: 0 })
  assert.equal(ergebnis.ausloesen, false)
})

test('ermittleAutomatischeAnpassung: löst NICHT aus bei einem nicht-ERFOLGREICHEN Lauf', () => {
  const ergebnis = ermittleAutomatischeAnpassung({ outputSchema: 'ergebnis-code-reviewer', schrittStatus: 'FEHLGESCHLAGEN', heilbar: false, urteil: null, akVerstoesse: [], anzahlBisherigerKernVersionen: 0 })
  assert.equal(ergebnis.ausloesen, false)
})

test('ermittleAutomatischeAnpassung: löst AUS bei Urteil BLOCKIERT', () => {
  const ergebnis = ermittleAutomatischeAnpassung({ outputSchema: 'ergebnis-code-reviewer', schrittStatus: 'ERFOLGREICH', heilbar: false, urteil: 'BLOCKIERT', akVerstoesse: [], anzahlBisherigerKernVersionen: 0 })
  assert.equal(ergebnis.ausloesen, true)
})

test('ermittleAutomatischeAnpassung: löst AUS bei nicht-leeren AK-Verstößen, auch bei Urteil BEREIT', () => {
  const ergebnis = ermittleAutomatischeAnpassung({ outputSchema: 'ergebnis-code-reviewer', schrittStatus: 'ERFOLGREICH', heilbar: false, urteil: 'BEREIT', akVerstoesse: ["AK 'AK2': Beleg fehlt oder ist leer"], anzahlBisherigerKernVersionen: 0 })
  assert.equal(ergebnis.ausloesen, true)
})

test('ermittleAutomatischeAnpassung: löst NICHT aus bei einem Urteil außerhalb der drei bekannten Werte ohne AK-Verstöße (Regel 1b hält an, aber kein Auslöser)', () => {
  const ergebnis = ermittleAutomatischeAnpassung({ outputSchema: 'ergebnis-code-reviewer', schrittStatus: 'ERFOLGREICH', heilbar: false, urteil: 'UNKLAR', akVerstoesse: [], anzahlBisherigerKernVersionen: 0 })
  assert.equal(ergebnis.ausloesen, false)
})

test('ermittleAutomatischeAnpassung: löst NICHT aus, wenn die Grenze von 3 bisherigen automatischen Anpassungen bereits erreicht ist', () => {
  const ergebnis = ermittleAutomatischeAnpassung({ outputSchema: 'ergebnis-code-reviewer', schrittStatus: 'ERFOLGREICH', heilbar: false, urteil: 'BLOCKIERT', akVerstoesse: [], anzahlBisherigerKernVersionen: 3 })
  assert.equal(ergebnis.ausloesen, false)
})

test('ermittleAutomatischeAnpassung: löst AUS bei genau 2 bisherigen Versionen (3. Iteration ist noch erlaubt)', () => {
  const ergebnis = ermittleAutomatischeAnpassung({ outputSchema: 'ergebnis-code-reviewer', schrittStatus: 'ERFOLGREICH', heilbar: false, urteil: 'BLOCKIERT', akVerstoesse: [], anzahlBisherigerKernVersionen: 2 })
  assert.equal(ergebnis.ausloesen, true)
})
