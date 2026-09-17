/**
 * Datei: src/jarvis/jarvis.test.ts
 *
 * Zweck: node:test-Fälle für validiereErgebnisJarvis (F26 WS-1). Rot-Abdeckung
 * gegen schemas/ergebnis-jarvis.schema.json (Muster src/scout/scout.test.ts —
 * ein Rotfall pro mutiertem Feld statt einer JSON-Fixture je Regel).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { baueJarvisAuftragstext, validiereErgebnisJarvis } from './index.ts'

function antwortErgebnis(): Record<string, unknown> {
  return { art: 'antwort', antwort: 'Nichts blockiert aktuell.' }
}

function auftragVorschlagErgebnis(): Record<string, unknown> {
  return {
    art: 'auftrag_vorschlag',
    antwort: 'Ich schlage vor, F-123 zu beheben.',
    auftrag: { titel: 'F-123 beheben', text: 'Der Findings-Eintrag F-123 beschreibt ...' },
  }
}

function aktionErgebnis(): Record<string, unknown> {
  return {
    art: 'aktion',
    antwort: 'Ich öffne das Workboard für dich.',
    aktion: { typ: 'oeffnen', ziel: '#/workboard' },
  }
}

test('validiereErgebnisJarvis: gültiges antwort-Ergebnis liefert keine Verstöße', () => {
  assert.deepStrictEqual(validiereErgebnisJarvis(antwortErgebnis()), [])
})

test('validiereErgebnisJarvis: gültiges auftrag_vorschlag-Ergebnis liefert keine Verstöße', () => {
  assert.deepStrictEqual(validiereErgebnisJarvis(auftragVorschlagErgebnis()), [])
})

test('validiereErgebnisJarvis: gültiges aktion-Ergebnis liefert keine Verstöße', () => {
  assert.deepStrictEqual(validiereErgebnisJarvis(aktionErgebnis()), [])
})

test('validiereErgebnisJarvis: gültiger bezug (auftrag_id) liefert keine Verstöße', () => {
  assert.deepStrictEqual(validiereErgebnisJarvis({ ...antwortErgebnis(), bezug: { auftrag_id: 'auftrag-1' } }), [])
})

test('validiereErgebnisJarvis: gültiger bezug (workitem) liefert keine Verstöße', () => {
  assert.deepStrictEqual(validiereErgebnisJarvis({ ...antwortErgebnis(), bezug: { workitem: 'F-123' } }), [])
})

test('validiereErgebnisJarvis: Wurzel muss ein Objekt sein', () => {
  assert.deepStrictEqual(validiereErgebnisJarvis(null), ['Wurzel ist kein Objekt'])
  assert.deepStrictEqual(validiereErgebnisJarvis([1, 2]), ['Wurzel ist kein Objekt'])
  assert.deepStrictEqual(validiereErgebnisJarvis('text'), ['Wurzel ist kein Objekt'])
})

test('validiereErgebnisJarvis: unbekanntes Top-Level-Feld wird gemeldet', () => {
  const verstoesse = validiereErgebnisJarvis({ ...antwortErgebnis(), zusatz: 'x' })
  assert.ok(verstoesse.some((v) => v.includes("unbekanntes Feld 'zusatz'")))
})

for (const feld of ['art', 'antwort']) {
  test(`validiereErgebnisJarvis: fehlendes Pflichtfeld '${feld}' wird gemeldet`, () => {
    const daten = antwortErgebnis()
    delete daten[feld]
    assert.ok(validiereErgebnisJarvis(daten).some((v) => v.includes(`Pflichtfeld '${feld}' fehlt`)))
  })
}

test("validiereErgebnisJarvis: 'art' muss aus der Enum-Menge sein", () => {
  assert.ok(validiereErgebnisJarvis({ ...antwortErgebnis(), art: 'unbekannt' }).some((v) => v.includes("'art' muss einer von")))
})

test("validiereErgebnisJarvis: 'antwort' muss ein nicht-leerer String sein", () => {
  assert.ok(validiereErgebnisJarvis({ ...antwortErgebnis(), antwort: '' }).some((v) => v.includes("'antwort' muss ein nicht-leerer String sein")))
})

test("validiereErgebnisJarvis: 'auftrag' ohne 'titel' oder 'text' wird gemeldet", () => {
  const daten = auftragVorschlagErgebnis()
  delete (daten.auftrag as Record<string, unknown>).titel
  assert.ok(validiereErgebnisJarvis(daten).some((v) => v.includes("'auftrag.titel' fehlt")))
})

test("validiereErgebnisJarvis: 'auftrag' mit unbekanntem Feld wird gemeldet", () => {
  const daten = auftragVorschlagErgebnis()
  ;(daten.auftrag as Record<string, unknown>).zusatz = 'x'
  assert.ok(validiereErgebnisJarvis(daten).some((v) => v.includes("'auftrag' trägt unbekanntes Feld 'zusatz'")))
})

test("validiereErgebnisJarvis: 'auftrag' muss ein Objekt sein", () => {
  assert.ok(validiereErgebnisJarvis({ ...antwortErgebnis(), auftrag: 'text' }).some((v) => v.includes("'auftrag' muss ein Objekt sein")))
})

test("validiereErgebnisJarvis: 'aktion.typ' muss aus der Enum-Menge sein", () => {
  const daten = aktionErgebnis()
  ;(daten.aktion as Record<string, unknown>).typ = 'springen'
  assert.ok(validiereErgebnisJarvis(daten).some((v) => v.includes("'aktion.typ' muss einer von")))
})

test("validiereErgebnisJarvis: 'aktion' ohne 'ziel' wird gemeldet", () => {
  const daten = aktionErgebnis()
  delete (daten.aktion as Record<string, unknown>).ziel
  assert.ok(validiereErgebnisJarvis(daten).some((v) => v.includes("'aktion.ziel' fehlt")))
})

test("validiereErgebnisJarvis: 'aktion' muss ein Objekt sein", () => {
  assert.ok(validiereErgebnisJarvis({ ...antwortErgebnis(), aktion: 'text' }).some((v) => v.includes("'aktion' muss ein Objekt sein")))
})

test("validiereErgebnisJarvis: 'bezug' mit beiden Feldern zugleich wird gemeldet", () => {
  const daten = { ...antwortErgebnis(), bezug: { auftrag_id: 'a', workitem: 'F-1' } }
  assert.ok(validiereErgebnisJarvis(daten).some((v) => v.includes("'bezug' muss genau eines von 'auftrag_id' oder 'workitem' tragen")))
})

test("validiereErgebnisJarvis: 'bezug' ohne eines der beiden Felder wird gemeldet", () => {
  const daten = { ...antwortErgebnis(), bezug: {} }
  assert.ok(validiereErgebnisJarvis(daten).some((v) => v.includes("'bezug' muss genau eines von 'auftrag_id' oder 'workitem' tragen")))
})

test("validiereErgebnisJarvis: 'bezug' mit unbekanntem Feld wird gemeldet", () => {
  const daten = { ...antwortErgebnis(), bezug: { auftrag_id: 'a', zusatz: 'x' } }
  assert.ok(validiereErgebnisJarvis(daten).some((v) => v.includes("'bezug' trägt unbekanntes Feld 'zusatz'")))
})

test("validiereErgebnisJarvis: 'bezug' muss ein Objekt sein", () => {
  assert.ok(validiereErgebnisJarvis({ ...antwortErgebnis(), bezug: 'text' }).some((v) => v.includes("'bezug' muss ein Objekt sein")))
})

test("validiereErgebnisJarvis: art 'auftrag_vorschlag' ohne 'auftrag' wird gemeldet (QA-Befund WS-1)", () => {
  assert.ok(validiereErgebnisJarvis({ art: 'auftrag_vorschlag', antwort: 'Ich schlage einen Auftrag vor.' }).some((v) => v.includes("'auftrag' fehlt — bei art 'auftrag_vorschlag' Pflicht")))
})

test("validiereErgebnisJarvis: art 'aktion' ohne 'aktion' wird gemeldet (QA-Befund WS-1)", () => {
  assert.ok(validiereErgebnisJarvis({ art: 'aktion', antwort: 'Ich öffne das Workboard.' }).some((v) => v.includes("'aktion' fehlt — bei art 'aktion' Pflicht")))
})

test('baueJarvisAuftragstext: enthält die Nutzer-Nachricht wörtlich am Ende', () => {
  const text = baueJarvisAuftragstext('Was blockiert mich gerade?')
  assert.ok(text.endsWith('Was blockiert mich gerade?'))
})

test('baueJarvisAuftragstext: nennt alle drei art-Enum-Werte und verbietet Codezäune', () => {
  const text = baueJarvisAuftragstext('Status?')
  for (const wert of ['antwort', 'auftrag_vorschlag', 'aktion']) {
    assert.ok(text.includes(wert), `Enum-Wert '${wert}' sollte im Prompt genannt sein`)
  }
  assert.ok(/[Kk]ein[en]?\s+(Markdown|Codezaun)/.test(text) || text.includes('kein Codezaun'))
})
