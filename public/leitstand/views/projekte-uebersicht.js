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
 * F41 WS-2: "+ Neues Projekt" öffnet ein Formular (id/name/zielordner) und
 * ruft POST /api/projekte (F41 WS-1-Backend, legeProjektAn in api.js) — der
 * erste echte Schreibpfad dieser View. 400/409/422 zeigen den Grund aus der
 * Antwort im Klartext (Muster views/projekt.js initAuftragFormular), der
 * Knopf ist während der Anfrage deaktiviert (D13). Erfolg (201) lädt die
 * Liste per ladeProjekte() neu (kein Seiten-Reload) und zeigt eine
 * "Nächste Schritte"-Box mit den Git-Befehlen aus naechste_schritte als
 * reinem Textblock (Muster views/workboard.js renderTerminalBlock — der
 * Kern führt kein Git aus, AK4f) sowie einen Sprung ins Coach-Interview
 * (views/chat.js wechsleZuSparringProjekt, Modus Sparring/Projekt).
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initProjekteUebersichtView beim Bootstrap)
 * - public/leitstand/shell.js (oeffneAnlegenFormularAusKopf — „+“ neben der Projektauswahl im Kopf,
 *   F44 WS-1b, F-862)
 *
 * Wichtig: der Kartenklick ändert weiterhin nur Client-Zustand
 * (api.js-Präfix, Muster views/capabilities.js Library/Coverage-Teil) —
 * der einzige Server-Schreibpfad ist das Anlegen-Formular (F41 WS-2).
 *
 * F29 WS-2a: reine Stylingumstellung auf das Komponentenvokabular aus
 * views/workboard.js (WS-1b) — Karten-Divs wurden zu .list-row-Zeilen in
 * EINER .card (index.html), "Öffnen" ist jetzt .btn.btn-primary statt
 * eines ungestylten <button>. Klick-Verhalten und Datenbedarf unverändert.
 *
 * F29 WS-D2 (Auftrag Punkt D): je Projekt jetzt eine eigene Karte im Stil
 * des Fokus-Panels (views/workboard.js bentoFokusKarte — Icon, ID-Chip,
 * Status-Pille, Meta-Kacheln) statt einer .list-row-Zeile. repo_pfad ist
 * TEIL der bereits geladenen GET /api/projekte-Antwort (scripts/leitstand-
 * server.mjs spreadet den vollen Registereintrag, kein neuer Endpunkt) —
 * "letzter Lauf" bleibt bewusst WEG: es gibt keinen billigen, bereits
 * geladenen Zeitpunkt dafür (nur laufAktiv als Bool), ein Zeitpunkt bräuchte
 * einen zusätzlichen Abruf JE Projektkarte (Auftrag: "sofern Daten
 * vorhanden" — hier nicht der Fall), siehe Bericht.
 *
 * F43 (Projekt aufrufen/anzeigen): je Karte ein Block „Vorschau & Aufruf“ — nach dem Rendern
 * einzeln über GET /api/projekte/<id>/projekt-aufruf gefüllt (projekt-aufruf-anzeige.js), damit
 * eine langsame Vorschauprüfung (≤ 2 s) die Liste nicht aufhält. „Aufrufen“ ist ein zweiter
 * Server-Schreibpfad: nur auf Klick, danach wird der Block frisch vom Server geladen (der Server
 * hält den letzten Aufruf). Meldet der Server aktiv (Aufruf läuft, z. B. nach F5 oder aus einem
 * zweiten Tab gestartet), lädt der Block alle AKTIV_NACHLADEN_MS nach, bis der Aufruf endet — so
 * bleibt kein Knopf dauerhaft auf „Läuft…“.
 */

import { holeProjekte, holeProjektAufruf, legeProjektAn, rufeProjektAuf } from '../api.js'
import { renderAufrufBereich, renderVorschau } from '../projekt-aufruf-anzeige.js'
import { holeAktivesProjekt, ladeProjektAuswahl, setzeAktivesProjekt } from '../projekt-kontext.js'
import { escapeHtml } from '../render.js'
import { navigiere, registriere } from '../router.js'
import { merkeGeoeffnet } from '../zuletzt-geoeffnet.js'
import { wechsleZuSparringProjekt } from './chat.js'

const ICON_PROJEKT = '<svg viewBox="0 0 24 24" focusable="false"><path d="M4 6.5h6l1.6 2H20v9H4v-11Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" /></svg>'
const ICON_PFAD = '<svg viewBox="0 0 24 24" focusable="false"><path d="M4 12h16M4 6h16M4 18h10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>'
const ICON_PHASE = '<svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6" /><path d="M12 7v5l3.5 2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>'
const ICON_LAUF = '<svg viewBox="0 0 24 24" focusable="false"><path d="M8 5l11 7-11 7V5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" /></svg>'

/** Kürzt einen Pfad auf die letzten zwei Segmente ("…/ordner/datei") für die Meta-Kachel — der volle Pfad bleibt im title-Attribut erreichbar. @param pfad - repo_pfad @returns gekürzte Anzeige */
function kuerzePfad(pfad) {
  const teile = pfad.replaceAll('\\', '/').split('/').filter((t) => t.length > 0)
  return teile.length <= 2 ? pfad : `…/${teile.slice(-2).join('/')}`
}

function metaKachel(icon, label, wert, titel) {
  const titelAttribut = titel ? ` title="${escapeHtml(titel)}"` : ''
  return `<div class="bento-meta-kachel"${titelAttribut}><span class="bento-meta-icon" aria-hidden="true">${icon}</span><div><p class="bento-meta-label">${label}</p><p class="bento-meta-wert">${wert}</p></div></div>`
}

function projektKarte(projekt, aktivesProjektId) {
  const istAktiv = projekt.id === aktivesProjektId
  const aktionHtml = istAktiv
    ? '<span class="badge aktiv">Aktiv</span>'
    : `<button type="button" class="btn btn-primary projekt-waehlen" data-id="${escapeHtml(projekt.id)}" data-name="${escapeHtml(projekt.name)}" data-status-kategorie="${projekt.laufAktiv ? 'aktiv' : 'neutral'}">Öffnen</button>`
  return `<div class="card projekte-karte${istAktiv ? ' projekte-karte-aktiv' : ''}">
    <div class="projekte-karte-kopf">
      <span class="bento-fokus-icon" aria-hidden="true">${ICON_PROJEKT}</span>
      <div class="projekte-karte-kopf-text">
        <div class="bento-fokus-zeile1">
          <span class="badge bento-id-chip">${escapeHtml(projekt.id)}</span>
          <span class="badge aktiv">${escapeHtml(projekt.status)}</span>
        </div>
        <p class="bento-fokus-titel">${escapeHtml(projekt.name)}</p>
      </div>
      <div class="projekte-karte-aktion">${aktionHtml}</div>
    </div>
    <div class="bento-meta-zeile">
      ${metaKachel(ICON_PFAD, 'Pfad', escapeHtml(kuerzePfad(projekt.repo_pfad)), projekt.repo_pfad)}
      ${metaKachel(ICON_PHASE, 'Phase', escapeHtml(projekt.status))}
      ${metaKachel(ICON_LAUF, 'Aktiver Lauf', projekt.laufAktiv ? 'Ja' : 'Nein')}
    </div>
    <div class="projekt-aufruf" data-aufruf-id="${escapeHtml(projekt.id)}">
      <h3>Vorschau &amp; Aufruf</h3>
      <div class="projekt-aufruf-vorschau">${renderVorschau(null)}</div>
      <div class="projekt-aufruf-bereich"></div>
    </div>
  </div>`
}

async function ladeProjekte() {
  const container = document.getElementById('projekte-uebersicht-liste')
  container.innerHTML = '<p class="leer">Lädt…</p>'
  try {
    const daten = await holeProjekte()
    const aktivesProjektId = holeAktivesProjekt().id
    container.innerHTML = daten.projekte.length === 0 ? '<p class="leer">Keine Projekte registriert.</p>' : daten.projekte.map((p) => projektKarte(p, aktivesProjektId)).join('')
    for (const p of daten.projekte) void ladeAufrufBlock(p.id)
  } catch (fehler) {
    container.innerHTML = `<p class="fehler">Anfrage fehlgeschlagen: ${escapeHtml(fehler.message)}</p>`
  }
}

/** F43: Abstand des Nachladens, solange ein Aufruf läuft (jeder GET prüft auch die Vorschau, ≤ 2 s). */
const AKTIV_NACHLADEN_MS = 3000

/** F43: je Projekt-id höchstens EINE Nachlade-Kette (Delta-Review) — Neu laden/Routeneintritt ersetzt den Timer statt eine weitere Kette zu starten. */
const nachladeTimer = new Map()

/** @param id - Projekt-id @returns der aktuell gerenderte Block „Vorschau & Aufruf“ oder null */
function findeAufrufBlock(id) {
  return document.getElementById('projekte-uebersicht-liste').querySelector(`.projekt-aufruf[data-aufruf-id="${CSS.escape(id)}"]`)
}

/**
 * F43: füllt den Block „Vorschau & Aufruf“ einer Karte frisch vom Server.
 * @param id - Projekt-id
 * @param fehlerText - Ablehnungsgrund des vorherigen Aufrufs ('' = keiner), nach dem Neurendern angezeigt
 */
async function ladeAufrufBlock(id, fehlerText = '') {
  let daten
  try {
    daten = await holeProjektAufruf(id)
  } catch (fehler) {
    const block = findeAufrufBlock(id)
    if (block === null) return
    block.querySelector('.projekt-aufruf-vorschau').innerHTML = ''
    // QA-Befund: ein registriertes Projekt, dessen Handler beim Serverstart nicht gebaut werden
    // konnte (z. B. startbefehl mit .cmd), antwortet 404 „Unbekanntes Projekt“ — hier klarer benennen.
    const grund = fehler.message.startsWith('404') ? 'Projekt beim Serverstart nicht initialisiert (z. B. ungültige Startvorlage) — Grund steht in der Konsole des Leitstands' : fehler.message
    block.querySelector('.projekt-aufruf-bereich').innerHTML = `<p class="fehler">Vorschau & Aufruf nicht ladbar: ${escapeHtml(grund)}</p>`
    return
  }
  const block = findeAufrufBlock(id)
  if (block === null) return
  block.querySelector('.projekt-aufruf-vorschau').innerHTML = renderVorschau(daten.vorschau)
  block.querySelector('.projekt-aufruf-bereich').innerHTML = renderAufrufBereich(daten, id)
  const fehlerAnzeige = block.querySelector('.projekt-aufruf-fehler')
  if (fehlerAnzeige !== null && fehlerText !== '') {
    fehlerAnzeige.textContent = fehlerText
    fehlerAnzeige.hidden = false
  }
  clearTimeout(nachladeTimer.get(id))
  nachladeTimer.delete(id)
  // Ablehnungsgrund (z. B. 409 aus einem zweiten Tab) bleibt über das Nachladen hinweg stehen.
  if (daten.aktiv) nachladeTimer.set(id, setTimeout(() => void ladeAufrufBlock(id, fehlerText), AKTIV_NACHLADEN_MS))
}

/** F43: Klick auf „Aufrufen“ — POST, danach Block neu laden; 409 (Aufruf/Lauf aktiv) u. a. im Klartext. @param button - der geklickte Knopf */
async function rufeAuf(button) {
  const id = button.dataset.id
  button.disabled = true
  button.textContent = 'Läuft…'
  let fehlerText = ''
  try {
    const antwort = await rufeProjektAuf(id)
    if (antwort.status !== 200) {
      const koerper = await antwort.json().catch(() => ({}))
      fehlerText = `${antwort.status}: ${koerper.grund ?? 'unbekannter Fehler'}`
    }
  } catch (fehler) {
    fehlerText = `Anfrage fehlgeschlagen: ${fehler.message}`
  }
  await ladeAufrufBlock(id, fehlerText)
}

function initBedienung() {
  document.getElementById('projekte-uebersicht-liste').addEventListener('click', (ereignis) => {
    const aufrufButton = ereignis.target.closest('.projekt-aufrufen')
    if (aufrufButton !== null) {
      if (!aufrufButton.disabled) void rufeAuf(aufrufButton)
      return
    }
    const button = ereignis.target.closest('.projekt-waehlen')
    if (button === null) return
    setzeAktivesProjekt({ id: button.dataset.id, name: button.dataset.name })
    // F29 WS-D2 (Auftrag Punkt B): merkt den Öffnen-Klick für „Zuletzt geöffnet“ in der Sidebar (zuletzt-geoeffnet.js).
    merkeGeoeffnet({ typ: 'projekt', id: button.dataset.id, label: button.dataset.name, hash: '#/dashboard', statusKategorie: button.dataset.statusKategorie })
    navigiere('#/dashboard')
  })
  document.getElementById('projekte-uebersicht-neu-laden').addEventListener('click', () => {
    void ladeProjekte()
  })
}

function zeigeAnlegenFehler(text) {
  const anzeige = document.getElementById('projekte-anlegen-fehler')
  anzeige.textContent = text
  anzeige.hidden = text === ''
}

/** Blendet das Anlegen-Formular ein/aus. Beim Öffnen: geleert und die vorherige Erfolgsbox verborgen — ein zweites "+ Neues Projekt" fängt immer frisch an. */
function zeigeAnlegenFormular(sichtbar) {
  const formular = document.getElementById('projekte-anlegen-formular')
  formular.hidden = !sichtbar
  if (!sichtbar) return
  document.getElementById('projekte-anlegen-id').value = ''
  document.getElementById('projekte-anlegen-name').value = ''
  document.getElementById('projekte-anlegen-zielordner').value = ''
  document.getElementById('projekte-anlegen-zielordner-details').open = false
  zeigeAnlegenFehler('')
  document.getElementById('projekte-anlegen-erfolg').hidden = true
  document.getElementById('projekte-anlegen-id').focus()
}

/** Das zuletzt erfolgreich angelegte Projekt ({ id, name }) — trägt den "Zum Coach-Interview"-Sprung, ohne ein zweites Mal aus dem DOM gelesen werden zu müssen. Null vor dem ersten Erfolg dieser Sitzung. */
let letztesAngelegtesProjekt = null

/** Zeigt die "Nächste Schritte"-Box nach 201 — Git-Befehle, Hinweis und (F42 WS-1, QA-Befund: naechsteSchritte.trust wurde server-seitig berechnet, aber nie gerendert — E-PH-1 "meldet ihn" blieb dadurch nur eine API-Zusage) der Workspace-Trust-Hinweis, alle als reiner Text (textContent, kein escapeHtml nötig, Muster views/workboard.js renderTerminalBlock: der Kern führt nichts davon aus). @param projekt - { id, name, ... } aus der 201-Antwort @param naechsteSchritte - { git: string[], hinweis: string, trust?: { status, pfad, hinweis: string|null } } */
function zeigeAnlegenErfolg(projekt, naechsteSchritte) {
  letztesAngelegtesProjekt = { id: projekt.id, name: projekt.name }
  document.getElementById('projekte-anlegen-erfolg-hinweis').textContent = naechsteSchritte.hinweis
  document.getElementById('projekte-anlegen-git-befehle').textContent = naechsteSchritte.git.join('\n')
  // trust ist optional (ältere/unerwartete Serverantwort, AK4f-Muster oben) — kein Wurf, nur kein Hinweis.
  const trustHinweis = naechsteSchritte.trust?.hinweis ?? null
  const trustElement = document.getElementById('projekte-anlegen-erfolg-trust')
  trustElement.textContent = trustHinweis ?? ''
  trustElement.hidden = trustHinweis === null
  document.getElementById('projekte-anlegen-formular').hidden = true
  document.getElementById('projekte-anlegen-erfolg').hidden = false
}

/** Blendet Formular UND Erfolg-Box aus, ohne Felder anzufassen — QA-Befund (real reproduziert): ein erneutes Betreten der Route nach einem Erfolg (registriere-onEnter unten) ließ die "Nächste Schritte"-Box eines LÄNGST verlassenen Anlege-Vorgangs unverändert stehen. */
function versteckeAnlegenZustand() {
  document.getElementById('projekte-anlegen-formular').hidden = true
  document.getElementById('projekte-anlegen-erfolg').hidden = true
}

/** Formular "Neues Projekt anlegen": POST /api/projekte (F41 WS-1), Erfolg lädt die Liste neu und zeigt die Git-Befehle. Serverseitige Ablehnungen (400/409/422, inkl. D13) werden im Klartext angezeigt (Muster views/projekt.js initAuftragFormular). */
function initAnlegenFormular() {
  const oeffnenButton = document.getElementById('projekte-anlegen-oeffnen')
  const abbrechenButton = document.getElementById('projekte-anlegen-abbrechen')
  const absendenButton = document.getElementById('projekte-anlegen-absenden')

  oeffnenButton.addEventListener('click', () => zeigeAnlegenFormular(true))
  abbrechenButton.addEventListener('click', () => {
    zeigeAnlegenFormular(false)
    oeffnenButton.focus()
  })

  absendenButton.addEventListener('click', async () => {
    if (absendenButton.disabled) return
    const id = document.getElementById('projekte-anlegen-id').value.trim()
    const name = document.getElementById('projekte-anlegen-name').value.trim()
    const zielordner = document.getElementById('projekte-anlegen-zielordner').value.trim()
    zeigeAnlegenFehler('')
    if (id === '' || name === '') {
      zeigeAnlegenFehler('Bitte id und Name ausfüllen.')
      return
    }

    const koerper = zielordner === '' ? { id, name } : { id, name, zielordner }
    // QA-Befund (real reproduziert): "Abbrechen" blieb während der Anfrage bedienbar — ein Klick
    // versteckte das Formular, eine DANACH eintreffende Antwort schrieb trotzdem noch in die (jetzt
    // unsichtbare) Fehleranzeige bzw. ließ die Erfolgsbox nach einem bewussten Abbruch unangekündigt
    // wieder aufpoppen. "+ Neues Projekt" blieb aus demselben Grund gesperrt — ein Reset der Felder
    // MITTEN in der ausstehenden Anfrage hätte dieselbe Race in die andere Richtung geöffnet (eine
    // verspätete Antwort des ERSTEN Versuchs hätte über die frisch eingetragenen Werte des ZWEITEN
    // geschrieben). Alle drei Knöpfe bleiben deshalb für die Dauer der Anfrage gemeinsam gesperrt.
    absendenButton.disabled = true
    abbrechenButton.disabled = true
    oeffnenButton.disabled = true
    try {
      let antwort
      try {
        antwort = await legeProjektAn(koerper)
      } catch (fehler) {
        zeigeAnlegenFehler(`Anfrage fehlgeschlagen: ${fehler.message}`)
        return
      }
      const rumpf = await antwort.json().catch(() => ({}))
      if (antwort.status !== 201) {
        zeigeAnlegenFehler(`${antwort.status}: ${rumpf.grund ?? 'unbekannter Fehler'}`)
        return
      }
      // Code-Review-Befund: rumpf.projekt/naechste_schritte ungeprüft an zeigeAnlegenErfolg
      // durchzureichen ließ einen unerwartet geformten 201-Rumpf als ungefangenen Wurf (TypeError)
      // enden — kein Fehlertext, kein Erfolg, nur ein disabled-Button, der über 'finally' wieder
      // freigegeben wurde. Ein 201 ohne beide Felder ist ein Vertragsbruch der Route (AK4f), kein
      // Fachergebnis — als Fehler anzeigen statt zu werfen.
      if (rumpf.projekt?.id === undefined || rumpf.naechste_schritte === undefined) {
        zeigeAnlegenFehler('201: Antwort ohne projekt/naechste_schritte — unerwartetes Serververhalten.')
        return
      }
      zeigeAnlegenErfolg(rumpf.projekt, rumpf.naechste_schritte)
      // F44 WS-1b: die Projektauswahl im Kopf kennt das neue Projekt erst nach einem neuen Abruf.
      void ladeProjektAuswahl()
      await ladeProjekte()
    } finally {
      absendenButton.disabled = false
      abbrechenButton.disabled = false
      oeffnenButton.disabled = false
    }
  })

  document.getElementById('projekte-anlegen-erfolg-schliessen').addEventListener('click', () => {
    document.getElementById('projekte-anlegen-erfolg').hidden = true
    oeffnenButton.focus()
  })

  // F41 WS-2 (AK, "Zum Coach-Interview"): wechselt den Workspace auf das neu angelegte Projekt
  // (setzeAktivesProjekt, Muster Kartenklick oben) und springt in Sparring/Modus "projekt"
  // (views/chat.js wechsleZuSparringProjekt) — navigiere('#/chat') öffnet dabei zusätzlich die
  // Chat-Spalte auch unter 1280px (shell.js beiRoutenwechsel erzwingt sie auf '#/chat' offen).
  document.getElementById('projekte-anlegen-coach').addEventListener('click', () => {
    if (letztesAngelegtesProjekt === null) return
    setzeAktivesProjekt(letztesAngelegtesProjekt)
    // Code-Review-Befund: hash muss das tatsächliche navigiere()-Ziel dieses Klicks sein
    // (zuletzt-geoeffnet.js-Vertrag, "hash ist das Navigationsziel") — '#/dashboard' war vom
    // Kartenklick-Handler oben kopiert, ohne für dieses Ziel ('#/chat') angepasst zu werden. Ein
    // späterer Klick auf den Schnellzugriff-Eintrag wäre sonst auf dem Dashboard statt im
    // Coach-Interview gelandet.
    merkeGeoeffnet({ typ: 'projekt', id: letztesAngelegtesProjekt.id, label: letztesAngelegtesProjekt.name, hash: '#/chat', statusKategorie: 'neutral' })
    wechsleZuSparringProjekt()
    navigiere('#/chat')
  })
}

/**
 * F44 WS-1b (F-862): „+“ im Kopf — navigiert zur Projekte-Übersicht und öffnet dort das bestehende
 * Anlegeformular (F41). navigiere() dispatcht synchron; der Routen-Eintritt blendet das Formular
 * zuerst aus (versteckeAnlegenZustand), erst danach wird es geöffnet. Läuft gerade eine
 * Anlege-Anfrage („+ Neues Projekt“ ist dann gesperrt), bleibt es beim Navigieren — ein Reset der
 * Felder mitten in der Anfrage öffnete dieselbe Race wie in initAnlegenFormular beschrieben.
 */
export function oeffneAnlegenFormularAusKopf() {
  const anlageLaeuft = document.getElementById('projekte-anlegen-oeffnen').disabled
  // Schon hier und eine Anlage läuft: nichts tun — der Routen-Eintritt blendete das laufende
  // Formular samt späterer Fehlerantwort aus (code-reviewer/qa WS-1b).
  if (anlageLaeuft && location.hash === '#/projekte-uebersicht') return
  navigiere('#/projekte-uebersicht')
  if (anlageLaeuft) return
  zeigeAnlegenFormular(true)
}

/** Initialisiert die Projekte-Übersicht einmalig beim Bootstrap (Muster views/capabilities.js initCapabilitiesView) — registriert ihre Route selbst (Muster views/workboard.js), weil sie beim Eintritt einen echten Abruf braucht. */
export function initProjekteUebersichtView() {
  initBedienung()
  initAnlegenFormular()
  registriere(/^#\/projekte-uebersicht$/, 'projekte-uebersicht', () => {
    versteckeAnlegenZustand()
    void ladeProjekte()
  })
}
