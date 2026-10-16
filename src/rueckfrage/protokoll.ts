/**
 * Datei: src/rueckfrage/protokoll.ts
 *
 * Zweck: Reine Regel des Rückfrage-Protokolls (F45 B2b-3b-1b, features/F45/plan-b2b3b1b-v2.md). Das Protokoll eines Laufs ist
 * das Kern-Artefakt `rueckfragen-<laufId>` im Kontrollzustand (eine Version je Entscheidung, alle Einträge bis dahin; Schema
 * schemas/kontrollzustand-rueckfragen-payload.schema.json). Drei Teile:
 * - `RUECKFRAGE_PROTOKOLL_ARTEN` + `validiereRueckfrageProtokoll`: einzige Quelle der Arten (A5: eigene für Fragen) und der
 *   handgeschriebene Validator (Muster validiereAenderungsuebersichtDaten, kein ajv).
 * - `neutralisiereText`: Arbeitsordner, Temp und Home in Befehl/Frage/Antwort durch Platzhalter ersetzen (roh, mit `/`,
 *   JSON-escaped), bevor das Protokoll in den Kontrollzustand geht. Kappt nicht (A3: kappen erst nach dem Maskieren).
 * - `gleicheAblehnungenAb` (Abgleich A6): sind alle `permission_denials` eines Laufs allein von Stefan abgelehnt? Nur bei
 *   gültigem Protokoll desselben Laufs, eindeutiger `tool_use_id` je Ablehnung, genau einem Eintrag je ID mit Art
 *   `stefan_abgelehnt`, gleichem `tool_name` und gleichem Input-Hash. Alles andere ⇒ `nicht_nur_stefan` (fail closed;
 *   ungültiges Protokoll gilt als fehlend). Der Abgleich selbst vergleicht nur mit `===`, Set und Map — kein Textmuster
 *   über Ablehnungsdaten (Gate f7 (a) sinngemäß, H4); der einzige Regex (64 Hex-Zeichen) steht im Validator.
 * Rein, kein I/O.
 *
 * Grenze (ARCHITECTURE §4, DEKLARIERT): der Abgleich glaubt dem Protokoll, dass „stefan_abgelehnt“ von Stefan kommt — die
 * Antwort-Route ist für jeden lokalen Prozess erreichbar (§3 „Nur Stefan antwortet — DEKLARIERT“), und die Protokoll-Datei
 * im Kontrollzustand ist für lokal ausgeführten Code schreibbar (keine Signatur). Pflichtpunkt vor dem Einschalten: F-1128.
 *
 * Wird aufgerufen von: src/result-evaluator/index.ts (Abgleich), scripts/leitstand/rueckfrage-protokoll.mjs (Schreiben),
 * scripts/leitstand/rueckfrage-vermittlung.mjs (Arten), scripts/check-f45-b2b3b1b-auswertung.mjs, src/rueckfrage/protokoll.test.ts.
 */

import { kanonischesJson, sha256Hex } from '../checkpoint-store/index.ts'

/** Protokoll-Arten (Rechte: auto_deny … lauf_beendet; Fragen: frage_beantwortet, frage_ohne_antwort). */
export const RUECKFRAGE_PROTOKOLL_ARTEN = Object.freeze([
  'auto_deny',
  'stefan_erlaubt',
  'stefan_abgelehnt',
  'zeitueberschreitung',
  'lauf_beendet',
  'frage_beantwortet',
  'frage_ohne_antwort',
] as const)

/** Feldgrenzen (Zeichen) — dieselben wie im Schema. */
export const PROTOKOLL_GRENZEN = Object.freeze({ id: 200, toolName: 200, grund: 500, text: 2000 })

/** Felder eines Eintrags (additionalProperties: false). */
const EINTRAG_PFLICHT = ['tool_use_id', 'tool_name', 'input_hash', 'art', 'grund', 'zeit'] as const
const EINTRAG_TEXTE = ['befehl', 'frage', 'antwort'] as const
const EINTRAG_FELDER = new Set<string>([...EINTRAG_PFLICHT, ...EINTRAG_TEXTE])
const OBEN_FELDER = new Set(['rueckfragen_schema', 'lauf_id', 'eintraege'])
const ARTEN = new Set<string>(RUECKFRAGE_PROTOKOLL_ARTEN)
const HEX64 = /^[0-9a-f]{64}$/

function istObjekt(wert: unknown): wert is Record<string, unknown> {
  return typeof wert === 'object' && wert !== null && !Array.isArray(wert)
}

const istText = (wert: unknown, min: number, max: number): boolean => typeof wert === 'string' && wert.length >= min && wert.length <= max

/**
 * Prüft einen Eintrag des Protokolls.
 * @param eintrag - geparster Eintrag
 * @param stelle - Index (für die Meldung)
 * @returns Regelverletzungen
 */
function validiereEintrag(eintrag: unknown, stelle: number): string[] {
  const vor = `eintraege[${stelle}]`
  if (!istObjekt(eintrag)) return [`${vor} ist kein Objekt`]
  const verstoesse: string[] = []
  for (const feld of Object.keys(eintrag)) {
    if (!EINTRAG_FELDER.has(feld)) verstoesse.push(`${vor}: unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  for (const feld of EINTRAG_PFLICHT) {
    if (!(feld in eintrag)) verstoesse.push(`${vor}: Pflichtfeld '${feld}' fehlt`)
  }
  if ('tool_use_id' in eintrag && eintrag.tool_use_id !== null && !istText(eintrag.tool_use_id, 1, PROTOKOLL_GRENZEN.id)) verstoesse.push(`${vor}: 'tool_use_id' muss null oder ein Text mit 1–${PROTOKOLL_GRENZEN.id} Zeichen sein`)
  if ('tool_name' in eintrag && !istText(eintrag.tool_name, 0, PROTOKOLL_GRENZEN.toolName)) verstoesse.push(`${vor}: 'tool_name' muss ein Text mit höchstens ${PROTOKOLL_GRENZEN.toolName} Zeichen sein`)
  if ('input_hash' in eintrag && !(typeof eintrag.input_hash === 'string' && HEX64.test(eintrag.input_hash))) verstoesse.push(`${vor}: 'input_hash' muss 64 Hex-Zeichen haben`)
  if ('art' in eintrag && !(typeof eintrag.art === 'string' && ARTEN.has(eintrag.art))) verstoesse.push(`${vor}: 'art' muss eine von ${RUECKFRAGE_PROTOKOLL_ARTEN.join(', ')} sein`)
  if ('grund' in eintrag && !istText(eintrag.grund, 0, PROTOKOLL_GRENZEN.grund)) verstoesse.push(`${vor}: 'grund' muss ein Text mit höchstens ${PROTOKOLL_GRENZEN.grund} Zeichen sein`)
  if ('zeit' in eintrag && !istText(eintrag.zeit, 1, 100)) verstoesse.push(`${vor}: 'zeit' muss ein nicht leerer Text sein`)
  for (const feld of EINTRAG_TEXTE) {
    if (feld in eintrag && !istText(eintrag[feld], 0, PROTOKOLL_GRENZEN.text)) verstoesse.push(`${vor}: '${feld}' muss ein Text mit höchstens ${PROTOKOLL_GRENZEN.text} Zeichen sein`)
  }
  return verstoesse
}

/**
 * Prüft ein geparstes Protokoll gegen schemas/kontrollzustand-rueckfragen-payload.schema.json (handgeschrieben, beide Stellen
 * synchron halten).
 * @param daten - geparstes, sonst unbekanntes Objekt (daten des Kern-Artefakts)
 * @returns Regelverletzungen; leer = gültig
 */
export function validiereRueckfrageProtokoll(daten: unknown): string[] {
  if (!istObjekt(daten)) return ['Wurzel ist kein Objekt']
  const verstoesse: string[] = []
  for (const feld of Object.keys(daten)) {
    if (!OBEN_FELDER.has(feld)) verstoesse.push(`unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  if (daten.rueckfragen_schema !== 'v0') verstoesse.push("'rueckfragen_schema' muss 'v0' sein")
  if (!istText(daten.lauf_id, 1, 500)) verstoesse.push("'lauf_id' muss ein nicht leerer Text sein")
  if (!Array.isArray(daten.eintraege)) verstoesse.push("'eintraege' muss eine Liste sein")
  else daten.eintraege.forEach((eintrag, i) => verstoesse.push(...validiereEintrag(eintrag, i)))
  return verstoesse
}

/** Orte, die im Protokoll nicht stehen dürfen; `plattform` steuert den Vergleich (Standard: process.platform). */
export interface NeutralisierOrte {
  arbeitsordner: string
  temp: string
  home: string
  plattform?: 'win32' | 'posix'
}

/** Ersetzt jedes Vorkommen von `such` in `text` (optional ohne Groß-/Kleinschreibung). */
function ersetzeAlle(text: string, such: string, durch: string, ohneGross: boolean): string {
  if (such.length === 0) return text
  const vergleich = ohneGross ? text.toLowerCase() : text
  const gesucht = ohneGross ? such.toLowerCase() : such
  let ergebnis = ''
  let ab = 0
  for (let treffer = vergleich.indexOf(gesucht, ab); treffer !== -1; treffer = vergleich.indexOf(gesucht, ab)) {
    ergebnis += text.slice(ab, treffer) + durch
    ab = treffer + such.length
  }
  return ergebnis + text.slice(ab)
}

/**
 * Ersetzt Arbeitsordner, Temp und Home (in dieser Reihenfolge — der Arbeitsordner liegt oft unter Temp oder Home) durch
 * `<ARBEITSORDNER>`, `<TEMP>`, `<HOME>`; je roh, mit `/` statt `\` und JSON-escaped (`\\`). win32 ohne Groß-/Kleinschreibung.
 * Kappt nicht (A3). Leere Orte werden übersprungen.
 * @param text - Befehl, Frage oder Antwort (roh)
 * @param orte - Arbeitsordner, Temp, Home
 * @returns neutralisierter Text
 */
export function neutralisiereText(text: string, orte: NeutralisierOrte): string {
  const ohneGross = (orte.plattform ?? (process.platform === 'win32' ? 'win32' : 'posix')) === 'win32'
  let ergebnis = text
  for (const [ort, platzhalter] of [
    [orte.arbeitsordner, '<ARBEITSORDNER>'],
    [orte.temp, '<TEMP>'],
    [orte.home, '<HOME>'],
  ] as const) {
    if (typeof ort !== 'string' || ort.length === 0) continue
    const schreibweisen = [...new Set([ort.replaceAll('\\', '\\\\'), ort, ort.replaceAll('\\', '/')])]
    for (const schreibweise of schreibweisen) ergebnis = ersetzeAlle(ergebnis, schreibweise, platzhalter, ohneGross)
  }
  return ergebnis
}

/** Ergebnis des Abgleichs A6. */
export type AbgleichErgebnis = { art: 'nur_stefan'; anzahl: number } | { art: 'nicht_nur_stefan' }

const NICHT_NUR_STEFAN: AbgleichErgebnis = Object.freeze({ art: 'nicht_nur_stefan' })

/**
 * Abgleich A6: sind ALLE Ablehnungen eines Laufs allein von Stefan abgelehnt? Fail closed.
 * @param denials - permission_denials des Ergebnisobjekts ({ tool_name, tool_use_id, tool_input })
 * @param protokoll - daten der letzten Version von `rueckfragen-<laufId>` (oder null/ungültig = fehlend)
 * @param laufId - Lauf, zu dem das Protokoll gehören muss (H2)
 * @returns nur_stefan mit Anzahl oder nicht_nur_stefan
 */
export function gleicheAblehnungenAb(denials: readonly unknown[], protokoll: unknown, laufId: string): AbgleichErgebnis {
  if (validiereRueckfrageProtokoll(protokoll).length > 0) return NICHT_NUR_STEFAN
  const geprueft = protokoll as { lauf_id: string; eintraege: { tool_use_id: string | null; tool_name: string; input_hash: string; art: string }[] }
  if (geprueft.lauf_id !== laufId || denials.length === 0) return NICHT_NUR_STEFAN
  const jeId = new Map<string, { anzahl: number; eintrag: (typeof geprueft.eintraege)[number] }>()
  for (const eintrag of geprueft.eintraege) {
    if (eintrag.tool_use_id === null) continue
    const bisher = jeId.get(eintrag.tool_use_id)
    jeId.set(eintrag.tool_use_id, { anzahl: (bisher?.anzahl ?? 0) + 1, eintrag })
  }
  const gesehen = new Set<string>()
  for (const denial of denials) {
    if (!istObjekt(denial)) return NICHT_NUR_STEFAN
    const id = denial.tool_use_id
    if (typeof id !== 'string' || id.length === 0 || gesehen.has(id)) return NICHT_NUR_STEFAN
    gesehen.add(id)
    const treffer = jeId.get(id)
    if (treffer === undefined || treffer.anzahl !== 1) return NICHT_NUR_STEFAN
    if (treffer.eintrag.art !== 'stefan_abgelehnt' || treffer.eintrag.tool_name !== denial.tool_name) return NICHT_NUR_STEFAN
    if (treffer.eintrag.input_hash !== sha256Hex(kanonischesJson(denial.tool_input ?? null))) return NICHT_NUR_STEFAN
  }
  return { art: 'nur_stefan', anzahl: denials.length }
}
