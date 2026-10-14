/**
 * Datei: public/leitstand/views/plugins.js
 *
 * Zweck: Reiter „Plugins aus deinem Claude Code“ der Capability Library (Seite Workforce `#/capabilities`, F45 F-3a-2): bindet
 * die Steuerung aus ../plugins-anzeige.js an den Container #plugins (index.html) und an GET …/plugins (api.js holePlugins).
 * Auswahl eines Plugins per Klick auf Zeile oder Namen; danach steht der Fokus wieder auf dem Namen.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/capabilities.js (initPlugins, ladePluginsBeiReiterwahl, ladePluginsNeu, setzePluginsZurueck)
 *
 * Wichtig:
 * - Abgerufen wird nur bei der Wahl des Reiters (ladePluginsBeiReiterwahl) und per „Neu laden“ (ladePluginsNeu) — nie beim
 *   Seitenaufruf, nie beim Projektwechsel (nur zurücksetzen), nie im Poll. Die CLI-Liste dauert ≈ 1,5 s.
 * - Keine Aktivierung, kein Knopf mit Wirkung.
 */

import { holePlugins } from '../api.js'
import { erzeugePluginSteuerung, renderPlugins, renderPluginsZustand } from '../plugins-anzeige.js'

/** Container des Reiters (index.html). */
const CONTAINER_ID = 'plugins'

/** @returns der Container oder null. */
function container() {
  return document.getElementById(CONTAINER_ID)
}

/**
 * Zeichnet einen Zustand in den Container; wirft das Rendern (unerwartete Form eines Eintrags), steht der Grund im Bereich
 * statt einer veralteten Anzeige (catch + Logging, Code-Review 6).
 * @param zustand - Zustand der Steuerung
 */
function zeichne(zustand) {
  const ziel = container()
  if (ziel === null) return
  try {
    ziel.innerHTML = renderPlugins(zustand)
  } catch (fehler) {
    console.error('plugins: Zustand nicht darstellbar', fehler)
    ziel.innerHTML = renderPluginsZustand('fehler', fehler instanceof Error ? fehler.message : String(fehler))
  }
}

/** Steuerung: zeichnet jeden Zustand in den Container. */
const steuerung = erzeugePluginSteuerung({ hole: holePlugins, zeichne })

/** Wahl des Reiters: Bestand lesen. */
export function ladePluginsBeiReiterwahl() {
  void steuerung.beiReiterwahl()
}

/** „Neu laden“ bei gewähltem Reiter: Bestand neu lesen. */
export function ladePluginsNeu() {
  void steuerung.neuLaden()
}

/** @returns true, solange kein Bestand geladen ist (nach dem Start oder einem Projektwechsel). */
export function pluginsNichtGeladen() {
  return steuerung.zustand().art === 'nicht_geladen'
}

/** Projektwechsel: Bestand und Auswahl verwerfen, ohne Abruf. */
export function setzePluginsZurueck() {
  steuerung.zuruecksetzen()
}

/** Bedienung: Klick auf Zeile oder Namen wählt ein Plugin (Detail daneben bzw. darunter). */
export function initPlugins() {
  const ziel = container()
  if (ziel === null) return
  zeichne(steuerung.zustand())
  ziel.addEventListener('click', (ereignis) => {
    const zeile = ereignis.target instanceof Element ? ereignis.target.closest('[data-plugin-index]') : null
    if (zeile === null) return
    const index = Number(zeile.dataset.pluginIndex)
    steuerung.waehle(index)
    ziel.querySelector(`.library-name[data-plugin-index="${index}"]`)?.focus()
    // Unter 1100 px steht das Detail unter der Tabelle — dorthin, damit die Auswahl sichtbar wird (Muster Katalog).
    const detail = document.getElementById('plugins-detail')
    if (detail !== null && typeof detail.scrollIntoView === 'function' && window.matchMedia?.('(max-width: 1100px)').matches) detail.scrollIntoView({ block: 'start' })
  })
}
