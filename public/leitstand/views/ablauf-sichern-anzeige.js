/**
 * Datei: public/leitstand/views/ablauf-sichern-anzeige.js
 *
 * Zweck: Abschnitt „Bereit zum Sichern“ eines Ablaufs (F45 B2b-4a-2b-2, features/F45/plan-b2b4a2b2.md §2; F-979, F-1087, F-1157
 * (5)(6)) — in der Karte „Wo gearbeitet wird“ (Ablauf- und Abnahmeseite) und im Workboard „abgeschlossen“. Rein: kein fetch, kein DOM.
 *
 * - sichernFuerAblauf: eine Regel für beide Einbauorte — Quelle aus dem Feld arbeitsordner (code-daten.js sichernQuelle); Ablauf mit
 *   eigenem Arbeitsordner ⇒ Stand über den eingespeisten Abruf mit dem Neuladen-Schlüssel (sichernSchluessel, V1) und Abschnitt,
 *   sonst ein Satz (projekt: der Aufrufer zeigt den Projektordner-Weg).
 * - aufraeumenArt: woher „Aufräumen“ kommt — aus derselben Regel wie der Knopf unter den Aktionen (arbeitsordner-anzeige.js
 *   aufraeumenMoeglich, Bauauflage 3): 'aktionen' (Verweis auf diesen Knopf), 'nachAbnahme' (Abnahme offen) oder 'neutral'. Das
 *   Workboard nutzt 'link' (Seite des Ablaufs). Je Abschnitt steht genau ein Element [data-sichern-aufraeumen] (V3) — außer beim Laden,
 *   bei einem Fehler, beim Endzustand „aufgeräumt“ und während Vorbereitung/Aufräumen läuft (QA 5); der einzige Knopf „Arbeitsordner
 *   aufräumen“ der Seite bleibt unter den Aktionen. Grenze (QA 7): der Verweis hat kein Sprungziel.
 * - renderSichernAbschnitt: je Lage des Stands (ablauf-code-stand.js) — lädt; Fehler (Netz, 400/404/5xx, älterer Server); Lage einer
 *   409 ohne Fehlerfarbe (aufgeraeumt = Endzustand); 200 bereit mit den Schritten 1 commit-Block · 2 push-Block bzw. sichtbarer Grund
 *   („… noch nicht auf main“) · 3 Pull Request und Merge im Web (ohne origin eigener Text, QA 6), danach Aufräumen, mit der Grenze
 *   „bleibt nach Push/Merge stehen“ (F-1155, QA 3); 200 nicht bereit (GESTOPPT mit offenen Änderungen ⇒ Aufräumen/Verwerfen, nichts
 *   offen, Grundtext). node_modules-Hinweis nach derselben Regel wie #/code (nodeModulesAnzahl > 0).
 * - renderSichernSatz: ein Satz statt des Abschnitts, wenn die Quelle nicht der Arbeitsordner ist (projekt, keinBedarf, unbekannt).
 * - behandleSichernKlick: Klick auf „Kopieren“ bzw. „Aktualisieren“ im Abschnitt — eine Regel für Ablaufseite und Workboard.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/workflows.js (zeichneEntscheiden, behandleEntscheidenKlick), public/leitstand/views/workboard.js
 *   (renderTerminalBlock, Delegation #workboard-bearbeitung)
 * - public/leitstand/views/ablauf-sichern-anzeige.test.mjs (node:test), scripts/check-f45-b2b4a2b2-anzeige.mjs
 *
 * Wichtig: Befehle nur aus code-daten.js ablaufSicherBefehle (Ort und Branch aus ablauf.arbeitsordner, nie aus der workflowId); die
 * workflowId steht nur in data-Attributen und Links, nie im sichtbaren Text. Alle Texte über t()/tHtml(), Servertexte escaped.
 */

import { renderBefehlsblock } from '../befehlsblock.js'
import { ablaufSicherBefehle, nodeModulesAnzahl, sichernQuelle, sichernSchluessel } from '../code-daten.js'
import { formatiereZahl, t, tHtml } from '../i18n.js'
import { escapeHtml, formatiereUhrzeit } from '../render.js'
import { aufraeumenMoeglich } from './arbeitsordner-anzeige.js'

/** Die Gründe der Ableitung (scripts/leitstand/ablauf-sichern.mjs SICHERN_GRUENDE) — je einer ein Text arbeitsordner.sichernGrund.<k>. */
export const SICHERN_GRUND_SCHLUESSEL = Object.freeze(['nichtAbgeschlossen', 'keinArbeitsordner', 'nichtAngelegt', 'inVorbereitung', 'fehlgeschlagen', 'aufgeraeumt', 'ordnerFehlt', 'nichtBestimmbar', 'nichtsOffen'])

/** 409-Lagen ohne Aufräumen-Element: Endzustand bzw. Aufräumen/Vorbereitung läuft gerade (QA 5). */
const LAGEN_OHNE_AUFRAEUMEN = new Set(['aufgeraeumt', 'inVorbereitung'])

/**
 * Art des Aufräumen-Elements aus derselben Regel wie der Knopf unter den Aktionen (renderArbeitsordnerAktion).
 * @param eingabe - { workflowStatus, ao (Feld arbeitsordner), abnahmeOffen }
 * @returns 'aktionen' | 'nachAbnahme' | 'neutral'
 */
export function aufraeumenArt({ workflowStatus, ao, abnahmeOffen = false }) {
  if (aufraeumenMoeglich(workflowStatus, ao, abnahmeOffen)) return 'aktionen'
  return workflowStatus === 'ABGESCHLOSSEN' && abnahmeOffen ? 'nachAbnahme' : 'neutral'
}

/**
 * Das eine Aufräumen-Element des Abschnitts.
 * @param aufraeumen - { art: 'aktionen' | 'nachAbnahme' | 'neutral' | 'link' }
 * @param workflowId - Kennung (nur im Link)
 * @returns HTML
 */
function aufraeumenHtml(aufraeumen, workflowId) {
  const art = ['aktionen', 'nachAbnahme', 'link'].includes(aufraeumen?.art) ? aufraeumen.art : 'neutral'
  const inhalt =
    art === 'link'
      ? `<a class="text-link" href="#/workflows/${escapeHtml(encodeURIComponent(workflowId))}">${tHtml('arbeitsordner.sichernAbschnitt.aufraeumen.link')}</a>`
      : tHtml(`arbeitsordner.sichernAbschnitt.aufraeumen.${art}`, { knopf: t('arbeitsordner.aufraeumen.knopf') })
  return `<p class="subtle sichern-aufraeumen" data-sichern-aufraeumen="${art}">${inhalt}</p>`
}

/**
 * Text eines Grunds der Ableitung (unbekannter Schlüssel ⇒ nichtBestimmbar, nie ein roher Schlüssel).
 * @param schluessel - Grund
 * @returns Text
 */
function grundText(schluessel) {
  return t(`arbeitsordner.sichernGrund.${SICHERN_GRUND_SCHLUESSEL.includes(schluessel) ? schluessel : 'nichtBestimmbar'}`)
}

/**
 * Plural-Text mit Zahl.
 * @param schluessel - i18n-Schlüssel mit {zahl}
 * @param anzahl - Zahl
 * @returns HTML
 */
function mitZahl(schluessel, anzahl) {
  return tHtml(schluessel, { anzahl, zahl: formatiereZahl(anzahl) })
}

/**
 * Fuß: Zeitpunkt des Stands und „Aktualisieren“.
 * @param workflowId - Kennung
 * @param stand - Stand
 * @returns HTML
 */
function fussHtml(workflowId, stand) {
  const zeit = typeof stand.geladenAm === 'number' ? formatiereUhrzeit(new Date(stand.geladenAm).toISOString()) : null
  const zeitHtml = zeit ? `<span>${tHtml('code.standVon', { zeit })}</span>` : ''
  return `<p class="subtle sichern-fuss">${zeitHtml}<button type="button" class="button" data-sichern-aktualisieren data-workflow-id="${escapeHtml(workflowId)}">${tHtml('code.aktualisieren')}</button></p>`
}

/**
 * Ein Befehlsblock mit echten Werten.
 * @param zeilen - Zeilen in Blockform
 * @returns HTML
 */
function blockHtml(zeilen) {
  return renderBefehlsblock({ sprache: 'powershell', zeilen }, { echteWerte: true })
}

/**
 * Schritte 1–3 bei „bereit“.
 * @param daten - Antwort (200) mit ablauf.sichern.bereit
 * @param aufraeumen - Art des Aufräumen-Elements
 * @param workflowId - Kennung
 * @returns HTML
 */
function schritteHtml(daten, aufraeumen, workflowId) {
  const befehle = ablaufSicherBefehle(daten)
  const commit = befehle.bloecke?.find((b) => b.art === 'commit') ?? null
  const push = befehle.bloecke?.find((b) => b.art === 'push') ?? null
  let eins
  let zwei
  if (befehle.grund !== undefined) {
    // Branch/Ort passen nicht (F-1157 (2)(3)): kein Block, der Grund steht in Schritt 1, Schritt 2 verweist darauf.
    eins = `<p class="subtle">${tHtml(`code.sichern.grund.${befehle.grund}`)}</p>`
    zwei = `<p class="subtle">${tHtml('arbeitsordner.sichernAbschnitt.pushGesperrt')}</p>`
  } else {
    if (commit !== null) eins = blockHtml(commit.zeilen)
    else if (befehle.commitGrund !== null) eins = `<p class="subtle">${tHtml(`code.sichern.grund.${befehle.commitGrund}`)}</p>`
    else eins = `<p class="subtle">${tHtml('arbeitsordner.sichernAbschnitt.nichtsZuCommitten')}</p>`
    const voraus = befehle.voraus
    const zeile =
      typeof voraus === 'number' && voraus > 0
        ? mitZahl('arbeitsordner.sichernAbschnitt.voraus', voraus)
        : voraus === null
          ? tHtml('arbeitsordner.sichernAbschnitt.vorausUnbekannt')
          : commit !== null
            ? tHtml('arbeitsordner.sichernAbschnitt.pushNachCommit')
            : tHtml('arbeitsordner.sichernAbschnitt.keinPush')
    const hinweise = befehle.hinweise.filter((h) => h !== 'nodeModules').map((h) => `<p class="subtle">${tHtml(`code.sichern.hinweis.${h}`)}</p>`)
    zwei = `<p class="subtle">${zeile}</p>${push !== null ? blockHtml(push.zeilen) : ''}${hinweise.join('')}`
  }
  // QA 6: ohne Remote „origin“ gibt es keinen Pull Request im Web.
  const ohneOrigin = daten.remoteWebUrl?.status === 'ok' && daten.remoteWebUrl.origin === false
  const url = daten.remoteWebUrl?.status === 'ok' && typeof daten.remoteWebUrl.url === 'string' && /^https:\/\//.test(daten.remoteWebUrl.url) ? daten.remoteWebUrl.url : null
  const web = url !== null ? ` <a class="text-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${tHtml('arbeitsordner.sichernAbschnitt.webLink')}</a>` : ''
  const drei = ohneOrigin
    ? `<p class="subtle">${tHtml('arbeitsordner.sichernAbschnitt.webOhneOrigin')}</p>`
    : `<p class="subtle">${tHtml('arbeitsordner.sichernAbschnitt.web')}${web}</p><p class="subtle sichern-grenze">${tHtml('arbeitsordner.sichernAbschnitt.grenzeVoraus')}</p>`
  const schritt = (titel, inhalt) => `<li class="sichern-schritt"><strong class="sichern-schritt-titel">${tHtml(titel)}</strong>${inhalt}</li>`
  return `<ol class="sichern-schritte">${[
    schritt('arbeitsordner.sichernAbschnitt.schritt.commit', eins),
    schritt('arbeitsordner.sichernAbschnitt.schritt.push', zwei),
    schritt(ohneOrigin ? 'arbeitsordner.sichernAbschnitt.schritt.lokal' : 'arbeitsordner.sichernAbschnitt.schritt.web', `${drei}${aufraeumenHtml(aufraeumen, workflowId)}`),
  ].join('')}</ol>`
}

/**
 * Lagetext bei 200 ohne „bereit“ (F-1157 (6), Advisor 3): GESTOPPT nach offenen Änderungen bzw. Commits, sonst der Grund.
 * @param sichern - ablauf.sichern
 * @param workflowStatus - ablauf.workflowStatus
 * @returns HTML
 */
function nichtBereitText(sichern, workflowStatus) {
  const offen = sichern?.offeneAenderungen
  const voraus = sichern?.voraus
  if (workflowStatus === 'GESTOPPT') {
    if (typeof offen === 'number' && offen > 0) return mitZahl('arbeitsordner.sichernAbschnitt.gestopptAenderungen', offen)
    if (typeof voraus === 'number' && voraus > 0) return mitZahl('arbeitsordner.sichernAbschnitt.gestopptVoraus', voraus)
    if (offen === 0 && voraus === 0) return escapeHtml(grundText('nichtsOffen'))
    return tHtml('arbeitsordner.sichernAbschnitt.gestopptUnbekannt')
  }
  return escapeHtml(grundText(sichern?.grund))
}

/**
 * Abschnitt „Bereit zum Sichern“.
 * @param eingabe - { workflowId, stand (ablauf-code-stand.js), aufraeumen: { art } }
 * @returns HTML
 */
export function renderSichernAbschnitt({ workflowId, stand, aufraeumen }) {
  const kopf = (badge) => `<h3 class="sichern-titel">${tHtml('arbeitsordner.sichernAbschnitt.titel')}${badge ? ` <span class="badge ok">${tHtml('arbeitsordner.sichernAbschnitt.badge')}</span>` : ''}</h3>`
  const rahmen = (inhalt, badge = false) => `<div class="sichern-abschnitt" data-sichern-abschnitt>${kopf(badge)}${inhalt}</div>`
  const zustand = stand?.zustand ?? 'leer'
  if (zustand === 'leer' || zustand === 'laedt') return rahmen(`<p class="subtle">${tHtml('arbeitsordner.sichernAbschnitt.laedt')}</p>`)
  if (zustand === 'fehler') {
    return rahmen(`<p class="fehler">${escapeHtml(t('arbeitsordner.sichernAbschnitt.fehler', { meldung: stand.fehler ?? '' }))}</p>${fussHtml(workflowId, stand)}`)
  }
  if (zustand === 'lage') {
    // F-1157 (5): eine Lage, keine Fehlerfarbe; aufgeräumt ist der Endzustand, während des Aufräumens kein zweiter Hinweis (QA 5).
    const ohne = LAGEN_OHNE_AUFRAEUMEN.has(stand.grundSchluessel)
    return rahmen(`<p class="subtle sichern-lage">${escapeHtml(grundText(stand.grundSchluessel))}</p>${ohne ? '' : aufraeumenHtml(aufraeumen, workflowId)}${fussHtml(workflowId, stand)}`)
  }
  const daten = stand.daten ?? {}
  const sichern = daten.ablauf?.sichern
  const nm = nodeModulesAnzahl(daten)
  const nmHtml = nm > 0 ? `<p class="subtle code-node-modules">${mitZahl('code.dateien.nodeModules', nm)}</p>` : ''
  if (sichern?.bereit !== true) {
    return rahmen(`<p class="subtle sichern-lage">${nichtBereitText(sichern, daten.ablauf?.workflowStatus ?? null)}</p>${nmHtml}${aufraeumenHtml(aufraeumen, workflowId)}${fussHtml(workflowId, stand)}`)
  }
  const offen = typeof sichern.offeneAenderungen === 'number' && sichern.offeneAenderungen > 0 ?`<p class="subtle">${mitZahl('arbeitsordner.sichernAbschnitt.aenderungen', sichern.offeneAenderungen)}</p>` : ''
  return rahmen(`${offen}${nmHtml}${schritteHtml(daten, aufraeumen, workflowId)}${fussHtml(workflowId, stand)}`, true)
}

/**
 * Satz statt des Abschnitts, wenn der Ablauf nicht im eigenen Arbeitsordner arbeitet (F-1157 (7), O3).
 * @param quelle - 'projekt' | 'keinBedarf' | 'unbekannt' (code-daten.js sichernQuelle)
 * @param workflowId - Kennung (nur im Link)
 * @returns HTML ('' für 'ablauf')
 */
export function renderSichernSatz(quelle, workflowId) {
  if (quelle === 'projekt') {
    return `<p class="subtle sichern-satz">${tHtml('arbeitsordner.sichernAbschnitt.projekt', {}, { link: `<a class="text-link" href="#/code">${tHtml('arbeitsordner.sichernAbschnitt.projektLink')}</a>` })}</p>`
  }
  if (quelle === 'keinBedarf') return `<p class="subtle sichern-satz">${tHtml('arbeitsordner.sichernAbschnitt.keinBedarf')}</p>`
  if (quelle === 'unbekannt') {
    const link = `<a class="text-link" href="#/workflows/${escapeHtml(encodeURIComponent(workflowId ?? ''))}">${tHtml('arbeitsordner.sichernAbschnitt.unbekanntLink')}</a>`
    return `<p class="subtle sichern-satz">${tHtml('arbeitsordner.sichernAbschnitt.unbekannt', {}, { link })}</p>`
  }
  return ''
}

/**
 * Sichern eines Ablaufs für einen Einbauort (Ablaufseite, Workboard): Quelle aus dem Feld arbeitsordner; mit eigenem Arbeitsordner
 * der Abschnitt aus dem Stand, den stelle für den Neuladen-Schlüssel liefert (V1) — sonst ein Satz.
 * @param eingabe - { workflowId, detail ({ daten: { status }, arbeitsordner, versionSequenz }), aufraeumen: { art }, stelle: (id, schluessel) => Stand }
 * @returns { quelle, html } — bei 'projekt' der Satz; der Aufrufer darf dort seinen Projektordner-Weg zeigen
 */
export function sichernFuerAblauf({ workflowId, detail, aufraeumen, stelle }) {
  const quelle = sichernQuelle(detail?.arbeitsordner)
  if (quelle !== 'ablauf') return { quelle, html: renderSichernSatz(quelle, workflowId) }
  const stand = stelle(workflowId, sichernSchluessel(detail))
  return { quelle, html: renderSichernAbschnitt({ workflowId, stand, aufraeumen }) }
}

/**
 * Klick im Abschnitt: „Kopieren“ eines Befehlsblocks (nur Zwischenablage, nichts wird ausgeführt) bzw. „Aktualisieren“. Eine Regel
 * für Ablaufseite (workflows.js behandleEntscheidenKlick) und Workboard (Code-Review 6). Abhängigkeiten als Parameter.
 * @param ereignis - Klick-Ereignis
 * @param abh - { kopiere: (knopf) => Promise, aktualisiere: (workflowId) => Promise }
 * @returns true, wenn der Klick behandelt wurde
 */
export function behandleSichernKlick(ereignis, abh) {
  const ziel = ereignis?.target
  const kopieren = ziel?.closest?.('[data-befehl-kopieren]') ?? null
  if (kopieren !== null) {
    void abh.kopiere(kopieren)
    return true
  }
  const aktualisieren = ziel?.closest?.('[data-sichern-aktualisieren]') ?? null
  if (aktualisieren !== null && typeof aktualisieren.dataset?.workflowId === 'string' && aktualisieren.dataset.workflowId !== '') {
    void abh.aktualisiere(aktualisieren.dataset.workflowId)
    return true
  }
  return false
}
