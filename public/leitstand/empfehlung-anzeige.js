/**
 * Datei: public/leitstand/empfehlung-anzeige.js
 *
 * Zweck: F36 WS-3 (features/F36/feature.md AK7) — Anzeige der Katalog-Empfehlung am ZWINGEND-Start
 * der Ausführung: „Wird genutzt“ und „Passt, nicht im Lauf“ je mit Grund, „+n weitere“, die Zählzeile
 * der in V1 nicht freigebbaren Einträge und Hinweise (z. B. „keine Router-Klassifikation“). Quelle
 * ist das additive Feld `empfehlung` von GET /api/workflows/<id>. empfehlungIdsFuerFreigabe liefert
 * die angezeigten wirdGenutzt-ids, die mit der Freigabe mitgehen („Anzeige = Start“, E-F36-4).
 * Seit F36 WS-5a: die ids sind die empfehlungIds '<id>@<hash der installation>' (F-808); der Block zeigt
 * die Projekt-URL (vorschau_url, E-F36-7) und je installierbarem Eintrag (MCP, seit F36 WS-5b auch externer Skill) in „Passt, nicht im Lauf“ den Knopf
 * „Freigeben & installieren“ samt Platz für den Bestätigungsblock (Ablauf: empfehlung-installation.js).
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
 * F36 WS-5a: Zustand des Installationsablaufs je Katalog-id (Bestätigungsblock, Fortschritt, Fehler) und
 * die letzte Erfolgsmeldung — hier gehalten, weil die Ansichten den Block bei jedem Poll neu rendern
 * können (Workboard); renderEmpfehlung setzt ihn dabei wieder ein. Gesetzt von empfehlung-installation.js.
 */
const installationsAnzeige = new Map()
/** Letzte Erfolgsmeldung samt id — nur in Blöcken gezeigt, in denen diese id in einer der beiden Listen steht. */
let installationsMeldung = { id: null, html: '' }

/**
 * @param id - Katalog-id
 * @param html - bereits escaptes HTML des Ablaufs; '' entfernt den Eintrag
 */
export function setzeInstallationsAnzeige(id, html) {
  if (html === '') installationsAnzeige.delete(id)
  else installationsAnzeige.set(id, html)
}

/**
 * @param id - Katalog-id, zu der die Meldung gehört (null = keine)
 * @param html - bereits escapte Meldung oben im Block ('' = keine)
 */
export function setzeInstallationsMeldung(id, html) {
  installationsMeldung = { id, html }
}

/**
 * Eine Liste mit Grund je Eintrag, „keine“ bei leerer Liste, Zusatzzeile bei gekürzter Liste (F-788).
 * @param titel - Überschrift der Liste
 * @param eintraege - [{ id, name, grund }]
 * @param weitereText - Zusatzzeile für nicht angezeigte Einträge, oder null
 * @returns HTML
 */
function renderListe(titel, eintraege, weitereText) {
  const zeilen = eintraege.map((e) => `<li><code>${escapeHtml(e.id)}</code> ${escapeHtml(e.name)} — ${escapeHtml(e.grund)}${e.installierbar === true ? renderInstallierenKnopf(e.id) : ''}</li>`)
  if (weitereText !== null) zeilen.push(`<li class="hinweis">${escapeHtml(weitereText)}</li>`)
  const inhalt = zeilen.length === 0 ? '<p class="leer">keine</p>' : `<ul>${zeilen.join('')}</ul>`
  return `<p><strong>${escapeHtml(titel)}</strong></p>${inhalt}`
}

/**
 * F36 WS-5a: Knopf „Freigeben & installieren“ plus leerer Platz für den Bestätigungsblock desselben Eintrags.
 * @param id - Katalog-id
 * @returns HTML
 */
function renderInstallierenKnopf(id) {
  const kennung = escapeHtml(id)
  return ` <button type="button" class="btn empfehlung-installieren" data-installation-aktion="vorbereiten" data-ressource-id="${kennung}">Freigeben &amp; installieren</button><div class="empfehlung-installation" data-installation-fuer="${kennung}">${installationsAnzeige.get(id) ?? ''}</div>`
}

/**
 * F36 WS-5a (E-F36-7): Zeile mit der Projekt-URL — nur, wenn der Server das Feld liefert.
 * @param empfehlung - detail.empfehlung
 * @returns HTML oder ''
 */
function renderProjektUrl(empfehlung) {
  if (empfehlung.projektUrl === undefined) return ''
  return empfehlung.projektUrl === null
    ? '<p class="hinweis">Projekt-URL: nicht gesetzt (vorschau_url im Projektregister) — Katalog-MCPs mit Origin-Sperre kommen nicht in den Lauf</p>'
    : `<p class="hinweis">Projekt-URL: <code>${escapeHtml(empfehlung.projektUrl)}</code></p>`
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
    ${[...empfehlung.wirdGenutzt, ...empfehlung.passtNichtImLauf].some((e) => e.id === installationsMeldung.id) ? installationsMeldung.html : ''}
    ${renderProjektUrl(empfehlung)}
    ${hinweise}
    ${renderListe('Wird genutzt', empfehlung.wirdGenutzt, genutztWeitere > 0 ? `+${genutztWeitere} weitere passend, in diesem Lauf nicht genutzt` : null)}
    ${renderListe('Passt, nicht im Lauf', empfehlung.passtNichtImLauf, passtWeitere > 0 ? `+${passtWeitere} weitere` : null)}
    ${nichtFreigebbar}
  </div>`
}

/**
 * Die angezeigten wirdGenutzt-Kennungen (empfehlungId, F-808) für den Freigabe-Body — undefined, wenn nichts (fehlerfrei)
 * angezeigt wurde: dann schickt die Oberfläche kein Feld und der Lauf bekommt keine
 * Katalog-Fähigkeiten.
 * @param empfehlung - detail.empfehlung, oder null/undefined
 * @returns string[] oder undefined
 */
export function empfehlungIdsFuerFreigabe(empfehlung) {
  if (empfehlung === null || empfehlung === undefined || typeof empfehlung.fehler === 'string') return undefined
  // Ohne empfehlungId (älterer Server) geht die nackte id mit — der Start lehnt sie dann ab (fail-closed).
  return empfehlung.wirdGenutzt.map((e) => e.empfehlungId ?? e.id)
}
