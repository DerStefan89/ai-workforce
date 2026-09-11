/**
 * Datei: scripts/_aufraeumen.ts
 *
 * Zweck: Gemeinsames Aufräumen von Wegwerf-Verzeichnissen in Tests und
 * Gate-Skripten. Ein `rmSync(pfad, { recursive: true, force: true })` ohne
 * Wiederholung scheitert auf Windows sporadisch mit ENOTEMPTY/EBUSY/EPERM,
 * wenn ein Virenscanner, die Dateiindizierung oder ein eben beendeter
 * Kindprozess noch ein Handle hält (F-257, neun Auftreten an vier Stellen).
 * Node hat für genau diese Fehlerklasse maxRetries/retryDelay eingebaut —
 * ein Wiederholen von Hand wäre eine schlechtere Kopie davon.
 *
 * Ort: scripts/ und nicht src/, weil ARCHITECTURE.md `src/` als einzigen
 * Produktpfad festlegt — dies ist eine Prüfhilfe, kein Produktcode. Das
 * Präfix `_` folgt dem bestehenden scripts/_mode.ts. Neu gegenüber _mode.ts
 * ist die Import-Richtung: Diese Hilfe wird auch aus `src/**\/*.test.ts`
 * importiert. Umgekehrt importieren `.mjs`-Gates seit Langem aus `src/`
 * (z. B. scripts/check-f11-auftrag.mjs), die Richtung Test → scripts ist
 * also die Umkehrung eines erprobten Wegs, kein neuer Mechanismus.
 *
 * Wichtig: NUR für Wegwerf-Verzeichnisse in Prüfcode. Produktcode räumt
 * weiterhin ohne stilles Wiederholen auf — dort ist ein blockiertes Handle
 * ein Befund und kein Schluckauf. (Stand heute räumt Produktcode gar kein
 * Verzeichnis rekursiv; die Abgrenzung ist vorsorglich.)
 */

import { rmSync } from 'node:fs'

/**
 * Pfade, die niemals ein Wegwerf-Verzeichnis bezeichnen. `force: true`
 * schluckt jede Rückmeldung, deshalb muss der Unfall vorher auffallen:
 * `raeumeVerzeichnis('.')` räumte sonst wortlos das Arbeitsverzeichnis ab.
 */
const VERBOTENE_PFADE = new Set(['', '.', './', '..', '../', '/', '\\'])

/**
 * Entfernt ein Wegwerf-Verzeichnis samt Inhalt. Idempotent (`force`), und
 * bis zu zehn Wiederholungen im Abstand von 100 ms gegen kurzzeitig
 * gehaltene Handles.
 *
 * Der Pfad wird gegen `process.cwd()` aufgelöst, wenn er relativ ist —
 * Aufrufer, die `process.chdir()` benutzen, übergeben ihn absolut.
 *
 * @throws wenn `pfad` leer ist oder auf das Arbeitsverzeichnis bzw. dessen
 *   Elternverzeichnis zeigt, und (nach allen Wiederholungen) wenn das
 *   Verzeichnis sich weiterhin nicht entfernen lässt.
 */
export function raeumeVerzeichnis(pfad: string): void {
  if (VERBOTENE_PFADE.has(pfad.trim())) {
    throw new Error(
      `raeumeVerzeichnis: '${pfad}' ist kein Wegwerf-Verzeichnis — das hätte das Arbeitsverzeichnis abgeräumt.`
    )
  }
  rmSync(pfad, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
}
