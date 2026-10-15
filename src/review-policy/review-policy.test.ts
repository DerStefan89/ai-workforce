/**
 * Datei: src/review-policy/review-policy.test.ts
 *
 * Zweck: Unit-Tests der Review-Policy (F45 B2a-3a): Policy-Block (Inhalt, Version, Vorrangregel) und
 * pruefeReviewErgebnis (Halt nur bei leeren Befunden ohne den Satz, Hinweise bei fehlenden Pflichtwerten).
 *
 * Wird aufgerufen von: npm run test (node:test)
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { baueReviewPolicyBlock, KEINE_BEFUNDE_SATZ, pruefeReviewErgebnis, pruefeReviewErgebnisFuer, REVIEW_POLICY_VERSION, zaehleSchwereBeiBereit } from './index.ts'

const VOLLER_BEFUND = { id: 'B1', dimension: 'bugs', evidenz: 'confirmed', korrekturrichtung: 'Grenze prüfen', schwere: 'HOCH', fundstelle: 'a.ts:1', zusammenfassung: 'x', beleg: 'y' }

test('baueReviewPolicyBlock: trägt Version, fünf Dimensionen, Sicherheit, Nicht-Auftrag, Architektur-Kritik, Testsatz und den Keine-Befunde-Satz', () => {
  const text = baueReviewPolicyBlock()
  assert.ok(text.startsWith(`## Review-Policy (${REVIEW_POLICY_VERSION})`))
  for (const teil of [
    'Bugs und Korrektheit',
    'Funktionsfähigkeit',
    'Skalierbarkeit',
    'Wartbarkeit',
    'Technische Prinzipien und Definitionen',
    'Sicherheitsdefekte',
    'Explizit nicht beauftragt',
    'Du darfst auch frühere Architekturannahmen (Architekt-Schritt) kritisieren',
    'Grüne Tests sind kein Korrektheitsbeweis',
    KEINE_BEFUNDE_SATZ,
    'fehlerfrei',
    'nicht anwendbar (Harness-Abgleich)',
    'bugs | funktion | skalierbarkeit | wartbarkeit | prinzipien | sicherheit',
    'confirmed | likely | needs-validation',
    'KRITISCH',
  ]) {
    assert.ok(text.includes(teil), `fehlt: ${teil}`)
  }
})

test('baueReviewPolicyBlock: deterministisch (gleicher Text bei jedem Aufruf)', () => {
  assert.equal(baueReviewPolicyBlock(), baueReviewPolicyBlock())
})

test('pruefeReviewErgebnis: leere Befunde ohne Satz → Halt', () => {
  const r = pruefeReviewErgebnis({ befunde: [], empfehlung: 'Checkliste: 3 von 3 erfüllt. Alles gut.' })
  assert.equal(r.halt.length, 1)
  assert.match(r.halt[0], /Keine belastbaren Findings im geprüften Scope/)
  assert.deepEqual(r.hinweise, [])
})

test('pruefeReviewErgebnis: leere Befunde mit Satz (nach „Checkliste: …“, anderer Leerraum) → kein Halt', () => {
  const r = pruefeReviewErgebnis({ befunde: [], empfehlung: 'Checkliste: 3 von 3 erfüllt.\nKeine  belastbaren Findings\nim geprüften Scope.' })
  assert.deepEqual(r, { halt: [], hinweise: [] })
})

test('pruefeReviewErgebnis: Satz klein geschrieben nach Semikolon oder in NFD → kein Halt (Code-Review 1)', () => {
  assert.deepEqual(pruefeReviewErgebnis({ befunde: [], empfehlung: 'Checkliste: 5/5 erfüllt; keine belastbaren Findings im geprüften Scope.' }).halt, [])
  assert.deepEqual(pruefeReviewErgebnis({ befunde: [], empfehlung: `Checkliste: ok. ${KEINE_BEFUNDE_SATZ.normalize('NFD')}` }).halt, [])
})

test('pruefeReviewErgebnisFuer: nur die aktuelle Version wird geprüft, unbekannte oder fehlende → null (Code-Review 3)', () => {
  assert.equal(pruefeReviewErgebnisFuer(REVIEW_POLICY_VERSION, { befunde: [], empfehlung: 'x' })?.halt.length, 1)
  assert.equal(pruefeReviewErgebnisFuer('review-policy-99', { befunde: [], empfehlung: 'x' }), null)
  assert.equal(pruefeReviewErgebnisFuer(null, { befunde: [], empfehlung: 'x' }), null)
})

test('pruefeReviewErgebnis: fehlende empfehlung bei leeren Befunden → Halt', () => {
  assert.equal(pruefeReviewErgebnis({ befunde: [], empfehlung: null }).halt.length, 1)
})

test('pruefeReviewErgebnis: vollständiger Befund → nichts', () => {
  assert.deepEqual(pruefeReviewErgebnis({ befunde: [VOLLER_BEFUND], empfehlung: 'Korrektur' }), { halt: [], hinweise: [] })
})

test('pruefeReviewErgebnis: null/fehlende Pflichtwerte und doppelte id → Hinweise, kein Halt', () => {
  const r = pruefeReviewErgebnis({
    befunde: [
      { ...VOLLER_BEFUND, korrekturrichtung: null },
      { ...VOLLER_BEFUND, dimension: undefined, evidenz: '' },
      { schwere: 'NIEDRIG', fundstelle: 'b.ts', zusammenfassung: 'z', beleg: 'w' },
    ],
    empfehlung: 'x',
  })
  assert.deepEqual(r.halt, [])
  assert.ok(r.hinweise.some((h) => h.includes("Befund 1 (B1): 'korrekturrichtung' fehlt")))
  assert.ok(r.hinweise.some((h) => h.includes("Befund 2 (B1): 'dimension' fehlt")))
  assert.ok(r.hinweise.some((h) => h.includes("Befund 2 (B1): 'evidenz' fehlt")))
  assert.ok(r.hinweise.some((h) => h.includes("Befund 3: 'id' fehlt")))
  assert.ok(r.hinweise.some((h) => h.includes("doppelte id 'B1'")))
})

test('F45 B2a-3b (F-1085 (11), Befund B1 des echten Codex-Laufs): leere fundstelle, zusammenfassung, beleg → Hinweise, kein Halt', () => {
  const r = pruefeReviewErgebnis({ befunde: [{ ...VOLLER_BEFUND, fundstelle: '', zusammenfassung: '  ', beleg: null }], empfehlung: 'Korrektur' })
  assert.deepEqual(r.halt, [])
  for (const feld of ['fundstelle', 'zusammenfassung', 'beleg']) assert.ok(r.hinweise.includes(`Befund 1 (B1): '${feld}' fehlt`), `${feld}: ${JSON.stringify(r.hinweise)}`)
  assert.equal(r.hinweise.length, 3)
})

test('pruefeReviewErgebnis: unbekannte Dimension/Evidenz → Hinweis', () => {
  const r = pruefeReviewErgebnis({ befunde: [{ ...VOLLER_BEFUND, dimension: 'stil', evidenz: 'sicher' }], empfehlung: 'x' })
  assert.ok(r.hinweise.some((h) => h.includes("unbekannte dimension 'stil'")))
  assert.ok(r.hinweise.some((h) => h.includes("unbekannte evidenz 'sicher'")))
})

test('pruefeReviewErgebnis: befunde kein Array → wie leer behandelt', () => {
  assert.equal(pruefeReviewErgebnis({ empfehlung: 'x' }).halt.length, 1)
})

// ─── F45 B2b-2a (F-1085 (4), Spec §8): BEREIT mit KRITISCH/HOCH ─────────────────────────────────────────────

test('zaehleSchwereBeiBereit: zählt KRITISCH und HOCH nur beim Urteil BEREIT', () => {
  const befunde = [{ schwere: 'HOCH' }, { schwere: 'KRITISCH' }, { schwere: 'MITTEL' }, { schwere: 'NIEDRIG' }]
  assert.equal(zaehleSchwereBeiBereit('BEREIT', befunde), 2)
  assert.equal(zaehleSchwereBeiBereit('BEREIT_NACH_KORREKTUR', befunde), 0)
  assert.equal(zaehleSchwereBeiBereit('BLOCKIERT', befunde), 0)
  assert.equal(zaehleSchwereBeiBereit(null, befunde), 0)
})

test('zaehleSchwereBeiBereit: leer, kein Array, Befund ohne schwere oder kein Objekt (roh aus dem Modell) ⇒ zählt nicht', () => {
  assert.equal(zaehleSchwereBeiBereit('BEREIT', []), 0)
  assert.equal(zaehleSchwereBeiBereit('BEREIT', null), 0)
  assert.equal(zaehleSchwereBeiBereit('BEREIT', [{}, null, 'HOCH', { schwere: 'hoch' }]), 0)
})
