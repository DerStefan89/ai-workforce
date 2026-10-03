/**
 * Datei: public/leitstand/views/capabilities.js
 *
 * Zweck: View `#/capabilities` — die Workforce (F44 WS-7a, Vorlage V10 d_harness_phasen, d_faehigkeiten,
 * d_faehigkeiten_rollen; seit F46 D6 nach docs/design/abgleich-f46.md §4.14, Bilder 01-workforce-harness--Main
 * und --Library). Drei clientseitige Register in der Reihenfolge des Bildes: Harness-Aufbau (Standard;
 * views/harness-aufbau.js über GET /api/harness), Capability Library (Unterbereiche Katalog —
 * views/capability-library.js über GET /api/ressourcen —, Rollen & Besetzung mit Scout, Empfehlungen) und
 * Phasen & Rollen (Baustein „kommt“ aus F44 WS-7a). Titel und Beschreibung des Kopfes folgen dem Register.
 * Diese Datei hält die Register, Rollen & Besetzung (GET /api/ressourcen/abdeckung, Details lazy über
 * GET /api/ressourcen/rollen/<rolle>), den Scout und das Laden; die Regeln für Zählung, Filter und
 * Register-Tastatur stehen in ../faehigkeiten-anzeige.js, die des Harness in ../harness-anzeige.js.
 *
 * Kein Poll: Katalog, Coverage und Harness kommen aus Dateien, die sich nur durch Commits bzw. Arbeit im
 * Repo ändern (Muster views/workboard.js), die Rollen-Besetzung zusätzlich aus Laufakten — „Neu laden“ deckt
 * das ab, ein Timer wäre hier reine Last ohne Nutzen.
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initCapabilitiesView beim Bootstrap)
 *
 * Wichtig: rein lesend außer dem Scout/Vormerken-Weg (F27 WS-2; Ablauf und Guards unverändert, Darstellung seit
 * WS-7b als Karten) und — seit F46 D6 — „Prüfen & freigeben“ im Detail der Library, das ist der bestehende
 * F36-Installationsweg mit Bestätigung (empfehlung-installation.js, unverändert). Kein Schreiben in
 * Harness-Dateien, settings.json oder Hooks (E-F46-2).
 * Serverwerte (IDs, Capability-Namen, anzeigeGrund, fehltFuerEinsatz, Phasen, Pfade, Dateiinhalte) bleiben roh
 * und gehen durch escapeHtml, nie durch t(). Seit WS-7b sind auch die Scout-Texte übersetzt (werkstatt.scout.*);
 * baueScoutAuftragstext bleibt deutsch (geht an das Modell, Vertrag der Rolle scout).
 */

import { holeAbdeckung, holeHarness, holeLaufDetail, holeRessourcen, holeRollenBesetzung, legeAuftragAn, routeAuftrag, starteLauf } from '../api.js'
import { naechsterRegisterIndex, WERKZEUG_TYPEN } from '../faehigkeiten-anzeige.js'
import { t, tHtml } from '../i18n.js'
import { abonniereProjektWechsel } from '../projekt-kontext.js'
import { escapeHtml } from '../render.js'
import { rollenName } from '../rollen-anzeige.js'
import { navigiere, registriere } from '../router.js'
import { ableiteRessourcenId, baueVormerkenAuftragstext } from '../vormerken-auftrag.js'
import { abonniereDetailAuffrischer } from '../zustand.js'
import {
  aktualisiereLibraryHinweis,
  initCapabilityLibrary,
  renderCapabilityLibrary,
  setzeCapabilityLibraryZurueck,
  zeigeCapabilityLibraryFehler,
  zeigeCapabilityLibraryLaedt,
} from './capability-library.js'
import { initHarnessAufbau, oeffneHarnessOrt, renderHarness, setzeHarnessZurueck, zeigeHarnessFehler, zeigeHarnessLaedt } from './harness-aufbau.js'

// ─── Register (role=tablist) ─────────────────────────────────────────────

/** Rückruf je Register (tablist-id), aufgerufen nach jeder Wahl — z. B. setzeKopf für das Hauptregister. */
const beiWahl = new Map()

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
  beiWahl.get(tablist.id)?.(reiter)
}

/**
 * Bedienung eines Registers: Klick wählt; Pfeil links/rechts, Pos1 und Ende wählen und fokussieren
 * (automatische Aktivierung, naechsterRegisterIndex). Die Auswahl bleibt für die Sitzung erhalten.
 * @param id - ID des tablist-Elements (index.html)
 * @param rueckruf - optional, (reiter) => void nach jeder Wahl
 */
function initRegister(id, rueckruf) {
  const tablist = document.getElementById(id)
  if (typeof rueckruf === 'function') beiWahl.set(id, rueckruf)
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

/** Titel und Beschreibung des Kopfes je Register (Bild 01-Main: Werkstatt, 01-Library: Capability Library). */
const KOPF_JE_REITER = Object.freeze({
  'werkstatt-reiter-harness': ['werkstatt.titel', 'werkstatt.beschreibung'],
  'werkstatt-reiter-faehigkeiten': ['library.titel', 'library.beschreibung'],
  'werkstatt-reiter-phasen': ['werkstatt.phasen.titel', 'werkstatt.phasen.beschreibung'],
})

/**
 * Setzt Titel und Beschreibung des Kopfes zum gewählten Register (data-i18n mit, damit eine spätere
 * Übersetzung des Dokuments denselben Text setzt).
 * @param reiter - gewählter Reiter oder null
 */
function setzeKopf(reiter) {
  const schluessel = KOPF_JE_REITER[reiter?.id]
  if (schluessel === undefined) return
  for (const [id, key] of [
    ['werkstatt-titel', schluessel[0]],
    ['werkstatt-beschreibung', schluessel[1]],
  ]) {
    const element = document.getElementById(id)
    element.dataset.i18n = key
    element.textContent = t(key)
  }
}

/**
 * Übersetzter Typname; ein unbekannter Typ bleibt roh (Scout-Karten).
 * @param typ - Typ aus Katalog oder Scout-Ergebnis
 * @returns Text
 */
function typName(typ) {
  return WERKZEUG_TYPEN.includes(typ) ? t(`werkstatt.typ.${typ}`) : String(typ ?? '')
}

/**
 * Text eines Serverfelds als HTML; leer oder fehlend erscheint als „—“.
 * @param wert - Feldwert
 * @returns HTML
 */
function textOderStrich(wert) {
  return typeof wert === 'string' && wert !== '' ? escapeHtml(wert) : '—'
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

/** quelle_url-Werte, die der Mensch bereits geöffnet hat (Klick auf den Link) — AK11: das "ungeprüft"-Badge verschwindet erst dann, nie automatisch. Bewusst modulweit statt je Lauf: eine einmal geöffnete Quelle bleibt bis zum Projektwechsel (setzeScoutZurueck) oder Neuladen der Seite als geprüft markiert. */
const geoeffneteQuellen = new Set()

/** Vormerken-Fortschritt je Kandidat DES AKTUELLEN scoutZustand.ergebnis, Schlüssel = Index im kandidaten-Array. Wird bei jedem neuen Scout-Lauf (starteScoutSuche) und bei jedem Projektwechsel (setzeScoutZurueck) verworfen. */
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

/**
 * Quelle eines Kandidaten (Karte, F44 WS-7b): Link NUR für http(s) (istSichereQuelleUrl, P5), mit
 * rel="noopener noreferrer" und dem Kennzeichen „ungeprüft“, bis der Mensch die Quelle geöffnet hat
 * (AK11, geoeffneteQuellen); jeder andere Wert erscheint als reiner Text mit Hinweis.
 * @param kandidat - ein Eintrag aus ergebnis.kandidaten
 * @returns HTML
 */
function quelleZelle(kandidat) {
  if (!istSichereQuelleUrl(kandidat.quelle_url)) {
    return `<span class="scout-quelle-text">${escapeHtml(kandidat.quelle_url)}</span> <span class="ablauf-status fehler">${tHtml('werkstatt.scout.quelleUngueltig')}</span>`
  }
  const link = `<a href="${escapeHtml(kandidat.quelle_url)}" target="_blank" rel="noopener noreferrer" class="scout-quelle-link" data-url="${escapeHtml(kandidat.quelle_url)}">${escapeHtml(kandidat.quelle_url)}</a>`
  return geoeffneteQuellen.has(kandidat.quelle_url) ? link : `${link} <span class="ablauf-status warten">${tHtml('werkstatt.scout.ungeprueft')}</span>`
}

/** Stufen von fit und integrationsaufwand (schemas/ergebnis-scout.schema.json, geschlossene Wertemengen). */
const SCOUT_STUFEN = Object.freeze(['hoch', 'mittel', 'niedrig', 'gering'])

/**
 * Übersetzte Stufe; ein unbekannter Wert bleibt roh (Muster typName).
 * @param stufe - kandidat.fit oder kandidat.integrationsaufwand
 * @returns Text
 */
function stufeName(stufe) {
  return SCOUT_STUFEN.includes(stufe) ? t(`werkstatt.scout.stufe.${stufe}`) : String(stufe ?? '')
}

/** Vorab-Hinweis (kein Blocker — die echte Prüfung bleibt validiereRessourcenDaten): die aus kandidat.name abgeleitete id kollidiert bereits mit einer registrierten Ressource (AK13, real aufgetreten). @param kandidat - ein Eintrag aus ergebnis.kandidaten @returns HTML-Fragment oder '' */
function kollisionsHinweis(kandidat) {
  const id = ableiteRessourcenId(kandidat.name)
  if (!bekannteRessourcenIds.has(id)) return ''
  return `<p class="fehler scout-kollision">${tHtml('werkstatt.scout.kollision', {}, { id: `<code>${escapeHtml(id)}</code>` })}</p>`
}

/** Rendert die Vormerken-Zelle eines Kandidaten je nach vormerkenZustaende[index] — Button, Fortschritt, Fehler mit Wiederholen (reicht eine bereits angelegte auftragId erneut ein statt einen zweiten, verwaisten Auftrag anzulegen, Muster views/workboard.js wiederholeRouten), oder ein Link zur normalen Workflow-Freigabe (kein Duplikat der Kette aus views/workboard.js, siehe baueVormerkenAuftragstext-Kommentar in ../vormerken-auftrag.js). @param index - Position des Kandidaten @param kandidat - der Kandidat dieser Zeile (für den Kollisions-Vorab-Hinweis) @returns HTML */
function vormerkenZelle(index, kandidat) {
  const zustandKandidat = vormerkenZustaende.get(index)
  // Name für Screenreader: mehrere gleichnamige Knöpfe „Vormerken“ / „Erneut versuchen“ (Muster „Details“, WS-7a).
  const bezug = `<span class="sr-only">: ${escapeHtml(kandidat.name)}</span>`
  if (zustandKandidat === undefined) {
    const hinweis = kollisionsHinweis(kandidat)
    // Bei Kollision ist Vormerken nicht die naheliegende Handlung — sekundärer statt primärer Knopf.
    return `${hinweis}<button type="button" class="button${hinweis === '' ? ' primary' : ''} scout-vormerken" data-index="${index}">${tHtml('werkstatt.scout.vormerken')}${bezug}</button>`
  }
  if (zustandKandidat.phase === 'unterwegs') return `<p class="hinweis">${tHtml('werkstatt.scout.wirdVorgemerkt')}</p>`
  if (zustandKandidat.phase === 'fehler') {
    return `<p class="fehler">${escapeHtml(zustandKandidat.meldung)}</p><button type="button" class="button scout-vormerken" data-index="${index}">${tHtml('werkstatt.scout.erneut')}${bezug}</button>`
  }
  const workflowLink = `<a href="#/workflows/${encodeURIComponent(zustandKandidat.workflowId)}">${escapeHtml(zustandKandidat.workflowId)}</a>`
  return `<p class="hinweis">${tHtml('werkstatt.scout.vorgemerkt', {}, { auftrag: `<code>${escapeHtml(zustandKandidat.auftragId)}</code>`, ablauf: workflowLink })}</p>`
}

/**
 * Karte eines Kandidaten (F44 WS-7b, Vorlage V10 d_faehigkeiten_scout: .panel mit Tag „Kandidat · Typ“):
 * Name, Empfehlung, dann Passung, Integrationsaufwand, Rechte, Lizenz („—“), Risiken (Liste oder „keine erkannt“),
 * Unsicherheiten und Quelle als Definitionsliste, unten die Vormerken-Zelle. Typ, Passung und Aufwand sind
 * geschlossene Wertemengen des Schemas und werden übersetzt (typName, stufeName); ein unbekannter Wert bleibt roh. Alle Kandidatenfelder sind fremde
 * Recherche-Inhalte (P5) und gehen roh durch escapeHtml.
 * @param kandidat - ein Eintrag aus ergebnis.kandidaten
 * @param index - Position im kandidaten-Array (Schlüssel für vormerkenZustaende)
 * @returns HTML
 */
function kandidatKarte(kandidat, index) {
  const liste = (werte, leerSchluessel) =>
    Array.isArray(werte) && werte.length > 0 ? `<ul class="scout-risiken">${werte.map((wert) => `<li>${escapeHtml(wert)}</li>`).join('')}</ul>` : `<span class="unbekannt">${tHtml(leerSchluessel)}</span>`
  const risiken = liste(kandidat.risiken, 'werkstatt.scout.keineRisiken')
  return `<article class="scout-karte">
    <span class="werkzeug-typ">${tHtml('werkstatt.scout.kandidatTyp', { typ: typName(kandidat.typ) })}</span>
    <h4>${escapeHtml(kandidat.name)}</h4>
    <p class="scout-empfehlung">${escapeHtml(kandidat.empfehlung)}</p>
    <dl class="scout-daten">
      <dt>${tHtml('werkstatt.scout.fit')}</dt><dd>${escapeHtml(stufeName(kandidat.fit))}</dd>
      <dt>${tHtml('werkstatt.scout.aufwand')}</dt><dd>${escapeHtml(stufeName(kandidat.integrationsaufwand))}</dd>
      <dt>${tHtml('werkstatt.scout.rechte')}</dt><dd>${textOderStrich(kandidat.rechte)}</dd>
      <dt>${tHtml('werkstatt.scout.lizenz')}</dt><dd>${kandidat.lizenz ? escapeHtml(kandidat.lizenz) : '<span class="unbekannt">—</span>'}</dd>
      <dt>${tHtml('werkstatt.scout.risiken')}</dt><dd>${risiken}</dd>
      <dt>${tHtml('werkstatt.scout.unsicherheiten')}</dt><dd>${liste(kandidat.unsicherheiten, 'werkstatt.scout.keineUnsicherheiten')}</dd>
      <dt>${tHtml('werkstatt.scout.quelle')}</dt><dd>${quelleZelle(kandidat)}</dd>
    </dl>
    <div class="scout-vormerken-zelle">${vormerkenZelle(index, kandidat)}</div>
  </article>`
}

/** AK11: Kandidaten als Karten zum Vergleichen, mit P5-Hinweis. Leeres kandidaten[] wird explizit gemeldet, kein stiller Leerzustand. @param ergebnis - geparstes ergebnis-scout-Artefakt @returns HTML */
function renderScoutErgebnis(ergebnis) {
  const kopf = `<div class="section-label"><h3>${tHtml('werkstatt.scout.ergebnisTitel', {}, { capability: `<code>${escapeHtml(ergebnis.gesuchte_capability)}</code>` })}</h3></div>
    <p class="hinweis scout-p5">${tHtml('werkstatt.scout.p5')}</p>`
  if (ergebnis.kandidaten.length === 0) {
    return `<section class="scout-ergebnis">${kopf}<p class="leer">${tHtml('werkstatt.scout.leer')}</p></section>`
  }
  const karten = ergebnis.kandidaten.map((kandidat, index) => kandidatKarte(kandidat, index)).join('')
  return `<section class="scout-ergebnis">${kopf}<div class="scout-raster">${karten}</div><div class="note">${tHtml('werkstatt.scout.pruefen')}</div></section>`
}

/**
 * Zwischen- und Fehlerzustand des Panels im Stil der Seite (.note; Fehler .note.red).
 * @param textHtml - Inhalt (fertiges HTML)
 * @param fehler - true für den Fehlerzustand
 * @returns HTML
 */
function scoutStatus(textHtml, fehler = false) {
  return `<div class="note scout-status${fehler ? ' red' : ''}"><strong>${tHtml('werkstatt.scout.titel')}</strong><p>${textHtml}</p></div>`
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
      container.innerHTML = scoutStatus(tHtml('werkstatt.scout.wirdAngelegt'))
    } else if (zustand.phase === 'wird_gestartet') {
      container.innerHTML = scoutStatus(tHtml('werkstatt.scout.wirdGestartet'))
    } else if (zustand.phase === 'laeuft') {
      container.innerHTML = scoutStatus(
        tHtml('werkstatt.scout.laeuft', { capabilities: zustand.capabilities.join(', '), rolle: rollenName(zustand.rolle) }, { lauf: `<code>${escapeHtml(zustand.laufId)}</code>` })
      )
    } else if (zustand.phase === 'fehler') {
      container.innerHTML = scoutStatus(escapeHtml(zustand.meldung), true)
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
      zustand.meldung = t('werkstatt.scout.fehler.auftrag', { details: `${auftragAntwort.status} ${auftragInhalt.grund ?? ''}`.trim() })
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
      zustand.meldung = t('werkstatt.scout.fehler.lauf', { details: `${laufAntwort.status} ${laufInhalt.grund ?? ''}`.trim() })
      if (scoutZustand === zustand) renderScoutPanel()
      return
    }
    zustand.phase = 'laeuft'
    if (scoutZustand === zustand) renderScoutPanel()
  } catch (fehler) {
    zustand.phase = 'fehler'
    zustand.meldung = t('werkstatt.scout.fehler.anfrage', { grund: fehler.message })
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
      zustand.meldung = t('werkstatt.scout.fehler.ergebnis', { ergebnis: detail.laufStatus.ergebnis })
      renderScoutPanel()
      return
    }
    if (detail.scoutErgebnis?.status !== 'ok') {
      zustand.phase = 'fehler'
      zustand.meldung = t('werkstatt.scout.fehler.nichtLesbar', { grund: detail.scoutErgebnis?.grund ?? t('werkstatt.scout.unbekannt') })
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
        vormerkenZustaende.set(index, { phase: 'fehler', auftragId: null, meldung: t('werkstatt.scout.fehler.auftrag', { details: `${auftragAntwort.status} ${auftragInhalt.grund ?? ''}`.trim() }) })
        renderScoutPanel()
        return
      }
      auftragId = auftragInhalt.auftragId
    }
    const workflowId = `router-${auftragId}`
    const routeAntwort = await routeAuftrag(auftragId)
    if (!routeAntwort.ok) {
      const routeInhalt = await routeAntwort.json().catch(() => ({}))
      vormerkenZustaende.set(index, { phase: 'fehler', auftragId, meldung: t('werkstatt.scout.fehler.routen', { auftrag: auftragId, details: `${routeAntwort.status} ${routeInhalt.grund ?? ''}`.trim() }) })
      renderScoutPanel()
      return
    }
    vormerkenZustaende.set(index, { phase: 'geroutet', auftragId, workflowId })
    renderScoutPanel()
  } catch (fehler) {
    vormerkenZustaende.set(index, { phase: 'fehler', auftragId, meldung: t('werkstatt.scout.fehler.anfrage', { grund: fehler.message }) })
    renderScoutPanel()
  }
}

/**
 * F-955 (F44 WS-7b): Zurücksetzen beim Projektwechsel. Ein Scout-Lauf und seine Kandidaten gehören zum alten
 * Projekt; ohne Zurücksetzen pollte aktualisiereScoutZustand die alte laufId unter dem neuen Präfix (404, für
 * immer „läuft…“, alle „Kandidaten suchen“ gesperrt). Ein noch laufender Lauf läuft serverseitig weiter und
 * bleibt unter „Ausführungen“ des alten Projekts sichtbar; hier wird nur die Anzeige verworfen. Danach sind
 * die Knöpfe wieder frei (renderScoutPanel → aktualisiereScoutButtonZustand).
 * Bekannte Grenzen (F-957, Ablauf in WS-7b bewusst unverändert): Läuft der alte Lauf noch, belegt er D13 — eine
 * neue Suche scheitert dann mit 409 und lässt einen Auftrag zurück; seine Kandidaten sind im Leitstand nicht mehr
 * erreichbar; ein gerade laufendes Vormerken hat keinen Überholschutz (routet ggf. unter dem neuen Präfix).
 */
function setzeScoutZurueck() {
  scoutZustand = null
  vormerkenZustaende = new Map()
  geoeffneteQuellen.clear()
  renderScoutPanel()
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

/**
 * Lädt Katalog, Coverage und Harness parallel (AK1, AK2, AK6; F46 D6). Ein Fehlschlag EINER Quelle zeigt sich nur in
 * ihrem eigenen Bereich (Muster views/workboard.js: eine defekte Quelle blendet nicht die ganze View aus).
 * Überholschutz über ladeZaehler; während des Ladens zeigen Suche und Filter keine alten Zeilen.
 */
async function ladeCapabilities() {
  const meineNummer = ++ladeZaehler
  zeigeCapabilityLibraryLaedt()
  zeigeHarnessLaedt()
  document.getElementById('capabilities-abdeckung').innerHTML = `<p class="leer">${tHtml('werkstatt.laedt')}</p>`
  const [libraryErgebnis, abdeckungErgebnis, harnessErgebnis] = await Promise.allSettled([holeRessourcen(), holeAbdeckung(), holeHarness()])
  if (meineNummer !== ladeZaehler) return

  rendereQuelle(
    libraryErgebnis,
    (ansicht) => {
      renderCapabilityLibrary(ansicht)
      bekannteRessourcenIds = new Set(ansicht.eintraege.map((eintrag) => eintrag.id))
      if (scoutZustand?.phase === 'fertig') renderScoutPanel()
    },
    zeigeCapabilityLibraryFehler,
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
  rendereQuelle(
    harnessErgebnis,
    (harness) => {
      renderHarness(harness)
      aktualisiereLibraryHinweis(harness)
    },
    (grund) => {
      zeigeHarnessFehler(grund)
      aktualisiereLibraryHinweis(null)
    },
    'GET …/harness'
  )
}

/**
 * „Im Harness-Aufbau zeigen“ (Library) und „Zur Capability Library“ (Harness): Register wechseln.
 * @param reiterId - ID des Reiters im Register werkstatt-register
 */
function wechsleZuReiter(reiterId) {
  const tablist = document.getElementById('werkstatt-register')
  const reiter = document.getElementById(reiterId)
  waehleReiter(tablist, reiter)
  reiter.focus()
}

/**
 * Initialisiert die Capabilities-View einmalig beim Bootstrap (Muster views/workboard.js initWorkboardView).
 * Ein Projektwechsel (F-860) lädt Katalog, Abdeckung und Harness des neuen Projekts, schließt offene Details,
 * verwirft Auswahlen und setzt den Scout-Zustand zurück (setzeScoutZurueck, F-955).
 */
export function initCapabilitiesView() {
  initRegister('werkstatt-register', setzeKopf)
  initRegister('faehigkeiten-register')
  setzeKopf(document.querySelector('#werkstatt-register [aria-selected="true"]'))
  initHarnessAufbau()
  initCapabilityLibrary({
    neuLaden: () => ladeCapabilities(),
    zeigeImHarnessAufbau: (pfad) => {
      wechsleZuReiter('werkstatt-reiter-harness')
      oeffneHarnessOrt(pfad)
    },
  })
  initAbdeckungBedienung()
  initScoutBedienung()
  document.getElementById('harness-zur-library').addEventListener('click', () => wechsleZuReiter('werkstatt-reiter-faehigkeiten'))
  abonniereDetailAuffrischer(() => {
    void aktualisiereScoutZustand()
  })
  abonniereProjektWechsel(() => {
    offeneRollen.clear()
    setzeScoutZurueck()
    setzeHarnessZurueck()
    setzeCapabilityLibraryZurueck()
    void ladeCapabilities()
  })
  document.getElementById('capabilities-neu-laden').addEventListener('click', () => {
    void ladeCapabilities()
  })

  registriere(/^#\/capabilities$/, 'capabilities', () => {
    void ladeCapabilities()
  })
}
