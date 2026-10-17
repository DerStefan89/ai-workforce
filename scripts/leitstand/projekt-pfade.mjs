/**
 * Datei: scripts/leitstand/projekt-pfade.mjs
 *
 * Zweck: Pfade eines Projekt-Registereintrags (F25 WS-1, AK2–AK4; aus scripts/leitstand-server.mjs ausgelagert in F45
 * B2b-3b-2b-2a-1, Wachstumsbremse W1). Reine Funktion, kein I/O.
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs (baueProjektHandlerMap, GET /api/projekte; re-exportiert für
 * scripts/check-f25-projekte.mjs und scripts/check-fixpaket-f35-reallauf.mjs).
 */

import { join, resolve } from 'node:path'

/**
 * Löst aus einem Registereintrag alle Pfade auf, die baueProjektHandlerMap an erzeugeRequestHandler durchreicht — eigene Funktion,
 * damit ein Gate die Auflösungsarithmetik direkt prüfen kann, ohne einen Server zu starten (D5).
 * @param projekt - ein validierter Registereintrag (src/projekte/types.ts)
 * @param repoWurzelBasis - Referenzpunkt für ein relatives projekt.repo_pfad
 * @returns die aufgelösten Pfade für genau diesen Registereintrag
 */
export function loeseProjektPfade(projekt, repoWurzelBasis) {
  const repoWurzel = resolve(repoWurzelBasis, projekt.repo_pfad)
  return {
    repoWurzel,
    basisVerzeichnis: join(repoWurzel, projekt.basisverzeichnis),
    startvorlagePfad: join(repoWurzel, projekt.startvorlage_pfad),
    settingsPfad: join(repoWurzel, '.claude', 'settings.json'),
    aktuelleAutorisierungPfad: join(repoWurzel, 'state', 'aktuelle-autorisierung.json'),
    cwd: repoWurzel,
    // F36 WS-5a (E-F36-7): Projekt-URL mit Port, roh aus dem Registereintrag (validiert von validiereProjekteDaten); null ohne.
    vorschauUrl: projekt.vorschau_url ?? null,
  }
}
