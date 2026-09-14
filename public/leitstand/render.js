/**
 * Datei: public/leitstand/render.js
 *
 * Zweck: Kleinste gemeinsame Rendering-Helfer des F20-Leitstands, die von
 * mehreren Views gebraucht werden — escapeHtml (jede View, die Serverdaten in
 * innerHTML schreibt).
 *
 * F20 WS-2 (AK3): zeigePollFehler ist nach public/leitstand/zustand.js
 * umgezogen — seit der Poll-Konsolidierung gibt es nur noch EINEN fetch()-
 * Fehlerpfad (den des Aggregat-Polls), nicht mehr je View einen eigenen.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/runs.js
 * - public/leitstand/views/projekt.js
 * - public/leitstand/views/workflows.js
 *
 * Wichtig: Bleibt bewusst klein. Alles, was nur EINE View betrifft (Badges,
 * Tabellenzeilen einer bestimmten Ansicht), gehört in die View selbst, nicht
 * hierher — sonst wird diese Datei zum zweiten app.js.
 */

/** Escaped Text für sicheres Einsetzen in innerHTML. @param text - beliebiger Wert @returns HTML-sicherer String */
export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (z) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[z])
}
