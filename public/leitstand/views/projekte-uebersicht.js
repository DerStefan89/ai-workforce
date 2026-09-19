/**
 * Datei: public/leitstand/views/projekte-uebersicht.js
 *
 * Zweck: View `#/projekte-uebersicht` (F25 WS-2a, AK12/AK13) — Karten je
 * Registereintrag aus GET /api/projekte (id, name, status, aktiver Lauf).
 * Explizit KEINE Health-Spalte/-Badge (WS-3, nicht dieser Auftrag).
 *
 * Klick auf eine Karte setzt das aktive Projekt (projekt-kontext.js,
 * AK13) und navigiert zum Dashboard — ab dann arbeiten alle bestehenden
 * Views (Workboard, Runs, Capabilities, Projekt/Auftrag&Start, Workflows,
 * Attention) unverändert gegen das gewählte Projekt, weil api.js seinen
 * Präfix bereits umgeschaltet hat (AK10) — keine Änderung an den anderen
 * View-Dateien nötig.
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initProjekteUebersichtView beim Bootstrap)
 *
 * Wichtig: rein lesend bis auf den Kartenklick, der ausschließlich
 * Client-Zustand ändert (api.js-Präfix) — kein Schreibpfad gegen den
 * Server (Muster views/capabilities.js Library/Coverage-Teil).
 *
 * F29 WS-2a: reine Stylingumstellung auf das Komponentenvokabular aus
 * views/workboard.js (WS-1b) — Karten-Divs wurden zu .list-row-Zeilen in
 * EINER .card (index.html), "Öffnen" ist jetzt .btn.btn-primary statt
 * eines ungestylten <button>. Klick-Verhalten und Datenbedarf unverändert.
 *
 * F29 WS-D2 (Auftrag Punkt D): je Projekt jetzt eine eigene Karte im Stil
 * des Fokus-Panels (views/workboard.js bentoFokusKarte — Icon, ID-Chip,
 * Status-Pille, Meta-Kacheln) statt einer .list-row-Zeile. repo_pfad ist
 * TEIL der bereits geladenen GET /api/projekte-Antwort (scripts/leitstand-
 * server.mjs spreadet den vollen Registereintrag, kein neuer Endpunkt) —
 * "letzter Lauf" bleibt bewusst WEG: es gibt keinen billigen, bereits
 * geladenen Zeitpunkt dafür (nur laufAktiv als Bool), ein Zeitpunkt bräuchte
 * einen zusätzlichen Abruf JE Projektkarte (Auftrag: "sofern Daten
 * vorhanden" — hier nicht der Fall), siehe Bericht.
 */

import { holeProjekte } from '../api.js'
import { holeAktivesProjekt, setzeAktivesProjekt } from '../projekt-kontext.js'
import { escapeHtml } from '../render.js'
import { navigiere, registriere } from '../router.js'
import { merkeGeoeffnet } from '../zuletzt-geoeffnet.js'

const ICON_PROJEKT = '<svg viewBox="0 0 24 24" focusable="false"><path d="M4 6.5h6l1.6 2H20v9H4v-11Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" /></svg>'
const ICON_PFAD = '<svg viewBox="0 0 24 24" focusable="false"><path d="M4 12h16M4 6h16M4 18h10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>'
const ICON_PHASE = '<svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6" /><path d="M12 7v5l3.5 2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>'
const ICON_LAUF = '<svg viewBox="0 0 24 24" focusable="false"><path d="M8 5l11 7-11 7V5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" /></svg>'

/** Kürzt einen Pfad auf die letzten zwei Segmente ("…/ordner/datei") für die Meta-Kachel — der volle Pfad bleibt im title-Attribut erreichbar. @param pfad - repo_pfad @returns gekürzte Anzeige */
function kuerzePfad(pfad) {
  const teile = pfad.replaceAll('\\', '/').split('/').filter((t) => t.length > 0)
  return teile.length <= 2 ? pfad : `…/${teile.slice(-2).join('/')}`
}

function metaKachel(icon, label, wert, titel) {
  const titelAttribut = titel ? ` title="${escapeHtml(titel)}"` : ''
  return `<div class="bento-meta-kachel"${titelAttribut}><span class="bento-meta-icon" aria-hidden="true">${icon}</span><div><p class="bento-meta-label">${label}</p><p class="bento-meta-wert">${wert}</p></div></div>`
}

function projektKarte(projekt, aktivesProjektId) {
  const istAktiv = projekt.id === aktivesProjektId
  const aktionHtml = istAktiv
    ? '<span class="badge aktiv">Aktiv</span>'
    : `<button type="button" class="btn btn-primary projekt-waehlen" data-id="${escapeHtml(projekt.id)}" data-name="${escapeHtml(projekt.name)}" data-status-kategorie="${projekt.laufAktiv ? 'aktiv' : 'neutral'}">Öffnen</button>`
  return `<div class="card projekte-karte${istAktiv ? ' projekte-karte-aktiv' : ''}">
    <div class="projekte-karte-kopf">
      <span class="bento-fokus-icon" aria-hidden="true">${ICON_PROJEKT}</span>
      <div class="projekte-karte-kopf-text">
        <div class="bento-fokus-zeile1">
          <span class="badge bento-id-chip">${escapeHtml(projekt.id)}</span>
          <span class="badge aktiv">${escapeHtml(projekt.status)}</span>
        </div>
        <p class="bento-fokus-titel">${escapeHtml(projekt.name)}</p>
      </div>
      <div class="projekte-karte-aktion">${aktionHtml}</div>
    </div>
    <div class="bento-meta-zeile">
      ${metaKachel(ICON_PFAD, 'Pfad', escapeHtml(kuerzePfad(projekt.repo_pfad)), projekt.repo_pfad)}
      ${metaKachel(ICON_PHASE, 'Phase', escapeHtml(projekt.status))}
      ${metaKachel(ICON_LAUF, 'Aktiver Lauf', projekt.laufAktiv ? 'Ja' : 'Nein')}
    </div>
  </div>`
}

async function ladeProjekte() {
  const container = document.getElementById('projekte-uebersicht-liste')
  container.innerHTML = '<p class="leer">Lädt…</p>'
  try {
    const daten = await holeProjekte()
    const aktivesProjektId = holeAktivesProjekt().id
    container.innerHTML = daten.projekte.length === 0 ? '<p class="leer">Keine Projekte registriert.</p>' : daten.projekte.map((p) => projektKarte(p, aktivesProjektId)).join('')
  } catch (fehler) {
    container.innerHTML = `<p class="fehler">Anfrage fehlgeschlagen: ${escapeHtml(fehler.message)}</p>`
  }
}

function initBedienung() {
  document.getElementById('projekte-uebersicht-liste').addEventListener('click', (ereignis) => {
    const button = ereignis.target.closest('.projekt-waehlen')
    if (button === null) return
    setzeAktivesProjekt({ id: button.dataset.id, name: button.dataset.name })
    // F29 WS-D2 (Auftrag Punkt B): merkt den Öffnen-Klick für die Schnellzugriff-Box (zuletzt-geoeffnet.js).
    merkeGeoeffnet({ typ: 'projekt', id: button.dataset.id, label: button.dataset.name, hash: '#/dashboard', statusKategorie: button.dataset.statusKategorie })
    navigiere('#/dashboard')
  })
  document.getElementById('projekte-uebersicht-neu-laden').addEventListener('click', () => {
    void ladeProjekte()
  })
}

/** Initialisiert die Projekte-Übersicht einmalig beim Bootstrap (Muster views/capabilities.js initCapabilitiesView) — registriert ihre Route selbst (Muster views/workboard.js), weil sie beim Eintritt einen echten Abruf braucht. */
export function initProjekteUebersichtView() {
  initBedienung()
  registriere(/^#\/projekte-uebersicht$/, 'projekte-uebersicht', () => {
    void ladeProjekte()
  })
}
