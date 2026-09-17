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

import { holeAbdeckung, holeLaufDetail, holeRessourcen, holeRollenBesetzung, legeAuftragAn, routeAuftrag, starteLauf } from '../api.js'
import { escapeHtml } from '../render.js'
import { navigiere, registriere } from '../router.js'
import { abonniereDetailAuffrischer } from '../zustand.js'

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
  // F27 WS-2 (AK10): "Kandidaten suchen" nur an einer echten Gap-Zeile, neben dem bestehenden
  // Workboard-Link — data-capabilities trägt restFehlend als JSON (Klick-Handler braucht sie
  // unverändert, keine zweite Herleitung).
  const scoutLink =
    eintrag.restFehlend.length > 0
      ? `<button type="button" class="capabilities-gap-link" data-rolle="${escapeHtml(rolle)}">Zum Workboard</button> <button type="button" class="capabilities-scout-link" data-rolle="${escapeHtml(rolle)}" data-capabilities="${escapeHtml(JSON.stringify(eintrag.restFehlend))}">Kandidaten suchen</button>`
      : ''
  return `<tr>
    <td><code>${escapeHtml(eintrag.worker)}</code></td>
    <td>${status}${f346}</td>
    <td>${fehlendText}${scoutLink}</td>
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
    }
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

/** Leitet eine ressourcen.json-taugliche id aus einem Kandidatennamen ab (Schema-Pattern ^[a-z0-9][a-z0-9-]*$). @param name - kandidat.name @returns kleingeschriebene, bindestrich-getrennte id, nie leer */
function ableiteRessourcenId(name) {
  const roh = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return roh.length > 0 ? roh : 'kandidat'
}

/**
 * Baut den Auftragstext des Vormerken-Auftrags (AK12) — weist die ausführende Rolle an, GENAU
 * EINEN neuen Eintrag zu ressourcen.json hinzuzufügen. freigabe:'OFFEN' steht als PFLICHTFELD im
 * Text (schemas/ressourcen.schema.json Regel R2 erzwingt es ohnehin für typ 'extern', hier
 * zusätzlich für typ 'skill' ausdrücklich verlangt — ein Vormerken ist nie zugleich eine
 * Freigabe). Kein neuer Endpunkt, keine neue Schreiblogik (F27/feature.md AK12) — der Auftrag
 * durchläuft denselben Weg wie jeder andere (POST /api/auftraege → POST .../routen →
 * ZWINGEND-Freigabe am ausfuehrung-Schritt, Muster views/workboard.js starteBearbeitung).
 * @param kandidat - ein Eintrag aus ergebnis.kandidaten
 * @param laufId - laufId des Scout-Laufs, aus dem der Kandidat stammt (Beleg)
 * @returns Auftragstext für POST /api/auftraege
 */
function baueVormerkenAuftragstext(kandidat, laufId) {
  const id = ableiteRessourcenId(kandidat.name)
  const herkunftZeile =
    kandidat.typ === 'skill'
      ? `herkunft: { "art": "skill", "pfad": ".claude/skills/${id}" } (Zielpfad, sobald der Skill lokal vorliegt — Installation ist Nicht-Ziel dieses Auftrags)`
      : `herkunft: { "art": "extern", "url": "${kandidat.quelle_url}" }`
  return [
    'Füge der Datei ressourcen.json (Repo-Wurzel) GENAU EINEN neuen Eintrag im ressourcen[]-Array hinzu. Keine weitere Änderung an dieser Datei, kein bestehender Eintrag wird verändert oder entfernt.',
    `Neuer Eintrag:\n- id: "${id}"\n- typ: "${kandidat.typ}"\n- capabilities: ${JSON.stringify(kandidat.capabilities)}\n- freigabe: "OFFEN" (PFLICHT — Registrierung erzeugt keine Verfügbarkeit, schemas/ressourcen.schema.json Regel R2; eine spätere Freigabe entscheidet ein Mensch separat)\n- ${herkunftZeile}`,
    `Beleg: Kandidat aus Scout-Lauf '${laufId}' (schemas/ergebnis-scout.schema.json).`,
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

/** Rendert die Vormerken-Zelle eines Kandidaten je nach vormerkenZustaende[index] — Button, Fortschritt, Fehler mit Wiederholen (reicht eine bereits angelegte auftragId erneut ein statt einen zweiten, verwaisten Auftrag anzulegen, Muster views/workboard.js wiederholeRouten), oder ein Link zur normalen Workflow-Freigabe (kein Duplikat der Kette aus views/workboard.js, siehe baueVormerkenAuftragstext-Kommentar). @param index - Position des Kandidaten @param kandidat - der Kandidat dieser Zeile (für den Kollisions-Vorab-Hinweis) */
function vormerkenZelle(index, kandidat) {
  const zustandKandidat = vormerkenZustaende.get(index)
  if (zustandKandidat === undefined) {
    return `${kollisionsHinweis(kandidat)}<button type="button" class="scout-vormerken" data-index="${index}">Vormerken</button>`
  }
  if (zustandKandidat.phase === 'unterwegs') return '<p class="hinweis">Wird vorgemerkt…</p>'
  if (zustandKandidat.phase === 'fehler') {
    return `<p class="fehler">${escapeHtml(zustandKandidat.meldung)}</p><button type="button" class="scout-vormerken" data-index="${index}">Erneut versuchen</button>`
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
 * statt die Freigabe-Kette hier zu duplizieren (siehe baueVormerkenAuftragstext-Kommentar). Ein
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
    bekannteRessourcenIds = new Set(libraryErgebnis.value.eintraege.map((eintrag) => eintrag.id))
    if (scoutZustand?.phase === 'fertig') renderScoutPanel()
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
  initScoutBedienung()
  abonniereDetailAuffrischer(() => {
    void aktualisiereScoutZustand()
  })
  document.getElementById('capabilities-neu-laden').addEventListener('click', () => {
    void ladeCapabilities()
  })

  registriere(/^#\/capabilities$/, 'capabilities', () => {
    void ladeCapabilities()
  })
}
