/**
 * Datei: public/leitstand/typ-chip.js
 *
 * Zweck: Baustein Typ-Chips (F46 D1, docs/design/abgleich-f46.md §1 „Gemeinsame Bausteine“) —
 * ein kleines Etikett, das die Ebene eines Eintrags nennt: Meilenstein, Feature, Workstream,
 * Fixpaket, Design, Bug. Farbe kommt ausschließlich aus den Tokens --ebene-* (D0); der Text steht
 * immer daneben, die Farbe trägt nie allein die Bedeutung. Für Workitem-Typen ohne eigene Ebene
 * (Harness Improvement, Tech Debt, Prozess) gibt es eine neutrale Form in Textfarbe.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/dashboard.js (Arbeitsstand-Karten)
 * - public/leitstand/views/roadmap.js (Baum, Detailpanel, Legende, Entwicklungsstand)
 * - public/leitstand/typ-chip.test.mjs (node:test)
 *
 * Wichtig: Import-sicher, kein DOM. Die Beschriftung kommt aus dem Wörterbuch (Schlüssel typ.<Typ>).
 */

import { t } from './i18n.js'
import { escapeHtml } from './render.js'

/** Die sechs Ebenen mit eigener Farbe (--ebene-<ebene>). */
export const EBENEN = Object.freeze(['meilenstein', 'feature', 'workstream', 'fixpaket', 'design', 'bug'])

/** Neutrale Typen (Workitems ohne Ebenenfarbe). */
export const NEUTRALE_TYPEN = Object.freeze(['harness', 'techdebt', 'prozess'])

/** Workitem-Typ (src/workboard/types.ts) → Chip-Typ. */
const TYP_JE_WORKITEM = Object.freeze({ FEATURE: 'feature', BUG: 'bug', HARNESS_IMPROVEMENT: 'harness', TECH_DEBT: 'techdebt', PROCESS_IMPROVEMENT: 'prozess' })

/**
 * Chip-Typ eines Workitems.
 * @param workitemTyp - workitem.typ
 * @returns Chip-Typ oder null für einen unbekannten Typ
 */
export function chipTypVonWorkitem(workitemTyp) {
  return typeof workitemTyp === 'string' && Object.hasOwn(TYP_JE_WORKITEM, workitemTyp) ? TYP_JE_WORKITEM[workitemTyp] : null
}

/**
 * Baut einen Typ-Chip.
 * @param typ - eine der EBENEN oder NEUTRALE_TYPEN; ein unbekannter Typ ergibt einen leeren String
 * @param optionen - { zusatz: Text hinter dem Typ, z. B. die Priorität ('Bug · P2'), escaped }
 * @returns HTML
 */
export function typChip(typ, optionen = {}) {
  const ebene = EBENEN.includes(typ)
  if (!ebene && !NEUTRALE_TYPEN.includes(typ)) return ''
  const zusatz = typeof optionen.zusatz === 'string' && optionen.zusatz !== '' ? ` · ${escapeHtml(optionen.zusatz)}` : ''
  const klasse = ebene ? `typ-chip typ-chip-${typ}` : 'typ-chip typ-chip-neutral'
  return `<span class="${klasse}"><span class="typ-chip-punkt" aria-hidden="true"></span>${escapeHtml(t(`typ.${typ}`))}${zusatz}</span>`
}
