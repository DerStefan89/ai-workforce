/**
 * Datei: src/sammlung/types.ts
 *
 * Zweck: Typen der Sammlung (F45 F-2b-1): eine Zeile der „Vollständigen Bewertungsmatrix“ aus
 * docs/harness/kandidaten-2026-09-15.md, ihre Zuordnung zum Katalog (ressourcen.json) und die Ansicht für
 * GET /api/sammlung. Die Regeln stehen in src/sammlung/index.ts.
 *
 * Wird aufgerufen von: src/sammlung/index.ts, src/scout/types.ts (SammlungUrteil), scripts/leitstand/routen-sammlung.mjs
 * (über JSDoc-Formen).
 *
 * Wichtig: Die zehn Urteile sind Zwilling der enum in schemas/ergebnis-scout.schema.json (urteil_sammlung) und der Konstante
 * URTEILE in src/sammlung/index.ts — das Gate scripts/check-f45-f2b-sammlung.mjs prüft die Gleichheit.
 */

/** Die zehn Entscheidungen aus „Entscheidungen lesen“ der Sammlung. */
export type SammlungUrteil =
  | 'Aufnehmen'
  | 'Optional'
  | 'Pilot'
  | 'Referenz'
  | 'Sonderfall'
  | 'Zurückstellen'
  | 'Nur Ausnahme'
  | 'Ausgeschlossen'
  | 'Offen'
  | 'Alias'

/** Unterabschnitte der Bewertungsmatrix (### …). */
export type SammlungArt = 'UI' | 'Repos' | 'Plugins' | 'Skills' | 'Tools' | 'MCP'

/** Eine Matrixzeile, wie sie in der Datei steht (nur gelesen, nie geschrieben). */
export interface SammlungZeile {
  /** `<art>-<slug(name)>`, eindeutig in der Matrix. */
  id: string
  art: SammlungArt
  name: string
  /** https-Link aus `[Name](url)`; null bei „(Link fehlt)“. */
  link: string | null
  urteil: SammlungUrteil
  kurzbeschreibung: string
  lizenz: string
  kosten: string
  /** Spalte „Sicherheits-/Fit-Bewertung“. */
  bewertung: string
  /** 1-basierte Zeilennummer in der Datei (Beleg). */
  zeile: number
}

/** Ergebnis von parseSammlung. */
export type SammlungParse =
  | {
      ok: true
      zeilen: SammlungZeile[]
      /** Bedeutung je Urteil aus „## Entscheidungen lesen“. */
      bedeutung: Partial<Record<SammlungUrteil, string>>
      /** Angabe der Datei selbst („Erfasste Bewertungszeilen: **N**. Aufnehmen: n, …“) oder null, wenn sie fehlt. */
      deklariert: { gesamt: number; jeUrteil: Partial<Record<SammlungUrteil, number>> } | null
      /** Abweichungen der Selbstprüfung (Plan v2.1, Delta B8): die Liste bleibt sichtbar, die Oberfläche zeigt ein Band. */
      selbstpruefung: string[]
    }
  | { ok: false; fehler: string[] }

/** Zuordnung einer Sammlungszeile zum Katalog (Regel im Kopf von src/sammlung/index.ts). */
export type Zuordnung =
  | { status: 'zugeordnet'; katalog_id: string; stufe: 'link' | 'name' }
  | { status: 'mehrdeutig'; kandidaten: string[]; stufe: 'link' | 'name' }
  | { status: 'keine' }
  | { status: 'alias' }

/** Typ für „Auswählen“ (F-2b-2) samt Herkunft der Regel. */
export type SammlungTyp = 'skill' | 'mcp' | 'agent' | 'plugin' | 'bibliothek' | 'lokal' | 'unbestimmt'
export type TypQuelle = 'katalog' | 'stack-liste' | 'abschnitt' | 'unbestimmt'

/** Stand je Eintrag (höchster gewinnt). `geprueft` setzt seit F45 F-2b-2a die Route (ergaenzeSammlung), wenn ein Bericht vorliegt. */
export type SammlungStand = 'benutzt' | 'aktiv' | 'installiert' | 'geprueft' | 'vorgemerkt' | 'nur_sammlung'

/** Gründe, warum ein Eintrag nicht auswählbar ist (Codes, die Oberfläche übersetzt sie). */
export type NichtAuswaehlbar = 'alias' | 'ohne_link' | 'lokal' | 'bibliothek' | 'plugin' | 'keine_quelle' | 'freigegeben' | 'mcp_ohne_paket'

/** Prüfbericht-Lage je Eintrag; 'vorhanden' setzt seit F45 F-2b-2a die Route (ergaenzeSammlung) aus der Ablage der Workforce. */
export type PruefberichtLage = 'ohne_vor_f2b' | 'lokal' | 'keiner' | 'vorhanden'

/** Prüfbare Quelle eines Links (Delta B11) — strukturiert, damit F-2b-2 nicht neu parsen muss. */
export type PruefbareQuelle = { art: 'git'; owner: string; repo: string; ref: string | null; unterpfad: string } | { art: 'npm'; paket: string } | null

/** Was die Stand-Rechnung über einen Katalog-Eintrag wissen muss (aus baueKatalogStatus, F-2a). */
export interface KatalogStatusEintrag {
  id: string
  installiert: boolean
  aktiv: boolean
  /** Aufrufe im letzten erfassten Lauf; null = nicht erfasst. */
  aufrufe: number | null
}

/** Minimale Katalogform, die die Sammlung liest. */
export interface KatalogEintragKurz {
  id: string
  typ: string
  name?: string
  unterart?: string
  freigabe: string
  herkunft: { art: string; url?: string; paket?: string }
}

/** Eine Zeile der Ansicht GET /api/sammlung. */
export interface SammlungEintrag extends SammlungZeile {
  zuordnung: Zuordnung
  typ: SammlungTyp
  typ_quelle: TypQuelle
  /** Strukturierte Quelle (Groß-/Kleinschreibung des Links) oder null (keine prüfbare Quelle). */
  pruefbare_quelle: PruefbareQuelle
  /** Normalisierter Link (nur zum Vergleichen, nicht zum Holen) oder null. */
  link_normalisiert: string | null
  auswaehlbar: boolean
  /** Grund, warum nicht auswählbar (sonst null). */
  nicht_auswaehlbar_grund: NichtAuswaehlbar | null
  /** Urteil „Nur Ausnahme“/„Ausgeschlossen“: Auswählen nur mit Ausnahme-Begründung (F-2b-2). */
  ausgeschlossen: boolean
  stand: SammlungStand
  pruefbericht: PruefberichtLage
  /** Aufrufe im letzten Lauf (nur bei Stand benutzt/aktiv/installiert), sonst null. */
  aufrufe: number | null
}
