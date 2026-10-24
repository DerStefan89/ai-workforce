/**
 * Datei: src/workboard/roadmap-schreiben.ts
 *
 * Zweck: Textuelle Änderung von docs/projekt/roadmap.json für F45 B5b-1b-1 „Planung schreiben“ (R6; features/F45/plan-b5b1b-v2.md
 * §2.3, Advisor features/F45/advisor-b5b1b.md O9/B2): verschiebeFeature verschiebt eine Feature-ID ans Ende eines anderen
 * Meilensteins. Ausnahme zu „Kern liest den Projektordner nur“: ARCHITECTURE.md §2, docs/architektur/arbeitsordner.md.
 * Rein, kein I/O, wirft nicht; liegt in src/workboard und importiert nichts aus src/feature-auftrag (kein Ring, Advisor C1).
 *
 * Regeln:
 * - Nur die `features`-Literale des Ausgangs- und des Ziel-Meilensteins werden ersetzt (neu geschrieben als `["F1", "F2"]`), jedes
 *   andere Byte bleibt. Das Fenster eines Meilensteins reicht von seinem `"id": "<M>"` (genau einmal in der Datei) bis zum nächsten
 *   `"id":`; darin steht genau ein `"features": [ … ]` — sonst 422 „von Hand“ (das Schema verbietet verschachtelte `id`,
 *   src/projektkontext/index.ts).
 * - Rundlauf: die ganze neu geparste Struktur ist gleich der erwarteten (fängt eine andere Schlüsselreihenfolge), das Schema
 *   (validiereRoadmapDaten) ist erfüllt, und die ID steht genau einmal, im Ziel — diese Invariante ersetzt in der Route die
 *   ID-Prüfung pruefeAkteMeilenstein (Advisor B2; ein Einplanen aus ENTWURF, E-B5-2, ist damit abgedeckt).
 * - CRLF lehnt die Route vorher ab (A3); diese Funktion schreibt keine Zeilenenden.
 *
 * Wird aufgerufen von: scripts/leitstand/routen-planung.mjs, src/workboard/roadmap-schreiben.test.ts (das Gate
 * scripts/check-f45-b5b1b1-planung-schreiben.mjs erreicht das Modul über die Route).
 */

import { validiereRoadmapDaten } from '../projektkontext/index.ts'

export type Verschiebung = { ok: true; text: string; von: string | null; geaendert: boolean } | { ok: false; grund: string }

interface Meilenstein {
  id: string
  features: string[]
}

const ID_SCHLUESSEL = /"id"\s*:\s*"((?:[^"\\]|\\.)*)"/g
const FEATURES_LITERAL = /"features"\s*:\s*\[[^\]]*\]/g

/**
 * JSON.parse ohne Wurf, Ergebnis als unknown (cr 9).
 * @param text - JSON-Text
 * @returns { ok: true, wert } | { ok: false, grund }
 */
function leseJson(text: string): { ok: true; wert: unknown } | { ok: false; grund: string } {
  try {
    return { ok: true, wert: JSON.parse(text) }
  } catch (fehler) {
    return { ok: false, grund: fehler instanceof Error ? fehler.message : String(fehler) }
  }
}

/**
 * Lage des `features`-Literals eines Meilensteins im Text.
 * @param text - roadmap.json
 * @param meilensteinId - ID
 * @returns { start, ende } des Literals ab `"features"` oder ein Grund
 */
function featuresLiteral(text: string, meilensteinId: string): { ok: true; start: number; ende: number } | { ok: false; grund: string } {
  const ids = [...text.matchAll(ID_SCHLUESSEL)].map((t) => {
    let wert: unknown = null
    try {
      wert = JSON.parse(`"${t[1]}"`)
    } catch {
      wert = null
    }
    return { index: t.index, wert }
  })
  const eigene = ids.filter((t) => t.wert === meilensteinId)
  if (eigene.length !== 1) return { ok: false, grund: `roadmap.json: "id": "${meilensteinId}" steht ${eigene.length}× im Text — von Hand bearbeiten` }
  const naechste = ids.find((t) => t.index > eigene[0].index)
  const fenster = text.slice(eigene[0].index, naechste === undefined ? text.length : naechste.index)
  const literale = [...fenster.matchAll(FEATURES_LITERAL)]
  if (literale.length !== 1) return { ok: false, grund: `roadmap.json: Meilenstein ${meilensteinId} hat ${literale.length} "features"-Literale hinter seiner ID — von Hand bearbeiten` }
  const start = eigene[0].index + literale[0].index
  return { ok: true, start, ende: start + literale[0][0].length }
}

/**
 * Verschiebt featureId ans Ende von ziel (Regeln im Dateikopf). Steht die ID in keinem Meilenstein, wird sie eingeplant.
 * @param text - aktueller Inhalt von roadmap.json (LF, gültiges Schema)
 * @param featureId - geprüfte Feature-ID
 * @param ziel - ID des Ziel-Meilensteins
 * @returns { ok: true, text, von, geaendert } (geaendert false: schon im Ziel, text unverändert) | { ok: false, grund } (HTTP 422)
 */
export function verschiebeFeature(text: string, featureId: string, ziel: string): Verschiebung {
  const roh = leseJson(text)
  if (!roh.ok) return { ok: false, grund: `roadmap.json nicht lesbar: ${roh.grund}` }
  if (validiereRoadmapDaten(roh.wert).length > 0) return { ok: false, grund: 'roadmap.json verletzt schon vor der Änderung das Schema — von Hand beheben' }
  // Nach validiereRoadmapDaten trägt jeder Meilenstein id und features als Strings.
  const daten = roh.wert as { meilensteine: Meilenstein[] }
  const fundstellen = daten.meilensteine.flatMap((m) => m.features.filter((f) => f === featureId).map(() => m.id))
  if (fundstellen.length > 1) return { ok: false, grund: `${featureId} steht ${fundstellen.length}× in roadmap.json (${fundstellen.join(', ')}) — von Hand bereinigen` }
  const von = fundstellen[0] ?? null
  const zielMeilenstein = daten.meilensteine.find((m) => m.id === ziel)
  if (zielMeilenstein === undefined) return { ok: false, grund: `Meilenstein '${ziel}' steht nicht in roadmap.json` }
  if (von === ziel) return { ok: true, text, von, geaendert: false }

  const erwartet = structuredClone(daten)
  const ersetzungen: { start: number; ende: number; text: string }[] = []
  for (const m of erwartet.meilensteine) {
    if (m.id === von) m.features = m.features.filter((f) => f !== featureId)
    else if (m.id === ziel) m.features = [...m.features, featureId]
    else continue
    const lage = featuresLiteral(text, m.id)
    if (!lage.ok) return lage
    ersetzungen.push({ start: lage.start, ende: lage.ende, text: `"features": [${m.features.map((f) => JSON.stringify(f)).join(', ')}]` })
  }
  let neu = text
  for (const e of ersetzungen.sort((a, b) => b.start - a.start)) neu = neu.slice(0, e.start) + e.text + neu.slice(e.ende)

  const gelesenRoh = leseJson(neu)
  // Schema vor dem Zugriff (cr 9): „wirft nicht“ gilt auch für einen verunglückten Text.
  if (!gelesenRoh.ok || validiereRoadmapDaten(gelesenRoh.wert).length > 0) return { ok: false, grund: 'roadmap.json wäre nach der Änderung kein gültiges JSON bzw. Schema — nichts geschrieben, von Hand bearbeiten' }
  const gelesen = gelesenRoh.wert as { meilensteine: Meilenstein[] }
  const orte = gelesen.meilensteine.flatMap((m) => m.features.filter((f) => f === featureId).map(() => m.id))
  if (JSON.stringify(gelesen) !== JSON.stringify(erwartet) || orte.length !== 1 || orte[0] !== ziel) {
    return { ok: false, grund: 'roadmap.json liest sich nach der Änderung nicht wie erwartet (Aufbau weicht vom Muster ab) — nichts geschrieben, von Hand bearbeiten' }
  }
  return { ok: true, text: neu, von, geaendert: true }
}
