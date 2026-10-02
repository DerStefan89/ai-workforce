/**
 * Datei: public/leitstand/fokus-daten.js
 *
 * Zweck: Gemeinsames Fokus-Modul (F44 WS-2b). Welcher Workflow im Fokus steht, welcher Lauf der
 * jüngste ist und der Nachtrag zum Fokus-Workflow (Schritte, Abnahme-Flags, aktiver Lauf) für die
 * Übersicht (#/dashboard). Seit F46 D1 nutzt die Übersicht ladeFokusNachtrag für den Workflow des
 * Features in Arbeit (Rollen-Kreis, dazu die additiven Felder pruefergebnis und abnahmeEntscheidung)
 * und waehleLetztenLauf für die letzte Ausführung; waehleFokusWorkflow nutzt sie nicht mehr.
 * Die Logik stammt aus views/workboard.js (waehleFokusWorkflow, waehleLetztenLauf,
 * aktualisiereFokusCache); das Bento dort ist seit F44 WS-3a entfernt (F-892), mit ihm der nur dort
 * genutzte Export LEERER_FOKUS.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/dashboard.js
 * - public/leitstand/views/workboard-detail.js (schrittFolge — „Wer macht was“ im Detail der Entwicklung, F44 WS-3b)
 * - public/leitstand/fokus-daten.test.mjs (node:test, reine Funktionen)
 *
 * Wichtig:
 * - Import-sicher: kein Zugriff auf DOM oder Storage beim Import; fetch nur über api.js.
 * - ladeFokusNachtrag cacht nicht selbst: Den Cache und die Regel „nur bei wechselnder
 *   Workflow-ID nachladen“ hält der Aufrufer (D5, nicht bei jedem Poll-Tick).
 * - Die Auswahl „wartet auf den Menschen“ und ihre Reihenfolge kommen aus attention-daten.js
 *   (baueEntscheidungen: Freigabe vor Rückfrage, F-913) — eine Regel.
 */

import { holeAbnahme, holeLaufDetail, holeWorkflowDetail } from './api.js'
import { baueEntscheidungen } from './attention-daten.js'

/**
 * Wählt den für die Übersicht relevantesten Workflow: zuerst den ersten, der auf eine menschliche
 * Aktion wartet, in der Reihenfolge von „Deine nächsten Entscheidungen“ (baueEntscheidungen:
 * Freigaben vor Rückfragen — F-913, „Aktuelle Rolle“ und die Entscheidungsliste priorisieren so
 * gleich; D5, die Oberfläche entscheidet nichts selbst), sonst einen laufenden, sonst den ersten
 * überhaupt.
 * @param workflows - zustand.workflows (null bei defekter Quelle)
 * @returns ein Workflow-Eintrag, oder null
 */
export function waehleFokusWorkflow(workflows) {
  if (!Array.isArray(workflows) || workflows.length === 0) return null
  const ersterWartender = baueEntscheidungen({ workflows }, []).gruppen.workflows[0]
  if (ersterWartender !== undefined) return workflows.find((w) => w.workflowId === ersterWartender.id) ?? null
  return workflows.find((w) => w.status === 'LAEUFT') ?? workflows[0]
}

/**
 * Der zuletzt aktualisierte Lauf — zeitpunkt ist ein ISO-Zeitstempel (Muster views/runs.js),
 * Stringvergleich reicht.
 * @param laeufe - zustand.laeufe (null bei defekter Quelle)
 * @returns der jüngste Lauf, oder null
 */
export function waehleLetztenLauf(laeufe) {
  if (!Array.isArray(laeufe) || laeufe.length === 0) return null
  return laeufe.reduce((juengster, lauf) => (lauf.zeitpunkt && (!juengster.zeitpunkt || lauf.zeitpunkt > juengster.zeitpunkt) ? lauf : juengster))
}

/**
 * Lädt den Nachtrag zum Fokus-Workflow: Schritte (GET …/workflows/<id>), Abnahme-Flags
 * (GET …/abnahme, ein Fehler dort ist kein Abbruch) und den gerade aktiven Lauf
 * (GET …/laeufe/<laufId> des Schritts mit Status LAEUFT): Startzeit aus dem ersten, Aufgabe aus
 * dem letzten Checkpoint, dazu Worker und beobachtetes Modell aus der Laufakte (WS-2b, additiv).
 * @param workflow - der Fokus-Workflow (nicht null)
 * @returns der Nachtrag { workflowId, schritte, workflowStatus, freigabeHalt, aktivLauf, pruefergebnis, abnahmeEntscheidung }, oder null, wenn das Workflow-Detail nicht ladbar war (der Aufrufer versucht es beim nächsten Tick erneut)
 */
export async function ladeFokusNachtrag(workflow) {
  try {
    const [detailAntwort, abnahme] = await Promise.all([holeWorkflowDetail(workflow.workflowId), holeAbnahme(workflow.workflowId).catch(() => null)])
    if (!detailAntwort.ok) return null
    const detailInhalt = await detailAntwort.json()
    const schritte = Array.isArray(detailInhalt.daten?.schritte) ? detailInhalt.daten.schritte : []

    let aktivLauf = null
    const laufenderSchritt = schritte.find((s) => s.status === 'LAEUFT' && typeof s.lauf_id === 'string')
    if (laufenderSchritt) {
      try {
        const laufAntwort = await holeLaufDetail(laufenderSchritt.lauf_id)
        if (laufAntwort.ok) {
          const laufDetail = await laufAntwort.json()
          const checkpoints = Array.isArray(laufDetail.checkpoints) ? laufDetail.checkpoints : []
          const laufakte = laufDetail.laufakte?.status === 'ok' ? laufDetail.laufakte : null
          aktivLauf = {
            startZeit: checkpoints[0]?.zeitstempel ?? null,
            aufgabe: checkpoints[checkpoints.length - 1]?.lineage?.beschreibung ?? null,
            worker: laufakte?.worker ?? null,
            modellBeobachtet: laufakte?.modellBeobachtet ?? null,
          }
        }
      } catch (fehler) {
        // Aktiver Lauf nicht ladbar — Start/Aufgabe/Laufzeit bleiben Leerzustand, kein Abbruch des restlichen Nachtrags.
        console.error('Fokus-Nachtrag: aktiver Lauf nicht ladbar:', fehler)
      }
    }

    return {
      workflowId: workflow.workflowId,
      schritte,
      workflowStatus: abnahme?.workflowStatus ?? workflow.status,
      freigabeHalt: abnahme?.freigabeHalt ?? null,
      aktivLauf,
      // F46 D1 (Rollen-Kreis, rollen-kreis.js kreisStatus), additiv aus derselben Antwort: Prüfschritt
      // aus dem deterministischen Prüfergebnis, Abnahme aus der Abnahme-Entscheidung. null, wenn
      // GET …/abnahme nicht ladbar war — die Rollen bleiben dann „offen“, nichts wird geraten.
      pruefergebnis: abnahme?.pruefergebnis ?? null,
      abnahmeEntscheidung: abnahme?.entscheidung ?? null,
    }
  } catch (fehler) {
    // Netzwerkfehler beim Nachtrag: der nächste Poll-Tick versucht es erneut, kein eigener Fehlerzustand.
    console.error('Fokus-Nachtrag fehlgeschlagen:', fehler)
    return null
  }
}

/**
 * Zuvor, Jetzt und Danach im Fokus-Workflow (B11): Jetzt ist der Schritt mit Status LAEUFT, sonst
 * der, auf den das Automaten-Verdikt zeigt (naechster.schrittId: wartet auf Freigabe bzw. ist als
 * Nächstes startbereit), sonst der Cursor (aktiverSchrittId). Zuvor ist der Schritt, dessen nachfolger Jetzt ist; Danach ist der
 * nachfolger von Jetzt. Rein, ohne Rechnung über die Reihenfolge der Liste hinaus.
 * @param workflow - Fokus-Workflow aus dem Aggregat
 * @param schritte - Schritte aus dem Fokus-Nachtrag
 * @returns { zuvor, jetzt, danach } je Schritt oder null
 */
export function schrittFolge(workflow, schritte) {
  if (!Array.isArray(schritte) || schritte.length === 0) return { zuvor: null, jetzt: null, danach: null }
  const findeId = (id) => (typeof id === 'string' ? (schritte.find((s) => s.schritt_id === id) ?? null) : null)
  const jetzt = schritte.find((s) => s.status === 'LAEUFT') ?? findeId(workflow?.naechster?.schrittId) ?? findeId(workflow?.aktiverSchrittId) ?? null
  if (jetzt === null) return { zuvor: null, jetzt: null, danach: null }
  return {
    zuvor: schritte.find((s) => s.nachfolger === jetzt.schritt_id) ?? null,
    jetzt,
    danach: findeId(jetzt.nachfolger),
  }
}
