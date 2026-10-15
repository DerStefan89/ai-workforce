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
 * den Workflow dann an, statt automatisch fortzusetzen (Muster Regel 1d, früher leseUrteilAusAdvisorText in
 * src/architecture-advisor/index.ts).
 *
 * findeRueckfrageZeile/erkenneRueckfrage (F-689) ergänzen das feste Signal um eine Heuristik: ein
 * Lauf OHNE jede Dateiänderung, der am Textende eine Frage an den Menschen stellt, hält ebenfalls
 * über Regel 1e an — real beobachtet in Lauf 40045f94-6692-44a8-9514-766c5c5f295e, der ohne
 * '- [x] Blockiert' mit "Frage an dich: Wie soll ich vorgehen?" endete.
 *
 * F45 B2b-2a (F-1085 (3)): je Befund zusätzlich Befund-ID, Evidenz und Korrekturrichtung (baueBefundZusatzzeilen) — für
 * den Neubau und den Re-Review; die Begründung der Automatik (f35-ws3-adjust-automatik.mjs) bleibt bewusst ohne sie
 * (Entscheidung Stefan A1 = a, features/F45/plan-b2b2a.md: sonst stünden sie im Neubau zweimal).
 *
 * F45 B2b-2b-1 (F-820, features/F45/plan-b2b2b.md): Review und qa-Schritt lösen zusammen eine Korrekturrunde aus — der
 * Neubau bekommt die Befunde beider Prüfer je Herkunft in eigenen Abschnitten (qaBefunde), der qa der neuen Runde seine
 * Vorbefunde (herkunft 'qa'). Ohne qa-Befunde bleiben beide Texte bitgleich (Golden-Tests).
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs, src/korrekturschleife/korrekturschleife.test.ts.
 */

/**
 * Form eines einzelnen Befunds aus schemas/ergebnis-code-reviewer.schema.json — nur die Felder, die hier zitiert werden.
 * F45 B2b-2a (F-1085 (3)): dazu die v2-Felder id/evidenz/korrekturrichtung (nullable im Schema; ein v1-Befund hat sie nicht).
 */
export interface KorrekturBefund {
  schwere?: string
  fundstelle?: string
  zusammenfassung?: string
  beleg?: string
  id?: string | null
  evidenz?: string | null
  korrekturrichtung?: string | null
}

/**
 * Nicht-leerer String oder null — die Befunde kommen roh aus dem Modell, der TS-Typ schützt zur Laufzeit nicht.
 * Zeilenumbrüche werden zu einem Leerzeichen (qa 4): eine mehrzeilige Korrekturrichtung („1. X“ und darunter „2. Y“)
 * sähe in der nummerierten Befundliste sonst wie ein eigener Befund aus.
 */
function textOderNull(wert: unknown): string | null {
  return typeof wert === 'string' && wert.trim() !== '' ? wert.trim().replace(/\s*\r?\n\s*/g, ' ') : null
}

/**
 * F45 B2b-2a (F-1085 (3), Codex-Review-Spec §10 „an Claude übergeben und gezielt nachgeprüft“): die Zeilen unter einer
 * Befundzeile mit Befund-ID, Evidenz und Korrekturrichtung — nur die vorhandenen, nicht-leeren Werte. Ohne diese Felder
 * (Befund v1, null, leer) [] — der Text der Instruktionen bleibt dann bitgleich wie vor B2b-2a. Reine Funktion.
 * @param befund - ein Befund des Reviews (roh)
 * @returns eingerückte Zusatzzeilen, ggf. leer
 */
export function baueBefundZusatzzeilen(befund: KorrekturBefund): string[] {
  if (befund === null || typeof befund !== 'object') return []
  const id = textOderNull(befund.id)
  const evidenz = textOderNull(befund.evidenz)
  const korrekturrichtung = textOderNull(befund.korrekturrichtung)
  const zeilen: string[] = []
  const kopf = [id === null ? null : `Befund-ID: ${id}`, evidenz === null ? null : `Evidenz: ${evidenz}`].filter((teil) => teil !== null)
  if (kopf.length > 0) zeilen.push(`   ${kopf.join(' · ')}`)
  if (korrekturrichtung !== null) zeilen.push(`   Korrekturrichtung: ${korrekturrichtung}`)
  return zeilen
}

/**
 * Baut den Zusatzblock, der an den Auftragstext eines 'ausfuehrung'-Schritts angehängt wird, wenn
 * die aktuelle Iteration auf eine Abnahme-Entscheidung 'ANPASSUNG_ANGEFORDERT' folgt. Reine
 * Funktion, kein I/O.
 * @param begruendung - `entscheidung-workflow-<id>-abnahme`.daten.begruendung, real vom Menschen erfasst
 * @param vorherigeBefunde - `befunde[]` des Review-Laufs, auf den die Abnahme sich bezieht (`bezug.review_lauf_id`) — leer, wenn kein Review lief oder es keine strukturierten Befunde gab
 * @param qaBefunde - F45 B2b-2b-1 (F-820): `befunde[]` des qa-Laufs derselben Runde (`bezug.qa_lauf_id`) — eigener Abschnitt mit
 *   Herkunft hinter den Review-Befunden; leer (Vorgabe) ⇒ Text bitgleich wie zuvor
 * @returns der Zusatzblock als Text, an `auftragstext` anzuhängen (Trennzeile bleibt Sache des Aufrufers)
 */
export function baueAusfuehrungKorrekturInstruktion(begruendung: string, vorherigeBefunde: KorrekturBefund[], qaBefunde: KorrekturBefund[] = []): string {
  const zeilen = [
    'VORRANGIGER AUFTRAG dieser Iteration: der Mensch hat dein vorheriges Ergebnis NICHT angenommen und "Anpassung anfordern" gewählt.',
    'Begründung der Abnahme-Entscheidung:',
    begruendung,
  ]
  const abschnitt = (titel: string, befunde: KorrekturBefund[]) => {
    if (befunde.length === 0) return
    zeilen.push('', titel)
    befunde.forEach((befund, index) => {
      const beleg = befund.beleg ? ` (Beleg: ${befund.beleg})` : ''
      zeilen.push(`${index + 1}. [${befund.schwere ?? '?'}] ${befund.fundstelle ?? '?'} — ${befund.zusammenfassung ?? ''}${beleg}`, ...baueBefundZusatzzeilen(befund))
    })
  }
  abschnitt('Offene Befunde des vorherigen Reviews, die diese Iteration beheben muss:', vorherigeBefunde)
  abschnitt('Offene Befunde der vorherigen Prüfung aus Nutzersicht (qa), die diese Iteration beheben muss:', qaBefunde)
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
 *
 * F-659 (löst "Review meldet eine vom Menschen bereits bewusst entschiedene Frage fälschlich als
 * offen" — real beobachtet, F39-Versuch-4-Bau von F-518, 24.09.2026, Belege
 * kontrollzustand/lineage-entscheidung-workflow-router-9d5fedcb-dead-417f-a61f-c374a167ba73-abnahme/
 * Version 1/2): bekam bislang nur `vorherigeBefunde`, nicht die Abnahme-Begründung selbst — anders
 * als `baueAusfuehrungKorrekturInstruktion` direkt oberhalb, die `begruendung` bereits erhält.
 * @param begruendung - `entscheidung-workflow-<id>-abnahme`.daten.begruendung, real vom Menschen erfasst — dieselbe Quelle wie bei `baueAusfuehrungKorrekturInstruktion`, kein zweiter Lesepfad
 * @param vorherigeBefunde - `befunde[]` des Review-Laufs, auf den die Abnahme sich bezieht — der Aufrufer ruft diese Funktion nur bei einem nicht-leeren Array auf (kein Zusatzblock ohne Befunde)
 * @param herkunft - F45 B2b-2b-1 (F-820): 'review' (Vorgabe, Text bitgleich) oder 'qa' — derselbe Block für den qa-Lauf der
 *   neuen Runde mit seinen eigenen Vorbefunden (`bezug.qa_lauf_id`), nur die Herkunftszeile unterscheidet sich
 * @returns der Zusatzblock als Text, an `auftragstext` anzuhängen
 */
export function baueReviewKorrekturInstruktion(begruendung: string, vorherigeBefunde: KorrekturBefund[], herkunft: 'review' | 'qa' = 'review'): string {
  const zeilen = [
    'Diese Iteration folgt auf "Anpassung anfordern".',
    'Verbindliche Klarstellung des Auftrags durch den Menschen (Abnahme-Begründung). Sie hat Vorrang vor dem ursprünglichen Auftragstext. Bewusste Entscheidungen darin sind KEIN offener Befund:',
    begruendung,
    '',
    herkunft === 'qa' ? 'Die vorherige Prüfung aus Nutzersicht (qa) meldete zusätzlich die folgenden Befunde:' : 'Das vorherige Review meldete zusätzlich die folgenden Befunde:',
  ]
  vorherigeBefunde.forEach((befund, index) => {
    zeilen.push(`${index + 1}. [${befund.schwere ?? '?'}] ${befund.fundstelle ?? '?'} — ${befund.zusammenfassung ?? ''}`, ...baueBefundZusatzzeilen(befund))
  })
  zeilen.push(
    '',
    'Bewerte JEDEN dieser Punkte einzeln und explizit als "behoben" oder "offen" (mit Begründung) — nicht nur den neuen Diff allgemein. Ein Punkt, den die Abnahme-Begründung oben ausdrücklich als bewusste Entscheidung festhält, ist "behoben", nicht "offen".',
    'Ist auch nur EINER der verbleibenden Punkte noch offen, darf dein urteil NICHT "BEREIT" sein ("BEREIT_NACH_KORREKTUR" oder "BLOCKIERT", je nach Schwere).'
  )
  return zeilen.join('\n')
}

const SELBSTBLOCKADE_ZEILE = /^-\s*\[[xX]\]\s*Blockiert\b/m

/**
 * Liest, ob ein 'ausfuehrung'-Ergebnistext sich selbst über den CLAUDE.md-Status-Block als
 * 'Blockiert' markiert — Muster der früheren Urteilszeile des Advisors (bis F45 B2b-1b),
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

/** Wie viele nicht-leere Zeilen vom Textende her die Rückfrage-Heuristik (F-689) betrachtet — eine Rückfrage steht am Ende einer Antwort, nicht in einem zitierten Auftragsteil davor. */
const RUECKFRAGE_FENSTER_ZEILEN = 20

/** Muster einer erkennbaren Frage an den Menschen (F-689), Groß-/Kleinschreibung egal. Real beobachtet: "Frage an dich: Wie soll ich vorgehen?" (Lauf 40045f94-6692-44a8-9514-766c5c5f295e). */
// '\bfrage an' statt 'frage an': "Anfrage an die API" ist keine Frage an den Menschen. Bekannte
// Grenze: "keine Rückfrage" oder ein Echo des Rückfrage-Hinweises treffen trotzdem — bei einem Lauf
// OHNE Dateiänderung ist das ein unnötiger Halt, also die sichere Richtung.
const RUECKFRAGE_MUSTER = [/\bfrage an/i, /rückfrage/i, /wie soll ich/i]

/** Markdown-Hervorhebungen am Zeilenende ("**Wie soll ich vorgehen?**"), die das Fragezeichen sonst verdecken. */
const MARKDOWN_ENDE = /[*_`\s]+$/

/**
 * Sucht die LETZTE erkennbare Rückfrage an den Menschen in den letzten RUECKFRAGE_FENSTER_ZEILEN
 * nicht-leeren Zeilen eines 'ausfuehrung'-Ergebnistexts (F-689). Greift NUR, wenn der Lauf keine
 * einzige Datei geändert hat: ein Lauf mit Änderungen und einem beiläufigen "?" im Text hat
 * gearbeitet und hält nicht an (AK1). Reine Funktion, kein I/O — der Aufrufer liefert die
 * Dateianzahl aus der Änderungsübersicht des Laufs (ohne die Ausnahme-Pfade der Startprüfung, z. B.
 * kontrollzustand/) und ruft die Funktion NICHT auf, wenn diese fehlt (kein Halt aus Unwissen).
 * Die letzte statt der ersten Trefferzeile: die Schlussfrage ist die, auf die der Mensch antworten soll.
 * @param ergebnistext - der geparste Ergebnistext des Laufs, oder null
 * @param geaenderteDateienAnzahl - Anzahl der Dateien in der Änderungsübersicht des Laufs
 * @returns die erkannte Fragezeile (getrimmt), oder null, wenn keine Rückfrage erkannt wurde
 */
export function findeRueckfrageZeile(ergebnistext: string | null, geaenderteDateienAnzahl: number): string | null {
  if (ergebnistext === null || geaenderteDateienAnzahl !== 0) return null
  const zeilen = ergebnistext
    .split(/\r?\n/)
    .map((zeile) => zeile.trim())
    .filter((zeile) => zeile.length > 0)
    .slice(-RUECKFRAGE_FENSTER_ZEILEN)
  return zeilen.findLast((zeile) => zeile.replace(MARKDOWN_ENDE, '').endsWith('?') || RUECKFRAGE_MUSTER.some((muster) => muster.test(zeile))) ?? null
}

/**
 * Liefert, ob ein 'ausfuehrung'-Ergebnis eine Rückfrage an den Menschen ist (F-689) — dieselbe
 * Heuristik wie findeRueckfrageZeile, nur als Wahrheitswert.
 * @param ergebnistext - der geparste Ergebnistext des Laufs, oder null
 * @param geaenderteDateienAnzahl - Anzahl der Dateien in der Änderungsübersicht des Laufs
 * @returns true, wenn ohne Dateiänderung eine erkennbare Frage am Textende steht
 */
export function erkenneRueckfrage(ergebnistext: string | null, geaenderteDateienAnzahl: number): boolean {
  return findeRueckfrageZeile(ergebnistext, geaenderteDateienAnzahl) !== null
}
