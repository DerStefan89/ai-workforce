/**
 * Datei: public/leitstand/views/runs.js
 *
 * Zweck: View `#/runs` (F20 WS-1) — Laufliste und Startfehler-Projektion aus
 * dem Zustands-Aggregat (GET /api/zustand, seit F20 WS-2 über den einen
 * Poll-Timer in zustand.js — kein eigener fetch()/setInterval mehr, siehe
 * renderLaeufe/renderStartfehler) sowie die Lauf-Detailansicht (GET
 * /api/laeufe/<laufId>, Route `#/runs/<laufId>`, nur auf Anforderung, NICHT
 * gepollt — TECH_DEBT F-363). Deckt vier der sechs Bedienflüsse ab, die laut
 * F20 AK1 real funktionieren müssen: Wiederaufnahme-Vorbelegung,
 * Freigabe/Stopp gehören zur Workflow-Bedienung (views/workflows.js,
 * ebenfalls unter dieser View gemountet), Entscheidung und Abbruch liegen
 * hier in der Detailansicht.
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initRunsView beim Bootstrap)
 * - public/leitstand/views/workflows.js (Navigation zu `#/runs/<laufId>` für
 *   den lauf_id-Verweis einer Workflow-Schrittzeile)
 *
 * Wichtig: renderLaeufe() ersetzt #laeufe bei jedem Poll-Tick komplett —
 * jede Bedienung an einer Laufzeile hängt deshalb per Event-Delegation am
 * Container #laeufe, nie an einem einzelnen Zeilen-Button (der wäre nach dem
 * nächsten Tick wieder weg). #lauf-detail liegt in index.html bewusst
 * AUSSERHALB von #laeufe aus demselben Grund.
 *
 * F29 WS-2b: reine Stylingumstellung auf das Komponentenvokabular aus
 * views/workboard.js (F29 WS-1b) — .card für laufAbschnitt()/#lauf-detail/
 * #startfehler-abschnitt (index.html), .btn/.btn-primary für die
 * Schaltflächen. .detail-block/.badge/die Kopfdaten-Tabellen (.lauf-
 * kopfdaten) waren bereits im Einsatz und bleiben unverändert — insbesondere
 * renderLaufakte/renderAuftrag, deren Markup wortgleich an
 * scripts/check-f12-leitstand-ansicht.mjs (Fälle f/g) gebunden ist. Keine
 * Verhaltensänderung, kein neues Farbpaar.
 */

import { abbrichLauf, holeLaufDetail, sendeEntscheidungAnfrage } from '../api.js'
import { escapeHtml } from '../render.js'
import { navigiere, registriere } from '../router.js'
import { abonniere, pollJetzt } from '../zustand.js'
import { wendeWiederaufnahmeAn, zeigeVorbelegungsFehler } from './projekt.js'

/** Rendert die Gültigkeits-Zelle einer Checkpoint-Zeile in der Detailansicht. */
function statusZelle(cp) {
  if (cp.gueltig) return '<span class="badge ok">gültig</span>'
  const gruende = (cp.gruende ?? []).join('; ')
  return `<span class="badge fehler" title="${escapeHtml(gruende)}">ungültig</span><div class="grund">${escapeHtml(gruende)}</div>`
}

/** Rendert die Stale-Zelle einer Checkpoint-Zeile in der Detailansicht. */
function staleZelle(cp) {
  if (!cp.stale) return ''
  if (cp.stale.stale) {
    return `<span class="badge stale" title="${escapeHtml(cp.stale.geaenderteEingaben.join('; '))}">STALE</span>`
  }
  return '<span class="badge aktuell">aktuell</span>'
}

/** Eine Checkpoint-Zeile der Detailansicht-Kette. */
function checkpointZeile(cp) {
  const lin = cp.lineage ?? {}
  const wm = cp.wirkungsmarke ?? {}
  const aufgabe = lin.beschreibung ?? ''
  const status = lin.transportStatus ?? wm.art ?? ''
  const executor = lin.executor ?? ''
  const ergebnis = wm.ergebnis ?? ''
  return `<tr>
    <td>${cp.sequenz}</td>
    <td>${cp.zeitstempel ? escapeHtml(cp.zeitstempel) : '<span class="unbekannt">Zeit unbekannt</span>'}</td>
    <td>${statusZelle(cp)}</td>
    <td>${escapeHtml(cp.typ)}</td>
    <td>${escapeHtml(lin.art ?? '')}</td>
    <td>${escapeHtml(lin.erzeugungsart ?? '')}</td>
    <td>${escapeHtml(lin.artefaktId ?? '')}</td>
    <td>${escapeHtml(lin.entscheidung ?? '')}</td>
    <td>${lin.beziehtSichAuf ? escapeHtml(`sequenz ${lin.beziehtSichAuf.sequenz}`) : ''}</td>
    <td>${staleZelle(cp)}</td>
    <td>${escapeHtml(aufgabe)}</td>
    <td>${escapeHtml(status)}</td>
    <td>${escapeHtml(executor)}</td>
    <td>${escapeHtml(ergebnis)}</td>
  </tr>`
}

/** Wiederaufnahme-Bedienung ist nur für einen Lauf sinnvoll, dessen letzter Zustand entweder auf eine offene Klärung oder auf einen Fehlschlag zeigt (D-F10-1). @param laufStatus - der von stelleLaufstatusFest gelieferte LaufStatus @returns true, wenn eine Wiederaufnahme angeboten wird */
function darfWiederaufnehmen(laufStatus) {
  if (laufStatus?.status === 'KLAERUNG_ERFORDERLICH') return true
  if (laufStatus?.status !== 'ABGESCHLOSSEN') return false
  return laufStatus.ergebnis === 'FEHLGESCHLAGEN' || laufStatus.ergebnis === 'VERWEIGERT'
}

/** Zeigt die Kopfdaten-Zeile aus GET /api/laeufe — die volle Checkpoint-Tabelle liegt in der Detailansicht (GET /api/laeufe/<laufId>). F29 WS-2b: eigene Karte (.card) statt einer bloßen, unumrandeten Section — Muster #workboard-detail. */
function laufAbschnitt(lauf) {
  const wiederaufnahmeButton = darfWiederaufnehmen(lauf.laufStatus)
    ? `<button class="btn wiederaufnahme-btn" data-lauf-id="${escapeHtml(lauf.laufId)}">Wiederaufnahme starten</button>`
    : ''
  const detailsButton = `<button class="btn details-btn" data-lauf-id="${escapeHtml(lauf.laufId)}">Details</button>`

  return `<section class="card lauf">
    <h2>${escapeHtml(lauf.laufId)} ${detailsButton} ${wiederaufnahmeButton}</h2>
    <table class="lauf-kopfdaten">
      <tbody>
        <tr><th>Status</th><td>${escapeHtml(lauf.laufStatus?.status ?? '')}</td></tr>
        <tr><th>Ergebnis</th><td>${escapeHtml(lauf.ergebnis ?? '')}</td></tr>
        <tr><th>Zeitpunkt</th><td>${lauf.zeitpunkt ? escapeHtml(lauf.zeitpunkt) : '<span class="unbekannt">Zeit unbekannt</span>'}</td></tr>
        <tr><th>Checkpoints</th><td>${lauf.anzahlCheckpoints}</td></tr>
        <tr><th>Kettenintegrität</th><td>${lauf.kettenintegritaet ? '<span class="badge ok">Ja</span>' : '<span class="badge fehler">Nein</span>'}</td></tr>
      </tbody>
    </table>
  </section>`
}

/** Rendert die Laufliste aus dem Zustands-Aggregat (F20 WS-2) — Abnehmer des einen Poll-Timers in zustand.js, kein eigener fetch() mehr. @param laeufe - zustand.laeufe aus GET /api/zustand, oder null bei defekter Quelle (siehe zustand.js/leitstand-server.mjs) */
function renderLaeufe(laeufe) {
  const container = document.getElementById('laeufe')
  if (laeufe === null) {
    container.innerHTML = '<p class="unbekannt">Läufe nicht verfügbar (Quelle im Aggregat defekt).</p>'
    return
  }
  container.innerHTML = laeufe.length === 0
    ? '<p class="leer">Keine Läufe unter kontrollzustand/ gefunden.</p>'
    : laeufe.map(laufAbschnitt).join('')
}

function startfehlerZeile(eintrag) {
  return `<p class="startfehler-eintrag"><code>${escapeHtml(eintrag.zeitstempel)}</code>
    <strong>${escapeHtml(eintrag.laufId)}</strong>: ${escapeHtml(eintrag.fehler)}</p>`
}

/** Rendert die Startfehler-Projektion aus dem Zustands-Aggregat — flüchtig, geht bei Serverneustart verloren. @param startfehler - zustand.startfehler aus GET /api/zustand, oder null bei defekter Quelle */
function renderStartfehler(startfehler) {
  const container = document.getElementById('startfehler')
  if (startfehler === null) {
    container.innerHTML = '<p class="unbekannt">Startfehler nicht verfügbar (Quelle im Aggregat defekt).</p>'
    return
  }
  container.innerHTML = startfehler.length === 0
    ? '<p class="leer">Keine Startfehler.</p>'
    : startfehler.map(startfehlerZeile).join('')
}

/** Klick-Delegation für "Wiederaufnahme starten": lädt GET /api/laeufe/<laufId>, übergibt die Vorbelegung an die Projekt-View und navigiert dorthin (AK1: Wiederaufnahme bleibt real unverändert, jetzt view-übergreifend). */
function initWiederaufnahmeBedienung() {
  document.getElementById('laeufe').addEventListener('click', async (ereignis) => {
    const button = ereignis.target.closest('.wiederaufnahme-btn')
    if (!button) return
    const alterLaufId = button.dataset.laufId
    zeigeVorbelegungsFehler('')

    let detail
    try {
      const antwort = await holeLaufDetail(alterLaufId)
      if (!antwort.ok) {
        const koerper = await antwort.json().catch(() => ({}))
        zeigeVorbelegungsFehler(`Vorbelegung fehlgeschlagen (${antwort.status}): ${koerper.grund ?? 'unbekannter Fehler'}`)
        return
      }
      detail = await antwort.json()
    } catch (fehler) {
      zeigeVorbelegungsFehler(`Anfrage fehlgeschlagen: ${fehler.message}`)
      return
    }

    navigiere('#/projekt')
    await wendeWiederaufnahmeAn(detail, alterLaufId)
    document.getElementById('start-starten').scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

// ─── Lauf-Detailansicht (GET /api/laeufe/<laufId>, Route `#/runs/<laufId>`) ──

/** laufId des aktuell im Detail-Panel angezeigten Laufs, oder null. */
let gewaehlteLaufId = null

function unbekanntStatusText(status, texte) {
  return texte[status] ?? status
}

function renderAuftrag(auftrag) {
  if (auftrag.status === 'ok') {
    return `<div class="detail-block"><h3>Auftrag: ${escapeHtml(auftrag.titel ?? '')}</h3><p>${escapeHtml(auftrag.auftragstext ?? '')}</p></div>`
  }
  const texte = {
    kein_auftragsbezug: 'Kein Auftragsbezug (Bestandslauf ohne Auftrag).',
    kontextpaket_fehlt: 'Auftragsbezug nicht ermittelbar — Kontextpaket fehlt.',
    auftrag_fehlt: `Auftragsreferenz vorhanden ('${auftrag.auftragId ?? ''}'), Auftragsartefakt fehlt.`,
  }
  return `<div class="detail-block"><h3>Auftrag</h3><p class="unbekannt">${escapeHtml(unbekanntStatusText(auftrag.status, texte))}</p></div>`
}

/** Klärzustand unverfälscht sichtbar (F13 WS-1 AK2). @param laufStatus - detail.laufStatus @param verweigertDaten - detail.verweigertDaten (null außer bei ABGESCHLOSSEN/VERWEIGERT) */
function renderLaufStatus(laufStatus, verweigertDaten) {
  if (laufStatus.status === 'KLAERUNG_ERFORDERLICH') {
    return `<div class="detail-block"><h3>Klärzustand: Klärung erforderlich</h3><table class="lauf-kopfdaten"><tbody>
      <tr><th>blockerId</th><td><code>${escapeHtml(laufStatus.blockerId)}</code></td></tr>
      <tr><th>Grund</th><td>${escapeHtml(laufStatus.grund)}</td></tr>
      <tr><th>Auflösungsbedingung</th><td>${escapeHtml(laufStatus.aufloesungsbedingung)}</td></tr>
      <tr><th>Resume-Ziel</th><td>${escapeHtml(laufStatus.resumeZiel)}</td></tr>
      <tr><th>Offene run_prepared-Sequenzen</th><td>${laufStatus.evidenz.offeneRunPreparedSequenzen.length}</td></tr>
    </tbody></table></div>`
  }
  if (laufStatus.status === 'ABGESCHLOSSEN' && laufStatus.ergebnis === 'VERWEIGERT') {
    const vd = verweigertDaten ?? { bypassVerdachtAnzahl: 'unbekannt', isError: 'unbekannt', nonExecutionKind: 'unbekannt' }
    return `<div class="detail-block"><h3>Klärzustand: Abgeschlossen (VERWEIGERT)</h3><table class="lauf-kopfdaten"><tbody>
      <tr><th>bypass_verdacht_anzahl</th><td>${escapeHtml(String(vd.bypassVerdachtAnzahl))}</td></tr>
      <tr><th>is_error</th><td>${escapeHtml(String(vd.isError))}</td></tr>
      <tr><th>non_execution_kind</th><td>${escapeHtml(String(vd.nonExecutionKind))}</td></tr>
    </tbody></table></div>`
  }
  const statusText = laufStatus.status === 'ABGESCHLOSSEN' ? `${laufStatus.status} (${laufStatus.ergebnis})` : laufStatus.status
  return `<div class="detail-block"><h3>Klärzustand</h3><p>${escapeHtml(statusText)}</p></div>`
}

function renderKontextpaket(kontextpaket) {
  if (kontextpaket.status !== 'ok') {
    return '<div class="detail-block"><h3>Kontextpaket</h3><p class="unbekannt">Kein Kontextpaket vorhanden.</p></div>'
  }
  const elemente =
    kontextpaket.elemente.length === 0
      ? '<p class="leer">Keine Elemente.</p>'
      : `<ul>${kontextpaket.elemente.map((e) => `<li><code>${escapeHtml(e.pfad)}</code>${e.zitierter_bereich ? ` (${escapeHtml(e.zitierter_bereich)})` : ''}</li>`).join('')}</ul>`
  const ausgeschlossen =
    kontextpaket.ausgeschlossen.length === 0
      ? ''
      : `<details><summary>${kontextpaket.ausgeschlossen.length} ausgeschlossen</summary><ul>${kontextpaket.ausgeschlossen.map((a) => `<li><code>${escapeHtml(a.pfad)}</code> (${escapeHtml(a.grund)})</li>`).join('')}</ul></details>`
  return `<div class="detail-block"><h3>Kontextpaket (Rolle: ${escapeHtml(kontextpaket.rolle ?? '')})</h3>${elemente}${ausgeschlossen}</div>`
}

/** Worker und deklariertes Modell vor dem beobachteten Modell (F16 AK12) — beide Zeilen nennen ihren Rang ausdrücklich. @param laufakte - detail.laufakte */
function renderLaufakte(laufakte) {
  if (laufakte.status !== 'ok') {
    return '<div class="detail-block"><h3>Laufakte</h3><p class="unbekannt">Keine Laufakte vorhanden.</p></div>'
  }
  return `<div class="detail-block"><h3>Laufakte</h3><table class="lauf-kopfdaten"><tbody>
    <tr><th>Worker</th><td>${laufakte.worker ? escapeHtml(laufakte.worker) : '<span class="unbekannt">unbekannt</span>'}</td></tr>
    <tr><th>Modell (deklariert)</th><td>${laufakte.modellDeklariert ? escapeHtml(laufakte.modellDeklariert) : '<span class="unbekannt">unbekannt</span>'}</td></tr>
    <tr><th>Modell (beobachtet)</th><td>${laufakte.modellBeobachtet ? escapeHtml(laufakte.modellBeobachtet) : '<span class="unbekannt">unbekannt</span>'}</td></tr>
    <tr><th>Beobachtungsbasis vollständig</th><td>${laufakte.beobachtungsbasisVollstaendig ? 'Ja' : 'Nein'}</td></tr>
    <tr><th>Arbeitsverzeichnis</th><td><code>${escapeHtml(laufakte.arbeitsverzeichnisPfad ?? '')}</code></td></tr>
  </tbody></table></div>`
}

function renderRohstrom(rohstrom) {
  const texte = {
    hash_weicht_ab: 'Hash weicht ab — Inhalt wird nicht angezeigt.',
    nicht_verfuegbar: 'Rohstrom nicht verfügbar (Datei fehlt oder nicht lesbar).',
    nicht_parsebar: 'Rohstrom ist kein gültiges JSON.',
    laufakte_fehlt: 'Keine Laufakte — kein Rohstrom-Bezug.',
  }
  if (rohstrom.status !== 'ok') {
    return `<div class="detail-block"><h3>Rohstrom</h3><p class="unbekannt">${escapeHtml(unbekanntStatusText(rohstrom.status, texte))}</p></div>`
  }
  const ergebnisobjekt = rohstrom.ergebnisobjekt
  const permissionZeile =
    ergebnisobjekt.status === 'ok'
      ? `<tr><th>Permission Denials</th><td>${ergebnisobjekt.permissionDenials.anzahl}${ergebnisobjekt.permissionDenials.toolNamen.length > 0 ? ` (${ergebnisobjekt.permissionDenials.toolNamen.map(escapeHtml).join(', ')})` : ''}</td></tr>`
      : '<tr><th>Permission Denials</th><td><span class="unbekannt">unbekannt (kein Ergebnisobjekt)</span></td></tr>'
  return `<div class="detail-block"><h3>Rohstrom</h3><table class="lauf-kopfdaten"><tbody>
    <tr><th>Exit-Code</th><td>${rohstrom.exitCode ?? (rohstrom.ergebnisZeileVorProzessende === true ? '— (bei der Ergebniszeile vor Prozessende aufgelöst)' : '<span class="unbekannt">unbekannt</span>')}</td></tr>
    <tr><th>Startfehler</th><td>${rohstrom.startfehler ? escapeHtml(JSON.stringify(rohstrom.startfehler)) : '—'}</td></tr>
    ${permissionZeile}
    <tr><th>stdout-Länge</th><td>${rohstrom.stdoutLaenge ?? '—'}</td></tr>
    <tr><th>stderr-Länge</th><td>${rohstrom.stderrLaenge ?? '—'}</td></tr>
  </tbody></table></div>`
}

/** Abbrechen-Button, nur bei detail.aktiv === true (D13). @param aktiv - detail.aktiv @param laufId - Lauf-Kennung */
function renderAbbrechenBlock(aktiv, laufId) {
  if (!aktiv) return ''
  return `<div class="detail-block">
    <button id="abbrechen-btn" class="btn" data-lauf-id="${escapeHtml(laufId)}">Abbrechen</button>
    <p id="abbrechen-fehler" class="fehler" hidden></p>
  </div>`
}

const CHECKPOINT_TABELLE_KOPF = `<tr>
  <th>Sequenz</th><th>Zeit</th><th>Status</th><th>Typ</th><th>Lineage-Art</th><th>Erzeugungsart</th>
  <th>Artefakt-ID</th><th>Entscheidung</th><th>Bezieht sich auf</th><th>Stale</th><th>Aufgabe</th><th>Transport-Status</th><th>Executor</th><th>Ergebnis</th>
</tr>`

function renderCheckpoints(checkpoints) {
  if (checkpoints.length === 0) return '<p class="leer">Keine Checkpoints.</p>'
  return `<table class="lauf-kopfdaten"><thead>${CHECKPOINT_TABELLE_KOPF}</thead><tbody>${checkpoints.map(checkpointZeile).join('')}</tbody></table>`
}

/** true, wenn ein VERWEIGERT-Lauf einen Bypass-Verdacht des Modells trägt (E-186-Fall). @param verweigertDaten - detail.verweigertDaten, oder null @returns true nur bei einer echten, positiven bypassVerdachtAnzahl */
function hatBypassVerdacht(verweigertDaten) {
  return typeof verweigertDaten?.bypassVerdachtAnzahl === 'number' && verweigertDaten.bypassVerdachtAnzahl > 0
}

/** Baut den Entscheidungs-Block der Detailansicht — art:'terminal'/'antwort'/'kenntnisnahme' je nach Klärfall, sonst ein expliziter Leerzustandstext. @param laufStatus - detail.laufStatus @param verweigertDaten - detail.verweigertDaten */
function renderEntscheidungBlock(laufStatus, verweigertDaten) {
  if (laufStatus.status === 'KLAERUNG_ERFORDERLICH') {
    return `<div class="detail-block">
      <h3>Entscheidung: Klärung auflösen</h3>
      <label for="entscheidung-terminal-ergebnis">Ergebnis</label>
      <select id="entscheidung-terminal-ergebnis">
        <option value="ERFOLGREICH">ERFOLGREICH</option>
        <option value="VERWEIGERT">VERWEIGERT</option>
        <option value="FEHLGESCHLAGEN">FEHLGESCHLAGEN</option>
      </select>
      <label for="entscheidung-terminal-begruendung">Begründung (Pflichtfeld)</label>
      <textarea id="entscheidung-terminal-begruendung" rows="3"></textarea>
      <div><button id="entscheidung-terminal-speichern" class="btn btn-primary">Entscheidung speichern</button></div>
      <p id="entscheidung-terminal-erfolg" class="erfolg" hidden></p>
      <p id="entscheidung-terminal-fehler" class="fehler" hidden></p>
    </div>`
  }
  if (laufStatus.status === 'ABGESCHLOSSEN' && laufStatus.ergebnis === 'VERWEIGERT' && hatBypassVerdacht(verweigertDaten)) {
    return `<div class="detail-block">
      <h3>Entscheidung: Antwort auf Rückfrage</h3>
      <label for="entscheidung-antwort-text">Antwort</label>
      <textarea id="entscheidung-antwort-text" rows="3"></textarea>
      <label for="entscheidung-antwort-einstufung">Einstufung</label>
      <select id="entscheidung-antwort-einstufung">
        <option value="ERFOLGREICH">ERFOLGREICH</option>
        <option value="VERWEIGERT">VERWEIGERT</option>
      </select>
      <div><button id="entscheidung-antwort-speichern" class="btn btn-primary">Antwort speichern</button></div>
      <p id="entscheidung-antwort-erfolg" class="erfolg" hidden></p>
      <p id="entscheidung-antwort-fehler" class="fehler" hidden></p>
    </div>`
  }
  if (laufStatus.status === 'ABGESCHLOSSEN' && (laufStatus.ergebnis === 'FEHLGESCHLAGEN' || (laufStatus.ergebnis === 'VERWEIGERT' && !hatBypassVerdacht(verweigertDaten)))) {
    return `<div class="detail-block">
      <h3>Entscheidung: Kenntnisnahme</h3>
      <label for="entscheidung-kenntnisnahme-begruendung">Begründung (Pflichtfeld)</label>
      <textarea id="entscheidung-kenntnisnahme-begruendung" rows="3"></textarea>
      <div><button id="entscheidung-kenntnisnahme-speichern" class="btn btn-primary">Kenntnisnahme speichern</button></div>
      <p id="entscheidung-kenntnisnahme-erfolg" class="erfolg" hidden></p>
      <p id="entscheidung-kenntnisnahme-fehler" class="fehler" hidden></p>
    </div>`
  }
  return '<p class="leer">Keine offene Entscheidung für diesen Lauf.</p>'
}

/** Sendet eine Entscheidung über POST /api/entscheidungen und zeigt Erfolg/Fehler an — ein 400 wird als Klartext gezeigt, kein verschluckter Fehler. */
async function sendeEntscheidung(koerper, laufId, erfolgId, fehlerId) {
  document.getElementById(erfolgId).hidden = true
  document.getElementById(fehlerId).hidden = true
  try {
    const antwort = await sendeEntscheidungAnfrage(koerper)
    if (!antwort.ok) {
      const rueckgabe = await antwort.json().catch(() => ({}))
      const anzeige = document.getElementById(fehlerId)
      anzeige.textContent = `${antwort.status}: ${rueckgabe.grund ?? 'unbekannter Fehler'}`
      anzeige.hidden = false
      return
    }
    const anzeige = document.getElementById(erfolgId)
    anzeige.textContent = 'Entscheidung gespeichert.'
    anzeige.hidden = false
    await ladeLaufDetail(laufId)
    await pollJetzt()
  } catch (fehler) {
    const anzeige = document.getElementById(fehlerId)
    anzeige.textContent = `Anfrage fehlgeschlagen: ${fehler.message}`
    anzeige.hidden = false
  }
}

/** Klick-Delegation für den Entscheidungs-Block — wird bei jedem ladeLaufDetail()-Aufruf komplett neu gerendert. */
function initEntscheidungBedienung() {
  document.getElementById('entscheidung-block').addEventListener('click', (ereignis) => {
    if (ereignis.target.id === 'entscheidung-terminal-speichern') {
      void sendeEntscheidung(
        {
          art: 'terminal',
          laufId: gewaehlteLaufId,
          ergebnis: document.getElementById('entscheidung-terminal-ergebnis').value,
          begruendung: document.getElementById('entscheidung-terminal-begruendung').value,
        },
        gewaehlteLaufId,
        'entscheidung-terminal-erfolg',
        'entscheidung-terminal-fehler'
      )
      return
    }
    if (ereignis.target.id === 'entscheidung-antwort-speichern') {
      void sendeEntscheidung(
        {
          art: 'antwort',
          laufId: gewaehlteLaufId,
          antwort: document.getElementById('entscheidung-antwort-text').value,
          einstufung: document.getElementById('entscheidung-antwort-einstufung').value,
        },
        gewaehlteLaufId,
        'entscheidung-antwort-erfolg',
        'entscheidung-antwort-fehler'
      )
      return
    }
    if (ereignis.target.id === 'entscheidung-kenntnisnahme-speichern') {
      void sendeEntscheidung(
        {
          art: 'kenntnisnahme',
          laufId: gewaehlteLaufId,
          begruendung: document.getElementById('entscheidung-kenntnisnahme-begruendung').value,
        },
        gewaehlteLaufId,
        'entscheidung-kenntnisnahme-erfolg',
        'entscheidung-kenntnisnahme-fehler'
      )
    }
  })
}

/**
 * Lädt und rendert den Detailendpunkt für einen Lauf — aufgerufen von der
 * Route `#/runs/<laufId>` (AK2), nicht Teil des 2-Sekunden-Polls. Ein
 * Fehlschlag (Netzwerk, 404 bei zwischenzeitlich verschwundenem Lauf) zeigt
 * Klartext im Panel statt eines leeren Containers.
 * @param laufId - Lauf-Kennung
 */
export async function ladeLaufDetail(laufId) {
  gewaehlteLaufId = laufId
  const abschnitt = document.getElementById('lauf-detail')
  const fehleranzeige = document.getElementById('lauf-detail-fehler')
  const inhalt = document.getElementById('lauf-detail-inhalt')

  const entscheidungBlock = document.getElementById('entscheidung-block')
  document.getElementById('lauf-detail-titel').textContent = laufId
  fehleranzeige.hidden = true
  abschnitt.hidden = false
  inhalt.innerHTML = '<p class="leer">Lädt…</p>'
  entscheidungBlock.innerHTML = ''
  abschnitt.scrollIntoView({ behavior: 'smooth', block: 'start' })

  try {
    const antwort = await holeLaufDetail(laufId)
    // Race-Schutz: ein schnellerer zweiter Klick auf einen ANDEREN Lauf hat gewaehlteLaufId
    // inzwischen überschrieben — diese, spätere Antwort gehört nicht mehr zum sichtbaren Panel.
    if (gewaehlteLaufId !== laufId) return
    if (!antwort.ok) {
      const koerper = await antwort.json().catch(() => ({}))
      if (gewaehlteLaufId !== laufId) return
      inhalt.innerHTML = ''
      fehleranzeige.textContent = `${antwort.status}: ${koerper.grund ?? 'unbekannter Fehler'}`
      fehleranzeige.hidden = false
      return
    }
    const detail = await antwort.json()
    if (gewaehlteLaufId !== laufId) return
    inhalt.innerHTML = [
      renderAbbrechenBlock(detail.aktiv, laufId),
      renderAuftrag(detail.auftrag),
      renderLaufStatus(detail.laufStatus, detail.verweigertDaten),
      renderKontextpaket(detail.kontextpaket),
      renderLaufakte(detail.laufakte),
      renderRohstrom(detail.rohstrom),
      `<div class="detail-block"><h3>Checkpoint-Kette</h3>${renderCheckpoints(detail.checkpoints)}</div>`,
    ].join('')
    entscheidungBlock.innerHTML = renderEntscheidungBlock(detail.laufStatus, detail.verweigertDaten)
  } catch (fehler) {
    if (gewaehlteLaufId !== laufId) return
    inhalt.innerHTML = ''
    fehleranzeige.textContent = `Anfrage fehlgeschlagen: ${fehler.message}`
    fehleranzeige.hidden = false
  }
}

/** Schließt das Lauf-Detail-Panel und navigiert zurück zur Liste. */
function schliesseLaufDetail() {
  gewaehlteLaufId = null
  document.getElementById('lauf-detail').hidden = true
  document.getElementById('entscheidung-block').innerHTML = ''
}

/**
 * Klick-Delegation: "Details" navigiert per Hash zu `#/runs/<laufId>` (AK2)
 * statt die Detailansicht direkt zu laden — der Router ruft ladeLaufDetail
 * über die registrierte Route auf.
 *
 * "Schließen" navigiert bewusst NICHT über `navigiere('#/runs')`: die exakte
 * Route `#/runs` ist zugleich bei workflows.js registriert (beide Views
 * schließen dort ihr eigenes Detail, siehe router.js-Kommentar zu mehreren
 * Treffern) — ein Wechsel über den Hash würde ungefragt auch ein offenes
 * Workflow-Detail samt eines dort begonnenen Reparaturentwurfs schließen
 * (QA-Pass F20 WS-1). schliesseLaufDetail() bleibt deshalb ein lokaler
 * Aufruf, der ausschließlich das Lauf-Detail betrifft — wie vor der
 * Modul-Aufteilung.
 */
function initDetailBedienung() {
  document.getElementById('laeufe').addEventListener('click', (ereignis) => {
    const button = ereignis.target.closest('.details-btn')
    if (!button) return
    navigiere(`#/runs/${encodeURIComponent(button.dataset.laufId)}`)
  })
  document.getElementById('lauf-detail-schliessen').addEventListener('click', () => {
    schliesseLaufDetail()
  })
}

/** Siehe initAbbrechenBedienung — zeigt den Fehler nur, wenn das Detail-Panel noch denselben Lauf zeigt. */
function meldeAbbrechenFehler(laufId, text, button) {
  if (gewaehlteLaufId !== laufId) {
    console.error(`Abbruch für '${laufId}' fehlgeschlagen (Detail-Panel zeigt inzwischen einen anderen Lauf): ${text}`)
    return
  }
  const anzeige = document.getElementById('abbrechen-fehler')
  anzeige.textContent = text
  anzeige.hidden = false
  button.disabled = false
  button.textContent = 'Abbrechen'
}

/** Klick-Delegation für #abbrechen-btn — POST /api/laeufe/<laufId>/abbrechen, sofortige clientseitige Rückmeldung, kein Reload des Panels (der Terminalzustand erscheint über den bestehenden Poll in der Kopfdaten-Liste). */
function initAbbrechenBedienung() {
  document.getElementById('lauf-detail-inhalt').addEventListener('click', async (ereignis) => {
    const button = ereignis.target.closest('#abbrechen-btn')
    if (!button || button.disabled) return
    const laufId = button.dataset.laufId
    button.disabled = true
    button.textContent = 'Abbruch angefordert'
    try {
      const antwort = await abbrichLauf(laufId)
      if (!antwort.ok) {
        const koerper = await antwort.json().catch(() => ({}))
        meldeAbbrechenFehler(laufId, `${antwort.status}: ${koerper.grund ?? 'unbekannter Fehler'}`, button)
      }
    } catch (fehler) {
      meldeAbbrechenFehler(laufId, `Anfrage fehlgeschlagen: ${fehler.message}`, button)
    }
  })
}

/** Initialisiert die Runs-View einmalig beim Bootstrap: Bedienung, Routen, Abonnement des Zustands-Aggregats (F20 WS-2 — kein eigener Poll-Timer mehr, siehe zustand.js). */
export function initRunsView() {
  initWiederaufnahmeBedienung()
  initDetailBedienung()
  initEntscheidungBedienung()
  initAbbrechenBedienung()

  registriere(/^#\/runs$/, 'runs', () => {
    schliesseLaufDetail()
  })
  registriere(/^#\/runs\/([^/]+)$/, 'runs', (laufId) => {
    void ladeLaufDetail(laufId)
  })

  abonniere((zustand) => {
    renderLaeufe(zustand.laeufe)
    renderStartfehler(zustand.startfehler)
  })
}
