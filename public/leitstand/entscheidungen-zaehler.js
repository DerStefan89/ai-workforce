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
 * - F45 B2b-3b-2b-2a-2 (Advisor V4): dazu die offenen Rückfragen des Rückfrage-Kanals (rueckfrage-kanal.js, aus dessen Abruf je Takt —
 *   kein zweiter Abruf hier); wer im Chat oder auf der Workflow-Seite ist, sieht so eine wartende Rückfrage.
 */

import { zaehleOffeneEntscheidungen } from './attention-daten.js'
import { formatiereZahl, t } from './i18n.js'
import { escapeHtml } from './render.js'
import { abonniereKanal, kanalStand } from './rueckfrage-kanal.js'
import { abonniere } from './zustand.js'

/**
 * Anzeige des Zählers aus dem Poll-Aggregat. Reine Funktion.
 * @param zustand - Aggregat aus GET …/zustand oder null
 * @param kanalOffen - F45 B2b-3b-2b-2a-2: Zahl offener Kanal-Rückfragen (0 ohne Kanal bzw. solange unbekannt)
 * @returns null (verborgen) oder { anzahl, html } — html ist die escapte Ziffer plus Screenreader-Text
 */
export function zaehlerAnzeige(zustand, kanalOffen = 0) {
  const poll = zaehleOffeneEntscheidungen(zustand)
  const kanal = Number.isInteger(kanalOffen) && kanalOffen > 0 ? kanalOffen : 0
  // Korrekturrunde (qa 2): bekannte Kanal-Rückfragen bleiben sichtbar, auch wenn eine Poll-Quelle fehlt — eine Untergrenze, keine Entwarnung.
  const anzahl = poll === null ? (kanal > 0 ? kanal : null) : poll + kanal
  if (anzahl === null || anzahl === 0) return null
  const zahl = formatiereZahl(anzahl)
  return { anzahl, html: `<span aria-hidden="true">${escapeHtml(zahl)}</span><span class="sr-only">, ${escapeHtml(t('nav.entscheidungen.offen', { anzahl, zahl }))}</span>` }
}

/** Hängt den Zähler an den Poll (einmalig beim Bootstrap). */
export function initEntscheidungenZaehler() {
  const element = document.getElementById('nav-entscheidungen-zaehler')
  if (element === null) return
  let letzteAnzahl
  let letzterZustand = null
  const aktualisiere = () => {
    const kanal = kanalStand()
    // Nachpass (code-reviewer 3, qa 5): bei defektem Kanal-Abruf die letzte bekannte Zahl als Untergrenze.
    const kanalOffen = !kanal.an ? 0 : Array.isArray(kanal.offene) ? kanal.offene.length : kanal.offene === null ? (kanal.bekannteOffene ?? 0) : 0
    const anzeige = zaehlerAnzeige(letzterZustand, kanalOffen)
    const anzahl = anzeige === null ? null : anzeige.anzahl
    if (anzahl === letzteAnzahl) return
    letzteAnzahl = anzahl
    element.hidden = anzeige === null
    element.innerHTML = anzeige === null ? '' : anzeige.html
  }
  abonniere((zustand) => {
    letzterZustand = zustand
    aktualisiere()
  })
  abonniereKanal(aktualisiere)
}
