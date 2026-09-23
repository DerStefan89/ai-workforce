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
 * leseUrteilAusAdvisorText liest die von der Rolleninstruktion verlangte 'Urteil: ...'-Zeile aus
 * dem Prosa-Ergebnis — Regel 1d (src/workflow/index.ts) hält den Workflow an, wenn sie fehlt,
 * statt ein Ergebnis ohne jedes Urteil als ERFOLGREICH durchzuwinken.
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs,
 * src/architecture-advisor/architecture-advisor.test.ts.
 */

const ERLAUBTE_URTEILE = ['BEREIT', 'BEREIT_NACH_KORREKTUR', 'BLOCKIERT']

/**
 * Baut den Auftragstext für einen architecture-advisor-Lauf: Rolleninstruktion, gefolgt vom
 * eigentlichen Planungstext (der bereits geprüfte Architektur-Entwurf steht separat als
 * 'ergebnis-@'-Eingabe im Kontext, loeseSchrittEingabenAuf — diese Funktion fügt ihn nicht
 * zusätzlich ein). Reine Funktion, kein I/O.
 * @param planungstext - der vom Menschen/Vorgängerschritt gelieferte Planungsauftrag
 * @returns der vollständige Auftragstext, der als AusfuehrungsEingaben.auftragstext den
 *   einzigen Eingabekanal für den Lauf bildet
 */
export function baueArchitectureAdvisorAuftragstext(planungstext: string): string {
  const zeilen = [
    "Du bist als Rolle 'architecture-advisor' verantwortlich für die Prüfung eines Architekturentwurfs VOR dem Bau — NICHT für dessen Umsetzung.",
    'Du hast ausschließlich lesende Werkzeuge (Glob/Grep/Read). Das ist Absicht, keine fehlende Berechtigung: du schreibst und planst nichts, du bewertest. Fordere keinen Schreibzugriff an.',
    "Prüfe den vorliegenden Architekturentwurf (Rolle 'architekt', Schema 'ergebnis-architektur', separat als Eingabe beigefügt) gegen ARCHITECTURE.md und den Bestand: ist der Entwurf angemessen (keine Vorratsarchitektur, CLAUDE.md Entscheidungsregel 4), technisch sinnvoll, deckt er reale Risiken und Fehlerfälle ab?",
    "Der Abschnitt 'Auftrag an den Baudurchgang' im untenstehenden Planungsauftrag ist NICHT an dich gerichtet — er beschreibt, was der SPÄTERE Ausführungsschritt schreiben wird, nicht was du selbst tun sollst.",
    `Deine Antwort ist Prosa (kein JSON), MUSS aber eine eigene Zeile enthalten, die exakt mit 'Urteil: ' beginnt, gefolgt von genau einem von ${ERLAUBTE_URTEILE.join(' / ')}. Ohne diese Zeile gilt dein Ergebnis als kein Urteil — der Workflow hält dann automatisch an, statt fortzusetzen.`,
  ]
  zeilen.push('', 'Planungsauftrag:', planungstext)
  return zeilen.join('\n')
}

/**
 * Liest die von baueArchitectureAdvisorAuftragstext verlangte 'Urteil: ...'-Zeile aus einem
 * Prosa-Ergebnistext. Nicht auf ERLAUBTE_URTEILE geprüft (das bleibt bewusst dem Menschen
 * überlassen, der den Workflow-Schritt liest — Regel 1d prüft nur, OB ein Urteil erkennbar ist,
 * nicht, ob es sinnvoll ist): ein unbekannter Urteilswert wird trotzdem als vorhanden gelesen.
 * @param text - der geparste Ergebnistext des Laufs (letzte agent_message), oder null
 * @returns den Urteilswert (getrimmt), oder null wenn keine 'Urteil: ...'-Zeile gefunden wurde
 */
export function leseUrteilAusAdvisorText(text: string | null): string | null {
  if (text === null) return null
  const treffer = /^Urteil:\s*(\S.*)$/m.exec(text)
  if (treffer === null) return null
  return treffer[1].trim()
}
