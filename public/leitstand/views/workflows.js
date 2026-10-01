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
 * (Freigabe-Halt danach als Hinweis statt der Abnahme-Schaltflächen). Seit F36
 * WS-3 zeigt der Freigabe-Block die Katalog-Empfehlung (empfehlung-anzeige.js) und
 * schickt die angezeigten wirdGenutzt-ids mit der Freigabe mit; seit WS-5a samt
 * „Freigeben & installieren“ (empfehlung-installation.js).
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
 * F44 WS-4a (Vorlage V10 d_workflow_neu, d_arbeit_verlauf; Abgleich F-725 F0, F2, F3, F3b, F4,
 * F5, F10, F12): `#/workflows/<id>` ist eine ganze Seite — „← Alle Aufträge“, Kopf mit Ziel,
 * „Der Weg zum Ergebnis“ als Timeline, „Auf einen Blick“, die Aktionen darunter und der
 * Aufklappbereich „Technischer Ablauf & Serverentscheidung“; Liste, Startfehler und Läufe sind
 * dabei ausgeblendet. Freigeben/Ablehnen und Stoppen laufen über einen nativen Dialog
 * (#workflow-dialog, showModal), dessen Inhalt beim Öffnen aus dem aktuellen Detail gebaut wird;
 * ändert sich das Bedienungs-Kennzeichen bei offenem Dialog, schließt er mit „Der Stand hat sich
 * geändert“. Die Render-Funktionen von Seite und Liste liegen in views/workflow-detail.js; hier
 * bleiben Laden, Kennzeichen, Dialogsteuerung und alle POST-Aufrufe. Architekt-Entscheidung,
 * Sichtung, Reparatur und Abnahme sind unverändert (Restyling WS-4b). Ein Projektwechsel verwirft
 * Dialog, Detail und Entwurf und setzt den Hash ohne neuen History-Eintrag auf #/runs (F-874, F-923).
 *
 * Wichtig: Kein eigener Zustand, keine eigene Laufstatus-Ableitung — jede
 * Anzeige stammt direkt aus dem Server. Die Liste (renderWorkflows) kommt
 * seit F20 WS-2 aus dem Zustands-Aggregat (Abnehmer des einen Poll-Timers in
 * zustand.js); das Detail bleibt ein eigener Endpunktaufruf
 * (GET /api/workflows/<id>) und hängt als Detail-Auffrischer am selben
 * Timer, solange eines offen ist. #workflow-detail-inhalt (Timeline),
 * #workflow-blick und #workflow-technik-inhalt werden bei jedem Tick komplett
 * ersetzt, #workflow-bedienung und #workflow-aktionen nur bei ECHTER
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
import { empfehlungIdsFuerFreigabe, renderEmpfehlung, renderInstallierbarHinweis } from '../empfehlung-anzeige.js'
import { bindeEmpfehlungInstallation } from '../empfehlung-installation.js'
import { t } from '../i18n.js'
import { abonniereProjektWechsel, holeAktivesProjekt } from '../projekt-kontext.js'
import { escapeHtml } from '../render.js'
import { rollenName } from '../rollen-anzeige.js'
import { ersetzeRoute, navigiere, registriere } from '../router.js'
import { baueSichtungsFassung, istSichtungsHaltAnzeige } from '../sichtung-anzeige.js'
import { abonniere, abonniereDetailAuffrischer, pollJetzt } from '../zustand.js'
import { ordneSchritteNachPlan, renderAktionen, renderAufEinenBlick, renderTechnik, renderTimeline, renderWorkflowListe, renderWorkflowUngueltig, seitenTitel } from './workflow-detail.js'

/**
 * Escapter, übersetzter Text (Muster views/workboard-detail.js).
 * @param schluessel - i18n-Schlüssel
 * @param werte - Platzhalterwerte
 * @returns HTML
 */
function tx(schluessel, werte) {
  return escapeHtml(t(schluessel, werte))
}

/** HTML der zuletzt gerenderten Liste „Aufträge“ — ein Poll-Tick schreibt sie nur bei geändertem Inhalt neu, sonst ginge der Tastaturfokus einer Zeile alle zwei Sekunden verloren. */
let letzteListeHtml = null

/** zustand.workflows des letzten Poll-Ticks (oder null) — liefert den Titel (ziel) eines Details schon vor seiner eigenen Antwort. */
let letzteWorkflows = null

/** Rendert die Liste „Aufträge“ aus dem Zustands-Aggregat (F20 WS-2) — Abnehmer des einen Poll-Timers in zustand.js, kein eigener fetch(). @param workflows - zustand.workflows aus GET /api/zustand, oder null bei defekter Quelle */
function renderWorkflows(workflows) {
  letzteWorkflows = Array.isArray(workflows) ? workflows : null
  const html = renderWorkflowListe(workflows)
  if (html === letzteListeHtml) return
  letzteListeHtml = html
  document.getElementById('workflows').innerHTML = html
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

/**
 * F35 WS-2 (features/F35/feature.md): kompakte Tabelle AK · Urteil · Beleg unter dem
 * bestehenden Urteil-Block — kein eigener Detailabschnitt (Auftrag Punkt 5, "bestehende
 * Ansicht erweitern, keine neue Ansicht"). Leer/fehlend (Auftrag ohne Akzeptanzkriterien, oder
 * eine Fassung vor F35 WS-2) zeigt nichts an — kein leeres Tabellengerüst ohne Inhalt.
 * @param akUrteile - projektion.ak_urteile aus GET .../abnahme, oder undefined
 * @returns HTML-Block, oder '' wenn nichts anzuzeigen ist
 */
function renderAkUrteile(akUrteile) {
  if (!Array.isArray(akUrteile) || akUrteile.length === 0) return ''
  const zeilen = akUrteile
    .map(
      (eintrag) =>
        `<tr><td>${escapeHtml(eintrag.ak_id ?? '')}</td><td>${escapeHtml(eintrag.urteil ?? '')}</td><td>${escapeHtml(eintrag.beleg ?? '')}</td></tr>`
    )
    .join('')
  return `<h4>Urteil je Akzeptanzkriterium</h4>
    <table class="lauf-kopfdaten"><thead><tr><th>AK</th><th>Urteil</th><th>Beleg</th></tr></thead><tbody>${zeilen}</tbody></table>`
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
    <p><strong>Empfehlung:</strong> ${projektion.empfehlung ? escapeHtml(projektion.empfehlung) : '<span class="unbekannt">keine</span>'}</p>
    ${renderAkUrteile(projektion.ak_urteile)}`
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
// F35 WS-3 (features/F35/feature.md): additiver Hinweis, NUR bei erzeuger 'kern' (die
// automatische ADJUST-Automatik) — bei 'mensch'/null bleibt der Rückgabewert ''.
function formatiereAutomatischeAnpassungHinweis(entscheidung) {
  if (entscheidung.erzeuger !== 'kern') return ''
  return `<p class="unbekannt">Automatisch angelegt – Iteration ${escapeHtml(String(entscheidung.automatische_iteration ?? '?'))}/3 – Start erfordert deine Freigabe.</p>`
}

function renderAbnahmeEntscheidung(workflowId, workflowStatus, entscheidung, freigabeHalt) {
  if (entscheidung.status === 'ok') {
    return `<div class="unterabschnitt">
      <p><strong>Entscheidung:</strong> ${escapeHtml(entscheidung.ergebnis)} — ${escapeHtml(entscheidung.begruendung)}</p>
      <p class="unbekannt">Entschieden am ${escapeHtml(entscheidung.entschiedenAm)}</p>
      ${formatiereAutomatischeAnpassungHinweis(entscheidung)}
    </div>`
  }
  const vorherigeEntscheidung =
    entscheidung.status === 'veraltet'
      ? `<p class="unbekannt">Vorherige Entscheidung (bezieht sich auf eine frühere Fassung): ${escapeHtml(entscheidung.ergebnis)} am ${escapeHtml(entscheidung.entschiedenAm)} — ${escapeHtml(entscheidung.begruendung)}</p>
         ${formatiereAutomatischeAnpassungHinweis(entscheidung)}`
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
 * F44 WS-4a: Freigeben, Ablehnen und Stoppen kommen aus dem Dialog (imDialog). Ein Fehler steht
 * dann im Dialog, der offen bleibt; bei Erfolg schließt er, und die Meldung steht am Ablauf. Hat
 * sich der Dialog inzwischen geschlossen (Escape, Stand-Änderung), steht auch ein Fehler am Ablauf.
 * @param anfrage - () => Promise<Response>, die konkrete api.js-Bedienung
 * @param knopf - auslösender Button; wird während des Aufrufs gesperrt
 * @param erfolgstext - was im Erfolgsfall gemeldet wird
 * @param imDialog - true, wenn die Bedienung aus #workflow-dialog kommt
 */
async function sendeWorkflowBedienung(anfrage, knopf, erfolgstext, imDialog = false) {
  // Prüfpass WS-4a: die Antwort gehört zu GENAU diesem Workflow, diesem Projekt und diesem Dialog —
  // wechselt eines davon während der Anfrage, wird ihre Ausgabe verworfen (keine Meldung von A unter B,
  // kein Schließen eines inzwischen neu geöffneten Dialogs).
  const workflowBeimStart = gewaehlteWorkflowId
  const projektBeimStart = holeAktivesProjekt().id
  const dialogBeimStart = imDialog ? offenerDialog : null
  zeigeBedienungsMeldung(null)
  if (imDialog) zeigeDialogMeldung(null)
  // Im Dialog ist ALLES gesperrt (Freigeben, Ablehnen, Abbrechen, Schließen; Escape über cancel und
  // ein erneutes Öffnen über laufendeDialogBedienung) — kein zweiter POST, kein „Abbrechen“, das die
  // laufende Entscheidung nicht mehr aufhält.
  const knoepfe = imDialog ? [...document.getElementById('workflow-dialog').querySelectorAll('button')] : [knopf]
  if (imDialog) laufendeDialogBedienung = { workflowId: workflowBeimStart }
  for (const k of knoepfe) k.disabled = true
  const giltNoch = () => gewaehlteWorkflowId === workflowBeimStart && holeAktivesProjekt().id === projektBeimStart
  const unserDialogOffen = () => imDialog && offenerDialog === dialogBeimStart && dialogOffen()
  try {
    const antwort = await anfrage()
    const inhalt = await antwort.json().catch(() => ({}))
    if (!giltNoch()) {
      console.info(`[workflows] Antwort zu '${workflowBeimStart}' verworfen — Ansicht oder Projekt inzwischen gewechselt (HTTP ${antwort.status}).`)
    } else if (antwort.ok) {
      if (unserDialogOffen()) schliesseDialog()
      zeigeBedienungsMeldung(`${erfolgstext}${inhalt.laufAbgebrochen === true ? ` ${t('ablauf.meldung.laufAbgebrochen')}` : ''}${inhalt.laufAbgebrochen === false ? ` ${t('ablauf.meldung.nichtsAbgebrochen')}` : ''}${inhalt.bezeugt === false ? ` ${t('ablauf.meldung.nichtBezeugt')}` : ''}${inhalt.kenntnisnahme?.neu === false ? ` ${t('ablauf.meldung.kenntnisnahme')}` : ''}`, 'erfolg')
      // Nach dem Dialog liest ein Screenreader das Ergebnis über den Fokus (keine zweite Live-Region).
      if (imDialog) document.getElementById('workflow-bedienung-meldung').focus()
    } else {
      zeigeBedienungsFehler(`${antwort.status}: ${inhalt.grund ?? t('ablauf.fehler.unbekannt')}`, unserDialogOffen(), dialogBeimStart)
    }
  } catch (fehler) {
    console.error('[workflows] Bedienung fehlgeschlagen:', fehler)
    if (giltNoch()) zeigeBedienungsFehler(t('ablauf.fehler.anfrage', { meldung: fehler.message }), unserDialogOffen(), dialogBeimStart)
  } finally {
    if (imDialog) laufendeDialogBedienung = null
    for (const k of knoepfe) k.disabled = false
  }
  void pollJetzt()
}

/**
 * Ein Fehler einer Bedienung: im Dialog, solange dieser offen und sein Stand aktuell ist (der Dialog
 * bleibt offen); hat sich der Stand während der Anfrage geändert, schließt der Dialog und der Fehler
 * steht am Ablauf (er sagt mehr als „Stand geändert“); ohne Dialog ebenfalls am Ablauf.
 * @param text - Fehlertext
 * @param imOffenenDialog - true, wenn der auslösende Dialog noch offen ist
 * @param dialog - offenerDialog beim Absenden, oder null
 */
function zeigeBedienungsFehler(text, imOffenenDialog, dialog) {
  if (imOffenenDialog && dialog.kennzeichen === bedienungsKennzeichen) {
    zeigeDialogMeldung(text)
    return
  }
  if (imOffenenDialog) schliesseDialog()
  zeigeBedienungsMeldung(text)
  if (dialog !== null) document.getElementById('workflow-bedienung-meldung').focus()
}

// ─── Dialog „Nächsten Schritt freigeben“ / „Ausführung stoppen“ (F44 WS-4a, F3/F3b/F4/F5/F10) ────

/**
 * Der offene Dialog: null oder { art: 'freigabe' | 'stopp', kennzeichen }. kennzeichen ist das
 * Bedienungs-Kennzeichen beim Öffnen — ändert es sich, schließt aktualisiereWorkflowBedienung den
 * Dialog (kein Nachladen in einen offenen Dialog: sonst stünde eine Begründung unter einem anderen
 * Schritt oder einer anderen Empfehlung, als sie geschrieben wurde).
 */
let offenerDialog = null

/**
 * Eine Begründung aus einem Dialog, den eine Stand-Änderung geschlossen hat: { art, basis, wert }.
 * basis ist das Kennzeichen ohne Empfehlung (F-809) — nur bei gleichem Workflow, Halt und Schritt
 * steht die Begründung beim erneuten Öffnen wieder im Feld, nie unter einem anderen Schritt.
 */
let geretteteBegruendung = null

/** Detail des letzten Ladevorgangs, aus dem der Dialog beim Öffnen gebaut wird: { workflowId, daten, naechster, empfehlung }. */
let aktuellesDetail = null

/** Die laufende Bedienung aus dem Dialog ({ workflowId }) oder null — sperrt Escape, Abbrechen, Wiederöffnen und das Schließen bei Stand-Änderung, bis die Antwort da ist. */
let laufendeDialogBedienung = null

/** Bedienungs-Kennzeichen ohne Empfehlung vor einem Ladefehler des Details — damit überleben angefangene Begründungen im Bedienblock einen kurzen Fehler (siehe zeigeDetailNichtLadbar). */
let bedienungsBasisVorFehler = null

/** Kennzeichen ohne das letzte Glied (die Empfehlung, F-809). @param k - Kennzeichen oder null @returns Kennzeichen ohne Empfehlung oder null */
function ohneEmpfehlung(k) {
  return k === null ? null : k.slice(0, k.lastIndexOf('|'))
}

/** @returns true, solange #workflow-dialog offen ist */
function dialogOffen() {
  return document.getElementById('workflow-dialog').open === true
}

/** @param text - anzuzeigender Fehlertext im Dialog, oder null zum Ausblenden. Keine Live-Region (eine Live-Region: die Persona); der Fokus geht auf die Meldung. */
function zeigeDialogMeldung(text) {
  const anzeige = document.getElementById('workflow-dialog-meldung')
  if (anzeige === null) return
  if (text === null) {
    anzeige.hidden = true
    anzeige.textContent = ''
    return
  }
  anzeige.textContent = text
  anzeige.hidden = false
  anzeige.focus()
}

/** Kopf des Dialogs (Vorlage .dialog-heading) mit Schließen-Knopf. @param titelSchluessel - i18n-Schlüssel des Titels @returns HTML */
function dialogKopf(titelSchluessel) {
  return `<div class="dialog-heading"><h2 id="workflow-dialog-titel">${tx(titelSchluessel)}</h2><button type="button" class="icon-button wf-dialog-abbrechen" aria-label="${tx('ablauf.dialog.schliessen')}"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18" /></svg></button></div>`
}

/**
 * Inhalt des Freigabedialogs (F3, F3b, F4, F5): fälliger Schritt, Katalog-Empfehlung (Checkboxen
 * disabled, „Freigeben & installieren“), Pflichtbegründung, „Freigeben & starten“ mit den
 * angezeigten wirdGenutzt-ids (data-empfehlung-ids, „Anzeige = Start“), „Ablehnen“ (Freigabe-Veto,
 * ABGELEHNT mit derselben Pflichtbegründung) und „Abbrechen“.
 * @param detail - aktuellesDetail
 * @returns HTML
 */
function renderFreigabeDialog(detail) {
  const kennung = escapeHtml(detail.workflowId)
  const faelligerSchritt = escapeHtml(detail.naechster?.schrittId ?? '')
  const schritt = Array.isArray(detail.daten?.schritte) ? detail.daten.schritte.find((s) => s.schritt_id === detail.naechster?.schrittId) : undefined
  const rolle = schritt === undefined ? '' : `<strong>${escapeHtml(rollenName(schritt.rolle))}</strong> `
  // F36 WS-3: die angezeigten wirdGenutzt-ids gehen mit der Freigabe mit (data-empfehlung-ids, „Anzeige = Start“).
  const empfehlungIds = empfehlungIdsFuerFreigabe(detail.empfehlung)
  const empfehlungAttribut = empfehlungIds === undefined ? '' : ` data-empfehlung-ids="${escapeHtml(JSON.stringify(empfehlungIds))}"`
  const abbrechen = `<button type="button" class="button wf-dialog-abbrechen">${tx('ablauf.dialog.abbrechen')}</button>`
  const ablehnen = `<button type="button" class="button danger wf-aktion" data-aktion="ablehnen" data-workflow-id="${kennung}" data-schritt-id="${faelligerSchritt}">${tx('ablauf.dialog.freigabe.ablehnen')}</button>`
  return `${dialogKopf('ablauf.dialog.freigabe.titel')}
    <p class="subtle">${tx('ablauf.dialog.freigabe.text')}</p>
    <p class="workflow-dialog-schritt">${tx('ablauf.dialog.faellig')}: ${rolle}<code>${faelligerSchritt}</code></p>
    ${renderEmpfehlung(detail.empfehlung)}
    <label class="field" for="wf-freigabe-begruendung">${tx('ablauf.dialog.freigabe.begruendung')}</label>
    <textarea id="wf-freigabe-begruendung" rows="3" aria-required="true" aria-describedby="workflow-dialog-meldung" placeholder="${tx('ablauf.dialog.freigabe.platzhalter')}"></textarea>
    <p class="subtle">${tx('ablauf.dialog.freigabe.ablehnenHinweis')}</p>
    ${renderInstallierbarHinweis(detail.empfehlung)}
    <div class="dialog-actions">${abbrechen}${ablehnen}<button type="button" class="button primary wf-aktion" data-aktion="freigeben" data-workflow-id="${kennung}" data-schritt-id="${faelligerSchritt}"${empfehlungAttribut}>${tx('ablauf.dialog.freigabe.bestaetigen')}</button></div>
    <p id="workflow-dialog-meldung" class="fehler" tabindex="-1" hidden></p>`
}

/**
 * Inhalt des Stoppdialogs (F10): Pflichtbegründung, „Stoppen“ und „Abbrechen“.
 * @param detail - aktuellesDetail
 * @returns HTML
 */
function renderStoppDialog(detail) {
  return `${dialogKopf('ablauf.dialog.stopp.titel')}
    <p class="subtle">${tx('ablauf.dialog.stopp.text')}</p>
    <label class="field" for="wf-stopp-begruendung">${tx('ablauf.dialog.stopp.begruendung')}</label>
    <textarea id="wf-stopp-begruendung" rows="3" aria-required="true" aria-describedby="workflow-dialog-meldung"></textarea>
    <div class="dialog-actions"><button type="button" class="button wf-dialog-abbrechen">${tx('ablauf.dialog.abbrechen')}</button><button type="button" class="button danger wf-aktion" data-aktion="stoppen" data-workflow-id="${escapeHtml(detail.workflowId)}">${tx('ablauf.dialog.stopp.bestaetigen')}</button></div>
    <p id="workflow-dialog-meldung" class="fehler" tabindex="-1" hidden></p>`
}

/**
 * Öffnet den Dialog (nativ, showModal) mit Inhalt aus dem aktuellen Detail. Der Fokus liegt auf
 * der Begründung; eine gerettete Begründung desselben Halts steht wieder im Feld.
 * @param art - 'freigabe' oder 'stopp'
 */
function oeffneDialog(art) {
  // Solange eine Dialog-Bedienung läuft, öffnet kein neuer Dialog (sonst wäre ein zweiter POST möglich).
  if (aktuellesDetail === null || bedienungsKennzeichen === null || laufendeDialogBedienung !== null) return
  const dialog = document.getElementById('workflow-dialog')
  dialog.innerHTML = art === 'freigabe' ? renderFreigabeDialog(aktuellesDetail) : renderStoppDialog(aktuellesDetail)
  offenerDialog = { art, kennzeichen: bedienungsKennzeichen }
  const feld = document.getElementById(art === 'freigabe' ? 'wf-freigabe-begruendung' : 'wf-stopp-begruendung')
  // Eine gerettete Begründung gilt nur für dieselbe Dialogart und denselben Halt; ein anderer Dialog lässt sie liegen.
  if (geretteteBegruendung !== null && geretteteBegruendung.art === art) {
    if (geretteteBegruendung.basis === ohneEmpfehlung(bedienungsKennzeichen)) feld.value = geretteteBegruendung.wert
    geretteteBegruendung = null
  }
  if (!dialog.open) dialog.showModal()
  feld.focus()
}

/** Schließt den Dialog ohne Wirkung (Abbrechen, Erfolg, Projekt- oder Workflowwechsel); Escape schließt nativ. */
function schliesseDialog() {
  const dialog = document.getElementById('workflow-dialog')
  offenerDialog = null
  if (dialog.open) dialog.close()
}

/**
 * Schließt den Dialog, weil sich das Bedienungs-Kennzeichen geändert hat (c): Meldung am Ablauf,
 * der Fokus geht auf sie (der auslösende Knopf ist inzwischen neu gerendert). Eine angefangene
 * Begründung wird für denselben Halt gerettet. Hat sich nur die Katalog-Empfehlung geändert (etwa
 * nach „Freigeben & installieren“ im Dialog), sagt die Meldung das und nennt die gerettete Begründung.
 * @param neuesKennzeichen - das Bedienungs-Kennzeichen, das den Dialog überholt hat
 */
function schliesseDialogVeraltet(neuesKennzeichen) {
  const art = offenerDialog?.art
  const feld = art === undefined ? null : document.getElementById(art === 'freigabe' ? 'wf-freigabe-begruendung' : 'wf-stopp-begruendung')
  const nurEmpfehlung = offenerDialog !== null && ohneEmpfehlung(offenerDialog.kennzeichen) === ohneEmpfehlung(neuesKennzeichen)
  if (feld !== null && feld.value.trim() !== '') geretteteBegruendung = { art, basis: ohneEmpfehlung(offenerDialog.kennzeichen), wert: feld.value }
  schliesseDialog()
  if (nurEmpfehlung) zeigeBedienungsMeldung(t('ablauf.dialog.empfehlungGeaendert'), 'hinweis')
  else zeigeBedienungsMeldung(t('ablauf.dialog.standGeaendert'))
  document.getElementById('workflow-bedienung-meldung').focus()
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
 * Server als möglich ausweist: status für den Reparaturzug,
 * architekturEntscheidung für die Architektur-Entscheidung (Regel 1c, F39
 * WS-2b) — sie steht bewusst ZUERST, wenn sie greift — und sichtung für den
 * F-760-Halt. F44 WS-4a: Starten, Freigeben/Ablehnen und Stoppen sind in die
 * Aktionszeile und den Dialog umgezogen (renderAktionen in workflow-detail.js,
 * renderFreigabeDialog/renderStoppDialog oben); Markup und Verhalten der
 * übrigen drei Blöcke sind unverändert (Restyling WS-4b, Gate f42).
 * @param workflowId - Kennung des angezeigten Workflows
 * @param status - daten.status
 * @param ungueltig - true, wenn die Fassung nicht gegen WORKFLOW_V0 validiert
 * @param architekturEntscheidung - { schrittId, fragen } aus GET /api/workflows/<id>, oder null
 * @param sichtung - F-768: Ergebnis von istSichtungsHaltAnzeige, oder null (dann kein Sichtungsknopf)
 * @returns HTML-Block, oder '' ohne fällige Bedienung
 */
function renderWorkflowBedienung(workflowId, status, ungueltig = false, architekturEntscheidung = null, sichtung = null) {
  const kennung = escapeHtml(workflowId)
  const bloecke = []

  if (architekturEntscheidung !== null) {
    bloecke.push(renderArchitekturEntscheidung(workflowId, architekturEntscheidung))
  }

  // F-768: nur beim reinen F-760-Halt; mit Zusatzgründen bleibt allein die Reparaturfassung darunter.
  if (sichtung !== null && !ungueltig) {
    bloecke.push(`<div class="unterabschnitt">
      <p>Schritt <code>${escapeHtml(sichtung.schrittId)}</code> endete VERWEIGERT, nur weil Befehle abgelehnt wurden (siehe „Grund“ unten). Sieh dir die abgelehnten Befehle und die Änderungen des Laufs an. Der Halt-Grund wird danach nicht mehr angezeigt; die abgelehnten Befehle bleiben im Lauf-Detail <code>${escapeHtml(sichtung.laufId)}</code> lesbar. Bestätigst du, geht es mit <code>${escapeHtml(sichtung.nachfolger)}</code> weiter; <code>${escapeHtml(sichtung.schrittId)}</code> bleibt als VERWEIGERT festgehalten. Der nächste Schritt startet nicht von selbst — danach unten „Starten“ bzw. „Freigeben“.</p>
      <label for="wf-sichtung-begruendung">Begründung der Sichtung (Pflicht)</label>
      <textarea id="wf-sichtung-begruendung" rows="2"></textarea>
      <div><button class="btn btn-primary wf-aktion" data-aktion="sichtung" data-workflow-id="${kennung}">Sichtung bestätigt – weiter</button></div>
    </div>`)
  }

  if (REPARIERBARE_WORKFLOW_STATUS.includes(status) || ungueltig) {
    bloecke.push(`<div class="unterabschnitt">
      <p>${ungueltig ? 'Diese Fassung validiert nicht — aus ihr startet kein Lauf. Der Weg heraus ist eine neue Fassung derselben' : 'Der Workflow steht. Der Weg heraus ist eine neue Fassung derselben'} <code>workflow_id</code>.</p>
      <button class="btn wf-aktion" data-aktion="reparatur" data-workflow-id="${kennung}">Reparaturfassung vorbereiten</button>
    </div>`)
  }

  // F44 WS-4a: ohne fällige Bedienung bleibt der Block leer — Freigeben, Starten und Stoppen stehen
  // in der Aktionszeile unter der Timeline (renderAktionen), der Status in „Auf einen Blick“.
  if (bloecke.length === 0) return ''
  return `<div class="detail-block"><h3>Bedienung</h3>${bloecke.join('')}</div>`
}

/** Kennzeichen des zuletzt gerenderten Bedienblocks — verhindert, dass eine angefangene Pflichtbegründung durch den 2-Sekunden-Poll verloren geht (F-249). Nur bei ECHTER Lageänderung wird neu gebaut. */
let bedienungsKennzeichen = null

/**
 * Baut Bedienblock und Aktionszeile neu, aber nur bei ECHTER Lageänderung (Kennzeichen). F44 WS-4a:
 * Ist dabei der Dialog offen, schließt er mit „Der Stand hat sich geändert“ (kein Nachladen in den
 * offenen Dialog). Lag der Fokus in der Aktionszeile, geht er auf ihre erste Aktion bzw. die
 * Seitenüberschrift.
 * @param workflowId - angezeigter Workflow @param status - daten.status @param naechster - Automaten-Verdikt, oder null @param ungueltig - true bei ungültiger Fassung @param architekturEntscheidung - { schrittId, fragen }, oder null (F39 WS-2b) @param empfehlung - Katalog-Empfehlung, oder null (F36 WS-3; Teil des Kennzeichens, damit eine geänderte Empfehlung neu gerendert wird) @param sichtung - F-768: istSichtungsHaltAnzeige, oder null
 */
function aktualisiereWorkflowBedienung(workflowId, status, naechster, ungueltig = false, architekturEntscheidung = null, empfehlung = null, sichtung = null) {
  // Die Empfehlung bleibt das LETZTE Glied (F-809: ohneEmpfehlung schneidet am letzten '|').
  const kennzeichen = `${workflowId}|${status}|${naechster?.art ?? 'null'}|${naechster?.schrittId ?? 'null'}|${ungueltig}|${architekturEntscheidung?.schrittId ?? 'null'}|${architekturEntscheidung?.fragen?.length ?? 0}|${sichtung?.laufId ?? 'null'}|${JSON.stringify(empfehlung)}`
  if (kennzeichen === bedienungsKennzeichen) return
  // F36 WS-5a (F-809): Wechselt nur die Empfehlung (z. B. nach „Freigeben & installieren“), bleiben
  // Workflow, Halt, Schritt und Architektur-Fragen gleich — nur dann überleben angefangene Begründungen
  // das Neu-Rendern (nie auf einen anderen Schritt übertragen).
  const basisAlt = bedienungsKennzeichen !== null ? ohneEmpfehlung(bedienungsKennzeichen) : bedienungsBasisVorFehler
  bedienungsBasisVorFehler = null
  const gleicherWorkflow = basisAlt === ohneEmpfehlung(kennzeichen)
  // Während einer laufenden Dialog-Bedienung schließt der Dialog nicht hier, sondern mit ihrer Antwort
  // (sendeWorkflowBedienung) — sonst stünde kurz „Stand geändert“ über der eigenen Entscheidung.
  const dialogVeraltet = offenerDialog !== null && laufendeDialogBedienung === null
  bedienungsKennzeichen = kennzeichen
  const container = document.getElementById('workflow-bedienung')
  const eingaben = gleicherWorkflow ? [...container.querySelectorAll('textarea[id]')].map((feld) => [feld.id, feld.value]) : []
  container.innerHTML = renderWorkflowBedienung(workflowId, status, ungueltig, architekturEntscheidung, sichtung)
  container.hidden = false
  for (const [id, wert] of eingaben) {
    const feld = document.getElementById(id)
    if (feld instanceof HTMLTextAreaElement && container.contains(feld)) feld.value = wert
  }
  const aktionen = document.getElementById('workflow-aktionen')
  const hatteFokus = aktionen.contains(document.activeElement)
  aktionen.innerHTML = renderAktionen(workflowId, status, naechster, ungueltig)
  if (hatteFokus) (aktionen.querySelector('.wf-aktion') ?? document.getElementById('workflow-detail-titel')).focus()
  if (dialogVeraltet) schliesseDialogVeraltet(kennzeichen)
}

// ─── Sichtung bestätigt – weiter (F-768; Erkennung und Fassung in ../sichtung-anzeige.js) ────

/**
 * F-768: lädt die aktuelle Fassung frisch, prüft den Halt und reicht die Sichtungsfassung über den
 * bestehenden Reparatur-Schreibweg (POST /api/workflows) mit sichtung_bestaetigt und Begründung ein.
 * @param workflowId - Kennung des Workflows
 * @param begruendung - nicht-leere Begründung
 * @param knopf - auslösender Button
 */
async function bestaetigeSichtung(workflowId, begruendung, knopf) {
  await sendeWorkflowBedienung(
    async () => {
      const antwort = await holeWorkflowDetail(workflowId)
      const inhalt = await antwort.json().catch(() => ({}))
      const sichtung = antwort.ok ? istSichtungsHaltAnzeige(inhalt.daten) : null
      if (sichtung === null) {
        return new Response(JSON.stringify({ grund: 'Der Workflow steht nicht mehr auf dem F-760-Halt — Ansicht neu laden.' }), { status: 409 })
      }
      return reicheWorkflowFassungEin({ ...baueSichtungsFassung(inhalt.daten, sichtung), sichtung_bestaetigt: true, begruendung })
    },
    knopf,
    'Sichtung festgehalten, neue Fassung angenommen. Der nächste Schritt startet nicht von selbst — bitte „Starten“ bzw. „Freigeben“.'
  )
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

/** workflowId des aktuell als Seite angezeigten Workflows, oder null. */
let gewaehlteWorkflowId = null

/** Fortlaufende Nummer je ladeWorkflowDetail-Aufruf (Überholschutz, siehe Funktionskommentar unten). */
let workflowRenderZaehler = 0

/** AbortController der zuletzt gestarteten GET /api/workflows/<id>-Anfrage (Perf-Fix fix/zustand-poll-kosten, Punkt 5) — vor jedem neuen Aufruf abgebrochen, damit eine langsame Antwort nicht mit jedem Poll-Tick eine weitere parallele Verbindung öffnet und das Verbindungslimit des Browsers erschöpft. */
let aktiveWorkflowDetailAnfrage = null

/**
 * F-926-Muster: true, solange seit dem letzten Betreten von `#/runs` keine andere Route kam —
 * öffnet der Nutzer dann ein Detail, war der vorige History-Eintrag die Liste.
 */
let listeZuletzt = false

/** true, wenn das offene Detail direkt aus der Liste geöffnet wurde: „← Alle Aufträge“ geht dann per history.back() zurück statt einen neuen Eintrag anzulegen. */
let detailAusListe = false

/**
 * Zeigt bzw. verbirgt die Seite des Workflow-Details. Liste, Startfehler und Läufe verschwinden
 * dabei über die Klasse an #view-runs (style.css) — nicht über ihr hidden-Attribut, das views/runs.js
 * für #lauf-detail selbst führt.
 * @param offen - true: Detail als ganze Seite
 */
function zeigeDetailSeite(offen) {
  document.getElementById('workflow-detail').hidden = !offen
  document.getElementById('view-runs').classList.toggle('workflow-seite-offen', offen)
}

/**
 * Zeigt den Fehlerzustand des Details (Vorlage .note.red): Überschrift plus Servertext bzw.
 * Netzfehler; null blendet ihn aus.
 * @param text - Fehlertext oder null
 */
function zeigeDetailFehler(text) {
  const anzeige = document.getElementById('workflow-detail-fehler')
  if (text === null) {
    anzeige.hidden = true
    anzeige.innerHTML = ''
    return
  }
  anzeige.innerHTML = `<strong>${tx('ablauf.fehler.titel')}</strong><p>${escapeHtml(text)}</p>`
  anzeige.hidden = false
}

/**
 * Fehlerzustand des Details (404, 500, Netz): nichts vom alten Stand bleibt bedienbar — Timeline,
 * „Auf einen Blick“, Aktionen und F12 werden geleert, ein offener Dialog schließt, aus dem alten
 * Detail lässt sich keiner mehr öffnen. Der Bedienblock (WS-4b) wird nur ausgeblendet, damit eine
 * angefangene Begründung dort einen kurzen Fehler übersteht; der Reparaturentwurf bleibt.
 * @param text - Fehlertext (Servergrund bzw. Netzfehler)
 */
function zeigeDetailNichtLadbar(text) {
  document.getElementById('workflow-detail-inhalt').innerHTML = ''
  document.getElementById('workflow-blick').innerHTML = ''
  document.getElementById('workflow-technik-inhalt').innerHTML = ''
  document.getElementById('workflow-aktionen').innerHTML = ''
  document.getElementById('workflow-bedienung').hidden = true
  if (bedienungsKennzeichen !== null) bedienungsBasisVorFehler = ohneEmpfehlung(bedienungsKennzeichen)
  bedienungsKennzeichen = null
  aktuellesDetail = null
  if (laufendeDialogBedienung === null) schliesseDialog()
  zeigeDetailFehler(text)
}

/**
 * Lädt GET /api/workflows/<id> und rendert die Seite: Timeline, „Auf einen Blick“, Aktionen und
 * den Aufklappbereich F12. Anders als ladeLaufDetail hängt diese Funktion am Poll (der Zweck der
 * Ansicht ist zu sehen, wie der Cursor wandert). Zwei Ticks für DENSELBEN Workflow können sich
 * überholen (F-252) — nur der jüngste Aufruf darf schreiben.
 * Wechselt der Aufruf dabei auf einen ANDEREN Workflow als den zuvor angezeigten (Klick auf ein
 * anderes Workflow-Detail, Browser-Vor/Zurück), werden Dialog, Bedienblock und ein offener
 * Reparaturentwurf zuerst geräumt (raeumeWorkflowBedienzustand, QA-Pass F20 WS-1, TC-11) — sonst
 * bliebe ein Entwurf des VORHERIGEN Workflows unter der neuen Ansicht sichtbar und einreichbar,
 * fachlich falsch zugeordnet.
 * @param workflowId - Kennung aus der Route `#/workflows/<id>`
 * @param scrollen - true beim Öffnen (Ladezustand, Fokus auf den Titel), false beim Neurendern durch den Poll
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
  const inhalt = document.getElementById('workflow-detail-inhalt')
  const titel = document.getElementById('workflow-detail-titel')

  zeigeDetailSeite(true)
  // Der Fehlerzustand bleibt bei Poll-Ticks stehen (kein Flackern alle zwei Sekunden); erst eine
  // erfolgreiche Antwort oder ein neues Öffnen blendet ihn aus.
  if (scrollen) {
    zeigeDetailFehler(null)
    // Bis zur eigenen Antwort trägt der Titel das Ziel aus der Liste, ohne Listeneintrag die ID.
    titel.textContent = seitenTitel(letzteWorkflows?.find((w) => w.workflowId === workflowId)?.ziel, workflowId)
    inhalt.innerHTML = `<p class="subtle">${tx('ablauf.laedt')}</p>`
    document.getElementById('workflow-blick').innerHTML = ''
    document.getElementById('workflow-technik-inhalt').innerHTML = ''
    titel.focus({ preventScroll: true })
    document.getElementById('workflow-detail').scrollIntoView({ block: 'start' })
  }

  try {
    const antwort = await holeWorkflowDetail(workflowId, abbruchsteuerung.signal)
    if (istUeberholt()) return
    if (!antwort.ok) {
      const koerper = await antwort.json().catch(() => ({}))
      if (istUeberholt()) return
      zeigeDetailNichtLadbar(`${antwort.status}: ${koerper.grund ?? t('ablauf.fehler.unbekannt')}`)
      return
    }
    const detail = await antwort.json()
    if (istUeberholt()) return
    const daten = detail.daten ?? {}
    const verstoesse = Array.isArray(detail.verstoesse) ? detail.verstoesse : []
    const naechster = detail.naechster ?? null
    zeigeDetailFehler(null)
    titel.textContent = seitenTitel(daten.ziel, workflowId)
    // Erst das Detail, dann das Kennzeichen: ein Dialog, der danach öffnet, baut aus genau diesem Stand.
    aktuellesDetail = { workflowId, daten, naechster, empfehlung: detail.empfehlung ?? null }
    aktualisiereWorkflowBedienung(workflowId, daten.status ?? null, naechster, verstoesse.length > 0, detail.architekturEntscheidung ?? null, detail.empfehlung ?? null, istSichtungsHaltAnzeige(daten))
    // Eigener Endpunkt, eigener Überholschutz (istUeberholt), fire-and-forget — blockiert das
    // übrige Rendern nicht.
    void aktualisiereAbnahmeAbschnitt(workflowId, istUeberholt)
    const ungueltigBlock = verstoesse.length > 0 ? renderWorkflowUngueltig(verstoesse) : ''
    const projektName = holeAktivesProjekt().name
    if (!Array.isArray(daten.schritte) || daten.schritte.length === 0) {
      inhalt.innerHTML = [ungueltigBlock === '' ? renderWorkflowUngueltig([t('ablauf.ungueltig.keineSchritte')]) : ungueltigBlock, renderTimeline([])].join('')
      document.getElementById('workflow-blick').innerHTML = renderAufEinenBlick({ daten, naechster, geordnet: [], projektName })
      document.getElementById('workflow-technik-inhalt').innerHTML = renderTechnik({ daten, versionSequenz: detail.versionSequenz, naechster })
      return
    }
    const geordnet = ordneSchritteNachPlan(daten.schritte)
    const aktiveLaufIds = await ermittleAktiveLaufIds(geordnet)
    if (istUeberholt()) return
    inhalt.innerHTML = ungueltigBlock + renderTimeline(geordnet, { naechster, cursorId: daten.aktiver_schritt_id ?? null, aktiveLaufIds })
    document.getElementById('workflow-blick').innerHTML = renderAufEinenBlick({ daten, naechster, geordnet, projektName })
    document.getElementById('workflow-technik-inhalt').innerHTML = renderTechnik({ daten, versionSequenz: detail.versionSequenz, naechster, geordnet, aktiveLaufIds })
  } catch (fehler) {
    if (istUeberholt()) return
    zeigeDetailNichtLadbar(t('ablauf.fehler.anfrage', { meldung: fehler.message }))
  }
}

/** Räumt Dialog, Bedienblock, Aktionen, Meldungen und einen offenen Reparaturentwurf auf — gemeinsame Teilmenge von schliesseWorkflowDetail und dem Workflow-Wechsel in ladeWorkflowDetail (TC-11, QA-Pass F20 WS-1). */
function raeumeWorkflowBedienzustand() {
  schliesseDialog()
  geretteteBegruendung = null
  aktuellesDetail = null
  bedienungsKennzeichen = null
  bedienungsBasisVorFehler = null
  document.getElementById('workflow-bedienung').innerHTML = ''
  document.getElementById('workflow-bedienung').hidden = false
  document.getElementById('workflow-aktionen').innerHTML = ''
  zeigeBedienungsMeldung(null)
  abnahmeKennzeichen = null
  document.getElementById('workflow-abnahme').innerHTML = ''
  zeigeAbnahmeMeldung(null)
  verwirfReparaturEntwurf()
}

/** Schließt die Seite des Workflow-Details samt Dialog, Bedienblock und offenem Reparaturentwurf; Liste, Startfehler und Läufe erscheinen wieder. */
function schliesseWorkflowDetail() {
  gewaehlteWorkflowId = null
  detailAusListe = false
  aktiveWorkflowDetailAnfrage?.abort()
  zeigeDetailSeite(false)
  raeumeWorkflowBedienzustand()
}

/**
 * F-926-Muster: legt nach dem Schließen den Fokus auf die Zeile des Workflows in der Liste; ohne
 * Zeile (Liste noch nicht geladen, Workflow nicht mehr da) auf die Seitenüberschrift.
 * @param workflowId - Kennung des zuvor offenen Details
 */
function fokussiereZeile(workflowId) {
  const zeile = [...document.getElementById('workflows').querySelectorAll('.workflow-zeile')].find((z) => z.dataset.workflowId === workflowId)
  ;(zeile ?? document.getElementById('runs-titel')).focus()
}

/**
 * Führt EINE angeklickte Bedienung aus — die Pflichtbegründungen werden hier
 * NICHT gegen den Server vorgeprüft, sondern nur auf "nicht leer" (dieselbe
 * Bedingung, die der Server stellt). F44 WS-4a: „Nächsten Schritt freigeben“ und
 * „Ausführung stoppen“ öffnen zuerst den Dialog; Freigeben, Ablehnen und Stoppen
 * kommen aus ihm, ihre Meldungen stehen im Dialog (Fokus auf das Feld bzw. die Meldung).
 * @param button - der geklickte .wf-aktion-Knopf
 */
async function fuehreWorkflowAktionAus(button) {
  const workflowId = button.dataset.workflowId
  const aktion = button.dataset.aktion
  zeigeBedienungsMeldung(null)

  if (aktion === 'freigabe-oeffnen' || aktion === 'stopp-oeffnen') {
    oeffneDialog(aktion === 'freigabe-oeffnen' ? 'freigabe' : 'stopp')
    return
  }

  if (aktion === 'starten') {
    await sendeWorkflowBedienung(() => starteWorkflowSchritt(workflowId), button, t('ablauf.meldung.gestartet'))
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
    const feld = document.getElementById('wf-freigabe-begruendung')
    const begruendung = feld.value
    if (begruendung.trim().length === 0) {
      zeigeDialogMeldung(t('ablauf.dialog.pflicht'))
      feld.focus()
      return
    }
    // F36 WS-3: data-empfehlung-ids steht nur am Freigeben-Knopf, und nur wenn eine Empfehlung angezeigt wurde.
    let empfehlungIds = {}
    try {
      empfehlungIds = button.dataset.empfehlungIds !== undefined ? { empfehlungIds: JSON.parse(button.dataset.empfehlungIds) } : {}
    } catch (fehler) {
      console.error('[workflows] data-empfehlung-ids nicht lesbar:', fehler)
      zeigeDialogMeldung(t('ablauf.dialog.empfehlungUnlesbar'))
      return
    }
    await sendeWorkflowBedienung(
      () => sendeWorkflowFreigabe(workflowId, { schrittId: button.dataset.schrittId, entscheidung: aktion === 'freigeben' ? 'FREIGEGEBEN' : 'ABGELEHNT', begruendung, ...empfehlungIds }),
      button,
      aktion === 'freigeben' ? t('ablauf.meldung.freigegeben') : t('ablauf.meldung.abgelehnt'),
      true
    )
    return
  }

  if (aktion === 'stoppen') {
    const feld = document.getElementById('wf-stopp-begruendung')
    const begruendung = feld.value
    if (begruendung.trim().length === 0) {
      zeigeDialogMeldung(t('ablauf.dialog.stopp.pflicht'))
      feld.focus()
      return
    }
    await sendeWorkflowBedienung(() => stoppeWorkflow(workflowId, { begruendung }), button, t('ablauf.meldung.gestoppt'), true)
    return
  }

  if (aktion === 'sichtung') {
    const begruendung = document.getElementById('wf-sichtung-begruendung').value
    if (begruendung.trim().length === 0) {
      zeigeBedienungsMeldung('Die Begründung ist Pflicht — sie wird als Kenntnisnahme zum VERWEIGERT-Lauf festgehalten.')
      return
    }
    await bestaetigeSichtung(workflowId, begruendung, button)
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
  // F44 WS-4a: Die ganze Zeile ist ein Link auf #/workflows/<id>. navigiere statt des nativen
  // Sprungs, damit ein zweiter Klick auf denselben, bereits offenen Hash das Detail neu lädt.
  document.getElementById('workflows').addEventListener('click', (ereignis) => {
    const zeile = ereignis.target.closest('.workflow-zeile')
    // Strg/Cmd/Umschalt-Klick und Mittelklick bleiben beim Browser (neuer Tab bzw. neues Fenster).
    if (!zeile || ereignis.ctrlKey || ereignis.metaKey || ereignis.shiftKey || ereignis.button > 0) return
    ereignis.preventDefault()
    navigiere(`#/workflows/${encodeURIComponent(zeile.dataset.workflowId)}`)
  })
  document.getElementById('workflow-technik-inhalt').addEventListener('click', (ereignis) => {
    const button = ereignis.target.closest('.workflow-lauf-verweis')
    if (!button) return
    navigiere(`#/runs/${encodeURIComponent(button.dataset.laufId)}`)
  })
  for (const id of ['workflow-bedienung', 'workflow-aktionen']) {
    document.getElementById(id).addEventListener('click', (ereignis) => {
      const button = ereignis.target.closest('.wf-aktion')
      if (!button) return
      void fuehreWorkflowAktionAus(button)
    })
  }
  // F44 WS-4a: der Dialog liegt außerhalb der vom Poll ersetzten Container (index.html). „Abbrechen“
  // und der Schließen-Knopf schließen ohne Wirkung; Escape schließt nativ (Ereignis close).
  const dialog = document.getElementById('workflow-dialog')
  dialog.addEventListener('click', (ereignis) => {
    if (ereignis.target.closest('.wf-dialog-abbrechen')) {
      if (laufendeDialogBedienung === null) schliesseDialog()
      return
    }
    const button = ereignis.target.closest('.wf-aktion')
    if (!button) return
    void fuehreWorkflowAktionAus(button)
  })
  // Escape während einer laufenden Bedienung schließt nicht — die Entscheidung ist schon unterwegs.
  dialog.addEventListener('cancel', (ereignis) => {
    if (laufendeDialogBedienung !== null) ereignis.preventDefault()
  })
  dialog.addEventListener('close', () => {
    offenerDialog = null
  })
  // F36 WS-5a: „Freigeben & installieren“ im Empfehlungsblock des Freigabedialogs; danach Detail (und
  // Empfehlung) neu laden — die geänderte Empfehlung schließt den Dialog („Stand geändert“), die
  // Begründung bleibt für denselben Halt erhalten (geretteteBegruendung).
  bindeEmpfehlungInstallation(dialog, () => (gewaehlteWorkflowId !== null ? ladeWorkflowDetail(gewaehlteWorkflowId, false) : undefined))
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
  // „← Alle Aufträge“ (F-926-Muster): kam das Detail direkt aus der Liste, geht es per
  // history.back() zurück (kein neuer Eintrag, Browser-Zurück öffnet das Detail nicht wieder);
  // sonst (Deep-Link, Sprung von anderswo) per navigiere. In beiden Fällen schließt die Route
  // #/runs das Detail und legt den Fokus auf die Zeile des Workflows.
  document.getElementById('workflow-detail-schliessen').addEventListener('click', () => {
    if (detailAusListe) history.back()
    else navigiere('#/runs')
  })
}

/**
 * F-874, F-923 (F44 WS-4a): Neuladen-Hook beim Projektwechsel. Dialog, Detail, Bedienzustand und
 * ein offener Reparaturentwurf gehören zum alten Projekt und werden ohne Wirkung verworfen — sonst
 * fragte der Detail-Auffrischer dessen workflowId über den Präfix des neuen Projekts ab (Dauer-404,
 * Fehlerklasse F26). Stand der Hash auf einem Detail, geht er ohne neuen History-Eintrag auf
 * #/runs (ein Neuladen öffnete sonst dieselbe ID im neuen Projekt). Die Liste kommt mit dem
 * nächsten Poll des neuen Projekts.
 */
function verwirfNachProjektWechsel() {
  schliesseWorkflowDetail()
  letzteListeHtml = null
  letzteWorkflows = null
  listeZuletzt = false
  if (/^#\/workflows\/[^/]+$/.test(location.hash)) ersetzeRoute('#/runs')
}

/** Initialisiert die Workflow-Bedienung einmalig beim Bootstrap: Delegation, Routen, Abonnement des Zustands-Aggregats für die Liste, Detail-Auffrischer für ein offenes Workflow-Detail (F20 WS-2 — kein eigener Poll-Timer mehr, siehe zustand.js), Projektwechsel (F-874). */
export function initWorkflowsView() {
  initWorkflowBedienung()

  registriere(/^#\/runs$/, 'runs', () => {
    const vorher = gewaehlteWorkflowId
    schliesseWorkflowDetail()
    listeZuletzt = true
    if (vorher !== null) fokussiereZeile(vorher)
  })
  // Browser-Zurück aus dem Detail auf ein Lauf-Detail (#/runs/<laufId>): auch dann schließt die Seite.
  registriere(/^#\/runs\/([^/]+)$/, 'runs', () => {
    schliesseWorkflowDetail()
  })
  registriere(/^#\/workflows\/([^/]+)$/, 'runs', (workflowId) => {
    if (gewaehlteWorkflowId !== workflowId) detailAusListe = listeZuletzt
    listeZuletzt = false
    void ladeWorkflowDetail(workflowId)
  })
  // Jede andere Route beendet den Merker „zuletzt die Liste“; verlässt der Hash das Detail (etwa
  // Browser-Zurück bei offenem Dialog), schließt der Dialog ohne Wirkung.
  window.addEventListener('hashchange', () => {
    if (location.hash !== '#/runs') listeZuletzt = false
    if (!/^#\/workflows\/[^/]+$/.test(location.hash)) schliesseDialog()
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
  abonniereProjektWechsel(verwirfNachProjektWechsel)
}
