/**
 * Datei: public/leitstand/entwicklung-reiter.js
 *
 * Zweck: Die Reiterzeile der Entwicklung (F46 D4, docs/design/abgleich-f46.md §2; Bilder
 * 06-entwicklung-code--Main und --TechDebt): Kanban-Board · Features · Bugs · Harness Improvements ·
 * Tech Debt & Prozess · Aufträge · Code. Eine Quelle für #/workboard (views/workboard.js) und #/code
 * (views/code.js), damit beide dieselbe Zeile zeigen.
 *
 * - Board und die Listen-Register sind Knöpfe mit data-tab (aria-pressed); auf #/workboard schalten sie
 *   das Register, auf #/code öffnen sie #/workboard mit diesem Register (oeffneEntwicklungsRegister).
 * - „Tech Debt & Prozess“ ist das Register mit dem Schlüssel 'weitere' (LISTEN_TABS), nur die Anzeige
 *   ist neu.
 * - „Aufträge“ führt auf #/runs (Register Aufträge · Ausführungen, F-964), „Code“ auf #/code. Der
 *   frühere Reiter „Ausführungen“ entfällt; #/ausfuehrungen bleibt über #/runs und die Seitenleiste
 *   erreichbar.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/workboard.js (renderKopf), public/leitstand/views/code.js
 *
 * Wichtig: Import-sicher (kein DOM). Texte über i18n (tHtml escapt).
 */

import { LISTEN_TABS } from './entwicklung-daten.js'
import { tHtml } from './i18n.js'

/** Register der Seite #/workboard in Anzeige-Reihenfolge: das Board und die Listen-Tabs. */
export const ENTWICKLUNG_REGISTER = Object.freeze(['board', ...Object.keys(LISTEN_TABS)])

/**
 * HTML der Reiterzeile.
 * @param aktiv - aktives Register ('board', ein Listen-Tab oder 'code')
 * @returns HTML (Inhalt von nav.tabs)
 */
export function entwicklungsReiterHtml(aktiv) {
  const knoepfe = ENTWICKLUNG_REGISTER.map((tab) => {
    const an = tab === aktiv
    return `<button type="button" class="tab-knopf${an ? ' active' : ''}" data-tab="${tab}" aria-pressed="${an}">${tHtml(`entwicklung.tab.${tab}`)}</button>`
  }).join('')
  const code = aktiv === 'code' ? `<a href="#/code" class="active" aria-current="page">${tHtml('entwicklung.tab.code')}</a>` : `<a href="#/code">${tHtml('entwicklung.tab.code')}</a>`
  return `${knoepfe}<a href="#/runs">${tHtml('entwicklung.tab.auftraege')}</a>${code}`
}
