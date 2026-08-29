/**
 * Datei: src/checkpoint-store/checkpoint-store.test.ts
 *
 * Zweck: Fünf node:test-Fälle (state/plan-v2-feature1-checkpoint-store.md
 * Delta 2 + Delta 4/B6), die die vier technischen Akzeptanzkriterien ohne
 * Gate-Zuordnung (A4/AC1, A5/AC2+AC3, A10/AC8, A11/AC9) sowie den
 * Dateiname-Inhalt-Hash-Konsistenz-Fall (B6, ergänzt AC2/AC3) abdecken.
 * Läuft auf einem Wegwerfverzeichnis unter kontrollzustand-test/ (nicht
 * kontrollzustand/ selbst), damit kein Produktzustand durch Tests
 * verschmutzt wird.
 */

import { createHash, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { kanonischesJson, ladeGueltigeCheckpoints, ladeLetztenGueltigenCheckpoint, schreibeCheckpoint, sha256Hex } from './index.ts'
import type { Ereignis, ProfilReferenz, Schreiber } from './types.ts'

const BASIS = 'kontrollzustand-test'
const PROFIL_REFERENZ: ProfilReferenz = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }

function neueLaufId(praefix: string): string {
  return `${praefix}-${randomUUID()}`
}

function raeumeAuf(laufId: string): void {
  rmSync(join(BASIS, laufId), { recursive: true, force: true })
}

function pruefeEreignis(ereignis: Ereignis, erwartet: Ereignis['ereignis']): void {
  assert.strictEqual(ereignis.ereignis, erwartet)
  assert.strictEqual(typeof ereignis.lauf_id, 'string')
  assert.strictEqual(typeof ereignis.zeitstempel, 'string')
  assert.doesNotThrow(() => new Date(ereignis.zeitstempel).toISOString())
}

test('Rundlauf: schreibeCheckpoint gefolgt von laden liefert inhaltlich identischen Eintrag (1 und 3 Checkpoints) — A4/AC1', () => {
  const laufId = neueLaufId('rundlauf')
  try {
    schreibeCheckpoint(laufId, PROFIL_REFERENZ, { schritt: 1 }, { basisVerzeichnis: BASIS })
    let geladen = ladeLetztenGueltigenCheckpoint(laufId, { basisVerzeichnis: BASIS })
    assert.ok(geladen)
    assert.deepStrictEqual(geladen.payload.daten, { schritt: 1 })
    assert.strictEqual(geladen.payload.sequenz, 1)
    assert.strictEqual(geladen.payload.vorgaenger_hash, null)

    schreibeCheckpoint(laufId, PROFIL_REFERENZ, { schritt: 2 }, { basisVerzeichnis: BASIS })
    schreibeCheckpoint(laufId, PROFIL_REFERENZ, { schritt: 3 }, { basisVerzeichnis: BASIS })
    geladen = ladeLetztenGueltigenCheckpoint(laufId, { basisVerzeichnis: BASIS })
    assert.ok(geladen)
    assert.deepStrictEqual(geladen.payload.daten, { schritt: 3 })
    assert.strictEqual(geladen.payload.sequenz, 3)
  } finally {
    raeumeAuf(laufId)
  }
})

test('abgebrochene Persistierung hinterlässt keinen sichtbaren Checkpoint — A5/AC2+AC3 (Kern-Garantie D2)', () => {
  const laufId = neueLaufId('abbruch')
  try {
    const verzeichnis = join(BASIS, laufId, 'checkpoints')
    mkdirSync(verzeichnis, { recursive: true })

    // Vollständiger, GÜLTIGER Checkpoint-Inhalt (korrekter selbst_hash) —
    // damit isoliert dieser Test wirklich den Dateiname-Filter und nicht
    // die Inhaltsvalidierung. Simuliert exakt den Abbruchpunkt "Temp-Datei
    // bleibt liegen, kein rename() ausgeführt": kein echter Prozess-Kill
    // nötig, das Dateisystem sieht danach denselben Zustand.
    const payloadOhneHash = { lauf_id: laufId, sequenz: 1, vorgaenger_hash: null, daten: { schritt: 'abgebrochen' } }
    const eintragOhneHash = { schema_version: 1, typ: 'checkpoint', profil_referenz: PROFIL_REFERENZ, payload: payloadOhneHash }
    const selbstHash = sha256Hex(kanonischesJson(eintragOhneHash))
    const vollstaendigerInhalt = kanonischesJson({ ...eintragOhneHash, payload: { ...payloadOhneHash, selbst_hash: selbstHash } })
    // Zielname wäre "1-<selbstHash>.json" — der Temp-Suffix bleibt hier
    // bewusst am Namen hängen, weil kein rename() stattfand.
    writeFileSync(join(verzeichnis, `1-${selbstHash}.json.tmp-simuliert-abbruch`), vollstaendigerInhalt)

    const geladen = ladeLetztenGueltigenCheckpoint(laufId, { basisVerzeichnis: BASIS })
    assert.strictEqual(geladen, null)

    const dateien = readdirSync(verzeichnis)
    assert.ok(
      !dateien.some((name) => /^\d+-[0-9a-f]{64}\.json$/.test(name)),
      'kein Ziel-Dateiname darf im Verzeichnis liegen — nur die liegen gebliebene Temp-Datei'
    )
  } finally {
    raeumeAuf(laufId)
  }
})

test('kein Aufruf verändert Dateien außerhalb von kontrollzustand-test/<lauf_id> — A10/AC8', () => {
  const laufId = neueLaufId('trennung')
  const produktVerzeichnis = join(BASIS, `${laufId}-produkt-fixture`)
  try {
    mkdirSync(produktVerzeichnis, { recursive: true })
    writeFileSync(join(produktVerzeichnis, 'beispiel.json'), JSON.stringify({ inhalt: 'unveraendert' }))

    function schnappschuss(): string {
      return readdirSync(produktVerzeichnis)
        .sort()
        .map((name) => `${name}:${createHash('sha256').update(readFileSync(join(produktVerzeichnis, name))).digest('hex')}`)
        .join('|')
    }

    const vorher = schnappschuss()
    schreibeCheckpoint(laufId, PROFIL_REFERENZ, { schritt: 1 }, { basisVerzeichnis: BASIS })
    schreibeCheckpoint(laufId, PROFIL_REFERENZ, { schritt: 2 }, { basisVerzeichnis: BASIS })
    ladeLetztenGueltigenCheckpoint(laufId, { basisVerzeichnis: BASIS })
    const nachher = schnappschuss()

    assert.strictEqual(nachher, vorher)
  } finally {
    rmSync(produktVerzeichnis, { recursive: true, force: true })
    raeumeAuf(laufId)
  }
})

test('jeder Vorgang erzeugt genau eine strukturierte Ereigniszeile — A11/AC9', () => {
  const laufIdGeschrieben = neueLaufId('ereignis-schreiben')
  const laufIdLeer = neueLaufId('ereignis-leer')
  const laufIdKorrupt = neueLaufId('ereignis-korrupt')
  try {
    let ereignisse: Ereignis[] = []
    const schreiber: Schreiber = (e) => {
      ereignisse.push(e)
    }

    schreibeCheckpoint(laufIdGeschrieben, PROFIL_REFERENZ, { schritt: 1 }, { basisVerzeichnis: BASIS, schreiber })
    assert.strictEqual(ereignisse.length, 1)
    pruefeEreignis(ereignisse[0], 'checkpoint_geschrieben')

    ereignisse = []
    ladeLetztenGueltigenCheckpoint(laufIdGeschrieben, { basisVerzeichnis: BASIS, schreiber })
    assert.strictEqual(ereignisse.length, 1)
    pruefeEreignis(ereignisse[0], 'checkpoint_geladen')

    ereignisse = []
    ladeLetztenGueltigenCheckpoint(laufIdLeer, { basisVerzeichnis: BASIS, schreiber })
    assert.strictEqual(ereignisse.length, 1)
    pruefeEreignis(ereignisse[0], 'checkpoint_kein_gueltiger_gefunden')

    ereignisse = []
    const korruptVerzeichnis = join(BASIS, laufIdKorrupt, 'checkpoints')
    mkdirSync(korruptVerzeichnis, { recursive: true })
    writeFileSync(join(korruptVerzeichnis, `1-${'0'.repeat(64)}.json`), 'kein gueltiges JSON {')
    ladeLetztenGueltigenCheckpoint(laufIdKorrupt, { basisVerzeichnis: BASIS, schreiber })
    assert.strictEqual(ereignisse.length, 1)
    pruefeEreignis(ereignisse[0], 'checkpoint_validierungsfehler')
    assert.ok(Array.isArray(ereignisse[0].verstoesse) && ereignisse[0].verstoesse.length > 0)
  } finally {
    raeumeAuf(laufIdGeschrieben)
    raeumeAuf(laufIdLeer)
    raeumeAuf(laufIdKorrupt)
  }
})

test('ladeGueltigeCheckpoints liefert alle gültigen Checkpoints aufsteigend, schließt einen ungültigen Tail-Checkpoint aus, leere Kette liefert leeres Array — plan-v2-feature2 Delta 1', () => {
  const laufId = neueLaufId('alle-gueltigen')
  const laufIdLeer = neueLaufId('alle-gueltigen-leer')
  try {
    schreibeCheckpoint(laufId, PROFIL_REFERENZ, { schritt: 1 }, { basisVerzeichnis: BASIS })
    schreibeCheckpoint(laufId, PROFIL_REFERENZ, { schritt: 2 }, { basisVerzeichnis: BASIS })
    const dritter = schreibeCheckpoint(laufId, PROFIL_REFERENZ, { schritt: 3 }, { basisVerzeichnis: BASIS })

    const vollstaendig = ladeGueltigeCheckpoints(laufId, { basisVerzeichnis: BASIS })
    assert.strictEqual(vollstaendig.length, 3)
    assert.deepStrictEqual(
      vollstaendig.map((e) => e.payload.sequenz),
      [1, 2, 3]
    )
    assert.deepStrictEqual(vollstaendig[2]?.payload.daten, { schritt: 3 })

    // Tail-Checkpoint (sequenz 3) korrumpieren — Vorgänger (1, 2) hängen
    // nicht von ihm ab und müssen gültig bleiben (D3: Ungültigkeit
    // wirkt nur vorwärts über vorgaenger_hash, nie rückwärts).
    writeFileSync(dritter.pfad, '{ das ist kein gueltiges JSON')
    const nachKorruption = ladeGueltigeCheckpoints(laufId, { basisVerzeichnis: BASIS })
    assert.strictEqual(nachKorruption.length, 2)
    assert.deepStrictEqual(
      nachKorruption.map((e) => e.payload.sequenz),
      [1, 2]
    )

    const leer = ladeGueltigeCheckpoints(laufIdLeer, { basisVerzeichnis: BASIS })
    assert.deepStrictEqual(leer, [])
  } finally {
    raeumeAuf(laufId)
    raeumeAuf(laufIdLeer)
  }
})

test('manipulierter, aber intern konsistent nachgezogener Checkpoint-Inhalt unter unverändertem Dateinamen wird abgelehnt — B6/AC2+AC3', () => {
  const laufId = neueLaufId('hash-konsistenz')
  try {
    const { pfad } = schreibeCheckpoint(laufId, PROFIL_REFERENZ, { schritt: 'ursprung' }, { basisVerzeichnis: BASIS })
    assert.ok(existsSync(pfad))

    const roh = JSON.parse(readFileSync(pfad, 'utf8'))
    roh.payload.daten = { schritt: 'manipuliert' }
    // selbst_hash im Inhalt korrekt neu berechnen (intern also konsistent),
    // Dateiname bewusst NICHT anpassen — genau der Fall aus B6.
    const { selbst_hash: _alterHash, ...payloadOhneHash } = roh.payload
    roh.payload.selbst_hash = sha256Hex(kanonischesJson({ ...roh, payload: payloadOhneHash }))
    writeFileSync(pfad, kanonischesJson(roh))

    const geladen = ladeLetztenGueltigenCheckpoint(laufId, { basisVerzeichnis: BASIS })
    assert.strictEqual(geladen, null, 'ein manipulierter Checkpoint darf nicht als gültig akzeptiert werden, selbst wenn er intern konsistent ist')
  } finally {
    raeumeAuf(laufId)
  }
})
