/**
 * Datei: scripts/leitstand/f35-ws3-adjust-automatik.test.mjs
 *
 * Zweck: Testet die reinen Funktionen aus
 * scripts/leitstand/f35-ws3-adjust-automatik.mjs (F35 WS-3, features/F35/
 * feature.md) isoliert — ohne HTTP-Server, ohne Kontrollzustand. Der
 * HTTP-Rundlauf inklusive wendeAutomatischeAnpassungAn/zaehleKernVersionen
 * ist scripts/check-f35-ws3-adjust-automatik.mjs vorbehalten (Muster
 * check-f35-ws2-urteil-je-ak.mjs: reine Funktionen hier isoliert, der
 * schreibende/D13-abhängige Teil nur am realen Aufrufpfad).
 *
 * F45 B2b-1a (features/F45/plan-b2b1.md): Rückweg-Regel (pruefeRueckweg, je Stufe eine Korrekturrunde innerhalb
 * max_replans), Halt bei denselben Befunden (sindDieselbenBefunde) und „Prüfer wiederholen“ (pruefschrittWiederholbar);
 * HTTP-Rundlauf in scripts/check-f45-b2b1-rueckweg.mjs. F45 B2b-1b: der Advisor-Zweig liest die Verstöße gegen das
 * Advisor-Schema (advisorVerstoesse) statt der früheren Urteilszeile (F-1104 (4)).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { baueAutomatischeAnpassungsBegruendung, ermittleAutomatischeAnpassung, pruefeRueckweg, pruefschrittWiederholbar, sindDieselbenBefunde } from './f35-ws3-adjust-automatik.mjs'

const EIN_BEFUND = { schwere: 'HOCH', fundstelle: 'src/beispiel.ts:12', zusammenfassung: 'Fehlende Fehlerbehandlung beim Schreibpfad.' }

test('baueAutomatischeAnpassungsBegruendung: fester Kopf nennt Rückweg, Stufe und Review-Urteil', () => {
  const text = baueAutomatischeAnpassungsBegruendung('BLOCKIERT', [], [], 1)
  assert.ok(text.startsWith('Automatische Anpassung (Korrekturrunde 1 von 1, Bau-Stufe) nach Review-Urteil BLOCKIERT:'))
})

test('baueAutomatischeAnpassungsBegruendung: ohne Befunde/AK-Verstöße bleibt der Kopf allein tragend, keine leeren Abschnitte', () => {
  const text = baueAutomatischeAnpassungsBegruendung('BLOCKIERT', [], [], 1)
  assert.ok(text.length > 0)
  assert.ok(!text.includes('Befunde:'))
  assert.ok(!text.includes('Verletzte Akzeptanzkriterien:'))
})

test('baueAutomatischeAnpassungsBegruendung: listet jeden Befund nummeriert mit Schwere/Fundstelle/Zusammenfassung', () => {
  const text = baueAutomatischeAnpassungsBegruendung('BLOCKIERT', [EIN_BEFUND], [], 1)
  assert.ok(text.includes('Korrekturrunde 1 von 1'))
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
  const ergebnis = ermittleAutomatischeAnpassung({ outputSchema: null, schrittStatus: 'ERFOLGREICH', heilbar: false, urteil: 'BLOCKIERT', akVerstoesse: [], anzahlBisherigerKernVersionen: 0, maxReplans: 1 })
  assert.equal(ergebnis.ausloesen, false)
})

test('ermittleAutomatischeAnpassung: löst NICHT aus bei heilbar (kein auswertbares Ergebnis)', () => {
  const ergebnis = ermittleAutomatischeAnpassung({ outputSchema: 'ergebnis-code-reviewer', schrittStatus: 'ERFOLGREICH', heilbar: true, urteil: 'BLOCKIERT', akVerstoesse: [], anzahlBisherigerKernVersionen: 0, maxReplans: 1 })
  assert.equal(ergebnis.ausloesen, false)
})

test('ermittleAutomatischeAnpassung: löst NICHT aus bei einem nicht-ERFOLGREICHEN Lauf', () => {
  const ergebnis = ermittleAutomatischeAnpassung({ outputSchema: 'ergebnis-code-reviewer', schrittStatus: 'FEHLGESCHLAGEN', heilbar: false, urteil: null, akVerstoesse: [], anzahlBisherigerKernVersionen: 0, maxReplans: 1 })
  assert.equal(ergebnis.ausloesen, false)
})

test('ermittleAutomatischeAnpassung: löst AUS bei Urteil BLOCKIERT', () => {
  const ergebnis = ermittleAutomatischeAnpassung({ outputSchema: 'ergebnis-code-reviewer', schrittStatus: 'ERFOLGREICH', heilbar: false, urteil: 'BLOCKIERT', akVerstoesse: [], anzahlBisherigerKernVersionen: 0, maxReplans: 1 })
  assert.equal(ergebnis.ausloesen, true)
})

test('ermittleAutomatischeAnpassung: löst AUS bei nicht-leeren AK-Verstößen, auch bei Urteil BEREIT', () => {
  const ergebnis = ermittleAutomatischeAnpassung({ outputSchema: 'ergebnis-code-reviewer', schrittStatus: 'ERFOLGREICH', heilbar: false, urteil: 'BEREIT', akVerstoesse: ["AK 'AK2': Beleg fehlt oder ist leer"], anzahlBisherigerKernVersionen: 0, maxReplans: 1 })
  assert.equal(ergebnis.ausloesen, true)
})

test('ermittleAutomatischeAnpassung: löst NICHT aus bei einem Urteil außerhalb der drei bekannten Werte ohne AK-Verstöße (Regel 1b hält an, aber kein Auslöser)', () => {
  const ergebnis = ermittleAutomatischeAnpassung({ outputSchema: 'ergebnis-code-reviewer', schrittStatus: 'ERFOLGREICH', heilbar: false, urteil: 'UNKLAR', akVerstoesse: [], anzahlBisherigerKernVersionen: 0, maxReplans: 1 })
  assert.equal(ergebnis.ausloesen, false)
})

// K1 (features/F35/review-pass.md, AK18): AK-Verstöße dürfen ein fehlendes/unbekanntes Urteil nicht überstimmen.
test('ermittleAutomatischeAnpassung: löst NICHT aus bei fehlendem Urteil, auch mit AK-Verstößen (K1/AK18)', () => {
  for (const urteil of [null, undefined]) {
    const ergebnis = ermittleAutomatischeAnpassung({ outputSchema: 'ergebnis-code-reviewer', schrittStatus: 'ERFOLGREICH', heilbar: false, urteil, akVerstoesse: ["AK 'AK2': Urteil NICHT_ERFUELLT"], anzahlBisherigerKernVersionen: 0, maxReplans: 1 })
    assert.deepEqual(ergebnis, { ausloesen: false, grund: 'Urteil fehlt/unbekannt — Entscheidung beim Menschen (AK18)' })
  }
})

test('ermittleAutomatischeAnpassung: löst NICHT aus bei unbekanntem Urteil, auch mit AK-Verstößen (K1/AK18)', () => {
  const ergebnis = ermittleAutomatischeAnpassung({ outputSchema: 'ergebnis-code-reviewer', schrittStatus: 'ERFOLGREICH', heilbar: false, urteil: 'UNKLAR', akVerstoesse: ["AK 'AK2': Urteil NICHT_ERFUELLT"], anzahlBisherigerKernVersionen: 0, maxReplans: 1 })
  assert.deepEqual(ergebnis, { ausloesen: false, grund: 'Urteil fehlt/unbekannt — Entscheidung beim Menschen (AK18)' })
})

test('ermittleAutomatischeAnpassung: löst AUS bei Urteil BEREIT_NACH_KORREKTUR mit AK-Verstößen', () => {
  const ergebnis = ermittleAutomatischeAnpassung({ outputSchema: 'ergebnis-code-reviewer', schrittStatus: 'ERFOLGREICH', heilbar: false, urteil: 'BEREIT_NACH_KORREKTUR', akVerstoesse: ["AK 'AK2': Urteil NICHT_ERFUELLT"], anzahlBisherigerKernVersionen: 0, maxReplans: 1 })
  assert.equal(ergebnis.ausloesen, true)
})

// F45 B2b-1a: die Grenze kommt aus grenzen.max_replans, je Stufe höchstens 1 Rückweg.
const BLOCKIERT_BASIS = { outputSchema: 'ergebnis-code-reviewer', schrittStatus: 'ERFOLGREICH', heilbar: false, urteil: 'BLOCKIERT', akVerstoesse: [] }

test('ermittleAutomatischeAnpassung: zweite automatische Korrekturrunde (Rückweg) der Bau-Stufe ist gesperrt (art grenze, lesbarer Grund)', () => {
  const ergebnis = ermittleAutomatischeAnpassung({ ...BLOCKIERT_BASIS, anzahlBisherigerKernVersionen: 1, maxReplans: 5 })
  assert.equal(ergebnis.ausloesen, false)
  assert.equal(ergebnis.art, 'grenze')
  assert.match(ergebnis.grund, /Bau-Stufe hatte ihre eine automatische Korrekturrunde schon/)
})

test('ermittleAutomatischeAnpassung: max_replans 0 sperrt schon den ersten Rückweg (art grenze, lesbarer Grund ohne Feldnamen)', () => {
  const ergebnis = ermittleAutomatischeAnpassung({ ...BLOCKIERT_BASIS, anzahlBisherigerKernVersionen: 0, maxReplans: 0 })
  assert.equal(ergebnis.ausloesen, false)
  assert.equal(ergebnis.art, 'grenze')
  assert.match(ergebnis.grund, /erlaubt keine automatische Korrekturrunde/)
  assert.doesNotMatch(ergebnis.grund, /max_replans/, 'kein interner Feldname im sichtbaren Grund')
})

test('ermittleAutomatischeAnpassung: fehlendes/ungültiges max_replans sperrt (fail closed)', () => {
  for (const maxReplans of [undefined, null, -1, 1.5, '1']) {
    const ergebnis = ermittleAutomatischeAnpassung({ ...BLOCKIERT_BASIS, anzahlBisherigerKernVersionen: 0, maxReplans })
    assert.equal(ergebnis.ausloesen, false)
    assert.equal(ergebnis.art, 'grenze')
  }
})

test('ermittleAutomatischeAnpassung: dieselben Befunde wie vorher sperren sofort, auch ohne bisherigen Rückweg (art wiederholung)', () => {
  const ergebnis = ermittleAutomatischeAnpassung({ ...BLOCKIERT_BASIS, anzahlBisherigerKernVersionen: 0, maxReplans: 1, befunde: [EIN_BEFUND], vorherigeBefunde: [{ ...EIN_BEFUND, fundstelle: 'src/beispiel.ts:40' }] })
  assert.equal(ergebnis.ausloesen, false)
  assert.equal(ergebnis.art, 'wiederholung')
  assert.match(ergebnis.grund, /dieselben Befunde/)
})

test('ermittleAutomatischeAnpassung: Wiederholung geht der Grenze vor (eigener Grund)', () => {
  const ergebnis = ermittleAutomatischeAnpassung({ ...BLOCKIERT_BASIS, anzahlBisherigerKernVersionen: 1, maxReplans: 1, befunde: [EIN_BEFUND], vorherigeBefunde: [EIN_BEFUND] })
  assert.equal(ergebnis.art, 'wiederholung')
})

test('ermittleAutomatischeAnpassung: andere Befunde als vorher lösen beim ersten Rückweg aus', () => {
  const ergebnis = ermittleAutomatischeAnpassung({ ...BLOCKIERT_BASIS, anzahlBisherigerKernVersionen: 0, maxReplans: 1, befunde: [EIN_BEFUND], vorherigeBefunde: [{ ...EIN_BEFUND, fundstelle: 'src/anders.ts:3' }] })
  assert.equal(ergebnis.ausloesen, true)
})

test('ermittleAutomatischeAnpassung: Ablehnungen ohne Grenzbezug tragen keine art (kein falscher Grenzsatz)', () => {
  const ergebnis = ermittleAutomatischeAnpassung({ ...BLOCKIERT_BASIS, urteil: 'BEREIT', anzahlBisherigerKernVersionen: 0, maxReplans: 1 })
  assert.equal(ergebnis.ausloesen, false)
  assert.equal(ergebnis.art, undefined)
})

test('pruefeRueckweg: erlaubt genau einen Rückweg je Stufe innerhalb max_replans', () => {
  assert.deepEqual(pruefeRueckweg({ stufe: 'bau', rueckwegeStufe: 0, rueckwegeGesamt: 0, maxReplans: 1 }), { erlaubt: true })
  assert.deepEqual(pruefeRueckweg({ stufe: 'plan', rueckwegeStufe: 0, rueckwegeGesamt: 1, maxReplans: 2 }), { erlaubt: true })
  const stufe = pruefeRueckweg({ stufe: 'plan', rueckwegeStufe: 1, rueckwegeGesamt: 1, maxReplans: 2 })
  assert.equal(stufe.erlaubt, false)
  assert.equal(stufe.art, 'grenze')
  assert.match(stufe.grund, /Plan-Stufe/)
  const gesamt = pruefeRueckweg({ stufe: 'bau', rueckwegeStufe: 0, rueckwegeGesamt: 1, maxReplans: 1 })
  assert.equal(gesamt.erlaubt, false)
  assert.match(gesamt.grund, /\(höchstens 1\) sind verbraucht/)
})

test('sindDieselbenBefunde: Schlüssel Schwere + Datei ohne Zeile, Reihenfolge und Doppelte egal', () => {
  const a = [{ schwere: 'HOCH', fundstelle: 'src/a.ts:12' }, { schwere: 'NIEDRIG', fundstelle: 'src/b.ts Z. 4' }]
  const b = [{ schwere: 'NIEDRIG', fundstelle: 'src/b.ts' }, { schwere: 'HOCH', fundstelle: 'src/a.ts:30-41' }, { schwere: 'HOCH', fundstelle: ' src/a.ts ' }]
  assert.equal(sindDieselbenBefunde(a, b), true)
  assert.equal(sindDieselbenBefunde(a, [{ schwere: 'HOCH', fundstelle: 'src/a.ts:12' }]), false, 'Teilmenge ist keine Wiederholung')
  assert.equal(sindDieselbenBefunde(a, [{ schwere: 'MITTEL', fundstelle: 'src/a.ts:12' }, { schwere: 'NIEDRIG', fundstelle: 'src/b.ts' }]), false, 'andere Schwere')
  assert.equal(sindDieselbenBefunde([], []), false, 'leer ist nie eine Wiederholung')
  assert.equal(sindDieselbenBefunde(null, a), false)
})

const REVIEW_SCHRITT = { schritt_id: 'schritt-2-review', rolle: 'code-reviewer', output_schema: 'ergebnis-code-reviewer', lauf_id: 'lauf-r', status: 'FEHLGESCHLAGEN' }
const ADVISOR_SCHRITT = { schritt_id: 'schritt-2-architektur', rolle: 'architecture-advisor', output_schema: 'ergebnis-architecture-advisor', lauf_id: 'lauf-a', status: 'ERFOLGREICH' }

test('pruefschrittWiederholbar: Review nach Werkzeugausfall ist wiederholbar, nur bei KLAERUNG_ERFORDERLICH', () => {
  assert.deepEqual(pruefschrittWiederholbar({ workflowStatus: 'KLAERUNG_ERFORDERLICH', schritt: REVIEW_SCHRITT, befund: {} }), { wiederholbar: true })
  assert.equal(pruefschrittWiederholbar({ workflowStatus: 'ABGESCHLOSSEN', schritt: REVIEW_SCHRITT, befund: {} }).wiederholbar, false)
  assert.equal(pruefschrittWiederholbar({ workflowStatus: 'KLAERUNG_ERFORDERLICH', schritt: { ...REVIEW_SCHRITT, lauf_id: null }, befund: {} }).wiederholbar, false)
  assert.equal(pruefschrittWiederholbar({ workflowStatus: 'KLAERUNG_ERFORDERLICH', schritt: null, befund: {} }).wiederholbar, false)
  assert.equal(pruefschrittWiederholbar({ workflowStatus: 'KLAERUNG_ERFORDERLICH', schritt: { ...REVIEW_SCHRITT, status: 'VERWEIGERT' }, befund: {} }).wiederholbar, false)
})

test('pruefschrittWiederholbar: erfolgreicher Review — nur fehlendes Urteil oder Vertragsbruch bei tragendem Urteil (B9, D4)', () => {
  const ok = { ...REVIEW_SCHRITT, status: 'ERFOLGREICH' }
  const pruefe = (befund) => pruefschrittWiederholbar({ workflowStatus: 'KLAERUNG_ERFORDERLICH', schritt: ok, befund }).wiederholbar
  assert.equal(pruefe({ urteil: null, akVerstoesse: ["AK 'AK1': fehlt"] }), true, 'unlesbares Ergebnis')
  assert.equal(pruefe({ urteil: 'UNKLAR' }), true, 'unbekanntes Urteil')
  assert.equal(pruefe({ urteil: 'BLOCKIERT', reviewVerstoesse: ['x'] }), false, 'BLOCKIERT würfelt man nicht weg')
  assert.equal(pruefe({ urteil: 'BEREIT', akVerstoesse: ['AK1'], reviewVerstoesse: ['x'] }), false, 'AK-Verstoß')
  assert.equal(pruefe({ urteil: 'BEREIT', akVerstoesse: [], reviewVerstoesse: ['leere Befunde ohne Pflichtsatz'] }), true, 'Regel 1k')
  assert.equal(pruefe({ urteil: 'BEREIT_NACH_KORREKTUR', akVerstoesse: [], reviewVerstoesse: [] }), false, 'Review trägt')
})

test('pruefschrittWiederholbar: Advisor nach Werkzeugausfall oder mit Verstößen gegen das Advisor-Schema (B4, F45 B2b-1b); andere Rollen nie', () => {
  const pruefe = (schritt, befund) => pruefschrittWiederholbar({ workflowStatus: 'KLAERUNG_ERFORDERLICH', schritt, befund }).wiederholbar
  assert.equal(pruefe(ADVISOR_SCHRITT, { advisorVerstoesse: ['Ergebnis ist kein JSON-Objekt'] }), true)
  assert.equal(pruefe({ ...ADVISOR_SCHRITT, output_schema: null }, { advisorVerstoesse: ["'urteil' fehlt"] }), true, 'Bestands-hoch ohne Schema am Schritt')
  assert.equal(pruefe({ ...ADVISOR_SCHRITT, status: 'FEHLGESCHLAGEN' }, {}), true)
  assert.equal(pruefe(ADVISOR_SCHRITT, { advisorVerstoesse: [] }), false, 'gültiges Ergebnis')
  assert.equal(pruefe(ADVISOR_SCHRITT, {}), false, 'kein Befund gelesen')
  assert.equal(pruefe({ ...ADVISOR_SCHRITT, status: 'VERWEIGERT' }, {}), false)
  assert.match(pruefschrittWiederholbar({ workflowStatus: 'KLAERUNG_ERFORDERLICH', schritt: { ...ADVISOR_SCHRITT, status: 'VERWEIGERT' }, befund: {} }).grund, /dieselbe Ablehnung/, 'VERWEIGERT mit eigenem Grund, nicht „gültiges Ergebnis“')
  assert.equal(pruefe({ ...ADVISOR_SCHRITT, rolle: 'ausfuehrung', status: 'FEHLGESCHLAGEN' }, {}), false)
})

test('sindDieselbenBefunde: Zeilen-/Spaltenformate am Ende werden abgeschnitten, der Pfad bleibt (Prüfpass B8)', () => {
  const formen = ['src/a.ts:12:5', 'src/a.ts#L12', 'src/a.ts (Z. 12)', 'src/a.ts, Zeile 12', 'src/a.ts line 12', 'src/a.ts:12–20']
  for (const fundstelle of formen) {
    assert.equal(sindDieselbenBefunde([{ schwere: 'HOCH', fundstelle: 'src/a.ts:30' }], [{ schwere: 'HOCH', fundstelle }]), true, fundstelle)
  }
  assert.equal(sindDieselbenBefunde([{ schwere: 'HOCH', fundstelle: 'src/Zeile1.ts' }], [{ schwere: 'HOCH', fundstelle: 'src/Zeile2.ts' }]), false, 'Dateinamen bleiben unterscheidbar')
  assert.equal(sindDieselbenBefunde([{ schwere: 'HOCH', fundstelle: 'Zeile 12' }], [{ schwere: 'HOCH', fundstelle: 'Zeile 40' }]), false, 'ohne Pfad bleibt die Fundstelle ganz')
})

test('sindDieselbenBefunde: kombinierte Zeilenangaben werden bis zum Festpunkt abgeschnitten (F-1104 (11))', () => {
  for (const form of ['src/a.ts:12 (Zeile 12)', 'src/a.ts:12-20, Z. 14', 'src/a.ts#L3 (line 3)']) {
    assert.equal(sindDieselbenBefunde([{ schwere: 'HOCH', fundstelle: 'src/a.ts' }], [{ schwere: 'HOCH', fundstelle: form }]), true, form)
  }
})

test('sindDieselbenBefunde: ein Befund ohne Fundstelle macht den Vergleich unmöglich (keine Wiederholung)', () => {
  assert.equal(sindDieselbenBefunde([{ schwere: 'HOCH' }], [{ schwere: 'HOCH' }]), false)
  assert.equal(sindDieselbenBefunde([{ schwere: 'HOCH', fundstelle: '' }], [{ schwere: 'HOCH', fundstelle: ' ' }]), false)
})

test('ermittleAutomatischeAnpassung: Wiederholungs-Grund nennt höchstens drei Befunde lesbar, Rest als „+n weitere“', () => {
  const liste = ['a', 'b', 'c', 'd', 'e'].map((d) => ({ schwere: 'HOCH', fundstelle: `src/${d}.ts:1` }))
  const ergebnis = ermittleAutomatischeAnpassung({ ...BLOCKIERT_BASIS, anzahlBisherigerKernVersionen: 0, maxReplans: 1, befunde: liste, vorherigeBefunde: liste })
  assert.match(ergebnis.grund, /HOCH in src\/a\.ts; HOCH in src\/b\.ts; HOCH in src\/c\.ts; \+2 weitere/)
  assert.doesNotMatch(ergebnis.grund, /\|/, 'keine Rohschlüssel')
})
