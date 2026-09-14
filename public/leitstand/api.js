/**
 * Datei: public/leitstand/api.js
 *
 * Zweck: Einzige Stelle im Leitstand-Client, die fetch() gegen die
 * bestehenden Endpunkte aufruft (F20 WS-1 Modul-Aufteilung — vorher lagen
 * alle fetch()-Aufrufe verteilt in app.js). Ändert an den Endpunkten selbst
 * NICHTS (F20-Nicht-Ziel) — jede Funktion hier entspricht 1:1 einem bereits
 * bestehenden, bereits gateway-geprüften Aufruf.
 *
 * Absichtlich dünn: eine GET-Funktion liefert das geparste JSON (wie die
 * bisherigen Aufrufstellen es taten), eine schreibende Funktion liefert die
 * rohe Response, weil die aufrufende View den Statuscode selbst auswertet
 * (400/409 mit lesbarem Grund, kein verschluckter Fehler — bestehendes
 * Muster, unverändert übernommen).
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/runs.js
 * - public/leitstand/views/projekt.js
 * - public/leitstand/views/workflows.js
 * - public/leitstand/views/workboard.js (F22 WS-2)
 *
 * Wichtig: Kein Fehler-Handling hier (kein try/catch) — das bleibt Sache der
 * aufrufenden View, die weiß, wie sie einen Fehlschlag anzeigt (Muster
 * zeigeStartFehler/zeigePollFehler). Diese Datei baut nur die Anfrage.
 */

export const holeLaeufe = () => fetch('/api/laeufe').then((r) => r.json())
export const holeLaufDetail = (laufId) => fetch(`/api/laeufe/${encodeURIComponent(laufId)}`)
export const starteLauf = (koerper) => fetch('/api/laeufe', { method: 'POST', body: JSON.stringify(koerper) })
export const abbrichLauf = (laufId) => fetch(`/api/laeufe/${encodeURIComponent(laufId)}/abbrechen`, { method: 'POST' })

export const holeStartfehler = () => fetch('/api/startfehler').then((r) => r.json())

// F21 WS-2: einmaliger Abruf beim Betreten der View bzw. bei Filterwechsel — kein Poll
// (Findings/Feature-Akten ändern sich nur durch Commits, siehe views/workboard.js).
export const holeWorkitems = (filter = {}) => {
  const params = new URLSearchParams(filter)
  const query = params.toString()
  return fetch(`/api/workitems${query.length > 0 ? `?${query}` : ''}`).then((r) => r.json())
}

// F20 WS-2 (AK3): Aggregat aus laeufe/startfehler/workflows, gepollt von zustand.js — einzige
// Stelle, die noch periodisch fetch() aufruft.
export const holeZustand = () => fetch('/api/zustand').then((r) => r.json())

export const holeAuftraege = () => fetch('/api/auftraege').then((r) => r.json())
export const legeAuftragAn = (koerper) => fetch('/api/auftraege', { method: 'POST', body: JSON.stringify(koerper) })

// F22 WS-2: löst den asynchronen Router-Lauf aus (202 + laufId, 409 bei D13 — scripts/leitstand-server.mjs).
export const routeAuftrag = (auftragId) => fetch(`/api/auftraege/${encodeURIComponent(auftragId)}/routen`, { method: 'POST' })

export const holeWerkzeugsaetze = () => fetch('/api/startvorlage/werkzeugsaetze').then((r) => r.json())

export const sendeEntscheidungAnfrage = (koerper) => fetch('/api/entscheidungen', { method: 'POST', body: JSON.stringify(koerper) })

export const holeWorkflows = () => fetch('/api/workflows').then((r) => r.json())
export const holeWorkflowDetail = (workflowId) => fetch(`/api/workflows/${encodeURIComponent(workflowId)}`)
export const reicheWorkflowFassungEin = (koerper) => fetch('/api/workflows', { method: 'POST', body: JSON.stringify(koerper) })
export const starteWorkflowSchritt = (workflowId) => fetch(`/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST', body: JSON.stringify({}) })
export const sendeWorkflowFreigabe = (workflowId, koerper) => fetch(`/api/workflows/${encodeURIComponent(workflowId)}/freigabe`, { method: 'POST', body: JSON.stringify(koerper) })
export const stoppeWorkflow = (workflowId, koerper) => fetch(`/api/workflows/${encodeURIComponent(workflowId)}/stoppen`, { method: 'POST', body: JSON.stringify(koerper) })
