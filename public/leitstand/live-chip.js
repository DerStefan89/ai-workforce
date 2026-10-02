/**
 * Datei: public/leitstand/live-chip.js
 *
 * Zweck: Live-Chip in der Kopfleiste (F46 D0) am Persona-Status. Läuft ein Lauf, zeigt er
 * „Workforce arbeitet · <Eintrag>“, sonst „Gerade läuft nichts“ — seit F46 D5 beides als Link auf
 * #/live (die Live-Ansicht zeigt den aktiven Lauf bzw. „Die Workforce wartet“). <Eintrag> kommt aus
 * dem passenden Eintrag in laeufe: Rolle und Titel des Auftrags (auftragsbezug.titel, sonst titel bzw.
 * ziel); fehlt beides, steht die gekürzte laufId da. Die Rolle trägt ein laeufe-Eintrag nicht
 * (sammleLaufKopfdaten) — seit F46 D5 kommt sie aus dem Lauf-Detail (kontextpaket.rolle), EINMAL je
 * aktiver laufId geladen (kein Poll; ohne Rolle bis zu drei Versuche an den folgenden Ticks); bis dahin bzw. ohne Rolle steht der Titel wie bisher.
 * Fehlt der Eintrag ganz (Lauf eines anderen Projekts — aktiverLauf gilt projektübergreifend, D13),
 * steht die gekürzte laufId da und der Link zeigt auf #/ausfuehrungen (Prüfpass D0, qa 1).
 *
 * Datenquelle ist der vorhandene Poll (zustand.js: aktiverLauf { aktiv, laufId }, laeufe) und je aktiver
 * laufId ein Abruf des Lauf-Details über api.js — kein Timer, keine Serveränderung. Ist aktiverLauf unbekannt (vor dem ersten
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

import { holeLaufDetail } from './api.js'
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
 * @param detailRolle - Rolle aus dem Lauf-Detail (F46 D5) oder null
 * @returns Klartext (nicht escaped)
 */
function eintragText(laufId, eintrag, detailRolle = null) {
  const rolle = text(detailRolle) ?? text(eintrag?.rolle)
  const titel = text(eintrag?.auftragsbezug?.titel) ?? text(eintrag?.titel) ?? text(eintrag?.ziel)
  const teile = [rolle === null ? null : rollenName(rolle), titel].filter((teil) => teil !== null)
  return teile.length > 0 ? teile.join(' · ') : laufId.slice(0, LAUF_ID_KURZ)
}

/**
 * Baut Inhalt, Ziel und Titel des Live-Chips aus dem Poll-Aggregat. Reine Funktion.
 * @param zustand - Aggregat aus GET /api/zustand ({ aktiverLauf, laeufe, … }) oder null
 * @param rolleJeLauf - Map laufId → Rolle aus dem Lauf-Detail (F46 D5), optional
 * @returns null, wenn aktiverLauf unbekannt ist; sonst { aktiv, href, html, titel } — html ist
 *   fertiges, escaptes Markup des Link-Inhalts, titel der Klartext für das title-Attribut
 */
export function baueLiveChip(zustand, rolleJeLauf = null) {
  const aktiverLauf = zustand?.aktiverLauf
  if (typeof aktiverLauf?.aktiv !== 'boolean') return null
  const punkt = '<span class="live-chip-punkt" aria-hidden="true"></span>'
  const laufId = text(aktiverLauf.laufId)
  if (aktiverLauf.aktiv && laufId !== null) {
    const zustandText = t('kopf.live.aktiv')
    const lauf = Array.isArray(zustand.laeufe) ? zustand.laeufe.find((l) => l?.laufId === laufId) : undefined
    const eintrag = eintragText(laufId, lauf, lauf === undefined ? null : (rolleJeLauf?.get(laufId) ?? null))
    return {
      aktiv: true,
      href: lauf === undefined ? '#/ausfuehrungen' : '#/live',
      html: `${punkt}<span class="live-chip-zustand">${escapeHtml(zustandText)}</span><span class="live-chip-eintrag"> · ${escapeHtml(eintrag)}</span>`,
      titel: `${zustandText} · ${eintrag}`,
    }
  }
  // Aktiv ohne laufId (sollte der Server nie melden): Zustand ehrlich, Link auf die Liste. Ruhig: #/live
  // (F46 D5, „Die Workforce wartet“ mit Zuletzt und Als Nächstes).
  const zustandText = t(aktiverLauf.aktiv ? 'kopf.live.aktiv' : 'kopf.live.ruhig')
  return {
    aktiv: aktiverLauf.aktiv,
    href: aktiverLauf.aktiv ? '#/ausfuehrungen' : '#/live',
    html: `${punkt}<span class="live-chip-zustand">${escapeHtml(zustandText)}</span>`,
    titel: zustandText,
  }
}

/** F46 D5: Rolle je aktiver laufId aus dem Lauf-Detail; höchstens ein Eintrag (D13), je laufId ein Abruf. */
const rolleJeLauf = new Map()

/** laufId, für die die Rolle gerade angefragt ist bzw. feststeht. */
let rolleAngefragt = null

/** Abrufe je laufId: ohne Rolle (Kontextpaket noch nicht geschrieben, Fehler) höchstens ROLLE_VERSUCHE, dann bleibt der Titel. */
let rolleVersuche = 0
/** laufId, für die rolleVersuche zählt. */
let rolleLauf = null
const ROLLE_VERSUCHE = 3

/** Letztes Aggregat — nach dem Laden der Rolle wird der Chip damit neu gezeichnet. */
let letzterZustand = null

/**
 * Lädt einmal je aktiver laufId (dieses Projekts) die Rolle aus dem Lauf-Detail und zeichnet neu.
 * @param zustand - Poll-Aggregat
 */
function ladeRolle(zustand) {
  const laufId = zustand?.aktiverLauf?.aktiv === true ? text(zustand.aktiverLauf.laufId) : null
  if (laufId === null || rolleAngefragt === laufId) return
  if (!Array.isArray(zustand.laeufe) || !zustand.laeufe.some((l) => l?.laufId === laufId)) return
  if (rolleLauf !== laufId) {
    rolleLauf = laufId
    rolleVersuche = 0
  }
  if (rolleVersuche >= ROLLE_VERSUCHE) return
  rolleAngefragt = laufId
  rolleVersuche += 1
  /** Ohne Rolle: beim nächsten Tick erneut versuchen (bis ROLLE_VERSUCHE). */
  const nochmal = () => {
    if (rolleAngefragt === laufId && rolleVersuche < ROLLE_VERSUCHE) rolleAngefragt = null
  }
  holeLaufDetail(laufId)
    .then((antwort) => (antwort.ok ? antwort.json() : null))
    .then((detail) => {
      const rolle = detail?.kontextpaket?.status === 'ok' ? text(detail.kontextpaket.rolle) : null
      if (rolle === null) return nochmal()
      if (rolleAngefragt !== laufId) return
      rolleJeLauf.clear()
      rolleJeLauf.set(laufId, rolle)
      if (letzterZustand !== null) renderLiveChip(letzterZustand)
    })
    .catch((fehler) => {
      console.error('[live-chip] Rolle aus dem Lauf-Detail nicht ladbar:', fehler)
      nochmal()
    })
}

/** Zuletzt geschriebenes Markup (Vergleich gegen innerHTML schlüge fehl: der Browser serialisiert Entities anders). */
let letztesHtml = null

/**
 * Schreibt den Chip in jedes [data-live-chip] (Kopf und Sidebar/Menü) — Inhalt nur bei echter
 * Änderung, damit ein Poll-Tick Fokus und Hover nicht stört.
 * @param zustand - Aggregat aus GET /api/zustand
 */
function renderLiveChip(zustand) {
  letzterZustand = zustand
  const elemente = document.querySelectorAll('[data-live-chip]')
  const chip = baueLiveChip(zustand, rolleJeLauf)
  ladeRolle(zustand)
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
