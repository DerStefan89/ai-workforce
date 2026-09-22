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
 * F29 WS-1b: reine Stylingumstellung auf das in WS-1a gebaute Klassenvokabular
 * (Karten, .list-row, .badge, .detail-block, .btn/.btn-primary) — Filter,
 * Bearbeitung und Freigabe-Workflow verhalten sich unverändert, nur die
 * Zeilen/Detailblöcke sind keine <table> mehr.
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
 *
 * F22 WS-2: "Bearbeiten" an einem Finding (NUR quelle === 'finding' —
 * Feature-Akten bleiben rein lesend, F23-Scope) legt über legeAuftragAn
 * einen Auftrag mit der Referenzzeile `workitem:finding:<id>` an
 * (WORKITEM_REFERENZ_MUSTER, scripts/leitstand-server.mjs) und routet ihn
 * sofort (routeAuftrag). Der Fortschritt (routet…/Vorschlag/Kette/
 * Terminal-Block) rendert in #workboard-bearbeitung, einem von
 * #workboard-detail-inhalt getrennten Container (Muster #workflow-bedienung
 * in views/workflows.js), damit ein stilles Nachrendern der Finding-Tabelle
 * (siehe ladeWorkitems) den Bearbeitungszustand nicht mitreißt. Polling
 * hängt als Detail-Auffrischer am einen Poll-Timer aus zustand.js (F20 WS-2,
 * kein eigener Timer) und läuft nur, solange genau dieses Workitem-Detail
 * offen ist (gewaehlteId-Gate, Muster ladeWorkflowDetail).
 */

import { holeAbnahme, holeLaufDetail, holeRoadmap, holeRollenBesetzung, holeWorkflowDetail, holeWorkitems, legeAuftragAn, routeAuftrag, sendeWorkflowFreigabe } from '../api.js'
import { escapeHtml, formatiereZeitpunkt } from '../render.js'
import { holeAktivesProjekt } from '../projekt-kontext.js'
import { filtereAttentionWorkflows } from '../attention-daten.js'
import { navigiere, registriere } from '../router.js'
import { abonniere, abonniereDetailAuffrischer, pollJetzt } from '../zustand.js'
import { merkeGeoeffnet } from '../zuletzt-geoeffnet.js'

/** Zuletzt vom Server geladene (bereits serverseitig gefilterte) Liste. */
let letzteWorkitems = []

/** true, sobald die Filter-Selects aus der ersten ungefilterten Antwort befüllt wurden. */
let optionenBefuellt = false

/** id des aktuell offenen Detail-Panels, oder null — erlaubt einen stillen Inhalts-Refresh, sobald letzteWorkitems nachträglich eintrifft (siehe ladeWorkitems). */
let gewaehlteId = null

/** Zähler gegen überholte Antworten (Muster views/workflows.js workflowRenderZaehler): ein schneller zweiter Filterwechsel darf die Anzeige nicht mit der Antwort des ERSTEN, langsameren Requests überschreiben. */
let anfrageZaehler = 0

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

/** Letztes Zustands-Aggregat aus dem Poll (zustand.js) — hier nur für zustand.startfehler gebraucht (AK3-Zustand "routet…" endet auch bei einem Startfehler zu genau diesem Lauf, nicht nur bei 200 vom Workflow-Detail). F29 WS-D1: dieselbe Abonnierung speist zusätzlich die Bento-Übersicht (renderBento, unten) — kein zweiter Poll-Abnehmer. */
let letzterZustand = null

/**
 * F29 WS-D1 (Auftrag Punkt 4): ungefilterte Workitem-Liste für die
 * Fortschritt-Donut — getrennt von letzteWorkitems, das die AKTUELL
 * GEFILTERTE Liste hält (Filterwechsel oben). Eine Fortschrittszahl über nur
 * die gefilterte Teilmenge wäre irreführend beschriftet ("Projekt
 * Fortschritt", nicht "gefilterter Fortschritt"). Gesetzt in ladeWorkitems(),
 * genau dann, wenn kein Filter aktiv ist (Muster befuelleFilterOptionen).
 */
let alleWorkitemsUngefiltert = []

/**
 * F33 WS-2: zuletzt geladene Roadmap-Projektion (GET /api/roadmap), oder null vor dem ersten
 * Abruf. Getrennt von letzteWorkitems/alleWorkitemsUngefiltert, weil sie über einen eigenen
 * Endpunkt kommt — Muster: nur beim Öffnen/Aktualisieren des Workboards geladen (ladeRoadmap()),
 * NICHT im 2s-Poll (renderBento() liest hier nur, ruft nie holeRoadmap() auf). roadmap.json
 * ändert sich nur durch Commits, wie state/findings.md/features/<id>/feature.md (siehe
 * alleWorkitemsUngefiltert-Kommentar oben).
 */
let letzteRoadmap = null

/**
 * F29 WS-D2 (Auftrag Punkt C): Cache der Zusatzdaten des Fokus-Workflows — Schritte
 * (holeWorkflowDetail), Abnahme-Erlaubt-Flags (holeAbnahme) und der gerade aktive Lauf
 * (holeLaufDetail, für "Aktuelle Aufgabe"/"Laufzeit"/"Start"). Ein erneuter Abruf läuft nur an,
 * wenn der gewählte Fokus-Workflow wechselt (D5: die Oberfläche fragt den Server, statt selbst zu
 * spekulieren), nicht bei jedem 2-Sekunden-Poll-Tick — s. aktualisiereFokusCache().
 * aktivLauf.aufgabe/-.startZeit kommen aus dem LETZTEN Checkpoint des aktiven Laufs (Muster
 * views/runs.js checkpointZeile: lineage.beschreibung) bzw. dessen ERSTEM (Startzeitpunkt) — echte,
 * bereits vorhandene Felder, keine neue Berechnung.
 */
let fokusCache = { workflowId: null, schritte: null, workflowStatus: null, freigabeHalt: null, aktivLauf: null }

/** F29 WS-D2 (Auftrag Punkt C): rollenvertrag.zweck je Rolle (GET /api/ressourcen/rollen/<rolle>, F24) — echte Kurzbeschreibung für die Pipeline-Knoten, gecacht (Rollenverträge ändern sich nicht zur Laufzeit), ein Eintrag pro tatsächlich vorkommender Rolle. */
const rollenZweckCache = new Map()

/**
 * Ordnet den Status eines Workitems einer der drei bestehenden .badge-Modifikatorklassen zu
 * (ok/aktiv/neutral) — für den Statuspunkt in Listenzeile und Detail-Kopf (F29 WS-1b, Referenz-
 * Vorlage "Statuspunkt+Text"). Kein neues Farbvokabular: fehler/stale bleiben echten
 * Fehlern/veralteten Ständen vorbehalten (siehe .badge-Nutzung anderswo im Leitstand).
 * @param workitem - ein Workitem (Finding oder Feature-Akte)
 * @returns 'ok' | 'aktiv' | 'neutral'
 */
function statusKategorie(workitem) {
  if (workitem.status === 'ERLEDIGT' || workitem.status === 'ABGESCHLOSSEN') return 'ok'
  if (workitem.status === 'OFFEN' || workitem.status === 'FEATURE_GATE') return 'aktiv'
  return 'neutral'
}

/** Statustext einer Zeile/eines Kopfs — Findings zeigen zusätzlich den Rohwert aus state/findings.md (Dateikopf, unterschiedliches Vokabular je Quelle). @param workitem - ein Workitem @returns Statustext, bereits escaped */
function statusText(workitem) {
  return workitem.quelle === 'finding' ? `${escapeHtml(workitem.status)} (${escapeHtml(workitem.statusRoh)})` : escapeHtml(workitem.status)
}

function workitemZeile(workitem) {
  const prioritaetBadge = workitem.quelle === 'finding' ? `<span class="badge">${escapeHtml(workitem.prioritaet)}</span>` : ''
  return `<div class="list-row workboard-zeile" data-id="${escapeHtml(workitem.id)}">
    <span class="status-punkt ${statusKategorie(workitem)}" aria-hidden="true"></span>
    <div class="workboard-zeile-haupt">
      <p class="workboard-zeile-titel">${escapeHtml(workitem.titel)}</p>
      <p class="workboard-zeile-meta"><code>${escapeHtml(workitem.id)}</code> · ${statusText(workitem)}</p>
    </div>
    <span class="badge">${escapeHtml(workitem.typ)}</span>
    ${prioritaetBadge}
  </div>`
}

function renderListe(workitems) {
  document.getElementById('workboard-liste').innerHTML =
    workitems.length === 0 ? '<p class="leer">Keine Workitems für diese Filter.</p>' : workitems.map(workitemZeile).join('')
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

/**
 * Befüllt eine Filter-Chip-Gruppe (Auftrag Punkt C, "Filter-Chips statt Selects", Muster
 * 04-findings.png), ohne eine bereits gewählte, weiterhin gültige Auswahl zu verlieren. Ein Chip
 * ist EIN <button data-wert> je Wert plus ein fester "Alle"-Chip zuerst; aria-pressed trägt den
 * Auswahlzustand (Muster .chat-umschalter/aria-pressed) statt eines <select>.
 * @param id - Container-Element-id @param werte - erlaubte Werte, aus der ungefilterten Liste abgeleitet
 */
function fuelleChipGruppe(id, werte) {
  const gruppe = document.getElementById(id)
  const aktuellerWert = gruppe.querySelector('[data-wert][aria-pressed="true"]')?.dataset.wert ?? ''
  const neuerWert = werte.includes(aktuellerWert) ? aktuellerWert : ''
  gruppe.innerHTML =
    `<button type="button" class="filter-chip" data-wert="" aria-pressed="${neuerWert === '' ? 'true' : 'false'}">Alle</button>` +
    werte.map((w) => `<button type="button" class="filter-chip" data-wert="${escapeHtml(w)}" aria-pressed="${w === neuerWert ? 'true' : 'false'}">${escapeHtml(w)}</button>`).join('')
}

/** Leitet die drei Filter-Optionen aus den tatsächlich vorkommenden Werten der ungefilterten Liste ab — kein hart codiertes Vokabular (siehe Dateikopf). @param workitems - ungefilterte Liste aus der ersten Antwort */
function befuelleFilterOptionen(workitems) {
  fuelleChipGruppe('workboard-filter-typ', [...new Set(workitems.map((w) => w.typ))].sort())
  fuelleChipGruppe('workboard-filter-status', [...new Set(workitems.map((w) => w.status))].sort())
  fuelleChipGruppe(
    'workboard-filter-prioritaet',
    [...new Set(workitems.filter((w) => w.quelle === 'finding').map((w) => w.prioritaet))].sort()
  )
  optionenBefuellt = true
}

/** @param id - Chip-Gruppen-Container-id @returns der aktuell gewählte Wert, oder '' für "Alle" */
function gewaehlterChipWert(id) {
  return document.getElementById(id).querySelector('[data-wert][aria-pressed="true"]')?.dataset.wert ?? ''
}

function aktuelleFilter() {
  const filter = {}
  const typ = gewaehlterChipWert('workboard-filter-typ')
  const status = gewaehlterChipWert('workboard-filter-status')
  const prioritaet = gewaehlterChipWert('workboard-filter-prioritaet')
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
      alleWorkitemsUngefiltert = []
      renderBento()
      return
    }
    letzteWorkitems = antwort.workitems
    if (Object.keys(filter).length === 0) {
      // F29 WS-D1: Grundlage der Fortschritt-Donut — nur bei einem UNGEFILTERTEN Abruf aktuell
      // gehalten (Datei-Kommentar alleWorkitemsUngefiltert), unabhängig von optionenBefuellt (auch
      // ein "Neu laden" ohne aktiven Filter soll die Zahl auffrischen können).
      alleWorkitemsUngefiltert = antwort.workitems
    }
    if (!optionenBefuellt && Object.keys(filter).length === 0) {
      befuelleFilterOptionen(antwort.workitems)
    }
    renderBefunde(antwort.befunde)
    renderListe(antwort.workitems)
    if (gewaehlteId !== null) renderDetailInhalt(gewaehlteId)
    renderBento()
  } catch (fehler) {
    if (meineAnfrageNummer !== anfrageZaehler) return
    container.innerHTML = `<p class="fehler">Anfrage fehlgeschlagen: ${escapeHtml(fehler.message)}</p>`
    renderBefunde(null)
    letzteWorkitems = []
  }
}

/** Überholschutz für ladeRoadmap (Muster anfrageZaehler/ladeWorkitems oben) — ein schneller zweiter "Neu laden"-Klick, während der erste Abruf noch unterwegs ist, darf dessen später eintreffende, aber veraltete Antwort nicht mehr übernehmen. */
let roadmapAnfrageZaehler = 0

/**
 * Lädt GET /api/roadmap (F33 WS-2) — aufgerufen beim Öffnen des Workboards und bei "Neu laden",
 * NIE aus dem Poll (Dateikopf letzteRoadmap). Ein Netzwerkfehler VOR dem ersten Erfolg zeigt einen
 * sichtbaren Fehlerhinweis (bentoRoadmapKarte, status 'fehler' — ein reiner Client-Sentinel, kein
 * Server-Status) statt dauerhaft "Lädt…" stehen zu bleiben (QA-Pass-Befund: ein hängender/
 * fehlschlagender fetch, F-561, wäre sonst unsichtbar); ein Fehler NACH einem bereits erfolgreich
 * geladenen Stand bleibt bewusst beim alten Stand (kein Zurücksetzen auf einen Fehlerzustand wegen
 * eines einzelnen Ausreißers), aber immerhin geloggt.
 */
async function ladeRoadmap() {
  const meineAnfrageNummer = ++roadmapAnfrageZaehler
  try {
    const antwort = await holeRoadmap()
    if (meineAnfrageNummer !== roadmapAnfrageZaehler) return
    letzteRoadmap = antwort
  } catch (fehler) {
    if (meineAnfrageNummer !== roadmapAnfrageZaehler) return
    console.error('GET /api/roadmap fehlgeschlagen:', fehler)
    if (letzteRoadmap === null) letzteRoadmap = { status: 'fehler' }
  }
  renderBento()
}

function findeWorkitem(id) {
  return letzteWorkitems.find((w) => w.id === id) ?? null
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

function renderFeatureDetail(workitem) {
  return `<div class="detail-block">
    <h3>${escapeHtml(workitem.titel)}</h3>
    <p><code>${escapeHtml(workitem.id)}</code> · <span class="status-punkt ${statusKategorie(workitem)}" aria-hidden="true"></span> ${escapeHtml(workitem.status)}</p>
  </div>
  <div class="detail-block"><h3>Pfad</h3><p><code>${escapeHtml(workitem.pfad)}</code></p></div>
  <p class="hinweis">Nur lesend — Bearbeitung einer Feature-Akte ist F23-Scope.</p>`
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

/** Rendert #workboard-bearbeitung für workitem — Bearbeiten-Knopf (nur Findings, ohne offenen Bearbeitungszustand), den laufenden Zustand, oder nichts (Feature-Akten, F23-Scope). @param workitem - das aktuell im Detail-Panel gezeigte Workitem */
function renderBearbeitungsAbschnitt(workitem) {
  const container = document.getElementById('workboard-bearbeitung')
  if (workitem.quelle !== 'finding') {
    container.innerHTML = ''
    return
  }
  if (bearbeitungsZustand === null || bearbeitungsZustand.workitemId !== workitem.id) {
    container.innerHTML = `<button id="workboard-bearbeiten" class="btn btn-primary" data-id="${escapeHtml(workitem.id)}">Bearbeiten</button>`
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

/** Klick auf "Bearbeiten": legt den Auftrag an (mit Referenzzeile, baueAuftragstext) und routet ihn sofort. Arbeitet auf einem lokal eingefangenen zustand-Objekt (siehe pruefeUndUebernimmZustand) — ein Workitem-Wechsel während der Requests darf weder auf ein inzwischen anderes bearbeitungsZustand schreiben noch werfen. @param workitem - das geklickte Finding */
async function starteBearbeitung(workitem) {
  const zustand = { workitemId: workitem.id, phase: 'wird_angelegt', auftragId: null, laufId: null, workflowId: null, meldung: null, workflowDetail: null }
  bearbeitungsZustand = zustand
  renderBearbeitungsAbschnitt(workitem)
  try {
    const auftragAntwort = await legeAuftragAn({ titel: workitem.titel, auftragstext: baueAuftragstext(workitem) })
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
    await verarbeiteRoutenAntwort(await routeAuftrag(auftragInhalt.auftragId), workitem, zustand)
  } catch (fehler) {
    zustand.phase = 'fehler'
    zustand.meldung = `Anfrage fehlgeschlagen: ${fehler.message}`
    if (pruefeUndUebernimmZustand(workitem, zustand)) renderBearbeitungsAbschnitt(workitem)
  }
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
  zustand.phase = 'wird_gestartet'
  renderBearbeitungsAbschnitt(workitem)
  try {
    const antwort = await sendeWorkflowFreigabe(zustand.workflowId, { schrittId, entscheidung: 'FREIGEGEBEN', begruendung: FREIGABE_BEGRUENDUNG_STANDARD })
    const inhalt = await antwort.json().catch(() => ({}))
    if (!antwort.ok) {
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
    document.getElementById('workboard-bearbeitung').innerHTML = ''
    return
  }
  inhalt.innerHTML = workitem.quelle === 'finding' ? renderFindingDetail(workitem) : renderFeatureDetail(workitem)
  renderBearbeitungsAbschnitt(workitem)
}

/** Öffnet das Detail-Panel für id (Routen-Eintritt `#/workboard/<id>`) — merkt sich id für den stillen Nachtrag aus ladeWorkitems() (siehe renderDetailInhalt). F22 WS-2: ein bearbeitungsZustand eines ANDEREN Workitems wird verworfen — nur ein Wiederöffnen DESSELBEN Findings behält seinen Fortschritt (siehe bearbeitungsZustand-Kommentar). */
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

/** F29 WS-D2 (Auftrag Punkt C): Klick-Delegation für die Filter-Chips (löst den früheren 'change'-Handler auf <select> ab) — ein Klick markiert innerhalb SEINER Gruppe genau einen Chip als gewählt (Radio-Verhalten, Muster aria-pressed) und lädt danach neu. */
function initFilterBedienung() {
  document.getElementById('workboard-filter').addEventListener('click', (ereignis) => {
    const chip = ereignis.target.closest('.filter-chip')
    if (chip === null) return
    for (const geschwister of chip.parentElement.querySelectorAll('.filter-chip')) {
      geschwister.setAttribute('aria-pressed', String(geschwister === chip))
    }
    void ladeWorkitems()
  })
  document.getElementById('workboard-neu-laden').addEventListener('click', () => {
    void ladeWorkitems()
    void ladeRoadmap()
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

/** Klick-Delegation für #workboard-bearbeitung (F22 WS-2): Bearbeiten/Wiederholen/Freigeben/Ablehnen — ein Container statt vier eigener Listener, Muster #workflow-bedienung in views/workflows.js. */
function initBearbeitungBedienung() {
  document.getElementById('workboard-bearbeitung').addEventListener('click', (ereignis) => {
    const bearbeitenKnopf = ereignis.target.closest('#workboard-bearbeiten')
    if (bearbeitenKnopf) {
      const workitem = findeWorkitem(bearbeitenKnopf.dataset.id)
      if (workitem !== null) void starteBearbeitung(workitem)
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

// ─── F29 WS-D1/D2: Bento-Übersicht (Auftrag Punkt 4 bzw. C) ────────────────
// NUR echte Daten aus dem bestehenden Zustands-Aggregat (zustand.js), den
// ohnehin geladenen Workitems (oben) und den zusätzlichen, gecachten
// Workflow-/Abnahme-/Lauf-Abrufen (fokusCache, s.o.) — keine erfundenen
// Zahlen, ein Leerzustand, wo eine Quelle (noch) nichts liefert.

/** Wählt den für die Übersicht relevantesten Workflow: zuerst einer, der auf eine menschliche Aktion wartet (dieselbe Regel wie attention-daten.js — D5, die Oberfläche entscheidet nichts selbst), sonst ein laufender, sonst der erste überhaupt. @param workflows - zustand.workflows @returns ein Workflow-Eintrag, oder null */
function waehleFokusWorkflow(workflows) {
  if (!Array.isArray(workflows) || workflows.length === 0) return null
  const wartend = filtereAttentionWorkflows(workflows)
  if (wartend !== null && wartend.length > 0) return wartend[0]
  return workflows.find((w) => w.status === 'LAEUFT') ?? workflows[0]
}

/** Der zuletzt aktualisierte Lauf für die Karte "Letzter Projektstand" — zeitpunkt ist ein ISO-Zeitstempel (Muster views/runs.js), Stringvergleich reicht. @param laeufe - zustand.laeufe @returns der jüngste Lauf, oder null */
function waehleLetztenLauf(laeufe) {
  if (!Array.isArray(laeufe) || laeufe.length === 0) return null
  return laeufe.reduce((juengster, lauf) => (lauf.zeitpunkt && (!juengster.zeitpunkt || lauf.zeitpunkt > juengster.zeitpunkt) ? lauf : juengster))
}

// ─── Icons (Inline-SVG, Muster index.html: fill="none" stroke="currentColor") ──────────────

const ICON_FOKUS = '<svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6" /><circle cx="12" cy="12" r="3" fill="currentColor" /></svg>'
const ICON_FORTSCHRITT = '<svg viewBox="0 0 24 24" focusable="false"><path d="M12 3a9 9 0 1 0 9 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /><path d="M12 3v9l6 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>'
const ICON_LETZTER_STAND = '<svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6" /><path d="M8 12.5l2.5 2.5L16 9.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>'
const ICON_UEBERSICHT = '<svg viewBox="0 0 24 24" focusable="false"><rect x="3.5" y="4" width="17" height="4.5" rx="1" fill="none" stroke="currentColor" stroke-width="1.6" /><rect x="3.5" y="10" width="17" height="4.5" rx="1" fill="none" stroke="currentColor" stroke-width="1.6" /><rect x="3.5" y="16" width="17" height="4.5" rx="1" fill="none" stroke="currentColor" stroke-width="1.6" /></svg>'
const ICON_WORKFLOW = '<svg viewBox="0 0 24 24" focusable="false"><circle cx="5" cy="12" r="2.4" fill="none" stroke="currentColor" stroke-width="1.6" /><circle cx="12" cy="6" r="2.4" fill="none" stroke="currentColor" stroke-width="1.6" /><circle cx="12" cy="18" r="2.4" fill="none" stroke="currentColor" stroke-width="1.6" /><circle cx="19" cy="12" r="2.4" fill="none" stroke="currentColor" stroke-width="1.6" /><path d="M7 11l3-3.5M7 13l3 3.5M14 7.5l3 3M14 16.5l3-3" fill="none" stroke="currentColor" stroke-width="1.4" /></svg>'
const ICON_PROJEKT = '<svg viewBox="0 0 24 24" focusable="false"><path d="M4 6.5h6l1.6 2H20v9H4v-11Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" /></svg>'
const ICON_STATUS = '<svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6" /><path d="M12 7v5l3.5 2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>'
const ICON_START = '<svg viewBox="0 0 24 24" focusable="false"><path d="M8 5l11 7-11 7V5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" /></svg>'
const ICON_SCHRITT = '<svg viewBox="0 0 24 24" focusable="false"><path d="M4 12h6M14 12h6M10 12l2-2.5M10 12l2 2.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>'
const ICON_TEAM = '<svg viewBox="0 0 24 24" focusable="false"><circle cx="9" cy="8.5" r="2.6" fill="none" stroke="currentColor" stroke-width="1.6" /><circle cx="16.5" cy="10" r="2" fill="none" stroke="currentColor" stroke-width="1.6" /><path d="M4 19c0-2.8 2.2-5 5-5s5 2.2 5 5M14.5 15.2c2 .2 3.5 1.8 3.5 3.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>'
const ICON_CHEVRON = '<svg class="bento-chevron" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>'
const ICON_GLUEHBIRNE = '<svg viewBox="0 0 24 24" focusable="false"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.9v.2h5v-.2c0-.8.4-1.5 1-1.9A6 6 0 0 0 12 3Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" /></svg>'
const ICON_ZAHNRAD = '<svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.5" /><path d="M12 2.5v3M12 18.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>'
const ICON_LUPE = '<svg viewBox="0 0 24 24" focusable="false"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="1.6" /><path d="M15.5 15.5L21 21" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>'
const ICON_CODE = '<svg viewBox="0 0 24 24" focusable="false"><path d="M8 8l-5 4 5 4M16 8l5 4-5 4M14 5l-4 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>'
const ICON_ROLLE_GENERISCH = '<svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="8" r="3.2" fill="none" stroke="currentColor" stroke-width="1.5" /><path d="M5 20c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>'

/** Meta-Kachel des Fokus-Panels (Icon + Label + Wert). @param icon - Inline-SVG @param label - Anzeigetext (Literal, kein escapeHtml nötig) @param wert - bereits escaptes Anzeige-HTML */
function bentoMetaKachel(icon, label, wert) {
  return `<div class="bento-meta-kachel"><span class="bento-meta-icon" aria-hidden="true">${icon}</span><div><p class="bento-meta-label">${label}</p><p class="bento-meta-wert">${wert}</p></div></div>`
}

/** Friedliche Anzeigetexte für workflow.status (F29 WS-D2, Auftrag Punkt E: kein rohes Enum in der UI, wo eine lesbare Alternative naheliegt). */
const WORKFLOW_STATUS_TEXT = { LAEUFT: 'Läuft', ABGESCHLOSSEN: 'Abgeschlossen', KLAERUNG_ERFORDERLICH: 'Klärung erforderlich', GESTOPPT: 'Gestoppt' }

function statusAnzeige(status) {
  return status ? (WORKFLOW_STATUS_TEXT[status] ?? status) : '—'
}

/** Anzeigetexte je Automaten-Verdikt (Muster LAGE_JE_AUSGANG, views/workflows.js — eigene, unabhängige Kopie: reine Anzeige, keine zweite Entscheidungsregel, D5 bleibt beim Server). */
const LAGE_PILL_TEXT = { starte: 'Bereit zum Start', haltFreigabe: 'Wartet auf Freigabe', haltKlaerung: 'Klärung nötig', haltGrenze: 'Grenze erreicht', haltGestoppt: 'Gestoppt', fertig: 'Abgeschlossen' }

/**
 * F29 WS-D2 (Auftrag Punkt C): Icon+Label je Rolle. Die Bildvorlage nennt
 * "Technical Challenger/Planner/Executor/QA/Code Reviewer/Result Evaluator"
 * — Rollennamen, die es in DIESEM System nicht gibt (die echten Rollen sind
 * architecture-advisor/ausfuehrung/qa/code-reviewer/router/scout/jarvis,
 * src/rollen/index.ts ROLLENVERTRAEGE). Zuordnung unten nach bestem
 * semantischem Fit (architecture-advisor prüft/challenged einen Plan wie
 * die "Technical Challenger"-Idee der Vorlage, ausfuehrung ⇒ Executor, qa/
 * code-reviewer decken sich direkt); "Planner"/"Result Evaluator" haben in
 * der Realität keine Entsprechung. Jede andere reale Rolle (router/scout/
 * jarvis/unbekannt) fällt bewusst auf den generischen Fall (Auftrag: "NIE
 * Platzhalterbuchstaben") — echte Rollen-ID statt einer erfundenen
 * Übersetzung. Bewusste Abweichung von der Bildvorlage, siehe Bericht.
 */
const ROLLEN_ICON = {
  'architecture-advisor': { icon: ICON_GLUEHBIRNE, label: 'Architecture Advisor' },
  ausfuehrung: { icon: ICON_ZAHNRAD, label: 'Ausführung' },
  qa: { icon: ICON_LUPE, label: 'QA' },
  'code-reviewer': { icon: ICON_CODE, label: 'Code Reviewer' },
}

function rollenAnzeige(rolle) {
  return ROLLEN_ICON[rolle] ?? { icon: ICON_ROLLE_GENERISCH, label: rolle }
}

/** Findet einen Schritt anhand seiner schritt_id in den gecachten Schritten des Fokus-Workflows. @param schritte - fokusCache.schritte @param schrittId - gesuchte schritt_id, oder null @returns der Schritt, oder null */
function findeSchritt(schritte, schrittId) {
  if (schrittId === null || !Array.isArray(schritte)) return null
  return schritte.find((s) => s.schritt_id === schrittId) ?? null
}

// ─── Karte "Aktueller Fokus" ────────────────────────────────────────────────

function bentoFokusKarte(projekt, workflow) {
  const kopf = `<div class="card-kopf"><span class="card-kopf-icon" aria-hidden="true">${ICON_FOKUS}</span><h3>Aktueller Fokus</h3></div>`
  if (workflow === null) {
    return `<div class="card bento-fokus">${kopf}<p class="bento-leer">Kein aktiver Workflow — Fokus liegt auf <strong>${escapeHtml(projekt.name)}</strong>.</p></div>`
  }
  const geladen = fokusCache.workflowId === workflow.workflowId
  const lage = workflow.naechster?.art ?? null
  const lageText = lage !== null ? (LAGE_PILL_TEXT[lage] ?? lage) : statusAnzeige(workflow.status)
  const beschreibung = workflow.grund ? `<p class="bento-fokus-beschreibung">${escapeHtml(workflow.grund)}</p>` : ''
  const aktiverSchritt = geladen ? findeSchritt(fokusCache.schritte, workflow.aktiverSchrittId) : null
  const teamGroesse = geladen && Array.isArray(fokusCache.schritte) ? String(new Set(fokusCache.schritte.map((s) => s.rolle)).size) : '—'
  const startWert = geladen && fokusCache.aktivLauf?.startZeit ? (formatiereZeitpunkt(fokusCache.aktivLauf.startZeit) ?? '—') : '—'
  return `<div class="card bento-fokus">
    ${kopf}
    <div class="bento-fokus-innenkarte">
      <span class="bento-fokus-icon" aria-hidden="true">${ICON_WORKFLOW}</span>
      <div class="bento-fokus-innenkarte-text">
        <div class="bento-fokus-zeile1">
          <span class="badge bento-id-chip">${escapeHtml(workflow.workflowId)}</span>
          <span class="badge aktiv">${escapeHtml(lageText)}</span>
        </div>
        <p class="bento-fokus-titel">${escapeHtml(workflow.ziel ?? workflow.workflowId)}</p>
        ${beschreibung}
      </div>
    </div>
    <div class="bento-meta-zeile">
      ${bentoMetaKachel(ICON_PROJEKT, 'Aktives Projekt', escapeHtml(projekt.name))}
      ${bentoMetaKachel(ICON_STATUS, 'Status', escapeHtml(statusAnzeige(workflow.status)))}
      ${bentoMetaKachel(ICON_START, 'Start', escapeHtml(startWert))}
      ${bentoMetaKachel(ICON_SCHRITT, 'Aktiver Schritt', aktiverSchritt ? escapeHtml(rollenAnzeige(aktiverSchritt.rolle).label) : '—')}
      ${bentoMetaKachel(ICON_TEAM, 'Team', escapeHtml(teamGroesse))}
    </div>
  </div>`
}

// ─── Karte "Letzter Projektstand" ───────────────────────────────────────────

/**
 * Sucht einen lesbaren Titel für lauf — bevorzugt das ziel des Fokus-Workflows, WENN dessen
 * gecachte Schritte genau diese lauf_id referenzieren (Auftrag: "Auftrag/Workflow-Name statt
 * roher Run-ID"). Ohne Treffer bleibt laufId selbst der Titel (Datenlage: es gibt keinen billigen,
 * generischen Rückweg von einer BELIEBIGEN laufId auf ihren Auftragsnamen ohne einen zusätzlichen
 * Abruf je Lauf) — bewusste, dokumentierte Grenze, siehe Bericht.
 * @param lauf - aus waehleLetztenLauf @param fokusWorkflow - der aktuelle Fokus-Workflow, oder null
 * @returns { titel, zeigeIdSekundaer }
 */
function ermittleLetzterStandTitel(lauf, fokusWorkflow) {
  if (fokusWorkflow !== null && fokusCache.workflowId === fokusWorkflow.workflowId && Array.isArray(fokusCache.schritte)) {
    const treffer = fokusCache.schritte.some((s) => s.lauf_id === lauf.laufId)
    if (treffer) return { titel: fokusWorkflow.ziel ?? lauf.laufId, zeigeIdSekundaer: true }
  }
  return { titel: lauf.laufId, zeigeIdSekundaer: false }
}

function bentoLetzterStandKarte(lauf, fokusWorkflow) {
  const kopf = `<div class="card-kopf"><span class="card-kopf-icon" aria-hidden="true">${ICON_LETZTER_STAND}</span><h3>Letzter Projektstand</h3></div>`
  if (lauf === null) {
    return `<div class="card bento-letzter-stand">${kopf}<p class="bento-leer">Noch kein Lauf vorhanden.</p></div>`
  }
  const { titel, zeigeIdSekundaer } = ermittleLetzterStandTitel(lauf, fokusWorkflow)
  const idZeile = zeigeIdSekundaer ? `<p class="bento-letzter-stand-id"><code>${escapeHtml(lauf.laufId)}</code></p>` : ''
  const zeitText = formatiereZeitpunkt(lauf.zeitpunkt)
  return `<div class="card bento-letzter-stand">
    ${kopf}
    <div class="bento-letzter-stand-zeile">
      <div class="bento-letzter-stand-text">
        <p class="bento-fokus-titel">${escapeHtml(titel)}</p>
        ${idZeile}
        <p class="hinweis">Ergebnis: ${escapeHtml(lauf.ergebnis ?? lauf.laufStatus?.status ?? 'unbekannt')} · ${lauf.anzahlCheckpoints} Checkpoint${lauf.anzahlCheckpoints === 1 ? '' : 's'}</p>
      </div>
      <p class="bento-letzter-stand-zeit">${zeitText ? escapeHtml(zeitText) : '<span class="unbekannt">Zeit unbekannt</span>'}</p>
    </div>
    <button type="button" class="btn bento-letzter-stand-oeffnen" data-lauf-id="${escapeHtml(lauf.laufId)}">Weiterarbeiten →</button>
  </div>`
}

// ─── Karte "Schnellzugriff" (Auftrag Punkt C: "im Stil von Projektübersicht") ──

function bentoSchnellzugriffKarte() {
  const kopf = `<div class="card-kopf"><span class="card-kopf-icon" aria-hidden="true">${ICON_UEBERSICHT}</span><h3>Schnellzugriff</h3></div>`
  const zeile = (hash, icon, label) =>
    `<button type="button" class="list-row bento-schnellzugriff-zeile" data-hash="${hash}"><span class="bento-meta-icon" aria-hidden="true">${icon}</span><span class="bento-schnellzugriff-label">${label}</span>${ICON_CHEVRON}</button>`
  return `<div class="card bento-schnellzugriff">
    ${kopf}
    ${zeile('#/runs', ICON_LETZTER_STAND, 'Runs')}
    ${zeile('#/capabilities', ICON_TEAM, 'Capabilities')}
    ${zeile('#/attention', ICON_STATUS, 'Attention')}
  </div>`
}

// ─── Karte "AI Workflow" ─────────────────────────────────────────────────────

/** F29 WS-D2-Korrektur: Modell-Chip eines Pipeline-Knotens — echter Wert aus schritt.worker/schritt.modell (dieselben Felder, die workflows.js bereits in seiner Tabelle zeigt), kein erfundener Wert. Fehlt eines der beiden Felder, zeigt der Chip "—" statt eines halben, irreführenden Werts. @param schritt - ein Eintrag aus daten.schritte @returns HTML-Fragment */
function pipelineSchrittModellChip(schritt) {
  const text = schritt.worker && schritt.modell ? `${schritt.worker} · ${schritt.modell}` : '—'
  return `<span class="pipeline-schritt-modell">${escapeHtml(text)}</span>`
}

/** Ein Pipeline-Knoten — Muster renderSchrittkette (oben), hier als Icon-Kreis mit Rollenname+Kurzbeschreibung statt eines <li>. @param schritt - ein Eintrag aus daten.schritte @param aktiverSchrittId - workflow.aktiverSchrittId (Cursor) @param faelligId - workflow.naechster?.schrittId (Server-Verdikt, D5) */
function pipelineSchritt(schritt, aktiverSchrittId, faelligId) {
  const { icon, label } = rollenAnzeige(schritt.rolle)
  const klasse = schritt.schritt_id === faelligId ? 'faellig' : schritt.schritt_id === aktiverSchrittId || schritt.status === 'ERFOLGREICH' ? 'erledigt' : ''
  const zweck = rollenZweckCache.get(schritt.rolle)
  const kurzbeschreibung = zweck ? `<span class="pipeline-schritt-kurz">${escapeHtml(zweck)}</span>` : ''
  return `<div class="pipeline-schritt ${klasse}">
    <span class="pipeline-schritt-kreis" aria-hidden="true">${icon}</span>
    <span class="pipeline-schritt-label">${escapeHtml(label)}</span>
    ${pipelineSchrittModellChip(schritt)}
    ${kurzbeschreibung}
  </div>`
}

/** Lädt rollenvertrag.zweck (GET /api/ressourcen/rollen/<rolle>, F24) für jede in schritte vorkommende, noch nicht gecachte Rolle nach — echte Kurzbeschreibung statt einer erfundenen. @param schritte - fokusCache.schritte */
async function ladeRollenZweckeNach(schritte) {
  const fehlende = [...new Set(schritte.map((s) => s.rolle))].filter((r) => !rollenZweckCache.has(r))
  if (fehlende.length === 0) return
  await Promise.all(
    fehlende.map(async (rolle) => {
      try {
        const antwort = await holeRollenBesetzung(rolle)
        if (!antwort.ok) {
          rollenZweckCache.set(rolle, null)
          return
        }
        const inhalt = await antwort.json()
        rollenZweckCache.set(rolle, inhalt.rollenvertrag?.zweck ?? null)
      } catch {
        rollenZweckCache.set(rolle, null)
      }
    })
  )
  renderBento()
}

/** Formatiert eine Dauer in Minuten seit start als "<n> Min" — Auftrag: "Laufzeit" aus echten Daten (aktivLauf.startZeit, fokusCache). @param startIso - ISO-Zeitstempel, oder null @returns lesbare Dauer, oder null ohne aktiven Lauf */
function formatiereLaufzeit(startIso) {
  if (!startIso) return null
  const start = Date.parse(startIso)
  if (Number.isNaN(start)) return null
  const minuten = Math.max(0, Math.round((Date.now() - start) / 60000))
  return `${minuten} Min`
}

/**
 * Erlaubt-Flags für die drei Aktionsbuttons — dieselbe Regel wie
 * renderAbnahmeEntscheidung (views/workflows.js): freigabeHalt sperrt alle
 * drei (die Abnahme ist erst nach der Freigabe im Bedienung-Block möglich),
 * sonst ANGENOMMEN nur bei ABGESCHLOSSEN, ABGELEHNT/ANPASSUNG_ANGEFORDERT
 * bei ABGESCHLOSSEN oder KLAERUNG_ERFORDERLICH. Eigene, unabhängige Kopie
 * (D5-Anzeigeregel, keine zweite Schreibimplementierung) — die eigentliche
 * Prüfung/Durchsetzung bleibt serverseitig (F23), diese Funktion entscheidet
 * nur, ob HIER ein deaktivierter Button mit Tooltip steht.
 */
function ermittleAbnahmeErlaubt() {
  if (fokusCache.freigabeHalt !== null) {
    return { angenommen: false, abgelehnt: false, anpassung: false, grund: `Wartet auf Freigabe für Schritt ${fokusCache.freigabeHalt.schrittId ?? ''} — siehe Workflow-Detail.` }
  }
  const status = fokusCache.workflowStatus
  const angenommen = status === 'ABGESCHLOSSEN'
  const abgelehnt = status === 'ABGESCHLOSSEN' || status === 'KLAERUNG_ERFORDERLICH'
  return { angenommen, abgelehnt, anpassung: abgelehnt, grund: `Workflow-Status '${status ?? 'unbekannt'}' erlaubt derzeit keine Abnahme-Entscheidung.` }
}

/** Ein Aktionsbutton der AI-Workflow-Leiste. @param klasse - zusätzliche CSS-Klasse (Farbe) @param aktion - ANGENOMMEN/ABGELEHNT/ANPASSUNG_ANGEFORDERT @param label - Beschriftung @param unterzeile - kleine Unterzeile @param erlaubt - false → disabled mit Tooltip @param grund - Tooltip-Text, wenn nicht erlaubt @param workflowId - Ziel-Workflow */
function bentoAktionButton(klasse, aktion, label, unterzeile, erlaubt, grund, workflowId) {
  const titelAttribut = erlaubt ? '' : ` title="${escapeHtml(grund)}"`
  return `<button type="button" class="btn bento-workflow-aktion ${klasse}" data-aktion="${aktion}" data-workflow-id="${escapeHtml(workflowId)}"${erlaubt ? '' : ' disabled'}${titelAttribut}>
    <span>${label}</span>
    <small>${unterzeile}</small>
  </button>`
}

function bentoAiWorkflowKarte(workflow) {
  const kopf = `<div class="card-kopf"><span class="card-kopf-icon" aria-hidden="true">${ICON_WORKFLOW}</span><h3>AI Workflow — ${workflow ? escapeHtml(statusAnzeige(workflow.status)) : 'kein aktiver Lauf'}</h3></div>`
  if (workflow === null) {
    return `<div class="card bento-ai-workflow">${kopf}<p class="bento-leer">Kein aktiver Workflow.</p></div>`
  }
  const geladen = fokusCache.workflowId === workflow.workflowId
  if (!geladen) {
    return `<div class="card bento-ai-workflow">${kopf}<p class="bento-leer">Lädt…</p></div>`
  }
  const schritte = fokusCache.schritte ?? []
  const faelligId = workflow.naechster?.schrittId ?? null
  const aktiverId = workflow.aktiverSchrittId ?? null
  const laufenderSchritt = schritte.find((s) => s.status === 'LAEUFT') ?? null
  const aktivBadge = laufenderSchritt ? `<span class="badge aktiv bento-ai-workflow-badge">${escapeHtml(rollenAnzeige(laufenderSchritt.rolle).label)} aktiv</span>` : ''
  const pipelineHtml =
    schritte.length === 0
      ? '<p class="unbekannt">Keine Schritte in dieser Fassung.</p>'
      : `<div class="pipeline">${schritte.map((s) => pipelineSchritt(s, aktiverId, faelligId)).join('')}</div>`
  const aufgabe = fokusCache.aktivLauf?.aufgabe ?? null
  const laufzeit = formatiereLaufzeit(fokusCache.aktivLauf?.startZeit ?? null)
  const erlaubt = ermittleAbnahmeErlaubt()
  return `<div class="card bento-ai-workflow">
    <div class="bento-ai-workflow-kopfzeile">${kopf}${aktivBadge}</div>
    <p class="hinweis">${escapeHtml(workflow.ziel ?? '')}</p>
    ${pipelineHtml}
    <div class="bento-ai-workflow-leiste">
      <span>Aktuelle Aufgabe: ${aufgabe ? escapeHtml(aufgabe) : '<span class="unbekannt">keine</span>'}</span>
      <span>Laufzeit: ${laufzeit ? escapeHtml(laufzeit) : '<span class="unbekannt">—</span>'}</span>
    </div>
    <div class="bento-ai-workflow-aktionen">
      ${bentoAktionButton('bento-aktion-ausgeben', 'ANGENOMMEN', 'Ausgeben', 'Ergebnisse übernehmen', erlaubt.angenommen, erlaubt.grund, workflow.workflowId)}
      ${bentoAktionButton('bento-aktion-anpassung', 'ANPASSUNG_ANGEFORDERT', 'Anpassung', 'Mit Hinweisen fortfahren', erlaubt.anpassung, erlaubt.grund, workflow.workflowId)}
      ${bentoAktionButton('bento-aktion-ablehnen', 'ABGELEHNT', 'Ablehnen', 'Lauf abbrechen / neu planen', erlaubt.abgelehnt, erlaubt.grund, workflow.workflowId)}
    </div>
  </div>`
}

// ─── Karte "Projekt Fortschritt" ─────────────────────────────────────────────

/** Zählt die (ungefilterten) Workitems nach Statuskategorie (dieselbe Zuordnung wie statusKategorie oben) — Grundlage der Fortschritt-Donut. @param workitems - alleWorkitemsUngefiltert */
function zaehleFortschritt(workitems) {
  const zaehler = { ok: 0, aktiv: 0, neutral: 0 }
  for (const w of workitems) zaehler[statusKategorie(w)]++
  return zaehler
}

function bentoFortschrittKarte(workitems) {
  const stand = formatiereZeitpunkt(new Date().toISOString())
  const kopf = `<div class="card-kopf"><span class="card-kopf-icon" aria-hidden="true">${ICON_FORTSCHRITT}</span><h3>Projekt Fortschritt</h3></div><p class="bento-fortschritt-stand">Stand: ${escapeHtml(stand ?? '')}</p>`
  if (workitems.length === 0) {
    return `<div class="card bento-fortschritt-karte">${kopf}<p class="bento-leer">Keine Workitems geladen.</p></div>`
  }
  const { ok, aktiv, neutral } = zaehleFortschritt(workitems)
  const anteil = Math.round((ok / workitems.length) * 100)
  return `<div class="card bento-fortschritt-karte">${kopf}
    <div class="bento-fortschritt">
      <div class="donut" style="--donut-anteil: ${anteil}"><span class="donut-wert">${anteil}%</span></div>
      <ul class="bento-fortschritt-legende">
        <li><span class="status-punkt ok" aria-hidden="true"></span> Erledigt · ${ok}</li>
        <li><span class="status-punkt aktiv" aria-hidden="true"></span> Offen · ${aktiv}</li>
        <li><span class="status-punkt neutral" aria-hidden="true"></span> Sonstiges · ${neutral}</li>
      </ul>
    </div>
  </div>`
}

// ─── Karte "Roadmap" (F33 WS-2) ──────────────────────────────────────────────
// Zeigt die SICHTBARE Roadmap (GET /api/roadmap) — keine "Wo stehen wir?"-Antwort (die liefert
// bereits F40 über die Context-Builder-Einspeisung, features/F33/feature.md WS-2). Neutrale
// Hinweise statt Entwicklerprosa für nicht_vorhanden/ungueltig (F-476).

/** Ordnet einen Meilenstein-/Feature-Statuswert einer der vier bestehenden .badge-/.status-punkt-Modifikatorklassen zu — eigene, schmale Kopie (Muster LAGE_PILL_TEXT-Kommentar oben: reine Anzeige, keine zweite Entscheidungsregel). @param status - roher Status-String aus der Roadmap-Projektion @returns 'ok' | 'aktiv' | 'fehler' | 'neutral' */
function roadmapStatusKategorie(status) {
  if (status === 'ABGESCHLOSSEN') return 'ok'
  if (status === 'LAEUFT' || status === 'FEATURE_GATE' || status === 'IN_ARBEIT' || status === 'WORKSTREAM_SCHNITT_GENEHMIGT') return 'aktiv'
  if (status === 'BLOCKIERT' || status === 'ABGEBROCHEN') return 'fehler'
  return 'neutral'
}

/** Eine Feature-Zeile im hervorgehobenen aktuellen Meilenstein — Titel fehlt, wenn feature.md ihn nicht einfach lesbar trug (routen-roadmap.mjs). @param feature - { id, titel?, status } */
function roadmapFeatureZeile(feature) {
  const titel = feature.titel ? ` · ${escapeHtml(feature.titel)}` : ''
  return `<li><span class="status-punkt ${roadmapStatusKategorie(feature.status)}" aria-hidden="true"></span> <code>${escapeHtml(feature.id)}</code>${titel} <span class="badge">${escapeHtml(feature.status)}</span></li>`
}

/** Eine kollabierte Meilenstein-Zeile (alle außer dem aktuellen, hervorgehobenen) — eine Zeile je Meilenstein, ohne dessen Features. @param meilenstein - ein Eintrag aus roadmap.meilensteine */
function roadmapMeilensteinZeileKollabiert(meilenstein) {
  return `<li><span class="status-punkt ${roadmapStatusKategorie(meilenstein.status)}" aria-hidden="true"></span> <code>${escapeHtml(meilenstein.id)}</code> ${escapeHtml(meilenstein.titel)} <span class="badge">${escapeHtml(meilenstein.status)}</span></li>`
}

/**
 * Karte "Roadmap": der Meilenstein mit status LAEUFT hervorgehoben (Titel + Features mit
 * Status-Chips, Muster .bento-fokus-innenkarte), alle übrigen Meilensteine je eine kollabierte
 * Zeile. Kein LAEUFT-Meilenstein vorhanden (z. B. alles abgeschlossen) → nur die kollabierte
 * Liste, kein hervorgehobener Block. Mehrere LAEUFT-Meilensteine (vom Schema nicht ausgeschlossen,
 * F-592) → nur der erste wird hervorgehoben, der Rest erscheint in der kollabierten Liste, ohne
 * Warnhinweis (bekannte, dokumentierte Grenze). @param roadmap - letzteRoadmap (null vor dem
 * ersten Abruf, oder { status: 'fehler' } — Client-Sentinel eines fehlgeschlagenen Erstabrufs)
 */
function bentoRoadmapKarte(roadmap) {
  const kopf = `<div class="card-kopf"><span class="card-kopf-icon" aria-hidden="true">${ICON_UEBERSICHT}</span><h3>Roadmap</h3></div>`
  if (roadmap === null) {
    return `<div class="card bento-roadmap-karte">${kopf}<p class="bento-leer">Lädt…</p></div>`
  }
  if (roadmap.status === 'nicht_vorhanden') {
    return `<div class="card bento-roadmap-karte">${kopf}<p class="bento-leer">Keine Roadmap hinterlegt.</p></div>`
  }
  if (roadmap.status === 'ungueltig') {
    return `<div class="card bento-roadmap-karte">${kopf}<p class="fehler">Roadmap-Datei ungültig (${roadmap.fehler.length} Regelverstoß/-verstöße).</p></div>`
  }
  if (roadmap.status === 'fehler') {
    // Client-Sentinel (ladeRoadmap), kein Server-Status — GET /api/roadmap ist NICHT Teil des
    // gepollten /api/zustand-Aggregats, ein isolierter Fehlschlag dieses einen Endpunkts bliebe
    // ohne diesen Zweig unsichtbar (QA-Pass-Befund).
    return `<div class="card bento-roadmap-karte">${kopf}<p class="fehler">Roadmap konnte nicht geladen werden.</p></div>`
  }
  const aktueller = roadmap.meilensteine.find((m) => m.status === 'LAEUFT') ?? null
  const uebrige = roadmap.meilensteine.filter((m) => m !== aktueller)
  const featuresListe =
    aktueller !== null && aktueller.features.length === 0
      ? '<p class="bento-leer">Keine Features zugeordnet.</p>'
      : `<ul class="bento-roadmap-liste">${aktueller?.features.map(roadmapFeatureZeile).join('') ?? ''}</ul>`
  const aktuellerBlock =
    aktueller === null
      ? ''
      : `<div class="bento-fokus-innenkarte bento-roadmap-aktuell">
      <div class="bento-fokus-innenkarte-text">
        <div class="bento-fokus-zeile1"><span class="badge bento-id-chip">${escapeHtml(aktueller.id)}</span><span class="status-punkt ${roadmapStatusKategorie(aktueller.status)}" aria-hidden="true"></span></div>
        <p class="bento-fokus-titel">${escapeHtml(aktueller.titel)}</p>
        ${featuresListe}
      </div>
    </div>`
  const uebrigeBlock = uebrige.length === 0 ? '' : `<ul class="bento-roadmap-liste bento-roadmap-uebrige">${uebrige.map(roadmapMeilensteinZeileKollabiert).join('')}</ul>`
  return `<div class="card bento-roadmap-karte">${kopf}${aktuellerBlock}${uebrigeBlock}</div>`
}

// ─── Zusammenbau, Nachlade-Logik, Bedienung ─────────────────────────────────

/** Rendert die sechs Bento-Karten aus dem aktuellen Zustand (letzterZustand/alleWorkitemsUngefiltert/fokusCache/letzteRoadmap) — synchron, ruft am Ende ggf. den (asynchronen) Nachtrag an, wenn der Fokus-Workflow gewechselt hat. F33 WS-2: liest letzteRoadmap nur (kein holeRoadmap()-Aufruf hier) — die Karte "Roadmap" wird NICHT bei jedem Poll-Tick neu geladen, siehe ladeRoadmap(). */
function renderBento() {
  const container = document.getElementById('workboard-bento')
  const workflow = waehleFokusWorkflow(letzterZustand?.workflows ?? null)
  container.innerHTML =
    bentoFokusKarte(holeAktivesProjekt(), workflow) +
    bentoLetzterStandKarte(waehleLetztenLauf(letzterZustand?.laeufe ?? null), workflow) +
    bentoSchnellzugriffKarte() +
    bentoAiWorkflowKarte(workflow) +
    bentoFortschrittKarte(alleWorkitemsUngefiltert) +
    bentoRoadmapKarte(letzteRoadmap)
  void aktualisiereFokusCache(workflow)
}

/**
 * Lädt Schritte (GET /api/workflows/<id>), Abnahme-Erlaubt-Flags (GET .../abnahme) und den
 * gerade aktiven Lauf (GET /api/laeufe/<laufId>, für "Aktuelle Aufgabe"/"Laufzeit"/"Start") für den
 * Fokus-Workflow nach — nur, wenn dessen id seit dem letzten Rendern gewechselt hat, nicht bei
 * jedem 2-Sekunden-Poll-Tick. @param workflow - der aktuelle Fokus-Workflow, oder null
 */
async function aktualisiereFokusCache(workflow) {
  if (workflow === null) {
    fokusCache = { workflowId: null, schritte: null, workflowStatus: null, freigabeHalt: null, aktivLauf: null }
    return
  }
  if (fokusCache.workflowId === workflow.workflowId) return
  try {
    const [detailAntwort, abnahme] = await Promise.all([holeWorkflowDetail(workflow.workflowId), holeAbnahme(workflow.workflowId).catch(() => null)])
    if (!detailAntwort.ok) return
    const detailInhalt = await detailAntwort.json()
    const schritte = Array.isArray(detailInhalt.daten?.schritte) ? detailInhalt.daten.schritte : []

    let aktivLauf = null
    const laufenderSchritt = schritte.find((s) => s.status === 'LAEUFT' && typeof s.lauf_id === 'string')
    if (laufenderSchritt) {
      try {
        const laufAntwort = await holeLaufDetail(laufenderSchritt.lauf_id)
        if (laufAntwort.ok) {
          const laufDetail = await laufAntwort.json()
          const checkpoints = Array.isArray(laufDetail.checkpoints) ? laufDetail.checkpoints : []
          aktivLauf = {
            startZeit: checkpoints[0]?.zeitstempel ?? null,
            aufgabe: checkpoints[checkpoints.length - 1]?.lineage?.beschreibung ?? null,
          }
        }
      } catch {
        // Aktiver Lauf nicht ladbar — Start/Aufgabe/Laufzeit bleiben Leerzustand, kein Abbruch des restlichen Nachtrags.
      }
    }

    fokusCache = {
      workflowId: workflow.workflowId,
      schritte,
      workflowStatus: abnahme?.workflowStatus ?? workflow.status,
      freigabeHalt: abnahme?.freigabeHalt ?? null,
      aktivLauf,
    }
    renderBento()
    void ladeRollenZweckeNach(schritte)
  } catch {
    // Netzwerkfehler beim Nachtrag: der nächste Poll-Tick (2s) versucht es erneut, kein eigener Fehlerzustand (Muster aktualisiereBearbeitungsZustand).
  }
}

/**
 * F29 WS-D2 (Auftrag Punkt C): merkt sich, welche Abnahme-Aktion nach der Navigation zu
 * `#/workflows/<id>` dort vorgewählt werden soll — gelesen und sofort gelöscht von
 * beobachteAbnahmeVorschlag() unten. sessionStorage statt eines Hash-Parameters (Muster
 * projekt-kontext.js): router.js' Routenmuster für '#/workflows/<id>' ist `[^/]+` und würde einen
 * angehängten Parameter fälschlich als Teil der workflowId lesen.
 */
const ABNAHME_VORSCHLAG_SCHLUESSEL = 'leitstand-abnahme-vorschlag'

/**
 * Beobachtet den DOM NACH der Navigation zu '#/workflows/<id>', bis die (asynchron von
 * views/workflows.js geladene) Abnahme-Begründung erscheint, fokussiert sie dann und hebt den
 * zur gemerkten Aktion passenden Button optisch hervor (.abnahme-vorgewaehlt) — löst NICHTS aus,
 * klickt NICHTS automatisch (D5/Auftrag: "wählt vor", kein Auto-Submit). Bricht nach 8s ab (z. B.
 * eine ohnehin schon terminale Entscheidung ohne Begründungsfeld).
 */
function beobachteAbnahmeVorschlag() {
  const roh = sessionStorage.getItem(ABNAHME_VORSCHLAG_SCHLUESSEL)
  if (roh === null) return
  sessionStorage.removeItem(ABNAHME_VORSCHLAG_SCHLUESSEL)
  let vorschlag
  try {
    vorschlag = JSON.parse(roh)
  } catch {
    return
  }
  const start = Date.now()
  const beobachter = new MutationObserver(() => {
    const textarea = document.getElementById('wf-abnahme-begruendung')
    const button = document.querySelector(`.wf-abnahme-aktion[data-aktion="${vorschlag.aktion}"]`)
    if (textarea !== null) {
      beobachter.disconnect()
      textarea.focus()
      textarea.scrollIntoView({ behavior: 'smooth', block: 'center' })
      if (button !== null && !button.disabled) {
        button.classList.add('abnahme-vorgewaehlt')
        setTimeout(() => button.classList.remove('abnahme-vorgewaehlt'), 4000)
      }
      return
    }
    if (Date.now() - start > 8000) beobachter.disconnect()
  })
  beobachter.observe(document.getElementById('shell-hauptbereich'), { childList: true, subtree: true })
}

/** Klick-Delegation für die Bento-Karten: "Weiterarbeiten" (Letzter Stand), Schnellzugriff-Zeilen und die drei Abnahme-Aktionsbuttons — alle reine Navigation zu bestehenden Routen, kein neuer Schreibpfad hier (die eigentliche Abnahme bleibt views/workflows.js vorbehalten, s. beobachteAbnahmeVorschlag). */
function initBentoBedienung() {
  document.getElementById('workboard-bento').addEventListener('click', (ereignis) => {
    const laufKnopf = ereignis.target.closest('.bento-letzter-stand-oeffnen')
    if (laufKnopf) {
      merkeGeoeffnet({ typ: 'workflow', id: laufKnopf.dataset.laufId, label: laufKnopf.dataset.laufId, hash: `#/runs/${laufKnopf.dataset.laufId}`, statusKategorie: 'neutral' })
      navigiere(`#/runs/${encodeURIComponent(laufKnopf.dataset.laufId)}`)
      return
    }
    const schnellzugriffKnopf = ereignis.target.closest('.bento-schnellzugriff-zeile')
    if (schnellzugriffKnopf) {
      navigiere(schnellzugriffKnopf.dataset.hash)
      return
    }
    const aktionKnopf = ereignis.target.closest('.bento-workflow-aktion')
    if (aktionKnopf && !aktionKnopf.disabled) {
      const workflowId = aktionKnopf.dataset.workflowId
      sessionStorage.setItem(ABNAHME_VORSCHLAG_SCHLUESSEL, JSON.stringify({ workflowId, aktion: aktionKnopf.dataset.aktion }))
      merkeGeoeffnet({ typ: 'workflow', id: workflowId, label: workflowId, hash: `#/workflows/${workflowId}`, statusKategorie: 'aktiv' })
      navigiere(`#/workflows/${encodeURIComponent(workflowId)}`)
      beobachteAbnahmeVorschlag()
    }
  })
}

/** Initialisiert die Workboard-View einmalig beim Bootstrap: Bedienung, eigene Routen (Muster views/runs.js — app.js registriert #/workboard NICHT mehr zentral), erster ungefilterter Abruf. F22 WS-2: zusätzlich Bearbeitungs-Bedienung, letzterZustand-Cache (abonniere) und Detail-Auffrischer (abonniereDetailAuffrischer) — beide VOR initZustandPoll() in app.js registriert. F29 WS-D1/D2: dieselbe Abonnierung speist zusätzlich renderBento(). F33 WS-2: ladeRoadmap() läuft nur hier und bei "Neu laden" (initFilterBedienung) — NIE aus dem Poll. */
export function initWorkboardView() {
  initFilterBedienung()
  initListenBedienung()
  initBearbeitungBedienung()
  initBentoBedienung()

  registriere(/^#\/workboard$/, 'workboard', () => {
    schliesseDetail()
  })
  registriere(/^#\/workboard\/([^/]+)$/, 'workboard', (id) => {
    ladeDetail(id)
  })

  abonniere((zustand) => {
    letzterZustand = zustand
    renderBento()
  })
  abonniereDetailAuffrischer(() => {
    void aktualisiereBearbeitungsZustand()
  })

  renderBento()
  void ladeWorkitems()
  void ladeRoadmap()
}
