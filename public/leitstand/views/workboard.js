/**
 * Datei: public/leitstand/views/workboard.js
 *
 * Zweck: View `#/workboard` (F20 WS-1) — bewusster Platzhalter. Die
 * eigentliche Projektion (Findings, Feature-Akten, Failed Runs, Capability
 * Gaps) ist F21-Scope; F20 baut nur den Rahmen (F20-Nicht-Ziel: keine neuen
 * Fachfunktionen).
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initWorkboardView beim Bootstrap)
 *
 * Wichtig: Vor F21 hier keine Datenanbindung ergänzen.
 */

/** Rendert den Platzhalter-Inhalt der Workboard-View. */
export function initWorkboardView() {
  document.getElementById('view-workboard').innerHTML = '<p class="leer">Workboard folgt mit F21 (Findings, Feature-Akten, Failed Runs, Capability Gaps).</p>'
}
