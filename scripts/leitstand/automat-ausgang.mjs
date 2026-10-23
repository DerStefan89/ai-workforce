/**
 * Datei: scripts/leitstand/automat-ausgang.mjs
 *
 * Zweck: Abbildung eines Ausgangs von ermittleNaechstenSchritt (src/workflow) auf Workflow-Status und lesbaren Grund
 * (F15 WS-2b/WS-2c/WS-3b). Unverändert aus scripts/leitstand-server.mjs ausgelagert (F45 FB-1a, Ausgleich der
 * Wachstumsbremse, ARCHITECTURE.md §1) — rein, ohne I/O, schreibt nichts.
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs (baueNaechsterProjektion, wendeAutomatischeAnpassungAn,
 * schreibeWorkflowFortschritt-Umfeld, Start- und Freigabe-Endpunkte), scripts/leitstand/automat-ausgang.test.mjs.
 *
 * Wichtig: ALLOWLIST — ein neuer Ausgang braucht hier eine bewusste Zeile (siehe Kommentare unten); die Texte werden als
 * dauerhafter grund im Workflow-Artefakt gelesen, nicht nur als 409-Antwort.
 */

/**
 * Workflow-Status, der zu einem Ausgang von ermittleNaechstenSchritt gehört
 * (F15 WS-2b (6)). Der Cursor kommt in allen fünf Fällen unverändert aus
 * ausgang.aktiverSchrittId — die Union trägt ihn selbst, es gibt hier nichts
 * zu rechnen.
 *
 * 'starte' setzt LAEUFT, startet aber NICHTS: WS-2b ist ein manueller
 * Schritt-für-Schritt-Modus, in dem der Cursor nach jedem Schritt auf den
 * nächsten fälligen weiterwandert und ein zweiter POST .../starten ihn
 * ausführt. WS-2c ersetzt nur diesen zweiten Aufruf durch den automatischen —
 * der Zustand auf der Platte ist derselbe.
 * @param ausgang - Rückgabe von ermittleNaechstenSchritt
 * @returns der zu setzende Workflow-Status
 */
export function workflowStatusZuAusgang(ausgang) {
  if (ausgang.art === 'starte') return 'LAEUFT'
  if (ausgang.art === 'haltFreigabe') return 'WARTET_FREIGABE'
  if (ausgang.art === 'haltGrenze') return 'GESTOPPT'
  // F15 WS-2c (b1): der Ausgang, der zu einem bestehenden Stopp gehört.
  //
  // Als SCHREIBSCHUTZ ist diese Zeile unerreichbar, und das ist kein Versehen
  // (Reviewer-Pass 10.09.2026, W2): schreibeWorkflowFortschritt ruft
  // leiteWorkflowFelderAb — den einzigen Aufrufer dieser Funktion — auf einem
  // GESTOPPT gar nicht mehr auf. Den Stopp hält dort der eigene Schutz, nicht
  // diese Abbildung. Die Zeile bleibt trotzdem stehen, aus demselben Grund wie
  // jede andere ALLOWLIST-Zeile hier: fiele haltGestoppt in den Default, hinge
  // die Richtigkeit an einer zweiten Stelle, die ihn zufällig abfängt.
  // Wirksam ist der Ausgang selbst dagegen sehr wohl — er trägt die
  // 409-Antworten von POST .../starten und POST .../freigabe.
  if (ausgang.art === 'haltGestoppt') return 'GESTOPPT'
  if (ausgang.art === 'fertig') return 'ABGESCHLOSSEN'
  if (ausgang.art === 'haltKlaerung') return 'KLAERUNG_ERFORDERLICH'
  // ALLOWLIST wie überall in F15 (Reviewer-Pass 10.09.2026, V6): ein künftiger sechster Ausgang
  // fällt in "hält an" und muss hier eine bewusste Zeile bekommen, statt sich still einen Status
  // zu nehmen. KLAERUNG_ERFORDERLICH ist dabei nicht der Default, sondern eine eigene Zeile —
  // sonst wäre die Unterscheidung nur behauptet.
  return 'KLAERUNG_ERFORDERLICH'
}

/**
 * Übersetzt einen Ausgang von ermittleNaechstenSchritt in einen lesbaren Grund
 * (F15 WS-2b). Nötig, weil zwei der Ausgänge kein grund-Feld tragen:
 * 'haltFreigabe' nennt nur die schrittId, 'fertig' gar nichts.
 *
 * Ursprünglich nur für die 409-Antwort des Startendpunkts geschrieben, also für
 * einen Nicht-'starte'-Ausgang. Seit WS-2c (b1) reicht der Freigabe-Endpunkt
 * auch ein 'starte' hinein, und seit WS-3b liefert die Funktion den grund ALLER
 * sechs Ausgänge für die Anzeige (baueNaechsterProjektion) — die Texte werden
 * also von jemandem gelesen, der nichts falsch gemacht hat, nicht nur von
 * jemandem, dessen Aufruf gerade abgelehnt wurde (Reviewer-Pass 10.09.2026).
 * @param ausgang - Rückgabe von ermittleNaechstenSchritt
 * @returns lesbarer Grund
 */
export function beschreibeAutomatAusgang(ausgang) {
  if (ausgang.art === 'haltFreigabe') {
    // Der Text landet seit (a5) auch als dauerhafter grund im Artefakt und wird dort von einem
    // Menschen gelesen, der den Workflow ansieht — nicht von dem, der gerade einen Endpunkt
    // aufgerufen hat (QA-Pass 10.09.2026, Fehler 7). Er nennt deshalb die Bedingung und den
    // Ausweg, nicht den Aufrufweg.
    return `Schritt '${ausgang.schrittId}' verlangt eine menschliche Freigabe (freigabe 'ZWINGEND') — er startet erst, wenn für ihn eine Freigabe erteilt ist (POST /api/workflows/<id>/freigabe)`
  }
  if (ausgang.art === 'fertig') {
    return 'der Workflow hat keinen zu startenden Schritt mehr — er ist durchgelaufen'
  }
  if (ausgang.art === 'haltGestoppt') {
    return 'der Workflow ist GESTOPPT — daraus wird kein Schritt fortgesetzt, solange der Stopp steht'
  }
  // 'starte' trägt kein grund-Feld. Bis (b1) war das folgenlos — nur der Startendpunkt rief
  // diese Funktion, und dort kam ein 'starte' nie in den Nicht-'starte'-Zweig. Der
  // Freigabe-Endpunkt reicht ihn sehr wohl hinein, und zwar auf den zwei WAHRSCHEINLICHSTEN
  // Fehlbedienungen: zweimal freigeben (nach der ersten liefert die Regel 'starte') und einen
  // Workflow freigeben, der gar keine Freigabe braucht. Beide antworteten mit dem Wort
  // 'undefined' im Grund (QA-Pass 10.09.2026, Befund 2).
  if (ausgang.art === 'starte') {
    // Wortlaut bewusst neutral: dieser Text ist seit WS-3b auch die Anzeige eines völlig
    // normalen, startbereiten Workflows und darf sich nicht wie die Rückweisung einer
    // Fehlbedienung lesen. Für den Freigabe-Endpunkt bleibt er zutreffend — dort ist genau das
    // der Grund, warum die Freigabe abprallt.
    return `Schritt '${ausgang.schritt.schritt_id}' ist startbar — es liegt keine offene Freigabefrage vor`
  }
  return ausgang.grund
}
