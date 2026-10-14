/**
 * Datei: src/faehigkeiten/index.ts
 *
 * Zweck: Fähigkeiten je Projekt (F45 F-1; F-815, F-816, F-1012 Serverteil). Reine Bausteine plus schmales Datei-I/O:
 * - lokale Datei ~/.ai-workforce/faehigkeiten.lokal.json (E-F45-8): validieren, laden (fehlt | gueltig | ungueltig —
 *   ungueltig sperrt jeden Start mit Katalog-Fähigkeiten, E-F45-7), ändern (rein) und synchron schreiben;
 * - Identität nach Inhalt (F-816): Projekt-Agents (.claude/agents, rekursiv) und -Skills (.claude/skills/<ordner>) mit
 *   Hash, strenger Frontmatter-Positivliste, Namensregeln; freigegeben, wenn der Hash gleich der Datei des gleichnamigen
 *   FREIGEGEBEN-Katalogeintrags der Workforce oder gleich der Projekt-Freigabe nach Inhalt ist; aktiv nur, wenn Stefan
 *   den Eintrag je Projekt eingeschaltet hat (Opt-in, E-F45-6);
 * - Abgleich der eingefrorenen Hashes mit der Momentaufnahme direkt vor dem Spawn (Advisor A6).
 *
 * Wird aufgerufen von:
 * - src/faehigkeiten/start.ts, src/faehigkeiten/faehigkeiten.test.ts
 * - scripts/leitstand-server.mjs (Empfehlung/Start), scripts/leitstand/routen-faehigkeiten.mjs (Endpunkte)
 * - src/execution-controller/index.ts (pruefeGegenMomentaufnahme, hashLokaleDatei)
 *
 * Wichtig:
 * - Der Frontmatter-Parser ist absichtlich strenger als YAML (features/F45/plan-f1.md, Delta B2): was er nicht als
 *   schlicht erkennt, ist gesperrt. Ihn nie „großzügiger“ machen, ohne die CLI-Lesart zu messen.
 * - Hash-Formen: Agent = sha256 der Dateibytes, Skill = berechneInhaltHash (Ort-B-Form). Beide müssen zu
 *   erfasseClaudeOrdner (src/execution-controller) passen, sonst schlägt der Abgleich vor dem Spawn fehl.
 */

import { createHash } from 'node:crypto'
import { existsSync, lstatSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { EINGEBAUT_REST_SKILLS, leseProjektCommandNamen } from '../ressourcen/ort-b-start.ts'
import { berechneInhaltHash, EINGEBAUTE_SKILLS_S7 } from '../ressourcen/skill-dateien.ts'
import { ID_MUSTER as KATALOG_ID_MUSTER } from '../projekte/index.ts'
import type { Ressource } from '../ressourcen/types.ts'
import type { EingebautReferenz, FaehigkeitenLokal, KatalogFreigabe, LokaleDatei, PluginFreigabe, ProjektEinstellungen, ProjektFaehigkeit, ProjektFaehigkeitenErgebnis, ProjektFaehigkeitenKontext, ProjektTyp } from './types.ts'

/** Ablage der lokalen Datei (E-F45-8) — nur der CLI-Bindeblock des Leitstands setzt diesen Pfad (Delta B7). */
export const STANDARD_FAEHIGKEITEN_LOKAL_PFAD = join(homedir(), '.ai-workforce', 'faehigkeiten.lokal.json')

/** Schlichter, sperrbarer Name (Agent(…)/Skill(…)/skillOverrides), ohne ':' — Agents und Skills. */
export const NAME_MUSTER = /^[A-Za-z0-9][A-Za-z0-9._-]*$/
/** sha256 als 64 Hex-Zeichen (Hash-Felder der lokalen Datei und der Endpunkte). */
export const SHA256_MUSTER = /^[0-9a-f]{64}$/
/** Projekt-Schlüssel '<typ>:<name>'. */
const SCHLUESSEL_MUSTER = /^(agent|skill):([A-Za-z0-9][A-Za-z0-9._-]*)$/

/** F45 F-3b-1: Plugin-id aus Stefans Claude Code ('<name>@<marketplace>'); src/plugin-kopie prüft zusätzlich pruefePfad. */
export const PLUGIN_ID_MUSTER = /^[A-Za-z0-9][A-Za-z0-9._-]*@[A-Za-z0-9][A-Za-z0-9._-]*$/
/** F45 F-3b-1: Eintrag der Zuordnung '<skill|agent>:<plugin-id>:<name>'. */
const ZUORDNUNG_MUSTER = /^(agent|skill):[A-Za-z0-9][A-Za-z0-9._-]*@[A-Za-z0-9][A-Za-z0-9._-]*:[A-Za-z0-9][A-Za-z0-9._-]*$/
/** F45 F-3b-1: Kennung des Prüfberichts einer Plugin-Freigabe '<artefakt_id>@<version>'. */
const BERICHT_KENNUNG_MUSTER = /^pruefbericht-[a-z0-9][a-z0-9-]*@[1-9][0-9]*$/

/**
 * F45 F-3b-1 (E-F3b-3 = nur Ausführung): Rollen, denen Plugin-Skills/-Agents zugeordnet werden können. Nur 'ausfuehrung' hat
 * einen Fähigkeiten-Weg in den Lauf (leitstand-server.mjs erhaeltKatalogFaehigkeiten, Werkzeugsatz 'schreibend'); lesende
 * Rollen (Architekt, Advisor, Code-Reviewer, QA) später mit eigenem Schritt, Coach mit B5a (E-F3b-2), jarvis/router/scout/
 * eignungspruefung nie. Das Datenmodell bleibt je Rolle.
 */
export const PLUGIN_ROLLEN: readonly string[] = Object.freeze(['ausfuehrung'])

/**
 * Eintrag der Zuordnung aus Typ, Plugin-id und Name; Commands sind nicht zuordenbar (E-F3b-5).
 * @param typ - 'skill' | 'agent'
 * @param pluginId - '<name>@<marketplace>'
 * @param name - Name des Bestandteils
 * @returns Eintrag oder null bei falscher Form
 */
export function zuordnungsEintrag(typ: 'skill' | 'agent', pluginId: string, name: string): string | null {
  const eintrag = `${typ}:${pluginId}:${name}`
  return (typ === 'skill' || typ === 'agent') && ZUORDNUNG_MUSTER.test(eintrag) && PLUGIN_ID_MUSTER.test(pluginId) && NAME_MUSTER.test(name) ? eintrag : null
}

/** Frontmatter-Positivliste (Advisor A2) — Agent: tools Pflicht; Skill: nur beschreibende Felder. */
const AGENT_FELDER: ReadonlySet<string> = new Set(['name', 'description', 'tools', 'model', 'color'])
const SKILL_FELDER: ReadonlySet<string> = new Set(['name', 'description', 'argument-hint', 'license'])
/** Werkzeuge, die ein Projekt-Agent nie tragen darf (Subagent ruft Subagent/Skill). */
const VERBOTENE_AGENT_WERKZEUGE = new Set(['Agent', 'Task', 'Skill'])

/** Referenzliste der eingebauten Einträge (Pfad relativ zu dieser Datei). */
export const EINGEBAUT_REFERENZ_URL = new URL('./eingebaut-referenz.json', import.meta.url)

function istObjekt(wert: unknown): wert is Record<string, unknown> {
  return typeof wert === 'object' && wert !== null && !Array.isArray(wert)
}

/**
 * Zerlegt einen Projekt-Schlüssel '<typ>:<name>'.
 * @param schluessel - z. B. 'agent:qa'
 * @returns { typ, name } oder null
 */
export function zerlegeSchluessel(schluessel: unknown): { typ: ProjektTyp; name: string } | null {
  if (typeof schluessel !== 'string') return null
  const t = SCHLUESSEL_MUSTER.exec(schluessel)
  return t === null ? null : { typ: t[1] as ProjektTyp, name: t[2] }
}

/**
 * Prüft ein geparstes Objekt gegen schemas/faehigkeiten-lokal.schema.json (handgeschrieben, Muster validiereProjekteDaten).
 * an: nur 'agent:<n>'/'skill:<n>'; aus: nur Katalog-ids; inhalt_freigaben: Schlüssel wie an, Wert sha256 (Delta B4).
 * @param daten - geparstes JSON
 * @returns Verstöße; leer = gültig
 */
export function validiereFaehigkeitenLokal(daten: unknown): string[] {
  if (!istObjekt(daten)) return ['Wurzel ist kein Objekt']
  const v: string[] = []
  for (const feld of Object.keys(daten)) if (feld !== 'faehigkeiten_lokal_schema' && feld !== 'projekte' && feld !== 'plugin_freigaben') v.push(`unbekanntes Feld '${feld}'`)
  if (daten.faehigkeiten_lokal_schema !== 'v0') v.push("'faehigkeiten_lokal_schema' muss 'v0' sein")
  // F45 F-3b-1: Freigaben je Plugin-id (global) — Form wie schemas/faehigkeiten-lokal.schema.json.
  if ('plugin_freigaben' in daten) {
    const f = daten.plugin_freigaben
    if (!istObjekt(f)) v.push("'plugin_freigaben' muss ein Objekt sein")
    else
      for (const [id, e] of Object.entries(f)) {
        const p = `plugin_freigaben.${id}`
        if (!PLUGIN_ID_MUSTER.test(id)) v.push(`'plugin_freigaben': Schlüssel '${id}' muss eine Plugin-id '<name>@<marketplace>' sein`)
        if (!istObjekt(e)) {
          v.push(`'${p}' muss ein Objekt sein`)
          continue
        }
        for (const feld of Object.keys(e)) if (!['kopie_hash', 'pruefbericht', 'freigegeben_am'].includes(feld)) v.push(`unbekanntes Feld '${p}.${feld}'`)
        if (typeof e.kopie_hash !== 'string' || !SHA256_MUSTER.test(e.kopie_hash)) v.push(`'${p}.kopie_hash' muss ein sha256 sein`)
        if (typeof e.pruefbericht !== 'string' || !BERICHT_KENNUNG_MUSTER.test(e.pruefbericht)) v.push(`'${p}.pruefbericht' muss '<artefakt_id>@<version>' sein`)
        if (typeof e.freigegeben_am !== 'string' || e.freigegeben_am === '') v.push(`'${p}.freigegeben_am' fehlt`)
      }
  }
  if (!istObjekt(daten.projekte)) {
    v.push("'projekte' muss ein Objekt sein")
    return v
  }
  for (const [id, eintrag] of Object.entries(daten.projekte)) {
    const p = `projekte.${id}`
    if (!KATALOG_ID_MUSTER.test(id)) v.push(`'${p}': Projekt-id verletzt ${KATALOG_ID_MUSTER}`)
    if (!istObjekt(eintrag)) {
      v.push(`'${p}' muss ein Objekt sein`)
      continue
    }
    for (const feld of Object.keys(eintrag)) if (!['an', 'aus', 'inhalt_freigaben', 'plugin_zuordnung'].includes(feld)) v.push(`unbekanntes Feld '${p}.${feld}'`)
    if ('plugin_zuordnung' in eintrag) {
      const z = eintrag.plugin_zuordnung
      if (!istObjekt(z)) v.push(`'${p}.plugin_zuordnung' muss ein Objekt sein`)
      else
        for (const [rolle, liste] of Object.entries(z)) {
          if (!(PLUGIN_ROLLEN as readonly string[]).includes(rolle)) v.push(`'${p}.plugin_zuordnung': Rolle '${rolle}' ist nicht zuordenbar (nur ${PLUGIN_ROLLEN.join(', ')}, E-F3b-3)`)
          if (!Array.isArray(liste)) {
            v.push(`'${p}.plugin_zuordnung.${rolle}' muss ein Array sein`)
            continue
          }
          liste.forEach((x, i) => {
            if (typeof x !== 'string' || !ZUORDNUNG_MUSTER.test(x)) v.push(`'${p}.plugin_zuordnung.${rolle}[${i}]' muss '<skill|agent>:<plugin-id>:<name>' sein`)
          })
          if (new Set(liste).size !== liste.length) v.push(`'${p}.plugin_zuordnung.${rolle}' enthält Doppelte`)
        }
    }
    const liste = (feld: string, gueltig: (e: unknown) => boolean, regel: string): void => {
      if (!(feld in eintrag)) return
      const wert = eintrag[feld]
      if (!Array.isArray(wert)) {
        v.push(`'${p}.${feld}' muss ein Array sein`)
        return
      }
      wert.forEach((e, i) => {
        if (!gueltig(e)) v.push(`'${p}.${feld}[${i}]' ${regel}`)
      })
      if (new Set(wert).size !== wert.length) v.push(`'${p}.${feld}' enthält Doppelte`)
    }
    liste('an', (e) => zerlegeSchluessel(e) !== null, "muss 'agent:<name>' oder 'skill:<name>' sein")
    liste('aus', (e) => typeof e === 'string' && KATALOG_ID_MUSTER.test(e), 'muss eine Katalog-id sein')
    if ('inhalt_freigaben' in eintrag) {
      const f = eintrag.inhalt_freigaben
      if (!istObjekt(f)) v.push(`'${p}.inhalt_freigaben' muss ein Objekt sein`)
      else
        for (const [k, h] of Object.entries(f)) {
          if (zerlegeSchluessel(k) === null) v.push(`'${p}.inhalt_freigaben': Schlüssel '${k}' muss 'agent:<name>' oder 'skill:<name>' sein`)
          if (typeof h !== 'string' || !SHA256_MUSTER.test(h)) v.push(`'${p}.inhalt_freigaben.${k}' muss ein sha256 sein`)
        }
    }
  }
  return v
}

/** Leere, gültige Datei (Standard ohne Datei). */
function leer(): FaehigkeitenLokal {
  return { faehigkeiten_lokal_schema: 'v0', projekte: {} }
}

/**
 * Lädt die lokale Datei. Ohne Pfad oder ohne Datei: fehlt (Standard). Nicht lesbar, kein JSON oder Schema verletzt:
 * ungueltig mit Grund (E-F45-7 — der Aufrufer sperrt damit den Start, statt eine Sperre still fallen zu lassen).
 * @param pfad - absoluter Pfad oder null (Request-Handler ohne Pfad, Delta B7)
 * @returns LokaleDatei
 */
export function ladeFaehigkeitenLokal(pfad: string | null): LokaleDatei {
  if (pfad === null || !existsSync(pfad)) return { zustand: 'fehlt', daten: leer() }
  let bytes: Buffer
  let daten: unknown
  try {
    bytes = readFileSync(pfad)
  } catch (fehler) {
    return { zustand: 'ungueltig', grund: `'${pfad}' nicht lesbar (${(fehler as Error).message})` }
  }
  try {
    daten = JSON.parse(bytes.toString('utf8'))
  } catch (fehler) {
    return { zustand: 'ungueltig', grund: `'${pfad}' ist kein gültiges JSON (${(fehler as Error).message})` }
  }
  const verstoesse = validiereFaehigkeitenLokal(daten)
  if (verstoesse.length > 0) return { zustand: 'ungueltig', grund: `'${pfad}' verletzt schemas/faehigkeiten-lokal.schema.json: ${verstoesse.join('; ')}` }
  // F45 F-2a (Code-Review 5): Hash der Bytes — dieselbe Form wie hashLokaleDatei (Wächter, Vorher/Nachher im Controller).
  return { zustand: 'gueltig', daten: daten as FaehigkeitenLokal, hash: createHash('sha256').update(bytes).digest('hex') }
}

/**
 * sha256 der Bytes der lokalen Datei, 'fehlt' ohne Datei, 'nicht lesbar' bei Lesefehler — für den Vorher/Nachher-
 * Vergleich eines Laufs (Delta B1). Wirft nie.
 * @param pfad - Pfad oder null
 * @returns Kennung des Stands
 */
export function hashLokaleDatei(pfad: string | null): string {
  if (pfad === null || !existsSync(pfad)) return 'fehlt'
  try {
    return createHash('sha256').update(readFileSync(pfad)).digest('hex')
  } catch {
    return 'nicht lesbar'
  }
}

/**
 * Einstellungen eines Projekts (leer, wenn nicht vorhanden).
 * @param daten - gültige Datei (oder leer)
 * @param projektId - Projekt-id
 * @returns an, aus, inhalt_freigaben
 */
export function projektEinstellungen(daten: FaehigkeitenLokal, projektId: string): ProjektEinstellungen {
  const p = Object.hasOwn(daten.projekte, projektId) ? daten.projekte[projektId] : undefined
  // F45 F-3b-1: plugin_zuordnung nur, wenn das Projekt eine hat — die bisherige Form bleibt für alle anderen Aufrufer gleich.
  const zuordnung = p?.plugin_zuordnung === undefined ? undefined : Object.fromEntries(Object.entries(p.plugin_zuordnung).map(([rolle, liste]) => [rolle, [...liste]]))
  return { an: [...(p?.an ?? [])], aus: [...(p?.aus ?? [])], inhalt_freigaben: { ...(p?.inhalt_freigaben ?? {}) }, ...(zuordnung !== undefined ? { plugin_zuordnung: zuordnung } : {}) }
}

/**
 * Rein: neue Datei mit geänderter Aktivierung (Delta B4) — Projekt-Schlüssel in an setzen/entfernen, Katalog-id in
 * aus entfernen/setzen. Leere Listen/Objekte fallen weg, ein leeres Projekt ebenso.
 * @param daten - gültige Datei
 * @param projektId - Projekt-id
 * @param eintrag - 'agent:<n>'/'skill:<n>' oder Katalog-id (Form vom Aufrufer geprüft)
 * @param aktiv - true = einschalten
 * @returns neue Datei
 */
export function aendereAktivierung(daten: FaehigkeitenLokal, projektId: string, eintrag: string, aktiv: boolean): FaehigkeitenLokal {
  const e = projektEinstellungen(daten, projektId)
  const istProjekt = zerlegeSchluessel(eintrag) !== null
  const liste = istProjekt ? e.an : e.aus
  const soll = istProjekt ? aktiv : !aktiv
  const neu = soll ? [...new Set([...liste, eintrag])].sort() : liste.filter((x) => x !== eintrag)
  return mitProjekt(daten, projektId, istProjekt ? { ...e, an: neu } : { ...e, aus: neu })
}

/**
 * Rein: neue Datei mit gesetzter Projekt-Freigabe nach Inhalt.
 * @param daten - gültige Datei
 * @param projektId - Projekt-id
 * @param schluessel - 'agent:<n>'/'skill:<n>'
 * @param hash - freigegebener Hash
 * @returns neue Datei
 */
export function setzeInhaltsfreigabe(daten: FaehigkeitenLokal, projektId: string, schluessel: string, hash: string): FaehigkeitenLokal {
  const e = projektEinstellungen(daten, projektId)
  return mitProjekt(daten, projektId, { ...e, inhalt_freigaben: { ...e.inhalt_freigaben, [schluessel]: hash } })
}

/**
 * Setzt die Einstellungen eines Projekts, ohne leere Felder. F45 F-3b-1 (Advisor F3): plugin_zuordnung des Projekts und
 * plugin_freigaben oben bleiben erhalten — vorher hätte jedes Schalten beide still gelöscht.
 * @param daten - gültige Datei
 * @param projektId - Projekt-id
 * @param e - neue Einstellungen des Projekts
 * @returns neue Datei
 */
function mitProjekt(daten: FaehigkeitenLokal, projektId: string, e: ProjektEinstellungen): FaehigkeitenLokal {
  const zuordnung = Object.fromEntries(Object.entries(e.plugin_zuordnung ?? {}).filter(([, liste]) => liste.length > 0))
  const kompakt: Partial<ProjektEinstellungen> = {
    ...(e.an.length > 0 ? { an: e.an } : {}),
    ...(e.aus.length > 0 ? { aus: e.aus } : {}),
    ...(Object.keys(e.inhalt_freigaben).length > 0 ? { inhalt_freigaben: e.inhalt_freigaben } : {}),
    ...(Object.keys(zuordnung).length > 0 ? { plugin_zuordnung: zuordnung } : {}),
  }
  const projekte = { ...daten.projekte }
  if (Object.keys(kompakt).length === 0) delete projekte[projektId]
  else projekte[projektId] = kompakt
  return mitFreigaben(daten.plugin_freigaben, projekte)
}

/**
 * Neue Datei aus Freigaben und Projekten (leere Freigaben fallen weg; Reihenfolge der Felder fest).
 * @param freigaben - plugin_freigaben oder undefined
 * @param projekte - Projekte
 * @returns Datei
 */
function mitFreigaben(freigaben: FaehigkeitenLokal['plugin_freigaben'], projekte: FaehigkeitenLokal['projekte']): FaehigkeitenLokal {
  const f = freigaben === undefined ? {} : Object.fromEntries(Object.entries(freigaben).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
  return { faehigkeiten_lokal_schema: 'v0', ...(Object.keys(f).length > 0 ? { plugin_freigaben: f } : {}), projekte }
}

/**
 * F45 F-3b-1, rein: neue Datei mit gesetzter Plugin-Freigabe (aufgerufen nur aus aendereLokaleDatei, Gate).
 * @param daten - gültige Datei
 * @param pluginId - '<name>@<marketplace>'
 * @param freigabe - { kopie_hash, pruefbericht, freigegeben_am }
 * @returns neue Datei
 */
export function setzePluginFreigabe(daten: FaehigkeitenLokal, pluginId: string, freigabe: PluginFreigabe): FaehigkeitenLokal {
  return mitFreigaben({ ...(daten.plugin_freigaben ?? {}), [pluginId]: { kopie_hash: freigabe.kopie_hash, pruefbericht: freigabe.pruefbericht, freigegeben_am: freigabe.freigegeben_am } }, daten.projekte)
}

/**
 * F45 F-3b-1, rein: Rücknahme einer Plugin-Freigabe. Zuordnungen bleiben gespeichert (wirken ohne Freigabe nicht).
 * @param daten - gültige Datei
 * @param pluginId - Plugin-id
 * @returns neue Datei
 */
export function entfernePluginFreigabe(daten: FaehigkeitenLokal, pluginId: string): FaehigkeitenLokal {
  const rest = { ...(daten.plugin_freigaben ?? {}) }
  delete rest[pluginId]
  return mitFreigaben(rest, daten.projekte)
}

/**
 * F45 F-3b-1, rein: Eintrag der Zuordnung einer Rolle setzen/entfernen (sortiert, ohne Doppelte; Form prüft der Aufrufer).
 * @param daten - gültige Datei
 * @param projektId - Projekt-id
 * @param rolle - zuordenbare Rolle (PLUGIN_ROLLEN)
 * @param eintrag - zuordnungsEintrag(...)
 * @param an - true = zuordnen
 * @returns neue Datei
 */
export function aenderePluginZuordnung(daten: FaehigkeitenLokal, projektId: string, rolle: string, eintrag: string, an: boolean): FaehigkeitenLokal {
  const e = projektEinstellungen(daten, projektId)
  const zuordnung = e.plugin_zuordnung ?? {}
  const liste = zuordnung[rolle] ?? []
  const neu = an ? [...new Set([...liste, eintrag])].sort() : liste.filter((x) => x !== eintrag)
  return mitProjekt(daten, projektId, { ...e, plugin_zuordnung: { ...zuordnung, [rolle]: neu } })
}

/**
 * Schreibt die Datei synchron (temp-Datei + rename, LF). Kein Prozess-Lock nötig: synchron gibt es im Node-Thread keine
 * Verschränkung (Advisor A11). Wirft bei Fehler; die temp-Datei wird dann entfernt.
 * @param pfad - Zielpfad
 * @param daten - gültige Datei
 * @returns sha256 der geschriebenen Bytes (F45 F-2a, Advisor A3: der Wächter übernimmt genau diesen Stand, ohne neu zu lesen)
 */
export function schreibeFaehigkeitenLokal(pfad: string, daten: FaehigkeitenLokal): string {
  const temp = `${pfad}.${process.pid}.tmp`
  const inhalt = `${JSON.stringify(daten, null, 2)}\n`
  try {
    writeFileSync(temp, inhalt, 'utf8')
    renameSync(temp, pfad)
  } catch (fehler) {
    rmSync(temp, { force: true })
    throw fehler
  }
  return createHash('sha256').update(inhalt, 'utf8').digest('hex')
}

/**
 * F45 F-2a (F-1054 (1)): Kennung eines Projekt-Eintrags für „Anzeige = Start“ — '<typ>:<name>@<sha256>' (Muster der
 * empfehlungIds '<id>@<sha256>'). Getrennt wird über das Präfix agent:/skill: (Katalog-ids tragen kein ':').
 * @param eintrag - Projekt-Eintrag
 * @returns Kennung, oder null ohne Hash
 */
export function projektKennung(eintrag: { schluessel: string; hash: string | null }): string | null {
  return eintrag.hash === null ? null : `${eintrag.schluessel}@${eintrag.hash}`
}

/** Form einer Projekt-Kennung ('agent:qa@<sha256>'). */
const PROJEKT_KENNUNG_MUSTER = /^(agent|skill):[A-Za-z0-9][A-Za-z0-9._-]*@[0-9a-f]{64}$/

/**
 * F45 F-2a (Advisor A6): trennt die angezeigten ids des Start-Bodys in Katalog-Kennungen ('<id>@<sha>', ohne ':') und
 * Projekt-Kennungen ('agent:'/'skill:' am Anfang). Eine id mit Präfix, aber falscher Form bleibt bei projekt und fällt
 * im Vergleich als Abweichung auf (fail-closed). Seit F45 F-3b-2 zusätzlich Plugin-Kennungen ('plugin:' am Anfang).
 * @param ids - angezeigte ids (Form bereits geprüft: nicht-leere Strings)
 * @returns { katalog, projekt, plugin }
 */
export function trenneAngezeigteIds(ids: readonly string[]): { katalog: string[]; projekt: string[]; plugin: string[] } {
  const istProjekt = (id: string): boolean => id.startsWith('agent:') || id.startsWith('skill:')
  // F45 F-3b-2: Plugin-Kennungen 'plugin:<typ>:<plugin-id>:<name>@<kopie_hash>' (src/plugin-lauf, pluginKennungen).
  const istPlugin = (id: string): boolean => id.startsWith('plugin:')
  return { katalog: ids.filter((id) => !istProjekt(id) && !istPlugin(id)), projekt: ids.filter(istProjekt), plugin: ids.filter(istPlugin) }
}

/**
 * F45 F-2a (F-1054 (1)): vergleicht angezeigte mit beim Start berechneten Projekt-Kennungen (als Mengen). Rein.
 * @param angezeigt - Projekt-Kennungen aus dem Body
 * @param beimStart - Kennungen der aktiven Projekt-Einträge
 * @returns null bei Gleichheit, sonst beide Listen gekürzt (Hash 12 Zeichen) für den Grund
 */
export function vergleicheProjektKennungen(angezeigt: readonly string[], beimStart: readonly string[]): { angezeigt: string; beimStart: string } | null {
  const a = [...new Set(angezeigt)].sort()
  const b = [...new Set(beimStart)].sort()
  if (a.length === b.length && a.every((x, i) => x === b[i] && PROJEKT_KENNUNG_MUSTER.test(x))) return null
  const liste = (ids: string[]): string => (ids.length === 0 ? 'keine' : ids.map((id) => id.replace(/@([0-9a-f]{12})[0-9a-f]{52}$/, '@$1…')).join(', '))
  return { angezeigt: liste(a), beimStart: liste(b) }
}

/**
 * F45 F-2a (F-1054 (1)): die eingeschalteten Projekt-Einträge für den Freigabeblock (empfehlung.projektFaehigkeiten) —
 * aktive mit Kennung (gehen mit der Freigabe zurück), eingeschaltete, aber nicht aktive mit Grund (der Start lehnt sie
 * ab, QA 1). Nicht eingeschaltete fehlen (Opt-in). Rein.
 * @param eintraege - ermittleProjektFaehigkeiten(...).eintraege
 * @returns Anzeige-Einträge in Eingabereihenfolge
 */
export function projektFaehigkeitenFuerAnzeige(eintraege: readonly ProjektFaehigkeit[]): { id: string; name: string; typ: ProjektTyp; aktiv: boolean; kennung?: string; grund?: string; beschreibung?: string }[] {
  return eintraege
    .filter((e) => e.eingeschaltet)
    .map((e) => {
      const kennung = e.aktiv ? projektKennung(e) : null
      return {
        id: e.schluessel,
        name: e.name,
        typ: e.typ,
        aktiv: e.aktiv,
        ...(kennung !== null ? { kennung } : {}),
        ...(e.grund !== null ? { grund: e.grund } : {}),
        ...(e.beschreibung !== null && e.beschreibung !== '' ? { beschreibung: e.beschreibung } : {}),
      }
    })
}

/**
 * F45 F-2a (F-1054 (2)): Projektstand je Katalog-id für die Gründe der Empfehlung (laufKontext.projektStatus) — über die
 * Katalog-Freigaben ('<typ>:<name>' → id) rückwärts zugeordnet. Ein Katalogeintrag ohne Eintrag hier (nicht FREIGEGEBEN,
 * Pfad nicht exakt, Datei nicht lesbar) bekommt in baueEmpfehlung „nicht im Projektordner“. Rein.
 * @param eintraege - ermittleProjektFaehigkeiten(...).eintraege
 * @param katalog - katalogFreigaben
 * @param einstellungen - Einstellungen des Projekts (inhalt_freigaben: abweichend auch ohne Katalog-Hash)
 * @returns Map Katalog-id → Stand
 */
export function projektStatusFuerEmpfehlung(eintraege: readonly ProjektFaehigkeit[], katalog: ReadonlyMap<string, KatalogFreigabe>, einstellungen: ProjektEinstellungen): Map<string, { aktiv: boolean; eingeschaltet: boolean; abweichend: boolean; freigegeben: boolean; grund: string | null }> {
  const ergebnis = new Map<string, { aktiv: boolean; eingeschaltet: boolean; abweichend: boolean; freigegeben: boolean; grund: string | null }>()
  for (const [schluessel, freigabe] of katalog) {
    const e = eintraege.find((x) => x.schluessel === schluessel && x.hash !== null)
    if (e === undefined) continue
    const abweichend = e.freigabe === null && (e.katalog_hash !== null || einstellungen.inhalt_freigaben[schluessel] !== undefined)
    ergebnis.set(freigabe.id, { aktiv: e.aktiv, eingeschaltet: e.eingeschaltet, abweichend, freigegeben: e.freigabe !== null, grund: e.grund })
  }
  return ergebnis
}

/**
 * Liest die Referenzliste der eingebauten Agents/Plugins bei jedem Aufruf neu (Nachmessen ohne Neustart, Muster F-831).
 * @param quelle - Pfad/URL (Standard EINGEBAUT_REFERENZ_URL)
 * @returns Referenz oder Grund
 */
export function leseEingebautReferenz(quelle: URL | string = EINGEBAUT_REFERENZ_URL): { ok: true; referenz: EingebautReferenz } | { ok: false; grund: string } {
  try {
    const roh: unknown = JSON.parse(readFileSync(quelle, 'utf8'))
    const liste = (w: unknown): w is string[] => Array.isArray(w) && w.every((e) => typeof e === 'string' && NAME_MUSTER.test(e.replace('@', '.')))
    if (!istObjekt(roh) || typeof roh.cli_version !== 'string' || !liste(roh.agents) || !liste(roh.plugins) || !liste(roh.plugin_skills) || roh.agents.length === 0) {
      return { ok: false, grund: 'Referenzliste der eingebauten Einträge hat nicht die Form { cli_version, agents[], plugins[], plugin_skills[] }' }
    }
    return { ok: true, referenz: { cli_version: roh.cli_version, agents: roh.agents, plugins: roh.plugins, plugin_skills: roh.plugin_skills } }
  } catch (fehler) {
    return { ok: false, grund: `Referenzliste der eingebauten Einträge nicht lesbar: ${(fehler as Error).message}` }
  }
}

/**
 * Strenger Frontmatter-Leser (Delta B2): Begrenzer genau '---'; jede Zeile ist '<feld>: <wert>' mit einem Feld der
 * Positivliste (höchstens einmal) oder eine eingerückte bzw. leere Fortsetzung unter description, die nicht wie ein
 * Schlüssel aussieht. Alles andere → nicht schlicht.
 * @param inhalt - Dateiinhalt
 * @param erlaubt - Positivliste der Felder
 * @returns Felder (Wert getrimmt) oder Grund
 */
export function leseFrontmatterStreng(inhalt: string, erlaubt: ReadonlySet<string>): { ok: true; felder: Map<string, string> } | { ok: false; grund: string } {
  const zeilen = inhalt.split(/\r?\n/)
  if (zeilen[0] !== '---') return { ok: false, grund: "Frontmatter beginnt nicht mit einer Zeile '---'" }
  const ende = zeilen.indexOf('---', 1)
  if (ende === -1) return { ok: false, grund: "Frontmatter ohne schließende Zeile '---'" }
  const felder = new Map<string, string>()
  let letztes: string | null = null
  for (const zeile of zeilen.slice(1, ende)) {
    const feld = /^([A-Za-z][A-Za-z0-9_-]*):(?:[ \t]+(.*))?$/.exec(zeile)
    if (feld !== null) {
      if (!erlaubt.has(feld[1])) return { ok: false, grund: `Frontmatter-Feld '${feld[1]}' nicht erlaubt (erlaubt: ${[...erlaubt].join(', ')})` }
      if (felder.has(feld[1])) return { ok: false, grund: `Frontmatter-Feld '${feld[1]}' doppelt` }
      felder.set(feld[1], (feld[2] ?? '').trim())
      letztes = feld[1]
      continue
    }
    const fortsetzung = zeile.trim() === '' || /^[ \t]+\S/.test(zeile)
    if (fortsetzung && letztes === 'description' && !/^[ \t]+[A-Za-z_][\w-]*[ \t]*:([ \t]|$)/.test(zeile)) continue
    return { ok: false, grund: `Frontmatter-Zeile nicht schlicht: '${zeile.slice(0, 40)}'` }
  }
  return { ok: true, felder }
}

/**
 * Code-Review 1 (Delta B3): alle Werte von name-Zeilen im Frontmatter, nachsichtig gelesen (auch mit Anführungszeichen am
 * Schlüssel oder Wert, Einrückung, Kommentar) — die Menge, unter der die CLI die Datei führen könnte. Für Sperrliste und
 * Eindeutigkeit, nie für die Freigabe. Ohne Frontmatter [].
 * @param inhalt - Dateiinhalt
 * @returns Namen (ohne Anführungszeichen), dedupliziert
 */
export function alleFrontmatterNamen(inhalt: string): string[] {
  const zeilen = inhalt.split(/\r?\n/)
  if (zeilen[0]?.trim() !== '---') return []
  const namen = new Set<string>()
  for (const zeile of zeilen.slice(1)) {
    // Delta-Nachpass 3: nur die exakte Zeile beendet das Frontmatter (wie der strenge Leser).
    if (zeile === '---') break
    const t = /^\s*["']?name["']?\s*:\s*(.*)$/.exec(zeile)
    if (t === null) continue
    const wert = t[1].replace(/\s+#.*$/, '').trim().replace(/^(["'])(.*)\1$/, '$2').trim()
    // Delta-Nachpass 1: ein leerer Wert (Name in der Folgezeile, YAML) ist nicht nachvollziehbar → nicht sperrbar (fail-closed).
    namen.add(wert === '' ? '(name ohne Wert in derselben Zeile)' : wert)
  }
  return [...namen]
}

/**
 * Prüft die Frontmatter eines Projekt-Agents bzw. -Skills gegen Positivliste und Wertformen.
 * @param typ - agent oder skill
 * @param inhalt - Inhalt der .md-Datei bzw. SKILL.md
 * @param werkzeugNamen - Werkzeugnamen des Laufs (für agent.tools)
 * @returns { name, beschreibung (F45 F-2a: Wert der description-Zeile) } oder Sperrgrund
 */
function pruefeFrontmatter(typ: ProjektTyp, inhalt: string, werkzeugNamen: readonly string[]): { ok: true; name: string; beschreibung: string } | { ok: false; grund: string } {
  const gelesen = leseFrontmatterStreng(inhalt, typ === 'agent' ? AGENT_FELDER : SKILL_FELDER)
  if (!gelesen.ok) return gelesen
  const f = gelesen.felder
  const name = f.get('name') ?? ''
  if (!NAME_MUSTER.test(name)) return { ok: false, grund: `Frontmatter-name '${name.slice(0, 40)}' nicht schlicht (${NAME_MUSTER})` }
  if ((f.get('description') ?? '') === '') return { ok: false, grund: 'Frontmatter-description fehlt' }
  if (typ === 'agent') {
    const tools = (f.get('tools') ?? '').split(',').map((t) => t.trim())
    if (tools.length === 0 || tools.some((t) => !/^[A-Za-z]+$/.test(t))) return { ok: false, grund: "Frontmatter-tools fehlt oder ist keine Komma-Liste schlichter Namen (Pflicht, z. B. 'Read, Grep, Glob')" }
    const fremd = tools.filter((t) => VERBOTENE_AGENT_WERKZEUGE.has(t) || !werkzeugNamen.includes(t))
    if (fremd.length > 0) return { ok: false, grund: `Frontmatter-tools außerhalb des Werkzeugsatzes: ${fremd.join(', ')}` }
    if (f.has('model') && f.get('model') !== 'inherit') return { ok: false, grund: "Frontmatter-model nur 'inherit' (E-185: das Laufmodell gilt auch für Subagenten)" }
    if (f.has('color') && !/^[a-z]+$/.test(f.get('color') ?? '')) return { ok: false, grund: 'Frontmatter-color nicht schlicht' }
  }
  return { ok: true, name, beschreibung: blockBeschreibung(inhalt, f.get('description') ?? '') }
}

/**
 * F45 F-2a (Render-Nachweis): Anzeige-Text einer description in YAML-Blockform ('description: >' bzw. '|', die
 * Fortsetzungszeilen lässt der strenge Leser als Fortsetzung zu) — die eingerückten Folgezeilen, zu einer Zeile
 * verbunden. Sonst der Wert der Zeile. Nur für die Anzeige, nie für Freigabe oder Sperre.
 * @param inhalt - Dateiinhalt
 * @param wert - Wert der description-Zeile
 * @returns Anzeigetext
 */
function blockBeschreibung(inhalt: string, wert: string): string {
  if (!/^[>|][+-]?$/.test(wert)) return wert
  const zeilen = inhalt.split(/\r?\n/)
  const start = zeilen.findIndex((z, i) => i > 0 && /^description:/.test(z))
  const teile: string[] = []
  for (const zeile of zeilen.slice(start + 1)) {
    if (zeile === '---' || !/^[ \t]/.test(zeile)) break
    teile.push(zeile.trim())
  }
  return teile.join(' ').trim()
}

/**
 * Katalog-Freigaben der internen agent/skill-Einträge: je FREIGEGEBEN-Eintrag mit exaktem herkunft.pfad
 * (.claude/agents/<n>.md bzw. .claude/skills/<n>, Advisor A14) der Hash der Datei der Workforce. Nicht lesbar →
 * kein Eintrag (fail-closed), Meldung auf stderr.
 * @param ressourcen - validierter Katalog
 * @param installWurzel - Installationswurzel
 * @returns Map '<typ>:<name>' → { id, hash }
 */
export function katalogFreigaben(ressourcen: readonly Ressource[], installWurzel: string): Map<string, KatalogFreigabe> {
  const ergebnis = new Map<string, KatalogFreigabe>()
  for (const r of ressourcen) {
    if ((r.typ !== 'agent' && r.typ !== 'skill') || r.freigabe !== 'FREIGEGEBEN') continue
    const pfad = (r.herkunft as { pfad?: unknown }).pfad
    const t = typeof pfad === 'string' ? (r.typ === 'agent' ? /^\.claude\/agents\/([A-Za-z0-9][A-Za-z0-9._-]*)\.md$/ : /^\.claude\/skills\/([A-Za-z0-9][A-Za-z0-9._-]*)$/).exec(pfad) : null
    if (t === null) continue
    try {
      const voll = join(installWurzel, ...(pfad as string).split('/'))
      const hash = r.typ === 'agent' ? createHash('sha256').update(readFileSync(voll)).digest('hex') : berechneInhaltHash(voll)
      ergebnis.set(`${r.typ}:${t[1]}`, { id: r.id, hash })
    } catch (fehler) {
      console.error(`[faehigkeiten] Katalog-Datei von '${r.id}' nicht lesbar — gilt nicht als freigegeben:`, (fehler as Error).message)
    }
  }
  return ergebnis
}

/** Kürzt einen Hash für Gründe (Advisor A16). */
const kurz = (hash: string | undefined | null): string => (typeof hash === 'string' ? `${hash.slice(0, 12)}…` : '—')

/**
 * Liest und bewertet die Projekt-Agents/-Skills eines Ordners (Projektordner für die Anzeige, Arbeitsordner beim
 * Start). Agents: .claude/agents rekursiv, jede .md-Datei; nur direkt unter agents/ und mit Dateistamm = Frontmatter-
 * name freischaltbar. Skills: .claude/skills/<ordner> mit SKILL.md, name = Ordnername. Wirft nie.
 * Sperrgründe: Frontmatter (Positivliste, Advisor A2), Unterordner/Namensabweichung, Name eines eingebauten Eintrags,
 * Hash nicht berechenbar, keine bzw. abweichende Freigabe. hindernis (Lauf startet nicht, nur relevant mit ≥1 aktivem
 * Eintrag der Art): Verknüpfung unter .claude/agents|skills, mehrdeutiger aktiver Name (Advisor A3), nicht sperrbarer
 * Agent-Name (Delta B3), Commands nicht lesbar.
 * @param wurzel - Ordner mit .claude/
 * @param kontext - Katalog-Freigaben, Einstellungen des Projekts, Werkzeugnamen des Laufs, Referenzliste
 * @returns Einträge, alle Agent-Namen, hindernis
 */
export function ermittleProjektFaehigkeiten(wurzel: string, kontext: ProjektFaehigkeitenKontext): ProjektFaehigkeitenErgebnis {
  const eintraege: ProjektFaehigkeit[] = []
  const verknuepfungen: string[] = []
  const nichtSperrbar: string[] = []
  // Namen je Datei bzw. Ordner (klein geschrieben) — für die Eindeutigkeit.
  const agentNamenJeDatei: { pfad: string; namen: Set<string> }[] = []
  const skillNamenJeOrdner: { pfad: string; namen: Set<string> }[] = []
  const agentNamen = new Set<string>()
  const claude = join(wurzel, '.claude')
  const eingebauteSkills = new Set([...EINGEBAUTE_SKILLS_S7, ...EINGEBAUT_REST_SKILLS, ...kontext.referenz.plugin_skills].map((n) => n.toLowerCase()))
  const eingebauteAgents = new Set(kontext.referenz.agents.map((n) => n.toLowerCase()))

  const bewerte = (typ: ProjektTyp, name: string, pfad: string, hash: string | null, sperre: string | null, beschreibung: string | null): void => {
    const schluessel = `${typ}:${name}`
    const katalog = kontext.katalog.get(schluessel)
    const projekt = kontext.einstellungen.inhalt_freigaben[schluessel]
    let freigabe: ProjektFaehigkeit['freigabe'] = null
    let freigabeGrund: string | null = null
    if (hash !== null && katalog !== undefined && hash === katalog.hash) freigabe = 'katalog'
    else if (hash !== null && projekt !== undefined && hash === projekt) freigabe = 'projekt'
    else if (katalog !== undefined || projekt !== undefined) {
      freigabeGrund = `Inhalt weicht von der Freigabe ab (Datei ${kurz(hash)}${katalog !== undefined ? `, Katalog ${kurz(katalog.hash)}` : ''}${projekt !== undefined ? `, Projekt-Freigabe ${kurz(projekt)}` : ''})`
    } else freigabeGrund = 'keine Freigabe (weder Katalogeintrag noch Projekt-Freigabe nach Inhalt)'
    const eingeschaltet = kontext.einstellungen.an.includes(schluessel)
    const aktiv = eingeschaltet && sperre === null && freigabe !== null
    const grund = aktiv ? null : (sperre ?? freigabeGrund ?? 'nicht eingeschaltet (Opt-in je Projekt, E-F45-6)')
    eintraege.push({ schluessel, typ, name, pfad, hash, freigabe, katalog_hash: katalog?.hash ?? null, eingeschaltet, aktiv, grund, beschreibung })
  }

  // Agents (rekursiv). Code-Review 1: Namen zusätzlich nachsichtig lesen (alleFrontmatterNamen) — auch eine Datei, die
  // die strenge Prüfung verwirft, führt die CLI unter ihrem name; der Name muss in Sperrliste und Eindeutigkeit landen.
  const geheAgents = (absolut: string, relativ: string): void => {
    let liste: string[]
    try {
      liste = readdirSync(absolut).sort()
    } catch (fehler) {
      verknuepfungen.push(`${relativ} (nicht lesbar: ${(fehler as Error).message})`)
      return
    }
    for (const n of liste) {
      const voll = join(absolut, n)
      const rel = `${relativ}/${n}`
      let info: ReturnType<typeof lstatSync>
      try {
        info = lstatSync(voll)
      } catch (fehler) {
        verknuepfungen.push(`${rel} (nicht lesbar: ${(fehler as Error).message})`)
        continue
      }
      if (info.isSymbolicLink()) verknuepfungen.push(rel)
      else if (info.isDirectory()) geheAgents(voll, rel)
      else if (info.isFile() && n.toLowerCase().endsWith('.md')) {
        const stamm = n.slice(0, -3)
        let hash: string | null = null
        let sperre: string | null = null
        let fmName: string | null = null
        let beschreibung: string | null = null
        let lose: string[] = []
        try {
          const bytes = readFileSync(voll)
          hash = createHash('sha256').update(bytes).digest('hex')
          const text = bytes.toString('utf8')
          lose = alleFrontmatterNamen(text)
          const fm = pruefeFrontmatter('agent', text, kontext.werkzeugNamen)
          if (fm.ok) {
            fmName = fm.name
            beschreibung = fm.beschreibung
          } else sperre = fm.grund
        } catch (fehler) {
          sperre = `Datei nicht lesbar (${(fehler as Error).message})`
        }
        const alle = [...new Set([stamm, ...lose])]
        agentNamenJeDatei.push({ pfad: rel, namen: new Set(alle.map((x) => x.toLowerCase())) })
        for (const x of alle) {
          agentNamen.add(x)
          if (!NAME_MUSTER.test(x)) nichtSperrbar.push(`${rel} ('${x.slice(0, 40)}')`)
        }
        if (sperre === null && relativ !== 'agents') sperre = 'liegt in einem Unterordner von .claude/agents'
        if (sperre === null && fmName !== stamm) sperre = `Frontmatter-name '${fmName}' ≠ Dateiname '${stamm}'`
        if (sperre === null && eingebauteAgents.has(stamm.toLowerCase())) sperre = 'Name eines eingebauten Agents'
        bewerte('agent', NAME_MUSTER.test(stamm) ? stamm : `(nicht sperrbar) ${stamm.slice(0, 40)}`, rel, hash, sperre, beschreibung)
      }
    }
  }
  // Code-Review 5: ein .claude/agents bzw. .claude/skills, das selbst eine Verknüpfung ist, ist ein Hindernis.
  const istVerknuepft = (pfad: string): boolean => {
    try {
      return lstatSync(pfad).isSymbolicLink()
    } catch {
      return false
    }
  }
  const agentsOrdner = join(claude, 'agents')
  if (istVerknuepft(agentsOrdner)) verknuepfungen.push('agents')
  else if (existsSync(agentsOrdner)) geheAgents(agentsOrdner, 'agents')

  // Skills (eine Ebene Ordner, Inhalt rekursiv über berechneInhaltHash; Verknüpfungen irgendwo darunter = hindernis).
  const sucheVerknuepfungen = (absolut: string, relativ: string): void => {
    for (const n of readdirSync(absolut)) {
      const voll = join(absolut, n)
      const info = lstatSync(voll)
      if (info.isSymbolicLink()) verknuepfungen.push(`${relativ}/${n}`)
      else if (info.isDirectory()) sucheVerknuepfungen(voll, `${relativ}/${n}`)
    }
  }
  const skills = join(claude, 'skills')
  if (istVerknuepft(skills)) verknuepfungen.push('skills')
  else if (existsSync(skills)) {
    try {
      sucheVerknuepfungen(skills, 'skills')
      for (const ordner of readdirSync(skills).sort()) {
        const voll = join(skills, ordner)
        const info = lstatSync(voll)
        if (!info.isDirectory() || !existsSync(join(voll, 'SKILL.md'))) continue
        const rel = `skills/${ordner}`
        let hash: string | null = null
        let sperre: string | null = null
        let fmName: string | null = null
        let beschreibung: string | null = null
        let lose: string[] = []
        try {
          const text = readFileSync(join(voll, 'SKILL.md'), 'utf8')
          lose = alleFrontmatterNamen(text)
          const fm = pruefeFrontmatter('skill', text, kontext.werkzeugNamen)
          if (fm.ok) {
            fmName = fm.name
            beschreibung = fm.beschreibung
          } else sperre = fm.grund
          hash = berechneInhaltHash(voll)
        } catch (fehler) {
          sperre = `Skill-Ordner nicht prüfbar (${(fehler as Error).message})`
        }
        skillNamenJeOrdner.push({ pfad: rel, namen: new Set([ordner, ...lose].map((x) => x.toLowerCase())) })
        if (sperre === null && !NAME_MUSTER.test(ordner)) sperre = `Ordnername '${ordner}' nicht schlicht`
        if (sperre === null && fmName !== ordner) sperre = `Frontmatter-name '${fmName}' ≠ Ordnername '${ordner}'`
        if (sperre === null && eingebauteSkills.has(ordner.toLowerCase())) sperre = 'Name eines eingebauten Skills'
        bewerte('skill', ordner, rel, hash, sperre, beschreibung)
      }
    } catch (fehler) {
      verknuepfungen.push(`skills (nicht lesbar: ${(fehler as Error).message})`)
    }
  }

  // QA 1: eingeschaltet, aber im Ordner nicht vorhanden — sichtbar als nicht aktiver Eintrag (der Start lehnt dann ab).
  for (const schluessel of kontext.einstellungen.an) {
    const teile = zerlegeSchluessel(schluessel)
    if (teile === null || eintraege.some((e) => e.schluessel === schluessel)) continue
    eintraege.push({ schluessel, typ: teile.typ, name: teile.name, pfad: '', hash: null, freigabe: null, katalog_hash: kontext.katalog.get(schluessel)?.hash ?? null, eingeschaltet: true, aktiv: false, grund: 'eingeschaltet, aber im Ordner nicht vorhanden', beschreibung: null })
  }

  // Hindernisse nur für die Art, von der ≥1 Eintrag aktiv ist.
  const hindernisse: string[] = []
  const aktiveAgents = eintraege.filter((e) => e.aktiv && e.typ === 'agent')
  const aktiveSkills = eintraege.filter((e) => e.aktiv && e.typ === 'skill')
  if ((aktiveAgents.length > 0 || aktiveSkills.length > 0) && verknuepfungen.length > 0) hindernisse.push(`Verknüpfung unter .claude/agents|skills: ${verknuepfungen.join(', ')}`)
  if (aktiveAgents.length > 0 && nichtSperrbar.length > 0) hindernisse.push(`Agent-Name nicht sperrbar: ${nichtSperrbar.join(', ')}`)
  for (const e of aktiveAgents) {
    const treffer = agentNamenJeDatei.filter((d) => d.namen.has(e.name.toLowerCase()))
    if (treffer.length > 1) hindernisse.push(`Agent-Name '${e.name}' mehrdeutig (${treffer.map((d) => d.pfad).join(', ')})`)
  }
  if (aktiveSkills.length > 0) {
    const commands = leseProjektCommandNamen(wurzel)
    if (!commands.ok) hindernisse.push(commands.grund)
    const commandNamen = commands.ok ? commands.namen.map((n) => n.toLowerCase()) : []
    for (const e of aktiveSkills) {
      const ordner = skillNamenJeOrdner.filter((d) => d.namen.has(e.name.toLowerCase()))
      const cmd = commandNamen.filter((n) => n === e.name.toLowerCase())
      if (ordner.length + cmd.length > 1) hindernisse.push(`Skill-Name '${e.name}' mehrdeutig (${[...ordner.map((d) => d.pfad), ...cmd.map(() => 'commands')].join(', ')})`)
    }
  }
  return { eintraege, agentNamen: [...agentNamen].sort(), hindernis: hindernisse.length > 0 ? hindernisse.join('; ') : null }
}

/**
 * Advisor A6: vergleicht die beim Start eingefrorenen Hashes der aktiven Projekt-Einträge mit der Momentaufnahme
 * von .claude/ direkt vor dem Spawn (erfasseClaudeOrdner: relativer Pfad → sha256 der Bytes). Skill-Hash wird aus den
 * Dateien unter skills/<name>/ in der Form von berechneInhaltHash nachgerechnet. Rein.
 * @param eintraege - eingefrorene Einträge (nur quelle 'projekt' und aktiv werden geprüft)
 * @param momentaufnahme - erfasseClaudeOrdner, oder null (nicht lesbar)
 * @returns null bei Gleichheit, sonst Grund
 */
export function pruefeGegenMomentaufnahme(eintraege: readonly { quelle: string; aktiv: boolean; typ: string; name: string; pfad?: string; hash?: string }[], momentaufnahme: ReadonlyMap<string, string> | null): string | null {
  const zuPruefen = eintraege.filter((e) => e.quelle === 'projekt' && e.aktiv)
  if (zuPruefen.length === 0) return null
  if (momentaufnahme === null) return 'Projekt-Fähigkeiten: .claude-Ordner vor dem Start nicht lesbar — Lauf startet nicht'
  const abweichend: string[] = []
  for (const e of zuPruefen) {
    let ist: string | undefined
    if (e.typ === 'agent') ist = e.pfad !== undefined ? momentaufnahme.get(e.pfad) : undefined
    else {
      const praefix = `${e.pfad}/`
      const dateien = [...momentaufnahme.keys()].filter((p) => p.startsWith(praefix)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
      const gesamt = createHash('sha256')
      for (const p of dateien) gesamt.update(`${p.slice(praefix.length)}\0${momentaufnahme.get(p)}\n`, 'utf8')
      ist = dateien.length > 0 ? gesamt.digest('hex') : undefined
    }
    if (ist !== e.hash) abweichend.push(`${e.typ}:${e.name}`)
  }
  return abweichend.length === 0 ? null : `Projekt-Fähigkeiten zwischen Prüfung und Start verändert: ${abweichend.join(', ')} — Lauf startet nicht`
}
