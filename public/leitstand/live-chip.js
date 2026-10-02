/**
 * Datei: public/leitstand/live-chip.js
 *
 * Zweck: Live-Chip in der Kopfleiste (F46 D0) am Persona-Status. Läuft ein Lauf, zeigt er
 * „Workforce arbeitet · <Eintrag>“ als Link auf #/runs/<laufId>; sonst „Gerade läuft nichts“ als
 * Link auf #/ausfuehrungen. <Eintrag> kommt aus dem passenden Eintrag in laeufe: Rolle (falls der
 * Eintrag eine trägt, lesbar über rollen-anzeige.js) und Titel des Auftrags (auftragsbezug.titel,
 * sonst titel bzw. ziel); fehlt beides, steht die gekürzte laufId da. Heute trägt ein
 * laeufe-Eintrag keine Rolle (sammleLaufKopfdaten im Server) — der Chip zeigt dann den
 * Auftragstitel; eine Rolle erscheint, sobald die Kopfdaten sie liefern, ohne Änderung hier.
 * Fehlt der Eintrag ganz, steht ebenfalls die gekürzte laufId da, der Link zeigt aber auf
 * #/ausfuehrungen: aktiverLauf gilt projektübergreifend (D13), laeufe und das Lauf-Detail nur für das
 * aktive Projekt — ein Lauf eines anderen Projekts hätte unter #/runs/<laufId> keine Seite
 * (Prüfpass D0, qa 1).
 *
 * Datenquelle ist ausschließlich der vorhandene Poll (zustand.js: aktiverLauf { aktiv, laufId },
 * laeufe) — kein fetch, kein Timer, keine Serveränderung. Ist aktiverLauf unbekannt (vor dem ersten
 * Tick, oder ein Aggregat ohne aktiverLauf), bleibt der Chip verborgen statt einen Zustand zu
 * erfinden. Scheitert ein Abruf ganz, ruft zustand.js die Abnehmer nicht auf: der Chip behält dann
 * wie die Persona den letzten Stand, und der Hinweis #poll-fehler sagt, dass er veraltet sein kann.
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initLiveChip beim Bootstrap, vor initZustandPoll)
 * - public/leitstand/index.html (zwei Elemente [data-live-chip]: #kopf-live-chip im Kopf, .menue-live-chip
 *   in Sidebar und mobilem Menü; style.css zeigt je nach Breite eines davon)
 * - public/leitstand/live-chip.test.mjs (node:test, baueLiveChip)
 *
 * Wichtig:
 * - KEIN aria-live: die Persona-Statuszeile bleibt die einzige Live-Region. Der Punkt ist
 *   aria-hidden; der Zustand steht im Text (nie gekürzt, notfalls umbrochen) und vollständig im
 *   title; den Eintrag zeigt style.css im Kopf erst ab 1700 px, darunter nur für Screenreader.
 * - Rolle, Titel und laufId sind Projekt- bzw. Serverdaten: alles escaped, kein Attribut außer dem
 *   href, und der nur aus fester Route + encodeURIComponent(laufId).
 * - Import-sicher: kein DOM-Zugriff beim Import.
 * - Staffelung (style.css, gemessen): ab 1151 px unter der Statuszeile, nur im freien Platz; bis
 *   1150 px in Sidebar bzw. mobilem Menü.
 */

import { t } from './i18n.js'
import { escapeHtml } from './render.js'
import { rollenName } from './rollen-anzeige.js'
import { abonniere } from './zustand.js'

/** Länge der gekürzten laufId, wenn kein Eintrag lesbar ist. */
const LAUF_ID_KURZ = 8

/**
 * Nicht-leerer, getrimmter String oder null.
 * @param wert - beliebiger Wert
 * @returns String oder null
 */
function text(wert) {
  return typeof wert === 'string' && wert.trim() !== '' ? wert.trim() : null
}

/**
 * Lesbarer Eintrag eines Laufs: Rolle und Titel, sonst die gekürzte laufId.
 * @param laufId - aktive laufId
 * @param eintrag - passender Eintrag aus laeufe oder undefined
 * @returns Klartext (nicht escaped)
 */
function eintragText(laufId, eintrag) {
  const rolle = text(eintrag?.rolle)
  const titel = text(eintrag?.auftragsbezug?.titel) ?? text(eintrag?.titel) ?? text(eintrag?.ziel)
  const teile = [rolle === null ? null : rollenName(rolle), titel].filter((teil) => teil !== null)
  return teile.length > 0 ? teile.join(' · ') : laufId.slice(0, LAUF_ID_KURZ)
}

/**
 * Baut Inhalt, Ziel und Titel des Live-Chips aus dem Poll-Aggregat. Reine Funktion.
 * @param zustand - Aggregat aus GET /api/zustand ({ aktiverLauf, laeufe, … }) oder null
 * @returns null, wenn aktiverLauf unbekannt ist; sonst { aktiv, href, html, titel } — html ist
 *   fertiges, escaptes Markup des Link-Inhalts, titel der Klartext für das title-Attribut
 */
export function baueLiveChip(zustand) {
  const aktiverLauf = zustand?.aktiverLauf
  if (typeof aktiverLauf?.aktiv !== 'boolean') return null
  const punkt = '<span class="live-chip-punkt" aria-hidden="true"></span>'
  const laufId = text(aktiverLauf.laufId)
  if (aktiverLauf.aktiv && laufId !== null) {
    const zustandText = t('kopf.live.aktiv')
    const lauf = Array.isArray(zustand.laeufe) ? zustand.laeufe.find((l) => l?.laufId === laufId) : undefined
    const eintrag = eintragText(laufId, lauf)
    return {
      aktiv: true,
      href: lauf === undefined ? '#/ausfuehrungen' : `#/runs/${encodeURIComponent(laufId)}`,
      html: `${punkt}<span class="live-chip-zustand">${escapeHtml(zustandText)}</span><span class="live-chip-eintrag"> · ${escapeHtml(eintrag)}</span>`,
      titel: `${zustandText} · ${eintrag}`,
    }
  }
  // Aktiv ohne laufId (sollte der Server nie melden): Zustand ehrlich, Link auf die Liste.
  const zustandText = t(aktiverLauf.aktiv ? 'kopf.live.aktiv' : 'kopf.live.ruhig')
  return {
    aktiv: aktiverLauf.aktiv,
    href: '#/ausfuehrungen',
    html: `${punkt}<span class="live-chip-zustand">${escapeHtml(zustandText)}</span>`,
    titel: zustandText,
  }
}

/** Zuletzt geschriebenes Markup (Vergleich gegen innerHTML schlüge fehl: der Browser serialisiert Entities anders). */
let letztesHtml = null

/**
 * Schreibt den Chip in jedes [data-live-chip] (Kopf und Sidebar/Menü) — Inhalt nur bei echter
 * Änderung, damit ein Poll-Tick Fokus und Hover nicht stört.
 * @param zustand - Aggregat aus GET /api/zustand
 */
function renderLiveChip(zustand) {
  const elemente = document.querySelectorAll('[data-live-chip]')
  const chip = baueLiveChip(zustand)
  const neuerInhalt = chip !== null && letztesHtml !== chip.html
  for (const element of elemente) {
    if (chip === null) {
      if (!element.hidden) element.hidden = true
      continue
    }
    if (element.getAttribute('href') !== chip.href) element.setAttribute('href', chip.href)
    if (neuerInhalt) element.innerHTML = chip.html
    if (element.title !== chip.titel) element.title = chip.titel
    if (element.dataset.aktiv !== String(chip.aktiv)) element.dataset.aktiv = String(chip.aktiv)
    if (element.hidden) element.hidden = false
  }
  if (neuerInhalt) letztesHtml = chip.html
}

/** Abonniert den zentralen Poll (zustand.js) für den Live-Chip. */
export function initLiveChip() {
  abonniere(renderLiveChip)
}
