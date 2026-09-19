/**
 * Datei: public/leitstand/shell.js
 *
 * Zweck: F29 WS-1a — zwei kleine, rein strukturelle Shell-Verdrahtungen, die
 * zu keiner bestehenden View gehören (siehe unten); F29 WS-D1 ergänzt eine
 * dritte: den Particle-Drift-Hintergrund des Banners (Auftrag Punkt 1/5,
 * particle-drift.js) und die Verdrahtung des in die neue Schnellzugriff-Box
 * verschobenen "Projekt wechseln"-Eintrags (Auftrag Punkt 1 — "bestehende
 * Funktion": derselbe navigiere('#/projekte-uebersicht')-Aufruf, den
 * projekt-kontext.js' eigener Button in der Kontext-Anzeige bereits nutzt;
 * kein neuer Navigationsweg, nur ein zweiter Auslöser dafür).
 *
 * 1. Chat-Spalten-Umschalter (#chat-umschalter): #shell-chat-spalte ist seit
 *    diesem Auftrag kein `[data-view]`-Container in <main> mehr, sondern eine
 *    eigenständige rechte Spalte (router.js, "ueberlagert" — siehe dessen
 *    Datei-Kommentar). Ihre Sichtbarkeit ist deshalb NICHT mehr Sache des
 *    Routers, sondern ein eigener Zustand (chatSpalteSichtbar) mit drei
 *    Auslösern: (a) beim Betreten der Route '#/chat' wird sie erzwungen
 *    geöffnet (Auftrag: "standardmäßig geschlossen außer auf #/chat"), (b)
 *    beim Betreten von '#/start' erzwungen GESCHLOSSEN (die Startfläche
 *    beansprucht vollen Fokus — QA-Befund 18.09.2026: ohne das stand die
 *    Chat-Spalte bei einem wiederkehrenden Nutzer mit gespeicherter
 *    "offen"-Präferenz gleichzeitig neben der Startfläche), (c) sonst die in
 *    localStorage gemerkte Präferenz. QA-Befund 18.09.2026 (kritisch): eine
 *    frühere Fassung verknüpfte (a) als ODER mit der Präferenz — ein Klick
 *    auf den Umschalter WÄHREND '#/chat' aktiv war, konnte die Spalte
 *    dadurch nie schließen (die ODER-Verknüpfung erzwang sie bei jedem
 *    Re-Render erneut offen). chatSpalteSichtbar unten ist deshalb ein
 *    einzelner veränderlicher Zustand, den (a)/(b) nur bei einem ECHTEN
 *    'hashchange'-Ereignis (Routenwechsel, nicht jeder Re-Render) setzen —
 *    ein Klick auf den Umschalter danach ändert ihn frei, bis der nächste
 *    tatsächliche Routenwechsel eintritt. Ein eigener 'hashchange'-Listener
 *    hält das synchron — ein zweiter, rein UI-seitiger Listener neben dem
 *    des Routers, kein zweiter Datentimer (E-M4-3/AK-Grenze bleibt
 *    unberührt, hier fließen keine Serverdaten).
 * 2. Persona-Kachel-Klick (#persona-kopf-oeffner): holt die Startfläche
 *    zurück (views/start.js, zeigeStartflaeche()) — persona.js selbst bleibt
 *    unverändert (F29-Nicht-Ziel), der Klick-Handler sitzt am umschließenden
 *    <button> aus index.html, nicht am Persona-Host selbst.
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initShell beim Bootstrap, vor starteRouter())
 */

import { zeigeStartflaeche } from './views/start.js'
import { navigiere } from './router.js'
import { montierePartikelDrift } from './particle-drift.js'
import { escapeHtml } from './render.js'
import { holeVerlauf } from './zuletzt-geoeffnet.js'

const CHAT_OFFEN_SCHLUESSEL = 'leitstand-chat-offen'

/** Auftrag Punkt 5 (WS-D1) / Punkt B (WS-D2, "Rote Partikel dahinter" — löst den WS-D1-Cyan/Rot-Mix ab): "density ca. 120 im Banner". */
const BANNER_PARTIKEL_DICHTE = 120

/** Aktueller, veränderlicher Sichtbarkeitszustand der Chat-Spalte — s. Datei-Kommentar (a)/(b)/(c). */
let chatSpalteSichtbar = false

function gespeicherteChatPraeferenz() {
  try {
    return localStorage.getItem(CHAT_OFFEN_SCHLUESSEL) === 'true'
  } catch {
    return false
  }
}

function speichereChatPraeferenz(offen) {
  try {
    localStorage.setItem(CHAT_OFFEN_SCHLUESSEL, String(offen))
  } catch {
    // Privates Fenster/blockierter Zugriff — die Präferenz gilt dann nur für die laufende Ansicht, kein Absturz (Muster projekt-kontext.js).
  }
}

/** Spiegelt chatSpalteSichtbar auf Spalte und Umschalter-Button. */
function wendeChatSichtbarkeitAn() {
  document.getElementById('shell-chat-spalte').hidden = !chatSpalteSichtbar
  document.getElementById('chat-umschalter').setAttribute('aria-pressed', String(chatSpalteSichtbar))
}

/** Bei jedem ECHTEN Routenwechsel (nicht bei einem Umschalter-Klick): erzwingt (a)/(b) oder fällt auf die gespeicherte Präferenz zurück — Datei-Kommentar. F29 WS-D2: rendert bei derselben Gelegenheit die Schnellzugriff-Verlaufsliste neu (renderSchnellzugriffVerlauf) — ein merkeGeoeffnet()-Aufruf in einer anderen View geht immer einem navigiere()-Aufruf unmittelbar voraus, ein 'hashchange' ist deshalb ein zuverlässiges Signal "die Liste könnte sich geändert haben", ohne dass zuletzt-geoeffnet.js selbst einen Abonnentenmechanismus bräuchte. */
function beiRoutenwechsel() {
  if (location.hash === '#/chat') {
    chatSpalteSichtbar = true
  } else if (location.hash === '#/start') {
    chatSpalteSichtbar = false
  } else {
    chatSpalteSichtbar = gespeicherteChatPraeferenz()
  }
  wendeChatSichtbarkeitAn()
  renderSchnellzugriffVerlauf()
}

function initChatUmschalter() {
  document.getElementById('chat-umschalter').addEventListener('click', () => {
    chatSpalteSichtbar = !chatSpalteSichtbar
    speichereChatPraeferenz(chatSpalteSichtbar)
    wendeChatSichtbarkeitAn()
  })
  window.addEventListener('hashchange', beiRoutenwechsel)
  beiRoutenwechsel()
}

function initPersonaOeffner() {
  document.getElementById('persona-kopf-oeffner').addEventListener('click', () => zeigeStartflaeche())
}

/** F29 WS-D1/D2: Banner-Hintergrund (Auftrag Punkt 1/5 bzw. B) — eine Montagefunktion, hier für das Banner genutzt (views/start.js nutzt dieselbe für die Startfläche). WS-D2: Rot-Töne statt des WS-D1-Cyan/Rot-Mixes ("Rote Partikel dahinter"). */
function initBannerPartikel() {
  montierePartikelDrift(document.getElementById('shell-banner-partikel'), {
    density: BANNER_PARTIKEL_DICHTE,
    basisToken: '--color-brand-rgb',
    akzentToken: '--color-brand-strong-rgb',
  })
}

/** F29 WS-D1: "Projekt wechseln" in der neuen Schnellzugriff-Box — bestehende Funktion (Datei-Kommentar), zweiter Auslöser neben projekt-kontext.js' eigenem Button. */
function initSchnellzugriff() {
  document.getElementById('schnellzugriff-projekt-wechseln').addEventListener('click', () => navigiere('#/projekte-uebersicht'))
}

/** F29 WS-D2 (Auftrag Punkt B): Dropdown der Nutzerkarte — öffnet/schließt per Chevron-Klick, schließt zusätzlich bei Klick außerhalb oder Escape (Standard-Menü-Verhalten). Der Inhalt selbst (Animationen-reduzieren-Schalter) wird von persona.js dort hineingemountet, s. dessen Kommentar — reine Auf/Zu-Mechanik hier, kein neuer Schreibpfad. */
function initNutzerkartenDropdown() {
  const oeffner = document.getElementById('nutzerkarte-oeffner')
  const dropdown = document.getElementById('nutzerkarte-dropdown')

  const schliesse = () => {
    dropdown.hidden = true
    oeffner.setAttribute('aria-expanded', 'false')
  }
  const oeffne = () => {
    dropdown.hidden = false
    oeffner.setAttribute('aria-expanded', 'true')
  }

  oeffner.addEventListener('click', () => {
    if (dropdown.hidden) oeffne()
    else schliesse()
  })
  document.addEventListener('click', (ereignis) => {
    if (dropdown.hidden) return
    if (ereignis.target === oeffner || oeffner.contains(ereignis.target) || dropdown.contains(ereignis.target)) return
    schliesse()
  })
  document.addEventListener('keydown', (ereignis) => {
    if (ereignis.key === 'Escape' && !dropdown.hidden) schliesse()
  })
}

/** F29 WS-D2 (Auftrag Punkt B): rendert die zuletzt geöffneten Projekte/Workflows dieser Sitzung (zuletzt-geoeffnet.js) in die Schnellzugriff-Box — leer, solange nichts gemerkt wurde (Auftrag: "sofern Daten vorhanden"), kein Leerzustandstext nötig (die Box zeigt dann schlicht nichts zusätzliches). */
function renderSchnellzugriffVerlauf() {
  const container = document.getElementById('schnellzugriff-verlauf')
  const verlauf = holeVerlauf()
  container.innerHTML = verlauf
    .map(
      (eintrag) =>
        `<button type="button" class="schnellzugriff-verlauf-eintrag" data-hash="${escapeHtml(eintrag.hash)}">
          <span class="status-punkt ${escapeHtml(eintrag.statusKategorie)}" aria-hidden="true"></span>
          <span class="schnellzugriff-verlauf-eintrag-label">${escapeHtml(eintrag.label)}</span>
        </button>`
    )
    .join('')
}

function initSchnellzugriffVerlauf() {
  document.getElementById('schnellzugriff-verlauf').addEventListener('click', (ereignis) => {
    const knopf = ereignis.target.closest('.schnellzugriff-verlauf-eintrag')
    if (knopf === null) return
    navigiere(knopf.dataset.hash)
  })
  renderSchnellzugriffVerlauf()
}

/** Initialisiert alle Shell-Verdrahtungen einmalig beim Bootstrap. */
export function initShell() {
  initChatUmschalter()
  initPersonaOeffner()
  initBannerPartikel()
  initSchnellzugriff()
  initNutzerkartenDropdown()
  initSchnellzugriffVerlauf()
}
