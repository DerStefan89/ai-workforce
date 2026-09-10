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
 * F15 WS-3a (AK8, erster von zwei Commits): der Abschnitt „Workflows"
 * projiziert GET /api/workflows und GET /api/workflows/<id> — Kopfdaten je
 * Workflow (inkl. grund, F-221 (a)) und die Schrittliste in
 * Planreihenfolge.
 *
 * F15 WS-3b (AK8, zweiter Commit): dazu die BEDIENUNG. Vier Knöpfe, die
 * ausschließlich bestehende, rot kalibrierte Endpunkte aufrufen — Starten
 * (POST .../starten), Freigeben und Ablehnen (POST .../freigabe, F-222),
 * Stoppen (POST .../stoppen, F-216) —, dazu der Reparaturzug (F-240, F-218):
 * ein aus der aktuellen Fassung vorbereiteter, BEARBEITBARER JSON-Entwurf,
 * den „Einreichen" als neue Fassung an POST /api/workflows schickt.
 *
 * Die Oberfläche entscheidet dabei NICHTS selbst (D5). Was angeboten wird,
 * hängt an zwei Aussagen des Servers: naechster.art (das Verdikt von
 * ermittleNaechstenSchritt, seit WS-3b in beiden Workflow-Projektionen) und
 * status. Beides zu rendern ist kein Nachbauen; eine eigene Rechnung darüber,
 * ob ein ZWINGEND-Schritt gerade fällig ist, wäre ein zweiter Regelsatz im
 * Browser.
 *
 * Was die Oberfläche ausdrücklich NICHT vorhersagt, ist D13 (genau ein
 * aktiver Lauf): ob irgendwo gerade ein Lauf fliegt, ändert sich zwischen
 * Anzeige und Klick. Es wird deshalb nichts vorab gesperrt — kommt ein 409
 * zurück, steht sein Grundtext als Meldung am Workflow. Ehrlich statt
 * vorausschauend.
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

// ─── F15 WS-3a/WS-3b (AK8): Workflow-Ansicht und Workflow-Bedienung ─────────

/**
 * Die LAGE eines Workflows in einem Satz, je Ausgang von
 * ermittleNaechstenSchritt (F15 WS-3b, löst F-253).
 *
 * Der Befund, aus dem diese Tabelle entsteht: der wichtigste Zustand
 * überhaupt — ein fälliger ZWINGEND-Schritt, für den der Mensch die einzige
 * Entscheidungsinstanz ist — hat KEINEN persistierten Status, wenn der erste
 * Schritt eines Workflows ZWINGEND trägt. Es ist nichts gelaufen, also steht
 * nirgends WARTET_FREIGABE, und die Ansicht zeigte bis WS-3a nur das Wort
 * ZWINGEND in einer von zehn Spalten.
 *
 * Die Texte sind ANZEIGE, keine Regel: welcher Ausgang vorliegt, hat der
 * Server entschieden (naechster.art aus baueNaechsterProjektion).
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
 * Übersetzt status und naechster in die angezeigte Lage.
 *
 * status hat VORRANG, wenn er LAEUFT lautet, und das ist keine Zweitrechnung,
 * sondern die Auflösung einer Mehrdeutigkeit: während ein Schritt fliegt,
 * liefert ermittleNaechstenSchritt ohne Vorschrittergebnis 'haltKlaerung'
 * („Schritt ist nicht startbereit, lauf_id gesetzt") — für den Automaten
 * richtig, als Lage gelesen aber falsch, denn es steht nichts, es läuft.
 * Beide Aussagen stammen vom Server; die Anzeige nimmt hier die zutreffendere.
 *
 * GRENZE, ausdrücklich (QA-Pass 10.09.2026): „läuft" heißt hier NUR, dass der
 * abgelegte Status LAEUFT lautet — nicht, dass ein Lauf noch lebt. Ein stale
 * LAEUFT nach einem Serverneustart zeigt dieselbe Lage. Die Markierung
 * „läuft jetzt" an der Schrittzeile (D13, GET /api/laeufe/<laufId>) ist die
 * einzige Gegenprobe, und sie steht nur im DETAIL, nicht in der Liste; ihr
 * Fehlen ist zudem nicht von „läuft nicht mehr" unterscheidbar (F-248). Die
 * Ansicht kann den toten vom lebenden Lauf also nicht sicher trennen — die
 * Ursache ist das fehlende Zeitfeld in WORKFLOW_V0 (F-254 (1)), festgehalten
 * als F-264.
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
 * Eine Kopfdaten-Zeile aus GET /api/workflows.
 *
 * grund steht als eigene Tabellenzeile, nicht in einem title-Attribut: bei
 * KLAERUNG_ERFORDERLICH und GESTOPPT ist er die einzige Auskunft darüber,
 * warum der Automat steht (F-221 (a)) — die Startfehlerliste, die ihn sonst
 * trüge, ist flüchtig.
 * @param workflow - ein Eintrag aus GET /api/workflows
 * @returns HTML-Block für die Workflow-Liste
 */
function workflowKopfzeile(workflow) {
  const detailsButton = `<button class="workflow-details-btn" data-workflow-id="${escapeHtml(workflow.workflowId)}">Details</button>`
  const grundZeile = workflow.grund === null || workflow.grund === undefined ? '' : `<tr><th>Grund</th><td>${escapeHtml(workflow.grund)}</td></tr>`
  // Der fällige Schritt gehört in die LISTE, nicht nur ins Detail (F-253): der Mensch soll
  // sehen, WO er gebraucht wird, ohne jeden Workflow einzeln zu öffnen. Genannt wird er nur
  // dort, wo der Server ihn benennt — 'starte' und 'haltFreigabe' tragen eine schrittId, die
  // vier Halte-Ausgänge tragen keine.
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

/** Lädt GET /api/workflows in die Workflow-Liste (Muster laden(), inklusive des geteilten Poll-Fehlerhinweises). */
async function ladeWorkflows() {
  const container = document.getElementById('workflows')
  try {
    const workflows = await fetch('/api/workflows').then((r) => r.json())
    container.innerHTML = workflows.length === 0 ? '<p class="leer">Keine Workflows unter kontrollzustand/ gefunden.</p>' : workflows.map(workflowKopfzeile).join('')
    zeigePollFehler(false)
  } catch {
    zeigePollFehler(true)
  }
}

/**
 * Bringt die Schritte in Planreihenfolge: entlang der nachfolger-Kette ab dem
 * Schritt, den kein anderer als nachfolger nennt. Nötig, weil die
 * Array-Reihenfolge die Reihenfolge der Niederschrift ist —
 * validiereWorkflowDaten erzwingt keinen Gleichlauf mit der Kette.
 *
 * Jeder Schritt trägt im Ergebnis, OB die Kette ihn erreicht hat. Der
 * Detailendpunkt validiert nicht (F-247): ein Zyklus ohne Wurzel, zwei
 * Wurzeln oder eine doppelt vergebene schritt_id kommen hier real an. In
 * diesen Fällen ist die Reihenfolge keine Planreihenfolge mehr, und die
 * Überschrift allein wäre dann eine falsche Zusage — deshalb wird der
 * angehängte Rest ausgewiesen statt still eingereiht. Verglichen wird über
 * Objektidentität, nicht über schritt_id: sonst verschwände der Zwilling
 * einer doppelt vergebenen Kennung spurlos aus der Ansicht.
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
 * F-234: welche lauf_id gerade WIRKLICH fliegt. Quelle ist das aktiv-Feld aus
 * GET /api/laeufe/<laufId> (D13) — dafür braucht es keine Serveränderung, und
 * es ist bewusst nicht aus dem Schrittstatus abgeleitet: LAEUFT im Artefakt
 * heißt nur, dass der Schritt gestartet WURDE, nicht dass sein Lauf noch lebt.
 * Gefragt wird nur für Schritte auf LAEUFT — D13 lässt höchstens einen aktiven
 * Lauf zu, die Zahl der Anfragen bleibt also klein. Ein Fehlschlag lässt die
 * Markierung weg, statt die Schrittliste zu verhindern.
 * @param eintraege - Ergebnis von ordneSchritteNachPlan
 * @returns Menge der lauf_id, die der Server als aktiv meldet
 */
async function ermittleAktiveLaufIds(eintraege) {
  const aktive = new Set()
  for (const { schritt } of eintraege) {
    if (schritt.status !== 'LAEUFT' || typeof schritt.lauf_id !== 'string') continue
    try {
      const antwort = await fetch(`/api/laeufe/${encodeURIComponent(schritt.lauf_id)}`)
      if (!antwort.ok) {
        // Nicht stillschweigend übergehen: ein 404 heißt "Laufverzeichnis noch nicht da"
        // (F-248) und sieht in der Ansicht aus wie "läuft nicht mehr".
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
 * @param faelligId - naechster.schrittId aus dem Server, oder null (F15 WS-3b, F-253)
 * @param cursorId - daten.aktiver_schritt_id, oder null
 * @returns Tabellenzeile der Schrittliste
 */
function workflowSchrittZeile(eintrag, aktiveLaufIds, faelligId = null, cursorId = null) {
  const { schritt } = eintrag
  const laeuftJetzt = typeof schritt.lauf_id === 'string' && aktiveLaufIds.has(schritt.lauf_id)
  // Zwei verschiedene Markierungen, bewusst nicht zusammengelegt: der CURSOR ist ein
  // abgelegtes Feld (aktiver_schritt_id), FÄLLIG ist das Verdikt des Automaten zu dieser
  // Fassung. Meistens zeigen beide auf denselben Schritt; auseinander laufen sie genau in den
  // Fällen, die den Menschen interessieren (ein Cursor, der auf einen nicht startbereiten
  // Schritt zeigt — F-218).
  const cursorMarke = cursorId !== null && schritt.schritt_id === cursorId ? ' <span class="badge" title="aktiver_schritt_id — der Cursor des Automaten">Cursor</span>' : ''
  const faelligMarke = faelligId !== null && schritt.schritt_id === faelligId ? ' <span class="badge aktiv" title="Der Server nennt genau diesen Schritt als nächsten (naechster.schrittId)">fällig</span>' : ''
  const laufVerweis =
    typeof schritt.lauf_id === 'string'
      ? `<button class="workflow-lauf-verweis" data-lauf-id="${escapeHtml(schritt.lauf_id)}">${escapeHtml(schritt.lauf_id)}</button>`
      : '<span class="unbekannt">kein Lauf</span>'
  // freigabe_erteilt ist optional: eine Fassung vor WS-2c (b1) trägt es nicht. Ein fehlendes Feld
  // heißt "keine Freigabe erteilt" und wird als Strich gezeigt, nicht als ausgesprochenes "false".
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
 * @param naechster - das Automaten-Verdikt derselben Antwort (F15 WS-3b), oder null
 * @returns HTML-Block mit den Workflow-Feldern oberhalb der Schrittliste
 */
function renderWorkflowKopf(daten, versionSequenz, naechster) {
  // Lage und Verdikt stehen ÜBER Status und Cursor, weil sie die Frage beantworten, mit der
  // ein Mensch diese Ansicht öffnet ("muss ich etwas tun?"), während status und
  // aktiver_schritt_id die Rohdaten dazu sind (F-253).
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
 * Der Zustand, in dem eine abgelegte Fassung nicht mehr gegen WORKFLOW_V0 validiert.
 *
 * F15 WS-3b (F-247): die Verstöße kommen seither vom SERVER
 * (GET /api/workflows/<id>, Feld verstoesse) statt aus einem 409, den dieser
 * Endpunkt nie geschickt hat, oder aus einer clientseitigen Ersatzprüfung. Der
 * Block ist eine WARNUNG ÜBER der Ansicht und kein Riegel davor: die
 * Schrittliste wird weiterhin gezeigt, denn eine kaputte Fassung anzusehen ist
 * der erste Schritt ihrer Reparatur.
 * @param verstoesse - string[] aus validiereWorkflowDaten
 * @returns HTML-Block
 */
function renderWorkflowUngueltig(verstoesse) {
  const liste = verstoesse.map((verstoss) => `<li>${escapeHtml(verstoss)}</li>`).join('')
  return `<div class="detail-block"><h3>Fassung ungültig</h3><p class="fehler">Diese Fassung validiert nicht gegen WORKFLOW_V0 — der Startendpunkt lehnt sie mit 409 ab. Sie wird trotzdem vollständig gezeigt, weil die Reparatur damit beginnt, sie anzusehen.</p><ul>${liste}</ul></div>`
}

// ─── F15 WS-3b: Bedienung (Starten, Freigeben, Ablehnen, Stoppen) ───────────

/**
 * Workflow-Status, in denen POST /api/workflows/<id>/stoppen etwas zu stoppen
 * findet. ZWILLING von STOPPBARE_WORKFLOW_STATUS in scripts/leitstand-
 * server.mjs — und bewusst nur ein ANZEIGE-Zwilling: der Server entscheidet,
 * diese Liste bestimmt allein, ob der Knopf angeboten wird. Läuft sie
 * auseinander, ist die Folge ein 409 mit lesbarem Grund, kein falscher Stopp.
 */
const STOPPBARE_WORKFLOW_STATUS = ['OFFEN', 'LAEUFT', 'WARTET_FREIGABE', 'KLAERUNG_ERFORDERLICH']

/** Workflow-Status, aus denen heraus eine Reparaturfassung vorbereitet wird (F-240): die beiden, in denen der Automat steht und POST /api/workflows eine neue Fassung annimmt. */
const REPARIERBARE_WORKFLOW_STATUS = ['GESTOPPT', 'KLAERUNG_ERFORDERLICH']

/**
 * @param text - anzuzeigender Text, oder null zum Ausblenden
 * @param art - 'fehler' (Vorgabe) oder 'erfolg'; steuert nur die Farbgebung. Ohne diesen
 *   Schalter stünde auch die Bestätigung einer angenommenen Fassung in der Fehlerfarbe.
 */
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
 * Schickt EINE Bedienung an ihren Endpunkt und pollt danach außer der Reihe.
 *
 * Fehler werden gezeigt, nicht vorhergesagt (D13): ob gerade irgendwo ein Lauf
 * aktiv ist, ändert sich zwischen Anzeige und Klick, und ein clientseitiges
 * Vorabsperren wäre eine Vermutung über den Serverzustand. Kommt ein 409,
 * steht sein Grundtext hier — er nennt den fremden Lauf beim Namen und, beim
 * Freigabe-Endpunkt, ausdrücklich auch, dass die Entscheidung NICHT
 * festgehalten wurde.
 *
 * Der Poll außer der Reihe läuft in JEDEM Fall, auch nach einem Fehler: der
 * Grund für die Ablehnung kann darin liegen, dass die Anzeige veraltet war,
 * und dann ist das Erste, was der Mensch braucht, der frische Stand.
 * @param url - vollständiger Endpunktpfad (am Aufrufort ausgeschrieben, damit er im Quelltext steht)
 * @param koerper - JSON-Body der Bedienung
 * @param knopf - auslösender Button; wird während des Aufrufs gesperrt
 * @param erfolgstext - was im Erfolgsfall gemeldet wird
 */
async function sendeWorkflowBedienung(url, koerper, knopf, erfolgstext) {
  zeigeBedienungsMeldung(null)
  knopf.disabled = true
  try {
    const antwort = await fetch(url, { method: 'POST', body: JSON.stringify(koerper) })
    const inhalt = await antwort.json().catch(() => ({}))
    if (antwort.ok) {
      // Auch der Erfolg bekommt eine Rückmeldung, und er nennt, was der Körper wirklich sagt
      // (QA-Pass 10.09.2026): eine Freigabe erzeugt ein Entscheidungsartefakt, und ein Stopp
      // beantwortet die für den Menschen wichtigste Frage — ob dabei ein fliegender Lauf
      // abgebrochen wurde oder ob ohnehin nichts lief. Ohne diese Auswertung wäre die einzige
      // Rückmeldung die zwei Sekunden später wechselnde Lage.
      zeigeBedienungsMeldung(`${erfolgstext}${inhalt.laufAbgebrochen === true ? ' Der laufende Schritt wurde abgebrochen.' : ''}${inhalt.laufAbgebrochen === false ? ' Es lief kein Schritt dieses Workflows — nichts abgebrochen.' : ''}${inhalt.bezeugt === false ? ' ACHTUNG: die Entscheidung konnte NICHT als Artefakt festgehalten werden.' : ''}`, 'erfolg')
    } else {
      zeigeBedienungsMeldung(`${antwort.status}: ${inhalt.grund ?? 'unbekannter Fehler'}`)
    }
  } catch (fehler) {
    zeigeBedienungsMeldung(`Anfrage fehlgeschlagen: ${fehler.message}`)
  }
  knopf.disabled = false
  // Poll außer der Reihe: Workflow-Liste, offenes Workflow-Detail und die Laufliste. Ohne ihn
  // stünde die Wirkung der eben ausgelösten Bedienung bis zu zwei Sekunden lang nicht da.
  pollWorkflows()
  laden()
}

/**
 * Der Bedienblock zu EINEM Workflow.
 *
 * Angeboten wird ausschließlich, was der Server als möglich ausweist:
 * naechster.art für Starten und Freigeben/Ablehnen, status für Stoppen und für
 * den Reparaturzug. Freigeben, Ablehnen und Stoppen tragen ein
 * Pflicht-Begründungsfeld — der Server verlangt es (400), und die Oberfläche
 * darf diesen 400 nicht erst provozieren.
 * @param workflowId - Kennung des angezeigten Workflows
 * @param status - daten.status
 * @param naechster - Automaten-Verdikt aus dem Server, oder null
 * @param ungueltig - true, wenn die Fassung nicht gegen WORKFLOW_V0 validiert (verstoesse gefüllt)
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

  // Kein Stopp-Knopf auf einer ungültigen Fassung: der Stopp-Endpunkt lehnt sie mit 409 ab
  // (F-241), der Knopf wäre eine Zusage, die der Server sicher bricht (QA-Pass 10.09.2026).
  if (STOPPBARE_WORKFLOW_STATUS.includes(status) && !ungueltig) {
    bloecke.push(`<div class="unterabschnitt">
      <label for="wf-stopp-begruendung">Begründung des Stopps (Pflicht)</label>
      <textarea id="wf-stopp-begruendung" rows="2"></textarea>
      <div><button class="wf-aktion" data-aktion="stoppen" data-workflow-id="${kennung}">Stoppen</button></div>
    </div>`)
  }

  // Die Reparatur hängt am Status ODER an der Ungültigkeit — und der zweite Öffner ist der
  // wichtigere (QA-Pass 10.09.2026): POST /api/workflows lässt einen ungültigen Bestand
  // ausdrücklich in JEDEM Status ersetzen (bestandUngueltig), weil aus ihm ohnehin kein Lauf
  // mehr startet. Ohne diese Zeile wäre genau die Fassung, für die F-247 die Lesbarkeit
  // erkämpft hat, ansehbar und nicht reparierbar — die zugemauerte Sackgasse in neuer Form.
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

/**
 * Kennzeichen des zuletzt gerenderten Bedienblocks.
 *
 * Der Grund für den Vergleich ist ein Eingabefeld: der Bedienblock trägt
 * Pflichtbegründungen, und das Workflow-Detail rendert alle zwei Sekunden neu
 * (F-249). Würde der Block dabei jedes Mal ersetzt, wäre jede angefangene
 * Begründung nach zwei Sekunden weg. Er wird deshalb nur neu gebaut, wenn sich
 * an der Lage etwas geändert hat — und dann MUSS er ersetzt werden, denn dann
 * gehört die angefangene Begründung zu einer Frage, die es nicht mehr gibt.
 */
let bedienungsKennzeichen = null

/** @param workflowId - angezeigter Workflow @param status - daten.status @param naechster - Automaten-Verdikt, oder null */
function aktualisiereWorkflowBedienung(workflowId, status, naechster, ungueltig = false) {
  const kennzeichen = `${workflowId}|${status}|${naechster?.art ?? 'null'}|${naechster?.schrittId ?? 'null'}|${ungueltig}`
  if (kennzeichen === bedienungsKennzeichen) return
  bedienungsKennzeichen = kennzeichen
  document.getElementById('workflow-bedienung').innerHTML = renderWorkflowBedienung(workflowId, status, naechster, ungueltig)
  // Die Meldung wird hier BEWUSST NICHT geleert. Sie steht in eigenem Container, und jede
  // Bedienung leert sie ohnehin, bevor sie losläuft. Würde die Lageänderung sie mitnehmen,
  // verschwände genau die Rückmeldung, die zu einer erfolgreichen Bedienung gehört: die Lage
  // ändert sich ja, WEIL die Bedienung gewirkt hat.
}

// ─── F15 WS-3b: Reparaturzug (löst F-240, F-218; zeigt F-219, F-223, F-226) ─

/** Schritt-Status, deren Schrittfelder eine Reparaturfassung zurücksetzt: der abgebrochene (LAEUFT) und die gescheiterten. ERFOLGREICHE Schritte bleiben unangetastet — ihre lauf_id ist der Lineage-Verweis, den Folgeschritte zitieren. */
const REPARIERBARE_SCHRITT_STATUS = ['LAEUFT', 'FEHLGESCHLAGEN', 'VERWEIGERT']

/**
 * Baut aus der aktuellen Fassung den Entwurf einer Reparaturfassung — die vier
 * Korrekturen, die bis WS-3b nur scripts/check-f15-automat-real.mjs Block (e)
 * vollständig gemacht hat (F-240):
 *
 *   (1) status -> 'OFFEN'. GESTOPPT und KLAERUNG_ERFORDERLICH sind ersetzbar,
 *       aber ein unverändert übernommenes GESTOPPT ergäbe eine Fassung, die
 *       sofort wieder steht.
 *   (2) Die Schrittfelder des abgebrochenen oder gescheiterten Schritts:
 *       status -> 'OFFEN', lauf_id -> null. Ohne das hält Regel 3 von
 *       ermittleNaechstenSchritt ihn für nicht startbereit.
 *   (3) Der Cursor bleibt, wo er steht; ist er null — der Normalfall nach
 *       GESTOPPT —, zeigt er auf den ersten Schritt ohne lauf_id (F-218).
 *   (4) grund bleibt stehen, damit der Mensch im Entwurf liest, warum der
 *       Workflow stand. Beim Einreichen normalisiert der Server ihn ohnehin
 *       auf null — ihn hier zu löschen, nähme die Information genau dem, der
 *       sie braucht.
 *
 * AUFLAGE, bitte stehen lassen: (3) ist eine VORBELEGUNG für einen Entwurf,
 * den der Mensch prüft und ändert — KEINE Durchsetzung und kein zweiter
 * Cursor-Regelsatz. Der Automat berechnet seinen Cursor unverändert allein in
 * ermittleNaechstenSchritt; was hier entsteht, ist ein Textvorschlag in einem
 * Formularfeld.
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
 * Fassung zurücknimmt (F-226).
 *
 * ANZEIGE-Zwilling von ermittleFreigabeAbschwaechungen in scripts/leitstand-
 * server.mjs — der Server bleibt die entscheidende Instanz und lehnt eine
 * unbegründete Abschwächung mit 400 ab. Diese Fassung hier existiert nur,
 * damit der Mensch das Begründungsfeld VOR dem Einreichen sieht statt danach
 * im Fehlertext.
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
 * Die Warnungen über dem Entwurf — alle drei allein aus der geladenen Fassung
 * und dem Entwurf ableitbar, ohne eine einzige zusätzliche Anfrage.
 *
 * Sie LÖSEN die zugrunde liegenden Befunde nicht, sie machen sie sichtbar:
 * F-219 und F-223 bleiben offen, weil das, was sie beschreiben, eine zulässige
 * menschliche Entscheidung ist — von vorn anzufangen und dabei die
 * Vorgängerkette bzw. eine erteilte Freigabe zu verlieren. Was fehlte, war
 * nicht der Zwang, sondern der Hinweis.
 * @param daten - die geladene Fassung
 * @param entwurf - der (möglicherweise vom Menschen bearbeitete) Entwurf
 * @returns Warntexte
 */
function ermittleReparaturWarnungen(daten, entwurf) {
  const warnungen = []

  // F-223: eine erteilte, aber noch nicht verbrauchte Freigabe geht beim Einreichen verloren —
  // POST /api/workflows normalisiert freigabe_erteilt aus jedem Körper weg (nötig, sonst
  // erteilte sich eine Fassung ihre Freigabe selbst). Der Server sagt das nirgends.
  const verloreneFreigaben = daten.schritte.filter((schritt) => schritt.freigabe_erteilt === true && schritt.lauf_id === null).map((schritt) => schritt.schritt_id)
  if (verloreneFreigaben.length > 0) {
    warnungen.push(
      `F-223: Für ${verloreneFreigaben.map((id) => `'${id}'`).join(', ')} ist eine Freigabe erteilt, der Schritt ist aber noch nicht gelaufen. Beim Einreichen verwirft der Server das Feld — der Schritt hält danach erneut an und muss neu freigegeben werden.`
    )
  }

  // F-219: ein Schritt, dessen lauf_id zurückgesetzt wird, fällt als Lineage-Vorgänger für
  // seinen Folgeschritt aus (gelaufeneVorschritte in starteWorkflowSchritt liest
  // "nachfolger === schritt_id und lauf_id !== null").
  const verloreneVorgaenger = daten.schritte
    .filter((schritt) => REPARIERBARE_SCHRITT_STATUS.includes(schritt.status) && schritt.lauf_id !== null && schritt.nachfolger !== null)
    .map((schritt) => `'${schritt.schritt_id}' -> '${schritt.nachfolger}'`)
  if (verloreneVorgaenger.length > 0) {
    warnungen.push(
      `F-219: Die lauf_id von ${verloreneVorgaenger.join(', ')} wird zurückgesetzt. Der Folgeschritt startet dann ohne vorgaengerLaufId — der Lineage-Verweis auf den Vorlauf fehlt. Kein Fehler, aber eine Entscheidung.`
    )
  }

  // F-226: nimmt der Entwurf eine ZWINGEND-Pflicht zurück, verlangt der Server seit WS-2c (b3)
  // eine Begründung. Das Feld dafür steht sichtbar am Entwurf und nicht erst im 400.
  const abgeschwaecht = ermittleAbgeschwaechteFreigabenAnzeige(daten.schritte, entwurf?.schritte)
  if (abgeschwaecht.length > 0) {
    warnungen.push(
      `F-226: Dieser Entwurf nimmt die Freigabepflicht von ${abgeschwaecht.map((id) => `'${id}'`).join(', ')} zurück (ZWINGEND entfällt). Der Server verlangt dafür eine Begründung und hält sie als Entscheidung fest.`
    )
  }

  // F-240: der Halt-Grund geht beim Einreichen verloren — POST /api/workflows normalisiert ihn
  // auf null, damit der Grund der ALTEN Fassung nicht in eine frische wandert, die gar nicht
  // angehalten ist. Richtig, aber der Server sagt es nirgends, und danach steht die
  // Stopp-Begründung in KEINER Ansicht mehr (die Entscheidungsartefakte liest bisher niemand,
  // F-254 (3)). Der Entwurf zeigt den Grund an und nähme ihn beim Klick lautlos weg — deshalb
  // dieser Hinweis (QA-Pass 10.09.2026).
  if (typeof daten.grund === 'string' && daten.grund.length > 0) {
    warnungen.push(`F-240: Der Halt-Grund ("${daten.grund.slice(0, 80)}${daten.grund.length > 80 ? '…' : ''}") wird beim Einreichen auf null normalisiert und ist danach in keiner Ansicht mehr zu lesen. Wenn er festgehalten gehört, kopiere ihn vorher — die Stopp-Entscheidung selbst bleibt als Artefakt bestehen.`)
  }

  // Dieselbe Klasse wie oben, andere Ursache: eine erreichte Schrittgrenze hält die Kette an,
  // und der Entwurf hebt sie NICHT an. Ohne diesen Hinweis wird die Fassung angenommen und
  // steht sofort wieder — genau die Fehlerform, gegen die F-240 geschrieben ist (QA-Pass
  // 10.09.2026). Gezählt wird wie in zaehleGelaufeneSchritte: ein Schritt gilt als gelaufen,
  // wenn er eine lauf_id trägt — hier auf dem ENTWURF, weil dessen Rücksetzungen den Zähler
  // bereits senken.
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
 * Der Reparaturentwurf als bearbeitbarer JSON-Text.
 *
 * BEWUSST KEIN FORMULAR: der Plan ist ein strukturiertes Artefakt mit
 * Schritten, Werkzeugsätzen, Eingaben und Nachfolgern — ein Formular dafür
 * wäre ein Plan-Editor, den AK8 nicht verlangt und der eine zweite, alternde
 * Beschreibung von WORKFLOW_V0 wäre.
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

/**
 * Fortlaufende Nummer je oeffneReparaturEntwurf-Aufruf — derselbe Überholschutz wie in
 * ladeWorkflowDetail (F-252), hier aus zwei anderen Gründen (Reviewer-Pass 10.09.2026): ein
 * Doppelklick auf „Reparaturfassung vorbereiten" ließe die langsamere Antwort bereits
 * eingetippte Änderungen überschreiben, und ein Klick mit anschließendem Schließen des Panels
 * baute den Entwurf danach wieder auf — die Zusage „den Entwurf schließt allein der Mensch"
 * gälte dann nicht mehr.
 */
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
 * Lädt die AKTUELLE Fassung und öffnet daraus den Entwurf.
 *
 * Frisch geladen und nicht aus dem gerade angezeigten Stand gebaut: zwischen
 * dem letzten Poll und dem Klick kann die Nachbereitung des abgebrochenen
 * Laufs eine neue Version geschrieben haben (F-240, zweiter Teil). Der Entwurf
 * soll auf dem stehen, was auf der Platte liegt.
 * @param workflowId - Kennung des Workflows
 */
async function oeffneReparaturEntwurf(workflowId) {
  const behaelter = document.getElementById('workflow-reparatur')
  reparaturZaehler += 1
  const meineNummer = reparaturZaehler
  const istUeberholt = () => reparaturZaehler !== meineNummer
  behaelter.innerHTML = '<p class="leer">Lädt…</p>'
  try {
    const antwort = await fetch(`/api/workflows/${encodeURIComponent(workflowId)}`)
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

/**
 * Rechnet die Warnungen gegen den TATSÄCHLICH eingetippten Text neu.
 *
 * Nötig, weil der Entwurf bearbeitbar ist: die F-226-Warnung entsteht erst,
 * wenn der Mensch selbst eine ZWINGEND-Pflicht herausnimmt — sie erst beim
 * Absenden zu berechnen hieße, sie gleichzeitig mit dem Ergebnis zu zeigen,
 * also nie gelesen zu werden (QA-Pass 10.09.2026). Ein unlesbarer Zwischenstand
 * (halb getipptes JSON) lässt die Warnungen stehen, statt sie durch eine
 * Parserfehlermeldung zu ersetzen — beim Tippen ist ungültiges JSON der
 * Normalfall, nicht der Fehler.
 */
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

/**
 * Schließt den Entwurf und gibt die Vergleichsgrundlage frei. Der Zähler wird
 * hochgezählt, nicht bloß der Container geleert: eine noch fliegende
 * oeffneReparaturEntwurf-Antwort würde den Entwurf sonst nach dem Schließen
 * wieder aufbauen.
 */
function verwirfReparaturEntwurf() {
  reparaturBasis = null
  reparaturZaehler += 1
  document.getElementById('workflow-reparatur').innerHTML = ''
}

/**
 * Reicht den bearbeiteten Entwurf als neue Fassung ein (POST /api/workflows).
 *
 * Vor dem Absenden werden die Warnungen gegen den TATSÄCHLICH eingetippten
 * Text neu bestimmt: der Mensch hat den Entwurf womöglich so geändert, dass er
 * jetzt eine Freigabepflicht zurücknimmt (F-226) — dann muss die Warnung
 * dastehen, bevor der Server sie als 400 zurückschickt.
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
    const antwort = await fetch('/api/workflows', { method: 'POST', body: JSON.stringify(koerper) })
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
  // Poll außer der Reihe, wie nach jeder anderen Bedienung.
  pollWorkflows()
}

/** workflowId des aktuell im Workflow-Panel angezeigten Workflows, oder null (Muster gewaehlteLaufId). */
let gewaehlteWorkflowId = null

/** Fortlaufende Nummer je ladeWorkflowDetail-Aufruf. Siehe istUeberholt in ladeWorkflowDetail. */
let workflowRenderZaehler = 0

/**
 * Lädt GET /api/workflows/<id> und rendert Kopf und Schrittliste.
 *
 * Anders als ladeLaufDetail hängt diese Funktion am Poll: der Zweck der
 * Ansicht ist zu sehen, wie der Cursor wandert und Schrittstatus umspringen.
 *
 * WS-3b zieht Eingabefelder ein und beantwortet die Frage, die WS-3a hier
 * offengelassen hat (F-249), mit einer Aufteilung statt mit einem Abschalten
 * des Polls: die Schrittliste (#workflow-detail-inhalt) wird weiterhin bei
 * jedem Tick ersetzt, der Bedienblock (#workflow-bedienung) nur bei ECHTER
 * Lageänderung (aktualisiereWorkflowBedienung), und der Reparaturentwurf
 * (#workflow-reparatur) gar nicht — ihn schließt allein der Mensch. Eine
 * angefangene Pflichtbegründung überlebt damit den Poll; ändert sich dagegen
 * die Frage, zu der sie gehört, wird sie verworfen, statt zur nächsten
 * Entscheidung weitergereicht zu werden.
 *
 * Der Poll macht einen zweiten Race-Fall nötig, den ladeLaufDetail nicht hat:
 * dort löst nur ein Klick einen Ladevorgang aus, hier alle zwei Sekunden der
 * Zeitgeber. Zwei Ticks für DENSELBEN Workflow können sich überholen (der
 * langsamere hängt zusätzlich an ermittleAktiveLaufIds), und ein Vergleich
 * der workflowId allein ließe beide rendern — der ältere Stand landete als
 * letzter im Panel, der Cursor spränge zurück. Deshalb gilt zusätzlich: nur
 * der jüngste Aufruf darf schreiben.
 * @param workflowId - Kennung, aus dem geklickten Details-Button
 * @param scrollen - true beim Öffnen per Klick, false beim Neurendern durch den Poll
 */
async function ladeWorkflowDetail(workflowId, scrollen = true) {
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
    const antwort = await fetch(`/api/workflows/${encodeURIComponent(workflowId)}`)
    if (istUeberholt()) return
    // KEIN 409-Zweig mehr (F-247, F15 WS-3b): der Detailendpunkt hat diesen Status für eine
    // ungültige Fassung nie geschickt — der WS-3a-Zweig war vom echten Server unerreichbar. Seit
    // WS-3b liefert er stattdessen 200 mit dem vollen Datensatz UND dem Feld verstoesse. Der
    // frühere Zweig ist damit nicht gelöscht, sondern auf den realen Fall umgestellt: die
    // Verstöße stehen jetzt über der Ansicht, statt sie zu ersetzen.
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
    // Die Bedienung hängt am selben Ladevorgang wie die Ansicht — und am selben Überholschutz
    // (F-252): ein älterer Tick darf weder die Schrittliste noch die angebotenen Knöpfe
    // zurückschreiben. Ein Knopf, der zu einem überholten Stand gehört, wäre schlimmer als eine
    // veraltete Tabellenzeile: er löst eine Bedienung aus, die es nicht mehr gibt.
    aktualisiereWorkflowBedienung(workflowId, daten.status ?? null, naechster, verstoesse.length > 0)
    const ungueltigBlock = verstoesse.length > 0 ? renderWorkflowUngueltig(verstoesse) : ''
    if (!Array.isArray(daten.schritte) || daten.schritte.length === 0) {
      // Der Kopf wird auch hier gerendert (QA-Pass 10.09.2026): ohne ihn zeigte ausgerechnet der
      // kaputteste Zustand die WENIGSTEN Daten — kein Status, kein Cursor, kein Halt-Grund,
      // obwohl genau die für die Reparatur gebraucht werden.
      inhalt.innerHTML = [
        ungueltigBlock === '' ? renderWorkflowUngueltig(['Die gelieferte Fassung trägt keine lesbare Schrittliste.']) : ungueltigBlock,
        renderWorkflowKopf(daten, detail.versionSequenz, naechster),
      ].join('')
      return
    }
    const geordnet = ordneSchritteNachPlan(daten.schritte)
    const aktiveLaufIds = await ermittleAktiveLaufIds(geordnet)
    if (istUeberholt()) return
    // Überschrift nur dort, wo sie stimmt: erreicht die nachfolger-Kette nicht jeden Schritt,
    // ist die Reihenfolge keine Planreihenfolge (siehe ordneSchritteNachPlan).
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

/**
 * Führt EINE angeklickte Bedienung aus.
 *
 * Jede der vier ruft genau ihren Endpunkt, und der Pfad steht am Aufrufort
 * ausgeschrieben statt in einer Variablen: eine Quelltextprüfung soll sehen
 * können, welcher Knopf welchen Schreibweg benutzt
 * (scripts/check-f15-workflow-oberflaeche.mjs).
 *
 * Die Pflichtbegründungen werden hier NICHT gegen den Server vorgeprüft,
 * sondern nur auf "nicht leer" — dieselbe Bedingung, die der Server stellt
 * (400). Der Sinn ist nicht, ihm die Prüfung abzunehmen, sondern die Ablehnung
 * nicht erst zu provozieren.
 * @param button - der geklickte .wf-aktion-Knopf
 */
async function fuehreWorkflowAktionAus(button) {
  const workflowId = button.dataset.workflowId
  const aktion = button.dataset.aktion
  zeigeBedienungsMeldung(null)

  if (aktion === 'starten') {
    await sendeWorkflowBedienung(`/api/workflows/${encodeURIComponent(workflowId)}/starten`, {}, button, 'Schritt gestartet.')
    return
  }

  if (aktion === 'freigeben' || aktion === 'ablehnen') {
    const begruendung = document.getElementById('wf-freigabe-begruendung').value
    if (begruendung.trim().length === 0) {
      zeigeBedienungsMeldung('Die Begründung ist Pflicht — ohne sie wird die Entscheidung nicht festgehalten.')
      return
    }
    await sendeWorkflowBedienung(
      `/api/workflows/${encodeURIComponent(workflowId)}/freigabe`,
      { schrittId: button.dataset.schrittId, entscheidung: aktion === 'freigeben' ? 'FREIGEGEBEN' : 'ABGELEHNT', begruendung },
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
    await sendeWorkflowBedienung(`/api/workflows/${encodeURIComponent(workflowId)}/stoppen`, { begruendung }, button, 'Stopp festgeschrieben und als Entscheidung festgehalten.')
    return
  }

  if (aktion === 'reparatur') {
    await oeffneReparaturEntwurf(workflowId)
  }
}

/** Klick-Delegation der Workflow-Ansicht (Muster initDetailBedienung) — jeder dieser Container wird als Ganzes neu gerendert, die Zuhörer hängen deshalb am Container und nicht an einzelnen Knöpfen. */
function initWorkflowBedienung() {
  document.getElementById('workflows').addEventListener('click', (ereignis) => {
    const button = ereignis.target.closest('.workflow-details-btn')
    if (!button) return
    ladeWorkflowDetail(button.dataset.workflowId)
  })
  document.getElementById('workflow-detail-inhalt').addEventListener('click', (ereignis) => {
    const button = ereignis.target.closest('.workflow-lauf-verweis')
    if (!button) return
    ladeLaufDetail(button.dataset.laufId)
  })
  document.getElementById('workflow-bedienung').addEventListener('click', (ereignis) => {
    const button = ereignis.target.closest('.wf-aktion')
    if (!button) return
    fuehreWorkflowAktionAus(button)
  })
  // Zuhörer am Container, nicht am Textfeld: der Entwurf entsteht erst beim Klick und wird
  // mehrfach neu gebaut. 'input' steigt auf, die Delegation trägt also.
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
  document.getElementById('workflow-detail-schliessen').addEventListener('click', () => {
    gewaehlteWorkflowId = null
    document.getElementById('workflow-detail').hidden = true
    // Beim Schließen wird auch die Bedienung zurückgesetzt: bliebe das Kennzeichen stehen, zeigte
    // ein später erneut geöffneter Workflow bei gleicher Lage den Block eines anderen Workflows.
    bedienungsKennzeichen = null
    document.getElementById('workflow-bedienung').innerHTML = ''
    zeigeBedienungsMeldung(null)
    verwirfReparaturEntwurf()
  })
}

/** Poll-Tick der Workflow-Ansicht: die Liste immer, das Detail-Panel nur, solange eines offen ist. */
function pollWorkflows() {
  ladeWorkflows()
  if (gewaehlteWorkflowId !== null) ladeWorkflowDetail(gewaehlteWorkflowId, false)
}

const POLL_INTERVALL_MS = 2000

initEvidenzdateien()
initAuftragFormular()
initStartformular()
initWiederaufnahmeBedienung()
initDetailBedienung()
initEntscheidungBedienung()
initAbbrechenBedienung()
initWorkflowBedienung()
laden()
ladeStartfehler()
ladeWorkflows()
ladeAuftraege().then(aktualisiereLaufIdVorschlag)
ladeWerkzeugsaetze()
setInterval(laden, POLL_INTERVALL_MS)
setInterval(ladeStartfehler, POLL_INTERVALL_MS)
setInterval(pollWorkflows, POLL_INTERVALL_MS)
