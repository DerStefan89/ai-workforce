/**
 * Datei: src/qa/index.ts
 *
 * Zweck: qa-Modul (F45 B2b-2b, F-820, features/F45/plan-b2b2b.md). Der qa-Schritt prüft nach dem Review das Ergebnis aus
 * Nutzersicht (Akzeptanztests, Randfälle, Leerzustände) und antwortet als JSON nach schemas/ergebnis-qa.schema.json.
 * baueQaAuftragstext baut den Auftragstext (Rolleninstruktion mit dem JSON-Vertrag, Muster
 * baueArchitectureAdvisorAuftragstext); validiereErgebnisQa prüft beim Lesen, was der Kern verbraucht (Regel 1q in
 * src/workflow/index.ts hält bei einem Verstoß, Ausweg „Prüfer wiederholen“). An claude-code setzt die CLI das Schema per
 * '--json-schema' durch (Spike features/F45/nachweise/b2b2b/spike-qa-schema.md) — der Validator ist die zweite Linie.
 * Den Rohstrom liest der Server (leseQaErgebnisAusLaufakte, scripts/leitstand-server.mjs); dieses Modul kennt keine Laufakten.
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs, scripts/check-f45-b2b2-pruefer.mjs,
 * features/F45/nachweise/b2b2b/spike-qa-schema.mjs, src/qa/qa.test.ts.
 */

import type { AuftragAkzeptanzkriterium } from '../auftrag/types.ts'

/** Wertemenge von 'urteil' — dieselbe wie beim Review (schemas/ergebnis-code-reviewer.schema.json). */
export const QA_URTEILE = ['BEREIT', 'BEREIT_NACH_KORREKTUR', 'BLOCKIERT'] as const

/** Wertemenge von 'testfaelle[].ergebnis'. */
export const QA_TESTFALL_ERGEBNISSE = ['bestanden', 'durchgefallen', 'nicht_pruefbar'] as const

const SCHWEREN = ['KRITISCH', 'HOCH', 'MITTEL', 'NIEDRIG']

/** Befund-Textfelder, die der Kern weiterreicht (Neubau, Abnahme) — Pflicht beim Lesen. */
const BEFUND_TEXTFELDER = ['fundstelle', 'zusammenfassung', 'beleg']


/**
 * Baut den Auftragstext für einen qa-Lauf: Rolleninstruktion mit dem JSON-Vertrag, die Akzeptanzkriterien und
 * Nicht-Ziele des Auftrags (falls vorhanden) und danach der ursprüngliche Auftrag. Änderungsübersicht, Prüfergebnis und
 * das Review-Ergebnis stehen als eigene Eingaben im Kontext (loeseSchrittEingabenAuf). Reine Funktion, kein I/O.
 * @param auftragstext - der ursprüngliche Auftragstext
 * @param akzeptanzkriterien - Akzeptanzkriterien des Auftrags (leer, wenn keine)
 * @param nichtZiele - Nicht-Ziele des Auftrags (leer, wenn keine)
 * @returns der vollständige Auftragstext
 */
export function baueQaAuftragstext(auftragstext: string, akzeptanzkriterien: readonly AuftragAkzeptanzkriterium[], nichtZiele: readonly string[]): string {
  const zeilen = [
    "Du bist als Rolle 'qa' verantwortlich, das Ergebnis eines Baus NACH dem Review aus Sicht echter Nutzer zu prüfen — Akzeptanztests, Randfälle, Leerzustände, Fehlerzustände.",
    'Du hast ausschließlich lesende Werkzeuge (Glob/Grep/Read). Das ist Absicht: du änderst nichts, du prüfst. Spiele jeden Testfall am Code nach (Aufrufweg, Eingaben, Verzweigungen) und belege das Ergebnis mit Datei und Zeile.',
    'Als Eingaben liegen bei: die Änderungsübersicht und das Prüfergebnis des Baus und das Ergebnis des Reviews. Wiederhole keine Review-Befunde; prüfe, was der Review aus Nutzersicht nicht abdeckt.',
    "Deine Antwort ist genau ein JSON-Objekt nach dem Schema 'ergebnis-qa' (keine Prosa davor oder danach):",
    `- 'urteil': ${QA_URTEILE.join(' / ')}. BEREIT nur, wenn kein Testfall durchgefallen ist und kein Befund HOCH oder KRITISCH offen bleibt; BLOCKIERT, wenn ein Nutzer das Ergebnis so nicht verwenden kann — dann mit mindestens einem Befund.`,
    "- 'befunde': je Befund 'id' (Q1, Q2, …), 'schwere' (KRITISCH/HOCH/MITTEL/NIEDRIG), 'evidenz' (confirmed belegt / likely plausibel / needs-validation offen), 'fundstelle' (Datei und Zeile), 'zusammenfassung', 'korrekturrichtung' (minimal-invasive Korrektur), 'beleg' (zitierte Stelle oder durchgespielter Testfall).",
    "- 'testfaelle': die geprüften Akzeptanztests und Randfälle, je 'name', 'schritte' (mindestens einer), 'erwartet' und 'ergebnis' (bestanden / durchgefallen / nicht_pruefbar). Mindestens ein Testfall; decke Default, Leerzustand und Fehlerfall ab. 'nicht_pruefbar' nur mit dem Grund in 'erwartet'. Ein durchgefallener Testfall gehört zusätzlich als Befund in 'befunde'.",
    "- 'empfehlung': die empfohlene nächste Handlung.",
  ]
  if (akzeptanzkriterien.length > 0) {
    zeilen.push('', 'Akzeptanzkriterien des Auftrags — jedes braucht mindestens einen Testfall (Name beginnt mit der AK-ID):', ...akzeptanzkriterien.map((ak) => `- ${ak.id}: ${ak.text}`))
  }
  if (nichtZiele.length > 0) {
    zeilen.push('', 'Nicht-Ziele des Auftrags — eine Änderung, die eines davon berührt, ist ein Befund mit schwere HOCH:', ...nichtZiele.map((z) => `- ${z}`))
  }
  zeilen.push('', 'Auftrag:', auftragstext)
  return zeilen.join('\n')
}

/**
 * Prüft, ob ein Wert ein nicht-leerer Text ist (nach trim).
 * @param wert - beliebiger Wert
 * @returns true bei nicht-leerem String
 */
function istText(wert: unknown): wert is string {
  return typeof wert === 'string' && wert.trim() !== ''
}

/**
 * Prüft ein geparstes qa-Ergebnis auf das, was der Kern verbraucht (Muster validiereErgebnisAdvisor): Objekt, 'urteil'
 * aus QA_URTEILE, 'befunde' als Array mit Schwere und Textfeldern, 'id' eindeutig, 'testfaelle' als nicht leeres Array mit
 * name/erwartet, mindestens einem Schritt und 'ergebnis' aus der Wertemenge; Konsistenz: BLOCKIERT braucht mindestens
 * einen Befund (sonst hätte der Neubau keinen Inhalt). evidenz/korrekturrichtung/empfehlung erzwingt die CLI per Schema;
 * fehlen sie, hält der Kern nicht an. Reine Funktion, wirft nie.
 * @param geparst - das aus dem Ergebnistext geparste JSON (beliebiger Wert)
 * @returns Liste lesbarer Verstöße; leer = gültig
 */
export function validiereErgebnisQa(geparst: unknown): string[] {
  if (typeof geparst !== 'object' || geparst === null || Array.isArray(geparst)) return ['Ergebnis ist kein JSON-Objekt']
  const ergebnis = geparst as Record<string, unknown>
  const verstoesse: string[] = []
  const urteil = ergebnis.urteil
  if (typeof urteil !== 'string' || !(QA_URTEILE as readonly string[]).includes(urteil)) {
    verstoesse.push(`'urteil' muss einer von ${QA_URTEILE.join(', ')} sein, erhalten ${JSON.stringify(urteil ?? null)}`)
  }
  if (!Array.isArray(ergebnis.befunde)) {
    verstoesse.push("'befunde' muss ein Array sein")
  } else {
    const ids = new Set<string>()
    for (const [i, roh] of ergebnis.befunde.entries()) {
      if (typeof roh !== 'object' || roh === null || Array.isArray(roh)) {
        verstoesse.push(`'befunde[${i}]' ist kein Objekt`)
        continue
      }
      const befund = roh as Record<string, unknown>
      for (const feld of BEFUND_TEXTFELDER) if (!istText(befund[feld])) verstoesse.push(`'befunde[${i}].${feld}' fehlt oder ist leer`)
      if (typeof befund.schwere !== 'string' || !SCHWEREN.includes(befund.schwere)) verstoesse.push(`'befunde[${i}].schwere' muss einer von ${SCHWEREN.join(', ')} sein`)
      if (istText(befund.id)) {
        if (ids.has(befund.id)) verstoesse.push(`'befunde[${i}].id' '${befund.id}' ist doppelt`)
        ids.add(befund.id)
      }
    }
    if (urteil === 'BLOCKIERT' && ergebnis.befunde.length === 0) verstoesse.push('Urteil BLOCKIERT ohne Befund — es braucht mindestens einen Befund')
  }
  if (!Array.isArray(ergebnis.testfaelle)) {
    verstoesse.push("'testfaelle' muss ein Array sein")
  } else {
    if (ergebnis.testfaelle.length === 0) verstoesse.push("'testfaelle' ist leer — mindestens ein geprüfter Testfall")
    for (const [i, roh] of ergebnis.testfaelle.entries()) {
      if (typeof roh !== 'object' || roh === null || Array.isArray(roh)) {
        verstoesse.push(`'testfaelle[${i}]' ist kein Objekt`)
        continue
      }
      const fall = roh as Record<string, unknown>
      if (!istText(fall.name)) verstoesse.push(`'testfaelle[${i}].name' fehlt oder ist leer`)
      if (!istText(fall.erwartet)) verstoesse.push(`'testfaelle[${i}].erwartet' fehlt oder ist leer`)
      if (!Array.isArray(fall.schritte) || fall.schritte.length === 0 || !fall.schritte.every(istText)) verstoesse.push(`'testfaelle[${i}].schritte' braucht mindestens einen nicht leeren Schritt`)
      if (typeof fall.ergebnis !== 'string' || !(QA_TESTFALL_ERGEBNISSE as readonly string[]).includes(fall.ergebnis)) {
        verstoesse.push(`'testfaelle[${i}].ergebnis' muss einer von ${QA_TESTFALL_ERGEBNISSE.join(', ')} sein`)
      }
    }
  }
  return verstoesse
}
