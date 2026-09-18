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
 *
 * F29 WS-1a (Shell-Umbau): registriere() akzeptiert optional { ueberlagert:
 * true } — Chat ist seither eine umschaltbare rechte Spalte
 * (public/leitstand/shell.js), kein `[data-view]`-Container in <main> mehr.
 * Eine überlagerte Route lässt die Sichtbarkeit der `<main>`-Views
 * unangetastet (zeigeView() überspringt für sie den Ausblend-Durchlauf) —
 * `#/chat` bleibt so ein echter, verlinkbarer Hash mit eigenem onEnter
 * (views/chat.js lädt den Verlauf), ohne beim Dispatch alle Hauptansichten
 * auszublenden. Die Navigationsmarkierung ([data-nav-view], aria-current)
 * folgt DESHALB nicht dem getroffenen Routennamen, sondern dem zuletzt real
 * sichtbar geschalteten Hauptbereich (aktiveHauptView unten) — sonst zeigte
 * die Sidebar "Chat" als aktiv, während <main> sichtbar unverändert z. B.
 * Dashboard zeigt (Code-Review-Befund 18.09.2026, F29 WS-1a: aria-current
 * behauptete dort fälschlich "aktuelle Seite" für eine nicht sichtbare
 * View). Trifft der ALLERERSTE Dispatch einer Sitzung direkt eine
 * überlagerte Route (z. B. ein Deeplink auf '#/chat' ohne vorherigen
 * Hauptbereich-Dispatch), gäbe es noch keine "zuletzt sichtbare" Hauptview
 * — zeigeView() weicht in diesem einen Fall auf STANDARD_HASH aus, damit
 * <main> nicht leer bleibt (dieselbe Rückfallregel wie dispatch() für einen
 * leeren Hash).
 */

const STANDARD_HASH = '#/dashboard'

const routen = []

/** Hash, dessen NÄCHSTES hashchange-Event einmalig übersprungen wird — gesetzt von navigiere() direkt vor ihrem eigenen synchronen dispatch()-Aufruf, siehe Datei-Kommentar. */
let unterdrueckterHashchange = null

/** Name der zuletzt real (nicht überlagert) sichtbar geschalteten `<main>`-View, oder null vor dem ersten derartigen Dispatch — Referenz für die Navigationsmarkierung bei einer überlagerten Route (Datei-Kommentar). */
let aktiveHauptView = null

/**
 * Registriert eine Route.
 * @param muster - RegExp gegen den vollständigen Hash (inkl. '#'), z. B. /^#\/runs\/([^/]+)$/
 * @param view - Name des `[data-view]`-Containers, der bei Treffer sichtbar wird
 * @param onEnter - optional: wird mit den Capture-Gruppen von `muster` aufgerufen
 * @param optionen - optional: { ueberlagert: true } lässt die `<main>`-Sichtbarkeit beim Dispatch unangetastet (Datei-Kommentar)
 */
export function registriere(muster, view, onEnter, optionen) {
  routen.push({ muster, view, onEnter, ueberlagert: optionen?.ueberlagert === true })
}

/** Blendet alle `[data-view]`-Container aus außer dem übergebenen — übersprungen für eine überlagerte Route (Datei-Kommentar). Die Navigationsmarkierung folgt in diesem Fall aktiveHauptView, nicht view (Datei-Kommentar). @param view - Name des sichtbar zu haltenden Containers @param ueberlagert - true, wenn die getroffene Route { ueberlagert: true } registriert hat */
function zeigeView(view, ueberlagert) {
  if (!ueberlagert) {
    aktiveHauptView = view
    for (const element of document.querySelectorAll('[data-view]')) {
      element.hidden = element.dataset.view !== view
    }
  } else if (aktiveHauptView === null) {
    // Allererster Dispatch überhaupt trifft direkt eine überlagerte Route — Rückfall auf
    // STANDARD_HASH, sonst bliebe <main> ohne jede sichtbare View (Datei-Kommentar).
    aktiveHauptView = STANDARD_HASH.slice(2)
    for (const element of document.querySelectorAll('[data-view]')) {
      element.hidden = element.dataset.view !== aktiveHauptView
    }
  }
  for (const link of document.querySelectorAll('[data-nav-view]')) {
    if (link.dataset.navView === aktiveHauptView) {
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
  zeigeView(treffer[0].route.view, treffer[0].route.ueberlagert)
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
