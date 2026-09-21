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
 *
 * F16 WS-2 (F-307): StarterOptionen.stdinLeer schließt den stdin des
 * Kindprozesses unmittelbar nach dem Spawn.
 *
 * F25 WS-1 (features/F25/feature.md, AK3): StarterOptionen.cwd wird
 * unverändert an execFiles natives cwd-Feld durchgereicht — kein
 * process.chdir(), kein Shell. Fehlt der Wert, bleibt execFiles eigener
 * Default (process.cwd() des Serverprozesses) unangetastet.
 *
 * Was dazu real gemessen ist und was nicht — die Unterscheidung zählt:
 * GEMESSEN ist, dass Codex ohne angebundenes stdin
 * `Reading additional input from stdin...` auf stderr meldet
 * (state/tp-m3-01b-codex-sandbox.md, Nebenbefund zu Lauf (a)) — derselbe
 * Lauf endete dort aber mit Exit-Code 0, also regulär. GEMESSEN ist
 * außerdem, dass ein Kind, das stdin bis EOF liest, unter execFile mit
 * gepipetem stdin ohne dieses Feld in die Zeitgrenze läuft und mit ihm
 * regulär endet (Rot-/Grün-Fall in codex-gateway.test.ts gegen ein
 * node -e-Skript). NICHT gemessen ist, dass Codex selbst unter execFile
 * hängt — kein Codex-Lauf wurde ohne stdinLeer gegen eine Zeitgrenze
 * gefahren. Das Feld ist damit eine belegte Absicherung gegen einen
 * belegten Mechanismus, nicht die Behebung eines beobachteten
 * Codex-Hangs (F-318).
 *
 * StarterOptionen.stdinLeer selbst blieb bei Einführung bewusst OPT-IN
 * (kein neuer Vorgabewert in starteProzess/prozessstart.ts) — der
 * Claude-Code-Pfad setzte das Feld zunächst nicht.
 *
 * Task "Jarvis-Chat-Latenz senken" (state/nachweis-jarvis-latenz.md),
 * Schritt 2: der Claude-Code-Pfad setzt stdinLeer jetzt ebenfalls, fest in
 * src/claude-code-gateway/index.ts' starteGateway (nicht optional, gilt für
 * jede Rolle) — real beobachtet (state/, Lauf jarvis-jarvis-chat-
 * ac9204a1-…): ohne geschlossenes stdin meldet der Prozess auf stderr
 * „Warning: no stdin data received in 3s, proceeding without it" und wartet
 * die vollen 3s, bevor er ohne stdin weiterläuft — derselbe belegte
 * Mechanismus wie bei Codex (F-307), hier erstmals auch für claude-code
 * real im Produktionsverkehr beobachtet, nicht nur vermutet. `-p` liest nie
 * von stdin (das Prompt kommt als Argument), ein offenes stdin hat für
 * diesen Pfad keinen Nutzen.
 *
 * Task "Jarvis-Chat-Latenz senken", Schritt 4 (zweiter Anlauf): Schritt 2s
 * nachträgliches `kindprozess.stdin?.end()` schließt die stdin-Pipe erst,
 * NACHDEM sie bereits geöffnet wurde — ein claude-code-Prozess, der stdin
 * VOR diesem Callback-Tick prüft, sieht sie kurzzeitig offen. echterStarter
 * nutzt deshalb ab hier child_process.spawn statt execFile: empirisch
 * geprüft (node -e-Probe gegen diese Node-Version), dass execFile eine
 * `stdio`-Option in seinen Aufrufoptionen NICHT an den zugrunde liegenden
 * spawn-Aufruf durchreicht (child.stdin bleibt ein offener Pipe-Stream,
 * unabhängig vom übergebenen Wert) — `stdio[0]` lässt sich über execFile
 * schlicht nicht setzen. spawn selbst unterstützt denselben `timeout`-/
 * `signal`-Vertrag wie execFile (ebenso empirisch geprüft: `timeout` liefert
 * bei Ablauf `close(null, 'SIGTERM')` mit `child.killed === true`,
 * `signal`/AbortSignal liefert zusätzlich ein `error`-Ereignis mit
 * `code === 'ABORT_ERR'`, ein NUL-Byte im Argv wirft synchron wie bei
 * execFile) — nur `encoding` und `maxBuffer` sind execFile-/exec-exklusive
 * Komfortfunktionen ohne spawn-Äquivalent und werden unten von Hand
 * nachgebaut (StringDecoder-freies `setEncoding('utf8')` auf den
 * Stream-Objekten, eine eigene Bytegrenze). optionen?.stdinLeer bleibt
 * OPT-IN wie zuvor (F-307-Vertrag, codex-gateway.test.ts' Rot-Fall "OHNE
 * stdinLeer läuft ein stdin-lesender Prozess in die Zeitgrenze" verlangt
 * ausdrücklich ein weiterhin offenes, nie EOF meldendes stdin ohne dieses
 * Feld) — nur bei stdinLeer === true steht `stdio[0]` von Anfang an auf
 * 'ignore': kein Pipe-Objekt entsteht mehr, das Kind sieht sofort EOF/keinen
 * stdin-Deskriptor, nie ein kurzzeitig offenes stdin. Der bisherige
 * `kindprozess.stdin?.on('error', () => {})`-Schutz (F-307, EPIPE bei
 * einem sofort endenden Kind) entfällt ersatzlos: ohne Pipe-Stream-Objekt
 * gibt es kein `stdin` mehr, an dem ein solches Ereignis auftreten könnte
 * (empirisch geprüft, node -e-Probe: `child.stdin` ist bei `stdio[0]:
 * 'ignore'` `null`, ein sofort endendes Kind reißt den Node-Prozess nicht
 * ab).
 *
 * F40 WS-1 (state/spike-f40-streaming.md): stdout wird weiterhin als String
 * gepuffert (D5), bei StarterOptionen.ergebnisZeileBeendet/beiStreamZeile
 * aber zusätzlich zeilenweise als NDJSON gelesen. Die erste vollständige
 * Zeile mit type "result" löst den Starter sofort auf (exitCode null,
 * ergebnisZeileVorProzessende: true) — real 590-730ms vor 'close'. Das ist
 * nur ein früherer Erfolgspfad (F-570): solange kein result kam, entscheidet
 * ausschließlich die bestehende close-Klassifikation (maxBuffer, ABBRUCH,
 * TIMEOUT, startfehler, exitCode). Ein Abbruch nach der result-Zeile trifft
 * einen fachlich bereits fertigen Lauf und ändert das Ergebnis nicht mehr.
 * Ein unvollständiger Zeilenrest am Ende wird nie geparst.
 */

import { execFile, spawn } from 'node:child_process'
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

/** Harte Bytegrenze für stdout/stderr zusammen mit je einem Stream (Schritt 4: execFiles gleichnamiger Default, hier von Hand nachgebaut — spawn kennt kein eigenes maxBuffer). */
const MAX_BUFFER_BYTES = 1024 * 1024 * 64

/**
 * F40 WS-1 (Code-Review-/QA-Befund): Nachlauffrist nach der frühen Auflösung. Real endet der
 * Prozess 590-730ms nach der result-Zeile (state/spike-f40-streaming.md); endet er bis hierhin
 * nicht, wird er gekillt und das geloggt. Sonst liefe ein hängender, fachlich fertiger Prozess
 * unbeaufsichtigt weiter — der Leitstand gibt D13 (laufAktiv, AbortController) direkt nach der
 * Auflösung frei, niemand könnte ihn mehr abbrechen.
 */
export const NACHLAUF_FRIST_MS = 5000

/**
 * F40 WS-1, F-570: darf eine gelesene stream-json-Zeile den Starter früh als Erfolg auflösen?
 * Nur eine result-Zeile, nur mit ergebnisZeileBeendet, und nur solange weder ein Abbruch
 * (ABORT_ERR), ein maxBuffer-Kill noch ein Timeout-Kill (kindprozess.killed) im Gang ist — liegt
 * die result-Zeile beim Kill noch in der Pipe, bleibt die bestehende close-Klassifikation
 * (ABBRUCH/TIMEOUT/startfehler) führend. Reine Funktion, damit genau diese Sperre testbar ist.
 */
export function darfFruehAufloesen(lage: { ergebnisZeileBeendet: boolean; zeilentyp: unknown; abbruchErkannt: boolean; maxBufferUeberschritten: boolean; gekillt: boolean }): boolean {
  return lage.ergebnisZeileBeendet && lage.zeilentyp === 'result' && !lage.abbruchErkannt && !lage.maxBufferUeberschritten && !lage.gekillt
}

/**
 * F14 WS-1 (AK1-AK3), seit Schritt 4 über spawn statt execFile (siehe
 * Kopfkommentar): nutzt spawns eingebaute timeout-/signal-Optionen statt
 * eines eigenen Timers — Node killt den Kindprozess selbst, das Ergebnis
 * entsteht aus dem 'close'-Ereignis plus dem parallel mitgeschnittenen
 * 'error'-Ereignis. Unterscheidung wie zuvor bei execFile, nur an den
 * spawn-Ereignissen gemessen (empirisch geprüft, node -e-Proben gegen diese
 * Node-Version): ein Abbruch über abbruchSignal liefert ein 'error'-Ereignis
 * mit code === 'ABORT_ERR' VOR dem 'close'; ein Timeout-Kill über
 * zeitgrenzeMs liefert kein 'error', aber child.killed === true beim
 * 'close'. Ein maxBuffer-Überlauf (eigene Zählung, unten) wird VOR beiden
 * geprüft — er kann child.killed ebenfalls auf true setzen (der eigene
 * kill()-Aufruf unten), das darf ihn nicht nachträglich zu TIMEOUT machen
 * (Regressionstest in claude-code-gateway.test.ts, unverändert seit vor
 * Schritt 4). Alle drei Fälle haben keinen numerischen exitCode (der Prozess
 * wurde per Signal beendet, nicht regulär), deshalb exitCode: null wie beim
 * bestehenden Startfehler-Zweig — beendigungsart bleibt das einzige
 * Unterscheidungsmerkmal (F-176).
 *
 * Ohne zeitgrenzeMs/abbruchSignal wird timeout/signal in den spawn-Optionen
 * gar nicht gesetzt — spawns eigener Default (kein Timeout) greift
 * unverändert. Kein fachlich fest codierter Default (Vorgabe AK2): dies ist
 * die einzige Stelle, die überhaupt einen Timeout-Wert an den Prozessstart
 * weiterreicht.
 *
 * WS-2 (AK4): bei TIMEOUT/ABBRUCH läuft killeProzessbaumFallsWindows vor
 * dem resolve — real trägt dabei Node 24s eigener Windows-Job-Object-
 * Mechanismus die Wirkung für nicht detachte Unterprozesse (siehe
 * killeProzessbaumFallsWindows-Kommentar, F-181), nicht taskkill selbst.
 *
 * Schritt 4: stdio[0] ist NUR bei optionen?.stdinLeer === true 'ignore' —
 * sonst 'pipe' wie zuvor bei execFile (F-307-Vertrag bleibt opt-in,
 * codex-gateway.test.ts' Rot-Fall braucht ein weiterhin offenes stdin ohne
 * dieses Feld). stdout/stderr werden per 'data'-Ereignis akkumuliert
 * (setEncoding('utf8') übernimmt die mehrbyte-sichere Dekodierung über
 * Chunk-Grenzen hinweg, wie zuvor execFiles eingebaute Dekodierung) und bei
 * MAX_BUFFER_BYTES abgeschnitten.
 */
const echterStarter: Starter = (startziel, tokens, optionen) =>
  new Promise((resolve) => {
    let bereitsAufgeloest = false
    const aufloesen = (ergebnis: ProzessErgebnis): void => {
      if (bereitsAufgeloest) return
      bereitsAufgeloest = true
      resolve(ergebnis)
    }

    let kindprozess: ReturnType<typeof spawn>
    try {
      kindprozess = spawn(startziel[0], [...startziel.slice(1), ...tokens], {
        stdio: [optionen?.stdinLeer === true ? 'ignore' : 'pipe', 'pipe', 'pipe'],
        ...(optionen?.zeitgrenzeMs !== undefined ? { timeout: optionen.zeitgrenzeMs } : {}),
        ...(optionen?.abbruchSignal !== undefined ? { signal: optionen.abbruchSignal } : {}),
        ...(optionen?.cwd !== undefined ? { cwd: optionen.cwd } : {}),
        // Task "Jarvis-Chat-Latenz senken", Schritt 3: spawns env-Option ERSETZT process.env
        // vollständig, statt es zu ergänzen — ohne den Spread bekäme der Kindprozess NUR
        // umgebungsvariablen und verlöre PATH & Co. Fehlt das Feld, bleibt spawns eigener
        // Default (unverändertes process.env) unangetastet.
        ...(optionen?.umgebungsvariablen !== undefined ? { env: { ...process.env, ...optionen.umgebungsvariablen } } : {}),
      })
    } catch (fehler) {
      const f = fehler as NodeJS.ErrnoException
      aufloesen({
        stdout: '',
        stderr: '',
        exitCode: null,
        startfehler: { code: typeof f.code === 'string' ? f.code : null, message: f.message },
        beendigungsart: null,
      })
      return
    }

    let stdout = ''
    let stderr = ''
    let bytesGesamt = 0
    let maxBufferUeberschritten = false
    let abbruchErkannt = false
    let fruehesFehlerobjekt: { code: string | null; message: string } | null = null

    /** Zählt Bytes über beide Streams zusammen (Muster execFiles gemeinsame maxBuffer-Grenze) und killt den Kindprozess einmalig bei Überschreiten. */
    function pruefeMaxBuffer(zusatzBytes: number): void {
      if (maxBufferUeberschritten) return
      bytesGesamt += zusatzBytes
      if (bytesGesamt > MAX_BUFFER_BYTES) {
        maxBufferUeberschritten = true
        kindprozess.kill()
      }
    }

    // F40 WS-1: zeilenweises Mitlesen nur, wenn ein Aufrufer es verlangt — sonst exakt der alte Pfad.
    const zeilenLesen = optionen?.ergebnisZeileBeendet === true || optionen?.beiStreamZeile !== undefined
    let zeilenRest = ''

    /** F40 WS-1: verarbeitet EINE vollständige NDJSON-Zeile — Fortschritts-Rückruf, dann ggf. früher Erfolgspfad. Eine unparsbare Zeile wird übersprungen (Abbruchfragment, Spike Punkt 4), nie geworfen. */
    function verarbeiteZeile(zeile: string): void {
      if (zeile.trim() === '') return
      let geparst: unknown
      try {
        geparst = JSON.parse(zeile)
      } catch {
        return
      }
      if (typeof geparst !== 'object' || geparst === null || Array.isArray(geparst)) return
      const obj = geparst as Record<string, unknown>
      if (optionen?.beiStreamZeile !== undefined) {
        try {
          optionen.beiStreamZeile(obj)
        } catch (fehler) {
          console.error('[prozessstart] beiStreamZeile fehlgeschlagen:', fehler)
        }
      }
      const frueh = darfFruehAufloesen({
        ergebnisZeileBeendet: optionen?.ergebnisZeileBeendet === true,
        zeilentyp: obj.type,
        abbruchErkannt,
        maxBufferUeberschritten,
        gekillt: kindprozess.killed === true,
      })
      if (frueh) {
        aufloesen({ stdout, stderr, exitCode: null, startfehler: null, beendigungsart: null, ergebnisZeileVorProzessende: true })
        starteNachlaufFrist()
      }
    }

    let nachlaufTimer: ReturnType<typeof setTimeout> | null = null
    let prozessBeendet = false

    /** F40 WS-1: killt den fachlich fertigen Prozess, falls er NACHLAUF_FRIST_MS nach der result-Zeile noch lebt (s. NACHLAUF_FRIST_MS). */
    function starteNachlaufFrist(): void {
      const fristMs = optionen?.nachlaufFristMs ?? NACHLAUF_FRIST_MS
      nachlaufTimer = setTimeout(() => {
        if (prozessBeendet) return
        console.error(`[prozessstart] Prozess ${kindprozess.pid ?? '?'} lebte ${fristMs}ms nach der result-Zeile noch — wird beendet (Nachlauffrist, F40 WS-1)`)
        kindprozess.kill()
        void killeProzessbaumFallsWindows(kindprozess.pid)
      }, fristMs)
    }

    kindprozess.stdout?.setEncoding('utf8')
    kindprozess.stdout?.on('data', (chunk: string) => {
      pruefeMaxBuffer(Buffer.byteLength(chunk, 'utf8'))
      if (maxBufferUeberschritten) return
      stdout += chunk
      if (!zeilenLesen || bereitsAufgeloest) return
      const teile = (zeilenRest + chunk).split('\n')
      zeilenRest = teile.pop() ?? ''
      for (const zeile of teile) verarbeiteZeile(zeile)
    })
    kindprozess.stderr?.setEncoding('utf8')
    kindprozess.stderr?.on('data', (chunk: string) => {
      pruefeMaxBuffer(Buffer.byteLength(chunk, 'utf8'))
      if (!maxBufferUeberschritten) stderr += chunk
    })

    // Fängt sowohl den Abbruch (ABORT_ERR) als auch einen echten Startfehler (z.B. ENOENT/EACCES,
    // string-wertiger code) ab — 'close' feuert in beiden Fällen zusätzlich (empirisch geprüft),
    // die Klassifikation unten priorisiert deshalb dieses Ereignis vor 'close's eigenem code/signal.
    kindprozess.on('error', (fehler: NodeJS.ErrnoException) => {
      if (fehler.code === 'ABORT_ERR') {
        abbruchErkannt = true
        return
      }
      fruehesFehlerobjekt = { code: typeof fehler.code === 'string' ? fehler.code : null, message: fehler.message }
    })

    kindprozess.on('close', (code, signal) => {
      prozessBeendet = true
      if (nachlaufTimer !== null) clearTimeout(nachlaufTimer)
      if (optionen?.beiProzessende !== undefined) {
        try {
          optionen.beiProzessende({ exitCode: code, signal })
        } catch (fehler) {
          console.error('[prozessstart] beiProzessende fehlgeschlagen:', fehler)
        }
      }
      void behandeleErgebnis(code, signal)
    })

    async function behandeleErgebnis(code: number | null, signal: NodeJS.Signals | null): Promise<void> {
      if (maxBufferUeberschritten) {
        aufloesen({ stdout, stderr, exitCode: null, startfehler: { code: null, message: `maxBuffer (${MAX_BUFFER_BYTES} Bytes) überschritten` }, beendigungsart: null })
        return
      }
      if (abbruchErkannt) {
        await killeProzessbaumFallsWindows(kindprozess.pid)
        aufloesen({ stdout, stderr, exitCode: null, startfehler: null, beendigungsart: 'ABBRUCH' })
        return
      }
      if (kindprozess.killed === true && optionen?.zeitgrenzeMs !== undefined) {
        await killeProzessbaumFallsWindows(kindprozess.pid)
        aufloesen({ stdout, stderr, exitCode: null, startfehler: null, beendigungsart: 'TIMEOUT' })
        return
      }
      if (fruehesFehlerobjekt !== null) {
        aufloesen({ stdout, stderr, exitCode: null, startfehler: fruehesFehlerobjekt, beendigungsart: null })
        return
      }
      if (typeof code === 'number') {
        aufloesen({ stdout, stderr, exitCode: code, startfehler: null, beendigungsart: null })
        return
      }
      aufloesen({
        stdout,
        stderr,
        exitCode: null,
        startfehler: { code: null, message: `Kindprozess ohne Exitcode beendet${signal !== null ? ` (Signal ${signal})` : ''}` },
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
  const starterOptionen: StarterOptionen = {
    zeitgrenzeMs: optionen.zeitgrenzeMs,
    abbruchSignal: optionen.abbruchSignal,
    stdinLeer: optionen.stdinLeer,
    cwd: optionen.cwd,
    umgebungsvariablen: optionen.umgebungsvariablen,
    ergebnisZeileBeendet: optionen.ergebnisZeileBeendet,
    beiStreamZeile: optionen.beiStreamZeile,
    beiProzessende: optionen.beiProzessende,
    nachlaufFristMs: optionen.nachlaufFristMs,
  }
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
