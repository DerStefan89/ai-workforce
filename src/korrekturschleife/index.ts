/**
 * Datei: src/korrekturschleife/index.ts
 *
 * Zweck: Korrekturschleifen-Nachtrag (löst F-648/F-649, F39-WS-3b-Reallauf Versuch 3b,
 * 23.09.2026). Nach einer Abnahme-Entscheidung 'ANPASSUNG_ANGEFORDERT' (F23 WS-2b) bekam die
 * NÄCHSTE Iteration bislang weder die Abnahme-Begründung noch die Befunde des vorherigen Reviews
 * erkennbar mitgeteilt — real beobachtet: 'ausfuehrung' erklärte den längst überholten
 * Ursprungsauftrag für "bereits erledigt" (Lauf e1c59219-615f-4f20-8737-8b9a99b4ff5c), der
 * anschließende 'code-reviewer' (Lauf ba7bd1c5-2242-43ef-939f-0660ed0eef4e) gab 'urteil: BEREIT'
 * mit leeren 'befunde', weil sein realer, gespeicherter Prompt
 * (kontrollzustand-roh\ba7bd1c5-.../rohstrom.json) keinerlei Bezug zur Abnahme oder zu den
 * Befunden der Vorfassung trug — Beleg in features/F39/nachweis-ws3-reallauf-messung.md,
 * Abschnitt "Versuch 3b".
 *
 * baueAusfuehrungKorrekturInstruktion/baueReviewKorrekturInstruktion sind reine Funktionen, kein
 * I/O — der Aufrufer (scripts/leitstand-server.mjs, starteWorkflowSchritt) lädt die reale
 * Abnahme-Entscheidung und das vorherige Review-Ergebnis und hängt das Ergebnis an den
 * Auftragstext an (Muster baueUmsetzungsInstruktion, src/architekt/index.ts).
 *
 * leseSelbstblockadeAusAusfuehrungstext liest, ob eine 'ausfuehrung'-Antwort sich selbst über den
 * CLAUDE.md-Status-Block als 'Blockiert' markiert (F-649) — Regel 1e (src/workflow/index.ts) hält
 * den Workflow dann an, statt automatisch fortzusetzen (Muster Regel 1d/leseUrteilAusAdvisorText,
 * src/architecture-advisor/index.ts).
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs, src/korrekturschleife/korrekturschleife.test.ts.
 */

/** Form eines einzelnen Befunds aus schemas/ergebnis-code-reviewer.schema.json — nur die vier Felder, die hier zitiert werden. */
export interface KorrekturBefund {
  schwere?: string
  fundstelle?: string
  zusammenfassung?: string
  beleg?: string
}

/**
 * Baut den Zusatzblock, der an den Auftragstext eines 'ausfuehrung'-Schritts angehängt wird, wenn
 * die aktuelle Iteration auf eine Abnahme-Entscheidung 'ANPASSUNG_ANGEFORDERT' folgt. Reine
 * Funktion, kein I/O.
 * @param begruendung - `entscheidung-workflow-<id>-abnahme`.daten.begruendung, real vom Menschen erfasst
 * @param vorherigeBefunde - `befunde[]` des Review-Laufs, auf den die Abnahme sich bezieht (`bezug.review_lauf_id`) — leer, wenn kein Review lief oder es keine strukturierten Befunde gab
 * @returns der Zusatzblock als Text, an `auftragstext` anzuhängen (Trennzeile bleibt Sache des Aufrufers)
 */
export function baueAusfuehrungKorrekturInstruktion(begruendung: string, vorherigeBefunde: KorrekturBefund[]): string {
  const zeilen = [
    'VORRANGIGER AUFTRAG dieser Iteration: der Mensch hat dein vorheriges Ergebnis NICHT angenommen und "Anpassung anfordern" gewählt.',
    'Begründung der Abnahme-Entscheidung:',
    begruendung,
  ]
  if (vorherigeBefunde.length > 0) {
    zeilen.push('', 'Offene Befunde des vorherigen Reviews, die diese Iteration beheben muss:')
    vorherigeBefunde.forEach((befund, index) => {
      const beleg = befund.beleg ? ` (Beleg: ${befund.beleg})` : ''
      zeilen.push(`${index + 1}. [${befund.schwere ?? '?'}] ${befund.fundstelle ?? '?'} — ${befund.zusammenfassung ?? ''}${beleg}`)
    })
  }
  zeilen.push(
    '',
    'Prüfe zuerst, ob diese konkreten Punkte im AKTUELLEN Code tatsächlich behoben sind. "Die ursprüngliche Anforderung ist bereits erfüllt" ist KEINE ausreichende Antwort auf diesen Korrekturauftrag, solange auch nur einer der obigen Punkte offen bleibt.'
  )
  return zeilen.join('\n')
}

/**
 * Baut den Zusatzblock, der an den Auftragstext eines 'code-reviewer'-Schritts angehängt wird,
 * wenn die aktuelle Iteration auf eine Abnahme-Entscheidung 'ANPASSUNG_ANGEFORDERT' folgt und das
 * referenzierte vorherige Review strukturierte Befunde trug. Reine Funktion, kein I/O.
 * @param vorherigeBefunde - `befunde[]` des Review-Laufs, auf den die Abnahme sich bezieht — der Aufrufer ruft diese Funktion nur bei einem nicht-leeren Array auf (kein Zusatzblock ohne Befunde)
 * @returns der Zusatzblock als Text, an `auftragstext` anzuhängen
 */
export function baueReviewKorrekturInstruktion(vorherigeBefunde: KorrekturBefund[]): string {
  const zeilen = ['Diese Iteration folgt auf "Anpassung anfordern". Das vorherige Review meldete die folgenden Befunde:']
  vorherigeBefunde.forEach((befund, index) => {
    zeilen.push(`${index + 1}. [${befund.schwere ?? '?'}] ${befund.fundstelle ?? '?'} — ${befund.zusammenfassung ?? ''}`)
  })
  zeilen.push(
    '',
    'Bewerte JEDEN dieser Punkte einzeln und explizit als "behoben" oder "offen" (mit Begründung) — nicht nur den neuen Diff allgemein.',
    'Ist auch nur EINER dieser Punkte noch offen, darf dein urteil NICHT "BEREIT" sein ("BEREIT_NACH_KORREKTUR" oder "BLOCKIERT", je nach Schwere).'
  )
  return zeilen.join('\n')
}

const SELBSTBLOCKADE_ZEILE = /^-\s*\[[xX]\]\s*Blockiert\b/m

/**
 * Liest, ob ein 'ausfuehrung'-Ergebnistext sich selbst über den CLAUDE.md-Status-Block als
 * 'Blockiert' markiert — Muster leseUrteilAusAdvisorText (src/architecture-advisor/index.ts),
 * hier aber auf einer Checkbox-Zeile statt einer 'Urteil: ...'-Zeile, weil 'ausfuehrung' (anders
 * als 'architecture-advisor') keine eigene Rolleninstruktion mit eigenem Urteilsvertrag bekommt,
 * sondern dem allgemeinen CLAUDE.md-Status-Format folgt ("## Status\n- [ ] Freigegeben\n- [ ]
 * Freigegeben mit Hinweisen\n- [ ] Nicht freigegeben\n- [ ] Blockiert"). Real beobachtet (Lauf
 * e1c59219-615f-4f20-8737-8b9a99b4ff5c): "- [x] Blockiert — keine neue Änderung nötig, ...".
 * @param text - der geparste Ergebnistext des Laufs (letzte agent_message/result), oder null
 * @returns true, wenn eine angekreuzte 'Blockiert'-Zeile gefunden wurde — KEINE Aussage über die inhaltliche Richtigkeit, nur über das erkennbare Signal
 */
export function leseSelbstblockadeAusAusfuehrungstext(text: string | null): boolean {
  if (text === null) return false
  return SELBSTBLOCKADE_ZEILE.test(text)
}
