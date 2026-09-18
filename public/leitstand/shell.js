/**
 * Datei: public/leitstand/shell.js
 *
 * Zweck: F29 WS-1a — zwei kleine, rein strukturelle Shell-Verdrahtungen, die
 * zu keiner bestehenden View gehören:
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

const CHAT_OFFEN_SCHLUESSEL = 'leitstand-chat-offen'

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

/** Bei jedem ECHTEN Routenwechsel (nicht bei einem Umschalter-Klick): erzwingt (a)/(b) oder fällt auf die gespeicherte Präferenz zurück — Datei-Kommentar. */
function beiRoutenwechsel() {
  if (location.hash === '#/chat') {
    chatSpalteSichtbar = true
  } else if (location.hash === '#/start') {
    chatSpalteSichtbar = false
  } else {
    chatSpalteSichtbar = gespeicherteChatPraeferenz()
  }
  wendeChatSichtbarkeitAn()
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

/** Initialisiert beide Shell-Verdrahtungen einmalig beim Bootstrap. */
export function initShell() {
  initChatUmschalter()
  initPersonaOeffner()
}
