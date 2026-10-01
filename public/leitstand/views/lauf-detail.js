/**
 * Datei: public/leitstand/views/lauf-detail.js
 *
 * Zweck: Anzeige-Bausteine der Ausführungen (F44 WS-5a, Vorlage V10 d_arbeit_verlauf und
 * d_ausfuehrung_failed; Abgleich F-725 G1–G9, F7): das Register „Ausführungen“ (eine Zeile je Lauf,
 * die ganze Zeile führt zu `#/runs/<laufId>`; Startfehler), das Lauf-Detail als Seite (Notiz je Lage
 * mit ihren Aktionen, „Was passiert ist“ als Timeline aus den Checkpoints, „Einordnung“, die vier
 * Aufklappbereiche) und die Inhalte des Dialogs #lauf-dialog (Kenntnisnahme, Klärung auflösen,
 * Rückfrage beantworten, Lauf abbrechen).
 *
 * Reine Render-Funktionen: Sie bekommen Serverdaten und liefern HTML. Laden, Dialogsteuerung und alle
 * POST-Aufrufe bleiben in views/runs.js — dieses Modul kennt weder fetch noch DOM und importiert keine
 * api.js-Funktion.
 *
 * Die Oberfläche entscheidet NICHTS selbst: welche Lage gilt (ermittleLaufLage), steht exakt in den
 * Regeln von F-828 — ein aktiver Lauf bekommt keine Maske 'terminal'/'kenntnisnahme' (der Server
 * lehnt beide mit 400 ab), der Bypass-Fall (VERWEIGERT mit bypass_verdacht_anzahl > 0) behält
 * 'antwort' auch im Nachlauf, weil der Server sie dort erlaubt.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/runs.js
 * - public/leitstand/views/runs.test.mjs, views/lauf-detail.test.mjs (node:test)
 * - scripts/check-f12-leitstand-ansicht.mjs (f)/(g) liest renderLaufakte und renderAuftrag als Quelltext
 *
 * Wichtig:
 * - Import-sicher: kein Zugriff auf DOM oder Storage beim Import (in Node gilt de).
 * - Serverwerte (grund, laufId, typ, Pfade, Statuswerte in Tabellen, beobachtung, Modell, Worker in der
 *   Laufakte) werden nie übersetzt und immer escaped; alle übrigen Texte über t()/tHtml().
 * - renderLaufakte: jedes Label steht in derselben Tabellenzeile wie sein Feld (Gate f12 (f)); die
 *   Modellzeilen nennen ihren Rang. renderAuftrag: der auftrag_fehlt-Text wird genau einmal escaped
 *   (Gate f12 (g), F-359).
 */

import { formatiereBeobachtung } from '../beobachtung-zeile.js'
import { formatiereDatum, t, tHtml } from '../i18n.js'
import { kommtBadge } from '../kommt.js'
import { escapeHtml } from '../render.js'
import { rollenName, workerName } from '../rollen-anzeige.js'

/** Pfeil der Listenzeile (Vorlage icon('arrow')). */
const PFEIL = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6" /></svg>'

/** Schließen-Kreuz im Dialogkopf. */
const KREUZ = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18" /></svg>'

/** Ergebnis- und Statuswerte mit übersetztem Text (lauf.status.*); ein anderer erscheint roh. */
const STATUS_TEXTE = new Set(['ERFOLGREICH', 'FEHLGESCHLAGEN', 'VERWEIGERT', 'KLAERUNG_ERFORDERLICH', 'NICHT_GESTARTET', 'laeuft'])

/** Die Ergebnisse, die „Klärung auflösen“ (art 'terminal') anbietet — wie bisher, Werte roh. */
const TERMINAL_ERGEBNISSE = ['ERFOLGREICH', 'VERWEIGERT', 'FEHLGESCHLAGEN']

/** Die Einstufungen der Antwort auf eine Rückfrage (art 'antwort') — wie bisher, Werte roh. */
const ANTWORT_EINSTUFUNGEN = ['ERFOLGREICH', 'VERWEIGERT']

/** Titel je Checkpoint-Typ (Schlüssel lauf.passiert.typ.*); ein anderer typ erscheint roh. */
const TYP_SCHLUESSEL = {
  checkpoint: 'checkpoint',
  'lineage/artefakt_version': 'artefaktVersion',
  'lineage/stale_entscheidung': 'staleEntscheidung',
  '(ungültig)': 'ungueltig',
}

/** Titel je Art einer Wirkungsmarke (typ 'wirkungsmarke'). */
const WIRKUNGSMARKE_SCHLUESSEL = { run_prepared: 'runPrepared', terminal: 'terminal' }

// ─── Lage (F-828) ───────────────────────────────────────────────────────────

/**
 * true, wenn ein VERWEIGERT-Lauf einen Bypass-Verdacht des Modells trägt (E-186-Fall).
 * @param verweigertDaten - detail.verweigertDaten, oder null
 * @returns true nur bei einer echten, positiven bypassVerdachtAnzahl
 */
export function hatBypassVerdacht(verweigertDaten) {
  return typeof verweigertDaten?.bypassVerdachtAnzahl === 'number' && verweigertDaten.bypassVerdachtAnzahl > 0
}

/**
 * Die Lage eines Laufs im Detail — dieselben Regeln wie bisher renderEntscheidungBlock (F-828):
 * 'rueckfrage' (VERWEIGERT mit Bypass-Verdacht, auch aktiv), 'laeuft' (aktiv, sonst), 'klaerung'
 * (KLAERUNG_ERFORDERLICH), 'fehler' (FEHLGESCHLAGEN oder VERWEIGERT ohne Bypass-Verdacht), 'erfolg'
 * (ERFOLGREICH) und 'sonst' (kein offener Fall). Reine Anzeigeabbildung, entschieden hat der Server.
 * @param laufStatus - detail.laufStatus
 * @param verweigertDaten - detail.verweigertDaten
 * @param aktiv - detail.aktiv
 * @returns Lage
 */
export function ermittleLaufLage(laufStatus, verweigertDaten, aktiv = false) {
  const status = laufStatus?.status
  const ergebnis = laufStatus?.ergebnis
  if (status === 'ABGESCHLOSSEN' && ergebnis === 'VERWEIGERT' && hatBypassVerdacht(verweigertDaten)) return 'rueckfrage'
  if (aktiv === true) return 'laeuft'
  if (status === 'KLAERUNG_ERFORDERLICH') return 'klaerung'
  if (status === 'ABGESCHLOSSEN' && (ergebnis === 'FEHLGESCHLAGEN' || ergebnis === 'VERWEIGERT')) return 'fehler'
  if (status === 'ABGESCHLOSSEN' && ergebnis === 'ERFOLGREICH') return 'erfolg'
  return 'sonst'
}

/**
 * Ob „Fortsetzung vorbereiten“ (G7, Wiederaufnahme) angeboten wird: dieselbe Regel wie bisher an der
 * Laufzeile (D-F10-1: offene Klärung oder Fehlschlag), nur nicht, solange der Lauf läuft — auch nicht
 * im Nachlauf des Bypass-Falls (Lage 'rueckfrage' bei aktiv; der Start scheiterte an D13).
 * @param laufStatus - detail.laufStatus
 * @param lage - Ergebnis von ermittleLaufLage
 * @param aktiv - detail.aktiv
 * @returns true, wenn der Knopf erscheint
 */
export function darfFortsetzen(laufStatus, lage, aktiv = false) {
  if (lage === 'laeuft' || aktiv === true) return false
  if (laufStatus?.status === 'KLAERUNG_ERFORDERLICH') return true
  if (laufStatus?.status !== 'ABGESCHLOSSEN') return false
  return laufStatus.ergebnis === 'FEHLGESCHLAGEN' || laufStatus.ergebnis === 'VERWEIGERT'
}

/**
 * Statuspunkt eines Laufs (Vorlage .status): ein aktiver Lauf ohne Terminalmarke „läuft“ (F-828,
 * F-844), sonst das Ergebnis bzw. „Klärung nötig“.
 * @param laufStatus - laufStatus aus Liste oder Detail
 * @param aktiv - true, wenn der Server den Lauf als aktiv meldet
 * @returns { kategorie: 'ok'|'warten'|'fehler'|'neutral', schluessel } — schluessel ist der Wert für statusText
 */
export function laufStatusPunkt(laufStatus, aktiv = false) {
  const status = laufStatus?.status
  if (aktiv === true && status !== 'ABGESCHLOSSEN') return { kategorie: 'ok', schluessel: 'laeuft' }
  if (status === 'ABGESCHLOSSEN') {
    const ergebnis = laufStatus.ergebnis
    return { kategorie: ergebnis === 'ERFOLGREICH' ? 'ok' : 'fehler', schluessel: ergebnis }
  }
  if (status === 'KLAERUNG_ERFORDERLICH') return { kategorie: 'warten', schluessel: status }
  return { kategorie: 'neutral', schluessel: status }
}

/**
 * Text eines Status- oder Ergebniswerts; ein unbekannter Wert erscheint roh.
 * @param wert - z. B. 'FEHLGESCHLAGEN' oder 'laeuft'
 * @returns Text
 */
export function statusText(wert) {
  return STATUS_TEXTE.has(wert) ? t(`lauf.status.${wert}`) : String(wert ?? '')
}

/**
 * Statuspunkt als HTML (Klassen wie die Lage der Aufträge, .ablauf-status).
 * @param laufStatus - laufStatus
 * @param aktiv - true, wenn aktiv
 * @returns HTML
 */
export function laufStatusBadge(laufStatus, aktiv = false) {
  const { kategorie, schluessel } = laufStatusPunkt(laufStatus, aktiv)
  return `<span class="ablauf-status ${kategorie}">${escapeHtml(statusText(schluessel))}</span>`
}

/**
 * Zeitpunkt über Intl; ohne Zeitpunkt „Zeit unbekannt“.
 * @param iso - ISO-Zeitstempel oder null
 * @param optionen - Intl.DateTimeFormat-Optionen
 * @returns HTML
 */
function zeitHtml(iso, optionen = { dateStyle: 'medium', timeStyle: 'short' }) {
  if (typeof iso !== 'string' || iso === '') return `<span class="unbekannt">${tHtml('ausfuehrung.zeitUnbekannt')}</span>`
  return `<time datetime="${escapeHtml(iso)}">${escapeHtml(formatiereDatum(iso, optionen))}</time>`
}

/**
 * Titel eines Laufs: der Auftragstitel, ohne Auftrag die laufId.
 * @param titel - auftragsbezug.titel bzw. auftrag.titel, oder null
 * @param laufId - Kennung
 * @returns Text
 */
export function laufTitel(titel, laufId) {
  return typeof titel === 'string' && titel.trim() !== '' ? titel : String(laufId ?? '')
}

// ─── Register „Ausführungen“ (G1) ───────────────────────────────────────────

/**
 * Eine Zeile der Liste (Vorlage d_arbeit_verlauf): Titel = Auftragstitel, darunter die laufId als code,
 * bei gebrochener Kette ein roter Hinweis; rechts Statuspunkt, „zur Kenntnis genommen“, Zeit und Pfeil.
 * Worker und Rolle stehen nicht hier (die Kopfdaten tragen sie nicht, F-942).
 * @param lauf - ein Eintrag aus zustand.laeufe
 * @param aktiveLaufId - laufId des aktiven Laufs laut zustand.aktiverLauf, oder null
 * @returns HTML
 */
function laufZeile(lauf, aktiveLaufId) {
  const id = String(lauf.laufId ?? '')
  const bruch = lauf.kettenintegritaet === false ? `<p class="lauf-zeile-bruch">${tHtml('ausfuehrung.liste.kettenbruch')}</p>` : ''
  const kenntnis = lauf.kenntnisgenommen === true ? `<span class="lauf-kenntnis">${tHtml('ausfuehrung.liste.kenntnis')}</span>` : ''
  return `<a class="list-row lauf-zeile" href="#/runs/${escapeHtml(encodeURIComponent(id))}" data-lauf-id="${escapeHtml(id)}">
    <div class="lauf-zeile-text">
      <h3>${escapeHtml(laufTitel(lauf.auftragsbezug?.titel, id))}</h3>
      <p class="subtle"><code>${escapeHtml(id)}</code></p>
      ${bruch}
    </div>
    <div class="row-end">${laufStatusBadge(lauf.laufStatus, aktiveLaufId !== null && aktiveLaufId === id)}${kenntnis}<span class="lauf-zeit">${zeitHtml(lauf.zeitpunkt)}</span>${PFEIL}</div>
  </a>`
}

/**
 * Die Liste „Ausführungen“ aus dem Zustands-Aggregat: Zeilen, Leerzustand oder — bei defekter Quelle —
 * „nicht verfügbar“ (keine falsche Entwarnung).
 * @param laeufe - zustand.laeufe, oder null bei defekter Quelle
 * @param aktiverLauf - zustand.aktiverLauf ({ aktiv, laufId }) oder undefined
 * @returns HTML
 */
export function renderLaufListe(laeufe, aktiverLauf) {
  if (!Array.isArray(laeufe)) {
    return `<div class="note red"><strong>${tHtml('ausfuehrung.liste.nichtVerfuegbar.titel')}</strong><p>${tHtml('ausfuehrung.liste.nichtVerfuegbar.text')}</p></div>`
  }
  if (laeufe.length === 0) {
    return `<div class="empty"><h3>${tHtml('ausfuehrung.liste.leer.titel')}</h3><p>${tHtml('ausfuehrung.liste.leer.text')}</p></div>`
  }
  const aktiveLaufId = aktiverLauf?.aktiv === true && typeof aktiverLauf.laufId === 'string' ? aktiverLauf.laufId : null
  return laeufe.map((lauf) => laufZeile(lauf, aktiveLaufId)).join('')
}

/**
 * Die Startfehler (flüchtige Projektion) als Zeilen: laufId, Fehlertext roh, Zeit.
 * @param startfehler - zustand.startfehler, oder null bei defekter Quelle
 * @returns HTML
 */
export function renderStartfehlerListe(startfehler) {
  if (!Array.isArray(startfehler)) {
    return `<div class="note red"><strong>${tHtml('ausfuehrung.startfehler.nichtVerfuegbar.titel')}</strong><p>${tHtml('ausfuehrung.startfehler.nichtVerfuegbar.text')}</p></div>`
  }
  if (startfehler.length === 0) return `<p class="subtle">${tHtml('ausfuehrung.startfehler.leer')}</p>`
  const zeilen = startfehler.map(
    (e) => `<div class="startfehler-zeile">
      <p><code>${escapeHtml(e.laufId ?? '')}</code> <span class="lauf-zeit">${zeitHtml(e.zeitstempel)}</span></p>
      <p class="startfehler-text">${escapeHtml(e.fehler ?? '')}</p>
    </div>`
  )
  return `<div class="startfehler-liste">${zeilen.join('')}</div>`
}

// ─── Notiz je Lage (G3, G6–G9, F7) ──────────────────────────────────────────

/**
 * Ein Knopf der Notiz (Klasse lauf-aktion, Art in data-aktion).
 * @param aktion - data-aktion
 * @param schluessel - i18n-Schlüssel der Beschriftung
 * @param klasse - zusätzliche Klasse ('primary', 'danger' oder '')
 * @param dialog - true, wenn der Knopf einen Dialog öffnet
 * @returns HTML
 */
function aktionsKnopf(aktion, schluessel, klasse = '', dialog = false) {
  return `<button type="button" class="button${klasse ? ` ${klasse}` : ''} lauf-aktion" data-aktion="${aktion}"${dialog ? ' aria-haspopup="dialog"' : ''}>${tHtml(schluessel)}</button>`
}

/**
 * Rohe Serverdaten eines fehlgeschlagenen bzw. verweigerten Laufs (non_execution_kind, abgelehnte
 * Werkzeuge) — nur, was der Server wirklich liefert.
 * @param verweigertDaten - detail.verweigertDaten oder null
 * @param rohstrom - detail.rohstrom oder undefined
 * @returns HTML ('' ohne Daten)
 */
function fehlerDaten(verweigertDaten, rohstrom) {
  const zeilen = []
  const art = verweigertDaten?.nonExecutionKind
  if (art !== undefined && art !== null && art !== 'unbekannt') zeilen.push(`<li><code>non_execution_kind</code> ${escapeHtml(String(art))}</li>`)
  const denials = rohstrom?.status === 'ok' && rohstrom.ergebnisobjekt?.status === 'ok' ? rohstrom.ergebnisobjekt.permissionDenials : null
  if (denials && denials.anzahl > 0) {
    const namen = Array.isArray(denials.toolNamen) && denials.toolNamen.length > 0 ? `: ${denials.toolNamen.map((n) => escapeHtml(n)).join(', ')}` : ''
    zeilen.push(`<li>${tHtml('lauf.notiz.abgelehnteWerkzeuge', { anzahl: denials.anzahl })}${namen}</li>`)
  }
  return zeilen.length === 0 ? '' : `<ul class="lauf-daten">${zeilen.join('')}</ul>`
}

/**
 * Die Notiz über der Timeline je Lage mit ihren Aktionen (Vorlage .note, .note.red, .note.amber).
 * „Aktualisieren“ gibt es in jeder Lage (das Detail wird nicht gepollt, F-363).
 * @param lage - Ergebnis von ermittleLaufLage
 * „Lauf abbrechen“ (G9) hängt wie bisher an aktiv, nicht an der Lage — also auch im Nachlauf des
 * Bypass-Falls; nach einem angeforderten Abbruch steht der Knopf gesperrt mit „Abbruch angefordert“.
 * @param kontext - { laufStatus, verweigertDaten, rohstrom, kenntnisgenommen, fortsetzung, geladenAm, aktiv, abbruchAngefordert }
 * @returns HTML
 */
export function renderLaufNotiz(lage, { laufStatus, verweigertDaten = null, rohstrom, kenntnisgenommen = false, fortsetzung = false, geladenAm = null, aktiv = lage === 'laeuft', abbruchAngefordert = false } = {}) {
  const aktualisieren = aktionsKnopf('aktualisieren', 'lauf.aktion.aktualisieren')
  let abbrechen = ''
  if (aktiv && abbruchAngefordert) abbrechen = `<button type="button" class="button danger lauf-aktion" data-aktion="abbrechen-oeffnen" disabled>${tHtml('lauf.aktion.abbruchAngefordert')}</button>`
  else if (aktiv) abbrechen = aktionsKnopf('abbrechen-oeffnen', 'lauf.aktion.abbrechen', 'danger', true)
  // „Fortsetzung vorbereiten“ ist nur in der Fehlerlage die Hauptaktion (Vorlage d_ausfuehrung_failed).
  const fortsetzen = (primaer) => (fortsetzung ? aktionsKnopf('fortsetzung', 'lauf.aktion.fortsetzung', primaer ? 'primary' : '') : '')
  const zeile = (...knoepfe) => `<div class="action-row">${knoepfe.join('')}</div>`
  if (lage === 'fehler') {
    const ergebnis = laufStatus?.ergebnis === 'VERWEIGERT' ? 'VERWEIGERT' : 'FEHLGESCHLAGEN'
    const kenntnis = kenntnisgenommen
      ? `<p class="lauf-kenntnis-zeile">${tHtml('lauf.notiz.kenntnisGenommen')}</p>`
      : ''
    const knopfKenntnis = kenntnisgenommen ? '' : aktionsKnopf('kenntnisnahme-oeffnen', 'lauf.aktion.kenntnis', '', true)
    return `<div class="note red lauf-notiz-fehler">
      <strong>${tHtml(`lauf.notiz.fehler.${ergebnis}`)}</strong>
      <p>${tHtml('lauf.notiz.ursache')} ${kommtBadge()}</p>
      ${fehlerDaten(verweigertDaten, rohstrom)}
      ${kenntnis}
      ${zeile(knopfKenntnis, fortsetzen(true), aktualisieren)}
    </div>`
  }
  if (lage === 'klaerung') {
    return `<div class="note amber lauf-notiz-klaerung">
      <strong>${tHtml('lauf.notiz.klaerung.titel')}</strong>
      <p>${tHtml('lauf.notiz.klaerung.grund')}: ${escapeHtml(laufStatus?.grund ?? '')}</p>
      ${zeile(aktionsKnopf('terminal-oeffnen', 'lauf.aktion.klaerung', 'primary', true), fortsetzen(false), aktualisieren)}
    </div>`
  }
  if (lage === 'rueckfrage') {
    return `<div class="note amber lauf-notiz-rueckfrage">
      <strong>${tHtml('lauf.notiz.rueckfrage.titel')}</strong>
      <p>${tHtml('lauf.notiz.rueckfrage.text')}</p>
      <ul class="lauf-daten">
        <li><code>bypass_verdacht_anzahl</code> ${escapeHtml(String(verweigertDaten?.bypassVerdachtAnzahl))}</li>
        <li><code>is_error</code> ${escapeHtml(String(verweigertDaten?.isError))}</li>
        <li><code>non_execution_kind</code> ${escapeHtml(String(verweigertDaten?.nonExecutionKind))}</li>
      </ul>
      ${zeile(aktionsKnopf('antwort-oeffnen', 'lauf.aktion.antwort', 'primary', true), fortsetzen(false), aktualisieren, abbrechen)}
    </div>`
  }
  if (lage === 'laeuft') {
    const stand = geladenAm === null ? '–' : escapeHtml(formatiereDatum(geladenAm, { timeStyle: 'medium' }))
    return `<div class="note lauf-notiz-laeuft">
      <strong>${tHtml('lauf.notiz.laeuft.titel')}</strong>
      <p>${tHtml('lauf.notiz.laeuft.text', {}, { zeit: stand })}</p>
      ${zeile(aktualisieren, abbrechen)}
    </div>`
  }
  const schluessel = lage === 'erfolg' ? 'lauf.notiz.erfolg.titel' : 'lauf.notiz.sonst.titel'
  return `<div class="note lauf-notiz-${lage === 'erfolg' ? 'erfolg' : 'sonst'}">
    <strong>${tHtml(schluessel)}</strong>
    ${zeile(aktualisieren)}
  </div>`
}

// ─── „Was passiert ist“ (G2) ────────────────────────────────────────────────

/**
 * Titel eines Checkpoints: Schlüssel je typ (Wirkungsmarke je Art), sonst der rohe typ.
 * @param cp - ein Checkpoint aus detail.checkpoints
 * @returns Text
 */
export function checkpointTitel(cp) {
  if (cp.typ === 'wirkungsmarke') {
    const schluessel = WIRKUNGSMARKE_SCHLUESSEL[cp.wirkungsmarke?.art]
    return schluessel === undefined ? String(cp.typ) : t(`lauf.passiert.typ.${schluessel}`)
  }
  const schluessel = TYP_SCHLUESSEL[cp.typ]
  return schluessel === undefined ? String(cp.typ ?? '') : t(`lauf.passiert.typ.${schluessel}`)
}

/**
 * Die Checkpoint-Kette als Timeline in Reihenfolge der Sequenz: Titel je typ, darunter
 * lineage.beschreibung roh (bei ungültigen Einträgen die Gründe), Meta mit Zeit, Ergebnis und Artefakt.
 * Punkt rot bei ungültig, bernstein bei stale und beim letzten Eintrag eines nicht erfolgreichen Laufs.
 * @param checkpoints - detail.checkpoints
 * @param erfolgreich - true, wenn der Lauf ERFOLGREICH abgeschlossen ist
 * @returns HTML
 */
export function renderWasPassiertIst(checkpoints, erfolgreich = false) {
  if (!Array.isArray(checkpoints) || checkpoints.length === 0) return `<p class="subtle ablauf-leer">${tHtml('lauf.passiert.leer')}</p>`
  const geordnet = [...checkpoints].sort((a, b) => (Number(a.sequenz) || 0) - (Number(b.sequenz) || 0))
  const eintraege = geordnet.map((cp, index) => {
    const letzter = index === geordnet.length - 1
    let klasse = 'done'
    if (cp.gueltig === false) klasse = 'fehler'
    else if (cp.stale?.stale === true || (letzter && !erfolgreich)) klasse = 'current'
    const unterzeile = cp.gueltig === false ? (cp.gruende ?? []).join('; ') : (cp.lineage?.beschreibung ?? '')
    const meta = [zeitHtml(cp.zeitstempel, { timeStyle: 'short' }), tHtml('lauf.passiert.sequenz', { nummer: cp.sequenz })]
    if (cp.wirkungsmarke?.ergebnis) meta.push(escapeHtml(cp.wirkungsmarke.ergebnis))
    if (cp.lineage?.artefaktId) meta.push(`${tHtml('lauf.passiert.artefakt')} <code>${escapeHtml(cp.lineage.artefaktId)}</code>`)
    if (cp.stale?.stale === true) meta.push(tHtml('lauf.passiert.stale'))
    return `<li class="${klasse}">
      <h3>${escapeHtml(checkpointTitel(cp))}</h3>
      ${unterzeile ? `<p>${escapeHtml(unterzeile)}</p>` : ''}
      <small>${meta.join(' · ')}</small>
    </li>`
  })
  return `<ol class="timeline">${eintraege.join('')}</ol>`
}

// ─── „Einordnung“ ───────────────────────────────────────────────────────────

/**
 * Die Spalte „Einordnung“: Auftrag, Rolle (Kontextpaket), Worker (Laufakte, lesbar), Ergebnis, Zeit.
 * @param detail - Antwort von GET /api/laeufe/<laufId>
 * @returns HTML
 */
export function renderEinordnung(detail) {
  const auftrag = detail.auftrag?.status === 'ok' ? escapeHtml(detail.auftrag.titel ?? '') : `<span class="unbekannt">${tHtml('lauf.einordnung.keinAuftrag')}</span>`
  const rolle = detail.kontextpaket?.status === 'ok' && detail.kontextpaket.rolle ? escapeHtml(rollenName(detail.kontextpaket.rolle)) : '–'
  const worker = detail.laufakte?.status === 'ok' && detail.laufakte.worker ? escapeHtml(workerName(detail.laufakte.worker)) : '–'
  const gueltige = (detail.checkpoints ?? []).filter((cp) => cp.gueltig !== false && typeof cp.zeitstempel === 'string')
  const zeit = gueltige.length === 0 ? zeitHtml(null) : zeitHtml(gueltige.at(-1).zeitstempel)
  return `<h3>${tHtml('lauf.einordnung.titel')}</h3>
    <dl>
      <dt>${tHtml('lauf.einordnung.auftrag')}</dt><dd>${auftrag}</dd>
      <dt>${tHtml('lauf.einordnung.rolle')}</dt><dd>${rolle}</dd>
      <dt>${tHtml('lauf.einordnung.worker')}</dt><dd>${worker}</dd>
      <dt>${tHtml('lauf.einordnung.ergebnis')}</dt><dd>${laufStatusBadge(detail.laufStatus, detail.aktiv)}</dd>
      <dt>${tHtml('lauf.einordnung.zeit')}</dt><dd>${zeit}</dd>
    </dl>`
}

// ─── Aufklappbereiche (G4, G5) ──────────────────────────────────────────────

/** Text je Nicht-ok-Status; ein unbekannter Status erscheint roh. @param status - Status @param texte - Texte je Status @returns Text */
function unbekanntStatusText(status, texte) {
  return texte[status] ?? status
}

/**
 * Auftrag des Laufs (Titel und Auftragstext roh), sonst der Grund, warum es keinen gibt.
 * @param auftrag - detail.auftrag
 * @returns HTML
 */
export function renderAuftrag(auftrag) {
  if (auftrag.status === 'ok') {
    return `<div class="detail-block"><h3>${tHtml('lauf.auftrag.mitTitel', { titel: auftrag.titel ?? '' })}</h3><p>${escapeHtml(auftrag.auftragstext ?? '')}</p></div>`
  }
  const texte = {
    kein_auftragsbezug: t('lauf.auftrag.keinAuftragsbezug'),
    kontextpaket_fehlt: t('lauf.auftrag.kontextpaketFehlt'),
    auftrag_fehlt: t('lauf.auftrag.auftragFehlt', { auftragId: auftrag.auftragId ?? '' }),
  }
  return `<div class="detail-block"><h3>${tHtml('lauf.auftrag.ueberschrift')}</h3><p class="unbekannt">${escapeHtml(unbekanntStatusText(auftrag.status, texte))}</p></div>`
}

/**
 * Kontextpaket (Rolle, Elemente, ausgeschlossene Pfade) — Pfade und Gründe roh.
 * @param kontextpaket - detail.kontextpaket
 * @returns HTML
 */
export function renderKontextpaket(kontextpaket) {
  if (kontextpaket.status !== 'ok') {
    return `<div class="detail-block"><h3>${tHtml('lauf.kontext.ueberschrift')}</h3><p class="unbekannt">${tHtml('lauf.kontext.fehlt')}</p></div>`
  }
  const elemente =
    kontextpaket.elemente.length === 0
      ? `<p class="leer">${tHtml('lauf.kontext.leer')}</p>`
      : `<ul>${kontextpaket.elemente.map((e) => `<li><code>${escapeHtml(e.pfad)}</code>${e.zitierter_bereich ? ` (${escapeHtml(e.zitierter_bereich)})` : ''}</li>`).join('')}</ul>`
  const ausgeschlossen =
    kontextpaket.ausgeschlossen.length === 0
      ? ''
      : `<details><summary>${tHtml('lauf.kontext.ausgeschlossen', { anzahl: kontextpaket.ausgeschlossen.length })}</summary><ul>${kontextpaket.ausgeschlossen.map((a) => `<li><code>${escapeHtml(a.pfad)}</code> (${escapeHtml(a.grund)})</li>`).join('')}</ul></details>`
  return `<div class="detail-block"><h3>${tHtml('lauf.kontext.titel', { rolle: kontextpaket.rolle ?? '' })}</h3>${elemente}${ausgeschlossen}</div>`
}

/**
 * Worker und deklariertes Modell vor dem beobachteten Modell (F16 AK12) — beide Modellzeilen nennen
 * ihren Rang. F36 WS-4 (AK8): Zeile „Beobachtung“ (geladen/aufgerufen). Werte roh.
 * @param laufakte - detail.laufakte
 * @returns HTML
 */
export function renderLaufakte(laufakte) {
  if (laufakte.status !== 'ok') {
    return `<div class="detail-block"><h3>${tHtml('lauf.laufakte.titel')}</h3><p class="unbekannt">${tHtml('lauf.laufakte.fehlt')}</p></div>`
  }
  const unbekannt = `<span class="unbekannt">${tHtml('lauf.laufakte.unbekannt')}</span>`
  return `<div class="detail-block"><h3>${tHtml('lauf.laufakte.titel')}</h3><div class="ablauf-tabelle"><table class="lauf-kopfdaten"><tbody>
    <tr><th>${tHtml('lauf.laufakte.worker')}</th><td>${laufakte.worker ? escapeHtml(laufakte.worker) : unbekannt}</td></tr>
    <tr><th>${tHtml('lauf.laufakte.modellDeklariert')}</th><td>${laufakte.modellDeklariert ? escapeHtml(laufakte.modellDeklariert) : unbekannt}</td></tr>
    <tr><th>${tHtml('lauf.laufakte.modellBeobachtet')}</th><td>${laufakte.modellBeobachtet ? escapeHtml(laufakte.modellBeobachtet) : unbekannt}</td></tr>
    <tr><th>${tHtml('lauf.laufakte.basis')}</th><td>${laufakte.beobachtungsbasisVollstaendig ? tHtml('lauf.ja') : tHtml('lauf.nein')}</td></tr>
    <tr><th>${tHtml('lauf.laufakte.arbeitsverzeichnis')}</th><td><code>${escapeHtml(laufakte.arbeitsverzeichnisPfad ?? '')}</code></td></tr>
    <tr><th>${tHtml('lauf.laufakte.beobachtung')}</th><td class="lauf-beobachtung">${laufakte.beobachtung ? escapeHtml(formatiereBeobachtung(laufakte.beobachtung)) : `<span class="unbekannt">${tHtml('lauf.laufakte.nichtBeobachtet')}</span>`}</td></tr>
  </tbody></table></div></div>`
}

/**
 * Klärzustand unverfälscht sichtbar (F13 WS-1 AK2), im Technischen Protokoll. F-828: ein aktiver Lauf
 * steht bis zur Terminalmarke auf KLAERUNG_ERFORDERLICH („RUN_PREPARED ohne Terminalartefakt“) — das
 * ist keine Klärungslage, angezeigt wird „läuft“ (nur ohne Terminalmarke, also nicht bei ABGESCHLOSSEN).
 * @param laufStatus - detail.laufStatus
 * @param verweigertDaten - detail.verweigertDaten (null außer bei ABGESCHLOSSEN/VERWEIGERT)
 * @param aktiv - detail.aktiv
 * @returns HTML
 */
export function renderLaufStatus(laufStatus, verweigertDaten, aktiv = false) {
  if (aktiv === true && laufStatus.status !== 'ABGESCHLOSSEN') return `<div class="detail-block"><h3>${tHtml('lauf.klaer.titelLaeuft')}</h3><p>${tHtml('lauf.klaer.laeuftText')}</p></div>`
  if (laufStatus.status === 'KLAERUNG_ERFORDERLICH') {
    return `<div class="detail-block"><h3>${tHtml('lauf.klaer.titelKlaerung')}</h3><div class="ablauf-tabelle"><table class="lauf-kopfdaten"><tbody>
      <tr><th>${tHtml('lauf.klaer.blockerId')}</th><td><code>${escapeHtml(laufStatus.blockerId)}</code></td></tr>
      <tr><th>${tHtml('lauf.klaer.grund')}</th><td>${escapeHtml(laufStatus.grund)}</td></tr>
      <tr><th>${tHtml('lauf.klaer.aufloesung')}</th><td>${escapeHtml(laufStatus.aufloesungsbedingung)}</td></tr>
      <tr><th>${tHtml('lauf.klaer.resumeZiel')}</th><td>${escapeHtml(laufStatus.resumeZiel)}</td></tr>
      <tr><th>${tHtml('lauf.klaer.offeneSequenzen')}</th><td>${laufStatus.evidenz?.offeneRunPreparedSequenzen?.length ?? 0}</td></tr>
    </tbody></table></div></div>`
  }
  if (laufStatus.status === 'ABGESCHLOSSEN' && laufStatus.ergebnis === 'VERWEIGERT') {
    const vd = verweigertDaten ?? { bypassVerdachtAnzahl: 'unbekannt', isError: 'unbekannt', nonExecutionKind: 'unbekannt' }
    return `<div class="detail-block"><h3>${tHtml('lauf.klaer.titelVerweigert')}</h3><div class="ablauf-tabelle"><table class="lauf-kopfdaten"><tbody>
      <tr><th>bypass_verdacht_anzahl</th><td>${escapeHtml(String(vd.bypassVerdachtAnzahl))}</td></tr>
      <tr><th>is_error</th><td>${escapeHtml(String(vd.isError))}</td></tr>
      <tr><th>non_execution_kind</th><td>${escapeHtml(String(vd.nonExecutionKind))}</td></tr>
    </tbody></table></div></div>`
  }
  const wert = laufStatus.status === 'ABGESCHLOSSEN' ? `${laufStatus.status} (${laufStatus.ergebnis})` : laufStatus.status
  return `<div class="detail-block"><h3>${tHtml('lauf.klaer.titel')}</h3><p>${escapeHtml(wert)}</p></div>`
}

/**
 * Rohstrom-Projektion (AK8): bei hash_weicht_ab & Co. nur der Grund, sonst Exit-Code, Startfehler,
 * Permission Denials und Längen — Werte roh.
 * @param rohstrom - detail.rohstrom
 * @returns HTML
 */
export function renderRohstrom(rohstrom) {
  const texte = {
    hash_weicht_ab: t('lauf.rohstrom.hashWeichtAb'),
    nicht_verfuegbar: t('lauf.rohstrom.nichtVerfuegbar'),
    nicht_parsebar: t('lauf.rohstrom.nichtParsebar'),
    laufakte_fehlt: t('lauf.rohstrom.laufakteFehlt'),
  }
  if (rohstrom.status !== 'ok') {
    return `<div class="detail-block"><h3>${tHtml('lauf.rohstrom.titel')}</h3><p class="unbekannt">${escapeHtml(unbekanntStatusText(rohstrom.status, texte))}</p></div>`
  }
  const ergebnisobjekt = rohstrom.ergebnisobjekt
  const permission =
    ergebnisobjekt?.status === 'ok'
      ? `${escapeHtml(String(ergebnisobjekt.permissionDenials.anzahl))}${ergebnisobjekt.permissionDenials.toolNamen.length > 0 ? ` (${ergebnisobjekt.permissionDenials.toolNamen.map(escapeHtml).join(', ')})` : ''}`
      : `<span class="unbekannt">${tHtml('lauf.rohstrom.keinErgebnisobjekt')}</span>`
  const exitCode = rohstrom.exitCode !== null && rohstrom.exitCode !== undefined ? escapeHtml(String(rohstrom.exitCode)) : (rohstrom.ergebnisZeileVorProzessende === true ? tHtml('lauf.rohstrom.vorProzessende') : `<span class="unbekannt">${tHtml('lauf.laufakte.unbekannt')}</span>`)
  return `<div class="detail-block"><h3>${tHtml('lauf.rohstrom.titel')}</h3><div class="ablauf-tabelle"><table class="lauf-kopfdaten"><tbody>
    <tr><th>${tHtml('lauf.rohstrom.exitCode')}</th><td>${exitCode}</td></tr>
    <tr><th>${tHtml('lauf.rohstrom.startfehler')}</th><td>${rohstrom.startfehler ? escapeHtml(JSON.stringify(rohstrom.startfehler)) : '—'}</td></tr>
    <tr><th>${tHtml('lauf.rohstrom.permission')}</th><td>${permission}</td></tr>
    <tr><th>${tHtml('lauf.rohstrom.stdout')}</th><td>${escapeHtml(String(rohstrom.stdoutLaenge ?? '—'))}</td></tr>
    <tr><th>${tHtml('lauf.rohstrom.stderr')}</th><td>${escapeHtml(String(rohstrom.stderrLaenge ?? '—'))}</td></tr>
  </tbody></table></div></div>`
}

/** Gültigkeits-Zelle einer Checkpoint-Zeile. @param cp - Checkpoint @returns HTML */
function gueltigZelle(cp) {
  if (cp.gueltig) return `<span class="badge ok">${tHtml('lauf.checkpoints.gueltig')}</span>`
  const gruende = (cp.gruende ?? []).join('; ')
  return `<span class="badge fehler" title="${escapeHtml(gruende)}">${tHtml('lauf.checkpoints.ungueltig')}</span><div class="grund">${escapeHtml(gruende)}</div>`
}

/** Stale-Zelle einer Checkpoint-Zeile. @param cp - Checkpoint @returns HTML */
function staleZelle(cp) {
  if (!cp.stale) return ''
  if (cp.stale.stale) return `<span class="badge stale" title="${escapeHtml((cp.stale.geaenderteEingaben ?? []).join('; '))}">STALE</span>`
  return `<span class="badge aktuell">${tHtml('lauf.checkpoints.aktuell')}</span>`
}

/** Eine Zeile der Checkpoint-Tabelle (alle Felder roh). @param cp - Checkpoint @returns HTML */
function checkpointZeile(cp) {
  const lin = cp.lineage ?? {}
  const wm = cp.wirkungsmarke ?? {}
  return `<tr>
    <td>${escapeHtml(String(cp.sequenz))}</td>
    <td>${cp.zeitstempel ? escapeHtml(cp.zeitstempel) : `<span class="unbekannt">${tHtml('ausfuehrung.zeitUnbekannt')}</span>`}</td>
    <td>${gueltigZelle(cp)}</td>
    <td>${escapeHtml(cp.typ)}</td>
    <td>${escapeHtml(lin.art ?? '')}</td>
    <td>${escapeHtml(lin.erzeugungsart ?? '')}</td>
    <td>${escapeHtml(lin.artefaktId ?? '')}</td>
    <td>${escapeHtml(lin.entscheidung ?? '')}</td>
    <td>${lin.beziehtSichAuf ? escapeHtml(`sequenz ${lin.beziehtSichAuf.sequenz}`) : ''}</td>
    <td>${staleZelle(cp)}</td>
    <td>${escapeHtml(lin.beschreibung ?? '')}</td>
    <td>${escapeHtml(lin.transportStatus ?? wm.art ?? '')}</td>
    <td>${escapeHtml(lin.executor ?? '')}</td>
    <td>${escapeHtml(wm.ergebnis ?? '')}</td>
  </tr>`
}

/** Spalten der Checkpoint-Tabelle (Schlüssel lauf.checkpoints.spalte.*). */
const CHECKPOINT_SPALTEN = ['sequenz', 'zeit', 'status', 'typ', 'lineageArt', 'erzeugungsart', 'artefaktId', 'entscheidung', 'beziehtSichAuf', 'stale', 'aufgabe', 'transportStatus', 'executor', 'ergebnis']

/**
 * Die Checkpoint-Kette als Tabelle (Technisches Protokoll), samt Kettenintegrität und Zahl der gültigen
 * Checkpoints — beide aus den Kopfdaten des Servers (GET /api/laeufe, sammleLaufKopfdaten), nicht vom
 * Client errechnet; ohne Kopfdaten (Lauf noch nicht im Aggregat) „unbekannt“.
 * @param checkpoints - detail.checkpoints
 * @param kopfdaten - Eintrag aus zustand.laeufe ({ kettenintegritaet, anzahlCheckpoints }) oder null
 * @returns HTML
 */
export function renderCheckpointTabelle(checkpoints, kopfdaten = null) {
  const kopf = `<tr>${CHECKPOINT_SPALTEN.map((s) => `<th>${tHtml(`lauf.checkpoints.spalte.${s}`)}</th>`).join('')}</tr>`
  const unbekannt = `<span class="unbekannt">${tHtml('lauf.laufakte.unbekannt')}</span>`
  let integritaet = unbekannt
  if (kopfdaten?.kettenintegritaet === true) integritaet = `<span class="badge ok">${tHtml('lauf.ja')}</span>`
  if (kopfdaten?.kettenintegritaet === false) integritaet = `<span class="badge fehler">${tHtml('lauf.nein')}</span>`
  const anzahl = typeof kopfdaten?.anzahlCheckpoints === 'number' ? escapeHtml(String(kopfdaten.anzahlCheckpoints)) : unbekannt
  const tabelle =
    !Array.isArray(checkpoints) || checkpoints.length === 0
      ? `<p class="leer">${tHtml('lauf.passiert.leer')}</p>`
      : `<div class="ablauf-tabelle"><table class="lauf-kopfdaten lauf-checkpoints"><thead>${kopf}</thead><tbody>${checkpoints.map(checkpointZeile).join('')}</tbody></table></div>`
  return `<div class="detail-block"><h3>${tHtml('lauf.checkpoints.titel')}</h3><p>${tHtml('lauf.checkpoints.integritaet')}: ${integritaet} · ${tHtml('lauf.checkpoints.anzahl')}: ${anzahl}</p>${tabelle}</div>`
}

/**
 * „Tatsächlich verwendete Fähigkeiten“ (G5, V*): die Beobachtung der Laufakte (geladen/aufgerufen), echt.
 * @param laufakte - detail.laufakte
 * @returns HTML
 */
export function renderFaehigkeiten(laufakte) {
  const beobachtung = laufakte?.status === 'ok' && laufakte.beobachtung ? formatiereBeobachtung(laufakte.beobachtung) : ''
  const wert = beobachtung ? escapeHtml(beobachtung) : `<span class="unbekannt">${tHtml('lauf.laufakte.nichtBeobachtet')}</span>`
  return `<p class="subtle">${tHtml('lauf.faehigkeiten.hinweis')}</p><p class="lauf-beobachtung"><strong>${tHtml('lauf.laufakte.beobachtung')}:</strong> ${wert}</p>`
}

/**
 * Inhalte der vier Aufklappbereiche (G4, G5).
 * @param detail - Antwort von GET /api/laeufe/<laufId>
 * @param kopfdaten - Eintrag aus zustand.laeufe oder null (Kettenintegrität, Zahl der Checkpoints)
 * @returns { auftrag, herkunft, protokoll, faehigkeiten } als HTML
 */
export function renderAufklappInhalte(detail, kopfdaten = null) {
  return {
    auftrag: renderAuftrag(detail.auftrag ?? { status: 'kontextpaket_fehlt' }) + renderKontextpaket(detail.kontextpaket ?? { status: 'nicht_vorhanden' }),
    herkunft: renderLaufakte(detail.laufakte ?? { status: 'nicht_vorhanden' }),
    protokoll: [renderLaufStatus(detail.laufStatus, detail.verweigertDaten, detail.aktiv), renderRohstrom(detail.rohstrom ?? { status: 'laufakte_fehlt' }), renderCheckpointTabelle(detail.checkpoints, kopfdaten)].join(''),
    faehigkeiten: renderFaehigkeiten(detail.laufakte),
  }
}

// ─── Dialog #lauf-dialog (G6, G8, F7, G9) ───────────────────────────────────

/** Kopf eines Dialogs mit Titel und Schließen-Kreuz. @param titelSchluessel - i18n-Schlüssel @returns HTML */
function dialogKopf(titelSchluessel) {
  return `<div class="dialog-heading"><h2 id="lauf-dialog-titel">${tHtml(titelSchluessel)}</h2><button type="button" class="icon-button lauf-dialog-abbrechen" aria-label="${tHtml('ablauf.dialog.schliessen')}">${KREUZ}</button></div>`
}

/** Fuß eines Dialogs: Abbrechen, Hauptaktion, Meldung (kein aria-live, der Fokus geht auf sie). @param hauptaktion - HTML @param abbrechenSchluessel - Beschriftung des Abbrechen-Knopfs @returns HTML */
function dialogFuss(hauptaktion, abbrechenSchluessel = 'ablauf.dialog.abbrechen') {
  return `<div class="dialog-actions"><button type="button" class="button lauf-dialog-abbrechen">${tHtml(abbrechenSchluessel)}</button>${hauptaktion}</div>
    <p id="lauf-dialog-meldung" class="fehler" tabindex="-1" hidden></p>`
}

/** Auswahlliste mit rohen Werten. @param id - id @param werte - Werte @returns HTML */
function auswahl(id, werte) {
  return `<select id="${id}">${werte.map((w) => `<option value="${escapeHtml(w)}">${escapeHtml(w)}</option>`).join('')}</select>`
}

/** Pflichtfeld je Dialogart (Abbrechen: keines — der Endpunkt speichert keinen Grund). */
export const LAUF_DIALOG_FELD = {
  kenntnisnahme: 'entscheidung-kenntnisnahme-begruendung',
  terminal: 'entscheidung-terminal-begruendung',
  antwort: 'entscheidung-antwort-text',
  abbrechen: null,
}

/**
 * Inhalt des Dialogs je Art; null, wenn die Art in der Lage nicht angeboten wird (dieselbe Regel wie
 * die Knöpfe der Notiz).
 * @param art - 'kenntnisnahme', 'terminal', 'antwort' oder 'abbrechen'
 * @param stand - { laufId, lage, kenntnisgenommen, aktiv, abbruchAngefordert } — der Abbruch hängt an aktiv
 * @returns HTML oder null
 */
export function renderLaufDialog(art, { laufId, lage, kenntnisgenommen = false, aktiv = lage === 'laeuft', abbruchAngefordert = false }) {
  const kennung = escapeHtml(laufId)
  if (art === 'kenntnisnahme' && lage === 'fehler' && !kenntnisgenommen) {
    return `${dialogKopf('lauf.dialog.kenntnis.titel')}
      <p class="subtle">${tHtml('lauf.dialog.kenntnis.text')} <code>${kennung}</code></p>
      <label class="field" for="entscheidung-kenntnisnahme-begruendung">${tHtml('lauf.dialog.begruendung')}</label>
      <textarea id="entscheidung-kenntnisnahme-begruendung" rows="3" aria-required="true" aria-describedby="lauf-dialog-meldung"></textarea>
      ${dialogFuss(`<button type="button" class="button primary lauf-dialog-aktion" data-aktion="kenntnisnahme">${tHtml('lauf.dialog.kenntnis.bestaetigen')}</button>`)}`
  }
  if (art === 'terminal' && lage === 'klaerung') {
    return `${dialogKopf('lauf.dialog.terminal.titel')}
      <p class="subtle">${tHtml('lauf.dialog.terminal.text')} <code>${kennung}</code></p>
      <label class="field" for="entscheidung-terminal-ergebnis">${tHtml('lauf.dialog.terminal.ergebnis')}</label>
      ${auswahl('entscheidung-terminal-ergebnis', TERMINAL_ERGEBNISSE)}
      <label class="field" for="entscheidung-terminal-begruendung">${tHtml('lauf.dialog.begruendung')}</label>
      <textarea id="entscheidung-terminal-begruendung" rows="3" aria-required="true" aria-describedby="lauf-dialog-meldung"></textarea>
      ${dialogFuss(`<button type="button" id="entscheidung-terminal-speichern" class="button primary lauf-dialog-aktion" data-aktion="terminal">${tHtml('lauf.dialog.terminal.bestaetigen')}</button>`)}`
  }
  if (art === 'antwort' && lage === 'rueckfrage') {
    return `${dialogKopf('lauf.dialog.antwort.titel')}
      <p class="subtle">${tHtml('lauf.dialog.antwort.text')} <code>${kennung}</code></p>
      <label class="field" for="entscheidung-antwort-text">${tHtml('lauf.dialog.antwort.antwort')}</label>
      <textarea id="entscheidung-antwort-text" rows="3" aria-required="true" aria-describedby="lauf-dialog-meldung"></textarea>
      <label class="field" for="entscheidung-antwort-einstufung">${tHtml('lauf.dialog.antwort.einstufung')}</label>
      ${auswahl('entscheidung-antwort-einstufung', ANTWORT_EINSTUFUNGEN)}
      ${dialogFuss(`<button type="button" class="button primary lauf-dialog-aktion" data-aktion="antwort">${tHtml('lauf.dialog.antwort.bestaetigen')}</button>`)}`
  }
  if (art === 'abbrechen' && aktiv === true && !abbruchAngefordert) {
    return `${dialogKopf('lauf.dialog.abbruch.titel')}
      <p class="subtle">${tHtml('lauf.dialog.abbruch.text')} <code>${kennung}</code></p>
      ${dialogFuss(`<button type="button" class="button danger lauf-dialog-aktion" data-aktion="abbrechen">${tHtml('lauf.dialog.abbruch.bestaetigen')}</button>`, 'lauf.dialog.abbruch.zurueck')}`
  }
  return null
}
