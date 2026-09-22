/**
 * Datei: src/product-coach/types.ts
 *
 * Zweck: Typen für das Ergebnis der Rolle 'product-coach' (F34 WS-1).
 * Spiegelt schemas/ergebnis-product-coach.schema.json — die einzige
 * Formbeschreibung, validiereErgebnisProductCoach (src/product-coach/index.ts)
 * die einzige Prüfung dagegen (D5, Muster src/jarvis/types.ts).
 *
 * Wird aufgerufen von: src/product-coach/index.ts.
 */

export type CoachArt = 'frage' | 'alternativen' | 'scope_entwurf'

export interface CoachAlternative {
  titel: string
  beschreibung: string
  abwaegung: string
}

export interface CoachScope {
  titel: string
  problem: string
  ziel: string
  in_scope: string[]
  out_of_scope: string[]
  annahmen: string[]
  offene_fragen: string[]
  erfolgskriterium: string
}

/**
 * F-423-Muster (ergebnis-jarvis): 'alternativen'/'scope' sind im
 * Codex-kompatiblen Schema TOP-LEVEL PFLICHTFELDER vom Typ ["array","null"]
 * bzw. ["object","null"] — 'null' und 'fehlend' sind für
 * validiereErgebnisProductCoach gleichbedeutend (der claude-code-Worker
 * lässt das Feld weiterhin weg statt es auf null zu setzen), deshalb
 * bleiben die Felder hier zusätzlich optional.
 */
export interface ErgebnisProductCoach {
  art: CoachArt
  antwort: string
  alternativen?: CoachAlternative[] | null
  scope?: CoachScope | null
}

/**
 * Ein Turn aus der 'sparring-<projektId>'-Kette, wie ihn
 * waehleVerlaufsfenster/baueCoachAuftragstext sehen — bereits auf Nachricht +
 * Antworttext reduziert (Muster JarvisVerlaufsEintrag, src/jarvis/types.ts).
 */
export interface CoachVerlaufsEintrag {
  nachricht: string
  antwort: string
  istZusammenfassung?: boolean
}
