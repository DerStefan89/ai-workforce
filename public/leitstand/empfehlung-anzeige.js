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
 * Seit F-826: renderInstallierbarHinweis liefert den Hinweis neben „Freigeben“, solange ein
 * installierbarer Eintrag in „Passt, nicht im Lauf“ steht (Text, kein Blocker).
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/workflows.js (Freigabedialog im haltFreigabe, F44 WS-4a)
 * - public/leitstand/views/workboard.js (Workflow-Vorschlag)
 * - public/leitstand/empfehlung-installation.js (Zustand des Installationsablaufs)
 * - public/leitstand/empfehlung-anzeige.test.mjs
 *
 * F44 WS-4a (F4/F5, Vorlage V10): Texte über i18n (Schlüssel empfehlung.*; Server- und
 * Katalogwerte bleiben roh), die beiden Listen als Ankreuzliste mit disabled-Checkboxen („Wird
 * genutzt“ angekreuzt) — rein anzeigend, an „Anzeige = Start“ ändert sich nichts; der Knopf
 * „Freigeben & installieren“ im Stil .button.
 *
 * Wichtig: Nur die ANGEZEIGTEN wirdGenutzt-Einträge gehen in den Lauf — was über die Obergrenze
 * hinausgeht, wird ausdrücklich als „in diesem Lauf nicht genutzt“ beschriftet. Die ids kommen aus
 * derselben Serverantwort, die gerendert wurde; eine zweite Quelle bräche „Anzeige = Start“.
 */

// F44 WS-4b (F-940): txHtml ist als tHtml nach i18n.js gezogen (ein zentraler, vom i18n-Gate geprüfter Aufruf).
import { t, tHtml } from './i18n.js'
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
 * @param angekreuzt - true für „Wird genutzt“ (F4: disabled-Checkbox angekreuzt, rein anzeigend)
 * @returns HTML
 */
function renderListe(titel, eintraege, weitereText, angekreuzt = false) {
  const zeilen = eintraege.map(
    (e) =>
      `<li><label class="check"><input type="checkbox" disabled${angekreuzt ? ' checked' : ''} /><span><code>${escapeHtml(e.id)}</code> ${escapeHtml(e.name)} — ${escapeHtml(e.grund)}</span></label>${e.installierbar === true ? renderInstallierenKnopf(e.id) : ''}</li>`
  )
  if (weitereText !== null) zeilen.push(`<li class="hinweis">${escapeHtml(weitereText)}</li>`)
  const inhalt = zeilen.length === 0 ? `<p class="leer">${escapeHtml(t('empfehlung.keine'))}</p>` : `<ul class="empfehlung-liste">${zeilen.join('')}</ul>`
  return `<p><strong>${escapeHtml(titel)}</strong></p>${inhalt}`
}

/**
 * F36 WS-5a: Knopf „Freigeben & installieren“ plus leerer Platz für den Bestätigungsblock desselben Eintrags.
 * @param id - Katalog-id
 * @returns HTML
 */
function renderInstallierenKnopf(id) {
  const kennung = escapeHtml(id)
  return ` <button type="button" class="button empfehlung-installieren" data-installation-aktion="vorbereiten" data-ressource-id="${kennung}">${escapeHtml(t('empfehlung.installieren'))}</button><div class="empfehlung-installation" data-installation-fuer="${kennung}">${installationsAnzeige.get(id) ?? ''}</div>`
}

/**
 * F36 WS-5a (E-F36-7): Zeile mit der Projekt-URL — nur, wenn der Server das Feld liefert.
 * @param empfehlung - detail.empfehlung
 * @returns HTML oder ''
 */
function renderProjektUrl(empfehlung) {
  if (empfehlung.projektUrl === undefined) return ''
  // F-849: gesperrte vorschau_url (Leitstand-Port) mit ihrem Grund statt „nicht gesetzt“.
  if (empfehlung.projektUrl === null && typeof empfehlung.projektUrlGrund === 'string') {
    return `<p class="hinweis">${escapeHtml(t('empfehlung.projektUrl.gesperrt', { grund: empfehlung.projektUrlGrund }))}</p>`
  }
  return empfehlung.projektUrl === null
    ? `<p class="hinweis">${escapeHtml(t('empfehlung.projektUrl.fehlt'))}</p>`
    : `<p class="hinweis">${escapeHtml(t('empfehlung.projektUrl'))} <code>${escapeHtml(empfehlung.projektUrl)}</code></p>`
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
    return `<div class="unterabschnitt"><h3>${escapeHtml(t('empfehlung.titel'))}</h3><p class="fehler">${escapeHtml(t('empfehlung.nichtErmittelbar', { fehler: empfehlung.fehler }))}</p></div>`
  }
  const hinweise = (empfehlung.hinweise ?? []).map((h) => `<p class="hinweis">${escapeHtml(h)}</p>`).join('')
  const genutztWeitere = empfehlung.weitereAnzahl.wirdGenutzt
  const passtWeitere = empfehlung.weitereAnzahl.passtNichtImLauf
  const nichtFreigebbar = empfehlung.nichtFreigebbarAnzahl > 0 ? `<p class="hinweis">${escapeHtml(t('empfehlung.nichtFreigebbar', { anzahl: String(empfehlung.nichtFreigebbarAnzahl) }))}</p>` : ''
  return `<div class="unterabschnitt">
    <h3>${escapeHtml(t('empfehlung.titel'))}</h3>
    ${[...empfehlung.wirdGenutzt, ...empfehlung.passtNichtImLauf].some((e) => e.id === installationsMeldung.id) ? installationsMeldung.html : ''}
    ${renderProjektUrl(empfehlung)}
    ${hinweise}
    ${renderListe(t('empfehlung.wirdGenutzt'), empfehlung.wirdGenutzt, genutztWeitere > 0 ? t('empfehlung.weitereGenutzt', { anzahl: String(genutztWeitere) }) : null, true)}
    ${renderListe(t('empfehlung.passtNicht'), empfehlung.passtNichtImLauf, passtWeitere > 0 ? t('empfehlung.weitere', { anzahl: String(passtWeitere) }) : null)}
    ${nichtFreigebbar}
  </div>`
}

/** F-826: Wortlaut von PROJEKT_URL_FEHLT (src/ressourcen/index.ts) — der Browser kann das TS-Modul nicht importieren. */
const PROJEKT_URL_FEHLT_TEXT = 'Projekt-URL (vorschau_url) fehlt'
/** F-849: gemeinsamer Teil von VORSCHAU_LEITSTAND_PORT und VORSCHAU_LEITSTAND_PORT_UNBEKANNT (src/projekte/index.ts). */
const VORSCHAU_NICHT_ZULAESSIG_TEXT = 'nicht als Projekt-Origin zulässig'

/**
 * F-826: Hinweis neben „Freigeben“, sobald ein installierbarer Eintrag in „Passt, nicht im Lauf“
 * steht — kein Blocker, Freigeben bleibt klickbar. Leerer String sonst.
 * @param empfehlung - detail.empfehlung, oder null/undefined
 * @returns HTML oder ''
 */
export function renderInstallierbarHinweis(empfehlung) {
  if (empfehlung === null || empfehlung === undefined || typeof empfehlung.fehler === 'string') return ''
  // Ein Eintrag, dem die Projekt-URL fehlt (PROJEKT_URL_FEHLT, src/ressourcen/index.ts) oder dessen
  // vorschau_url gesperrt ist (Leitstand-Port, F-849), käme auch nach der Installation nicht in den
  // Lauf — der Hinweis würde dort mehr versprechen, als die Installation hält.
  const ohneProjektUrl = (grund) => grund.includes(PROJEKT_URL_FEHLT_TEXT) || grund.includes(VORSCHAU_NICHT_ZULAESSIG_TEXT)
  const ids = empfehlung.passtNichtImLauf
    .filter((e) => e.installierbar === true && !ohneProjektUrl(String(e.grund ?? '')))
    .map((e) => `<code>${escapeHtml(e.id)}</code>`)
  if (ids.length === 0) return ''
  return `<p class="hinweis empfehlung-installierbar-hinweis">${tHtml('empfehlung.hinweisInstallierbar', { anzahl: ids.length }, { ids: ids.join(', ') })}</p>`
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
