/**
 * Datei: src/workboard/feature-akte-pruefung.ts
 *
 * Zweck: Die Regeln des Feature-Akte-Gates (scripts/check-feature.mjs) als reine Funktion — F45 B5a-1
 * (features/F45/plan-b5a1-v2.md, Advisor O5/C6): PUT/POST der Akte (scripts/leitstand/routen-f35.mjs)
 * schreiben nur, was dieses Gate besteht, und das Gate ruft dieselbe Funktion je Akte. Dazu die eine
 * Status-Zeilen-Regel (`Status: <WERT>`), die Gate, Routen und scripts/check-akte-meilenstein.mjs teilen.
 * Abhängigkeitsrichtung bleibt scripts/ → src/ (Muster feature-status.ts).
 *
 * Wird aufgerufen von: scripts/check-feature.mjs, scripts/check-akte-meilenstein.mjs,
 * scripts/leitstand/routen-f35.mjs, scripts/leitstand/routen-roadmap.mjs (leseFeatureStatus), src/feature-auftrag/akte-schreiben.ts,
 * src/workboard/feature-akte-pruefung.test.ts.
 *
 * Wichtig: Die Status-Zeile wird nur innerhalb einer Zeile gelesen (`[ \t]*`, nicht `\s*` — sonst
 * griffe sie über ein Zeilenende auf das nächste Wort).
 */

import { pruefeOptionaleAbschnitte } from './feature-abschnitte.ts'
import { pruefePlanung } from './feature-planung.ts'
import { gueltigeStatusWerte } from './feature-status.ts'

const STATUS_ZEILE_MUSTER = /^Status:[ \t]*(\S+)/m

// Entscheidung (löst specs/AF-F001/spec.md §Offene Fragen, Punkt 2): Überschriften werden exakt und
// case-sensitiv erkannt (`## Ziel`, kein Toleranzbereich für Groß-/Kleinschreibung oder Synonyme).
const PFLICHT_ABSCHNITTE = [
  { name: 'Ziel', muster: /^##\s+Ziel\b/m },
  { name: 'Nicht-Ziele', muster: /^##\s+Nicht-Ziele\b/m },
  { name: 'Akzeptanzkriterien', muster: /^##\s+Akzeptanzkriterien\b/m },
  { name: 'Dependencies', muster: /^##\s+Dependencies\b/m },
]

/**
 * Liest den Wert der ersten Status-Zeile einer Akte.
 * @param inhalt - Text der Akte
 * @returns Status-Wert oder null, wenn keine Status-Zeile steht
 */
export function leseFeatureStatus(inhalt: string): string | null {
  const treffer = STATUS_ZEILE_MUSTER.exec(inhalt)
  return treffer === null ? null : treffer[1]
}

/**
 * Prüft eine Akte nach den Regeln des Feature-Akte-Gates: Status vorhanden und gültig (sonst nur
 * dieser Befund), bei READY_FOR_TECH die vier Pflichtabschnitte, unabhängig vom Status die optionalen
 * technischen Abschnitte (pruefeOptionaleAbschnitte) und die Planungsdaten (pruefePlanung, F45 B5b-1a).
 * @param inhalt - Text der Akte
 * @returns Befunde ohne Pfad-Präfix; leer = die Akte besteht
 */
export function pruefeFeatureAkteInhalt(inhalt: string): string[] {
  const status = leseFeatureStatus(inhalt)
  if (status === null || !gueltigeStatusWerte.includes(status)) return ['Status fehlt oder unbekannt']
  const befunde: string[] = []
  if (status === 'READY_FOR_TECH') {
    for (const abschnitt of PFLICHT_ABSCHNITTE) {
      if (!abschnitt.muster.test(inhalt)) befunde.push(`Abschnitt "${abschnitt.name}" fehlt (Status: READY_FOR_TECH verlangt ihn)`)
    }
  }
  befunde.push(...pruefeOptionaleAbschnitte(inhalt))
  // F45 B5b-1a: Priorität, Abgenommen und strenger Abschnitt „## Workstreams“ (src/workboard/feature-planung.ts).
  befunde.push(...pruefePlanung(inhalt, status))
  return befunde
}
