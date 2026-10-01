/**
 * Datei: public/leitstand/views/nutzung.js
 *
 * Zweck: Seite `#/nutzung` (F44 WS-2b, F-880). Zeigt die Karte „Verbrauch“ (F32 WS-2,
 * GET /api/verbrauch) mit drei festen Zeiträumen (7 Tage / 30 Tage / gesamt,
 * verbrauch-zeitraum.js) — Summen je Rolle und je Modell, kein Kontingent (Nicht-Ziel, siehe
 * features/F32/feature.md), keine Kosten in Euro/USD (Entscheidung 30). Die Karte ist mit
 * unveränderter Logik und unverändertem Markup aus views/dashboard.js hierher umgezogen; die
 * Zwischenseite aus views/platzhalter.js entfällt. Der Umbau nach Vorlage V10 (Abgleich F-725
 * I1–I3) folgt in WS-6; bis dahin sind die Kartentexte deutsch, nur der Seitenkopf läuft über t().
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initNutzungView beim Bootstrap, vor starteRouter())
 *
 * Wichtig:
 * - Laden beim Betreten der Seite, bei einem Projektwechsel (abonniereProjektWechsel, F-860) und
 *   bei jedem Klick auf einen anderen Zeitraum — NIE aus dem Poll (Laufakten ändern sich nur
 *   durch echte Läufe). Ein Klick auf den aktiven Zeitraum ist ein No-Op, außer der letzte Abruf
 *   ist fehlgeschlagen (erneuter Versuch, QA-Pass F32).
 * - Überholschutz über verbrauchAnfrageZaehler: eine späte Antwort (alter Zeitraum, altes
 *   Projekt) überschreibt die neuere nicht.
 * - Projektname und Rollen-/Modellnamen sind Projekt- bzw. Serverdaten: escaped, nicht übersetzt.
 */

import { holeVerbrauch } from '../api.js'
import { t } from '../i18n.js'
import { abonniereProjektWechsel, holeAktivesProjekt } from '../projekt-kontext.js'
import { escapeHtml } from '../render.js'
import { registriere } from '../router.js'
import { berechneVerbrauchsVon, VERBRAUCH_ZEITRAEUME } from '../verbrauch-zeitraum.js'

/** Letzte Antwort aus holeVerbrauch, oder null vor dem ersten Abruf. { fehler: true } ist ein reiner Client-Sentinel (Muster views/workboard.js letzteRoadmap) für einen fehlgeschlagenen Abruf, kein Server-Status. */
let verbrauchAntwort = null

/** Aktuell gewählter Zeitraum der Verbrauchs-Karte (F32 WS-2) — Standard 30 Tage. */
let verbrauchZeitraum = '30t'

const VERBRAUCH_ZEITRAUM_LABEL = { '7t': '7 Tage', '30t': '30 Tage', gesamt: 'gesamt' }

/** Eine Kennzahl-Kachel (Komponentenvokabular F29 WS-1a: .card + .stat/.stat-wert/.stat-label). @param label - Anzeigetext, hier stets ein festes Literal (kein escapeHtml nötig) @param wertHtml - bereits fertiges Anzeige-HTML */
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

/** Rendert Seitenkopf und Karte in #view-nutzung; ein fehlender Container wird gemeldet, nicht geworfen. */
function render() {
  const container = document.getElementById('view-nutzung')
  if (container === null) {
    console.error('nutzung: Container view-nutzung fehlt')
    return
  }
  container.innerHTML = `<div class="page-heading">
      <div>
        <div class="eyebrow">${escapeHtml(t('nutzung.eyebrow'))}</div>
        <h1>${escapeHtml(t('nutzung.titel'))}</h1>
        <p class="description">${escapeHtml(t('nutzung.beschreibung', { projekt: holeAktivesProjekt().name }))}</p>
      </div>
    </div>
    <div class="dashboard-verbrauch">${verbrauchKarte()}</div>`
}

/** Überholschutz (Muster views/workboard.js roadmapAnfrageZaehler) — ein schneller zweiter Zeitraum- oder Projektwechsel, während der erste Abruf noch unterwegs ist, darf dessen später eintreffende, aber veraltete Antwort nicht mehr übernehmen. */
let verbrauchAnfrageZaehler = 0

/** Lädt GET /api/verbrauch für den aktuell gewählten Zeitraum — beim Betreten, bei Projekt- und Zeitraumwechsel, NIE aus dem Poll (siehe Dateikopf). F-603-Fix: ein server-seitiges Fachergebnis `{ status: 'fehler', grund }` wird hier auf denselben Client-Sentinel `{ fehler: true }` normalisiert wie ein echter Netzwerk-/HTTP-Fehler — verbrauchKarte() und die Retry-Klick-Bedienung kennen dadurch nur EINE Fehlerform. */
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

/** Verwirft die angezeigte Antwort, zeigt „Lädt…“ und lädt neu. */
function ladeNeu() {
  verbrauchAntwort = null
  render()
  void ladeVerbrauch()
}

/** Klick-Delegation für den Zeitraum-Umschalter — die Buttons entstehen bei jedem render() neu, ein einziger Listener auf dem Container bleibt deshalb gültig. Ein Klick auf den bereits aktiven Zeitraum ist ein No-Op, AUSSER der letzte Abruf ist fehlgeschlagen (sonst gäbe es für einen fehlgeschlagenen Abruf des Standardzeitraums keinen erneuten Versuch). */
function initVerbrauchBedienung() {
  document.getElementById('view-nutzung')?.addEventListener('click', (ereignis) => {
    const knopf = ereignis.target.closest('[data-verbrauch-zeitraum]')
    if (!knopf) return
    const periode = knopf.dataset.verbrauchZeitraum
    if (periode === verbrauchZeitraum && verbrauchAntwort?.fehler !== true) return
    verbrauchZeitraum = periode
    ladeNeu()
  })
}

/** Registriert #/nutzung, die Zeitraum-Bedienung und den Neuladen bei Projektwechsel. Einmalig beim Bootstrap. */
export function initNutzungView() {
  initVerbrauchBedienung()
  registriere(/^#\/nutzung$/, 'nutzung', ladeNeu)
  abonniereProjektWechsel(ladeNeu)
}
