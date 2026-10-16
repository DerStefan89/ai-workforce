/**
 * Datei: src/rueckfrage/protokoll.ts
 *
 * Zweck: Reine Regel des Rückfrage-Protokolls (F45 B2b-3b-1b, features/F45/plan-b2b3b1b-v2.md). Das Protokoll eines Laufs ist
 * das Kern-Artefakt `rueckfragen-<laufId>` im Kontrollzustand (eine Version je Entscheidung, alle Einträge bis dahin; Schema
 * schemas/kontrollzustand-rueckfragen-payload.schema.json). Vier Teile:
 * - `RUECKFRAGE_PROTOKOLL_ARTEN` + `validiereRueckfrageProtokoll`: einzige Quelle der Arten (A5: eigene für Fragen) und der
 *   handgeschriebene Validator (Muster validiereAenderungsuebersichtDaten, kein ajv).
 * - `neutralisiereText`: Arbeitsordner, Temp und Home in Befehl/Frage/Antwort durch Platzhalter ersetzen (roh, mit `/`,
 *   JSON-escaped), bevor das Protokoll in den Kontrollzustand geht. Kappt nicht (A3: kappen erst nach dem Maskieren).
 * - `gleicheAblehnungenAb` (Abgleich A6): sind alle `permission_denials` eines Laufs allein von Stefan abgelehnt? Nur bei
 *   gültigem Protokoll desselben Laufs, eindeutiger `tool_use_id` je Ablehnung, genau einem Eintrag je ID mit Art
 *   `stefan_abgelehnt`, gleichem `tool_name` und gleichem Input-Hash. Alles andere ⇒ `nicht_nur_stefan` (fail closed;
 *   ungültiges Protokoll gilt als fehlend). Der Abgleich selbst vergleicht nur mit `===`, Set und Map — kein Textmuster
 *   über Ablehnungsdaten (Gate f7 (a) sinngemäß, H4); der einzige Regex (64 Hex-Zeichen) steht im Validator.
 * - `bestaetigeProtokoll` (B2b-3b-2a, F-1128 (1)): die Datei gilt nur, wenn sie zum Speicherstand der Vermittlung passt (vier
 *   Felder je Eintrag) — der Speicher ist die Quelle der Wahrheit, die Datei das Audit.
 * Rein, kein I/O.
 *
 * Grenze (ARCHITECTURE §4, DEKLARIERT): der Abgleich glaubt dem Speicher der Vermittlung, dass „stefan_abgelehnt“ von Stefan
 * kommt — die Antwort-Route ist für jeden lokalen Prozess erreichbar (§3 „Nur Stefan antwortet — DEKLARIERT“). Eine gefälschte
 * Protokoll-Datei allein reicht seit B2b-3b-2a nicht mehr (bestaetigeProtokoll, F-1128 (1)).
 *
 * Wird aufgerufen von: src/result-evaluator/index.ts (Abgleich), src/execution-controller/index.ts (bestaetigeProtokoll),
 * scripts/leitstand/rueckfrage-protokoll.mjs (Schreiben), scripts/leitstand/rueckfrage-vermittlung.mjs (Arten, Grenzen),
 * scripts/check-f45-b2b3b1b-auswertung.mjs, scripts/check-f45-b2b3b2a-absicherung.mjs, src/rueckfrage/protokoll.test.ts.
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

/** Platzhalter für einen Werkzeugnamen über PROTOKOLL_GRENZEN.toolName — Schreiber und Speicherstand der Vermittlung gleich (B2b-3b-2a). */
export const TOOL_NAME_ZU_LANG = '<zu lang>'

/**
 * Werkzeugname, wie er im Protokoll und im Speicherstand der Vermittlung steht: über PROTOKOLL_GRENZEN.toolName (oder kein Text)
 * ⇒ TOOL_NAME_ZU_LANG, nie gekürzt (passt dann nie zu einer Ablehnung ⇒ VERWEIGERT). Einzige Quelle für Schreiber und Vermittlung.
 * @param name - tool_name der Anfrage
 * @returns Name oder Platzhalter
 */
export function toolNameFuerProtokoll(name: unknown): string {
  return typeof name === 'string' && name.length <= PROTOKOLL_GRENZEN.toolName ? name : TOOL_NAME_ZU_LANG
}

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

/** Ergebnis von bestaetigeProtokoll: die Datei (bestätigt) oder ein Grund; `leer` = Lauf ohne Rückfrage (kein Befund). */
export type BestaetigungErgebnis = { ok: true; daten: unknown } | { ok: false; grund: string; leer?: true }

/** Die vier Felder, die Speicher und Datei je Eintrag gleich tragen müssen (alles andere ist in der Datei aufbereitet, A3). */
const VERGLEICHS_FELDER = ['tool_use_id', 'tool_name', 'input_hash', 'art'] as const

/**
 * F45 B2b-3b-2a (F-1128 (1)): bestätigt die Protokoll-Datei gegen den Speicherstand der Vermittlung (`eintraegeVon`, gleicher
 * Prozess) — der Speicher ist die Quelle der Wahrheit, die Datei das Audit. Nur bei gleicher Länge und je Index gleichen
 * `tool_use_id`, `tool_name`, `input_hash`, `art` (`===`) gilt die Datei; alles andere ⇒ ok:false mit Grund (fail closed). Schema
 * und `lauf_id` prüft danach der Abgleich A6 (`gleicheAblehnungenAb`). Wirft nie, auch nicht an einer manipulierten Datei
 * (Delta D1).
 * @param datei - daten der letzten Version von `rueckfragen-<laufId>` (oder null)
 * @param speicher - Projektion der Vermittlung (oder null/undefined: Lauf nicht offen, Neustart)
 * @returns { ok: true, daten: datei } oder { ok: false, grund, leer? }
 */
export function bestaetigeProtokoll(datei: unknown, speicher: unknown): BestaetigungErgebnis {
  if (!Array.isArray(speicher)) return { ok: false, grund: 'Speicher fehlt (Lauf nicht offen)' }
  if (!istObjekt(datei) || !Array.isArray(datei.eintraege)) {
    // Nur eine wirklich fehlende Datei bei leerem Speicher ist der Normalfall (Delta D2); eine kaputte Datei wird gemeldet.
    return speicher.length === 0 && (datei === null || datei === undefined) ? { ok: false, grund: 'keine Rückfrage im Lauf', leer: true } : { ok: false, grund: 'Datei fehlt oder ist kein Protokoll' }
  }
  const eintraege: unknown[] = datei.eintraege
  if (eintraege.length !== speicher.length) return { ok: false, grund: `Länge abweichend (Speicher ${speicher.length}, Datei ${eintraege.length})` }
  for (let i = 0; i < speicher.length; i++) {
    const s: unknown = speicher[i]
    const d = eintraege[i]
    if (!istObjekt(s) || !istObjekt(d)) return { ok: false, grund: `Eintrag ${i} ist kein Objekt` }
    const feld = VERGLEICHS_FELDER.find((f) => s[f] !== d[f])
    if (feld !== undefined) return { ok: false, grund: `Eintrag ${i} weicht ab (${feld})` }
  }
  return { ok: true, daten: datei }
}
