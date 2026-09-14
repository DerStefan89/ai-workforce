/**
 * Datei: src/workboard/workboard.test.ts
 *
 * Zweck: node:test-Fälle für src/workboard/ (F21 WS-1). Vier Abschnitte:
 * parseFindings (Grünfall plus die drei Rot-Fälle aus AK1/AK6 — nicht
 * parsebare Kopfzeile, doppelte ID, fehlendes Titel-Feld), normalisiereStatus,
 * parseFeatureAkten, baueWorkitemListe (Merge/Filter/Sortierung).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseFeatureAkten } from './features.ts'
import { normalisiereStatus, parseFindings } from './findings.ts'
import { baueWorkitemListe } from './index.ts'
import { projiziereFehlgeschlageneLaeufe } from './failed-runs.ts'

// ─── parseFindings: Grünfall ────────────────────────────────────────────────

const EIN_FINDING = `# Findings-Register

**F-001** · \`BUG\` · P1 · offen
Titel: Beispieltitel.
Beschreibung: Beispielbeschreibung
über zwei Zeilen.
Fundstelle: irgendwo.
Auswirkung: gering.
Maßnahme: keine.
Feature/Run: F0, 01.01.2026.
`

test('parseFindings: ein vollständiger Eintrag wird korrekt geparst, keine Befunde', () => {
  const { workitems, befunde } = parseFindings(EIN_FINDING)
  assert.deepStrictEqual(befunde, [])
  assert.strictEqual(workitems.length, 1)
  const [w] = workitems
  assert.strictEqual(w.id, 'F-001')
  assert.strictEqual(w.typ, 'BUG')
  assert.strictEqual(w.prioritaet, 'P1')
  assert.strictEqual(w.status, 'OFFEN')
  assert.strictEqual(w.statusRoh, 'offen')
  assert.strictEqual(w.titel, 'Beispieltitel.')
  assert.strictEqual(w.beschreibung, 'Beispielbeschreibung\nüber zwei Zeilen.')
  assert.strictEqual(w.fundstelle, 'irgendwo.')
  assert.strictEqual(w.auswirkung, 'gering.')
  assert.strictEqual(w.massnahme, 'keine.')
  assert.strictEqual(w.featureRun, 'F0, 01.01.2026.')
})

// ─── parseFindings: Rot-Fall 1 — nicht parsebare Kopfzeile (AK1/AK6) ───────

test('parseFindings: eine Kopfzeile mit fehlerhaftem Muster wird als Befund gemeldet, nicht verschluckt', () => {
  const inhalt = `**F-002** BUG P1 offen ohne die richtigen Trenner\nTitel: Wird nie erreicht.\n`
  const { workitems, befunde } = parseFindings(inhalt)
  assert.strictEqual(workitems.length, 0)
  assert.strictEqual(befunde.length, 1)
  assert.strictEqual(befunde[0].art, 'nicht_parsebare_kopfzeile')
  assert.strictEqual(befunde[0].zeile, 1)
})

// ─── parseFindings: Rot-Fall 2 — doppelt vergebene ID (AK1/AK6, F-367) ─────

test('parseFindings: eine doppelt vergebene ID wird als Befund gemeldet, beide Einträge bleiben erhalten', () => {
  const inhalt = `**F-003** · \`BUG\` · P1 · offen\nTitel: Erster Eintrag.\n\n**F-003** · \`TECH_DEBT\` · P2 · offen\nTitel: Zweiter Eintrag, gleiche ID.\n`
  const { workitems, befunde } = parseFindings(inhalt)
  assert.strictEqual(workitems.length, 2)
  assert.strictEqual(befunde.length, 1)
  assert.strictEqual(befunde[0].art, 'doppelte_id')
  assert.strictEqual(befunde[0].id, 'F-003')
})

// ─── parseFindings: Rot-Fall 3 — fehlendes Titel-Feld (AK1/AK6, F-367) ─────

test('parseFindings: ein Eintrag ohne Titel-Feld wird als Befund gemeldet', () => {
  const inhalt = `**F-004** · \`BUG\` · P1 · offen\nBeschreibung: Kein Titel hier.\n`
  const { workitems, befunde } = parseFindings(inhalt)
  assert.strictEqual(workitems.length, 1)
  assert.strictEqual(workitems[0].titel, '')
  assert.strictEqual(befunde.length, 1)
  assert.strictEqual(befunde[0].art, 'fehlendes_titel_feld')
  assert.strictEqual(befunde[0].id, 'F-004')
})

test('parseFindings: ein unbekanntes Label (z. B. "Empfohlene Maßnahme:") bricht kein Feld auf, bleibt Fortsetzungstext (F-221-Regressionsschutz)', () => {
  const inhalt = `**F-005** · \`TECH_DEBT\` · P4 · offen\nTitel: Beispiel.\nFundstelle: hier.\nEmpfohlene Maßnahme: nicht als eigenes Feld erkannt.\n`
  const { workitems, befunde } = parseFindings(inhalt)
  assert.strictEqual(befunde.length, 0)
  assert.strictEqual(workitems[0].fundstelle, 'hier.\nEmpfohlene Maßnahme: nicht als eigenes Feld erkannt.')
})

test('parseFindings: leerer Inhalt liefert leere Listen, keinen Wurf', () => {
  assert.deepStrictEqual(parseFindings(''), { workitems: [], befunde: [] })
})

// ─── normalisiereStatus ─────────────────────────────────────────────────────

test('normalisiereStatus: OFFEN/ERLEDIGT/SONSTIGES-Zuordnung', () => {
  assert.strictEqual(normalisiereStatus('offen'), 'OFFEN')
  assert.strictEqual(normalisiereStatus('offen, zurückgestellt (E-192)'), 'OFFEN')
  assert.strictEqual(normalisiereStatus('**gelöst**'), 'ERLEDIGT')
  assert.strictEqual(normalisiereStatus('behoben'), 'ERLEDIGT')
  assert.strictEqual(normalisiereStatus('teilweise gelöst'), 'ERLEDIGT')
  assert.strictEqual(normalisiereStatus('verworfen'), 'SONSTIGES')
  assert.strictEqual(normalisiereStatus('zusammengeführt mit F-045'), 'SONSTIGES')
})

// ─── parseFeatureAkten ──────────────────────────────────────────────────────

test('parseFeatureAkten: gültige Akte liefert Workitem ohne Befund', () => {
  const inhalt = '## Titel\n\nBeispiel-Feature\n\n## Status\n\nStatus: IN_ARBEIT\n'
  const { workitems, befunde } = parseFeatureAkten([{ ordner: 'F99', pfad: 'features/F99/feature.md', inhalt }])
  assert.deepStrictEqual(befunde, [])
  assert.deepStrictEqual(workitems, [{ quelle: 'feature', typ: 'FEATURE', id: 'F99', titel: 'Beispiel-Feature', status: 'IN_ARBEIT', pfad: 'features/F99/feature.md' }])
})

test('parseFeatureAkten: fehlender Titel und unbekannter Status werden je als Befund gemeldet', () => {
  const inhalt = '## Status\n\nStatus: KEIN_GUELTIGER_WERT\n'
  const { workitems, befunde } = parseFeatureAkten([{ ordner: 'F98', pfad: 'features/F98/feature.md', inhalt }])
  assert.strictEqual(workitems.length, 1)
  assert.strictEqual(befunde.length, 2)
  assert.ok(befunde.some((b) => b.art === 'fehlendes_titel_feld'))
  assert.ok(befunde.some((b) => b.art === 'status_fehlt_oder_unbekannt'))
})

test('parseFeatureAkten: leere Dateiliste liefert leere Listen, keinen Wurf', () => {
  assert.deepStrictEqual(parseFeatureAkten([]), { workitems: [], befunde: [] })
})

test('parseFeatureAkten: leerer Titel-Abschnitt direkt vor der nächsten Überschrift zählt als fehlend, nicht als Titeltext der nächsten Überschrift (QA-Befund)', () => {
  const inhalt = '## Titel\n\n## Status\n\nStatus: IN_ARBEIT\n'
  const { workitems, befunde } = parseFeatureAkten([{ ordner: 'F97', pfad: 'features/F97/feature.md', inhalt }])
  assert.strictEqual(workitems[0].titel, '')
  assert.ok(befunde.some((b) => b.art === 'fehlendes_titel_feld'), JSON.stringify(befunde))
})

test('parseFeatureAkten: inhalt null (keine feature.md) meldet feature_md_fehlt statt eines Workitems (QA-Befund)', () => {
  const { workitems, befunde } = parseFeatureAkten([{ ordner: 'F96', pfad: 'features/F96/feature.md', inhalt: null }])
  assert.deepStrictEqual(workitems, [])
  assert.strictEqual(befunde.length, 1)
  assert.strictEqual(befunde[0].art, 'feature_md_fehlt')
})

// ─── baueWorkitemListe ──────────────────────────────────────────────────────

test('baueWorkitemListe: sortiert P0→P4, Feature-Akten ohne Priorität zuletzt', () => {
  const findings = parseFindings('**F-010** · `BUG` · P2 · offen\nTitel: b.\n\n**F-011** · `BUG` · P0 · offen\nTitel: a.\n').workitems
  const features = parseFeatureAkten([{ ordner: 'F50', pfad: 'features/F50/feature.md', inhalt: '## Titel\n\nZ\n\nStatus: ENTWURF\n' }]).workitems
  const liste = baueWorkitemListe(findings, features)
  assert.deepStrictEqual(liste.map((w) => w.id), ['F-011', 'F-010', 'F50'])
})

test('baueWorkitemListe: Filter typ/status/prioritaet', () => {
  const findings = parseFindings('**F-020** · `BUG` · P1 · offen\nTitel: x.\n\n**F-021** · `TECH_DEBT` · P1 · offen\nTitel: y.\n').workitems
  const nurBug = baueWorkitemListe(findings, [], { typ: 'BUG' })
  assert.deepStrictEqual(nurBug.map((w) => w.id), ['F-020'])
  const nurP1 = baueWorkitemListe(findings, [], { prioritaet: 'P1' })
  assert.strictEqual(nurP1.length, 2)
  const nurOffen = baueWorkitemListe(findings, [], { status: 'OFFEN' })
  assert.strictEqual(nurOffen.length, 2)
})

// ─── projiziereFehlgeschlageneLaeufe ────────────────────────────────────────

test('projiziereFehlgeschlageneLaeufe: nur ergebnis FEHLGESCHLAGEN, VERWEIGERT/ERFOLGREICH bleiben draußen', () => {
  const laeufe = [
    { laufId: 'a', ergebnis: 'FEHLGESCHLAGEN' as const, kenntnisgenommen: false, zeitpunkt: null, auftragsbezug: null },
    { laufId: 'b', ergebnis: 'VERWEIGERT' as const, kenntnisgenommen: false, zeitpunkt: null, auftragsbezug: null },
    { laufId: 'c', ergebnis: 'ERFOLGREICH' as const, kenntnisgenommen: false, zeitpunkt: null, auftragsbezug: null },
    { laufId: 'd', ergebnis: null, kenntnisgenommen: false, zeitpunkt: null, auftragsbezug: null },
  ]
  const ergebnis = projiziereFehlgeschlageneLaeufe(laeufe)
  assert.deepStrictEqual(ergebnis.map((r) => r.laufId), ['a'])
})
