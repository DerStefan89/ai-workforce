/**
 * Datei: public/leitstand/views/sammlung.js
 *
 * Zweck: Bereich „Sammlung“ der Capability Library (Seite Workforce `#/capabilities`, F45 F-2b-1): lädt
 * GET …/sammlung des aktiven Projekts (Stand je Projekt), rendert über sammlung-anzeige.js und bedient Suche, Filter
 * (Urteil, Stand) und die aufklappbaren Details. Rein lesend — „Auswählen“ kommt mit F-2b-2.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/capabilities.js (initSammlung, ladeSammlung, setzeSammlungZurueck)
 *
 * Wichtig:
 * - Nie im Poll: geladen beim Betreten der Seite, per „Neu laden“ und beim Projektwechsel.
 * - Überholschutz über ladeZaehler (eine Antwort nach einem Projektwechsel wird verworfen).
 * - Kopf (Suche, Chips) und Liste sind getrennte Container: Tippen zeichnet nur die Liste neu, der Fokus bleibt im Suchfeld.
 * - Offene Details bleiben über Filterwechsel offen (offeneDetails, gemerkt über das toggle-Ereignis).
 */

import { holeSammlung } from '../api.js'
import { renderSammlungKopf, renderSammlungListe, renderSammlungZustand } from '../sammlung-anzeige.js'

/** Container des Bereichs (index.html). */
const CONTAINER_ID = 'sammlung'

/** Zustand: letzte Antwort, Filter, offene Details. */
let zustand = { antwort: null, filter: { suche: '', urteil: '', stand: '' } }
let offeneDetails = new Set()
/** Überholschutz für Ladevorgänge. */
let ladeZaehler = 0

/** @returns der Container oder null. */
function container() {
  return document.getElementById(CONTAINER_ID)
}

/** Zeichnet Kopf und Liste neu (nach dem Laden oder einem Chip-Klick). */
function zeichneAlles() {
  const ziel = container()
  if (ziel === null || zustand.antwort === null) return
  ziel.innerHTML = `<div class="sm-kopf">${renderSammlungKopf(zustand.antwort, zustand.filter)}</div><div class="sm-liste">${renderSammlungListe(zustand.antwort, zustand.filter, offeneDetails)}</div>`
}

/** Zeichnet nur die Liste neu (Tippen in der Suche — der Fokus bleibt im Feld). */
function zeichneListe() {
  const liste = container()?.querySelector('.sm-liste')
  if (liste === null || liste === undefined || zustand.antwort === null) return
  liste.innerHTML = renderSammlungListe(zustand.antwort, zustand.filter, offeneDetails)
}

/**
 * Lädt die Sammlung und zeichnet sie; Ladefehler und Fehlerstand der Route erscheinen im Bereich (catch + Logging).
 */
export async function ladeSammlung() {
  const meine = ++ladeZaehler
  const ziel = container()
  if (ziel === null) return
  if (zustand.antwort === null) ziel.innerHTML = renderSammlungZustand('laedt')
  try {
    const antwort = await holeSammlung()
    if (meine !== ladeZaehler) return
    if (antwort?.status !== 'ok') {
      console.error('sammlung: Fehlerstand der Route', antwort?.grund)
      zustand = { ...zustand, antwort: null }
      ziel.innerHTML = renderSammlungZustand('fehler', String(antwort?.grund ?? ''))
      return
    }
    // QA 4: ein gewählter Stand bzw. ein Urteil, das es in dieser Antwort nicht (mehr) gibt, fällt auf „Alle“ zurück — sonst stünde
    // „0 von 176“ ohne gedrückten Chip da.
    const filter = { ...zustand.filter }
    if (filter.stand !== '' && !((antwort.zaehlung?.je_stand ?? {})[filter.stand] > 0)) filter.stand = ''
    if (filter.urteil !== '' && !((antwort.zaehlung?.je_urteil ?? {})[filter.urteil] > 0)) filter.urteil = ''
    zustand = { ...zustand, antwort, filter }
    zeichneAlles()
  } catch (fehler) {
    if (meine !== ladeZaehler) return
    console.error('sammlung: GET …/sammlung fehlgeschlagen', fehler)
    zustand = { ...zustand, antwort: null }
    ziel.innerHTML = renderSammlungZustand('fehler', fehler instanceof Error ? fehler.message : String(fehler))
  }
}

/** Verwirft den Zustand (Projektwechsel); das nächste Laden zeigt „lädt“ und beginnt ohne Filter (QA 4). */
export function setzeSammlungZurueck() {
  ladeZaehler++
  zustand = { antwort: null, filter: { suche: '', urteil: '', stand: '' } }
  offeneDetails = new Set()
}

/** Einmalig beim Bootstrap: Delegation für Chips, Suche und Details. */
export function initSammlung() {
  const ziel = container()
  if (ziel === null) return
  ziel.addEventListener('click', (ereignis) => {
    const chip = ereignis.target instanceof Element ? ereignis.target.closest('[data-sm-filter]') : null
    if (chip === null) return
    const name = chip.dataset.smFilter
    if (name !== 'urteil' && name !== 'stand') return
    zustand = { ...zustand, filter: { ...zustand.filter, [name]: chip.dataset.smWert ?? '' } }
    zeichneAlles()
    // Fokus zurück auf den gewählten Chip (Muster capability-library.js).
    container()?.querySelector(`[data-sm-filter="${name}"][data-sm-wert="${CSS.escape(chip.dataset.smWert ?? '')}"]`)?.focus?.()
  })
  ziel.addEventListener('input', (ereignis) => {
    if (!(ereignis.target instanceof HTMLInputElement) || ereignis.target.id !== 'sammlung-suche') return
    zustand = { ...zustand, filter: { ...zustand.filter, suche: ereignis.target.value } }
    zeichneListe()
  })
  // toggle bubbelt nicht — im Capture-Modus am Container mithören.
  ziel.addEventListener(
    'toggle',
    (ereignis) => {
      const details = ereignis.target
      if (!(details instanceof HTMLDetailsElement) || details.dataset.smDetail === undefined) return
      if (details.open) offeneDetails.add(details.dataset.smDetail)
      else offeneDetails.delete(details.dataset.smDetail)
    },
    true
  )
}
