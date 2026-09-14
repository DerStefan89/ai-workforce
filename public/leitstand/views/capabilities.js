/**
 * Datei: public/leitstand/views/capabilities.js
 *
 * Zweck: View `#/capabilities` (F20 WS-1) — bewusster Platzhalter. Die
 * F19-Projektion (Ressourcen, Coverage, Rollen lesend) ist F24-Scope; F20
 * baut nur den Rahmen (F20-Nicht-Ziel: keine neuen Fachfunktionen).
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initCapabilitiesView beim Bootstrap)
 *
 * Wichtig: Vor F24 hier keine Datenanbindung ergänzen.
 */

/** Rendert den Platzhalter-Inhalt der Capabilities-View. */
export function initCapabilitiesView() {
  document.getElementById('view-capabilities').innerHTML = '<p class="leer">Capabilities folgt mit F24 (F19-Projektion, Coverage, Rollen lesend).</p>'
}
