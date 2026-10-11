/**
 * Datei: scripts/leitstand/routen-arbeitsordner.test.mjs
 *
 * Zweck: node:test-Fälle für scripts/leitstand/routen-arbeitsordner.mjs (F45 B1a-1): Körper des Aufräumens
 * (Pflichtbegründung, verwerfen nur boolean), Sperrgründe (kein Artefakt, schon entfernt, Vorbereitung, aktiver
 * Lauf, nicht beendeter Ablauf; erlaubt bei ABGESCHLOSSEN/GESTOPPT und bei FEHLGESCHLAGEN) und die Liste.
 *
 * Wird aufgerufen von: npm run test (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { aufraeumenSperrgrund, baueArbeitsordnerListe, pruefeAufraeumenKoerper } from './routen-arbeitsordner.mjs'

test('Körper: Pflichtbegründung, verwerfen nur true/false', () => {
  assert.equal(pruefeAufraeumenKoerper({}).ok, false)
  assert.equal(pruefeAufraeumenKoerper({ begruendung: '   ' }).ok, false)
  assert.equal(pruefeAufraeumenKoerper({ begruendung: 'x', verwerfen: 'ja' }).ok, false)
  assert.equal(pruefeAufraeumenKoerper(null).ok, false)
  assert.deepEqual(pruefeAufraeumenKoerper({ begruendung: ' fertig ' }), { ok: true, begruendung: 'fertig', verwerfen: false })
  assert.deepEqual(pruefeAufraeumenKoerper({ begruendung: 'weg', verwerfen: true }), { ok: true, begruendung: 'weg', verwerfen: true })
})

test('Sperrgründe und erlaubte Lagen', () => {
  const lage = { workflowStatus: 'ABGESCHLOSSEN', arbeitsordnerStatus: 'BEREIT', laufAktiv: false, vorbereitungLaeuft: false }
  assert.equal(aufraeumenSperrgrund(lage), null)
  assert.equal(aufraeumenSperrgrund({ ...lage, workflowStatus: 'GESTOPPT' }), null)
  assert.equal(aufraeumenSperrgrund({ ...lage, workflowStatus: 'KLAERUNG_ERFORDERLICH', arbeitsordnerStatus: 'FEHLGESCHLAGEN' }), null)
  assert.match(aufraeumenSperrgrund({ ...lage, arbeitsordnerStatus: null }), /keinen eigenen Arbeitsordner/)
  assert.match(aufraeumenSperrgrund({ ...lage, arbeitsordnerStatus: 'ENTFERNT' }), /bereits aufgeräumt/)
  assert.match(aufraeumenSperrgrund({ ...lage, vorbereitungLaeuft: true }), /vorbereitet/)
  assert.match(aufraeumenSperrgrund({ ...lage, laufAktiv: true }), /Lauf oder eine Prüfung/)
  assert.match(aufraeumenSperrgrund({ ...lage, workflowStatus: 'LAEUFT' }), /nicht beendet/)
  assert.match(aufraeumenSperrgrund({ ...lage, abnahmeOffen: true }), /Abnahme ist noch offen/)
  assert.equal(aufraeumenSperrgrund({ ...lage, abnahmeOffen: true, arbeitsordnerStatus: 'FEHLGESCHLAGEN' }), null)
})

test('Liste: neueste zuerst, ohne Daten übersprungen', () => {
  const liste = baueArbeitsordnerListe([
    { workflowId: 'a', daten: { status: 'BEREIT', pfad: 'p', branch: 'wf/a', basis_commit: null, grund: null, aktualisiert_am: '2026-10-11T10:00:00Z' }, ordnerVorhanden: true },
    { workflowId: 'b', daten: { status: 'ENTFERNT', pfad: 'q', branch: 'wf/b', basis_commit: null, grund: null, aktualisiert_am: '2026-10-11T11:00:00Z' }, ordnerVorhanden: false },
    { workflowId: 'c', daten: null, ordnerVorhanden: false },
  ])
  assert.deepEqual(
    liste.arbeitsordner.map((e) => e.workflowId),
    ['b', 'a']
  )
})
