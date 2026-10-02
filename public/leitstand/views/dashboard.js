/**
 * Datei: public/leitstand/views/dashboard.js
 *
 * Zweck: View `#/dashboard` „Produktübersicht“ — seit F46 D1 nach Design 02-produktuebersicht--Main
 * (docs/design/abgleich-f46.md §4.1; vorher F44 WS-2b, Vorlage V10). Blöcke von oben nach unten:
 *  1. Kopf: Eyebrow, Projektname, „Aktueller Meilenstein“; „Produkt bearbeiten“, „Architektur &
 *     Code“ und „+ Eintrag erfassen“ als Baustein „kommt“ (Fixpaket B5 bzw. bis D4).
 *  2. Vier gleich hohe Kopfkarten:
 *     a) Produktmanagement (Einstieg #/produktzyklus) und Ziel dieser Version — Zielsatz aus der
 *        Projektakte (GET …/projektakte, nur wenn eindeutig, sonst „kommt“), Link „Zielgruppe &
 *        Erfolgskriterien“ → #/projektakte.
 *     b) Wer arbeitet gerade: Feature in Arbeit (entwicklung-daten.js waehleFeatureInArbeit) und der
 *        Rollen-Kreis (rollen-kreis.js) aus den Schritten seines Workflows. Ohne Feature in Arbeit,
 *        aber mit einem nicht terminalen Ablauf (Bug, Harness, freier Auftrag) zeigt der Kreis diesen
 *        Ablauf (fokus-daten.js waehleFokusWorkflow) — die frühere „Aktuelle Rolle“ bleibt so sichtbar.
 *     c) Rolle im Detail (Panel des Rollen-Registers): Name, Worker, Bekommt/Liefert als „kommt“
 *        (Fixpaket B2), „In diesem Lauf“ aus der Laufakte-Beobachtung des letzten Laufs der Rolle,
 *        sonst „—“.
 *     d) Fortschritt (Ring x / y abgenommen im aktuellen Meilenstein → #/roadmap) und Braucht dich
 *        (Zahl aus baueEntscheidungen → #/attention).
 *  3. Vier Kennzahlen: In Arbeit, Deine Entscheidung, Abgenommen, Geplant (wie F44 WS-2b).
 *  4. „Der Weg von <Feature>“: Kopf echt, Workstream-Zeitleiste „kommt“ (Fixpaket B2/B5).
 *  5. Kacheln Features, Bugs, Harness Improvements mit Anzahl → #/workboard.
 *  6. Arbeitsstand mit Filter Alles · Geplant · In Arbeit · Braucht dich · Abgenommen (das
 *     Status-Kanban aus entwicklung-daten.js baueBoard, je Spalte die ersten Karten).
 *  7. Zuletzt umgesetzt: letztes abgenommenes Feature (aktueller Meilenstein, sonst der jüngste
 *     davor, in Roadmap-Reihenfolge), Workstream-Ring und „Danach“ als „kommt“; darunter die letzte
 *     Ausführung (bisheriges Verhalten, F44 B12).
 *  8. Was steckt dahinter: drei Knöpfe „kommt“ (Code & Änderungen bis D4).
 *  9. Betrieb: Läufe, Workflows, Startfehler als ruhige Zeile.
 * 10. Leerzustand: keine Workitems, keine Roadmap, keine Workflows → geführter erster Schritt.
 *
 * Entfallen (E, abgleich §4.1) und weiter erreichbar: „Deine nächsten Entscheidungen“ (→ Braucht
 * dich, #/attention), „Die Workforce gerade“ (→ Live-Chip), „Wer macht was“ (→ Rollen-Kreis und
 * Rolle im Detail), Entwicklungsstand-Liste (→ #/roadmap), Vision (→ #/projektakte).
 *
 * Datenquellen: das Poll-Aggregat (abonniere, zustand.js), GET …/roadmap, GET …/workitems
 * (ungefiltert), GET …/auftraege (Verknüpfung Workitem ↔ Workflow), die offenen P0/P1-Workitems
 * (attention-daten.js), GET …/projektakte (Zielsatz), die Fokus-Nachträge (fokus-daten.js) und je
 * gewählter Rolle das Lauf-Detail ihres letzten Laufs (Beobachtung).
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initDashboardView beim Bootstrap, vor starteRouter())
 * - public/leitstand/projekt-wechsel.test.mjs (Neuladen beim Projektwechsel)
 *
 * Wichtig:
 * - Roadmap, Workitems, Aufträge, P0/P1 und Projektakte laden beim Betreten (#/dashboard) und bei
 *   jedem Projektwechsel (abonniereProjektWechsel, F-860), je mit eigenem Überholschutz — nie aus
 *   dem Poll. Das Aggregat kommt über abonniere().
 * - Fokus-Nachträge laden bei wechselnder Workflow-ID oder wenn sich Status, Cursor oder Halt dieses
 *   Workflows im Aggregat ändern (Prüfpass D1 cr 5 — sonst bliebe der Kreis bis zum nächsten Betreten
 *   stehen), beim Betreten und frühestens NACHTRAG_WIEDERHOLEN_MS nach einem Fehlschlag; das
 *   Lauf-Detail für „In diesem Lauf“ einmal je laufId (Cache bis zum Betreten/Projektwechsel). Bewusste
 *   Ausnahme von „nie aus dem Poll“: Beides stößt render() an, also auch ein Poll-Tick, aber nur bei
 *   einer neuen ID bzw. einem neuen Workflow-Stand — ein unveränderter Tick lädt nichts.
 * - Jeder Block hat eigene Zustände für „lädt“ und „Fehler“; ein Wurf beim Rendern trifft nur seinen
 *   Block (setzeBlock). Eine defekte Quelle zeigt „nicht verfügbar“, nie 0.
 * - Blöcke werden nur bei geändertem Inhalt neu geschrieben — der Poll zerstört keinen Fokus; nach
 *   einer Auswahl im Rollen-Register bekommt der gewählte Reiter den Fokus zurück.
 * - Keine Schreibaktion: Links, Sprünge, Auswahl, Filter, erneutes Laden (lesend) oder „kommt“.
 * - Projektname, Titel, IDs, Statuswerte, Zielsatz und Servertexte werden nicht übersetzt und immer
 *   escaped; alle übrigen Texte über t().
 */

import { holeAuftraegeBegrenzt, holeLaufDetail, holeProjektakte, holeRoadmap, holeWorkitems } from '../api.js'
import { baueEntscheidungen, filtereAttentionWorkflows, filtereOffeneAbnahmen, holeOffeneP0P1Workitems } from '../attention-daten.js'
import { baueBoard, baueVerknuepfung, istNichtTerminal, SPALTEN, verknuepfterWorkflow, waehleFeatureInArbeit, workflowPhase } from '../entwicklung-daten.js'
import { ladeFokusNachtrag, waehleFokusWorkflow, waehleLetztenLauf } from '../fokus-daten.js'
import { ring } from '../fortschritt-ring.js'
import { formatiereDatum, formatiereZahl, t, tHtml } from '../i18n.js'
import { kommtBadge, kommtKnopf } from '../kommt.js'
import { abonniereProjektWechsel, holeAktivesProjekt } from '../projekt-kontext.js'
import { versionsziel } from '../projektakte-anzeige.js'
import { escapeHtml } from '../render.js'
import { aktuellerMeilenstein, roadmapZustand, statusKategorie, zaehleGeplant, zaehleMeilenstein } from '../roadmap-anzeige.js'
import { kreisStatus, naechsteKreisRolle, rollenKreisHtml, vorgewaehlteRolle } from '../rollen-kreis.js'
import { workerName } from '../rollen-anzeige.js'
import { registriere } from '../router.js'
import { chipTypVonWorkitem, typChip } from '../typ-chip.js'
import { abonniere } from '../zustand.js'

/** Letztes Zustands-Aggregat aus dem Poll, oder null vor dem ersten Tick (bzw. nach einem Projektwechsel). */
let letzterZustand = null

/** Roadmap-Antwort: null = lädt, { status: 'fehler', grund } nach einem Wurf, sonst die Projektion. */
let roadmap = null

/** Alle Workitems: undefined = lädt, null = nicht verfügbar, sonst Liste. */
let workitems

/** Aufträge (Verknüpfung Workitem ↔ Workflow): undefined = lädt, null = nicht verfügbar, sonst Liste. */
let auftraege

/** Offene P0/P1-Workitems für „Braucht dich“: undefined = lädt, null = nicht verfügbar, sonst Liste. */
let p0p1

/** Antwort von GET …/projektakte: undefined = lädt, null = nicht verfügbar, sonst die Projektion. */
let projektakte

/** Fokus-Nachträge je Workflow-ID: { status: 'laedt' | 'ok' | 'fehler', daten? }. Gehalten werden nur die gerade gebrauchten IDs. */
const nachtraege = new Map()

/** Generation der Nachträge — Projektwechsel und Betreten der Seite erhöhen sie, späte Antworten davor werden verworfen. */
let nachtragGeneration = 0

/** Frühester neuer Versuch nach einem fehlgeschlagenen Nachtrag (Millisekunden). */
const NACHTRAG_WIEDERHOLEN_MS = 30000

/** Beobachtung je laufId für „In diesem Lauf“: { status: 'laedt' | 'ok' | 'fehler', beobachtung? }. */
const beobachtungen = new Map()

/** Gewählte Rolle im Rollen-Register, oder null = vorgewählt (erste „jetzt“, sonst Builder). */
let gewaehlteRolle = null

/** Filter des Arbeitsstands: 'alles' oder eine der SPALTEN. */
let arbeitsstandFilter = 'alles'

/** Überholschutz je Lader (Muster roadmapAnfrageZaehler in views/roadmap.js). */
const anfrageZaehler = { roadmap: 0, workitems: 0, auftraege: 0, p0p1: 0, projektakte: 0 }

/** Zuletzt geschriebenes HTML je Block — ein Block wird nur bei geändertem Inhalt neu geschrieben. */
const blockCache = new Map()

/** Karten je Spalte im Arbeitsstand (Alles); mit Spaltenfilter bis KARTEN_GEFILTERT. */
const KARTEN_JE_SPALTE_UEBERSICHT = 3
const KARTEN_GEFILTERT = 12

/** ID des Panels „Rolle im Detail“ (aria-controls der Rollen-Reiter). */
const ROLLE_PANEL_ID = 'uebersicht-rolle-detail'

/** Pfeil der Vorlage am Zeilenende (dekorativ). */
const PFEIL = '<span class="uebersicht-pfeil" aria-hidden="true">→</span>'

/** Kachelsymbole der Vorlage für Features, Bugs und Harness Improvements (dekorativ). */
const KACHEL_SYMBOL = { FEATURE: '◇', BUG: '!', HARNESS_IMPROVEMENT: '↻' }

/** Typen der drei Kacheln in Anzeigereihenfolge. */
const KACHEL_TYPEN = ['FEATURE', 'BUG', 'HARNESS_IMPROVEMENT']

// ─── Kleine Bausteine ────────────────────────────────────────────────────────

/** @returns Absatz „Lädt…“ */
function laedt() {
  return `<p class="subtle">${tHtml('uebersicht.laedt')}</p>`
}

/**
 * Markierter Text „nicht verfügbar“ (defekte Quelle, nie 0).
 * @returns HTML
 */
function nichtVerfuegbar() {
  return `<span class="unbekannt">${tHtml('uebersicht.nichtVerfuegbar')}</span>`
}

/**
 * Textlink im Stil der Vorlage.
 * @param hash - Ziel (Hash-Route, bereits kodiert)
 * @param text - übersetzter Text
 * @returns HTML
 */
function textLink(hash, text) {
  return `<a class="text-link" href="${escapeHtml(hash)}">${escapeHtml(text)} <span aria-hidden="true">→</span></a>`
}

/**
 * Titel eines Features oder Workitems, sonst die ID.
 * @param eintrag - { id, titel? }
 * @returns Rohtext
 */
function titelVon(eintrag) {
  return typeof eintrag?.titel === 'string' && eintrag.titel.trim() !== '' ? eintrag.titel : String(eintrag?.id ?? '')
}

/**
 * Schreibt einen Block nur, wenn sich sein HTML geändert hat; ein fehlender Container wird
 * gemeldet, nicht geworfen. Wirft der Erzeuger (unerwartete Datenform), zeigt nur dieser Block
 * „nicht verfügbar“ — die übrigen rendern weiter.
 * @param id - Element-ID des Blocks
 * @param erzeuger - () => HTML des Blocks
 */
function setzeBlock(id, erzeuger) {
  let html
  try {
    html = erzeuger()
  } catch (fehler) {
    console.error(`dashboard: Block ${id} nicht darstellbar:`, fehler)
    html = `<p>${nichtVerfuegbar()}</p>`
  }
  if (blockCache.get(id) === html) return
  const element = document.getElementById(id)
  if (element === null) {
    console.error(`dashboard: Block ${id} fehlt`)
    return
  }
  // Ein Neuschreiben (z. B. nach dem Nachladen von „In diesem Lauf“) darf den Fokus eines Reiters oder
  // Filters nicht verlieren: das fokussierte Element wird über id bzw. data-arbeitsstand-filter
  // wiedergefunden. Element fehlt außerhalb des Browsers (node:test mit Schein-DOM).
  const aktiv = typeof Element !== 'undefined' && document.activeElement instanceof Element && element.contains(document.activeElement) ? document.activeElement : null
  const filter = aktiv?.getAttribute('data-arbeitsstand-filter') ?? null
  const ziel = aktiv?.getAttribute('href') ?? null
  let fokusSelektor = null
  if (aktiv !== null && aktiv.id !== '') fokusSelektor = `#${CSS.escape(aktiv.id)}`
  else if (filter !== null) fokusSelektor = `[data-arbeitsstand-filter="${CSS.escape(filter)}"]`
  else if (ziel !== null) fokusSelektor = `a[href="${CSS.escape(ziel)}"]`
  element.innerHTML = html
  blockCache.set(id, html)
  if (fokusSelektor !== null) element.querySelector(fokusSelektor)?.focus()
}

// ─── Abgeleitete Lage ─────────────────────────────────────────────────────────

/**
 * Zustand der Roadmap samt aktuellem Meilenstein.
 * @returns { zustand, meilenstein }
 */
function roadmapLage() {
  const zustand = roadmapZustand(roadmap)
  return { zustand, meilenstein: zustand === 'ok' ? aktuellerMeilenstein(roadmap) : null }
}

/**
 * Feature in Arbeit samt Workflow, jüngster Lauf, dessen Workflow, die Nachträge dazu und der
 * Status des Rollen-Kreises.
 * @returns { zustand, feature, ablaufOhneFeature, featureLaedt, kreisWorkflow, kreisNachtrag, kreis, lauf, laufWorkflow, laufNachtrag }
 */
function lage() {
  const zustand = letzterZustand
  const workflows = Array.isArray(zustand?.workflows) ? zustand.workflows : null
  const verknuepfung = baueVerknuepfung(zustand === null ? undefined : (zustand.workflows ?? null), auftraege)
  const { meilenstein } = roadmapLage()
  const feature = waehleFeatureInArbeit(workitems, verknuepfung, meilenstein)
  // Ohne Feature in Arbeit: ein laufender bzw. wartender Ablauf ohne Feature (Prüfpass D1 qa 2).
  const fokus = waehleFokusWorkflow(workflows)
  const ablaufOhneFeature = feature === null && fokus !== null && istNichtTerminal(fokus) ? fokus : null
  const kreisWorkflow = feature?.workflow ?? ablaufOhneFeature
  const kreisNachtrag = kreisWorkflow === null ? null : (nachtraege.get(kreisWorkflow.workflowId) ?? null)
  const lauf = waehleLetztenLauf(zustand?.laeufe ?? null)
  // „Sein Workflow“: derselbe Auftrag (auftragsbezug des Laufs = auftragId des Workflows).
  const auftragId = lauf?.auftragsbezug?.auftragId ?? null
  const laufWorkflow = auftragId !== null && workflows !== null ? (workflows.find((w) => w.auftragId === auftragId) ?? null) : null
  return {
    zustand,
    feature,
    ablaufOhneFeature,
    featureLaedt: workitems === undefined || roadmapZustand(roadmap) === 'laedt' || verknuepfung.laedt.length > 0,
    kreisWorkflow,
    kreisNachtrag,
    kreis: kreisStatus(kreisNachtrag?.status === 'ok' ? kreisNachtrag.daten : null),
    lauf,
    laufWorkflow,
    laufNachtrag: laufWorkflow === null ? null : (nachtraege.get(laufWorkflow.workflowId) ?? null),
  }
}

/**
 * Stand eines Workflows im Aggregat, der einen neuen Nachtrag rechtfertigt: Status, Cursor und Halt.
 * @param workflow - Workflow-Eintrag des Aggregats
 * @returns Vergleichsschlüssel
 */
function workflowStand(workflow) {
  return [workflow.status, workflow.aktiverSchrittId ?? '', workflow.naechster?.art ?? '', workflow.naechster?.schrittId ?? ''].join('|')
}

/**
 * Lädt den Nachtrag für jeden gebrauchten Workflow, dessen ID noch nicht geladen ist oder dessen Stand
 * im Aggregat sich geändert hat, und verwirft die nicht mehr gebrauchten. Bei einem Neuladen wegen
 * eines neuen Stands bleiben die alten Daten bis zur Antwort stehen (kein Flackern auf „Lädt…“).
 * @param workflowsGebraucht - Workflow des Kreises und Workflow zum jüngsten Lauf (je oder null)
 */
function stelleNachtraegeSicher(workflowsGebraucht) {
  const gebraucht = new Map(workflowsGebraucht.filter((w) => w !== null).map((w) => [w.workflowId, w]))
  for (const id of [...nachtraege.keys()]) if (!gebraucht.has(id)) nachtraege.delete(id)
  for (const [id, workflow] of gebraucht) {
    const stand = workflowStand(workflow)
    const eintrag = nachtraege.get(id)
    const wiederholen = eintrag?.status === 'fehler' && Date.now() >= eintrag.wiederholenAb
    if (eintrag !== undefined && eintrag.stand === stand && !wiederholen) continue
    if (eintrag?.laedtStand === stand) continue
    nachtraege.set(id, eintrag?.status === 'ok' ? { ...eintrag, laedtStand: stand } : { status: 'laedt', stand, laedtStand: stand })
    const generation = nachtragGeneration
    void ladeFokusNachtrag(workflow).then((daten) => {
      if (generation !== nachtragGeneration || nachtraege.get(id)?.laedtStand !== stand) return
      nachtraege.set(id, daten === null ? { status: 'fehler', stand, wiederholenAb: Date.now() + NACHTRAG_WIEDERHOLEN_MS } : { status: 'ok', stand, daten })
      render()
    })
  }
}

/**
 * Lädt die Beobachtung eines Laufs einmal (für „In diesem Lauf“); späte Antworten nach einem
 * Projektwechsel verwirft die Generation.
 * @param laufId - laufId des letzten Laufs der gewählten Rolle
 */
function stelleBeobachtungSicher(laufId) {
  if (typeof laufId !== 'string' || laufId === '' || beobachtungen.has(laufId)) return
  beobachtungen.set(laufId, { status: 'laedt' })
  const generation = nachtragGeneration
  void (async () => {
    let eintrag
    try {
      const antwort = await holeLaufDetail(laufId)
      if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`)
      const detail = await antwort.json()
      const laufakte = detail?.laufakte?.status === 'ok' ? detail.laufakte : null
      eintrag = { status: 'ok', beobachtung: laufakte?.beobachtung ?? null }
    } catch (fehler) {
      console.error(`dashboard: Lauf-Detail ${laufId} nicht ladbar:`, fehler)
      eintrag = { status: 'fehler' }
    }
    if (generation !== nachtragGeneration) return
    beobachtungen.set(laufId, eintrag)
    render()
  })()
}

/**
 * Text für einen fehlenden aktuellen Meilenstein.
 * @param zustand - roadmapZustand
 * @returns übersetzter Text
 */
function ohneMeilensteinText(zustand) {
  if (zustand === 'laedt') return t('uebersicht.laedt')
  if (zustand === 'nicht_vorhanden') return t('uebersicht.meilenstein.keineRoadmap')
  if (zustand === 'ungueltig') return t('uebersicht.meilenstein.ungueltig')
  if (zustand === 'fehler') return t('uebersicht.meilenstein.fehler')
  return t('uebersicht.meilenstein.alleAbgeschlossen')
}

/**
 * true, wenn der geführte erste Schritt gilt: keine Workitems, keine Roadmap und keine Workflows.
 * Sind die Workflows defekt (null) oder noch nicht da, gelten die normalen Blöcke — ein wartender
 * Workflow eines neuen Produkts darf nicht verdeckt werden (F-903).
 */
function istLeeresProdukt() {
  const workflows = letzterZustand?.workflows
  return Array.isArray(workitems) && workitems.length === 0 && roadmapZustand(roadmap) === 'nicht_vorhanden' && Array.isArray(workflows) && workflows.length === 0
}

/**
 * Feature-Bezeichnung „<ID> · <Titel>“ (ohne Titel nur die ID).
 * @param feature - { id, titel? }
 * @returns Rohtext
 */
function featureName(feature) {
  return typeof feature?.titel === 'string' && feature.titel.trim() !== '' ? `${feature.id} · ${feature.titel}` : String(feature?.id ?? '')
}

// ─── Blöcke ──────────────────────────────────────────────────────────────────

/**
 * 1. Kopf.
 * @returns HTML
 */
function kopfBlock() {
  const { zustand, meilenstein } = roadmapLage()
  const zeile = meilenstein !== null ? tHtml('uebersicht.meilenstein.aktuell', { titel: meilenstein.titel }) : escapeHtml(ohneMeilensteinText(zustand))
  return `<div class="page-heading uebersicht-kopf">
      <div>
        <div class="eyebrow">${tHtml('uebersicht.eyebrow')}</div>
        <h1 tabindex="-1">${escapeHtml(holeAktivesProjekt().name)}</h1>
        <p class="description">${zeile}</p>
      </div>
      <div class="action-row">
        ${kommtKnopf(t('uebersicht.aktion.produktBearbeiten'))}
        ${kommtKnopf(t('uebersicht.aktion.architekturCode'))}
        ${kommtKnopf(t('uebersicht.aktion.eintragErfassen'), { primaer: true, symbol: '+' })}
      </div>
    </div>`
}

/**
 * 2a. Karte Produktmanagement und Ziel dieser Version.
 * @returns HTML
 */
function produktKarte() {
  const phasen = ['strategie', 'nutzerwissen', 'planung', 'entwicklung', 'veroeffentlichung', 'lernen'].map((p) => tHtml(`uebersicht.zyklus.phase.${p}`)).join(' · ')
  let ziel
  const gefunden = versionsziel(projektakte)
  const zielStatus = projektakte?.versionsziel?.status
  if (projektakte === undefined) ziel = laedt()
  else if (projektakte === null) ziel = `<p>${nichtVerfuegbar()}</p>`
  else if (gefunden !== null) ziel = `<p class="uebersicht-ziel-text" title="${escapeHtml(gefunden.zielsatz)}">${escapeHtml(gefunden.zielsatz)}</p>`
  else if (zielStatus === 'fehlt') ziel = `<p class="subtle">${tHtml('uebersicht.ziel.zielfassungFehlt')}</p>`
  else if (zielStatus === 'fehler') ziel = `<p>${nichtVerfuegbar()}</p>`
  else ziel = `<p class="subtle">${tHtml('uebersicht.ziel.nichtEindeutig')} ${kommtBadge()}</p>`
  return `<article class="uebersicht-karte uebersicht-produkt">
      <div class="uebersicht-produkt-teil">
        <span class="eyebrow">${tHtml('uebersicht.zyklus.eyebrow')}</span>
        <h2>${tHtml('uebersicht.zyklus.titel')}</h2>
        <p class="subtle">${phasen}</p>
        ${textLink('#/produktzyklus', t('uebersicht.zyklus.link'))}
      </div>
      <div class="uebersicht-produkt-teil">
        <span class="eyebrow">${tHtml('uebersicht.ziel.eyebrow')}</span>
        ${ziel}
        ${textLink('#/projektakte', t('uebersicht.ziel.zielgruppe'))}
      </div>
    </article>`
}

/**
 * Zeile unter dem Titel in der Kreismitte: laufende Rolle, sonst Phase des Ablaufs.
 * @param l - lage()
 * @returns HTML
 */
function kreisZeile(l) {
  const jetzt = Object.entries(l.kreis).find(([, s]) => s.status === 'jetzt')
  if (l.kreisWorkflow === null) return tHtml('uebersicht.wer.keinAblauf')
  if (l.kreisNachtrag?.status === 'fehler') return tHtml('uebersicht.wer.schritteFehler')
  if (l.kreisNachtrag?.status !== 'ok') return tHtml('uebersicht.laedt')
  if (jetzt !== undefined) return tHtml('uebersicht.wer.rolleJetzt', { rolle: t(`kreis.rolle.${jetzt[0]}`) })
  return tHtml(`uebersicht.wer.phase.${workflowPhase(l.kreisWorkflow) ?? 'unbekannt'}`)
}

/**
 * 2b. Karte Wer arbeitet gerade: Feature in Arbeit und Rollen-Kreis.
 * @param l - lage()
 * @param auswahl - gewählte Rolle
 * @returns HTML
 */
function werKarte(l, auswahl) {
  const feature = l.feature
  const kopf = feature !== null ? tHtml('uebersicht.wer.eyebrowMit', { id: feature.id }) : tHtml('uebersicht.wer.eyebrow')
  let mitte
  if (feature === null && l.featureLaedt) mitte = `<span class="rk-mitte-eyebrow">${tHtml('uebersicht.laedt')}</span>`
  else if (feature === null && l.ablaufOhneFeature !== null) {
    const ziel = titelVon({ id: l.ablaufOhneFeature.workflowId, titel: l.ablaufOhneFeature.ziel })
    mitte = `<span class="rk-mitte-eyebrow">${tHtml('uebersicht.wer.ablaufOhneFeature')}</span><span class="rk-mitte-titel" title="${escapeHtml(ziel)}">${escapeHtml(ziel)}</span><span class="rk-mitte-zeile">${kreisZeile(l)}</span>`
  } else if (feature === null) mitte = `<span class="rk-mitte-eyebrow">${tHtml('uebersicht.wer.featureInArbeit')}</span><span class="rk-mitte-titel">${tHtml('uebersicht.wer.keinFeature')}</span>`
  else mitte = `<span class="rk-mitte-eyebrow">${tHtml('uebersicht.wer.featureInArbeit')}</span><span class="rk-mitte-titel" title="${escapeHtml(featureName(feature))}">${escapeHtml(featureName(feature))}</span><span class="rk-mitte-zeile">${kreisZeile(l)}</span>`
  return `<article class="uebersicht-karte uebersicht-wer">
      <span class="eyebrow">${kopf}</span>
      ${rollenKreisHtml({ status: l.kreis, auswahl, panelId: ROLLE_PANEL_ID, mitteHtml: mitte })}
    </article>`
}

/**
 * „In diesem Lauf“: Skills und Subagenten aus der Beobachtung des letzten Laufs der Rolle, sonst „—“.
 * @param schritt - Workflow-Schritt der Rolle oder null
 * @returns HTML
 */
function inDiesemLauf(schritt) {
  const laufId = typeof schritt?.lauf_id === 'string' && schritt.lauf_id !== '' ? schritt.lauf_id : null
  if (laufId === null) return '—'
  const eintrag = beobachtungen.get(laufId)
  if (eintrag === undefined || eintrag.status === 'laedt') return tHtml('uebersicht.laedt')
  if (eintrag.status === 'fehler' || eintrag.beobachtung === null || typeof eintrag.beobachtung !== 'object') return '—'
  const liste = (feld) => (Array.isArray(eintrag.beobachtung[feld]) ? eintrag.beobachtung[feld].filter((x) => typeof x === 'string') : [])
  const text = (werte) => (werte.length === 0 ? t('uebersicht.detail.keine') : werte.join(', '))
  return `${tHtml('uebersicht.detail.dateien')}<br>${tHtml('uebersicht.detail.skills', { liste: text(liste('skill_aufrufe')) })}<br>${tHtml('uebersicht.detail.agents', { liste: text(liste('subagent_aufrufe')) })}`
}

/**
 * 2c. Karte Rolle im Detail (Panel des Rollen-Registers).
 * @param l - lage()
 * @param auswahl - gewählte Rolle
 * @returns HTML
 */
function detailKarte(l, auswahl) {
  const eintrag = l.kreis[auswahl] ?? { status: 'offen', schritt: null }
  const schritt = eintrag.schritt
  const worker = typeof schritt?.worker === 'string' ? workerName(schritt.worker) : t(`kreis.worker.${auswahl}`)
  const laufId = typeof schritt?.lauf_id === 'string' && schritt.lauf_id !== '' ? schritt.lauf_id : null
  const modell =
    eintrag.status === 'jetzt' && l.kreisNachtrag?.status === 'ok' && typeof l.kreisNachtrag.daten.aktivLauf?.modellBeobachtet === 'string'
      ? `<p class="subtle">${tHtml('uebersicht.detail.modell', { modell: l.kreisNachtrag.daten.aktivLauf.modellBeobachtet })}</p>`
      : ''
  const links = []
  if (laufId !== null) links.push(textLink(`#/runs/${encodeURIComponent(laufId)}`, t('uebersicht.detail.output')))
  if (l.kreisWorkflow !== null) links.push(textLink(`#/workflows/${encodeURIComponent(l.kreisWorkflow.workflowId)}`, t('uebersicht.rolle.link')))
  return `<article class="uebersicht-karte uebersicht-detail" id="${ROLLE_PANEL_ID}" role="tabpanel" aria-labelledby="rollen-kreis-tab-${auswahl}" data-status="${eintrag.status}">
      <span class="eyebrow">${tHtml('uebersicht.detail.eyebrow', { status: t(`kreis.status.${eintrag.status}`) })}</span>
      <div class="uebersicht-detail-kopf"><h2>${tHtml(`kreis.rolle.${auswahl}`)}</h2><span class="subtle">${escapeHtml(worker)} · ${tHtml(`kreis.aufgabe.${auswahl}`)}</span></div>
      ${modell}
      <dl class="uebersicht-detail-liste">
        <dt>${tHtml('uebersicht.detail.bekommt')}</dt><dd>${kommtBadge()}</dd>
        <dt>${tHtml('uebersicht.detail.liefert')}</dt><dd>${kommtBadge()}</dd>
        <dt>${tHtml('uebersicht.detail.lauf')}</dt><dd>${inDiesemLauf(schritt)}</dd>
      </dl>
      ${links.length > 0 ? `<div class="uebersicht-detail-links">${links.join('')}</div>` : ''}
    </article>`
}

/**
 * 2d. Fortschritt (Ring) und Braucht dich (Zahl).
 * @returns HTML
 */
function fortschrittSpalte() {
  const { zustand, meilenstein } = roadmapLage()
  let fortschritt
  if (meilenstein !== null) {
    const { abgenommen, gesamt } = zaehleMeilenstein(meilenstein)
    fortschritt = `${ring(abgenommen, gesamt, { klein: true, label: t('uebersicht.ring.label', { abgenommen: formatiereZahl(abgenommen), gesamt: formatiereZahl(gesamt) }) })}
      <p>${tHtml('uebersicht.fortschritt.zahl', { abgenommen: formatiereZahl(abgenommen), gesamt: formatiereZahl(gesamt) })}</p>`
  } else {
    fortschritt = `<p>${zustand === 'ungueltig' || zustand === 'fehler' ? nichtVerfuegbar() : escapeHtml(ohneMeilensteinText(zustand))}</p>`
    // Prüfpass D1 (qa 5): „Erneut laden“ der Roadmap bleibt auf der Übersicht erreichbar.
    if (zustand === 'fehler') fortschritt += `<button type="button" class="button" data-uebersicht-erneut>${tHtml('roadmap.fehler.erneut')}</button>`
  }

  let brauchtDich
  if (letzterZustand === null) brauchtDich = laedt()
  else {
    const { eintraege, zaehler, defekt } = baueEntscheidungen(letzterZustand, p0p1)
    const vollstaendig = Object.values(zaehler).every((z) => typeof z === 'number')
    if (vollstaendig) brauchtDich = `<p class="uebersicht-braucht-zahl">${tHtml('uebersicht.braucht.zahl', { anzahl: eintraege.length, zahl: formatiereZahl(eintraege.length) })}</p>`
    else if (defekt) brauchtDich = `<p>${nichtVerfuegbar()}</p><p class="subtle">${tHtml('uebersicht.entscheidungen.defekt')}</p>`
    else brauchtDich = laedt()
  }
  return `<div class="uebersicht-spalte">
      <article class="uebersicht-karte uebersicht-fortschritt">
        <span class="eyebrow">${tHtml('uebersicht.fortschritt.titel')}</span>
        ${fortschritt}
        ${textLink('#/roadmap', t('uebersicht.fortschritt.stand'))}
      </article>
      <article class="uebersicht-karte uebersicht-braucht">
        <span class="eyebrow">${tHtml('uebersicht.braucht.titel')}</span>
        ${brauchtDich}
        <p class="subtle">${tHtml('uebersicht.braucht.text')}</p>
        ${textLink('#/attention', t('uebersicht.braucht.link'))}
      </article>
    </div>`
}

/**
 * 2. Die vier Kopfkarten.
 * @param l - lage()
 * @returns HTML
 */
function cockpitBlock(l) {
  const auswahl = gewaehlteRolle ?? vorgewaehlteRolle(l.kreis)
  return `${produktKarte()}${werKarte(l, auswahl)}${detailKarte(l, auswahl)}${fortschrittSpalte()}`
}

/**
 * Ein Wert der Vierer-Leiste.
 * @param label - Titel
 * @param unterzeile - Erklärung
 * @param wertHtml - Zahl, „nicht verfügbar“ oder „Lädt…“ (fertiges HTML)
 * @param klasse - optionale Tönung ('waiting' | 'done')
 * @returns HTML
 */
function wert(label, unterzeile, wertHtml, klasse = '') {
  return `<div class="pm-summary${klasse ? ` ${klasse}` : ''}"><span>${escapeHtml(label)}</span><strong>${wertHtml}</strong><small>${escapeHtml(unterzeile)}</small></div>`
}

/**
 * 3. Vier Kennzahlen. In Arbeit = aktiverLauf.aktiv ? 1 : 0; Deine Entscheidung = wartende
 * Workflows (filtereAttentionWorkflows); Abgenommen und Geplant aus dem aktuellen Meilenstein.
 * @returns HTML
 */
function werteBlock() {
  const zustand = letzterZustand
  const zahl = (n) => escapeHtml(formatiereZahl(n))
  const laedtText = `<span class="uebersicht-wert-laedt">${tHtml('uebersicht.laedt')}</span>`

  let inArbeit = laedtText
  let entscheidung = laedtText
  if (zustand !== null) {
    inArbeit = typeof zustand.aktiverLauf?.aktiv === 'boolean' ? zahl(zustand.aktiverLauf.aktiv ? 1 : 0) : nichtVerfuegbar()
    // F46 D2 (F-972): offene Abnahmen warten ebenso auf dich — dieselbe Regel wie „Deine Entscheidungen“.
    const wartend = filtereAttentionWorkflows(zustand.workflows ?? null)
    const abnahmen = filtereOffeneAbnahmen(zustand.workflows ?? null)
    entscheidung = wartend === null || abnahmen === null ? nichtVerfuegbar() : zahl(wartend.length + abnahmen.length)
  }

  const { zustand: rz, meilenstein } = roadmapLage()
  let abgenommen
  let geplant
  if (rz === 'laedt') {
    abgenommen = laedtText
    geplant = laedtText
  } else if (rz === 'ungueltig' || rz === 'fehler') {
    abgenommen = nichtVerfuegbar()
    geplant = nichtVerfuegbar()
  } else if (meilenstein === null) {
    // Keine Roadmap oder alle Meilensteine abgeschlossen: kein aktueller Meilenstein, kein Wert.
    abgenommen = '–'
    geplant = '–'
  } else {
    abgenommen = zahl(zaehleMeilenstein(meilenstein).abgenommen)
    geplant = zahl(zaehleGeplant(meilenstein))
  }
  return `<div class="pm-summary-strip">
      ${wert(t('uebersicht.wert.inArbeit'), t('uebersicht.wert.inArbeit.text'), inArbeit)}
      ${wert(t('uebersicht.wert.entscheidung'), t('uebersicht.wert.entscheidung.text'), entscheidung, 'waiting')}
      ${wert(t('uebersicht.wert.abgenommen'), t('uebersicht.wert.abgenommen.text'), abgenommen, 'done')}
      ${wert(t('uebersicht.wert.geplant'), t('uebersicht.wert.geplant.text'), geplant)}
    </div>`
}

/**
 * 4. „Der Weg von <Feature>“: Kopf echt, Zeitleiste „kommt“.
 * @param l - lage()
 * @returns HTML
 */
function wegBlock(l) {
  const titel = l.feature !== null ? tHtml('uebersicht.weg.titelMit', { feature: featureName(l.feature) }) : tHtml('uebersicht.weg.titelOhne')
  return `<div class="section-label uebersicht-weg-kopf">
      <div>
        <h2>${titel}</h2>
        <p class="subtle">${tHtml('uebersicht.weg.text')}</p>
      </div>
      ${textLink('#/roadmap', t('uebersicht.weg.link'))}
    </div>
    <div class="uebersicht-weg-kommt" aria-disabled="true">
      <strong>${tHtml('uebersicht.weg.zeitleiste')} ${kommtBadge()}</strong>
      <p class="subtle">${tHtml('uebersicht.weg.zeitleiste.text')}</p>
    </div>`
}

/**
 * 5. Drei Kacheln Features / Bugs / Harness Improvements mit der Zahl offener Workitems je Typ
 * (Findings: Status OFFEN; Features: weder ABGESCHLOSSEN noch ABGEBROCHEN).
 * @returns HTML
 */
function kachelnBlock() {
  return `<div class="pm-category-links">${KACHEL_TYPEN.map((typ) => {
    let zeile
    if (workitems === undefined) zeile = tHtml('uebersicht.laedt')
    else if (workitems === null) zeile = nichtVerfuegbar()
    else {
      const anzahl = workitems.reduce((summe, w) => (w.typ === typ && (typ === 'FEATURE' ? w.status !== 'ABGESCHLOSSEN' && w.status !== 'ABGEBROCHEN' : w.status === 'OFFEN') ? summe + 1 : summe), 0)
      zeile = `${tHtml('uebersicht.kachel.offen', { anzahl, zahl: formatiereZahl(anzahl) })} · ${tHtml(`uebersicht.kachel.${typ}.text`)}`
    }
    return `<a class="pm-category-card" href="#/workboard">
        <span class="pm-category-symbol" aria-hidden="true">${KACHEL_SYMBOL[typ]}</span>
        <div><strong>${tHtml(`uebersicht.kachel.${typ}`)}</strong><small>${zeile}</small></div>
        ${PFEIL}
      </a>`
  }).join('')}</div>`
}

/**
 * Eine Karte des Arbeitsstands.
 * @param workitem - Workitem
 * @param verknuepfung - aus baueBoard
 * @returns HTML
 */
function arbeitsKarte(workitem, verknuepfung) {
  const typ = chipTypVonWorkitem(workitem.typ)
  const chip = typ === null ? `<span class="typ-chip typ-chip-neutral">${escapeHtml(String(workitem.typ ?? ''))}</span>` : typChip(typ)
  const prio = typeof workitem.prioritaet === 'string' ? `<span class="uebersicht-karte-prio">${escapeHtml(workitem.prioritaet)}</span>` : ''
  let zeile = escapeHtml(workitem.id)
  if (workitem.quelle === 'feature') {
    const phase = workflowPhase(verknuepfterWorkflow(workitem, verknuepfung))
    zeile += ` · ${phase !== null ? tHtml(`uebersicht.wer.phase.${phase}`) : tHtml(`roadmap.status.${statusKategorie(workitem.status)}`)}`
  }
  return `<a class="uebersicht-arbeit-karte" href="#/workboard/${encodeURIComponent(workitem.id)}">
      <span class="uebersicht-arbeit-kopf">${chip}${prio}</span>
      <span class="uebersicht-arbeit-titel">${escapeHtml(titelVon(workitem))}</span>
      <span class="subtle">${zeile}</span>
    </a>`
}

/**
 * 6. Arbeitsstand mit Filter: das Status-Kanban (baueBoard) mit den ersten Karten je Spalte.
 * @returns HTML
 */
function arbeitsstandBlock() {
  const filter = ['alles', ...SPALTEN]
    .map((f) => `<button type="button" class="uebersicht-filter" data-arbeitsstand-filter="${f}" aria-pressed="${arbeitsstandFilter === f}">${tHtml(`uebersicht.arbeitsstand.${f}`)}</button>`)
    .join('')
  const kopf = `<h2 class="sr-only">${tHtml('uebersicht.arbeitsstand.titel')}</h2>
    <div class="uebersicht-filterzeile" role="group" aria-label="${tHtml('uebersicht.arbeitsstand.ansicht')}"><span class="subtle">${tHtml('uebersicht.arbeitsstand.ansicht')}</span>${filter}</div>`
  if (workitems === undefined) return `${kopf}${laedt()}`
  const board = baueBoard(workitems, letzterZustand === null ? undefined : (letzterZustand.workflows ?? null), auftraege)
  if (board === null) return `${kopf}<p>${nichtVerfuegbar()}</p>`
  const hinweis = board.fehlend.length > 0 ? `<p class="subtle">${tHtml('uebersicht.arbeitsstand.ohneVerknuepfung')}</p>` : ''
  const spalten = arbeitsstandFilter === 'alles' ? SPALTEN : [arbeitsstandFilter]
  const max = arbeitsstandFilter === 'alles' ? KARTEN_JE_SPALTE_UEBERSICHT : KARTEN_GEFILTERT
  const html = spalten
    .map((spalte) => {
      const daten = board.spalten[spalte]
      const karten = daten.karten.slice(0, max)
      const weitere = daten.anzahl - karten.length
      const inhalt = karten.length === 0 ? `<p class="uebersicht-arbeit-leer">${tHtml(`uebersicht.arbeitsstand.leer.${spalte}`)}</p>` : karten.map((w) => arbeitsKarte(w, board.verknuepfung)).join('')
      const mehr = weitere > 0 ? textLink('#/workboard', t('uebersicht.arbeitsstand.weitere', { anzahl: weitere, zahl: formatiereZahl(weitere) })) : ''
      return `<section class="uebersicht-arbeit-spalte" data-spalte="${spalte}" aria-label="${tHtml(`uebersicht.arbeitsstand.${spalte}`)}">
          <div class="uebersicht-arbeit-spaltenkopf"><span>${tHtml(`uebersicht.arbeitsstand.${spalte}`)}</span><span class="uebersicht-zaehler">${escapeHtml(formatiereZahl(daten.anzahl))}</span></div>
          ${inhalt}
          ${mehr}
        </section>`
    })
    .join('')
  return `${kopf}${hinweis}<div class="uebersicht-arbeit-board${arbeitsstandFilter === 'alles' ? '' : ' gefiltert'}">${html}</div>`
}

/**
 * Die letzte Ausführung (bisheriges „Zuletzt umgesetzt“, F44 B12) als ruhige Zeile mit Links.
 * @param l - lage()
 * @returns HTML
 */
function letzteAusfuehrung(l) {
  if (l.zustand === null) return laedt()
  if (!Array.isArray(l.zustand.laeufe)) return `<p>${nichtVerfuegbar()}</p>`
  if (l.lauf === null) return `<p class="subtle">${tHtml('uebersicht.zuletzt.leer')}</p>`
  const titel = titelVon({ id: titelVon({ id: l.lauf.laufId, titel: l.lauf.auftragsbezug?.titel }), titel: l.laufWorkflow?.ziel })
  const ergebnis = l.lauf.ergebnis ?? l.lauf.laufStatus?.status ?? null
  const zeit = l.lauf.zeitpunkt ? ` · <time datetime="${escapeHtml(l.lauf.zeitpunkt)}">${escapeHtml(formatiereDatum(l.lauf.zeitpunkt, { dateStyle: 'medium', timeStyle: 'short' }))}</time>` : ''
  let schritte = ''
  if (l.laufNachtrag?.status === 'ok') {
    const liste = l.laufNachtrag.daten.schritte
    const erledigt = liste.filter((s) => s.status === 'ERFOLGREICH').length
    schritte = ` · ${tHtml('uebersicht.zuletzt.schritte', { anzahl: liste.length, erledigt: formatiereZahl(erledigt), gesamt: formatiereZahl(liste.length) })}`
  }
  const links = [textLink(`#/runs/${encodeURIComponent(l.lauf.laufId)}`, t('uebersicht.zuletzt.lauf'))]
  if (l.laufWorkflow !== null) links.push(textLink(`#/workflows/${encodeURIComponent(l.laufWorkflow.workflowId)}`, t('uebersicht.rolle.link')))
  return `<p class="uebersicht-letzter-lauf"><span class="eyebrow">${tHtml('uebersicht.zuletzt.ausfuehrung')}</span> <strong>${escapeHtml(titel)}</strong> · ${tHtml('uebersicht.zuletzt.ergebnis')} ${ergebnis === null ? tHtml('uebersicht.zuletzt.offen') : `<code>${escapeHtml(ergebnis)}</code>`}${zeit}${schritte}</p>
    <div class="action-row">${links.join('')}</div>`
}

/**
 * Das zuletzt abgenommene Feature: im aktuellen Meilenstein das letzte ABGESCHLOSSEN in
 * Roadmap-Reihenfolge, sonst im jüngsten Meilenstein davor mit einem solchen (ohne aktuellen
 * Meilenstein: vom letzten rückwärts). Ein Abnahmedatum gibt es nicht — die Reihenfolge ist die der
 * Roadmap (Prüfpass D1 qa 10).
 * @param daten - gültige Roadmap-Projektion
 * @returns { feature, meilenstein } oder null
 */
function letztesAbgenommenes(daten) {
  const meilensteine = daten.meilensteine
  const aktueller = aktuellerMeilenstein(daten)
  const start = aktueller === null ? meilensteine.length - 1 : meilensteine.indexOf(aktueller)
  for (let i = start; i >= 0; i--) {
    const abgenommene = meilensteine[i].features.filter((f) => f?.status === 'ABGESCHLOSSEN')
    if (abgenommene.length > 0) return { feature: abgenommene[abgenommene.length - 1], meilenstein: meilensteine[i] }
  }
  return null
}

/**
 * 7. Zuletzt umgesetzt: das zuletzt abgenommene Feature (letztesAbgenommenes), Workstream-Ring und
 * „Danach“ als „kommt“; darunter die letzte Ausführung.
 * @param l - lage()
 * @returns HTML
 */
function zuletztBlock(l) {
  const zustand = roadmapZustand(roadmap)
  let haupt
  if (zustand === 'laedt') haupt = laedt()
  else if (zustand !== 'ok') haupt = `<p class="subtle">${escapeHtml(ohneMeilensteinText(zustand))}</p>`
  else {
    const fund = letztesAbgenommenes(roadmap)
    haupt =
      fund === null
        ? `<p class="subtle">${tHtml('uebersicht.zuletzt.keinFeature')}</p>`
        : `<h2>${escapeHtml(featureName(fund.feature))}</h2>
        <p>${tHtml('uebersicht.zuletzt.satz', { meilenstein: fund.meilenstein.titel })}</p>
        <div class="action-row"><a class="button primary" href="#/workboard/${encodeURIComponent(fund.feature.id)}">${tHtml('uebersicht.zuletzt.ansehen')} <span aria-hidden="true">→</span></a></div>`
  }
  // Der Ring der Vorlage zeigt Workstreams des Features — die sind noch keine Daten (Fixpaket B2).
  const ringHtml = `<div class="uebersicht-zuletzt-ring" aria-disabled="true"><span class="eyebrow">${tHtml('uebersicht.zuletzt.workstreams')}</span>${kommtBadge()}</div>`
  return `<div class="uebersicht-zuletzt">
      <div class="uebersicht-zuletzt-haupt">
        <span class="eyebrow">${tHtml('uebersicht.zuletzt.eyebrow')}</span>
        ${haupt}
      </div>
      ${ringHtml}
      <div class="uebersicht-zuletzt-danach" aria-disabled="true">
        <span class="eyebrow">${tHtml('uebersicht.zuletzt.danach')} ${kommtBadge()}</span>
        <p class="subtle">${tHtml('uebersicht.zuletzt.danach.text')}</p>
      </div>
    </div>
    <div class="uebersicht-zuletzt-lauf">${letzteAusfuehrung(l)}</div>`
}

/**
 * 8. Was steckt dahinter: drei Knöpfe „kommt“.
 * @returns HTML
 */
function dahinterBlock() {
  return `<section class="uebersicht-dahinter">
      <div>
        <span class="eyebrow">${tHtml('uebersicht.dahinter.eyebrow')}</span>
        <h2>${tHtml('uebersicht.dahinter.titel')}</h2>
        <p class="subtle">${tHtml('uebersicht.dahinter.text')}</p>
      </div>
      <div class="action-row">
        ${kommtKnopf(t('uebersicht.dahinter.architektur'))}
        ${kommtKnopf(t('uebersicht.dahinter.code'))}
        ${kommtKnopf(t('uebersicht.dahinter.health'))}
      </div>
    </section>`
}

/**
 * 9. Betrieb: Läufe, Workflows und Startfehler als ruhige Zeile mit Links.
 * @returns HTML
 */
function betriebBlock() {
  const zustand = letzterZustand
  const eintrag = (schluessel, liste, hash) => {
    let wertHtml
    if (zustand === null) wertHtml = tHtml('uebersicht.laedt')
    else if (!Array.isArray(liste)) wertHtml = nichtVerfuegbar()
    else wertHtml = `<strong>${escapeHtml(formatiereZahl(liste.length))}</strong>`
    return `<a href="${hash}">${tHtml(schluessel)} ${wertHtml}</a>`
  }
  return `<p class="uebersicht-betrieb"><span class="eyebrow">${tHtml('uebersicht.betrieb.eyebrow')}</span>
      ${eintrag('uebersicht.betrieb.laeufe', zustand?.laeufe, '#/ausfuehrungen')}
      ${eintrag('uebersicht.betrieb.workflows', zustand?.workflows, '#/runs')}
      ${eintrag('uebersicht.betrieb.startfehler', zustand?.startfehler, '#/ausfuehrungen')}
    </p>`
}

/**
 * 10. Geführter erster Schritt.
 * @returns HTML
 */
function ersterSchrittBlock() {
  const schritte = ['beschreiben', 'pruefen', 'freigeben'].map((s) => `<li><strong>${tHtml(`uebersicht.ersterSchritt.${s}`)}</strong><span>${tHtml(`uebersicht.ersterSchritt.${s}.text`)}</span></li>`).join('')
  return `<section class="first-step">
      <span class="eyebrow">${tHtml('uebersicht.ersterSchritt.eyebrow')}</span>
      <h2>${tHtml('uebersicht.ersterSchritt.titel')}</h2>
      <p>${tHtml('uebersicht.ersterSchritt.text')}</p>
      <div class="action-row"><a class="button primary" href="#/projekt">${tHtml('uebersicht.ersterSchritt.aktion')}</a></div>
      <ol class="onboarding-steps">${schritte}</ol>
    </section>`
}

// ─── Zusammenbau ────────────────────────────────────────────────────────────

/** Gerüst mit einem Container je Block; jeder Block zeigt zunächst „Lädt…“. */
function geruest() {
  const l = `<p class="subtle">${tHtml('uebersicht.laedt')}</p>`
  return `<div id="uebersicht-b1">${l}</div>
    <div id="uebersicht-erster-schritt" hidden></div>
    <div id="uebersicht-inhalt">
      <section class="uebersicht-cockpit" id="uebersicht-cockpit" aria-label="${tHtml('uebersicht.cockpit')}">${l}</section>
      <div id="uebersicht-werte">${l}</div>
      <section class="uebersicht-weg" id="uebersicht-weg">${l}</section>
      <div id="uebersicht-kacheln">${l}</div>
      <section class="uebersicht-arbeitsstand" id="uebersicht-arbeitsstand">${l}</section>
      <section class="uebersicht-zuletzt-block" id="uebersicht-zuletzt">${l}</section>
      <div id="uebersicht-dahinter"></div>
    </div>
    <div id="uebersicht-betrieb">${l}</div>`
}

/** Setzt das Gerüst neu (Bootstrap, Projektwechsel) und vergisst den Block-Cache. */
function setzeGeruest() {
  const container = document.getElementById('view-dashboard')
  if (container === null) {
    console.error('dashboard: Container view-dashboard fehlt')
    return
  }
  blockCache.clear()
  container.innerHTML = geruest()
}

/** Rendert alle Blöcke aus dem aktuellen Stand; jeder Block wird nur bei Änderung geschrieben. */
function render() {
  const l = lage()
  stelleNachtraegeSicher([l.kreisWorkflow, l.laufWorkflow])
  stelleBeobachtungSicher(l.kreis[gewaehlteRolle ?? vorgewaehlteRolle(l.kreis)]?.schritt?.lauf_id)
  setzeBlock('uebersicht-b1', kopfBlock)
  setzeBlock('uebersicht-betrieb', betriebBlock)

  const leer = istLeeresProdukt()
  const ersterSchritt = document.getElementById('uebersicht-erster-schritt')
  const inhalt = document.getElementById('uebersicht-inhalt')
  if (ersterSchritt !== null) ersterSchritt.hidden = !leer
  if (inhalt !== null) inhalt.hidden = leer
  if (leer) {
    setzeBlock('uebersicht-erster-schritt', ersterSchrittBlock)
    return
  }
  setzeBlock('uebersicht-cockpit', () => cockpitBlock(l))
  setzeBlock('uebersicht-werte', werteBlock)
  setzeBlock('uebersicht-weg', () => wegBlock(l))
  setzeBlock('uebersicht-kacheln', kachelnBlock)
  setzeBlock('uebersicht-arbeitsstand', arbeitsstandBlock)
  setzeBlock('uebersicht-zuletzt', () => zuletztBlock(l))
  setzeBlock('uebersicht-dahinter', dahinterBlock)
}

// ─── Laden ────────────────────────────────────────────────────────────────────

/**
 * Lädt eine Quelle mit Überholschutz und rendert danach.
 * @param name - Schlüssel in anfrageZaehler
 * @param abruf - () => Promise mit der Antwort
 * @param uebernehmen - (antwort) => void bei Erfolg
 * @param fehlschlag - (fehler) => void bei Wurf
 */
async function ladeQuelle(name, abruf, uebernehmen, fehlschlag) {
  const meineNummer = ++anfrageZaehler[name]
  try {
    const antwort = await abruf()
    if (meineNummer !== anfrageZaehler[name]) return
    uebernehmen(antwort)
  } catch (fehler) {
    if (meineNummer !== anfrageZaehler[name]) return
    console.error(`dashboard: Abruf ${name} fehlgeschlagen:`, fehler)
    fehlschlag(fehler)
  }
  render()
}

/** Lädt die Roadmap neu (Betreten, Projektwechsel). */
function ladeRoadmap() {
  roadmap = null
  void ladeQuelle(
    'roadmap',
    () => holeRoadmap(),
    (antwort) => {
      roadmap = antwort
    },
    (fehler) => {
      roadmap = { status: 'fehler', grund: fehler instanceof Error ? fehler.message : String(fehler) }
    }
  )
}

/**
 * Lädt eine Liste aus einer Antwort mit einem Listenfeld.
 * @param name - Schlüssel in anfrageZaehler
 * @param abruf - () => Promise
 * @param feld - Listenfeld der Antwort
 * @param setze - (liste | null) => void
 */
function ladeListe(name, abruf, feld, setze) {
  void ladeQuelle(
    name,
    abruf,
    (antwort) => setze(Array.isArray(antwort?.[feld]) ? antwort[feld] : null),
    () => setze(null)
  )
}

/** Lädt alle Quellen neu und verwirft Nachträge und Beobachtungen (frischer Stand, F-899) — beim Betreten und beim Projektwechsel, nie aus dem Poll. */
function ladeAlles() {
  workitems = undefined
  auftraege = undefined
  p0p1 = undefined
  projektakte = undefined
  nachtragGeneration++
  nachtraege.clear()
  beobachtungen.clear()
  ladeRoadmap()
  ladeListe('workitems', () => holeWorkitems(), 'workitems', (liste) => {
    workitems = liste
  })
  // GET …/auftraege liefert die Liste selbst (kein Hüllobjekt, Muster views/workboard.js).
  void ladeQuelle(
    'auftraege',
    () => holeAuftraegeBegrenzt(),
    (antwort) => {
      auftraege = Array.isArray(antwort) ? antwort : null
    },
    () => {
      auftraege = null
    }
  )
  ladeListe('p0p1', () => holeOffeneP0P1Workitems(), 'workitems', (liste) => {
    p0p1 = liste
  })
  void ladeQuelle(
    'projektakte',
    () => holeProjektakte(),
    (antwort) => {
      projektakte = antwort !== null && typeof antwort === 'object' ? antwort : null
    },
    () => {
      projektakte = null
    }
  )
  render()
}

/**
 * Wählt eine Rolle im Rollen-Register und gibt dem Reiter den Fokus zurück (der Block wird neu
 * geschrieben).
 * @param rolle - Rollen-ID
 * @param fokus - true, wenn der Reiter danach den Fokus bekommen soll
 */
function waehleRolle(rolle, fokus) {
  gewaehlteRolle = rolle
  render()
  if (fokus) document.getElementById(`rollen-kreis-tab-${rolle}`)?.focus()
}

/** Klick- und Tastatur-Delegation: Rollen-Register, Filter des Arbeitsstands, „Erneut laden“ der Roadmap — ohne Schreibwirkung. */
function initBedienung() {
  const container = document.getElementById('view-dashboard')
  container?.addEventListener('click', (ereignis) => {
    if (!(ereignis.target instanceof Element)) return
    const reiter = ereignis.target.closest('[data-kreis-rolle]')
    if (reiter !== null) {
      waehleRolle(reiter.getAttribute('data-kreis-rolle'), true)
      return
    }
    if (ereignis.target.closest('[data-uebersicht-erneut]') !== null) {
      ladeRoadmap()
      document.querySelector('#view-dashboard h1')?.focus()
      return
    }
    const filter = ereignis.target.closest('[data-arbeitsstand-filter]')
    if (filter !== null) {
      arbeitsstandFilter = filter.getAttribute('data-arbeitsstand-filter')
      render()
      document.querySelector(`[data-arbeitsstand-filter="${arbeitsstandFilter}"]`)?.focus()
    }
  })
  container?.addEventListener('keydown', (ereignis) => {
    if (!(ereignis.target instanceof Element)) return
    const reiter = ereignis.target.closest('[data-kreis-rolle]')
    if (reiter === null) return
    const neu = naechsteKreisRolle(reiter.getAttribute('data-kreis-rolle'), ereignis.key)
    if (neu === null) return
    ereignis.preventDefault()
    waehleRolle(neu, true)
  })
}

/** Initialisiert die Übersicht einmalig beim Bootstrap: Gerüst, Route mit Laden beim Betreten, Abonnement des Aggregats, Neuladen beim Projektwechsel. */
export function initDashboardView() {
  setzeGeruest()
  initBedienung()
  registriere(/^#\/dashboard$/, 'dashboard', ladeAlles)
  abonniere((zustand) => {
    letzterZustand = zustand
    render()
  })
  // F-860: Aggregat, Roadmap, Workitems, Aufträge, P0/P1, Projektakte und Nachträge gehören zum
  // Projekt — beim Wechsel verwerfen. Bis das Aggregat des neuen Projekts da ist, zeigen die Blöcke
  // „Lädt…“ statt der Daten des alten Projekts.
  abonniereProjektWechsel(() => {
    letzterZustand = null
    gewaehlteRolle = null
    setzeGeruest()
    ladeAlles()
  })
}
