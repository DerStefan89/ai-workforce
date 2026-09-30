/**
 * Datei: public/leitstand/views/platzhalter.js
 *
 * Zweck: Vier Seiten der Sidebar V10, die es im Leitstand noch nicht als eigene Ansicht gibt
 * (F44 WS-1b, Abgleich F-725 §5.2):
 * - #/brain und #/produktzyklus sind Z-Seiten (Abgleich K1/K2, E-F44-1 = B): Titel und
 *   Einleitung wie die Vorlage (d_brain, d_produktzyklus_ideate_strategy), die Hauptaktion als
 *   deaktivierter Knopf mit „kommt“ (kommt.js) und ein Leerzustand. Kein Graph, keine Notizen,
 *   keine Beispieldaten.
 * - #/roadmap und #/nutzung sind Zwischenseiten (F-880): Die Daten gibt es schon, sie stehen
 *   bis zum Umbau in WS-2 bzw. WS-6 als Karte an anderer Stelle. Die Seite nennt die Stelle und
 *   verlinkt dorthin — ohne „kommt“, weil nichts Zukünftiges fehlt.
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initPlatzhalterViews beim Bootstrap, vor starteRouter())
 *
 * Wichtig:
 * - Der Titel von Brain und Produktzyklus ist der Name des aktiven Projekts (Projektinhalt,
 *   nicht übersetzt, E-F44-2); die Seite rendert deshalb bei jedem Eintritt und bei jedem
 *   Projektwechsel neu (abonniereProjektWechsel). Alle übrigen Texte über t().
 * - Kein Serverzugriff.
 */

import { t } from '../i18n.js'
import { kommtKnopf } from '../kommt.js'
import { abonniereProjektWechsel, holeAktivesProjekt } from '../projekt-kontext.js'
import { escapeHtml } from '../render.js'
import { registriere } from '../router.js'

/**
 * Seitenkopf im Muster der Vorlage (.page-heading).
 * @param eyebrow - kleine Zeile über dem Titel
 * @param titel - Überschrift
 * @param beschreibung - Einleitung
 * @param aktionHtml - optionaler Knopf rechts (fertiges HTML)
 * @returns HTML
 */
function seitenkopf(eyebrow, titel, beschreibung, aktionHtml = '') {
  return `<div class="page-heading">
    <div>
      <div class="eyebrow">${escapeHtml(eyebrow)}</div>
      <h1>${escapeHtml(titel)}</h1>
      <p class="description">${escapeHtml(beschreibung)}</p>
    </div>
    ${aktionHtml}
  </div>`
}

/**
 * Leerzustand im Muster der Vorlage (.empty).
 * @param titel - kurze Aussage
 * @param text - Erklärung
 * @returns HTML
 */
function leerzustand(titel, text) {
  return `<section class="empty">
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" /></svg>
    <h2>${escapeHtml(titel)}</h2>
    <p>${escapeHtml(text)}</p>
  </section>`
}

/** @returns HTML der Z-Seite Brain */
function brainSeite() {
  return (
    seitenkopf(t('platzhalter.brain.eyebrow'), holeAktivesProjekt().name, t('platzhalter.brain.beschreibung'), kommtKnopf(t('platzhalter.brain.aktion'), { primaer: true })) +
    leerzustand(t('platzhalter.brain.leer.titel'), t('platzhalter.brain.leer.text'))
  )
}

/** @returns HTML der Z-Seite Produktzyklus */
function produktzyklusSeite() {
  return (
    seitenkopf(t('platzhalter.produktzyklus.eyebrow'), holeAktivesProjekt().name, t('platzhalter.produktzyklus.beschreibung'), kommtKnopf(t('platzhalter.produktzyklus.aktion'), { primaer: true })) +
    leerzustand(t('platzhalter.produktzyklus.leer.titel'), t('platzhalter.produktzyklus.leer.text'))
  )
}

/**
 * Zwischenseite mit Verweis auf die heutige Stelle (F-880).
 * @param eyebrow - kleine Zeile über dem Titel
 * @param titel - Überschrift
 * @param text - ein Satz, wo die Daten heute stehen
 * @param linkText - Beschriftung des Verweises
 * @param ziel - Hash der heutigen Stelle
 * @returns HTML
 */
function zwischenseite(eyebrow, titel, text, linkText, ziel) {
  return `${seitenkopf(eyebrow, titel, text)}<a class="text-link" href="${ziel}">${escapeHtml(linkText)} <span aria-hidden="true">→</span></a>`
}

/** Seiten je View-Name: Container-ID ist view-<name>. */
const SEITEN = {
  brain: brainSeite,
  produktzyklus: produktzyklusSeite,
  roadmap: () => zwischenseite(t('platzhalter.roadmap.eyebrow'), t('platzhalter.roadmap.titel'), t('platzhalter.roadmap.text'), t('platzhalter.roadmap.link'), '#/workboard'),
  nutzung: () => zwischenseite(t('platzhalter.nutzung.eyebrow'), t('platzhalter.nutzung.titel'), t('platzhalter.nutzung.text'), t('platzhalter.nutzung.link'), '#/dashboard'),
}

/**
 * Rendert eine Seite in ihren Container; ein fehlender Container wird gemeldet, nicht geworfen.
 * @param name - Schlüssel aus SEITEN
 */
function rendere(name) {
  const container = document.getElementById(`view-${name}`)
  if (container === null) {
    console.error(`platzhalter: Container view-${name} fehlt`)
    return
  }
  container.innerHTML = SEITEN[name]()
}

/** Registriert die vier Routen und rendert Brain/Produktzyklus bei einem Projektwechsel neu. */
export function initPlatzhalterViews() {
  registriere(/^#\/brain$/, 'brain', () => rendere('brain'))
  registriere(/^#\/produktzyklus$/, 'produktzyklus', () => rendere('produktzyklus'))
  registriere(/^#\/roadmap$/, 'roadmap', () => rendere('roadmap'))
  registriere(/^#\/nutzung$/, 'nutzung', () => rendere('nutzung'))
  abonniereProjektWechsel(() => {
    rendere('brain')
    rendere('produktzyklus')
  })
}
