/**
 * Datei: public/leitstand/persona.js
 *
 * Zweck: F28 (Persona v1 WS-1, v2 WS-2) — montiert die Persona in #persona-platzhalter
 * (Kopfzeile) aus dem Bild public/leitstand/persona-gesicht.webp und hält sie mit dem
 * zentralen Zustands-Poll (zustand.js) synchron: vier Zustände idle / thinking /
 * waiting_for_human / error (persona-state.js), gesetzt als data-persona-zustand am Host.
 * Jede Zustandsfarbe hängt in style.css ausschließlich an diesem Attribut plus den
 * --persona-*-Tokens (keine Farbliterale hier, Gate scripts/check-f28-persona.mjs).
 *
 * F44 WS-1b (F-725, Vorlage V10 .persona-button/.persona-portrait, Abgleich A1/A5):
 * - Das Bild ist seit WS-1b das Gesicht der Vorlage (1536×1024, RGBA, verlustfrei). Es wird
 *   wie in der Vorlage ganz gezeigt (object-fit: contain, style.css), ohne Zuschnitt. Damit
 *   entfallen der Badge-Zoom, das SVG-Augenkern-Overlay (AUGENKOORDINATEN), der Blickversatz
 *   per mousemove, die Variante 'gross' (die Startfläche zeigt seit WS-1b drei Ebenen des
 *   Bildes, views/start.js; die Chatspalte montiert keine Persona) sowie Blinzeln und
 *   Awakening: Beide lagen als eigene Schicht über einem undurchsichtigen Kreis, auf dem
 *   transparenten Bild wären sie ein sichtbarer Balken bzw. ein zweites Einblenden neben
 *   persona-arrive. Die Vorlage hat keins von beiden.
 * - Neu ist persona-arrive (0,7 s, Vorlage): bei jedem Seitenwechsel blendet das Kopfportrait
 *   neu ein (Klasse .persona-arrive, Neustart per Reflow). Bei reduzierter Bewegung schaltet
 *   style.css die Animation ab.
 * - Die Statuszeile #persona-text-status steht neben dem Persona-Knopf im Kopf und ist die
 *   EINZIGE aria-live-Region im Dokument (A15, eine Live-Region). Ihre Texte kommen über t()
 *   aus den Wörterbüchern (persona.status.*). Ein Sprachwechsel lädt neu (i18n.js) und löst
 *   deshalb keine Ansage aus.
 * - Der Schalter „Animationen reduzieren“ der Nutzerkarte entfällt mit der Nutzerkarte; die
 *   Bedienstelle ist die Seite Einstellungen („Sanfte Bewegung“). Zustand und Schreibpfad
 *   bleiben hier (bewegungsZustand, setzeReduzierteBewegung, abonniereBewegungsAenderung).
 *
 * localStorage für die Bewegungs-Präferenz ist hier bewusst zulässig, obwohl
 * projekt-kontext.js localStorage für Fachzustand ausdrücklich ablehnt: Eine
 * Bewegungs-Präferenz ist reine Geräte-Einstellung ohne Tab- oder Projektbezug (F-439).
 *
 * "KEIN eigener Timer" (Auftrag F28): kein zweiter Daten-Poll neben zustand.js. Der einzige
 * Listener hier ist 'hashchange' für persona-arrive — rein visuell, ohne Serverdaten.
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initPersona beim Bootstrap)
 * - public/leitstand/views/einstellungen.js (bewegungsZustand, setzeReduzierteBewegung,
 *   abonniereBewegungsAenderung)
 *
 * Wichtig: #persona-platzhalter bleibt aria-hidden="true" (index.html), das Bild ist
 * dekorativ (alt=""); den Namen trägt der umschließende Knopf #persona-kopf-oeffner.
 */

import { t } from './i18n.js'
import { leitePersonaZustandAb } from './persona-state.js'
import { abonniere } from './zustand.js'

const REDUZIERTE_BEWEGUNG_SCHLUESSEL = 'leitstand-reduzierte-bewegung'

const BILD_PFAD = '/persona-gesicht.webp'

/** Der montierte Host im Kopf (#persona-platzhalter), oder null vor initPersona(). */
let kopfHost = null

/**
 * Sichtbarer Statustext je Persona-Zustand (Vorlage V10, Abgleich A5). Literale Schlüssel,
 * damit das i18n-Gate sie prüft.
 * @param persona - 'idle' | 'thinking' | 'waiting_for_human' | 'error'
 * @returns der übersetzte Text
 */
function zustandText(persona) {
  const texte = {
    idle: t('persona.status.idle'),
    thinking: t('persona.status.thinking'),
    waiting_for_human: t('persona.status.waiting_for_human'),
    error: t('persona.status.error'),
  }
  return texte[persona]
}

/** @returns true, wenn Animationen aus sein sollen — OS-Präferenz ODER der gespeicherte Schalter. */
function reduzierteBewegungAktiv() {
  const osPraeferenz = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  let gespeichert = false
  try {
    gespeichert = localStorage.getItem(REDUZIERTE_BEWEGUNG_SCHLUESSEL) === 'true'
  } catch {
    // Privates Fenster/blockierter Zugriff — Schalter bleibt aus, kein Absturz (Muster projekt-kontext.js).
  }
  return osPraeferenz || gespeichert
}

/** Spiegelt den aktuellen Reduziert-Bewegung-Zustand auf das html-Root-Element (CSS-Gate für alle Shell-Animationen, style.css). */
function wendeReduzierteBewegungAn() {
  document.documentElement.dataset.reduzierteBewegung = String(reduzierteBewegungAktiv())
}

/** F44 WS-1a: Abonnenten einer Änderung der Bewegungs-Präferenz (Seite Einstellungen). */
const bewegungsAbonnenten = []

/**
 * F44 WS-1a: Zustand der Bewegungs-Präferenz für andere Bedienstellen (views/einstellungen.js),
 * damit die Logik (OS-Präferenz ODER gespeicherter Schalter) nur hier lebt.
 * @returns { reduziert, systemVorrang } — reduziert: Animationen aus; systemVorrang: die
 *   OS-Präferenz erzwingt das, ein Schalter kann es nicht ändern
 */
export function bewegungsZustand() {
  const systemVorrang = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  return { reduziert: reduzierteBewegungAktiv(), systemVorrang }
}

/**
 * F44 WS-1a: Speichert die Bewegungs-Präferenz (localStorage 'leitstand-reduzierte-bewegung'),
 * wendet sie an und benachrichtigt alle Bedienstellen. Einziger Schreibpfad dieses Zustands.
 * @param reduziert - true: Animationen reduzieren
 */
export function setzeReduzierteBewegung(reduziert) {
  try {
    localStorage.setItem(REDUZIERTE_BEWEGUNG_SCHLUESSEL, String(reduziert))
  } catch (fehler) {
    // Privates Fenster/blockierter Zugriff — kein Absturz, aber gemeldet: Ohne Speicher bleibt der
    // bisherige Zustand stehen, und die Bedienstellen zeigen nach der Benachrichtigung genau ihn.
    console.warn('Bewegungs-Präferenz konnte nicht gespeichert werden:', fehler)
  }
  wendeReduzierteBewegungAn()
  // Jeder Abonnent einzeln gefangen (Muster projekt-kontext.js setzeAktivesProjekt).
  for (const fn of bewegungsAbonnenten) {
    try {
      fn()
    } catch (fehler) {
      console.error('Bewegungs-Präferenz: ein Abonnent ist fehlgeschlagen:', fehler)
    }
  }
}

/**
 * F44 WS-1a: Meldet jede Änderung der Bewegungs-Präferenz (über setzeReduzierteBewegung).
 * @param fn - () => void
 */
export function abonniereBewegungsAenderung(fn) {
  bewegungsAbonnenten.push(fn)
}

/**
 * Baut die Statuszeile (aria-live) direkt neben dem Persona-Knopf im Kopf — eigenes Element,
 * der Host bleibt aria-hidden. Einzige aria-live-Region im Dokument.
 */
function bauePersonaTextStatus() {
  const status = document.createElement('p')
  status.id = 'persona-text-status'
  status.className = 'persona-text-status'
  status.setAttribute('aria-live', 'polite')
  status.textContent = zustandText('idle')
  document.getElementById('persona-kopf-oeffner').after(status)
}

/**
 * Montiert die Persona in host: Bild (object-fit: contain) und darüber die Zustands-Tönung,
 * die style.css über eine Maske auf die Bildpixel begrenzt.
 * @param host - #persona-platzhalter
 */
function montierePersona(host) {
  const bild = document.createElement('img')
  bild.className = 'persona-bild persona-portrait'
  bild.src = BILD_PFAD
  bild.alt = ''

  const tint = document.createElement('span')
  tint.className = 'persona-tint'

  host.replaceChildren(bild, tint)
  host.classList.add('persona-host')
  host.dataset.personaZustand = 'idle'
  kopfHost = host
}

/**
 * persona-arrive (Vorlage V10, 0,7 s): startet die Einblend-Animation des Kopfportraits neu —
 * beim Bootstrap und bei jedem Seitenwechsel. Die Klasse wird entfernt, ein Reflow erzwungen und
 * sie wieder gesetzt; reduzierte Bewegung schaltet die Animation in style.css ab.
 */
function spielePersonaArrive() {
  const bild = kopfHost?.querySelector('.persona-bild')
  if (bild === null || bild === undefined) return
  bild.classList.remove('persona-arrive')
  void bild.offsetWidth
  bild.classList.add('persona-arrive')
}

/** Aktualisiert das Zustandsattribut und die Statuszeile (zustand.js' abonniere()-Aufruf). @param zustand - Aggregat aus GET /api/zustand */
function aktualisierePersona(zustand) {
  const persona = leitePersonaZustandAb(zustand)
  if (kopfHost !== null) kopfHost.dataset.personaZustand = persona
  const text = zustandText(persona)
  const status = document.getElementById('persona-text-status')
  // Nur bei echter Änderung schreiben: jeder Poll-Tick mit demselben Text wäre sonst eine
  // erneute Ansage der Live-Region in manchen Screenreadern.
  if (status !== null && status.textContent !== text) status.textContent = text
  // Unter 1150 px ist die Statuszeile nur für Screenreader da; der title am Knopf zeigt sie beim
  // Zeigen mit der Maus (design-guardian WS-1b).
  document.getElementById('persona-kopf-oeffner')?.setAttribute('title', text)
}

/** Montiert die Persona im Kopf, baut die Statuszeile und abonniert den zentralen Zustands-Poll. */
export function initPersona() {
  bauePersonaTextStatus()
  wendeReduzierteBewegungAn()
  montierePersona(document.getElementById('persona-platzhalter'))
  spielePersonaArrive()
  window.addEventListener('hashchange', spielePersonaArrive)
  abonniere(aktualisierePersona)
}
