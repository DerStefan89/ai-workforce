/**
 * Datei: scripts/check-gates.mjs
 *
 * Zweck: Mindest-Gates eines Node/TypeScript-Projekts — läuft als erster Schritt von `npm run check`
 * (nicht in `check:template`). Vier Teile, jeder meldet sichtbar ✓ / ⚠ / ✗:
 * (a) Platzhalter: `lint`, `typecheck` und `test` müssen echte Befehle sein. Fehlt eines oder trägt es
 *     `[PLATZHALTER]` → rot mit Verweis auf die Gate-Vorlage (docs/harness/gate-vorlage-node.md).
 * (b) Abhängigkeiten: mit package-lock.json → `npm audit --audit-level=high`; Befund oder nicht
 *     ausführbar (z. B. offline) → rot, beides benannt. Ohne Lock-Datei → Hinweis.
 * (c) Secret-Scan: gitleaks aus dem PATH, sonst gitleaks per Docker (gleiche Fassung wie
 *     .github/workflows/ci.yml), sonst sichtbarer Hinweis mit der echten Ursache — nie stilles
 *     Überspringen. Treffer → rot; gitleaks gefunden, aber nicht startbar → rot. Docker gefunden, aber
 *     nicht erreichbar (Dienst aus) → Hinweis. Programme werden nur über absolute PATH-Einträge gesucht,
 *     nie im Arbeitsordner.
 * (d) Hooks: jeder Hook aus .claude/settings.json der Form `node <pfad>` (auch mit
 *     `$CLAUDE_PROJECT_DIR`) wird mit harmloser Bash-Eingabe gestartet und muss mit Exit 0 enden. Ein
 *     abstürzender Hook (z. B. CommonJS unter "type": "module", fehlende Datei) lässt in Claude Code den
 *     Befehl durch — die Bremse wäre still offen. Grenze: geprüft wird, dass der Hook lädt und auf
 *     harmlose Eingabe nicht abstürzt — nicht, dass er bremst, und nicht Zweige, die nur andere
 *     Eingaben (Edit/Write) erreichen.
 *
 * Herkunft: ai-workforce F45 B1a-2 (lokal neu im Projekt-Skelett, nicht aus dem Template). Ohne
 * Abhängigkeiten außer node:, ohne Wirkung beim Import (Teilprüfungen als Funktionen exportiert,
 * Ausführer injizierbar für Tests).
 *
 * Wird aufgerufen von: npm run check (package.json, erster Schritt); in ai-workforce importiert
 * scripts/check-secrets.mjs pruefeSecrets.
 *
 * Aufruf: node scripts/check-gates.mjs   (Teil von npm run check)
 * Exit 0 = kein Teil rot (Hinweise möglich), Exit 1 = mindestens ein Teil rot
 */

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, posix, resolve, win32 } from 'node:path'
import { pathToFileURL } from 'node:url'

export const GATE_VORLAGE = 'docs/harness/gate-vorlage-node.md'
export const PLATZHALTER_MARKER = '[PLATZHALTER]'
export const PFLICHT_SKRIPTE = ['lint', 'typecheck', 'test']
/** Gleiche Fassung wie der Secret-Scan in .github/workflows/ci.yml. */
export const GITLEAKS_BILD = 'zricethezav/gitleaks:v8.30.1'

/**
 * Startet ein Programm ohne Shell und sammelt das Ergebnis. Wirft nie.
 * @param programm - absoluter Pfad
 * @param argumente - Argumente
 * @param optionen - { cwd, zeitgrenzeMs, eingabe, env } (env fehlt → Umgebung des Prozesses)
 * @returns { status, stdout, stderr, fehler } — status null bei Startfehler oder Zeitgrenze
 */
export function standardAusfuehren(programm, argumente, optionen = {}) {
  const ergebnis = spawnSync(programm, argumente, {
    cwd: optionen.cwd,
    env: optionen.env,
    input: optionen.eingabe,
    timeout: optionen.zeitgrenzeMs ?? 60_000,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  })
  return { status: ergebnis.status, stdout: ergebnis.stdout ?? '', stderr: ergebnis.stderr ?? '', fehler: ergebnis.error?.message ?? null }
}

/**
 * Sucht ein Programm in den absoluten PATH-Einträgen (unter Windows mit .exe/.com) — der Arbeitsordner
 * wird nie durchsucht (ein Programm gleichen Namens im Projekt würde sonst gestartet).
 * @param name - Programmname ohne Endung
 * @param pfadVariable - Inhalt von PATH
 * @param plattform - process.platform
 * @param gibtEs - Existenzprüfung (Tests)
 * @returns absoluter Pfad oder null
 */
export function findeProgramm(name, pfadVariable = process.env.PATH ?? process.env.Path ?? '', plattform = process.platform, gibtEs = existsSync) {
  // Pfadregeln der Zielplattform, nicht des Rechners, auf dem geprüft wird (sonst wäre ein
  // Windows-Pfad auf einem Linux-Runner nie absolut).
  const pfad = plattform === 'win32' ? win32 : posix
  const endungen = plattform === 'win32' ? ['.exe', '.com'] : ['']
  for (const eintrag of pfadVariable.split(pfad.delimiter)) {
    const ordner = eintrag.trim().replace(/^"(.*)"$/, '$1')
    if (ordner.length === 0 || !pfad.isAbsolute(ordner)) continue
    for (const endung of endungen) {
      const kandidat = pfad.join(ordner, `${name}${endung}`)
      if (gibtEs(kandidat)) return kandidat
    }
  }
  return null
}

/**
 * Liest package.json tolerant.
 * @param wurzel - Projektordner
 * @returns Objekt oder null
 */
function lesePaket(wurzel) {
  try {
    return JSON.parse(readFileSync(join(wurzel, 'package.json'), 'utf8'))
  } catch {
    return null
  }
}

/** Letzte nicht leere Zeilen eines Textes (für knappe Fehlerausgaben). */
const letzteZeilen = (text, anzahl = 5) =>
  text
    .split(/\r?\n/)
    .map((z) => z.trimEnd())
    .filter((z) => z.length > 0)
    .slice(-anzahl)

/**
 * (a) Platzhalter-Skripte.
 * @param wurzel - Projektordner
 * @returns { stufe: 'gruen'|'rot', zeilen }
 */
export function pruefePlatzhalter(wurzel) {
  const paket = lesePaket(wurzel)
  if (paket === null) return { stufe: 'rot', zeilen: ['package.json fehlt oder ist ungültig'] }
  const skripte = paket.scripts ?? {}
  const offen = PFLICHT_SKRIPTE.filter((name) => typeof skripte[name] !== 'string' || skripte[name].includes(PLATZHALTER_MARKER))
  if (offen.length === 0) return { stufe: 'gruen', zeilen: [`lint, typecheck, test sind eingerichtet`] }
  return { stufe: 'rot', zeilen: [`Platzhalter statt Gate: ${offen.join(', ')} — Gate-Vorlage anwenden: ${GATE_VORLAGE}`] }
}

/**
 * Findet npm-cli.js: npm_execpath (gesetzt, wenn über `npm run` gestartet), sonst neben node.
 * @param execPath - process.execPath
 * @param npmExecpath - process.env.npm_execpath
 * @param gibtEs - Existenzprüfung
 * @returns Pfad oder null
 */
export function findeNpmCli(execPath = process.execPath, npmExecpath = process.env.npm_execpath, gibtEs = existsSync) {
  const kandidaten = []
  if (typeof npmExecpath === 'string' && npmExecpath.toLowerCase().endsWith('npm-cli.js')) kandidaten.push(npmExecpath)
  kandidaten.push(join(dirname(execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'))
  kandidaten.push(join(dirname(execPath), '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'))
  return kandidaten.find((k) => gibtEs(k)) ?? null
}

/**
 * (b) Abhängigkeits-Scan.
 * @param wurzel - Projektordner
 * @param ausfuehren - Ausführer (Tests)
 * @param npmCli - Pfad zu npm-cli.js oder null
 * @returns { stufe: 'gruen'|'hinweis'|'rot', zeilen }
 */
export function pruefeAbhaengigkeiten(wurzel, ausfuehren = standardAusfuehren, npmCli = findeNpmCli()) {
  if (!existsSync(join(wurzel, 'package-lock.json'))) {
    return { stufe: 'hinweis', zeilen: ['Abhängigkeits-Scan übersprungen: keine package-lock.json (Lock-Datei committen, dann läuft npm audit)'] }
  }
  if (npmCli === null) return { stufe: 'rot', zeilen: ['npm audit nicht gelaufen: npm-cli.js nicht gefunden'] }
  const ergebnis = ausfuehren(process.execPath, [npmCli, 'audit', '--audit-level=high'], { cwd: wurzel, zeitgrenzeMs: 120_000 })
  if (ergebnis.status === 0) return { stufe: 'gruen', zeilen: ['npm audit --audit-level=high: keine hohen oder kritischen Befunde'] }
  const text = `${ergebnis.stdout}\n${ergebnis.stderr}`
  const befund = /\d+\s+(high|critical)\b|severity:\s*(high|critical)/i.test(text)
  const kopf = befund ? 'npm audit: hohe oder kritische Befunde' : `npm audit nicht ausführbar (Netz? Exit ${ergebnis.status ?? ergebnis.fehler ?? 'unbekannt'}) — nicht gelaufen ist nicht grün`
  return { stufe: 'rot', zeilen: [kopf, ...letzteZeilen(text).map((z) => `  ${z}`)] }
}

/**
 * (c) Secret-Scan — gitleaks, sonst Docker, sonst Hinweis.
 * @param wurzel - Projektordner (wird vollständig gescannt, --no-git, wie in der CI)
 * @param ausfuehren - Ausführer (Tests)
 * @param finde - Programmsuche (Tests)
 * @returns { stufe: 'gruen'|'hinweis'|'rot', zeilen, werkzeug }
 */
export function pruefeSecrets(wurzel, ausfuehren = standardAusfuehren, finde = findeProgramm) {
  const quelle = resolve(wurzel)
  let werkzeug = null
  let ergebnis = null
  const gitleaks = finde('gitleaks')
  const docker = finde('docker')
  if (gitleaks !== null) {
    // Gefunden, aber nicht startbar ist ein kaputtes Werkzeug, kein fehlendes — rot statt Ausweichen.
    const version = ausfuehren(gitleaks, ['version'], { zeitgrenzeMs: 20_000 })
    if (version.status !== 0) {
      return { stufe: 'rot', werkzeug: null, zeilen: [`Secret-Scan nicht gelaufen: gitleaks gefunden (${gitleaks}), aber nicht startbar (${version.fehler ?? `Exit ${version.status}`}) — Installation prüfen`] }
    }
    werkzeug = `gitleaks (${gitleaks})`
    ergebnis = ausfuehren(gitleaks, ['detect', '--source', quelle, '--no-git', '--redact', '--no-banner', '-v'], { cwd: quelle, zeitgrenzeMs: 300_000 })
  } else if (docker !== null) {
    const info = ausfuehren(docker, ['info', '--format', '{{.ServerVersion}}'], { zeitgrenzeMs: 30_000 })
    if (info.status !== 0) {
      return { stufe: 'hinweis', werkzeug: null, zeilen: [`Secret-Scan NICHT gelaufen: kein gitleaks im PATH; Docker gefunden (${docker}), aber nicht erreichbar (Dienst aus?) — Funde zeigt erst die CI`] }
    }
    werkzeug = `Docker (${GITLEAKS_BILD})`
    ergebnis = ausfuehren(docker, ['run', '--rm', '-v', `${quelle}:/repo`, GITLEAKS_BILD, 'detect', '--source', '/repo', '--no-git', '--redact', '--no-banner', '-v'], { zeitgrenzeMs: 600_000 })
  }
  if (ergebnis === null) {
    return { stufe: 'hinweis', werkzeug: null, zeilen: ['Secret-Scan NICHT gelaufen: weder gitleaks noch Docker im PATH — Funde zeigt erst die CI'] }
  }
  if (ergebnis.status === 0) return { stufe: 'gruen', werkzeug, zeilen: [`Secret-Scan (${werkzeug}): keine Funde`] }
  const kopf = ergebnis.status === 1 ? `Secret-Scan (${werkzeug}): Funde` : `Secret-Scan (${werkzeug}) fehlgeschlagen (Exit ${ergebnis.status ?? ergebnis.fehler ?? 'unbekannt'}) — nicht gelaufen ist nicht grün`
  const details = `${ergebnis.stdout}\n${ergebnis.stderr}`
    .split(/\r?\n/)
    .filter((z) => /^(Finding|Secret|RuleID|File|Line):/.test(z.trim()) || /leaks? found/i.test(z))
    .slice(0, 40)
  return { stufe: 'rot', werkzeug, zeilen: [kopf, ...(details.length > 0 ? details : letzteZeilen(`${ergebnis.stdout}\n${ergebnis.stderr}`)).map((z) => `  ${z.trim()}`)] }
}

/**
 * Sammelt die Hook-Befehle aus einer geparsten settings.json (dedupliziert).
 * @param settings - geparstes Objekt
 * @returns Befehlstexte
 */
function hookBefehle(settings) {
  const befehle = new Set()
  for (const eintraege of Object.values(settings?.hooks ?? {})) {
    if (!Array.isArray(eintraege)) continue
    for (const eintrag of eintraege) {
      for (const hook of Array.isArray(eintrag?.hooks) ? eintrag.hooks : []) {
        if (typeof hook?.command === 'string') befehle.add(hook.command.trim())
      }
    }
  }
  return [...befehle]
}

/**
 * (d) Hook-Probelauf.
 * @param wurzel - Projektordner
 * @param ausfuehren - Ausführer (Tests)
 * @returns { stufe: 'gruen'|'hinweis'|'rot', zeilen }
 */
export function pruefeHooks(wurzel, ausfuehren = standardAusfuehren) {
  const settingsPfad = join(wurzel, '.claude', 'settings.json')
  if (!existsSync(settingsPfad)) return { stufe: 'hinweis', zeilen: ['Hooks: keine .claude/settings.json — keine Hooks zu prüfen'] }
  let settings
  try {
    settings = JSON.parse(readFileSync(settingsPfad, 'utf8'))
  } catch (fehler) {
    return { stufe: 'rot', zeilen: [`Hooks: .claude/settings.json ist kein gültiges JSON (${fehler.message})`] }
  }
  const eingabe = JSON.stringify({ cwd: wurzel, session_id: 'check-gates', tool_name: 'Bash', tool_input: { command: 'echo check-gates' } })
  const zeilen = []
  let rot = false
  let hinweis = false
  for (const befehl of hookBefehle(settings)) {
    const treffer = befehl.match(/^node\s+("?)([^"\s]+)\1$/)
    if (treffer === null) {
      hinweis = true
      zeilen.push(`⚠ ${befehl}: nicht prüfbar (nur die Form 'node <pfad>' wird probehalber gestartet)`)
      continue
    }
    // $CLAUDE_PROJECT_DIR setzt Claude Code auf die Projektwurzel — hier dieselbe Auflösung.
    const datei = resolve(wurzel, treffer[2].replace(/^(\$CLAUDE_PROJECT_DIR|\$\{CLAUDE_PROJECT_DIR\}|%CLAUDE_PROJECT_DIR%)(?=[\\/])/, () => wurzel))
    if (!existsSync(datei)) {
      rot = true
      zeilen.push(`✗ ${befehl}: Datei fehlt — der Hook schlüge fehl und ließe den Befehl durch`)
      continue
    }
    const ergebnis = ausfuehren(process.execPath, [datei], { cwd: wurzel, eingabe, zeitgrenzeMs: 10_000, env: { ...process.env, CLAUDE_PROJECT_DIR: wurzel } })
    if (ergebnis.status === 0) {
      zeilen.push(`✓ ${befehl}`)
    } else {
      rot = true
      const grund = letzteZeilen(ergebnis.stderr, 1)[0] ?? ergebnis.fehler ?? `Exit ${ergebnis.status}`
      zeilen.push(`✗ ${befehl}: stürzt ab (${grund}) — ein abgestürzter Hook lässt den Befehl durch`)
    }
  }
  if (zeilen.length === 0) return { stufe: 'hinweis', zeilen: ['Hooks: settings.json trägt keine Hooks'] }
  return { stufe: rot ? 'rot' : hinweis ? 'hinweis' : 'gruen', zeilen: [`Hooks (${zeilen.length}):`, ...zeilen.map((z) => `  ${z}`)] }
}

const ZEICHEN = { gruen: '✓', hinweis: '⚠', rot: '✗' }

/**
 * Führt alle Teile aus und druckt sie.
 * @param wurzel - Projektordner
 * @returns Exit-Code (0/1)
 */
export function fuehreGatesAus(wurzel) {
  console.log('\n=== Mindest-Gates ===\n')
  const teile = [
    ['(a) Platzhalter', pruefePlatzhalter(wurzel)],
    ['(b) Abhängigkeiten', pruefeAbhaengigkeiten(wurzel)],
    ['(c) Secret-Scan', pruefeSecrets(wurzel)],
    ['(d) Hooks', pruefeHooks(wurzel)],
  ]
  for (const [name, { stufe, zeilen }] of teile) {
    console.log(`${ZEICHEN[stufe]} ${name}: ${zeilen[0]}`)
    for (const zeile of zeilen.slice(1)) console.log(`  ${zeile}`)
  }
  const rot = teile.filter(([, e]) => e.stufe === 'rot').length
  console.log(rot === 0 ? '\n✓ Mindest-Gates ohne roten Teil.\n' : `\n✗ ${rot} Teil(e) rot.\n`)
  return rot === 0 ? 0 : 1
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exit(fuehreGatesAus(process.cwd()))
}
