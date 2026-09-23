/**
 * Datei: src/architekt/index.ts
 *
 * Zweck: Architekt-Modul (F39 WS-1, E-M5-3′/E-M5-13). Verantwortlichkeiten:
 * validiereErgebnisArchitektur prüft ein geparstes Objekt gegen
 * schemas/ergebnis-architektur.schema.json (Muster validiereErgebnisProductCoach,
 * src/product-coach/index.ts, D5 — handgeschrieben statt ajv, dieselbe
 * Repo-Entscheidung); baueArchitektAuftragstext baut den Auftragstext, der als
 * EINZIGER Eingabekanal an den Lauf geht (F-269-Muster) — die Rolleninstruktion
 * unterscheidet sich je 'modus' ('feature': Architekturentwurf für ein
 * einzelnes Feature; 'projekt': Projektmodus 'Architektur-Grundlage' — Stack-ADR,
 * Modulschnitt, Datenmodell als Schemas, E-M5-13).
 *
 * Capability-Auszug: baueCapabilityAuszug wird aus src/product-coach
 * importiert und wiederverwendet, NICHT kopiert (E-M5-13: Coach und Architekt
 * teilen sich dieselbe Capability Library, F36 — derselbe Renderer für
 * beide Rollen).
 *
 * Nicht in F39 WS-1 (Auftrags-Vorgabe): keine Einhängung in hoch.json, den
 * Router oder den Leitstand (kein HTTP-Endpunkt, kein Schreibpfad für
 * docs/adr/*.md — dieses Modul liefert nur den geprüften Entwurf, das
 * Schreiben eines ADR bleibt einem Folgeauftrag/WS-3 vorbehalten).
 *
 * Wird aufgerufen von: scripts/check-f39-architekt.mjs,
 * src/architekt/architekt.test.ts.
 */

import { baueCapabilityAuszug } from '../product-coach/index.ts'
import type {
  AdrEntwurf,
  ArchitektModus,
  CapabilityBedarf,
  EntscheidungMensch,
  EntscheidungOption,
  ErgebnisArchitektur,
  EvidenzEintrag,
  ModulEntwurf,
  SchemaEntwurf,
} from './types.ts'

const ERGEBNIS_ARCHITEKTUR_FELDER = new Set(['modus', 'zusammenfassung', 'module', 'adr_entwuerfe', 'schema_entwuerfe', 'entscheidungen_mensch', 'capabilities_bedarf', 'evidenz'])
const MODUS_WERTE = ['feature', 'projekt']
const MODUL_FELDER = new Set(['name', 'zweck', 'abhaengigkeiten'])
const ADR_FELDER = new Set(['titel', 'kontext', 'entscheidung', 'alternativen', 'konsequenzen'])
const SCHEMA_ENTWURF_FELDER = new Set(['name', 'zweck', 'json_schema'])
const ENTSCHEIDUNG_FELDER = new Set(['frage', 'optionen', 'auswirkung_bestand', 'empfehlung', 'begruendung'])
const OPTION_FELDER = new Set(['titel', 'vorteile', 'nachteile'])
const CAPABILITY_BEDARF_FELDER = new Set(['bedarf', 'ressource_id', 'status'])
const CAPABILITY_STATUS = ['vorhanden', 'offen', 'fehlt']
const EVIDENZ_FELDER = new Set(['marker', 'aussage'])
const EVIDENZ_MARKER = ['[Fakt]', '[Schlussfolgerung]', '[Annahme]', '[offene Unsicherheit]']

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
 * Prüft ein einzelnes Element von daten.module gegen die
 * schemas/ergebnis-architektur.schema.json'-Modul-Form.
 * @param eintrag - geparstes, sonst unbekanntes Objekt
 * @param index - Position im Array, für die Fehlermeldung
 * @returns Liste der Regelverletzungen; leer = gültig
 */
function validiereModul(eintrag: unknown, index: number): string[] {
  const pfad = `module[${index}]`
  if (!istObjekt(eintrag)) return [`'${pfad}' muss ein Objekt sein`]
  const verstoesse: string[] = []
  for (const feld of Object.keys(eintrag)) {
    if (!MODUL_FELDER.has(feld)) verstoesse.push(`'${pfad}' trägt unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  for (const feld of MODUL_FELDER) {
    if (!(feld in eintrag)) verstoesse.push(`'${pfad}.${feld}' fehlt`)
  }
  for (const feld of ['name', 'zweck']) {
    if (feld in eintrag && !istNichtLeererString(eintrag[feld])) verstoesse.push(`'${pfad}.${feld}' muss ein nicht-leerer String sein`)
  }
  if ('abhaengigkeiten' in eintrag && !istStringListe(eintrag.abhaengigkeiten)) {
    verstoesse.push(`'${pfad}.abhaengigkeiten' muss ein Array aus nicht-leeren Strings sein`)
  }
  return verstoesse
}

/**
 * Prüft ein einzelnes Element von daten.adr_entwuerfe gegen die
 * schemas/ergebnis-architektur.schema.json'-ADR-Form.
 * @param eintrag - geparstes, sonst unbekanntes Objekt
 * @param index - Position im Array, für die Fehlermeldung
 * @returns Liste der Regelverletzungen; leer = gültig
 */
function validiereAdrEntwurf(eintrag: unknown, index: number): string[] {
  const pfad = `adr_entwuerfe[${index}]`
  if (!istObjekt(eintrag)) return [`'${pfad}' muss ein Objekt sein`]
  const verstoesse: string[] = []
  for (const feld of Object.keys(eintrag)) {
    if (!ADR_FELDER.has(feld)) verstoesse.push(`'${pfad}' trägt unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  for (const feld of ADR_FELDER) {
    if (!(feld in eintrag)) verstoesse.push(`'${pfad}.${feld}' fehlt`)
  }
  for (const feld of ['titel', 'kontext', 'entscheidung']) {
    if (feld in eintrag && !istNichtLeererString(eintrag[feld])) verstoesse.push(`'${pfad}.${feld}' muss ein nicht-leerer String sein`)
  }
  for (const feld of ['alternativen', 'konsequenzen']) {
    if (feld in eintrag && !istStringListe(eintrag[feld])) verstoesse.push(`'${pfad}.${feld}' muss ein Array aus nicht-leeren Strings sein`)
  }
  return verstoesse
}

/**
 * Prüft ein einzelnes Element von daten.schema_entwuerfe gegen die
 * schemas/ergebnis-architektur.schema.json'-Form. 'json_schema' bleibt
 * bewusst ungeprüft (opakes Objekt, siehe Schema-description).
 * @param eintrag - geparstes, sonst unbekanntes Objekt
 * @param index - Position im Array, für die Fehlermeldung
 * @returns Liste der Regelverletzungen; leer = gültig
 */
function validiereSchemaEntwurf(eintrag: unknown, index: number): string[] {
  const pfad = `schema_entwuerfe[${index}]`
  if (!istObjekt(eintrag)) return [`'${pfad}' muss ein Objekt sein`]
  const verstoesse: string[] = []
  for (const feld of Object.keys(eintrag)) {
    if (!SCHEMA_ENTWURF_FELDER.has(feld)) verstoesse.push(`'${pfad}' trägt unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  for (const feld of SCHEMA_ENTWURF_FELDER) {
    if (!(feld in eintrag)) verstoesse.push(`'${pfad}.${feld}' fehlt`)
  }
  for (const feld of ['name', 'zweck']) {
    if (feld in eintrag && !istNichtLeererString(eintrag[feld])) verstoesse.push(`'${pfad}.${feld}' muss ein nicht-leerer String sein`)
  }
  if ('json_schema' in eintrag && !istObjekt(eintrag.json_schema)) {
    verstoesse.push(`'${pfad}.json_schema' muss ein Objekt sein`)
  }
  return verstoesse
}

/**
 * Prüft ein einzelnes Element von entscheidung.optionen gegen die
 * schemas/ergebnis-architektur.schema.json'-Options-Form.
 * @param eintrag - geparstes, sonst unbekanntes Objekt
 * @param entscheidungIndex - Position der Entscheidung, für die Fehlermeldung
 * @param optionIndex - Position der Option, für die Fehlermeldung
 * @returns Liste der Regelverletzungen; leer = gültig
 */
function validiereOption(eintrag: unknown, entscheidungIndex: number, optionIndex: number): string[] {
  const pfad = `entscheidungen_mensch[${entscheidungIndex}].optionen[${optionIndex}]`
  if (!istObjekt(eintrag)) return [`'${pfad}' muss ein Objekt sein`]
  const verstoesse: string[] = []
  for (const feld of Object.keys(eintrag)) {
    if (!OPTION_FELDER.has(feld)) verstoesse.push(`'${pfad}' trägt unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  for (const feld of OPTION_FELDER) {
    if (!(feld in eintrag)) verstoesse.push(`'${pfad}.${feld}' fehlt`)
  }
  if ('titel' in eintrag && !istNichtLeererString(eintrag.titel)) verstoesse.push(`'${pfad}.titel' muss ein nicht-leerer String sein`)
  for (const feld of ['vorteile', 'nachteile']) {
    if (feld in eintrag && !istStringListe(eintrag[feld])) verstoesse.push(`'${pfad}.${feld}' muss ein Array aus nicht-leeren Strings sein`)
  }
  return verstoesse
}

/**
 * Prüft ein einzelnes Element von daten.entscheidungen_mensch gegen die
 * schemas/ergebnis-architektur.schema.json'-Form — inklusive der
 * Validator-Kopplung "mindestens eine Option" (kein 'minItems' im Schema,
 * F-423-Muster) und "'empfehlung' nennt den Titel einer der gelisteten
 * Optionen" (keine erfundene Empfehlung).
 * @param eintrag - geparstes, sonst unbekanntes Objekt
 * @param index - Position im Array, für die Fehlermeldung
 * @returns Liste der Regelverletzungen; leer = gültig
 */
function validiereEntscheidungMensch(eintrag: unknown, index: number): string[] {
  const pfad = `entscheidungen_mensch[${index}]`
  if (!istObjekt(eintrag)) return [`'${pfad}' muss ein Objekt sein`]
  const verstoesse: string[] = []
  for (const feld of Object.keys(eintrag)) {
    if (!ENTSCHEIDUNG_FELDER.has(feld)) verstoesse.push(`'${pfad}' trägt unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  for (const feld of ENTSCHEIDUNG_FELDER) {
    if (!(feld in eintrag)) verstoesse.push(`'${pfad}.${feld}' fehlt`)
  }
  for (const feld of ['frage', 'auswirkung_bestand', 'empfehlung', 'begruendung']) {
    if (feld in eintrag && !istNichtLeererString(eintrag[feld])) verstoesse.push(`'${pfad}.${feld}' muss ein nicht-leerer String sein`)
  }
  if ('optionen' in eintrag) {
    if (!Array.isArray(eintrag.optionen)) {
      verstoesse.push(`'${pfad}.optionen' muss ein Array sein`)
    } else {
      verstoesse.push(...eintrag.optionen.flatMap((option, optionIndex) => validiereOption(option, index, optionIndex)))
      if (eintrag.optionen.length === 0) {
        verstoesse.push(`'${pfad}.optionen' muss mindestens einen Eintrag tragen`)
      }
      if (istNichtLeererString(eintrag.empfehlung)) {
        const titel = (eintrag.optionen as unknown[]).filter(istObjekt).map((option) => option.titel)
        if (!titel.includes(eintrag.empfehlung)) {
          verstoesse.push(`'${pfad}.empfehlung' ('${eintrag.empfehlung}') nennt keinen Titel aus '${pfad}.optionen' — keine Option erfinden`)
        }
      }
    }
  }
  return verstoesse
}

/**
 * Prüft ein einzelnes Element von daten.capabilities_bedarf gegen die
 * schemas/ergebnis-architektur.schema.json'-Form — inklusive der
 * Validator-Kopplung "eine gesetzte ressource_id muss im eingespeisten
 * Capability-Auszug existieren" (Muster validiereCapabilityBedarf,
 * src/product-coach/index.ts — hier eigenständig nachgebaut, weil die
 * product-coach-Funktion selbst nicht exportiert ist; nur der Renderer
 * baueCapabilityAuszug wird wiederverwendet, siehe Kopfkommentar). Ohne
 * übergebene bekannteRessourcenIds (undefined) bleibt diese eine Prüfung aus.
 * @param eintrag - geparstes, sonst unbekanntes Objekt
 * @param index - Position im Array, für die Fehlermeldung
 * @param bekannteRessourcenIds - bekannte Ressourcen-IDs aus dem Capability-Auszug, oder undefined (Prüfung aus)
 * @returns Liste der Regelverletzungen; leer = gültig
 */
function validiereCapabilityBedarf(eintrag: unknown, index: number, bekannteRessourcenIds: string[] | undefined): string[] {
  const pfad = `capabilities_bedarf[${index}]`
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
 * Prüft ein einzelnes Element von daten.evidenz gegen die
 * schemas/ergebnis-architektur.schema.json'-Form.
 * @param eintrag - geparstes, sonst unbekanntes Objekt
 * @param index - Position im Array, für die Fehlermeldung
 * @returns Liste der Regelverletzungen; leer = gültig
 */
function validiereEvidenzEintrag(eintrag: unknown, index: number): string[] {
  const pfad = `evidenz[${index}]`
  if (!istObjekt(eintrag)) return [`'${pfad}' muss ein Objekt sein`]
  const verstoesse: string[] = []
  for (const feld of Object.keys(eintrag)) {
    if (!EVIDENZ_FELDER.has(feld)) verstoesse.push(`'${pfad}' trägt unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  for (const feld of EVIDENZ_FELDER) {
    if (!(feld in eintrag)) verstoesse.push(`'${pfad}.${feld}' fehlt`)
  }
  if ('marker' in eintrag && (typeof eintrag.marker !== 'string' || !EVIDENZ_MARKER.includes(eintrag.marker))) {
    verstoesse.push(`'${pfad}.marker' muss einer von ${EVIDENZ_MARKER.join(', ')} sein`)
  }
  if ('aussage' in eintrag && !istNichtLeererString(eintrag.aussage)) verstoesse.push(`'${pfad}.aussage' muss ein nicht-leerer String sein`)
  return verstoesse
}

/**
 * Reine Funktion: prüft ein geparstes Objekt gegen
 * schemas/ergebnis-architektur.schema.json. Keine Seiteneffekte, kein
 * Datei-I/O — Muster validiereErgebnisProductCoach (src/product-coach/index.ts, D5).
 * @param daten - geparstes, sonst unbekanntes Objekt
 * @param bekannteRessourcenIds - bekannte Ressourcen-IDs aus dem in den Lauf
 *   eingespeisten Capability-Auszug (baueCapabilityAuszug) — prüft, dass keine
 *   'capabilities_bedarf[].ressource_id' erfunden ist. Weggelassen/undefined
 *   lässt diese eine Prüfung aus (z. B. reine Formtests ohne Ressourcenkontext).
 * @returns Liste der Regelverletzungen; leeres Array = gültig
 */
export function validiereErgebnisArchitektur(daten: unknown, bekannteRessourcenIds?: string[]): string[] {
  if (!istObjekt(daten)) {
    return ['Wurzel ist kein Objekt']
  }
  const verstoesse: string[] = []

  for (const feld of Object.keys(daten)) {
    if (!ERGEBNIS_ARCHITEKTUR_FELDER.has(feld)) verstoesse.push(`unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  for (const feld of ERGEBNIS_ARCHITEKTUR_FELDER) {
    if (!(feld in daten)) verstoesse.push(`Pflichtfeld '${feld}' fehlt`)
  }

  if ('modus' in daten && (typeof daten.modus !== 'string' || !MODUS_WERTE.includes(daten.modus))) {
    verstoesse.push(`'modus' muss einer von ${MODUS_WERTE.join(', ')} sein`)
  }
  if ('zusammenfassung' in daten && !istNichtLeererString(daten.zusammenfassung)) {
    verstoesse.push("'zusammenfassung' muss ein nicht-leerer String sein")
  }

  if ('module' in daten) {
    if (!Array.isArray(daten.module)) verstoesse.push("'module' muss ein Array sein")
    else verstoesse.push(...daten.module.flatMap((eintrag, index) => validiereModul(eintrag, index)))
  }
  if ('adr_entwuerfe' in daten) {
    if (!Array.isArray(daten.adr_entwuerfe)) verstoesse.push("'adr_entwuerfe' muss ein Array sein")
    else verstoesse.push(...daten.adr_entwuerfe.flatMap((eintrag, index) => validiereAdrEntwurf(eintrag, index)))
  }
  if ('schema_entwuerfe' in daten) {
    if (!Array.isArray(daten.schema_entwuerfe)) verstoesse.push("'schema_entwuerfe' muss ein Array sein")
    else verstoesse.push(...daten.schema_entwuerfe.flatMap((eintrag, index) => validiereSchemaEntwurf(eintrag, index)))
  }
  if ('entscheidungen_mensch' in daten) {
    if (!Array.isArray(daten.entscheidungen_mensch)) verstoesse.push("'entscheidungen_mensch' muss ein Array sein")
    else verstoesse.push(...daten.entscheidungen_mensch.flatMap((eintrag, index) => validiereEntscheidungMensch(eintrag, index)))
  }
  if ('capabilities_bedarf' in daten) {
    if (!Array.isArray(daten.capabilities_bedarf)) verstoesse.push("'capabilities_bedarf' muss ein Array sein")
    else verstoesse.push(...daten.capabilities_bedarf.flatMap((eintrag, index) => validiereCapabilityBedarf(eintrag, index, bekannteRessourcenIds)))
  }
  if ('evidenz' in daten) {
    if (!Array.isArray(daten.evidenz)) {
      verstoesse.push("'evidenz' muss ein Array sein")
    } else {
      verstoesse.push(...daten.evidenz.flatMap((eintrag, index) => validiereEvidenzEintrag(eintrag, index)))
      if (daten.evidenz.length === 0) verstoesse.push("'evidenz' muss mindestens einen Eintrag tragen — ein Architekturentwurf ohne belegte Aussage ist eine Behauptung ohne Grundlage")
    }
  }

  return verstoesse
}

function baueFeatureRolleninstruktion(): string[] {
  return [
    "Du bist als Rolle 'architekt' verantwortlich für einen Architekturentwurf VOR dem Bau eines einzelnen Features — Modulschnitt, ADR-würdige Entscheidungen, Datenmodell als Schema, ohne selbst Code zu schreiben.",
    'Prüfrolle bleibt der Subagent architecture-advisor — dein Entwurf ist ein Vorschlag, keine Freigabe.',
    'Schlage nur, was der Auftrag tatsächlich verlangt — keine Vorratsarchitektur für hypothetische künftige Anforderungen. Jede Aussage trägt einen Evidenz-Marker ([Fakt]/[Schlussfolgerung]/[Annahme]/[offene Unsicherheit], .claude/skills/advisor-pass) im evidenz-Array.',
    'Deine GESAMTE Antwort besteht aus GENAU EINEM JSON-Objekt und sonst NICHTS: kein einleitender Satz, keine Erklärung davor oder danach, kein Markdown, kein Codezaun (```). Die allererste Zeile deiner Antwort ist "{", die letzte Zeile ist "}".',
    'Das JSON-Objekt hat GENAU diese Form (schemas/ergebnis-architektur.schema.json):',
    '{',
    '  "modus": "feature",',
    '  "zusammenfassung": "<für den Menschen lesbare Zusammenfassung, Pflichtfeld>",',
    '  "module": [ { "name": "<string>", "zweck": "<string>", "abhaengigkeiten": ["<Name eines anderen Moduls aus diesem Entwurf>", ...] }, ... ] (leer, wenn kein neuer Modulschnitt),',
    '  "adr_entwuerfe": [ { "titel": "<string>", "kontext": "<string>", "entscheidung": "<string>", "alternativen": ["<erwogene, nicht gewählte Option>", ...], "konsequenzen": ["<Folge der Entscheidung>", ...] }, ... ] (leer, wenn keine ADR-würdige Entscheidung),',
    '  "schema_entwuerfe": [ { "name": "<string>", "zweck": "<string>", "json_schema": { <ein JSON-Schema-Fragment> } }, ... ] (leer, wenn kein Datenmodell),',
    '  "entscheidungen_mensch": [ { "frage": "<string>", "optionen": [ { "titel": "<string>", "vorteile": ["<string>", ...], "nachteile": ["<string>", ...] }, ... ] (mindestens ein Eintrag), "auswirkung_bestand": "<string, auch \'keine\'>", "empfehlung": "<Titel einer der Optionen oben>", "begruendung": "<string>" }, ... ] (leer, wenn keine offene Entscheidung),',
    '  "capabilities_bedarf": [ { "bedarf": "<string>", "ressource_id": "<id aus dem Capability-Auszug>" | null, "status": "vorhanden" | "offen" | "fehlt" }, ... ] (leer, wenn kein Capability-Bedarf),',
    '  "evidenz": [ { "marker": "[Fakt]" | "[Schlussfolgerung]" | "[Annahme]" | "[offene Unsicherheit]", "aussage": "<string>" }, ... ] (mindestens ein Eintrag)',
    '}',
    "In 'entscheidungen_mensch[].empfehlung' NUR einen Titel nennen, der auch in 'optionen' steht — keine Option erfinden. In 'capabilities_bedarf[].ressource_id' NUR eine ID aus dem eingespeisten Capability-Auszug nennen, sonst 'null' und 'status': 'fehlt' — keine Ressource erfinden. Kein weiteres Feld außer den genannten.",
  ]
}

/**
 * F39 WS-1: Rolleninstruktion für Modus 'projekt' — Projektmodus
 * 'Architektur-Grundlage' (E-M5-13): Stack-ADR, Modulschnitt, Datenmodell als
 * Schemas für das GESAMTE Vorhaben statt eines einzelnen Features.
 */
function baueProjektRolleninstruktion(): string[] {
  const zeilen = baueFeatureRolleninstruktion()
  zeilen[0] =
    "Du bist als Rolle 'architekt' im Modus 'projekt' verantwortlich für die Architektur-Grundlage eines GESAMTEN Vorhabens VOR dem Bau — Stack-ADR, Modulschnitt, Datenmodell als Schema, ohne selbst Code zu schreiben."
  const formIndex = zeilen.findIndex((zeile) => zeile === '  "modus": "feature",')
  if (formIndex !== -1) zeilen[formIndex] = '  "modus": "projekt",'
  return zeilen
}

/**
 * Baut den Auftragstext für einen Architekt-Lauf: Rolleninstruktion (je
 * 'modus' unterschiedlich), gefolgt vom optionalen Capability-Auszug (nur
 * Modus 'projekt', F36/E-M5-13) und dem eigentlichen Planungstext. Ausgabe
 * NUR als JSON gemäß Schema (F-337-Lehre, Muster baueCoachAuftragstext).
 * Reine Funktion, kein I/O.
 * @param planungstext - der vom Menschen/Vorgängerschritt gelieferte Planungsauftrag
 * @param modus - 'feature' (Default) oder 'projekt' (Architektur-Grundlage, E-M5-13)
 * @param capabilityAuszug - vorab gebauter Text (baueCapabilityAuszug, aus src/product-coach
 *   importiert) — nur bei modus 'projekt' und nicht-null eingefügt; im Modus 'feature' ignoriert
 * @returns der vollständige Auftragstext, der als AusfuehrungsEingaben.auftragstext
 *   den einzigen Eingabekanal für den Lauf bildet
 */
export function baueArchitektAuftragstext(planungstext: string, modus: ArchitektModus = 'feature', capabilityAuszug: string | null = null): string {
  const zeilen = modus === 'projekt' ? baueProjektRolleninstruktion() : baueFeatureRolleninstruktion()
  if (modus === 'projekt' && capabilityAuszug !== null) {
    zeilen.push('', 'Verfügbare Ressourcen (Capability-Auszug):', capabilityAuszug)
  }
  zeilen.push('', 'Planungsauftrag:', planungstext)
  return zeilen.join('\n')
}

export { baueCapabilityAuszug }

export type {
  AdrEntwurf,
  ArchitektModus,
  CapabilityBedarf,
  EntscheidungMensch,
  EntscheidungOption,
  ErgebnisArchitektur,
  EvidenzEintrag,
  ModulEntwurf,
  SchemaEntwurf,
}
