/**
 * Datei: public/leitstand/vorschau-panel.js
 *
 * Zweck: F45 V1 „Live-Vorschau des Projekts im Leitstand (Stufe 1)“ (E-VORSCHAU-1 = A, features/F45/plan-v1.md und
 * plan-v1-v2.md) — Inhalt von Karte c der Produktübersicht: die laufende App des gewählten Projekts als iframe auf genau
 * die vom Server geprüfte vorschau_url (GET /api/projekte/<id>/projekt-aufruf, F43 pruefeVorschau), mit „Neu laden“ und
 * „In neuem Tab öffnen“; sonst „Start Building“ mit Weg zu „Auftrag & Start“ (#/projekt) und einem Hinweis je Grund.
 * Der Leitstand startet und stoppt nichts (F43-Nicht-Ziel „kein Start/Stopp“).
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/dashboard.js (Panel #uebersicht-vorschau; lade() beim Betreten und Projektwechsel, neuLaden()
 *   auf Klick)
 * - public/leitstand/vorschau-panel.test.mjs, scripts/check-f45-v1-vorschau.mjs
 *
 * Wichtig:
 * - Import-sicher: kein DOM, kein Netz beim Laden; Abruf, Element und Leitstand-Port werden injiziert. Kein Import von
 *   zustand.js oder api.js — das Panel liegt nie im Poll-Pfad (Gate f45-v1-vorschau (d)).
 * - Eigene Erreichbarkeitsprüfung gibt es nicht; die Client-Regel spiegelt nur die Form der Serverregel
 *   (src/projekte/index.ts VORSCHAU_URL_MUSTER) und sperrt zusätzlich den eigenen Port (zweite Linie zu F-849).
 * - Das iframe wird nur bei geändertem Zustand (art, url, grund) neu geschrieben; „Neu laden“ bei gleichem Zustand
 *   lädt das vorhandene Element neu (src), statt es zu ersetzen.
 * - Projektname und URL werden escaped; alle übrigen Texte über t().
 */

import { tHtml } from './i18n.js'
import { escapeHtml } from './render.js'

/** sandbox des iframes: Skripte, eigene Herkunft (für die App selbst) und Formulare — keine Top-Navigation, keine Pop-ups. */
export const VORSCHAU_SANDBOX = 'allow-scripts allow-same-origin allow-forms'

/** Dieselbe Form wie die Serverregel: nur http://localhost:<port> bzw. http://127.0.0.1:<port>, ohne Pfad. */
const LOKALE_URL = /^http:\/\/(localhost|127\.0\.0\.1):([1-9][0-9]{0,4})$/

/**
 * true, wenn die URL eingebettet werden darf: Form der Serverregel, Port bis 65535 und nicht der Port des Leitstands
 * (leer oder unbekannt zählt als 80, fail-closed).
 * @param url - vorschau_url aus der Serverantwort
 * @param leitstandPort - location.port des Leitstands
 * @returns boolean
 */
export function istZulaessigeVorschauUrl(url, leitstandPort) {
  const treffer = typeof url === 'string' ? LOKALE_URL.exec(url) : null
  if (treffer === null || Number(treffer[2]) > 65535) return false
  const eigener =
    leitstandPort === undefined || leitstandPort === null || leitstandPort === '' ? '80' : String(leitstandPort)
  return treffer[2] !== eigener
}

/**
 * Zustand der Karte aus der Antwort von GET …/projekt-aufruf.
 * @param antwort - Antwortkörper ({ vorschau: { url, erreichbar, grund } }) oder null
 * @param leitstandPort - location.port des Leitstands
 * @returns { art: 'vorschau', url } oder { art: 'start', grund: 'keineUrl' | 'nichtZulaessig' | 'nichtErreichbar' | 'fehler', url? }
 */
export function vorschauZustand(antwort, leitstandPort) {
  const v = antwort?.vorschau
  if (v === null || typeof v !== 'object') return { art: 'start', grund: 'fehler' }
  if (typeof v.url !== 'string') return { art: 'start', grund: 'keineUrl' }
  if (v.erreichbar === null || !istZulaessigeVorschauUrl(v.url, leitstandPort))
    return { art: 'start', grund: 'nichtZulaessig', url: v.url }
  if (v.erreichbar !== true) return { art: 'start', grund: 'nichtErreichbar', url: v.url }
  return { art: 'vorschau', url: v.url }
}

/**
 * HTML der Karte.
 * @param zustand - { art: 'laedt' } oder Ergebnis von vorschauZustand
 * @param projektName - Name des aktiven Projekts (Titel des iframes)
 * @returns HTML
 */
export function vorschauHtml(zustand, projektName) {
  const neuLaden = `<button type="button" class="button" data-vorschau-neu-laden>${tHtml('vorschau.neuLaden')}</button>`
  const kopf = (knoepfe) =>
    `<div class="uebersicht-vorschau-kopf"><span class="eyebrow">${tHtml('vorschau.eyebrow')}</span>${knoepfe}</div>`
  // Auch im Ladezustand „Neu laden“: hängt die Prüfung, bleibt ein Ausweg (QA 13).
  if (zustand.art === 'laedt') return `${kopf(neuLaden)}<p class="subtle">${tHtml('vorschau.laedt')}</p>`
  if (zustand.art === 'vorschau') {
    const url = escapeHtml(zustand.url)
    const tab = `<a class="button" href="${url}" target="_blank" rel="noopener noreferrer">${tHtml('vorschau.neuerTab')}</a>`
    return `${kopf(`<div class="uebersicht-vorschau-knoepfe">${neuLaden}${tab}</div>`)}
      <code class="uebersicht-vorschau-url" title="${url}">${url}</code>
      <iframe class="uebersicht-vorschau-rahmen" src="${url}" sandbox="${VORSCHAU_SANDBOX}" title="${tHtml('vorschau.rahmenTitel', { projekt: projektName })}"></iframe>`
  }
  return `${kopf('')}<div class="uebersicht-vorschau-start">
      <h2>${tHtml('vorschau.start.titel')}</h2>
      <p>${tHtml('vorschau.start.text')}</p>
      <p class="subtle">${tHtml(`vorschau.hinweis.${zustand.grund}`, { url: zustand.url ?? '' })}</p>
      <div class="action-row"><a class="button" href="#/projekt">${tHtml('vorschau.start.link')}</a>${neuLaden}</div>
    </div>`
}

/**
 * Steuerung des Panels.
 * @param optionen - { hole: (projektId) => Promise<Antwortkörper> (wirft bei Fehler), element: () => Element | null,
 *   leitstandPort: () => string }
 * @returns { lade(projektId, projektName, { neuLaden }), neuLaden(), vergiss() }
 */
export function erzeugeVorschauPanel({ hole, element, leitstandPort }) {
  let projektId = null
  let projektName = ''
  /** Schlüssel des zuletzt geschriebenen Zustands — gleicher Schlüssel ⇒ kein Schreiben, das iframe bleibt dasselbe Element. */
  let geschrieben = null
  /** Überholschutz: nur die jüngste Antwort zählt. */
  let anfrage = 0

  /** @param zustand - neuer Zustand @returns true, wenn das Element neu geschrieben wurde */
  function schreibe(zustand) {
    const ziel = element()
    const schluessel = JSON.stringify([zustand.art, zustand.url ?? '', zustand.grund ?? ''])
    if (ziel === null || schluessel === geschrieben) return false
    ziel.innerHTML = vorschauHtml(zustand, projektName)
    geschrieben = schluessel
    return true
  }

  /**
   * Rückmeldung an „Neu laden“ während der Prüfung (bis 2 s): aria-busy am Knopf; nach einem Neuschreiben bekommt der neue
   * Knopf den Fokus zurück, wenn der alte ihn hatte.
   * @param aktiv - true, wenn ein „Neu laden“ läuft
   * @returns ende(neuGeschrieben)
   */
  function knopfRueckmeldung(aktiv) {
    const knopf = aktiv ? (element()?.querySelector('[data-vorschau-neu-laden]') ?? null) : null
    const hatteFokus = knopf !== null && typeof document !== 'undefined' && document.activeElement === knopf
    knopf?.setAttribute('aria-busy', 'true')
    return (neuGeschrieben) => {
      if (!neuGeschrieben) knopf?.removeAttribute('aria-busy')
      else if (hatteFokus) element()?.querySelector('[data-vorschau-neu-laden]')?.focus()
    }
  }

  /**
   * Zustand aus dem Abruf; ein Wurf ergibt „Start Building“ mit Grund „fehler“.
   * @param id - Projekt-ID
   * @returns Zustand
   */
  async function pruefe(id) {
    try {
      return vorschauZustand(await hole(id), leitstandPort())
    } catch (fehler) {
      console.error(`vorschau-panel: Vorschau von '${id}' nicht prüfbar:`, fehler)
      return { art: 'start', grund: 'fehler' }
    }
  }

  /**
   * Prüft die Vorschau eines Projekts (Betreten, Projektwechsel, „Neu laden“ — nie aus dem Poll).
   * @param id - Projekt-ID
   * @param name - Projektname
   * @param optionen - { neuLaden: true lädt ein unverändertes iframe neu }
   */
  async function lade(id, name, { neuLaden = false } = {}) {
    if (id !== projektId) {
      projektId = id
      projektName = name
      schreibe({ art: 'laedt' })
    }
    const meine = ++anfrage
    const ende = knopfRueckmeldung(neuLaden)
    const zustand = await pruefe(id)
    if (meine !== anfrage || id !== projektId) return
    const neuGeschrieben = schreibe(zustand)
    ende(neuGeschrieben)
    // Unveränderte Vorschau: das vorhandene iframe neu laden (zurück auf die Start-URL der App), nicht ersetzen.
    const rahmen = !neuGeschrieben && neuLaden && zustand.art === 'vorschau' ? element()?.querySelector('iframe') : null
    if (rahmen) rahmen.src = zustand.url
  }

  return {
    lade,
    /** „Neu laden“: prüft erneut und lädt ein unverändertes iframe neu. */
    neuLaden: () => (projektId === null ? Promise.resolve() : lade(projektId, projektName, { neuLaden: true })),
    /** Nach einem neuen Gerüst (neues, leeres Element): beim nächsten lade() wird in jedem Fall geschrieben. */
    vergiss() {
      projektId = null
      geschrieben = null
    },
  }
}
