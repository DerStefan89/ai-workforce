/**
 * Datei: scripts/leitstand/abnahme-stand.mjs
 *
 * Zweck: Reine Regeln der Abnahme, unverändert aus scripts/leitstand-server.mjs ausgelagert (F45 B5b-3, Ausgleich der
 * Wachstumsbremse W1 für den R7-Aufruf): findeAusfuehrungsSchritt (der Bauschritt einer Fassung) und ermittleAbnahmeStand (die
 * eine Regel „Abnahme offen“). Kein I/O.
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs (importiert beide, exportiert ermittleAbnahmeStand weiter für
 * scripts/leitstand-abnahme-stand.test.mjs).
 */

/**
 * Der Bauschritt einer Fassung (F23 WS-2a, GET/POST .../abnahme) — Kopplung an
 * rolle 'ausfuehrung' wie in beiden Vorlagen (workflow-vorlagen/standard.json,
 * hoch.json). Erster Treffer: mehrere Ausführungsschritte in einer Vorlage zu
 * unterscheiden ist kein WS-2a-Ziel.
 *
 * Der POST-Endpunkt ruft dies erst NACH validiereWorkflowDaten auf (409 vorher),
 * der GET-Endpunkt bewusst NICHT (Muster GET /api/workflows/<id>: eine ungültige
 * Fassung bleibt ansehbar, das ist ihr erster Reparaturschritt — Reviewer-Pass
 * 15.09.2026). workflowDaten.schritte ist deshalb HIER, anders als sonst in dieser
 * Datei, nicht als geprüftes Array vorauszusetzen — ein rohes .find() auf einem
 * fehlenden/kaputten Feld wäre derselbe Absturzpfad, den dekodiereSegment schon
 * einmal real den ganzen Server gekostet hat (siehe dortiger Kopfkommentar).
 * @param workflowDaten - roher, ggf. ungültiger WORKFLOW_V0-artiger Datensatz
 * @returns der Schritt, oder null
 */
export function findeAusfuehrungsSchritt(workflowDaten) {
  if (!Array.isArray(workflowDaten?.schritte)) return null
  return workflowDaten.schritte.find((s) => s !== null && typeof s === 'object' && s.rolle === 'ausfuehrung') ?? null
}

/**
 * Die EINE Regel „Abnahme offen“ (F46 D2, herausgelöst aus GET …/abnahme, F23 WS-2a, F-384):
 * - entscheidungStatus: 'nicht_vorhanden' ohne Abnahme-Entscheidung, 'ok', wenn sie sich auf den
 *   aktuellen Bau bezieht (bezug.ausfuehrung_lauf_id === lauf_id des Ausführungsschritts), sonst
 *   'veraltet' (ein neuer Bau-Lauf macht eine frühere Entscheidung veraltet, F-384);
 * - faellig: eine Abnahme wird angeboten — Workflow ABGESCHLOSSEN mit gelaufenem
 *   Ausführungsschritt. Das sind die Vorbedingungen, unter denen POST …/abnahme ein ANGENOMMEN
 *   annimmt (Sachprüfung (4) und bezug (5)). Die Ansicht (views/workflow-abnahme.js abnahmeLage)
 *   verlangt für „entscheidbar“ nur ABGESCHLOSSEN ohne aktuelle Entscheidung, nicht den gelaufenen
 *   Ausführungsschritt — praktisch gleich, weil ABGESCHLOSSEN heute einen Bau voraussetzt; ohne Bau
 *   bliebe die Liste hier zurückhaltend (nicht fällig), der POST antwortete ohnehin 409;
 * - offen: fällig und keine Entscheidung zum aktuellen Bau;
 * - status: für die Kopfdaten 'nicht_faellig', sonst entscheidungStatus.
 * Aufrufer: GET /api/workflows/<id>/abnahme (entscheidung.status) und baueWorkflowKopfdaten
 * (kopfdaten.abnahme). POST …/abnahme prüft seine Vorbedingungen unverändert selbst. Robust gegen
 * eine ungültige Fassung (findeAusfuehrungsSchritt).
 * @param workflowDaten - roher, ggf. ungültiger WORKFLOW_V0-artiger Datensatz
 * @param abnahmeVersion - geladene Version von abnahmeEntscheidungsId(<id>), oder null
 * @returns { entscheidungStatus, faellig, offen, status }
 */
export function ermittleAbnahmeStand(workflowDaten, abnahmeVersion) {
  const ausfuehrungSchritt = findeAusfuehrungsSchritt(workflowDaten)
  let entscheidungStatus = 'nicht_vorhanden'
  if (abnahmeVersion !== null && abnahmeVersion !== undefined) entscheidungStatus = abnahmeVersion.daten?.bezug?.ausfuehrung_lauf_id === ausfuehrungSchritt?.lauf_id ? 'ok' : 'veraltet'
  const faellig = workflowDaten?.status === 'ABGESCHLOSSEN' && typeof ausfuehrungSchritt?.lauf_id === 'string'
  return { entscheidungStatus, faellig, offen: faellig && entscheidungStatus !== 'ok', status: faellig ? entscheidungStatus : 'nicht_faellig' }
}
