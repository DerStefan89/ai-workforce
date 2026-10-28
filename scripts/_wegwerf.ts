/**
 * Datei: scripts/_wegwerf.ts
 *
 * Zweck: Wegwerf-Ordner und Wegwerf-Git-Repos in Gates und Tests (F45 W2b-2). Bis W2b-2 legten rund 55 Gates und
 * 18 Testdateien ihre Ordner als `kontrollzustand-test-…` in der Repo-Wurzel an: nach einem Abbruch blieben Reste dort
 * liegen (F-590), und die Repo-Baum-Gates (check-docs, check-rules, check-f45-k-kontext, check-secrets) mussten
 * deshalb allein laufen (`SERIELL` in scripts/check-kette.mjs). Jetzt liegt alles unter `os.tmpdir()`.
 *
 * Wird aufgerufen von: Gate-Skripten `scripts/check-*.mjs` und Tests unter `scripts/` und `src/` (je Datei einmal
 * `wegwerfOrdner`, `schalteGitWartungAb` nach jedem `git init` eines Wegwerf-Repos mit Commit).
 *
 * Wichtig:
 * - Ort scripts/ wie scripts/_aufraeumen.ts (Prüfhilfe, kein Produktcode; Import auch aus src/**\/*.test.ts).
 * - Aufräumen beim Prozessende (`process.on('exit')`): läuft auch nach `process.exit(1)` am Ende eines roten Gates,
 *   wo ein `finally` nicht mehr läuft. Gelöscht wird über raeumeVerzeichnis (Regel R1: rmSync mit maxRetries, F-590
 *   toleriert gehaltene Handles). Die Aufräumer je Fall in den Gates bleiben; dieser hier ist das Netz.
 * - Bei hartem Abbruch (Signal, Absturz) läuft kein Hook; der Ordner bleibt im Temp-Ordner des Systems, nicht im Repo.
 * - Wirft raeumeVerzeichnis im Hook mit einem nicht tolerierten Fehlercode, endet ein sonst grünes Gate rot — gewollt laut.
 * - Temp-Pfade sind länger als die frühere Repo-Wurzel (MAX_PATH unter Windows bei tiefen Kopien beachten).
 */

import fs from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

/**
 * Legt einen leeren Wegwerf-Ordner unter os.tmpdir() an und räumt ihn beim Prozessende.
 * @param kennung - Namensteil für die Fehlersuche (z. B. der Gate-Name)
 * @returns absoluter Pfad des angelegten Ordners
 */
export function wegwerfOrdner(kennung: string): string {
  const pfad = fs.mkdtempSync(join(tmpdir(), `aiw-${kennung}-`))
  process.on('exit', () => raeumeVerzeichnis(pfad))
  return pfad
}

/** Abschnitte für .git/config: keine automatische Wartung nach Commit (F-1230). */
const WARTUNG_AUS = '[gc]\n\tauto = 0\n[maintenance]\n\tauto = false\n\tautoDetach = false\n'

/**
 * Schaltet die git-Hintergrundwartung eines frisch angelegten Wegwerf-Repos ab: gc.auto 0, maintenance.auto false,
 * maintenance.autoDetach false (F-1230 — sonst schreibt neueres git nach einem Commit abgekoppelt nach .git/objects,
 * während ein Gate misst, und hält unter Windows Handles beim Aufräumen). Wirkung wie dreimal `git config`, ohne
 * Kindprozess.
 * @param repo - Arbeitsordner des Repos (direkt nach `git init`, .git ist ein Ordner)
 */
export function schalteGitWartungAb(repo: string): void {
  fs.appendFileSync(join(repo, '.git', 'config'), WARTUNG_AUS)
}
