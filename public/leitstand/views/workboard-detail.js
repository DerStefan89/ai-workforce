/**
 * Datei: public/leitstand/views/workboard-detail.js
 *
 * Zweck: Anzeige-Bausteine der Seite „Entwicklung“ (F44 WS-3b, Vorlage V10 d_arbeit_f35; Abgleich
 * F-725 E8, E13): das Detail `#/workboard/<id>` als ganze Seite — Statuszeile, „Wer macht was“,
 * „Was soll möglich werden“, „Stand der Entwicklung“, „Woran wir ein gutes Ergebnis erkennen“,
 * Einordnung & Quelle, die Spalte „Planung“ und der Block „Insights“ (Z, kommt). Dazu die
 * Typ- und Statusanzeige, die Board, Listen und Detail gemeinsam nutzen.
 *
 * Reine Render-Funktionen: Sie bekommen eine „Sicht“ (Workitem, verknüpfter Workflow, Schritte,
 * Akte, Roadmap) und liefern HTML. Laden, Zustand, Click-to-Work und Routen bleiben in
 * views/workboard.js — dieses Modul kennt weder fetch noch DOM.
 *
 * Eine Sicht:
 *   { workitem,
 *     workflow: Workflow-Eintrag des Aggregats oder null,
 *     verknuepfung: 'laedt' | 'fehlt' | 'ok' (ob der verknüpfte Workflow bestimmbar ist),
 *     schritte: undefined (lädt) | null (nicht ladbar) | Schritte aus GET …/workflows/<id>,
 *     akte: undefined (lädt, nur Features) | { status: 'ok', titel, featureStatus, ziel, nicht_ziele,
 *           akzeptanzkriterien } | { status: 'unvollstaendig', grund } | { status: 'fehler', meldung },
 *     roadmap: undefined (lädt, nur Features) | Projektion von GET …/roadmap | { status: 'fehler' },
 *     abnahmeOffen: true, wenn der verknüpfte Ablauf abgeschlossen ist und auf die Abnahme wartet }
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/workboard.js
 * - public/leitstand/views/workboard-detail.test.mjs (node:test)
 *
 * Wichtig:
 * - Import-sicher: kein Zugriff auf DOM oder Storage beim Import.
 * - Akten-, Workitem- und Servertexte (Titel, Ziel, AKs, Gründe, IDs, Statuswerte) werden nie
 *   übersetzt und immer escaped; alle übrigen Texte über t().
 * - Z-Elemente (Eintrag bearbeiten, Insights, Zeitfenster, Planung ändern/speichern) sind
 *   kommtKnopf ohne Beispieldaten (E-F44-1).
 */

import { schrittFortschritt, workflowPhase } from '../entwicklung-daten.js'
import { schrittFolge } from '../fokus-daten.js'
import { formatiereZahl, t, tHtml } from '../i18n.js'
import { kommtKnopf } from '../kommt.js'
import { escapeHtml } from '../render.js'
import { roadmapZustand, statusKategorie as roadmapStatusKategorie } from '../roadmap-anzeige.js'
import { rollenName, werSpalte } from '../rollen-anzeige.js'

/** Bekannte Workitem-Typen mit übersetzter Bezeichnung; ein anderer Typ erscheint roh. */
const BEKANNTE_TYPEN = new Set(['FEATURE', 'BUG', 'HARNESS_IMPROVEMENT', 'TECH_DEBT', 'PROCESS_IMPROVEMENT'])

/** Schritt-Status mit übersetzter Bezeichnung (SCHRITT_STATUS, src/workflow/index.ts); ein anderer erscheint roh. */
const SCHRITT_STATUS = new Set(['OFFEN', 'WARTET_FREIGABE', 'LAEUFT', 'ERFOLGREICH', 'VERWEIGERT', 'FEHLGESCHLAGEN', 'UEBERSPRUNGEN'])

/**
 * Ordnet den Status eines Workitems einer der drei .status-punkt-Klassen zu (ok/aktiv/neutral,
 * F29 WS-1b) — kein neues Farbvokabular.
 * @param workitem - ein Workitem
 * @returns 'ok' | 'aktiv' | 'neutral'
 */
export function statusKategorie(workitem) {
  if (workitem.status === 'ERLEDIGT' || workitem.status === 'ABGESCHLOSSEN') return 'ok'
  if (workitem.status === 'OFFEN' || workitem.status === 'FEATURE_GATE') return 'aktiv'
  return 'neutral'
}

/**
 * Übersetzte Typbezeichnung als Text; ein unbekannter Typ erscheint roh (Projektinhalt).
 * @param typ - workitem.typ
 * @returns Text
 */
export function typBezeichnung(typ) {
  return BEKANNTE_TYPEN.has(typ) ? t(`entwicklung.typ.${typ}`) : String(typ ?? '')
}

/**
 * Übersetzter Status eines Workitems: Feature-Akten über die Kategorien der Roadmap
 * (roadmap-anzeige.js, eine Regel), Findings OFFEN/ERLEDIGT/SONSTIGES; der Rohwert steht im title.
 * @param workitem - ein Workitem
 * @returns HTML
 */
export function kartenStatus(workitem) {
  const roh = workitem.quelle === 'finding' ? (workitem.statusRoh ?? workitem.status) : workitem.status
  const text = workitem.quelle === 'feature' ? t(`roadmap.status.${roadmapStatusKategorie(workitem.status)}`) : t(`entwicklung.findingStatus.${['OFFEN', 'ERLEDIGT'].includes(workitem.status) ? workitem.status : 'SONSTIGES'}`)
  return `<span title="${escapeHtml(roh ?? '')}">${escapeHtml(text)}</span>`
}

/**
 * Übersetzte Phase eines Workflows (workflowPhase) mit dem Rohstatus im title — Karte und Statuszeile.
 * @param workflow - Workflow-Eintrag des Aggregats
 * @returns HTML, oder '' ohne Workflow
 */
export function phaseHtml(workflow) {
  const phase = workflowPhase(workflow)
  if (phase === null) return ''
  return `<span title="${escapeHtml(workflow.status ?? '')}">${tHtml(`entwicklung.phase.${phase}`)}</span>`
}

/**
 * Phase des verknüpften Ablaufs im Detail: wartet ein abgeschlossener Ablauf auf die Abnahme,
 * „Deine Abnahme“ (Vorlage „Abnahme offen“), sonst phaseHtml.
 * @param sicht - siehe Dateikopf (workflow nicht null)
 * @returns HTML
 */
function phaseDesDetails(sicht) {
  return sicht.abnahmeOffen === true && workflowPhase(sicht.workflow) === 'abgeschlossen' ? tHtml('entwicklung.detail.wer.abnahme') : phaseHtml(sicht.workflow)
}

/**
 * Titel eines Workitems (Projektinhalt), sonst die ID.
 * @param workitem - ein Workitem
 * @returns Text
 */
export function titelVon(workitem) {
  return typeof workitem.titel === 'string' && workitem.titel.trim() !== '' ? workitem.titel : workitem.id
}

/**
 * Eyebrow des Detail-Kopfs: „Typ · ID“ (Vorlage „FEATURE · F35“).
 * @param workitem - ein Workitem
 * @returns Text
 */
export function detailEyebrow(workitem) {
  return `${typBezeichnung(workitem.typ)} · ${workitem.id}`
}

/**
 * Statuszeile des Details: Status des Eintrags, Phase des verknüpften Ablaufs, wer gerade dran ist.
 * „Gerade dran“: bei einer Freigabe, Rückfrage oder offenen Abnahme „Du“, bei einem sonst
 * abgeschlossenen Ablauf „–“, sonst die Rolle des Jetzt-Schritts (schrittFolge), ohne Schritte „–“.
 * @param sicht - siehe Dateikopf
 * @returns HTML
 */
export function detailStatusHtml(sicht) {
  const { workitem, workflow } = sicht
  const status = `<span class="workboard-detail-statuswert"><span class="status-punkt ${statusKategorie(workitem)}" aria-hidden="true"></span> ${kartenStatus(workitem)}</span>`
  let phase
  if (sicht.verknuepfung === 'laedt') phase = tHtml('entwicklung.laedt')
  else if (sicht.verknuepfung === 'fehlt') phase = tHtml('entwicklung.spalte.leer.unvollstaendig')
  else phase = workflow === null ? tHtml('entwicklung.detail.status.keinAblauf') : phaseDesDetails(sicht)
  let dran = '–'
  const art = workflowPhase(workflow)
  if (art === 'freigabe' || art === 'rueckfrage' || (art === 'abgeschlossen' && sicht.abnahmeOffen === true)) dran = tHtml('entwicklung.detail.status.du')
  else if (art !== 'abgeschlossen' && Array.isArray(sicht.schritte)) {
    const { jetzt } = schrittFolge(workflow, sicht.schritte)
    if (jetzt !== null) dran = escapeHtml(rollenName(jetzt.rolle))
  }
  return `${status}<span>${tHtml('entwicklung.detail.status.phase')}: <strong>${phase}</strong></span><span>${tHtml('entwicklung.detail.status.dran')}: <strong>${dran}</strong></span>`
}

/**
 * Status eines Schritts als Text (übersetzt, unbekannt roh).
 * @param status - schritt.status
 * @returns Text
 */
function schrittStatusText(status) {
  return SCHRITT_STATUS.has(status) ? t(`entwicklung.detail.schrittStatus.${status}`) : String(status ?? '')
}

/**
 * „Wer macht was – und wofür?“ (E8, Muster B11): Zuvor/Jetzt/Danach aus den Schritten des
 * verknüpften Ablaufs, erwarteter Output = Ziel des Ablaufs. Ohne Ablauf ein Leerzustand. Ist der
 * Ablauf abgeschlossen, steht sein letzter Schritt unter „Zuvor“ und unter „Jetzt“ die Abnahme
 * („Deine Abnahme“, wenn sie offen ist — Vorlage d_arbeit_f35), sonst „Ablauf abgeschlossen“.
 * @param sicht - siehe Dateikopf
 * @returns HTML
 */
function werBlock(sicht) {
  const kopf = `<div class="section-label"><h2>${tHtml('uebersicht.wer.titel')}</h2>${sicht.workflow !== null ? `<span class="workboard-detail-phase"><span class="status-punkt aktiv" aria-hidden="true"></span> ${phaseDesDetails(sicht)}</span>` : ''}</div>`
  if (sicht.verknuepfung === 'laedt') return `${kopf}<p class="subtle">${tHtml('entwicklung.laedt')}</p>`
  if (sicht.verknuepfung === 'fehlt') return `${kopf}<p class="subtle">${tHtml('entwicklung.spalte.leer.unvollstaendig')}</p>`
  if (sicht.workflow === null) return `${kopf}<p class="subtle">${tHtml('entwicklung.detail.wer.leer')}</p>`
  if (sicht.schritte === undefined) return `${kopf}<p class="subtle">${tHtml('entwicklung.laedt')}</p>`
  if (sicht.schritte === null) return `${kopf}<p>${tHtml('uebersicht.wer.fehler')}</p>`
  const folge = schrittFolge(sicht.workflow, sicht.schritte)
  const art = workflowPhase(sicht.workflow)
  const menschlich = art === 'freigabe' ? tHtml('uebersicht.rolle.freigabe') : art === 'rueckfrage' ? tHtml('uebersicht.rolle.rueckfrage') : ''
  const zusatz = (schritt) => (schritt === null ? '' : `<span class="model-label">${escapeHtml(schritt.worker ?? '–')} · ${escapeHtml(schrittStatusText(schritt.status))}</span>`)
  const ziel = typeof sicht.workflow.ziel === 'string' && sicht.workflow.ziel.trim() !== '' ? sicht.workflow.ziel : '–'
  let spalten
  if (art === 'abgeschlossen') {
    const zuvor = folge.jetzt ?? sicht.schritte[sicht.schritte.length - 1] ?? null
    const titel = sicht.abnahmeOffen === true ? tHtml('entwicklung.detail.wer.abnahme') : tHtml('entwicklung.phase.abgeschlossen')
    const unterzeile = sicht.abnahmeOffen === true ? `<p>${tHtml('uebersicht.rolle.menschlich')}</p>` : ''
    spalten = `${werSpalte(t('uebersicht.wer.zuvor'), zuvor, { zusatz: zusatz(zuvor) })}
      <div class="execution-current"><span class="eyebrow">${tHtml('uebersicht.wer.jetzt')}</span><strong>${titel}</strong>${unterzeile}</div>
      ${werSpalte(t('uebersicht.wer.danach'), null)}`
  } else {
    spalten = `${werSpalte(t('uebersicht.wer.zuvor'), folge.zuvor, { zusatz: zusatz(folge.zuvor) })}
      ${werSpalte(t('uebersicht.wer.jetzt'), folge.jetzt, { titelHtml: menschlich, zusatz: zusatz(folge.jetzt), klasse: 'execution-current' })}
      ${werSpalte(t('uebersicht.wer.danach'), folge.danach, { zusatz: zusatz(folge.danach) })}`
  }
  return `${kopf}
    <div class="execution-triptych">
      ${spalten}
    </div>
    <div class="expected-output">
      <span class="eyebrow">${tHtml('uebersicht.wer.output')}</span>
      <p>${escapeHtml(ziel)}</p>
    </div>`
}

/**
 * Hinweis auf eine unvollständige oder nicht lesbare Akte (Grund ist Servertext).
 * @param sicht - siehe Dateikopf
 * @returns HTML
 */
function akteHinweis(sicht) {
  const pfad = `<p><code>${escapeHtml(sicht.workitem.pfad ?? `features/${sicht.workitem.id}/feature.md`)}</code></p>`
  if (sicht.akte?.status === 'unvollstaendig') return `<div class="note amber"><strong>${tHtml('entwicklung.detail.akte.unvollstaendig')}</strong><p>${escapeHtml(sicht.akte.grund ?? '')}</p>${pfad}</div>`
  return `<div class="note red"><strong>${tHtml('entwicklung.detail.akte.fehler')}</strong><p><code>${escapeHtml(sicht.akte?.meldung ?? '')}</code></p>${pfad}</div>`
}

/**
 * „Was soll möglich werden?“ (Feature: Ziel aus der Akte) bzw. „Was funktioniert nicht?“ / „Was
 * soll besser werden?“ (Finding: Beschreibung, Fundstelle, Auswirkung, Maßnahme, Feature-Run).
 * @param sicht - siehe Dateikopf
 * @returns HTML
 */
function frageBlock(sicht) {
  const { workitem } = sicht
  const frage = workitem.quelle === 'feature' ? 'FEATURE' : workitem.typ === 'BUG' ? 'BUG' : 'sonst'
  const kopf = `<h2>${tHtml(`entwicklung.detail.frage.${frage}`)}</h2>`
  if (workitem.quelle === 'feature') {
    if (sicht.akte === undefined) return `${kopf}<p class="subtle">${tHtml('entwicklung.detail.akte.laedt')}</p>`
    if (sicht.akte.status === 'ok') return `${kopf}<p class="description workboard-detail-ziel">${escapeHtml(sicht.akte.ziel)}</p>`
    if (sicht.akte.status === 'unvollstaendig') return `${kopf}<p class="subtle">${tHtml('entwicklung.detail.ziel.unvollstaendig')}</p>`
    return `${kopf}${akteHinweis(sicht)}`
  }
  const feld = (schluessel, wert) => `<dt>${tHtml(`entwicklung.detail.finding.${schluessel}`)}</dt><dd>${wert ? escapeHtml(wert) : '<span class="subtle">–</span>'}</dd>`
  const beschreibung = workitem.beschreibung ? `<p class="description workboard-detail-ziel">${escapeHtml(workitem.beschreibung)}</p>` : `<p class="subtle">${tHtml('entwicklung.detail.finding.keineBeschreibung')}</p>`
  return `${kopf}${beschreibung}<dl class="workboard-detail-felder">${feld('fundstelle', workitem.fundstelle)}${feld('auswirkung', workitem.auswirkung)}${feld('massnahme', workitem.massnahme)}${feld('featureRun', workitem.featureRun)}</dl>`
}

/**
 * „Stand der Entwicklung“: Schritte des verknüpften Ablaufs als Mini-Pipeline, x/y und
 * Fortschrittsbalken (schrittFortschritt); ohne Ablauf ein Leerzustand.
 * @param sicht - siehe Dateikopf
 * @returns HTML
 */
function standBlock(sicht) {
  const kopf = `<h2>${tHtml('entwicklung.detail.stand.titel')}</h2>`
  let inhalt
  if (sicht.verknuepfung === 'laedt') inhalt = `<p class="subtle">${tHtml('entwicklung.laedt')}</p>`
  else if (sicht.verknuepfung === 'fehlt') inhalt = `<p class="subtle">${tHtml('entwicklung.spalte.leer.unvollstaendig')}</p>`
  else if (sicht.workflow === null) inhalt = `<p class="subtle">${tHtml('entwicklung.detail.stand.leer')}</p>`
  else if (sicht.schritte === undefined) inhalt = `<p class="subtle">${tHtml('entwicklung.laedt')}</p>`
  else if (sicht.schritte === null) inhalt = `<p>${tHtml('uebersicht.wer.fehler')}</p>`
  else if (sicht.schritte.length === 0) inhalt = `<p class="subtle">${tHtml('entwicklung.detail.stand.keineSchritte')}</p>`
  else {
    const { erledigt, gesamt, prozent } = schrittFortschritt(sicht.schritte)
    const schritte = sicht.schritte
      .map((schritt, index) => {
        const klasse = schritt.status === 'ERFOLGREICH' ? 'done' : schritt.status === 'LAEUFT' || schritt.status === 'WARTET_FREIGABE' ? 'current' : ''
        const symbol = schritt.status === 'ERFOLGREICH' ? '✓' : formatiereZahl(index + 1)
        return `<li${klasse ? ` class="${klasse}"` : ''}><span aria-hidden="true">${escapeHtml(symbol)}</span><div>${escapeHtml(rollenName(schritt.rolle))}<small>${escapeHtml(schritt.worker ?? '–')} · ${escapeHtml(schrittStatusText(schritt.status))}</small></div></li>`
      })
      .join('')
    inhalt = `<ol class="mini-pipeline">${schritte}</ol>
      <div class="work-progress">
        <div class="progress-caption"><span>${tHtml('entwicklung.detail.stand.schritte', { anzahl: gesamt, erledigt: formatiereZahl(erledigt), gesamt: formatiereZahl(gesamt) })}</span><strong>${tHtml('entwicklung.detail.stand.prozent', { zahl: formatiereZahl(prozent) })}</strong></div>
        <div class="progress-track" role="progressbar" aria-label="${tHtml('entwicklung.detail.stand.fortschritt')}" aria-valuemin="0" aria-valuemax="${gesamt}" aria-valuenow="${erledigt}"><span style="width: ${prozent}%"></span></div>
        <small>${tHtml('entwicklung.detail.stand.hinweis')}</small>
      </div>`
  }
  return `<div class="pm-feature-steps">${kopf}${inhalt}</div>`
}

/**
 * „Woran wir ein gutes Ergebnis erkennen“: AKs aus der Akte (Feature), bei unvollständiger Akte
 * Grund und Pfad; Finding: Hinweis, dass die Kriterien im Auftrag entstehen. Nicht-Ziele der Akte
 * aufklappbar darunter.
 * @param sicht - siehe Dateikopf
 * @returns HTML
 */
function kriterienBlock(sicht) {
  const kopf = `<h2>${tHtml('entwicklung.detail.kriterien.titel')}</h2>`
  if (sicht.workitem.quelle !== 'feature') return `${kopf}<p class="subtle">${tHtml('entwicklung.detail.kriterien.finding')}</p>`
  if (sicht.akte === undefined) return `${kopf}<p class="subtle">${tHtml('entwicklung.detail.akte.laedt')}</p>`
  if (sicht.akte.status !== 'ok') return `${kopf}${akteHinweis(sicht)}`
  const aks = sicht.akte.akzeptanzkriterien.map((ak) => `<li><span class="checkmark" aria-hidden="true">○</span><span><code>${escapeHtml(ak.id)}</code> ${escapeHtml(ak.text)}</span></li>`).join('')
  const nichtZiele =
    sicht.akte.nicht_ziele.length > 0
      ? `<details><summary>${tHtml('entwicklung.detail.nichtZiele', { anzahl: sicht.akte.nicht_ziele.length, zahl: formatiereZahl(sicht.akte.nicht_ziele.length) })}</summary><ul>${sicht.akte.nicht_ziele.map((z) => `<li>${escapeHtml(z)}</li>`).join('')}</ul></details>`
      : ''
  return `${kopf}<ul class="checklist">${aks}</ul>${nichtZiele}`
}

/**
 * „Einordnung & Quelle“ (aufklappbar): Pfad der Akte bzw. das Findings-Register.
 * @param sicht - siehe Dateikopf
 * @returns HTML
 */
function quelleBlock(sicht) {
  const { workitem } = sicht
  const inhalt =
    workitem.quelle === 'feature'
      ? `<p><code>${escapeHtml(workitem.pfad ?? `features/${workitem.id}/feature.md`)}</code></p><p class="subtle">${tHtml('entwicklung.detail.quelle.feature')}</p>`
      : `<p><code>state/findings.md</code></p><p class="subtle">${tHtml('entwicklung.detail.quelle.finding')}</p>`
  return `<details class="workboard-detail-quelle"><summary>${tHtml('entwicklung.detail.quelle.titel')}</summary>${inhalt}</details>`
}

/**
 * Meilenstein eines Features aus der Roadmap-Projektion (nur lesend).
 * @param sicht - siehe Dateikopf
 * @returns HTML
 */
function meilensteinText(sicht) {
  const zustand = sicht.roadmap === undefined ? 'laedt' : roadmapZustand(sicht.roadmap)
  if (zustand === 'laedt') return tHtml('entwicklung.laedt')
  if (zustand === 'nicht_vorhanden') return tHtml('entwicklung.detail.planung.keineRoadmap')
  if (zustand !== 'ok') return tHtml('entwicklung.detail.planung.nichtVerfuegbar')
  const meilenstein = sicht.roadmap.meilensteine.find((m) => m.features.some((f) => f?.id === sicht.workitem.id))
  return meilenstein === undefined ? tHtml('entwicklung.detail.planung.nichtEingeplant') : escapeHtml(meilenstein.titel ?? meilenstein.id ?? '')
}

/**
 * Rechte Spalte „Deine Produktplanung“: Zeitraum (kommt), Priorität (Finding) und Meilenstein
 * (Feature) nur lesend, Ändern/„Planung speichern“ als kommt, Link zur Roadmap.
 * @param sicht - siehe Dateikopf
 * @returns HTML
 */
function planungBlock(sicht) {
  const { workitem } = sicht
  const istFeature = workitem.quelle === 'feature'
  const prioritaet = istFeature ? tHtml('entwicklung.detail.planung.ohnePrioritaet') : escapeHtml(workitem.prioritaet ?? '–')
  const meilenstein = istFeature ? `<dt>${tHtml('entwicklung.detail.planung.meilenstein')}</dt><dd>${meilensteinText(sicht)}</dd>` : ''
  return `<aside class="summary pm-planning">
      <h3>${tHtml('entwicklung.detail.planung.titel')}</h3>
      <div class="planning-window"><span>${tHtml('entwicklung.detail.planung.zeitraum')}</span><strong>${tHtml('entwicklung.detail.planung.zeitraumLeer')}</strong>${kommtKnopf(t('entwicklung.detail.planung.zeitfenster'))}</div>
      <dl class="workboard-detail-planung">
        <dt>${tHtml('entwicklung.detail.planung.prioritaet')}</dt><dd>${prioritaet}</dd>
        ${meilenstein}
      </dl>
      <div class="action-row">${kommtKnopf(t('entwicklung.detail.planung.aendern'))}${kommtKnopf(t('entwicklung.detail.planung.speichern'))}</div>
      <p class="scope">${tHtml('entwicklung.detail.planung.hinweis')}</p>
      ${istFeature ? `<a class="text-link" href="#/roadmap">${tHtml('entwicklung.detail.planung.roadmap')} <span aria-hidden="true">→</span></a>` : ''}
    </aside>`
}

/**
 * „Insights & Erkenntnisse“ als Z-Element (E13): Überschrift, „Insight hinzufügen“ (kommt),
 * Leerzustand ohne Beispielkarten.
 * @returns HTML
 */
function insightsBlock() {
  return `<section class="item-insights" id="workboard-detail-insights" aria-labelledby="workboard-detail-insights-titel">
      <div class="section-label"><h2 id="workboard-detail-insights-titel">${tHtml('entwicklung.detail.insights.titel')}</h2>${kommtKnopf(t('entwicklung.detail.insights.hinzufuegen'))}</div>
      <p class="subtle">${tHtml('entwicklung.detail.insights.leer')}</p>
      <p class="scope">${tHtml('entwicklung.detail.insights.hinweis')}</p>
    </section>`
}

/**
 * Inhalt des Details unterhalb der Statuszeile: „Wer macht was“, die zweispaltige Fläche
 * (Frage, Stand, Kriterien, Quelle | Planung) und Insights.
 * @param sicht - siehe Dateikopf
 * @returns HTML
 */
export function detailInhaltHtml(sicht) {
  return `<section class="execution-brief">${werBlock(sicht)}</section>
    <div class="split">
      <section class="workboard-detail-haupt">
        ${frageBlock(sicht)}
        ${standBlock(sicht)}
        ${kriterienBlock(sicht)}
        ${quelleBlock(sicht)}
      </section>
      ${planungBlock(sicht)}
    </div>
    ${insightsBlock()}`
}
