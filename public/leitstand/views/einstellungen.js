/**
 * Datei: public/leitstand/views/einstellungen.js
 *
 * Zweck: Seite „Einstellungen“ (#/einstellungen, F44 WS-1a, Abgleich F-725 A6/A7/A11),
 * aufgebaut nach der Vorlage V10 (docs/design/vorlage-v10/screens/d_einstellungen.png):
 * Kopf „Dein Atelier / Einstellungen“, links Darstellung & Bewegung (Dunkel/Hell,
 * „Sanfte Bewegung aktivieren“), der Hinweis-Kasten und die Sprachwahl, rechts die
 * Spalte „Silberstich & Himmelsmechanik“ mit der Illustration der Vorlage.
 *
 * Nicht übernommen, weil Prototyp-Inhalt der Vorlage (Abgleich A8): „Designzustände
 * ausprobieren“, „Projekt & Anbindung“, „Alle gestalteten Ansichten“, „Für die
 * Umsetzung“, „Vorschau zurücksetzen“, Badge DESIGNVORSCHAU und Fußzeile „Beispieldaten“.
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initEinstellungenView beim Bootstrap)
 *
 * Wichtig:
 * - Alle Texte über t() (i18n.js) in de/en/tr/ru; das i18n-Gate prüft die literalen
 *   Schlüssel. Jeder Text geht durch escapeHtml, weil Übersetzungen „&“ enthalten.
 * - „Sanfte Bewegung“ ist die Umkehrung von 'leitstand-reduzierte-bewegung'; Zustand und
 *   Schreibpfad liegen in persona.js (bewegungsZustand, setzeReduzierteBewegung), nicht hier.
 *   Der Schalter der Nutzerkarte bleibt bestehen; beide Stellen bleiben über
 *   abonniereBewegungsAenderung synchron. Bei aktiver Systemeinstellung ist der Schalter
 *   deaktiviert — die Systemeinstellung hat Vorrang (Text der Vorlage).
 * - Theme wechselt sofort (theme.js), die Sprache speichert und lädt neu (i18n.js). Die
 *   Sprachwahl ist deshalb eine Schaltflächengruppe im Stil der Farbschema-Wahl und kein
 *   <select>: Unter Windows löst eine Pfeiltaste im geschlossenen <select> sofort „change“
 *   aus — jede Taste hätte die Seite neu geladen (QA-Pass WS-1a, WCAG 3.2.2).
 * - Beim Betreten der Route erhält die Überschrift den Fokus (tabindex="-1"), sonst stünde er
 *   nach dem Klick im Dropdown der Nutzerkarte auf einem ausgeblendeten Element.
 * - Kein Serverzugriff; die Seite ist reine Client-Einstellung.
 */

import { SPRACHEN, aktuelleSprache, setzeSprache, t } from '../i18n.js'
import { abonniereBewegungsAenderung, bewegungsZustand, setzeReduzierteBewegung } from '../persona.js'
import { escapeHtml } from '../render.js'
import { registriere } from '../router.js'
import { aktuellesTheme, setzeTheme } from '../theme.js'

const BILD_PFAD = '/assets/gear.webp'

/** @returns die Sprachnamen je Code (literale Schlüssel, damit das i18n-Gate sie prüft) */
function sprachNamen() {
  return { de: t('sprache.de'), en: t('sprache.en'), tr: t('sprache.tr'), ru: t('sprache.ru') }
}

/**
 * Baut eine Schaltfläche der Sprachwahl (Muster themeKnopf); die aktive Sprache ist gedrückt.
 * @param code - Sprachcode
 * @param name - Sprachname (Endonym)
 * @param aktiv - true für die aktuelle Sprache
 * @returns HTML
 */
function sprachKnopf(code, name, aktiv) {
  return `<button type="button" class="button${aktiv ? ' primary' : ''}" data-sprache-wahl="${code}" lang="${code}" aria-pressed="${aktiv}">${escapeHtml(name)}</button>`
}

/**
 * Baut eine Schaltfläche der Farbschema-Wahl.
 * @param theme - 'dark' oder 'light'
 * @param zeichen - dekoratives Zeichen der Vorlage (☾/☼)
 * @param text - sichtbare Beschriftung
 * @returns HTML
 */
function themeKnopf(theme, zeichen, text) {
  const aktiv = aktuellesTheme() === theme
  return `<button type="button" class="button${aktiv ? ' primary' : ''}" data-theme-wahl="${theme}" aria-pressed="${aktiv}"><span aria-hidden="true">${zeichen}</span> ${escapeHtml(text)}</button>`
}

/** @returns HTML der ganzen Seite im aktuellen Zustand */
function baueSeite() {
  const { reduziert, systemVorrang } = bewegungsZustand()
  const namen = sprachNamen()
  const sprache = aktuelleSprache()
  return `<div class="page-heading">
    <div>
      <div class="eyebrow">${escapeHtml(t('einstellungen.eyebrow'))}</div>
      <h1 tabindex="-1">${escapeHtml(t('einstellungen.titel'))}</h1>
      <p class="description">${escapeHtml(t('einstellungen.beschreibung'))}</p>
    </div>
  </div>
  <div class="split">
    <section>
      <h2>${escapeHtml(t('einstellungen.darstellung.titel'))}</h2>
      <div class="theme-choices" role="group" aria-label="${escapeHtml(t('einstellungen.farbschema.gruppe'))}">
        ${themeKnopf('dark', '☾', t('einstellungen.farbschema.dunkel'))}
        ${themeKnopf('light', '☼', t('einstellungen.farbschema.hell'))}
      </div>
      <p class="subtle">${escapeHtml(t('einstellungen.farbschema.hinweis'))}</p>
      <label class="check">
        <input type="checkbox" id="einstellungen-bewegung"${reduziert ? '' : ' checked'}${systemVorrang ? ' disabled' : ''} />
        <span>${escapeHtml(t('einstellungen.bewegung.titel'))}<br /><span class="subtle" id="einstellungen-bewegung-text">${escapeHtml(t('einstellungen.bewegung.beschreibung'))}${systemVorrang ? ` ${escapeHtml(t('einstellungen.bewegung.systemvorrang'))}` : ''}</span></span>
      </label>
      <div class="note">${escapeHtml(t('einstellungen.hinweis'))}</div>
      <div class="section-label"><h2>${escapeHtml(t('einstellungen.sprache.titel'))}</h2></div>
      <div class="theme-choices" role="group" aria-label="${escapeHtml(t('einstellungen.sprache.feld'))}" aria-describedby="einstellungen-sprache-text">
        ${SPRACHEN.map((code) => sprachKnopf(code, namen[code], code === sprache)).join('')}
      </div>
      <p class="subtle" id="einstellungen-sprache-text">${escapeHtml(t('einstellungen.sprache.hinweis'))}</p>
      <p class="fehler" id="einstellungen-sprache-fehler" hidden>${escapeHtml(t('einstellungen.sprache.fehler'))}</p>
    </section>
    <aside class="summary">
      <h3>${escapeHtml(t('einstellungen.gestaltung.titel'))}</h3>
      <p class="subtle">${escapeHtml(t('einstellungen.gestaltung.text'))}</p>
      <img class="rail-art" src="${BILD_PFAD}" alt="" />
      <div class="eyebrow">${escapeHtml(t('einstellungen.gestaltung.prinzip'))}</div>
      <p class="subtle">${escapeHtml(t('einstellungen.gestaltung.prinzip.zeile1'))}<br />${escapeHtml(t('einstellungen.gestaltung.prinzip.zeile2'))}<br />${escapeHtml(t('einstellungen.gestaltung.prinzip.zeile3'))}</p>
    </aside>
  </div>`
}

/** Rendert die Seite neu, sofern ihr Container existiert. Der Fokus bleibt auf der zuletzt bedienten Stelle. */
function render() {
  const container = document.getElementById('view-einstellungen')
  if (container === null) return
  const fokusId = document.activeElement?.id
  const fokusTheme = document.activeElement?.dataset?.themeWahl
  container.innerHTML = baueSeite()
  if (fokusTheme) container.querySelector(`[data-theme-wahl="${fokusTheme}"]`)?.focus()
  else if (fokusId && container.contains(document.getElementById(fokusId))) document.getElementById(fokusId).focus()
}

/** Setzt den Fokus auf die Überschrift der Seite, wenn er nicht schon in ihr liegt — auch für shell.js (Klick auf „Einstellungen“, während die Seite schon offen ist: kein hashchange, kein Routen-Eintritt). */
export function fokussiereEinstellungen() {
  const container = document.getElementById('view-einstellungen')
  if (container !== null && !container.contains(document.activeElement)) container.querySelector('h1')?.focus()
}

/** Routen-Eintritt: rendert und setzt den Fokus auf die Überschrift. */
function beimBetreten() {
  render()
  fokussiereEinstellungen()
}

/** Verdrahtet die Bedienung per Delegation am Container (überlebt jedes Neurendern). */
function initBedienung() {
  const container = document.getElementById('view-einstellungen')
  container.addEventListener('click', (ereignis) => {
    const sprachZiel = ereignis.target.closest('[data-sprache-wahl]')
    if (sprachZiel !== null) {
      if (sprachZiel.dataset.spracheWahl !== aktuelleSprache() && !setzeSprache(sprachZiel.dataset.spracheWahl)) {
        // Speicher gesperrt (privates Fenster): nicht neu laden, sondern sichtbar sagen, warum nichts passiert.
        const hinweis = document.getElementById('einstellungen-sprache-fehler')
        hinweis.hidden = false
      }
      return
    }
    const knopf = ereignis.target.closest('[data-theme-wahl]')
    if (knopf === null) return
    setzeTheme(knopf.dataset.themeWahl)
    render()
  })
  container.addEventListener('change', (ereignis) => {
    if (ereignis.target.id === 'einstellungen-bewegung') {
      // Häkchen „Sanfte Bewegung“ = Bewegung an = reduziert false. render() folgt über das Abonnement.
      setzeReduzierteBewegung(!ereignis.target.checked)
    }
  })
}

/** Initialisiert die Seite einmalig beim Bootstrap: Bedienung, Route, Abonnement der Bewegungs-Präferenz. */
export function initEinstellungenView() {
  initBedienung()
  registriere(/^#\/einstellungen$/, 'einstellungen', beimBetreten)
  abonniereBewegungsAenderung(render)
}
