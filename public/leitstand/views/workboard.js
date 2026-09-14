/**
 * Datei: public/leitstand/views/workboard.js
 *
 * Zweck: View `#/workboard` (F21 WS-2) — Liste + Detail über GET
 * /api/workitems (Findings aus state/findings.md, Feature-Akten aus
 * features/<id>/feature.md, F21 WS-1 AK1-3). Kein Poll: die Quellen ändern
 * sich nur durch Commits. Ein einmaliger Abruf beim ersten Aufruf (ohne
 * Filter), danach ein erneuter Abruf bei jedem Filterwechsel MIT den
 * aktuellen Query-Parametern — der Server filtert bereits (AK3), keine
 * doppelte Filterlogik hier. "Neu laden" löst denselben Abruf ohne
 * Filteränderung aus.
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initWorkboardView beim Bootstrap)
 *
 * Wichtig: die Filter-Optionen leiten sich AUSSCHLIESSLICH aus der ersten,
 * ungefilterten Antwort ab (nicht bei jedem Filterwechsel neu berechnet) —
 * status ist zwischen Findings (OFFEN/ERLEDIGT/SONSTIGES) und Feature-Akten
 * (ENTWURF/FEATURE_GATE/…) unterschiedliches Vokabular (QA-Befund F21 WS-1,
 * src/workboard/index.ts Dateikopf); die Options-Liste zeigt deshalb beide
 * Vokabulare nebeneinander, kein Versuch, sie zu vereinheitlichen.
 *
 * Die Detailansicht sucht das Workitem über id in der ZULETZT GELADENEN
 * (bereits gefilterten) Liste — kein eigener Request (AK5). Kommt der Klick
 * von außerhalb dieser Liste (z. B. ein Attention-Link auf ein Workitem, das
 * der aktuelle Filter ausschließt), zeigt das Detail einen Hinweis statt
 * eines falschen oder leeren Panels.
 */

import { holeWorkitems } from '../api.js'
import { escapeHtml } from '../render.js'
import { navigiere, registriere } from '../router.js'

/** Zuletzt vom Server geladene (bereits serverseitig gefilterte) Liste. */
let letzteWorkitems = []

/** true, sobald die Filter-Selects aus der ersten ungefilterten Antwort befüllt wurden. */
let optionenBefuellt = false

/** id des aktuell offenen Detail-Panels, oder null — erlaubt einen stillen Inhalts-Refresh, sobald letzteWorkitems nachträglich eintrifft (siehe ladeWorkitems). */
let gewaehlteId = null

/** Zähler gegen überholte Antworten (Muster views/workflows.js workflowRenderZaehler): ein schneller zweiter Filterwechsel darf die Anzeige nicht mit der Antwort des ERSTEN, langsameren Requests überschreiben. */
let anfrageZaehler = 0

function workitemZeile(workitem) {
  const prioritaet = workitem.quelle === 'finding' ? escapeHtml(workitem.prioritaet) : '—'
  const status = workitem.quelle === 'finding' ? `${escapeHtml(workitem.status)} (${escapeHtml(workitem.statusRoh)})` : escapeHtml(workitem.status)
  return `<tr class="workboard-zeile" data-id="${escapeHtml(workitem.id)}">
    <td><code>${escapeHtml(workitem.id)}</code></td>
    <td>${escapeHtml(workitem.typ)}</td>
    <td>${prioritaet}</td>
    <td>${status}</td>
    <td>${escapeHtml(workitem.titel)}</td>
  </tr>`
}

const WORKBOARD_TABELLE_KOPF = '<tr><th>ID</th><th>Typ</th><th>Priorität</th><th>Status</th><th>Titel</th></tr>'

function renderListe(workitems) {
  document.getElementById('workboard-liste').innerHTML =
    workitems.length === 0
      ? '<p class="leer">Keine Workitems für diese Filter.</p>'
      : `<table class="lauf-kopfdaten"><thead>${WORKBOARD_TABELLE_KOPF}</thead><tbody>${workitems.map(workitemZeile).join('')}</tbody></table>`
}

/** Zeigt Parser-Befunde (nicht parsebare Kopfzeile etc.) sichtbar über der Liste, statt sie zu verschlucken (AK1-Geist, CLAUDE.md). @param befunde - antwort.befunde aus GET /api/workitems, oder null bei defekter Quelle */
function renderBefunde(befunde) {
  const container = document.getElementById('workboard-befunde')
  if (befunde === null || befunde.length === 0) {
    container.innerHTML = ''
    return
  }
  container.innerHTML = `<p class="fehler">${befunde.length} Befund(e) beim Parsen von state/findings.md bzw. features/*/feature.md: ${befunde.map((b) => escapeHtml(b.meldung)).join('; ')}</p>`
}

/** Befüllt ein Filter-Select, ohne eine bereits gewählte, weiterhin gültige Auswahl zu verlieren. @param id - Select-Element-id @param werte - erlaubte Werte, aus der ungefilterten Liste abgeleitet */
function fuelleSelect(id, werte) {
  const select = document.getElementById(id)
  const aktuellerWert = select.value
  select.innerHTML = `<option value="">Alle</option>${werte.map((w) => `<option value="${escapeHtml(w)}">${escapeHtml(w)}</option>`).join('')}`
  select.value = werte.includes(aktuellerWert) ? aktuellerWert : ''
}

/** Leitet die drei Filter-Optionen aus den tatsächlich vorkommenden Werten der ungefilterten Liste ab — kein hart codiertes Vokabular (siehe Dateikopf). @param workitems - ungefilterte Liste aus der ersten Antwort */
function befuelleFilterOptionen(workitems) {
  fuelleSelect('workboard-filter-typ', [...new Set(workitems.map((w) => w.typ))].sort())
  fuelleSelect('workboard-filter-status', [...new Set(workitems.map((w) => w.status))].sort())
  fuelleSelect(
    'workboard-filter-prioritaet',
    [...new Set(workitems.filter((w) => w.quelle === 'finding').map((w) => w.prioritaet))].sort()
  )
  optionenBefuellt = true
}

function aktuelleFilter() {
  const filter = {}
  const typ = document.getElementById('workboard-filter-typ').value
  const status = document.getElementById('workboard-filter-status').value
  const prioritaet = document.getElementById('workboard-filter-prioritaet').value
  if (typ) filter.typ = typ
  if (status) filter.status = status
  if (prioritaet) filter.prioritaet = prioritaet
  return filter
}

/**
 * Lädt GET /api/workitems mit den aktuellen Filtern (leer beim ersten Aufruf)
 * und rendert Befunde + Liste. Überholschutz (Muster views/workflows.js
 * workflowRenderZaehler): ein schneller zweiter Filterwechsel oder ein Klick
 * auf "Neu laden" während ein älterer Request noch unterwegs ist, darf die
 * Anzeige nicht mit dessen — später eintreffender, aber veralteter — Antwort
 * überschreiben. Rendert am Ende, falls ein Detail offen ist, dessen Inhalt
 * still mit (Reviewer-Befund, TC-01/Kritisches Problem 1): ein Reload/
 * Deep-Link auf `#/workboard/<id>` ruft ladeDetail() auf, BEVOR dieser erste
 * Abruf hier fertig ist — ohne diesen Nachtrag bliebe das Detail dauerhaft
 * auf "nicht gefunden" stehen, obwohl das Workitem real existiert.
 */
async function ladeWorkitems() {
  const meineAnfrageNummer = ++anfrageZaehler
  const container = document.getElementById('workboard-liste')
  container.innerHTML = '<p class="leer">Lädt…</p>'
  const filter = aktuelleFilter()
  try {
    const antwort = await holeWorkitems(filter)
    if (meineAnfrageNummer !== anfrageZaehler) return
    if (antwort.workitems === null) {
      container.innerHTML = '<p class="unbekannt">Workitems nicht verfügbar (Quelle defekt).</p>'
      renderBefunde(antwort.befunde)
      letzteWorkitems = []
      return
    }
    letzteWorkitems = antwort.workitems
    if (!optionenBefuellt && Object.keys(filter).length === 0) {
      befuelleFilterOptionen(antwort.workitems)
    }
    renderBefunde(antwort.befunde)
    renderListe(antwort.workitems)
    if (gewaehlteId !== null) renderDetailInhalt(gewaehlteId)
  } catch (fehler) {
    if (meineAnfrageNummer !== anfrageZaehler) return
    container.innerHTML = `<p class="fehler">Anfrage fehlgeschlagen: ${escapeHtml(fehler.message)}</p>`
    renderBefunde(null)
    letzteWorkitems = []
  }
}

function findeWorkitem(id) {
  return letzteWorkitems.find((w) => w.id === id) ?? null
}

function unbekanntFeld(wert) {
  return wert ? escapeHtml(wert) : '<span class="unbekannt">—</span>'
}

function renderFindingDetail(workitem) {
  return `<table class="lauf-kopfdaten"><tbody>
    <tr><th>ID</th><td><code>${escapeHtml(workitem.id)}</code></td></tr>
    <tr><th>Typ</th><td>${escapeHtml(workitem.typ)}</td></tr>
    <tr><th>Priorität</th><td>${escapeHtml(workitem.prioritaet)}</td></tr>
    <tr><th>Status</th><td>${escapeHtml(workitem.status)} (${escapeHtml(workitem.statusRoh)})</td></tr>
    <tr><th>Titel</th><td>${escapeHtml(workitem.titel)}</td></tr>
    <tr><th>Beschreibung</th><td>${unbekanntFeld(workitem.beschreibung)}</td></tr>
    <tr><th>Fundstelle</th><td>${unbekanntFeld(workitem.fundstelle)}</td></tr>
    <tr><th>Auswirkung</th><td>${unbekanntFeld(workitem.auswirkung)}</td></tr>
    <tr><th>Maßnahme</th><td>${unbekanntFeld(workitem.massnahme)}</td></tr>
    <tr><th>Feature-Run</th><td>${unbekanntFeld(workitem.featureRun)}</td></tr>
  </tbody></table>`
}

function renderFeatureDetail(workitem) {
  return `<table class="lauf-kopfdaten"><tbody>
    <tr><th>ID</th><td><code>${escapeHtml(workitem.id)}</code></td></tr>
    <tr><th>Titel</th><td>${escapeHtml(workitem.titel)}</td></tr>
    <tr><th>Status</th><td>${escapeHtml(workitem.status)}</td></tr>
    <tr><th>Pfad</th><td><code>${escapeHtml(workitem.pfad)}</code></td></tr>
  </tbody></table>
  <p class="hinweis">Nur lesend — Bearbeitung einer Feature-Akte ist F23-Scope.</p>`
}

/**
 * Rendert NUR den Inhalt des Detail-Panels aus letzteWorkitems — ohne das
 * Panel zu öffnen oder zu scrollen. Getrennt von ladeDetail(), damit
 * ladeWorkitems() das offene Panel still nachrendern kann, sobald die Liste
 * eintrifft (siehe dortiger Kommentar), ohne einen ungewollten zweiten
 * Scroll-Sprung auszulösen. Ein Workitem ohne Formularfelder — die Detail-
 * ansicht ist rein lesend (AK5), ein Überschreiben von innerHTML kann hier
 * anders als bei der Lauf-Entscheidung (views/runs.js) keine Nutzereingabe
 * verlieren.
 * @param id - Workitem-id des aktuell offenen Panels
 */
function renderDetailInhalt(id) {
  const inhalt = document.getElementById('workboard-detail-inhalt')
  const workitem = findeWorkitem(id)
  if (workitem === null) {
    inhalt.innerHTML = '<p class="unbekannt">Workitem nicht in der aktuell geladenen Liste gefunden — Filter zurücksetzen oder neu laden.</p>'
    return
  }
  inhalt.innerHTML = workitem.quelle === 'finding' ? renderFindingDetail(workitem) : renderFeatureDetail(workitem)
}

/** Öffnet das Detail-Panel für id (Routen-Eintritt `#/workboard/<id>`) — merkt sich id für den stillen Nachtrag aus ladeWorkitems() (siehe renderDetailInhalt). */
function ladeDetail(id) {
  gewaehlteId = id
  const abschnitt = document.getElementById('workboard-detail')
  document.getElementById('workboard-detail-titel').textContent = id
  abschnitt.hidden = false
  renderDetailInhalt(id)
  abschnitt.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function schliesseDetail() {
  gewaehlteId = null
  document.getElementById('workboard-detail').hidden = true
}

function initFilterBedienung() {
  document.getElementById('workboard-filter').addEventListener('change', (ereignis) => {
    if (!ereignis.target.matches('select')) return
    void ladeWorkitems()
  })
  document.getElementById('workboard-neu-laden').addEventListener('click', () => {
    void ladeWorkitems()
  })
}

/** Klick-Delegation für Zeilen (Navigation zu `#/workboard/<id>`) und das Schließen des Detail-Panels — Muster views/runs.js. */
function initListenBedienung() {
  document.getElementById('workboard-liste').addEventListener('click', (ereignis) => {
    const zeile = ereignis.target.closest('.workboard-zeile')
    if (!zeile) return
    navigiere(`#/workboard/${encodeURIComponent(zeile.dataset.id)}`)
  })
  document.getElementById('workboard-detail-schliessen').addEventListener('click', () => {
    schliesseDetail()
  })
}

/** Initialisiert die Workboard-View einmalig beim Bootstrap: Bedienung, eigene Routen (Muster views/runs.js — app.js registriert #/workboard NICHT mehr zentral), erster ungefilterter Abruf. */
export function initWorkboardView() {
  initFilterBedienung()
  initListenBedienung()

  registriere(/^#\/workboard$/, 'workboard', () => {
    schliesseDetail()
  })
  registriere(/^#\/workboard\/([^/]+)$/, 'workboard', (id) => {
    ladeDetail(id)
  })

  void ladeWorkitems()
}
