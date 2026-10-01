/**
 * Datei: public/leitstand/views/workflow-eingriffe.js
 *
 * Zweck: Anzeige der Eingriffe am Ablauf (F44 WS-4b, Vorlage V10 d_workflow_klaerung; Abgleich F-725
 * F6, F8, F9): die Notizen über der Timeline — „Jarvis braucht deine Entscheidung.“ (Rückfrage des
 * Architekten, F39), „Abgelehnte Befehle sichten“ (F-768) und „Der Ablauf steht.“ bzw. „Dieser Ablauf
 * ist nicht gültig.“ (Reparatur, F-240/F-247) —, die Dialoginhalte für Rückfrage und Sichtung, der
 * Reparatureditor samt Warnungen und die reinen Funktionen des Reparaturzugs (baueReparaturEntwurf,
 * ermittleAbgeschwaechteFreigabenAnzeige, ermittleReparaturWarnungen).
 *
 * Reine Funktionen: kein fetch, kein DOM, kein Import schreibender api.js-Funktionen; in Node ohne DOM
 * importierbar. Bedienlogik, Kennzeichen, Dialogsteuerung und alle POSTs bleiben in views/workflows.js.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/workflows.js
 * - public/leitstand/views/workflow-eingriffe.test.mjs (node:test)
 * - scripts/check-f42-projekt-harness.mjs (i) liest diese Datei: die Vorauswahl der Empfehlung im
 *   Formular der Rückfrage (F-711, renderArchitekturEntscheidung)
 * - scripts/check-f15-workflow-oberflaeche.mjs (h) liest diese Datei mit views/workflows.js zusammen
 *
 * Wichtig:
 * - Angeboten wird nur, was der Server ausweist (D5): architekturEntscheidung (Regel 1c), sichtung
 *   (istSichtungsHaltAnzeige, F-760-Halt), status bzw. eine ungültige Fassung für die Reparatur.
 * - Servertexte (Fragen, Optionen, Vor- und Nachteile, Begründungen, grund, IDs) bleiben roh und
 *   werden escaped; alle übrigen Texte über t()/tHtml().
 * - IDs bleiben: wf-architektur-frage-<i>, wf-architektur-begruendung-<i>, wf-sichtung-begruendung,
 *   workflow-reparatur-warnungen, wf-reparatur-begruendung, wf-reparatur-entwurf,
 *   wf-reparatur-einreichen, wf-reparatur-verwerfen, wf-reparatur-meldung.
 */

import { empfehlungIdsFuerFreigabe, renderEmpfehlung, renderInstallierbarHinweis } from '../empfehlung-anzeige.js'
import { t, tHtml } from '../i18n.js'
import { escapeHtml } from '../render.js'
import { rollenName } from '../rollen-anzeige.js'

/** Workflow-Status, aus denen heraus eine Reparaturfassung vorbereitet wird (F-240). */
export const REPARIERBARE_WORKFLOW_STATUS = ['GESTOPPT', 'KLAERUNG_ERFORDERLICH']

/** Schritt-Status, deren Schrittfelder eine Reparaturfassung zurücksetzt: der abgebrochene (LAEUFT) und die gescheiterten. ERFOLGREICHE Schritte bleiben unangetastet — ihre lauf_id ist der Lineage-Verweis, den Folgeschritte zitieren. */
const REPARIERBARE_SCHRITT_STATUS = ['LAEUFT', 'FEHLGESCHLAGEN', 'VERWEIGERT']

/** @param id - Kennung @returns HTML `<code>…</code>` */
function code(id) {
  return `<code>${escapeHtml(String(id ?? ''))}</code>`
}

/**
 * Kopf eines Dialogs (Vorlage .dialog-heading) mit Schließen-Knopf.
 * @param titelSchluessel - i18n-Schlüssel des Titels
 * @returns HTML
 */
export function dialogKopf(titelSchluessel) {
  return `<div class="dialog-heading"><h2 id="workflow-dialog-titel">${tHtml(titelSchluessel)}</h2><button type="button" class="icon-button wf-dialog-abbrechen" aria-label="${tHtml('ablauf.dialog.schliessen')}"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18" /></svg></button></div>`
}

/** Fuß eines Dialogs: „Abbrechen“, die Hauptaktion und die Meldung (kein aria-live, der Fokus geht auf sie). @param hauptaktion - HTML des Knopfs @returns HTML */
function dialogFuss(hauptaktion) {
  return `<div class="dialog-actions"><button type="button" class="button wf-dialog-abbrechen">${tHtml('ablauf.dialog.abbrechen')}</button>${hauptaktion}</div>
    <p id="workflow-dialog-meldung" class="fehler" tabindex="-1" hidden></p>`
}

// ─── Notizen über der Timeline (F6, F9, F8) ─────────────────────────────────

/**
 * F6: „Jarvis braucht deine Entscheidung.“ mit der ersten Frage (bei mehreren „und n weitere“) und
 * „Rückfrage beantworten“ (öffnet den Dialog der Art 'klaerung').
 * @param workflowId - Kennung des Workflows
 * @param architekturEntscheidung - { schrittId, fragen } aus GET /api/workflows/<id>
 * @returns HTML
 */
export function renderKlaerungNotiz(workflowId, architekturEntscheidung) {
  const fragen = Array.isArray(architekturEntscheidung.fragen) ? architekturEntscheidung.fragen : []
  const weitere = fragen.length > 1 ? ` <span class="wf-weitere">${tHtml('eingriff.klaerung.weitere', { anzahl: fragen.length - 1 })}</span>` : ''
  return `<div class="note amber wf-klaerung">
    <strong>${tHtml('eingriff.klaerung.titel')}</strong>
    <p>${escapeHtml(fragen[0]?.frage ?? '')}${weitere}</p>
    <button type="button" class="button primary wf-aktion" data-aktion="klaerung-oeffnen" data-workflow-id="${escapeHtml(workflowId)}" aria-haspopup="dialog">${tHtml('eingriff.klaerung.knopf')}</button>
  </div>`
}

/**
 * F9 (F-768): „Abgelehnte Befehle sichten“ — Schritt, Lauf und Nachfolger wie im bisherigen Satz, ein
 * Verweis auf das Lauf-Detail und der Knopf, der den Dialog der Art 'sichtung' öffnet.
 * @param workflowId - Kennung des Workflows
 * @param sichtung - Ergebnis von istSichtungsHaltAnzeige ({ schrittId, laufId, nachfolger })
 * @returns HTML
 */
export function renderSichtungNotiz(workflowId, sichtung) {
  return `<div class="note amber wf-sichtung">
    <strong>${tHtml('eingriff.sichtung.titel')}</strong>
    <p>${tHtml('eingriff.sichtung.text', {}, { schritt: code(sichtung.schrittId), lauf: code(sichtung.laufId) })}</p>
    <p><a class="text-link" href="#/runs/${escapeHtml(encodeURIComponent(sichtung.laufId ?? ''))}">${tHtml('eingriff.sichtung.lauf')} <span aria-hidden="true">→</span></a></p>
    <button type="button" class="button primary wf-aktion" data-aktion="sichtung-oeffnen" data-workflow-id="${escapeHtml(workflowId)}" aria-haspopup="dialog">${tHtml('eingriff.sichtung.knopf')}</button>
  </div>`
}

/**
 * F8: rot „Dieser Ablauf ist nicht gültig.“ bei einer ungültigen Fassung, sonst bernstein „Der Ablauf
 * steht.“; dazu „Ablauf reparieren“ (öffnet den Editor inline darunter, #workflow-reparatur).
 * @param workflowId - Kennung des Workflows
 * @param ungueltig - true, wenn die Fassung nicht gegen WORKFLOW_V0 validiert
 * @returns HTML
 */
export function renderReparaturNotiz(workflowId, ungueltig) {
  const art = ungueltig ? 'ungueltig' : 'steht'
  return `<div class="note ${ungueltig ? 'red' : 'amber'} wf-reparatur-notiz">
    <strong>${tHtml(`eingriff.reparatur.${art}.titel`)}</strong>
    <p>${tHtml(`eingriff.reparatur.${art}.text`, {}, { id: code('workflow_id') })}</p>
    <button type="button" class="button wf-aktion" data-aktion="reparatur" data-workflow-id="${escapeHtml(workflowId)}">${tHtml('eingriff.reparatur.knopf')}</button>
  </div>`
}

/**
 * Die Notizen eines Workflows in der Reihenfolge Rückfrage, Sichtung, Reparatur. Angeboten wird nur,
 * was der Server ausweist; ohne fälligen Eingriff ''.
 * @param workflowId - Kennung des Workflows
 * @param status - daten.status
 * @param ungueltig - true, wenn die Fassung nicht gegen WORKFLOW_V0 validiert
 * @param architekturEntscheidung - { schrittId, fragen } oder null (Regel 1c, F39 WS-2b)
 * @param sichtung - istSichtungsHaltAnzeige oder null (F-768)
 * @returns HTML
 */
export function renderEingriffe(workflowId, status, ungueltig = false, architekturEntscheidung = null, sichtung = null) {
  const notizen = []
  // Ohne lesbare Frage gibt es nichts zu beantworten (der Halt bleibt über die Reparatur-Notiz bedienbar).
  if (architekturEntscheidung !== null && architekturEntscheidung.fragen?.length > 0) notizen.push(renderKlaerungNotiz(workflowId, architekturEntscheidung))
  // F-768: nur beim reinen F-760-Halt; mit Zusatzgründen bleibt allein die Reparaturfassung.
  if (sichtung !== null && !ungueltig) notizen.push(renderSichtungNotiz(workflowId, sichtung))
  if (REPARIERBARE_WORKFLOW_STATUS.includes(status) || ungueltig) notizen.push(renderReparaturNotiz(workflowId, ungueltig))
  return notizen.join('')
}

// ─── Dialoginhalte (Rückfrage, Sichtung) ────────────────────────────────────

/**
 * Das Formular der Rückfrage (F39 WS-2b, löst F-632 Teil b): je Frage die Optionen mit Vor- und
 * Nachteilen als Radio-Auswahl, die Empfehlung des Architekten vorgewählt (F-711: per Titel, nicht
 * per Position), dazu eine optionale eigene Begründung je Frage und „Entscheidung speichern“. Der
 * Server (pruefeAntwortenGegenFragen) prüft die Vollständigkeit ohnehin nochmals.
 * @param workflowId - Kennung des Workflows
 * @param architekturEntscheidung - { schrittId, fragen } aus GET /api/workflows/<id>, oder null
 * @returns HTML, oder '' wenn architekturEntscheidung null ist
 */
export function renderArchitekturEntscheidung(workflowId, architekturEntscheidung) {
  if (architekturEntscheidung === null) return ''
  const kennung = escapeHtml(workflowId)
  const schrittId = escapeHtml(architekturEntscheidung.schrittId)
  const fragenHtml = (Array.isArray(architekturEntscheidung.fragen) ? architekturEntscheidung.fragen : [])
    .map((frage, index) => {
      const optionenHtml = (Array.isArray(frage.optionen) ? frage.optionen : [])
        .map((option) => {
          const empfohlen = option.titel === frage.empfehlung
          const vorteile = option.vorteile?.length > 0 ? `<ul class="vorteile">${option.vorteile.map((v) => `<li><span aria-hidden="true">+ </span>${escapeHtml(v)}</li>`).join('')}</ul>` : ''
          const nachteile = option.nachteile?.length > 0 ? `<ul class="nachteile">${option.nachteile.map((n) => `<li><span aria-hidden="true">− </span>${escapeHtml(n)}</li>`).join('')}</ul>` : ''
          return `<label class="wf-architektur-option">
            <input type="radio" name="wf-architektur-frage-${index}" value="${escapeHtml(option.titel)}"${empfohlen ? ' checked' : ''}>
            <span><strong>${escapeHtml(option.titel)}</strong>${empfohlen ? ` <span class="ablauf-marke">${tHtml('eingriff.klaerung.empfehlung')}</span>` : ''}
            ${vorteile}${nachteile}</span>
          </label>`
        })
        .join('')
      return `<fieldset class="wf-architektur-frage" data-frage="${escapeHtml(frage.frage)}">
        <legend>${escapeHtml(frage.frage)}</legend>
        <p class="subtle">${tHtml('eingriff.klaerung.auswirkung', { text: String(frage.auswirkung_bestand ?? '') })}</p>
        ${optionenHtml}
        <p class="subtle">${tHtml('eingriff.klaerung.begruendungArchitekt', { text: String(frage.begruendung ?? '') })}</p>
        <label class="field" for="wf-architektur-begruendung-${index}">${tHtml('eingriff.klaerung.eigeneBegruendung')}</label>
        <textarea id="wf-architektur-begruendung-${index}" rows="2"></textarea>
      </fieldset>`
    })
    .join('')
  return `<div class="wf-architektur-entscheidung">
    <p class="subtle">${tHtml('eingriff.klaerung.einleitung', { anzahl: Array.isArray(architekturEntscheidung.fragen) ? architekturEntscheidung.fragen.length : 0 }, { schritt: `<code>${schrittId}</code>` })}</p>
    ${fragenHtml}
    ${dialogFuss(`<button type="button" class="button primary wf-aktion" data-aktion="architektur-entscheidung" data-workflow-id="${kennung}" data-schritt-id="${schrittId}">${tHtml('eingriff.klaerung.speichern')}</button>`)}
  </div>`
}

/**
 * Inhalt des Dialogs „Rückfrage beantworten“ (Art 'klaerung').
 * @param workflowId - Kennung des Workflows
 * @param architekturEntscheidung - { schrittId, fragen }
 * @returns HTML
 */
export function renderKlaerungDialog(workflowId, architekturEntscheidung) {
  return `${dialogKopf('eingriff.klaerung.dialogTitel')}${renderArchitekturEntscheidung(workflowId, architekturEntscheidung)}`
}

/**
 * Inhalt des Dialogs „Abgelehnte Befehle sichten“ (Art 'sichtung'): was die Bestätigung bewirkt,
 * Pflichtbegründung und „Sichtung bestätigt – weiter“.
 * @param workflowId - Kennung des Workflows
 * @param sichtung - { schrittId, laufId, nachfolger }
 * @returns HTML
 */
export function renderSichtungDialog(workflowId, sichtung) {
  return `${dialogKopf('eingriff.sichtung.titel')}
    <p class="subtle">${tHtml('eingriff.sichtung.folge', {}, { schritt: code(sichtung.schrittId), nachfolger: code(sichtung.nachfolger), lauf: code(sichtung.laufId) })}</p>
    <label class="field" for="wf-sichtung-begruendung">${tHtml('eingriff.sichtung.begruendung')}</label>
    <textarea id="wf-sichtung-begruendung" rows="3" aria-required="true" aria-describedby="workflow-dialog-meldung"></textarea>
    ${dialogFuss(`<button type="button" class="button primary wf-aktion" data-aktion="sichtung" data-workflow-id="${escapeHtml(workflowId)}">${tHtml('eingriff.sichtung.bestaetigen')}</button>`)}`
}

// ─── Dialoginhalte Freigabe und Stopp (F44 WS-4a: F3, F3b, F4, F5, F10) ───────

/**
 * Inhalt des Freigabedialogs (F3, F3b, F4, F5): fälliger Schritt, Katalog-Empfehlung (Checkboxen
 * disabled, „Freigeben & installieren“), Pflichtbegründung, „Freigeben & starten“ mit den
 * angezeigten wirdGenutzt-ids (data-empfehlung-ids, „Anzeige = Start“), „Ablehnen“ (Freigabe-Veto,
 * ABGELEHNT mit derselben Pflichtbegründung) und „Abbrechen“.
 * @param detail - { workflowId, daten, naechster, empfehlung, architekturEntscheidung, sichtung } (aktuellesDetail in views/workflows.js)
 * @returns HTML
 */
export function renderFreigabeDialog(detail) {
  const kennung = escapeHtml(detail.workflowId)
  const faelligerSchritt = escapeHtml(detail.naechster?.schrittId ?? '')
  const schritt = Array.isArray(detail.daten?.schritte) ? detail.daten.schritte.find((s) => s.schritt_id === detail.naechster?.schrittId) : undefined
  const rolle = schritt === undefined ? '' : `<strong>${escapeHtml(rollenName(schritt.rolle))}</strong> `
  // F36 WS-3: die angezeigten wirdGenutzt-ids gehen mit der Freigabe mit (data-empfehlung-ids, „Anzeige = Start“).
  const empfehlungIds = empfehlungIdsFuerFreigabe(detail.empfehlung)
  const empfehlungAttribut = empfehlungIds === undefined ? '' : ` data-empfehlung-ids="${escapeHtml(JSON.stringify(empfehlungIds))}"`
  const abbrechen = `<button type="button" class="button wf-dialog-abbrechen">${tHtml('ablauf.dialog.abbrechen')}</button>`
  const ablehnen = `<button type="button" class="button danger wf-aktion" data-aktion="ablehnen" data-workflow-id="${kennung}" data-schritt-id="${faelligerSchritt}">${tHtml('ablauf.dialog.freigabe.ablehnen')}</button>`
  return `${dialogKopf('ablauf.dialog.freigabe.titel')}
    <p class="subtle">${tHtml('ablauf.dialog.freigabe.text')}</p>
    <p class="workflow-dialog-schritt">${tHtml('ablauf.dialog.faellig')}: ${rolle}<code>${faelligerSchritt}</code></p>
    ${renderEmpfehlung(detail.empfehlung)}
    <label class="field" for="wf-freigabe-begruendung">${tHtml('ablauf.dialog.freigabe.begruendung')}</label>
    <textarea id="wf-freigabe-begruendung" rows="3" aria-required="true" aria-describedby="workflow-dialog-meldung" placeholder="${tHtml('ablauf.dialog.freigabe.platzhalter')}"></textarea>
    <p class="subtle">${tHtml('ablauf.dialog.freigabe.ablehnenHinweis')}</p>
    ${renderInstallierbarHinweis(detail.empfehlung)}
    <div class="dialog-actions">${abbrechen}${ablehnen}<button type="button" class="button primary wf-aktion" data-aktion="freigeben" data-workflow-id="${kennung}" data-schritt-id="${faelligerSchritt}"${empfehlungAttribut}>${tHtml('ablauf.dialog.freigabe.bestaetigen')}</button></div>
    <p id="workflow-dialog-meldung" class="fehler" tabindex="-1" hidden></p>`
}

/**
 * Inhalt des Stoppdialogs (F10): Pflichtbegründung, „Stoppen“ und „Abbrechen“.
 * @param detail - { workflowId, daten, naechster, empfehlung, architekturEntscheidung, sichtung } (aktuellesDetail in views/workflows.js)
 * @returns HTML
 */
export function renderStoppDialog(detail) {
  return `${dialogKopf('ablauf.dialog.stopp.titel')}
    <p class="subtle">${tHtml('ablauf.dialog.stopp.text')}</p>
    <label class="field" for="wf-stopp-begruendung">${tHtml('ablauf.dialog.stopp.begruendung')}</label>
    <textarea id="wf-stopp-begruendung" rows="3" aria-required="true" aria-describedby="workflow-dialog-meldung"></textarea>
    <div class="dialog-actions"><button type="button" class="button wf-dialog-abbrechen">${tHtml('ablauf.dialog.abbrechen')}</button><button type="button" class="button danger wf-aktion" data-aktion="stoppen" data-workflow-id="${escapeHtml(detail.workflowId)}">${tHtml('ablauf.dialog.stopp.bestaetigen')}</button></div>
    <p id="workflow-dialog-meldung" class="fehler" tabindex="-1" hidden></p>`
}

/**
 * Inhalt des Dialogs je Art aus dem aktuellen Detail; null, wenn die Art im Detail nicht (mehr)
 * fällig ist (Rückfrage ohne architekturEntscheidung, Sichtung ohne F-760-Halt).
 * @param art - Dialogart
 * @param detail - { workflowId, daten, naechster, empfehlung, architekturEntscheidung, sichtung } (aktuellesDetail in views/workflows.js)
 * @returns HTML oder null
 */
export function renderDialogInhalt(art, detail) {
  if (art === 'freigabe') return renderFreigabeDialog(detail)
  if (art === 'stopp') return renderStoppDialog(detail)
  if (art === 'klaerung') return !(detail.architekturEntscheidung?.fragen?.length > 0) ? null : renderKlaerungDialog(detail.workflowId, detail.architekturEntscheidung)
  if (art === 'sichtung') return detail.sichtung === null ? null : renderSichtungDialog(detail.workflowId, detail.sichtung)
  return null
}

// ─── Reparaturzug (löst F-240, F-218; zeigt F-219, F-223, F-226, F-384) ─────

/**
 * Baut aus der aktuellen Fassung den Entwurf einer Reparaturfassung (F-240): status -> 'OFFEN',
 * Schrittfelder des abgebrochenen/gescheiterten Schritts zurückgesetzt, Cursor bleibt oder zeigt auf
 * den ersten Schritt ohne lauf_id, grund bleibt stehen (Vorbelegung, keine Durchsetzung — der Mensch
 * prüft und ändert den Entwurf vor dem Einreichen).
 * @param daten - der geladene WORKFLOW_V0-Datensatz
 * @returns Entwurf als einfaches Objekt
 */
export function baueReparaturEntwurf(daten) {
  const schritte = daten.schritte.map((schritt) => (REPARIERBARE_SCHRITT_STATUS.includes(schritt.status) ? { ...schritt, status: 'OFFEN', lauf_id: null } : schritt))
  const cursor = daten.aktiver_schritt_id ?? schritte.find((schritt) => schritt.lauf_id === null)?.schritt_id ?? null
  return { ...daten, status: 'OFFEN', aktiver_schritt_id: cursor, schritte }
}

/**
 * Welche ZWINGEND-Freigabepflichten der Entwurf gegenüber der geladenen Fassung zurücknimmt (F-226) —
 * ANZEIGE-Zwilling der Server-Regel.
 * @param vorherigeSchritte - schritte[] der geladenen Fassung
 * @param neueSchritte - schritte[] des Entwurfs
 * @returns schritt_ids, deren ZWINGEND-Pflicht entfällt
 */
export function ermittleAbgeschwaechteFreigabenAnzeige(vorherigeSchritte, neueSchritte) {
  if (!Array.isArray(vorherigeSchritte) || !Array.isArray(neueSchritte)) return []
  const neueNachId = new Map(neueSchritte.filter((schritt) => schritt !== null && typeof schritt === 'object').map((schritt) => [schritt.schritt_id, schritt]))
  return vorherigeSchritte
    .filter((schritt) => schritt.freigabe === 'ZWINGEND')
    .filter((schritt) => neueNachId.get(schritt.schritt_id)?.freigabe !== 'ZWINGEND')
    .map((schritt) => schritt.schritt_id)
}

/** @param ids - schritt_ids @returns Liste in einfachen Anführungszeichen, z. B. 's1', 's2' */
function idListe(ids) {
  return ids.map((id) => `'${id}'`).join(', ')
}

/**
 * Die Warnungen über dem Entwurf (F-219, F-223, F-226, F-240, F-384) — sie LÖSEN die zugrunde
 * liegenden Befunde nicht, sie machen sie sichtbar. Inhalt wie bisher, die Texte über t().
 * @param daten - die geladene Fassung
 * @param entwurf - der (möglicherweise vom Menschen bearbeitete) Entwurf
 * @returns Warntexte
 */
export function ermittleReparaturWarnungen(daten, entwurf) {
  const warnungen = []

  const verloreneFreigaben = daten.schritte.filter((schritt) => schritt.freigabe_erteilt === true && schritt.lauf_id === null).map((schritt) => schritt.schritt_id)
  if (verloreneFreigaben.length > 0) warnungen.push(t('reparatur.warnung.f223', { ids: idListe(verloreneFreigaben) }))

  const verloreneVorgaenger = daten.schritte
    .filter((schritt) => REPARIERBARE_SCHRITT_STATUS.includes(schritt.status) && schritt.lauf_id !== null && schritt.nachfolger !== null)
    .map((schritt) => `'${schritt.schritt_id}' -> '${schritt.nachfolger}'`)
  if (verloreneVorgaenger.length > 0) warnungen.push(t('reparatur.warnung.f219', { paare: verloreneVorgaenger.join(', ') }))

  const abgeschwaecht = ermittleAbgeschwaechteFreigabenAnzeige(daten.schritte, entwurf?.schritte)
  if (abgeschwaecht.length > 0) warnungen.push(t('reparatur.warnung.f226', { ids: idListe(abgeschwaecht) }))

  if (typeof daten.grund === 'string' && daten.grund.length > 0) {
    warnungen.push(t('reparatur.warnung.f240Grund', { grund: `${daten.grund.slice(0, 80)}${daten.grund.length > 80 ? '…' : ''}` }))
  }

  const gelaufen = Array.isArray(entwurf?.schritte) ? entwurf.schritte.filter((schritt) => schritt?.lauf_id !== null && schritt?.lauf_id !== undefined).length : 0
  const grenze = entwurf?.grenzen?.max_schritte
  if (typeof grenze === 'number' && gelaufen >= grenze) warnungen.push(t('reparatur.warnung.f240Grenze', { grenze: String(grenze), gelaufen: String(gelaufen) }))

  // QA-Pass 15.09.2026 (F-384): REPARIERBARE_SCHRITT_STATUS lässt einen ERFOLGREICHEN
  // Ausführungsschritt absichtlich unangetastet (Lineage) — der Automat startet ihn deshalb NIE neu
  // (Regel 3, src/workflow/index.ts). Ohne diese Warnung bliebe eine Abnahme-Entscheidung an derselben
  // lauf_id hängen und der Automat hielte mit KLAERUNG_ERFORDERLICH an, ohne neu zu bauen. Geprüft
  // wird der EINGETIPPTE Entwurf (Muster F-226), damit die Warnung nach dem manuellen Zurücksetzen
  // verschwindet.
  const entwurfSchritte = Array.isArray(entwurf?.schritte) ? entwurf.schritte : []
  const ausfuehrungUnveraendert = entwurfSchritte.find((schritt) => schritt?.rolle === 'ausfuehrung' && schritt?.status === 'ERFOLGREICH')
  if (ausfuehrungUnveraendert !== undefined) {
    warnungen.push(t('reparatur.warnung.f384', { schritt: String(ausfuehrungUnveraendert.schritt_id), lauf: String(ausfuehrungUnveraendert.lauf_id) }))
  }

  return warnungen
}

/** @param warnungen - Texte aus ermittleReparaturWarnungen @returns HTML-Block, Leerzustand bei keiner Warnung */
export function renderReparaturWarnungen(warnungen) {
  if (warnungen.length === 0) return `<p class="subtle">${tHtml('reparatur.keineWarnungen')}</p>`
  return `<div class="note amber"><strong>${tHtml('reparatur.warnungenTitel')}</strong><ul>${warnungen.map((warnung) => `<li>${escapeHtml(warnung)}</li>`).join('')}</ul></div>`
}

/**
 * Der Reparatureditor (inline unter der Notiz, #workflow-reparatur): der Entwurf als bearbeitbarer
 * JSON-Text — bewusst kein Formular, das wäre ein Plan-Editor, den AK8 nicht verlangt.
 * @param workflowId - Kennung des Workflows
 * @param entwurf - Vorbelegung aus baueReparaturEntwurf
 * @param warnungen - Texte aus ermittleReparaturWarnungen
 * @returns HTML
 */
export function renderReparatur(workflowId, entwurf, warnungen) {
  return `<div class="wf-reparatur-editor">
    <h3>${tHtml('reparatur.titel', {}, { id: code(workflowId) })}</h3>
    <p class="subtle">${tHtml('reparatur.hinweis')}</p>
    <div id="workflow-reparatur-warnungen">${renderReparaturWarnungen(warnungen)}</div>
    <label class="field" for="wf-reparatur-begruendung">${tHtml('reparatur.begruendung')}</label>
    <input type="text" id="wf-reparatur-begruendung" />
    <label class="field" for="wf-reparatur-entwurf">${tHtml('reparatur.entwurf')}</label>
    <textarea id="wf-reparatur-entwurf" rows="24" spellcheck="false">${escapeHtml(JSON.stringify(entwurf, null, 2))}</textarea>
    <div class="action-row">
      <button type="button" id="wf-reparatur-einreichen" class="button primary" data-workflow-id="${escapeHtml(workflowId)}">${tHtml('reparatur.einreichen')}</button>
      <button type="button" id="wf-reparatur-verwerfen" class="button">${tHtml('reparatur.verwerfen')}</button>
    </div>
    <p id="wf-reparatur-meldung" class="fehler" hidden></p>
  </div>`
}
