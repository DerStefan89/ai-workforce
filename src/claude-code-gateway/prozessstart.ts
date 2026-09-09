/**
 * Datei: src/claude-code-gateway/prozessstart.ts
 *
 * Zweck: Prozessstart-Primitiv für F6a WS2 + WS4
 * (state/tasks/f6a-ws2-prozessstart.md,
 * state/tasks/f6a-ws4-windows-prozessstart.md). starteProzess ruft
 * ausschließlich child_process.execFile mit dem Startziel- plus
 * Tokens-Array als argv auf (F-057) — nie eine shell-interpretierte
 * Kommandozeile, execFile umgeht den Shell-Parser vollständig.
 * Austauschbar über optionen.starter (Muster wie F1Bs optionen.schreiber),
 * damit `npm run test`/`check` ohne echten Prozessstart und ohne
 * Netzzugriff laufen (AK10).
 *
 * WS4 (real gemessen 02.09.2026, siehe state/tasks/f6a-ws4-windows-
 * prozessstart.md Nachtrag 1): execFile('claude', …) löst unter Windows
 * nur auf claude.cmd auf — ein Programmwrapper, den execFile ohne eine
 * dauerhafte Anpassung der Prozessstart-Semantik nicht direkt ausführen
 * kann. Das Startziel kommt deshalb als Pflichtfeld vom Aufrufer (E2) und
 * wird von pruefeStartziel gegen einen Hygiene-Guard geprüft, bevor
 * execFile es überhaupt sieht.
 *
 * attrappeMitValidemErgebnis/attrappeOhneErgebnisobjekt bilden wörtlich die
 * beiden in state/tp-nachtrag.md real gemessenen Formen ab (TP-03d
 * Messfall 1: valides "type":"result"-JSON mit permission_denials: [];
 * TP-01e Messfall A: Abbruch, leeres stdout/stderr, Exit 137, kein
 * Ergebnisobjekt) — für Tests und Gate-Skript gemeinsam nutzbar (D5, kein
 * zweimal von Hand abgetipptes Fixture).
 *
 * F14 WS-1 (features/F14/feature.md, AK1-AK3, löst F-176): echterStarter
 * nutzt execFiles eingebaute timeout-/signal-Optionen für Wanduhr-Grenze
 * und manuellen Abbruch — Details am echterStarter selbst. Keine
 * F7-Klassifikation dieser neuen ProzessErgebnis-Form (WS-3).
 *
 * F14 WS-2 (AK4): der in WS-1 dokumentierte Vorbehalt „unter Windows killt
 * execFiles timeout-/signal-Mechanismus nur den direkten Kindprozess" war
 * eine unbelegte Annahme aus der Challenge-Vorgabe — real gemessen (siehe
 * features/F14/nachweis-ws2.md, F-181) killt Node 24.16.0 einen *nicht*
 * detachten Unterprozessbaum unter Windows bereits selbst (eigener
 * Job-Object-Mechanismus), sobald der direkte Kindprozess stirbt. Das
 * zusätzliche `taskkill /T /F` in killeProzessbaumFallsWindows ist damit
 * für diesen Fall ein wirkungsloses, aber harmloses Sicherheitsnetz: die
 * Kind-PID ist zum Aufrufzeitpunkt (nach Node's eigenem Kill) bereits tot,
 * taskkill scheitert real reproduzierbar mit „Prozess nicht gefunden" und
 * wird als erwarteter Fehlerfall geschluckt. Für einen *detachten*
 * Enkelprozess (Windows-Breakaway aus Node's Job-Object) würde taskkill
 * grundsätzlich funktionieren, aber nur, wenn die Kind-PID beim Aufruf
 * noch lebt — in dieser Kill-Reihenfolge (Node zuerst, taskkill danach)
 * ist das nie der Fall. Bewusst nicht behoben (würde WS-1s
 * Fehlerklassifikation neu empirisch prüfen erfordern), siehe F-181. Nur
 * unter process.platform === 'win32' aktiv (kein ungetesteter Fallback für
 * macOS/Linux, YAGNI).
 */

import { execFile } from 'node:child_process'
import type { ExecFileException } from 'node:child_process'
import { statSync } from 'node:fs'
import { extname, resolve as aufgeloesterPfad } from 'node:path'
import type { AufrufTokens, ProzessErgebnis, Starter, StarterOptionen } from './types.ts'

const ENDUNGS_SPERRLISTE = new Set(['.cmd', '.bat', '.com', '.ps1'])
const BASISNAME_SPERRLISTE = new Set(['cmd.exe', 'powershell.exe', 'pwsh.exe', 'wsl.exe', 'bash.exe', 'sh.exe'])

/** Basisname ohne Verzeichnisanteil, nachgestellte Punkte/Leerzeichen entfernt — beide bestehen unter Windows existsSync/Öffnen, obwohl sie die Endungsprüfung sonst umgehen würden. */
function bereinigterBasisname(pfad: string): string {
  const roh = pfad.split(/[\\/]/).pop() ?? ''
  return roh.replace(/[.\s]+$/, '')
}

/**
 * Hygiene-Guard für ein Prozessstart-Startziel (F6a WS4 AK15, plan-v2
 * Delta 3/4). Prüft vier billige Regeln (absoluter Pfad, keine
 * .cmd/.bat/.com/.ps1-Endung, kein Shell-Basisname, existierende Datei) —
 * das ist keine Vertrauensgrenze: ein Ziel wie
 * ['C:\Windows\System32\cmd.exe', '/c', 'claude'] besteht ohne die
 * Sperrliste alle Endungsregeln. Die Vertrauensfrage, welches Programm
 * ausgeführt wird, liegt per E2 beim Aufrufer.
 */
export function pruefeStartziel(startziel: string[]): { ok: true } | { ok: false; grund: string } {
  if (startziel.length === 0) {
    return { ok: false, grund: 'werkzeugStartziel ist ein leeres Array' }
  }
  const programm = startziel[0]
  if (aufgeloesterPfad(programm) !== programm) {
    return { ok: false, grund: `werkzeugStartziel[0] ist kein absoluter Pfad: ${programm}` }
  }
  const basisname = bereinigterBasisname(programm)
  const basisnameKlein = basisname.toLowerCase()
  if (ENDUNGS_SPERRLISTE.has(extname(basisname).toLowerCase())) {
    return { ok: false, grund: `werkzeugStartziel[0] hat eine gesperrte Endung: ${programm}` }
  }
  if (BASISNAME_SPERRLISTE.has(basisnameKlein)) {
    return { ok: false, grund: `werkzeugStartziel[0] steht auf der Shell-Basisnamen-Sperrliste: ${programm}` }
  }
  let istDatei: boolean
  try {
    istDatei = statSync(programm).isFile()
  } catch {
    istDatei = false
  }
  if (!istDatei) {
    return { ok: false, grund: `werkzeugStartziel[0] ist keine existierende Datei: ${programm}` }
  }
  return { ok: true }
}

/**
 * F14 WS-2 (AK4): dokumentierter Best-Effort-Sicherheitsnetz-Aufruf, kein
 * verlässlicher Baum-Kill. Versucht `taskkill /T /F` auf `pid` — kein
 * eigener execFile-String über eine Shell (taskkill.exe direkt als
 * execFile-Programm, kein startziel[0] im Sinne von pruefeStartziel,
 * verletzt die Shell-Sperrlisten-Doktrin nicht). Real gemessen (F-181):
 * zum Aufrufzeitpunkt (nach Node's eigenem timeout-/signal-Kill) ist die
 * Kind-PID auf dieser Node/Windows-Kombination bereits tot — taskkill
 * scheitert deshalb erwartbar mit „Prozess nicht gefunden", was diese
 * Funktion bewusst schluckt, statt den bestehenden TIMEOUT/ABBRUCH-
 * Beendigungspfad zu stören (idempotent, nie reject). Das ist kein Bug:
 * ein *nicht* detachter Unterprozessbaum ist zu diesem Zeitpunkt bereits
 * durch Node selbst tot (Windows-Job-Object-Mechanismus, siehe
 * echterStarter-Kommentar); nur ein *detachter* Enkelprozess könnte durch
 * taskkill noch erreicht werden, aber genau der ist zum Aufrufzeitpunkt
 * ebenfalls nicht mehr erreichbar, da taskkill /T eine lebende Ziel-PID
 * braucht, um den Baum aufzubauen. Auf anderen Plattformen (kein realer
 * Nachweis möglich, YAGNI) und ohne bekannte pid ein No-op.
 */
function killeProzessbaumFallsWindows(pid: number | undefined): Promise<void> {
  if (process.platform !== 'win32' || pid === undefined) {
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    execFile('taskkill', ['/PID', String(pid), '/T', '/F'], () => resolve())
  })
}

/**
 * F14 WS-1 (AK1-AK3): nutzt execFiles eingebaute timeout-/signal-Optionen
 * statt eines eigenen Timers — Node killt den Kindprozess selbst und meldet
 * das Ergebnis über den bestehenden Callback-Fehlerpfad. Unterscheidung im
 * Callback: ein Abbruch über abbruchSignal liefert fehler.code ===
 * 'ABORT_ERR' (Node-Konvention für AbortSignal-Integrationen); ein
 * Timeout-Kill über zeitgrenzeMs liefert fehler.killed === true ohne
 * diesen Code. Ein maxBuffer-Überlauf (bestehende Grenze, unverändert seit
 * vor F14) liefert dagegen empirisch geprüft killed: undefined — verwechselt
 * sich nicht mit TIMEOUT (Regressionstest in claude-code-gateway.test.ts).
 * Beide Timeout/Abbruch-Fälle haben keinen numerischen exitCode (der Prozess
 * wurde per Signal beendet, nicht regulär), deshalb exitCode: null wie
 * beim bestehenden Startfehler-Zweig — beendigungsart ist das einzige neue
 * Unterscheidungsmerkmal (additiv, F-176).
 *
 * Ohne zeitgrenzeMs/abbruchSignal wird timeout/signal in den execFile-
 * Optionen gar nicht gesetzt — execFiles eigener Default (timeout: 0 =
 * kein Timeout) greift unverändert. Kein fachlich fest codierter Default
 * (Vorgabe AK2): dies ist die einzige Stelle, die überhaupt einen
 * Timeout-Wert an den Prozessstart weiterreicht.
 *
 * WS-2 (AK4): bei TIMEOUT/ABBRUCH läuft killeProzessbaumFallsWindows vor
 * dem resolve — real trägt dabei Node 24s eigener Windows-Job-Object-
 * Mechanismus die Wirkung für nicht detachte Unterprozesse (siehe
 * killeProzessbaumFallsWindows-Kommentar, F-181), nicht taskkill selbst.
 */
const echterStarter: Starter = (startziel, tokens, optionen) =>
  new Promise((resolve) => {
    try {
      const execFileOptionen = {
        encoding: 'utf8' as const,
        maxBuffer: 1024 * 1024 * 64,
        ...(optionen?.zeitgrenzeMs !== undefined ? { timeout: optionen.zeitgrenzeMs } : {}),
        ...(optionen?.abbruchSignal !== undefined ? { signal: optionen.abbruchSignal } : {}),
      }
      const kindprozess = execFile(startziel[0], [...startziel.slice(1), ...tokens], execFileOptionen, (fehler, stdout, stderr) => {
        void behandeleErgebnis(fehler, stdout, stderr)
      })

      async function behandeleErgebnis(fehler: ExecFileException | null, stdout: string, stderr: string): Promise<void> {
        if (fehler === null) {
          resolve({ stdout, stderr, exitCode: 0, startfehler: null, beendigungsart: null })
          return
        }
        if (fehler.code === 'ABORT_ERR') {
          await killeProzessbaumFallsWindows(kindprozess.pid)
          resolve({ stdout, stderr, exitCode: null, startfehler: null, beendigungsart: 'ABBRUCH' })
          return
        }
        if (fehler.killed === true) {
          await killeProzessbaumFallsWindows(kindprozess.pid)
          resolve({ stdout, stderr, exitCode: null, startfehler: null, beendigungsart: 'TIMEOUT' })
          return
        }
        if (typeof fehler.code === 'number') {
          resolve({ stdout, stderr, exitCode: fehler.code, startfehler: null, beendigungsart: null })
          return
        }
        resolve({
          stdout,
          stderr,
          exitCode: null,
          startfehler: { code: typeof fehler.code === 'string' ? fehler.code : null, message: fehler.message },
          beendigungsart: null,
        })
      }
    } catch (fehler) {
      const f = fehler as NodeJS.ErrnoException
      resolve({
        stdout: '',
        stderr: '',
        exitCode: null,
        startfehler: { code: typeof f.code === 'string' ? f.code : null, message: f.message },
        beendigungsart: null,
      })
    }
  })

/** Der Guard greift vor optionen.starter (plan-v2 Delta 9) — ein Rot-Fall mit injiziertem Spy-Starter belegt damit, dass bei ungültigem Startziel kein Spawn versucht wird. zeitgrenzeMs/abbruchSignal (F14 WS-1, AK1) werden unverändert an den Starter durchgereicht, egal ob echterStarter oder ein injizierter Starter. */
export function starteProzess(startziel: string[], tokens: AufrufTokens, optionen: { starter?: Starter } & StarterOptionen = {}): Promise<ProzessErgebnis> {
  const pruefung = pruefeStartziel(startziel)
  if (!pruefung.ok) {
    return Promise.resolve({ stdout: '', stderr: '', exitCode: null, startfehler: { code: null, message: pruefung.grund }, beendigungsart: null })
  }
  const starter = optionen.starter ?? echterStarter
  const starterOptionen: StarterOptionen = { zeitgrenzeMs: optionen.zeitgrenzeMs, abbruchSignal: optionen.abbruchSignal }
  return starter(startziel, tokens, starterOptionen)
}

/** TP-03d Messfall 1, wörtlich übernommen (state/tp-nachtrag.md, Zeile 27-31). Beide Parameter explizit (Delta 10) — kein Ein-Parameter-Callback, der still am falschen Argument bindet. Ignoriert den optionalen dritten Parameter (F14 WS-1) — bleibt additiv zuweisungskompatibel. */
export const attrappeMitValidemErgebnis: Starter = async (_startziel, _tokens) => ({
  stdout: JSON.stringify({
    type: 'result',
    permission_denials: [],
    result: "Ausgabe:\n\n```\n> projektname@0.1.0 tp03d-probe\n> node -e \"console.log('TP03D_PROBE_MARKER')\"\n\nTP03D_PROBE_MARKER\n```",
  }),
  stderr: '',
  exitCode: 0,
  startfehler: null,
  beendigungsart: null,
})

/** TP-01e Messfall A, wörtlich übernommen (state/tp-nachtrag.md, Zeile 243-256): kein Ergebnisobjekt, leeres stdout/stderr, Exit 137. Beide Parameter explizit (Delta 10). */
export const attrappeOhneErgebnisobjekt: Starter = async (_startziel, _tokens) => ({
  stdout: '',
  stderr: '',
  exitCode: 137,
  startfehler: null,
  beendigungsart: null,
})
