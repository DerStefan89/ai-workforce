/**
 * Datei: public/leitstand/views/dashboard.js
 *
 * Zweck: View `#/dashboard` (F20 WS-2, F21 WS-2) — fünf Zahlen: drei aus dem
 * Zustands-Aggregat (Läufe, Startfehler, Workflows, unverändert), zwei neue
 * aus F21: offene P0/P1-Workitems (ein einmaliger GET /api/workitems-Abruf,
 * geteiltes Modul attention-daten.js — dieselbe Quelle und Filterregel wie
 * views/attention.js, kein zweiter, abweichender Fetch-Aufruf) und
 * Attention-relevante Workflows/Läufe aus dem ohnehin abonnierten Aggregat
 * (dieselbe Filterfunktion wie die Attention-View). F32 WS-2 ergänzt eine
 * sechste Karte "Verbrauch" (GET /api/verbrauch, F32 WS-1) mit drei festen
 * Zeiträumen (7 Tage / 30 Tage / gesamt, verbrauch-zeitraum.js) — Summen je
 * Rolle und je Modell, kein Kontingent (Nicht-Ziel, siehe features/F32/
 * feature.md), keine Kosten in Euro/USD (Entscheidung 30).
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initDashboardView beim Bootstrap)
 *
 * Wichtig: Bis zum ersten Poll-Tick zeigt der Container einen Leerzustand.
 * Eine Quelle mit dem Wert null (defekt, siehe leitstand-server.mjs
 * GET /api/zustand) zeigt einen Fehlertext statt einer geratenen Zahl. Der
 * Workitems- und der Verbrauchs-Abruf laufen einmalig beim Bootstrap bzw.
 * bei Zeitraumwechsel, NICHT bei jedem Poll-Tick (Findings/Feature-Akten und
 * Laufakten ändern sich nur durch Commits/echte Läufe, Muster views/
 * workboard.js ladeRoadmap) — ein manuelles Nachladen der Zahlen gibt es
 * hier bewusst nicht, dafür ist die Workboard-View da; die Verbrauchs-Karte
 * lädt zusätzlich bei jedem Klick auf einen anderen Zeitraum neu.
 *
 * F29 WS-2a: reine Stylingumstellung auf das Komponentenvokabular aus
 * views/workboard.js (WS-1b) — die fünf Zahlen sitzen jetzt als
 * .card.stat-Kacheln (.stat-wert/.stat-label) statt Zeilen einer
 * <table class="lauf-kopfdaten">, erster echter Verbraucher von .stat
 * außerhalb seiner Definition. Datengrundlage und Berechnung unverändert.
 */

import { abonniere } from '../zustand.js'
import { filtereAttentionLaeufe, filtereAttentionWorkflows, holeOffeneP0P1Workitems } from '../attention-daten.js'
import { holeVerbrauch } from '../api.js'
import { berechneVerbrauchsVon, VERBRAUCH_ZEITRAEUME } from '../verbrauch-zeitraum.js'
import { escapeHtml } from '../render.js'

/** Letztes Zustands-Aggregat aus dem Poll, oder null vor dem ersten Tick. */
let letzterZustand = null

/** Letzte Antwort aus holeOffeneP0P1Workitems, oder null vor dem ersten Abruf. */
let workitemsAntwort = null

/** Letzte Antwort aus holeVerbrauch, oder null vor dem ersten Abruf. { fehler: true } ist ein reiner Client-Sentinel (Muster views/workboard.js letzteRoadmap) für einen fehlgeschlagenen Abruf, kein Server-Status. */
let verbrauchAntwort = null

/** Aktuell gewählter Zeitraum der Verbrauchs-Karte (F32 WS-2) — Standard 30 Tage. */
let verbrauchZeitraum = '30t'

const VERBRAUCH_ZEITRAUM_LABEL = { '7t': '7 Tage', '30t': '30 Tage', gesamt: 'gesamt' }

/** @param liste - eine Aggregat-/Projektionsliste, oder null bei defekter Quelle @returns Anzeige-Text der Zahl */
function zahl(liste) {
  return liste === null ? '<span class="unbekannt">nicht verfügbar</span>' : String(liste.length)
}

/** Summe zweier Attention-Quellen — 'nicht verfügbar', sobald eine der beiden defekt (null) ist, statt einer teilweise geratenen Zahl. */
function attentionZahl(workflows, laeufe) {
  if (workflows === null || laeufe === null) return '<span class="unbekannt">nicht verfügbar</span>'
  return String(workflows.length + laeufe.length)
}

/** Eine Kennzahl-Kachel (Komponentenvokabular F29 WS-1a: .card + .stat/.stat-wert/.stat-label). @param label - Anzeigetext, hier stets ein festes Literal (kein escapeHtml nötig) @param wertHtml - bereits fertiges Anzeige-HTML aus zahl()/attentionZahl() */
function statKarte(label, wertHtml) {
  return `<div class="card stat">
    <span class="stat-wert">${wertHtml}</span>
    <span class="stat-label">${label}</span>
  </div>`
}

/**
 * Fasst die Gruppen aus GET /api/verbrauch (je { rolle, worker, modell, auftragId, ... }) über
 * genau ein Merkmal zusammen (Rolle ODER Modell) — die API-Projektion selbst gruppiert feiner
 * (zusätzlich nach worker/auftragId), diese Funktion summiert darüber hinweg. null bleibt eine
 * eigene Gruppe (unbekannt), keine Ausgrenzung. `gruppen` wird defensiv auf ein Array geprüft
 * (F-603-Fix, zweite Sicherung zusätzlich zum Fehler-Check in verbrauchKarte) — wirft nie, auch
 * nicht bei einem unerwartet fehlerhaften Antwortkörper.
 * @param gruppen - antwort.gruppen aus GET /api/verbrauch
 * @param schluesselFn - liest das Gruppierungsmerkmal aus einer Gruppe (g.rolle oder g.modell)
 * @returns Zeilen, absteigend nach Läufen sortiert
 */
function aggregiereVerbrauch(gruppen, schluesselFn) {
  const nachSchluessel = new Map()
  for (const gruppe of Array.isArray(gruppen) ? gruppen : []) {
    const schluessel = schluesselFn(gruppe)
    let zeile = nachSchluessel.get(schluessel)
    if (zeile === undefined) {
      zeile = { schluessel, anzahlLaeufe: 0, ohneBeobachtung: 0, inputTokens: 0, outputTokens: 0, cacheTokens: 0 }
      nachSchluessel.set(schluessel, zeile)
    }
    zeile.anzahlLaeufe += gruppe.anzahlLaeufe
    zeile.ohneBeobachtung += gruppe.ohneBeobachtung
    zeile.inputTokens += gruppe.verbrauch.inputTokens
    zeile.outputTokens += gruppe.verbrauch.outputTokens
    zeile.cacheTokens += gruppe.verbrauch.cacheReadTokens + gruppe.verbrauch.cacheWriteTokens
  }
  return [...nachSchluessel.values()].sort((a, b) => b.anzahlLaeufe - a.anzahlLaeufe)
}

/** Eine Zeile der Verbrauchs-Tabelle — null-Schlüssel als "unbekannt" mit erklärendem Tooltip (F32 Bekannte Grenze "Überladene null-Gruppierung"). */
function verbrauchZeile(zeile, unbekanntTooltip) {
  const beschriftung = zeile.schluessel === null ? `<span class="unbekannt" title="${escapeHtml(unbekanntTooltip)}">unbekannt</span>` : escapeHtml(zeile.schluessel)
  return `<tr><td>${beschriftung}</td><td>${zeile.anzahlLaeufe}</td><td>${zeile.ohneBeobachtung}</td><td>${zeile.inputTokens}</td><td>${zeile.outputTokens}</td><td>${zeile.cacheTokens}</td></tr>`
}

/** Eine Verbrauchs-Tabelle (Rolle oder Modell) — Leerzustand statt einer leeren Tabelle. */
function verbrauchTabelle(zeilen, spaltenLabel, unbekanntTooltip) {
  if (zeilen.length === 0) return '<p class="leer">Keine Läufe im Zeitraum.</p>'
  const koerper = zeilen.map((z) => verbrauchZeile(z, unbekanntTooltip)).join('')
  return `<table><thead><tr><th>${spaltenLabel}</th><th>Läufe</th><th>ohne Beobachtung</th><th>Tokens ein</th><th>Tokens aus</th><th>Tokens Cache</th></tr></thead><tbody>${koerper}</tbody></table>`
}

/** Rendert die Karte "Verbrauch" (F32 WS-2) — Zeitraum-Umschalter plus Summen je Rolle und je Modell. Lädt nie selbst nach (reine Anzeige von verbrauchAntwort). */
function verbrauchKarte() {
  const kopf = '<div class="card-kopf"><h3>Verbrauch</h3></div>'
  const auswahl = `<div class="verbrauch-zeitraum-auswahl">${VERBRAUCH_ZEITRAEUME.map(
    (p) => `<button type="button" class="btn${p === verbrauchZeitraum ? ' btn-primary' : ''}" data-verbrauch-zeitraum="${p}">${VERBRAUCH_ZEITRAUM_LABEL[p]}</button>`
  ).join('')}</div>`

  if (verbrauchAntwort === null) {
    return `<div class="card verbrauch-karte">${kopf}${auswahl}<p class="leer">Lädt…</p></div>`
  }
  // F-603-Fix: fehler === true ist der Client-Sentinel für einen Netzwerk-/Wurf-Fehlschlag
  // (ladeVerbrauch-catch), !Array.isArray(...gruppen) fängt zusätzlich jeden unerwarteten
  // Antwortkörper ab (z. B. ein server-seitiges Fachergebnis, das trotz Normalisierung in
  // ladeVerbrauch ohne gruppen hier ankäme) — beide Fälle zeigen denselben Fehlerhinweis,
  // NIE wird aggregiereVerbrauch mit einem Nicht-Array aufgerufen.
  if (verbrauchAntwort.fehler === true || !Array.isArray(verbrauchAntwort.gruppen)) {
    return `<div class="card verbrauch-karte">${kopf}${auswahl}<p class="fehler">Verbrauch konnte nicht geladen werden.</p></div>`
  }

  const nachRolle = aggregiereVerbrauch(verbrauchAntwort.gruppen, (g) => g.rolle)
  const nachModell = aggregiereVerbrauch(verbrauchAntwort.gruppen, (g) => g.modell)
  return `<div class="card verbrauch-karte">${kopf}${auswahl}
    <div class="verbrauch-gesamt">
      ${statKarte('Läufe', String(verbrauchAntwort.laeufeGesamt))}
      ${statKarte('ohne Beobachtung', String(verbrauchAntwort.ohneBeobachtungGesamt))}
    </div>
    <h4>Nach Rolle</h4>
    ${verbrauchTabelle(nachRolle, 'Rolle', 'Rolle zu diesem Lauf nicht ermittelbar')}
    <h4>Nach Modell</h4>
    ${verbrauchTabelle(nachModell, 'Modell', 'Modell mehrdeutig oder nicht beobachtet')}
  </div>`
}

function render() {
  if (letzterZustand === null) return
  const workflowsAttention = filtereAttentionWorkflows(letzterZustand.workflows)
  const laeufeAttention = filtereAttentionLaeufe(letzterZustand.laeufe)
  document.getElementById('view-dashboard').innerHTML = `<div class="dashboard-kennzahlen">
    ${statKarte('Läufe', zahl(letzterZustand.laeufe))}
    ${statKarte('Startfehler', zahl(letzterZustand.startfehler))}
    ${statKarte('Workflows', zahl(letzterZustand.workflows))}
    ${statKarte('Offene P0/P1-Workitems', zahl(workitemsAntwort === null ? null : workitemsAntwort.workitems))}
    ${statKarte('Attention (Workflows/Läufe)', attentionZahl(workflowsAttention, laeufeAttention))}
  </div>
  <div class="dashboard-verbrauch">${verbrauchKarte()}</div>`
}

/** Lädt die offenen P0/P1-Workitems einmalig beim Bootstrap. */
async function ladeWorkitems() {
  try {
    workitemsAntwort = await holeOffeneP0P1Workitems()
  } catch (fehler) {
    workitemsAntwort = { workitems: null, befunde: [], fehler: [{ quelle: 'workitems', grund: fehler.message }] }
  }
  render()
}

/** Überholschutz (Muster views/workboard.js roadmapAnfrageZaehler) — ein schneller zweiter Zeitraumwechsel, während der erste Abruf noch unterwegs ist, darf dessen später eintreffende, aber veraltete Antwort nicht mehr übernehmen. */
let verbrauchAnfrageZaehler = 0

/** Lädt GET /api/verbrauch für den aktuell gewählten Zeitraum — beim Bootstrap und bei jedem Zeitraumwechsel, NIE aus dem Poll (siehe Dateikopf). F-603-Fix: ein server-seitiges Fachergebnis `{ status: 'fehler', grund }` (baueVerbrauchsProjektion wirft nie mehr) wird hier auf denselben Client-Sentinel `{ fehler: true }` normalisiert wie ein echter Netzwerk-/HTTP-Fehler — verbrauchKarte() und die Retry-Klick-Bedienung kennen dadurch weiterhin nur EINE Fehlerform. */
async function ladeVerbrauch() {
  const meineAnfrageNummer = ++verbrauchAnfrageZaehler
  try {
    const antwort = await holeVerbrauch(berechneVerbrauchsVon(verbrauchZeitraum, new Date()))
    if (meineAnfrageNummer !== verbrauchAnfrageZaehler) return
    if (antwort?.status === 'fehler') {
      console.error('GET /api/verbrauch lieferte ein Fehler-Fachergebnis:', antwort.grund)
      verbrauchAntwort = { fehler: true }
    } else {
      verbrauchAntwort = antwort
    }
  } catch (fehler) {
    if (meineAnfrageNummer !== verbrauchAnfrageZaehler) return
    console.error('GET /api/verbrauch fehlgeschlagen:', fehler)
    verbrauchAntwort = { fehler: true }
  }
  render()
}

/** Klick-Delegation für den Zeitraum-Umschalter der Verbrauchs-Karte (Muster views/workboard.js Listen-Delegation) — die Buttons entstehen bei jedem render() neu, ein einziger Listener auf dem Container bleibt deshalb über render()-Aufrufe hinweg gültig. Ein Klick auf den bereits aktiven Zeitraum ist normalerweise ein No-Op (kein unnötiger Reload) — AUSSER der letzte Abruf dieses Zeitraums ist fehlgeschlagen (QA-Pass-Befund): sonst gäbe es für einen fehlgeschlagenen Bootstrap-Abruf des Standardzeitraums keine Möglichkeit, es erneut zu versuchen. */
function initVerbrauchBedienung() {
  document.getElementById('view-dashboard').addEventListener('click', (ereignis) => {
    const knopf = ereignis.target.closest('[data-verbrauch-zeitraum]')
    if (!knopf) return
    const periode = knopf.dataset.verbrauchZeitraum
    if (periode === verbrauchZeitraum && verbrauchAntwort?.fehler !== true) return
    verbrauchZeitraum = periode
    verbrauchAntwort = null
    render()
    void ladeVerbrauch()
  })
}

/** Initialisiert die Dashboard-View einmalig beim Bootstrap: Leerzustand, Abonnement des Zustands-Aggregats, einmaliger Workitems- und Verbrauchs-Abruf, Zeitraum-Bedienung. */
export function initDashboardView() {
  document.getElementById('view-dashboard').innerHTML = '<p class="leer">Lädt…</p>'
  abonniere((zustand) => {
    letzterZustand = zustand
    render()
  })
  initVerbrauchBedienung()
  void ladeWorkitems()
  void ladeVerbrauch()
}
