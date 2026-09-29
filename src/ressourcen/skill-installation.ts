/**
 * Datei: src/ressourcen/skill-installation.ts
 *
 * Zweck: F36 WS-5b „Skill-Installation“ (features/F36/feature.md WS-5b, E-F36-6/8, F-786 Teil skill) —
 * die git-Schritte und die fail-closed-Prüfung eines externen Skills, ohne Katalog und ohne Sperre
 * (beides führt src/ressourcen/installation.ts):
 * - loeseSkillCommitAuf: `git ls-remote <repo> <ref>` → genau eine Commit-SHA (nur lesend);
 * - holeSkillQuelle: temporäres Repo, flacher Fetch GENAU dieser SHA, `git ls-tree` über
 *   <unterpfad>/<skill_pfad> (Symlink oder Submodul im Quellbaum → Abbruch), Checkout nur dieses
 *   Pfads; git läuft ohne System-/Nutzerkonfiguration (keine Filter, kein LFS), mit core.hooksPath auf
 *   ein leeres Verzeichnis und core.symlinks=false;
 * - pruefeSkillQuelle: SKILL.md mit Frontmatter name + description, name nach SKILL_NAME_MUSTER, keine
 *   Kollision mit eingebauten Skills (EINGEBAUTE_SKILLS_S7) oder einem anderen Ort-B-Skill des Katalogs.
 *
 * Wird aufgerufen von: src/ressourcen/installation.ts (bereiteInstallationVor/installiereRessource für
 * unterart 'skill'), src/ressourcen/skill-installation.test.ts, scripts/check-f36-ws5b-skill.mjs.
 *
 * Wichtig: Der git-Runner ist injizierbar (Gate/Tests ohne Netz). `ls-remote <repo> main` meldet real
 * auch 'refs/heads/<irgendwas>/main' (geprüft am 29.09.2026 gegen anthropics/claude-plugins-official) —
 * gewertet wird deshalb nur der exakte Name refs/heads/<ref>, refs/tags/<ref> (bzw. dessen ^{}) oder HEAD.
 */

import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ProzessErgebnis } from './installation.ts'
import { EINGEBAUTE_SKILLS_S7, type GithubQuelle, leseFrontmatter, listeSkillDateien, SKILL_NAME_MUSTER } from './skill-dateien.ts'

/** Führt git mit den gegebenen Argumenten aus (ohne Shell); env ergänzt process.env. */
export type GitRunner = (args: string[], optionen: { cwd: string; timeoutMs: number; env?: Record<string, string> }) => Promise<ProzessErgebnis>

/** Ergebnis mit HTTP-Status für den Aufrufer (installation.ts macht daraus die Antwort). */
type Fehler = { ok: false; status: number; grund: string }

/** 40-stellige Commit-SHA (klein). */
export const COMMIT_SHA = /^[0-9a-f]{40}$/

/** Hinweis vor dem Klick „Installieren“ (Challenger-Nachtrag WS-5b, 29.09.2026: lesende Befehle laufen laut Nachweis 9c auch ohne Allowlist-Eintrag). */
export const SKILL_SKRIPT_HINWEIS = 'Skill-Dateien können Skripte enthalten; ausgeführt werden nur Befehle, die der Werkzeugsatz der Ausführung zulässt – lesende Befehle lässt die CLI auch ohne Eintrag zu.'

/**
 * Letzte Zeilen einer git-Ausgabe für den Klartext-Grund (Muster ausgabeKurz in installation.ts; eigene
 * Kopie, weil diese Datei installation.ts zur Laufzeit nicht importieren darf — Importzyklus).
 * @param ergebnis - Prozessergebnis
 * @returns gekürzter Text
 */
function kurz(ergebnis: ProzessErgebnis): string {
  const text = `${ergebnis.stderr}\n${ergebnis.stdout}`.trim().split(/\r?\n/).slice(-3).join(' | ')
  return text.length > 300 ? `${text.slice(0, 300)}…` : text
}

/**
 * Ruft git auf und übersetzt Wurf, Zeitgrenze und Exit ≠ 0 in einen Grund.
 * @param git - git-Runner
 * @param args - Argumente
 * @param optionen - cwd, timeoutMs, env
 * @param status - HTTP-Status im Fehlerfall
 * @returns stdout oder Fehler
 */
async function rufeGit(git: GitRunner, args: string[], optionen: { cwd: string; timeoutMs: number; env?: Record<string, string> }, status: number): Promise<{ ok: true; stdout: string } | Fehler> {
  let ergebnis: ProzessErgebnis
  try {
    ergebnis = await git(args, optionen)
  } catch (fehler) {
    console.error(`[skill-installation] git ${args[0]} nicht ausführbar:`, fehler)
    return { ok: false, status, grund: `git ${args[0]} nicht ausführbar: ${(fehler as Error).message}` }
  }
  if (ergebnis.zeitueberschritten) return { ok: false, status, grund: `git ${args[0]}: Zeitgrenze (${optionen.timeoutMs} ms) überschritten` }
  if (ergebnis.code !== 0) return { ok: false, status, grund: `git ${args[0]} fehlgeschlagen (Exit ${ergebnis.code}): ${kurz(ergebnis)}` }
  return { ok: true, stdout: ergebnis.stdout }
}

/**
 * Löst die Ref der herkunft.url nur lesend zu genau einer Commit-SHA auf. Eine Ref, die schon eine
 * SHA ist, lehnt schon zerlegeGithubUrl ab (Fork-Netz, Reviewer).
 * @param quelle - zerlegte herkunft.url
 * @param git - git-Runner
 * @param timeoutMs - Zeitgrenze
 * @returns { ok, sha } oder Fehler (502 Remote/mehrdeutig)
 */
export async function loeseSkillCommitAuf(quelle: GithubQuelle & { ok: true }, git: GitRunner, timeoutMs: number): Promise<{ ok: true; sha: string } | Fehler> {
  // Reviewer: auch ls-remote ohne Nutzerkonfiguration (url.*.insteadOf, http.extraHeader, credential.helper
  // könnten die Quelle umlenken oder ein Anmeldefenster öffnen) — leere globale Konfiguration, kein Helper.
  const temp = mkdtempSync(join(tmpdir(), 'aiw-ws5b-lsremote-'))
  let aufruf: { ok: true; stdout: string } | Fehler
  try {
    const leereKonfig = join(temp, 'gitconfig-leer')
    writeFileSync(leereKonfig, '')
    aufruf = await rufeGit(git, ['-c', 'credential.helper=', 'ls-remote', quelle.repoUrl, quelle.ref], { cwd: temp, timeoutMs, env: { ...GIT_UMGEBUNG_OHNE_KONFIG, GIT_CONFIG_GLOBAL: leereKonfig } }, 502)
  } finally {
    rmSync(temp, { recursive: true, force: true })
  }
  if (!aufruf.ok) return aufruf
  const treffer = new Map<string, string>()
  for (const zeile of aufruf.stdout.split(/\r?\n/)) {
    const [sha, name] = zeile.trim().split(/\s+/)
    if (sha !== undefined && name !== undefined && COMMIT_SHA.test(sha)) treffer.set(name, sha)
  }
  const kandidaten =
    quelle.ref === 'HEAD'
      ? [treffer.get('HEAD')]
      : [treffer.get(`refs/heads/${quelle.ref}`), treffer.get(`refs/tags/${quelle.ref}^{}`) ?? treffer.get(`refs/tags/${quelle.ref}`)]
  const shas = [...new Set(kandidaten.filter((s): s is string => s !== undefined))]
  if (shas.length === 0) return { ok: false, status: 502, grund: `git ls-remote ${quelle.repoUrl} ${quelle.ref}: Ref nicht gefunden (nur exakt refs/heads/${quelle.ref}, refs/tags/${quelle.ref} oder HEAD zählen)` }
  if (shas.length > 1) return { ok: false, status: 502, grund: `git ls-remote ${quelle.repoUrl} ${quelle.ref}: mehrdeutig (Branch und Tag zeigen auf verschiedene Commits: ${shas.join(', ')})` }
  return { ok: true, sha: shas[0] }
}

/**
 * Umgebung jedes git-Aufrufs: keine System-/Nutzerkonfiguration (damit keine Filter-, LFS- oder
 * Hook-Einstellungen des Rechners greifen), keine Passwortabfrage, LFS-Smudge aus. GIT_CONFIG_GLOBAL
 * zeigt auf eine leere Datei, die holeSkillQuelle bzw. loeseSkillCommitAuf je Aufruf anlegt.
 * GIT_CEILING_DIRECTORIES: git sucht vom Temp-Ordner nicht aufwärts nach einem umgebenden Repo (dessen
 * .git/config mit url.*.insteadOf bliebe sonst wirksam, Reviewer).
 */
export const GIT_UMGEBUNG_OHNE_KONFIG: Record<string, string> = { GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0', GIT_LFS_SKIP_SMUDGE: '1', GIT_CEILING_DIRECTORIES: tmpdir() }

/** Ergebnis von holeSkillQuelle: der ausgecheckte Skill-Ordner im Temp-Repo und ein Aufräumer. */
export type SkillQuelle = { ok: true; quellOrdner: string; quellPfad: string; dateien: string[]; aufraeumen: () => void } | Fehler

/**
 * Holt genau die SHA und checkt nur <unterpfad>/<skill_pfad> in ein temporäres Repo aus (Details im
 * Dateikopf). Jeder Fehlschlag räumt das Temp-Repo selbst weg; bei Erfolg ruft der Aufrufer aufraeumen().
 * @param quelle - zerlegte herkunft.url
 * @param sha - angezeigte Commit-SHA
 * @param skillPfad - installation_vorlage.skill_pfad
 * @param git - git-Runner
 * @param timeoutMs - Zeitgrenze je git-Aufruf (Fetch)
 * @returns SkillQuelle (422 bei Symlink/Submodul/fehlendem Pfad, 502 bei Fetch-Fehler)
 */
export async function holeSkillQuelle(quelle: GithubQuelle & { ok: true }, sha: string, skillPfad: string, git: GitRunner, timeoutMs: number): Promise<SkillQuelle> {
  const temp = mkdtempSync(join(tmpdir(), 'aiw-ws5b-skill-'))
  const aufraeumen = (): void => {
    try {
      rmSync(temp, { recursive: true, force: true })
    } catch (fehler) {
      // Nur ein Temp-Ordner — liegen lassen ist besser, als die Installation daran scheitern zu lassen.
      console.error(`[skill-installation] Temp-Repo '${temp}' nicht entfernbar:`, fehler)
    }
  }
  const scheitere = (status: number, grund: string): Fehler => {
    aufraeumen()
    return { ok: false, status, grund }
  }
  try {
    const repo = join(temp, 'repo')
    const leereHooks = join(temp, 'hooks-leer')
    const leereKonfig = join(temp, 'gitconfig-leer')
    mkdirSync(leereHooks)
    writeFileSync(leereKonfig, '')
    const env = { ...GIT_UMGEBUNG_OHNE_KONFIG, GIT_CONFIG_GLOBAL: leereKonfig }
    const konfig = ['-c', `core.hooksPath=${leereHooks}`, '-c', 'core.symlinks=false', '-c', 'core.autocrlf=false', '-c', 'core.fsmonitor=false', '-c', 'credential.helper=']
    const quellPfad = quelle.unterpfad === '' ? skillPfad : `${quelle.unterpfad}/${skillPfad}`
    const lauf = (args: string[], status: number) => rufeGit(git, [...konfig, ...args], { cwd: temp, timeoutMs, env }, status)

    // --template auf den leeren Ordner: auch keine Beispiel-Hooks aus der Installationsvorlage von git.
    const init = await lauf(['init', '--quiet', `--template=${leereHooks}`, repo], 502)
    if (!init.ok) return scheitere(init.status, init.grund)
    const fetch = await lauf(['-C', repo, 'fetch', '--quiet', '--depth', '1', '--no-tags', '--no-recurse-submodules', quelle.repoUrl, sha], 502)
    if (!fetch.ok) return scheitere(fetch.status, `Fetch der Commit-SHA ${sha} gescheitert: ${fetch.grund}`)
    const baum = await lauf(['-C', repo, 'ls-tree', '-r', '-z', '--full-tree', sha, '--', quellPfad], 502)
    if (!baum.ok) return scheitere(baum.status, baum.grund)
    const eintraege = baum.stdout.split('\0').filter((z) => z.length > 0)
    if (eintraege.length === 0) return scheitere(422, `Pfad '${quellPfad}' existiert im Commit ${sha} nicht`)
    for (const eintrag of eintraege) {
      const [kopf, pfad] = eintrag.split('\t')
      const modus = kopf.split(' ')[0]
      if (modus === '120000') return scheitere(422, `Symlink im Quellbaum: '${pfad}' — abgebrochen`)
      if (modus === '160000') return scheitere(422, `Submodul im Quellbaum: '${pfad}' — abgebrochen`)
      if (modus !== '100644' && modus !== '100755') return scheitere(422, `unbekannter Eintrag (Modus ${modus}) im Quellbaum: '${pfad}' — abgebrochen`)
    }
    const checkout = await lauf(['-C', repo, 'checkout', '--quiet', sha, '--', quellPfad], 502)
    if (!checkout.ok) return scheitere(checkout.status, checkout.grund)
    const quellOrdner = join(repo, ...quellPfad.split('/'))
    if (!existsSync(quellOrdner) || !statSync(quellOrdner).isDirectory()) return scheitere(422, `Pfad '${quellPfad}' ist nach dem Checkout kein Ordner`)
    let dateien: string[]
    try {
      dateien = listeSkillDateien(quellOrdner)
    } catch (fehler) {
      return scheitere(422, `${(fehler as Error).message} — abgebrochen`)
    }
    return { ok: true, quellOrdner, quellPfad, dateien, aufraeumen }
  } catch (fehler) {
    console.error('[skill-installation] Quelle nicht holbar:', fehler)
    return scheitere(500, `Skill-Quelle nicht holbar: ${(fehler as Error).message}`)
  }
}

/**
 * Fail-closed-Prüfung des ausgecheckten Skill-Ordners (F-786 Teil skill).
 * @param quellOrdner - Ordner mit der SKILL.md
 * @param belegteOrtBNamen - Namen der übrigen installierten Ort-B-Skills des Katalogs
 * @returns { ok, name, beschreibung } oder Fehler (422)
 */
export function pruefeSkillQuelle(quellOrdner: string, belegteOrtBNamen: readonly string[]): { ok: true; name: string; beschreibung: string } | Fehler {
  const nein = (grund: string): Fehler => ({ ok: false, status: 422, grund })
  const skillMd = join(quellOrdner, 'SKILL.md')
  if (!existsSync(skillMd)) return nein('SKILL.md fehlt im Skill-Ordner — kein Skill, abgelehnt')
  const { name, beschreibung } = leseFrontmatter(readFileSync(skillMd, 'utf8'))
  if (name === null || beschreibung === null) return nein('SKILL.md trägt kein vollständiges Frontmatter (name und description) — abgelehnt')
  if (!SKILL_NAME_MUSTER.test(name)) return nein(`Frontmatter-name '${name}' verletzt ${SKILL_NAME_MUSTER} — abgelehnt`)
  if (EINGEBAUTE_SKILLS_S7.includes(name)) return nein(`Frontmatter-name '${name}' kollidiert mit einem eingebauten Skill der CLI — abgelehnt (skillOverrides/Skill(…) greifen nach Namen)`)
  if (belegteOrtBNamen.includes(name)) return nein(`Frontmatter-name '${name}' ist schon von einem anderen Ort-B-Skill des Katalogs belegt — abgelehnt`)
  return { ok: true, name, beschreibung }
}

/**
 * Kopiert den geprüften Skill-Ordner nach ziel (darf noch nicht existieren).
 * @param quellOrdner - ausgecheckter Ordner
 * @param ziel - <cap>/<id>/.claude/skills/<name>
 */
export function kopiereSkill(quellOrdner: string, ziel: string): void {
  cpSync(quellOrdner, ziel, { recursive: true, errorOnExist: true, force: false, verbatimSymlinks: true })
}
