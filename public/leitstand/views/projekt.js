/**
 * Datei: public/leitstand/views/projekt.js
 *
 * Zweck: View `#/projekt` „Auftrag & Direktstart“ (F44 WS-5b, Vorlage V10 d_auftrag_neu, Abgleich
 * F-725 F1, G10, G11; Entscheidung E-F44-3 = A). Hauptweg ist „Ablauf vorbereiten“: Auftrag anlegen
 * (POST …/auftraege) → routen (POST …/auftraege/<id>/routen) → auf den Vorschlag warten → zum Ablauf
 * `#/workflows/router-<auftragId>`, wo der bestehende Freigabedialog (F3) freigibt — hier gibt es
 * keine zweite Freigabe. Gewartet wird über das Zustands-Aggregat (abonniere, kein eigener Timer).
 * Der Direktstart eines Einzelschritts (POST …/laeufe) bleibt als aufklappbarer Nebenweg
 * (#direktstart) mit unverändertem Verhalten, unveränderten IDs und unverändertem POST-Körper.
 *
 * Die Wiederaufnahme-VORBELEGUNG lebt hier (wendeWiederaufnahmeAn, exportiert), weil sie das
 * Startformular dieser View befüllt — AUSGELÖST wird sie von der Runs-View („Fortsetzung
 * vorbereiten“), die per Router zu `#/projekt` navigiert und anschließend diese Funktion aufruft.
 * Bewusste Kopplung über einen Funktionsexport statt eines Event-Bus.
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initProjektView beim Bootstrap)
 * - public/leitstand/views/runs.js (wendeWiederaufnahmeAn, zeigeVorbelegungsFehler)
 * - public/leitstand/views/projekt.test.mjs, public/leitstand/projekt-wechsel.test.mjs (node:test)
 *
 * Wichtig:
 * - rolle/budget/aufrufEingaben.modell bleiben im Startformular FEST (§13.3-Nicht-Ziel „keine
 *   dynamische Rollen-/Modell-/Werkzeugwahl“, F-161) — unverändert übernommen.
 * - Erlaubnis nur aus Serverantworten: D13 (ein Lauf zur Zeit) wird nicht vorweggenommen; ein 409
 *   beim Routen erscheint als Notiz mit dem Servergrund. „Erneut versuchen“ routet denselben Auftrag
 *   neu und legt NIE einen zweiten an.
 * - Projektwechsel (F-860): eine laufende Vorbereitung des alten Projekts wird verworfen (späte
 *   Antworten und Aggregat-Treffer gehen ins Leere); Titel, Ergebnis und Kontext bleiben stehen
 *   (Text gehört dem Menschen, F-885).
 * - Keine eigene Live-Region: Fehler und Schritt 2 bekommen den Fokus.
 * - Die Kette „anlegen → routen → warten“ existiert auch in views/workboard.js (Click-to-Work);
 *   Zusammenlegen ist F-943 (beim Schnitt F-928).
 */

import { holeAuftraege, holeWerkzeugsaetze, legeAuftragAn, routeAuftrag, starteLauf } from '../api.js'
import { t } from '../i18n.js'
import { kommtKnopf } from '../kommt.js'
import { abonniereProjektWechsel, holeAktivesProjekt } from '../projekt-kontext.js'
import { escapeHtml } from '../render.js'
import { navigiere } from '../router.js'
import { abonniere } from '../zustand.js'
import { baueAuftragstext, pruefeAggregat, renderVorbereitung, workflowIdFuer } from './auftrag-vorbereitung.js'

/** Präfix der synthetischen Kontextpaket-Elemente, die der Server selbst voranstellt (execution-controller/index.ts) — keine vom Nutzer benannten Evidenzdateien, werden bei der Vorbelegung herausgefiltert. */
const ARTEFAKT_PRAEFIX = 'artefakt:'

/** Filtert die echten, vom Nutzer ursprünglich benannten Kontextpaket-Elemente eines Vorgängerlaufs für die Wiederaufnahme-Vorbelegung. @param elemente - detail.kontextpaket.elemente aus GET /api/laeufe/<laufId> @returns Liste repo-relativer Pfade, ohne die artefakt:-Lineage-Referenzen */
function filtereEchteEvidenzPfade(elemente) {
  return elemente.filter((e) => typeof e?.pfad === 'string' && !e.pfad.startsWith(ARTEFAKT_PRAEFIX)).map((e) => e.pfad)
}

/** Fehlertext einer abgefangenen Ausnahme. @param fehler - gefangener Wert @returns Text */
function meldungVon(fehler) {
  return fehler instanceof Error ? fehler.message : String(fehler)
}

// ─── Wiederaufnahme-Vorbelegung (Direktstart) ───────────────────────────────

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
  zeile.innerHTML = `<input type="text" class="evidenzdatei-pfad" placeholder="${escapeHtml(t('direktstart.evidenz.platzhalter'))}" aria-label="${escapeHtml(t('direktstart.evidenz.pfad'))}" /><button type="button" class="button evidenzdatei-entfernen" aria-label="${escapeHtml(t('direktstart.evidenz.entfernen'))}">–</button>`
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

/** Fehlerzeile des Auftragsformulars (Anlegen über beide Wege); bekommt beim Zeigen den Fokus (keine Live-Region). @param text - Fehlertext, '' blendet aus */
function zeigeAuftragAnlegenFehler(text) {
  const anzeige = document.getElementById('auftrag-anlegen-fehler')
  anzeige.textContent = text
  anzeige.hidden = text === ''
  if (text !== '') anzeige.focus()
}

/** Fehlerzeile des Direktstarts. @param text - Fehlertext, '' blendet aus */
function zeigeStartFehler(text) {
  const anzeige = document.getElementById('start-fehler')
  anzeige.textContent = text
  anzeige.hidden = text === ''
}

/** Erfolgszeile des Direktstarts. @param text - Text, '' blendet aus */
function zeigeStartErfolg(text) {
  const anzeige = document.getElementById('start-erfolg')
  anzeige.textContent = text
  anzeige.hidden = text === ''
}

/** Überholschutz (F44 WS-1a, F-860, Muster views/dashboard.js verbrauchAnfrageZaehler): nach einem Projektwechsel darf eine späte Antwort des alten Projekts die Auswahllisten des neuen nicht überschreiben. */
let auftraegeAnfrageZaehler = 0
let werkzeugsaetzeAnfrageZaehler = 0

/** Lädt GET /api/auftraege in das Auftrag-Dropdown des Startformulars — Anzeige aus titel/erstellt_am, Wert auftragId. Erhält die vorherige Auswahl über einen Reload hinweg, wenn sie noch existiert. @param auszuwaehlen - optional: auftragId, die nach dem Laden gewählt wird (neu angelegter Auftrag) */
async function ladeAuftraege(auszuwaehlen) {
  const meineAnfrageNummer = ++auftraegeAnfrageZaehler
  const select = document.getElementById('start-auftrag')
  const vorherAusgewaehlt = auszuwaehlen ?? select.value
  try {
    const auftraege = await holeAuftraege()
    if (meineAnfrageNummer !== auftraegeAnfrageZaehler) return
    select.innerHTML =
      auftraege.length === 0
        ? `<option value="">${escapeHtml(t('direktstart.auswahl.leer'))}</option>`
        : auftraege.map((a) => `<option value="${escapeHtml(a.auftragId)}">${escapeHtml(a.titel)} (${escapeHtml(a.erstellt_am ?? t('direktstart.zeitUnbekannt'))})</option>`).join('')
    if (auftraege.some((a) => a.auftragId === vorherAusgewaehlt)) {
      select.value = vorherAusgewaehlt
    }
  } catch (fehler) {
    if (meineAnfrageNummer !== auftraegeAnfrageZaehler) return
    console.error('[projekt] GET …/auftraege fehlgeschlagen:', fehler)
    // F44 WS-1a (F-860): keine Aufträge eines anderen Projekts stehen lassen — „Starten“ schickte
    // sonst eine fremde auftragId an den neuen Präfix.
    select.innerHTML = `<option value="">${escapeHtml(t('direktstart.auswahl.nichtVerfuegbar'))}</option>`
    zeigeStartFehler(t('direktstart.fehler.auftraege', { meldung: meldungVon(fehler) }))
  }
}

/** Lädt GET /api/startvorlage/werkzeugsaetze in das Werkzeugsatz-Dropdown — die Antwort trägt bereits nur name/modus/erlaubte_werkzeuge (serverseitige Allowlist). Im Fehlerfall wird die Liste geleert (F44 WS-1a: keine Werkzeugsätze eines anderen Projekts stehen lassen). */
async function ladeWerkzeugsaetze() {
  const meineAnfrageNummer = ++werkzeugsaetzeAnfrageZaehler
  const select = document.getElementById('start-werkzeugsatz')
  try {
    const werkzeugsaetze = await holeWerkzeugsaetze()
    if (meineAnfrageNummer !== werkzeugsaetzeAnfrageZaehler) return
    select.innerHTML = werkzeugsaetze.map((w) => `<option value="${escapeHtml(w.name)}">${escapeHtml(w.name)} (${escapeHtml(w.erlaubte_werkzeuge.join(', '))})</option>`).join('')
  } catch (fehler) {
    if (meineAnfrageNummer !== werkzeugsaetzeAnfrageZaehler) return
    console.error('[projekt] GET …/startvorlage/werkzeugsaetze fehlgeschlagen:', fehler)
    select.innerHTML = `<option value="">${escapeHtml(t('direktstart.werkzeugsaetze.nichtVerfuegbar'))}</option>`
    zeigeStartFehler(t('direktstart.fehler.werkzeugsaetze', { meldung: meldungVon(fehler) }))
  }
}

// ─── Auftrag anlegen (beide Wege) ───────────────────────────────────────────

/** Felder des Auftragsformulars: Titel, gewünschtes Ergebnis, Kontext. @returns die drei Eingabeelemente */
function auftragsFelder() {
  return { titel: document.getElementById('auftrag-titel'), ergebnis: document.getElementById('auftrag-auftragstext'), kontext: document.getElementById('auftrag-kontext') }
}

/** Leert Titel, Ergebnis und Kontext — nur nach einem Erfolg (der Text ist dann beim Server). */
function leereAuftragsFelder() {
  const felder = auftragsFelder()
  felder.titel.value = ''
  felder.ergebnis.value = ''
  felder.kontext.value = ''
}

/** true, solange ein POST …/auftraege läuft — sperrt beide Anlege-Knöpfe gemeinsam (genau ein POST je Klick). */
let anlegenLaeuft = false

/** Sperrt bzw. entsperrt beide Anlege-Knöpfe während einer Anfrage. @param gesperrt - true während der Anfrage */
function sperreAnlegen(gesperrt) {
  anlegenLaeuft = gesperrt
  aktualisiereAnlegeKnoepfe()
}

/**
 * Sperre der Anlege-Knöpfe: beide während eines POST …/auftraege; „Auftrag ohne Ablauf anlegen“
 * zusätzlich in Schritt 2 — dann sind Titel, Ergebnis und Kontext verborgen und gehören zum schon
 * angelegten Auftrag (Prüfpass WS-5b: sonst entstand daraus ein zweiter Auftrag). Ein Hinweis sagt,
 * warum der Knopf gesperrt ist.
 */
function aktualisiereAnlegeKnoepfe() {
  const inVorbereitung = vorbereitung !== null
  document.getElementById('auftrag-ablauf-vorbereiten').disabled = anlegenLaeuft
  document.getElementById('auftrag-anlegen').disabled = anlegenLaeuft || inVorbereitung
  document.getElementById('direktstart-anlegen-gesperrt').hidden = !inVorbereitung
}

/**
 * POST …/auftraege mit Titel und Auftragstext (Ergebnis plus Kontext-Absatz). Zeigt nichts an — der
 * Aufrufer entscheidet nach seinem Überholschutz, ob der Fehler an die Fehlerzeile geht; die
 * Eingaben bleiben in jedem Fehlerfall stehen.
 * @returns { auftragId, meldung }: bei 201 die auftragId (meldung null), sonst auftragId null und der Fehlertext
 */
async function legeAuftragAusFormularAn() {
  const felder = auftragsFelder()
  zeigeAuftragAnlegenFehler('')
  let antwort
  try {
    antwort = await legeAuftragAn({ titel: felder.titel.value, auftragstext: baueAuftragstext(felder.ergebnis.value, felder.kontext.value) })
  } catch (fehler) {
    console.error('[projekt] POST …/auftraege fehlgeschlagen:', fehler)
    return { auftragId: null, meldung: t('auftrag.fehler.anfrage', { meldung: meldungVon(fehler) }) }
  }
  const koerper = await antwort.json().catch(() => ({}))
  if (antwort.status !== 201) return { auftragId: null, meldung: t('auftrag.fehler.status', { status: String(antwort.status), grund: koerper.grund ?? t('auftrag.fehler.unbekannt') }) }
  // Ein 201 ohne auftragId ist kein brauchbarer Erfolg — sonst ginge POST …/auftraege//routen hinaus.
  if (typeof koerper.auftragId !== 'string' || koerper.auftragId === '') {
    console.error('[projekt] POST …/auftraege: 201 ohne auftragId', koerper)
    return { auftragId: null, meldung: t('auftrag.fehler.status', { status: '201', grund: t('auftrag.fehler.ohneId') }) }
  }
  return { auftragId: koerper.auftragId, meldung: null }
}

/** „Auftrag ohne Ablauf anlegen“ (#auftrag-anlegen, im Direktstart): legt nur den Auftrag an, lädt die Auswahl neu und wählt ihn. */
async function legeAuftragOhneAblaufAn() {
  if (anlegenLaeuft || vorbereitung !== null) return
  const projektId = holeAktivesProjekt().id
  sperreAnlegen(true)
  try {
    const { auftragId, meldung } = await legeAuftragAusFormularAn()
    // F-860: nach einem Projektwechsel gehört die Antwort zum alten Projekt — nichts mehr anfassen.
    if (holeAktivesProjekt().id !== projektId) return
    if (auftragId === null) {
      zeigeAuftragAnlegenFehler(meldung)
      return
    }
    leereAuftragsFelder()
    await ladeAuftraege(auftragId)
    aktualisiereLaufIdVorschlag()
    // Rückmeldung ohne Live-Region: der Fokus liegt auf der Auswahl, die den neuen Auftrag zeigt.
    if (holeAktivesProjekt().id === projektId) document.getElementById('start-auftrag').focus()
  } finally {
    sperreAnlegen(false)
  }
}

// ─── Ablauf vorbereiten (Hauptweg, E-F44-3 = A) ─────────────────────────────

/**
 * Laufende Vorbereitung oder null (Schritt 1, Formular). Je Klick ein neues Objekt; jede Kette
 * prüft nach einem await, ob ihr Objekt noch das aktuelle ist — ein Projektwechsel oder „Neuen
 * Auftrag beschreiben“ setzt null, späte Antworten gehen dann ins Leere.
 * { projektId, phase, auftragId, laufId, workflowId, meldung }
 */
let vorbereitung = null

/** Setzt aria-current="step" (und .active) auf den aktuellen Schritt der Schrittanzeige. @param schritt - 1 (Auftrag) oder 2 (Ablauf prüfen); Schritt 3 findet auf `#/workflows/<id>` statt */
function setzeSchritt(schritt) {
  for (const eintrag of document.querySelectorAll('#auftrag-schritte [data-schritt]')) {
    const aktiv = eintrag.dataset.schritt === String(schritt)
    eintrag.classList.toggle('active', aktiv)
    if (aktiv) eintrag.setAttribute('aria-current', 'step')
    else eintrag.removeAttribute('aria-current')
  }
}

/**
 * Zeigt Schritt 1 (Formular) oder Schritt 2 (Notiz der Vorbereitung).
 * @param fokus - true: Fokus auf die Notiz bzw. den Titel (nach einer Bedienung); sonst nur, wenn der Fokus in der ersetzten Notiz lag
 */
function zeigeVorbereitung(fokus) {
  const formular = document.getElementById('auftrag-formular')
  const anzeige = document.getElementById('auftrag-vorbereitung')
  const sichtbar = vorbereitung !== null && vorbereitung.phase !== 'wird_angelegt'
  const fokusInNotiz = anzeige.contains(document.activeElement)
  formular.hidden = sichtbar
  anzeige.hidden = !sichtbar
  anzeige.innerHTML = sichtbar ? renderVorbereitung(vorbereitung) : ''
  setzeSchritt(sichtbar ? 2 : 1)
  aktualisiereAnlegeKnoepfe()
  if (!fokus && !fokusInNotiz) return
  if (sichtbar) document.getElementById('auftrag-vorbereitung-notiz')?.focus()
  else auftragsFelder().titel.focus()
}

/**
 * Routet den Auftrag der Vorbereitung v (Erststart oder „Erneut versuchen“): 202 → 'wartet' mit
 * laufId, 409 → 'konflikt' mit dem Servergrund (D13), sonst → 'fehler'.
 * @param v - die Vorbereitung, zu der geroutet wird
 */
async function routeVorbereitung(v) {
  v.phase = 'wird_geroutet'
  v.meldung = null
  // Die laufId eines früheren, gescheiterten Versuchs gehört nicht zu diesem.
  v.laufId = null
  v.wiederholbar = true
  zeigeVorbereitung(true)
  let antwort
  let koerper
  try {
    antwort = await routeAuftrag(v.auftragId)
    koerper = await antwort.json().catch(() => ({}))
  } catch (fehler) {
    console.error('[projekt] POST …/routen fehlgeschlagen:', fehler)
    if (vorbereitung !== v) return
    v.phase = 'fehler'
    v.meldung = t('auftrag.fehler.anfrage', { meldung: meldungVon(fehler) })
    zeigeVorbereitung(true)
    return
  }
  if (vorbereitung !== v) return
  if (antwort.status === 202) {
    v.phase = 'wartet'
    v.laufId = String(koerper.laufId ?? '')
  } else if (antwort.status === 409) {
    v.phase = 'konflikt'
    v.meldung = koerper.grund ?? t('auftrag.vorbereitung.konflikt.standard')
  } else {
    v.phase = 'fehler'
    v.meldung = t('auftrag.fehler.status', { status: String(antwort.status), grund: koerper.grund ?? t('auftrag.fehler.unbekannt') })
    // Ein 4xx (z. B. Auftrag nicht gefunden) wird durch Wiederholen nicht besser; 5xx und Netz schon.
    v.wiederholbar = antwort.status >= 500
  }
  zeigeVorbereitung(true)
}

/** „Ablauf vorbereiten“: Auftrag anlegen (201) → routen. Genau ein POST …/auftraege je Klick. */
async function bereiteAblaufVor() {
  if (anlegenLaeuft || vorbereitung !== null) return
  const v = { projektId: holeAktivesProjekt().id, phase: 'wird_angelegt', auftragId: null, laufId: null, workflowId: null, meldung: null }
  vorbereitung = v
  sperreAnlegen(true)
  let ergebnis
  try {
    ergebnis = await legeAuftragAusFormularAn()
  } finally {
    sperreAnlegen(false)
  }
  if (vorbereitung !== v) return
  if (ergebnis.auftragId === null) {
    vorbereitung = null
    // Die Sperre im finally oben sah noch die Vorbereitung — sonst bliebe „ohne Ablauf“ gesperrt.
    aktualisiereAnlegeKnoepfe()
    zeigeAuftragAnlegenFehler(ergebnis.meldung)
    return
  }
  v.auftragId = ergebnis.auftragId
  v.workflowId = workflowIdFuer(ergebnis.auftragId)
  // Der neue Auftrag gehört in die Auswahl des Direktstarts (wie nach „Auftrag ohne Ablauf anlegen“).
  void ladeAuftraege()
  await routeVorbereitung(v)
}

/**
 * Abnehmer des Zustands-Aggregats (ein Poll, zustand.js): erscheint der Ablauf `router-<auftragId>`,
 * geht es — solange der Nutzer auf `#/projekt` ist — dorthin, und die Felder werden geleert; sonst
 * steht dort beim Zurückkehren „Der Ablauf ist vorbereitet“. Ein Startfehler zu genau dieser laufId
 * zeigt die rote Notiz. Treffer eines anderen Projekts werden ignoriert.
 * @param zustand - Aggregat aus GET …/zustand
 */
function beiZustand(zustand) {
  const v = vorbereitung
  if (v === null || v.projektId !== holeAktivesProjekt().id) return
  const treffer = pruefeAggregat(zustand, v)
  if (treffer === null) return
  if (treffer.art === 'startfehler') {
    v.phase = 'startfehler'
    v.meldung = treffer.fehler
    zeigeVorbereitung(false)
    return
  }
  leereAuftragsFelder()
  // Nicht mitten aus einer Eingabe im Direktstart wegspringen (Prüfpass WS-5b): dann wie „woanders“.
  const imDirektstart = document.getElementById('direktstart').contains(document.activeElement)
  if (location.hash === '#/projekt' && !imDirektstart) {
    vorbereitung = null
    zeigeVorbereitung(false)
    navigiere(`#/workflows/${encodeURIComponent(v.workflowId)}`)
    return
  }
  v.phase = 'bereit'
  zeigeVorbereitung(false)
}

/** Klick-Delegation der Notiz: „Erneut versuchen“ (denselben Auftrag neu routen), „Neuen Auftrag beschreiben“, „Ablauf prüfen“ (Link). @param ereignis - Klick */
function beiVorbereitungsKlick(ereignis) {
  const knopf = ereignis.target.closest('[data-aktion]')
  const v = vorbereitung
  if (!knopf || v === null) return
  const aktion = knopf.dataset.aktion
  if (aktion === 'erneut' && (v.phase === 'konflikt' || v.phase === 'startfehler' || v.phase === 'fehler')) {
    void routeVorbereitung(v)
  } else if (aktion === 'neu') {
    // Der Auftrag ist beim Server angelegt (sein Text liegt dort); ein neuer Auftrag beginnt leer —
    // sonst entstünde aus demselben Text ein zweiter Auftrag (Prüfpass WS-5b).
    vorbereitung = null
    leereAuftragsFelder()
    zeigeAuftragAnlegenFehler('')
    zeigeVorbereitung(true)
  } else if (aktion === 'pruefen') {
    // Ein Klick in einen neuen Tab lässt diese Seite unverändert.
    if (ereignis.ctrlKey || ereignis.metaKey || ereignis.shiftKey || ereignis.button > 0) return
    // Der Link navigiert selbst; die Seite steht beim nächsten Betreten wieder auf Schritt 1.
    vorbereitung = null
    zeigeVorbereitung(false)
  }
}

/** true, wenn `#/projekt` direkt aus `#/runs` (Register „Aufträge“) betreten wurde — „← Alle Aufträge“ geht dann per history.back() zurück (F-926-Muster). */
let ausAuftraegen = false

/** Hauptformular, Notiz, „Lieber mit dem Coach besprechen“ (kommt) und „← Alle Aufträge“. */
function initAuftragFormular() {
  const felder = auftragsFelder()
  felder.titel.placeholder = t('auftrag.feld.titel.platzhalter')
  felder.ergebnis.placeholder = t('auftrag.feld.ergebnis.platzhalter')
  felder.kontext.placeholder = t('auftrag.kontext.platzhalter')
  // Vorlage: sekundär „Lieber mit dem Coach besprechen“ — das Chat-Dock folgt in WS-8 (E-F44-1).
  document.getElementById('auftrag-aktionen').insertAdjacentHTML('beforeend', kommtKnopf(t('auftrag.coach')))
  document.getElementById('auftrag-formular').addEventListener('submit', (ereignis) => {
    ereignis.preventDefault()
    void bereiteAblaufVor()
  })
  document.getElementById('auftrag-vorbereitung').addEventListener('click', beiVorbereitungsKlick)
  document.getElementById('auftrag-anlegen').addEventListener('click', () => {
    void legeAuftragOhneAblaufAn()
  })
  window.addEventListener('hashchange', (ereignis) => {
    if (location.hash !== '#/projekt') return
    try {
      ausAuftraegen = new URL(ereignis.oldURL).hash === '#/runs'
    } catch {
      ausAuftraegen = false
    }
  })
  document.getElementById('auftrag-zurueck').addEventListener('click', () => {
    if (ausAuftraegen) history.back()
    else navigiere('#/runs')
  })
}

// ─── Direktstart (G10, G11) ─────────────────────────────────────────────────

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
      zeigeStartFehler(t('direktstart.fehler.keinAuftrag'))
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
        console.error('[projekt] POST …/laeufe fehlgeschlagen:', fehler)
        zeigeStartFehler(t('direktstart.fehler.anfrage', { meldung: meldungVon(fehler) }))
        return
      }

      if (antwort.status !== 202) {
        const koerper = await antwort.json().catch(() => ({}))
        zeigeStartFehler(t('direktstart.fehler.status', { status: String(antwort.status), grund: koerper.grund ?? t('auftrag.fehler.unbekannt') }))
        return
      }

      const angenommen = await antwort.json().catch(() => ({}))
      zeigeStartErfolg(t('direktstart.erfolg', { laufId: angenommen.laufId ?? startauftrag.laufId }))
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
 * F44 WS-1a (F-860): projektId ist das Projekt, zu dem der Lauf gehört (vom Aufrufer VOR seinem
 * eigenen Abruf festgehalten). Hat das aktive Projekt inzwischen gewechselt — vor oder während des
 * Wartens hier —, wird nichts vorbelegt; sonst schickte „Starten“ eine fremde vorgaengerLaufId.
 * F44 WS-5b: Der Direktstart ist aufklappbar; die Vorbelegung öffnet ihn und legt den Fokus auf
 * seine Überschrift, damit sie sichtbar bleibt.
 * @param detail - Antwortkörper von GET /api/laeufe/<laufId>
 * @param alterLaufId - laufId des wiederaufzunehmenden Laufs
 * @param projektId - id des Projekts des Laufs (Standard: das aktive)
 */
export async function wendeWiederaufnahmeAn(detail, alterLaufId, projektId = holeAktivesProjekt().id) {
  if (holeAktivesProjekt().id !== projektId) return
  const auftragSelect = document.getElementById('start-auftrag')
  if (detail.auftrag?.status === 'ok') {
    await ladeAuftraege()
    if (holeAktivesProjekt().id !== projektId) return
    auftragSelect.value = detail.auftrag.auftragId
  } else {
    auftragSelect.value = ''
  }

  const evidenzPfade = detail.kontextpaket?.status === 'ok' ? filtereEchteEvidenzPfade(detail.kontextpaket.elemente) : []
  ersetzeEvidenzdateien(evidenzPfade)

  setzeWiederaufnahmeVorbelegung(alterLaufId)
  aktualisiereLaufIdVorschlag()
  document.getElementById('direktstart').open = true
  document.getElementById('direktstart-titel').focus()
}

/** Initialisiert die Projekt-View einmalig beim Bootstrap. */
export function initProjektView() {
  initEvidenzdateien()
  initAuftragFormular()
  initStartformular()
  abonniere(beiZustand)
  // F44 WS-1a (F-860): Aufträge und Werkzeugsätze gehören zum Projekt — beim Wechsel neu laden,
  // damit die Auswahlliste zum Präfix passt, an den „Starten“ sendet. Ein alter Startfehler/-erfolg
  // bezog sich auf das vorige Projekt und wird ausgeblendet.
  // Eine vorbereitete Wiederaufnahme gehört zum alten Projekt (vorgaengerLaufId und die daraus
  // vorbelegten Evidenzpfade) und wird verworfen; bis zur Antwort zeigt die Auftragsliste „Lädt…“.
  // F44 WS-5b: Eine laufende Vorbereitung des alten Projekts wird verworfen (Schritt 1); Titel,
  // Ergebnis und Kontext bleiben stehen (F-885).
  abonniereProjektWechsel(() => {
    vorbereitung = null
    zeigeVorbereitung(false)
    zeigeAuftragAnlegenFehler('')
    if (aktiveVorgaengerLaufId !== null) ersetzeEvidenzdateien([])
    loescheWiederaufnahmeVorbelegung()
    zeigeVorbelegungsFehler('')
    zeigeStartFehler('')
    zeigeStartErfolg('')
    const laedt = `<option value="">${escapeHtml(t('direktstart.laedt'))}</option>`
    document.getElementById('start-auftrag').innerHTML = laedt
    document.getElementById('start-werkzeugsatz').innerHTML = laedt
    void ladeAuftraege().then(aktualisiereLaufIdVorschlag)
    void ladeWerkzeugsaetze()
  })
  void ladeAuftraege().then(aktualisiereLaufIdVorschlag)
  void ladeWerkzeugsaetze()
}
