/**
 * Datei: public/leitstand/projekt-cli-hinweis.js
 *
 * Zweck: Anzeige der abweichenden Claude-Code-Version eines Projekts (F45 B2b-3b-2b-2b-2b-2, F-1136 (10) = B: Warnung, keine Sperre).
 * Seit B2b-3b-2b-2b-2b-1 liefert GET /api/zustand je Projektinstanz `projektCliHinweis` ({ art: 'cliVersionGeaendert', installiert,
 * deklariert, anleitung } oder null; in der Workforce-Instanz null, dort gilt `cliHinweis`). Dieses Modul baut daraus die Zeile im Band
 * (start-hinweis.js) und die Zeile auf Freigabe- und Abnahmeseite (views/workflow-entscheiden.js, views/workflow-abnahme.js).
 *
 * Wird aufgerufen von: public/leitstand/start-hinweis.js, views/workflow-entscheiden.js, views/workflow-abnahme.js; geprüft von
 * public/leitstand/start-hinweis.test.mjs (Band), views/workflow-entscheiden.test.mjs und views/workflow-abnahme.test.mjs (Zeile).
 *
 * Wichtig:
 * - Rein: kein DOM, kein fetch, kein Import von zustand.js/api.js — die Views bleiben in Node importierbar.
 * - Nur Anzeige: kein zusätzlicher Klick, keine Sperre; die Versionen und die Anleitung kommen roh vom Server und gehen nur escaped
 *   (bzw. im Band über textContent) in die Seite.
 * - Der Hinweis beschreibt den heutigen Stand (installiert gegen Projekt-Startvorlage), nicht die Version, mit der ein früherer Lauf lief
 *   (code-reviewer V1, qa 3) — die Zeile der Abnahme sagt deshalb „derzeit“, die der Freigabe „der Lauf startet trotzdem“.
 */

import { t, tHtml } from './i18n.js'

/**
 * Ob ein CLI-Hinweis (cliHinweis oder projektCliHinweis) die bekannte Form hat — eine Regel für beide.
 * @param hinweis - Hinweis aus GET /api/zustand oder null/undefined
 * @returns true bei art 'cliVersionGeaendert' mit drei Texten
 */
export function istCliHinweis(hinweis) {
  return hinweis?.art === 'cliVersionGeaendert' && typeof hinweis.installiert === 'string' && typeof hinweis.deklariert === 'string' && typeof hinweis.anleitung === 'string'
}

/**
 * Text der Band-Zeile in der aktuellen Sprache.
 * @param hinweis - zustand.projektCliHinweis oder null/undefined
 * @returns Anzeigetext, oder '' ohne (bekannten) Hinweis
 */
export function projektCliHinweisText(hinweis) {
  if (!istCliHinweis(hinweis)) return ''
  return t('start.hinweis.projektCli', { installiert: hinweis.installiert, deklariert: hinweis.deklariert, anleitung: hinweis.anleitung })
}

/** Literale Schlüssel der Seitenzeile je Seite (i18n-Gate). */
const ZEILE_SCHLUESSEL = Object.freeze({ freigabe: 'entscheiden.projektCli.freigabe', abnahme: 'entscheiden.projektCli.abnahme' })

/**
 * Zeile auf Freigabe- bzw. Abnahmeseite als amber Notiz: Versionen, „Ergebnis gilt“, Verweis auf die Anleitung.
 * @param hinweis - zustand.projektCliHinweis oder null/undefined
 * @param seite - 'freigabe' (vor dem Start) | 'abnahme' (nach dem Lauf, heutiger Stand)
 * @returns HTML, oder '' ohne (bekannten) Hinweis
 */
export function renderProjektCliZeile(hinweis, seite) {
  if (!istCliHinweis(hinweis)) return ''
  const werte = { installiert: hinweis.installiert, deklariert: hinweis.deklariert, anleitung: hinweis.anleitung }
  return `<p class="note amber entscheiden-cli-hinweis">${tHtml(seite === 'abnahme' ? ZEILE_SCHLUESSEL.abnahme : ZEILE_SCHLUESSEL.freigabe, werte)}</p>`
}
