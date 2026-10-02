/**
 * Datei: public/leitstand/produktplanung-kopf.js
 *
 * Zweck: Gemeinsamer Kopf der Produktplanung (F46 D1, Designs 03-roadmap und
 * 09-entscheidungen--Projektakte): Rücklink „← Produktübersicht“ und das Register Überblick
 * (→ #/dashboard) · Roadmap (→ #/roadmap) · Projektakte (→ #/projektakte) als Navigation mit
 * aria-current — eine Stelle, damit #/roadmap und #/projektakte nicht auseinanderlaufen.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/roadmap.js
 * - public/leitstand/views/projektakte.js
 *
 * Wichtig: Import-sicher, kein DOM. Die Reiter sind Links (Navigation zwischen Routen), kein
 * role=tablist — es gibt keine Panels auf derselben Seite.
 */

import { tHtml } from './i18n.js'

/** Die Reiter der Produktplanung: Schlüssel und Ziel. */
const REITER = Object.freeze([
  ['ueberblick', '#/dashboard'],
  ['roadmap', '#/roadmap'],
  ['projektakte', '#/projektakte'],
])

/**
 * Rücklink zur Produktübersicht.
 * @returns HTML
 */
export function zurueckZurUebersicht() {
  return `<a class="back" href="#/dashboard"><span aria-hidden="true">←</span> ${tHtml('roadmap.zurueck')}</a>`
}

/**
 * Das Register der Produktplanung.
 * @param aktiv - 'roadmap' | 'projektakte' (der Überblick trägt dieses Register nicht selbst)
 * @returns HTML
 */
export function planungsRegister(aktiv) {
  const links = REITER.map(([schluessel, ziel]) => {
    const istAktiv = schluessel === aktiv
    return `<a href="${ziel}"${istAktiv ? ' class="active" aria-current="page"' : ''}>${tHtml(`roadmap.register.${schluessel}`)}</a>`
  }).join('')
  return `<nav class="tabs planung-register" aria-label="${tHtml('roadmap.register')}">${links}</nav>`
}
