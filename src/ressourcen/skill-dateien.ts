/**
 * Datei: src/ressourcen/skill-dateien.ts
 *
 * Zweck: F36 WS-5b — gemeinsame, abhängigkeitsfreie Bausteine für externe Skills an Ort B (E-F36-8):
 * - leseFrontmatter: name/description aus dem Frontmatter einer SKILL.md bzw. Agent-Datei
 *   (vorher in src/ressourcen/index.ts, unverändert hierher verschoben, damit Installation und
 *   Start ihn ohne Importzyklus nutzen),
 * - SKILL_NAME_MUSTER und EINGEBAUTE_SKILLS_S7 (Namen der eingebauten Skills laut Spike S7, CLI
 *   2.1.284 — nur für die Kollisionsprüfung bei Installation und Start, keine Sperrliste),
 * - berechneInhaltHash: sha256 über alle Dateien eines Skill-Ordners (Symlink → Wurf),
 * - zerlegeGithubUrl / pruefeSkillPfad: die einzigen zulässigen Formen von herkunft.url bzw.
 *   installation_vorlage.skill_pfad.
 *
 * Wird aufgerufen von: src/ressourcen/index.ts, src/ressourcen/skill-installation.ts,
 * src/ressourcen/ort-b-start.ts, zugehörige Tests und scripts/check-f36-ws5b-skill.mjs.
 *
 * Wichtig: inhalt_hash-Form (festgeschrieben, sonst passt kein gespeicherter Hash mehr): Dateien des
 * Ordners rekursiv, relativer Pfad mit '/' als Trenner, sortiert nach Codepunkten; gehasht wird die
 * Folge '<relativer Pfad>\0<sha256 hex des Inhalts>\n' je Datei. Leere Ordner zählen nicht mit.
 */

import { createHash } from 'node:crypto'
import { lstatSync, readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

/** Zulässiger Skill-Name (Frontmatter name, zugleich Ordnername unter <cap>/<id>/.claude/skills/). */
export const SKILL_NAME_MUSTER = /^[a-z0-9][a-z0-9-]*$/

/**
 * Eingebaute Skills der Claude-CLI laut Spike S7 (`state/spike-f36-ws2s.md` S7, CLI 2.1.284). Nur für
 * die Namenskollision: ein Ort-B-Skill mit einem dieser Namen wird bei Installation und Start
 * abgelehnt. Die Liste driftet mit der CLI-Version (F-791); den Lauf schützt davon unabhängig das
 * Init-Gate (init.skills ⊆ übergebene Ort-B-Namen).
 */
export const EINGEBAUTE_SKILLS_S7: readonly string[] = [
  'deep-research',
  'design',
  'design-sync',
  'dataviz',
  'update-config',
  'verify',
  'debug',
  'code-review',
  'simplify',
  'batch',
  'fewer-permission-prompts',
  'doctor',
  'loop',
  'schedule',
  'claude-api',
  'workflow-authoring',
  'run',
  'run-skill-generator',
]

/**
 * Sehr einfacher Frontmatter-Parser: Text zwischen den ersten beiden '---'-Zeilen, dann
 * 'name:'/'description:' per Zeilen-Regex — kein externes Paket.
 * @param inhalt - Dateiinhalt
 * @returns name und beschreibung, je null, wenn nicht gefunden
 */
export function leseFrontmatter(inhalt: string): { name: string | null; beschreibung: string | null } {
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

/**
 * Sammelt alle Dateien unter ordner (relativ, '/' als Trenner). Wirft bei einem Symlink/einer
 * Junction oder einem anderen Nicht-Datei-Eintrag — ein Skill-Ordner an Ort B enthält nur Dateien und
 * Ordner.
 * @param ordner - absoluter Pfad
 * @returns relative Dateipfade, sortiert nach Codepunkten
 */
export function listeSkillDateien(ordner: string): string[] {
  const dateien: string[] = []
  const gehe = (absolut: string, relativ: string): void => {
    for (const eintrag of readdirSync(absolut, { withFileTypes: true })) {
      const rel = relativ === '' ? eintrag.name : `${relativ}/${eintrag.name}`
      const voll = join(absolut, eintrag.name)
      // lstat statt Dirent: eine Junction meldet Dirent je nach Plattform nicht verlässlich als Link.
      const info = lstatSync(voll)
      if (info.isSymbolicLink()) throw new Error(`Symlink/Junction im Skill-Ordner: '${rel}'`)
      if (info.isDirectory()) gehe(voll, rel)
      else if (info.isFile()) dateien.push(rel)
      else throw new Error(`weder Datei noch Ordner im Skill-Ordner: '${rel}'`)
    }
  }
  gehe(ordner, '')
  return dateien.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
}

/**
 * inhalt_hash eines Skill-Ordners (Form siehe Dateikopf). Wirft, wenn der Ordner nicht lesbar ist oder
 * einen Symlink enthält — der Aufrufer macht daraus einen fail-closed-Grund.
 * @param ordner - absoluter Pfad des Skill-Ordners
 * @returns sha256 hex
 */
export function berechneInhaltHash(ordner: string): string {
  const gesamt = createHash('sha256')
  for (const rel of listeSkillDateien(ordner)) {
    const inhalt = createHash('sha256').update(readFileSync(join(ordner, ...rel.split('/')))).digest('hex')
    gesamt.update(`${rel}\0${inhalt}\n`, 'utf8')
  }
  return gesamt.digest('hex')
}

/**
 * Ersetzt ein führendes '~' durch das Home-Verzeichnis (R4: installation.pfad darf mit ~ beginnen).
 * @param pfad - Pfad aus dem Katalog
 * @returns Pfad ohne führendes ~
 */
export function expandiereHome(pfad: string): string {
  return /^~[\\/]/.test(pfad) ? join(homedir(), pfad.slice(2)) : pfad
}

/**
 * F36 WS-5b (Reviewer): Ein Skill-Ordner an Ort B darf keine Harness-Dateien tragen — kein Segment
 * '.claude' und keine CLAUDE.md (Groß-/Kleinschreibung egal), sonst lüde --add-dir sie womöglich mit.
 * @param dateien - relative Pfade aus listeSkillDateien
 * @returns null, wenn sauber, sonst der Grund
 */
export function pruefeSkillDateiNamen(dateien: readonly string[]): string | null {
  const verboten = dateien.filter((rel) => rel.split('/').some((segment, i, alle) => segment.toLowerCase() === '.claude' || (i === alle.length - 1 && segment.toLowerCase() === 'claude.md')))
  return verboten.length === 0 ? null : `Skill-Ordner enthält .claude/ bzw. CLAUDE.md: ${verboten.join(', ')} — abgelehnt`
}

/** Ein Pfadsegment in URL-Unterpfad bzw. skill_pfad: keine Sonderzeichen, nicht '.'/'..'. */
const SEGMENT_MUSTER = /^[A-Za-z0-9._@+-]+$/
const OWNER_MUSTER = /^[A-Za-z0-9][A-Za-z0-9-]*$/
const REPO_MUSTER = /^[A-Za-z0-9._-]+$/
/** Ref (Branch/Tag/Commit) ohne '/', nicht mit '-' beginnend (sonst läse git sie als Option). */
const REF_MUSTER = /^[A-Za-z0-9._][A-Za-z0-9._-]*$/

/**
 * true, wenn jedes Segment zulässig ist (kein '.', '..', leeres Segment).
 * @param segmente - Pfadsegmente
 * @returns ob alle zulässig sind
 */
function segmenteGueltig(segmente: string[]): boolean {
  return segmente.every((s) => SEGMENT_MUSTER.test(s) && s !== '.' && s !== '..')
}

/**
 * Prüft installation_vorlage.skill_pfad: relativ, '/' als Trenner, ohne '..', ohne leeres Segment.
 * @param wert - Feldwert
 * @returns null bei gültiger Form, sonst der Grund
 */
export function pruefeSkillPfad(wert: unknown): string | null {
  if (typeof wert !== 'string' || wert.length === 0) return 'muss ein nicht-leerer String sein'
  if (!segmenteGueltig(wert.split('/'))) return "muss ein relativer Pfad mit '/' als Trenner sein (ohne '..', ohne leeres Segment, ohne Sonderzeichen)"
  return null
}

/** Ergebnis von zerlegeGithubUrl. */
export type GithubQuelle = { ok: true; repoUrl: string; owner: string; repo: string; ref: string; unterpfad: string } | { ok: false; grund: string }

/**
 * Zerlegt herkunft.url eines externen Skills. Zulässig sind nur
 * 'https://github.com/<owner>/<repo>' (Repo-Wurzel, Ref = HEAD) und
 * 'https://github.com/<owner>/<repo>/tree/<ref>/<unterpfad>' (Ref ohne '/'); alles andere wird
 * abgelehnt (fail-closed, kein Raten bei mehrdeutigen Refs mit '/').
 * @param url - herkunft.url
 * @returns Repo-Adresse (…/<repo>.git), ref, unterpfad ('' = Wurzel) oder Grund
 */
export function zerlegeGithubUrl(url: unknown): GithubQuelle {
  const nein = (grund: string): GithubQuelle => ({ ok: false, grund: `herkunft.url '${String(url)}': ${grund}` })
  if (typeof url !== 'string') return nein('kein String')
  if (!url.startsWith('https://github.com/')) return nein("nur 'https://github.com/<owner>/<repo>[/tree/<ref>/<unterpfad>]' ist installierbar")
  if (/[?#\\]/.test(url)) return nein('Query, Fragment oder Backslash sind nicht zulässig')
  const teile = url.slice('https://github.com/'.length).replace(/\/$/, '').split('/')
  const [owner, repoRoh, art, ref, ...rest] = teile
  const repo = repoRoh?.endsWith('.git') ? repoRoh.slice(0, -4) : repoRoh
  if (owner === undefined || !OWNER_MUSTER.test(owner) || repo === undefined || !REPO_MUSTER.test(repo) || repo === '.' || repo === '..') return nein('owner/repo fehlen oder sind ungültig')
  const repoUrl = `https://github.com/${owner}/${repo}.git`
  if (art === undefined) return { ok: true, repoUrl, owner, repo, ref: 'HEAD', unterpfad: '' }
  if (art !== 'tree' || ref === undefined || !REF_MUSTER.test(ref)) return nein("erwartet '/tree/<ref>/<unterpfad>' mit einer Ref ohne '/'")
  // Reviewer (Fork-Netz): GitHub liefert über die URL des Original-Repos auch Commits aus Forks aus — eine
  // SHA als Ref wäre nicht an das angezeigte Repo gebunden. Nur Branch/Tag, die ls-remote auflöst.
  if (/^[0-9a-fA-F]{7,40}$/.test(ref)) return nein('eine Commit-SHA als Ref ist nicht zulässig (nur Branch oder Tag, aufgelöst per git ls-remote)')
  if (rest.length > 0 && !segmenteGueltig(rest)) return nein("Unterpfad ungültig (kein '..', kein leeres Segment, keine Sonderzeichen)")
  return { ok: true, repoUrl, owner, repo, ref, unterpfad: rest.join('/') }
}
