/**
 * Datei: public/leitstand/i18n.js
 *
 * Zweck: i18n-Kern des Leitstands (F44 WS-1a, E-F44-2 = B, Abgleich F-725 §5.4).
 * Übersetzt UI-Texte über Schlüssel aus vier Wörterbüchern (de/en/tr/ru), wählt
 * Pluralformen über Intl.PluralRules und formatiert Datum und Zahl über
 * Intl.DateTimeFormat bzw. Intl.NumberFormat.
 *
 * Schlüssel: flach, mit Punkten, `bereich.element[.variante]`, z. B.
 * `einstellungen.titel`. Platzhalter im Text: `{name}`. Ein Pluralwert ist ein
 * Objekt mit den Kategorien von Intl.PluralRules der Sprache (z. B. ru: one, few,
 * many, other); gewählt wird über `werte.anzahl`.
 *
 * Rückfall: Fehlt ein Schlüssel in der aktuellen Sprache, gilt de. Fehlt er auch
 * dort, erscheint der Schlüssel selbst, und console.warn meldet ihn.
 *
 * Nicht übersetzt werden Serverantworten, Projektinhalte, Nutzereingaben, IDs und
 * Befehle (E-F44-2 = B) — die gehen nie durch t().
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initialisiereSprache beim Bootstrap)
 * - public/leitstand/views/einstellungen.js (t, aktuelleSprache, setzeSprache)
 * - public/leitstand/shell.js (t, uebersetzeDokument, aktuelleSprache, setzeSprache — Sidebar und Kopf, F44 WS-1b)
 * - public/leitstand/persona.js, projekt-kontext.js, kommt.js, views/start.js, views/platzhalter.js (t, F44 WS-1b)
 * - public/leitstand/views/attention.js, views/roadmap.js (t, formatiereDatum, F44 WS-2a)
 * - public/leitstand/i18n.test.mjs (node:test)
 * - scripts/check-f44-i18n.mjs (SPRACHEN, Wörterbücher)
 * - tHtml (F44 WS-4b): views/dashboard.js, workboard.js, workboard-detail.js, workflows.js,
 *   workflow-detail.js, workflow-abnahme.js, workflow-eingriffe.js, empfehlung-installation.js;
 *   views/capabilities.js (t, tHtml, formatiereZahl — Werkstatt, F44 WS-7a)
 *
 * Wichtig:
 * - Import-sicher: Beim Import greift dieses Modul weder auf DOM noch auf Storage
 *   zu; in Node gilt deshalb immer de. Das hält die Render-Tests unter node:test
 *   (runs.test.mjs, empfehlung-*.test.mjs, f43, f36-ws3) mit deutscher Ausgabe grün.
 *   Erst initialisiereSprache() (Bootstrap) liest localStorage.
 * - setzeSprache() lädt die Seite neu (location.reload). Es gibt bewusst kein
 *   Live-Neurendern: ein Sprachwechsel soll weder halb übersetzte Ansichten noch eine
 *   Ansage der einzigen aria-live-Region (Persona) auslösen.
 * - Die Wörterbücher sind JS-Module statt JSON, weil der Leitstand-Server `.json`
 *   als octet-stream ausliefert (Abgleich §5.4).
 */

import de from './i18n/de.js'
import en from './i18n/en.js'
import ru from './i18n/ru.js'
import tr from './i18n/tr.js'
import { escapeHtml } from './render.js'

/** Unterstützte Sprachen in Anzeigereihenfolge; die erste ist Standard und Rückfall. */
export const SPRACHEN = ['de', 'en', 'tr', 'ru']

/** Wörterbücher je Sprachcode (Default-Export der Dateien unter i18n/). */
export const WOERTERBUECHER = { de, en, tr, ru }

const STANDARD_SPRACHE = 'de'
const SPEICHER_SCHLUESSEL = 'leitstand-sprache'

let sprache = STANDARD_SPRACHE

/** Bereits gemeldete fehlende Schlüssel — jeder erscheint nur einmal in der Konsole. */
const gemeldeteFehlende = new Set()

/**
 * Prüft, ob ein Wert ein unterstützter Sprachcode ist.
 * @param code - beliebiger Wert, z. B. aus localStorage
 * @returns true für de/en/tr/ru
 */
export function istSprache(code) {
  return typeof code === 'string' && SPRACHEN.includes(code)
}

/**
 * Ersetzt `{name}`-Platzhalter durch die Werte; unbekannte Platzhalter bleiben stehen.
 * @param text - Text mit Platzhaltern
 * @param werte - Objekt mit Ersetzungen
 * @returns der Text mit eingesetzten Werten
 */
function setzePlatzhalterEin(text, werte) {
  return text.replace(/\{(\w+)\}/g, (ganz, name) => (werte !== undefined && Object.hasOwn(werte, name) ? String(werte[name]) : ganz))
}

/**
 * Wählt aus einem Wörterbucheintrag den Text für eine Sprache — bei einem Pluralobjekt
 * die Kategorie nach Intl.PluralRules für `werte.anzahl` (Rückfall: `other`) — und setzt
 * die Platzhalter ein. Reine Funktion, auch für Tests exportiert.
 * @param eintrag - String oder Pluralobjekt { one, few, many, other, … }
 * @param code - Sprachcode für die Pluralregeln
 * @param werte - Platzhalterwerte; `anzahl` steuert den Plural
 * @returns der fertige Text
 */
export function waehleText(eintrag, code, werte) {
  if (typeof eintrag === 'string') return setzePlatzhalterEin(eintrag, werte)
  const anzahl = Number(werte?.anzahl ?? 0)
  const kategorie = new Intl.PluralRules(code).select(anzahl)
  const text = eintrag[kategorie] ?? eintrag.other ?? ''
  return setzePlatzhalterEin(text, werte)
}

/**
 * Übersetzt einen Schlüssel in die aktuelle Sprache (Rückfall de, dann der Schlüssel selbst).
 * @param schluessel - flacher Punkt-Schlüssel, z. B. 'einstellungen.titel'
 * @param werte - optionale Platzhalterwerte, `anzahl` für den Plural
 * @returns der übersetzte Text
 */
export function t(schluessel, werte) {
  // Object.hasOwn statt Indexzugriff: sonst träfe der Schlüssel „toString“ eine geerbte Objektmethode.
  const eigenes = WOERTERBUECHER[sprache]
  if (eigenes !== undefined && Object.hasOwn(eigenes, schluessel)) return waehleText(eigenes[schluessel], sprache, werte)
  const rueckfall = WOERTERBUECHER[STANDARD_SPRACHE]
  if (Object.hasOwn(rueckfall, schluessel)) return waehleText(rueckfall[schluessel], STANDARD_SPRACHE, werte)
  if (!gemeldeteFehlende.has(schluessel)) {
    gemeldeteFehlende.add(schluessel)
    console.warn(`i18n: Schlüssel fehlt in allen Wörterbüchern: ${schluessel}`)
  }
  return schluessel
}

/**
 * Übersetzter Text als HTML (F44 WS-4b, F-935/F-940): escapeHtml(t(…)). Ersetzt die früheren lokalen
 * tx() der Views und txHtml() aus empfehlung-anzeige.js — ein zentraler Aufruf, den das i18n-Gate (6)
 * wie literale t-Aufrufe prüft. Optional werden fertige HTML-Stücke (etwa <code>-IDs) eingesetzt: Sie gehen als
 * Marken durch t() und escapeHtml und werden danach ersetzt; der übrige Text bleibt escaped.
 * @param schluessel - i18n-Schlüssel
 * @param werte - Text-Platzhalter (werden escaped)
 * @param htmlWerte - HTML-Platzhalter (bereits escaptes HTML)
 * @returns HTML
 */
export function tHtml(schluessel, werte = {}, htmlWerte = {}) {
  const marken = Object.fromEntries(Object.keys(htmlWerte).map((name, i) => [name, `\u2063${i}\u2063`]))
  let html = escapeHtml(t(schluessel, { ...werte, ...marken }))
  for (const [name, marke] of Object.entries(marken)) html = html.split(marke).join(htmlWerte[name])
  return html
}

/**
 * Formatiert ein Datum in der aktuellen Sprache.
 * @param datum - Date, Zeitstempel oder ISO-String
 * @param optionen - Intl.DateTimeFormat-Optionen
 * @returns der formatierte Text; bei ungültigem Datum der Eingabewert als Text
 */
export function formatiereDatum(datum, optionen) {
  const wert = datum instanceof Date ? datum : new Date(datum)
  if (Number.isNaN(wert.getTime())) return String(datum)
  return new Intl.DateTimeFormat(sprache, optionen).format(wert)
}

/**
 * Formatiert eine Zahl in der aktuellen Sprache.
 * @param zahl - die Zahl
 * @param optionen - Intl.NumberFormat-Optionen
 * @returns der formatierte Text
 */
export function formatiereZahl(zahl, optionen) {
  return new Intl.NumberFormat(sprache, optionen).format(zahl)
}

/** @returns der aktive Sprachcode (de, solange initialisiereSprache nicht lief) */
export function aktuelleSprache() {
  return sprache
}

/**
 * Liest die gespeicherte Sprache (localStorage 'leitstand-sprache', Standard de) und setzt
 * `html lang`. Einmalig beim Bootstrap, vor dem ersten Rendern einer View.
 * @returns der aktive Sprachcode
 */
export function initialisiereSprache() {
  let gespeichert = null
  try {
    gespeichert = localStorage.getItem(SPEICHER_SCHLUESSEL)
  } catch {
    // Privates Fenster/blockierter Zugriff — Standard de, kein Absturz (Muster projekt-kontext.js).
  }
  sprache = istSprache(gespeichert) ? gespeichert : STANDARD_SPRACHE
  document.documentElement.lang = sprache
  return sprache
}

/**
 * Speichert die Sprache und lädt die Seite neu (kein Live-Neurendern, siehe Dateikopf).
 * Ein unbekannter Code wird ignoriert.
 * @param code - de/en/tr/ru
 * @returns false, wenn nicht gewechselt wird (unbekannter Code, Speicher gesperrt); sonst lädt die Seite neu
 */
export function setzeSprache(code) {
  if (!istSprache(code)) {
    console.warn(`i18n: unbekannte Sprache ignoriert: ${String(code)}`)
    return false
  }
  try {
    localStorage.setItem(SPEICHER_SCHLUESSEL, code)
  } catch (fehler) {
    // Ohne Speicher gälte die Wahl nach dem Neuladen nicht — dann nicht neu laden, sondern melden.
    console.error('i18n: Sprache konnte nicht gespeichert werden:', fehler)
    return false
  }
  location.reload()
  return true
}

/** Attribute, die uebersetzeDokument() aus einem data-i18n-*-Schlüssel setzt (F44 WS-1b). */
const UEBERSETZBARE_ATTRIBUTE = ['aria-label', 'title']

/**
 * F44 WS-1b: Übersetzt die statischen Texte in index.html (Sidebar, Kopf, Fehlerbanner), die dort
 * deutsch als Rückfall stehen. Das Attribut `data-i18n` (Wert: Schlüssel) setzt den Textinhalt,
 * `data-i18n-aria-label`/`data-i18n-title` das jeweilige Attribut. Die Schlüssel prüft das
 * i18n-Gate (Regel 6) auch in *.html. Einmalig beim Bootstrap nach initialisiereSprache() —
 * ein Sprachwechsel lädt ohnehin neu.
 * @param wurzel - Element oder Dokument, dessen Nachfahren übersetzt werden (Standard: document)
 */
export function uebersetzeDokument(wurzel = document) {
  for (const element of wurzel.querySelectorAll('[data-i18n]')) element.textContent = t(element.dataset.i18n)
  for (const attribut of UEBERSETZBARE_ATTRIBUTE) {
    for (const element of wurzel.querySelectorAll(`[data-i18n-${attribut}]`)) {
      element.setAttribute(attribut, t(element.getAttribute(`data-i18n-${attribut}`)))
    }
  }
}
