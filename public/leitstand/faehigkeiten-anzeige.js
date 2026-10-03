/**
 * Datei: public/leitstand/faehigkeiten-anzeige.js
 *
 * Zweck: Reine Anzeigeregeln der Werkstatt `#/capabilities` (F44 WS-7a, Vorlage V10 d_faehigkeiten und
 * d_harness_phasen, Abgleich F-725 J5/J6): Kennzahlen des Katalogs (im Katalog, freigegeben,
 * Freigabe offen), Suche und Filter über die Einträge von GET /api/ressourcen und die Tastaturregel
 * der Register (role=tablist: Pfeiltasten, Pos1, Ende). Ohne DOM und ohne eigenen Netzabruf, damit
 * node:test die Regeln direkt prüft (faehigkeiten-anzeige.test.mjs).
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/capabilities.js (naechsterRegisterIndex, WERKZEUG_TYPEN)
 * - public/leitstand/views/capability-library.js (istAktiv, zaehleLibrary, filtereWerkzeuge, ortImHarness — Capability
 *   Library, F46 D6)
 * - public/leitstand/rollen-kreis.js (naechsterRegisterIndex — Rollen-Register der Übersicht; F46 D1)
 * - public/leitstand/faehigkeiten-anzeige.test.mjs (node:test)
 *
 * Wichtig:
 * - Import-sicher: keine Importe, kein Zugriff auf DOM oder Netz.
 * - Einträge bleiben roh (IDs, Namen, Beschreibungen); escapen ist Sache der View.
 * - freigabe kennt laut Schema nur 'FREIGEGEBEN' und 'OFFEN' (src/ressourcen/types.ts Freigabe).
 */

/** Typen des Katalogs in Anzeigereihenfolge (Enum typ in schemas/ressourcen.schema.json). */
export const WERKZEUG_TYPEN = Object.freeze(['worker', 'skill', 'agent', 'extern'])

/** Werte des Freigabe-Filters: '' = alle, sonst der Zustand. */
export const FREIGABE_FILTER = Object.freeze(['', 'freigegeben', 'offen'])

/**
 * Liste der Einträge, defensiv: alles außer einem Array ergibt [] und Nicht-Objekte fallen weg.
 * @param eintraege - ansicht.eintraege aus GET /api/ressourcen
 * @returns Liste der Objekt-Einträge
 */
function alsListe(eintraege) {
  return Array.isArray(eintraege) ? eintraege.filter((e) => e !== null && typeof e === 'object') : []
}

/**
 * Zählt den Katalog für die Kennzahlzeile.
 * @param eintraege - ansicht.eintraege
 * @returns { katalog, freigegeben, offen } — offen zählt nur freigabe 'OFFEN'
 */
export function zaehleWerkzeuge(eintraege) {
  const liste = alsListe(eintraege)
  return {
    katalog: liste.length,
    freigegeben: liste.filter((e) => e.freigabe === 'FREIGEGEBEN').length,
    offen: liste.filter((e) => e.freigabe === 'OFFEN').length,
  }
}

/** Werte des Aktiv-Filters der Capability Library (F46 D6): '' = alle. */
export const AKTIV_FILTER = Object.freeze(['', 'aktiv', 'nicht_aktiv'])

/**
 * „Aktiv“ in der Capability Library (F46 D6, Bild 01-Library): freigegeben UND verfügbar. Das heißt
 * einsatzbereit, nicht „gerade im Lauf genutzt“ — was ein Lauf nutzt, steht in der Ausführung.
 * @param eintrag - ein Katalogeintrag
 * @returns true, wenn aktiv
 */
export function istAktiv(eintrag) {
  return eintrag?.freigabe === 'FREIGEGEBEN' && eintrag?.verfuegbar === true
}

/**
 * Zählt den Katalog für die Kennzahlen und Filter-Chips der Capability Library (F46 D6).
 * @param eintraege - ansicht.eintraege
 * @returns { katalog, aktiv, nichtAktiv, offen, jeTyp: { worker, skill, agent, extern } }
 */
export function zaehleLibrary(eintraege) {
  const liste = alsListe(eintraege)
  const aktiv = liste.filter(istAktiv).length
  const jeTyp = Object.fromEntries(WERKZEUG_TYPEN.map((typ) => [typ, liste.filter((e) => e.typ === typ).length]))
  return { katalog: liste.length, aktiv, nichtAktiv: liste.length - aktiv, offen: liste.filter((e) => e.freigabe === 'OFFEN').length, jeTyp }
}

/**
 * Ort einer Fähigkeit im Harness (Spalte „Ort im Harness“, F46 D6) — nur aus herkunft, nichts geraten:
 * Skill und Agent mit ihrem repo-relativen Pfad, ein Worker aus der Startvorlage, sonst null.
 * @param eintrag - ein Katalogeintrag
 * @returns { art: 'pfad', pfad } | { art: 'startvorlage' } | null
 */
export function ortImHarness(eintrag) {
  const herkunft = eintrag?.herkunft
  if (herkunft === null || typeof herkunft !== 'object') return null
  if ((herkunft.art === 'skill' || herkunft.art === 'agent') && typeof herkunft.pfad === 'string' && herkunft.pfad !== '') return { art: 'pfad', pfad: herkunft.pfad }
  if (herkunft.art === 'startvorlage') return { art: 'startvorlage' }
  return null
}

/**
 * Trifft der Suchtext auf id, name oder beschreibung (ohne Groß-/Kleinschreibung)?
 * @param eintrag - ein Katalogeintrag
 * @param suche - bereits kleingeschriebener, getrimmter Suchtext
 * @returns true, wenn eines der drei Felder den Text enthält
 */
function trifftSuche(eintrag, suche) {
  return [eintrag.id, eintrag.name, eintrag.beschreibung].some((feld) => typeof feld === 'string' && feld.toLowerCase().includes(suche))
}

/**
 * Filtert die Einträge nach Suche, Typ und Freigabe; die Reihenfolge des Servers bleibt.
 * @param eintraege - ansicht.eintraege
 * @param filter - { suche: Freitext, typ: '' oder ein Typ, freigabe: '' | 'freigegeben' | 'offen',
 *   aktiv: '' | 'aktiv' | 'nicht_aktiv' (F46 D6, istAktiv) }
 * @returns die passenden Einträge
 */
export function filtereWerkzeuge(eintraege, filter = {}) {
  const suche = typeof filter.suche === 'string' ? filter.suche.trim().toLowerCase() : ''
  const typ = typeof filter.typ === 'string' ? filter.typ : ''
  const freigabe = typeof filter.freigabe === 'string' ? filter.freigabe : ''
  const aktiv = typeof filter.aktiv === 'string' ? filter.aktiv : ''
  return alsListe(eintraege).filter((eintrag) => {
    if (typ !== '' && eintrag.typ !== typ) return false
    if (freigabe === 'freigegeben' && eintrag.freigabe !== 'FREIGEGEBEN') return false
    if (freigabe === 'offen' && eintrag.freigabe !== 'OFFEN') return false
    if (aktiv === 'aktiv' && !istAktiv(eintrag)) return false
    if (aktiv === 'nicht_aktiv' && istAktiv(eintrag)) return false
    return suche === '' || trifftSuche(eintrag, suche)
  })
}

/**
 * Tastaturregel eines Registers (WAI-ARIA Tabs, automatische Aktivierung): Pfeil rechts/links
 * springen zum nächsten bzw. vorigen Reiter und laufen am Rand um, Pos1 und Ende springen an den
 * Anfang bzw. das Ende.
 * @param index - Index des aktuellen Reiters
 * @param anzahl - Zahl der Reiter
 * @param taste - KeyboardEvent.key
 * @returns neuer Index, oder null für eine andere Taste (dann bleibt das Ereignis unberührt)
 */
export function naechsterRegisterIndex(index, anzahl, taste) {
  if (!Number.isInteger(anzahl) || anzahl < 1) return null
  if (taste === 'ArrowRight') return (index + 1) % anzahl
  if (taste === 'ArrowLeft') return (index - 1 + anzahl) % anzahl
  if (taste === 'Home') return 0
  if (taste === 'End') return anzahl - 1
  return null
}
