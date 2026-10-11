/**
 * Datei: scripts/leitstand/startvorlage-wahl.mjs
 *
 * Zweck: F45 B1a-2 (F-1009) — welche Startvorlage der Leitstand für die eigene Installation lädt.
 * Bisher galt ohne LEITSTAND_STARTVORLAGE_PFAD immer startvorlagen/beispielprojekt.json, obwohl
 * projekte.json für ai-workforce startvorlagen/ai-workforce.json trägt — Router-Worker, Chat-Worker und
 * Lauf-Zeitgrenze hingen damit am Startbefehl. Reihenfolge jetzt:
 * 1. LEITSTAND_STARTVORLAGE_PFAD (nicht leer) — hat weiter Vorrang;
 * 2. startvorlage_pfad des Registereintrags, dessen repo_pfad auf die Installation selbst zeigt
 *    (dieselbe Regel wie selbstEintrag im CLI-Bindeblock: resolve(projekteBasis, repo_pfad) === projekteBasis);
 * 3. sonst der bisherige Standard, mit Warnung.
 * Reine Funktion (kein Dateisystem); ob die gewählte Datei ladbar ist, prüft der Aufrufer — ein fehlender
 * oder kaputter Registereintrag fällt NICHT still auf den Standard zurück.
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs (CLI-Bindeblock), scripts/leitstand/startvorlage-wahl.test.mjs.
 */

import { relative, resolve, sep } from 'node:path'

/**
 * Wählt die Startvorlage der Installation.
 * @param eingaben - { umgebungsPfad, projekte, projekteBasis, standardPfad }
 * @returns { pfad, herkunft: 'umgebung'|'register'|'standard', projektId } — pfad relativ zu projekteBasis, wenn darin; null, wenn der Eintrag der Installation keine Startvorlage nennt
 */
export function ermittleStartvorlage({ umgebungsPfad, projekte, projekteBasis, standardPfad }) {
  if (typeof umgebungsPfad === 'string' && umgebungsPfad.trim().length > 0) {
    return { pfad: umgebungsPfad, herkunft: 'umgebung', projektId: null }
  }
  const basis = resolve(projekteBasis)
  const eintrag = (Array.isArray(projekte) ? projekte : []).find((projekt) => typeof projekt?.repo_pfad === 'string' && resolve(basis, projekt.repo_pfad) === basis)
  if (eintrag === undefined) return { pfad: standardPfad, herkunft: 'standard', projektId: null }
  // Eintrag da, aber ohne Startvorlage: kein Rückfall auf den Standard — pfad null, der Aufrufer bricht ab.
  if (typeof eintrag.startvorlage_pfad !== 'string' || eintrag.startvorlage_pfad.trim().length === 0) return { pfad: null, herkunft: 'register', projektId: eintrag.id ?? null }
  const absolut = resolve(basis, eintrag.repo_pfad, eintrag.startvorlage_pfad)
  const rel = relative(basis, absolut)
  const pfad = rel.length > 0 && !rel.startsWith('..') ? rel.split(sep).join('/') : absolut
  return { pfad, herkunft: 'register', projektId: eintrag.id ?? null }
}

/**
 * Lesbarer Text der Herkunft für die Startzeile.
 * @param wahl - Ergebnis von ermittleStartvorlage
 * @returns Text
 */
export function beschreibeStartvorlagenHerkunft(wahl) {
  if (wahl.herkunft === 'umgebung') return 'aus LEITSTAND_STARTVORLAGE_PFAD'
  if (wahl.herkunft === 'register') return `aus dem Projektregister (Eintrag '${wahl.projektId ?? '?'}')`
  return 'Standard — kein Registereintrag für diesen Ordner'
}
