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
 * F12 WS-2 (AK4-AK6): das geführte Startformular („Auftrag & Start") ist
 * seither der Normalweg — Auftrag anlegen (POST /api/auftraege), Auftrag/
 * Werkzeugsatz wählen (GET /api/auftraege, GET /api/startvorlage/
 * werkzeugsaetze), Evidenzdateien über eine dynamische Zeilenliste
 * benennen, starten (POST /api/laeufe mit auftragId statt auftragstext —
 * AK5). Das JSON-Textfeld unter #wiederaufnahme bleibt als gekennzeichneter
 * Notweg bestehen; baueWiederaufnahmeVorlage trägt seither auftragId statt
 * auftragstext (F12 WS-2 AK5 — ein auftragstext im Body wird jetzt mit 400
 * abgelehnt). rolle/budget/aufrufEingaben.modell sind im Startformular
 * NICHT wählbar (§13.3-Nicht-Ziel „keine dynamische Rollen-/Modell-/
 * Werkzeugwahl") — initStartformular() setzt dafür feste Client-Werte.
 * laufId bleibt ein vom Nutzer überschreibbares Textfeld mit
 * vorausgefülltem Vorschlagswert (aus Auftragstitel + Zeitstempel
 * abgeleitet) — keine Server-Generierung (feature.md AK6 nennt laufId
 * nicht in der Feldliste, aber auch keine Automatik).
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

/** Baut die Vorlage fürs Wiederaufnahme-Textfeld — laufId/vorgaengerLaufId real gesetzt, die übrigen sechs Startauftrag-Felder als zu füllende Platzhalter (kein Formular, Nicht-Ziel laut feature.md). werkzeugsatz nennt einen in der Startvorlage benannten Werkzeugsatz (F11 WS-2 AK4/AK5), auftragId ist seit F12 WS-2 AK5 Pflichtfeld (ersetzt auftragstext, das serverseitig aus dem Auftragsartefakt geladen wird). @param alterLaufId - laufId des Laufs, der wiederaufgenommen wird @returns Startauftrag-Objekt zur Anzeige im Textfeld */
function baueWiederaufnahmeVorlage(alterLaufId) {
  return {
    laufId: `${alterLaufId}-wiederaufnahme-${crypto.randomUUID()}`,
    vorgaengerLaufId: alterLaufId,
    rolle: '',
    anfragen: [],
    budget: {},
    aufrufEingaben: {},
    werkzeugsatz: '',
    auftragId: '',
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

/** Reduziert einen Auftragstitel auf ein für laufId zulässiges Muster (kein '/','\\','..' — Server-Regel LAUFID_UNZULAESSIGE_ZEICHEN) als Baustein eines Vorschlagswerts, nicht als Validierung selbst. @param titel - Auftragstitel oder anderer Anzeigetext @returns kleingeschriebener, mit '-' getrennter Kurzname, max. 40 Zeichen */
function slugifiereFuerLaufId(titel) {
  return (
    titel
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'lauf'
  )
}

function zeigeAuftragAnlegenFehler(text) {
  const anzeige = document.getElementById('auftrag-anlegen-fehler')
  anzeige.textContent = text
  anzeige.hidden = text === ''
}

function zeigeStartFehler(text) {
  const anzeige = document.getElementById('start-fehler')
  anzeige.textContent = text
  anzeige.hidden = text === ''
}

function zeigeStartErfolg(text) {
  const anzeige = document.getElementById('start-erfolg')
  anzeige.textContent = text
  anzeige.hidden = text === ''
}

/** Lädt GET /api/auftraege in das Auftrag-Dropdown des Startformulars (AK6) — Anzeige aus titel/erstellt_am, Wert auftragId (AK4/Q7: Auftragstext bewusst nicht in der Liste). Erhält die vorherige Auswahl über einen Reload hinweg, wenn sie noch existiert. */
async function ladeAuftraege() {
  const select = document.getElementById('start-auftrag')
  const vorherAusgewaehlt = select.value
  try {
    const auftraege = await fetch('/api/auftraege').then((r) => r.json())
    select.innerHTML =
      auftraege.length === 0
        ? '<option value="">— kein Auftrag vorhanden, zuerst anlegen —</option>'
        : auftraege.map((a) => `<option value="${escapeHtml(a.auftragId)}">${escapeHtml(a.titel)} (${escapeHtml(a.erstellt_am ?? 'Zeit unbekannt')})</option>`).join('')
    if (auftraege.some((a) => a.auftragId === vorherAusgewaehlt)) {
      select.value = vorherAusgewaehlt
    }
  } catch (fehler) {
    zeigeStartFehler(`Aufträge konnten nicht geladen werden: ${fehler.message}`)
  }
}

/** Lädt GET /api/startvorlage/werkzeugsaetze in das Werkzeugsatz-Dropdown des Startformulars (AK6) — die Antwort trägt bereits nur name/modus/erlaubte_werkzeuge (D5, serverseitige Allowlist). Anzeige nennt erlaubte_werkzeuge statt modus (Reviewer-Hinweis: modus ist laut Schema immer die Konstante 'DEKLARIERT' und trägt keine Information — art selbst bleibt weiterhin unausgeliefert, D5). */
async function ladeWerkzeugsaetze() {
  const select = document.getElementById('start-werkzeugsatz')
  try {
    const werkzeugsaetze = await fetch('/api/startvorlage/werkzeugsaetze').then((r) => r.json())
    select.innerHTML = werkzeugsaetze.map((w) => `<option value="${escapeHtml(w.name)}">${escapeHtml(w.name)} (${escapeHtml(w.erlaubte_werkzeuge.join(', '))})</option>`).join('')
  } catch (fehler) {
    zeigeStartFehler(`Werkzeugsätze konnten nicht geladen werden: ${fehler.message}`)
  }
}

/** Formular „Auftrag anlegen" (AK4/AK6): POST /api/auftraege, danach Dropdown-Reload (AK6 — neuer Auftrag muss sofort wählbar sein, kein eigener Client-Zustand über die DOM-Darstellung hinaus, Muster laden()). */
function initAuftragFormular() {
  const button = document.getElementById('auftrag-anlegen')
  button.addEventListener('click', async () => {
    if (button.disabled) return
    const titelFeld = document.getElementById('auftrag-titel')
    const auftragstextFeld = document.getElementById('auftrag-auftragstext')
    zeigeAuftragAnlegenFehler('')
    button.disabled = true
    try {
      let antwort
      try {
        antwort = await fetch('/api/auftraege', { method: 'POST', body: JSON.stringify({ titel: titelFeld.value, auftragstext: auftragstextFeld.value }) })
      } catch (fehler) {
        zeigeAuftragAnlegenFehler(`Anfrage fehlgeschlagen: ${fehler.message}`)
        return
      }
      if (antwort.status !== 201) {
        const koerper = await antwort.json().catch(() => ({}))
        zeigeAuftragAnlegenFehler(`${antwort.status}: ${koerper.grund ?? 'unbekannter Fehler'}`)
        return
      }
      titelFeld.value = ''
      auftragstextFeld.value = ''
      await ladeAuftraege()
      aktualisiereLaufIdVorschlag()
    } finally {
      button.disabled = false
    }
  })
}

/** Fügt dem Startformular eine leere Evidenzdatei-Zeile hinzu (AK6, +/- Zeilen). */
function fuegeEvidenzdateiZeileHinzu() {
  const zeile = document.createElement('div')
  zeile.className = 'evidenzdatei-zeile'
  zeile.innerHTML = '<input type="text" class="evidenzdatei-pfad" placeholder="repo-relativer Pfad, z. B. src/beispiel.ts" /><button type="button" class="evidenzdatei-entfernen">–</button>'
  document.getElementById('start-evidenzdateien-liste').appendChild(zeile)
}

/** Nicht-leere, getrimmte Pfade aus den Evidenzdatei-Zeilen des Startformulars. @returns Liste repo-relativer Pfade */
function sammleEvidenzdateien() {
  return Array.from(document.querySelectorAll('.evidenzdatei-pfad'))
    .map((eingabe) => eingabe.value.trim())
    .filter((pfad) => pfad.length > 0)
}

/** Klick-Delegation für die "–"-Buttons (dynamisch hinzugefügte Zeilen), analog zu initWiederaufnahmeBedienung unten. */
function initEvidenzdateien() {
  document.getElementById('start-evidenzdatei-hinzufuegen').addEventListener('click', fuegeEvidenzdateiZeileHinzu)
  document.getElementById('start-evidenzdateien-liste').addEventListener('click', (ereignis) => {
    const button = ereignis.target.closest('.evidenzdatei-entfernen')
    if (!button) return
    button.closest('.evidenzdatei-zeile').remove()
  })
  fuegeEvidenzdateiZeileHinzu()
}

/** Zuletzt in #start-laufid eingetragener Vorschlagswert — aktualisiereLaufIdVorschlag() überschreibt das Feld nur, wenn es noch diesen Wert (oder leer) trägt, nie eine manuelle Nutzereingabe (Q9: laufId bleibt überschreibbares Textfeld, kein Auto-Generate). */
let letzterLaufIdVorschlag = ''

/** Baut einen laufId-Vorschlag aus dem Titel des gewählten Auftrags plus Zeitstempel (Q9) — lesbar statt einer UUID, vom Nutzer überschreibbar. @returns Vorschlagswert für #start-laufid */
function baueLaufIdVorschlag() {
  const auftragSelect = document.getElementById('start-auftrag')
  const titel = auftragSelect.options[auftragSelect.selectedIndex]?.textContent ?? 'lauf'
  return `${slugifiereFuerLaufId(titel)}-${Date.now()}`
}

/** Aktualisiert #start-laufid mit einem frischen Vorschlag, außer der Nutzer hat das Feld bereits manuell geändert. */
function aktualisiereLaufIdVorschlag() {
  const feld = document.getElementById('start-laufid')
  if (feld.value === '' || feld.value === letzterLaufIdVorschlag) {
    letzterLaufIdVorschlag = baueLaufIdVorschlag()
    feld.value = letzterLaufIdVorschlag
  }
}

/**
 * Startformular (AK6) — POST /api/laeufe mit auftragId statt auftragstext
 * (F12 WS-2 AK5). rolle/budget/aufrufEingaben.modell sind im Formular NICHT
 * wählbar (Q10, §13.3-Nicht-Ziel) — feste Client-Werte statt Nutzerwahl.
 * Serverseitige Ablehnungen (400/409, inkl. D13) werden im Klartext
 * angezeigt (AK6-Wortlaut), nicht verschluckt.
 */
function initStartformular() {
  document.getElementById('start-auftrag').addEventListener('change', aktualisiereLaufIdVorschlag)

  const startenButton = document.getElementById('start-starten')
  startenButton.addEventListener('click', async () => {
    if (startenButton.disabled) return
    const auftragId = document.getElementById('start-auftrag').value
    zeigeStartFehler('')
    if (auftragId === '') {
      zeigeStartFehler('Bitte zuerst einen Auftrag anlegen oder wählen.')
      return
    }

    const startauftrag = {
      laufId: document.getElementById('start-laufid').value,
      // Q10: rolle/budget/aufrufEingaben.modell sind serverseitig fest vorgegeben, im Formular nicht editierbar.
      rolle: 'ausfuehrung',
      anfragen: sammleEvidenzdateien().map((pfad) => ({ pfad, frage: 'Evidenz', begruendung: 'Vom Startformular benannte Evidenzdatei' })),
      budget: {},
      // F-144 (TECH_DEBT): dieser Literalwert ist bewusst vom vorlage.modell-Feld der Startvorlage
      // entkoppelt (startvorlagen/beispielprojekt.json) — Letzteres wird serverseitig weder gelesen noch
      // an einen Client-Endpunkt ausgeliefert (vorbestehende Lücke, nicht Teil von WS-2s Scope). Ein
      // künftiger Workstream sollte entscheiden, ob das Startformular vorlage.modell über einen
      // Endpunkt bezieht, statt zwei unabhängige Quellen für "welches Modell wird real aufgerufen" zu
      // pflegen — hier bewusst dokumentiert statt stillschweigend gekoppelt (Entscheidungsregel CLAUDE.md).
      aufrufEingaben: { modell: 'sonnet' },
      werkzeugsatz: document.getElementById('start-werkzeugsatz').value,
      auftragId,
    }

    zeigeStartErfolg('')
    startenButton.disabled = true
    try {
      let antwort
      try {
        antwort = await fetch('/api/laeufe', { method: 'POST', body: JSON.stringify(startauftrag) })
      } catch (fehler) {
        zeigeStartFehler(`Anfrage fehlgeschlagen: ${fehler.message}`)
        return
      }

      if (antwort.status !== 202) {
        const koerper = await antwort.json().catch(() => ({}))
        zeigeStartFehler(`${antwort.status}: ${koerper.grund ?? 'unbekannter Fehler'}`)
        return
      }

      const angenommen = await antwort.json().catch(() => ({}))
      zeigeStartErfolg(`Angenommen: laufId '${angenommen.laufId ?? startauftrag.laufId}'. Erscheint in der Liste unten, sobald der erste Checkpoint geschrieben ist.`)
      document.querySelectorAll('.evidenzdatei-pfad').forEach((eingabe) => {
        eingabe.value = ''
      })
      aktualisiereLaufIdVorschlag()
      await laden()
    } finally {
      startenButton.disabled = false
    }
  })
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

initEvidenzdateien()
initAuftragFormular()
initStartformular()
initWiederaufnahmeBedienung()
laden()
ladeStartfehler()
ladeAuftraege().then(aktualisiereLaufIdVorschlag)
ladeWerkzeugsaetze()
setInterval(laden, POLL_INTERVALL_MS)
setInterval(ladeStartfehler, POLL_INTERVALL_MS)
