/**
 * Datei: src/lineage-registry/lineage-registry.test.ts
 *
 * Zweck: Sechs node:test-Fälle (plan-v2-feature2-artifact-registry-
 * lineage.md Delta 2), die A1-A4/A12/A13 (AC1-AC4/AC12/AC13) abdecken.
 * Läuft auf einem Wegwerfverzeichnis unter kontrollzustand-test/ (nicht
 * kontrollzustand/ selbst), damit kein Produktzustand durch Tests
 * verschmutzt wird.
 */

import { createHash, randomUUID } from 'node:crypto'
import { readdirSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  haltFestStaleEntscheidung,
  ladeArtefaktVersion,
  listeVersionen,
  pruefeStale,
  registriereKernArtefakt,
  registriereWerkzeugReferenz,
} from './index.ts'
import type { ProfilReferenz } from '../checkpoint-store/types.ts'

const BASIS = 'kontrollzustand-test'
const PROFIL_REFERENZ: ProfilReferenz = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }

function neueArtefaktId(praefix: string): string {
  return `${praefix}-${randomUUID()}`
}

function raeumeAuf(artefaktId: string): void {
  rmSync(join(BASIS, `lineage-${artefaktId}`), { recursive: true, force: true })
}

function einzigeCheckpointDatei(artefaktId: string): string {
  const verzeichnis = join(BASIS, `lineage-${artefaktId}`, 'checkpoints')
  const dateien = readdirSync(verzeichnis).sort()
  const erste = dateien[0]
  if (erste === undefined) throw new Error(`keine Checkpoint-Datei unter ${verzeichnis}`)
  return join(verzeichnis, erste)
}

test('Rundlauf kern: registriereKernArtefakt gefolgt von ladeArtefaktVersion liefert inhaltlich identischen Eintrag — A1/AC1', () => {
  const artefaktId = neueArtefaktId('rundlauf-kern')
  try {
    const herkunft = { erzeuger: 'kern', schritt: 'coach-output' }
    const daten = { inhalt: 'kern-erzeugtes-artefakt' }
    const eingaben = [{ pfad: 'docs/eingabe.md', zitierter_bereich: 'Abschnitt 1', inhalts_hash: 'a'.repeat(64) }]

    registriereKernArtefakt(artefaktId, PROFIL_REFERENZ, herkunft, daten, eingaben, { basisVerzeichnis: BASIS, schreiber: () => {} })
    const geladen = ladeArtefaktVersion(artefaktId, undefined, { basisVerzeichnis: BASIS, schreiber: () => {} })

    assert.ok(geladen)
    assert.strictEqual(geladen.erzeugungsart, 'kern')
    assert.deepStrictEqual(geladen.daten, daten)
    assert.deepStrictEqual(geladen.herkunft, herkunft)
    assert.deepStrictEqual(geladen.eingaben, eingaben)
    assert.strictEqual(geladen.versionSequenz, 1)
  } finally {
    raeumeAuf(artefaktId)
  }
})

test('Rundlauf werkzeug ohne daten-Unterfeld, strukturell geprüft — A2/AC2', () => {
  const artefaktId = neueArtefaktId('rundlauf-werkzeug')
  try {
    registriereWerkzeugReferenz(
      artefaktId,
      PROFIL_REFERENZ,
      'src/beispiel.ts',
      'Zeile 1-20',
      'werkzeug-erzeugter-inhalt',
      { erzeuger: 'werkzeug', name: 'linter' },
      [],
      { basisVerzeichnis: BASIS, schreiber: () => {} }
    )

    const geladen = ladeArtefaktVersion(artefaktId, undefined, { basisVerzeichnis: BASIS, schreiber: () => {} })
    assert.ok(geladen)
    assert.strictEqual(geladen.erzeugungsart, 'werkzeug')
    assert.strictEqual('daten' in geladen, false, "'daten' darf bei erzeugungsart 'werkzeug' nicht gesetzt sein")

    const roherCheckpoint = JSON.parse(readFileSync(einzigeCheckpointDatei(artefaktId), 'utf8'))
    assert.strictEqual('daten' in roherCheckpoint.payload.daten, false, 'geschriebener Checkpoint darf payload.daten.daten nicht tragen')
  } finally {
    raeumeAuf(artefaktId)
  }
})

test('zwei Versionen: ältere Checkpoint-Datei bleibt byteidentisch nach dem zweiten Aufruf — A3/A4/AC3/AC4', () => {
  const artefaktId = neueArtefaktId('zwei-versionen')
  try {
    registriereKernArtefakt(artefaktId, PROFIL_REFERENZ, { erzeuger: 'kern' }, { schritt: 1 }, [], {
      basisVerzeichnis: BASIS,
      schreiber: () => {},
    })
    const ersteDatei = einzigeCheckpointDatei(artefaktId)
    const inhaltVorher = readFileSync(ersteDatei, 'utf8')

    registriereKernArtefakt(artefaktId, PROFIL_REFERENZ, { erzeuger: 'kern' }, { schritt: 2 }, [], {
      basisVerzeichnis: BASIS,
      schreiber: () => {},
    })

    const versionen = listeVersionen(artefaktId, { basisVerzeichnis: BASIS, schreiber: () => {} })
    assert.strictEqual(versionen.length, 2)
    assert.deepStrictEqual(
      versionen.map((v) => v.versionSequenz),
      [1, 2]
    )

    const inhaltNachher = readFileSync(ersteDatei, 'utf8')
    assert.strictEqual(inhaltNachher, inhaltVorher, 'die ältere Checkpoint-Datei darf durch den zweiten Aufruf nicht verändert werden')
  } finally {
    raeumeAuf(artefaktId)
  }
})

test('listeVersionen/ladeArtefaktVersion filtert STALE-Entscheidungen aus der gemeinsamen Kette heraus — A13/AC13', () => {
  const artefaktId = neueArtefaktId('stale-filter')
  try {
    registriereKernArtefakt(artefaktId, PROFIL_REFERENZ, { erzeuger: 'kern' }, { schritt: 1 }, [], {
      basisVerzeichnis: BASIS,
      schreiber: () => {},
    })
    haltFestStaleEntscheidung(artefaktId, 1, PROFIL_REFERENZ, 'nachtrag', undefined, undefined, {
      basisVerzeichnis: BASIS,
      schreiber: () => {},
    })

    const versionen = listeVersionen(artefaktId, { basisVerzeichnis: BASIS, schreiber: () => {} })
    assert.strictEqual(versionen.length, 1, 'die STALE-Entscheidung darf nicht als Version gezählt werden')
    assert.strictEqual(versionen[0]?.versionSequenz, 1)

    const hoechsteVersion = ladeArtefaktVersion(artefaktId, undefined, { basisVerzeichnis: BASIS, schreiber: () => {} })
    assert.strictEqual(hoechsteVersion?.versionSequenz, 1, 'die STALE-Entscheidung (sequenz 2) darf nicht als höchste Version gelten')
  } finally {
    raeumeAuf(artefaktId)
  }
})

test('AC14-Hauptfall: unveränderte Eingabe liefert stale:false, geänderter Inhalt liefert stale:true mit genau diesem Schlüssel', () => {
  const artefaktId = neueArtefaktId('ac14-hauptfall')
  try {
    const eingabePfad = 'docs/zitierte-eingabe.md'
    const eingaben = [{ pfad: eingabePfad, zitierter_bereich: 'Abschnitt 1', inhalts_hash: createHash('sha256').update('ABC', 'utf8').digest('hex') }]
    registriereKernArtefakt(artefaktId, PROFIL_REFERENZ, { erzeuger: 'kern' }, { schritt: 1 }, eingaben, {
      basisVerzeichnis: BASIS,
      schreiber: () => {},
    })

    const unveraendert = pruefeStale(artefaktId, 1, { [eingabePfad]: 'ABC' }, { basisVerzeichnis: BASIS, schreiber: () => {} })
    assert.strictEqual(unveraendert.stale, false)
    assert.deepStrictEqual(unveraendert.geaenderteEingaben, [])

    const geaendert = pruefeStale(artefaktId, 1, { [eingabePfad]: 'XYZ' }, { basisVerzeichnis: BASIS, schreiber: () => {} })
    assert.strictEqual(geaendert.stale, true)
    assert.deepStrictEqual(geaendert.geaenderteEingaben, [eingabePfad])
  } finally {
    raeumeAuf(artefaktId)
  }
})

test('haltFestStaleEntscheidung ohne begruendung bei unveraendert_gueltig wirft — A12/AC12', () => {
  const artefaktId = neueArtefaktId('wurf-ohne-begruendung')
  try {
    registriereKernArtefakt(artefaktId, PROFIL_REFERENZ, { erzeuger: 'kern' }, { schritt: 1 }, [], {
      basisVerzeichnis: BASIS,
      schreiber: () => {},
    })

    assert.throws(() => {
      haltFestStaleEntscheidung(artefaktId, 1, PROFIL_REFERENZ, 'unveraendert_gueltig', undefined, undefined, {
        basisVerzeichnis: BASIS,
        schreiber: () => {},
      })
    }, /begruendung/)

    assert.doesNotThrow(() => {
      haltFestStaleEntscheidung(artefaktId, 1, PROFIL_REFERENZ, 'unveraendert_gueltig', 'geprüft, weiterhin gültig', undefined, {
        basisVerzeichnis: BASIS,
        schreiber: () => {},
      })
    })
  } finally {
    raeumeAuf(artefaktId)
  }
})
