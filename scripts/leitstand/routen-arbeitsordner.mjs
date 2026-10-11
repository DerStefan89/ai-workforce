/**
 * Datei: scripts/leitstand/routen-arbeitsordner.mjs
 *
 * Zweck: Reine Bausteine der Arbeitsordner-Routen (F45 B1a-1, E-F45-3 = A; Arbeitsregel M5: der Server registriert
 * nur):
 * - POST /api/workflows/<id>/arbeitsordner-aufraeumen { begruendung, verwerfen? } — Körper prüfen
 *   (pruefeAufraeumenKoerper) und entscheiden, ob aufgeräumt werden darf (aufraeumenSperrgrund): nur bei beendetem
 *   Ablauf (GESTOPPT, oder ABGESCHLOSSEN mit entschiedener Abnahme) oder fehlgeschlagener Vorbereitung, nie während
 *   eines Laufs oder Prüfschritts der Instanz und nie während der Vorbereitung.
 * - GET /api/arbeitsordner — lesende Liste aller Arbeitsordner des Projekts aus den Kern-Artefakten
 *   (baueArbeitsordnerListe), neueste zuerst.
 *
 * Wird aufgerufen von:
 * - scripts/leitstand-server.mjs (beide Routen, je Projektinstanz über den Dispatcher)
 * - scripts/leitstand/routen-arbeitsordner.test.mjs (node:test)
 *
 * Wichtig: Das Entfernen selbst (git worktree remove, git branch -d) liegt in src/arbeitsordner (Git-Starter); CSRF
 * prüft der zentrale Haken des Servers (F-813). Kein --force ohne ausdrückliches „verwerfen“.
 */

/** Workflow-Status, in denen ein Ablauf als beendet gilt. */
const BEENDET = new Set(['ABGESCHLOSSEN', 'GESTOPPT'])

/** Höchstlänge der Begründung. */
const MAX_BEGRUENDUNG = 2000

/**
 * Prüft den Körper von POST …/arbeitsordner-aufraeumen.
 * @param body - geparster JSON-Körper
 * @returns { ok: true, begruendung, verwerfen } oder { ok: false, grund }
 */
export function pruefeAufraeumenKoerper(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return { ok: false, grund: 'Körper muss ein JSON-Objekt sein' }
  if (typeof body.begruendung !== 'string' || body.begruendung.trim().length === 0) return { ok: false, grund: "'begruendung' muss ein nicht-leerer String sein (Pflichtfeld)" }
  if (body.begruendung.length > MAX_BEGRUENDUNG) return { ok: false, grund: `'begruendung' ist länger als ${MAX_BEGRUENDUNG} Zeichen` }
  if (body.verwerfen !== undefined && typeof body.verwerfen !== 'boolean') return { ok: false, grund: "'verwerfen' muss, wenn angegeben, true oder false sein" }
  return { ok: true, begruendung: body.begruendung.trim(), verwerfen: body.verwerfen === true }
}

/**
 * Sperrgrund für das Aufräumen, oder null, wenn es erlaubt ist.
 * @param lage - { workflowStatus, arbeitsordnerStatus (wirksam; null = kein Artefakt), laufAktiv, vorbereitungLaeuft, abnahmeOffen (ABGESCHLOSSEN ohne Annahme/Ablehnung) }
 * @returns Grund (Text) oder null
 */
export function aufraeumenSperrgrund({ workflowStatus, arbeitsordnerStatus, laufAktiv, vorbereitungLaeuft, abnahmeOffen = false }) {
  if (arbeitsordnerStatus === null) return 'Dieser Ablauf hat keinen eigenen Arbeitsordner'
  if (arbeitsordnerStatus === 'ENTFERNT') return 'Der Arbeitsordner ist bereits aufgeräumt'
  if (vorbereitungLaeuft) return 'Der Arbeitsordner wird gerade vorbereitet'
  if (laufAktiv) return 'Gerade läuft ein Lauf oder eine Prüfung — nach dessen Ende erneut versuchen'
  if (!BEENDET.has(workflowStatus) && arbeitsordnerStatus !== 'FEHLGESCHLAGEN') {
    return `Der Ablauf ist nicht beendet (${workflowStatus}) — aufräumen geht erst nach Abschluss oder Stopp`
  }
  // QA-Pass B1a-1 (Befund 2): das Ergebnis liegt nur im Arbeitsordner — erst abnehmen bzw. ablehnen, dann aufräumen.
  if (abnahmeOffen && arbeitsordnerStatus !== 'FEHLGESCHLAGEN') return 'Die Abnahme ist noch offen — das Ergebnis liegt nur im Arbeitsordner; erst entscheiden, dann aufräumen'
  return null
}

/**
 * Lesende Liste der Arbeitsordner eines Projekts.
 * @param eintraege - [{ workflowId, daten, ordnerVorhanden }] aus den Kern-Artefakten
 * @returns { arbeitsordner: [...] } neueste zuerst
 */
export function baueArbeitsordnerListe(eintraege) {
  const liste = eintraege
    .filter((eintrag) => eintrag.daten !== null && typeof eintrag.daten === 'object')
    .map(({ workflowId, daten, ordnerVorhanden }) => ({
      workflowId,
      status: daten.status,
      pfad: daten.pfad,
      branch: daten.branch,
      basis_commit: daten.basis_commit,
      grund: daten.grund,
      aktualisiert_am: daten.aktualisiert_am,
      ordnerVorhanden,
    }))
    .sort((a, b) => String(b.aktualisiert_am).localeCompare(String(a.aktualisiert_am)))
  return { arbeitsordner: liste }
}
