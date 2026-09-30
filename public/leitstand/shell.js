/**
 * Datei: public/leitstand/shell.js
 *
 * Zweck: Verdrahtung der Shell — Sidebar und Kopf der Vorlage V10 (F44 WS-1b, F-725,
 * Abgleich A3/A4/A5/A9/A10/A14), dazu die Chatspalte, die bis WS-8 bleibt. Keine View-Logik,
 * keine Serverdaten außer dem Projektregister für die Auswahl (projekt-kontext.js).
 *
 * 1. Chat-Spalten-Umschalter (#chat-umschalter, seit WS-1b der Knopf „Frag Jarvis“ im Kopf —
 *    gleiche ID, gleiche Logik wie seit F29 WS-1a): #shell-chat-spalte ist kein
 *    `[data-view]`-Container (router.js, "ueberlagert"). Ihre Sichtbarkeit ist ein eigener
 *    Zustand (chatSpalteSichtbar) mit drei Auslösern: (a) beim Betreten von '#/chat' erzwungen
 *    offen, (b) beim Betreten von '#/start' erzwungen geschlossen, (c) sonst die in
 *    localStorage gemerkte Präferenz. (a)/(b) greifen nur bei einem ECHTEN 'hashchange' — ein
 *    Klick auf den Umschalter danach ändert den Zustand frei bis zum nächsten Routenwechsel
 *    (QA-Befund 18.09.2026: eine ODER-Verknüpfung ließ die Spalte auf '#/chat' nie schließen).
 * 2. Persona-Knopf (#persona-kopf-oeffner) und Wortmarke der Sidebar (#shell-marke) holen die
 *    Startfläche zurück (views/start.js, zeigeStartflaeche()).
 * 3. Projektauswahl im Kopf (#kopf-projekt-auswahl, A4): setzt das aktive Projekt über
 *    setzeAktivesProjekt() — derselbe Weg wie „Öffnen“ in der Projekte-Übersicht; der
 *    Neuladen-Hook (F-860) lädt danach die projektgebundenen Daten neu. Steht die Route auf
 *    einem Detail des alten Projekts (#/runs/<id>, #/workflows/<id>, #/workboard/<id>), ersetzt
 *    der Wechsel sie durch die Liste (location.replace — „Zurück“ führt nicht in das fremde
 *    Detail). Fehlt das Register (Start gescheitert), lädt der Fokus auf die Auswahl es neu.
 *    „+“ daneben (F-862) öffnet das Anlegeformular (F41) in der Projekte-Übersicht.
 * 4. Sprachwahl (select, setzeSprache aus i18n.js — lädt neu) und Hell/Dunkel-Schalter
 *    (theme.js) im Kopf. Beide <select> hängen an der Tastatur-Bremse (auswahl-bremse.js):
 *    Maus sofort, Pfeiltaste im geschlossenen Feld erst mit Enter oder beim Verlassen, Escape
 *    verwirft (WCAG 3.2.2, QA-Pass WS-1a). Unter 420 px zeigt die Sprachwahl nur den Code
 *    (DE/EN/TR/RU), damit Projektauswahl und Sprache lesbar bleiben (design-guardian WS-1b).
 * 5. Sidebar: statische Texte übersetzen (uebersetzeDokument), „Zuletzt geöffnet“
 *    (zuletzt-geoeffnet.js, Logik unverändert) rendern, unter 700 px das ausklappbare Menü
 *    (#shell-menue-oeffner, Vorlage .mobile-menu). „Einstellungen“ und das Profil führen nach
 *    '#/einstellungen'; ist die Seite schon offen, setzt ein Klick nur den Fokus.
 *
 * Entfallen mit WS-1b: Banner-Partikel (particle-drift.js), Schnellzugriff-Box, Nutzerkarte
 * samt Dropdown und Status-Chip (F-878). Ihre Funktionen stehen jetzt im Kopf bzw. in der
 * Sidebar (siehe 1–5); der Bewegungsschalter liegt auf der Seite Einstellungen.
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initShell beim Bootstrap, vor starteRouter())
 */

import { beiBestaetigterAuswahl } from './auswahl-bremse.js'
import { SPRACHEN, aktuelleSprache, setzeSprache, t, uebersetzeDokument } from './i18n.js'
import { holeAktivesProjekt, ladeProjektAuswahl, projektAusListe, projektListeFehlt, renderProjektKontext, setzeAktivesProjekt } from './projekt-kontext.js'
import { escapeHtml } from './render.js'
import { navigiere } from './router.js'
import { abonniereThemeWechsel, aktuellesTheme, setzeTheme } from './theme.js'
import { fokussiereEinstellungen } from './views/einstellungen.js'
import { oeffneAnlegenFormularAusKopf } from './views/projekte-uebersicht.js'
import { zeigeStartflaeche } from './views/start.js'
import { holeVerlauf } from './zuletzt-geoeffnet.js'

const CHAT_OFFEN_SCHLUESSEL = 'leitstand-chat-offen'

/** Detailrouten, deren ID an ein Projekt gebunden ist, und die Liste, zu der ein Projektwechsel führt. */
const DETAIL_ROUTEN = [
  { muster: /^#\/runs\/.+/, liste: '#/runs' },
  { muster: /^#\/workflows\/.+/, liste: '#/runs' },
  { muster: /^#\/workboard\/.+/, liste: '#/workboard' },
]

/** Unter dieser Breite zeigt die Sprachwahl nur den Code (Datei-Kommentar 4). */
const SCHMAL = '(max-width: 420px)'

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

/** Spiegelt chatSpalteSichtbar auf Spalte und Umschalter. F30 WS-1: .chat-grossansicht, solange die Route '#/chat' ist — reine Layout-Markierung für style.css. */
function wendeChatSichtbarkeitAn() {
  const spalte = document.getElementById('shell-chat-spalte')
  spalte.hidden = !chatSpalteSichtbar
  spalte.classList.toggle('chat-grossansicht', location.hash === '#/chat')
  document.getElementById('chat-umschalter').setAttribute('aria-pressed', String(chatSpalteSichtbar))
}

/** Bei jedem ECHTEN Routenwechsel: Chatspalte nach (a)/(b)/(c), „Zuletzt geöffnet“ neu (ein merkeGeoeffnet() geht immer einem navigiere() voraus), mobiles Menü zu. */
function beiRoutenwechsel() {
  if (location.hash === '#/chat') {
    chatSpalteSichtbar = true
  } else if (location.hash === '#/start') {
    chatSpalteSichtbar = false
  } else {
    chatSpalteSichtbar = gespeicherteChatPraeferenz()
  }
  wendeChatSichtbarkeitAn()
  renderZuletztGeoeffnet()
  setzeMenue(false)
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

/** Persona-Knopf im Kopf und Wortmarke der Sidebar öffnen die Startfläche (Vorlage: Wortmarke → '#/start'). */
function initStartflaechenOeffner() {
  document.getElementById('persona-kopf-oeffner').addEventListener('click', () => zeigeStartflaeche())
  document.getElementById('shell-marke').addEventListener('click', (ereignis) => {
    // Strg-, Umschalt- oder Mittelklick bleibt ein normaler Link (neuer Tab).
    if (ereignis.button !== 0 || ereignis.ctrlKey || ereignis.metaKey || ereignis.shiftKey || ereignis.altKey) return
    ereignis.preventDefault()
    zeigeStartflaeche()
  })
}

/** Projektauswahl und „+“ im Kopf (Datei-Kommentar 3). */
function initProjektAuswahl() {
  const auswahl = document.getElementById('kopf-projekt-auswahl')
  renderProjektKontext()
  void ladeProjektAuswahl()
  auswahl.addEventListener('focus', () => {
    if (projektListeFehlt()) void ladeProjektAuswahl()
  })
  beiBestaetigterAuswahl(auswahl, () => {
    if (auswahl.value === holeAktivesProjekt().id) return
    const projekt = projektAusListe(auswahl.value)
    if (projekt === null) {
      // Nur möglich, wenn das Register zwischenzeitlich neu geladen wurde — Auswahl zurücksetzen.
      console.error(`Projektauswahl: unbekanntes Projekt ${auswahl.value}`)
      renderProjektKontext()
      return
    }
    setzeAktivesProjekt(projekt)
    const detail = DETAIL_ROUTEN.find((route) => route.muster.test(location.hash))
    // replace statt navigiere: kein Verlaufseintrag auf das Detail des alten Projekts; der Router
    // folgt über hashchange.
    if (detail !== undefined) location.replace(detail.liste)
  }, renderProjektKontext)
  document.getElementById('kopf-neues-projekt').addEventListener('click', () => oeffneAnlegenFormularAusKopf())
}

/** Sprachwahl im Kopf (Datei-Kommentar 4). */
function initSprachwahl() {
  const auswahl = document.getElementById('kopf-sprache')
  const namen = { de: t('sprache.de'), en: t('sprache.en'), tr: t('sprache.tr'), ru: t('sprache.ru') }
  const schmal = window.matchMedia?.(SCHMAL)
  const render = () => {
    const nurCode = schmal?.matches === true
    auswahl.innerHTML = SPRACHEN.map((code) => `<option value="${code}" lang="${code}"${nurCode ? ` aria-label="${escapeHtml(namen[code])}"` : ''}>${escapeHtml(nurCode ? code.toUpperCase() : namen[code])}</option>`).join('')
    auswahl.value = aktuelleSprache()
  }
  schmal?.addEventListener('change', render)
  render()
  beiBestaetigterAuswahl(auswahl, () => {
    if (auswahl.value === aktuelleSprache()) return
    if (!setzeSprache(auswahl.value)) {
      // Speicher gesperrt: nicht neu laden, Auswahl zurück und den Grund am Feld nennen.
      auswahl.value = aktuelleSprache()
      auswahl.title = t('einstellungen.sprache.fehler')
    }
  }, () => {
    auswahl.value = aktuelleSprache()
  })
}

/** Hell/Dunkel-Schalter im Kopf (Vorlage .theme-toggle: ☼ im dunklen, ☾ im hellen Design). */
function initThemeSchalter() {
  const schalter = document.getElementById('kopf-theme')
  const render = () => {
    const hell = aktuellesTheme() === 'light'
    schalter.textContent = hell ? '☾' : '☼'
    schalter.setAttribute('aria-label', hell ? t('kopf.themeDunkel') : t('kopf.themeHell'))
  }
  schalter.addEventListener('click', () => setzeTheme(aktuellesTheme() === 'light' ? 'dark' : 'light'))
  abonniereThemeWechsel(render)
  render()
}

/**
 * Öffnet oder schließt das Menü unter 700 px (Vorlage body.menu-open). Über 700 px wirkt die
 * Klasse nicht (style.css).
 * @param offen - true: Sidebar einblenden
 */
function setzeMenue(offen) {
  const oeffner = document.getElementById('shell-menue-oeffner')
  document.getElementById('shell').classList.toggle('menue-offen', offen)
  oeffner.setAttribute('aria-expanded', String(offen))
  oeffner.setAttribute('aria-label', offen ? t('kopf.menueSchliessen') : t('kopf.menue'))
}

/** Menü-Mechanik: Knopf, Escape, Klick außerhalb; ein Routenwechsel schließt es (beiRoutenwechsel). */
function initMenue() {
  const oeffner = document.getElementById('shell-menue-oeffner')
  const sidebar = document.getElementById('shell-sidebar')
  const istOffen = () => oeffner.getAttribute('aria-expanded') === 'true'
  oeffner.addEventListener('click', () => {
    setzeMenue(!istOffen())
    // Erster Fokus auf der Navigation, nicht auf der Wortmarke (die öffnet die Startfläche).
    if (istOffen()) document.querySelector('#shell-nav a')?.focus()
  })
  // Ein Klick auf einen Eintrag schließt das Menü — auch auf den schon aktiven (kein hashchange).
  sidebar.addEventListener('click', (ereignis) => {
    if (ereignis.target instanceof Element && ereignis.target.closest('a, .zuletzt-eintrag') !== null) setzeMenue(false)
  })
  document.addEventListener('keydown', (ereignis) => {
    if (ereignis.key !== 'Escape' || !istOffen()) return
    setzeMenue(false)
    oeffner.focus()
  })
  document.addEventListener('click', (ereignis) => {
    if (!istOffen() || sidebar.contains(ereignis.target) || oeffner.contains(ereignis.target)) return
    setzeMenue(false)
  })
}

/** „Einstellungen“ und Profil: ist die Seite schon offen, gibt es kein hashchange — dann nur den Fokus setzen (sonst bliebe er in der Sidebar). */
function initEinstellungenLinks() {
  for (const link of document.querySelectorAll('#shell-sidebar a[href="#/einstellungen"]')) {
    link.addEventListener('click', () => {
      if (location.hash === '#/einstellungen') fokussiereEinstellungen()
    })
  }
}

/** Rendert „Zuletzt geöffnet“ (zuletzt-geoeffnet.js); ohne Einträge bleibt der Block ausgeblendet (keine erfundenen Einträge). */
function renderZuletztGeoeffnet() {
  const verlauf = holeVerlauf()
  document.getElementById('shell-zuletzt').hidden = verlauf.length === 0
  document.getElementById('zuletzt-verlauf').innerHTML = verlauf
    .map(
      (eintrag) =>
        `<button type="button" class="zuletzt-eintrag" data-hash="${escapeHtml(eintrag.hash)}">
          <span class="status-punkt ${escapeHtml(eintrag.statusKategorie)}" aria-hidden="true"></span>
          <span class="zuletzt-eintrag-label">${escapeHtml(eintrag.label)}</span>
        </button>`
    )
    .join('')
}

function initZuletztGeoeffnet() {
  document.getElementById('zuletzt-verlauf').addEventListener('click', (ereignis) => {
    const knopf = ereignis.target.closest('.zuletzt-eintrag')
    if (knopf === null) return
    navigiere(knopf.dataset.hash)
  })
  renderZuletztGeoeffnet()
}

/** Initialisiert alle Shell-Verdrahtungen einmalig beim Bootstrap. */
export function initShell() {
  uebersetzeDokument()
  initMenue()
  initChatUmschalter()
  initStartflaechenOeffner()
  initProjektAuswahl()
  initSprachwahl()
  initThemeSchalter()
  initEinstellungenLinks()
  initZuletztGeoeffnet()
}
