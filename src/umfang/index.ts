/**
 * Datei: src/umfang/index.ts
 *
 * Zweck: Umfangs-Abgleich je Arbeitspaket (F45 B2b-3d, F-978, features/F45/plan-b2b3d-v2.md, A3/A7 und Korrekturrunde). Gleicht die vom
 * Ausführungslauf berührten Dateien (Änderungsübersicht) gegen die `bereiche` des Auftrags v0 ab — Präfix-Abgleich auf
 * Ordner/Module, Pfadtrenner / und \ gleich. Ohne Bereiche gibt es keinen Abgleich. Das Ergebnis ist nur ein Hinweis
 * (Abnahme, Zeile im Auftrag von Review und qa), nie ein Halt. Rein und deterministisch, kein I/O.
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs (Nachlauf der Ausführung, Auftrag von Review/qa),
 * scripts/check-f45-b2b3d-umfang.mjs, src/umfang/umfang.test.ts.
 */

import { istAusnahmePfad } from '../ausfuehrung-vorbedingung/index.ts'

/** Ergebnis eines Abgleichs: die Bereiche wie im Auftrag und die berührten Dateien außerhalb (sortiert, eindeutig). */
export interface UmfangErgebnis {
  bereiche: string[]
  ausserhalb: string[]
}

/** Was der Abgleich von einer Datei der Änderungsübersicht braucht. */
export interface UmfangDatei {
  pfad: string
  alter_pfad?: string
}

/** Höchstzahl der Dateien in der Zeile für Review und qa — der Rest wird gezählt, nicht aufgezählt. */
export const MAX_ZEILEN_DATEIEN = 50

/** Satzanfang der Zeile für Review und qa (Wortlaut des Auftrags). */
const ZEILEN_ANFANG = 'Diese Dateien liegen außerhalb der vereinbarten Bereiche: '

/**
 * Normalisiert einen Pfad: \ → /, mehrfache / zu einem, führendes ./ weg.
 * @param pfad - Datei- oder Bereichspfad
 * @returns normalisierter Pfad
 */
function normalisierePfad(pfad: string): string {
  let p = pfad.trim().replace(/\\/g, '/').replace(/\/{2,}/g, '/')
  while (p.startsWith('./')) p = p.slice(2)
  return p
}

/**
 * Normalisiert einen Bereich wie einen Pfad und nimmt zusätzlich /**, /* und abschließende / weg. Ein nicht leerer Eintrag,
 * der dabei leer wird oder nur aus * bzw. ** besteht (`./`, `.\`, `*`, `./**`), steht für das ganze Projekt (Korrekturrunde,
 * code-reviewer 1 / qa 3) — sonst träfe er still nichts und jede Datei wäre „außerhalb“.
 * @param bereich - Eintrag aus `bereiche`
 * @returns Präfix ohne Endung; '' für einen leeren Eintrag (trifft nichts), '.' für „alles“
 */
function normalisiereBereich(bereich: string): string {
  if (bereich.trim() === '') return ''
  let b = normalisierePfad(bereich)
  for (;;) {
    const vorher = b
    if (b.endsWith('/**')) b = b.slice(0, -3)
    else if (b.endsWith('/*')) b = b.slice(0, -2)
    else if (b.endsWith('/') && b.length > 1) b = b.slice(0, -1)
    if (b === vorher) break
  }
  return b === '' || b === '*' || b === '**' ? '.' : b
}

/**
 * true, wenn der Pfad unter einem der Bereiche liegt (`pfad === b` oder `pfad` beginnt mit `b/`; '.' trifft alles).
 * @param pfad - normalisierter Dateipfad
 * @param praefixe - normalisierte Bereiche
 * @returns true innerhalb, false außerhalb
 */
function liegtInnerhalb(pfad: string, praefixe: readonly string[]): boolean {
  return praefixe.some((b) => b === '.' || (b !== '' && (pfad === b || pfad.startsWith(`${b}/`))))
}

/**
 * Gleicht die berührten Dateien gegen die Bereiche des Arbeitspakets ab.
 * @param dateien - `dateien` der Änderungsübersicht (pfad, bei Umbenennung alter_pfad)
 * @param bereiche - `bereiche` des Auftrags (oder undefined)
 * @returns null ohne Bereiche (kein Abgleich), sonst Bereiche und Dateien außerhalb; Ausnahme-Pfade (istAusnahmePfad)
 *   zählen nie als außerhalb, bei einer Umbenennung genügt ein Pfad außerhalb (gemeldet wird der neue)
 */
export function gleicheUmfangAb(dateien: readonly UmfangDatei[], bereiche: readonly string[] | undefined): UmfangErgebnis | null {
  if (bereiche === undefined || bereiche.length === 0) return null
  const praefixe = bereiche.map(normalisiereBereich)
  const ausserhalb = new Set<string>()
  for (const datei of dateien) {
    const pfade = [datei.pfad, ...(datei.alter_pfad !== undefined ? [datei.alter_pfad] : [])].map(normalisierePfad)
    // Gemeldet wird der neue Pfad — liegt er selbst unter einer Ausnahme, wird nichts gemeldet (code-reviewer 9).
    if (istAusnahmePfad(pfade[0])) continue
    if (pfade.some((p) => !istAusnahmePfad(p) && !liegtInnerhalb(p, praefixe))) ausserhalb.add(normalisierePfad(datei.pfad))
  }
  return { bereiche: [...bereiche], ausserhalb: [...ausserhalb].sort() }
}

/**
 * Zeile für den Auftrag von Review und qa (nach dem Policy-Block bzw. am Ende).
 * @param ausserhalb - Dateien außerhalb der Bereiche
 * @returns '' bei leerer Liste (kein Text), sonst der Satz mit höchstens MAX_ZEILEN_DATEIEN Dateien und „… und n weitere“
 */
export function baueUmfangsZeile(ausserhalb: readonly string[]): string {
  if (ausserhalb.length === 0) return ''
  const gezeigt = ausserhalb.slice(0, MAX_ZEILEN_DATEIEN).join(', ')
  const rest = ausserhalb.length - MAX_ZEILEN_DATEIEN
  return `${ZEILEN_ANFANG}${gezeigt}${rest > 0 ? ` … und ${rest} weitere` : ''}`
}
