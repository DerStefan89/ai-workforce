/**
 * Datei: src/claude-code-gateway/types.ts
 *
 * Zweck: Typen für das Claude-Code-Gateway (F6a WS1 + WS2 + WS4,
 * state/tasks/f6a-claude-code-gateway-ws1.md,
 * state/tasks/f6a-ws2-prozessstart.md,
 * state/tasks/f6a-ws4-windows-prozessstart.md). AufrufTokens ist die
 * einzige zulässige Aufrufrepräsentation (kein zusammengesetzter
 * Kommandozeilen-String, AK1). WerkzeugsatzBegrenzung bleibt wie F4
 * ausschließlich im Rang 'DEKLARIERT' (E-187).
 *
 * modell_beobachtet (LaufakteV0Daten) ist bewusst 'string | null' statt
 * 'string': das reale JSON-Feld für die Modellidentität aus der
 * Claude-Code-Laufausgabe ist durch state/tp-nachtrag.md nicht belegt
 * (Volltextsuche nach "model": kein Treffer) — WS2 rät nicht, sondern
 * lässt den Wert null (TECH_DEBT, siehe state/findings.md, Klärung mit
 * echtem Nachweislauf in WS3).
 */

import type { ProfilReferenz } from '../checkpoint-store/types.ts'

export type AufrufTokens = string[]

export interface WerkzeugsatzBegrenzung {
  modus: 'DEKLARIERT'
  erlaubte_werkzeuge: string[]
}

export interface AufrufEingaben {
  modell: string
  werkzeugsatz: WerkzeugsatzBegrenzung
}

/** Ergebnis eines einzelnen Prozessstart-Versuchs (F-057: Argv-Array, nie ein Shell-String). startfehler trägt den Code/die Meldung eines Callback-Fehlers ohne numerischen exitCode (F-071) — null bei jedem regulären Prozessende, auch bei einem nichtnullwertigen exitCode. */
export interface ProzessErgebnis {
  stdout: string
  stderr: string
  exitCode: number | null
  startfehler: { code: string | null; message: string } | null
}

/** Austauschbares Prozessstart-Primitiv (Muster wie F1Bs optionen.schreiber) — echte Implementierung in prozessstart.ts, Attrappen für Tests/Gate. startziel ist das Argv-Präfix (F6a WS4, E1/E2): [0] ist das Programm, weitere Elemente stehen vor tokens. */
export type Starter = (startziel: string[], tokens: AufrufTokens) => Promise<ProzessErgebnis>

/** Eingaben für starteGateway (WS2). tokens kommt vom Aufrufer bereits über WS1s baueAufruf konstruiert — starteGateway baut keinen zweiten Aufruf (D5). werkzeugStartziel ist Pflichtfeld (F6a WS4, E2): das Gateway rät nichts und liest nichts aus dem Arbeitsbaum, die Vertrauensfrage liegt beim Aufrufer. */
export interface GatewayEingaben {
  laufId: string
  profilReferenz: ProfilReferenz
  tokens: AufrufTokens
  werkzeugStartziel: string[]
  werkzeugVersionDeklariert: string
  berechtigungskontext: string
}

/** Payload-Form für die Laufakte (LAUFAKTE_V0, checkpoint.payload.daten.daten bei laufakte_schema === "v0"). Trägt bewusst kein ergebnis-Feld und keine Auswertung der vom Werkzeugaufruf gemeldeten Genehmigungsverweigerungen (F7-Grenze, AK12). */
export interface LaufakteV0Daten {
  laufakte_schema: 'v0'
  lauf_id: string
  werkzeug_version_deklariert: string
  berechtigungskontext: string
  arbeitsverzeichnis_pfad: string
  modell_beobachtet: string | null
  beobachtungsbasis_vollstaendig: boolean
  rohstrom_referenz: { pfad: string; inhalts_hash: string }
  erstellt_am: string
}

export type GatewayErgebnis =
  | { ok: false; grund: string }
  | { ok: true; laufakte: LaufakteV0Daten; pfad: string; versionSequenz: number }
