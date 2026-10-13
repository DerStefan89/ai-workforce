/**
 * Datei: src/faehigkeiten/stand.ts
 *
 * Zweck: F45 F-2b-2c (F-1061 (1)) — letzter bekannter Stand der lokalen Fähigkeiten-Datei über Neustarts des Leitstands.
 * `faehigkeiten.stand.json` liegt im selben Ordner wie `faehigkeiten.lokal.json` (Standard `~/.ai-workforce/`), außerhalb
 * jedes Repos (ARCHITECTURE.md §2, Ausnahme). Inhalt `{ faehigkeiten_stand_schema, pfad, hash, zeitpunkt, quelle }`; der
 * Pfad gehört dazu, damit ein umgelenkter Pfad (LEITSTAND_FAEHIGKEITEN_LOKAL_PFAD) nie mit dem Stand einer anderen Datei
 * verglichen wird. Geschrieben atomar (tmp + rename), ausschließlich LF.
 * - ladeLokalStand: fehlt | gueltig | ungueltig (wirft nie).
 * - schreibeLokalStand: atomar schreiben (wirft bei Fehlern, der Aufrufer loggt).
 * - standPfadFuer: Ablage neben der lokalen Datei.
 *
 * Wird aufgerufen von: scripts/leitstand/routen-faehigkeiten.mjs (erzeugeLokalWaechter), scripts/leitstand-server.mjs
 * (CLI-Bindeblock), src/faehigkeiten/stand.test.ts, scripts/leitstand/routen-faehigkeiten.test.mjs.
 *
 * Wichtig: Die Datei ist kein Schutz gegen einen Prozess mit Nutzerrechten (er kann sie wie die lokale Datei ändern,
 * Advisor A3). Sie macht nur sichtbar, was bei gestopptem Leitstand geschah; fehlt oder bricht sie, gilt der Stand als
 * unbekannt (gesperrt bis zur Bestätigung), nie still als bekannt (Advisor A1/A2).
 */

import { readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

/** Dateiname der Ablage neben der lokalen Datei. */
export const STAND_DATEINAME = 'faehigkeiten.stand.json'

/** Woher ein bekannter Stand stammt (gespeichert werden nur diese drei). */
export const STAND_QUELLEN = Object.freeze(['serverstart', 'route', 'bestaetigt'] as const)
export type StandQuelle = (typeof STAND_QUELLEN)[number]

/** Gespeicherter Stand. */
export interface LokalStand {
  faehigkeiten_stand_schema: 'v0'
  /** absoluter Pfad der lokalen Datei, zu der der Hash gehört */
  pfad: string
  /** sha256 der Bytes oder 'fehlt' */
  hash: string
  zeitpunkt: string
  quelle: StandQuelle
}

/** Ergebnis von ladeLokalStand. */
export type GeladenerStand = { zustand: 'fehlt' } | { zustand: 'gueltig'; stand: LokalStand } | { zustand: 'ungueltig'; grund: string }

const FELDER = new Set(['faehigkeiten_stand_schema', 'pfad', 'hash', 'zeitpunkt', 'quelle'])
const HASH = /^([0-9a-f]{64}|fehlt)$/

/**
 * Ablage des Stands zu einer lokalen Datei: derselbe Ordner (Tests und Nachweise mit umgelenktem Pfad schreiben so nie
 * Stefans Stand).
 * @param lokalPfad - Pfad von faehigkeiten.lokal.json
 * @returns Pfad von faehigkeiten.stand.json
 */
export function standPfadFuer(lokalPfad: string): string {
  return join(dirname(lokalPfad), STAND_DATEINAME)
}

/**
 * Prüft einen geparsten Stand (handgeschrieben, Muster validiereFaehigkeitenLokal).
 * @param daten - geparstes Objekt
 * @returns Verstöße (leer = gültig)
 */
export function validiereLokalStand(daten: unknown): string[] {
  if (typeof daten !== 'object' || daten === null || Array.isArray(daten)) return ['Stand muss ein Objekt sein']
  const d = daten as Record<string, unknown>
  const v: string[] = []
  for (const k of Object.keys(d)) if (!FELDER.has(k)) v.push(`unbekanntes Feld '${k}'`)
  if (d.faehigkeiten_stand_schema !== 'v0') v.push("'faehigkeiten_stand_schema' muss 'v0' sein")
  if (typeof d.pfad !== 'string' || d.pfad.length === 0) v.push("'pfad' fehlt")
  if (typeof d.hash !== 'string' || !HASH.test(d.hash)) v.push("'hash' muss ein sha256 oder 'fehlt' sein")
  if (typeof d.zeitpunkt !== 'string' || Number.isNaN(Date.parse(d.zeitpunkt))) v.push("'zeitpunkt' muss eine ISO-Zeit sein")
  if (!(STAND_QUELLEN as readonly unknown[]).includes(d.quelle)) v.push(`'quelle' muss ${STAND_QUELLEN.join('|')} sein`)
  return v
}

/**
 * Lädt den gespeicherten Stand. Wirft nie: fehlt (keine Datei), ungueltig (nicht lesbar, kein JSON, Form verletzt).
 * @param standPfad - Pfad der Ablage
 * @returns GeladenerStand
 */
export function ladeLokalStand(standPfad: string): GeladenerStand {
  let text: string
  try {
    text = readFileSync(standPfad, 'utf8')
  } catch (fehler) {
    if ((fehler as NodeJS.ErrnoException).code === 'ENOENT') return { zustand: 'fehlt' }
    return { zustand: 'ungueltig', grund: `'${standPfad}' nicht lesbar (${(fehler as Error).message})` }
  }
  let daten: unknown
  try {
    daten = JSON.parse(text)
  } catch (fehler) {
    return { zustand: 'ungueltig', grund: `'${standPfad}' ist kein gültiges JSON (${(fehler as Error).message})` }
  }
  const verstoesse = validiereLokalStand(daten)
  if (verstoesse.length > 0) return { zustand: 'ungueltig', grund: `'${standPfad}': ${verstoesse.join('; ')}` }
  return { zustand: 'gueltig', stand: daten as LokalStand }
}

/**
 * Schreibt den Stand atomar (tmp + rename, LF). Wirft bei Fehlern (der Wächter loggt und rechnet im Speicher weiter).
 * @param standPfad - Pfad der Ablage (der Ordner existiert, er ist der der lokalen Datei)
 * @param stand - zu schreibender Stand
 */
export function schreibeLokalStand(standPfad: string, stand: LokalStand): void {
  const verstoesse = validiereLokalStand(stand)
  if (verstoesse.length > 0) throw new Error(`Stand ungültig: ${verstoesse.join('; ')}`)
  const temp = `${standPfad}.${process.pid}.tmp`
  try {
    writeFileSync(temp, `${JSON.stringify(stand, null, 2)}\n`, 'utf8')
    renameSync(temp, standPfad)
  } catch (fehler) {
    rmSync(temp, { force: true })
    throw fehler
  }
}
