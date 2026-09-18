/**
 * Datei: public/leitstand/views/start.js
 *
 * Zweck: F29 WS-1a — Startfläche `#/start`, eine eigene View (kein Overlay).
 * Zeigt die Persona groß und zentriert (Variante 'gross', wiederverwendet
 * über persona.js' exportiertes montierePersona() — siehe dessen
 * Kopfkommentar: keine zweite Lid-/Awakening-Mechanik). Nach dem Erwachen
 * übernimmt die Persona ihren echten Zustand aus leitePersonaZustandAb()
 * (dieselbe Ableitung wie persona.js/#persona-text-status); eine eigene,
 * NICHT aria-live-Zeile benennt zusätzlich, was konkret wartet (Auftrag:
 * "2 Entscheidungen warten") — #persona-text-status bleibt die einzige
 * aria-live-Quelle im Dokument, diese Zeile ist reiner Sichttext.
 *
 * Einmal-pro-Sitzung-Regel (sessionStorage, Konvention projekt-kontext.js):
 * leiteBeimStartEin() wird von app.js VOR dem ersten Router-Dispatch
 * aufgerufen und setzt den Hash nur dann auf '#/start', wenn (a) diese
 * Sitzung die Fläche noch nicht gezeigt hat UND (b) der Hash leer ist (ein
 * Reload/Deeplink auf eine andere View wird respektiert, kein erzwungener
 * Sprung dorthin). Ein Reload/Deeplink auf exakt '#/start' NACH bereits
 * gezeigter Fläche leitet in beimBetreten() sofort zu '#/dashboard' weiter
 * (Auftrag: "Reloads und Deeplinks überspringen sie") — AUSSER
 * zeigeStartflaeche() (Klick auf die Persona-Kachel, shell.js) hat den
 * nächsten Eintritt ausdrücklich erzwungen.
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initStartView beim Bootstrap, leiteBeimStartEin vor starteRouter())
 * - public/leitstand/shell.js (zeigeStartflaeche, Klick auf die Persona-Kachel)
 */

import { registriere, navigiere, unterdrueckeFolgendesHashchange } from '../router.js'
import { montierePersona } from '../persona.js'
import { abonniere } from '../zustand.js'
import { leitePersonaZustandAb } from '../persona-state.js'
import { filtereAttentionLaeufe, filtereAttentionWorkflows } from '../attention-daten.js'

const SESSION_SCHLUESSEL = 'leitstand-start-gezeigt'
// Deckt sich mit persona.js' AWAKENING_DAUER_MS / der CSS-Keyframe-Dauer (--motion-awakening,
// style.css) — dieselbe Mechanik, hier für einen erzwungenen Re-Eintritt erneut ausgelöst.
const AWAKENING_DAUER_MS = 1200

let personaHost = null
let letzterZustand = null
let erzwingeNaechstenEintritt = false

/**
 * QA-Hinweis 18.09.2026: prüft bewusst NICHT selbst die OS-Präferenz (anders als
 * persona.js' eigene reduzierteBewegungAktiv()), sondern liest nur das von persona.js
 * gespiegelte Root-Attribut — korrekt NUR, weil app.js initPersona() (setzt das Attribut beim
 * Bootstrap) vor jedem möglichen ersten Dispatch auf '#/start' aufruft (Reihenfolge-Kommentar
 * dort). Eine künftige Umordnung der init-Aufrufe müsste diese Abhängigkeit erhalten.
 */
function reduzierteBewegungAktiv() {
  return document.documentElement.dataset.reduzierteBewegung === 'true'
}

/** Text der Sichtzeile unter der Persona — konkreter als persona.js' generischer ZUSTAND_TEXT, weil hier Platz für eine Zahl ist (Auftrag Punkt 4). @param zustand - Aggregat aus GET /api/zustand, oder null vor dem ersten Poll-Tick */
function ermittleWarteText(zustand) {
  if (zustand === null) return 'Lädt…'
  const persona = leitePersonaZustandAb(zustand)
  if (persona === 'error') {
    const anzahl = (zustand.startfehler?.length ?? 0) + (filtereAttentionLaeufe(zustand.laeufe ?? null)?.length ?? 0)
    return anzahl > 0 ? `${anzahl} Punkt${anzahl === 1 ? '' : 'e'} brauchen Aufmerksamkeit` : 'Aktualisierung fehlgeschlagen'
  }
  if (persona === 'waiting_for_human') {
    const anzahl = filtereAttentionWorkflows(zustand.workflows ?? null)?.length ?? 0
    return `${anzahl} Entscheidung${anzahl === 1 ? '' : 'en'} warten`
  }
  if (persona === 'thinking') return 'Ein Lauf ist gerade aktiv'
  return 'Nichts wartet gerade'
}

function renderWarteText() {
  const zeile = document.getElementById('start-warte-hinweis')
  if (zeile !== null) zeile.textContent = ermittleWarteText(letzterZustand)
}

/** Baut die Startfläche einmalig beim Bootstrap — ein <button>, der die Fläche füllt (Auftrag: kein div mit Klick-Handler), Enter/Space aktivieren ihn nativ. */
function baueStartflaeche() {
  const container = document.getElementById('view-start')
  container.innerHTML = `
    <button type="button" id="start-flaeche" class="start-flaeche" aria-label="Leitstand betreten">
      <div id="start-persona-host" aria-hidden="true"></div>
      <p id="start-warte-hinweis" class="start-hinweis"></p>
      <p class="start-betreten-hinweis" aria-hidden="true">Eingabetaste oder Klick betritt den Leitstand.</p>
    </button>`
  document.getElementById('start-flaeche').addEventListener('click', () => navigiere('#/dashboard'))
  personaHost = document.getElementById('start-persona-host')
  montierePersona(personaHost, 'gross')
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

/** onEnter der Route '#/start' — Reload/Deeplink NACH bereits gezeigter Fläche weicht zum Dashboard aus, außer zeigeStartflaeche() hat diesen Eintritt erzwungen (Datei-Kommentar). */
function beimBetreten() {
  const erzwungen = erzwingeNaechstenEintritt
  erzwingeNaechstenEintritt = false
  if (bereitsGezeigt() && !erzwungen) {
    navigiere('#/dashboard')
    return
  }
  renderWarteText()
  if (!reduzierteBewegungAktiv()) {
    personaHost.classList.add('persona-awakening')
    setTimeout(() => personaHost.classList.remove('persona-awakening'), AWAKENING_DAUER_MS)
  }
  markiereGezeigt()
  document.getElementById('start-flaeche').focus()
}

/** Löst genau einmal pro Sitzung den automatischen Einstieg über '#/start' aus — vor dem ersten Router-Dispatch aufgerufen (app.js), respektiert einen bereits gesetzten, abweichenden Hash (Reload/Deeplink auf eine andere View). */
export function leiteBeimStartEin() {
  if (bereitsGezeigt()) return
  if (location.hash !== '' && location.hash !== '#/start') return
  if (location.hash !== '#/start') {
    // unterdrueckeFolgendesHashchange VOR der Zuweisung (router.js Datei-Kommentar dort): sonst
    // dispatcht starteRouter() gleich darauf synchron korrekt einmal, aber das dadurch
    // ausgelöste, verzögerte native hashchange-Event würde beimBetreten() ein zweites Mal
    // aufrufen — mit dann bereits gesetztem Sitzungsflag fälschlich sofort zum Dashboard weichend.
    unterdrueckeFolgendesHashchange('#/start')
    location.hash = '#/start'
  }
}

/** Holt die Startfläche gezielt zurück — Klick auf die Persona-Kachel in der Kopfzeile (shell.js), unabhängig vom Sitzungsflag. */
export function zeigeStartflaeche() {
  erzwingeNaechstenEintritt = true
  navigiere('#/start')
}

/** Initialisiert die Startfläche einmalig beim Bootstrap. */
export function initStartView() {
  baueStartflaeche()
  abonniere((zustand) => {
    letzterZustand = zustand
    renderWarteText()
  })
  registriere(/^#\/start$/, 'start', beimBetreten)
}
