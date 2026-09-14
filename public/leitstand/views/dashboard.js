/**
 * Datei: public/leitstand/views/dashboard.js
 *
 * Zweck: View `#/dashboard` (F20 WS-2, F21 WS-2) — fünf Zahlen: drei aus dem
 * Zustands-Aggregat (Läufe, Startfehler, Workflows, unverändert), zwei neue
 * aus F21: offene P0/P1-Workitems (ein einmaliger GET /api/workitems-Abruf,
 * geteiltes Modul attention-daten.js — dieselbe Quelle und Filterregel wie
 * views/attention.js, kein zweiter, abweichender Fetch-Aufruf) und
 * Attention-relevante Workflows/Läufe aus dem ohnehin abonnierten Aggregat
 * (dieselbe Filterfunktion wie die Attention-View).
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initDashboardView beim Bootstrap)
 *
 * Wichtig: Bis zum ersten Poll-Tick zeigt der Container einen Leerzustand.
 * Eine Quelle mit dem Wert null (defekt, siehe leitstand-server.mjs
 * GET /api/zustand) zeigt einen Fehlertext statt einer geratenen Zahl. Der
 * Workitems-Abruf läuft einmalig beim Bootstrap, nicht bei jedem Poll-Tick
 * (Findings/Feature-Akten ändern sich nur durch Commits) — ein manuelles
 * Nachladen gibt es hier bewusst nicht, dafür ist die Workboard-View da.
 */

import { abonniere } from '../zustand.js'
import { filtereAttentionLaeufe, filtereAttentionWorkflows, holeOffeneP0P1Workitems } from '../attention-daten.js'

/** Letztes Zustands-Aggregat aus dem Poll, oder null vor dem ersten Tick. */
let letzterZustand = null

/** Letzte Antwort aus holeOffeneP0P1Workitems, oder null vor dem ersten Abruf. */
let workitemsAntwort = null

/** @param liste - eine Aggregat-/Projektionsliste, oder null bei defekter Quelle @returns Anzeige-Text der Zahl */
function zahl(liste) {
  return liste === null ? '<span class="unbekannt">nicht verfügbar</span>' : String(liste.length)
}

/** Summe zweier Attention-Quellen — 'nicht verfügbar', sobald eine der beiden defekt (null) ist, statt einer teilweise geratenen Zahl. */
function attentionZahl(workflows, laeufe) {
  if (workflows === null || laeufe === null) return '<span class="unbekannt">nicht verfügbar</span>'
  return String(workflows.length + laeufe.length)
}

function render() {
  if (letzterZustand === null) return
  const workflowsAttention = filtereAttentionWorkflows(letzterZustand.workflows)
  const laeufeAttention = filtereAttentionLaeufe(letzterZustand.laeufe)
  document.getElementById('view-dashboard').innerHTML = `<table class="lauf-kopfdaten"><tbody>
    <tr><th>Läufe</th><td>${zahl(letzterZustand.laeufe)}</td></tr>
    <tr><th>Startfehler</th><td>${zahl(letzterZustand.startfehler)}</td></tr>
    <tr><th>Workflows</th><td>${zahl(letzterZustand.workflows)}</td></tr>
    <tr><th>Offene P0/P1-Workitems</th><td>${zahl(workitemsAntwort === null ? null : workitemsAntwort.workitems)}</td></tr>
    <tr><th>Attention (Workflows/Läufe)</th><td>${attentionZahl(workflowsAttention, laeufeAttention)}</td></tr>
  </tbody></table>`
}

/** Lädt die offenen P0/P1-Workitems einmalig beim Bootstrap. */
async function ladeWorkitems() {
  try {
    workitemsAntwort = await holeOffeneP0P1Workitems()
  } catch (fehler) {
    workitemsAntwort = { workitems: null, befunde: [], fehler: [{ quelle: 'workitems', grund: fehler.message }] }
  }
  render()
}

/** Initialisiert die Dashboard-View einmalig beim Bootstrap: Leerzustand, Abonnement des Zustands-Aggregats, einmaliger Workitems-Abruf. */
export function initDashboardView() {
  document.getElementById('view-dashboard').innerHTML = '<p class="leer">Lädt…</p>'
  abonniere((zustand) => {
    letzterZustand = zustand
    render()
  })
  void ladeWorkitems()
}
