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
 *
 * F-590: `maxRetries` allein löst nicht jedes Windows-Handle — ein
 * Virenscanner kann ein Verzeichnis länger als zehn Wiederholungen à
 * 100 ms sperren. Nach ausgeschöpften Wiederholungen wirft diese Funktion
 * bei EPERM/EBUSY/ENOTEMPTY deshalb nicht mehr, sondern warnt auf stderr
 * und sammelt den Pfad in RESTE_VERZEICHNIS, eine Datei je Prozess-PID.
 * `scripts/aufraeumen-nachlauf.mjs` versucht diese Pfade am Ende von
 * `npm run check` noch einmal und meldet Reste nur als Hinweis (F-591:
 * dieses Tolerieren ist die Reparatur — `maxRetries` bleibt bei 10, siehe
 * oben). Andere Fehlercodes sind kein bekanntes Umgebungsmuster und werfen
 * weiterhin.
 *
 * Je-PID-Datei statt einer einzigen: `npm run test` führt Testdateien in
 * eigenen Worker-Prozessen parallel aus. Eine einzelne geteilte Datei
 * kollidiert dabei real (beobachtet: ein Prozess unlinkt sie, während ein
 * anderer gerade liest → ENOENT) — genau die Handle-Klasse, die diese
 * ganze Datei schon einmal adressiert.
 */

// Default-Import statt `import { rmSync }`: node:test mockt node:fs nur über
// dieses eine geteilte Modulobjekt (Property-Zugriff bei jedem Aufruf); ein
// destrukturierter Named Import bindet den Funktionswert schon beim Laden
// und sieht den Mock aus scripts/_aufraeumen.test.ts danach nicht mehr.
import fs from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Pfade, die niemals ein Wegwerf-Verzeichnis bezeichnen. `force: true`
 * schluckt jede Rückmeldung, deshalb muss der Unfall vorher auffallen:
 * `raeumeVerzeichnis('.')` räumte sonst wortlos das Arbeitsverzeichnis ab.
 */
const VERBOTENE_PFADE = new Set(['', '.', './', '..', '../', '/', '\\'])

/** Fehlercodes, die ein gehaltenes Handle statt eines echten Befunds anzeigen (F-590). */
const TOLERIERTE_FEHLERCODES = new Set(['EPERM', 'EBUSY', 'ENOTEMPTY'])

/**
 * Sammelstelle für Pfade, die nach allen Wiederholungen noch nicht
 * entfernt werden konnten. Liegt neben dieser Datei (nicht unter
 * `process.cwd()`), weil Aufrufer per `process.chdir()` das
 * Arbeitsverzeichnis wechseln können. Von `scripts/aufraeumen-nachlauf.mjs`
 * gelesen und dort auch wieder geleert.
 */
export const RESTE_VERZEICHNIS = fileURLToPath(new URL('.aufraeumen-reste/', import.meta.url))

/** Eigene Datei je Prozess-PID innerhalb RESTE_VERZEICHNIS — Begründung siehe Dateikopf. */
export function resteDateiFuerAktuellenProzess(): string {
  return join(RESTE_VERZEICHNIS, `${process.pid}.jsonl`)
}

/**
 * Entfernt ein Wegwerf-Verzeichnis samt Inhalt. Idempotent (`force`), und
 * bis zu zehn Wiederholungen im Abstand von 100 ms gegen kurzzeitig
 * gehaltene Handles.
 *
 * Der Pfad wird gegen `process.cwd()` aufgelöst, wenn er relativ ist —
 * Aufrufer, die `process.chdir()` benutzen, übergeben ihn absolut.
 *
 * @throws wenn `pfad` leer ist oder auf das Arbeitsverzeichnis bzw. dessen
 *   Elternverzeichnis zeigt, und wenn das Verzeichnis nach allen
 *   Wiederholungen mit einem nicht tolerierten Fehlercode scheitert.
 *   EPERM/EBUSY/ENOTEMPTY wirft NICHT — siehe Dateikopf (F-590).
 */
export function raeumeVerzeichnis(pfad: string): void {
  if (VERBOTENE_PFADE.has(pfad.trim())) {
    throw new Error(
      `raeumeVerzeichnis: '${pfad}' ist kein Wegwerf-Verzeichnis — das hätte das Arbeitsverzeichnis abgeräumt.`
    )
  }
  try {
    fs.rmSync(pfad, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
  } catch (fehler) {
    const code = (fehler as NodeJS.ErrnoException).code
    if (!code || !TOLERIERTE_FEHLERCODES.has(code)) {
      throw fehler
    }
    console.error(
      `raeumeVerzeichnis: '${pfad}' nach allen Wiederholungen weiterhin ${code} — wird toleriert, Nachlauf versucht es erneut (F-590).`
    )
    fs.mkdirSync(RESTE_VERZEICHNIS, { recursive: true })
    fs.appendFileSync(
      resteDateiFuerAktuellenProzess(),
      `${JSON.stringify({ pfad, code, zeit: new Date().toISOString() })}\n`
    )
  }
}
