/**
 * Datei: public/leitstand/views/attention.js
 *
 * Zweck: View `#/attention` „Deine Entscheidungen“ (F21 WS-2; F44 WS-2a; F46 D2 nach
 * docs/design/neu/09-entscheidungen--Main.webp, docs/design/abgleich-f46.md §4.4) — alles, was auf
 * Stefan wartet, als reine Client-Projektion ohne eigenen Endpunkt und ohne eigenen Poll (F21
 * Nicht-Ziele). Quellen: Workflows, die auf Freigabe/Klärung warten, Workflows mit offener
 * Abnahme (F46 D2, Kopfdatum abnahme.offen, F-972) und fehlgeschlagene, nicht kenntnisgenommene
 * Läufe (alle aus dem gepollten Zustands-Aggregat), Startfehler (zustand.startfehler), offene
 * P0/P1-Workitems (ein GET /api/workitems beim Betreten) und — nur für „Zum Eintrag“ — die
 * Aufträge (ein GET …/auftraege beim Betreten). Auswahl, Reihenfolge, Titel und Filter baut
 * attention-daten.js (baueEntscheidungen, zaehleJeFilter) — dieselbe Regel wie views/dashboard.js.
 *
 * Aufbau (Bild 09-Main): Kopf, Hinweis bei defekter Quelle mit „Erneut laden“, Filter-Chips
 * Alle · Freigaben · Abnahmen · Sichern („kommt“) · Rückfragen · Fehler · Befunde P0/P1 mit Anzahl,
 * eine Liste aus Karten in fünf aufeinanderfolgenden Gruppen (Sektionen attention-abschnitt-*,
 * Gate f21-ws2), darunter „Zuletzt entschieden“ („kommt“). Rechte Spalte: „Wenn du nichts tust“
 * („kommt“) und „Geprüfte Quellen“ mit Zahl je Quelle.
 *
 * „blockiert“ und „Jarvis empfiehlt“ je Karte stehen einmal über der Liste als „kommt“ (Prüfpass dg N3:
 * auf jeder Karte wäre es Rauschen gegen „Was ist wichtig?“).
 * Karte: Art-Chip (typ-chip.js artChip), Eintrag, seit wann (nur wo die Quelle einen Zeitpunkt trägt), Frage, Kontext,
 * Hauptknopf (Navigation; gefüllt nur auf der obersten Karte — Leitprinzip F46, genau ein Hauptknopf), „Zum Eintrag“ (Workitem hinter dem Auftrag, nur bei bekannter
 * Verknüpfung). „blockiert“ und „Jarvis empfiehlt“ sind „kommt“ (keine Quelle; die
 * Katalog-Empfehlung einer Freigabe steht nicht in den Kopfdaten).
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initAttentionView beim Bootstrap)
 *
 * Wichtig:
 * - Der Leerzustand gilt nur, wenn ALLE Quellen geladen und leer sind — eine defekte Quelle (null)
 *   zählt NICHT als leer: ihre Gruppe zeigt „nicht verfügbar“, ihr Chip und ihre Quellenzeile
 *   „–“, oben steht der Hinweis. Eine leere Gruppe ist unsichtbar.
 * - Keine Schreibaktion: Jeder Knopf ist ein Link (Freigabe, Rückfrage, Abnahme →
 *   #/workflows/<id>, Lauf → #/runs/<id>, Befund → #/workboard/<id>). Entschieden wird in
 *   #/workflows/<id>. Startprobleme haben keine Detailroute und bleiben ohne Knopf.
 * - Der Filter ist eine Anzeige über bereits ausgewählte Einträge (passtZuFilter), keine eigene
 *   Auswahlregel. Er gilt bis zum Projektwechsel. Chips, Gruppen und Quellen werden nur bei
 *   geändertem Inhalt neu geschrieben, damit der Poll-Tick den Tastaturfokus nicht zerstört.
 * - Server- und Projekttexte (grund, Fehler, Titel, IDs) werden nicht übersetzt und immer
 *   escaped; alle übrigen Texte über t()/tHtml().
 * - „Erneut laden“ lädt Workitems und Aufträge neu; die Poll-Quellen erholen sich mit dem nächsten
 *   Tick. Verschwindet der Hinweis danach, geht der Fokus auf die Überschrift.
 * - Ein Projektwechsel lädt Workitems und Aufträge neu (abonniereProjektWechsel, F-860); der
 *   Anfragezähler verwirft dabei eine noch laufende Antwort des alten Projekts.
 * - F-898: Freigaben/Rückfragen und Abnahmen stehen immer vollständig da; Läufe, Startprobleme und
 *   Befunde zeigen je höchstens GRUPPE_MAX Einträge und „+ x weitere“ (aria-expanded).
 */

import { holeAuftraegeBegrenzt } from '../api.js'
import { formatiereDatum, formatiereZahl, t, tHtml } from '../i18n.js'
import { kommtBadge } from '../kommt.js'
import { artChip } from '../typ-chip.js'
import { abonniereProjektWechsel } from '../projekt-kontext.js'
import { escapeHtml } from '../render.js'
import { registriere } from '../router.js'
import { abonniere } from '../zustand.js'
// Gate f21-ws2 (e): Auswahl und Filterregel kommen aus attention-daten.js (baueEntscheidungen
// wendet filtereAttentionWorkflows/filtereOffeneAbnahmen/filtereAttentionLaeufe intern an),
// dieselbe Quelle wie views/dashboard.js.
import { baueEntscheidungen, baueReferenzJeAuftrag, ENTSCHEIDUNGS_FILTER, holeOffeneP0P1Workitems, passtZuFilter, zaehleJeFilter } from '../attention-daten.js'

/** Letztes Zustands-Aggregat aus dem Poll, oder null vor dem ersten Tick. */
let letzterZustand = null

/** Letzte Antwort aus holeOffeneP0P1Workitems, oder null vor dem ersten Abruf dieses View-Besuchs. */
let workitemsAntwort = null

/** Aufträge für „Zum Eintrag“: Liste, null bei Fehler, undefined solange der Abruf läuft. */
let auftraege

/** Gruppen in Listenreihenfolge: Schlüssel in baueEntscheidungen().gruppen, Container-ID-Suffix. */
const GRUPPEN = ['workflows', 'abnahmen', 'laeufe', 'startfehler', 'workitems']

/** Höchstzahl sichtbarer Einträge je begrenzter Gruppe, bevor „+ x weitere“ erscheint (F-898). */
const GRUPPE_MAX = 5

/** Gruppen, die immer vollständig erscheinen (Freigaben und Rückfragen, F-898; Abnahmen, F46 D2). */
const IMMER_VOLLSTAENDIG = new Set(['workflows', 'abnahmen'])

/** Zeilen von „Geprüfte Quellen“ (Bild 09-Main): Gruppe aus baueEntscheidungen, oder 'sichern' („kommt“). */
const QUELLEN = ['workflows', 'abnahmen', 'sichern', 'laeufe', 'startfehler', 'workitems']

/** Aufgeklappte begrenzte Gruppen (Name aus GRUPPEN), bis zum Projektwechsel. */
const aufgeklappt = new Set()

/** Gewählter Filter (id aus ENTSCHEIDUNGS_FILTER), bis zum Projektwechsel. */
let filter = 'alle'

/** Zuletzt geschriebenes HTML je Container — ein Poll-Tick schreibt nur bei Änderung neu (Fokus bleibt). */
const htmlCache = new Map()

/** Der Eintrag mit dem einen Hauptknopf der Seite (Leitprinzip F46: wenn Stefan dran ist, genau ein Hauptknopf) — der oberste mit Ziel im aktiven Filter, sonst null. */
let hauptEintrag = null

/** Datum und Uhrzeit über Intl in der aktiven Sprache (AK7). */
const ZEIT_FORMAT = { dateStyle: 'medium', timeStyle: 'short' }

/**
 * Schreibt HTML in einen Container, aber nur bei geändertem Inhalt.
 * @param id - id des Containers
 * @param html - neuer Inhalt
 */
function schreibe(id, html) {
  if (htmlCache.get(id) === html) return
  document.getElementById(id).innerHTML = html
  htmlCache.set(id, html)
}

/**
 * „seit …“ einer Karte — nur, wo die Quelle einen Zeitpunkt trägt (Lauf, Startproblem); sonst ''.
 * @param eintrag - Eintrag aus baueEntscheidungen
 * @returns HTML oder ''
 */
function seit(eintrag) {
  const zeitpunkt = eintrag.art === 'lauf' ? eintrag.zeitpunkt : eintrag.art === 'startproblem' ? eintrag.zeitstempel : null
  if (typeof zeitpunkt !== 'string' || zeitpunkt === '') return ''
  return `<span class="entscheidung-karte-seit">· <time datetime="${escapeHtml(zeitpunkt)}">${escapeHtml(formatiereDatum(zeitpunkt, ZEIT_FORMAT))}</time></span>`
}

/**
 * Kontextsatz einer Karte: Servertext `grund` (Freigabe, Rückfrage), Fehlertext (Startproblem),
 * sonst ein übersetzter Standardsatz; dahinter die ID, wenn der Titel ein menschenlesbarer ist.
 * @param eintrag - Eintrag aus baueEntscheidungen
 * @returns escaptes HTML
 */
function kontext(eintrag) {
  let text
  if (eintrag.satz !== null) text = escapeHtml(eintrag.satz)
  else if (eintrag.art === 'startproblem') text = eintrag.fehler ? escapeHtml(eintrag.fehler) : tHtml('attention.satz.startproblem')
  else if (eintrag.art === 'abnahme') text = tHtml(eintrag.abnahmeStatus === 'veraltet' ? 'attention.satz.abnahmeVeraltet' : 'attention.satz.abnahme')
  else text = tHtml(`attention.satz.${eintrag.art}`)
  const id = eintrag.titel !== eintrag.id ? ` · <code>${escapeHtml(eintrag.id)}</code>` : ''
  return `${text}${id}`
}

/**
 * Hauptknopf und „Zum Eintrag“ einer Karte; der Eintragstitel steht für Screenreader im Namen,
 * damit gleichlautende Knöpfe unterscheidbar bleiben.
 * @param eintrag - Eintrag aus baueEntscheidungen
 * @returns HTML
 */
function aktionen(eintrag) {
  const kontextName = `<span class="sr-only">: ${escapeHtml(eintrag.titel)}</span>`
  const haupt = eintrag.hash === null ? `<p class="subtle entscheidung-karte-ohne">${tHtml('attention.ohneDetail')}</p>` : `<a class="button${eintrag === hauptEintrag ? ' primary' : ''}" href="${escapeHtml(eintrag.hash)}">${tHtml(`attention.knopf.${eintrag.art}`)}${kontextName}</a>`
  const zumEintrag = typeof eintrag.eintragHash === 'string' ? `<a class="text-link" href="${escapeHtml(eintrag.eintragHash)}">${tHtml('attention.zumEintrag')}${kontextName}</a>` : ''
  return `<div class="entscheidung-karte-aktionen">${haupt}${zumEintrag}</div>`
}

/**
 * Eine Karte (Bild 09-Main): Art-Chip, Eintrag, seit wann, Frage, Kontext, „blockiert“ und
 * „Jarvis empfiehlt“ als „kommt“, rechts Hauptknopf und „Zum Eintrag“.
 * @param eintrag - Eintrag aus baueEntscheidungen
 * @returns HTML
 */
function karte(eintrag) {
  return `<article class="entscheidung-karte art-${escapeHtml(eintrag.art)}">
      <div class="entscheidung-karte-text">
        <div class="entscheidung-karte-kopf">${artChip(eintrag.art, { zusatz: eintrag.art === 'befund' ? eintrag.prioritaet : '' })}<span class="entscheidung-karte-eintrag">${escapeHtml(eintrag.titel)}</span>${seit(eintrag)}</div>
        <h3>${tHtml(`attention.frage.${eintrag.art}`)}</h3>
        <p class="entscheidung-karte-kontext">${kontext(eintrag)}</p>
      </div>
      ${aktionen(eintrag)}
    </article>`
}

/**
 * Karten einer vorhandenen Gruppe: vollständig, oder bei einer begrenzten Gruppe mit mehr als
 * GRUPPE_MAX Einträgen die ersten GRUPPE_MAX und der Knopf „+ x weitere“ (F-898).
 * @param name - Gruppenname aus GRUPPEN
 * @param liste - Eintrag[] (bereits gefiltert)
 * @returns HTML
 */
function gruppenKarten(name, liste) {
  if (IMMER_VOLLSTAENDIG.has(name) || liste.length <= GRUPPE_MAX) return liste.map(karte).join('')
  const offen = aufgeklappt.has(name)
  const sichtbar = offen ? liste : liste.slice(0, GRUPPE_MAX)
  const weitere = liste.length - GRUPPE_MAX
  const text = offen ? t('attention.weniger') : t('attention.mehr', { anzahl: weitere, zahl: formatiereZahl(weitere) })
  return `${sichtbar.map(karte).join('')}<button type="button" class="button attention-mehr" data-attention-gruppe="${name}" aria-expanded="${offen}" aria-controls="attention-${name}">${escapeHtml(text)}</button>`
}

/**
 * Ob eine Gruppe Einträge des gewählten Filters enthalten kann (sonst bleibt sie samt
 * „nicht verfügbar“/„Lädt…“ verborgen).
 * @param name - Gruppenname aus GRUPPEN
 * @returns true, wenn die Gruppe zum Filter gehört
 */
function gruppeImFilter(name) {
  const arten = { workflows: ['freigabe', 'rueckfrage'], abnahmen: ['abnahme'], laeufe: ['lauf'], startfehler: ['startproblem'], workitems: ['befund'] }[name]
  return arten.some((art) => passtZuFilter({ art }, filter))
}

/**
 * Füllt eine Gruppe: leer oder nicht im Filter → unsichtbar, defekt → „nicht verfügbar“,
 * lädt → „Lädt…“, sonst Karten des Filters.
 * @param name - Gruppenname aus GRUPPEN
 * @param liste - Eintrag[] | null | undefined
 */
function renderGruppe(name, liste) {
  const abschnitt = document.getElementById(`attention-abschnitt-${name}`)
  const sichtbar = Array.isArray(liste) ? liste.filter((eintrag) => passtZuFilter(eintrag, filter)) : liste
  let html = ''
  if (!gruppeImFilter(name) || (Array.isArray(sichtbar) && sichtbar.length === 0)) abschnitt.hidden = true
  else {
    abschnitt.hidden = false
    if (sichtbar === null) html = `<p class="entscheidung-karte entscheidung-unbekannt">${escapeHtml(t(`attention.nichtVerfuegbar.${name}`))}</p>`
    else if (sichtbar === undefined) html = `<p class="subtle">${escapeHtml(t('attention.laedt'))}</p>`
    else html = gruppenKarten(name, sichtbar)
  }
  schreibe(`attention-${name}`, html)
}

/**
 * Text einer Zahl für Chips und Quellen: Zahl, sonst „–“ (defekt oder lädt).
 * @param anzahl - Zahl | null | undefined
 * @returns Text
 */
function zahlText(anzahl) {
  return typeof anzahl === 'number' ? formatiereZahl(anzahl) : '–'
}

/**
 * Filter-Chips mit Anzahl (aria-pressed); „Sichern“ als „kommt“ (aria-disabled).
 * @param anzahlJeFilter - zaehleJeFilter(...)
 */
function renderFilter(anzahlJeFilter) {
  const chips = ENTSCHEIDUNGS_FILTER.map(({ id }) => {
    const name = escapeHtml(t(`attention.filter.${id}`))
    if (id === 'sichern') return `<button type="button" class="filter-chip" aria-disabled="true">${name} ${kommtBadge()}</button>`
    const anzahl = anzahlJeFilter.get(id)
    const zusatz = anzahl === null ? `<span class="sr-only"> (${escapeHtml(t('attention.quelle.nichtVerfuegbar'))})</span>` : ''
    return `<button type="button" class="filter-chip" data-attention-filter="${id}" aria-pressed="${id === filter}">${name} · ${escapeHtml(zahlText(anzahl))}${zusatz}</button>`
  }).join('')
  // Ein Poll-Tick mit geänderter Zahl schreibt die Leiste neu — der Fokus bleibt auf demselben Chip (qa 12).
  const fokus = document.activeElement?.closest?.('#attention-filter [data-attention-filter]')?.getAttribute('data-attention-filter') ?? null
  schreibe('attention-filter', chips)
  if (fokus !== null && document.activeElement?.closest?.('#attention-filter') === null) document.querySelector(`[data-attention-filter="${fokus}"]`)?.focus()
}

/**
 * „Geprüfte Quellen“: je Quelle Punkt (geprüft / nicht verfügbar / lädt), Name und Zahl;
 * „Bereit zum Sichern“ als „kommt“.
 * @param zaehler - baueEntscheidungen().zaehler
 */
function renderQuellen(zaehler) {
  const zeilen = QUELLEN.map((name) => {
    if (name === 'sichern') return `<li class="quelle-zeile" aria-disabled="true"><span class="quelle-punkt quelle-punkt-kommt" aria-hidden="true"></span><span class="quelle-name">${tHtml('attention.quelle.sichern')}</span>${kommtBadge()}</li>`
    const anzahl = zaehler[name]
    const lage = anzahl === null ? 'defekt' : anzahl === undefined ? 'laedt' : 'geprueft'
    return `<li class="quelle-zeile quelle-${lage}"><span class="quelle-punkt" aria-hidden="true"></span><span class="quelle-name">${tHtml(`attention.quelle.${name}`)}</span><span class="quelle-zahl">${escapeHtml(zahlText(anzahl))}<span class="sr-only"> · ${tHtml(`attention.quelle.lage.${lage}`)}</span></span></li>`
  }).join('')
  schreibe('attention-quellen', zeilen)
}

function render() {
  if (letzterZustand === null) return
  document.getElementById('attention-laedt').hidden = true

  const workitems = workitemsAntwort === null ? undefined : workitemsAntwort.workitems
  const ergebnis = baueEntscheidungen(letzterZustand, workitems, baueReferenzJeAuftrag(auftraege))
  const { gruppen, zaehler, defekt, alleLeer } = ergebnis
  const anzahlJeFilter = zaehleJeFilter(ergebnis)

  document.getElementById('attention-hinweis').hidden = !defekt
  document.getElementById('attention-leer').hidden = !alleLeer
  document.getElementById('attention-liste').hidden = alleLeer
  document.getElementById('attention-filter').hidden = alleLeer
  document.getElementById('attention-kommt').hidden = alleLeer
  renderFilter(anzahlJeFilter)
  hauptEintrag = ergebnis.eintraege.find((eintrag) => eintrag.hash !== null && passtZuFilter(eintrag, filter)) ?? null
  for (const name of GRUPPEN) renderGruppe(name, gruppen[name])
  // Ein gewählter Filter ohne Einträge (alle seine Quellen geladen) sagt das, statt leer zu bleiben.
  document.getElementById('attention-filter-leer').hidden = alleLeer || anzahlJeFilter.get(filter) !== 0
  renderQuellen(zaehler)
}

/** Zähler gegen überholte Antworten (Muster views/workflows.js workflowRenderZaehler). */
let anfrageZaehler = 0

/**
 * Lädt die offenen P0/P1-Workitems und — bei offener Seite — die Aufträge neu: beim Betreten der
 * View, über „Erneut laden“ und beim Projektwechsel (kein Poll, siehe Dateikopf). Die Aufträge
 * dienen nur „Zum Eintrag“; bei geschlossener Seite lädt sie erst das nächste Betreten (Muster
 * F-920 der Entwicklung).
 * @param mitAuftraegen - true lädt auch die Aufträge
 */
async function ladeQuellen(mitAuftraegen = true) {
  const meineAnfrageNummer = ++anfrageZaehler
  workitemsAntwort = null
  auftraege = undefined
  render()
  const [workitemsErgebnis, auftraegeErgebnis] = await Promise.allSettled([holeOffeneP0P1Workitems(), mitAuftraegen ? holeAuftraegeBegrenzt() : Promise.resolve(undefined)])
  if (meineAnfrageNummer !== anfrageZaehler) return
  if (workitemsErgebnis.status === 'fulfilled') workitemsAntwort = workitemsErgebnis.value
  else {
    console.error('GET /api/workitems (Attention) fehlgeschlagen:', workitemsErgebnis.reason)
    const grund = workitemsErgebnis.reason instanceof Error ? workitemsErgebnis.reason.message : String(workitemsErgebnis.reason)
    workitemsAntwort = { workitems: null, befunde: [], fehler: [{ quelle: 'workitems', grund }] }
  }
  // Die Aufträge liefern nur „Zum Eintrag“ — fehlen sie, fehlt der Link, die Liste bleibt vollständig.
  if (!mitAuftraegen) auftraege = undefined
  else if (auftraegeErgebnis.status === 'fulfilled' && Array.isArray(auftraegeErgebnis.value)) auftraege = auftraegeErgebnis.value
  else {
    if (auftraegeErgebnis.status === 'rejected') console.error('GET …/auftraege (Attention, „Zum Eintrag“) fehlgeschlagen:', auftraegeErgebnis.reason)
    auftraege = null
  }
  render()
}

/** Initialisiert die Attention-View einmalig beim Bootstrap: „Erneut laden“, Filter, „+ x weitere“, Route, Abonnement des Zustands-Aggregats. */
export function initAttentionView() {
  document.getElementById('attention-erneut').addEventListener('click', async () => {
    await ladeQuellen()
    // Der Knopf verschwindet mit dem Hinweis — der Fokus fiele sonst auf body.
    if (document.getElementById('attention-hinweis').hidden) document.getElementById('attention-titel')?.focus()
  })

  // F46 D2: Filter-Chips (aria-pressed); der Fokus bleibt auf dem Chip.
  document.getElementById('attention-filter').addEventListener('click', (ereignis) => {
    const chip = ereignis.target instanceof Element ? ereignis.target.closest('[data-attention-filter]') : null
    if (chip === null) return
    filter = chip.getAttribute('data-attention-filter')
    render()
    document.querySelector(`[data-attention-filter="${filter}"]`)?.focus()
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
    void ladeQuellen()
  })

  abonniereProjektWechsel(() => {
    aufgeklappt.clear()
    filter = 'alle'
    void ladeQuellen(location.hash === '#/attention')
  })

  abonniere((zustand) => {
    letzterZustand = zustand
    render()
  })
}
