/**
 * Datei: public/leitstand/code-stand.js
 *
 * Zweck: Ein Zwischenspeicher für die Leseroute GET …/code (F46 D4, scripts/leitstand/routen-code.mjs)
 * des aktiven Projekts. Verbraucher sind #/code (views/code.js), #/projekt (rechte Spalte,
 * views/auftrag-umgebung.js), die Kopf-Werkzeuge VS Code und GitHub (kopf-werkzeuge.js) und die
 * Links „Änderungen“/„Pull Requests“ im Eintrag-Detail (views/workboard-detail.js).
 *
 * Geladen wird beim Bootstrap, beim Projektwechsel, beim Öffnen von #/code und #/projekt und per
 * „Aktualisieren“ — nie aus dem Poll (die Route führt Git aus; zustand.js bleibt der einzige Poll).
 * Ein Abruf läuft je Projekt höchstens einmal gleichzeitig (auch „Aktualisieren“ teilt einen laufenden; der
 * Server bündelt zusätzlich); eine Antwort für ein inzwischen
 * gewechseltes Projekt oder einen überholten Abruf wird verworfen (Überholschutz über einen Zähler).
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initCodeStand beim Bootstrap)
 * - public/leitstand/views/code.js, public/leitstand/views/auftrag-umgebung.js, public/leitstand/views/workboard.js
 *
 * Wichtig: Import-sicher (kein DOM, kein fetch beim Import). Fehler werden geloggt und als Zustand
 * 'fehler' gemeldet, nie geworfen.
 */

import { holeCode } from './api.js'
import { t } from './i18n.js'
import { setzeKopfAusCodeStand } from './kopf-werkzeuge.js'
import { abonniereProjektWechsel, holeAktivesProjekt } from './projekt-kontext.js'

/** Stand: { projektId, zustand: 'leer' | 'laedt' | 'ok' | 'fehler', daten (letzte gültige Antwort dieses Projekts oder null), fehler, geladenAm (ms der Daten oder null) } */
let stand = { projektId: null, zustand: 'leer', daten: null, fehler: null, geladenAm: null }

/** Laufender Abruf: { projektId, nummer, promise } oder null. */
let laufend = null

/** Überholschutz: jede neue Ladung zählt hoch. */
let ladeNummer = 0

/** Abonnenten (stand) => void. */
const abonnenten = []

/**
 * Meldet den Stand an alle Abonnenten und setzt die Kopf-Werkzeuge. Ein werfender Abonnent hält die
 * übrigen nicht auf.
 */
function melde() {
  const daten = stand.daten
  setzeKopfAusCodeStand({ absoluterPfad: daten?.absoluterPfad ?? null, remoteWebUrl: daten?.remoteWebUrl?.url ?? null })
  for (const fn of abonnenten) {
    try {
      fn(stand)
    } catch (fehler) {
      console.error('Code-Stand: ein Abonnent ist fehlgeschlagen:', fehler)
    }
  }
}

/**
 * Stand des aktiven Projekts (ein Stand eines anderen Projekts gilt als 'leer').
 * @returns { projektId, zustand, daten, fehler }
 */
export function aktuellerCodeStand() {
  const projektId = holeAktivesProjekt().id
  return stand.projektId === projektId ? stand : { projektId, zustand: 'leer', daten: null, fehler: null, geladenAm: null }
}

/**
 * Abonniert Änderungen des Stands.
 * @param fn - (stand) => void
 */
export function abonniereCodeStand(fn) {
  abonnenten.push(fn)
}

/**
 * Lädt den Stand des aktiven Projekts. Ohne neu liefert ein gültiger Stand desselben Projekts sofort,
 * ein laufender Abruf wird geteilt.
 * @param optionen - { neu: true erzwingt einen Abruf, sofern nicht schon einer läuft }
 * @returns Promise des Stands (wirft nie)
 */
export function ladeCodeStand({ neu = false } = {}) {
  const projektId = holeAktivesProjekt().id
  if (!neu && stand.projektId === projektId && stand.zustand === 'ok') return Promise.resolve(stand)
  if (laufend !== null && laufend.projektId === projektId) return laufend.promise
  const nummer = ++ladeNummer
  const vorher = stand.projektId === projektId ? stand : { daten: null, geladenAm: null }
  stand = { projektId, zustand: 'laedt', daten: vorher.daten, fehler: null, geladenAm: vorher.geladenAm }
  melde()
  const promise = (async () => {
    try {
      const daten = await holeCode()
      if (nummer !== ladeNummer || holeAktivesProjekt().id !== projektId) return aktuellerCodeStand()
      stand = { projektId, zustand: 'ok', daten, fehler: null, geladenAm: Date.now() }
    } catch (fehler) {
      if (nummer !== ladeNummer || holeAktivesProjekt().id !== projektId) return aktuellerCodeStand()
      console.error('Code-Stand: GET …/code fehlgeschlagen:', fehler)
      // Zeitüberschreitung als lesbarer Grund statt der rohen DOMException (Prüfpass qa 13).
      const zeit = fehler instanceof Error && (fehler.name === 'TimeoutError' || fehler.name === 'AbortError')
      stand = { projektId, zustand: 'fehler', daten: vorher.daten, fehler: zeit ? t('code.fehler.zeit') : fehler instanceof Error ? fehler.message : String(fehler), geladenAm: vorher.geladenAm }
    } finally {
      if (laufend?.nummer === nummer) laufend = null
    }
    melde()
    return stand
  })()
  laufend = { projektId, nummer, promise }
  return promise
}

/** Bootstrap: lädt einmal und lädt bei jedem Projektwechsel neu (der alte Stand gilt sofort nicht mehr). */
export function initCodeStand() {
  abonniereProjektWechsel(() => {
    ladeNummer++
    laufend = null
    stand = { projektId: holeAktivesProjekt().id, zustand: 'leer', daten: null, fehler: null, geladenAm: null }
    melde()
    void ladeCodeStand()
  })
  void ladeCodeStand()
}
