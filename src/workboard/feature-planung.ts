/**
 * Datei: src/workboard/feature-planung.ts
 *
 * Zweck: Planungsdaten einer Feature-Akte lesen und prüfen — F45 B5b-1a (features/F45/plan-b5b1-v2.md, E-B5-1 = A: die
 * Planung liegt in der Akte, docs/projekt/roadmap.json bleibt Struktur). Eine Quelle für das Feature-Akte-Gate
 * (pruefeFeatureAkteInhalt → scripts/check-feature.mjs, PUT/POST der Akte) und die Roadmap-Projektion
 * (scripts/leitstand/routen-roadmap.mjs). Rein, kein I/O, wirft nicht.
 *
 * Format:
 * - `Priorität: P0|P1|P2|P3` — optional, erste Zeile am Zeilenanfang.
 * - `Abgenommen: JJJJ-MM-TT[ Freitext]` — optional; der Wert beginnt mit einem gültigen Datum (O2). Pflicht nur bei Status
 *   ABGESCHLOSSEN UND strengem Workstreams-Abschnitt. Prosa wie „Abgenommen durch Stefan am …“ trifft das Muster nicht.
 * - `## Workstreams` (exakte Überschrift) ist streng, wenn seine erste nicht-leere Zeile mit `|` beginnt: feste Kopfzeile
 *   WORKSTREAM_KOPF, Trennzeile, Zeilen mit genau neun Zellen bis zur ersten Zeile ohne führendes `|`; danach darf Prosa folgen.
 *   Ein Abschnitt als Bullet-Liste (18 Altakten) bleibt Prosa: workstreams = null, kein Befund.
 *
 * Wird aufgerufen von: src/workboard/feature-akte-pruefung.ts, scripts/leitstand/routen-roadmap.mjs,
 * scripts/check-f45-b5b1a-planung.mjs, src/workboard/feature-planung.test.ts.
 *
 * Wichtig — bekannte Grenzen (DEKLARIERT): eine Zelle darf kein `|` tragen (auch nicht `\|`); eine Überschrift in einem
 * Code-Fence zählt wie eine echte. Die Regel gilt über pruefeFeatureAkteInhalt für jede Akte jedes Projekts: steht in einem
 * Fremdprojekt unter `## Workstreams` eine Tabelle mit anderem Kopf, ist die Akte gate-rot und per PUT …/akte nicht mehr
 * bearbeitbar (422 „schon vor der Bearbeitung“), bis der Abschnitt angepasst ist (code-reviewer H5). Daten in der Zukunft prüft
 * der Leser nicht; Plausibilität nur „Begonnen ≤ Abgenommen“. Eigener Abschnittsleser statt findeAbschnitt (src/feature-auftrag importiert
 * src/workboard — kein Ring), dieselbe Regel „exakte Überschrift bis zur nächsten `## `“.
 */

export const WORKSTREAM_SPALTEN = ['ID', 'Art', 'Titel', 'Status', 'Schätzung AT', 'Ist AT', 'Begonnen', 'Abgenommen', 'Notiz'] as const
export const WORKSTREAM_KOPF = `| ${WORKSTREAM_SPALTEN.join(' | ')} |`
export const WORKSTREAM_ARTEN = ['workstream', 'fixpaket', 'design'] as const
export const WORKSTREAM_STATUS = ['geplant', 'laeuft', 'erledigt', 'verworfen'] as const
export const PRIORITAETEN = ['P0', 'P1', 'P2', 'P3'] as const

export type WorkstreamArt = (typeof WORKSTREAM_ARTEN)[number]
export type WorkstreamStatus = (typeof WORKSTREAM_STATUS)[number]
export type AktenPrioritaet = (typeof PRIORITAETEN)[number]

export interface Schaetzung {
  min: number
  max: number
}

export interface WorkstreamEintrag {
  id: string
  art: WorkstreamArt
  titel: string
  status: WorkstreamStatus
  /** null = keine Schätzung („–“) */
  schaetzung: Schaetzung | null
  /** Ist in Arbeitstagen, null = keins */
  ist: number | null
  begonnen: string | null
  abgenommen: string | null
  notiz: string
}

export interface Planung {
  prioritaet: AktenPrioritaet | null
  /** ISO-Datum vom Anfang der Abgenommen-Zeile, null wenn keine gültige Zeile */
  abgenommen: string | null
  /** null = kein strenger Abschnitt (fehlt oder Prosa); [] = streng ohne Zeilen */
  workstreams: WorkstreamEintrag[] | null
  /** true, wenn die Tabelle Formfehler trägt — fehlerhafte Zeilen fehlen in workstreams (die Prognose zählt das Feature dann als unvollständig geplant) */
  workstreams_fehlerhaft: boolean
  befunde: string[]
}

const PRIORITAET_ZEILE = /^Priorität:[ \t]*(.*?)[ \t]*$/m
const ABGENOMMEN_ZEILE = /^Abgenommen:[ \t]*(.*?)[ \t]*$/m
const ISO_ANFANG = /^(\d{4}-\d{2}-\d{2})(?:\s|$)/
const ZAHL = /^\d+(?:[.,]\d+)?$/
const SPANNE = /^(\d+(?:[.,]\d+)?)[ \t]*[–-][ \t]*(\d+(?:[.,]\d+)?)$/
const LEER_ZELLE = new Set(['–', '-'])
const TRENN_ZELLE = /^:?-{3,}:?$/

/**
 * true, wenn der Text ein gültiges Kalenderdatum JJJJ-MM-TT ist (kein 2026-02-30).
 * @param text - Kandidat
 * @returns boolean
 */
export function istIsoDatum(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false
  const datum = new Date(`${text}T00:00:00Z`)
  return !Number.isNaN(datum.getTime()) && datum.toISOString().slice(0, 10) === text
}

/**
 * Zahl aus einer Zelle (Komma oder Punkt).
 * @param text - z. B. '0,75'
 * @returns Zahl oder null
 */
function leseZahl(text: string): number | null {
  return ZAHL.test(text) ? Number(text.replace(',', '.')) : null
}

/**
 * Liest eine Schätzungszelle: `–`/`-` (keine), `x` oder `min–max`.
 * @param text - Zelle
 * @returns { ok, schaetzung } oder { ok: false } bei Formfehler
 */
export function leseSchaetzung(text: string): { ok: true; schaetzung: Schaetzung | null } | { ok: false } {
  if (LEER_ZELLE.has(text)) return { ok: true, schaetzung: null }
  const einzeln = leseZahl(text)
  if (einzeln !== null) return { ok: true, schaetzung: { min: einzeln, max: einzeln } }
  const spanne = SPANNE.exec(text)
  if (spanne === null) return { ok: false }
  return { ok: true, schaetzung: { min: Number(spanne[1].replace(',', '.')), max: Number(spanne[2].replace(',', '.')) } }
}

/**
 * Zeilen des Abschnitts `## Workstreams` (exakte Überschrift, bis zur nächsten `## `-Zeile).
 * @param zeilen - Akte in Zeilen (ohne Zeilenende)
 * @returns { start, zeilen } (start = Zeilennummer der Überschrift, 1-basiert) oder null
 */
function leseWorkstreamAbschnitt(zeilen: string[]): { start: number; zeilen: string[] } | null {
  const kopf = zeilen.findIndex((zeile) => /^##[ \t]+Workstreams[ \t]*$/.test(zeile))
  if (kopf === -1) return null
  const rest = zeilen.slice(kopf + 1)
  const ende = rest.findIndex((zeile) => /^##(?:\s|$)/.test(zeile))
  return { start: kopf + 1, zeilen: ende === -1 ? rest : rest.slice(0, ende) }
}

/**
 * Zellen einer Tabellenzeile (ohne die äußeren `|`, getrimmt).
 * @param zeile - Zeile, beginnt mit `|`
 * @returns Zellen oder null, wenn die Zeile nicht mit `|` endet
 */
function zellen(zeile: string): string[] | null {
  const getrimmt = zeile.trim()
  if (!getrimmt.startsWith('|') || !getrimmt.endsWith('|') || getrimmt.length < 2) return null
  return getrimmt
    .slice(1, -1)
    .split('|')
    .map((zelle) => zelle.trim())
}

/**
 * Liest eine Datumszelle (`–` oder ISO).
 * @param text - Zelle
 * @returns { ok, datum } oder { ok: false }
 */
function leseDatumZelle(text: string): { ok: true; datum: string | null } | { ok: false } {
  if (LEER_ZELLE.has(text)) return { ok: true, datum: null }
  return istIsoDatum(text) ? { ok: true, datum: text } : { ok: false }
}

/**
 * true, wenn eine Zeile wie eine Workstream-Zeile aussieht (neun Zellen, Art und Status aus den festen Listen).
 * @param zeile - Zeile
 * @returns boolean
 */
function siehtWieWorkstreamZeileAus(zeile: string): boolean {
  const z = zeile.trimStart().startsWith('|') ? zellen(zeile) : null
  return z !== null && z.length === WORKSTREAM_SPALTEN.length && (WORKSTREAM_ARTEN as readonly string[]).includes(z[1]) && (WORKSTREAM_STATUS as readonly string[]).includes(z[3])
}

/**
 * Liest den strengen Workstreams-Abschnitt.
 * @param zeilen - Akte in Zeilen
 * @returns { workstreams, befunde } — workstreams null, wenn kein strenger Abschnitt
 */
function leseWorkstreams(zeilen: string[]): { workstreams: WorkstreamEintrag[] | null; befunde: string[] } {
  const abschnitt = leseWorkstreamAbschnitt(zeilen)
  if (abschnitt === null) return { workstreams: null, befunde: [] }
  const erste = abschnitt.zeilen.findIndex((zeile) => zeile.trim() !== '')
  if (erste === -1 || !abschnitt.zeilen[erste].trimStart().startsWith('|')) return { workstreams: null, befunde: [] }

  const befunde: string[] = []
  // Verortung über die Tabellenzeile (1 = Kopf), nicht über die Dateizeile: PUT …/akte ändert Abschnitte davor, und
  // akte-schreiben.ts erkennt einen schon vorher vorhandenen Befund am gleichen Text (code-reviewer M1, B5b-1a).
  const ort = (index: number) => `## Workstreams, Tabellenzeile ${index + 1}`
  const tabelle: string[] = []
  for (let i = erste; i < abschnitt.zeilen.length && abschnitt.zeilen[i].trimStart().startsWith('|'); i++) tabelle.push(abschnitt.zeilen[i])
  // Eine Leerzeile oder Prosa mitten in der Tabelle beendet sie — folgt danach noch eine Zeile, die wie eine Workstream-Zeile
  // aussieht, fiele geplante Arbeit still aus der Prognose (qa 3, code-reviewer H3).
  const rest = abschnitt.zeilen.slice(erste + tabelle.length)
  if (rest.some((zeile) => zeile.trim() === WORKSTREAM_KOPF || siehtWieWorkstreamZeileAus(zeile))) befunde.push('## Workstreams: die Tabelle ist durch eine Leerzeile oder Prosa unterbrochen — danach steht noch eine Workstream-Zeile')

  if (tabelle[0].trim() !== WORKSTREAM_KOPF) return { workstreams: [], befunde: [...befunde, `${ort(0)}: Kopfzeile muss genau „${WORKSTREAM_KOPF}“ sein`] }
  const trenner = tabelle.length > 1 ? zellen(tabelle[1]) : null
  if (trenner === null || trenner.length !== WORKSTREAM_SPALTEN.length || !trenner.every((zelle) => TRENN_ZELLE.test(zelle))) {
    return { workstreams: [], befunde: [...befunde, `${ort(1)}: Trennzeile mit ${WORKSTREAM_SPALTEN.length} Zellen „---“ fehlt`] }
  }

  const workstreams: WorkstreamEintrag[] = []
  const ids = new Set<string>()
  for (let i = 2; i < tabelle.length; i++) {
    const wo = ort(i)
    const z = zellen(tabelle[i])
    if (z === null || z.length !== WORKSTREAM_SPALTEN.length) {
      befunde.push(`${wo}: genau ${WORKSTREAM_SPALTEN.length} Zellen erwartet${z === null ? ' (Zeile endet nicht mit |)' : `, ${z.length} gefunden`}`)
      continue
    }
    const [id, art, titel, status, schaetzungText, istText, begonnenText, abgenommenText, notiz] = z
    const vorher = befunde.length
    if (id === '') befunde.push(`${wo}: ID fehlt`)
    else if (ids.has(id)) befunde.push(`${wo}: ID „${id}“ doppelt`)
    ids.add(id)
    if (!(WORKSTREAM_ARTEN as readonly string[]).includes(art)) befunde.push(`${wo}: Art „${art}“ unbekannt (${WORKSTREAM_ARTEN.join(' | ')})`)
    if (!(WORKSTREAM_STATUS as readonly string[]).includes(status)) befunde.push(`${wo}: Status „${status}“ unbekannt (${WORKSTREAM_STATUS.join(' | ')})`)
    const schaetzung = leseSchaetzung(schaetzungText)
    if (!schaetzung.ok) befunde.push(`${wo}: Schätzung „${schaetzungText}“ — erlaubt „–“, „x“ oder „min–max“`)
    else if (schaetzung.schaetzung !== null && schaetzung.schaetzung.min > schaetzung.schaetzung.max) befunde.push(`${wo}: Schätzung min > max („${schaetzungText}“)`)
    const ist = LEER_ZELLE.has(istText) ? null : leseZahl(istText)
    if (ist === null && !LEER_ZELLE.has(istText)) befunde.push(`${wo}: Ist AT „${istText}“ — erlaubt „–“ oder eine Zahl`)
    const begonnen = leseDatumZelle(begonnenText)
    if (!begonnen.ok) befunde.push(`${wo}: Begonnen „${begonnenText}“ — erlaubt „–“ oder JJJJ-MM-TT`)
    const abgenommen = leseDatumZelle(abgenommenText)
    if (!abgenommen.ok) befunde.push(`${wo}: Abgenommen „${abgenommenText}“ — erlaubt „–“ oder JJJJ-MM-TT`)
    else if (status === 'erledigt' && abgenommen.datum === null) befunde.push(`${wo}: Status erledigt ohne Abgenommen-Datum`)
    else if (begonnen.ok && begonnen.datum !== null && abgenommen.datum !== null && begonnen.datum > abgenommen.datum) befunde.push(`${wo}: Begonnen liegt nach Abgenommen`)
    if (befunde.length > vorher || !schaetzung.ok || !begonnen.ok || !abgenommen.ok) continue
    workstreams.push({
      id,
      art: art as WorkstreamArt,
      titel,
      status: status as WorkstreamStatus,
      schaetzung: schaetzung.schaetzung,
      ist,
      begonnen: begonnen.datum,
      abgenommen: abgenommen.datum,
      notiz,
    })
  }
  return { workstreams, befunde }
}

/**
 * Liest die Planungsdaten einer Akte (Regeln im Dateikopf). Formfehler stehen in befunde, fehlerhafte Zeilen fehlen in
 * workstreams.
 * @param inhalt - Text der Akte (LF oder CRLF)
 * @returns Planung
 */
export function lesePlanung(inhalt: string): Planung {
  const befunde: string[] = []
  const prioritaetTreffer = PRIORITAET_ZEILE.exec(inhalt.replace(/\r\n/g, '\n'))
  let prioritaet: AktenPrioritaet | null = null
  if (prioritaetTreffer !== null) {
    if ((PRIORITAETEN as readonly string[]).includes(prioritaetTreffer[1])) prioritaet = prioritaetTreffer[1] as AktenPrioritaet
    else befunde.push(`Priorität „${prioritaetTreffer[1]}“ unbekannt (${PRIORITAETEN.join(' | ')})`)
  }
  const abgenommenTreffer = ABGENOMMEN_ZEILE.exec(inhalt.replace(/\r\n/g, '\n'))
  let abgenommen: string | null = null
  if (abgenommenTreffer !== null) {
    const datum = ISO_ANFANG.exec(abgenommenTreffer[1])
    if (datum !== null && istIsoDatum(datum[1])) abgenommen = datum[1]
    else befunde.push(`Abgenommen „${abgenommenTreffer[1]}“ — der Wert muss mit einem Datum JJJJ-MM-TT beginnen`)
  }
  const { workstreams, befunde: tabellenBefunde } = leseWorkstreams(inhalt.split(/\r?\n/))
  return { prioritaet, abgenommen, workstreams, workstreams_fehlerhaft: tabellenBefunde.length > 0, befunde: [...befunde, ...tabellenBefunde] }
}

/**
 * Prüft die Planungsdaten für das Feature-Akte-Gate: Formfehler plus die Pflicht der Abgenommen-Zeile bei Status
 * ABGESCHLOSSEN und strengem Abschnitt.
 * @param inhalt - Text der Akte
 * @param status - gelesener Feature-Status (leseFeatureStatus)
 * @returns Befunde; leer = gültig
 */
export function pruefePlanung(inhalt: string, status: string | null): string[] {
  const planung = lesePlanung(inhalt)
  const befunde = [...planung.befunde]
  const hatZeile = ABGENOMMEN_ZEILE.test(inhalt.replace(/\r\n/g, '\n'))
  if (status === 'ABGESCHLOSSEN' && planung.workstreams !== null && !hatZeile) befunde.push('Status ABGESCHLOSSEN mit strengem Abschnitt „## Workstreams“ verlangt die Zeile „Abgenommen: JJJJ-MM-TT“')
  return befunde
}
