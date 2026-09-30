/**
 * Datei: public/leitstand/projekt-kontext.js
 *
 * Zweck: F25 WS-2a (AK13/AK14) — hält das aktuell aktive Projekt (id/name)
 * und rendert die Kontext-Anzeige in der Kopfzeile. Seit F44 WS-1b (Abgleich
 * F-725 A4) ist diese Anzeige die Projektauswahl im Kopf (#kopf-projekt-auswahl,
 * ein <select> aus GET /api/projekte); die frühere Leiste #projekt-kontext mit
 * „Projekt wechseln“ entfällt, der Container wird nicht mehr gebraucht. Die
 * Auswahl setzt das Projekt über setzeAktivesProjekt() — denselben Weg wie
 * „Öffnen“ in der Projekte-Übersicht; die Bedienung verdrahtet shell.js. Getrennt von api.js: api.js kennt nur
 * den Fetch-Präfix (AK10), dieses Modul zusätzlich das menschenlesbare
 * Projekt und die DOM-Anzeige — setzeAktivesProjekt() hält beides
 * synchron in einem Aufruf, damit nie eines ohne das andere aktualisiert
 * wird.
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (renderProjektKontext beim Bootstrap)
 * - public/leitstand/shell.js (holeAktivesProjekt, renderProjektKontext, ladeProjektAuswahl, projektAusListe,
 *   projektListeFehlt, setzeAktivesProjekt — Kopf, F44 WS-1b)
 * - public/leitstand/views/projekte-uebersicht.js (ladeProjektAuswahl nach dem Anlegen, F44 WS-1b)
 * - public/leitstand/views/platzhalter.js (holeAktivesProjekt, abonniereProjektWechsel, F44 WS-1b)
 * - public/leitstand/views/projekte-uebersicht.js (setzeAktivesProjekt bei Kartenklick, AK13)
 * - public/leitstand/views/chat.js (abonniereProjektWechsel, F26 WS-2a — Reset des projektgebundenen Client-Zustands)
 * - public/leitstand/views/workboard.js, views/dashboard.js, views/projekt.js (abonniereProjektWechsel,
 *   F44 WS-1a / F-860 — zentraler Neuladen-Hook: projektgebundene Daten, die sonst nur beim
 *   Bootstrap geladen würden, laden beim Wechsel neu)
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

import { holeProjekte, setzeAktivesProjektPraefix } from './api.js'
import { t } from './i18n.js'
import { escapeHtml } from './render.js'
import { pollJetzt, verwerfeLaufendenZustand } from './zustand.js'

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
  // F44 WS-1a (F-860): ein laufender Zustands-Abruf gehört zum alten Projekt — verwerfen und sofort
  // einen Abruf mit dem neuen Präfix anstoßen (zustand.js), statt bis zum nächsten Tick zu warten.
  verwerfeLaufendenZustand()
  // F44 WS-1a (F-860): ein werfender Abonnent darf die übrigen nicht blockieren — sonst bliebe
  // z. B. das Workboard beim alten Projekt stehen, nur weil der Chat-Reset scheitert.
  for (const fn of projektWechselAbonnenten) {
    try {
      fn()
    } catch (fehler) {
      console.error('Projektwechsel: ein Abonnent ist fehlgeschlagen:', fehler)
    }
  }
  renderProjektKontext()
  void pollJetzt()
}

/** F44 WS-1b: zuletzt geladenes Projektregister ([{ id, name }]) oder null, solange noch nichts geladen ist. */
let projektListe = null
/** F44 WS-1b: true, wenn der letzte Abruf des Registers scheiterte. */
let projektListeFehler = false

/**
 * Rendert die Kontext-Anzeige (AK14): seit F44 WS-1b die Projektauswahl im Kopf. Das aktive
 * Projekt steht immer als Option darin — auch vor dem ersten Abruf und nach einem Fehler, dann
 * als einzige Option (der Leitstand arbeitet ja weiter in diesem Projekt). Ein Fehler steht
 * sichtbar als deaktivierte Option und im title der Auswahl; geloggt hat ihn ladeProjektAuswahl(),
 * neu geladen wird beim nächsten Fokus auf die Auswahl (shell.js).
 */
export function renderProjektKontext() {
  const auswahl = document.getElementById('kopf-projekt-auswahl')
  if (auswahl === null) return
  const liste = projektListe ?? []
  const eintraege = liste.some((p) => p.id === aktivesProjekt.id) ? liste : [aktivesProjekt, ...liste]
  const fehlerOption = projektListeFehler ? `<option value="" disabled>${escapeHtml(t('kopf.projekteFehler'))}</option>` : ''
  auswahl.innerHTML = eintraege.map((p) => `<option value="${escapeHtml(p.id)}"${p.id === aktivesProjekt.id ? ' selected' : ''}>${escapeHtml(p.name)}</option>`).join('') + fehlerOption
  auswahl.value = aktivesProjekt.id
  auswahl.title = projektListeFehler ? t('kopf.projekteFehler') : ''
}

/**
 * F44 WS-1b: Lädt das Projektregister (GET /api/projekte, unpräfigiert) für die Auswahl im Kopf
 * und rendert sie neu. Beim Bootstrap und nach dem Anlegen eines Projekts. Wirft nie.
 */
export async function ladeProjektAuswahl() {
  try {
    const daten = await holeProjekte()
    projektListe = daten.projekte.map((p) => ({ id: p.id, name: p.name }))
    projektListeFehler = false
  } catch (fehler) {
    console.error('Projektauswahl: Register konnte nicht geladen werden:', fehler)
    projektListeFehler = true
  }
  renderProjektKontext()
}

/** F44 WS-1b: @returns true, solange das Register nicht geladen ist oder der letzte Abruf scheiterte (shell.js lädt dann beim Fokus neu). */
export function projektListeFehlt() {
  return projektListe === null || projektListeFehler
}

/**
 * F44 WS-1b: Sucht ein Projekt des zuletzt geladenen Registers.
 * @param id - Projekt-id aus der Auswahl
 * @returns { id, name } oder null
 */
export function projektAusListe(id) {
  return (projektListe ?? []).find((p) => p.id === id) ?? null
}
