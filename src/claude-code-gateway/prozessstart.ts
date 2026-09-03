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
 */

import { execFile } from 'node:child_process'
import { statSync } from 'node:fs'
import { extname, resolve as aufgeloesterPfad } from 'node:path'
import type { AufrufTokens, ProzessErgebnis, Starter } from './types.ts'

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

const echterStarter: Starter = (startziel, tokens) =>
  new Promise((resolve) => {
    try {
      execFile(
        startziel[0],
        [...startziel.slice(1), ...tokens],
        { encoding: 'utf8', maxBuffer: 1024 * 1024 * 64 },
        (fehler, stdout, stderr) => {
          if (fehler === null) {
            resolve({ stdout, stderr, exitCode: 0, startfehler: null })
            return
          }
          if (typeof fehler.code === 'number') {
            resolve({ stdout, stderr, exitCode: fehler.code, startfehler: null })
            return
          }
          resolve({
            stdout,
            stderr,
            exitCode: null,
            startfehler: { code: typeof fehler.code === 'string' ? fehler.code : null, message: fehler.message },
          })
        }
      )
    } catch (fehler) {
      const f = fehler as NodeJS.ErrnoException
      resolve({ stdout: '', stderr: '', exitCode: null, startfehler: { code: typeof f.code === 'string' ? f.code : null, message: f.message } })
    }
  })

/** Der Guard greift vor optionen.starter (plan-v2 Delta 9) — ein Rot-Fall mit injiziertem Spy-Starter belegt damit, dass bei ungültigem Startziel kein Spawn versucht wird. */
export function starteProzess(startziel: string[], tokens: AufrufTokens, optionen: { starter?: Starter } = {}): Promise<ProzessErgebnis> {
  const pruefung = pruefeStartziel(startziel)
  if (!pruefung.ok) {
    return Promise.resolve({ stdout: '', stderr: '', exitCode: null, startfehler: { code: null, message: pruefung.grund } })
  }
  const starter = optionen.starter ?? echterStarter
  return starter(startziel, tokens)
}

/** TP-03d Messfall 1, wörtlich übernommen (state/tp-nachtrag.md, Zeile 27-31). Beide Parameter explizit (Delta 10) — kein Ein-Parameter-Callback, der still am falschen Argument bindet. */
export const attrappeMitValidemErgebnis: Starter = async (_startziel, _tokens) => ({
  stdout: JSON.stringify({
    type: 'result',
    permission_denials: [],
    result: "Ausgabe:\n\n```\n> projektname@0.1.0 tp03d-probe\n> node -e \"console.log('TP03D_PROBE_MARKER')\"\n\nTP03D_PROBE_MARKER\n```",
  }),
  stderr: '',
  exitCode: 0,
  startfehler: null,
})

/** TP-01e Messfall A, wörtlich übernommen (state/tp-nachtrag.md, Zeile 243-256): kein Ergebnisobjekt, leeres stdout/stderr, Exit 137. Beide Parameter explizit (Delta 10). */
export const attrappeOhneErgebnisobjekt: Starter = async (_startziel, _tokens) => ({
  stdout: '',
  stderr: '',
  exitCode: 137,
  startfehler: null,
})
