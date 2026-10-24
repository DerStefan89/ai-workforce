/**
 * Datei: scripts/leitstand/workflow-schritte.mjs
 *
 * Zweck: Reine Finder für Schritte einer Workflow-Fassung (Review-, qa- und Review-vor-qa-Schritt) — unverändert aus
 * scripts/leitstand-server.mjs ausgelagert (F45 B5b-1b-1, Wachstumsbremse: Ausgleich der Server-Zeilen durch Auslagern reiner,
 * nicht schreibender Helfer, docs/architektur/wachstumsbremse.md). Kein I/O, wirft nicht. findeAusfuehrungsSchritt bleibt im
 * Server (sein Kopfkommentar trägt die Robustheitsregel, auf die diese Finder verweisen).
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs.
 */

/**
 * Der Post-Build-Review-Schritt einer Fassung (F23 WS-2a). Kopplung an
 * output_schema 'ergebnis-code-reviewer', NICHT an rolle — dieselbe Kopplung
 * wie Regel 1b in ermittleNaechstenSchritt (D5, kein zweiter Regelsatz; siehe
 * dort und F-381 zur bewussten Entkopplung von rolle). Robustheitsanforderung
 * an workflowDaten wie bei findeAusfuehrungsSchritt (siehe dort).
 * @param workflowDaten - roher, ggf. ungültiger WORKFLOW_V0-artiger Datensatz
 * @returns der Schritt, oder null
 */
export function findeReviewSchritt(workflowDaten) {
  if (!Array.isArray(workflowDaten?.schritte)) return null
  return workflowDaten.schritte.find((s) => s !== null && typeof s === 'object' && s.output_schema === 'ergebnis-code-reviewer') ?? null
}

/**
 * F45 B2b-2b-1 (F-820): der qa-Schritt einer Fassung — Kopplung an output_schema 'ergebnis-qa' (Muster findeReviewSchritt,
 * Regel 1q). Robust gegen ungültige Daten wie findeAusfuehrungsSchritt.
 * @param workflowDaten - roher, ggf. ungültiger WORKFLOW_V0-artiger Datensatz
 * @returns der Schritt, oder null
 */
export function findeQaSchritt(workflowDaten) {
  if (!Array.isArray(workflowDaten?.schritte)) return null
  return workflowDaten.schritte.find((s) => s !== null && typeof s === 'object' && s.output_schema === 'ergebnis-qa') ?? null
}

/**
 * F45 B2b-2b-1 (Delta-Advisor D4): der Review, dessen nachfolger der qa-Schritt ist — dieselbe Beziehung wie der Aufschub
 * (qaNachfolgerStartbereit, src/workflow). Von ihm stammt die vorpruefung der Regel 1q.
 * @param workflowDaten - Workflow-Daten
 * @param qaSchritt - der qa-Schritt
 * @returns der Review-Schritt, oder null (qa ohne Review davor)
 */
export function findeReviewVorQa(workflowDaten, qaSchritt) {
  if (!Array.isArray(workflowDaten?.schritte) || qaSchritt === null) return null
  return workflowDaten.schritte.find((s) => s !== null && typeof s === 'object' && s.nachfolger === qaSchritt.schritt_id && s.output_schema === 'ergebnis-code-reviewer') ?? null
}
