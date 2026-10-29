/**
 * Datei: scripts/leitstand/abnahme-pruefung.mjs
 *
 * Zweck: Lesende Projektionen der Abnahme zum Kern-Nachlauf (F45 B3b-2a, features/F45/plan-b3b2a-v2.md):
 * projizierePruefergebnis (unverändert aus GET …/abnahme in scripts/leitstand-server.mjs ausgelagert, Ausgleich der
 * Wachstumsbremse W1) und projiziereRenderNachweis (neu, F-1256: `render-nachweis-<laufId>` des letzten
 * Ausführungslaufs). Nur lesend, keine Route.
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs (GET /api/workflows/<id>/abnahme, Prüfergebnis auch GET /api/workflows/<id>); geprüft von
 * scripts/leitstand/abnahme-pruefung.test.mjs und scripts/render-im-lauf.test.mjs.
 *
 * Wichtig: beide lesen über die exakte Kennung `<art>-<lauf_id>` — kein Präfix-Scan, damit `pruefergebnis-*` und
 * `render-nachweis-*` sich nie gegenseitig treffen. Wirft das Laden, wirft projizierePruefergebnis wie bisher (Muster der
 * übrigen Abnahme-Projektionen); projiziereRenderNachweis fängt es und liefert 'fehlt' (optionales Zusatzartefakt, QA N2).
 */

import { ladeArtefaktVersion } from '../../src/lineage-registry/index.ts'
import { letzteZeilen, validierePruefergebnisDaten } from '../../src/pruefschritt/index.ts'

/** Zeilen des Ausgabe-Endes in der Projektion — wie der Halt-Grund (dort das Literal 40); die Abnahme pollt alle 2 s. */
export const AUSGABE_ZEILEN = 40

/** @typedef {Parameters<typeof ladeArtefaktVersion>[2]} LadeOptionen */
/** @typedef {import('../../src/pruefschritt/types.ts').PruefergebnisV0Daten} PruefergebnisV0Daten */

/**
 * Schlanke Projektion des deterministischen Prüfergebnisses (F-652) — GENAU NEBEN der Änderungsübersicht (gleicher
 * Ausführungsschritt, gleiche drei status-Werte). F45 B1b-2: versionSequenz additiv — eine wiederholte Prüfung ist eine
 * neue Version; die Abnahme lädt den Harness-Abgleich einmal je Stand und erkennt so auch GRÜN → GRÜN.
 * @param {{ schritt_id: string, lauf_id: string | null } | null} ausfuehrungSchritt - findeAusfuehrungsSchritt(…)
 * @param {LadeOptionen} ladeOptionen - Optionen des Ladens
 * @returns {{ status: 'kein_ausfuehrungs_schritt' } | { status: 'noch_nicht_gelaufen', schrittId: string }
 *   | { status: 'nicht_vorhanden', laufId: string }
 *   | { status: 'ok', laufId: string, ergebnis: string, exitCode: number | null, versionSequenz: number }} Projektion
 */
export function projizierePruefergebnis(ausfuehrungSchritt, ladeOptionen) {
  if (ausfuehrungSchritt === null) return { status: 'kein_ausfuehrungs_schritt' }
  if (ausfuehrungSchritt.lauf_id === null)
    return { status: 'noch_nicht_gelaufen', schrittId: ausfuehrungSchritt.schritt_id }
  const version = ladeArtefaktVersion(`pruefergebnis-${ausfuehrungSchritt.lauf_id}`, undefined, ladeOptionen)
  if (version === null) return { status: 'nicht_vorhanden', laufId: ausfuehrungSchritt.lauf_id }
  const daten = /** @type {PruefergebnisV0Daten} */ (version.daten)
  return {
    status: 'ok',
    laufId: ausfuehrungSchritt.lauf_id,
    ergebnis: daten.ergebnis,
    exitCode: daten.exit_code,
    versionSequenz: version.versionSequenz,
  }
}

/**
 * Projektion des Render-Nachweises des letzten Ausführungslaufs (F45 B3b-2a). Nur 'ok' oder 'fehlt' — die Abnahme zeigt
 * bei 'fehlt' keine Karte (kein Render nötig: keine render.json, Prüfung nicht grün, noch nicht gelaufen). Ein
 * Artefakt, das nicht dem Prüfergebnis-Schema v0 entspricht oder nicht ladbar ist, gilt als 'fehlt' (nie eine halbe Karte,
 * und ein optionales Zusatzartefakt legt die Abnahme nie lahm — QA N2; der Fehler geht ins Log).
 * @param {{ lauf_id: string | null } | null} ausfuehrungSchritt - findeAusfuehrungsSchritt(…)
 * @param {LadeOptionen} ladeOptionen - Optionen des Ladens
 * @returns {{ status: 'fehlt' } | { status: 'ok', ergebnis: string, dauer_ms: number, ausgabe_ende: string, gestartet_am: string }}
 */
export function projiziereRenderNachweis(ausfuehrungSchritt, ladeOptionen) {
  if (typeof ausfuehrungSchritt?.lauf_id !== 'string') return { status: 'fehlt' }
  let version
  try {
    version = ladeArtefaktVersion(`render-nachweis-${ausfuehrungSchritt.lauf_id}`, undefined, ladeOptionen)
  } catch (fehler) {
    console.error(`[leitstand] Render-Nachweis von Lauf '${ausfuehrungSchritt.lauf_id}' nicht ladbar:`, fehler)
    return { status: 'fehlt' }
  }
  if (version === null || validierePruefergebnisDaten(version.daten).length > 0) return { status: 'fehlt' }
  const { ergebnis, dauer_ms, ausgabe_ende, gestartet_am } = /** @type {PruefergebnisV0Daten} */ (version.daten)
  return { status: 'ok', ergebnis, dauer_ms, ausgabe_ende: letzteZeilen(ausgabe_ende, AUSGABE_ZEILEN), gestartet_am }
}
