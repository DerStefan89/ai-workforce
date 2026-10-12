/**
 * Datei: public/leitstand/faehigkeiten-projekt-anzeige.js
 *
 * Zweck: Reine Anzeigeregeln des Bereichs „Dieses Projekt“ der Capability Library (Seite Workforce, F45 F-2a; F-1012
 * Oberfläche, F-1054, F-1055 (1)): aus der Antwort von GET /api/projekte/<id>/faehigkeiten die Gruppen MCPs · Skills
 * (Katalog) · Projekt-Skills · Projekt-Agents mit Name, Kurzbeschreibung, „Installiert“, „Aktiv“, „Im letzten Lauf“
 * (Aufrufe/Fehler) und Schalter; Bänder für ungültige lokale Datei (E-F45-7), Änderung außerhalb des Leitstands
 * (F-1055 (1)) und laufenden Lauf (Schalter gesperrt, E-F45-8); „Freigeben nach Inhalt“ mit Pfad und Hash.
 * Ohne Netz und ohne DOM-Zugriff, damit node:test die Regeln direkt prüft (faehigkeiten-projekt-anzeige.test.mjs).
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/faehigkeiten-projekt.js (Laden, Ereignisse, POST)
 * - public/leitstand/faehigkeiten-projekt-anzeige.test.mjs (node:test)
 *
 * Wichtig:
 * - Werte des Servers (Namen, Beschreibungen, Gründe, Pfade, Hashes) werden nur escaped, nie übersetzt.
 * - Der Knopf „Diesen Inhalt freigeben“ trägt genau den angezeigten Hash (data-fp-hash) — der Server lehnt mit 409 ab,
 *   wenn sich der Inhalt seit der Anzeige geändert hat (Muster eintragHash).
 * - Ein Schalter ist nur gesperrt, nie versteckt: während eines Laufs, bei ungültiger Datei und bei unbestätigter Änderung von
 *   außen („fremd“, F-1061 (3)) mit Grund (aria-describedby).
 */

import { formatiereDatum, t, tHtml } from './i18n.js'
import { escapeHtml } from './render.js'

/** Gruppen in Anzeigereihenfolge: Schlüssel, Filter, Standard-Satz (i18n). */
const GRUPPEN = Object.freeze([
  { schluessel: 'mcp', passt: (e) => e.quelle === 'katalog' && e.typ === 'mcp' && e.installiert === true, standard: 'katalog' },
  { schluessel: 'skillKatalog', passt: (e) => e.quelle === 'katalog' && e.typ === 'skill' && e.installiert === true, standard: 'katalog' },
  { schluessel: 'projektSkill', passt: (e) => e.quelle === 'projekt' && e.typ === 'skill', standard: 'projekt' },
  { schluessel: 'projektAgent', passt: (e) => e.quelle === 'projekt' && e.typ === 'agent', standard: 'projekt' },
])

/**
 * Teilt die Einträge in die vier Gruppen und die nicht installierten Katalog-Einträge. Defensiv gegen Nicht-Objekte.
 * @param eintraege - status.eintraege
 * @returns { mcp, skillKatalog, projektSkill, projektAgent, nichtInstalliert }
 */
export function gruppiereFaehigkeiten(eintraege) {
  const liste = Array.isArray(eintraege) ? eintraege.filter((e) => e !== null && typeof e === 'object') : []
  const ergebnis = Object.fromEntries(GRUPPEN.map((g) => [g.schluessel, liste.filter(g.passt)]))
  ergebnis.nichtInstalliert = liste.filter((e) => e.quelle === 'katalog' && e.installiert !== true)
  return ergebnis
}

/**
 * Darf der Eintrag geschaltet werden? Katalog: nur installiert; Projekt: immer (auch „eingeschaltet, aber nicht
 * vorhanden“ lässt sich ausschalten).
 * @param e - Eintrag
 * @returns true, wenn ein Schalter gezeigt wird
 */
export function hatSchalter(e) {
  return e.quelle === 'projekt' || e.installiert === true
}

/**
 * Freigabestand eines Projekt-Eintrags als Wert für Chip und Knopf: 'frei' (Katalog oder Projekt), 'abweichend',
 * 'keine', 'fehlt' (QA 2: eingeschaltet, aber im Projektordner nicht vorhanden). Katalog-Einträge: null.
 * @param e - Eintrag
 * @returns 'frei' | 'abweichend' | 'keine' | 'fehlt' | null
 */
export function freigabeStand(e) {
  if (e.quelle !== 'projekt') return null
  if (e.freigabe === 'katalog' || e.freigabe === 'projekt') return 'frei'
  if (e.freigabe === 'fehlt' || e.installiert === false) return 'fehlt'
  return e.freigabe === 'abweichend' ? 'abweichend' : 'keine'
}

/**
 * QA 2: Projekt-Einträge, die eingeschaltet, aber nicht aktiv sind — mit ihnen startet kein Lauf mit Fähigkeiten.
 * @param eintraege - status.eintraege
 * @returns die betroffenen Einträge
 */
export function eingeschaltetNichtAktiv(eintraege) {
  return (Array.isArray(eintraege) ? eintraege : []).filter((e) => e?.quelle === 'projekt' && e.eingeschaltet === true && e.aktiv !== true)
}

/**
 * Text der Spalte „Im letzten Lauf“ (aus letzter_lauf der Status-Route).
 * @param letzter - { im_lauf, benutzt, aufrufe?, fehler? } oder undefined
 * @returns HTML
 */
export function letzterLaufHtml(letzter) {
  const im = letzter?.im_lauf
  if (im === 'aktiv') {
    const aufrufe = Number.isInteger(letzter.aufrufe) ? letzter.aufrufe : null
    const fehler = Number.isInteger(letzter.fehler) ? letzter.fehler : 0
    if (aufrufe === null) return `<span class="ablauf-status neutral">${tHtml('faehigkeitenProjekt.lauf.aktivOhneBeobachtung')}</span>`
    const zeile = tHtml('faehigkeitenProjekt.lauf.aufrufe', { anzahl: aufrufe })
    const mitFehler = fehler > 0 ? ` · <span class="ablauf-status fehler">${tHtml('faehigkeitenProjekt.lauf.fehler', { anzahl: fehler })}</span>` : ''
    return `<span class="ablauf-status${letzter.benutzt === true ? '' : ' neutral'}">${tHtml(letzter.benutzt === true ? 'faehigkeitenProjekt.lauf.benutzt' : 'faehigkeitenProjekt.lauf.nichtBenutzt')}</span><span class="fp-unterzeile">${zeile}${mitFehler}</span>`
  }
  if (im === 'nicht_aktiv') return `<span class="ablauf-status neutral">${tHtml('faehigkeitenProjekt.lauf.nichtAktiv')}</span>`
  if (im === 'nicht_im_lauf') return `<span class="ablauf-status neutral">${tHtml('faehigkeitenProjekt.lauf.nichtImLauf')}</span>`
  return `<span class="unbekannt">${tHtml('faehigkeitenProjekt.lauf.ohneErfassung')}</span>`
}

/**
 * Chip der Spalte „Aktiv“.
 * @param e - Eintrag
 * @returns HTML
 */
function aktivChip(e) {
  if (e.aktiv === true) return `<span class="ablauf-status">${tHtml('faehigkeitenProjekt.aktiv.ja')}</span>`
  // QA 2: eingeschaltet, aber nicht aktiv ist der folgenreichste Zustand (Läufe mit Fähigkeiten starten nicht) — eigener Chip.
  if (e.quelle === 'projekt' && e.eingeschaltet === true) return `<span class="ablauf-status fehler">${tHtml('faehigkeitenProjekt.aktiv.eingeschaltetNichtAktiv')}</span>`
  const stand = freigabeStand(e)
  if (stand === 'abweichend') return `<span class="ablauf-status warten">${tHtml('faehigkeitenProjekt.aktiv.abweichend')}</span>`
  if (stand === 'keine') return `<span class="ablauf-status warten">${tHtml('faehigkeitenProjekt.aktiv.keineFreigabe')}</span>`
  if (stand === 'fehlt') return `<span class="ablauf-status neutral">${tHtml('faehigkeitenProjekt.aktiv.fehlt')}</span>`
  return `<span class="ablauf-status neutral">${tHtml('faehigkeitenProjekt.aktiv.aus')}</span>`
}

/**
 * Schalter (role=switch) eines Eintrags; gesperrt mit Grund, wenn sperre gesetzt ist.
 * @param e - Eintrag
 * @param sperre - null oder Sperrfall aus sperreFuer ('datei' | 'lauf' | 'fremd' | 'beschaeftigt')
 * @returns HTML
 */
function schalterHtml(e, sperre) {
  if (!hatSchalter(e)) return '<span class="subtle">—</span>'
  const an = e.eingeschaltet === true
  const name = escapeHtml(String(e.name ?? e.id ?? ''))
  const label = escapeHtml(t(an ? 'faehigkeitenProjekt.schalter.ausschalten' : 'faehigkeitenProjekt.schalter.einschalten', { name: String(e.name ?? e.id ?? '') }))
  const gesperrt = sperre !== null ? ` disabled aria-describedby="fp-sperre-${sperre}"` : ''
  return `<button type="button" class="fp-schalter" role="switch" aria-checked="${an}" aria-label="${label}" title="${label}" data-fp-schalter="${escapeHtml(String(e.id ?? ''))}" data-fp-ziel="${!an}"${gesperrt}><span class="fp-schalter-knopf" aria-hidden="true"></span><span class="fp-schalter-text">${tHtml(an ? 'faehigkeitenProjekt.schalter.an' : 'faehigkeitenProjekt.schalter.aus')}</span></button><span class="sr-only">${name}</span>`
}

/**
 * Bestätigungsblock „Freigeben nach Inhalt“ (Pfad und Hash, gekürzt sichtbar, voll im title und als code).
 * @param e - Projekt-Eintrag mit hash
 * @param sperre - wie schalterHtml
 * @returns HTML
 */
function freigabeBlock(e, sperre) {
  const hash = String(e.hash ?? '')
  const gesperrt = sperre !== null ? ` disabled aria-describedby="fp-sperre-${sperre}"` : ''
  return `<div class="fp-freigabe" role="group" aria-label="${escapeHtml(t('faehigkeitenProjekt.freigabe.titel'))}">
    <p class="fp-freigabe-satz">${tHtml('faehigkeitenProjekt.freigabe.satz')}</p>
    <dl class="fp-freigabe-daten"><div><dt>${tHtml('faehigkeitenProjekt.freigabe.pfad')}</dt><dd><code>${escapeHtml(String(e.pfad ?? ''))}</code></dd></div><div><dt>${tHtml('faehigkeitenProjekt.freigabe.hash')}</dt><dd><code title="${escapeHtml(hash)}">${escapeHtml(hash.slice(0, 12))}…</code><details class="fp-hash-voll"><summary>${tHtml('faehigkeitenProjekt.freigabe.hashVoll')}</summary><code>${escapeHtml(hash)}</code></details></dd></div></dl>
    <div class="fp-freigabe-knoepfe"><button type="button" class="button primary" data-fp-freigabe-bestaetigen="${escapeHtml(String(e.id ?? ''))}" data-fp-hash="${escapeHtml(hash)}"${gesperrt}>${tHtml('faehigkeitenProjekt.freigabe.bestaetigen')}</button><button type="button" class="button" data-fp-freigabe-abbrechen="${escapeHtml(String(e.id ?? ''))}">${tHtml('faehigkeitenProjekt.freigabe.abbrechen')}</button></div>
  </div>`
}

/**
 * Eine Zeile einer Gruppe.
 * @param e - Eintrag
 * @param zustand - { offeneFreigabe, sperre }
 * @returns HTML
 */
function zeileHtml(e, zustand) {
  const spalte = (s) => escapeHtml(t(`faehigkeitenProjekt.spalte.${s}`))
  const beschreibung = typeof e.beschreibung === 'string' && e.beschreibung !== '' ? `<span class="library-beschreibung" title="${escapeHtml(e.beschreibung)}">${escapeHtml(e.beschreibung)}</span>` : ''
  const grund = e.aktiv !== true && typeof e.grund === 'string' && e.grund !== '' ? `<span class="fp-grund">${escapeHtml(e.grund)}</span>` : ''
  const stand = freigabeStand(e)
  const kannFreigeben = (stand === 'abweichend' || stand === 'keine') && typeof e.hash === 'string' && e.hash !== ''
  const offen = kannFreigeben && zustand.offeneFreigabe === e.id
  const oeffnenGesperrt = zustand.sperre !== null ? ` disabled aria-describedby="fp-sperre-${zustand.sperre}"` : ''
  const freigabeKnopf = kannFreigeben && !offen ? `<button type="button" class="button fp-freigabe-oeffnen" data-fp-freigabe-oeffnen="${escapeHtml(String(e.id ?? ''))}"${oeffnenGesperrt}>${tHtml('faehigkeitenProjekt.freigabe.oeffnen')}</button>` : ''
  const id = escapeHtml(String(e.id ?? ''))
  return `<tr class="fp-zeile" data-fp-id="${id}" data-fp-aktiv="${e.aktiv === true}">
    <td data-spalte="${spalte('faehigkeit')}"><span class="library-name fp-name">${escapeHtml(String(e.name ?? e.id ?? ''))}</span>${beschreibung}${grund}${freigabeKnopf}${offen ? freigabeBlock(e, zustand.sperre) : ''}</td>
    <td data-spalte="${spalte('installiert')}">${tHtml(e.installiert === true ? 'faehigkeitenProjekt.installiert.ja' : 'faehigkeitenProjekt.installiert.nein')}</td>
    <td data-spalte="${spalte('aktiv')}">${aktivChip(e)}</td>
    <td data-spalte="${spalte('letzterLauf')}">${letzterLaufHtml(e.letzter_lauf)}</td>
    <td data-spalte="${spalte('schalter')}">${schalterHtml(e, zustand.sperre)}</td>
  </tr>`
}

/**
 * Eine Gruppe mit Überschrift, Standard-Satz und Tabelle (oder „keine“).
 * @param gruppe - Eintrag aus GRUPPEN
 * @param eintraege - Einträge der Gruppe
 * @param zustand - { offeneFreigabe, sperre }
 * @returns HTML
 */
function gruppeHtml(gruppe, eintraege, zustand) {
  const titelId = `fp-gruppe-${gruppe.schluessel}`
  const kopf = `<h3 id="${titelId}">${tHtml(`faehigkeitenProjekt.gruppe.${gruppe.schluessel}`)} <span class="fp-anzahl">${escapeHtml(String(eintraege.length))}</span></h3><p class="subtle fp-standard">${tHtml(`faehigkeitenProjekt.standard.${gruppe.standard}`)}</p>`
  if (eintraege.length === 0) return `<section class="fp-gruppe" aria-labelledby="${titelId}">${kopf}<p class="leer">${tHtml('faehigkeitenProjekt.gruppeLeer')}</p></section>`
  const th = (s) => `<th scope="col">${tHtml(`faehigkeitenProjekt.spalte.${s}`)}</th>`
  return `<section class="fp-gruppe" aria-labelledby="${titelId}">${kopf}<div class="library-tabelle-rahmen"><table class="fp-tabelle"><caption class="sr-only">${tHtml(`faehigkeitenProjekt.gruppe.${gruppe.schluessel}`)}</caption><thead><tr>${['faehigkeit', 'installiert', 'aktiv', 'letzterLauf', 'schalter'].map(th).join('')}</tr></thead><tbody>${eintraege.map((e) => zeileHtml(e, zustand)).join('')}</tbody></table></div></section>`
}

/**
 * Bänder oben: ungültige Datei (rot), unbestätigte Änderung außerhalb des Leitstands (rot, mit Knopf „Datei geprüft –
 * Stand übernehmen“, F-1061 (3)), laufender Lauf (Schalter gesperrt), eingeschaltet-aber-nicht-aktiv (rot), Hindernis der
 * Projekt-Fähigkeiten (gelb). Jedes Band mit Grund aus dem Server, escaped.
 * @param beschaeftigt - true, solange ein POST läuft (design-guardian A: kein zweites Bestätigen per Doppelklick)
 * @param status - Antwort der Status-Route
 * @returns HTML
 */
export function baenderHtml(status, beschaeftigt = false) {
  const datei = status?.lokale_datei ?? {}
  const pfad = `<code>${escapeHtml(String(datei.pfad ?? 'faehigkeiten.lokal.json'))}</code>`
  const baender = []
  if (datei.zustand === 'ungueltig') {
    // design-guardian 5: der Grund des Servers nennt Pfad und Folge schon — nur Titel und Grund.
    baender.push(`<div class="note red fp-band" data-fp-band="ungueltig" id="fp-sperre-datei"><strong>${tHtml('faehigkeitenProjekt.band.ungueltig.titel')}</strong> ${escapeHtml(String(datei.grund ?? ''))}</div>`)
  }
  const fremd = datei.fremd_geaendert
  if (fremd !== null && typeof fremd === 'object') {
    const geaendert = typeof fremd.geaendert_am === 'string' ? escapeHtml(formatiereDatum(fremd.geaendert_am, { dateStyle: 'medium', timeStyle: 'short' })) : escapeHtml(t('faehigkeitenProjekt.band.fremd.unbekannt'))
    const seit = typeof fremd.bekannt_seit === 'string' ? escapeHtml(formatiereDatum(fremd.bekannt_seit, { dateStyle: 'medium', timeStyle: 'short' })) : '—'
    const quelle = ['route', 'serverstart', 'bestaetigt'].includes(fremd.quelle) ? t(`faehigkeitenProjekt.band.fremd.quelle.${fremd.quelle}`) : String(fremd.quelle ?? '')
    // F-1061 (3): rot, weil Läufe mit Fähigkeiten bis zur Bestätigung gesperrt sind; der Knopf schickt genau den angezeigten
    // Stand (lokale_datei.hash) — hat sich die Datei seither erneut geändert, lehnt der Server ab (409).
    const knopfSperre = status?.lokale_datei?.zustand === 'ungueltig' ? 'datei' : status?.lauf_aktiv?.aktiv === true ? 'lauf' : beschaeftigt ? 'beschaeftigt' : null
    const stand = typeof status?.lokale_datei?.hash === 'string' ? status.lokale_datei.hash : ''
    const knopf = `<button type="button" class="button primary fp-bestaetigen" data-fp-bestaetigen="${escapeHtml(stand)}"${knopfSperre !== null ? ` disabled aria-describedby="fp-sperre-${knopfSperre}"` : ''}>${tHtml('faehigkeitenProjekt.band.fremd.knopf')}</button>`
    baender.push(`<div class="note red fp-band" data-fp-band="fremd"><strong id="fp-sperre-fremd">${tHtml('faehigkeitenProjekt.band.fremd.titel')}</strong> ${tHtml('faehigkeitenProjekt.band.fremd.text', { quelle }, { pfad, geaendert, seit })}<div class="fp-freigabe-knoepfe fp-band-knopf">${knopf}</div></div>`)
  }
  if (status?.lauf_aktiv?.aktiv === true) {
    baender.push(`<div class="note fp-band" data-fp-band="lauf" id="fp-sperre-lauf"><strong>${tHtml('faehigkeitenProjekt.band.lauf.titel')}</strong> ${escapeHtml(String(status.lauf_aktiv.grund ?? ''))}</div>`)
  }
  const nichtAktiv = eingeschaltetNichtAktiv(status?.eintraege)
  if (nichtAktiv.length > 0) {
    const namen = nichtAktiv.map((e) => `<code>${escapeHtml(String(e.id ?? ''))}</code>`).join(', ')
    baender.push(`<div class="note red fp-band" data-fp-band="nicht-aktiv"><strong>${tHtml('faehigkeitenProjekt.band.nichtAktiv.titel')}</strong> ${tHtml('faehigkeitenProjekt.band.nichtAktiv.text', {}, { namen })}</div>`)
  }
  if (typeof status?.hindernis === 'string' && status.hindernis !== '') {
    baender.push(`<div class="note amber fp-band" data-fp-band="hindernis"><strong>${tHtml('faehigkeitenProjekt.band.hindernis.titel')}</strong> ${escapeHtml(status.hindernis)}</div>`)
  }
  return baender.join('')
}

/**
 * Sperrgrund der Schalter (Priorität: ungültige Datei vor laufendem Lauf vor unbestätigter Änderung von außen vor laufender
 * Aktion).
 * @param status - Antwort der Status-Route
 * @param beschaeftigt - true, solange ein POST läuft
 * @returns 'datei' | 'lauf' | 'fremd' | 'beschaeftigt' | null
 */
export function sperreFuer(status, beschaeftigt = false) {
  if (status?.lokale_datei?.zustand === 'ungueltig') return 'datei'
  if (status?.lauf_aktiv?.aktiv === true) return 'lauf'
  // F-1061 (3): bis zur Bestätigung der Änderung von außen schreibt keine Route (der Server antwortet 409).
  const fremd = status?.lokale_datei?.fremd_geaendert
  if (fremd !== null && typeof fremd === 'object') return 'fremd'
  return beschaeftigt ? 'beschaeftigt' : null
}

/**
 * Der ganze Bereich „Dieses Projekt“.
 * @param status - Antwort von GET …/faehigkeiten
 * @param zustand - { offeneFreigabe: id|null, meldung: { art: 'ok'|'fehler', text, id? }|null, beschaeftigt: boolean }
 * @returns HTML
 */
export function renderFaehigkeitenProjekt(status, zustand = {}) {
  const gruppen = gruppiereFaehigkeiten(status?.eintraege)
  const sperre = sperreFuer(status, zustand.beschaeftigt === true)
  const innen = { offeneFreigabe: zustand.offeneFreigabe ?? null, sperre }
  const meldung = zustand.meldung ?? null
  const meldungHtml = meldung === null ? '' : `<div class="note ${meldung.art === 'fehler' ? 'red' : ''} fp-meldung" tabindex="-1" data-fp-meldung="${escapeHtml(meldung.art)}">${escapeHtml(String(meldung.text ?? ''))}</div>`
  const beschaeftigt = zustand.beschaeftigt === true ? `<span class="sr-only" id="fp-sperre-beschaeftigt">${tHtml('faehigkeitenProjekt.beschaeftigt')}</span>` : ''
  const leer = GRUPPEN.every((g) => gruppen[g.schluessel].length === 0)
  const nichtInstalliert =
    gruppen.nichtInstalliert.length === 0
      ? ''
      : `<details class="fp-nicht-installiert"><summary>${tHtml('faehigkeitenProjekt.nichtInstalliert', { anzahl: gruppen.nichtInstalliert.length })}</summary><ul>${gruppen.nichtInstalliert.map((e) => `<li><span class="library-name fp-name">${escapeHtml(String(e.name ?? e.id ?? ''))}</span>${typeof e.beschreibung === 'string' && e.beschreibung !== '' ? ` — <span class="subtle">${escapeHtml(e.beschreibung)}</span>` : ''}${typeof e.grund === 'string' && e.grund !== '' ? `<span class="fp-grund">${escapeHtml(e.grund)}</span>` : ''}</li>`).join('')}</ul></details>`
  const lauf = typeof status?.letzter_lauf_id === 'string' ? tHtml('faehigkeitenProjekt.letzterLaufId', {}, { lauf: `<code>${escapeHtml(status.letzter_lauf_id)}</code>` }) : tHtml('faehigkeitenProjekt.keinLetzterLauf')
  return `<div class="fp-bereich">
    ${baenderHtml(status, zustand.beschaeftigt === true)}
    ${meldungHtml}${beschaeftigt}
    <p class="note fp-wirkt"><strong>${tHtml('faehigkeitenProjekt.wirkt')}</strong> <span class="subtle">${lauf}</span></p>
    ${leer ? `<section class="empty fp-leer"><p>${tHtml('faehigkeitenProjekt.leer')}</p></section>` : GRUPPEN.map((g) => gruppeHtml(g, gruppen[g.schluessel], innen)).join('')}
    ${nichtInstalliert}
  </div>`
}

/**
 * Lade- bzw. Fehlerzustand des Bereichs.
 * @param art - 'laedt' | 'fehler'
 * @param grund - Fehlergrund (nur bei 'fehler')
 * @returns HTML
 */
export function renderFaehigkeitenProjektZustand(art, grund = '') {
  if (art === 'laedt') return `<p class="leer">${tHtml('faehigkeitenProjekt.laedt')}</p>`
  return `<div class="note red fp-band" data-fp-band="ladefehler">${tHtml('faehigkeitenProjekt.ladeFehler', { grund: String(grund) })}</div>`
}
