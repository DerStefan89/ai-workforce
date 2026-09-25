/**
 * Datei: src/feature-auftrag/feature-auftrag.test.ts
 *
 * Zweck: node:test-Fälle für baueAuftragAusFeatureAkte (F35 WS-1, AK3).
 * Reine Funktion, kein I/O — jeder Fall übergibt den Akteninhalt direkt als
 * String.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { baueAuftragAusFeatureAkte } from './index.ts'

const AKTE_VOLLSTAENDIG = `# F99 — Testfeature

## Titel
Ein Testfeature

## Status
Status: ENTWURF

## Ziel
Das ist das Ziel des Features.

## Nicht-Ziele
- Erstes Nicht-Ziel.
- Zweites Nicht-Ziel
  mit einer Fortsetzungszeile.

## Akzeptanzkriterien
- Erstes AK ohne explizite ID.
- AK5: Zweites AK mit expliziter ID.
- Drittes AK ohne explizite ID,
  mit einer Fortsetzungszeile.

## Dependencies
- Keine.
`

test('AK3: liest Titel/Ziel/Nicht-Ziele/AKs, übernimmt explizite AK-IDs, vergibt sonst Positions-IDs', () => {
  const ergebnis = baueAuftragAusFeatureAkte(AKTE_VOLLSTAENDIG, 'F99')
  assert.ok(ergebnis.ok)
  assert.strictEqual(ergebnis.titel, 'Ein Testfeature')
  assert.deepStrictEqual(ergebnis.akzeptanzkriterien, [
    { id: 'AK1', text: 'Erstes AK ohne explizite ID.' },
    { id: 'AK5', text: 'Zweites AK mit expliziter ID.' },
    { id: 'AK3', text: 'Drittes AK ohne explizite ID,\nmit einer Fortsetzungszeile.' },
  ])
  assert.deepStrictEqual(ergebnis.nicht_ziele, ['Erstes Nicht-Ziel.', 'Zweites Nicht-Ziel\nmit einer Fortsetzungszeile.'])
  assert.deepStrictEqual(ergebnis.herkunft, { art: 'feature_akte' })
  assert.ok(ergebnis.auftragstext.includes('Das ist das Ziel des Features.'))
  assert.ok(ergebnis.auftragstext.includes('- AK1: Erstes AK ohne explizite ID.'))
  assert.ok(ergebnis.auftragstext.endsWith('workitem:feature:F99'))
})

test('AK3: deterministisch — gleiche Akte liefert identisches Ergebnis', () => {
  const erstesErgebnis = baueAuftragAusFeatureAkte(AKTE_VOLLSTAENDIG, 'F99')
  const zweitesErgebnis = baueAuftragAusFeatureAkte(AKTE_VOLLSTAENDIG, 'F99')
  assert.deepStrictEqual(erstesErgebnis, zweitesErgebnis)
})

test('AK3: fehlender Titel-Abschnitt fällt auf featureId zurück', () => {
  const akte = AKTE_VOLLSTAENDIG.replace('## Titel\nEin Testfeature\n\n', '')
  const ergebnis = baueAuftragAusFeatureAkte(akte, 'F99')
  assert.ok(ergebnis.ok)
  assert.strictEqual(ergebnis.titel, 'F99')
})

test('AK3: fehlender/leerer Abschnitt Ziel liefert ok:false mit Grund, kein Ergebnis', () => {
  const ohneZiel = AKTE_VOLLSTAENDIG.replace(/## Ziel\n[^#]*\n\n/, '')
  const ergebnisOhne = baueAuftragAusFeatureAkte(ohneZiel, 'F99')
  assert.strictEqual(ergebnisOhne.ok, false)
  assert.ok(!ergebnisOhne.ok && ergebnisOhne.grund.includes('Ziel'))

  const mitLeeremZiel = AKTE_VOLLSTAENDIG.replace(/## Ziel\n[^#]*\n\n/, '## Ziel\n\n')
  const ergebnisLeer = baueAuftragAusFeatureAkte(mitLeeremZiel, 'F99')
  assert.strictEqual(ergebnisLeer.ok, false)
})

test('AK3: kein Bullet unter Akzeptanzkriterien liefert ok:false mit Grund, kein Ergebnis', () => {
  const ohneAk = AKTE_VOLLSTAENDIG.replace(/## Akzeptanzkriterien\n[^#]*\n\n/, '## Akzeptanzkriterien\nKein Bullet hier.\n\n')
  const ergebnis = baueAuftragAusFeatureAkte(ohneAk, 'F99')
  assert.strictEqual(ergebnis.ok, false)
  assert.ok(!ergebnis.ok && ergebnis.grund.includes('Akzeptanzkriterien'))

  const fehlenderAbschnitt = AKTE_VOLLSTAENDIG.replace(/## Akzeptanzkriterien\n[^#]*\n\n/, '')
  const ergebnisFehlt = baueAuftragAusFeatureAkte(fehlenderAbschnitt, 'F99')
  assert.strictEqual(ergebnisFehlt.ok, false)
})

test('AK3: eine explizite AK-ID, die mit der Positions-ID eines anderen Bullets kollidiert, liefert ok:false statt einer stillen Duplikat-ID', () => {
  const akte = `## Ziel
Ziel-Text.

## Akzeptanzkriterien
- AK2: Explizit benanntes Kriterium.
- Zweites Kriterium ohne ID (Position 2 — kollidiert mit AK2).
`
  const ergebnis = baueAuftragAusFeatureAkte(akte, 'F99')
  assert.strictEqual(ergebnis.ok, false)
  assert.ok(!ergebnis.ok && ergebnis.grund.includes('AK2'))
})

test('AK3: fehlender Abschnitt Nicht-Ziele liefert ein leeres nicht_ziele-Array, kein Fehler', () => {
  const ohneNichtZiele = AKTE_VOLLSTAENDIG.replace(/## Nicht-Ziele\n[^#]*\n\n/, '')
  const ergebnis = baueAuftragAusFeatureAkte(ohneNichtZiele, 'F99')
  assert.ok(ergebnis.ok)
  assert.deepStrictEqual(ergebnis.nicht_ziele, [])
  assert.ok(!ergebnis.auftragstext.includes('Nicht-Ziele'))
})
