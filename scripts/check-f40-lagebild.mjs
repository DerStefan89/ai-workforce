/**
 * Datei: scripts/check-f40-lagebild.mjs
 *
 * Zweck: Gate für F40 WS-2 (Lagebild für Jarvis). Prüft:
 * (a) Grün-Fall: die reale `docs/projekt/kontext/lagebild.md` ist über
 *     `baueLagebildInhalt` aus den realen `docs/STATUS.md`/
 *     `state/findings.md` reproduzierbar — kein Drift zwischen Quelle und
 *     committeter Datei (D5, kein zweiter Erzeugungsweg);
 * (b) Rot-Fall (rein, ohne Dateisystem): eine geänderte STATUS-Quelle
 *     erzeugt real einen anderen Inhalt als die reale Datei — belegt, dass
 *     der Vergleich in (a) nicht zufällig immer gleich ausfällt;
 * (c) Rot-Fall (real über die CLI, Subprozess mit Wegwerf-Pfaden):
 *     `node scripts/erzeuge-lagebild.mjs --check` gegen eine mit einer
 *     Wegwerf-Ausgabedatei mit abweichendem Inhalt liefert real Exit 1;
 * (d) Grün-Fall (real über die CLI): dieselbe Wegwerf-Ausgabedatei, einmal
 *     über die CLI neu erzeugt, liefert bei erneutem `--check` real Exit 0;
 * (e) `leseOffeneP1Findings` liest ausschließlich Köpfe mit `· P1 · offen`
 *     (nicht `P0`/`P2`, nicht `**gelöst**`) — synthetischer Rot-Fall.
 * (f) QA-Pass-Befund: eine Findings-Quelle ganz ohne offene P1-Einträge
 *     rendert den Platzhaltertext "(keine offenen P1-Findings)", statt
 *     eine leere Zeile zu erzeugen oder zu werfen.
 * (g) QA-Pass-Befund: ein P1-Kopf ohne (oder mit unerwarteter) `Titel:`-
 *     Zeile fällt sichtbar auf einen Platzhaltertext zurück, statt zu
 *     verschwinden oder zu werfen.
 *
 * Aufruf: node scripts/check-f40-lagebild.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { baueLagebildInhalt, leseOffeneP1Findings } from './erzeuge-lagebild.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []

console.log('\n=== F40-WS2-Lagebild-Check ===\n')

const STATUS_PFAD = 'docs/STATUS.md'
const FINDINGS_PFAD = 'state/findings.md'
const LAGEBILD_PFAD = 'docs/projekt/kontext/lagebild.md'

const statusInhalt = readFileSync(STATUS_PFAD, 'utf8')
const findingsInhalt = readFileSync(FINDINGS_PFAD, 'utf8')

// Reviewer-Befund: baueLagebildInhalt wirft (z.B. wenn "## Aktuelle Phase" künftig fehlt) —
// ohne try/catch bräche das Gate mit Stacktrace ab statt mit einem lesbaren Befund-Eintrag
// im gewohnten Format dieser Datei. Alle folgenden Abschnitte hängen von `erzeugt` ab, ein
// Scheitern hier beendet den Lauf deshalb sofort (kein sinnvoller Teilbetrieb möglich).
let erzeugt
try {
  erzeugt = baueLagebildInhalt(statusInhalt, findingsInhalt, { statusPfad: STATUS_PFAD, findingsPfad: FINDINGS_PFAD })
} catch (fehler) {
  befunde.push(`(a) baueLagebildInhalt(${STATUS_PFAD}, ${FINDINGS_PFAD}) wirft: ${fehler.message}`)
  console.log(`✗ 1 Befund(e):\n\n  - ${befunde[0]}\n`)
  process.exit(1)
}

// ─── (a) Grün-Fall: reale Datei entspricht dem real erzeugten Inhalt ────────
{
  if (!existsSync(LAGEBILD_PFAD)) {
    befunde.push(`(a) '${LAGEBILD_PFAD}' existiert nicht — 'node scripts/erzeuge-lagebild.mjs' laufen lassen`)
  } else {
    const vorhanden = readFileSync(LAGEBILD_PFAD, 'utf8')
    if (vorhanden !== erzeugt) {
      befunde.push(`(a) '${LAGEBILD_PFAD}' weicht vom aus ${STATUS_PFAD}/${FINDINGS_PFAD} erzeugten Inhalt ab (Drift) — 'node scripts/erzeuge-lagebild.mjs' erneut laufen lassen`)
    } else {
      console.log(`✓ (a) '${LAGEBILD_PFAD}' ist aktuell (kein Drift gegen ${STATUS_PFAD}/${FINDINGS_PFAD}).`)
    }
  }
}

// ─── (b) Rot-Fall rein: geänderte Quelle erzeugt real einen anderen Inhalt ──
{
  const veraenderteStatusInhalt = statusInhalt.replace('## Aktuelle Phase', '## Aktuelle Phase\n\nKünstlich veränderte Zeile für den Rot-Fall-Test.')
  const erzeugtVeraendert = baueLagebildInhalt(veraenderteStatusInhalt, findingsInhalt, { statusPfad: STATUS_PFAD, findingsPfad: FINDINGS_PFAD })
  if (erzeugtVeraendert === erzeugt) {
    befunde.push('(b) baueLagebildInhalt liefert für eine künstlich veränderte STATUS-Quelle denselben Inhalt wie für die reale — Drift-Erkennung wäre wirkungslos')
  } else if (existsSync(LAGEBILD_PFAD) && erzeugtVeraendert === readFileSync(LAGEBILD_PFAD, 'utf8')) {
    befunde.push('(b) veränderte Quelle erzeugt zufällig denselben Inhalt wie die reale Datei — Testaufbau selbst defekt')
  } else {
    console.log('✓ (b) Eine künstlich veränderte STATUS-Quelle erzeugt real einen anderen Inhalt (Drift-Erkennung nicht wirkungslos).')
  }
}

// ─── (c)/(d) Rot-/Grün-Fall real über die CLI (Subprozess, Wegwerf-Pfade) ───
{
  const basisVerzeichnis = `kontrollzustand-test-f40-lagebild-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  try {
    mkdirSync(basisVerzeichnis, { recursive: true })
    const statusKopie = join(basisVerzeichnis, 'STATUS.md')
    const findingsKopie = join(basisVerzeichnis, 'findings.md')
    const ausgabe = join(basisVerzeichnis, 'lagebild.md')
    writeFileSync(statusKopie, statusInhalt, 'utf8')
    writeFileSync(findingsKopie, findingsInhalt, 'utf8')
    writeFileSync(ausgabe, 'absichtlich falscher Inhalt für den Rot-Fall\n', 'utf8')

    // (c) Rot-Fall: Ausgabe weicht ab → --check muss real mit Exit 1 scheitern.
    let rotFallExitCode = 0
    try {
      execFileSync('node', ['scripts/erzeuge-lagebild.mjs', '--status', statusKopie, '--findings', findingsKopie, '--ausgabe', ausgabe, '--check'], {
        stdio: 'pipe',
      })
    } catch (fehler) {
      rotFallExitCode = fehler.status ?? 1
    }
    if (rotFallExitCode === 0) {
      befunde.push('(c) `--check` gegen eine absichtlich abweichende Ausgabedatei lieferte Exit 0 statt eines Rot-Falls')
    } else {
      console.log(`✓ (c) \`node scripts/erzeuge-lagebild.mjs --check\` gegen eine abweichende Ausgabedatei liefert real Exit ${rotFallExitCode}.`)
    }

    // (d) Grün-Fall: dieselbe Datei einmal neu erzeugen, danach muss --check Exit 0 liefern.
    execFileSync('node', ['scripts/erzeuge-lagebild.mjs', '--status', statusKopie, '--findings', findingsKopie, '--ausgabe', ausgabe], { stdio: 'pipe' })
    let gruenFallExitCode = 0
    try {
      execFileSync('node', ['scripts/erzeuge-lagebild.mjs', '--status', statusKopie, '--findings', findingsKopie, '--ausgabe', ausgabe, '--check'], {
        stdio: 'pipe',
      })
    } catch (fehler) {
      gruenFallExitCode = fehler.status ?? 1
    }
    if (gruenFallExitCode !== 0) {
      befunde.push(`(d) \`--check\` direkt nach einem regulären Lauf lieferte Exit ${gruenFallExitCode} statt 0`)
    } else {
      console.log('✓ (d) Nach einem regulären Lauf (ohne --check) liefert ein anschließendes `--check` real Exit 0.')
    }
  } finally {
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (e) leseOffeneP1Findings liest ausschließlich '· P1 · offen'-Köpfe ─────
{
  const synthetischeFindings = `# Findings

**F-001** · \`BUG\` · P1 · offen
Titel: Sollte erscheinen.

**F-002** · \`BUG\` · P0 · offen
Titel: P0 sollte NICHT erscheinen.

**F-003** · \`BUG\` · P1 · **gelöst**
Titel: Gelöst sollte NICHT erscheinen.

**F-004** · \`TECH_DEBT\` · P1 · offen, zurückgestellt (E-192)
Titel: Anhang nach 'offen' sollte trotzdem erscheinen.
`
  const treffer = leseOffeneP1Findings(synthetischeFindings)
  const ids = treffer.map((f) => f.id)
  const erwartet = ['F-001', 'F-004']
  const stimmtUeberein = ids.length === erwartet.length && erwartet.every((id, i) => ids[i] === id)
  if (!stimmtUeberein) {
    befunde.push(`(e) leseOffeneP1Findings liefert ${JSON.stringify(ids)}, erwartet ${JSON.stringify(erwartet)} (P0/gelöst dürfen nicht auftauchen)`)
  } else {
    console.log('✓ (e) leseOffeneP1Findings liest ausschließlich P1-Köpfe mit Status "offen" (P0 und "gelöst" korrekt ausgeschlossen, Anhang nach "offen" korrekt eingeschlossen).')
  }
}

// ─── (f) QA-Pass-Befund: leere P1-Trefferliste rendert den Platzhaltertext, ─
// ─── nicht eine leere Zeile oder einen Wurf ─────────────────────────────────
{
  const findingsOhneP1 = '# Findings\n\n**F-001** · `BUG` · P0 · offen\nTitel: nur P0, keine P1.\n'
  const inhalt = baueLagebildInhalt(statusInhalt, findingsOhneP1, { statusPfad: STATUS_PFAD, findingsPfad: FINDINGS_PFAD })
  if (!inhalt.includes('(keine offenen P1-Findings)')) {
    befunde.push('(f) baueLagebildInhalt zeigt bei einer leeren P1-Trefferliste nicht den erwarteten Platzhaltertext "(keine offenen P1-Findings)"')
  } else {
    console.log('✓ (f) Eine Findings-Quelle ohne offene P1-Einträge rendert den Platzhaltertext "(keine offenen P1-Findings)".')
  }
}

// ─── (g) QA-Pass-Befund: fehlende/unerwartete Titel-Zeile fällt sichtbar ────
// ─── auf einen Platzhalter zurück, statt eine leere oder falsche Zeile zu ───
// ─── erzeugen ────────────────────────────────────────────────────────────────
{
  const findingsOhneTitelzeile = '# Findings\n\n**F-005** · `BUG` · P1 · offen\nKeine Titel-Zeile hier, sondern Fließtext.\n'
  const treffer = leseOffeneP1Findings(findingsOhneTitelzeile)
  const erwarteterPlatzhalter = '(Titel-Zeile fehlt oder unerwartetes Format)'
  if (treffer.length !== 1 || treffer[0].titel !== erwarteterPlatzhalter) {
    befunde.push(`(g) leseOffeneP1Findings liefert bei fehlender Titel-Zeile ${JSON.stringify(treffer)}, erwartet einen Eintrag mit titel === ${JSON.stringify(erwarteterPlatzhalter)}`)
  } else {
    console.log('✓ (g) Ein P1-Kopf ohne (oder mit unerwarteter) Titel-Zeile fällt sichtbar auf den Platzhalter zurück, statt zu verschwinden oder zu werfen.')
  }
}

console.log('')
if (befunde.length === 0) {
  console.log('✓ Keine Befunde.\n')
  process.exitCode = 0
} else {
  console.log(`✗ ${befunde.length} Befund(e):\n`)
  for (const b of befunde) console.log(`  - ${b}`)
  console.log('')
  process.exitCode = 1
}
