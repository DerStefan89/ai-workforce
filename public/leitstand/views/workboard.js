/**
 * Datei: public/leitstand/views/workboard.js
 *
 * Zweck: Seite „Entwicklung“ `#/workboard` (F44 WS-3a, Vorlage V10 d_arbeit_board.png,
 * d_arbeit_features.png; Abgleich F-725 E1–E7) samt Detail `#/workboard/<id>` (F21 WS-2) und
 * Click-to-Work (F22 WS-2, F35 WS-1 „Bauen“). Kopf „Arbeit im Überblick“ mit „Eintrag erfassen“
 * als „kommt“ (E7). F46 D4 (abgleich-f46.md §2): Reiterzeile Kanban-Board · Features · Bugs · Harness
 * Improvements · Tech Debt & Prozess (Schlüssel 'weitere': TECH_DEBT und PROCESS_IMPROVEMENT) sowie
 * Aufträge (#/runs) und Code (#/code) als Links, gebaut von entwicklung-reiter.js; der frühere Reiter
 * „Ausführungen“ entfällt (#/ausfuehrungen bleibt über #/runs und die Seitenleiste erreichbar, F-964).
 * „Tech Debt & Prozess“ zeigt nach Bild 06-TechDebt Art-Karten mit Anzahl als Filter, Chips Art ·
 * Priorität · Status und eine Tabelle Art · ID · Titel · Priorität · Eingeplant (= Maßnahme, gekürzt).
 *
 * - Kanban-Board (E1): Spalten Geplant · In Arbeit · Braucht dich · Abgenommen nach der Regel in
 *   entwicklung-daten.js (baueBoard), höchstens 12 Karten je Spalte, „Alle x anzeigen“ springt in den
 *   passenden Listen-Tab mit Spaltenfilter (F-919). Eine Karte mit verknüpftem Ablauf zeigt dessen
 *   Phase aus dem Aggregat (F-921, kein Zusatzabruf). „Kanban · Priorität“ (E2) und „Zeitleiste“ (E3) sind
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
 * Detail (F44 WS-3b, Vorlage d_arbeit_f35, E8/E13): `#/workboard/<id>` ist eine ganze Seite — Board
 * und Listen sind ausgeblendet, „← <Register>“ führt zum zuletzt aktiven Register zurück. Das
 * Workitem kommt aus der zuletzt geladenen Liste des Listen-Tabs bzw. der ungefilterten Liste des
 * Boards (F21 AK5); bis diese da ist, zeigt das Detail einen Ladezustand (F-921). Die Abschnitte
 * rendert views/workboard-detail.js (F46 D3: Kopf, Kurz gesagt, Status-Block, Jetzt-Band, Inhalt und
 * rechte Spalte nach den Bildern 07-Main/07-Bug; Reiter „Das Was“ und Rollen-Kreis als Register).
 * Nachgeladen wird beim Öffnen des Details (detailNachtrag): bei Features die Akte (holeFeatureAkte)
 * und die Roadmap (Meilenstein), für den verknüpften Ablauf dessen Schritte (holeWorkflowDetail) und
 * die Abnahme-Projektion (holeAbnahme: Urteile je AK, Prüfergebnis, Entscheidung). Ob die Abnahme
 * offen ist („Ergebnis prüfen“), steht im Kopfdatum abnahme.offen aus dem Poll (F46 D2). Ist
 * die Verknüpfung beim Öffnen noch nicht bestimmbar (Deep-Link vor dem ersten Poll-Tick bzw. vor den
 * Aufträgen), lädt der erste Tick, der sie bestimmbar macht. Danach lädt ein Tick die Schritte nur
 * bei einem Übergang: ein anderer Ablauf wird maßgeblich (etwa nach „Auftrag vorbereiten“ — dann
 * lädt die Seite auch die Aufträge einmal neu) oder der maßgebliche wechselt seine Phase. Ein Tick
 * ohne Übergang rendert nur.
 *
 * Click-to-Work (E9–E12): „Auftrag vorbereiten“ an einem Finding bzw. an einer baubaren
 * Feature-Akte legt einen Auftrag mit der Referenzzeile `workitem:<quelle>:<id>` an und routet ihn
 * sofort (legeAuftragAn/baueAuftragAusFeature, routeAuftrag); Verhalten, Phasen und Freigabe sind
 * unverändert seit F22/F35/F36, Texte über i18n. Der Fortschritt rendert in
 * #workboard-bearbeitung, getrennt von #workboard-detail-inhalt, damit ein stilles Nachrendern den
 * Bearbeitungszustand nicht mitreißt; der Detail-Auffrischer hängt am einen Poll-Timer aus
 * zustand.js. F36 WS-3/WS-5a: Katalog-Empfehlung im Vorschlag, „Freigeben“ schickt die angezeigten
 * wirdGenutzt-ids mit, „Freigeben & installieren“ (empfehlung-installation.js). F-922: Der
 * Einstieg ist gesperrt (disabled, aria-disabled, Hinweis, „Ablauf öffnen“), solange ein
 * verknüpfter Workflow nicht terminal ist oder eine Abnahme offen ist (auftragsSperre).
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
 * - Projektinhalte (Titel, IDs, Statuswerte, Parser-Meldungen, Akten- und Servertexte) werden nicht
 *   übersetzt und immer escaped; alle übrigen Texte über t() (tx = escapt). Die feste Begründung der
 *   Freigabe (F-375) ist Serverinhalt und bleibt deutsch.
 * - Kein schreibender Request außer über die api.js-Bausteine von Click-to-Work (Gate f21-ws2 (f)).
 */

import { baueAuftragAusFeature, holeAbnahme, holeAuftraege, holeFeatureAkte, holeRoadmap, holeWorkflowDetail, holeWorkitems, legeAuftragAn, routeAuftrag, sendeWorkflowFreigabe } from '../api.js'
import { kopiereBefehlsblock, renderBefehlsblock } from '../befehlsblock.js'
import { sicherBefehle } from '../code-daten.js'
import { abonniereCodeStand, aktuellerCodeStand, ladeCodeStand } from '../code-stand.js'
import { kuerzeText } from '../eintrag-bausteine.js'
import { ENTWICKLUNG_REGISTER, entwicklungsReiterHtml } from '../entwicklung-reiter.js'
import { baueVsCodeLink, pruefeGithubUrl } from '../kopf-werkzeuge.js'
import { typChip } from '../typ-chip.js'
import { empfehlungIdsFuerFreigabe, renderEmpfehlung, renderInstallierbarHinweis } from '../empfehlung-anzeige.js'
import { bindeEmpfehlungInstallation } from '../empfehlung-installation.js'
import { oeffneChatMitEntwurf } from '../chat-dock.js'
import { baueBoard, baueVerknuepfung, LISTEN_TABS, laufenderWorkflow, SPALTEN, spalteVon, sucheWorkitems, verknuepfterWorkflow, workflowPhase } from '../entwicklung-daten.js'
import { naechsterRegisterIndex } from '../faehigkeiten-anzeige.js'
import { formatiereZahl, t, tHtml } from '../i18n.js'
import { kommtBadge, kommtKnopf } from '../kommt.js'
import { escapeHtml, formatiereUhrzeit } from '../render.js'
import { abonniereProjektWechsel, holeAktivesProjekt, projektAusListe } from '../projekt-kontext.js'
import { rollenName } from '../rollen-anzeige.js'
import { naechsteKreisRolle } from '../rollen-kreis.js'
import { ersetzeRoute, navigiere, registriere } from '../router.js'
import { abonniere, abonniereDetailAuffrischer, pollJetzt } from '../zustand.js'
import {
  DETAIL_KREIS_PRAEFIX,
  FEATURE_ENDSTATUS,
  detailEyebrowHtml,
  detailInhaltHtml,
  detailJetzt,
  detailKopfZusatzHtml,
  detailKurzHtml,
  detailSpalteHtml,
  detailStatusBlockHtml,
  istBug,
  jarvisEntwurf,
  kartenStatus,
  phaseHtml,
  statusKategorie,
  titelVon,
  typBezeichnung,
  WAS_REITER,
} from './workboard-detail.js'

/** Register der Seite: das Board und die vier Listen-Tabs (LISTEN_TABS) — eine Quelle mit #/code (entwicklung-reiter.js). */
const TABS = ENTWICKLUNG_REGISTER

/** F46 D4: Typen des Registers „Tech Debt & Prozess“ (Schlüssel 'weitere') in Kartenreihenfolge. */
const TECHDEBT_TYPEN = LISTEN_TABS.weitere

/** F46 D4: Filter des Registers „Tech Debt & Prozess“ — Art ('' = alle), Priorität ('' = alle), Status ('OFFEN' oder '' = alle). */
let tdArt = ''
let tdPrio = ''
let tdStatus = 'OFFEN'

/** Zuletzt geschriebenes HTML der Karten und Chips von „Tech Debt & Prozess“ (Fokus bleibt beim Poll). */
let letztesTechDebtKopfHtml = ''

/** F46 D4: workflowId, für den der Code-Stand nach dem Abschluss schon neu geladen wurde (einmal je Ablauf). */
let codeStandNachAblauf = null

/** Ansicht-Chips des Boards: alle Spalten oder genau eine. */
const ANSICHTEN = ['alle', ...SPALTEN]

/** Symbol je Workitem-Typ (Vorlage: ◇ Feature, ! Bug, ↻ Harness Improvement), sonst ein Punkt. */
const TYP_SYMBOL = { FEATURE: '◇', BUG: '!', HARNESS_IMPROVEMENT: '↻' }

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

/** id des aktuell offenen Details, oder null — erlaubt einen stillen Inhalts-Refresh, sobald eine Liste nachträglich eintrifft. */
let gewaehlteId = null

/** F-926 (F44 WS-4b, Muster views/workflows.js): true, solange seit dem letzten Betreten von `#/workboard` keine andere Route kam — öffnet der Nutzer dann ein Detail, war der vorige History-Eintrag die Übersicht. */
let uebersichtZuletzt = false

/** true, wenn das offene Detail direkt aus der Übersicht geöffnet wurde: „← <Register>“ geht dann per history.back() zurück statt einen neuen Eintrag anzulegen. */
let detailAusUebersicht = false

/**
 * Nachtrag des offenen Details (F44 WS-3b), geladen beim Öffnen und bei Übergängen des verknüpften
 * Ablaufs — nie periodisch aus dem Poll (pruefeDetailNachtrag): { id, projektId, akteGestartet,
 * akte, roadmap (je undefined = lädt, nur Features), workflowBestimmt (false = Verknüpfung noch
 * nicht bestimmbar), workflowKennung (`<workflowId>|<Phase>` der letzten Ladung), verknuepfungFehlt
 * (Workflows oder Aufträge nicht verfügbar), workflowId (null = kein verknüpfter Ablauf),
 * workflowEintrag, schritte (undefined = lädt, null = nicht ladbar), abnahme (F46 D3: Antwort von
 * GET …/abnahme für Urteile je AK, Prüfergebnis und Entscheidung — undefined = lädt, null = nicht
 * ladbar), ablaufLadung (Zähler gegen überholte Ablauf-Antworten), wasReiter und kreisAuswahl
 * (Bedienzustand der Register „Das Was“ und Rollen-Kreis, null = Vorauswahl) }, oder null ohne
 * offenes Detail. Ob die Abnahme offen ist, steht im Kopfdatum abnahme.offen des Workflows (Poll).
 * Jedes Öffnen legt ein neues Objekt an; eine Antwort für ein älteres Objekt wird verworfen
 * (Überholschutz über die Identität, auch beim Projektwechsel).
 */
let detailNachtrag = null

/** Zuletzt geschriebenes HTML je Bereich des Details (Element-id → HTML) — ein Poll-Tick schreibt nur bei geändertem Inhalt (aufgeklappte Abschnitte und Fokus bleiben). */
const letztesDetailHtml = new Map()

/** Überholschutz (Muster views/workflows.js workflowRenderZaehler): je Abrufart verwirft eine spätere Anfrage die Antwort einer früheren. */
let anfrageZaehler = 0
let alleAnfrageZaehler = 0
let auftraegeAnfrageZaehler = 0

/** Aktives Register: 'board' oder ein Schlüssel aus LISTEN_TABS. */
let aktiverTab = 'board'

/** Gewählter Ansicht-Chip des Boards. */
let boardAnsicht = 'alle'

/** Spaltenfilter eines Listen-Tabs nach „Alle x anzeigen“ (eine Spalte aus SPALTEN), oder null. */
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
 * Lesbare Meldung eines geworfenen Werts (Error oder etwas anderes).
 * @param fehler - gefangener Wert
 * @returns Meldungstext
 */
function meldungVon(fehler) {
  return fehler instanceof Error ? fehler.message : String(fehler)
}

/**
 * Übersetzte Typbezeichnung als HTML (typBezeichnung aus views/workboard-detail.js, escaped).
 * @param typ - workitem.typ
 * @returns HTML
 */
function typText(typ) {
  return escapeHtml(typBezeichnung(typ))
}

/**
 * Eine Listenzeile (Vorlage d_arbeit_features: Symbol, Titel, Typ · Priorität, Status).
 * @param workitem - ein Workitem
 * @returns HTML
 */
function workitemZeile(workitem) {
  const prioritaet = workitem.quelle === 'finding' ? ` · ${escapeHtml(workitem.prioritaet)}` : ''
  const titel = titelVon(workitem)
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
  container.innerHTML = `<div class="note red"><strong>${tHtml('entwicklung.befunde.titel', { anzahl: befunde.length, zahl: formatiereZahl(befunde.length) })}</strong><p>${befunde.map((b) => escapeHtml(b.meldung)).join('; ')}</p></div>`
}

// ─── Kopf und Register ───────────────────────────────────────────────────────

/** Rendert Titel, Einleitung und Register des aktiven Tabs; „Eintrag erfassen“ (E7) steht fest im Kopf. */
function renderKopf() {
  document.getElementById('workboard-titel').textContent = t(`entwicklung.tab.${aktiverTab}.titel`)
  document.getElementById('workboard-beschreibung').textContent = t(`entwicklung.tab.${aktiverTab}.beschreibung`)
  // F46 D4: Reiterzeile nach §2 (entwicklung-reiter.js) — „Aufträge“ → #/runs, „Code“ → #/code.
  document.getElementById('workboard-tabs').innerHTML = entwicklungsReiterHtml(aktiverTab)
  document.getElementById('workboard-board-bereich').hidden = aktiverTab !== 'board'
  document.getElementById('workboard-listen-bereich').hidden = aktiverTab === 'board'
  // „Tech Debt & Prozess“ filtert über Karten und Chips (06-TechDebt) statt über die Chip-Gruppen.
  document.getElementById('workboard-filter').hidden = aktiverTab === 'weitere'
  document.getElementById('workboard-techdebt-kopf').hidden = aktiverTab !== 'weitere'
  document.getElementById('workboard-liste').classList.toggle('techdebt-liste', aktiverTab === 'weitere')
}

/** Baut einmalig die festen Bedienelemente: „Eintrag erfassen“ (kommt), Board-Modi (E2/E3 kommt), Ansicht-Chips und „Alle“-Chips der Filter. */
function baueFesteBedienung() {
  document.getElementById('workboard-erfassen').innerHTML = kommtKnopf(t('entwicklung.eintragErfassen'), { primaer: true, symbol: '+' })
  document.getElementById('workboard-modi').innerHTML = `<button type="button" class="view-switch-knopf active" aria-pressed="true">${tHtml('entwicklung.modus.status')}</button>
    <button type="button" class="view-switch-knopf" aria-disabled="true">${tHtml('entwicklung.modus.prioritaet')} ${kommtBadge()}</button>
    <button type="button" class="view-switch-knopf" aria-disabled="true">${tHtml('entwicklung.modus.zeitleiste')} ${kommtBadge()}</button>`
  document.getElementById('workboard-ansicht').innerHTML = `<span>${tHtml('entwicklung.ansicht')}</span>${ANSICHTEN.map(
    (ansicht) => `<button type="button" class="board-filter-chip" data-ansicht="${ansicht}" aria-pressed="${ansicht === boardAnsicht}">${tHtml(`entwicklung.ansicht.${ansicht}`)}</button>`
  ).join('')}`
  for (const id of ['workboard-filter-typ', 'workboard-filter-status', 'workboard-filter-prioritaet']) fuelleChipGruppe(id, [])
}

// ─── Board (E1) ──────────────────────────────────────────────────────────────

/**
 * Eine Karte: Typ, Priorität (nur Findings), Titel, Phase bzw. Status, ID — Link ins Detail. Mit
 * verknüpftem Ablauf zeigt die Karte dessen Phase aus dem Aggregat (F-921, workflowPhase), sonst
 * den Status des Eintrags; kein x/y (die Schritte stehen erst im Detail).
 * @param workitem - ein Workitem
 * @param verknuepfung - board.verknuepfung (baueVerknuepfung)
 * @returns HTML
 */
function boardKarte(workitem, verknuepfung) {
  const symbol = TYP_SYMBOL[workitem.typ] ?? '·'
  const prioritaet = workitem.quelle === 'finding' ? `<span>${escapeHtml(workitem.prioritaet)}</span>` : ''
  const workflow = verknuepfterWorkflow(workitem, verknuepfung)
  return `<a class="board-item" href="#/workboard/${encodeURIComponent(workitem.id)}" data-id="${escapeHtml(workitem.id)}">
      <span class="board-item-meta"><span><span aria-hidden="true">${escapeHtml(symbol)}</span> ${typText(workitem.typ)}</span>${prioritaet}</span>
      <span class="board-item-titel">${escapeHtml(titelVon(workitem))}</span>
      <span class="board-phase">${workflow === null ? kartenStatus(workitem) : phaseHtml(workflow)}</span>
      <span class="board-owner"><code>${escapeHtml(workitem.id)}</code></span>
    </a>`
}

/**
 * „Alle x anzeigen“ einer Spalte mit mehr Karten als KARTEN_JE_SPALTE (F-919): springt in den
 * Listen-Tab mit Spaltenfilter, der die ganze Spalte zeigt — x ist deshalb die Zahl aller Einträge
 * der Spalte in diesem Tab, nicht nur der verborgenen. Verteilt sich die Spalte auf mehrere Tabs,
 * je Tab ein Sprung; Workitems ohne Tab (unbekannter Typ) zählen nur in der Spaltenzahl.
 * @param spalte - Spaltenschlüssel
 * @param daten - Spalte aus baueBoard
 * @returns HTML
 */
function weitereZeile(spalte, daten) {
  if (daten.weitere === 0 || daten.jeTab.length === 0) return ''
  const sprung = (tab, inhalt) => `<button type="button" class="board-weitere" data-weitere-tab="${tab}" data-weitere-spalte="${spalte}">${inhalt}</button>`
  if (daten.jeTab.length === 1) return `<p class="board-weitere-zeile">${sprung(daten.jeTab[0].tab, tHtml('entwicklung.alleAnzeigen', { zahl: formatiereZahl(daten.jeTab[0].anzahl) }))}</p>`
  const spruenge = daten.jeTab.map(({ tab, anzahl }) => sprung(tab, `${tHtml(`entwicklung.tab.${tab}`)} ${escapeHtml(formatiereZahl(anzahl))}`)).join('')
  return `<p class="board-weitere-zeile"><span>${tHtml('entwicklung.alleAnzeigen.label')}</span>${spruenge}</p>`
}

/**
 * Eine Spalte mit Titel, Zahl, Karten, Leerzustand und „Alle x anzeigen“.
 * Fehlt der Ausführungsstand (Workflows oder Aufträge lädt bzw. nicht verfügbar), behaupten die
 * Spalten „In Arbeit“ und „Braucht dich“ im Leerzustand nichts, was sie nicht wissen können.
 * @param spalte - Spaltenschlüssel
 * @param daten - Spalte aus baueBoard
 * @param unvollstaendig - true, solange die Verknüpfung zu den Workflows fehlt
 * @param verknuepfung - board.verknuepfung (Phase der Karten)
 * @returns HTML
 */
function boardSpalte(spalte, daten, unvollstaendig, verknuepfung) {
  const leerSchluessel = unvollstaendig && (spalte === 'in_arbeit' || spalte === 'braucht_dich') ? 'entwicklung.spalte.leer.unvollstaendig' : `entwicklung.spalte.${spalte}.leer`
  const inhalt = daten.karten.length === 0 ? `<p class="board-empty">${tHtml(leerSchluessel)}</p>` : daten.karten.map((workitem) => boardKarte(workitem, verknuepfung)).join('')
  return `<section class="board-column board-spalte-${spalte}" aria-labelledby="workboard-spalte-${spalte}">
      <div class="board-column-title"><h2 id="workboard-spalte-${spalte}">${tHtml(`entwicklung.spalte.${spalte}`)}</h2><span>${escapeHtml(formatiereZahl(daten.anzahl))}</span></div>
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
    return `<div class="note amber"><strong>${tHtml('entwicklung.verknuepfung.titel')}</strong><p>${tHtml('entwicklung.verknuepfung.text', { quellen })}</p></div>`
  }
  return board.laedt.length > 0 ? `<p class="subtle board-verknuepfung-laedt">${tHtml('entwicklung.verknuepfung.laedt')}</p>` : ''
}

/** HTML des Board-Inhalts je Zustand (lädt, Fehler, Quelle defekt, Spalten). @returns HTML */
function boardHtml() {
  if (alleFehler !== null) {
    return `<div class="note red"><strong>${tHtml('entwicklung.fehler.titel')}</strong><p><code>${escapeHtml(alleFehler)}</code></p><button type="button" class="button" data-workboard-erneut>${tHtml('entwicklung.fehler.erneut')}</button></div>`
  }
  if (alleWorkitems === undefined) return `<p class="subtle">${tHtml('entwicklung.laedt')}</p>`
  const board = baueBoard(alleWorkitems, letzterZustand?.workflows, auftraege)
  if (board === null) return `<div class="note red"><strong>${tHtml('entwicklung.nichtVerfuegbar')}</strong></div>`
  const spalten = SPALTEN.filter((spalte) => boardAnsicht === 'alle' || boardAnsicht === spalte)
  const ausserhalb = board.ausserhalb > 0 ? `<p class="subtle board-ausserhalb">${tHtml('entwicklung.ausserhalb', { anzahl: board.ausserhalb, zahl: formatiereZahl(board.ausserhalb) })}</p>` : ''
  const unvollstaendig = board.fehlend.length > 0 || board.laedt.length > 0
  return `${verknuepfungsHinweis(board)}<div class="pm-board${boardAnsicht === 'alle' ? '' : ' filtered-board'}">${spalten.map((spalte) => boardSpalte(spalte, board.spalten[spalte], unvollstaendig, board.verknuepfung)).join('')}</div>${ausserhalb}`
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
    `<button type="button" class="filter-chip" data-wert="" aria-pressed="${neuerWert === '' ? 'true' : 'false'}">${tHtml('entwicklung.filter.alle')}</button>` +
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

/** Der entfernbare Spaltenfilter-Chip nach „Alle x anzeigen“. */
function renderSpaltenfilter() {
  const container = document.getElementById('workboard-spaltenfilter')
  container.innerHTML =
    listenSpalte === null
      ? ''
      : `<button type="button" class="filter-chip" data-spalte-entfernen aria-pressed="true" aria-label="${tHtml('entwicklung.spaltenfilter.entfernen', { spalte: t(`entwicklung.spalte.${listenSpalte}`) })}">${tHtml('entwicklung.spaltenfilter', { spalte: t(`entwicklung.spalte.${listenSpalte}`) })} <span aria-hidden="true">×</span></button>`
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
  let html
  if (aktiverTab === 'weitere') {
    // F46 D4 (06-TechDebt): Karten und Chips über der Tabelle; gefiltert wird clientseitig.
    const gezeigt = techDebtGefiltert(liste)
    renderTechDebtKopf(liste, gezeigt.length)
    html = gezeigt.length === 0 ? `<p class="leer">${tHtml(liste.length === 0 ? leer : 'techdebt.keineTreffer')}</p>` : techDebtTabelleHtml(gezeigt)
  } else {
    html = liste.length === 0 ? `<p class="leer">${tHtml(leer)}</p>` : liste.map(workitemZeile).join('')
  }
  if (html === letztesListenHtml) return
  letztesListenHtml = html
  document.getElementById('workboard-liste').innerHTML = html
}

// ─── Tech Debt & Prozess (F46 D4, Bild 06-entwicklung-code--TechDebt, abgleich-f46.md §4.13) ───

/**
 * Wendet die Filter Art, Priorität und Status des Registers an.
 * @param liste - Workitems des Registers (nach Spaltenfilter und Suche)
 * @returns gefilterte Liste
 */
function techDebtGefiltert(liste) {
  return liste.filter((w) => (tdArt === '' || w.typ === tdArt) && (tdPrio === '' || w.prioritaet === tdPrio) && (tdStatus === '' || w.status === tdStatus))
}

/**
 * Art-Chip einer Zeile bzw. Karte: „Technische Schuld“ / „Prozess-Schuld“, Farbe nur über Tokens.
 * @param typ - TECH_DEBT | PROCESS_IMPROVEMENT
 * @returns HTML
 */
function techDebtChip(typ) {
  return `<span class="techdebt-chip" data-art="${typ === 'TECH_DEBT' ? 'technik' : 'prozess'}">${tHtml(`techdebt.art.${typ}`)}</span>`
}

/**
 * Karten je Art (Anzahl im gewählten Status, als Filter), Chips Art · Priorität · Status und die Zeile
 * „x von y“. Schreibt nur bei geändertem HTML (Fokus bleibt).
 * @param liste - Workitems des Registers (nach Spaltenfilter und Suche)
 * @param gezeigt - Zahl der Zeilen nach allen Filtern
 */
function renderTechDebtKopf(liste, gezeigt) {
  const imStatus = liste.filter((w) => tdStatus === '' || w.status === tdStatus)
  const einheit = tdStatus === 'OFFEN' ? 'techdebt.offen' : 'techdebt.eintraege'
  const karte = (typ) => {
    const anzahl = imStatus.filter((w) => w.typ === typ).length
    return `<button type="button" class="techdebt-karte" data-td-art="${typ}" aria-pressed="${tdArt === typ}">
        <span class="techdebt-karte-kopf">${techDebtChip(typ)}<span class="techdebt-karte-englisch" lang="en">${tHtml(`techdebt.art.${typ}.englisch`)}</span><span class="techdebt-karte-zahl"><strong>${escapeHtml(formatiereZahl(anzahl))}</strong> ${tHtml(einheit)}</span></span>
        <span class="techdebt-karte-titel">${tHtml(`techdebt.art.${typ}.titel`)}</span>
        <span class="techdebt-karte-text">${tHtml(`techdebt.art.${typ}.text`)}</span>
      </button>`
  }
  const chip = (art, wert, an, text) => `<button type="button" class="filter-chip" data-${art}="${escapeHtml(wert)}" aria-pressed="${an}">${text}</button>`
  // Prioritäten aus den vorkommenden Werten; eine gewählte bleibt sichtbar, auch wenn die Suche sie ausblendet (Prüfpass qa 11).
  const prios = [...new Set([...liste.map((w) => w.prioritaet), tdPrio].filter((p) => typeof p === 'string' && p !== ''))].sort()
  const html = `<div class="techdebt-karten">${TECHDEBT_TYPEN.map(karte).join('')}</div>
    <div class="techdebt-filter">
      <div class="techdebt-chips" role="group" aria-label="${tHtml('techdebt.filter.art')}">${chip('td-art', '', tdArt === '', tHtml('entwicklung.filter.alle'))}${TECHDEBT_TYPEN.map((typ) => chip('td-art', typ, tdArt === typ, tHtml(`techdebt.art.${typ}`))).join('')}</div>
      <div class="techdebt-chips" role="group" aria-label="${tHtml('entwicklung.filter.prioritaet')}">${prios.map((p) => chip('td-prio', p, tdPrio === p, escapeHtml(p))).join('')}</div>
      <div class="techdebt-chips" role="group" aria-label="${tHtml('entwicklung.filter.status')}">${chip('td-status', 'OFFEN', tdStatus === 'OFFEN', tHtml('techdebt.status.offen'))}${chip('td-status', '', tdStatus === '', tHtml('techdebt.status.alle'))}</div>
      <p class="techdebt-auszug">${tHtml(tdStatus === 'OFFEN' ? 'techdebt.auszugOffen' : 'techdebt.auszug', { zahl: formatiereZahl(gezeigt), gesamt: formatiereZahl(imStatus.length) })}</p>
    </div>`
  if (html === letztesTechDebtKopfHtml) return
  letztesTechDebtKopfHtml = html
  const container = document.getElementById('workboard-techdebt-kopf')
  // Der Fokus bleibt auf demselben Chip bzw. derselben Karte (gleiches Attribut, gleicher Wert).
  const fokus = document.activeElement !== null && container.contains(document.activeElement) ? document.activeElement : null
  const attribut = fokus === null ? undefined : ['data-td-art', 'data-td-prio', 'data-td-status'].find((a) => fokus.hasAttribute(a))
  const wert = attribut === undefined ? null : fokus.getAttribute(attribut)
  const istKarte = fokus?.classList.contains('techdebt-karte') ?? false
  container.innerHTML = html
  if (attribut !== undefined) [...container.querySelectorAll(`[${attribut}]`)].find((el) => el.getAttribute(attribut) === wert && el.classList.contains('techdebt-karte') === istKarte)?.focus()
}

/**
 * Tabelle Art · ID · Titel · Priorität · Eingeplant · Öffnen. „Eingeplant“ ist die Maßnahme des
 * Registers, gekürzt (Bauauftrag D3, abgleich-f46.md §4.8; das strukturierte Feld bleibt K, §5).
 * @param liste - gefilterte Workitems
 * @returns HTML
 */
function techDebtTabelleHtml(liste) {
  const zeile = (w) => {
    const id = escapeHtml(w.id)
    const href = `#/workboard/${encodeURIComponent(w.id)}`
    return `<tr class="techdebt-zeile" data-id="${id}">
        <td data-label="${tHtml('techdebt.spalte.art')}">${techDebtChip(w.typ)}</td>
        <td data-label="${tHtml('techdebt.spalte.id')}"><code>${id}</code></td>
        <td class="techdebt-titel">${escapeHtml(titelVon(w))}</td>
        <td data-label="${tHtml('techdebt.spalte.prio')}">${escapeHtml(w.prioritaet ?? '–')}</td>
        <td class="techdebt-eingeplant" data-label="${tHtml('techdebt.spalte.eingeplant')}">${escapeHtml(kuerzeText(w.massnahme, 70) ?? '–')}</td>
        <td class="techdebt-aktion"><a class="text-link techdebt-oeffnen" href="${href}" data-id="${id}">${tHtml('techdebt.oeffnen')}<span class="sr-only"> ${id}</span></a></td>
      </tr>`
  }
  return `<div class="techdebt-tabelle-rahmen" role="region" tabindex="0" aria-label="${tHtml('entwicklung.tab.weitere')}"><table class="techdebt-tabelle">
      <thead><tr><th scope="col">${tHtml('techdebt.spalte.art')}</th><th scope="col">${tHtml('techdebt.spalte.id')}</th><th scope="col">${tHtml('techdebt.spalte.titel')}</th><th scope="col">${tHtml('techdebt.spalte.prio')}</th><th scope="col" title="${tHtml('techdebt.spalte.eingeplantTitel')}">${tHtml('techdebt.spalte.eingeplant')}<span class="sr-only"> (${tHtml('techdebt.spalte.eingeplantTitel')})</span></th><th scope="col"><span class="sr-only">${tHtml('techdebt.oeffnen')}</span></th></tr></thead>
      <tbody>${liste.map(zeile).join('')}</tbody>
    </table></div>`
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
  setzeListe(`<p class="leer">${tHtml('entwicklung.laedt')}</p>`)
  const filter = aktuelleFilter()
  try {
    const antwort = await holeWorkitems(filter)
    if (meineAnfrageNummer !== anfrageZaehler) return
    renderBefunde(antwort.befunde)
    if (!Array.isArray(antwort.workitems)) {
      listenZustand = 'fehler'
      letzteWorkitems = []
      setzeListe(`<p class="unbekannt">${tHtml('entwicklung.nichtVerfuegbar')}</p>`)
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
    setzeListe(`<p class="fehler">${tHtml('entwicklung.fehler.anfrage', { meldung: meldungVon(fehler) })}</p>`)
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
    // Ein offenes Detail stand bis hierher auf „lädt“ (F-921) — jetzt zeigt es den Fehler.
    if (gewaehlteId !== null) renderDetailInhalt(gewaehlteId)
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
  renderDetailNachtrag()
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
 * @param spalte - optionaler Spaltenfilter (aus „Alle x anzeigen“)
 * @param laden - false: nur Zustand und Anzeige setzen, die Liste lädt das anschließende Betreten der Seite
 */
function wechsleTab(tab, spalte = null, laden = true) {
  aktiverTab = tab
  listenSpalte = spalte
  suchText = ''
  tdArt = ''
  tdPrio = ''
  tdStatus = 'OFFEN'
  letztesTechDebtKopfHtml = ''
  document.getElementById('workboard-techdebt-kopf').innerHTML = ''
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
  if (laden) void ladeListe()
}

/**
 * F46 D4: öffnet #/workboard mit einem Register — für die Reiterzeile auf #/code (views/code.js).
 * Lädt nicht selbst; das Betreten der Seite lädt.
 * @param tab - 'board' oder ein Listen-Tab
 */
export function oeffneEntwicklungsRegister(tab) {
  if (!TABS.includes(tab)) return
  if (tab !== aktiverTab || listenSpalte !== null) wechsleTab(tab, null, false)
  navigiere('#/workboard')
  // Erst nach dem Routing fokussieren — die Ansicht ist dann sichtbar und das Folge-Ereignis verarbeitet (Prüfpass qa 7).
  setTimeout(() => document.getElementById('workboard-tabs').querySelector(`[data-tab="${tab}"]`)?.focus(), 0)
}

// ─── Detail (F44 WS-3b) und Click-to-Work ───────────────────────────────────

/**
 * Sucht ein Workitem für das Detail: zuerst in der zuletzt geladenen Liste des Listen-Tabs, dann
 * in der ungefilterten Liste des Boards (eine Karte führt so immer zu ihrem Detail).
 * @param id - Workitem-id
 * @returns das Workitem, oder null
 */
function findeWorkitem(id) {
  return letzteWorkitems.find((w) => w.id === id) ?? (Array.isArray(alleWorkitems) ? alleWorkitems.find((w) => w.id === id) : undefined) ?? null
}

/** Feature-Status, unter denen kein Bau-Auftrag mehr angelegt werden kann (F35 WS-1 AK6). */

/** true, wenn aus workitem (Feature-Akte) noch ein Bau-Auftrag angelegt werden darf (F35 WS-1 AK6). @param workitem - ein Feature-Workitem */
function istFeatureBaubar(workitem) {
  return !FEATURE_ENDSTATUS.has(workitem.status)
}

// ─── F22 WS-2 / F35 WS-1: Auftrag vorbereiten (Click-to-Work) ───────────────

/** Baut den Auftragstext eines Findings — MUSS die Referenzzeile `workitem:finding:<id>` tragen (WORKITEM_REFERENZ_MUSTER, scripts/leitstand-server.mjs), sonst bleibt workitem_referenz aus WS-1 für immer null (Gegenstück zu leseWorkitemReferenz). @param workitem - ein Finding-Workitem @returns Auftragstext für POST /api/auftraege */
function baueAuftragstext(workitem) {
  const teile = [workitem.titel]
  if (workitem.beschreibung) teile.push(workitem.beschreibung)
  if (workitem.fundstelle) teile.push(`Fundstelle: ${workitem.fundstelle}`)
  teile.push(`workitem:${workitem.quelle}:${workitem.id}`)
  return teile.join('\n\n')
}

/** Rolle→Worker→Modell-Kette eines Workflow-Datensatzes — Ersatzanzeige für Kontrolltiefe/Risikoklasse/Begründung, die nur im Router-Artefakt stehen und über keinen Lesepfad erreichbar sind (F-372). Die Rolle erscheint mit lesbarem Namen (F-914). @param daten - WORKFLOW_V0-Datensatz aus GET /api/workflows/<id>, oder undefined */
function renderSchrittkette(daten) {
  if (!Array.isArray(daten?.schritte) || daten.schritte.length === 0) {
    return `<p class="subtle">${tHtml('entwicklung.ctw.keineSchritte')}</p>`
  }
  const eintrag = (schritt) => `<li><strong>${escapeHtml(rollenName(schritt.rolle))}</strong><span>${escapeHtml(schritt.worker)} · ${escapeHtml(schritt.modell)}</span></li>`
  return `<ol class="workboard-kette">${daten.schritte.map(eintrag).join('')}</ol>`
}

/**
 * Sichern nach einem abgeschlossenen Ablauf (F22 AK6, E11) — die Oberfläche führt nichts davon aus.
 * F46 D4 (F-958): keine Platzhalter mehr. Der Befehlsblock nennt die echten geänderten Dateien des
 * Repos, den Commit-Vorschlag aus dem Branchnamen und den Push (code-daten.js sicherBefehle, Daten aus
 * der Leseroute über code-stand.js; nie `git add -A`/`git add .`, CLAUDE.md). Fehlt der Stand oder
 * gibt es nichts Sicheres zu zeigen, steht der Grund da und der Weg zu #/code. Der Skill-Name steht im
 * Hinweis als {skill} (Satzstellung je Sprache).
 * @returns HTML
 */
function renderTerminalBlock() {
  const stand = aktuellerCodeStand()
  let block
  if (stand.daten === null) {
    block = `<p class="subtle">${tHtml(stand.zustand === 'fehler' ? 'code.fehler.titel' : 'entwicklung.laedt')}</p>`
  } else {
    const befehle = stand.daten.status === 'ok' ? sicherBefehle(stand.daten, { veraltet: stand.zustand === 'fehler' }) : { grund: 'dateienFehler' }
    block = befehle.zeilen ? renderBefehlsblock({ sprache: 'powershell', zeilen: befehle.zeilen }, { echteWerte: true }) : `<p class="subtle">${tHtml(`code.sichern.grund.${befehle.grund}`)}</p>`
    // Zeitpunkt des Stands, damit klar ist, worauf sich die Dateiliste bezieht.
    if (stand.zustand === 'laedt') block = `<p class="subtle">${tHtml('code.aktualisiert')}</p>${block}`
    else if (typeof stand.geladenAm === 'number') block = `<p class="subtle">${tHtml('code.standVon', { zeit: formatiereUhrzeit(new Date(stand.geladenAm).toISOString()) ?? '' })}</p>${block}`
  }
  return `<section class="workboard-git" aria-labelledby="workboard-git-titel">
    <h3 id="workboard-git-titel">${tHtml('entwicklung.ctw.git.titel')}</h3>
    <p class="subtle">${tHtml('entwicklung.ctw.git.hinweis').replace('{skill}', '<code>git-flow</code>')}</p>
    ${block}
    <p class="subtle"><a class="text-link" href="#/code">${tHtml('entwicklung.ctw.git.code')}</a> · ${tHtml('entwicklung.ctw.git.siehe')} <code>state/freigabe-commit.md</code></p>
  </section>`
}

/**
 * Der Inhalt von #workboard-bearbeitung für EIN Workitem, je nach bearbeitungsZustand.phase.
 * Texte über i18n; Server- und Projekttexte (Gründe, IDs, Ziel) escaped.
 * @param workitem - das Workitem, dessen Detail offen ist
 * @param zustand - bearbeitungsZustand (nicht null, workitemId === workitem.id)
 * @returns HTML-Block
 */
function renderBearbeitungsInhalt(workitem, zustand) {
  const daten = zustand.workflowDetail?.daten
  const id = escapeHtml(workitem.id)
  const wiederholen = `<button type="button" class="button wb-wiederholen" data-id="${id}">${tHtml('entwicklung.ctw.wiederholen')}</button>`
  // FOKUS markiert je Zustand das Element, das nach einem Zustandswechsel den Fokus übernimmt
  // (schreibeBearbeitung) — ohne zweite Live-Region.
  if (zustand.phase === 'wird_angelegt') return `<p class="subtle" ${FOKUS}>${tHtml('entwicklung.ctw.wirdAngelegt')}</p>`
  if (zustand.phase === 'wird_geroutet') return `<p class="subtle" ${FOKUS}>${tHtml('entwicklung.ctw.routet')}</p>`
  if (zustand.phase === 'wird_gestartet') return `<p class="subtle" ${FOKUS}>${tHtml('entwicklung.ctw.wirdGestartet')}</p>`
  if (zustand.phase === 'routet') {
    return `<p class="subtle" ${FOKUS}>${tHtml('entwicklung.ctw.routet')} ${tHtml('entwicklung.ctw.auftrag')} <code>${escapeHtml(zustand.auftragId)}</code> · ${tHtml('entwicklung.ctw.lauf')} <code>${escapeHtml(zustand.laufId)}</code></p>`
  }
  if (zustand.phase === 'konflikt') {
    // E12: Konfliktzustand (409/D13) statt Fehlerdialog; der Auftrag ist angelegt, „Wiederholen“ routet erneut.
    return `<div class="note amber" ${FOKUS}><strong>${tHtml('entwicklung.ctw.konflikt.titel')}</strong><p>${escapeHtml(zustand.meldung)}</p><p>${tHtml('entwicklung.ctw.konflikt.text')}</p>${wiederholen}</div>`
  }
  if (zustand.phase === 'fehler') {
    // Wiederholen nur, wenn der Auftrag bereits real angelegt ist (sonst gäbe es nichts, das
    // wiederholeRouten routen könnte) — Reviewer-/QA-Pass 14.09.2026: ohne diesen Knopf war
    // 'fehler' eine Sackgasse, ein erneuter Einstieg hätte einen zweiten Auftrag angelegt.
    return `<div class="note red" ${FOKUS}><strong>${tHtml('entwicklung.ctw.fehler.titel')}</strong><p>${escapeHtml(zustand.meldung)}</p>${zustand.auftragId !== null ? wiederholen : ''}</div>`
  }
  if (zustand.phase === 'vorschlag') {
    return `<section class="workboard-vorschlag" aria-labelledby="workboard-vorschlag-titel">
      <h3 id="workboard-vorschlag-titel" ${FOKUS}>${tHtml('entwicklung.ctw.vorschlag.titel')}</h3>
      <p class="subtle">${tHtml('entwicklung.ctw.vorschlag.hinweis')}</p>
      <dl class="workboard-vorschlag-kopf"><dt>${tHtml('entwicklung.ctw.vorschlag.ziel')}</dt><dd>${escapeHtml(daten?.ziel ?? '')}</dd><dt>${tHtml('entwicklung.ctw.vorschlag.workflow')}</dt><dd><code>${escapeHtml(zustand.workflowId)}</code></dd></dl>
      ${renderSchrittkette(daten)}
      ${renderEmpfehlung(zustand.workflowDetail?.empfehlung)}
      ${zustand.meldung ? `<div class="note red"><p>${escapeHtml(zustand.meldung)}</p></div>` : ''}
      ${renderInstallierbarHinweis(zustand.workflowDetail?.empfehlung)}
      <div class="action-row"><button type="button" class="button primary wb-freigeben" data-id="${id}">${tHtml('entwicklung.ctw.freigeben')}</button><button type="button" class="button wb-ablehnen" data-id="${id}">${tHtml('entwicklung.ctw.ablehnen')}</button></div>
    </section>`
  }
  if (zustand.phase === 'verworfen') return `<p class="subtle" ${FOKUS}>${tHtml('entwicklung.ctw.verworfen')}</p>`
  if (zustand.phase === 'gestartet' || zustand.phase === 'abgeschlossen') {
    // F46 D4: Der Block „Sichern“ braucht den Stand NACH dem Lauf — einmal je Ablauf neu laden, sobald er
    // abgeschlossen ist (Prüfpass qa 2, cr 4); ein weiterer Render-Tick aus dem Poll löst kein Git aus.
    if (zustand.phase === 'abgeschlossen' && zustand.workflowId !== codeStandNachAblauf) {
      codeStandNachAblauf = zustand.workflowId
      void ladeCodeStand({ neu: true })
    }
    return `<section class="workboard-vorschlag" aria-labelledby="workboard-kette-titel">
      <h3 id="workboard-kette-titel" ${FOKUS}>${tHtml('entwicklung.ctw.kette.titel')}</h3>
      <p>${tHtml('entwicklung.ctw.kette.status')}: <code>${escapeHtml(daten?.status ?? '')}</code> · <a href="#/workflows/${encodeURIComponent(zustand.workflowId ?? '')}">${tHtml('uebersicht.rolle.link')}</a></p>
      ${renderSchrittkette(daten)}
    </section>${zustand.phase === 'abgeschlossen' ? renderTerminalBlock() : ''}`
  }
  return ''
}

/**
 * Sperre von „Auftrag vorbereiten“ (F-922, Entscheidung Challenger 01.10.2026, reversibel): gesperrt,
 * solange ein verknüpfter Workflow nicht terminal ist (laufenderWorkflow, dieselbe Statusmenge wie
 * das Board) oder die Abnahme des maßgeblichen Ablaufs offen ist (F46 D3: Kopfdatum abnahme.offen
 * aus dem Poll — dieselbe Angabe wie „Ergebnis prüfen“ im Jetzt-Band). Solange die Verknüpfung noch
 * lädt, bleibt der Einstieg ebenfalls gesperrt — sonst ließe ein Deep-Link vor dem ersten Poll-Tick
 * einen zweiten Auftrag zu. Ist eine Quelle nicht verfügbar (null), bleibt er frei (Server-Regel D13
 * gilt weiter).
 * @param workitem - das Workitem des offenen Details
 * @returns null (frei) oder { grund: 'laeuft' | 'abnahme' | 'laedt', workflowId: Ziel von „Ablauf öffnen“ oder null }
 */
function auftragsSperre(workitem) {
  const verknuepfung = baueVerknuepfung(letzterZustand?.workflows, auftraege)
  if (verknuepfung.laedt.length > 0) return { grund: 'laedt', workflowId: null }
  const laufend = laufenderWorkflow(workitem, verknuepfung)
  if (laufend !== null) return { grund: 'laeuft', workflowId: laufend.workflowId }
  const massgeblich = verknuepfterWorkflow(workitem, verknuepfung)
  if (massgeblich?.abnahme?.offen === true) return { grund: 'abnahme', workflowId: massgeblich.workflowId }
  return null
}

/** true, wenn workitem einen Click-to-Work-Einstieg hat (jedes Finding, eine baubare Feature-Akte). @param workitem - ein Workitem */
function hatEinstieg(workitem) {
  return workitem.quelle === 'finding' || (workitem.quelle === 'feature' && istFeatureBaubar(workitem))
}

/**
 * Stand von Click-to-Work für die Sicht des Details (views/workboard-detail.js, Jetzt-Band):
 * 'vorschlag' bzw. 'aktiv' bei einem Bearbeitungszustand dieses Eintrags, 'keiner' ohne Einstieg,
 * sonst 'frei', 'laedt' oder 'gesperrt' nach auftragsSperre.
 * @param workitem - das Workitem des offenen Details
 * @returns 'frei' | 'gesperrt' | 'laedt' | 'vorschlag' | 'aktiv' | 'keiner'
 */
function ctwStand(workitem) {
  if (bearbeitungsZustand !== null && bearbeitungsZustand.workitemId === workitem.id) {
    if (bearbeitungsZustand.phase === 'vorschlag') return 'vorschlag'
    return bearbeitungsZustand.phase === 'fehler' || bearbeitungsZustand.phase === 'konflikt' ? 'stoerung' : 'aktiv'
  }
  if (!hatEinstieg(workitem)) return 'keiner'
  const sperre = auftragsSperre(workitem)
  if (sperre === null) return 'frei'
  return sperre.grund === 'laedt' ? 'laedt' : 'gesperrt'
}

/**
 * Rendert #workboard-bearbeitung für workitem: ohne offenen Bearbeitungszustand den Einstieg
 * (E9 Feature, E10 Finding; IDs #workboard-bauen bzw. #workboard-bearbeiten und ihr Verhalten
 * unverändert) — gesperrt mit Hinweis und „Ablauf öffnen“, solange auftragsSperre greift (F-922) —,
 * sonst den laufenden Zustand (beide Quellen teilen sich renderBearbeitungsInhalt). Eine nicht mehr
 * baubare Feature-Akte zeigt nur einen Hinweis. F46 D3 (Bild 07-Bug): Bei einem Bug heißt der
 * Einstieg „Jetzt beheben lassen“ (dasselbe Click-to-Work); daneben stehen „Einplanen …“,
 * „Zurückstellen bis Auslöser“ und „Schließen: kein Fehler“ als „kommt“ (Fixpaket B5) — nur solange
 * der Einstieg frei ist (dann gehört der Bereich zum Jetzt-Band).
 * @param workitem - das aktuell im Detail gezeigte Workitem
 * @param mitBand - true (Klick-Ketten): das Jetzt-Band zieht mit; false, wenn der Aufrufer die ganze
 *   Seite ohnehin gerade gerendert hat (renderDetailInhalt, renderDetailNachtrag)
 */
function renderBearbeitungsAbschnitt(workitem, mitBand = true) {
  const sperre = auftragsSperre(workitem)
  // Nur ein offener Bug heißt „Jetzt beheben lassen“; die Triage-Knöpfe stehen beim freien Einstieg — kein
  // verknüpfter Ablauf aktiv oder in der Abnahme (F-997, dieselbe Bedingung wie das Triage-Band, detailJetzt).
  const bug = istBug(workitem) && workitem.status === 'OFFEN'
  const beschriftung = tHtml(bug ? 'eintrag.ctw.beheben' : 'entwicklung.ctw.vorbereiten')
  const einstieg = (knopfId, hinweis) => {
    if (sperre === null) {
      const triage = bug ? `${kommtKnopf(t('eintrag.ctw.einplanen'))}${kommtKnopf(t('eintrag.ctw.zurueckstellen'))}${kommtKnopf(t('eintrag.ctw.schliessen'))}` : ''
      return `<div class="workboard-auftrag-start"><div class="workboard-auftrag-knoepfe"><button type="button" id="${knopfId}" class="button primary" data-id="${escapeHtml(workitem.id)}" data-ctw-fokus>${beschriftung}</button>${triage}</div><p class="subtle">${tHtml(hinweis)}</p></div>`
    }
    const link = sperre.workflowId !== null ? ` <a href="#/workflows/${encodeURIComponent(sperre.workflowId)}">${tHtml('uebersicht.rolle.link')}</a>` : ''
    return `<div class="workboard-auftrag-start"><button type="button" id="${knopfId}" class="button" data-id="${escapeHtml(workitem.id)}" disabled aria-disabled="true" aria-describedby="workboard-auftrag-sperre" data-ctw-fokus>${beschriftung}</button><p class="subtle" id="workboard-auftrag-sperre">${tHtml(`entwicklung.ctw.gesperrt.${sperre.grund}`)}${link}</p></div>`
  }
  let einstiegHtml = null
  if (workitem.quelle === 'finding') einstiegHtml = einstieg('workboard-bearbeiten', 'entwicklung.ctw.hinweis.finding')
  else if (workitem.quelle === 'feature' && istFeatureBaubar(workitem)) einstiegHtml = einstieg('workboard-bauen', 'entwicklung.ctw.hinweis.feature')
  if (einstiegHtml === null) schreibeBearbeitung(workitem.quelle === 'feature' ? `<p class="subtle">${tHtml('entwicklung.ctw.nichtBaubar')}</p>` : '')
  else if (bearbeitungsZustand === null || bearbeitungsZustand.workitemId !== workitem.id) schreibeBearbeitung(einstiegHtml)
  else schreibeBearbeitung(renderBearbeitungsInhalt(workitem, bearbeitungsZustand))
  // F46 D3: Das Jetzt-Band hängt am Stand von Click-to-Work (Vorschlag, Triage) — es zieht mit.
  if (mitBand && gewaehlteId === workitem.id) renderDetailJetzt(baueDetailSicht(workitem))
}

/** Markierung des Elements, das nach einem Zustandswechsel im Click-to-Work-Bereich den Fokus übernimmt (Text und Überschriften per tabindex=-1 fokussierbar, ohne in die Tab-Reihenfolge zu kommen; Knöpfe tragen nur data-ctw-fokus). */
const FOKUS = 'tabindex="-1" data-ctw-fokus'

/** Zuletzt geschriebenes HTML von #workboard-bearbeitung. */
let letztesBearbeitungsHtml = ''

/**
 * Schreibt #workboard-bearbeitung nur bei geändertem HTML — der Detail-Auffrischer rendert bei jedem
 * Poll-Tick, ein Neuschreiben nähme dem Tastaturfokus sonst „Freigeben“ weg. Lag der Fokus im
 * Bereich (der geklickte Knopf verschwindet), geht er auf das markierte Element des neuen Zustands
 * (FOKUS); Ansagen laufen weiter nur über die Persona (eine Live-Region).
 * @param html - neuer Inhalt
 */
function schreibeBearbeitung(html) {
  if (html === letztesBearbeitungsHtml) return
  letztesBearbeitungsHtml = html
  const container = document.getElementById('workboard-bearbeitung')
  const hatteFokus = document.activeElement !== null && container.contains(document.activeElement)
  container.innerHTML = html
  if (hatteFokus) container.querySelector('[data-ctw-fokus]')?.focus()
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
    zustand.meldung = inhalt.grund ?? t('entwicklung.ctw.konflikt.standard')
  } else if (!routeAntwort.ok) {
    zustand.phase = 'fehler'
    zustand.meldung = t('entwicklung.ctw.fehler.routen', { status: routeAntwort.status, grund: inhalt.grund ?? '' }).trim()
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
      zustand.meldung = t('entwicklung.ctw.fehler.anlegen', { status: auftragAntwort.status, grund: auftragInhalt.grund ?? '' }).trim()
      if (pruefeUndUebernimmZustand(workitem, zustand)) renderBearbeitungsAbschnitt(workitem)
      return
    }
    zustand.auftragId = auftragInhalt.auftragId
    zustand.workflowId = `router-${auftragInhalt.auftragId}`
    zustand.phase = 'wird_geroutet'
    if (pruefeUndUebernimmZustand(workitem, zustand)) renderBearbeitungsAbschnitt(workitem)
    // F44 WS-3b: Der neue Auftrag trägt die Referenzzeile — die Aufträge einmal neu laden, damit Board
    // und Detail den entstehenden Ablauf verknüpfen (ereignisgetrieben, nicht aus dem Poll).
    if (zustand.projektId === holeAktivesProjekt().id) void ladeAuftraege()
    // F44 WS-1a (F-860): nach einem Projektwechsel den Auftrag des alten Projekts nicht über den
    // Präfix des neuen routen — die Kette endet hier; der Auftrag bleibt im alten Projekt liegen.
    if (zustand.projektId !== holeAktivesProjekt().id) return
    await verarbeiteRoutenAntwort(await routeAuftrag(auftragInhalt.auftragId), workitem, zustand)
  } catch (fehler) {
    zustand.phase = 'fehler'
    zustand.meldung = t('entwicklung.fehler.anfrage', { meldung: meldungVon(fehler) })
    if (pruefeUndUebernimmZustand(workitem, zustand)) renderBearbeitungsAbschnitt(workitem)
  }
}

/** Neues, leeres Bearbeitungszustand-Objekt für workitem (Muster beider Einstiegsknöpfe). @param workitem - das geklickte Workitem */
function baueLeerenBearbeitungsZustand(workitem) {
  return { workitemId: workitem.id, projektId: holeAktivesProjekt().id, phase: 'wird_angelegt', auftragId: null, laufId: null, workflowId: null, meldung: null, workflowDetail: null }
}

/** Klick auf „Auftrag vorbereiten“ an einem Finding (#workboard-bearbeiten, bis F44 WS-3b „Bearbeiten“): legt den Auftrag an (mit Referenzzeile, baueAuftragstext) und routet ihn sofort. @param workitem - das geklickte Finding */
async function starteBearbeitung(workitem) {
  const zustand = baueLeerenBearbeitungsZustand(workitem)
  bearbeitungsZustand = zustand
  renderBearbeitungsAbschnitt(workitem)
  await fuehreAuftragserzeugungUndRoutungDurch(workitem, zustand, () => legeAuftragAn({ titel: workitem.titel, auftragstext: baueAuftragstext(workitem) }))
}

/** Klick auf „Auftrag vorbereiten“ an einer Feature-Akte (#workboard-bauen, F35 WS-1, bis F44 WS-3b „Bauen“): leitet den Auftrag deterministisch aus der Feature-Akte ab (baueAuftragAusFeature) und routet ihn sofort. @param workitem - die geklickte Feature-Akte */
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
    zustand.meldung = t('entwicklung.fehler.anfrage', { meldung: meldungVon(fehler) })
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
      zustand.meldung = t('entwicklung.ctw.freigabeNichtErteilt', { grund: inhalt.grund })
    } else if (!antwort.ok) {
      zustand.phase = 'fehler'
      zustand.meldung = t('entwicklung.ctw.fehler.freigabe', { status: antwort.status, grund: inhalt.grund ?? '' }).trim()
    } else {
      zustand.phase = 'gestartet'
    }
  } catch (fehler) {
    zustand.phase = 'fehler'
    zustand.meldung = t('entwicklung.fehler.anfrage', { meldung: meldungVon(fehler) })
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

// ─── Detail als ganze Seite (F44 WS-3b, E8/E13) ─────────────────────────────

/**
 * Prüft die Antwort von GET …/features/<id>/akte auf die erwartete Form (Server- und Aktentexte
 * bleiben roh, escaped wird beim Rendern).
 * @param antwort - geparster Körper
 * @returns { status: 'ok', … } | { status: 'unvollstaendig', grund } | { status: 'fehler', meldung }
 */
function pruefeAkte(antwort) {
  const istAk = (ak) => typeof ak?.id === 'string' && typeof ak.text === 'string'
  if (antwort?.status === 'ok' && typeof antwort.ziel === 'string' && Array.isArray(antwort.akzeptanzkriterien) && antwort.akzeptanzkriterien.every(istAk) && Array.isArray(antwort.nicht_ziele) && antwort.nicht_ziele.every((z) => typeof z === 'string')) return antwort
  if (antwort?.status === 'unvollstaendig') return { status: 'unvollstaendig', grund: String(antwort.grund ?? '') }
  return { status: 'fehler', meldung: t('entwicklung.detail.akte.unerwartet') }
}

/**
 * Lädt Akte und Roadmap eines Features für das offene Detail (einmal je Öffnen). Eine überholte
 * Antwort (anderes Detail, Projektwechsel) wird verworfen.
 * @param nachtrag - der detailNachtrag, für den geladen wird
 */
async function ladeAkteUndRoadmap(nachtrag) {
  const [akte, roadmap] = await Promise.allSettled([holeFeatureAkte(nachtrag.id), holeRoadmap()])
  if (detailNachtrag !== nachtrag) return
  if (akte.status === 'rejected') console.error('GET …/features/<id>/akte fehlgeschlagen:', akte.reason)
  if (roadmap.status === 'rejected') console.error('GET …/roadmap (Detail) fehlgeschlagen:', roadmap.reason)
  nachtrag.akte = akte.status === 'fulfilled' ? pruefeAkte(akte.value) : { status: 'fehler', meldung: meldungVon(akte.reason) }
  nachtrag.roadmap = roadmap.status === 'fulfilled' ? roadmap.value : { status: 'fehler' }
  renderDetailNachtrag()
}

/**
 * Lädt die Schritte des verknüpften Ablaufs (GET …/workflows/<id>) und die Abnahme-Projektion
 * (GET …/abnahme) — F46 D3: Urteile je AK für „Das Was“, Prüfergebnis und Entscheidung für Rollen-Kreis
 * und Behebung. Ob die Abnahme offen ist, entscheidet nicht diese Antwort, sondern das Kopfdatum
 * abnahme.offen aus dem Poll (eine Regel, ermittleAbnahmeStand). Geladen wird nur beim Bestimmen und
 * bei Übergängen (pruefeDetailNachtrag), nie periodisch. Eine überholte Antwort (anderes Detail,
 * Projektwechsel, inzwischen neuere Ladung desselben Details) wird verworfen.
 * @param nachtrag - der detailNachtrag, für den geladen wird
 * @param workflow - verknüpfter Workflow-Eintrag des Aggregats
 */
async function ladeAblaufNachtrag(nachtrag, workflow) {
  const ladung = ++nachtrag.ablaufLadung
  const aktuell = () => detailNachtrag === nachtrag && nachtrag.ablaufLadung === ladung
  const holeSchritte = async () => {
    const antwort = await holeWorkflowDetail(workflow.workflowId)
    if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`)
    return antwort.json()
  }
  const [detail, abnahme] = await Promise.allSettled([holeSchritte(), holeAbnahme(workflow.workflowId)])
  if (!aktuell()) return
  if (detail.status === 'rejected') console.error('GET …/workflows/<id> (Detail) fehlgeschlagen:', detail.reason)
  // holeAbnahme liefert bei 4xx/5xx den Fehlerkörper ({ grund }) — eine Projektion trägt immer workflowStatus.
  const projektion = abnahme.status === 'fulfilled' && typeof abnahme.value?.workflowStatus === 'string' ? abnahme.value : null
  // Ohne Abnahme-Projektion zeigt das Detail „Urteile nicht ladbar“; der Rest des Details bleibt.
  if (projektion === null) console.error('GET …/abnahme (Detail) fehlgeschlagen:', abnahme.status === 'rejected' ? abnahme.reason : abnahme.value)
  nachtrag.schritte = detail.status === 'fulfilled' && Array.isArray(detail.value?.daten?.schritte) ? detail.value.daten.schritte : null
  nachtrag.abnahme = projektion
  renderDetailNachtrag()
}

/**
 * Startet die ausstehenden Teile des Detail-Nachtrags: die Akte (Features, einmal je Öffnen) und
 * den verknüpften Ablauf samt Schritten, sobald Workflows (Poll) und Aufträge vorliegen. Die
 * Schritte lädt sie beim ersten Bestimmen und danach nur bei einem Übergang — wenn ein anderer
 * Ablauf maßgeblich wird (z. B. der eben über „Auftrag vorbereiten“ entstandene) oder der
 * maßgebliche seine Phase wechselt (workflowPhase: Status bzw. Freigabe/Rückfrage). Ein Poll-Tick
 * ohne Übergang lädt nichts. Eine nicht verfügbare Quelle (null) hält die erste Bestimmung offen;
 * eine bereits bestimmte bleibt dann stehen.
 */
function pruefeDetailNachtrag() {
  const nachtrag = detailNachtrag
  if (nachtrag === null || gewaehlteId !== nachtrag.id || nachtrag.projektId !== holeAktivesProjekt().id) return
  const workitem = findeWorkitem(nachtrag.id)
  if (workitem === null) return
  if (workitem.quelle === 'feature' && !nachtrag.akteGestartet) {
    nachtrag.akteGestartet = true
    void ladeAkteUndRoadmap(nachtrag)
  }
  const verknuepfung = baueVerknuepfung(letzterZustand?.workflows, auftraege)
  if (verknuepfung.laedt.length > 0) return
  if (verknuepfung.fehlend.length > 0) {
    if (!nachtrag.workflowBestimmt) nachtrag.verknuepfungFehlt = true
    return
  }
  nachtrag.verknuepfungFehlt = false
  const workflow = verknuepfterWorkflow(workitem, verknuepfung)
  // F46 D3 (Prüfpass cr 1, qa 9): Übergang ist auch ein anderer Halt bzw. Cursor (laufender Schritt
  // wechselt) und ein anderer Abnahmestand (Entscheidung in einem anderen Tab) — sonst veralteten
  // Rollen-Kreis, Behebung und „Gerade dran“, während Status-Block und Band schon den neuen Stand zeigen.
  const kennung = workflow === null ? null : [workflow.workflowId, workflowPhase(workflow), workflow.naechster?.art, workflow.naechster?.schrittId, workflow.aktiverSchrittId, workflow.abnahme?.offen, workflow.abnahme?.status].join('|')
  if (nachtrag.workflowBestimmt && kennung === nachtrag.workflowKennung) return
  const andererAblauf = !nachtrag.workflowBestimmt || (workflow?.workflowId ?? null) !== nachtrag.workflowId
  nachtrag.workflowBestimmt = true
  nachtrag.workflowKennung = kennung
  nachtrag.workflowId = workflow?.workflowId ?? null
  nachtrag.workflowEintrag = workflow
  // Beim selben Ablauf bleiben die bisherigen Schritte stehen, bis die neuen da sind (kein Flackern).
  if (andererAblauf) {
    nachtrag.schritte = undefined
    nachtrag.abnahme = undefined
  }
  if (workflow !== null) void ladeAblaufNachtrag(nachtrag, workflow)
}

/**
 * Projektordner für VS-Code-Links im Detail: repo_pfad des Registers, wenn er absolut ist, sonst der
 * absolute Pfad aus dem Code-Stand (F-968, F46 D4).
 * @returns Pfad oder null
 */
function detailRepoPfad() {
  const register = projektAusListe(holeAktivesProjekt().id)?.repo_pfad ?? null
  if (baueVsCodeLink(register) !== null) return register
  return aktuellerCodeStand().daten?.absoluterPfad ?? register
}

/**
 * Die Sicht des Details (views/workboard-detail.js) für workitem. Der verknüpfte Ablauf ist der
 * beim Öffnen bestimmte; Status und Halt kommen aus dem jüngsten Aggregat (die Phase bleibt
 * aktuell), sonst aus dem Eintrag zum Zeitpunkt der Bestimmung.
 * @param workitem - das Workitem des offenen Details
 * @returns Sicht
 */
function baueDetailSicht(workitem) {
  const nachtrag = detailNachtrag?.id === workitem.id ? detailNachtrag : null
  let verknuepfung = 'laedt'
  let workflow = null
  if (nachtrag?.workflowBestimmt) {
    verknuepfung = 'ok'
    const aktuell = Array.isArray(letzterZustand?.workflows) ? letzterZustand.workflows.find((w) => w?.workflowId === nachtrag.workflowId) : undefined
    workflow = nachtrag.workflowId === null ? null : (aktuell ?? nachtrag.workflowEintrag)
  } else if (nachtrag?.verknuepfungFehlt) {
    verknuepfung = 'fehlt'
  }
  return {
    workitem,
    workflow,
    verknuepfung,
    schritte: nachtrag?.schritte,
    abnahme: nachtrag?.abnahme,
    akte: nachtrag?.akte,
    roadmap: nachtrag?.roadmap,
    workitems: alleWorkitems,
    ctw: ctwStand(workitem),
    repoPfad: detailRepoPfad(),
    // F46 D4: Repo-Adresse für „Pull Requests auf GitHub“ aus dem Code-Stand (null = keine bzw. noch keine).
    remoteWebUrl: pruefeGithubUrl(aktuellerCodeStand().daten?.remoteWebUrl?.url ?? null),
    kreisAuswahl: nachtrag?.kreisAuswahl ?? null,
    wasReiter: nachtrag?.wasReiter ?? null,
  }
}

/**
 * Schreibt innerHTML eines Bereichs nur bei geändertem Inhalt (ein Poll-Tick klappt so keine
 * Abschnitte zu und nimmt keinen Fokus weg). Muss neu geschrieben werden (Reiter gewählt, Übergang
 * des Ablaufs), bleiben aufgeklappte Abschnitte (<details data-klappe>) offen und der Fokus liegt
 * danach wieder auf dem Element mit derselben id (F46 D3, Prüfpass cr 2, qa 8).
 * @param id - Element-id
 * @param html - neuer Inhalt
 */
function schreibeWennGeaendert(id, html) {
  if (letztesDetailHtml.get(id) === html) return
  letztesDetailHtml.set(id, html)
  const bereich = document.getElementById(id)
  const offen = new Set([...(bereich.querySelectorAll?.('details[data-klappe][open]') ?? [])].map((d) => d.getAttribute('data-klappe')))
  const fokus = document.activeElement !== null && bereich.contains?.(document.activeElement) ? document.activeElement.id : ''
  bereich.innerHTML = html
  for (const klappe of offen) bereich.querySelector?.(`details[data-klappe="${klappe}"]`)?.setAttribute('open', '')
  if (fokus) document.getElementById(fokus)?.focus()
}

/**
 * Schreibt das Jetzt-Band und seinen Zustand (data-zustand: 'dran' | 'dran-verbunden' | 'ruhig';
 * „verbunden“ schließt den Click-to-Work-Bereich darunter optisch an, style.css).
 * @param sicht - Sicht des Details
 */
function renderDetailJetzt(sicht) {
  const jetzt = detailJetzt(sicht)
  const band = document.getElementById('workboard-detail-jetzt')
  if (band.getAttribute('data-zustand') !== jetzt.zustand) band.setAttribute('data-zustand', jetzt.zustand)
  schreibeWennGeaendert('workboard-detail-jetzt', jetzt.html)
}

/**
 * Rendert Kopf, Kurz gesagt, Status-Block, Jetzt-Band, Inhalt und rechte Spalte des Details für ein
 * gefundenes Workitem — ohne den Click-to-Work-Bereich (#workboard-bearbeitung), damit ein Poll-Tick
 * dessen Bedienung nicht zerstört.
 * @param workitem - das Workitem des offenen Details
 */
function renderDetailSeite(workitem) {
  const sicht = baueDetailSicht(workitem)
  const titel = document.getElementById('workboard-detail-titel')
  if (titel.textContent !== titelVon(workitem)) titel.textContent = titelVon(workitem)
  schreibeWennGeaendert('workboard-detail-eyebrow', detailEyebrowHtml(workitem))
  schreibeWennGeaendert('workboard-detail-zusatz', detailKopfZusatzHtml(sicht))
  schreibeWennGeaendert('workboard-detail-kurz', detailKurzHtml(sicht))
  schreibeWennGeaendert('workboard-detail-status', detailStatusBlockHtml(sicht))
  renderDetailJetzt(sicht)
  schreibeWennGeaendert('workboard-detail-inhalt', detailInhaltHtml(sicht))
  schreibeWennGeaendert('workboard-detail-spalte', detailSpalteHtml(sicht))
}

/**
 * Detail ohne (noch) gefundenes Workitem: Ladezustand, solange die Workitems laden (F-921, kein
 * „nicht gefunden“ beim Deep-Link), sonst Fehler, „nicht verfügbar“ oder „nicht gefunden“. Kopf,
 * Status-Block, Jetzt-Band und rechte Spalte bleiben leer.
 * @param id - Workitem-id aus der Route
 */
function renderDetailOhneWorkitem(id) {
  let html
  if (alleFehler !== null) html = `<div class="note red"><strong>${tHtml('entwicklung.fehler.titel')}</strong><p><code>${escapeHtml(alleFehler)}</code></p><button type="button" class="button" data-workboard-detail-erneut>${tHtml('entwicklung.fehler.erneut')}</button></div>`
  else if (alleWorkitems === undefined) html = `<p class="subtle">${tHtml('entwicklung.detail.laedt')}</p>`
  else if (alleWorkitems === null) html = `<div class="note red"><strong>${tHtml('entwicklung.nichtVerfuegbar')}</strong></div>`
  else html = `<div class="note amber"><strong>${tHtml('entwicklung.detail.nichtGefunden.titel')}</strong><p>${tHtml('entwicklung.detail.nichtGefunden')}</p></div>`
  document.getElementById('workboard-detail-titel').textContent = id
  for (const bereich of ['workboard-detail-eyebrow', 'workboard-detail-zusatz', 'workboard-detail-kurz', 'workboard-detail-status', 'workboard-detail-jetzt', 'workboard-detail-spalte']) schreibeWennGeaendert(bereich, '')
  document.getElementById('workboard-detail-jetzt').removeAttribute('data-zustand')
  schreibeWennGeaendert('workboard-detail-inhalt', html)
  schreibeBearbeitung('')
}

/**
 * Rendert das offene Detail vollständig (Workitem über findeWorkitem), einschließlich des
 * Click-to-Work-Bereichs — ohne zu öffnen oder zu scrollen. Getrennt von ladeDetail(), damit
 * ladeListe() und ladeAlleWorkitems() das offene Detail still nachrendern können, sobald eine
 * Liste eintrifft. Der Inhalt hat keine Formularfelder; ein Überschreiben kann keine Eingabe
 * verlieren.
 * @param id - Workitem-id des offenen Details
 */
function renderDetailInhalt(id) {
  const workitem = findeWorkitem(id)
  if (workitem === null) {
    renderDetailOhneWorkitem(id)
    return
  }
  pruefeDetailNachtrag()
  renderDetailSeite(workitem)
  renderBearbeitungsAbschnitt(workitem, false)
}

/** Rendert nach einem eingetroffenen Nachtrag bzw. einem Poll-Tick das offene Detail neu; der Click-to-Work-Bereich wird nur bei geändertem HTML geschrieben (schreibeBearbeitung — etwa, wenn „Auftrag vorbereiten“ bei offener Abnahme zurücktritt). */
function renderDetailNachtrag() {
  if (gewaehlteId === null) return
  const workitem = findeWorkitem(gewaehlteId)
  if (workitem === null) return
  pruefeDetailNachtrag()
  renderDetailSeite(workitem)
  renderBearbeitungsAbschnitt(workitem, false)
}

/**
 * Schaltet zwischen Übersicht (Kopf, Register, Board, Listen) und Detail um; „←“ nennt das zuletzt
 * aktive Register.
 * @param offen - true: Detail zeigen
 */
function zeigeDetail(offen) {
  document.getElementById('workboard-uebersicht').hidden = offen
  document.getElementById('workboard-detail').hidden = !offen
  const tab = t(`entwicklung.tab.${aktiverTab}`)
  document.getElementById('workboard-detail-zurueck-text').textContent = tab
  document.getElementById('workboard-detail-schliessen').setAttribute('aria-label', t('entwicklung.detail.zurueck', { tab }))
}

/** Öffnet das Detail für id (Routen-Eintritt `#/workboard/<id>`) als ganze Seite und startet einen frischen Nachtrag (Akte, Roadmap, Ablauf). F22 WS-2: ein bearbeitungsZustand eines ANDEREN Workitems wird verworfen — nur ein Wiederöffnen DESSELBEN Workitems behält seinen Fortschritt (siehe bearbeitungsZustand-Kommentar). */
function ladeDetail(id) {
  gewaehlteId = id
  if (bearbeitungsZustand !== null && bearbeitungsZustand.workitemId !== id) {
    bearbeitungsZustand = null
  }
  detailNachtrag = { id, projektId: holeAktivesProjekt().id, akteGestartet: false, akte: undefined, roadmap: undefined, workflowBestimmt: false, workflowKennung: null, verknuepfungFehlt: false, workflowId: undefined, workflowEintrag: null, schritte: undefined, abnahme: undefined, ablaufLadung: 0, wasReiter: null, kreisAuswahl: null }
  letztesDetailHtml.clear()
  // F46 D4: „Pull Requests“ und der VS-Code-Pfad brauchen den Code-Stand — einmal laden, falls keiner da ist.
  if (aktuellerCodeStand().zustand === 'leer') void ladeCodeStand()
  zeigeDetail(true)
  renderDetailInhalt(id)
  const titel = document.getElementById('workboard-detail-titel')
  titel.focus({ preventScroll: true })
  document.getElementById('workboard-detail').scrollIntoView({ block: 'start' })
}

/** Schließt das Detail (Route `#/workboard`, Projektwechsel) und zeigt die Übersicht; ein laufender Nachtrag wird verworfen. */
function schliesseDetail() {
  gewaehlteId = null
  detailAusUebersicht = false
  detailNachtrag = null
  zeigeDetail(false)
}

/**
 * Klick-Delegation für Register, Ansicht-Chips, „Alle x anzeigen“, „Erneut laden“, Filter-Chips,
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

/**
 * F46 D3: wählt einen Reiter von „Das Was“ oder eine Rolle im Rollen-Kreis des offenen Details,
 * rendert neu und legt den Fokus auf den gewählten Reiter (Register-Muster).
 * @param art - 'was' | 'kreis'
 * @param wert - Reiter- bzw. Rollen-ID
 */
function waehleDetailReiter(art, wert) {
  if (detailNachtrag === null || gewaehlteId === null) return
  if (art === 'was') detailNachtrag.wasReiter = wert
  else detailNachtrag.kreisAuswahl = wert
  renderDetailNachtrag()
  document.getElementById(art === 'was' ? `was-tab-${wert}` : `${DETAIL_KREIS_PRAEFIX}-tab-${wert}`)?.focus()
}

/**
 * F46 D3: Bedienung im Inhalt des Details — „Erneut laden“ im Fehlerzustand, Reiter von „Das Was“
 * und Rollen des Rollen-Kreises (Klick; Pfeil links/rechts, Pos1, Ende — Muster F44 WS-7/WS-8).
 */
function initDetailBedienung() {
  const inhalt = document.getElementById('workboard-detail-inhalt')
  inhalt.addEventListener('click', (ereignis) => {
    // Fehlerzustand des Details: „Erneut laden“ holt die Workitems neu (der Knopf der Übersicht ist ausgeblendet).
    if (ereignis.target.closest('[data-workboard-detail-erneut]') !== null) {
      void ladeAlleWorkitems()
      return
    }
    const was = ereignis.target.closest('[data-was-reiter]')
    if (was !== null) {
      waehleDetailReiter('was', was.getAttribute('data-was-reiter'))
      return
    }
    const rolle = ereignis.target.closest('[data-kreis-rolle]')
    if (rolle !== null) waehleDetailReiter('kreis', rolle.getAttribute('data-kreis-rolle'))
  })
  inhalt.addEventListener('keydown', (ereignis) => {
    const was = ereignis.target.closest('[data-was-reiter]')
    if (was !== null) {
      const index = naechsterRegisterIndex(WAS_REITER.indexOf(was.getAttribute('data-was-reiter')), WAS_REITER.length, ereignis.key)
      if (index === null) return
      ereignis.preventDefault()
      waehleDetailReiter('was', WAS_REITER[index])
      return
    }
    const rolle = ereignis.target.closest('[data-kreis-rolle]')
    if (rolle === null) return
    const neu = naechsteKreisRolle(rolle.getAttribute('data-kreis-rolle'), ereignis.key)
    if (neu === null) return
    ereignis.preventDefault()
    waehleDetailReiter('kreis', neu)
  })
  // „Frag Jarvis dazu“ in der rechten Spalte: öffnet das Dock mit vorbefüllter Eingabe, sendet nie (chat-dock.js).
  document.getElementById('workboard-detail-spalte').addEventListener('click', (ereignis) => {
    const knopf = ereignis.target.closest('[data-detail-jarvis]')
    if (knopf === null || gewaehlteId === null) return
    const workitem = findeWorkitem(gewaehlteId)
    if (workitem !== null) oeffneChatMitEntwurf({ modus: 'jarvis', entwurf: jarvisEntwurf(workitem) }, knopf)
  })
}

/** Klick- und Enter-Delegation für Listenzeilen (Navigation zu `#/workboard/<id>`) und „← zurück“ im Detail — Muster views/runs.js. */
function initListenBedienung() {
  const liste = document.getElementById('workboard-liste')
  liste.addEventListener('click', (ereignis) => {
    // F46 D4: Zeile bzw. „Öffnen“ der Tabelle „Tech Debt & Prozess“ — über navigiere wie die Karten (ein
    // reiner Link löste nach „Schließen“ auf demselben Hash kein hashchange aus).
    const zeile = ereignis.target.closest('.workboard-zeile, .techdebt-zeile')
    if (!zeile) return
    ereignis.preventDefault()
    navigiere(`#/workboard/${encodeURIComponent(zeile.dataset.id)}`)
  })
  // F46 D4: Karten und Chips von „Tech Debt & Prozess“ — Radio je Gruppe; eine gewählte Karte bzw. Art
  // abwählen heißt „alle“. Gefiltert wird clientseitig (renderListe).
  document.getElementById('workboard-techdebt-kopf').addEventListener('click', (ereignis) => {
    const knopf = ereignis.target.closest('[data-td-art], [data-td-prio], [data-td-status]')
    if (knopf === null) return
    if (knopf.hasAttribute('data-td-art')) {
      const art = knopf.dataset.tdArt
      tdArt = knopf.classList.contains('techdebt-karte') && tdArt === art ? '' : art
    } else if (knopf.hasAttribute('data-td-prio')) {
      tdPrio = tdPrio === knopf.dataset.tdPrio ? '' : knopf.dataset.tdPrio
    } else {
      tdStatus = knopf.dataset.tdStatus
    }
    renderListe()
  })
  liste.addEventListener('keydown', (ereignis) => {
    if (ereignis.key !== 'Enter') return
    const zeile = ereignis.target.closest('.workboard-zeile')
    if (!zeile) return
    ereignis.preventDefault()
    navigiere(`#/workboard/${encodeURIComponent(zeile.dataset.id)}`)
  })
  // „← <Register>“ (F-926, F44 WS-4b): kam das Detail direkt aus der Übersicht, geht es per
  // history.back() zurück (kein neuer Eintrag, Browser-Zurück öffnet das Detail nicht wieder), sonst
  // per navigiere. Die Route #/workboard schließt das Detail und legt den Fokus auf die Karte bzw. Zeile.
  document.getElementById('workboard-detail-schliessen').addEventListener('click', () => {
    if (detailAusUebersicht) history.back()
    else navigiere('#/workboard')
  })
}

/**
 * F-926: legt nach dem Schließen des Details den Fokus auf die Karte (Board) bzw. Zeile (Listen) des
 * Eintrags; ohne sichtbare Karte oder Zeile auf die Seitenüberschrift.
 * @param id - Workitem-id des zuvor offenen Details
 */
function fokussiereEintrag(id) {
  const kandidaten = [...document.querySelectorAll('#workboard-board .board-item, #workboard-liste .workboard-zeile, #workboard-liste .techdebt-oeffnen')]
  const treffer = kandidaten.find((el) => el.dataset.id === id && el.offsetParent !== null)
  ;(treffer ?? document.getElementById('workboard-titel')).focus()
}

/** Klick-Delegation für #workboard-bearbeitung (F22 WS-2): Auftrag vorbereiten (#workboard-bearbeiten/#workboard-bauen)/Wiederholen/Freigeben/Ablehnen — ein Container statt eigener Listener, Muster #workflow-bedienung in views/workflows.js. */
function initBearbeitungBedienung() {
  // F36 WS-5a: „Freigeben & installieren“ im Empfehlungsblock des Vorschlags; danach Detail neu laden.
  bindeEmpfehlungInstallation(document.getElementById('workboard-bearbeitung'), () => aktualisiereBearbeitungsZustand())
  document.getElementById('workboard-bearbeitung').addEventListener('click', (ereignis) => {
    // F-922: ein gesperrter Einstieg (disabled/aria-disabled) löst nichts aus — auch nicht über eine künstliche Klickfolge.
    if (ereignis.target.closest('[aria-disabled="true"]') !== null) return
    // F46 D4 (F-958): „Kopieren“ im Befehlsblock „Sichern“ — nur Zwischenablage, nichts wird ausgeführt.
    const kopieren = ereignis.target.closest('[data-befehl-kopieren]')
    if (kopieren !== null) {
      void kopiereBefehlsblock(kopieren)
      return
    }
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
  initDetailBedienung()
  initBearbeitungBedienung()

  registriere(/^#\/workboard$/, 'workboard', () => {
    const vorher = gewaehlteId
    schliesseDetail()
    betreteSeite()
    // Während das Detail offen war, hat der Poll Board bzw. Liste nicht nachgeführt.
    if (aktiverTab === 'board') renderBoard()
    else renderListe()
    uebersichtZuletzt = true
    if (vorher !== null) fokussiereEintrag(vorher)
  })
  registriere(/^#\/workboard\/([^/]+)$/, 'workboard', (id) => {
    if (gewaehlteId !== id) detailAusUebersicht = uebersichtZuletzt
    uebersichtZuletzt = false
    betreteSeite()
    ladeDetail(id)
  })
  // Verlassen der Seite: das nächste Betreten lädt neu. Maßgeblich ist, ob die Seite nach dem
  // Routing noch sichtbar ist (setTimeout: erst nachdem der Router dispatcht hat) — ein Wechsel
  // Board ↔ Detail bleibt ohne erneuten Abruf. (Die frühere überlagerte Route #/chat gibt es seit
  // F44 WS-8a nicht mehr; #/chat blendet das Board aus.)
  window.addEventListener('hashchange', () => {
    // F-926: jede andere Route beendet den Merker „zuletzt die Übersicht“.
    if (location.hash !== '#/workboard') uebersichtZuletzt = false
    setTimeout(() => {
      if (document.getElementById('view-workboard').hidden) seiteAktiv = false
    }, 0)
  })

  abonniere((zustand) => {
    letzterZustand = zustand
    if (!seiteAktiv) return
    // Nur der sichtbare Bereich; der andere wird beim Register- bzw. Detailwechsel ohnehin gebaut.
    // Im Detail rendert ein Tick neu; geladen werden Schritte und Abnahme nur beim Bestimmen des Ablaufs
    // und bei Übergängen (pruefeDetailNachtrag: Phase, Halt, laufender Schritt, Abnahmestand).
    if (gewaehlteId !== null) renderDetailNachtrag()
    else if (aktiverTab === 'board') renderBoard()
    else renderListe()
  })
  abonniereDetailAuffrischer(() => {
    void aktualisiereBearbeitungsZustand()
  })
  // F46 D4: ein neuer Code-Stand (Laden beim Öffnen, „Aktualisieren“ auf #/code, Projektwechsel) zeichnet ein
  // offenes Detail neu — „Pull Requests“, VS-Code-Pfad und der Block „Sichern“ hängen daran.
  abonniereCodeStand(() => {
    if (seiteAktiv && gewaehlteId !== null) renderDetailNachtrag()
  })

  // F44 WS-1a (F-860): beim Projektwechsel allen projektgebundenen Zustand verwerfen. Neu geladen
  // wird nur bei offener Seite; sonst lädt das nächste Betreten (F-920, F44 WS-3b). Register, Filter
  // und Suche gehen auf den Anfang zurück (die Optionen stammen aus dem alten Projekt). Ein offenes
  // Detail samt Click-to-Work-Zustand gehört zum alten Projekt und wird geschlossen — sonst fragte der Detail-Auffrischer dessen workflowId über den neuen Präfix ab
  // (Fehlerklasse F26 im Chat). Späte Antworten des alten Projekts verwirft der Überholschutz.
  abonniereProjektWechsel(ladeNachProjektWechsel)
}

/**
 * F44 WS-1a (F-860): Neuladen-Hook der Seite beim Projektwechsel (siehe initWorkboardView).
 * F-920 (F44 WS-3b): Ist die Seite nicht offen, wird nur zurückgesetzt — Workitems und Aufträge
 * gelten als „lädt“, die Zähler verwerfen späte Antworten des alten Projekts, und das nächste
 * Betreten (betreteSeite) lädt. Bei offener Seite lädt der Hook sofort.
 */
function ladeNachProjektWechsel() {
  schliesseDetail()
  bearbeitungsZustand = null
  // Unbedingt leeren, auch wenn der Zwischenspeicher schon leer meint (etwa nach einem fremden Eingriff in den Bereich).
  letztesBearbeitungsHtml = null
  schreibeBearbeitung('')
  letzterZustand = undefined
  letzteWorkitems = []
  renderBefunde(null)
  if (!seiteAktiv) {
    alleAnfrageZaehler++
    auftraegeAnfrageZaehler++
    alleWorkitems = undefined
    alleFehler = null
    auftraege = undefined
  }
  wechsleTab('board')
  if (seiteAktiv) ladeSeite()
  // F-923 (F44 WS-4a): Stand der Hash auf einem Detail des alten Projekts, geht er ohne neuen
  // History-Eintrag auf die Übersicht — ein Neuladen öffnete sonst dieselbe ID im neuen Projekt
  // (gleiche IDs sind zwischen Projekten üblich). Die Route #/workboard lädt nicht erneut (betreteSeite).
  if (/^#\/workboard\/[^/]+$/.test(location.hash)) ersetzeRoute('#/workboard')
}
