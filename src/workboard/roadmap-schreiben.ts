/**
 * Datei: src/workboard/roadmap-schreiben.ts
 *
 * Zweck: Textuelle Änderung von docs/projekt/roadmap.json für F45 B5b-1b-1 „Planung schreiben“ (R6; features/F45/plan-b5b1b-v2.md
 * §2.3, Advisor features/F45/advisor-b5b1b.md O9/B2): verschiebeFeature verschiebt eine Feature-ID ans Ende eines anderen
 * Meilensteins. Seit F45 B5b-1b-2 „Bereinigungsliste“ (features/F45/plan-b5b1b2-v2.md §2.2): setzeMeilensteinStatus ersetzt nur den
 * Status-Wert eines Meilensteins (gleiches Fenster), entferneStatusAusnahme entfernt genau eine einzeilige Ausnahme aus
 * roadmap-ausnahmen.json. Ausnahme zu „Kern liest den Projektordner nur“: ARCHITECTURE.md §2, docs/architektur/arbeitsordner.md.
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
 * Wird aufgerufen von: scripts/leitstand/routen-planung.mjs, src/workboard/roadmap-schreiben.test.ts (die Gates
 * scripts/check-f45-b5b1b1-planung-schreiben.mjs und scripts/check-f45-b5b1b2-bereinigung.mjs erreichen das Modul über die Route).
 */

import { validiereRoadmapDaten } from '../projektkontext/index.ts'
import { leseStatusAusnahmen } from './roadmap-regeln.ts'

export type Verschiebung = { ok: true; text: string; von: string | null; geaendert: boolean } | { ok: false; grund: string }

interface Meilenstein {
  id: string
  features: string[]
}

const ID_SCHLUESSEL = /"id"\s*:\s*"((?:[^"\\]|\\.)*)"/g
const FEATURES_LITERAL = /"features"\s*:\s*\[[^\]]*\]/g
const STATUS_LITERAL = /"status"\s*:\s*"(?:[^"\\]|\\.)*"/g

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
 * Lage eines Literals (`"features": […]` bzw. `"status": "…"`) eines Meilensteins im Text: im Fenster von seinem `"id"` bis zum
 * nächsten `"id"` genau ein Treffer.
 * @param text - roadmap.json
 * @param meilensteinId - ID
 * @param muster - Literal-Muster mit /g
 * @param name - Schlüsselname für die Meldung
 * @returns { start, ende } des Literals oder ein Grund
 */
function literalImFenster(text: string, meilensteinId: string, muster: RegExp, name: string): { ok: true; start: number; ende: number } | { ok: false; grund: string } {
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
  const literale = [...fenster.matchAll(muster)]
  if (literale.length !== 1) return { ok: false, grund: `roadmap.json: Meilenstein ${meilensteinId} hat ${literale.length} "${name}"-Literale hinter seiner ID — von Hand bearbeiten` }
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
    const lage = literalImFenster(text, m.id, FEATURES_LITERAL, 'features')
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

/**
 * Setzt den Status eines Meilensteins (F45 B5b-1b-2 „Meilenstein → LAEUFT“, O5): im Fenster des Meilensteins genau ein
 * `"status": "…"`-Literal, nur dessen Wert wird ersetzt. Rundlauf wie verschiebeFeature (ganze Struktur, Schema).
 * @param text - aktueller Inhalt von roadmap.json (LF, gültiges Schema)
 * @param meilensteinId - ID des Meilensteins
 * @param status - neuer Status (Schema-Wert, z. B. LAEUFT)
 * @returns { ok: true, text } | { ok: false, grund } (HTTP 422)
 */
export function setzeMeilensteinStatus(text: string, meilensteinId: string, status: string): { ok: true; text: string } | { ok: false; grund: string } {
  const roh = leseJson(text)
  if (!roh.ok || validiereRoadmapDaten(roh.wert).length > 0) return { ok: false, grund: 'roadmap.json ist schon vor der Änderung kein gültiges JSON bzw. Schema — von Hand beheben' }
  const erwartet = structuredClone(roh.wert) as { meilensteine: { id: string; status: string }[] }
  const meilenstein = erwartet.meilensteine.find((m) => m.id === meilensteinId)
  if (meilenstein === undefined) return { ok: false, grund: `Meilenstein '${meilensteinId}' steht nicht in roadmap.json` }
  meilenstein.status = status
  const lage = literalImFenster(text, meilensteinId, STATUS_LITERAL, 'status')
  if (!lage.ok) return lage
  const literal = text.slice(lage.start, lage.ende).replace(/"(?:[^"\\]|\\.)*"$/, JSON.stringify(status))
  const neu = text.slice(0, lage.start) + literal + text.slice(lage.ende)
  const gelesen = leseJson(neu)
  if (!gelesen.ok || validiereRoadmapDaten(gelesen.wert).length > 0 || JSON.stringify(gelesen.wert) !== JSON.stringify(erwartet)) {
    return { ok: false, grund: 'roadmap.json liest sich nach der Änderung nicht wie erwartet (Aufbau weicht vom Muster ab) — nichts geschrieben, von Hand bearbeiten' }
  }
  return { ok: true, text: neu }
}

/**
 * Entfernt die Ausnahme meilenstein/feature aus roadmap-ausnahmen.json (F45 B5b-1b-2), zeilenbasiert (Advisor B5): genau eine
 * Zeile, deren Inhalt ohne Leerraum und Endkomma ein JSON-Objekt mit genau diesem Paar ist. Ist sie das letzte Element (die nächste
 * nicht leere Zeile beginnt mit `]`), verliert die vorige Elementzeile ihr Endkomma; als einziges Element bleibt das Array leer.
 * Jede andere Form ⇒ 422 „von Hand“. Rundlauf: geparste Struktur = erwartete, leseStatusAusnahmen ohne Befund.
 * @param text - Inhalt von roadmap-ausnahmen.json (LF; CRLF lehnt die Route vorher ab)
 * @param meilenstein - Meilenstein-ID der Ausnahme
 * @param feature - Feature-ID der Ausnahme
 * @returns { ok: true, text } | { ok: false, grund } (HTTP 422)
 */
export function entferneStatusAusnahme(text: string, meilenstein: string, feature: string): { ok: true; text: string } | { ok: false; grund: string } {
  const vonHand = (warum: string) => ({ ok: false as const, grund: `roadmap-ausnahmen.json: ${warum} — Ausnahme ${meilenstein}/${feature} von Hand entfernen` })
  const roh = leseJson(text)
  if (!roh.ok || leseStatusAusnahmen(text).befunde.length > 0) return vonHand('Datei ist ungültig')
  const istPaar = (wert: unknown) => wert !== null && typeof wert === 'object' && (wert as Record<string, unknown>).meilenstein === meilenstein && (wert as Record<string, unknown>).feature === feature
  const zeilen = text.split('\n')
  const treffer = zeilen.flatMap((zeile, index) => {
    const kern = zeile.trim().replace(/,$/, '')
    if (!kern.startsWith('{')) return []
    const objekt = leseJson(kern)
    return objekt.ok && istPaar(objekt.wert) ? [index] : []
  })
  if (treffer.length !== 1) return vonHand(`${treffer.length} einzeilige Einträge für dieses Paar gefunden`)
  const index = treffer[0]
  const neu = [...zeilen]
  neu.splice(index, 1)
  const folgt = zeilen.slice(index + 1).find((zeile) => zeile.trim() !== '')
  if (folgt?.trim().startsWith(']')) {
    let vorige = index - 1
    while (vorige >= 0 && zeilen[vorige].trim() === '') vorige -= 1
    // Nur eine Elementzeile verliert ihr Komma; steht davor `[`, war es das einzige Element.
    if (vorige >= 0 && zeilen[vorige].trim().startsWith('{')) neu[vorige] = zeilen[vorige].replace(/,(\s*)$/, '$1')
  }
  const neuText = neu.join('\n')
  const erwartet = structuredClone(roh.wert) as { status_ausnahmen: unknown[] }
  erwartet.status_ausnahmen = erwartet.status_ausnahmen.filter((eintrag) => !istPaar(eintrag))
  const gelesen = leseJson(neuText)
  if (!gelesen.ok || JSON.stringify(gelesen.wert) !== JSON.stringify(erwartet) || leseStatusAusnahmen(neuText).befunde.length > 0) return vonHand('liest sich nach dem Entfernen nicht wie erwartet (Aufbau weicht vom Muster ab), nichts geschrieben')
  return { ok: true, text: neuText }
}
