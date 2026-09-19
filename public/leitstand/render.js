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
 * - public/leitstand/views/workboard.js, views/projekte-uebersicht.js, views/chat.js (F29 WS-D2, formatiereZeitpunkt/formatiereUhrzeit)
 *
 * Wichtig: Bleibt bewusst klein. Alles, was nur EINE View betrifft (Badges,
 * Tabellenzeilen einer bestimmten Ansicht), gehört in die View selbst, nicht
 * hierher — sonst wird diese Datei zum zweiten app.js.
 */

/** Escaped Text für sicheres Einsetzen in innerHTML. @param text - beliebiger Wert @returns HTML-sicherer String */
export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (z) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[z])
}

// F29 WS-D2 (Auftrag Punkt E): "Datums-/Zeitformate lesbar deutsch, keine ISO-Strings in der UI".
const MONATSKUERZEL = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

/** Formatiert einen ISO-8601-Zeitstempel lesbar deutsch ("18. Sep 2026, 10:24") statt eines rohen ISO-Strings in der UI. @param iso - ISO-Zeitstempel, oder null/undefined @returns lesbarer Text, oder null bei fehlendem/ungültigem Zeitstempel (Aufrufer zeigt dann seinen eigenen Leerzustand, kein "Invalid Date" in der UI) */
export function formatiereZeitpunkt(iso) {
  if (!iso) return null
  const datum = new Date(iso)
  if (Number.isNaN(datum.getTime())) return null
  const stunden = String(datum.getHours()).padStart(2, '0')
  const minuten = String(datum.getMinutes()).padStart(2, '0')
  return `${datum.getDate()}. ${MONATSKUERZEL[datum.getMonth()]} ${datum.getFullYear()}, ${stunden}:${minuten}`
}

/** Nur die Uhrzeit ("10:24") eines ISO-Zeitstempels — Chat-Einträge (Auftrag Punkt C). @param iso - ISO-Zeitstempel, oder null/undefined @returns lesbare Uhrzeit, oder null bei fehlendem/ungültigem Zeitstempel */
export function formatiereUhrzeit(iso) {
  if (!iso) return null
  const datum = new Date(iso)
  if (Number.isNaN(datum.getTime())) return null
  return `${String(datum.getHours()).padStart(2, '0')}:${String(datum.getMinutes()).padStart(2, '0')}`
}
