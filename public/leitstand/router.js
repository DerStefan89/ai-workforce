/**
 * Datei: public/leitstand/router.js
 *
 * Zweck: Minimaler Hash-Router der Jarvis Shell (F20 AK2) — ohne
 * Build-Schritt, ohne Framework. Jede View registriert ihre eigenen Routen
 * (Muster/View-Name/optionaler onEnter-Callback); der Router entscheidet
 * ausschließlich, welcher `[data-view]`-Container sichtbar ist und welcher
 * Navigationslink als aktiv markiert wird. Was innerhalb einer View passiert
 * (welche Daten geladen werden), bleibt Sache der View selbst.
 *
 * Reload stellt die View wieder her (AK2), weil dispatch() beim Start genauso
 * läuft wie bei jedem hashchange — derselbe Code, kein Sonderfall.
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initRouter, einmalig beim Bootstrap)
 * - public/leitstand/views/*.js (registriere, dispatch; ersetzeRoute seit F44 WS-4a: views/workflows.js, views/workboard.js)
 *
 * Wichtig: dispatch() ist absichtlich synchron und öffentlich exportiert —
 * eine View, die per Klick zu einer anderen View navigiert (z. B. die
 * Wiederaufnahme-Bedienung von Runs nach Projekt), setzt `location.hash` und
 * ruft dispatch() selbst auf, um die Ziel-View SOFORT sichtbar zu machen
 * (scrollIntoView auf einem noch verborgenen `[hidden]`-Container wirkt
 * nicht). Der native hashchange-Event feuert danach ohnehin noch einmal für
 * denselben Hash — navigiere() unterdrückt GENAU dieses eine Folge-Event
 * (unterdrueckterHashchange), sonst liefe z. B. ladeLaufDetail() nach jedem
 * "Details"-Klick zweimal (doppelter Request, doppeltes scrollIntoView,
 * Code-Review-Befund F20 WS-1). Ein Dedup allein über den Hash-Wert wäre
 * hier bewusst FALSCH: ein zweiter Klick auf denselben, bereits offenen
 * "Details"-Button ändert `location.hash` nicht (der Browser feuert dann gar
 * kein hashchange), soll die Ansicht aber trotzdem neu laden — genau das
 * leistet der direkte dispatch()-Aufruf in navigiere() weiterhin.
 *
 * Zwei Views dürfen dasselbe Muster registrieren (z. B. Runs UND Workflows
 * schließen je ihr eigenes Detail-Panel bei exaktem `#/runs`) — dispatch()
 * ruft ALLE passenden onEnter-Callbacks auf, zeigt aber die View der ERSTEN
 * Übereinstimmung. Das erspart Cross-Imports zwischen Views nur für einen
 * Reset-Aufruf.
 *
 * F44 WS-8a: '#/chat' ist wieder eine gewöhnliche Route (View-Name 'chat') —
 * die große Gesprächsansicht. Ihr DOM liegt außerhalb von <main> (das Chat-Dock
 * der Shell, public/leitstand/shell.js), deshalb gibt es keinen
 * `[data-view="chat"]`-Container: zeigeView() blendet alle Hauptansichten aus,
 * kein Navigationslink trägt aria-current, und shell.js blendet den leeren
 * Hauptbereich aus. Die frühere Option { ueberlagert: true } (F29 WS-1a, Chat
 * als Spalte NEBEN einer Hauptansicht) entfällt damit.
 */

const STANDARD_HASH = '#/dashboard'

const routen = []

/** Hash, dessen NÄCHSTES hashchange-Event einmalig übersprungen wird — gesetzt von navigiere() direkt vor ihrem eigenen synchronen dispatch()-Aufruf, siehe Datei-Kommentar. */
let unterdrueckterHashchange = null

/**
 * Registriert eine Route.
 * @param muster - RegExp gegen den vollständigen Hash (inkl. '#'), z. B. /^#\/runs\/([^/]+)$/
 * @param view - Name des `[data-view]`-Containers, der bei Treffer sichtbar wird
 * @param onEnter - optional: wird mit den Capture-Gruppen von `muster` aufgerufen
 */
export function registriere(muster, view, onEnter) {
  routen.push({ muster, view, onEnter })
}

/** Blendet alle `[data-view]`-Container aus außer dem übergebenen und markiert den passenden Navigationslink (aria-current). @param view - Name des sichtbar zu haltenden Containers */
function zeigeView(view) {
  for (const element of document.querySelectorAll('[data-view]')) {
    element.hidden = element.dataset.view !== view
  }
  for (const link of document.querySelectorAll('[data-nav-view]')) {
    if (link.dataset.navView === view) {
      link.setAttribute('aria-current', 'page')
    } else {
      link.removeAttribute('aria-current')
    }
  }
}

/**
 * Liest den aktuellen Hash, findet die erste passende Route und wendet sie an.
 * Kein Treffer (unbekannter oder leerer Hash) fällt auf STANDARD_HASH zurück.
 */
export function dispatch() {
  const hash = location.hash === '' ? STANDARD_HASH : location.hash
  const treffer = routen.map((route) => ({ route, match: hash.match(route.muster) })).filter((x) => x.match !== null)
  if (treffer.length === 0) {
    if (hash !== STANDARD_HASH) {
      location.hash = STANDARD_HASH
      return
    }
    zeigeView('dashboard')
    return
  }
  // F-925: eine kaputte Prozent-Kodierung (z. B. '#/workboard/%E0%A4%A') wirft in
  // decodeURIComponent einen URIError. Dekodiert wird deshalb VOR dem Umschalten der View; scheitert
  // es, fällt die Seite ohne neuen History-Eintrag auf STANDARD_HASH zurück (Zurück führt so nicht
  // erneut in denselben kaputten Link) — keine onEnter-Callbacks mit halbem Zustand.
  let segmente
  try {
    segmente = treffer.map(({ match }) => match.slice(1).map((segment) => decodeURIComponent(segment)))
  } catch (fehler) {
    if (!(fehler instanceof URIError)) throw fehler
    console.warn(`[router] Hash '${hash}' ist nicht dekodierbar (${fehler.message}) — zurück zu ${STANDARD_HASH}.`)
    ersetzeRoute(STANDARD_HASH)
    return
  }
  zeigeView(treffer[0].route.view)
  treffer.forEach(({ route }, index) => {
    route.onEnter?.(...segmente[index])
  })
}

/**
 * F44 WS-4a (F-923, F-925): setzt den Hash OHNE neuen History-Eintrag (history.replaceState löst
 * kein hashchange aus) und dispatcht selbst — für Zustände, in die Browser-Zurück nicht wieder
 * führen soll (Detail des alten Projekts nach einem Projektwechsel, kaputter Deep-Link).
 * @param hash - vollständiger Ziel-Hash, z. B. '#/runs'
 */
export function ersetzeRoute(hash) {
  // Ein von navigiere() gesetzter Merker gilt dem ersetzten Hash; sein Folge-Ereignis sieht schon den
  // neuen — stehen gelassen unterdrückte er später ein echtes hashchange (Prüfpass WS-4a).
  unterdrueckterHashchange = null
  history.replaceState(history.state, '', hash)
  dispatch()
}

/** hashchange-Handler des Routers — überspringt genau ein von navigiere() bereits synchron verarbeitetes Folge-Event (siehe Datei-Kommentar), dispatcht sonst normal. */
function beiHashchange() {
  const hash = location.hash === '' ? STANDARD_HASH : location.hash
  if (hash === unterdrueckterHashchange) {
    unterdrueckterHashchange = null
    return
  }
  dispatch()
}

/** Startet den Router — einmalig beim Bootstrap, nachdem alle Views ihre Routen registriert haben. */
export function starteRouter() {
  window.addEventListener('hashchange', beiHashchange)
  if (location.hash === '') location.hash = STANDARD_HASH
  dispatch()
}

/** Navigiert programmatisch und zeigt die Ziel-View sofort (siehe Datei-Kommentar). Setzt die Unterdrückung NUR, wenn sich der Hash wirklich ändert (QA-Befund 18.09.2026: eine No-Op-Zuweisung auf den bereits aktiven Hash löst kein natives hashchange aus — das Flag bliebe sonst stehen und unterdrückte fälschlich ein SPÄTERES, echtes hashchange auf denselben Wert, z. B. über die Browser-History). @param hash - vollständiger Ziel-Hash, z. B. '#/projekt' */
export function navigiere(hash) {
  if (location.hash !== hash) unterdrueckterHashchange = hash
  location.hash = hash
  dispatch()
}

/**
 * F29 WS-1a: markiert `hash` so, dass dessen NÄCHSTES natives hashchange-Event übersprungen wird
 * (derselbe Mechanismus wie navigiere(), siehe Datei-Kommentar) — OHNE selbst zu dispatchen.
 * Für einen Hash-Wechsel VOR starteRouter()s eigenem, direkt anschließendem dispatch()-Aufruf
 * (views/start.js' leiteBeimStartEin(), einmal pro Sitzung auf '#/start'). navigiere() ist hier
 * bewusst NICHT verwendbar: es dispatcht selbst sofort — starteRouter() würde denselben Hash
 * Sekundenbruchteile später ein zweites Mal real dispatchen (dessen eigener,
 * `if (location.hash === '') location.hash = STANDARD_HASH`-Zweig läuft unbedingt weiter, gefolgt
 * von einem unbedingten dispatch()) und träfe damit z. B. bei '#/start' einen View-Zustand, den
 * dessen erster, korrekter Durchlauf soeben schon als "gezeigt" markiert hat.
 * @param hash - der Ziel-Hash, dessen Folge-Event unterdrückt werden soll
 */
export function unterdrueckeFolgendesHashchange(hash) {
  unterdrueckterHashchange = hash
}
