/**
 * Datei: public/leitstand/views/workflow-detail.js
 *
 * Zweck: Anzeige-Bausteine von Auftrag & Ablauf (F44 WS-4a, Vorlage V10 d_workflow_neu und
 * d_arbeit_verlauf; Abgleich F-725 F0, F2, F12): die Liste „Aufträge“ unter `#/runs` (eine Zeile je
 * Workflow, die ganze Zeile führt zu `#/workflows/<id>`), „Der Weg zum Ergebnis“ als Timeline,
 * die Spalte „Auf einen Blick“, die Aktionszeile unter der Timeline und der Aufklappbereich
 * „Technischer Ablauf & Serverentscheidung“ (Kopfdaten, Lage, Grund, Schritttabelle).
 *
 * Reine Render-Funktionen: Sie bekommen Serverdaten und liefern HTML. Laden, Kennzeichen,
 * Dialogsteuerung und alle POST-Aufrufe bleiben in views/workflows.js — dieses Modul kennt weder
 * fetch noch DOM und importiert keine api.js-Funktion.
 *
 * Die Oberfläche entscheidet NICHTS selbst (D5): Lage, Status, Verantwortung und angebotene
 * Aktionen sind reine Anzeigeabbildungen von status und naechster.art aus dem Server
 * (LAGE_JE_AUSGANG, KATEGORIE_JE_AUSGANG). Es gibt keine erfundenen Zweck-Sätze je Rolle.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/workflows.js
 * - public/leitstand/views/workflow-detail.test.mjs (node:test)
 *
 * Wichtig:
 * - Import-sicher: kein Zugriff auf DOM oder Storage beim Import.
 * - Servertexte (ziel, grund, IDs, Statuswerte, Modell) werden nie übersetzt und immer escaped;
 *   alle übrigen Texte über t()/tHtml(). Worker erscheinen in der Timeline lesbar (workerName,
 *   F44 WS-4b, Rückfall auf die ID), in der technischen Schritttabelle (F12) roh.
 * - scripts/check-f15-workflow-oberflaeche.mjs liest dieses Modul zusammen mit
 *   views/workflows.js (Felder, Planreihenfolge, LAGE_JE_AUSGANG, Stopp nur bei gültiger Fassung).
 */

import { t, tHtml } from '../i18n.js'
import { escapeHtml } from '../render.js'
import { rollenName, workerName } from '../rollen-anzeige.js'

/**
 * Die LAGE eines Workflows in einem Satz, je Ausgang von ermittleNaechstenSchritt (löst F-253):
 * Wörterbuchschlüssel je naechster.art. Die Texte sind ANZEIGE, keine Regel — welcher Ausgang
 * vorliegt, hat der Server entschieden.
 */
const LAGE_JE_AUSGANG = {
  starte: 'ablauf.lage.starte',
  haltFreigabe: 'ablauf.lage.haltFreigabe',
  haltKlaerung: 'ablauf.lage.haltKlaerung',
  haltGrenze: 'ablauf.lage.haltGrenze',
  haltGestoppt: 'ablauf.lage.haltGestoppt',
  fertig: 'ablauf.lage.fertig',
}

/** Farbe des Statuspunkts je Ausgang (Vorlage .status / .status.amber): wartet auf dich → amber, sonst Jade. */
const KATEGORIE_JE_AUSGANG = {
  starte: 'ok',
  haltFreigabe: 'warten',
  haltKlaerung: 'warten',
  haltGrenze: 'warten',
  haltGestoppt: 'warten',
  fertig: 'ok',
}

/** Marke am Schritt, den der Server als nächsten nennt (naechster.schrittId), je Ausgang — Anzeigeabbildung, keine Regel. */
const MARKE_JE_AUSGANG = {
  starte: 'ablauf.weg.marke.starte',
  haltFreigabe: 'ablauf.weg.marke.haltFreigabe',
  haltKlaerung: 'ablauf.weg.marke.haltKlaerung',
  haltGrenze: 'ablauf.weg.marke.haltGrenze',
}

/** Ausgänge, an denen der Mensch am Zug ist — „Verantwortung: Du“ (Anzeigeabbildung, keine Regel). */
const HALT_AUSGAENGE = new Set(['haltFreigabe', 'haltKlaerung', 'haltGrenze', 'haltGestoppt'])

/** Schritt-Status mit übersetztem Satz (SCHRITT_STATUS, src/workflow/index.ts); ein anderer erscheint roh. */
const SCHRITT_STATUS = new Set(['OFFEN', 'WARTET_FREIGABE', 'LAEUFT', 'ERFOLGREICH', 'VERWEIGERT', 'FEHLGESCHLAGEN', 'UEBERSPRUNGEN'])

/** Workflow-Status, in denen POST .../stoppen etwas zu stoppen findet — ANZEIGE-Zwilling der Server-Regel, entscheidet nur, ob der Knopf angeboten wird. */
export const STOPPBARE_WORKFLOW_STATUS = ['OFFEN', 'LAEUFT', 'WARTET_FREIGABE', 'KLAERUNG_ERFORDERLICH']

/** Pfeil der Listenzeile (Vorlage icon('arrow')). */
const PFEIL = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6" /></svg>'

/**
 * Übersetzt status und naechster in die angezeigte Lage. status hat VORRANG, wenn er LAEUFT lautet
 * (Auflösung einer Mehrdeutigkeit, siehe F-248/F-264 — "läuft" heißt hier nur, dass der abgelegte
 * Status LAEUFT lautet, nicht, dass ein Lauf noch lebt).
 * @param status - daten.status bzw. workflow.status
 * @param naechster - Projektion aus dem Server, oder null bei ungültiger Fassung
 * @returns Lagetext (Text, kein HTML)
 */
export function beschreibeLage(status, naechster) {
  if (naechster === null || naechster === undefined) return t('ablauf.lage.unbestimmt')
  if (status === 'LAEUFT') return t('ablauf.lage.laeuft')
  const schluessel = LAGE_JE_AUSGANG[naechster.art]
  return schluessel === undefined ? t('ablauf.lage.unbekannt', { art: String(naechster.art) }) : t(schluessel)
}

/**
 * Farbklasse des Lage-Statuspunkts — dieselbe Vorrangregel wie beschreibeLage.
 * @param status - daten.status bzw. workflow.status
 * @param naechster - Projektion aus dem Server, oder null
 * @returns 'ok' | 'warten' | 'fehler' | 'neutral'
 */
export function lageKategorie(status, naechster) {
  if (naechster === null || naechster === undefined) return 'fehler'
  if (status === 'LAEUFT') return 'ok'
  return KATEGORIE_JE_AUSGANG[naechster.art] ?? 'neutral'
}

/**
 * Lage als Statuszeile mit Punkt (Vorlage .status).
 * @param status - daten.status bzw. workflow.status
 * @param naechster - Projektion aus dem Server, oder null
 * @returns HTML
 */
export function lageBadge(status, naechster) {
  return `<span class="ablauf-status ${lageKategorie(status, naechster)}">${escapeHtml(beschreibeLage(status, naechster))}</span>`
}

/**
 * Titel der Seite: das Ziel des Workflows, ohne Ziel die workflowId.
 * @param ziel - daten.ziel bzw. workflow.ziel
 * @param workflowId - Kennung
 * @returns Text
 */
export function seitenTitel(ziel, workflowId) {
  return typeof ziel === 'string' && ziel.trim() !== '' ? ziel : String(workflowId ?? '')
}

/**
 * Eine Zeile der Liste „Aufträge“ (Vorlage d_arbeit_verlauf): Titel = Ziel, darunter die
 * workflowId als code mit Fassung und Cursor, darunter der Halt-Grund (F-221 (a) — bei
 * KLAERUNG_ERFORDERLICH/GESTOPPT die einzige Auskunft, warum der Automat steht); rechts Lage und
 * Pfeil. Die ganze Zeile ist ein Link auf `#/workflows/<id>`.
 * @param workflow - ein Eintrag aus zustand.workflows
 * @returns HTML
 */
function workflowZeile(workflow) {
  const id = String(workflow.workflowId ?? '')
  const fassung = typeof workflow.versionSequenz === 'number' ? ` · ${tHtml('ablauf.liste.fassung', { nummer: String(workflow.versionSequenz) })}` : ''
  const cursor = workflow.aktiverSchrittId ? ` · ${tHtml('ablauf.liste.schritt')} <code>${escapeHtml(workflow.aktiverSchrittId)}</code>` : ''
  const grund = workflow.grund === null || workflow.grund === undefined ? '' : `<p class="subtle workflow-zeile-grund">${tHtml('ablauf.liste.grund')}: ${escapeHtml(workflow.grund)}</p>`
  return `<a class="list-row workflow-zeile" href="#/workflows/${escapeHtml(encodeURIComponent(id))}" data-workflow-id="${escapeHtml(id)}">
    <div class="workflow-zeile-text">
      <h3>${escapeHtml(seitenTitel(workflow.ziel, id))}</h3>
      <p class="subtle"><code>${escapeHtml(id)}</code>${fassung}${cursor}</p>
      ${grund}
    </div>
    <div class="row-end">${lageBadge(workflow.status, workflow.naechster)}${PFEIL}</div>
  </a>`
}

/**
 * Die Liste „Aufträge“ aus dem Zustands-Aggregat (F20 WS-2): Zeilen, Leerzustand oder — bei
 * defekter Quelle — „nicht verfügbar“ (keine falsche Entwarnung).
 * @param workflows - zustand.workflows aus GET /api/zustand, oder null bei defekter Quelle
 * @returns HTML
 */
export function renderWorkflowListe(workflows) {
  if (workflows === null || workflows === undefined) {
    return `<div class="note red"><strong>${tHtml('ablauf.liste.nichtVerfuegbar.titel')}</strong><p>${tHtml('ablauf.liste.nichtVerfuegbar.text')}</p></div>`
  }
  if (workflows.length === 0) {
    return `<div class="empty"><h3>${tHtml('ablauf.liste.leer.titel')}</h3><p>${tHtml('ablauf.liste.leer.text')}</p></div>`
  }
  return workflows.map(workflowZeile).join('')
}

/**
 * Bringt die Schritte in Planreihenfolge entlang der nachfolger-Kette. Der Detailendpunkt
 * validiert nicht (F-247): ein Zyklus, zwei Wurzeln oder eine doppelt vergebene schritt_id kommen
 * hier real an — der angehängte Rest wird dann ausgewiesen statt still eingereiht.
 * @param schritte - daten.schritte aus GET /api/workflows/<id>
 * @returns je Schritt { schritt, inKette }, Kettenteil zuerst
 */
export function ordneSchritteNachPlan(schritte) {
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
 * Der Status eines Schritts als Satz; ein unbekannter Status erscheint roh.
 * @param status - schritt.status
 * @returns Text
 */
export function schrittStatusSatz(status) {
  return SCHRITT_STATUS.has(status) ? t(`ablauf.schritt.${status}`) : String(status ?? '')
}

/**
 * Timeline-Klasse eines Schritts (Vorlage .timeline li.done/.current) — reine Abbildung von
 * schritt.status; der vom Server genannte Schritt (naechster.schrittId) ist immer „current“ (amber,
 * auch wenn er schon gelaufen ist, etwa bei einer Rückfrage des Architekten), der Cursor nur, wenn der
 * Schritt nicht abgeschlossen ist.
 * @param schritt - ein Schritt
 * @param faellig - true für naechster.schrittId
 * @param cursor - true für aktiver_schritt_id
 * @returns Klasse oder ''
 */
function timelineKlasse(schritt, faellig, cursor) {
  if (faellig) return 'current'
  if (schritt.status === 'ERFOLGREICH') return 'done'
  if (schritt.status === 'VERWEIGERT' || schritt.status === 'FEHLGESCHLAGEN') return 'fehler'
  if (schritt.status === 'LAEUFT' || schritt.status === 'WARTET_FREIGABE' || cursor) return 'current'
  return ''
}

/**
 * „Der Weg zum Ergebnis“ (F2): die Schritte in Planreihenfolge, je Schritt Rollenname, Status als
 * Satz und Verantwortung (Worker; bei ZWINGEND der Hinweis auf deine Freigabe). Leer bei einer
 * Fassung ohne lesbare Schritte.
 * @param geordnet - Ergebnis von ordneSchritteNachPlan
 * @param kontext - { naechster, cursorId, aktiveLaufIds }
 * @returns HTML
 */
export function renderTimeline(geordnet, { naechster = null, cursorId = null, aktiveLaufIds = new Set() } = {}) {
  if (!Array.isArray(geordnet) || geordnet.length === 0) return `<p class="subtle ablauf-leer">${tHtml('ablauf.weg.leer')}</p>`
  const faelligId = naechster?.schrittId ?? null
  const eintraege = geordnet.map(({ schritt, inKette }) => {
    const faellig = faelligId !== null && schritt.schritt_id === faelligId
    const cursor = cursorId !== null && schritt.schritt_id === cursorId
    const klasse = timelineKlasse(schritt, faellig, cursor)
    const name = rollenName(schritt.rolle) || String(schritt.schritt_id ?? '')
    // F44 WS-4b: ein Schritt auf LAEUFT mit aktivem Lauf heißt nur „Läuft jetzt“ (nicht „Läuft · läuft jetzt“).
    const aktiv = typeof schritt.lauf_id === 'string' && aktiveLaufIds.has(schritt.lauf_id)
    const statusSatz = aktiv && schritt.status === 'LAEUFT' ? tHtml('ablauf.schritt.laeuftJetzt') : `${escapeHtml(schrittStatusSatz(schritt.status))}${aktiv ? ` · ${tHtml('ablauf.weg.laeuftJetzt')}` : ''}`
    const naechsterMarke = faellig ? ` <span class="ablauf-marke">${tHtml(MARKE_JE_AUSGANG[naechster.art] ?? 'ablauf.weg.marke.sonst')}</span>` : ''
    const ausserhalb = inKette ? '' : ` <span class="ablauf-marke fehler">${tHtml('ablauf.weg.ausserhalb')}</span>`
    const freigabe = schritt.freigabe === 'ZWINGEND' ? ` · ${tHtml('ablauf.weg.freigabePflicht')}` : ''
    return `<li${klasse ? ` class="${klasse}"` : ''}>
      <h3>${escapeHtml(name)}${naechsterMarke}${ausserhalb}</h3>
      <p>${statusSatz}</p>
      <small>${tHtml('ablauf.weg.verantwortung', { wer: workerName(schritt.worker) || '–' })}${freigabe} · <code>${escapeHtml(schritt.schritt_id)}</code></small>
    </li>`
  })
  return `<ol class="timeline">${eintraege.join('')}</ol>`
}

/**
 * Der Schritt, den „Aktueller Schritt“ zeigt: der Cursor des Automaten (aktiver_schritt_id), ohne
 * Cursor der vom Server genannte nächste Schritt.
 * @param geordnet - Ergebnis von ordneSchritteNachPlan
 * @param cursorId - daten.aktiver_schritt_id oder null
 * @param naechster - Automaten-Verdikt oder null
 * @returns Schritt oder null
 */
function aktuellerSchritt(geordnet, cursorId, naechster) {
  const id = cursorId ?? naechster?.schrittId ?? null
  if (id === null) return null
  return geordnet.find(({ schritt }) => schritt.schritt_id === id)?.schritt ?? null
}

/**
 * Wer gerade verantwortlich ist (Anzeigeabbildung): „Du“ bei einem Halt, sonst die Rolle des
 * aktuellen Schritts; status LAEUFT hat wie in beschreibeLage Vorrang.
 * @param status - daten.status
 * @param naechster - Automaten-Verdikt oder null
 * @param schritt - Ergebnis von aktuellerSchritt
 * @returns Text
 */
export function verantwortung(status, naechster, schritt) {
  if (naechster !== null && naechster !== undefined && status !== 'LAEUFT' && HALT_AUSGAENGE.has(naechster.art)) return t('ablauf.blick.du')
  return schritt === null ? '–' : rollenName(schritt.rolle) || String(schritt.schritt_id ?? '–')
}

/**
 * Die Spalte „Auf einen Blick“: Status (Lage), Projekt, aktueller Schritt, Verantwortung.
 * @param eingabe - { daten, naechster, geordnet, projektName }
 * @returns HTML
 */
export function renderAufEinenBlick({ daten, naechster = null, geordnet = [], projektName = '' }) {
  const schritt = aktuellerSchritt(geordnet, daten?.aktiver_schritt_id ?? null, naechster)
  const schrittText = schritt === null ? '–' : `${escapeHtml(rollenName(schritt.rolle) || schritt.schritt_id)} <code>${escapeHtml(schritt.schritt_id)}</code>`
  return `<h3>${tHtml('ablauf.blick.titel')}</h3>
    <dl>
      <dt>${tHtml('ablauf.blick.status')}</dt><dd>${lageBadge(daten?.status ?? null, naechster)}</dd>
      <dt>${tHtml('ablauf.blick.projekt')}</dt><dd>${escapeHtml(projektName)}</dd>
      <dt>${tHtml('ablauf.blick.schritt')}</dt><dd>${schrittText}</dd>
      <dt>${tHtml('ablauf.blick.verantwortung')}</dt><dd>${escapeHtml(verantwortung(daten?.status ?? null, naechster, schritt))}</dd>
    </dl>`
}

/**
 * Die Aktionen unter der Timeline, nur nach naechster.art bzw. status: „Nächsten Schritt
 * freigeben“ (öffnet den Freigabedialog), „Starten“ (direkt) und „Ausführung stoppen“ (öffnet den
 * Stoppdialog). Keine Aktion → ''. Rückfrage, Sichtung und Reparatur stehen seit WS-4b
 * als Notizen über der Timeline (views/workflow-eingriffe.js renderEingriffe).
 * @param workflowId - Kennung
 * @param status - daten.status
 * @param naechster - Automaten-Verdikt oder null
 * @param ungueltig - true, wenn die Fassung nicht gegen WORKFLOW_V0 validiert
 * @returns HTML
 */
export function renderAktionen(workflowId, status, naechster, ungueltig = false) {
  const art = naechster === null || naechster === undefined ? null : naechster.art
  const kennung = escapeHtml(workflowId)
  const knoepfe = []
  let hinweis = ''
  if (art === 'haltFreigabe') {
    knoepfe.push(`<button type="button" class="button primary wf-aktion" data-aktion="freigabe-oeffnen" data-workflow-id="${kennung}" aria-haspopup="dialog">${tHtml('ablauf.aktion.freigeben')}</button>`)
  }
  if (art === 'starte') {
    knoepfe.push(`<button type="button" class="button primary wf-aktion" data-aktion="starten" data-workflow-id="${kennung}">${tHtml('ablauf.aktion.starten')}</button>`)
    hinweis = `<p class="subtle ablauf-aktion-hinweis">${tHtml('ablauf.aktion.startenHinweis')} <code>${escapeHtml(naechster.schrittId ?? '')}</code></p>`
  }
  if (STOPPBARE_WORKFLOW_STATUS.includes(status) && !ungueltig) {
    knoepfe.push(`<button type="button" class="button danger wf-aktion" data-aktion="stopp-oeffnen" data-workflow-id="${kennung}" aria-haspopup="dialog">${tHtml('ablauf.aktion.stoppen')}</button>`)
  }
  if (knoepfe.length === 0) return ''
  return `<div class="action-row">${knoepfe.join('')}</div>${hinweis}`
}

/**
 * F-247: eine Fassung, die nicht mehr gegen WORKFLOW_V0 validiert. Die Schritte werden trotzdem
 * gezeigt — sie anzusehen ist der erste Schritt ihrer Reparatur.
 * @param verstoesse - string[] aus validiereWorkflowDaten (Servertexte)
 * @returns HTML
 */
export function renderWorkflowUngueltig(verstoesse) {
  const liste = verstoesse.map((verstoss) => `<li>${escapeHtml(verstoss)}</li>`).join('')
  return `<div class="note red ablauf-ungueltig"><strong>${tHtml('ablauf.ungueltig.titel')}</strong><p>${tHtml('ablauf.ungueltig.text')}</p><ul>${liste}</ul></div>`
}

/**
 * Kopfdaten des Workflows im Aufklappbereich F12.
 * @param daten - der WORKFLOW_V0-Datensatz aus GET /api/workflows/<id>
 * @param versionSequenz - Artefaktversion derselben Antwort
 * @param naechster - das Automaten-Verdikt derselben Antwort, oder null
 * @returns HTML
 */
export function renderWorkflowKopf(daten, versionSequenz, naechster) {
  const verdikt = naechster === null || naechster === undefined ? `<span class="unbekannt">${tHtml('ablauf.technik.nichtBestimmbar')}</span>` : `${escapeHtml(naechster.art)} — ${escapeHtml(naechster.grund)}`
  return `<div class="detail-block"><h3>${tHtml('ablauf.technik.workflow')}</h3><div class="ablauf-tabelle"><table class="lauf-kopfdaten"><tbody>
    <tr><th>${tHtml('ablauf.technik.ziel')}</th><td>${escapeHtml(daten.ziel ?? '')}</td></tr>
    <tr><th>${tHtml('ablauf.technik.auftrag')}</th><td><code>${escapeHtml(daten.auftrag_id ?? '')}</code></td></tr>
    <tr><th>${tHtml('ablauf.technik.version')}</th><td>${escapeHtml(String(daten.version))} / ${escapeHtml(String(versionSequenz))}</td></tr>
    <tr><th>${tHtml('ablauf.technik.lage')}</th><td>${escapeHtml(beschreibeLage(daten.status, naechster))}</td></tr>
    <tr><th>${tHtml('ablauf.technik.verdikt')}</th><td>${verdikt}</td></tr>
    <tr><th>${tHtml('ablauf.technik.status')}</th><td>${escapeHtml(daten.status ?? '')}</td></tr>
    <tr><th>${tHtml('ablauf.technik.cursor')}</th><td>${daten.aktiver_schritt_id ? `<code>${escapeHtml(daten.aktiver_schritt_id)}</code>` : `<span class="unbekannt">${tHtml('ablauf.technik.keinCursor')}</span>`}</td></tr>
    <tr><th>${tHtml('ablauf.technik.grund')}</th><td>${daten.grund ? escapeHtml(daten.grund) : `<span class="unbekannt">${tHtml('ablauf.technik.keinGrund')}</span>`}</td></tr>
  </tbody></table></div></div>`
}

/**
 * Eine Zeile der Schritttabelle (F12): alle Schrittfelder, Cursor- und Fällig-Marke (F-253),
 * aktiver Lauf (F-234) und der Verweis auf das Lauf-Detail (.workflow-lauf-verweis).
 * @param eintrag - ein { schritt, inKette } aus ordneSchritteNachPlan
 * @param aktiveLaufIds - Menge der lauf_id, die der Server als aktiv meldet
 * @param faelligId - naechster.schrittId aus dem Server, oder null (F-253)
 * @param cursorId - daten.aktiver_schritt_id, oder null
 * @returns Tabellenzeile
 */
export function workflowSchrittZeile(eintrag, aktiveLaufIds, faelligId = null, cursorId = null) {
  const { schritt } = eintrag
  const laeuftJetzt = typeof schritt.lauf_id === 'string' && aktiveLaufIds.has(schritt.lauf_id)
  const cursorMarke = cursorId !== null && schritt.schritt_id === cursorId ? ` <span class="badge" title="${tHtml('ablauf.technik.cursorTitel')}">${tHtml('ablauf.technik.cursorMarke')}</span>` : ''
  const faelligMarke = faelligId !== null && schritt.schritt_id === faelligId ? ` <span class="badge aktiv" title="${tHtml('ablauf.technik.faelligTitel')}">${tHtml('ablauf.technik.faelligMarke')}</span>` : ''
  const laufVerweis =
    typeof schritt.lauf_id === 'string'
      ? `<button type="button" class="workflow-lauf-verweis" data-lauf-id="${escapeHtml(schritt.lauf_id)}">${escapeHtml(schritt.lauf_id)}</button>`
      : `<span class="unbekannt">${tHtml('ablauf.technik.keinLauf')}</span>`
  const freigabeErteilt = schritt.freigabe_erteilt === undefined ? '—' : String(schritt.freigabe_erteilt)
  return `<tr>
    <td><code>${escapeHtml(schritt.schritt_id)}</code>${cursorMarke}${faelligMarke}${eintrag.inKette ? '' : ` <span class="badge fehler" title="${tHtml('ablauf.technik.ausserhalbTitel')}">${tHtml('ablauf.weg.ausserhalb')}</span>`}</td>
    <td>${escapeHtml(schritt.rolle ?? '')}</td>
    <td>${escapeHtml(schritt.worker ?? '')}</td>
    <td>${escapeHtml(schritt.modell ?? '')}</td>
    <td>${escapeHtml(schritt.freigabe)} <span class="unbekannt">${schritt.freigabe === 'ZWINGEND' ? tHtml('ablauf.technik.haeltAn') : tHtml('ablauf.technik.haeltNichtAn')}</span></td>
    <td>${escapeHtml(freigabeErteilt)}</td>
    <td>${escapeHtml(schritt.status)}${laeuftJetzt ? ` <span class="badge aktiv">${tHtml('ablauf.weg.laeuftJetzt')}</span>` : ''}</td>
    <td>${laufVerweis}</td>
    <td>${schritt.nachfolger ? `<code>${escapeHtml(schritt.nachfolger)}</code>` : `<span class="unbekannt">${tHtml('ablauf.technik.ende')}</span>`}</td>
    <td>${escapeHtml(String(schritt.zeitgrenze_ms))}</td>
  </tr>`
}

/** Kopfzeile der Schritttabelle (F12). @returns HTML */
function schrittTabelleKopf() {
  const spalten = ['schritt', 'rolle', 'worker', 'modell', 'freigabe', 'freigabeErteilt', 'status', 'lauf', 'nachfolger', 'zeitgrenze']
  return `<tr>${spalten.map((s) => `<th>${tHtml(`ablauf.technik.spalte.${s}`)}</th>`).join('')}</tr>`
}

/**
 * Der Inhalt von „Technischer Ablauf & Serverentscheidung“ (F12): die heutigen Kopfdaten samt Lage
 * und Grund, darunter die Schritttabelle in Planreihenfolge mit Lauf-Verweisen.
 * @param eingabe - { daten, versionSequenz, naechster, geordnet, aktiveLaufIds }
 * @returns HTML
 */
export function renderTechnik({ daten, versionSequenz, naechster = null, geordnet = [], aktiveLaufIds = new Set() }) {
  const kopf = renderWorkflowKopf(daten, versionSequenz, naechster)
  if (geordnet.length === 0) return kopf
  const ausserhalb = geordnet.filter((e) => !e.inKette).length
  const ueberschrift = ausserhalb === 0 ? tHtml('ablauf.technik.schritte') : tHtml('ablauf.technik.schritteAusserhalb', { anzahl: ausserhalb })
  const zeilen = geordnet.map((e) => workflowSchrittZeile(e, aktiveLaufIds, naechster?.schrittId ?? null, daten.aktiver_schritt_id ?? null)).join('')
  return `${kopf}<div class="detail-block"><h3>${ueberschrift}</h3><div class="ablauf-tabelle"><table class="lauf-kopfdaten ablauf-schritte"><thead>${schrittTabelleKopf()}</thead><tbody>${zeilen}</tbody></table></div></div>`
}
