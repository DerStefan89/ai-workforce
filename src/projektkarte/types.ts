/**
 * Datei: src/projektkarte/types.ts
 *
 * Zweck: Typen der Projektkarte (F45 B2a-1, F-1064): Eingaben, die der Server je Lauf liest, und das Ergebnis
 * { text, hash, abschnitte, fehlend }, das als Text in den Auftrag und als Metadaten in die Laufakte geht.
 *
 * Wird aufgerufen von:
 * - src/projektkarte/index.ts
 * - scripts/leitstand-server.mjs (über die JS-Grenze, ohne Typprüfung)
 *
 * Wichtig:
 * Die Feldnamen von ProjektkarteMeta sind das Laufakten-Feld `projektkarte` (schemas/kontrollzustand-laufakte-payload
 * .schema.json, validiereLaufakteDaten) — eine Änderung hier ändert das Schema.
 */

/** Rollen, die eine Projektkarte bekommen. ausfuehrung bewusst nicht (Plan v1/v2 §1: Doppelung zu CLAUDE.md). */
export type KarteRolle = 'architekt' | 'architecture-advisor' | 'code-reviewer'

/** Kennungen der Kartenabschnitte — eine Liste für Typ, Validator der Laufakte und Gate (Code-Review 6; Schema-Enum ist der Zwilling). */
export const ABSCHNITT_IDS = ['vorhaben', 'bestand', 'ausfuehrungsrahmen', 'faehigkeiten', 'qualitaet'] as const

/** Kennung eines Kartenabschnitts (auch in der Laufakte). */
export type AbschnittId = (typeof ABSCHNITT_IDS)[number]

/** Eine gelesene Textdatei des Projekts (repo-relativer Pfad, Inhalt). */
export interface KarteDatei {
  pfad: string
  text: string
}

/** Ausführungsrahmen aus Startvorlage und Werkzeugsatz des Ausführungsschritts. */
export interface KarteRahmen {
  /** erlaubte_werkzeuge des Werkzeugsatzes, inkl. 'Bash(...)'-Regeln */
  werkzeuge: string[]
  /** vorlage.bashZeitgrenzeMs, sonst null */
  bashZeitgrenzeMs: number | null
  /** vorlage.pruefbefehl als Argv, sonst null */
  pruefbefehl: string[] | null
  /** true, wenn der Ablauf einen eigenen Arbeitsordner (Worktree) hat */
  arbeitsordner: boolean
}

/** Eine im Projekt eingeschaltete Fähigkeit (Seite Workforce, Feld aktiv). */
export interface KarteFaehigkeit {
  typ: string
  name: string
  quelle: 'katalog' | 'projekt'
}

/** Alles, was der Server für eine Karte liest. null = nicht verfügbar (die Lücke steht dann in fehlend). */
export interface ProjektkarteEingaben {
  projektbeschreibung: KarteDatei | null
  auftrag: {
    titel: string
    ziel: string | null
    akzeptanzkriterien: { id: string; text: string }[]
    nicht_ziele: string[]
    /** F45 B2a-2: true, wenn der Auftrag denselben Inhalt als Arbeitspaket-Block trägt (dann verweist die Karte des Architekten darauf); fehlt = false */
    arbeitspaket?: boolean
    /** F45 B2a-2 (F-989): Feature-Bezug des Auftrags (Feature-ID) oder null; fehlt = null */
    feature_ref?: string | null
  }
  architektur: KarteDatei | null
  /** Ergebnis von leseEntschiedeneAdrs ('' = keine entschiedenen ADRs) */
  adrs: string
  /** versionierte Dateien (git ls-files), null = git nicht lesbar */
  dateien: string[] | null
  rahmen: KarteRahmen | null
  faehigkeiten: KarteFaehigkeit[] | null
  /** DoD-Punkte aus CLAUDE.md, null = nicht lesbar */
  dod: string[] | null
  reviewCheckliste: KarteDatei | null
  /**
   * F45 B2a-2 (QA L3, F-1082 (7)): nur Code-Reviewer — CLAUDE.md (DoD) und ARCHITECTURE.md kommen aus dem Stand vor dem
   * Bau (basis = Commit), geaendert nennt die Dateien, die der Bau verändert hat. null/fehlt = nicht ermittelt (die Lücke
   * steht dann in lesefehler).
   */
  pruefmassstab?: { basis: string; geaendert: string[] } | null
  /** Lesefehler des Servers je Quelle („ARCHITECTURE.md: fehlt“) — gehen unverändert nach fehlend */
  lesefehler: string[]
}

/** Laufakten-Teil der Karte. */
export interface ProjektkarteMeta {
  hash: string
  abschnitte: AbschnittId[]
  fehlend: string[]
}

/** Ergebnis von baueProjektkarte. */
export interface Projektkarte extends ProjektkarteMeta {
  text: string
}

/** Ein `## `-Abschnitt von ARCHITECTURE.md. */
export interface ArchitekturAbschnitt {
  /** Titel ohne '## ' und ohne Nummer ('1. ') */
  titel: string
  text: string
  beschrieben: boolean
}

/** Ergebnis von analysiereArchitektur. */
export interface ArchitekturAnalyse {
  abschnitte: ArchitekturAbschnitt[]
  /** Pflichtabschnitte (Ordnerstruktur, Datenzugriff), die fehlen oder nur Platzhalter tragen */
  pflichtFehlt: string[]
  /** true, wenn alle Pflichtabschnitte fehlen — dann „Architektur noch nicht beschrieben“ statt Vorlagentext */
  nichtBeschrieben: boolean
}
