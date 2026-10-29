/**
 * Datei: src/pruefschritt/render.ts
 *
 * Zweck: Render-Nachweis im Lauf durch den Kern (F45 B3b-2a, F-1256, features/F45/plan-b3b2a-v2.md). Nach einem
 * grünen Prüfschritt der Ausführung führt der Kern `npm run check:render` des Projekts aus (Skelett, F45 B3b-1:
 * `scripts/render-nachweis.mjs`), sobald `render.json` in der Wurzel des Arbeitsordners liegt — deterministisch, nicht
 * freiwillig durch den Builder. Ergebnis im bestehenden Prüfergebnis-Schema v0 (validierePruefergebnisDaten), keine
 * Schemaänderung. Die Bewertung der Darstellung ist nicht Teil dieses Moduls (B3b-2b, E-B3B2-1 = A).
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs (Nachlauf eines Laufs, direkt nach der Registrierung des
 * Prüfergebnisses); geprüft von src/pruefschritt/render.test.ts und scripts/render-im-lauf.test.mjs.
 *
 * Wichtig:
 * - Kein Halt, keine Korrekturrunde: ROT/ZEITGRENZE/FEHLER sind nur ein Ergebnis (F-1268 ⇒ B3b-2b). Kein Leser von
 *   `pruefergebnis-<laufId>` sieht dieses Artefakt (`render-nachweis-<laufId>`, exakte Kennungen überall).
 * - Vorbedingung: `.render-nachweis/` ist git-ignoriert (lesend über `git check-ignore`, Muster pruefeZielIgnoriert in
 *   src/faehigkeiten/vorschlag.ts). Sonst kein Lauf, sondern FEHLER mit lesbarem Grund — nie still übersprungen; die
 *   Bilder sollen nie in einen Commit geraten (F-1267: Altprojekte ohne Eintrag).
 * - Befehl fest: `[node, npm-cli.js, 'run', 'check:render']` (findeNpmCli, dieselbe Form wie der pruefbefehl neuer
 *   Projekte — `npm.cmd` sperrt pruefeStartziel), Zeitgrenze RENDER_ZEITGRENZE_MS, Umgebung wie der Prüfschritt ohne
 *   LEITSTAND_* (fuehrePruefungDurch, kein zweiter Prozessstart-Regelsatz). Kein neues Startvorlagen-Feld.
 * - Wirft nie: jeder Fehler wird zu ergebnis 'FEHLER' bzw. über meldeFehler gemeldet; der Lauf und die Kette laufen
 *   weiter.
 * - DEKLARIERT: bei ZEITGRENZE ist der Kill des Prozessbaums best effort (F-181, prozessstart.ts) — Chromium oder der
 *   kurzlebige Server des Skripts können ihn überleben. Ein Build in `check:render` (Gate-Vorlage, K2 = b) schreibt in
 *   den Arbeitsordner; dass seine Ausgabe in `.gitignore` steht, ist nur deklariert, erzwungen ist `.render-nachweis/`.
 *   Der Render ist nicht abbrechbar (fuehrePruefungDurch nimmt kein AbortSignal): nach einem grünen Lauf bleibt die
 *   Instanz bis zu RENDER_ZEITGRENZE_MS zusätzlich zum Prüfschritt belegt (D13, Start ⇒ 409).
 */

import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fuehreGitAsync } from '../git-starter/index.ts'
import { findeNpmCli } from '../projekt-anlegen/index.ts'
import { fuehrePruefungDurch, kuerzeAusgabeEnde, validierePruefergebnisDaten } from './index.ts'
import type { PruefergebnisV0Daten, PruefergebnisWert } from './types.ts'

/** Harte Wanduhr-Grenze für `npm run check:render` (Bauauftrag B3b-2a: 180 s — Chromium-Start plus fünf Varianten je Seite). */
const RENDER_ZEITGRENZE_MS = 180_000

/** Ausgabeordner des Skelett-Skripts, mit Schrägstrich: nur so meldet `git check-ignore` ein Verzeichnismuster. */
const RENDER_AUSGABE = '.render-nachweis/'

/** Lesbarer Befehl für FEHLER-Ergebnisse ohne Prozess (das Schema verlangt nur nicht-leere Strings). */
const ANZEIGE_BEFEHL = ['npm', 'run', 'check:render']

/** Zeitgrenze der lesenden git-Abfrage (Muster pruefeZielIgnoriert). */
const GIT_ZEITGRENZE_MS = 5000

/**
 * Optionen für Tests: `befehl` ersetzt das argv (ein `node -e`-Stub statt npm, ohne Prüfung der package.json);
 * `npmCli` gibt npm-cli.js fest vor; `zeitgrenzeMs` ersetzt RENDER_ZEITGRENZE_MS.
 */
export interface RenderOptionen {
  befehl?: string[]
  npmCli?: string
  zeitgrenzeMs?: number
}

/**
 * Hat die package.json der Wurzel ein Skript `check:render`? Sonst endete `npm run` als ROT („Missing script“) — und
 * fehlende Einrichtung sähe aus wie ein Darstellungsfehler (QA M2).
 * @param wurzel - Arbeitsordner
 * @returns null, wenn vorhanden; sonst der Grund
 */
function skriptFehlt(wurzel: string): string | null {
  let paket: unknown
  try {
    paket = JSON.parse(readFileSync(join(wurzel, 'package.json'), 'utf8'))
  } catch {
    return 'nicht ausgeführt: package.json fehlt oder ist nicht lesbar — das Skript check:render eintragen (Gate-Vorlage, Abschnitt UI-Projekte)'
  }
  const skripte = typeof paket === 'object' && paket !== null ? (paket as { scripts?: unknown }).scripts : undefined
  const skript =
    typeof skripte === 'object' && skripte !== null ? (skripte as Record<string, unknown>)['check:render'] : undefined
  if (typeof skript === 'string' && skript.trim() !== '') return null
  return 'nicht ausgeführt: package.json hat kein Skript check:render — eintragen (Gate-Vorlage, Abschnitt UI-Projekte)'
}

/**
 * Ist der Render-Nachweis nach diesem Lauf fällig? Nur nach einer erfolgreichen Ausführung im Arbeitsordner (dasselbe
 * Prädikat wie die Löschliste im Server: ERFOLGREICH, Arbeitsordner, Rolle 'ausfuehrung' — im Projektordner bleibt der
 * Kern lesend, ARCHITECTURE.md §2), nur nach grünem Prüfschritt, nur wenn `render.json` als Datei in der Wurzel liegt.
 * Sonst bleibt der Nachlauf bitgleich (kein await, kein Artefakt). Total, wirft nie.
 * @param bedingung - ausfuehrungImArbeitsordner, pruefErgebnis (ergebnis des Prüfschritts), wurzel (nachlaufWurzel)
 * @returns true, wenn der Kern `npm run check:render` ausführen soll
 */
export function renderNachweisFaellig(bedingung: {
  ausfuehrungImArbeitsordner: boolean
  pruefErgebnis: PruefergebnisWert
  wurzel: string
}): boolean {
  if (bedingung.ausfuehrungImArbeitsordner !== true || bedingung.pruefErgebnis !== 'GRUEN') return false
  try {
    return statSync(join(bedingung.wurzel, 'render.json'), { throwIfNoEntry: false })?.isFile() === true
  } catch {
    return false
  }
}

/**
 * Ein FEHLER-Ergebnis ohne Prozessstart (Vorbedingung nicht erfüllt).
 * @param laufId - lauf_id
 * @param befehl - geplantes argv oder ANZEIGE_BEFEHL
 * @param grund - lesbarer Grund (landet in ausgabe_ende)
 * @param gestartetAm - Startzeit
 * @param start - Date.now() beim Start
 * @returns gültiges Prüfergebnis v0
 */
function fehlerErgebnis(
  laufId: string,
  befehl: string[],
  grund: string,
  gestartetAm: string,
  start: number
): PruefergebnisV0Daten {
  return {
    pruefergebnis_schema: 'v0',
    lauf_id: laufId,
    befehl,
    exit_code: null,
    ergebnis: 'FEHLER',
    dauer_ms: Date.now() - start,
    ausgabe_ende: kuerzeAusgabeEnde(grund),
    gestartet_am: gestartetAm,
  }
}

/**
 * Prüft lesend, ob `.render-nachweis/` git-ignoriert ist.
 * @param wurzel - Arbeitsordner
 * @returns null, wenn ignoriert; sonst der Grund, warum nicht ausgeführt wird
 */
async function ausgabeNichtIgnoriert(wurzel: string): Promise<string | null> {
  const ergebnis = await fuehreGitAsync(
    ['--no-optional-locks', 'check-ignore', '-q', '--no-index', '--', RENDER_AUSGABE],
    {
      cwd: wurzel,
      zeitgrenzeMs: GIT_ZEITGRENZE_MS,
    }
  )
  if (ergebnis.abbruch === undefined && ergebnis.code === 0) return null
  if (ergebnis.abbruch === undefined && ergebnis.code === 1)
    return `nicht ausgeführt: ${RENDER_AUSGABE} steht nicht in .gitignore — Zeile ${RENDER_AUSGABE} in .gitignore ergänzen`
  const detail = ergebnis.abbruch ?? `code ${ergebnis.code}`
  return `nicht ausgeführt: git check-ignore für ${RENDER_AUSGABE} nicht auswertbar (${detail}) ${ergebnis.stderr}`.trim()
}

/**
 * Führt `npm run check:render` im Arbeitsordner aus (oder hält fest, warum nicht). Wirft nie.
 * @param laufId - lauf_id des Ausführungslaufs
 * @param wurzel - Arbeitsordner-Wurzel (nachlaufWurzel)
 * @param optionen - nur für Tests
 * @returns gültiges Prüfergebnis v0 (GRUEN/ROT/ZEITGRENZE/FEHLER)
 */
export async function fuehreRenderNachweisDurch(
  laufId: string,
  wurzel: string,
  optionen: RenderOptionen = {}
): Promise<PruefergebnisV0Daten> {
  const gestartetAm = new Date().toISOString()
  const start = Date.now()
  try {
    const grund = await ausgabeNichtIgnoriert(wurzel)
    const ohneSkript = grund ?? (optionen.befehl === undefined ? skriptFehlt(wurzel) : null)
    if (ohneSkript !== null) return fehlerErgebnis(laufId, ANZEIGE_BEFEHL, ohneSkript, gestartetAm, start)
    // findeNpmCli wirft ohne npm-cli.js — der Wurf endet unten als FEHLER mit seiner Meldung.
    const befehl = optionen.befehl ?? [process.execPath, optionen.npmCli ?? findeNpmCli(), 'run', 'check:render']
    return await fuehrePruefungDurch(laufId, befehl, wurzel, optionen.zeitgrenzeMs ?? RENDER_ZEITGRENZE_MS)
  } catch (fehler) {
    return fehlerErgebnis(
      laufId,
      ANZEIGE_BEFEHL,
      `Render-Nachweis selbst fehlgeschlagen: ${String((fehler as Error)?.message ?? fehler)}`,
      gestartetAm,
      start
    )
  }
}

/**
 * Führt den Render-Nachweis aus und registriert ihn über den Rückruf des Servers (schreibend bleibt im Server,
 * ARCHITECTURE.md §1). Wirft nie: ein Wurf aus Prüfung oder Registrierung geht an meldeFehler (Startfehlerliste).
 * @param laufId - lauf_id des Ausführungslaufs
 * @param wurzel - Arbeitsordner-Wurzel
 * @param registriere - registriert `render-nachweis-<laufId>` (registriereKernArtefakt im Server)
 * @param meldeFehler - meldet einen lesbaren Fehlertext
 * @param optionen - nur für Tests
 */
export async function registriereRenderNachweis(
  laufId: string,
  wurzel: string,
  registriere: (daten: PruefergebnisV0Daten) => void,
  meldeFehler: (text: string) => void,
  optionen: RenderOptionen = {}
): Promise<void> {
  try {
    const daten = await fuehreRenderNachweisDurch(laufId, wurzel, optionen)
    const verstoesse = validierePruefergebnisDaten(daten)
    if (verstoesse.length > 0)
      throw new Error(
        `verstößt gegen schemas/kontrollzustand-pruefergebnis-payload.schema.json: ${verstoesse.join('; ')}`
      )
    registriere(daten)
  } catch (fehler) {
    meldeFehler(
      `Render-Nachweis für Lauf '${laufId}' konnte nicht registriert werden: ${String((fehler as Error)?.message ?? fehler)}`
    )
  }
}
