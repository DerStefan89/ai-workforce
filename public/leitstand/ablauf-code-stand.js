/**
 * Datei: public/leitstand/ablauf-code-stand.js
 *
 * Zweck: Stand „Bereit zum Sichern“ je Ablauf (F45 B2b-4a-2b-2, features/F45/plan-b2b4a2b2.md §1; F-1087, F-1157 (4)(5)) — ein
 * Zwischenspeicher je workflowId für GET …/code?workflow=<id> (scripts/leitstand/routen-code.mjs mit Ort aus loeseCodeOrt).
 *
 * Abgerufen wird nur, wenn eine Ansicht den Abschnitt zeichnet (geöffnete Karte auf der Ablaufseite bzw. Abnahme, offenes
 * Workboard-Detail „abgeschlossen“) und dann je Schlüssel (code-daten.js sichernSchluessel, V1) höchstens einmal — der Poll zeichnet
 * diese Ansichten zwar alle zwei Sekunden neu, löst aber keinen weiteren Abruf aus (je Abruf ≈ 10 Git-Prozesse). Ein Fehlschlag zählt
 * als gelaufen (kein Wiederholen im Takt); neu nur über „Aktualisieren“ (ladeAblaufCodeStand mit neu: true) oder einen neuen Schlüssel.
 * Grenze (QA 4): kehrt man auf dieselbe Karte zurück, wird bei gleichem Schlüssel nicht neu geladen — „Aktualisieren“ genügt.
 *
 * Zustände je workflowId: 'leer' (nie geladen), 'laedt', 'ok' (HTTP 200 mit Feld ablauf), 'lage' (HTTP 409 mit grund_schluessel —
 * z. B. aufgeraeumt als normaler Endzustand, kein Fehler), 'fehler' (Netz, 400/404/5xx, 409 ohne Schlüssel, 200 ohne Feld ablauf =
 * älterer Serverprozess). Ein Projektwechsel verwirft alle Stände, auch laufende Abrufe (Code-Review 2: sonst blieb ein Eintrag
 * „lädt“ nach der Rückkehr stehen). Überholschutz je workflowId über einen Zähler.
 *
 * - erzeugeAblaufCodeStand: Fabrik mit eingespeistem Abruf (in Node testbar).
 * - werteAblaufAntwortAus: Antwort → Teilstand (rein).
 * - ablaufCodeStand, stelleAblaufCodeStandSicher, ladeAblaufCodeStand, abonniereAblaufCodeStand: die eine Instanz des Leitstands
 *   (Abruf api.js holeAblaufCode, Projekt aus projekt-kontext.js).
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/workflows.js (Karte auf Ablauf- und Abnahmeseite), public/leitstand/views/workboard.js (abgeschlossen)
 * - public/leitstand/ablauf-code-stand.test.mjs (node:test), scripts/check-f45-b2b4a2b2-anzeige.mjs
 *
 * Wichtig: Import-sicher (kein DOM, kein fetch beim Import). Fehler werden geloggt und als Zustand 'fehler' gemeldet, nie geworfen.
 * Nie aus zustand.js oder einem Poll-Abonnenten direkt aufrufen — nur aus dem Zeichnen einer geöffneten Ansicht (Gate b2b4a2b2 (a)).
 */

import { holeAblaufCode } from './api.js'
import { t } from './i18n.js'
import { holeAktivesProjekt } from './projekt-kontext.js'

/** Stand ohne Abruf. */
const LEER = Object.freeze({ zustand: 'leer', daten: null, http: null, grundSchluessel: null, fehler: null, geladenAm: null, schluessel: null })

/**
 * Lesbarer Fehlertext eines geworfenen Werts (Zeitüberschreitung als eigener Text, Muster code-stand.js).
 * @param fehler - gefangener Wert
 * @returns Text
 */
function fehlerText(fehler) {
  if (fehler instanceof Error && (fehler.name === 'TimeoutError' || fehler.name === 'AbortError')) return t('code.fehler.zeit')
  return fehler instanceof Error ? fehler.message : String(fehler)
}

/**
 * Wertet eine Antwort von GET …/code?workflow=<id> aus.
 * @param antwort - { http, koerper }
 * @returns Teilstand { zustand, daten, http, grundSchluessel, fehler }
 */
export function werteAblaufAntwortAus({ http, koerper }) {
  // QA 8: ein älterer Serverprozess kennt ?workflow= nicht und antwortet mit dem Projektordner (ohne Feld ablauf) — nie als Stand
  // des Ablaufs zeigen.
  if (http === 200 && koerper?.ablauf !== null && typeof koerper?.ablauf === 'object') return { zustand: 'ok', daten: koerper, http, grundSchluessel: null, fehler: null }
  if (http === 200) return { zustand: 'fehler', daten: null, http, grundSchluessel: null, fehler: t('arbeitsordner.sichernAbschnitt.alterServer') }
  const schluessel = koerper?.grund_schluessel
  // F-1157 (5): eine 409 mit Schlüssel ist eine Lage; 400/404 tragen null, eine 409 ohne Schlüssel ist ein Fehler (Advisor 4).
  if (http === 409 && typeof schluessel === 'string' && schluessel !== '') return { zustand: 'lage', daten: null, http, grundSchluessel: schluessel, fehler: null }
  const grund = typeof koerper?.grund === 'string' && koerper.grund !== '' ? `: ${koerper.grund}` : ''
  return { zustand: 'fehler', daten: null, http, grundSchluessel: null, fehler: `${http}${grund}` }
}

/**
 * Fabrik eines Stands je Ablauf.
 * @param abh - { hole: (workflowId) => Promise<{ http, koerper }>, projektId: () => Projekt-id, jetzt?: () => ms }
 * @returns { stand, stelleSicher, lade, abonniere }
 */
export function erzeugeAblaufCodeStand({ hole, projektId, jetzt = () => Date.now() }) {
  const staende = new Map()
  const zaehler = new Map()
  const abonnenten = []
  // Erst beim ersten Zugriff gesetzt (import-sicher); der erste Wechsel von null leert eine noch leere Map.
  let projekt = null
  let generation = 0

  /** Verwirft alle Stände, sobald das aktive Projekt ein anderes ist (auch laufende Abrufe zählen dann nicht mehr). */
  function pruefeProjekt() {
    const aktuell = projektId()
    if (aktuell === projekt) return
    projekt = aktuell
    generation++
    staende.clear()
  }

  /** @param id - workflowId */
  function melde(id) {
    for (const fn of abonnenten) {
      try {
        fn(id)
      } catch (fehler) {
        console.error('Ablauf-Code-Stand: ein Abonnent ist fehlgeschlagen:', fehler)
      }
    }
  }

  /**
   * Stand eines Ablaufs im aktiven Projekt.
   * @param id - workflowId
   * @returns Stand
   */
  function stand(id) {
    pruefeProjekt()
    return staende.get(id) ?? LEER
  }

  /**
   * Ein Abruf. Der Schlüssel steht schon vor jeder Meldung im Stand — ein Abonnent, der dabei neu zeichnet und
   * stelleSicher ruft, löst keinen zweiten Abruf aus (Advisor 5).
   * @param id - workflowId
   * @param schluessel - Neuladen-Schlüssel
   * @param melden - true: den Zustand 'laedt' melden („Aktualisieren“); beim ersten Zeichnen liest der Aufrufer ihn selbst
   * @returns Promise des Stands (wirft nie)
   */
  function abruf(id, schluessel, melden) {
    pruefeProjekt()
    const nummer = (zaehler.get(id) ?? 0) + 1
    zaehler.set(id, nummer)
    const gen = generation
    staende.set(id, { ...LEER, zustand: 'laedt', schluessel })
    if (melden) melde(id)
    const veraltet = () => {
      pruefeProjekt()
      return zaehler.get(id) !== nummer || generation !== gen
    }
    return (async () => {
      let teil
      try {
        teil = werteAblaufAntwortAus(await hole(id))
        if (veraltet()) return stand(id)
        if (teil.zustand === 'fehler') console.error(`Ablauf-Code-Stand: GET …/code?workflow= antwortete ${teil.fehler}`)
      } catch (fehler) {
        if (veraltet()) return stand(id)
        console.error('Ablauf-Code-Stand: GET …/code?workflow= fehlgeschlagen:', fehler)
        teil = { zustand: 'fehler', daten: null, http: null, grundSchluessel: null, fehler: fehlerText(fehler) }
      }
      staende.set(id, { ...teil, geladenAm: jetzt(), schluessel })
      melde(id)
      return stand(id)
    })()
  }

  return {
    stand,
    /**
     * Ruft nur ab, wenn für diesen Ablauf noch kein Abruf mit diesem Schlüssel lief (auch ein fehlgeschlagener zählt).
     * @param id - workflowId @param schluessel - sichernSchluessel(detail)
     * @returns Stand nach dem Vermerk (bei neuem Abruf 'laedt')
     */
    stelleSicher(id, schluessel) {
      if (typeof id !== 'string' || id === '') return LEER
      if (stand(id).schluessel !== schluessel) void abruf(id, schluessel, false)
      return stand(id)
    },
    /**
     * Lädt neu — nur mit neu: true („Aktualisieren“); behält den Schlüssel.
     * @param id - workflowId @param optionen - { neu: true }
     * @returns Promise des Stands
     */
    lade(id, { neu = false } = {}) {
      if (!neu || typeof id !== 'string' || id === '') return Promise.resolve(stand(id))
      return abruf(id, stand(id).schluessel, true)
    },
    /** @param fn - (workflowId) => void */
    abonniere(fn) {
      abonnenten.push(fn)
    },
  }
}

/** Die eine Instanz des Leitstands. */
const instanz = erzeugeAblaufCodeStand({ hole: holeAblaufCode, projektId: () => holeAktivesProjekt().id })

/** @param id - workflowId @returns Stand */
export const ablaufCodeStand = (id) => instanz.stand(id)
/** @param id - workflowId @param schluessel - sichernSchluessel(detail) @returns Stand */
export const stelleAblaufCodeStandSicher = (id, schluessel) => instanz.stelleSicher(id, schluessel)
/** @param id - workflowId @param optionen - { neu: true } @returns Promise des Stands */
export const ladeAblaufCodeStand = (id, optionen) => instanz.lade(id, optionen)
/** @param fn - (workflowId) => void */
export const abonniereAblaufCodeStand = (fn) => instanz.abonniere(fn)
