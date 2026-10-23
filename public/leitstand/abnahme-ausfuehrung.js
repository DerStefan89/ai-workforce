/**
 * Datei: public/leitstand/abnahme-ausfuehrung.js
 *
 * Zweck: Die eine Regel „Ist die Ausführung gelaufen?“ aus GET …/abnahme (aenderungsuebersicht.status) — als Blattmodul ohne
 * Importe, damit views/workflow-abnahme.js und faehigkeit-vorschlag-anzeige.js sie teilen können, ohne sich gegenseitig zu
 * importieren (F45 FB-2, code-reviewer 8: kein Importzyklus).
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/workflow-abnahme.js (re-exportiert ausfuehrungGelaufen für views/workflows.js)
 * - public/leitstand/faehigkeit-vorschlag-anzeige.js (abnahmeLaesstUebernehmenZu)
 *
 * Wichtig: Rein, kein DOM, keine Importe.
 */

/** Status der Änderungsübersicht, bei denen die Ausführung (noch) nicht gelaufen ist — dann gibt es kein Ergebnis zum Ablehnen. */
const NICHT_GELAUFEN = new Set(['noch_nicht_gelaufen', 'kein_ausfuehrungs_schritt'])

/**
 * Ob die Ausführung gelaufen ist (es ein Ergebnis gibt). Fehlt die Änderungsübersicht ganz, gilt sie als
 * nicht gelaufen.
 * @param abnahme - Antwort von GET …/abnahme
 * @returns true, wenn aenderungsuebersicht.status weder 'noch_nicht_gelaufen' noch 'kein_ausfuehrungs_schritt' ist
 */
export function ausfuehrungGelaufen(abnahme) {
  return !NICHT_GELAUFEN.has(abnahme.aenderungsuebersicht?.status ?? 'noch_nicht_gelaufen')
}
