/**
 * Datei: public/leitstand/sammlung-anzeige.js
 *
 * Zweck: Reine Anzeigeregeln des Bereichs „Sammlung“ der Capability Library (Seite Workforce, F45 F-2b-1): aus der Antwort
 * von GET /api/projekte/<id>/sammlung (Stefans Sammlung, docs/harness/kandidaten-2026-09-15.md, nur die Bewertungsmatrix)
 * Kennzahlen, Suche, Filter nach Urteil und Stand, Gruppen nach Art und je Zeile Name, „Was es kann“, Urteil, Lizenz,
 * Kosten, Stand und Link; im aufklappbaren Detail Sicherheits-/Fit-Bewertung, Bedeutung des Urteils, Zuordnung zum
 * Katalog, Typ (mit Herkunft der Regel), Prüfbericht und Auswählen (kommt mit F-2b-2) bzw. der Grund, warum nicht.
 * Ohne Netz und ohne DOM-Zugriff, damit node:test die Regeln direkt prüft (sammlung-anzeige.test.mjs).
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/sammlung.js (Laden, Filter, Ereignisse)
 * - public/leitstand/sammlung-anzeige.test.mjs (node:test)
 *
 * Wichtig:
 * - Werte aus der Sammlung (Namen, Urteile, Beschreibungen, Lizenzen, Kosten, Bewertungen, Links) sind Daten der Datei und
 *   werden nur escaped, nie übersetzt. Codes des Servers (Stand, Typ, Gründe, Zuordnung) übersetzt die Oberfläche.
 * - Links nur für https:// und mit rel="noopener noreferrer" (die Datei ist Stefans, aber ihr Inhalt stammt aus dem Web).
 * - Seit F45 F-2b-2c steht das Detail in einer eigenen, vollen Tabellenzeile (F-1068 (3)) und trägt „Vormerken“ für Einträge
 *   ohne Katalog mit Prüfbericht (vormerkenHtml, F-1056 Rest).
 * - Seit F45 F-2b-2a ist „Auswählen“ wirksam: der Ablauf (Typwahl, Pin, Bestätigung, Prüflauf, Bericht) steht im Detail und
 *   kommt aus pruefung-anzeige.js (renderPruefAblauf); der letzte Prüfbericht je Eintrag (pruefbericht_letzter) steht in der
 *   Zeile „Prüfbericht“.
 */

import { formatiereZahl, t, tHtml } from './i18n.js'
import { letzterBerichtHtml, renderPruefAblauf } from './pruefung-anzeige.js'
import { escapeHtml } from './render.js'
import { sammlungNichtVormerkbar } from './vormerken-auftrag.js'

/** Stände in Anzeigereihenfolge (höchster zuerst). */
export const STAENDE = Object.freeze(['benutzt', 'aktiv', 'installiert', 'geprueft', 'vorgemerkt', 'nur_sammlung'])

/** Arten (Unterabschnitte der Matrix) in der Reihenfolge der Datei. */
export const ARTEN = Object.freeze(['UI', 'Repos', 'Plugins', 'Skills', 'Tools', 'MCP'])

/** Bekannte Codes für Übersetzungen (unbekannte Werte bleiben roh). */
const TYPEN = new Set(['skill', 'mcp', 'agent', 'plugin', 'bibliothek', 'lokal', 'unbestimmt'])
const TYP_QUELLEN = new Set(['katalog', 'stack-liste', 'abschnitt', 'unbestimmt'])
const GRUENDE = new Set(['alias', 'ohne_link', 'lokal', 'bibliothek', 'plugin', 'keine_quelle', 'freigegeben', 'mcp_ohne_paket'])
const PRUEFBERICHTE = new Set(['ohne_vor_f2b', 'lokal', 'keiner', 'vorhanden'])

/**
 * Normalisiert einen Suchtext (klein, ohne Akzente).
 * @param text - beliebiger Wert
 * @returns normalisierter Text
 */
function norm(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
}

/**
 * Filtert die Einträge nach Suche (Name, Kurzbeschreibung, Lizenz), Urteil und Stand. Defensiv gegen Nicht-Objekte.
 * @param eintraege - antwort.eintraege
 * @param filter - { suche, urteil ('' = alle), stand ('' = alle) }
 * @returns gefilterte Einträge
 */
export function filtereSammlung(eintraege, filter = {}) {
  const liste = Array.isArray(eintraege) ? eintraege.filter((e) => e !== null && typeof e === 'object') : []
  const suche = norm(filter.suche ?? '').trim()
  return liste.filter((e) => {
    if (filter.urteil && e.urteil !== filter.urteil) return false
    if (filter.stand && e.stand !== filter.stand) return false
    if (suche === '') return true
    return [e.name, e.kurzbeschreibung, e.lizenz].some((feld) => norm(feld).includes(suche))
  })
}

/**
 * Teilt Einträge in die Arten der Datei (Reihenfolge ARTEN; unbekannte Art hinten).
 * @param eintraege - gefilterte Einträge
 * @returns [{ art, eintraege }] nur nicht-leere Gruppen
 */
export function gruppiereNachArt(eintraege) {
  const gruppen = new Map(ARTEN.map((a) => [a, []]))
  for (const e of eintraege) {
    const art = String(e.art ?? '')
    if (!gruppen.has(art)) gruppen.set(art, [])
    gruppen.get(art).push(e)
  }
  return [...gruppen].filter(([, liste]) => liste.length > 0).map(([art, liste]) => ({ art, eintraege: liste }))
}

/**
 * Urteile, die in der Antwort vorkommen, in der Reihenfolge der Zählung (die Datei bestimmt die Reihenfolge).
 * @param antwort - Antwort der Route
 * @returns Urteile
 */
export function vorhandeneUrteile(antwort) {
  return Object.keys(antwort?.zaehlung?.je_urteil ?? {})
}

/**
 * Chip eines Urteils: ausgeschlossen rot, Alias/Offen/Zurückstellen gedämpft, sonst neutral-hell.
 * @param e - Eintrag
 * @returns HTML
 */
export function urteilChip(e) {
  const klasse = e.ausgeschlossen === true ? 'fehler' : ['Alias', 'Offen', 'Zurückstellen', 'Referenz'].includes(e.urteil) ? 'neutral' : e.urteil === 'Aufnehmen' ? '' : 'warten'
  return `<span class="ablauf-status${klasse === '' ? '' : ` ${klasse}`}">${escapeHtml(String(e.urteil ?? ''))}</span>`
}

/**
 * Chip des Stands (übersetzt).
 * @param e - Eintrag
 * @returns HTML
 */
export function standChip(e) {
  const stand = STAENDE.includes(e.stand) ? e.stand : null
  if (stand === null) return `<span class="ablauf-status neutral">${escapeHtml(String(e.stand ?? ''))}</span>`
  const klasse = stand === 'benutzt' || stand === 'aktiv' ? '' : stand === 'installiert' || stand === 'geprueft' ? ' neutral' : stand === 'vorgemerkt' ? ' warten' : ' neutral'
  const aufrufe = stand === 'benutzt' && Number.isInteger(e.aufrufe) ? ` <span class="subtle">${tHtml('sammlung.aufrufe', { anzahl: e.aufrufe })}</span>` : ''
  return `<span class="ablauf-status${klasse}">${tHtml(`sammlung.stand.${stand}`)}</span>${aufrufe}`
}

/**
 * Link-Zelle: nur https, sonst „Link fehlt“.
 * @param e - Eintrag
 * @returns HTML
 */
export function linkHtml(e) {
  if (typeof e.link !== 'string' || !e.link.startsWith('https://')) return `<span class="subtle">${tHtml('sammlung.linkFehlt')}</span>`
  const name = String(e.name ?? '')
  return `<a class="sm-link" href="${escapeHtml(e.link)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(t('sammlung.linkAria', { name }))}">${tHtml('sammlung.quelle')} ↗</a>`
}

/**
 * Text der Zuordnung zum Katalog.
 * @param z - eintrag.zuordnung
 * @returns HTML
 */
function zuordnungHtml(z) {
  if (z?.status === 'zugeordnet') return tHtml(`sammlung.zuordnung.zugeordnet.${z.stufe === 'name' ? 'name' : 'link'}`, {}, { id: `<code>${escapeHtml(String(z.katalog_id ?? ''))}</code>` })
  if (z?.status === 'mehrdeutig' && (z.kandidaten ?? []).length === 1) return tHtml('sammlung.zuordnung.doppelt', {}, { id: `<code>${escapeHtml(String(z.kandidaten[0]))}</code>` })
  if (z?.status === 'mehrdeutig') return tHtml('sammlung.zuordnung.mehrdeutig', {}, { ids: (z.kandidaten ?? []).map((k) => `<code>${escapeHtml(String(k))}</code>`).join(', ') })
  if (z?.status === 'alias') return tHtml('sammlung.zuordnung.alias')
  return tHtml('sammlung.zuordnung.keine')
}

/**
 * Typ mit Herkunft der Regel („Vorschlag aus Abschnitt“, Delta B7).
 * @param e - Eintrag
 * @returns HTML
 */
function typHtml(e) {
  const typ = TYPEN.has(e.typ) ? t(`sammlung.typ.${e.typ}`) : String(e.typ ?? '')
  const quelle = TYP_QUELLEN.has(e.typ_quelle) ? t(`sammlung.typQuelle.${e.typ_quelle}`) : String(e.typ_quelle ?? '')
  return `${escapeHtml(typ)} <span class="subtle">(${escapeHtml(quelle)})</span>`
}

/**
 * F45 F-2b-2c (F-1056 Rest): „Vormerken“ eines Sammlungseintrags ohne Katalog mit Prüfbericht — legt über den bestehenden
 * Vormerken-Weg (Auftrag → Routen → Freigabe am Ausführungsschritt) einen Katalogeintrag OFFEN mit installation_vorlage an.
 * Ohne Bericht oder mit Katalogeintrag steht nichts (dort ist „Auswählen“ bzw. der Katalog der Weg); sonst der Grund.
 * @param e - Eintrag
 * @param vormerken - { zustand (undefined | { phase: 'unterwegs'|'fehler'|'geroutet', auftragId, workflowId, meldung }), workforce }
 * @returns HTML
 */
export function vormerkenHtml(e, vormerken = {}) {
  const grund = sammlungNichtVormerkbar(e)
  if (grund === 'katalog' || grund === 'ohne_bericht') return ''
  if (grund !== null) return `<p class="subtle sm-vormerken-nicht" data-sm-vormerken-grund="${escapeHtml(grund)}">${tHtml('sammlung.vormerken.nicht', { grund: t(`sammlung.vormerken.grund.${grund}`) })}</p>`
  if (vormerken.workforce !== true) return `<p class="subtle sm-vormerken-nicht" data-sm-vormerken-grund="workforce">${tHtml('sammlung.vormerken.nurWorkforce')}</p>`
  const id = escapeHtml(String(e.id ?? ''))
  const name = `<span class="sr-only"> — ${escapeHtml(String(e.name ?? ''))}</span>`
  const u = e.pruefbericht_letzter?.uebersprungen
  // Code-Review 3: ohne lesbare Angabe sperrt die Installation ebenfalls (uebersprungenSperre) — dann auch hier warnen.
  const warnung = u === null || u === undefined ? `<p class="note amber sm-vormerken-warnung">${tHtml('sammlung.vormerken.uebersprungenUnbekannt')}</p>` : Number(u) > 0 ? `<p class="note amber sm-vormerken-warnung">${tHtml('sammlung.vormerken.uebersprungen', { anzahl: Number(u) })}</p>` : ''
  const z = vormerken.zustand
  let inhalt
  if (z?.phase === 'unterwegs') inhalt = `<p class="hinweis" tabindex="-1" data-sm-vormerken-fokus>${tHtml('werkstatt.scout.wirdVorgemerkt')}</p>`
  else if (z?.phase === 'fehler') inhalt = `<p class="fehler" tabindex="-1" data-sm-vormerken-fokus>${escapeHtml(String(z.meldung ?? ''))}</p><button type="button" class="button primary" data-sm-vormerken="${id}">${tHtml('werkstatt.scout.erneut')}${name}</button>`
  else if (z?.phase === 'geroutet') inhalt = `<p class="hinweis" tabindex="-1" data-sm-vormerken-fokus>${tHtml('werkstatt.scout.vorgemerkt', {}, { auftrag: `<code>${escapeHtml(String(z.auftragId))}</code>`, ablauf: `<a href="#/workflows/${encodeURIComponent(String(z.workflowId))}">${escapeHtml(String(z.workflowId))}</a>` })}</p>`
  else inhalt = `<button type="button" class="button primary" data-sm-vormerken="${id}">${tHtml('werkstatt.scout.vormerken')}${name}</button><span class="subtle sm-auswaehlen-hinweis">${tHtml('sammlung.vormerken.hinweis')}</span>`
  return `<div class="sm-vormerken">${warnung}${inhalt}</div>`
}

/**
 * Auswählen-Bereich: auswählbar → Knopf „Auswählen“ (F-2b-2a: Pin, Bestätigung, Prüflauf); ausgeschlossen → Hinweis auf die
 * Pflicht-Begründung; nicht auswählbar → Grund. Läuft ein Ablauf für den Eintrag, steht stattdessen dieser (renderPruefAblauf).
 * @param e - Eintrag
 * @param ablauf - Zustand des Ablaufs dieses Eintrags oder undefined
 * @param bedeutung - urteil_bedeutung der Antwort
 * @returns HTML
 */
export function auswahlHtml(e, ablauf = undefined, bedeutung = {}, vormerken = {}) {
  if (e.auswaehlbar !== true) {
    const grund = GRUENDE.has(e.nicht_auswaehlbar_grund) ? t(`sammlung.grund.${e.nicht_auswaehlbar_grund}`) : String(e.nicht_auswaehlbar_grund ?? '')
    const vorschlag = e.typ_quelle === 'abschnitt' && (e.nicht_auswaehlbar_grund === 'plugin' || e.nicht_auswaehlbar_grund === 'bibliothek') ? ` <span class="subtle">${tHtml('sammlung.grund.vorschlag')}</span>` : ''
    return `<p class="sm-nicht-auswaehlbar" data-sm-grund="${escapeHtml(String(e.nicht_auswaehlbar_grund ?? ''))}"><strong>${tHtml('sammlung.nichtAuswaehlbar')}</strong> ${escapeHtml(grund)}${vorschlag}</p>`
  }
  if (ablauf !== undefined && ablauf !== null) return `${renderPruefAblauf(e, ablauf, bedeutung)}${ablauf.phase === 'fertig' ? vormerkenHtml(e, vormerken) : ''}`
  const ausnahme = e.ausgeschlossen === true ? `<p class="sm-ausnahme">${tHtml('sammlung.ausnahmePflicht')}</p>` : ''
  const erneut = e.pruefbericht_letzter !== null && e.pruefbericht_letzter !== undefined
  // F-2b-2c (design-guardian 2): steht ein Vormerken-Block darüber (Knopf, unterwegs, Fehler, vorgemerkt), ist „Erneut prüfen“
  // in jedem Zustand die zweite Handlung (sekundär).
  const vormerkenBlock = vormerkenHtml(e, vormerken)
  const primaer = !vormerkenBlock.includes('class="sm-vormerken"')
  return `${vormerkenBlock}${ausnahme}<button type="button" class="button${primaer ? ' primary' : ''} sm-auswaehlen" data-sm-auswaehlen="${escapeHtml(String(e.id ?? ''))}" data-sm-typ-offen="${e.typ === 'unbestimmt'}">${tHtml(erneut ? 'pruefung.erneutPruefen' : 'sammlung.auswaehlen')}<span class="sr-only"> — ${escapeHtml(String(e.name ?? ''))}</span></button><span class="subtle sm-auswaehlen-hinweis">${tHtml('sammlung.auswaehlenHinweis')}</span>`
}

/**
 * Inhalt des Details einer Zeile — seit F45 F-2b-2c (F-1068 (3)) in einer eigenen, vollen Tabellenzeile (zeileHtml), geöffnet
 * über den Knopf „Details“ in der Namensspalte (aria-expanded/aria-controls).
 * @param e - Eintrag
 * @param bedeutung - antwort.urteil_bedeutung
 * @param ablauf - Zustand eines laufenden Auswählen-Ablaufs oder undefined
 * @param vormerken - { zustand, workforce } für „Vormerken“ (vormerkenHtml)
 * @returns HTML
 */
export function detailHtml(e, bedeutung, ablauf = undefined, vormerken = {}) {
  const pbText = PRUEFBERICHTE.has(e.pruefbericht) ? t(`sammlung.pruefbericht.${e.pruefbericht}`) : String(e.pruefbericht ?? '')
  const pb = e.pruefbericht_letzter !== null && e.pruefbericht_letzter !== undefined ? letzterBerichtHtml(e.pruefbericht_letzter) : escapeHtml(pbText)
  const hatBedeutung = typeof bedeutung?.[e.urteil] === 'string'
  // design-guardian 2: bei ausgeschlossenen Einträgen steht die Bedeutung nur im roten Band, nicht ein zweites Mal darunter.
  const bed = hatBedeutung && e.ausgeschlossen !== true ? `<p class="sm-bedeutung"><strong>${escapeHtml(String(e.urteil))}:</strong> ${escapeHtml(bedeutung[e.urteil])}</p>` : ''
  const ausgeschlossen = e.ausgeschlossen === true ? `<div class="note red sm-ausgeschlossen"><strong>${tHtml('sammlung.ausgeschlossen.titel')}</strong> <strong>${escapeHtml(String(e.urteil ?? ''))}:</strong> ${escapeHtml(hatBedeutung ? bedeutung[e.urteil] : '')}</div>` : ''
  const id = escapeHtml(String(e.id ?? ''))
  return `<div class="sm-detail" id="sm-detail-${id}" data-sm-detail="${id}" role="region" aria-label="${escapeHtml(t('sammlung.detailsZu', { name: String(e.name ?? '') }))}">
    ${ausgeschlossen}
    <dl class="sm-daten">
      <div><dt>${tHtml('sammlung.bewertung')}</dt><dd>${escapeHtml(String(e.bewertung ?? ''))}${bed}</dd></div>
      <div><dt>${tHtml('sammlung.zuordnung.titel')}</dt><dd>${zuordnungHtml(e.zuordnung)}</dd></div>
      <div><dt>${tHtml('sammlung.typ.titel')}</dt><dd>${typHtml(e)}</dd></div>
      <div><dt>${tHtml('sammlung.pruefbericht.titel')}</dt><dd>${pb}</dd></div>
      <div><dt>${tHtml('sammlung.zeile')}</dt><dd><code>${escapeHtml(String(e.zeile ?? ''))}</code></dd></div>
    </dl>
    <div class="sm-auswahl">${auswahlHtml(e, ablauf, bedeutung, vormerken)}</div>
  </div>`
}

/**
 * Eine Tabellenzeile.
 * @param e - Eintrag
 * @param bedeutung - antwort.urteil_bedeutung
 * @param offeneDetails - Set der offenen Detail-ids
 * @param ablaeufe - Map id → Ablauf-Zustand
 * @param extras - { vormerken: Map id → Vormerken-Zustand, workforce: boolean }
 * @returns HTML (eine Zeile; offen zusätzlich die Detailzeile mit colspan, F-1068 (3))
 */
function zeileHtml(e, bedeutung, offeneDetails, ablaeufe, extras) {
  const spalte = (s) => escapeHtml(t(`sammlung.spalte.${s}`))
  const id = escapeHtml(String(e.id ?? ''))
  const offen = offeneDetails.has(e.id)
  // Die Detailzeile wird nur gerendert, wenn sie offen ist — kein [hidden] gegen display:block der Mobilregel (F-622).
  const knopf = `<button type="button" class="werkstatt-textlink sm-detail-knopf" data-sm-detail-knopf="${id}" aria-expanded="${offen}"${offen ? ` aria-controls="sm-detail-${id}"` : ''}>${tHtml('sammlung.details')}<span class="sr-only"> — ${escapeHtml(String(e.name ?? ''))}</span></button>`
  const detailZeile = offen ? `<tr class="sm-detailzeile" data-sm-detailzeile="${id}"><td colspan="6">${detailHtml(e, bedeutung, ablaeufe.get(e.id), { zustand: extras?.vormerken?.get(e.id), workforce: extras?.workforce === true })}</td></tr>` : ''
  return `<tr class="sm-zeile${offen ? ' sm-zeile-offen' : ''}" data-sm-id="${id}" data-sm-ausgeschlossen="${e.ausgeschlossen === true}">
    <td data-spalte="${spalte('name')}"><span class="library-name sm-name">${escapeHtml(String(e.name ?? ''))}</span><span class="library-beschreibung sm-kann">${escapeHtml(String(e.kurzbeschreibung ?? ''))}</span>${knopf}</td>
    <td data-spalte="${spalte('urteil')}">${urteilChip(e)}</td>
    <td data-spalte="${spalte('lizenz')}">${escapeHtml(String(e.lizenz ?? ''))}</td>
    <td data-spalte="${spalte('kosten')}">${escapeHtml(String(e.kosten ?? ''))}</td>
    <td data-spalte="${spalte('stand')}">${standChip(e)}</td>
    <td data-spalte="${spalte('link')}">${linkHtml(e)}</td>
  </tr>${detailZeile}`
}

/**
 * Eine Gruppe (Art) mit Überschrift und Tabelle.
 * @param gruppe - { art, eintraege }
 * @param bedeutung - antwort.urteil_bedeutung
 * @param offeneDetails - Set der offenen Detail-ids
 * @param ablaeufe - Map id → Ablauf-Zustand
 * @param extras - { vormerken, workforce } (zeileHtml)
 * @returns HTML
 */
function gruppeHtml(gruppe, bedeutung, offeneDetails, ablaeufe, extras) {
  const titelId = `sm-gruppe-${escapeHtml(gruppe.art.toLowerCase())}`
  const titel = ARTEN.includes(gruppe.art) ? t(`sammlung.art.${gruppe.art}`) : gruppe.art
  const th = (s) => `<th scope="col">${tHtml(`sammlung.spalte.${s}`)}</th>`
  const bibliothek = gruppe.art === 'UI' ? `<p class="subtle sm-hinweis">${tHtml('sammlung.hinweisBibliothek')}</p>` : ''
  return `<section class="sm-gruppe" aria-labelledby="${titelId}">
    <h3 id="${titelId}">${escapeHtml(titel)} <span class="fp-anzahl">${escapeHtml(formatiereZahl(gruppe.eintraege.length))}</span></h3>${bibliothek}
    <div class="library-tabelle-rahmen"><table class="sm-tabelle"><caption class="sr-only">${escapeHtml(titel)}</caption><thead><tr>${['name', 'urteil', 'lizenz', 'kosten', 'stand', 'link'].map(th).join('')}</tr></thead><tbody>${gruppe.eintraege.map((e) => zeileHtml(e, bedeutung, offeneDetails, ablaeufe, extras)).join('')}</tbody></table></div>
  </section>`
}

/**
 * Filter-Chips einer Gruppe.
 * @param name - 'urteil' | 'stand'
 * @param werte - mögliche Werte
 * @param gewaehlt - gewählter Wert ('' = alle)
 * @param beschriftung - (wert) => Text
 * @returns HTML
 */
function chipsHtml(name, werte, gewaehlt, beschriftung) {
  const chip = (wert, text) => `<button type="button" class="library-chip" data-sm-filter="${name}" data-sm-wert="${escapeHtml(wert)}" aria-pressed="${gewaehlt === wert}">${escapeHtml(text)}</button>`
  return [chip('', t('sammlung.filter.alle')), ...werte.map((w) => chip(w, beschriftung(w)))].join('')
}

/**
 * Kopf mit Kennzahlen, Selbstprüfungs-Band und Filterzeile (Suche + Chips). Die Suche bleibt beim Neuzeichnen der Liste
 * stehen (eigenes Element, views/sammlung.js zeichnet nur die Liste neu).
 * @param antwort - Antwort der Route (status 'ok')
 * @param filter - { suche, urteil, stand }
 * @returns HTML
 */
export function renderSammlungKopf(antwort, filter = {}) {
  const q = antwort?.quelle ?? {}
  const z = antwort?.zaehlung ?? {}
  const zahl = (n) => `<strong>${escapeHtml(formatiereZahl(Number(n ?? 0)))}</strong>`
  const kennzahlen = tHtml('sammlung.kennzahlen', {}, { zeilen: zahl(q.zeilen), mitLink: zahl(q.mit_link), auswaehlbar: zahl(z.auswaehlbar), ausgeschlossen: zahl(z.ausgeschlossen) })
  const selbst = Array.isArray(antwort?.selbstpruefung) && antwort.selbstpruefung.length > 0 ? `<div class="note amber sm-band" data-sm-band="selbstpruefung"><strong>${tHtml('sammlung.selbstpruefung')}</strong> ${antwort.selbstpruefung.map((s) => escapeHtml(String(s))).join('; ')}</div>` : ''
  const staende = STAENDE.filter((s) => (z.je_stand ?? {})[s] > 0)
  // Code-Review 3: Stand dieses Projekts nicht berechenbar → die Stände zeigen nur „vorgemerkt“/„nur Sammlung“; sichtbar machen.
  const standFehler = typeof antwort?.stand_fehler === 'string' && antwort.stand_fehler !== '' ? `<div class="note amber sm-band" data-sm-band="stand-fehler"><strong>${tHtml('sammlung.standFehler')}</strong> ${escapeHtml(antwort.stand_fehler)}</div>` : ''
  const berichtFehler = typeof antwort?.pruefbericht_fehler === 'string' && antwort.pruefbericht_fehler !== '' ? `<div class="note amber sm-band" data-sm-band="pruefbericht-fehler"><strong>${tHtml('pruefung.berichteNichtLesbar')}</strong> ${escapeHtml(antwort.pruefbericht_fehler)}</div>` : ''
  return `${berichtFehler}<p class="sm-kennzahlen">${kennzahlen} <span class="subtle">${tHtml('sammlung.quelleDatei', {}, { pfad: `<code>${escapeHtml(String(q.pfad ?? ''))}</code>` })}</span></p>
    <p class="note sm-erklaerung">${tHtml('sammlung.erklaerung')}</p>
    ${selbst}${standFehler}
    <div class="library-filterzeile sm-filterzeile">
      <input type="search" id="sammlung-suche" class="library-suche" autocomplete="off" value="${escapeHtml(String(filter.suche ?? ''))}" aria-label="${escapeHtml(t('sammlung.suche'))}" placeholder="${escapeHtml(t('sammlung.suche'))}" />
      <div class="sm-chipgruppe"><span class="subtle sm-chip-titel" id="sm-titel-urteil">${tHtml('sammlung.filter.urteil')}</span><div class="library-chips" role="group" aria-labelledby="sm-titel-urteil">${chipsHtml('urteil', vorhandeneUrteile(antwort), filter.urteil ?? '', (w) => w)}</div></div>
      <div class="sm-chipgruppe"><span class="subtle sm-chip-titel" id="sm-titel-stand">${tHtml('sammlung.filter.stand')}</span><div class="library-chips" role="group" aria-labelledby="sm-titel-stand">${chipsHtml('stand', staende, filter.stand ?? '', (w) => t(`sammlung.stand.${w}`))}</div></div>
    </div>`
}

/**
 * Liste (Gruppen nach Art) für die gefilterten Einträge, mit Trefferzahl.
 * @param antwort - Antwort der Route
 * @param filter - { suche, urteil, stand }
 * @param offeneDetails - Set der offenen Detail-ids
 * @param ablaeufe - Map id → Zustand eines Auswählen-Ablaufs (F-2b-2a)
 * @param extras - { vormerken: Map id → Vormerken-Zustand, workforce: Workforce aktiv } (F45 F-2b-2c)
 * @returns HTML
 */
export function renderSammlungListe(antwort, filter = {}, offeneDetails = new Set(), ablaeufe = new Map(), extras = {}) {
  const gefiltert = filtereSammlung(antwort?.eintraege, filter)
  const gesamt = Array.isArray(antwort?.eintraege) ? antwort.eintraege.length : 0
  const treffer = `<p class="subtle sm-treffer">${tHtml('sammlung.treffer', { anzahl: gefiltert.length, gesamt })}</p>`
  if (gefiltert.length === 0) return `${treffer}<section class="empty sm-leer"><p>${tHtml(gesamt === 0 ? 'sammlung.leer' : 'sammlung.keineTreffer')}</p></section>`
  return `${treffer}${gruppiereNachArt(gefiltert)
    .map((g) => gruppeHtml(g, antwort.urteil_bedeutung ?? {}, offeneDetails, ablaeufe, extras))
    .join('')}`
}

/**
 * Zeile der Scout-Karte (F-1057, Delta B5): Urteil laut Sammlung — Serverwahrheit zum Zeitpunkt der Anzeige, nicht die
 * Angabe des Modells — und ein Hinweis, wenn die Angabe des Scouts abweicht; ohne Treffer bei quelle 'web' „aus dem Web“.
 * @param kandidat - Kandidat aus scoutErgebnis
 * @param abgleich - { treffer, abweichung } aus scoutSammlung (GET /api/laeufe/<id>) an derselben Stelle, oder undefined
 * @returns HTML oder ''
 */
export function scoutSammlungHtml(kandidat, abgleich) {
  const s = abgleich
  const teile = []
  if (s?.treffer !== null && typeof s?.treffer === 'object') teile.push(`<span class="subtle scout-sammlung">${tHtml('werkstatt.scout.sammlung')}</span> ${urteilChip({ urteil: s.treffer.urteil, ausgeschlossen: ['Nur Ausnahme', 'Ausgeschlossen'].includes(s.treffer.urteil) })}`)
  else if (kandidat?.quelle === 'web') teile.push(`<span class="subtle scout-sammlung">${tHtml('werkstatt.scout.quelleWeb')}</span>`)
  if (s?.abweichung === true) teile.push(`<strong class="scout-sammlung-abweichung">${tHtml('werkstatt.scout.sammlungAbweichung')}</strong>`)
  return teile.length === 0 ? '' : `<p class="scout-sammlung-zeile">${teile.join(' ')}</p>`
}

/**
 * Lade- bzw. Fehlerzustand (Ladefehler der Anfrage oder Fehlerstand der Route, z. B. Sammlung nicht lesbar).
 * @param art - 'laedt' | 'fehler'
 * @param grund - Fehlergrund
 * @returns HTML
 */
export function renderSammlungZustand(art, grund = '') {
  if (art === 'laedt') return `<p class="leer">${tHtml('sammlung.laedt')}</p>`
  return `<div class="note red sm-band" data-sm-band="fehler">${tHtml('sammlung.ladeFehler', { grund: String(grund) })}</div>`
}
