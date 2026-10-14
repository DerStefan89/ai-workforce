/**
 * Datei: public/leitstand/views/plugins.js
 *
 * Zweck: Reiter „Plugins aus deinem Claude Code“ der Capability Library (Seite Workforce `#/capabilities`, F45 F-3a-2): bindet
 * die Steuerung aus ../plugins-anzeige.js an den Container #plugins (index.html) und an GET …/plugins (api.js holePlugins).
 * Auswahl eines Plugins per Klick auf Zeile oder Namen; danach steht der Fokus wieder auf dem Namen.
 * Seit F45 F-3b-1 die Bedienung des Workforce-Abschnitts: „Kopie prüfen“ (Prüflauf, verfolgt über GET …/sammlung/pruefung/<id>),
 * „Freigeben“ (an den angezeigten Stand der Kopie und den angezeigten Prüfbericht gebunden), „Freigabe zurücknehmen“ und die
 * Kästchen der Zuordnung je Rolle — jeweils mit dem angezeigten Stand der lokalen Datei; danach wird neu geladen. Dazu verwaiste
 * Freigaben/Zuordnungen (Plugin nicht mehr installiert) zurücknehmen. Nach einer Aktion steht der Fokus wieder auf demselben Knopf
 * bzw. Kästchen bzw. auf der Ergebnis- oder Fehlermeldung des Plugins, bei nicht mehr installierten Plugins auf der Liste (fokusZiele,
 * nie body); Status und Ergebnis sagt die feste Live-Region #plugins-status an (F-1094 (8), Entscheidung Challenger 14.10.2026).
 * Endet eine Aktion nach einem Projektwechsel, setzt und lädt sie nichts mehr (Generation der Steuerung).
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/capabilities.js (initPlugins, ladePluginsBeiReiterwahl, ladePluginsNeu, setzePluginsZurueck)
 *
 * Wichtig:
 * - Abgerufen wird nur bei der Wahl des Reiters (ladePluginsBeiReiterwahl), per „Neu laden“ (ladePluginsNeu) und nach einer
 *   Aktion — nie beim Seitenaufruf, nie beim Projektwechsel (nur zurücksetzen), nie im Poll. Die CLI-Liste dauert ≈ 1,5 s.
 * - Die Aktionen ändern keinen Lauf (die Zuordnung wirkt erst mit dem nächsten Schritt); der Server lehnt sie während eines
 *   Laufs ab (409) — die Oberfläche sperrt die Knöpfe vorab.
 */

import { holePlugins, holePruefung, sendePluginFreigabe, sendePluginRuecknahme, sendePluginZuordnung, startePluginPruefung } from '../api.js'
import { t } from '../i18n.js'
import { erzeugePluginSteuerung, fokusZiele, renderPlugins, renderPluginsZustand, statusText } from '../plugins-anzeige.js'

/** Container des Reiters (index.html). */
const CONTAINER_ID = 'plugins'

/** Abfrage des Prüflaufs: Takt und Höchstdauer (Zeitgrenze des Prüflaufs 15 min plus Puffer). */
const PRUEF_TAKT_MS = 3000
const PRUEF_HOECHSTENS_MS = 20 * 60_000

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

/**
 * Wartet auf das Ende eines Prüflaufs (fertig/fehler) über GET …/sammlung/pruefung/<laufId>; bricht nach einem Projektwechsel ab.
 * @param laufId - Lauf
 * @param gen - Generation der Steuerung beim Start
 * @returns null bei Erfolg, sonst Grund
 */
async function warteAufPruefung(laufId, gen) {
  const ende = Date.now() + PRUEF_HOECHSTENS_MS
  while (Date.now() < ende) {
    await new Promise((r) => setTimeout(r, PRUEF_TAKT_MS))
    if (steuerung.generation() !== gen) return null
    try {
      const antwort = await holePruefung(laufId)
      const z = await antwort.json().catch(() => ({}))
      if (z.phase === 'fertig') return null
      if (z.phase === 'fehler') return String(z.grund ?? t('plugins.wf.pruefungFehler'))
    } catch (fehler) {
      console.error('plugins: Stand des Prüflaufs nicht lesbar', fehler)
    }
  }
  return t('plugins.wf.pruefungZeit')
}

/**
 * F45 F-3b-1 (F-1094 (8)): setzt den Fokus auf das erste vorhandene, bedienbare Ziel aus fokusZiele (nie body) und schreibt den
 * Text der Aktion in die feste Live-Region des Reiters (#plugins-status, index.html; Entscheidung Challenger 14.10.2026).
 * @param ziele - Selektoren in Reihenfolge
 * @param aktion - Aktion für die Ansage oder null (keine Ansage)
 */
function fokusUndAnsage(ziele, aktion) {
  const region = document.getElementById('plugins-status')
  if (region !== null && aktion !== null) region.textContent = statusText(aktion)
  for (const selektor of ziele) {
    let element = null
    try {
      element = selektor.startsWith('#') ? document.querySelector(selektor) : (container()?.querySelector(selektor) ?? null)
    } catch (fehler) {
      console.error(`plugins: Fokusziel '${selektor}' ungültig`, fehler)
    }
    if (element !== null && element.disabled !== true && typeof element.focus === 'function') {
      element.focus()
      return
    }
  }
}

/**
 * Führt eine Aktion aus und lädt danach neu; Status, Erfolg und Fehler stehen am Plugin (fokussierbar) und in der Live-Region.
 * Nach einem Projektwechsel (andere Generation) setzt und lädt sie nichts mehr (Code-Review 3, QA 6).
 * @param pluginId - Plugin-id
 * @param art - 'pruefen' | 'freigeben' | 'zuruecknehmen' | 'zuordnen'
 * @param sende - () => Promise<Response>
 * @param selektor - Selektor des auslösenden Elements oder null
 * @param verwaist - true für Einträge nicht mehr installierter Plugins (Fokus danach auf die Liste)
 */
async function fuehreAus(pluginId, art, sende, selektor = null, verwaist = false) {
  const gen = steuerung.generation()
  const aktuell = () => steuerung.generation() === gen
  const melde = (aktion) => {
    steuerung.setzeAktion(pluginId, aktion)
    fokusUndAnsage(fokusZiele({ pluginId, art, phase: aktion.phase, selektor, verwaist }), aktion)
  }
  melde({ art, phase: 'laeuft' })
  try {
    const antwort = await sende()
    const inhalt = await antwort.json().catch(() => ({}))
    if (!aktuell()) return
    if (!antwort.ok) {
      melde({ art, phase: 'fehler', grund: String(inhalt.grund ?? `HTTP ${antwort.status}`) })
      return
    }
    if (art === 'pruefen') {
      const grund = await warteAufPruefung(inhalt.laufId, gen)
      if (!aktuell()) return
      if (grund !== null) {
        melde({ art, phase: 'fehler', grund })
        if (aktuell()) await steuerung.neuLaden({ still: true })
        if (aktuell()) fokusUndAnsage(fokusZiele({ pluginId, art, phase: 'fehler', selektor, verwaist }), null)
        return
      }
    }
    melde({ art, phase: 'ok' })
  } catch (fehler) {
    console.error(`plugins: Aktion ${art} für ${pluginId} gescheitert`, fehler)
    if (!aktuell()) return
    melde({ art, phase: 'fehler', grund: fehler instanceof Error ? fehler.message : String(fehler) })
    return
  }
  // Stilles Neuladen: Meldung und Fokus bleiben bis zur neuen Antwort stehen (nie body); danach Fokus ohne zweite Ansage.
  if (aktuell()) await steuerung.neuLaden({ still: true })
  if (aktuell()) fokusUndAnsage(fokusZiele({ pluginId, art, phase: 'ok', selektor, verwaist }), null)
}

/**
 * Angezeigter Stand der lokalen Datei (für den 409-Vergleich im Server) als Körperfeld.
 * @param antwort - PluginAntwort
 * @returns { stand } oder {}
 */
function stand(antwort) {
  const s = antwort?.workforce?.lokale_datei?.stand
  return typeof s === 'string' ? { stand: s } : {}
}

/**
 * Knopf des Workforce-Abschnitts.
 * @param knopf - Element mit data-pl-aktion
 */
function beiAktion(knopf) {
  const z = steuerung.zustand()
  const plugin = z.antwort?.plugins?.[Number(knopf.dataset.plIndex)]
  const wf = plugin?.workforce
  if (plugin === undefined || wf === undefined || knopf.disabled) return
  const art = knopf.dataset.plAktion
  const selektor = `[data-pl-aktion="${art}"][data-pl-index="${knopf.dataset.plIndex}"]`
  if (art === 'pruefen') void fuehreAus(plugin.id, art, () => startePluginPruefung({ plugin_id: plugin.id, kopie_hash: wf.kopie.kopie_hash }), selektor)
  else if (art === 'freigeben') void fuehreAus(plugin.id, art, () => sendePluginFreigabe({ plugin_id: plugin.id, kopie_hash: wf.kopie.kopie_hash, pruefbericht: wf.pruefbericht.kennung, ...stand(z.antwort) }), selektor)
  else if (art === 'zuruecknehmen') void fuehreAus(plugin.id, art, () => sendePluginRuecknahme({ plugin_id: plugin.id, ...stand(z.antwort) }), selektor)
}

/**
 * Knopf bei einem verwaisten Eintrag (Plugin nicht mehr installiert): Freigabe zurücknehmen bzw. Zuordnung entfernen.
 * @param knopf - Element mit data-pl-verwaist-aktion
 */
function beiVerwaist(knopf) {
  if (knopf.disabled) return
  const z = steuerung.zustand()
  const id = knopf.dataset.plId
  if (typeof id !== 'string' || id === '') return
  if (knopf.dataset.plVerwaistAktion === 'zuruecknehmen') void fuehreAus(id, 'zuruecknehmen', () => sendePluginRuecknahme({ plugin_id: id, ...stand(z.antwort) }), null, true)
  else void fuehreAus(id, 'zuordnen', () => sendePluginZuordnung({ plugin_id: id, rolle: knopf.dataset.plRolle, typ: knopf.dataset.plTyp, name: knopf.dataset.plName, an: false, ...stand(z.antwort) }), null, true)
}

/**
 * Kästchen der Zuordnung.
 * @param box - input[data-pl-zuordnung]
 */
function beiZuordnung(box) {
  const z = steuerung.zustand()
  const plugin = z.antwort?.plugins?.[Number(box.dataset.plIndex)]
  if (plugin === undefined) return
  const koerper = { plugin_id: plugin.id, rolle: box.dataset.plRolle, typ: box.dataset.plTyp, name: box.dataset.plName, an: box.checked, ...stand(z.antwort) }
  const selektor = `input[data-pl-zuordnung][data-pl-index="${box.dataset.plIndex}"][data-pl-typ="${CSS.escape(box.dataset.plTyp ?? '')}"][data-pl-name="${CSS.escape(box.dataset.plName ?? '')}"][data-pl-rolle="${CSS.escape(box.dataset.plRolle ?? '')}"]`
  void fuehreAus(plugin.id, 'zuordnen', () => sendePluginZuordnung(koerper), selektor)
}

/** Bedienung: Klick auf Zeile oder Namen wählt ein Plugin; Knöpfe und Kästchen des Workforce-Abschnitts. */
export function initPlugins() {
  const ziel = container()
  if (ziel === null) return
  zeichne(steuerung.zustand())
  ziel.addEventListener('click', (ereignis) => {
    const knopf = ereignis.target instanceof Element ? ereignis.target.closest('[data-pl-aktion]') : null
    if (knopf !== null) {
      beiAktion(knopf)
      return
    }
    const verwaist = ereignis.target instanceof Element ? ereignis.target.closest('[data-pl-verwaist-aktion]') : null
    if (verwaist !== null) {
      beiVerwaist(verwaist)
      return
    }
    const zeile = ereignis.target instanceof Element ? ereignis.target.closest('[data-plugin-index]') : null
    if (zeile === null) return
    const index = Number(zeile.dataset.pluginIndex)
    steuerung.waehle(index)
    ziel.querySelector(`.library-name[data-plugin-index="${index}"]`)?.focus()
    // Unter 1100 px steht das Detail unter der Tabelle — dorthin, damit die Auswahl sichtbar wird (Muster Katalog).
    const detail = document.getElementById('plugins-detail')
    if (detail !== null && typeof detail.scrollIntoView === 'function' && window.matchMedia?.('(max-width: 1100px)').matches) detail.scrollIntoView({ block: 'start' })
  })
  ziel.addEventListener('change', (ereignis) => {
    const box = ereignis.target instanceof Element ? ereignis.target.closest('[data-pl-zuordnung]') : null
    if (box !== null) beiZuordnung(box)
  })
}
