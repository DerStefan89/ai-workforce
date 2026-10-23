/**
 * Datei: scripts/leitstand/automat-ausgang.test.mjs
 *
 * Zweck: Tests der aus dem Server ausgelagerten Abbildung Ausgang → Workflow-Status bzw. Grund (F45 FB-1a): jeder der sechs
 * Ausgänge von ermittleNaechstenSchritt, Rückfall für einen unbekannten Ausgang.
 *
 * Wird aufgerufen von: npm run test (node --test)
 *
 * Wichtig: rein, ohne Fixtures; ein neuer Ausgang gehört hier mit in die Tabelle.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { beschreibeAutomatAusgang, workflowStatusZuAusgang } from './automat-ausgang.mjs'

test('workflowStatusZuAusgang: alle Ausgänge, unbekannt ⇒ KLAERUNG_ERFORDERLICH', () => {
  const faelle = { starte: 'LAEUFT', haltFreigabe: 'WARTET_FREIGABE', haltGrenze: 'GESTOPPT', haltGestoppt: 'GESTOPPT', fertig: 'ABGESCHLOSSEN', haltKlaerung: 'KLAERUNG_ERFORDERLICH', neu: 'KLAERUNG_ERFORDERLICH' }
  for (const [art, status] of Object.entries(faelle)) assert.equal(workflowStatusZuAusgang({ art }), status, art)
})

test('beschreibeAutomatAusgang: Texte ohne grund-Feld, sonst der grund des Ausgangs', () => {
  assert.match(beschreibeAutomatAusgang({ art: 'haltFreigabe', schrittId: 's1' }), /Schritt 's1' verlangt eine menschliche Freigabe/)
  assert.match(beschreibeAutomatAusgang({ art: 'fertig' }), /durchgelaufen/)
  assert.match(beschreibeAutomatAusgang({ art: 'haltGestoppt' }), /GESTOPPT/)
  assert.match(beschreibeAutomatAusgang({ art: 'starte', schritt: { schritt_id: 's2' } }), /Schritt 's2' ist startbar/)
  assert.equal(beschreibeAutomatAusgang({ art: 'haltKlaerung', grund: 'weil' }), 'weil')
})
