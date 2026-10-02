/**
 * Datei: scripts/leitstand/routen-code.mjs
 *
 * Zweck: Leseroute GET /api/code und GET /api/code/diff (F46 D4, docs/design/abgleich-f46.md §4.12,
 * §4.11, §1 Kopfleiste) — was sich im Repo des Projekts geändert hat und wie man es sichert, dazu die
 * Arbeitsumgebung für „Auftrag anlegen“. Rein lesend: Der Server führt Git aus, ändert aber nichts.
 *
 * Felder von GET /api/code (jedes Feld trägt einen eigenen Status, nie ein 500):
 * - status: 'ok' | 'nicht_verfuegbar' (kein Git oder die Repo-Wurzel ist kein Git-Arbeitsverzeichnis)
 * - absoluterPfad: Repo-Wurzel der Instanz (für VS Code und „Pfad kopieren“)
 * - branch: { status, name | null, losgeloest, commit }
 * - basis: { status, ref ('origin/main' oder 'main'), voraus, zurueck }
 * - remoteWebUrl: { status, url | null } — nur github.com über https bzw. git@github.com:, sonst null
 * - dateien: { status, eintraege: [{ pfad, art, alterPfad?, plus, minus }], anzahl, gekappt }
 * - verlauf: { status, ref, eintraege: [{ hash, kurz, zeit, betreff, zuordnung, abstandMinuten }] }
 * - freigabeCommit: { status, vorhanden, alterMinuten } — nur Metadaten (Dateizeit), kein Inhalt
 * - harness: { status, claudeMd, settings, hooks, agents } — nur Vorhandensein
 * - startvorlage: Auszug der geladenen Startvorlage (Allowlist, s. baueStartvorlageAuszug)
 *
 * Sicherheitsgrenzen:
 * - Git wird als absoluter Pfad aus den absoluten PATH-Einträgen gestartet (nie per bloßem Namen — unter
 *   Windows würde sonst zuerst die Repo-Wurzel durchsucht), mit einer Umgebung ohne geerbte GIT_*-Variablen
 *   und mit '--literal-pathspecs' (Pfade nach '--' sind wörtlich).
 * - Git nur über execFile (asynchron, ohne Shell), immer mit '--no-optional-locks' (kein
 *   .git/index.lock, kein Index-Auffrischen) und '-c core.quotePath=false', dazu
 *   '-c core.fsmonitor=false' (kein Fremdprogramm beim status) und für Diffs '--no-ext-diff
 *   --no-textconv' (kein externes Diff-Programm aus der Repo-Konfiguration). Diffs gegen HEAD über
 *   das Plumbing 'diff-index' — das Porcelain 'git diff' schreibt den Index beim Auffrischen trotz
 *   --no-optional-locks (im Test belegt). Zeitgrenze je Aufruf GIT_ZEITGRENZE_MS, Ausgabe begrenzt
 *   (maxBuffer), cwd = Repo-Wurzel der Instanz. Befehle: rev-parse, symbolic-ref, rev-list, remote
 *   get-url, status, diff-index, log, diff --no-index (nur für neue Dateien) — keiner ändert etwas.
 * - Die Repo-Wurzel muss die Wurzel des Arbeitsverzeichnisses sein (rev-parse --show-toplevel) —
 *   sonst liefe Git gegen ein umgebendes Repo.
 * - Kein Teil der Anfrage wird ein Git-Argument außer dem Parameter 'pfad' von /api/code/diff. Der
 *   wird geprüft (pruefeDiffPfad: nicht leer, keine Steuerzeichen, nicht absolut, kein '..', kein
 *   führendes '-') und muss in der AKTUELLEN Dateiliste stehen (Allowlist); er wird nach '--'
 *   übergeben.
 * - Diff-Ausgabe gekappt (DIFF_MAX_BYTES, Kennzeichen 'gekuerzt').
 *
 * Wird aufgerufen von:
 * - scripts/leitstand-server.mjs (GET /api/code, GET /api/code/diff, je Projektinstanz über den Dispatcher)
 * - scripts/leitstand/routen-code.test.mjs (node:test)
 *
 * Wichtig: Git-Ausgaben, Pfade und Commit-Betreffe gehen roh an den Client; dort werden sie escaped
 * (public/leitstand/views/code.js).
 */

import { execFile } from 'node:child_process'
import { statSync } from 'node:fs'
import { lstat, readdir, readFile, realpath, stat } from 'node:fs/promises'
import { basename, isAbsolute, join, relative, resolve } from 'node:path'

/** Zeitgrenze je Git-Aufruf. */
export const GIT_ZEITGRENZE_MS = 5000

/** Höchstzahl der Einträge in der Dateiliste. */
export const MAX_DATEIEN = 500

/** Höchstzahl der Commits im Verlauf. */
export const MAX_VERLAUF = 20

/** Höchstgröße einer Diff-Antwort in Bytes; darüber 'gekuerzt'. */
export const DIFF_MAX_BYTES = 64 * 1024

/** Höchstgröße der Ausgabe von status/numstat/log (Schutz vor einem entgleisten Repo). */
const LISTE_MAX_BYTES = 8 * 1024 * 1024

/** Höchstlänge des Parameters 'pfad'. */
const MAX_PFAD_LAENGE = 4096

/** Feste Optionen vor jedem Git-Befehl. */
// --literal-pathspecs: ein Pfad nach '--' ist immer wörtlich (kein Glob, keine ':(…)'-Magie, Prüfpass cr 8).
const GIT_GRUNDARGUMENTE = Object.freeze(['--no-optional-locks', '--literal-pathspecs', '-c', 'core.quotePath=false', '-c', 'core.fsmonitor=false', '-c', 'color.ui=never'])

/** Gesamtbudget der Zeilenzählung neuer Dateien (Prüfpass cr 5: der Event-Loop bleibt frei). */
const NEU_ZAEHLEN_BUDGET_BYTES = 8 * 1024 * 1024

/** Zwischenspeicher des aufgelösten Git-Programms (undefined = noch nicht gesucht, null = nicht gefunden). */
let gitProgrammCache

/**
 * Sucht git als absoluten Pfad in den ABSOLUTEN Einträgen von PATH (Prüfpass cr 3): Mit einem bloßen
 * Programmnamen sucht Windows zuerst im cwd des Kindprozesses — das wäre hier die Repo-Wurzel, in die
 * ein Lauf schreiben kann. Relative PATH-Einträge werden übersprungen.
 * @param pfadVariable - Inhalt von PATH
 * @param plattform - process.platform
 * @returns absoluter Pfad oder null
 */
export function findeGitProgramm(pfadVariable = process.env.PATH ?? '', plattform = process.platform) {
  const trenner = plattform === 'win32' ? ';' : ':'
  const name = plattform === 'win32' ? 'git.exe' : 'git'
  for (const eintrag of pfadVariable.split(trenner)) {
    const ordner = eintrag.trim().replace(/^"(.*)"$/, '$1')
    if (ordner === '' || !isAbsolute(ordner)) continue
    try {
      const kandidat = join(ordner, name)
      if (statSync(kandidat).isFile()) return kandidat
    } catch {
      // Eintrag ohne git — weiter.
    }
  }
  return null
}

/** @returns das aufgelöste Git-Programm (einmal je Prozess gesucht) oder null. */
function gitProgramm() {
  if (gitProgrammCache === undefined) gitProgrammCache = findeGitProgramm()
  return gitProgrammCache
}

/**
 * Umgebung der Git-Aufrufe: ohne geerbte GIT_*-Variablen (GIT_DIR, GIT_WORK_TREE, GIT_INDEX_FILE …
 * lenkten Git sonst an der Repo-Wurzel vorbei, Prüfpass cr 9), dazu feste Werte.
 * @returns env
 */
function gitUmgebung() {
  const env = Object.fromEntries(Object.entries(process.env).filter(([schluessel]) => !/^GIT_/i.test(schluessel)))
  return { ...env, GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0', GIT_PAGER: 'cat', LC_ALL: 'C' }
}

/** Basis-Refs in Vorzugsreihenfolge: origin/main ist nach einem Fetch frischer als ein lokales main. */
const BASIS_REFS = Object.freeze(['origin/main', 'main'])

/** Ersatzzeichen U+FFFD am Textende (Schnitt in einem Mehrbyte-Zeichen). */
const ERSATZZEICHEN_AM_ENDE = new RegExp(`${String.fromCharCode(0xfffd)}+$`)

/** Steuerzeichen (inkl. NUL) — in einem Pfadparameter nie zulässig. */
const STEUERZEICHEN = /[\u0000-\u001f\u007f]/

/** Zulässige GitHub-Remotes: Besitzer und Repo nur aus diesen Zeichen. */
const GITHUB_HTTPS = /^https:\/\/github\.com\/([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+?)(?:\.git)?\/?$/
const GITHUB_SSH = /^git@github\.com:([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+?)(?:\.git)?$/

/**
 * Führt einen Git-Befehl aus (Standard-Ausführer). Wirft nie.
 * @param repoWurzel - cwd
 * @param args - Argumente nach den Grundargumenten
 * @param optionen - { maxBytes, zeitgrenzeMs, erfolgsCodes: zusätzliche Exit-Codes, die als Erfolg gelten }
 * @returns Promise<{ ok: true, stdout: Buffer, gekuerzt } | { ok: false, art: 'fehlt' | 'zeit' | 'fehler', grund }>
 */
export function fuehreGitAus(repoWurzel, args, { maxBytes = LISTE_MAX_BYTES, zeitgrenzeMs = GIT_ZEITGRENZE_MS, erfolgsCodes = [] } = {}) {
  const programm = gitProgramm()
  if (programm === null) return Promise.resolve({ ok: false, art: 'fehlt', grund: 'git ist nicht installiert oder nicht im PATH' })
  return new Promise((aufloesen) => {
    execFile(
      programm,
      [...GIT_GRUNDARGUMENTE, ...args],
      {
        cwd: repoWurzel,
        encoding: 'buffer',
        maxBuffer: maxBytes,
        timeout: zeitgrenzeMs,
        killSignal: 'SIGKILL',
        windowsHide: true,
        shell: false,
        env: gitUmgebung(),
      },
      (fehler, stdout, stderr) => {
        if (fehler === null) {
          aufloesen({ ok: true, stdout, gekuerzt: false })
          return
        }
        if (fehler.code === 'ENOENT') {
          // Das Programm ist absolut aufgelöst — ENOENT heißt hier: das Arbeitsverzeichnis fehlt.
          aufloesen({ ok: false, art: 'fehler', grund: 'Arbeitsverzeichnis nicht gefunden' })
          return
        }
        if (fehler.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') {
          aufloesen({ ok: true, stdout: Buffer.isBuffer(stdout) ? stdout.subarray(0, maxBytes) : Buffer.alloc(0), gekuerzt: true })
          return
        }
        if (fehler.killed === true || fehler.signal === 'SIGKILL') {
          aufloesen({ ok: false, art: 'zeit', grund: `Zeitgrenze von ${zeitgrenzeMs} ms überschritten` })
          return
        }
        // Ein zulässiger Exit-Code zählt nur mit Ausgabe als Erfolg — diff --no-index endet auch bei einem
        // Fehler mit Code 1, dann aber ohne Diff (Prüfpass cr 7).
        if (typeof fehler.code === 'number' && erfolgsCodes.includes(fehler.code) && Buffer.isBuffer(stdout) && stdout.length > 0) {
          aufloesen({ ok: true, stdout, gekuerzt: false })
          return
        }
        const meldung = Buffer.isBuffer(stderr) ? stderr.toString('utf8').trim().split(/\r?\n/)[0] : ''
        aufloesen({ ok: false, art: 'fehler', grund: meldung || `git beendet mit Code ${fehler.code}` })
      }
    )
  })
}

/**
 * Feldstatus eines gescheiterten Git-Aufrufs.
 * @param ergebnis - ok:false-Ergebnis von fuehreGitAus
 * @returns { status: 'fehler', grund }
 */
function feldFehler(ergebnis) {
  console.warn(`[leitstand] GET …/code: Git-Feld fehlgeschlagen (${ergebnis.art}): ${ergebnis.grund}`)
  return { status: 'fehler', grund: ergebnis.grund }
}

/**
 * Text einer Git-Ausgabe (UTF-8, unverändert).
 * @param puffer - stdout
 * @returns Text
 */
function text(puffer) {
  return puffer.toString('utf8')
}

/**
 * Wandelt eine Remote-URL in eine GitHub-Web-Adresse — nur für github.com über https (ohne
 * Zugangsdaten) bzw. git@github.com:. Rein.
 * @param remote - Ausgabe von git remote get-url origin
 * @returns 'https://github.com/<besitzer>/<repo>' oder null
 */
export function githubWebUrl(remote) {
  if (typeof remote !== 'string') return null
  const roh = remote.trim()
  const treffer = roh.match(GITHUB_HTTPS) ?? roh.match(GITHUB_SSH)
  if (treffer === null) return null
  const [, besitzer, repo] = treffer
  if (repo === '' || repo === '.' || repo === '..') return null
  return `https://github.com/${besitzer}/${repo}`
}

/**
 * Art eines Eintrags aus 'git status --porcelain' (XY).
 * @param xy - zwei Zeichen
 * @returns 'A' | 'M' | 'D' | 'R' | '??'
 */
export function artAusStatus(xy) {
  if (xy === '??') return '??'
  if (xy.includes('R') || xy.includes('C')) return 'R'
  if (xy.includes('D')) return 'D'
  if (xy.includes('A')) return 'A'
  return 'M'
}

/**
 * Zerlegt 'git status --porcelain=v1 -z'. Rein.
 * @param roh - Ausgabe als Text
 * @returns [{ pfad, art, xy, alterPfad? }]
 */
export function parseStatus(roh) {
  const teile = roh.split('\0')
  const eintraege = []
  for (let i = 0; i < teile.length; i++) {
    const teil = teile[i]
    if (teil.length < 4) continue
    const xy = teil.slice(0, 2)
    const pfad = teil.slice(3)
    if (xy === '!!') continue
    const art = artAusStatus(xy)
    // xy roh mit: der Client unterscheidet daran eine gestagte Löschung („D “) von einer ungestagten („ D“).
    if (art === 'R') {
      // Bei Umbenennen und Kopieren folgt der alte Pfad als eigener Teil.
      const alterPfad = teile[i + 1] ?? ''
      i++
      eintraege.push({ pfad, art, xy, alterPfad })
    } else {
      eintraege.push({ pfad, art, xy })
    }
  }
  return eintraege
}

/**
 * Zerlegt 'git diff --numstat -z -M'. Rein.
 * @param roh - Ausgabe als Text
 * @returns Map pfad → { plus, minus } (null bei Binärdateien)
 */
export function parseNumstat(roh) {
  const teile = roh.split('\0')
  const zahlen = new Map()
  const zahl = (wert) => (wert === '-' ? null : Number.parseInt(wert, 10))
  for (let i = 0; i < teile.length; i++) {
    const treffer = teile[i].match(/^(-|\d+)\t(-|\d+)\t(.*)$/s)
    if (treffer === null) continue
    const [, plus, minus, pfad] = treffer
    if (pfad === '') {
      // Umbenennung: alter und neuer Pfad folgen als eigene Teile.
      const neu = teile[i + 2] ?? ''
      i += 2
      zahlen.set(neu, { plus: zahl(plus), minus: zahl(minus) })
    } else {
      zahlen.set(pfad, { plus: zahl(plus), minus: zahl(minus) })
    }
  }
  return zahlen
}

/**
 * Zuordnung aus einem Commit-Betreff nach dem Muster „F46 D3: … (#312)“ bzw. „F44 WS-7a: …“. Rein.
 * @param betreff - erste Zeile der Commit-Nachricht
 * @returns { feature, ws, pr } — je null, wenn nicht eindeutig erkennbar
 */
export function parseZuordnung(betreff) {
  const s = typeof betreff === 'string' ? betreff : ''
  const kopf = s.match(/^(F\d+[a-z]?)(?:\s+((?:WS-?\d+[a-z]?)|(?:[A-Z]{1,2}\d+[a-z]?)))?\s*:/)
  const pr = s.match(/\(#(\d+)\)\s*$/)
  return { feature: kopf?.[1] ?? null, ws: kopf?.[2] ?? null, pr: pr === null ? null : Number.parseInt(pr[1], 10) }
}

/**
 * Herkunft einer Anfrage an /api/code*: Diese GETs starten Git-Prozesse. Ein Browser schickt
 * Sec-Fetch-Site mit; alles außer 'same-origin' und 'none' (Adressleiste) kommt von einer fremden Seite
 * und wird abgelehnt (Prüfpass D4, cr 2). Ohne den Kopf (curl, Node-fetch) bleibt die Anfrage zulässig —
 * wie beim CSRF-Haken F-813; die Host-Allowlist (F-814) greift davor für jede Methode. Rein.
 * @param req - Anfrage (nur headers)
 * @returns null (zulässig) oder ein Grund
 */
export function pruefeCodeHerkunft(req) {
  const herkunft = req?.headers?.['sec-fetch-site']
  if (typeof herkunft !== 'string' || herkunft === 'same-origin' || herkunft === 'none') return null
  return `Anfrage abgelehnt: /api/code nur aus dem Leitstand selbst (Sec-Fetch-Site: ${herkunft})`
}

/**
 * Prüft den Pfadparameter von /api/code/diff (ohne Allowlist). Rein.
 * @param pfad - Wert des Query-Parameters 'pfad'
 * @returns null (zulässig) oder ein Grund
 */
export function pruefeDiffPfad(pfad) {
  if (typeof pfad !== 'string' || pfad === '') return 'Parameter pfad fehlt'
  if (pfad.length > MAX_PFAD_LAENGE) return 'Parameter pfad ist zu lang'
  if (STEUERZEICHEN.test(pfad)) return 'Parameter pfad enthält Steuerzeichen'
  if (pfad.startsWith('-')) return 'Parameter pfad beginnt mit "-"'
  if (isAbsolute(pfad) || /^[A-Za-z]:/.test(pfad) || pfad.startsWith('/') || pfad.startsWith('\\')) return 'Parameter pfad ist absolut'
  if (pfad.split(/[/\\]/).includes('..')) return 'Parameter pfad enthält ".."'
  return null
}

/**
 * Vergleicht zwei Pfade (realpath, unter Windows ohne Groß-/Kleinschreibung).
 * @param a - Pfad
 * @param b - Pfad
 * @returns true bei gleichem Ort
 */
async function gleicherOrt(a, b) {
  try {
    const [ra, rb] = await Promise.all([realpath(a), realpath(b)])
    const norm = (p) => (process.platform === 'win32' ? resolve(p).toLowerCase() : resolve(p))
    return norm(ra) === norm(rb)
  } catch {
    return false
  }
}

/**
 * Stellt fest, ob Git verfügbar ist und die Repo-Wurzel die Wurzel des Arbeitsverzeichnisses ist.
 * @param repoWurzel - Repo-Wurzel der Instanz
 * @param git - Ausführer
 * @returns { ok: true } | { ok: false, grund }
 */
async function pruefeRepo(repoWurzel, git) {
  const ergebnis = await git(repoWurzel, ['rev-parse', '--show-toplevel'])
  if (!ergebnis.ok) return { ok: false, grund: ergebnis.grund }
  const wurzel = text(ergebnis.stdout).trim()
  if (wurzel === '' || !(await gleicherOrt(wurzel, repoWurzel))) return { ok: false, grund: 'Die Repo-Wurzel ist nicht die Wurzel eines Git-Arbeitsverzeichnisses' }
  return { ok: true }
}

/**
 * Aktueller Branch.
 * @param repoWurzel - cwd
 * @param git - Ausführer
 * @returns Feld branch
 */
async function leseBranch(repoWurzel, git) {
  const symbolisch = await git(repoWurzel, ['symbolic-ref', '--short', '-q', 'HEAD'])
  if (symbolisch.ok) {
    const commit = await git(repoWurzel, ['rev-parse', '--short', '-q', '--verify', 'HEAD'])
    return { status: 'ok', name: text(symbolisch.stdout).trim(), losgeloest: false, commit: commit.ok ? text(commit.stdout).trim() : null }
  }
  if (symbolisch.art !== 'fehler') return feldFehler(symbolisch)
  const commit = await git(repoWurzel, ['rev-parse', '--short', '-q', '--verify', 'HEAD'])
  if (!commit.ok) return feldFehler(commit)
  return { status: 'ok', name: null, losgeloest: true, commit: text(commit.stdout).trim() }
}

/**
 * Basis-Ref (origin/main, sonst main).
 * @param repoWurzel - cwd
 * @param git - Ausführer
 * @returns Ref-Name oder null
 */
async function findeBasisRef(repoWurzel, git) {
  for (const ref of BASIS_REFS) {
    const voll = ref === 'main' ? 'refs/heads/main' : `refs/remotes/${ref}`
    const ergebnis = await git(repoWurzel, ['rev-parse', '-q', '--verify', `${voll}^{commit}`])
    if (ergebnis.ok) return ref
  }
  return null
}

/**
 * Commits voraus/zurück gegenüber der Basis.
 * @param repoWurzel - cwd
 * @param basisRef - Ref oder null
 * @param git - Ausführer
 * @returns Feld basis
 */
async function leseBasis(repoWurzel, basisRef, git) {
  if (basisRef === null) return { status: 'fehler', grund: 'weder origin/main noch main vorhanden' }
  const zaehlung = await git(repoWurzel, ['rev-list', '--left-right', '--count', `${basisRef}...HEAD`])
  if (!zaehlung.ok) return { ...feldFehler(zaehlung), ref: basisRef }
  const [zurueck, voraus] = text(zaehlung.stdout).trim().split(/\s+/).map((x) => Number.parseInt(x, 10))
  if (!Number.isInteger(zurueck) || !Number.isInteger(voraus)) return { status: 'fehler', grund: 'unerwartete Ausgabe von rev-list', ref: basisRef }
  return { status: 'ok', ref: basisRef, voraus, zurueck }
}

/**
 * Remote origin als GitHub-Web-Adresse.
 * @param repoWurzel - cwd
 * @param git - Ausführer
 * @returns Feld remoteWebUrl
 */
async function leseRemote(repoWurzel, git) {
  const ergebnis = await git(repoWurzel, ['remote', 'get-url', 'origin'])
  // origin: ob es ein Remote „origin“ gibt (der Client schlägt sonst keinen Push vor, Prüfpass qa 9).
  if (!ergebnis.ok) return ergebnis.art === 'fehler' ? { status: 'ok', url: null, origin: false } : feldFehler(ergebnis)
  return { status: 'ok', url: githubWebUrl(text(ergebnis.stdout)), origin: true }
}

/** Höchstzahl neuer (ungetrackter) Dateien, deren Zeilen gezählt werden, und deren Größengrenze. */
const NEU_ZAEHLEN_MAX = 200
const NEU_ZAEHLEN_MAX_BYTES = 1024 * 1024

/**
 * Liste aus 'git status' (sortiert, ungekappt).
 * @param repoWurzel - cwd
 * @param git - Ausführer
 * @returns { ok: true, alle } | Feldstatus { status: 'fehler', grund }
 */
async function leseStatusListe(repoWurzel, git) {
  const status = await git(repoWurzel, ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignore-submodules=dirty'])
  if (!status.ok) return feldFehler(status)
  if (status.gekuerzt) return { status: 'fehler', grund: 'Ausgabe von git status zu groß' }
  return { ok: true, alle: parseStatus(text(status.stdout)).sort((a, b) => (a.pfad < b.pfad ? -1 : a.pfad > b.pfad ? 1 : 0)) }
}

/**
 * Zeilenzahl einer neuen Datei (für „+n“): nur reguläre Dateien bis NEU_ZAEHLEN_MAX_BYTES, keine
 * Verknüpfung (lstat), kein Binärinhalt (NUL-Byte). Wirft nie.
 * @param repoWurzel - Repo-Wurzel
 * @param pfad - repo-relativer Pfad aus git status
 * @returns Zahl oder null
 */
async function zaehleNeueZeilen(repoWurzel, pfad, budget) {
  try {
    const absolut = join(repoWurzel, pfad)
    const info = await lstat(absolut)
    if (!info.isFile() || info.size > NEU_ZAEHLEN_MAX_BYTES || info.size > budget.rest) return null
    budget.rest -= info.size
    const inhalt = await readFile(absolut)
    if (inhalt.includes(0)) return null
    if (inhalt.length === 0) return 0
    let zeilen = 0
    for (let pos = inhalt.indexOf(10); pos !== -1; pos = inhalt.indexOf(10, pos + 1)) zeilen++
    return inhalt[inhalt.length - 1] === 10 ? zeilen : zeilen + 1
  } catch (fehler) {
    console.warn(`[leitstand] GET …/code: Zeilen von '${pfad}' nicht zählbar:`, fehler instanceof Error ? fehler.message : fehler)
    return null
  }
}

/**
 * Geänderte Dateien mit Art und Zeilen (getrackte gegen HEAD, neue Dateien gezählt).
 * @param repoWurzel - cwd
 * @param git - Ausführer
 * @returns Feld dateien
 */
async function leseDateien(repoWurzel, git) {
  const liste = await leseStatusListe(repoWurzel, git)
  if (liste.ok !== true) return liste
  const { alle } = liste
  // Zeilen gegen HEAD (gestaged und ungestaged zusammen); ohne ersten Commit gibt es keine. Plumbing
  // diff-index statt Porcelain diff: 'git diff' frischt den Index auf und schreibt ihn trotz
  // --no-optional-locks (im Test belegt), diff-index nie.
  const numstat = await git(repoWurzel, ['diff-index', '--numstat', '-z', '-M', '--no-ext-diff', '--no-textconv', 'HEAD'])
  const zahlen = numstat.ok && !numstat.gekuerzt ? parseNumstat(text(numstat.stdout)) : new Map()
  const gezeigt = alle.slice(0, MAX_DATEIEN)
  // Neue Dateien nacheinander zählen, mit Gesamtbudget — nie Hunderte Lesevorgänge gleichzeitig.
  let neuGezaehlt = 0
  const budget = { rest: NEU_ZAEHLEN_BUDGET_BYTES }
  const eintraege = []
  for (const e of gezeigt) {
    if (e.art === '??') {
      const plus = neuGezaehlt++ < NEU_ZAEHLEN_MAX ? await zaehleNeueZeilen(repoWurzel, e.pfad, budget) : null
      eintraege.push({ ...e, plus, minus: plus === null ? null : 0 })
    } else {
      const z = zahlen.get(e.pfad)
      eintraege.push({ ...e, plus: z?.plus ?? null, minus: z?.minus ?? null })
    }
  }
  return { status: 'ok', eintraege, anzahl: alle.length, gekappt: alle.length > MAX_DATEIEN }
}

/**
 * Verlauf auf der Basis: die letzten Merge-/Squash-Commits (erste Elternlinie) mit Zuordnung.
 * @param repoWurzel - cwd
 * @param basisRef - Ref oder null
 * @param git - Ausführer
 * @returns Feld verlauf
 */
async function leseVerlauf(repoWurzel, basisRef, git) {
  if (basisRef === null) {
    // Ein Repo ohne ersten Commit hat noch keinen Verlauf — Leerzustand, kein Fehler (Prüfpass qa 7).
    const kopf = await git(repoWurzel, ['rev-parse', '-q', '--verify', 'HEAD^{commit}'])
    if (!kopf.ok && kopf.art === 'fehler') return { status: 'ok', ref: null, eintraege: [] }
    return { status: 'fehler', grund: 'weder origin/main noch main vorhanden' }
  }
  const ergebnis = await git(repoWurzel, ['log', '--first-parent', '--no-show-signature', '-n', String(MAX_VERLAUF + 1), '--format=%H%x1f%h%x1f%cI%x1f%s%x1e', basisRef, '--'])
  if (!ergebnis.ok) return { ...feldFehler(ergebnis), ref: basisRef }
  const commits = text(ergebnis.stdout)
    .split('\x1e')
    .map((z) => z.replace(/^\r?\n/, ''))
    .filter((z) => z.includes('\x1f'))
    .map((z) => {
      const [hash, kurz, zeit, betreff] = z.split('\x1f')
      return { hash, kurz, zeit, betreff: betreff ?? '', zuordnung: parseZuordnung(betreff) }
    })
  const eintraege = commits.slice(0, MAX_VERLAUF).map((c, i) => {
    const vorher = commits[i + 1]
    const abstand = vorher === undefined ? null : Math.round((Date.parse(c.zeit) - Date.parse(vorher.zeit)) / 60000)
    return { ...c, abstandMinuten: Number.isFinite(abstand) ? abstand : null }
  })
  return { status: 'ok', ref: basisRef, eintraege }
}

/**
 * Metadaten von state/freigabe-commit.md (Dateizeit, nie der Inhalt).
 * @param repoWurzel - Repo-Wurzel
 * @param jetzt - Zeitpunkt in ms
 * @returns Feld freigabeCommit
 */
async function leseFreigabeCommit(repoWurzel, jetzt) {
  try {
    const info = await lstat(join(repoWurzel, 'state', 'freigabe-commit.md'))
    if (!info.isFile()) return { status: 'ok', vorhanden: false, alterMinuten: null }
    return { status: 'ok', vorhanden: true, alterMinuten: Math.max(0, Math.floor((jetzt - info.mtimeMs) / 60000)) }
  } catch (fehler) {
    if (fehler?.code === 'ENOENT' || fehler?.code === 'ENOTDIR') return { status: 'ok', vorhanden: false, alterMinuten: null }
    return { status: 'fehler', grund: fehler instanceof Error ? fehler.message : String(fehler) }
  }
}

/**
 * Vorhandensein der Harness-Bausteine (CLAUDE.md, .claude/settings.json, .claude/hooks, .claude/agents).
 * @param repoWurzel - Repo-Wurzel
 * @returns Feld harness
 */
async function leseHarness(repoWurzel) {
  const istDatei = async (pfad) => (await lstat(join(repoWurzel, pfad)).catch(() => null))?.isFile() === true
  const zaehle = async (pfad, endung) => {
    const eintraege = await readdir(join(repoWurzel, pfad), { withFileTypes: true }).catch(() => null)
    return eintraege === null ? 0 : eintraege.filter((e) => e.isFile() && (endung === null || e.name.endsWith(endung))).length
  }
  try {
    const [claudeMd, settings, hooks, agents] = await Promise.all([istDatei('CLAUDE.md'), istDatei('.claude/settings.json'), zaehle('.claude/hooks', null), zaehle('.claude/agents', '.md')])
    return { status: 'ok', claudeMd, settings, hooks, agents }
  } catch (fehler) {
    return { status: 'fehler', grund: fehler instanceof Error ? fehler.message : String(fehler) }
  }
}

/**
 * Anzeigeform eines Prüfbefehls (argv): ein npm-Aufruf über npm-cli.js wird zu „npm …“, sonst die
 * Argumente ab dem Programmnamen (ohne Pfad). Rein.
 * @param argv - Liste oder etwas anderes
 * @returns Text oder null
 */
export function pruefbefehlAnzeige(argv) {
  if (!Array.isArray(argv) || argv.length === 0 || !argv.every((x) => typeof x === 'string')) return null
  const npm = argv.findIndex((x) => /(?:^|[\\/])npm(?:-cli\.js|\.cmd)?$/i.test(x))
  // Argumente mit anderen Zeichen in einfache Anführungszeichen (PowerShell, kopierbar; Prüfpass cr 12).
  const arg = (x) => (/^[A-Za-z0-9._:/=-]+$/.test(x) ? x : `'${x.replace(/['\u2018\u2019\u201A\u201B]/g, '$&$&')}'`)
  if (npm !== -1) return ['npm', ...argv.slice(npm + 1).map(arg)].join(' ')
  return [basename(argv[0].replaceAll('\\', '/')), ...argv.slice(1).map(arg)].join(' ')
}

/**
 * Auszug der geladenen Startvorlage für „Womit gearbeitet wird“ — strikte Allowlist: nie
 * werkzeugStartziel, berechtigungskontext oder Startziele der Worker.
 * @param vorlage - geladene Startvorlage (oder null)
 * @param startvorlagePfad - Pfad, aus dem sie geladen wurde
 * @param repoWurzel - Repo-Wurzel (macht den Pfad repo-relativ, wenn er darin liegt)
 * @returns Feld startvorlage
 */
export function baueStartvorlageAuszug(vorlage, startvorlagePfad, repoWurzel) {
  if (vorlage === null || typeof vorlage !== 'object') return { status: 'fehler', grund: 'keine Startvorlage geladen' }
  let pfad = typeof startvorlagePfad === 'string' ? startvorlagePfad : null
  if (pfad !== null && isAbsolute(pfad)) {
    const rel = relative(resolve(repoWurzel), pfad)
    pfad = rel !== '' && !rel.startsWith('..') && !isAbsolute(rel) ? rel.replaceAll('\\', '/') : basename(pfad)
  }
  const budget = vorlage.standardBudget
  return {
    status: 'ok',
    pfad,
    profilPfad: typeof vorlage.profilPfad === 'string' ? vorlage.profilPfad : null,
    modell: typeof vorlage.modell === 'string' ? vorlage.modell : null,
    worker: ['claude-code', ...Object.keys(vorlage.worker ?? {}).filter((w) => w !== 'claude-code')],
    werkzeugsaetze: Object.keys(vorlage.werkzeugsaetze ?? {}),
    pruefbefehl: pruefbefehlAnzeige(vorlage.pruefbefehl),
    zeitgrenzeMs: typeof vorlage.zeitgrenzeMs === 'number' ? vorlage.zeitgrenzeMs : null,
    pruefZeitgrenzeMs: typeof vorlage.pruefZeitgrenzeMs === 'number' ? vorlage.pruefZeitgrenzeMs : null,
    budget: budget && typeof budget.maxElemente === 'number' && typeof budget.maxBytes === 'number' ? { maxElemente: budget.maxElemente, maxBytes: budget.maxBytes } : null,
  }
}

/**
 * Baut die Projektion für GET /api/code. Wirft nie.
 * @param optionen - { repoWurzel, vorlage, startvorlagePfad, git (Ausführer, Test), jetzt (ms, Test) }
 * @returns Projektion (siehe Dateikopf)
 */
export async function baueCodeProjektion({ repoWurzel, vorlage = null, startvorlagePfad = null, git = fuehreGitAus, jetzt = Date.now() }) {
  const absoluterPfad = resolve(repoWurzel)
  const startvorlage = baueStartvorlageAuszug(vorlage, startvorlagePfad, absoluterPfad)
  // Arbeitsverzeichnis vorhanden? (Prüfpass cr 6: sonst meldete Git ENOENT, und „bereit“ hinge an einem Pfad, den es nicht gibt.)
  const vorhanden = (await stat(absoluterPfad).catch(() => null))?.isDirectory() === true
  const arbeitsverzeichnis = { status: 'ok', vorhanden }
  if (!vorhanden) {
    const fehlt = { status: 'fehler', grund: 'Arbeitsverzeichnis nicht gefunden' }
    return { status: 'nicht_verfuegbar', grund: fehlt.grund, absoluterPfad, arbeitsverzeichnis, harness: fehlt, freigabeCommit: fehlt, startvorlage }
  }
  const [harness, freigabeCommit] = await Promise.all([leseHarness(absoluterPfad), leseFreigabeCommit(absoluterPfad, jetzt)])
  const repo = await pruefeRepo(absoluterPfad, git)
  if (!repo.ok) return { status: 'nicht_verfuegbar', grund: repo.grund, absoluterPfad, arbeitsverzeichnis, harness, freigabeCommit, startvorlage }
  const basisRef = await findeBasisRef(absoluterPfad, git)
  const [branch, basis, remoteWebUrl, dateien, verlauf] = await Promise.all([
    leseBranch(absoluterPfad, git),
    leseBasis(absoluterPfad, basisRef, git),
    leseRemote(absoluterPfad, git),
    leseDateien(absoluterPfad, git),
    leseVerlauf(absoluterPfad, basisRef, git),
  ])
  return { status: 'ok', absoluterPfad, arbeitsverzeichnis, branch, basis, remoteWebUrl, dateien, verlauf, freigabeCommit, harness, startvorlage }
}

/**
 * Text eines (ggf. gekürzten) Diffs.
 * @param ergebnis - ok:true-Ergebnis von fuehreGitAus
 * @returns { text, gekuerzt }
 */
function diffText(ergebnis) {
  const gekuerzt = ergebnis.gekuerzt || ergebnis.stdout.length > DIFF_MAX_BYTES
  const roh = ergebnis.stdout.subarray(0, DIFF_MAX_BYTES).toString('utf8')
  return { text: gekuerzt ? roh.replace(ERSATZZEICHEN_AM_ENDE, '') : roh, gekuerzt }
}

/**
 * Baut die Antwort für GET /api/code/diff?pfad=…. Wirft nie.
 * @param optionen - { repoWurzel, pfad (Rohwert aus der Anfrage), git }
 * @returns { http: 200 | 400 | 404, koerper }
 */
export async function baueCodeDiff({ repoWurzel, pfad, git = fuehreGitAus }) {
  const ungueltig = pruefeDiffPfad(pfad)
  if (ungueltig !== null) return { http: 400, koerper: { grund: ungueltig } }
  const absoluterPfad = resolve(repoWurzel)
  const repo = await pruefeRepo(absoluterPfad, git)
  if (!repo.ok) return { http: 200, koerper: { status: 'nicht_verfuegbar', grund: repo.grund } }
  // Allowlist: nur ein Pfad, der in der aktuellen (ungekappten) Liste geänderter Dateien steht.
  const liste = await leseStatusListe(absoluterPfad, git)
  if (liste.ok !== true) return { http: 200, koerper: liste }
  const eintrag = liste.alle.find((e) => e.pfad === pfad)
  if (eintrag === undefined) return { http: 400, koerper: { grund: 'pfad steht nicht in der aktuellen Liste geänderter Dateien' } }

  const diffOptionen = { maxBytes: DIFF_MAX_BYTES + 1 }
  let ergebnis
  if (eintrag.art === '??') {
    // Neue, ungetrackte Datei: Inhalt als Diff gegen „nichts“ (Exit-Code 1 heißt „unterschiedlich“).
    ergebnis = await git(absoluterPfad, ['diff', '--no-index', '--no-color', '--no-ext-diff', '--no-textconv', '--', '/dev/null', eintrag.pfad], { ...diffOptionen, erfolgsCodes: [1] })
  } else {
    const pfade = eintrag.art === 'R' && eintrag.alterPfad ? [eintrag.alterPfad, eintrag.pfad] : [eintrag.pfad]
    // Plumbing diff-index (schreibt den Index nie, s. leseDateien); ohne ersten Commit gibt es kein
    // HEAD — dann ein Feldfehler.
    ergebnis = await git(absoluterPfad, ['diff-index', '-p', '--no-color', '--no-ext-diff', '--no-textconv', '-M', 'HEAD', '--', ...pfade], diffOptionen)
  }
  if (!ergebnis.ok) return { http: 200, koerper: { status: 'fehler', grund: ergebnis.grund, pfad: eintrag.pfad } }
  return { http: 200, koerper: { status: 'ok', pfad: eintrag.pfad, art: eintrag.art, ...diffText(ergebnis) } }
}
