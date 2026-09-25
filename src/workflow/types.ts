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

/**
 * Gesamturteil eines Post-Build-Reviews (F23 WS-1b, löst F-351/F-377).
 * Zwilling der urteil-Enum in schemas/ergebnis-code-reviewer.schema.json —
 * wortgleiche Wertemenge. Reine Dokumentation, wie die übrigen Zwillinge in
 * diesem Kopfkommentar (WORKFLOW_STATUS/SCHRITT_STATUS/WORKER/FREIGABE):
 * SchrittErgebnis.urteil bleibt bewusst `string | null` (roh aus dem
 * Rohstrom gelesen, ungeprüft), und ermittleNaechstenSchritt vergleicht in
 * Regel 1b gegen die rohen Literale, nicht gegen diesen Typ — ein
 * Laufzeitwert, den dieser Typ kennt und die Regel nicht, muss anhalten,
 * nicht durchlaufen (Reviewer-Pass 15.09.2026).
 */
export type CodeReviewerUrteil = 'BEREIT' | 'BEREIT_NACH_KORREKTUR' | 'BLOCKIERT'

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
  /**
   * OPTIONAL (F23 WS-1b, löst F-351/F-377): das Urteil eines gerade gelaufenen
   * Post-Build-Reviews (output_schema 'ergebnis-code-reviewer'), roh aus dem
   * Rohstrom des Laufs gelesen — der Aufrufer normalisiert (Muster `ergebnis`
   * oben, Kopfkommentar dieser Datei). Rückwärtskompatibel: jeder Aufrufer und
   * jede bestehende Fixture ohne dieses Feld bleibt unverändert lauffähig, ein
   * fehlendes Feld heißt für ermittleNaechstenSchritt dasselbe wie ein
   * unbekannter Wert — anhalten, nicht stillschweigend fortsetzen.
   */
  urteil?: string | null
  /**
   * OPTIONAL (F39 WS-2b, löst state/findings.md F-632 Teil b): die
   * Regelverletzungen von validiereErgebnisArchitektur (src/architekt/index.ts)
   * gegen das geparste Ergebnis eines gerade gelaufenen Architektur-Schritts
   * (output_schema 'ergebnis-architektur') — der Aufrufer validiert, dieses
   * Modul bleibt abhängigkeitsarm (Kopfkommentar) und importiert
   * validiereErgebnisArchitektur nicht. Ein leeres Array heißt gültig; ein
   * fehlendes Feld heißt „nicht geprüft" (jeder Schritt ohne dieses
   * output_schema) und wird von Regel 1c ignoriert wie ein fehlendes 'urteil'
   * von Regel 1b.
   */
  architekturVerstoesse?: string[]
  /**
   * OPTIONAL (F39 WS-2b): true, wenn das Ergebnis eines Architektur-Schritts
   * mindestens eine offene Frage in 'entscheidungen_mensch[]' trägt UND der
   * Aufrufer (scripts/leitstand-server.mjs, gegen die Kernartefakt-Kette
   * 'workflow-entscheidung-<workflowId>') noch KEINE dafür erfasste
   * menschliche Entscheidung findet. Sobald eine Entscheidung erfasst ist,
   * setzt der Aufrufer dieses Feld auf false/weglässt es — Regel 1c hält dann
   * nicht erneut an (Idempotenz).
   */
  architekturEntscheidungAusstehend?: boolean
  /** OPTIONAL (F39 WS-2b): Anzahl der Fragen in 'entscheidungen_mensch[]' — nur für den Halt-Grund-Text, keine eigene Prüfung. */
  architekturAnzahlFragen?: number
  /**
   * OPTIONAL (F-641, löst "Advisor liefert kein Urteil, gilt trotzdem als ERFOLGREICH"): true,
   * wenn ein gerade gelaufener 'architecture-advisor'-Schritt keine erkennbare 'Urteil: ...'-Zeile
   * trägt. Der Aufrufer (scripts/leitstand-server.mjs) berechnet das Feld NUR für diese Rolle
   * (liest den Prosa-Text des Laufs) — dieses Modul bleibt abhängigkeitsarm (Kopfkommentar) und
   * prüft den Text selbst nicht. Ein fehlendes Feld (jeder andere Schritt) bleibt für Regel 1d
   * folgenlos, wie ein fehlendes 'urteil' für Regel 1b.
   */
  advisorUrteilFehlt?: boolean
  /**
   * OPTIONAL (F-649, löst "ausfuehrung liefert eine erkennbare Selbstblockade, gilt trotzdem als
   * ERFOLGREICH" — real beobachtet, F39-WS-3b-Reallauf Versuch 3b, Lauf
   * e1c59219-615f-4f20-8737-8b9a99b4ff5c, 23.09.2026): true, wenn ein gerade gelaufener
   * 'ausfuehrung'-Schritt sich selbst über den CLAUDE.md-Status-Block als 'Blockiert' markiert.
   * Der Aufrufer (scripts/leitstand-server.mjs) berechnet das Feld NUR für diese Rolle (liest den
   * Ergebnistext, Muster advisorUrteilFehlt oben) — dieses Modul bleibt abhängigkeitsarm
   * (Kopfkommentar) und prüft den Text selbst nicht. Ein fehlendes Feld (jeder andere Schritt)
   * bleibt für Regel 1e folgenlos, wie ein fehlendes 'advisorUrteilFehlt' für Regel 1d.
   */
  ausfuehrungSelbstblockiert?: boolean
  /**
   * OPTIONAL (F-652, state/findings.md F-652, BUG P1): das Ergebnis der deterministischen
   * Post-Build-Prüfung (Startvorlagenfeld pruefbefehl) eines gerade gelaufenen
   * 'ausfuehrung'-Schritts, roh aus dem registrierten 'pruefergebnis-<laufId>'-Artefakt gelesen
   * (src/pruefschritt/index.ts) — der Aufrufer liest, dieses Modul bleibt abhängigkeitsarm
   * (Kopfkommentar) und importiert src/pruefschritt/ nicht. Fehlt das Feld (keine Startvorlage
   * mit pruefbefehl, oder der Schritt ist kein 'ausfuehrung'), bleibt Regel 1f folgenlos, wie ein
   * fehlendes 'ausfuehrungSelbstblockiert' für Regel 1e.
   */
  pruefergebnis?: 'GRUEN' | 'ROT' | 'ZEITGRENZE' | 'FEHLER'
  /** OPTIONAL (F-652): Exit-Code der Prüfung — nur für den Halt-Grund-Text, keine eigene Prüfung. */
  pruefergebnisExitCode?: number | null
  /** OPTIONAL (F-652): letzte ~40 Zeilen aus stdout+stderr der Prüfung — nur für den Halt-Grund-Text. */
  pruefergebnisAusgabeEnde?: string
  /**
   * OPTIONAL (F42 WS-4, löst F-712, real beobachtet im F42-WS-3-Reallauf gegen haushaltsbuch2):
   * Pfade außerhalb der Projektmodus-Allowlist (docs/**, features/**, CLAUDE.md), die ein gerade
   * gelaufener 'ausfuehrung'-Schritt real geändert hat — der Aufrufer (scripts/leitstand-
   * server.mjs) berechnet das Feld NUR im Projektmodus (herkunft.art === 'projekt_interview') und
   * NUR für diese Rolle (pruefeProjektmodusScope, src/architekt/index.ts, gegen die bereits
   * registrierte Änderungsübersicht) — dieses Modul bleibt abhängigkeitsarm (Kopfkommentar) und
   * prüft die Dateiliste selbst nicht. Ein leeres Array heißt kein Verstoß; ein fehlendes Feld
   * heißt „nicht geprüft" (Feature-Modus, oder jede andere Rolle) und bleibt für Regel 1g
   * folgenlos, wie ein fehlendes 'ausfuehrungSelbstblockiert' für Regel 1e.
   */
  scopeVerletzung?: string[]
  /**
   * OPTIONAL (F42 WS-4, löst F-714, real beobachtet im F42-WS-3-Reallauf gegen haushaltsbuch2):
   * true, wenn für den referenzierten Architektur-Schritt eine Entscheidung mit 'kategorie':
   * 'stack' erfasst war UND nach diesem 'ausfuehrung'-Lauf entweder istStackOffen(repoWurzel)
   * IMMER NOCH true liefert ODER kein ADR unter 'docs/adr/' auf das Entscheidungsartefakt verweist
   * (traegtAdrVerweisAufEntscheidung) — CLAUDE.md und/oder ADR wurden trotz Instruktion
   * (baueStackEntscheidungsInstruktion, die BEIDE Schreibziele verlangt) nicht vollständig
   * geschrieben. Der Aufrufer berechnet das Feld NUR unter dieser Voraussetzung; ein fehlendes
   * Feld (keine Stack-Entscheidung im Spiel, oder eine andere Rolle) bleibt für Regel 1h
   * folgenlos, wie ein fehlendes 'scopeVerletzung' für Regel 1g.
   */
  stackNichtGefuellt?: boolean
  /**
   * OPTIONAL (F35 WS-2, löst M5-Bestehensbedingung 2 "jedes AK trägt am Ende ein Urteil im
   * Review"): die Verstöße von pruefeAkUrteile (src/ak-pruefung/index.ts) gegen das ak_urteile-
   * Feld eines gerade gelaufenen 'code-reviewer'-Laufs (output_schema 'ergebnis-code-reviewer') —
   * dasselbe Berechnungsmuster wie 'architekturVerstoesse' oben: der Aufrufer
   * (scripts/leitstand-server.mjs) lädt den Auftrag und ruft pruefeAkUrteile auf, dieses Modul
   * bleibt abhängigkeitsarm und importiert src/ak-pruefung/ nicht. Ein leeres Array heißt: keine
   * WS-1-Kopplung ODER alle AK vollständig und ERFUELLT. Ein fehlendes Feld heißt „nicht geprüft"
   * (jeder Schritt ohne dieses output_schema) und bleibt für Regel 1i folgenlos, wie ein
   * fehlendes 'urteil' für Regel 1b.
   */
  akVerstoesse?: string[]
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
