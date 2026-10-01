/**
 * Datei: public/leitstand/views/roadmap.js
 *
 * Zweck: Seite `#/roadmap` (F44 WS-2a, Vorlage V10 d_projekt_ai-workforce_roadmap.png und
 * m_projekt_ai-workforce_roadmap.png, Abgleich F-725 D1–D4). Ersetzt die Zwischenseite aus
 * views/platzhalter.js (F-880, Roadmap-Teil). Zeigt die echte Roadmap aus GET …/roadmap:
 * Meilensteingruppen mit Status und „x / y abgenommen“, darin die Features mit Statussymbol, ID,
 * Titel und Status; abgeschlossene Meilensteine vor dem aktuellen sind eingeklappt. Die
 * Wochenspalten der Vorlage erscheinen ausgegraut mit „Zeitplanung kommt“ (E-F44-1) — ohne
 * Balken und ohne Termine, weil es keine Zeitfenster gibt. Darunter die Legende und „Noch nicht
 * eingeplant“ (D3) aus GET …/workitems?typ=FEATURE.
 *
 * Zustände (D4): Lädt · nicht_vorhanden → Leerzustand „Noch keine Roadmap“ · ungueltig → Fehler
 * mit Anzahl der Regelverstöße, Texte aufklappbar · Abruffehler → Fehler mit „Erneut laden“.
 * Ein Abruffehler erscheint nie als „keine Roadmap“ (F-854; roadmapZustand in
 * roadmap-anzeige.js ordnet jede unbekannte Antwort als Fehler ein).
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initRoadmapView beim Bootstrap, vor starteRouter())
 *
 * Wichtig:
 * - Laden nur beim Betreten und bei einem Projektwechsel (abonniereProjektWechsel), nie aus
 *   dem Poll; eine überholte Antwort verwirft der Anfragezähler (Muster roadmapAnfrageZaehler
 *   in views/workboard.js).
 * - Projektinhalte (Name, Meilenstein- und Featuretitel, IDs, Statuswerte, Regelverstöße) werden
 *   nicht übersetzt und immer escaped; alle übrigen Texte über t().
 * - Kein Hover-Detail (D1, 600 ms): nachziehen, sobald es einen Tooltip-Baustein gibt (F-893).
 *   Keine Prioritätsspalte — Features haben keine Priorität.
 * - Die Anzeigeregeln (aktueller Meilenstein, Zähler, Kategorie, offen/eingeklappt, nicht
 *   eingeplant) stehen in roadmap-anzeige.js und werden in WS-2b wiederverwendet.
 */

import { holeRoadmap, holeWorkitems } from '../api.js'
import { t } from '../i18n.js'
import { kommtBadge, kommtKnopf } from '../kommt.js'
import { abonniereProjektWechsel, holeAktivesProjekt } from '../projekt-kontext.js'
import { escapeHtml } from '../render.js'
import { aktuellerMeilenstein, meilensteinOffen, nichtEingeplant, roadmapZustand, STATUS_KATEGORIEN, statusKategorie, zaehleMeilenstein } from '../roadmap-anzeige.js'
import { registriere } from '../router.js'

/** Symbol je Statuskategorie — die fünf der Vorlage (✓ ◉ ↻ ! ○), dazu Abgebrochen und Ohne Akte. */
const SYMBOL = {
  abgenommen: '✓',
  freigabe: '◉',
  in_arbeit: '↻',
  klaerung: '!',
  geplant: '○',
  abgebrochen: '–',
  ohne_akte: '◇',
  unbekannt: '?',
}

/** Anzahl der ausgegrauten Wochenspalten (Vorlage: sechs relative Wochen). */
const WOCHEN = 6

/** Letzte Roadmap-Antwort: null = lädt, { status: 'fehler', grund } nach einem Wurf, sonst die Projektion. */
let roadmap = null

/** Feature-Workitems für „Noch nicht eingeplant“: undefined = lädt, null = nicht verfügbar, sonst Liste. */
let featureWorkitems

/** Überholschutz für ladeRoadmap (Muster roadmapAnfrageZaehler in views/workboard.js). */
let roadmapAnfrageZaehler = 0

/**
 * Statussymbol mit Kategorie-Klasse (Farbe) — dekorativ, der Status steht daneben als Text.
 * @param kategorie - Statuskategorie
 * @returns HTML
 */
function symbol(kategorie) {
  return `<span class="roadmap-symbol roadmap-kat-${kategorie}" aria-hidden="true">${SYMBOL[kategorie]}</span>`
}

/**
 * Übersetzter Text einer Statuskategorie; der rohe Status steht im title.
 * @param status - roher Statuswert (Projektinhalt)
 * @returns HTML
 */
function statusText(status) {
  const kategorie = statusKategorie(status)
  return `<span class="roadmap-status roadmap-kat-${kategorie}" title="${escapeHtml(status ?? '')}">${escapeHtml(t(`roadmap.status.${kategorie}`))}</span>`
}

/** Leere, ausgegraute Wochenzellen einer Zeile (keine Balken, keine Termine). */
const WOCHEN_ZELLE = '<span class="roadmap-wochen-zelle" aria-hidden="true"></span>'

/**
 * Kopf der Seite: Rücklink, Eyebrow, Titel mit Projektname, Einleitung, „Eintrag erfassen“
 * (kommt) und die Register.
 * @returns HTML
 */
function seitenkopf() {
  const projektName = holeAktivesProjekt().name
  return `<a class="back" href="#/dashboard"><span aria-hidden="true">←</span> ${escapeHtml(t('roadmap.zurueck'))}</a>
    <div class="page-heading">
      <div>
        <div class="eyebrow">${escapeHtml(t('roadmap.eyebrow'))}</div>
        <h1 tabindex="-1">${escapeHtml(t('roadmap.titel', { projekt: projektName }))}</h1>
        <p class="description">${escapeHtml(t('roadmap.beschreibung'))}</p>
      </div>
      ${kommtKnopf(t('roadmap.eintragErfassen'), { primaer: true })}
    </div>
    <nav class="tabs" aria-label="${escapeHtml(t('roadmap.register'))}">
      <a href="#/dashboard">${escapeHtml(t('roadmap.register.ueberblick'))}</a>
      <a href="#/roadmap" class="active" aria-current="page">${escapeHtml(t('roadmap.register.roadmap'))}</a>
      <span class="tab-kommt" role="link" tabindex="0" aria-disabled="true">${escapeHtml(t('roadmap.register.projektakte'))} ${kommtBadge()}</span>
    </nav>`
}

/**
 * Eine Feature-Zeile: Link ins Workboard-Detail, Symbol, Titel (sonst ID), ID und Status. Ein
 * Feature ohne Akte (keine_akte) hat kein Detail im Workboard und bleibt ohne Link.
 * @param feature - { id, titel?, status }
 * @returns HTML
 */
function featureZeile(feature) {
  const kategorie = statusKategorie(feature.status)
  const titel = typeof feature.titel === 'string' && feature.titel.trim() !== '' ? feature.titel : feature.id
  const inhalt = `${symbol(kategorie)}
        <span class="roadmap-feature-titel">${escapeHtml(titel)}<small><code>${escapeHtml(feature.id)}</code> · ${statusText(feature.status)}</small></span>`
  const eintrag = kategorie === 'ohne_akte' ? `<span class="roadmap-feature">${inhalt}</span>` : `<a class="roadmap-feature" href="#/workboard/${encodeURIComponent(feature.id)}">${inhalt}</a>`
  return `<div class="roadmap-zeile">
      ${eintrag}
      ${WOCHEN_ZELLE}
    </div>`
}

/**
 * Eine Meilensteingruppe als details/summary: Titel, Status, „x / y abgenommen“, darin die
 * Features. Offen nach meilensteinOffen (D1).
 * @param daten - Roadmap-Projektion
 * @param meilenstein - Eintrag aus daten.meilensteine
 * @param aktueller - aktueller Meilenstein oder null
 * @returns HTML
 */
function meilensteinGruppe(daten, meilenstein, aktueller) {
  const { abgenommen, gesamt } = zaehleMeilenstein(meilenstein)
  const istAktuell = meilenstein === aktueller
  const zeilen = meilenstein.features.length === 0 ? `<p class="roadmap-leer-zeile">${escapeHtml(t('roadmap.meilenstein.leer'))}</p>` : meilenstein.features.map(featureZeile).join('')
  return `<details class="roadmap-gruppe${istAktuell ? ' roadmap-gruppe-aktuell' : ''}"${meilensteinOffen(daten, meilenstein) ? ' open' : ''}>
      <summary class="roadmap-gruppe-kopf">
        <span class="roadmap-gruppe-text">
          ${istAktuell ? `<span class="eyebrow roadmap-aktuell-marke">${escapeHtml(t('roadmap.meilenstein.aktuell'))}</span>` : ''}
          <strong>${escapeHtml(meilenstein.titel)}</strong>
          <small><code>${escapeHtml(meilenstein.id)}</code> · ${statusText(meilenstein.status)} · ${escapeHtml(t('roadmap.meilenstein.abgenommen', { abgenommen, gesamt }))}</small>
        </span>
        ${WOCHEN_ZELLE}
      </summary>
      <div class="roadmap-gruppe-zeilen">${zeilen}</div>
    </details>`
}

/**
 * Die Tabelle: Kopf mit ausgegrauten Wochen („Zeitplanung kommt“), dann die Gruppen.
 * @param daten - Roadmap-Projektion mit status 'ok'
 * @returns HTML
 */
function roadmapTabelle(daten) {
  if (daten.meilensteine.length === 0) return `<p class="subtle">${escapeHtml(t('roadmap.keineMeilensteine'))}</p>`
  const aktueller = aktuellerMeilenstein(daten)
  const wochen = Array.from({ length: WOCHEN }, (_, i) => `<span>${escapeHtml(t('roadmap.spalte.woche', { nummer: i + 1 }))}</span>`).join('')
  return `<div class="timeline-toolbar">
      <span class="roadmap-zeitplanung">${escapeHtml(t('roadmap.zeitplanung'))} ${kommtBadge()}</span>
      <span>${escapeHtml(t('roadmap.klickHinweis'))}</span>
    </div>
    <div class="roadmap-scroll">
      <div class="roadmap-tabelle">
        <div class="roadmap-kopfzeile">
          <div>${escapeHtml(t('roadmap.spalte.eintrag'))}</div>
          <div class="roadmap-wochen" aria-hidden="true">${wochen}</div>
        </div>
        ${daten.meilensteine.map((m) => meilensteinGruppe(daten, m, aktueller)).join('')}
      </div>
    </div>
    <p class="roadmap-fussnote">${escapeHtml(t('roadmap.zeitplanung.hinweis'))}</p>
    <div class="roadmap-legend" aria-label="${escapeHtml(t('roadmap.legende'))}" role="group">
      ${STATUS_KATEGORIEN.map((k) => `<span>${symbol(k)} ${escapeHtml(t(`roadmap.status.${k}`))}</span>`).join('')}
    </div>`
}

/**
 * „Noch nicht eingeplant“ (D3).
 * @returns HTML
 */
function nichtEingeplantAbschnitt() {
  const kopf = `<div class="section-label">
      <h2>${escapeHtml(t('roadmap.nichtEingeplant.titel'))}</h2>
      <a class="text-link" href="#/workboard">${escapeHtml(t('roadmap.arbeitsvorrat'))} <span aria-hidden="true">→</span></a>
    </div>`
  let inhalt
  if (featureWorkitems === undefined) {
    inhalt = `<p class="subtle">${escapeHtml(t('roadmap.laedt'))}</p>`
  } else if (featureWorkitems === null) {
    inhalt = `<p class="subtle">${escapeHtml(t('roadmap.nichtEingeplant.nichtVerfuegbar'))}</p>`
  } else {
    // render() zeigt diesen Abschnitt nur bei ok/nicht_vorhanden — dort ist die Liste nie null.
    const liste = nichtEingeplant(roadmap, featureWorkitems) ?? []
    if (liste.length === 0) {
      inhalt = `<p class="subtle">${escapeHtml(t('roadmap.nichtEingeplant.alle'))}</p>`
    } else {
      inhalt = `<div class="unplanned-chips">${liste
        .map((w) => {
          const titel = typeof w.titel === 'string' && w.titel.trim() !== '' ? w.titel : w.id
          return `<a class="roadmap-chip" href="#/workboard/${encodeURIComponent(w.id)}"><code>${escapeHtml(w.id)}</code><span class="chip-title">${escapeHtml(titel)}</span></a>`
        })
        .join('')}</div>`
    }
  }
  return `<section class="roadmap-nicht-eingeplant">${kopf}${inhalt}</section>`
}

/**
 * Hauptteil je Zustand (D4).
 * @returns HTML
 */
function hauptteil() {
  const zustand = roadmapZustand(roadmap)
  if (zustand === 'laedt') return `<p class="subtle">${escapeHtml(t('roadmap.laedt'))}</p>`
  if (zustand === 'nicht_vorhanden') {
    return `<section class="empty">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" /></svg>
        <h2>${escapeHtml(t('roadmap.leer.titel'))}</h2>
        <p>${escapeHtml(t('roadmap.leer.text'))}</p>
      </section>`
  }
  if (zustand === 'ungueltig') {
    const anzahl = roadmap.fehler.length
    return `<div class="note red roadmap-fehler">
        <strong>${escapeHtml(t('roadmap.ungueltig.titel', { anzahl }))}</strong>
        <p>${escapeHtml(t('roadmap.ungueltig.text'))}</p>
        ${
          anzahl === 0
            ? ''
            : `<details>
          <summary>${escapeHtml(t('roadmap.ungueltig.details'))}</summary>
          <ul>${roadmap.fehler.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul>
        </details>`
        }
      </div>`
  }
  if (zustand === 'fehler') {
    const grund = typeof roadmap.grund === 'string' && roadmap.grund !== '' ? `<p><code>${escapeHtml(roadmap.grund)}</code></p>` : ''
    return `<div class="note red roadmap-fehler">
        <strong>${escapeHtml(t('roadmap.fehler.titel'))}</strong>
        <p>${escapeHtml(t('roadmap.fehler.text'))}</p>
        ${grund}
        <button type="button" class="button" data-roadmap-erneut>${escapeHtml(t('roadmap.fehler.erneut'))}</button>
      </div>`
  }
  return roadmapTabelle(roadmap)
}

/** Rendert die ganze Seite in #view-roadmap; ein fehlender Container wird gemeldet, nicht geworfen. */
function render() {
  const container = document.getElementById('view-roadmap')
  if (container === null) {
    console.error('roadmap: Container view-roadmap fehlt')
    return
  }
  const zustand = roadmapZustand(roadmap)
  const unten = zustand === 'ok' || zustand === 'nicht_vorhanden' ? nichtEingeplantAbschnitt() : ''
  container.innerHTML = `${seitenkopf()}${hauptteil()}${unten}`
}

/**
 * Lädt Roadmap und Feature-Workitems neu (beim Betreten, bei Projektwechsel, über „Erneut
 * laden“). Beide Abrufe laufen parallel, scheitern unabhängig und rendern je für sich, sobald sie
 * da sind — ein hängender Workitems-Abruf hält die Roadmap nicht auf. Eine überholte Antwort wird
 * verworfen.
 * @param optionen - { fokus: true } setzt danach den Fokus auf die Überschrift (nach „Erneut
 *   laden“ ist der Knopf ersetzt; der Fokus fiele sonst auf body)
 */
async function ladeRoadmap(optionen = {}) {
  const meineAnfrageNummer = ++roadmapAnfrageZaehler
  const aktuell = () => meineAnfrageNummer === roadmapAnfrageZaehler
  roadmap = null
  featureWorkitems = undefined
  render()
  const roadmapAbruf = holeRoadmap().then(
    (antwort) => {
      if (!aktuell()) return
      roadmap = antwort
      render()
    },
    (fehler) => {
      if (!aktuell()) return
      console.error('GET …/roadmap fehlgeschlagen:', fehler)
      roadmap = { status: 'fehler', grund: fehler instanceof Error ? fehler.message : String(fehler) }
      render()
    }
  )
  const workitemsAbruf = holeWorkitems({ typ: 'FEATURE' }).then(
    (antwort) => {
      if (!aktuell()) return
      featureWorkitems = Array.isArray(antwort?.workitems) ? antwort.workitems : null
      render()
    },
    (fehler) => {
      if (!aktuell()) return
      console.error('GET …/workitems?typ=FEATURE fehlgeschlagen:', fehler)
      featureWorkitems = null
      render()
    }
  )
  await Promise.all([roadmapAbruf, workitemsAbruf])
  if (optionen.fokus === true && aktuell()) document.querySelector('#view-roadmap h1')?.focus()
}

/** Registriert #/roadmap, „Erneut laden“ und den Neuladen bei Projektwechsel. Einmalig beim Bootstrap. */
export function initRoadmapView() {
  const container = document.getElementById('view-roadmap')
  container?.addEventListener('click', (ereignis) => {
    if (ereignis.target instanceof Element && ereignis.target.closest('[data-roadmap-erneut]') !== null) void ladeRoadmap({ fokus: true })
  })
  registriere(/^#\/roadmap$/, 'roadmap', () => {
    void ladeRoadmap()
  })
  abonniereProjektWechsel(() => {
    void ladeRoadmap()
  })
}
