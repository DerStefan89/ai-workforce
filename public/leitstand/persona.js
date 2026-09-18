/**
 * Datei: public/leitstand/persona.js
 *
 * Zweck: F28 (Persona v1 WS-1, v2 WS-2) — montiert die Persona als EIN
 * wiederverwendbares Modul in zwei Varianten aus demselben Bild
 * (public/leitstand/persona-gesicht.webp, von Stefan bereitgestellt):
 * 'badge' in #persona-platzhalter (Kopfzeile, klein, --persona-groesse
 * 2,5rem) und 'gross' in einem neu erzeugten Container am Anfang von
 * #view-chat (groß, --persona-groesse lokal überschrieben, style.css).
 * Beide werden einmalig beim Bootstrap montiert und von DERSELBEN
 * zustand.js-Abonnierung versorgt — der Router versteckt Views nur
 * (hidden-Attribut), zerstört sie nie, ein Mount/Unmount-Lifecycle ist
 * deshalb nicht nötig (Auftrag F28 WS-2).
 *
 * WS-1 baute die Persona noch als handgezeichnetes Inline-SVG (zwei Augen).
 * WS-2 ersetzt das durch das reale Bild — SVG kommt nur noch für 'gross' als
 * dünnes Overlay zum Einsatz, das ausschließlich den weißglühenden
 * Augenkern über den im Bild bereits vorhandenen Augen zeichnet (Risse,
 * Gesichtsform etc. sind im Bild eingebacken, werden NICHT nachgezeichnet).
 * Der Zustand wird weiterhin als data-persona-zustand-Attribut auf JEDEM
 * Host gesetzt; jede Zustandsfarbe/-animation hängt in style.css
 * ausschließlich an diesem Attribut plus den --persona-*-Tokens (keine
 * Farbliterale hier, Gate scripts/check-f28-persona.mjs).
 *
 * "KEIN eigener Timer" (Auftrag) heißt hier konkret: kein zweiter
 * Daten-Poll-Timer, der mit zustand.js' EINEM GET-/api/zustand-Timer
 * konkurriert. Drei rein visuelle, I/O-freie Mechanismen bleiben davon
 * unberührt und sind bewusst so gebaut, dass sie NICHT mit dem Datentimer
 * verwechselt werden können:
 * - Blinzeln (zufällig alle 3-7s, je Host unabhängig): ein sich selbst neu
 *   planender setTimeout, der ausschließlich eine CSS-Klasse kurz an- und
 *   wieder abschaltet (löst den @keyframes-Lauf aus style.css aus) — liest/
 *   schreibt keinen Serverzustand. Cleanup per setTimeout, NICHT per
 *   'animationend' (QA-Pass 18.09.2026, WS-1: 'animationend' feuert nie,
 *   wenn die Animation durch prefers-reduced-motion/den Schalter von
 *   vornherein unterdrückt ist — die Klasse bliebe sonst dauerhaft hängen).
 * - Augenkern-Drift (nur 'gross'): EIN mousemove-Listener schreibt zwei
 *   CSS-Variablen (--persona-augenkern-x/-y, als SVG-Anwenderraum-Einheiten
 *   der 0-100-viewBox, ±6px umgerechnet); die "Dämpfung" übernimmt eine
 *   CSS-transition — keine eigene requestAnimationFrame-Schleife nötig. Für
 *   'badge' bewusst NICHT registriert: bei 2,5rem kein SVG-Overlay, ein
 *   Versatz wäre unsichtbar (Auftrag WS-2).
 * - Awakening (einmalig beim Mount, je Host): dieselbe setTimeout-Cleanup-
 *   Logik wie beim Blinzeln.
 *
 * localStorage für die Bewegungs-Präferenz ist hier bewusst zulässig, obwohl
 * projekt-kontext.js:32 localStorage für Fachzustand ausdrücklich ablehnt:
 * dort geht es um Fachzustand (aktives Projekt) — ein alter, längst
 * geschlossener Tab soll ein fremdes Projekt NICHT dauerhaft "merken",
 * deshalb dort sessionStorage. Eine Bewegungs-Präferenz ist reine
 * Nutzer-/Geräte-Einstellung ohne Tab- oder Projektbezug — sie SOLL
 * geräteweit und über Tabs/Reloads hinweg gelten, genau wofür localStorage
 * gedacht ist (F-439, Konvention hier etabliert).
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initPersona beim Bootstrap)
 *
 * Wichtig: #persona-platzhalter bleibt aria-hidden="true" (index.html), der
 * neu erzeugte #persona-gross-Container ebenso. Das Bild ist dekorativ
 * (alt=""). #persona-text-status ist die EINZIGE aria-live-Quelle für beide
 * Varianten — kein zweiter Live-Bereich für 'gross' (Auftrag WS-2).
 */

import { leitePersonaZustandAb } from './persona-state.js'
import { abonniere } from './zustand.js'

const REDUZIERTE_BEWEGUNG_SCHLUESSEL = 'leitstand-reduzierte-bewegung'
const BLICKVERSATZ_MAX_PX = 6
const BLINZELN_MIN_MS = 3000
const BLINZELN_MAX_MS = 7000
// Deckt sich mit den CSS-Keyframe-Dauern in style.css (persona-blinzeln-bild/persona-awakening).
const BLINZELN_DAUER_MS = 280
const AWAKENING_DAUER_MS = 1200

const BILD_PFAD = '/persona-gesicht.webp'

// Am Bild ermittelte, normalisierte Augenkoordinaten (0-100, deckungsgleich mit der
// SVG-viewBox "0 0 100 100" von .persona-augenkern-overlay) — visuell feinjustiert laut Auftrag,
// falls der Kern optisch neben dem im Bild gezeichneten Auge sitzt.
const AUGENKOORDINATEN = {
  links: { cx: 37.7, cy: 39.8, rx: 4.4, ry: 3.9 },
  rechts: { cx: 62.8, cy: 40.1, rx: 3.6, ry: 3.6 },
}

/** Deutscher Klartext je Persona-Zustand für das aria-live-Text-Äquivalent. */
const ZUSTAND_TEXT = {
  idle: 'Persona: bereit.',
  thinking: 'Persona: denkt nach.',
  waiting_for_human: 'Persona: wartet auf deine Entscheidung.',
  error: 'Persona: braucht Aufmerksamkeit — Fehler oder Startfehler liegt vor.',
}

/** Alle gemounteten Persona-Hosts (badge + gross) — aktualisierePersona() setzt data-persona-zustand auf jedem. */
const PERSONA_HOSTS = []

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

/** Spiegelt den aktuellen Reduziert-Bewegung-Zustand auf das html-Root-Element (CSS-Gate für alle Persona-Animationen, style.css). */
function wendeReduzierteBewegungAn() {
  document.documentElement.dataset.reduzierteBewegung = String(reduzierteBewegungAktiv())
}

/**
 * Baut den sichtbaren Schalter "Animationen reduzieren" in #shell-kopf (harte Regel: zusätzlich
 * zur OS-Präferenz ein sichtbarer Schalter, Präferenz in localStorage). QA-Pass 18.09.2026: bei
 * bereits aktiver OS-Präferenz (prefers-reduced-motion: reduce) wäre "einschalten" ein
 * irreführendes Label — ein Klick kann die Bewegung dann ohnehin nicht reaktivieren
 * (reduzierteBewegungAktiv() ist eine ODER-Verknüpfung). Der Schalter wird deshalb in diesem Fall
 * deaktiviert und benennt die Systemeinstellung als Ursache, statt eine Wirkung vorzutäuschen.
 */
function baueBewegungsSchalter() {
  const schalter = document.createElement('button')
  schalter.type = 'button'
  schalter.id = 'persona-bewegung-schalter'
  const aktualisiereBeschriftung = () => {
    const osPraeferenz = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const aus = reduzierteBewegungAktiv()
    schalter.disabled = osPraeferenz
    schalter.setAttribute('aria-pressed', String(aus))
    schalter.textContent = osPraeferenz ? 'Persona-Animationen reduziert (Systemeinstellung)' : aus ? 'Persona-Animationen einschalten' : 'Persona-Animationen reduzieren'
  }
  schalter.addEventListener('click', () => {
    const neu = localStorage.getItem(REDUZIERTE_BEWEGUNG_SCHLUESSEL) !== 'true'
    try {
      localStorage.setItem(REDUZIERTE_BEWEGUNG_SCHLUESSEL, String(neu))
    } catch {
      // s.o. — der Schalter wirkt dann nur für die laufende Seitenansicht.
    }
    wendeReduzierteBewegungAn()
    aktualisiereBeschriftung()
  })
  aktualisiereBeschriftung()
  document.getElementById('shell-kopf').appendChild(schalter)
}

/** Baut das dekorative Bild plus Tint-Schicht — gemeinsame Struktur beider Varianten (Punkt 3 des Auftrags). @returns DocumentFragment */
function baueBildUndTint() {
  const bild = document.createElement('img')
  bild.className = 'persona-bild'
  bild.src = BILD_PFAD
  bild.alt = ''

  const tint = document.createElement('div')
  tint.className = 'persona-tint'

  const fragment = document.createDocumentFragment()
  fragment.append(bild, tint)
  return fragment
}

/**
 * Baut die Lid-Schicht (Punkt 5 des Auftrags) — wird in montierePersona() IMMER zuletzt
 * eingehängt, nach einem etwaigen Augenkern-Overlay ('gross'). Code-Review-Befund 18.09.2026:
 * ohne diese feste Reihenfolge lag das SVG-Overlay im Stapelkontext über dem Lid (beide
 * position:absolute, kein z-index gesetzt → DOM-Reihenfolge entscheidet) — der glühende
 * Augenkern blieb beim Blinzeln sichtbar, statt vom Lid verdeckt zu werden.
 * @returns HTMLDivElement
 */
function baueLidSchicht() {
  const lid = document.createElement('div')
  lid.className = 'persona-lid-bild'
  return lid
}

/** Baut das SVG-Overlay mit dem weißglühenden Augenkern — nur für Variante 'gross' (Auftrag Punkt 4). @returns SVGSVGElement */
function baueAugenkernOverlay() {
  const NS = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('class', 'persona-augenkern-overlay')
  svg.setAttribute('viewBox', '0 0 100 100')
  svg.setAttribute('preserveAspectRatio', 'none')
  svg.setAttribute('role', 'presentation')
  svg.setAttribute('focusable', 'false')
  for (const koordinaten of Object.values(AUGENKOORDINATEN)) {
    const ellipse = document.createElementNS(NS, 'ellipse')
    ellipse.setAttribute('class', 'persona-augenkern')
    ellipse.setAttribute('cx', String(koordinaten.cx))
    ellipse.setAttribute('cy', String(koordinaten.cy))
    ellipse.setAttribute('rx', String(koordinaten.rx))
    ellipse.setAttribute('ry', String(koordinaten.ry))
    svg.appendChild(ellipse)
  }
  return svg
}

/** Plant den nächsten Blink zufällig in 3-7s ein — rein visuell, kein Datentimer (siehe Kopfkommentar). @param host - ein Persona-Host (badge oder gross) */
function planeNaechstenBlink(host) {
  const verzoegerung = BLINZELN_MIN_MS + Math.random() * (BLINZELN_MAX_MS - BLINZELN_MIN_MS)
  setTimeout(() => {
    if (!reduzierteBewegungAktiv()) {
      host.classList.add('persona-blinzelt')
      setTimeout(() => host.classList.remove('persona-blinzelt'), BLINZELN_DAUER_MS)
    }
    planeNaechstenBlink(host)
  }, verzoegerung)
}

/**
 * Registriert die gedämpfte Augenkern-Drift für 'gross' — mousemove schreibt nur zwei
 * CSS-Variablen in SVG-Anwenderraum-Einheiten (0-100-viewBox, deckungsgleich mit dem Host dank
 * preserveAspectRatio="none"), die Dämpfung übernimmt eine CSS-transition (kein Animationstimer).
 * @param host - der 'gross'-Persona-Host
 */
function registriereAugenkernDrift(host) {
  window.addEventListener('mousemove', (ereignis) => {
    if (reduzierteBewegungAktiv()) return
    const rechteck = host.getBoundingClientRect()
    if (rechteck.width === 0 || rechteck.height === 0) return
    const mitteX = rechteck.left + rechteck.width / 2
    const mitteY = rechteck.top + rechteck.height / 2
    const versatzXPx = Math.max(-BLICKVERSATZ_MAX_PX, Math.min(BLICKVERSATZ_MAX_PX, (ereignis.clientX - mitteX) / 20))
    const versatzYPx = Math.max(-BLICKVERSATZ_MAX_PX, Math.min(BLICKVERSATZ_MAX_PX, (ereignis.clientY - mitteY) / 20))
    // px → viewBox-Einheiten: die Host-Kantenlänge ist variabel (--persona-groesse), ein fester
    // Umrechnungsfaktor wäre bei jeder anderen Größe falsch.
    host.style.setProperty('--persona-augenkern-x', String((versatzXPx / rechteck.width) * 100))
    host.style.setProperty('--persona-augenkern-y', String((versatzYPx / rechteck.height) * 100))
  })
}

/** Baut das Text-Äquivalent (aria-live) in #shell-kopf — eigenes Element, beide Persona-Hosts bleiben aria-hidden. */
function bauePersonaTextStatus() {
  const status = document.createElement('p')
  status.id = 'persona-text-status'
  status.className = 'persona-text-status'
  status.setAttribute('aria-live', 'polite')
  status.textContent = ZUSTAND_TEXT.idle
  document.getElementById('shell-kopf').appendChild(status)
}

/** Erzeugt den Container der 'gross'-Variante am Anfang von #view-chat (Auftrag WS-2, Punkt 2) — dekorativ, aria-hidden. @returns der neue Host */
function baueGrossContainer() {
  const chatView = document.getElementById('view-chat')
  const host = document.createElement('div')
  host.id = 'persona-gross'
  host.setAttribute('aria-hidden', 'true')
  chatView.insertBefore(host, chatView.firstChild)
  return host
}

/**
 * Montiert eine Persona-Instanz in host und startet Awakening/Blinzeln. Einhängereihenfolge ist
 * bewusst fest: Bild+Tint, dann (nur 'gross') das Augenkern-Overlay, dann IMMER zuletzt die
 * Lid-Schicht — damit das Lid beim Blinzeln über allem liegt, siehe baueLidSchicht().
 *
 * Exportiert seit F29 WS-1a: die Startfläche (views/start.js) montiert hiermit eine DRITTE
 * 'gross'-Instanz, statt Lid-Schicht/Awakening-Mechanik dort ein zweites Mal zu bauen (Auftrag:
 * "vorhandene Mechanik wiederverwenden, KEINE zweite Mechanik"). Reiner Re-Export einer
 * bestehenden Funktion — die Mechanik selbst ist unverändert (F29-Nicht-Ziel).
 * @param host - der Ziel-Container @param variante - 'badge' | 'gross'
 */
export function montierePersona(host, variante) {
  host.innerHTML = ''
  host.classList.add('persona-host', `persona-host-${variante}`)
  host.dataset.personaZustand = 'idle'
  host.appendChild(baueBildUndTint())
  if (variante === 'gross') {
    host.appendChild(baueAugenkernOverlay())
    registriereAugenkernDrift(host)
  }
  host.appendChild(baueLidSchicht())

  if (!reduzierteBewegungAktiv()) {
    host.classList.add('persona-awakening')
    setTimeout(() => host.classList.remove('persona-awakening'), AWAKENING_DAUER_MS)
  }

  planeNaechstenBlink(host)
  PERSONA_HOSTS.push(host)
}

/** Aktualisiert das Zustandsattribut auf JEDEM Persona-Host und das gemeinsame Text-Äquivalent (zustand.js' abonniere()-Aufruf). @param zustand - Aggregat aus GET /api/zustand */
function aktualisierePersona(zustand) {
  const persona = leitePersonaZustandAb(zustand)
  for (const host of PERSONA_HOSTS) host.dataset.personaZustand = persona
  document.getElementById('persona-text-status').textContent = ZUSTAND_TEXT[persona]
}

/** Montiert beide Persona-Varianten (badge in #persona-platzhalter, gross in #view-chat) und abonniert den zentralen Zustands-Poll EINMAL für beide (F28 WS-1/WS-2). */
export function initPersona() {
  bauePersonaTextStatus()
  baueBewegungsSchalter()
  wendeReduzierteBewegungAn()

  montierePersona(document.getElementById('persona-platzhalter'), 'badge')
  montierePersona(baueGrossContainer(), 'gross')

  abonniere(aktualisierePersona)
}
