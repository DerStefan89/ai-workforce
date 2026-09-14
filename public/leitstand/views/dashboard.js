/**
 * Datei: public/leitstand/views/dashboard.js
 *
 * Zweck: View `#/dashboard` (F20 WS-2) — drei Zahlen aus dem
 * Zustands-Aggregat (GET /api/zustand, über zustand.js abonniert): Läufe,
 * Startfehler, Workflows. Keine eigene Anfrage, keine neue Fachfunktion
 * (F20-Nicht-Ziel) — reine Anzeige derselben Listen, die die Runs- und
 * Workflows-View ohnehin schon zeigen.
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initDashboardView beim Bootstrap)
 *
 * Wichtig: Bis zum ersten Poll-Tick zeigt der Container einen Leerzustand.
 * Eine Quelle mit dem Wert null (defekt, siehe leitstand-server.mjs
 * GET /api/zustand) zeigt einen Fehlertext statt einer geratenen Zahl.
 */

import { abonniere } from '../zustand.js'

/** @param liste - eine der drei Aggregat-Listen, oder null bei defekter Quelle @returns Anzeige-Text der Zahl */
function zahl(liste) {
  return liste === null ? '<span class="unbekannt">nicht verfügbar</span>' : String(liste.length)
}

/** Rendert die drei Kopfzahlen aus dem Aggregat. @param zustand - { laeufe, startfehler, workflows, fehler } aus GET /api/zustand */
function renderDashboard(zustand) {
  document.getElementById('view-dashboard').innerHTML = `<table class="lauf-kopfdaten"><tbody>
    <tr><th>Läufe</th><td>${zahl(zustand.laeufe)}</td></tr>
    <tr><th>Startfehler</th><td>${zahl(zustand.startfehler)}</td></tr>
    <tr><th>Workflows</th><td>${zahl(zustand.workflows)}</td></tr>
  </tbody></table>`
}

/** Initialisiert die Dashboard-View einmalig beim Bootstrap: Leerzustand, dann Abonnement des Zustands-Aggregats. */
export function initDashboardView() {
  document.getElementById('view-dashboard').innerHTML = '<p class="leer">Lädt…</p>'
  abonniere(renderDashboard)
}
