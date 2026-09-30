/**
 * Datei: public/leitstand/kommt.js
 *
 * Zweck: Baustein „kommt“ (F44 WS-1b, Entscheidung E-F44-1 = B, Abgleich F-725 §4 Punkt 4).
 * Zukunftsfunktionen (Status Z der Abgleichstabelle) bleiben sichtbar, sind aber deaktiviert
 * und tragen das Badge „kommt“. Deaktiviert heißt aria-disabled="true" statt disabled: Der
 * Knopf bleibt per Tastatur fokussierbar, damit „kommt“ auch ohne Maus erreichbar und für
 * Screenreader lesbar ist (das Badge steht im Knopf und gehört zu seinem Namen). Ein Klick,
 * Enter oder Leertaste lösen nichts aus — auch kein Absenden eines umgebenden Formulars.
 * Keine Beispieldaten: Der Baustein kennt nur Beschriftungen.
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initKommt beim Bootstrap, einmalig)
 * - public/leitstand/views/platzhalter.js (kommtKnopf — Brain, Produktzyklus)
 * - public/leitstand/kommt.test.mjs (node:test)
 *
 * Wichtig:
 * - Import-sicher: kein Zugriff auf DOM beim Import; erst initKommt() hängt die Sperre an.
 * - Die Sperre wirkt dokumentweit in der Einfangphase auf jedes Element mit
 *   [aria-disabled="true"] — nicht nur auf Knöpfe dieses Bausteins. Heute trägt kein anderes
 *   Element dieses Attribut; ein künftiges bekommt dieselbe Wirkung (gewollt, eine Regel).
 */

import { escapeHtml } from './render.js'
import { t } from './i18n.js'

/** Tasten, die einen Knopf auslösen würden. */
const AUSLOESE_TASTEN = new Set(['Enter', ' '])

/**
 * Baut das Badge „kommt“.
 * @returns HTML
 */
export function kommtBadge() {
  return `<span class="kommt-badge">${escapeHtml(t('kommt.badge'))}</span>`
}

/**
 * Baut einen deaktivierten Knopf mit Badge „kommt“ (E-F44-1).
 * @param text - sichtbare Beschriftung (bereits übersetzt)
 * @param optionen - { primaer: true } für die Primärform der Vorlage (.button.primary)
 * @returns HTML
 */
export function kommtKnopf(text, optionen = {}) {
  const klasse = optionen.primaer === true ? 'button primary kommt-knopf' : 'button kommt-knopf'
  return `<button type="button" class="${klasse}" aria-disabled="true">${escapeHtml(text)} ${kommtBadge()}</button>`
}

/**
 * Hält Klick und Tastenauslösung an [aria-disabled="true"] an, bevor ein anderer Handler sie
 * sieht. Einmalig beim Bootstrap.
 */
export function initKommt() {
  const gesperrt = (ziel) => ziel instanceof Element && ziel.closest('[aria-disabled="true"]') !== null
  document.addEventListener(
    'click',
    (ereignis) => {
      if (!gesperrt(ereignis.target)) return
      ereignis.preventDefault()
      ereignis.stopImmediatePropagation()
    },
    true
  )
  document.addEventListener(
    'keydown',
    (ereignis) => {
      if (!AUSLOESE_TASTEN.has(ereignis.key) || !gesperrt(ereignis.target)) return
      ereignis.preventDefault()
      ereignis.stopImmediatePropagation()
    },
    true
  )
}
