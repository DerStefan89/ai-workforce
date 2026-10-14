/**
 * Datei: src/architecture-advisor/architecture-advisor.test.ts
 *
 * Zweck: node:test-Fälle für validiereErgebnisAdvisor und baueArchitectureAdvisorAuftragstext.
 * F-641 (Lauf 4b3ebc42, 23.09.2026): die reale Advisor-Antwort ohne Urteil (Prosa mit Bitte um
 * Schreibzugriff) bleibt als Rot-Fall erhalten — seit F45 B2b-1b ist sie kein gültiges Ergebnis,
 * weil sie kein JSON nach schemas/ergebnis-architecture-advisor.schema.json ist (der Server
 * parst; hier geprüft: ein Nicht-Objekt verstößt). Die Gut-Fälle sind die Beispiele unter
 * schemas/examples/ergebnis-architecture-advisor.valid-*.json.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { baueArchitectureAdvisorAuftragstext, validiereErgebnisAdvisor } from './index.ts'

/** Lädt ein Beispiel aus schemas/examples/ (Pfad relativ zur Repo-Wurzel, wie die übrigen Tests). */
function beispiel(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(`schemas/examples/ergebnis-architecture-advisor.${name}.json`, 'utf-8'))
}

/** Ein gültiges UEBERARBEITEN mit einem Befund, als Basis für die Rotfälle. */
function mitBefund(): Record<string, unknown> {
  return beispiel('valid-ueberarbeiten')
}

// Wörtlich gekürzt aus kontrollzustand-roh/4b3ebc42-91df-422b-9dd4-b2fc02dc4151/rohstrom.json ('result') — F-641.
const REALE_ADVISOR_ANTWORT_OHNE_URTEIL = "I've reviewed the necessary context … Could you grant Write/Edit tool access (or Bash) so I can make these changes?"

test('validiereErgebnisAdvisor: die Beispiele valid-freigegeben und valid-ueberarbeiten sind gültig', () => {
  assert.deepEqual(validiereErgebnisAdvisor(beispiel('valid-freigegeben')), [])
  assert.deepEqual(validiereErgebnisAdvisor(beispiel('valid-ueberarbeiten')), [])
})

test('validiereErgebnisAdvisor: Prosa statt JSON (F-641) und null verstoßen', () => {
  assert.notDeepEqual(validiereErgebnisAdvisor(REALE_ADVISOR_ANTWORT_OHNE_URTEIL), [])
  assert.notDeepEqual(validiereErgebnisAdvisor(null), [])
  assert.notDeepEqual(validiereErgebnisAdvisor([]), [])
})

test('validiereErgebnisAdvisor: das alte Urteil BEREIT ist kein Wert der neuen Wertemenge', () => {
  const ergebnis = { ...mitBefund(), urteil: 'BEREIT' }
  assert.match(validiereErgebnisAdvisor(ergebnis).join('|'), /urteil/)
})

test('validiereErgebnisAdvisor: FREIGEGEBEN mit Befund verstößt (Befunde gingen sonst verloren) — Beispiel invalid-freigegeben-mit-befund', () => {
  assert.match(validiereErgebnisAdvisor(beispiel('invalid-freigegeben-mit-befund')).join('|'), /FREIGEGEBEN/)
})

test('validiereErgebnisAdvisor: FREIGEGEBEN_MIT_AUFLAGEN und UEBERARBEITEN ohne Befund verstoßen', () => {
  for (const urteil of ['FREIGEGEBEN_MIT_AUFLAGEN', 'UEBERARBEITEN']) {
    assert.match(validiereErgebnisAdvisor({ ...mitBefund(), urteil, befunde: [] }).join('|'), /mindestens einen Befund/)
  }
})

test('validiereErgebnisAdvisor: fehlende oder leere Pflichtfelder eines Befunds und doppelte id verstoßen', () => {
  const basis = (mitBefund().befunde as Array<Record<string, unknown>>)[0]
  for (const feld of ['id', 'fundstelle', 'zusammenfassung', 'korrekturrichtung']) {
    const kaputt = { ...basis, [feld]: '  ' }
    assert.match(validiereErgebnisAdvisor({ ...mitBefund(), befunde: [kaputt] }).join('|'), new RegExp(feld), feld)
  }
  assert.match(validiereErgebnisAdvisor({ ...mitBefund(), befunde: [{ ...basis, schwere: 'BLOCKER' }] }).join('|'), /schwere/)
  assert.match(validiereErgebnisAdvisor({ ...mitBefund(), befunde: [basis, basis] }).join('|'), /doppelt/)
  assert.match(validiereErgebnisAdvisor({ ...mitBefund(), befunde: 'keine' }).join('|'), /befunde/)
})

test('validiereErgebnisAdvisor: Beispiel invalid-fehlendes-urteil verstößt', () => {
  assert.match(validiereErgebnisAdvisor(beispiel('invalid-fehlendes-urteil')).join('|'), /urteil/)
})

test('validiereErgebnisAdvisor: Felder, die nur die CLI erzwingt (begruendung, entlastend, grenzen_der_pruefung, evidenz), halten nicht an (B6)', () => {
  const ohne = { urteil: 'UEBERARBEITEN', befunde: (mitBefund().befunde as Array<Record<string, unknown>>).map(({ evidenz: _e, ...rest }) => rest) }
  assert.deepEqual(validiereErgebnisAdvisor(ohne), [])
})

test('baueArchitectureAdvisorAuftragstext: nennt die Rolle, verbietet Schreiben/Planen und verlangt das JSON-Ergebnis mit den drei Urteilen', () => {
  const text = baueArchitectureAdvisorAuftragstext('Prüfe diesen Entwurf.')
  assert.match(text, /Rolle 'architecture-advisor'/)
  assert.match(text, /schreibst und planst nichts/)
  assert.match(text, /ergebnis-architecture-advisor/)
  for (const urteil of ['FREIGEGEBEN', 'FREIGEGEBEN_MIT_AUFLAGEN', 'UEBERARBEITEN']) assert.match(text, new RegExp(urteil))
  assert.doesNotMatch(text, /Urteil: /)
  assert.match(text, /Prüfe diesen Entwurf\./)
})

test('baueArchitectureAdvisorAuftragstext: übernimmt die Regeln des Skills advisor-pass (Fundstelle, Evidenz, entlastend, Rollengrenze, Blockiert)', () => {
  const text = baueArchitectureAdvisorAuftragstext('x')
  for (const muster of [/Datei und Zeile/, /FAKT.*SCHLUSSFOLGERUNG.*ANNAHME.*OFFENE_UNSICHERHEIT/s, /entlastend/, /grenzen_der_pruefung/, /Entscheidung Stefan nötig/, /nach Schwere/]) {
    assert.match(text, muster)
  }
})

test("baueArchitectureAdvisorAuftragstext: stellt klar, dass 'Auftrag an den Baudurchgang' nicht an den Advisor gerichtet ist", () => {
  const text = baueArchitectureAdvisorAuftragstext('x')
  assert.match(text, /Auftrag an den Baudurchgang.*NICHT an dich gerichtet/s)
})
