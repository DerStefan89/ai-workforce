/**
 * Datei: public/leitstand/rollen-anzeige.js
 *
 * Zweck: Lesbare, übersetzte Rollennamen (F44 WS-3b, F-914) und die gemeinsame Spalte von
 * „Wer macht was“ (Zuvor/Jetzt/Danach) für die Übersicht (B11) und das Detail der Seite
 * „Entwicklung“ (E8). rollenName(rolle) übersetzt die real vorhandenen Rollen über den Schlüssel
 * rolle.<id> (ROLLEN, Zwilling von ROLLENVERTRAEGE in src/rollen/index.ts — rollen-anzeige.test.mjs
 * prüft die Gleichheit), eine andere Rolle bleibt die ID selbst. workerName(worker) macht dasselbe
 * für die Worker (worker.<id>, Zwilling von WORKER in src/workflow/index.ts).
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/dashboard.js (B11 „Wer macht was“, Aktuelle Rolle)
 * - public/leitstand/views/workboard.js, views/workboard-detail.js (Detail, Click-to-Work-Kette)
 * - public/leitstand/views/workflow-detail.js (Timeline: Rolle und Worker lesbar, F44 WS-4b)
 * - public/leitstand/views/capabilities.js (rollenName — Liste „Rollen & Besetzung“ der Werkstatt, F44 WS-7a)
 * - public/leitstand/rollen-anzeige.test.mjs (node:test)
 *
 * Wichtig:
 * - Import-sicher: kein Zugriff auf DOM oder Storage beim Import.
 * - Eine unbekannte Rolle (Projektinhalt) erscheint unübersetzt; rollenName liefert Text, kein
 *   HTML — der Aufrufer escapt.
 */

import { t, tHtml } from './i18n.js'
import { escapeHtml } from './render.js'

/** Die Rollen mit Wörterbuchschlüssel `rolle.<id>` — dieselben IDs wie ROLLENVERTRAEGE (src/rollen/index.ts). */
export const ROLLEN = Object.freeze(['architecture-advisor', 'architekt', 'ausfuehrung', 'code-reviewer', 'jarvis', 'product-coach', 'qa', 'router', 'scout'])

/**
 * Lesbarer Name einer Rolle.
 * @param rolle - Rollen-ID aus einem Workflow-Schritt (schritt.rolle)
 * @returns übersetzter Name, für eine unbekannte Rolle die ID selbst (leer für null/undefined); Text, kein HTML
 */
export function rollenName(rolle) {
  if (typeof rolle !== 'string') return ''
  return ROLLEN.includes(rolle) ? t(`rolle.${rolle}`) : rolle
}

/** Die Worker mit Wörterbuchschlüssel `worker.<id>` — dieselben IDs wie WORKER (src/workflow/index.ts). */
export const WORKER = Object.freeze(['claude-code', 'codex'])

/**
 * Lesbarer Name eines Workers (F44 WS-4b): claude-code → „Claude Code“, codex → „Codex“.
 * @param worker - Worker-ID aus einem Workflow-Schritt (schritt.worker)
 * @returns übersetzter Name, für einen unbekannten Worker die ID selbst (leer für null/undefined); Text, kein HTML
 */
export function workerName(worker) {
  if (typeof worker !== 'string') return ''
  return WORKER.includes(worker) ? t(`worker.${worker}`) : worker
}

/**
 * Eine Spalte von „Wer macht was“: Überschrift, Rolle (bzw. ein Titel wie „Deine Freigabe“) und
 * Schrittzeile; ohne Schritt „–“ mit „Kein Schritt“.
 * @param eyebrow - übersetzte Spaltenüberschrift (Text)
 * @param schritt - Workflow-Schritt { rolle, schritt_id } oder null
 * @param optionen - { titelHtml: Titel statt der Rolle (fertiges HTML), zusatz: HTML unter der Schrittzeile, klasse: Klasse der Spalte }
 * @returns HTML
 */
export function werSpalte(eyebrow, schritt, optionen = {}) {
  const { titelHtml = '', zusatz = '', klasse = '' } = optionen
  const rolle = schritt === null ? '' : escapeHtml(rollenName(schritt.rolle))
  const inhalt =
    schritt === null
      ? `<strong>–</strong><p>${tHtml('uebersicht.wer.keinSchritt')}</p>`
      : `<strong>${titelHtml || rolle}</strong><p>${titelHtml ? `${rolle} · ` : ''}${tHtml('uebersicht.rolle.schritt')} <code>${escapeHtml(schritt.schritt_id)}</code></p>`
  return `<div${klasse ? ` class="${klasse}"` : ''}><span class="eyebrow">${escapeHtml(eyebrow)}</span>${inhalt}${zusatz}</div>`
}
