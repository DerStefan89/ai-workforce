/**
 * Datei: public/leitstand/views/workflows.js
 *
 * Zweck: Bedienung von Auftrag & Ablauf unter `#/runs`: Liste „Aufträge“ und Detail `#/workflows/<id>`
 * als Seite (F15 WS-3a/3b, F20, F44 WS-4a/4b). Hier liegen Laden, Kennzeichen, Dialogsteuerung und
 * alle POSTs: Starten, Freigeben/Ablehnen (F3, F3b, Empfehlung F36), Stoppen (F10), Rückfrage (F6, F39),
 * Sichtung (F9, F-768), Reparaturfassung (F8, F-240), Abnahme samt „Prüfung wiederholen“ (F13–F18,
 * F23, F-656). Gerendert wird in reinen Modulen: views/workflow-detail.js (Liste, Timeline, „Auf einen
 * Blick“, Aktionen, F12), views/workflow-eingriffe.js (Notizen, Dialoginhalte, Reparatureditor) und
 * views/workflow-abnahme.js (Abnahme).
 *
 * F46 D2 (abgleich-f46.md §4.5): steht der Ablauf auf einer Freigabe oder einer offenen Abnahme, ist
 * das Detail die Seite Entscheiden (zeichneEntscheiden; Rendern in views/workflow-entscheiden.js,
 * views/workflow-abnahme.js und views/entscheidung-panel.js): Kopf mit Art · Eintrag und Frage, die
 * Hauptspalte der Entscheidung, rechts „Deine Entscheidung“ mit genau einem Hauptknopf. Die Wege
 * bleiben: „<Option> bestätigen“ einer Freigabe öffnet den bestehenden Freigabedialog (Kennzeichen
 * beim Öffnen, „Anzeige = Start“, Ablehnen im selben Dialog), eine Abnahme schickt POST …/abnahme wie
 * bisher. „Der Weg zum Ergebnis“ ist dann zugeklappt (samt „Auf einen Blick“), nichts fällt weg.
 *
 * Die Oberfläche entscheidet NICHTS selbst (D5): angeboten wird nur, was der Server ausweist
 * (naechster.art, status, architekturEntscheidung, Sichtungslage, GET …/abnahme). D13 wird nicht
 * vorhergesagt — ein 409 steht mit seinem Grundtext als Meldung da.
 *
 * Wird aufgerufen von: public/leitstand/app.js (initWorkflowsView); Tests views/workflows-dialog.test.mjs,
 * projekt-wechsel.test.mjs.
 *
 * Wichtig: Der Dialog (#workflow-dialog, showModal, außerhalb der Poll-Container; Arten freigabe, stopp,
 * klaerung, sichtung) wird beim Öffnen aus dem aktuellen Detail gebaut, schließt bei geändertem Stand
 * und ist während einer Anfrage gesperrt (genau ein POST; späte Antworten werden verworfen). Timeline,
 * Blick und F12 ersetzt jeder Poll-Tick; Notizen, Aktionen und Abnahme nur bei ECHTER Änderung
 * (Kennzeichen, F-249), damit angefangene Begründungen überleben; #workflow-reparatur nie. Ein
 * Projektwechsel verwirft Dialog, Detail und Entwurf (F-874, F-923).
 *
 * F45 B2b-3b-2b-2b-2b-2: die Freigabe zeigt den Auftragstext (detail.auftragstext), die Abnahmeseite den Rückfrage-Kanal des
 * Ausführungslaufs (kanalDerAbnahme, GET /api/laeufe/<laufId> über kanalDerSichtung), beide die Zeile zur abweichenden
 * Claude-Code-Version (zustand.projektCliHinweis, letzterProjektCliHinweis). Aufgeklappte Abschnitte (<details data-klappe>) der Seite
 * Entscheiden bleiben über das Neuzeichnen offen (setzeHtml).
 *
 * F45 B2b-4a-2b-2 (F-979, F-1087, F-1157): die Karte „Wo gearbeitet wird“ steht auf der Abnahme- und — bei ABGESCHLOSSEN/GESTOPPT —
 * auf der Ablaufseite und trägt den Abschnitt „Bereit zum Sichern“ (views/ablauf-sichern-anzeige.js); Stand je Ablauf über
 * ablauf-code-stand.js (GET …/code?workflow=<id>, je Neuladen-Schlüssel einmal, nur auf der Detailroute, nie aus dem Poll). Kopieren
 * und Aktualisieren über behandleEntscheidenKlick.
 */

import {
  erhoeheBudget,
  holeAbnahme,
  holeHarnessAbgleich,
  holeLaufDetail,
  holeProjektAufruf,
  holeWorkflowDetail,
  raeumeArbeitsordnerAuf,
  reicheWorkflowFassungEin,
  sendeAbnahme,
  sendeEinrichtung,
  sendeFaehigkeitVorschlag,
  sendeWorkflowArchitekturEntscheidung,
  sendeWorkflowFreigabe,
  starteWorkflowSchritt,
  stoppeWorkflow,
  wiederholePruefer,
  wiederholeWorkflowPruefung,
} from '../api.js'
import { ablaufCodeStand, abonniereAblaufCodeStand, ladeAblaufCodeStand, stelleAblaufCodeStandSicher } from '../ablauf-code-stand.js'
import { kopiereBefehlsblock } from '../befehlsblock.js'
import { abonniereCodeStand, aktuellerCodeStand, ladeCodeStand } from '../code-stand.js'
import { bindeEmpfehlungInstallation } from '../empfehlung-installation.js'
import { abnahmeLaesstUebernehmenZu, faehigkeitVorschlagKennung, vorschlagErfolg, vorschlagSchluessel } from '../faehigkeit-vorschlag-anzeige.js'
import { formatiereZahl, t, tHtml } from '../i18n.js'
import { abonniereProjektWechsel, holeAktivesProjekt } from '../projekt-kontext.js'
import { ersetzeListeMitFokus, escapeHtml } from '../render.js'
import { ersetzeRoute, navigiere, registriere } from '../router.js'
import { baueSichtungsFassung, istSichtungsHaltAnzeige } from '../sichtung-anzeige.js'
import { abonniere, abonniereDetailAuffrischer, pollJetzt } from '../zustand.js'
import { aufraeumenArt, behandleSichernKlick, sichernFuerAblauf } from './ablauf-sichern-anzeige.js'
import { renderArbeitsordnerAktion, renderArbeitsordnerKarte, renderAufraeumenDialog } from './arbeitsordner-anzeige.js'
import { bedienZustand } from './entscheidung-panel.js'
import { abnahmeErfolg, abnahmeLage, ausfuehrungGelaufen, budgetKennung, pruefWertText, qaHinweisKennung, renderAbnahme, renderAbnahmeBlick, reviewHinweisKennung, umfangKennung } from './workflow-abnahme.js'
import { lageBadge, ordneSchritteNachPlan, renderAktionen, renderAufEinenBlick, renderTechnik, renderTimeline, renderWorkflowListe, renderWorkflowUngueltig, seitenTitel } from './workflow-detail.js'
import { baueReparaturEntwurf, ermittleReparaturWarnungen, renderDialogInhalt, renderEingriffe, renderReparatur, renderReparaturWarnungen, renderSichtungR3Schritt, sichtungsAbweichung } from './workflow-eingriffe.js'
import { entscheidungsModus, FREIGABE_OPTIONEN, renderFreigabePanel, renderFreigabeSeite, seitenKopf } from './workflow-entscheiden.js'

/** HTML der zuletzt gerenderten Liste „Aufträge“ — ein Poll-Tick schreibt sie nur bei geändertem Inhalt neu, sonst ginge der Tastaturfokus einer Zeile alle zwei Sekunden verloren. */
let letzteListeHtml = null

/** zustand.workflows des letzten Poll-Ticks (oder null) — liefert den Titel (ziel) eines Details schon vor seiner eigenen Antwort. */
let letzteWorkflows = null

/** Rendert die Liste „Aufträge“ aus dem Zustands-Aggregat (F20 WS-2) — Abnehmer des einen Poll-Timers in zustand.js, kein eigener fetch(). @param workflows - zustand.workflows aus GET /api/zustand, oder null bei defekter Quelle */
function renderWorkflows(workflows) {
  letzteWorkflows = Array.isArray(workflows) ? workflows : null
  const html = renderWorkflowListe(workflows)
  if (html === letzteListeHtml) return
  letzteListeHtml = html
  ersetzeListeMitFokus(document.getElementById('workflows'), html, '.workflow-zeile', 'workflowId')
}

/**
 * F-234: welche lauf_id gerade WIRKLICH fliegt, aus dem aktiv-Feld von
 * GET /api/laeufe/<laufId> (D13) — bewusst nicht aus dem Schrittstatus
 * abgeleitet. Gefragt wird nur für Schritte auf LAEUFT.
 * @param eintraege - Ergebnis von ordneSchritteNachPlan
 * @returns Menge der lauf_id, die der Server als aktiv meldet
 */
async function ermittleAktiveLaufIds(eintraege) {
  const aktive = new Set()
  for (const { schritt } of eintraege) {
    if (schritt.status !== 'LAEUFT' || typeof schritt.lauf_id !== 'string') continue
    try {
      const antwort = await holeLaufDetail(schritt.lauf_id)
      if (!antwort.ok) {
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

/** F45 B2b-3b-2b-2a-3 (Advisor M8): rueckfrageKanal je Lauf eines F-760-Halts — nur bei ABGESCHLOSSEN gemerkt (Terminalmarke fest). */
const kanalJeLauf = new Map()
/** Läufe, deren Abruf scheiterte ⇒ Zeitpunkt (ms), ab dem neu versucht wird (qa 4: kein schwerer Abruf je Takt). */
const kanalFehlerBis = new Map()
/** Rückzug nach einem gescheiterten Abruf. */
const KANAL_RUECKZUG_MS = 30000
/** F45 B2b-3b-2b-2b-1 (qa 7): Ergebnis von kanalDerSichtung, wenn das Lauf-Detail nicht ladbar ist — die Sichtung sperrt dann die Bestätigung (fail closed). */
const KANAL_NICHT_LADBAR = Symbol('kanal-nicht-ladbar')
/** Laufende Abrufe je Lauf (laufId → Promise). */
const kanalAbrufe = new Map()

/**
 * rueckfrageKanal des Laufs eines F-760-Halts für die Sichtungs-Notiz: gemerkt ⇒ sofort; sonst GET /api/laeufe/<laufId> — der Aufrufer
 * wartet darauf, bevor er die Bedienung zeichnet (code-reviewer 1: sonst änderte das Nachladen das Kennzeichen und schlösse einen offenen
 * Sichtungs-Dialog). Fehler ⇒ KANAL_NICHT_LADBAR (Standardsatz, Bestätigung gesperrt) und 30 s Rückzug für diesen Lauf.
 * @param laufId - Lauf des VERWEIGERT-Schritts
 * @returns Promise<rueckfrageKanal | null | KANAL_NICHT_LADBAR>
 */
function kanalDerSichtung(laufId) {
  if (kanalJeLauf.has(laufId)) return Promise.resolve(kanalJeLauf.get(laufId))
  if ((kanalFehlerBis.get(laufId) ?? 0) > Date.now()) return Promise.resolve(KANAL_NICHT_LADBAR)
  // code-reviewer Nachpass A(a): ein laufender Abruf je Lauf — weitere Takte warten auf denselben statt einen neuen zu starten.
  if (!kanalAbrufe.has(laufId)) kanalAbrufe.set(laufId, holeKanalDerSichtung(laufId).finally(() => kanalAbrufe.delete(laufId)))
  return kanalAbrufe.get(laufId)
}

/**
 * Ein Abruf des Lauf-Details für kanalDerSichtung; wirft nie.
 * @param laufId - Lauf
 * @returns Promise<rueckfrageKanal | null | KANAL_NICHT_LADBAR>
 */
async function holeKanalDerSichtung(laufId) {
  try {
    const antwort = await holeLaufDetail(laufId)
    if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`)
    const detail = await antwort.json()
    const kanal = detail?.rueckfrageKanal ?? null
    if (detail?.laufStatus?.status === 'ABGESCHLOSSEN') kanalJeLauf.set(laufId, kanal)
    return kanal
  } catch (fehler) {
    kanalFehlerBis.set(laufId, Date.now() + KANAL_RUECKZUG_MS)
    console.error(`[leitstand] Rückfrage-Kanal von Lauf '${laufId}' nicht ladbar: ${fehler.message}`)
    return KANAL_NICHT_LADBAR
  }
}

/** F45 B2b-3b-2b-2b-2b-2 (F-1146): Kanal des Ausführungslaufs der Abnahmeseite { laufId, wert, laeuft } — wert { laedt, laufId }, { fehler, laufId }, null oder rueckfrageKanal; laeuft: ein Abruf ist unterwegs. */
let kanalAbnahme = null

/**
 * Rückfrage-Kanal des Ausführungslaufs für die Abnahmeseite (Lage „entscheidbar“): einmal je Lauf geladen (kanalDerSichtung: gemerkt bei
 * ABGESCHLOSSEN, ein Abruf je Lauf), danach zeichnet die Abnahme neu; nach einem Fehler erst wieder nach dem Rückzug (KANAL_RUECKZUG_MS) —
 * während dieses Neuversuchs bleibt der Fehlerhinweis stehen (code-reviewer V2: kein Flackern, kein Neuzeichnen ohne Änderung).
 * @param workflowId - angezeigter Workflow
 * @param abnahme - Antwort von GET …/abnahme
 * @returns undefined (kein Ausführungslauf) | { laedt: true, laufId } | null (Lauf ohne Kanal) | { fehler: true, laufId } | rueckfrageKanal
 */
function kanalDerAbnahme(workflowId, abnahme) {
  const laufId = abnahmeLage(abnahme) === 'entscheidbar' ? abnahme.aenderungsuebersicht?.laufId : undefined
  if (typeof laufId !== 'string' || laufId === '') return undefined
  const gleich = kanalAbnahme?.laufId === laufId
  const erneut = gleich && kanalAbnahme.wert?.fehler === true && !kanalAbnahme.laeuft && (kanalFehlerBis.get(laufId) ?? 0) <= Date.now()
  if (gleich && !erneut) return kanalAbnahme.wert
  kanalAbnahme = { laufId, wert: erneut ? kanalAbnahme.wert : { laedt: true, laufId }, laeuft: true }
  void kanalDerSichtung(laufId).then((kanal) => {
    if (kanalAbnahme?.laufId !== laufId) return
    kanalAbnahme = { laufId, wert: kanal === KANAL_NICHT_LADBAR ? { fehler: true, laufId } : kanal, laeuft: false }
    if (gewaehlteWorkflowId === workflowId && letzteAbnahme !== null) aktualisiereAbnahme(workflowId, letzteAbnahme)
  })
  return kanalAbnahme.wert
}

/** F45 B2b-3b-2b-2b-2b-2: projektCliHinweis des letzten Poll-Ticks (null in der Workforce-Instanz oder ohne Abweichung). */
let letzterProjektCliHinweis = null

// ─── Abnahme (F23 WS-2a/2b, F44 WS-4b; Rendern in ./workflow-abnahme.js) ─────

/** Kennzeichen der zuletzt gerenderten Abnahme — nur bei ECHTER Änderung wird neu gebaut, sonst ginge eine angefangene Pflichtbegründung durch den 2-Sekunden-Poll verloren. */
let abnahmeKennzeichen = null

/** Antwort von GET …/abnahme des offenen Workflows (für „Auf einen Blick“), oder null. */
let letzteAbnahme = null

/** Eingabe der letzten Darstellung von „Auf einen Blick“ ({ daten, naechster, geordnet, projektName }), oder null. */
let letzterBlick = null

/** Zeichnet „Auf einen Blick“ aus dem letzten Detail und der letzten Abnahme (die Abnahme kommt über einen eigenen Endpunkt, oft nach dem Detail). */
function zeichneBlick() {
  if (letzterBlick === null) return
  document.getElementById('workflow-blick').innerHTML = renderAufEinenBlick(letzterBlick) + renderAbnahmeBlick(letzteAbnahme)
}

/** workflowId einer laufenden Abnahme-Bedienung, oder null — sperrt den ganzen Abnahmebereich (genau ein POST) und das Neu-Rendern, bis die Antwort da ist. */
let laufendeAbnahme = null

/** F45 FB-2 (Entscheidung Stefan, zweistufig): Schlüssel des Vorschlags in der Stufe „Wirklich verwerfen?“ (vorschlagSchluessel), oder null. */
let verwerfenOffen = null

/** Zeitpunkt (ms), seit dem die Stufe offen ist — „Wirklich verwerfen?“ zählt erst danach (Doppelklick, gehaltene Taste; qa 2, cr 2). */
let verwerfenOffenSeit = 0

/** Mindestzeit zwischen dem Öffnen der Stufe und der Bestätigung (länger als Doppelklick und Verzögerung der Tastenwiederholung). */
const VERWERFEN_SPERRE_MS = 700

/**
 * Rendert die Abnahme (Abschnitt über der Timeline bzw. Block oder Zeile darunter), aber nur bei
 * ECHTER Änderung und nicht während einer laufenden Abnahme-Bedienung. Wird bei gleichem Workflow neu
 * gebaut, steht eine angefangene Begründung danach wieder im Feld (samt Fokus). Die Meldung steht beim
 * Abschnitt über der Timeline nur in der Lage „entscheidbar“, sonst beim Block bzw. der Zeile darunter.
 * @param workflowId - angezeigter Workflow
 * @param abnahme - Antwort von GET …/abnahme
 */
function aktualisiereAbnahme(workflowId, abnahme) {
  letzteAbnahme = abnahme
  zeichneBlick()
  // F46 D2: „Produkt öffnen“ braucht die Vorschau des Projekts — einmal je Workflow, sobald die Abnahme entscheidbar ist.
  if (abnahmeLage(abnahme) === 'entscheidbar' && letzteVorschau?.workflowId !== workflowId) void ladeVorschau(workflowId)
  const vorschau = letzteVorschau?.workflowId === workflowId ? letzteVorschau.wert : null
  // F45 B1b-2 (Beleg 12, F-937): Harness-Abgleich samt Kurzliste — einmal je Stand, sobald die Ausführung gelaufen ist.
  const schluessel = abgleichSchluessel(workflowId, abnahme)
  if (ausfuehrungGelaufen(abnahme) && letzterAbgleich?.schluessel !== schluessel) void ladeAbgleich(workflowId, schluessel)
  const abgleich = letzterAbgleich?.schluessel === schluessel ? letzterAbgleich.wert : undefined
  const abgleichMarke = abgleich === undefined ? 'laedt' : typeof abgleich.fehler === 'string' ? 'fehler' : `${abgleich.quelle}:${abgleich.daten?.berechnet_am ?? '-'}`
  // F45 B2b-3b-2b-2b-2b-2 (F-1146): Kanal des Ausführungslaufs und die CLI-Zeile gehören ins Kennzeichen (nachgeladen bzw. aus dem Poll).
  const kanal = kanalDerAbnahme(workflowId, abnahme)
  // F45 FB-2 (qa 9): eine Stufe „Wirklich verwerfen?“ zu einem Vorschlag, den es so nicht mehr gibt (anderer Hash, verworfen), verfällt.
  const vorschlaege = Array.isArray(abnahme.faehigkeitVorschlaege) ? abnahme.faehigkeitVorschlaege : []
  if (verwerfenOffen !== null && !vorschlaege.some((v) => vorschlagSchluessel(workflowId, v) === verwerfenOffen)) verwerfenOffen = null
  const zusatzMarke = `${kanal === undefined ? '-' : JSON.stringify(kanal)}|${JSON.stringify(letzterProjektCliHinweis)}|${faehigkeitVorschlagKennung(abnahme)}|${verwerfenOffen ?? '-'}`
  const e = abnahme.entscheidung ?? {}
  // F45 B2a-3b (qa 1): die Review-Hinweise (u. a. „Review veraltet“, das der Poll ohne Statuswechsel liefert) gehören ins
  // Kennzeichen — sonst zeigte „Auf einen Blick“ den Hinweis, die Review-Kachel aber nicht.
  const kennzeichen = `${workflowId}|${abnahme.workflowStatus}|${abnahme.freigabeHalt ? 'halt' : '-'}|${e.status}|${e.versionSequenz ?? '-'}|${abnahme.urteil?.status}|${abnahme.urteil?.laufId ?? '-'}|${abnahme.aenderungsuebersicht?.status}|${abnahme.pruefergebnis?.status ?? 'null'}|${abnahme.pruefergebnis?.ergebnis ?? 'null'}|${JSON.stringify(vorschau)}|${abgleichMarke}|${reviewHinweisKennung(abnahme.urteil)}|${abnahme.reviewWiederholbar === true}|${abnahme.qaErgebnis?.status ?? 'null'}|${abnahme.qaErgebnis?.laufId ?? '-'}|${abnahme.qaErgebnis?.halt === true}|${qaHinweisKennung(abnahme.qaErgebnis)}|${abnahme.qaWiederholbar === true}|${budgetKennung(abnahme.budget)}|${umfangKennung(abnahme.umfang)}|${zusatzMarke}`
  if (kennzeichen === abnahmeKennzeichen || laufendeAbnahme === workflowId) {
    zeichneEntscheiden()
    return
  }
  let html
  try {
    html = renderAbnahme(workflowId, abnahme, vorschau, abgleich, { kanal, projektCliHinweis: letzterProjektCliHinweis, verwerfenOffen })
  } catch (fehler) {
    // Eine unvollständige Projektion bricht nur die Anzeige ab; der nächste Tick versucht es erneut.
    console.error(`[workflows] Abnahme von '${workflowId}' nicht darstellbar:`, fehler)
    return
  }
  const gleicherWorkflow = abnahmeKennzeichen?.startsWith(`${workflowId}|`) === true
  abnahmeKennzeichen = kennzeichen
  const container = document.getElementById('workflow-abnahme')
  const stand = document.getElementById('workflow-abnahme-stand')
  const altesFeld = document.getElementById('wf-abnahme-begruendung')
  const angefangen = gleicherWorkflow && altesFeld !== null ? (altesFeld.value ?? '') : ''
  const hatteFokus = altesFeld !== null && document.activeElement === altesFeld
  // F45 FB-2 (qa 5, cr 11): ein Knopf der Vorschlagskarte behält beim Neuzeichnen den Fokus (gleiche Aktion, gleicher Vorschlag).
  const fokusVorschlag = document.activeElement?.closest?.('.wf-faehigkeit-vorschlag')?.dataset ?? null
  container.innerHTML = html.oben
  stand.innerHTML = html.unten
  if (fokusVorschlag !== null) {
    for (const k of document.querySelectorAll('.wf-faehigkeit-vorschlag')) {
      if (k.dataset.aktion === fokusVorschlag.aktion && k.dataset.typ === fokusVorschlag.typ && k.dataset.name === fokusVorschlag.name) k.focus()
    }
  }
  // F46 D2: in der Lage „entscheidbar“ steht die Entscheidung in der Spalte „Deine Entscheidung“.
  setzePanel('abnahme', html.spalte ?? '', workflowId)
  const panel = document.getElementById('workflow-entscheidung')
  // Außerhalb von #workflow-ablauf (qa 2): der Weg klappt im Entscheidungsmodus zu — eine Meldung darin
  // (etwa nach „Anpassung anfordern“, das in einen Freigabe-Halt führt) wäre samt Fokus unsichtbar.
  ;(html.lage === 'entscheidbar' ? panel : container).after?.(document.getElementById('workflow-abnahme-meldung'))
  const neuesFeld = document.getElementById('wf-abnahme-begruendung')
  if (angefangen !== '' && neuesFeld !== null && (panel.contains(neuesFeld) || stand.contains(neuesFeld))) {
    neuesFeld.value = angefangen
    if (hatteFokus) neuesFeld.focus()
  }
  aktualisierePanelKnopf()
  zeichneEntscheiden()
}

// ─── Seite Entscheiden (F46 D2; Rendern in ./workflow-entscheiden.js, ./entscheidung-panel.js) ────

/** Vorschau des Projekts für „Produkt öffnen“: { workflowId, wert } — wert null (lädt), { fehler: true } oder VorschauStatus. */
let letzteVorschau = null

/**
 * F45 B1b-2 (Beleg 12): Harness-Abgleich des angezeigten Ablaufs { workflowId, schluessel, wert } — wert undefined
 * (lädt), { fehler } oder Antwort von GET …/harness-abgleich. Nicht gepollt: neu geladen nur, wenn sich der Stand
 * (Ausführungs- und Review-Lauf, Prüfergebnis samt Version, Workflow-Status) ändert.
 */
let letzterAbgleich = null

/**
 * Schlüssel des Stands, zu dem ein Harness-Abgleich gehört.
 * @param workflowId - Kennung @param abnahme - Antwort von GET …/abnahme
 * @returns Schlüssel
 */
function abgleichSchluessel(workflowId, abnahme) {
  const p = abnahme.pruefergebnis ?? {}
  return `${workflowId}|${abnahme.workflowStatus}|${abnahme.aenderungsuebersicht?.laufId ?? '-'}|${abnahme.urteil?.laufId ?? '-'}|${p.status ?? '-'}|${p.ergebnis ?? '-'}|${p.versionSequenz ?? '-'}`
}

/**
 * Lädt den Harness-Abgleich einmal je Stand und zeichnet danach die Abnahme neu (er ist Teil ihres Kennzeichens).
 * Eine Antwort zu einem inzwischen anderen Ablauf oder Stand wird verworfen.
 * @param workflowId - angezeigter Workflow @param schluessel - abgleichSchluessel
 */
async function ladeAbgleich(workflowId, schluessel) {
  letzterAbgleich = { workflowId, schluessel, wert: undefined }
  let wert
  try {
    wert = await holeHarnessAbgleich(workflowId)
  } catch (fehler) {
    console.error(`[workflows] Harness-Abgleich von '${workflowId}' nicht ladbar: ${fehler.message}`)
    wert = { fehler: fehler.message }
  }
  if (gewaehlteWorkflowId !== workflowId || letzterAbgleich?.schluessel !== schluessel) return
  letzterAbgleich = { workflowId, schluessel, wert }
  if (letzteAbnahme !== null) aktualisiereAbnahme(workflowId, letzteAbnahme)
}

/**
 * Lädt die Vorschau des aktiven Projekts (GET /api/projekte/<id>/projekt-aufruf, F43) einmal je
 * Workflow und zeichnet danach die Abnahme neu (die Vorschau ist Teil ihres Kennzeichens).
 * @param workflowId - angezeigter Workflow
 */
async function ladeVorschau(workflowId) {
  letzteVorschau = { workflowId, wert: null }
  let wert
  try {
    const daten = await holeProjektAufruf(holeAktivesProjekt().id)
    wert = daten?.vorschau ?? { fehler: true }
  } catch (fehler) {
    console.error(`[workflows] Vorschau für „Produkt öffnen“ nicht ladbar: ${fehler.message}`)
    wert = { fehler: true }
  }
  if (gewaehlteWorkflowId !== workflowId || letzteVorschau?.workflowId !== workflowId) return
  letzteVorschau = { workflowId, wert }
  if (letzteAbnahme !== null) aktualisiereAbnahme(workflowId, letzteAbnahme)
}

/** Art der Spalte „Deine Entscheidung“ ('freigabe' | 'abnahme') oder null, dazu die Grundlage, unter der eine Auswahl und Begründung beim Neuzeichnen erhalten bleiben. */
let panelArt = null
let panelBasis = null

/**
 * Schreibt die Spalte „Deine Entscheidung“ einer Art; '' leert sie nur, wenn sie gerade diese Art
 * zeigt (Freigabe und Abnahme kommen aus zwei Quellen). Bei gleicher Art und Grundlage bleiben die
 * gewählte Option, die angefangene Begründung und der Fokus erhalten.
 * @param art - 'freigabe' | 'abnahme'
 * @param html - Inhalt oder ''
 * @param basis - Grundlage (Freigabe: Bedienungs-Kennzeichen ohne Empfehlung; Abnahme: workflowId)
 */
function setzePanel(art, html, basis) {
  const panel = document.getElementById('workflow-entscheidung')
  if (html === '') {
    if (panelArt === art) {
      panel.innerHTML = ''
      panelArt = null
      panelBasis = null
    }
    return
  }
  const bewahren = panelArt === art && panelBasis === basis
  const altesFeld = panel.querySelector('textarea')
  const text = bewahren && altesFeld !== null ? altesFeld.value : ''
  const option = bewahren ? (panel.querySelector('input[type="radio"]:checked')?.value ?? null) : null
  const aktiv = panel.contains(document.activeElement) ? document.activeElement : null
  const fokus = aktiv === null ? null : aktiv.tagName === 'TEXTAREA' ? 'textarea' : aktiv.matches('input[type="radio"]') ? `input[value="${aktiv.value}"]` : '.entscheidung-absenden'
  panel.innerHTML = html
  panelArt = art
  panelBasis = basis
  const feld = panel.querySelector('textarea')
  if (feld !== null) feld.value = text
  if (option !== null) {
    const radio = [...panel.querySelectorAll('input[type="radio"]')].find((r) => r.value === option && !r.disabled)
    if (radio !== undefined) radio.checked = true
  }
  aktualisierePanelKnopf()
  if (fokus !== null) panel.querySelector(fokus)?.focus()
}

/** Setzt den Knopf der Spalte nach Auswahl und Begründung (gesperrt, bis beides da ist; Text „<Option> bestätigen“). */
function aktualisierePanelKnopf() {
  const panel = document.getElementById('workflow-entscheidung')
  const knopf = panel.querySelector('.entscheidung-absenden')
  if (knopf === null) return
  const radio = panel.querySelector('input[type="radio"]:checked')
  const gewaehlt = radio === null ? null : { wert: radio.value, bestaetigen: radio.dataset.bestaetigen, erlaubt: !radio.disabled }
  const zustand = bedienZustand(gewaehlt, panel.querySelector('textarea')?.value ?? '')
  // Während einer laufenden Abnahme-Bedienung bleibt alles gesperrt (genau ein POST).
  knopf.disabled = zustand.gesperrt || laufendeAbnahme !== null
  knopf.textContent = zustand.text
  if (panelArt === 'abnahme') knopf.dataset.aktion = zustand.aktion
  else knopf.dataset.option = zustand.aktion
}

/** Modus der zuletzt gezeichneten Seite ('freigabe' | 'abnahme' | null). */
let modus = null

/** true, wenn das offene Detail aus „Deine Entscheidungen“ geöffnet wurde (Rückweg per history.back()). */
let detailAusAttention = false

/**
 * Text eines Elements nur bei Änderung setzen (der Poll zeichnet sonst alle zwei Sekunden neu). F45 B2b-3b-2b-2b-2b-2: aufgeklappte
 * Abschnitte (<details data-klappe>, z. B. „Ganzen Auftrag anzeigen“) bleiben nach dem Neuzeichnen offen.
 * @param id - Element-id @param html - neuer Inhalt (HTML) @returns das Element
 */
function setzeHtml(id, html) {
  const element = document.getElementById(id)
  if (element.dataset.html !== html) {
    const offen = new Set([...(element.querySelectorAll?.('details[data-klappe][open]') ?? [])].map((d) => d.dataset.klappe))
    element.innerHTML = html
    element.dataset.html = html
    for (const klappe of element.querySelectorAll?.('details[data-klappe]') ?? []) if (offen.has(klappe.dataset.klappe)) klappe.open = true
  }
  return element
}

/**
 * Zeichnet die Seite je Modus (F46 D2): Kopf (Art · Eintrag, Frage, Einleitung, Status), die
 * Hauptspalte der Freigabe, die Spalte „Deine Entscheidung“ und die Lage von „Der Weg zum Ergebnis“
 * (beim Wechsel in einen Entscheidungsmodus zugeklappt, samt „Auf einen Blick“; ohne Modus
 * aufgeklappt, „Auf einen Blick“ rechts). Aus dem aktuellen Detail und der letzten Abnahme.
 */
function zeichneEntscheiden() {
  if (aktuellesDetail === null) return
  const { workflowId, daten, naechster } = aktuellesDetail
  const modusNeu = entscheidungsModus(aktuellesDetail, letzteAbnahme)
  const kopf = seitenKopf(modusNeu, seitenTitel(daten.ziel, workflowId), letzteAbnahme)
  const titel = document.getElementById('workflow-detail-titel')
  if (titel.textContent !== kopf.titel) titel.textContent = kopf.titel
  setzeHtml('workflow-detail-eyebrow', kopf.art === null ? tHtml('ablauf.eyebrow') : `${escapeHtml(kopf.art)} · <span class="eyebrow-eintrag" title="${escapeHtml(kopf.eintrag)}">${escapeHtml(kopf.eintrag)}</span>`)
  setzeHtml('workflow-detail-beschreibung', escapeHtml(kopf.beschreibung))
  const status = setzeHtml('workflow-detail-status', modusNeu === null ? '' : `${lageBadge(daten.status ?? null, naechster)} <span class="subtle">· ${tHtml('entscheiden.status.du')}</span>`)
  status.hidden = modusNeu === null
  // F45 B1a-1: offene Änderungen des Projektordners aus der Leseroute …/code (nie aus dem Poll; einmal je Projekt).
  if (modusNeu === 'freigabe' && aktuellerCodeStand().zustand === 'leer') void ladeCodeStand()
  // F45 B1a-1 (QA-Pass, Befund 3): auf der Abnahme-Seite die Karte des Arbeitsordners offen — dort liegt das Ergebnis.
  // F45 B2b-4a-2b-2: dazu auf der Ablaufseite eines beendeten Ablaufs; in der Karte der Abschnitt „Bereit zum Sichern“, ihr Knopf
  // entfällt (Aufräumen steht genau einmal: unter den Aktionen, V3).
  const mitKarte = modusNeu === 'abnahme' || (modusNeu === null && BEENDETE_STATUS.has(daten.status))
  const ordnerKontext = { workflowId, workflowStatus: daten.status ?? null, abnahmeOffen: istAbnahmeOffen(daten.status ?? null), loeschliste: letzteAbnahme?.aenderungsuebersicht?.daten?.loeschliste ?? null }
  const karte = () => renderArbeitsordnerKarte(aktuellesDetail.arbeitsordner ?? null, aktuellerCodeStand(), { ...ordnerKontext, sichernHtml: sichernHtmlDerKarte(), ohneKnopf: true })
  // F45 FB-2 (qa 1): der Hinweis „ungesichert“ auch auf der Freigabe-Seite — der Weg mit der Abnahme-Karte ist dort zugeklappt.
  const faehigkeitUngesichert = letzteAbnahme?.workflowId === workflowId ? letzteAbnahme.faehigkeitUngesichert : undefined
  setzeHtml(
    'workflow-entscheiden',
    modusNeu === 'freigabe' ? renderFreigabeSeite({ ...aktuellesDetail, codeStand: aktuellerCodeStand(), projektCliHinweis: letzterProjektCliHinweis, faehigkeitUngesichert }) : mitKarte ? karte() : ''
  )
  document.getElementById('workflow-entscheidung').hidden = modusNeu === null || panelArt !== modusNeu
  document.getElementById('workflow-detail').classList.toggle('entscheiden-modus', modusNeu !== null)
  document.getElementById('workflow-detail').classList.toggle('entscheiden-abnahme', modusNeu === 'abnahme')
  if (modusNeu !== modus) {
    modus = modusNeu
    // Beim Wechsel (nicht bei jedem Tick): der Weg klappt im Entscheidungsmodus zu, sonst auf; „Auf einen Blick“ zieht mit.
    document.getElementById('workflow-ablauf').open = modusNeu === null
    const blick = document.getElementById('workflow-blick')
    if (modusNeu === null) document.getElementById('workflow-seitenspalte').append?.(blick)
    else document.getElementById('workflow-blick-ablauf').append?.(blick)
  }
  // Bei jedem Zeichnen (auch beim zweiten Besuch desselben Details, den der Router mit „Ausführungen“
  // markiert), aber nur auf der Detailroute — lädt der Auffrischer das Detail auf einer anderen Seite
  // nach, bleibt deren Markierung unangetastet (cr 1, qa 1).
  if (/^#\/workflows\/[^/]+$/.test(location.hash ?? '')) markiereNav(modusNeu)
  aktualisiereZurueck()
  heileSpalte(modusNeu)
}

/** Workflow-Status eines beendeten Ablaufs (Karte mit „Bereit zum Sichern“ auch ohne Entscheidungsmodus). */
const BEENDETE_STATUS = new Set(['ABGESCHLOSSEN', 'GESTOPPT'])

/**
 * F45 B2b-4a-2b-2 (F-1087, F-1157 (4)): Abschnitt „Bereit zum Sichern“ der Karte für das aktuelle Detail (sichernFuerAblauf). Der
 * Stand kommt je Neuladen-Schlüssel (V1) höchstens einmal — der Poll zeichnet neu, ruft aber nicht erneut ab; abgerufen wird nur auf
 * der Detailroute (der Auffrischer lädt das Detail auch auf anderen Seiten nach, Advisor 5), sonst nur gelesen.
 * @returns HTML
 */
function sichernHtmlDerKarte() {
  const { workflowId, daten, arbeitsordner } = aktuellesDetail
  const aufDetail = /^#\/workflows\/[^/]+$/.test(location.hash ?? '')
  const status = daten.status ?? null
  return sichernFuerAblauf({
    workflowId,
    detail: aktuellesDetail,
    aufraeumen: { art: aufraeumenArt({ workflowStatus: status, ao: arbeitsordner, abnahmeOffen: istAbnahmeOffen(status) }) },
    stelle: aufDetail ? stelleAblaufCodeStandSicher : ablaufCodeStand,
  }).html
}

/**
 * F45 B2b-4a-2b-2: Klicks in #workflow-entscheiden außerhalb von .wf-aktion — „Kopieren“ eines Befehlsblocks (nur Zwischenablage)
 * und „Aktualisieren“ des Abschnitts „Bereit zum Sichern“ (eine Regel mit dem Workboard: behandleSichernKlick).
 * @param ereignis - Klick-Ereignis
 * @param abh - { kopiere: (knopf) => Promise, aktualisiere: (workflowId) => Promise }
 * @returns true, wenn der Klick behandelt wurde
 */
export function behandleEntscheidenKlick(ereignis, abh) {
  return behandleSichernKlick(ereignis, abh)
}

/** true, solange heileSpalte neu zeichnet (kein Wiedereintritt über aktualisiereAbnahme → zeichneEntscheiden). */
let heiltSpalte = false

/**
 * Hält die Spalte „Deine Entscheidung“ beim Modus (qa 7): eine verspätete Abnahme-Antwort kann die
 * Spalte einer Freigabe überschrieben haben (und umgekehrt). Dann wird die passende Spalte aus dem
 * aktuellen Stand neu gebaut, statt auf die nächste echte Änderung zu warten.
 * @param modusJetzt - Modus der Seite
 */
function heileSpalte(modusJetzt) {
  if (heiltSpalte || modusJetzt === null || panelArt === modusJetzt) return
  heiltSpalte = true
  try {
    if (modusJetzt === 'freigabe') {
      const d = aktuellesDetail
      bedienungsKennzeichen = null
      aktualisiereWorkflowBedienung(d.workflowId, d.daten.status ?? null, d.naechster, d.ungueltig, d.architekturEntscheidung, d.empfehlung, d.sichtung, d.arbeitsordner ?? null, d.prueferWiederholbar === true, d.budget ?? null)
      document.getElementById('workflow-entscheidung').hidden = panelArt !== 'freigabe'
    } else if (letzteAbnahme !== null) {
      abnahmeKennzeichen = null
      aktualisiereAbnahme(aktuellesDetail.workflowId, letzteAbnahme)
    }
  } finally {
    heiltSpalte = false
  }
}

/**
 * „Wo bin ich?“ (Leitprinzip F46): auf der Seite Entscheiden markiert die Seitenleiste
 * „Entscheidungen“ statt „Ausführungen“ (die Route gehört technisch zur View runs, router.js);
 * ohne Modus gilt wieder die Markierung des Routers. Der nächste Routenwechsel setzt sie ohnehin neu.
 * @param modusJetzt - Modus der Seite
 */
function markiereNav(modusJetzt) {
  for (const link of document.querySelectorAll('#shell-nav [data-nav-view]')) {
    const soll = modusJetzt === null ? link.dataset.navView === 'runs' : link.dataset.navView === 'attention'
    if (link.dataset.navView !== 'runs' && link.dataset.navView !== 'attention') continue
    if (soll) link.setAttribute('aria-current', 'page')
    else link.removeAttribute('aria-current')
  }
}

/** Beschriftung des Rückwegs: „Deine Entscheidungen“, wenn das Detail von dort kam oder (ohne Herkunft aus der Liste) eine Entscheidung zeigt; sonst „Alle Aufträge“. */
function aktualisiereZurueck() {
  const zurAttention = detailAusAttention || (!detailAusListe && modus !== null)
  const text = zurAttention ? t('entscheiden.zurueck') : t('ablauf.zurueck')
  const element = document.getElementById('workflow-detail-zurueck')
  if (element.textContent !== text) element.textContent = text
}

/**
 * Zeigt eine Meldung (Text, nie HTML) oder blendet sie aus; keine Live-Region (eine Live-Region: die
 * Persona) — wo nötig, bekommt die Meldung danach den Fokus.
 * @param id - id des Meldungselements
 * @param text - anzuzeigender Text, oder null zum Ausblenden
 * @param art - 'fehler' (Vorgabe), 'erfolg' oder 'hinweis'
 */
function zeigeMeldung(id, text, art = 'fehler') {
  const anzeige = document.getElementById(id)
  if (anzeige === null) return
  anzeige.hidden = text === null
  if (text === null) return
  anzeige.className = art
  anzeige.textContent = text
}

/** Meldung am Ablauf (unter den Aktionen). @param text - Text oder null @param art - siehe zeigeMeldung */
const zeigeBedienungsMeldung = (text, art) => zeigeMeldung('workflow-bedienung-meldung', text, art)
/** Meldung der Abnahme. @param text - Text oder null @param art - siehe zeigeMeldung */
const zeigeAbnahmeMeldung = (text, art) => zeigeMeldung('workflow-abnahme-meldung', text, art)

/** @param sichtbar - false blendet die Abnahme bei einem Ladefehler des Details aus (Inhalt und Begründung bleiben, die Meldung verschwindet) */
function zeigeAbnahme(sichtbar) {
  for (const id of ['workflow-abnahme', 'workflow-abnahme-stand']) document.getElementById(id).hidden = !sichtbar
  if (!sichtbar) zeigeAbnahmeMeldung(null)
}

/**
 * Lädt GET …/abnahme separat vom Workflow-Detail (eigener Endpunkt, nicht Teil des
 * Zustands-Aggregats) und rendert die Abnahme — Überholschutz über den von ladeWorkflowDetail
 * durchgereichten istUeberholt (derselbe Render-Zyklus, kein zweiter Zähler).
 * @param workflowId - Kennung des angezeigten Workflows
 * @param istUeberholt - () => boolean aus ladeWorkflowDetail
 */
async function aktualisiereAbnahmeAbschnitt(workflowId, istUeberholt) {
  try {
    const abnahme = await holeAbnahme(workflowId)
    if (istUeberholt()) return
    aktualisiereAbnahme(workflowId, abnahme)
  } catch (fehler) {
    if (istUeberholt()) return
    console.error(`[leitstand] Abnahme-Projektion von '${workflowId}' nicht ladbar: ${fehler.message}`)
  }
}

/**
 * Schickt eine Abnahme-Bedienung (POST …/abnahme oder …/pruefung-wiederholen) und lädt danach GET
 * …/abnahme neu (die Entscheidung steht nicht im Zustands-Aggregat). Bis zur Antwort sind alle Knöpfe
 * und das Feld der Abnahme gesperrt (genau ein POST); Erfolg fokussiert die Meldung; eine Antwort zu
 * einem inzwischen geschlossenen Workflow wird verworfen.
 * @param workflowId - Kennung @param anfrage - () => Promise<Response> @param knopf - auslösender Button @param erfolgstext - (inhalt) => Text
 * @param fehlerFokus - F45 FB-2 (Advisor 12): true fokussiert die Meldung auch bei einem Fehler (Knopf in der Hauptspalte, Meldung
 *   in der Lage „entscheidbar“ hinter der Spalte „Deine Entscheidung“)
 */
async function sendeAbnahmeBedienung(workflowId, anfrage, knopf, erfolgstext, fehlerFokus = false) {
  if (laufendeAbnahme !== null) return
  zeigeAbnahmeMeldung(null)
  const bereich = [...document.querySelectorAll('#workflow-abnahme button, #workflow-abnahme-stand button, #workflow-entscheidung button, #workflow-entscheidung input, #wf-abnahme-begruendung')]
  const gesperrt = [knopf, ...bereich].filter((el, i, alle) => !el.disabled && alle.indexOf(el) === i)
  laufendeAbnahme = workflowId
  for (const el of gesperrt) el.disabled = true
  try {
    const antwort = await anfrage()
    const inhalt = await antwort.json().catch(() => ({}))
    if (gewaehlteWorkflowId !== workflowId) return
    laufendeAbnahme = null
    if (antwort.ok) {
      // F45 B2b-1a: erfolgstext darf { text, art } liefern — ein Teilerfolg erscheint dann nicht im Erfolgsstil.
      const meldung = erfolgstext(inhalt)
      if (typeof meldung === 'string') zeigeAbnahmeMeldung(meldung, 'erfolg')
      else zeigeAbnahmeMeldung(meldung.text, meldung.art)
      abnahmeKennzeichen = null
      const abnahme = await holeAbnahme(workflowId).catch((fehler) => {
        console.error(`[workflows] Abnahme von '${workflowId}' nach der Bedienung nicht ladbar: ${fehler.message}`)
        return null
      })
      if (abnahme !== null && gewaehlteWorkflowId === workflowId) aktualisiereAbnahme(workflowId, abnahme)
      document.getElementById('workflow-abnahme-meldung').focus()
    } else {
      zeigeAbnahmeMeldung(`${antwort.status}: ${inhalt.grund ?? t('ablauf.fehler.unbekannt')}`)
      if (fehlerFokus) document.getElementById('workflow-abnahme-meldung').focus()
    }
  } catch (fehler) {
    if (gewaehlteWorkflowId === workflowId) zeigeAbnahmeMeldung(t('ablauf.fehler.anfrage', { meldung: fehler.message }))
    if (fehlerFokus && gewaehlteWorkflowId === workflowId) document.getElementById('workflow-abnahme-meldung').focus()
  } finally {
    if (laufendeAbnahme === workflowId) laufendeAbnahme = null
    for (const el of gesperrt) el.disabled = false
    // Der Knopf der Spalte bleibt gesperrt, solange Auswahl oder Begründung fehlen.
    aktualisierePanelKnopf()
  }
  void pollJetzt()
}

// ─── Bedienung (Starten, Freigeben, Ablehnen, Stoppen) ──────────────────────

/**
 * Schickt EINE Bedienung und pollt danach außer der Reihe — auch nach einem Fehler (der Grund kann eine
 * veraltete Anzeige sein). Fehler werden gezeigt, nicht vorhergesagt (D13: ein 409 nennt den fremden
 * Lauf). Aus dem Dialog (imDialog): ein Fehler steht im Dialog, der offen bleibt; Erfolg schließt ihn,
 * die Meldung steht am Ablauf; ist der Dialog schon zu (Escape, Stand-Änderung), steht alles am Ablauf.
 * @param anfrage - () => Promise<Response> @param knopf - auslösender Button (gesperrt) @param erfolgstext - Text bei Erfolg @param imDialog - true aus #workflow-dialog
 * @param nachsendung - F45 B1a-1: true, wenn dies die einmalige Wiederholung nach der Arbeitsordner-Vorbereitung ist
 */
async function sendeWorkflowBedienung(anfrage, knopf, erfolgstext, imDialog = false, nachsendung = false) {
  // Die Antwort gehört zu GENAU diesem Workflow, Projekt und Dialog — wechselt eines, wird sie verworfen.
  const workflowBeimStart = gewaehlteWorkflowId
  const projektBeimStart = holeAktivesProjekt().id
  const dialogBeimStart = imDialog ? offenerDialog : null
  zeigeBedienungsMeldung(null)
  if (imDialog) zeigeDialogMeldung(null)
  // Im Dialog ist ALLES gesperrt (Knöpfe; Escape und Wiederöffnen über laufendeDialogBedienung): genau ein POST.
  const knoepfe = imDialog ? [...document.getElementById('workflow-dialog').querySelectorAll('button')] : [knopf]
  const meineBedienung = imDialog ? { workflowId: workflowBeimStart } : null
  if (imDialog) laufendeDialogBedienung = meineBedienung
  for (const k of knoepfe) k.disabled = true
  const giltNoch = () => gewaehlteWorkflowId === workflowBeimStart && holeAktivesProjekt().id === projektBeimStart
  const unserDialogOffen = () => imDialog && offenerDialog === dialogBeimStart && dialogOffen()
  try {
    const antwort = await anfrage()
    const inhalt = await antwort.json().catch(() => ({}))
    if (!giltNoch()) {
      console.info(`[workflows] Antwort zu '${workflowBeimStart}' verworfen — Ansicht oder Projekt inzwischen gewechselt (HTTP ${antwort.status}).`)
    } else if (antwort.status === 202 && inhalt.vorbereitung === true) {
      // F45 B1a-1: der eigene Arbeitsordner wird erst vorbereitet — nichts ist festgehalten oder gestartet. Sobald er
      // BEREIT ist, sendet pruefeAusstehendeVorbereitung genau dieselbe Anfrage genau einmal erneut (nur bei
      // unveränderter Fassung).
      if (unserDialogOffen()) schliesseDialog()
      ausstehendeVorbereitung = nachsendung ? null : { workflowId: workflowBeimStart, projektId: projektBeimStart, versionSequenz: inhalt.versionSequenz ?? null, anfrage, erfolgstext }
      zeigeBedienungsMeldung(nachsendung ? t('arbeitsordner.meldung.nochNichtBereit') : t('arbeitsordner.meldung.vorbereitung'), 'hinweis')
    } else if (antwort.ok) {
      if (unserDialogOffen()) schliesseDialog()
      zeigeBedienungsMeldung(`${erfolgstext}${typeof inhalt.hinweis === 'string' && inhalt.hinweis !== '' ? ` ${inhalt.hinweis}` : ''}${inhalt.laufAbgebrochen === true ? ` ${t('ablauf.meldung.laufAbgebrochen')}` : ''}${inhalt.laufAbgebrochen === false ? ` ${t('ablauf.meldung.nichtsAbgebrochen')}` : ''}${inhalt.bezeugt === false ? ` ${t('ablauf.meldung.nichtBezeugt')}` : ''}${inhalt.kenntnisnahme?.neu === false ? ` ${t('ablauf.meldung.kenntnisnahme')}` : ''}`, 'erfolg')
      // Nach dem Dialog liest ein Screenreader das Ergebnis über den Fokus (keine zweite Live-Region).
      if (imDialog) document.getElementById('workflow-bedienung-meldung').focus()
    } else {
      zeigeBedienungsFehler(`${antwort.status}: ${inhalt.grund ?? t('ablauf.fehler.unbekannt')}`, unserDialogOffen(), dialogBeimStart)
    }
  } catch (fehler) {
    console.error('[workflows] Bedienung fehlgeschlagen:', fehler)
    if (giltNoch()) zeigeBedienungsFehler(t('ablauf.fehler.anfrage', { meldung: fehler.message }), unserDialogOffen(), dialogBeimStart)
  } finally {
    // Nur die eigene Sperre lösen — nach einem Workflowwechsel kann schon eine neue laufen.
    if (imDialog && laufendeDialogBedienung === meineBedienung) laufendeDialogBedienung = null
    for (const k of knoepfe) k.disabled = false
  }
  void pollJetzt()
}

/**
 * Ein Fehler einer Bedienung: im Dialog, solange dieser offen und sein Stand aktuell ist (der Dialog
 * bleibt offen); hat sich der Stand während der Anfrage geändert, schließt der Dialog und der Fehler
 * steht am Ablauf (er sagt mehr als „Stand geändert“); ohne Dialog ebenfalls am Ablauf.
 * @param text - Fehlertext @param imOffenenDialog - true, wenn der auslösende Dialog noch offen ist @param dialog - offenerDialog beim Absenden, oder null
 */
function zeigeBedienungsFehler(text, imOffenenDialog, dialog) {
  if (imOffenenDialog && !dialogUeberholt(dialog, bedienungsKennzeichen)) {
    zeigeDialogMeldung(text)
    return
  }
  if (imOffenenDialog) {
    retteBegruendung()
    schliesseDialog()
  }
  zeigeBedienungsMeldung(text)
  if (dialog !== null) document.getElementById('workflow-bedienung-meldung').focus()
}

// ─── Dialog: Freigabe, Stopp, Rückfrage, Sichtung (F44 WS-4a/4b; F3–F6, F9, F10) ────

/** Der offene Dialog: null oder { art, kennzeichen } — kennzeichen ist das Bedienungs-Kennzeichen beim Öffnen; ändert es sich, schließt der Dialog (kein Nachladen: sonst stünde eine Begründung unter einem anderen Stand). */
let offenerDialog = null

/** Pflichtfeld je Dialogart (Rückfrage: keines — Auswahl und optionale Begründungen je Frage). */
const FELD_JE_ART = { freigabe: 'wf-freigabe-begruendung', stopp: 'wf-stopp-begruendung', sichtung: 'wf-sichtung-begruendung', klaerung: null, aufraeumen: 'wf-aufraeumen-begruendung' }

/**
 * F45 B1a-1: true, solange ein ABGESCHLOSSENER Ablauf keine entschiedene Abnahme hat (dann kein Aufräumen — das
 * Ergebnis liegt nur im Arbeitsordner). Ohne geladene Abnahme gilt sie als offen (vorsichtig).
 * @param status - daten.status
 * @returns boolean
 */
function istAbnahmeOffen(status) {
  return status === 'ABGESCHLOSSEN' && letzteAbnahme?.entscheidung?.status !== 'ok'
}

/** F45 B1a-1: Start/Freigabe, die auf den eigenen Arbeitsordner wartet: { workflowId, projektId, versionSequenz, anfrage, erfolgstext } oder null. */
let ausstehendeVorbereitung = null

/**
 * F45 B1a-1 (Plan v3 B4): prüft nach jedem Laden des Details, ob ein wartender Start/eine wartende Freigabe jetzt
 * nachgesendet werden kann — genau einmal, nur bei unveränderter Fassung; bei FEHLGESCHLAGEN steht der Grund am
 * Ablauf, bei geänderter Fassung ein Hinweis (der Mensch prüft neu).
 * @param workflowId - angezeigter Workflow
 * @param detail - Antwort von GET /api/workflows/<id>
 */
function pruefeAusstehendeVorbereitung(workflowId, detail) {
  const wartend = ausstehendeVorbereitung
  if (wartend === null || wartend.workflowId !== workflowId || wartend.projektId !== holeAktivesProjekt().id) return
  const ao = detail.arbeitsordner ?? null
  if (ao === null || ao.vorbereitungLaeuft === true || ao.status === 'IN_VORBEREITUNG') return
  ausstehendeVorbereitung = null
  if (ao.status === 'FEHLGESCHLAGEN') {
    zeigeBedienungsMeldung(t('arbeitsordner.meldung.fehlgeschlagen', { grund: ao.grund ?? '–' }))
    return
  }
  if (ao.status !== 'BEREIT') return
  if (wartend.versionSequenz !== null && detail.versionSequenz !== wartend.versionSequenz) {
    zeigeBedienungsMeldung(t('arbeitsordner.meldung.fassungGeaendert'), 'hinweis')
    return
  }
  void sendeWorkflowBedienung(wartend.anfrage, document.createElement('button'), wartend.erfolgstext, false, true)
}

/** Begründung aus einem wegen Stand-Änderung geschlossenen Dialog: { art, basis, wert } — basis = Kennzeichen ohne Empfehlung (F-809); nur derselbe Halt bekommt sie zurück. */
let geretteteBegruendung = null

/** Detail des letzten Ladevorgangs, aus dem der Dialog beim Öffnen gebaut wird: { workflowId, daten, naechster, empfehlung, architekturEntscheidung, sichtung }. */
let aktuellesDetail = null

/** Die laufende Bedienung aus dem Dialog ({ workflowId }) oder null — sperrt Escape, Abbrechen, Wiederöffnen und das Schließen bei Stand-Änderung, bis die Antwort da ist. */
let laufendeDialogBedienung = null

/** Kennzeichen ohne das letzte Glied (die Empfehlung, F-809). @param k - Kennzeichen oder null @returns Kennzeichen ohne Empfehlung oder null */
function ohneEmpfehlung(k) {
  return k === null ? null : k.slice(0, k.lastIndexOf('|'))
}

/**
 * Ob ein offener Dialog durch ein neues Bedienungs-Kennzeichen überholt ist. Der Freigabedialog zeigt
 * die Katalog-Empfehlung („Anzeige = Start“) und ist schon bei geänderter Empfehlung überholt; die
 * übrigen Arten erst bei geändertem Stand ohne Empfehlung.
 * @param dialog - offenerDialog @param kennzeichen - aktuelles Bedienungs-Kennzeichen @returns true, wenn der Dialog schließen muss
 */
function dialogUeberholt(dialog, kennzeichen) {
  if (dialog.art === 'freigabe') return dialog.kennzeichen !== kennzeichen
  return ohneEmpfehlung(dialog.kennzeichen) !== ohneEmpfehlung(kennzeichen)
}

/** @returns true, solange #workflow-dialog offen ist */
function dialogOffen() {
  return document.getElementById('workflow-dialog').open === true
}

/** Fehlertext im Dialog (der Fokus geht auf ihn), null blendet ihn aus. @param text - Text oder null */
function zeigeDialogMeldung(text) {
  zeigeMeldung('workflow-dialog-meldung', text)
  if (text !== null) document.getElementById('workflow-dialog-meldung')?.focus()
}

/**
 * Liest eine Pflichtbegründung aus einem Dialogfeld; leer → Meldung im Dialog, Fokus ins Feld. Geprüft
 * wird nur „nicht leer“ — dieselbe Bedingung, die der Server stellt.
 * @param feldId - id des Felds
 * @param pflichtSchluessel - i18n-Schlüssel der Pflichtmeldung
 * @returns die Begründung, oder null, wenn sie fehlt
 */
function pflichtBegruendung(feldId, pflichtSchluessel) {
  const feld = document.getElementById(feldId)
  if (feld.value.trim().length > 0) return feld.value
  zeigeDialogMeldung(t(pflichtSchluessel))
  feld.focus()
  return null
}

/**
 * Öffnet den Dialog (nativ, showModal) mit Inhalt aus dem aktuellen Detail. Der Fokus liegt auf der
 * Begründung (Rückfrage: auf der vorgewählten Option); eine gerettete Begründung desselben Halts
 * steht wieder im Feld.
 * @param art - 'freigabe', 'stopp', 'klaerung' oder 'sichtung'
 * @param vorgabe - F46 D2: { begruendung, option } aus der Spalte „Deine Entscheidung“, oder null
 */
function oeffneDialog(art, vorgabe = null) {
  // Solange eine Dialog-Bedienung läuft, öffnet kein neuer Dialog (sonst wäre ein zweiter POST möglich).
  if (aktuellesDetail === null || bedienungsKennzeichen === null || laufendeDialogBedienung !== null) return
  const inhalt = art === 'aufraeumen' ? renderAufraeumenDialog(aktuellesDetail) : renderDialogInhalt(art, aktuellesDetail)
  if (inhalt === null) return
  const dialog = document.getElementById('workflow-dialog')
  dialog.innerHTML = inhalt
  offenerDialog = { art, kennzeichen: bedienungsKennzeichen }
  const feld = FELD_JE_ART[art] === null ? null : document.getElementById(FELD_JE_ART[art])
  // Eine gerettete Begründung gilt nur für dieselbe Dialogart und denselben Halt; ein anderer Dialog lässt sie liegen.
  if (feld !== null && geretteteBegruendung !== null && geretteteBegruendung.art === art) {
    if (geretteteBegruendung.basis === ohneEmpfehlung(bedienungsKennzeichen)) feld.value = geretteteBegruendung.wert
    geretteteBegruendung = null
  }
  // F46 D2: aus der Spalte „Deine Entscheidung“ kommen Begründung und gewählte Option mit. Die Spalte
  // trägt immer den neuesten Text desselben Halts (uebernimmInSpalte schreibt ihn beim Schließen des
  // Dialogs zurück), deshalb hat sie Vorrang vor der geretteten Begründung. Der Fokus liegt auf dem
  // Knopf der Option (Freigeben, Ablehnen bzw. der erste Installationsknopf), ohne Option im Feld.
  if (feld !== null && typeof vorgabe?.begruendung === 'string' && vorgabe.begruendung.trim() !== '') feld.value = vorgabe.begruendung
  if (!dialog.open) dialog.showModal()
  const fokusZiel = typeof vorgabe?.option === 'string' ? FOKUS_JE_OPTION[vorgabe.option] : undefined
  const optionsKnopf = fokusZiel === undefined ? null : (dialog.querySelector(fokusZiel) ?? dialog.querySelector('[data-aktion="freigeben"]'))
  ;(optionsKnopf ?? feld ?? dialog.querySelector('input:checked, input, textarea'))?.focus()
}

/**
 * Schreibt die Begründung des Freigabedialogs in die Spalte „Deine Entscheidung“ zurück, wenn beide
 * zum selben Halt gehören (qa 3): eine Nachbesserung im Dialog geht beim Schließen (Abbrechen, Escape,
 * Stand-Änderung) nicht verloren, und der nächste „bestätigen“ öffnet mit ihr.
 */
function uebernimmInSpalte() {
  if (offenerDialog?.art !== 'freigabe' || panelArt !== 'freigabe' || ohneEmpfehlung(offenerDialog.kennzeichen) !== panelBasis) return
  const feld = document.getElementById('wf-freigabe-begruendung')
  const spalte = document.getElementById('wf-entscheidung-begruendung')
  if (feld === null || spalte === null || typeof feld.value !== 'string') return
  spalte.value = feld.value
  aktualisierePanelKnopf()
}

/** Gültige Optionen der Spalte bei einer Freigabe (FREIGABE_OPTIONEN in workflow-entscheiden.js). */
const FREIGABE_OPTION_WERTE = new Set(FREIGABE_OPTIONEN)

/** Fokusziel im Freigabedialog je Option der Spalte (F46 D2). */
const FOKUS_JE_OPTION = { freigeben: '[data-aktion="freigeben"]', ablehnen: '[data-aktion="ablehnen"]', installieren: '[data-installation-aktion="vorbereiten"]' }

/** Schließt den Dialog ohne Wirkung (Abbrechen, Erfolg, Projekt- oder Workflowwechsel); Escape schließt nativ. */
function schliesseDialog() {
  const dialog = document.getElementById('workflow-dialog')
  uebernimmInSpalte()
  offenerDialog = null
  if (dialog.open) dialog.close()
}

/** Rettet eine angefangene Begründung des offenen Dialogs für denselben Halt (F-809), bevor er wegen eines geänderten Stands schließt. */
function retteBegruendung() {
  const art = offenerDialog?.art
  const feld = art === undefined || FELD_JE_ART[art] === null ? null : document.getElementById(FELD_JE_ART[art])
  if (feld !== null && feld.value.trim() !== '') geretteteBegruendung = { art, basis: ohneEmpfehlung(offenerDialog.kennzeichen), wert: feld.value }
}

/**
 * Schließt den Dialog, weil sich das Bedienungs-Kennzeichen geändert hat (c): Meldung am Ablauf,
 * der Fokus geht auf sie (der auslösende Knopf ist inzwischen neu gerendert). Eine angefangene
 * Begründung wird für denselben Halt gerettet. Hat sich nur die Katalog-Empfehlung geändert (etwa
 * nach „Freigeben & installieren“ im Dialog), sagt die Meldung das und nennt die gerettete Begründung.
 * @param neuesKennzeichen - das Bedienungs-Kennzeichen, das den Dialog überholt hat
 */
function schliesseDialogVeraltet(neuesKennzeichen) {
  const nurEmpfehlung = offenerDialog !== null && ohneEmpfehlung(offenerDialog.kennzeichen) === ohneEmpfehlung(neuesKennzeichen)
  retteBegruendung()
  schliesseDialog()
  if (nurEmpfehlung) zeigeBedienungsMeldung(t('ablauf.dialog.empfehlungGeaendert'), 'hinweis')
  else zeigeBedienungsMeldung(t('ablauf.dialog.standGeaendert'))
  document.getElementById('workflow-bedienung-meldung').focus()
}

/** Kennzeichen der zuletzt gerenderten Notizen und Aktionen — nur bei ECHTER Lageänderung wird neu gebaut (F-249). */
let bedienungsKennzeichen = null

/**
 * Baut die Notizen über der Timeline (Rückfrage, Sichtung, Reparatur) und die Aktionszeile neu, aber
 * nur bei ECHTER Lageänderung (Kennzeichen). Ist dabei ein Dialog offen und überholt, schließt er mit
 * „Der Stand hat sich geändert“ (kein Nachladen in den offenen Dialog). Lag der Fokus in den Notizen
 * oder der Aktionszeile, geht er auf deren erste Aktion bzw. die Seitenüberschrift.
 * @param workflowId - angezeigter Workflow @param status - daten.status @param naechster - Automaten-Verdikt, oder null @param ungueltig - true bei ungültiger Fassung @param architekturEntscheidung - { schrittId, fragen }, oder null (F39 WS-2b) @param empfehlung - Katalog-Empfehlung, oder null (F36 WS-3; Teil des Kennzeichens, damit eine geänderte Empfehlung neu gerendert wird) @param sichtung - F-768: istSichtungsHaltAnzeige, oder null @param arbeitsordner - F45 B1a-1: detail.arbeitsordner, oder null @param prueferWiederholbar - F45 B2b-1b-2b: „Advisor wiederholen“ angeboten (Teil des Kennzeichens)
 */
function aktualisiereWorkflowBedienung(workflowId, status, naechster, ungueltig = false, architekturEntscheidung = null, empfehlung = null, sichtung = null, arbeitsordner = null, prueferWiederholbar = false, budget = null) {
  // Die Empfehlung bleibt das LETZTE Glied (F-809: ohneEmpfehlung schneidet am letzten '|'); sie steht kodiert (encodeURIComponent) darin, damit ein '|' in einem Katalogtext den Schnitt nicht verschiebt (F46 D2, qa 8).
  // F45 B1a-1: die Lage des Arbeitsordners (Status, Vorbereitung, Ordner vorhanden, Grund) steht kodiert davor.
  const ordnerLage = encodeURIComponent(`${arbeitsordner?.status ?? 'null'}:${arbeitsordner?.vorbereitungLaeuft === true}:${arbeitsordner?.ordnerVorhanden !== false}:${arbeitsordner?.grund ?? ''}:${istAbnahmeOffen(status)}`)
  // F45 B2b-3b-2b-2a-3: der nachgeladene Abgleich-Grund des Rückfrage-Kanals gehört zur Sichtungs-Notiz (kodiert, ohne '|').
  // F45 B2b-3b-2b-2b-1: dazu, ob eine R3-Abweichung vorliegt (Sichtung dann in zwei Schritten; meist schon über abgleich erfasst) und ob der
  // Kanal-Stand nicht ladbar war (Bestätigung gesperrt; kommt er, schließt ein offener Dialog und baut sich beim Öffnen neu).
  const kennzeichen = `${workflowId}|${status}|${naechster?.art ?? 'null'}|${naechster?.schrittId ?? 'null'}|${ungueltig}|${architekturEntscheidung?.schrittId ?? 'null'}|${JSON.stringify(architekturEntscheidung?.fragen?.map((f) => f?.frage) ?? [])}|${sichtung?.laufId ?? 'null'}:${encodeURIComponent(JSON.stringify(sichtung?.kanal?.abgleich ?? null))}:${sichtungsAbweichung(sichtung) !== null}:${sichtung?.kanalUnbekannt === true}|${ordnerLage}|${prueferWiederholbar === true}|${budgetKennung(budget)}|${encodeURIComponent(JSON.stringify(empfehlung))}`
  if (kennzeichen === bedienungsKennzeichen) return
  // Während einer laufenden Dialog-Bedienung schließt der Dialog erst mit ihrer Antwort (sendeWorkflowBedienung).
  const dialogVeraltet = offenerDialog !== null && laufendeDialogBedienung === null && dialogUeberholt(offenerDialog, kennzeichen)
  // Ein nicht überholter Dialog (Rückfrage/Sichtung bei nur geänderter Empfehlung) gilt für den neuen Stand.
  if (offenerDialog !== null && !dialogVeraltet && laufendeDialogBedienung === null) offenerDialog.kennzeichen = kennzeichen
  bedienungsKennzeichen = kennzeichen
  const titel = document.getElementById('workflow-detail-titel')
  // F46 D2: bei einer Freigabe steht die Entscheidung in der Spalte „Deine Entscheidung“ — dort ist der
  // eine Hauptknopf; „Nächsten Schritt freigeben“ unter dem Weg bleibt erreichbar, aber nicht als zweiter.
  const freigabeSpalte = naechster?.art === 'haltFreigabe' && !ungueltig
  setzePanel('freigabe', freigabeSpalte ? renderFreigabePanel({ workflowId, empfehlung }) : '', ohneEmpfehlung(kennzeichen))
  for (const [id, html] of [
    ['workflow-bedienung', renderEingriffe(workflowId, status, ungueltig, architekturEntscheidung, sichtung, prueferWiederholbar, budget)],
    ['workflow-aktionen', renderAktionen(workflowId, status, naechster, ungueltig, { hauptknopf: !freigabeSpalte }) + renderArbeitsordnerAktion(workflowId, status, arbeitsordner, istAbnahmeOffen(status))],
  ]) {
    const container = document.getElementById(id)
    const hatteFokus = container.contains(document.activeElement)
    container.innerHTML = html
    if (hatteFokus) (container.querySelector('.wf-aktion') ?? titel).focus()
  }
  if (dialogVeraltet) schliesseDialogVeraltet(kennzeichen)
}

// ─── Sichtung bestätigt – weiter (F-768; Erkennung und Fassung in ../sichtung-anzeige.js) ────

/**
 * F-768: lädt die aktuelle Fassung frisch, prüft den Halt und reicht die Sichtungsfassung über den
 * bestehenden Reparatur-Schreibweg (POST /api/workflows) mit sichtung_bestaetigt und Begründung ein.
 * F44 WS-4b: aus dem Dialog der Art 'sichtung' (Sperre, Fehler im Dialog, späte Antwort verworfen);
 * bestätigt wird nur der angezeigte Halt (derselbe Lauf, „Anzeige = Start“), sonst 409.
 * @param workflowId - Kennung @param begruendung - nicht-leere Begründung @param knopf - auslösender Button @param laufId - lauf_id des angezeigten Halts
 */
async function bestaetigeSichtung(workflowId, begruendung, knopf, laufId) {
  await sendeWorkflowBedienung(
    async () => {
      const antwort = await holeWorkflowDetail(workflowId)
      const inhalt = await antwort.json().catch(() => ({}))
      const sichtung = antwort.ok ? istSichtungsHaltAnzeige(inhalt.daten) : null
      if (sichtung === null || sichtung.laufId !== laufId) {
        return new Response(JSON.stringify({ grund: t('eingriff.sichtung.nichtMehr') }), { status: 409 })
      }
      return reicheWorkflowFassungEin({ ...baueSichtungsFassung(inhalt.daten, sichtung), sichtung_bestaetigt: true, begruendung })
    },
    knopf,
    t('eingriff.sichtung.erfolg'),
    true
  )
}

// ─── Reparaturzug (löst F-240, F-218; zeigt F-219, F-223, F-226) ────────────

/** Die Fassung, aus der der offene Reparaturentwurf gebaut wurde — Vergleichsgrundlage der Warnungen. null, solange kein Entwurf offen ist. */
let reparaturBasis = null

/** Fortlaufende Nummer je oeffneReparaturEntwurf-Aufruf (Überholschutz, Reviewer-Pass 10.09.2026). */
let reparaturZaehler = 0

/** Meldung des Reparatureditors (nur, solange er offen ist). @param text - Text oder null */
const zeigeReparaturMeldung = (text) => zeigeMeldung('wf-reparatur-meldung', text)

/**
 * Lädt die AKTUELLE Fassung und öffnet daraus den Entwurf — frisch geladen,
 * nicht aus dem gerade angezeigten Stand gebaut.
 * @param workflowId - Kennung des Workflows
 */
async function oeffneReparaturEntwurf(workflowId) {
  const behaelter = document.getElementById('workflow-reparatur')
  reparaturZaehler += 1
  const meineNummer = reparaturZaehler
  const istUeberholt = () => reparaturZaehler !== meineNummer
  behaelter.innerHTML = `<p class="subtle">${tHtml('ablauf.laedt')}</p>`
  try {
    const antwort = await holeWorkflowDetail(workflowId)
    const inhalt = await antwort.json().catch(() => ({}))
    if (istUeberholt()) return
    if (!antwort.ok || !Array.isArray(inhalt.daten?.schritte)) {
      behaelter.innerHTML = ''
      zeigeBedienungsMeldung(t('reparatur.nichtVorbereitbar', { grund: `${antwort.status} ${inhalt.grund ?? ''}`.trim() }))
      return
    }
    reparaturBasis = inhalt.daten
    const entwurf = baueReparaturEntwurf(inhalt.daten)
    behaelter.innerHTML = renderReparatur(workflowId, entwurf, ermittleReparaturWarnungen(inhalt.daten, entwurf))
    document.getElementById('wf-reparatur-entwurf')?.focus({ preventScroll: true })
    behaelter.scrollIntoView?.({ block: 'nearest' })
  } catch (fehler) {
    if (istUeberholt()) return
    behaelter.innerHTML = ''
    zeigeBedienungsMeldung(t('reparatur.nichtVorbereitbar', { grund: fehler.message }))
  }
}

/** Rechnet die Warnungen gegen den TATSÄCHLICH eingetippten Text neu (der Entwurf ist bearbeitbar). Ein unlesbarer Zwischenstand lässt die Warnungen unverändert stehen. */
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

/** Schließt den Entwurf und gibt die Vergleichsgrundlage frei. Der Zähler wird hochgezählt, damit eine noch fliegende oeffneReparaturEntwurf-Antwort den Entwurf nicht wieder aufbaut. */
function verwirfReparaturEntwurf() {
  reparaturBasis = null
  reparaturZaehler += 1
  document.getElementById('workflow-reparatur').innerHTML = ''
}

/**
 * Reicht den bearbeiteten Entwurf als neue Fassung ein (POST /api/workflows).
 * @param workflowId - Kennung des Workflows
 * @param knopf - auslösender Button
 */
async function reicheReparaturEntwurfEin(workflowId, knopf) {
  zeigeReparaturMeldung(null)
  let entwurf
  try {
    entwurf = JSON.parse(document.getElementById('wf-reparatur-entwurf').value)
  } catch (fehler) {
    zeigeReparaturMeldung(t('reparatur.keinJson', { meldung: fehler.message }))
    return
  }
  if (reparaturBasis !== null) {
    document.getElementById('workflow-reparatur-warnungen').innerHTML = renderReparaturWarnungen(ermittleReparaturWarnungen(reparaturBasis, entwurf))
  }
  const begruendung = document.getElementById('wf-reparatur-begruendung').value
  const koerper = begruendung.trim().length === 0 ? entwurf : { ...entwurf, begruendung }
  knopf.disabled = true
  const projektBeimStart = holeAktivesProjekt().id
  try {
    const antwort = await reicheWorkflowFassungEin(koerper)
    const inhalt = await antwort.json().catch(() => ({}))
    // Eine späte Antwort nach einem Workflow- oder Projektwechsel wird verworfen (keine Meldung von A unter B).
    if (gewaehlteWorkflowId !== workflowId || holeAktivesProjekt().id !== projektBeimStart) return
    if (!antwort.ok) {
      zeigeReparaturMeldung(`${antwort.status}: ${inhalt.grund ?? t('ablauf.fehler.unbekannt')}`)
      knopf.disabled = false
      return
    }
    verwirfReparaturEntwurf()
    zeigeBedienungsMeldung(t('reparatur.angenommen', { id: workflowId, version: String(inhalt.versionSequenz) }), 'erfolg')
    document.getElementById('workflow-bedienung-meldung').focus()
  } catch (fehler) {
    zeigeReparaturMeldung(t('ablauf.fehler.anfrage', { meldung: fehler.message }))
    knopf.disabled = false
    return
  }
  void pollJetzt()
}

/** workflowId des aktuell als Seite angezeigten Workflows, oder null. */
let gewaehlteWorkflowId = null

/** Fortlaufende Nummer je ladeWorkflowDetail-Aufruf (Überholschutz, siehe Funktionskommentar unten). */
let workflowRenderZaehler = 0

/** AbortController der zuletzt gestarteten GET /api/workflows/<id>-Anfrage (Perf-Fix fix/zustand-poll-kosten, Punkt 5) — vor jedem neuen Aufruf abgebrochen, damit eine langsame Antwort nicht mit jedem Poll-Tick eine weitere parallele Verbindung öffnet und das Verbindungslimit des Browsers erschöpft. */
let aktiveWorkflowDetailAnfrage = null

/** F-926-Muster: true, solange seit dem letzten Betreten von `#/runs` keine andere Route kam (der vorige History-Eintrag ist dann die Liste). */
let listeZuletzt = false

/** true, wenn das offene Detail direkt aus der Liste geöffnet wurde: „← Alle Aufträge“ geht dann per history.back() zurück statt einen neuen Eintrag anzulegen. */
let detailAusListe = false

/**
 * Zeigt bzw. verbirgt die Seite des Workflow-Details. Liste, Startfehler und Läufe verschwinden
 * dabei über die Klasse an #view-runs (style.css) — nicht über ihr hidden-Attribut, das views/runs.js
 * für #lauf-detail selbst führt.
 * @param offen - true: Detail als ganze Seite
 */
function zeigeDetailSeite(offen) {
  document.getElementById('workflow-detail').hidden = !offen
  document.getElementById('view-runs').classList.toggle('workflow-seite-offen', offen)
}

/**
 * Zeigt den Fehlerzustand des Details (Vorlage .note.red): Überschrift plus Servertext bzw.
 * Netzfehler; null blendet ihn aus.
 * @param text - Fehlertext oder null
 */
function zeigeDetailFehler(text) {
  const anzeige = document.getElementById('workflow-detail-fehler')
  if (text === null) {
    anzeige.hidden = true
    anzeige.innerHTML = ''
    return
  }
  anzeige.innerHTML = `<strong>${tHtml('ablauf.fehler.titel')}</strong><p>${escapeHtml(text)}</p>`
  anzeige.hidden = false
}

/**
 * Fehlerzustand des Details (404, 500, Netz): nichts vom alten Stand bleibt bedienbar — Timeline,
 * „Auf einen Blick“, Notizen, Aktionen und F12 werden geleert, ein offener Dialog schließt, aus dem
 * alten Detail lässt sich keiner mehr öffnen. Die Abnahme wird nur ausgeblendet, damit eine
 * angefangene Begründung dort einen kurzen Fehler übersteht; der Reparaturentwurf bleibt.
 * @param text - Fehlertext (Servergrund bzw. Netzfehler)
 */
function zeigeDetailNichtLadbar(text) {
  for (const id of ['workflow-detail-inhalt', 'workflow-blick', 'workflow-technik-inhalt', 'workflow-aktionen', 'workflow-bedienung']) document.getElementById(id).innerHTML = ''
  // F46 D2: aus dem alten Stand ist nichts mehr zu entscheiden — Freigabe-Teil leer, Spalte verborgen (ihr Inhalt bleibt für einen kurzen Fehler).
  setzeHtml('workflow-entscheiden', '')
  document.getElementById('workflow-entscheidung').hidden = true
  zeigeAbnahme(false)
  letzterBlick = null
  bedienungsKennzeichen = null
  aktuellesDetail = null
  if (laufendeDialogBedienung === null) schliesseDialog()
  zeigeDetailFehler(text)
}

/**
 * Lädt GET /api/workflows/<id> und rendert die Seite: Notizen, Timeline, „Auf einen Blick“, Aktionen,
 * F12 und (eigener Endpunkt) die Abnahme. Hängt am Poll; zwei Ticks für DENSELBEN Workflow können sich
 * überholen (F-252) — nur der jüngste Aufruf schreibt. Beim Wechsel auf einen ANDEREN Workflow werden
 * Dialog, Notizen, Abnahme und ein offener Reparaturentwurf zuerst geräumt (TC-11, QA-Pass F20 WS-1).
 * @param workflowId - Kennung aus der Route `#/workflows/<id>`
 * @param scrollen - true beim Öffnen (Ladezustand, Fokus auf den Titel), false beim Neurendern durch den Poll
 */
export async function ladeWorkflowDetail(workflowId, scrollen = true) {
  if (gewaehlteWorkflowId !== null && gewaehlteWorkflowId !== workflowId) {
    raeumeWorkflowBedienzustand()
  }
  gewaehlteWorkflowId = workflowId
  workflowRenderZaehler += 1
  const meineRenderNummer = workflowRenderZaehler
  const istUeberholt = () => gewaehlteWorkflowId !== workflowId || workflowRenderZaehler !== meineRenderNummer

  aktiveWorkflowDetailAnfrage?.abort()
  const abbruchsteuerung = new AbortController()
  aktiveWorkflowDetailAnfrage = abbruchsteuerung
  const inhalt = document.getElementById('workflow-detail-inhalt')
  const titel = document.getElementById('workflow-detail-titel')

  zeigeDetailSeite(true)
  // Der Fehlerzustand bleibt bei Poll-Ticks stehen (kein Flackern); erst Erfolg oder neues Öffnen blendet ihn aus.
  if (scrollen) {
    zeigeDetailFehler(null)
    // Bis zur eigenen Antwort trägt der Titel das Ziel aus der Liste, ohne Listeneintrag die ID.
    titel.textContent = seitenTitel(letzteWorkflows?.find((w) => w.workflowId === workflowId)?.ziel, workflowId)
    inhalt.innerHTML = `<p class="subtle">${tHtml('ablauf.laedt')}</p>`
    letzterBlick = null
    document.getElementById('workflow-blick').innerHTML = ''
    document.getElementById('workflow-technik-inhalt').innerHTML = ''
    titel.focus({ preventScroll: true })
    document.getElementById('workflow-detail').scrollIntoView({ block: 'start' })
  }

  try {
    const antwort = await holeWorkflowDetail(workflowId, abbruchsteuerung.signal)
    if (istUeberholt()) return
    if (!antwort.ok) {
      const koerper = await antwort.json().catch(() => ({}))
      if (istUeberholt()) return
      zeigeDetailNichtLadbar(`${antwort.status}: ${koerper.grund ?? t('ablauf.fehler.unbekannt')}`)
      return
    }
    const detail = await antwort.json()
    if (istUeberholt()) return
    const daten = detail.daten ?? {}
    const verstoesse = Array.isArray(detail.verstoesse) ? detail.verstoesse : []
    const naechster = detail.naechster ?? null
    zeigeDetailFehler(null)
    zeigeAbnahme(true)
    const ungueltig = verstoesse.length > 0
    const architekturEntscheidung = detail.architekturEntscheidung ?? null
    // F-768: die Sichtung ist nur beim reinen F-760-Halt fällig (bei ungültiger Fassung allein die Reparatur).
    const sichtungHalt = ungueltig ? null : istSichtungsHaltAnzeige(daten)
    // F45 B2b-3b-2b-2a-3: dazu der Rückfrage-Kanal des Laufs (Abgleich-Grund statt Standardsatz), abgewartet und je Lauf gemerkt.
    // F45 B2b-3b-2b-2b-1 (qa 7): nicht ladbar ⇒ kanal null (Standardsatz) und kanalUnbekannt — der Dialog sperrt die Bestätigung, bis er geladen ist.
    const kanal = sichtungHalt === null ? null : await kanalDerSichtung(sichtungHalt.laufId)
    const sichtung = sichtungHalt === null ? null : { ...sichtungHalt, kanal: kanal === KANAL_NICHT_LADBAR ? null : kanal, ...(kanal === KANAL_NICHT_LADBAR ? { kanalUnbekannt: true } : {}) }
    if (istUeberholt()) return
    // Erst das Detail, dann das Kennzeichen: ein Dialog, der danach öffnet, baut aus genau diesem Stand.
    // F45 B2b-1b-2b: planFreigabe (Karten der Freigabe-Seite) und prueferWiederholbar („Advisor wiederholen“) aus dem Detail.
    const prueferWiederholbar = detail.prueferWiederholbar === true
    aktuellesDetail = { workflowId, daten, naechster, ungueltig, empfehlung: detail.empfehlung ?? null, architekturEntscheidung, sichtung, arbeitsordner: detail.arbeitsordner ?? null, einrichtung: detail.einrichtung ?? null, planFreigabe: detail.planFreigabe ?? null, prueferWiederholbar, budget: detail.budget ?? null, auftragstext: detail.auftragstext ?? null, versionSequenz: detail.versionSequenz ?? null }
    aktualisiereWorkflowBedienung(workflowId, daten.status ?? null, naechster, ungueltig, architekturEntscheidung, detail.empfehlung ?? null, sichtung, detail.arbeitsordner ?? null, prueferWiederholbar, detail.budget ?? null)
    pruefeAusstehendeVorbereitung(workflowId, detail)
    // F46 D2: Kopf, Freigabe-Teil und Lage der Bereiche je Modus (Freigabe, Abnahme oder heutige Ablaufseite).
    zeichneEntscheiden()
    // Eigener Endpunkt, eigener Überholschutz, fire-and-forget — blockiert das übrige Rendern nicht.
    void aktualisiereAbnahmeAbschnitt(workflowId, istUeberholt)
    const ungueltigBlock = verstoesse.length > 0 ? renderWorkflowUngueltig(verstoesse) : ''
    const projektName = holeAktivesProjekt().name
    if (!Array.isArray(daten.schritte) || daten.schritte.length === 0) {
      inhalt.innerHTML = [ungueltigBlock === '' ? renderWorkflowUngueltig([t('ablauf.ungueltig.keineSchritte')]) : ungueltigBlock, renderTimeline([])].join('')
      letzterBlick = { daten, naechster, geordnet: [], projektName }
      zeichneBlick()
      document.getElementById('workflow-technik-inhalt').innerHTML = renderTechnik({ daten, versionSequenz: detail.versionSequenz, naechster })
      return
    }
    const geordnet = ordneSchritteNachPlan(daten.schritte)
    const aktiveLaufIds = await ermittleAktiveLaufIds(geordnet)
    if (istUeberholt()) return
    inhalt.innerHTML = ungueltigBlock + renderTimeline(geordnet, { naechster, cursorId: daten.aktiver_schritt_id ?? null, aktiveLaufIds, einrichtung: detail.einrichtung ?? null, workflowId })
    letzterBlick = { daten, naechster, geordnet, projektName }
    zeichneBlick()
    document.getElementById('workflow-technik-inhalt').innerHTML = renderTechnik({ daten, versionSequenz: detail.versionSequenz, naechster, geordnet, aktiveLaufIds })
  } catch (fehler) {
    if (istUeberholt()) return
    zeigeDetailNichtLadbar(t('ablauf.fehler.anfrage', { meldung: fehler.message }))
  }
}

/** Räumt Dialog, Notizen, Aktionen, Abnahme, Meldungen und einen offenen Reparaturentwurf auf — gemeinsame Teilmenge von schliesseWorkflowDetail und dem Workflow-Wechsel in ladeWorkflowDetail (TC-11, QA-Pass F20 WS-1). */
function raeumeWorkflowBedienzustand() {
  schliesseDialog()
  // Laufende Anfragen des alten Workflows sperren den neuen nicht (ihre Antwort wird ohnehin verworfen).
  laufendeDialogBedienung = null
  laufendeAbnahme = null
  verwerfenOffen = null
  geretteteBegruendung = null
  aktuellesDetail = null
  ausstehendeVorbereitung = null
  bedienungsKennzeichen = null
  abnahmeKennzeichen = null
  letzteAbnahme = null
  letzterAbgleich = null
  letzterBlick = null
  kanalAbnahme = null
  for (const id of ['workflow-bedienung', 'workflow-aktionen', 'workflow-abnahme', 'workflow-abnahme-stand']) document.getElementById(id).innerHTML = ''
  raeumeEntscheiden()
  zeigeAbnahme(true)
  zeigeBedienungsMeldung(null)
  zeigeAbnahmeMeldung(null)
  verwirfReparaturEntwurf()
}

/** F46 D2: Seite Entscheiden zurück auf die heutige Ablaufseite (Spalte leer, Weg aufgeklappt, „Auf einen Blick“ rechts, Kopf wie bisher). */
function raeumeEntscheiden() {
  setzePanel('freigabe', '', null)
  setzePanel('abnahme', '', null)
  document.getElementById('workflow-entscheidung').hidden = true
  setzeHtml('workflow-entscheiden', '')
  letzteVorschau = null
  modus = null
  document.getElementById('workflow-ablauf').open = true
  document.getElementById('workflow-seitenspalte').append?.(document.getElementById('workflow-blick'))
  document.getElementById('workflow-detail').classList.remove('entscheiden-modus', 'entscheiden-abnahme')
  setzeHtml('workflow-detail-eyebrow', tHtml('ablauf.eyebrow'))
  setzeHtml('workflow-detail-beschreibung', tHtml('ablauf.beschreibung'))
  setzeHtml('workflow-detail-status', '').hidden = true
}

/** Schließt die Seite des Workflow-Details samt Dialog, Bedienblock und offenem Reparaturentwurf; Liste, Startfehler und Läufe erscheinen wieder. */
function schliesseWorkflowDetail() {
  gewaehlteWorkflowId = null
  detailAusListe = false
  aktiveWorkflowDetailAnfrage?.abort()
  zeigeDetailSeite(false)
  raeumeWorkflowBedienzustand()
}

/**
 * F-926-Muster: legt nach dem Schließen den Fokus auf die Zeile des Workflows in der Liste; ohne
 * Zeile (Liste noch nicht geladen, Workflow nicht mehr da) auf die Seitenüberschrift.
 * @param workflowId - Kennung des zuvor offenen Details
 */
function fokussiereZeile(workflowId) {
  const zeile = [...document.getElementById('workflows').querySelectorAll('.workflow-zeile')].find((z) => z.dataset.workflowId === workflowId)
  ;(zeile ?? document.getElementById('runs-titel')).focus()
}

/**
 * F45 B2b-3b-2b-2b-1 (E-R3-Sichtung = B): Schritt 2 der Sichtung bei R3 im offenen Dialog — R3-Meldung aus dem aktuellen Detail in
 * `#wf-sichtung-r3`, der Knopf aus Schritt 1 wird durch die Bestätigung ersetzt, Fokus auf die Meldung. Ohne R3 im Detail oder ohne
 * Container (Dialog schon neu gebaut) geschieht nichts.
 * @param workflowId - Kennung des Workflows
 * @param button - Knopf „Protokoll-Abweichung ansehen“
 */
function zeigeSichtungR3Schritt(workflowId, button) {
  const abweichung = sichtungsAbweichung(aktuellesDetail?.sichtung)
  const ziel = document.getElementById('wf-sichtung-r3')
  if (abweichung === null || ziel === null || !button.isConnected) return
  const schritt = renderSichtungR3Schritt(workflowId, abweichung)
  ziel.innerHTML = schritt.meldung
  button.outerHTML = schritt.knopf
  document.querySelector('#workflow-dialog .wf-sichtung-r3-hinweis')?.remove()
  document.getElementById('wf-sichtung-r3-meldung')?.focus()
}

/**
 * Führt EINE angeklickte Bedienung aus. Freigabe, Stopp, Rückfrage und Sichtung öffnen zuerst den
 * Dialog (F44 WS-4a/4b); ihre Bestätigung kommt aus ihm, Meldungen stehen im Dialog. Starten wirkt
 * direkt, „Ablauf reparieren“ öffnet den Editor inline.
 * @param button - der geklickte .wf-aktion-Knopf
 */
async function fuehreWorkflowAktionAus(button) {
  const workflowId = button.dataset.workflowId
  const aktion = button.dataset.aktion
  zeigeBedienungsMeldung(null)

  const oeffnen = { 'freigabe-oeffnen': 'freigabe', 'stopp-oeffnen': 'stopp', 'klaerung-oeffnen': 'klaerung', 'sichtung-oeffnen': 'sichtung', 'aufraeumen-oeffnen': 'aufraeumen' }
  if (Object.hasOwn(oeffnen, aktion)) {
    const spaltenText = oeffnen[aktion] === 'freigabe' && panelArt === 'freigabe' ? (document.getElementById('wf-entscheidung-begruendung')?.value ?? '') : ''
    oeffneDialog(oeffnen[aktion], spaltenText.trim() === '' ? null : { begruendung: spaltenText, option: null })
    return
  }

  // F46 D2: „<Option> bestätigen“ der Spalte öffnet den bestehenden Freigabedialog (Kennzeichen beim
  // Öffnen, „Anzeige = Start“, Ablehnen als Veto im selben Dialog); der Knopf ist ohne Option oder
  // Begründung gesperrt, die Prüfung hier schützt nur vor einem synthetischen Klick.
  if (aktion === 'freigabe-bestaetigen') {
    const begruendung = document.getElementById('wf-entscheidung-begruendung')?.value ?? ''
    if (!FREIGABE_OPTION_WERTE.has(button.dataset.option) || begruendung.trim().length === 0) return
    oeffneDialog('freigabe', { begruendung, option: button.dataset.option })
    return
  }

  if (aktion === 'starten') {
    await sendeWorkflowBedienung(() => starteWorkflowSchritt(workflowId), button, t('ablauf.meldung.gestartet'))
    return
  }

  // F45 B2b-1b-2b (F-1104 (4)): „Advisor wiederholen“ — setzt nur den Advisor zurück (POST …/pruefer-wiederholen, startet
  // nichts). In hoch ist er ZWINGEND und wartet danach auf die Freigabe; ein AUTOMATISCHER Advisor steht auf LAEUFT und
  // wird wie beim Review über den gewöhnlichen Start gestartet (Muster fuehrePrueferWiederholenAus). Fehler: Servertext.
  if (aktion === 'pruefer-wiederholen') {
    const anfrage = async () => {
      const zurueck = await wiederholePruefer(workflowId)
      if (!zurueck.ok) return zurueck
      const inhalt = await zurueck.json().catch(() => ({}))
      if (inhalt.status !== 'LAEUFT') return new Response(JSON.stringify({ hinweis: inhalt.status === 'WARTET_FREIGABE' ? t('eingriff.advisor.nachFreigabe') : (inhalt.grund ?? '') }), { status: 200 })
      const start = await starteWorkflowSchritt(workflowId)
      if (start.ok) {
        const gestartet = await start.json().catch(() => ({}))
        // 202 mit vorbereitung: der Arbeitsordner wird erst vorbereitet. Keine Nachsendung (sie wiederholte das Zurücksetzen
        // → 409); die Meldung sagt, dass danach „Starten“ den Advisor startet (Code-Review 2b, 1).
        if (gestartet.vorbereitung === true) return new Response(JSON.stringify({ hinweis: t('eingriff.advisor.vorbereitung') }), { status: 200 })
        return new Response(JSON.stringify({ hinweis: t('eingriff.advisor.gestartet') }), { status: 200 })
      }
      const fehler = await start.json().catch(() => ({}))
      return new Response(JSON.stringify({ grund: t('eingriff.advisor.ohneStart', { grund: fehler.grund ?? t('ablauf.fehler.unbekannt') }) }), { status: start.status })
    }
    await sendeWorkflowBedienung(anfrage, button, t('eingriff.advisor.zurueckgesetzt'))
    return
  }

  // F45 B2b-3c (F-981): „Budget erhöhen“ — POST …/budget erhöht das Budget des Arbeitspakets (startet nichts). Würde der Automat
  // danach starten, folgt POST …/starten (Muster „Advisor wiederholen“); wartet der nächste Schritt auf eine Freigabe, erscheint
  // sie nach dem Neuladen (Verdikt wieder „Freigabe“). Scheitert der Start, bleibt das Budget erhöht; Fehler mit dem Servergrund.
  if (aktion === 'budget-erhoehen') {
    const anfrage = async () => {
      const erhoeht = await erhoeheBudget(workflowId)
      if (!erhoeht.ok) return erhoeht
      const inhalt = await erhoeht.json().catch(() => ({}))
      const budget = Number.isFinite(inhalt.budget?.tokens) ? formatiereZahl(inhalt.budget.tokens) : '–'
      if (inhalt.naechster !== 'starte') {
        return new Response(JSON.stringify({ hinweis: t(inhalt.naechster === 'haltFreigabe' ? 'abnahme.budget.erfolgFreigabe' : 'abnahme.budget.erfolg', { budget }) }), { status: 200 })
      }
      const start = await starteWorkflowSchritt(workflowId)
      if (start.ok) return new Response(JSON.stringify({ hinweis: t('abnahme.budget.erfolgStart', { budget }) }), { status: 200 })
      const fehler = await start.json().catch(() => ({}))
      return new Response(JSON.stringify({ grund: t('abnahme.budget.ohneStart', { budget, grund: fehler.grund ?? t('ablauf.fehler.unbekannt') }) }), { status: start.status })
    }
    await sendeWorkflowBedienung(anfrage, button, t('abnahme.budget.erhoeht'))
    return
  }

  // F45 B2a-2 (F-1071): einen Einrichtungsschritt abhaken bzw. wieder öffnen — danach lädt der Poll das Detail neu.
  if (aktion === 'einrichtung') {
    const status = button.dataset.status === 'offen' ? 'offen' : 'erledigt'
    await sendeWorkflowBedienung(() => sendeEinrichtung(workflowId, { id: button.dataset.id, schritt: button.dataset.schritt ?? '', status }), button, t(status === 'erledigt' ? 'ablauf.meldung.einrichtungErledigt' : 'ablauf.meldung.einrichtungOffen'))
    return
  }

  if (aktion === 'architektur-entscheidung') {
    const dialog = document.getElementById('workflow-dialog')
    const antworten = []
    for (const [index, knoten] of [...dialog.querySelectorAll('.wf-architektur-frage')].entries()) {
      const gewaehlt = knoten.querySelector(`input[name="wf-architektur-frage-${index}"]:checked`)?.value
      if (gewaehlt === undefined) {
        zeigeDialogMeldung(t('eingriff.klaerung.pflicht'))
        return
      }
      const begruendung = document.getElementById(`wf-architektur-begruendung-${index}`)?.value?.trim() ?? ''
      antworten.push({ frage: knoten.dataset.frage, gewaehlt, ...(begruendung.length > 0 ? { begruendung } : {}) })
    }
    await sendeWorkflowBedienung(
      () => sendeWorkflowArchitekturEntscheidung(workflowId, { schrittId: button.dataset.schrittId, antworten }),
      button,
      t('eingriff.klaerung.gespeichert'),
      true
    )
    return
  }

  if (aktion === 'freigeben' || aktion === 'ablehnen') {
    const begruendung = pflichtBegruendung('wf-freigabe-begruendung', 'ablauf.dialog.pflicht')
    if (begruendung === null) return
    // F36 WS-3: data-empfehlung-ids steht nur am Freigeben-Knopf, und nur wenn eine Empfehlung angezeigt wurde.
    let empfehlungIds = {}
    try {
      empfehlungIds = button.dataset.empfehlungIds !== undefined ? { empfehlungIds: JSON.parse(button.dataset.empfehlungIds) } : {}
    } catch (fehler) {
      console.error('[workflows] data-empfehlung-ids nicht lesbar:', fehler)
      zeigeDialogMeldung(t('ablauf.dialog.empfehlungUnlesbar'))
      return
    }
    await sendeWorkflowBedienung(
      () => sendeWorkflowFreigabe(workflowId, { schrittId: button.dataset.schrittId, entscheidung: aktion === 'freigeben' ? 'FREIGEGEBEN' : 'ABGELEHNT', begruendung, ...empfehlungIds }),
      button,
      aktion === 'freigeben' ? t('ablauf.meldung.freigegeben') : t('ablauf.meldung.abgelehnt'),
      true
    )
    return
  }

  if (aktion === 'stoppen') {
    const begruendung = pflichtBegruendung('wf-stopp-begruendung', 'ablauf.dialog.stopp.pflicht')
    if (begruendung === null) return
    await sendeWorkflowBedienung(() => stoppeWorkflow(workflowId, { begruendung }), button, t('ablauf.meldung.gestoppt'), true)
    return
  }

  if (aktion === 'aufraeumen') {
    const begruendung = pflichtBegruendung('wf-aufraeumen-begruendung', 'arbeitsordner.aufraeumen.pflicht')
    if (begruendung === null) return
    const verwerfen = document.getElementById('wf-aufraeumen-verwerfen')?.checked === true
    await sendeWorkflowBedienung(() => raeumeArbeitsordnerAuf(workflowId, { begruendung, verwerfen }), button, t('arbeitsordner.meldung.aufgeraeumt'), true)
    return
  }

  // F45 B2b-3b-2b-2b-1 (E-R3-Sichtung = B): Schritt 2 — R3-Meldung in den Container, Bestätigung an die Stelle des Knopfs aus Schritt 1
  // (kein Neuaufbau des Dialogs, die Begründung bleibt). Ein zweiter Klick findet den Knopf nicht mehr.
  if (aktion === 'sichtung-r3') {
    zeigeSichtungR3Schritt(workflowId, button)
    return
  }

  if (aktion === 'sichtung') {
    const begruendung = pflichtBegruendung('wf-sichtung-begruendung', 'eingriff.sichtung.pflicht')
    if (begruendung === null) return
    await bestaetigeSichtung(workflowId, begruendung, button, aktuellesDetail?.sichtung?.laufId ?? null)
    return
  }

  if (aktion === 'reparatur') {
    await oeffneReparaturEntwurf(workflowId)
  }
}

/**
 * Führt eine angeklickte Abnahme-Bedienung aus (F23 WS-2a/2b) — die Prüfung der drei Aktionen schützt
 * nur vor einem synthetischen Klick (nicht erlaubte Knöpfe stehen disabled, erlaubteAbnahmeAktionen).
 * @param button - der geklickte .wf-abnahme-aktion-Knopf
 */
async function fuehreAbnahmeAktionAus(button) {
  const workflowId = button.dataset.workflowId
  const aktion = button.dataset.aktion
  if (aktion !== 'ANGENOMMEN' && aktion !== 'ABGELEHNT' && aktion !== 'ANPASSUNG_ANGEFORDERT') return
  zeigeAbnahmeMeldung(null)
  const feld = document.getElementById('wf-abnahme-begruendung')
  const begruendung = feld.value
  if (begruendung.trim().length === 0) {
    zeigeAbnahmeMeldung(t('abnahme.pflicht'))
    feld.focus()
    return
  }
  await sendeAbnahmeBedienung(workflowId, () => sendeAbnahme(workflowId, { ergebnis: aktion, begruendung }), button, (inhalt) => abnahmeErfolg(aktion, inhalt))
}

/**
 * F45 FB-2: „Übernehmen“ bzw. „Verwerfen“ eines Fähigkeit-Vorschlags (Karte aus faehigkeit-vorschlag-anzeige.js). Verwerfen ist
 * zweistufig (Entscheidung Stefan): der erste Klick schaltet nur die Stufe „Wirklich verwerfen?“ (neu gezeichnet, Fokus auf den
 * Knopf), „Abbrechen“ hebt sie auf; erst „Wirklich verwerfen?“ bzw. „Übernehmen“ schickt den POST — ohne vorheriges await über
 * sendeAbnahmeBedienung (genau ein POST, die ganze Abnahme gesperrt bis zur Antwort; 4xx/5xx wörtlich mit dem Ausweg des Servers).
 * DEKLARIERT (Advisor 11): zwischen dem Ende der Sperre und dem frischen GET kann ein älterer Poll die Karte noch einmal mit Knöpfen
 * zeichnen; ein Klick dort endet fail-closed mit 404/409.
 * Korrekturrunde (qa 2, cr 2): „Wirklich verwerfen?“ zählt nur als einzelner Klick und frühestens VERWERFEN_SPERRE_MS nach dem
 * Öffnen der Stufe — sonst träfe der zweite Klick eines Doppelklicks (bzw. eine gehaltene Taste) den an derselben Stelle
 * neu gezeichneten Knopf. Die Stufe wechselt ohne Zurücksetzen des Kennzeichens (qa 3: eine angefangene Begründung bleibt).
 * @param button - der geklickte .wf-faehigkeit-vorschlag-Knopf
 * @param ereignis - das Klick-Ereignis (detail = Klickzahl)
 */
function fuehreVorschlagAktionAus(button, ereignis) {
  const { workflowId, aktion, typ, name, hash } = button.dataset
  if (laufendeAbnahme !== null || letzteAbnahme === null) return
  const schluessel = vorschlagSchluessel(workflowId, { typ, name, hash })
  if (aktion === 'verwerfen-bestaetigt' && (ereignis.detail > 1 || Date.now() - verwerfenOffenSeit < VERWERFEN_SPERRE_MS)) return
  if (aktion === 'verwerfen' || aktion === 'abbrechen') {
    verwerfenOffen = aktion === 'verwerfen' ? schluessel : null
    verwerfenOffenSeit = Date.now()
    zeigeAbnahmeMeldung(null)
    aktualisiereAbnahme(workflowId, letzteAbnahme)
    const ziel = aktion === 'verwerfen' ? 'verwerfen-bestaetigt' : 'verwerfen'
    for (const k of document.querySelectorAll(`.wf-faehigkeit-vorschlag[data-aktion="${ziel}"]`)) if (k.dataset.typ === typ && k.dataset.name === name) k.focus()
    return
  }
  if (aktion !== 'uebernehmen' && aktion !== 'verwerfen-bestaetigt') return
  const echteAktion = aktion === 'uebernehmen' ? 'uebernehmen' : 'verwerfen'
  // Die Abnahme ist beim Klick offen, wenn das Übernehmen erlaubt und noch nicht entschieden ist — dann gilt das Review danach als veraltet.
  const abnahmeOffen = abnahmeLaesstUebernehmenZu(letzteAbnahme) && letzteAbnahme.entscheidung?.status !== 'ok'
  verwerfenOffen = null
  void sendeAbnahmeBedienung(workflowId, () => sendeFaehigkeitVorschlag(workflowId, echteAktion, { typ, name, hash }), button, (inhalt) => vorschlagErfolg(echteAktion, inhalt, abnahmeOffen), true)
}

/**
 * „Prüfung wiederholen“ (F-656): kein Body, keine Begründungspflicht; die Antwort kommt synchron nach
 * dem ganzen Prüflauf (scripts/leitstand-server.mjs), bis dahin bleibt der Knopf gesperrt.
 * @param button - der geklickte .wf-pruefung-wiederholen-Knopf
 */
async function fuehrePruefungWiederholenAus(button) {
  const workflowId = button.dataset.workflowId
  await sendeAbnahmeBedienung(workflowId, () => wiederholeWorkflowPruefung(workflowId), button, (inhalt) =>
    inhalt.pruefergebnis === 'GRUEN' ? t('abnahme.pruefung.erfolgGruen') : t('abnahme.pruefung.erfolgHaelt', { wert: pruefWertText(inhalt.pruefergebnis) || t('abnahme.unbekannt') })
  )
}

/**
 * „Review wiederholen“ (F45 B2b-1a, F-1085 (1)): setzt nur den Review-Schritt zurück (POST …/pruefer-wiederholen) und
 * startet ihn danach über den gewöhnlichen Start (POST …/starten) — der Server startet beim Zurücksetzen nichts. Scheitert
 * der Start (z. B. ein anderer Lauf ist aktiv) oder wartet der Schritt auf eine Freigabe, bleibt der Review zurückgesetzt;
 * die Meldung erscheint dann im Fehlerstil mit dem Grund des Servers (ohne HTTP-Code) bzw. dem übersetzten Status.
 * F45 B2b-2b-2: derselbe Weg für „Prüfung aus Nutzersicht wiederholen“ (data-pruefer="qa" — die Route setzt den Schritt am
 * Cursor zurück); nur die Meldungen sind je Prüfer eigene.
 * @param button - der geklickte .wf-pruefer-wiederholen-Knopf
 */
async function fuehrePrueferWiederholenAus(button) {
  const workflowId = button.dataset.workflowId
  const meldung = button.dataset.pruefer === 'qa' ? 'abnahme.qa' : 'abnahme.pruefer'
  const anfrage = async () => {
    const zurueck = await wiederholePruefer(workflowId)
    if (!zurueck.ok) return zurueck
    const inhalt = await zurueck.json().catch(() => ({}))
    if (inhalt.status !== 'LAEUFT') return new Response(JSON.stringify({ ohneStart: inhalt.status === 'WARTET_FREIGABE' ? t('ablauf.schritt.WARTET_FREIGABE') : (inhalt.grund ?? t('ablauf.fehler.unbekannt')) }), { status: 200 })
    const start = await starteWorkflowSchritt(workflowId)
    if (start.ok) return start
    const fehler = await start.json().catch(() => ({}))
    return new Response(JSON.stringify({ ohneStart: fehler.grund ?? t('ablauf.fehler.unbekannt') }), { status: 200 })
  }
  await sendeAbnahmeBedienung(workflowId, anfrage, button, (inhalt) =>
    typeof inhalt.ohneStart === 'string' ? { text: t(`${meldung}.ohneStart`, { grund: inhalt.ohneStart }), art: 'fehler' } : t(`${meldung}.erfolg`)
  )
}

/** Klick-/Eingabe-Delegation der Workflow-Ansicht — jeder Container wird als Ganzes neu gerendert, die Zuhörer hängen deshalb am Container. */
function initWorkflowBedienung() {
  // Die ganze Zeile ist ein Link; navigiere, damit ein Klick auf den offenen Hash das Detail neu lädt.
  document.getElementById('workflows').addEventListener('click', (ereignis) => {
    const zeile = ereignis.target.closest('.workflow-zeile')
    // Strg/Cmd/Umschalt-Klick und Mittelklick bleiben beim Browser (neuer Tab bzw. neues Fenster).
    if (!zeile || ereignis.ctrlKey || ereignis.metaKey || ereignis.shiftKey || ereignis.button > 0) return
    ereignis.preventDefault()
    navigiere(`#/workflows/${encodeURIComponent(zeile.dataset.workflowId)}`)
  })
  document.getElementById('workflow-technik-inhalt').addEventListener('click', (ereignis) => {
    const button = ereignis.target.closest('.workflow-lauf-verweis')
    if (!button) return
    navigiere(`#/runs/${encodeURIComponent(button.dataset.laufId)}`)
  })
  // Notizen, Aktionen und Dialog (außerhalb der Poll-Container): .wf-aktion; „Abbrechen“ und ✕ im Dialog
  // schließen ohne Wirkung (nicht während einer laufenden Anfrage), Escape nativ (close).
  // F46 D2: dazu die Spalte „Deine Entscheidung“ (Freigabe: „<Option> bestätigen“ öffnet den Dialog).
  // F45 B2a-2: die Einrichtung steht in der Timeline (workflow-detail-inhalt) und in der Karte „Arbeitspaket“ der
  // Freigabe-Seite (workflow-entscheiden) und trägt eigene .wf-aktion-Knöpfe.
  for (const id of ['workflow-bedienung', 'workflow-aktionen', 'workflow-dialog', 'workflow-entscheidung', 'workflow-detail-inhalt', 'workflow-entscheiden']) {
    document.getElementById(id).addEventListener('click', (ereignis) => {
      if (ereignis.target.closest('.wf-dialog-abbrechen')) {
        if (laufendeDialogBedienung === null) schliesseDialog()
        return
      }
      const button = ereignis.target.closest('.wf-aktion')
      if (button) void fuehreWorkflowAktionAus(button)
    })
  }
  const dialog = document.getElementById('workflow-dialog')
  // Escape während einer laufenden Bedienung schließt nicht — die Entscheidung ist schon unterwegs.
  dialog.addEventListener('cancel', (ereignis) => {
    if (laufendeDialogBedienung !== null) ereignis.preventDefault()
  })
  dialog.addEventListener('close', () => {
    // Escape schließt nativ — auch dann wandert die Begründung in die Spalte (qa 3).
    uebernimmInSpalte()
    offenerDialog = null
  })
  // F36 WS-5a: „Freigeben & installieren“ im Freigabedialog, danach Detail neu laden — die geänderte
  // Empfehlung schließt den Dialog, die Begründung bleibt für denselben Halt (geretteteBegruendung).
  bindeEmpfehlungInstallation(dialog, () => (gewaehlteWorkflowId !== null ? ladeWorkflowDetail(gewaehlteWorkflowId, false) : undefined))
  // Abnahme: der Abschnitt über der Timeline und die Zeile darunter (dort ggf. „Prüfung wiederholen“).
  // F46 D2: dazu die Spalte „Deine Entscheidung“ (Abnahme) und „Alle Nachweise“ in der Kachel Nachweise.
  for (const id of ['workflow-abnahme', 'workflow-abnahme-stand', 'workflow-entscheidung']) {
    document.getElementById(id).addEventListener('click', (ereignis) => {
      const abnahmeButton = ereignis.target.closest('.wf-abnahme-aktion')
      const pruefungButton = ereignis.target.closest('.wf-pruefung-wiederholen')
      const prueferButton = ereignis.target.closest('.wf-pruefer-wiederholen')
      const vorschlagButton = ereignis.target.closest('.wf-faehigkeit-vorschlag')
      if (vorschlagButton) fuehreVorschlagAktionAus(vorschlagButton, ereignis)
      else if (abnahmeButton) void fuehreAbnahmeAktionAus(abnahmeButton)
      else if (pruefungButton) void fuehrePruefungWiederholenAus(pruefungButton)
      else if (prueferButton) void fuehrePrueferWiederholenAus(prueferButton)
      else if (ereignis.target.closest('.abnahme-nachweise-zeigen')) {
        const ziel = document.getElementById('abnahme-nachweise-titel')
        ziel?.scrollIntoView?.({ block: 'start' })
        ziel?.focus({ preventScroll: true })
      }
    })
  }
  // F45 B2b-4a-2b-2: „Kopieren“ und „Aktualisieren“ im Abschnitt „Bereit zum Sichern“ der Karte (Abnahme- und Ablaufseite).
  document.getElementById('workflow-entscheiden').addEventListener('click', (ereignis) => {
    behandleEntscheidenKlick(ereignis, { kopiere: kopiereBefehlsblock, aktualisiere: (id) => ladeAblaufCodeStand(id, { neu: true }) })
  })
  // Auswahl und Begründung schalten den einen Knopf der Spalte frei (Absenden gesperrt, solange eins fehlt).
  for (const art of ['input', 'change']) document.getElementById('workflow-entscheidung').addEventListener(art, aktualisierePanelKnopf)
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
    void reicheReparaturEntwurfEin(einreichen.dataset.workflowId, einreichen)
  })
  // „← Alle Aufträge“ (F-926): aus der Liste per history.back() (kein neuer Eintrag), sonst navigiere;
  // die Route #/runs schließt das Detail und legt den Fokus auf die Zeile.
  document.getElementById('workflow-detail-schliessen').addEventListener('click', () => {
    // F46 D2: aus „Deine Entscheidungen“ zurück dorthin (history.back()); ohne Herkunft führt eine
    // Entscheidungsseite nach #/attention, die übrige Ablaufseite wie bisher zur Liste.
    if (detailAusListe || detailAusAttention) history.back()
    else navigiere(modus === null ? '#/runs' : '#/attention')
  })
}

/**
 * F-874, F-923: Neuladen-Hook beim Projektwechsel. Dialog, Detail, Abnahme und Entwurf des alten
 * Projekts werden ohne Wirkung verworfen (sonst fragte der Auffrischer die alte workflowId im neuen
 * Projekt ab, Fehlerklasse F26); ein Detail-Hash geht ohne neuen History-Eintrag auf #/runs.
 */
function verwirfNachProjektWechsel() {
  schliesseWorkflowDetail()
  letzteListeHtml = null
  letzteWorkflows = null
  listeZuletzt = false
  if (/^#\/workflows\/[^/]+$/.test(location.hash)) ersetzeRoute('#/runs')
}

/** Initialisiert die Workflow-Bedienung einmalig beim Bootstrap: Delegation, Routen, Abonnement des Zustands-Aggregats für die Liste, Detail-Auffrischer für ein offenes Workflow-Detail (F20 WS-2 — kein eigener Poll-Timer mehr, siehe zustand.js), Projektwechsel (F-874). */
export function initWorkflowsView() {
  initWorkflowBedienung()

  registriere(/^#\/runs$/, 'runs', () => {
    const vorher = gewaehlteWorkflowId
    schliesseWorkflowDetail()
    listeZuletzt = true
    if (vorher !== null) fokussiereZeile(vorher)
  })
  // Browser-Zurück aus dem Detail auf ein Lauf-Detail (#/runs/<laufId>) oder das Register „Ausführungen“
  // (#/ausfuehrungen, F44 WS-5a): auch dann schließt die Seite.
  registriere(/^#\/runs\/([^/]+)$/, 'runs', () => {
    schliesseWorkflowDetail()
  })
  registriere(/^#\/ausfuehrungen$/, 'runs', () => {
    schliesseWorkflowDetail()
  })
  registriere(/^#\/workflows\/([^/]+)$/, 'runs', (workflowId) => {
    if (gewaehlteWorkflowId !== workflowId) detailAusListe = listeZuletzt
    listeZuletzt = false
    void ladeWorkflowDetail(workflowId)
  })
  // Jede andere Route beendet „zuletzt die Liste“; verlässt der Hash das Detail, schließt der Dialog.
  window.addEventListener('hashchange', (ereignis) => {
    // F46 D2: Herkunft „Deine Entscheidungen“ für den Rückweg; ein Wechsel zwischen zwei Details behält sie.
    const istDetail = (hash) => /^#\/workflows\/[^/]+$/.test(hash)
    const vorher = typeof ereignis?.oldURL === 'string' ? new URL(ereignis.oldURL).hash : ''
    if (istDetail(location.hash) && !istDetail(vorher)) detailAusAttention = vorher === '#/attention'
    if (!istDetail(location.hash)) detailAusAttention = false
    if (location.hash !== '#/runs') listeZuletzt = false
    if (!/^#\/workflows\/[^/]+$/.test(location.hash)) schliesseDialog()
  })

  abonniere((zustand) => {
    // F45 B2b-3b-2b-2b-2b-2: vor dem Detail-Auffrischer desselben Takts — Freigabe und Abnahme zeichnen mit dem frischen Wert.
    letzterProjektCliHinweis = zustand.projektCliHinweis ?? null
    renderWorkflows(zustand.workflows)
  })
  // Das offene Detail hängt als Detail-Auffrischer am einen Poll-Timer (zustand.js; anders als F-363).
  abonniereDetailAuffrischer(() => {
    if (gewaehlteWorkflowId !== null) void ladeWorkflowDetail(gewaehlteWorkflowId, false)
  })
  abonniereProjektWechsel(verwirfNachProjektWechsel)
  // F45 B1a-1: kommt der Code-Stand (offene Änderungen des Projektordners) an, zeichnet die Freigabe-Seite neu.
  abonniereCodeStand(() => {
    if (modus === 'freigabe') zeichneEntscheiden()
  })
  // F45 B2b-4a-2b-2: kommt der Stand „Bereit zum Sichern“ des offenen Ablaufs an, zeichnet die Karte neu (nur dieses Detail).
  abonniereAblaufCodeStand((workflowId) => {
    if (aktuellesDetail?.workflowId === workflowId) zeichneEntscheiden()
  })
}
