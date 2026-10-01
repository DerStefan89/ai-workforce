/**
 * Datei: public/leitstand/views/projekte-uebersicht.js
 *
 * Zweck: Seite „Alle Produkte“ `#/projekte-uebersicht` und Unterseite „Neues Produkt“
 * `#/projekte-uebersicht/neu` (F44 WS-6a, Vorlage V10 d_projekte und d_projekt_neu, Abgleich F-725
 * H1–H7). Beide liegen im selben View-Container, damit die Navigation „Alle Produkte“ markiert bleibt.
 *
 * Übersicht: Karten je Registereintrag aus GET /api/projekte — Icon, Statuschip, Name, Ziel
 * (roadmap.vision), Ring „Erfasste Einträge abgenommen“ (alle Features aller Meilensteine), drei Werte
 * (Entscheidungen, abgenommen, gerade aktiv), „Weiterarbeiten →“ und ein Hinweis. Die Liste steht
 * sofort; die Zähler lädt jede Karte danach einzeln mit EXPLIZITER id (GET …/<id>/roadmap,
 * …/<id>/zustand, …/<id>/workitems?status=OFFEN; F-945). Jeder Teil scheitert für sich zu „—“ mit
 * dem Grund im title. Späte Antworten der Zähler nach „Neu laden“ oder erneutem Betreten schreiben
 * nicht in die neu gerenderte Karte (renderStand); der F43-Block behält sein bisheriges Verhalten
 * (findeAufrufBlock ohne Stand, unverändert aus F43), ebenso der Kurzstand, der aus derselben Antwort kommt.
 *
 * „Weiterarbeiten →“ hat das Verhalten des früheren „Öffnen“ (F25 AK13): aktives Projekt setzen
 * (api.js-Präfix), für „Zuletzt geöffnet“ merken, nach `#/dashboard`. Beim bereits aktiven Projekt
 * entfällt nur das erneute setzeAktivesProjekt — es würde die Abonnenten des Projektwechsels (F-860,
 * u. a. einen laufenden Chat) ohne Wechsel zurücksetzen.
 *
 * F43 und F-849 (Sicherheitsgrenze, Abgleich §5.3 Punkt 6): je Karte die Klappe
 * „Vorschau & Aufruf · Technik“ mit ID, vollem repo_pfad, rohem Serverstatus, H7 „Produkt
 * bearbeiten“ als „kommt“ und dem unveränderten Block „Vorschau & Aufruf“ (projekt-aufruf-anzeige.js,
 * GET/POST /api/projekte/<id>/projekt-aufruf, Nachladen solange aktiv). Ein Öffnen-Link entsteht nur
 * in renderVorschau; die Zusammenfassung zeigt den Vorschau-Kurzstand (vorschauKurzstand).
 *
 * Neues Produkt (F41): Pflicht ist nur der Name; die ID wird aus ihm abgeleitet (leiteProjektIdAb),
 * solange sie nicht von Hand geändert wurde, und steht mit dem Zielordner in „Projektordner ·
 * optional“. Ziel und Zielgruppe sind „kommt“ (kein Speicherort, E-F44-1 = B). POST /api/projekte mit
 * { id, name[, zielordner] }; 400/409/422 zeigen Status und grund roh; während der Anfrage sind
 * „Produkt anlegen“, „Abbrechen“ und „+ Neues Produkt“ gemeinsam gesperrt. Erfolg zeigt auf der
 * Unterseite die „Nächsten Schritte“ (Git-Befehle als reiner Text, Trust-Hinweis, „Zum
 * Coach-Interview“) und lädt die Projektauswahl im Kopf neu. Betreten der Unterseite setzt Formular
 * und Box zurück, außer eine Anlage läuft; ein Projektwechsel setzt nichts zurück.
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initProjekteUebersichtView beim Bootstrap)
 * - public/leitstand/shell.js (oeffneAnlegenFormularAusKopf — „+“ neben der Projektauswahl im Kopf,
 *   F44 WS-1b, F-862)
 *
 * Wichtig: projekt-aufruf-anzeige.js bleibt unverändert und deutsch (f43 prüft dessen Ausgabe);
 * Projektdaten (Name, vision, Pfad, Status, grund) bleiben roh und werden nur escaped.
 */

import { holeProjekte, holeProjektAufruf, holeProjektOffeneWorkitems, holeProjektRoadmap, holeProjektZustand, legeProjektAn, rufeProjektAuf } from '../api.js'
import { ring } from '../fortschritt-ring.js'
import { formatiereZahl, t, tHtml } from '../i18n.js'
import { kommtKnopf } from '../kommt.js'
import { entscheidungsKennzahl, kartenLage, leiteProjektIdAb, roadmapKennzahlen, vorschauKurzstand } from '../produkte-anzeige.js'
import { renderAufrufBereich, renderVorschau } from '../projekt-aufruf-anzeige.js'
import { abonniereProjektWechsel, holeAktivesProjekt, ladeProjektAuswahl, setzeAktivesProjekt } from '../projekt-kontext.js'
import { escapeHtml } from '../render.js'
import { navigiere, registriere } from '../router.js'
import { merkeGeoeffnet } from '../zuletzt-geoeffnet.js'
import { wechsleZuSparringProjekt } from './chat.js'

/** Route der Übersicht und der Unterseite „Neues Produkt“. */
const LISTE_HASH = '#/projekte-uebersicht'
const NEU_HASH = '#/projekte-uebersicht/neu'

const ICON_PROJEKT = '<svg viewBox="0 0 24 24" focusable="false"><path d="M4 6.5h6l1.6 2H20v9H4v-11Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" /></svg>'

/** Zähler für das Rendern der Liste — eine Antwort aus einem älteren Stand schreibt nicht mehr. */
let renderStand = 0

/**
 * Text „Nicht ladbar: <Grund>“; ohne Servergrund ein allgemeiner Text.
 * @param grund - Rohtext ('' = kein Servergrund)
 * @returns Text (roh)
 */
function nichtLadbarText(grund) {
  return t('produkte.nichtLadbar', { grund: grund === '' ? t('produkte.grundUnbekannt') : grund })
}

/**
 * Wert „—“ mit dem Grund im title (Zähler nicht ladbar).
 * @param grund - Rohtext ('' = kein Servergrund)
 * @returns HTML
 */
function strichMitGrund(grund) {
  const text = nichtLadbarText(grund)
  return `<span title="${escapeHtml(text)}">—</span><span class="sr-only">${escapeHtml(text)}</span>`
}

/**
 * Ring „Erfasste Einträge abgenommen“ mit zugänglichem Namen.
 * @param abgenommen - Zähler
 * @param gesamt - Nenner
 * @returns HTML
 */
function produktRing(abgenommen, gesamt) {
  return ring(abgenommen, gesamt, { label: t('produkte.ring.label', { abgenommen: formatiereZahl(abgenommen), gesamt: formatiereZahl(gesamt) }) })
}

/**
 * CSS-Klassen der Statuszeile einer Karte.
 * @param chipKlasse - aus kartenLage ('' = Standardfarbe)
 * @returns Klassenliste
 */
function chipKlassen(chipKlasse) {
  return `ablauf-status produkt-lage${chipKlasse === '' ? '' : ` ${chipKlasse}`}`
}

/**
 * Statuschip und Hinweis einer Karte setzen (data-lage am Artikel, Text und Klasse).
 * @param karte - .produkt-karte
 * @param entscheidungen - Anzahl oder null/undefined
 */
function setzeLage(karte, entscheidungen) {
  const { lage, chipKlasse } = kartenLage(entscheidungen, karte.dataset.laufAktiv === 'true')
  const chip = karte.querySelector('[data-teil="lage"]')
  chip.className = chipKlassen(chipKlasse)
  chip.textContent = t(`produkte.lage.${lage}`)
  karte.querySelector('[data-teil="hinweis"]').textContent = t(`produkte.hinweis.${lage}`)
}

/**
 * Eine Produktkarte (d_projekte). Zähler stehen zunächst auf „lädt“.
 * @param projekt - Eintrag aus GET /api/projekte ({ id, name, status, repo_pfad, laufAktiv })
 * @param aktivesProjektId - id des aktiven Projekts
 * @returns HTML
 */
function produktKarte(projekt, aktivesProjektId) {
  const istAktiv = projekt.id === aktivesProjektId
  const { lage, chipKlasse } = kartenLage(undefined, projekt.laufAktiv)
  const laedt = `<span title="${escapeHtml(t('produkte.laedt'))}">…</span>`
  return `<article class="produkt-karte${istAktiv ? ' aktiv' : ''}" data-produkt-id="${escapeHtml(projekt.id)}" data-lauf-aktiv="${projekt.laufAktiv === true}" aria-labelledby="produkt-name-${escapeHtml(projekt.id)}">
    <div class="produkt-karte-kopf">
      <span class="produkt-icon" aria-hidden="true">${ICON_PROJEKT}</span>
      <span class="${chipKlassen(chipKlasse)}" data-teil="lage">${tHtml(`produkte.lage.${lage}`)}</span>
    </div>
    <div class="produkt-karte-titel">
      <div class="produkt-karte-titel-text">
        <h2 id="produkt-name-${escapeHtml(projekt.id)}">${escapeHtml(projekt.name)}</h2>
        <p class="produkt-karte-aktiv-marke"${istAktiv ? '' : ' hidden'}>${tHtml('produkte.aktivesProdukt')}</p>
        <p class="produkt-scope">${tHtml('produkte.ring.titel')}</p>
      </div>
      <div class="produkt-ring" data-teil="ring">${ring(0, 0, { unbekannt: true, label: t('produkte.laedt') })}</div>
    </div>
    <p class="produkt-ziel" data-teil="ziel">${laedt}</p>
    <div class="produkt-kennzahlen">
      <span><strong data-teil="entscheidungen">${laedt}</strong>${tHtml('produkte.wert.entscheidungen')}</span>
      <span><strong data-teil="abgenommen">${laedt}</strong>${tHtml('produkte.wert.abgenommen')}</span>
      <span><strong>${projekt.laufAktiv === true ? tHtml('produkte.wert.aktivJa') : `<span aria-hidden="true">—</span><span class="sr-only">${tHtml('produkte.wert.aktivNein')}</span>`}</strong>${tHtml('produkte.wert.geradeAktiv')}</span>
    </div>
    <div class="produkt-karte-fuss">
      <button type="button" class="button primary projekt-waehlen" data-id="${escapeHtml(projekt.id)}" data-name="${escapeHtml(projekt.name)}" data-status-kategorie="${projekt.laufAktiv ? 'aktiv' : 'neutral'}">${tHtml('produkte.weiterarbeiten')} <span aria-hidden="true">→</span></button>
      <span class="produkt-hinweis" data-teil="hinweis">${tHtml(`produkte.hinweis.${lage}`)}</span>
    </div>
    <details class="projekt-technik">
      <summary>${tHtml('produkte.technik.titel')} · <span data-teil="vorschau-kurz">${tHtml('produkte.vorschau.laedt')}</span></summary>
      <dl class="projekt-technik-daten">
        <dt>${tHtml('produkte.technik.id')}</dt><dd><code>${escapeHtml(projekt.id)}</code></dd>
        <dt>${tHtml('produkte.technik.pfad')}</dt><dd><code>${escapeHtml(projekt.repo_pfad ?? '')}</code></dd>
        <dt>${tHtml('produkte.technik.status')}</dt><dd><code>${escapeHtml(projekt.status ?? '')}</code></dd>
      </dl>
      <div class="projekt-technik-bearbeiten">${kommtKnopf(t('produkte.bearbeiten'))}</div>
      <div class="projekt-aufruf" data-aufruf-id="${escapeHtml(projekt.id)}">
        <h3>${tHtml('produkte.aufruf.titel')}</h3>
        <div class="projekt-aufruf-vorschau">${renderVorschau(null)}</div>
        <div class="projekt-aufruf-bereich"></div>
      </div>
    </details>
  </article>`
}

/**
 * Die Karte eines Projekts im AKTUELLEN Render-Stand, sonst null (Liste inzwischen neu gerendert).
 * @param id - Projekt-id
 * @param stand - Render-Stand beim Start des Abrufs
 * @returns .produkt-karte oder null
 */
function findeKarte(id, stand) {
  if (stand !== renderStand) return null
  return document.getElementById('projekte-uebersicht-liste').querySelector(`.produkt-karte[data-produkt-id="${CSS.escape(id)}"]`)
}

/**
 * Text eines Wurfs für den title.
 * @param fehler - gefangener Wert
 * @returns Rohtext
 */
function wurfText(fehler) {
  return fehler instanceof Error ? fehler.message : String(fehler)
}

/**
 * Ziel, Ring und „abgenommen“ einer Karte aus GET …/<id>/roadmap.
 * @param id - Projekt-id
 * @param stand - Render-Stand
 */
async function ladeRoadmapZaehler(id, stand) {
  let kennzahlen
  try {
    kennzahlen = roadmapKennzahlen(await holeProjektRoadmap(id))
  } catch (fehler) {
    console.error(`Alle Produkte: Roadmap von '${id}' nicht ladbar:`, fehler)
    kennzahlen = { ok: false, grund: wurfText(fehler) }
  }
  const karte = findeKarte(id, stand)
  if (karte === null) return
  const ziel = karte.querySelector('[data-teil="ziel"]')
  const abgenommen = karte.querySelector('[data-teil="abgenommen"]')
  if (!kennzahlen.ok) {
    ziel.innerHTML = strichMitGrund(kennzahlen.grund)
    abgenommen.innerHTML = strichMitGrund(kennzahlen.grund)
    const ringTeil = karte.querySelector('[data-teil="ring"]')
    ringTeil.innerHTML = ring(0, 0, { unbekannt: true, label: nichtLadbarText(kennzahlen.grund) })
    ringTeil.title = nichtLadbarText(kennzahlen.grund)
    return
  }
  ziel.classList.toggle('leer', kennzahlen.vision === null)
  ziel.textContent = kennzahlen.vision ?? t('produkte.zielFehlt')
  abgenommen.textContent = `${formatiereZahl(kennzahlen.abgenommen)}/${formatiereZahl(kennzahlen.gesamt)}`
  karte.querySelector('[data-teil="ring"]').innerHTML = produktRing(kennzahlen.abgenommen, kennzahlen.gesamt)
}

/**
 * Entscheidungen, Statuschip und Hinweis einer Karte aus GET …/<id>/zustand und …/<id>/workitems?status=OFFEN.
 * @param id - Projekt-id
 * @param stand - Render-Stand
 */
async function ladeEntscheidungsZaehler(id, stand) {
  let kennzahl
  try {
    const [zustand, workitems] = await Promise.all([holeProjektZustand(id), holeProjektOffeneWorkitems(id)])
    kennzahl = entscheidungsKennzahl(zustand, workitems)
  } catch (fehler) {
    console.error(`Alle Produkte: Entscheidungen von '${id}' nicht ladbar:`, fehler)
    kennzahl = { ok: false, grund: wurfText(fehler) }
  }
  const karte = findeKarte(id, stand)
  if (karte === null) return
  const wert = karte.querySelector('[data-teil="entscheidungen"]')
  if (kennzahl.ok) wert.textContent = formatiereZahl(kennzahl.anzahl)
  else wert.innerHTML = strichMitGrund(kennzahl.grund)
  setzeLage(karte, kennzahl.ok ? kennzahl.anzahl : null)
}

/**
 * Zeile unter dem Kopf: Anzahl, Ausführung aktiv ja/nein, Arbeitsteilung.
 * @param projekte - Registereinträge, oder null (verbergen)
 */
function zeigeIntro(projekte) {
  const intro = document.getElementById('projekte-uebersicht-intro')
  intro.hidden = projekte === null
  // Ohne Liste auch leeren — eine alte Zeile („3 Produkte · …“) darf nie neben einem Ladefehler stehen.
  if (projekte === null) {
    intro.innerHTML = ''
    return
  }
  const aktiv = projekte.some((p) => p.laufAktiv === true)
  intro.innerHTML = `<span>${tHtml('produkte.anzahl', { anzahl: projekte.length, zahl: formatiereZahl(projekte.length) })}</span><span>${tHtml(aktiv ? 'produkte.ausfuehrungAktiv' : 'produkte.keineAusfuehrung')}</span><span>${tHtml('produkte.arbeitsteilung')}</span>`
}

/**
 * Lädt das Register (GET /api/projekte) und rendert die Karten sofort; die Zähler und der F43-Block
 * jeder Karte laden danach einzeln. Jeder Aufruf erhöht den Render-Stand — eine spätere Antwort eines
 * älteren Aufrufs (Register oder Zähler) schreibt nicht mehr. Ein Körper ohne Liste `projekte` ist
 * ein Ladefehler, kein Wurf.
 */
async function ladeProjekte() {
  renderStand += 1
  const stand = renderStand
  const container = document.getElementById('projekte-uebersicht-liste')
  container.innerHTML = `<p class="leer">${tHtml('produkte.laedt')}</p>`
  zeigeIntro(null)
  let projekte
  try {
    const daten = await holeProjekte()
    if (!Array.isArray(daten?.projekte)) throw new Error(t('produkte.grundUnbekannt'))
    projekte = daten.projekte
  } catch (fehler) {
    console.error('Alle Produkte: GET /api/projekte fehlgeschlagen:', fehler)
    if (stand === renderStand) container.innerHTML = `<p class="fehler">${tHtml('produkte.ladeFehler', { grund: wurfText(fehler) })}</p>`
    return
  }
  if (stand !== renderStand) return
  const aktivesProjektId = holeAktivesProjekt().id
  zeigeIntro(projekte)
  container.innerHTML = projekte.length === 0 ? `<p class="leer">${tHtml('produkte.leer')}</p>` : projekte.map((p) => produktKarte(p, aktivesProjektId)).join('')
  for (const p of projekte) {
    void ladeRoadmapZaehler(p.id, stand)
    void ladeEntscheidungsZaehler(p.id, stand)
    void ladeAufrufBlock(p.id)
  }
}

/** Markiert nach einem Projektwechsel (Auswahl im Kopf) die Karte des neuen aktiven Projekts, ohne neu zu laden. */
function markiereAktivesProjekt() {
  const aktivesProjektId = holeAktivesProjekt().id
  for (const karte of document.getElementById('projekte-uebersicht-liste').querySelectorAll('.produkt-karte')) {
    const istAktiv = karte.dataset.produktId === aktivesProjektId
    karte.classList.toggle('aktiv', istAktiv)
    karte.querySelector('.produkt-karte-aktiv-marke').hidden = !istAktiv
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
 * Kurzstand der Vorschau in der Zusammenfassung der Technik-Klappe (F44 WS-6a).
 * @param block - .projekt-aufruf der Karte
 * @param schluessel - Teil des i18n-Schlüssels produkte.vorschau.*
 */
function setzeVorschauKurz(block, schluessel) {
  const kurz = block.closest('.projekt-technik')?.querySelector('[data-teil="vorschau-kurz"]')
  if (kurz) kurz.textContent = t(`produkte.vorschau.${schluessel}`)
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
    console.error(`Alle Produkte: Vorschau & Aufruf von '${id}' nicht ladbar:`, fehler)
    const block = findeAufrufBlock(id)
    if (block === null) return
    setzeVorschauKurz(block, 'fehler')
    block.querySelector('.projekt-aufruf-vorschau').innerHTML = ''
    // QA-Befund: ein registriertes Projekt, dessen Handler beim Serverstart nicht gebaut werden
    // konnte (z. B. startbefehl mit .cmd), antwortet 404 „Unbekanntes Projekt“ — hier klarer benennen.
    const grund = fehler.message.startsWith('404') ? t('produkte.aufruf.nichtInitialisiert') : fehler.message
    block.querySelector('.projekt-aufruf-bereich').innerHTML = `<p class="fehler">${tHtml('produkte.aufruf.nichtLadbar', { grund })}</p>`
    return
  }
  const block = findeAufrufBlock(id)
  if (block === null) return
  setzeVorschauKurz(block, vorschauKurzstand(daten.vorschau))
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
  button.textContent = t('produkte.aufruf.laeuft')
  let fehlerText = ''
  try {
    const antwort = await rufeProjektAuf(id)
    if (antwort.status !== 200) {
      const koerper = await antwort.json().catch(() => ({}))
      fehlerText = `${antwort.status}: ${koerper.grund ?? t('produktNeu.fehler.unbekannt')}`
    }
  } catch (fehler) {
    console.error(`Alle Produkte: Aufruf von '${id}' fehlgeschlagen:`, fehler)
    fehlerText = t('produktNeu.fehler.anfrage', { grund: fehler.message })
  }
  await ladeAufrufBlock(id, fehlerText)
}

/** Klicks in der Liste (Weiterarbeiten, F43 „Aufrufen“), „Neu laden“, „+ Neues Produkt“ und die Markierung nach einem Projektwechsel — einmalig beim Bootstrap. */
function initBedienung() {
  document.getElementById('projekte-uebersicht-liste').addEventListener('click', (ereignis) => {
    const aufrufButton = ereignis.target.closest('.projekt-aufrufen')
    if (aufrufButton !== null) {
      if (!aufrufButton.disabled) void rufeAuf(aufrufButton)
      return
    }
    const button = ereignis.target.closest('.projekt-waehlen')
    if (button === null) return
    // Beim schon aktiven Projekt kein zweites setzeAktivesProjekt (Dateikopf: setzte die Abonnenten ohne Wechsel zurück).
    if (button.dataset.id !== holeAktivesProjekt().id) setzeAktivesProjekt({ id: button.dataset.id, name: button.dataset.name })
    // F29 WS-D2 (Auftrag Punkt B): merkt den Klick für „Zuletzt geöffnet“ in der Sidebar (zuletzt-geoeffnet.js).
    merkeGeoeffnet({ typ: 'projekt', id: button.dataset.id, label: button.dataset.name, hash: '#/dashboard', statusKategorie: button.dataset.statusKategorie })
    navigiere('#/dashboard')
  })
  document.getElementById('projekte-uebersicht-neu-laden').addEventListener('click', () => {
    void ladeProjekte()
  })
  document.getElementById('projekte-anlegen-oeffnen').addEventListener('click', () => navigiere(NEU_HASH))
  // Der Wechsel über die Auswahl im Kopf verschiebt nur die Markierung; Formular und Zähler bleiben (nicht projektgebunden).
  abonniereProjektWechsel(markiereAktivesProjekt)
}

/** true, solange POST /api/projekte aussteht — dann setzt weder der Eintritt noch das „+“ im Kopf etwas zurück. */
let anlageLaeuft = false

/**
 * true, wenn die Antwort einer Anlage eintraf, während die Unterseite nicht offen war (Korrekturrunde
 * WS-6a, qa 1): der nächste Eintritt zeigt dann dieses Ergebnis (Nächste Schritte bzw. Fehler), statt
 * es zurückzusetzen — sonst wären Git-Befehle oder Ablehnungsgrund nie sichtbar gewesen.
 */
let ergebnisUngesehen = false

/** true, sobald die ID von Hand geändert wurde — dann leitet der Name sie nicht mehr ab. */
let idVonHand = false

/** @returns true, wenn die Unterseite „Neues Produkt“ gerade angezeigt wird */
function unterseiteOffen() {
  return location.hash === NEU_HASH
}

/**
 * Zeigt bzw. leert die Fehlerzeile des Formulars. Ohne eigene Live-Region (eine pro Seite, Persona)
 * geht der Fokus auf die Meldung, damit ein Screenreader sie liest (Muster lauf-detail.js) — außer der
 * Aufrufer setzt ihn selbst auf das betroffene Feld oder die Unterseite ist nicht offen.
 * @param text - Rohtext ('' = verbergen)
 * @param fokus - true: Fokus auf die Meldung
 */
function zeigeAnlegenFehler(text, fokus = false) {
  const anzeige = document.getElementById('projekte-anlegen-fehler')
  anzeige.textContent = text
  anzeige.hidden = text === ''
  if (fokus && text !== '' && unterseiteOffen()) anzeige.focus()
}

/** Setzt Formular und Erfolgsbox der Unterseite zurück (Eintritt) — ein zweites „+ Neues Produkt“ fängt immer frisch an. */
function setzeAnlegenZurueck() {
  document.getElementById('projekte-anlegen-name').value = ''
  document.getElementById('projekte-anlegen-id').value = ''
  document.getElementById('projekte-anlegen-zielordner').value = ''
  document.getElementById('projekte-anlegen-zielordner-details').open = false
  idVonHand = false
  zeigeAnlegenFehler('')
  document.getElementById('projekte-anlegen-formular').hidden = false
  document.getElementById('projekte-anlegen-erfolg').hidden = true
  document.getElementById('projekte-anlegen-name').focus()
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
  if (unterseiteOffen()) document.getElementById('projekte-anlegen-erfolg-titel').focus()
}

/** Formular „Neues Produkt“: POST /api/projekte (F41 WS-1), Erfolg zeigt die Git-Befehle. Serverseitige Ablehnungen (400/409/422, inkl. D13) werden im Klartext angezeigt (Muster views/projekt.js). */
function initAnlegenFormular() {
  const oeffnenButton = document.getElementById('projekte-anlegen-oeffnen')
  const abbrechenButton = document.getElementById('projekte-anlegen-abbrechen')
  const absendenButton = document.getElementById('projekte-anlegen-absenden')
  const nameFeld = document.getElementById('projekte-anlegen-name')
  const idFeld = document.getElementById('projekte-anlegen-id')
  const ordnerKlappe = document.getElementById('projekte-anlegen-zielordner-details')

  nameFeld.addEventListener('input', () => {
    if (!idVonHand) idFeld.value = leiteProjektIdAb(nameFeld.value)
  })
  // Leert man die ID von Hand, leitet der Name sie wieder ab (bei der nächsten Namenseingabe bzw. beim Absenden).
  idFeld.addEventListener('input', () => {
    idVonHand = idFeld.value.trim() !== ''
  })
  abbrechenButton.addEventListener('click', () => navigiere(LISTE_HASH))

  absendenButton.addEventListener('click', async () => {
    if (absendenButton.disabled) return
    const name = nameFeld.value.trim()
    // Geleerte ID: beim Absenden aus dem Namen ableiten (qa 5), sichtbar im Feld.
    if (idFeld.value.trim() === '') idFeld.value = leiteProjektIdAb(name)
    const id = idFeld.value.trim()
    const zielordner = document.getElementById('projekte-anlegen-zielordner').value.trim()
    zeigeAnlegenFehler('')
    if (name === '') {
      zeigeAnlegenFehler(t('produktNeu.fehler.name'))
      nameFeld.focus()
      return
    }
    // Keine ableitbare ID (z. B. ein kyrillischer Name oder nur ein Zeichen): Klappe öffnen, kein POST.
    if (id === '') {
      ordnerKlappe.open = true
      zeigeAnlegenFehler(t('produktNeu.fehler.id'))
      idFeld.focus()
      return
    }

    const koerper = zielordner === '' ? { id, name } : { id, name, zielordner }
    // QA-Befund (real reproduziert): "Abbrechen" blieb während der Anfrage bedienbar — ein Klick
    // versteckte das Formular, eine DANACH eintreffende Antwort schrieb trotzdem noch in die (jetzt
    // unsichtbare) Fehleranzeige bzw. ließ die Erfolgsbox nach einem bewussten Abbruch unangekündigt
    // wieder aufpoppen. "+ Neues Produkt" bleibt aus demselben Grund gesperrt — ein Reset der Felder
    // MITTEN in der ausstehenden Anfrage hätte dieselbe Race in die andere Richtung geöffnet (eine
    // verspätete Antwort des ERSTEN Versuchs hätte über die frisch eingetragenen Werte des ZWEITEN
    // geschrieben). Alle drei Knöpfe bleiben deshalb für die Dauer der Anfrage gemeinsam gesperrt.
    anlageLaeuft = true
    absendenButton.disabled = true
    abbrechenButton.disabled = true
    oeffnenButton.disabled = true
    try {
      let antwort
      try {
        antwort = await legeProjektAn(koerper)
      } catch (fehler) {
        console.error('Neues Produkt: POST /api/projekte fehlgeschlagen:', fehler)
        zeigeAnlegenFehler(t('produktNeu.fehler.anfrage', { grund: wurfText(fehler) }), true)
        return
      }
      const rumpf = await antwort.json().catch(() => ({}))
      if (antwort.status !== 201) {
        zeigeAnlegenFehler(`${antwort.status}: ${rumpf.grund ?? t('produktNeu.fehler.unbekannt')}`, true)
        return
      }
      // Code-Review-Befund: ein 201 ohne projekt/naechste_schritte ist ein Vertragsbruch der Route
      // (AK4f), kein Fachergebnis — als Fehler anzeigen statt zu werfen.
      if (rumpf.projekt?.id === undefined || rumpf.naechste_schritte === undefined) {
        console.error('Neues Produkt: 201 ohne projekt/naechste_schritte:', rumpf)
        zeigeAnlegenFehler(t('produktNeu.fehler.antwort'), true)
        return
      }
      zeigeAnlegenErfolg(rumpf.projekt, rumpf.naechste_schritte)
      // F44 WS-1b: die Projektauswahl im Kopf kennt das neue Projekt erst nach einem neuen Abruf.
      // Die Liste lädt beim Betreten von #/projekte-uebersicht ohnehin neu.
      void ladeProjektAuswahl()
      // Steht der Nutzer schon auf der Liste, lädt sie jetzt neu (sonst beim Betreten).
      if (location.hash === LISTE_HASH) void ladeProjekte()
    } finally {
      anlageLaeuft = false
      ergebnisUngesehen = !unterseiteOffen()
      absendenButton.disabled = false
      abbrechenButton.disabled = false
      oeffnenButton.disabled = false
    }
  })

  document.getElementById('projekte-anlegen-erfolg-schliessen').addEventListener('click', () => navigiere(LISTE_HASH))

  // F41 WS-2 (AK, "Zum Coach-Interview"): wechselt den Workspace auf das neu angelegte Projekt
  // (setzeAktivesProjekt, Muster Kartenklick oben) und springt in Sparring/Modus "projekt"
  // (views/chat.js wechsleZuSparringProjekt) — navigiere('#/chat') öffnet dabei zusätzlich die
  // Chat-Spalte auch unter 1280px (shell.js beiRoutenwechsel erzwingt sie auf '#/chat' offen).
  document.getElementById('projekte-anlegen-coach').addEventListener('click', () => {
    if (letztesAngelegtesProjekt === null) return
    setzeAktivesProjekt(letztesAngelegtesProjekt)
    // Code-Review-Befund: hash ist das tatsächliche navigiere()-Ziel dieses Klicks (zuletzt-geoeffnet.js-Vertrag).
    merkeGeoeffnet({ typ: 'projekt', id: letztesAngelegtesProjekt.id, label: letztesAngelegtesProjekt.name, hash: '#/chat', statusKategorie: 'neutral' })
    wechsleZuSparringProjekt()
    navigiere('#/chat')
  })
}

/**
 * Zeigt Übersicht oder Unterseite im gemeinsamen View-Container.
 * @param neu - true für „Neues Produkt“
 */
function zeigeTeilseite(neu) {
  document.getElementById('projekte-uebersicht-seite').hidden = neu
  document.getElementById('projekte-anlegen-seite').hidden = !neu
}

/**
 * F44 WS-1b (F-862), WS-6a: „+“ im Kopf — navigiert auf die Unterseite „Neues Produkt“. Deren
 * Eintritt setzt Formular und Box zurück, außer eine Anlage läuft (dieselbe Race wie in
 * initAnlegenFormular beschrieben) oder ihr Ergebnis noch ungesehen ist.
 */
export function oeffneAnlegenFormularAusKopf() {
  navigiere(NEU_HASH)
}

/** Initialisiert die Seite einmalig beim Bootstrap und registriert beide Routen (gleicher View-Container, gleiche Nav-Markierung). */
export function initProjekteUebersichtView() {
  initBedienung()
  initAnlegenFormular()
  registriere(/^#\/projekte-uebersicht$/, 'projekte-uebersicht', () => {
    zeigeTeilseite(false)
    void ladeProjekte()
  })
  registriere(/^#\/projekte-uebersicht\/neu$/, 'projekte-uebersicht', () => {
    zeigeTeilseite(true)
    if (anlageLaeuft) return
    if (ergebnisUngesehen) {
      // Das Ergebnis einer Anlage, die fertig wurde, während die Unterseite verlassen war, bleibt stehen (qa 1).
      ergebnisUngesehen = false
      const erfolg = !document.getElementById('projekte-anlegen-erfolg').hidden
      document.getElementById(erfolg ? 'projekte-anlegen-erfolg-titel' : 'projekte-anlegen-fehler').focus()
      return
    }
    setzeAnlegenZurueck()
  })
}
