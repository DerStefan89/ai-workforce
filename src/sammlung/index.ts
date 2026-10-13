/**
 * Datei: src/sammlung/index.ts
 *
 * Zweck: Stefans Sammlung im Leitstand (F45 F-2b-1, F-1056/F-1057 Grundlage). Reine Funktionen ohne Datei-I/O:
 * - parseSammlung: liest NUR die Tabellen unter „## Vollständige Bewertungsmatrix“ (Unterabschnitte UI, Repos, Plugins,
 *   Skills, Tools, MCP) aus docs/harness/kandidaten-2026-09-15.md — jede andere Tabelle der Datei (Auswahlfilter,
 *   Priorisierung, Kosten, Datensatz) bleibt ungelesen. Dazu die Bedeutung je Urteil („## Entscheidungen lesen“) und eine
 *   Selbstprüfung gegen die Angabe der Datei („Erfasste Bewertungszeilen: **N**. Aufnehmen: n, …“, gesamt und je Urteil).
 * - ordneZu: Zuordnung Sammlung ↔ Katalog (ressourcen.json), Regel unten.
 * - bestimmeTyp, pruefbareQuelle, auswahl, berechneStand, baueSammlungAnsicht: Ansicht für GET /api/sammlung.
 * - baueScoutSammlung, pruefeScoutGegenSammlung: der Scout liest die Sammlung zuerst (F-1057, Advisor A12).
 *
 * Zuordnungsregel (Plan F-2b v2 §1, Advisor A13): zwei Stufen, die erste mit Treffer entscheidet.
 *   1. Link: normalisierte URL der Zeile (ganz kleingeschrieben, ohne Schema, ohne „www.“, ohne Query/Fragment, ohne „/“
 *      und „.git“ am Ende) = normalisierte herkunft.url eines Katalogeintrags.
 *   2. Name: normalisierter Name (nur a–z, 0–9) = normalisierte Katalog-id oder normalisierter Katalog-name.
 *   Genau ein Katalogeintrag UND kein anderer Sammlungseintrag trifft denselben Katalogeintrag → „zugeordnet“. Mehrere
 *   Kandidaten oder ein mehrfach getroffener Katalogeintrag → „mehrdeutig“ (nichts wird geraten). Kein Treffer → „keine“.
 *   Zeilen mit Urteil „Alias“ nehmen nicht teil (bewertet ist der Haupteintrag).
 *
 * Wird aufgerufen von: scripts/leitstand/routen-sammlung.mjs, scripts/leitstand-server.mjs (Scout-Anhang, Scout-Projektion),
 * scripts/check-f45-f2b-sammlung.mjs, src/sammlung/sammlung.test.ts.
 *
 * Grenzen des Parsers (Code-Review 8): ein maskiertes '\|' in einer Zelle oder ein ')' in einem Link gilt als Strukturfehler (die
 * Datei enthält heute keins) — die Sammlung zeigt dann einen Fehlerstand statt zu raten.
 *
 * Wichtig: Die Sammlung wird nur gelesen, nie geschrieben. Feste Zahlen (176 Zeilen, 172 mit Link) stehen nur im Gate; zur
 * Laufzeit gilt allein die Selbstprüfung gegen die Angabe der Datei. Gründe und Stände sind Codes — die Oberfläche
 * übersetzt sie (Muster F-1016, vermeidet F-1060 (7)).
 */

import { paketNameAus } from '../ressourcen/index.ts'
import type {
  KatalogEintragKurz,
  NichtAuswaehlbar,
  PruefbareQuelle,
  KatalogStatusEintrag,
  PruefberichtLage,
  SammlungArt,
  SammlungEintrag,
  SammlungParse,
  SammlungStand,
  SammlungTyp,
  SammlungUrteil,
  SammlungZeile,
  TypQuelle,
  Zuordnung,
} from './types.ts'

/** Die zehn Entscheidungen in der Reihenfolge der Datei („Entscheidungen lesen“). */
export const URTEILE: readonly SammlungUrteil[] = Object.freeze(['Aufnehmen', 'Optional', 'Pilot', 'Referenz', 'Sonderfall', 'Zurückstellen', 'Nur Ausnahme', 'Ausgeschlossen', 'Offen', 'Alias'])

/** Unterabschnitte der Matrix in der Reihenfolge der Datei. */
export const ARTEN: readonly SammlungArt[] = Object.freeze(['UI', 'Repos', 'Plugins', 'Skills', 'Tools', 'MCP'])

/** Urteile, die der Auswahlfilter der Datei aus der Standardauswahl nimmt (Auswählen nur mit Ausnahme-Begründung). */
export const AUSGESCHLOSSENE_URTEILE: readonly SammlungUrteil[] = Object.freeze(['Nur Ausnahme', 'Ausgeschlossen'])

/** Überschrift des einzigen gelesenen Abschnitts. */
export const MATRIX_UEBERSCHRIFT = '## Vollständige Bewertungsmatrix'

/** Pflichtkopf jeder Matrixtabelle. */
export const MATRIX_KOPF: readonly string[] = Object.freeze(['Name / Quelle', 'Urteil', 'Kurzbeschreibung', 'Lizenzbasis', 'Kosten', 'Sicherheits-/Fit-Bewertung'])


/**
 * Zerlegt eine Markdown-Tabellenzeile in getrimmte Zellen (ohne die äußeren Pipes).
 * @param zeile - Zeile, die mit „|“ beginnt
 * @returns Zellen oder null, wenn die Zeile nicht mit „|“ endet
 */
function zellen(zeile: string): string[] | null {
  const t = zeile.trim()
  if (!t.startsWith('|') || !t.endsWith('|') || t.length < 2) return null
  return t
    .slice(1, -1)
    .split('|')
    .map((z) => z.trim())
}

/**
 * Kurzname für ids: klein, ohne Akzente, Bindestriche statt anderer Zeichen.
 * @param text - Name
 * @returns Slug, nie leer
 */
export function slug(text: string): string {
  const roh = text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return roh.length > 0 ? roh : 'eintrag'
}

/**
 * Normalisierte URL für die Zuordnung (Regel im Dateikopf).
 * @param url - beliebiger Wert
 * @returns z. B. 'github.com/microsoft/playwright-mcp' oder null, wenn keine http(s)-URL
 */
export function normalisiereUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null
  let geparst: URL
  try {
    geparst = new URL(url)
  } catch {
    return null
  }
  if (geparst.protocol !== 'https:' && geparst.protocol !== 'http:') return null
  const host = geparst.hostname.toLowerCase().replace(/^www\./, '')
  const pfad = geparst.pathname
    .toLowerCase()
    .replace(/\/+$/, '')
    .replace(/\.git$/, '')
  return `${host}${pfad}`
}

/**
 * Normalisierter Name für die Zuordnung: nur a–z und 0–9.
 * @param name - Name oder id
 * @returns normalisierter Text (kann leer sein)
 */
export function normalisiereName(name: unknown): string {
  return typeof name === 'string'
    ? name
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9]/g, '')
    : ''
}

/** Prüft, ob ein Wert eines der zehn Urteile ist. */
function istUrteil(wert: string): wert is SammlungUrteil {
  return (URTEILE as readonly string[]).includes(wert)
}

/**
 * Liest die Selbstangabe „Erfasste Bewertungszeilen: **N**. Aufnehmen: n, Optional: n, …“.
 * @param zeile - Textzeile
 * @param fehler - Sammelliste
 * @returns Angabe oder null, wenn die Zeile nicht die Angabe ist
 */
function leseDeklaration(zeile: string, fehler: string[]): { gesamt: number; jeUrteil: Partial<Record<SammlungUrteil, number>> } | null {
  const treffer = /^Erfasste Bewertungszeilen:\s*\*\*(\d+)\*\*\.?\s*(.*)$/.exec(zeile.trim())
  if (treffer === null) return null
  const jeUrteil: Partial<Record<SammlungUrteil, number>> = {}
  for (const teil of treffer[2].replace(/\.$/, '').split(',')) {
    const paar = /^\s*([^:]+?):\s*(\d+)\s*$/.exec(teil)
    if (paar === null) continue
    if (istUrteil(paar[1])) jeUrteil[paar[1]] = Number(paar[2])
    else fehler.push(`Selbstangabe nennt unbekanntes Urteil '${paar[1]}'`)
  }
  return { gesamt: Number(treffer[1]), jeUrteil }
}

/**
 * Liest die Name/Quelle-Zelle: `[Name](https://…)` oder `Name (Link fehlt)`.
 * @param zelle - Zelleninhalt
 * @returns { name, link } oder null
 */
function leseNameZelle(zelle: string): { name: string; link: string | null } | null {
  const mitLink = /^\[([^\]]+)\]\((https:\/\/[^\s)]+)\)$/.exec(zelle)
  if (mitLink !== null) return { name: mitLink[1].trim(), link: mitLink[2] }
  const ohne = /^(.+?)\s*\(Link fehlt\)$/.exec(zelle)
  if (ohne !== null) return { name: ohne[1].trim(), link: null }
  return null
}

/**
 * Liest die Bewertungsmatrix (Details im Dateikopf). Sammelt alle Fehler statt beim ersten abzubrechen.
 * @param text - Inhalt von docs/harness/kandidaten-2026-09-15.md
 * @returns { ok, zeilen, bedeutung, deklariert } oder { ok:false, fehler }
 */
export function parseSammlung(text: string): SammlungParse {
  const zeilenText = text.split(/\r?\n/)
  const fehler: string[] = []

  // Bedeutung je Urteil aus „## Entscheidungen lesen“ (nur Zeilen, deren erste Zelle ein Urteil ist).
  const bedeutung: Partial<Record<SammlungUrteil, string>> = {}
  const entscheidungenStart = zeilenText.findIndex((z) => z.trim() === '## Entscheidungen lesen')
  if (entscheidungenStart >= 0) {
    for (let i = entscheidungenStart + 1; i < zeilenText.length && !zeilenText[i].startsWith('## '); i++) {
      const z = zellen(zeilenText[i])
      if (z !== null && z.length === 2 && istUrteil(z[0])) bedeutung[z[0]] = z[1]
    }
  }

  const start = zeilenText.findIndex((z) => z.trim() === MATRIX_UEBERSCHRIFT)
  if (start < 0) return { ok: false, fehler: [`Abschnitt '${MATRIX_UEBERSCHRIFT}' fehlt`] }
  let ende = zeilenText.length
  for (let i = start + 1; i < zeilenText.length; i++) {
    if (zeilenText[i].startsWith('## ')) {
      ende = i
      break
    }
  }

  let deklariert: { gesamt: number; jeUrteil: Partial<Record<SammlungUrteil, number>> } | null = null
  let art: SammlungArt | null = null
  let kopfGesehen = false
  const zeilen: SammlungZeile[] = []
  const ids = new Set<string>()
  for (let i = start + 1; i < ende; i++) {
    const roh = zeilenText[i]
    const nummer = i + 1
    if (roh.startsWith('### ')) {
      const name = roh.slice(4).trim()
      art = (ARTEN as readonly string[]).includes(name) ? (name as SammlungArt) : null
      if (art === null) fehler.push(`Zeile ${nummer}: unbekannter Unterabschnitt '${name}' (erwartet: ${ARTEN.join(', ')})`)
      kopfGesehen = false
      continue
    }
    const angabe: ReturnType<typeof leseDeklaration> = deklariert === null ? leseDeklaration(roh, fehler) : null
    if (angabe !== null) {
      deklariert = angabe
      continue
    }
    if (!roh.trim().startsWith('|')) continue
    const z = zellen(roh)
    if (z === null) {
      fehler.push(`Zeile ${nummer}: Tabellenzeile endet nicht mit '|'`)
      continue
    }
    if (z.every((zelle) => /^:?-{3,}:?$/.test(zelle))) continue
    if (z[0] === MATRIX_KOPF[0]) {
      if (z.length !== MATRIX_KOPF.length || z.some((zelle, j) => zelle !== MATRIX_KOPF[j])) fehler.push(`Zeile ${nummer}: Tabellenkopf weicht ab (erwartet: ${MATRIX_KOPF.join(' | ')})`)
      kopfGesehen = true
      continue
    }
    if (art === null || !kopfGesehen) {
      fehler.push(`Zeile ${nummer}: Tabellenzeile außerhalb einer Matrixtabelle`)
      continue
    }
    if (z.length !== MATRIX_KOPF.length) {
      fehler.push(`Zeile ${nummer}: ${z.length} statt ${MATRIX_KOPF.length} Spalten`)
      continue
    }
    const [nameZelle, urteil, kurzbeschreibung, lizenz, kosten, bewertung] = z
    const nameLink = leseNameZelle(nameZelle)
    if (nameLink === null) {
      fehler.push(`Zeile ${nummer}: Name/Quelle unlesbar (erwartet '[Name](https://…)' oder 'Name (Link fehlt)')`)
      continue
    }
    const leer = (['Urteil', 'Kurzbeschreibung', 'Lizenzbasis', 'Kosten', 'Sicherheits-/Fit-Bewertung'] as const).filter((_, j) => z[j + 1] === '')
    if (nameLink.name === '' || leer.length > 0) {
      fehler.push(`Zeile ${nummer}: Pflichtspalte leer (${[...(nameLink.name === '' ? ['Name'] : []), ...leer].join(', ')})`)
      continue
    }
    if (!istUrteil(urteil)) {
      fehler.push(`Zeile ${nummer}: unbekanntes Urteil '${urteil}'`)
      continue
    }
    const id = `${slug(art)}-${slug(nameLink.name)}`
    if (ids.has(id)) {
      fehler.push(`Zeile ${nummer}: id '${id}' doppelt (gleicher Name im selben Abschnitt)`)
      continue
    }
    ids.add(id)
    zeilen.push({ id, art, name: nameLink.name, link: nameLink.link, urteil, kurzbeschreibung, lizenz, kosten, bewertung, zeile: nummer })
  }

  if (fehler.length > 0) return { ok: false, fehler }
  // Plan v2.1 (Delta B8): Strukturfehler oben → ok:false; eine reine Zählabweichung lässt die Liste sichtbar (Band).
  const selbstpruefung: string[] = []
  if (deklariert === null) selbstpruefung.push("Selbstangabe 'Erfasste Bewertungszeilen: **N**. …' fehlt im Abschnitt")
  else {
    if (deklariert.gesamt !== zeilen.length) selbstpruefung.push(`Selbstprüfung: die Datei nennt ${deklariert.gesamt} Zeilen, gelesen wurden ${zeilen.length}`)
    for (const urteil of URTEILE) {
      const gelesen = zeilen.filter((z) => z.urteil === urteil).length
      const genannt = deklariert.jeUrteil[urteil] ?? 0
      if (gelesen !== genannt) selbstpruefung.push(`Selbstprüfung: '${urteil}' — die Datei nennt ${genannt}, gelesen wurden ${gelesen}`)
    }
  }
  return { ok: true, zeilen, bedeutung, deklariert, selbstpruefung }
}

/**
 * Liest die Tabelle mit URL-Spalte aus docs/harness/stack-kandidaten.md (Produkt-Bibliotheken, Gruppe 2).
 * @param text - Inhalt der Datei
 * @returns [{ name, url }] (nur Zeilen mit http(s)-URL)
 */
export function leseStackListe(text: string): Array<{ name: string; url: string }> {
  const ergebnis: Array<{ name: string; url: string }> = []
  let urlSpalte = -1
  for (const zeile of text.split(/\r?\n/)) {
    const z = zellen(zeile)
    if (z === null) {
      urlSpalte = -1
      continue
    }
    if (z.includes('URL') && z[0] === 'Name') {
      urlSpalte = z.indexOf('URL')
      continue
    }
    if (urlSpalte < 0 || z.every((zelle) => /^:?-{3,}:?$/.test(zelle))) continue
    const url = z[urlSpalte]
    if (url !== undefined && /^https?:\/\//.test(url)) ergebnis.push({ name: z[0], url })
  }
  return ergebnis
}

/**
 * Zuordnung jeder Zeile zum Katalog (Regel im Dateikopf).
 * @param zeilen - geparste Sammlung
 * @param katalog - Einträge aus ressourcen.json
 * @returns Map Sammlungs-id → Zuordnung
 */
export function ordneZu(zeilen: readonly SammlungZeile[], katalog: readonly KatalogEintragKurz[]): Map<string, Zuordnung> {
  const nachUrl = new Map<string, Set<string>>()
  const nachName = new Map<string, Set<string>>()
  const merke = (karte: Map<string, Set<string>>, schluessel: string | null, id: string) => {
    if (schluessel === null || schluessel === '') return
    const menge = karte.get(schluessel) ?? new Set<string>()
    menge.add(id)
    karte.set(schluessel, menge)
  }
  for (const k of katalog) {
    merke(nachUrl, normalisiereUrl(k.herkunft?.url), k.id)
    merke(nachName, normalisiereName(k.id), k.id)
    merke(nachName, normalisiereName(k.name), k.id)
  }
  // Vorschläge je Zeile, dann 1:1 über alle Zeilen.
  const vorschlag = new Map<string, { kandidaten: string[]; stufe: 'link' | 'name' } | null>()
  for (const z of zeilen) {
    if (z.urteil === 'Alias') continue
    const perLink = nachUrl.get(normalisiereUrl(z.link) ?? '')
    if (perLink !== undefined) {
      vorschlag.set(z.id, { kandidaten: [...perLink].sort(), stufe: 'link' })
      continue
    }
    const perName = nachName.get(normalisiereName(z.name))
    vorschlag.set(z.id, perName !== undefined ? { kandidaten: [...perName].sort(), stufe: 'name' } : null)
  }
  const treffer = new Map<string, number>()
  for (const v of vorschlag.values()) if (v !== null && v.kandidaten.length === 1) treffer.set(v.kandidaten[0], (treffer.get(v.kandidaten[0]) ?? 0) + 1)
  const ergebnis = new Map<string, Zuordnung>()
  for (const z of zeilen) {
    if (z.urteil === 'Alias') {
      ergebnis.set(z.id, { status: 'alias' })
      continue
    }
    const v = vorschlag.get(z.id) ?? null
    if (v === null) ergebnis.set(z.id, { status: 'keine' })
    else if (v.kandidaten.length === 1 && treffer.get(v.kandidaten[0]) === 1) ergebnis.set(z.id, { status: 'zugeordnet', katalog_id: v.kandidaten[0], stufe: v.stufe })
    else ergebnis.set(z.id, { status: 'mehrdeutig', kandidaten: v.kandidaten, stufe: v.stufe })
  }
  return ergebnis
}

/**
 * Typ für „Auswählen“ (Plan v2 §1): Katalog → Stack-Liste → Abschnitt (nur Vorschlag) → unbestimmt.
 * @param zeile - Sammlungszeile
 * @param katalogEintrag - zugeordneter Katalogeintrag oder undefined
 * @param stackUrls - normalisierte URLs der Stack-Liste
 * @returns { typ, typ_quelle }
 */
export function bestimmeTyp(zeile: SammlungZeile, katalogEintrag: KatalogEintragKurz | undefined, stackUrls: ReadonlySet<string>): { typ: SammlungTyp; typ_quelle: TypQuelle } {
  if (katalogEintrag !== undefined) {
    if (katalogEintrag.typ === 'extern' && (katalogEintrag.unterart === 'skill' || katalogEintrag.unterart === 'mcp' || katalogEintrag.unterart === 'agent')) return { typ: katalogEintrag.unterart, typ_quelle: 'katalog' }
    return { typ: 'lokal', typ_quelle: 'katalog' }
  }
  const url = normalisiereUrl(zeile.link)
  if (url !== null && stackUrls.has(url)) return { typ: 'bibliothek', typ_quelle: 'stack-liste' }
  const nachArt: Partial<Record<SammlungArt, SammlungTyp>> = { MCP: 'mcp', Skills: 'skill', Plugins: 'plugin', UI: 'bibliothek' }
  const vorschlag = nachArt[zeile.art]
  return vorschlag !== undefined ? { typ: vorschlag, typ_quelle: 'abschnitt' } : { typ: 'unbestimmt', typ_quelle: 'unbestimmt' }
}

/**
 * Prüfbare Quelle eines Links (Advisor A9, Delta B11), strukturiert und in der Schreibweise des Links (zum Holen in
 * F-2b-2): `github.com/<owner>/<repo>` oder `…/tree/<ref>/<unterpfad>` → git; `npmjs.com/package/<name>` → npm. Org-Seiten,
 * Gists, `/blob/`-Dateilinks und alle anderen Hosts → null („keine prüfbare Quelle“).
 * @param link - https-Link oder null
 * @returns PruefbareQuelle
 */
export function pruefbareQuelle(link: string | null): PruefbareQuelle {
  if (normalisiereUrl(link) === null || link === null) return null
  const url = new URL(link)
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  const teile = url.pathname
    .replace(/\/+$/, '')
    .split('/')
    .slice(1)
  if (host === 'github.com') {
    const [owner, repoRoh, art, ref, ...rest] = teile
    const repo = repoRoh?.replace(/\.git$/, '')
    if (owner === undefined || owner === '' || repo === undefined || repo === '') return null
    if (art === undefined) return { art: 'git', owner, repo, ref: null, unterpfad: '' }
    if (art === 'tree' && ref !== undefined && ref !== '') return { art: 'git', owner, repo, ref, unterpfad: rest.join('/') }
    return null
  }
  if (host === 'npmjs.com' && teile[0] === 'package' && teile.length >= 2) {
    try {
      return { art: 'npm', paket: decodeURIComponent(teile.slice(1).join('/')) }
    } catch {
      // Code-Review 2: ein ungültiges %xx im Link ist keine prüfbare Quelle (statt eines Wurfs).
      return null
    }
  }
  return null
}

/**
 * Ob ein Eintrag auswählbar ist (wirksam seit F-2b-2a) und warum nicht. Seit F-2b-2a (QA 2/3) zusätzlich: ein zugeordneter
 * Katalogeintrag, der schon freigegeben ist (Bestandsschutz, keine Prüfung), und ein MCP ohne npm-Paket (Katalog
 * `herkunft.paket` bzw. npm-Link der Sammlung) — die Route würde sonst 409 bzw. 422 „Paketangabe fehlt“ antworten.
 * @param zeile - Sammlungszeile
 * @param typ - bestimmter Typ
 * @param quelle - prüfbare Quelle
 * @param katalogEintrag - zugeordneter Katalogeintrag oder undefined
 * @returns { auswaehlbar, grund }
 */
export function auswahl(zeile: SammlungZeile, typ: SammlungTyp, quelle: PruefbareQuelle, katalogEintrag?: KatalogEintragKurz): { auswaehlbar: boolean; grund: NichtAuswaehlbar | null } {
  const nein = (grund: NichtAuswaehlbar) => ({ auswaehlbar: false, grund })
  if (zeile.urteil === 'Alias') return nein('alias')
  if (zeile.link === null) return nein('ohne_link')
  if (typ === 'lokal') return nein('lokal')
  if (typ === 'bibliothek') return nein('bibliothek')
  if (typ === 'plugin') return nein('plugin')
  if (katalogEintrag !== undefined && katalogEintrag.freigabe !== 'OFFEN') return nein('freigegeben')
  if (typ === 'mcp') {
    // F-1074 (8): dieselbe Namensprüfung wie die Prüfroute (bestimmeSubjekt) — ein ungültiger Name zeigt kein „Auswählen“.
    const paket = katalogEintrag !== undefined ? paketNameAus(katalogEintrag.herkunft?.paket) : quelle?.art === 'npm' ? paketNameAus(`npm:${quelle.paket}`) : null
    if (paket === null) return nein('mcp_ohne_paket')
  }
  if (quelle === null) return nein('keine_quelle')
  return { auswaehlbar: true, grund: null }
}

/**
 * Stand eines Eintrags (höchster gewinnt) und Lage des Prüfberichts.
 * @param katalogEintrag - zugeordneter Katalogeintrag oder undefined
 * @param status - Katalog-Status dieses Projekts (installiert/aktiv/Aufrufe) oder undefined
 * @returns { stand, pruefbericht, aufrufe }
 */
export function berechneStand(katalogEintrag: KatalogEintragKurz | undefined, status: KatalogStatusEintrag | undefined): { stand: SammlungStand; pruefbericht: PruefberichtLage; aufrufe: number | null } {
  if (katalogEintrag === undefined) return { stand: 'nur_sammlung', pruefbericht: 'keiner', aufrufe: null }
  // Delta B12: lokale Katalogeinträge (Skill/Agent im Repo) brauchen keinen Prüfbericht.
  const pruefbericht: PruefberichtLage = katalogEintrag.typ !== 'extern' ? 'lokal' : katalogEintrag.freigabe === 'FREIGEGEBEN' ? 'ohne_vor_f2b' : 'keiner'
  // Lokale Katalogeinträge (Skill/Agent im Repo) sind vorhanden, ohne installiert zu werden.
  if (katalogEintrag.typ !== 'extern') return { stand: 'installiert', pruefbericht, aufrufe: null }
  const aufrufe = status?.aufrufe ?? null
  if (aufrufe !== null && aufrufe > 0) return { stand: 'benutzt', pruefbericht, aufrufe }
  if (status?.aktiv === true) return { stand: 'aktiv', pruefbericht, aufrufe }
  if (status?.installiert === true) return { stand: 'installiert', pruefbericht, aufrufe }
  return { stand: 'vorgemerkt', pruefbericht, aufrufe: null }
}

/** Ergebnis von baueSammlungAnsicht. */
export type SammlungAnsicht =
  | {
      status: 'ok'
      quelle: { zeilen: number; mit_link: number }
      /** Abweichungen der Selbstprüfung (Delta B8) — leer im Normalfall. */
      selbstpruefung: string[]
      eintraege: SammlungEintrag[]
      urteil_bedeutung: Partial<Record<SammlungUrteil, string>>
      zaehlung: { je_art: Record<string, number>; je_urteil: Record<string, number>; je_stand: Record<string, number>; auswaehlbar: number; ausgeschlossen: number }
    }
  | { status: 'fehler'; grund: string }

/**
 * Baut die Ansicht für GET /api/sammlung.
 * @param eingabe - text (Sammlung), stackText (Stack-Liste oder null), katalog, katalogStatus (je Katalog-id)
 * @returns Ansicht oder Fehlerstand
 */
export function baueSammlungAnsicht(eingabe: { text: string; stackText: string | null; katalog: readonly KatalogEintragKurz[]; katalogStatus: ReadonlyMap<string, KatalogStatusEintrag> }): SammlungAnsicht {
  const geparst = parseSammlung(eingabe.text)
  // Code-Review 7: höchstens fünf Strukturfehler im Grund (das rote Band bleibt lesbar), der Rest als Zahl.
  if (!geparst.ok) return { status: 'fehler', grund: [...geparst.fehler.slice(0, 5), ...(geparst.fehler.length > 5 ? [`+ ${geparst.fehler.length - 5} weitere`] : [])].join('; ') }
  const stackUrls = new Set(
    leseStackListe(eingabe.stackText ?? '')
      .map((e) => normalisiereUrl(e.url))
      .filter((u): u is string => u !== null)
  )
  const zuordnung = ordneZu(geparst.zeilen, eingabe.katalog)
  const katalogNachId = new Map(eingabe.katalog.map((k) => [k.id, k]))
  const eintraege: SammlungEintrag[] = geparst.zeilen.map((zeile) => {
    const z = zuordnung.get(zeile.id) ?? { status: 'keine' }
    const katalogEintrag = z.status === 'zugeordnet' ? katalogNachId.get(z.katalog_id) : undefined
    const { typ, typ_quelle } = bestimmeTyp(zeile, katalogEintrag, stackUrls)
    const quelle = pruefbareQuelle(zeile.link)
    const wahl = auswahl(zeile, typ, quelle, katalogEintrag)
    const stand = berechneStand(katalogEintrag, katalogEintrag === undefined ? undefined : eingabe.katalogStatus.get(katalogEintrag.id))
    return {
      ...zeile,
      zuordnung: z,
      typ,
      typ_quelle,
      pruefbare_quelle: quelle,
      link_normalisiert: normalisiereUrl(zeile.link),
      auswaehlbar: wahl.auswaehlbar,
      nicht_auswaehlbar_grund: wahl.grund,
      ausgeschlossen: AUSGESCHLOSSENE_URTEILE.includes(zeile.urteil),
      ...stand,
    }
  })
  const zaehle = (schluessel: (e: SammlungEintrag) => string) => {
    const z: Record<string, number> = {}
    for (const e of eintraege) z[schluessel(e)] = (z[schluessel(e)] ?? 0) + 1
    return z
  }
  return {
    status: 'ok',
    quelle: { zeilen: eintraege.length, mit_link: eintraege.filter((e) => e.link !== null).length },
    selbstpruefung: geparst.selbstpruefung,
    eintraege,
    urteil_bedeutung: geparst.bedeutung,
    zaehlung: {
      je_art: zaehle((e) => e.art),
      je_urteil: zaehle((e) => e.urteil),
      je_stand: zaehle((e) => e.stand),
      auswaehlbar: eintraege.filter((e) => e.auswaehlbar).length,
      ausgeschlossen: eintraege.filter((e) => e.ausgeschlossen).length,
    },
  }
}

/**
 * Anhang an den Prompt eines Scout-Laufs (F-1057, Advisor A12): kompakte Sammlung plus Stack-Liste und die Regel
 * „Sammlung zuerst“. Ist die Sammlung nicht lesbar, nur ein Hinweis — der Scout läuft dann wie bisher.
 * @param text - Sammlung oder null (nicht lesbar)
 * @param stackText - Stack-Liste oder null
 * @param grund - Grund, falls text null ist
 * @returns Text für den Prompt
 */
export function baueScoutSammlung(text: string | null, stackText: string | null, grund = 'nicht lesbar'): string {
  const geparst = text === null ? null : parseSammlung(text)
  if (geparst === null || !geparst.ok) {
    const warum = geparst === null ? grund : geparst.fehler.slice(0, 3).join('; ')
    return `Sammlung nicht verfügbar (${warum}) — recherchiere wie bisher im Web und setze quelle "web".`
  }
  const zeilen = geparst.zeilen.map((z) => `- ${z.name} | ${z.art} | ${z.urteil} | ${z.lizenz} | ${z.link ?? 'ohne Link'}`)
  const stack = leseStackListe(stackText ?? '').map((e) => `- ${e.name} | ${e.url}`)
  return [
    'Sammlung zuerst (verbindlich): Stefans bewertete Sammlung steht unten (Name | Art | Urteil | Lizenz | Link). Prüfe zuerst, ob sie Kandidaten für die gesuchte Capability enthält. Für einen Kandidaten aus der Sammlung übernimm Urteil und Lizenz unverändert, setze quelle "sammlung", urteil_sammlung auf das Urteil und quelle_url auf den Link der Sammlung. Das Lesen dieser Liste zählt nicht gegen das Web-Budget. Das Web nur für Lücken (quelle "web"); einen Web-Kandidaten, der in der Sammlung steht, kennzeichnest du trotzdem mit quelle "sammlung". Urteile „Nur Ausnahme“, „Ausgeschlossen“ und „Alias“ schlägst du nicht als Empfehlung vor, nennst sie aber, wenn sie die Capability abdecken. Die beiden Felder sind optional, ihre Werte aber exakt: quelle ist "sammlung" oder "web", urteil_sammlung genau so geschrieben wie in der Liste — ein anderer Wert macht das ganze Ergebnis ungültig.',
    `Sammlung (${geparst.zeilen.length} Einträge):\n${zeilen.join('\n')}`,
    ...(stack.length > 0 ? [`Produkt-Bibliotheken (Stack-Liste, wählt der Architekt — kein Scout-Kandidat):\n${stack.join('\n')}`] : []),
  ].join('\n\n')
}

/**
 * Gleicht die Kandidaten eines Scout-Ergebnisses mit der Sammlung ab (Serverwahrheit, Advisor A12): Treffer über die
 * normalisierte quelle_url; abweichung, wenn der Scout ein Urteil nennt, das nicht dem der Sammlung entspricht, oder
 * quelle "sammlung" ohne Treffer angibt.
 * @param kandidaten - kandidaten aus ergebnis-scout
 * @param zeilen - geparste Sammlung
 * @returns je Kandidat { treffer, abweichung }
 */
export function pruefeScoutGegenSammlung(
  kandidaten: ReadonlyArray<{ quelle_url: string; quelle?: string; urteil_sammlung?: string }>,
  zeilen: readonly SammlungZeile[]
): Array<{ treffer: { id: string; name: string; urteil: SammlungUrteil; lizenz: string } | null; abweichung: boolean }> {
  // Code-Review 4: Alias-Zeilen zählen nicht (bewertet ist der Haupteintrag); teilen sich mehrere Zeilen einen Link, passt die
  // Angabe des Scouts, wenn sie einem ihrer Urteile entspricht (Anzeige: das erste in Dateireihenfolge).
  const nachUrl = new Map<string, SammlungZeile[]>()
  for (const z of zeilen) {
    const url = normalisiereUrl(z.link)
    if (url === null || z.urteil === 'Alias') continue
    nachUrl.set(url, [...(nachUrl.get(url) ?? []), z])
  }
  return kandidaten.map((k) => {
    const alle = nachUrl.get(normalisiereUrl(k.quelle_url) ?? '') ?? []
    const z = alle.find((x) => x.urteil === k.urteil_sammlung) ?? alle[0]
    const treffer = z === undefined ? null : { id: z.id, name: z.name, urteil: z.urteil, lizenz: z.lizenz }
    const abweichung = (k.urteil_sammlung !== undefined && !alle.some((x) => x.urteil === k.urteil_sammlung)) || (k.quelle === 'sammlung' && treffer === null)
    return { treffer, abweichung }
  })
}

export type { KatalogEintragKurz, KatalogStatusEintrag, SammlungEintrag, SammlungUrteil, SammlungZeile, Zuordnung }
