/**
 * Datei: src/claude-code-gateway/prozessstart.ts
 *
 * Zweck: Prozessstart-Primitiv für F6a WS2
 * (state/tasks/f6a-ws2-prozessstart.md). starteProzess ruft ausschließlich
 * child_process.execFile mit dem Tokens-Array als argv auf (F-057) — nie
 * eine shell-interpretierte Kommandozeile, execFile umgeht den Shell-Parser
 * vollständig. Austauschbar über optionen.starter (Muster wie F1Bs
 * optionen.schreiber), damit `npm run test`/`check` ohne echten
 * Prozessstart und ohne Netzzugriff laufen (AK10).
 *
 * Windows-`.cmd`-Wrapper-Verhalten von execFile('claude', …) ist real erst
 * mit WS3 auf der Zielmaschine geprüft (Offene Unsicherheit 2 aus
 * state/plan-v1-f6a-ws2-ws3-prozessstart.md) — keine stillschweigende
 * Anpassung (z. B. ein aktivierter Shell-Modus) hier.
 *
 * attrappeMitValidemErgebnis/attrappeOhneErgebnisobjekt bilden wörtlich die
 * beiden in state/tp-nachtrag.md real gemessenen Formen ab (TP-03d
 * Messfall 1: valides "type":"result"-JSON mit permission_denials: [];
 * TP-01e Messfall A: Abbruch, leeres stdout/stderr, Exit 137, kein
 * Ergebnisobjekt) — für Tests und Gate-Skript gemeinsam nutzbar (D5, kein
 * zweimal von Hand abgetipptes Fixture).
 */

import { execFile } from 'node:child_process'
import type { AufrufTokens, ProzessErgebnis, Starter } from './types.ts'

const CLAUDE_BEFEHL = 'claude'

const echterStarter: Starter = (tokens) =>
  new Promise((resolve) => {
    execFile(CLAUDE_BEFEHL, tokens, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 64 }, (fehler, stdout, stderr) => {
      const exitCode = fehler === null ? 0 : typeof fehler.code === 'number' ? fehler.code : null
      resolve({ stdout, stderr, exitCode })
    })
  })

export function starteProzess(tokens: AufrufTokens, optionen: { starter?: Starter } = {}): Promise<ProzessErgebnis> {
  const starter = optionen.starter ?? echterStarter
  return starter(tokens)
}

/** TP-03d Messfall 1, wörtlich übernommen (state/tp-nachtrag.md, Zeile 27-31). */
export const attrappeMitValidemErgebnis: Starter = async () => ({
  stdout: JSON.stringify({
    type: 'result',
    permission_denials: [],
    result: "Ausgabe:\n\n```\n> projektname@0.1.0 tp03d-probe\n> node -e \"console.log('TP03D_PROBE_MARKER')\"\n\nTP03D_PROBE_MARKER\n```",
  }),
  stderr: '',
  exitCode: 0,
})

/** TP-01e Messfall A, wörtlich übernommen (state/tp-nachtrag.md, Zeile 243-256): kein Ergebnisobjekt, leeres stdout/stderr, Exit 137. */
export const attrappeOhneErgebnisobjekt: Starter = async () => ({
  stdout: '',
  stderr: '',
  exitCode: 137,
})
