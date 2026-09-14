/**
 * Datei: public/leitstand/views/dashboard.js
 *
 * Zweck: View `#/dashboard` (F20 WS-1) — bewusster Platzhalter. Der
 * Aggregat-Endpunkt GET /api/zustand, aus dem eine echte Übersicht entstehen
 * würde, ist WS-2-Scope (F20 AK3); vorher gäbe es hier nichts Reales
 * anzuzeigen (F20-Nicht-Ziel: keine neuen Fachfunktionen in WS-1).
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initDashboardView beim Bootstrap)
 *
 * Wichtig: Vor WS-2 hier keine Datenanbindung ergänzen — das wäre eine
 * Fachfunktion vor ihrem Endpunkt.
 */

/** Rendert den Platzhalter-Inhalt der Dashboard-View. */
export function initDashboardView() {
  document.getElementById('view-dashboard').innerHTML = '<p class="leer">Dashboard folgt mit dem Aggregat-Endpunkt <code>GET /api/zustand</code> (F20 WS-2).</p>'
}
