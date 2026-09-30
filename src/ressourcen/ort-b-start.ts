/**
 * Datei: src/ressourcen/ort-b-start.ts
 *
 * Zweck: F36 WS-5b — Start einer `ausfuehrung` mit freigegebenen Ort-B-Skills (E-F36-8 = B, V4a aus
 * Spike S7, `state/spike-f36-ws2s.md`). baueOrtBSkillStart prüft vor dem Spawn fail-closed und liefert
 * die Bausteine, die baueAufruf in Tokens übersetzt (AufrufEingaben.ortB, disallowedTools):
 * - je Skill: installation (extern, skill, FREIGEGEBEN) mit Layout <cap>/<id>/.claude/skills/<name>
 *   (nichts sonst im cap-Ordner), SKILL.md-name = Ordnername, inhalt_hash neu berechnet = gespeichert;
 * - keine Namenskollision Ort-B ↔ eingebaut ↔ Projekt-Skill (Frontmatter-name UND Ordnername unter
 *   <projekt>/.claude/skills) ↔ anderer Ort-B-Skill;
 * - Vorstart-Scan: kein weiteres .claude/skills|agents|commands unterhalb der Projektwurzel außer dem
 *   der Wurzel (ohne .git, Junctions/Symlinks werden nicht verfolgt, node_modules zählt mit; ein
 *   verschachteltes .claude als Verknüpfung zählt als Treffer);
 * - Ergebnis: --add-dir <cap>/<id> je Skill, --disallowedTools Write/Edit(<cap>/<id>/**) in der
 *   S4b-Form (C:/…, nicht //C:/…), Write/Edit(**\/.claude/**), Skill(design), Skill(doctor),
 *   Skill(<Projekt-Skill>); --settings { disableBundledSkills, skillOverrides design/doctor/Projekt off }.
 * Agent bleibt draußen (kein 'Agent' in --tools, kein --agents), kein enabledPlugins (Zuschnitt WS-5b).
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs (loeseAusfuehrungsEingabenAuf, nur 'ausfuehrung'
 * mit schreibendem Werkzeugsatz und ≥1 übergebenem Ort-B-Skill), src/ressourcen/ort-b-start.test.ts,
 * scripts/check-f36-ws5b-skill.mjs, features/F36/nachweis-ws5b/ (echter CLI-Lauf).
 *
 * Wichtig: Ohne übergebenen Ort-B-Skill ruft niemand diese Funktion — der Start bleibt bitgenau wie
 * vor WS-5b. Die Sperrnamen design/doctor sind die Reste nach disableBundledSkills (S7, CLI 2.1.284);
 * eine neue eingebaute Fähigkeit fängt nicht diese Liste, sondern das Init-Gate im Datenstrom.
 */

import { type Dirent, existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { berechneInhaltHash, EINGEBAUTE_SKILLS_S7, expandiereHome, leseFrontmatter, listeSkillDateien, pruefeSkillDateiNamen, SKILL_NAME_MUSTER } from './skill-dateien.ts'
import type { Ressource } from './types.ts'

/** Eingebaute Skills, die disableBundledSkills nicht entfernt (S7) — skillOverrides off + Skill(…)-Sperre. */
export const EINGEBAUT_REST_SKILLS: readonly string[] = ['design', 'doctor']

/** Schreibsperre für jedes .claude unterhalb der Arbeitsverzeichnisse (F-791 (4), keine Selbstanlage). */
export const CLAUDE_ORDNER_SPERREN: readonly string[] = ['Write(**/.claude/**)', 'Edit(**/.claude/**)']

/** Namen, die als Skill(<name>)/skillOverrides-Schlüssel ohne Brechen der Regelsyntax taugen. */
const SPERRBARER_NAME = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/

/** Unterordner eines .claude, die der Vorstart-Scan unterhalb der Wurzel nicht duldet. */
const VERBOTENE_UNTERORDNER = new Set(['skills', 'agents', 'commands'])

/** Bausteine für baueAufruf (AufrufEingaben.ortB + disallowedTools) und für das Init-Gate. */
export interface OrtBSkillStart {
  /** --add-dir je Skill: <cap>/<id> (Windows-Pfad wie installiert). */
  addDirs: string[]
  /** Einträge für --disallowedTools (ohne Bash(git:*), das hängt baueAufruf an). */
  disallowedTools: string[]
  /** Wert für --settings (JSON). */
  settings: string
  /** Frontmatter-namen der übergebenen Ort-B-Skills — die einzige zulässige Menge in init.skills. */
  skillNamen: string[]
  /** Namen der Projekt-Skills (gesperrt), sortiert. */
  projektSkillNamen: string[]
  /** Alle gesperrten Namen (Skill(…)/skillOverrides off: Rest-Skills + Projekt-Skills/-Commands) — F-831: im Init-Gate in init.slash_commands zulässig. */
  gesperrteNamen: string[]
}

/** Pfad in einer Sperrregel: nur Zeichen, die die Regelsyntax von --disallowedTools nicht brechen (kein Leerzeichen, Komma, Klammer, *). */
const SICHERER_REGELPFAD = /^(?:[A-Za-z]:)?\/[A-Za-z0-9._~/-]+$/

/**
 * Einträge eines Ordners (nur Namen), sortiert; [] wenn er fehlt. Wirft bei anderem Lesefehler.
 * @param ordner - absoluter Pfad
 * @returns Namen
 */
function namenIn(ordner: string): string[] {
  if (!existsSync(ordner)) return []
  return readdirSync(ordner).sort()
}

/**
 * Namen der Projekt-Skills und -Commands, die gesperrt werden:
 * - <projekt>/.claude/skills: Ordnername UND (falls lesbar) Frontmatter-name der SKILL.md;
 * - <projekt>/.claude/commands (rekursiv, jede .md-Datei; Reviewer-Befund, real gemessen CLI 2.1.284: Commands stehen NICHT in
 *   init.skills, sind aber über das Skill-Werkzeug aufrufbar): Dateiname ohne .md, Unterordner als
 *   Namensraum mit ':' (sub/tief.md → sub:tief), dazu ein Frontmatter-name.
 * `skillOverrides`/`Skill(…)` greifen nach dem Namen, unter dem die CLI den Eintrag führt. Eine
 * Verknüpfung unter .claude/commands wird nicht verfolgt, sondern abgelehnt (fail-closed).
 * @param projektWurzel - Projekt-Repo-Wurzel
 * @returns { ok, namen } sortiert/dedupliziert, oder Grund bei einem nicht sperrbaren Namen
 */
export function leseProjektSkillNamen(projektWurzel: string): { ok: true; namen: string[] } | { ok: false; grund: string } {
  const skillsOrdner = join(projektWurzel, '.claude', 'skills')
  const namen = new Set<string>()
  // try: ein nicht lesbares SKILL.md (oder .claude/skills als Datei) ist ein sauberer Ablehnungsgrund, kein Wurf.
  try {
    for (const eintrag of namenIn(skillsOrdner)) {
      namen.add(eintrag)
      const skillMd = join(skillsOrdner, eintrag, 'SKILL.md')
      if (existsSync(skillMd)) {
        const { name } = leseFrontmatter(readFileSync(skillMd, 'utf8'))
        if (name !== null) namen.add(name)
      }
    }
  } catch (fehler) {
    return { ok: false, grund: `Projekt-Skills unter '${skillsOrdner}' nicht lesbar (${(fehler as Error).message}) — Lauf startet nicht` }
  }
  const commandsOrdner = join(projektWurzel, '.claude', 'commands')
  const verknuepfungen: string[] = []
  const gehe = (absolut: string, namensraum: string[]): void => {
    for (const eintrag of namenIn(absolut)) {
      const voll = join(absolut, eintrag)
      const info = lstatSync(voll)
      if (info.isSymbolicLink()) verknuepfungen.push([...namensraum, eintrag].join('/'))
      else if (info.isDirectory()) gehe(voll, [...namensraum, eintrag])
      else if (info.isFile() && eintrag.toLowerCase().endsWith('.md')) {
        namen.add([...namensraum, eintrag.slice(0, -3)].join(':'))
        const { name } = leseFrontmatter(readFileSync(voll, 'utf8'))
        if (name !== null) namen.add(name)
      }
    }
  }
  try {
    gehe(commandsOrdner, [])
  } catch (fehler) {
    return { ok: false, grund: `Projekt-Commands unter '${commandsOrdner}' nicht lesbar (${(fehler as Error).message}) — Lauf startet nicht` }
  }
  if (verknuepfungen.length > 0) return { ok: false, grund: `Verknüpfung unter .claude/commands: ${verknuepfungen.join(', ')} — Lauf startet nicht` }
  const nichtSperrbar = [...namen].filter((n) => !SPERRBARER_NAME.test(n))
  if (nichtSperrbar.length > 0) return { ok: false, grund: `Projekt-Skill-Name(n) nicht sperrbar (Zeichen außerhalb ${SPERRBARER_NAME}): ${nichtSperrbar.map((n) => JSON.stringify(n)).join(', ')} — Lauf startet nicht` }
  return { ok: true, namen: [...namen].sort() }
}

/**
 * Vorstart-Scan (F-791 (2)): jedes .claude unterhalb der Projektwurzel (außer dem der Wurzel), das
 * skills, agents oder commands enthält, und jedes verschachtelte .claude, das eine Verknüpfung ist.
 * .git wird übersprungen, Junctions/Symlinks werden nicht verfolgt, node_modules zählt mit. Ein nicht
 * lesbarer Ordner zählt als Treffer (fail-closed).
 * @param projektWurzel - Projekt-Repo-Wurzel
 * @returns Treffer als relative Pfade ('/' als Trenner), leer = sauber
 */
export function scanneVerschachtelteClaudeOrdner(projektWurzel: string): string[] {
  const treffer: string[] = []
  const gehe = (absolut: string, relativ: string): void => {
    let eintraege: Dirent[]
    try {
      eintraege = readdirSync(absolut, { withFileTypes: true })
    } catch (fehler) {
      treffer.push(`${relativ || '.'} (nicht lesbar: ${(fehler as NodeJS.ErrnoException).code ?? (fehler as Error).message})`)
      return
    }
    for (const e of eintraege) {
      const rel = relativ === '' ? e.name : `${relativ}/${e.name}`
      if (e.name.toLowerCase() === '.git') continue
      // Groß-/Kleinschreibung egal: auf NTFS findet die CLI .Claude/Skills genauso (Reviewer).
      const istClaude = e.name.toLowerCase() === '.claude'
      const istWurzelClaude = relativ === '' && istClaude
      if (istClaude && !istWurzelClaude && e.isSymbolicLink()) {
        treffer.push(`${rel} (Verknüpfung)`)
        continue
      }
      // Dirent meldet Junctions unter Windows als Link, nicht als Ordner — sie werden nicht verfolgt.
      if (!e.isDirectory()) continue
      if (istClaude && !istWurzelClaude) {
        let innen: string[] = []
        try {
          innen = readdirSync(join(absolut, e.name))
        } catch {
          treffer.push(`${rel} (nicht lesbar)`)
          continue
        }
        for (const unter of innen) if (VERBOTENE_UNTERORDNER.has(unter.toLowerCase())) treffer.push(`${rel}/${unter}`)
      }
      gehe(join(absolut, e.name), rel)
    }
  }
  gehe(projektWurzel, '')
  return treffer
}

/**
 * Wandelt einen absoluten Windows-Pfad in die S4b-Regelform (C:/…) — '/' statt '\', kein '//' davor.
 * @param pfad - absoluter Pfad
 * @returns Regelpfad
 */
function regelPfad(pfad: string): string {
  return pfad.replaceAll('\\', '/').replace(/\/+$/, '')
}

/**
 * Prüft die übergebenen Ort-B-Skills und das Projekt fail-closed und baut die V4a-Bausteine (Details im
 * Dateikopf). Jeder Treffer → { ok: false, grund }, der Lauf startet nicht.
 * @param skillEintraege - aufgelöste, in „Wird genutzt“ angezeigte extern-skill-Einträge (≥1)
 * @param projektWurzel - Projekt-Repo-Wurzel (cwd des Laufs)
 * @param capWurzel - Workforce-Ordner der Installationen (~/.ai-workforce/cap); jede installation.pfad muss
 *   genau <capWurzel>/<id>/.claude/skills/<name> sein (Reviewer: ressourcen.json ist versioniert und änderbar)
 * @returns { ok: true, start } oder { ok: false, grund }
 */
export function baueOrtBSkillStart(skillEintraege: readonly Ressource[], projektWurzel: string, capWurzel: string): { ok: true; start: OrtBSkillStart } | { ok: false; grund: string } {
  const nein = (grund: string): { ok: false; grund: string } => ({ ok: false, grund: `Ort-B-Skill-Start abgelehnt: ${grund}` })
  if (skillEintraege.length === 0) return nein('keine Ort-B-Skills übergeben')
  const skillNamen: string[] = []
  const addDirs: string[] = []
  for (const eintrag of skillEintraege) {
    const kennung = `'${String(eintrag.id)}'`
    if (eintrag.typ !== 'extern' || eintrag.unterart !== 'skill') return nein(`${kennung} ist kein externer Skill`)
    if (eintrag.freigabe !== 'FREIGEGEBEN') return nein(`${kennung} ist nicht FREIGEGEBEN`)
    const installation = eintrag.installation
    if (installation === undefined || !('pfad' in installation) || !('inhalt_hash' in installation)) return nein(`${kennung} trägt keine Skill-installation (pfad, version, inhalt_hash)`)
    const skillOrdner = expandiereHome(installation.pfad).replace(/[\\/]+$/, '')
    const name = basename(skillOrdner)
    const skillsOrdner = dirname(skillOrdner)
    const claudeOrdner = dirname(skillsOrdner)
    const capOrdner = dirname(claudeOrdner)
    if (basename(skillsOrdner) !== 'skills' || basename(claudeOrdner) !== '.claude') return nein(`${kennung}: installation.pfad '${skillOrdner}' hat nicht das Ort-B-Layout <cap>/<id>/.claude/skills/<name>`)
    const gleich = (a: string, b: string) => (process.platform === 'win32' ? resolve(a).toLowerCase() === resolve(b).toLowerCase() : resolve(a) === resolve(b))
    if (!gleich(capOrdner, join(capWurzel, eintrag.id))) return nein(`${kennung}: installation.pfad liegt nicht unter <cap>/${eintrag.id} (erwartet '${join(capWurzel, eintrag.id)}', gefunden '${capOrdner}')`)
    if (!SICHERER_REGELPFAD.test(regelPfad(resolve(capWurzel, eintrag.id)))) return nein(`${kennung}: cap-Pfad '${regelPfad(resolve(capWurzel, eintrag.id))}' enthält Zeichen, die die Sperrregel Write(…)/Edit(…) brechen würden (Leerzeichen, Komma, Klammer, *) — Lauf startet nicht`)
    try {
      const inhaltCap = namenIn(capOrdner)
      const inhaltClaude = namenIn(claudeOrdner)
      const inhaltSkills = namenIn(skillsOrdner)
      if (inhaltCap.join('|') !== '.claude' || inhaltClaude.join('|') !== 'skills' || inhaltSkills.join('|') !== name) {
        return nein(`${kennung}: cap-Ordner '${capOrdner}' enthält mehr als .claude/skills/${name} (gefunden: ${[...inhaltCap, ...inhaltClaude, ...inhaltSkills].join(', ')}) — --add-dir lädt alles darin`)
      }
      const skillMd = join(skillOrdner, 'SKILL.md')
      if (!existsSync(skillMd)) return nein(`${kennung}: SKILL.md fehlt unter '${skillOrdner}'`)
      const fm = leseFrontmatter(readFileSync(skillMd, 'utf8'))
      if (fm.name !== name || fm.beschreibung === null) return nein(`${kennung}: Frontmatter-name '${String(fm.name)}' ≠ Ordnername '${name}' oder description fehlt`)
      const harness = pruefeSkillDateiNamen(listeSkillDateien(skillOrdner))
      if (harness !== null) return nein(`${kennung}: ${harness}`)
      if (berechneInhaltHash(skillOrdner) !== installation.inhalt_hash) return nein(`${kennung}: inhalt_hash des Skill-Ordners '${skillOrdner}' weicht von installation.inhalt_hash ab — Ordner nach der Installation verändert`)
    } catch (fehler) {
      return nein(`${kennung}: Skill-Ordner nicht prüfbar (${(fehler as Error).message})`)
    }
    if (!SKILL_NAME_MUSTER.test(name)) return nein(`${kennung}: Name '${name}' verletzt ${SKILL_NAME_MUSTER}`)
    if (EINGEBAUTE_SKILLS_S7.includes(name)) return nein(`${kennung}: Name '${name}' kollidiert mit einem eingebauten Skill`)
    if (skillNamen.includes(name)) return nein(`${kennung}: Name '${name}' ist doppelt unter den Ort-B-Skills`)
    // Normalisiert (Reviewer): add-dir und Sperrregel nutzen <capWurzel>/<id>, nie einen Pfad mit '..'.
    const capNormiert = resolve(capWurzel, eintrag.id)
    if (addDirs.includes(capNormiert)) return nein(`${kennung}: cap-Ordner '${capNormiert}' doppelt`)
    skillNamen.push(name)
    addDirs.push(capNormiert)
  }

  const projekt = leseProjektSkillNamen(projektWurzel)
  if (!projekt.ok) return nein(projekt.grund)
  const kollision = skillNamen.filter((n) => projekt.namen.includes(n))
  if (kollision.length > 0) return nein(`Name(n) ${kollision.join(', ')} kollidieren mit Projekt-Skills/-Commands unter '${join(projektWurzel, '.claude')}'`)

  const scanStart = Date.now()
  const scan = scanneVerschachtelteClaudeOrdner(projektWurzel)
  // Der Scan läuft synchron über den ganzen Baum (samt node_modules) — lange Dauer sichtbar machen.
  if (Date.now() - scanStart > 1000) console.error(`[ort-b-start] Vorstart-Scan '${projektWurzel}' dauerte ${Date.now() - scanStart} ms`)
  if (scan.length > 0) return nein(`verschachtelte .claude-Ordner unterhalb der Projektwurzel: ${scan.join(', ')} — erst entfernen (F-791 (2))`)

  const gesperrt = [...EINGEBAUT_REST_SKILLS, ...projekt.namen.filter((n) => !EINGEBAUT_REST_SKILLS.includes(n))]
  const disallowedTools = [...addDirs.flatMap((d) => [`Write(${regelPfad(d)}/**)`, `Edit(${regelPfad(d)}/**)`]), ...CLAUDE_ORDNER_SPERREN, ...gesperrt.map((n) => `Skill(${n})`)]
  const settings = JSON.stringify({ disableBundledSkills: true, skillOverrides: Object.fromEntries(gesperrt.map((n) => [n, 'off'])) })
  return { ok: true, start: { addDirs, disallowedTools, settings, skillNamen, projektSkillNamen: projekt.namen, gesperrteNamen: gesperrt } }
}
