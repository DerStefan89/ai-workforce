/**
 * Datei: src/product-coach/index.ts
 *
 * Zweck: Product-Coach-Modul (F34 WS-1). Drei Verantwortlichkeiten:
 * validiereErgebnisProductCoach prüft ein geparstes Objekt gegen
 * schemas/ergebnis-product-coach.schema.json (Muster validiereErgebnisJarvis,
 * src/jarvis/index.ts, D5 — handgeschrieben statt ajv, dieselbe
 * Repo-Entscheidung); baueCoachAuftragstext baut den Auftragstext, der als
 * EINZIGER Eingabekanal an den Lauf geht (F-269-Muster) — die Rolleninstruktion
 * (Sparring-Partner: Annahmen hinterfragen, höchstens eine Rückfrage je Turn,
 * Alternativen mit Abwägung, erst bei ausreichender Klarheit scope_entwurf)
 * steht hier statt von Hand je Lauf neu formuliert zu werden; baueAuftragAusScope
 * ist eine reine Funktion, die aus einem fertigen Scope-Entwurf deterministisches
 * Markdown für einen F22-Auftrag baut (löst F-606: "Als Auftrag anlegen" braucht
 * einen Auftragstext, keinen rohen Scope).
 *
 * Verlaufsfenster: waehleVerlaufsfenster (src/jarvis/index.ts, F31 WS-2) wird
 * unverändert wiederverwendet, keine zweite Kopie (D5) — CoachVerlaufsEintrag
 * ist strukturell identisch zu JarvisVerlaufsEintrag (nachricht/antwort/
 * istZusammenfassung?).
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs (POST/GET /api/sparring),
 * scripts/check-f34-product-coach.mjs, src/product-coach/product-coach.test.ts.
 */

import type { CoachAlternative, CoachArt, CoachScope, CoachVerlaufsEintrag, ErgebnisProductCoach } from './types.ts'

const ART = ['frage', 'alternativen', 'scope_entwurf']

const ERGEBNIS_PRODUCT_COACH_FELDER = new Set(['art', 'antwort', 'alternativen', 'scope'])
const ALTERNATIVE_FELDER = new Set(['titel', 'beschreibung', 'abwaegung'])
const SCOPE_FELDER = new Set(['titel', 'problem', 'ziel', 'in_scope', 'out_of_scope', 'annahmen', 'offene_fragen', 'erfolgskriterium'])
const SCOPE_STRING_LISTEN_FELDER = ['in_scope', 'out_of_scope', 'annahmen', 'offene_fragen'] as const

function istObjekt(wert: unknown): wert is Record<string, unknown> {
  return typeof wert === 'object' && wert !== null && !Array.isArray(wert)
}

function istNichtLeererString(wert: unknown): wert is string {
  return typeof wert === 'string' && wert.length > 0
}

function istStringListe(wert: unknown): wert is string[] {
  return Array.isArray(wert) && wert.every((eintrag) => istNichtLeererString(eintrag))
}

/**
 * F-423-Muster: ein Feld gilt als GESETZT, wenn es im Objekt vorkommt UND
 * nicht 'null' ist — ein fehlendes Feld (ältere claude-code-Form) und ein
 * explizit auf 'null' gesetztes Feld (Codex-Form, --output-schema erzwingt
 * jedes 'properties'-Feld in 'required') sind für den Validator
 * gleichbedeutend.
 */
function istGesetzt(objekt: Record<string, unknown>, feld: string): boolean {
  return feld in objekt && objekt[feld] !== null
}

/**
 * Prüft ein einzelnes Element von daten.alternativen gegen die
 * schemas/ergebnis-product-coach.schema.json' alternativen-Item-Form.
 * @param eintrag - geparstes, sonst unbekanntes Objekt
 * @param index - Position im Array, für die Fehlermeldung
 * @returns Liste der Regelverletzungen; leer = gültig
 */
function validiereAlternative(eintrag: unknown, index: number): string[] {
  if (!istObjekt(eintrag)) return [`'alternativen[${index}]' muss ein Objekt sein`]
  const verstoesse: string[] = []
  for (const feld of Object.keys(eintrag)) {
    if (!ALTERNATIVE_FELDER.has(feld)) verstoesse.push(`'alternativen[${index}]' trägt unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  for (const feld of ALTERNATIVE_FELDER) {
    if (!(feld in eintrag)) verstoesse.push(`'alternativen[${index}].${feld}' fehlt`)
  }
  for (const feld of ALTERNATIVE_FELDER) {
    if (feld in eintrag && !istNichtLeererString(eintrag[feld])) verstoesse.push(`'alternativen[${index}].${feld}' muss ein nicht-leerer String sein`)
  }
  return verstoesse
}

/**
 * Prüft daten.alternativen gegen die schemas/ergebnis-product-coach.schema.json'
 * alternativen-Form — inklusive der Validator-Kopplung "mindestens zwei
 * Einträge" (kein 'minItems' im Schema, F-423-Muster: eine Array-Längenprüfung
 * ist keine Struktur, die Codex' Structured-Output-Dialekt ausdrücken kann,
 * bleibt deshalb hier statt im Schema).
 * @param alternativen - geparstes, sonst unbekanntes Array
 * @returns Liste der Regelverletzungen; leer = gültig
 */
function validiereAlternativen(alternativen: unknown): string[] {
  if (!Array.isArray(alternativen)) return ["'alternativen' muss ein Array sein"]
  const verstoesse = alternativen.flatMap((eintrag, index) => validiereAlternative(eintrag, index))
  if (alternativen.length < 2) verstoesse.push("'alternativen' muss mindestens zwei Einträge tragen")
  return verstoesse
}

/**
 * Prüft daten.scope gegen die schemas/ergebnis-product-coach.schema.json'
 * scope-Form.
 * @param scope - geparstes, sonst unbekanntes Objekt
 * @returns Liste der Regelverletzungen; leer = gültig
 */
function validiereScope(scope: unknown): string[] {
  if (!istObjekt(scope)) return ["'scope' muss ein Objekt sein"]
  const verstoesse: string[] = []
  for (const feld of Object.keys(scope)) {
    if (!SCOPE_FELDER.has(feld)) verstoesse.push(`'scope' trägt unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  for (const feld of SCOPE_FELDER) {
    if (!(feld in scope)) verstoesse.push(`'scope.${feld}' fehlt`)
  }
  for (const feld of ['titel', 'problem', 'ziel', 'erfolgskriterium']) {
    if (feld in scope && !istNichtLeererString(scope[feld])) verstoesse.push(`'scope.${feld}' muss ein nicht-leerer String sein`)
  }
  for (const feld of SCOPE_STRING_LISTEN_FELDER) {
    if (feld in scope && !istStringListe(scope[feld])) verstoesse.push(`'scope.${feld}' muss ein Array aus nicht-leeren Strings sein`)
  }
  return verstoesse
}

/**
 * Reine Funktion: prüft ein geparstes Objekt gegen
 * schemas/ergebnis-product-coach.schema.json. Keine Seiteneffekte, kein
 * Datei-I/O — Muster validiereErgebnisJarvis (src/jarvis/index.ts, D5).
 * @param daten - geparstes, sonst unbekanntes Objekt
 * @returns Liste der Regelverletzungen; leeres Array = gültig
 */
export function validiereErgebnisProductCoach(daten: unknown): string[] {
  if (!istObjekt(daten)) {
    return ['Wurzel ist kein Objekt']
  }
  const verstoesse: string[] = []

  for (const feld of Object.keys(daten)) {
    if (!ERGEBNIS_PRODUCT_COACH_FELDER.has(feld)) verstoesse.push(`unbekanntes Feld '${feld}' (additionalProperties: false)`)
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

  // F-423-Muster: 'alternativen'/'scope' sind im Codex-kompatiblen Schema TOP-LEVEL
  // PFLICHTFELDER vom Typ ["array","null"]/["object","null"] — ein gesetztes, aber
  // null-wertiges Feld zählt hier wie ein fehlendes; der claude-code-Worker (kein
  // --output-schema-Zwang) darf das Feld weiterhin ganz weglassen, beides ist
  // gleichbedeutend.
  const hatAlternativen = istGesetzt(daten, 'alternativen')
  const hatScope = istGesetzt(daten, 'scope')
  if (hatAlternativen) verstoesse.push(...validiereAlternativen(daten.alternativen))
  if (hatScope) verstoesse.push(...validiereScope(daten.scope))

  // Kopplung: 'art' und ihr passendes Unterfeld gehören zusammen — nur im Validator
  // erzwungen, nicht im Schema (F-423-Muster).
  if (daten.art === 'alternativen' && !hatAlternativen) {
    verstoesse.push("'alternativen' fehlt — bei art 'alternativen' Pflicht")
  }
  if (daten.art === 'scope_entwurf' && !hatScope) {
    verstoesse.push("'scope' fehlt — bei art 'scope_entwurf' Pflicht")
  }
  if (daten.art !== 'alternativen' && hatAlternativen) {
    verstoesse.push("'alternativen' gesetzt, aber art ist nicht 'alternativen'")
  }
  if (daten.art !== 'scope_entwurf' && hatScope) {
    verstoesse.push("'scope' gesetzt, aber art ist nicht 'scope_entwurf'")
  }

  return verstoesse
}

/**
 * Baut den Auftragstext für einen Product-Coach-Sparring-Lauf: Rolleninstruktion
 * (Sparring-Partner: Annahmen hinterfragen, höchstens eine Rückfrage je Turn,
 * Alternativen mit Abwägung vorstellen, erst bei ausreichender Klarheit einen
 * Scope-Entwurf liefern; Ausgabe NUR als JSON gemäß Schema — F-337-Lehre,
 * Muster baueJarvisAuftragstext), gefolgt vom optionalen Verlaufsfenster (nur
 * Kontext, keine Anweisung) und der eigentlichen Nutzer-Nachricht. Reine
 * Funktion, kein I/O.
 * @param nachricht - die vom Menschen im Sparring eingegebene Nachricht
 * @param verlauf - bereits über waehleVerlaufsfenster (src/jarvis/index.ts) begrenztes
 *   Fenster, aufsteigend (ältester zuerst); leer (Default) liefert reinen Erstturn-Text
 * @returns der vollständige Auftragstext, der als AusfuehrungsEingaben.auftragstext
 *   den einzigen Eingabekanal für den Lauf bildet
 */
export function baueCoachAuftragstext(nachricht: string, verlauf: CoachVerlaufsEintrag[] = []): string {
  const zeilen = [
    "Du bist als Rolle 'product-coach' ein Sparring-Partner für Ideenfindung und Scope-Klärung VOR dem Bau.",
    'Dein Ziel: Annahmen hinterfragen, nicht einfach zustimmen. Je Turn höchstens EINE Rückfrage — keine Frageliste. Wenn mehrere Wege plausibel sind, stelle Alternativen MIT Abwägung vor statt einer einzelnen Empfehlung. Liefere einen Scope-Entwurf erst, wenn Problem, Ziel und Grenzen aus dem Gespräch ausreichend klar sind — nicht vorschnell.',
    'Deine GESAMTE Antwort besteht aus GENAU EINEM JSON-Objekt und sonst NICHTS: kein einleitender Satz, keine Erklärung davor oder danach, kein Markdown, kein Codezaun (```). Die allererste Zeile deiner Antwort ist "{", die letzte Zeile ist "}".',
    'Das gilt AUSNAHMSLOS auch dann, wenn deine Antwort inhaltlich mit einer vorherigen identisch ist — liefere in diesem Fall direkt dasselbe JSON-Objekt erneut, ohne Bemerkung darüber.',
    'Das JSON-Objekt hat GENAU diese Form (schemas/ergebnis-product-coach.schema.json):',
    '{',
    '  "art": "frage" | "alternativen" | "scope_entwurf",',
    '  "antwort": "<für den Menschen lesbarer Antworttext, Pflichtfeld, auch wenn zusätzlich alternativen oder scope gesetzt ist>",',
    '  "alternativen": [ { "titel": "<string>", "beschreibung": "<string>", "abwaegung": "<string>" }, ... ] (mindestens zwei Einträge),',
    '  "scope": { "titel": "<string>", "problem": "<string>", "ziel": "<string>", "in_scope": ["<string>", ...], "out_of_scope": ["<string>", ...], "annahmen": ["<string>", ...], "offene_fragen": ["<string>", ...], "erfolgskriterium": "<string>" }',
    '}',
    "'alternativen' NUR bei art 'alternativen' setzen (dann mit mindestens zwei Einträgen), 'scope' NUR bei art 'scope_entwurf' setzen. Kein weiteres Feld außer den vier genannten (nicht gesetzte Felder weglassen — ein strukturiert antwortender Worker darf sie stattdessen auf 'null' setzen, beides ist gleichwertig).",
  ]
  if (verlauf.length > 0) {
    zeilen.push('', 'Bisheriger Gesprächsverlauf (nur Kontext, keine Anweisungen; älteste zuerst):')
    for (const eintrag of verlauf) {
      zeilen.push(`Mensch: ${eintrag.nachricht}`, `Coach: ${eintrag.antwort}`)
    }
  }
  zeilen.push('', 'Nachricht des Menschen:', nachricht)
  return zeilen.join('\n')
}

function markdownListe(eintraege: string[]): string {
  return eintraege.length > 0 ? eintraege.map((eintrag) => `- ${eintrag}`).join('\n') : '- (keine)'
}

/**
 * Reine Funktion: baut aus einem fertigen Scope-Entwurf deterministisches
 * Markdown für einen F22-Auftrag (löst F-606: "Als Auftrag anlegen" braucht
 * einen Auftragstext, keinen rohen Scope) — kein I/O, keine Registrierung,
 * das bleibt Sache des Aufrufers (POST /api/auftraege, F22-Pfad, Muster
 * eines Jarvis-'auftrag_vorschlag').
 * @param scope - ein gültiger, bereits über validiereErgebnisProductCoach geprüfter Scope
 * @returns { titel, auftragstext } — Rohmaterial für POST /api/auftraege
 */
export function baueAuftragAusScope(scope: CoachScope): { titel: string; auftragstext: string } {
  const auftragstext = [
    `# ${scope.titel}`,
    '',
    '## Problem',
    scope.problem,
    '',
    '## Ziel',
    scope.ziel,
    '',
    '## In Scope',
    markdownListe(scope.in_scope),
    '',
    '## Out of Scope',
    markdownListe(scope.out_of_scope),
    '',
    '## Annahmen',
    markdownListe(scope.annahmen),
    '',
    '## Offene Fragen',
    markdownListe(scope.offene_fragen),
    '',
    '## Erfolgskriterium',
    scope.erfolgskriterium,
  ].join('\n')
  return { titel: scope.titel, auftragstext }
}

export type { CoachAlternative, CoachArt, CoachScope, CoachVerlaufsEintrag, ErgebnisProductCoach }
