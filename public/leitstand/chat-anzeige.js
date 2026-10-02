/**
 * Datei: public/leitstand/chat-anzeige.js
 *
 * Zweck: Reine Regeln für das Chat-Dock und die große Gesprächsansicht `#/chat` (F44 WS-8a,
 * Abgleich F-725 L1): welche Route sich die Shell als „letzte Seite“ merkt, wohin „Gespräch
 * verkleinern“ führt, und was die Kontextspalte als „Nächster Schritt“ zeigt. Ohne DOM, ohne
 * Storage und ohne eigenen Netzabruf, damit node:test sie direkt prüfen kann.
 *
 * „Nächster Schritt“ rechnet auf demselben, ohnehin gepollten Zustands-Aggregat wie der Vorfilter
 * „Was braucht mich?“ (jarvis-vorfilter.js) und mit derselben Auswahlregel wie „Deine
 * Entscheidungen“ (baueEntscheidungen, attention-daten.js) — nur ohne die offenen Workitems, für
 * die der Vorfilter einen eigenen Abruf bräuchte (keine neue Abfrage, Bauauftrag WS-8a).
 *
 * Wird aufgerufen von:
 * - public/leitstand/shell.js (istGrossansicht, merkeRoute, zielBeimVerkleinern)
 * - public/leitstand/views/chat.js (istGrossansicht, leiteNaechstenSchrittAb)
 * - public/leitstand/chat-anzeige.test.mjs (node:test)
 *
 * Wichtig:
 * - '#/chat' und '#/start' werden nie als Rückkehrziel gemerkt — sonst führte „Gespräch
 *   verkleinern“ in sich selbst bzw. auf die Startfläche.
 * - Auswahl und Reihenfolge von „Nächster Schritt“ hängen an baueEntscheidungen
 *   (attention-daten.js); ändert sich dort die Reihenfolge der Gruppen, ändert sie sich hier mit.
 *   Ohne Workitems ist ein leeres Ergebnis nur „keine Freigabe, Rückfrage oder fehlgeschlagene
 *   Ausführung“, nicht „nichts wartet“ — der Text in der View sagt genau das.
 */

import { baueEntscheidungen } from './attention-daten.js'

/** Ziel von „Gespräch verkleinern“ ohne gemerkte Route: die Produktübersicht. */
export const STANDARD_RUECKKEHR = '#/dashboard'

/**
 * @param hash - location.hash
 * @returns true auf der großen Gesprächsansicht '#/chat'
 */
export function istGrossansicht(hash) {
  return hash === '#/chat'
}

/** Routen, die sich die Shell nicht als Rückkehrziel merkt: die große Ansicht selbst und die Startfläche. */
const NICHT_MERKEN = new Set(['#/chat', '#/start'])

/**
 * Nächster gemerkter Rückkehr-Hash nach einem Routenwechsel.
 * @param bisher - bislang gemerkter Hash oder null
 * @param hash - neuer location.hash
 * @returns der neue Hash, wenn er eine echte Seite ist; sonst unverändert der bisherige
 */
export function merkeRoute(bisher, hash) {
  if (typeof hash !== 'string' || !hash.startsWith('#/') || NICHT_MERKEN.has(hash)) return bisher
  return hash
}

/**
 * Ziel von „Gespräch verkleinern“.
 * @param gemerkt - gemerkter Hash oder null
 * @returns der gemerkte Hash, sonst die Produktübersicht
 */
export function zielBeimVerkleinern(gemerkt) {
  return typeof gemerkt === 'string' && gemerkt !== '' ? gemerkt : STANDARD_RUECKKEHR
}

/**
 * „Nächster Schritt“ der Kontextspalte aus dem gepollten Zustand: die erste Freigabe, sonst die
 * erste Rückfrage, sonst der erste unbestätigte fehlgeschlagene Lauf (Reihenfolge wie „Deine
 * Entscheidungen“). Startprobleme haben keine Detailroute und zählen hier nicht.
 * @param zustand - Aggregat aus GET …/zustand (zustand.js), oder null vor dem ersten Tick
 * @returns { art: 'laedt' } | { art: 'defekt' } | { art: 'leer' } | { art: 'eintrag', eintragArt, titel, hash }
 */
export function leiteNaechstenSchrittAb(zustand) {
  if (zustand === null || zustand === undefined) return { art: 'laedt' }
  const { gruppen } = baueEntscheidungen(zustand, [])
  for (const liste of [gruppen.workflows, gruppen.laeufe]) {
    if (!Array.isArray(liste)) continue
    const eintrag = liste.find((e) => typeof e.hash === 'string')
    if (eintrag !== undefined) return { art: 'eintrag', eintragArt: eintrag.art, titel: eintrag.titel, hash: eintrag.hash }
  }
  if (gruppen.workflows === null || gruppen.laeufe === null) return { art: 'defekt' }
  return { art: 'leer' }
}
