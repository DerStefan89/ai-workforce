/**
 * Datei: src/ressourcen/index.ts
 *
 * Zweck: Ressourcen-Modul (F19 WS-2, Meilenstein 3, docs/projekt/
 * zielfassung.md §13.4). Reine Verantwortlichkeiten:
 * validiereRessourcenDaten prüft ein geparstes Objekt gegen
 * schemas/ressourcen.schema.json (Muster validiereErgebnisRouter,
 * D5 — handgeschrieben statt ajv, dieselbe Repo-Entscheidung) plus die
 * semantischen Regeln R1-R4, die das Schema allein nicht abbilden kann;
 * loeseRessourcenAuf leitet aus einem Register-Eintrag und der laufenden
 * Umgebung ab, ob eine Ressource verfügbar ist; ressourcenFuerCapability und
 * pruefeAbdeckung sind reine Lookups auf dem Ergebnis davon. Seit F36 WS-1
 * zusätzlich: typ 'agent' (Frontmatter wie skill), extern.unterart/wirkung,
 * installation (R4) mit R2 neu (E-M5-5: extern FREIGEGEBEN nur mit
 * installation; E-F36-4: mcp nur mit wirkung 'lokal'), anwendbar_wenn, und
 * reine Funktionen pruefeAnwendbarkeit, baueMcpAufruf (WS-2) und fehltFuerEinsatz
 * (src/capabilities-ansicht). Seit F36 WS-3: baueEmpfehlung und baueEmpfehlungsZeile
 * (Empfehlung am ZWINGEND-Start der Ausführung, Aufrufer von pruefeAnwendbarkeit und
 * fehltFuerEinsatz). Seit F36 WS-5a (E-F36-6/7/9): herkunft.paket und installation_vorlage (nur
 * extern mcp), Platzhalter {projekt_origins}/{ausgabe_ordner} in args (ersetzePlatzhalter,
 * brauchtProjektOrigins), pruefeInstallierbarkeit und empfehlungsKennung (F-808); die Installation
 * selbst (Prozesse, Dateien) liegt in src/ressourcen/installation.ts. Seit F36 WS-5b: installation_vorlage
 * { skill_pfad } und installation { pfad, version = Commit-SHA, inhalt_hash } für extern skill, Verfügbarkeit
 * eines Skills nur mit passendem inhalt_hash (Bausteine in src/ressourcen/skill-dateien.ts), externe Skills
 * installierbar (pruefeInstallierbarkeit) und in „Wird genutzt“ (baueEmpfehlung). Dieses Modul
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
 * src/ressourcen/ressourcen.test.ts, src/capabilities-ansicht/index.ts
 * (fehltFuerEinsatz), scripts/leitstand-server.mjs (baueMcpAufruf, F36 WS-2; baueEmpfehlung,
 * baueEmpfehlungsZeile, F36 WS-3), scripts/check-f36-ws3-empfehlung.mjs.
 */

import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { isAbsolute, join, posix, resolve } from 'node:path'
import { kanonischesJson, sha256Hex } from '../checkpoint-store/index.ts'
import { TASK_TYPEN } from '../router/index.ts'
import { WERKZEUG_EINTRAG_MUSTER } from '../startvorlage/index.ts'
import { berechneInhaltHash, expandiereHome, leseFrontmatter, pruefeSkillPfad, zerlegeGithubUrl } from './skill-dateien.ts'
import type {
  Anwendbarkeit,
  AnwendbarkeitsKontext,
  AufgelosteRessource,
  CapabilityGap,
  Empfehlung,
  EmpfehlungsEintrag,
  EmpfehlungsLaufKontext,
  InstallationsVorlage,
  McpInstallationsVorlage,
  McpPlatzhalterWerte,
  Ressource,
  SkillInstallationsVorlage,
} from './types.ts'

const RESSOURCEN_WURZEL_FELDER = new Set(['ressourcen_schema', 'ressourcen'])
const RESSOURCE_FELDER = new Set(['id', 'typ', 'name', 'beschreibung', 'unterart', 'wirkung', 'lizenz', 'kosten', 'installation', 'installation_vorlage', 'anwendbar_wenn', 'capabilities', 'freigabe', 'herkunft'])
const RESSOURCEN_TYP = ['worker', 'skill', 'agent', 'extern']
const FREIGABE = ['FREIGEGEBEN', 'OFFEN']
const EXTERN_UNTERART = ['skill', 'agent', 'mcp']
const WIRKUNG = ['lokal', 'extern_lesend', 'extern_schreibend']
/** F36 WS-1b: optionale Anzeigefelder nur bei typ 'extern' (Lizenz/Kosten vor „Freigeben & installieren“, E-F36-6). */
const ANZEIGE_FELDER = ['lizenz', 'kosten']
const ANWENDBAR_WENN_FELDER = new Set(['task_typen_any', 'pfad_muster_any'])
/** Zwilling von WORKER in src/workflow/index.ts. */
const WORKER = ['claude-code', 'codex']
/** herkunft.art -> der dazu passende typ (R3). */
const HERKUNFT_ART_ZU_TYP: Record<string, string> = { startvorlage: 'worker', skill: 'skill', agent: 'agent', extern: 'extern' }

const ID_MUSTER = /^[a-z0-9][a-z0-9-]*$/
const CAPABILITY_MUSTER = /^[A-Z][A-Z0-9_]*$/
const URL_MUSTER = /^https?:\/\//
const AGENT_PFAD_MUSTER = /^\.claude\/agents\/[A-Za-z0-9][A-Za-z0-9_-]*\.md$/
/** R4: installation.pfad ist absolut (POSIX, Laufwerk, UNC) oder beginnt mit '~/' bzw. '~\' — plattformunabhängig geprüft, damit das Urteil nicht vom Prüfrechner abhängt. */
const INSTALLATIONS_PFAD_MUSTER = /^(~[\\/]|\/|[A-Za-z]:[\\/]|\\\\)/
/** Spike P3: nur Einzelnamen 'mcp__<server>__<werkzeug>', keine Wildcard — zusätzlich muss WERKZEUG_EINTRAG_MUSTER (E-F754) gelten. */
const MCP_WERKZEUG_MUSTER = /^mcp__([a-z0-9][a-z0-9-]*)__[A-Za-z0-9_-]+$/
/**
 * F36 WS-5a (E-F36-9): herkunft.paket = 'npm:<name>' nach den npm-Namensregeln (klein, höchstens 214
 * Zeichen, optional '@scope/', kein führender Punkt/Unterstrich/Bindestrich — sonst läse npm den Namen
 * als Option —, nur a-z 0-9 - . _ ~).
 */
const PAKET_MUSTER = /^npm:((?:@[a-z0-9~][a-z0-9-._~]*\/)?[a-z0-9~][a-z0-9-._~]*)$/
const PAKETNAME_MAX = 214
/** F36 WS-5a: die einzigen Platzhalter in mcp_server.args bzw. installation_vorlage.args (E-F36-7). */
export const MCP_PLATZHALTER = ['projekt_origins', 'ausgabe_ordner'] as const
const PLATZHALTER_TREFFER = /\{([^{}]*)\}/g
const VORLAGE_FELDER = new Set(['bin', 'args', 'werkzeuge'])
/** F36 WS-5b: Felder der installation_vorlage eines externen Skills. */
const SKILL_VORLAGE_FELDER = new Set(['skill_pfad'])
/** F36 WS-5b (R4 skill): installation.version ist die 40-stellige Commit-SHA, inhalt_hash ein sha256. */
const COMMIT_SHA_MUSTER = /^[0-9a-f]{40}$/
const SHA256_MUSTER = /^[0-9a-f]{64}$/

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
 * F36 WS-5a (E-F36-9): Paketname aus herkunft.paket ('npm:<name>'), oder null bei falscher Form.
 * @param paket - Feldwert herkunft.paket
 * @returns npm-Paketname (z. B. '@playwright/mcp') oder null
 */
export function paketNameAus(paket: unknown): string | null {
  if (typeof paket !== 'string') return null
  const treffer = PAKET_MUSTER.exec(paket)
  return treffer === null || treffer[1].length > PAKETNAME_MAX ? null : treffer[1]
}

/**
 * F36 WS-5a: meldet jeden Platzhalter '{…}' in args, der nicht in MCP_PLATZHALTER steht (fail-closed:
 * ein vertippter Platzhalter würde sonst wörtlich an den Server gehen).
 * @param args - mcp_server.args bzw. installation_vorlage.args (bereits als string[] geprüft)
 * @param pfad - Feldpfad für die Meldung
 * @param verstoesse - Sammelliste
 */
function pruefePlatzhalter(args: readonly string[], pfad: string, verstoesse: string[]): void {
  args.forEach((arg, i) => {
    for (const treffer of arg.matchAll(PLATZHALTER_TREFFER)) {
      if (!(MCP_PLATZHALTER as readonly string[]).includes(treffer[1])) {
        verstoesse.push(`'${pfad}[${i}]' enthält den unbekannten Platzhalter '${treffer[0]}' (erlaubt: ${MCP_PLATZHALTER.map((p) => `{${p}}`).join(', ')})`)
      }
    }
  })
}

/**
 * F36 WS-5a: Einzelnamen 'mcp__<id>__<name>' des eigenen Servers, keine Wildcard, keine Doppelten (R4,
 * Spike P3) — geteilt von installation.werkzeuge und installation_vorlage.werkzeuge.
 */
function pruefeMcpWerkzeuge(werkzeuge: unknown, id: string, pfad: string, verstoesse: string[]): void {
  if (!Array.isArray(werkzeuge) || werkzeuge.length === 0) {
    verstoesse.push(`'${pfad}' muss ein Array mit mindestens einem Eintrag sein`)
    return
  }
  const gesehen = new Set<string>()
  werkzeuge.forEach((w, i) => {
    const treffer = typeof w === 'string' ? MCP_WERKZEUG_MUSTER.exec(w) : null
    if (typeof w !== 'string' || treffer === null || treffer[1] !== id || !WERKZEUG_EINTRAG_MUSTER.test(w)) {
      verstoesse.push(`'${pfad}[${i}]' muss ein Einzelname 'mcp__${id}__<name>' sein, keine Wildcard (Spike P3)`)
    } else if (gesehen.has(w)) {
      verstoesse.push(`'${pfad}[${i}]' ('${w}') ist doppelt`)
    } else {
      gesehen.add(w)
    }
  })
}

/**
 * F36 WS-5a: installation_vorlage { bin, args, werkzeuge } — bin relativ im Paket (kein absoluter Pfad,
 * kein '..', kein Backslash), args mit bekannten Platzhaltern, werkzeuge wie R4.
 */
function pruefeInstallationsVorlageForm(vorlage: unknown, id: string, pfad: string, verstoesse: string[]): void {
  if (!istObjekt(vorlage)) {
    verstoesse.push(`'${pfad}' ist kein Objekt`)
    return
  }
  meldeUnbekannteFelder(vorlage, VORLAGE_FELDER, `${pfad}.`, verstoesse)
  const bin = vorlage.bin
  if (!istNichtLeererString(bin) || bin.includes('\\') || bin.startsWith('/') || /^[A-Za-z]:/.test(bin) || bin.split('/').some((teil) => teil === '..' || teil === '')) {
    verstoesse.push(`'${pfad}.bin' muss ein relativer Pfad im Paket sein ('/' als Trenner, ohne '..')`)
  }
  if (!Array.isArray(vorlage.args) || !vorlage.args.every((a) => typeof a === 'string')) verstoesse.push(`'${pfad}.args' muss ein Array aus Strings sein`)
  else pruefePlatzhalter(vorlage.args, `${pfad}.args`, verstoesse)
  pruefeMcpWerkzeuge(vorlage.werkzeuge, id, `${pfad}.werkzeuge`, verstoesse)
}

/**
 * F36 WS-5b: installation_vorlage { skill_pfad } eines externen Skills — relativer Pfad im Repo (unter
 * dem Unterpfad der herkunft.url), '/' als Trenner, ohne '..' (pruefeSkillPfad).
 */
function pruefeSkillVorlageForm(vorlage: unknown, pfad: string, verstoesse: string[]): void {
  if (!istObjekt(vorlage)) {
    verstoesse.push(`'${pfad}' ist kein Objekt`)
    return
  }
  meldeUnbekannteFelder(vorlage, SKILL_VORLAGE_FELDER, `${pfad}.`, verstoesse)
  const fehler = pruefeSkillPfad(vorlage.skill_pfad)
  if (fehler !== null) verstoesse.push(`'${pfad}.skill_pfad' ${fehler}`)
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
  } else if (art === 'agent') {
    meldeUnbekannteFelder(herkunft, new Set(['art', 'pfad']), `${praefix}herkunft.`, verstoesse)
    if (!istNichtLeererString(herkunft.pfad) || !AGENT_PFAD_MUSTER.test(herkunft.pfad)) {
      verstoesse.push(`'${praefix}herkunft.pfad' muss die Form '.claude/agents/<name>.md' haben`)
    }
  } else if (art === 'extern') {
    meldeUnbekannteFelder(herkunft, new Set(['art', 'url', 'paket']), `${praefix}herkunft.`, verstoesse)
    if (!istNichtLeererString(herkunft.url) || !URL_MUSTER.test(herkunft.url)) {
      verstoesse.push(`'${praefix}herkunft.url' muss mit http:// oder https:// beginnen`)
    }
    // Nur die Form; dass paket nur bei unterart 'mcp' steht, prüft pruefeExternFelder.
    if ('paket' in herkunft && paketNameAus(herkunft.paket) === null) {
      verstoesse.push(`'${praefix}herkunft.paket' muss die Form 'npm:<paketname>' nach den npm-Namensregeln haben (z. B. 'npm:@scope/name')`)
    }
  } else {
    verstoesse.push(`'${praefix}herkunft.art' muss einer von startvorlage, skill, agent, extern sein`)
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
  if (typ === 'worker' || typ === 'skill' || typ === 'agent') {
    if ('name' in ressource) verstoesse.push(`'${praefix}name' darf bei typ '${typ}' nicht gesetzt sein (R1)`)
    if ('beschreibung' in ressource) verstoesse.push(`'${praefix}beschreibung' darf bei typ '${typ}' nicht gesetzt sein (R1)`)
  } else if (typ === 'extern') {
    if (!istNichtLeererString(ressource.name)) verstoesse.push(`'${praefix}name' ist bei typ 'extern' Pflicht (R1)`)
    if (!istNichtLeererString(ressource.beschreibung)) verstoesse.push(`'${praefix}beschreibung' ist bei typ 'extern' Pflicht (R1)`)
  }

  pruefeExternFelder(ressource, typ, praefix, verstoesse)

  if ('anwendbar_wenn' in ressource) {
    if (typ === 'worker') verstoesse.push(`'${praefix}anwendbar_wenn' ist bei typ 'worker' nicht zulässig`)
    else pruefeAnwendbarWennForm(ressource.anwendbar_wenn, `${praefix}anwendbar_wenn`, verstoesse)
  }
}

/**
 * F36 WS-1: unterart/wirkung/installation (nur typ 'extern') und R2 neu.
 * F36 WS-1b: lizenz/kosten (nur typ 'extern', optional, nicht-leerer String).
 * R2 (E-M5-5, löst F-724): extern darf FREIGEGEBEN nur mit installation.
 * E-F36-4: unterart 'mcp' darf FREIGEGEBEN nur mit wirkung 'lokal'.
 */
function pruefeExternFelder(ressource: Record<string, unknown>, typ: unknown, praefix: string, verstoesse: string[]): void {
  if (typ !== 'extern') {
    if ('unterart' in ressource) verstoesse.push(`'${praefix}unterart' ist nur bei typ 'extern' zulässig`)
    if ('wirkung' in ressource) verstoesse.push(`'${praefix}wirkung' ist nur bei typ 'extern' mit unterart 'mcp' zulässig`)
    if ('installation' in ressource) verstoesse.push(`'${praefix}installation' ist nur bei typ 'extern' zulässig`)
    if ('installation_vorlage' in ressource) verstoesse.push(`'${praefix}installation_vorlage' ist nur bei typ 'extern' mit unterart 'mcp' oder 'skill' zulässig`)
    for (const feld of ANZEIGE_FELDER) {
      if (feld in ressource) verstoesse.push(`'${praefix}${feld}' ist nur bei typ 'extern' zulässig`)
    }
    return
  }

  for (const feld of ANZEIGE_FELDER) {
    if (feld in ressource && !istNichtLeererString(ressource[feld])) verstoesse.push(`'${praefix}${feld}' muss ein nicht-leerer String sein`)
  }

  const unterart = ressource.unterart
  if (!('unterart' in ressource)) {
    verstoesse.push(`'${praefix}unterart' ist bei typ 'extern' Pflicht`)
  } else if (typeof unterart !== 'string' || !EXTERN_UNTERART.includes(unterart)) {
    verstoesse.push(`'${praefix}unterart' muss einer von ${EXTERN_UNTERART.join(', ')} sein`)
  }

  if (unterart === 'mcp') {
    if (!('wirkung' in ressource)) verstoesse.push(`'${praefix}wirkung' ist bei unterart 'mcp' Pflicht`)
    else if (typeof ressource.wirkung !== 'string' || !WIRKUNG.includes(ressource.wirkung)) verstoesse.push(`'${praefix}wirkung' muss einer von ${WIRKUNG.join(', ')} sein`)
  } else if ('wirkung' in ressource) {
    verstoesse.push(`'${praefix}wirkung' ist nur bei typ 'extern' mit unterart 'mcp' zulässig`)
  }

  if ('installation' in ressource && (unterart === 'skill' || unterart === 'agent' || unterart === 'mcp')) {
    pruefeInstallationForm(ressource.installation, unterart, String(ressource.id), `${praefix}installation`, verstoesse)
  }

  // F36 WS-5a (E-F36-9): Registry-Paket nur bei unterart 'mcp'. Installationsvorlage je unterart:
  // mcp {bin, args, werkzeuge} (WS-5a), skill {skill_pfad} (WS-5b), agent keine (Agents erst später).
  if (unterart !== 'mcp' && istObjekt(ressource.herkunft) && 'paket' in ressource.herkunft) verstoesse.push(`'${praefix}herkunft.paket' ist nur bei unterart 'mcp' zulässig`)
  if ('installation_vorlage' in ressource) {
    if (unterart === 'mcp') pruefeInstallationsVorlageForm(ressource.installation_vorlage, String(ressource.id), `${praefix}installation_vorlage`, verstoesse)
    else if (unterart === 'skill') pruefeSkillVorlageForm(ressource.installation_vorlage, `${praefix}installation_vorlage`, verstoesse)
    else verstoesse.push(`'${praefix}installation_vorlage' ist nur bei typ 'extern' mit unterart 'mcp' oder 'skill' zulässig`)
  }

  if (ressource.freigabe === 'FREIGEGEBEN') {
    if (!('installation' in ressource)) verstoesse.push(`'${praefix}freigabe' FREIGEGEBEN verlangt bei typ 'extern' das Feld 'installation' (R2, E-M5-5)`)
    if (unterart === 'mcp' && ressource.wirkung !== 'lokal') {
      verstoesse.push(`'${praefix}freigabe' FREIGEGEBEN ist bei unterart 'mcp' nur mit wirkung 'lokal' zulässig, nicht '${String(ressource.wirkung)}' (E-F36-4)`)
    }
  }
}

/**
 * R4: Form von installation je unterart. MCP-Werkzeuge sind Einzelnamen des eigenen Servers
 * (Server-Kennung = Ressourcen-id), keine Wildcard (Spike P3). Seit F36 WS-5b trägt ein Skill
 * {pfad, version = 40-stellige Commit-SHA, inhalt_hash = sha256}; ein Agent bleibt {pfad, version}.
 */
function pruefeInstallationForm(installation: unknown, unterart: 'skill' | 'agent' | 'mcp', id: string, pfad: string, verstoesse: string[]): void {
  if (!istObjekt(installation)) {
    verstoesse.push(`'${pfad}' ist kein Objekt`)
    return
  }
  if (!istNichtLeererString(installation.version)) verstoesse.push(`'${pfad}.version' muss ein nicht-leerer String sein`)

  if (unterart !== 'mcp') {
    meldeUnbekannteFelder(installation, new Set(unterart === 'skill' ? ['pfad', 'version', 'inhalt_hash'] : ['pfad', 'version']), `${pfad}.`, verstoesse)
    if (!istNichtLeererString(installation.pfad) || !INSTALLATIONS_PFAD_MUSTER.test(installation.pfad)) {
      verstoesse.push(`'${pfad}.pfad' muss absolut sein oder mit ~ beginnen`)
    }
    if (unterart === 'skill') {
      if (typeof installation.version !== 'string' || !COMMIT_SHA_MUSTER.test(installation.version)) verstoesse.push(`'${pfad}.version' muss bei unterart 'skill' die 40-stellige Commit-SHA sein (klein, hex)`)
      if (typeof installation.inhalt_hash !== 'string' || !SHA256_MUSTER.test(installation.inhalt_hash)) verstoesse.push(`'${pfad}.inhalt_hash' muss bei unterart 'skill' ein sha256 (64 Hex-Zeichen) sein`)
    }
    return
  }

  meldeUnbekannteFelder(installation, new Set(['version', 'mcp_server', 'werkzeuge']), `${pfad}.`, verstoesse)
  const server = installation.mcp_server
  if (!istObjekt(server)) {
    verstoesse.push(`'${pfad}.mcp_server' muss ein Objekt {command, args} sein`)
  } else {
    meldeUnbekannteFelder(server, new Set(['command', 'args']), `${pfad}.mcp_server.`, verstoesse)
    if (!istNichtLeererString(server.command)) verstoesse.push(`'${pfad}.mcp_server.command' muss ein nicht-leerer String sein`)
    if (!Array.isArray(server.args) || !server.args.every((a) => typeof a === 'string')) verstoesse.push(`'${pfad}.mcp_server.args' muss ein Array aus Strings sein`)
    else pruefePlatzhalter(server.args, `${pfad}.mcp_server.args`, verstoesse)
  }

  pruefeMcpWerkzeuge(installation.werkzeuge, id, `${pfad}.werkzeuge`, verstoesse)
}

/** anwendbar_wenn: mindestens ein Schlüssel, keine unbekannten; task_typen_any aus TASK_TYPEN (Router), pfad_muster_any nicht-leere Globs. */
function pruefeAnwendbarWennForm(wert: unknown, pfad: string, verstoesse: string[]): void {
  if (!istObjekt(wert)) {
    verstoesse.push(`'${pfad}' ist kein Objekt`)
    return
  }
  meldeUnbekannteFelder(wert, ANWENDBAR_WENN_FELDER, `${pfad}.`, verstoesse)
  if (!Object.keys(wert).some((k) => ANWENDBAR_WENN_FELDER.has(k))) verstoesse.push(`'${pfad}' braucht mindestens einen Schlüssel (task_typen_any, pfad_muster_any)`)

  const pruefeListe = (schluessel: string, gueltig: (e: unknown) => boolean, meldung: string): void => {
    if (!(schluessel in wert)) return
    const liste = wert[schluessel]
    if (!Array.isArray(liste) || liste.length === 0) {
      verstoesse.push(`'${pfad}.${schluessel}' muss ein Array mit mindestens einem Eintrag sein`)
      return
    }
    liste.forEach((e, i) => {
      if (!gueltig(e)) verstoesse.push(`'${pfad}.${schluessel}[${i}]' ${meldung}`)
    })
  }
  pruefeListe('task_typen_any', (e) => typeof e === 'string' && TASK_TYPEN.includes(e), `muss einer von ${TASK_TYPEN.join(', ')} sein`)
  // Backslash abgelehnt: posix.matchesGlob liest '\' als Escape, ein Windows-Muster 'src\**' träfe still nie.
  pruefeListe('pfad_muster_any', (e) => istNichtLeererString(e) && !e.includes('\\'), "muss ein nicht-leerer Glob mit '/' als Trenner sein (kein Backslash)")
}

/**
 * Reine Funktion: prüft ein geparstes Objekt gegen
 * schemas/ressourcen.schema.json UND die semantischen Regeln R1-R4 (plus E-F36-4 und anwendbar_wenn), die
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

type Aufloesung = Pick<AufgelosteRessource, 'name' | 'beschreibung' | 'verfuegbar' | 'grund'>

/**
 * Auflösung einer typ:'skill'- oder typ:'agent'-Ressource gegen eine Markdown-Datei mit Frontmatter
 * (name/description) — skill: '<pfad>/SKILL.md', agent: der herkunft.pfad selbst ('.claude/agents/<name>.md').
 */
function loeseFrontmatterRessourceAuf(ressource: Ressource, repoWurzel: string): Aufloesung {
  const herkunftPfad = (ressource.herkunft as { pfad: string }).pfad
  const relativ = ressource.typ === 'skill' ? `${herkunftPfad}/SKILL.md` : herkunftPfad
  const datei = ressource.typ === 'skill' ? 'SKILL.md' : 'Agent-Datei'
  const ort = ressource.typ === 'skill' ? `unter '${herkunftPfad}'` : `'${herkunftPfad}'`
  const mdPfad = join(repoWurzel, relativ)
  if (!existsSync(mdPfad)) {
    return { name: ressource.id, beschreibung: '', verfuegbar: false, grund: `${datei} fehlt ${ort}` }
  }
  const { name, beschreibung } = leseFrontmatter(readFileSync(mdPfad, 'utf8'))
  if (name === null || beschreibung === null) {
    return { name: name ?? ressource.id, beschreibung: beschreibung ?? '', verfuegbar: false, grund: `${datei} ${ort} trägt kein vollständiges Frontmatter (name/description)` }
  }
  if (ressource.freigabe !== 'FREIGEGEBEN') {
    return { name, beschreibung, verfuegbar: false, grund: `${datei} vorhanden, aber freigabe '${ressource.freigabe}'` }
  }
  return { name, beschreibung, verfuegbar: true, grund: `${datei} mit vollständigem Frontmatter und freigabe 'FREIGEGEBEN'` }
}

/** Grund einer extern-Ressource ohne installation — fehltFuerEinsatz meldet das bereits als 'installation fehlt'. */
const EXTERN_INSTALLATION_FEHLT = 'extern, installation fehlt'


/**
 * Auflösung einer typ:'extern'-Ressource (F36 WS-1). agent: verfügbar, wenn FREIGEGEBEN und
 * installation.pfad existiert; skill (seit WS-5b) zusätzlich SKILL.md mit Frontmatter und inhalt_hash
 * des Ordners = installation.inhalt_hash. mcp: verfügbar, wenn FREIGEGEBEN, wirkung 'lokal' und installation
 * vollständig — der Server wird NICHT gestartet (keine Prozessstarts im Katalog), der Grund sagt das.
 */
function loeseExternAuf(ressource: Ressource): Aufloesung {
  const name = ressource.name as string
  const beschreibung = ressource.beschreibung as string
  const nicht = (grund: string): Aufloesung => ({ name, beschreibung, verfuegbar: false, grund })

  // Technische Prüfungen vor der Freigabe, damit ein kaputter Eintrag schon vor dem Umstellen auf
  // FREIGEGEBEN sichtbar ist. installation wird hier erneut geprüft (defensiv): die Ansicht löst auch
  // eine von Hand bearbeitete, noch nicht validierte ressourcen.json auf — kein Wurf, kein falsches Grün.
  const installation = ressource.installation
  if (installation === undefined) return nicht(EXTERN_INSTALLATION_FEHLT)
  const unterart = ressource.unterart
  if (unterart !== 'skill' && unterart !== 'agent' && unterart !== 'mcp') return nicht(`extern, unterart '${String(unterart)}' unbekannt`)
  const formFehler: string[] = []
  pruefeInstallationForm(installation, unterart, ressource.id, 'installation', formFehler)
  if (formFehler.length > 0) return nicht(`extern, installation ungültig: ${formFehler.join('; ')}`)

  let bereit: string
  if (unterart === 'mcp') {
    if (ressource.wirkung !== 'lokal') return nicht(`extern, wirkung '${ressource.wirkung}' — in V1 nicht zulässig (E-F36-4)`)
    // F36 WS-5a: absolute Pfade (node, bin im cap-Ordner) müssen existieren — z. B. nach gelöschtem
    // cap-Ordner oder Node-Update. Nicht absolute Werte ('node', 'npx', relative args) bleiben ungeprüft.
    const server = (installation as { mcp_server: { command: string; args: string[] } }).mcp_server
    const fehlt = [server.command, server.args[0]].find((pfad) => typeof pfad === 'string' && isAbsolute(pfad) && !existsSync(pfad))
    if (fehlt !== undefined) return nicht(`extern, '${fehlt}' existiert nicht (installation.mcp_server)`)
    bereit = `wirkung 'lokal', installation vollständig (${(installation as { werkzeuge: string[] }).werkzeuge.length} Werkzeug(e)) — Serverstart nicht geprüft`
  } else {
    const vollerPfad = expandiereHome((installation as { pfad: string }).pfad)
    if (!existsSync(vollerPfad)) return nicht(`extern, installation.pfad '${vollerPfad}' existiert nicht`)
    bereit = `installation.pfad '${vollerPfad}' vorhanden (Version ${installation.version})`
    // F36 WS-5b (F-786 Teil skill): verfügbar heißt für einen Skill zusätzlich SKILL.md mit Frontmatter
    // und inhalt_hash = gespeicherter Wert — ein nachträglich veränderter Ordner kommt nie in den Lauf.
    if (unterart === 'skill') {
      const skillMd = join(vollerPfad, 'SKILL.md')
      if (!existsSync(skillMd)) return nicht(`extern, SKILL.md fehlt unter '${vollerPfad}'`)
      let hash: string
      try {
        const { name: fmName, beschreibung: fmBeschreibung } = leseFrontmatter(readFileSync(skillMd, 'utf8'))
        if (fmName === null || fmBeschreibung === null) return nicht(`extern, SKILL.md unter '${vollerPfad}' trägt kein vollständiges Frontmatter (name/description)`)
        hash = berechneInhaltHash(vollerPfad)
      } catch (fehler) {
        return nicht(`extern, Skill-Ordner '${vollerPfad}' nicht prüfbar: ${(fehler as Error).message}`)
      }
      if (hash !== (installation as { inhalt_hash: string }).inhalt_hash) return nicht(`extern, inhalt_hash des Skill-Ordners '${vollerPfad}' weicht von installation.inhalt_hash ab (Ordner nach der Installation verändert)`)
      bereit = `${bereit}, inhalt_hash stimmt`
    }
  }

  if (ressource.freigabe !== 'FREIGEGEBEN') return nicht(`extern, ${bereit}, aber freigabe '${ressource.freigabe}'`)
  return { name, beschreibung, verfuegbar: true, grund: `freigegeben, ${bereit}` }
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
  // resolve statt join (F-676/F-677): für Projekt-Instanzen liefert loeseProjektPfade
  // startvorlagePfad bereits absolut — join würde repoWurzel + absoluten Pfad verketten statt
  // ihn zu ersetzen (Windows: 'C:\a\b\C:\x\y'), resolve verhält sich hier korrekt wie dokumentiert.
  const vollerStartvorlagePfad = resolve(repoWurzel, startvorlagePfad)
  let startvorlage: { daten: Record<string, unknown> | null; fehler: string | null } | null = null

  return ressourcen.map((ressource) => {
    let aufgeloest: Pick<AufgelosteRessource, 'name' | 'beschreibung' | 'verfuegbar' | 'grund'>

    if (ressource.typ === 'worker') {
      if (startvorlage === null) startvorlage = ladeStartvorlage(vollerStartvorlagePfad)
      aufgeloest = loeseWorkerAuf(ressource, startvorlage)
    } else if (ressource.typ === 'skill' || ressource.typ === 'agent') {
      aufgeloest = loeseFrontmatterRessourceAuf(ressource, repoWurzel)
    } else {
      aufgeloest = loeseExternAuf(ressource)
    }

    return { ...ressource, ...aufgeloest }
  })
}

/**
 * Reine Funktion (E-F36-2, deterministisch, kein Modell): wertet anwendbar_wenn einer Ressource gegen
 * einen Auftrag aus. ODER innerhalb eines Schlüssels, UND zwischen den Schlüsseln. Ohne anwendbar_wenn
 * ist eine Ressource nie anwendbar. Fehlen die pfade, gilt pfad_muster_any als nicht erfüllt.
 * Aufrufer: baueEmpfehlung (F36 WS-3).
 * @param ressource - ein validierter Katalogeintrag
 * @param kontext - task_typen des Auftrags (Router-Ergebnis), optional betroffene Pfade (repo-relativ)
 * @returns anwendbar plus Klartext-Begründung
 */
export function pruefeAnwendbarkeit(ressource: Ressource, kontext: AnwendbarkeitsKontext): Anwendbarkeit {
  const regel = ressource.anwendbar_wenn
  if (regel === undefined) return { anwendbar: false, begruendung: 'kein anwendbar_wenn: wird nie empfohlen' }

  const teile: string[] = []
  let anwendbar = true
  if (regel.task_typen_any !== undefined) {
    const treffer = regel.task_typen_any.filter((t) => kontext.task_typen.includes(t))
    if (treffer.length > 0) teile.push(`task_typen_any erfüllt (${treffer.join(', ')})`)
    else {
      anwendbar = false
      teile.push(`task_typen_any nicht erfüllt (erwartet eines von ${regel.task_typen_any.join(', ')}, Auftrag: ${kontext.task_typen.join(', ') || '—'})`)
    }
  }
  if (regel.pfad_muster_any !== undefined) {
    if (kontext.pfade === undefined || kontext.pfade.length === 0) {
      anwendbar = false
      teile.push('pfad_muster_any nicht erfüllt (keine Pfade im Auftrag)')
    } else {
      const pfade = kontext.pfade.map((p) => p.replaceAll('\\', '/'))
      const muster = regel.pfad_muster_any.find((m) => pfade.some((p) => posix.matchesGlob(p, m)))
      if (muster !== undefined) teile.push(`pfad_muster_any erfüllt ('${muster}')`)
      else {
        anwendbar = false
        teile.push(`pfad_muster_any nicht erfüllt (kein Pfad passt auf ${regel.pfad_muster_any.join(', ')})`)
      }
    }
  }
  return { anwendbar, begruendung: teile.join('; ') }
}

/**
 * Reine Funktion (F36 WS-1): was einer Ressource für einen Einsatz im Lauf fehlt, in Klartext —
 * Anzeige in der Capabilities-Ansicht und (seit WS-3) Grund der Liste „Passt, nicht im Lauf“
 * (baueEmpfehlung). Leere Liste = einsatzbereit.
 * @param ressource - validierter Katalogeintrag
 * @param aufgeloest - dieselbe Ressource nach loeseRessourcenAuf (verfuegbar/grund)
 * @returns Liste fehlender Voraussetzungen
 */
export function fehltFuerEinsatz(ressource: Ressource, aufgeloest: AufgelosteRessource): string[] {
  const fehlt: string[] = []
  if (ressource.freigabe === 'OFFEN') fehlt.push('freigabe OFFEN')
  if (ressource.typ === 'extern' && ressource.installation === undefined) fehlt.push('installation fehlt')
  const wirkungGesperrt = ressource.typ === 'extern' && ressource.unterart === 'mcp' && ressource.wirkung !== 'lokal'
  if (wirkungGesperrt) fehlt.push(`wirkung ${ressource.wirkung}: in V1 nicht freigebbar (E-F36-4)`)
  // Technischer Grund zusätzlich — auch bei freigabe OFFEN —, außer er sagt nur, was oben schon steht:
  // die Auflösung prüft Technisches vor der Freigabe, ein reiner Freigabe-Grund endet auf "freigabe '<wert>'".
  const nurFreigabe = aufgeloest.grund.endsWith(`freigabe '${ressource.freigabe}'`)
  const schonGenannt = nurFreigabe || aufgeloest.grund === EXTERN_INSTALLATION_FEHLT || (wirkungGesperrt && aufgeloest.grund.includes('(E-F36-4)'))
  if (!aufgeloest.verfuegbar && !schonGenannt) fehlt.push(`nicht verfügbar: ${aufgeloest.grund}`)
  if (ressource.typ !== 'worker' && ressource.anwendbar_wenn === undefined) fehlt.push('kein anwendbar_wenn: wird nie empfohlen')
  return fehlt
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

/**
 * F36 WS-5a (E-F36-7): ersetzt {projekt_origins}/{ausgabe_ordner} in args. Wirft, wenn ein
 * vorkommender Platzhalter unbekannt ist oder keinen Wert hat — nie wörtlich an den Server durchreichen.
 * @param args - mcp_server.args
 * @param werte - Werte der Platzhalter
 * @returns neue args-Liste
 */
export function ersetzePlatzhalter(args: readonly string[], werte: McpPlatzhalterWerte): string[] {
  return args.map((arg) =>
    arg.replace(PLATZHALTER_TREFFER, (ganz, name: string) => {
      if (!(MCP_PLATZHALTER as readonly string[]).includes(name)) throw new Error(`unbekannter Platzhalter '${ganz}' in mcp_server.args`)
      const wert = werte[name as keyof McpPlatzhalterWerte]
      if (typeof wert !== 'string' || wert.length === 0) {
        throw new Error(name === 'projekt_origins' ? 'Projekt-URL (vorschau_url) fehlt für {projekt_origins}' : `kein Wert für '${ganz}'`)
      }
      return wert
    })
  )
}

/**
 * F36 WS-5a: true, wenn installation.mcp_server.args den Platzhalter {projekt_origins} tragen — ein
 * solcher Eintrag darf ohne Projekt-URL nie in den Lauf (E-F36-7, fail-closed).
 * @param ressource - Katalogeintrag
 * @returns ob die Projekt-URL gebraucht wird
 */
export function brauchtProjektOrigins(ressource: Ressource): boolean {
  // Installiert: die args der installation; noch nicht installiert: die der Vorlage (die daraus werden).
  const installation = ressource.installation
  const vorlage = ressource.installation_vorlage
  const args = installation !== undefined ? ('mcp_server' in installation && istObjekt(installation.mcp_server) ? installation.mcp_server.args : undefined) : vorlage !== undefined && 'args' in vorlage ? vorlage.args : undefined
  return Array.isArray(args) && args.some((a) => typeof a === 'string' && a.includes('{projekt_origins}'))
}

/**
 * F36 WS-5a (F-808): Kennung eines angezeigten „Wird genutzt“-Eintrags — '<id>@<sha256 über die
 * kanonische JSON der installation>'. Ändert sich installation zwischen Anzeige und Start, weicht die
 * Kennung ab und der Start bricht ab.
 * @param ressource - Katalogeintrag mit installation
 * @returns Kennung
 */
export function empfehlungsKennung(ressource: Ressource): string {
  return `${ressource.id}@${sha256Hex(kanonischesJson(ressource.installation ?? null))}`
}

/**
 * F36 WS-5a/5b (E-F36-6/9): warum ein Eintrag nicht über „Freigeben & installieren“ installiert werden
 * darf — null, wenn er darf. Zulässig:
 * - typ 'extern', unterart 'mcp', wirkung 'lokal', mit herkunft.paket und installation_vorlage (WS-5a);
 * - typ 'extern', unterart 'skill', mit installation_vorlage { skill_pfad } und einer herkunft.url der
 *   Form https://github.com/<owner>/<repo>[/tree/<ref>/<unterpfad>] (WS-5b).
 * Extern-Agents: „erst später“ (WS-5b schaltet nur Skills). Ob er schon installiert ist, prüft der Aufrufer.
 * @param ressource - validierter Katalogeintrag
 * @returns Klartext-Grund oder null
 */
export function pruefeInstallierbarkeit(ressource: Ressource): string | null {
  if (ressource.typ === 'extern' && ressource.unterart === 'agent') return AGENT_INSTALLATION_ERST_SPAETER
  if (ressource.typ === 'extern' && ressource.unterart === 'skill') {
    const vorlage = ressource.installation_vorlage
    if (vorlage === undefined || !('skill_pfad' in vorlage)) return 'installation_vorlage (skill_pfad) fehlt — ohne Vorlage ist der Skill nicht installierbar'
    const quelle = zerlegeGithubUrl((ressource.herkunft as { url?: string }).url)
    return quelle.ok ? null : quelle.grund
  }
  if (ressource.typ !== 'extern' || ressource.unterart !== 'mcp') return "nur typ 'extern' mit unterart 'mcp' oder 'skill' ist über die Workforce installierbar (WS-5a/5b)"
  if (ressource.wirkung !== 'lokal') return `wirkung '${String(ressource.wirkung)}' — in V1 nur 'lokal' freigebbar (E-F36-4)`
  const herkunft = ressource.herkunft as { paket?: string }
  if (paketNameAus(herkunft.paket) === null) return 'herkunft.paket fehlt — installiert wird nur aus der ausdrücklichen Registry-Adresse (E-F36-9)'
  if (ressource.installation_vorlage === undefined) return 'installation_vorlage fehlt'
  return null
}

/** F36 WS-5b: Grund für Extern-Agents — Installation und Laufzeit sind nicht gebaut (Zuschnitt, F-770/F-791). */
export const AGENT_INSTALLATION_ERST_SPAETER = 'Agents: Installation und Nutzung im Lauf erst später (F36 WS-5b schaltet nur Ort-B-Skills)'

/** Default-Wert von --mcp-config für jeden Lauf ohne freigegebenen MCP (F31 WS-3c, E-187) — bitgenau wie baueAufrufs Vorgabe. */
const LEERE_MCP_CONFIG = '{"mcpServers":{}}'

/**
 * F36 WS-2: baut aus aufgelösten, freigegebenen lokalen MCP-Katalogeinträgen den
 * --mcp-config-Wert und die Einzelnamen für --allowedTools (Spike WS-0 P3 (iii): nur
 * Einzelnamen geben gezielt frei, --tools begrenzt MCP-Werkzeuge nicht). Server-Schlüssel ist
 * die Ressourcen-id — dieselbe Kennung, die R4 als Präfix mcp__<id>__ der Einzelnamen verlangt.
 * Fail-closed (E-F36-4): jeder Eintrag, der nicht extern/mcp, nicht FREIGEGEBEN, nicht
 * wirkung 'lokal', mit ungültiger id oder mit einer installation ist, die R4 verletzt
 * (pruefeInstallationForm: leere werkzeuge, Wildcard, fremder Präfix, Sonderzeichen, leerer
 * command), wirft — ein stilles Überspringen würde einen geplanten Server lautlos fehlen oder
 * einen gesperrten durchrutschen lassen. Reine Funktion, kein Prozessstart.
 * Seit F36 WS-5a ersetzt sie die Platzhalter {projekt_origins}/{ausgabe_ordner} in args
 * (ersetzePlatzhalter); fehlt ein benötigter Wert, wirft sie ebenfalls (E-F36-7, fail-closed).
 * @param mcpEintraege - aufgelöste Katalogeinträge (typ 'extern', unterart 'mcp')
 * @param platzhalterWerte - Werte für die Platzhalter; Default {} (dann darf kein Platzhalter vorkommen)
 * @returns { mcpConfig, zusatzWerkzeuge }; leere Eingabe = '{"mcpServers":{}}' und []
 */
export function baueMcpAufruf(mcpEintraege: readonly Ressource[], platzhalterWerte: McpPlatzhalterWerte = {}): { mcpConfig: string; zusatzWerkzeuge: string[] } {
  // Object.create(null): eine id wie '__proto__' darf den Prototyp nicht treffen (ID_MUSTER schließt sie ohnehin aus).
  const mcpServers: Record<string, { command: string; args: string[] }> = Object.create(null)
  const zusatzWerkzeuge: string[] = []
  for (const eintrag of mcpEintraege) {
    const kennung = `MCP-Eintrag '${String(eintrag.id)}'`
    if (typeof eintrag.id !== 'string' || !ID_MUSTER.test(eintrag.id)) throw new Error(`${kennung}: id verletzt ${ID_MUSTER}`)
    if (eintrag.typ !== 'extern' || eintrag.unterart !== 'mcp') throw new Error(`${kennung}: nur typ 'extern' mit unterart 'mcp' zulässig`)
    if (eintrag.freigabe !== 'FREIGEGEBEN') throw new Error(`${kennung}: freigabe muss FREIGEGEBEN sein, ist '${eintrag.freigabe}'`)
    if (eintrag.wirkung !== 'lokal') throw new Error(`${kennung}: wirkung muss 'lokal' sein, ist '${String(eintrag.wirkung)}' (E-F36-4)`)
    if (eintrag.id in mcpServers) throw new Error(`${kennung}: Ressourcen-id doppelt`)
    const verstoesse: string[] = []
    pruefeInstallationForm(eintrag.installation, 'mcp', eintrag.id, 'installation', verstoesse)
    const installation = eintrag.installation
    // Die zweite und dritte Bedingung greifen nach bestandener Formprüfung nie — sie engen nur den Typ auf die mcp-Form ein.
    if (verstoesse.length > 0 || installation === undefined || !('mcp_server' in installation)) {
      throw new Error(`${kennung}: installation ungültig (R4): ${verstoesse.join('; ') || 'mcp_server fehlt'}`)
    }
    let args: string[]
    try {
      args = ersetzePlatzhalter(installation.mcp_server.args, platzhalterWerte)
    } catch (fehler) {
      throw new Error(`${kennung}: ${(fehler as Error).message}`)
    }
    mcpServers[eintrag.id] = { command: installation.mcp_server.command, args }
    zusatzWerkzeuge.push(...installation.werkzeuge)
  }
  return { mcpConfig: mcpEintraege.length === 0 ? LEERE_MCP_CONFIG : JSON.stringify({ mcpServers }), zusatzWerkzeuge }
}

/** F-788: höchstens so viele Einträge je Empfehlungsliste, der Rest nur als Anzahl. */
const EMPFEHLUNG_OBERGRENZE = 3
/** Seit Variante 3b (Spike WS-2s S6) sind Agents nicht im Werkzeugsatz der Ausführung; WS-5b schaltet nur Ort-B-Skills — für Agents bleibt der Grund. */
const SKILL_AGENT_ERST_AB_WS5 = 'Skill/Agent in der Ausführung erst ab WS-5'
/** F36 WS-5b: Projekt-Skills (typ 'skill') bleiben im Lauf gesperrt (skillOverrides/Skill(…)), auch wenn FREIGEGEBEN. */
export const PROJEKT_SKILL_GESPERRT = 'Projekt-Skill im Lauf gesperrt (nur installierte Ort-B-Skills sind aufrufbar, F36 WS-5b)'
/** F36 WS-5a (E-F36-7): Grund, wenn ein Eintrag mit {projekt_origins} ohne vorschau_url des Projekts empfohlen würde. */
export const PROJEKT_URL_FEHLT = 'Projekt-URL (vorschau_url) fehlt'

/** Ein Listeneintrag samt Rang (0 = beide anwendbar_wenn-Schlüssel, 1 = nur einer) vor dem Sortieren. */
type Kandidat = { rang: number; eintrag: EmpfehlungsEintrag }

/**
 * Rangfolge je Liste: beide anwendbar_wenn-Schlüssel erfüllt vor nur einem, danach id alphabetisch
 * (Codepunkte, nicht locale-abhängig); danach auf EMPFEHLUNG_OBERGRENZE gekürzt.
 * @param kandidaten - Einträge einer Liste mit Rang
 * @returns die angezeigten Einträge und die Anzahl der weggekürzten
 */
function sortiereUndBegrenze(kandidaten: Kandidat[]): { liste: EmpfehlungsEintrag[]; weitere: number } {
  const sortiert = [...kandidaten].sort((a, b) => a.rang - b.rang || (a.eintrag.id < b.eintrag.id ? -1 : a.eintrag.id > b.eintrag.id ? 1 : 0))
  return { liste: sortiert.slice(0, EMPFEHLUNG_OBERGRENZE).map((k) => k.eintrag), weitere: Math.max(0, sortiert.length - EMPFEHLUNG_OBERGRENZE) }
}

/**
 * Reine Funktion (F36 WS-3, E-F36-2: deterministisch, kein Modell, keine I/O): teilt die anwendbaren
 * Katalogeinträge (pruefeAnwendbarkeit) in „Wird genutzt“ und „Passt, nicht im Lauf“.
 * - wirdGenutzt: nur, was der Start dem Lauf tatsächlich übergibt — typ 'extern', unterart 'mcp',
 *   FREIGEGEBEN, installation gesetzt, wirkung 'lokal', verfuegbar; seit F36 WS-5b auch typ 'extern',
 *   unterart 'skill', FREIGEGEBEN, installation gesetzt, verfuegbar (Ordner da, inhalt_hash stimmt).
 *   Agents (intern oder extern) und Projekt-Skills (typ 'skill') nie.
 * - passtNichtImLauf: alle übrigen anwendbaren Einträge, grund aus fehltFuerEinsatz, bei Agents
 *   zusätzlich SKILL_AGENT_ERST_AB_WS5, bei Projekt-Skills PROJEKT_SKILL_GESPERRT, bei einem nicht
 *   installierbaren externen Skill ohne installation der Grund aus pruefeInstallierbarkeit.
 * - MCP mit wirkung ≠ 'lokal' (E-F36-4, in V1 nicht freigebbar) steht in keiner Liste, nur in
 *   nichtFreigebbarAnzahl.
 * - Seit F36 WS-5a: ein MCP, dessen args {projekt_origins} tragen, kommt ohne Projekt-URL nie in
 *   „Wird genutzt“ (Grund PROJEKT_URL_FEHLT, E-F36-7); jeder „Wird genutzt“-Eintrag trägt
 *   empfehlungId (F-808), ein über die Workforce installierbarer Eintrag in „Passt, nicht im Lauf“
 *   installierbar: true (pruefeInstallierbarkeit, noch ohne installation).
 * Rangfolge und Obergrenze siehe sortiereUndBegrenze. Die Eingabereihenfolge beeinflusst das Ergebnis nicht.
 * @param aufgeloest - Katalog nach loeseRessourcenAuf
 * @param kontext - task_typen des Auftrags (Router) und Pfade des Projekts
 * @param laufKontext - { projektUrlVorhanden } des Projekts; Default {} = keine Projekt-URL (fail-closed)
 * @returns die beiden Listen, je Liste die Anzahl weiterer Einträge, die Anzahl nicht freigebbarer
 */
export function baueEmpfehlung(aufgeloest: readonly AufgelosteRessource[], kontext: AnwendbarkeitsKontext, laufKontext: EmpfehlungsLaufKontext = {}): Empfehlung {
  const genutzt: Kandidat[] = []
  const passtNicht: Kandidat[] = []
  let nichtFreigebbarAnzahl = 0
  for (const ressource of aufgeloest) {
    const anwendbarkeit = pruefeAnwendbarkeit(ressource, kontext)
    if (!anwendbarkeit.anwendbar) continue
    const istMcp = ressource.typ === 'extern' && ressource.unterart === 'mcp'
    const istOrtBSkill = ressource.typ === 'extern' && ressource.unterart === 'skill'
    if (istMcp && ressource.wirkung !== 'lokal') {
      nichtFreigebbarAnzahl++
      continue
    }
    const regel = ressource.anwendbar_wenn
    const rang = regel?.task_typen_any !== undefined && regel.pfad_muster_any !== undefined ? 0 : 1
    const basis = { id: ressource.id, name: ressource.name, typ: ressource.typ, ...(ressource.unterart !== undefined ? { unterart: ressource.unterart } : {}) }
    const ohneProjektUrl = istMcp && brauchtProjektOrigins(ressource) && laufKontext.projektUrlVorhanden !== true
    if ((istMcp || istOrtBSkill) && ressource.freigabe === 'FREIGEGEBEN' && ressource.installation !== undefined && ressource.verfuegbar && !ohneProjektUrl) {
      genutzt.push({ rang, eintrag: { ...basis, grund: anwendbarkeit.begruendung, empfehlungId: empfehlungsKennung(ressource) } })
      continue
    }
    const gruende = fehltFuerEinsatz(ressource, ressource)
    const nichtInstallierbar = (istMcp || istOrtBSkill) && ressource.installation === undefined ? pruefeInstallierbarkeit(ressource) : null
    if (ressource.typ === 'skill') gruende.push(PROJEKT_SKILL_GESPERRT)
    else if (!istMcp && !istOrtBSkill) gruende.push(SKILL_AGENT_ERST_AB_WS5)
    // Nur für Skills als Grund angezeigt (neu in WS-5b); die MCP-Gründe bleiben wie in WS-5a.
    if (istOrtBSkill && nichtInstallierbar !== null) gruende.push(`nicht installierbar: ${nichtInstallierbar}`)
    if (ohneProjektUrl) gruende.push(PROJEKT_URL_FEHLT)
    const installierbar = (istMcp || istOrtBSkill) && ressource.installation === undefined && nichtInstallierbar === null
    passtNicht.push({ rang, eintrag: { ...basis, grund: gruende.length > 0 ? gruende.join('; ') : 'nicht einsatzbereit', ...(installierbar ? { installierbar: true } : {}) } })
  }
  const a = sortiereUndBegrenze(genutzt)
  const b = sortiereUndBegrenze(passtNicht)
  return { wirdGenutzt: a.liste, passtNichtImLauf: b.liste, weitereAnzahl: { wirdGenutzt: a.weitere, passtNichtImLauf: b.weitere }, nichtFreigebbarAnzahl }
}

/**
 * F36 WS-3: die eine Zeile für den Auftragstext der Ausführung — null, wenn nichts genutzt wird (dann
 * bleibt der Auftragstext bitgenau unverändert).
 *
 * F-827 (Reallauf F3: die Ausführung startete 'npm run dev' selbst bzw. navigierte auf file://,
 * obwohl die Vorschau lief): trägt einer der genutzten Einträge {projekt_origins}
 * (brauchtProjektOrigins) und ist eine Projekt-URL bekannt, nennt die Zeile sie. Sonst bleibt die
 * Zeile bitgenau wie vorher.
 * @param wirdGenutzt - die angezeigte Liste „Wird genutzt“ aus baueEmpfehlung
 * @param vorschauUrl - vorschau_url des Projekts, oder null
 * @param genutzteRessourcen - die aufgelösten Katalogeinträge zu wirdGenutzt
 * @returns die Zeile oder null
 */
export function baueEmpfehlungsZeile(wirdGenutzt: readonly EmpfehlungsEintrag[], vorschauUrl: string | null = null, genutzteRessourcen: readonly Ressource[] = []): string | null {
  if (wirdGenutzt.length === 0) return null
  const zeile = `Freigegebene Katalog-Fähigkeiten in diesem Lauf: ${wirdGenutzt.map((e) => `${e.id} (${e.name})`).join(', ')} — nutzen, wo sie passen.`
  if (vorschauUrl === null || !genutzteRessourcen.some(brauchtProjektOrigins)) return zeile
  return `${zeile} Projekt-Vorschau: ${vorschauUrl} läuft bereits, zum Prüfen browser_navigate darauf nutzen, nicht selbst starten; keine file://-URLs.`
}

export type { AufgelosteRessource, CapabilityGap, Empfehlung, EmpfehlungsEintrag, EmpfehlungsLaufKontext, InstallationsVorlage, McpInstallationsVorlage, McpPlatzhalterWerte, Ressource, SkillInstallationsVorlage }
