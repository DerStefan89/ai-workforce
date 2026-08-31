/**
 * Datei: src/context-builder/context-builder.test.ts
 *
 * Zweck: node:test-Fälle für AC1-AC11 (state/tasks/f5-context-builder.md
 * SCOPE.4). Läuft auf einem Wegwerfverzeichnis unter kontrollzustand-test/
 * (nicht kontrollzustand/ selbst). Jeder Lauf berührt die F2-Kette
 * lineage-kontextpaket-<laufId>, im finally-Block aufgeräumt.
 */

import { randomUUID } from 'node:crypto'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ProfilReferenz } from '../checkpoint-store/types.ts'
import { baueKontextpaket, pruefeKontextpaketFrisch } from './index.ts'
import type { Anfrage } from './types.ts'

const BASIS = 'kontrollzustand-test'
const PROFIL_REFERENZ: ProfilReferenz = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
const STILL = { basisVerzeichnis: BASIS, schreiber: () => {} }

function neueLaufId(praefix: string): string {
  return `${praefix}-${randomUUID()}`
}

function raeumeAuf(laufId: string): void {
  rmSync(join(BASIS, `lineage-kontextpaket-${laufId}`), { recursive: true, force: true })
}

function anfrage(teil: Partial<Anfrage> & { pfad: string; inhalt: string }): Anfrage {
  return { frage: 'Test-Frage', begruendung: 'Test-Begründung', ...teil }
}

test('AC1: Grünfall — Budget reicht, alle Anfragen werden aufgenommen', () => {
  const laufId = neueLaufId('ac1')
  try {
    const ergebnis = baueKontextpaket(
      laufId,
      'qa',
      [anfrage({ pfad: 'features/F5/feature.md', inhalt: 'Inhalt A' }), anfrage({ pfad: 'state/plan-v1-f5-context-builder.md', inhalt: 'Inhalt B' })],
      PROFIL_REFERENZ,
      {},
      STILL
    )
    assert.strictEqual(ergebnis.ok, true)
    if (!ergebnis.ok) return
    assert.strictEqual(ergebnis.paket.elemente.length, 2)
    assert.strictEqual(ergebnis.paket.ausgeschlossen.length, 0)
    assert.strictEqual(ergebnis.paket.rolle, 'qa')
  } finally {
    raeumeAuf(laufId)
  }
})

test('AC2: Rollenausschluss — code-reviewer verliert eine state/tasks/**-Anfrage, mit Grund vermerkt', () => {
  const laufId = neueLaufId('ac2')
  try {
    const ergebnis = baueKontextpaket(
      laufId,
      'code-reviewer',
      [anfrage({ pfad: 'state/tasks/f5-context-builder.md', inhalt: 'Vertragstext' }), anfrage({ pfad: 'src/context-builder/index.ts', inhalt: 'Code' })],
      PROFIL_REFERENZ,
      {},
      STILL
    )
    assert.strictEqual(ergebnis.ok, true)
    if (!ergebnis.ok) return
    assert.strictEqual(ergebnis.paket.elemente.length, 1)
    assert.strictEqual(ergebnis.paket.elemente[0].pfad, 'src/context-builder/index.ts')
    assert.deepStrictEqual(ergebnis.paket.ausgeschlossen, [{ pfad: 'state/tasks/f5-context-builder.md', grund: 'rolle' }])
  } finally {
    raeumeAuf(laufId)
  }
})

test('AC3: Duplikat-Filterung — gleicher Pfad und gleiche bereichsKennung mit identischem Inhalt wird nur einmal aufgenommen, unterschiedliche bereichsKennung bleibt getrennt', () => {
  const laufId = neueLaufId('ac3')
  try {
    const ergebnis = baueKontextpaket(
      laufId,
      'qa',
      [
        anfrage({ pfad: 'src/context-builder/index.ts', bereichsKennung: 'L1-40', inhalt: 'Zeile 1-40' }),
        anfrage({ pfad: 'src/context-builder/index.ts', bereichsKennung: 'L1-40', inhalt: 'Zeile 1-40' }), // identisches Duplikat — übersprungen
        anfrage({ pfad: 'src/context-builder/index.ts', bereichsKennung: 'L41-80', inhalt: 'Zeile 41-80' }), // anderer Bereich — eigenes Element (löst B1)
      ],
      PROFIL_REFERENZ,
      {},
      STILL
    )
    assert.strictEqual(ergebnis.ok, true)
    if (!ergebnis.ok) return
    assert.strictEqual(ergebnis.paket.elemente.length, 2)
    const pfade = ergebnis.paket.elemente.map((e) => e.pfad).sort()
    assert.deepStrictEqual(pfade, ['src/context-builder/index.ts#L1-40', 'src/context-builder/index.ts#L41-80'])
  } finally {
    raeumeAuf(laufId)
  }
})

test('AC4: Budget-Überlauf ohne notwendig — überzählige Anfrage wird ausgeschlossen, kein Stopp', () => {
  const laufId = neueLaufId('ac4')
  try {
    const ergebnis = baueKontextpaket(
      laufId,
      'qa',
      [anfrage({ pfad: 'a.md', inhalt: 'x' }), anfrage({ pfad: 'b.md', inhalt: 'y' })],
      PROFIL_REFERENZ,
      { maxElemente: 1 },
      STILL
    )
    assert.strictEqual(ergebnis.ok, true)
    if (!ergebnis.ok) return
    assert.strictEqual(ergebnis.paket.elemente.length, 1)
    assert.deepStrictEqual(ergebnis.paket.ausgeschlossen, [{ pfad: 'b.md', grund: 'budget' }])
  } finally {
    raeumeAuf(laufId)
  }
})

test('AC5: Budget-Überlauf mit notwendig — mehrere notwendige Anfragen, die einzeln passen würden, aber gemeinsam das Budget überschreiten, führen zu EVIDENZLUECKE (D7)', () => {
  const laufId = neueLaufId('ac5')
  try {
    const ergebnis = baueKontextpaket(
      laufId,
      'qa',
      [
        anfrage({ pfad: 'a.md', inhalt: 'x', notwendig: true }),
        anfrage({ pfad: 'b.md', inhalt: 'y', notwendig: true }),
        anfrage({ pfad: 'c.md', inhalt: 'z' }), // optional — darf keine Rolle spielen, Phase B läuft nicht an
      ],
      PROFIL_REFERENZ,
      { maxElemente: 1 },
      STILL
    )
    assert.strictEqual(ergebnis.ok, false)
    if (ergebnis.ok) return
    assert.strictEqual(ergebnis.grund, 'EVIDENZLUECKE')
    assert.deepStrictEqual((ergebnis as { nichtAufnehmbar: string[] }).nichtAufnehmbar, ['b.md'])
  } finally {
    raeumeAuf(laufId)
  }
})

test('AC6: Registrierung trägt die angenommenen Elemente korrekt als eingaben (F2-Rundlauf)', () => {
  const laufId = neueLaufId('ac6')
  try {
    const ergebnis = baueKontextpaket(laufId, 'qa', [anfrage({ pfad: 'features/F5/feature.md', inhalt: 'Inhalt' })], PROFIL_REFERENZ, {}, STILL)
    assert.strictEqual(ergebnis.ok, true)
    if (!ergebnis.ok) return
    assert.strictEqual(ergebnis.versionSequenz, 1)
    assert.strictEqual(ergebnis.paket.elemente[0].pfad, 'features/F5/feature.md')
    assert.strictEqual(typeof ergebnis.inhaltsHash, 'string')
  } finally {
    raeumeAuf(laufId)
  }
})

test('AC7: STALE-Blockade — geänderter Inhalt eines Elements liefert stale:true bei erneuter Prüfung', () => {
  const laufId = neueLaufId('ac7')
  try {
    const ergebnis = baueKontextpaket(laufId, 'qa', [anfrage({ pfad: 'features/F5/feature.md', inhalt: 'Ursprünglicher Inhalt' })], PROFIL_REFERENZ, {}, STILL)
    assert.strictEqual(ergebnis.ok, true)
    if (!ergebnis.ok) return

    const unveraendert = pruefeKontextpaketFrisch(laufId, ergebnis.versionSequenz, { 'features/F5/feature.md': 'Ursprünglicher Inhalt' }, STILL)
    assert.strictEqual(unveraendert.stale, false)

    const veraendert = pruefeKontextpaketFrisch(laufId, ergebnis.versionSequenz, { 'features/F5/feature.md': 'Geänderter Inhalt' }, STILL)
    assert.strictEqual(veraendert.stale, true)
    assert.deepStrictEqual(veraendert.geaenderteEingaben, ['features/F5/feature.md'])
  } finally {
    raeumeAuf(laufId)
  }
})

test('AC10/Delta 5: pruefeKontextpaketFrisch gegen eine nie registrierte lauf_id liefert still stale:false, kein Wurf', () => {
  const laufId = neueLaufId('ac10-nie-registriert')
  try {
    const ergebnis = pruefeKontextpaketFrisch(laufId, 1, { 'irgendein/pfad.md': 'Inhalt' }, STILL)
    assert.deepStrictEqual(ergebnis, { stale: false, geaenderteEingaben: [] })
  } finally {
    raeumeAuf(laufId)
  }
})

test('Delta 2: unbekannte Rolle führt zu sofortigem Abbruch, kein stiller Vollzugriff', () => {
  const laufId = neueLaufId('unbekannte-rolle')
  try {
    const ergebnis = baueKontextpaket(laufId, 'nicht-existierende-rolle', [anfrage({ pfad: 'a.md', inhalt: 'x' })], PROFIL_REFERENZ, {}, STILL)
    assert.deepStrictEqual(ergebnis, { ok: false, grund: 'unbekannte_rolle', rolle: 'nicht-existierende-rolle' })
  } finally {
    raeumeAuf(laufId)
  }
})

test('Nachtrag V3: "#" im rohen Pfad wird abgelehnt, kein stiller Schlüssel-Kollisionsfall', () => {
  const laufId = neueLaufId('ungueltiger-pfad')
  try {
    const ergebnis = baueKontextpaket(laufId, 'qa', [anfrage({ pfad: 'a#b', inhalt: 'x' })], PROFIL_REFERENZ, {}, STILL)
    assert.deepStrictEqual(ergebnis, { ok: false, grund: 'ungueltiger_pfad', pfad: 'a#b' })
  } finally {
    raeumeAuf(laufId)
  }
})

test('Nachtrag V4: zwei Anfragen mit gleichem Element-Schlüssel, aber unterschiedlichem Inhalt, werden als Widerspruch abgelehnt', () => {
  const laufId = neueLaufId('widerspruch')
  try {
    const ergebnis = baueKontextpaket(
      laufId,
      'qa',
      [anfrage({ pfad: 'a.md', bereichsKennung: 'L1-10', inhalt: 'Inhalt X' }), anfrage({ pfad: 'a.md', bereichsKennung: 'L1-10', inhalt: 'Inhalt Y' })],
      PROFIL_REFERENZ,
      {},
      STILL
    )
    assert.deepStrictEqual(ergebnis, { ok: false, grund: 'widerspruechliche_anfrage', pfad: 'a.md#L1-10' })
  } finally {
    raeumeAuf(laufId)
  }
})
