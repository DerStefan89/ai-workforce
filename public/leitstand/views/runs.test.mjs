/**
 * Datei: public/leitstand/views/runs.test.mjs
 *
 * Zweck: node:test-Fälle für die Lageregeln des Lauf-Details (F-828) — ein aktiver Lauf ohne
 * Terminalmarke zeigt „läuft“ statt „Klärung erforderlich“ und keine Maske „Klärung auflösen“; im
 * Nachlauf (Terminalmarke schon da, aktiv noch true) keine Maske 'terminal'/'kenntnisnahme', der
 * Bypass-Fall behält 'antwort'; nach dem Ende (aktiv false) bleibt die Anzeige wie vorher. Seit F44
 * WS-5a stehen die Regeln in views/lauf-detail.js (ermittleLaufLage, renderLaufNotiz,
 * renderLaufDialog, renderLaufStatus) — inhaltlich exakt die bisherigen von renderEntscheidungBlock.
 * Dazu die Wiederaufnahme-Regel (D-F10-1) für „Fortsetzung vorbereiten“.
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { darfFortsetzen, ermittleLaufLage, renderLaufDialog, renderLaufNotiz, renderLaufStatus } from './lauf-detail.js'

/** laufStatus eines Laufs mit nur run_prepared (Muster Reallauf 8cee6c98). */
const NUR_RUN_PREPARED = {
  status: 'KLAERUNG_ERFORDERLICH',
  blockerId: 'b-1',
  grund: 'RUN_PREPARED ohne Terminalartefakt',
  aufloesungsbedingung: 'terminale Entscheidung',
  resumeZiel: 'lauf',
  evidenz: { offeneRunPreparedSequenzen: [2] },
}

/** Notiz und Dialoge einer Lage, wie runs.js sie baut. */
function bedienung(laufStatus, verweigertDaten, aktiv) {
  const lage = ermittleLaufLage(laufStatus, verweigertDaten, aktiv)
  const notiz = renderLaufNotiz(lage, { laufStatus, verweigertDaten, fortsetzung: darfFortsetzen(laufStatus, lage, aktiv), aktiv: aktiv === true })
  const dialog = (art) => renderLaufDialog(art, { laufId: 'l-1', lage, aktiv: aktiv === true })
  return { lage, notiz, dialog }
}

test('F-828: aktiver Lauf ohne Terminalmarke → „läuft“, keine Maske „Klärung auflösen“', () => {
  const status = renderLaufStatus(NUR_RUN_PREPARED, null, true)
  assert.match(status, /Klärzustand: läuft/)
  assert.doesNotMatch(status, /Klärung erforderlich/)
  const { lage, notiz, dialog } = bedienung(NUR_RUN_PREPARED, null, true)
  assert.equal(lage, 'laeuft')
  assert.doesNotMatch(notiz, /terminal-oeffnen|kenntnisnahme-oeffnen|antwort-oeffnen|fortsetzung/)
  assert.match(notiz, /Eine Entscheidung ist erst nach dem Ende möglich/)
  assert.match(notiz, /data-aktion="abbrechen-oeffnen"/)
  assert.equal(dialog('terminal'), null)
  assert.equal(dialog('kenntnisnahme'), null)
})

test('F-828: nicht aktiv (Server kennt den Lauf nicht mehr als laufend) → Klärzustand und Maske wie bisher', () => {
  assert.match(renderLaufStatus(NUR_RUN_PREPARED, null, false), /Klärzustand: Klärung erforderlich/)
  const { lage, notiz, dialog } = bedienung(NUR_RUN_PREPARED, null, false)
  assert.equal(lage, 'klaerung')
  assert.match(notiz, /data-aktion="terminal-oeffnen"/)
  assert.match(dialog('terminal'), /Klärung auflösen/)
  assert.match(dialog('terminal'), /id="entscheidung-terminal-begruendung"/)
  assert.equal(ermittleLaufLage(NUR_RUN_PREPARED, null), 'klaerung', 'Default aktiv=false')
  assert.equal(dialog('abbrechen'), null, 'kein Abbruch ohne aktiven Lauf')
})

test('F-828: aktiv, aber schon ABGESCHLOSSEN (Terminalmarke da, Nachlauf) → unverändert terminal angezeigt', () => {
  const abgeschlossen = { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' }
  assert.match(renderLaufStatus(abgeschlossen, null, true), /ABGESCHLOSSEN \(ERFOLGREICH\)/)
})

test('F-828: aktiv im Nachlauf (ABGESCHLOSSEN, Prüfschritt läuft) → keine Maske Kenntnisnahme/terminal; Bypass-Fall behält „Antwort“', () => {
  for (const ergebnis of ['FEHLGESCHLAGEN', 'VERWEIGERT']) {
    const laufend = bedienung({ status: 'ABGESCHLOSSEN', ergebnis }, { bypassVerdachtAnzahl: 0 }, true)
    assert.equal(laufend.lage, 'laeuft', ergebnis)
    assert.doesNotMatch(laufend.notiz, /kenntnisnahme-oeffnen|terminal-oeffnen/, ergebnis)
    assert.equal(laufend.dialog('kenntnisnahme'), null, ergebnis)
    assert.match(laufend.notiz, /Stand beim Öffnen/)
    const danach = bedienung({ status: 'ABGESCHLOSSEN', ergebnis }, { bypassVerdachtAnzahl: 0 }, false)
    assert.equal(danach.lage, 'fehler', `${ergebnis} nach Laufende`)
    assert.match(danach.dialog('kenntnisnahme'), /Fehler zur Kenntnis nehmen/, `${ergebnis} nach Laufende`)
  }
  const bypass = bedienung({ status: 'ABGESCHLOSSEN', ergebnis: 'VERWEIGERT' }, { bypassVerdachtAnzahl: 2, isError: false, nonExecutionKind: 'x' }, true)
  assert.equal(bypass.lage, 'rueckfrage')
  assert.match(bypass.dialog('antwort'), /Rückfrage beantworten/)
  assert.equal(bypass.dialog('kenntnisnahme'), null, 'Bypass-Fall: keine bloße Kenntnisnahme (E-186)')
})

test('D-F10-1: „Fortsetzung vorbereiten“ bei offener Klärung oder Fehlschlag, nicht bei Erfolg und nicht, solange der Lauf läuft', () => {
  assert.equal(darfFortsetzen(NUR_RUN_PREPARED, 'klaerung'), true)
  assert.equal(darfFortsetzen({ status: 'ABGESCHLOSSEN', ergebnis: 'FEHLGESCHLAGEN' }, 'fehler'), true)
  assert.equal(darfFortsetzen({ status: 'ABGESCHLOSSEN', ergebnis: 'VERWEIGERT' }, 'rueckfrage'), true)
  assert.equal(darfFortsetzen({ status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' }, 'erfolg'), false)
  assert.equal(darfFortsetzen(NUR_RUN_PREPARED, 'laeuft'), false)
  assert.equal(darfFortsetzen({ status: 'NICHT_GESTARTET' }, 'sonst'), false)
})

test('F-828 Bypass-Fall im Nachlauf (aktiv): „Rückfrage beantworten“ und „Lauf abbrechen“, keine Fortsetzung; nach dem Ende umgekehrt', () => {
  const vd = { bypassVerdachtAnzahl: 1, isError: false, nonExecutionKind: 'x' }
  const verweigert = { status: 'ABGESCHLOSSEN', ergebnis: 'VERWEIGERT' }
  const laufend = bedienung(verweigert, vd, true)
  assert.equal(laufend.lage, 'rueckfrage')
  assert.match(laufend.notiz, /data-aktion="antwort-oeffnen"/)
  assert.match(laufend.notiz, /data-aktion="abbrechen-oeffnen"/, 'Abbruch hängt wie bisher an aktiv')
  assert.doesNotMatch(laufend.notiz, /data-aktion="fortsetzung"/, 'keine Fortsetzung, solange der Lauf läuft')
  assert.match(laufend.dialog('abbrechen'), /Lauf abbrechen/)
  const danach = bedienung(verweigert, vd, false)
  assert.match(danach.notiz, /data-aktion="fortsetzung"/)
  assert.doesNotMatch(danach.notiz, /abbrechen-oeffnen/)
  assert.equal(danach.dialog('abbrechen'), null)
})
