/**
 * Datei: public/leitstand/views/auftrag-vorbereitung.js
 *
 * Zweck: Reines Regel- und Render-Modul für „Ablauf vorbereiten“ auf `#/projekt` (F44 WS-5b,
 * Abgleich F-725 F1, Vorlage V10 d_auftrag_neu, Entscheidung E-F44-3 = A). Es kennt drei Dinge:
 * den Auftragstext aus Ergebnis und optionalem Kontext, den Treffer im Zustands-Aggregat (der
 * vorgeschlagene Ablauf `router-<auftragId>` ist da, oder ein Startfehler zu genau diesem
 * Router-Lauf) und die Notiz des Schritts 2 je Phase. Bedienung, Anfragen und Navigation bleiben in
 * views/projekt.js.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/projekt.js (baueAuftragstext, workflowIdFuer, pruefeAggregat, renderVorbereitung)
 * - public/leitstand/views/projekt.test.mjs (node:test)
 *
 * Wichtig:
 * - Import-sicher: kein Zugriff auf DOM, Storage oder api.js — in Node ohne DOM importierbar.
 * - Serverwerte (grund, Fehlertext, auftragId, laufId) bleiben roh und werden nur escaped.
 * - Die feste Zeile „Kontext:“ ist Teil des Projektinhalts (Auftragstext) und wird nicht übersetzt.
 * - Phasen: 'wird_geroutet' (POST …/routen läuft), 'wartet' (202, Router-Lauf läuft), 'konflikt'
 *   (409, D13), 'startfehler' (Startfehler zu genau dieser laufId), 'fehler' (andere Antwort oder
 *   Netzfehler beim Routen), 'bereit' (Ablauf da, Nutzer war nicht mehr auf `#/projekt`).
 */

import { tHtml } from '../i18n.js'
import { escapeHtml } from '../render.js'

/** Feste Kopfzeile des angehängten Kontexts im Auftragstext — Projektinhalt, deshalb deutsch und nicht übersetzt. */
export const KONTEXT_ZEILE = 'Kontext:'

/** Pfeil der Primärknöpfe (Vorlage icon('arrow')). */
const PFEIL = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6" /></svg>'

/**
 * Baut den Auftragstext: das gewünschte Ergebnis, bei nicht leerem Kontext gefolgt von einem Absatz
 * mit der festen Zeile „Kontext:“ und dem Kontext.
 * @param ergebnis - Feld „Gewünschtes Ergebnis“ (unverändert übernommen)
 * @param kontext - Feld „Kontext hinzufügen“ (getrimmt; leer = kein Anhang)
 * @returns Auftragstext für POST …/auftraege
 */
export function baueAuftragstext(ergebnis, kontext) {
  const zusatz = kontext.trim()
  if (zusatz === '') return ergebnis
  if (ergebnis.trim() === '') return `${KONTEXT_ZEILE}\n${zusatz}`
  return `${ergebnis}\n\n${KONTEXT_ZEILE}\n${zusatz}`
}

/**
 * workflowId, unter der der Router-Lauf seinen Vorschlag ablegt (Muster workboard.js Click-to-Work).
 * @param auftragId - id des gerouteten Auftrags
 * @returns `router-<auftragId>`
 */
export function workflowIdFuer(auftragId) {
  return `router-${auftragId}`
}

/**
 * Sucht im Zustands-Aggregat das Ende des Wartens: zuerst den Ablauf `router-<auftragId>`, sonst
 * einen Startfehler zu GENAU der laufId dieses Router-Laufs (ältere Startfehler desselben Auftrags
 * tragen eine andere laufId). Nur in der Phase 'wartet'.
 * @param zustand - Aggregat aus GET …/zustand ({ workflows, startfehler, … }; workflows null bei defekter Quelle)
 * @param vorbereitung - { phase, workflowId, laufId } oder null
 * @returns { art: 'workflow' } | { art: 'startfehler', fehler } | null
 */
export function pruefeAggregat(zustand, vorbereitung) {
  if (vorbereitung?.phase !== 'wartet') return null
  const workflows = Array.isArray(zustand?.workflows) ? zustand.workflows : []
  if (workflows.some((w) => w?.workflowId === vorbereitung.workflowId)) return { art: 'workflow' }
  const startfehler = Array.isArray(zustand?.startfehler) ? zustand.startfehler : []
  const eintrag = startfehler.find((e) => e?.laufId === vorbereitung.laufId)
  if (eintrag !== undefined) return { art: 'startfehler', fehler: String(eintrag.fehler ?? '') }
  return null
}

/** Farbe der Notiz je Phase (.note, .note.amber, .note.red der Vorlage). */
const NOTIZ_KLASSE = { wird_geroutet: 'note', wartet: 'note', bereit: 'note', konflikt: 'note amber', startfehler: 'note red', fehler: 'note red' }

/**
 * Rendert die Notiz des Schritts 2 „Ablauf prüfen“.
 * @param vorbereitung - { phase, auftragId, laufId, workflowId, meldung, wiederholbar } — wiederholbar false (4xx beim Routen) blendet „Erneut versuchen“ aus
 * @returns HTML (leer bei unbekannter Phase)
 */
export function renderVorbereitung(vorbereitung) {
  const klasse = NOTIZ_KLASSE[vorbereitung?.phase]
  if (klasse === undefined) return ''
  const { phase } = vorbereitung
  const daten = [`<dt>${tHtml('auftrag.vorbereitung.auftrag')}</dt><dd><code>${escapeHtml(vorbereitung.auftragId ?? '')}</code></dd>`]
  if (typeof vorbereitung.laufId === 'string' && vorbereitung.laufId !== '') daten.push(`<dt>${tHtml('auftrag.vorbereitung.laufId')}</dt><dd><code>${escapeHtml(vorbereitung.laufId)}</code></dd>`)
  // Serverwerte (grund, Startfehler, Fehlertext) roh; sonst der feste Satz der Phase.
  const text = phase === 'konflikt' || phase === 'startfehler' || phase === 'fehler' ? escapeHtml(vorbereitung.meldung ?? '') : tHtml(`auftrag.vorbereitung.${phase}.text`)
  const knoepfe = []
  if (phase === 'bereit') knoepfe.push(`<a class="button primary" href="#/workflows/${escapeHtml(encodeURIComponent(vorbereitung.workflowId ?? ''))}" data-aktion="pruefen">${tHtml('auftrag.vorbereitung.pruefen')} ${PFEIL}</a>`)
  if (phase === 'konflikt' || phase === 'startfehler' || (phase === 'fehler' && vorbereitung.wiederholbar !== false)) knoepfe.push(`<button type="button" class="button primary" data-aktion="erneut">${tHtml('auftrag.vorbereitung.erneut')}</button>`)
  if (phase !== 'wird_geroutet') knoepfe.push(`<button type="button" class="button" data-aktion="neu">${tHtml('auftrag.vorbereitung.neu')}</button>`)
  return `<div class="${klasse}" id="auftrag-vorbereitung-notiz" tabindex="-1"><strong>${tHtml(`auftrag.vorbereitung.${phase}.titel`)}</strong><p>${text}</p><dl class="auftrag-daten">${daten.join('')}</dl>${knoepfe.length > 0 ? `<div class="action-row">${knoepfe.join('')}</div>` : ''}</div>`
}
