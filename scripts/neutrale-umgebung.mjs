/**
 * Datei: scripts/neutrale-umgebung.mjs
 *
 * Zweck: Neutrale Umgebung für Render-Instanzen (F45 B2b-3e-1, F-1125, features/F45/plan-b2b3e1-v2.md §2): setzt HOME,
 * USERPROFILE, TEMP und TMP (posix zusätzlich TMPDIR) auf einen Laufordner unter einer Wurzel ohne Benutzernamen
 * (`AIW_NEUTRAL_WURZEL`, sonst `C:\aiw-nachweis` bzw. `/tmp/aiw-nachweis`). `os.tmpdir()`/`os.homedir()` lesen diese
 * Variablen zur Aufrufzeit — Wegwerf-Projekt, Kontrollzustand und angezeigte Pfade einer Instanz liegen danach dort, und
 * Kindprozesse (git, Attrappen) erben sie. LOCALAPPDATA bleibt (Playwright findet Chromium dort). Seit F45 B2b-3e-3:
 * markiereLauf/raeumeAlteLaeufeAuf/istTot — der Starter räumt verwaiste fremde Laufordner unter derselben Wurzel.
 *
 * Wird aufgerufen von: scripts/neutrale-umgebung-starten.mjs (Seiteneffekt für Instanzen),
 * scripts/check-f45-b2b3e1-pfade.mjs, scripts/neutrale-umgebung.test.mjs.
 *
 * Wichtig: kein Seiteneffekt beim Import; Dateisystem und Umgebung sind injizierbar (Entscheidung A5: `npm run check` legt
 * nichts außerhalb des Repos an). Importiert nur `node:`-Module und die Pfadprobe — ein weiteres Modul könnte beim Laden Pfade
 * berechnen, bevor die Variablen gesetzt sind (Gate f45-b2b3e1 (p2b)). Kein Prüfcode: das eigene rmSync ist begründet, weil
 * `raeumeVerzeichnis` (scripts/_aufraeumen.ts) nicht injizierbar ist und Reste ins Repo schreibt.
 */

import * as nodeFs from 'node:fs'
import { posix, win32 } from 'node:path'
import { findePersoenlichePfade } from './render-pfadprobe.mjs'

/**
 * Wurzel der neutralen Laufordner.
 * @param env - Umgebung (AIW_NEUTRAL_WURZEL)
 * @param plattform - process.platform
 * @returns gesetzte Wurzel oder der Plattform-Standard
 */
export function standardWurzel(env = process.env, plattform = process.platform) {
  const gesetzt = typeof env.AIW_NEUTRAL_WURZEL === 'string' ? env.AIW_NEUTRAL_WURZEL.trim() : ''
  if (gesetzt !== '') return gesetzt
  return plattform === 'win32' ? 'C:\\aiw-nachweis' : '/tmp/aiw-nachweis'
}

/**
 * Legt einen Laufordner (`lauf-XXXXXX` mit `home/` und `temp/`) unter der Wurzel an und setzt die Umgebung darauf.
 * @param optionen - wurzel (Standard standardWurzel), env (process.env), fs (node:fs; mkdirSync, mkdtempSync, rmSync,
 *   rmdirSync), plattform (process.platform), warne (console.warn)
 * @returns { laufordner, home, temp, entferne } — entferne() löscht den Laufordner und danach die Wurzel, falls leer; ein
 *   Löschfehler warnt mit dem Pfad und wirft nicht; ein zweiter Aufruf tut nichts
 * @throws Error vor jedem Anlegen und Setzen, wenn die Wurzel nicht absolut ist (relativ landete sie im aktuellen Ordner,
 *   etwa im Repo unter dem Benutzerordner — Korrekturrunde, code-reviewer 1 / qa 1) oder selbst einen persönlichen Pfad
 *   enthält; Error mit Hinweis auf AIW_NEUTRAL_WURZEL, wenn das Anlegen scheitert (kein Schreibrecht, Datei statt Ordner) —
 *   ein schon angelegter Laufordner wird dann wieder entfernt
 */
export function richteNeutraleUmgebungEin({ env = process.env, plattform = process.platform, fs = nodeFs, warne = console.warn, wurzel = standardWurzel(env, plattform) } = {}) {
  const pfad = plattform === 'win32' ? win32 : posix
  if (!pfad.isAbsolute(wurzel)) {
    throw new Error(`Neutrale Umgebung: die Wurzel '${wurzel}' ist kein absoluter Pfad — AIW_NEUTRAL_WURZEL auf einen absoluten Ordner ohne Benutzernamen setzen (z. B. C:\\aiw-nachweis).`)
  }
  if (findePersoenlichePfade(wurzel).length > 0) {
    throw new Error(`Neutrale Umgebung: die Wurzel '${wurzel}' enthält einen persönlichen Pfad — AIW_NEUTRAL_WURZEL auf einen Ordner ohne Benutzernamen setzen (z. B. C:\\aiw-nachweis).`)
  }
  let laufordner = null
  try {
    fs.mkdirSync(wurzel, { recursive: true })
    laufordner = fs.mkdtempSync(pfad.join(wurzel, 'lauf-'))
    fs.mkdirSync(pfad.join(laufordner, 'home'))
    fs.mkdirSync(pfad.join(laufordner, 'temp'))
  } catch (fehler) {
    // Teilweise angelegt (home/temp gescheitert) ⇒ den Laufordner nicht liegen lassen (qa 12).
    if (laufordner !== null) {
      try {
        fs.rmSync(laufordner, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
      } catch {
        warne(`Neutrale Umgebung: Laufordner ${laufordner} nicht entfernt — bitte von Hand löschen.`)
      }
    }
    throw new Error(`Neutrale Umgebung: '${wurzel}' ließ sich nicht anlegen (${fehler instanceof Error ? fehler.message : String(fehler)}) — AIW_NEUTRAL_WURZEL auf einen beschreibbaren Ordner ohne Benutzernamen setzen.`)
  }
  const home = pfad.join(laufordner, 'home')
  const temp = pfad.join(laufordner, 'temp')
  env.HOME = home
  env.USERPROFILE = home
  env.TEMP = temp
  env.TMP = temp
  if (plattform !== 'win32') env.TMPDIR = temp
  let entfernt = false
  const entferne = () => {
    if (entfernt) return
    entfernt = true
    try {
      // Windows hält beim Beenden mitunter noch Handles (F-257) — wiederholen wie scripts/_aufraeumen.ts.
      fs.rmSync(laufordner, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
    } catch (fehler) {
      warne(`Neutrale Umgebung: Laufordner ${laufordner} nicht entfernt (${fehler instanceof Error ? fehler.message : String(fehler)}) — bitte von Hand löschen.`)
      return
    }
    try {
      fs.rmdirSync(wurzel)
    } catch {
      // Nicht leer (andere Instanz läuft) oder gesperrt — die Wurzel bleibt stehen.
    }
  }
  return { laufordner, home, temp, entferne }
}

// ─── F45 B2b-3e-3: alte Laufordner beim Start aufräumen (F-1125, features/F45/plan-w1-v2.md §2) ──────────────────────
// Ein hart beendeter Prozess hinterlässt seinen Laufordner. Der nächste Start räumt fremde Laufordner, deren Prozess tot
// ist (pid-Datei, nur ESRCH = tot) oder die ohne gültige pid älter als 24 h sind — die Wurzel teilen sich parallele
// Worktrees (Auflagen advisor-b2b3e2-delta.md 1–3). Grenzen: eine wiederverwendete PID lässt einen toten Lauf stehen; die
// pid gilt nur auf diesem Rechner — teilen sich Windows und WSL/Sandbox oder ein Netzlaufwerk per AIW_NEUTRAL_WURZEL dieselbe
// Wurzel, gilt ein Lauf der anderen Umgebung als tot (Wurzel nicht teilen); ein von Hand angelegter Ordner `lauf-XXXXXX`, der
// nur home/temp/pid enthält, gilt als Laufordner; je belegtem Ordner wartet rmSync mit Wiederholungen bis ≈ 5,5 s.

const LAUF_NAME = /^lauf-[A-Za-z0-9]{6}$/
const POSITIVE_GANZZAHL = /^[1-9][0-9]*$/
// process.kill nimmt nur int32 — größere Werte würfen ERR_INVALID_ARG_TYPE und hielten den Ordner für immer (code-reviewer 7).
const GROESSTE_PID = 2 ** 31 - 1
const OHNE_PID_ALTER_MS = 24 * 60 * 60 * 1000
// Ein Laufordner enthält nur diese Einträge; nach einem Teil-Löschen (belegte Handles) kann einer fehlen (code-reviewer 1, qa 7).
const LAUF_INHALT = new Set(['home', 'temp', 'pid'])

/**
 * Schreibt die Prozess-ID in `<laufordner>/pid`, damit andere Starts den Lauf als lebendig erkennen.
 * @param laufordner - eigener Laufordner
 * @param optionen - pid (process.pid), fs (node:fs; writeFileSync), plattform (process.platform), warne (console.warn)
 * @returns nichts; ein Schreibfehler warnt und wirft nicht — der Lauf ist dann für andere erst nach 24 h räumbar
 */
export function markiereLauf(laufordner, { pid = process.pid, fs = nodeFs, plattform = process.platform, warne = console.warn } = {}) {
  const pfad = plattform === 'win32' ? win32 : posix
  try {
    fs.writeFileSync(pfad.join(laufordner, 'pid'), String(pid))
  } catch (fehler) {
    warne(`Neutrale Umgebung: pid-Datei in ${laufordner} nicht geschrieben (${fehler instanceof Error ? fehler.message : String(fehler)}) — andere Starts räumen diesen Lauf erst nach 24 h.`)
  }
}

/**
 * true nur, wenn der Prozess sicher nicht mehr läuft: `kill(pid, 0)` wirft mit ESRCH. EPERM (läuft unter anderem Konto),
 * jeder andere Fehler und kein Wurf gelten als lebendig (sichere Richtung).
 * @param pid - positive Ganzzahl
 * @param kill - process.kill (injizierbar)
 * @returns true = tot
 */
export function istTot(pid, kill = (p, signal) => process.kill(p, signal)) {
  try {
    kill(pid, 0)
    return false
  } catch (fehler) {
    return fehler?.code === 'ESRCH'
  }
}

/**
 * Entfernt fremde, verwaiste Laufordner unter der Wurzel. Kandidat ist nur ein echter Ordner (Dirent, keine Symlinks/
 * Junctions) namens `lauf-XXXXXX`, der nichts außer `home`, `temp` und `pid` enthält (auch einen Rest nach Teil-Löschen),
 * nicht der eigene (Basisname). Mit gültiger `pid` (positive Ganzzahl bis 2^31−1) ⇒ entfernen, wenn istTot; sonst ⇒
 * entfernen, wenn älter als 24 h (mtime). Ein gleichzeitig verschwundener Ordner (ENOENT, zweiter Start) wird still übersprungen.
 * @param optionen - wurzel, eigener (eigener Laufordner), fs (node:fs; readdirSync, readFileSync, statSync, rmSync),
 *   istTot, jetzt (Date.now()), plattform, warne
 * @returns Liste der entfernten Pfade; Lese-, stat- und Löschfehler warnen und werfen nicht
 */
export function raeumeAlteLaeufeAuf({ wurzel, eigener, fs = nodeFs, istTot: tot = istTot, jetzt = Date.now(), plattform = process.platform, warne = console.warn }) {
  const pfad = plattform === 'win32' ? win32 : posix
  const meldung = (fehler) => (fehler instanceof Error ? fehler.message : String(fehler))
  let eintraege
  try {
    eintraege = fs.readdirSync(wurzel, { withFileTypes: true })
  } catch (fehler) {
    warne(`Neutrale Umgebung: ${wurzel} nicht lesbar (${meldung(fehler)}) — alte Laufordner nicht aufgeräumt.`)
    return []
  }
  const eigenerName = pfad.basename(eigener)
  const entfernt = []
  for (const eintrag of eintraege) {
    if (!eintrag.isDirectory() || !LAUF_NAME.test(eintrag.name) || eintrag.name === eigenerName) continue
    const ordner = pfad.join(wurzel, eintrag.name)
    try {
      if (!fs.readdirSync(ordner).every((name) => LAUF_INHALT.has(name))) continue
      let pid = ''
      try {
        pid = String(fs.readFileSync(pfad.join(ordner, 'pid'), 'utf8')).trim()
      } catch {
        // Keine pid-Datei: Altbestand aus 3e-1 oder ein Lauf kurz vor markiereLauf ⇒ Altersregel.
      }
      const gueltig = POSITIVE_GANZZAHL.test(pid) && Number(pid) <= GROESSTE_PID
      const verwaist = gueltig ? tot(Number(pid)) : jetzt - fs.statSync(ordner).mtimeMs > OHNE_PID_ALTER_MS
      if (!verwaist) continue
      fs.rmSync(ordner, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
      entfernt.push(ordner)
    } catch (fehler) {
      if (fehler?.code === 'ENOENT') continue
      warne(`Neutrale Umgebung: alter Laufordner ${ordner} nicht geprüft oder entfernt (${meldung(fehler)}) — wird beim nächsten Start erneut versucht, sonst von Hand löschen.`)
    }
  }
  return entfernt
}
