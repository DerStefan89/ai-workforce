/**
 * Datei: public/leitstand/views/attention.js
 *
 * Zweck: View `#/attention` „Deine Entscheidungen“ (F21 WS-2; F44 WS-2a nach Vorlage V10,
 * d_entscheidungen.png, Abgleich F-725 C1–C3) — Aufmerksamkeits-Ansicht als reine
 * Client-Projektion, ohne eigenen Endpunkt und ohne eigenen Poll (F21 Nicht-Ziele,
 * features/F21/feature.md). Vier Quellen: Workflows, die auf Freigabe/Klärung warten, und
 * fehlgeschlagene, nicht kenntnisgenommene Läufe (beide aus dem ohnehin gepollten
 * Zustands-Aggregat), Startfehler (zustand.startfehler) sowie offene P0/P1-Workitems (ein
 * einmaliger GET /api/workitems-Abruf beim Betreten dieser View). Auswahl, Reihenfolge und
 * Titel baut attention-daten.js (baueEntscheidungen) — dieselbe Regel wie views/dashboard.js.
 *
 * Aufbau: Kopf (index.html), Hinweis bei defekter Quelle mit „Erneut laden“, eine durchgehende
 * Liste aus vier aufeinanderfolgenden Gruppen (die Sektionen attention-abschnitt-*, Gate
 * f21-ws2), darunter „Die vier Quellen“ als vier Kacheln mit Zähler.
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initAttentionView beim Bootstrap)
 *
 * Wichtig:
 * - Der Leerzustand gilt nur, wenn ALLE VIER Quellen geladen und leer sind — eine defekte
 *   Quelle (null) zählt NICHT als leer, sie zeigt „nicht verfügbar“ und den Hinweis oben, damit
 *   ein Defekt nie als „nichts zu tun“ missverstanden wird. Eine leere Gruppe ist unsichtbar.
 * - Keine Schreibaktion: Jede Zeile ist ein Link (Workflow → #/workflows/<id>, Lauf →
 *   #/runs/<id>, Befund → #/workboard/<id>). Freigabe mit Pflichtbegründung und Ablehnen leben
 *   in #/workflows/<id>. Startprobleme haben keine Detailroute und bleiben ohne Link, zeigen
 *   aber Zeitstempel, laufId und Fehlertext.
 * - Server- und Projekttexte (grund, Fehler, Titel, IDs) werden nicht übersetzt und immer
 *   escaped; alle übrigen Texte über t().
 * - „Erneut laden“ lädt nur die Workitems neu; die Poll-Quellen erholen sich mit dem nächsten
 *   Tick von selbst. Verschwindet der Hinweis danach, geht der Fokus auf die Überschrift.
 * - Ein Projektwechsel lädt die Workitems neu (abonniereProjektWechsel, F-860); der
 *   Anfragezähler verwirft dabei eine noch laufende Antwort des alten Projekts. Die drei
 *   Poll-Quellen kommen mit dem nächsten Tick aus dem neuen Projekt (zustand.js).
 * - F-898 (F44 WS-2b): Freigaben und Rückfragen stehen immer vollständig da. Läufe,
 *   Startprobleme und Befunde zeigen je höchstens GRUPPE_MAX Einträge, dazu einen Knopf
 *   „+ x weitere“ (aria-expanded), der die Gruppe aufklappt; aufgeklappt heißt er „Weniger
 *   anzeigen“. Die Zähler der vier Quellen bleiben die Gesamtzahlen. Der Zustand gilt je Gruppe
 *   bis zum Projektwechsel. Eine Gruppe wird nur bei geändertem Inhalt neu geschrieben, damit der
 *   Poll-Tick den Tastaturfokus (z. B. auf dem Knopf) nicht zerstört.
 */

import { formatiereDatum, formatiereZahl, t } from '../i18n.js'
import { abonniereProjektWechsel } from '../projekt-kontext.js'
import { escapeHtml } from '../render.js'
import { registriere } from '../router.js'
import { abonniere } from '../zustand.js'
// Gate f21-ws2 (e): Auswahl und Filterregel kommen aus attention-daten.js (baueEntscheidungen
// wendet filtereAttentionWorkflows/filtereAttentionLaeufe intern an), dieselbe Quelle wie
// views/dashboard.js.
import { baueEntscheidungen, holeOffeneP0P1Workitems } from '../attention-daten.js'

/** Letztes Zustands-Aggregat aus dem Poll, oder null vor dem ersten Tick. */
let letzterZustand = null

/** Letzte Antwort aus holeOffeneP0P1Workitems, oder null vor dem ersten Abruf dieses View-Besuchs. */
let workitemsAntwort = null

/** Gruppen in Listenreihenfolge: Schlüssel in baueEntscheidungen().gruppen, Container-ID-Suffix. */
const GRUPPEN = ['workflows', 'laeufe', 'startfehler', 'workitems']

/** Höchstzahl sichtbarer Einträge je begrenzter Gruppe, bevor „+ x weitere“ erscheint (F-898). */
const GRUPPE_MAX = 5

/** Gruppen, die immer vollständig erscheinen (Freigaben und Rückfragen, F-898). */
const IMMER_VOLLSTAENDIG = new Set(['workflows'])

/** Aufgeklappte begrenzte Gruppen (Name aus GRUPPEN), bis zum Projektwechsel. */
const aufgeklappt = new Set()

/** Zuletzt geschriebenes HTML je Gruppe — ein Poll-Tick schreibt nur bei Änderung neu (Fokus bleibt). */
const gruppenCache = new Map()

/** Datum und Uhrzeit über Intl in der aktiven Sprache (AK7). */
const ZEIT_FORMAT = { dateStyle: 'medium', timeStyle: 'short' }

/** Pfeil der Vorlage am Zeilenende (dekorativ). */
const PFEIL = '<svg class="icon entscheidung-pfeil" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>'

/**
 * Eyebrow eines Eintrags: die Art, bei Befunden mit Priorität.
 * @param eintrag - Eintrag aus baueEntscheidungen
 * @returns escaptes HTML
 */
function eyebrow(eintrag) {
  const art = escapeHtml(t(`attention.art.${eintrag.art}`))
  return eintrag.art === 'befund' ? `${art} · ${escapeHtml(eintrag.prioritaet)}` : art
}

/**
 * Der eine Satz unter dem Titel: Servertext `grund`, sonst ein übersetzter Standardsatz; die ID
 * steht dahinter, wenn der Titel ein menschenlesbarer ist (sonst stünde sie doppelt).
 * @param eintrag - Eintrag aus baueEntscheidungen
 * @returns escaptes HTML
 */
function satz(eintrag) {
  const text = eintrag.satz !== null ? escapeHtml(eintrag.satz) : escapeHtml(t(`attention.satz.${eintrag.art}`))
  const zeit = eintrag.art === 'lauf' && eintrag.zeitpunkt ? ` · ${escapeHtml(formatiereDatum(eintrag.zeitpunkt, ZEIT_FORMAT))}` : ''
  const id = eintrag.titel !== eintrag.id ? ` · <code>${escapeHtml(eintrag.id)}</code>` : ''
  return `${text}${zeit}${id}`
}

/**
 * Eine Zeile der Liste. Startprobleme ohne Link und ohne Pfeil, mit Zeitstempel, laufId und
 * Fehlertext (C3); alle anderen als Link mit Pfeil (Direktaktion = Navigation).
 * @param eintrag - Eintrag aus baueEntscheidungen
 * @returns HTML
 */
function zeile(eintrag) {
  if (eintrag.hash === null) {
    return `<div class="entscheidung-zeile">
      <div class="entscheidung-text">
        <div class="eyebrow">${eyebrow(eintrag)}</div>
        <h3>${escapeHtml(eintrag.titel)}</h3>
        <p>${[eintrag.zeitstempel ? `<time datetime="${escapeHtml(eintrag.zeitstempel)}">${escapeHtml(formatiereDatum(eintrag.zeitstempel, ZEIT_FORMAT))}</time>` : '', eintrag.fehler ? escapeHtml(eintrag.fehler) : ''].filter((teil) => teil !== '').join(' · ')}</p>
      </div>
    </div>`
  }
  return `<a class="entscheidung-zeile" href="${escapeHtml(eintrag.hash)}">
      <div class="entscheidung-text">
        <div class="eyebrow">${eyebrow(eintrag)}</div>
        <h3>${escapeHtml(eintrag.titel)}</h3>
        <p>${satz(eintrag)}</p>
      </div>
      ${PFEIL}
    </a>`
}

/**
 * Zeilen einer vorhandenen Gruppe: vollständig, oder bei einer begrenzten Gruppe mit mehr als
 * GRUPPE_MAX Einträgen die ersten GRUPPE_MAX und der Knopf „+ x weitere“ (F-898).
 * @param name - Gruppenname aus GRUPPEN
 * @param liste - Eintrag[]
 * @returns HTML
 */
function gruppenZeilen(name, liste) {
  if (IMMER_VOLLSTAENDIG.has(name) || liste.length <= GRUPPE_MAX) return liste.map(zeile).join('')
  const offen = aufgeklappt.has(name)
  const sichtbar = offen ? liste : liste.slice(0, GRUPPE_MAX)
  const weitere = liste.length - GRUPPE_MAX
  const text = offen ? t('attention.weniger') : t('attention.mehr', { anzahl: weitere, zahl: formatiereZahl(weitere) })
  return `${sichtbar.map(zeile).join('')}<button type="button" class="button attention-mehr" data-attention-gruppe="${name}" aria-expanded="${offen}" aria-controls="attention-${name}">${escapeHtml(text)}</button>`
}

/**
 * Füllt eine Gruppe: leer → unsichtbar, defekt → „nicht verfügbar“, lädt → „Lädt…“, sonst Zeilen.
 * Schreibt den Container nur bei geändertem Inhalt neu.
 * @param name - Gruppenname aus GRUPPEN
 * @param liste - Eintrag[] | null | undefined
 */
function renderGruppe(name, liste) {
  const abschnitt = document.getElementById(`attention-abschnitt-${name}`)
  const container = document.getElementById(`attention-${name}`)
  let html
  if (Array.isArray(liste) && liste.length === 0) {
    abschnitt.hidden = true
    html = ''
  } else {
    abschnitt.hidden = false
    if (liste === null) html = `<p class="entscheidung-zeile entscheidung-unbekannt">${escapeHtml(t(`attention.nichtVerfuegbar.${name}`))}</p>`
    else if (liste === undefined) html = `<p class="entscheidung-zeile subtle">${escapeHtml(t('attention.laedt'))}</p>`
    else html = gruppenZeilen(name, liste)
  }
  if (gruppenCache.get(name) === html) return
  container.innerHTML = html
  gruppenCache.set(name, html)
}

/**
 * Unterzeile einer Quellen-Kachel.
 * @param name - Gruppenname
 * @param anzahl - Zahl, null (defekt) oder undefined (lädt)
 * @returns übersetzter Text
 */
function kachelUnterzeile(name, anzahl) {
  if (anzahl === null) return t('attention.quelle.nichtVerfuegbar')
  if (anzahl === undefined) return t('attention.laedt')
  if (anzahl === 0) return t('attention.quelle.geprueft')
  return name === 'workitems' ? t('attention.quelle.offenBefunde') : t('attention.quelle.offen')
}

/**
 * „Die vier Quellen“: je Quelle Name, Zähler (oder Strich) und Unterzeile.
 * @param zaehler - baueEntscheidungen().zaehler
 */
function renderQuellen(zaehler) {
  document.getElementById('attention-quellen').innerHTML = GRUPPEN.map((name) => {
    const anzahl = zaehler[name]
    const wert = typeof anzahl === 'number' ? String(anzahl) : '–'
    const klasse = anzahl === null ? ' quelle-kachel-defekt' : ''
    return `<div class="quelle-kachel${klasse}">
      <div class="eyebrow">${escapeHtml(t(`attention.quelle.${name}`))}</div>
      <strong>${escapeHtml(wert)}</strong>
      <small>${escapeHtml(kachelUnterzeile(name, anzahl))}</small>
    </div>`
  }).join('')
}

function render() {
  if (letzterZustand === null) return
  document.getElementById('attention-laedt').hidden = true

  const workitems = workitemsAntwort === null ? undefined : workitemsAntwort.workitems
  const { gruppen, zaehler, defekt, alleLeer } = baueEntscheidungen(letzterZustand, workitems)

  document.getElementById('attention-hinweis').hidden = !defekt
  document.getElementById('attention-leer').hidden = !alleLeer
  document.getElementById('attention-liste').hidden = alleLeer
  for (const name of GRUPPEN) renderGruppe(name, gruppen[name])
  document.getElementById('attention-quellen-bereich').hidden = false
  renderQuellen(zaehler)
}

/** Zähler gegen überholte Antworten (Muster views/workflows.js workflowRenderZaehler): verlässt der Nutzer #/attention und kehrt schnell zurück, darf die zuerst gestartete, aber später auflösende Anfrage die Anzeige der neueren nicht überschreiben. */
let anfrageZaehler = 0

/** Lädt die offenen P0/P1-Workitems neu — beim Betreten der View und über „Erneut laden“ (kein Poll, siehe Dateikopf). */
async function ladeWorkitems() {
  const meineAnfrageNummer = ++anfrageZaehler
  workitemsAntwort = null
  render()
  let ergebnis
  try {
    ergebnis = await holeOffeneP0P1Workitems()
  } catch (fehler) {
    console.error('GET /api/workitems (Attention) fehlgeschlagen:', fehler)
    ergebnis = { workitems: null, befunde: [], fehler: [{ quelle: 'workitems', grund: fehler instanceof Error ? fehler.message : String(fehler) }] }
  }
  if (meineAnfrageNummer !== anfrageZaehler) return
  workitemsAntwort = ergebnis
  render()
}

/** Initialisiert die Attention-View einmalig beim Bootstrap: „Erneut laden“, Route, Abonnement des Zustands-Aggregats. */
export function initAttentionView() {
  document.getElementById('attention-erneut').addEventListener('click', async () => {
    await ladeWorkitems()
    // Der Knopf verschwindet mit dem Hinweis — der Fokus fiele sonst auf body.
    if (document.getElementById('attention-hinweis').hidden) document.getElementById('attention-titel')?.focus()
  })

  // F-898: „+ x weitere“ klappt eine begrenzte Gruppe auf bzw. zu; der Fokus bleibt auf dem Knopf.
  document.getElementById('attention-liste')?.addEventListener('click', (ereignis) => {
    const knopf = ereignis.target instanceof Element ? ereignis.target.closest('[data-attention-gruppe]') : null
    if (knopf === null) return
    const name = knopf.getAttribute('data-attention-gruppe')
    if (aufgeklappt.has(name)) aufgeklappt.delete(name)
    else aufgeklappt.add(name)
    render()
    document.querySelector(`[data-attention-gruppe="${name}"]`)?.focus()
  })

  registriere(/^#\/attention$/, 'attention', () => {
    void ladeWorkitems()
  })

  abonniereProjektWechsel(() => {
    aufgeklappt.clear()
    void ladeWorkitems()
  })

  abonniere((zustand) => {
    letzterZustand = zustand
    render()
  })
}
