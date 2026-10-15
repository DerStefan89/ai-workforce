/**
 * Datei: public/leitstand/rollen-kreis.test.mjs
 *
 * Zweck: node:test-Fälle für den Baustein Rollen-Kreis (F46 D1, rollen-kreis.js): Abbildung
 * Schritt-Rolle → Kreis-Rolle, Status je Rolle (fertig/jetzt/offen) aus den Workflow-Schritten,
 * Prüfschritt und Abnahme aus Prüfergebnis und Abnahme-Entscheidung, Satelliten ohne Quelle,
 * Vorauswahl, Tastatur (Register-Muster) und das gerenderte Register (Status nie nur als Farbe,
 * Schritt-Werte escaped).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ROLLEN } from './rollen-anzeige.js'
import { ALLE_KREIS_ROLLEN, KREIS_ROLLE_JE_SCHRITT_ROLLE, KREIS_ROLLEN, kreisStatus, naechsteKreisRolle, rollenKreisHtml, SATELLITEN, vorgewaehlteRolle } from './rollen-kreis.js'

/** Kurzform eines Workflow-Schritts. */
const schritt = (rolle, status, laufId = null, worker = 'claude-code') => ({ schritt_id: `s-${rolle}`, rolle, status, lauf_id: laufId, worker })

/** Nur die Status je Rolle. */
const nurStatus = (ergebnis) => Object.fromEntries(Object.entries(ergebnis).map(([rolle, { status }]) => [rolle, status]))

test('Abbildung: die fünf Schritt-Rollen der Workflow-Vorlagen, Reviewer ≠ Satellit code-reviewer, qa = Satellit qa (F45 B2b-2b-2)', () => {
  assert.deepEqual(KREIS_ROLLE_JE_SCHRITT_ROLLE, { architekt: 'planner', 'architecture-advisor': 'advisor', ausfuehrung: 'builder', 'code-reviewer': 'reviewer', qa: 'qa' })
  for (const schrittRolle of Object.keys(KREIS_ROLLE_JE_SCHRITT_ROLLE)) assert.ok(ROLLEN.includes(schrittRolle), `${schrittRolle} ist keine bekannte Rolle`)
  assert.deepEqual(KREIS_ROLLEN, ['planner', 'advisor', 'builder', 'pruefschritt', 'reviewer', 'abnahme'])
  assert.deepEqual(SATELLITEN, ['code-reviewer', 'qa', 'design-guardian'])
  // Seit B2b-2b-2 hat genau ein Satellit eine Quelle: der qa-Schritt der Vorlagen standard/hoch.
  assert.deepEqual(
    Object.values(KREIS_ROLLE_JE_SCHRITT_ROLLE).filter((kreis) => SATELLITEN.includes(kreis)),
    ['qa']
  )
})

test('ohne Workflow (oder ohne Schritte): alle Rollen und Satelliten offen', () => {
  for (const nachtrag of [null, undefined, {}, { schritte: [] }, { schritte: 'kaputt' }]) {
    const ergebnis = kreisStatus(nachtrag)
    assert.deepEqual(Object.keys(ergebnis).sort(), [...ALLE_KREIS_ROLLEN].sort())
    assert.ok(Object.values(ergebnis).every((e) => e.status === 'offen' && e.schritt === null))
  }
})

test('Workflow hoch: Planner/Advisor fertig, Builder läuft, Reviewer offen', () => {
  const nachtrag = {
    workflowStatus: 'LAEUFT',
    schritte: [schritt('architekt', 'ERFOLGREICH', 'l1', 'codex'), schritt('architecture-advisor', 'ERFOLGREICH', 'l2'), schritt('ausfuehrung', 'LAEUFT', 'l3'), schritt('code-reviewer', 'OFFEN', null, 'codex')],
  }
  const ergebnis = kreisStatus(nachtrag)
  assert.deepEqual(nurStatus(ergebnis), { planner: 'fertig', advisor: 'fertig', builder: 'jetzt', pruefschritt: 'offen', reviewer: 'offen', abnahme: 'offen', 'code-reviewer': 'offen', qa: 'offen', 'design-guardian': 'offen' })
  assert.equal(ergebnis.builder.schritt.lauf_id, 'l3')
  assert.equal(ergebnis.planner.schritt.lauf_id, 'l1')
  assert.equal(vorgewaehlteRolle(ergebnis), 'builder')
})

test('wartet auf Freigabe, verweigert oder fehlgeschlagen: offen, nicht fertig', () => {
  for (const status of ['WARTET_FREIGABE', 'VERWEIGERT', 'FEHLGESCHLAGEN', 'OFFEN']) {
    assert.equal(kreisStatus({ schritte: [schritt('ausfuehrung', status)] }).builder.status, 'offen', status)
  }
  // Nur übersprungen ist nicht fertig; erfolgreich + übersprungen ist fertig.
  assert.equal(kreisStatus({ schritte: [schritt('ausfuehrung', 'UEBERSPRUNGEN')] }).builder.status, 'offen')
  assert.equal(kreisStatus({ schritte: [schritt('ausfuehrung', 'ERFOLGREICH'), { ...schritt('ausfuehrung', 'UEBERSPRUNGEN'), schritt_id: 's2' }] }).builder.status, 'fertig')
  // Ein zweiter, noch offener Bau-Schritt (Reparatur) macht den Builder wieder offen.
  assert.equal(kreisStatus({ schritte: [schritt('ausfuehrung', 'ERFOLGREICH', 'a'), { ...schritt('ausfuehrung', 'OFFEN'), schritt_id: 's2' }] }).builder.status, 'offen')
})

test('Prüfschritt: fertig nur bei Prüfergebnis GRUEN', () => {
  const basis = { schritte: [schritt('ausfuehrung', 'ERFOLGREICH', 'l1')] }
  assert.equal(kreisStatus({ ...basis, pruefergebnis: { status: 'ok', ergebnis: 'GRUEN' } }).pruefschritt.status, 'fertig')
  assert.equal(kreisStatus({ ...basis, pruefergebnis: { status: 'ok', ergebnis: 'ROT' } }).pruefschritt.status, 'offen')
  assert.equal(kreisStatus({ ...basis, pruefergebnis: { status: 'nicht_vorhanden' } }).pruefschritt.status, 'offen')
  assert.equal(kreisStatus({ ...basis, pruefergebnis: null }).pruefschritt.status, 'offen')
})

test('Abnahme: fertig bei gültigem ANGENOMMEN, jetzt bei abgeschlossenem Workflow ohne gültige Entscheidung', () => {
  const basis = { schritte: [schritt('ausfuehrung', 'ERFOLGREICH', 'l1'), schritt('code-reviewer', 'ERFOLGREICH', 'l2', 'codex')], workflowStatus: 'ABGESCHLOSSEN' }
  assert.equal(kreisStatus({ ...basis, abnahmeEntscheidung: { status: 'ok', ergebnis: 'ANGENOMMEN' } }).abnahme.status, 'fertig')
  const wartet = kreisStatus({ ...basis, abnahmeEntscheidung: { status: 'nicht_vorhanden' } })
  assert.equal(wartet.abnahme.status, 'jetzt')
  assert.equal(vorgewaehlteRolle(wartet), 'abnahme')
  assert.equal(kreisStatus({ ...basis, abnahmeEntscheidung: { status: 'veraltet', ergebnis: 'ANGENOMMEN' } }).abnahme.status, 'jetzt')
  assert.equal(kreisStatus({ ...basis, abnahmeEntscheidung: { status: 'ok', ergebnis: 'ABGELEHNT' } }).abnahme.status, 'offen')
  assert.equal(kreisStatus({ ...basis, workflowStatus: 'LAEUFT', abnahmeEntscheidung: null }).abnahme.status, 'offen')
  // Prüfpass D1 (cr 1): Abnahme-Quelle nicht ladbar (null) → offen, nicht „wartet auf dich“.
  assert.equal(kreisStatus({ ...basis, abnahmeEntscheidung: null }).abnahme.status, 'offen')
  assert.equal(kreisStatus({ ...basis }).abnahme.status, 'offen')
})

test('F45 B2b-2b-2: der Satellit qa folgt dem qa-Schritt (läuft/fertig/offen); code-reviewer und design-guardian bleiben offen', () => {
  const fertig = kreisStatus({ schritte: [schritt('ausfuehrung', 'ERFOLGREICH', 'l1'), schritt('code-reviewer', 'ERFOLGREICH', 'l2', 'codex'), schritt('qa', 'ERFOLGREICH', 'l9')] })
  assert.equal(fertig.qa.status, 'fertig')
  assert.equal(fertig.qa.schritt.lauf_id, 'l9')
  assert.equal(fertig['code-reviewer'].status, 'offen')
  assert.equal(fertig['design-guardian'].status, 'offen')
  assert.equal(kreisStatus({ schritte: [schritt('qa', 'FEHLGESCHLAGEN', 'l9')] }).qa.status, 'offen')
  const laeuft = kreisStatus({ schritte: [schritt('ausfuehrung', 'ERFOLGREICH', 'l1'), schritt('code-reviewer', 'ERFOLGREICH', 'l2', 'codex'), schritt('qa', 'LAEUFT', 'l9')] })
  assert.equal(laeuft.qa.status, 'jetzt')
  // Advisor A8: die Vorauswahl folgt der laufenden Rolle auch bei einem Satelliten (sonst Mitte „qa läuft“, Panel Builder).
  assert.equal(vorgewaehlteRolle(laeuft), 'qa')
})

test('Vorauswahl ohne „jetzt“: Builder', () => {
  assert.equal(vorgewaehlteRolle(kreisStatus(null)), 'builder')
})

test('Tastatur: Pfeil rechts/links, Pos1, Ende über alle neun Rollen; andere Tasten wählen nichts', () => {
  assert.equal(naechsteKreisRolle('planner', 'ArrowRight'), 'advisor')
  assert.equal(naechsteKreisRolle('planner', 'ArrowLeft'), 'design-guardian')
  assert.equal(naechsteKreisRolle('abnahme', 'ArrowRight'), 'code-reviewer')
  assert.equal(naechsteKreisRolle('design-guardian', 'ArrowRight'), 'planner')
  assert.equal(naechsteKreisRolle('qa', 'Home'), 'planner')
  assert.equal(naechsteKreisRolle('qa', 'End'), 'design-guardian')
  assert.equal(naechsteKreisRolle('qa', 'Enter'), null)
})

test('Register: neun Reiter, genau einer gewählt und per Tab erreichbar, Status als Text, aria-controls aufs Panel', () => {
  const status = kreisStatus({ schritte: [schritt('ausfuehrung', 'LAEUFT', 'l3')] })
  const html = rollenKreisHtml({ status, auswahl: 'builder', panelId: 'panel-x', mitteHtml: '<span>Mitte</span>' })
  assert.match(html, /role="tablist"/)
  assert.equal((html.match(/role="tab"/g) ?? []).length, 9)
  assert.equal((html.match(/aria-selected="true"/g) ?? []).length, 1)
  assert.equal((html.match(/tabindex="0"/g) ?? []).length, 1)
  assert.match(html, /id="rollen-kreis-tab-builder"[^>]*data-status="jetzt"[^>]*aria-selected="true"[^>]*aria-controls="panel-x"[^>]*tabindex="0"/)
  assert.equal((html.match(/aria-controls="panel-x"/g) ?? []).length, 9)
  // Status steht als Text (sr-only) in jedem Reiter, nicht nur als Farbe.
  assert.equal((html.match(/class="sr-only"/g) ?? []).length, 9)
  assert.match(html, /<span>Mitte<\/span>/)
})

test('F46 D3: eigenes ID-Präfix der Reiter (Detail neben der Übersicht im DOM), Standard bleibt rollen-kreis', () => {
  const status = kreisStatus(null)
  const standard = rollenKreisHtml({ status, auswahl: 'builder', panelId: 'p', mitteHtml: '' })
  assert.match(standard, /id="rollen-kreis-tab-builder"/)
  const detail = rollenKreisHtml({ status, auswahl: 'builder', panelId: 'p', mitteHtml: '', idPraefix: 'detail-kreis' })
  assert.match(detail, /id="detail-kreis-tab-builder"/)
  assert.doesNotMatch(detail, /id="rollen-kreis-tab-/)
})
