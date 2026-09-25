/**
 * Datei: src/product-coach/index.ts
 *
 * Zweck: Product-Coach-Modul (F34 WS-1, erweitert WS-3). Verantwortlichkeiten:
 * validiereErgebnisProductCoach prüft ein geparstes Objekt gegen
 * schemas/ergebnis-product-coach.schema.json (Muster validiereErgebnisJarvis,
 * src/jarvis/index.ts, D5 — handgeschrieben statt ajv, dieselbe
 * Repo-Entscheidung); baueCoachAuftragstext baut den Auftragstext, der als
 * EINZIGER Eingabekanal an den Lauf geht (F-269-Muster) — die Rolleninstruktion
 * unterscheidet sich je 'modus' (Sparring-Partner für ein einzelnes Feature vs.
 * Projekt-Interview, F34 WS-3); baueAuftragAusScope/baueAuftragAusProjektentwurf
 * sind reine Funktionen, die aus einem fertigen Scope- bzw. Projekt-Entwurf
 * deterministisches Markdown für einen F22-Auftrag bauen (löst F-606 bzw. E-M5-12:
 * "Als Auftrag anlegen" braucht einen Auftragstext, keinen rohen Entwurf);
 * baueCapabilityAuszug rendert bereits aufgelöste Ressourcen (src/ressourcen/
 * index.ts, loeseRessourcenAuf) als kompakten Text für die Projekt-Interview-
 * Rolleninstruktion; vergebeFeatureIds vergibt Feature-/Meilenstein-IDs
 * deterministisch im Code — NIE das Modell (F-595-Muster: Feature-IDs stehen
 * nicht im Modell-Output).
 *
 * Verlaufsfenster: waehleVerlaufsfenster (src/jarvis/index.ts, F31 WS-2) wird
 * unverändert wiederverwendet, keine zweite Kopie (D5) — CoachVerlaufsEintrag
 * ist strukturell identisch zu JarvisVerlaufsEintrag (nachricht/antwort/
 * istZusammenfassung?).
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs (POST/GET /api/sparring),
 * scripts/check-f34-product-coach.mjs, src/product-coach/product-coach.test.ts.
 */

import { FEATURE_ID_MUSTER } from '../projektkontext/index.ts'
import type {
  AuftragKontext,
  BestehendeIds,
  CoachAlternative,
  CoachArt,
  CoachModus,
  CoachScope,
  CoachVerlaufsEintrag,
  ErgebnisProductCoach,
  ProjektEntwurfMitIds,
  ProjektFeatureEntwurf,
  ProjektMeilensteinEntwurf,
  ProjektMitIds,
  ZugewiesenesFeature,
  ZugewiesenerMeilenstein,
} from './types.ts'
import type { AufgelosteRessource } from '../ressourcen/types.ts'

const ART = ['frage', 'alternativen', 'scope_entwurf', 'projekt_entwurf']

const ERGEBNIS_PRODUCT_COACH_FELDER = new Set(['art', 'antwort', 'alternativen', 'scope', 'projekt'])
const ALTERNATIVE_FELDER = new Set(['titel', 'beschreibung', 'abwaegung'])
const SCOPE_FELDER = new Set(['titel', 'problem', 'ziel', 'in_scope', 'out_of_scope', 'annahmen', 'offene_fragen', 'erfolgskriterium'])
const SCOPE_STRING_LISTEN_FELDER = ['in_scope', 'out_of_scope', 'annahmen', 'offene_fragen'] as const

const PROJEKT_FELDER = new Set(['vision', 'zielgruppe', 'ziele', 'scope_in', 'scope_out', 'meilensteine', 'capabilities_bedarf', 'architektur_hinweise', 'offene_fragen'])
const PROJEKT_STRING_LISTEN_FELDER = ['ziele', 'scope_in', 'scope_out', 'architektur_hinweise', 'offene_fragen'] as const
const MEILENSTEIN_FELDER = new Set(['titel', 'ziel', 'features'])
const PROJEKT_FEATURE_FELDER = new Set(['titel', 'ziel', 'nicht_ziele', 'akzeptanzkriterien', 'abhaengig_von_titel'])
const PROJEKT_FEATURE_STRING_LISTEN_FELDER = ['nicht_ziele', 'akzeptanzkriterien', 'abhaengig_von_titel'] as const
const CAPABILITY_BEDARF_FELDER = new Set(['bedarf', 'ressource_id', 'status'])
const CAPABILITY_STATUS = ['vorhanden', 'offen', 'fehlt']

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
 * Prüft ein einzelnes Element von projekt.meilensteine[].features gegen die
 * schemas/ergebnis-product-coach.schema.json'-Feature-Form (F34 WS-3).
 * @param eintrag - geparstes, sonst unbekanntes Objekt
 * @param meilensteinIndex - Position des Meilensteins, für die Fehlermeldung
 * @param featureIndex - Position des Features im Meilenstein, für die Fehlermeldung
 * @returns Liste der Regelverletzungen; leer = gültig
 */
function validiereProjektFeature(eintrag: unknown, meilensteinIndex: number, featureIndex: number): string[] {
  const pfad = `projekt.meilensteine[${meilensteinIndex}].features[${featureIndex}]`
  if (!istObjekt(eintrag)) return [`'${pfad}' muss ein Objekt sein`]
  const verstoesse: string[] = []
  for (const feld of Object.keys(eintrag)) {
    if (!PROJEKT_FEATURE_FELDER.has(feld)) verstoesse.push(`'${pfad}' trägt unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  for (const feld of PROJEKT_FEATURE_FELDER) {
    if (!(feld in eintrag)) verstoesse.push(`'${pfad}.${feld}' fehlt`)
  }
  for (const feld of ['titel', 'ziel']) {
    if (feld in eintrag && !istNichtLeererString(eintrag[feld])) verstoesse.push(`'${pfad}.${feld}' muss ein nicht-leerer String sein`)
  }
  for (const feld of PROJEKT_FEATURE_STRING_LISTEN_FELDER) {
    if (feld in eintrag && !istStringListe(eintrag[feld])) verstoesse.push(`'${pfad}.${feld}' muss ein Array aus nicht-leeren Strings sein`)
  }
  return verstoesse
}

/**
 * Prüft ein einzelnes Element von projekt.meilensteine gegen die
 * schemas/ergebnis-product-coach.schema.json'-Meilenstein-Form (F34 WS-3).
 * @param eintrag - geparstes, sonst unbekanntes Objekt
 * @param index - Position im Array, für die Fehlermeldung
 * @returns Liste der Regelverletzungen; leer = gültig
 */
function validiereMeilenstein(eintrag: unknown, index: number): string[] {
  const pfad = `projekt.meilensteine[${index}]`
  if (!istObjekt(eintrag)) return [`'${pfad}' muss ein Objekt sein`]
  const verstoesse: string[] = []
  for (const feld of Object.keys(eintrag)) {
    if (!MEILENSTEIN_FELDER.has(feld)) verstoesse.push(`'${pfad}' trägt unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  for (const feld of MEILENSTEIN_FELDER) {
    if (!(feld in eintrag)) verstoesse.push(`'${pfad}.${feld}' fehlt`)
  }
  for (const feld of ['titel', 'ziel']) {
    if (feld in eintrag && !istNichtLeererString(eintrag[feld])) verstoesse.push(`'${pfad}.${feld}' muss ein nicht-leerer String sein`)
  }
  if ('features' in eintrag) {
    if (!Array.isArray(eintrag.features)) {
      verstoesse.push(`'${pfad}.features' muss ein Array sein`)
    } else {
      verstoesse.push(...eintrag.features.flatMap((feature, featureIndex) => validiereProjektFeature(feature, index, featureIndex)))
    }
  }
  return verstoesse
}

/**
 * Prüft ein einzelnes Element von projekt.capabilities_bedarf gegen die
 * schemas/ergebnis-product-coach.schema.json'-Form (F34 WS-3) — inklusive der
 * Validator-Kopplung "eine gesetzte ressource_id muss im eingespeisten
 * Capability-Auszug existieren" (kein Schema-Feld, F-423-Muster: das Schema
 * kennt den Capability-Auszug nicht). Ohne übergebene bekannteRessourcenIds
 * (undefined) bleibt diese eine Prüfung aus — Aufrufer ohne Ressourcenkontext
 * (z. B. ein reiner Formtest) werden dadurch nicht künstlich blockiert.
 * @param eintrag - geparstes, sonst unbekanntes Objekt
 * @param index - Position im Array, für die Fehlermeldung
 * @param bekannteRessourcenIds - bekannte Ressourcen-IDs aus dem Capability-Auszug, oder undefined (Prüfung aus)
 * @returns Liste der Regelverletzungen; leer = gültig
 */
function validiereCapabilityBedarf(eintrag: unknown, index: number, bekannteRessourcenIds: string[] | undefined): string[] {
  const pfad = `projekt.capabilities_bedarf[${index}]`
  if (!istObjekt(eintrag)) return [`'${pfad}' muss ein Objekt sein`]
  const verstoesse: string[] = []
  for (const feld of Object.keys(eintrag)) {
    if (!CAPABILITY_BEDARF_FELDER.has(feld)) verstoesse.push(`'${pfad}' trägt unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  for (const feld of CAPABILITY_BEDARF_FELDER) {
    if (!(feld in eintrag)) verstoesse.push(`'${pfad}.${feld}' fehlt`)
  }
  if ('bedarf' in eintrag && !istNichtLeererString(eintrag.bedarf)) verstoesse.push(`'${pfad}.bedarf' muss ein nicht-leerer String sein`)
  if ('status' in eintrag && (typeof eintrag.status !== 'string' || !CAPABILITY_STATUS.includes(eintrag.status))) {
    verstoesse.push(`'${pfad}.status' muss einer von ${CAPABILITY_STATUS.join(', ')} sein`)
  }
  if ('ressource_id' in eintrag && eintrag.ressource_id !== null) {
    if (!istNichtLeererString(eintrag.ressource_id)) {
      verstoesse.push(`'${pfad}.ressource_id' muss ein nicht-leerer String oder 'null' sein`)
    } else if (bekannteRessourcenIds !== undefined && !bekannteRessourcenIds.includes(eintrag.ressource_id)) {
      verstoesse.push(`'${pfad}.ressource_id' ('${eintrag.ressource_id}') ist im Capability-Auszug nicht vorhanden — keine Ressource erfinden`)
    }
  }
  return verstoesse
}

/**
 * Prüft daten.projekt gegen die schemas/ergebnis-product-coach.schema.json'
 * projekt-Form (F34 WS-3).
 * @param projekt - geparstes, sonst unbekanntes Objekt
 * @param bekannteRessourcenIds - bekannte Ressourcen-IDs aus dem Capability-Auszug, oder undefined (Prüfung aus)
 * @returns Liste der Regelverletzungen; leer = gültig
 */
function validiereProjekt(projekt: unknown, bekannteRessourcenIds: string[] | undefined): string[] {
  if (!istObjekt(projekt)) return ["'projekt' muss ein Objekt sein"]
  const verstoesse: string[] = []
  for (const feld of Object.keys(projekt)) {
    if (!PROJEKT_FELDER.has(feld)) verstoesse.push(`'projekt' trägt unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  for (const feld of PROJEKT_FELDER) {
    if (!(feld in projekt)) verstoesse.push(`'projekt.${feld}' fehlt`)
  }
  for (const feld of ['vision', 'zielgruppe']) {
    if (feld in projekt && !istNichtLeererString(projekt[feld])) verstoesse.push(`'projekt.${feld}' muss ein nicht-leerer String sein`)
  }
  for (const feld of PROJEKT_STRING_LISTEN_FELDER) {
    if (feld in projekt && !istStringListe(projekt[feld])) verstoesse.push(`'projekt.${feld}' muss ein Array aus nicht-leeren Strings sein`)
  }
  if ('meilensteine' in projekt) {
    if (!Array.isArray(projekt.meilensteine)) {
      verstoesse.push("'projekt.meilensteine' muss ein Array sein")
    } else {
      verstoesse.push(...projekt.meilensteine.flatMap((meilenstein, index) => validiereMeilenstein(meilenstein, index)))
    }
  }
  if ('capabilities_bedarf' in projekt) {
    if (!Array.isArray(projekt.capabilities_bedarf)) {
      verstoesse.push("'projekt.capabilities_bedarf' muss ein Array sein")
    } else {
      verstoesse.push(...projekt.capabilities_bedarf.flatMap((eintrag, index) => validiereCapabilityBedarf(eintrag, index, bekannteRessourcenIds)))
    }
  }
  return verstoesse
}

/**
 * Reine Funktion: prüft ein geparstes Objekt gegen
 * schemas/ergebnis-product-coach.schema.json. Keine Seiteneffekte, kein
 * Datei-I/O — Muster validiereErgebnisJarvis (src/jarvis/index.ts, D5).
 * @param daten - geparstes, sonst unbekanntes Objekt
 * @param bekannteRessourcenIds - F34 WS-3: bekannte Ressourcen-IDs aus dem in den Lauf
 *   eingespeisten Capability-Auszug (baueCapabilityAuszug) — nur bei art 'projekt_entwurf'
 *   relevant, prüft dass keine 'projekt.capabilities_bedarf[].ressource_id' erfunden ist.
 *   Weggelassen/undefined lässt diese eine Prüfung aus (z. B. reine Formtests ohne
 *   Ressourcenkontext); Aufrufer ohne dieses Argument (validiereErgebnisJarvis hat dieselbe
 *   Arity nicht) bleiben unverändert, JavaScript ignoriert das zusätzliche Argument.
 * @returns Liste der Regelverletzungen; leeres Array = gültig
 */
export function validiereErgebnisProductCoach(daten: unknown, bekannteRessourcenIds?: string[]): string[] {
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

  // F-423-Muster: 'alternativen'/'scope'/'projekt' sind im Codex-kompatiblen Schema TOP-LEVEL
  // PFLICHTFELDER vom Typ ["array","null"]/["object","null"] — ein gesetztes, aber
  // null-wertiges Feld zählt hier wie ein fehlendes; der claude-code-Worker (kein
  // --output-schema-Zwang) darf das Feld weiterhin ganz weglassen, beides ist
  // gleichbedeutend.
  const hatAlternativen = istGesetzt(daten, 'alternativen')
  const hatScope = istGesetzt(daten, 'scope')
  const hatProjekt = istGesetzt(daten, 'projekt')
  if (hatAlternativen) verstoesse.push(...validiereAlternativen(daten.alternativen))
  if (hatScope) verstoesse.push(...validiereScope(daten.scope))
  if (hatProjekt) verstoesse.push(...validiereProjekt(daten.projekt, bekannteRessourcenIds))

  // Kopplung: 'art' und ihr passendes Unterfeld gehören zusammen — nur im Validator
  // erzwungen, nicht im Schema (F-423-Muster).
  if (daten.art === 'alternativen' && !hatAlternativen) {
    verstoesse.push("'alternativen' fehlt — bei art 'alternativen' Pflicht")
  }
  if (daten.art === 'scope_entwurf' && !hatScope) {
    verstoesse.push("'scope' fehlt — bei art 'scope_entwurf' Pflicht")
  }
  if (daten.art === 'projekt_entwurf' && !hatProjekt) {
    verstoesse.push("'projekt' fehlt — bei art 'projekt_entwurf' Pflicht")
  }
  if (daten.art !== 'alternativen' && hatAlternativen) {
    verstoesse.push("'alternativen' gesetzt, aber art ist nicht 'alternativen'")
  }
  if (daten.art !== 'scope_entwurf' && hatScope) {
    verstoesse.push("'scope' gesetzt, aber art ist nicht 'scope_entwurf'")
  }
  if (daten.art !== 'projekt_entwurf' && hatProjekt) {
    verstoesse.push("'projekt' gesetzt, aber art ist nicht 'projekt_entwurf'")
  }

  return verstoesse
}

function baueFeatureRolleninstruktion(): string[] {
  return [
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
}

/**
 * F34 WS-3: Rolleninstruktion für Modus 'projekt' — das Projekt-Interview.
 * Feste Reihenfolge (E-M5-12): Vision/Problem, Zielgruppe, Ziele/Erfolgskriterien,
 * Scope In/Out, Meilensteine, Feature-Schnitt je Meilenstein. Weiterhin höchstens
 * eine Rückfrage je Turn; 'projekt_entwurf' erst bei ausreichender Klarheit.
 * Erkennt der eingespeiste Kontext (Projektbeschreibung/Roadmap, F33) ein
 * bestehendes Projekt, plant der Coach eine ERWEITERUNG statt eines Neuanfangs.
 */
function baueProjektRolleninstruktion(): string[] {
  return [
    "Du bist als Rolle 'product-coach' im Modus 'projekt' Interviewer für ein Projekt-Interview VOR dem Bau — kein einzelnes Feature, das ganze Vorhaben.",
    'Befrage in dieser Reihenfolge, ein Thema nach dem anderen, bis es ausreichend klar ist: (1) Vision/Problem, (2) Zielgruppe, (3) Ziele und Erfolgskriterien, (4) Scope In/Out, (5) Meilensteine, (6) Feature-Schnitt je Meilenstein. Je Turn höchstens EINE Rückfrage — keine Frageliste. Wenn mehrere Wege plausibel sind, stelle Alternativen MIT Abwägung vor statt einer einzelnen Empfehlung. Liefere einen Projekt-Entwurf erst, wenn alle sechs Themen ausreichend klar sind — nicht vorschnell.',
    "Erkennst du am eingespeisten Projektkontext (Projektbeschreibung/Roadmap), dass bereits ein Projekt mit Roadmap existiert, planst du eine ERWEITERUNG: neue Meilensteine/Features ergänzen, Bestehendes NICHT umschreiben oder in Frage stellen.",
    'Deine GESAMTE Antwort besteht aus GENAU EINEM JSON-Objekt und sonst NICHTS: kein einleitender Satz, keine Erklärung davor oder danach, kein Markdown, kein Codezaun (```). Die allererste Zeile deiner Antwort ist "{", die letzte Zeile ist "}".',
    'Das gilt AUSNAHMSLOS auch dann, wenn deine Antwort inhaltlich mit einer vorherigen identisch ist — liefere in diesem Fall direkt dasselbe JSON-Objekt erneut, ohne Bemerkung darüber.',
    'Das JSON-Objekt hat GENAU diese Form (schemas/ergebnis-product-coach.schema.json):',
    '{',
    '  "art": "frage" | "alternativen" | "projekt_entwurf",',
    '  "antwort": "<für den Menschen lesbarer Antworttext, Pflichtfeld, auch wenn zusätzlich alternativen oder projekt gesetzt ist>",',
    '  "alternativen": [ { "titel": "<string>", "beschreibung": "<string>", "abwaegung": "<string>" }, ... ] (mindestens zwei Einträge),',
    '  "projekt": { "vision": "<string>", "zielgruppe": "<string>", "ziele": ["<string>", ...], "scope_in": ["<string>", ...], "scope_out": ["<string>", ...],',
    '    "meilensteine": [ { "titel": "<string>", "ziel": "<string>", "features": [ { "titel": "<string>", "ziel": "<string>", "nicht_ziele": ["<string>", ...], "akzeptanzkriterien": ["<string>", ...], "abhaengig_von_titel": ["<string des abhängigen Feature-Titels in diesem Entwurf>", ...] }, ... ] }, ... ],',
    '    "capabilities_bedarf": [ { "bedarf": "<string>", "ressource_id": "<id aus dem Capability-Auszug>" | null, "status": "vorhanden" | "offen" | "fehlt" }, ... ],',
    '    "architektur_hinweise": ["<string>", ...], "offene_fragen": ["<string>", ...] }',
    '}',
    "'alternativen' NUR bei art 'alternativen' setzen (dann mit mindestens zwei Einträgen), 'projekt' NUR bei art 'projekt_entwurf' setzen. 'scope' bleibt in diesem Modus IMMER ungesetzt/null (das ist der Feature-Modus). Kein weiteres Feld außer den genannten (nicht gesetzte Felder weglassen — ein strukturiert antwortender Worker darf sie stattdessen auf 'null' setzen, beides ist gleichwertig).",
    "Vergib in 'projekt' KEINE Feature- oder Meilenstein-IDs (F1, M2, ...) — die vergibt der Server deterministisch. Nenne Features in 'abhaengig_von_titel' ausschließlich über ihren TITEL, wie er in diesem Entwurf vorkommt.",
    "Bilde 'capabilities_bedarf' auf die im Abschnitt 'Verfügbare Ressourcen' unten genannten Einträge ab — setze 'ressource_id' NUR auf eine dort wörtlich genannte ID, sonst 'ressource_id': null und 'status': 'fehlt'. Erfinde NIEMALS eine Ressource.",
  ]
}

/**
 * Baut den Auftragstext für einen Product-Coach-Sparring-Lauf: Rolleninstruktion
 * (je 'modus' unterschiedlich — F34 WS-3), gefolgt vom optionalen Capability-
 * Auszug (nur Modus 'projekt'), dem optionalen Verlaufsfenster (nur Kontext,
 * keine Anweisung) und der eigentlichen Nutzer-Nachricht. Ausgabe NUR als JSON
 * gemäß Schema (F-337-Lehre, Muster baueJarvisAuftragstext). Reine Funktion,
 * kein I/O.
 * @param nachricht - die vom Menschen im Sparring eingegebene Nachricht
 * @param verlauf - bereits über waehleVerlaufsfenster (src/jarvis/index.ts) begrenztes
 *   Fenster, aufsteigend (ältester zuerst); leer (Default) liefert reinen Erstturn-Text
 * @param modus - 'feature' (Default, unverändert seit WS-1) oder 'projekt' (F34 WS-3:
 *   Projekt-Interview statt Einzelfeature-Sparring)
 * @param capabilityAuszug - F34 WS-3: vorab gebauter Text (baueCapabilityAuszug) — nur bei
 *   modus 'projekt' und nicht-null eingefügt; im Modus 'feature' ignoriert
 * @returns der vollständige Auftragstext, der als AusfuehrungsEingaben.auftragstext
 *   den einzigen Eingabekanal für den Lauf bildet
 */
export function baueCoachAuftragstext(nachricht: string, verlauf: CoachVerlaufsEintrag[] = [], modus: CoachModus = 'feature', capabilityAuszug: string | null = null): string {
  const zeilen = modus === 'projekt' ? baueProjektRolleninstruktion() : baueFeatureRolleninstruktion()
  if (modus === 'projekt' && capabilityAuszug !== null) {
    zeilen.push('', 'Verfügbare Ressourcen (Capability-Auszug):', capabilityAuszug)
  }
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

// F34 WS-3 Korrekturrunde (löst F-612): der Coach vergibt selbst KEINE ID (Instruktion), kann
// aber einen Meilenstein-/Feature-'titel' liefern, der zufällig mit einem ID-artigen Präfix
// beginnt (z. B. "M6 — Aufräum-Werkzeug…") — baueAuftragAusProjektentwurf stellt dem bereits die
// ECHTE, real vergebene ID voran, ohne diese Bereinigung entstünde eine sichtbare Dopplung ("M6 —
// M6 — …"). Entfernt ein führendes '[MF]<Zahl><Buchstabe?><Trenner>' unabhängig vom Trennzeichen
// (—/–/:/-), lässt jeden anderen Titeltext unverändert. Bekannte, bewusst nicht behobene Grenze
// (Code-Review-Befund Korrekturrunde, F-619): ein 'titel', der EXAKT der ID ohne jeden Trenner
// entspricht (z. B. 'titel: "M6"' ohne "—"), matcht den Trenner-Teil des Musters nicht und bleibt
// unverändert — 'M6 — M6' entstünde in diesem seltenen Randfall weiterhin. Ebenso deckt der
// Trenner-Zeichenklasse nur —/–/:/- ab, keine weiteren Unicode-Bindestrich-Varianten. Beides
// seltener als der ursprünglich beobachtete Fall (ein Trenner ist der Normalfall für einen
// plausibel geratenen ID-Präfix) und nicht behoben, um das Muster nicht unnötig zu verkomplizieren.
const ID_PRAEFIX_MUSTER = /^\s*[MF][0-9]+[A-Za-z]?\s*[—–:-]\s*/

export function entferneIdPraefix(titel: string): string {
  return titel.replace(ID_PRAEFIX_MUSTER, '')
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

/**
 * F34 WS-3: reine Funktion — rendert bereits aufgelöste Ressourcen
 * (src/ressourcen/index.ts, loeseRessourcenAuf) als kompakten, deterministisch
 * sortierten Text für die Projekt-Interview-Rolleninstruktion (Modus 'projekt').
 * Liest nichts selbst — der Aufrufer speist bereits über loeseRessourcenAuf
 * aufgelöste Ressourcen ein (keine zweite Leselogik, D5).
 * @param aufgeloesteRessourcen - Rückgabe von loeseRessourcenAuf (src/ressourcen/index.ts)
 * @returns mehrzeiliger Text, eine Zeile je Ressource, nach 'id' sortiert (deterministisch);
 *   '(keine Ressourcen vorhanden)' bei leerer Liste
 */
export function baueCapabilityAuszug(aufgeloesteRessourcen: AufgelosteRessource[]): string {
  if (aufgeloesteRessourcen.length === 0) return '(keine Ressourcen vorhanden)'
  const sortiert = [...aufgeloesteRessourcen].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return sortiert
    .map((ressource) => `- ${ressource.id} (${ressource.typ}): ${ressource.capabilities.join(', ')} — freigabe=${ressource.freigabe}, verfuegbar=${ressource.verfuegbar}`)
    .join('\n')
}

const MEILENSTEIN_ID_MUSTER = /^M[0-9]+$/

/**
 * Extrahiert die führende Zahl eines Feature-/Meilenstein-Ids-Rests (nach dem
 * Präfixbuchstaben), z. B. 'ab' aus 'F12' → 12, aus 'F1B' → 1. Nicht-parsebare
 * Reste (z. B. das irreguläre 'AF-F001', das FEATURE_ID_MUSTER ohnehin nicht
 * matcht) liefern null statt zu werfen.
 * @param id - vollständige Id
 * @param praefixLaenge - Länge des Präfixbuchstabens (1 für 'F'/'M')
 * @returns die führende Zahl, oder null wenn keine parsebar ist
 */
function extrahiereFuehrendeZahl(id: string, praefixLaenge: number): number | null {
  const treffer = id.slice(praefixLaenge).match(/^[0-9]+/)
  if (treffer === null) return null
  return Number.parseInt(treffer[0], 10)
}

/**
 * Höchste bereits vergebene Nummer unter 'muster' plus eins — ignoriert IDs,
 * die 'muster' nicht entsprechen (z. B. 'AF-F001' oder 'F19-bridge'),
 * statt daran zu scheitern (F-595-Muster: kein Crash an einer irregulären
 * Alt-Id, einfach überspringen).
 * @param ids - bereits vergebene IDs (aus features/<id>/ bzw. roadmap.json)
 * @param muster - FEATURE_ID_MUSTER oder MEILENSTEIN_ID_MUSTER
 * @param praefixLaenge - Länge des Präfixbuchstabens (1 für 'F'/'M')
 * @returns die nächste freie Nummer (mindestens 1)
 */
function naechsteFreieNummer(ids: string[], muster: RegExp, praefixLaenge: number): number {
  let hoechste = 0
  for (const id of ids) {
    if (!muster.test(id)) continue
    const zahl = extrahiereFuehrendeZahl(id, praefixLaenge)
    if (zahl !== null && zahl > hoechste) hoechste = zahl
  }
  return hoechste + 1
}

/**
 * Reine Funktion: vergibt Feature-/Meilenstein-IDs deterministisch im Code —
 * NIE das Modell (F-595-Muster: Feature-IDs stehen nicht im Modell-Output,
 * schemas/ergebnis-product-coach.schema.json' projekt-Beschreibung). Zählt in
 * der Reihenfolge der Meilensteine/Features im Entwurf ab der jeweils nächsten
 * freien Nummer hoch (kein Wiederverwenden einer Lücke — einfacher, mit
 * bestehenden Alt-IDs wie F1B/F6a konfliktfrei). Löst 'abhaengig_von_titel' zu
 * IDs auf; ein Titel, der keinem Feature-Titel in DIESEM Entwurf entspricht,
 * wird NICHT geraten, sondern erzeugt stattdessen einen offene_fragen-Eintrag.
 * @param projekt - meilensteine (mit Features, ohne ID) und offene_fragen eines Projekt-Entwurfs
 * @param bestehendeIds - real vergebene Feature-/Meilenstein-IDs (Server sammelt sie aus
 *   features/<id>/ und roadmap.json — diese Funktion selbst liest keine Datei)
 * @returns ID-tragende Meilensteine/Features plus um ungelöste Abhängigkeiten ergänzte offene_fragen
 */
export function vergebeFeatureIds(projekt: { meilensteine: ProjektMeilensteinEntwurf[]; offene_fragen: string[] }, bestehendeIds: BestehendeIds): ProjektMitIds {
  let naechsteFeatureNummer = naechsteFreieNummer(bestehendeIds.features, FEATURE_ID_MUSTER, 1)
  let naechsteMeilensteinNummer = naechsteFreieNummer(bestehendeIds.meilensteine, MEILENSTEIN_ID_MUSTER, 1)

  // Pass 1: IDs vergeben und eine Titel→Id-Abbildung aufbauen — VOR der
  // Abhängigkeitsauflösung, damit ein Feature auch von einem später im
  // Entwurf stehenden Feature abhängen darf.
  const titelZuId = new Map<string, string>()
  const meilensteineMitIds: { id: string; titel: string; ziel: string; features: (ProjektFeatureEntwurf & { id: string })[] }[] = []
  for (const meilenstein of projekt.meilensteine) {
    const meilensteinId = `M${naechsteMeilensteinNummer}`
    naechsteMeilensteinNummer += 1
    const features = meilenstein.features.map((feature) => {
      const featureId = `F${naechsteFeatureNummer}`
      naechsteFeatureNummer += 1
      if (!titelZuId.has(feature.titel)) titelZuId.set(feature.titel, featureId)
      return { ...feature, id: featureId }
    })
    meilensteineMitIds.push({ id: meilensteinId, titel: meilenstein.titel, ziel: meilenstein.ziel, features })
  }

  // Pass 2: abhaengig_von_titel auflösen, unbekannte Titel als offene Frage.
  const offeneFragen = [...projekt.offene_fragen]
  const meilensteine: ZugewiesenerMeilenstein[] = meilensteineMitIds.map((meilenstein) => ({
    id: meilenstein.id,
    titel: meilenstein.titel,
    ziel: meilenstein.ziel,
    features: meilenstein.features.map((feature): ZugewiesenesFeature => {
      const abhaengigVonIds: string[] = []
      for (const titel of feature.abhaengig_von_titel) {
        const id = titelZuId.get(titel)
        if (id === undefined) {
          offeneFragen.push(`Abhängigkeit '${titel}' von Feature '${feature.titel}' (${meilenstein.id}) konnte keinem Feature-Titel in diesem Entwurf zugeordnet werden.`)
        } else {
          abhaengigVonIds.push(id)
        }
      }
      return {
        titel: feature.titel,
        ziel: feature.ziel,
        nicht_ziele: feature.nicht_ziele,
        akzeptanzkriterien: feature.akzeptanzkriterien,
        abhaengig_von_titel: feature.abhaengig_von_titel,
        id: feature.id,
        abhaengig_von_ids: abhaengigVonIds,
      }
    }),
  }))

  return { meilensteine, offene_fragen: offeneFragen }
}

/**
 * F-703 (BUG P1, löst eine Regression aus F42 WS-1): `kontext.pruefbefehl`
 * ist ein argv-Array mit ABSOLUTEM Programmpfad
 * (`schreibeStartvorlageUndProfil`, src/projekt-anlegen/index.ts — nötig,
 * weil `starteProzess` execFile ohne Shell verwendet, ein bloßes `'npm'`
 * unter Windows aber nur auf `npm.cmd` auflöst). Ein rohes `.join(' ')`
 * dieses argv in den Coach-Auftragstext ergab einen für Stefan weder
 * ausführbaren noch mit der `Bash(npm run …)`-Allowlist vereinbaren Satz
 * (unquotierte Windows-Pfade mit Leerzeichen, z. B. `C:\Program Files\…`).
 * Diese Funktion baut stattdessen die Anzeigeform: erkennt sie am
 * argv-Muster [node(.exe), …npm-cli.js, …rest], zeigt sie `npm ${rest}` —
 * exakt der Befehl, den die Allowlist tatsächlich erlaubt. Erkennt sie das
 * Muster nicht (Fremd-Prüfbefehl ohne node/npm-cli.js-Form), quotet sie
 * jedes Element mit Leerzeichen, damit der Satz wenigstens korrekt
 * kopierbar bleibt.
 * @param argv - pruefbefehl-Array (mindestens ein Element)
 * @returns die für einen Menschen lesbare/ausführbare Anzeigeform
 */
export function anzeigePruefbefehl(argv: string[]): string {
  const basename0 = (argv[0].split(/[\\/]/).pop() ?? argv[0]).toLowerCase()
  const istNode = basename0 === 'node' || basename0 === 'node.exe'
  const istNpmCli = argv[1] !== undefined && argv[1].toLowerCase().endsWith('npm-cli.js')
  if (istNode && istNpmCli) {
    return `npm ${argv.slice(2).join(' ')}`
  }
  return argv.map((teil) => (teil.includes(' ') ? `"${teil}"` : teil)).join(' ')
}

/**
 * Reine Funktion: baut aus einem Projekt-Entwurf mit bereits vergebenen IDs
 * (vergebeFeatureIds) deterministisches Markdown für einen F22-Auftrag, der
 * AUSSCHLIESSLICH Dokumentation schreibt (E-M5-12) — docs/projekt/kontext/
 * beschreibung.md, docs/projekt/roadmap.json, je Feature ein
 * features/<id>/feature.md-Skelett. Kein I/O, keine Registrierung, das bleibt
 * Sache des Aufrufers (POST /api/auftraege, Muster baueAuftragAusScope).
 * F42 WS-1 (löst F-701, state/findings.md): die Funktion bleibt REIN (kein
 * repoWurzel-Zugriff) — `kontext` trägt additiv, was nur der Server kennt
 * (GET /api/zustand, additiv gespiegelt aus der Closure-Variable `vorlage`
 * bzw. `repoWurzel === installWurzel`). Fehlt `kontext` (bestehende
 * Aufrufer, z. B. Tests): sicherster Default — kein Prüfbefehl erfinden,
 * keine ai-workforce-eigenen Prüfpfade behaupten.
 * @param projekt - ein gültiger Projekt-Entwurf mit bereits vergebenen IDs (vergebeFeatureIds)
 * @param modus - 'neu' (frisches Projekt) oder 'erweiterung' (bestehendes Projekt/Roadmap ergänzen —
 *   erkennt der Coach am eingespeisten Kontext eine bestehende Roadmap, ist das dieser Fall)
 * @param kontext - pruefbefehl (argv der Ziel-Startvorlage) und istAiWorkforce (repoWurzel === installWurzel) des Projekts, in dem der Auftrag ausgeführt wird — optional, Default {} (F42 WS-1)
 * @returns { titel, auftragstext } — Rohmaterial für POST /api/auftraege
 */
export function baueAuftragAusProjektentwurf(projekt: ProjektEntwurfMitIds, modus: 'neu' | 'erweiterung', kontext: AuftragKontext = {}): { titel: string; auftragstext: string } {
  const visionCodepoints = [...projekt.vision]
  const visionGekuerzt = visionCodepoints.length > 80 ? `${visionCodepoints.slice(0, 77).join('')}...` : projekt.vision

  // F34 WS-3 Korrekturrunde (löst F-611): im Modus 'erweiterung' beschreibt 'vision' das GESAMTE,
  // unveränderte Projekt (E-M5-12: bei einer Erweiterung bewusst nicht neu formuliert) — als
  // Auftragstitel taugt sie dort nicht, sie nennt nie, was tatsächlich neu ist. Die Titel der
  // NEUEN Meilensteine (bereinigt um einen ggf. vom Modell selbst mitgelieferten ID-Präfix,
  // F-612) sind das tatsächlich Neue und ersetzen 'vision' als Titelquelle nur in diesem Modus.
  const meilensteinTitelText = projekt.meilensteine.length > 0 ? projekt.meilensteine.map((meilenstein) => entferneIdPraefix(meilenstein.titel)).join('; ') : '(kein neuer Meilenstein)'
  const meilensteinTitelCodepoints = [...meilensteinTitelText]
  const meilensteinTitelGekuerzt = meilensteinTitelCodepoints.length > 80 ? `${meilensteinTitelCodepoints.slice(0, 77).join('')}...` : meilensteinTitelText
  const titel = modus === 'erweiterung' ? `Erweiterung: ${meilensteinTitelGekuerzt}` : `Projekt-Anlage: ${visionGekuerzt}`

  // F34 WS-3 (QA-Befund, löst F-615): leere Listen bekommen denselben '(keine)'-Platzhalter wie
  // jede andere Sektion (markdownListe) — vorher blieb zwischen zwei Überschriften eine
  // kommentarlose Lücke, inkonsistent zum sonst durchgehaltenen Leerzustands-Muster.
  const meilensteinAbschnitte =
    projekt.meilensteine.length > 0
      ? projekt.meilensteine.flatMap((meilenstein) => [
          `### ${meilenstein.id} — ${entferneIdPraefix(meilenstein.titel)}`,
          `Ziel: ${meilenstein.ziel}`,
          '',
          '#### Features',
          ...(meilenstein.features.length > 0
            ? meilenstein.features.flatMap((feature) => [
                `- ${feature.id} — ${entferneIdPraefix(feature.titel)}`,
                `  Ziel: ${feature.ziel}`,
                `  Nicht-Ziele: ${feature.nicht_ziele.length > 0 ? feature.nicht_ziele.join('; ') : '(keine)'}`,
                `  Akzeptanzkriterien: ${feature.akzeptanzkriterien.length > 0 ? feature.akzeptanzkriterien.join('; ') : '(keine)'}`,
                `  Abhängig von: ${feature.abhaengig_von_ids.length > 0 ? feature.abhaengig_von_ids.join(', ') : '(keine)'}`,
              ])
            : ['- (keine)']),
          '',
        ])
      : ['(keine)', '']

  const capabilityZeilen =
    projekt.capabilities_bedarf.length > 0
      ? projekt.capabilities_bedarf.map((eintrag) => `- ${eintrag.bedarf} — status=${eintrag.status}${eintrag.ressource_id !== null ? `, ressource=${eintrag.ressource_id}` : ''}`)
      : ['- (kein Capability-Bedarf)']

  const scoutKandidaten = projekt.capabilities_bedarf.filter((eintrag) => eintrag.status === 'fehlt')
  const scoutKandidatenText = scoutKandidaten.length > 0 ? scoutKandidaten.map((eintrag) => eintrag.bedarf).join('; ') : '(keine)'

  const beschreibungAktion = modus === 'erweiterung' ? 'um diesen Abschnitt ERGÄNZEN (Bestehendes nicht umschreiben)' : 'NEU anlegen'
  const roadmapAktion = modus === 'erweiterung' ? 'um diese Meilensteine ERGÄNZEN (Bestehendes nicht umschreiben)' : 'NEU anlegen'

  const auftragstext = [
    `# ${titel}`,
    '',
    '## Vision',
    projekt.vision,
    '',
    '## Zielgruppe',
    projekt.zielgruppe,
    '',
    '## Ziele',
    markdownListe(projekt.ziele),
    '',
    '## Scope In',
    markdownListe(projekt.scope_in),
    '',
    '## Scope Out',
    markdownListe(projekt.scope_out),
    '',
    '## Meilensteine',
    ...meilensteinAbschnitte,
    '## Capability-Bedarf',
    ...capabilityZeilen,
    '',
    '## Architektur-Hinweise',
    markdownListe(projekt.architektur_hinweise),
    '',
    '## Offene Fragen',
    markdownListe(projekt.offene_fragen),
    '',
    '## Auftrag an den Baudurchgang',
    'Schreibe AUSSCHLIESSLICH Dokumentation, KEIN Produktcode:',
    `1. docs/projekt/kontext/beschreibung.md — ${beschreibungAktion}; die Einträge aus 'Capability-Bedarf' mit status 'fehlt' als eigenen Abschnitt "Scout-Kandidaten" aufnehmen (${scoutKandidatenText}); die 'Architektur-Hinweise' oben als eigenen Abschnitt "Für den Architekten (F39)" aufnehmen.`,
    kontext.istAiWorkforce === true
      ? `2. docs/projekt/roadmap.json — ${roadmapAktion}, jeder neue Meilenstein mit Status GEPLANT; muss validiereRoadmapDaten (src/projektkontext/index.ts) bestehen.`
      : `2. docs/projekt/roadmap.json — ${roadmapAktion}, jeder neue Meilenstein mit Status GEPLANT.`,
    kontext.istAiWorkforce === true
      ? '3. Je Feature eine eigene features/<id>/feature.md mit den Pflichtabschnitten aus scripts/check-feature.mjs (## Ziel, ## Nicht-Ziele, ## Akzeptanzkriterien, ## Dependencies) und Status: ENTWURF. Unter ## Akzeptanzkriterien je AK eine Zeile "- AK<n>: <prüfbarer Satz>" (F35 WS-1, baueAuftragAusFeatureAkte).'
      : '3. Je Feature eine eigene features/<id>/feature.md mit den Abschnitten ## Ziel, ## Nicht-Ziele, ## Akzeptanzkriterien, ## Dependencies und Status: ENTWURF. Unter ## Akzeptanzkriterien je AK eine Zeile "- AK<n>: <prüfbarer Satz>".',
    kontext.pruefbefehl !== undefined && kontext.pruefbefehl.length > 0
      ? `${anzeigePruefbefehl(kontext.pruefbefehl)} muss danach grün sein.`
      : 'Kein Prüfbefehl konfiguriert — die Änderungen werden nicht automatisch geprüft.',
  ].join('\n')

  return { titel, auftragstext }
}

export type {
  AuftragKontext,
  BestehendeIds,
  CoachAlternative,
  CoachArt,
  CoachModus,
  CoachScope,
  CoachVerlaufsEintrag,
  ErgebnisProductCoach,
  ProjektEntwurfMitIds,
  ProjektMitIds,
  ZugewiesenerMeilenstein,
  ZugewiesenesFeature,
}
