/**
 * Datei: src/git-starter/index.ts
 *
 * Zweck: Der eine Git-Starter für Kern und Leitstand (F45 S, löst F-1000). Unter Windows sucht der
 * Prozessstart bei einem bloßen Programmnamen ('git') zuerst im cwd des Kindprozesses — das ist hier
 * die Repo-Wurzel eines Projekts, in die ein Lauf schreiben kann. Eine dort abgelegte git.exe/git.com
 * liefe dann im Leitstand- bzw. Kernprozess, außerhalb von Werkzeugsatz und Berechtigungsprofil.
 * Deshalb startet jeder Git-Aufruf über diese Datei:
 * - Programm: absoluter Pfad aus den ABSOLUTEN PATH-Einträgen (findeGitProgramm); relative Einträge
 *   ('.', 'bin') und Einträge mit einem Segment 'node_modules' werden übersprungen — npm stellt beim Start
 *   über ein npm-Skript '<repo>/node_modules/.bin' absolut vor PATH, und dort kann ein Lauf im eigenen
 *   Repo (Selbstbetrieb) schreiben (QA-Pass F45 S). Kein git gefunden → Fehler GIT_NICHT_GEFUNDEN, nie ein Rückfall
 *   auf den bloßen Namen.
 * - Umgebung: ohne jede geerbte GIT_*-Variable (gitUmgebung; GIT_DIR, GIT_WORK_TREE, GIT_INDEX_FILE,
 *   GIT_CONFIG_PARAMETERS … lenkten Git sonst an der Repo-Wurzel vorbei oder schleusten Konfiguration
 *   ein); feste Zusatzwerte setzt der Aufrufer ausdrücklich.
 * - fuehreGitSync: gleiche Rückgabe- und Fehlersemantik wie execFileSync (Text bei Exit 0, Wurf mit
 *   status/stderr sonst) — die Aufrufer behalten ihr try/catch unverändert.
 *
 * Wird aufgerufen von:
 * - src/authorization-boundary/index.ts (leseAusCommit, E-188-Prüfkette)
 * - src/execution-controller/index.ts (leseClaudeAenderungen)
 * - src/aenderungsuebersicht/index.ts (leseGitOderNull)
 * - src/ressourcen/installation.ts (gitReal, asynchron über gitProgramm + gitUmgebung)
 * - scripts/leitstand-server.mjs (git status, ls-files, rev-parse HEAD)
 * - scripts/leitstand/routen-code.mjs (asynchron über gitProgramm + gitUmgebung)
 * - scripts/zustand-sichern.mjs (git)
 * - src/git-starter/git-starter.test.ts (node:test)
 *
 * Durchsetzungsgrad: geprüft, nicht ERZWUNGEN — Rotfall-Test (Attrappe in der Repo-Wurzel, in
 * node_modules/.bin) und Gate; ein absoluter PATH-Eintrag, den ein Lauf beschreiben kann und der kein
 * node_modules-Segment trägt, bliebe eine Lücke.
 *
 * Wichtig: Ein neuer Git-Aufruf in src/, scripts/leitstand*.mjs, scripts/leitstand/ oder
 * scripts/zustand-sichern.mjs mit bloßem 'git' fällt im Gate scripts/check-git-starter.mjs durch. Nicht
 * auf execFileSync('git', …) „vereinfachen“ und keinen Rückfall auf den bloßen Namen einbauen.
 */

import { type ExecFileSyncOptionsWithStringEncoding, execFileSync } from 'node:child_process'
import { accessSync, constants, statSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'

/** Fehlertext, wenn kein git in einem absoluten PATH-Eintrag liegt. */
export const GIT_NICHT_GEFUNDEN = 'git nicht gefunden (PATH)'

/** Zwischenspeicher einer ERFOLGREICHEN Auflösung, gebunden an PATH und Plattform (ändert sich PATH, wird neu gesucht; „nicht gefunden“ wird nie gemerkt). */
let gitProgrammCache: { pfadVariable: string; plattform: string; programm: string } | undefined

/**
 * Sucht git als absoluten Pfad in den ABSOLUTEN Einträgen von PATH. Relative Einträge werden
 * übersprungen — mit ihnen hinge die Auflösung wieder am cwd —, ebenso Einträge mit einem Segment
 * 'node_modules' (npm-Skripte stellen '<repo>/node_modules/.bin' vor PATH). Außerhalb von Windows muss
 * die Datei ausführbar sein.
 * @param pfadVariable - Inhalt von PATH
 * @param plattform - process.platform
 * @returns absoluter Pfad oder null
 */
export function findeGitProgramm(pfadVariable: string = process.env.PATH ?? '', plattform: string = process.platform): string | null {
  const trenner = plattform === 'win32' ? ';' : ':'
  const name = plattform === 'win32' ? 'git.exe' : 'git'
  for (const eintrag of pfadVariable.split(trenner)) {
    const ordner = eintrag.trim().replace(/^"(.*)"$/, '$1')
    if (ordner === '' || !isAbsolute(ordner)) continue
    if (ordner.split(/[\\/]/).some((segment) => segment.toLowerCase() === 'node_modules')) continue
    try {
      const kandidat = join(ordner, name)
      if (!statSync(kandidat).isFile()) continue
      if (plattform !== 'win32') accessSync(kandidat, constants.X_OK)
      return kandidat
    } catch {
      // Eintrag ohne git — weiter.
    }
  }
  return null
}

/**
 * Das aufgelöste Git-Programm des laufenden Prozesses (je PATH einmal gesucht).
 * @returns absoluter Pfad zu git
 * @throws Error(GIT_NICHT_GEFUNDEN), wenn kein absoluter PATH-Eintrag git enthält
 */
export function gitProgramm(): string {
  const pfadVariable = process.env.PATH ?? ''
  const plattform = process.platform
  if (gitProgrammCache === undefined || gitProgrammCache.pfadVariable !== pfadVariable || gitProgrammCache.plattform !== plattform) {
    const programm = findeGitProgramm(pfadVariable, plattform)
    if (programm === null) throw new Error(GIT_NICHT_GEFUNDEN)
    gitProgrammCache = { pfadVariable, plattform, programm }
  }
  return gitProgrammCache.programm
}

/**
 * Umgebung eines Git-Aufrufs: die Basis ohne jede GIT_*-Variable (Groß-/Kleinschreibung egal), darüber
 * die ausdrücklich gesetzten Zusatzwerte des Aufrufers.
 * @param basis - Umgebung des Prozesses (Standard process.env)
 * @param zusatz - feste Werte des Aufrufers (z. B. GIT_TERMINAL_PROMPT)
 * @returns vollständige Umgebung
 */
export function gitUmgebung(basis: NodeJS.ProcessEnv = process.env, zusatz: Record<string, string> = {}): NodeJS.ProcessEnv {
  return { ...Object.fromEntries(Object.entries(basis).filter(([schluessel]) => !schluessel.toUpperCase().startsWith('GIT_'))), ...zusatz }
}

/**
 * Führt git synchron aus — wie execFileSync(git, argumente, optionen), aber mit absolutem Programmpfad
 * und bereinigter Umgebung. Eine in den Optionen übergebene env wird ebenfalls bereinigt.
 * @param argumente - Git-Argumente
 * @param optionen - execFileSync-Optionen mit Text-Encoding (cwd, stdio, maxBuffer, timeout …)
 * @returns stdout als Text
 * @throws wie execFileSync bei Exit ≠ 0, Zeitgrenze oder maxBuffer; Error(GIT_NICHT_GEFUNDEN) ohne git
 */
export function fuehreGitSync(argumente: readonly string[], optionen: ExecFileSyncOptionsWithStringEncoding): string {
  return execFileSync(gitProgramm(), argumente, { ...optionen, env: gitUmgebung(optionen.env ?? process.env) })
}
