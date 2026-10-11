/**
 * Datei: src/arbeitsordner/loeschliste.ts
 *
 * Zweck: Löschen im eigenen Arbeitsordner (F45 B1a-1, E-F45-3 = A, löst F-715). Ein Ausführungslauf
 * darf keine Dateien selbst löschen (kein Bash(rm) im Werkzeugsatz); er nennt die zu löschenden Pfade,
 * und der Server prüft jeden einzeln und löscht ihn dann selbst — nur reguläre Dateien, nur innerhalb des
 * Arbeitsordners (Git-Worktree des Ablaufs), nie Git-, Harness- oder Kontrollzustandsdateien.
 *
 * Zwei Stufen:
 * - pruefeLoeschpfadText (rein): Form des Pfads — relativ, ohne '..', ohne Laufwerk/ADS (':'), ohne
 *   Steuerzeichen, ohne Segment mit '.'/Leerzeichen am Ende (Windows kürzt diese still, '.git.' wäre
 *   '.git'), nicht auf der Verbotsliste.
 * - loescheDateien (Dateisystem): lstat muss eine reguläre Datei zeigen (kein Verzeichnis, kein
 *   Symlink); realpath der Datei UND ihres Elternordners muss im realpath des Arbeitsordners liegen
 *   (eine Junction im Pfad führte sonst nach außen); die Verbotsliste gilt zusätzlich für den
 *   realpath-relativen Pfad (8.3-Kurznamen wie 'GIT~1'). Erst dann unlinkSync.
 *
 * Vergleiche der Verbotsliste ohne Groß/Klein (Windows-Dateisystem; unter Linux ist das strenger als
 * nötig, aber nie lockerer).
 *
 * Wird aufgerufen von:
 * - scripts/leitstand-server.mjs (starteLaufUndVergiss, nach einem Ausführungslauf im Arbeitsordner)
 * - src/arbeitsordner/arbeitsordner.test.ts (node:test)
 *
 * Wichtig: Diese Datei ist der einzige Löschweg der Workforce im Arbeitsordner. Keine Verzeichnisse,
 * kein rekursives Löschen. Grenze (geprüft, nicht ERZWUNGEN): zwischen Prüfung und unlinkSync liegt kein
 * Schutz gegen einen gleichzeitig schreibenden Prozess — der Lauf ist zu diesem Zeitpunkt beendet.
 */

import { lstatSync, realpathSync, unlinkSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, sep } from 'node:path'
import type { LoeschErgebnis } from './types.ts'

/** Höchstzahl der Pfade in einer Löschliste (wie maxItems in schemas/ergebnis-ausfuehrung-loeschliste.schema.json). */
export const MAX_LOESCHPFADE = 200

/** Höchstlänge eines Pfads. */
const MAX_PFAD_LAENGE = 4096

/**
 * Verzeichnisse, unter denen nichts gelöscht wird (das Verzeichnis selbst eingeschlossen), klein geschrieben.
 * '.claude' als Ganzes (Advisor-Pass B1a-1, Befund 9): Änderungen unter .claude/ bewertet der Kern nur während
 * des Laufs (src/execution-controller, leseClaudeAenderungen) — eine Löschung danach fiele dort durch.
 */
const VERBOTENE_VERZEICHNISSE = ['.git', '.claude', 'kontrollzustand']

/**
 * Prüft einen normalisierten, relativen Pfad ('/'-getrennt) gegen die Verbotsliste.
 * @param relativPosix - relativer Pfad mit '/' als Trenner
 * @returns Grund, wenn verboten, sonst null
 */
export function verboteGrund(relativPosix: string): string | null {
  const klein = relativPosix.toLowerCase()
  // Jedes Segment '.git' (auch ein Submodul-Zeiger 'sub/.git', Code-Review B1a-1, Befund 6).
  if (klein.split('/').includes('.git')) return "geschützter Bereich '.git'"
  for (const verzeichnis of VERBOTENE_VERZEICHNISSE) {
    if (klein === verzeichnis || klein.startsWith(`${verzeichnis}/`)) return `geschützter Bereich '${verzeichnis}/'`
  }
  return null
}

/**
 * Prüft die Form eines Löschpfads, ohne das Dateisystem zu berühren.
 * @param pfad - Eintrag der Löschliste (beliebiger Wert)
 * @returns { ok: true, relativ } mit '/'-getrenntem Pfad oder { ok: false, grund }
 */
export function pruefeLoeschpfadText(pfad: unknown): { ok: true; relativ: string } | { ok: false; grund: string } {
  if (typeof pfad !== 'string' || pfad.length === 0) return { ok: false, grund: 'kein nicht-leerer Text' }
  if (pfad.length > MAX_PFAD_LAENGE) return { ok: false, grund: `länger als ${MAX_PFAD_LAENGE} Zeichen` }
  if (/[\u0000-\u001f\u007f]/.test(pfad)) return { ok: false, grund: 'enthält Steuerzeichen' }
  const normalisiert = pfad.replace(/\\/g, '/')
  if (normalisiert.startsWith('/') || isAbsolute(pfad)) return { ok: false, grund: 'absoluter Pfad' }
  if (normalisiert.includes(':')) return { ok: false, grund: "enthält ':' (Laufwerk oder Datenstrom)" }
  const segmente = normalisiert.split('/')
  for (const segment of segmente) {
    if (segment.length === 0) return { ok: false, grund: 'leeres Pfadsegment' }
    if (segment === '.' || segment === '..') return { ok: false, grund: `Segment '${segment}' nicht erlaubt` }
    if (segment.endsWith('.') || segment.endsWith(' ')) return { ok: false, grund: `Segment endet auf Punkt oder Leerzeichen ('${segment}')` }
  }
  const verboten = verboteGrund(normalisiert)
  if (verboten !== null) return { ok: false, grund: verboten }
  return { ok: true, relativ: normalisiert }
}

/**
 * true, wenn ziel innerhalb von wurzel liegt (beide bereits realpath-aufgelöst); gleich wurzel zählt nicht.
 * @param wurzel - realpath des Arbeitsordners
 * @param ziel - realpath des Ziels
 * @returns true, wenn echt innerhalb
 */
function liegtInnerhalb(wurzel: string, ziel: string): boolean {
  const rel = relative(wurzel, ziel)
  return rel.length > 0 && !rel.startsWith('..') && !isAbsolute(rel)
}

/**
 * Prüft und löscht die Dateien einer Löschliste im Arbeitsordner. Jeder abgelehnte Pfad wird mit Grund
 * gemeldet, ein Fehler hält die übrigen nicht auf.
 * @param arbeitsordner - absoluter Pfad des Arbeitsordners (Worktree)
 * @param pfade - Einträge der Löschliste
 * @returns gelöschte Pfade und abgelehnte Pfade mit Grund
 */
export function loescheDateien(arbeitsordner: string, pfade: readonly unknown[]): LoeschErgebnis {
  const ergebnis: LoeschErgebnis = { geloescht: [], abgelehnt: [] }
  let wurzelReal: string
  try {
    wurzelReal = realpathSync.native(arbeitsordner)
  } catch (fehler) {
    const grund = `Arbeitsordner nicht lesbar: ${(fehler as Error).message}`
    for (const pfad of pfade) ergebnis.abgelehnt.push({ pfad: String(pfad), grund })
    return ergebnis
  }
  const gesehen = new Set<string>()
  for (const [index, pfad] of pfade.entries()) {
    const anzeige = typeof pfad === 'string' ? pfad : String(pfad)
    if (index >= MAX_LOESCHPFADE) {
      ergebnis.abgelehnt.push({ pfad: anzeige, grund: `mehr als ${MAX_LOESCHPFADE} Pfade` })
      continue
    }
    const text = pruefeLoeschpfadText(pfad)
    if (!text.ok) {
      ergebnis.abgelehnt.push({ pfad: anzeige, grund: text.grund })
      continue
    }
    const schluessel = text.relativ.toLowerCase()
    if (gesehen.has(schluessel)) {
      ergebnis.abgelehnt.push({ pfad: anzeige, grund: 'doppelt in der Liste' })
      continue
    }
    gesehen.add(schluessel)
    const absolut = join(arbeitsordner, ...text.relativ.split('/'))
    try {
      const info = lstatSync(absolut)
      if (info.isSymbolicLink()) {
        ergebnis.abgelehnt.push({ pfad: anzeige, grund: 'symbolische Verknüpfung' })
        continue
      }
      if (!info.isFile()) {
        ergebnis.abgelehnt.push({ pfad: anzeige, grund: 'keine reguläre Datei (Verzeichnisse werden nicht gelöscht)' })
        continue
      }
      const elternReal = realpathSync.native(dirname(absolut))
      const dateiReal = realpathSync.native(absolut)
      if (!(elternReal === wurzelReal || liegtInnerhalb(wurzelReal, elternReal)) || !liegtInnerhalb(wurzelReal, dateiReal)) {
        ergebnis.abgelehnt.push({ pfad: anzeige, grund: 'liegt nach Auflösung außerhalb des Arbeitsordners' })
        continue
      }
      const verbotenReal = verboteGrund(relative(wurzelReal, dateiReal).split(sep).join('/'))
      if (verbotenReal !== null) {
        ergebnis.abgelehnt.push({ pfad: anzeige, grund: verbotenReal })
        continue
      }
      // Gelöscht wird der geprüfte realpath, nicht der übergebene Pfad (Code-Review B1a-1, Befund 6).
      unlinkSync(dateiReal)
      ergebnis.geloescht.push(text.relativ)
    } catch (fehler) {
      const code = (fehler as NodeJS.ErrnoException).code
      ergebnis.abgelehnt.push({ pfad: anzeige, grund: code === 'ENOENT' ? 'existiert nicht' : `nicht löschbar: ${(fehler as Error).message}` })
    }
  }
  return ergebnis
}
