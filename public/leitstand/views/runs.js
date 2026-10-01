/**
 * Datei: public/leitstand/views/runs.js
 *
 * Zweck: Bedienung der Ausführungen (F20 WS-1/WS-2, F44 WS-5a, Vorlage V10 d_arbeit_verlauf und
 * d_ausfuehrung_failed; Abgleich F-725 G1–G9, F7): die Register „Aufträge“ (`#/runs`, Liste aus
 * views/workflows.js) und „Ausführungen“ (`#/ausfuehrungen`: Laufliste und Startfehler aus dem
 * Zustands-Aggregat, ein Poll in zustand.js) sowie das Lauf-Detail `#/runs/<laufId>` als ganze Seite
 * (GET /api/laeufe/<laufId>, nur beim Öffnen und über „Aktualisieren“ — NICHT gepollt, F-363). Hier
 * liegen Laden, Dialogsteuerung (#lauf-dialog) und alle POSTs der Lauf-Bedienung: Kenntnisnahme (G6),
 * Klärung auflösen (G8, art 'terminal'), Rückfrage beantworten (F7, art 'antwort'), Lauf abbrechen
 * (G9) und „Fortsetzung vorbereiten“ (G7, Wiederaufnahme über views/projekt.js). Gerendert wird im
 * reinen Modul views/lauf-detail.js.
 *
 * Die Route der Ausführungen heißt `#/ausfuehrungen` und nicht `#/runs/ausfuehrungen`: das Muster
 * `#/runs/<laufId>` ([^/]+) würde mit einer laufId „ausfuehrungen“ kollidieren (Abweichung von
 * Abgleich §5.2, vermerkt in §5.1).
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initRunsView beim Bootstrap)
 * - public/leitstand/views/workflows.js (Navigation zu `#/runs/<laufId>` aus der Schritttabelle)
 * - public/leitstand/views/runs-dialog.test.mjs (Dialogsteuerung)
 *
 * Wichtig: Liste und Startfehler werden bei jedem Poll-Tick nur bei geändertem HTML neu geschrieben
 * (sonst ginge der Tastaturfokus einer Zeile verloren); die Bedienung hängt per Delegation an den
 * Containern. Der Dialog wird beim Öffnen aus dem aktuellen Detail gebaut, ist während einer Anfrage
 * gesperrt (genau ein POST) und schließt bei geändertem Stand; eine Antwort zu einem inzwischen
 * anderen Lauf oder Projekt wird verworfen (F-860).
 */

import { abbrichLauf, holeLaufDetail, sendeEntscheidungAnfrage } from '../api.js'
import { t, tHtml } from '../i18n.js'
import { abonniereProjektWechsel, holeAktivesProjekt } from '../projekt-kontext.js'
import { ersetzeListeMitFokus, escapeHtml } from '../render.js'
import { ersetzeRoute, navigiere, registriere } from '../router.js'
import { abonniere, pollJetzt } from '../zustand.js'
import {
  darfFortsetzen,
  ermittleLaufLage,
  LAUF_DIALOG_FELD,
  laufStatusBadge,
  laufTitel,
  renderAufklappInhalte,
  renderEinordnung,
  renderLaufDialog,
  renderLaufListe,
  renderLaufNotiz,
  renderStartfehlerListe,
  renderWasPassiertIst,
} from './lauf-detail.js'
import { wendeWiederaufnahmeAn, zeigeVorbelegungsFehler } from './projekt.js'

/** Muster der Lauf-Detailroute. */
const DETAIL_MUSTER = /^#\/runs\/[^/]+$/

/** Alle Routen der View `runs` (Register, Lauf- und Workflow-Detail). */
const RUNS_VIEW_MUSTER = /^#\/(runs|ausfuehrungen|workflows)(\/[^/]+)?$/

// ─── Register und Liste (G1) ────────────────────────────────────────────────

/** HTML der zuletzt geschriebenen Laufliste bzw. Startfehler — ein Poll-Tick schreibt nur bei geändertem Inhalt. */
let letzteListeHtml = null
let letzteStartfehlerHtml = null

/** zustand.laeufe des letzten Ticks (oder null) — liefert Titel und kenntnisgenommen eines offenen Details. */
let letzteLaeufe = null

/**
 * Zeigt eines der beiden Register und markiert seinen Reiter (aria-current, .active).
 * @param register - 'auftraege' oder 'ausfuehrungen'
 */
function zeigeRegister(register) {
  document.getElementById('workflows-abschnitt').hidden = register !== 'auftraege'
  document.getElementById('ausfuehrungen-abschnitt').hidden = register !== 'ausfuehrungen'
  for (const reiter of document.querySelectorAll('#runs-register a[data-register]')) {
    const aktiv = reiter.dataset.register === register
    reiter.classList.toggle('active', aktiv)
    if (aktiv) reiter.setAttribute('aria-current', 'page')
    else reiter.removeAttribute('aria-current')
  }
}

/**
 * Schreibt Laufliste und Startfehler aus dem Zustands-Aggregat, jeweils nur bei geändertem HTML.
 * Ändert sich kenntnisgenommen des offenen Laufs, wird dessen Notiz neu gezeichnet.
 * @param zustand - Aggregat aus GET /api/zustand
 */
function renderAusfuehrungen(zustand) {
  // Bei defekter Quelle (null) bleibt der letzte bekannte Stand — sonst erschiene „Kenntnisnahme“ wieder.
  if (Array.isArray(zustand.laeufe)) letzteLaeufe = zustand.laeufe
  const liste = renderLaufListe(zustand.laeufe, zustand.aktiverLauf)
  if (liste !== letzteListeHtml) {
    letzteListeHtml = liste
    ersetzeListeMitFokus(document.getElementById('laeufe'), liste, '.lauf-zeile', 'laufId')
  }
  const startfehler = renderStartfehlerListe(zustand.startfehler)
  if (startfehler !== letzteStartfehlerHtml) {
    letzteStartfehlerHtml = startfehler
    document.getElementById('startfehler').innerHTML = startfehler
  }
  if (aktuellesDetail !== null && laufendeDialogBedienung === null && kenntnisAusAggregat(aktuellesDetail.laufId) !== aktuellesDetail.kenntnisgenommen) {
    zeichneLaufDetail(aktuellesDetail.laufId, aktuellesDetail.detail, aktuellesDetail.geladenAm)
  }
}

/** @param laufId - Kennung @returns kenntnisgenommen laut letztem Aggregat (false, solange unbekannt) */
function kenntnisAusAggregat(laufId) {
  return letzteLaeufe?.find((l) => l.laufId === laufId)?.kenntnisgenommen === true
}

// ─── Lauf-Detail als Seite ──────────────────────────────────────────────────

/** laufId des als Seite angezeigten Laufs, oder null. */
let gewaehlteLaufId = null

/** Fortlaufende Nummer je ladeLaufDetail-Aufruf (Überholschutz). */
let ladeZaehler = 0

/** Das zuletzt gezeichnete Detail: { laufId, detail, lage, kenntnisgenommen, kennzeichen, geladenAm }, oder null. */
let aktuellesDetail = null

/** Generation des angezeigten Laufs — zählt bei jedem Lauf-, Routen- und Projektwechsel hoch; eine Antwort aus einer älteren Generation wird verworfen (auch bei A → B → A). */
let laufGeneration = 0

/** laufIds, für die in dieser Sitzung ein Abbruch angefordert wurde, solange der Server sie noch als aktiv meldet. */
const abbruchAngefordert = new Set()

/** F-926-Muster: true, solange seit dem letzten Betreten von `#/ausfuehrungen` keine andere Route kam. */
let listeZuletzt = false

/** true, wenn das offene Detail direkt aus der Liste geöffnet wurde („← Alle Ausführungen“ per history.back()). */
let detailAusListe = false

/** Zeigt bzw. verbirgt die Seite (Kopf, Register und Workflow-Seite verschwinden über die Klasse an #view-runs). @param offen - true: Detail als Seite */
function zeigeLaufSeite(offen) {
  document.getElementById('lauf-detail').hidden = !offen
  document.getElementById('view-runs').classList.toggle('lauf-seite-offen', offen)
}

/**
 * Meldung unter der Notiz (Text, nie HTML), keine Live-Region — wo nötig, bekommt sie danach den Fokus.
 * @param text - Text oder null zum Ausblenden
 * @param art - 'fehler' (Vorgabe) oder 'erfolg'
 */
function zeigeMeldung(text, art = 'fehler') {
  const anzeige = document.getElementById('lauf-meldung')
  anzeige.hidden = text === null
  if (text === null) return
  anzeige.className = art
  anzeige.textContent = text
}

/**
 * Fehlerzustand des Details (404, 500, Netz): nichts vom alten Stand bleibt bedienbar — Notiz,
 * Timeline, Einordnung und Aufklappbereiche werden geleert, ein offener Dialog schließt.
 * @param text - Fehlertext (Servergrund bzw. Netzfehler)
 */
function zeigeLaufNichtLadbar(text) {
  for (const id of ['lauf-notiz', 'lauf-timeline', 'lauf-einordnung', 'lauf-detail-status', 'lauf-auftrag-inhalt', 'lauf-herkunft-inhalt', 'lauf-protokoll-inhalt', 'lauf-faehigkeiten-inhalt']) {
    document.getElementById(id).innerHTML = ''
  }
  document.getElementById('lauf-detail-beschreibung').textContent = ''
  document.getElementById('lauf-aufklapp').hidden = true
  // Das leere Gerüst (Überschrift, Spalte „Einordnung“) verschwindet über eine Klasse, nicht über hidden (F-622).
  document.getElementById('lauf-detail').classList.add('lauf-nicht-ladbar')
  aktuellesDetail = null
  zeigeMeldung(null)
  if (laufendeDialogBedienung === null) schliesseDialog()
  const anzeige = document.getElementById('lauf-detail-fehler')
  // F44 WS-5b (Prüfpunkt WS-5a): „Erneut laden“ lädt dasselbe Detail neu, ohne die Seite zu verlassen.
  anzeige.innerHTML = `<strong>${tHtml('lauf.fehler.titel')}</strong><p>${escapeHtml(text)}</p><div class="action-row"><button type="button" class="button" data-aktion="erneut-laden">${tHtml('lauf.aktion.erneutLaden')}</button></div>`
  anzeige.hidden = false
  // Keine Live-Region: ein Screenreader liest den Fehler über den Fokus.
  anzeige.focus()
}

/**
 * Zeichnet die Seite aus einem geladenen Detail. Ist ein Dialog offen und hat sich der Stand
 * (Kennzeichen) geändert, schließt er mit „Der Stand hat sich geändert“ (kein Nachladen in den
 * offenen Dialog). Lag der Fokus in der Notiz, geht er auf denselben Knopf bzw. den Titel.
 * @param laufId - Kennung @param detail - Antwort von GET /api/laeufe/<laufId> @param geladenAm - Zeitpunkt der Antwort (ISO)
 */
function zeichneLaufDetail(laufId, detail, geladenAm) {
  const lage = ermittleLaufLage(detail.laufStatus, detail.verweigertDaten, detail.aktiv)
  const kenntnisgenommen = kenntnisAusAggregat(laufId)
  const ls = detail.laufStatus ?? {}
  const kennzeichen = `${laufId}|${lage}|${ls.status}|${ls.ergebnis ?? '-'}|${ls.blockerId ?? '-'}|${detail.aktiv === true}|${detail.verweigertDaten?.bypassVerdachtAnzahl ?? '-'}|${kenntnisgenommen}`
  const aktiv = detail.aktiv === true
  if (!aktiv) abbruchAngefordert.delete(laufId)
  aktuellesDetail = { laufId, detail, lage, kenntnisgenommen, kennzeichen, geladenAm, aktiv, abbruchAngefordert: abbruchAngefordert.has(laufId) }

  document.getElementById('lauf-detail-fehler').hidden = true
  document.getElementById('lauf-detail').classList.remove('lauf-nicht-ladbar')
  document.getElementById('lauf-detail-titel').textContent = laufTitel(detail.auftrag?.status === 'ok' ? detail.auftrag.titel : titelAusListe(laufId), laufId)
  document.getElementById('lauf-detail-beschreibung').textContent = t(`lauf.beschreibung.${lage}`)
  document.getElementById('lauf-detail-status').innerHTML = laufStatusBadge(detail.laufStatus, detail.aktiv)

  const notiz = document.getElementById('lauf-notiz')
  const fokusAktion = notiz.contains(document.activeElement) ? document.activeElement?.dataset?.aktion : undefined
  notiz.innerHTML = renderLaufNotiz(lage, {
    laufStatus: detail.laufStatus,
    verweigertDaten: detail.verweigertDaten ?? null,
    rohstrom: detail.rohstrom,
    kenntnisgenommen,
    fortsetzung: darfFortsetzen(detail.laufStatus, lage, aktiv),
    geladenAm,
    aktiv,
    abbruchAngefordert: aktuellesDetail.abbruchAngefordert,
  })
  if (fokusAktion !== undefined) (notiz.querySelector(`.lauf-aktion[data-aktion="${fokusAktion}"]`) ?? document.getElementById('lauf-detail-titel')).focus()

  document.getElementById('lauf-timeline').innerHTML = renderWasPassiertIst(detail.checkpoints, ls.status === 'ABGESCHLOSSEN' && ls.ergebnis === 'ERFOLGREICH')
  document.getElementById('lauf-einordnung').innerHTML = renderEinordnung(detail)
  const inhalte = renderAufklappInhalte(detail, letzteLaeufe?.find((l) => l.laufId === laufId) ?? null)
  document.getElementById('lauf-auftrag-inhalt').innerHTML = inhalte.auftrag
  document.getElementById('lauf-herkunft-inhalt').innerHTML = inhalte.herkunft
  document.getElementById('lauf-protokoll-inhalt').innerHTML = inhalte.protokoll
  document.getElementById('lauf-faehigkeiten-inhalt').innerHTML = inhalte.faehigkeiten
  document.getElementById('lauf-aufklapp').hidden = false

  if (offenerDialog !== null && laufendeDialogBedienung === null && (offenerDialog.laufId !== laufId || offenerDialog.kennzeichen !== kennzeichen)) {
    schliesseDialog()
    zeigeMeldung(t('lauf.dialog.standGeaendert'))
    document.getElementById('lauf-meldung').focus()
  }
}

/** @param laufId - Kennung @returns Auftragstitel aus dem letzten Aggregat, oder null */
function titelAusListe(laufId) {
  return letzteLaeufe?.find((l) => l.laufId === laufId)?.auftragsbezug?.titel ?? null
}

/**
 * Lädt GET /api/laeufe/<laufId> und zeichnet die Seite — beim Öffnen der Route und über
 * „Aktualisieren“, nicht im Poll (F-363). Nur der jüngste Aufruf schreibt; eine Antwort nach einem
 * Lauf- oder Projektwechsel wird verworfen (F-860).
 * @param laufId - Lauf-Kennung
 * @param oeffnen - true beim Öffnen (Ladezustand, Fokus auf den Titel), false beim Neuladen
 */
export async function ladeLaufDetail(laufId, oeffnen = true) {
  if (gewaehlteLaufId !== null && gewaehlteLaufId !== laufId) raeumeLaufZustand()
  gewaehlteLaufId = laufId
  ladeZaehler += 1
  const meineNummer = ladeZaehler
  const projektBeimStart = holeAktivesProjekt().id
  const istUeberholt = () => gewaehlteLaufId !== laufId || ladeZaehler !== meineNummer || holeAktivesProjekt().id !== projektBeimStart

  zeigeLaufSeite(true)
  if (oeffnen) {
    const titel = document.getElementById('lauf-detail-titel')
    titel.textContent = laufTitel(titelAusListe(laufId), laufId)
    document.getElementById('lauf-detail-fehler').hidden = true
    document.getElementById('lauf-detail').classList.remove('lauf-nicht-ladbar')
    document.getElementById('lauf-timeline').innerHTML = `<p class="subtle">${tHtml('ablauf.laedt')}</p>`
    for (const id of ['lauf-notiz', 'lauf-einordnung', 'lauf-detail-status']) document.getElementById(id).innerHTML = ''
    document.getElementById('lauf-detail-beschreibung').textContent = ''
    document.getElementById('lauf-aufklapp').hidden = true
    zeigeMeldung(null)
    titel.focus({ preventScroll: true })
    document.getElementById('lauf-detail').scrollIntoView({ block: 'start' })
  }

  try {
    const antwort = await holeLaufDetail(laufId)
    if (istUeberholt()) return
    const koerper = await antwort.json().catch(() => ({}))
    if (istUeberholt()) return
    if (!antwort.ok) {
      zeigeLaufNichtLadbar(`${antwort.status}: ${koerper.grund ?? t('lauf.fehler.unbekannt')}`)
      return
    }
    zeichneLaufDetail(laufId, koerper, new Date().toISOString())
  } catch (fehler) {
    if (istUeberholt()) return
    zeigeLaufNichtLadbar(t('lauf.fehler.anfrage', { meldung: fehler.message }))
  }
}

/** Räumt Dialog, Meldung und Detailstand auf — beim Lauf-, Routen- und Projektwechsel. */
function raeumeLaufZustand() {
  laufGeneration += 1
  schliesseDialog()
  // Eine laufende Anfrage des alten Laufs sperrt den neuen nicht (ihre Antwort wird ohnehin verworfen).
  laufendeDialogBedienung = null
  aktuellesDetail = null
  zeigeMeldung(null)
}

/** Schließt die Seite des Lauf-Details; Kopf und Register erscheinen wieder. */
function schliesseLaufDetail() {
  gewaehlteLaufId = null
  detailAusListe = false
  zeigeLaufSeite(false)
  raeumeLaufZustand()
}

/** F-926-Muster: Fokus auf die Zeile des zuvor offenen Laufs, ohne Zeile auf die Seitenüberschrift. @param laufId - Kennung */
function fokussiereLaufZeile(laufId) {
  const zeile = [...document.getElementById('laeufe').querySelectorAll('.lauf-zeile')].find((z) => z.dataset.laufId === laufId)
  ;(zeile ?? document.getElementById('runs-titel')).focus()
}

// ─── Dialog #lauf-dialog (G6, G8, F7, G9) ───────────────────────────────────

/** Der offene Dialog: null oder { art, laufId, kennzeichen } — kennzeichen ist das Kennzeichen des Details beim Öffnen. */
let offenerDialog = null

/** Die laufende Anfrage aus dem Dialog ({ laufId }) oder null — sperrt Escape, Abbrechen, Wiederöffnen und das Schließen bei Stand-Änderung, bis die Antwort da ist. */
let laufendeDialogBedienung = null

/** @returns true, solange #lauf-dialog offen ist */
function dialogOffen() {
  return document.getElementById('lauf-dialog').open === true
}

/** Fehlertext im Dialog (der Fokus geht auf ihn), null blendet ihn aus. @param text - Text oder null */
function zeigeDialogMeldung(text) {
  const anzeige = document.getElementById('lauf-dialog-meldung')
  if (anzeige === null) return
  anzeige.hidden = text === null
  if (text === null) return
  anzeige.textContent = text
  anzeige.focus()
}

/**
 * Öffnet den Dialog (nativ, showModal) mit Inhalt aus dem aktuellen Detail; der Fokus liegt auf dem
 * Pflichtfeld, beim Abbruch auf „Zurück“ (die harmlose Wahl).
 * @param art - 'kenntnisnahme', 'terminal', 'antwort' oder 'abbrechen'
 */
function oeffneDialog(art) {
  // Solange eine Dialog-Bedienung läuft, öffnet kein neuer Dialog (sonst wäre ein zweiter POST möglich).
  if (aktuellesDetail === null || laufendeDialogBedienung !== null) return
  const inhalt = renderLaufDialog(art, aktuellesDetail)
  if (inhalt === null) return
  const dialog = document.getElementById('lauf-dialog')
  dialog.innerHTML = inhalt
  offenerDialog = { art, laufId: aktuellesDetail.laufId, kennzeichen: aktuellesDetail.kennzeichen }
  if (!dialog.open) dialog.showModal()
  const feld = LAUF_DIALOG_FELD[art] === null ? null : document.getElementById(LAUF_DIALOG_FELD[art])
  ;(feld ?? dialog.querySelector('.lauf-dialog-abbrechen.button'))?.focus()
}

/** Schließt den Dialog ohne Wirkung (Abbrechen, Erfolg, Lauf-, Routen- oder Projektwechsel); Escape schließt nativ. */
function schliesseDialog() {
  const dialog = document.getElementById('lauf-dialog')
  offenerDialog = null
  if (dialog.open) dialog.close()
}

/**
 * Baut den Körper der Bedienung aus dem Dialog; eine leere Pflichtangabe meldet sich im Dialog
 * (Fokus ins Feld). Geprüft wird „nicht leer nach trim“ — bei kenntnisnahme/terminal dieselbe Bedingung wie
 * der Server, bei der Antwort etwas strenger (der Server prüft dort nur die Länge).
 * @param art - Dialogart
 * @param laufId - Kennung
 * @returns Körper für POST /api/entscheidungen, {} für den Abbruch, oder null bei fehlender Pflichtangabe
 */
function baueKoerper(art, laufId) {
  if (art === 'abbrechen') return {}
  const feld = document.getElementById(LAUF_DIALOG_FELD[art])
  if (feld.value.trim().length === 0) {
    zeigeDialogMeldung(t(art === 'antwort' ? 'lauf.dialog.antwort.pflicht' : 'lauf.dialog.pflicht'))
    feld.focus()
    return null
  }
  if (art === 'kenntnisnahme') return { art: 'kenntnisnahme', laufId, begruendung: feld.value }
  if (art === 'terminal') return { art: 'terminal', laufId, ergebnis: document.getElementById('entscheidung-terminal-ergebnis').value, begruendung: feld.value }
  return { art: 'antwort', laufId, antwort: feld.value, einstufung: document.getElementById('entscheidung-antwort-einstufung').value }
}

/**
 * Schickt GENAU EINE Bedienung aus dem Dialog. Bis zur Antwort sind alle Knöpfe und Felder gesperrt
 * (Escape und Wiederöffnen über laufendeDialogBedienung). Die Antwort gehört zu Lauf, Projekt und
 * Dialog beim Absenden — wechselt eines, wird sie verworfen. Erfolg: Dialog zu, Meldung, Poll und
 * Detail neu; Fehler (Pflicht, 400, 409, Netz): im offenen Dialog, der offen bleibt.
 * @param art - Dialogart
 */
async function sendeDialogBedienung(art) {
  if (laufendeDialogBedienung !== null || offenerDialog === null) return
  const laufId = offenerDialog.laufId
  const koerper = baueKoerper(art, laufId)
  if (koerper === null) return
  const projektBeimStart = holeAktivesProjekt().id
  const generationBeimStart = laufGeneration
  const dialogBeimStart = offenerDialog
  const meine = { laufId }
  laufendeDialogBedienung = meine
  zeigeDialogMeldung(null)
  zeigeMeldung(null)
  const gesperrt = [...document.getElementById('lauf-dialog').querySelectorAll('button, textarea, select')].filter((el) => !el.disabled)
  for (const el of gesperrt) el.disabled = true
  const giltNoch = () => gewaehlteLaufId === laufId && laufGeneration === generationBeimStart && holeAktivesProjekt().id === projektBeimStart
  const unserDialogOffen = () => offenerDialog === dialogBeimStart && dialogOffen()
  let erfolg = false
  try {
    const antwort = art === 'abbrechen' ? await abbrichLauf(laufId) : await sendeEntscheidungAnfrage(koerper)
    const inhalt = await antwort.json().catch(() => ({}))
    if (!giltNoch()) {
      console.warn(`[runs] Antwort zu '${laufId}' verworfen — Lauf oder Projekt inzwischen gewechselt (HTTP ${antwort.status}).`)
      return
    }
    if (antwort.ok) {
      erfolg = true
      if (art === 'abbrechen') abbruchAngefordert.add(laufId)
      if (unserDialogOffen()) schliesseDialog()
      zeigeMeldung(t(art === 'abbrechen' ? 'lauf.meldung.abbruch' : 'lauf.meldung.gespeichert'), 'erfolg')
    } else if (unserDialogOffen()) {
      zeigeDialogMeldung(`${antwort.status}: ${inhalt.grund ?? t('lauf.fehler.unbekannt')}`)
    } else {
      zeigeMeldung(`${antwort.status}: ${inhalt.grund ?? t('lauf.fehler.unbekannt')}`)
      document.getElementById('lauf-meldung').focus()
    }
  } catch (fehler) {
    console.error('[runs] Bedienung fehlgeschlagen:', fehler)
    if (!giltNoch()) return
    if (unserDialogOffen()) zeigeDialogMeldung(t('lauf.fehler.anfrage', { meldung: fehler.message }))
    else {
      zeigeMeldung(t('lauf.fehler.anfrage', { meldung: fehler.message }))
      document.getElementById('lauf-meldung').focus()
    }
  } finally {
    // Nur die eigene Sperre lösen — nach einem Laufwechsel kann schon eine neue laufen.
    if (laufendeDialogBedienung === meine) laufendeDialogBedienung = null
    for (const el of gesperrt) el.disabled = false
  }
  // Das Aggregat zuerst (kenntnisgenommen), dann das Detail; die Meldung behält danach den Fokus.
  await pollJetzt()
  if (erfolg && giltNoch()) {
    await ladeLaufDetail(laufId, false)
    if (giltNoch()) document.getElementById('lauf-meldung').focus()
  }
}

// ─── Fortsetzung vorbereiten (G7, Wiederaufnahme) ───────────────────────────

/**
 * Lädt das Detail frisch, übergibt die Vorbelegung an die Projekt-View und navigiert dorthin
 * (D-F10-1; wendeWiederaufnahmeAn unverändert). Ein Fehler steht als Meldung am Lauf.
 * @param laufId - Kennung des Vorgängerlaufs
 * @param knopf - auslösender Knopf (gesperrt bis zur Antwort)
 */
async function bereiteFortsetzungVor(laufId, knopf) {
  // F44 WS-1a (F-860): Projekt des Laufs festhalten, bevor gewartet wird (siehe wendeWiederaufnahmeAn).
  const projektId = holeAktivesProjekt().id
  const generation = laufGeneration
  const giltNoch = () => gewaehlteLaufId === laufId && laufGeneration === generation && holeAktivesProjekt().id === projektId
  /** Fehler am Lauf, mit Fokus (keine Live-Region). @param text - Text */
  const meldeFehler = (text) => {
    zeigeMeldung(text)
    document.getElementById('lauf-meldung').focus()
  }
  zeigeVorbelegungsFehler('')
  zeigeMeldung(null)
  knopf.disabled = true
  let detail
  try {
    const antwort = await holeLaufDetail(laufId)
    const koerper = await antwort.json().catch(() => ({}))
    if (!giltNoch()) return
    if (!antwort.ok) {
      meldeFehler(t('lauf.meldung.vorbelegung', { status: String(antwort.status), grund: koerper.grund ?? t('lauf.fehler.unbekannt') }))
      return
    }
    detail = koerper
  } catch (fehler) {
    if (giltNoch()) meldeFehler(t('lauf.fehler.anfrage', { meldung: fehler.message }))
    return
  } finally {
    knopf.disabled = false
  }
  navigiere('#/projekt')
  // F44 WS-5b: wendeWiederaufnahmeAn öffnet den aufklappbaren Direktstart und legt den Fokus darauf.
  await wendeWiederaufnahmeAn(detail, laufId, projektId)
}

// ─── Bedienung, Routen, Projektwechsel ──────────────────────────────────────

/** Klick-Delegation: Zeilen der Liste, Knöpfe der Notiz, Dialog und „← Alle Ausführungen“. */
function initBedienung() {
  document.getElementById('laeufe').addEventListener('click', (ereignis) => {
    const zeile = ereignis.target.closest('.lauf-zeile')
    // Strg/Cmd/Umschalt-Klick und Mittelklick bleiben beim Browser (neuer Tab bzw. neues Fenster).
    if (!zeile || ereignis.ctrlKey || ereignis.metaKey || ereignis.shiftKey || ereignis.button > 0) return
    ereignis.preventDefault()
    navigiere(`#/runs/${encodeURIComponent(zeile.dataset.laufId)}`)
  })
  document.getElementById('lauf-notiz').addEventListener('click', (ereignis) => {
    const knopf = ereignis.target.closest('.lauf-aktion')
    if (!knopf || gewaehlteLaufId === null) return
    const aktion = knopf.dataset.aktion
    if (aktion === 'aktualisieren') {
      void pollJetzt()
      void ladeLaufDetail(gewaehlteLaufId, false)
    } else if (aktion === 'fortsetzung') {
      void bereiteFortsetzungVor(gewaehlteLaufId, knopf)
    } else if (aktion.endsWith('-oeffnen')) {
      oeffneDialog(aktion.slice(0, -'-oeffnen'.length))
    }
  })
  document.getElementById('lauf-detail-fehler').addEventListener('click', (ereignis) => {
    if (!ereignis.target.closest('[data-aktion="erneut-laden"]') || gewaehlteLaufId === null) return
    void ladeLaufDetail(gewaehlteLaufId, true)
  })
  const dialog = document.getElementById('lauf-dialog')
  dialog.addEventListener('click', (ereignis) => {
    if (ereignis.target.closest('.lauf-dialog-abbrechen')) {
      if (laufendeDialogBedienung === null) schliesseDialog()
      return
    }
    const knopf = ereignis.target.closest('.lauf-dialog-aktion')
    if (knopf) void sendeDialogBedienung(knopf.dataset.aktion)
  })
  // Escape während einer laufenden Bedienung schließt nicht — die Entscheidung ist schon unterwegs.
  dialog.addEventListener('cancel', (ereignis) => {
    if (laufendeDialogBedienung !== null) ereignis.preventDefault()
  })
  dialog.addEventListener('close', () => {
    offenerDialog = null
  })
  // „← Alle Ausführungen“ (F-926): aus der Liste per history.back() (kein neuer Eintrag), sonst navigiere.
  document.getElementById('lauf-detail-schliessen').addEventListener('click', () => {
    if (detailAusListe) history.back()
    else navigiere('#/ausfuehrungen')
  })
}

/** F-860: Beim Projektwechsel Detail, Dialog und Listenstand des alten Projekts verwerfen; ein Detail-Hash geht ohne neuen Eintrag auf `#/ausfuehrungen`. */
function verwirfNachProjektWechsel() {
  schliesseLaufDetail()
  letzteListeHtml = null
  letzteStartfehlerHtml = null
  letzteLaeufe = null
  listeZuletzt = false
  if (DETAIL_MUSTER.test(location.hash)) ersetzeRoute('#/ausfuehrungen')
}

/** Initialisiert die Runs-View einmalig beim Bootstrap: Bedienung, Routen, Abonnement des Zustands-Aggregats (kein eigener Poll-Timer, zustand.js), Projektwechsel. */
export function initRunsView() {
  initBedienung()

  registriere(/^#\/runs$/, 'runs', () => {
    schliesseLaufDetail()
    zeigeRegister('auftraege')
  })
  registriere(/^#\/ausfuehrungen$/, 'runs', () => {
    const vorher = gewaehlteLaufId
    schliesseLaufDetail()
    zeigeRegister('ausfuehrungen')
    listeZuletzt = true
    if (vorher !== null) fokussiereLaufZeile(vorher)
  })
  registriere(/^#\/runs\/([^/]+)$/, 'runs', (laufId) => {
    if (gewaehlteLaufId !== laufId) detailAusListe = listeZuletzt
    listeZuletzt = false
    void ladeLaufDetail(laufId)
  })
  registriere(/^#\/workflows\/([^/]+)$/, 'runs', () => {
    schliesseLaufDetail()
  })
  // Jede andere Route beendet „zuletzt die Liste“; verlässt der Hash das Detail, schließt der Dialog.
  // Verlässt der Hash die Runs-View ganz (Übersicht, Projekt …), gilt das Detail als geschlossen: späte
  // Antworten werden verworfen, „← Alle Ausführungen“ greift nicht auf einen veralteten Verlauf zurück. Die
  // Runs-Routen räumen selbst auf (ihr onEnter läuft nach diesem Zuhörer und braucht gewaehlteLaufId noch).
  window.addEventListener('hashchange', () => {
    if (location.hash !== '#/ausfuehrungen') listeZuletzt = false
    if (!DETAIL_MUSTER.test(location.hash)) schliesseDialog()
    if (!RUNS_VIEW_MUSTER.test(location.hash) && gewaehlteLaufId !== null) schliesseLaufDetail()
  })

  abonniere(renderAusfuehrungen)
  abonniereProjektWechsel(verwirfNachProjektWechsel)
}
