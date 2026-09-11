/**
 * Datei: src/codex-gateway/index.ts
 *
 * Zweck: Codex-Gateway, WS-1 + WS-2 (F16, features/F16/feature.md,
 * AK1–AK3 und AK7).
 * Aufrufkonstruktion (baueCodexAufruf), Startfreigabe gegen die
 * Argv-Allowlist (pruefeUndVerweigereCodexBeiTreffer) und der zeilenweise
 * JSONL-Parser des Codex-Ereignisstroms (leseCodexEreignisse) — gebaut
 * nach dem Muster von src/claude-code-gateway/index.ts (baueAufruf,
 * pruefeUndVerweigereBeiTreffer).
 *
 * WS-2 (AK7) ergänzt starteCodexGateway: den tatsächlichen Prozessstart
 * über src/claude-code-gateway/prozessstart.ts. Diese Datei importiert
 * weiterhin NIE node:child_process direkt und baut keinen Shell-String
 * (F-057) — beides belegt Gate (a) in
 * scripts/check-f16-codex-gateway.mjs mechanisch per Grep.
 *
 * Der Grund für diesen Schnitt ist E-193: die Allowlist gehört IN das
 * Gateway, nie in den Aufrufer (F-284). Ein Aufrufer, der den Argv selbst
 * prüfen müsste, wäre eine zweite, unabhängig verfallende Kopie derselben
 * Regel — und der einzige Ort, an dem sie vergessen werden kann. Deshalb
 * liegt die Prüfung hier und wird von starteCodexGateway als erster
 * Schritt mitbenutzt, statt neben den Prozessstart gestellt zu werden.
 *
 * Entwurfsentscheidung, in WS-1 festgehalten und in WS-2 umgesetzt
 * (F-283): Der Result Evaluator ruft heute leseErgebnisobjekt
 * (src/claude-code-gateway/index.ts:162–172), das JSON.parse über das
 * GESAMTE stdout ausführt und obj.type === 'result' verlangt. Für einen
 * Codex-Lauf ist stdout JSONL — mehrere JSON-Objekte, je eines pro Zeile
 * —, also scheitert dieses JSON.parse dort IMMER, nicht nur im Fehlerfall.
 * Der Worker-Schalter (laufakte.worker ?? 'claude-code', AK8) greift
 * deshalb VOR diesem Aufruf, nicht in ihm: ein Codex-Lauf darf gar nicht
 * erst in leseErgebnisobjekt hineinlaufen. Wer die Reihenfolge in
 * src/result-evaluator/index.ts verschiebt, bricht jeden Codex-Lauf —
 * nicht nur die Fehlerfälle.
 *
 * Wird aufgerufen von:
 * - src/codex-gateway/codex-gateway.test.ts
 * - scripts/check-f16-codex-gateway.mjs
 * - scripts/verify-f16-codex-rotfall.mjs (realer Rot-Fall, AK9)
 * - src/result-evaluator/index.ts (leseCodexEreignisse, AK8)
 * - src/execution-controller/index.ts (baueCodexAufruf + starteCodexGateway im Codex-Zweig der Worker-Weiche, F16 WS-3a AK11)
 * - scripts/leitstand-server.mjs (CODEX_BERECHTIGUNGSKONTEXT für die worker-abhängige Auflösung, F16 WS-3a AK11)
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { verweigereStart } from '../invocation-policy/index.ts'
import { schreibeWirkungsmarke, sha256Hex } from '../checkpoint-store/index.ts'
import type { ProfilReferenz, Schreiber as CheckpointSchreiber } from '../checkpoint-store/types.ts'
import { registriereKernArtefakt } from '../lineage-registry/index.ts'
import { pruefeStartziel, starteProzess } from '../claude-code-gateway/prozessstart.ts'
import type { LaufakteV0Daten } from '../claude-code-gateway/types.ts'
import { pruefeCodexAufruf } from './codex-argv-allowlist.ts'
import type {
  AufrufTokens,
  CodexAufrufEingaben,
  CodexEreignisse,
  CodexGatewayEingaben,
  CodexGatewayErgebnis,
  CodexGatewayOptionen,
  CodexRohstrom,
} from './types.ts'

/** Ablage des Rohereignisstroms, identisch zum Claude-Code-Gateway — ein Lauf ist ein Lauf, egal welcher Worker ihn ausgeführt hat. */
const STANDARD_ROH_BASISVERZEICHNIS = 'kontrollzustand-roh'

/** Fester Berechtigungskontext jedes Codex-Laufs (AK7). Nicht vom Aufrufer setzbar: '--sandbox read-only' steht über baueCodexAufruf fest im Argv und ist über die Allowlist nicht abwählbar — ein umdeklarierbarer Kontext wäre eine Behauptung ohne Deckung. Seit F16 WS-3a (AK11) EXPORTIERT, weil scripts/leitstand-server.mjs denselben Wert in die AusfuehrungsEingaben eines Codex-Schritts schreiben muss: ein dort abgetippter Literalstring wäre eine zweite, unabhängig verfallende Kopie derselben Zusicherung (D5). */
export const CODEX_BERECHTIGUNGSKONTEXT = 'codex-sandbox-read-only'

/** Durchreichoptionen für verweigereStart (Muster: Optionen in src/claude-code-gateway/index.ts) — schreiber und basisVerzeichnis erlauben Tests eine Wegwerf-Kette statt des echten Kontrollzustands. */
interface Optionen {
  schreiber?: CheckpointSchreiber
  basisVerzeichnis?: string
}

/**
 * Baut den Codex-Aufruf ausschließlich als Tokens-Array (AK1) — nie als
 * Kommandozeilen-String (F-057). Wirft synchron bei
 * Aufrufer-Vertragsverletzungen (D4-Ausnahme wie F6as baueAufruf): leeres
 * modell (E-185, der deklarierte Modellname ist Pflicht, es wird keiner
 * geraten), leerer prompt (F-124) und ein prompt mit führendem '-', den
 * Codex als Flag statt als Prompt läse.
 *
 * Der Sandbox-Schalter steht hier am Argv ZUSÄTZLICH zu einem etwaigen
 * ~/.codex/config.toml (F-274, F-290). Das ist keine Doppelung aus
 * Vorsicht, sondern folgt aus der Evidenzlage: E-182 protokolliert und
 * pinnt je Execution ausschließlich das Argv. Die config.toml liegt
 * außerhalb dieses Repositoriums, außerhalb des E-188-Gültigkeitsschlüssels
 * und ist über den Schalter `ignore-user-config` (ohne führende Striche
 * geschrieben, siehe Gate (c) in scripts/check-f16-codex-gateway.mjs)
 * abwählbar — sie kann eine Zusicherung deshalb nicht tragen. Was gepinnt
 * werden soll, muss im Argv stehen.
 *
 * @param eingaben - Modellname, Prompttext und optionaler absoluter Pfad zu einem Ausgabeschema
 * @returns das vollständige Argv OHNE das Programm selbst (das Startziel steht davor, F6a-Muster)
 */
export function baueCodexAufruf(eingaben: CodexAufrufEingaben): AufrufTokens {
  if (!eingaben.modell) {
    throw new Error('CodexAufrufEingaben.modell ist Pflichtfeld (E-185) — leer oder fehlend')
  }
  if (!eingaben.prompt) {
    throw new Error('CodexAufrufEingaben.prompt ist Pflichtfeld (F-124) — leer oder fehlend')
  }
  if (eingaben.prompt.startsWith('-')) {
    throw new Error("CodexAufrufEingaben.prompt darf nicht mit '-' beginnen — Codex läse den Text sonst als Flag statt als Prompt")
  }
  // Dieselbe Regel für den Modellnamen: ein Wert mit führendem '-' würde
  // an der Argv-Position hinter '--model' stehen und wäre für die
  // Argumentzerlegung von Codex ein eigener Schalter, nicht ein Wert —
  // genau der Weg, auf dem ein abwählender Parameter durch eine
  // Wertposition hindurchrutscht.
  if (eingaben.modell.startsWith('-')) {
    throw new Error(`CodexAufrufEingaben.modell darf nicht mit '-' beginnen, erhalten: '${eingaben.modell}'`)
  }
  const schemaPfad = eingaben.ausgabeSchemaPfad
  if (schemaPfad !== null && resolve(schemaPfad) !== schemaPfad) {
    throw new Error(`CodexAufrufEingaben.ausgabeSchemaPfad muss ein absoluter Pfad sein, erhalten: '${schemaPfad}'`)
  }
  return [
    'exec',
    '--json',
    '--sandbox',
    'read-only',
    '--model',
    eingaben.modell,
    ...(schemaPfad !== null ? ['--output-schema', schemaPfad] : []),
    eingaben.prompt,
  ]
}

/**
 * Führt jeden Codex-Argv vor jeder Weitergabe durch die Allowlist (AK2)
 * und schreibt bei einem Treffer über F4s verweigereStart eine
 * Verweigerung — startet selbst nie einen Prozess (D5-Muster, wie F6as
 * pruefeUndVerweigereBeiTreffer: kein Nachbau von F4).
 * @param tokens - das zu prüfende Argv
 * @param laufId - Lauf-Kennung für die Verweigerungs-Wirkungsmarke
 * @param profilReferenz - gepinnte Profilreferenz des Laufs
 * @param optionen - Durchreichoptionen an verweigereStart (Tests)
 * @returns { ok: true } bei bestandener Allowlist, sonst { ok: false, grund }
 */
export function pruefeUndVerweigereCodexBeiTreffer(
  tokens: AufrufTokens,
  laufId: string,
  profilReferenz: ProfilReferenz,
  optionen: Optionen = {}
): { ok: true } | { ok: false; grund: string } {
  const ergebnis = pruefeCodexAufruf(tokens)
  if (!ergebnis.ok) {
    const grund = `Codex-Argv verletzt die Allowlist: ${ergebnis.grund}`
    verweigereStart(laufId, profilReferenz, grund, optionen)
    return { ok: false, grund }
  }
  return { ok: true }
}

/**
 * Parst den Codex-Ereignisstrom zeilenweise als JSONL (AK3). Trennt an
 * '\n', entfernt ein etwaiges '\r' (CRLF-Ausgabe unter Windows), ignoriert
 * leere Zeilen und zählt jede nicht parsbare Zeile, statt zu werfen — im
 * realen Spike-Protokoll (state/tp-m3-01-codex.md) standen zwischen den
 * JSON-Zeilen Tracing-Zeilen im Klartext, und eine einzelne solche Zeile
 * darf die Beobachtungsbasis der übrigen Ereignisse nicht vernichten.
 *
 * Rein deskriptiv, keine Klassifikation (ARCHITECTURE.md §4, F7-Grenze):
 * die Funktion sagt, welche Ereignisse vorkamen, nicht wie der Lauf
 * ausgeht.
 * @param stdout - der vollständige, unveränderte stdout eines Codex-Laufs
 * @returns geparste Ereignisse, Turn-Ausgangsmerkmale, letzte agent_message und Anzahl unparsbarer Zeilen — wirft nie
 */
export function leseCodexEreignisse(stdout: string): CodexEreignisse {
  const ereignisse: Array<Record<string, unknown>> = []
  let turnCompleted = false
  let turnFailed = false
  let letzteAgentMessage: string | null = null
  let unparsbareZeilen = 0

  for (const rohZeile of stdout.split('\n')) {
    const zeile = rohZeile.replace(/\r/g, '')
    if (zeile.length === 0) continue

    let geparst: unknown
    try {
      geparst = JSON.parse(zeile)
    } catch {
      unparsbareZeilen++
      continue
    }
    // Ein JSON-Skalar oder -Array ist syntaktisch gültig, aber kein
    // Ereignis — es zählt als unparsbar, damit `ereignisse` ausschließlich
    // Objekte trägt und kein Aufrufer auf einer Zahl .type lesen muss.
    if (typeof geparst !== 'object' || geparst === null || Array.isArray(geparst)) {
      unparsbareZeilen++
      continue
    }

    const ereignis = geparst as Record<string, unknown>
    ereignisse.push(ereignis)

    if (ereignis.type === 'turn.completed') turnCompleted = true
    // 'error' zählt gleichwertig zu 'turn.failed': im Spike-Lauf 3
    // (HTTP 400, invalid_json_schema) trug der Strom beide Zeilen, ein
    // abgebrochener Turn kann aber auch nur die eine tragen.
    if (ereignis.type === 'turn.failed' || ereignis.type === 'error') turnFailed = true

    if (ereignis.type === 'item.completed') {
      const item = ereignis.item
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        const itemObjekt = item as Record<string, unknown>
        if (itemObjekt.type === 'agent_message' && typeof itemObjekt.text === 'string') {
          letzteAgentMessage = itemObjekt.text
        }
      }
    }
  }

  return { ereignisse, turnCompleted, turnFailed, letzteAgentMessage, unparsbareZeilen }
}

/**
 * WS-2 (AK7): startet einen Codex-Prozess aus einem bereits über
 * baueCodexAufruf konstruierten Tokens-Array. Ablauf:
 * pruefeUndVerweigereCodexBeiTreffer → pruefeStartziel →
 * RUN_PREPARED-Wirkungsmarke (F1B) → starteProzess (prozessstart.ts,
 * Argv-Array, F-057) → Rohstrom nach kontrollzustand-roh/ → Laufakte über
 * F2s registriereKernArtefakt. Bei einem Allowlist-Treffer: KEIN
 * Prozessstart, KEINE Wirkungsmarke, KEINE Laufakte — die Verweigerung ist
 * das einzige Artefakt (rot kalibriert mit einem Spy-Starter, der bei
 * Aufruf wirft).
 *
 * Klassifiziert bewusst nicht (F7-Grenze, wie F6as starteGateway): keine
 * Terminal-Wirkungsmarke für den Prozessausgang. Der Lauf bleibt bis zum
 * Result Evaluator KLAERUNG_ERFORDERLICH (F1B) — vorgesehener Zustand,
 * kein Fehler.
 *
 * Warum hier KEIN leseAktuelleAutorisierung, KEIN ermittleIstZustand und
 * KEIN pruefeStartfreigabe steht (bewusste Abweichung von starteGateway,
 * nicht Vergessen): §16.4 und die F4-Startfreigabe (E-183/E-188) sichern
 * den SCHREIBENDEN Pfad ab — sie vergleichen einen Gültigkeitsschlüssel
 * gegen eine menschliche Autorisierung, damit ein Werkzeug mit
 * Schreibwirkung nicht unter veränderten Schutzannahmen läuft. Ein
 * Codex-Lauf ist strukturell lesend: '--sandbox read-only' steht fest im
 * Argv und ist über die Allowlist nicht abwählbar (E-M3-2, AK2). Die
 * Startbedingung für Codex IST die bestandene Argv-Allowlist, und sie
 * liegt nach E-193 IM Gateway, nie im Aufrufer (F-284): ein Aufrufer, der
 * den Argv selbst prüfen müsste, wäre eine zweite, unabhängig verfallende
 * Kopie derselben Regel und der einzige Ort, an dem sie vergessen werden
 * kann. Deshalb ist pruefeUndVerweigereCodexBeiTreffer hier der erste
 * Schritt und nicht eine Zusicherung des Aufrufers.
 *
 * Bekannte Grenze, bewusst nicht gebaut (F-119): starteGateway prüft
 * zusätzlich werkzeugStartziel.slice(1) gegen F4s pruefeAufrufparameter,
 * weil diese Elemente unverändert in execFiles argv landen. Für Codex ist
 * das Startziel real ein einzelnes codex.exe ohne Zusatzelemente; die
 * Prüfung fehlt hier trotzdem und wäre nachzuziehen, sobald ein
 * Codex-Startziel mehr als ein Element trägt.
 *
 * @param eingaben - Lauf-Kennung, Profilreferenz, Argv-Tokens, Startziel, deklarierte Werkzeugversion und deklarierter Modellname
 * @param optionen - Durchreichoptionen (Wegwerf-Kette, Rohstrom-Ablage, Starter-Attrappe, Zeitgrenze, Abbruchsignal)
 * @returns bei bestandener Allowlist die registrierte Laufakte, sonst { ok: false, grund }
 */
export async function starteCodexGateway(eingaben: CodexGatewayEingaben, optionen: CodexGatewayOptionen = {}): Promise<CodexGatewayErgebnis> {
  const pruefung = pruefeUndVerweigereCodexBeiTreffer(eingaben.tokens, eingaben.laufId, eingaben.profilReferenz, optionen)
  if (!pruefung.ok) {
    return { ok: false, grund: pruefung.grund }
  }

  const startzielPruefung = pruefeStartziel(eingaben.werkzeugStartziel)
  if (!startzielPruefung.ok) {
    return { ok: false, grund: startzielPruefung.grund }
  }

  schreibeWirkungsmarke(eingaben.laufId, eingaben.profilReferenz, 'run_prepared', {}, optionen)

  // eingaben.tokens geht UNVERÄNDERT weiter — keine Konkatenation, kein
  // zweiter Aufrufbau (D5). stdinLeer: true ist für Codex gesetzt, weil
  // Codex real auf stdin zugreift (F-307: stderr meldet `Reading additional
  // input from stdin...`). Präzise gehalten, weil der Beleg es hergibt und
  // mehr nicht: derselbe gemessene Lauf endete mit Exit-Code 0 — ein
  // hängender Codex-Lauf ist NICHT beobachtet, gemessen ist nur der
  // Mechanismus als solcher (F-318, Details am prozessstart.ts-Kopf).
  const prozessErgebnis = await starteProzess(eingaben.werkzeugStartziel, eingaben.tokens, {
    starter: optionen.starter,
    zeitgrenzeMs: optionen.zeitgrenzeMs,
    abbruchSignal: optionen.abbruchSignal,
    stdinLeer: true,
  })

  // beobachtungsbasis_vollstaendig kommt aus den JSONL-Ereignissen, NICHT
  // aus leseErgebnisobjekt: dessen JSON.parse läuft über das GESAMTE stdout
  // und verlangt type:"result" — für Codex-JSONL scheitert das immer
  // (F-283, siehe Kopfkommentar). Ein Strom mit turn.completed ODER
  // turn.failed/error ist beobachtet zu Ende gelaufen; fehlen beide, wurde
  // der Strom abgeschnitten und die Beobachtungsbasis ist unvollständig.
  const ereignisse = leseCodexEreignisse(prozessErgebnis.stdout)
  const beobachtungsbasisVollstaendig = ereignisse.turnCompleted || ereignisse.turnFailed

  const rohBasisVerzeichnis = optionen.rohBasisVerzeichnis ?? STANDARD_ROH_BASISVERZEICHNIS
  const rohVerzeichnis = join(rohBasisVerzeichnis, eingaben.laufId)
  mkdirSync(rohVerzeichnis, { recursive: true })
  const rohstrom: CodexRohstrom = {
    werkzeugStartziel: eingaben.werkzeugStartziel,
    // tokens ist gegenüber F6as Rohstrom neu und Pflicht: AK8 erkennt an
    // ihm, ob der Lauf mit '--output-schema' lief.
    tokens: eingaben.tokens,
    stdout: prozessErgebnis.stdout,
    stderr: prozessErgebnis.stderr,
    exitCode: prozessErgebnis.exitCode,
    startfehler: prozessErgebnis.startfehler,
    beendigungsart: prozessErgebnis.beendigungsart,
  }
  const rohInhalt = JSON.stringify(rohstrom)
  const rohPfad = join(rohVerzeichnis, 'rohstrom.json')
  writeFileSync(rohPfad, rohInhalt, 'utf8')

  const laufakte: LaufakteV0Daten = {
    laufakte_schema: 'v0',
    lauf_id: eingaben.laufId,
    werkzeug_version_deklariert: eingaben.werkzeugVersionDeklariert,
    berechtigungskontext: CODEX_BERECHTIGUNGSKONTEXT,
    arbeitsverzeichnis_pfad: process.cwd(),
    // Bleibt für Codex immer null (F-305): der Modellname erscheint in
    // keinem JSONL-Ereignis, er ist nur DEKLARIERT aus dem Argv bekannt.
    modell_beobachtet: null,
    beobachtungsbasis_vollstaendig: beobachtungsbasisVollstaendig,
    rohstrom_referenz: { pfad: rohPfad, inhalts_hash: sha256Hex(rohInhalt) },
    erstellt_am: new Date().toISOString(),
    worker: 'codex',
    modell_deklariert: eingaben.modellDeklariert,
  }

  const { pfad, versionSequenz } = registriereKernArtefakt(
    `laufakte-${eingaben.laufId}`,
    eingaben.profilReferenz,
    { erzeuger: 'kern', schritt: 'codex-gateway-lauf' },
    laufakte,
    [],
    optionen
  )

  return { ok: true, laufakte, pfad, versionSequenz }
}
