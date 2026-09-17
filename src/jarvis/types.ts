/**
 * Datei: src/jarvis/types.ts
 *
 * Zweck: Typen für das Ergebnis der Rolle 'jarvis' (F26 WS-1). Spiegelt
 * schemas/ergebnis-jarvis.schema.json — die einzige Formbeschreibung,
 * validiereErgebnisJarvis (src/jarvis/index.ts) die einzige Prüfung dagegen
 * (D5, Muster src/scout/types.ts).
 *
 * Wird aufgerufen von: src/jarvis/index.ts.
 */

export type JarvisArt = 'antwort' | 'auftrag_vorschlag' | 'aktion'
export type JarvisAktionTyp = 'routen' | 'oeffnen'

export interface JarvisAuftragVorschlag {
  titel: string
  text: string
}

export interface JarvisAktion {
  typ: JarvisAktionTyp
  ziel: string
}

export interface JarvisBezug {
  auftrag_id?: string
  workitem?: string
}

export interface ErgebnisJarvis {
  art: JarvisArt
  antwort: string
  auftrag?: JarvisAuftragVorschlag
  aktion?: JarvisAktion
  bezug?: JarvisBezug
}
