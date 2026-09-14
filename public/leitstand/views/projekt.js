/**
 * Datei: public/leitstand/views/projekt.js
 *
 * Zweck: View `#/projekt` (F20 WS-1) — der bestehende Abschnitt „Auftrag &
 * Start" aus dem früheren app.js, unverändert in Verhalten: Auftrag anlegen
 * (POST /api/auftraege) und der geführte Start (POST /api/laeufe). Deckt
 * zwei der sechs Bedienflüsse ab, die laut F20 AK1 real unverändert
 * funktionieren müssen (Auftrag anlegen, Lauf starten).
 *
 * Die Wiederaufnahme-VORBELEGUNG lebt hier (wendeWiederaufnahmeAn,
 * exportiert), weil sie das Startformular dieser View befüllt — AUSGELÖST
 * wird sie aber von der Runs-View (der "Wiederaufnahme starten"-Button
 * gehört zur Laufliste dort), die per Router zu `#/projekt` navigiert und
 * anschließend diese Funktion aufruft. Bewusste Kopplung über einen
 * Funktionsexport statt eines Event-Bus — die App hat genau zwei Views, die
 * sich hier berühren, ein Bus wäre eine Abstraktion ohne zweiten Nutzer.
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initProjektView beim Bootstrap)
 * - public/leitstand/views/runs.js (wendeWiederaufnahmeAn, zeigeVorbelegungsFehler)
 *
 * Wichtig: rolle/budget/aufrufEingaben.modell bleiben im Startformular FEST
 * (§13.3-Nicht-Ziel „keine dynamische Rollen-/Modell-/Werkzeugwahl") —
 * unverändert aus dem Vorgänger übernommen, hier nicht neu entschieden.
 */

import { holeAuftraege, holeWerkzeugsaetze, legeAuftragAn, starteLauf } from '../api.js'
import { escapeHtml } from '../render.js'

/** Präfix der synthetischen Kontextpaket-Elemente, die der Server selbst voranstellt (execution-controller/index.ts) — keine vom Nutzer benannten Evidenzdateien, werden bei der Vorbelegung herausgefiltert. */
const ARTEFAKT_PRAEFIX = 'artefakt:'

/** Filtert die echten, vom Nutzer ursprünglich benannten Kontextpaket-Elemente eines Vorgängerlaufs für die Wiederaufnahme-Vorbelegung. @param elemente - detail.kontextpaket.elemente aus GET /api/laeufe/<laufId> @returns Liste repo-relativer Pfade, ohne die artefakt:-Lineage-Referenzen */
function filtereEchteEvidenzPfade(elemente) {
  return elemente.filter((e) => typeof e?.pfad === 'string' && !e.pfad.startsWith(ARTEFAKT_PRAEFIX)).map((e) => e.pfad)
}

/** laufId des Laufs, dessen Wiederaufnahme gerade vorbereitet wird, oder null im Normalstart — geht als vorgaengerLaufId in den nächsten POST /api/laeufe-Body ein, bis loescheWiederaufnahmeVorbelegung() sie zurücksetzt. Bewusst kein editierbares Formularfeld. */
let aktiveVorgaengerLaufId = null

/** @param text - Fehlertext der Vorbelegung, oder '' zum Ausblenden */
export function zeigeVorbelegungsFehler(text) {
  const anzeige = document.getElementById('start-vorbelegung-fehler')
  anzeige.textContent = text
  anzeige.hidden = text === ''
}

/** Setzt die Wiederaufnahme-Sperre — Hinweistext mit der Vorgänger-laufId, Klartext im Startformular statt eines editierbaren Felds. @param alterLaufId - laufId des Laufs, der wiederaufgenommen wird */
function setzeWiederaufnahmeVorbelegung(alterLaufId) {
  aktiveVorgaengerLaufId = alterLaufId
  document.getElementById('start-wiederaufnahme-laufid').textContent = alterLaufId
  document.getElementById('start-wiederaufnahme-hinweis').hidden = false
}

/** Hebt die Wiederaufnahme-Sperre auf — nach "Wiederaufnahme abbrechen" oder einem erfolgreichen Start. */
function loescheWiederaufnahmeVorbelegung() {
  aktiveVorgaengerLaufId = null
  document.getElementById('start-wiederaufnahme-hinweis').hidden = true
}

/** Fügt dem Startformular eine leere Evidenzdatei-Zeile hinzu. */
function fuegeEvidenzdateiZeileHinzu() {
  const zeile = document.createElement('div')
  zeile.className = 'evidenzdatei-zeile'
  zeile.innerHTML = '<input type="text" class="evidenzdatei-pfad" placeholder="repo-relativer Pfad, z. B. src/beispiel.ts" /><button type="button" class="evidenzdatei-entfernen">–</button>'
  document.getElementById('start-evidenzdateien-liste').appendChild(zeile)
}

/** Ersetzt die Evidenzdatei-Zeilen des Startformulars durch die übergebenen Pfade — mindestens eine leere Zeile bleibt bestehen, auch wenn pfade leer ist. @param pfade - repo-relative Pfade, vorbelegt aus filtereEchteEvidenzPfade */
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

/** Nicht-leere, getrimmte Pfade aus den Evidenzdatei-Zeilen des Startformulars. @returns Liste repo-relativer Pfade */
function sammleEvidenzdateien() {
  return Array.from(document.querySelectorAll('.evidenzdatei-pfad'))
    .map((eingabe) => eingabe.value.trim())
    .filter((pfad) => pfad.length > 0)
}

/** Klick-Delegation für die "–"-Buttons (dynamisch hinzugefügte Zeilen). */
function initEvidenzdateien() {
  document.getElementById('start-evidenzdatei-hinzufuegen').addEventListener('click', fuegeEvidenzdateiZeileHinzu)
  document.getElementById('start-evidenzdateien-liste').addEventListener('click', (ereignis) => {
    const button = ereignis.target.closest('.evidenzdatei-entfernen')
    if (!button) return
    button.closest('.evidenzdatei-zeile').remove()
  })
  fuegeEvidenzdateiZeileHinzu()
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

/** Lädt GET /api/auftraege in das Auftrag-Dropdown des Startformulars — Anzeige aus titel/erstellt_am, Wert auftragId. Erhält die vorherige Auswahl über einen Reload hinweg, wenn sie noch existiert. */
async function ladeAuftraege() {
  const select = document.getElementById('start-auftrag')
  const vorherAusgewaehlt = select.value
  try {
    const auftraege = await holeAuftraege()
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

/** Lädt GET /api/startvorlage/werkzeugsaetze in das Werkzeugsatz-Dropdown — die Antwort trägt bereits nur name/modus/erlaubte_werkzeuge (serverseitige Allowlist). */
async function ladeWerkzeugsaetze() {
  const select = document.getElementById('start-werkzeugsatz')
  try {
    const werkzeugsaetze = await holeWerkzeugsaetze()
    select.innerHTML = werkzeugsaetze.map((w) => `<option value="${escapeHtml(w.name)}">${escapeHtml(w.name)} (${escapeHtml(w.erlaubte_werkzeuge.join(', '))})</option>`).join('')
  } catch (fehler) {
    zeigeStartFehler(`Werkzeugsätze konnten nicht geladen werden: ${fehler.message}`)
  }
}

/** Formular „Auftrag anlegen": POST /api/auftraege, danach Dropdown-Reload — neuer Auftrag muss sofort wählbar sein. */
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
        antwort = await legeAuftragAn({ titel: titelFeld.value, auftragstext: auftragstextFeld.value })
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

/** Zuletzt in #start-laufid eingetragener Vorschlagswert — aktualisiereLaufIdVorschlag() überschreibt das Feld nur, wenn es noch diesen Wert (oder leer) trägt, nie eine manuelle Nutzereingabe. */
let letzterLaufIdVorschlag = ''

/** Baut einen laufId-Vorschlag aus dem Titel des gewählten Auftrags plus Zeitstempel — lesbar statt einer UUID, vom Nutzer überschreibbar. @returns Vorschlagswert für #start-laufid */
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
 * Startformular — POST /api/laeufe mit auftragId statt auftragstext.
 * rolle/budget/aufrufEingaben.modell sind im Formular NICHT wählbar — feste
 * Client-Werte statt Nutzerwahl. Serverseitige Ablehnungen (400/409, inkl.
 * D13) werden im Klartext angezeigt, nicht verschluckt.
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
      rolle: 'ausfuehrung',
      anfragen: sammleEvidenzdateien().map((pfad) => ({ pfad, frage: 'Evidenz', begruendung: 'Vom Startformular benannte Evidenzdatei' })),
      budget: {},
      aufrufEingaben: { modell: 'sonnet' },
      werkzeugsatz: document.getElementById('start-werkzeugsatz').value,
      auftragId,
      ...(aktiveVorgaengerLaufId !== null ? { vorgaengerLaufId: aktiveVorgaengerLaufId } : {}),
    }

    zeigeStartErfolg('')
    startenButton.disabled = true
    try {
      let antwort
      try {
        antwort = await starteLauf(startauftrag)
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
      zeigeStartErfolg(`Angenommen: laufId '${angenommen.laufId ?? startauftrag.laufId}'. Erscheint in der Laufliste, sobald der erste Checkpoint geschrieben ist.`)
      document.querySelectorAll('.evidenzdatei-pfad').forEach((eingabe) => {
        eingabe.value = ''
      })
      loescheWiederaufnahmeVorbelegung()
      aktualisiereLaufIdVorschlag()
    } finally {
      startenButton.disabled = false
    }
  })

  document.getElementById('start-wiederaufnahme-abbrechen').addEventListener('click', loescheWiederaufnahmeVorbelegung)
}

/**
 * Wendet die Wiederaufnahme-Vorbelegung auf das Startformular an — aufgerufen
 * von der Runs-View, nachdem sie GET /api/laeufe/<laufId> geladen und zu
 * `#/projekt` navigiert hat (AK1: Wiederaufnahme bleibt real unverändert).
 * werkzeugsatz bleibt bewusst unverändert (F-161, nirgends rekonstruierbar).
 * @param detail - Antwortkörper von GET /api/laeufe/<laufId>
 * @param alterLaufId - laufId des wiederaufzunehmenden Laufs
 */
export async function wendeWiederaufnahmeAn(detail, alterLaufId) {
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
}

/** Initialisiert die Projekt-View einmalig beim Bootstrap. */
export function initProjektView() {
  initEvidenzdateien()
  initAuftragFormular()
  initStartformular()
  ladeAuftraege().then(aktualisiereLaufIdVorschlag)
  ladeWerkzeugsaetze()
}
