/**
 * Datei: public/leitstand/views/workboard.js
 *
 * Zweck: Seite „Entwicklung“ `#/workboard` (F44 WS-3a, Vorlage V10 d_arbeit_board.png,
 * d_arbeit_features.png; Abgleich F-725 E1–E7) samt Detail `#/workboard/<id>` (F21 WS-2) und
 * Click-to-Work (F22 WS-2, F35 WS-1 „Bauen“). Kopf „Arbeit im Überblick“ mit „Eintrag erfassen“
 * als „kommt“ (E7), Register Kanban-Board · Features · Bugs · Harness Improvements · Weitere
 * (TECH_DEBT und PROCESS_IMPROVEMENT, E5) sowie Aufträge (#/projekt) und Ausführungen (#/runs)
 * als Links.
 *
 * - Kanban-Board (E1): Spalten Geplant · In Arbeit · Braucht dich · Abgenommen nach der Regel in
 *   entwicklung-daten.js (baueBoard), höchstens 12 Karten je Spalte, „+ x weitere“ springt in den
 *   passenden Listen-Tab mit Spaltenfilter. „Kanban · Priorität“ (E2) und „Zeitleiste“ (E3) sind
 *   „kommt“ (aria-disabled, keine Beispieldaten). Ansicht-Chips Alles/Geplant/In Arbeit/Braucht
 *   dich/Abgenommen.
 * - Listen-Tabs (E4): Serverfilter über holeWorkitems(filter) (Typ nur im Tab „Weitere“, Status,
 *   Priorität als Chips) plus clientseitige Suche (sucheWorkitems).
 * - Parser-Befunde (E6) stehen über Board und Listen.
 *
 * Laden: Workitems (ungefiltert, für Board, Filteroptionen und Detail) und Aufträge (GET
 * …/auftraege, für die Verknüpfung Workitem ↔ Workflow) beim Betreten der Seite, bei „Neu laden“
 * und beim Projektwechsel (abonniereProjektWechsel, F-860) — nie aus dem Poll. Die Workflows kommen
 * aus dem bestehenden Poll-Abo (abonniere), kein zweiter Timer; ein Poll-Tick schreibt Board bzw.
 * Liste nur bei geändertem Inhalt neu (Fokus bleibt).
 *
 * Detail und Click-to-Work sind funktional unverändert (Umbau WS-3b): Das Detail sucht das
 * Workitem in der zuletzt geladenen Liste des Listen-Tabs und in der ungefilterten Liste des
 * Boards — kein eigener Request (F21 AK5). "Bearbeiten" an einem Finding bzw. "Bauen" an einer
 * baubaren Feature-Akte legt einen Auftrag mit der Referenzzeile `workitem:<quelle>:<id>` an und
 * routet ihn sofort (legeAuftragAn/baueAuftragAusFeature, routeAuftrag). Der Fortschritt rendert in
 * #workboard-bearbeitung, getrennt von #workboard-detail-inhalt, damit ein stilles Nachrendern den
 * Bearbeitungszustand nicht mitreißt; der Detail-Auffrischer hängt am einen Poll-Timer aus
 * zustand.js. F36 WS-3/WS-5a: Katalog-Empfehlung im Vorschlag, „Freigeben“ schickt die angezeigten
 * wirdGenutzt-ids mit, „Freigeben & installieren“ (empfehlung-installation.js).
 *
 * F44 WS-3a: Das Bento (Aktueller Fokus, Letzter Projektstand, Schnellzugriff, AI Workflow,
 * Projekt Fortschritt, Roadmap) ist entfernt (F-892) — die Übersicht (#/dashboard) und die
 * Roadmap-Seite zeigen diese Inhalte nach Vorlage. Mit ihm entfiel die Abnahme-Vorauswahl
 * (F-916).
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initWorkboardView beim Bootstrap)
 *
 * Wichtig:
 * - Projektinhalte (Titel, IDs, Statuswerte, Parser-Meldungen) werden nicht übersetzt und immer
 *   escaped; alle übrigen Texte über t() (tx = escapt). Die Texte von Detail und Click-to-Work
 *   ziehen in WS-3b auf Schlüssel um.
 * - Kein schreibender Request außer über die api.js-Bausteine von Click-to-Work (Gate f21-ws2 (f)).
 */

import { baueAuftragAusFeature, holeAuftraege, holeWorkflowDetail, holeWorkitems, legeAuftragAn, routeAuftrag, sendeWorkflowFreigabe } from '../api.js'
import { empfehlungIdsFuerFreigabe, renderEmpfehlung, renderInstallierbarHinweis } from '../empfehlung-anzeige.js'
import { bindeEmpfehlungInstallation } from '../empfehlung-installation.js'
import { baueBoard, baueVerknuepfung, LISTEN_TABS, SPALTEN, spalteVon, sucheWorkitems } from '../entwicklung-daten.js'
import { formatiereZahl, t } from '../i18n.js'
import { kommtBadge, kommtKnopf } from '../kommt.js'
import { escapeHtml } from '../render.js'
import { abonniereProjektWechsel, holeAktivesProjekt } from '../projekt-kontext.js'
import { statusKategorie as roadmapStatusKategorie } from '../roadmap-anzeige.js'
import { navigiere, registriere } from '../router.js'
import { abonniere, abonniereDetailAuffrischer, pollJetzt } from '../zustand.js'

/** Register der Seite: das Board und die vier Listen-Tabs (LISTEN_TABS). */
const TABS = ['board', ...Object.keys(LISTEN_TABS)]

/** Ansicht-Chips des Boards: alle Spalten oder genau eine. */
const ANSICHTEN = ['alle', ...SPALTEN]

/** Symbol je Workitem-Typ (Vorlage: ◇ Feature, ! Bug, ↻ Harness Improvement), sonst ein Punkt. */
const TYP_SYMBOL = { FEATURE: '◇', BUG: '!', HARNESS_IMPROVEMENT: '↻' }

/** Bekannte Workitem-Typen mit übersetzter Bezeichnung; ein anderer Typ erscheint roh. */
const BEKANNTE_TYPEN = new Set(['FEATURE', 'BUG', 'HARNESS_IMPROVEMENT', 'TECH_DEBT', 'PROCESS_IMPROVEMENT'])

/** Ungefilterte Workitems (Board, Filteroptionen, Detail): undefined = lädt, null = Quelle defekt, sonst Liste. */
let alleWorkitems

/** Fehlertext des letzten ungefilterten Abrufs (Netzwerk o. ä.), sonst null. */
let alleFehler = null

/** Aufträge für die Verknüpfung Workitem ↔ Workflow: undefined = lädt, null = nicht verfügbar, sonst Liste. */
let auftraege

/** Zuletzt vom Server geladene (bereits serverseitig gefilterte) Liste des aktiven Listen-Tabs. */
let letzteWorkitems = []

/** Zustand des Listenabrufs: 'laedt' | 'ok' | 'fehler' — ein Poll-Tick rendert die Liste nur bei 'ok' nach. */
let listenZustand = 'laedt'

/** id des aktuell offenen Detail-Panels, oder null — erlaubt einen stillen Inhalts-Refresh, sobald eine Liste nachträglich eintrifft. */
let gewaehlteId = null

/** Überholschutz (Muster views/workflows.js workflowRenderZaehler): je Abrufart verwirft eine spätere Anfrage die Antwort einer früheren. */
let anfrageZaehler = 0
let alleAnfrageZaehler = 0
let auftraegeAnfrageZaehler = 0

/** Aktives Register: 'board' oder ein Schlüssel aus LISTEN_TABS. */
let aktiverTab = 'board'

/** Gewählter Ansicht-Chip des Boards. */
let boardAnsicht = 'alle'

/** Spaltenfilter eines Listen-Tabs nach „+ x weitere“ (eine Spalte aus SPALTEN), oder null. */
let listenSpalte = null

/** Suchtext der Listen-Tabs (clientseitig, sucheWorkitems). */
let suchText = ''

/** true, solange #/workboard bzw. ein Detail darin sichtbar ist — ein erneutes Betreten lädt neu, ein Wechsel Board ↔ Detail nicht. */
let seiteAktiv = false

/** Zuletzt geschriebenes HTML von Board und Liste — ein Poll-Tick schreibt nur bei geändertem Inhalt (Fokus bleibt). */
let letztesBoardHtml = ''
let letztesListenHtml = ''

/**
 * F22 WS-2: Bearbeitungszustand des EINEN gerade offenen Finding-Detail-Panels, oder null (noch
 * nicht "Bearbeiten" geklickt). Phasen: 'wird_angelegt' (POST /api/auftraege unterwegs),
 * 'wird_geroutet' (POST .../routen unterwegs, auch beim Wiederholen nach 409 oder nach einem
 * generischen Fehler), 'routet' (202 erhalten, wartet auf den Workflow-Vorschlag), 'konflikt'
 * (409/D13), 'fehler', 'vorschlag' (Workflow existiert, wartet auf Freigeben/Ablehnen),
 * 'verworfen', 'wird_gestartet' (POST .../starten unterwegs), 'gestartet' (freigegeben, Kette
 * läuft), 'abgeschlossen' (Terminal-Block, AK6). Überlebt ein Schließen des Panels
 * (schliesseDetail räumt NICHT auf) — ein Wiederöffnen DESSELBEN Findings zeigt den Fortschritt
 * weiter, statt "Bearbeiten" erneut anzubieten und versehentlich einen zweiten Auftrag für
 * dasselbe Finding anzulegen. Wechselt ladeDetail auf ein ANDERES Workitem, wird zurückgesetzt.
 */
let bearbeitungsZustand = null

/** Letztes Zustands-Aggregat aus dem Poll (zustand.js): workflows für das Board, startfehler für Click-to-Work (AK3-Zustand "routet…" endet auch bei einem Startfehler zu genau diesem Lauf). undefined vor dem ersten Tick. */
let letzterZustand

/**
 * Escapter, übersetzter Text (Muster views/dashboard.js).
 * @param schluessel - i18n-Schlüssel
 * @param werte - Platzhalterwerte
 * @returns HTML
 */
function tx(schluessel, werte) {
  return escapeHtml(t(schluessel, werte))
}

/**
 * Lesbare Meldung eines geworfenen Werts (Error oder etwas anderes).
 * @param fehler - gefangener Wert
 * @returns Meldungstext
 */
function meldungVon(fehler) {
  return fehler instanceof Error ? fehler.message : String(fehler)
}

/**
 * Ordnet den Status eines Workitems einer der drei bestehenden .badge-Modifikatorklassen zu
 * (ok/aktiv/neutral) — für den Statuspunkt in Listenzeile und Detail-Kopf (F29 WS-1b). Kein neues
 * Farbvokabular: fehler/stale bleiben echten Fehlern/veralteten Ständen vorbehalten.
 * @param workitem - ein Workitem (Finding oder Feature-Akte)
 * @returns 'ok' | 'aktiv' | 'neutral'
 */
function statusKategorie(workitem) {
  if (workitem.status === 'ERLEDIGT' || workitem.status === 'ABGESCHLOSSEN') return 'ok'
  if (workitem.status === 'OFFEN' || workitem.status === 'FEATURE_GATE') return 'aktiv'
  return 'neutral'
}

/** Statustext einer Zeile/eines Kopfs — Findings zeigen zusätzlich den Rohwert aus state/findings.md (unterschiedliches Vokabular je Quelle). @param workitem - ein Workitem @returns Statustext, bereits escaped */
function statusText(workitem) {
  return workitem.quelle === 'finding' ? `${escapeHtml(workitem.status)} (${escapeHtml(workitem.statusRoh)})` : escapeHtml(workitem.status)
}

/**
 * Übersetzte Typbezeichnung; ein unbekannter Typ erscheint roh (Projektinhalt).
 * @param typ - workitem.typ
 * @returns HTML
 */
function typText(typ) {
  return BEKANNTE_TYPEN.has(typ) ? tx(`entwicklung.typ.${typ}`) : escapeHtml(typ ?? '')
}

/**
 * Übersetzter Status einer Karte: Feature-Akten über die Kategorien der Roadmap
 * (roadmap-anzeige.js, eine Regel), Findings OFFEN/ERLEDIGT/SONSTIGES; der Rohwert steht im title.
 * @param workitem - ein Workitem
 * @returns HTML
 */
function kartenStatus(workitem) {
  const roh = workitem.quelle === 'finding' ? (workitem.statusRoh ?? workitem.status) : workitem.status
  const text = workitem.quelle === 'feature' ? t(`roadmap.status.${roadmapStatusKategorie(workitem.status)}`) : t(`entwicklung.findingStatus.${['OFFEN', 'ERLEDIGT'].includes(workitem.status) ? workitem.status : 'SONSTIGES'}`)
  return `<span title="${escapeHtml(roh ?? '')}">${escapeHtml(text)}</span>`
}

/**
 * Eine Listenzeile (Vorlage d_arbeit_features: Symbol, Titel, Typ · Priorität, Status).
 * @param workitem - ein Workitem
 * @returns HTML
 */
function workitemZeile(workitem) {
  const prioritaet = workitem.quelle === 'finding' ? ` · ${escapeHtml(workitem.prioritaet)}` : ''
  const titel = typeof workitem.titel === 'string' && workitem.titel.trim() !== '' ? workitem.titel : workitem.id
  return `<div class="list-row workboard-zeile" data-id="${escapeHtml(workitem.id)}" role="link" tabindex="0">
    <span class="workboard-zeile-symbol" aria-hidden="true">${escapeHtml(TYP_SYMBOL[workitem.typ] ?? '·')}</span>
    <div class="workboard-zeile-haupt">
      <p class="workboard-zeile-titel">${escapeHtml(titel)}</p>
      <p class="workboard-zeile-meta"><code>${escapeHtml(workitem.id)}</code> · ${typText(workitem.typ)}${prioritaet}</p>
    </div>
    <span class="workboard-zeile-status"><span class="status-punkt ${statusKategorie(workitem)}" aria-hidden="true"></span> ${kartenStatus(workitem)}</span>
  </div>`
}

/**
 * Zeigt Parser-Befunde (nicht parsebare Kopfzeile etc.) sichtbar über Board und Liste, statt sie
 * zu verschlucken (E6, F21 AK1-Geist). Die Meldungen sind Serverinhalt.
 * @param befunde - antwort.befunde aus GET /api/workitems, oder null bei defekter Quelle/Fehler
 */
function renderBefunde(befunde) {
  const container = document.getElementById('workboard-befunde')
  if (!Array.isArray(befunde) || befunde.length === 0) {
    container.innerHTML = ''
    return
  }
  container.innerHTML = `<div class="note red"><strong>${tx('entwicklung.befunde.titel', { anzahl: befunde.length, zahl: formatiereZahl(befunde.length) })}</strong><p>${befunde.map((b) => escapeHtml(b.meldung)).join('; ')}</p></div>`
}

// ─── Kopf und Register ───────────────────────────────────────────────────────

/** Rendert Titel, Einleitung und Register des aktiven Tabs; „Eintrag erfassen“ (E7) steht fest im Kopf. */
function renderKopf() {
  document.getElementById('workboard-titel').textContent = t(`entwicklung.tab.${aktiverTab}.titel`)
  document.getElementById('workboard-beschreibung').textContent = t(`entwicklung.tab.${aktiverTab}.beschreibung`)
  const knoepfe = TABS.map((tab) => {
    const aktiv = tab === aktiverTab
    return `<button type="button" class="tab-knopf${aktiv ? ' active' : ''}" data-tab="${tab}" aria-pressed="${aktiv}">${tx(`entwicklung.tab.${tab}`)}</button>`
  }).join('')
  document.getElementById('workboard-tabs').innerHTML = `${knoepfe}<a href="#/projekt">${tx('entwicklung.tab.auftraege')}</a><a href="#/runs">${tx('entwicklung.tab.ausfuehrungen')}</a>`
  document.getElementById('workboard-board-bereich').hidden = aktiverTab !== 'board'
  document.getElementById('workboard-listen-bereich').hidden = aktiverTab === 'board'
}

/** Baut einmalig die festen Bedienelemente: „Eintrag erfassen“ (kommt), Board-Modi (E2/E3 kommt), Ansicht-Chips, „Alle“-Chips der Filter. */
function baueFesteBedienung() {
  document.getElementById('workboard-erfassen').innerHTML = kommtKnopf(t('entwicklung.eintragErfassen'), { primaer: true, symbol: '+' })
  document.getElementById('workboard-modi').innerHTML = `<button type="button" class="view-switch-knopf active" aria-pressed="true">${tx('entwicklung.modus.status')}</button>
    <button type="button" class="view-switch-knopf" aria-disabled="true">${tx('entwicklung.modus.prioritaet')} ${kommtBadge()}</button>
    <button type="button" class="view-switch-knopf" aria-disabled="true">${tx('entwicklung.modus.zeitleiste')} ${kommtBadge()}</button>`
  document.getElementById('workboard-ansicht').innerHTML = `<span>${tx('entwicklung.ansicht')}</span>${ANSICHTEN.map(
    (ansicht) => `<button type="button" class="board-filter-chip" data-ansicht="${ansicht}" aria-pressed="${ansicht === boardAnsicht}">${tx(`entwicklung.ansicht.${ansicht}`)}</button>`
  ).join('')}`
  for (const id of ['workboard-filter-typ', 'workboard-filter-status', 'workboard-filter-prioritaet']) fuelleChipGruppe(id, [])
}

// ─── Board (E1) ──────────────────────────────────────────────────────────────

/**
 * Eine Karte: Typ, Priorität (nur Findings), Titel, Status, ID — Link ins Detail.
 * @param workitem - ein Workitem
 * @returns HTML
 */
function boardKarte(workitem) {
  const symbol = TYP_SYMBOL[workitem.typ] ?? '·'
  const prioritaet = workitem.quelle === 'finding' ? `<span>${escapeHtml(workitem.prioritaet)}</span>` : ''
  const titel = typeof workitem.titel === 'string' && workitem.titel.trim() !== '' ? workitem.titel : workitem.id
  return `<a class="board-item" href="#/workboard/${encodeURIComponent(workitem.id)}">
      <span class="board-item-meta"><span><span aria-hidden="true">${escapeHtml(symbol)}</span> ${typText(workitem.typ)}</span>${prioritaet}</span>
      <span class="board-item-titel">${escapeHtml(titel)}</span>
      <span class="board-phase">${kartenStatus(workitem)}</span>
      <span class="board-owner"><code>${escapeHtml(workitem.id)}</code></span>
    </a>`
}

/**
 * „+ x weitere“ einer Spalte: je Listen-Tab ein Sprung mit Spaltenfilter; Workitems ohne Tab
 * (unbekannter Typ) zählen nur mit.
 * @param spalte - Spaltenschlüssel
 * @param daten - Spalte aus baueBoard
 * @returns HTML
 */
function weitereZeile(spalte, daten) {
  if (daten.weitere === 0) return ''
  const gesamt = tx('entwicklung.weitere', { anzahl: daten.weitere, zahl: formatiereZahl(daten.weitere) })
  const sprung = (tab, inhalt) => `<button type="button" class="board-weitere" data-weitere-tab="${tab}" data-weitere-spalte="${spalte}">${inhalt}</button>`
  if (daten.weitereJeTab.length === 1 && daten.weitereJeTab[0].anzahl === daten.weitere) return `<p class="board-weitere-zeile">${sprung(daten.weitereJeTab[0].tab, gesamt)}</p>`
  const spruenge = daten.weitereJeTab.map(({ tab, anzahl }) => sprung(tab, `${tx(`entwicklung.tab.${tab}`)} ${escapeHtml(formatiereZahl(anzahl))}`)).join('')
  return `<p class="board-weitere-zeile"><span>${gesamt}</span>${spruenge}</p>`
}

/**
 * Eine Spalte mit Titel, Zahl, Karten, Leerzustand und „+ x weitere“.
 * Fehlt der Ausführungsstand (Workflows oder Aufträge lädt bzw. nicht verfügbar), behaupten die
 * Spalten „In Arbeit“ und „Braucht dich“ im Leerzustand nichts, was sie nicht wissen können.
 * @param spalte - Spaltenschlüssel
 * @param daten - Spalte aus baueBoard
 * @param unvollstaendig - true, solange die Verknüpfung zu den Workflows fehlt
 * @returns HTML
 */
function boardSpalte(spalte, daten, unvollstaendig) {
  const leerSchluessel = unvollstaendig && (spalte === 'in_arbeit' || spalte === 'braucht_dich') ? 'entwicklung.spalte.leer.unvollstaendig' : `entwicklung.spalte.${spalte}.leer`
  const inhalt = daten.karten.length === 0 ? `<p class="board-empty">${tx(leerSchluessel)}</p>` : daten.karten.map(boardKarte).join('')
  return `<section class="board-column board-spalte-${spalte}" aria-labelledby="workboard-spalte-${spalte}">
      <div class="board-column-title"><h2 id="workboard-spalte-${spalte}">${tx(`entwicklung.spalte.${spalte}`)}</h2><span>${escapeHtml(formatiereZahl(daten.anzahl))}</span></div>
      ${inhalt}
      ${weitereZeile(spalte, daten)}
    </section>`
}

/**
 * Hinweis zur Verknüpfung mit den Workflows (Regel in baueBoard): eine nicht verfügbare Quelle
 * (null) als Hinweis, eine noch ladende (undefined) als leise Zeile — die Karten stehen bis dahin
 * nur nach ihrem Status und können danach die Spalte wechseln.
 * @param board - Ergebnis von baueBoard
 * @returns HTML
 */
function verknuepfungsHinweis(board) {
  if (board.fehlend.length > 0) {
    const quellen = board.fehlend.map((quelle) => t(`entwicklung.quelle.${quelle}`)).join(', ')
    return `<div class="note amber"><strong>${tx('entwicklung.verknuepfung.titel')}</strong><p>${tx('entwicklung.verknuepfung.text', { quellen })}</p></div>`
  }
  return board.laedt.length > 0 ? `<p class="subtle board-verknuepfung-laedt">${tx('entwicklung.verknuepfung.laedt')}</p>` : ''
}

/** HTML des Board-Inhalts je Zustand (lädt, Fehler, Quelle defekt, Spalten). @returns HTML */
function boardHtml() {
  if (alleFehler !== null) {
    return `<div class="note red"><strong>${tx('entwicklung.fehler.titel')}</strong><p><code>${escapeHtml(alleFehler)}</code></p><button type="button" class="button" data-workboard-erneut>${tx('entwicklung.fehler.erneut')}</button></div>`
  }
  if (alleWorkitems === undefined) return `<p class="subtle">${tx('entwicklung.laedt')}</p>`
  const board = baueBoard(alleWorkitems, letzterZustand?.workflows, auftraege)
  if (board === null) return `<div class="note red"><strong>${tx('entwicklung.nichtVerfuegbar')}</strong></div>`
  const spalten = SPALTEN.filter((spalte) => boardAnsicht === 'alle' || boardAnsicht === spalte)
  const ausserhalb = board.ausserhalb > 0 ? `<p class="subtle board-ausserhalb">${tx('entwicklung.ausserhalb', { anzahl: board.ausserhalb, zahl: formatiereZahl(board.ausserhalb) })}</p>` : ''
  const unvollstaendig = board.fehlend.length > 0 || board.laedt.length > 0
  return `${verknuepfungsHinweis(board)}<div class="pm-board${boardAnsicht === 'alle' ? '' : ' filtered-board'}">${spalten.map((spalte) => boardSpalte(spalte, board.spalten[spalte], unvollstaendig)).join('')}</div>${ausserhalb}`
}

/** Schreibt das Board, aber nur bei geändertem Inhalt (ein Poll-Tick zerstört keinen Fokus). */
function renderBoard() {
  const html = boardHtml()
  if (html === letztesBoardHtml) return
  letztesBoardHtml = html
  document.getElementById('workboard-board').innerHTML = html
}

// ─── Listen-Tabs (E4, E5) ────────────────────────────────────────────────────

/**
 * Befüllt eine Filter-Chip-Gruppe, ohne eine bereits gewählte, weiterhin gültige Auswahl zu
 * verlieren. Ein Chip ist EIN <button data-wert> je Wert plus ein fester "Alle"-Chip zuerst;
 * aria-pressed trägt den Auswahlzustand.
 * @param id - Container-Element-id @param werte - erlaubte Werte (Projektinhalt, roh)
 */
function fuelleChipGruppe(id, werte) {
  const gruppe = document.getElementById(id)
  const aktuellerWert = gruppe.querySelector('[data-wert][aria-pressed="true"]')?.dataset.wert ?? ''
  const neuerWert = werte.includes(aktuellerWert) ? aktuellerWert : ''
  gruppe.innerHTML =
    `<button type="button" class="filter-chip" data-wert="" aria-pressed="${neuerWert === '' ? 'true' : 'false'}">${tx('entwicklung.filter.alle')}</button>` +
    werte.map((w) => `<button type="button" class="filter-chip" data-wert="${escapeHtml(w)}" aria-pressed="${w === neuerWert ? 'true' : 'false'}">${escapeHtml(w)}</button>`).join('')
}

/** Die Workitems der ungefilterten Liste, die zum aktiven Listen-Tab gehören. @returns Liste (leer ohne Daten) */
function workitemsDesTabs() {
  const typen = LISTEN_TABS[aktiverTab] ?? []
  return Array.isArray(alleWorkitems) ? alleWorkitems.filter((w) => typen.includes(w.typ)) : []
}

/** Leitet die Filter-Optionen des aktiven Listen-Tabs aus den tatsächlich vorkommenden Werten der ungefilterten Liste ab — kein hart codiertes Vokabular. Typ nur bei mehreren Typen (Weitere), Priorität nicht bei Features. */
function befuelleFilterOptionen() {
  if (aktiverTab === 'board') return
  const workitems = workitemsDesTabs()
  const typen = LISTEN_TABS[aktiverTab]
  fuelleChipGruppe('workboard-filter-typ', typen.length > 1 ? [...new Set(workitems.map((w) => w.typ))].sort() : [])
  fuelleChipGruppe('workboard-filter-status', [...new Set(workitems.map((w) => w.status))].sort())
  fuelleChipGruppe('workboard-filter-prioritaet', [...new Set(workitems.filter((w) => w.quelle === 'finding').map((w) => w.prioritaet))].sort())
  document.getElementById('workboard-filter-typ').parentElement.hidden = typen.length < 2
  document.getElementById('workboard-filter-prioritaet').parentElement.hidden = !typen.some((typ) => typ !== 'FEATURE')
}

/** @param id - Chip-Gruppen-Container-id @returns der aktuell gewählte Wert, oder '' für "Alle" */
function gewaehlterChipWert(id) {
  return document.getElementById(id).querySelector('[data-wert][aria-pressed="true"]')?.dataset.wert ?? ''
}

/** Die Serverfilter des aktiven Listen-Tabs: Typ (gewählter Chip, sonst der einzige Typ des Tabs), Status, Priorität. @returns Filterobjekt für holeWorkitems */
function aktuelleFilter() {
  const filter = {}
  const typen = LISTEN_TABS[aktiverTab] ?? []
  const typ = gewaehlterChipWert('workboard-filter-typ') || (typen.length === 1 ? typen[0] : '')
  const status = gewaehlterChipWert('workboard-filter-status')
  const prioritaet = gewaehlterChipWert('workboard-filter-prioritaet')
  if (typ) filter.typ = typ
  if (status) filter.status = status
  if (prioritaet) filter.prioritaet = prioritaet
  return filter
}

/** Der entfernbare Spaltenfilter-Chip nach „+ x weitere“. */
function renderSpaltenfilter() {
  const container = document.getElementById('workboard-spaltenfilter')
  container.innerHTML =
    listenSpalte === null
      ? ''
      : `<button type="button" class="filter-chip" data-spalte-entfernen aria-pressed="true" aria-label="${tx('entwicklung.spaltenfilter.entfernen', { spalte: t(`entwicklung.spalte.${listenSpalte}`) })}">${tx('entwicklung.spaltenfilter', { spalte: t(`entwicklung.spalte.${listenSpalte}`) })} <span aria-hidden="true">×</span></button>`
}

/** Schreibt die Liste aus letzteWorkitems: Tab-Typen, Spaltenfilter, Suche — nur bei geändertem Inhalt. */
function renderListe() {
  if (listenZustand !== 'ok') return
  const typen = LISTEN_TABS[aktiverTab] ?? []
  let liste = letzteWorkitems.filter((w) => typen.includes(w.typ))
  if (listenSpalte !== null) {
    const verknuepfung = baueVerknuepfung(letzterZustand?.workflows, auftraege)
    liste = liste.filter((w) => spalteVon(w, verknuepfung) === listenSpalte)
  }
  liste = sucheWorkitems(liste, suchText)
  const leer = suchText.trim() !== '' ? 'entwicklung.liste.keineTreffer' : 'entwicklung.liste.leer'
  const html = liste.length === 0 ? `<p class="leer">${tx(leer)}</p>` : liste.map(workitemZeile).join('')
  if (html === letztesListenHtml) return
  letztesListenHtml = html
  document.getElementById('workboard-liste').innerHTML = html
}

/**
 * Setzt die Liste auf einen festen Zustand (lädt, nicht verfügbar, Fehler) und vergisst das
 * zuletzt geschriebene Listen-HTML.
 * @param html - Inhalt
 */
function setzeListe(html) {
  letztesListenHtml = ''
  document.getElementById('workboard-liste').innerHTML = html
}

/**
 * Lädt GET /api/workitems mit den Filtern des aktiven Listen-Tabs und rendert Befunde + Liste.
 * Überholschutz: eine überholte Antwort (schneller Filter-/Tabwechsel, „Neu laden“) wird
 * verworfen. Ist ein Detail offen, wird dessen Inhalt still nachgerendert (Reload/Deep-Link auf
 * `#/workboard/<id>`, F21 Reviewer-Befund TC-01). Auf dem Board lädt sie nichts, erhöht aber den
 * Zähler und leert die Liste: Eine noch laufende Listenantwort (etwa aus dem Projekt vor einem
 * Wechsel) wird so verworfen, und das Detail findet ein Workitem dann in der frischen,
 * ungefilterten Liste statt in einem veralteten Listenstand (Prüfpass WS-3a).
 */
async function ladeListe() {
  const meineAnfrageNummer = ++anfrageZaehler
  if (aktiverTab === 'board') {
    letzteWorkitems = []
    listenZustand = 'laedt'
    return
  }
  listenZustand = 'laedt'
  setzeListe(`<p class="leer">${tx('entwicklung.laedt')}</p>`)
  const filter = aktuelleFilter()
  try {
    const antwort = await holeWorkitems(filter)
    if (meineAnfrageNummer !== anfrageZaehler) return
    renderBefunde(antwort.befunde)
    if (!Array.isArray(antwort.workitems)) {
      listenZustand = 'fehler'
      letzteWorkitems = []
      setzeListe(`<p class="unbekannt">${tx('entwicklung.nichtVerfuegbar')}</p>`)
      return
    }
    letzteWorkitems = antwort.workitems
    listenZustand = 'ok'
    renderListe()
    if (gewaehlteId !== null) renderDetailInhalt(gewaehlteId)
  } catch (fehler) {
    if (meineAnfrageNummer !== anfrageZaehler) return
    console.error('GET …/workitems (Liste) fehlgeschlagen:', fehler)
    listenZustand = 'fehler'
    letzteWorkitems = []
    setzeListe(`<p class="fehler">${tx('entwicklung.fehler.anfrage', { meldung: meldungVon(fehler) })}</p>`)
  }
}

// ─── Laden beim Betreten, „Neu laden“, Projektwechsel ────────────────────────

/** Lädt die ungefilterten Workitems (Board, Filteroptionen, Detail); eine überholte Antwort wird verworfen. */
async function ladeAlleWorkitems() {
  const meineAnfrageNummer = ++alleAnfrageZaehler
  alleWorkitems = undefined
  alleFehler = null
  renderBoard()
  try {
    const antwort = await holeWorkitems({})
    if (meineAnfrageNummer !== alleAnfrageZaehler) return
    alleWorkitems = Array.isArray(antwort?.workitems) ? antwort.workitems : null
    renderBefunde(antwort?.befunde)
    // Fällt ein gewählter Filterwert aus den neuen Optionen, springt sein Chip auf „Alle“ — dann
    // die Liste mit dem jetzt gültigen Filter neu laden, sonst zeigten Chip und Liste Verschiedenes.
    const filterVorher = JSON.stringify(aktuelleFilter())
    befuelleFilterOptionen()
    if (aktiverTab !== 'board' && JSON.stringify(aktuelleFilter()) !== filterVorher) void ladeListe()
    if (gewaehlteId !== null) renderDetailInhalt(gewaehlteId)
  } catch (fehler) {
    if (meineAnfrageNummer !== alleAnfrageZaehler) return
    console.error('GET …/workitems fehlgeschlagen:', fehler)
    alleFehler = meldungVon(fehler)
  }
  renderBoard()
}

/** Lädt GET …/auftraege für die Verknüpfung Workitem ↔ Workflow — nie aus dem Poll; eine überholte Antwort wird verworfen. */
async function ladeAuftraege() {
  const meineAnfrageNummer = ++auftraegeAnfrageZaehler
  auftraege = undefined
  try {
    const antwort = await holeAuftraege()
    if (meineAnfrageNummer !== auftraegeAnfrageZaehler) return
    auftraege = Array.isArray(antwort) ? antwort : null
  } catch (fehler) {
    if (meineAnfrageNummer !== auftraegeAnfrageZaehler) return
    console.error('GET …/auftraege fehlgeschlagen:', fehler)
    auftraege = null
  }
  renderBoard()
  renderListe()
}

/** Lädt alles, was die Seite außerhalb des Polls braucht (Betreten, „Neu laden“, Projektwechsel). */
function ladeSeite() {
  void ladeAlleWorkitems()
  void ladeAuftraege()
  void ladeListe()
}

/** Routen-Eintritt: lädt nur beim Betreten der Seite neu, nicht beim Wechsel zwischen Board und Detail. */
function betreteSeite() {
  if (seiteAktiv) return
  seiteAktiv = true
  ladeSeite()
}

/**
 * Wechselt das Register. Die Filter gehen auf „Alle“ zurück, die Suche wird geleert.
 * @param tab - 'board' oder ein Listen-Tab
 * @param spalte - optionaler Spaltenfilter (aus „+ x weitere“)
 */
function wechsleTab(tab, spalte = null) {
  aktiverTab = tab
  listenSpalte = spalte
  suchText = ''
  const suche = document.getElementById('workboard-suche')
  suche.value = ''
  if (tab !== 'board') {
    suche.placeholder = t(`entwicklung.suche.${tab}`)
    suche.setAttribute('aria-label', t(`entwicklung.suche.${tab}`))
  }
  for (const id of ['workboard-filter-typ', 'workboard-filter-status', 'workboard-filter-prioritaet']) fuelleChipGruppe(id, [])
  befuelleFilterOptionen()
  renderSpaltenfilter()
  renderKopf()
  if (tab === 'board') renderBoard()
  void ladeListe()
}

// ─── Detail und Click-to-Work (funktional unverändert, Umbau WS-3b) ──────────

/**
 * Sucht ein Workitem für das Detail: zuerst in der zuletzt geladenen Liste des Listen-Tabs, dann
 * in der ungefilterten Liste des Boards (eine Karte führt so immer zu ihrem Detail).
 * @param id - Workitem-id
 * @returns das Workitem, oder null
 */
function findeWorkitem(id) {
  return letzteWorkitems.find((w) => w.id === id) ?? (Array.isArray(alleWorkitems) ? alleWorkitems.find((w) => w.id === id) : undefined) ?? null
}

function unbekanntFeld(wert) {
  return wert ? escapeHtml(wert) : '<span class="unbekannt">—</span>'
}

function renderFindingDetail(workitem) {
  return `<div class="detail-block">
    <h3>${escapeHtml(workitem.titel)}</h3>
    <p><code>${escapeHtml(workitem.id)}</code> · <span class="status-punkt ${statusKategorie(workitem)}" aria-hidden="true"></span> ${statusText(workitem)} · <span class="badge">${escapeHtml(workitem.typ)}</span> <span class="badge">${escapeHtml(workitem.prioritaet)}</span></p>
  </div>
  <div class="detail-block"><h3>Beschreibung</h3><p>${unbekanntFeld(workitem.beschreibung)}</p></div>
  <div class="detail-block"><h3>Fundstelle</h3><p>${unbekanntFeld(workitem.fundstelle)}</p></div>
  <div class="detail-block"><h3>Auswirkung</h3><p>${unbekanntFeld(workitem.auswirkung)}</p></div>
  <div class="detail-block"><h3>Maßnahme</h3><p>${unbekanntFeld(workitem.massnahme)}</p></div>
  <div class="detail-block"><h3>Feature-Run</h3><p>${unbekanntFeld(workitem.featureRun)}</p></div>`
}

/** Feature-Status, unter denen kein Bau-Auftrag mehr angelegt werden kann (F35 WS-1 AK6). */
const FEATURE_STATUS_NICHT_BAUBAR = new Set(['ABGESCHLOSSEN', 'ABGEBROCHEN'])

/** true, wenn aus workitem (Feature-Akte) noch ein Bau-Auftrag angelegt werden darf (F35 WS-1 AK6). @param workitem - ein Feature-Workitem */
function istFeatureBaubar(workitem) {
  return !FEATURE_STATUS_NICHT_BAUBAR.has(workitem.status)
}

function renderFeatureDetail(workitem) {
  const hinweis = istFeatureBaubar(workitem)
    ? 'Die Akte selbst bleibt nur lesbar (F23-Scope) — der Bau-Auftrag entsteht deterministisch aus Ziel/Nicht-Zielen/Akzeptanzkriterien (F35).'
    : 'Nur lesend — der Status lässt keinen Bau-Auftrag mehr zu (ABGESCHLOSSEN/ABGEBROCHEN).'
  return `<div class="detail-block">
    <h3>${escapeHtml(workitem.titel)}</h3>
    <p><code>${escapeHtml(workitem.id)}</code> · <span class="status-punkt ${statusKategorie(workitem)}" aria-hidden="true"></span> ${escapeHtml(workitem.status)}</p>
  </div>
  <div class="detail-block"><h3>Pfad</h3><p><code>${escapeHtml(workitem.pfad)}</code></p></div>
  <p class="hinweis">${hinweis}</p>`
}

// ─── F22 WS-2: Bearbeiten (Click-to-Work) ───────────────────────────────────

/** Baut den Auftragstext eines Findings — MUSS die Referenzzeile `workitem:finding:<id>` tragen (WORKITEM_REFERENZ_MUSTER, scripts/leitstand-server.mjs), sonst bleibt workitem_referenz aus WS-1 für immer null (Gegenstück zu leseWorkitemReferenz). @param workitem - ein Finding-Workitem @returns Auftragstext für POST /api/auftraege */
function baueAuftragstext(workitem) {
  const teile = [workitem.titel]
  if (workitem.beschreibung) teile.push(workitem.beschreibung)
  if (workitem.fundstelle) teile.push(`Fundstelle: ${workitem.fundstelle}`)
  teile.push(`workitem:${workitem.quelle}:${workitem.id}`)
  return teile.join('\n\n')
}

/** Rolle→Worker→Modell-Kette eines Workflow-Datensatzes — Ersatzanzeige für Kontrolltiefe/Risikoklasse/Begründung, die nur im Router-Artefakt stehen und über keinen Lesepfad erreichbar sind (F-372). @param daten - WORKFLOW_V0-Datensatz aus GET /api/workflows/<id>, oder undefined */
function renderSchrittkette(daten) {
  if (!Array.isArray(daten?.schritte) || daten.schritte.length === 0) {
    return '<p class="unbekannt">Keine Schritte in dieser Fassung.</p>'
  }
  return `<ol>${daten.schritte.map((schritt) => `<li>${escapeHtml(schritt.rolle)} → ${escapeHtml(schritt.worker)} → ${escapeHtml(schritt.modell)}</li>`).join('')}</ol>`
}

/** Die drei git-Befehle als reiner Text-Block (AK6) — die Oberfläche führt nichts davon aus. Platzhalter statt `git add -A`/`git add .` (CLAUDE.md, Pauschales Stagen ist ausgeschlossen); die konkreten Dateien wählt der Mensch. */
function renderTerminalBlock() {
  return `<div class="unterabschnitt">
    <h3>Commit / Push / PR</h3>
    <p class="hinweis">Die Kette ist abgeschlossen. Zum Kopieren ins Terminal (Skill <code>git-flow</code> — gezieltes Stagen, keine Sammelstage):</p>
    <pre>git add &lt;geänderte Dateien&gt;
git commit -m "&lt;Commit-Message&gt;"
git push</pre>
    <p class="hinweis">Siehe zusätzlich <code>state/freigabe-commit.md</code>.</p>
  </div>`
}

/**
 * Der Inhalt von #workboard-bearbeitung für EIN Finding, je nach bearbeitungsZustand.phase.
 * @param workitem - das Finding, dessen Detail-Panel offen ist
 * @param zustand - bearbeitungsZustand (nicht null, workitemId === workitem.id)
 * @returns HTML-Block
 */
function renderBearbeitungsInhalt(workitem, zustand) {
  const daten = zustand.workflowDetail?.daten
  if (zustand.phase === 'wird_angelegt') return '<p class="hinweis">Auftrag wird angelegt…</p>'
  if (zustand.phase === 'wird_geroutet') return '<p class="hinweis">Routet…</p>'
  if (zustand.phase === 'wird_gestartet') return '<p class="hinweis">Freigabe wird gesendet…</p>'
  if (zustand.phase === 'routet') {
    return `<p class="hinweis">Routet… (Auftrag <code>${escapeHtml(zustand.auftragId)}</code>, Lauf <code>${escapeHtml(zustand.laufId)}</code>)</p>`
  }
  if (zustand.phase === 'konflikt') {
    return `<p class="fehler">${escapeHtml(zustand.meldung)}</p><button class="btn wb-wiederholen" data-id="${escapeHtml(workitem.id)}">Wiederholen</button>`
  }
  if (zustand.phase === 'fehler') {
    // Wiederholen nur, wenn der Auftrag bereits real angelegt ist (sonst gäbe es nichts, das
    // wiederholeRouten routen könnte) — Reviewer-/QA-Pass 14.09.2026: ohne diesen Knopf war
    // 'fehler' eine Sackgasse, ein erneutes "Bearbeiten" hätte einen zweiten Auftrag angelegt.
    const wiederholenKnopf = zustand.auftragId !== null ? `<button class="btn wb-wiederholen" data-id="${escapeHtml(workitem.id)}">Wiederholen</button>` : ''
    return `<p class="fehler">${escapeHtml(zustand.meldung)}</p>${wiederholenKnopf}`
  }
  if (zustand.phase === 'vorschlag') {
    return `<div class="unterabschnitt">
      <h3>Workflow-Vorschlag</h3>
      <p class="hinweis">Kontrolltiefe, Risikoklasse und Begründung liegen im Router-Ergebnis-Artefakt, das über keinen Lesepfad erreichbar ist (F-372) — ersatzweise die Schrittkette aus dem Vorschlag:</p>
      <p><strong>Ziel:</strong> ${escapeHtml(daten?.ziel ?? '')} — <strong>Workflow:</strong> <code>${escapeHtml(zustand.workflowId)}</code></p>
      ${renderSchrittkette(daten)}
      ${renderEmpfehlung(zustand.workflowDetail?.empfehlung)}
      ${zustand.meldung ? `<p class="fehler">${escapeHtml(zustand.meldung)}</p>` : ''}
      ${renderInstallierbarHinweis(zustand.workflowDetail?.empfehlung)}
      <div>
        <button class="btn btn-primary wb-freigeben" data-id="${escapeHtml(workitem.id)}">Freigeben</button>
        <button class="btn wb-ablehnen" data-id="${escapeHtml(workitem.id)}">Ablehnen</button>
      </div>
    </div>`
  }
  if (zustand.phase === 'verworfen') return '<p class="hinweis">Vorschlag verworfen.</p>'
  if (zustand.phase === 'gestartet' || zustand.phase === 'abgeschlossen') {
    return `<div class="unterabschnitt">
      <h3>Kette</h3>
      <p>Status: <code>${escapeHtml(daten?.status ?? '')}</code></p>
      ${renderSchrittkette(daten)}
    </div>${zustand.phase === 'abgeschlossen' ? renderTerminalBlock() : ''}`
  }
  return ''
}

/** Rendert #workboard-bearbeitung für workitem — Einstiegsknopf (Findings: "Bearbeiten"; baubare Feature-Akten, F35 WS-1: "Bauen") ohne offenen Bearbeitungszustand, den laufenden Zustand (beide Quellen teilen sich renderBearbeitungsInhalt), oder nichts (nicht mehr baubare Feature-Akten). @param workitem - das aktuell im Detail-Panel gezeigte Workitem */
function renderBearbeitungsAbschnitt(workitem) {
  const container = document.getElementById('workboard-bearbeitung')
  const einstiegsKnopf =
    workitem.quelle === 'finding'
      ? `<button id="workboard-bearbeiten" class="btn btn-primary" data-id="${escapeHtml(workitem.id)}">Bearbeiten</button>`
      : workitem.quelle === 'feature' && istFeatureBaubar(workitem)
        ? `<button id="workboard-bauen" class="btn btn-primary" data-id="${escapeHtml(workitem.id)}">Bauen</button>`
        : null
  if (einstiegsKnopf === null) {
    container.innerHTML = ''
    return
  }
  if (bearbeitungsZustand === null || bearbeitungsZustand.workitemId !== workitem.id) {
    container.innerHTML = einstiegsKnopf
    return
  }
  container.innerHTML = renderBearbeitungsInhalt(workitem, bearbeitungsZustand)
}

/**
 * true, solange workitem noch das offene Detail-Panel ist — der EINZIGE Grund, aus einem
 * async-Handler heraus noch ins DOM zu schreiben (aktualisiereBearbeitungsZustand, das immer mit
 * dem AKTUELLEN globalen Zustand startet, nicht mit einer alten Klick-Kette). @param workitem -
 * das Finding, dessen Handler gerade fertig wurde
 */
function istNochOffenesPanel(workitem) {
  return gewaehlteId === workitem.id
}

/**
 * Für die Klick-Ketten (starteBearbeitung/wiederholeRouten/verarbeiteRoutenAntwort/
 * freigebenBearbeitung), die auf einem lokal eingefangenen zustand-Objekt arbeiten: prüft NACH
 * einem await, ob dieses Objekt noch rendern darf, und übernimmt es dabei ggf. wieder als
 * globales bearbeitungsZustand. Zweite Reviewer-Runde 14.09.2026 (kritischer Befund): ein
 * Weg-und-Rücknavigieren zum SELBEN Workitem während des Requests setzt bearbeitungsZustand
 * zwischenzeitlich auf null (ladeDetail beim Verlassen) — ohne Wiederaufnahme bliebe der reale
 * Fortschritt (Auftrag ggf. schon angelegt/geroutet) für immer unsichtbar, ein erneuter
 * "Bearbeiten"-Klick legt dann einen zweiten, verwaisten Auftrag an. Ist bearbeitungsZustand
 * dagegen inzwischen ein ANDERES, echtes Objekt für dasselbe Workitem (ein zweiter, neuerer
 * "Bearbeiten"-Klick lief bereits an), darf diese ältere Kette es NICHT überschreiben — sie gibt
 * still auf, ihr eigener Seiteneffekt (ggf. ein bereits angelegter Auftrag) bleibt ein bekannter,
 * seltener Grenzfall der AK5-Lücke (siehe features/F22/feature.md).
 * @param workitem - das Finding, dessen Klick-Kette gerade einen await verlassen hat
 * @param zustand - das lokal eingefangene Bearbeitungszustand-Objekt dieser Kette
 * @returns true, wenn zustand jetzt (wieder) das gültige, renderbare bearbeitungsZustand ist
 */
function pruefeUndUebernimmZustand(workitem, zustand) {
  // F44 WS-1a (F-860): ein Zustand aus einem anderen Projekt (Wechsel während der Requests) wird
  // nie übernommen — auch nicht, wenn im neuen Projekt zufällig dieselbe Workitem-Id offen ist.
  if (zustand.projektId !== holeAktivesProjekt().id) return false
  if (gewaehlteId !== workitem.id) return false
  if (bearbeitungsZustand === null) bearbeitungsZustand = zustand
  return bearbeitungsZustand === zustand
}

/**
 * Verarbeitet die Antwort von POST .../routen (Erststart oder Wiederholen nach 409) einheitlich:
 * 202 → Phase 'routet' mit laufId, 409 → 'konflikt' mit dem Server-Grundtext (AK3 — Zustand, kein
 * Fehlerdialog), sonst → 'fehler'. Mutiert AUSSCHLIESSLICH das übergebene, lokal eingefangene
 * zustand-Objekt — nie die globale bearbeitungsZustand-Variable direkt (siehe
 * pruefeUndUebernimmZustand).
 * @param routeAntwort - Response von routeAuftrag()
 * @param workitem - das bearbeitete Finding, für den Nachtrag-Render
 * @param zustand - der lokal eingefangene Bearbeitungszustand des Aufrufers
 */
async function verarbeiteRoutenAntwort(routeAntwort, workitem, zustand) {
  const inhalt = await routeAntwort.json().catch(() => ({}))
  if (routeAntwort.status === 409) {
    zustand.phase = 'konflikt'
    zustand.meldung = inhalt.grund ?? 'ein anderer Lauf ist aktiv (D13)'
  } else if (!routeAntwort.ok) {
    zustand.phase = 'fehler'
    zustand.meldung = `Routen fehlgeschlagen: ${routeAntwort.status} ${inhalt.grund ?? ''}`.trim()
  } else {
    zustand.laufId = inhalt.laufId
    zustand.phase = 'routet'
  }
  if (pruefeUndUebernimmZustand(workitem, zustand)) renderBearbeitungsAbschnitt(workitem)
}

/**
 * Gemeinsamer Ablauf für "Bearbeiten" (Finding) UND "Bauen" (Feature-Akte,
 * F35 WS-1): Auftrag über erzeugeAuftrag anlegen, dann sofort routen.
 * Arbeitet auf einem lokal eingefangenen zustand-Objekt (siehe
 * pruefeUndUebernimmZustand) — ein Workitem-Wechsel während der Requests
 * darf weder auf ein inzwischen anderes bearbeitungsZustand schreiben noch
 * werfen.
 * @param workitem - das geklickte Workitem
 * @param zustand - lokal eingefangenes, bereits als bearbeitungsZustand gesetztes Zustandsobjekt
 * @param erzeugeAuftrag - liefert die rohe Response von legeAuftragAn/baueAuftragAusFeature (201/400/404/422 mit { auftragId } bzw. { grund })
 */
async function fuehreAuftragserzeugungUndRoutungDurch(workitem, zustand, erzeugeAuftrag) {
  try {
    const auftragAntwort = await erzeugeAuftrag()
    const auftragInhalt = await auftragAntwort.json().catch(() => ({}))
    if (!auftragAntwort.ok) {
      zustand.phase = 'fehler'
      zustand.meldung = `Auftrag konnte nicht angelegt werden: ${auftragAntwort.status} ${auftragInhalt.grund ?? ''}`.trim()
      if (pruefeUndUebernimmZustand(workitem, zustand)) renderBearbeitungsAbschnitt(workitem)
      return
    }
    zustand.auftragId = auftragInhalt.auftragId
    zustand.workflowId = `router-${auftragInhalt.auftragId}`
    zustand.phase = 'wird_geroutet'
    if (pruefeUndUebernimmZustand(workitem, zustand)) renderBearbeitungsAbschnitt(workitem)
    // F44 WS-1a (F-860): nach einem Projektwechsel den Auftrag des alten Projekts nicht über den
    // Präfix des neuen routen — die Kette endet hier; der Auftrag bleibt im alten Projekt liegen.
    if (zustand.projektId !== holeAktivesProjekt().id) return
    await verarbeiteRoutenAntwort(await routeAuftrag(auftragInhalt.auftragId), workitem, zustand)
  } catch (fehler) {
    zustand.phase = 'fehler'
    zustand.meldung = `Anfrage fehlgeschlagen: ${fehler.message}`
    if (pruefeUndUebernimmZustand(workitem, zustand)) renderBearbeitungsAbschnitt(workitem)
  }
}

/** Neues, leeres Bearbeitungszustand-Objekt für workitem (Muster beider Einstiegsknöpfe). @param workitem - das geklickte Workitem */
function baueLeerenBearbeitungsZustand(workitem) {
  return { workitemId: workitem.id, projektId: holeAktivesProjekt().id, phase: 'wird_angelegt', auftragId: null, laufId: null, workflowId: null, meldung: null, workflowDetail: null }
}

/** Klick auf "Bearbeiten": legt den Auftrag an (mit Referenzzeile, baueAuftragstext) und routet ihn sofort. @param workitem - das geklickte Finding */
async function starteBearbeitung(workitem) {
  const zustand = baueLeerenBearbeitungsZustand(workitem)
  bearbeitungsZustand = zustand
  renderBearbeitungsAbschnitt(workitem)
  await fuehreAuftragserzeugungUndRoutungDurch(workitem, zustand, () => legeAuftragAn({ titel: workitem.titel, auftragstext: baueAuftragstext(workitem) }))
}

/** Klick auf "Bauen" (F35 WS-1): leitet den Auftrag deterministisch aus der Feature-Akte ab (baueAuftragAusFeature) und routet ihn sofort. @param workitem - die geklickte Feature-Akte */
async function starteBauenFeature(workitem) {
  const zustand = baueLeerenBearbeitungsZustand(workitem)
  bearbeitungsZustand = zustand
  renderBearbeitungsAbschnitt(workitem)
  await fuehreAuftragserzeugungUndRoutungDurch(workitem, zustand, () => baueAuftragAusFeature(workitem.id))
}

/** Klick auf "Wiederholen" (409/D13 ODER ein generischer Fehler NACH bereits angelegtem Auftrag) — der Auftrag existiert bereits, es wird nur erneut geroutet, kein zweiter Auftrag angelegt. @param workitem - das Finding, dessen Bearbeitungszustand einen Konflikt/Fehler zeigt */
async function wiederholeRouten(workitem) {
  const zustand = bearbeitungsZustand
  if (zustand === null || zustand.workitemId !== workitem.id || zustand.auftragId === null) return
  zustand.phase = 'wird_geroutet'
  zustand.meldung = null
  renderBearbeitungsAbschnitt(workitem)
  try {
    await verarbeiteRoutenAntwort(await routeAuftrag(zustand.auftragId), workitem, zustand)
  } catch (fehler) {
    zustand.phase = 'fehler'
    zustand.meldung = `Anfrage fehlgeschlagen: ${fehler.message}`
    if (pruefeUndUebernimmZustand(workitem, zustand)) renderBearbeitungsAbschnitt(workitem)
  }
}

/** Standardbegründung für Freigaben über das Workboard — kein eigenes Eingabefeld (F-375, TECH_DEBT, YAGNI für dieses Fast-Prototype). */
const FREIGABE_BEGRUENDUNG_STANDARD = 'Freigabe über Workboard Click-to-Work'

/**
 * Klick auf "Freigeben" am Vorschlag — ruft sendeWorkflowFreigabe (Muster views/workflows.js
 * fuehreWorkflowAktionAus, Zeile ~673), NICHT starteWorkflowSchritt: der erste Schritt jedes
 * Router-Workflows trägt freigabe: 'ZWINGEND', starten ohne vorherige Freigabe scheitert real mit
 * 409/haltFreigabe (F-374). Die schrittId kommt aus zustand.workflowDetail.naechster.schrittId
 * (vom Detail-Auffrischer beim Übergang in Phase 'vorschlag' gefüllt) — derselbe Wert, den
 * workflows.js über naechster.schrittId ins data-schritt-id-Attribut schreibt. Die
 * freigabe-Antwort liefert bereits status: 'LAEUFT' (real geprüft, AK8-Re-Test), ein separater
 * starten-Aufruf danach entfällt. @param workitem - das Finding mit offenem Vorschlag
 */
async function freigebenBearbeitung(workitem) {
  const zustand = bearbeitungsZustand
  if (zustand === null || zustand.workitemId !== workitem.id) return
  const schrittId = zustand.workflowDetail?.naechster?.schrittId ?? null
  // F36 WS-3: die angezeigten wirdGenutzt-ids gehen mit („Anzeige = Start“, E-F36-4) — aus demselben
  // workflowDetail, das renderBearbeitungsInhalt eben angezeigt hat; ohne Anzeige kein Feld.
  const empfehlungIds = empfehlungIdsFuerFreigabe(zustand.workflowDetail?.empfehlung)
  zustand.phase = 'wird_gestartet'
  zustand.meldung = null
  renderBearbeitungsAbschnitt(workitem)
  try {
    const antwort = await sendeWorkflowFreigabe(zustand.workflowId, { schrittId, entscheidung: 'FREIGEGEBEN', begruendung: FREIGABE_BEGRUENDUNG_STANDARD, ...(empfehlungIds !== undefined ? { empfehlungIds } : {}) })
    const inhalt = await antwort.json().catch(() => ({}))
    if (antwort.status === 409 && inhalt.status === undefined && String(inhalt.grund ?? '').includes('Katalog-Empfehlung')) {
      // F36 WS-3: nur die VORPRÜFUNG der Freigabe (Antwort ohne status-Feld, nichts festgehalten) —
      // abweichende oder nicht ermittelbare Empfehlung. Der Vorschlag bleibt offen; der
      // Detail-Auffrischer lädt die neue Empfehlung (bzw. den Fehler, dann ohne ids), erneutes
      // Freigeben ist möglich. Ein 409 NACH festgehaltener Freigabe (status KLAERUNG_ERFORDERLICH)
      // geht in den Fehlerpfad.
      zustand.phase = 'vorschlag'
      zustand.meldung = `Freigabe nicht erteilt: ${inhalt.grund}`
    } else if (!antwort.ok) {
      zustand.phase = 'fehler'
      zustand.meldung = `Freigabe fehlgeschlagen: ${antwort.status} ${inhalt.grund ?? ''}`.trim()
    } else {
      zustand.phase = 'gestartet'
    }
  } catch (fehler) {
    zustand.phase = 'fehler'
    zustand.meldung = `Anfrage fehlgeschlagen: ${fehler.message}`
  }
  if (pruefeUndUebernimmZustand(workitem, zustand)) renderBearbeitungsAbschnitt(workitem)
  void pollJetzt()
}

/** Klick auf "Ablehnen" — kein API-Call (Nicht-Ziel: kein Entscheidungsartefakt fürs Ablehnen, F23/F-350), nur Anzeige. @param workitem - das Finding mit offenem Vorschlag */
function ablehnenBearbeitung(workitem) {
  if (bearbeitungsZustand === null) return
  bearbeitungsZustand.phase = 'verworfen'
  renderBearbeitungsAbschnitt(workitem)
}

/**
 * Detail-Auffrischer (F20 WS-2, kein eigener Timer): solange das offene Panel bearbeitet wird
 * ('routet'/'vorschlag'/'gestartet'), fragt GET /api/workflows/<workflowId> ab. 200 → Vorschlag
 * da (bzw. bei 'gestartet' Status-Nachtrag, 'abgeschlossen' bei ABGESCHLOSSEN). 404 während
 * 'routet' → prüft zustand.startfehler auf einen Eintrag zu GENAU diesem Lauf (laufId) — sonst
 * bliebe "routet…" bei einem fehlgeschlagenen Router-Lauf für immer stehen.
 */
async function aktualisiereBearbeitungsZustand() {
  const zustand = bearbeitungsZustand
  if (zustand === null || gewaehlteId !== zustand.workitemId) return
  if (zustand.phase !== 'routet' && zustand.phase !== 'vorschlag' && zustand.phase !== 'gestartet') return
  const workitem = findeWorkitem(zustand.workitemId)
  try {
    const antwort = await holeWorkflowDetail(zustand.workflowId)
    if (bearbeitungsZustand !== zustand || workitem === null) return
    if (antwort.ok) {
      const inhalt = await antwort.json()
      zustand.workflowDetail = inhalt
      if (zustand.phase === 'routet') zustand.phase = 'vorschlag'
      else if (zustand.phase === 'gestartet' && inhalt.daten?.status === 'ABGESCHLOSSEN') zustand.phase = 'abgeschlossen'
      if (istNochOffenesPanel(workitem)) renderBearbeitungsAbschnitt(workitem)
      return
    }
    if (zustand.phase === 'routet') {
      const fehlerEintrag = letzterZustand?.startfehler?.find((eintrag) => eintrag.laufId === zustand.laufId)
      if (fehlerEintrag !== undefined) {
        zustand.phase = 'fehler'
        zustand.meldung = fehlerEintrag.fehler
        if (istNochOffenesPanel(workitem)) renderBearbeitungsAbschnitt(workitem)
      }
    }
  } catch {
    // Netzwerkfehler beim Detail-Poll: der globale poll-fehler-Hinweis (zustand.js) zeigt das
    // bereits an — hier kein eigener Fehlerzustand, der nächste Tick versucht es erneut.
  }
}

/**
 * Rendert NUR den Inhalt des Detail-Panels (Workitem über findeWorkitem) — ohne das
 * Panel zu öffnen oder zu scrollen. Getrennt von ladeDetail(), damit
 * ladeListe() und ladeAlleWorkitems() das offene Panel still nachrendern können, sobald eine
 * Liste eintrifft (siehe dortigen Kommentar), ohne einen ungewollten zweiten
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
    document.getElementById('workboard-bearbeitung').innerHTML = ''
    return
  }
  inhalt.innerHTML = workitem.quelle === 'finding' ? renderFindingDetail(workitem) : renderFeatureDetail(workitem)
  renderBearbeitungsAbschnitt(workitem)
}

/** Öffnet das Detail-Panel für id (Routen-Eintritt `#/workboard/<id>`) — merkt sich id für den stillen Nachtrag aus ladeListe()/ladeAlleWorkitems() (siehe renderDetailInhalt). F22 WS-2: ein bearbeitungsZustand eines ANDEREN Workitems wird verworfen — nur ein Wiederöffnen DESSELBEN Findings behält seinen Fortschritt (siehe bearbeitungsZustand-Kommentar). */
function ladeDetail(id) {
  gewaehlteId = id
  if (bearbeitungsZustand !== null && bearbeitungsZustand.workitemId !== id) {
    bearbeitungsZustand = null
  }
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

/**
 * Klick-Delegation für Register, Ansicht-Chips, „+ x weitere“, „Erneut laden“, Filter-Chips,
 * Spaltenfilter, Suche und „Neu laden“. Ein Filter-Chip markiert innerhalb SEINER Gruppe genau
 * einen Chip als gewählt (Radio-Verhalten über aria-pressed) und lädt die Liste neu; die Suche
 * filtert nur clientseitig.
 */
function initFilterBedienung() {
  document.getElementById('workboard-tabs').addEventListener('click', (ereignis) => {
    const knopf = ereignis.target.closest('[data-tab]')
    if (knopf === null || knopf.dataset.tab === aktiverTab) return
    wechsleTab(knopf.dataset.tab)
    // renderKopf schreibt die Register neu — der Fokus bleibt auf dem gewählten.
    document.getElementById('workboard-tabs').querySelector(`[data-tab="${knopf.dataset.tab}"]`)?.focus()
  })
  document.getElementById('workboard-ansicht').addEventListener('click', (ereignis) => {
    const chip = ereignis.target.closest('[data-ansicht]')
    if (chip === null) return
    boardAnsicht = chip.dataset.ansicht
    for (const geschwister of chip.parentElement.querySelectorAll('[data-ansicht]')) geschwister.setAttribute('aria-pressed', String(geschwister === chip))
    renderBoard()
  })
  document.getElementById('workboard-board').addEventListener('click', (ereignis) => {
    // Karten über navigiere (Muster Listenzeilen): Nach „Schließen“ steht der Hash noch auf
    // #/workboard/<id>, ein reiner Link löste dann kein hashchange aus und das Detail bliebe zu.
    const karte = ereignis.target.closest('.board-item')
    if (karte !== null) {
      ereignis.preventDefault()
      navigiere(karte.getAttribute('href'))
      return
    }
    const weitere = ereignis.target.closest('[data-weitere-tab]')
    if (weitere !== null) {
      wechsleTab(weitere.dataset.weitereTab, weitere.dataset.weitereSpalte)
      document.getElementById('workboard-titel').focus()
      return
    }
    if (ereignis.target.closest('[data-workboard-erneut]') !== null) void ladeAlleWorkitems()
  })
  document.getElementById('workboard-filter').addEventListener('click', (ereignis) => {
    const chip = ereignis.target.closest('.filter-chip')
    if (chip === null) return
    for (const geschwister of chip.parentElement.querySelectorAll('.filter-chip')) {
      geschwister.setAttribute('aria-pressed', String(geschwister === chip))
    }
    void ladeListe()
  })
  document.getElementById('workboard-spaltenfilter').addEventListener('click', (ereignis) => {
    if (ereignis.target.closest('[data-spalte-entfernen]') === null) return
    listenSpalte = null
    renderSpaltenfilter()
    renderListe()
    document.getElementById('workboard-suche').focus()
  })
  document.getElementById('workboard-suche').addEventListener('input', (ereignis) => {
    suchText = ereignis.target.value
    renderListe()
  })
  document.getElementById('workboard-neu-laden').addEventListener('click', () => {
    ladeSeite()
  })
}

/** Klick- und Enter-Delegation für Listenzeilen (Navigation zu `#/workboard/<id>`) und das Schließen des Detail-Panels — Muster views/runs.js. */
function initListenBedienung() {
  const liste = document.getElementById('workboard-liste')
  liste.addEventListener('click', (ereignis) => {
    const zeile = ereignis.target.closest('.workboard-zeile')
    if (!zeile) return
    navigiere(`#/workboard/${encodeURIComponent(zeile.dataset.id)}`)
  })
  liste.addEventListener('keydown', (ereignis) => {
    if (ereignis.key !== 'Enter') return
    const zeile = ereignis.target.closest('.workboard-zeile')
    if (!zeile) return
    ereignis.preventDefault()
    navigiere(`#/workboard/${encodeURIComponent(zeile.dataset.id)}`)
  })
  document.getElementById('workboard-detail-schliessen').addEventListener('click', () => {
    schliesseDetail()
  })
}

/** Klick-Delegation für #workboard-bearbeitung (F22 WS-2): Bearbeiten/Wiederholen/Freigeben/Ablehnen — ein Container statt vier eigener Listener, Muster #workflow-bedienung in views/workflows.js. */
function initBearbeitungBedienung() {
  // F36 WS-5a: „Freigeben & installieren“ im Empfehlungsblock des Vorschlags; danach Detail neu laden.
  bindeEmpfehlungInstallation(document.getElementById('workboard-bearbeitung'), () => aktualisiereBearbeitungsZustand())
  document.getElementById('workboard-bearbeitung').addEventListener('click', (ereignis) => {
    const bearbeitenKnopf = ereignis.target.closest('#workboard-bearbeiten')
    if (bearbeitenKnopf) {
      const workitem = findeWorkitem(bearbeitenKnopf.dataset.id)
      if (workitem !== null) void starteBearbeitung(workitem)
      return
    }
    const bauenKnopf = ereignis.target.closest('#workboard-bauen')
    if (bauenKnopf) {
      const workitem = findeWorkitem(bauenKnopf.dataset.id)
      if (workitem !== null) void starteBauenFeature(workitem)
      return
    }
    const wiederholenKnopf = ereignis.target.closest('.wb-wiederholen')
    if (wiederholenKnopf) {
      const workitem = findeWorkitem(wiederholenKnopf.dataset.id)
      if (workitem !== null) void wiederholeRouten(workitem)
      return
    }
    const freigebenKnopf = ereignis.target.closest('.wb-freigeben')
    if (freigebenKnopf) {
      const workitem = findeWorkitem(freigebenKnopf.dataset.id)
      if (workitem !== null) void freigebenBearbeitung(workitem)
      return
    }
    const ablehnenKnopf = ereignis.target.closest('.wb-ablehnen')
    if (ablehnenKnopf) {
      const workitem = findeWorkitem(ablehnenKnopf.dataset.id)
      if (workitem !== null) ablehnenBearbeitung(workitem)
    }
  })
}

/**
 * Initialisiert die Seite „Entwicklung“ einmalig beim Bootstrap: feste Bedienelemente, Register,
 * eigene Routen (Muster views/runs.js — app.js registriert #/workboard NICHT zentral), Poll-Abo
 * (Workflows fürs Board, startfehler für Click-to-Work) und Detail-Auffrischer — beide VOR
 * initZustandPoll() in app.js registriert. Geladen wird beim Betreten (betreteSeite), bei „Neu
 * laden“ und beim Projektwechsel, nie aus dem Poll.
 */
export function initWorkboardView() {
  baueFesteBedienung()
  renderKopf()
  renderSpaltenfilter()
  renderBoard()
  initFilterBedienung()
  initListenBedienung()
  initBearbeitungBedienung()

  registriere(/^#\/workboard$/, 'workboard', () => {
    schliesseDetail()
    betreteSeite()
  })
  registriere(/^#\/workboard\/([^/]+)$/, 'workboard', (id) => {
    betreteSeite()
    ladeDetail(id)
  })
  // Verlassen der Seite: das nächste Betreten lädt neu. Maßgeblich ist, ob die Seite nach dem
  // Routing noch sichtbar ist (setTimeout: erst nachdem der Router dispatcht hat) — eine
  // überlagerte Route wie #/chat lässt sie sichtbar und das Board aktuell; ein Wechsel Board ↔
  // Detail bleibt ohne erneuten Abruf.
  window.addEventListener('hashchange', () => {
    setTimeout(() => {
      if (document.getElementById('view-workboard').hidden) seiteAktiv = false
    }, 0)
  })

  abonniere((zustand) => {
    letzterZustand = zustand
    if (!seiteAktiv) return
    // Nur der sichtbare Bereich; der andere wird beim Registerwechsel ohnehin gebaut.
    if (aktiverTab === 'board') renderBoard()
    else renderListe()
  })
  abonniereDetailAuffrischer(() => {
    void aktualisiereBearbeitungsZustand()
  })

  // F44 WS-1a (F-860): beim Projektwechsel allen projektgebundenen Zustand verwerfen und neu laden.
  // Register, Filter und Suche gehen auf den Anfang zurück (die Optionen stammen aus dem alten
  // Projekt). Ein offenes Detail samt Click-to-Work-Zustand gehört zum alten Projekt und wird
  // geschlossen — sonst fragte der Detail-Auffrischer dessen workflowId über den neuen Präfix ab
  // (Fehlerklasse F26 im Chat). Späte Antworten des alten Projekts verwirft der Überholschutz.
  abonniereProjektWechsel(ladeNachProjektWechsel)
}

/** F44 WS-1a (F-860): Neuladen-Hook der Seite beim Projektwechsel (siehe initWorkboardView). */
function ladeNachProjektWechsel() {
  schliesseDetail()
  bearbeitungsZustand = null
  document.getElementById('workboard-bearbeitung').innerHTML = ''
  letzterZustand = undefined
  letzteWorkitems = []
  renderBefunde(null)
  wechsleTab('board')
  ladeSeite()
}
