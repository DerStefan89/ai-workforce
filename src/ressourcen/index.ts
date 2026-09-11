/**
 * Datei: src/ressourcen/index.ts
 *
 * Zweck: Ressourcen-Modul (F19 WS-2, Meilenstein 3, docs/projekt/
 * zielfassung.md §13.4). Vier reine Verantwortlichkeiten:
 * validiereRessourcenDaten prüft ein geparstes Objekt gegen
 * schemas/ressourcen.schema.json (Muster validiereErgebnisRouter,
 * D5 — handgeschrieben statt ajv, dieselbe Repo-Entscheidung) plus die drei
 * semantischen Regeln R1-R3, die das Schema allein nicht abbilden kann;
 * loeseRessourcenAuf leitet aus einem Register-Eintrag und der laufenden
 * Umgebung ab, ob eine Ressource verfügbar ist; ressourcenFuerCapability und
 * pruefeAbdeckung sind reine Lookups auf dem Ergebnis davon. Dieses Modul
 * ENTSCHEIDET nichts — keine automatische Worker- oder Modellwahl (E-M3-3
 * bleibt unberührt, docs/projekt/zielfassung.md §13.4): es prüft und meldet.
 *
 * Wichtig: loeseRessourcenAuf liest für typ 'worker' zwei verschiedene
 * Stellen derselben Startvorlage — Claude-Code-Felder liegen flach auf
 * oberster Ebene, Codex-Felder genestet unter worker.codex (bewusste
 * v0-Schuld der Startvorlage, state/findings.md F-341). Wer
 * schemas/startvorlage.schema.json auf v1 hebt, prüft diese Asymmetrie mit.
 *
 * Ebenfalls wichtig (state/findings.md F-346): 'code-reviewer' und 'router'
 * tragen in src/rollen/index.ts weiterhin erlaubte_worker: ['claude-code',
 * 'codex'] — UNVERÄNDERT, eine Verengung auf ['codex'] wurde für beide real
 * geprüft und verworfen (Gründe im Kopfkommentar von src/rollen/index.ts).
 * 'claude-code' bietet die von beiden Rollen benötigte Capability
 * STRUCTURED_OUTPUT trotzdem nicht an (kein --output-schema-Mechanismus,
 * F-337). Regel 6 in scripts/check-f19-ressourcen.mjs deckt diesen
 * Widerspruch mechanisch auf und trägt dafür zwei eng benannte Ausnahmen
 * (F346_AUSNAHMEN) statt der Verengung.
 *
 * Wird aufgerufen von: scripts/check-f19-ressourcen.mjs,
 * src/ressourcen/ressourcen.test.ts.
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { AufgelosteRessource, CapabilityGap, Ressource } from './types.ts'

const RESSOURCEN_WURZEL_FELDER = new Set(['ressourcen_schema', 'ressourcen'])
const RESSOURCE_FELDER = new Set(['id', 'typ', 'name', 'beschreibung', 'capabilities', 'freigabe', 'herkunft'])
const RESSOURCEN_TYP = ['worker', 'skill', 'extern']
const FREIGABE = ['FREIGEGEBEN', 'OFFEN']
/** Zwilling von WORKER in src/workflow/index.ts. */
const WORKER = ['claude-code', 'codex']
/** herkunft.art -> der dazu passende typ (R3). */
const HERKUNFT_ART_ZU_TYP: Record<string, string> = { startvorlage: 'worker', skill: 'skill', extern: 'extern' }

const ID_MUSTER = /^[a-z0-9][a-z0-9-]*$/
const CAPABILITY_MUSTER = /^[A-Z][A-Z0-9_]*$/
const URL_MUSTER = /^https?:\/\//

function istObjekt(wert: unknown): wert is Record<string, unknown> {
  return typeof wert === 'object' && wert !== null && !Array.isArray(wert)
}

function istNichtLeererString(wert: unknown): wert is string {
  return typeof wert === 'string' && wert.length > 0
}

function meldeUnbekannteFelder(obj: Record<string, unknown>, erlaubt: Set<string>, praefix: string, verstoesse: string[]): void {
  for (const feld of Object.keys(obj)) {
    if (!erlaubt.has(feld)) verstoesse.push(`unbekanntes Feld '${praefix}${feld}' (additionalProperties: false)`)
  }
}

/**
 * Prüft herkunft eines einzelnen Eintrags: Form der jeweiligen Variante
 * (additionalProperties: false) und, falls typ bereits bekannt ist, R3
 * (herkunft.art passt zu typ).
 */
function pruefeHerkunftForm(herkunft: unknown, typ: unknown, praefix: string, verstoesse: string[]): void {
  if (!istObjekt(herkunft)) {
    verstoesse.push(`'${praefix}herkunft' ist kein Objekt`)
    return
  }
  const art = herkunft.art
  if (art === 'startvorlage') {
    meldeUnbekannteFelder(herkunft, new Set(['art', 'worker']), `${praefix}herkunft.`, verstoesse)
    if (typeof herkunft.worker !== 'string' || !WORKER.includes(herkunft.worker)) {
      verstoesse.push(`'${praefix}herkunft.worker' muss einer von ${WORKER.join(', ')} sein`)
    }
  } else if (art === 'skill') {
    meldeUnbekannteFelder(herkunft, new Set(['art', 'pfad']), `${praefix}herkunft.`, verstoesse)
    if (!istNichtLeererString(herkunft.pfad)) verstoesse.push(`'${praefix}herkunft.pfad' muss ein nicht-leerer String sein`)
  } else if (art === 'extern') {
    meldeUnbekannteFelder(herkunft, new Set(['art', 'url']), `${praefix}herkunft.`, verstoesse)
    if (!istNichtLeererString(herkunft.url) || !URL_MUSTER.test(herkunft.url)) {
      verstoesse.push(`'${praefix}herkunft.url' muss mit http:// oder https:// beginnen`)
    }
  } else {
    verstoesse.push(`'${praefix}herkunft.art' muss einer von startvorlage, skill, extern sein`)
    return
  }

  if (typeof typ === 'string' && RESSOURCEN_TYP.includes(typ) && HERKUNFT_ART_ZU_TYP[art as string] !== typ) {
    verstoesse.push(`'${praefix}herkunft.art' ('${art}') passt nicht zu '${praefix}typ' ('${typ}') (R3)`)
  }
}

/**
 * Prüft einen einzelnen ressourcen[]-Eintrag: Form (additionalProperties:
 * false, Enums, Muster) plus R1/R2 (name/beschreibung/freigabe je nach typ)
 * und Eindeutigkeit der id (über gesehenIds, geteilt über alle Einträge).
 */
function pruefeRessourceForm(ressource: unknown, index: number, verstoesse: string[], gesehenIds: Set<string>): void {
  const praefix = `ressourcen[${index}].`
  if (!istObjekt(ressource)) {
    verstoesse.push(`'${praefix.slice(0, -1)}' ist kein Objekt`)
    return
  }
  meldeUnbekannteFelder(ressource, RESSOURCE_FELDER, praefix, verstoesse)

  if (!istNichtLeererString(ressource.id) || !ID_MUSTER.test(ressource.id)) {
    verstoesse.push(`'${praefix}id' muss ein nicht-leerer, kleinbuchstabiger String mit Bindestrich sein`)
  } else if (gesehenIds.has(ressource.id)) {
    verstoesse.push(`'${praefix}id' ('${ressource.id}') ist nicht eindeutig`)
  } else {
    gesehenIds.add(ressource.id)
  }

  const typ = ressource.typ
  if (typeof typ !== 'string' || !RESSOURCEN_TYP.includes(typ)) {
    verstoesse.push(`'${praefix}typ' muss einer von ${RESSOURCEN_TYP.join(', ')} sein`)
  }

  if (!Array.isArray(ressource.capabilities) || ressource.capabilities.length === 0) {
    verstoesse.push(`'${praefix}capabilities' muss ein Array mit mindestens einem Eintrag sein`)
  } else {
    const gesehen = new Set<string>()
    ressource.capabilities.forEach((c, i) => {
      if (typeof c !== 'string' || !CAPABILITY_MUSTER.test(c)) {
        verstoesse.push(`'${praefix}capabilities[${i}]' muss dem Muster ^[A-Z][A-Z0-9_]*$ entsprechen`)
      } else if (gesehen.has(c)) {
        verstoesse.push(`'${praefix}capabilities[${i}]' ('${c}') ist doppelt (uniqueItems)`)
      } else {
        gesehen.add(c)
      }
    })
  }

  if (typeof ressource.freigabe !== 'string' || !FREIGABE.includes(ressource.freigabe)) {
    verstoesse.push(`'${praefix}freigabe' muss einer von ${FREIGABE.join(', ')} sein`)
  }

  pruefeHerkunftForm(ressource.herkunft, typ, praefix, verstoesse)

  // R1: nur typ 'extern' trägt name/beschreibung, dort Pflicht.
  if (typ === 'worker' || typ === 'skill') {
    if ('name' in ressource) verstoesse.push(`'${praefix}name' darf bei typ '${typ}' nicht gesetzt sein (R1)`)
    if ('beschreibung' in ressource) verstoesse.push(`'${praefix}beschreibung' darf bei typ '${typ}' nicht gesetzt sein (R1)`)
  } else if (typ === 'extern') {
    if (!istNichtLeererString(ressource.name)) verstoesse.push(`'${praefix}name' ist bei typ 'extern' Pflicht (R1)`)
    if (!istNichtLeererString(ressource.beschreibung)) verstoesse.push(`'${praefix}beschreibung' ist bei typ 'extern' Pflicht (R1)`)
    // R2: typ 'extern' ausschließlich freigabe 'OFFEN'.
    if (ressource.freigabe !== 'OFFEN') verstoesse.push(`'${praefix}freigabe' muss bei typ 'extern' 'OFFEN' sein (R2)`)
  }
}

/**
 * Reine Funktion: prüft ein geparstes Objekt gegen
 * schemas/ressourcen.schema.json UND die drei semantischen Regeln R1-R3, die
 * das Schema allein nicht abbilden kann. Keine Seiteneffekte, kein
 * Datei-I/O — Muster validiereErgebnisRouter (src/router/index.ts, D5).
 * @param daten - geparstes, sonst unbekanntes Objekt
 * @returns Liste der Regelverletzungen; leeres Array = gültig
 */
export function validiereRessourcenDaten(daten: unknown): string[] {
  if (!istObjekt(daten)) {
    return ['Wurzel ist kein Objekt']
  }
  const verstoesse: string[] = []
  meldeUnbekannteFelder(daten, RESSOURCEN_WURZEL_FELDER, '', verstoesse)
  for (const feld of RESSOURCEN_WURZEL_FELDER) {
    if (!(feld in daten)) verstoesse.push(`Pflichtfeld '${feld}' fehlt`)
  }

  if ('ressourcen_schema' in daten && daten.ressourcen_schema !== 'v0') {
    verstoesse.push(`'ressourcen_schema' muss 'v0' sein`)
  }

  if ('ressourcen' in daten) {
    if (!Array.isArray(daten.ressourcen)) {
      verstoesse.push("'ressourcen' muss ein Array sein")
    } else {
      const gesehenIds = new Set<string>()
      daten.ressourcen.forEach((r, i) => pruefeRessourceForm(r, i, verstoesse, gesehenIds))
    }
  }

  return verstoesse
}

/** Fester, knapper Beschreibungstext je Worker — Muster analog zur Klartext-Beschreibung externer Kandidaten. */
const WORKER_BESCHREIBUNG: Record<string, string> = {
  'claude-code': 'Claude Code CLI — lesender und schreibender Ausführungs-Worker.',
  codex: 'OpenAI Codex CLI — lesender Ausführungs-Worker.',
}

/** Liest die Startvorlage einmal, wirft NICHT bei fehlender/ungültiger Datei — Aufrufer entscheidet je Ressource, ob das ein Rot-Fall ist. */
function ladeStartvorlage(pfad: string): { daten: Record<string, unknown> | null; fehler: string | null } {
  if (!existsSync(pfad)) return { daten: null, fehler: `Startvorlage '${pfad}' nicht gefunden` }
  try {
    const geparst = JSON.parse(readFileSync(pfad, 'utf8'))
    if (!istObjekt(geparst)) return { daten: null, fehler: `Startvorlage '${pfad}' ist kein JSON-Objekt` }
    return { daten: geparst, fehler: null }
  } catch (fehler) {
    return { daten: null, fehler: `Startvorlage '${pfad}' ist kein gültiges JSON (${(fehler as Error).message})` }
  }
}

/** Auflösung einer typ:'worker'-Ressource gegen die Startvorlage — F-341: zwei Lesepfade je nach herkunft.worker. */
function loeseWorkerAuf(ressource: Ressource, startvorlage: { daten: Record<string, unknown> | null; fehler: string | null }): Pick<AufgelosteRessource, 'name' | 'beschreibung' | 'verfuegbar' | 'grund'> {
  const worker = (ressource.herkunft as { art: 'startvorlage'; worker: 'claude-code' | 'codex' }).worker
  const name = worker
  const beschreibung = WORKER_BESCHREIBUNG[worker]

  if (startvorlage.daten === null) {
    return { name, beschreibung, verfuegbar: false, grund: startvorlage.fehler as string }
  }

  if (worker === 'claude-code') {
    const startziel = startvorlage.daten.werkzeugStartziel
    const version = startvorlage.daten.werkzeugVersionDeklariert
    const blockVorhanden = Array.isArray(startziel) && startziel.length > 0 && istNichtLeererString(version)
    if (!blockVorhanden) {
      return { name, beschreibung, verfuegbar: false, grund: "Startvorlage trägt kein 'werkzeugStartziel'/'werkzeugVersionDeklariert' auf oberster Ebene" }
    }
    if (ressource.freigabe !== 'FREIGEGEBEN') {
      return { name, beschreibung, verfuegbar: false, grund: `Startvorlagen-Block vorhanden, aber freigabe '${ressource.freigabe}'` }
    }
    return { name, beschreibung, verfuegbar: true, grund: "Startvorlagen-Block vorhanden und freigabe 'FREIGEGEBEN'" }
  }

  // worker === 'codex'
  const codexBlock = startvorlage.daten.worker
  const block = istObjekt(codexBlock) ? codexBlock.codex : undefined
  const blockVorhanden =
    istObjekt(block) &&
    Array.isArray(block.startziel) &&
    block.startziel.length > 0 &&
    istNichtLeererString(block.versionDeklariert) &&
    istNichtLeererString(block.sandbox)
  if (!blockVorhanden) {
    return { name, beschreibung, verfuegbar: false, grund: "Startvorlage trägt keinen vollständigen 'worker.codex'-Block (startziel/versionDeklariert/sandbox)" }
  }
  if (ressource.freigabe !== 'FREIGEGEBEN') {
    return { name, beschreibung, verfuegbar: false, grund: `worker.codex-Block vorhanden, aber freigabe '${ressource.freigabe}'` }
  }
  return { name, beschreibung, verfuegbar: true, grund: "worker.codex-Block vorhanden und freigabe 'FREIGEGEBEN'" }
}

/** Sehr einfacher Frontmatter-Parser: Text zwischen den ersten beiden '---'-Zeilen, dann 'name:'/'description:' per Zeilen-Regex — kein externes Paket (Bauauftrag). */
function leseFrontmatter(inhalt: string): { name: string | null; beschreibung: string | null } {
  const zeilen = inhalt.split(/\r?\n/)
  if (zeilen[0]?.trim() !== '---') return { name: null, beschreibung: null }
  let ende = -1
  for (let i = 1; i < zeilen.length; i++) {
    if (zeilen[i].trim() === '---') {
      ende = i
      break
    }
  }
  if (ende === -1) return { name: null, beschreibung: null }

  let name: string | null = null
  let beschreibung: string | null = null
  for (const zeile of zeilen.slice(1, ende)) {
    const nameTreffer = /^name:\s*(.+)$/.exec(zeile)
    if (nameTreffer) name = nameTreffer[1].trim()
    const beschreibungTreffer = /^description:\s*(.+)$/.exec(zeile)
    if (beschreibungTreffer) beschreibung = beschreibungTreffer[1].trim()
  }
  return { name, beschreibung }
}

/** Auflösung einer typ:'skill'-Ressource gegen SKILL.md + Frontmatter. */
function loeseSkillAuf(ressource: Ressource, repoWurzel: string): Pick<AufgelosteRessource, 'name' | 'beschreibung' | 'verfuegbar' | 'grund'> {
  const pfad = (ressource.herkunft as { art: 'skill'; pfad: string }).pfad
  const skillMdPfad = join(repoWurzel, pfad, 'SKILL.md')
  if (!existsSync(skillMdPfad)) {
    return { name: ressource.id, beschreibung: '', verfuegbar: false, grund: `SKILL.md fehlt unter '${pfad}'` }
  }
  const { name, beschreibung } = leseFrontmatter(readFileSync(skillMdPfad, 'utf8'))
  if (name === null || beschreibung === null) {
    return { name: name ?? ressource.id, beschreibung: beschreibung ?? '', verfuegbar: false, grund: `SKILL.md unter '${pfad}' trägt kein vollständiges Frontmatter (name/description)` }
  }
  if (ressource.freigabe !== 'FREIGEGEBEN') {
    return { name, beschreibung, verfuegbar: false, grund: `SKILL.md vorhanden, aber freigabe '${ressource.freigabe}'` }
  }
  return { name, beschreibung, verfuegbar: true, grund: "SKILL.md mit vollständigem Frontmatter und freigabe 'FREIGEGEBEN'" }
}

/**
 * Löst ein Ressourcen-Register gegen die laufende Umgebung auf: für jeden
 * Eintrag wird verfuegbar/grund zur ABFRAGEZEIT abgeleitet, nie aus einem
 * gespeicherten Feld (F19 AK7). Wirft NICHT bei fehlender Startvorlage/
 * Skill-Datei — das ist der reguläre Rot-Fall, kein Konfigurationsfehler
 * (anders als waehleWorkflowVorlage in src/router/index.ts, das bewusst
 * wirft, weil eine fehlende Workflow-Vorlage dort ein Konfigurationsfehler
 * wäre).
 * @param ressourcen - bereits gegen validiereRessourcenDaten geprüfte Einträge
 * @param repoWurzel - absoluter Pfad der Repo-Wurzel, für Skill-Pfade
 * @param startvorlagePfad - Pfad zur Startvorlage (repoWurzel-relativ oder absolut), Pflichtparameter — kein Default aus process.env (F-326/F-344 sichtbar statt versteckt)
 * @returns je Eintrag eine AufgelosteRessource mit aufgelösten name/beschreibung/verfuegbar/grund
 */
export function loeseRessourcenAuf(ressourcen: Ressource[], repoWurzel: string, startvorlagePfad: string): AufgelosteRessource[] {
  const vollerStartvorlagePfad = join(repoWurzel, startvorlagePfad)
  let startvorlage: { daten: Record<string, unknown> | null; fehler: string | null } | null = null

  return ressourcen.map((ressource) => {
    let aufgeloest: Pick<AufgelosteRessource, 'name' | 'beschreibung' | 'verfuegbar' | 'grund'>

    if (ressource.typ === 'worker') {
      if (startvorlage === null) startvorlage = ladeStartvorlage(vollerStartvorlagePfad)
      aufgeloest = loeseWorkerAuf(ressource, startvorlage)
    } else if (ressource.typ === 'skill') {
      aufgeloest = loeseSkillAuf(ressource, repoWurzel)
    } else {
      aufgeloest = { name: ressource.name as string, beschreibung: ressource.beschreibung as string, verfuegbar: false, grund: 'extern, nicht auflösbar' }
    }

    return { ...ressource, ...aufgeloest }
  })
}

/**
 * Reiner Filter: alle Einträge, deren capabilities die gegebene enthält.
 * Keine Prüfung von verfuegbar hier — das ist Sache der Aufruferin (siehe
 * pruefeAbdeckung: registriert ist nicht dasselbe wie nutzbar, PlanV1 §16).
 * @param aufgeloest - bereits aufgelöste Ressourcen
 * @param capability - gesuchte Capability
 * @returns Teilmenge von aufgeloest, deren capabilities die gesuchte enthält
 */
export function ressourcenFuerCapability(aufgeloest: AufgelosteRessource[], capability: string): AufgelosteRessource[] {
  return aufgeloest.filter((r) => r.capabilities.includes(capability))
}

/**
 * Prüft für eine Rolle, ob jede ihrer benötigten Capabilities durch
 * mindestens eine VERFÜGBARE Ressource gedeckt ist.
 * @param aufgeloest - bereits aufgelöste Ressourcen
 * @param rolle - Rollenname, wird unverändert in jeden CapabilityGap übernommen
 * @param benoetigteCapabilities - die von der Rolle benötigten Capabilities
 * @returns eine Lücke je ungedeckter Capability; leeres Array = vollständig gedeckt
 */
export function pruefeAbdeckung(aufgeloest: AufgelosteRessource[], rolle: string, benoetigteCapabilities: string[]): CapabilityGap[] {
  const luecken: CapabilityGap[] = []
  for (const capability of benoetigteCapabilities) {
    const gedeckt = aufgeloest.some((r) => r.capabilities.includes(capability) && r.verfuegbar)
    if (!gedeckt) luecken.push({ capability, rolle })
  }
  return luecken
}

export type { AufgelosteRessource, CapabilityGap, Ressource }
