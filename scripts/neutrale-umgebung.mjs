/**
 * Datei: scripts/neutrale-umgebung.mjs
 *
 * Zweck: Neutrale Umgebung für Render-Instanzen (F45 B2b-3e-1, F-1125, features/F45/plan-b2b3e1-v2.md §2): setzt HOME,
 * USERPROFILE, TEMP und TMP (posix zusätzlich TMPDIR) auf einen Laufordner unter einer Wurzel ohne Benutzernamen
 * (`AIW_NEUTRAL_WURZEL`, sonst `C:\aiw-nachweis` bzw. `/tmp/aiw-nachweis`). `os.tmpdir()`/`os.homedir()` lesen diese
 * Variablen zur Aufrufzeit — Wegwerf-Projekt, Kontrollzustand und angezeigte Pfade einer Instanz liegen danach dort, und
 * Kindprozesse (git, Attrappen) erben sie. LOCALAPPDATA bleibt (Playwright findet Chromium dort).
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
