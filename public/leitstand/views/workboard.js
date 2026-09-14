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

import { holeWorkflowDetail, holeWorkitems, legeAuftragAn, routeAuftrag, sendeWorkflowFreigabe } from '../api.js'
import { escapeHtml } from '../render.js'
import { navigiere, registriere } from '../router.js'
import { abonniere, abonniereDetailAuffrischer, pollJetzt } from '../zustand.js'

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

/** Letztes Zustands-Aggregat aus dem Poll (zustand.js) — hier nur für zustand.startfehler gebraucht (AK3-Zustand "routet…" endet auch bei einem Startfehler zu genau diesem Lauf, nicht nur bei 200 vom Workflow-Detail). */
let letzterZustand = null

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
    return `<p class="fehler">${escapeHtml(zustand.meldung)}</p><button class="wb-wiederholen" data-id="${escapeHtml(workitem.id)}">Wiederholen</button>`
  }
  if (zustand.phase === 'fehler') {
    // Wiederholen nur, wenn der Auftrag bereits real angelegt ist (sonst gäbe es nichts, das
    // wiederholeRouten routen könnte) — Reviewer-/QA-Pass 14.09.2026: ohne diesen Knopf war
    // 'fehler' eine Sackgasse, ein erneutes "Bearbeiten" hätte einen zweiten Auftrag angelegt.
    const wiederholenKnopf = zustand.auftragId !== null ? `<button class="wb-wiederholen" data-id="${escapeHtml(workitem.id)}">Wiederholen</button>` : ''
    return `<p class="fehler">${escapeHtml(zustand.meldung)}</p>${wiederholenKnopf}`
  }
  if (zustand.phase === 'vorschlag') {
    return `<div class="unterabschnitt">
      <h3>Workflow-Vorschlag</h3>
      <p class="hinweis">Kontrolltiefe, Risikoklasse und Begründung liegen im Router-Ergebnis-Artefakt, das über keinen Lesepfad erreichbar ist (F-372) — ersatzweise die Schrittkette aus dem Vorschlag:</p>
      <p><strong>Ziel:</strong> ${escapeHtml(daten?.ziel ?? '')} — <strong>Workflow:</strong> <code>${escapeHtml(zustand.workflowId)}</code></p>
      ${renderSchrittkette(daten)}
      <div>
        <button class="wb-freigeben" data-id="${escapeHtml(workitem.id)}">Freigeben</button>
        <button class="wb-ablehnen" data-id="${escapeHtml(workitem.id)}">Ablehnen</button>
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
    container.innerHTML = `<button id="workboard-bearbeiten" data-id="${escapeHtml(workitem.id)}">Bearbeiten</button>`
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

/** Initialisiert die Workboard-View einmalig beim Bootstrap: Bedienung, eigene Routen (Muster views/runs.js — app.js registriert #/workboard NICHT mehr zentral), erster ungefilterter Abruf. F22 WS-2: zusätzlich Bearbeitungs-Bedienung, letzterZustand-Cache (abonniere) und Detail-Auffrischer (abonniereDetailAuffrischer) — beide VOR initZustandPoll() in app.js registriert. */
export function initWorkboardView() {
  initFilterBedienung()
  initListenBedienung()
  initBearbeitungBedienung()

  registriere(/^#\/workboard$/, 'workboard', () => {
    schliesseDetail()
  })
  registriere(/^#\/workboard\/([^/]+)$/, 'workboard', (id) => {
    ladeDetail(id)
  })

  abonniere((zustand) => {
    letzterZustand = zustand
  })
  abonniereDetailAuffrischer(() => {
    void aktualisiereBearbeitungsZustand()
  })

  void ladeWorkitems()
}
