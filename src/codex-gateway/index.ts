/**
 * Datei: src/codex-gateway/index.ts
 *
 * Zweck: Codex-Gateway, WS-1 (F16, features/F16/feature.md, AK1–AK3).
 * Aufrufkonstruktion (baueCodexAufruf), Startfreigabe gegen die
 * Argv-Allowlist (pruefeUndVerweigereCodexBeiTreffer) und der zeilenweise
 * JSONL-Parser des Codex-Ereignisstroms (leseCodexEreignisse) — gebaut
 * nach dem Muster von src/claude-code-gateway/index.ts (baueAufruf,
 * pruefeUndVerweigereBeiTreffer).
 *
 * KEIN starteCodexGateway in diesem Workstream. Der Prozessstart kommt
 * ausdrücklich erst mit WS-2 (AK7); diese Datei startet nichts, importiert
 * kein Prozessstart-Primitiv (Gate (a) in
 * scripts/check-f16-codex-gateway.mjs belegt das mechanisch per Grep —
 * deshalb steht der Modulname dort und nicht hier) und baut keinen
 * Shell-String (F-057).
 * Der Grund für den Schnitt ist E-193: die Allowlist gehört IN das
 * Gateway, nie in den Aufrufer (F-284). Ein Aufrufer, der den Argv selbst
 * prüfen müsste, wäre eine zweite, unabhängig verfallende Kopie derselben
 * Regel — und der einzige Ort, an dem sie vergessen werden kann. Deshalb
 * liegt die Prüfung hier und wird in WS-2 vom Prozessstart aus
 * mitbenutzt, statt neben ihn gestellt zu werden.
 *
 * Entwurfsentscheidung für WS-2, hier festgehalten und bewusst noch NICHT
 * gebaut (F-283): Der Result Evaluator ruft heute leseErgebnisobjekt
 * (src/claude-code-gateway/index.ts:162–172), das JSON.parse über das
 * GESAMTE stdout ausführt und obj.type === 'result' verlangt. Für einen
 * Codex-Lauf ist stdout JSONL — mehrere JSON-Objekte, je eines pro Zeile
 * —, also scheitert dieses JSON.parse dort IMMER, nicht nur im Fehlerfall.
 * Der Worker-Schalter (laufakte.worker ?? 'claude-code', AK8) muss deshalb
 * VOR diesem Aufruf greifen, nicht in ihm: ein Codex-Lauf darf gar nicht
 * erst in leseErgebnisobjekt hineinlaufen. Wer den Schalter später
 * einbaut, prüft zuerst diese Reihenfolge.
 *
 * Wird aufgerufen von:
 * - src/codex-gateway/codex-gateway.test.ts
 * - scripts/check-f16-codex-gateway.mjs
 * - (ab WS-2) dem Codex-Prozessstart und dem Result Evaluator
 */

import { resolve } from 'node:path'
import { verweigereStart } from '../invocation-policy/index.ts'
import type { ProfilReferenz, Schreiber as CheckpointSchreiber } from '../checkpoint-store/types.ts'
import { pruefeCodexAufruf } from './codex-argv-allowlist.ts'
import type { AufrufTokens, CodexAufrufEingaben, CodexEreignisse } from './types.ts'

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
