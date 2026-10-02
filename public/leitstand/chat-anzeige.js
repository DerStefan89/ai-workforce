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
 * - public/leitstand/views/chat.js (istGrossansicht, leiteNaechstenSchrittAb, fuegeEntwurfEin)
 * - public/leitstand/views/projekt.js (entwurfFuerCoach, F44 WS-8b)
 * - public/leitstand/chat-anzeige.test.mjs (node:test)
 *
 * Wichtig:
 * - '#/chat' und '#/start' werden nie als Rückkehrziel gemerkt — sonst führte „Gespräch
 *   verkleinern“ in sich selbst bzw. auf die Startfläche.
 * - Auswahl und Reihenfolge von „Nächster Schritt“ (Freigabe, Rückfrage, seit F46 D2 offene Abnahme, Lauf) hängen an baueEntscheidungen
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
 * F44 WS-8b (QA 14, Punkt 3): Unterseiten, die als Rückkehrziel auf ihre Liste abgebildet werden.
 * Die Anlege-Unterseite ist nach dem Anlegen verbraucht — „Gespräch verkleinern“ nach dem
 * Coach-Interview (wechsleZuSparringProjekt) soll in die Produktübersicht führen, nicht zurück in ein
 * leeres Anlegeformular.
 */
const RUECKKEHR_ABBILDUNG = new Map([['#/projekte-uebersicht/neu', '#/projekte-uebersicht']])

/**
 * Nächster gemerkter Rückkehr-Hash nach einem Routenwechsel.
 * @param bisher - bislang gemerkter Hash oder null
 * @param hash - neuer location.hash
 * @returns der neue Hash, wenn er eine echte Seite ist (eine Anlege-Unterseite als ihre Liste,
 *   RUECKKEHR_ABBILDUNG); sonst unverändert der bisherige
 */
export function merkeRoute(bisher, hash) {
  if (typeof hash !== 'string' || !hash.startsWith('#/') || NICHT_MERKEN.has(hash)) return bisher
  return RUECKKEHR_ABBILDUNG.get(hash) ?? hash
}

/**
 * F44 WS-8b: Entwurf für den Coach aus Titel und gewünschtem Ergebnis (getrimmt, durch eine
 * Leerzeile getrennt); leer, wenn beides leer ist.
 * @param titel - Wert des Titelfelds
 * @param ergebnis - Wert des Ergebnisfelds
 * @returns Entwurfstext oder ''
 */
export function entwurfFuerCoach(titel, ergebnis) {
  return [titel, ergebnis]
    .map((wert) => (typeof wert === 'string' ? wert.trim() : ''))
    .filter((wert) => wert !== '')
    .join('\n\n')
}

/**
 * F44 WS-8b (Prüfpass qa S1, cr 1): legt einen Entwurf in die Chat-Eingabe, ohne Getipptes zu
 * verlieren — leere Eingabe: der Entwurf; sonst der bisherige Text, eine Leerzeile, der Entwurf
 * (steht er schon darin, bleibt alles, wie es ist). Ein leerer Entwurf ändert nichts.
 * @param bisher - aktueller Wert der Eingabe
 * @param entwurf - neuer Entwurf
 * @returns neuer Wert der Eingabe
 */
export function fuegeEntwurfEin(bisher, entwurf) {
  const alt = typeof bisher === 'string' ? bisher : ''
  const neu = typeof entwurf === 'string' ? entwurf.trim() : ''
  if (neu === '' || alt.includes(neu)) return alt
  return alt.trim() === '' ? neu : `${alt.replace(/\s+$/, '')}\n\n${neu}`
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
 * erste Rückfrage, sonst die erste offene Abnahme (F46 D2), sonst der erste unbestätigte
 * fehlgeschlagene Lauf (Reihenfolge wie „Deine Entscheidungen“). Startprobleme haben keine
 * Detailroute und zählen hier nicht.
 * @param zustand - Aggregat aus GET …/zustand (zustand.js), oder null vor dem ersten Tick
 * @returns { art: 'laedt' } | { art: 'defekt' } | { art: 'leer' } | { art: 'eintrag', eintragArt, titel, hash }
 */
export function leiteNaechstenSchrittAb(zustand) {
  if (zustand === null || zustand === undefined) return { art: 'laedt' }
  const { gruppen } = baueEntscheidungen(zustand, [])
  for (const liste of [gruppen.workflows, gruppen.abnahmen, gruppen.laeufe]) {
    if (!Array.isArray(liste)) continue
    const eintrag = liste.find((e) => typeof e.hash === 'string')
    if (eintrag !== undefined) return { art: 'eintrag', eintragArt: eintrag.art, titel: eintrag.titel, hash: eintrag.hash }
  }
  if (gruppen.workflows === null || gruppen.abnahmen === null || gruppen.laeufe === null) return { art: 'defekt' }
  return { art: 'leer' }
}
