/**
 * Datei: public/leitstand/views/workflows.js
 *
 * Zweck: Workflow-Ansicht und -Bedienung (F15 WS-3a/WS-3b), seit F20 WS-1
 * als eigenes Modul unter der View `#/runs` gemountet — es gibt keinen
 * eigenen Navigationspunkt für Workflows (F20 Ziel nennt Dashboard, Projekt,
 * Workboard, Runs, Capabilities), die Detailansicht ist über die Route
 * `#/workflows/<id>` direkt verlinkbar (AK2) und zeigt dabei die Runs-View.
 * Deckt zwei der sechs Bedienflüsse ab, die laut F20 AK1 real unverändert
 * funktionieren müssen: Freigabe/Stopp und Reparaturfassung. Seit F23 WS-2a
 * zusätzlich die Abnahme (ACCEPT/REJECT), seit WS-2b auch ADJUST bedienbar
 * (Freigabe-Halt danach als Hinweis statt der Abnahme-Schaltflächen).
 *
 * Die Oberfläche entscheidet dabei NICHTS selbst (D5). Was angeboten wird,
 * hängt an zwei Aussagen des Servers: naechster.art (das Verdikt von
 * ermittleNaechstenSchritt) und status. D13 (genau ein aktiver Lauf) wird
 * nicht vorhergesagt — kommt ein 409 zurück, steht sein Grundtext als
 * Meldung am Workflow.
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initWorkflowsView beim Bootstrap)
 *
 * F29 WS-2c: reine Stylingumstellung auf das Komponentenvokabular (.card für
 * Workflow-Listeneintrag/#workflow-detail, Muster .card.lauf aus
 * views/runs.js — je ein eigenständiges .card.workflow-Element, keine
 * verschachtelte Karte um #workflows-abschnitt; .btn/.btn-primary für die
 * Bedien-/Abnahme-/Reparatur-Schaltflächen). Markup-Struktur der an
 * scripts/check-f23-abnahme.mjs bzw. scripts/check-f15-workflow-oberflaeche.mjs
 * gebundenen Funktionen (renderAbnahme*, renderUrteil,
 * renderAenderungsuebersicht, aktualisiereAbnahme*, Bedien-/Reparaturlogik)
 * bleibt unangetastet, ebenso .workflow-lauf-verweis (bleibt bewusst ohne
 * .btn — Werteverweis in einer Tabellenzelle, keine Aktion). Keine
 * Verhaltensänderung, kein neues Farbpaar.
 *
 * Wichtig: Kein eigener Zustand, keine eigene Laufstatus-Ableitung — jede
 * Anzeige stammt direkt aus dem Server. Die Liste (renderWorkflows) kommt
 * seit F20 WS-2 aus dem Zustands-Aggregat (Abnehmer des einen Poll-Timers in
 * zustand.js); das Detail bleibt ein eigener Endpunktaufruf
 * (GET /api/workflows/<id>) und hängt als Detail-Auffrischer am selben
 * Timer, solange eines offen ist. #workflow-detail-inhalt wird bei jedem
 * Tick komplett ersetzt, #workflow-bedienung nur bei ECHTER
 * Zustandsänderung (Signatur-Vergleich, F-249) und #workflow-reparatur gar
 * nicht — der Entwurf gehört dem Menschen, bis er ihn einreicht oder
 * verwirft (F-249). #workflow-abnahme ist EIN WEITERER eigener Endpunktaufruf
 * (GET /api/workflows/<id>/abnahme, nicht Teil des Zustands-Aggregats) mit
 * demselben Signatur-Vergleich wie #workflow-bedienung (F23 WS-2a).
 */

import {
  holeAbnahme,
  holeLaufDetail,
  holeWorkflowDetail,
  reicheWorkflowFassungEin,
  sendeAbnahme,
  sendeWorkflowArchitekturEntscheidung,
  sendeWorkflowFreigabe,
  starteWorkflowSchritt,
  stoppeWorkflow,
  wiederholeWorkflowPruefung,
} from '../api.js'
import { escapeHtml } from '../render.js'
import { navigiere, registriere } from '../router.js'
import { abonniere, abonniereDetailAuffrischer, pollJetzt } from '../zustand.js'

/**
 * Die LAGE eines Workflows in einem Satz, je Ausgang von
 * ermittleNaechstenSchritt (löst F-253). Die Texte sind ANZEIGE, keine
 * Regel: welcher Ausgang vorliegt, hat der Server entschieden.
 */
const LAGE_JE_AUSGANG = {
  starte: 'bereit zum Start',
  haltFreigabe: 'wartet auf dich — Freigabe nötig',
  haltKlaerung: 'steht — Klärung nötig',
  haltGrenze: 'steht — Grenze erreicht',
  haltGestoppt: 'gestoppt',
  fertig: 'durchgelaufen',
}

/**
 * Übersetzt status und naechster in die angezeigte Lage. status hat VORRANG,
 * wenn er LAEUFT lautet (Auflösung einer Mehrdeutigkeit, siehe F-248/F-264 —
 * "läuft" heißt hier nur, dass der abgelegte Status LAEUFT lautet, nicht,
 * dass ein Lauf noch lebt).
 * @param status - daten.status bzw. workflow.status
 * @param naechster - Projektion aus dem Server, oder null bei ungültiger Fassung
 * @returns Lagetext
 */
function beschreibeLage(status, naechster) {
  if (naechster === null || naechster === undefined) return 'nicht bestimmbar — die Fassung validiert nicht'
  if (status === 'LAEUFT') return 'läuft'
  return LAGE_JE_AUSGANG[naechster.art] ?? `unbekannter Ausgang '${naechster.art}'`
}

/**
 * Eine Kopfdaten-Zeile aus GET /api/workflows. grund steht als eigene
 * Tabellenzeile (F-221 (a)) — bei KLAERUNG_ERFORDERLICH/GESTOPPT die einzige
 * Auskunft darüber, warum der Automat steht.
 * @param workflow - ein Eintrag aus GET /api/workflows
 * @returns HTML-Block für die Workflow-Liste
 */
function workflowKopfzeile(workflow) {
  const detailsButton = `<button class="btn workflow-details-btn" data-workflow-id="${escapeHtml(workflow.workflowId)}">Details</button>`
  const grundZeile = workflow.grund === null || workflow.grund === undefined ? '' : `<tr><th>Grund</th><td>${escapeHtml(workflow.grund)}</td></tr>`
  const faelligZusatz = workflow.naechster?.schrittId ? ` (<code>${escapeHtml(workflow.naechster.schrittId)}</code>)` : ''
  return `<section class="card workflow">
    <h3>${escapeHtml(workflow.workflowId)} ${detailsButton}</h3>
    <table class="lauf-kopfdaten">
      <tbody>
        <tr><th>Ziel</th><td>${escapeHtml(workflow.ziel ?? '')}</td></tr>
        <tr><th>Version</th><td>${escapeHtml(String(workflow.versionSequenz))}</td></tr>
        <tr><th>Status</th><td>${escapeHtml(workflow.status ?? '')}</td></tr>
        <tr><th>Lage</th><td>${escapeHtml(beschreibeLage(workflow.status, workflow.naechster))}${faelligZusatz}</td></tr>
        <tr><th>Aktiver Schritt (Cursor)</th><td>${workflow.aktiverSchrittId ? `<code>${escapeHtml(workflow.aktiverSchrittId)}</code>` : '<span class="unbekannt">kein Cursor</span>'}</td></tr>
        ${grundZeile}
        <tr><th>Schritte</th><td>${escapeHtml(String(workflow.schritteAnzahl))}</td></tr>
      </tbody>
    </table>
  </section>`
}

/** Rendert die Workflow-Liste aus dem Zustands-Aggregat (F20 WS-2) — Abnehmer des einen Poll-Timers in zustand.js, kein eigener fetch() mehr. @param workflows - zustand.workflows aus GET /api/zustand, oder null bei defekter Quelle */
function renderWorkflows(workflows) {
  const container = document.getElementById('workflows')
  if (workflows === null) {
    container.innerHTML = '<p class="unbekannt">Workflows nicht verfügbar (Quelle im Aggregat defekt).</p>'
    return
  }
  container.innerHTML = workflows.length === 0 ? '<p class="leer">Keine Workflows unter kontrollzustand/ gefunden.</p>' : workflows.map(workflowKopfzeile).join('')
}

/**
 * Bringt die Schritte in Planreihenfolge entlang der nachfolger-Kette. Der
 * Detailendpunkt validiert nicht (F-247): ein Zyklus, zwei Wurzeln oder eine
 * doppelt vergebene schritt_id kommen hier real an — der angehängte Rest
 * wird dann ausgewiesen statt still eingereiht.
 * @param schritte - daten.schritte aus GET /api/workflows/<id>
 * @returns je Schritt { schritt, inKette }, Kettenteil zuerst
 */
function ordneSchritteNachPlan(schritte) {
  const nachId = new Map()
  for (const s of schritte) if (!nachId.has(s.schritt_id)) nachId.set(s.schritt_id, s)
  const genannteNachfolger = new Set(schritte.map((s) => s.nachfolger).filter((n) => typeof n === 'string'))
  const kette = []
  const inKette = new Set()
  let aktuell = schritte.find((s) => !genannteNachfolger.has(s.schritt_id))
  while (aktuell !== undefined && !inKette.has(aktuell)) {
    inKette.add(aktuell)
    kette.push(aktuell)
    aktuell = typeof aktuell.nachfolger === 'string' ? nachId.get(aktuell.nachfolger) : undefined
  }
  return [...kette.map((schritt) => ({ schritt, inKette: true })), ...schritte.filter((s) => !inKette.has(s)).map((schritt) => ({ schritt, inKette: false }))]
}

/**
 * F-234: welche lauf_id gerade WIRKLICH fliegt, aus dem aktiv-Feld von
 * GET /api/laeufe/<laufId> (D13) — bewusst nicht aus dem Schrittstatus
 * abgeleitet. Gefragt wird nur für Schritte auf LAEUFT.
 * @param eintraege - Ergebnis von ordneSchritteNachPlan
 * @returns Menge der lauf_id, die der Server als aktiv meldet
 */
async function ermittleAktiveLaufIds(eintraege) {
  const aktive = new Set()
  for (const { schritt } of eintraege) {
    if (schritt.status !== 'LAEUFT' || typeof schritt.lauf_id !== 'string') continue
    try {
      const antwort = await holeLaufDetail(schritt.lauf_id)
      if (!antwort.ok) {
        console.error(`[leitstand] Aktivzustand von '${schritt.lauf_id}' nicht ermittelbar: HTTP ${antwort.status}`)
        continue
      }
      const detail = await antwort.json()
      if (detail.aktiv === true) aktive.add(schritt.lauf_id)
    } catch (fehler) {
      console.error(`[leitstand] Aktivzustand von '${schritt.lauf_id}' nicht ermittelbar: ${fehler.message}`)
    }
  }
  return aktive
}

/**
 * @param eintrag - ein { schritt, inKette } aus ordneSchritteNachPlan
 * @param aktiveLaufIds - Ergebnis von ermittleAktiveLaufIds
 * @param faelligId - naechster.schrittId aus dem Server, oder null (F-253)
 * @param cursorId - daten.aktiver_schritt_id, oder null
 * @returns Tabellenzeile der Schrittliste
 */
function workflowSchrittZeile(eintrag, aktiveLaufIds, faelligId = null, cursorId = null) {
  const { schritt } = eintrag
  const laeuftJetzt = typeof schritt.lauf_id === 'string' && aktiveLaufIds.has(schritt.lauf_id)
  const cursorMarke = cursorId !== null && schritt.schritt_id === cursorId ? ' <span class="badge" title="aktiver_schritt_id — der Cursor des Automaten">Cursor</span>' : ''
  const faelligMarke = faelligId !== null && schritt.schritt_id === faelligId ? ' <span class="badge aktiv" title="Der Server nennt genau diesen Schritt als nächsten (naechster.schrittId)">fällig</span>' : ''
  const laufVerweis =
    typeof schritt.lauf_id === 'string'
      ? `<button class="workflow-lauf-verweis" data-lauf-id="${escapeHtml(schritt.lauf_id)}">${escapeHtml(schritt.lauf_id)}</button>`
      : '<span class="unbekannt">kein Lauf</span>'
  const freigabeErteilt = schritt.freigabe_erteilt === undefined ? '—' : String(schritt.freigabe_erteilt)
  return `<tr>
    <td><code>${escapeHtml(schritt.schritt_id)}</code>${cursorMarke}${faelligMarke}${eintrag.inKette ? '' : ' <span class="badge fehler" title="Die nachfolger-Kette erreicht diesen Schritt nicht">außerhalb der Kette</span>'}</td>
    <td>${escapeHtml(schritt.rolle)}</td>
    <td>${escapeHtml(schritt.worker)}</td>
    <td>${escapeHtml(schritt.modell)}</td>
    <td>${escapeHtml(schritt.freigabe)} <span class="unbekannt">${schritt.freigabe === 'ZWINGEND' ? '(hält an)' : '(hält nicht an)'}</span></td>
    <td>${escapeHtml(freigabeErteilt)}</td>
    <td>${escapeHtml(schritt.status)}${laeuftJetzt ? ' <span class="badge aktiv">läuft jetzt</span>' : ''}</td>
    <td>${laufVerweis}</td>
    <td>${schritt.nachfolger ? `<code>${escapeHtml(schritt.nachfolger)}</code>` : '<span class="unbekannt">Ende</span>'}</td>
    <td>${escapeHtml(String(schritt.zeitgrenze_ms))}</td>
  </tr>`
}

const WORKFLOW_SCHRITT_TABELLE_KOPF = `<tr>
  <th>Schritt</th><th>Rolle</th><th>Worker</th><th>Modell</th><th>Freigabe</th><th>Freigabe erteilt</th>
  <th>Status</th><th>Lauf</th><th>Nachfolger</th><th>Zeitgrenze (ms)</th>
</tr>`

/**
 * @param daten - der WORKFLOW_V0-Datensatz aus GET /api/workflows/<id>
 * @param versionSequenz - Artefaktversion derselben Antwort
 * @param naechster - das Automaten-Verdikt derselben Antwort, oder null
 * @returns HTML-Block mit den Workflow-Feldern oberhalb der Schrittliste
 */
function renderWorkflowKopf(daten, versionSequenz, naechster) {
  const verdikt = naechster === null || naechster === undefined ? '<span class="unbekannt">nicht bestimmbar</span>' : `${escapeHtml(naechster.art)} — ${escapeHtml(naechster.grund)}`
  return `<div class="detail-block"><h3>Workflow</h3><table class="lauf-kopfdaten"><tbody>
    <tr><th>Ziel</th><td>${escapeHtml(daten.ziel ?? '')}</td></tr>
    <tr><th>Auftrag</th><td><code>${escapeHtml(daten.auftrag_id ?? '')}</code></td></tr>
    <tr><th>Version (Plan / Artefakt)</th><td>${escapeHtml(String(daten.version))} / ${escapeHtml(String(versionSequenz))}</td></tr>
    <tr><th>Lage</th><td>${escapeHtml(beschreibeLage(daten.status, naechster))}</td></tr>
    <tr><th>Verdikt des Automaten</th><td>${verdikt}</td></tr>
    <tr><th>Status</th><td>${escapeHtml(daten.status ?? '')}</td></tr>
    <tr><th>Aktiver Schritt (Cursor)</th><td>${daten.aktiver_schritt_id ? `<code>${escapeHtml(daten.aktiver_schritt_id)}</code>` : '<span class="unbekannt">kein Cursor</span>'}</td></tr>
    <tr><th>Grund</th><td>${daten.grund ? escapeHtml(daten.grund) : '<span class="unbekannt">kein Halt-Grund hinterlegt</span>'}</td></tr>
  </tbody></table></div>`
}

/**
 * F-247: eine Fassung, die nicht mehr gegen WORKFLOW_V0 validiert. Die
 * Schrittliste wird trotzdem gezeigt — sie anzusehen ist der erste Schritt
 * ihrer Reparatur.
 * @param verstoesse - string[] aus validiereWorkflowDaten
 * @returns HTML-Block
 */
function renderWorkflowUngueltig(verstoesse) {
  const liste = verstoesse.map((verstoss) => `<li>${escapeHtml(verstoss)}</li>`).join('')
  return `<div class="detail-block"><h3>Fassung ungültig</h3><p class="fehler">Diese Fassung validiert nicht gegen WORKFLOW_V0 — der Startendpunkt lehnt sie mit 409 ab. Sie wird trotzdem vollständig gezeigt, weil die Reparatur damit beginnt, sie anzusehen.</p><ul>${liste}</ul></div>`
}

// ─── Abnahme (F23 WS-2a) ─────────────────────────────────────────────────────

/** Anzeigetexte je Nicht-'ok'-Status der aenderungsuebersicht-Projektion aus GET .../abnahme — Muster LAGE_JE_AUSGANG. */
const AENDERUNGSUEBERSICHT_STATUS_TEXT = {
  kein_ausfuehrungs_schritt: 'Diese Vorlage hat keinen Schritt mit rolle \'ausfuehrung\'.',
  noch_nicht_gelaufen: 'Der Ausführungsschritt ist noch nicht gelaufen.',
  nicht_vorhanden: 'Zu diesem Lauf liegt keine Änderungsübersicht vor (lesender Werkzeugsatz, oder der Lauf endete nicht real erfolgreich).',
}

/** @param projektion - abnahme.aenderungsuebersicht aus GET .../abnahme @returns HTML-Block */
function renderAenderungsuebersicht(projektion) {
  if (projektion.status !== 'ok') {
    return `<p class="unbekannt">${escapeHtml(AENDERUNGSUEBERSICHT_STATUS_TEXT[projektion.status] ?? projektion.status)}</p>`
  }
  const daten = projektion.daten
  const zeilen = daten.dateien
    .map(
      (d) =>
        `<tr><td>${escapeHtml(d.status)}</td><td><code>${escapeHtml(d.pfad)}</code></td><td>${d.plus === null ? '—' : `+${d.plus}`}</td><td>${d.minus === null ? '—' : `-${d.minus}`}</td></tr>`
    )
    .join('')
  return `<p class="hinweis">Lauf <code>${escapeHtml(projektion.laufId)}</code>, Basis <code>${escapeHtml(daten.basis_ref ?? 'unbekannt')}</code>${daten.gekuerzt ? ' <span class="badge fehler">Patch gekürzt</span>' : ''}</p>
    ${daten.dateien.length === 0 ? '<p class="leer">Keine Dateien geändert.</p>' : `<table class="lauf-kopfdaten"><thead><tr><th>Status</th><th>Datei</th><th>+</th><th>-</th></tr></thead><tbody>${zeilen}</tbody></table>`}`
}

/** Anzeigetexte je Nicht-'ok'-Status der pruefergebnis-Projektion aus GET .../abnahme (F-652, state/findings.md F-652). */
const PRUEFERGEBNIS_STATUS_TEXT = {
  kein_ausfuehrungs_schritt: 'Diese Vorlage hat keinen Schritt mit rolle \'ausfuehrung\'.',
  noch_nicht_gelaufen: 'Der Ausführungsschritt ist noch nicht gelaufen.',
  nicht_vorhanden: 'Zu diesem Lauf liegt kein Prüfergebnis vor (die Startvorlage trägt keinen pruefbefehl).',
}

/** Deutsche Anzeigewerte je PruefergebnisWert (src/pruefschritt/types.ts) — nur GRUEN heißt 'GRÜN', der Rest bleibt wörtlich. */
const PRUEFERGEBNIS_WERT_TEXT = { GRUEN: 'GRÜN', ROT: 'ROT', ZEITGRENZE: 'ZEITGRENZE', FEHLER: 'FEHLER' }

/**
 * F-652: dieselbe eine Zeile, direkt neben der Änderungsübersicht (renderAbnahme unten) — GRÜN
 * ist der einzige Wert, der den Workflow automatisch zum Review-Schritt fortsetzt (src/workflow/
 * index.ts Regel 1f); ROT/ZEITGRENZE/FEHLER halten den Workflow auf KLAERUNG_ERFORDERLICH, dessen
 * grund (workflow-bedienung-Block) bereits das Ausgabeende trägt — diese Zeile bleibt bewusst
 * knapp (Ergebnis + Exit-Code), kein zweiter Ausgabetext.
 *
 * F-656: direkt daneben der Knopf „Prüfung wiederholen" — NUR sichtbar, solange der Workflow
 * genau wegen dieses Ergebnisses hält (workflowStatus 'KLAERUNG_ERFORDERLICH' UND ergebnis
 * ungleich GRUEN), Muster renderAbnahmeEntscheidung (Server entscheidet über die Bedienbarkeit,
 * die Anzeige spiegelt nur). Server-seitig prüft POST .../pruefung-wiederholen dieselbe
 * Vorbedingung strukturell nochmal (D2) — der Knopf ist Bedienfreundlichkeit, keine zweite
 * Rechtsquelle.
 * @param projektion - abnahme.pruefergebnis aus GET .../abnahme
 * @param workflowId - Kennung des angezeigten Workflows
 * @param workflowStatus - abnahme.workflowStatus aus GET .../abnahme
 * @returns HTML-Block
 */
function renderPruefergebnis(projektion, workflowId, workflowStatus) {
  if (projektion.status !== 'ok') {
    return `<p class="unbekannt">${escapeHtml(PRUEFERGEBNIS_STATUS_TEXT[projektion.status] ?? projektion.status)}</p>`
  }
  const badgeKlasse = projektion.ergebnis === 'GRUEN' ? 'badge ok' : 'badge fehler'
  const exitText = projektion.exitCode === null ? 'unbekannt' : String(projektion.exitCode)
  const wiederholenKnopf =
    workflowStatus === 'KLAERUNG_ERFORDERLICH' && projektion.ergebnis !== 'GRUEN'
      ? ` <button class="btn wf-pruefung-wiederholen" data-workflow-id="${escapeHtml(workflowId)}">Prüfung wiederholen</button>`
      : ''
  return `<p>Prüfung: <span class="${badgeKlasse}">${escapeHtml(PRUEFERGEBNIS_WERT_TEXT[projektion.ergebnis] ?? projektion.ergebnis)}</span> (Exit ${escapeHtml(exitText)}) <span class="unbekannt">Lauf <code>${escapeHtml(projektion.laufId)}</code></span>${wiederholenKnopf}</p>`
}

/** Anzeigetexte je Nicht-'ok'-Status der urteil-Projektion aus GET .../abnahme. */
const URTEIL_STATUS_TEXT = {
  kein_review_schritt: 'Diese Vorlage hat keinen Post-Build-Review-Schritt (output_schema \'ergebnis-code-reviewer\').',
  noch_nicht_gelaufen: 'Der Review-Schritt ist noch nicht gelaufen.',
  laufakte_fehlt: 'Zum Review-Lauf liegt keine Laufakte vor.',
  nicht_lesbar: 'Das Urteil konnte nicht aus dem Rohstrom des Review-Laufs gelesen werden.',
}

/** @param projektion - abnahme.urteil aus GET .../abnahme @returns HTML-Block */
function renderUrteil(projektion) {
  if (projektion.status !== 'ok') {
    return `<p class="unbekannt">${escapeHtml(URTEIL_STATUS_TEXT[projektion.status] ?? projektion.status)}</p>`
  }
  const befundeZeilen = projektion.befunde
    .map(
      (b) =>
        `<tr><td>${escapeHtml(b.schwere ?? '')}</td><td>${escapeHtml(b.fundstelle ?? '')}</td><td>${escapeHtml(b.zusammenfassung ?? '')}</td><td>${escapeHtml(b.beleg ?? '')}</td></tr>`
    )
    .join('')
  return `<p><strong>Urteil:</strong> ${escapeHtml(projektion.urteil)} <span class="unbekannt">(Lauf <code>${escapeHtml(projektion.laufId)}</code> — nicht bindend, siehe schemas/ergebnis-code-reviewer.schema.json)</span></p>
    ${projektion.befunde.length === 0 ? '<p class="leer">Keine Befunde.</p>' : `<table class="lauf-kopfdaten"><thead><tr><th>Schwere</th><th>Fundstelle</th><th>Zusammenfassung</th><th>Beleg</th></tr></thead><tbody>${befundeZeilen}</tbody></table>`}
    <p><strong>Empfehlung:</strong> ${projektion.empfehlung ? escapeHtml(projektion.empfehlung) : '<span class="unbekannt">keine</span>'}</p>`
}

/**
 * Der ACCEPT/REJECT/ADJUST-Teil des Abnahme-Blocks. Angeboten wird ausschließlich, was der
 * Server als möglich ausweist (D5, Muster renderWorkflowBedienung): 'ANGENOMMEN' nur bei
 * workflowStatus 'ABGESCHLOSSEN', 'ABGELEHNT'/'ANPASSUNG_ANGEFORDERT' bei 'ABGESCHLOSSEN' oder
 * 'KLAERUNG_ERFORDERLICH' (F23 WS-2b, AK21, dasselbe Statuspaar wie ABGELEHNT). Liegt bereits
 * eine AKTUELLE Entscheidung vor (status 'ok'), steht sie hier statt der Schaltflächen. Meldet
 * die Antwort einen freigabeHalt (AK25 — WARTET_FREIGABE, F15 AK7; NICHT nur nach einem ADJUST,
 * s. Kommentar an der Herleitung in leitstand-server.mjs), zeigt dieser Block einen
 * ursprungsneutralen Hinweis statt der Schaltflächen (QA-Pass 15.09.2026, TC-05): die eigentliche
 * Bedienung (Freigeben/Ablehnen) liegt im Block „Bedienung" oben, nicht hier — eine zweite Kopie
 * der Freigeben/Ablehnen-Knöpfe wäre eine zweite Fassung derselben Bedienung (D5).
 *
 * QA-Pass 15.09.2026, TC-04 (kritisch), korrigiert in der Nacharbeit (F-384): status 'veraltet'
 * bedeutet, die vorhandene Entscheidung bezeugt ein FRÜHERES BAU-ERGEBNIS
 * (bezug.ausfuehrung_lauf_id stimmt nicht mit dem lauf_id des aktuellen Ausführungsschritts
 * überein) — genau der Fall nach ABGELEHNT -> GESTOPPT -> Reparaturfassung mit einem neuen
 * Ausführungslauf -> erneut ABGESCHLOSSEN, UND (seit WS-2b) nach ANPASSUNG_ANGEFORDERT -> ein
 * neuer Ausführungslauf über den freigegebenen Neubau. NICHT workflow_version: version ist ein
 * Plandatum, kein Fassungszähler — der etablierte Reparaturweg (baueReparaturEntwurf unten)
 * reicht bewusst eine Fassung mit UNVERÄNDERTER version ein. Ohne die
 * ausfuehrung_lauf_id-Unterscheidung bliebe der in AK16 versprochene Reparaturpfad auf UI-Ebene
 * eine Sackgasse: die alte Entscheidung stünde für immer als "erledigt" da, und es gäbe nie
 * wieder Buttons für den neuen Bau. Die alte Entscheidung bleibt trotzdem sichtbar (Audit-Spur),
 * nur als solche gekennzeichnet — nicht stillschweigend durch neue Buttons ersetzt.
 * @param workflowId - Kennung des angezeigten Workflows
 * @param workflowStatus - abnahme.workflowStatus aus GET .../abnahme
 * @param entscheidung - abnahme.entscheidung aus GET .../abnahme
 * @param freigabeHalt - abnahme.freigabeHalt aus GET .../abnahme ({schrittId, grund} oder null)
 * @returns HTML-Block
 */
function renderAbnahmeEntscheidung(workflowId, workflowStatus, entscheidung, freigabeHalt) {
  if (entscheidung.status === 'ok') {
    return `<div class="unterabschnitt">
      <p><strong>Entscheidung:</strong> ${escapeHtml(entscheidung.ergebnis)} — ${escapeHtml(entscheidung.begruendung)}</p>
      <p class="unbekannt">Entschieden am ${escapeHtml(entscheidung.entschiedenAm)}</p>
    </div>`
  }
  const vorherigeEntscheidung =
    entscheidung.status === 'veraltet'
      ? `<p class="unbekannt">Vorherige Entscheidung (bezieht sich auf eine frühere Fassung): ${escapeHtml(entscheidung.ergebnis)} am ${escapeHtml(entscheidung.entschiedenAm)} — ${escapeHtml(entscheidung.begruendung)}</p>`
      : ''
  if (freigabeHalt !== null) {
    // QA-Pass 15.09.2026 (TC-05): der Text darf NICHT unterstellen, dass WARTET_FREIGABE aus
    // einem ADJUST stammt — derselbe Status entsteht ebenso am ganz normalen zweiten
    // ZWINGEND-Schritt vor dem allerersten Bau (workflow-vorlagen/hoch.json hat zwei davon
    // hintereinander). freigabeHalt kennt den Grund nicht, nur DASS gewartet wird — der Text
    // bleibt deshalb bewusst ursprungsneutral.
    return `<div class="unterabschnitt">
      ${vorherigeEntscheidung}
      <p>Der Workflow wartet auf eine menschliche Freigabe für Schritt <code>${escapeHtml(freigabeHalt.schrittId ?? '')}</code> — siehe Block „Bedienung" oben. Eine Abnahme-Entscheidung ist erst nach dieser Freigabe und dem Bau möglich.</p>
    </div>`
  }
  const kennung = escapeHtml(workflowId)
  const angenommenErlaubt = workflowStatus === 'ABGESCHLOSSEN'
  const abgelehntErlaubt = workflowStatus === 'ABGESCHLOSSEN' || workflowStatus === 'KLAERUNG_ERFORDERLICH'
  const anpassungErlaubt = abgelehntErlaubt
  const hinweis = angenommenErlaubt || abgelehntErlaubt ? '' : `<p class="unbekannt">Workflow-Status '${escapeHtml(workflowStatus)}' erlaubt derzeit keine Abnahme-Entscheidung.</p>`
  return `<div class="unterabschnitt">
    ${vorherigeEntscheidung}
    <label for="wf-abnahme-begruendung">Begründung (Pflicht)</label>
    <textarea id="wf-abnahme-begruendung" rows="2"></textarea>
    <div>
      <button class="btn btn-primary wf-abnahme-aktion" data-aktion="ANGENOMMEN" data-workflow-id="${kennung}"${angenommenErlaubt ? '' : ' disabled'}>Annehmen</button>
      <button class="btn wf-abnahme-aktion" data-aktion="ABGELEHNT" data-workflow-id="${kennung}"${abgelehntErlaubt ? '' : ' disabled'}>Ablehnen</button>
      <button class="btn wf-abnahme-aktion" data-aktion="ANPASSUNG_ANGEFORDERT" data-workflow-id="${kennung}"${anpassungErlaubt ? '' : ' disabled'}>Anpassung anfordern</button>
    </div>
    ${hinweis}
  </div>`
}

/**
 * @param workflowId - Kennung des angezeigten Workflows
 * @param abnahme - Antwort von GET /api/workflows/<id>/abnahme
 * @returns HTML-Block
 */
function renderAbnahme(workflowId, abnahme) {
  return `<div class="detail-block"><h3>Abnahme</h3>
    <h4>Änderungsübersicht</h4>
    ${renderAenderungsuebersicht(abnahme.aenderungsuebersicht)}
    ${renderPruefergebnis(abnahme.pruefergebnis, workflowId, abnahme.workflowStatus)}
    <h4>Urteil (Post-Build-Review)</h4>
    ${renderUrteil(abnahme.urteil)}
    <h4>Entscheidung</h4>
    ${renderAbnahmeEntscheidung(workflowId, abnahme.workflowStatus, abnahme.entscheidung, abnahme.freigabeHalt ?? null)}
  </div>`
}

/** Kennzeichen des zuletzt gerenderten Abnahme-Blocks — verhindert wie bedienungsKennzeichen, dass eine angefangene Pflichtbegründung durch den 2-Sekunden-Poll verloren geht. */
let abnahmeKennzeichen = null

/** @param workflowId - angezeigter Workflow @param abnahme - Antwort von GET .../abnahme */
function aktualisiereAbnahme(workflowId, abnahme) {
  const kennzeichen = `${workflowId}|${abnahme.workflowStatus}|${abnahme.entscheidung.status}|${abnahme.urteil.status}|${abnahme.aenderungsuebersicht.status}|${abnahme.pruefergebnis?.status ?? 'null'}|${abnahme.pruefergebnis?.ergebnis ?? 'null'}`
  if (kennzeichen === abnahmeKennzeichen) return
  abnahmeKennzeichen = kennzeichen
  document.getElementById('workflow-abnahme').innerHTML = renderAbnahme(workflowId, abnahme)
}

/** @param text - anzuzeigender Text, oder null zum Ausblenden @param art - 'fehler' (Vorgabe) oder 'erfolg' */
function zeigeAbnahmeMeldung(text, art = 'fehler') {
  const anzeige = document.getElementById('workflow-abnahme-meldung')
  if (text === null) {
    anzeige.hidden = true
    return
  }
  anzeige.className = art
  anzeige.textContent = text
  anzeige.hidden = false
}

/**
 * Lädt GET .../abnahme separat vom Workflow-Detail (eigener Endpunkt, nicht Teil des
 * Zustands-Aggregats) und rendert den Block — eigener Überholschutz über den von
 * ladeWorkflowDetail durchgereichten istUeberholt (derselbe Render-Zyklus, kein zweiter Zähler).
 * @param workflowId - Kennung des angezeigten Workflows
 * @param istUeberholt - () => boolean aus ladeWorkflowDetail
 */
async function aktualisiereAbnahmeAbschnitt(workflowId, istUeberholt) {
  try {
    const abnahme = await holeAbnahme(workflowId)
    if (istUeberholt()) return
    aktualisiereAbnahme(workflowId, abnahme)
  } catch (fehler) {
    if (istUeberholt()) return
    console.error(`[leitstand] Abnahme-Projektion von '${workflowId}' nicht ladbar: ${fehler.message}`)
  }
}

/**
 * Schickt eine Abnahme-Bedienung (ANGENOMMEN/ABGELEHNT) und lädt den Abnahme-Block danach neu —
 * anders als sendeWorkflowBedienung reicht pollJetzt() allein nicht: die Entscheidung ist nicht
 * Teil des Zustands-Aggregats (GET /api/zustand), nur GET .../abnahme kennt sie.
 * @param workflowId - Kennung des Workflows
 * @param koerper - Body für POST .../abnahme
 * @param knopf - auslösender Button
 * @param erfolgstext - was im Erfolgsfall gemeldet wird
 */
async function sendeAbnahmeBedienung(workflowId, koerper, knopf, erfolgstext) {
  zeigeAbnahmeMeldung(null)
  knopf.disabled = true
  try {
    const antwort = await sendeAbnahme(workflowId, koerper)
    const inhalt = await antwort.json().catch(() => ({}))
    if (antwort.ok) {
      zeigeAbnahmeMeldung(erfolgstext, 'erfolg')
      abnahmeKennzeichen = null
      const abnahme = await holeAbnahme(workflowId).catch(() => null)
      if (abnahme !== null) aktualisiereAbnahme(workflowId, abnahme)
    } else {
      zeigeAbnahmeMeldung(`${antwort.status}: ${inhalt.grund ?? 'unbekannter Fehler'}`)
    }
  } catch (fehler) {
    zeigeAbnahmeMeldung(`Anfrage fehlgeschlagen: ${fehler.message}`)
  }
  knopf.disabled = false
  void pollJetzt()
}

// ─── Bedienung (Starten, Freigeben, Ablehnen, Stoppen) ──────────────────────

/** Workflow-Status, in denen POST .../stoppen etwas zu stoppen findet — ANZEIGE-Zwilling der Server-Regel, entscheidet nur, ob der Knopf angeboten wird. */
const STOPPBARE_WORKFLOW_STATUS = ['OFFEN', 'LAEUFT', 'WARTET_FREIGABE', 'KLAERUNG_ERFORDERLICH']

/** Workflow-Status, aus denen heraus eine Reparaturfassung vorbereitet wird (F-240). */
const REPARIERBARE_WORKFLOW_STATUS = ['GESTOPPT', 'KLAERUNG_ERFORDERLICH']

/** @param text - anzuzeigender Text, oder null zum Ausblenden @param art - 'fehler' (Vorgabe) oder 'erfolg' */
function zeigeBedienungsMeldung(text, art = 'fehler') {
  const anzeige = document.getElementById('workflow-bedienung-meldung')
  if (text === null) {
    anzeige.hidden = true
    return
  }
  anzeige.className = art
  anzeige.textContent = text
  anzeige.hidden = false
}

/**
 * Schickt EINE Bedienung über die übergebene api.js-Funktion und pollt danach
 * außer der Reihe. Fehler werden gezeigt, nicht vorhergesagt (D13) — ein 409
 * nennt den fremden Lauf beim Namen. Der Poll läuft in JEDEM Fall, auch nach
 * einem Fehler: der Grund kann eine veraltete Anzeige sein.
 * @param anfrage - () => Promise<Response>, die konkrete api.js-Bedienung
 * @param knopf - auslösender Button; wird während des Aufrufs gesperrt
 * @param erfolgstext - was im Erfolgsfall gemeldet wird
 */
async function sendeWorkflowBedienung(anfrage, knopf, erfolgstext) {
  zeigeBedienungsMeldung(null)
  knopf.disabled = true
  try {
    const antwort = await anfrage()
    const inhalt = await antwort.json().catch(() => ({}))
    if (antwort.ok) {
      zeigeBedienungsMeldung(`${erfolgstext}${inhalt.laufAbgebrochen === true ? ' Der laufende Schritt wurde abgebrochen.' : ''}${inhalt.laufAbgebrochen === false ? ' Es lief kein Schritt dieses Workflows — nichts abgebrochen.' : ''}${inhalt.bezeugt === false ? ' ACHTUNG: die Entscheidung konnte NICHT als Artefakt festgehalten werden.' : ''}`, 'erfolg')
    } else {
      zeigeBedienungsMeldung(`${antwort.status}: ${inhalt.grund ?? 'unbekannter Fehler'}`)
    }
  } catch (fehler) {
    zeigeBedienungsMeldung(`Anfrage fehlgeschlagen: ${fehler.message}`)
  }
  knopf.disabled = false
  void pollJetzt()
}

/**
 * Der Architektur-Entscheidungsblock (F39 WS-2b, löst state/findings.md
 * F-632 Teil b) — gerendert, solange der Workflow wegen Regel 1c
 * (src/workflow/index.ts) auf einem Architektur-Schritt (output_schema
 * 'ergebnis-architektur') hält: mindestens eine offene Frage in
 * 'entscheidungen_mensch[]', noch keine erfasste menschliche Entscheidung.
 * Jede Frage zeigt ihre Optionen (Vor-/Nachteile, die Empfehlung des
 * Architekten hervorgehoben) als Radio-Auswahl, dazu eine optionale eigene
 * Begründung je Frage. 'Entscheidung speichern' sammelt GENAU EINE Auswahl
 * je Frage ein — der Server (pruefeAntwortenGegenFragen,
 * src/workflow-entscheidung/index.ts) prüft dieselbe Vollständigkeit
 * ohnehin nochmals, diese Vorprüfung ist reine Bedienfreundlichkeit.
 * @param workflowId - Kennung des angezeigten Workflows
 * @param architekturEntscheidung - { schrittId, fragen } aus GET /api/workflows/<id>, oder null
 * @returns HTML-Block, oder '' wenn architekturEntscheidung null ist
 */
function renderArchitekturEntscheidung(workflowId, architekturEntscheidung) {
  if (architekturEntscheidung === null) return ''
  const kennung = escapeHtml(workflowId)
  const schrittId = escapeHtml(architekturEntscheidung.schrittId)
  const fragenHtml = architekturEntscheidung.fragen
    .map((frage, index) => {
      const optionenHtml = frage.optionen
        .map((option) => {
          const empfohlen = option.titel === frage.empfehlung
          const vorteile = option.vorteile.length > 0 ? `<ul class="vorteile">${option.vorteile.map((v) => `<li>+ ${escapeHtml(v)}</li>`).join('')}</ul>` : ''
          const nachteile = option.nachteile.length > 0 ? `<ul class="nachteile">${option.nachteile.map((n) => `<li>− ${escapeHtml(n)}</li>`).join('')}</ul>` : ''
          return `<label class="wf-architektur-option">
            <input type="radio" name="wf-architektur-frage-${index}" value="${escapeHtml(option.titel)}"${empfohlen ? ' checked' : ''}>
            <strong>${escapeHtml(option.titel)}</strong>${empfohlen ? ' <span class="badge empfehlung">Empfehlung des Architekten</span>' : ''}
            ${vorteile}${nachteile}
          </label>`
        })
        .join('')
      return `<fieldset class="wf-architektur-frage" data-frage="${escapeHtml(frage.frage)}">
        <legend>${escapeHtml(frage.frage)}</legend>
        <p class="unbekannt">Auswirkung auf den Bestand: ${escapeHtml(frage.auswirkung_bestand)}</p>
        ${optionenHtml}
        <p class="unbekannt">Begründung des Architekten für die Empfehlung: ${escapeHtml(frage.begruendung)}</p>
        <label for="wf-architektur-begruendung-${index}">Eigene Begründung (optional)</label>
        <textarea id="wf-architektur-begruendung-${index}" rows="2"></textarea>
      </fieldset>`
    })
    .join('')
  return `<div class="unterabschnitt wf-architektur-entscheidung">
    <p>Der Architekt hat ${architekturEntscheidung.fragen.length} offene Frage(n) zu Schritt <code>${schrittId}</code> gestellt — ohne eine Entscheidung setzt die Kette hier nicht fort.</p>
    ${fragenHtml}
    <button class="btn btn-primary wf-aktion" data-aktion="architektur-entscheidung" data-workflow-id="${kennung}" data-schritt-id="${schrittId}">Entscheidung speichern</button>
  </div>`
}

/**
 * Der Bedienblock zu EINEM Workflow. Angeboten wird ausschließlich, was der
 * Server als möglich ausweist: naechster.art für Starten und
 * Freigeben/Ablehnen, status für Stoppen und den Reparaturzug,
 * architekturEntscheidung für die Architektur-Entscheidung (Regel 1c, F39
 * WS-2b) — sie steht bewusst ZUERST, wenn sie greift (dann ist naechster.art
 * 'haltKlaerung', kein 'starte'/'haltFreigabe').
 * @param workflowId - Kennung des angezeigten Workflows
 * @param status - daten.status
 * @param naechster - Automaten-Verdikt aus dem Server, oder null
 * @param ungueltig - true, wenn die Fassung nicht gegen WORKFLOW_V0 validiert
 * @param architekturEntscheidung - { schrittId, fragen } aus GET /api/workflows/<id>, oder null
 * @returns HTML-Block
 */
function renderWorkflowBedienung(workflowId, status, naechster, ungueltig = false, architekturEntscheidung = null) {
  const art = naechster === null || naechster === undefined ? null : naechster.art
  const kennung = escapeHtml(workflowId)
  const faelligerSchritt = escapeHtml(naechster?.schrittId ?? '')
  const bloecke = []

  if (architekturEntscheidung !== null) {
    bloecke.push(renderArchitekturEntscheidung(workflowId, architekturEntscheidung))
  }

  if (art === 'starte') {
    bloecke.push(`<div class="unterabschnitt">
      <p>Der nächste Schritt <code>${faelligerSchritt}</code> darf ohne Rückfrage starten.</p>
      <button class="btn btn-primary wf-aktion" data-aktion="starten" data-workflow-id="${kennung}">Starten</button>
    </div>`)
  }

  if (art === 'haltFreigabe') {
    bloecke.push(`<div class="unterabschnitt">
      <p>Schritt <code>${faelligerSchritt}</code> verlangt eine menschliche Freigabe. Ohne dich läuft hier nichts weiter.</p>
      <label for="wf-freigabe-begruendung">Begründung (Pflicht)</label>
      <textarea id="wf-freigabe-begruendung" rows="2"></textarea>
      <div>
        <button class="btn btn-primary wf-aktion" data-aktion="freigeben" data-workflow-id="${kennung}" data-schritt-id="${faelligerSchritt}">Freigeben</button>
        <button class="btn wf-aktion" data-aktion="ablehnen" data-workflow-id="${kennung}" data-schritt-id="${faelligerSchritt}">Ablehnen</button>
      </div>
    </div>`)
  }

  if (STOPPBARE_WORKFLOW_STATUS.includes(status) && !ungueltig) {
    bloecke.push(`<div class="unterabschnitt">
      <label for="wf-stopp-begruendung">Begründung des Stopps (Pflicht)</label>
      <textarea id="wf-stopp-begruendung" rows="2"></textarea>
      <div><button class="btn wf-aktion" data-aktion="stoppen" data-workflow-id="${kennung}">Stoppen</button></div>
    </div>`)
  }

  if (REPARIERBARE_WORKFLOW_STATUS.includes(status) || ungueltig) {
    bloecke.push(`<div class="unterabschnitt">
      <p>${ungueltig ? 'Diese Fassung validiert nicht — aus ihr startet kein Lauf. Der Weg heraus ist eine neue Fassung derselben' : 'Der Workflow steht. Der Weg heraus ist eine neue Fassung derselben'} <code>workflow_id</code>.</p>
      <button class="btn wf-aktion" data-aktion="reparatur" data-workflow-id="${kennung}">Reparaturfassung vorbereiten</button>
    </div>`)
  }

  if (bloecke.length === 0) {
    bloecke.push('<p class="leer">Für diesen Workflow ist derzeit keine Bedienung fällig.</p>')
  }
  return `<div class="detail-block"><h3>Bedienung</h3>${bloecke.join('')}</div>`
}

/** Kennzeichen des zuletzt gerenderten Bedienblocks — verhindert, dass eine angefangene Pflichtbegründung durch den 2-Sekunden-Poll verloren geht (F-249). Nur bei ECHTER Lageänderung wird neu gebaut. */
let bedienungsKennzeichen = null

/** @param workflowId - angezeigter Workflow @param status - daten.status @param naechster - Automaten-Verdikt, oder null @param architekturEntscheidung - { schrittId, fragen }, oder null (F39 WS-2b) */
function aktualisiereWorkflowBedienung(workflowId, status, naechster, ungueltig = false, architekturEntscheidung = null) {
  const kennzeichen = `${workflowId}|${status}|${naechster?.art ?? 'null'}|${naechster?.schrittId ?? 'null'}|${ungueltig}|${architekturEntscheidung?.schrittId ?? 'null'}|${architekturEntscheidung?.fragen?.length ?? 0}`
  if (kennzeichen === bedienungsKennzeichen) return
  bedienungsKennzeichen = kennzeichen
  document.getElementById('workflow-bedienung').innerHTML = renderWorkflowBedienung(workflowId, status, naechster, ungueltig, architekturEntscheidung)
}

// ─── Reparaturzug (löst F-240, F-218; zeigt F-219, F-223, F-226) ────────────

/** Schritt-Status, deren Schrittfelder eine Reparaturfassung zurücksetzt: der abgebrochene (LAEUFT) und die gescheiterten. ERFOLGREICHE Schritte bleiben unangetastet — ihre lauf_id ist der Lineage-Verweis, den Folgeschritte zitieren. */
const REPARIERBARE_SCHRITT_STATUS = ['LAEUFT', 'FEHLGESCHLAGEN', 'VERWEIGERT']

/**
 * Baut aus der aktuellen Fassung den Entwurf einer Reparaturfassung (F-240):
 * status -> 'OFFEN', Schrittfelder des abgebrochenen/gescheiterten Schritts
 * zurückgesetzt, Cursor bleibt oder zeigt auf den ersten Schritt ohne
 * lauf_id, grund bleibt stehen (Vorbelegung, keine Durchsetzung — der Mensch
 * prüft und ändert den Entwurf vor dem Einreichen).
 * @param daten - der geladene WORKFLOW_V0-Datensatz
 * @returns Entwurf als einfaches Objekt
 */
function baueReparaturEntwurf(daten) {
  const schritte = daten.schritte.map((schritt) => (REPARIERBARE_SCHRITT_STATUS.includes(schritt.status) ? { ...schritt, status: 'OFFEN', lauf_id: null } : schritt))
  const cursor = daten.aktiver_schritt_id ?? schritte.find((schritt) => schritt.lauf_id === null)?.schritt_id ?? null
  return { ...daten, status: 'OFFEN', aktiver_schritt_id: cursor, schritte }
}

/**
 * Welche ZWINGEND-Freigabepflichten der Entwurf gegenüber der geladenen
 * Fassung zurücknimmt (F-226) — ANZEIGE-Zwilling der Server-Regel.
 * @param vorherigeSchritte - schritte[] der geladenen Fassung
 * @param neueSchritte - schritte[] des Entwurfs
 * @returns schritt_ids, deren ZWINGEND-Pflicht entfällt
 */
function ermittleAbgeschwaechteFreigabenAnzeige(vorherigeSchritte, neueSchritte) {
  if (!Array.isArray(vorherigeSchritte) || !Array.isArray(neueSchritte)) return []
  const neueNachId = new Map(neueSchritte.filter((schritt) => schritt !== null && typeof schritt === 'object').map((schritt) => [schritt.schritt_id, schritt]))
  return vorherigeSchritte
    .filter((schritt) => schritt.freigabe === 'ZWINGEND')
    .filter((schritt) => neueNachId.get(schritt.schritt_id)?.freigabe !== 'ZWINGEND')
    .map((schritt) => schritt.schritt_id)
}

/**
 * Die Warnungen über dem Entwurf (F-219, F-223, F-226, F-240) — sie LÖSEN
 * die zugrunde liegenden Befunde nicht, sie machen sie sichtbar.
 * @param daten - die geladene Fassung
 * @param entwurf - der (möglicherweise vom Menschen bearbeitete) Entwurf
 * @returns Warntexte
 */
function ermittleReparaturWarnungen(daten, entwurf) {
  const warnungen = []

  const verloreneFreigaben = daten.schritte.filter((schritt) => schritt.freigabe_erteilt === true && schritt.lauf_id === null).map((schritt) => schritt.schritt_id)
  if (verloreneFreigaben.length > 0) {
    warnungen.push(
      `F-223: Für ${verloreneFreigaben.map((id) => `'${id}'`).join(', ')} ist eine Freigabe erteilt, der Schritt ist aber noch nicht gelaufen. Beim Einreichen verwirft der Server das Feld — der Schritt hält danach erneut an und muss neu freigegeben werden.`
    )
  }

  const verloreneVorgaenger = daten.schritte
    .filter((schritt) => REPARIERBARE_SCHRITT_STATUS.includes(schritt.status) && schritt.lauf_id !== null && schritt.nachfolger !== null)
    .map((schritt) => `'${schritt.schritt_id}' -> '${schritt.nachfolger}'`)
  if (verloreneVorgaenger.length > 0) {
    warnungen.push(
      `F-219: Die lauf_id von ${verloreneVorgaenger.join(', ')} wird zurückgesetzt. Der Folgeschritt startet dann ohne vorgaengerLaufId — der Lineage-Verweis auf den Vorlauf fehlt. Kein Fehler, aber eine Entscheidung.`
    )
  }

  const abgeschwaecht = ermittleAbgeschwaechteFreigabenAnzeige(daten.schritte, entwurf?.schritte)
  if (abgeschwaecht.length > 0) {
    warnungen.push(
      `F-226: Dieser Entwurf nimmt die Freigabepflicht von ${abgeschwaecht.map((id) => `'${id}'`).join(', ')} zurück (ZWINGEND entfällt). Der Server verlangt dafür eine Begründung und hält sie als Entscheidung fest.`
    )
  }

  if (typeof daten.grund === 'string' && daten.grund.length > 0) {
    warnungen.push(`F-240: Der Halt-Grund ("${daten.grund.slice(0, 80)}${daten.grund.length > 80 ? '…' : ''}") wird beim Einreichen auf null normalisiert und ist danach in keiner Ansicht mehr zu lesen. Wenn er festgehalten gehört, kopiere ihn vorher — die Stopp-Entscheidung selbst bleibt als Artefakt bestehen.`)
  }

  const gelaufen = Array.isArray(entwurf?.schritte) ? entwurf.schritte.filter((schritt) => schritt?.lauf_id !== null && schritt?.lauf_id !== undefined).length : 0
  const grenze = entwurf?.grenzen?.max_schritte
  if (typeof grenze === 'number' && gelaufen >= grenze) {
    warnungen.push(`F-240: Der Entwurf trägt grenzen.max_schritte ${grenze}, und ${gelaufen} Schritt(e) tragen bereits eine lauf_id. Der Automat hält damit sofort wieder an ("Grenze erreicht") — die Grenze gehört angehoben, sonst ist die Reparatur wirkungslos.`)
  }

  // QA-Pass 15.09.2026 (F-384, Nacharbeit): REPARIERBARE_SCHRITT_STATUS lässt einen ERFOLGREICHEN
  // Ausführungsschritt absichtlich unangetastet (Lineage-Grund, siehe dortiger Kommentar) — der
  // Automat startet ihn deshalb NIE automatisch neu (Regel 3, src/workflow/index.ts: ein bereits
  // gelaufener Schritt wird nicht zweimal gestartet). Ohne diese Warnung sieht ein Vorarbeiter, der
  // eine Abnahme ABGELEHNT und danach die vorbelegte Reparaturfassung unverändert einreicht, nie
  // wieder ACCEPT/REJECT-Buttons: die Entscheidung bleibt an derselben lauf_id hängen (GET
  // .../abnahme meldet weiter 'ok') und der Automat hält mit KLAERUNG_ERFORDERLICH an, ohne neu zu
  // bauen — dieselbe Sackgasse, die F-384 eigentlich schließen sollte. Reales Neubauen verlangt ein
  // manuelles Zurücksetzen (status:'OFFEN', lauf_id:null) im Entwurf-Textfeld.
  // QA-Pass 15.09.2026 (Fehler 1, behoben): geprüft wird der EINGETIPPTE Entwurf, nicht die beim
  // Öffnen eingefrorene Originalfassung — Muster der F-226-Prüfung direkt darüber
  // (ermittleAbgeschwaechteFreigabenAnzeige liest ebenfalls entwurf?.schritte). Ohne das blieb die
  // Warnung stehen, selbst wenn der Mensch genau das tat, was sie verlangt (Schritt im Textfeld
  // manuell zurückgesetzt) — die eigene Handlungsanweisung ließ sich nie "quittieren".
  const entwurfSchritte = Array.isArray(entwurf?.schritte) ? entwurf.schritte : []
  const ausfuehrungUnveraendert = entwurfSchritte.find((schritt) => schritt?.rolle === 'ausfuehrung' && schritt?.status === 'ERFOLGREICH')
  if (ausfuehrungUnveraendert !== undefined) {
    warnungen.push(
      `F-384: Der Ausführungsschritt '${ausfuehrungUnveraendert.schritt_id}' ist ERFOLGREICH und behält seine lauf_id '${ausfuehrungUnveraendert.lauf_id}' — ein Reparaturzug startet ihn NICHT automatisch neu. Eine Abnahme-Entscheidung zu diesem Bau bleibt nach dem Einreichen dieser Fassung weiter gültig, solange der Schritt nicht manuell auf status:'OFFEN', lauf_id:null zurückgesetzt wird — sonst hält der Automat mit KLAERUNG_ERFORDERLICH an, ohne neu zu bauen.`
    )
  }

  return warnungen
}

/** @param warnungen - Texte aus ermittleReparaturWarnungen @returns HTML-Block, Leerzustand bei keiner Warnung */
function renderReparaturWarnungen(warnungen) {
  if (warnungen.length === 0) return '<p class="leer">Keine Warnungen zu diesem Entwurf.</p>'
  return `<ul class="fehler">${warnungen.map((warnung) => `<li>${escapeHtml(warnung)}</li>`).join('')}</ul>`
}

/**
 * Der Reparaturentwurf als bearbeitbarer JSON-Text — bewusst kein Formular,
 * das wäre ein Plan-Editor, den AK8 nicht verlangt.
 * @param workflowId - Kennung des Workflows
 * @param entwurf - Vorbelegung aus baueReparaturEntwurf
 * @param warnungen - Texte aus ermittleReparaturWarnungen
 * @returns HTML-Block
 */
function renderReparatur(workflowId, entwurf, warnungen) {
  return `<div class="detail-block"><h3>Reparaturfassung für <code>${escapeHtml(workflowId)}</code></h3>
    <p class="hinweis">Vorbelegt aus der aktuellen Fassung: <code>status</code> auf <code>OFFEN</code>, die Schrittfelder des abgebrochenen oder gescheiterten Schritts zurückgesetzt, der Cursor auf den ersten Schritt ohne <code>lauf_id</code>, wenn er null war. Alles davon ist ein Vorschlag — der Text unten ist bearbeitbar und wird so eingereicht, wie er dasteht.</p>
    <div id="workflow-reparatur-warnungen">${renderReparaturWarnungen(warnungen)}</div>
    <label for="wf-reparatur-begruendung">Begründung der Planänderung (nur nötig, wenn der Entwurf eine ZWINGEND-Freigabepflicht zurücknimmt)</label>
    <input type="text" id="wf-reparatur-begruendung" />
    <label for="wf-reparatur-entwurf">Neue Fassung (WORKFLOW_V0)</label>
    <textarea id="wf-reparatur-entwurf" rows="24">${escapeHtml(JSON.stringify(entwurf, null, 2))}</textarea>
    <div>
      <button id="wf-reparatur-einreichen" class="btn btn-primary" data-workflow-id="${escapeHtml(workflowId)}">Einreichen</button>
      <button id="wf-reparatur-verwerfen" class="btn">Entwurf verwerfen</button>
    </div>
    <p id="wf-reparatur-meldung" class="fehler" hidden></p>
  </div>`
}

/** Die Fassung, aus der der offene Reparaturentwurf gebaut wurde — Vergleichsgrundlage der Warnungen. null, solange kein Entwurf offen ist. */
let reparaturBasis = null

/** Fortlaufende Nummer je oeffneReparaturEntwurf-Aufruf (Überholschutz, Reviewer-Pass 10.09.2026). */
let reparaturZaehler = 0

/** @param text - anzuzeigender Text, oder null zum Ausblenden */
function zeigeReparaturMeldung(text) {
  const anzeige = document.getElementById('wf-reparatur-meldung')
  if (anzeige === null) return
  if (text === null) {
    anzeige.hidden = true
    return
  }
  anzeige.textContent = text
  anzeige.hidden = false
}

/**
 * Lädt die AKTUELLE Fassung und öffnet daraus den Entwurf — frisch geladen,
 * nicht aus dem gerade angezeigten Stand gebaut.
 * @param workflowId - Kennung des Workflows
 */
async function oeffneReparaturEntwurf(workflowId) {
  const behaelter = document.getElementById('workflow-reparatur')
  reparaturZaehler += 1
  const meineNummer = reparaturZaehler
  const istUeberholt = () => reparaturZaehler !== meineNummer
  behaelter.innerHTML = '<p class="leer">Lädt…</p>'
  try {
    const antwort = await holeWorkflowDetail(workflowId)
    const inhalt = await antwort.json().catch(() => ({}))
    if (istUeberholt()) return
    if (!antwort.ok || !Array.isArray(inhalt.daten?.schritte)) {
      behaelter.innerHTML = ''
      zeigeBedienungsMeldung(`Reparaturfassung nicht vorbereitbar: ${antwort.status} ${inhalt.grund ?? ''}`.trim())
      return
    }
    reparaturBasis = inhalt.daten
    const entwurf = baueReparaturEntwurf(inhalt.daten)
    behaelter.innerHTML = renderReparatur(workflowId, entwurf, ermittleReparaturWarnungen(inhalt.daten, entwurf))
  } catch (fehler) {
    if (istUeberholt()) return
    behaelter.innerHTML = ''
    zeigeBedienungsMeldung(`Reparaturfassung nicht vorbereitbar: ${fehler.message}`)
  }
}

/** Rechnet die Warnungen gegen den TATSÄCHLICH eingetippten Text neu (der Entwurf ist bearbeitbar). Ein unlesbarer Zwischenstand lässt die Warnungen unverändert stehen. */
function aktualisiereReparaturWarnungen() {
  const anzeige = document.getElementById('workflow-reparatur-warnungen')
  if (anzeige === null || reparaturBasis === null) return
  let entwurf
  try {
    entwurf = JSON.parse(document.getElementById('wf-reparatur-entwurf').value)
  } catch {
    return
  }
  anzeige.innerHTML = renderReparaturWarnungen(ermittleReparaturWarnungen(reparaturBasis, entwurf))
}

/** Schließt den Entwurf und gibt die Vergleichsgrundlage frei. Der Zähler wird hochgezählt, damit eine noch fliegende oeffneReparaturEntwurf-Antwort den Entwurf nicht wieder aufbaut. */
function verwirfReparaturEntwurf() {
  reparaturBasis = null
  reparaturZaehler += 1
  document.getElementById('workflow-reparatur').innerHTML = ''
}

/**
 * Reicht den bearbeiteten Entwurf als neue Fassung ein (POST /api/workflows).
 * @param workflowId - Kennung des Workflows
 * @param knopf - auslösender Button
 */
async function reicheReparaturEntwurfEin(workflowId, knopf) {
  zeigeReparaturMeldung(null)
  let entwurf
  try {
    entwurf = JSON.parse(document.getElementById('wf-reparatur-entwurf').value)
  } catch (fehler) {
    zeigeReparaturMeldung(`Der Entwurf ist kein gültiges JSON (${fehler.message}) — nichts eingereicht.`)
    return
  }
  if (reparaturBasis !== null) {
    document.getElementById('workflow-reparatur-warnungen').innerHTML = renderReparaturWarnungen(ermittleReparaturWarnungen(reparaturBasis, entwurf))
  }
  const begruendung = document.getElementById('wf-reparatur-begruendung').value
  const koerper = begruendung.trim().length === 0 ? entwurf : { ...entwurf, begruendung }
  knopf.disabled = true
  try {
    const antwort = await reicheWorkflowFassungEin(koerper)
    const inhalt = await antwort.json().catch(() => ({}))
    if (!antwort.ok) {
      zeigeReparaturMeldung(`${antwort.status}: ${inhalt.grund ?? 'unbekannter Fehler'}`)
      knopf.disabled = false
      return
    }
    verwirfReparaturEntwurf()
    zeigeBedienungsMeldung(`Neue Fassung von '${workflowId}' angenommen (Version ${inhalt.versionSequenz}).`, 'erfolg')
  } catch (fehler) {
    zeigeReparaturMeldung(`Anfrage fehlgeschlagen: ${fehler.message}`)
    knopf.disabled = false
    return
  }
  void pollJetzt()
}

/** workflowId des aktuell im Workflow-Panel angezeigten Workflows, oder null. */
let gewaehlteWorkflowId = null

/** Fortlaufende Nummer je ladeWorkflowDetail-Aufruf (Überholschutz, siehe Funktionskommentar unten). */
let workflowRenderZaehler = 0

/** AbortController der zuletzt gestarteten GET /api/workflows/<id>-Anfrage (Perf-Fix fix/zustand-poll-kosten, Punkt 5) — vor jedem neuen Aufruf abgebrochen, damit eine langsame Antwort nicht mit jedem Poll-Tick eine weitere parallele Verbindung öffnet und das Verbindungslimit des Browsers erschöpft. */
let aktiveWorkflowDetailAnfrage = null

/**
 * Lädt GET /api/workflows/<id> und rendert Kopf und Schrittliste. Anders als
 * ladeLaufDetail hängt diese Funktion am Poll (der Zweck der Ansicht ist zu
 * sehen, wie der Cursor wandert). Zwei Ticks für DENSELBEN Workflow können
 * sich überholen (F-252) — nur der jüngste Aufruf darf schreiben.
 * Wechselt der Aufruf dabei auf einen ANDEREN Workflow als den zuvor
 * angezeigten (Klick auf ein anderes Workflow-Detail, Browser-Vor/Zurück),
 * werden Bedienblock und ein offener Reparaturentwurf zuerst geräumt
 * (raeumeWorkflowBedienzustand, QA-Pass F20 WS-1, TC-11) — sonst bliebe ein
 * Entwurf des VORHERIGEN Workflows unter der neuen Ansicht sichtbar und
 * einreichbar, fachlich falsch zugeordnet.
 * @param workflowId - Kennung, aus dem geklickten Details-Button
 * @param scrollen - true beim Öffnen per Klick, false beim Neurendern durch den Poll
 */
export async function ladeWorkflowDetail(workflowId, scrollen = true) {
  if (gewaehlteWorkflowId !== null && gewaehlteWorkflowId !== workflowId) {
    raeumeWorkflowBedienzustand()
  }
  gewaehlteWorkflowId = workflowId
  workflowRenderZaehler += 1
  const meineRenderNummer = workflowRenderZaehler
  const istUeberholt = () => gewaehlteWorkflowId !== workflowId || workflowRenderZaehler !== meineRenderNummer

  aktiveWorkflowDetailAnfrage?.abort()
  const abbruchsteuerung = new AbortController()
  aktiveWorkflowDetailAnfrage = abbruchsteuerung
  const abschnitt = document.getElementById('workflow-detail')
  const fehleranzeige = document.getElementById('workflow-detail-fehler')
  const inhalt = document.getElementById('workflow-detail-inhalt')

  document.getElementById('workflow-detail-titel').textContent = workflowId
  fehleranzeige.hidden = true
  abschnitt.hidden = false
  if (scrollen) {
    inhalt.innerHTML = '<p class="leer">Lädt…</p>'
    abschnitt.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  try {
    const antwort = await holeWorkflowDetail(workflowId, abbruchsteuerung.signal)
    if (istUeberholt()) return
    if (!antwort.ok) {
      const koerper = await antwort.json().catch(() => ({}))
      if (istUeberholt()) return
      inhalt.innerHTML = ''
      fehleranzeige.textContent = `${antwort.status}: ${koerper.grund ?? 'unbekannter Fehler'}`
      fehleranzeige.hidden = false
      return
    }
    const detail = await antwort.json()
    if (istUeberholt()) return
    const daten = detail.daten ?? {}
    const verstoesse = Array.isArray(detail.verstoesse) ? detail.verstoesse : []
    const naechster = detail.naechster ?? null
    aktualisiereWorkflowBedienung(workflowId, daten.status ?? null, naechster, verstoesse.length > 0, detail.architekturEntscheidung ?? null)
    // Eigener Endpunkt, eigener Überholschutz (istUeberholt), fire-and-forget — blockiert das
    // übrige Rendern nicht.
    void aktualisiereAbnahmeAbschnitt(workflowId, istUeberholt)
    const ungueltigBlock = verstoesse.length > 0 ? renderWorkflowUngueltig(verstoesse) : ''
    if (!Array.isArray(daten.schritte) || daten.schritte.length === 0) {
      inhalt.innerHTML = [
        ungueltigBlock === '' ? renderWorkflowUngueltig(['Die gelieferte Fassung trägt keine lesbare Schrittliste.']) : ungueltigBlock,
        renderWorkflowKopf(daten, detail.versionSequenz, naechster),
      ].join('')
      return
    }
    const geordnet = ordneSchritteNachPlan(daten.schritte)
    const aktiveLaufIds = await ermittleAktiveLaufIds(geordnet)
    if (istUeberholt()) return
    const ausserhalbDerKette = geordnet.filter((e) => !e.inKette).length
    const ueberschrift = ausserhalbDerKette === 0 ? 'Schritte (Planreihenfolge)' : `Schritte (Planreihenfolge, ${ausserhalbDerKette} außerhalb der Kette)`
    inhalt.innerHTML = [
      ungueltigBlock,
      renderWorkflowKopf(daten, detail.versionSequenz, naechster),
      `<div class="detail-block"><h3>${escapeHtml(ueberschrift)}</h3><table class="lauf-kopfdaten"><thead>${WORKFLOW_SCHRITT_TABELLE_KOPF}</thead><tbody>${geordnet.map((e) => workflowSchrittZeile(e, aktiveLaufIds, naechster?.schrittId ?? null, daten.aktiver_schritt_id ?? null)).join('')}</tbody></table></div>`,
    ].join('')
  } catch (fehler) {
    if (istUeberholt()) return
    inhalt.innerHTML = ''
    fehleranzeige.textContent = `Anfrage fehlgeschlagen: ${fehler.message}`
    fehleranzeige.hidden = false
  }
}

/** Räumt Bedienblock, Bedienungsmeldung und einen offenen Reparaturentwurf auf — gemeinsame Teilmenge von schliesseWorkflowDetail und dem Workflow-Wechsel in ladeWorkflowDetail (TC-11, QA-Pass F20 WS-1). */
function raeumeWorkflowBedienzustand() {
  bedienungsKennzeichen = null
  document.getElementById('workflow-bedienung').innerHTML = ''
  zeigeBedienungsMeldung(null)
  abnahmeKennzeichen = null
  document.getElementById('workflow-abnahme').innerHTML = ''
  zeigeAbnahmeMeldung(null)
  verwirfReparaturEntwurf()
}

/** Schließt das Workflow-Detail-Panel, den Bedienblock und einen offenen Reparaturentwurf. */
function schliesseWorkflowDetail() {
  gewaehlteWorkflowId = null
  document.getElementById('workflow-detail').hidden = true
  raeumeWorkflowBedienzustand()
}

/**
 * Führt EINE angeklickte Bedienung aus — die Pflichtbegründungen werden hier
 * NICHT gegen den Server vorgeprüft, sondern nur auf "nicht leer" (dieselbe
 * Bedingung, die der Server stellt).
 * @param button - der geklickte .wf-aktion-Knopf
 */
async function fuehreWorkflowAktionAus(button) {
  const workflowId = button.dataset.workflowId
  const aktion = button.dataset.aktion
  zeigeBedienungsMeldung(null)

  if (aktion === 'starten') {
    await sendeWorkflowBedienung(() => starteWorkflowSchritt(workflowId), button, 'Schritt gestartet.')
    return
  }

  if (aktion === 'architektur-entscheidung') {
    const fragenKnoten = [...document.querySelectorAll('.wf-architektur-frage')]
    const antworten = []
    for (const [index, knoten] of fragenKnoten.entries()) {
      const gewaehlt = knoten.querySelector(`input[name="wf-architektur-frage-${index}"]:checked`)?.value
      if (gewaehlt === undefined) {
        zeigeBedienungsMeldung('Jede Frage braucht eine gewählte Option, bevor die Entscheidung gespeichert werden kann.')
        return
      }
      const begruendung = document.getElementById(`wf-architektur-begruendung-${index}`)?.value?.trim() ?? ''
      antworten.push({ frage: knoten.dataset.frage, gewaehlt, ...(begruendung.length > 0 ? { begruendung } : {}) })
    }
    await sendeWorkflowBedienung(
      () => sendeWorkflowArchitekturEntscheidung(workflowId, { schrittId: button.dataset.schrittId, antworten }),
      button,
      'Architektur-Entscheidung gespeichert.'
    )
    return
  }

  if (aktion === 'freigeben' || aktion === 'ablehnen') {
    const begruendung = document.getElementById('wf-freigabe-begruendung').value
    if (begruendung.trim().length === 0) {
      zeigeBedienungsMeldung('Die Begründung ist Pflicht — ohne sie wird die Entscheidung nicht festgehalten.')
      return
    }
    await sendeWorkflowBedienung(
      () => sendeWorkflowFreigabe(workflowId, { schrittId: button.dataset.schrittId, entscheidung: aktion === 'freigeben' ? 'FREIGEGEBEN' : 'ABGELEHNT', begruendung }),
      button,
      aktion === 'freigeben' ? 'Freigabe erteilt und als Entscheidung festgehalten — der Schritt startet.' : 'Ablehnung festgehalten — der Workflow ist gestoppt.'
    )
    return
  }

  if (aktion === 'stoppen') {
    const begruendung = document.getElementById('wf-stopp-begruendung').value
    if (begruendung.trim().length === 0) {
      zeigeBedienungsMeldung('Die Begründung ist Pflicht — sie ist der Text, den du in drei Tagen liest, wenn du wissen willst, warum die Kette steht.')
      return
    }
    await sendeWorkflowBedienung(() => stoppeWorkflow(workflowId, { begruendung }), button, 'Stopp festgeschrieben und als Entscheidung festgehalten.')
    return
  }

  if (aktion === 'reparatur') {
    await oeffneReparaturEntwurf(workflowId)
  }
}

/**
 * Führt eine angeklickte Abnahme-Bedienung aus (F23 WS-2a/WS-2b). Die Prüfung der drei
 * zulässigen Aktionen ist nur Schutz gegen ein synthetisches Klick-Event (der Button selbst
 * steht disabled, wenn der Server-Status die Aktion nicht zulässt, s. renderAbnahmeEntscheidung)
 * — kein zweiter Weg zum Ergebnis.
 * @param button - der geklickte .wf-abnahme-aktion-Knopf
 */
async function fuehreAbnahmeAktionAus(button) {
  const workflowId = button.dataset.workflowId
  const aktion = button.dataset.aktion
  if (aktion !== 'ANGENOMMEN' && aktion !== 'ABGELEHNT' && aktion !== 'ANPASSUNG_ANGEFORDERT') return
  zeigeAbnahmeMeldung(null)
  const begruendung = document.getElementById('wf-abnahme-begruendung').value
  if (begruendung.trim().length === 0) {
    zeigeAbnahmeMeldung('Die Begründung ist Pflicht — ohne sie wird die Abnahme-Entscheidung nicht festgehalten.')
    return
  }
  const erfolgstext =
    aktion === 'ANGENOMMEN'
      ? 'Abnahme festgehalten.'
      : aktion === 'ABGELEHNT'
        ? 'Ablehnung festgehalten — der Workflow ist gestoppt.'
        : 'Anpassung angefordert — der Neubau wartet auf Freigabe (siehe Block „Bedienung").'
  await sendeAbnahmeBedienung(workflowId, { ergebnis: aktion, begruendung }, button, erfolgstext)
}

/**
 * Führt den Knopf „Prüfung wiederholen" aus (F-656). Kein Body, keine Begründungspflicht — anders
 * als fuehreAbnahmeAktionAus daneben. Die Antwort ist bewusst synchron (der Server wartet den
 * ganzen Prüflauf ab, siehe Kommentar am Endpunkt in scripts/leitstand-server.mjs) — der Knopf
 * bleibt deshalb disabled, bis die Antwort da ist, statt sofort wieder bedienbar zu sein.
 * @param button - der geklickte .wf-pruefung-wiederholen-Knopf
 */
async function fuehrePruefungWiederholenAus(button) {
  const workflowId = button.dataset.workflowId
  zeigeAbnahmeMeldung(null)
  button.disabled = true
  try {
    const antwort = await wiederholeWorkflowPruefung(workflowId)
    const inhalt = await antwort.json().catch(() => ({}))
    if (antwort.ok) {
      const erfolgstext = inhalt.pruefergebnis === 'GRUEN' ? 'Prüfung wiederholt: GRÜN — der Review-Schritt wurde gestartet.' : `Prüfung wiederholt: ${PRUEFERGEBNIS_WERT_TEXT[inhalt.pruefergebnis] ?? inhalt.pruefergebnis ?? 'unbekannt'} — der Workflow hält weiter.`
      zeigeAbnahmeMeldung(erfolgstext, 'erfolg')
      abnahmeKennzeichen = null
      const abnahme = await holeAbnahme(workflowId).catch(() => null)
      if (abnahme !== null) aktualisiereAbnahme(workflowId, abnahme)
    } else {
      zeigeAbnahmeMeldung(`${antwort.status}: ${inhalt.grund ?? 'unbekannter Fehler'}`)
    }
  } catch (fehler) {
    zeigeAbnahmeMeldung(`Anfrage fehlgeschlagen: ${fehler.message}`)
  }
  button.disabled = false
  void pollJetzt()
}

/** Klick-/Eingabe-Delegation der Workflow-Ansicht — jeder Container wird als Ganzes neu gerendert, die Zuhörer hängen deshalb am Container. */
function initWorkflowBedienung() {
  document.getElementById('workflows').addEventListener('click', (ereignis) => {
    const button = ereignis.target.closest('.workflow-details-btn')
    if (!button) return
    navigiere(`#/workflows/${encodeURIComponent(button.dataset.workflowId)}`)
  })
  document.getElementById('workflow-detail-inhalt').addEventListener('click', (ereignis) => {
    const button = ereignis.target.closest('.workflow-lauf-verweis')
    if (!button) return
    navigiere(`#/runs/${encodeURIComponent(button.dataset.laufId)}`)
  })
  document.getElementById('workflow-bedienung').addEventListener('click', (ereignis) => {
    const button = ereignis.target.closest('.wf-aktion')
    if (!button) return
    void fuehreWorkflowAktionAus(button)
  })
  document.getElementById('workflow-abnahme').addEventListener('click', (ereignis) => {
    const abnahmeButton = ereignis.target.closest('.wf-abnahme-aktion')
    if (abnahmeButton) {
      void fuehreAbnahmeAktionAus(abnahmeButton)
      return
    }
    const pruefungButton = ereignis.target.closest('.wf-pruefung-wiederholen')
    if (!pruefungButton) return
    void fuehrePruefungWiederholenAus(pruefungButton)
  })
  document.getElementById('workflow-reparatur').addEventListener('input', (ereignis) => {
    if (ereignis.target.id !== 'wf-reparatur-entwurf') return
    aktualisiereReparaturWarnungen()
  })
  document.getElementById('workflow-reparatur').addEventListener('click', (ereignis) => {
    if (ereignis.target.closest('#wf-reparatur-verwerfen')) {
      verwirfReparaturEntwurf()
      return
    }
    const einreichen = ereignis.target.closest('#wf-reparatur-einreichen')
    if (!einreichen) return
    void reicheReparaturEntwurfEin(einreichen.dataset.workflowId, einreichen)
  })
  // Lokaler Aufruf statt navigiere('#/runs') aus demselben Grund wie in runs.js
  // initDetailBedienung: die exakte Route `#/runs` ist zugleich hier UND in runs.js
  // registriert (beide räumen dort ihr eigenes Detail) — ein Hash-Wechsel würde ungefragt
  // auch ein offenes Lauf-Detail schließen (QA-Pass F20 WS-1).
  document.getElementById('workflow-detail-schliessen').addEventListener('click', () => {
    schliesseWorkflowDetail()
  })
}

/** Initialisiert die Workflow-Bedienung einmalig beim Bootstrap: Delegation, Routen, Abonnement des Zustands-Aggregats für die Liste, Detail-Auffrischer für ein offenes Workflow-Detail (F20 WS-2 — kein eigener Poll-Timer mehr, siehe zustand.js). */
export function initWorkflowsView() {
  initWorkflowBedienung()

  registriere(/^#\/runs$/, 'runs', () => {
    schliesseWorkflowDetail()
  })
  registriere(/^#\/workflows\/([^/]+)$/, 'runs', (workflowId) => {
    void ladeWorkflowDetail(workflowId)
  })

  abonniere((zustand) => {
    renderWorkflows(zustand.workflows)
  })
  // Das Workflow-Detail bleibt gepollt, solange eines offen ist (anders als das Lauf-Detail,
  // TECH_DEBT F-363) — hängt hier als Detail-Auffrischer am selben Timer statt an einem
  // eigenen, siehe zustand.js.
  abonniereDetailAuffrischer(() => {
    if (gewaehlteWorkflowId !== null) void ladeWorkflowDetail(gewaehlteWorkflowId, false)
  })
}
