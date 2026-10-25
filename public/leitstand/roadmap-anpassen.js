/**
 * Datei: public/leitstand/roadmap-anpassen.js
 *
 * Zweck: Reine Bausteine für „Anpassen“ im Detailpanel der Roadmap (F45 B5b-2b-1, features/F45/plan-b5b2b-v2.md; Sollvorgabe
 * Stefan §5 Punkt 7). Grundlage ist die vorhandene Route PUT …/features/<id>/planung (scripts/leitstand/routen-planung.mjs,
 * Prüfung src/feature-auftrag/planung-schreiben.ts pruefePlanungAenderung — dort ist der Körper maßgeblich):
 * { prioritaet?, meilenstein?, workstreams?: [{ id, schaetzung_min, schaetzung_max }], grund, hash, roadmap_hash? }.
 * - Feature-Zeile: Priorität (P0–P3 oder „keine Änderung“) und Meilenstein (nur nicht abgeschlossene Ziele, sonst R1-422).
 * - Workstream-/Fixpaket-/Design-Zeile: Schätzung Min/Max für das Feature der Zeile; beide leer = keine Schätzung.
 * - Meilenstein- und Gruppenzeilen: kein Anpassen. Akten ohne Datei, ABGESCHLOSSEN/ABGEBROCHEN und Schätzungen bei Formfehlern der
 *   Tabelle lehnt der Server ab — das Formular sagt es vorher (anpassbar).
 * - „Änderung speichern“ erst mit Begründung und mindestens einer echten Änderung; Zahlenregel wie der Server (0–1000, höchstens
 *   zwei Nachkommastellen, Min ≤ Max). Der Server bleibt maßgeblich.
 * - Antworten (deutePlanungAntwort): die drei 409 unterscheidet der Schlüssel — `workflowId` (Ablauf sperrt, auch null) bzw.
 *   `hash`/`roadmap_hash` (Datei inzwischen geändert).
 *
 * Wird aufgerufen von: public/leitstand/views/roadmap.js, public/leitstand/roadmap-anpassen.test.mjs.
 *
 * Wichtig:
 * - Import-sicher und rein: kein fetch, kein DOM, kein Storage. Getippte Werte liest die View aus dem DOM in ihren Zustand.
 * - Projekt- und Servertexte (IDs, Titel, Gründe, Verstöße) werden nie übersetzt und immer escaped; alle übrigen über t().
 * - DEKLARIERT (Auftrag B5b-2b, Advisor O3): Die View liest den Akte-Hash (und mit Meilenstein-Wechsel den roadmap_hash) frisch
 *   unmittelbar vor dem Speichern. Eine zwischen Öffnen und Speichern von außen geänderte Priorität, Schätzung bzw. Zuordnung wird
 *   dadurch überschrieben — nur das bewusst geänderte Feld, denn unveränderte Felder gehen nicht in den Körper.
 */

import { AKTE_GRUND_MAX, gitBlockHtml, gitVon, grundUndVerstoesse, grundVon, verstoesseVon } from './akte-bearbeiten.js'
import { t, tHtml } from './i18n.js'
import { escapeHtml } from './render.js'
import { zeilenSchluessel } from './roadmap-anzeige.js'

/** Prioritäten einer Akte (PRIORITAETEN in src/workboard/feature-planung.ts). */
export const PRIORITAETEN = Object.freeze(['P0', 'P1', 'P2', 'P3'])

/** Obergrenze einer Schätzung (SCHAETZUNG_OBERGRENZE im Server). */
export const SCHAETZUNG_MAX = 1000

/** Schätzzahl im Formular: Ziffern, optional Komma oder Punkt mit ein bis zwei Stellen (SCHAETZUNG_ZAHL im Server). */
const SCHAETZ_TEXT = /^\d+(?:[.,]\d{1,2})?$/

/** Akten-Status, die der Server nicht mehr bearbeitet (STATUS_NICHT_BEARBEITBAR). */
const NICHT_BEARBEITBAR = new Set(['ABGESCHLOSSEN', 'ABGEBROCHEN'])

/** Zeilenarten mit Schätzung (WORKSTREAM_ARTEN). */
const SCHAETZ_ARTEN = new Set(['workstream', 'fixpaket', 'design'])

/**
 * Ob und wie eine Zeile angepasst werden kann.
 * @param zeile - gewählte Zeile aus ganttZeilen
 * @param featureZeile - Feature-Zeile darüber (bei einer Workstream-Zeile), sonst null
 * @returns { art: 'feature' } | { art: 'schaetzung' } | { art: 'nein', grund: null | 'ohneAkte' | 'abgeschlossen' | 'fehlerhaft' }
 *   (grund null = kein Formular und kein Hinweis, z. B. Meilenstein)
 */
export function anpassbar(zeile, featureZeile) {
  if (zeile === null || zeile === undefined || (zeile.art !== 'feature' && !SCHAETZ_ARTEN.has(zeile.art))) return { art: 'nein', grund: null }
  const feature = zeile.art === 'feature' ? zeile : featureZeile
  if (feature === null || feature === undefined || feature.kategorie === 'ohne_akte') return { art: 'nein', grund: 'ohneAkte' }
  if (NICHT_BEARBEITBAR.has(feature.status)) return { art: 'nein', grund: 'abgeschlossen' }
  if (zeile.art === 'feature') return { art: 'feature' }
  if (Array.isArray(feature.hinweise) && feature.hinweise.includes('fehlerhaft')) return { art: 'nein', grund: 'fehlerhaft' }
  return { art: 'schaetzung' }
}

/**
 * Zahl als Formulartext (Komma als Dezimalzeichen, wie die Akte).
 * @param zahl - Wert oder null
 * @returns Text ('' ohne Wert)
 */
const alsText = (zahl) => (typeof zahl === 'number' ? String(zahl).replace('.', ',') : '')

/**
 * Formularstand beim Öffnen.
 * @param zeile - gewählte Zeile (Feature oder Workstream/Fixpaket/Design)
 * @returns Feature: { prioritaet: '', meilenstein, grund: '' } · sonst { min, max, grund: '' }
 */
export function anpassenWerte(zeile) {
  if (zeile.art === 'feature') return { prioritaet: '', meilenstein: zeile.bezug.meilenstein, grund: '' }
  return { min: alsText(zeile.schaetzung?.min ?? null), max: alsText(zeile.schaetzung?.max ?? null), grund: '' }
}

/**
 * Liest eine Schätzzahl aus dem Formular.
 * @param text - Eingabe
 * @returns null (leer), Zahl (gültig) oder NaN (ungültig)
 */
export function leseSchaetzzahl(text) {
  const roh = typeof text === 'string' ? text.trim() : ''
  if (roh === '') return null
  if (!SCHAETZ_TEXT.test(roh)) return Number.NaN
  const zahl = Number(roh.replace(',', '.'))
  return zahl <= SCHAETZUNG_MAX ? zahl : Number.NaN
}

/**
 * Prüft den Formularstand gegen die Zeile.
 * @param werte - Formularstand
 * @param zeile - gewählte Zeile
 * @returns { aenderungen: ('prioritaet'|'meilenstein'|'schaetzung')[], fehler: ('prioritaet'|'zahl'|'beide'|'reihenfolge')[], schaetzung: { min, max } | null }
 */
export function pruefeAnpassen(werte, zeile) {
  const aenderungen = []
  const fehler = []
  if (zeile.art === 'feature') {
    if (werte.prioritaet !== '' && !PRIORITAETEN.includes(werte.prioritaet)) fehler.push('prioritaet')
    else if (werte.prioritaet !== '' && werte.prioritaet !== (zeile.prioritaet ?? null)) aenderungen.push('prioritaet')
    if (typeof werte.meilenstein === 'string' && werte.meilenstein !== '' && werte.meilenstein !== zeile.bezug.meilenstein) aenderungen.push('meilenstein')
    return { aenderungen, fehler, schaetzung: null }
  }
  const min = leseSchaetzzahl(werte.min)
  const max = leseSchaetzzahl(werte.max)
  let schaetzung = null
  if (Number.isNaN(min) || Number.isNaN(max)) fehler.push('zahl')
  else if ((min === null) !== (max === null)) fehler.push('beide')
  else if (min !== null && min > max) fehler.push('reihenfolge')
  else if (min !== null) schaetzung = { min, max }
  if (fehler.length === 0) {
    const alt = zeile.schaetzung ?? null
    const gleich = alt === null || schaetzung === null ? alt === schaetzung : alt.min === schaetzung.min && alt.max === schaetzung.max
    if (!gleich) aenderungen.push('schaetzung')
  }
  return { aenderungen, fehler, schaetzung }
}

/**
 * true, wenn „Änderung speichern“ möglich ist: Begründung nicht leer, mindestens eine echte Änderung, keine Fehler, keine Anfrage
 * unterwegs (Doppelklick-Sperre im Zustand).
 * @param werte - Formularstand
 * @param zeile - gewählte Zeile
 * @param phase - Phase des Formulars
 * @returns boolean
 */
export function darfAnpassenSpeichern(werte, zeile, phase) {
  if (phase === 'speichert' || typeof werte?.grund !== 'string' || werte.grund.trim() === '') return false
  const pruefung = pruefeAnpassen(werte, zeile)
  return pruefung.fehler.length === 0 && pruefung.aenderungen.length > 0
}

/**
 * Hinweistext unter dem Formular, solange nicht gespeichert werden kann (für die View als textContent).
 * @param werte - Formularstand
 * @param zeile - gewählte Zeile
 * @returns Text ('' wenn speicherbar)
 */
export function anpassenHinweis(werte, zeile) {
  const pruefung = pruefeAnpassen(werte, zeile)
  if (pruefung.fehler.length > 0) return t(`roadmap.anpassen.fehler.${pruefung.fehler[0]}`)
  if (pruefung.aenderungen.length === 0) return t('roadmap.anpassen.keineAenderung')
  if (typeof werte.grund !== 'string' || werte.grund.trim() === '') return t('roadmap.anpassen.grundFehlt')
  return ''
}

/**
 * Körper für PUT …/features/<id>/planung — nur die geänderten Felder (unveränderte bleiben draußen, O3).
 * @param werte - Formularstand
 * @param zeile - gewählte Zeile
 * @param hash - frisch gelesener Akte-Hash
 * @param roadmapHash - frisch gelesener roadmap_hash (nur bei Meilenstein-Wechsel verwendet)
 * @returns Körper
 */
export function baueAnpassenKoerper(werte, zeile, hash, roadmapHash) {
  const pruefung = pruefeAnpassen(werte, zeile)
  const koerper = {}
  if (pruefung.aenderungen.includes('prioritaet')) koerper.prioritaet = werte.prioritaet
  if (pruefung.aenderungen.includes('meilenstein')) {
    koerper.meilenstein = werte.meilenstein
    koerper.roadmap_hash = roadmapHash
  }
  if (pruefung.aenderungen.includes('schaetzung')) koerper.workstreams = [{ id: zeile.id, schaetzung_min: pruefung.schaetzung?.min ?? null, schaetzung_max: pruefung.schaetzung?.max ?? null }]
  return { ...koerper, grund: werte.grund, hash }
}

/**
 * Deutet die Antwort von PUT …/planung.
 * @param status - HTTP-Status
 * @param koerper - geparster Körper ({} wenn keiner)
 * @returns { art: 'ok', git, geaendert } | { art: 'gesperrt', grund, workflowId } | { art: 'konflikt', grund }
 *   | { art: 'abgelehnt', status, grund, verstoesse } | { art: 'fehler', status, grund }
 */
export function deutePlanungAntwort(status, koerper) {
  if (status === 200 && koerper?.status === 'ok') return { art: 'ok', git: gitVon(koerper), geaendert: Array.isArray(koerper.geaendert) ? koerper.geaendert.filter((g) => typeof g === 'string') : [] }
  if (status === 409 && koerper !== null && typeof koerper === 'object' && 'workflowId' in koerper) {
    return { art: 'gesperrt', grund: grundVon(koerper), workflowId: typeof koerper.workflowId === 'string' && koerper.workflowId !== '' ? koerper.workflowId : null }
  }
  if (status === 409) return { art: 'konflikt', status, grund: grundVon(koerper), verstoesse: [] }
  if (status === 400 || status === 422) return { art: 'abgelehnt', status, grund: grundVon(koerper), verstoesse: verstoesseVon(koerper) }
  return { art: 'fehler', status, grund: grundVon(koerper) }
}

/**
 * Meilensteine, in die ein Feature verschoben werden darf: alle nicht abgeschlossenen plus der heutige (Advisor B2).
 * @param roadmap - Projektion
 * @param heute - heutige Meilenstein-ID
 * @returns [{ id, titel }]
 */
export function meilensteinZiele(roadmap, heute) {
  const liste = Array.isArray(roadmap?.meilensteine) ? roadmap.meilensteine : []
  return liste.filter((m) => m !== null && typeof m === 'object' && typeof m.id === 'string' && (m.status !== 'ABGESCHLOSSEN' || m.id === heute)).map((m) => ({ id: m.id, titel: typeof m.titel === 'string' ? m.titel : '' }))
}

/**
 * Aufklappzustand nach einem Meilenstein-Wechsel (Advisor A5): der Ziel-Meilenstein ist offen, damit die Auswahl auf dem Feature
 * bleibt und das Ergebnis samt Git-Block sichtbar ist.
 * @param standardOffen - Standard der neuen Lage
 * @param aufgeklappt - bisheriger Zustand oder null (= Standard)
 * @param meilensteinId - Ziel
 * @returns Set der Zeilenschlüssel
 */
export function offenNachWechsel(standardOffen, aufgeklappt, meilensteinId) {
  return new Set([...(aufgeklappt ?? standardOffen), zeilenSchluessel('m', meilensteinId)])
}

/**
 * Meldung unter dem Formular (konflikt, gesperrt, abgelehnt, fehler) — Servertext wörtlich, „Neu laden“ außer bei einem Fehler.
 * @param meldung - Deutung
 * @returns HTML
 */
function meldungHtml(meldung) {
  if (meldung === null || meldung === undefined) return ''
  const link = meldung.art === 'gesperrt' && meldung.workflowId !== null ? `<p><a class="text-link" href="#/workflows/${encodeURIComponent(meldung.workflowId)}">${tHtml('akteForm.gesperrt.link')} <span aria-hidden="true">→</span></a></p>` : ''
  const neuLaden = meldung.art === 'fehler' ? '' : `<button type="button" class="button" data-roadmap-anpassen-aktion="neu-laden">${tHtml('roadmap.anpassen.neuLaden')}</button>`
  const ton = meldung.art === 'abgelehnt' || meldung.art === 'fehler' ? 'red' : 'amber'
  // Prüfpass cr 4: der Satz nennt „Neu laden“ nur, wenn der Knopf da ist.
  const text = tHtml(meldung.art === 'fehler' ? 'roadmap.anpassen.meldungTextFehler' : 'roadmap.anpassen.meldungText')
  return `<div class="note ${ton} rm-anpassen-meldung" tabindex="-1" data-roadmap-anpassen-fokus><strong>${tHtml(`roadmap.anpassen.${meldung.art}.titel`)}</strong>${grundUndVerstoesse(meldung)}${link}<p>${text}</p>${neuLaden}</div>`
}

/**
 * Felder je Art (Feature: Priorität und Meilenstein; sonst Schätzung).
 * @param stand - Formularzustand mit zeile, werte, ziele
 * @param aus - ' disabled' während einer Anfrage, sonst ''
 * @returns HTML
 */
function felderHtml(stand, aus) {
  const { zeile, werte } = stand
  if (zeile.art === 'feature') {
    const heute = zeile.prioritaet ?? null
    const prio = [`<option value="">${tHtml('roadmap.anpassen.prioritaetKeine', { wert: heute ?? t('roadmap.anpassen.ohnePrioritaet') })}</option>`, ...PRIORITAETEN.map((p) => `<option value="${p}"${werte.prioritaet === p ? ' selected' : ''}>${p}</option>`)].join('')
    const ziele = stand.ziele.map((m) => {
      const text = m.id === zeile.bezug.meilenstein ? t('roadmap.anpassen.heute', { id: m.id, titel: m.titel }) : `${m.id} · ${m.titel}`
      return `<option value="${escapeHtml(m.id)}"${werte.meilenstein === m.id ? ' selected' : ''}>${escapeHtml(text)}</option>`
    })
    return `<div class="rm-anpassen-feld"><label for="rm-anpassen-prioritaet">${tHtml('roadmap.anpassen.prioritaet')}</label><select id="rm-anpassen-prioritaet" data-roadmap-anpassen-feld="prioritaet"${aus}>${prio}</select></div>
      <div class="rm-anpassen-feld"><label for="rm-anpassen-meilenstein">${tHtml('roadmap.anpassen.meilenstein')}</label><select id="rm-anpassen-meilenstein" data-roadmap-anpassen-feld="meilenstein"${aus}>${ziele.join('')}</select></div>`
  }
  const eingabe = (feld) =>
    `<div class="rm-anpassen-zahl"><label for="rm-anpassen-${feld}">${tHtml(`roadmap.anpassen.${feld}`)}</label><input id="rm-anpassen-${feld}" type="text" inputmode="decimal" autocomplete="off" maxlength="8" data-roadmap-anpassen-feld="${feld}" value="${escapeHtml(werte[feld])}" aria-describedby="rm-anpassen-schaetzung-hinweis"${aus} /></div>`
  return `<fieldset class="rm-anpassen-schaetzung"><legend>${tHtml('roadmap.anpassen.schaetzung')}</legend><div class="rm-anpassen-zahlen">${eingabe('min')}${eingabe('max')}</div><p class="subtle" id="rm-anpassen-schaetzung-hinweis">${tHtml('roadmap.anpassen.schaetzungHinweis')}</p></fieldset>`
}

/**
 * Das aufklappbare „Anpassen“ im Detailpanel (ersetzt den kommt-Knopf).
 * @param stand - { zeile, werte, ziele: [{ id, titel }], offen, phase: 'offen' | 'speichert' | 'gespeichert' | 'konflikt' | 'gesperrt'
 *   | 'abgelehnt' | 'fehler', meldung, ergebnis: { git, geaendert } | null }
 * @returns HTML
 */
export function anpassenHtml(stand) {
  const offen = stand.offen ? ' open' : ''
  const kopf = `<summary class="eyebrow" data-roadmap-anpassen-aktion="umschalten">${tHtml('roadmap.detail.anpassen')}</summary>`
  if (stand.phase === 'gespeichert' && stand.ergebnis !== null && stand.ergebnis !== undefined) {
    const geaendert = stand.ergebnis.geaendert.length > 0 ? escapeHtml(stand.ergebnis.geaendert.join(', ')) : '–'
    return `<details class="rm-anpassen" data-roadmap-anpassen-details data-phase="gespeichert"${offen}>${kopf}
        <div class="note rm-anpassen-ergebnis" tabindex="-1" data-roadmap-anpassen-fokus><strong>${tHtml('roadmap.anpassen.gespeichert.titel')}</strong><p class="subtle">${tHtml('roadmap.anpassen.gespeichert.geaendert')} ${geaendert}</p>${gitBlockHtml(stand.ergebnis.git, 'roadmap.anpassen.gitHinweis')}</div>
        <div class="action-row"><button type="button" class="button" data-roadmap-anpassen-aktion="schliessen">${tHtml('roadmap.anpassen.schliessen')}</button></div>
      </details>`
  }
  const speichert = stand.phase === 'speichert'
  const aus = speichert ? ' disabled' : ''
  const darf = darfAnpassenSpeichern(stand.werte, stand.zeile, stand.phase)
  const hinweis = speichert ? t('roadmap.anpassen.speichert') : anpassenHinweis(stand.werte, stand.zeile)
  return `<details class="rm-anpassen" data-roadmap-anpassen-details data-phase="${escapeHtml(stand.phase)}"${offen}>${kopf}
      <div class="rm-anpassen-inhalt">
        ${felderHtml(stand, aus)}
        <div class="rm-anpassen-feld"><label for="rm-anpassen-grund">${tHtml('roadmap.anpassen.grund')} <span aria-hidden="true">*</span></label><textarea id="rm-anpassen-grund" rows="2" maxlength="${AKTE_GRUND_MAX}" required aria-required="true" aria-describedby="rm-anpassen-grund-hinweis" data-roadmap-anpassen-feld="grund"${aus}>${escapeHtml(stand.werte.grund)}</textarea><p class="subtle" id="rm-anpassen-grund-hinweis">${tHtml('roadmap.anpassen.grundHinweis')}</p></div>
        ${meldungHtml(stand.meldung)}
        <p class="rm-anpassen-hinweis" data-roadmap-anpassen-hinweis>${escapeHtml(hinweis)}</p>
        <div class="action-row"><button type="button" class="button primary" data-roadmap-anpassen-aktion="speichern"${darf ? '' : ' disabled aria-disabled="true"'}>${tHtml('roadmap.anpassen.speichern')}</button></div>
      </div>
    </details>`
}

/**
 * Hinweis statt Formular, wenn die Zeile nicht angepasst werden kann (anpassbar art 'nein' mit Grund).
 * @param grund - 'ohneAkte' | 'abgeschlossen' | 'fehlerhaft'
 * @returns HTML
 */
export function nichtAnpassbarHtml(grund) {
  return `<div class="rm-anpassen rm-anpassen-nein"><span class="eyebrow">${tHtml('roadmap.detail.anpassen')}</span><p class="subtle">${tHtml(`roadmap.anpassen.nein.${grund}`)}</p></div>`
}
