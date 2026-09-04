/**
 * Datei: scripts/verify-f6b-ws-g-schreiblauf.mjs
 *
 * Zweck: F6b WS-G (F-053/§16.8 Punkt 3 Grün-Fall) — einmaliger, manueller,
 * jederzeit wiederholbarer Nachweis, dass `starteGateway` bei FREIGEGEBEN
 * (echter Aufruf von F4s `pruefeStartfreigabe`, E-183/E-188) einen echten
 * Prozess startet und dieser diesmal tatsächlich schreiben darf — Gegenstück
 * zu `scripts/verify-f6b-ws-f-rotfall.mjs` (Rot-Fall, Write NICHT im
 * erlaubten Werkzeugsatz). Tokens werden normal über WS1s `baueAufruf()`
 * gebaut (kein Handbau) — `baueAufruf` emittiert seit E7 sowohl `--tools`
 * als auch `--allowedTools` mit derselben `erlaubte_werkzeuge`-Liste, kein
 * Konflikt wie F-078 Messfall 3, weil hier beide Flags dieselbe (Write
 * einschließende) Liste tragen sollen.
 *
 * KEIN chdir (Option A, Stefan 03.09.2026 — bewusster Bruch mit dem
 * E6-Muster aus WS-F): `starteGateway` misst `istUebrigeFelder.
 * arbeitsverzeichnis_pfad` über `process.cwd()` zum Aufrufzeitpunkt: damit
 * dieser Wert exakt zum `arbeitsverzeichnis_pfad` im committeten
 * Wirksamkeitsnachweis passt (`C:\Users\stefa\Projekte\ai-workforce`),
 * bleibt das Arbeitsverzeichnis dieses Prozesses das reale Repo. Die reale
 * Schreibwirkung wird stattdessen über den Prompt-Inhalt in einen
 * git-ignorierten Scratch-Unterordner (`scratch-f6b-ws-g/`, `.gitignore`
 * ergänzt) umgeleitet — kein Prozessumzug, keine Verunreinigung des
 * Arbeitsbaums.
 *
 * `werkzeugStartziel`/`startziel_pfad` sind bewusst FEST auf
 * `C:\Program Files\claude\claude.exe` gesetzt (Option A) — identisch zum
 * `startziel_pfad` im committeten Wirksamkeitsnachweis. NICHT über die
 * npm-Global-Wurzel aufgelöst (anders als `verify-f6b-ws-f-rotfall.mjs`
 * und das gelöschte `verify-f6a-real-run.mjs`): dieser Pfad existiert auf
 * der Baumaschine nur, weil Stefan dort — außerhalb dieses Skripts, mit
 * Administratorrechten — einen Symlink auf die reale npm-Global-Installation
 * gelegt hat. Existiert der Pfad nicht (mehr), lehnt `pruefeStartziel`
 * (AK15) mit „keine existierende Datei" ab, bevor überhaupt ein
 * Prozessstart versucht wird — kein Absturz, klare Diagnose.
 *
 * `starteGateway` wird bewusst OHNE jede `optionen`-Überschreibung
 * aufgerufen: `settingsPfad`/`aktuelleAutorisierungPfad`/
 * `startfreigabeRepoWurzel` bleiben auf ihren echten Produktions-Standard-
 * werten (reales `.claude/settings.json`, reales
 * `state/aktuelle-autorisierung.json`, reales externes Autorisierungs-Repo)
 * — dieser Lauf ist der einzige in diesem Repo, der `starteGateway` exakt
 * so aufruft, wie es ein echter Aufrufer täte.
 *
 * Aufruf: node scripts/verify-f6b-ws-g-schreiblauf.mjs
 * Exit 0 = FREIGEGEBEN durchlaufen, Prozess real gestartet, die im Prompt
 *          genannte Datei ist im Scratch-Unterordner mit dem erwarteten
 *          Inhalt entstanden
 * Exit 1 = state/aktuelle-autorisierung.json fehlt (klarer Fehler, siehe
 *          Kopfkommentar, kein Absturz), C:\Program Files\claude\claude.exe
 *          existiert nicht (siehe Kopfkommentar — Symlink fehlt),
 *          starteGateway verweigert (ABGELEHNT oder AK15-Guard), keine
 *          valide Beobachtungsbasis, oder die Datei ist NICHT entstanden
 *          (siehe ESCALATE im Vertrag — dann NICHT nachjustieren, sondern
 *          melden)
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { baueAufruf, starteGateway } from '../src/claude-code-gateway/index.ts'

const PROFIL_REFERENZ = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
const SCRATCH_VERZEICHNIS_RELATIV = 'scratch-f6b-ws-g'
const ZIELDATEINAME = 'beweis-ws-g.txt'
const ZIELPFAD_RELATIV = `${SCRATCH_VERZEICHNIS_RELATIV}/${ZIELDATEINAME}`
const ZIELINHALT = 'WSG_SCHREIBLAUF_PROBE'
const PROMPT = `Erstelle eine Datei ${ZIELPFAD_RELATIV} (relativ zum aktuellen Arbeitsverzeichnis, der Unterordner ${SCRATCH_VERZEICHNIS_RELATIV} existiert bereits) mit dem Inhalt "${ZIELINHALT}". Nutze dafür das Write-Werkzeug.`
const AKTUELLE_AUTORISIERUNG_PFAD = join(process.cwd(), 'state', 'aktuelle-autorisierung.json')
const STARTZIEL_PFAD_FEST = 'C:\\Program Files\\claude\\claude.exe'

console.log('\n=== F6b WS-G — Echter Schreiblauf bei FREIGEGEBEN (state/tasks/f6b-ws-g-schreibpfad-scharf.md, Option A) ===\n')

if (!existsSync(AKTUELLE_AUTORISIERUNG_PFAD)) {
  console.log(`✗ Referenzdatei fehlt, siehe ${AKTUELLE_AUTORISIERUNG_PFAD} — kein Blocker für den Bauauftrag selbst (siehe Vertrag), aber dieser Lauf kann jetzt nicht real geprüft werden.\n`)
  process.exit(1)
}

if (!existsSync(STARTZIEL_PFAD_FEST)) {
  console.log(
    `✗ ${STARTZIEL_PFAD_FEST} existiert nicht — Symlink fehlt (siehe Kopfkommentar; Stefans Terminal, nicht dieses Skript). ` +
      'Kein Prozessstart möglich.\n'
  )
  process.exit(1)
}

const werkzeugStartziel = [STARTZIEL_PFAD_FEST]
console.log(`werkzeugStartziel (fest, Option A, identisch zum committeten Wirksamkeitsnachweis): ${JSON.stringify(werkzeugStartziel)}\n`)

let werkzeugVersionDeklariert
try {
  werkzeugVersionDeklariert = execFileSync(STARTZIEL_PFAD_FEST, ['--version'], { encoding: 'utf8' }).trim()
  console.log(`${STARTZIEL_PFAD_FEST} --version (real, vor dem eigentlichen Lauf geprüft): ${werkzeugVersionDeklariert}\n`)
} catch (fehler) {
  werkzeugVersionDeklariert = `unbekannt (--version schlug fehl: ${fehler.code ?? fehler.message})`
  console.log(`✗ '--version' fehlgeschlagen: ${fehler.code ?? ''} ${fehler.message} — fahre trotzdem fort.\n`)
}

const laufId = `verify-f6b-ws-g-schreiblauf-${randomUUID()}`
const tokens = [...baueAufruf({ modell: 'sonnet', werkzeugsatz: { modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read', 'Write'] } }), '-p', PROMPT]

console.log(`lauf_id: ${laufId}`)
console.log(`arbeitsverzeichnis_pfad (real, process.cwd(), KEIN chdir — Option A): ${process.cwd()}`)
console.log(`Aufruf-Tokens (über baueAufruf gebaut, --tools UND --allowedTools mit Write, E7):\n${JSON.stringify(tokens)}\n`)

const scratchVerzeichnisAbsolut = join(process.cwd(), SCRATCH_VERZEICHNIS_RELATIV)
mkdirSync(scratchVerzeichnisAbsolut, { recursive: true })
const zieldateiAbsolut = join(scratchVerzeichnisAbsolut, ZIELDATEINAME)
rmSync(zieldateiAbsolut, { force: true })
console.log(`Scratch-Unterordner (git-ignoriert, kein chdir): ${scratchVerzeichnisAbsolut}\n`)

const eingaben = {
  laufId,
  profilReferenz: PROFIL_REFERENZ,
  tokens,
  werkzeugStartziel,
  werkzeugVersionDeklariert,
  // Muss exakt zum berechtigungskontext im committeten Wirksamkeitsnachweis
  // passen (E-188 vergleicht ihn Feld für Feld) — nicht frei wählbar.
  berechtigungskontext: 'profil-standard',
}

console.log('Starte starteGateway OHNE optionen-Überschreibung — echte Produktionsstandardwerte (.claude/settings.json, state/aktuelle-autorisierung.json, externes Autorisierungs-Repo).\n')

const start = Date.now()
const ergebnis = await starteGateway(eingaben)
const dauerMs = Date.now() - start

console.log(`Dauer: ${dauerMs} ms\n`)
console.log('Ergebnis von starteGateway, im Wortlaut:')
console.log(JSON.stringify(ergebnis, null, 2))
console.log('')

if (!ergebnis.ok) {
  console.log(`✗ starteGateway verweigert (F4-ABGELEHNT, E-182/AK15-Guard, oder Referenzdatei-Problem — kein Prozessstart): ${ergebnis.grund}\n`)
  console.log('Siehe ESCALATE im Vertrag: NICHT nachjustieren, sondern melden, falls dies unerwartet ABGELEHNT liefert.\n')
  process.exit(1)
}

const zieldateiExistiert = existsSync(zieldateiAbsolut)
const zieldateiInhalt = zieldateiExistiert ? readFileSync(zieldateiAbsolut, 'utf8') : null
console.log(`${ZIELPFAD_RELATIV} entstanden: ${zieldateiExistiert}`)
if (zieldateiExistiert) console.log(`Inhalt: ${JSON.stringify(zieldateiInhalt)}\n`)

if (!zieldateiExistiert || zieldateiInhalt !== ZIELINHALT) {
  console.log(
    `✗ ESCALATE: starteGateway lieferte ok:true (FREIGEGEBEN), aber '${ZIELPFAD_RELATIV}' ist NICHT mit dem erwarteten Inhalt entstanden — ` +
      'Widerspruch zum erwarteten Grün-Fall, siehe ESCALATE im Vertrag.\n'
  )
  process.exit(1)
}

try {
  rmSync(scratchVerzeichnisAbsolut, { recursive: true, force: true })
  console.log(`Scratch-Unterordner aufgeräumt: ${scratchVerzeichnisAbsolut}\n`)
} catch (fehler) {
  console.log(`ⓘ Scratch-Unterordner-Aufräumung fehlgeschlagen (bekanntes Windows-Datei-Lock-Muster) — bleibt liegen: ${scratchVerzeichnisAbsolut}`)
  console.log(`  Fehler: ${fehler.message}\n`)
}

console.log(
  '✓ Grün-Fall real reproduziert: starteGateway hat F4s pruefeStartfreigabe real durchlaufen (FREIGEGEBEN — arbeitsverzeichnis_pfad ' +
    `und startziel_pfad matchen den committeten Wirksamkeitsnachweis), der Prozess wurde real gestartet und hat '${ZIELPFAD_RELATIV}' ` +
    'mit dem erwarteten Inhalt geschrieben.\n'
)
process.exit(0)
