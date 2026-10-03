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
 * - public/leitstand/views/roadmap.js (kommtKnopf, kommtBadge — Eintrag erfassen, Tage/Wochen, Zeitachse, Plan gegen
 *   Ist, Schätzung, Anpassen, Priorität; F46 D1)
 * - public/leitstand/views/dashboard.js (kommtKnopf, kommtBadge — Kopf, Ziel, Bekommt/Liefert, Zeitleiste, Danach,
 *   Was steckt dahinter; F46 D1)
 * - public/leitstand/views/projektakte.js (kommtKnopf, kommtBadge — Änderung vorschlagen, Versionsziel; F46 D1)
 * - public/leitstand/views/workboard.js (kommtKnopf, kommtBadge — Entwicklung: Eintrag erfassen, Kanban · Priorität, Zeitleiste; F44 WS-3a;
 *   im Detail die Triage-Knöpfe eines Bugs neben „Jetzt beheben lassen“; F46 D3)
 * - public/leitstand/views/workboard-detail.js (kommtKnopf, kommtBadge — Detail: Status-Block, Planung/Einordnung,
 *   Workstreams, Code & Doku Review, Verlauf, Fehlerbild, Behebung; F46 D3)
 * - public/leitstand/eintrag-bausteine.js (kommtBadge — fehlende Werte in Kurz gesagt und Status-Block; F46 D3)
 * - public/leitstand/views/harness-aufbau.js (kommtKnopf, kommtBadge — Änderung vorschlagen, Genutzt von, Vorlage; F46 D6)
 * - public/leitstand/views/capability-library.js (kommtBadge — Genutzt von im Detail; F46 D6)
 * - public/leitstand/views/projekte-uebersicht.js (kommtKnopf — „Produkt bearbeiten“ in der Technik-Klappe; F44 WS-6a)
 * - public/leitstand/kommt.test.mjs (node:test)
 *
 * Wichtig:
 * - Import-sicher: kein Zugriff auf DOM beim Import; erst initKommt() hängt die Sperre an.
 * - Die Sperre wirkt dokumentweit in der Einfangphase auf jedes Element mit
 *   [aria-disabled="true"] — nicht nur auf Knöpfe dieses Bausteins. Außer ihnen tragen es heute
 *   in der Übersicht die Workstream-Zeitleiste und „Danach“ (views/dashboard.js,
 *   .uebersicht-weg-kommt und .uebersicht-zuletzt-danach, F46 D1; beide ohne Links — ein Link darin
 *   wäre gesperrt) sowie in der Entwicklung die Darstellungen „Kanban · Priorität“ und „Zeitleiste“
 *   (views/workboard.js, .view-switch-knopf) sowie auf „Neues Produkt“ das Feld #projekte-anlegen-ziel
 *   (readonly) und der Knopf „Zielgruppe ergänzen“ (statisch in index.html, F44 WS-6a) sowie „Fähigkeit entdecken“ im Kopf
 *   der Werkstatt (#werkstatt-entdecken, statisch in index.html, F44 WS-7b) sowie die Kopf-Werkzeuge
 *   Terminal und GitHub und — ohne bekannten Projektordner — VS Code (statisch in index.html, Kopf und
 *   mobiles Menü, kopf-werkzeuge.js; F44 WS-8b); jedes künftige bekommt dieselbe Wirkung (gewollt,
 *   eine Regel).
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
 * @param optionen - { primaer: true } für die Primärform der Vorlage (.button.primary);
 *   { symbol: '+' } setzt ein dekoratives Zeichen vor den Text (aria-hidden, gehört nicht zum
 *   Namen; F-897, „+ Eintrag erfassen“ der Vorlage)
 * @returns HTML
 */
export function kommtKnopf(text, optionen = {}) {
  const klasse = optionen.primaer === true ? 'button primary kommt-knopf' : 'button kommt-knopf'
  const symbol = typeof optionen.symbol === 'string' && optionen.symbol !== '' ? `<span class="kommt-symbol" aria-hidden="true">${escapeHtml(optionen.symbol)}</span>` : ''
  return `<button type="button" class="${klasse}" aria-disabled="true">${symbol}${escapeHtml(text)} ${kommtBadge()}</button>`
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
