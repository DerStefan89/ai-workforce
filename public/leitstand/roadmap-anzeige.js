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
 * - public/leitstand/views/dashboard.js (F44 WS-2b: aktueller Meilenstein, Fortschrittsring, Vier Werte,
 *   Weg zum Produkt, Auswahl des Entwicklungsstands)
 * - public/leitstand/views/workboard-detail.js (F44 WS-3a/3b: statusKategorie für den Kartenstatus von Feature-Akten,
 *   roadmapZustand für den Meilenstein im Detail)
 * - public/leitstand/views/projekte-uebersicht.js über produkte-anzeige.js (F44 WS-6a: roadmapZustand, zaehleRoadmap —
 *   Ring je Produktkarte)
 * - public/leitstand/roadmap-anzeige.test.mjs (node:test)
 *
 * Wichtig:
 * - Import-sicher: kein Zugriff auf DOM, Storage oder Netz, keine Abhängigkeit — in Node
 *   importierbar.
 * - Die frühere Bento-Karte „Roadmap“ im Workboard mit eigener, engerer Regel ist seit F44 WS-3a
 *   entfernt (F-892).
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

/** Symbol je Statuskategorie — die fünf der Vorlage (✓ ◉ ↻ ! ○), dazu Abgebrochen, Ohne Akte und Unbekannt. Gemeinsam für #/roadmap und die Übersicht (F44 WS-2b). */
export const STATUS_SYMBOL = Object.freeze({
  abgenommen: '✓',
  freigabe: '◉',
  in_arbeit: '↻',
  klaerung: '!',
  geplant: '○',
  abgebrochen: '–',
  ohne_akte: '◇',
  unbekannt: '?',
})

/**
 * Featurestatus, die in der Übersicht als „Geplant“ zählen (B5): noch nicht gestartet. Seit F-904
 * (Challenger, 01.10.2026) ohne WORKSTREAM_SCHNITT_GENEHMIGT — der zählt wie in den Zeilen
 * (statusKategorie) als „in Arbeit“.
 */
const GEPLANT_STATUS = new Set(['ENTWURF', 'READY_FOR_TECH'])

/** Rang der Finding-Prioritäten im Entwicklungsstand (B10); Features ohne Priorität stehen dahinter. */
const ENTWICKLUNG_RANG = { P0: 0, P1: 1, P2: 2 }

/** Höchstzahl der Zeilen im Entwicklungsstand der Übersicht (B10, F-905). */
export const ENTWICKLUNGSSTAND_MAX = 8

/** Feature-ID nach der Roadmap-Regel (src/projektkontext, validiereRoadmapDaten) — nur solche IDs kann ein Meilenstein aufnehmen (F-895). */
const ROADMAP_FEATURE_ID = /^F[0-9]+[A-Za-z]?$/

/** Status, mit denen ein Feature keine Planungsentscheidung mehr braucht (F-895). */
const ERLEDIGT_STATUS = new Set([ABGESCHLOSSEN, 'ABGEBROCHEN'])

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
 * Zählt die Features aller Meilensteine einer gültigen Projektion (F44 WS-6a, Ring „Erfasste
 * Einträge abgenommen“ je Karte auf `#/projekte-uebersicht`, Abgleich F-725 H1). Ein Feature, das
 * in zwei Meilensteinen steht, zählt zweimal — wie in der Projektion.
 * @param roadmap - Antwort von GET …/roadmap
 * @returns { abgenommen, gesamt } über alle Meilensteine; 0/0 ohne gültige Projektion
 */
export function zaehleRoadmap(roadmap) {
  return meilensteineVon(roadmap)
    .map(zaehleMeilenstein)
    .reduce((summe, z) => ({ abgenommen: summe.abgenommen + z.abgenommen, gesamt: summe.gesamt + z.gesamt }), { abgenommen: 0, gesamt: 0 })
}

/**
 * Zählt die Features eines Meilensteins, die noch nicht gestartet sind (B5 „Geplant“): Status
 * ENTWURF oder READY_FOR_TECH (F-904).
 * @param meilenstein - Eintrag aus roadmap.meilensteine, oder null
 * @returns Anzahl (0 ohne Meilenstein)
 */
export function zaehleGeplant(meilenstein) {
  const features = Array.isArray(meilenstein?.features) ? meilenstein.features : []
  return features.filter((f) => GEPLANT_STATUS.has(f?.status)).length
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
 * Features aus dem Arbeitsvorrat, die in keinem Meilenstein stehen (D3). Seit F-895 (Challenger,
 * F44 WS-2b, reversibel) nur offene Features — Status weder ABGESCHLOSSEN noch ABGEBROCHEN — mit
 * einer ID nach der Roadmap-Regel; alle übrigen kann bzw. muss kein Meilenstein aufnehmen.
 * @param roadmap - Antwort von GET …/roadmap
 * @param featureWorkitems - Workitems aus GET …/workitems?typ=FEATURE, null bei defekter Quelle
 * @returns Liste (bei 'nicht_vorhanden' alle Features), oder null, wenn die Zuordnung nicht prüfbar ist (Workitems defekt, Roadmap ungültig, fehlerhaft oder noch nicht geladen)
 */
export function nichtEingeplant(roadmap, featureWorkitems) {
  if (!Array.isArray(featureWorkitems)) return null
  const zustand = roadmapZustand(roadmap)
  if (zustand !== 'ok' && zustand !== 'nicht_vorhanden') return null
  const planbar = featureWorkitems.filter((w) => typeof w?.id === 'string' && ROADMAP_FEATURE_ID.test(w.id) && !ERLEDIGT_STATUS.has(w.status))
  if (zustand === 'nicht_vorhanden') return planbar
  const eingeplant = new Set(meilensteineVon(roadmap).flatMap((m) => m.features.map((f) => f.id)))
  return planbar.filter((w) => !eingeplant.has(w.id))
}

/**
 * Auswahl und Reihenfolge des Entwicklungsstands der Übersicht (B10, F-905 nach Vorlage V10):
 * offene Findings mit Priorität P0–P2 (Status OFFEN) und die offenen Features des aktuellen
 * Meilensteins (Status weder ABGESCHLOSSEN noch ABGEBROCHEN), sortiert P0 → P1 → P2 → Features
 * („ohne Priorität“), höchstens `max` Einträge. Innerhalb einer Stufe bleibt die Reihenfolge der
 * Quelle (Findings wie geliefert, Features wie im Meilenstein). Rein, ohne DOM und Netz.
 * @param meilenstein - aktueller Meilenstein (aktuellerMeilenstein) oder null
 * @param workitems - alle Workitems aus GET …/workitems, null bei defekter Quelle, undefined solange geladen wird
 * @param max - Höchstzahl der Einträge (Standard ENTWICKLUNGSSTAND_MAX)
 * @returns { eintraege: [{ art: 'finding' | 'feature', id, titel, status, prioritaet }], gesamt: Anzahl vor dem Kürzen, findingsVerfuegbar: false, wenn die Workitems fehlen oder defekt sind }
 */
export function waehleEntwicklungsstand(meilenstein, workitems, max = ENTWICKLUNGSSTAND_MAX) {
  const findings = Array.isArray(workitems)
    ? workitems
        .filter((w) => w !== null && typeof w === 'object' && w.quelle === 'finding' && w.status === 'OFFEN' && Object.hasOwn(ENTWICKLUNG_RANG, w.prioritaet))
        .map((w, index) => ({ w, index }))
        .sort((a, b) => ENTWICKLUNG_RANG[a.w.prioritaet] - ENTWICKLUNG_RANG[b.w.prioritaet] || a.index - b.index)
        .map(({ w }) => ({ art: 'finding', id: w.id, titel: w.titel, status: w.status, prioritaet: w.prioritaet }))
    : []
  const features = (Array.isArray(meilenstein?.features) ? meilenstein.features : [])
    .filter((f) => f !== null && typeof f === 'object' && !ERLEDIGT_STATUS.has(f.status))
    .map((f) => ({ art: 'feature', id: f.id, titel: f.titel, status: f.status, prioritaet: null }))
  const alle = [...findings, ...features]
  return { eintraege: alle.slice(0, max), gesamt: alle.length, findingsVerfuegbar: Array.isArray(workitems) }
}
