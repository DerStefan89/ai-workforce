/**
 * Datei: public/leitstand/views/start.js
 *
 * Zweck: F29 WS-1a — Startfläche `#/start`, eine eigene View (kein Overlay im Router-Sinn).
 * F44 WS-1b (F-725, Abgleich A1/A2): der Eingang der Vorlage V10 (.rabbit-entrance):
 * „JARVIS“ oben, dasselbe Gesicht in drei Ebenen (linkes Auge, rechtes Auge, Grinsen — je ein
 * <img> desselben Bildes mit eigenem clip-path), die in ~2,2 s aufwachen (Keyframes wake-left,
 * wake-right, wake-grin in style.css), darunter der Link „Enter the Rabbit hole ↗“
 * (enter-arrive) und „AI WORKFORCE“ unten. Der Link führt nach '#/dashboard' — die
 * Produktübersicht ist in der Vorlage der erste Eintrag (vorher '#/workboard').
 *
 * Unter dem Link steht weiter die Wartezeile (#start-warte-hinweis, A2 — fehlt in der Vorlage):
 * Sie benennt, was konkret wartet („2 Entscheidungen warten“), mit Plural über t(). Sie ist
 * reiner Sichttext, KEINE aria-live-Region — #persona-text-status (persona.js) bleibt die
 * einzige im Dokument.
 *
 * Einmal-pro-Sitzung-Regel (sessionStorage, Konvention projekt-kontext.js), unverändert:
 * leiteBeimStartEin() wird von app.js VOR dem ersten Router-Dispatch aufgerufen und setzt den
 * Hash nur dann auf '#/start', wenn (a) diese Sitzung die Fläche noch nicht gezeigt hat UND
 * (b) der Hash leer ist (ein Reload/Deeplink auf eine andere View wird respektiert). Ein
 * Reload/Deeplink auf exakt '#/start' NACH bereits gezeigter Fläche leitet in beimBetreten()
 * sofort weiter — AUSSER zeigeStartflaeche() (Klick auf die Persona im Kopf oder die Wortmarke,
 * shell.js) hat den nächsten Eintritt ausdrücklich erzwungen.
 *
 * Solange die Fläche sichtbar ist, trägt <html> das Attribut data-eingang="true"; style.css
 * blendet damit Sidebar, Kopf und Chatspalte aus (Vorlage .is-entrance) — sie sind dann auch
 * per Tastatur nicht erreichbar. Bei reduzierter Bewegung ist alles statisch (style.css).
 * Enter betritt wie bisher: Der Link trägt beim Eintritt den Fokus, und liegt der Fokus nach einem
 * Klick auf die Fläche auf body, reicht Enter ebenfalls. Ein Klick irgendwo auf die Fläche betritt
 * nicht mehr (Vorlage: nur der Link).
 * Die frühere Partikelfläche (particle-drift.js) und die große Persona-Instanz entfallen.
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initStartView beim Bootstrap, leiteBeimStartEin vor starteRouter())
 * - public/leitstand/shell.js (zeigeStartflaeche — Persona-Knopf im Kopf, Wortmarke der Sidebar)
 */

import { t } from '../i18n.js'
import { registriere, navigiere, unterdrueckeFolgendesHashchange } from '../router.js'
import { abonniere } from '../zustand.js'
import { leitePersonaZustandAb } from '../persona-state.js'
import { filtereAttentionLaeufe, filtereAttentionWorkflows } from '../attention-daten.js'
import { escapeHtml } from '../render.js'

const SESSION_SCHLUESSEL = 'leitstand-start-gezeigt'
const START_ZIEL_HASH = '#/dashboard'
const BILD_PFAD = '/persona-gesicht.webp'

let letzterZustand = null
let erzwingeNaechstenEintritt = false

/**
 * Text der Wartezeile unter dem Link — konkreter als der Persona-Status, weil hier Platz für
 * eine Zahl ist (A2). Plural über t() (Intl.PluralRules).
 * @param zustand - Aggregat aus GET /api/zustand, oder null vor dem ersten Poll-Tick
 * @returns der Text
 */
function ermittleWarteText(zustand) {
  if (zustand === null) return t('start.warte.laedt')
  const persona = leitePersonaZustandAb(zustand)
  if (persona === 'error') {
    const anzahl = (zustand.startfehler?.length ?? 0) + (filtereAttentionLaeufe(zustand.laeufe ?? null)?.length ?? 0)
    return anzahl > 0 ? t('start.warte.aufmerksamkeit', { anzahl }) : t('start.warte.fehlgeschlagen')
  }
  if (persona === 'waiting_for_human') {
    const anzahl = filtereAttentionWorkflows(zustand.workflows ?? null)?.length ?? 0
    return t('start.warte.entscheidungen', { anzahl })
  }
  if (persona === 'thinking') return t('start.warte.lauf')
  return t('start.warte.nichts')
}

function renderWarteText() {
  const zeile = document.getElementById('start-warte-hinweis')
  if (zeile !== null) zeile.textContent = ermittleWarteText(letzterZustand)
}

/** Baut den Eingang einmalig beim Bootstrap (Markup der Vorlage, Texte über t()). */
function baueStartflaeche() {
  const container = document.getElementById('view-start')
  const ebene = (klasse) => `<img class="face-part ${klasse}" src="${BILD_PFAD}" alt="" width="1536" height="1024" />`
  container.innerHTML = `
    <section class="rabbit-entrance">
      <div class="rabbit-signature" translate="no">${escapeHtml(t('start.signatur'))}</div>
      <div class="awakening-face" role="img" aria-label="${escapeHtml(t('start.gesicht'))}">
        ${ebene('eye-left')}${ebene('eye-right')}${ebene('waking-grin')}
      </div>
      <a class="rabbit-enter" id="start-betreten" href="${START_ZIEL_HASH}" translate="no" lang="en"><span>${escapeHtml(t('start.betreten'))}</span><span aria-hidden="true">↗</span></a>
      <p id="start-warte-hinweis" class="start-hinweis"></p>
      <div class="rabbit-wordmark" translate="no">${escapeHtml(t('start.wortmarke'))}</div>
    </section>`
}

/**
 * Markiert <html>, solange die Startfläche die Route ist (style.css blendet dann die Shell aus).
 * @param aktiv - true beim Betreten, false beim Verlassen
 */
function setzeEingang(aktiv) {
  if (aktiv) document.documentElement.dataset.eingang = 'true'
  else delete document.documentElement.dataset.eingang
}

function markiereGezeigt() {
  try {
    sessionStorage.setItem(SESSION_SCHLUESSEL, 'true')
  } catch {
    // Privates Fenster/blockierter Zugriff — die Fläche zeigt sich dann bei jedem Reload erneut, kein Absturz (Muster projekt-kontext.js).
  }
}

function bereitsGezeigt() {
  try {
    return sessionStorage.getItem(SESSION_SCHLUESSEL) === 'true'
  } catch {
    return false
  }
}

/**
 * Startet die Aufwach-Animationen neu (Klasse entfernen, Reflow, setzen) — auch bei einem
 * erzwungenen zweiten Eintritt, nicht nur beim ersten Rendern.
 */
function starteAufwachen() {
  const flaeche = document.querySelector('#view-start .rabbit-entrance')
  if (flaeche === null) return
  flaeche.classList.remove('rabbit-wach')
  void flaeche.offsetWidth
  flaeche.classList.add('rabbit-wach')
}

/** onEnter der Route '#/start' — Reload/Deeplink NACH bereits gezeigter Fläche weicht zur Produktübersicht aus, außer zeigeStartflaeche() hat diesen Eintritt erzwungen (Datei-Kommentar). */
function beimBetreten() {
  const erzwungen = erzwingeNaechstenEintritt
  erzwingeNaechstenEintritt = false
  if (bereitsGezeigt() && !erzwungen) {
    navigiere(START_ZIEL_HASH)
    return
  }
  setzeEingang(true)
  renderWarteText()
  starteAufwachen()
  markiereGezeigt()
  // Der Link ist sofort bedienbar (Vorlage) und trägt den Fokus, damit Enter wie bisher sofort
  // betritt — auch wenn er erst nach ~0,7 s sichtbar einblendet. Den Fokusrahmen blendet style.css
  // bis zur ersten Eingabe aus (data-autofokus), die Vorlage zeigt dort keinen.
  const link = document.getElementById('start-betreten')
  link.dataset.autofokus = 'true'
  const eingabe = () => delete link.dataset.autofokus
  document.addEventListener('keydown', eingabe, { once: true, capture: true })
  document.addEventListener('pointermove', eingabe, { once: true, capture: true })
  link.focus()
}

/** Löst genau einmal pro Sitzung den automatischen Einstieg über '#/start' aus — vor dem ersten Router-Dispatch aufgerufen (app.js), respektiert einen bereits gesetzten, abweichenden Hash (Reload/Deeplink auf eine andere View). */
export function leiteBeimStartEin() {
  if (bereitsGezeigt()) return
  if (location.hash !== '' && location.hash !== '#/start') return
  if (location.hash !== '#/start') {
    // unterdrueckeFolgendesHashchange VOR der Zuweisung (router.js Datei-Kommentar dort): sonst
    // dispatcht starteRouter() gleich darauf synchron korrekt einmal, aber das dadurch
    // ausgelöste, verzögerte native hashchange-Event würde beimBetreten() ein zweites Mal
    // aufrufen — mit dann bereits gesetztem Sitzungsflag fälschlich sofort weiterleitend.
    unterdrueckeFolgendesHashchange('#/start')
    location.hash = '#/start'
  }
}

/** Holt die Startfläche gezielt zurück — Persona im Kopf oder Wortmarke der Sidebar (shell.js), unabhängig vom Sitzungsflag. */
export function zeigeStartflaeche() {
  erzwingeNaechstenEintritt = true
  navigiere('#/start')
}

/** Initialisiert die Startfläche einmalig beim Bootstrap. */
export function initStartView() {
  baueStartflaeche()
  // Einziger zuverlässiger Ort für „die Route wurde verlassen“ — router.js kennt nur onEnter. Ein
  // natives 'hashchange' feuert immer, wenn location.hash sich ändert (auch wenn router.js einen
  // zweiten internen dispatch() für denselben Hash unterdrückt).
  window.addEventListener('hashchange', () => {
    if (location.hash !== '#/start') setzeEingang(false)
  })
  // Bisheriges Verhalten „Klicken oder Enter“: Enter betritt auch, wenn der Fokus nach einem Klick
  // auf die Fläche nicht mehr auf dem Link liegt (sondern auf body).
  document.addEventListener('keydown', (ereignis) => {
    if (ereignis.key !== 'Enter' || location.hash !== '#/start') return
    if (document.activeElement !== null && document.activeElement !== document.body) return
    document.getElementById('start-betreten').click()
  })
  abonniere((zustand) => {
    letzterZustand = zustand
    renderWarteText()
  })
  registriere(/^#\/start$/, 'start', beimBetreten)
}
