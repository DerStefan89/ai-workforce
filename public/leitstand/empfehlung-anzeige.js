/**
 * Datei: public/leitstand/empfehlung-anzeige.js
 *
 * Zweck: F36 WS-3 (features/F36/feature.md AK7) — Anzeige der Katalog-Empfehlung am ZWINGEND-Start
 * der Ausführung: „Wird genutzt“ und „Passt, nicht im Lauf“ je mit Grund, „+n weitere“, die Zählzeile
 * der in V1 nicht freigebbaren Einträge und Hinweise (z. B. „keine Router-Klassifikation“). Quelle
 * ist das additive Feld `empfehlung` von GET /api/workflows/<id>. empfehlungIdsFuerFreigabe liefert
 * die angezeigten wirdGenutzt-ids, die mit der Freigabe mitgehen („Anzeige = Start“, E-F36-4).
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/workflows.js (Bedienblock, haltFreigabe)
 * - public/leitstand/views/workboard.js (Workflow-Vorschlag)
 * - public/leitstand/empfehlung-anzeige.test.mjs
 *
 * Wichtig: Nur die ANGEZEIGTEN wirdGenutzt-Einträge gehen in den Lauf — was über die Obergrenze
 * hinausgeht, wird ausdrücklich als „in diesem Lauf nicht genutzt“ beschriftet. Die ids kommen aus
 * derselben Serverantwort, die gerendert wurde; eine zweite Quelle bräche „Anzeige = Start“.
 */

import { escapeHtml } from './render.js'

/**
 * Eine Liste mit Grund je Eintrag, „keine“ bei leerer Liste, Zusatzzeile bei gekürzter Liste (F-788).
 * @param titel - Überschrift der Liste
 * @param eintraege - [{ id, name, grund }]
 * @param weitereText - Zusatzzeile für nicht angezeigte Einträge, oder null
 * @returns HTML
 */
function renderListe(titel, eintraege, weitereText) {
  const zeilen = eintraege.map((e) => `<li><code>${escapeHtml(e.id)}</code> ${escapeHtml(e.name)} — ${escapeHtml(e.grund)}</li>`)
  if (weitereText !== null) zeilen.push(`<li class="hinweis">${escapeHtml(weitereText)}</li>`)
  const inhalt = zeilen.length === 0 ? '<p class="leer">keine</p>' : `<ul>${zeilen.join('')}</ul>`
  return `<p><strong>${escapeHtml(titel)}</strong></p>${inhalt}`
}

/**
 * Rendert den Empfehlungsblock; leerer String, wenn der Server keine Empfehlung liefert (kein
 * ZWINGEND-Start einer Ausführung mit Katalog-Fähigkeiten).
 * @param empfehlung - detail.empfehlung aus GET /api/workflows/<id>, oder null/undefined
 * @returns HTML-Block oder ''
 */
export function renderEmpfehlung(empfehlung) {
  if (empfehlung === null || empfehlung === undefined) return ''
  if (typeof empfehlung.fehler === 'string') {
    return `<div class="unterabschnitt"><h3>Katalog-Empfehlung</h3><p class="fehler">Nicht ermittelbar: ${escapeHtml(empfehlung.fehler)} — der Lauf startet ohne Katalog-Fähigkeiten.</p></div>`
  }
  const hinweise = (empfehlung.hinweise ?? []).map((h) => `<p class="hinweis">${escapeHtml(h)}</p>`).join('')
  const genutztWeitere = empfehlung.weitereAnzahl.wirdGenutzt
  const passtWeitere = empfehlung.weitereAnzahl.passtNichtImLauf
  const nichtFreigebbar = empfehlung.nichtFreigebbarAnzahl > 0 ? `<p class="hinweis">${empfehlung.nichtFreigebbarAnzahl} passende Einträge in V1 nicht freigebbar</p>` : ''
  return `<div class="unterabschnitt">
    <h3>Katalog-Empfehlung</h3>
    ${hinweise}
    ${renderListe('Wird genutzt', empfehlung.wirdGenutzt, genutztWeitere > 0 ? `+${genutztWeitere} weitere passend, in diesem Lauf nicht genutzt` : null)}
    ${renderListe('Passt, nicht im Lauf', empfehlung.passtNichtImLauf, passtWeitere > 0 ? `+${passtWeitere} weitere` : null)}
    ${nichtFreigebbar}
  </div>`
}

/**
 * Die angezeigten wirdGenutzt-ids für den Freigabe-Body — undefined, wenn nichts (fehlerfrei)
 * angezeigt wurde: dann schickt die Oberfläche kein Feld und der Lauf bekommt keine
 * Katalog-Fähigkeiten.
 * @param empfehlung - detail.empfehlung, oder null/undefined
 * @returns string[] oder undefined
 */
export function empfehlungIdsFuerFreigabe(empfehlung) {
  if (empfehlung === null || empfehlung === undefined || typeof empfehlung.fehler === 'string') return undefined
  return empfehlung.wirdGenutzt.map((e) => e.id)
}
