/**
 * Datei: scripts/aufraeumen-nachlauf.mjs
 *
 * Zweck: Einmaliger Nachlauf am Ende von `npm run check` für Wegwerf-
 * Verzeichnisse, die `raeumeVerzeichnis` (scripts/_aufraeumen.ts) nach
 * ausgeschöpften Wiederholungen mit EPERM/EBUSY/ENOTEMPTY toleriert und in
 * RESTE_VERZEICHNIS gesammelt hat (F-590, eine Datei je Prozess-PID, siehe
 * dort). Versucht jeden gesammelten Pfad genau einmal erneut. Ein
 * verbleibender Rest ist ein Hinweis, kein Befund — dieses Skript beendet
 * sich deshalb immer mit Exit 0, siehe CLAUDE.md „Bekannte Fallen".
 *
 * `fuehreNachlaufAus` ist exportiert und frei von `process.exit`, damit
 * scripts/aufraeumen-nachlauf.test.mjs sie ohne Kindprozess prüfen kann —
 * der `istDirekterAufruf`-Wächter am Dateiende sorgt dafür, dass dieser
 * Import KEINEN echten Nachlauf samt Exit auslöst (Muster:
 * scripts/check-f20-leitstand-shell.mjs).
 */

// Default-Import statt `import { rmSync }` — Begründung: scripts/_aufraeumen.ts.
import fs, { existsSync, readdirSync, readFileSync, unlinkSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { RESTE_VERZEICHNIS } from './_aufraeumen.ts'

/**
 * Liest alle Je-PID-Dateien aus RESTE_VERZEICHNIS, versucht jeden darin
 * gesammelten Pfad einmal erneut zu entfernen und löscht jede gelesene
 * Je-PID-Datei danach immer (unabhängig vom Ergebnis der Wegwerf-
 * Verzeichnisse selbst — ein Rest ist nur ein Hinweis, siehe Dateikopf).
 * Gibt die Pfade zurück, die auch im Nachlauf nicht entfernt werden
 * konnten (reine Information).
 */
export function fuehreNachlaufAus() {
  if (!existsSync(RESTE_VERZEICHNIS)) {
    return { versucht: [], reste: [] }
  }

  const pfade = new Set()
  for (const dateiname of readdirSync(RESTE_VERZEICHNIS)) {
    const dateiPfad = join(RESTE_VERZEICHNIS, dateiname)
    for (const zeile of readFileSync(dateiPfad, 'utf8').split('\n')) {
      if (zeile.trim().length > 0) {
        pfade.add(JSON.parse(zeile).pfad)
      }
    }
    unlinkSync(dateiPfad)
  }

  const reste = []
  for (const pfad of pfade) {
    try {
      fs.rmSync(pfad, { recursive: true, force: true })
      if (existsSync(pfad)) {
        reste.push(pfad)
      }
    } catch {
      reste.push(pfad)
    }
  }

  return { versucht: [...pfade], reste }
}

// Nur beim direkten Aufruf (`node scripts/aufraeumen-nachlauf.mjs`, so auch am Ende der
// `check`-Kette in package.json) tatsächlich melden und beenden — ein Import dieser Datei
// aus scripts/aufraeumen-nachlauf.test.mjs darf das nicht mitausführen. Muster:
// scripts/check-f20-leitstand-shell.mjs.
const istDirekterAufruf = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (istDirekterAufruf) {
  const { versucht, reste } = fuehreNachlaufAus()

  if (reste.length > 0) {
    console.error(
      `aufraeumen-nachlauf: ${reste.length} von ${versucht.length} tolerierten Wegwerf-Verzeichnis(sen) bleiben liegen (Hinweis, kein Fehler):\n${reste.map((pfad) => `  - ${pfad}`).join('\n')}`
    )
  } else if (versucht.length > 0) {
    console.error(`aufraeumen-nachlauf: ${versucht.length} zuvor tolerierte(s) Wegwerf-Verzeichnis(se) im Nachlauf entfernt.`)
  }

  process.exit(0)
}
