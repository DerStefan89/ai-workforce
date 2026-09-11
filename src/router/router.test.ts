/**
 * Datei: src/router/router.test.ts
 *
 * Zweck: node:test-Fälle für src/router/index.ts (F18 WS-2). Zwei
 * Abschnitte: validiereErgebnisRouter (Rot-Abdeckung gegen
 * schemas/ergebnis-router.schema.json, Muster workflow.test.ts Abschnitt 1
 * — ein Rotfall pro mutiertem Feld statt einer JSON-Fixture je Regel) und
 * waehleWorkflowVorlage (lädt die drei echten Vorlagen unter
 * workflow-vorlagen/, keine Attrappen-Fixtures — die Vorlagen SIND die
 * geprüfte Produktionsdatei).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validiereErgebnisRouter, waehleWorkflowVorlage } from './index.ts'
import { validiereWorkflowDaten } from '../workflow/index.ts'
import type { ErgebnisRouter } from './types.ts'

const REPO_WURZEL = process.cwd()

/** Baut eine gültige Klassifikation als Mutationsbasis. */
function gueltigeKlassifikation(): Record<string, unknown> {
  return {
    kontrolltiefe: 'standard',
    risikoklasse: 'mittel',
    task_typen: ['bugfix'],
    rueckfragen: [],
    begruendung: 'Testbegründung.',
  }
}

// ─── validiereErgebnisRouter ────────────────────────────────────────────────

test('validiereErgebnisRouter: gültige Klassifikation liefert keine Verstöße', () => {
  assert.deepStrictEqual(validiereErgebnisRouter(gueltigeKlassifikation()), [])
})

test('validiereErgebnisRouter: Wurzel muss ein Objekt sein', () => {
  assert.deepStrictEqual(validiereErgebnisRouter(null), ['Wurzel ist kein Objekt'])
  assert.deepStrictEqual(validiereErgebnisRouter([1, 2]), ['Wurzel ist kein Objekt'])
  assert.deepStrictEqual(validiereErgebnisRouter('text'), ['Wurzel ist kein Objekt'])
})

test('validiereErgebnisRouter: unbekanntes Feld wird gemeldet', () => {
  const verstoesse = validiereErgebnisRouter({ ...gueltigeKlassifikation(), zusatz: 'x' })
  assert.ok(verstoesse.some((v) => v.includes("unbekanntes Feld 'zusatz'")))
})

for (const feld of ['kontrolltiefe', 'risikoklasse', 'task_typen', 'rueckfragen', 'begruendung']) {
  test(`validiereErgebnisRouter: fehlendes Pflichtfeld '${feld}' wird gemeldet`, () => {
    const daten = gueltigeKlassifikation()
    delete daten[feld]
    const verstoesse = validiereErgebnisRouter(daten)
    assert.ok(verstoesse.some((v) => v.includes(`Pflichtfeld '${feld}' fehlt`)))
  })
}

test("validiereErgebnisRouter: 'kontrolltiefe' muss aus der Enum-Menge sein", () => {
  const verstoesse = validiereErgebnisRouter({ ...gueltigeKlassifikation(), kontrolltiefe: 'schnell' })
  assert.ok(verstoesse.some((v) => v.includes("'kontrolltiefe' muss einer von")))
})

test("validiereErgebnisRouter: 'risikoklasse' muss aus der Enum-Menge sein", () => {
  const verstoesse = validiereErgebnisRouter({ ...gueltigeKlassifikation(), risikoklasse: 'extrem' })
  assert.ok(verstoesse.some((v) => v.includes("'risikoklasse' muss einer von")))
})

test("validiereErgebnisRouter: 'task_typen' darf nicht leer sein", () => {
  const verstoesse = validiereErgebnisRouter({ ...gueltigeKlassifikation(), task_typen: [] })
  assert.ok(verstoesse.some((v) => v.includes("'task_typen' muss ein Array mit mindestens einem Eintrag sein")))
})

test("validiereErgebnisRouter: 'task_typen'-Einträge müssen aus der Enum-Menge sein", () => {
  const verstoesse = validiereErgebnisRouter({ ...gueltigeKlassifikation(), task_typen: ['erfunden'] })
  assert.ok(verstoesse.some((v) => v.includes("'task_typen[0]' muss einer von")))
})

test("validiereErgebnisRouter: 'rueckfragen' muss ein Array nicht-leerer Strings sein", () => {
  assert.ok(validiereErgebnisRouter({ ...gueltigeKlassifikation(), rueckfragen: 'keine' }).some((v) => v.includes("'rueckfragen' muss ein Array sein")))
  assert.ok(validiereErgebnisRouter({ ...gueltigeKlassifikation(), rueckfragen: [''] }).some((v) => v.includes("'rueckfragen[0]' muss ein nicht-leerer String sein")))
})

test("validiereErgebnisRouter: 'begruendung' muss ein nicht-leerer String sein", () => {
  assert.ok(validiereErgebnisRouter({ ...gueltigeKlassifikation(), begruendung: '' }).some((v) => v.includes("'begruendung' muss ein nicht-leerer String sein")))
})

// ─── waehleWorkflowVorlage ───────────────────────────────────────────────────

function klassifikation(kontrolltiefe: ErgebnisRouter['kontrolltiefe']): ErgebnisRouter {
  return { kontrolltiefe, risikoklasse: 'mittel', task_typen: ['bugfix'], rueckfragen: [], begruendung: 'Test.' }
}

test('waehleWorkflowVorlage: fast-lane liefert genau einen ZWINGEND-Schreibschritt', () => {
  const workflow = waehleWorkflowVorlage(klassifikation('fast-lane'), 'auftrag-123', 'Testziel', REPO_WURZEL)
  assert.strictEqual(workflow.schritte.length, 1)
  assert.strictEqual(workflow.schritte[0].rolle, 'ausfuehrung')
  assert.strictEqual(workflow.schritte[0].werkzeugsatz, 'schreibend')
  assert.strictEqual(workflow.schritte[0].freigabe, 'ZWINGEND')
})

test('waehleWorkflowVorlage: standard liefert Review (AUTOMATISCH) gefolgt von Ausführung (ZWINGEND)', () => {
  const workflow = waehleWorkflowVorlage(klassifikation('standard'), 'auftrag-123', 'Testziel', REPO_WURZEL)
  assert.strictEqual(workflow.schritte.length, 2)
  assert.strictEqual(workflow.schritte[0].rolle, 'code-reviewer')
  assert.strictEqual(workflow.schritte[0].freigabe, 'AUTOMATISCH')
  assert.strictEqual(workflow.schritte[1].rolle, 'ausfuehrung')
  assert.strictEqual(workflow.schritte[1].freigabe, 'ZWINGEND')
  assert.strictEqual(workflow.schritte[0].nachfolger, workflow.schritte[1].schritt_id)
})

test('waehleWorkflowVorlage: hoch liefert drei ZWINGEND-Schritte (Architektur, Review, Ausführung)', () => {
  const workflow = waehleWorkflowVorlage(klassifikation('hoch'), 'auftrag-123', 'Testziel', REPO_WURZEL)
  assert.strictEqual(workflow.schritte.length, 3)
  assert.deepStrictEqual(
    workflow.schritte.map((s) => s.rolle),
    ['architecture-advisor', 'code-reviewer', 'ausfuehrung']
  )
  assert.ok(workflow.schritte.every((s) => s.freigabe === 'ZWINGEND'))
})

test('waehleWorkflowVorlage: workflow_id/auftrag_id/ziel werden aus den Platzhaltern befüllt', () => {
  const workflow = waehleWorkflowVorlage(klassifikation('fast-lane'), 'a1b2c3', 'Ein spezifisches Testziel', REPO_WURZEL)
  assert.strictEqual(workflow.workflow_id, 'router-a1b2c3')
  assert.strictEqual(workflow.auftrag_id, 'a1b2c3')
  assert.strictEqual(workflow.ziel, 'Ein spezifisches Testziel')
  assert.deepStrictEqual(workflow.schritte[0].eingaben, ['artefakt:auftrag-a1b2c3'])
})

test('waehleWorkflowVorlage: ziel mit Anführungszeichen/Backslash bleibt unverändert (Platzhalterersetzung nach dem Parsen)', () => {
  const ziel = 'Ändere "diese" Datei\\ mit Backslash und "Quotes".'
  const workflow = waehleWorkflowVorlage(klassifikation('fast-lane'), 'auftrag-x', ziel, REPO_WURZEL)
  assert.strictEqual(workflow.ziel, ziel)
})

test('waehleWorkflowVorlage: zwei verschiedene Aufträge erzeugen zwei verschiedene workflow_id', () => {
  const w1 = waehleWorkflowVorlage(klassifikation('fast-lane'), 'auftrag-eins', 'Ziel A', REPO_WURZEL)
  const w2 = waehleWorkflowVorlage(klassifikation('fast-lane'), 'auftrag-zwei', 'Ziel B', REPO_WURZEL)
  assert.notStrictEqual(w1.workflow_id, w2.workflow_id)
})

test('waehleWorkflowVorlage: status ist OFFEN (siehe Kopfkommentar), nie WARTET_FREIGABE', () => {
  for (const kontrolltiefe of ['fast-lane', 'standard', 'hoch'] as const) {
    const workflow = waehleWorkflowVorlage(klassifikation(kontrolltiefe), 'auftrag-123', 'Testziel', REPO_WURZEL)
    assert.strictEqual(workflow.status, 'OFFEN')
  }
})

test('waehleWorkflowVorlage: alle drei Vorlagen erzeugen ein vollständig gültiges WORKFLOW_V0 (validiereWorkflowDaten)', () => {
  for (const kontrolltiefe of ['fast-lane', 'standard', 'hoch'] as const) {
    const workflow = waehleWorkflowVorlage(klassifikation(kontrolltiefe), 'auftrag-123', 'Testziel', REPO_WURZEL)
    assert.deepStrictEqual(validiereWorkflowDaten(workflow), [], `Vorlage '${kontrolltiefe}' muss gültig sein`)
  }
})
