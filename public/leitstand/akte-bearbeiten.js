/**
 * Datei: public/leitstand/akte-bearbeiten.js
 *
 * Zweck: Reine Bausteine für „Akte bearbeiten“ im Feature-Detail und „Als Feature anlegen“ im Coach (F45 B5a-2,
 * features/F45/plan-b5a2-v2.md; E-F45-1, F-912). Grundlage sind die Routen aus B5a-1 (scripts/leitstand/routen-f35.mjs):
 * PUT …/features/<id>/akte { ziel, nicht_ziele, akzeptanzkriterien, grund, hash } und POST /api/features { scope }.
 * - Formularstand aus der gelesenen Akte (baueAkteFormular): bei einer vollständigen Akte die gelesenen Werte, bei einer
 *   unvollständigen (F-1177 qa 4: der Leser liefert keine Teilwerte) leere Felder — dann trägt das Formular fest den
 *   Warnhinweis, dass Speichern Ziel, Nicht-Ziele und AK ersetzt (Advisor B1, Weg b).
 * - PUT-Körper (baueAkteKoerper): mit dem beim Öffnen gelesenen Hash; Zeilen aus nur Leerraum fallen weg (der Server
 *   lehnte sie ab). Indizes in Servermeldungen (z. B. nicht_ziele[2]) zählen deshalb die gesendete Liste, nicht die Zeilen.
 * - Deutung der Antworten (deuteAkteAntwort, deuteFeatureAnlage): die beiden 409-Formen unterscheidet der Schlüssel —
 *   `hash` (Akte inzwischen geändert) bzw. `workflowId` (Ablauf sperrt, auch null).
 * - HTML des Formulars, des Ergebnisses und des Git-Blocks (befehlsblock.js, nur Kopieren, nichts wird ausgeführt).
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/workboard.js (Formular, Speichern)
 * - public/leitstand/views/chat.js (Ergebnis von „Als Feature anlegen“)
 * - public/leitstand/akte-bearbeiten.test.mjs, scripts/check-f45-b5a2-akte-anzeige.mjs
 *
 * Wichtig:
 * - Import-sicher und rein: kein fetch, kein DOM, kein Storage. Getippte Werte liest workboard.js aus dem DOM.
 * - Akten- und Servertexte (Ziel, AK, Gründe, Verstöße, IDs) werden nie übersetzt und immer escaped; alle übrigen über t().
 * - Der Server bleibt die Durchsetzung (Pflichtgrund, Hash, Sperre, Status, Gate); der Client sperrt nur vorab.
 */

import { renderBefehlsblock } from './befehlsblock.js'
import { t, tHtml } from './i18n.js'
import { escapeHtml } from './render.js'

/** Hash der gelesenen Akte (sha256, 64 Hex-Zeichen klein) — Muster SHA256_MUSTER in src/feature-auftrag/akte-schreiben.ts. */
export const AKTE_HASH_MUSTER = /^[0-9a-f]{64}$/

/** Obergrenze der Begründung (AKTE_GRUND_OBERGRENZE im Server). */
export const AKTE_GRUND_MAX = 500

/** Kennung eines AK (AK_ID_MUSTER im Server). */
const AK_ID = /^AK([0-9]+)$/

/**
 * Formularstand aus der gelesenen Akte.
 * @param akte - geprüfte Antwort von GET …/akte ({ status: 'ok', ziel, nicht_ziele, akzeptanzkriterien } | { status: 'unvollstaendig' })
 * @returns { ziel, nichtZiele: string[], aks: { id, text }[], grund: '', naechsteAk: Zahl }
 */
export function baueAkteFormular(akte) {
  if (akte?.status !== 'ok') return { ziel: '', nichtZiele: [], aks: [{ id: 'AK1', text: '' }], grund: '', naechsteAk: 2 }
  const aks = akte.akzeptanzkriterien.map((ak) => ({ id: ak.id, text: ak.text }))
  const hoechste = aks.reduce((max, ak) => Math.max(max, Number(AK_ID.exec(ak.id)?.[1] ?? 0)), 0)
  return { ziel: akte.ziel, nichtZiele: [...akte.nicht_ziele], aks: aks.length > 0 ? aks : [{ id: 'AK1', text: '' }], grund: '', naechsteAk: Math.max(hoechste, aks.length > 0 ? 0 : 1) + 1 }
}

/**
 * Hängt ein leeres AK mit der nächsten freien Nummer an (eine entfernte Nummer wird nicht wieder vergeben).
 * @param werte - Formularstand
 * @returns neuer Formularstand
 */
export function mitNeuemAk(werte) {
  return { ...werte, aks: [...werte.aks, { id: `AK${werte.naechsteAk}`, text: '' }], naechsteAk: werte.naechsteAk + 1 }
}

/**
 * true, wenn „Speichern“ möglich ist: Begründung nicht leer und keine Anfrage unterwegs (Doppelklick-Sperre im Zustand).
 * @param werte - Formularstand
 * @param phase - Phase des Formulars
 * @returns boolean
 */
export function darfSpeichern(werte, phase) {
  return phase !== 'speichert' && phase !== 'konflikt' && typeof werte?.grund === 'string' && werte.grund.trim() !== ''
}

/**
 * Körper für PUT …/akte (genau die fünf Felder des Servers).
 * @param werte - Formularstand
 * @param hash - beim Öffnen gelesener Hash
 * @returns { ziel, nicht_ziele, akzeptanzkriterien, grund, hash }
 */
export function baueAkteKoerper(werte, hash) {
  const gefuellt = (text) => typeof text === 'string' && text.trim() !== ''
  return {
    ziel: werte.ziel,
    nicht_ziele: werte.nichtZiele.filter(gefuellt),
    akzeptanzkriterien: werte.aks.filter((ak) => gefuellt(ak.text)).map((ak) => ({ id: ak.id, text: ak.text })),
    grund: werte.grund,
    hash,
  }
}

/** Grund einer Antwort als Text (Servertext, roh). @param koerper - geparster Körper @returns Text */
const grundVon = (koerper) => (typeof koerper?.grund === 'string' ? koerper.grund : '')

/** Verstöße einer Antwort (nur Strings). @param koerper - geparster Körper @returns Liste */
const verstoesseVon = (koerper) => (Array.isArray(koerper?.verstoesse) ? koerper.verstoesse.filter((v) => typeof v === 'string') : [])

/** Git-Block einer Antwort (Zeilen) oder null. @param koerper - geparster Körper @returns Zeilen oder null */
const gitVon = (koerper) => (Array.isArray(koerper?.git) && koerper.git.length > 0 && koerper.git.every((z) => typeof z === 'string') ? koerper.git : null)

/**
 * Deutet die Antwort von PUT …/akte.
 * @param status - HTTP-Status
 * @param koerper - geparster Körper ({} wenn keiner)
 * @returns { art: 'ok', git, geaendert } | { art: 'konflikt', grund } | { art: 'gesperrt', grund, workflowId } | { art: 'abgelehnt', status, grund, verstoesse } | { art: 'fehler', status, grund }
 */
export function deuteAkteAntwort(status, koerper) {
  if (status === 200 && koerper?.status === 'ok') return { art: 'ok', git: gitVon(koerper), geaendert: Array.isArray(koerper.geaendert) ? koerper.geaendert.filter((g) => typeof g === 'string') : [] }
  if (status === 409 && typeof koerper?.hash === 'string') return { art: 'konflikt', grund: grundVon(koerper) }
  if (status === 409 && koerper !== null && typeof koerper === 'object' && 'workflowId' in koerper) {
    return { art: 'gesperrt', grund: grundVon(koerper), workflowId: typeof koerper.workflowId === 'string' && koerper.workflowId !== '' ? koerper.workflowId : null }
  }
  if (status === 400 || status === 422) return { art: 'abgelehnt', status, grund: grundVon(koerper), verstoesse: verstoesseVon(koerper) }
  return { art: 'fehler', status, grund: grundVon(koerper) }
}

/**
 * Deutet die Antwort von POST /api/features.
 * @param status - HTTP-Status
 * @param koerper - geparster Körper ({} wenn keiner)
 * @returns { art: 'ok', id, git } | { art: 'abgelehnt', status, grund, verstoesse } | { art: 'fehler', status, grund }
 */
export function deuteFeatureAnlage(status, koerper) {
  if (status === 201 && typeof koerper?.id === 'string') return { art: 'ok', id: koerper.id, git: gitVon(koerper) }
  if (status === 400 || status === 409 || status === 422) return { art: 'abgelehnt', status, grund: grundVon(koerper), verstoesse: verstoesseVon(koerper) }
  return { art: 'fehler', status, grund: grundVon(koerper) }
}

/**
 * Git-Block (Text, nichts ausgeführt) oder der Satz, dass keiner bestimmbar ist.
 * @param git - Zeilen oder null
 * @returns HTML
 */
export function gitBlockHtml(git) {
  if (git === null) return `<p class="subtle">${tHtml('akteForm.gitOhne')}</p>`
  return `<p class="subtle">${tHtml('akteForm.gitHinweis')}</p>${renderBefehlsblock({ sprache: 'powershell', zeilen: git }, { echteWerte: true })}`
}

/**
 * Grund und Verstöße einer abgelehnten oder gescheiterten Anfrage, wörtlich.
 * @param deutung - Ergebnis von deuteAkteAntwort/deuteFeatureAnlage
 * @returns HTML
 */
function grundUndVerstoesse(deutung) {
  // Ohne HTTP-Status (Netzwerkfehler, status 0) steht nur der Grund da.
  const kopf = deutung.status > 0 ? `${deutung.status}${deutung.grund !== '' ? ': ' : ''}` : ''
  const grund = `<p><code>${escapeHtml(`${kopf}${deutung.grund}`)}</code></p>`
  const liste = Array.isArray(deutung.verstoesse) && deutung.verstoesse.length > 0 ? `<ul class="akte-verstoesse">${deutung.verstoesse.map((v) => `<li>${escapeHtml(v)}</li>`).join('')}</ul>` : ''
  return `${grund}${liste}`
}

/**
 * Meldung unter dem Formular je Phase (konflikt, gesperrt, abgelehnt, fehler).
 * @param stand - Formularzustand
 * @returns HTML ('' ohne Meldung)
 */
function meldungHtml(stand) {
  const m = stand.meldung
  if (m === null || m === undefined) return ''
  if (m.art === 'konflikt') {
    return `<div class="note amber" tabindex="-1" data-akte-fokus><strong>${tHtml('akteForm.konflikt.titel')}</strong><p>${tHtml('akteForm.konflikt.text')}</p><p><code>${escapeHtml(m.grund)}</code></p><button type="button" class="button primary" data-akte-aktion="neu-laden">${tHtml('akteForm.konflikt.neuLaden')}</button></div>`
  }
  if (m.art === 'gesperrt') {
    const link = m.workflowId !== null ? `<p><a class="text-link" href="#/workflows/${encodeURIComponent(m.workflowId)}">${tHtml('akteForm.gesperrt.link')} <span aria-hidden="true">→</span></a></p>` : ''
    const titel = m.workflowId !== null ? tHtml('akteForm.gesperrt.titel', {}, { id: `<code>${escapeHtml(m.workflowId)}</code>` }) : tHtml('akteForm.gesperrt.titelOhne')
    return `<div class="note amber" tabindex="-1" data-akte-fokus><strong>${titel}</strong><p><code>${escapeHtml(m.grund)}</code></p>${link}</div>`
  }
  const titel = m.art === 'abgelehnt' ? tHtml('akteForm.abgelehnt.titel') : tHtml('akteForm.fehler.titel')
  return `<div class="note red" tabindex="-1" data-akte-fokus><strong>${titel}</strong>${grundUndVerstoesse(m)}</div>`
}

/**
 * Eine Liste von Zeilenfeldern (Nicht-Ziele bzw. AK) mit „Entfernen“ je Zeile und „hinzufügen“.
 * @param art - 'nicht' | 'ak'
 * @param zeilen - [{ beschriftung, text }]
 * @param gesperrt - true während einer Anfrage
 * @returns HTML
 */
function zeilenHtml(art, zeilen, gesperrt) {
  const aus = gesperrt ? ' disabled' : ''
  const felder = zeilen
    .map(({ beschriftung, text }, index) => {
      const feldId = `akte-${art}-${index}`
      const entfernen = `<button type="button" class="button wb-ak-entfernen" data-akte-aktion="entfernen" data-akte-art="${art}" data-index="${index}" aria-label="${escapeHtml(t('akteForm.entfernenFeld', { feld: beschriftung }))}"${aus}>${tHtml('akteForm.entfernen')}</button>`
      return `<li class="wb-ak-zeile"><label for="${feldId}">${escapeHtml(beschriftung)}</label><textarea id="${feldId}" class="wb-ak-text" data-akte-feld="${art}" data-index="${index}" rows="${Math.min(6, Math.max(2, Math.ceil(text.length / 90)))}"${aus}>${escapeHtml(text)}</textarea>${entfernen}</li>`
    })
    .join('')
  const leer = zeilen.length === 0 ? `<p class="subtle">${tHtml(art === 'ak' ? 'akteForm.keineAk' : 'akteForm.keineNichtZiele')}</p>` : ''
  return `${leer}<ol class="wb-ak-liste">${felder}</ol><div class="action-row"><button type="button" class="button" data-akte-aktion="hinzu" data-akte-art="${art}"${aus}>${tHtml(art === 'ak' ? 'akteForm.akHinzu' : 'akteForm.nichtHinzu')}</button></div>`
}

/**
 * Das Formular „Akte bearbeiten“.
 * @param stand - { featureId, phase: 'offen' | 'speichert' | 'konflikt' | 'gesperrt' | 'abgelehnt' | 'fehler', werte, unvollstaendig: { grund } | null, meldung, akteLinkHtml }
 * @returns HTML
 */
export function akteFormularHtml(stand) {
  const { werte } = stand
  const gesperrt = stand.phase === 'speichert'
  const aus = gesperrt ? ' disabled' : ''
  const warnung =
    stand.unvollstaendig !== null && stand.unvollstaendig !== undefined
      ? `<div class="note amber akte-warnung" data-akte-warnung><strong>${tHtml('akteForm.unvollstaendig.titel')}</strong><p>${tHtml('akteForm.unvollstaendig.text')}</p><p><code>${escapeHtml(stand.unvollstaendig.grund ?? '')}</code></p><p>${stand.akteLinkHtml ?? ''}</p></div>`
      : ''
  const nicht = zeilenHtml('nicht', werte.nichtZiele.map((text, index) => ({ beschriftung: t('akteForm.nichtZielFeld', { nummer: String(index + 1) }), text })), gesperrt)
  const aks = zeilenHtml('ak', werte.aks.map((ak) => ({ beschriftung: ak.id, text: ak.text })), gesperrt)
  const speichernAus = darfSpeichern(werte, stand.phase) ? '' : ' disabled aria-disabled="true"'
  // Keine eigene Live-Region (genau eine im Dokument: die Persona) — der gesperrte Knopf und der Fokus auf der Meldung tragen.
  const laeuft = gesperrt ? `<p class="subtle">${tHtml('akteForm.speichert')}</p>` : ''
  return `<section class="eintrag-karte akte-formular" aria-labelledby="akte-formular-titel" data-phase="${escapeHtml(stand.phase)}" data-akte-id="${escapeHtml(stand.featureId)}">
      <div class="eintrag-karte-kopf"><h2 id="akte-formular-titel" tabindex="-1" data-akte-fokus-titel>${tHtml('akteForm.titel', { id: stand.featureId })}</h2><span class="subtle">${tHtml('akteForm.hinweis')}</span></div>
      ${warnung}
      <div class="akte-feld"><label class="akte-label" for="akte-ziel">${tHtml('akteForm.ziel')}</label><textarea id="akte-ziel" class="wb-ak-text" data-akte-feld="ziel" rows="${Math.min(10, Math.max(3, Math.ceil(werte.ziel.length / 90)))}"${aus}>${escapeHtml(werte.ziel)}</textarea></div>
      <fieldset class="akte-gruppe"><legend class="akte-label">${tHtml('akteForm.nichtZiele')}</legend>${nicht}</fieldset>
      <fieldset class="akte-gruppe"><legend class="akte-label">${tHtml('akteForm.aks')}</legend>${aks}</fieldset>
      <div class="akte-feld"><label class="akte-label" for="akte-grund">${tHtml('akteForm.grund')} <span aria-hidden="true">*</span></label><textarea id="akte-grund" class="wb-ak-text" data-akte-feld="grund" rows="2" maxlength="${AKTE_GRUND_MAX}" required aria-required="true" aria-describedby="akte-grund-hinweis"${aus}>${escapeHtml(werte.grund)}</textarea><p class="subtle" id="akte-grund-hinweis">${tHtml('akteForm.grundHinweis')}</p></div>
      ${laeuft}${meldungHtml(stand)}
      <div class="action-row"><button type="button" class="button${stand.phase === 'konflikt' ? '' : ' primary'}" data-akte-aktion="speichern"${speichernAus}>${tHtml('akteForm.speichern')}</button><button type="button" class="button" data-akte-aktion="abbrechen"${aus}>${tHtml('akteForm.abbrechen')}</button></div>
    </section>`
}

/**
 * Ergebnis nach dem Speichern (200): Hinweis „gespeichert, nicht committet“, Git-Block, „Schließen“.
 * @param stand - { featureId, git, geaendert } — geaendert sind die Abschnittsnamen aus der Antwort (Servertext, wörtlich)
 * @returns HTML
 */
export function akteGespeichertHtml(stand) {
  return `<section class="eintrag-karte akte-formular" aria-labelledby="akte-formular-titel" data-phase="gespeichert">
      <div class="eintrag-karte-kopf"><h2 id="akte-formular-titel" tabindex="-1" data-akte-fokus>${tHtml('akteForm.gespeichert.titel', { id: stand.featureId })}</h2></div>
      <p>${tHtml('akteForm.gespeichert.text')}</p>
      <p class="subtle">${tHtml('akteForm.gespeichert.geaendert')} ${stand.geaendert.length > 0 ? escapeHtml(stand.geaendert.join(', ')) : '–'}</p>
      ${gitBlockHtml(stand.git)}
      <div class="action-row"><button type="button" class="button" data-akte-aktion="schliessen">${tHtml('akteForm.schliessen')}</button></div>
    </section>`
}

/**
 * Ergebnis von „Als Feature anlegen“ im Coach (Erfolg mit Link und Git-Block, sonst Grund und Verstöße wörtlich).
 * @param deutung - Ergebnis von deuteFeatureAnlage
 * @returns HTML
 */
export function featureAnlageHtml(deutung) {
  if (deutung.art === 'ok') {
    const link = `<a class="text-link" href="#/workboard/${encodeURIComponent(deutung.id)}">${tHtml('chat.feature.oeffnen')} <span aria-hidden="true">→</span></a>`
    return `<div class="note chat-feature-ergebnis" data-feature-ergebnis="ok"><p><strong>${tHtml('chat.feature.angelegt', {}, { id: `<code>${escapeHtml(deutung.id)}</code>` })}</strong></p><p>${link}</p>${gitBlockHtml(deutung.git)}</div>`
  }
  return `<div class="note red chat-feature-ergebnis" data-feature-ergebnis="${deutung.art}"><strong>${tHtml('chat.feature.fehler')}</strong>${grundUndVerstoesse(deutung)}</div>`
}
