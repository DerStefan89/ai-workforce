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
export type JarvisAktionTyp = 'routen' | 'oeffnen' | 'anpassen'

export interface JarvisAuftragVorschlag {
  titel: string
  text: string
}

export interface JarvisAktion {
  typ: JarvisAktionTyp
  ziel: string
}

export interface JarvisBezug {
  auftrag_id?: string | null
  workitem?: string | null
}

/**
 * F-423: 'auftrag'/'aktion'/'bezug' sind im Codex-kompatiblen Schema
 * TOP-LEVEL PFLICHTFELDER mit Typ ["object","null"], kein 'allOf'/'if'/'then'
 * mehr — 'null' und 'fehlend' sind für validiereErgebnisJarvis gleichbedeutend
 * (der claude-code-Worker lässt das Feld weiterhin weg statt es auf null zu
 * setzen), deshalb bleiben die Felder hier zusätzlich optional.
 */
export interface ErgebnisJarvis {
  art: JarvisArt
  antwort: string
  auftrag?: JarvisAuftragVorschlag | null
  aktion?: JarvisAktion | null
  bezug?: JarvisBezug | null
}
