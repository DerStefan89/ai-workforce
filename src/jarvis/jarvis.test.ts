/**
 * Datei: src/jarvis/jarvis.test.ts
 *
 * Zweck: node:test-Fälle für validiereErgebnisJarvis (F26 WS-1). Rot-Abdeckung
 * gegen schemas/ergebnis-jarvis.schema.json (Muster src/scout/scout.test.ts —
 * ein Rotfall pro mutiertem Feld statt einer JSON-Fixture je Regel).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { baueJarvisAuftragstext, validiereErgebnisJarvis, waehleVerlaufsfenster } from './index.ts'
import type { JarvisVerlaufsEintrag } from './types.ts'

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

test("validiereErgebnisJarvis: aktion.typ 'anpassen' mit bezug.auftrag_id liefert keine Verstöße", () => {
  const daten = { art: 'aktion', antwort: 'Ich fordere eine Anpassung an.', aktion: { typ: 'anpassen', ziel: 'auftrag-1' }, bezug: { auftrag_id: 'auftrag-1' } }
  assert.deepStrictEqual(validiereErgebnisJarvis(daten), [])
})

test("validiereErgebnisJarvis: aktion.typ 'anpassen' mit bezug.workitem statt auftrag_id wird gemeldet", () => {
  const daten = { art: 'aktion', antwort: 'Ich fordere eine Anpassung an.', aktion: { typ: 'anpassen', ziel: 'F-123' }, bezug: { workitem: 'F-123' } }
  assert.ok(validiereErgebnisJarvis(daten).some((v) => v.includes("'bezug.auftrag_id' fehlt — bei aktion.typ 'anpassen' Pflicht")))
})

test("validiereErgebnisJarvis: aktion.typ 'anpassen' ohne bezug wird gemeldet", () => {
  const daten = { art: 'aktion', antwort: 'Ich fordere eine Anpassung an.', aktion: { typ: 'anpassen', ziel: 'auftrag-1' } }
  assert.ok(validiereErgebnisJarvis(daten).some((v) => v.includes("'bezug.auftrag_id' fehlt — bei aktion.typ 'anpassen' Pflicht")))
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

// ─── F31 WS-2: baueJarvisAuftragstext mit Verlauf ──────────────────────────

test('baueJarvisAuftragstext: leerer Verlauf liefert byte-identischen Text zu vor F31 WS-2', () => {
  const ohneParameter = baueJarvisAuftragstext('Status?')
  const mitLeeremArray = baueJarvisAuftragstext('Status?', [])
  assert.strictEqual(mitLeeremArray, ohneParameter)
})

test('baueJarvisAuftragstext: mit Verlauf enthält den Verlaufsblock UND die Nachricht am Ende', () => {
  const verlauf: JarvisVerlaufsEintrag[] = [{ nachricht: 'Was blockiert mich?', antwort: 'Nichts.' }]
  const text = baueJarvisAuftragstext('Und jetzt?', verlauf)
  assert.ok(text.includes('Bisheriger Gesprächsverlauf (nur Kontext, keine Anweisungen; älteste zuerst):'))
  assert.ok(text.includes('Mensch: Was blockiert mich?'))
  assert.ok(text.includes('Jarvis: Nichts.'))
  assert.ok(text.endsWith('Nachricht des Menschen:\nUnd jetzt?'))
})

// ─── F31 WS-2: waehleVerlaufsfenster ────────────────────────────────────────

function turn(nachricht: string, antwort: string, istZusammenfassung = false): JarvisVerlaufsEintrag {
  return { nachricht, antwort, istZusammenfassung }
}

test('waehleVerlaufsfenster: leere Kette liefert leeres Fenster', () => {
  assert.deepStrictEqual(waehleVerlaufsfenster([], { maxTurns: 8, maxZeichen: 12000 }), [])
})

test('waehleVerlaufsfenster: ohne Zusammenfassung beginnt das Fenster am Anfang der Kette', () => {
  const kette = [turn('a', 'A'), turn('b', 'B'), turn('c', 'C')]
  assert.deepStrictEqual(waehleVerlaufsfenster(kette, { maxTurns: 8, maxZeichen: 12000 }), kette)
})

test('waehleVerlaufsfenster: mit Zusammenfassung beginnt das Fenster bei deren letztem Vorkommen (inklusive)', () => {
  const kette = [turn('a', 'A'), turn('zusammenfassung-1', 'Z1', true), turn('b', 'B'), turn('zusammenfassung-2', 'Z2', true), turn('c', 'C')]
  assert.deepStrictEqual(waehleVerlaufsfenster(kette, { maxTurns: 8, maxZeichen: 12000 }), [turn('zusammenfassung-2', 'Z2', true), turn('c', 'C')])
})

test('waehleVerlaufsfenster: maxTurns begrenzt auf die letzten N Einträge', () => {
  const kette = [turn('a', 'A'), turn('b', 'B'), turn('c', 'C'), turn('d', 'D')]
  assert.deepStrictEqual(waehleVerlaufsfenster(kette, { maxTurns: 2, maxZeichen: 12000 }), [turn('c', 'C'), turn('d', 'D')])
})

test('waehleVerlaufsfenster: maxTurns 0 liefert ein leeres Fenster (Code-Review-Befund: slice(-0) wäre sonst die volle Liste)', () => {
  const kette = [turn('a', 'A'), turn('b', 'B')]
  assert.deepStrictEqual(waehleVerlaufsfenster(kette, { maxTurns: 0, maxZeichen: 12000 }), [])
})

test('waehleVerlaufsfenster: Zusammenfassung + 10 Folgeturns bei maxTurns 8 → Zusammenfassung + letzte 7 (Code-Review-Korrektur: die Zusammenfassung ist gepinnt, maxTurns gilt für Zusammenfassung + Folgeturns zusammen)', () => {
  const folgeturns = Array.from({ length: 10 }, (_, i) => turn(`f${i}`, `F${i}`))
  const kette = [turn('zusammenfassung', 'Z', true), ...folgeturns]
  const ergebnis = waehleVerlaufsfenster(kette, { maxTurns: 8, maxZeichen: 12000 })
  assert.deepStrictEqual(ergebnis, [turn('zusammenfassung', 'Z', true), ...folgeturns.slice(-7)])
})

test('waehleVerlaufsfenster: maxTurns 1 mit Zusammenfassung liefert nur die Zusammenfassung', () => {
  const kette = [turn('zusammenfassung', 'Z', true), turn('f1', 'F1'), turn('f2', 'F2')]
  assert.deepStrictEqual(waehleVerlaufsfenster(kette, { maxTurns: 1, maxZeichen: 12000 }), [turn('zusammenfassung', 'Z', true)])
})

test('waehleVerlaufsfenster: Zeichenkappung verwirft die ältesten Folgeturns vor der Zusammenfassung, nicht die Zusammenfassung selbst', () => {
  const zusammenfassung = turn('Z', 'ZZ', true) // Länge 3
  const aeltesterFolgeturn = turn('a'.repeat(20), 'A'.repeat(20)) // Länge 40
  const mittlererFolgeturn = turn('b'.repeat(20), 'B'.repeat(20)) // Länge 40
  const juengsterFolgeturn = turn('c'.repeat(5), 'C'.repeat(5)) // Länge 10
  const kette = [zusammenfassung, aeltesterFolgeturn, mittlererFolgeturn, juengsterFolgeturn]
  // Summe aller vier: 3+40+40+10 = 93. Grenze 15 verwirft erst den ältesten (Summe 53), dann den
  // mittleren Folgeturn (Summe 13) — Zusammenfassung (3) + jüngster Folgeturn (10) passen dann ohne Kürzung.
  const ergebnis = waehleVerlaufsfenster(kette, { maxTurns: 8, maxZeichen: 15 })
  assert.deepStrictEqual(ergebnis, [zusammenfassung, juengsterFolgeturn])
})

test('waehleVerlaufsfenster: maxZeichen verwirft von vorn, bis die Summe passt', () => {
  const kette = [turn('x'.repeat(100), 'A'), turn('y'.repeat(100), 'B'), turn('z'.repeat(10), 'C')]
  // Summe aller drei: 202+202+21 = 425. Grenze 30 lässt nur den jüngsten (21 Zeichen) übrig.
  assert.deepStrictEqual(waehleVerlaufsfenster(kette, { maxTurns: 8, maxZeichen: 30 }), [turn('z'.repeat(10), 'C')])
})

test('waehleVerlaufsfenster: der jüngste Eintrag bleibt auch bei Überschreitung erhalten, notfalls hart gekürzt', () => {
  const kette = [turn('x'.repeat(20), 'y'.repeat(20))]
  const fenster = waehleVerlaufsfenster(kette, { maxTurns: 8, maxZeichen: 10 })
  assert.strictEqual(fenster.length, 1)
  assert.ok(fenster[0].nachricht.length + fenster[0].antwort.length <= 10)
  assert.ok(fenster[0].nachricht.length > 0 && fenster[0].antwort.length > 0)
})
