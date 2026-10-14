/**
 * Datei: src/architecture-advisor/index.ts
 *
 * Zweck: architecture-advisor-Modul (F-641). baueArchitectureAdvisorAuftragstext baut den
 * Auftragstext, der als EINZIGER Eingabekanal an den Lauf geht (F-269-Muster, wie
 * baueArchitektAuftragstext) — ohne diese Umhüllung bekommt ein 'architecture-advisor'-Schritt
 * nur den rohen Planungsauftrag, dessen eigener Abschnitt "Auftrag an den Baudurchgang" (an die
 * SPÄTERE 'ausfuehrung'-Rolle gerichtet) für den Advisor keine erkennbare eigene Aufgabe
 * beschreibt — real beobachtet (F39-WS-3b-Reallauf, Lauf 4b3ebc42-91df-422b-9dd4-b2fc02dc4151,
 * 23.09.2026): der Advisor plante SELBST die drei Dokumentations-Schreibschritte und bat um
 * Write/Edit/Bash-Zugriff, statt den Architekturentwurf zu bewerten — dieselbe Fehlerklasse wie
 * F-635 (baueArchitektAuftragstext nie am echten Schrittstart aufgerufen), hier für die
 * Prüfrolle statt die Autorrolle.
 *
 * F45 B2b-1b (features/F45/plan-b2b1b.md, F-909/F-1105): der Advisor antwortet nicht mehr in Prosa
 * mit einer 'Urteil: …'-Zeile, sondern als JSON nach schemas/ergebnis-architecture-advisor.schema.json
 * (Regeln aus dem Skill advisor-pass). An claude-code setzt die CLI das Schema per '--json-schema'
 * durch (Spike features/F45/nachweise/b2b1b/spike-f1105.md); validiereErgebnisAdvisor prüft beim
 * Lesen trotzdem, was der Kern verbraucht (Urteil, Befunde, Konsistenz) — zweite Linie für
 * Bestandsabläufe ohne Schema am Schritt und für ein Schemaverfehlen der CLI. Regel 1d
 * (src/workflow/index.ts) hält bei einem Verstoß an. Den Rohstrom liest der Server
 * (leseAdvisorErgebnisAusLaufakte, scripts/leitstand-server.mjs) — dieses Modul kennt keine Laufakten.
 *
 * F-750 (F35-Reallauf gegen haushaltsbuch2): der Advisor las docs/adr/ nicht und ließ eine
 * Empfehlung gegen das entschiedene ADR 0003 durch — baueArchitectureAdvisorAuftragstext nimmt
 * deshalb den bindenden ADR-Block (baueAdrBlock, src/architekt/index.ts) entgegen.
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs, scripts/check-fixpaket-f35-reallauf.mjs,
 * scripts/check-f45-b2b1-rueckweg.mjs, src/architecture-advisor/architecture-advisor.test.ts.
 */

import { baueAdrBlock } from '../architekt/index.ts'

/** Wertemenge von 'urteil' (Schema). FREIGEGEBEN nur ohne Befunde — Entscheidung Stefan B5 (features/F45/plan-b2b1.md). */
export const ADVISOR_URTEILE = ['FREIGEGEBEN', 'FREIGEGEBEN_MIT_AUFLAGEN', 'UEBERARBEITEN'] as const

const SCHWEREN = ['KRITISCH', 'HOCH', 'MITTEL', 'NIEDRIG']

/** Befundfelder, die der Kern weiterreicht (Plan v2 des Architekten, Freigabe-Anzeige) — Pflicht beim Lesen (B6). */
const BEFUND_TEXTFELDER = ['id', 'fundstelle', 'zusammenfassung', 'korrekturrichtung']

/**
 * Baut den Auftragstext für einen architecture-advisor-Lauf: Rolleninstruktion mit dem JSON-Vertrag,
 * gefolgt vom eigentlichen Planungstext (der zu prüfende Architektur-Entwurf steht separat als
 * 'ergebnis-@'-Eingabe im Kontext, loeseSchrittEingabenAuf — diese Funktion fügt ihn nicht
 * zusätzlich ein). Reine Funktion, kein I/O.
 * @param planungstext - der vom Menschen/Vorgängerschritt gelieferte Planungsauftrag
 * @param entschiedeneAdrs - F-750: Ergebnis von leseEntschiedeneAdrs(repoWurzel) des Zielprojekts;
 *   Default '' lässt den Text bitgenau unverändert
 * @returns der vollständige Auftragstext, der als AusfuehrungsEingaben.auftragstext den
 *   einzigen Eingabekanal für den Lauf bildet
 */
export function baueArchitectureAdvisorAuftragstext(planungstext: string, entschiedeneAdrs = ''): string {
  const zeilen = [
    "Du bist als Rolle 'architecture-advisor' verantwortlich für die Prüfung eines Architekturentwurfs VOR dem Bau — NICHT für dessen Umsetzung.",
    'Du hast ausschließlich lesende Werkzeuge (Glob/Grep/Read). Das ist Absicht, keine fehlende Berechtigung: du schreibst und planst nichts, du bewertest. Fordere keinen Schreibzugriff an.',
    "Prüfe den vorliegenden Architekturentwurf (Rolle 'architekt', Schema 'ergebnis-architektur', separat als Eingabe beigefügt) gegen ARCHITECTURE.md und den Bestand: ist der Entwurf angemessen (keine Vorratsarchitektur, CLAUDE.md Entscheidungsregel 4), technisch sinnvoll, deckt er reale Risiken und Fehlerfälle ab?",
    "Der Abschnitt 'Auftrag an den Baudurchgang' im untenstehenden Planungsauftrag ist NICHT an dich gerichtet — er beschreibt, was der SPÄTERE Ausführungsschritt schreiben wird, nicht was du selbst tun sollst.",
    "Deine Antwort ist genau ein JSON-Objekt nach dem Schema 'ergebnis-architecture-advisor' (keine Prosa davor oder danach):",
    `- 'urteil': ${ADVISOR_URTEILE.join(' / ')}. FREIGEGEBEN nur ohne Befunde; FREIGEGEBEN_MIT_AUFLAGEN (Plan trägt, braucht Korrekturen) und UEBERARBEITEN (Plan trägt so nicht) mit mindestens einem Befund — die Befunde gehen mit dem Plan in die Freigabe vor dem Bau. Ist eine Frage nur durch Stefan entscheidbar, urteile UEBERARBEITEN mit einem Befund 'Entscheidung Stefan nötig: <Frage>'.`,
    "- 'befunde': je Befund 'id' (A1, A2, …), 'schwere' (KRITISCH/HOCH/MITTEL/NIEDRIG), 'evidenz' (FAKT im Code belegt / SCHLUSSFOLGERUNG aus Fakten abgeleitet / ANNAHME unbelegte Prämisse des Plans / OFFENE_UNSICHERHEIT weder belegt noch widerlegt), 'fundstelle' (Datei und Zeile, sonst Planabschnitt — ein Befund ohne Beleg ist eine Meinung), 'zusammenfassung', 'korrekturrichtung' (was der Plan ändern soll).",
    "- 'entlastend': geprüfte und tragfähige Stellen des Plans mit 'fundstelle' und 'zusammenfassung' — bestätigte Stellen sind Prüfergebnis, nicht Höflichkeit.",
    "- 'begruendung': Begründung des Urteils, Befunde nach Schwere sortiert: was vor dem Bau zu klären ist und was mitlaufen darf.",
    "- 'grenzen_der_pruefung': deine Rollengrenze und blinden Flecken (z. B. keine Gates ausgeführt, nur gelesen).",
  ]
  zeilen.push(...baueAdrBlock(entschiedeneAdrs))
  zeilen.push('', 'Planungsauftrag:', planungstext)
  return zeilen.join('\n')
}

/**
 * Prüft ein geparstes Advisor-Ergebnis auf das, was der Kern verbraucht (B6, Muster
 * validiereErgebnisArchitektur): Objekt, 'urteil' aus ADVISOR_URTEILE, 'befunde' als Array, je Befund
 * 'schwere' aus der Wertemenge und die Textfelder id/fundstelle/zusammenfassung/korrekturrichtung nicht
 * leer, 'id' eindeutig; Konsistenz FREIGEGEBEN ⇔ keine Befunde (sonst gingen Befunde verloren bzw.
 * ein Rückweg hätte keinen Inhalt). begruendung/entlastend/grenzen_der_pruefung/evidenz erzwingt die
 * CLI per Schema; fehlen sie, hält der Kern nicht an. Reine Funktion, wirft nie.
 * @param geparst - das aus dem Ergebnistext geparste JSON (beliebiger Wert)
 * @returns Liste lesbarer Verstöße; leer = gültig
 */
export function validiereErgebnisAdvisor(geparst: unknown): string[] {
  if (typeof geparst !== 'object' || geparst === null || Array.isArray(geparst)) {
    return ['Ergebnis ist kein JSON-Objekt']
  }
  const ergebnis = geparst as Record<string, unknown>
  const verstoesse: string[] = []
  const urteil = ergebnis.urteil
  const urteilGueltig = typeof urteil === 'string' && (ADVISOR_URTEILE as readonly string[]).includes(urteil)
  if (!urteilGueltig) verstoesse.push(`'urteil' muss einer von ${ADVISOR_URTEILE.join(', ')} sein, erhalten ${JSON.stringify(urteil ?? null)}`)
  if (!Array.isArray(ergebnis.befunde)) {
    verstoesse.push("'befunde' muss ein Array sein")
    return verstoesse
  }
  const ids = new Set<string>()
  for (const [i, roh] of ergebnis.befunde.entries()) {
    if (typeof roh !== 'object' || roh === null || Array.isArray(roh)) {
      verstoesse.push(`'befunde[${i}]' ist kein Objekt`)
      continue
    }
    const befund = roh as Record<string, unknown>
    for (const feld of BEFUND_TEXTFELDER) {
      const wert = befund[feld]
      if (typeof wert !== 'string' || wert.trim() === '') verstoesse.push(`'befunde[${i}].${feld}' fehlt oder ist leer`)
    }
    if (typeof befund.schwere !== 'string' || !SCHWEREN.includes(befund.schwere)) {
      verstoesse.push(`'befunde[${i}].schwere' muss einer von ${SCHWEREN.join(', ')} sein`)
    }
    if (typeof befund.id === 'string' && befund.id.trim() !== '') {
      if (ids.has(befund.id)) verstoesse.push(`'befunde[${i}].id' '${befund.id}' ist doppelt`)
      ids.add(befund.id)
    }
  }
  if (urteil === 'FREIGEGEBEN' && ergebnis.befunde.length > 0) {
    verstoesse.push(`Urteil FREIGEGEBEN mit ${ergebnis.befunde.length} Befund(en) — FREIGEGEBEN nur ohne Befunde, sonst FREIGEGEBEN_MIT_AUFLAGEN`)
  }
  if (urteilGueltig && urteil !== 'FREIGEGEBEN' && ergebnis.befunde.length === 0) {
    verstoesse.push(`Urteil ${urteil} ohne Befund — es braucht mindestens einen Befund`)
  }
  return verstoesse
}
