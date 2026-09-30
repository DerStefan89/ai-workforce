/**
 * Datei: src/feature-auftrag/feature-auftrag.test.ts
 *
 * Zweck: node:test-Fälle für baueAuftragAusFeatureAkte (F35 WS-1, AK3).
 * Reine Funktion, kein I/O — jeder Fall übergibt den Akteninhalt direkt als
 * String.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { baueAuftragAusFeatureAkte, GEKLAERTER_ABSCHNITT_OBERGRENZE } from './index.ts'

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

// ─── F-732 (state/findings.md, behoben F35 WS-2): leseTopLevelBullets erkannte vor der Behebung
// ausschließlich '- '-Bullets — '*'- und nummerierte Listen lieferten 0 AK statt der erwarteten
// Einträge. Jede Form einzeln, plus eine führende Checkbox.

test("F-732: '*'-Bullets werden wie '-'-Bullets als Top-Level-AK erkannt", () => {
  const akte = `## Ziel
Ziel-Text.

## Akzeptanzkriterien
* Erstes AK mit Sternchen.
* AK5: Zweites AK mit Sternchen und expliziter ID.
`
  const ergebnis = baueAuftragAusFeatureAkte(akte, 'F99')
  assert.ok(ergebnis.ok, !ergebnis.ok ? ergebnis.grund : undefined)
  assert.deepStrictEqual(ergebnis.akzeptanzkriterien, [
    { id: 'AK1', text: 'Erstes AK mit Sternchen.' },
    { id: 'AK5', text: 'Zweites AK mit Sternchen und expliziter ID.' },
  ])
})

test("F-732: nummerierte Listen ('1. ') werden als Top-Level-AK erkannt", () => {
  const akte = `## Ziel
Ziel-Text.

## Akzeptanzkriterien
1. Erstes nummeriertes AK.
2. AK7: Zweites nummeriertes AK mit expliziter ID.
`
  const ergebnis = baueAuftragAusFeatureAkte(akte, 'F99')
  assert.ok(ergebnis.ok, !ergebnis.ok ? ergebnis.grund : undefined)
  assert.deepStrictEqual(ergebnis.akzeptanzkriterien, [
    { id: 'AK1', text: 'Erstes nummeriertes AK.' },
    { id: 'AK7', text: 'Zweites nummeriertes AK mit expliziter ID.' },
  ])
})

test("F-732: nummerierte Listen mit ')' ('1) ') werden als Top-Level-AK erkannt", () => {
  const akte = `## Ziel
Ziel-Text.

## Akzeptanzkriterien
1) Erstes AK mit Klammer.
2) Zweites AK mit Klammer.
`
  const ergebnis = baueAuftragAusFeatureAkte(akte, 'F99')
  assert.ok(ergebnis.ok, !ergebnis.ok ? ergebnis.grund : undefined)
  assert.deepStrictEqual(ergebnis.akzeptanzkriterien, [
    { id: 'AK1', text: 'Erstes AK mit Klammer.' },
    { id: 'AK2', text: 'Zweites AK mit Klammer.' },
  ])
})

test('F-732: eine führende Checkbox ([ ]/[x]/[X]) wird vom AK-Text entfernt', () => {
  const akte = `## Ziel
Ziel-Text.

## Akzeptanzkriterien
- [ ] Offenes AK ohne Häkchen.
- [x] AK9: Abgehaktes AK klein.
- [X] Abgehaktes AK groß.
`
  const ergebnis = baueAuftragAusFeatureAkte(akte, 'F99')
  assert.ok(ergebnis.ok, !ergebnis.ok ? ergebnis.grund : undefined)
  assert.deepStrictEqual(ergebnis.akzeptanzkriterien, [
    { id: 'AK1', text: 'Offenes AK ohne Häkchen.' },
    { id: 'AK9', text: 'Abgehaktes AK klein.' },
    { id: 'AK3', text: 'Abgehaktes AK groß.' },
  ])
})

const AKTE_OHNE_TECHNIK = `## Titel
Titel X

## Ziel
Ziel-Text.

## Nicht-Ziele
- Kein Export.

## Akzeptanzkriterien
- AK1: Erstes AK.

## Dependencies
- keine
`

test('F-824: ohne Datenmodell/Security bleibt der Auftragstext bitgenau (literaler Snapshot)', () => {
  const ergebnis = baueAuftragAusFeatureAkte(AKTE_OHNE_TECHNIK, 'F99')
  assert.ok(ergebnis.ok, !ergebnis.ok ? ergebnis.grund : undefined)
  assert.equal(ergebnis.auftragstext, 'Ziel\nZiel-Text.\n\nNicht-Ziele\n- Kein Export.\n\nAkzeptanzkriterien\n- AK1: Erstes AK.\n\nworkitem:feature:F99')
})

test("F-824: '## Datenmodell' und '## Security/Permissions' gehen als geklärte Vorgaben vor die Referenzzeile", () => {
  const akte = `${AKTE_OHNE_TECHNIK}
## Datenmodell
Buchung { betrag: number, datum: string }

## Red-/Green-Cases
- rot: leer

## Security/Permissions
Nur lokal, keine Anmeldung.
`
  const ergebnis = baueAuftragAusFeatureAkte(akte, 'F99')
  assert.ok(ergebnis.ok, !ergebnis.ok ? ergebnis.grund : undefined)
  assert.equal(
    ergebnis.auftragstext,
    'Ziel\nZiel-Text.\n\nNicht-Ziele\n- Kein Export.\n\nAkzeptanzkriterien\n- AK1: Erstes AK.\n\n' +
      'Geklärte Vorgaben (aus der Feature-Akte, bereits entschieden — nicht erneut fragen)\n\n' +
      'Datenmodell\nBuchung { betrag: number, datum: string }\n\nSecurity\nNur lokal, keine Anmeldung.\n\nworkitem:feature:F99'
  )
  assert.doesNotMatch(ergebnis.auftragstext, /Red-\/Green/)
})

test('F-824: nur ein Abschnitt, leerer Abschnitt entfällt; Obergrenze je Abschnitt mit Verweis auf die Akte', () => {
  const nurSecurity = baueAuftragAusFeatureAkte(`${AKTE_OHNE_TECHNIK}\n## Datenmodell\n\n## Security\nlokal\n`, 'F99')
  assert.ok(nurSecurity.ok)
  assert.match(nurSecurity.auftragstext, /nicht erneut fragen\)\n\nSecurity\nlokal\n\nworkitem/)
  assert.doesNotMatch(nurSecurity.auftragstext, /\nDatenmodell\n/)
  const lang = baueAuftragAusFeatureAkte(`${AKTE_OHNE_TECHNIK}\n## Datenmodell\n${'x'.repeat(GEKLAERTER_ABSCHNITT_OBERGRENZE + 50)}\n`, 'F99')
  assert.ok(lang.ok)
  assert.ok(lang.auftragstext.endsWith(`
${'x'.repeat(GEKLAERTER_ABSCHNITT_OBERGRENZE)}
… (gekürzt, vollständig in features/F99/feature.md)

workitem:feature:F99`))
})

test('F-824: nur exakte Überschriften; Platzhalter-Abschnitte ([FÜLLUNG], offen, TBD) gelten nicht als entschieden', () => {
  const fremd = baueAuftragAusFeatureAkte(`${AKTE_OHNE_TECHNIK}\n## Security-Review\nBefund A\n\n## Datenmodell (alt)\nx\n`, 'F99')
  assert.ok(fremd.ok)
  assert.doesNotMatch(fremd.auftragstext, /Geklärte Vorgaben/, 'fremde Überschriften gehen nicht mit')
  for (const platzhalter of ['[FÜLLUNG: Datenmodell]', 'offen', 'TBD.']) {
    const akte = baueAuftragAusFeatureAkte(`${AKTE_OHNE_TECHNIK}\n## Datenmodell\n${platzhalter}\n`, 'F99')
    assert.ok(akte.ok)
    assert.doesNotMatch(akte.auftragstext, /Geklärte Vorgaben/, platzhalter)
  }
  const beide = baueAuftragAusFeatureAkte(`${AKTE_OHNE_TECHNIK}\n## Datenmodell\noffen\n\n## Security\nlokal\n`, 'F99')
  assert.ok(beide.ok)
  assert.match(beide.auftragstext, /nicht erneut fragen\)\n\nSecurity\nlokal\n\nworkitem/)
})
