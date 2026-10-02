/**
 * Datei: public/leitstand/fortschritt-ring.js
 *
 * Zweck: Fortschrittsring der Vorlage V10 (progress-bubble): Prozent in der Mitte, darunter „x/y“.
 * F44 WS-6a aus views/dashboard.js herausgelöst, damit die Übersicht (B2, B12) und die Karten auf
 * „Alle Produkte“ (H1) denselben Ring zeigen.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/dashboard.js (Karte Fortschritt und Zuletzt umgesetzt, F46 D1)
 * - public/leitstand/views/projekte-uebersicht.js (Ring „Erfasste Einträge abgenommen“, F44 WS-6a)
 *
 * Wichtig: import-sicher (kein DOM); Zahlen über formatiereZahl (Intl, aktuelle Sprache).
 */

import { formatiereZahl } from './i18n.js'
import { escapeHtml } from './render.js'

/**
 * Fortschrittsring: Prozent, darunter „x/y“; ohne Nenner steht „–“ in der Mitte. Mit
 * { unbekannt: true } (lädt oder nicht ladbar, F44 WS-6a) bleibt der Ring leer: „–“ ohne „x/y“.
 * @param abgenommen - Zähler
 * @param gesamt - Nenner
 * @param optionen - { klein: true } für den kleinen Ring, { label } für den zugänglichen Namen, { unbekannt: true } ohne Zahlen
 * @returns HTML
 */
export function ring(abgenommen, gesamt, optionen = {}) {
  const bekannt = optionen.unbekannt !== true && gesamt > 0
  const prozent = bekannt ? Math.round((abgenommen / gesamt) * 100) : 0
  const mitte = bekannt ? escapeHtml(formatiereZahl(prozent / 100, { style: 'percent' })) : '–'
  const zahlen = optionen.unbekannt === true ? '' : `<small>${escapeHtml(formatiereZahl(abgenommen))}/${escapeHtml(formatiereZahl(gesamt))}</small>`
  return `<div class="progress-bubble${optionen.klein === true ? ' klein' : ''}" role="img" aria-label="${escapeHtml(optionen.label ?? '')}">
      <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><circle class="bubble-track" cx="50" cy="50" r="42" /><circle class="bubble-fill" cx="50" cy="50" r="42" pathLength="100" stroke-dasharray="${prozent} 100" /></svg>
      <div aria-hidden="true"><strong>${mitte}</strong>${zahlen}</div>
    </div>`
}
