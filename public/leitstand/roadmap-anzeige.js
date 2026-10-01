/**
 * Datei: public/leitstand/roadmap-anzeige.js
 *
 * Zweck: Reine Anzeigeregeln der Roadmap (F44 WS-2a, Abgleich F-725 D1–D4) über der Projektion
 * von GET …/roadmap (scripts/leitstand/routen-roadmap.mjs): aktueller Meilenstein, Zähler
 * „x / y abgenommen“, Statuskategorie für Symbol und Legende, welche Meilensteine offen stehen,
 * welche Features in keinem Meilenstein stehen, und in welchem Zustand die Antwort ist.
 * Eine Stelle für diese Regeln, damit #/roadmap und in WS-2b der aktuelle Meilenstein und der
 * Fortschrittsring der Übersicht nicht auseinanderlaufen.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/roadmap.js
 * - public/leitstand/roadmap-anzeige.test.mjs (node:test)
 *
 * Wichtig:
 * - Import-sicher: kein Zugriff auf DOM, Storage oder Netz, keine Abhängigkeit — in Node
 *   importierbar.
 * - Die Bento-Karte im Workboard (views/workboard.js) folgt bis WS-3 einer eigenen, engeren
 *   Regel (nur LAEUFT hervorgehoben); sie entfällt mit WS-3 (F-892).
 */

/** Status eines abgeschlossenen Meilensteins bzw. eines abgenommenen Features. */
const ABGESCHLOSSEN = 'ABGESCHLOSSEN'

/**
 * Statuswerte je Kategorie. Meilensteine kennen GEPLANT/LAEUFT/ABGESCHLOSSEN
 * (src/projektkontext/index.ts), Features die Status-Werte von scripts/check-feature.mjs, dazu
 * die Projektionswerte keine_akte und UNBEKANNT (routen-roadmap.mjs).
 */
const KATEGORIE_JE_STATUS = {
  ABGESCHLOSSEN: 'abgenommen',
  FEATURE_GATE: 'freigabe',
  LAEUFT: 'in_arbeit',
  IN_ARBEIT: 'in_arbeit',
  WORKSTREAM_SCHNITT_GENEHMIGT: 'in_arbeit',
  BLOCKIERT: 'klaerung',
  GEPLANT: 'geplant',
  ENTWURF: 'geplant',
  READY_FOR_TECH: 'geplant',
  ABGEBROCHEN: 'abgebrochen',
  keine_akte: 'ohne_akte',
}

/** Kategorien in Legendenreihenfolge (die ersten fünf wie die Vorlage). */
export const STATUS_KATEGORIEN = ['abgenommen', 'freigabe', 'in_arbeit', 'klaerung', 'geplant', 'abgebrochen', 'ohne_akte', 'unbekannt']

/**
 * Meilensteine einer gültigen Projektion, sonst eine leere Liste.
 * @param roadmap - Antwort von GET …/roadmap
 * @returns Meilenstein-Liste
 */
function meilensteineVon(roadmap) {
  return roadmap !== null && typeof roadmap === 'object' && roadmap.status === 'ok' && Array.isArray(roadmap.meilensteine) ? roadmap.meilensteine : []
}

/**
 * Ordnet eine Antwort von GET …/roadmap einem Anzeigezustand zu (D4). Nur die drei
 * Fachergebnisse des Servers zählen als solche; jede andere Form (auch ein Körper ohne
 * bekannten status, z. B. { grund }) ist 'fehler' — ein Serverfehler erscheint so nie als
 * „keine Roadmap“ (F-854).
 * @param antwort - geparste Antwort, null solange geladen wird, oder { status: 'fehler' } nach einem Wurf
 * @returns 'laedt' | 'ok' | 'nicht_vorhanden' | 'ungueltig' | 'fehler'
 */
export function roadmapZustand(antwort) {
  if (antwort === null || antwort === undefined) return 'laedt'
  if (typeof antwort !== 'object') return 'fehler'
  if (antwort.status === 'nicht_vorhanden') return 'nicht_vorhanden'
  if (antwort.status === 'ungueltig' && Array.isArray(antwort.fehler)) return 'ungueltig'
  if (antwort.status === 'ok' && Array.isArray(antwort.meilensteine) && antwort.meilensteine.every((m) => m !== null && typeof m === 'object' && Array.isArray(m.features))) return 'ok'
  return 'fehler'
}

/**
 * Der aktuelle Meilenstein: der erste mit status LAEUFT, sonst der erste nicht abgeschlossene,
 * sonst null (alle abgeschlossen oder keine gültige Roadmap).
 * @param roadmap - Antwort von GET …/roadmap
 * @returns Meilenstein oder null
 */
export function aktuellerMeilenstein(roadmap) {
  const meilensteine = meilensteineVon(roadmap)
  return meilensteine.find((m) => m.status === 'LAEUFT') ?? meilensteine.find((m) => m.status !== ABGESCHLOSSEN) ?? null
}

/**
 * Zählt die Features eines Meilensteins.
 * @param meilenstein - Eintrag aus roadmap.meilensteine
 * @returns { abgenommen: Features mit status ABGESCHLOSSEN, gesamt: alle Features einschließlich keine_akte }
 */
export function zaehleMeilenstein(meilenstein) {
  const features = Array.isArray(meilenstein?.features) ? meilenstein.features : []
  return { abgenommen: features.filter((f) => f.status === ABGESCHLOSSEN).length, gesamt: features.length }
}

/**
 * Kategorie eines Meilenstein- oder Featurestatus für Symbol, Farbe und Legende.
 * @param status - roher Statuswert
 * @returns eine der STATUS_KATEGORIEN; unbekannte Werte → 'unbekannt'
 */
export function statusKategorie(status) {
  return (typeof status === 'string' && Object.hasOwn(KATEGORIE_JE_STATUS, status) ? KATEGORIE_JE_STATUS[status] : null) ?? 'unbekannt'
}

/**
 * Ob ein Meilenstein aufgeklappt erscheint: der aktuelle und alle späteren sind offen, ebenso
 * jeder nicht abgeschlossene; ein abgeschlossener vor dem aktuellen ist eingeklappt (D1).
 * @param roadmap - Antwort von GET …/roadmap
 * @param meilenstein - Eintrag aus roadmap.meilensteine
 * @returns true, wenn offen
 */
export function meilensteinOffen(roadmap, meilenstein) {
  if (meilenstein?.status !== ABGESCHLOSSEN) return true
  const meilensteine = meilensteineVon(roadmap)
  const aktueller = aktuellerMeilenstein(roadmap)
  if (aktueller === null) return false
  return meilensteine.indexOf(meilenstein) > meilensteine.indexOf(aktueller)
}

/**
 * Features aus dem Arbeitsvorrat, die in keinem Meilenstein stehen (D3).
 * @param roadmap - Antwort von GET …/roadmap
 * @param featureWorkitems - Workitems aus GET …/workitems?typ=FEATURE, null bei defekter Quelle
 * @returns Liste (bei 'nicht_vorhanden' alle Features), oder null, wenn die Zuordnung nicht prüfbar ist (Workitems defekt, Roadmap ungültig, fehlerhaft oder noch nicht geladen)
 */
export function nichtEingeplant(roadmap, featureWorkitems) {
  if (!Array.isArray(featureWorkitems)) return null
  const zustand = roadmapZustand(roadmap)
  if (zustand === 'nicht_vorhanden') return [...featureWorkitems]
  if (zustand !== 'ok') return null
  const eingeplant = new Set(meilensteineVon(roadmap).flatMap((m) => m.features.map((f) => f.id)))
  return featureWorkitems.filter((w) => !eingeplant.has(w.id))
}
