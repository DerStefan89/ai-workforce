/**
 * Datei: public/leitstand/projekt-kontext.js
 *
 * Zweck: F25 WS-2a (AK13/AK14) — hält das aktuell aktive Projekt (id/name)
 * und rendert die Kontext-Anzeige in der Kopfzeile (Name + Bedienung
 * zurück zur Projekte-Übersicht). Getrennt von api.js: api.js kennt nur
 * den Fetch-Präfix (AK10), dieses Modul zusätzlich das menschenlesbare
 * Projekt und die DOM-Anzeige — setzeAktivesProjekt() hält beides
 * synchron in einem Aufruf, damit nie eines ohne das andere aktualisiert
 * wird.
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (renderProjektKontext beim Bootstrap)
 * - public/leitstand/views/projekte-uebersicht.js (setzeAktivesProjekt bei Kartenklick, AK13)
 * - public/leitstand/views/chat.js (abonniereProjektWechsel, F26 WS-2a — Reset des projektgebundenen Client-Zustands)
 *
 * Wichtig: STANDARD_PROJEKT entspricht dem Starteintrag 'ai-workforce' aus
 * projekte.json (F25 WS-1, AK1) — sein Präfix ist '/api' (api.js' eigener
 * Default, Regressionsschutz: unverändertes Verhalten ohne Projektwechsel).
 * NICHT '' — ein leerer Präfix ließe jeden mitPraefix()-Aufruf in api.js
 * sein eigenes '/api' verlieren (derselbe Fehler wie der ursprüngliche
 * Doppel-'/api'-Bug in die andere Richtung, real im AK15-Browser-Realtest
 * gefunden: nach dem Rückwechsel zu 'ai-workforce' schlug GET /zustand
 * fehl, weil hier fälschlich '' statt '/api' gesetzt wurde).
 *
 * QA-Pass 17.09.2026 (F-Befund, features/F25/feature.md "Bekannte
 * Grenzen"): ohne Persistenz ging das aktive Projekt bei jedem
 * Seiten-Reload kommentarlos auf 'ai-workforce' zurück — der Hash blieb
 * erhalten (z. B. '#/projekt'), sodass ein Schreibvorgang nach einem
 * unbeabsichtigten Reload unbemerkt im falschen Projekt gelandet wäre.
 * sessionStorage (überlebt einen Reload, nicht aber ein neues Tab/Fenster
 * — bewusst kein localStorage, ein alter Tab soll nicht dauerhaft ein
 * längst geschlossenes Fremdprojekt "merken") behebt das: der zuletzt
 * gewählte Projekt-Kontext wird beim Modul-Laden wiederhergestellt, BEVOR
 * app.js irgendeine View initialisiert oder der Router den ersten
 * dispatch() auslöst (Modul-Top-Level-Code läuft vor jedem Import-Aufrufer
 * in app.js). Ein privates Fenster/blockierter Zugriff wirft — try/catch
 * lässt die Seite dann einfach beim Default (ai-workforce) starten, kein
 * Absturz.
 */

import { setzeAktivesProjektPraefix } from './api.js'
import { escapeHtml } from './render.js'
import { navigiere } from './router.js'

const STANDARD_PROJEKT = { id: 'ai-workforce', name: 'AI Workforce' }
const SESSION_SCHLUESSEL = 'leitstand-aktives-projekt'

function praefixFuer(projekt) {
  return projekt.id === STANDARD_PROJEKT.id ? '/api' : `/api/projekte/${projekt.id}`
}

/** @returns das zuletzt in dieser Browser-Sitzung gewählte Projekt, oder null (nichts gespeichert, ungültiger Inhalt, oder sessionStorage nicht verfügbar). */
function leseGespeichertesProjekt() {
  try {
    const roh = sessionStorage.getItem(SESSION_SCHLUESSEL)
    if (roh === null) return null
    const geparst = JSON.parse(roh)
    return typeof geparst?.id === 'string' && typeof geparst?.name === 'string' ? geparst : null
  } catch {
    return null
  }
}

let aktivesProjekt = leseGespeichertesProjekt() ?? STANDARD_PROJEKT
setzeAktivesProjektPraefix(praefixFuer(aktivesProjekt))

/** @returns das aktuell aktive Projekt ({ id, name }) */
export function holeAktivesProjekt() {
  return aktivesProjekt
}

/**
 * F26 WS-2a (QA-Befund, real reproduziert): eine View mit eigenem, projektgebundenem
 * Client-Zustand (bislang nur views/chat.js — ausstehender Lauf, lokale Vorfilter-/
 * Fehleinträge) wurde bei einem Projektwechsel NICHT zurückgesetzt. Da die
 * 2-Sekunden-Poll-Detailauffrischer (zustand.js) projektübergreifend unverändert weiterlaufen,
 * pollte die Chat-View danach den alten Lauf über den NEUEN api.js-Präfix
 * (/api/projekte/<neu>/laeufe/<alte-laufId>) — 404 bei jedem Tick, für immer, der
 * Senden-Button blieb dauerhaft gesperrt, und die alte, fremde Nachricht blieb im neuen
 * Projekt sichtbar. abonniereProjektWechsel gibt solchen Views einen Reset-Haken, OHNE dass
 * dieses Modul (oder api.js) etwas über deren internen Zustand wissen muss.
 * @param fn - () => void, aufgerufen bei jedem setzeAktivesProjekt-Aufruf, NACH dem Präfixwechsel
 */
const projektWechselAbonnenten = []
export function abonniereProjektWechsel(fn) {
  projektWechselAbonnenten.push(fn)
}

/** Setzt das aktive Projekt UND den zugehörigen api.js-Präfix in einem Aufruf, merkt es sich für die Sitzung (Reload-Schutz, s.o.), benachrichtigt projektgebundene Views (s.o.) und rendert danach die Kopfzeile neu. @param projekt - { id, name } eines Registereintrags (GET /api/projekte) */
export function setzeAktivesProjekt(projekt) {
  aktivesProjekt = projekt
  setzeAktivesProjektPraefix(praefixFuer(projekt))
  try {
    sessionStorage.setItem(SESSION_SCHLUESSEL, JSON.stringify(projekt))
  } catch {
    // Privates Fenster/blockierter Zugriff — der Kontext gilt dann nur bis zum nächsten Reload,
    // kein Absturz (Muster oben, leseGespeichertesProjekt).
  }
  for (const fn of projektWechselAbonnenten) fn()
  renderProjektKontext()
}

/** Rendert die Kontext-Anzeige in der Kopfzeile (AK14) — Name des aktiven Projekts plus Bedienung zurück zur Übersicht. */
export function renderProjektKontext() {
  const container = document.getElementById('projekt-kontext')
  container.innerHTML = `Aktives Projekt: <strong>${escapeHtml(aktivesProjekt.name)}</strong> <button type="button" id="projekt-kontext-wechseln">Projekt wechseln</button>`
  document.getElementById('projekt-kontext-wechseln').addEventListener('click', () => navigiere('#/projekte-uebersicht'))
}
