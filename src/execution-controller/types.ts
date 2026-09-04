/**
 * Datei: src/execution-controller/types.ts
 *
 * Zweck: Typen für den Execution Controller (F8 WS-1/WS-2a/WS-2b,
 * state/tasks/f8-execution-controller-ws1.md,
 * state/tasks/f8-execution-controller-ws2a.md,
 * state/tasks/f8-execution-controller-ws2b.md, state/plan-v1-f8-execution-
 * controller.md Abschnitt 2.1/2.2/2.3). WS-2b ergänzt AusfuehrungsEingaben um
 * das optionale vorgaengerLaufId (AK7) — Lineage-Verweis bei Wiederaufnahme,
 * kein Feld von AusfuehrungsOptionen (der Controller liest und verarbeitet
 * es aktiv, anders als die reine Durchreichung unten). AusfuehrungsOptionen bündelt alle Felder,
 * die F5/F6a/F7/F1B/F9 für einen Testlauf (AK8) oder eine andere Ablage
 * brauchen, und reicht sie unverändert an die jeweilige Funktion durch —
 * der Controller interpretiert keinen dieser Werte selbst (D5, SCOPE
 * Punkt 2 des Vertrags). Vorbehalt (F-107): die Garantie gilt für die
 * hier gelisteten Felder, nicht strukturell für GatewayOptionen als
 * Ganzes — src/execution-controller/index.ts reicht die F6a-spezifischen
 * Felder einzeln an starteGateway durch, statt optionen als Objekt
 * weiterzureichen. Ein künftig in F6as GatewayOptionen neu hinzukommendes
 * Feld wird dadurch NICHT automatisch durchgereicht, sondern muss hier
 * UND in index.ts explizit nachgetragen werden.
 *
 * Wird aufgerufen von:
 * - src/execution-controller/index.ts
 *
 * Wichtig:
 * schreiber ist bewusst nullstellig (Muster F6a, src/claude-code-
 * gateway/index.ts, GatewayOptionen.schreiber) — ein nullstelliger
 * Aufrufer ist zu jedem der vier unterschiedlich geformten
 * Schreiber-Parameter von F5/F6a/F7/F1B strukturell zuweisungskompatibel,
 * ohne dass der Controller eine gemeinsame Form erzwingen müsste.
 */

import type { AufrufEingaben, Starter } from '../claude-code-gateway/types.ts'
import type { Anfrage, Budget, KontextpaketErgebnis } from '../context-builder/types.ts'
import type { LaufStatus } from '../checkpoint-store/types.ts'
import type { KlassifikationsErgebnis } from '../result-evaluator/types.ts'

/** Durchreichung an F5/F6a/F7/F1B — kein Feld wird vom Controller selbst gelesen oder ausgewertet (D5). */
export interface AusfuehrungsOptionen {
  schreiber?: () => void
  basisVerzeichnis?: string
  /** Nur für F6as starteGateway (WS2) — Ablageort des Rohereignisstroms. */
  rohBasisVerzeichnis?: string
  /** Nur für F6as starteGateway — Prozessstart-Attrappe für Tests (AK8), nie ein echter Prozess. */
  starter?: Starter
  /** Nur für F6as starteGateway — überschreibt den Messpfad für den Ist-Zustand (Tests). */
  settingsPfad?: string
  /** Nur für F6as starteGateway — überschreibt den Pfad zur Autorisierungsreferenz (Tests). */
  aktuelleAutorisierungPfad?: string
  /** Nur für F6as starteGateway — überschreibt die Repo-Wurzel der Startfreigabeprüfung (Tests). */
  startfreigabeRepoWurzel?: string
}

/** Eingaben für einen vollständigen Durchlauf (plan-v1 Abschnitt 2.1, Entwurf — Namen/Feinschnitt beim Bau angepasst, Verhalten unverändert). */
export interface AusfuehrungsEingaben {
  rolle: string
  anfragen: Anfrage[]
  budget: Budget
  aufrufEingaben: AufrufEingaben
  werkzeugStartziel: string[]
  werkzeugVersionDeklariert: string
  berechtigungskontext: string
  /** Lineage-Verweis auf einen Vorgängerlauf bei Wiederaufnahme nach KLAERUNG_ERFORDERLICH oder ABGESCHLOSSEN/FEHLGESCHLAGEN (WS-2b, plan-v1 Abschnitt 2.3, AK7). Vom Aufrufer gewählt — der Controller generiert und prüft diese ID nicht. */
  vorgaengerLaufId?: string
}

/** Diskriminierte Union über die drei möglichen Ausgänge der Kette (Abbruch bei F5, Abbruch bei F6a, vollständiger Durchlauf). */
export type AusfuehrungsErgebnis =
  | { ok: false; stufe: 'kontextpaket'; ergebnis: KontextpaketErgebnis & { ok: false } }
  | { ok: false; stufe: 'gateway'; grund: string }
  | {
      ok: true
      klassifikation: KlassifikationsErgebnis
      laufStatus: LaufStatus
      /** Gesetzt genau dann, wenn eine E-186-Eskalation (WS-2a) stattgefunden hat — die intern erzeugte laufId ist sonst nach Rückkehr unauffindbar (Vertrag SCOPE Punkt 3). */
      eskalation?: { laufId: string; bedarfVersionSequenz: number; transportVersionSequenz: number }
    }
