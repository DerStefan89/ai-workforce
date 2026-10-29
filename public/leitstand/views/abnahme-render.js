/**
 * Datei: public/leitstand/views/abnahme-render.js
 *
 * Zweck: Karte „Darstellung (Render-Nachweis)“ der Abnahme (F45 B3b-2a-2, features/F45/plan-b3b2a2.md; F-1256 Anzeige):
 * Ergebnis des Render-Nachweises des letzten Ausführungslaufs aus GET …/abnahme `renderNachweis` (Projektion in
 * scripts/leitstand/abnahme-pruefung.mjs) — Badge, Dauer, Ausgabe-Ende aufklappbar und der Ort von Bildern und Protokoll.
 * Der Render-Nachweis entscheidet nichts: bei ROT/ZEITGRENZE/FEHLER ein amber Hinweis, die Abnahme bleibt möglich.
 * Dazu der Wertetext des Prüfergebnisses (pruefWertText, aus workflow-abnahme.js ausgelagert — Ratsche, kein Importzyklus).
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/workflow-abnahme.js (Lagen „entscheidbar“ und „vorab“; re-exportiert pruefWertText und
 *   renderNachweisKennung für views/workflows.js)
 * - public/leitstand/views/abnahme-render.test.mjs (node:test)
 *
 * Wichtig: Rein, kein DOM, nur i18n.js und render.js. Das Ausgabe-Ende ist Serverausgabe — roh und escaped (kann Pfade des
 * Arbeitsordners tragen); der Kartentext selbst nennt keine Lauf-ID und keinen Pfad außer dem festen Ordnernamen.
 */

import { formatiereZahl, t, tHtml } from '../i18n.js'
import { escapeHtml } from '../render.js'

/** Die vier Werte des Prüfergebnis-Schemas v0 (src/pruefschritt/types.ts) — übersetzt; ein unbekannter erscheint roh. */
const PRUEF_WERTE = new Set(['GRUEN', 'ROT', 'ZEITGRENZE', 'FEHLER'])

/** Ordner der Bilder und des Protokolls im Arbeitsordner (Skelett vorlagen/projekt-skelett, B3b-2a-1). */
const ORDNER = '.render-nachweis/'

/**
 * @param wert - PruefergebnisWert (src/pruefschritt/types.ts)
 * @returns übersetzter Text (GRUEN → „GRÜN“), unbekannt roh
 */
export function pruefWertText(wert) {
  return PRUEF_WERTE.has(wert) ? t(`abnahme.pruefung.wert.${wert}`) : String(wert ?? '')
}

/**
 * Kennung des Render-Nachweises für das Abnahme-Kennzeichen (views/workflows.js): ein vorübergehender Ladefehler ('fehlt',
 * danach 'ok') oder ein neuer Nachweis zeichnet die Abnahme neu.
 * @param projektion - abnahme.renderNachweis oder undefined (älterer Server)
 * @returns Kennung
 */
export function renderNachweisKennung(projektion) {
  if (projektion?.status !== 'ok') return projektion?.status ?? '-'
  return `ok:${projektion.ergebnis}:${projektion.gestartet_am}:${projektion.dauer_ms}`
}

/**
 * Die Karte „Darstellung (Render-Nachweis)“. Bei 'fehlt' (kein Render nötig oder nicht gelaufen) keine Karte.
 * @param projektion - abnahme.renderNachweis
 * @param optionen - { ebene, vorab }: Überschrift h2 (Seite „entscheidbar“) bzw. h4 (Block „vorab“). Im Block „vorab“ steht
 *   die Karte flach wie ihre Nachbarn (design-guardian 1), und „Abnehmen“ ist dort gesperrt — der Hinweis sagt nur, dass
 *   die Darstellung nicht der Grund für den Halt ist (qa N2)
 * @returns HTML oder ''
 */
export function renderRenderNachweis(projektion, { ebene = 2, vorab = false } = {}) {
  if (projektion?.status !== 'ok') return ''
  const gruen = projektion.ergebnis === 'GRUEN'
  const fehler = projektion.ergebnis === 'FEHLER'
  // Badge in der Farbe seiner Notiz (Advisor H1, Präzedenz design-guardian 1): Befunde sind amber, nicht rot.
  const badge = `<span class="ablauf-status ${gruen ? 'ok' : 'warten'}">${escapeHtml(pruefWertText(projektion.ergebnis))}</span>`
  const sekunden = formatiereZahl(projektion.dauer_ms / 1000, { maximumFractionDigits: 1 })
  // Literale Schlüssel, damit das i18n-Gate sie sieht (code-reviewer 1).
  const hinweisText = vorab ? tHtml('abnahme.render.hinweisVorab') : tHtml('abnahme.render.hinweis')
  const hinweis = gruen ? '' : `<div class="note amber abnahme-render-hinweis" role="note"><p>${hinweisText}</p></div>`
  // FEHLER heißt meist „nicht ausgeführt“ — dann gibt es keine Bilder, also keinen Ortssatz (qa N1).
  const ort = fehler
    ? ''
    : `<p class="subtle">${tHtml('abnahme.render.ort', {}, { ordner: `<code>${ORDNER}</code>` })}</p>`
  const klasse = vorab ? 'abnahme-render' : 'entscheiden-karte abnahme-render abnahme-render-karte'
  const text = String(projektion.ausgabe_ende ?? '')
  const ausgabe =
    text.trim() === ''
      ? `<p class="subtle">${tHtml('abnahme.render.ausgabeLeer')}</p>`
      : `<pre class="abnahme-render-ausgabe">${escapeHtml(text)}</pre>`
  // Bei FEHLER steht der Grund im Ausgabe-Ende — aufgeklappt (Advisor H6, F-1267).
  const offen = fehler ? ' open' : ''
  return `<section class="${klasse}" aria-labelledby="abnahme-render-titel">
    <h${ebene} id="abnahme-render-titel">${tHtml('abnahme.render.titel')}</h${ebene}>
    <p class="abnahme-render-zeile">${badge} · ${tHtml('abnahme.render.dauer', { sekunden })}</p>
    ${hinweis}
    <details class="abnahme-details"${offen}><summary>${tHtml('abnahme.render.ausgabe')}</summary>${ausgabe}</details>
    ${ort}
  </section>`
}
