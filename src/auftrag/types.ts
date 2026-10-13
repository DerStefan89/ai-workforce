/**
 * Datei: src/auftrag/types.ts
 *
 * Zweck: Typen für das Auftrag-Modul (F11 WS-1, state/plan-v1-f11-auftrag-
 * ws1.md Abschnitt 2.1, state/tasks/f11-auftrag-ws1.md). AuftragV0Daten ist
 * die Form von daten.daten — F2s registriereKernArtefakt-Parameter 'daten'
 * —, wenn auftrag_schema === "v0".
 * schemas/kontrollzustand-auftrag-payload.schema.json beschreibt dieselbe
 * Form maschinell.
 *
 * F39 WS-2a (löst state/findings.md F-633 Teil a): 'herkunft' ist additiv
 * und optional — ein Alt-Auftrag ohne das Feld bleibt gültig, kein
 * Migrationsschritt (Muster 'erstellt_am' aus E-M2-5). 'projekt_interview'
 * löst über src/router/index.ts' bestimmeEffektiveKontrolltiefe eine
 * deterministische Kontrolltiefe-Untergrenze 'hoch' aus, 'feature_akte'
 * (F35 WS-1) eine Untergrenze 'standard'; die übrigen Werte sind
 * dokumentarisch.
 *
 * F35 WS-1: 'akzeptanzkriterien'/'nicht_ziele' sind additiv und optional —
 * von scripts/leitstand/routen-f35.mjs gesetzt, wenn der Auftrag
 * deterministisch aus einer Feature-Akte (baueAuftragAusFeatureAkte,
 * src/feature-auftrag/index.ts) abgeleitet wurde. Ein Alt-Auftrag ohne
 * diese Felder bleibt gültig.
 *
 * F45 B2a-2 (Arbeitspaket; F-938, F-989, F-1071): 'bereiche', 'risiko', 'feature_ref' und 'einrichtung' sind additiv
 * und optional — das Arbeitspaket ist der Auftrag v0, kein eigener Artefakttyp. 'herkunft.art' additiv 'finding'
 * (Click-to-Work aus einem Finding). Aufträge aus Findings und Feature-Akten tragen mindestens ein AK
 * (validiereAuftragPflichtfelder).
 */

export interface Optionen {
  basisVerzeichnis?: string
  schreiber?: Schreiber
  herkunft?: AuftragHerkunft
  akzeptanzkriterien?: AuftragAkzeptanzkriterium[]
  nicht_ziele?: string[]
  bereiche?: string[]
  risiko?: AuftragRisiko
  feature_ref?: string
  einrichtung?: Einrichtungsschritt[]
  /** erstellt_am der ersten Version — eine neue Version desselben Auftrags behält ihn; ohne: jetzt */
  erstelltAm?: string
}

/** Zwilling des 'herkunft.art'-Enums in schemas/kontrollzustand-auftrag-payload.schema.json. */
export type AuftragHerkunftArt = 'projekt_interview' | 'sparring' | 'jarvis' | 'manuell' | 'feature_akte' | 'finding'

export interface AuftragHerkunft {
  art: AuftragHerkunftArt
}

/** Ein Akzeptanzkriterium eines aus einer Feature-Akte abgeleiteten Auftrags (F35 WS-1). */
export interface AuftragAkzeptanzkriterium {
  id: string
  text: string
}

/** Risiko eines Arbeitspakets (F45 B2a-2). */
export type AuftragRisiko = 'niedrig' | 'mittel' | 'hoch'

/** Ein Einrichtungsschritt für Stefan (F-1071, K31): Konto, Schlüssel, Dienst, Berechtigung — vor oder während des Baus. */
export interface Einrichtungsschritt {
  /** E1, E2, … (vom Server vergeben) */
  id: string
  schritt: string
  wann: 'vor_dem_bau' | 'waehrend_des_baus'
  status: 'offen' | 'erledigt'
}

export interface AuftragV0Daten {
  auftrag_schema: 'v0'
  auftrag_id: string
  titel: string
  auftragstext: string
  erstellt_am: string
  herkunft?: AuftragHerkunft
  akzeptanzkriterien?: AuftragAkzeptanzkriterium[]
  nicht_ziele?: string[]
  bereiche?: string[]
  risiko?: AuftragRisiko
  feature_ref?: string
  einrichtung?: Einrichtungsschritt[]
}

export type Ereignisname = 'auftrag_registriert'

export interface Ereignis {
  ereignis: Ereignisname
  zeitstempel: string
  auftrag_id?: string
  versionSequenz?: number
}

export type Schreiber = (ereignis: Ereignis) => void
