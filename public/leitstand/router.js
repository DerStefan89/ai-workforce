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
 * - public/leitstand/views/*.js (registriere, dispatch)
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

/** Blendet alle `[data-view]`-Container aus außer dem übergebenen. @param view - Name des sichtbar zu haltenden Containers */
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
  zeigeView(treffer[0].route.view)
  for (const { route, match } of treffer) {
    route.onEnter?.(...match.slice(1).map((segment) => decodeURIComponent(segment)))
  }
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

/** Navigiert programmatisch und zeigt die Ziel-View sofort (siehe Datei-Kommentar). @param hash - vollständiger Ziel-Hash, z. B. '#/projekt' */
export function navigiere(hash) {
  unterdrueckterHashchange = hash
  location.hash = hash
  dispatch()
}
