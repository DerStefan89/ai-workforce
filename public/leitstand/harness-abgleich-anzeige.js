/**
 * Datei: public/leitstand/harness-abgleich-anzeige.js
 *
 * Zweck: Anzeige des Harness-Abgleichs (F45 B1b-2, Beleg 12) und der Kurzliste benutzter Fähigkeiten (F-937, Teil
 * Abnahme). Rein: aus der Antwort von GET /api/workflows/<id>/harness-abgleich bzw. dem Feld abgleich von GET /api/harness
 * (Daten nach schemas/kontrollzustand-harness-abgleich-payload.schema.json, src/harness-abgleich) entsteht HTML —
 * die Zählzeile „Harness: x wirksam · y ersetzt · z bewusst nicht · n offen“, eine aufklappbare Tabelle (Art ·
 * Eintrag · Status · Beleg/Ersatz/Begründung, offen rot zuerst) und die Kurzliste (Skills, Subagenten, MCP-Server,
 * Hintergrund-Aufrufe).
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/workflow-abnahme.js (Abnahme, „Nachweise im Einzelnen“)
 * - public/leitstand/views/lauf-detail.js (Aufklappbereich „Fähigkeiten“)
 * - public/leitstand/views/harness-aufbau.js (Seite Workforce, ohne Laufbelege)
 * - public/leitstand/harness-abgleich-anzeige.test.mjs (node:test)
 *
 * Wichtig:
 * - Kein fetch, kein DOM; in Node importierbar. Die Oberfläche entscheidet nichts — Status und Zählung kommen vom
 *   Server (deterministisch aus der Zuordnung).
 * - Serverwerte (Namen, Pfade, Lauf-IDs, Begründungen, DoD-Texte, Gründe) bleiben roh und gehen durch escapeHtml;
 *   feste Wertemengen (Status, Art, Beleg-Art, Lage) erscheinen übersetzt, ein unbekannter Wert roh.
 * - Bestehende Bausteine: .ablauf-tabelle/.lauf-kopfdaten, .ablauf-status (ok/warten/fehler/neutral), details,
 *   .note.red/.amber, .harness-detail-daten — keine neuen Farben, kein neues CSS.
 */

import { t, tHtml } from './i18n.js'
import { escapeHtml } from './render.js'

/** Status mit Farbe der Statuszeile (.ablauf-status). */
const FARBE = { wirksam: 'ok', wirksam_ohne_beleg: 'warten', ersetzt_durch: 'neutral', bewusst_nicht: 'neutral', offen: 'fehler' }
const ARTEN = new Set(['dod', 'hook', 'agent', 'skill', 'command', 'quelle'])
const BELEG_ARTEN = new Set(['statisch', 'pruefschritt'])
const LAGEN = new Set(['gelaufen', 'nicht_gelaufen', 'nicht_im_ablauf'])
const OFFEN_GRUENDE = new Set(['nicht_in_zuordnung', 'quelle_fehlerhaft', 'zuordnung_fehlerhaft', 'beleg_negativ', 'ersatz_nicht_gelaufen', 'ersatz_fehlt', 'im_lauf_entfernt'])
const STATUS = new Set(Object.keys(FARBE))

/** Höchstlänge eines DoD-Texts in der Tabelle (der volle Text steht im title). */
const MAX_DOD_TEXT = 140

/**
 * Text eines Werts einer festen Menge; unbekannt → roh.
 * @param menge - bekannte Werte
 * @param praefix - i18n-Präfix
 * @param wert - Wert
 * @returns Text
 */
function wertText(menge, praefix, wert) {
  return menge.has(wert) ? t(`${praefix}.${wert}`) : String(wert ?? '')
}

/**
 * Zählung als Textteile (ohne „Harness:“). „ohne Beleg“ nur, wenn es solche Zeilen gibt.
 * @param zaehlung - { wirksam, wirksam_ohne_beleg, ersetzt_durch, bewusst_nicht, offen }
 * @returns Teile
 */
function zaehlTeile(zaehlung) {
  const z = (feld) => (Number.isInteger(zaehlung?.[feld]) ? zaehlung[feld] : 0)
  const teile = [
    t('harnessAbgleich.zahl.wirksam', { zahl: String(z('wirksam')) }),
    t('harnessAbgleich.zahl.ersetzt', { zahl: String(z('ersetzt_durch')) }),
    t('harnessAbgleich.zahl.bewusstNicht', { zahl: String(z('bewusst_nicht')) }),
    t('harnessAbgleich.zahl.offen', { zahl: String(z('offen')) }),
  ]
  if (z('wirksam_ohne_beleg') > 0) teile.push(t('harnessAbgleich.zahl.ohneBeleg', { zahl: String(z('wirksam_ohne_beleg')) }))
  return teile
}

/**
 * Kompakte Zählzeile „Harness: x wirksam · y ersetzt · z bewusst nicht · n offen“ als Text.
 * @param daten - Ergebnis des Abgleichs
 * @returns Text
 */
export function zaehlZeileText(daten) {
  return t('harnessAbgleich.zeile', { teile: zaehlTeile(daten?.zaehlung).join(' · ') })
}

/**
 * Anzeigename einer Zeile: DoD gekürzt (Text), sonst der Name.
 * @param e - Zeile
 * @returns HTML
 */
function eintragZelle(e) {
  if (e.art === 'dod' && typeof e.detail === 'string') {
    const kurz = e.detail.length > MAX_DOD_TEXT ? `${e.detail.slice(0, MAX_DOD_TEXT - 1)}…` : e.detail
    return `<span title="${escapeHtml(e.detail)}">${escapeHtml(kurz)}</span> <code class="subtle">${escapeHtml(e.name)}</code>`
  }
  const hook = e.art === 'hook' && typeof e.ereignis === 'string' ? ` <span class="subtle">${escapeHtml(e.ereignis)}${typeof e.matcher === 'string' ? ` · ${escapeHtml(e.matcher)}` : ''}</span>` : ''
  return `<code>${escapeHtml(e.name)}</code>${hook}`
}

/**
 * Beleg-Zelle einer wirksamen Zeile.
 * @param b - beleg
 * @returns HTML
 */
function belegText(b) {
  const art = escapeHtml(wertText(BELEG_ARTEN, 'harnessAbgleich.beleg', b.art))
  const teile = [art]
  if (b.statisch) teile.push(`<code>${escapeHtml(b.quelle ?? '')}</code>`)
  if (b.im_lauf === true && b.ergebnis) teile.push(tHtml('harnessAbgleich.beleg.ergebnis', { ergebnis: b.ergebnis }))
  if (b.im_lauf === false) {
    if (b.ergebnis) teile.push(tHtml('harnessAbgleich.beleg.ergebnis', { ergebnis: b.ergebnis }))
    else teile.push(tHtml('harnessAbgleich.beleg.fehltImLauf'))
  }
  if (b.im_lauf === null && !b.statisch) teile.push(tHtml('harnessAbgleich.beleg.lautZuordnung'))
  if (b.im_lauf !== null && b.lauf_id) teile.push(tHtml('harnessAbgleich.lauf', {}, { lauf: `<code>${escapeHtml(b.lauf_id)}</code>` }))
  return teile.join(' · ')
}

/**
 * Ersatz-Zelle einer ersetzten Zeile.
 * @param ersatz - ersatz
 * @returns HTML
 */
function ersatzText(ersatz) {
  const teile = [tHtml('harnessAbgleich.ersatz.schritt', {}, { rolle: `<code>${escapeHtml(ersatz.rolle ?? '')}</code>` })]
  if (ersatz.lage !== null && ersatz.lage !== undefined) teile.push(escapeHtml(wertText(LAGEN, 'harnessAbgleich.lage', ersatz.lage)))
  if (ersatz.lage === 'gelaufen' && ersatz.lauf_id) teile.push(tHtml('harnessAbgleich.lauf', {}, { lauf: `<code>${escapeHtml(ersatz.lauf_id)}</code>` }))
  return teile.join(' · ')
}

/**
 * Dritte Spalte: Beleg, Ersatz, Begründung oder Grund — je nach Status.
 * @param e - Zeile
 * @returns HTML
 */
function begruendungZelle(e) {
  const teile = []
  if (e.status === 'offen') teile.push(`<strong>${escapeHtml(wertText(OFFEN_GRUENDE, 'harnessAbgleich.offen', e.offen_grund))}</strong>`)
  if (e.beleg) teile.push(belegText(e.beleg))
  if (e.ersatz) teile.push(ersatzText(e.ersatz))
  // Den Grund nicht doppeln: ein negativer bzw. fehlender Prüfbeleg steht schon in der Beleg-Zelle, ein Fehler der
  // Zuordnung einmal im Hinweis über der Tabelle.
  const grundDoppelt = e.beleg?.im_lauf === false || e.offen_grund === 'zuordnung_fehlerhaft'
  if (e.grund && !grundDoppelt) teile.push(escapeHtml(e.grund))
  if (e.begruendung) teile.push(escapeHtml(e.begruendung))
  if (Number.isInteger(e.aufrufe) && e.aufrufe > 0) teile.push(tHtml('harnessAbgleich.aufrufeImLauf', { anzahl: e.aufrufe }))
  return teile.join('<br>')
}

/**
 * Eine Tabellenzeile.
 * @param e - Zeile des Ergebnisses
 * @returns HTML
 */
function zeileHtml(e) {
  const status = `<span class="ablauf-status ${FARBE[e.status] ?? 'neutral'}">${escapeHtml(wertText(STATUS, 'harnessAbgleich.status', e.status))}</span>`
  const spalte = (schluessel) => escapeHtml(t(`harnessAbgleich.spalte.${schluessel}`))
  return `<tr data-status="${escapeHtml(String(e.status ?? ''))}"><td data-spalte="${spalte('art')}">${escapeHtml(wertText(ARTEN, 'harnessAbgleich.art', e.art))}</td><td class="harness-abgleich-eintrag" data-spalte="${spalte('eintrag')}">${eintragZelle(e)}</td><td data-spalte="${spalte('status')}">${status}</td><td data-spalte="${spalte('beleg')}">${begruendungZelle(e)}</td></tr>`
}

/**
 * Harness-Abgleich als Block: Zählzeile, bei offenen Einträgen ein roter Hinweis, die Tabelle aufklappbar.
 * @param daten - Ergebnis des Abgleichs (oder null/undefined)
 * @param optionen - { offen: boolean (Tabelle aufgeklappt), quelle: 'artefakt' | 'live' | 'zuordnung' }
 * @returns HTML
 */
export function renderHarnessAbgleich(daten, { offen = false, quelle = 'artefakt' } = {}) {
  const eintraege = Array.isArray(daten?.eintraege) ? daten.eintraege : []
  if (daten === null || daten === undefined) return `<p class="subtle">${tHtml('harnessAbgleich.keineDaten')}</p>`
  const anzahlOffen = Number.isInteger(daten.zaehlung?.offen) ? daten.zaehlung.offen : 0
  const anzahlOhneBeleg = Number.isInteger(daten.zaehlung?.wirksam_ohne_beleg) ? daten.zaehlung.wirksam_ohne_beleg : 0
  const zuordnungFehler = eintraege.find((e) => e.offen_grund === 'zuordnung_fehlerhaft')?.grund
  const hinweis = [
    anzahlOffen > 0 ? `<div class="note red">${tHtml('harnessAbgleich.offenHinweis', { anzahl: anzahlOffen })}${zuordnungFehler ? `<br>${escapeHtml(zuordnungFehler)}` : ''}</div>` : '',
    anzahlOhneBeleg > 0 ? `<div class="note amber">${tHtml(daten.bestanden === null || daten.bestanden === undefined ? 'harnessAbgleich.ohneBelegHinweisOhneLauf' : 'harnessAbgleich.ohneBelegHinweis', { anzahl: anzahlOhneBeleg })}</div>` : '',
  ].join('')
  // Auf der Seite Workforce sagt die Einleitung schon „laut Zuordnung, ohne Laufbelege“ — dort kein Quellentext.
  const quellText = quelle === 'live' ? tHtml('harnessAbgleich.quelle.live') : quelle === 'zuordnung' ? '' : tHtml('harnessAbgleich.quelle.artefakt')
  const bestanden = daten.bestanden === true || daten.bestanden === false ? ` <span class="ablauf-status ${daten.bestanden ? 'ok' : 'fehler'}">${tHtml(daten.bestanden ? 'harnessAbgleich.bestanden.ja' : 'harnessAbgleich.bestanden.nein')}</span>` : ''
  const dateien = Array.isArray(daten.geaenderte_harness_dateien) ? daten.geaenderte_harness_dateien : []
  const geaendert = dateien.length > 0 ? `<div class="note amber">${tHtml('harnessAbgleich.geaendert', {}, { dateien: dateien.map((d) => `<code>${escapeHtml(d)}</code>`).join(', ') })}</div>` : ''
  const tabelle =
    eintraege.length === 0
      ? `<p class="leer">${tHtml('harnessAbgleich.leer')}</p>`
      : `<div class="ablauf-tabelle" role="region" tabindex="0" aria-label="${tHtml('harnessAbgleich.tabelle')}"><table class="lauf-kopfdaten harness-abgleich-tabelle"><caption class="sr-only">${tHtml('harnessAbgleich.tabelle')}</caption><thead><tr><th scope="col">${tHtml('harnessAbgleich.spalte.art')}</th><th scope="col">${tHtml('harnessAbgleich.spalte.eintrag')}</th><th scope="col">${tHtml('harnessAbgleich.spalte.status')}</th><th scope="col">${tHtml('harnessAbgleich.spalte.beleg')}</th></tr></thead><tbody>${eintraege.map(zeileHtml).join('')}</tbody></table></div>`
  return `<div class="harness-abgleich">
    <p class="harness-abgleich-zeile"><strong>${escapeHtml(zaehlZeileText(daten))}</strong>${bestanden}${quellText === '' ? '' : ` <span class="subtle">${quellText}</span>`}</p>
    ${hinweis}${geaendert}
    <details class="harness-abgleich-details"${offen ? ' open' : ''}><summary>${tHtml('harnessAbgleich.aufklappen', { anzahl: eintraege.length })}</summary>${tabelle}</details>
  </div>`
}

/**
 * Fehler- bzw. Ladezustand des Blocks.
 * @param zustand - 'laedt' | { fehler: string }
 * @returns HTML
 */
export function renderHarnessAbgleichZustand(zustand) {
  if (zustand === 'laedt') return `<p class="subtle">${tHtml('harnessAbgleich.laedt')}</p>`
  return `<div class="note red">${tHtml('harnessAbgleich.fehler', { grund: String(zustand?.fehler ?? '') })}</div>`
}

/**
 * Liste { name, anzahl } als Text „a ×2, b“.
 * @param liste - Einträge
 * @returns HTML
 */
function nameListe(liste) {
  if (!Array.isArray(liste) || liste.length === 0) return `<span class="subtle">${tHtml('harnessAbgleich.kurzliste.keine')}</span>`
  return liste.map((e) => `<code>${escapeHtml(e?.name ?? '')}</code>${Number.isInteger(e?.anzahl) && e.anzahl > 1 ? ` ×${e.anzahl}` : ''}`).join(', ')
}

/**
 * F45 F-2a: Kurzzeile „Fähigkeiten im Lauf“ aus faehigkeiten.im_lauf (Zählung von faehigkeiten_im_lauf der Laufakte);
 * ohne Feld (Lauf ohne Fähigkeiten-Kontext) keine Zeile.
 * @param imLauf - { aktiv, benutzt, aus, fremde } oder undefined
 * @returns HTML oder ''
 */
function imLaufZeile(imLauf) {
  if (imLauf === null || typeof imLauf !== 'object') return ''
  const zahl = (wert) => (Number.isInteger(wert) ? wert : 0)
  return `<div><dt>${tHtml('harnessAbgleich.kurzliste.imLauf')}</dt><dd>${tHtml('lauf.faehigkeitenImLauf.zusammenfassung', { aktiv: zahl(imLauf.aktiv), benutzt: zahl(imLauf.benutzt), aus: zahl(imLauf.aus), fremde: zahl(imLauf.fremde) })}</dd></div>`
}

/**
 * Kurzliste der benutzten Fähigkeiten des Ausführungslaufs (F-937, Teil Abnahme).
 * @param faehigkeiten - Kurzliste oder null (keine Beobachtung)
 * @param ebene - Überschriftenebene (Standard 4)
 * @returns HTML
 */
export function renderFaehigkeitenKurzliste(faehigkeiten, ebene = 4) {
  const titel = `<h${ebene}>${tHtml('harnessAbgleich.kurzliste.titel')}</h${ebene}>`
  if (faehigkeiten === null || faehigkeiten === undefined) return `${titel}<p class="subtle">${tHtml('harnessAbgleich.kurzliste.ohneBeobachtung')}</p>`
  const hintergrund = Number.isInteger(faehigkeiten.hintergrund) ? escapeHtml(String(faehigkeiten.hintergrund)) : `<span class="unbekannt">${tHtml('harnessAbgleich.kurzliste.nichtErfasst')}</span>`
  return `${titel}<dl class="harness-detail-daten harness-kurzliste">
    <div><dt>${tHtml('harnessAbgleich.kurzliste.skills')}</dt><dd>${nameListe(faehigkeiten.skills)}</dd></div>
    <div><dt>${tHtml('harnessAbgleich.kurzliste.subagenten')}</dt><dd>${nameListe(faehigkeiten.subagenten)}</dd></div>
    <div><dt>${tHtml('harnessAbgleich.kurzliste.mcp')}</dt><dd>${nameListe(faehigkeiten.mcp_server)}</dd></div>
    <div><dt>${tHtml('harnessAbgleich.kurzliste.hintergrund')}</dt><dd>${hintergrund}</dd></div>${imLaufZeile(faehigkeiten.im_lauf)}
  </dl><p class="subtle harness-kurzliste-lauf">${tHtml('harnessAbgleich.lauf', {}, { lauf: `<code>${escapeHtml(faehigkeiten.lauf_id ?? '')}</code>` })}</p>`
}

/**
 * Block „Harness im Lauf“ für Abnahme und Lauf-Detail: Überschrift, Abgleich und Kurzliste aus der Antwort von
 * GET /api/workflows/<id>/harness-abgleich — oder Lade-/Fehlerzustand.
 * @param zustand - undefined (lädt), { fehler: string } oder die Antwort { status: 'ok', quelle, daten }
 * @param optionen - { ebene: Überschriftenebene (Standard 3, Kurzliste eine tiefer), kurzliste: mit Kurzliste der
 *   Fähigkeiten (Standard true), aufklappen: Tabelle bei offenen Einträgen oder ohne Beleg aufgeklappt (Standard true;
 *   im Vorab-Block false — dort tragen Zählzeile und Hinweis die Entscheidung) }
 * @returns HTML
 */
export function renderHarnessImLauf(zustand, { ebene = 3, kurzliste = true, aufklappen = true } = {}) {
  const titel = `<h${ebene}>${tHtml('harnessAbgleich.titel')}</h${ebene}>`
  if (zustand === undefined || zustand === null) return `<section class="harness-im-lauf">${titel}${renderHarnessAbgleichZustand('laedt')}</section>`
  if (typeof zustand.fehler === 'string') return `<section class="harness-im-lauf">${titel}${renderHarnessAbgleichZustand(zustand)}</section>`
  const z = zustand.daten?.zaehlung
  const auffaellig = aufklappen && ((z?.offen ?? 0) > 0 || (z?.wirksam_ohne_beleg ?? 0) > 0)
  const faehigkeiten = zustand.daten?.faehigkeiten ?? null
  const mitKurzliste = kurzliste === true
  return `<section class="harness-im-lauf">${titel}${renderHarnessAbgleich(zustand.daten, { offen: auffaellig, quelle: zustand.quelle === 'live' ? 'live' : 'artefakt' })}${mitKurzliste ? renderFaehigkeitenKurzliste(faehigkeiten, ebene + 1) : ''}</section>`
}
