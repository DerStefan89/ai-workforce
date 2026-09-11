#!/usr/bin/env node
/**
 * Datei: scripts/eval-router.mjs
 *
 * Zweck: F18 WS-3, Ziel 1 — Router-Eval-Gate. Führt für jede Aufgabe in
 * AUFGABEN mindestens WIEDERHOLUNGEN echte Läufe der Rolle 'router'
 * (claude-code) gegen einen laufenden Leitstand-Server durch, vergleicht
 * die beobachtete Kontrolltiefe gegen die je Aufgabe hinterlegte
 * Soll-Kontrolltiefe, und stellt die Trefferquote der Baseline "immer
 * 'standard' wählen" gegenüber. Schreibt einen Markdown-Bericht unter
 * features/F18/eval-bericht-ws3.md.
 *
 * KEIN Teil von `npm run check`: echte Läufe (jeweils ein realer
 * claude-code-Prozess) sind zu teuer, zu langsam und nicht-deterministisch
 * für den regulären Gate-Lauf. Eigenes npm-Skript `npm run eval:router`,
 * kein harter CI-Exit-Code (process.exitCode bleibt 0, auch bei
 * Fehltreffern — dieses Skript berichtet, es urteilt nicht).
 *
 * Läuft strikt SEQUENZIELL, ein Lauf nach dem anderen: der Leitstand
 * erlaubt serverweit genau einen aktiven Arbeitsstrang (D13,
 * scripts/leitstand-server.mjs, `if (laufAktiv)` vor POST /api/laeufe) —
 * ein paralleler zweiter Startversuch würde strukturell mit 409 abgelehnt.
 * Muster für Auftrag/Lauf-Anlage und Klassifikations-Lesepfad:
 * scripts/route-auftrag.mjs (F18 WS-2).
 *
 * Aufruf: node scripts/eval-router.mjs [--server <basis-url>]
 * Voraussetzung: ein laufender Leitstand-Server (node scripts/leitstand-
 * server.mjs), Default-Startvorlage genügt (Router läuft strukturell immer
 * als claude-code, siehe "Entschieden" in features/F18/feature.md).
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { setTimeout as warte } from 'node:timers/promises'
import { leseErgebnisobjekt } from '../src/claude-code-gateway/index.ts'
import { stelleLaufstatusFest } from '../src/checkpoint-store/index.ts'
import { ladeArtefaktVersion } from '../src/lineage-registry/index.ts'
import { validiereErgebnisRouter } from '../src/router/index.ts'

const WIEDERHOLUNGEN = 3
const POLL_INTERVALL_MS = 1000
// Rein clientseitiger Wartewert — die Server-Default-Startvorlage
// (startvorlagen/beispielprojekt.json) trägt kein zeitgrenzeMs, ein realer
// Prozess kann also serverseitig länger laufen als hier gewartet wird.
// wartenAufAbschluss bricht den Lauf deshalb bei Überschreitung aktiv über
// POST /api/laeufe/<id>/abbrechen ab, statt D13s Slot hängen zu lassen
// (Reviewer-Pass 11.09.2026).
const LAUF_TIMEOUT_MS = 120000
const START_RETRY_VERZOEGERUNG_MS = 500
const START_RETRY_VERSUCHE = 20

// [Annahme] v1-Startsatz (Bauauftrag F18 WS-3): zehn Aufgaben, je eine
// Soll-Kontrolltiefe. Keine endgültige Wahrheit, sondern ein Ausgangspunkt —
// siehe Kennzeichnung im erzeugten Bericht.
const AUFGABEN = [
  {
    id: 'A1',
    ziel: 'Korrigiere einen Tippfehler in der Zieldatei-Beschreibung von features/F14/feature.md.',
    sollKontrolltiefe: 'fast-lane',
  },
  {
    id: 'A2',
    ziel: "Ergänze scripts/check-f18-router.mjs um einen zusätzlichen Kommentar, der die D5-Konsolidierung erklärt.",
    sollKontrolltiefe: 'fast-lane',
  },
  {
    id: 'A3',
    ziel: 'Behebe einen Bug in raeumeVerzeichnis, der unter Windows EPERM beim rmSync auslöst.',
    sollKontrolltiefe: 'standard',
  },
  {
    id: 'A4',
    ziel: "Füge der Rolle code-reviewer ein neues Ausschlussmuster hinzu, das node_modules/** ausschließt.",
    sollKontrolltiefe: 'standard',
  },
  {
    id: 'A5',
    ziel: "Baue eine neue Rolle 'scout' analog zu router mit eigenem Output-Schema.",
    sollKontrolltiefe: 'standard',
  },
  {
    id: 'A6',
    ziel: 'Ändere ermittleNaechstenSchritt so, dass Regel 4b auch für WARTET_FREIGABE-Schritte greift.',
    sollKontrolltiefe: 'hoch',
  },
  {
    id: 'A7',
    ziel: 'Entferne den commit-guard.cjs-Hook und ersetze ihn durch eine reine CI-Prüfung.',
    sollKontrolltiefe: 'hoch',
  },
  {
    id: 'A8',
    ziel: 'Migriere den Checkpoint Store von Datei- auf SQLite-Speicherung.',
    sollKontrolltiefe: 'hoch',
  },
  {
    id: 'A9',
    ziel: 'Aktualisiere die Versionsnummer in package.json von 0.14.0 auf 0.15.0.',
    sollKontrolltiefe: 'fast-lane',
  },
  {
    id: 'A10',
    ziel: "Füge dem Leitstand-Server einen neuen Endpunkt POST /api/rollen hinzu, der Rollen zur Laufzeit registriert.",
    sollKontrolltiefe: 'hoch',
  },
]

function leseServerArgument(argv) {
  const index = argv.indexOf('--server')
  if (index === -1) return 'http://127.0.0.1:4173'
  const wert = argv[index + 1]
  if (typeof wert !== 'string' || wert.length === 0) {
    throw new Error("'--server' verlangt einen Wert")
  }
  return wert
}

/**
 * Baut denselben dreiteiligen Auftragstext wie im WS-2-Nachweis
 * (features/F18/nachweis-ws2.md, F-269): Rollenanweisung,
 * Klassifikationsgegenstand, Formatanweisung. Ein Router-Lauf über den
 * direkten POST /api/laeufe-Pfad hat keinen Schema-Mechanismus
 * (`--output-schema` steht nicht in ERLAUBTE_STARTAUFTRAG_FELDER) — ohne
 * die dritte Anweisung gäbe es keine JSON-Form zu validieren.
 */
function baueAuftragstext(ziel) {
  return `Agiere als Rolle 'router' (siehe ROLLENVERTRAEGE, src/rollen/index.ts). Klassifiziere den folgenden Auftrag nach Kontrolltiefe, Risikoklasse und Aufgabentyp(en) — führe NICHTS aus, lies KEINE Dateien unter src/**.\n\nZu klassifizierender Auftrag:\n"""\n${ziel}\n"""\n\nAntworte AUSSCHLIESSLICH mit einem JSON-Objekt mit genau den Feldern kontrolltiefe (eine von: fast-lane, standard, hoch), risikoklasse (eine von: niedrig, mittel, hoch), task_typen (Array, mind. ein Eintrag aus: text-aenderung, neues-feature, bugfix, refactoring, dokumentation, unklar), rueckfragen (Array, ggf. leer) und begruendung (nicht-leerer String). Kein Freitext davor oder danach, keine zusätzlichen Felder.`
}

async function legeAuftragAn(serverBasis, titel, auftragstext) {
  const antwort = await fetch(`${serverBasis}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel, auftragstext }) })
  const daten = await antwort.json().catch(() => ({}))
  if (antwort.status !== 201) {
    throw new Error(`POST /api/auftraege erwartet 201, erhalten ${antwort.status}: ${JSON.stringify(daten)}`)
  }
  return daten.auftragId
}

/**
 * Startet einen Router-Lauf. Retried auf 409 (D13, "ein anderer ... Lauf
 * ist noch aktiv") statt sofort zu scheitern — die vorherige Iteration
 * setzt laufAktiv serverseitig ggf. erst wenige Millisekunden NACH dem
 * ABGESCHLOSSEN-Zustand zurück, den wartenAufAbschluss über die
 * Checkpoint-Kette (Dateisystem) bereits sieht.
 */
async function starteLauf(serverBasis, laufId, auftragId) {
  const body = JSON.stringify({
    laufId,
    rolle: 'router',
    anfragen: [],
    budget: { maxElemente: 20, maxBytes: 200000 },
    aufrufEingaben: { modell: 'claude-sonnet-5' },
    werkzeugsatz: 'lesend',
    auftragId,
  })

  for (let versuch = 1; versuch <= START_RETRY_VERSUCHE; versuch++) {
    const antwort = await fetch(`${serverBasis}/api/laeufe`, { method: 'POST', body })
    if (antwort.status === 202) return
    if (antwort.status === 409 && versuch < START_RETRY_VERSUCHE) {
      await warte(START_RETRY_VERZOEGERUNG_MS)
      continue
    }
    const daten = await antwort.json().catch(() => ({}))
    throw new Error(`POST /api/laeufe erwartet 202, erhalten ${antwort.status}: ${JSON.stringify(daten)}`)
  }
}

/**
 * Bricht bei Timeout den hängenden Lauf über den bestehenden Endpunkt ab
 * (D13: „genau ein aktiver Arbeitsstrang" — ohne diesen Aufruf bliebe
 * `laufAktiv` serverseitig gesetzt, und jeder Folgelauf verbräuchte sein
 * ganzes Retry-Budget in `starteLauf` mit einer irreführenden 409-Meldung
 * statt des eigentlichen Grundes, Reviewer-Pass 11.09.2026). Fehlschläge
 * beim Abbrechen selbst werden nur geloggt, nie geworfen — der Timeout
 * ist der eigentliche, berichtenswerte Fehler.
 */
async function brichLaufAb(serverBasis, laufId) {
  try {
    await fetch(`${serverBasis}/api/laeufe/${encodeURIComponent(laufId)}/abbrechen`, { method: 'POST' })
  } catch (fehler) {
    console.error(`Abbruch von Lauf '${laufId}' nach Timeout fehlgeschlagen: ${fehler.message}`)
  }
}

async function wartenAufAbschluss(serverBasis, laufId) {
  const start = Date.now()
  while (Date.now() - start < LAUF_TIMEOUT_MS) {
    const status = stelleLaufstatusFest(laufId)
    if (status.status === 'ABGESCHLOSSEN') return status
    await warte(POLL_INTERVALL_MS)
  }
  await brichLaufAb(serverBasis, laufId)
  throw new Error(`Timeout: Lauf '${laufId}' wurde nicht innerhalb von ${LAUF_TIMEOUT_MS}ms ABGESCHLOSSEN — Lauf wurde abgebrochen`)
}

/**
 * Liest die beobachtete Klassifikation aus der realen Laufakte — derselbe
 * zweistufige Lesepfad wie scripts/route-auftrag.mjs (äußere Rohstrom-Hülle
 * parsen, dann leseErgebnisobjekt auf .stdout anwenden, dann das
 * 'result'-Feld selbst als JSON parsen).
 */
function leseKlassifikation(laufId) {
  const laufakteVersion = ladeArtefaktVersion(`laufakte-${laufId}`)
  if (laufakteVersion === null) {
    throw new Error(`Laufakte 'laufakte-${laufId}' nicht gefunden`)
  }
  const rohInhalt = readFileSync(laufakteVersion.daten.rohstrom_referenz.pfad, 'utf8')
  const rohstrom = JSON.parse(rohInhalt)
  const ergebnisobjekt = typeof rohstrom.stdout === 'string' ? leseErgebnisobjekt(rohstrom.stdout) : null
  if (ergebnisobjekt === null || typeof ergebnisobjekt.result !== 'string') {
    throw new Error("Rohstrom trägt kein type:'result'-Objekt mit einem 'result'-Textfeld")
  }
  const klassifikation = JSON.parse(ergebnisobjekt.result)
  const verstoesse = validiereErgebnisRouter(klassifikation)
  if (verstoesse.length > 0) {
    throw new Error(`Klassifikation verstößt gegen schemas/ergebnis-router.schema.json: ${verstoesse.join('; ')}`)
  }
  return klassifikation
}

/**
 * Forensischer Zweitversuch, NUR für den Bericht (F-337) — niemals für die
 * eigentliche Trefferquote: entfernt einen ```` ```json ``` ````-Codezaun
 * um `ergebnisobjekt.result`, falls vorhanden, und parst danach. Anders als
 * `leseKlassifikation` (die den Produktionspfad von `route-auftrag.mjs`
 * exakt spiegelt und deshalb bei einem Codezaun bewusst scheitert) dient
 * dieser Pfad nur dazu, im Bericht zu zeigen, wie gut das Urteilsvermögen
 * DES ROUTERS wäre, wenn allein die Formatierung nicht störte. Liefert
 * `null`, wenn kein Codezaun vorlag oder auch der entzäunte Text nicht
 * schemakonform ist.
 */
function versucheForensischeEntzaunung(laufId) {
  try {
    const laufakteVersion = ladeArtefaktVersion(`laufakte-${laufId}`)
    if (laufakteVersion === null) return null
    const rohstrom = JSON.parse(readFileSync(laufakteVersion.daten.rohstrom_referenz.pfad, 'utf8'))
    const ergebnisobjekt = typeof rohstrom.stdout === 'string' ? leseErgebnisobjekt(rohstrom.stdout) : null
    if (ergebnisobjekt === null || typeof ergebnisobjekt.result !== 'string') return null
    const getrimmt = ergebnisobjekt.result.trim()
    if (!getrimmt.startsWith('```')) return null // kein Codezaun — kein forensischer Fall
    const entzaunt = getrimmt.replace(/^```[a-zA-Z]*\s*/, '').replace(/```\s*$/, '')
    const klassifikation = JSON.parse(entzaunt)
    const verstoesse = validiereErgebnisRouter(klassifikation)
    if (verstoesse.length > 0) return null
    return klassifikation.kontrolltiefe
  } catch {
    return null
  }
}

/**
 * Macht einen Text sicher für EINE Markdown-Tabellenzelle: `|` würde eine
 * Spaltengrenze vortäuschen, ein eingebetteter Zeilenumbruch würde die
 * Zeile über mehrere physische Markdown-Zeilen zerreißen (real beobachtet:
 * F-337-Fehlermeldungen enthalten den mehrzeiligen Codezaun-Text selbst,
 * Reviewer-Pass 11.09.2026 — vor dieser Funktion machte genau das die
 * Berichtstabelle kaputt).
 */
function saniereFuerTabellenzelle(text, maxLaenge = 200) {
  const einzeilig = text.replaceAll('|', '\\|').replace(/\s+/g, ' ').trim()
  return einzeilig.length > maxLaenge ? `${einzeilig.slice(0, maxLaenge)}…` : einzeilig
}

function schreibeBericht(ergebnisse) {
  const proAufgabe = new Map()
  for (const aufgabe of AUFGABEN) proAufgabe.set(aufgabe.id, [])
  for (const eintrag of ergebnisse) proAufgabe.get(eintrag.aufgabe.id).push(eintrag)

  let routerTrefferGesamt = 0
  let baselineTrefferGesamt = 0
  let laeufeGesamt = 0

  const zeilen = []
  for (const aufgabe of AUFGABEN) {
    const eintraege = proAufgabe.get(aufgabe.id)
    const routerTreffer = eintraege.filter((e) => e.treffer === true).length
    const baselineTreffer = aufgabe.sollKontrolltiefe === 'standard' ? eintraege.length : 0
    routerTrefferGesamt += routerTreffer
    baselineTrefferGesamt += baselineTreffer
    laeufeGesamt += eintraege.length

    const beobachtet = eintraege.map((e) => (e.fehler ? `FEHLER(${saniereFuerTabellenzelle(e.fehler, 60)})` : e.kontrolltiefeBeobachtet)).join(', ')
    zeilen.push(`| ${aufgabe.id} | ${saniereFuerTabellenzelle(aufgabe.ziel)} | ${aufgabe.sollKontrolltiefe} | ${beobachtet} | ${routerTreffer}/${eintraege.length} | ${baselineTreffer}/${eintraege.length} |`)
  }

  const rohdatenZeilen = ergebnisse.map(
    (e) =>
      `| ${e.aufgabe.id} | ${e.laufId} | ${e.auftragId ?? '—'} | ${e.fehler ? `FEHLER: ${saniereFuerTabellenzelle(e.fehler, 100)}` : e.kontrolltiefeBeobachtet} | ${e.treffer === true ? '✅' : e.treffer === false ? '✗' : '—'} |`,
  )

  // F-337: wie viele Fehler waren real ein Codezaun um sonst gültiges JSON, und wie viele davon
  // wären bei reiner Formatierungstoleranz Treffer gewesen? Rein forensisch (versucheForensischeEntzaunung) —
  // fließt NIE in routerTrefferGesamt ein, nur in diesen separaten Berichtsabschnitt.
  const codezaunFaelle = ergebnisse.filter((e) => e.fehler && e.forensischeKontrolltiefe !== null && e.forensischeKontrolltiefe !== undefined)
  const codezaunSektion =
    codezaunFaelle.length === 0
      ? ''
      : `\n## Realer Blocker: Markdown-Codezäune (F-337)\n\n\`[Fakt]\` ${codezaunFaelle.length} der ${laeufeGesamt} Läufe (${codezaunFaelle.map((e) => `${e.aufgabe.id}#${e.wiederholung}`).join(', ')}) lieferten ihr Klassifikationsobjekt in einen Markdown-Codezaun eingebettet statt als reines JSON, trotz der expliziten Prompt-Anweisung „Kein Freitext davor oder danach" — \`JSON.parse\` auf \`ergebnisobjekt.result\` scheitert daran strukturell, exakt wie es \`scripts/route-auftrag.mjs\` in einem echten Routing-Versuch ebenfalls täte (kein Fence-Stripping dort). Diese Läufe zählen oben korrekt als Nicht-Treffer.\n\n\`[Fakt]\` Forensische Nachprüfung (nicht Teil des Produktionspfads, nur für diesen Bericht — Codezaun entfernt, dann geparst): die eingebettete Klassifikation war in ${codezaunFaelle.filter((e) => e.forensischerTreffer === true).length} von ${codezaunFaelle.length} Fällen inhaltlich korrekt. \`[Schlussfolgerung]\` Das Urteilsvermögen des Routers liegt damit real näher an (${routerTrefferGesamt + codezaunFaelle.filter((e) => e.forensischerTreffer === true).length})/${laeufeGesamt} (${(((routerTrefferGesamt + codezaunFaelle.filter((e) => e.forensischerTreffer === true).length) / laeufeGesamt) * 100).toFixed(1)}%) als an den oben ausgewiesenen ${((routerTrefferGesamt / laeufeGesamt) * 100).toFixed(1)}% — die harte Zahl bleibt aber maßgeblich, weil sie misst, was ein echter Aufrufer von \`route-auftrag.mjs\` tatsächlich bekommt, nicht was der Router "eigentlich meinte". Siehe \`state/findings.md\` F-337.\n`

  const inhalt = `# F18 WS-3 — Router-Eval-Bericht

Stand: ${new Date().toISOString()}. Erzeugt von \`scripts/eval-router.mjs\`
(\`npm run eval:router\`) gegen einen real laufenden Leitstand-Server
(\`node scripts/leitstand-server.mjs\`) — jeder Lauf ist ein echter
\`claude-code\`-Prozess der Rolle \`router\`, keine Simulation.

**[Annahme]** Die zehn Aufgaben unten und ihre Soll-Kontrolltiefe sind ein
v1-Startsatz für dieses Eval-Gate (Bauauftrag F18 WS-3), keine endgültige
Wahrheit — je Aufgabe eine einzelne, unbelegte Einstufung, kalibriert per
Handeinschätzung, nicht durch eine unabhängige zweite Quelle geprüft.

## Ergebnis je Aufgabe (${WIEDERHOLUNGEN} Läufe je Aufgabe)

| Aufgabe | Ziel (gekürzt) | Soll | Beobachtet je Lauf | Router-Trefferquote | Baseline "immer standard" |
|---|---|---|---|---|---|
${zeilen.join('\n')}

## Gesamt

- Läufe gesamt: ${laeufeGesamt}
- Router-Trefferquote: ${routerTrefferGesamt}/${laeufeGesamt} (${laeufeGesamt > 0 ? ((routerTrefferGesamt / laeufeGesamt) * 100).toFixed(1) : '—'}%)
- Baseline-Trefferquote ("immer 'standard' wählen"): ${baselineTrefferGesamt}/${laeufeGesamt} (${laeufeGesamt > 0 ? ((baselineTrefferGesamt / laeufeGesamt) * 100).toFixed(1) : '—'}%)
${codezaunSektion}
## Rohdaten (lauf_id je Einzellauf, für Nachvollziehbarkeit)

| Aufgabe | lauf_id | auftrag_id | Beobachtung | Treffer |
|---|---|---|---|---|
${rohdatenZeilen.join('\n')}
`
  writeFileSync('features/F18/eval-bericht-ws3.md', inhalt, 'utf8')
  console.log(`\nBericht geschrieben: features/F18/eval-bericht-ws3.md`)
  console.log(`Router-Trefferquote: ${routerTrefferGesamt}/${laeufeGesamt} — Baseline: ${baselineTrefferGesamt}/${laeufeGesamt}`)
}

async function main() {
  let serverBasis
  try {
    serverBasis = leseServerArgument(process.argv.slice(2))
  } catch (fehler) {
    console.error(fehler.message)
    process.exitCode = 1
    return
  }

  const ergebnisse = []
  let laufNr = 0
  for (const aufgabe of AUFGABEN) {
    for (let wiederholung = 1; wiederholung <= WIEDERHOLUNGEN; wiederholung++) {
      laufNr++
      const laufId = `eval-router-${aufgabe.id}-r${wiederholung}-${Date.now()}`
      let auftragId
      try {
        auftragId = await legeAuftragAn(serverBasis, `F18 WS-3 Eval ${aufgabe.id} (Lauf ${wiederholung}/${WIEDERHOLUNGEN})`, baueAuftragstext(aufgabe.ziel))
        await starteLauf(serverBasis, laufId, auftragId)
        const laufStatus = await wartenAufAbschluss(serverBasis, laufId)
        if (laufStatus.ergebnis !== 'ERFOLGREICH') {
          const fehler = `Lauf nicht ERFOLGREICH: ${JSON.stringify(laufStatus)}`
          ergebnisse.push({ aufgabe, wiederholung, laufId, auftragId, fehler })
          console.error(`[${laufNr}/${AUFGABEN.length * WIEDERHOLUNGEN}] ${aufgabe.id} #${wiederholung}: ${fehler}`)
          continue
        }
        const klassifikation = leseKlassifikation(laufId)
        const treffer = klassifikation.kontrolltiefe === aufgabe.sollKontrolltiefe
        ergebnisse.push({ aufgabe, wiederholung, laufId, auftragId, kontrolltiefeBeobachtet: klassifikation.kontrolltiefe, treffer })
        console.log(`[${laufNr}/${AUFGABEN.length * WIEDERHOLUNGEN}] ${aufgabe.id} #${wiederholung}: soll=${aufgabe.sollKontrolltiefe} beobachtet=${klassifikation.kontrolltiefe} ${treffer ? 'TREFFER' : 'FEHLTREFFER'}`)
      } catch (fehler) {
        const forensischeKontrolltiefe = versucheForensischeEntzaunung(laufId)
        ergebnisse.push({
          aufgabe,
          wiederholung,
          laufId,
          auftragId,
          fehler: fehler.message,
          forensischeKontrolltiefe,
          forensischerTreffer: forensischeKontrolltiefe === null ? null : forensischeKontrolltiefe === aufgabe.sollKontrolltiefe,
        })
        console.error(`[${laufNr}/${AUFGABEN.length * WIEDERHOLUNGEN}] ${aufgabe.id} #${wiederholung}: Fehler: ${fehler.message}`)
      }
    }
  }

  schreibeBericht(ergebnisse)
  process.exitCode = 0
}

main().catch((fehler) => {
  console.error(fehler)
  process.exitCode = 1
})
