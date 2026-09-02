/**
 * Datei: scripts/verify-f6a-real-run.mjs
 *
 * Zweck: WS3 (state/tasks/f6a-ws3-realer-nachweis.md), einmaliger, manueller
 * Nachweis — kein Teil von `npm run check`/`check:template` (Präzedenz
 * scripts/verify-rename-atomicity.mjs, F1, state/gates.md Zeile 970). Ruft
 * WS2s starteGateway (src/claude-code-gateway/index.ts, PR #42) OHNE
 * optionen.starter auf, sodass real prozessstart.ts' echterStarter läuft:
 * child_process.execFile('claude', tokens, ...) unter Windows. Klärt Offene
 * Unsicherheit 2 aus state/plan-v1-f6a-ws2-ws3-prozessstart.md Abschnitt 8
 * (execFile-Verhalten für den bloßen Namen 'claude' unter Windows, inkl.
 * .cmd-Wrapper-Frage) — real, nicht nur gegen die Attrappen aus
 * prozessstart.ts.
 *
 * Tokens: WS1s baueAufruf() unverändert aufgerufen (kein zweiter, von Hand
 * gebauter Aufruf, D5), Werkzeugsatz ausschließlich lesend (Read, Grep) —
 * kein Edit/Write/Bash-mit-Wirkung. baueAufruf liefert selbst kein `-p
 * <prompt>` (AufrufEingaben kennt kein Prompt-Feld) — ohne einen Prompt
 * bliebe der reale Aufruf ohne Text-Eingabe. Dieses Skript hängt deshalb
 * `-p <PROMPT>` an das von baueAufruf gelieferte Array an (Muster
 * state/tp-nachtrag.md TP-03d Messfall 1/2: `-p "..." --output-format json
 * --setting-sources project`) — keine Änderung an baueAufruf/starteGateway/
 * starteProzess selbst (SCOPE NICHT dieses Vertrags), nur eine zusätzliche,
 * unauffällige Ergänzung auf Aufrufer-Seite dieses Nachweis-Skripts.
 *
 * Kein Rot-Fall-Schritt für F-053, kein Schreibvorgang im externen
 * Autorisierungs-Repo (Option B, Stefans Entscheidung, siehe CONTEXT im
 * Vertrag). Laufakte/Rohstrom bleiben bewusst real unter kontrollzustand/
 * bzw. kontrollzustand-roh/<lauf_id>/ stehen (Beleg für state/gates.md,
 * keine Aufräumfunktion wie in claude-code-gateway.test.ts — dort testet
 * eine Attrappe, hier ist das reale Artefakt selbst der Nachweis).
 *
 * Aufruf: node scripts/verify-f6a-real-run.mjs
 * Exit 0 = echter Prozess gestartet, valides Ergebnisobjekt, Laufakte +
 *          Rohstrom real erzeugt
 * Exit 1 = 'claude --version' fehlgeschlagen, WS1-Check verweigert, oder
 *          kein valides Ergebnisobjekt (siehe ESCALATE im Vertrag)
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { stelleLaufstatusFest } from '../src/checkpoint-store/index.ts'
import { baueAufruf, starteGateway } from '../src/claude-code-gateway/index.ts'

const PROFIL_REFERENZ = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
const PROMPT = 'Lies die Datei package.json mit dem Read-Werkzeug und nenne ausschließlich den Wert des Feldes "name". Tu sonst nichts.'

console.log('\n=== F6a WS3 — Realer Nachweislauf (state/tasks/f6a-ws3-realer-nachweis.md) ===\n')

let werkzeugVersionDeklariert
try {
  werkzeugVersionDeklariert = execFileSync('claude', ['--version'], { encoding: 'utf8' }).trim()
  console.log(`claude --version (real, lesend, vor dem eigentlichen Lauf geprüft): ${werkzeugVersionDeklariert}\n`)
} catch (fehler) {
  // Kein Abbruch hier (Änderung ggü. Fassung 1 dieses Skripts): der
  // Vorlauf-Check scheitert am selben Windows-execFile-Problem, das WS3
  // gerade real klären soll (Offene Unsicherheit 2). starteGateway unten
  // fängt einen execFile-Fehler intern über den Callback ab (kein Wurf,
  // prozessstart.ts) und schreibt trotzdem real eine Laufakte +
  // einen Rohstrom (beobachtungsbasis_vollstaendig: false) — SCOPE 2b-2d
  // dieses Vertrags bleiben damit real erreichbar, auch wenn der
  // eigentliche claude-Prozess nicht startet. Deshalb hier nur melden,
  // nicht abbrechen.
  werkzeugVersionDeklariert = `unbekannt (claude --version schlug fehl: ${fehler.code ?? fehler.message})`
  console.log(`✗ 'claude --version' fehlgeschlagen: ${fehler.code ?? ''} ${fehler.message} — fahre trotzdem mit starteGateway fort (siehe Kommentar im Skript).\n`)
}

const laufId = `verify-f6a-real-run-${randomUUID()}`
const tokens = [...baueAufruf({ modell: 'sonnet', werkzeugsatz: { modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read', 'Grep'] } }), '-p', PROMPT]

console.log(`lauf_id: ${laufId}`)
console.log(`Aufruf-Tokens (real an execFile('claude', tokens, ...) übergeben):\n${JSON.stringify(tokens)}\n`)

const eingaben = {
  laufId,
  profilReferenz: PROFIL_REFERENZ,
  tokens,
  werkzeugVersionDeklariert,
  berechtigungskontext: 'ws3-realer-nachweis',
}

console.log('Starte starteGateway OHNE optionen.starter — WS2s echterStarter (execFile) läuft real, kein Attrappen-Ergebnis.\n')

const start = Date.now()
const ergebnis = await starteGateway(eingaben)
const dauerMs = Date.now() - start

console.log(`Dauer: ${dauerMs} ms\n`)
console.log('Ergebnis von starteGateway, im Wortlaut:')
console.log(JSON.stringify(ergebnis, null, 2))
console.log('')

if (!ergebnis.ok) {
  console.log(`✗ starteGateway verweigert (WS1-Check griff, kein Prozessstart): ${ergebnis.grund}\n`)
  process.exit(1)
}

console.log(`Laufakte registriert unter (Lineage-Pfad): ${ergebnis.pfad}`)
console.log(`Rohstrom-Pfad: ${ergebnis.laufakte.rohstrom_referenz.pfad}`)
console.log(`beobachtungsbasis_vollstaendig: ${ergebnis.laufakte.beobachtungsbasis_vollstaendig}`)
console.log(`modell_beobachtet (F-059): ${JSON.stringify(ergebnis.laufakte.modell_beobachtet)}\n`)

const status = stelleLaufstatusFest(laufId)
console.log(`Laufstatus (F1B), im Wortlaut:\n${JSON.stringify(status, null, 2)}\n`)

if (!ergebnis.laufakte.beobachtungsbasis_vollstaendig) {
  console.log('✗ Kein valides Ergebnisobjekt — siehe ESCALATE im Vertrag (state/tasks/f6a-ws3-realer-nachweis.md).\n')
  process.exit(1)
}

console.log(
  "✓ Realer Lauf: execFile('claude', tokens, ...) hat unter Windows tatsächlich gestartet, ein valides " +
    "\"type\":\"result\"-Ergebnisobjekt kam zurück, eine echte Laufakte + ein echter Rohstrom wurden erzeugt, " +
    'F2-Registrierung erfolgte real.\n'
)
process.exit(0)
