/**
 * Datei: public/leitstand/views/attention.js
 *
 * Zweck: View `#/attention` (F21 WS-2) — Aufmerksamkeits-Ansicht als reine
 * Client-Projektion, ohne eigenen Endpunkt und ohne eigenen Poll (F21
 * Nicht-Ziele, features/F21/feature.md). Vier Quellen: Workflows, die auf
 * Freigabe/Klärung warten, und fehlgeschlagene, nicht kenntnisgenommene
 * Läufe (beide aus dem ohnehin gepollten Zustands-Aggregat, gefiltert über
 * das geteilte Modul attention-daten.js — dieselbe Regel wie
 * views/dashboard.js), Startfehler (zustand.startfehler, unverändert) sowie
 * offene P0/P1-Workitems (ein einmaliger GET /api/workitems-Abruf beim
 * Betreten dieser View).
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initAttentionView beim Bootstrap)
 *
 * Wichtig: der Leerzustand gilt nur, wenn ALLE VIER Quellen leer sind — eine
 * defekte Quelle (null) zählt NICHT als leer, sie zeigt ihren eigenen
 * Unbekannt-Hinweis, damit ein Defekt nie als "nichts zu tun" missverstanden
 * wird.
 */

import { escapeHtml } from '../render.js'
import { navigiere, registriere } from '../router.js'
import { abonniere } from '../zustand.js'
import { filtereAttentionLaeufe, filtereAttentionWorkflows, holeOffeneP0P1Workitems } from '../attention-daten.js'

/** Letztes Zustands-Aggregat aus dem Poll, oder null vor dem ersten Tick. */
let letzterZustand = null

/** Letzte Antwort aus holeOffeneP0P1Workitems, oder null vor dem ersten Abruf dieses View-Besuchs. */
let workitemsAntwort = null

const ABSCHNITT_IDS = ['attention-abschnitt-workflows', 'attention-abschnitt-laeufe', 'attention-abschnitt-startfehler', 'attention-abschnitt-workitems']

/** Ein klickbarer Eintrag, der per navigiere() zur jeweiligen Detailansicht springt (Klasse statt <a href>, Muster views/runs.js .details-btn). @param text - Anzeigetext (bereits escaped) @param hash - Ziel-Hash, z. B. '#/runs/<laufId>' */
function eintrag(text, hash) {
  return `<p class="attention-eintrag"><button type="button" class="attention-link" data-hash="${escapeHtml(hash)}">${text}</button></p>`
}

function renderWorkflowsAbschnitt(workflows) {
  const container = document.getElementById('attention-workflows')
  if (workflows === null) {
    container.innerHTML = '<p class="unbekannt">Workflows nicht verfügbar (Quelle im Aggregat defekt).</p>'
    return
  }
  container.innerHTML = workflows.length === 0
    ? '<p class="leer">Keine Workflows, die auf dich warten.</p>'
    : workflows
        .map((w) => {
          const lage = w.naechster?.art === 'haltFreigabe' ? 'wartet auf Freigabe' : 'wartet auf Klärung'
          return eintrag(`${escapeHtml(w.workflowId)} — ${lage}${w.grund ? `: ${escapeHtml(w.grund)}` : ''}`, `#/workflows/${encodeURIComponent(w.workflowId)}`)
        })
        .join('')
}

function renderLaeufeAbschnitt(laeufe) {
  const container = document.getElementById('attention-laeufe')
  if (laeufe === null) {
    container.innerHTML = '<p class="unbekannt">Läufe nicht verfügbar (Quelle im Aggregat defekt).</p>'
    return
  }
  container.innerHTML = laeufe.length === 0
    ? '<p class="leer">Keine fehlgeschlagenen, nicht kenntnisgenommenen Läufe.</p>'
    : laeufe.map((l) => eintrag(`${escapeHtml(l.laufId)} — fehlgeschlagen, nicht kenntnisgenommen`, `#/runs/${encodeURIComponent(l.laufId)}`)).join('')
}

/** Kein Link (Muster views/runs.js renderStartfehler) — Startfehler sind eine flüchtige Projektion ohne eigene Detailroute. */
function renderStartfehlerAbschnitt(startfehler) {
  const container = document.getElementById('attention-startfehler')
  if (startfehler === null) {
    container.innerHTML = '<p class="unbekannt">Startfehler nicht verfügbar (Quelle im Aggregat defekt).</p>'
    return
  }
  container.innerHTML = startfehler.length === 0
    ? '<p class="leer">Keine Startfehler.</p>'
    : startfehler.map((s) => `<p class="startfehler-eintrag"><code>${escapeHtml(s.zeitstempel)}</code> <strong>${escapeHtml(s.laufId)}</strong>: ${escapeHtml(s.fehler)}</p>`).join('')
}

function renderWorkitemsAbschnitt(antwort) {
  const container = document.getElementById('attention-workitems')
  if (antwort === null) {
    container.innerHTML = '<p class="leer">Lädt…</p>'
    return
  }
  if (antwort.workitems === null) {
    container.innerHTML = '<p class="unbekannt">Workitems nicht verfügbar (Quelle defekt).</p>'
    return
  }
  container.innerHTML = antwort.workitems.length === 0
    ? '<p class="leer">Keine offenen P0/P1-Workitems.</p>'
    : antwort.workitems.map((w) => eintrag(`${escapeHtml(w.id)} · ${escapeHtml(w.prioritaet)} · ${escapeHtml(w.titel)}`, `#/workboard/${encodeURIComponent(w.id)}`)).join('')
}

/** true nur, wenn alle vier Quellen tatsächlich (nicht defekt-null) leer sind — Voraussetzung für den zusammengefassten Leerzustand. */
function alleQuellenLeer(workflows, laeufe, startfehler, workitems) {
  return [workflows, laeufe, startfehler, workitems].every((liste) => Array.isArray(liste) && liste.length === 0)
}

function render() {
  if (letzterZustand === null) return

  const workflows = filtereAttentionWorkflows(letzterZustand.workflows)
  const laeufe = filtereAttentionLaeufe(letzterZustand.laeufe)
  const startfehler = letzterZustand.startfehler
  const workitems = workitemsAntwort === null ? null : workitemsAntwort.workitems

  const leer = workitemsAntwort !== null && alleQuellenLeer(workflows, laeufe, startfehler, workitems)
  document.getElementById('attention-leer').hidden = !leer
  for (const id of ABSCHNITT_IDS) document.getElementById(id).hidden = leer
  if (leer) return

  renderWorkflowsAbschnitt(workflows)
  renderLaeufeAbschnitt(laeufe)
  renderStartfehlerAbschnitt(startfehler)
  renderWorkitemsAbschnitt(workitemsAntwort)
}

/** Zähler gegen überholte Antworten (Muster views/workflows.js workflowRenderZaehler): verlässt der Nutzer #/attention und kehrt schnell zurück, darf die zuerst gestartete, aber später auflösende Anfrage die Anzeige der neueren nicht überschreiben. */
let anfrageZaehler = 0

/** Lädt die offenen P0/P1-Workitems neu — aufgerufen bei jedem Betreten der View (kein Poll, siehe Dateikopf). */
async function ladeWorkitems() {
  const meineAnfrageNummer = ++anfrageZaehler
  workitemsAntwort = null
  render()
  let ergebnis
  try {
    ergebnis = await holeOffeneP0P1Workitems()
  } catch (fehler) {
    ergebnis = { workitems: null, befunde: [], fehler: [{ quelle: 'workitems', grund: fehler.message }] }
  }
  if (meineAnfrageNummer !== anfrageZaehler) return
  workitemsAntwort = ergebnis
  render()
}

/** Klick-Delegation für alle .attention-link-Einträge — ein Listener für die gesamte View statt vier je Abschnitt. */
function initNavigation() {
  document.getElementById('view-attention').addEventListener('click', (ereignis) => {
    const button = ereignis.target.closest('.attention-link')
    if (!button) return
    navigiere(button.dataset.hash)
  })
}

/** Initialisiert die Attention-View einmalig beim Bootstrap: Bedienung, Route, Abonnement des Zustands-Aggregats. */
export function initAttentionView() {
  initNavigation()

  registriere(/^#\/attention$/, 'attention', () => {
    void ladeWorkitems()
  })

  abonniere((zustand) => {
    letzterZustand = zustand
    render()
  })
}
