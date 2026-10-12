/**
 * Datei: public/leitstand/views/faehigkeiten-projekt.js
 *
 * Zweck: Bereich „Dieses Projekt“ der Capability Library (Seite Workforce `#/capabilities`, F45 F-2a; F-1012 Oberfläche):
 * lädt GET …/faehigkeiten des aktiven Projekts, rendert über faehigkeiten-projekt-anzeige.js und bedient Schalter
 * (POST …/aktivierung), „Freigeben nach Inhalt“ (POST …/freigabe mit dem angezeigten Hash) und „Datei geprüft – Stand
 * übernehmen“ (POST …/bestaetigung, F-1061 (3)). Nach jeder Änderung
 * wird der Status neu geladen; Antworten 409/400/404/500 erscheinen mit dem Grund des Servers.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/capabilities.js (initFaehigkeitenProjekt, ladeFaehigkeitenProjekt, setzeFaehigkeitenProjektZurueck)
 * - public/leitstand/views/faehigkeiten-projekt.test.mjs (node:test mit Schein-DOM)
 *
 * Wichtig:
 * - Nie im Poll: geladen beim Betreten der Seite, per „Neu laden“, beim Projektwechsel und nach einer eigenen Änderung.
 * - Überholschutz über ladeZaehler (eine Antwort nach einem Projektwechsel wird verworfen).
 * - Ereignisse per Delegation am Container — das Rendern ersetzt innerHTML, Handler bleiben.
 */

import { holeFaehigkeiten, sendeFaehigkeitAktivierung, sendeFaehigkeitBestaetigung, sendeFaehigkeitFreigabe } from '../api.js'
import { renderFaehigkeitenProjekt, renderFaehigkeitenProjektZustand } from '../faehigkeiten-projekt-anzeige.js'
import { t } from '../i18n.js'

/** Container des Bereichs (index.html). */
const CONTAINER_ID = 'faehigkeiten-projekt'

/** Zustand der Ansicht: letzter Status, offener Freigabe-Block, letzte Meldung, laufender POST. */
let zustand = { status: null, offeneFreigabe: null, meldung: null, beschaeftigt: false }
/** Überholschutz für Ladevorgänge. */
let ladeZaehler = 0
/** QA 4: Zähler der Projektwechsel — eine POST-Antwort aus einem früheren Projekt wird verworfen. */
let projektEpoche = 0

/** @returns der Container oder null (Seite ohne Bereich). */
function container() {
  return document.getElementById(CONTAINER_ID)
}

/** Zeichnet den aktuellen Zustand (nur mit Status). */
function zeichne() {
  const ziel = container()
  if (ziel === null || zustand.status === null) return
  ziel.innerHTML = renderFaehigkeitenProjekt(zustand.status, zustand)
  // Render-Nachweis: die Meldung steht oben — Fokus dorthin, damit sie nach einem Klick weiter unten gesehen wird.
  if (zustand.meldung !== null) ziel.querySelector('.fp-meldung')?.focus?.()
}

/**
 * Lädt den Status des aktiven Projekts und zeichnet ihn; ein Fehler erscheint im Bereich (catch + Logging).
 * @param optionen - { meldungBehalten: true behält die letzte Meldung (nach einer eigenen Änderung) }
 */
export async function ladeFaehigkeitenProjekt({ meldungBehalten = false } = {}) {
  const meine = ++ladeZaehler
  const ziel = container()
  if (ziel === null) return
  if (zustand.status === null) ziel.innerHTML = renderFaehigkeitenProjektZustand('laedt')
  try {
    const status = await holeFaehigkeiten()
    if (meine !== ladeZaehler) return
    zustand = { ...zustand, status, meldung: meldungBehalten ? zustand.meldung : null }
    zeichne()
  } catch (fehler) {
    if (meine !== ladeZaehler) return
    console.error('faehigkeiten-projekt: GET …/faehigkeiten fehlgeschlagen', fehler)
    zustand = { ...zustand, status: null }
    ziel.innerHTML = renderFaehigkeitenProjektZustand('fehler', fehler instanceof Error ? fehler.message : String(fehler))
  }
}

/**
 * Führt einen POST aus, setzt die Meldung (Erfolg oder Grund des Servers) und lädt neu.
 * @param anfrage - () => Promise<Response>
 * @param erfolgText - Meldung bei 200
 * @param konfliktText - optional: Text bei 409 vor dem Grund (z. B. „Inhalt hat sich geändert, neu laden“)
 */
async function sende(anfrage, erfolgText, konfliktText = null) {
  const epoche = projektEpoche
  zustand = { ...zustand, beschaeftigt: true, meldung: null }
  zeichne()
  let meldung
  try {
    const antwort = await anfrage()
    const koerper = await antwort.json().catch(() => ({}))
    if (antwort.ok) meldung = { art: 'ok', text: erfolgText }
    else {
      const grund = String(koerper.grund ?? antwort.status)
      meldung = { art: 'fehler', text: antwort.status === 409 && konfliktText !== null ? `${konfliktText} — ${grund}` : grund }
      console.error(`faehigkeiten-projekt: POST abgelehnt (${antwort.status})`, grund)
    }
  } catch (fehler) {
    console.error('faehigkeiten-projekt: POST fehlgeschlagen', fehler)
    meldung = { art: 'fehler', text: fehler instanceof Error ? fehler.message : String(fehler) }
  }
  // QA 4: Projekt inzwischen gewechselt → nichts übernehmen (der neue Zustand gehört dem neuen Projekt).
  if (epoche !== projektEpoche) return
  // QA 5: der Freigabe-Block schließt nach jeder Antwort — nach einer 409 zeigt das Neuladen einen neuen Hash, den Stefan
  // erst wieder öffnen und ansehen soll.
  zustand = { ...zustand, beschaeftigt: false, offeneFreigabe: null, meldung }
  await ladeFaehigkeitenProjekt({ meldungBehalten: true })
}

/**
 * Klick-Delegation: Schalter, Freigabe öffnen/bestätigen/abbrechen.
 * @param ereignis - click
 */
async function beiKlick(ereignis) {
  const ziel = ereignis.target instanceof Element ? ereignis.target.closest('[data-fp-schalter], [data-fp-freigabe-oeffnen], [data-fp-freigabe-bestaetigen], [data-fp-freigabe-abbrechen], [data-fp-bestaetigen]') : null
  if (ziel === null || ziel.disabled === true) return
  if (ziel.dataset.fpSchalter !== undefined) {
    const aktiv = ziel.dataset.fpZiel === 'true'
    // QA 1: der angezeigte Stand der lokalen Datei geht mit (der Server schreibt nichts, wenn sie sich geändert hat).
    await sende(() => sendeFaehigkeitAktivierung(ziel.dataset.fpSchalter, aktiv, zustand.status?.lokale_datei?.hash ?? undefined), t('faehigkeitenProjekt.meldung.gespeichert'))
    return
  }
  // F-1061 (3): Änderung von außen bestätigen — genau der angezeigte Stand (data-fp-bestaetigen = lokale_datei.hash).
  if (ziel.dataset.fpBestaetigen !== undefined) {
    await sende(() => sendeFaehigkeitBestaetigung(ziel.dataset.fpBestaetigen), t('faehigkeitenProjekt.meldung.bestaetigt'))
    return
  }
  if (ziel.dataset.fpFreigabeOeffnen !== undefined) {
    zustand = { ...zustand, offeneFreigabe: ziel.dataset.fpFreigabeOeffnen, meldung: null }
    zeichne()
    container()?.querySelector('[data-fp-freigabe-bestaetigen]')?.focus?.()
    return
  }
  if (ziel.dataset.fpFreigabeAbbrechen !== undefined) {
    zustand = { ...zustand, offeneFreigabe: null }
    zeichne()
    return
  }
  // Genau der angezeigte Hash geht mit (data-fp-hash) — der Server lehnt mit 409 ab, wenn der Inhalt sich geändert hat.
  await sende(() => sendeFaehigkeitFreigabe(ziel.dataset.fpFreigabeBestaetigen, ziel.dataset.fpHash, zustand.status?.lokale_datei?.hash ?? undefined), t('faehigkeitenProjekt.meldung.freigegeben'), t('faehigkeitenProjekt.meldung.inhaltGeaendert'))
}

/** Verwirft den Zustand (Projektwechsel); das nächste Laden zeigt „lädt“. */
export function setzeFaehigkeitenProjektZurueck() {
  ladeZaehler++
  projektEpoche++
  zustand = { status: null, offeneFreigabe: null, meldung: null, beschaeftigt: false }
}

/** Einmalig beim Bootstrap: Klick-Delegation am Container. */
export function initFaehigkeitenProjekt() {
  container()?.addEventListener('click', (ereignis) => {
    void beiKlick(ereignis)
  })
}
