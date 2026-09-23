/**
 * Datei: scripts/_aufraeumen.test.ts
 *
 * Zweck: Prüft die Schutzklausel von raeumeVerzeichnis — NICHT das Löschen
 * selbst. Dass rmSync löscht, ist Node-Verhalten; ein Test dafür testete
 * Node. Prüfenswert ist allein, was diese Datei dem hinzufügt: die
 * Weigerung bei Pfaden, die kein Wegwerf-Verzeichnis bezeichnen. `force:
 * true` nimmt jede Rückmeldung weg, deshalb ist die Weigerung die einzige
 * Stelle, an der ein falsch berechneter Pfad noch auffallen kann.
 *
 * Vorbild: scripts/_mode.test.ts — auch dort wird die eigene Zutat geprüft,
 * nicht die darunterliegende Plattform.
 */

import assert from 'node:assert/strict'
import fsModul, { existsSync, mkdtempSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { raeumeVerzeichnis, resteDateiFuerAktuellenProzess } from './_aufraeumen.ts'

/** Entfernt die Je-PID-Reste-Datei dieses Testprozesses, falls ein Testfall sie angelegt hat. */
function raeumeResteDateiAuf(): void {
  const resteDatei = resteDateiFuerAktuellenProzess()
  if (existsSync(resteDatei)) {
    unlinkSync(resteDatei)
  }
}

test('raeumeVerzeichnis verweigert Pfade, die das Arbeitsverzeichnis treffen würden', () => {
  for (const pfad of ['', '.', './', '..', '../', '/', ' . ']) {
    assert.throws(
      () => raeumeVerzeichnis(pfad),
      /kein Wegwerf-Verzeichnis/,
      `'${pfad}' muss abgewiesen werden`
    )
  }
})

test('raeumeVerzeichnis entfernt ein Wegwerf-Verzeichnis samt Inhalt', () => {
  const verzeichnis = mkdtempSync(join(tmpdir(), 'aufraeumen-test-'))
  writeFileSync(join(verzeichnis, 'inhalt.txt'), 'x')

  raeumeVerzeichnis(verzeichnis)

  assert.equal(existsSync(verzeichnis), false)
})

test('raeumeVerzeichnis ist idempotent — ein bereits entfernter Pfad wirft nicht', () => {
  const verzeichnis = mkdtempSync(join(tmpdir(), 'aufraeumen-test-'))
  raeumeVerzeichnis(verzeichnis)

  assert.doesNotThrow(() => raeumeVerzeichnis(verzeichnis))
})

test('raeumeVerzeichnis wirft weiterhin bei einem nicht tolerierten Fehlercode (Rot-Fall F-590)', (t) => {
  // Mock über den Default-Import: `import * as fs` liefert ein eingefrorenes
  // ESM-Namensraumobjekt, an dem mock.method mit "Cannot redefine property" scheitert.
  t.mock.method(fsModul, 'rmSync', () => {
    throw Object.assign(new Error('Zugriff verweigert'), { code: 'EACCES' })
  })
  const verzeichnis = join(tmpdir(), 'aufraeumen-test-eacces')

  assert.throws(() => raeumeVerzeichnis(verzeichnis), /Zugriff verweigert/)
  assert.equal(existsSync(resteDateiFuerAktuellenProzess()), false, 'EACCES darf nicht in der Reste-Datei landen')
})

test('raeumeVerzeichnis toleriert EPERM nach ausgeschöpften Wiederholungen und sammelt den Pfad (F-590)', (t) => {
  raeumeResteDateiAuf()
  t.mock.method(fsModul, 'rmSync', () => {
    throw Object.assign(new Error('EPERM: operation not permitted'), { code: 'EPERM' })
  })
  const verzeichnis = join(tmpdir(), 'aufraeumen-test-eperm')

  try {
    const resteDatei = resteDateiFuerAktuellenProzess()
    assert.doesNotThrow(() => raeumeVerzeichnis(verzeichnis))
    assert.equal(existsSync(resteDatei), true, 'tolerierter Fehler muss in der Reste-Datei gesammelt werden')
    const eintraege = readFileSync(resteDatei, 'utf8')
      .split('\n')
      .filter((zeile) => zeile.trim().length > 0)
      .map((zeile) => JSON.parse(zeile))
    assert.ok(
      eintraege.some((eintrag) => eintrag.pfad === verzeichnis && eintrag.code === 'EPERM'),
      'die Reste-Datei muss den Pfad mit Fehlercode EPERM enthalten'
    )
  } finally {
    raeumeResteDateiAuf()
  }
})
