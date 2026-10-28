/**
 * Datei: scripts/check-kette.mjs
 *
 * Zweck: Die Gate-Kette von `npm run check:gates` (F45 W2a): eine Quelle für die Liste der Gates (GATES) und ein Läufer,
 * der sie mit begrenzter Parallelität ausführt. Bis W2a stand die Liste als `&&`-Kette in package.json und lief streng
 * nacheinander (Σ ≈ 704 s einzeln gemessen, features/F45/nachweise/t/messung.md). Ablauf: zuerst SERIELL einzeln (kein
 * anderes Gate gleichzeitig, Repo-Stand wie beim Start), danach alle übrigen mit höchstens N gleichzeitig in
 * Listenreihenfolge — auch wenn die serielle Gruppe rot ist. Plan: features/F45/plan-w2a-v2.md, Advisor advisor-w2a.md,
 * Prüfpass Abschnitt „Stand W2a“ in features/F45/feature.md.
 *
 * Wird aufgerufen von:
 * - package.json „check:gates“ (Teil von `npm run check`; CI über `npm run check`)
 * - scripts/messe-check.mjs (GATES, gleiche Liste für die Messung)
 * - scripts/check-kette.test.mjs
 *
 * Wichtig:
 * - GATES sind die Befehlszeilen wörtlich aus der früheren Kette, gleiche Reihenfolge; jede läuft per
 *   `spawn(befehl, { shell: true })` wie unter `npm run` (cmd.exe bzw. sh, geerbte Umgebung mit node_modules/.bin im PATH,
 *   stdin ignoriert — dieselbe Startform nutzte scripts/messe-check.mjs für alle 122 Gates). Neues Gate: hier eintragen.
 * - Parallelität: Standard 4 (= --test-concurrency der parallelen Testgruppe in scripts/teste.mjs; größte Gate-Spitzen
 *   270 MB Node-RSS bzw. 330 MB Δ System liegen in deren Rahmen). Änderbar über AIW_GATES_PARALLEL (ganze Zahl ≥ 1;
 *   1 = alles nacheinander, Rückfallebene bei Speicherdruck F-1205). Ungültiger Wert ⇒ Exit 2 vor dem ersten Gate.
 * - Abweichungen von der Kette (DEKLARIERT): (1) Reihenfolge — SERIELL läuft vor allen anderen. Bis W2b-2 standen
 *   die Repo-Baum-Läufer (check-docs, check-rules, check-f45-k-kontext, check-secrets) dort, damit sie keine
 *   Wegwerf-Ordner anderer Gates sahen; seit W2b-2 legt kein Gate mehr etwas im Repo-Baum an (scripts/_wegwerf.ts), sie
 *   laufen parallel. (2) Nach einem roten Gate
 *   laufen die übrigen weiter. Das Gesamturteil bleibt gleich (rot ⇔ mindestens ein Gate rot); das Urteil je Gate gilt
 *   sicher für Gates, die vor dem ersten roten fertig wurden — ein rot abgebrochenes Gate kann Reste hinterlassen, an
 *   denen spätere rot werden (bis W2b-2 z. B. startvorlagen/test-*.json für check-f16 (e)). Darum nennt die Zusammenfassung das
 *   zuerst rot gewordene Gate zuerst und in ihrer letzten Zeile noch einmal.
 * - Ausgabe: je Gate sofort eine Startzeile „▶ <befehl>“, beim Ende ein Block aus Kopfzeile (✓/✗, Dauer) und der
 *   gepufferten Ausgabe (stdout nach stdout, stderr nach stderr, nicht verschränkt). Ganz am Ende die Zusammenfassung mit
 *   den letzten 20 Zeilen je rotem Gate und als letzte Zeile „zuerst rot: …“ — der Prüfschritt der Workforce behält nur
 *   das Ende der Ausgabe (src/pruefschritt/index.ts, letzte ≈ 40 Zeilen). Ein hängendes Gate erkennt man an einer
 *   Startzeile ohne Kopfzeile. Die Puffer sind unbegrenzt (Gate-Ausgaben liegen im Kilobyte-Bereich) — DEKLARIERT.
 * - Exit: 0 alle grün, 1 mindestens ein Gate rot (auch Startfehler, Signal), 2 Aufruffehler (Zusatzargumente,
 *   AIW_GATES_PARALLEL, Liste inkonsistent, Arbeitsordner nicht die Repo-Wurzel). Gesetzt über process.exitCode, damit
 *   gepufferte Ausgabe in eine Pipe vollständig abfließt. Der Haupteinstieg vergleicht die Pfade per realpath (unter
 *   Windows ohne Groß-/Kleinschreibung), damit ein Aufruf über Junction/Symlink nicht still nichts tut und grün endet.
 * - Nur node:-Importe: die Datei fällt unter das Prüfketten-Muster `scripts/check-*` (Regel 1j, F-713,
 *   src/aenderungsuebersicht/index.ts); ein Import aus src/ läge außerhalb dieses Schutzes (advisor-w2a.md B1).
 * - Kein Timeout je Gate (die Kette hatte keins). Bricht der Aufrufer ab (Zeitgrenze des Prüfschritts), trifft ein
 *   kill() unter Windows nur die cmd.exe der Gates; bis zu N Gate-Prozessbäume können verwaisen. Ein Gate, das einen
 *   Enkelprozess mit geerbtem stdout zurücklässt, hält den Läufer an, bis der endet (Pipe statt geerbter Konsole) —
 *   beides DEKLARIERT, nicht behandelt (advisor-w2a.md B6).
 */

import { spawn } from 'node:child_process'
import { existsSync, realpathSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'

/** Alle Gates von `npm run check:gates`, in Ausführungsreihenfolge (bis F45 W2a die `&&`-Kette in package.json). */
export const GATES = [
  'npm run lint',
  'npm run typecheck',
  'node scripts/check-docs.mjs',
  'node scripts/check-status-akten.mjs',
  'node scripts/check-rules.mjs',
  'node scripts/check-contract.mjs',
  'node scripts/check-feature.mjs',
  'node scripts/check-akte-meilenstein.mjs',
  'node scripts/check-datenformate.mjs',
  'node scripts/check-checkpoint-store.mjs',
  'node scripts/check-lineage-registry.mjs',
  'node scripts/check-f1b-wirkungsmarke.mjs',
  'node scripts/check-f3-authorization-boundary.mjs',
  'node scripts/check-f9-human-transport.mjs',
  'node scripts/check-f5-context-builder.mjs',
  'node scripts/check-f4-invocation-policy.mjs',
  'node scripts/check-f6a-claude-code-gateway.mjs',
  'node scripts/check-f7-result-evaluator.mjs',
  'node scripts/check-f8-execution-controller.mjs',
  'node scripts/check-f10-leitstand.mjs',
  'node scripts/check-f11-auftrag.mjs',
  'node scripts/check-f12-leitstand-ansicht.mjs',
  'node scripts/check-f13-entscheiden.mjs',
  'node scripts/check-f14-abbruch.mjs',
  'node scripts/check-f15-workflow.mjs',
  'node scripts/check-f15-instanzlock.mjs',
  'node scripts/check-f15-automat-real.mjs',
  'node scripts/check-f16-codex-gateway.mjs',
  'node scripts/check-f17-rollenvertrag.mjs',
  'node scripts/check-f18-router.mjs',
  'node scripts/check-f19-ressourcen.mjs',
  'node scripts/check-f20-design-tokens.mjs',
  'node scripts/check-f44-i18n.mjs',
  'node scripts/check-f46-bestand.mjs',
  'node scripts/check-f20-zustand-poll.mjs',
  'node scripts/check-f21-workboard.mjs',
  'node scripts/check-f21-ws2-workboard-oberflaeche.mjs',
  'node scripts/check-f22-click-to-work.mjs',
  'node scripts/check-f23-abnahme.mjs',
  'node scripts/check-f27-scout.mjs',
  'node scripts/check-f25-projekte.mjs',
  'node scripts/check-f26-jarvis.mjs',
  'node scripts/check-f28-persona.mjs',
  'node scripts/check-f31-gedaechtnis.mjs',
  'node scripts/check-f32-verbrauch.mjs',
  'node scripts/check-f32-verbrauch-ansicht.mjs',
  'node scripts/check-f33-projektkontext.mjs',
  'node scripts/check-f33-roadmap-projektion.mjs',
  'node scripts/check-f34-product-coach.mjs',
  'node scripts/check-f39-architekt.mjs',
  'node scripts/check-f652-pruefschritt.mjs',
  'node scripts/check-f656-pruefung-wiederholen.mjs',
  'node scripts/check-f659-review-korrektur-begruendung.mjs',
  'node scripts/check-f40-lagebild.mjs',
  'node scripts/check-fix-zustand-poll-kosten.mjs',
  'node scripts/check-fix-f588-sammle-laeufe.mjs',
  'node scripts/check-fix-f639-schema-strict-modus.mjs',
  'node scripts/check-f41-projekt-anlegen.mjs',
  'node scripts/check-fix-f676-installwurzel.mjs',
  'node scripts/check-f42-projekt-harness.mjs',
  'node scripts/check-skelett-herkunft.mjs',
  'node scripts/check-f35-ws1-feature-auftrag.mjs',
  'node scripts/check-f35-ws2-urteil-je-ak.mjs',
  'node scripts/check-f35-ws3-adjust-automatik.mjs',
  'node scripts/check-zustand-sichern.mjs',
  'node scripts/check-git-starter.mjs',
  'node scripts/check-fixpaket-f30-vorbedingungen.mjs',
  'node scripts/check-fixpaket-f35-reallauf.mjs',
  'node scripts/check-f36-ws2-laufzeit.mjs',
  'node scripts/check-f36-ws3-empfehlung.mjs',
  'node scripts/check-f36-ws5a-installation.mjs',
  'node scripts/check-f36-ws5b-skill.mjs',
  'node scripts/check-f45-f1-faehigkeiten.mjs',
  'node scripts/check-f45-f2b-sammlung.mjs',
  'node scripts/check-f45-f2b2-pruefung.mjs',
  'node scripts/check-f45-b2a1-projektkarte.mjs',
  'node scripts/check-f45-b2a2-arbeitspaket.mjs',
  'node scripts/check-f45-b2a3-codex-review.mjs',
  'node scripts/check-f45-b2a3b-review-stand.mjs',
  'node scripts/check-f45-f3a-plugins.mjs',
  'node scripts/check-f45-f3a2-anzeige.mjs',
  'node scripts/check-f45-f3b1-freigabe.mjs',
  'node scripts/check-f45-f3b2-lauf.mjs',
  'node scripts/check-f45-b2b1-rueckweg.mjs',
  'node scripts/check-f45-b2b2-pruefer.mjs',
  'node scripts/check-f45-b2b3c-budget.mjs',
  'node scripts/check-f45-b2b3d-umfang.mjs',
  'node scripts/check-f45-b2b3b1-rueckfrage.mjs',
  'node scripts/check-f45-b2b3b1b-auswertung.mjs',
  'node scripts/check-f45-b2b3b2a-absicherung.mjs',
  'node scripts/check-f45-b2b3b2b1a-rest.mjs',
  'node scripts/check-f45-b2b3b2b1b-r1.mjs',
  'node scripts/check-f45-b2b3b2b2a-einschalten.mjs',
  'node scripts/check-f45-b2b3b2b2a2-anzeige.mjs',
  'node scripts/check-f45-b2b3b2b2a3-abnahme.mjs',
  'node scripts/check-f45-b2b3b2b2b1-nachweis.mjs',
  'node scripts/check-f45-b2b3b2b2b2a-crlf.mjs',
  'node scripts/check-f45-b2b3b2b2b2b1-projekt-cli.mjs',
  'node scripts/check-f45-b2b3e1-pfade.mjs',
  'node scripts/check-f45-b2b3e2-formular.mjs',
  'node scripts/check-f45-b2b4a1-sichern.mjs',
  'node scripts/check-f45-b2b4a2a-blockform.mjs',
  'node scripts/check-f45-b2b4a2b1-regeln.mjs',
  'node scripts/check-f45-b2b4a2b2-anzeige.mjs',
  'node scripts/check-f45-b2b4b-jarvis.mjs',
  'node scripts/check-f45-fb1-faehigkeit-vorschlag.mjs',
  'node scripts/check-f45-fb1b-faehigkeit-uebernehmen.mjs',
  'node scripts/check-f45-fb2-faehigkeit-anzeige.mjs',
  'node scripts/check-f45-b5a1-akte.mjs',
  'node scripts/check-f45-b5a2-akte-anzeige.mjs',
  'node scripts/check-f45-b5b1a-planung.mjs',
  'node scripts/check-f45-b5b1b1-planung-schreiben.mjs',
  'node scripts/check-f45-b5b1b2-bereinigung.mjs',
  'node scripts/check-f813-csrf.mjs',
  'node scripts/check-f814-host.mjs',
  'node scripts/check-fixpaket-f36-nachlauf.mjs',
  'node scripts/check-f43-projekt-aufrufen.mjs',
  'node scripts/check-wachstumsbremse-server.mjs',
  'node scripts/check-ratsche.mjs',
  'node scripts/check-f45-k-kontext.mjs',
  'node scripts/check-secrets.mjs',
]

/**
 * Gates, die einzeln laufen, bevor die parallele Gruppe startet. Explizite Liste ohne Namensmuster; ein Eintrag, der
 * nicht in GATES steht, bricht den Lauf mit Exit 2 ab. Herleitung je Gate: features/F45/w2-gate-inventur.md (Spalte
 * Parallel-Risiko). Lange Laufzeit allein ist kein Grund (verlängert die Wanduhr). Kein Gate bindet einen festen Port.
 */
export const SERIELL = [
  // Seit F45 W2b-2 nicht mehr hier: die Repo-Baum-Läufer (check-docs, check-rules, check-f45-k-kontext, check-secrets)
  // und die startvorlagen/-Schreiber (check-f10, check-f14, check-f15-automat-real) — Wegwerf-Ordner, Wegwerf-Startvorlagen
  // und Rohströme der Gates liegen unter os.tmpdir() (scripts/_wegwerf.ts), kein Gate schreibt mehr in den Repo-Baum.
  //
  // Warten mit fester Frist ≤ 10 s auf Server-, Workflow- oder Kindprozess-Zustand, messen Zeit gegen eine feste Grenze
  // oder fielen unter Last schon aus — git- und serverlastig, F-1215 (dieselbe Klasse wie F-1186/F-1209/F-1210 in teste.mjs).
  // Seit W2b-2 warten die 11 Frist-Gates (f656 bis f36-ws5b) über AIW_TEST_ZEITFAKTOR (scripts/_zeitfaktor.ts); f43,
  // f20-zustand-poll, fix-zustand-poll-kosten und f652 messen Zeit bzw. warten unskaliert. Der Läufer setzt keinen Faktor
  // (Standard 1), also bleiben alle hier, bis eine Messung unter Last das Herausnehmen trägt.
  'node scripts/check-f43-projekt-aufrufen.mjs',
  'node scripts/check-f20-zustand-poll.mjs',
  'node scripts/check-fix-zustand-poll-kosten.mjs',
  'node scripts/check-f652-pruefschritt.mjs',
  'node scripts/check-f656-pruefung-wiederholen.mjs',
  'node scripts/check-f659-review-korrektur-begruendung.mjs',
  'node scripts/check-f35-ws2-urteil-je-ak.mjs',
  'node scripts/check-f35-ws3-adjust-automatik.mjs',
  'node scripts/check-f45-b2b1-rueckweg.mjs',
  'node scripts/check-f45-b2b2-pruefer.mjs',
  'node scripts/check-f45-b2b3c-budget.mjs',
  'node scripts/check-f45-b2b3b1b-auswertung.mjs',
  'node scripts/check-f36-ws2-laufzeit.mjs',
  'node scripts/check-fixpaket-f36-nachlauf.mjs',
  'node scripts/check-f36-ws5b-skill.mjs',
  // Vergleicht das echte ~/.ai-workforce vor/nach und meldet jede Änderung (auch eine fremde).
  'node scripts/check-f45-f3b1-freigabe.mjs',
]

/** Standard-Parallelität ohne AIW_GATES_PARALLEL. */
export const STANDARD_PARALLELITAET = 4

/** Zeilen je rotem Gate, die die Zusammenfassung am Ende wiederholt. */
const ENDE_ZEILEN = 20

/**
 * Liest die Parallelität aus AIW_GATES_PARALLEL.
 * @param env - Umgebung (Standard process.env)
 * @returns ganze Zahl ≥ 1; fehlt der Wert oder ist er leer, STANDARD_PARALLELITAET
 * @throws bei jedem anderen Wert (kein stiller Rückfall)
 */
export function leseParallelitaet(env = process.env) {
  const roh = env.AIW_GATES_PARALLEL
  if (roh === undefined || roh === '') return STANDARD_PARALLELITAET
  if (!/^[1-9][0-9]*$/.test(roh)) throw new Error(`AIW_GATES_PARALLEL muss eine ganze Zahl ≥ 1 sein, erhalten „${roh}“.`)
  return Number(roh)
}

/**
 * Prüft die Liste auf Widersprüche, bevor ein Gate läuft.
 * @param gates - Befehlszeilen (Standard GATES)
 * @param seriell - serielle Teilmenge (Standard SERIELL)
 * @param gibtDatei - Prüft, ob ein Skriptpfad existiert (Standard existsSync, relativ zum Arbeitsordner)
 * @returns Liste der Fehler (leer = in Ordnung); fehlt jedes Gate-Skript, genau ein Fehler zum Arbeitsordner
 */
export function pruefeListe(gates = GATES, seriell = SERIELL, gibtDatei = existsSync) {
  const fehler = []
  const doppelt = (liste) => liste.filter((eintrag, i) => liste.indexOf(eintrag) !== i)
  for (const eintrag of new Set(doppelt(gates))) fehler.push(`doppelt in GATES: ${eintrag}`)
  for (const eintrag of new Set(doppelt(seriell))) fehler.push(`doppelt in SERIELL: ${eintrag}`)
  for (const eintrag of seriell) if (!gates.includes(eintrag)) fehler.push(`SERIELL ohne Eintrag in GATES: ${eintrag}`)
  const skripte = gates.map((eintrag) => /^node (\S+)$/.exec(eintrag)?.[1]).filter((skript) => skript !== undefined)
  const fehlend = skripte.filter((skript) => !gibtDatei(skript))
  if (fehlend.length > 1 && fehlend.length === skripte.length) {
    fehler.push(`kein Gate-Skript gefunden (${fehlend.length}) — Arbeitsordner ist nicht die Repo-Wurzel?`)
  } else {
    for (const skript of fehlend) fehler.push(`Gate-Skript fehlt: ${skript}`)
  }
  return fehler
}

/**
 * Startet einen Gate-Befehl in der Shell und puffert stdout und stderr getrennt.
 * @param befehl - Befehlszeile wie in GATES
 * @returns Promise mit { exit, stdout, stderr, ms } — wird nie verworfen; Startfehler und Signal ergeben exit 1 mit Grund
 *   in stderr
 */
function starteProzess(befehl) {
  return new Promise((fertig) => {
    const beginn = performance.now()
    let stdout = ''
    let stderr = ''
    let erledigt = false
    const ende = (exit) => {
      if (erledigt) return
      erledigt = true
      fertig({ exit, stdout, stderr, ms: performance.now() - beginn })
    }
    const kind = spawn(befehl, { shell: true, stdio: ['ignore', 'pipe', 'pipe'] })
    kind.stdout.setEncoding('utf8')
    kind.stderr.setEncoding('utf8')
    kind.stdout.on('data', (teil) => {
      stdout += teil
    })
    kind.stderr.on('data', (teil) => {
      stderr += teil
    })
    kind.on('error', (fehler) => {
      stderr += `check-kette: Gate startet nicht: ${fehler.message}\n`
      ende(1)
    })
    kind.on('close', (code, signal) => {
      if (signal !== null) stderr += `check-kette: Gate durch Signal ${signal} beendet (z. B. Speichermangel, F-1154).\n`
      ende(code ?? 1)
    })
  })
}

/** Standard-Ausgabe des Läufers. */
const STANDARD_AUS = {
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
}

/** Hängt einen Zeilenumbruch an, falls der Text nicht mit einem endet. */
const mitUmbruch = (text) => (text.endsWith('\n') ? text : `${text}\n`)

/** Millisekunden als Sekunden mit einer Nachkommastelle. */
const sekunden = (ms) => (ms / 1000).toFixed(1)

/**
 * Führt die Gates aus: zuerst `seriell` einzeln in Listenreihenfolge, danach alle übrigen mit höchstens `parallelitaet`
 * gleichzeitig in Listenreihenfolge (auch wenn die serielle Gruppe rot ist). Schreibt Startzeilen, Blöcke je Gate und am
 * Ende die Zusammenfassung.
 * @param gates - Befehlszeilen
 * @param seriell - Teilmenge von gates, die allein läuft
 * @param optionen - { parallelitaet (≥ 1), starte (befehl → Promise { exit, stdout, stderr, ms }; Standard echter
 *   Prozess), aus ({ stdout(text), stderr(text) }; Standard process.stdout/stderr) }
 * @returns { ergebnisse: [{ befehl, exit, ms }] in Abschlussreihenfolge, rot: Befehle in Abschlussreihenfolge, exit: 0|1 }
 *   — exit 1 auch, wenn nicht jedes Gate genau einmal lief
 * @throws wenn parallelitaet keine ganze Zahl ≥ 1 ist (sonst liefe die parallele Gruppe still nicht)
 */
export async function fuehreKetteAus(gates, seriell, { parallelitaet, starte = starteProzess, aus = STANDARD_AUS }) {
  if (!Number.isInteger(parallelitaet) || parallelitaet < 1) throw new Error(`fuehreKetteAus: parallelitaet muss eine ganze Zahl ≥ 1 sein, erhalten ${parallelitaet}`)
  const beginn = performance.now()
  const ergebnisse = []

  const laufe = async (befehl) => {
    aus.stdout(`▶ ${befehl}\n`)
    let ergebnis
    try {
      ergebnis = await starte(befehl)
    } catch (fehler) {
      ergebnis = { exit: 1, stdout: '', stderr: `check-kette: Gate startet nicht: ${fehler instanceof Error ? fehler.message : String(fehler)}\n`, ms: 0 }
    }
    const stdout = ergebnis.stdout === '' ? '' : mitUmbruch(ergebnis.stdout)
    const stderr = ergebnis.stderr === '' ? '' : mitUmbruch(ergebnis.stderr)
    ergebnisse.push({ befehl, exit: ergebnis.exit, ms: ergebnis.ms, ausgabe: `${stdout}${stderr}` })
    aus.stdout(`${ergebnis.exit === 0 ? '✓' : '✗'} ${befehl} (${sekunden(ergebnis.ms)} s${ergebnis.exit === 0 ? '' : `, Exit ${ergebnis.exit}`})\n`)
    if (stdout !== '') aus.stdout(stdout)
    if (stderr !== '') aus.stderr(stderr)
  }

  for (const befehl of gates.filter((b) => seriell.includes(b))) await laufe(befehl)
  const parallel = gates.filter((befehl) => !seriell.includes(befehl))
  let naechster = 0
  const arbeiter = async () => {
    while (naechster < parallel.length) {
      const befehl = parallel[naechster]
      naechster += 1
      await laufe(befehl)
    }
  }
  await Promise.all(Array.from({ length: Math.min(parallelitaet, parallel.length) }, arbeiter))

  const rot = ergebnisse.filter((e) => e.exit !== 0)
  const unvollstaendig = ergebnisse.length !== gates.length
  const summeMs = ergebnisse.reduce((summe, e) => summe + e.ms, 0)
  const zeilen = [
    '',
    `── check-kette: ${ergebnisse.length - rot.length} grün, ${rot.length} rot · Wanduhr ${sekunden(performance.now() - beginn)} s · Σ Einzelzeiten ${sekunden(summeMs)} s · parallel ${parallelitaet}, seriell ${gates.length - parallel.length}`,
  ]
  if (unvollstaendig) zeilen.push(`✗ check-kette: ${ergebnisse.length} von ${gates.length} Gates gelaufen (Fehler im Läufer) — rot.`)
  if (rot.length > 0) {
    zeilen.push('Rot (in der Reihenfolge des Rotwerdens — das erste zuerst lesen, spätere können Folgefehler sein):')
    for (const e of rot) {
      zeilen.push(`✗ ${e.befehl} (Exit ${e.exit}) — letzte ${ENDE_ZEILEN} Zeilen:`)
      const letzte = e.ausgabe === '' ? ['(keine Ausgabe)'] : e.ausgabe.trimEnd().split(/\r?\n/).slice(-ENDE_ZEILEN)
      for (const zeile of letzte) zeilen.push(`    ${zeile}`)
    }
    zeilen.push(`zuerst rot: ${rot[0].befehl} · rot: ${rot.map((e) => e.befehl).join(', ')}`)
  }
  aus.stdout(`${zeilen.join('\n')}\n`)
  if (rot.length > 0) aus.stderr(`check-kette: rot — ${rot.map((e) => e.befehl).join(', ')}\n`)
  return { ergebnisse: ergebnisse.map(({ befehl, exit, ms }) => ({ befehl, exit, ms })), rot: rot.map((e) => e.befehl), exit: rot.length > 0 || unvollstaendig ? 1 : 0 }
}

/**
 * Haupteinstieg ohne Prozess-Seiteneffekte: prüft Aufruf, Umgebung und Liste und führt die Kette aus.
 * @param optionen - { argv (Zusatzargumente nach dem Skriptpfad), env, gates, seriell, gibtDatei, starte, aus } — alle
 *   außer argv/env mit den Standardwerten des echten Laufs
 * @returns Exit-Code 0 (alle grün), 1 (mindestens ein Gate rot) oder 2 (Aufruffehler, kein Gate gestartet)
 */
export async function hauptprogramm({ argv = [], env = process.env, gates = GATES, seriell = SERIELL, gibtDatei = existsSync, starte = starteProzess, aus = STANDARD_AUS } = {}) {
  if (argv.length > 0) {
    aus.stderr(`check-kette: keine Zusatzargumente (${argv.join(' ')}) — ein einzelnes Gate direkt starten, z. B. „node scripts/check-docs.mjs“.\n`)
    return 2
  }
  let parallelitaet
  try {
    parallelitaet = leseParallelitaet(env)
  } catch (fehler) {
    aus.stderr(`check-kette: ${fehler instanceof Error ? fehler.message : String(fehler)}\n`)
    return 2
  }
  const fehler = pruefeListe(gates, seriell, gibtDatei)
  if (fehler.length > 0) {
    aus.stderr(`check-kette: Liste in scripts/check-kette.mjs oder Aufruf fehlerhaft:\n${fehler.map((f) => `  - ${f}`).join('\n')}\n`)
    return 2
  }
  aus.stdout(`check-kette: ${gates.length} Gates — zuerst ${seriell.length} seriell, danach ${gates.length - seriell.length} parallel (höchstens ${parallelitaet} gleichzeitig).\n`)
  return (await fuehreKetteAus(gates, seriell, { parallelitaet, starte, aus })).exit
}

/**
 * Vergleicht zwei Pfade nach realpath, unter Windows ohne Groß-/Kleinschreibung.
 * @param a - erster Pfad
 * @param b - zweiter Pfad
 * @returns true, wenn beide dieselbe Datei bezeichnen; false, wenn einer nicht auflösbar ist
 */
export function gleicheDatei(a, b) {
  try {
    const [x, y] = [realpathSync(a), realpathSync(b)]
    return process.platform === 'win32' ? x.toLowerCase() === y.toLowerCase() : x === y
  } catch {
    return false
  }
}

if (process.argv[1] !== undefined && gleicheDatei(process.argv[1], fileURLToPath(import.meta.url))) {
  process.exitCode = await hauptprogramm({ argv: process.argv.slice(2) })
}
