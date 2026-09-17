/**
 * Datei: src/jarvis/index.ts
 *
 * Zweck: Jarvis-Modul (F26 WS-1). Zwei Verantwortlichkeiten:
 * validiereErgebnisJarvis prüft ein geparstes Objekt gegen
 * schemas/ergebnis-jarvis.schema.json (Muster validiereErgebnisScout,
 * src/scout/index.ts, D5 — handgeschrieben statt ajv, dieselbe
 * Repo-Entscheidung); baueJarvisAuftragstext baut den Auftragstext, der als
 * EINZIGER Eingabekanal an den Lauf geht (F-269-Muster, Router-Nachweis
 * features/F18/nachweis-ws3-szenario-a.md) — bei router/scout wurde diese
 * Rolleninstruktion je Lauf von Hand in den Auftragstext geschrieben; ein
 * Chat hat keinen Menschen, der das vor jeder Nachricht neu formuliert, also
 * übernimmt der Server es hier (v0, ohne '--output-schema' für claude-code,
 * F-337-Lehre: Enum-Werte wörtlich aufzählen, Codezaun ausdrücklich
 * verbieten). Kein Kernartefaktbau, kein Vorfilter, keine
 * Chat-Verlauf-Schreiblogik: WS-1 liefert die Mechanik bis zum validen
 * Ergebnis, Chat-View und Verlauf (lineage-chat-<projekt>) sind WS-2.
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs (leseJarvisErgebnisAusLaufakte,
 * POST /api/chat), scripts/check-f26-jarvis.mjs, src/jarvis/jarvis.test.ts.
 */

import type { ErgebnisJarvis, JarvisAktion, JarvisAktionTyp, JarvisArt, JarvisAuftragVorschlag, JarvisBezug } from './types.ts'

const ART = ['antwort', 'auftrag_vorschlag', 'aktion']
const AKTION_TYP = ['routen', 'oeffnen']

const ERGEBNIS_JARVIS_FELDER = new Set(['art', 'antwort', 'auftrag', 'aktion', 'bezug'])
const AUFTRAG_FELDER = new Set(['titel', 'text'])
const AKTION_FELDER = new Set(['typ', 'ziel'])
const BEZUG_FELDER = new Set(['auftrag_id', 'workitem'])

function istObjekt(wert: unknown): wert is Record<string, unknown> {
  return typeof wert === 'object' && wert !== null && !Array.isArray(wert)
}

function istNichtLeererString(wert: unknown): wert is string {
  return typeof wert === 'string' && wert.length > 0
}

/**
 * Prüft daten.auftrag gegen schemas/ergebnis-jarvis.schema.json' auftrag-Form.
 * @param auftrag - geparstes, sonst unbekanntes Objekt
 * @returns Liste der Regelverletzungen; leer = gültig
 */
function validiereAuftragVorschlag(auftrag: unknown): string[] {
  if (!istObjekt(auftrag)) return ["'auftrag' muss ein Objekt sein"]
  const verstoesse: string[] = []
  for (const feld of Object.keys(auftrag)) {
    if (!AUFTRAG_FELDER.has(feld)) verstoesse.push(`'auftrag' trägt unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  for (const feld of AUFTRAG_FELDER) {
    if (!(feld in auftrag)) verstoesse.push(`'auftrag.${feld}' fehlt`)
  }
  if ('titel' in auftrag && !istNichtLeererString(auftrag.titel)) verstoesse.push("'auftrag.titel' muss ein nicht-leerer String sein")
  if ('text' in auftrag && !istNichtLeererString(auftrag.text)) verstoesse.push("'auftrag.text' muss ein nicht-leerer String sein")
  return verstoesse
}

/**
 * Prüft daten.aktion gegen schemas/ergebnis-jarvis.schema.json' aktion-Form.
 * @param aktion - geparstes, sonst unbekanntes Objekt
 * @returns Liste der Regelverletzungen; leer = gültig
 */
function validiereAktion(aktion: unknown): string[] {
  if (!istObjekt(aktion)) return ["'aktion' muss ein Objekt sein"]
  const verstoesse: string[] = []
  for (const feld of Object.keys(aktion)) {
    if (!AKTION_FELDER.has(feld)) verstoesse.push(`'aktion' trägt unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  for (const feld of AKTION_FELDER) {
    if (!(feld in aktion)) verstoesse.push(`'aktion.${feld}' fehlt`)
  }
  if ('typ' in aktion && (typeof aktion.typ !== 'string' || !AKTION_TYP.includes(aktion.typ))) {
    verstoesse.push(`'aktion.typ' muss einer von ${AKTION_TYP.join(', ')} sein`)
  }
  if ('ziel' in aktion && !istNichtLeererString(aktion.ziel)) verstoesse.push("'aktion.ziel' muss ein nicht-leerer String sein")
  return verstoesse
}

/**
 * Prüft daten.bezug gegen schemas/ergebnis-jarvis.schema.json' bezug-Form —
 * genau eines von auftrag_id/workitem, nicht beide, nicht keines.
 * @param bezug - geparstes, sonst unbekanntes Objekt
 * @returns Liste der Regelverletzungen; leer = gültig
 */
function validiereBezug(bezug: unknown): string[] {
  if (!istObjekt(bezug)) return ["'bezug' muss ein Objekt sein"]
  const verstoesse: string[] = []
  for (const feld of Object.keys(bezug)) {
    if (!BEZUG_FELDER.has(feld)) verstoesse.push(`'bezug' trägt unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  const hatAuftragId = 'auftrag_id' in bezug
  const hatWorkitem = 'workitem' in bezug
  if (hatAuftragId === hatWorkitem) {
    verstoesse.push("'bezug' muss genau eines von 'auftrag_id' oder 'workitem' tragen, nicht beide oder keines")
  }
  if (hatAuftragId && !istNichtLeererString(bezug.auftrag_id)) verstoesse.push("'bezug.auftrag_id' muss ein nicht-leerer String sein")
  if (hatWorkitem && !istNichtLeererString(bezug.workitem)) verstoesse.push("'bezug.workitem' muss ein nicht-leerer String sein")
  return verstoesse
}

/**
 * Reine Funktion: prüft ein geparstes Objekt gegen
 * schemas/ergebnis-jarvis.schema.json. Keine Seiteneffekte, kein Datei-I/O —
 * Muster validiereErgebnisScout (src/scout/index.ts, D5).
 * @param daten - geparstes, sonst unbekanntes Objekt
 * @returns Liste der Regelverletzungen; leeres Array = gültig
 */
export function validiereErgebnisJarvis(daten: unknown): string[] {
  if (!istObjekt(daten)) {
    return ['Wurzel ist kein Objekt']
  }
  const verstoesse: string[] = []

  for (const feld of Object.keys(daten)) {
    if (!ERGEBNIS_JARVIS_FELDER.has(feld)) verstoesse.push(`unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  for (const feld of ['art', 'antwort']) {
    if (!(feld in daten)) verstoesse.push(`Pflichtfeld '${feld}' fehlt`)
  }

  if ('art' in daten && (typeof daten.art !== 'string' || !ART.includes(daten.art))) {
    verstoesse.push(`'art' muss einer von ${ART.join(', ')} sein`)
  }
  if ('antwort' in daten && !istNichtLeererString(daten.antwort)) {
    verstoesse.push("'antwort' muss ein nicht-leerer String sein")
  }
  if ('auftrag' in daten) verstoesse.push(...validiereAuftragVorschlag(daten.auftrag))
  if ('aktion' in daten) verstoesse.push(...validiereAktion(daten.aktion))
  if ('bezug' in daten) verstoesse.push(...validiereBezug(daten.bezug))

  // QA-Befund WS-1: 'art' und ihr passendes Unterobjekt sind gekoppelt — ein
  // 'auftrag_vorschlag' ohne 'auftrag' (oder 'aktion' ohne 'aktion') validierte
  // sonst grün, obwohl ein WS-2-Client sich auf das Unterobjekt verlassen würde
  // (schemas/ergebnis-jarvis.schema.json 'allOf'/'if'/'then', dieselbe Regel).
  if (daten.art === 'auftrag_vorschlag' && !('auftrag' in daten)) {
    verstoesse.push("'auftrag' fehlt — bei art 'auftrag_vorschlag' Pflicht")
  }
  if (daten.art === 'aktion' && !('aktion' in daten)) {
    verstoesse.push("'aktion' fehlt — bei art 'aktion' Pflicht")
  }

  return verstoesse
}

/**
 * Baut den Auftragstext für einen Jarvis-Chat-Lauf: Rolleninstruktion (Zweck,
 * Ausgabeschema wörtlich mit allen Enum-Werten, explizites Codezaun-Verbot —
 * F-337-Lehre, Muster des handformulierten Klassifikationsauftrags in
 * features/F18/nachweis-ws3-szenario-a.md, hier automatisiert statt von Hand)
 * gefolgt von der eigentlichen Nutzer-Nachricht. Reine Funktion, kein I/O.
 * @param nachricht - die vom Menschen im Chat eingegebene Nachricht
 * @returns der vollständige Auftragstext, der als AusfuehrungsEingaben.auftragstext
 *   den einzigen Eingabekanal für den Lauf bildet
 */
export function baueJarvisAuftragstext(nachricht: string): string {
  return [
    "Du beantwortest als Rolle 'jarvis' eine natürliche Eingabe im Projektkontext (Statusfrage, Auftragsvorschlag oder Aktionsvorschlag).",
    'Deine GESAMTE Antwort besteht aus GENAU EINEM JSON-Objekt und sonst NICHTS: kein einleitender Satz, keine Erklärung davor oder danach, kein Markdown, kein Codezaun (```). Die allererste Zeile deiner Antwort ist "{", die letzte Zeile ist "}".',
    'Das JSON-Objekt hat GENAU diese Form (schemas/ergebnis-jarvis.schema.json):',
    '{',
    '  "art": "antwort" | "auftrag_vorschlag" | "aktion",',
    '  "antwort": "<für den Menschen lesbarer Antworttext, Pflichtfeld, auch wenn zusätzlich auftrag oder aktion gesetzt ist>",',
    '  "auftrag": { "titel": "<string>", "text": "<string>" },',
    '  "aktion": { "typ": "routen" | "oeffnen", "ziel": "<string>" },',
    '  "bezug": { "auftrag_id": "<string>" } ODER { "workitem": "<string>" }',
    '}',
    "'auftrag' NUR bei art 'auftrag_vorschlag' setzen, 'aktion' NUR bei art 'aktion' setzen, 'bezug' nur wenn diese Nachricht sich erkennbar auf einen bestehenden Auftrag oder ein Workitem bezieht (genau eines der beiden Unterfelder, nicht beide). Kein weiteres Feld außer den vier genannten.",
    '',
    'Nachricht des Menschen:',
    nachricht,
  ].join('\n')
}

export type { ErgebnisJarvis, JarvisAktion, JarvisAktionTyp, JarvisArt, JarvisAuftragVorschlag, JarvisBezug }
