/**
 * Datei: scripts/verify-f6a-real-run.mjs
 *
 * Zweck: WS4 (state/tasks/f6a-ws4-windows-prozessstart.md), einmaliger,
 * manueller Nachweis — kein Teil von `npm run check`/`check:template`
 * (Präzedenz scripts/verify-rename-atomicity.mjs, F1, state/gates.md Zeile
 * 970). Ruft WS2/WS4s starteGateway (src/claude-code-gateway/index.ts) OHNE
 * optionen.starter auf, sodass real prozessstart.ts' echterStarter läuft:
 * child_process.execFile(werkzeugStartziel[0], [...werkzeugStartziel.slice(1),
 * ...tokens], ...) unter Windows.
 *
 * WS3 hatte gezeigt: execFile('claude', tokens, ...) löst nur auf
 * claude.cmd auf — ENOENT ohne Shell, EINVAL mit explizitem .cmd-Suffix.
 * WS4 behebt das über ein vom Aufrufer bestimmtes Startziel (E2). Nach dem
 * Nachtrag 1 im Vertrag (Messschritt M, 02.09.2026) ist das Startziel die
 * native bin/claude.exe der npm-Global-Installation — kein node-
 * Zwischenschritt, kein aktivierter Shell-Modus (Stefans Entscheidung,
 * 02.09.2026, Option A). Die npm-Global-Wurzel wird über die
 * Windows-Standardablage %APPDATA%\npm\node_modules aufgelöst (identisch
 * mit dem in Messschritt M real gemessenen `npm root -g`-Wert) — der
 * CLI-Einstieg selbst kommt aber aus dem `bin`-Feld der package.json,
 * nicht aus einem geratenen Dateinamen.
 *
 * Tokens: WS1s baueAufruf() unverändert aufgerufen (kein zweiter, von Hand
 * gebauter Aufruf, D5), Werkzeugsatz ausschließlich lesend (Read, Grep) —
 * kein Edit/Write/Bash-mit-Wirkung. baueAufruf liefert selbst kein `-p
 * <prompt>` (AufrufEingaben kennt kein Prompt-Feld) — ohne einen Prompt
 * bliebe der reale Aufruf ohne Text-Eingabe. Dieses Skript hängt deshalb
 * `-p <PROMPT>` an das von baueAufruf gelieferte Array an (Muster
 * state/tp-nachtrag.md TP-03d Messfall 1/2) — keine Änderung an
 * baueAufruf/starteGateway/starteProzess selbst, nur eine zusätzliche,
 * unauffällige Ergänzung auf Aufrufer-Seite dieses Nachweis-Skripts.
 *
 * Kein Rot-Fall-Schritt für F-053, kein Schreibvorgang im externen
 * Autorisierungs-Repo (Option B, Stefans Entscheidung). Laufakte/Rohstrom
 * bleiben bewusst real unter kontrollzustand/ bzw.
 * kontrollzustand-roh/<lauf_id>/ stehen (Beleg für state/gates.md, keine
 * Aufräumfunktion wie in claude-code-gateway.test.ts — dort testet eine
 * Attrappe, hier ist das reale Artefakt selbst der Nachweis).
 *
 * Aufruf: node scripts/verify-f6a-real-run.mjs
 * Exit 0 = echter Prozess gestartet, valides Ergebnisobjekt, Laufakte +
 *          Rohstrom real erzeugt
 * Exit 1 = kein ausführbares Startziel gefunden, '--version' fehlgeschlagen,
 *          WS1-Check/AK15-Guard verweigert, oder kein valides
 *          Ergebnisobjekt (siehe ESCALATE im Vertrag)
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { stelleLaufstatusFest } from '../src/checkpoint-store/index.ts'
import { baueAufruf, starteGateway } from '../src/claude-code-gateway/index.ts'

const PROFIL_REFERENZ = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
const PROMPT = 'Lies die Datei package.json mit dem Read-Werkzeug und nenne ausschließlich den Wert des Feldes "name". Tu sonst nichts.'

console.log('\n=== F6a WS4 — Realer Nachweislauf, Windows-tauglicher Prozessstart (state/tasks/f6a-ws4-windows-prozessstart.md) ===\n')

// Messschritt M wiederholt: bin-Feld der package.json der npm-Global-
// Installation messen, nicht raten (Nachtrag 1 im Vertrag).
const npmRootGlobal = join(process.env.APPDATA ?? '', 'npm', 'node_modules')
const paketPfad = join(npmRootGlobal, '@anthropic-ai', 'claude-code', 'package.json')
const paket = JSON.parse(readFileSync(paketPfad, 'utf8'))
const binEintrag = paket.bin.claude
const startzielPfad = join(npmRootGlobal, '@anthropic-ai', 'claude-code', binEintrag)
const werkzeugStartziel = [startzielPfad]

console.log(`npm-Global-Wurzel: ${npmRootGlobal}`)
console.log(`bin-Feld (package.json): ${JSON.stringify(paket.bin)}`)
console.log(`werkzeugStartziel: ${JSON.stringify(werkzeugStartziel)}`)
console.log(`process.execPath: ${process.execPath}\n`)

let werkzeugVersionDeklariert
try {
  werkzeugVersionDeklariert = execFileSync(startzielPfad, ['--version'], { encoding: 'utf8' }).trim()
  console.log(`${startzielPfad} --version (real, vor dem eigentlichen Lauf geprüft): ${werkzeugVersionDeklariert}\n`)
} catch (fehler) {
  // Kein Abbruch hier: starteGateway fängt einen execFile-Fehler intern
  // über den Callback ab (kein Wurf, prozessstart.ts) und schreibt trotzdem
  // real eine Laufakte + einen Rohstrom (beobachtungsbasis_vollstaendig:
  // false). Deshalb hier nur melden, nicht abbrechen.
  werkzeugVersionDeklariert = `unbekannt (--version schlug fehl: ${fehler.code ?? fehler.message})`
  console.log(`✗ '--version' fehlgeschlagen: ${fehler.code ?? ''} ${fehler.message} — fahre trotzdem mit starteGateway fort.\n`)
}

const laufId = `verify-f6a-real-run-${randomUUID()}`
const tokens = [...baueAufruf({ modell: 'sonnet', werkzeugsatz: { modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read', 'Grep'] } }), '-p', PROMPT]

console.log(`lauf_id: ${laufId}`)
console.log(
  `Aufruf-Tokens (real an execFile(werkzeugStartziel[0], [...werkzeugStartziel.slice(1), ...tokens], ...) übergeben):\n${JSON.stringify(tokens)}\n`
)

const eingaben = {
  laufId,
  profilReferenz: PROFIL_REFERENZ,
  tokens,
  werkzeugStartziel,
  werkzeugVersionDeklariert,
  berechtigungskontext: 'ws4-realer-nachweis',
}

console.log('Starte starteGateway OHNE optionen.starter — WS4s echterStarter (execFile gegen werkzeugStartziel) läuft real, kein Attrappen-Ergebnis.\n')

const start = Date.now()
const ergebnis = await starteGateway(eingaben)
const dauerMs = Date.now() - start

console.log(`Dauer: ${dauerMs} ms\n`)
console.log('Ergebnis von starteGateway, im Wortlaut:')
console.log(JSON.stringify(ergebnis, null, 2))
console.log('')

if (!ergebnis.ok) {
  console.log(`✗ starteGateway verweigert (WS1-Check oder AK15-Guard griff, kein Prozessstart): ${ergebnis.grund}\n`)
  process.exit(1)
}

console.log(`Laufakte registriert unter (Lineage-Pfad): ${ergebnis.pfad}`)
console.log(`Rohstrom-Pfad: ${ergebnis.laufakte.rohstrom_referenz.pfad}`)
console.log(`beobachtungsbasis_vollstaendig: ${ergebnis.laufakte.beobachtungsbasis_vollstaendig}`)
console.log(`modell_beobachtet (F-059): ${JSON.stringify(ergebnis.laufakte.modell_beobachtet)}\n`)

const status = stelleLaufstatusFest(laufId)
console.log(`Laufstatus (F1B), im Wortlaut:\n${JSON.stringify(status, null, 2)}\n`)

if (!ergebnis.laufakte.beobachtungsbasis_vollstaendig) {
  console.log('✗ Kein valides Ergebnisobjekt — siehe ESCALATE im Vertrag (state/tasks/f6a-ws4-windows-prozessstart.md).\n')
  process.exit(1)
}

console.log(
  '✓ Realer Lauf: execFile(werkzeugStartziel[0], ...) hat unter Windows tatsächlich gestartet, ein valides ' +
    '"type":"result"-Ergebnisobjekt kam zurück, eine echte Laufakte + ein echter Rohstrom wurden erzeugt, ' +
    'F2-Registrierung erfolgte real.\n'
)
process.exit(0)
