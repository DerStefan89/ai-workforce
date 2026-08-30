/**
 * Datei: src/human-transport/human-transport.test.ts
 *
 * Zweck: node:test-Fälle für A2-A9/A8a (state/tasks/f9-human-transport-
 * bauauftrag.md). Läuft auf einem Wegwerfverzeichnis unter
 * kontrollzustand-test/ (nicht kontrollzustand/ selbst). Jeder Lauf
 * berührt bis zu drei getrennte Ketten: lineage-bedarf-<laufId>,
 * lineage-transport-<laufId> (beide über F2s lauf_id-Konvention) und
 * <laufId> selbst (F1B-Wirkungsmarken, ohne Präfix) — alle drei werden im
 * finally-Block aufgeräumt.
 */

import { randomUUID } from 'node:crypto'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { stelleLaufstatusFest } from '../checkpoint-store/index.ts'
import { ladeArtefaktVersion, listeVersionen } from '../lineage-registry/index.ts'
import type { ProfilReferenz } from '../checkpoint-store/types.ts'
import {
  baueAktuelleEingabeInhalte,
  befuelleWerkzeugAuswahl,
  entscheideStale,
  erfasseBedarf,
  erzeugeTransportpaket,
  haendigeAus,
  importiereAntwort,
  pruefeUndEntscheideStale,
} from './index.ts'

const BASIS = 'kontrollzustand-test'
const PROFIL_REFERENZ: ProfilReferenz = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
const STILL = { basisVerzeichnis: BASIS, schreiber: () => {} }

function neueLaufId(praefix: string): string {
  return `${praefix}-${randomUUID()}`
}

function raeumeAuf(laufId: string): void {
  rmSync(join(BASIS, `lineage-bedarf-${laufId}`), { recursive: true, force: true })
  rmSync(join(BASIS, `lineage-transport-${laufId}`), { recursive: true, force: true })
  rmSync(join(BASIS, laufId), { recursive: true, force: true })
}

test('A2: BEDARF_V0 mit werkzeug_auswahl:null registrierbar und inhaltlich identisch wieder ladbar', () => {
  const laufId = neueLaufId('a2')
  try {
    erfasseBedarf(laufId, PROFIL_REFERENZ, 'Werkzeugempfehlung klären', [], STILL)
    const geladen = ladeArtefaktVersion(`bedarf-${laufId}`, undefined, STILL)
    assert.ok(geladen)
    assert.strictEqual(geladen.versionSequenz, 1)
    assert.deepStrictEqual(geladen.daten, {
      bedarf_schema: 'v0',
      lauf_id: laufId,
      beschreibung: 'Werkzeugempfehlung klären',
      werkzeug_auswahl: null,
      erstellt_am: (geladen.daten as { erstellt_am: string }).erstellt_am,
    })
  } finally {
    raeumeAuf(laufId)
  }
})

test('A3: befuelleWerkzeugAuswahl erzeugt neue Version, erste Version bleibt unverändert (ARCHITECTURE.md:41)', () => {
  const laufId = neueLaufId('a3')
  try {
    erfasseBedarf(laufId, PROFIL_REFERENZ, 'Werkzeugempfehlung klären', [], STILL)
    befuelleWerkzeugAuswahl(
      laufId,
      PROFIL_REFERENZ,
      { kandidat: 'docs/harness/werkzeug-katalog.md#coach', quelle: 'docs/harness/werkzeug-katalog.md', manuell_bestaetigt_am: new Date().toISOString() },
      STILL
    )

    const versionen = listeVersionen(`bedarf-${laufId}`, STILL)
    assert.strictEqual(versionen.length, 2)
    assert.strictEqual((versionen[0]?.daten as { werkzeug_auswahl: unknown }).werkzeug_auswahl, null)
    assert.notStrictEqual((versionen[1]?.daten as { werkzeug_auswahl: unknown }).werkzeug_auswahl, null)
  } finally {
    raeumeAuf(laufId)
  }
})

test('A4: Transportpaket Version 1 referenziert die BEDARF_V0-Version über eingaben', () => {
  const laufId = neueLaufId('a4')
  try {
    erfasseBedarf(laufId, PROFIL_REFERENZ, 'Werkzeugempfehlung klären', [], STILL)
    erzeugeTransportpaket(laufId, PROFIL_REFERENZ, 1, 'Bitte prüfen: ...', 'ChatGPT (manueller Kopierblock)', STILL)

    const geladen = ladeArtefaktVersion(`transport-${laufId}`, undefined, STILL)
    assert.ok(geladen)
    assert.strictEqual(geladen.eingaben.length, 1)
    assert.strictEqual(geladen.eingaben[0]?.pfad, `artefakt:bedarf-${laufId}`)
    assert.deepStrictEqual((geladen.daten as { bezieht_sich_auf_bedarf: unknown }).bezieht_sich_auf_bedarf, {
      artefakt_id: `bedarf-${laufId}`,
      versionSequenz: 1,
    })
  } finally {
    raeumeAuf(laufId)
  }
})

test('A5: haendigeAus schreibt RUN_PREPARED vor Aushändigung, belegt über stelleLaufstatusFest', () => {
  const laufId = neueLaufId('a5')
  try {
    haendigeAus(laufId, PROFIL_REFERENZ, STILL)
    const status = stelleLaufstatusFest(laufId, STILL)
    assert.strictEqual(status.status, 'KLAERUNG_ERFORDERLICH')
  } finally {
    raeumeAuf(laufId)
  }
})

test('A6/D4: schemawidrige Antwort führt zu keiner Registrierung und Terminalartefakt FEHLGESCHLAGEN', () => {
  const laufId = neueLaufId('a6')
  try {
    erfasseBedarf(laufId, PROFIL_REFERENZ, 'Werkzeugempfehlung klären', [], STILL)
    erzeugeTransportpaket(laufId, PROFIL_REFERENZ, 1, 'Bitte prüfen: ...', 'ChatGPT (manueller Kopierblock)', STILL)
    haendigeAus(laufId, PROFIL_REFERENZ, STILL)

    const ergebnis = importiereAntwort(laufId, PROFIL_REFERENZ, { falschesFeld: 'x' }, 'ERFOLGREICH', STILL)
    assert.strictEqual(ergebnis.ok, false)

    const versionen = listeVersionen(`transport-${laufId}`, STILL)
    assert.strictEqual(versionen.length, 1, 'keine Version 2 bei Schemaverstoß')

    const status = stelleLaufstatusFest(laufId, STILL)
    assert.strictEqual(status.status, 'ABGESCHLOSSEN')
    if (status.status === 'ABGESCHLOSSEN') {
      assert.strictEqual(status.ergebnis, 'FEHLGESCHLAGEN')
    }
  } finally {
    raeumeAuf(laufId)
  }
})

test('A7: gültige Antwort wird als Transportpaket Version 2 registriert und schließt mit der übergebenen Einstufung ab', () => {
  const laufId = neueLaufId('a7')
  try {
    erfasseBedarf(laufId, PROFIL_REFERENZ, 'Werkzeugempfehlung klären', [], STILL)
    erzeugeTransportpaket(laufId, PROFIL_REFERENZ, 1, 'Bitte prüfen: ...', 'ChatGPT (manueller Kopierblock)', STILL)
    haendigeAus(laufId, PROFIL_REFERENZ, STILL)

    const ergebnis = importiereAntwort(laufId, PROFIL_REFERENZ, { antwort: 'Ja, gibt es.' }, 'VERWEIGERT', STILL)
    assert.strictEqual(ergebnis.ok, true)

    const versionen = listeVersionen(`transport-${laufId}`, STILL)
    assert.strictEqual(versionen.length, 2)
    assert.strictEqual((versionen[1]?.daten as { status: string }).status, 'ANTWORT_EINGETROFFEN')

    const status = stelleLaufstatusFest(laufId, STILL)
    assert.strictEqual(status.status, 'ABGESCHLOSSEN')
    if (status.status === 'ABGESCHLOSSEN') {
      assert.strictEqual(status.ergebnis, 'VERWEIGERT')
    }
  } finally {
    raeumeAuf(laufId)
  }
})

test('D2-synthetischer-Schlüssel: BEDARF_V0-Änderung nach Transportpaket-Erzeugung liefert stale:true (A8/AC7)', () => {
  const laufId = neueLaufId('a8')
  try {
    erfasseBedarf(laufId, PROFIL_REFERENZ, 'ursprüngliche Beschreibung', [], STILL)
    erzeugeTransportpaket(laufId, PROFIL_REFERENZ, 1, 'Bitte prüfen: ...', 'ChatGPT (manueller Kopierblock)', STILL)

    const vorAenderung = pruefeUndEntscheideStale(laufId, {}, STILL)
    assert.strictEqual(vorAenderung.stale, false)
    assert.strictEqual(vorAenderung.freigegeben, true)

    befuelleWerkzeugAuswahl(
      laufId,
      PROFIL_REFERENZ,
      { kandidat: 'x', quelle: 'y', manuell_bestaetigt_am: new Date().toISOString() },
      STILL
    )

    const nachAenderung = pruefeUndEntscheideStale(laufId, {}, STILL)
    assert.strictEqual(nachAenderung.stale, true)
    assert.strictEqual(nachAenderung.freigegeben, false)
    assert.deepStrictEqual(nachAenderung.geaenderteEingaben, [`artefakt:bedarf-${laufId}`])
  } finally {
    raeumeAuf(laufId)
  }
})

test('A8a/D6: pruefeUndEntscheideStale bleibt ohne entscheideStale-Aufruf freigegeben:false; entscheideStale hält die Entscheidung fest, ohne den Vergleich rückwirkend zu ändern', () => {
  const laufId = neueLaufId('a8a')
  try {
    erfasseBedarf(laufId, PROFIL_REFERENZ, 'ursprüngliche Beschreibung', [], STILL)
    erzeugeTransportpaket(laufId, PROFIL_REFERENZ, 1, 'Bitte prüfen: ...', 'ChatGPT (manueller Kopierblock)', STILL)
    befuelleWerkzeugAuswahl(
      laufId,
      PROFIL_REFERENZ,
      { kandidat: 'x', quelle: 'y', manuell_bestaetigt_am: new Date().toISOString() },
      STILL
    )

    const erstePruefung = pruefeUndEntscheideStale(laufId, {}, STILL)
    assert.strictEqual(erstePruefung.freigegeben, false, 'ohne festgehaltene Entscheidung bleibt die Weiterverwendung blockiert')

    assert.doesNotThrow(() => {
      entscheideStale(laufId, PROFIL_REFERENZ, 'nachtrag', undefined, STILL)
    })

    const zweitePruefung = pruefeUndEntscheideStale(laufId, {}, STILL)
    assert.strictEqual(
      zweitePruefung.freigegeben,
      false,
      'haltFestStaleEntscheidung hält nur eine Entscheidung fest, ändert den Inhaltsvergleich nicht rückwirkend — kein automatisches Entsperren'
    )
  } finally {
    raeumeAuf(laufId)
  }
})

test('A9: RUN_PREPARED ohne Terminalartefakt führt über stelleLaufstatusFest zu KLAERUNG_ERFORDERLICH (reine Wiederverwendung, kein F9-eigener Code)', () => {
  const laufId = neueLaufId('a9')
  try {
    erfasseBedarf(laufId, PROFIL_REFERENZ, 'Werkzeugempfehlung klären', [], STILL)
    erzeugeTransportpaket(laufId, PROFIL_REFERENZ, 1, 'Bitte prüfen: ...', 'ChatGPT (manueller Kopierblock)', STILL)
    haendigeAus(laufId, PROFIL_REFERENZ, STILL)

    const status = stelleLaufstatusFest(laufId, STILL)
    assert.strictEqual(status.status, 'KLAERUNG_ERFORDERLICH')
  } finally {
    raeumeAuf(laufId)
  }
})

test('baueAktuelleEingabeInhalte ergänzt reale Dateiinhalte um den synthetischen BEDARF_V0-Eintrag (B5)', () => {
  const laufId = neueLaufId('b5')
  try {
    erfasseBedarf(laufId, PROFIL_REFERENZ, 'Werkzeugempfehlung klären', [], STILL)

    const inhalte = baueAktuelleEingabeInhalte(laufId, { 'docs/echte-datei.md': 'ABC' }, STILL)
    assert.strictEqual(inhalte['docs/echte-datei.md'], 'ABC')
    assert.ok(Object.hasOwn(inhalte, `artefakt:bedarf-${laufId}`))
  } finally {
    raeumeAuf(laufId)
  }
})
