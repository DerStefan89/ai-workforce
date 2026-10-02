/**
 * Datei: public/leitstand/shell.js
 *
 * Zweck: Verdrahtung der Shell — Sidebar und Kopf der Vorlage V10 (F44 WS-1b, F-725,
 * Abgleich A3/A4/A5/A9/A10/A14), dazu das Chat-Dock (F44 WS-8a, Abgleich L1). Keine View-Logik,
 * keine Serverdaten außer dem Projektregister für die Auswahl (projekt-kontext.js).
 *
 * 1. Chat-Dock und große Ansicht (F44 WS-8a, Vorlage V10 chatDock): #shell-chat-spalte trägt
 *    EIN DOM (#view-chat, views/chat.js) für beides; die Lage setzt wendeChatSichtbarkeitAn per
 *    Klasse. Auf '#/chat' ist es die große Ansicht (.chat-grossansicht, #shell.chat-gross blendet
 *    den Hauptbereich aus), sonst das überlagerte Popover unten rechts — offen oder zu nach dem
 *    eigenen Zustand dockOffen: (a) '#/start' schließt es, (b) jede andere Route außer '#/chat'
 *    übernimmt die in localStorage gemerkte Präferenz (Schlüssel wie seit F29 WS-1a). Beide
 *    greifen nur bei einem ECHTEN 'hashchange'; ein Klick auf einen Auslöser ändert den Zustand
 *    danach frei bis zum nächsten Routenwechsel. Auslöser sind #chat-umschalter („Frag Jarvis“
 *    im Kopf) und #chat-blase (unten rechts) — beide mit aria-expanded/aria-controls. Öffnen
 *    fokussiert #chat-eingabe; Escape (Fokus im Dock oder auf einem Auslöser) und „×“ schließen
 *    und geben den Fokus an den Auslöser zurück. Kein Fokusfang, keine Live-Region. „↗“ öffnet
 *    '#/chat' (der Modus bleibt, views/chat.js), „Gespräch verkleinern“ führt zur zuletzt
 *    gemerkten Seite (merkeRoute, chat-anzeige.js; ohne Merker die Produktübersicht) mit offenem
 *    Dock zurück. Auf '#/chat' trägt das Dock role=main (der Hauptbereich ist ausgeblendet) und
 *    der Kopfknopf kein aria-expanded; ein Projektwechsel bildet ein gemerktes Detail des alten
 *    Projekts auf dessen Liste ab (DETAIL_ROUTEN). Ist localStorage gesperrt, gilt die Präferenz
 *    im Modul weiter.
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
import { istGrossansicht, merkeRoute, zielBeimVerkleinern } from './chat-anzeige.js'
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
  { muster: /^#\/runs\/.+/, liste: '#/ausfuehrungen' },
  { muster: /^#\/workflows\/.+/, liste: '#/runs' },
  { muster: /^#\/workboard\/.+/, liste: '#/workboard' },
]

/** Unter dieser Breite zeigt die Sprachwahl nur den Code (Datei-Kommentar 4). */
const SCHMAL = '(max-width: 420px)'

/** Ist das Dock (außerhalb von '#/chat') offen? — s. Datei-Kommentar 1 (a)/(b). */
let dockOffen = false

/** Zuletzt geöffnete Seite außer '#/chat' und '#/start' — Ziel von „Gespräch verkleinern“. */
let gemerkteRoute = null

/** Der Auslöser, der das Dock zuletzt geöffnet hat — bekommt beim Schließen den Fokus zurück. */
let letzterAusloeser = null

/** Zuletzt gesetzte Präferenz im Modul — gilt, wenn localStorage gesperrt ist (QA-Pass WS-8a: sonst schlösse das folgende hashchange ein gerade geöffnetes Dock wieder). */
let chatPraeferenzImModul = null

function gespeicherteChatPraeferenz() {
  try {
    return localStorage.getItem(CHAT_OFFEN_SCHLUESSEL) === 'true'
  } catch {
    return chatPraeferenzImModul === true
  }
}

function speichereChatPraeferenz(offen) {
  chatPraeferenzImModul = offen
  try {
    localStorage.setItem(CHAT_OFFEN_SCHLUESSEL, String(offen))
  } catch {
    // Privates Fenster/blockierter Zugriff — die Präferenz gilt dann nur für diese Sitzung (chatPraeferenzImModul), kein Absturz (Muster projekt-kontext.js).
  }
}

/** Spiegelt Route und dockOffen auf Dock, Auslöser, Blase und „Gespräch verkleinern“ (Datei-Kommentar 1). */
function wendeChatSichtbarkeitAn() {
  const dock = document.getElementById('shell-chat-spalte')
  const gross = istGrossansicht(location.hash)
  dock.hidden = !(gross || dockOffen)
  dock.classList.toggle('chat-grossansicht', gross)
  document.getElementById('shell').classList.toggle('chat-gross', gross)
  // Auf '#/chat' ist das Gespräch der Hauptinhalt der Seite (<main> ist ausgeblendet) — sonst ein
  // ergänzender Bereich (QA-Pass/design-guardian WS-8a).
  if (gross) dock.setAttribute('role', 'main')
  else dock.removeAttribute('role')
  const umschalter = document.getElementById('chat-umschalter')
  const blase = document.getElementById('chat-blase')
  // Auf '#/chat' lässt sich nichts zuklappen — der Kopfknopf trägt dort kein aria-expanded (QA-Pass WS-8a).
  if (gross) umschalter.removeAttribute('aria-expanded')
  else umschalter.setAttribute('aria-expanded', String(dockOffen))
  blase.setAttribute('aria-expanded', String(dockOffen))
  blase.hidden = gross
  if (dockOffen && !gross) {
    // Wie die Vorlage (chatDock): beim Öffnen steht der Verlauf am Ende (neueste Antwort, Tippanzeige).
    const verlauf = document.getElementById('chat-verlauf')
    verlauf.scrollTop = verlauf.scrollHeight
  }
}

/**
 * Öffnet oder schließt das Dock, merkt die Präferenz und setzt den Fokus: beim Öffnen auf die
 * Eingabe, beim Schließen zurück auf den Auslöser (ohne bekannten Auslöser auf die Blase).
 * @param offen - true: Dock öffnen
 * @param ausloeser - das auslösende Element (nur beim Öffnen gemerkt)
 */
function setzeDock(offen, ausloeser) {
  dockOffen = offen
  speichereChatPraeferenz(offen)
  wendeChatSichtbarkeitAn()
  if (offen) {
    letzterAusloeser = ausloeser ?? null
    document.getElementById('chat-eingabe').focus()
    return
  }
  const ruecksprung = letzterAusloeser ?? document.getElementById('chat-blase')
  ruecksprung.focus()
}

/** Bei jedem ECHTEN Routenwechsel: Rückkehrziel merken, Dock nach (a)/(b), „Zuletzt geöffnet“ neu (ein merkeGeoeffnet() geht immer einem navigiere() voraus), mobiles Menü zu. */
function beiRoutenwechsel() {
  gemerkteRoute = merkeRoute(gemerkteRoute, location.hash)
  if (location.hash === '#/start') {
    dockOffen = false
  } else if (!istGrossansicht(location.hash)) {
    dockOffen = gespeicherteChatPraeferenz()
  }
  wendeChatSichtbarkeitAn()
  renderZuletztGeoeffnet()
  setzeMenue(false)
}

/** Auslöser, Dock-Kopf, Escape und „Gespräch verkleinern“ (Datei-Kommentar 1). */
function initChatDock() {
  const dock = document.getElementById('shell-chat-spalte')
  const umschalter = document.getElementById('chat-umschalter')
  const blase = document.getElementById('chat-blase')
  for (const ausloeser of [umschalter, blase]) {
    ausloeser.addEventListener('click', () => {
      // Auf '#/chat' ist das Gespräch schon groß offen — der Kopfknopf führt nur in die Eingabe.
      if (istGrossansicht(location.hash)) {
        document.getElementById('chat-eingabe').focus()
        return
      }
      setzeDock(!dockOffen, ausloeser)
    })
  }
  document.getElementById('chat-schliessen').addEventListener('click', () => setzeDock(false))
  document.getElementById('chat-gross-oeffnen').addEventListener('click', () => {
    // Wie die Vorlage (expand-chat): das Dock gilt danach als zu; „Gespräch verkleinern“ öffnet es wieder.
    dockOffen = false
    speichereChatPraeferenz(false)
    navigiere('#/chat')
    wendeChatSichtbarkeitAn()
    document.getElementById('chat-eingabe').focus()
  })
  document.getElementById('chat-verkleinern').addEventListener('click', () => {
    speichereChatPraeferenz(true)
    dockOffen = true
    letzterAusloeser = null
    navigiere(zielBeimVerkleinern(gemerkteRoute))
    wendeChatSichtbarkeitAn()
    document.getElementById('chat-eingabe').focus()
  })
  document.addEventListener('keydown', (ereignis) => {
    // defaultPrevented: Escape hat schon eine innere Ebene geschlossen (Auftragsdialog, views/chat.js).
    if (ereignis.key !== 'Escape' || ereignis.defaultPrevented || !dockOffen || istGrossansicht(location.hash)) return
    const ziel = ereignis.target
    if (!(ziel instanceof Node) || !(dock.contains(ziel) || umschalter.contains(ziel) || blase.contains(ziel))) return
    setzeDock(false)
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
    // F44 WS-8a (QA-Pass): auch die für „Gespräch verkleinern“ gemerkte Seite darf nicht im Detail
    // des alten Projekts bleiben — dieselbe Abbildung auf die Liste wie für die aktuelle Route.
    const gemerktesDetail = DETAIL_ROUTEN.find((route) => gemerkteRoute !== null && route.muster.test(gemerkteRoute))
    if (gemerktesDetail !== undefined) gemerkteRoute = gemerktesDetail.liste
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
  initChatDock()
  initStartflaechenOeffner()
  initProjektAuswahl()
  initSprachwahl()
  initThemeSchalter()
  initEinstellungenLinks()
  initZuletztGeoeffnet()
}
