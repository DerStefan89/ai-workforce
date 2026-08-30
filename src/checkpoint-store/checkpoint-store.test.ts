/**
 * Datei: src/checkpoint-store/checkpoint-store.test.ts
 *
 * Zweck: node:test-Fälle für den Checkpoint Store (F1, plan-v2-feature1
 * Delta 2 + Delta 4/B6) und für die Wirkungsmarke-Erweiterung (F1B,
 * state/plan-v2-f1b-wirkungsmarke.md + state/tasks/f1b-wirkungsmarke.md).
 * F1-Fälle decken die vier technischen Akzeptanzkriterien ohne
 * Gate-Zuordnung (A4/AC1, A5/AC2+AC3, A10/AC8, A11/AC9) sowie den
 * Dateiname-Inhalt-Hash-Konsistenz-Fall (B6). F1B-Fälle decken AC7
 * (A9-A12), die gemischte Kette und den unbekannten typ (A20/A21), das
 * Advisor-Szenario zu mehrfachem RUN_PREPARED (A22) und das
 * Orphan-dann-neue-RUN_PREPARED-Interleaving (A23, zweiter Advisor-Pass
 * B11). Läuft auf einem Wegwerfverzeichnis unter kontrollzustand-test/
 * (nicht kontrollzustand/ selbst), damit kein Produktzustand durch Tests
 * verschmutzt wird.
 */

import { createHash, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  kanonischesJson,
  ladeGueltigeCheckpoints,
  ladeLetztenGueltigenCheckpoint,
  schreibeCheckpoint,
  schreibeWirkungsmarke,
  sha256Hex,
  stelleLaufstatusFest,
} from './index.ts'
import type { Ereignis, LaufStatus, ProfilReferenz, Schreiber } from './types.ts'

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

/** Schmales Assert+Narrowing für LaufStatus — vermeidet einen ungeprüften Cast in jedem F1B-Testfall. */
function pruefeStatus<S extends LaufStatus['status']>(status: LaufStatus, erwartet: S): Extract<LaufStatus, { status: S }> {
  assert.strictEqual(status.status, erwartet)
  return status as Extract<LaufStatus, { status: S }>
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

// ─── F1B: Wirkungsmarke / RUN_PREPARED / Terminalartefakt ───────────────────

test('schreibeWirkungsmarke mit art terminal ohne gültiges ergebnis wirft vor dem Schreiben, hinterlässt keine Datei — A8', () => {
  const laufId = neueLaufId('wm-wurf')
  try {
    assert.throws(() => schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'terminal', {}, { basisVerzeichnis: BASIS }))
    assert.throws(() =>
      schreibeWirkungsmarke(
        laufId,
        PROFIL_REFERENZ,
        'terminal',
        { ergebnis: 'UNGUELTIG' as unknown as 'ERFOLGREICH' },
        { basisVerzeichnis: BASIS }
      )
    )
    const verzeichnis = join(BASIS, laufId, 'checkpoints')
    assert.ok(!existsSync(verzeichnis) || readdirSync(verzeichnis).length === 0)
  } finally {
    raeumeAuf(laufId)
  }
})

test('RUN_PREPARED gefolgt von Terminal ERFOLGREICH liefert ABGESCHLOSSEN/ERFOLGREICH — A9/AC7 Fall 1', () => {
  const laufId = neueLaufId('wm-erfolgreich')
  try {
    schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis: BASIS })
    schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'terminal', { ergebnis: 'ERFOLGREICH' }, { basisVerzeichnis: BASIS })
    const status = pruefeStatus(stelleLaufstatusFest(laufId, { basisVerzeichnis: BASIS }), 'ABGESCHLOSSEN')
    assert.strictEqual(status.ergebnis, 'ERFOLGREICH')
    assert.deepStrictEqual(status.terminaleOhneRunPrepared, [])
  } finally {
    raeumeAuf(laufId)
  }
})

test('RUN_PREPARED gefolgt von Terminal VERWEIGERT liefert ABGESCHLOSSEN/VERWEIGERT, nicht ERFOLGREICH — A10/AC4+AC7 Fall 2', () => {
  const laufId = neueLaufId('wm-verweigert')
  try {
    schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis: BASIS })
    schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'terminal', { ergebnis: 'VERWEIGERT' }, { basisVerzeichnis: BASIS })
    const status = pruefeStatus(stelleLaufstatusFest(laufId, { basisVerzeichnis: BASIS }), 'ABGESCHLOSSEN')
    assert.strictEqual(status.ergebnis, 'VERWEIGERT')
  } finally {
    raeumeAuf(laufId)
  }
})

test('nur RUN_PREPARED ohne Terminalartefakt liefert KLAERUNG_ERFORDERLICH mit den fünf ARCHITECTURE.md:61-Bestandteilen — A11/AC7 Fall 3', () => {
  const laufId = neueLaufId('wm-offen')
  try {
    schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis: BASIS })
    const status = pruefeStatus(stelleLaufstatusFest(laufId, { basisVerzeichnis: BASIS }), 'KLAERUNG_ERFORDERLICH')
    assert.strictEqual(status.blockerId, `wirkungsmarke-offene-run-prepared:${laufId}`)
    assert.strictEqual(typeof status.grund, 'string')
    assert.strictEqual(status.evidenz.laufId, laufId)
    assert.deepStrictEqual(status.evidenz.offeneRunPreparedSequenzen, [1])
    assert.strictEqual(status.evidenz.eintraege.length, 1)
    assert.strictEqual(typeof status.aufloesungsbedingung, 'string')
    assert.strictEqual(typeof status.resumeZiel, 'string')
  } finally {
    raeumeAuf(laufId)
  }
})

test('Abbruch zwischen RUN_PREPARED und Terminalartefakt: abgebrochener Terminal-Schreibversuch bleibt unsichtbar, Status bleibt KLAERUNG_ERFORDERLICH — A12/AC7 Fall 4', () => {
  const laufId = neueLaufId('wm-abbruch')
  try {
    schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis: BASIS })

    const verzeichnis = join(BASIS, laufId, 'checkpoints')
    const runPreparedName = readdirSync(verzeichnis)[0]
    assert.ok(runPreparedName)
    const runPreparedInhalt = JSON.parse(readFileSync(join(verzeichnis, runPreparedName), 'utf8'))

    const payloadOhneHash = {
      lauf_id: laufId,
      sequenz: 2,
      vorgaenger_hash: runPreparedInhalt.payload.selbst_hash,
      art: 'terminal',
      ergebnis: 'ERFOLGREICH',
    }
    const eintragOhneHash = { schema_version: 1, typ: 'wirkungsmarke', profil_referenz: PROFIL_REFERENZ, payload: payloadOhneHash }
    const selbstHash = sha256Hex(kanonischesJson(eintragOhneHash))
    const vollstaendigerInhalt = kanonischesJson({ ...eintragOhneHash, payload: { ...payloadOhneHash, selbst_hash: selbstHash } })
    // Zielname wäre "2-<selbstHash>.json" — der Temp-Suffix bleibt hier bewusst
    // am Namen hängen, weil kein rename() stattfand (Muster wie F1s A5-Test).
    writeFileSync(join(verzeichnis, `2-${selbstHash}.json.tmp-simuliert-abbruch`), vollstaendigerInhalt)

    const status = pruefeStatus(stelleLaufstatusFest(laufId, { basisVerzeichnis: BASIS }), 'KLAERUNG_ERFORDERLICH')
    assert.deepStrictEqual(status.evidenz.offeneRunPreparedSequenzen, [1])
  } finally {
    raeumeAuf(laufId)
  }
})

test('gemischte Kette (Checkpoint/Wirkungsmarke alternierend) wird über ladeGueltigeCheckpoints vollständig und in Reihenfolge geladen — A20', () => {
  const laufId = neueLaufId('gemischt')
  try {
    schreibeCheckpoint(laufId, PROFIL_REFERENZ, { schritt: 1 }, { basisVerzeichnis: BASIS })
    schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis: BASIS })
    schreibeCheckpoint(laufId, PROFIL_REFERENZ, { schritt: 2 }, { basisVerzeichnis: BASIS })
    schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'terminal', { ergebnis: 'ERFOLGREICH' }, { basisVerzeichnis: BASIS })

    const kette = ladeGueltigeCheckpoints(laufId, { basisVerzeichnis: BASIS })
    assert.strictEqual(kette.length, 4)
    assert.deepStrictEqual(
      kette.map((e) => e.payload.sequenz),
      [1, 2, 3, 4]
    )
    assert.deepStrictEqual(
      kette.map((e) => e.typ),
      ['checkpoint', 'wirkungsmarke', 'checkpoint', 'wirkungsmarke']
    )

    const status = pruefeStatus(stelleLaufstatusFest(laufId, { basisVerzeichnis: BASIS }), 'ABGESCHLOSSEN')
    assert.strictEqual(status.ergebnis, 'ERFOLGREICH')
  } finally {
    raeumeAuf(laufId)
  }
})

test('unbekannter typ mitten in der Kette wird als Regelverstoß erkannt, ladeGueltigeCheckpoints fällt auf den validen Vorgänger zurück — A21', () => {
  const laufId = neueLaufId('unbekannter-typ')
  try {
    schreibeCheckpoint(laufId, PROFIL_REFERENZ, { schritt: 1 }, { basisVerzeichnis: BASIS })

    const verzeichnis = join(BASIS, laufId, 'checkpoints')
    const ersterName = readdirSync(verzeichnis)[0]
    assert.ok(ersterName)
    const ersterInhalt = JSON.parse(readFileSync(join(verzeichnis, ersterName), 'utf8'))

    // Direkt ins Kettenverzeichnis geschrieben (nicht über die API) — ein
    // typ außerhalb von checkpoint/wirkungsmarke, sonst strukturell gültig.
    const payloadOhneHash = { lauf_id: laufId, sequenz: 2, vorgaenger_hash: ersterInhalt.payload.selbst_hash, daten: { unbekannt: true } }
    const eintragOhneHash = { schema_version: 1, typ: 'unbekannt', profil_referenz: PROFIL_REFERENZ, payload: payloadOhneHash }
    const selbstHash = sha256Hex(kanonischesJson(eintragOhneHash))
    writeFileSync(
      join(verzeichnis, `2-${selbstHash}.json`),
      kanonischesJson({ ...eintragOhneHash, payload: { ...payloadOhneHash, selbst_hash: selbstHash } })
    )

    schreibeCheckpoint(laufId, PROFIL_REFERENZ, { schritt: 3 }, { basisVerzeichnis: BASIS })

    const ereignisse: Ereignis[] = []
    const schreiber: Schreiber = (e) => {
      ereignisse.push(e)
    }
    const kette = ladeGueltigeCheckpoints(laufId, { basisVerzeichnis: BASIS, schreiber })
    assert.strictEqual(kette.length, 1)
    assert.strictEqual(kette[0]?.payload.sequenz, 1)
    assert.ok(
      ereignisse.some(
        (e) =>
          e.ereignis === 'checkpoint_validierungsfehler' &&
          e.verstoesse?.some((v) => v.includes("'typ' muss 'checkpoint' oder 'wirkungsmarke' sein"))
      ),
      'kein checkpoint_validierungsfehler mit dem erwarteten unbekannten-typ-Verstoß gefunden'
    )
  } finally {
    raeumeAuf(laufId)
  }
})

test('Advisor-Szenario: zwei RUN_PREPARED gefolgt von einem Terminal liefert KLAERUNG_ERFORDERLICH mit der jüngeren offenen Sequenz (FIFO löst die ältere auf), nicht ABGESCHLOSSEN — A22', () => {
  const laufId = neueLaufId('advisor-szenario')
  try {
    schreibeCheckpoint(laufId, PROFIL_REFERENZ, { schritt: 'start' }, { basisVerzeichnis: BASIS }) // sequenz 1
    schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis: BASIS }) // sequenz 2
    schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis: BASIS }) // sequenz 3
    schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'terminal', { ergebnis: 'ERFOLGREICH' }, { basisVerzeichnis: BASIS }) // sequenz 4

    const status = pruefeStatus(stelleLaufstatusFest(laufId, { basisVerzeichnis: BASIS }), 'KLAERUNG_ERFORDERLICH')
    // FIFO entnimmt die älteste offene Sequenz (2) als durch das Terminal
    // aufgelöst — die jüngere (3) bleibt offen (state/tasks/f1b-wirkungsmarke.md,
    // Korrektur gegenüber plan-v2s eigenem, in sich widersprüchlichem Recap-Absatz).
    assert.deepStrictEqual(status.evidenz.offeneRunPreparedSequenzen, [3])
  } finally {
    raeumeAuf(laufId)
  }
})

test('Orphan-Terminal gefolgt von neuem RUN_PREPARED liefert KLAERUNG_ERFORDERLICH mit der neuen Sequenz — A23, zweiter Advisor-Pass B11', () => {
  const laufId = neueLaufId('orphan-interleaving')
  try {
    schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis: BASIS }) // sequenz 1
    schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'terminal', { ergebnis: 'ERFOLGREICH' }, { basisVerzeichnis: BASIS }) // sequenz 2, matcht 1
    schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'terminal', { ergebnis: 'ERFOLGREICH' }, { basisVerzeichnis: BASIS }) // sequenz 3, Orphan
    schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis: BASIS }) // sequenz 4, kein weiteres Terminal

    const status = pruefeStatus(stelleLaufstatusFest(laufId, { basisVerzeichnis: BASIS }), 'KLAERUNG_ERFORDERLICH')
    // Die in plan-v2 Delta 1 formulierte, im zweiten Advisor-Pass (B11) als
    // falsch erkannte Formel (max(0, Anzahl run_prepared - Anzahl terminal))
    // würde hier 0 offene Marken behaupten (2 run_prepared, 2 terminal) —
    // der tatsächliche Warteschlangen-Algorithmus liefert korrekt [4].
    assert.deepStrictEqual(status.evidenz.offeneRunPreparedSequenzen, [4])
    assert.deepStrictEqual(status.terminaleOhneRunPrepared, [3])
  } finally {
    raeumeAuf(laufId)
  }
})

test('reine Orphan-Terminal-Kette ohne jede RUN_PREPARED-Marke liefert NICHT_GESTARTET — B11 vierter Fall (SCOPE.3)', () => {
  const laufId = neueLaufId('nur-orphan-terminal')
  try {
    schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'terminal', { ergebnis: 'ERFOLGREICH' }, { basisVerzeichnis: BASIS }) // sequenz 1, Orphan

    const status = pruefeStatus(stelleLaufstatusFest(laufId, { basisVerzeichnis: BASIS }), 'NICHT_GESTARTET')
    assert.deepStrictEqual(status.terminaleOhneRunPrepared, [1])
  } finally {
    raeumeAuf(laufId)
  }
})

test('lauf_id ohne jede Wirkungsmarke liefert NICHT_GESTARTET, kein Wurf — A7', () => {
  const laufId = neueLaufId('wm-nie-gestartet')
  try {
    schreibeCheckpoint(laufId, PROFIL_REFERENZ, { schritt: 1 }, { basisVerzeichnis: BASIS })
    const status = pruefeStatus(stelleLaufstatusFest(laufId, { basisVerzeichnis: BASIS }), 'NICHT_GESTARTET')
    assert.deepStrictEqual(status.terminaleOhneRunPrepared, [])
  } finally {
    raeumeAuf(laufId)
  }
})
