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
 */

import { holeProjekte } from '../api.js'
import { setzeAktivesProjekt } from '../projekt-kontext.js'
import { escapeHtml } from '../render.js'
import { navigiere, registriere } from '../router.js'

function projektKarte(projekt) {
  const laufBadge = projekt.laufAktiv ? '<span class="badge ok">aktiver Lauf</span>' : '<span class="badge neutral">kein aktiver Lauf</span>'
  return `<div class="unterabschnitt projekt-karte">
    <h3>${escapeHtml(projekt.name)}</h3>
    <p class="hinweis"><code>${escapeHtml(projekt.id)}</code> — ${escapeHtml(projekt.status)}</p>
    <p>${laufBadge}</p>
    <button type="button" class="projekt-waehlen" data-id="${escapeHtml(projekt.id)}" data-name="${escapeHtml(projekt.name)}">Öffnen</button>
  </div>`
}

async function ladeProjekte() {
  const container = document.getElementById('projekte-uebersicht-liste')
  container.innerHTML = '<p class="leer">Lädt…</p>'
  try {
    const daten = await holeProjekte()
    container.innerHTML = daten.projekte.length === 0 ? '<p class="leer">Keine Projekte registriert.</p>' : daten.projekte.map(projektKarte).join('')
  } catch (fehler) {
    container.innerHTML = `<p class="fehler">Anfrage fehlgeschlagen: ${escapeHtml(fehler.message)}</p>`
  }
}

function initBedienung() {
  document.getElementById('projekte-uebersicht-liste').addEventListener('click', (ereignis) => {
    const button = ereignis.target.closest('.projekt-waehlen')
    if (button === null) return
    setzeAktivesProjekt({ id: button.dataset.id, name: button.dataset.name })
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
