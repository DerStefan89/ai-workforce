/**
 * Datei: public/leitstand/views/workflows.js
 *
 * Zweck: Workflow-Ansicht und -Bedienung (F15 WS-3a/WS-3b), seit F20 WS-1
 * als eigenes Modul unter der View `#/runs` gemountet — es gibt keinen
 * eigenen Navigationspunkt für Workflows (F20 Ziel nennt Dashboard, Projekt,
 * Workboard, Runs, Capabilities), die Detailansicht ist über die Route
 * `#/workflows/<id>` direkt verlinkbar (AK2) und zeigt dabei die Runs-View.
 * Deckt zwei der sechs Bedienflüsse ab, die laut F20 AK1 real unverändert
 * funktionieren müssen: Freigabe/Stopp und Reparaturfassung.
 *
 * Die Oberfläche entscheidet dabei NICHTS selbst (D5). Was angeboten wird,
 * hängt an zwei Aussagen des Servers: naechster.art (das Verdikt von
 * ermittleNaechstenSchritt) und status. D13 (genau ein aktiver Lauf) wird
 * nicht vorhergesagt — kommt ein 409 zurück, steht sein Grundtext als
 * Meldung am Workflow.
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initWorkflowsView beim Bootstrap)
 *
 * Wichtig: Kein eigener Zustand, keine eigene Laufstatus-Ableitung — jede
 * Anzeige stammt direkt aus dem Server. #workflow-detail-inhalt wird bei
 * jedem 2-Sekunden-Poll komplett ersetzt, #workflow-bedienung nur bei ECHTER
 * Zustandsänderung (Signatur-Vergleich, F-249) und #workflow-reparatur gar
 * nicht — der Entwurf gehört dem Menschen, bis er ihn einreicht oder
 * verwirft (F-249).
 */

import { holeLaufDetail, holeWorkflowDetail, holeWorkflows, reicheWorkflowFassungEin, sendeWorkflowFreigabe, starteWorkflowSchritt, stoppeWorkflow } from '../api.js'
import { escapeHtml, zeigePollFehler } from '../render.js'
import { navigiere, registriere } from '../router.js'

/**
 * Die LAGE eines Workflows in einem Satz, je Ausgang von
 * ermittleNaechstenSchritt (löst F-253). Die Texte sind ANZEIGE, keine
 * Regel: welcher Ausgang vorliegt, hat der Server entschieden.
 */
const LAGE_JE_AUSGANG = {
  starte: 'bereit zum Start',
  haltFreigabe: 'wartet auf dich — Freigabe nötig',
  haltKlaerung: 'steht — Klärung nötig',
  haltGrenze: 'steht — Grenze erreicht',
  haltGestoppt: 'gestoppt',
  fertig: 'durchgelaufen',
}

/**
 * Übersetzt status und naechster in die angezeigte Lage. status hat VORRANG,
 * wenn er LAEUFT lautet (Auflösung einer Mehrdeutigkeit, siehe F-248/F-264 —
 * "läuft" heißt hier nur, dass der abgelegte Status LAEUFT lautet, nicht,
 * dass ein Lauf noch lebt).
 * @param status - daten.status bzw. workflow.status
 * @param naechster - Projektion aus dem Server, oder null bei ungültiger Fassung
 * @returns Lagetext
 */
function beschreibeLage(status, naechster) {
  if (naechster === null || naechster === undefined) return 'nicht bestimmbar — die Fassung validiert nicht'
  if (status === 'LAEUFT') return 'läuft'
  return LAGE_JE_AUSGANG[naechster.art] ?? `unbekannter Ausgang '${naechster.art}'`
}

/**
 * Eine Kopfdaten-Zeile aus GET /api/workflows. grund steht als eigene
 * Tabellenzeile (F-221 (a)) — bei KLAERUNG_ERFORDERLICH/GESTOPPT die einzige
 * Auskunft darüber, warum der Automat steht.
 * @param workflow - ein Eintrag aus GET /api/workflows
 * @returns HTML-Block für die Workflow-Liste
 */
function workflowKopfzeile(workflow) {
  const detailsButton = `<button class="workflow-details-btn" data-workflow-id="${escapeHtml(workflow.workflowId)}">Details</button>`
  const grundZeile = workflow.grund === null || workflow.grund === undefined ? '' : `<tr><th>Grund</th><td>${escapeHtml(workflow.grund)}</td></tr>`
  const faelligZusatz = workflow.naechster?.schrittId ? ` (<code>${escapeHtml(workflow.naechster.schrittId)}</code>)` : ''
  return `<section class="workflow">
    <h3>${escapeHtml(workflow.workflowId)} ${detailsButton}</h3>
    <table class="lauf-kopfdaten">
      <tbody>
        <tr><th>Ziel</th><td>${escapeHtml(workflow.ziel ?? '')}</td></tr>
        <tr><th>Version</th><td>${escapeHtml(String(workflow.versionSequenz))}</td></tr>
        <tr><th>Status</th><td>${escapeHtml(workflow.status ?? '')}</td></tr>
        <tr><th>Lage</th><td>${escapeHtml(beschreibeLage(workflow.status, workflow.naechster))}${faelligZusatz}</td></tr>
        <tr><th>Aktiver Schritt (Cursor)</th><td>${workflow.aktiverSchrittId ? `<code>${escapeHtml(workflow.aktiverSchrittId)}</code>` : '<span class="unbekannt">kein Cursor</span>'}</td></tr>
        ${grundZeile}
        <tr><th>Schritte</th><td>${escapeHtml(String(workflow.schritteAnzahl))}</td></tr>
      </tbody>
    </table>
  </section>`
}

/** Pollt GET /api/workflows in die Workflow-Liste. */
async function ladeWorkflows() {
  const container = document.getElementById('workflows')
  try {
    const workflows = await holeWorkflows()
    container.innerHTML = workflows.length === 0 ? '<p class="leer">Keine Workflows unter kontrollzustand/ gefunden.</p>' : workflows.map(workflowKopfzeile).join('')
    zeigePollFehler(false)
  } catch {
    zeigePollFehler(true)
  }
}

/**
 * Bringt die Schritte in Planreihenfolge entlang der nachfolger-Kette. Der
 * Detailendpunkt validiert nicht (F-247): ein Zyklus, zwei Wurzeln oder eine
 * doppelt vergebene schritt_id kommen hier real an — der angehängte Rest
 * wird dann ausgewiesen statt still eingereiht.
 * @param schritte - daten.schritte aus GET /api/workflows/<id>
 * @returns je Schritt { schritt, inKette }, Kettenteil zuerst
 */
function ordneSchritteNachPlan(schritte) {
  const nachId = new Map()
  for (const s of schritte) if (!nachId.has(s.schritt_id)) nachId.set(s.schritt_id, s)
  const genannteNachfolger = new Set(schritte.map((s) => s.nachfolger).filter((n) => typeof n === 'string'))
  const kette = []
  const inKette = new Set()
  let aktuell = schritte.find((s) => !genannteNachfolger.has(s.schritt_id))
  while (aktuell !== undefined && !inKette.has(aktuell)) {
    inKette.add(aktuell)
    kette.push(aktuell)
    aktuell = typeof aktuell.nachfolger === 'string' ? nachId.get(aktuell.nachfolger) : undefined
  }
  return [...kette.map((schritt) => ({ schritt, inKette: true })), ...schritte.filter((s) => !inKette.has(s)).map((schritt) => ({ schritt, inKette: false }))]
}

/**
 * F-234: welche lauf_id gerade WIRKLICH fliegt, aus dem aktiv-Feld von
 * GET /api/laeufe/<laufId> (D13) — bewusst nicht aus dem Schrittstatus
 * abgeleitet. Gefragt wird nur für Schritte auf LAEUFT.
 * @param eintraege - Ergebnis von ordneSchritteNachPlan
 * @returns Menge der lauf_id, die der Server als aktiv meldet
 */
async function ermittleAktiveLaufIds(eintraege) {
  const aktive = new Set()
  for (const { schritt } of eintraege) {
    if (schritt.status !== 'LAEUFT' || typeof schritt.lauf_id !== 'string') continue
    try {
      const antwort = await holeLaufDetail(schritt.lauf_id)
      if (!antwort.ok) {
        console.error(`[leitstand] Aktivzustand von '${schritt.lauf_id}' nicht ermittelbar: HTTP ${antwort.status}`)
        continue
      }
      const detail = await antwort.json()
      if (detail.aktiv === true) aktive.add(schritt.lauf_id)
    } catch (fehler) {
      console.error(`[leitstand] Aktivzustand von '${schritt.lauf_id}' nicht ermittelbar: ${fehler.message}`)
    }
  }
  return aktive
}

/**
 * @param eintrag - ein { schritt, inKette } aus ordneSchritteNachPlan
 * @param aktiveLaufIds - Ergebnis von ermittleAktiveLaufIds
 * @param faelligId - naechster.schrittId aus dem Server, oder null (F-253)
 * @param cursorId - daten.aktiver_schritt_id, oder null
 * @returns Tabellenzeile der Schrittliste
 */
function workflowSchrittZeile(eintrag, aktiveLaufIds, faelligId = null, cursorId = null) {
  const { schritt } = eintrag
  const laeuftJetzt = typeof schritt.lauf_id === 'string' && aktiveLaufIds.has(schritt.lauf_id)
  const cursorMarke = cursorId !== null && schritt.schritt_id === cursorId ? ' <span class="badge" title="aktiver_schritt_id — der Cursor des Automaten">Cursor</span>' : ''
  const faelligMarke = faelligId !== null && schritt.schritt_id === faelligId ? ' <span class="badge aktiv" title="Der Server nennt genau diesen Schritt als nächsten (naechster.schrittId)">fällig</span>' : ''
  const laufVerweis =
    typeof schritt.lauf_id === 'string'
      ? `<button class="workflow-lauf-verweis" data-lauf-id="${escapeHtml(schritt.lauf_id)}">${escapeHtml(schritt.lauf_id)}</button>`
      : '<span class="unbekannt">kein Lauf</span>'
  const freigabeErteilt = schritt.freigabe_erteilt === undefined ? '—' : String(schritt.freigabe_erteilt)
  return `<tr>
    <td><code>${escapeHtml(schritt.schritt_id)}</code>${cursorMarke}${faelligMarke}${eintrag.inKette ? '' : ' <span class="badge fehler" title="Die nachfolger-Kette erreicht diesen Schritt nicht">außerhalb der Kette</span>'}</td>
    <td>${escapeHtml(schritt.rolle)}</td>
    <td>${escapeHtml(schritt.worker)}</td>
    <td>${escapeHtml(schritt.modell)}</td>
    <td>${escapeHtml(schritt.freigabe)} <span class="unbekannt">${schritt.freigabe === 'ZWINGEND' ? '(hält an)' : '(hält nicht an)'}</span></td>
    <td>${escapeHtml(freigabeErteilt)}</td>
    <td>${escapeHtml(schritt.status)}${laeuftJetzt ? ' <span class="badge aktiv">läuft jetzt</span>' : ''}</td>
    <td>${laufVerweis}</td>
    <td>${schritt.nachfolger ? `<code>${escapeHtml(schritt.nachfolger)}</code>` : '<span class="unbekannt">Ende</span>'}</td>
    <td>${escapeHtml(String(schritt.zeitgrenze_ms))}</td>
  </tr>`
}

const WORKFLOW_SCHRITT_TABELLE_KOPF = `<tr>
  <th>Schritt</th><th>Rolle</th><th>Worker</th><th>Modell</th><th>Freigabe</th><th>Freigabe erteilt</th>
  <th>Status</th><th>Lauf</th><th>Nachfolger</th><th>Zeitgrenze (ms)</th>
</tr>`

/**
 * @param daten - der WORKFLOW_V0-Datensatz aus GET /api/workflows/<id>
 * @param versionSequenz - Artefaktversion derselben Antwort
 * @param naechster - das Automaten-Verdikt derselben Antwort, oder null
 * @returns HTML-Block mit den Workflow-Feldern oberhalb der Schrittliste
 */
function renderWorkflowKopf(daten, versionSequenz, naechster) {
  const verdikt = naechster === null || naechster === undefined ? '<span class="unbekannt">nicht bestimmbar</span>' : `${escapeHtml(naechster.art)} — ${escapeHtml(naechster.grund)}`
  return `<div class="detail-block"><h3>Workflow</h3><table class="lauf-kopfdaten"><tbody>
    <tr><th>Ziel</th><td>${escapeHtml(daten.ziel ?? '')}</td></tr>
    <tr><th>Auftrag</th><td><code>${escapeHtml(daten.auftrag_id ?? '')}</code></td></tr>
    <tr><th>Version (Plan / Artefakt)</th><td>${escapeHtml(String(daten.version))} / ${escapeHtml(String(versionSequenz))}</td></tr>
    <tr><th>Lage</th><td>${escapeHtml(beschreibeLage(daten.status, naechster))}</td></tr>
    <tr><th>Verdikt des Automaten</th><td>${verdikt}</td></tr>
    <tr><th>Status</th><td>${escapeHtml(daten.status ?? '')}</td></tr>
    <tr><th>Aktiver Schritt (Cursor)</th><td>${daten.aktiver_schritt_id ? `<code>${escapeHtml(daten.aktiver_schritt_id)}</code>` : '<span class="unbekannt">kein Cursor</span>'}</td></tr>
    <tr><th>Grund</th><td>${daten.grund ? escapeHtml(daten.grund) : '<span class="unbekannt">kein Halt-Grund hinterlegt</span>'}</td></tr>
  </tbody></table></div>`
}

/**
 * F-247: eine Fassung, die nicht mehr gegen WORKFLOW_V0 validiert. Die
 * Schrittliste wird trotzdem gezeigt — sie anzusehen ist der erste Schritt
 * ihrer Reparatur.
 * @param verstoesse - string[] aus validiereWorkflowDaten
 * @returns HTML-Block
 */
function renderWorkflowUngueltig(verstoesse) {
  const liste = verstoesse.map((verstoss) => `<li>${escapeHtml(verstoss)}</li>`).join('')
  return `<div class="detail-block"><h3>Fassung ungültig</h3><p class="fehler">Diese Fassung validiert nicht gegen WORKFLOW_V0 — der Startendpunkt lehnt sie mit 409 ab. Sie wird trotzdem vollständig gezeigt, weil die Reparatur damit beginnt, sie anzusehen.</p><ul>${liste}</ul></div>`
}

// ─── Bedienung (Starten, Freigeben, Ablehnen, Stoppen) ──────────────────────

/** Workflow-Status, in denen POST .../stoppen etwas zu stoppen findet — ANZEIGE-Zwilling der Server-Regel, entscheidet nur, ob der Knopf angeboten wird. */
const STOPPBARE_WORKFLOW_STATUS = ['OFFEN', 'LAEUFT', 'WARTET_FREIGABE', 'KLAERUNG_ERFORDERLICH']

/** Workflow-Status, aus denen heraus eine Reparaturfassung vorbereitet wird (F-240). */
const REPARIERBARE_WORKFLOW_STATUS = ['GESTOPPT', 'KLAERUNG_ERFORDERLICH']

/** @param text - anzuzeigender Text, oder null zum Ausblenden @param art - 'fehler' (Vorgabe) oder 'erfolg' */
function zeigeBedienungsMeldung(text, art = 'fehler') {
  const anzeige = document.getElementById('workflow-bedienung-meldung')
  if (text === null) {
    anzeige.hidden = true
    return
  }
  anzeige.className = art
  anzeige.textContent = text
  anzeige.hidden = false
}

/**
 * Schickt EINE Bedienung über die übergebene api.js-Funktion und pollt danach
 * außer der Reihe. Fehler werden gezeigt, nicht vorhergesagt (D13) — ein 409
 * nennt den fremden Lauf beim Namen. Der Poll läuft in JEDEM Fall, auch nach
 * einem Fehler: der Grund kann eine veraltete Anzeige sein.
 * @param anfrage - () => Promise<Response>, die konkrete api.js-Bedienung
 * @param knopf - auslösender Button; wird während des Aufrufs gesperrt
 * @param erfolgstext - was im Erfolgsfall gemeldet wird
 */
async function sendeWorkflowBedienung(anfrage, knopf, erfolgstext) {
  zeigeBedienungsMeldung(null)
  knopf.disabled = true
  try {
    const antwort = await anfrage()
    const inhalt = await antwort.json().catch(() => ({}))
    if (antwort.ok) {
      zeigeBedienungsMeldung(`${erfolgstext}${inhalt.laufAbgebrochen === true ? ' Der laufende Schritt wurde abgebrochen.' : ''}${inhalt.laufAbgebrochen === false ? ' Es lief kein Schritt dieses Workflows — nichts abgebrochen.' : ''}${inhalt.bezeugt === false ? ' ACHTUNG: die Entscheidung konnte NICHT als Artefakt festgehalten werden.' : ''}`, 'erfolg')
    } else {
      zeigeBedienungsMeldung(`${antwort.status}: ${inhalt.grund ?? 'unbekannter Fehler'}`)
    }
  } catch (fehler) {
    zeigeBedienungsMeldung(`Anfrage fehlgeschlagen: ${fehler.message}`)
  }
  knopf.disabled = false
  pollWorkflows()
}

/**
 * Der Bedienblock zu EINEM Workflow. Angeboten wird ausschließlich, was der
 * Server als möglich ausweist: naechster.art für Starten und
 * Freigeben/Ablehnen, status für Stoppen und den Reparaturzug.
 * @param workflowId - Kennung des angezeigten Workflows
 * @param status - daten.status
 * @param naechster - Automaten-Verdikt aus dem Server, oder null
 * @param ungueltig - true, wenn die Fassung nicht gegen WORKFLOW_V0 validiert
 * @returns HTML-Block
 */
function renderWorkflowBedienung(workflowId, status, naechster, ungueltig = false) {
  const art = naechster === null || naechster === undefined ? null : naechster.art
  const kennung = escapeHtml(workflowId)
  const faelligerSchritt = escapeHtml(naechster?.schrittId ?? '')
  const bloecke = []

  if (art === 'starte') {
    bloecke.push(`<div class="unterabschnitt">
      <p>Der nächste Schritt <code>${faelligerSchritt}</code> darf ohne Rückfrage starten.</p>
      <button class="wf-aktion" data-aktion="starten" data-workflow-id="${kennung}">Starten</button>
    </div>`)
  }

  if (art === 'haltFreigabe') {
    bloecke.push(`<div class="unterabschnitt">
      <p>Schritt <code>${faelligerSchritt}</code> verlangt eine menschliche Freigabe. Ohne dich läuft hier nichts weiter.</p>
      <label for="wf-freigabe-begruendung">Begründung (Pflicht)</label>
      <textarea id="wf-freigabe-begruendung" rows="2"></textarea>
      <div>
        <button class="wf-aktion" data-aktion="freigeben" data-workflow-id="${kennung}" data-schritt-id="${faelligerSchritt}">Freigeben</button>
        <button class="wf-aktion" data-aktion="ablehnen" data-workflow-id="${kennung}" data-schritt-id="${faelligerSchritt}">Ablehnen</button>
      </div>
    </div>`)
  }

  if (STOPPBARE_WORKFLOW_STATUS.includes(status) && !ungueltig) {
    bloecke.push(`<div class="unterabschnitt">
      <label for="wf-stopp-begruendung">Begründung des Stopps (Pflicht)</label>
      <textarea id="wf-stopp-begruendung" rows="2"></textarea>
      <div><button class="wf-aktion" data-aktion="stoppen" data-workflow-id="${kennung}">Stoppen</button></div>
    </div>`)
  }

  if (REPARIERBARE_WORKFLOW_STATUS.includes(status) || ungueltig) {
    bloecke.push(`<div class="unterabschnitt">
      <p>${ungueltig ? 'Diese Fassung validiert nicht — aus ihr startet kein Lauf. Der Weg heraus ist eine neue Fassung derselben' : 'Der Workflow steht. Der Weg heraus ist eine neue Fassung derselben'} <code>workflow_id</code>.</p>
      <button class="wf-aktion" data-aktion="reparatur" data-workflow-id="${kennung}">Reparaturfassung vorbereiten</button>
    </div>`)
  }

  if (bloecke.length === 0) {
    bloecke.push('<p class="leer">Für diesen Workflow ist derzeit keine Bedienung fällig.</p>')
  }
  return `<div class="detail-block"><h3>Bedienung</h3>${bloecke.join('')}</div>`
}

/** Kennzeichen des zuletzt gerenderten Bedienblocks — verhindert, dass eine angefangene Pflichtbegründung durch den 2-Sekunden-Poll verloren geht (F-249). Nur bei ECHTER Lageänderung wird neu gebaut. */
let bedienungsKennzeichen = null

/** @param workflowId - angezeigter Workflow @param status - daten.status @param naechster - Automaten-Verdikt, oder null */
function aktualisiereWorkflowBedienung(workflowId, status, naechster, ungueltig = false) {
  const kennzeichen = `${workflowId}|${status}|${naechster?.art ?? 'null'}|${naechster?.schrittId ?? 'null'}|${ungueltig}`
  if (kennzeichen === bedienungsKennzeichen) return
  bedienungsKennzeichen = kennzeichen
  document.getElementById('workflow-bedienung').innerHTML = renderWorkflowBedienung(workflowId, status, naechster, ungueltig)
}

// ─── Reparaturzug (löst F-240, F-218; zeigt F-219, F-223, F-226) ────────────

/** Schritt-Status, deren Schrittfelder eine Reparaturfassung zurücksetzt: der abgebrochene (LAEUFT) und die gescheiterten. ERFOLGREICHE Schritte bleiben unangetastet — ihre lauf_id ist der Lineage-Verweis, den Folgeschritte zitieren. */
const REPARIERBARE_SCHRITT_STATUS = ['LAEUFT', 'FEHLGESCHLAGEN', 'VERWEIGERT']

/**
 * Baut aus der aktuellen Fassung den Entwurf einer Reparaturfassung (F-240):
 * status -> 'OFFEN', Schrittfelder des abgebrochenen/gescheiterten Schritts
 * zurückgesetzt, Cursor bleibt oder zeigt auf den ersten Schritt ohne
 * lauf_id, grund bleibt stehen (Vorbelegung, keine Durchsetzung — der Mensch
 * prüft und ändert den Entwurf vor dem Einreichen).
 * @param daten - der geladene WORKFLOW_V0-Datensatz
 * @returns Entwurf als einfaches Objekt
 */
function baueReparaturEntwurf(daten) {
  const schritte = daten.schritte.map((schritt) => (REPARIERBARE_SCHRITT_STATUS.includes(schritt.status) ? { ...schritt, status: 'OFFEN', lauf_id: null } : schritt))
  const cursor = daten.aktiver_schritt_id ?? schritte.find((schritt) => schritt.lauf_id === null)?.schritt_id ?? null
  return { ...daten, status: 'OFFEN', aktiver_schritt_id: cursor, schritte }
}

/**
 * Welche ZWINGEND-Freigabepflichten der Entwurf gegenüber der geladenen
 * Fassung zurücknimmt (F-226) — ANZEIGE-Zwilling der Server-Regel.
 * @param vorherigeSchritte - schritte[] der geladenen Fassung
 * @param neueSchritte - schritte[] des Entwurfs
 * @returns schritt_ids, deren ZWINGEND-Pflicht entfällt
 */
function ermittleAbgeschwaechteFreigabenAnzeige(vorherigeSchritte, neueSchritte) {
  if (!Array.isArray(vorherigeSchritte) || !Array.isArray(neueSchritte)) return []
  const neueNachId = new Map(neueSchritte.filter((schritt) => schritt !== null && typeof schritt === 'object').map((schritt) => [schritt.schritt_id, schritt]))
  return vorherigeSchritte
    .filter((schritt) => schritt.freigabe === 'ZWINGEND')
    .filter((schritt) => neueNachId.get(schritt.schritt_id)?.freigabe !== 'ZWINGEND')
    .map((schritt) => schritt.schritt_id)
}

/**
 * Die Warnungen über dem Entwurf (F-219, F-223, F-226, F-240) — sie LÖSEN
 * die zugrunde liegenden Befunde nicht, sie machen sie sichtbar.
 * @param daten - die geladene Fassung
 * @param entwurf - der (möglicherweise vom Menschen bearbeitete) Entwurf
 * @returns Warntexte
 */
function ermittleReparaturWarnungen(daten, entwurf) {
  const warnungen = []

  const verloreneFreigaben = daten.schritte.filter((schritt) => schritt.freigabe_erteilt === true && schritt.lauf_id === null).map((schritt) => schritt.schritt_id)
  if (verloreneFreigaben.length > 0) {
    warnungen.push(
      `F-223: Für ${verloreneFreigaben.map((id) => `'${id}'`).join(', ')} ist eine Freigabe erteilt, der Schritt ist aber noch nicht gelaufen. Beim Einreichen verwirft der Server das Feld — der Schritt hält danach erneut an und muss neu freigegeben werden.`
    )
  }

  const verloreneVorgaenger = daten.schritte
    .filter((schritt) => REPARIERBARE_SCHRITT_STATUS.includes(schritt.status) && schritt.lauf_id !== null && schritt.nachfolger !== null)
    .map((schritt) => `'${schritt.schritt_id}' -> '${schritt.nachfolger}'`)
  if (verloreneVorgaenger.length > 0) {
    warnungen.push(
      `F-219: Die lauf_id von ${verloreneVorgaenger.join(', ')} wird zurückgesetzt. Der Folgeschritt startet dann ohne vorgaengerLaufId — der Lineage-Verweis auf den Vorlauf fehlt. Kein Fehler, aber eine Entscheidung.`
    )
  }

  const abgeschwaecht = ermittleAbgeschwaechteFreigabenAnzeige(daten.schritte, entwurf?.schritte)
  if (abgeschwaecht.length > 0) {
    warnungen.push(
      `F-226: Dieser Entwurf nimmt die Freigabepflicht von ${abgeschwaecht.map((id) => `'${id}'`).join(', ')} zurück (ZWINGEND entfällt). Der Server verlangt dafür eine Begründung und hält sie als Entscheidung fest.`
    )
  }

  if (typeof daten.grund === 'string' && daten.grund.length > 0) {
    warnungen.push(`F-240: Der Halt-Grund ("${daten.grund.slice(0, 80)}${daten.grund.length > 80 ? '…' : ''}") wird beim Einreichen auf null normalisiert und ist danach in keiner Ansicht mehr zu lesen. Wenn er festgehalten gehört, kopiere ihn vorher — die Stopp-Entscheidung selbst bleibt als Artefakt bestehen.`)
  }

  const gelaufen = Array.isArray(entwurf?.schritte) ? entwurf.schritte.filter((schritt) => schritt?.lauf_id !== null && schritt?.lauf_id !== undefined).length : 0
  const grenze = entwurf?.grenzen?.max_schritte
  if (typeof grenze === 'number' && gelaufen >= grenze) {
    warnungen.push(`F-240: Der Entwurf trägt grenzen.max_schritte ${grenze}, und ${gelaufen} Schritt(e) tragen bereits eine lauf_id. Der Automat hält damit sofort wieder an ("Grenze erreicht") — die Grenze gehört angehoben, sonst ist die Reparatur wirkungslos.`)
  }
  return warnungen
}

/** @param warnungen - Texte aus ermittleReparaturWarnungen @returns HTML-Block, Leerzustand bei keiner Warnung */
function renderReparaturWarnungen(warnungen) {
  if (warnungen.length === 0) return '<p class="leer">Keine Warnungen zu diesem Entwurf.</p>'
  return `<ul class="fehler">${warnungen.map((warnung) => `<li>${escapeHtml(warnung)}</li>`).join('')}</ul>`
}

/**
 * Der Reparaturentwurf als bearbeitbarer JSON-Text — bewusst kein Formular,
 * das wäre ein Plan-Editor, den AK8 nicht verlangt.
 * @param workflowId - Kennung des Workflows
 * @param entwurf - Vorbelegung aus baueReparaturEntwurf
 * @param warnungen - Texte aus ermittleReparaturWarnungen
 * @returns HTML-Block
 */
function renderReparatur(workflowId, entwurf, warnungen) {
  return `<div class="detail-block"><h3>Reparaturfassung für <code>${escapeHtml(workflowId)}</code></h3>
    <p class="hinweis">Vorbelegt aus der aktuellen Fassung: <code>status</code> auf <code>OFFEN</code>, die Schrittfelder des abgebrochenen oder gescheiterten Schritts zurückgesetzt, der Cursor auf den ersten Schritt ohne <code>lauf_id</code>, wenn er null war. Alles davon ist ein Vorschlag — der Text unten ist bearbeitbar und wird so eingereicht, wie er dasteht.</p>
    <div id="workflow-reparatur-warnungen">${renderReparaturWarnungen(warnungen)}</div>
    <label for="wf-reparatur-begruendung">Begründung der Planänderung (nur nötig, wenn der Entwurf eine ZWINGEND-Freigabepflicht zurücknimmt)</label>
    <input type="text" id="wf-reparatur-begruendung" />
    <label for="wf-reparatur-entwurf">Neue Fassung (WORKFLOW_V0)</label>
    <textarea id="wf-reparatur-entwurf" rows="24">${escapeHtml(JSON.stringify(entwurf, null, 2))}</textarea>
    <div>
      <button id="wf-reparatur-einreichen" data-workflow-id="${escapeHtml(workflowId)}">Einreichen</button>
      <button id="wf-reparatur-verwerfen">Entwurf verwerfen</button>
    </div>
    <p id="wf-reparatur-meldung" class="fehler" hidden></p>
  </div>`
}

/** Die Fassung, aus der der offene Reparaturentwurf gebaut wurde — Vergleichsgrundlage der Warnungen. null, solange kein Entwurf offen ist. */
let reparaturBasis = null

/** Fortlaufende Nummer je oeffneReparaturEntwurf-Aufruf (Überholschutz, Reviewer-Pass 10.09.2026). */
let reparaturZaehler = 0

/** @param text - anzuzeigender Text, oder null zum Ausblenden */
function zeigeReparaturMeldung(text) {
  const anzeige = document.getElementById('wf-reparatur-meldung')
  if (anzeige === null) return
  if (text === null) {
    anzeige.hidden = true
    return
  }
  anzeige.textContent = text
  anzeige.hidden = false
}

/**
 * Lädt die AKTUELLE Fassung und öffnet daraus den Entwurf — frisch geladen,
 * nicht aus dem gerade angezeigten Stand gebaut.
 * @param workflowId - Kennung des Workflows
 */
async function oeffneReparaturEntwurf(workflowId) {
  const behaelter = document.getElementById('workflow-reparatur')
  reparaturZaehler += 1
  const meineNummer = reparaturZaehler
  const istUeberholt = () => reparaturZaehler !== meineNummer
  behaelter.innerHTML = '<p class="leer">Lädt…</p>'
  try {
    const antwort = await holeWorkflowDetail(workflowId)
    const inhalt = await antwort.json().catch(() => ({}))
    if (istUeberholt()) return
    if (!antwort.ok || !Array.isArray(inhalt.daten?.schritte)) {
      behaelter.innerHTML = ''
      zeigeBedienungsMeldung(`Reparaturfassung nicht vorbereitbar: ${antwort.status} ${inhalt.grund ?? ''}`.trim())
      return
    }
    reparaturBasis = inhalt.daten
    const entwurf = baueReparaturEntwurf(inhalt.daten)
    behaelter.innerHTML = renderReparatur(workflowId, entwurf, ermittleReparaturWarnungen(inhalt.daten, entwurf))
  } catch (fehler) {
    if (istUeberholt()) return
    behaelter.innerHTML = ''
    zeigeBedienungsMeldung(`Reparaturfassung nicht vorbereitbar: ${fehler.message}`)
  }
}

/** Rechnet die Warnungen gegen den TATSÄCHLICH eingetippten Text neu (der Entwurf ist bearbeitbar). Ein unlesbarer Zwischenstand lässt die Warnungen unverändert stehen. */
function aktualisiereReparaturWarnungen() {
  const anzeige = document.getElementById('workflow-reparatur-warnungen')
  if (anzeige === null || reparaturBasis === null) return
  let entwurf
  try {
    entwurf = JSON.parse(document.getElementById('wf-reparatur-entwurf').value)
  } catch {
    return
  }
  anzeige.innerHTML = renderReparaturWarnungen(ermittleReparaturWarnungen(reparaturBasis, entwurf))
}

/** Schließt den Entwurf und gibt die Vergleichsgrundlage frei. Der Zähler wird hochgezählt, damit eine noch fliegende oeffneReparaturEntwurf-Antwort den Entwurf nicht wieder aufbaut. */
function verwirfReparaturEntwurf() {
  reparaturBasis = null
  reparaturZaehler += 1
  document.getElementById('workflow-reparatur').innerHTML = ''
}

/**
 * Reicht den bearbeiteten Entwurf als neue Fassung ein (POST /api/workflows).
 * @param workflowId - Kennung des Workflows
 * @param knopf - auslösender Button
 */
async function reicheReparaturEntwurfEin(workflowId, knopf) {
  zeigeReparaturMeldung(null)
  let entwurf
  try {
    entwurf = JSON.parse(document.getElementById('wf-reparatur-entwurf').value)
  } catch (fehler) {
    zeigeReparaturMeldung(`Der Entwurf ist kein gültiges JSON (${fehler.message}) — nichts eingereicht.`)
    return
  }
  if (reparaturBasis !== null) {
    document.getElementById('workflow-reparatur-warnungen').innerHTML = renderReparaturWarnungen(ermittleReparaturWarnungen(reparaturBasis, entwurf))
  }
  const begruendung = document.getElementById('wf-reparatur-begruendung').value
  const koerper = begruendung.trim().length === 0 ? entwurf : { ...entwurf, begruendung }
  knopf.disabled = true
  try {
    const antwort = await reicheWorkflowFassungEin(koerper)
    const inhalt = await antwort.json().catch(() => ({}))
    if (!antwort.ok) {
      zeigeReparaturMeldung(`${antwort.status}: ${inhalt.grund ?? 'unbekannter Fehler'}`)
      knopf.disabled = false
      return
    }
    verwirfReparaturEntwurf()
    zeigeBedienungsMeldung(`Neue Fassung von '${workflowId}' angenommen (Version ${inhalt.versionSequenz}).`, 'erfolg')
  } catch (fehler) {
    zeigeReparaturMeldung(`Anfrage fehlgeschlagen: ${fehler.message}`)
    knopf.disabled = false
    return
  }
  pollWorkflows()
}

/** workflowId des aktuell im Workflow-Panel angezeigten Workflows, oder null. */
let gewaehlteWorkflowId = null

/** Fortlaufende Nummer je ladeWorkflowDetail-Aufruf (Überholschutz, siehe Funktionskommentar unten). */
let workflowRenderZaehler = 0

/**
 * Lädt GET /api/workflows/<id> und rendert Kopf und Schrittliste. Anders als
 * ladeLaufDetail hängt diese Funktion am Poll (der Zweck der Ansicht ist zu
 * sehen, wie der Cursor wandert). Zwei Ticks für DENSELBEN Workflow können
 * sich überholen (F-252) — nur der jüngste Aufruf darf schreiben.
 * Wechselt der Aufruf dabei auf einen ANDEREN Workflow als den zuvor
 * angezeigten (Klick auf ein anderes Workflow-Detail, Browser-Vor/Zurück),
 * werden Bedienblock und ein offener Reparaturentwurf zuerst geräumt
 * (raeumeWorkflowBedienzustand, QA-Pass F20 WS-1, TC-11) — sonst bliebe ein
 * Entwurf des VORHERIGEN Workflows unter der neuen Ansicht sichtbar und
 * einreichbar, fachlich falsch zugeordnet.
 * @param workflowId - Kennung, aus dem geklickten Details-Button
 * @param scrollen - true beim Öffnen per Klick, false beim Neurendern durch den Poll
 */
export async function ladeWorkflowDetail(workflowId, scrollen = true) {
  if (gewaehlteWorkflowId !== null && gewaehlteWorkflowId !== workflowId) {
    raeumeWorkflowBedienzustand()
  }
  gewaehlteWorkflowId = workflowId
  workflowRenderZaehler += 1
  const meineRenderNummer = workflowRenderZaehler
  const istUeberholt = () => gewaehlteWorkflowId !== workflowId || workflowRenderZaehler !== meineRenderNummer
  const abschnitt = document.getElementById('workflow-detail')
  const fehleranzeige = document.getElementById('workflow-detail-fehler')
  const inhalt = document.getElementById('workflow-detail-inhalt')

  document.getElementById('workflow-detail-titel').textContent = workflowId
  fehleranzeige.hidden = true
  abschnitt.hidden = false
  if (scrollen) {
    inhalt.innerHTML = '<p class="leer">Lädt…</p>'
    abschnitt.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  try {
    const antwort = await holeWorkflowDetail(workflowId)
    if (istUeberholt()) return
    if (!antwort.ok) {
      const koerper = await antwort.json().catch(() => ({}))
      if (istUeberholt()) return
      inhalt.innerHTML = ''
      fehleranzeige.textContent = `${antwort.status}: ${koerper.grund ?? 'unbekannter Fehler'}`
      fehleranzeige.hidden = false
      return
    }
    const detail = await antwort.json()
    if (istUeberholt()) return
    const daten = detail.daten ?? {}
    const verstoesse = Array.isArray(detail.verstoesse) ? detail.verstoesse : []
    const naechster = detail.naechster ?? null
    aktualisiereWorkflowBedienung(workflowId, daten.status ?? null, naechster, verstoesse.length > 0)
    const ungueltigBlock = verstoesse.length > 0 ? renderWorkflowUngueltig(verstoesse) : ''
    if (!Array.isArray(daten.schritte) || daten.schritte.length === 0) {
      inhalt.innerHTML = [
        ungueltigBlock === '' ? renderWorkflowUngueltig(['Die gelieferte Fassung trägt keine lesbare Schrittliste.']) : ungueltigBlock,
        renderWorkflowKopf(daten, detail.versionSequenz, naechster),
      ].join('')
      return
    }
    const geordnet = ordneSchritteNachPlan(daten.schritte)
    const aktiveLaufIds = await ermittleAktiveLaufIds(geordnet)
    if (istUeberholt()) return
    const ausserhalbDerKette = geordnet.filter((e) => !e.inKette).length
    const ueberschrift = ausserhalbDerKette === 0 ? 'Schritte (Planreihenfolge)' : `Schritte (Planreihenfolge, ${ausserhalbDerKette} außerhalb der Kette)`
    inhalt.innerHTML = [
      ungueltigBlock,
      renderWorkflowKopf(daten, detail.versionSequenz, naechster),
      `<div class="detail-block"><h3>${escapeHtml(ueberschrift)}</h3><table class="lauf-kopfdaten"><thead>${WORKFLOW_SCHRITT_TABELLE_KOPF}</thead><tbody>${geordnet.map((e) => workflowSchrittZeile(e, aktiveLaufIds, naechster?.schrittId ?? null, daten.aktiver_schritt_id ?? null)).join('')}</tbody></table></div>`,
    ].join('')
  } catch (fehler) {
    if (istUeberholt()) return
    inhalt.innerHTML = ''
    fehleranzeige.textContent = `Anfrage fehlgeschlagen: ${fehler.message}`
    fehleranzeige.hidden = false
  }
}

/** Räumt Bedienblock, Bedienungsmeldung und einen offenen Reparaturentwurf auf — gemeinsame Teilmenge von schliesseWorkflowDetail und dem Workflow-Wechsel in ladeWorkflowDetail (TC-11, QA-Pass F20 WS-1). */
function raeumeWorkflowBedienzustand() {
  bedienungsKennzeichen = null
  document.getElementById('workflow-bedienung').innerHTML = ''
  zeigeBedienungsMeldung(null)
  verwirfReparaturEntwurf()
}

/** Schließt das Workflow-Detail-Panel, den Bedienblock und einen offenen Reparaturentwurf. */
function schliesseWorkflowDetail() {
  gewaehlteWorkflowId = null
  document.getElementById('workflow-detail').hidden = true
  raeumeWorkflowBedienzustand()
}

/**
 * Führt EINE angeklickte Bedienung aus — die Pflichtbegründungen werden hier
 * NICHT gegen den Server vorgeprüft, sondern nur auf "nicht leer" (dieselbe
 * Bedingung, die der Server stellt).
 * @param button - der geklickte .wf-aktion-Knopf
 */
async function fuehreWorkflowAktionAus(button) {
  const workflowId = button.dataset.workflowId
  const aktion = button.dataset.aktion
  zeigeBedienungsMeldung(null)

  if (aktion === 'starten') {
    await sendeWorkflowBedienung(() => starteWorkflowSchritt(workflowId), button, 'Schritt gestartet.')
    return
  }

  if (aktion === 'freigeben' || aktion === 'ablehnen') {
    const begruendung = document.getElementById('wf-freigabe-begruendung').value
    if (begruendung.trim().length === 0) {
      zeigeBedienungsMeldung('Die Begründung ist Pflicht — ohne sie wird die Entscheidung nicht festgehalten.')
      return
    }
    await sendeWorkflowBedienung(
      () => sendeWorkflowFreigabe(workflowId, { schrittId: button.dataset.schrittId, entscheidung: aktion === 'freigeben' ? 'FREIGEGEBEN' : 'ABGELEHNT', begruendung }),
      button,
      aktion === 'freigeben' ? 'Freigabe erteilt und als Entscheidung festgehalten — der Schritt startet.' : 'Ablehnung festgehalten — der Workflow ist gestoppt.'
    )
    return
  }

  if (aktion === 'stoppen') {
    const begruendung = document.getElementById('wf-stopp-begruendung').value
    if (begruendung.trim().length === 0) {
      zeigeBedienungsMeldung('Die Begründung ist Pflicht — sie ist der Text, den du in drei Tagen liest, wenn du wissen willst, warum die Kette steht.')
      return
    }
    await sendeWorkflowBedienung(() => stoppeWorkflow(workflowId, { begruendung }), button, 'Stopp festgeschrieben und als Entscheidung festgehalten.')
    return
  }

  if (aktion === 'reparatur') {
    await oeffneReparaturEntwurf(workflowId)
  }
}

/** Klick-/Eingabe-Delegation der Workflow-Ansicht — jeder Container wird als Ganzes neu gerendert, die Zuhörer hängen deshalb am Container. */
function initWorkflowBedienung() {
  document.getElementById('workflows').addEventListener('click', (ereignis) => {
    const button = ereignis.target.closest('.workflow-details-btn')
    if (!button) return
    navigiere(`#/workflows/${encodeURIComponent(button.dataset.workflowId)}`)
  })
  document.getElementById('workflow-detail-inhalt').addEventListener('click', (ereignis) => {
    const button = ereignis.target.closest('.workflow-lauf-verweis')
    if (!button) return
    navigiere(`#/runs/${encodeURIComponent(button.dataset.laufId)}`)
  })
  document.getElementById('workflow-bedienung').addEventListener('click', (ereignis) => {
    const button = ereignis.target.closest('.wf-aktion')
    if (!button) return
    fuehreWorkflowAktionAus(button)
  })
  document.getElementById('workflow-reparatur').addEventListener('input', (ereignis) => {
    if (ereignis.target.id !== 'wf-reparatur-entwurf') return
    aktualisiereReparaturWarnungen()
  })
  document.getElementById('workflow-reparatur').addEventListener('click', (ereignis) => {
    if (ereignis.target.closest('#wf-reparatur-verwerfen')) {
      verwirfReparaturEntwurf()
      return
    }
    const einreichen = ereignis.target.closest('#wf-reparatur-einreichen')
    if (!einreichen) return
    reicheReparaturEntwurfEin(einreichen.dataset.workflowId, einreichen)
  })
  // Lokaler Aufruf statt navigiere('#/runs') aus demselben Grund wie in runs.js
  // initDetailBedienung: die exakte Route `#/runs` ist zugleich hier UND in runs.js
  // registriert (beide räumen dort ihr eigenes Detail) — ein Hash-Wechsel würde ungefragt
  // auch ein offenes Lauf-Detail schließen (QA-Pass F20 WS-1).
  document.getElementById('workflow-detail-schliessen').addEventListener('click', () => {
    schliesseWorkflowDetail()
  })
}

/** Poll-Tick der Workflow-Ansicht: die Liste immer, das Detail-Panel nur, solange eines offen ist. */
function pollWorkflows() {
  ladeWorkflows()
  if (gewaehlteWorkflowId !== null) ladeWorkflowDetail(gewaehlteWorkflowId, false)
}

const POLL_INTERVALL_MS = 2000

/** Initialisiert die Workflow-Bedienung einmalig beim Bootstrap: Delegation, Routen, erster Ladevorgang, Poll-Timer. */
export function initWorkflowsView() {
  initWorkflowBedienung()

  registriere(/^#\/runs$/, 'runs', () => {
    schliesseWorkflowDetail()
  })
  registriere(/^#\/workflows\/([^/]+)$/, 'runs', (workflowId) => {
    ladeWorkflowDetail(workflowId)
  })

  ladeWorkflows()
  setInterval(pollWorkflows, POLL_INTERVALL_MS)
}
