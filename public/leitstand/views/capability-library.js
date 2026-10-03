/**
 * Datei: public/leitstand/views/capability-library.js
 *
 * Zweck: Register „Capability Library“, Unterbereich Katalog, der Workforce `#/capabilities` (F46 D6,
 * docs/design/abgleich-f46.md §4.14, Bild 01-workforce-harness--Library): Kennzahlen (im Katalog, aktiv,
 * Freigabe offen), Suche, Filter-Chips (Alle · Skills · Agents · Worker · Extern; Alle · Aktiv · Nicht aktiv ·
 * Freigabe offen), Tabelle aus GET /api/ressourcen und ein Detail je Fähigkeit. Im Detail einer Fähigkeit mit
 * offener Freigabe, die der F36-Weg installieren kann (Feld installierbar der Projektion, dieselbe Regel wie der
 * Server), steht „Prüfen & freigeben“ — der bestehende F36-Weg (empfehlung-installation.js: vorbereiten →
 * Bestätigungsblock → installieren), unverändert; sonst der Grund. Nach Chip, Zeile und „Alle anzeigen“ kehrt der
 * Fokus auf den neu gezeichneten Knopf zurück; Suche und Filter schalten im Detail nur den Hinweis „ausgeblendet“
 * um (kein Neuzeichnen, ein laufender F36-Ablauf behält seinen Platz). Dazu der Hinweis „liegt im Harness, steht
 * nicht im Katalog“, nur wenn der Abgleich `.claude/agents/` gegen den Katalog ihn ergibt.
 *
 * Löst die Kacheln aus F44 WS-7a ab; deren Detailfelder (ID, Phasen, Grund, Fehlt für Einsatz) stehen jetzt im
 * Detail. „Aktiv“ = freigegeben und verfügbar (faehigkeiten-anzeige.js istAktiv) — nicht „gerade im Lauf“.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/capabilities.js (initCapabilityLibrary, renderCapabilityLibrary,
 *   zeigeCapabilityLibraryFehler, aktualisiereLibraryHinweis, setzeCapabilityLibraryZurueck)
 *
 * Wichtig:
 * - Einziger Schreibweg ist der F36-Installationsweg mit Bestätigung (Regel 2 des Abgleichs); kein Schalter
 *   „aktiv“ in der Tabelle — der Status ist eine Anzeige.
 * - Serverwerte (IDs, Namen, Beschreibungen, Pfade, Gründe) gehen roh durch escapeHtml, nie durch t().
 * - Kein Netzabruf für Suche und Filter; kein Poll.
 */

import { bindeEmpfehlungInstallation } from '../empfehlung-installation.js'
import { installationsAnzeigeFuer, installationsMeldungFuer } from '../empfehlung-anzeige.js'
import { filtereWerkzeuge, istAktiv, ortImHarness, WERKZEUG_TYPEN, zaehleLibrary } from '../faehigkeiten-anzeige.js'
import { AGENTS_ORDNER, agentsOhneKatalog, harnessOrtZuPfad } from '../harness-anzeige.js'
import { formatiereZahl, t, tHtml } from '../i18n.js'
import { kommtBadge } from '../kommt.js'
import { escapeHtml } from '../render.js'

/** Zeilen, die ohne „Alle anzeigen“ sichtbar sind (Bild 01-Library: „12 von 42 gezeigt“). */
export const ZEILEN_VORAB = 12

/** Typ-Chips in der Reihenfolge des Bildes ('' = alle). */
const TYP_CHIPS = Object.freeze(['', 'skill', 'agent', 'worker', 'extern'])

/** Status-Chips: '' alle, aktiv, nicht aktiv, Freigabe offen (bleibt als Filter erreichbar, Regel 7). */
const STATUS_CHIPS = Object.freeze(['', 'aktiv', 'nicht_aktiv', 'offen'])

/** Zuletzt geladene Antwort von GET /api/ressourcen oder null. */
let letzteLibrary = null

/** Zuletzt geladener Harness (für Abgleich und „Im Harness-Aufbau zeigen“) oder null. */
let harnessFuerAbgleich = null

/** Gewählte Filter. */
const filter = { typ: '', status: '' }

/** id der gewählten Fähigkeit oder null. */
let auswahlId = null

/** true, wenn „Alle anzeigen“ gedrückt wurde. */
let alleZeigen = false

/** Rückruf „Im Harness-Aufbau zeigen“ (setzt capabilities.js). */
let zeigeImHarness = () => {}

/**
 * Übersetzter Typname; ein unbekannter Typ bleibt roh.
 * @param typ - eintrag.typ
 * @returns Text
 */
function typName(typ) {
  return WERKZEUG_TYPEN.includes(typ) ? t(`werkstatt.typ.${typ}`) : String(typ ?? '')
}

/**
 * Status einer Fähigkeit als Chip (Farben aus .ablauf-status: aktiv mint, Freigabe offen bernstein,
 * freigegeben aber nicht verfügbar gedämpft).
 * @param eintrag - Katalogeintrag
 * @returns HTML
 */
function statusChip(eintrag) {
  if (istAktiv(eintrag)) return `<span class="ablauf-status">${tHtml('library.status.aktiv')}</span>`
  if (eintrag.freigabe === 'OFFEN') return `<span class="ablauf-status warten">${tHtml('werkstatt.freigabe.offen')}</span>`
  return `<span class="ablauf-status neutral">${tHtml('library.status.freigegebenNichtVerfuegbar')}</span>`
}

/**
 * Ort im Harness als HTML (Pfad roh, Startvorlage übersetzt, sonst „—“).
 * @param eintrag - Katalogeintrag
 * @returns HTML
 */
function ortHtml(eintrag) {
  const ort = ortImHarness(eintrag)
  if (ort === null) return '<span class="unbekannt">—</span>'
  if (ort.art === 'startvorlage') return `<span class="library-ort">${tHtml('library.ort.startvorlage')}</span>`
  return `<code class="library-ort">${escapeHtml(ort.pfad)}</code>`
}

/** Liest die Suche. @returns Freitext */
function suchtext() {
  return document.getElementById('capabilities-suche').value
}

/**
 * Einträge nach Suche und Filter.
 * @returns Treffer in Serverreihenfolge
 */
function treffer() {
  const eintraege = Array.isArray(letzteLibrary?.eintraege) ? letzteLibrary.eintraege : []
  const status = filter.status === 'offen' ? { freigabe: 'offen' } : { aktiv: filter.status }
  return filtereWerkzeuge(eintraege, { suche: suchtext(), typ: filter.typ, ...status })
}

/** Kennzahlen als drei Karten (Bild 01-Library). @param zahlen - zaehleLibrary */
function renderKennzahlen(zahlen) {
  const karte = (art, wert, zusatz = '') => `<div class="library-kennzahl${zusatz}" data-kennzahl="${art}"><span class="library-kennzahl-label">${tHtml(`library.kennzahl.${art}`)}</span><strong>${escapeHtml(formatiereZahl(wert))}</strong></div>`
  document.getElementById('capabilities-kennzahlen').innerHTML = karte('katalog', zahlen.katalog) + karte('aktiv', zahlen.aktiv, ' aktiv') + karte('offen', zahlen.offen)
}

/** Filter-Chips mit Anzahl je Typ bzw. Status. @param zahlen - zaehleLibrary */
function renderChips(zahlen) {
  const chip = (attribut, wert, gewaehlt, text) => `<button type="button" class="library-chip" data-${attribut}="${wert}" aria-pressed="${gewaehlt}">${escapeHtml(text)}</button>`
  const typAnzahl = (typ) => (typ === '' ? zahlen.katalog : zahlen.jeTyp[typ])
  document.getElementById('library-filter-typ').innerHTML = TYP_CHIPS.map((typ) => chip('library-typ', typ, filter.typ === typ, t('library.chip.mitAnzahl', { name: t(typ === '' ? 'library.chip.alle' : `library.chip.typ.${typ}`), zahl: formatiereZahl(typAnzahl(typ)) }))).join('')
  document.getElementById('library-filter-status').innerHTML = STATUS_CHIPS.map((wert) => chip('library-status', wert, filter.status === wert, t(wert === '' ? 'library.chip.alle' : `library.chip.status.${wert}`))).join('')
}

/**
 * Eine Tabellenzeile; der Name ist der Knopf zur Auswahl (aria-pressed), die Zeile ist zusätzlich klickbar.
 * @param eintrag - Katalogeintrag
 * @returns HTML
 */
function zeileHtml(eintrag) {
  const name = typeof eintrag.name === 'string' && eintrag.name !== '' ? eintrag.name : eintrag.id
  const gewaehlt = eintrag.id === auswahlId
  const beschreibung = typeof eintrag.beschreibung === 'string' && eintrag.beschreibung !== '' ? `<span class="library-beschreibung">${escapeHtml(eintrag.beschreibung)}</span>` : ''
  return `<tr class="library-zeile" data-library-id="${escapeHtml(eintrag.id)}"${gewaehlt ? ' data-gewaehlt="true"' : ''}>
    <td data-spalte="${escapeHtml(t('library.spalte.faehigkeit'))}"><button type="button" class="library-name" data-library-id="${escapeHtml(eintrag.id)}" aria-pressed="${gewaehlt}" aria-controls="library-detail">${escapeHtml(eintrag.id)}</button>${name !== eintrag.id ? `<span class="library-anzeigename">${escapeHtml(name)}</span>` : ''}${beschreibung}</td>
    <td data-spalte="${escapeHtml(t('library.spalte.typ'))}">${escapeHtml(typName(eintrag.typ))}</td>
    <td data-spalte="${escapeHtml(t('library.spalte.ort'))}">${ortHtml(eintrag)}</td>
    <td data-spalte="${escapeHtml(t('library.spalte.status'))}">${statusChip(eintrag)}</td>
  </tr>`
}

/** Tabelle nach Suche und Filter, mit Fußzeile „n von m gezeigt“ und eigenem Leerzustand. */
function renderTabelle() {
  const container = document.getElementById('capabilities-library')
  if (letzteLibrary === null) return
  const alle = Array.isArray(letzteLibrary.eintraege) ? letzteLibrary.eintraege : []
  if (alle.length === 0) {
    container.innerHTML = `<p class="leer">${tHtml('werkstatt.leer.katalog')}</p>`
    return
  }
  const liste = treffer()
  if (liste.length === 0) {
    container.innerHTML = `<p class="leer">${tHtml('werkstatt.leer.treffer')}</p>`
    return
  }
  const sichtbar = alleZeigen ? liste : liste.slice(0, ZEILEN_VORAB)
  const mehr = sichtbar.length < liste.length ? ` · <button type="button" class="werkstatt-textlink library-alle">${tHtml('library.alleAnzeigen')}</button>` : ''
  container.innerHTML = `<div class="library-tabelle-rahmen"><table class="library-tabelle">
    <caption class="sr-only">${tHtml('library.tabelle')}</caption>
    <thead><tr><th scope="col">${tHtml('library.spalte.faehigkeit')}</th><th scope="col">${tHtml('library.spalte.typ')}</th><th scope="col">${tHtml('library.spalte.ort')}</th><th scope="col">${tHtml('library.spalte.status')}</th></tr></thead>
    <tbody>${sichtbar.map(zeileHtml).join('')}</tbody>
  </table>
  <p class="library-fuss">${tHtml('library.gezeigt', { anzahl: liste.length, zahl: formatiereZahl(sichtbar.length), gesamt: formatiereZahl(liste.length) })}${mehr}</p></div>`
}

/**
 * Quelle eines Eintrags: Link nur für http(s) mit rel="noopener noreferrer", sonst Text bzw. „—“.
 * @param eintrag - Katalogeintrag
 * @returns HTML
 */
function quelleHtml(eintrag) {
  const url = eintrag.herkunft?.url
  if (typeof url !== 'string' || url === '') return '<span class="unbekannt">—</span>'
  if (!/^https?:\/\//.test(url)) return escapeHtml(url)
  return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`
}

/**
 * „Fehlt für Einsatz“ (F36 WS-1) — leer heißt einsatzbereit.
 * @param fehlt - eintrag.fehltFuerEinsatz
 * @returns HTML
 */
function fehltHtml(fehlt) {
  if (!Array.isArray(fehlt) || fehlt.length === 0) return tHtml('werkstatt.detail.nichts')
  return fehlt.map((f) => `<span class="werkzeug-fehlt">${escapeHtml(f)}</span>`).join('')
}

/**
 * Steht die Fähigkeit nach Suche und Filter in der Liste?
 * @param id - Katalog-id
 * @returns true, wenn sichtbar
 */
function istSichtbar(id) {
  return treffer().some((e) => e.id === id)
}

/**
 * Schaltet nur den Hinweis „durch Suche oder Filter ausgeblendet“ im Detail um — ohne das Detail neu zu zeichnen,
 * damit ein laufender F36-Ablauf (empfehlung-installation.js hält seinen Platz fest) seinen Platz behält.
 */
function aktualisiereAusgeblendet() {
  const hinweis = document.getElementById('library-detail').querySelector('.library-ausgeblendet')
  if (hinweis !== null && auswahlId !== null) hinweis.hidden = istSichtbar(auswahlId)
}

/** Rendert das Detail der gewählten Fähigkeit (oder den Leerzustand). */
function renderDetail() {
  const container = document.getElementById('library-detail')
  const eintrag = (Array.isArray(letzteLibrary?.eintraege) ? letzteLibrary.eintraege : []).find((e) => e?.id === auswahlId)
  if (eintrag === undefined) {
    // Ohne Titel trägt der Bereich einen eigenen Namen (aria-labelledby zeigte sonst ins Leere).
    container.removeAttribute?.('aria-labelledby')
    container.setAttribute('aria-label', t('library.detail.bereich'))
    container.innerHTML = `<p class="leer">${tHtml('library.detailLeer')}</p>`
    return
  }
  container.removeAttribute?.('aria-label')
  container.setAttribute('aria-labelledby', 'library-detail-titel')
  const ausgeblendet = `<p class="hinweis library-ausgeblendet"${istSichtbar(eintrag.id) ? ' hidden' : ''}>${tHtml('library.detail.ausgeblendet')}</p>`
  const aktiv = istAktiv(eintrag)
  const typ = [typName(eintrag.typ), typeof eintrag.unterart === 'string' ? eintrag.unterart : null].filter(Boolean).join(' · ')
  const phasen = Array.isArray(eintrag.phasen) && eintrag.phasen.length > 0 ? eintrag.phasen.map(escapeHtml).join(', ') : '—'
  const zeile = (schluessel, wertHtml) => `<dt>${tHtml(schluessel)}</dt><dd>${wertHtml}</dd>`
  const ort = ortImHarness(eintrag)
  const harnessOrt = ort?.art === 'pfad' ? harnessOrtZuPfad(harnessFuerAbgleich, ort.pfad) : null
  const zumHarness = harnessOrt === null ? '' : `<button type="button" class="werkstatt-textlink library-zum-harness" data-harness-ort="${escapeHtml(harnessOrt)}">${tHtml('library.imHarnessZeigen')}</button>`
  const id = escapeHtml(eintrag.id)
  // F36-Weg unverändert: derselbe Knopf (data-installation-aktion="vorbereiten") und derselbe Platz für den
  // Bestätigungsblock wie in der Empfehlung — nur, wo der Weg auch durchgeht (installierbar, dieselbe Regel
  // wie der Server, src/capabilities-ansicht); sonst der Grund statt eines Knopfs, der sicher abgelehnt würde.
  const nichtInstallierbar =
    eintrag.freigabe === 'OFFEN' && eintrag.installierbar !== true
      ? `<p class="hinweis library-nicht-installierbar">${tHtml('library.freigabe.nichtInstallierbar', { grund: typeof eintrag.installationsGrund === 'string' ? eintrag.installationsGrund : '—' })}</p>`
      : ''
  const freigeben =
    eintrag.freigabe === 'OFFEN' && eintrag.installierbar === true
      ? `<div class="library-freigabe">
        <p>${tHtml('library.freigabe.text')}</p>
        <button type="button" class="button primary" data-installation-aktion="vorbereiten" data-ressource-id="${id}">${tHtml('library.freigabe.knopf')}</button>
        <div class="empfehlung-installation" data-installation-fuer="${id}">${installationsAnzeigeFuer(eintrag.id)}</div>
      </div>`
      : ''
  container.innerHTML = `${ausgeblendet}<div class="library-detail-eyebrow${aktiv ? ' aktiv' : ''}">${tHtml(aktiv ? 'library.detail.aktiv' : 'library.detail.nichtAktiv')}</div>
    <h3 id="library-detail-titel" class="library-detail-name">${id}</h3>
    ${typeof eintrag.beschreibung === 'string' && eintrag.beschreibung !== '' ? `<p class="library-detail-text">${escapeHtml(eintrag.beschreibung)}</p>` : ''}
    ${installationsMeldungFuer(eintrag.id)}
    <dl class="library-detail-daten">
      ${zeile('library.detail.typ', escapeHtml(typ))}
      ${zeile('library.detail.genutztVon', kommtBadge())}
      ${zeile('library.spalte.ort', ortHtml(eintrag))}
      ${zeile('library.detail.quelle', quelleHtml(eintrag))}
      ${zeile('werkstatt.detail.phasen', phasen)}
      ${zeile('werkstatt.detail.grund', typeof eintrag.anzeigeGrund === 'string' && eintrag.anzeigeGrund !== '' ? escapeHtml(eintrag.anzeigeGrund) : '—')}
      ${zeile('werkstatt.detail.fehlt', fehltHtml(eintrag.fehltFuerEinsatz))}
    </dl>
    ${freigeben}${nichtInstallierbar}
    ${zumHarness}`
}

/** Hinweis „liegt im Harness, steht nicht im Katalog“ — nur aus dem Abgleich, sonst leer. */
function renderHinweis() {
  const ziel = document.getElementById('library-hinweis')
  const namen = letzteLibrary === null ? [] : agentsOhneKatalog(harnessFuerAbgleich, letzteLibrary.eintraege)
  ziel.hidden = namen.length === 0
  const ort = `<code>${escapeHtml(`${AGENTS_ORDNER}/`)}</code>`
  const liste = namen.map((name) => `<strong>${escapeHtml(name)}</strong>`).join(', ')
  // Ein Name: der Satz aus dem Bild; mehrere: ein Satz mit Anzahl und Liste (oben nur wenige Sätze, Leitprinzip).
  ziel.innerHTML =
    namen.length === 1 ? `<p>${tHtml('library.hinweis.agentFehlt', {}, { name: liste, ort })}</p>` : namen.length > 1 ? `<p>${tHtml('library.hinweis.agentsFehlen', { anzahl: namen.length }, { namen: liste, ort })}</p>` : ''
}

/**
 * Antwort von GET /api/ressourcen darstellen.
 * @param ansicht - LibraryAnsicht
 */
export function renderCapabilityLibrary(ansicht) {
  letzteLibrary = ansicht
  const zahlen = zaehleLibrary(ansicht.eintraege)
  renderKennzahlen(zahlen)
  renderChips(zahlen)
  renderTabelle()
  renderDetail()
  renderHinweis()
  document.getElementById('capabilities-assessed').innerHTML = `<span class="badge stale">ASSESSED</span> ${escapeHtml(ansicht.assessedHinweis ?? '')}`
  document.getElementById('capabilities-startvorlage').innerHTML = tHtml('werkstatt.startvorlage', {}, { pfad: `<code>${escapeHtml(ansicht.startvorlagePfad ?? '')}</code>` })
}

/**
 * Fehlerzustand: Fehler in der Tabelle, keine Werte des letzten Ladens daneben.
 * @param grund - Fehlertext
 */
export function zeigeCapabilityLibraryFehler(grund) {
  letzteLibrary = null
  for (const id of ['capabilities-kennzahlen', 'library-filter-typ', 'library-filter-status', 'capabilities-assessed', 'capabilities-startvorlage', 'library-detail', 'library-hinweis']) document.getElementById(id).innerHTML = ''
  document.getElementById('library-hinweis').hidden = true
  document.getElementById('capabilities-library').innerHTML = `<div class="note red">${tHtml('werkstatt.ladeFehler', { grund })}</div>`
}

/** Ladezustand: keine alten Zeilen, solange neu geladen wird. */
export function zeigeCapabilityLibraryLaedt() {
  letzteLibrary = null
  // Kennzahlen, Chips, Hinweis und Detail des letzten Stands verschwinden mit — sonst blieben sie (etwa nach
  // einem Projektwechsel) samt „Prüfen & freigeben“ bedienbar, während schon das neue Projekt lädt.
  for (const id of ['capabilities-kennzahlen', 'library-filter-typ', 'library-filter-status', 'library-detail', 'library-hinweis']) document.getElementById(id).innerHTML = ''
  document.getElementById('library-hinweis').hidden = true
  document.getElementById('capabilities-library').innerHTML = `<p class="leer">${tHtml('werkstatt.laedt')}</p>`
}

/**
 * Neuer Harness für Abgleich und „Im Harness-Aufbau zeigen“ (oder null bei Fehler).
 * @param harness - Antwort von GET /api/harness oder null
 */
export function aktualisiereLibraryHinweis(harness) {
  harnessFuerAbgleich = harness
  if (letzteLibrary === null) return
  renderHinweis()
  renderDetail()
}

/** Projektwechsel: Auswahl und „Alle anzeigen“ verwerfen. */
export function setzeCapabilityLibraryZurueck() {
  auswahlId = null
  alleZeigen = false
  harnessFuerAbgleich = null
}

/**
 * Setzt den Fokus nach einem Neuzeichnen auf das Element mit diesem Selektor zurück (der fokussierte Knopf
 * wurde per innerHTML ersetzt; ohne das fiele der Fokus auf body).
 * @param wurzel - Container
 * @param selektor - CSS-Selektor des neuen Elements
 */
function fokussiere(wurzel, selektor) {
  wurzel.querySelector(selektor)?.focus()
}

/**
 * Wert als Attributwert in einem Selektor (CSS.escape, Rückfall für Umgebungen ohne CSS).
 * @param wert - Rohwert
 * @returns escapter Wert
 */
function selektorWert(wert) {
  return typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(wert) : String(wert).replace(/["\\]/g, '\\$&')
}

/**
 * Bedienung: Suche, Chips, Zeilenwahl, „Alle anzeigen“, „Im Harness-Aufbau zeigen“, F36-Weg im Detail.
 * @param optionen - { neuLaden: () => Promise, zeigeImHarnessAufbau: (pfad) => void }
 */
export function initCapabilityLibrary({ neuLaden, zeigeImHarnessAufbau }) {
  zeigeImHarness = zeigeImHarnessAufbau
  const suche = document.getElementById('capabilities-suche')
  suche.placeholder = t('werkstatt.suche.platzhalter')
  suche.addEventListener('input', () => {
    renderTabelle()
    aktualisiereAusgeblendet()
  })
  document.getElementById('library-filter-typ').addEventListener('click', (ereignis) => {
    const chip = ereignis.target instanceof Element ? ereignis.target.closest('[data-library-typ]') : null
    if (chip === null || letzteLibrary === null) return
    filter.typ = chip.dataset.libraryTyp
    renderChips(zaehleLibrary(letzteLibrary.eintraege))
    renderTabelle()
    aktualisiereAusgeblendet()
    fokussiere(document.getElementById('library-filter-typ'), `[data-library-typ="${selektorWert(filter.typ)}"]`)
  })
  document.getElementById('library-filter-status').addEventListener('click', (ereignis) => {
    const chip = ereignis.target instanceof Element ? ereignis.target.closest('[data-library-status]') : null
    if (chip === null || letzteLibrary === null) return
    filter.status = chip.dataset.libraryStatus
    renderChips(zaehleLibrary(letzteLibrary.eintraege))
    renderTabelle()
    aktualisiereAusgeblendet()
    fokussiere(document.getElementById('library-filter-status'), `[data-library-status="${selektorWert(filter.status)}"]`)
  })
  const liste = document.getElementById('capabilities-library')
  liste.addEventListener('click', (ereignis) => {
    if (!(ereignis.target instanceof Element)) return
    if (ereignis.target.closest('.library-alle')) {
      alleZeigen = true
      renderTabelle()
      // Fokus auf die erste bisher verborgene Zeile — dort geht es weiter.
      fokussiere(liste, `.library-zeile:nth-child(${ZEILEN_VORAB + 1}) .library-name`)
      return
    }
    // Ein Link in der Zeile (keiner heute) bliebe bedienbar; sonst wählt jeder Klick in die Zeile.
    if (ereignis.target.closest('a')) return
    const zeile = ereignis.target.closest('[data-library-id]')
    if (zeile === null) return
    auswahlId = zeile.dataset.libraryId
    renderTabelle()
    renderDetail()
    fokussiere(liste, `.library-name[data-library-id="${selektorWert(auswahlId)}"]`)
    // Unter 1100 px steht das Detail unter der Tabelle — dorthin, damit die Auswahl sichtbar wird.
    const detail = document.getElementById('library-detail')
    if (typeof detail.scrollIntoView === 'function' && window.matchMedia?.('(max-width: 1100px)').matches) detail.scrollIntoView({ block: 'start' })
  })
  const detail = document.getElementById('library-detail')
  detail.addEventListener('click', (ereignis) => {
    const knopf = ereignis.target instanceof Element ? ereignis.target.closest('.library-zum-harness') : null
    if (knopf !== null) zeigeImHarness(knopf.dataset.harnessOrt)
  })
  bindeEmpfehlungInstallation(detail, neuLaden)
}
