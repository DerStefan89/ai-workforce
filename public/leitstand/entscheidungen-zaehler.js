/**
 * Datei: public/leitstand/entscheidungen-zaehler.js
 *
 * Zweck: Zahl offener Entscheidungen am Navigationspunkt „Entscheidungen“ (F46 D2,
 * docs/design/abgleich-f46.md §1, Bild 09-Main). Quelle ist allein der vorhandene Poll
 * (zustand.js) über attention-daten.js zaehleOffeneEntscheidungen: Freigaben, Rückfragen, offene
 * Abnahmen, unbestätigte Lauf-Fehler und Startprobleme. Befunde P0/P1 zählen nicht mit — sie
 * stammen aus einem eigenen Abruf, nicht aus dem Poll (kein zweiter Poll); die Liste zeigt sie.
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initEntscheidungenZaehler beim Bootstrap, vor initZustandPoll)
 * - public/leitstand/index.html (#nav-entscheidungen-zaehler im Link „Entscheidungen“)
 * - public/leitstand/entscheidungen-zaehler.test.mjs (node:test, zaehlerAnzeige)
 *
 * Wichtig:
 * - KEIN aria-live (die Persona-Statuszeile bleibt die einzige Live-Region): die Zahl gehört zum
 *   Namen des Links (sichtbare Ziffer aria-hidden, dazu ein Text nur für Screenreader) und wird beim
 *   nächsten Fokus gelesen.
 * - 0, vor dem ersten Tick oder bei defekter Quelle: verborgen — keine Zahl, die Entwarnung
 *   vortäuscht (die Seite selbst zeigt den Defekt).
 * - Geschrieben wird nur bei geänderter Zahl. Import-sicher: kein DOM beim Import.
 */

import { zaehleOffeneEntscheidungen } from './attention-daten.js'
import { formatiereZahl, t } from './i18n.js'
import { escapeHtml } from './render.js'
import { abonniere } from './zustand.js'

/**
 * Anzeige des Zählers aus dem Poll-Aggregat. Reine Funktion.
 * @param zustand - Aggregat aus GET …/zustand oder null
 * @returns null (verborgen) oder { anzahl, html } — html ist die escapte Ziffer plus Screenreader-Text
 */
export function zaehlerAnzeige(zustand) {
  const anzahl = zaehleOffeneEntscheidungen(zustand)
  if (anzahl === null || anzahl === 0) return null
  const zahl = formatiereZahl(anzahl)
  return { anzahl, html: `<span aria-hidden="true">${escapeHtml(zahl)}</span><span class="sr-only">, ${escapeHtml(t('nav.entscheidungen.offen', { anzahl, zahl }))}</span>` }
}

/** Hängt den Zähler an den Poll (einmalig beim Bootstrap). */
export function initEntscheidungenZaehler() {
  const element = document.getElementById('nav-entscheidungen-zaehler')
  if (element === null) return
  let letzteAnzahl
  abonniere((zustand) => {
    const anzeige = zaehlerAnzeige(zustand)
    const anzahl = anzeige === null ? null : anzeige.anzahl
    if (anzahl === letzteAnzahl) return
    letzteAnzahl = anzahl
    element.hidden = anzeige === null
    element.innerHTML = anzeige === null ? '' : anzeige.html
  })
}
