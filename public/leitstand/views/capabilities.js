/**
 * Datei: public/leitstand/views/capabilities.js
 *
 * Zweck: View `#/capabilities` — die Werkstatt (F44 WS-7a, Vorlage V10 d_harness_phasen Kopf/Register,
 * d_faehigkeiten, d_faehigkeiten_rollen; Abgleich F-725 J5–J8). Drei clientseitige Register
 * (Harness-Aufbau und Phasen & Rollen als Baustein „kommt“, Fähigkeiten als Standard), darin drei
 * Unterreiter: Werkzeuge (Kacheln mit Suche und Filter), Rollen & Besetzung (Coverage je Rolle mit
 * Gap-Zeilen und lazy geladenen Details) und Empfehlungen (Verweis auf den Freigabeschritt). Jede
 * Darstellung ist eine reine Projektion über GET /api/ressourcen, GET /api/ressourcen/abdeckung und
 * GET /api/ressourcen/rollen/<rolle> (scripts/leitstand-server.mjs, src/capabilities-ansicht/index.ts);
 * die Regeln für Zählung, Filter und Register-Tastatur stehen in ../faehigkeiten-anzeige.js.
 *
 * Kein Poll: Library und Coverage kommen aus Dateien, die sich nur durch
 * Commits ändern (Muster views/workboard.js), die Rollen-Besetzung
 * zusätzlich aus Laufakten, die sich nur durch einen echten Lauf ändern —
 * "Neu laden" deckt beide Fälle ab, ein Timer wäre hier reine Last ohne
 * Nutzen.
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initCapabilitiesView beim Bootstrap)
 *
 * Wichtig: rein lesend außer dem Scout/Vormerken-Weg (F27 WS-2, unten unverändert) — kein
 * Aktivieren oder Freigeben hier; eine Freigabe läuft nur über den F36-Weg im Freigabedialog.
 * Serverwerte (IDs, Capability-Namen, anzeigeGrund, fehltFuerEinsatz, Phasen, Pfade) bleiben roh und
 * gehen durch escapeHtml, nie durch t(). Die Scout-Texte sind bis WS-7b noch deutsch.
 */

import { holeAbdeckung, holeLaufDetail, holeRessourcen, holeRollenBesetzung, legeAuftragAn, routeAuftrag, starteLauf } from '../api.js'
import { FREIGABE_FILTER, filtereWerkzeuge, naechsterRegisterIndex, WERKZEUG_TYPEN, zaehleWerkzeuge } from '../faehigkeiten-anzeige.js'
import { formatiereZahl, t, tHtml } from '../i18n.js'
import { abonniereProjektWechsel } from '../projekt-kontext.js'
import { escapeHtml } from '../render.js'
import { rollenName } from '../rollen-anzeige.js'
import { navigiere, registriere } from '../router.js'
import { ableiteRessourcenId, baueVormerkenAuftragstext } from '../vormerken-auftrag.js'
import { abonniereDetailAuffrischer } from '../zustand.js'

// ─── Register (role=tablist) ─────────────────────────────────────────────

/**
 * Wählt einen Reiter eines Registers: aria-selected, .active und tabindex (nur der gewählte ist
 * per Tab erreichbar), dazu das zugehörige Panel (aria-controls) sichtbar, die übrigen hidden.
 * @param tablist - Element mit role=tablist
 * @param reiter - der zu wählende Reiter (role=tab)
 */
function waehleReiter(tablist, reiter) {
  for (const tab of tablist.querySelectorAll('[role="tab"]')) {
    const gewaehlt = tab === reiter
    tab.setAttribute('aria-selected', String(gewaehlt))
    tab.tabIndex = gewaehlt ? 0 : -1
    tab.classList.toggle('active', gewaehlt)
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !gewaehlt
  }
}

/**
 * Bedienung eines Registers: Klick wählt; Pfeil links/rechts, Pos1 und Ende wählen und fokussieren
 * (automatische Aktivierung, naechsterRegisterIndex). Die Auswahl bleibt für die Sitzung erhalten.
 * @param id - ID des tablist-Elements (index.html)
 */
function initRegister(id) {
  const tablist = document.getElementById(id)
  tablist.addEventListener('click', (ereignis) => {
    const reiter = ereignis.target.closest('[role="tab"]')
    if (reiter !== null && tablist.contains(reiter)) waehleReiter(tablist, reiter)
  })
  tablist.addEventListener('keydown', (ereignis) => {
    const reiter = [...tablist.querySelectorAll('[role="tab"]')]
    const index = reiter.indexOf(ereignis.target)
    if (index === -1) return
    const neu = naechsterRegisterIndex(index, reiter.length, ereignis.key)
    if (neu === null) return
    ereignis.preventDefault()
    waehleReiter(tablist, reiter[neu])
    reiter[neu].focus()
  })
}

// ─── Werkzeuge (J5/J6) ───────────────────────────────────────────────────

/** Zuletzt geladene Antwort von GET /api/ressourcen, oder null — Suche und Filter rechnen clientseitig darauf. */
let letzteLibrary = null

/**
 * Übersetzter Typname; ein unbekannter Typ bleibt roh.
 * @param typ - eintrag.typ
 * @returns Text
 */
function typName(typ) {
  return WERKZEUG_TYPEN.includes(typ) ? t(`werkstatt.typ.${typ}`) : String(typ ?? '')
}

/** Füllt die beiden Filter-Selects (Beschriftung übersetzt, Wert roh); einmalig beim Init. */
function fuelleFilter() {
  document.getElementById('capabilities-suche').placeholder = t('werkstatt.suche.platzhalter')
  document.getElementById('capabilities-filter-typ').innerHTML = [`<option value="">${tHtml('werkstatt.filter.typ.alle')}</option>`, ...WERKZEUG_TYPEN.map((typ) => `<option value="${escapeHtml(typ)}">${escapeHtml(typName(typ))}</option>`)].join('')
  document.getElementById('capabilities-filter-freigabe').innerHTML = FREIGABE_FILTER.map((wert) => `<option value="${wert}">${tHtml(wert === '' ? 'werkstatt.filter.freigabe.alle' : `werkstatt.freigabe.${wert}`)}</option>`).join('')
}

/**
 * Inhalt des Feldes „Fehlt für Einsatz“ (F36 WS-1, fehltFuerEinsatz aus src/ressourcen) — leer heißt einsatzbereit.
 * @param fehlt - eintrag.fehltFuerEinsatz
 * @returns HTML
 */
function fehltFuerEinsatzHtml(fehlt) {
  if (!Array.isArray(fehlt) || fehlt.length === 0) return tHtml('werkstatt.detail.nichts')
  return fehlt.map((f) => `<span class="werkzeug-fehlt">${escapeHtml(f)}</span>`).join('')
}

/**
 * Text eines Serverfelds als HTML; leer oder fehlend erscheint als „—“ (wie leere Phasen).
 * @param wert - Feldwert
 * @returns HTML
 */
function textOderStrich(wert) {
  return typeof wert === 'string' && wert !== '' ? escapeHtml(wert) : '—'
}

/**
 * Eine Kachel: Typ-Chip, Name, Beschreibung, Fuß mit Freigabe und Verfügbarkeit, Detailklappe mit
 * ID, Phasen, Grund und „Fehlt für Einsatz“ (alle roh). Farben nur aus .ablauf-status: freigegeben
 * mint, Freigabe offen bernstein, Verfügbarkeit gedämpft (rot bliebe Fehlern vorbehalten, Vorlage
 * „Nicht verbunden“). „Details“ trägt den Namen für Screenreader mit (42 gleichnamige Klappen).
 * @param eintrag - LibraryEintrag
 * @returns HTML
 */
function werkzeugKachel(eintrag) {
  const freigegeben = eintrag.freigabe === 'FREIGEGEBEN'
  const name = typeof eintrag.name === 'string' && eintrag.name !== '' ? eintrag.name : eintrag.id
  const phasen = Array.isArray(eintrag.phasen) && eintrag.phasen.length > 0 ? eintrag.phasen.map(escapeHtml).join(', ') : '—'
  return `<article class="werkzeug-karte">
    <div class="werkzeug-karte-kopf"><span class="werkzeug-typ">${escapeHtml(typName(eintrag.typ))}</span></div>
    <h3>${escapeHtml(name)}</h3>
    <p class="werkzeug-beschreibung">${textOderStrich(eintrag.beschreibung)}</p>
    <div class="werkzeug-fuss">
      <span class="ablauf-status${freigegeben ? '' : ' warten'}">${tHtml(freigegeben ? 'werkstatt.freigabe.freigegeben' : 'werkstatt.freigabe.offen')}</span>
      <span class="ablauf-status neutral">${tHtml(eintrag.verfuegbar === true ? 'werkstatt.verfuegbar' : 'werkstatt.nichtVerfuegbar')}</span>
    </div>
    <details class="werkzeug-detail">
      <summary>${tHtml('werkstatt.detail')}<span class="sr-only">: ${escapeHtml(name)}</span></summary>
      <dl>
        <dt>${tHtml('werkstatt.detail.id')}</dt><dd><code>${escapeHtml(eintrag.id)}</code></dd>
        <dt>${tHtml('werkstatt.detail.phasen')}</dt><dd>${phasen}</dd>
        <dt>${tHtml('werkstatt.detail.grund')}</dt><dd>${textOderStrich(eintrag.anzeigeGrund)}</dd>
        <dt>${tHtml('werkstatt.detail.fehlt')}</dt><dd>${fehltFuerEinsatzHtml(eintrag.fehltFuerEinsatz)}</dd>
      </dl>
    </details>
  </article>`
}

/** Liest Suche und Filter aus den Bedienelementen. @returns { suche, typ, freigabe } */
function aktuellerFilter() {
  return {
    suche: document.getElementById('capabilities-suche').value,
    typ: document.getElementById('capabilities-filter-typ').value,
    freigabe: document.getElementById('capabilities-filter-freigabe').value,
  }
}

/** Rendert die Kacheln aus letzteLibrary nach Suche und Filter; eigener Leerzustand für „keine Treffer“. */
function renderWerkzeugKacheln() {
  const container = document.getElementById('capabilities-library')
  if (letzteLibrary === null) return
  const eintraege = Array.isArray(letzteLibrary.eintraege) ? letzteLibrary.eintraege : []
  if (eintraege.length === 0) {
    container.innerHTML = `<p class="leer">${tHtml('werkstatt.leer.katalog')}</p>`
    return
  }
  const treffer = filtereWerkzeuge(eintraege, aktuellerFilter())
  container.innerHTML = treffer.length === 0 ? `<p class="leer">${tHtml('werkstatt.leer.treffer')}</p>` : `<div class="werkzeug-raster">${treffer.map(werkzeugKachel).join('')}</div>`
}

/**
 * AK5/AK6: Kennzahlzeile, Kacheln, ASSESSED-Hinweis (roh, bleibt sichtbar — ASSESSED trägt in v1 nie ein
 * Badge, kein stilles Verschwinden dieser Phase) und Startvorlagenpfad in der Technik-Klappe.
 * @param ansicht - Antwort von GET /api/ressourcen
 */
function renderLibrary(ansicht) {
  letzteLibrary = ansicht
  const zahlen = zaehleWerkzeuge(ansicht.eintraege)
  document.getElementById('capabilities-kennzahlen').innerHTML = ['katalog', 'freigegeben', 'offen']
    .map((art) => `<span>${tHtml(`werkstatt.kennzahl.${art}`, { anzahl: zahlen[art], zahl: formatiereZahl(zahlen[art]) })}</span>`)
    .join('<span aria-hidden="true"> · </span>')
  renderWerkzeugKacheln()
  document.getElementById('capabilities-assessed').innerHTML = `<span class="badge stale">ASSESSED</span> ${escapeHtml(ansicht.assessedHinweis ?? '')}`
  document.getElementById('capabilities-startvorlage').innerHTML = tHtml('werkstatt.startvorlage', {}, { pfad: `<code>${escapeHtml(ansicht.startvorlagePfad ?? '')}</code>` })
}

/** Suche und Filter rechnen bei jeder Eingabe neu (kein Netzabruf). */
function initWerkzeugBedienung() {
  fuelleFilter()
  document.getElementById('capabilities-suche').addEventListener('input', renderWerkzeugKacheln)
  document.getElementById('capabilities-filter-typ').addEventListener('change', renderWerkzeugKacheln)
  document.getElementById('capabilities-filter-freigabe').addEventListener('change', renderWerkzeugKacheln)
}

// ─── Rollen & Besetzung: Coverage (J8) ──────────────────────────────────

/** Rollen, deren Details gerade offen sind — nach „Neu laden“ öffnet renderAbdeckung sie wieder und lädt neu. */
const offeneRollen = new Set()

/**
 * Gap-Zeile eines Workers im Rollenblock: Status (gedeckt mint, Gap bernstein), F-346-Ausnahme, fehlende
 * Capabilities und — nur bei echter Lücke — „Zum Workboard“ und „Kandidaten suchen“ (F27 WS-2, Klassen und
 * data-Attribute unverändert, die Klick-Delegation in initAbdeckungBedienung liest sie).
 * @param rolle - Rollen-ID
 * @param eintrag - WorkerAbdeckungsLuecke
 * @returns HTML
 */
function workerAbdeckungZeile(rolle, eintrag) {
  const status = eintrag.restFehlend.length === 0 ? `<span class="ablauf-status">${tHtml('werkstatt.worker.gedeckt')}</span>` : `<span class="ablauf-status warten">${tHtml('werkstatt.worker.gap')}</span>`
  const f346 = eintrag.f346Ausnahme ? ` <span class="badge stale">${tHtml('werkstatt.worker.f346')}</span>` : ''
  const fehlendText = eintrag.restFehlend.length > 0 ? `<p class="werkstatt-gap-fehlt">${tHtml('werkstatt.worker.fehlt', { capabilities: eintrag.restFehlend.join(', ') })}</p>` : ''
  // F27 WS-2 (AK10): "Kandidaten suchen" nur an einer echten Gap-Zeile, neben dem bestehenden
  // Workboard-Link — data-capabilities trägt restFehlend als JSON (Klick-Handler braucht sie
  // unverändert, keine zweite Herleitung).
  const scoutLink =
    eintrag.restFehlend.length > 0
      ? `<div class="werkstatt-gap-aktionen"><button type="button" class="button capabilities-gap-link" data-rolle="${escapeHtml(rolle)}">${tHtml('werkstatt.worker.zumWorkboard')}</button> <button type="button" class="button primary capabilities-scout-link" data-rolle="${escapeHtml(rolle)}" data-capabilities="${escapeHtml(JSON.stringify(eintrag.restFehlend))}">${tHtml('werkstatt.worker.kandidaten')}</button></div>`
      : ''
  return `<div class="werkstatt-gap-zeile">
    <div class="werkstatt-gap-kopf"><code>${escapeHtml(eintrag.worker)}</code> ${status}${f346}</div>
    ${fehlendText}${scoutLink}
  </div>`
}

/**
 * Block einer Rolle: Name (rollenName), Chip gedeckt/Gap offen, benötigte Capabilities (roh), „Details“ und
 * darunter die Gap-Zeilen je Worker und der (zunächst verborgene) Detail-Container.
 * @param eintrag - AbdeckungsEintrag
 * @param index - Position in der Liste; bildet die IDs von Überschrift und Detail-Container (die Rollen-ID
 *   selbst ist Serverinhalt und taugt nicht ungeprüft als ID)
 * @returns HTML
 */
function abdeckungBlock(eintrag, index) {
  const statusChip = eintrag.gedeckt ? `<span class="ablauf-status">${tHtml('werkstatt.rolle.gedeckt')}</span>` : `<span class="ablauf-status warten">${tHtml('werkstatt.rolle.gap')}</span>`
  const zeilen = eintrag.workerAbdeckung.length === 0 ? `<p class="unbekannt">${tHtml('werkstatt.rolle.keinWorker')}</p>` : eintrag.workerAbdeckung.map((w) => workerAbdeckungZeile(eintrag.rolle, w)).join('')
  const detailId = `capabilities-rollen-detail-${index}`
  return `<div class="werkstatt-rolle" data-rolle="${escapeHtml(eintrag.rolle)}">
    <div class="werkstatt-rolle-zeile">
      <div class="werkstatt-rolle-text">
        <h3 id="capabilities-rolle-titel-${index}">${escapeHtml(rollenName(eintrag.rolle))}</h3>
        <p>${tHtml('werkstatt.rolle.benoetigt', { capabilities: eintrag.benoetigteCapabilities.join(', ') })}</p>
      </div>
      <div class="werkstatt-rolle-ende">
        ${statusChip}
        <button type="button" class="button capabilities-rolle-details" data-rolle="${escapeHtml(eintrag.rolle)}" aria-expanded="false" aria-controls="${detailId}" aria-describedby="capabilities-rolle-titel-${index}">${tHtml('werkstatt.rolle.details')}</button>
      </div>
    </div>
    <div class="werkstatt-gaps">${zeilen}</div>
    <div id="${detailId}" class="werkstatt-rollen-detail" hidden></div>
  </div>`
}

/** AK2/AK3: Coverage je Rolle, F-346-Ausnahmen markiert (workerAbdeckungZeile), echte Gaps verlinken zum Workboard. @param ansicht - Antwort von GET /api/ressourcen/abdeckung */
function renderAbdeckung(ansicht) {
  const container = document.getElementById('capabilities-abdeckung')
  container.innerHTML = ansicht.rollen.length === 0 ? `<p class="leer">${tHtml('werkstatt.rollen.leer')}</p>` : ansicht.rollen.map(abdeckungBlock).join('')
  // Offene Details bleiben über ein Neuladen offen (frisch geladen); verschwundene Rollen fallen weg.
  const vorhandene = new Set(ansicht.rollen.map((r) => r.rolle))
  for (const rolle of [...offeneRollen]) {
    const knopf = [...container.querySelectorAll('.capabilities-rolle-details')].find((k) => k.dataset.rolle === rolle)
    if (vorhandene.has(rolle) && knopf !== undefined) void oeffneRollenDetail(knopf)
    else offeneRollen.delete(rolle)
  }
  // Neu gebaute Buttons kennen scoutZustand nicht von selbst — Sperrzustand nachtragen (siehe
  // aktualisiereScoutButtonZustand, Code-Review-Befund F27 WS-2: sonst wäre ein Neuladen der
  // Coverage-Tabelle während eines laufenden Scout-Laufs ein Schlupfloch für einen zweiten Lauf).
  aktualisiereScoutButtonZustand()
}

/**
 * AK3: "Gap-Einträge verlinken zum Workboard" — bewusst ein reiner
 * Routenwechsel zu `#/workboard`, kein Deep-Link/Filter auf die konkrete
 * Rolle oder Capability. Das Workboard (F21) kennt heute keine
 * Capability-Gaps als eigene Workitem-Quelle und filtert nur nach
 * typ/status/prioritaet (src/workboard/index.ts) — eine tiefere Verlinkung
 * wäre F21-Scope, nicht F24 (QA-Pass 16.09.2026, dokumentiert statt
 * stillschweigend belassen, CLAUDE.md-Entscheidungsregel Punkt 5).
 * F44 WS-7a: dieselbe Delegation bedient auch „Details“ je Rolle (umschaltRollenDetail).
 */
function initAbdeckungBedienung() {
  document.getElementById('capabilities-abdeckung').addEventListener('click', (ereignis) => {
    if (ereignis.target.matches('.capabilities-gap-link')) {
      navigiere('#/workboard')
      return
    }
    const scoutButton = ereignis.target.closest('.capabilities-scout-link')
    if (scoutButton) {
      // Verteidigung in der Tiefe zum disabled-Attribut (aktualisiereScoutButtonZustand): ein
      // Scout-Lauf startet OHNE Freigabe-Gate sofort real (AK10) — ein zweiter, überlappender
      // Lauf verletzt D13/ARCHITECTURE.md §7 (Code-Review-Befund, kritisch).
      if (istScoutSucheAktiv()) return
      void starteScoutSuche(scoutButton.dataset.rolle, JSON.parse(scoutButton.dataset.capabilities))
      return
    }
    const detailsKnopf = ereignis.target.closest('.capabilities-rolle-details')
    if (detailsKnopf) umschaltRollenDetail(detailsKnopf)
  })
}

// ─── Scout: Kandidaten suchen / Ergebnis / Vormerken (F27 WS-2) ────────────

/**
 * Zustand des EINEN gerade laufenden/zuletzt abgeschlossenen Scout-Laufs, oder null. D13 erlaubt
 * ohnehin nur einen aktiven Lauf je Serverinstanz — ein globaler statt ein pro-Zeile-Zustand
 * genügt (anders als views/workboard.js bearbeitungsZustand, der an ein Workitem gebunden ist).
 * Phasen: 'wird_angelegt' (POST /api/auftraege unterwegs), 'wird_gestartet' (POST /api/laeufe
 * unterwegs), 'laeuft' (202 erhalten, Detail-Auffrischer pollt GET /api/laeufe/<laufId>),
 * 'fertig' (ERFOLGREICH, ergebnis gesetzt), 'fehler'.
 */
let scoutZustand = null

/** quelle_url-Werte, die der Mensch bereits geöffnet hat (Klick auf den Link) — AK11: das "ungeprüft"-Badge verschwindet erst dann, nie automatisch. Bewusst modulweit statt je Lauf: eine einmal geöffnete Quelle bleibt für die Sitzung als geprüft markiert. */
const geoeffneteQuellen = new Set()

/** Vormerken-Fortschritt je Kandidat DES AKTUELLEN scoutZustand.ergebnis, Schlüssel = Index im kandidaten-Array. Wird bei jedem neuen Scout-Lauf verworfen (siehe starteScoutSuche). */
let vormerkenZustaende = new Map()

/** ids aller aktuell registrierten Ressourcen (aus der zuletzt geladenen Library, siehe ladeCapabilities) — für einen client-seitigen Vorab-Hinweis auf eine ableiteRessourcenId-Kollision (AK13, real aufgetreten: Kandidat 'playwright-mcp' kollidiert mit einer bestehenden id). Ersetzt NICHT die echte Prüfung (validiereRessourcenDaten, src/ressourcen/index.ts) — nur ein früher, gut sichtbarer Hinweis, bevor ein Mensch eine ZWINGEND-Freigabe für einen von vornherein kollidierenden Auftrag erteilt. */
let bekannteRessourcenIds = new Set()

/** Baut den Auftragstext einer Scout-Suche — MUSS die gesuchte(n) Capability(s) und die betroffene Rolle nennen (Vertrag der Rolle 'scout', src/rollen/index.ts). @param rolle - Rolle mit der Coverage-Lücke @param capabilities - eintrag.restFehlend dieser Zeile @returns Auftragstext für POST /api/auftraege */
function baueScoutAuftragstext(rolle, capabilities) {
  return [
    `Recherchiere externe Kandidaten (Skills oder MCPs), die folgende fehlende Capability(s) abdecken: ${capabilities.join(', ')}.`,
    `Betroffene Rolle: ${rolle} (siehe ROLLENVERTRAEGE, src/rollen/index.ts).`,
    'Liefere ausschließlich ein Ergebnis nach schemas/ergebnis-scout.schema.json mit höchstens 5 Kandidaten — kein Freitext, kein Codezaun.',
  ].join('\n\n')
}

/**
 * Verteidigung in der Tiefe (Code-Review-Befund): validiereErgebnisScout erzwingt bereits
 * '^https?://' für quelle_url (src/scout/index.ts) — das Rendern hier prüft trotzdem selbst
 * nach, statt der Formprüfung eines fremden, adversariellen Ergebnisses (P5) blind zu vertrauen.
 * Ein Wert, der die Prüfung nicht besteht, wird als reiner Text angezeigt, NIE als href — ein
 * javascript:-Schema wäre sonst ein anklickbarer, ausführbarer Link im Leitstand.
 */
function istSichereQuelleUrl(quelleUrl) {
  return /^https?:\/\//.test(quelleUrl)
}

function quelleZelle(kandidat) {
  if (!istSichereQuelleUrl(kandidat.quelle_url)) {
    return `${escapeHtml(kandidat.quelle_url)} <span class="badge fehler">kein gültiges http(s)-Schema — nicht verlinkt</span>`
  }
  const link = `<a href="${escapeHtml(kandidat.quelle_url)}" target="_blank" rel="noopener noreferrer" class="scout-quelle-link" data-url="${escapeHtml(kandidat.quelle_url)}">${escapeHtml(kandidat.quelle_url)}</a>`
  return geoeffneteQuellen.has(kandidat.quelle_url) ? link : `${link} <span class="badge stale">ungeprüft</span>`
}

/** Vorab-Hinweis (kein Blocker — die echte Prüfung bleibt validiereRessourcenDaten): die aus kandidat.name abgeleitete id kollidiert bereits mit einer registrierten Ressource (AK13, real aufgetreten). @param kandidat - ein Eintrag aus ergebnis.kandidaten @returns HTML-Fragment oder '' */
function kollisionsHinweis(kandidat) {
  const id = ableiteRessourcenId(kandidat.name)
  if (!bekannteRessourcenIds.has(id)) return ''
  return `<p class="fehler">Achtung: id "${escapeHtml(id)}" existiert bereits in ressourcen.json — ein Vormerken würde beim Schreiben real kollidieren.</p>`
}

/** Rendert die Vormerken-Zelle eines Kandidaten je nach vormerkenZustaende[index] — Button, Fortschritt, Fehler mit Wiederholen (reicht eine bereits angelegte auftragId erneut ein statt einen zweiten, verwaisten Auftrag anzulegen, Muster views/workboard.js wiederholeRouten), oder ein Link zur normalen Workflow-Freigabe (kein Duplikat der Kette aus views/workboard.js, siehe baueVormerkenAuftragstext-Kommentar in ../vormerken-auftrag.js). @param index - Position des Kandidaten @param kandidat - der Kandidat dieser Zeile (für den Kollisions-Vorab-Hinweis) */
function vormerkenZelle(index, kandidat) {
  const zustandKandidat = vormerkenZustaende.get(index)
  if (zustandKandidat === undefined) {
    return `${kollisionsHinweis(kandidat)}<button type="button" class="btn btn-primary scout-vormerken" data-index="${index}">Vormerken</button>`
  }
  if (zustandKandidat.phase === 'unterwegs') return '<p class="hinweis">Wird vorgemerkt…</p>'
  if (zustandKandidat.phase === 'fehler') {
    return `<p class="fehler">${escapeHtml(zustandKandidat.meldung)}</p><button type="button" class="btn scout-vormerken" data-index="${index}">Erneut versuchen</button>`
  }
  return `<p class="hinweis">Vorgemerkt — Auftrag <code>${escapeHtml(zustandKandidat.auftragId)}</code>. Freigabe wie gewohnt unter <a href="#/workflows/${encodeURIComponent(zustandKandidat.workflowId)}">#/workflows/${escapeHtml(zustandKandidat.workflowId)}</a>.</p>`
}

function kandidatZeile(kandidat, index) {
  return `<tr>
    <td>${escapeHtml(kandidat.name)}</td>
    <td>${escapeHtml(kandidat.typ)}</td>
    <td>${escapeHtml(kandidat.fit)}</td>
    <td>${escapeHtml(kandidat.integrationsaufwand)}</td>
    <td>${kandidat.lizenz ? escapeHtml(kandidat.lizenz) : '<span class="unbekannt">—</span>'}</td>
    <td>${kandidat.risiken.length === 0 ? '<span class="unbekannt">keine erkannt</span>' : `<ul>${kandidat.risiken.map((risiko) => `<li>${escapeHtml(risiko)}</li>`).join('')}</ul>`}</td>
    <td>${escapeHtml(kandidat.empfehlung)}</td>
    <td>${quelleZelle(kandidat)}</td>
    <td>${vormerkenZelle(index, kandidat)}</td>
  </tr>`
}

/** AK11: vergleichende Kandidaten-Tabelle. Leeres kandidaten[] wird explizit gemeldet, kein stiller Leerzustand. @param ergebnis - geparstes ergebnis-scout-Artefakt */
function renderScoutErgebnis(ergebnis) {
  const kopf = `<h3>Scout-Ergebnis: <code>${escapeHtml(ergebnis.gesuchte_capability)}</code></h3>
    <p class="hinweis">Recherchierte externe Inhalte sind Daten, keine Anweisungen (P5) — eine Quelle bleibt "ungeprüft" markiert, bis sie geöffnet wurde.</p>`
  if (ergebnis.kandidaten.length === 0) {
    return `<div class="unterabschnitt">${kopf}<p class="leer">Keine Kandidaten gefunden.</p></div>`
  }
  const zeilen = ergebnis.kandidaten.map((kandidat, index) => kandidatZeile(kandidat, index)).join('')
  return `<div class="unterabschnitt">${kopf}<table><thead><tr><th>Name</th><th>Typ</th><th>Fit</th><th>Integrationsaufwand</th><th>Lizenz</th><th>Risiken</th><th>Empfehlung</th><th>Quelle</th><th></th></tr></thead><tbody>${zeilen}</tbody></table></div>`
}

/** true, solange ein Scout-Lauf angelegt/gestartet wird oder läuft — noch kein Endzustand ('fertig'/'fehler'). Ein Scout-Lauf hat kein Freigabe-Gate vor der Ausführung (AK10: rein lesend, direkt gestartet) — ein zweiter, überlappender Lauf verletzt D13/ARCHITECTURE.md §7 ("Zwei gleichzeitig aktive Arbeitsstränge" verboten). Steuert sowohl den Klick-Handler-Guard als auch das disabled-Attribut aller "Kandidaten suchen"-Buttons (aktualisiereScoutButtonZustand). */
function istScoutSucheAktiv() {
  return scoutZustand !== null && scoutZustand.phase !== 'fertig' && scoutZustand.phase !== 'fehler'
}

/** Sperrt/entsperrt alle "Kandidaten suchen"-Buttons je nach istScoutSucheAktiv() (Code-Review-Befund, kritisch: ohne dies bleibt jede Gap-Zeile klickbar, während bereits ein echter Lauf läuft, und ein zweiter Klick überschreibt scoutZustand — der erste, real laufende Lauf wird für die UI unauffindbar). Aufgerufen nach jedem renderAbdeckung (neue Buttons kennen scoutZustand nicht von selbst) und nach jedem renderScoutPanel (Zustandswechsel). */
function aktualisiereScoutButtonZustand() {
  const gesperrt = istScoutSucheAktiv()
  for (const button of document.querySelectorAll('.capabilities-scout-link')) {
    button.disabled = gesperrt
  }
}

/** Rendert #capabilities-scout je nach scoutZustand.phase — einziger Schreibpunkt für diesen Container (Muster renderBearbeitungsAbschnitt, views/workboard.js). Sperrt/entsperrt am Ende IMMER die "Kandidaten suchen"-Buttons passend zum neuen Zustand (aktualisiereScoutButtonZustand). */
function renderScoutPanel() {
  const container = document.getElementById('capabilities-scout')
  if (scoutZustand === null) {
    container.innerHTML = ''
  } else {
    const zustand = scoutZustand
    if (zustand.phase === 'wird_angelegt') {
      container.innerHTML = '<div class="unterabschnitt"><h3>Scout-Suche</h3><p class="hinweis">Auftrag wird angelegt…</p></div>'
    } else if (zustand.phase === 'wird_gestartet') {
      container.innerHTML = '<div class="unterabschnitt"><h3>Scout-Suche</h3><p class="hinweis">Lauf wird gestartet…</p></div>'
    } else if (zustand.phase === 'laeuft') {
      container.innerHTML = `<div class="unterabschnitt"><h3>Scout-Suche: ${escapeHtml(zustand.capabilities.join(', '))} (Rolle ${escapeHtml(zustand.rolle)})</h3><p class="hinweis">Lauf <code>${escapeHtml(zustand.laufId)}</code> läuft… Weitere "Kandidaten suchen"-Buttons sind bis zum Abschluss gesperrt (nur ein aktiver Lauf gleichzeitig).</p></div>`
    } else if (zustand.phase === 'fehler') {
      container.innerHTML = `<div class="unterabschnitt"><h3>Scout-Suche</h3><p class="fehler">${escapeHtml(zustand.meldung)}</p></div>`
    } else {
      container.innerHTML = renderScoutErgebnis(zustand.ergebnis)
    }
  }
  aktualisiereScoutButtonZustand()
}

/**
 * Klick auf "Kandidaten suchen" (AK10): legt den Auftrag an (mit gesuchter Capability + Rolle im
 * Auftragstext) und startet DIREKT einen Lauf über POST /api/laeufe mit rolle:'scout' und
 * werkzeugsatz:'recherchierend' — kein Routing, kein Workflow (rein lesend, keine Nebenwirkung,
 * exakt der Weg des realen F27-WS-1-Testlaufs). 'recherchierend' ist bewusst ein fester
 * Client-Wert, kein Dropdown-Wert (Muster views/projekt.js: rolle/werkzeugsatz bleiben im
 * Startformular fest) — GET /api/startvorlage/werkzeugsaetze liefert 'art' ohnehin nicht (D5,
 * scripts/leitstand-server.mjs Dateikopf), eine Startvorlage ohne diesen Werkzeugsatz lässt POST
 * /api/laeufe hier real mit 400 scheitern, sichtbar im Fehlerzustand unten.
 * @param rolle - Rolle mit der Coverage-Lücke
 * @param capabilities - eintrag.restFehlend dieser Zeile
 */
async function starteScoutSuche(rolle, capabilities) {
  const zustand = { rolle, capabilities, phase: 'wird_angelegt', auftragId: null, laufId: null, ergebnis: null, meldung: null }
  scoutZustand = zustand
  vormerkenZustaende = new Map()
  renderScoutPanel()
  try {
    const auftragAntwort = await legeAuftragAn({ titel: `Scout: ${capabilities.join(', ')}`, auftragstext: baueScoutAuftragstext(rolle, capabilities) })
    const auftragInhalt = await auftragAntwort.json().catch(() => ({}))
    if (auftragAntwort.status !== 201) {
      zustand.phase = 'fehler'
      zustand.meldung = `Auftrag konnte nicht angelegt werden: ${auftragAntwort.status} ${auftragInhalt.grund ?? ''}`.trim()
      if (scoutZustand === zustand) renderScoutPanel()
      return
    }
    zustand.auftragId = auftragInhalt.auftragId
    zustand.laufId = `scout-${rolle}-${Date.now()}`
    zustand.phase = 'wird_gestartet'
    if (scoutZustand === zustand) renderScoutPanel()

    // Verteidigung in der Tiefe (Code-Review-Befund, kritisch): der Button-Sperrzustand
    // verhindert einen zweiten Klick bereits vor diesem Aufruf — dieser Guard stellt zusätzlich
    // sicher, dass starteLauf (löst OHNE Freigabe-Gate sofort eine echte Ausführung aus, AK10)
    // niemals für eine bereits überholte zustand-Instanz aufgerufen wird.
    if (scoutZustand !== zustand) return

    const laufAntwort = await starteLauf({
      laufId: zustand.laufId,
      rolle: 'scout',
      anfragen: [],
      budget: {},
      aufrufEingaben: { modell: 'sonnet' },
      werkzeugsatz: 'recherchierend',
      auftragId: zustand.auftragId,
    })
    if (laufAntwort.status !== 202) {
      const laufInhalt = await laufAntwort.json().catch(() => ({}))
      zustand.phase = 'fehler'
      zustand.meldung = `Lauf konnte nicht gestartet werden: ${laufAntwort.status} ${laufInhalt.grund ?? ''}`.trim()
      if (scoutZustand === zustand) renderScoutPanel()
      return
    }
    zustand.phase = 'laeuft'
    if (scoutZustand === zustand) renderScoutPanel()
  } catch (fehler) {
    zustand.phase = 'fehler'
    zustand.meldung = `Anfrage fehlgeschlagen: ${fehler.message}`
    if (scoutZustand === zustand) renderScoutPanel()
  }
}

/**
 * Detail-Auffrischer (F20 WS-2, kein eigener Timer, Muster views/workboard.js
 * aktualisiereBearbeitungsZustand): solange ein Scout-Lauf 'laeuft', fragt GET
 * /api/laeufe/<laufId> ab. ABGESCHLOSSEN/ERFOLGREICH mit lesbarem scoutErgebnis → 'fertig',
 * jeder andere Ausgang (VERWEIGERT/FEHLGESCHLAGEN, nicht lesbares Ergebnis) → 'fehler' mit
 * Klartext-Grund, nie ein stilles Hängenbleiben bei "läuft…".
 */
async function aktualisiereScoutZustand() {
  const zustand = scoutZustand
  if (zustand === null || zustand.phase !== 'laeuft') return
  try {
    const antwort = await holeLaufDetail(zustand.laufId)
    if (scoutZustand !== zustand) return
    if (!antwort.ok) return
    const detail = await antwort.json()
    if (detail.laufStatus?.status !== 'ABGESCHLOSSEN') return
    if (detail.laufStatus.ergebnis !== 'ERFOLGREICH') {
      zustand.phase = 'fehler'
      zustand.meldung = `Lauf beendet mit Ergebnis '${detail.laufStatus.ergebnis}'.`
      renderScoutPanel()
      return
    }
    if (detail.scoutErgebnis?.status !== 'ok') {
      zustand.phase = 'fehler'
      zustand.meldung = `Ergebnis nicht lesbar: ${detail.scoutErgebnis?.grund ?? 'unbekannt'}`
      renderScoutPanel()
      return
    }
    zustand.ergebnis = detail.scoutErgebnis.ergebnis
    zustand.phase = 'fertig'
    renderScoutPanel()
  } catch {
    // Netzwerkfehler beim Detail-Poll: der nächste Tick versucht es erneut (Muster views/workboard.js).
  }
}

/**
 * Klick auf "Vormerken" (AK12) — legt den Vormerken-Auftrag an und routet ihn sofort (Muster
 * views/workboard.js starteBearbeitung), zeigt danach einen Link zur normalen Workflow-Freigabe
 * statt die Freigabe-Kette hier zu duplizieren (siehe baueVormerkenAuftragstext-Kommentar in ../vormerken-auftrag.js). Ein
 * "Erneut versuchen" NACH bereits angelegtem Auftrag (auftragId im vorherigen fehler-Zustand
 * gesetzt) reicht DENSELBEN Auftrag erneut zum Routen ein statt einen zweiten, verwaisten Auftrag
 * anzulegen (Code-Review-/QA-Befund, Muster views/workboard.js wiederholeRouten).
 * @param index - Position des Kandidaten in scoutZustand.ergebnis.kandidaten
 */
async function vormerkenKandidat(index) {
  if (scoutZustand === null || scoutZustand.phase !== 'fertig') return
  const kandidat = scoutZustand.ergebnis.kandidaten[index]
  if (kandidat === undefined) return
  const laufId = scoutZustand.laufId
  let auftragId = vormerkenZustaende.get(index)?.auftragId ?? null
  vormerkenZustaende.set(index, { phase: 'unterwegs', auftragId })
  renderScoutPanel()
  try {
    if (auftragId === null) {
      const auftragAntwort = await legeAuftragAn({ titel: `Vormerken: ${kandidat.name}`, auftragstext: baueVormerkenAuftragstext(kandidat, laufId) })
      const auftragInhalt = await auftragAntwort.json().catch(() => ({}))
      if (auftragAntwort.status !== 201) {
        vormerkenZustaende.set(index, { phase: 'fehler', auftragId: null, meldung: `Auftrag konnte nicht angelegt werden: ${auftragAntwort.status} ${auftragInhalt.grund ?? ''}`.trim() })
        renderScoutPanel()
        return
      }
      auftragId = auftragInhalt.auftragId
    }
    const workflowId = `router-${auftragId}`
    const routeAntwort = await routeAuftrag(auftragId)
    if (!routeAntwort.ok) {
      const routeInhalt = await routeAntwort.json().catch(() => ({}))
      vormerkenZustaende.set(index, { phase: 'fehler', auftragId, meldung: `Auftrag '${auftragId}' angelegt, aber Routen fehlgeschlagen: ${routeAntwort.status} ${routeInhalt.grund ?? ''}`.trim() })
      renderScoutPanel()
      return
    }
    vormerkenZustaende.set(index, { phase: 'geroutet', auftragId, workflowId })
    renderScoutPanel()
  } catch (fehler) {
    vormerkenZustaende.set(index, { phase: 'fehler', auftragId, meldung: `Anfrage fehlgeschlagen: ${fehler.message}` })
    renderScoutPanel()
  }
}

/** Klick-Delegation für #capabilities-scout: Quelle öffnen (markiert "geprüft") und Vormerken. */
function initScoutBedienung() {
  document.getElementById('capabilities-scout').addEventListener('click', (ereignis) => {
    const quelleLink = ereignis.target.closest('.scout-quelle-link')
    if (quelleLink) {
      geoeffneteQuellen.add(quelleLink.dataset.url)
      renderScoutPanel()
      return
    }
    const vormerkenButton = ereignis.target.closest('.scout-vormerken')
    if (vormerkenButton) {
      void vormerkenKandidat(Number(vormerkenButton.dataset.index))
    }
  })
}

// ─── Rollen & Besetzung: Details je Rolle (AK4, J7) ─────────────────────

function renderRollenvertrag(vertrag) {
  return `<div class="unterabschnitt">
    <h4>${tHtml('werkstatt.ebene1.titel')}</h4>
    <table class="lauf-kopfdaten"><tbody>
      <tr><th>${tHtml('werkstatt.ebene1.zweck')}</th><td>${escapeHtml(vertrag.zweck)}</td></tr>
      <tr><th>${tHtml('werkstatt.ebene1.werkzeugsaetze')}</th><td>${vertrag.erlaubte_werkzeugsatz_arten.map(escapeHtml).join(', ')}</td></tr>
      <tr><th>${tHtml('werkstatt.ebene1.worker')}</th><td>${vertrag.erlaubte_worker.map(escapeHtml).join(', ')}</td></tr>
      <tr><th>${tHtml('werkstatt.ebene1.schema')}</th><td>${vertrag.erlaubtes_output_schema === null ? `<span class="unbekannt">${tHtml('werkstatt.ebene1.schemaKeins')}</span>` : escapeHtml(vertrag.erlaubtes_output_schema)}</td></tr>
      <tr><th>${tHtml('werkstatt.ebene1.capabilities')}</th><td>${vertrag.benoetigte_capabilities.map(escapeHtml).join(', ')}</td></tr>
    </tbody></table>
  </div>`
}

function renderVorlagenBesetzung(vorlagenBesetzung) {
  const zeilen =
    vorlagenBesetzung.length === 0
      ? `<p class="unbekannt">${tHtml('werkstatt.ebene2.leer')}</p>`
      : `<div class="werkstatt-tabelle"><table><thead><tr><th>${tHtml('werkstatt.ebene2.vorlage')}</th><th>${tHtml('werkstatt.ebene2.schritt')}</th><th>${tHtml('werkstatt.ebene2.worker')}</th><th>${tHtml('werkstatt.ebene2.modell')}</th></tr></thead><tbody>${vorlagenBesetzung
          .map((v) => `<tr><td>${escapeHtml(v.vorlage)}</td><td><code>${escapeHtml(v.schrittId)}</code></td><td>${escapeHtml(v.worker)}</td><td>${escapeHtml(v.modell)}</td></tr>`)
          .join('')}</tbody></table></div>`
  return `<div class="unterabschnitt"><h4>${tHtml('werkstatt.ebene2.titel')}</h4>${zeilen}</div>`
}

function renderRealeBesetzung(letzteRealeBesetzung) {
  if (letzteRealeBesetzung.status === 'kein_lauf') {
    return `<div class="unterabschnitt"><h4>${tHtml('werkstatt.ebene34.titel')}</h4><p class="unbekannt">${tHtml('werkstatt.ebene34.keinLauf')}</p></div>`
  }
  const kopf = `<p class="hinweis">${tHtml(
    'werkstatt.ebene34.juengster',
    {},
    { workflow: `<code>${escapeHtml(letzteRealeBesetzung.workflowId)}</code>`, schritt: `<code>${escapeHtml(letzteRealeBesetzung.schrittId)}</code>`, lauf: `<code>${escapeHtml(letzteRealeBesetzung.laufId)}</code>` }
  )}</p>`
  const gepinnt = `<tr><th>${tHtml('werkstatt.ebene34.gepinnt')}</th><td>${escapeHtml(letzteRealeBesetzung.gepinnt.worker)} / ${escapeHtml(letzteRealeBesetzung.gepinnt.modell)}</td></tr>`
  const beobachtetZeile =
    letzteRealeBesetzung.status === 'laufakte_fehlt'
      ? `<tr><th>${tHtml('werkstatt.ebene34.beobachtet')}</th><td class="unbekannt">${tHtml('werkstatt.ebene34.laufakteFehlt')}</td></tr>`
      : `<tr><th>${tHtml('werkstatt.ebene34.beobachtet')}</th><td>${escapeHtml(letzteRealeBesetzung.beobachtet.worker)} / ${letzteRealeBesetzung.beobachtet.modellDeklariert === null ? `<span class="unbekannt">${tHtml('werkstatt.ebene34.keinModell')}</span>` : escapeHtml(letzteRealeBesetzung.beobachtet.modellDeklariert)}</td></tr>`
  return `<div class="unterabschnitt"><h4>${tHtml('werkstatt.ebene34.titel')}</h4>${kopf}<table class="lauf-kopfdaten"><tbody>${gepinnt}${beobachtetZeile}</tbody></table></div>`
}

/** Laufende Nummer aller Detail-Anfragen; der jeweilige Container merkt sich in dataset.anfrage die jüngste (Überholschutz). */
let rollenAnfrageZaehler = 0

/**
 * AK4: lädt und rendert alle vier Ebenen einer Rolle in ihren Detail-Container (lazy, beim Öffnen).
 * Überholschutz (Muster views/workboard.js anfrageZaehler): jede Anfrage trägt eine Nummer, der
 * Container merkt sich die jüngste — eine ältere Antwort (schnelles Zu/Auf, „Neu laden“) überschreibt
 * nichts, und ein inzwischen ersetzter Container (isConnected) bleibt unberührt.
 * @param rolle - Rollen-ID
 * @param container - .werkstatt-rollen-detail dieser Rolle
 */
async function ladeRollenDetail(rolle, container) {
  const meineAnfrageNummer = ++rollenAnfrageZaehler
  container.dataset.anfrage = String(meineAnfrageNummer)
  const istAktuell = () => container.isConnected && container.dataset.anfrage === String(meineAnfrageNummer)
  container.innerHTML = `<p class="leer">${tHtml('werkstatt.laedt')}</p>`
  try {
    const antwort = await holeRollenBesetzung(rolle)
    if (!istAktuell()) return
    if (!antwort.ok) {
      const inhalt = await antwort.json().catch(() => ({}))
      if (!istAktuell()) return
      container.innerHTML = `<p class="fehler">${tHtml('werkstatt.rolle.fehler', { status: antwort.status, grund: inhalt.grund ?? t('werkstatt.rolle.unbekannterFehler') })}</p>`
      return
    }
    const ansicht = await antwort.json()
    if (!istAktuell()) return
    container.innerHTML = renderRollenvertrag(ansicht.rollenvertrag) + renderVorlagenBesetzung(ansicht.vorlagenBesetzung) + renderRealeBesetzung(ansicht.letzteRealeBesetzung)
  } catch (fehler) {
    if (!istAktuell()) return
    container.innerHTML = `<p class="fehler">${tHtml('werkstatt.ladeFehler', { grund: fehler.message })}</p>`
  }
}

/**
 * Öffnet die Details einer Rolle und lädt sie (immer frisch).
 * @param knopf - .capabilities-rolle-details
 * @returns Promise, das nach dem Rendern (Daten oder Fehler) erfüllt ist
 */
function oeffneRollenDetail(knopf) {
  const container = document.getElementById(knopf.getAttribute('aria-controls'))
  knopf.setAttribute('aria-expanded', 'true')
  container.hidden = false
  offeneRollen.add(knopf.dataset.rolle)
  return ladeRollenDetail(knopf.dataset.rolle, container)
}

/**
 * „Details“ je Rolle: öffnet (lädt) oder schließt den Detail-Container; eine noch laufende Anfrage
 * eines geschlossenen Containers schreibt nicht mehr hinein.
 * @param knopf - .capabilities-rolle-details
 */
function umschaltRollenDetail(knopf) {
  if (knopf.getAttribute('aria-expanded') === 'true') {
    const container = document.getElementById(knopf.getAttribute('aria-controls'))
    knopf.setAttribute('aria-expanded', 'false')
    container.hidden = true
    container.dataset.anfrage = ''
    container.innerHTML = ''
    offeneRollen.delete(knopf.dataset.rolle)
    return
  }
  void oeffneRollenDetail(knopf)
}

// ─── Laden/Neu laden ────────────────────────────────────────────────────

/** Laufende Nummer der Ladevorgänge (Neu laden, Routeneintritt, Projektwechsel) — nur der jüngste rendert. */
let ladeZaehler = 0

/**
 * Rendert das Ergebnis einer Quelle in ihren Container; ein Fehler (abgelehnte Anfrage ODER ein Körper, der
 * nicht zum Vertrag passt und beim Rendern wirft) erscheint nur dort und wird geloggt — die andere Quelle
 * rendert trotzdem (DoD: catch + Logging).
 * @param ergebnis - Eintrag aus Promise.allSettled
 * @param rendern - (wert) => void
 * @param beiFehler - (grund: string) => void, schreibt den Fehlerzustand
 * @param quelle - Name für das Log
 */
function rendereQuelle(ergebnis, rendern, beiFehler, quelle) {
  try {
    if (ergebnis.status === 'rejected') throw ergebnis.reason
    rendern(ergebnis.value)
  } catch (fehler) {
    console.error(`capabilities: ${quelle} nicht darstellbar`, fehler)
    beiFehler(fehler instanceof Error ? fehler.message : String(fehler))
  }
}

/** Fehlerzustand der Werkzeuge: Fehler im Kachel-Container, keine Werte des letzten Ladens daneben. @param grund - Fehlertext */
function zeigeLibraryFehler(grund) {
  letzteLibrary = null
  for (const id of ['capabilities-kennzahlen', 'capabilities-assessed', 'capabilities-startvorlage']) document.getElementById(id).innerHTML = ''
  document.getElementById('capabilities-library').innerHTML = `<p class="fehler">${tHtml('werkstatt.ladeFehler', { grund })}</p>`
}

/**
 * Lädt Library + Coverage parallel (AK1, AK2, AK6). Ein Fehlschlag EINER der beiden Quellen zeigt sich nur in
 * ihrem eigenen Container (Muster views/workboard.js: eine defekte Quelle blendet nicht die ganze View aus).
 * Überholschutz über ladeZaehler; während des Ladens zeigen Suche und Filter keine alten Kacheln (letzteLibrary null).
 */
async function ladeCapabilities() {
  const meineNummer = ++ladeZaehler
  letzteLibrary = null
  const laedt = `<p class="leer">${tHtml('werkstatt.laedt')}</p>`
  document.getElementById('capabilities-library').innerHTML = laedt
  document.getElementById('capabilities-abdeckung').innerHTML = laedt
  const [libraryErgebnis, abdeckungErgebnis] = await Promise.allSettled([holeRessourcen(), holeAbdeckung()])
  if (meineNummer !== ladeZaehler) return

  rendereQuelle(
    libraryErgebnis,
    (ansicht) => {
      renderLibrary(ansicht)
      bekannteRessourcenIds = new Set(ansicht.eintraege.map((eintrag) => eintrag.id))
      if (scoutZustand?.phase === 'fertig') renderScoutPanel()
    },
    zeigeLibraryFehler,
    'GET …/ressourcen'
  )
  rendereQuelle(
    abdeckungErgebnis,
    renderAbdeckung,
    (grund) => {
      document.getElementById('capabilities-abdeckung').innerHTML = `<p class="fehler">${tHtml('werkstatt.ladeFehler', { grund })}</p>`
    },
    'GET …/ressourcen/abdeckung'
  )
}

/**
 * Initialisiert die Capabilities-View einmalig beim Bootstrap (Muster views/workboard.js initWorkboardView).
 * Ein Projektwechsel (F-860) lädt Katalog und Abdeckung des neuen Projekts und schließt offene Details; der
 * Scout-Zustand bleibt in WS-7a unberührt (F-955, WS-7b).
 */
export function initCapabilitiesView() {
  initRegister('werkstatt-register')
  initRegister('faehigkeiten-register')
  initWerkzeugBedienung()
  initAbdeckungBedienung()
  initScoutBedienung()
  abonniereDetailAuffrischer(() => {
    void aktualisiereScoutZustand()
  })
  abonniereProjektWechsel(() => {
    offeneRollen.clear()
    void ladeCapabilities()
  })
  document.getElementById('capabilities-neu-laden').addEventListener('click', () => {
    void ladeCapabilities()
  })

  registriere(/^#\/capabilities$/, 'capabilities', () => {
    void ladeCapabilities()
  })
}
