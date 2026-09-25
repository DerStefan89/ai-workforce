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
 * F42 WS-2 (löst F-685): istStackOffen liest, ob der Stack des Zielprojekts
 * noch offen ist (CLAUDE.md fehlt oder trägt den Füllungs-Marker);
 * validiereErgebnisArchitektur erzwingt dann über den optionalen
 * 'stackOffen'-Parameter, dass 'entscheidungen_mensch' mindestens eine
 * Entscheidung mit 'kategorie': 'stack' trägt — der Architekt darf den Stack
 * sonst nicht mehr stillschweigend selbst festlegen.
 *
 * F42 WS-4 (löst F-712/F-714, state/findings.md, real beobachtet im F42-WS-3-
 * Reallauf gegen haushaltsbuch2): baueUmsetzungsInstruktion bekommt einen
 * 'modus'-Parameter — im Projektmodus ('projekt') ist der Architekturentwurf
 * AUSSCHLIESSLICH Kontext, kein Bauauftrag; der Auftrags-Scope hat Vorrang
 * (F-712). pruefeProjektmodusScope prüft die real geänderten Dateien eines
 * Projektmodus-'ausfuehrung'-Laufs deterministisch gegen die Allowlist
 * (docs/**, features/**, CLAUDE.md) — die zweite, technische Hälfte von
 * F-712, neben der Instruktion. baueStackEntscheidungsInstruktion verlangt
 * nach einer 'kategorie: stack'-Entscheidung verpflichtend den
 * CLAUDE.md-Stack-Abschnitt und ein ADR (F-714) — beide Schreibziele liegen
 * innerhalb der F-712-Allowlist.
 *
 * Wird aufgerufen von: scripts/check-f39-architekt.mjs,
 * scripts/check-f42-projekt-harness.mjs, scripts/leitstand-server.mjs
 * (istStackOffen, real gegen die repoWurzel des Zielprojekts),
 * src/architekt/architekt.test.ts.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { baueCapabilityAuszug } from '../product-coach/index.ts'
import type {
  AdrEntwurf,
  ArchitektModus,
  CapabilityBedarf,
  EntscheidungKategorie,
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
// F42 WS-2 (löst F-685): 'kategorie' ist ein erlaubtes Feld (additionalProperties-Whitelist), aber
// bewusst NICHT in ENTSCHEIDUNG_PFLICHTFELDER — bestehende Ausgaben ohne dieses Feld bleiben
// gültig (Rückwärtskompatibilität), der Schema-Datei-Zwang "jede Eigenschaft steht in required"
// gilt nur für schemas/ergebnis-architektur.schema.json (Codex-Structured-Output), nicht für
// diesen handgeschriebenen Validator.
const ENTSCHEIDUNG_FELDER = new Set(['frage', 'optionen', 'auswirkung_bestand', 'empfehlung', 'begruendung', 'kategorie'])
const ENTSCHEIDUNG_PFLICHTFELDER = new Set(['frage', 'optionen', 'auswirkung_bestand', 'empfehlung', 'begruendung'])
const KATEGORIE_WERTE = ['stack', 'fachlich', 'sonstig']
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
 * schemas/ergebnis-architektur.schema.json'-Form. 'json_schema' ist seit
 * F-638 ein String (JSON-Text, kein verschachteltes Objekt — ein echtes,
 * beliebig strukturiertes Objekt kann das rekursive additionalProperties:false
 * des Codex-Strict-Modus nicht erfüllen, ohne seinen Zweck als opakes Fragment
 * zu verlieren). Regel 1c (src/workflow/index.ts) hält den Workflow an, wenn
 * der String kein gültiges JSON ist — ein unlesbarer String wäre für den
 * nachfolgenden 'ausfuehrung'-Schritt (baueUmsetzungsInstruktion) unbrauchbar.
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
  if ('json_schema' in eintrag) {
    if (!istNichtLeererString(eintrag.json_schema)) {
      verstoesse.push(`'${pfad}.json_schema' muss ein nicht-leerer String sein (JSON-Text, F-638)`)
    } else {
      try {
        JSON.parse(eintrag.json_schema)
      } catch (fehler) {
        verstoesse.push(`'${pfad}.json_schema' ist kein gültiges JSON (${(fehler as Error).message})`)
      }
    }
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
  for (const feld of ENTSCHEIDUNG_PFLICHTFELDER) {
    if (!(feld in eintrag)) verstoesse.push(`'${pfad}.${feld}' fehlt`)
  }
  for (const feld of ['frage', 'auswirkung_bestand', 'empfehlung', 'begruendung']) {
    if (feld in eintrag && !istNichtLeererString(eintrag[feld])) verstoesse.push(`'${pfad}.${feld}' muss ein nicht-leerer String sein`)
  }
  if ('kategorie' in eintrag && eintrag.kategorie !== null && !KATEGORIE_WERTE.includes(eintrag.kategorie as string)) {
    verstoesse.push(`'${pfad}.kategorie' muss 'null' oder einer von ${KATEGORIE_WERTE.join(', ')} sein`)
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
 * @param stackOffen - F42 WS-2 (löst F-685): true, wenn der Stack des Zielprojekts noch offen ist
 *   (istStackOffen). Erzwingt dann mindestens einen Eintrag in 'entscheidungen_mensch' mit
 *   'kategorie': 'stack' — der Architekt darf den Stack sonst stillschweigend selbst festlegen.
 *   Default false, rückwärtskompatibel (bestehende Aufrufer unverändert).
 * @returns Liste der Regelverletzungen; leeres Array = gültig
 */
export function validiereErgebnisArchitektur(daten: unknown, bekannteRessourcenIds?: string[], stackOffen = false): string[] {
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

  // F42 WS-2 (löst F-685): bei offenem Stack darf der Architekt ihn nicht selbst festlegen,
  // sondern muss ihn als Entscheidung mit kategorie 'stack' vorlegen. Nur geprüft, wenn
  // 'entscheidungen_mensch' überhaupt ein Array ist — ein bereits strukturell ungültiges Array
  // hat schon oben seine eigenen Verstöße gesammelt.
  if (stackOffen && Array.isArray(daten.entscheidungen_mensch)) {
    const traegtStackEntscheidung = daten.entscheidungen_mensch.some((eintrag) => istObjekt(eintrag) && eintrag.kategorie === 'stack')
    if (!traegtStackEntscheidung) {
      verstoesse.push("Stack offen, aber keine Entscheidung mit kategorie stack vorgelegt (F-685)")
    }
  }

  return verstoesse
}

/**
 * Reine Funktion (liest nur, kein Schreibzugriff): true, wenn der Stack des Projekts unter
 * 'repoWurzel' noch offen ist — CLAUDE.md fehlt, oder dessen Zeile mit "Technischer Stack" trägt
 * noch den Füllungs-Marker '[FÜLLUNG]' (Muster vorlagen/projekt-skelett/CLAUDE.md, F42 WS-1).
 * Ein bereits gefülltes CLAUDE.md (Muster dieses Repos: "## 🏗️ Technischer Stack" ohne Marker,
 * gefolgt vom echten Stacktext) liefert false. F42 WS-2, löst F-685.
 * @param repoWurzel - absoluter Pfad der Repo-Wurzel des Zielprojekts
 * @returns true, wenn der Stack noch offen ist
 */
export function istStackOffen(repoWurzel: string): boolean {
  const claudeMdPfad = join(repoWurzel, 'CLAUDE.md')
  if (!existsSync(claudeMdPfad)) return true
  const stackZeile = readFileSync(claudeMdPfad, 'utf-8')
    .split('\n')
    .find((zeile) => zeile.includes('Technischer Stack'))
  return stackZeile !== undefined && stackZeile.includes('[FÜLLUNG]')
}

/**
 * Reine Funktion (liest nur, kein Schreibzugriff): true, wenn mindestens eine Datei unter
 * 'docs/adr/' (außer 'TEMPLATE.md') im Projekt unter 'repoWurzel' den String
 * 'entscheidungArtefaktId' enthält. F42 WS-4 (löst F-714, QA-Befund): istStackOffen prüft nur die
 * CLAUDE.md-Hälfte von baueStackEntscheidungsInstruktions Pflicht ("beide Schreibziele sind
 * Pflicht") — ohne diese zweite Prüfung bestünde ein Lauf, der CLAUDE.md füllt, aber nie ein ADR
 * anlegt (oder eines ohne Bezug zur tatsächlichen Entscheidung), die F-714-Grenze unbemerkt.
 * Fehlt der Ordner, liefert die Funktion false (kein Wurf) — Muster istStackOffen.
 * @param repoWurzel - absoluter Pfad der Repo-Wurzel des Zielprojekts
 * @param entscheidungArtefaktId - Kernartefakt-Id der Entscheidung (workflowEntscheidungArtefaktId), nach der in jeder ADR-Datei gesucht wird
 * @returns true, wenn mindestens ein referenzierendes ADR gefunden wurde
 */
export function traegtAdrVerweisAufEntscheidung(repoWurzel: string, entscheidungArtefaktId: string): boolean {
  const adrOrdner = join(repoWurzel, 'docs', 'adr')
  if (!existsSync(adrOrdner)) return false
  return readdirSync(adrOrdner)
    .filter((datei) => datei.endsWith('.md') && datei !== 'TEMPLATE.md')
    .some((datei) => readFileSync(join(adrOrdner, datei), 'utf-8').includes(entscheidungArtefaktId))
}

/** F42 WS-2 (löst F-685): angehängt an die Rolleninstruktion, wenn istStackOffen(repoWurzel) true liefert — hält den Architekten an, den Stack als Entscheidung statt als eigene Festlegung vorzulegen. */
const STACK_OFFEN_HINWEIS =
  "Der Stack (Laufzeit, Sprache, Speicherform) dieses Projekts ist NOCH OFFEN (CLAUDE.md trägt den Füllungs-Marker oder existiert noch nicht) — lege ihn NICHT selbst fest, auch nicht als ADR-Entwurf. Trage stattdessen einen Eintrag in 'entscheidungen_mensch' mit 'kategorie': 'stack' ein, mit mindestens zwei 'optionen' inkl. je eigener Vor-/Nachteile; 'empfehlung' nennt den Titel einer dieser Optionen."

function baueFeatureRolleninstruktion(stackOffen: boolean): string[] {
  const zeilen = [
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
    '  "schema_entwuerfe": [ { "name": "<string>", "zweck": "<string>", "json_schema": "<JSON-Text eines JSON-Schema-Fragments, als STRING, kein verschachteltes Objekt>" }, ... ] (leer, wenn kein Datenmodell),',
    '  "entscheidungen_mensch": [ { "frage": "<string>", "optionen": [ { "titel": "<string>", "vorteile": ["<string>", ...], "nachteile": ["<string>", ...] }, ... ] (mindestens ein Eintrag), "auswirkung_bestand": "<string, auch \'keine\'>", "empfehlung": "<Titel einer der Optionen oben>", "begruendung": "<string>", "kategorie": "stack" | "fachlich" | "sonstig" | null (optional, F42 WS-2) }, ... ] (leer, wenn keine offene Entscheidung),',
    '  "capabilities_bedarf": [ { "bedarf": "<string>", "ressource_id": "<id aus dem Capability-Auszug>" | null, "status": "vorhanden" | "offen" | "fehlt" }, ... ] (leer, wenn kein Capability-Bedarf),',
    '  "evidenz": [ { "marker": "[Fakt]" | "[Schlussfolgerung]" | "[Annahme]" | "[offene Unsicherheit]", "aussage": "<string>" }, ... ] (mindestens ein Eintrag)',
    '}',
    "In 'entscheidungen_mensch[].empfehlung' NUR einen Titel nennen, der auch in 'optionen' steht — keine Option erfinden. In 'capabilities_bedarf[].ressource_id' NUR eine ID aus dem eingespeisten Capability-Auszug nennen, sonst 'null' und 'status': 'fehlt' — keine Ressource erfinden. 'schema_entwuerfe[].json_schema' ist ein STRING mit dem JSON-Text des Schema-Fragments (z. B. \"{\\\"type\\\":\\\"object\\\",\\\"additionalProperties\\\":false,...}\"), KEIN verschachteltes JSON-Objekt. Kein weiteres Feld außer den genannten.",
  ]
  if (stackOffen) zeilen.push(STACK_OFFEN_HINWEIS)
  return zeilen
}

/**
 * F39 WS-1: Rolleninstruktion für Modus 'projekt' — Projektmodus
 * 'Architektur-Grundlage' (E-M5-13): Stack-ADR, Modulschnitt, Datenmodell als
 * Schemas für das GESAMTE Vorhaben statt eines einzelnen Features.
 */
function baueProjektRolleninstruktion(stackOffen: boolean): string[] {
  const zeilen = baueFeatureRolleninstruktion(stackOffen)
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
 * @param stackOffen - F42 WS-2 (löst F-685): true, wenn istStackOffen(repoWurzel) für das
 *   Zielprojekt true liefert — hängt STACK_OFFEN_HINWEIS an die Rolleninstruktion an. Default
 *   false, rückwärtskompatibel.
 * @returns der vollständige Auftragstext, der als AusfuehrungsEingaben.auftragstext
 *   den einzigen Eingabekanal für den Lauf bildet
 */
export function baueArchitektAuftragstext(planungstext: string, modus: ArchitektModus = 'feature', capabilityAuszug: string | null = null, stackOffen = false): string {
  const zeilen = modus === 'projekt' ? baueProjektRolleninstruktion(stackOffen) : baueFeatureRolleninstruktion(stackOffen)
  if (modus === 'projekt' && capabilityAuszug !== null) {
    zeilen.push('', 'Verfügbare Ressourcen (Capability-Auszug):', capabilityAuszug)
  }
  zeilen.push('', 'Planungsauftrag:', planungstext)
  return zeilen.join('\n')
}

/**
 * F39 WS-3a: Zusatzblock für die 'ausfuehrung'-Instruktion eines hoch-Workflow-Schritts, der
 * einen Architekturentwurf (Rolle architekt, ergebnis-architektur) als 'ergebnis-@'-Eingabe
 * bekommt — der Entwurf selbst steht bereits unverändert als eigene Eingabe-Anfrage im Kontext
 * (loeseSchrittEingabenAuf), dieser Block übersetzt seine vier Ergebnis-Kategorien nur in
 * konkrete Schreibpfade, statt ihn als bloßen Zusatzkontext ungenutzt zu lassen. Reine Funktion,
 * kein I/O, kennt das tatsächliche Ergebnis nicht (das liest der Worker selbst aus dem Kontext).
 *
 * F42 WS-4 (löst F-712, real beobachtet im F42-WS-3-Reallauf gegen haushaltsbuch2: ein
 * Projektmodus-Auftrag "AUSSCHLIESSLICH Dokumentation" wurde trotzdem als Bauauftrag für
 * Schemas/Skripte/ADRs gelesen): im Modus 'projekt' ist der Entwurf AUSSCHLIESSLICH Kontext,
 * kein Bauauftrag — der Auftrags-Scope (der ursprüngliche Auftragstext, bereits vor diesem
 * Zusatzblock im Prompt) hat Vorrang. Modus 'feature' bleibt bitgenau die bisherige, seit F39
 * WS-3a bestehende Instruktion (Rückwärtskompatibilität, Default-Parameter).
 * @param modus - 'feature' (Default, unverändert) oder 'projekt' (F42 WS-4, löst F-712)
 * @returns Zeilen des Zusatzblocks, an den bestehenden Auftragstext anzuhängen
 */
export function baueUmsetzungsInstruktion(modus: ArchitektModus = 'feature'): string[] {
  if (modus === 'projekt') {
    return [
      "Zusätzlich liegt dir ein geprüfter Architekturentwurf (Rolle 'architekt', Schema 'ergebnis-architektur') als Eingabe vor — im Projektmodus ist er AUSSCHLIESSLICH Kontext für deine Entscheidungen, KEIN Bauauftrag.",
      'Der Scope des ursprünglichen Auftrags (oben im Auftragstext) hat Vorrang vor dem Architekturentwurf: setze NUR um, was der Auftrag tatsächlich verlangt — auch wenn der Entwurf weitere Module, ADRs oder Schemas beschreibt, die über diesen Scope hinausgehen.',
      'Solange der Auftrag nicht ausdrücklich mehr verlangt: kein Produktcode, keine Schemas (schemas/**), keine Skripte (scripts/**), keine Änderung an package.json oder scripts/check-*. Erlaubt sind Dokumentationsänderungen (docs/**, features/**, CLAUDE.md), soweit der Auftrag sie verlangt.',
      "Liegt eine bereits erfasste menschliche Architektur-Entscheidung vor (Eingabe 'entscheidung-@', nicht leer): übernimm sie als Dokumentation (z. B. ADR unter docs/adr/), nicht als Freibrief für weitergehende Umsetzung.",
      'Widerspricht dein Umsetzungsvorschlag diesem Scope, dokumentiere die Abweichung ausdrücklich statt sie stillschweigend umzusetzen (CLAUDE.md, Entscheidungsregel 5).',
    ]
  }
  return [
    "Zusätzlich liegt dir ein geprüfter Architekturentwurf (Rolle 'architekt', Schema 'ergebnis-architektur') als Eingabe vor. Setze ihn wie folgt um:",
    "- Für jeden Eintrag in 'adr_entwuerfe': lege 'docs/adr/<slug-aus-titel>.md' nach dem Muster 'docs/adr/TEMPLATE.md' an — fortlaufende ADR-Nummer nach den bestehenden Dateien unter 'docs/adr/' (TEMPLATE.md nicht mitgezählt).",
    "- Für jeden Eintrag in 'schema_entwuerfe': 'json_schema' liegt als String (JSON-Text, F-638) vor — mit JSON.parse in ein Objekt umwandeln, dieses nach 'schemas/<name>.schema.json' schreiben, dazu ein Beispiel 'schemas/examples/<name>.json' anlegen und die Prüfung in das für diesen Auftrag zuständige Gate einhängen.",
    "- Für 'module' bzw. ein neues Datenmodell: ergänze NUR die optionalen technischen Abschnitte, die der Entwurf tatsächlich liefert (z. B. Komponenten/Module, Datenmodell, Interfaces/Contracts, State/Persistenz, Security/Permissions, Datenflüsse, Migration, Red-/Green-Cases), in der betroffenen 'features/<id>/feature.md'.",
    "- Liegt eine bereits erfasste menschliche Architektur-Entscheidung vor (Eingabe 'entscheidung-@', nicht leer): übernimm sie als eigenen Abschnitt 'Entscheidung (Mensch)' im betroffenen ADR.",
    'Keine Umsetzung, die dem Architekturentwurf widerspricht, ohne das ausdrücklich zu vermerken (CLAUDE.md, Entscheidungsregel 5).',
  ]
}

/**
 * F42 WS-4 (löst F-714, state/findings.md F-714, real beobachtet im F42-WS-3-Reallauf gegen
 * haushaltsbuch2: die Stack-Entscheidung blieb im Kontrollzustand stecken, weder CLAUDE.md noch
 * ein ADR wurden geschrieben, istStackOffen blieb dauerhaft true): Zusatzblock für die
 * 'ausfuehrung'-Instruktion eines Projektmodus-Schritts, dessen referenzierter Architektur-Lauf
 * eine Entscheidung mit 'kategorie': 'stack' trägt UND für die bereits eine menschliche Antwort
 * erfasst ist (der Aufrufer prüft beides, diese Funktion nimmt nur noch die Artefakt-Referenz
 * entgegen). Beide verlangten Schreibziele (CLAUDE.md, docs/adr/) liegen innerhalb der
 * F-712-Allowlist — kein Widerspruch zu baueUmsetzungsInstruktion(modus: 'projekt').
 * @param entscheidungArtefaktId - Kernartefakt-Id der erfassten Entscheidung (workflowEntscheidungArtefaktId), für die Referenz im ADR
 * @returns Zeilen des Zusatzblocks, an den bestehenden Auftragstext anzuhängen
 */
export function baueStackEntscheidungsInstruktion(entscheidungArtefaktId: string): string[] {
  return [
    "Eine menschliche Entscheidung mit 'kategorie': 'stack' liegt vor (siehe Eingabe 'entscheidung-@' oben) — setze sie VERPFLICHTEND um, nicht nur als Kontext:",
    "- Fülle in CLAUDE.md den Abschnitt 'Technischer Stack' mit der gewählten Option (Framework/Sprache/Datenbank/Hosting) — entferne dabei den Füllungs-Marker '[FÜLLUNG]' aus der Überschriftzeile.",
    `- Lege ein ADR unter 'docs/adr/' an (fortlaufende Nummer, Muster 'docs/adr/TEMPLATE.md'), das die Entscheidung dokumentiert und ausdrücklich auf das Entscheidungsartefakt '${entscheidungArtefaktId}' verweist.`,
    'Beide Schreibziele sind Pflicht, nicht optional: ohne sie bleibt der Stack für jeden künftigen Architektur-Lauf gegen dieses Projekt offen (F-714) — der Bau darf sich nicht darauf verlassen, dass ein späterer Lauf das nachholt.',
  ]
}

/**
 * F42 WS-4 (löst F-712, state/findings.md F-712): Allowlist der Pfad-Präfixe, in denen ein
 * Projektmodus-'ausfuehrung'-Schritt (herkunft.art === 'projekt_interview') schreiben darf — der
 * Auftrags-Scope hat Vorrang vor dem Architekturentwurf, der Kern erzwingt das zusätzlich zur
 * Instruktion (baueUmsetzungsInstruktion) deterministisch gegen die real geänderten Dateien
 * (Aufrufer: pruefeProjektmodusScope, gefüttert aus der bestehenden Änderungsübersicht, F23 WS-0).
 * Feature-Modus bleibt davon unberührt — die Allowlist gilt ausschließlich im Projektmodus.
 */
const PROJEKTMODUS_SCOPE_ALLOWLIST_PRAEFIXE = ['docs/', 'features/']

/** F42 WS-4 (löst F-712): einzelne, nicht präfixartig erlaubte Pfade der Allowlist (siehe PROJEKTMODUS_SCOPE_ALLOWLIST_PRAEFIXE). */
const PROJEKTMODUS_SCOPE_ALLOWLIST_DATEIEN = new Set(['CLAUDE.md'])

/**
 * Reine Funktion (F42 WS-4, löst F-712, real beobachtet im F42-WS-3-Reallauf gegen
 * haushaltsbuch2: ein Nur-Doku-Auftrag im Projektmodus baute trotzdem schemas/,
 * scripts/check-schemas.mjs und erweiterte package.json): prüft die real geänderten Dateipfade
 * eines Projektmodus-'ausfuehrung'-Laufs gegen PROJEKTMODUS_SCOPE_ALLOWLIST_PRAEFIXE/_DATEIEN.
 * Kein I/O — der Aufrufer liest die Pfade aus der bereits registrierten Änderungsübersicht
 * ('aenderungsuebersicht-<laufId>', src/aenderungsuebersicht/index.ts) und übergibt nur die
 * Pfad-Liste, kein neuer Lesepfad.
 * @param pfade - real geänderte/neue/gelöschte Dateipfade eines Laufs (AenderungsuebersichtDatei[].pfad)
 * @returns Pfade außerhalb der Allowlist; leeres Array = kein Scope-Verstoß
 */
export function pruefeProjektmodusScope(pfade: string[]): string[] {
  return pfade.filter((pfad) => !PROJEKTMODUS_SCOPE_ALLOWLIST_DATEIEN.has(pfad) && !PROJEKTMODUS_SCOPE_ALLOWLIST_PRAEFIXE.some((praefix) => pfad.startsWith(praefix)))
}

export { baueCapabilityAuszug }

export type {
  AdrEntwurf,
  ArchitektModus,
  CapabilityBedarf,
  EntscheidungKategorie,
  EntscheidungMensch,
  EntscheidungOption,
  ErgebnisArchitektur,
  EvidenzEintrag,
  ModulEntwurf,
  SchemaEntwurf,
}
