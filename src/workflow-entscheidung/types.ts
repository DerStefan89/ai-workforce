/**
 * Datei: src/workflow-entscheidung/types.ts
 *
 * Zweck: Typen für das Architektur-Entscheidungsartefakt (F39 WS-2b, löst
 * state/findings.md F-632 Teil b). WorkflowArchitekturEntscheidungV0Daten ist
 * die Form von daten.daten — F2s registriereKernArtefakt-Parameter 'daten' —
 * der Kernartefakt-Kette 'workflow-entscheidung-<workflowId>'. Eine Version
 * dieser Kette trägt die Antworten EINES Klärvorgangs (Regel 1c,
 * src/workflow/index.ts) — mehrere Architektur-Schritte oder ein
 * Korrekturdurchgang in DEMSELBEN Workflow schreiben additiv weitere
 * Versionen, unterschieden über 'schritt_id' (Muster
 * scripts/leitstand/routen-sparring.mjs' 'sparring-auftrag-<projektId>',
 * F-625).
 *
 * Bewusst KEIN siebter 'art'-Wert auf schemas/kontrollzustand-entscheidung-
 * payload.schema.json (src/entscheidung/types.ts): jene Kette trägt je 'art'
 * GENAU EIN 'ergebnis' aus einer geschlossenen, art-eigenen Wertemenge — eine
 * Architektur-Entscheidung beantwortet dagegen N Fragen aus
 * schemas/ergebnis-architektur.schema.json's 'entscheidungen_mensch[]' auf
 * einmal, mit je einer frei gewählten Option statt eines der sechs fixen
 * 'ergebnis'-Werte. Eine Erweiterung hätte 'ergebnis' auf ein Array
 * umgebaut und damit die bestehenden sechs Zweige (jeder mit
 * 'additionalProperties: false' auf einem einzelnen 'ergebnis'-String)
 * gebrochen — ein eigenes, kleines Payload-Format ist hier die kleinere
 * Änderung (CLAUDE.md-Entscheidungsregel 5: dokumentiert statt
 * stillschweigend eine etablierte Form verbogen).
 */

/** Eine einzelne beantwortete Frage aus entscheidungen_mensch[]. */
export interface WorkflowEntscheidungAntwort {
  frage: string
  /** Muss den Titel einer der 'optionen' der referenzierten Frage nennen — geprüft von pruefeAntwortenGegenFragen, keine Option erfinden. */
  gewaehlt: string
  begruendung?: string
}

export interface WorkflowArchitekturEntscheidungV0Daten {
  schritt_id: string
  antworten: WorkflowEntscheidungAntwort[]
  entschieden_am: string
}
