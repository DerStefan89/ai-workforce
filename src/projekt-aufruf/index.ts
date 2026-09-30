/**
 * Datei: src/projekt-aufruf/index.ts
 *
 * Zweck: F43 „Projekt aufrufen/anzeigen“ (E-F30-3, Variante A, features/F43/feature.md). Die
 * Workforce ruft ein eigenständiges Projekt auf, ohne dass es Teil des Kerns wird:
 * - fuehreAufrufDurch führt den startbefehl der Projekt-Startvorlage EINMAL in der Repo-Wurzel aus
 *   und liest danach ergebnis_datei read-only;
 * - pruefeVorschau fragt die vorschau_url des Projektregisters mit kurzer Zeitgrenze an.
 *
 * Ausführungsmechanik: wiederverwendet, nicht kopiert — starteProzess (argv ohne Shell,
 * pruefeStartziel), killeProzessbaumFallsWindows (taskkill /T /F) und die Kürzungs-/Umgebungs-
 * Helfer des Prüfschritts (src/pruefschritt/index.ts). Wirft nie: jeder Fehlschlag endet als
 * ausgang 'FEHLER'.
 *
 * Zeitgrenze (Review-Befund P1): nicht über starteProzess' zeitgrenzeMs — Node killt dort nur das
 * direkte Kind, und der Baum-Kill läuft erst nach 'close'. Hält ein Enkelprozess stdout offen, kommt
 * 'close' nie, der Aufruf hinge und sperrte das Projekt bis zum Neustart. Stattdessen beendet ein
 * eigener Timer an der Grenze den Baum über die PID (solange das Kind lebt), und eine harte
 * Nachfrist löst den Aufruf in jedem Fall auf. Nach dem 'exit' des Kindes (beiExit) wird nicht
 * mehr gekillt. Rest-Risiko: endet das Kind in den Millisekunden zwischen Timer und PID-Auflösung
 * durch taskkill und vergibt Windows die PID sofort neu, kann taskkill den fremden Baum treffen —
 * taskkill arbeitet nur über die PID.
 *
 * Das Ergebnis bleibt flüchtig (nur im Speicher der Serverinstanz), anders als das Prüfergebnis:
 * ein Aufruf ist kein Workforce-Lauf, trägt keine lauf_id und liefert nichts, was Zustand,
 * Freigabe oder Qualitätsdaten verbrauchen (ARCHITECTURE.md §4) — die dauerhafte Spur ist
 * ergebnis_datei im Projekt-Repo selbst. Ein eigener Kernartefakt-Typ bräuchte ein neues Schema und
 * wäre eine Architekturfrage, die Variante A nicht stellt.
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs (GET/POST /api/projekt-aufruf),
 * scripts/check-f43-projekt-aufrufen.mjs.
 */

import { closeSync, existsSync, openSync, readSync, realpathSync, statSync } from 'node:fs'
import { extname, isAbsolute, relative, resolve, sep } from 'node:path'
import { killeProzessbaumFallsWindows, starteProzess } from '../claude-code-gateway/prozessstart.ts'
import type { Starter } from '../claude-code-gateway/types.ts'
import { vorschauPortAus } from '../projekte/index.ts'
import { STDERR_ENDE_MAX_BYTES, STDOUT_ENDE_MAX_BYTES, entferneLeitstandUmgebungsvariablen, filtereStderrRauschen, klassifizierePruefergebnis, kuerzeAusgabeEnde } from '../pruefschritt/index.ts'
import { STANDARD_START_ZEITGRENZE_MS } from '../startvorlage/index.ts'
import type { AufrufErgebnis, ErgebnisDateiAnsicht, VorschauStatus } from './types.ts'

/** Größenobergrenze für den angezeigten Inhalt von ergebnis_datei. */
export const ERGEBNIS_DATEI_MAX_BYTES = 64_000

/** Nur diese Endungen werden als Text gezeigt; alles andere nur als „vorhanden, n Bytes“. */
const TEXT_ENDUNGEN = new Set(['.md', '.json', '.txt'])

/** Harte Nachfrist nach der Zeitgrenze: kommt bis dahin kein Prozessende, wird der Aufruf trotzdem beendet gemeldet (die Sperre fällt). */
export const NACHFRIST_MS = 5000

/** Zeitgrenze der Erreichbarkeitsprüfung der vorschau_url. */
export const VORSCHAU_ZEITGRENZE_MS = 2000

/** Stand einer Datei vor dem Aufruf (mtime/Größe), null = fehlte — für ausDiesemAufruf. */
function dateiStand(pfad: string): string | null {
  try {
    const s = statSync(pfad)
    return `${s.mtimeMs}:${s.size}`
  } catch {
    return null
  }
}

/**
 * Liest ergebnis_datei read-only. Der reale Pfad muss nach Auflösung von Symlinks in der
 * Repo-Wurzel liegen (die Formregel der Startvorlage allein hält keinen Symlink auf).
 * @param repoWurzel - Repo-Wurzel des Projekts
 * @param relPfad - validierter, repo-relativer Pfad
 * @param standVorher - dateiStand vor dem Aufruf
 * @returns Anzeigeform
 */
export function leseErgebnisDatei(repoWurzel: string, relPfad: string, standVorher: string | null): ErgebnisDateiAnsicht {
  const absolut = resolve(repoWurzel, relPfad)
  if (!existsSync(absolut)) return { pfad: relPfad, vorhanden: false, grund: 'Datei fehlt nach dem Aufruf' }
  let real: string
  try {
    real = realpathSync(absolut)
    const rel = relative(realpathSync(repoWurzel), real)
    if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) return { pfad: relPfad, vorhanden: false, grund: 'zeigt aus der Repo-Wurzel heraus — nicht gelesen' }
  } catch (fehler) {
    return { pfad: relPfad, vorhanden: false, grund: `nicht auflösbar: ${(fehler as Error).message}` }
  }
  const stat = statSync(real)
  if (!stat.isFile()) return { pfad: relPfad, vorhanden: false, grund: 'keine reguläre Datei' }
  const ausDiesemAufruf = dateiStand(real) !== standVorher
  if (!TEXT_ENDUNGEN.has(extname(real).toLowerCase())) {
    return { pfad: relPfad, vorhanden: true, bytes: stat.size, ausDiesemAufruf, text: null, gekuerzt: false }
  }
  const puffer = Buffer.alloc(Math.min(stat.size, ERGEBNIS_DATEI_MAX_BYTES))
  const fd = openSync(real, 'r')
  let gelesen: number
  try {
    gelesen = readSync(fd, puffer, 0, puffer.length, 0)
  } finally {
    closeSync(fd)
  }
  const gekuerzt = stat.size > gelesen
  // An der Kürzungsgrenze angeschnittenes Mehrbyte-Zeichen nicht als Ersatzzeichen U+FFFD anzeigen.
  const text = puffer.subarray(0, gelesen).toString('utf8')
  return { pfad: relPfad, vorhanden: true, bytes: stat.size, ausDiesemAufruf, text: gekuerzt ? text.replace(/\uFFFD$/, '') : text, gekuerzt }
}

/**
 * Führt den startbefehl einmal aus (cwd = Repo-Wurzel, ohne Shell, ohne LEITSTAND_*-Variablen,
 * stdin geschlossen) und liest danach ergebnis_datei. An der Zeitgrenze wird der Prozessbaum über
 * die PID beendet (ausgang 'ZEITGRENZE'); endet der Prozess auch NACHFRIST_MS danach nicht (ein
 * Unterprozess hält die Ausgabe offen), wird trotzdem aufgelöst und das gemeldet.
 * @param befehl - startbefehl (argv, [0] absoluter Programmpfad)
 * @param repoWurzel - Repo-Wurzel des Projekts
 * @param zeitgrenzeMs - startZeitgrenzeMs oder undefined (dann STANDARD_START_ZEITGRENZE_MS)
 * @param ergebnisDatei - ergebnis_datei oder undefined
 * @param optionen - nur für Tests: starter (Muster starteProzess), nachfristMs
 * @returns vollständiges Ergebnis, nie ein Wurf
 */
export async function fuehreAufrufDurch(
  befehl: string[],
  repoWurzel: string,
  zeitgrenzeMs: number | undefined,
  ergebnisDatei: string | undefined,
  optionen: { starter?: Starter; nachfristMs?: number } = {}
): Promise<AufrufErgebnis> {
  const grenze = zeitgrenzeMs ?? STANDARD_START_ZEITGRENZE_MS
  const gestartetAm = new Date().toISOString()
  const start = Date.now()
  const standVorher = ergebnisDatei === undefined ? null : dateiStand(resolve(repoWurzel, ergebnisDatei))
  const basis = { befehl, dauer_ms: 0, zeitgrenze_ms: grenze, gestartet_am: gestartetAm }
  let pid: number | undefined
  let zeitgrenzeErreicht = false
  // Delta-Review P2: gekillt wird nur ein noch lebendes direktes Kind — nach seinem 'exit'
  // (beiExit) ist die PID frei und könnte schon einem fremden Prozess gehören.
  const killeKind = (): void => {
    if (pid === undefined) return
    try {
      process.kill(pid, 'SIGKILL')
    } catch {
      // schon beendet — nichts zu tun
    }
  }
  const timer = setTimeout(() => {
    if (pid === undefined) return
    zeitgrenzeErreicht = true
    // Baum zuerst (braucht die lebende Wurzel), danach das Kind selbst als Rückfall, falls taskkill scheitert.
    if (process.platform === 'win32') void killeProzessbaumFallsWindows(pid).then(killeKind)
    else killeKind()
  }, grenze)
  let nachfristTimer: NodeJS.Timeout | undefined
  const nachfrist = new Promise<null>((r) => {
    nachfristTimer = setTimeout(() => r(null), grenze + (optionen.nachfristMs ?? NACHFRIST_MS))
  })
  let ergebnis: AufrufErgebnis
  try {
    const prozess = starteProzess(befehl, [], {
      cwd: repoWurzel,
      stdinLeer: true,
      umgebungsvariablenVollstaendig: entferneLeitstandUmgebungsvariablen(),
      beiStart: (p) => {
        pid = p
      },
      beiExit: () => {
        pid = undefined
      },
      ...(optionen.starter !== undefined ? { starter: optionen.starter } : {}),
    })
    const p = await Promise.race([prozess, nachfrist])
    if (p === null) {
      console.error(`[projekt-aufruf] Ausgabe nach Zeitgrenze + Nachfrist noch offen, Aufruf ohne Prozessende beendet: ${JSON.stringify(befehl)}`)
      void prozess.then(() => console.error(`[projekt-aufruf] verspätetes Prozessende nach der Nachfrist: ${JSON.stringify(befehl)}`))
      ergebnis = { ...basis, ausgang: 'ZEITGRENZE', exit_code: null, stdout_ende: '', stderr_ende: zeitgrenzeErreicht ? 'Prozess nach der Zeitgrenze beendet, aber die Ausgabe blieb offen — ein Unterprozess läuft womöglich weiter.' : 'Das direkte Kind hat sich beendet, ein Unterprozess hält die Ausgabe offen und läuft weiter — nicht beendet (seine PID ist nicht bekannt).', ergebnis_datei: null }
    } else {
      const startfehler = p.startfehler === null ? '' : `Start fehlgeschlagen: ${p.startfehler.message}\n`
      ergebnis = {
        ...basis,
        ausgang: zeitgrenzeErreicht ? 'ZEITGRENZE' : klassifizierePruefergebnis(p),
        exit_code: zeitgrenzeErreicht ? null : p.exitCode,
        stdout_ende: kuerzeAusgabeEnde(p.stdout, STDOUT_ENDE_MAX_BYTES),
        stderr_ende: kuerzeAusgabeEnde(startfehler + filtereStderrRauschen(p.stderr), STDERR_ENDE_MAX_BYTES),
        ergebnis_datei: null,
      }
    }
  } catch (fehler) {
    ergebnis = { ...basis, ausgang: 'FEHLER', exit_code: null, stdout_ende: '', stderr_ende: `Aufruf selbst fehlgeschlagen: ${String((fehler as Error)?.message ?? fehler)}`, ergebnis_datei: null }
  } finally {
    clearTimeout(timer)
    clearTimeout(nachfristTimer)
  }
  ergebnis.dauer_ms = Date.now() - start
  if (ergebnisDatei !== undefined) {
    try {
      ergebnis.ergebnis_datei = leseErgebnisDatei(repoWurzel, ergebnisDatei, standVorher)
    } catch (fehler) {
      ergebnis.ergebnis_datei = { pfad: ergebnisDatei, vorhanden: false, grund: `nicht lesbar: ${(fehler as Error).message}` }
    }
  }
  return ergebnis
}

/**
 * Prüft, ob die vorschau_url antwortet. Angefragt wird nur eine URL, die vorschauPortAus als
 * 'http://localhost:<port>' bzw. 'http://127.0.0.1:<port>' anerkennt; Weiterleitungen werden
 * nicht verfolgt. Jede HTTP-Antwort gilt als erreichbar.
 * @param url - vorschau_url des Projekts oder null
 * @param zeitgrenzeMs - Zeitgrenze der Anfrage
 * @returns Status, nie ein Wurf
 */
export async function pruefeVorschau(url: string | null, zeitgrenzeMs: number = VORSCHAU_ZEITGRENZE_MS): Promise<VorschauStatus> {
  if (url === null) return { url: null, erreichbar: null, grund: 'keine vorschau_url gesetzt' }
  if (vorschauPortAus(url) === null) return { url: null, erreichbar: null, grund: 'vorschau_url ist keine lokale URL mit Port — nicht angefragt' }
  try {
    const antwort = await fetch(url, { signal: AbortSignal.timeout(zeitgrenzeMs), redirect: 'manual' })
    await antwort.body?.cancel()
    return { url, erreichbar: true, grund: `HTTP ${antwort.status}` }
  } catch (fehler) {
    const f = fehler as Error & { cause?: { code?: string } }
    const grund = f.name === 'TimeoutError' ? `keine Antwort binnen ${zeitgrenzeMs} ms` : `Verbindung fehlgeschlagen (${f.cause?.code ?? f.message})`
    return { url, erreichbar: false, grund }
  }
}
