/**
 * Datei: src/auftrag/auftrag.test.ts
 *
 * Zweck: node:test-Fall für das Auftrag-Modul (F11 WS-1, state/tasks/
 * f11-auftrag-ws1.md). Belegt AK1: registriereAuftrag registriert unter
 * der Artefakt-ID auftrag-<auftragId>, mit leerem eingaben-Array (D2) und
 * der erwarteten AUFTRAG_V0-Payload-Form.
 */

import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { baueArbeitspaketBlock, gleicheEinrichtungslisteAb, offeneEinrichtungVorDemBau, optionenAusAuftrag, registriereAuftrag, traegtArbeitspaket, validiereAuftragAkzeptanzkriterien, validiereAuftragDaten, validiereAuftragNichtZiele } from './index.ts'
import type { AuftragV0Daten } from './types.ts'
import { ladeArtefaktVersion } from '../lineage-registry/index.ts'
import type { ProfilReferenz } from '../checkpoint-store/types.ts'
import { raeumeVerzeichnis } from '../../scripts/_aufraeumen.ts'

const BASIS = 'kontrollzustand-test'
const PROFIL_REFERENZ: ProfilReferenz = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
const stillerSchreiber = () => {}

function raeumeAuf(auftragId: string): void {
  raeumeVerzeichnis(join(BASIS, `lineage-auftrag-${auftragId}`))
}

test('AK1: registriereAuftrag registriert AUFTRAG_V0 unter auftrag-<auftragId> mit leerem eingaben-Array', () => {
  const auftragId = `test-auftrag-${randomUUID()}`
  try {
    const ergebnis = registriereAuftrag(auftragId, PROFIL_REFERENZ, 'Testtitel', 'Testauftragstext', {
      basisVerzeichnis: BASIS,
      schreiber: stillerSchreiber,
    })
    assert.strictEqual(ergebnis.versionSequenz, 1)

    const version = ladeArtefaktVersion(`auftrag-${auftragId}`, undefined, { basisVerzeichnis: BASIS, schreiber: stillerSchreiber })
    assert.ok(version)
    assert.strictEqual(version.erzeugungsart, 'kern')
    assert.strictEqual(version.eingaben.length, 0)
    assert.deepStrictEqual(version.daten, {
      auftrag_schema: 'v0',
      auftrag_id: auftragId,
      titel: 'Testtitel',
      auftragstext: 'Testauftragstext',
      erstellt_am: (version.daten as { erstellt_am: string }).erstellt_am,
    })
  } finally {
    raeumeAuf(auftragId)
  }
})

// ─── F35 WS-1: akzeptanzkriterien/nicht_ziele/herkunft.art 'feature_akte' ──────────────────

test('F35 WS-1: registriereAuftrag schreibt akzeptanzkriterien/nicht_ziele/herkunft nur, wenn übergeben', () => {
  const auftragId = `test-auftrag-${randomUUID()}`
  try {
    registriereAuftrag(auftragId, PROFIL_REFERENZ, 'Testtitel', 'Testauftragstext\n\nworkitem:feature:F99', {
      basisVerzeichnis: BASIS,
      schreiber: stillerSchreiber,
      herkunft: { art: 'feature_akte' },
      akzeptanzkriterien: [{ id: 'AK1', text: 'Erstes AK.' }],
      nicht_ziele: ['Ein Nicht-Ziel.'],
    })
    const version = ladeArtefaktVersion(`auftrag-${auftragId}`, undefined, { basisVerzeichnis: BASIS, schreiber: stillerSchreiber })
    assert.deepStrictEqual((version?.daten as Record<string, unknown>).herkunft, { art: 'feature_akte' })
    assert.deepStrictEqual((version?.daten as Record<string, unknown>).akzeptanzkriterien, [{ id: 'AK1', text: 'Erstes AK.' }])
    assert.deepStrictEqual((version?.daten as Record<string, unknown>).nicht_ziele, ['Ein Nicht-Ziel.'])
  } finally {
    raeumeAuf(auftragId)
  }
})

test('validiereAuftragAkzeptanzkriterien: gültig, leeres Array, unbekannte ID/Fremdfeld, doppelte ID', () => {
  assert.deepStrictEqual(validiereAuftragAkzeptanzkriterien([{ id: 'AK1', text: 'Text.' }, { id: 'AK2', text: 'Text 2.' }]), [])
  assert.notStrictEqual(validiereAuftragAkzeptanzkriterien([]).length, 0)
  assert.notStrictEqual(validiereAuftragAkzeptanzkriterien([{ id: 'X1', text: 'Text.' }]).length, 0)
  assert.notStrictEqual(validiereAuftragAkzeptanzkriterien([{ id: 'AK1', text: 'Text.', fremd: true }]).length, 0)
  assert.notStrictEqual(validiereAuftragAkzeptanzkriterien([{ id: 'AK1', text: 'Text.' }, { id: 'AK1', text: 'Text 2.' }]).length, 0)
  assert.notStrictEqual(validiereAuftragAkzeptanzkriterien('kein-array').length, 0)
})

test('validiereAuftragNichtZiele: gültig (auch leer), lehnt einen leeren/Nicht-String-Eintrag ab', () => {
  assert.deepStrictEqual(validiereAuftragNichtZiele([]), [])
  assert.deepStrictEqual(validiereAuftragNichtZiele(['Ein Nicht-Ziel.']), [])
  assert.notStrictEqual(validiereAuftragNichtZiele(['']).length, 0)
  assert.notStrictEqual(validiereAuftragNichtZiele([42]).length, 0)
  assert.notStrictEqual(validiereAuftragNichtZiele('kein-array').length, 0)
})

test('validiereAuftragDaten: akzeptanzkriterien/nicht_ziele bleiben additiv/optional — ein Alt-Auftrag ohne die Felder bleibt gültig', () => {
  const altAuftrag = { auftrag_schema: 'v0', auftrag_id: 'a1', titel: 'T', auftragstext: 'A', erstellt_am: '2026-01-01T00:00:00.000Z' }
  assert.deepStrictEqual(validiereAuftragDaten(altAuftrag), [])

  const mitFeldern = { ...altAuftrag, herkunft: { art: 'feature_akte' }, akzeptanzkriterien: [{ id: 'AK1', text: 'Text.' }], nicht_ziele: [] }
  assert.deepStrictEqual(validiereAuftragDaten(mitFeldern), [])

  const ungueltig = { ...altAuftrag, akzeptanzkriterien: [] }
  assert.notStrictEqual(validiereAuftragDaten(ungueltig).length, 0)
})

const ALT: AuftragV0Daten = { auftrag_schema: 'v0', auftrag_id: 'a1', titel: 'T', auftragstext: 'A', erstellt_am: '2026-01-01T00:00:00.000Z' }

test('F45 B2a-2: Arbeitspaket-Felder additiv — gültig mit Feldern, Verstoß je Feldregel, Pflicht-AK je Herkunft', () => {
  const voll = { ...ALT, herkunft: { art: 'finding' }, akzeptanzkriterien: [{ id: 'AK1', text: 'x' }], bereiche: ['src/a/'], risiko: 'hoch', feature_ref: 'F12b', einrichtung: [{ id: 'E1', schritt: 'Konto.', wann: 'vor_dem_bau', status: 'offen' }] }
  assert.deepStrictEqual(validiereAuftragDaten(voll), [])
  for (const [feld, wert] of [
    ['bereiche', []],
    ['bereiche', ['a', 'a']],
    ['risiko', 'extrem'],
    ['feature_ref', 'F-12'],
    ['einrichtung', [{ id: 'X1', schritt: 'K', wann: 'vor_dem_bau', status: 'offen' }]],
    ['einrichtung', [{ id: 'E1', schritt: 'K', wann: 'vor_dem_bau', status: 'offen' }, { id: 'E1', schritt: 'L', wann: 'vor_dem_bau', status: 'offen' }]],
  ] as const) {
    assert.notStrictEqual(validiereAuftragDaten({ ...voll, [feld]: wert }).length, 0, `${feld}: ${JSON.stringify(wert)}`)
  }
  assert.notStrictEqual(validiereAuftragDaten({ ...ALT, herkunft: { art: 'finding' } }).length, 0, 'Finding ohne AK')
  assert.notStrictEqual(validiereAuftragDaten({ ...ALT, herkunft: { art: 'feature_akte' } }).length, 0, 'Feature-Akte ohne AK')
  assert.deepStrictEqual(validiereAuftragDaten({ ...ALT, herkunft: { art: 'jarvis' } }), [], 'andere Herkunft ohne AK bleibt gültig')
})

test('F45 B2a-2: registriereAuftrag prüft vor dem Schreiben; neue Version behält erstellt_am und alle Felder (optionenAusAuftrag)', () => {
  const auftragId = `test-auftrag-${randomUUID()}`
  try {
    assert.throws(() => registriereAuftrag(auftragId, PROFIL_REFERENZ, 'T', 'A', { basisVerzeichnis: BASIS, schreiber: stillerSchreiber, herkunft: { art: 'finding' } }), /mindestens ein Akzeptanzkriterium/)
    registriereAuftrag(auftragId, PROFIL_REFERENZ, 'T', 'A', { basisVerzeichnis: BASIS, schreiber: stillerSchreiber, herkunft: { art: 'finding' }, akzeptanzkriterien: [{ id: 'AK1', text: 'x' }], bereiche: ['src/'] })
    const v1 = ladeArtefaktVersion(`auftrag-${auftragId}`, undefined, { basisVerzeichnis: BASIS, schreiber: stillerSchreiber })
    assert.ok(v1)
    const daten1 = v1.daten as AuftragV0Daten
    const einrichtung = [{ id: 'E1', schritt: 'Konto.', wann: 'vor_dem_bau' as const, status: 'offen' as const }]
    const v2 = registriereAuftrag(auftragId, PROFIL_REFERENZ, daten1.titel, daten1.auftragstext, { ...optionenAusAuftrag(daten1), einrichtung, basisVerzeichnis: BASIS, schreiber: stillerSchreiber })
    assert.strictEqual(v2.versionSequenz, 2)
    const daten2 = ladeArtefaktVersion(`auftrag-${auftragId}`, undefined, { basisVerzeichnis: BASIS, schreiber: stillerSchreiber })?.daten as AuftragV0Daten
    assert.deepStrictEqual(daten2, { ...daten1, einrichtung })
  } finally {
    raeumeAuf(auftragId)
  }
})

test('F45 B2a-2: Arbeitspaket-Block nur mit Arbeitspaket-Feld; Feature-Akte ohne doppelten AK-Wortlaut', () => {
  assert.strictEqual(traegtArbeitspaket(ALT), false)
  assert.strictEqual(baueArbeitspaketBlock({ ...ALT, feature_ref: 'F1', herkunft: { art: 'feature_akte' }, akzeptanzkriterien: [{ id: 'AK1', text: 'x' }] }, 'Z'), null, 'feature_ref allein löst keinen Block aus')
  const finding = baueArbeitspaketBlock({ ...ALT, herkunft: { art: 'finding' }, akzeptanzkriterien: [{ id: 'AK1', text: 'Fehler weg' }] }, null)
  assert.ok(finding?.includes('Ziel: T') && finding.includes('- AK1: Fehler weg') && finding.includes('Risiko: nicht eingestuft') && finding.includes('Einrichtung durch Stefan: keine.'))
  const akte = baueArbeitspaketBlock({ ...ALT, herkunft: { art: 'feature_akte' }, akzeptanzkriterien: [{ id: 'AK1', text: 'Wortlaut' }], nicht_ziele: ['N'], risiko: 'mittel' }, 'Z')
  assert.ok(akte?.includes('AK1 — Wortlaut oben im Auftrag') && !akte.includes('- AK1: Wortlaut') && akte.includes('Nicht-Ziele: siehe oben'))
  const offen = baueArbeitspaketBlock({ ...ALT, einrichtung: [{ id: 'E1', schritt: 'Schlüssel', wann: 'waehrend_des_baus', status: 'offen' }] }, 'Z')
  assert.match(offen ?? '', /melde ihn als Blockade/)
})

test('F45 B2a-2 (F-1071): Abgleich der Einrichtung — Status zählt nicht, Replan behält erledigt, leere Liste nur bei bestehender', () => {
  const alt = [
    { id: 'E1', schritt: 'A', wann: 'vor_dem_bau' as const, status: 'erledigt' as const },
    { id: 'E2', schritt: 'B', wann: 'waehrend_des_baus' as const, status: 'offen' as const },
  ]
  assert.strictEqual(gleicheEinrichtungslisteAb(alt, [{ schritt: 'A', wann: 'vor_dem_bau' }, { schritt: 'B', wann: 'waehrend_des_baus' }]), null)
  assert.strictEqual(gleicheEinrichtungslisteAb(undefined, []), null)
  assert.deepStrictEqual(gleicheEinrichtungslisteAb(alt, []), [])
  assert.deepStrictEqual(gleicheEinrichtungslisteAb(alt, [{ schritt: 'C', wann: 'vor_dem_bau' }, { schritt: 'A', wann: 'vor_dem_bau' }]), [
    { id: 'E1', schritt: 'C', wann: 'vor_dem_bau', status: 'offen' },
    { id: 'E2', schritt: 'A', wann: 'vor_dem_bau', status: 'erledigt' },
  ])
  assert.deepStrictEqual(offeneEinrichtungVorDemBau({ einrichtung: [...alt, { id: 'E3', schritt: 'C', wann: 'vor_dem_bau', status: 'offen' }] }).map((e) => e.id), ['E3'])
  assert.deepStrictEqual(offeneEinrichtungVorDemBau(undefined), [])
})

test('F45 B2b-3c (F-981): budget_tokens additiv — ganze Zahl ≥ 1, neue Version behält es, löst keinen Arbeitspaket-Block aus', () => {
  assert.deepStrictEqual(validiereAuftragDaten({ ...ALT, budget_tokens: 2_000_000 }), [])
  for (const wert of [0, -1, 1.5, '100', null]) {
    assert.notStrictEqual(validiereAuftragDaten({ ...ALT, budget_tokens: wert }).length, 0, `budget_tokens: ${JSON.stringify(wert)}`)
  }
  assert.strictEqual(traegtArbeitspaket({ ...(ALT as AuftragV0Daten), budget_tokens: 5 }), false)
  const auftragId = `test-auftrag-${randomUUID()}`
  try {
    registriereAuftrag(auftragId, PROFIL_REFERENZ, 'T', 'A', { basisVerzeichnis: BASIS, schreiber: stillerSchreiber, budget_tokens: 7 })
    const daten1 = ladeArtefaktVersion(`auftrag-${auftragId}`, undefined, { basisVerzeichnis: BASIS, schreiber: stillerSchreiber })?.daten as AuftragV0Daten
    assert.strictEqual(daten1.budget_tokens, 7)
    registriereAuftrag(auftragId, PROFIL_REFERENZ, daten1.titel, daten1.auftragstext, { ...optionenAusAuftrag(daten1), basisVerzeichnis: BASIS, schreiber: stillerSchreiber })
    const daten2 = ladeArtefaktVersion(`auftrag-${auftragId}`, undefined, { basisVerzeichnis: BASIS, schreiber: stillerSchreiber })?.daten as AuftragV0Daten
    assert.deepStrictEqual(daten2, daten1)
  } finally {
    raeumeAuf(auftragId)
  }
})
