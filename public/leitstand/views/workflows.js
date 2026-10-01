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
 */

import {
  holeAbnahme,
  holeLaufDetail,
  holeWorkflowDetail,
  reicheWorkflowFassungEin,
  sendeAbnahme,
  sendeWorkflowArchitekturEntscheidung,
  sendeWorkflowFreigabe,
  starteWorkflowSchritt,
  stoppeWorkflow,
  wiederholeWorkflowPruefung,
} from '../api.js'
import { bindeEmpfehlungInstallation } from '../empfehlung-installation.js'
import { t, tHtml } from '../i18n.js'
import { abonniereProjektWechsel, holeAktivesProjekt } from '../projekt-kontext.js'
import { escapeHtml } from '../render.js'
import { ersetzeRoute, navigiere, registriere } from '../router.js'
import { baueSichtungsFassung, istSichtungsHaltAnzeige } from '../sichtung-anzeige.js'
import { abonniere, abonniereDetailAuffrischer, pollJetzt } from '../zustand.js'
import { pruefWertText, renderAbnahme, renderAbnahmeBlick } from './workflow-abnahme.js'
import { ordneSchritteNachPlan, renderAktionen, renderAufEinenBlick, renderTechnik, renderTimeline, renderWorkflowListe, renderWorkflowUngueltig, seitenTitel } from './workflow-detail.js'
import { baueReparaturEntwurf, ermittleReparaturWarnungen, renderDialogInhalt, renderEingriffe, renderReparatur, renderReparaturWarnungen } from './workflow-eingriffe.js'

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
  document.getElementById('workflows').innerHTML = html
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
  const e = abnahme.entscheidung ?? {}
  const kennzeichen = `${workflowId}|${abnahme.workflowStatus}|${abnahme.freigabeHalt ? 'halt' : '-'}|${e.status}|${e.versionSequenz ?? '-'}|${abnahme.urteil?.status}|${abnahme.urteil?.laufId ?? '-'}|${abnahme.aenderungsuebersicht?.status}|${abnahme.pruefergebnis?.status ?? 'null'}|${abnahme.pruefergebnis?.ergebnis ?? 'null'}`
  if (kennzeichen === abnahmeKennzeichen || laufendeAbnahme === workflowId) return
  let html
  try {
    html = renderAbnahme(workflowId, abnahme)
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
  container.innerHTML = html.oben
  stand.innerHTML = html.unten
  ;(html.lage === 'entscheidbar' ? container : stand).after?.(document.getElementById('workflow-abnahme-meldung'))
  const neuesFeld = document.getElementById('wf-abnahme-begruendung')
  if (angefangen !== '' && neuesFeld !== null && (container.contains(neuesFeld) || stand.contains(neuesFeld))) {
    neuesFeld.value = angefangen
    if (hatteFokus) neuesFeld.focus()
  }
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
 */
async function sendeAbnahmeBedienung(workflowId, anfrage, knopf, erfolgstext) {
  if (laufendeAbnahme !== null) return
  zeigeAbnahmeMeldung(null)
  const bereich = [...document.querySelectorAll('#workflow-abnahme button, #workflow-abnahme-stand button, #wf-abnahme-begruendung')]
  const gesperrt = [knopf, ...bereich].filter((el, i, alle) => !el.disabled && alle.indexOf(el) === i)
  laufendeAbnahme = workflowId
  for (const el of gesperrt) el.disabled = true
  try {
    const antwort = await anfrage()
    const inhalt = await antwort.json().catch(() => ({}))
    if (gewaehlteWorkflowId !== workflowId) return
    laufendeAbnahme = null
    if (antwort.ok) {
      zeigeAbnahmeMeldung(erfolgstext(inhalt), 'erfolg')
      abnahmeKennzeichen = null
      const abnahme = await holeAbnahme(workflowId).catch(() => null)
      if (abnahme !== null && gewaehlteWorkflowId === workflowId) aktualisiereAbnahme(workflowId, abnahme)
      document.getElementById('workflow-abnahme-meldung').focus()
    } else {
      zeigeAbnahmeMeldung(`${antwort.status}: ${inhalt.grund ?? t('ablauf.fehler.unbekannt')}`)
    }
  } catch (fehler) {
    if (gewaehlteWorkflowId === workflowId) zeigeAbnahmeMeldung(t('ablauf.fehler.anfrage', { meldung: fehler.message }))
  } finally {
    if (laufendeAbnahme === workflowId) laufendeAbnahme = null
    for (const el of gesperrt) el.disabled = false
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
 */
async function sendeWorkflowBedienung(anfrage, knopf, erfolgstext, imDialog = false) {
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
    } else if (antwort.ok) {
      if (unserDialogOffen()) schliesseDialog()
      zeigeBedienungsMeldung(`${erfolgstext}${inhalt.laufAbgebrochen === true ? ` ${t('ablauf.meldung.laufAbgebrochen')}` : ''}${inhalt.laufAbgebrochen === false ? ` ${t('ablauf.meldung.nichtsAbgebrochen')}` : ''}${inhalt.bezeugt === false ? ` ${t('ablauf.meldung.nichtBezeugt')}` : ''}${inhalt.kenntnisnahme?.neu === false ? ` ${t('ablauf.meldung.kenntnisnahme')}` : ''}`, 'erfolg')
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
const FELD_JE_ART = { freigabe: 'wf-freigabe-begruendung', stopp: 'wf-stopp-begruendung', sichtung: 'wf-sichtung-begruendung', klaerung: null }

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
 */
function oeffneDialog(art) {
  // Solange eine Dialog-Bedienung läuft, öffnet kein neuer Dialog (sonst wäre ein zweiter POST möglich).
  if (aktuellesDetail === null || bedienungsKennzeichen === null || laufendeDialogBedienung !== null) return
  const inhalt = renderDialogInhalt(art, aktuellesDetail)
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
  if (!dialog.open) dialog.showModal()
  ;(feld ?? dialog.querySelector('input:checked, input, textarea'))?.focus()
}

/** Schließt den Dialog ohne Wirkung (Abbrechen, Erfolg, Projekt- oder Workflowwechsel); Escape schließt nativ. */
function schliesseDialog() {
  const dialog = document.getElementById('workflow-dialog')
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
 * @param workflowId - angezeigter Workflow @param status - daten.status @param naechster - Automaten-Verdikt, oder null @param ungueltig - true bei ungültiger Fassung @param architekturEntscheidung - { schrittId, fragen }, oder null (F39 WS-2b) @param empfehlung - Katalog-Empfehlung, oder null (F36 WS-3; Teil des Kennzeichens, damit eine geänderte Empfehlung neu gerendert wird) @param sichtung - F-768: istSichtungsHaltAnzeige, oder null
 */
function aktualisiereWorkflowBedienung(workflowId, status, naechster, ungueltig = false, architekturEntscheidung = null, empfehlung = null, sichtung = null) {
  // Die Empfehlung bleibt das LETZTE Glied (F-809: ohneEmpfehlung schneidet am letzten '|').
  const kennzeichen = `${workflowId}|${status}|${naechster?.art ?? 'null'}|${naechster?.schrittId ?? 'null'}|${ungueltig}|${architekturEntscheidung?.schrittId ?? 'null'}|${JSON.stringify(architekturEntscheidung?.fragen?.map((f) => f?.frage) ?? [])}|${sichtung?.laufId ?? 'null'}|${JSON.stringify(empfehlung)}`
  if (kennzeichen === bedienungsKennzeichen) return
  // Während einer laufenden Dialog-Bedienung schließt der Dialog erst mit ihrer Antwort (sendeWorkflowBedienung).
  const dialogVeraltet = offenerDialog !== null && laufendeDialogBedienung === null && dialogUeberholt(offenerDialog, kennzeichen)
  // Ein nicht überholter Dialog (Rückfrage/Sichtung bei nur geänderter Empfehlung) gilt für den neuen Stand.
  if (offenerDialog !== null && !dialogVeraltet && laufendeDialogBedienung === null) offenerDialog.kennzeichen = kennzeichen
  bedienungsKennzeichen = kennzeichen
  const titel = document.getElementById('workflow-detail-titel')
  for (const [id, html] of [
    ['workflow-bedienung', renderEingriffe(workflowId, status, ungueltig, architekturEntscheidung, sichtung)],
    ['workflow-aktionen', renderAktionen(workflowId, status, naechster, ungueltig)],
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
    titel.textContent = seitenTitel(daten.ziel, workflowId)
    const ungueltig = verstoesse.length > 0
    const architekturEntscheidung = detail.architekturEntscheidung ?? null
    // F-768: die Sichtung ist nur beim reinen F-760-Halt fällig (bei ungültiger Fassung allein die Reparatur).
    const sichtung = ungueltig ? null : istSichtungsHaltAnzeige(daten)
    // Erst das Detail, dann das Kennzeichen: ein Dialog, der danach öffnet, baut aus genau diesem Stand.
    aktuellesDetail = { workflowId, daten, naechster, empfehlung: detail.empfehlung ?? null, architekturEntscheidung, sichtung }
    aktualisiereWorkflowBedienung(workflowId, daten.status ?? null, naechster, ungueltig, architekturEntscheidung, detail.empfehlung ?? null, sichtung)
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
    inhalt.innerHTML = ungueltigBlock + renderTimeline(geordnet, { naechster, cursorId: daten.aktiver_schritt_id ?? null, aktiveLaufIds })
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
  geretteteBegruendung = null
  aktuellesDetail = null
  bedienungsKennzeichen = null
  abnahmeKennzeichen = null
  letzteAbnahme = null
  letzterBlick = null
  for (const id of ['workflow-bedienung', 'workflow-aktionen', 'workflow-abnahme', 'workflow-abnahme-stand']) document.getElementById(id).innerHTML = ''
  zeigeAbnahme(true)
  zeigeBedienungsMeldung(null)
  zeigeAbnahmeMeldung(null)
  verwirfReparaturEntwurf()
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
 * Führt EINE angeklickte Bedienung aus. Freigabe, Stopp, Rückfrage und Sichtung öffnen zuerst den
 * Dialog (F44 WS-4a/4b); ihre Bestätigung kommt aus ihm, Meldungen stehen im Dialog. Starten wirkt
 * direkt, „Ablauf reparieren“ öffnet den Editor inline.
 * @param button - der geklickte .wf-aktion-Knopf
 */
async function fuehreWorkflowAktionAus(button) {
  const workflowId = button.dataset.workflowId
  const aktion = button.dataset.aktion
  zeigeBedienungsMeldung(null)

  const oeffnen = { 'freigabe-oeffnen': 'freigabe', 'stopp-oeffnen': 'stopp', 'klaerung-oeffnen': 'klaerung', 'sichtung-oeffnen': 'sichtung' }
  if (Object.hasOwn(oeffnen, aktion)) {
    oeffneDialog(oeffnen[aktion])
    return
  }

  if (aktion === 'starten') {
    await sendeWorkflowBedienung(() => starteWorkflowSchritt(workflowId), button, t('ablauf.meldung.gestartet'))
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
  await sendeAbnahmeBedienung(workflowId, () => sendeAbnahme(workflowId, { ergebnis: aktion, begruendung }), button, () => t(`abnahme.erfolg.${aktion}`))
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
  for (const id of ['workflow-bedienung', 'workflow-aktionen', 'workflow-dialog']) {
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
    offenerDialog = null
  })
  // F36 WS-5a: „Freigeben & installieren“ im Freigabedialog, danach Detail neu laden — die geänderte
  // Empfehlung schließt den Dialog, die Begründung bleibt für denselben Halt (geretteteBegruendung).
  bindeEmpfehlungInstallation(dialog, () => (gewaehlteWorkflowId !== null ? ladeWorkflowDetail(gewaehlteWorkflowId, false) : undefined))
  // Abnahme: der Abschnitt über der Timeline und die Zeile darunter (dort ggf. „Prüfung wiederholen“).
  for (const id of ['workflow-abnahme', 'workflow-abnahme-stand']) {
    document.getElementById(id).addEventListener('click', (ereignis) => {
      const abnahmeButton = ereignis.target.closest('.wf-abnahme-aktion')
      const pruefungButton = ereignis.target.closest('.wf-pruefung-wiederholen')
      if (abnahmeButton) void fuehreAbnahmeAktionAus(abnahmeButton)
      else if (pruefungButton) void fuehrePruefungWiederholenAus(pruefungButton)
    })
  }
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
    if (detailAusListe) history.back()
    else navigiere('#/runs')
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
  window.addEventListener('hashchange', () => {
    if (location.hash !== '#/runs') listeZuletzt = false
    if (!/^#\/workflows\/[^/]+$/.test(location.hash)) schliesseDialog()
  })

  abonniere((zustand) => {
    renderWorkflows(zustand.workflows)
  })
  // Das offene Detail hängt als Detail-Auffrischer am einen Poll-Timer (zustand.js; anders als F-363).
  abonniereDetailAuffrischer(() => {
    if (gewaehlteWorkflowId !== null) void ladeWorkflowDetail(gewaehlteWorkflowId, false)
  })
  abonniereProjektWechsel(verwirfNachProjektWechsel)
}
