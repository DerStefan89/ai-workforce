/**
 * Datei: src/result-evaluator/index.ts
 *
 * Zweck: Result Evaluator (F7, state/tasks/f7-result-evaluator.md,
 * state/plan-v1-f7-result-evaluator.md). klassifiziereLauf ordnet einen von
 * F6a abgeschlossenen Lauf ausschließlich aus beobachtungsbasis_vollstaendig,
 * dem über F6as leseErgebnisobjekt geparsten Ergebnisobjekt und
 * permission_denials[] in genau einen der drei Terminalausgänge ein
 * (ARCHITECTURE §4, Prüfreihenfolge: Rohstrom-Integrität/-Fehlen vor
 * unvollständiger Beobachtungsbasis vor fehlendem Ergebnisobjekt — alle drei
 * FEHLGESCHLAGEN — vor VERWEIGERT vor ERFOLGREICH) und schreibt das Ergebnis
 * über F1Bs schreibeWirkungsmarke. Baut keinen eigenen Laufakte-Lesepfad
 * (Design-Entscheidung 2, plan-v1 Abschnitt 4) — der Aufrufer übergibt die
 * bereits geladene LaufakteV0Daten.
 *
 * F14 WS-3 (AK5/AK6, löst die Lücke aus WS-1): ein TIMEOUT/ABBRUCH-Rohstrom
 * (claude-code-gateway/index.ts:314, beendigungsart) hat leeres/kein
 * stdout und würde ohne eigenen Zweig als generisches
 * beobachtungsbasis_unvollstaendig klassifiziert. Der neue Zweig steht
 * NACH der Rohstrom-Integritätsprüfung (auch ein TIMEOUT/ABBRUCH-Rohstrom
 * kann korrupt sein) und VOR dem beobachtungsbasis_unvollstaendig-Zweig
 * (spezifischer schlägt generischer) — Reihenfolge der übrigen Zweige
 * unverändert. klassifiziereLauf ergänzt für diesen Fall die Terminalmarke
 * um daten.letzter_gueltiger_checkpoint (F1Bs bereits bestehender, exportierter
 * ladeLetztenGueltigenCheckpoint — kein neuer Lesepfad), gelesen VOR dem
 * eigenen Terminal-Schreibvorgang, sonst fände er sich selbst.
 *
 * F16 WS-2 (AK8): ermittleErgebnis verzweigt nach laufakte.worker ??
 * 'claude-code' — die Weiche steht VOR dem leseErgebnisobjekt-Aufruf, weil
 * dessen JSON.parse über das gesamte stdout für Codex-JSONL immer
 * scheitert (F-283). Der Codex-Zweig (ermittleErgebnisCodex) teilt sich mit
 * dem Claude-Code-Zweig die vier vorgelagerten Prüfungen (rohstrom_fehlt,
 * rohstrom_integritaet, timeout/abgebrochen_manuell,
 * beobachtungsbasis_unvollstaendig) und prüft danach turn_failed →
 * exit_code → ergebnis_nicht_schemakonform → ERFOLGREICH. Er kennt bewusst
 * KEIN VERWEIGERT und liest kein stderr — beides real begründet (F-300,
 * F-309), Details am Funktionskommentar.
 *
 * Der tool_input→Tokens-Adapter (toolInputZuTokens/tokenisiereCommand) ist
 * neuer Code (Design-Entscheidung 5): pruefeAufrufparameter (F4) erwartet ein
 * Tokens-Array, tool_input ist ein werkzeugabhängiges Objekt (`{"command":…}`,
 * `{"query":…}`, state/tp-nachtrag.md TP-03d Messfall 1-3). `command` wird am
 * Leerzeichen tokenisiert, jedes Token danach von einem umschließenden
 * Anführungszeichen befreit — deckt sowohl unquotierte Mehrwort-Aufrufe als
 * auch einen in Shell-Quoting eingebetteten Verbotswert ab (plan-v1
 * Abschnitt 8.4, offene Unsicherheit 4). Ein Treffer wird nur gezählt
 * (bypass_verdacht_anzahl), nicht eskaliert (E-186, kein Adressat ohne F8).
 */

import { readFileSync } from 'node:fs'
import { leseErgebnisobjekt } from '../claude-code-gateway/index.ts'
import type { LaufakteV0Daten } from '../claude-code-gateway/types.ts'
import { leseCodexEreignisse } from '../codex-gateway/index.ts'
import { ladeLetztenGueltigenCheckpoint, schreibeWirkungsmarke, sha256Hex } from '../checkpoint-store/index.ts'
import type { ProfilReferenz } from '../checkpoint-store/types.ts'
import { pruefeAufrufparameter } from '../invocation-policy/index.ts'
import type { KlassifikationsEingaben, KlassifikationsErgebnis, KlassifikationsOptionen } from './types.ts'

type ErgebnisOhneWirkungsmarke =
  | { ergebnis: 'FEHLGESCHLAGEN'; grund: string }
  | { ergebnis: 'VERWEIGERT'; bypass_verdacht_anzahl: number; is_error?: unknown; non_execution_kind?: unknown }
  | { ergebnis: 'ERFOLGREICH'; is_error?: unknown; non_execution_kind?: unknown }

/** Entfernt ein einzelnes führendes/abschließendes Anführungszeichen (', ") von einem Token — deckt einen in Shell-Quoting eingebetteten Verbotswert ab (plan-v1 Abschnitt 8.4), ohne einen vollständigen Shell-Parser nachzubauen. */
function saeubereToken(token: string): string {
  return token.replace(/^['"]+|['"]+$/g, '')
}

function tokenisiereCommand(command: string): string[] {
  return command
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .map(saeubereToken)
}

/** Übersetzt ein tool_input-Objekt (Form variiert je Werkzeugtyp) in ein Tokens-Array für pruefeAufrufparameter (F4) — neuer Adapter, kein reiner Aufruf (Design-Entscheidung 5). Nur der Feldname 'command' wird tokenisiert, andere String-Felder (z. B. 'query') bleiben ein einzelnes Token. */
function toolInputZuTokens(toolInput: unknown): string[] {
  if (typeof toolInput !== 'object' || toolInput === null || Array.isArray(toolInput)) return []
  const tokens: string[] = []
  for (const [feld, wert] of Object.entries(toolInput as Record<string, unknown>)) {
    if (typeof wert !== 'string') continue
    tokens.push(...(feld === 'command' ? tokenisiereCommand(wert) : [saeubereToken(wert)]))
  }
  return tokens
}

/** Tolerantes Auslesen von rohstrom.beendigungsart (F14 WS-1, claude-code-gateway/index.ts:314) — liefert null bei ungültigem JSON, fehlendem Feld oder einem anderen Wert als 'TIMEOUT'/'ABBRUCH', wirft nie. Eigenständig vom stdout-Parsing weiter unten (das bei defektem JSON eine eigene, differenziertere Fehlerbehandlung braucht). */
function leseBeendigungsart(rohInhalt: string): 'TIMEOUT' | 'ABBRUCH' | null {
  let geparst: unknown
  try {
    geparst = JSON.parse(rohInhalt)
  } catch {
    return null
  }
  if (typeof geparst !== 'object' || geparst === null) return null
  const wert = (geparst as Record<string, unknown>).beendigungsart
  return wert === 'TIMEOUT' || wert === 'ABBRUCH' ? wert : null
}

interface PermissionDenial {
  tool_input?: unknown
}

function istPermissionDenial(wert: unknown): wert is PermissionDenial {
  return typeof wert === 'object' && wert !== null
}

/**
 * Liefert true, wenn text ein JSON-OBJEKT ist (kein Skalar, kein Array,
 * kein null) — der Schemaprüfpunkt von AK8. Prüft bewusst NICHT gegen das
 * konkrete Ausgabeschema: welches Schema galt, steht nicht in der Laufakte,
 * und eine zweite, hier nachgebaute Schemaprüfung wäre eine unabhängig
 * verfallende Kopie der Schemadatei. Geprüft wird die Form, die ein
 * schemakonformes Ergebnis zwingend hat.
 */
function istJsonObjekt(text: string | null): boolean {
  if (text === null) return false
  let geparst: unknown
  try {
    geparst = JSON.parse(text)
  } catch {
    return false
  }
  return typeof geparst === 'object' && geparst !== null && !Array.isArray(geparst)
}

/**
 * Codex-Zweig der Klassifikation (AK8). Ausgangspunkt ist der bereits
 * gelesene und auf Integrität geprüfte Rohstrom — rohstrom_fehlt,
 * rohstrom_integritaet, timeout/abgebrochen_manuell und
 * beobachtungsbasis_unvollstaendig hat der gemeinsame Teil von
 * ermittleErgebnis davor schon entschieden; diese vier Zweige sind für
 * beide Worker wortgleich und werden deshalb nicht zweimal gebaut (D5).
 *
 * Reihenfolge hier: turn_failed → exit_code → ergebnis_nicht_schemakonform
 * → ERFOLGREICH. turn_failed steht vor exit_code, weil ein gescheiterter
 * Turn real mit Exit-Code 0 einhergehen kann (der Prozess selbst lief
 * sauber) — die umgekehrte Reihenfolge würde den Fehlschlag verlieren.
 *
 * KEIN VERWEIGERT-Zweig, und das ist kein Versehen: real gemessen
 * (state/tp-m3-01b-codex-sandbox.md, Messpunkt (f), F-300) erzeugt ein an
 * der Ausführungsrichtlinie gescheiterter Befehl GAR KEIN JSONL-Ereignis
 * auf stdout — kein item.started, kein item.completed, kein exit_code. Die
 * Verweigerung erscheint nur auf stderr und als Klartext in der
 * agent_message. Eine VERWEIGERT-Klassifikation ist für Codex damit
 * strukturell nicht gewinnbar; ein „vorsorglicher" Zweig wäre eine
 * Klassifikation ohne Beobachtungsgrundlage.
 *
 * Liest ausdrücklich KEIN stderr (ARCHITECTURE.md §7: Laufergebnis nie aus
 * Konsolentext). F-309 zeigt real, warum das mehr als Formalismus ist: auf
 * stderr stehen betriebsbedingte ERROR-Zeilen des Modellkatalog-Refresh
 * auch bei einem vollständig erfolgreichen Lauf mit Exit-Code 0 — eine
 * stderr-Heuristik würde grüne Läufe als gescheitert melden. Gate (g) in
 * scripts/check-f16-codex-gateway.mjs belegt die Abwesenheit per Grep über
 * genau diese Funktion.
 *
 * @param rohInhalt - der bereits gelesene, hash-geprüfte Rohstrominhalt
 * @returns Terminalausgang ohne Wirkungsmarke
 */
function ermittleErgebnisCodex(rohInhalt: string): ErgebnisOhneWirkungsmarke {
  let rohstrom: { stdout?: unknown; exitCode?: unknown; tokens?: unknown }
  try {
    rohstrom = JSON.parse(rohInhalt) as { stdout?: unknown; exitCode?: unknown; tokens?: unknown }
  } catch {
    // Erreichbar, nicht theoretisch: leseBeendigungsart oben schluckt einen
    // nicht parsbaren Rohstrom tolerant (liefert null), und der Hash kann
    // dabei passen — eine Datei, die als Nicht-JSON geschrieben wurde, ist
    // zu ihrem eigenen Hash konsistent. Eigener Rot-Fall in
    // result-evaluator.test.ts.
    //
    // Abweichung vom Claude-Code-Zweig, bewusst: dort liefert derselbe
    // Defekt 'kein_ergebnisobjekt' (weiter unten). Für Codex wäre dieser
    // Grund irreführend — es gibt kein Ergebnisobjekt, das fehlen könnte,
    // der Strom ist JSONL. Ein unlesbarer Rohstrom bei passendem Hash ist
    // genau ein Integritätsbefund, und so heißt er hier auch.
    return { ergebnis: 'FEHLGESCHLAGEN', grund: 'rohstrom_integritaet' }
  }

  const ereignisse = leseCodexEreignisse(typeof rohstrom.stdout === 'string' ? rohstrom.stdout : '')

  // Defense in depth, an der von AK8 vorgesehenen Stelle (nach
  // beobachtungsbasis_unvollstaendig, vor turn_failed): der gemeinsame Teil
  // hat das gleichnamige Flag der Laufakte bereits geprüft — dieses Flag ist
  // aber eine ABGELEITETE Behauptung des Gateways (turnCompleted ||
  // turnFailed, codex-gateway/index.ts). Der Evaluator parst den Strom hier
  // ohnehin erneut und kann deshalb billig nachrechnen, statt zu glauben.
  // Ohne diese Zeilen ginge ein Paar aus Flag 'true' und abgeschnittenem
  // Strom still als ERFOLGREICH durch.
  if (!ereignisse.turnCompleted && !ereignisse.turnFailed) {
    return { ergebnis: 'FEHLGESCHLAGEN', grund: 'beobachtungsbasis_unvollstaendig' }
  }

  if (ereignisse.turnFailed) {
    return { ergebnis: 'FEHLGESCHLAGEN', grund: 'turn_failed' }
  }
  if (rohstrom.exitCode !== 0) {
    return { ergebnis: 'FEHLGESCHLAGEN', grund: 'exit_code' }
  }

  // Der Auswertepunkt ist ausdrücklich die LETZTE agent_message (F-308):
  // frühere tragen real freien Text („Ich lese a.txt und prüfe …"), nur die
  // letzte ist bei --output-schema das schemakonforme JSON-Objekt.
  // .some(exakter Vergleich) statt .includes/.indexOf: Gate (a) in
  // scripts/check-f7-result-evaluator.mjs verbietet diese Methoden in
  // src/result-evaluator/*.ts, weil sie der Weg sind, auf dem ein Ergebnis
  // aus Konsolentext abgeleitet wird (AK4). Hier geht es um die
  // Mitgliedschaft eines Tokens in einem Argv-Array, nicht um Textsuche —
  // die exakte Gleichheit macht genau das sichtbar und darf nicht zu einem
  // vermeintlich kürzeren .includes zurückvereinfacht werden.
  const tokens = Array.isArray(rohstrom.tokens) ? rohstrom.tokens : []
  if (tokens.some((token) => token === '--output-schema') && !istJsonObjekt(ereignisse.letzteAgentMessage)) {
    return { ergebnis: 'FEHLGESCHLAGEN', grund: 'ergebnis_nicht_schemakonform' }
  }

  return { ergebnis: 'ERFOLGREICH' }
}

/**
 * Reine Klassifikationslogik ohne Wirkungsmarken-Schreibzugriff — getrennt
 * von klassifiziereLauf, damit die Prüfreihenfolge (SCOPE.2) an einer Stelle
 * steht und der Schreibaufruf in allen drei Ausgängen identisch bleibt.
 */
function ermittleErgebnis(laufakte: LaufakteV0Daten): ErgebnisOhneWirkungsmarke {
  let rohInhalt: string
  try {
    rohInhalt = readFileSync(laufakte.rohstrom_referenz.pfad, 'utf8')
  } catch {
    return { ergebnis: 'FEHLGESCHLAGEN', grund: 'rohstrom_fehlt' }
  }

  if (sha256Hex(rohInhalt) !== laufakte.rohstrom_referenz.inhalts_hash) {
    return { ergebnis: 'FEHLGESCHLAGEN', grund: 'rohstrom_integritaet' }
  }

  // AK5: spezifischer (TIMEOUT/ABBRUCH) schlägt generischer
  // (beobachtungsbasis_unvollstaendig) — beide Fälle haben leeres/kein
  // stdout, deshalb muss dieser Zweig vor dem generischen stehen.
  const beendigungsart = leseBeendigungsart(rohInhalt)
  if (beendigungsart === 'TIMEOUT') {
    return { ergebnis: 'FEHLGESCHLAGEN', grund: 'timeout' }
  }
  if (beendigungsart === 'ABBRUCH') {
    return { ergebnis: 'FEHLGESCHLAGEN', grund: 'abgebrochen_manuell' }
  }

  if (laufakte.beobachtungsbasis_vollstaendig === false) {
    return { ergebnis: 'FEHLGESCHLAGEN', grund: 'beobachtungsbasis_unvollstaendig' }
  }

  // AK8: Die Worker-Weiche MUSS hier stehen — vor dem leseErgebnisobjekt
  // weiter unten. Dessen JSON.parse läuft über das GESAMTE stdout und
  // verlangt type:"result"; für Codex-JSONL (mehrere JSON-Objekte, je
  // eines pro Zeile) scheitert das IMMER, nicht nur im Fehlerfall (F-283,
  // ausführlich in src/codex-gateway/index.ts). Ein Codex-Lauf darf dort
  // gar nicht erst hineinlaufen, sonst wäre jeder Codex-Lauf
  // 'kein_ergebnisobjekt'. Fehlendes worker bedeutet 'claude-code'
  // (append-only, AK4) — jede vor F16 geschriebene Laufakte bleibt damit
  // unverändert klassifiziert.
  if ((laufakte.worker ?? 'claude-code') === 'codex') {
    return ermittleErgebnisCodex(rohInhalt)
  }

  let rohstrom: { stdout?: unknown }
  try {
    rohstrom = JSON.parse(rohInhalt) as { stdout?: unknown }
  } catch {
    return { ergebnis: 'FEHLGESCHLAGEN', grund: 'kein_ergebnisobjekt' }
  }

  const ergebnisobjekt = typeof rohstrom.stdout === 'string' ? leseErgebnisobjekt(rohstrom.stdout) : null
  if (ergebnisobjekt === null) {
    return { ergebnis: 'FEHLGESCHLAGEN', grund: 'kein_ergebnisobjekt' }
  }

  const zusatzFelder: { is_error?: unknown; non_execution_kind?: unknown } = {
    ...('is_error' in ergebnisobjekt ? { is_error: ergebnisobjekt.is_error } : {}),
    ...('non_execution_kind' in ergebnisobjekt ? { non_execution_kind: ergebnisobjekt.non_execution_kind } : {}),
  }

  const denialsRaw = ergebnisobjekt.permission_denials
  const denials = Array.isArray(denialsRaw) ? denialsRaw.filter(istPermissionDenial) : []

  if (denials.length === 0) {
    return { ergebnis: 'ERFOLGREICH', ...zusatzFelder }
  }

  let bypassVerdachtAnzahl = 0
  for (const denial of denials) {
    const tokens = toolInputZuTokens(denial?.tool_input)
    if (!pruefeAufrufparameter(tokens).ok) bypassVerdachtAnzahl++
  }

  return { ergebnis: 'VERWEIGERT', bypass_verdacht_anzahl: bypassVerdachtAnzahl, ...zusatzFelder }
}

export function klassifiziereLauf(
  laufId: string,
  profilReferenz: ProfilReferenz,
  eingaben: KlassifikationsEingaben,
  optionen: KlassifikationsOptionen = {}
): KlassifikationsErgebnis {
  const teilergebnis = ermittleErgebnis(eingaben.laufakte)

  let zusatzDaten: { daten?: unknown } = {}
  if (teilergebnis.ergebnis === 'VERWEIGERT') {
    zusatzDaten = {
      daten: {
        bypass_verdacht_anzahl: teilergebnis.bypass_verdacht_anzahl,
        ...('is_error' in teilergebnis ? { is_error: teilergebnis.is_error } : {}),
        ...('non_execution_kind' in teilergebnis ? { non_execution_kind: teilergebnis.non_execution_kind } : {}),
      },
    }
  } else if (teilergebnis.ergebnis === 'FEHLGESCHLAGEN' && (teilergebnis.grund === 'timeout' || teilergebnis.grund === 'abgebrochen_manuell')) {
    // AK6: letzter gültiger Checkpoint MUSS vor dem eigenen
    // Terminal-Schreibvorgang gelesen werden, sonst fände er sich selbst —
    // bestehender, bereits exportierter Checkpoint-Store-Lesepfad, kein
    // neuer. Bekannte Grenze (wie F-067s dokumentierter Doppelaufruf-Fall
    // unten): ein zweiter TIMEOUT/ABBRUCH-Klassifikationsaufruf für
    // dieselbe laufId fände die zuvor geschriebene Terminalmarke selbst
    // als "letzten gültigen Checkpoint" und verschachtelt deren eigenes
    // letzter_gueltiger_checkpoint mit — kein normaler Ablauf (klassifiziereLauf
    // wird pro laufId einmal aufgerufen), deshalb bewusst nicht extra
    // abgefangen.
    const letzterGueltigerCheckpoint = ladeLetztenGueltigenCheckpoint(laufId, optionen)
    zusatzDaten = {
      daten: {
        art: teilergebnis.grund === 'timeout' ? 'TIMEOUT' : 'MANUELL',
        grund: teilergebnis.grund,
        // Beendigungsart wie im Rohstrom beobachtet (claude-code-gateway/
        // index.ts:314). Ihr bloßes Vorliegen belegt bereits, dass
        // killeProzessbaumFallsWindows (prozessstart.ts) für diesen Lauf
        // aufgerufen wurde — beide Zweige (TIMEOUT/ABBRUCH) rufen sie dort
        // unbedingt vor dem resolve auf, kein zusätzliches Feld nötig.
        beendigungsart: teilergebnis.grund === 'timeout' ? 'TIMEOUT' : 'ABBRUCH',
        letzter_gueltiger_checkpoint: letzterGueltigerCheckpoint,
      },
    }
  }

  const { pfad, selbstHash } = schreibeWirkungsmarke(laufId, profilReferenz, 'terminal', { ergebnis: teilergebnis.ergebnis, ...zusatzDaten }, optionen)
  return { ...teilergebnis, wirkungsmarke: { pfad, selbstHash } }
}
