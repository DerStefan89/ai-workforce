/**
 * Datei: scripts/erzeuge-lagebild.mjs
 *
 * Zweck: Erzeugt `docs/projekt/kontext/lagebild.md` aus `docs/STATUS.md`
 * (Abschnitt "## Aktuelle Phase", wörtlich) und `state/findings.md` (alle
 * offenen P1-Findings, ID + Titel) — F40 WS-2. Grundlage:
 * `state/spike-f40-streaming.md` §3/§5: `docs/STATUS.md` ist in 11 von 15
 * Mehrrunden-Jarvis-Läufen der erste Werkzeugzugriff, `state/findings.md`
 * (592 KB) wird mehrfach gegrept statt einmal vorab mitgegeben zu werden.
 * Beide Quellen werden über `baueProjektkontextAnfragen`
 * (`scripts/leitstand-server.mjs`) für die Rollen `jarvis`/`router`
 * eingespeist — kein zweiter Lesepfad (D5).
 *
 * Deterministisch: kein Zeitstempel im Inhalt, sonst erzeugt jeder Lauf
 * Diff-Rauschen und der `--check`-Modus wäre nie stabil grün.
 *
 * Wird aufgerufen von:
 * - `scripts/check-f40-lagebild.mjs` (Gate, importiert die reinen
 *   Funktionen für Grün-/Rot-Fall, ruft die CLI zusätzlich real per
 *   Subprozess mit Wegwerf-Pfaden auf).
 * - `npm run check` indirekt über das Gate — die Datei selbst wird
 *   VORHER von Hand/CI neu erzeugt (`node scripts/erzeuge-lagebild.mjs`)
 *   und committet, das Gate prüft nur, ob sie noch aktuell ist.
 *
 * Wichtig: Der Umschnitt der Titel-Zeile folgt exakt dem Format in
 * `state/findings.md` (`**F-NNN** · \`TYP\` · P1 · offen`, mit optionalem
 * Anhang wie ", zurückgestellt (E-192)") — ein mehrzeiliger `Titel:`-Text
 * wird bewusst NICHT über die Zeile hinaus gelesen (nur die `Titel:`-Zeile
 * selbst zählt), sonst bräuchte der Parser eine zweite, fragile Grenze.
 *
 * Aufruf:
 *   node scripts/erzeuge-lagebild.mjs                  — schreibt die Datei
 *   node scripts/erzeuge-lagebild.mjs --check           — Exit 1 bei Drift
 *   node scripts/erzeuge-lagebild.mjs --status <pfad> --findings <pfad> \
 *     --ausgabe <pfad> [--check]                        — Pfade überschreiben
 * Exit 0 = geschrieben bzw. aktuell, Exit 1 = Drift (nur --check) oder
 * Quelldatei fehlt/hat keinen "## Aktuelle Phase"-Abschnitt.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const STANDARD_STATUS_PFAD = 'docs/STATUS.md'
const STANDARD_FINDINGS_PFAD = 'state/findings.md'
const STANDARD_AUSGABE_PFAD = 'docs/projekt/kontext/lagebild.md'

/** Zeile, mit der jeder offene P1-Finding-Kopf beginnt (Typ als Gruppe 2). */
const P1_OFFEN_MUSTER = /^\*\*F-(\d+)\*\* · `(\w+)` · P1 · offen\b/

/**
 * Liest den Abschnitt "## Aktuelle Phase" aus `docs/STATUS.md` wörtlich
 * (bis zur nächsten `##`-Überschrift oder Dateiende).
 * @param statusInhalt - roher Inhalt von docs/STATUS.md
 * @returns der Abschnittstext ohne die Überschrift selbst, getrimmt
 */
export function leseAktuellePhaseAbschnitt(statusInhalt) {
  const zeilen = statusInhalt.split('\n')
  const startIndex = zeilen.findIndex((zeile) => zeile.trim() === '## Aktuelle Phase')
  if (startIndex === -1) {
    throw new Error('leseAktuellePhaseAbschnitt: Abschnitt "## Aktuelle Phase" nicht gefunden')
  }
  const rest = zeilen.slice(startIndex + 1)
  const endeIndex = rest.findIndex((zeile) => /^##\s/.test(zeile))
  const abschnittZeilen = endeIndex === -1 ? rest : rest.slice(0, endeIndex)
  return abschnittZeilen.join('\n').trim()
}

/**
 * Liest alle offenen P1-Findings aus `state/findings.md` (ID, Typ, Titel),
 * sortiert nach numerischer ID.
 * @param findingsInhalt - roher Inhalt von state/findings.md
 * @returns Liste von { id, typ, titel }
 */
export function leseOffeneP1Findings(findingsInhalt) {
  const zeilen = findingsInhalt.split('\n')
  const treffer = []
  for (let i = 0; i < zeilen.length; i++) {
    const kopf = zeilen[i].match(P1_OFFEN_MUSTER)
    if (!kopf) continue
    const titelZeile = zeilen[i + 1] ?? ''
    const titelMatch = titelZeile.match(/^Titel:\s*(.+)$/)
    treffer.push({
      id: `F-${kopf[1]}`,
      typ: kopf[2],
      titel: titelMatch ? titelMatch[1].trim() : '(Titel-Zeile fehlt oder unerwartetes Format)',
    })
  }
  treffer.sort((a, b) => Number(a.id.slice(2)) - Number(b.id.slice(2)))
  return treffer
}

/**
 * Baut den vollständigen, deterministischen Inhalt von
 * `docs/projekt/kontext/lagebild.md` aus bereits gelesenem Quellinhalt.
 * @param statusInhalt - roher Inhalt der STATUS-Quelle
 * @param findingsInhalt - roher Inhalt der Findings-Quelle
 * @param optionen - { statusPfad, findingsPfad } für die Kopfzeilen (Anzeige, keine Leselogik)
 * @returns fertiger Dateiinhalt
 */
export function baueLagebildInhalt(statusInhalt, findingsInhalt, optionen = {}) {
  const statusPfad = optionen.statusPfad ?? STANDARD_STATUS_PFAD
  const findingsPfad = optionen.findingsPfad ?? STANDARD_FINDINGS_PFAD
  // ARCHITECTURE.md §7: der Kern schreibt ausnahmslos LF. `split('\n')` in den beiden
  // Lesefunktionen ließe bei einer künftigen CRLF-Quelle \r-Reste am Zeilenende jeder
  // Zeile außer der letzten stehen (Reviewer-Befund) — hier normalisiert, VOR jedem
  // Parsing, statt an zwei Stellen getrennt.
  const phase = leseAktuellePhaseAbschnitt(statusInhalt.replace(/\r\n/g, '\n'))
  const findings = leseOffeneP1Findings(findingsInhalt.replace(/\r\n/g, '\n'))
  const findingsBlock =
    findings.length === 0 ? '(keine offenen P1-Findings)' : findings.map((f) => `- ${f.id} · ${f.typ} · ${f.titel}`).join('\n')

  return `# Lagebild — abgeleitete Datei, NICHT von Hand ändern

Erzeugt von \`scripts/erzeuge-lagebild.mjs\` aus \`${statusPfad}\`
(Abschnitt "Aktuelle Phase") und \`${findingsPfad}\` (offene P1-Findings,
ID + Titel). Neu erzeugen statt bearbeiten: \`node
scripts/erzeuge-lagebild.mjs\`.

Findings-Liste deckt nur \`${findingsPfad}\` ab — neuere Findings können
fehlen, wenn diese Datei seit deren Eintragung nicht neu erzeugt wurde.

## Aktuelle Phase

${phase}

## Offene P1-Findings

${findingsBlock}
`
}

const istDirekterAufruf = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (istDirekterAufruf) {
  /** Parst --flag wert-Paare; ein Folgetoken, das selbst mit -- beginnt, gilt als nächstes Flag statt als Wert. */
  function leseFlags(argv) {
    const flags = { check: false }
    for (let i = 0; i < argv.length; i++) {
      if (argv[i] === '--check') {
        flags.check = true
        continue
      }
      if (!argv[i].startsWith('--')) continue
      const name = argv[i].slice(2)
      const naechstesToken = argv[i + 1]
      if (naechstesToken !== undefined && !naechstesToken.startsWith('--')) {
        flags[name] = naechstesToken
        i++
      }
    }
    return flags
  }

  const flags = leseFlags(process.argv.slice(2))
  const statusPfad = flags.status ?? STANDARD_STATUS_PFAD
  const findingsPfad = flags.findings ?? STANDARD_FINDINGS_PFAD
  const ausgabePfad = flags.ausgabe ?? STANDARD_AUSGABE_PFAD

  console.log('\n=== F40 WS-2 — Lagebild erzeugen ===\n')

  if (!existsSync(statusPfad)) {
    console.log(`✗ '${statusPfad}' existiert nicht\n`)
    process.exit(1)
  }
  if (!existsSync(findingsPfad)) {
    console.log(`✗ '${findingsPfad}' existiert nicht\n`)
    process.exit(1)
  }

  let erzeugt
  try {
    const statusInhalt = readFileSync(statusPfad, 'utf8')
    const findingsInhalt = readFileSync(findingsPfad, 'utf8')
    erzeugt = baueLagebildInhalt(statusInhalt, findingsInhalt, { statusPfad, findingsPfad })
  } catch (fehler) {
    console.log(`✗ ${fehler.message}\n`)
    process.exit(1)
  }

  if (flags.check) {
    if (!existsSync(ausgabePfad)) {
      console.log(`✗ '${ausgabePfad}' existiert nicht — 'node scripts/erzeuge-lagebild.mjs' laufen lassen\n`)
      process.exit(1)
    }
    const vorhanden = readFileSync(ausgabePfad, 'utf8')
    if (vorhanden !== erzeugt) {
      console.log(`✗ '${ausgabePfad}' weicht vom erzeugten Inhalt ab — 'node scripts/erzeuge-lagebild.mjs' erneut laufen lassen\n`)
      process.exit(1)
    }
    console.log(`✓ '${ausgabePfad}' ist aktuell\n`)
    process.exit(0)
  }

  writeFileSync(ausgabePfad, erzeugt, 'utf8')
  console.log(`✓ '${ausgabePfad}' geschrieben (${leseOffeneP1Findings(readFileSync(findingsPfad, 'utf8')).length} offene P1-Findings)\n`)
  process.exit(0)
}
