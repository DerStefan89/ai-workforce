/**
 * Datei: src/harness-abgleich/types.ts
 *
 * Zweck: Typen des Harness-Abgleichs (F45 B1b-2, Beleg 12 in docs/projekt/fixpaket-f45.md): Inventar des
 * Projekt-Harness (DoD-Punkte aus CLAUDE.md, Hooks aus .claude/settings.json, Agents, Skills, Commands), die
 * versionierte Zuordnung (harness-abgleich/standard.json, Schema schemas/harness-zuordnung.schema.json) und das
 * Ergebnis je Workflow, Kern-Artefakt 'harness-abgleich-<workflowId>' (Payload
 * schemas/kontrollzustand-harness-abgleich-payload.schema.json).
 *
 * Wird aufgerufen von: src/harness-abgleich/index.ts, scripts/leitstand-server.mjs (über die Funktionen).
 *
 * Wichtig: Formate additiv — ein neues Feld ist optional, ein neuer Statuswert braucht Schema, Validator und
 * Anzeige (public/leitstand/harness-abgleich-anzeige.js) zugleich.
 */

/** Arten eines Harness-Eintrags, die eine Zuordnung tragen können. */
export type HarnessArt = 'hook' | 'agent' | 'skill' | 'command' | 'dod'

/** Inventar-Arten: die Harness-Arten und 'quelle' (eine Quelle fehlt oder ist nicht lesbar — immer offen). */
export type InventarArt = HarnessArt | 'quelle'

/** Ein Eintrag des Inventars. */
export interface InventarEintrag {
  art: InventarArt
  /** Schlüssel zusammen mit art: Hook = Skriptname ohne Endung, Agent/Command = Dateiname ohne .md, Skill = Ordnername, DoD = 'dod-<8 Hex>', quelle = Pfad. */
  name: string
  /** Repo-relativer Pfad der Datei, aus der der Eintrag stammt ('/' als Trenner). */
  quelle: string
  /** DoD: normalisierter Text; sonst null (der Hook-Befehl wird bewusst nicht übernommen — er könnte Geheimnisse tragen). */
  detail: string | null
  /** Hook: Ereignis (PreToolUse, SessionStart …), sonst null. */
  ereignis: string | null
  /** Hook: Matcher oder null (Ereignis ohne Matcher). */
  matcher: string | null
  /** Hook: SHA-256 der Skriptdatei (Bytes), null ohne erkennbares oder lesbares Skript. */
  skript_sha256: string | null
  /** art 'quelle': warum die Quelle nicht gelesen werden konnte. */
  grund: string | null
}

/** Status, den die Zuordnung vergibt. */
export type ZuordnungStatus = 'wirksam' | 'ersetzt_durch' | 'bewusst_nicht'

/**
 * Woher der Beleg eines wirksamen Eintrags kommt: 'statisch' (Nachweis außerhalb des Laufs) oder 'pruefschritt'
 * (Prüfergebnis GRÜN des Ausführungslaufs). Belege aus Schritten und Aufrufen kommen mit WS F (Plan v2, A5).
 */
export type BelegArt = 'statisch' | 'pruefschritt'

/** Beleg-Vorgabe eines wirksamen Zuordnungseintrags. */
export interface ZuordnungBeleg {
  art: BelegArt
  /** statisch: Pfad des Nachweises relativ zur Installation von ai-workforce. */
  quelle?: string
  /** statisch bei Hooks (Pflicht): SHA-256 der Hook-Datei, mit der der Nachweis entstand. */
  skript_sha256?: string
  /** statisch bei Hooks (Pflicht): Matcher, unter dem der Nachweis entstand; null für Ereignisse ohne Matcher (UserPromptSubmit). */
  matcher?: string | null
}

/** Ersatz eines Eintrags durch einen Workflow-Schritt. */
export interface ZuordnungSchritt {
  rolle: string
}

/** Ein Eintrag der Zuordnungsdatei. */
export interface ZuordnungEintrag {
  art: HarnessArt
  name: string
  status: ZuordnungStatus
  beleg?: ZuordnungBeleg
  schritt?: ZuordnungSchritt
  /** ersetzt_durch: steht der Schritt nicht im Ablauf (z. B. Fast-Lane ohne Review), ist der Eintrag bewusst_nicht mit dieser Begründung — sonst offen. */
  fehlt_im_ablauf?: { begruendung: string }
  begruendung?: string
  /** DoD: Lesehilfe (Wortlaut zum Hash); nicht Teil des Schlüssels. */
  text?: string
}

/** Die Zuordnungsdatei (harness-abgleich/standard.json oder eine Projektdatei). */
export interface HarnessZuordnungV0 {
  harness_zuordnung_schema: 'v0'
  eintraege: ZuordnungEintrag[]
}

/** Geladene, zusammengeführte Zuordnung. */
export interface GeladeneZuordnung {
  /** Schlüssel 'art:name' → Eintrag (Projektdatei überschreibt Standard). */
  eintraege: Map<string, ZuordnungEintrag>
  /** Gelesene Dateien mit SHA-256 ihres Inhalts (Herkunft im Ergebnis). */
  quellen: { pfad: string; sha256: string }[]
  /** Gesetzt, wenn eine Datei fehlt, kein JSON ist oder gegen das Schema verstößt — dann ist jeder Eintrag offen. */
  fehler: string | null
}

/** Status einer Zeile des Ergebnisses. */
export type AbgleichStatus = 'wirksam' | 'wirksam_ohne_beleg' | 'ersetzt_durch' | 'bewusst_nicht' | 'offen'

/** Warum eine Zeile offen ist. */
export type OffenGrund = 'nicht_in_zuordnung' | 'quelle_fehlerhaft' | 'zuordnung_fehlerhaft' | 'beleg_negativ' | 'ersatz_nicht_gelaufen' | 'ersatz_fehlt' | 'im_lauf_entfernt'

/** Zitierter oder beschriebener Beleg einer wirksamen Zeile. */
export interface AbgleichBeleg {
  art: BelegArt
  /** true: Nachweis außerhalb des Laufs (statisch) — kein Laufbeleg. */
  statisch: boolean
  /** true: in diesem Lauf gefunden; false: in diesem Lauf nicht gefunden; null: ohne Laufbezug (Seite Workforce, statisch). */
  im_lauf: boolean | null
  quelle: string | null
  lauf_id: string | null
  /** pruefschritt: GRUEN/ROT/…; sonst null. */
  ergebnis: string | null
  /** statisch bei Hooks: Hash und Matcher, mit denen der Nachweis entstand; sonst null. */
  skript_sha256: string | null
  matcher: string | null
}

/** Lage des ersetzenden Schritts im Ablauf. */
export type ErsatzLage = 'gelaufen' | 'nicht_gelaufen' | 'nicht_im_ablauf'

/** Ersatz einer Zeile durch einen Schritt; lage null ohne Laufbezug. */
export interface AbgleichErsatz {
  rolle: string
  lage: ErsatzLage | null
  schritt_id: string | null
  lauf_id: string | null
}

/** Eine Zeile des Ergebnisses. */
export interface AbgleichEintrag {
  art: InventarArt
  name: string
  quelle: string
  detail: string | null
  ereignis: string | null
  matcher: string | null
  status: AbgleichStatus
  beleg: AbgleichBeleg | null
  ersatz: AbgleichErsatz | null
  begruendung: string | null
  /** Agent/Skill: Aufrufe laut Beobachtung des Ausführungslaufs; null ohne Beobachtung oder bei anderen Arten. */
  aufrufe: number | null
  offen_grund: OffenGrund | null
  /** Rohtext zum Status (Fehler der Quelle/Zuordnung, Prüfergebnis, Abweichung des Hooks vom Beleg), sonst null. */
  grund: string | null
}

/** Zählung je Status. */
export interface AbgleichZaehlung {
  wirksam: number
  wirksam_ohne_beleg: number
  ersetzt_durch: number
  bewusst_nicht: number
  offen: number
}

/** Ein Name mit Anzahl (Kurzliste). */
export interface NameAnzahl {
  name: string
  anzahl: number
}

/** Kurzliste der benutzten Fähigkeiten des Ausführungslaufs (F-937, Teil Abnahme). */
export interface FaehigkeitenKurzliste {
  lauf_id: string
  skills: NameAnzahl[]
  subagenten: NameAnzahl[]
  /** MCP-Server (aus mcp__<server>__<werkzeug>) mit Zahl der Aufrufe. */
  mcp_server: NameAnzahl[]
  /** Anzahl angenommener Hintergrund-Aufrufe; null, wenn die Laufakte das Feld nicht trägt (vor B1b-1). */
  hintergrund: number | null
}

/** Bezug eines Ergebnisses auf einen Stand des Workflows (Artefakt passt nur zu genau diesem Stand). */
export interface AbgleichBezug {
  ausfuehrung_lauf_id: string | null
  /** Inhalts-Hash der jüngsten Version des Prüfergebnisses (eine wiederholte Prüfung ist eine neue Version), null ohne Prüfergebnis. */
  pruefergebnis_hash: string | null
}

/** Payload des Kern-Artefakts 'harness-abgleich-<workflowId>'. */
export interface HarnessAbgleichV0Daten {
  harness_abgleich_schema: 'v0'
  workflow_id: string
  /** Absoluter Ordner, dessen Harness gelesen wurde (Arbeitsordner des Ablaufs oder Projektordner). */
  wurzel: string
  zuordnung_quellen: { pfad: string; sha256: string }[]
  bezug: AbgleichBezug
  zaehlung: AbgleichZaehlung
  /** Beleg 12 (Plan v2, A2): kein Eintrag offen und keiner ohne Beleg; null ohne Laufbelege. */
  bestanden: boolean | null
  eintraege: AbgleichEintrag[]
  faehigkeiten: FaehigkeitenKurzliste | null
  /** Harness-Dateien (CLAUDE.md, .claude/**), die der Ausführungslauf laut Änderungsübersicht geändert hat; null ohne Übersicht. */
  geaenderte_harness_dateien: string[] | null
  berechnet_am: string
}

/** Minimale Sicht auf einen Workflow-Schritt (aus WORKFLOW_V0). */
export interface SchrittSicht {
  schritt_id: string
  rolle: string
  status: string
  lauf_id: string | null
}

/** Minimale Sicht auf die Laufakten-Beobachtung (BeobachtungV0, Listenfelder optional gelesen). */
export interface BeobachtungSicht {
  skill_aufrufe?: unknown
  subagent_aufrufe?: unknown
  mcp_aufrufe?: unknown
  hintergrund_aufrufe?: unknown
}

/** Laufdaten eines Workflows, aus denen Belege zitiert werden. */
export interface Laufbelege {
  schritte: SchrittSicht[]
  ausfuehrung_lauf_id: string | null
  pruefergebnis: { ergebnis: string; lauf_id: string } | null
  beobachtung: BeobachtungSicht | null
}
