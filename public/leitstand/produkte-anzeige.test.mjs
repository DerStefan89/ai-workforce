/**
 * Datei: public/leitstand/produkte-anzeige.test.mjs
 *
 * Zweck: node:test für die reinen Regeln der Seite „Alle Produkte“ (produkte-anzeige.js, F44 WS-6a):
 * ID-Ableitung aus dem Produktnamen, Ring-Summe über alle Meilensteine (zaehleRoadmap), Statuschip
 * und Hinweis (kartenLage), Kennzahlen aus Roadmap bzw. Zustand und offenen Workitems und der
 * Vorschau-Kurzstand der Technik-Klappe (F-849).
 *
 * Wird aufgerufen von: npm run check (node --test)
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { entscheidungsKennzahl, kartenLage, leiteProjektIdAb, PROJEKT_ID_MAX, roadmapKennzahlen, vorschauKurzstand } from './produkte-anzeige.js'
import { zaehleRoadmap } from './roadmap-anzeige.js'

/** Muster des Servers für NEUE Projekt-IDs (src/projekt-anlegen/index.ts NEUE_PROJEKT_ID_MUSTER). */
const ID_MUSTER = /^[a-z0-9][a-z0-9-]{1,40}$/

test('leiteProjektIdAb: Kleinbuchstaben, Umlaute, Trenner, Ränder', () => {
  assert.equal(leiteProjektIdAb('Mein Haushaltsbuch'), 'mein-haushaltsbuch')
  assert.equal(leiteProjektIdAb('Größe & Übersicht'), 'groesse-uebersicht')
  assert.equal(leiteProjektIdAb('ÄÖÜ äöü ß'), 'aeoeue-aeoeue-ss')
  assert.equal(leiteProjektIdAb('  --Ai   Workforce 2.0!--  '), 'ai-workforce-2-0')
  assert.equal(leiteProjektIdAb('a__b//c'), 'a-b-c')
  assert.equal(leiteProjektIdAb('F44'), 'f44')
})

test('leiteProjektIdAb: Akzente lesbar (tr, fr), ı → i', () => {
  assert.equal(leiteProjektIdAb('Çalışma Planı'), 'calisma-plani')
  assert.equal(leiteProjektIdAb('Café Crème'), 'cafe-creme')
  assert.equal(leiteProjektIdAb('Şeker Ğ'), 'seker-g')
})

test('leiteProjektIdAb: ohne lateinische Zeichen oder kürzer als 2 Zeichen leer, kein Wurf bei Nicht-Strings', () => {
  assert.equal(leiteProjektIdAb('X'), '')
  assert.equal(leiteProjektIdAb('7 !'), '')
  assert.equal(leiteProjektIdAb('X1'), 'x1')
  assert.equal(leiteProjektIdAb('Домашний бюджет'), '')
  assert.equal(leiteProjektIdAb('---'), '')
  assert.equal(leiteProjektIdAb(''), '')
  assert.equal(leiteProjektIdAb(undefined), '')
  assert.equal(leiteProjektIdAb(42), '')
})

test('leiteProjektIdAb: Ergebnis passt immer zum Servermuster für neue Projekte (2–41 Zeichen)', () => {
  const lang = leiteProjektIdAb(`${'abcdefghij '.repeat(6)}ende`)
  assert.ok(lang.length <= PROJEKT_ID_MAX, lang)
  assert.ok(!lang.endsWith('-'), lang)
  for (const name of ['Mein Haushaltsbuch', 'Größe & Übersicht', `${'x'.repeat(40)} y`, 'Çalışma Planı', '1. Versuch', 'ab', `${'z'.repeat(60)}`]) {
    const id = leiteProjektIdAb(name)
    assert.match(id, ID_MUSTER, name)
  }
})

/** Baut eine gültige Projektion aus Meilensteinen mit Featurestatus-Listen. */
function roadmap(...meilensteine) {
  return { status: 'ok', vision: 'Ein Ziel', meilensteine: meilensteine.map((status, i) => ({ id: `M${i + 1}`, titel: `M${i + 1}`, status: 'GEPLANT', features: status.map((s, j) => ({ id: `F${i}${j}`, status: s })) })) }
}

test('zaehleRoadmap: Summe abgenommen/gesamt über ALLE Meilensteine, 0/0 ohne gültige Projektion', () => {
  assert.deepEqual(zaehleRoadmap(roadmap(['ABGESCHLOSSEN', 'IN_ARBEIT'], ['ABGESCHLOSSEN', 'keine_akte', 'ENTWURF'], [])), { abgenommen: 2, gesamt: 5 })
  assert.deepEqual(zaehleRoadmap(roadmap()), { abgenommen: 0, gesamt: 0 })
  assert.deepEqual(zaehleRoadmap({ status: 'nicht_vorhanden' }), { abgenommen: 0, gesamt: 0 })
  assert.deepEqual(zaehleRoadmap(null), { abgenommen: 0, gesamt: 0 })
})

test('roadmapKennzahlen: Ziel = vision roh, sonst null; keine Roadmap = 0/0; Fehler nie als leer (F-854)', () => {
  assert.deepEqual(roadmapKennzahlen(roadmap(['ABGESCHLOSSEN', 'ENTWURF'])), { ok: true, abgenommen: 1, gesamt: 2, vision: 'Ein Ziel' })
  assert.equal(roadmapKennzahlen({ ...roadmap([]), vision: '<b>roh</b>' }).vision, '<b>roh</b>')
  assert.equal(roadmapKennzahlen({ ...roadmap([]), vision: '   ' }).vision, null)
  assert.equal(roadmapKennzahlen({ status: 'ok', meilensteine: [] }).vision, null)
  assert.deepEqual(roadmapKennzahlen({ status: 'nicht_vorhanden' }), { ok: true, abgenommen: 0, gesamt: 0, vision: null })
  assert.deepEqual(roadmapKennzahlen({ status: 'ungueltig', fehler: ['meilensteine fehlt'] }), { ok: false, grund: 'meilensteine fehlt' })
  assert.deepEqual(roadmapKennzahlen({ status: 'fehler', grund: '404 Unbekanntes Projekt' }), { ok: false, grund: '404 Unbekanntes Projekt' })
  assert.deepEqual(roadmapKennzahlen({ irgendwas: 1 }), { ok: false, grund: '' })
})

test('kartenLage: Entscheidungen > 0 vor laufAktiv, sonst bereit; unbekannte Zahl entscheidet nicht', () => {
  assert.deepEqual(kartenLage(2, false), { lage: 'entscheidung', chipKlasse: 'warten' })
  assert.deepEqual(kartenLage(1, true), { lage: 'entscheidung', chipKlasse: 'warten' })
  assert.deepEqual(kartenLage(0, true), { lage: 'laeuft', chipKlasse: '' })
  assert.deepEqual(kartenLage(0, false), { lage: 'bereit', chipKlasse: 'neutral' })
  assert.deepEqual(kartenLage(null, true), { lage: 'laeuft', chipKlasse: '' })
  assert.deepEqual(kartenLage(undefined, false), { lage: 'bereit', chipKlasse: 'neutral' })
  // laufAktiv nur bei echtem true (der Server liefert ein Bool).
  assert.equal(kartenLage(0, 'true').lage, 'bereit')
})

/** Zustands-Aggregat wie GET …/zustand. */
const zustand = (felder = {}) => ({ laeufe: [], startfehler: [], workflows: [], fehler: [], ...felder })

test('entscheidungsKennzahl: dieselbe Auswahl wie „Deine Entscheidungen“ (Freigabe, Rückfrage, Lauf, Startproblem, P0/P1)', () => {
  const z = zustand({
    workflows: [
      { workflowId: 'w1', naechster: { art: 'haltFreigabe' } },
      { workflowId: 'w2', naechster: { art: 'haltKlaerung' } },
      { workflowId: 'w3', naechster: { art: 'starten' } },
    ],
    laeufe: [
      { laufId: 'l1', ergebnis: 'FEHLGESCHLAGEN', kenntnisgenommen: false },
      { laufId: 'l2', ergebnis: 'FEHLGESCHLAGEN', kenntnisgenommen: true },
    ],
    startfehler: [{ laufId: 's1', zeitstempel: 'x', fehler: 'kaputt' }],
  })
  const workitems = { workitems: [{ id: 'F-1', prioritaet: 'P0' }, { id: 'F-2', prioritaet: 'P1' }, { id: 'F-3', prioritaet: 'P2' }], befunde: [], fehler: [] }
  assert.deepEqual(entscheidungsKennzahl(z, workitems), { ok: true, anzahl: 6 })
  assert.deepEqual(entscheidungsKennzahl(zustand(), { workitems: [] }), { ok: true, anzahl: 0 })
})

test('entscheidungsKennzahl: defekte Quelle → keine Zahl, sondern der Grund', () => {
  assert.deepEqual(entscheidungsKennzahl(zustand({ workflows: null, fehler: [{ quelle: 'workflows', grund: 'Datei kaputt' }] }), { workitems: [] }), { ok: false, grund: 'workflows: Datei kaputt' })
  assert.deepEqual(entscheidungsKennzahl(zustand(), { workitems: null, fehler: [{ quelle: 'findings', grund: 'Parserfehler' }] }), { ok: false, grund: 'findings: Parserfehler' })
  assert.deepEqual(entscheidungsKennzahl(zustand(), { grund: 'kein workitems-Feld' }), { ok: false, grund: '' })
  assert.deepEqual(entscheidungsKennzahl(null, { workitems: [] }), { ok: false, grund: '' })
})

test('vorschauKurzstand: erreichbar, nicht erreichbar, gesperrt (F-849), nicht gesetzt, lädt', () => {
  assert.equal(vorschauKurzstand(null), 'laedt')
  assert.equal(vorschauKurzstand(undefined), 'laedt')
  assert.equal(vorschauKurzstand({ url: null, erreichbar: null, grund: 'nicht gesetzt' }), 'nichtGesetzt')
  assert.equal(vorschauKurzstand({ url: 'http://127.0.0.1:4173', erreichbar: null, grund: 'nicht zulässig (Leitstand-Port)' }), 'gesperrt')
  assert.equal(vorschauKurzstand({ url: 'http://127.0.0.1:3000', erreichbar: true, grund: '200' }), 'erreichbar')
  assert.equal(vorschauKurzstand({ url: 'http://127.0.0.1:3000', erreichbar: false, grund: 'ECONNREFUSED' }), 'nichtErreichbar')
})

test('ring (fortschritt-ring.js): Prozent und x/y; unbekannt ohne Zahlen (lädt bzw. nicht ladbar)', async () => {
  const { ring } = await import('./fortschritt-ring.js')
  const bekannt = ring(2, 5, { label: 'L' })
  assert.match(bekannt, /stroke-dasharray="40 100"/)
  assert.match(bekannt, /<small>2\/5<\/small>/)
  assert.match(ring(0, 0), /<strong>–<\/strong><small>0\/0<\/small>/)
  const unbekannt = ring(3, 4, { unbekannt: true, label: '<x>' })
  assert.match(unbekannt, /stroke-dasharray="0 100"/)
  assert.doesNotMatch(unbekannt, /<small>/)
  assert.match(unbekannt, /aria-label="&lt;x&gt;"/)
})
