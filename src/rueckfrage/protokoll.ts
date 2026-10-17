/**
 * Datei: src/rueckfrage/protokoll.ts
 *
 * Zweck: Reine Regel des Rückfrage-Protokolls (F45 B2b-3b-1b, features/F45/plan-b2b3b1b-v2.md). Das Protokoll eines Laufs ist
 * das Kern-Artefakt `rueckfragen-<laufId>` im Kontrollzustand (seit B2b-3b-2b-1a Schema v1: eine Version je Entscheidung mit nur
 * den neuen Einträgen ab Index `ab`; Schema schemas/kontrollzustand-rueckfragen-payload.schema.json). Fünf Teile:
 * - `RUECKFRAGE_PROTOKOLL_ARTEN` + `validiereRueckfrageProtokoll`: einzige Quelle der Arten (A5: eigene für Fragen) und der
 *   handgeschriebene Validator (Muster validiereAenderungsuebersichtDaten, kein ajv).
 * - `neutralisiereText`: Arbeitsordner, Temp und Home in Befehl/Frage/Antwort durch Platzhalter ersetzen (roh, mit `/`,
 *   JSON-escaped), bevor das Protokoll in den Kontrollzustand geht. Kappt nicht (A3: kappen erst nach dem Maskieren).
 * - `gleicheAblehnungenAb` (Abgleich A6): sind alle `permission_denials` eines Laufs allein von Stefan abgelehnt? Nur bei
 *   gültigem Protokoll desselben Laufs, eindeutiger `tool_use_id` je Ablehnung, genau einem Eintrag je ID mit Art
 *   `stefan_abgelehnt`, gleichem `tool_name` und gleichem Input-Hash, und (B2b-3b-2b-1b, F-1128 R1) jedes tool_result der ID im
 *   Rohstrom trägt `is_error` und genau den eindeutigen Ablehnungstext (Hash `ablehnung_hash`). Alles andere ⇒ `nicht_nur_stefan` (fail closed;
 *   ungültiges Protokoll gilt als fehlend). Der Abgleich selbst vergleicht nur mit `===`, Set und Map — kein Textmuster
 *   über Ablehnungsdaten (Gate f7 (a) sinngemäß, H4); der einzige Regex (64 Hex-Zeichen) steht im Validator.
 * - `bestaetigeProtokoll` (B2b-3b-2a, F-1128 (1)): die Datei gilt nur, wenn sie zum Speicherstand der Vermittlung passt (fünf
 *   Felder je Eintrag, seit B2b-3b-2b-1b mit `ablehnung_hash`) — der Speicher ist die Quelle der Wahrheit, die Datei das Audit.
 * - `setzeProtokollZusammen` (B2b-3b-2b-1a): fügt die Versionen (je nur der Zuwachs) lückenlos zu einem Protokoll mit `ab: 0`
 *   zusammen; Lücke, fremde lauf_id oder ungültige Version ⇒ ok:false (fail closed).
 * Rein, kein I/O.
 *
 * Grenze (ARCHITECTURE §4, DEKLARIERT): der Abgleich glaubt dem Speicher der Vermittlung, dass „stefan_abgelehnt“ von Stefan
 * kommt — die Antwort-Route ist für jeden lokalen Prozess erreichbar (§3 „Nur Stefan antwortet — DEKLARIERT“). Eine gefälschte
 * Protokoll-Datei allein reicht seit B2b-3b-2a nicht mehr (bestaetigeProtokoll, F-1128 (1)); eine statische Sperre „waschen“ (ID
 * nachträglich stellen und ablehnen) seit B2b-3b-2b-1b nicht mehr (R1: deren tool_result schreibt die CLI mit eigenem Text).
 *
 * Wird aufgerufen von: src/result-evaluator/index.ts (Abgleich), src/execution-controller/index.ts (bestaetigeProtokoll,
 * setzeProtokollZusammen), scripts/leitstand/rueckfrage-protokoll.mjs (Schreiben), scripts/leitstand/rueckfrage-vermittlung.mjs
 * (Arten, Grenzen), scripts/check-f45-b2b3b1b-auswertung.mjs, scripts/check-f45-b2b3b2a-absicherung.mjs,
 * scripts/check-f45-b2b3b2b1a-rest.mjs, scripts/check-f45-b2b3b2b1b-r1.mjs, src/rueckfrage/protokoll.test.ts. Seit B2b-3b-2b-2a-1 trägt
 * „nicht nur Stefan“ einen festen Grund (ABGLEICH_GRUENDE) für daten der Terminalmarke.
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

/** E-B7 (B2b-3b-2b-1a): Herkunft einer Antwort — aus dem Browser (Sec-Fetch-Site same-origin bzw. passender Origin) oder nicht. Hinweis, kein Schutz. */
export const RUECKFRAGE_HERKUENFTE = Object.freeze(['browser', 'nicht_browser'] as const)
/** Arten, die eine Antwort sind und deshalb `herkunft` tragen dürfen (nur im Validator geprüft, im Schema als Beschreibung). */
const ANTWORT_ARTEN = new Set<string>(['stefan_erlaubt', 'stefan_abgelehnt', 'frage_beantwortet'])
const HERKUENFTE = new Set<string>(RUECKFRAGE_HERKUENFTE)

/** Felder eines Eintrags (additionalProperties: false). */
const EINTRAG_PFLICHT = ['tool_use_id', 'tool_name', 'input_hash', 'art', 'grund', 'zeit'] as const
const EINTRAG_TEXTE = ['befehl', 'frage', 'antwort'] as const
const EINTRAG_FELDER = new Set<string>([...EINTRAG_PFLICHT, ...EINTRAG_TEXTE, 'herkunft', 'ablehnung_hash'])
const OBEN_FELDER = new Set(['rueckfragen_schema', 'lauf_id', 'ab', 'eintraege'])
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
  if ('herkunft' in eintrag) {
    if (!(typeof eintrag.herkunft === 'string' && HERKUENFTE.has(eintrag.herkunft))) verstoesse.push(`${vor}: 'herkunft' muss eine von ${RUECKFRAGE_HERKUENFTE.join(', ')} sein`)
    if (!(typeof eintrag.art === 'string' && ANTWORT_ARTEN.has(eintrag.art))) verstoesse.push(`${vor}: 'herkunft' nur an einer Antwort (${[...ANTWORT_ARTEN].join(', ')})`)
  }
  // B2b-3b-2b-1b (F-1128 R1): an stefan_abgelehnt Pflicht, an jeder anderen Art verboten.
  if (eintrag.art === 'stefan_abgelehnt' && !(typeof eintrag.ablehnung_hash === 'string' && HEX64.test(eintrag.ablehnung_hash))) verstoesse.push(`${vor}: 'ablehnung_hash' (64 Hex-Zeichen) ist an stefan_abgelehnt Pflicht`)
  if (eintrag.art !== 'stefan_abgelehnt' && 'ablehnung_hash' in eintrag) verstoesse.push(`${vor}: 'ablehnung_hash' nur an stefan_abgelehnt`)
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
  if (daten.rueckfragen_schema !== 'v1') verstoesse.push("'rueckfragen_schema' muss 'v1' sein")
  if (!istText(daten.lauf_id, 1, 500)) verstoesse.push("'lauf_id' muss ein nicht leerer Text sein")
  if (!(Number.isSafeInteger(daten.ab) && (daten.ab as number) >= 0)) verstoesse.push("'ab' muss eine ganze Zahl ≥ 0 sein")
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

/**
 * B2b-3b-2b-2a-1 (F-1128 (3), qa B2b-3b-2b-1b 2): fester Grund je Ausgang „nicht nur Stefan“ — nur Beschriftung für daten der
 * Terminalmarke (`rueckfrage_abgleich`), die Reihenfolge der Prüfungen ändert er nicht.
 */
export const ABGLEICH_GRUENDE = Object.freeze([
  'protokoll_ungueltig',
  'protokoll_fremd',
  'keine_ablehnung',
  'ablehnung_ungueltig',
  'id_fehlt',
  'id_doppelt',
  'kein_eintrag',
  'eintrag_mehrfach',
  'nicht_von_stefan',
  'werkzeug_abweichend',
  'eingabe_abweichend',
  'ablehnungstext_passt_nicht',
] as const)
export type AbgleichGrund = (typeof ABGLEICH_GRUENDE)[number]

/** Ergebnis des Abgleichs A6. */
export type AbgleichErgebnis = { art: 'nur_stefan'; anzahl: number } | { art: 'nicht_nur_stefan'; grund: AbgleichGrund }

/** tool_result-Blöcke des Rohstroms je tool_use_id (ermittleToolErgebnisse, src/claude-code-gateway). */
export type ToolErgebnisse = ReadonlyMap<string, readonly { fehler: boolean; text: string | null }[]>

/**
 * B2b-3b-2b-1b (F-1128 R1): trägt JEDES tool_result der ID `is_error` und als String genau den Ablehnungstext, dessen Hash im
 * Eintrag steht? Kein tool_result, keine Map, eine andere Form oder ein abweichender Block ⇒ false. Nur `===` auf dem Hash.
 * @param ergebnisse - tool_result-Blöcke je ID (oder undefined)
 * @param id - tool_use_id der Ablehnung
 * @param ablehnungHash - ablehnung_hash des Eintrags
 * @returns true, wenn die CLI genau Stefans Text zurückgegeben hat
 */
function traegtAblehnungstext(ergebnisse: ToolErgebnisse | undefined, id: string, ablehnungHash: unknown): boolean {
  const liste = ergebnisse instanceof Map ? ergebnisse.get(id) : undefined
  if (!Array.isArray(liste) || liste.length === 0 || typeof ablehnungHash !== 'string') return false
  return liste.every((e) => e?.fehler === true && typeof e.text === 'string' && sha256Hex(e.text) === ablehnungHash)
}

/** Je Grund ein eingefrorenes Ergebnis (Advisor B10). */
const NICHT_NUR_STEFAN = Object.freeze(Object.fromEntries(ABGLEICH_GRUENDE.map((grund) => [grund, Object.freeze({ art: 'nicht_nur_stefan', grund })]))) as Readonly<Record<AbgleichGrund, AbgleichErgebnis>>

/**
 * Abgleich A6: sind ALLE Ablehnungen eines Laufs allein von Stefan abgelehnt? Fail closed.
 * @param denials - permission_denials des Ergebnisobjekts ({ tool_name, tool_use_id, tool_input })
 * @param protokoll - zusammengesetztes Protokoll von `rueckfragen-<laufId>` (`ab: 0`; oder null/ungültig = fehlend)
 * @param laufId - Lauf, zu dem das Protokoll gehören muss (H2)
 * @param ergebnisse - B2b-3b-2b-1b (R1): tool_result-Blöcke des hash-geprüften Rohstroms je ID; fehlt er ⇒ wie „kein tool_result“
 * @returns nur_stefan mit Anzahl oder nicht_nur_stefan mit Grund (ABGLEICH_GRUENDE)
 */
export function gleicheAblehnungenAb(denials: readonly unknown[], protokoll: unknown, laufId: string, ergebnisse?: ToolErgebnisse): AbgleichErgebnis {
  if (validiereRueckfrageProtokoll(protokoll).length > 0) return NICHT_NUR_STEFAN.protokoll_ungueltig
  const geprueft = protokoll as { lauf_id: string; ab: number; eintraege: { tool_use_id: string | null; tool_name: string; input_hash: string; art: string; ablehnung_hash?: string }[] }
  // B2b-3b-2b-1a: ein einzelner Zuwachs (ab > 0) ist nie ein ganzes Protokoll.
  if (geprueft.lauf_id !== laufId || geprueft.ab !== 0) return NICHT_NUR_STEFAN.protokoll_fremd
  if (denials.length === 0) return NICHT_NUR_STEFAN.keine_ablehnung
  const jeId = new Map<string, { anzahl: number; eintrag: (typeof geprueft.eintraege)[number] }>()
  for (const eintrag of geprueft.eintraege) {
    if (eintrag.tool_use_id === null) continue
    const bisher = jeId.get(eintrag.tool_use_id)
    jeId.set(eintrag.tool_use_id, { anzahl: (bisher?.anzahl ?? 0) + 1, eintrag })
  }
  const gesehen = new Set<string>()
  for (const denial of denials) {
    if (!istObjekt(denial)) return NICHT_NUR_STEFAN.ablehnung_ungueltig
    const id = denial.tool_use_id
    if (typeof id !== 'string' || id.length === 0) return NICHT_NUR_STEFAN.id_fehlt
    if (gesehen.has(id)) return NICHT_NUR_STEFAN.id_doppelt
    gesehen.add(id)
    const treffer = jeId.get(id)
    if (treffer === undefined) return NICHT_NUR_STEFAN.kein_eintrag
    if (treffer.anzahl !== 1) return NICHT_NUR_STEFAN.eintrag_mehrfach
    if (treffer.eintrag.art !== 'stefan_abgelehnt') return NICHT_NUR_STEFAN.nicht_von_stefan
    if (treffer.eintrag.tool_name !== denial.tool_name) return NICHT_NUR_STEFAN.werkzeug_abweichend
    if (treffer.eintrag.input_hash !== sha256Hex(kanonischesJson(denial.tool_input ?? null))) return NICHT_NUR_STEFAN.eingabe_abweichend
    // R1: nur wenn die CLI genau Stefans eindeutigen Text zurückgegeben hat — schließt das „Waschen“ einer statischen Sperre.
    if (!traegtAblehnungstext(ergebnisse, id, treffer.eintrag.ablehnung_hash)) return NICHT_NUR_STEFAN.ablehnungstext_passt_nicht
  }
  return { art: 'nur_stefan', anzahl: denials.length }
}

/** Ergebnis von bestaetigeProtokoll: die Datei (bestätigt) oder ein Grund; `leer` = Lauf ohne Rückfrage (kein Befund). */
export type BestaetigungErgebnis = { ok: true; daten: unknown } | { ok: false; grund: string; leer?: true }

/**
 * Die Felder, die Speicher und Datei je Eintrag gleich tragen müssen (alles andere ist in der Datei aufbereitet, A3). Seit
 * B2b-3b-2b-1b auch `ablehnung_hash` (nur an stefan_abgelehnt, sonst auf beiden Seiten undefined) — sonst könnte eine gefälschte
 * Datei den nachrechenbaren Hash des statischen CLI-Texts eintragen.
 */
const VERGLEICHS_FELDER = ['tool_use_id', 'tool_name', 'input_hash', 'art', 'ablehnung_hash'] as const

/**
 * F45 B2b-3b-2a (F-1128 (1)): bestätigt die Protokoll-Datei gegen den Speicherstand der Vermittlung (`eintraegeVon`, gleicher
 * Prozess) — der Speicher ist die Quelle der Wahrheit, die Datei das Audit. Nur bei gleicher Länge und je Index gleichen
 * `tool_use_id`, `tool_name`, `input_hash`, `art`, `ablehnung_hash` (`===`) gilt die Datei; alles andere ⇒ ok:false mit Grund (fail closed). Schema
 * und `lauf_id` prüft danach der Abgleich A6 (`gleicheAblehnungenAb`). Wirft nie, auch nicht an einer manipulierten Datei
 * (Delta D1).
 * @param datei - zusammengesetztes Protokoll (setzeProtokollZusammen), null (keine Datei) oder { ungueltig: grund } (nicht
 *   zusammensetzbar; B2b-3b-2b-1a, Delta D5 — wird auch bei leerem Speicher gemeldet)
 * @param speicher - Projektion der Vermittlung (oder null/undefined: Lauf nicht offen, Neustart)
 * @returns { ok: true, daten: datei } oder { ok: false, grund, leer? }
 */
export function bestaetigeProtokoll(datei: unknown, speicher: unknown): BestaetigungErgebnis {
  if (!Array.isArray(speicher)) return { ok: false, grund: 'Speicher fehlt (Lauf nicht offen)' }
  if (istObjekt(datei) && typeof datei.ungueltig === 'string') return { ok: false, grund: `Datei nicht zusammensetzbar (${datei.ungueltig})` }
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

/** Ergebnis von setzeProtokollZusammen: das ganze Protokoll (`ab: 0`), null ohne Version, oder ein Grund. */
export type ZusammensetzungErgebnis = { ok: true; daten: unknown } | { ok: false; grund: string }

/**
 * F45 B2b-3b-2b-1a (Speichergröße): setzt die Versionen von `rueckfragen-<laufId>` — je Version nur die neuen Einträge ab Index
 * `ab` — zu einem Protokoll `{ rueckfragen_schema: 'v1', lauf_id, ab: 0, eintraege }` zusammen. Jede Version muss gültig sein
 * (Schema v1), zum Lauf gehören und lückenlos anschließen (`ab` = bisherige Länge); sonst ok:false mit Grund (fail closed).
 * Keine Version ⇒ ok mit null (Lauf ohne Rückfrage). Wirft nie.
 * @param versionen - Versionen aufsteigend (listeVersionen), je mit `daten` und `versionSequenz`
 * @param laufId - Lauf, zu dem jede Version gehören muss
 * @returns { ok: true, daten } oder { ok: false, grund }
 */
export function setzeProtokollZusammen(versionen: readonly { versionSequenz?: number; daten?: unknown }[], laufId: string): ZusammensetzungErgebnis {
  if (versionen.length === 0) return { ok: true, daten: null }
  const eintraege: unknown[] = []
  for (const version of versionen) {
    const nr = version.versionSequenz ?? '?'
    const verstoesse = validiereRueckfrageProtokoll(version.daten)
    if (verstoesse.length > 0) return { ok: false, grund: `Version ${nr} ungültig: ${verstoesse[0]}` }
    const daten = version.daten as { lauf_id: string; ab: number; eintraege: unknown[] }
    if (daten.lauf_id !== laufId) return { ok: false, grund: `Version ${nr} gehört zu einem anderen Lauf` }
    if (daten.ab !== eintraege.length) return { ok: false, grund: `Version ${nr} lückenhaft (ab ${daten.ab}, erwartet ${eintraege.length})` }
    eintraege.push(...daten.eintraege)
  }
  return { ok: true, daten: { rueckfragen_schema: 'v1', lauf_id: laufId, ab: 0, eintraege } }
}
