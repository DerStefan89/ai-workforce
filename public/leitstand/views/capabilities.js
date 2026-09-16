/**
 * Datei: public/leitstand/views/capabilities.js
 *
 * Zweck: View `#/capabilities` (F24 WS-1) — Library, Coverage je Rolle und
 * Rollen-Besetzung, jede eine reine Projektion über GET /api/ressourcen,
 * GET /api/ressourcen/abdeckung und GET /api/ressourcen/rollen/<rolle>
 * (scripts/leitstand-server.mjs, src/capabilities-ansicht/index.ts). Vor F24
 * war dieser Container ein bewusster Platzhalter (F20 WS-1) — siehe
 * features/F24/feature.md.
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
 * Wichtig: rein lesend (F24-Nicht-Ziel: kein Schreibpfad) — anders als
 * views/workboard.js gibt es hier keinen Bearbeitungszustand.
 */

import { holeAbdeckung, holeRessourcen, holeRollenBesetzung } from '../api.js'
import { escapeHtml } from '../render.js'
import { navigiere, registriere } from '../router.js'

/** Rollen, bereits alphabetisch aus der zuletzt geladenen Abdeckung — befüllt das Rollen-Select, ohne einen dritten Endpunkt zu brauchen. */
let bekannteRollenListe = []

function renderStartvorlage(startvorlagePfad) {
  document.getElementById('capabilities-startvorlage').textContent = `Aktiv geladene Startvorlage: ${startvorlagePfad}`
}

// ─── Library ─────────────────────────────────────────────────────────────

const PHASE_LABEL = { DISCOVERED: 'DISCOVERED', ASSESSED: 'ASSESSED', APPROVED: 'APPROVED', AVAILABLE: 'AVAILABLE' }

function renderPhasenBadges(phasen) {
  if (phasen.length === 0) return '<span class="unbekannt">—</span>'
  return phasen.map((p) => `<span class="badge ok">${escapeHtml(PHASE_LABEL[p] ?? p)}</span>`).join(' ')
}

function renderVerfuegbarBadge(verfuegbar) {
  return verfuegbar ? '<span class="badge ok">verfügbar</span>' : '<span class="badge fehler">nicht verfügbar</span>'
}

function libraryZeile(eintrag) {
  return `<tr>
    <td><code>${escapeHtml(eintrag.id)}</code></td>
    <td>${escapeHtml(eintrag.typ)}</td>
    <td>${escapeHtml(eintrag.name)}</td>
    <td>${escapeHtml(eintrag.freigabe)}</td>
    <td>${renderVerfuegbarBadge(eintrag.verfuegbar)}</td>
    <td>${renderPhasenBadges(eintrag.phasen)}</td>
    <td>${escapeHtml(eintrag.anzeigeGrund)}</td>
  </tr>`
}

const LIBRARY_TABELLE_KOPF = '<tr><th>ID</th><th>Typ</th><th>Name</th><th>Freigabe</th><th>Verfügbar</th><th>Phasen</th><th>Grund</th></tr>'

/** AK5: rendert die vier Phasen — die Library-Tabelle selbst (alle Einträge, mit ihren jeweiligen Phasen-Badges) plus eine benannte Zeile für ASSESSED, die strukturell nie ein Badge trägt (kein stilles Verschwinden dieser Phase). @param ansicht - Antwort von GET /api/ressourcen */
function renderLibrary(ansicht) {
  const tabelle =
    ansicht.eintraege.length === 0
      ? '<p class="leer">Keine Ressourcen registriert.</p>'
      : `<table><thead>${LIBRARY_TABELLE_KOPF}</thead><tbody>${ansicht.eintraege.map(libraryZeile).join('')}</tbody></table>`
  document.getElementById('capabilities-library').innerHTML = `${tabelle}<p class="hinweis"><span class="badge stale">ASSESSED</span> ${escapeHtml(ansicht.assessedHinweis)}</p>`
}

// ─── Coverage ────────────────────────────────────────────────────────────

function workerAbdeckungZeile(rolle, eintrag) {
  const status = eintrag.restFehlend.length === 0 ? '<span class="badge ok">gedeckt</span>' : '<span class="badge fehler">Gap</span>'
  const f346 = eintrag.f346Ausnahme ? ' <span class="badge stale">F-346-Ausnahme</span>' : ''
  const fehlendText = eintrag.restFehlend.length > 0 ? `<div class="grund">fehlt: ${eintrag.restFehlend.map(escapeHtml).join(', ')}</div>` : ''
  const gapLink = eintrag.restFehlend.length > 0 ? `<button type="button" class="capabilities-gap-link" data-rolle="${escapeHtml(rolle)}">Zum Workboard</button>` : ''
  return `<tr>
    <td><code>${escapeHtml(eintrag.worker)}</code></td>
    <td>${status}${f346}</td>
    <td>${fehlendText}${gapLink}</td>
  </tr>`
}

function abdeckungBlock(eintrag) {
  const statusBadge = eintrag.gedeckt ? '<span class="badge ok">gedeckt</span>' : '<span class="badge fehler">Gap offen</span>'
  const zeilen = eintrag.workerAbdeckung.length === 0 ? '<tr><td colspan="3" class="unbekannt">kein registrierter erlaubter Worker</td></tr>' : eintrag.workerAbdeckung.map((w) => workerAbdeckungZeile(eintrag.rolle, w)).join('')
  return `<div class="unterabschnitt">
    <h3><code>${escapeHtml(eintrag.rolle)}</code> ${statusBadge}</h3>
    <p class="hinweis">benötigt: ${eintrag.benoetigteCapabilities.map(escapeHtml).join(', ')}</p>
    <table><thead><tr><th>Worker</th><th>Status</th><th>Lücke</th></tr></thead><tbody>${zeilen}</tbody></table>
  </div>`
}

/** AK2/AK3: Coverage je Rolle, F-346-Ausnahmen markiert (workerAbdeckungZeile), echte Gaps verlinken zum Workboard. @param ansicht - Antwort von GET /api/ressourcen/abdeckung */
function renderAbdeckung(ansicht) {
  document.getElementById('capabilities-abdeckung').innerHTML = ansicht.rollen.length === 0 ? '<p class="leer">Keine Rollen registriert.</p>' : ansicht.rollen.map(abdeckungBlock).join('')
}

/**
 * AK3: "Gap-Einträge verlinken zum Workboard" — bewusst ein reiner
 * Routenwechsel zu `#/workboard`, kein Deep-Link/Filter auf die konkrete
 * Rolle oder Capability. Das Workboard (F21) kennt heute keine
 * Capability-Gaps als eigene Workitem-Quelle und filtert nur nach
 * typ/status/prioritaet (src/workboard/index.ts) — eine tiefere Verlinkung
 * wäre F21-Scope, nicht F24 (QA-Pass 16.09.2026, dokumentiert statt
 * stillschweigend belassen, CLAUDE.md-Entscheidungsregel Punkt 5).
 */
function initAbdeckungBedienung() {
  document.getElementById('capabilities-abdeckung').addEventListener('click', (ereignis) => {
    if (!ereignis.target.matches('.capabilities-gap-link')) return
    navigiere('#/workboard')
  })
}

// ─── Rollen-Besetzung (AK4) ──────────────────────────────────────────────

function fuelleRollenAuswahl(rollen) {
  bekannteRollenListe = [...rollen].sort()
  const select = document.getElementById('capabilities-rollen-auswahl')
  const aktuellerWert = select.value
  select.innerHTML = `<option value="">— wählen —</option>${bekannteRollenListe.map((r) => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join('')}`
  select.value = bekannteRollenListe.includes(aktuellerWert) ? aktuellerWert : ''
}

function renderRollenvertrag(vertrag) {
  return `<div class="unterabschnitt">
    <h3>Ebene 1 — Rollenvertrag</h3>
    <table class="lauf-kopfdaten"><tbody>
      <tr><th>Zweck</th><td>${escapeHtml(vertrag.zweck)}</td></tr>
      <tr><th>Erlaubte Werkzeugsatz-Arten</th><td>${vertrag.erlaubte_werkzeugsatz_arten.map(escapeHtml).join(', ')}</td></tr>
      <tr><th>Erlaubte Worker</th><td>${vertrag.erlaubte_worker.map(escapeHtml).join(', ')}</td></tr>
      <tr><th>Erlaubtes Output-Schema</th><td>${vertrag.erlaubtes_output_schema === null ? '<span class="unbekannt">keins</span>' : escapeHtml(vertrag.erlaubtes_output_schema)}</td></tr>
      <tr><th>Benötigte Capabilities</th><td>${vertrag.benoetigte_capabilities.map(escapeHtml).join(', ')}</td></tr>
    </tbody></table>
  </div>`
}

function renderVorlagenBesetzung(vorlagenBesetzung) {
  const zeilen =
    vorlagenBesetzung.length === 0
      ? '<p class="unbekannt">Keine statische Workflow-Vorlage enthält diese Rolle (z. B. ein router-generierter Workflow ohne statisches Vorlagen-Pendant).</p>'
      : `<table><thead><tr><th>Vorlage</th><th>Schritt</th><th>Worker</th><th>Modell</th></tr></thead><tbody>${vorlagenBesetzung
          .map((v) => `<tr><td>${escapeHtml(v.vorlage)}</td><td><code>${escapeHtml(v.schrittId)}</code></td><td>${escapeHtml(v.worker)}</td><td>${escapeHtml(v.modell)}</td></tr>`)
          .join('')}</tbody></table>`
  return `<div class="unterabschnitt"><h3>Ebene 2 — Vorlagen-Besetzung</h3>${zeilen}</div>`
}

function renderRealeBesetzung(letzteRealeBesetzung) {
  if (letzteRealeBesetzung.status === 'kein_lauf') {
    return '<div class="unterabschnitt"><h3>Ebene 3+4 — Reale Besetzung</h3><p class="unbekannt">Diese Rolle ist noch in keinem realen Workflow gelaufen.</p></div>'
  }
  const kopf = `<p class="hinweis">Jüngster realer Lauf: Workflow <code>${escapeHtml(letzteRealeBesetzung.workflowId)}</code>, Schritt <code>${escapeHtml(letzteRealeBesetzung.schrittId)}</code>, Lauf <code>${escapeHtml(letzteRealeBesetzung.laufId)}</code></p>`
  const gepinnt = `<tr><th>Ebene 3 — gepinnt (Workflow-Schritt)</th><td>${escapeHtml(letzteRealeBesetzung.gepinnt.worker)} / ${escapeHtml(letzteRealeBesetzung.gepinnt.modell)}</td></tr>`
  const beobachtetZeile =
    letzteRealeBesetzung.status === 'laufakte_fehlt'
      ? '<tr><th>Ebene 4 — beobachtet (Laufakte)</th><td class="unbekannt">Laufakte nicht ladbar</td></tr>'
      : `<tr><th>Ebene 4 — beobachtet (Laufakte)</th><td>${escapeHtml(letzteRealeBesetzung.beobachtet.worker)} / ${letzteRealeBesetzung.beobachtet.modellDeklariert === null ? '<span class="unbekannt">kein Modell deklariert</span>' : escapeHtml(letzteRealeBesetzung.beobachtet.modellDeklariert)}</td></tr>`
  return `<div class="unterabschnitt"><h3>Ebene 3+4 — Reale Besetzung</h3>${kopf}<table class="lauf-kopfdaten"><tbody>${gepinnt}${beobachtetZeile}</tbody></table></div>`
}

let rollenAnfrageZaehler = 0

/** AK4: lädt und rendert alle vier Ebenen für die gewählte Rolle. Überholschutz (Muster views/workboard.js anfrageZaehler) — ein schneller zweiter Rollenwechsel darf nicht mit der Antwort des ersten überschrieben werden. @param rolle - gewählte Rolle, oder '' (nichts gewählt) */
async function ladeRollenDetail(rolle) {
  const meineAnfrageNummer = ++rollenAnfrageZaehler
  const container = document.getElementById('capabilities-rollen-detail')
  if (rolle === '') {
    container.innerHTML = ''
    return
  }
  container.innerHTML = '<p class="leer">Lädt…</p>'
  try {
    const antwort = await holeRollenBesetzung(rolle)
    if (meineAnfrageNummer !== rollenAnfrageZaehler) return
    if (!antwort.ok) {
      const inhalt = await antwort.json().catch(() => ({}))
      container.innerHTML = `<p class="fehler">${antwort.status}: ${escapeHtml(inhalt.grund ?? 'unbekannter Fehler')}</p>`
      return
    }
    const ansicht = await antwort.json()
    container.innerHTML = renderRollenvertrag(ansicht.rollenvertrag) + renderVorlagenBesetzung(ansicht.vorlagenBesetzung) + renderRealeBesetzung(ansicht.letzteRealeBesetzung)
  } catch (fehler) {
    if (meineAnfrageNummer !== rollenAnfrageZaehler) return
    container.innerHTML = `<p class="fehler">Anfrage fehlgeschlagen: ${escapeHtml(fehler.message)}</p>`
  }
}

function initRollenBedienung() {
  document.getElementById('capabilities-rollen-auswahl').addEventListener('change', (ereignis) => {
    void ladeRollenDetail(ereignis.target.value)
  })
}

// ─── Laden/Neu laden ────────────────────────────────────────────────────

/** Lädt Library + Coverage parallel (AK1, AK2, AK6), befüllt danach das Rollen-Select aus der Coverage-Antwort — kein dritter Endpunkt für die Rollenliste. Ein Fehlschlag EINER der beiden Quellen zeigt sich nur in ihrem eigenen Container (Muster views/workboard.js: eine defekte Quelle blendet nicht die ganze View aus). */
async function ladeCapabilities() {
  document.getElementById('capabilities-library').innerHTML = '<p class="leer">Lädt…</p>'
  document.getElementById('capabilities-abdeckung').innerHTML = '<p class="leer">Lädt…</p>'
  const [libraryErgebnis, abdeckungErgebnis] = await Promise.allSettled([holeRessourcen(), holeAbdeckung()])

  if (libraryErgebnis.status === 'fulfilled') {
    renderStartvorlage(libraryErgebnis.value.startvorlagePfad)
    renderLibrary(libraryErgebnis.value)
  } else {
    document.getElementById('capabilities-library').innerHTML = `<p class="fehler">Anfrage fehlgeschlagen: ${escapeHtml(libraryErgebnis.reason.message)}</p>`
  }

  if (abdeckungErgebnis.status === 'fulfilled') {
    renderAbdeckung(abdeckungErgebnis.value)
    fuelleRollenAuswahl(abdeckungErgebnis.value.rollen.map((r) => r.rolle))
  } else {
    document.getElementById('capabilities-abdeckung').innerHTML = `<p class="fehler">Anfrage fehlgeschlagen: ${escapeHtml(abdeckungErgebnis.reason.message)}</p>`
  }
}

/** Initialisiert die Capabilities-View einmalig beim Bootstrap (Muster views/workboard.js initWorkboardView). */
export function initCapabilitiesView() {
  initAbdeckungBedienung()
  initRollenBedienung()
  document.getElementById('capabilities-neu-laden').addEventListener('click', () => {
    void ladeCapabilities()
  })

  registriere(/^#\/capabilities$/, 'capabilities', () => {
    void ladeCapabilities()
  })
}
