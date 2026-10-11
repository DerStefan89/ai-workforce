/**
 * Datei: scripts/check-secrets.test.mjs
 *
 * Zweck: F45 B1a-2 (F-1024) — echter Rot-Fall des lokalen Secret-Scans (scripts/check-secrets.mjs bzw.
 * pruefeSecrets aus dem Projekt-Skelett): eine zur Laufzeit zusammengesetzte Attrappe in einem
 * Wegwerfordner unter os.tmpdir() (nie im Repo) macht den Scan rot, ein sauberer Ordner bleibt grün.
 * Läuft nur, wo gitleaks oder Docker vorhanden ist (die CI hat Docker) — sonst sichtbar übersprungen,
 * und der Hinweis-Zweig wird stattdessen geprüft. Keine Allowlist.
 *
 * Wird aufgerufen von:
 * - npm run test (node --test)
 */

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { pruefeSecrets } from '../vorlagen/projekt-skelett/scripts/check-gates.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const wurzel = mkdtempSync(join(tmpdir(), 'secret-scan-'))
after(() => raeumeVerzeichnis(wurzel))

/** Ein GitHub-Token-förmiger Wert, erst zur Laufzeit zusammengesetzt (nie als Literal im Repo). */
const attrappe = () => ['gh', 'p_'].join('') + 'Ab3dE5gH7jK9mN1pQ3sT5vW7yZ9bC1eF3hJ5'

/**
 * Wegwerfordner mit einer Datei.
 * @param name - Ordnername
 * @param inhalt - Dateiinhalt
 * @returns Ordner
 */
function ordnerMit(name, inhalt) {
  const ordner = join(wurzel, name)
  mkdirSync(ordner)
  writeFileSync(join(ordner, 'konfig.txt'), inhalt)
  return ordner
}

const erstesErgebnis = pruefeSecrets(ordnerMit('sauber', 'nichts Geheimes hier\n'))
const werkzeugDa = erstesErgebnis.stufe !== 'hinweis'

test('ohne gitleaks und Docker: sichtbarer Hinweis, nicht rot', { skip: werkzeugDa ? 'gitleaks/Docker vorhanden — echter Scan unten' : false }, () => {
  assert.match(erstesErgebnis.zeilen[0], /Secret-Scan NICHT gelaufen/)
})

test('echter Scan: Attrappe → rot, sauberer Ordner → grün', { skip: werkzeugDa ? false : 'weder gitleaks noch Docker vorhanden — echter Rotfall läuft in der CI' }, () => {
  assert.equal(erstesErgebnis.stufe, 'gruen', erstesErgebnis.zeilen.join('\n'))
  const rot = pruefeSecrets(ordnerMit('attrappe', `TOKEN=${attrappe()}\n`))
  assert.equal(rot.stufe, 'rot', rot.zeilen.join('\n'))
})

test('CLI: Exit-Code folgt der Stufe (Hinweis = 0)', () => {
  const lauf = spawnSync(process.execPath, [join(import.meta.dirname, 'check-secrets.mjs')], { cwd: join(wurzel, 'sauber'), encoding: 'utf8' })
  assert.equal(lauf.status, 0, lauf.stdout + lauf.stderr)
  assert.match(lauf.stdout, werkzeugDa ? /keine Funde/ : /Secret-Scan NICHT gelaufen/)
})
