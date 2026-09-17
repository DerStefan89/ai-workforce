/**
 * Datei: public/leitstand/jarvis-vorfilter.js
 *
 * Zweck: Deterministischer Chat-Vorfilter (F26 WS-2a, AK1/AK3 der Plan-Akte,
 * E-M4-3 "Statusfragen werden deterministisch aus Projektionen beantwortet").
 * Läuft CLIENTSEITIG, kein '/api/attention'- oder eigener Chat-Endpunkt dafür
 * (F21-Entscheidung, siehe attention-daten.js Kopfkommentar) — dasselbe Muster:
 * liest den ohnehin gepollten Zustand aus GET /api/zustand (zustand.js) und, für
 * "was braucht mich", zusätzlich holeOffeneP0P1Workitems (attention-daten.js,
 * ein einmaliger GET /api/workitems-Abruf). Erkennt der Vorfilter kein Muster,
 * liefert loeseVorfilterAuf() null — DANN erst geht die Nachricht an
 * POST /api/chat (echter Jarvis-Lauf).
 *
 * Eine Vorfilter-Antwort ist bewusst NICHT Teil des Lineage-Verlaufs
 * (lineage-chat-<projektId>, scripts/leitstand-server.mjs): "der Verlauf ist
 * Lineage" (E-M4-3) meint den JARVIS-Verlauf — eine deterministische
 * Projektion ist jederzeit neu berechenbar und trägt keine eigene Wahrheit,
 * die es zu persistieren gälte. Sie erscheint nur für die laufende
 * Chat-Sitzung, ein Reload verliert sie (im Unterschied zu AK4, das nur den
 * echten Jarvis-Verlauf meint).
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/chat.js
 */

import { filtereAttentionLaeufe, filtereAttentionWorkflows, holeOffeneP0P1Workitems } from './attention-daten.js'

/** "was braucht mich", "Was braucht mich?" — optionales Fragezeichen, kein weiterer Text. */
const MUSTER_BRAUCHT_MICH = /^was\s+braucht\s+mich\??$/i

// QA-Befund WS-2a: ein reiner Präfix-Match (/^status\b/i, ohne Endanker) fing jede Nachricht ab,
// die mit dem Wort "Status" beginnt, auch eine echte Frage wie "Status, kannst du auch X prüfen?"
// — der Rest verschwand kommentarlos (Zeile "Rest wird nicht ausgewertet" oben, real als Bug
// erkannt), ohne Hinweis und ohne Weg zu Jarvis. Jetzt symmetrisch zu MUSTER_BRAUCHT_MICH eng
// verankert: "Status", "Status?" oder "Status <ein Kurzname>" (ein einzelnes Wort aus
// Kleinbuchstaben/Ziffern/Bindestrich, Muster einer Projekt-id) — alles mit echtem Fließtext
// danach geht an Jarvis statt lokal verschluckt zu werden.
const MUSTER_STATUS = /^status(\s+[a-z0-9][a-z0-9-]*)?\??$/i

/**
 * Erkennt eines der beiden deterministischen Muster in einer Chat-Nachricht.
 * Reine Funktion, kein I/O.
 * @param nachricht - die vom Menschen eingegebene Chat-Nachricht
 * @returns 'braucht_mich', 'status' oder null (kein Treffer — geht an POST /api/chat)
 */
export function erkenneVorfilterMuster(nachricht) {
  const getrimmt = nachricht.trim()
  if (MUSTER_BRAUCHT_MICH.test(getrimmt)) return 'braucht_mich'
  if (MUSTER_STATUS.test(getrimmt)) return 'status'
  return null
}

/** @param liste - eine Aggregat-/Projektionsliste, oder null bei defekter Quelle @returns Anzeigetext */
function zahlText(liste) {
  return liste === null ? 'nicht verfügbar' : String(liste.length)
}

/** Deterministische Antwort auf "Status" — dieselben vier Zahlen wie views/dashboard.js, aus dem ohnehin gepollten Zustands-Aggregat, ohne zweiten Fetch. @param zustand - letztes Aggregat aus GET /api/zustand, oder null vor dem ersten Poll-Tick */
function beantworteStatus(zustand) {
  if (zustand === null) return 'Der Zustand ist noch nicht geladen — bitte gleich noch einmal fragen.'
  const workflowsAttention = filtereAttentionWorkflows(zustand.workflows)
  const laeufeAttention = filtereAttentionLaeufe(zustand.laeufe)
  const attentionZahl = workflowsAttention === null || laeufeAttention === null ? 'nicht verfügbar' : String(workflowsAttention.length + laeufeAttention.length)
  return [
    `Läufe: ${zahlText(zustand.laeufe)}`,
    `Startfehler: ${zahlText(zustand.startfehler)}`,
    `Workflows: ${zahlText(zustand.workflows)}`,
    `Braucht Aufmerksamkeit (Workflows/Läufe): ${attentionZahl}`,
  ].join(' · ')
}

/** Deterministische Antwort auf "was braucht mich" — dieselbe Quelle und Filterregel wie views/attention.js (attention-daten.js), hier zu einem Fließtext statt einer Listenansicht zusammengefasst. @param zustand - letztes Aggregat aus GET /api/zustand, oder null vor dem ersten Poll-Tick @param workitemsAntwort - Ergebnis von holeOffeneP0P1Workitems() */
function beantworteBrauchtMich(zustand, workitemsAntwort) {
  if (zustand === null) return 'Der Zustand ist noch nicht geladen — bitte gleich noch einmal fragen.'
  const workflows = filtereAttentionWorkflows(zustand.workflows)
  const laeufe = filtereAttentionLaeufe(zustand.laeufe)
  const workitems = workitemsAntwort.workitems

  const teile = []
  teile.push(workflows === null ? 'Workflows: nicht verfügbar.' : workflows.length === 0 ? 'Keine Workflows, die auf dich warten.' : `${workflows.length} Workflow(s) warten auf dich (Freigabe/Klärung).`)
  teile.push(laeufe === null ? 'Läufe: nicht verfügbar.' : laeufe.length === 0 ? 'Keine fehlgeschlagenen, nicht kenntnisgenommenen Läufe.' : `${laeufe.length} fehlgeschlagene(r), nicht kenntnisgenommene(r) Lauf/Läufe.`)
  teile.push(workitems === null ? 'Workitems: nicht verfügbar.' : workitems.length === 0 ? 'Keine offenen P0/P1-Workitems.' : `${workitems.length} offene(s) P0/P1-Workitem(s).`)
  return teile.join(' ')
}

/**
 * Löst den Vorfilter gegen eine Chat-Nachricht auf. Erkennt kein Muster: null
 * (die View schickt die Nachricht dann an POST /api/chat).
 * @param nachricht - die vom Menschen eingegebene Chat-Nachricht
 * @param zustand - letztes Aggregat aus GET /api/zustand (zustand.js), oder null vor dem ersten Tick
 * @returns { art: 'antwort', antwort, quelle: 'vorfilter' } oder null
 */
export async function loeseVorfilterAuf(nachricht, zustand) {
  const muster = erkenneVorfilterMuster(nachricht)
  if (muster === null) return null

  if (muster === 'braucht_mich') {
    let workitemsAntwort
    try {
      workitemsAntwort = await holeOffeneP0P1Workitems()
    } catch (fehler) {
      workitemsAntwort = { workitems: null, befunde: [], fehler: [{ quelle: 'workitems', grund: fehler.message }] }
    }
    return { art: 'antwort', antwort: beantworteBrauchtMich(zustand, workitemsAntwort), quelle: 'vorfilter' }
  }

  return { art: 'antwort', antwort: beantworteStatus(zustand), quelle: 'vorfilter' }
}
