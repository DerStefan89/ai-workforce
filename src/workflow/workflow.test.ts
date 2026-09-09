/**
 * Datei: src/workflow/workflow.test.ts
 *
 * Zweck: node:test-Fälle für validiereWorkflowDaten (F15 WS-1). Trägt die
 * Rot-Abdeckung der Formregeln, die scripts/check-f15-workflow.mjs bewusst
 * NICHT als eigene JSON-Fixture führt — Enums, Zahlgrenzen, leere Strings,
 * fehlende Pflichtfelder, unbekannte Felder, Nicht-Objekt-/Nicht-Array-
 * Wurzeln, eingaben-Format. Hier ist ein Rotfall eine Zeile, als Fixture
 * wäre er eine Datei; bei rund dreißig behaupteten Grenzen entscheidet das
 * über Lesbarkeit.
 *
 * Anlass (Reviewer-/QA-Pass 09.09.2026): ARCHITECTURE.md §8 — "Ohne
 * kalibrierten Rot- und Grün-Fall wird sie nicht ERZWUNGEN genannt." Vor
 * dieser Datei kalibrierten fünf Fixtures vier von rund dreißig Regeln;
 * das Streichen etwa der additionalProperties- oder der Enum-Prüfung wäre
 * unbemerkt grün durchgelaufen.
 *
 * Aufbau: jeder Rotfall mutiert genau EIN Feld der gemeinsamen, gültigen
 * Basis aus gueltigerWorkflow(). Bleibt der Grünfall grün und schlägt jede
 * Mutation einzeln fehl, ist die jeweilige Regel wirksam und nicht bloß
 * behauptet.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validiereWorkflowDaten } from './index.ts'

/** Baut einen frischen, gültigen Zweischritt-Workflow als Mutationsbasis. */
function gueltigerWorkflow(): Record<string, unknown> {
  return {
    workflow_schema: 'v0',
    workflow_id: 'test-workflow',
    auftrag_id: 'test-auftrag',
    version: 1,
    ziel: 'Testziel',
    status: 'OFFEN',
    aktiver_schritt_id: 'schritt-1',
    grenzen: { max_schritte: 8, max_replans: 2 },
    schritte: [gueltigerSchritt('schritt-1', 'schritt-2'), gueltigerSchritt('schritt-2', null)],
  }
}

/**
 * Baut einen gültigen Schritt als Mutationsbasis.
 * @param schrittId - schritt_id des Schritts
 * @param nachfolger - schritt_id des Folgeschritts oder null für das Ende
 * @returns gültiges schritte[]-Element
 */
function gueltigerSchritt(schrittId: string, nachfolger: string | null): Record<string, unknown> {
  return {
    schritt_id: schrittId,
    rolle: 'code-reviewer',
    werkzeugsatz: 'lesend',
    worker: 'claude-code',
    modell: 'test-modell',
    eingaben: ['artefakt:auftrag-test-auftrag'],
    output_schema: null,
    freigabe: 'AUTOMATISCH',
    risiko: 'Testrisiko',
    zeitgrenze_ms: 600000,
    nachfolger,
    status: 'OFFEN',
    lauf_id: null,
  }
}

/**
 * Wendet eine Mutation auf die gültige Basis an und liefert das Ergebnis.
 * @param mutiere - ändert den übergebenen Workflow in place
 * @returns Verstoßliste von validiereWorkflowDaten
 */
function pruefeMutiert(mutiere: (w: Record<string, unknown>) => void): string[] {
  const workflow = gueltigerWorkflow()
  mutiere(workflow)
  return validiereWorkflowDaten(workflow)
}

/** Greift auf den ersten Schritt der Basis zu (Testhilfe, spart Casts an jeder Mutation). */
function ersterSchritt(workflow: Record<string, unknown>): Record<string, unknown> {
  return (workflow.schritte as Record<string, unknown>[])[0]
}

test('Grünfall: die Mutationsbasis selbst ist gültig', () => {
  assert.deepStrictEqual(validiereWorkflowDaten(gueltigerWorkflow()), [])
})

test('Grünfall: leeres eingaben-Array und gesetzte optionale Felder sind gültig', () => {
  const verstoesse = pruefeMutiert((w) => {
    const schritt = ersterSchritt(w)
    schritt.eingaben = []
    schritt.output_schema = 'kontrollzustand-laufakte'
    schritt.status = 'ERFOLGREICH'
    schritt.lauf_id = 'lauf-1'
    schritt.worker = 'codex'
    schritt.freigabe = 'EMPFOHLEN'
    w.status = 'LAEUFT'
    w.aktiver_schritt_id = 'schritt-2'
  })
  assert.deepStrictEqual(verstoesse, [])
})

test('Grünfall: aktiver_schritt_id darf null sein', () => {
  assert.deepStrictEqual(
    pruefeMutiert((w) => {
      w.aktiver_schritt_id = null
    }),
    []
  )
})

// ─── Rotfälle Wurzelebene ───────────────────────────────────────────────────

const wurzelRotfaelle: [string, (w: Record<string, unknown>) => void][] = [
  ['unbekanntes Feld auf Wurzelebene', (w) => { w.zusatz = 'verboten' }],
  ['unbekanntes Feld in grenzen', (w) => { (w.grenzen as Record<string, unknown>).max_dauer = 1 }],
  ['workflow_schema falsch', (w) => { w.workflow_schema = 'v1' }],
  ['workflow_id leer', (w) => { w.workflow_id = '' }],
  ['workflow_id fehlt', (w) => { delete w.workflow_id }],
  ['auftrag_id leer', (w) => { w.auftrag_id = '' }],
  ['ziel leer', (w) => { w.ziel = '' }],
  ['version 0', (w) => { w.version = 0 }],
  ['version nicht ganzzahlig', (w) => { w.version = 1.5 }],
  ['version als String', (w) => { w.version = '1' }],
  ['status außerhalb des Enums', (w) => { w.status = 'FERTIG' }],
  ['status fehlt', (w) => { delete w.status }],
  ['aktiver_schritt_id fehlt', (w) => { delete w.aktiver_schritt_id }],
  ['aktiver_schritt_id leerer String', (w) => { w.aktiver_schritt_id = '' }],
  ['grenzen fehlt', (w) => { delete w.grenzen }],
  ['grenzen kein Objekt', (w) => { w.grenzen = [] }],
  ['max_schritte 0', (w) => { (w.grenzen as Record<string, unknown>).max_schritte = 0 }],
  ['max_replans negativ', (w) => { (w.grenzen as Record<string, unknown>).max_replans = -1 }],
  ['schritte leer', (w) => { w.schritte = [] }],
  ['schritte kein Array', (w) => { w.schritte = {} }],
  ['schritte fehlt', (w) => { delete w.schritte }],
  ['schritte-Element kein Objekt', (w) => { w.schritte = ['schritt-1'] }],
]

for (const [name, mutiere] of wurzelRotfaelle) {
  test(`Rotfall Wurzel: ${name}`, () => {
    assert.ok(pruefeMutiert(mutiere).length > 0, `${name} wurde fälschlich als gültig gewertet`)
  })
}

// ─── Rotfälle Schrittebene ──────────────────────────────────────────────────

const schrittRotfaelle: [string, (s: Record<string, unknown>) => void][] = [
  ['unbekanntes Feld', (s) => { s.wiederholungen = 3 }],
  ['schritt_id leer', (s) => { s.schritt_id = '' }],
  ['rolle leer', (s) => { s.rolle = '' }],
  ['werkzeugsatz fehlt', (s) => { delete s.werkzeugsatz }],
  ['worker außerhalb des Enums', (s) => { s.worker = 'gemini' }],
  ['modell leer', (s) => { s.modell = '' }],
  ['eingaben kein Array', (s) => { s.eingaben = 'artefakt:x' }],
  ['eingaben ohne artefakt:-Präfix', (s) => { s.eingaben = ['auftrag-test-auftrag'] }],
  ['eingaben nur Präfix ohne Kennung', (s) => { s.eingaben = ['artefakt:'] }],
  ['eingaben-Element kein String', (s) => { s.eingaben = [42] }],
  ['output_schema fehlt', (s) => { delete s.output_schema }],
  ['output_schema leerer String', (s) => { s.output_schema = '' }],
  ['freigabe außerhalb des Enums', (s) => { s.freigabe = 'VIELLEICHT' }],
  ['risiko leer', (s) => { s.risiko = '' }],
  ['zeitgrenze_ms 0', (s) => { s.zeitgrenze_ms = 0 }],
  ['zeitgrenze_ms negativ', (s) => { s.zeitgrenze_ms = -1 }],
  ['zeitgrenze_ms nicht ganzzahlig', (s) => { s.zeitgrenze_ms = 1.5 }],
  ['nachfolger fehlt', (s) => { delete s.nachfolger }],
  ['status außerhalb des Enums', (s) => { s.status = 'FERTIG' }],
  ['lauf_id fehlt', (s) => { delete s.lauf_id }],
  ['lauf_id leerer String', (s) => { s.lauf_id = '' }],
]

for (const [name, mutiere] of schrittRotfaelle) {
  test(`Rotfall Schritt: ${name}`, () => {
    assert.ok(
      pruefeMutiert((w) => mutiere(ersterSchritt(w))).length > 0,
      `${name} wurde fälschlich als gültig gewertet`
    )
  })
}

// ─── Rotfälle Querverweise (zusätzlich zu den JSON-Fixtures des Gates) ───────

test('Rotfall Querverweis: Selbstverweis in nachfolger ist ein Zyklus', () => {
  const verstoesse = pruefeMutiert((w) => {
    ersterSchritt(w).nachfolger = 'schritt-1'
  })
  assert.deepStrictEqual(verstoesse, ["'schritte' enthält einen Zyklus über 'nachfolger': schritt-1 -> schritt-1"])
})

test('Rotfall Querverweis: Zweierzyklus wird genau einmal gemeldet', () => {
  const verstoesse = pruefeMutiert((w) => {
    // schritt-1 -> schritt-2 besteht bereits; die Rückkante schließt den Kreis.
    ;(w.schritte as Record<string, unknown>[])[1].nachfolger = 'schritt-1'
  })
  assert.deepStrictEqual(verstoesse, [
    "'schritte' enthält einen Zyklus über 'nachfolger': schritt-1 -> schritt-2 -> schritt-1",
  ])
})

test('Zyklus: ein Vorlauf in den Kreis meldet nur den Kreis, nicht den Vorlauf', () => {
  // schritt-0 -> schritt-1 -> schritt-2 -> schritt-1: schritt-0 gehört nicht dazu.
  const workflow = gueltigerWorkflow()
  const schritte = workflow.schritte as Record<string, unknown>[]
  schritte.unshift(gueltigerSchritt('schritt-0', 'schritt-1'))
  schritte[2].nachfolger = 'schritt-1'
  assert.deepStrictEqual(validiereWorkflowDaten(workflow), [
    "'schritte' enthält einen Zyklus über 'nachfolger': schritt-1 -> schritt-2 -> schritt-1",
  ])
})

test('Grünfall Zyklus: zwei Schritte, die auf denselben Nachfolger zeigen, sind kein Zyklus', () => {
  const workflow = gueltigerWorkflow()
  const schritte = workflow.schritte as Record<string, unknown>[]
  schritte.unshift(gueltigerSchritt('schritt-0', 'schritt-2'))
  assert.deepStrictEqual(validiereWorkflowDaten(workflow), [])
})

test('Rotfall Querverweis: leerer String in nachfolger ist ein Verstoß, null nicht', () => {
  assert.ok(pruefeMutiert((w) => { ersterSchritt(w).nachfolger = '' }).length > 0)
  assert.deepStrictEqual(pruefeMutiert((w) => { ersterSchritt(w).nachfolger = null }), [])
})

test('Rotfall Wurzel: Nicht-Objekte werden abgelehnt', () => {
  for (const wert of [null, undefined, 'text', 42, [], true]) {
    assert.deepStrictEqual(validiereWorkflowDaten(wert), ['Wurzel ist kein Objekt'], `Wert ${JSON.stringify(wert)}`)
  }
})
