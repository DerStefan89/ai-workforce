/**
 * Datei: public/leitstand/app.js
 *
 * Zweck: Client-Skript des F10-Leitstands. Rendert kontrollzustand/ read-only
 * (F1-Checkpoints, F2-Lineage) und bietet seit WS-2 (F10-Feature-Akte) die
 * Wiederaufnahme-Bedienung (AK7): ein Lauf in KLAERUNG_ERFORDERLICH oder
 * ABGESCHLOSSEN/FEHLGESCHLAGEN (seit F13 zusätzlich VERWEIGERT) bekommt
 * einen Button, der das geführte Startformular vorbelegt (siehe F13 WS-1
 * unten — kein Textfeld/Notweg mehr). AK9 pollt /api/laeufe und
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
 * AK5, ein auftragstext im Body wird mit 400 abgelehnt). rolle/budget/
 * aufrufEingaben.modell sind im Startformular
 * NICHT wählbar (§13.3-Nicht-Ziel „keine dynamische Rollen-/Modell-/
 * Werkzeugwahl") — initStartformular() setzt dafür feste Client-Werte.
 * laufId bleibt ein vom Nutzer überschreibbares Textfeld mit
 * vorausgefülltem Vorschlagswert (aus Auftragstitel + Zeitstempel
 * abgeleitet) — keine Server-Generierung (feature.md AK6 nennt laufId
 * nicht in der Feldliste, aber auch keine Automatik).
 *
 * F12 WS-1: /api/laeufe liefert seit AK2 nur noch Kopfdaten (kein
 * checkpoints-Array mehr) — laufAbschnitt zeigt deshalb eine Kopfdaten-Zeile
 * statt der vollen Checkpoint-Tabelle.
 *
 * F13 WS-1 (AK1/AK2): das JSON-Notweg-Textfeld unter #wiederaufnahme ist
 * entfallen — "Wiederaufnahme starten" befüllt seither dasselbe
 * Startformular (initStartformular), das auch der Neustart nutzt: GET
 * /api/laeufe/<laufId> liefert auftragId (nur bei auftrag.status === 'ok')
 * und die echten, nicht-synthetischen Kontextpaket-Elemente als
 * Evidenzdateien (filtereEchteEvidenzPfade — Präfix 'artefakt:' filtert
 * die vom Server selbst vorangestellten Lineage-Referenzen aus,
 * execution-controller/index.ts). vorgaengerLaufId liegt danach gesperrt
 * in aktiveVorgaengerLaufId und geht in den nächsten POST /api/laeufe-Body
 * ein, bis "Wiederaufnahme abbrechen" oder ein erfolgreicher Start sie
 * zurücksetzt. werkzeugsatz bleibt unvorbelegt (F-161, real geprüft:
 * nirgends rekonstruierbar). darfWiederaufnehmen bietet den Knopf seither
 * auch bei ABGESCHLOSSEN/VERWEIGERT an (F-159, häufigster realer Klärfall).
 * Die Detailansicht zeigt seither zusätzlich renderLaufStatus (AK2):
 * KLAERUNG_ERFORDERLICH unverändert aus stelleLaufstatusFest übernommen,
 * VERWEIGERT zusätzlich aus dem neuen detail.verweigertDaten-Projektionszweig
 * (leitstand-server.mjs, aus dem daten-Feld der terminalen Wirkungsmarke,
 * NICHT aus der Laufakte — die trägt diese Felder nicht).
 *
 * F13 WS-2 (AK3-AK6): #entscheidung-block in der Detailansicht bietet den
 * einzigen Entscheidungs-Schreibpfad — POST /api/entscheidungen. Bei
 * KLAERUNG_ERFORDERLICH art:'terminal' (Ergebnis-Auswahl + Pflicht-
 * begruendung, F-162). Bei ABGESCHLOSSEN/VERWEIGERT art:'antwort'
 * (Antworttext + Einstufung) — ein 400 aus importiereAntwort (keine
 * bestehende transport-<laufId>-Kette, F-159: der Normalfall, kein Bug) wird
 * als Klartext gezeigt, wie jeder andere Serverfehler in dieser Datei (Muster
 * zeigeStartFehler). Kein Formular für art:'stale' (AK5-Prüfung, YAGNI: im
 * Leitstand aktuell kein real erreichbarer STALE-Fall). Nach Erfolg wird die
 * Detailansicht neu geladen (der Klärzustand wechselt) und laden()
 * angestoßen (Kopfdaten-Liste zeigt den neuen Status).
 *
 * F13 WS-4 (F-166): das art:'antwort'-Formular lief bei ABGESCHLOSSEN/
 * VERWEIGERT ohne Bypass-Verdacht (der reale, häufigste Klärfall) garantiert
 * in ein 400, weil es eine transport-<laufId>-Kette voraussetzt, die nur bei
 * der E-186-Eskalation entsteht. renderEntscheidungBlock unterscheidet
 * seither über hatBypassVerdacht(detail.verweigertDaten): mit Bypass-Verdacht
 * weiterhin das art:'antwort'-Formular (E-186, unverändert), ohne Bypass-
 * Verdacht oder bei FEHLGESCHLAGEN das neue art:'kenntnisnahme'-Formular
 * (nur eine Begründung, kein Ergebnis-Feld — das kommt serverseitig aus dem
 * echten Laufstatus).
 *
 * F12 WS-3 (AK7): jede laufAbschnitt-Zeile bekommt einen "Details"-Button
 * (data-lauf-id), Klick-Delegation an #laeufe (Muster
 * initWiederaufnahmeBedienung) ruft ladeLaufDetail(laufId) — NICHT Teil von
 * laden()/dem 2-Sekunden-Poll (AK2-Wortlaut: "Detail nur auf Anforderung").
 * #lauf-detail liegt in index.html bewusst AUSSERHALB von #laeufe, weil
 * laden() #laeufe.innerHTML bei jedem Poll vollständig überschreibt — ein
 * Detail-Panel innerhalb dieses Containers würde die gewählte laufId sonst
 * jede 2 Sekunden verlieren. checkpointZeile/statusZelle/staleZelle (seit
 * WS-1 unbenutzt, D6) rendern hier die Checkpoint-Kette der Detailansicht.
 * Ein Fehlschlag von ladeLaufDetail (Netzwerk, 404 bei zwischenzeitlich
 * verschwundenem Lauf) zeigt Klartext im Panel (Muster zeigeStartFehler),
 * nie einen leeren Container.
 *
 * F14 WS-5 (AK7-Bedienung, Vorbereitung AK10): #lauf-detail-inhalt trägt bei
 * detail.aktiv === true (GET /api/laeufe/<laufId>, WS-4/F-172) zusätzlich
 * einen Abbrechen-Block (renderAbbrechenBlock) — POST
 * /api/laeufe/<laufId>/abbrechen (WS-4, bereits idempotent/404-sicher, daher
 * kein Bestätigungsdialog). Die Rückmeldung ist rein clientseitig (Button
 * deaktivieren, Text "Abbruch angefordert", Muster initStartformular) — kein
 * neuer Poll: die Kopfdaten-Liste (#laeufe) zeigt den Terminalzustand des
 * abgebrochenen Laufs bereits über den bestehenden 2-Sekunden-Poll (laden()),
 * das Detail-Panel selbst aktualisiert sich wie gehabt nur auf erneuten
 * "Details"-Klick oder nach einer Entscheidung (Muster sendeEntscheidung).
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

/** F12 WS-3 (AK7): rendert die Gültigkeits-Zelle einer Checkpoint-Zeile in der Detailansicht (GET /api/laeufe/<laufId>) — seit F12 WS-1 (D6) bis WS-3 unbenutzt liegen geblieben, laufAbschnitt (Kopfdaten-Liste) zeigt keine Checkpoint-Tabelle. */
function statusZelle(cp) {
  if (cp.gueltig) return '<span class="badge ok">gültig</span>'
  const gruende = (cp.gruende ?? []).join('; ')
  return `<span class="badge fehler" title="${escapeHtml(gruende)}">ungültig</span><div class="grund">${escapeHtml(gruende)}</div>`
}

/** F12 WS-3 (AK7): siehe statusZelle. */
function staleZelle(cp) {
  if (!cp.stale) return ''
  if (cp.stale.stale) {
    return `<span class="badge stale" title="${escapeHtml(cp.stale.geaenderteEingaben.join('; '))}">STALE</span>`
  }
  return '<span class="badge aktuell">aktuell</span>'
}

/** F12 WS-3 (AK7): eine Checkpoint-Zeile der Detailansicht-Kette, siehe statusZelle. */
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

/** AK7/F13 WS-1 AK1: Wiederaufnahme-Bedienung ist nur für einen Lauf sinnvoll, dessen letzter Zustand entweder auf eine offene Klärung oder auf einen Fehlschlag zeigt (D-F10-1, feature.md AK7) — seit F13 zusätzlich ABGESCHLOSSEN/VERWEIGERT (F-159: der laut Nachweis häufigste reale Klärfall hatte bisher keinen Knopf). @param laufStatus - der von stelleLaufstatusFest gelieferte LaufStatus (AK8) @returns true, wenn eine Wiederaufnahme angeboten wird */
function darfWiederaufnehmen(laufStatus) {
  if (laufStatus?.status === 'KLAERUNG_ERFORDERLICH') return true
  if (laufStatus?.status !== 'ABGESCHLOSSEN') return false
  return laufStatus.ergebnis === 'FEHLGESCHLAGEN' || laufStatus.ergebnis === 'VERWEIGERT'
}

/** F12 WS-1 (AK2): zeigt die Kopfdaten-Zeile aus GET /api/laeufe — die volle Checkpoint-Tabelle zieht in die WS-3-Detailansicht (GET /api/laeufe/<laufId>) um. */
function laufAbschnitt(lauf) {
  const wiederaufnahmeButton = darfWiederaufnehmen(lauf.laufStatus)
    ? `<button class="wiederaufnahme-btn" data-lauf-id="${escapeHtml(lauf.laufId)}">Wiederaufnahme starten</button>`
    : ''
  const detailsButton = `<button class="details-btn" data-lauf-id="${escapeHtml(lauf.laufId)}">Details</button>`

  return `<section class="lauf">
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

/** Präfix der synthetischen Kontextpaket-Elemente, die der Server selbst voranstellt (artefakt:laufakte-<vorgaengerLaufId>, artefakt:auftrag-<auftragId> — execution-controller/index.ts). AK1: diese Pfade sind keine vom Nutzer benannten Evidenzdateien und dürfen nicht als anfragen-Element erneut eingereicht werden, sie werden serverseitig ohnehin wieder vorangestellt. */
const ARTEFAKT_PRAEFIX = 'artefakt:'

/** Filtert die echten, vom Nutzer ursprünglich benannten Kontextpaket-Elemente eines Vorgängerlaufs für die Wiederaufnahme-Vorbelegung (AK1). @param elemente - detail.kontextpaket.elemente aus GET /api/laeufe/<laufId> @returns Liste repo-relativer Pfade, ohne die artefakt:-Lineage-Referenzen */
function filtereEchteEvidenzPfade(elemente) {
  return elemente.filter((e) => typeof e?.pfad === 'string' && !e.pfad.startsWith(ARTEFAKT_PRAEFIX)).map((e) => e.pfad)
}

/** laufId des Laufs, dessen Wiederaufnahme gerade vorbereitet wird, oder null im Normalstart (AK1) — geht als vorgaengerLaufId in den nächsten POST /api/laeufe-Body ein, bis loescheWiederaufnahmeVorbelegung() sie zurücksetzt. Bewusst kein editierbares Formularfeld (fest/gesperrt laut feature.md AK1). */
let aktiveVorgaengerLaufId = null

function zeigeVorbelegungsFehler(text) {
  const anzeige = document.getElementById('start-vorbelegung-fehler')
  anzeige.textContent = text
  anzeige.hidden = text === ''
}

/** Setzt die Wiederaufnahme-Sperre (AK1) — Hinweistext mit der Vorgänger-laufId, Klartext im Startformular statt eines editierbaren Felds. @param alterLaufId - laufId des Laufs, der wiederaufgenommen wird */
function setzeWiederaufnahmeVorbelegung(alterLaufId) {
  aktiveVorgaengerLaufId = alterLaufId
  document.getElementById('start-wiederaufnahme-laufid').textContent = alterLaufId
  document.getElementById('start-wiederaufnahme-hinweis').hidden = false
}

/** Hebt die Wiederaufnahme-Sperre auf — nach "Wiederaufnahme abbrechen" oder einem erfolgreichen Start (der nächste Start soll nicht stillschweigend wieder dieselbe vorgaengerLaufId tragen). */
function loescheWiederaufnahmeVorbelegung() {
  aktiveVorgaengerLaufId = null
  document.getElementById('start-wiederaufnahme-hinweis').hidden = true
}

/** Ersetzt die Evidenzdatei-Zeilen des Startformulars durch die übergebenen Pfade (AK1) — mindestens eine leere Zeile bleibt bestehen (Muster initEvidenzdateien), auch wenn pfade leer ist. @param pfade - repo-relative Pfade, vorbelegt aus filtereEchteEvidenzPfade */
function ersetzeEvidenzdateien(pfade) {
  document.getElementById('start-evidenzdateien-liste').innerHTML = ''
  if (pfade.length === 0) {
    fuegeEvidenzdateiZeileHinzu()
    return
  }
  for (const pfad of pfade) {
    fuegeEvidenzdateiZeileHinzu()
    const zeilen = document.querySelectorAll('.evidenzdatei-pfad')
    zeilen[zeilen.length - 1].value = pfad
  }
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
      // F13 WS-1 (AK1): fest/gesperrt, kein Formularfeld — gesetzt über "Wiederaufnahme starten".
      ...(aktiveVorgaengerLaufId !== null ? { vorgaengerLaufId: aktiveVorgaengerLaufId } : {}),
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
      loescheWiederaufnahmeVorbelegung()
      aktualisiereLaufIdVorschlag()
      await laden()
    } finally {
      startenButton.disabled = false
    }
  })
}

/**
 * Klick-Delegation für "Wiederaufnahme starten" (AK1) — laden() ersetzt
 * #laeufe komplett bei jedem Poll (AK9), ein direkt gebundener Listener
 * würde dabei verloren gehen (Muster initDetailBedienung). Lädt GET
 * /api/laeufe/<laufId> und belegt damit dasselbe Startformular vor, das
 * initStartformular() für den Neustart nutzt: auftragId (nur bei
 * auftrag.status === 'ok', sonst Feld leer — kein Absturz bei fehlendem
 * Auftragsbezug), echte Evidenz-Anfragen (filtereEchteEvidenzPfade),
 * vorgaengerLaufId fest über aktiveVorgaengerLaufId. werkzeugsatz bleibt
 * bewusst unverändert (F-161).
 */
function initWiederaufnahmeBedienung() {
  document.getElementById('laeufe').addEventListener('click', async (ereignis) => {
    const button = ereignis.target.closest('.wiederaufnahme-btn')
    if (!button) return
    const alterLaufId = button.dataset.laufId
    zeigeVorbelegungsFehler('')

    let detail
    try {
      const antwort = await fetch(`/api/laeufe/${encodeURIComponent(alterLaufId)}`)
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

    const auftragSelect = document.getElementById('start-auftrag')
    if (detail.auftrag?.status === 'ok') {
      await ladeAuftraege()
      auftragSelect.value = detail.auftrag.auftragId
    } else {
      auftragSelect.value = ''
    }

    const evidenzPfade = detail.kontextpaket?.status === 'ok' ? filtereEchteEvidenzPfade(detail.kontextpaket.elemente) : []
    ersetzeEvidenzdateien(evidenzPfade)

    setzeWiederaufnahmeVorbelegung(alterLaufId)
    aktualisiereLaufIdVorschlag()
    document.getElementById('start-starten').scrollIntoView({ behavior: 'smooth', block: 'center' })
  })

  document.getElementById('start-wiederaufnahme-abbrechen').addEventListener('click', loescheWiederaufnahmeVorbelegung)
}

// ─── F12 WS-3 (AK7): Lauf-Detailansicht (GET /api/laeufe/<laufId>, nur auf Anforderung) ──

/** laufId des aktuell im Detail-Panel angezeigten Laufs, oder null — reiner UI-Zustand, keine eigene Fachbedeutung (Muster letzterLaufIdVorschlag). */
let gewaehlteLaufId = null

/** @param status - Nicht-'ok'-Ausprägung von detail.auftrag/kontextpaket/laufakte/rohstrom @param texte - Map status → lesbarer Text @returns lesbarer Hinweistext, oder der rohe status-Wert als Fallback, falls texte ihn nicht kennt */
function unbekanntStatusText(status, texte) {
  return texte[status] ?? status
}

/** @param auftrag - detail.auftrag aus GET /api/laeufe/<laufId> (vier Ausprägungen, D1) @returns HTML-Block für den Auftragsabschnitt der Detailansicht */
function renderAuftrag(auftrag) {
  if (auftrag.status === 'ok') {
    return `<div class="detail-block"><h3>Auftrag: ${escapeHtml(auftrag.titel ?? '')}</h3><p>${escapeHtml(auftrag.auftragstext ?? '')}</p></div>`
  }
  const texte = {
    kein_auftragsbezug: 'Kein Auftragsbezug (Bestandslauf ohne Auftrag).',
    kontextpaket_fehlt: 'Auftragsbezug nicht ermittelbar — Kontextpaket fehlt.',
    auftrag_fehlt: `Auftragsreferenz vorhanden ('${escapeHtml(auftrag.auftragId ?? '')}'), Auftragsartefakt fehlt.`,
  }
  return `<div class="detail-block"><h3>Auftrag</h3><p class="unbekannt">${escapeHtml(unbekanntStatusText(auftrag.status, texte))}</p></div>`
}

/**
 * F13 WS-1 (AK2): Klärzustand unverfälscht sichtbar — bei
 * KLAERUNG_ERFORDERLICH werden blockerId/grund/aufloesungsbedingung/
 * resumeZiel/Anzahl offener run_prepared-Sequenzen unverändert aus
 * stelleLaufstatusFest (detail.laufStatus) übernommen, kein Text neu
 * formuliert. Bei ABGESCHLOSSEN/VERWEIGERT kommen bypass_verdacht_anzahl/
 * is_error/non_execution_kind aus dem separaten detail.verweigertDaten-
 * Projektionszweig (leitstand-server.mjs) — NICHT aus der Laufakte, die
 * diese Felder nicht trägt. Jedes Feld zeigt dort bereits 'unbekannt' statt
 * eines geratenen 0/false bei einem Bestandslauf ohne daten-Feld.
 * @param laufStatus - detail.laufStatus aus GET /api/laeufe/<laufId>
 * @param verweigertDaten - detail.verweigertDaten (null außer bei ABGESCHLOSSEN/VERWEIGERT)
 * @returns HTML-Block für den Klärzustand-Abschnitt der Detailansicht
 */
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

/** @param kontextpaket - detail.kontextpaket aus GET /api/laeufe/<laufId> @returns HTML-Block für den Kontextpaket-Abschnitt (Elemente, eingeklappte Ausschlüsse, Q4) */
function renderKontextpaket(kontextpaket) {
  if (kontextpaket.status !== 'ok') {
    return '<div class="detail-block"><h3>Kontextpaket</h3><p class="unbekannt">Kein Kontextpaket vorhanden.</p></div>'
  }
  const elemente =
    kontextpaket.elemente.length === 0
      ? '<p class="leer">Keine Elemente.</p>'
      : `<ul>${kontextpaket.elemente.map((e) => `<li><code>${escapeHtml(e.pfad)}</code>${e.zitierter_bereich ? ` (${escapeHtml(e.zitierter_bereich)})` : ''}</li>`).join('')}</ul>`
  // Q4/Risiko 4: ausgeschlossen wird mitgeliefert, in der UI eingeklappt.
  const ausgeschlossen =
    kontextpaket.ausgeschlossen.length === 0
      ? ''
      : `<details><summary>${kontextpaket.ausgeschlossen.length} ausgeschlossen</summary><ul>${kontextpaket.ausgeschlossen.map((a) => `<li><code>${escapeHtml(a.pfad)}</code> (${escapeHtml(a.grund)})</li>`).join('')}</ul></details>`
  return `<div class="detail-block"><h3>Kontextpaket (Rolle: ${escapeHtml(kontextpaket.rolle ?? '')})</h3>${elemente}${ausgeschlossen}</div>`
}

/** @param laufakte - detail.laufakte aus GET /api/laeufe/<laufId> @returns HTML-Block für den Laufakte-Abschnitt (Modell/Beobachtungsbasis/Arbeitsverzeichnis) */
function renderLaufakte(laufakte) {
  if (laufakte.status !== 'ok') {
    return '<div class="detail-block"><h3>Laufakte</h3><p class="unbekannt">Keine Laufakte vorhanden.</p></div>'
  }
  return `<div class="detail-block"><h3>Laufakte</h3><table class="lauf-kopfdaten"><tbody>
    <tr><th>Modell</th><td>${laufakte.modellBeobachtet ? escapeHtml(laufakte.modellBeobachtet) : '<span class="unbekannt">unbekannt</span>'}</td></tr>
    <tr><th>Beobachtungsbasis vollständig</th><td>${laufakte.beobachtungsbasisVollstaendig ? 'Ja' : 'Nein'}</td></tr>
    <tr><th>Arbeitsverzeichnis</th><td><code>${escapeHtml(laufakte.arbeitsverzeichnisPfad ?? '')}</code></td></tr>
  </tbody></table></div>`
}

/** Q7: anzahl zählt roh (alle Denials), toolNamen ist dedupliziert und darf leer sein, während anzahl > 0 — bewusst nicht "repariert". Ein fehlendes Ergebnisobjekt (K1) zeigt "unbekannt", nie 0. */
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
    <tr><th>Exit-Code</th><td>${rohstrom.exitCode ?? '<span class="unbekannt">unbekannt</span>'}</td></tr>
    <tr><th>Startfehler</th><td>${rohstrom.startfehler ? escapeHtml(JSON.stringify(rohstrom.startfehler)) : '—'}</td></tr>
    ${permissionZeile}
    <tr><th>stdout-Länge</th><td>${rohstrom.stdoutLaenge ?? '—'}</td></tr>
    <tr><th>stderr-Länge</th><td>${rohstrom.stderrLaenge ?? '—'}</td></tr>
  </tbody></table></div>`
}

/**
 * F14 WS-5 (AK7-Bedienung): Abbrechen-Button, nur bei detail.aktiv === true
 * (WS-4/F-172 — dieser Lauf ist gerade der aktive Arbeitsstrang der
 * Serverinstanz, D13). Kein Bestätigungsdialog (Server ist bereits
 * idempotent/404-sicher, WS-4). Klick-Rückmeldung übernimmt
 * initAbbrechenBedienung rein clientseitig (Button deaktivieren, Text
 * "Abbruch angefordert").
 * @param aktiv - detail.aktiv aus GET /api/laeufe/<laufId>
 * @param laufId - Lauf-Kennung
 * @returns HTML-Block, oder leerer String, wenn der Lauf nicht aktiv ist
 */
function renderAbbrechenBlock(aktiv, laufId) {
  if (!aktiv) return ''
  return `<div class="detail-block">
    <button id="abbrechen-btn" data-lauf-id="${escapeHtml(laufId)}">Abbrechen</button>
    <p id="abbrechen-fehler" class="fehler" hidden></p>
  </div>`
}

const CHECKPOINT_TABELLE_KOPF = `<tr>
  <th>Sequenz</th><th>Zeit</th><th>Status</th><th>Typ</th><th>Lineage-Art</th><th>Erzeugungsart</th>
  <th>Artefakt-ID</th><th>Entscheidung</th><th>Bezieht sich auf</th><th>Stale</th><th>Aufgabe</th><th>Transport-Status</th><th>Executor</th><th>Ergebnis</th>
</tr>`

/** Rendert die volle Checkpoint-Kette (checkpointZeile, seit WS-1 unbenutzt liegend) als Tabelle der Detailansicht. */
function renderCheckpoints(checkpoints) {
  if (checkpoints.length === 0) return '<p class="leer">Keine Checkpoints.</p>'
  return `<table class="lauf-kopfdaten"><thead>${CHECKPOINT_TABELLE_KOPF}</thead><tbody>${checkpoints.map(checkpointZeile).join('')}</tbody></table>`
}

/** F13 WS-4 (F-166): true, wenn ein VERWEIGERT-Lauf einen Bypass-Verdacht des Modells trägt (E-186-Fall) — nur dann bleibt das art:'antwort'-Formular zuständig, sonst übernimmt 'kenntnisnahme'. Ein fehlendes/nicht-numerisches Feld (Bestandslauf, 'unbekannt') zählt NICHT als Bypass-Verdacht. @param verweigertDaten - detail.verweigertDaten aus GET /api/laeufe/<laufId>, oder null @returns true nur bei einer echten, positiven bypassVerdachtAnzahl */
function hatBypassVerdacht(verweigertDaten) {
  return typeof verweigertDaten?.bypassVerdachtAnzahl === 'number' && verweigertDaten.bypassVerdachtAnzahl > 0
}

/**
 * F13 WS-2 (AK3-AK6), erweitert WS-4 (F-166): baut den Entscheidungs-Block
 * der Detailansicht — art:'terminal' bei KLAERUNG_ERFORDERLICH, art:'antwort'
 * bei ABGESCHLOSSEN/VERWEIGERT MIT Bypass-Verdacht (echter E-186-Fall),
 * art:'kenntnisnahme' bei ABGESCHLOSSEN/FEHLGESCHLAGEN oder ABGESCHLOSSEN/
 * VERWEIGERT OHNE Bypass-Verdacht (der reale, häufigste Klärfall — vor WS-4
 * garantiert ein 400 aus dem art:'antwort'-Formular, F-166), sonst ein
 * expliziter Leerzustandstext (kein offener Klärfall, QA-Hinweis: DoD "Leere
 * Zustände berücksichtigt" statt eines kommentarlos leeren Containers). Kein
 * Formular für art:'stale' (AK5, YAGNI).
 * @param laufStatus - detail.laufStatus aus GET /api/laeufe/<laufId>
 * @param verweigertDaten - detail.verweigertDaten aus GET /api/laeufe/<laufId> (null außer bei ABGESCHLOSSEN/VERWEIGERT)
 * @returns HTML-Block, außerhalb der drei Klärfälle ein Leerzustandstext
 */
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
      <div><button id="entscheidung-terminal-speichern">Entscheidung speichern</button></div>
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
      <div><button id="entscheidung-antwort-speichern">Antwort speichern</button></div>
      <p id="entscheidung-antwort-erfolg" class="erfolg" hidden></p>
      <p id="entscheidung-antwort-fehler" class="fehler" hidden></p>
    </div>`
  }
  if (laufStatus.status === 'ABGESCHLOSSEN' && (laufStatus.ergebnis === 'FEHLGESCHLAGEN' || (laufStatus.ergebnis === 'VERWEIGERT' && !hatBypassVerdacht(verweigertDaten)))) {
    return `<div class="detail-block">
      <h3>Entscheidung: Kenntnisnahme</h3>
      <label for="entscheidung-kenntnisnahme-begruendung">Begründung (Pflichtfeld)</label>
      <textarea id="entscheidung-kenntnisnahme-begruendung" rows="3"></textarea>
      <div><button id="entscheidung-kenntnisnahme-speichern">Kenntnisnahme speichern</button></div>
      <p id="entscheidung-kenntnisnahme-erfolg" class="erfolg" hidden></p>
      <p id="entscheidung-kenntnisnahme-fehler" class="fehler" hidden></p>
    </div>`
  }
  // QA-Hinweis: Leerzustand jetzt explizit statt eines kommentarlos leeren Containers (DoD "Leere
  // Zustände berücksichtigt") — deckt u. a. ABGESCHLOSSEN/ERFOLGREICH und NICHT_GESTARTET ab.
  return '<p class="leer">Keine offene Entscheidung für diesen Lauf.</p>'
}

/**
 * Sendet eine Entscheidung über POST /api/entscheidungen (AK3-AK6) und
 * zeigt Erfolg/Fehler in den übergebenen Anzeigeelementen — ein 400 (z. B.
 * F-159s fehlende transport-Kette) wird als Klartext gezeigt, kein
 * verschluckter Fehler (Muster zeigeStartFehler).
 * @param koerper - Body für POST /api/entscheidungen
 * @param laufId - Lauf-Kennung, für den Detail-Reload nach Erfolg
 * @param erfolgId - ID des Erfolgs-Absatzes im aktuell gerenderten Block
 * @param fehlerId - ID des Fehler-Absatzes im aktuell gerenderten Block
 */
async function sendeEntscheidung(koerper, laufId, erfolgId, fehlerId) {
  document.getElementById(erfolgId).hidden = true
  document.getElementById(fehlerId).hidden = true
  try {
    const antwort = await fetch('/api/entscheidungen', { method: 'POST', body: JSON.stringify(koerper) })
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
    await laden()
  } catch (fehler) {
    const anzeige = document.getElementById(fehlerId)
    anzeige.textContent = `Anfrage fehlgeschlagen: ${fehler.message}`
    anzeige.hidden = false
  }
}

/** Klick-Delegation für den Entscheidungs-Block (Muster initWiederaufnahmeBedienung) — #entscheidung-block wird bei jedem ladeLaufDetail()-Aufruf komplett neu gerendert. */
function initEntscheidungBedienung() {
  document.getElementById('entscheidung-block').addEventListener('click', (ereignis) => {
    if (ereignis.target.id === 'entscheidung-terminal-speichern') {
      sendeEntscheidung(
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
      sendeEntscheidung(
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
      sendeEntscheidung(
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
 * Lädt und rendert den Detailendpunkt für einen Lauf (AK7) — nicht Teil von
 * laden()/dem 2-Sekunden-Poll, nur auf Knopfdruck. Ein Fehlschlag (Netzwerk,
 * 404 bei zwischenzeitlich verschwundenem Lauf) zeigt Klartext im Panel
 * statt eines leeren Containers (Muster zeigeStartFehler).
 * @param laufId - Lauf-Kennung, aus dem geklickten Details-Button
 */
async function ladeLaufDetail(laufId) {
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
    const antwort = await fetch(`/api/laeufe/${encodeURIComponent(laufId)}`)
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

/** Klick-Delegation (Muster initWiederaufnahmeBedienung) — laden() ersetzt #laeufe komplett bei jedem Poll, ein direkt gebundener Listener ginge dabei verloren. */
function initDetailBedienung() {
  document.getElementById('laeufe').addEventListener('click', (ereignis) => {
    const button = ereignis.target.closest('.details-btn')
    if (!button) return
    ladeLaufDetail(button.dataset.laufId)
  })
  document.getElementById('lauf-detail-schliessen').addEventListener('click', () => {
    gewaehlteLaufId = null
    document.getElementById('lauf-detail').hidden = true
    document.getElementById('entscheidung-block').innerHTML = ''
  })
}

/**
 * F14 WS-5 (AK7-Bedienung): Klick-Delegation für #abbrechen-btn (Muster
 * initDetailBedienung — #lauf-detail-inhalt wird bei jedem ladeLaufDetail()
 * komplett neu gerendert). Löst POST /api/laeufe/<laufId>/abbrechen aus und
 * gibt sofort clientseitige Rückmeldung (Button deaktivieren, Text "Abbruch
 * angefordert") — kein Reload des Detail-Panels danach, weil laufAktiv
 * serverseitig erst nach dem Laufende zurückgesetzt wird (D13) und ein
 * sofortiger Reload den Button daher nicht zuverlässig verschwinden ließe;
 * der reale Terminalzustand erscheint stattdessen wie gehabt in der über
 * laden() gepollten Kopfdaten-Liste. Ein 404 (Lauf inzwischen bereits
 * beendet) wird als Klartext gezeigt, kein verschluckter Fehler (Muster
 * zeigeStartFehler).
 *
 * QA-Befund: wechselt der Nutzer das Detail-Panel (erneuter "Details"-Klick,
 * auch auf denselben Lauf), während diese Anfrage noch offen ist, hat
 * ladeLaufDetail() #lauf-detail-inhalt bereits neu gerendert — #abbrechen-btn/
 * #abbrechen-fehler dieses Klicks existieren dann nicht mehr im DOM. Derselbe
 * Race-Schutz wie in ladeLaufDetail (gewaehlteLaufId-Vergleich) verhindert
 * den sonst ungefangenen TypeError beim Schreiben auf ein verschwundenes
 * Element — bei einem Panel-Wechsel wird der Fehler nur noch geloggt, nie
 * verschluckt, aber auch nicht mehr gegen ein fremdes Panel angezeigt.
 */
function initAbbrechenBedienung() {
  document.getElementById('lauf-detail-inhalt').addEventListener('click', async (ereignis) => {
    const button = ereignis.target.closest('#abbrechen-btn')
    if (!button || button.disabled) return
    const laufId = button.dataset.laufId
    button.disabled = true
    button.textContent = 'Abbruch angefordert'
    try {
      const antwort = await fetch(`/api/laeufe/${encodeURIComponent(laufId)}/abbrechen`, { method: 'POST' })
      if (!antwort.ok) {
        const koerper = await antwort.json().catch(() => ({}))
        meldeAbbrechenFehler(laufId, `${antwort.status}: ${koerper.grund ?? 'unbekannter Fehler'}`, button)
      }
    } catch (fehler) {
      meldeAbbrechenFehler(laufId, `Anfrage fehlgeschlagen: ${fehler.message}`, button)
    }
  })
}

/** Siehe initAbbrechenBedienung-Kommentar (QA-Befund) — zeigt den Fehler nur, wenn das Detail-Panel noch denselben Lauf zeigt, sonst nur Konsolen-Log statt eines Zugriffs auf ein bereits verschwundenes DOM-Element. @param laufId - Lauf-Kennung des fehlgeschlagenen Abbruchversuchs @param text - anzuzeigender Fehlertext @param button - der geklickte Button, wird bei noch aktuellem Panel reaktiviert */
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

const POLL_INTERVALL_MS = 2000

initEvidenzdateien()
initAuftragFormular()
initStartformular()
initWiederaufnahmeBedienung()
initDetailBedienung()
initEntscheidungBedienung()
initAbbrechenBedienung()
laden()
ladeStartfehler()
ladeAuftraege().then(aktualisiereLaufIdVorschlag)
ladeWerkzeugsaetze()
setInterval(laden, POLL_INTERVALL_MS)
setInterval(ladeStartfehler, POLL_INTERVALL_MS)
