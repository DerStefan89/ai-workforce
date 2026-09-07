/**
 * Datei: public/leitstand/app.js
 *
 * Zweck: Client-Skript des F10-Leitstands. Rendert kontrollzustand/ read-only
 * (F1-Checkpoints, F2-Lineage) und bietet seit WS-2 (F10-Feature-Akte) die
 * Wiederaufnahme-Bedienung (AK7): ein Lauf in KLAERUNG_ERFORDERLICH oder
 * ABGESCHLOSSEN/FEHLGESCHLAGEN bekommt einen Button, der ein Textfeld mit
 * einer Startauftrag-Vorlage befüllt (laufId/vorgaengerLaufId real gesetzt,
 * die übrigen sechs Felder als Platzhalter — bewusst kein Formular, siehe
 * Nicht-Ziele in features/F10/feature.md). AK9 pollt /api/laeufe und
 * /api/startfehler periodisch, damit ein laufender Lauf ohne manuellen
 * Reload sichtbar seinen Terminalzustand erreicht.
 *
 * F11 WS-2: die Vorlage trägt seit AK4/AK5 kein profilReferenz/
 * werkzeugStartziel/werkzeugVersionDeklariert/berechtigungskontext mehr
 * (kommt serverseitig aus der Startvorlage) — stattdessen werkzeugsatz
 * (Name aus der Startvorlage) und auftragstext (AK2, Pflichtfeld).
 *
 * F12 WS-1: /api/laeufe liefert seit AK2 nur noch Kopfdaten (kein
 * checkpoints-Array mehr) — laufAbschnitt zeigt deshalb eine Kopfdaten-Zeile
 * statt der vollen Checkpoint-Tabelle. checkpointZeile/statusZelle/
 * staleZelle bleiben unbenutzt liegen (D6) — WS-3/AK7 baut die
 * Detailansicht gegen den neuen GET /api/laeufe/<laufId> darauf auf, statt
 * sie identisch neu zu schreiben.
 *
 * Wird aufgerufen von: public/leitstand/index.html
 *
 * Wichtig: Kein eigener Zustand, keine eigene Laufstatus-Ableitung — jede
 * Anzeige stammt direkt aus /api/laeufe (F1Bs stelleLaufstatusFest) bzw.
 * /api/startfehler. laden() ersetzt #laeufe bei jedem Poll komplett, darum
 * hängt die Wiederaufnahme-Bedienung per Event-Delegation am Container statt
 * an einzelnen Zeilen-Buttons.
 */

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (z) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[z])
}

/** F12 WS-1 (D6): seit AK2 unbenutzt — laufAbschnitt zeigt keine Checkpoint-Tabelle mehr. Bleibt liegen für WS-3/AK7 (Detailansicht gegen GET /api/laeufe/<laufId>), statt identisch neu geschrieben zu werden. */
function statusZelle(cp) {
  if (cp.gueltig) return '<span class="badge ok">gültig</span>'
  const gruende = (cp.gruende ?? []).join('; ')
  return `<span class="badge fehler" title="${escapeHtml(gruende)}">ungültig</span><div class="grund">${escapeHtml(gruende)}</div>`
}

/** F12 WS-1 (D6): seit AK2 unbenutzt, siehe statusZelle. */
function staleZelle(cp) {
  if (!cp.stale) return ''
  if (cp.stale.stale) {
    return `<span class="badge stale" title="${escapeHtml(cp.stale.geaenderteEingaben.join('; '))}">STALE</span>`
  }
  return '<span class="badge aktuell">aktuell</span>'
}

/** F12 WS-1 (D6): seit AK2 unbenutzt, siehe statusZelle. */
function checkpointZeile(cp) {
  const lin = cp.lineage ?? {}
  const wm = cp.wirkungsmarke ?? {}
  const aufgabe = lin.beschreibung ?? ''
  const status = lin.transportStatus ?? wm.art ?? ''
  const executor = lin.executor ?? ''
  const ergebnis = wm.ergebnis ?? ''
  return `<tr>
    <td>${cp.sequenz}</td>
    <td>${escapeHtml(cp.zeitstempel)}</td>
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

/** AK7: Wiederaufnahme-Bedienung ist nur für einen Lauf sinnvoll, dessen letzter Zustand entweder auf eine offene Klärung oder auf einen Fehlschlag zeigt (D-F10-1, feature.md AK7). @param laufStatus - der von stelleLaufstatusFest gelieferte LaufStatus (AK8) @returns true, wenn eine Wiederaufnahme angeboten wird */
function darfWiederaufnehmen(laufStatus) {
  if (laufStatus?.status === 'KLAERUNG_ERFORDERLICH') return true
  return laufStatus?.status === 'ABGESCHLOSSEN' && laufStatus?.ergebnis === 'FEHLGESCHLAGEN'
}

/** F12 WS-1 (AK2): zeigt die Kopfdaten-Zeile aus GET /api/laeufe — die volle Checkpoint-Tabelle zieht in die WS-3-Detailansicht (GET /api/laeufe/<laufId>) um. */
function laufAbschnitt(lauf) {
  const wiederaufnahmeButton = darfWiederaufnehmen(lauf.laufStatus)
    ? `<button class="wiederaufnahme-btn" data-lauf-id="${escapeHtml(lauf.laufId)}">Wiederaufnahme starten</button>`
    : ''

  return `<section class="lauf">
    <h2>${escapeHtml(lauf.laufId)} ${wiederaufnahmeButton}</h2>
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

/** Zeigt einen sichtbaren Hinweis, wenn ein Poll-Tick (laden/ladeStartfehler) fehlschlägt — sonst friert die Anzeige unbemerkt ein, was AK9 ("Fortschritt sichtbar") unterläuft. @param fehlgeschlagen - true, wenn der letzte Poll-Versuch fehlschlug */
function zeigePollFehler(fehlgeschlagen) {
  const anzeige = document.getElementById('poll-fehler')
  anzeige.hidden = !fehlgeschlagen
}

async function laden() {
  const container = document.getElementById('laeufe')
  try {
    const laeufe = await fetch('/api/laeufe').then((r) => r.json())
    container.innerHTML = laeufe.length === 0
      ? '<p class="leer">Keine Läufe unter kontrollzustand/ gefunden.</p>'
      : laeufe.map(laufAbschnitt).join('')
    zeigePollFehler(false)
  } catch {
    zeigePollFehler(true)
  }
}

function startfehlerZeile(eintrag) {
  return `<p class="startfehler-eintrag"><code>${escapeHtml(eintrag.zeitstempel)}</code>
    <strong>${escapeHtml(eintrag.laufId)}</strong>: ${escapeHtml(eintrag.fehler)}</p>`
}

async function ladeStartfehler() {
  const container = document.getElementById('startfehler')
  try {
    const startfehler = await fetch('/api/startfehler').then((r) => r.json())
    container.innerHTML = startfehler.length === 0
      ? '<p class="leer">Keine Startfehler.</p>'
      : startfehler.map(startfehlerZeile).join('')
    zeigePollFehler(false)
  } catch {
    zeigePollFehler(true)
  }
}

/** Baut die Vorlage fürs Wiederaufnahme-Textfeld — laufId/vorgaengerLaufId real gesetzt, die übrigen sechs Startauftrag-Felder als zu füllende Platzhalter (kein Formular, Nicht-Ziel laut feature.md). werkzeugsatz nennt einen in der Startvorlage benannten Werkzeugsatz (F11 WS-2 AK4/AK5), auftragstext ist seit F11 WS-1 AK2 Pflichtfeld. @param alterLaufId - laufId des Laufs, der wiederaufgenommen wird @returns Startauftrag-Objekt zur Anzeige im Textfeld */
function baueWiederaufnahmeVorlage(alterLaufId) {
  return {
    laufId: `${alterLaufId}-wiederaufnahme-${crypto.randomUUID()}`,
    vorgaengerLaufId: alterLaufId,
    rolle: '',
    anfragen: [],
    budget: {},
    aufrufEingaben: {},
    werkzeugsatz: '',
    auftragstext: '',
  }
}

function zeigeWiederaufnahmeFehler(text) {
  const anzeige = document.getElementById('wiederaufnahme-fehler')
  anzeige.textContent = text
  anzeige.hidden = text === ''
}

/** Kurzes Erfolgsfeedback direkt nach 202 — bis zum ersten Checkpoint vergehen laut Server-Kommentar Sekunden, ohne diesen Hinweis sähe der Nutzer nach „Starten" nur ein leeres Textfeld. @param text - Erfolgstext, leerer String blendet ihn aus */
function zeigeWiederaufnahmeErfolg(text) {
  const anzeige = document.getElementById('wiederaufnahme-erfolg')
  anzeige.textContent = text
  anzeige.hidden = text === ''
}

/** Klick-Delegation statt eines Listeners pro Zeile — laden() ersetzt #laeufe komplett bei jedem Poll (AK9), ein direkt gebundener Listener würde dabei verloren gehen. */
function initWiederaufnahmeBedienung() {
  document.getElementById('laeufe').addEventListener('click', (ereignis) => {
    const button = ereignis.target.closest('.wiederaufnahme-btn')
    if (!button) return
    const textfeld = document.getElementById('wiederaufnahme-json')
    textfeld.value = JSON.stringify(baueWiederaufnahmeVorlage(button.dataset.laufId), null, 2)
    zeigeWiederaufnahmeFehler('')
    zeigeWiederaufnahmeErfolg('')
    textfeld.scrollIntoView({ behavior: 'smooth', block: 'center' })
    textfeld.focus()
  })

  const startenButton = document.getElementById('wiederaufnahme-starten')
  startenButton.addEventListener('click', async () => {
    if (startenButton.disabled) return // Doppel-Submit-Schutz — der Server lehnt den zweiten POST zwar korrekt mit 409 ab, aber nach einem bereits erfolgreichen 202 wäre die 409-Meldung nur verwirrend.
    const textfeld = document.getElementById('wiederaufnahme-json')
    let startauftrag
    try {
      startauftrag = JSON.parse(textfeld.value)
    } catch (fehler) {
      zeigeWiederaufnahmeFehler(`Feld ist kein gültiges JSON: ${fehler.message}`)
      return
    }

    zeigeWiederaufnahmeErfolg('')
    startenButton.disabled = true
    try {
      let antwort
      try {
        antwort = await fetch('/api/laeufe', { method: 'POST', body: JSON.stringify(startauftrag) })
      } catch (fehler) {
        zeigeWiederaufnahmeFehler(`Anfrage fehlgeschlagen: ${fehler.message}`)
        return
      }

      if (antwort.status !== 202) {
        const koerper = await antwort.json().catch(() => ({}))
        zeigeWiederaufnahmeFehler(`${antwort.status}: ${koerper.grund ?? 'unbekannter Fehler'}`)
        return
      }

      const angenommen = await antwort.json().catch(() => ({}))
      zeigeWiederaufnahmeFehler('')
      zeigeWiederaufnahmeErfolg(`Angenommen: laufId '${angenommen.laufId ?? startauftrag.laufId}'. Erscheint in der Liste unten, sobald der erste Checkpoint geschrieben ist.`)
      textfeld.value = ''
      await laden()
    } finally {
      startenButton.disabled = false
    }
  })
}

const POLL_INTERVALL_MS = 2000

initWiederaufnahmeBedienung()
laden()
ladeStartfehler()
setInterval(laden, POLL_INTERVALL_MS)
setInterval(ladeStartfehler, POLL_INTERVALL_MS)
