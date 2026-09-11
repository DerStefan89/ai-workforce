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
import { mkdtempSync, existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

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
