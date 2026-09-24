/**
 * Datei: src/pruefschritt/index.ts
 *
 * Zweck: Deterministischer Post-Build-Prüfschritt (F-652, state/findings.md
 * F-652, BUG P1). Löst den im Reallauf F39 WS-3b (Versuch 3c) beobachteten
 * Blocker: keine Rolle trägt einen Werkzeugsatz mit Bash/npm (ARCHITECTURE.md
 * §7 kennt keine Ausnahme dafür), eine Rolle kann `npm run check` also nicht
 * selbst ausführen — ohne diesen Fix blockiert jede Code-Ausführung, oder sie
 * meldet „fertig", ohne dass etwas verifiziert ist. Der KERN führt den in der
 * Startvorlage konfigurierten `pruefbefehl` deshalb selbst aus, rein
 * ausführend (kein Ausführungswerkzeug-Prozess im Sinne von
 * src/invocation-policy/, dieses Modul startet nur ein deterministisches
 * Kommando, kein Modell) — Muster src/aenderungsuebersicht/index.ts (dort
 * `git`, hier ein beliebiges, in der Startvorlage gepinntes argv).
 *
 * fuehrePruefungDurch wirft NIE: schlägt der Prozessstart selbst fehl
 * (ungültiges Startziel, ENOENT, …), liefert die Funktion ein Ergebnis mit
 * ergebnis 'FEHLER' — der auslösende Lauf darf daran nicht scheitern
 * (scripts/leitstand-server.mjs registriert das Artefakt NACH dessen eigenem
 * Terminalzustand, ein Fehlschlag der Prüfung selbst ist ein eigenes,
 * eindeutiges Ergebnis, nie stillschweigend GRUEN).
 *
 * Umgebung: der Kindprozess bekommt process.env OHNE jede LEITSTAND_*-
 * Variable (entferneLeitstandUmgebungsvariablen) — der Prüfbefehl ist meist
 * `npm run check`, das seinerseits eigene Leitstand-Instanzen startet
 * (scripts/check-f10-leitstand.mjs u. a.); eine vom Elternprozess geerbte
 * LEITSTAND_*-Variable (z. B. ein Port oder ein Testverzeichnis) verwechselte
 * sonst kindliche mit elterlichen Testläufen.
 *
 * Prozessstart/Zeitgrenze/Kill-Logik wird bewusst NICHT neu geschrieben,
 * sondern wiederverwendet: starteProzess (../claude-code-gateway/
 * prozessstart.ts) trägt bereits die real gemessene Windows-Prozessbaum-
 * Kill-Logik (F14 WS-1/WS-2, F-176/F-181) und den Hygiene-Guard gegen ein
 * Shell-interpretiertes Startziel (pruefeStartziel) — ein zweiter
 * Prozessstart-Regelsatz hier wäre D5-widrig (ARCHITECTURE.md §2).
 * umgebungsvariablenVollstaendig (StarterOptionen, additiv für F-652) ist der
 * einzige Weg, eine geerbte Variable dem Kind vorzuenthalten: ein Merge über
 * process.env (das bestehende umgebungsvariablen) kann eine Variable nur
 * überschreiben, nie entfernen.
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs (nach einem real
 * ERFOLGREICH/ABGESCHLOSSEN beendeten Lauf mit schreibendem Werkzeugsatz,
 * nur wenn die geladene Startvorlage einen pruefbefehl trägt).
 */

import { starteProzess } from '../claude-code-gateway/prozessstart.ts'
import type { PruefergebnisV0Daten, PruefergebnisWert } from './types.ts'

function istObjekt(wert: unknown): wert is Record<string, unknown> {
  return typeof wert === 'object' && wert !== null && !Array.isArray(wert)
}

function istNichtLeererString(wert: unknown): wert is string {
  return typeof wert === 'string' && wert.length > 0
}

const PRUEFERGEBNIS_FELDER = new Set(['pruefergebnis_schema', 'lauf_id', 'befehl', 'exit_code', 'ergebnis', 'dauer_ms', 'ausgabe_ende', 'gestartet_am'])
const PRUEFERGEBNIS_WERTE: PruefergebnisWert[] = ['GRUEN', 'ROT', 'ZEITGRENZE', 'FEHLER']

/**
 * Reine Funktion: prüft ein geparstes Objekt gegen
 * schemas/kontrollzustand-pruefergebnis-payload.schema.json. Muster
 * validiereAenderungsuebersichtDaten (src/aenderungsuebersicht/index.ts, D5 —
 * handgeschrieben statt ajv).
 * @param daten - geparstes, sonst unbekanntes Objekt
 * @returns Liste der Regelverletzungen; leeres Array = gültig
 */
export function validierePruefergebnisDaten(daten: unknown): string[] {
  if (!istObjekt(daten)) {
    return ['Wurzel ist kein Objekt']
  }
  const verstoesse: string[] = []

  for (const feld of Object.keys(daten)) {
    if (!PRUEFERGEBNIS_FELDER.has(feld)) verstoesse.push(`unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  for (const feld of PRUEFERGEBNIS_FELDER) {
    if (!(feld in daten)) verstoesse.push(`Pflichtfeld '${feld}' fehlt`)
  }

  if ('pruefergebnis_schema' in daten && daten.pruefergebnis_schema !== 'v0') {
    verstoesse.push("'pruefergebnis_schema' muss 'v0' sein")
  }
  if ('lauf_id' in daten && !istNichtLeererString(daten.lauf_id)) {
    verstoesse.push("'lauf_id' muss ein nicht-leerer String sein")
  }
  if ('befehl' in daten) {
    if (!Array.isArray(daten.befehl) || daten.befehl.length === 0 || daten.befehl.some((t) => typeof t !== 'string' || t.length === 0)) {
      verstoesse.push("'befehl' muss ein nicht-leeres Array nicht-leerer Strings sein")
    }
  }
  if ('exit_code' in daten && daten.exit_code !== null && (!Number.isInteger(daten.exit_code) || (daten.exit_code as number) < 0)) {
    verstoesse.push("'exit_code' muss eine ganze Zahl >= 0 oder null sein")
  }
  if ('ergebnis' in daten && (typeof daten.ergebnis !== 'string' || !PRUEFERGEBNIS_WERTE.includes(daten.ergebnis as PruefergebnisWert))) {
    verstoesse.push(`'ergebnis' muss einer von ${PRUEFERGEBNIS_WERTE.join(', ')} sein`)
  }
  if ('dauer_ms' in daten && (!Number.isInteger(daten.dauer_ms) || (daten.dauer_ms as number) < 0)) {
    verstoesse.push("'dauer_ms' muss eine ganze Zahl >= 0 sein")
  }
  if ('ausgabe_ende' in daten && typeof daten.ausgabe_ende !== 'string') {
    verstoesse.push("'ausgabe_ende' muss ein String sein")
  }
  if ('gestartet_am' in daten && !istNichtLeererString(daten.gestartet_am)) {
    verstoesse.push("'gestartet_am' muss ein nicht-leerer String sein")
  }

  return verstoesse
}

/** Kappungsgrenze für 'ausgabe_ende' — 16 KB reichen für die typische Fehlerausgabe eines gescheiterten `npm run check` (Lint-/Typecheck-/Testfehler stehen meist am ENDE der Ausgabe) und bleiben klein genug, um den Kontext eines nachfolgenden Review-Schritts nicht zu sprengen (Muster AENDERUNGSUEBERSICHT STANDARD_MAX_BYTES, hier ein fester Wert statt eines Startvorlagen-Felds — F-652-Bauauftrag Punkt 2 nennt ausdrücklich "16 KB, N begründet"). */
export const AUSGABE_ENDE_MAX_BYTES = 16_000

/** Schneidet 'text' auf die letzten 'maxBytes' Bytes (UTF-8-sicher über Buffer, Muster erzeugeAenderungsuebersichtDaten' Patch-Kürzung) — leer/kürzer bleibt unverändert. */
export function kuerzeAusgabeEnde(text: string, maxBytes: number = AUSGABE_ENDE_MAX_BYTES): string {
  const puffer = Buffer.from(text, 'utf8')
  if (puffer.length <= maxBytes) return text
  return puffer.subarray(puffer.length - maxBytes).toString('utf8')
}

/** Liefert die letzten 'n' Zeilen von 'text' — für den kurzen Halt-Grund-Text in ermittleNaechstenSchritt Regel 1f (Bauauftrag Punkt 5: "die letzten ~40 Zeilen der Ausgabe"), unabhängig von der separat gekappten 'ausgabe_ende' des Artefakts selbst. */
export function letzteZeilen(text: string, n: number): string {
  const zeilen = text.split('\n')
  return zeilen.slice(Math.max(0, zeilen.length - n)).join('\n')
}

/** Liefert process.env ohne jede Variable, deren Name mit 'LEITSTAND_' beginnt (F-652 Bauauftrag Punkt 2) — ein frischer, flacher String-Record, geeignet für StarterOptionen.umgebungsvariablenVollstaendig. */
export function entferneLeitstandUmgebungsvariablen(env: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const gefiltert: Record<string, string> = {}
  for (const [schluessel, wert] of Object.entries(env)) {
    if (wert === undefined || schluessel.startsWith('LEITSTAND_')) continue
    gefiltert[schluessel] = wert
  }
  return gefiltert
}

/**
 * Klassifiziert ein rohes ProzessErgebnis (starteProzess) in die vier
 * Pruefergebnis-Ausgänge. Reine Funktion, damit die Klassifikation
 * unabhängig vom echten Prozessstart testbar ist (Muster darfFruehAufloesen,
 * prozessstart.ts).
 * @param ergebnis - Rückgabe von starteProzess
 * @returns GRUEN (exitCode 0), ROT (anderer numerischer exitCode), ZEITGRENZE
 *   (beendigungsart 'TIMEOUT') oder FEHLER (jeder andere Fall — Startfehler,
 *   Abbruch, maxBuffer, ein fehlender numerischer Exitcode ohne erkannten Grund)
 */
export function klassifizierePruefergebnis(ergebnis: { exitCode: number | null; startfehler: unknown; beendigungsart: 'TIMEOUT' | 'ABBRUCH' | null }): PruefergebnisWert {
  if (ergebnis.beendigungsart === 'TIMEOUT') return 'ZEITGRENZE'
  if (ergebnis.startfehler !== null) return 'FEHLER'
  if (ergebnis.exitCode === 0) return 'GRUEN'
  if (typeof ergebnis.exitCode === 'number') return 'ROT'
  // Weder Timeout noch Startfehler noch numerischer Exitcode (z. B. ABBRUCH ohne
  // abbruchSignal-Aufrufer — dieses Modul übergibt nie eines) — defensiver Fallback, nie
  // stillschweigend GRUEN (ARCHITECTURE.md §4).
  return 'FEHLER'
}

/**
 * Führt den in der Startvorlage konfigurierten Prüfbefehl aus (F-652). Wirft
 * NIE — jeder Fehlschlag (Prozessstart, Klassifikation, ein Wurf aus
 * starteProzess selbst) endet als ergebnis 'FEHLER', nie als Wurf, den der
 * Aufrufer erst fangen müsste (Bauauftrag Punkt 2: "Geht die Prüfung selbst
 * schief, wird das als ergebnis FEHLER festgehalten und NICHT als grün
 * behandelt").
 * @param laufId - lauf_id des Laufs, dessen Ergebnis geprüft wird
 * @param befehl - vorlage.pruefbefehl (argv, [0] ist ein absoluter Programmpfad)
 * @param cwd - Arbeitsverzeichnis des Prüfprozesses (repoWurzel)
 * @param zeitgrenzeMs - harte Wanduhr-Grenze für den Prüfprozess, oder undefined (vorlage.pruefZeitgrenzeMs ist optional, F14-WS-4-Präzedenz: "kein fachlich fest codierter Default") — der Prozessstart bleibt dann ohne Wanduhr-Grenze, wie beim Werkzeuglauf selbst ohne gesetztes zeitgrenzeMs
 * @returns ein vollständiges, gegen validierePruefergebnisDaten gültiges Objekt
 */
export async function fuehrePruefungDurch(laufId: string, befehl: string[], cwd: string, zeitgrenzeMs: number | undefined): Promise<PruefergebnisV0Daten> {
  const gestartetAm = new Date().toISOString()
  const start = Date.now()
  try {
    const ergebnis = await starteProzess(befehl, [], {
      cwd,
      zeitgrenzeMs,
      umgebungsvariablenVollstaendig: entferneLeitstandUmgebungsvariablen(),
    })
    const ausgabeRoh = ergebnis.stderr.length > 0 ? `${ergebnis.stdout}\n--- stderr ---\n${ergebnis.stderr}` : ergebnis.stdout
    return {
      pruefergebnis_schema: 'v0',
      lauf_id: laufId,
      befehl,
      exit_code: ergebnis.exitCode,
      ergebnis: klassifizierePruefergebnis(ergebnis),
      dauer_ms: Date.now() - start,
      ausgabe_ende: kuerzeAusgabeEnde(ausgabeRoh),
      gestartet_am: gestartetAm,
    }
  } catch (fehler) {
    return {
      pruefergebnis_schema: 'v0',
      lauf_id: laufId,
      befehl,
      exit_code: null,
      ergebnis: 'FEHLER',
      dauer_ms: Date.now() - start,
      ausgabe_ende: kuerzeAusgabeEnde(`Prüfung selbst fehlgeschlagen: ${String((fehler as Error)?.message ?? fehler)}`),
      gestartet_am: gestartetAm,
    }
  }
}
