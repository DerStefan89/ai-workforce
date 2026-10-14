/**
 * Datei: src/faehigkeiten/start.ts
 *
 * Zweck: Start-Bausteine eines Laufs mit Fähigkeiten (F45 F-1) — aktive Projekt-Agents/-Skills (Opt-in, nach Inhalt
 * freigegeben, src/faehigkeiten/index.ts) und/oder Ort-B-Skills (baueOrtBSkillStart, unverändert). Liefert, was
 * loeseAusfuehrungsEingabenAuf in AufrufEingaben übersetzt, und die Erwartung des Init-Gates:
 * - Agents (Spike state/spike-f45-f1-agents.md: --allowedTools Agent(<name>) begrenzt nicht → Sperrliste):
 *   Agent(<aktiv>) in erlaubte_werkzeuge (→ --tools …,Agent; --allowedTools …,Agent(<aktiv>) als Absichtserklärung),
 *   --disallowedTools Agent(<n>) für jeden eingebauten (Referenzliste) und jeden nicht aktiven Projekt-Agent;
 * - Skills: Skill(<aktiv>) in erlaubte_werkzeuge, aktive nicht in skillOverrides off / Skill(…)-Sperre (Spike S4);
 * - F45 F-3b-2: Plugin-Lauf-Kopien (plugins, aus src/plugin-lauf): Skill(<name>:<s>)/Agent(<name>:<a>) erlaubt, eingebaute
 *   Agents gesperrt wie bei Projekt-Agents, enabledPlugins["<name>@inline"] = true, Init-Gate mit Präfixnamen und plugins-Soll;
 * - immer: --settings mit disableBundledSkills, enabledPlugins der eingebauten Plugins auf false (Spike S3) und
 *   skillOverrides off für design/doctor und jeden nicht aktiven Projekt-Skill/-Command; Write/Edit(**\/.claude/**);
 *   Vorstart-Scan (ohne Ort-B hier, mit Ort-B in baueOrtBSkillStart).
 *
 * Wird aufgerufen von:
 * - scripts/leitstand-server.mjs (loeseAusfuehrungsEingabenAuf)
 * - src/faehigkeiten/faehigkeiten.test.ts, scripts/check-f45-f1-faehigkeiten.mjs
 *
 * Wichtig: Ohne aktiven Projekt-Eintrag, ohne Ort-B-Skill und ohne Plugin-Lauf-Kopie ruft niemand diese Funktion — das Argv
 * bleibt bitgleich.
 * Sperrliste und Gate-Erwartung kommen aus derselben Liste (Delta B3); eine Abweichung zwischen beiden wäre eine Lücke.
 */

import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { CLAUDE_ORDNER_SPERREN, EINGEBAUT_REST_SKILLS, INSTALLATIONS_SKELETT_CLAUDE, istInstallationSelbst, leseProjektSkillNamen, type OrtBSkillStart, scanneVerschachtelteClaudeOrdner } from '../ressourcen/ort-b-start.ts'
import { berechneInhaltHash, leseFrontmatter } from '../ressourcen/skill-dateien.ts'
import type { EingebautReferenz, ProjektFaehigkeit } from './types.ts'

/** Eingabe von baueFaehigkeitenStart. */
export interface FaehigkeitenStartEingabe {
  /** bewertete Projekt-Einträge des Arbeitsordners (alle, aktiv oder nicht) */
  projekt: readonly ProjektFaehigkeit[]
  /** alle Agent-Namen im Arbeitsordner (Dateistamm und Frontmatter-name) */
  agentNamen: readonly string[]
  /** Arbeitsordner (cwd des Laufs) */
  projektWurzel: string
  referenz: EingebautReferenz
  /** Ergebnis von baueOrtBSkillStart, wenn Ort-B-Skills im Lauf sind */
  ortB?: OrtBSkillStart
  /** Projektordner und Installation — nur bei gleichem realpath gilt die Skelett-Ausnahme (F-818) */
  installation?: { projektOrdner?: string; installWurzel?: string }
  /** F45 F-3b-2: Plugin-Lauf-Kopien des Laufs (Manifest-name = Präfix, zugeordnete Skills/Agents); fehlt bzw. leer = wie vorher */
  plugins?: readonly PluginImLaufStart[]
}

/** F45 F-3b-2: eine Lauf-Kopie aus Sicht des Starts (nur Namen; Ordner und Hashes hält der Server). */
export interface PluginImLaufStart {
  name: string
  skills: readonly string[]
  agents: readonly string[]
}

/** Ergebnis von baueFaehigkeitenStart. */
export interface FaehigkeitenStart {
  /** zusätzliche Einträge für erlaubte_werkzeuge (Agent(<n>), Skill(<n>)) */
  werkzeugZusatz: string[]
  /** Einträge für --disallowedTools (ohne Bash(git:*), das hängt baueAufruf an) */
  disallowedTools: string[]
  /** Wert für --settings (JSON) */
  settings: string
  /** --add-dir (nur Ort-B) */
  addDirs: string[]
  /** Erwartung des Init-Gates */
  initGate: { skills: string[]; gesperrt: string[]; agents?: { erlaubt: string[]; gesperrt: string[] }; pflichtSkills?: string[]; plugins?: string[] }
  /** Zeile für den Auftragstext, null ohne aktive Projekt-Einträge */
  instruktion: string | null
}

/**
 * Agents des Installations-Skeletts (vorlagen/projekt-skelett/.claude/agents, eine Ebene): Namen und Hash — nur, wenn
 * der Projektordner die Installation selbst ist (Advisor A13).
 * @param projektWurzel - Arbeitsordner
 * @returns Name → sha256 (Dateistamm und Frontmatter-name zeigen auf denselben Hash)
 */
function leseSkelettAgents(projektWurzel: string): Map<string, string> {
  const ordner = join(projektWurzel, INSTALLATIONS_SKELETT_CLAUDE, 'agents')
  const namen = new Map<string, string>()
  if (!existsSync(ordner)) return namen
  for (const datei of readdirSync(ordner)) {
    if (!datei.toLowerCase().endsWith('.md')) continue
    const bytes = readFileSync(join(ordner, datei))
    const hash = createHash('sha256').update(bytes).digest('hex')
    namen.set(datei.slice(0, -3), hash)
    const { name } = leseFrontmatter(bytes.toString('utf8'))
    if (name !== null) namen.set(name, hash)
  }
  return namen
}

/**
 * true, wenn im Skelett der Installation ein Skill-Ordner gleichen Namens mit genau diesem inhalt_hash liegt.
 * @param projektWurzel - Arbeitsordner (= Installation)
 * @param name - Skill-Name
 * @param hash - inhalt_hash des aktiven Projekt-Skills
 * @returns gleich oder nicht (nicht lesbar = nicht gleich)
 */
function gleicherSkelettSkill(projektWurzel: string, name: string, hash: string | null): boolean {
  try {
    const ordner = join(projektWurzel, INSTALLATIONS_SKELETT_CLAUDE, 'skills', name)
    return hash !== null && existsSync(join(ordner, 'SKILL.md')) && berechneInhaltHash(ordner) === hash
  } catch {
    return false
  }
}

/**
 * Baut die Start-Bausteine (Details im Dateikopf). Fail-closed: jeder Fehler → { ok: false, grund }, der Lauf startet nicht.
 * @param e - Eingabe
 * @returns { ok: true, start } oder { ok: false, grund }
 */
export function baueFaehigkeitenStart(e: FaehigkeitenStartEingabe): { ok: true; start: FaehigkeitenStart } | { ok: false; grund: string } {
  const nein = (grund: string): { ok: false; grund: string } => ({ ok: false, grund: `Fähigkeiten-Start abgelehnt: ${grund}` })
  const aktiveAgents = e.projekt.filter((p) => p.aktiv && p.typ === 'agent').map((p) => p.name)
  const aktiveSkills = e.projekt.filter((p) => p.aktiv && p.typ === 'skill').map((p) => p.name)
  const istAktiverSkill = (n: string): boolean => aktiveSkills.includes(n)
  const installationSelbst = istInstallationSelbst(e.installation?.projektOrdner ?? e.projektWurzel, e.installation?.installWurzel)

  // Code-Review 3: ist der Projektordner die Installation, darf kein aktiver Projekt-Skill einen Skelett-Namen tragen —
  // in beiden Zweigen (mit und ohne Ort-B), sonst würde der gleichnamige, nicht gehashte Skelett-Skill mit freigeschaltet.
  const skelett = installationSelbst ? leseProjektSkillNamen(join(e.projektWurzel, dirname(INSTALLATIONS_SKELETT_CLAUDE))) : { ok: true as const, namen: [] }
  if (!skelett.ok) return nein(`Skelett der Installation: ${skelett.grund}`)
  const skelettNamen = new Set(skelett.namen)
  // Gleicher Name im Skelett ist nur zulässig, wenn dort ein Skill-Ordner mit gleichem Inhalt liegt (Muster Skelett-Agents).
  const mehrdeutig = aktiveSkills.filter((n) => skelettNamen.has(n) && !gleicherSkelettSkill(e.projektWurzel, n, e.projekt.find((p) => p.typ === 'skill' && p.name === n)?.hash ?? null))
  if (mehrdeutig.length > 0) return nein(`Skill-Name(n) ${mehrdeutig.join(', ')} auch im Skelett der Installation mit anderem Inhalt oder als Command — mehrdeutig`)
  let settings: Record<string, unknown>
  let disallowed: string[]
  let gesperrt: string[]
  let addDirs: string[] = []
  let gateSkills: string[]
  try {
    if (e.ortB !== undefined) {
      // Ort-B-Prüfungen sind gelaufen (unverändert) — nur aktive Projekt-Skills aus der Sperre nehmen.
      settings = JSON.parse(e.ortB.settings) as Record<string, unknown>
      const overrides = { ...(settings.skillOverrides as Record<string, string> | undefined) }
      for (const n of aktiveSkills) delete overrides[n]
      settings = { ...settings, skillOverrides: overrides }
      disallowed = e.ortB.disallowedTools.filter((r) => !aktiveSkills.some((n) => r === `Skill(${n})`))
      gesperrt = e.ortB.gesperrteNamen.filter((n) => !istAktiverSkill(n))
      addDirs = [...e.ortB.addDirs]
      gateSkills = [...e.ortB.skillNamen, ...aktiveSkills]
    } else {
      const projekt = leseProjektSkillNamen(e.projektWurzel)
      if (!projekt.ok) return nein(projekt.grund)
      const scan = scanneVerschachtelteClaudeOrdner(e.projektWurzel, installationSelbst ? [INSTALLATIONS_SKELETT_CLAUDE] : [])
      if (scan.length > 0) return nein(`verschachtelte .claude-Ordner unterhalb der Projektwurzel: ${scan.join(', ')} — erst entfernen (F-791 (2))`)
      // Skelett-Skills bleiben immer gesperrt — eingeschaltet wird nur ein Skill des Arbeitsordners selbst.
      const namen = [...new Set([...projekt.namen, ...skelett.namen])].filter((n) => !EINGEBAUT_REST_SKILLS.includes(n) && !istAktiverSkill(n))
      gesperrt = [...EINGEBAUT_REST_SKILLS, ...namen.sort()]
      disallowed = [...CLAUDE_ORDNER_SPERREN, ...gesperrt.map((n) => `Skill(${n})`)]
      settings = { disableBundledSkills: true, skillOverrides: Object.fromEntries(gesperrt.map((n) => [n, 'off'])) }
      gateSkills = [...aktiveSkills]
    }
  } catch (fehler) {
    return nein(`Projekt-Skills nicht prüfbar (${(fehler as Error).message})`)
  }
  // F45 F-3b-2: Lauf-Kopien laden per enabledPlugins["<name>@inline"] = true (Spike f3b2 S5), die eingebauten bleiben false.
  const plugins = e.plugins ?? []
  const pluginSkills = plugins.flatMap((p) => p.skills.map((s) => `${p.name}:${s}`))
  const pluginAgents = plugins.flatMap((p) => p.agents.map((a) => `${p.name}:${a}`))
  // Advisor A13: ein gesperrter Projekt-Name im Namensraum eines Plugins (Command 'kraft:x') schaltete dessen Skill per skillOverrides ab.
  const kollision = gesperrt.filter((n) => plugins.some((p) => n.startsWith(`${p.name}:`)))
  if (kollision.length > 0) return nein(`Projekt-Name(n) ${kollision.join(', ')} im Namensraum eines zugeordneten Plugins — mehrdeutig`)
  settings = { ...settings, enabledPlugins: { ...Object.fromEntries(e.referenz.plugins.map((p) => [p, false])), ...Object.fromEntries(plugins.map((p) => [`${p.name}@inline`, true])) } }

  const werkzeugZusatz = [...aktiveSkills, ...pluginSkills].map((n) => `Skill(${n})`)
  let agents: FaehigkeitenStart['initGate']['agents']
  if (aktiveAgents.length > 0 || pluginAgents.length > 0) {
    let skelettAgents = new Map<string, string>()
    try {
      if (installationSelbst) skelettAgents = leseSkelettAgents(e.projektWurzel)
    } catch (fehler) {
      return nein(`Skelett-Agents nicht lesbar (${(fehler as Error).message})`)
    }
    for (const n of aktiveAgents) {
      const skelettHash = skelettAgents.get(n)
      const eigenerHash = e.projekt.find((p) => p.typ === 'agent' && p.name === n)?.hash
      if (skelettHash !== undefined && skelettHash !== eigenerHash) return nein(`Agent '${n}' im Skelett der Installation mit anderem Inhalt — mehrdeutig`)
    }
    const agentGesperrt = [...new Set([...e.referenz.agents, ...e.agentNamen, ...skelettAgents.keys()])].filter((n) => !aktiveAgents.includes(n)).sort()
    werkzeugZusatz.unshift(...[...aktiveAgents, ...pluginAgents].map((n) => `Agent(${n})`))
    disallowed = [...disallowed, ...agentGesperrt.map((n) => `Agent(${n})`)]
    agents = { erlaubt: [...aktiveAgents, ...pluginAgents], gesperrt: agentGesperrt }
  }

  const teile: string[] = []
  if (aktiveAgents.length > 0) teile.push(`Subagenten ${aktiveAgents.join(', ')} — nur im Vordergrund aufrufen (Agent-Werkzeug mit run_in_background: false), keine anderen Subagenten`)
  if (aktiveSkills.length > 0) teile.push(`Skills ${aktiveSkills.join(', ')} (Skill-Werkzeug)`)
  const zeilen = teile.length > 0 ? [`Projekt-Fähigkeiten in diesem Lauf (von Stefan je Projekt eingeschaltet): ${teile.join('; ')}.`] : []
  // F45 F-3b-2 (E-F3b-1 = A): die Instruktion nennt die zugeordneten Plugin-Teile mit Präfix — statt eines SessionStart-Hooks.
  const pluginTeile: string[] = []
  if (pluginSkills.length > 0) pluginTeile.push(`Skills ${pluginSkills.join(', ')} (Skill-Werkzeug)`)
  if (pluginAgents.length > 0) pluginTeile.push(`Subagenten ${pluginAgents.join(', ')} — nur im Vordergrund aufrufen (Agent-Werkzeug mit run_in_background: false)`)
  if (pluginTeile.length > 0) zeilen.push(`Plugin-Fähigkeiten in diesem Lauf (von Stefan der Ausführung zugeordnet): ${pluginTeile.join('; ')}.`)
  const instruktion = zeilen.length > 0 ? zeilen.join('\n') : null

  return {
    ok: true,
    start: {
      werkzeugZusatz,
      disallowedTools: disallowed,
      settings: JSON.stringify(settings),
      addDirs,
      // QA 4: aktive Projekt-Skills müssen im init geladen sein (pflichtSkills), aktive Agents über agents.erlaubt.
      // F45 F-3b-2: Plugin-Skills mit Präfix gehören zum Soll (init.skills und init.slash_commands) und müssen geladen sein.
      initGate: {
        skills: [...gateSkills, ...pluginSkills],
        gesperrt,
        ...(agents !== undefined ? { agents } : {}),
        ...(aktiveSkills.length + pluginSkills.length > 0 ? { pflichtSkills: [...aktiveSkills, ...pluginSkills] } : {}),
        ...(plugins.length > 0 ? { plugins: plugins.map((p) => `${p.name}@inline`) } : {}),
      },
      instruktion,
    },
  }
}
