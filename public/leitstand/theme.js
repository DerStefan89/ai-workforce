/**
 * Datei: public/leitstand/theme.js
 *
 * Zweck: Hell/Dunkel des Leitstands (F44 WS-1a, Abgleich F-725 A6/A13). Das Theme
 * steht als `data-theme` auf <html> und in localStorage['leitstand-theme'];
 * Standard ist dunkel. Die Farben selbst liegen ausschließlich in den Token-Blöcken
 * von style.css (:root und :root[data-theme='light']).
 *
 * Gegen das Aufblitzen setzt ein kleines Inline-Skript im <head> von index.html das
 * Attribut schon vor dem ersten Rendern (dieselbe Regel wie leseGespeichertesTheme
 * hier). initialisiereTheme() gleicht beim Bootstrap nur noch ab und setzt
 * <meta name="theme-color">.
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initialisiereTheme beim Bootstrap)
 * - public/leitstand/views/einstellungen.js (aktuellesTheme, setzeTheme, abonniereThemeWechsel)
 * - public/leitstand/shell.js (F44 WS-1b: Hell/Dunkel-Schalter im Kopf — aktuellesTheme, setzeTheme,
 *   abonniereThemeWechsel; beide Bedienstellen bleiben so synchron)
 *
 * Wichtig:
 * - Import-sicher: kein Zugriff auf DOM oder Storage beim Import.
 * - Keine Farbliterale hier (Token-Gate scannt jede *.js): theme-color liest den Wert
 *   des Tokens --bg zur Laufzeit per getComputedStyle, statt ihn zu kennen.
 * - Ein kaputter oder fremder Speicherwert fällt auf dunkel zurück.
 */

/** Unterstützte Themes; das erste ist Standard. */
export const THEMES = ['dark', 'light']

const STANDARD_THEME = 'dark'
const SPEICHER_SCHLUESSEL = 'leitstand-theme'

/** F44 WS-1b: Abonnenten eines Theme-Wechsels (Schalter im Kopf, Seite Einstellungen). */
const themeAbonnenten = []

/**
 * F44 WS-1b: Meldet jeden Wechsel über setzeTheme() (Muster abonniereBewegungsAenderung in persona.js).
 * @param fn - () => void
 */
export function abonniereThemeWechsel(fn) {
  themeAbonnenten.push(fn)
}

/**
 * Prüft, ob ein Wert ein unterstütztes Theme ist.
 * @param wert - beliebiger Wert
 * @returns true für 'dark' und 'light'
 */
export function istTheme(wert) {
  return typeof wert === 'string' && THEMES.includes(wert)
}

/** @returns das gespeicherte Theme oder den Standard (fehlend, ungültig, Storage gesperrt) */
function leseGespeichertesTheme() {
  try {
    const wert = localStorage.getItem(SPEICHER_SCHLUESSEL)
    return istTheme(wert) ? wert : STANDARD_THEME
  } catch {
    return STANDARD_THEME
  }
}

/** Setzt <meta name="theme-color"> auf den aktuellen Wert des Tokens --bg (legt das Element bei Bedarf an). */
function aktualisiereThemeColor() {
  const wert = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
  if (wert === '') return
  let meta = document.querySelector('meta[name="theme-color"]')
  if (meta === null) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  meta.content = wert
}

/** @returns das aktive Theme laut <html data-theme> (Standard, wenn das Attribut fehlt oder fremd ist) */
export function aktuellesTheme() {
  const wert = document.documentElement.dataset.theme
  return istTheme(wert) ? wert : STANDARD_THEME
}

/**
 * Gleicht beim Bootstrap <html data-theme> mit dem Speicher ab und setzt theme-color.
 * @returns das aktive Theme
 */
export function initialisiereTheme() {
  const theme = leseGespeichertesTheme()
  document.documentElement.dataset.theme = theme
  aktualisiereThemeColor()
  return theme
}

/**
 * Wechselt das Theme sofort (reine CSS-Variablen, kein Neuladen) und speichert es.
 * Ein unbekannter Wert wird ignoriert.
 * @param theme - 'dark' oder 'light'
 */
export function setzeTheme(theme) {
  if (!istTheme(theme)) {
    console.warn(`theme: unbekanntes Theme ignoriert: ${String(theme)}`)
    return
  }
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(SPEICHER_SCHLUESSEL, theme)
  } catch (fehler) {
    // Gilt dann nur bis zum nächsten Laden — sichtbar gewechselt ist trotzdem.
    console.error('theme: Auswahl konnte nicht gespeichert werden:', fehler)
  }
  aktualisiereThemeColor()
  // Jeder Abonnent einzeln gefangen — ein werfender blockiert die übrigen nicht.
  for (const fn of themeAbonnenten) {
    try {
      fn()
    } catch (fehler) {
      console.error('theme: ein Abonnent ist fehlgeschlagen:', fehler)
    }
  }
}
