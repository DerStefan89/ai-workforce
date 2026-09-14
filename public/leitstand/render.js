/**
 * Datei: public/leitstand/render.js
 *
 * Zweck: Kleinste gemeinsame Rendering-Helfer des F20-Leitstands, die von
 * mehreren Views gebraucht werden — escapeHtml (jede View, die Serverdaten in
 * innerHTML schreibt) und zeigePollFehler (der Poll-Fehlerhinweis liegt fest
 * im Shell-Header, nicht in einer View, weil er unabhängig von der aktiven
 * View sichtbar bleiben soll).
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

/** Zeigt/verbirgt den globalen Poll-Fehlerhinweis im Shell-Header. @param fehlgeschlagen - true, wenn der letzte Poll-Versuch fehlschlug */
export function zeigePollFehler(fehlgeschlagen) {
  const anzeige = document.getElementById('poll-fehler')
  anzeige.hidden = !fehlgeschlagen
}
