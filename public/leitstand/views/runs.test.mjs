/**
 * Datei: public/leitstand/views/runs.test.mjs
 *
 * Zweck: node:test-Fälle für die Lauf-Detailansicht (F-828) — ein aktiver Lauf ohne Terminalmarke
 * zeigt „läuft“ statt „Klärung erforderlich“ und keine Maske „Klärung auflösen“; nach dem Ende
 * (aktiv false) bleibt die Anzeige wie vorher.
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderEntscheidungBlock, renderLaufStatus } from './runs.js'

/** laufStatus eines Laufs mit nur run_prepared (Muster Reallauf 8cee6c98). */
const NUR_RUN_PREPARED = {
  status: 'KLAERUNG_ERFORDERLICH',
  blockerId: 'b-1',
  grund: 'RUN_PREPARED ohne Terminalartefakt',
  aufloesungsbedingung: 'terminale Entscheidung',
  resumeZiel: 'lauf',
  evidenz: { offeneRunPreparedSequenzen: [2] },
}

test('F-828: aktiver Lauf ohne Terminalmarke → „läuft“, keine Maske „Klärung auflösen“', () => {
  const status = renderLaufStatus(NUR_RUN_PREPARED, null, true)
  assert.match(status, /Klärzustand: läuft/)
  assert.doesNotMatch(status, /Klärung erforderlich/)
  const block = renderEntscheidungBlock(NUR_RUN_PREPARED, null, true)
  assert.doesNotMatch(block, /Klärung auflösen|<select|<textarea|<button/)
  assert.match(block, /Entscheidung ist erst danach möglich/)
})

test('F-828: nicht aktiv (Server kennt den Lauf nicht mehr als laufend) → Klärzustand und Maske wie bisher', () => {
  assert.match(renderLaufStatus(NUR_RUN_PREPARED, null, false), /Klärzustand: Klärung erforderlich/)
  assert.match(renderEntscheidungBlock(NUR_RUN_PREPARED, null, false), /Entscheidung: Klärung auflösen/)
  assert.match(renderEntscheidungBlock(NUR_RUN_PREPARED, null), /Entscheidung: Klärung auflösen/, 'Default aktiv=false')
})

test('F-828: aktiv, aber schon ABGESCHLOSSEN (Terminalmarke da, Nachlauf) → unverändert terminal angezeigt', () => {
  const abgeschlossen = { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' }
  assert.match(renderLaufStatus(abgeschlossen, null, true), /ABGESCHLOSSEN \(ERFOLGREICH\)/)
})

test('F-828: aktiv im Nachlauf (ABGESCHLOSSEN, Prüfschritt läuft) → keine Maske Kenntnisnahme/terminal; Bypass-Fall behält „Antwort“', () => {
  for (const ergebnis of ['FEHLGESCHLAGEN', 'VERWEIGERT']) {
    const block = renderEntscheidungBlock({ status: 'ABGESCHLOSSEN', ergebnis }, { bypassVerdachtAnzahl: 0 }, true)
    assert.doesNotMatch(block, /Kenntnisnahme|<textarea|<button/, ergebnis)
    assert.match(block, /erneut öffnen/)
    assert.match(renderEntscheidungBlock({ status: 'ABGESCHLOSSEN', ergebnis }, { bypassVerdachtAnzahl: 0 }, false), /Entscheidung: Kenntnisnahme/, `${ergebnis} nach Laufende`)
  }
  assert.match(renderEntscheidungBlock({ status: 'ABGESCHLOSSEN', ergebnis: 'VERWEIGERT' }, { bypassVerdachtAnzahl: 2 }, true), /Entscheidung: Antwort auf Rückfrage/)
})
