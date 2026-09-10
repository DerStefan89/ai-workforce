/**
 * Datei: src/workflow/types.ts
 *
 * Zweck: Typen für das Workflow-Modul (F15 WS-2a, Meilenstein 3,
 * docs/projekt/zielfassung.md §13.4 E-M3-1). WorkflowV0Daten ist die
 * typisierte Form von daten.daten — F2s registriereKernArtefakt-Parameter
 * 'daten' —, wenn workflow_schema === "v0". Muster: src/auftrag/types.ts.
 * schemas/kontrollzustand-workflow-payload.schema.json beschreibt dieselbe
 * Form maschinell, src/workflow/index.ts' validiereWorkflowDaten prüft sie
 * zur Laufzeit.
 *
 * Wird aufgerufen von: src/workflow/index.ts, src/workflow/workflow.test.ts.
 *
 * Wichtig — drei Beschreibungen derselben Form: das JSON-Schema (lesbar),
 * validiereWorkflowDaten (ausgeführt), die Typen hier (übersetzt). Die
 * Enum-Listen unten sind Zwillinge der Konstanten-Arrays am Kopf von
 * index.ts (WORKFLOW_STATUS/SCHRITT_STATUS/WORKER/FREIGABE); wer eine
 * ändert, ändert beide.
 *
 * Bewusst KEIN Gate darauf (WS-2a) — aber nicht aus dem Grund, der hier
 * ursprünglich stand. Die erste Fassung argumentierte, ein Auseinanderlaufen
 * könne nichts durchlassen, weil jeder Wert vorher validiereWorkflowDaten
 * passiert habe. Das gilt nur für die Richtung „Typ wächst, Array nicht".
 * In der Gegenrichtung — jemand ergänzt WORKER oder FREIGABE in index.ts und
 * vergisst die Union hier — liefe der neue Wert durch die Validierung und
 * träfe dann auf eine Entscheidungsregel, die ihn nicht kennt; tsc bemerkt
 * davon nichts, weil index.ts die Arrays gar nicht gegen diese Typen
 * prüft und der einzige Produktivaufrufer (scripts/leitstand-server.mjs)
 * als .mjs außerhalb von tsconfig.json liegt (Reviewer-Pass 10.09.2026, K2).
 *
 * Tragfähig ist die Verzichtsentscheidung erst dadurch, dass
 * ermittleNaechstenSchritt jede sicherheitsrelevante Prüfung als ALLOWLIST
 * führt — und zwar für ALLE VIER Zwillinge, nicht nur für die beiden
 * offensichtlichen (Reviewer-Pass 10.09.2026, R2: die erste Fassung dieser
 * Begründung übersah, dass WORKFLOW_STATUS gegen eine Sperrliste geprüft
 * wurde, und behauptete Sicherheit, die für diese eine Liste nicht galt):
 *
 *   WORKFLOW_STATUS → FORTSETZBARE_WORKFLOW_STATUS (Regel 0) → haltKlaerung
 *   SCHRITT_STATUS  → STARTBEREITE_SCHRITT_STATUS   (Regel 3) → haltKlaerung
 *   WORKER          → 'claude-code'                 (Regel 4) → haltKlaerung
 *   FREIGABE        → AUTOMATISCH_STARTENDE_FREIGABE(Regel 5) → haltFreigabe
 *
 * Ein Wert, den die Arrays in index.ts kennen und die Regel dort nicht, fällt
 * damit in „hält an", nicht in „startet automatisch". Ein vergessener
 * Zwilling kostet eine überflüssige Rückfrage an den Menschen — nicht einen
 * ungewollten Start.
 *
 * F15 WS-2c (b1) ändert an dieser Bauart nichts: `freigabe_erteilt` ist kein
 * fünfter Zwilling, sondern ein optionales boolean, das die ZWINGEND-Zeile in
 * Regel 5 um genau eine Ausnahme erweitert — und auch die ist eine Allowlist
 * (nur exakt `true` startet, jeder andere Wert und das fehlende Feld halten
 * an). GESTOPPT wandert dabei aus Regel 0s haltKlaerung in den eigenen
 * Ausgang haltGestoppt; die Allowlist FORTSETZBARE_WORKFLOW_STATUS bleibt
 * unverändert, es ändert sich nur, WOHIN der nicht fortsetzbare Fall fällt.
 */

/** Status auf Workflow-Ebene. Zwilling von WORKFLOW_STATUS in index.ts. */
export type WorkflowStatus = 'OFFEN' | 'WARTET_FREIGABE' | 'LAEUFT' | 'ABGESCHLOSSEN' | 'KLAERUNG_ERFORDERLICH' | 'GESTOPPT'

/** Status auf Schritt-Ebene. Zwilling von SCHRITT_STATUS in index.ts. */
export type SchrittStatus = 'OFFEN' | 'WARTET_FREIGABE' | 'LAEUFT' | 'ERFOLGREICH' | 'VERWEIGERT' | 'FEHLGESCHLAGEN' | 'UEBERSPRUNGEN'

/** Ausführungswerkzeug eines Schritts. Zwilling von WORKER in index.ts. */
export type Worker = 'claude-code' | 'codex'

/** Freigabebedarf eines Schritts. Zwilling von FREIGABE in index.ts. */
export type Freigabe = 'AUTOMATISCH' | 'EMPFOHLEN' | 'ZWINGEND'

/** Die drei terminalen Ausgänge eines Werkzeuglaufs (ARCHITECTURE.md §4). */
export type SchrittAusgang = 'ERFOLGREICH' | 'VERWEIGERT' | 'FEHLGESCHLAGEN'

export interface WorkflowV0Grenzen {
  max_schritte: number
  max_replans: number
}

export interface WorkflowV0Schritt {
  schritt_id: string
  rolle: string
  werkzeugsatz: string
  worker: Worker
  modell: string
  eingaben: string[]
  output_schema: string | null
  freigabe: Freigabe
  risiko: string
  zeitgrenze_ms: number
  nachfolger: string | null
  status: SchrittStatus
  lauf_id: string | null
  /**
   * OPTIONAL (F15 WS-2c (b1), löst F-207): true, sobald ein Mensch für genau
   * diesen Schritt eine Freigabe erteilt hat (POST /api/workflows/<id>/
   * freigabe). Nur DIESES Feld löst einen ZWINGEND-Halt auf — `freigabe`
   * selbst bleibt unverändertes Plandatum (AK7 Satz 2, F-195).
   *
   * Bewusst optional und NICHT in 'required': jede vor (b1) geschriebene
   * Version ist append-only (ARCHITECTURE.md §7) und trägt das Feld nicht;
   * ein Pflichtfeld machte den gesamten Bestand ungültig. Dieselbe Bauart
   * wie `grund` aus (a5). Ein fehlendes Feld heißt „keine Freigabe erteilt" —
   * der sichere Vorgabewert, denn nur die Anwesenheit von `true` startet.
   */
  freigabe_erteilt?: boolean
}

export interface WorkflowV0Daten {
  workflow_schema: 'v0'
  workflow_id: string
  auftrag_id: string
  version: number
  ziel: string
  status: WorkflowStatus
  /**
   * Cursor (WS-1): der Schritt, auf dem der Automat steht — der laufende,
   * sonst der als Nächstes fällige; null bei ABGESCHLOSSEN oder GESTOPPT.
   */
  aktiver_schritt_id: string | null
  /**
   * OPTIONAL (F15 WS-2c, löst F-202): warum der Schritt-Automat zuletzt NICHT
   * weitergelaufen ist — der Text, den beschreibeAutomatAusgang für einen
   * nicht-'starte'-Ausgang erzeugt, dazu der Heilungs-, der Stale-LAEUFT- und
   * der Fortsetzungsfehler-Text. null, sobald ein Schritt startet; ganz
   * abwesend bei Versionen aus der Zeit vor WS-2c.
   *
   * Bewusst NICHT „Halt-Grund" genannt (QA-Pass 10.09.2026): auch ein sauber
   * durchgelaufener Workflow trägt hier einen Text ('fertig' →
   * „…er ist durchgelaufen"). Das Feld beantwortet „warum steht der Automat?",
   * nicht „was ist schiefgegangen?" — eine Anzeige darf es deshalb nicht ohne
   * Blick auf status als Fehlermeldung rendern.
   *
   * Ab WS-2c hält der Automat an, während niemand hinsieht; stünde der Grund
   * nur in der flüchtigen Startfehlerliste des Servers, wäre er nach einem
   * Serverneustart weg.
   */
  grund?: string | null
  grenzen: WorkflowV0Grenzen
  schritte: WorkflowV0Schritt[]
}

/**
 * Normalisiertes Ergebnis des zuletzt gelaufenen Schritts, wie
 * ermittleNaechstenSchritt es entgegennimmt. Bewusst NICHT der
 * AusfuehrungsErgebnis-Typ des Execution Controllers: src/workflow bleibt
 * abhängigkeitsarm wie src/auftrag und importiert nichts aus
 * src/execution-controller — der Aufrufer normalisiert.
 */
export interface SchrittErgebnis {
  schrittId: string
  ergebnis: SchrittAusgang
  laufId: string
}

/**
 * Diskriminierte Union der Ausgänge von ermittleNaechstenSchritt. Jeder
 * Ausgang trägt zusätzlich den zu setzenden aktiver_schritt_id in der
 * Cursor-Lesart aus WS-1 — null nur dort, wo der Automat den Workflow
 * verlässt (fertig, haltGrenze).
 */
export type NaechsterSchritt =
  /** Der Folgeschritt (bzw. der erste Schritt) darf ohne Rückfrage starten. */
  | { art: 'starte'; schritt: WorkflowV0Schritt; aktiverSchrittId: string }
  /** Der Folgeschritt trägt freigabe 'ZWINGEND' — der Mensch entscheidet. */
  | { art: 'haltFreigabe'; schrittId: string; aktiverSchrittId: string }
  /** Der Automat kommt nicht weiter (Vorschritt nicht ERFOLGREICH, oder Schritt nicht dispatchbar). */
  | { art: 'haltKlaerung'; grund: string; aktiverSchrittId: string | null }
  /**
   * Der Workflow steht auf GESTOPPT (F15 WS-2c (b1)). EIGENER Ausgang, nicht
   * haltKlaerung: workflowStatusZuAusgang bildet ihn auf 'GESTOPPT' ab, und
   * damit überschreibt kein Automaten-Schreibpfad einen Stopp, den ein Mensch
   * gesetzt hat. Der Cursor kommt unverändert aus dem Datensatz — ein Stopp
   * verschiebt ihn nicht.
   */
  | { art: 'haltGestoppt'; aktiverSchrittId: string | null }
  /** grenzen.max_schritte ist erreicht — kein weiterer Schritt startet. */
  | { art: 'haltGrenze'; grund: string; aktiverSchrittId: null }
  /** Der letzte Schritt endete ERFOLGREICH und hat keinen nachfolger. */
  | { art: 'fertig'; aktiverSchrittId: null }

/** Optionen für registriereWorkflow — Muster src/auftrag/types.ts. */
export interface Optionen {
  basisVerzeichnis?: string
  schreiber?: Schreiber
}

export type Ereignisname = 'workflow_registriert'

export interface Ereignis {
  ereignis: Ereignisname
  zeitstempel: string
  workflow_id?: string
  versionSequenz?: number
}

export type Schreiber = (ereignis: Ereignis) => void
