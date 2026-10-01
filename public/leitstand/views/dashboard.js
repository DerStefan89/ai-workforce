/**
 * Datei: public/leitstand/views/dashboard.js
 *
 * Zweck: View `#/dashboard` „Produktübersicht“ (F44 WS-2b, Vorlage V10 d_/l_/m_uebersicht.png,
 * Abgleich F-725 Abschnitt B). Blöcke von oben nach unten:
 *  1. Kopf (B1): Eyebrow, Projektname, „Aktueller Meilenstein“ (roadmap-anzeige.js), drei
 *     Z-Knöpfe (kommt.js, E-F44-1).
 *  2. Drei Karten: Produktfortschritt (B2, Ring „x / y abgenommen“), Aktuelle Rolle (B3, aus dem
 *     Fokus-Workflow), Deployer · Mensch (B4, Z).
 *  3. Vier Werte (B5): In Arbeit, Deine Entscheidung, Abgenommen, Geplant.
 *  4. Ziel dieser Version (B6): roadmap.vision, „Ziel schärfen“ und „Zielgruppe &
 *     Erfolgskriterien“ als Z.
 *  5. Produktmanagement: statischer Einstieg nach #/produktzyklus.
 *  6. Deine nächsten Entscheidungen (B7, die ersten drei aus baueEntscheidungen) und Die
 *     Workforce gerade (B8; „Als Nächstes vorgesehen“ als Z).
 *  7. Der Weg zum Produkt (B9): alle Meilensteine kompakt (Titel, Status, „x / y abgenommen“),
 *     der aktuelle hervorgehoben; keine Featurezeilen, keine Zeitachse (F-905).
 *  8. Entwicklungsstand (B10): offene P0–P2-Findings und offene Features des aktuellen
 *     Meilensteins, höchstens acht (waehleEntwicklungsstand), Priorität lesend als Z, drei
 *     Kacheln mit offenen Workitems je Typ (F-905).
 *  9. Wer macht was (B11): Zuvor/Jetzt/Danach aus den Schritten des Fokus-Workflows.
 * 10. Zuletzt umgesetzt (B12): jüngster Lauf und sein Workflow.
 * 11. Was steckt dahinter (B13): drei Z-Knöpfe.
 * 12. Betrieb (B16): Läufe, Workflows, Startfehler als ruhige Zeile (bis WS-5).
 * 13. Leerzustand (B14): keine Workitems, keine Roadmap und keine Workflows → geführter erster
 *     Schritt statt der Blöcke 2 bis 11 (F-903: ein wartender Workflow bleibt sichtbar).
 *
 * Datenquellen: das Poll-Aggregat (abonniere, zustand.js), GET …/roadmap, GET …/workitems
 * (ungefiltert, für die Kacheln und den Leerzustand), die offenen P0/P1-Workitems
 * (attention-daten.js) und der Fokus-Nachtrag (fokus-daten.js). Die Verbrauchskarte ist seit
 * WS-2b auf #/nutzung (views/nutzung.js, F-880).
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initDashboardView beim Bootstrap, vor starteRouter())
 * - public/leitstand/projekt-wechsel.test.mjs (Neuladen beim Projektwechsel)
 *
 * Wichtig:
 * - Roadmap, Workitems und P0/P1 laden beim Betreten (#/dashboard) und bei jedem Projektwechsel
 *   (abonniereProjektWechsel, F-860), je mit eigenem Überholschutz — nie aus dem Poll. Das
 *   Aggregat kommt über abonniere().
 * - Der Fokus-Nachtrag (Schritte, Abnahme, aktiver Lauf) lädt nicht aus dem Poll, sondern nur,
 *   wenn die ID des Fokus-Workflows (bzw. des Workflows zum jüngsten Lauf) wechselt, beim
 *   Betreten der Seite (frischer Stand, F-899) und frühestens NACHTRAG_WIEDERHOLEN_MS nach einem
 *   Fehlschlag (neuer Versuch wie im Workboard, ohne bei einem dauerhaften Fehler jeden Tick
 *   anzufragen). Ein Projektwechsel verwirft ihn samt laufender Antworten (Generation).
 * - Jeder Block hat eigene Zustände für „lädt“ und „Fehler“; ein Fehler in einem Block blendet
 *   die anderen nicht aus — auch ein Wurf beim Rendern nicht (setzeBlock fängt ihn je Block ab).
 *   Eine defekte Quelle zeigt „nicht verfügbar“, nie 0.
 * - Die Blöcke werden einzeln und nur bei geändertem Inhalt neu geschrieben — der Poll-Tick
 *   (alle zwei Sekunden) zerstört so keinen Tastaturfokus.
 * - Keine Schreibaktion: Jede Bedienung ist ein Link, ein Sprung innerhalb der Seite, ein
 *   erneutes Laden (lesend) oder ein Z-Knopf ohne Wirkung.
 * - Projektname, Vision, Titel, IDs, Statuswerte sowie Servertexte werden nicht
 *   übersetzt und immer escaped; alle übrigen Texte über t(). Rollen erscheinen seit F44 WS-3b
 *   (F-914) mit ihrem übersetzten Namen (rollen-anzeige.js), eine unbekannte Rolle als ID.
 */

import { holeRoadmap, holeWorkitems } from '../api.js'
import { baueEntscheidungen, filtereAttentionWorkflows, holeOffeneP0P1Workitems } from '../attention-daten.js'
import { ladeFokusNachtrag, schrittFolge, waehleFokusWorkflow, waehleLetztenLauf } from '../fokus-daten.js'
import { formatiereDatum, formatiereZahl, t } from '../i18n.js'
import { kommtBadge, kommtKnopf } from '../kommt.js'
import { abonniereProjektWechsel, holeAktivesProjekt } from '../projekt-kontext.js'
import { escapeHtml } from '../render.js'
import { aktuellerMeilenstein, roadmapZustand, STATUS_SYMBOL, statusKategorie, waehleEntwicklungsstand, zaehleGeplant, zaehleMeilenstein } from '../roadmap-anzeige.js'
import { rollenName, werSpalte } from '../rollen-anzeige.js'
import { registriere } from '../router.js'
import { abonniere } from '../zustand.js'

/** Letztes Zustands-Aggregat aus dem Poll, oder null vor dem ersten Tick (bzw. nach einem Projektwechsel). */
let letzterZustand = null

/** Roadmap-Antwort: null = lädt, { status: 'fehler', grund } nach einem Wurf, sonst die Projektion. */
let roadmap = null

/** Alle Workitems: undefined = lädt, null = nicht verfügbar, sonst Liste. */
let workitems

/** Offene P0/P1-Workitems für „Deine nächsten Entscheidungen“: undefined = lädt, null = nicht verfügbar, sonst Liste. */
let p0p1

/** Fokus-Nachträge je Workflow-ID: { status: 'laedt' | 'ok' | 'fehler', daten? }. Gehalten werden nur die gerade gebrauchten IDs. */
const nachtraege = new Map()

/** Generation der Nachträge — Projektwechsel und Betreten der Seite erhöhen sie, späte Antworten davor werden verworfen. */
let nachtragGeneration = 0

/** Frühester neuer Versuch nach einem fehlgeschlagenen Nachtrag (Millisekunden). */
const NACHTRAG_WIEDERHOLEN_MS = 30000

/** Überholschutz je Lader (Muster roadmapAnfrageZaehler in views/roadmap.js). */
const anfrageZaehler = { roadmap: 0, workitems: 0, p0p1: 0 }

/** Zuletzt geschriebenes HTML je Block — ein Block wird nur bei geändertem Inhalt neu geschrieben. */
const blockCache = new Map()

/** Anzahl der Einträge in „Deine nächsten Entscheidungen“. */
const ENTSCHEIDUNGEN_MAX = 3

/** Pfeil der Vorlage am Zeilenende (dekorativ). */
const PFEIL = '<svg class="icon uebersicht-pfeil" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>'

/** Kachelsymbole der Vorlage für Features, Bugs und Harness Improvements (dekorativ). */
const KACHEL_SYMBOL = { FEATURE: '◇', BUG: '!', HARNESS_IMPROVEMENT: '↻' }

/** Typen der drei Kacheln in Anzeigereihenfolge (B10). */
const KACHEL_TYPEN = ['FEATURE', 'BUG', 'HARNESS_IMPROVEMENT']

// ─── Kleine Bausteine ────────────────────────────────────────────────────────

/**
 * Escapter, übersetzter Text.
 * @param schluessel - i18n-Schlüssel
 * @param werte - Platzhalterwerte
 * @returns HTML
 */
function tx(schluessel, werte) {
  return escapeHtml(t(schluessel, werte))
}

/** @returns Absatz „Lädt…“ */
function laedt() {
  return `<p class="subtle">${tx('uebersicht.laedt')}</p>`
}

/**
 * Markierter Text „nicht verfügbar“ (defekte Quelle, nie 0).
 * @returns HTML
 */
function nichtVerfuegbar() {
  return `<span class="unbekannt">${tx('uebersicht.nichtVerfuegbar')}</span>`
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
 * Fortschrittsring der Vorlage (progress-bubble): Prozent, darunter „x/y“.
 * @param abgenommen - Zähler
 * @param gesamt - Nenner
 * @param optionen - { klein: true } für den kleinen Ring (B12), { label } für den zugänglichen Namen
 * @returns HTML
 */
function ring(abgenommen, gesamt, optionen = {}) {
  const prozent = gesamt > 0 ? Math.round((abgenommen / gesamt) * 100) : 0
  const mitte = gesamt > 0 ? escapeHtml(formatiereZahl(prozent / 100, { style: 'percent' })) : '–'
  return `<div class="progress-bubble${optionen.klein === true ? ' klein' : ''}" role="img" aria-label="${escapeHtml(optionen.label ?? '')}">
      <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><circle class="bubble-track" cx="50" cy="50" r="42" /><circle class="bubble-fill" cx="50" cy="50" r="42" pathLength="100" stroke-dasharray="${prozent} 100" /></svg>
      <div aria-hidden="true"><strong>${mitte}</strong><small>${escapeHtml(formatiereZahl(abgenommen))}/${escapeHtml(formatiereZahl(gesamt))}</small></div>
    </div>`
}

/**
 * Symbol und übersetzter Status eines Features (Kategorien aus roadmap-anzeige.js); der rohe
 * Status steht im title.
 * @param status - roher Statuswert
 * @returns HTML
 */
function featureStatus(status) {
  const kategorie = statusKategorie(status)
  return `<span class="roadmap-symbol roadmap-kat-${kategorie}" aria-hidden="true">${STATUS_SYMBOL[kategorie]}</span> <span class="roadmap-status roadmap-kat-${kategorie}" title="${escapeHtml(status ?? '')}">${tx(`roadmap.status.${kategorie}`)}</span>`
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
  element.innerHTML = html
  blockCache.set(id, html)
}

// ─── Abgeleitete Lage ─────────────────────────────────────────────────────────

/**
 * Fokus-Workflow, jüngster Lauf, dessen Workflow und die Nachträge dazu.
 * @returns { zustand, fokus, fokusNachtrag, lauf, laufWorkflow, laufNachtrag }
 */
function lage() {
  const zustand = letzterZustand
  const workflows = Array.isArray(zustand?.workflows) ? zustand.workflows : null
  const fokus = waehleFokusWorkflow(workflows)
  const lauf = waehleLetztenLauf(zustand?.laeufe ?? null)
  // „Sein Workflow“: derselbe Auftrag (auftragsbezug des Laufs = auftragId des Workflows).
  const auftragId = lauf?.auftragsbezug?.auftragId ?? null
  const laufWorkflow = auftragId !== null && workflows !== null ? (workflows.find((w) => w.auftragId === auftragId) ?? null) : null
  return {
    zustand,
    fokus,
    fokusNachtrag: fokus === null ? null : (nachtraege.get(fokus.workflowId) ?? null),
    lauf,
    laufWorkflow,
    laufNachtrag: laufWorkflow === null ? null : (nachtraege.get(laufWorkflow.workflowId) ?? null),
  }
}

/**
 * Lädt den Nachtrag für jeden gebrauchten Workflow, dessen ID noch nicht geladen ist, und
 * verwirft die nicht mehr gebrauchten (lädt also nur bei wechselnder ID).
 * @param workflowsGebraucht - Fokus-Workflow und Workflow zum jüngsten Lauf (je oder null)
 */
function stelleNachtraegeSicher(workflowsGebraucht) {
  const gebraucht = new Map(workflowsGebraucht.filter((w) => w !== null).map((w) => [w.workflowId, w]))
  for (const id of [...nachtraege.keys()]) if (!gebraucht.has(id)) nachtraege.delete(id)
  for (const [id, workflow] of gebraucht) {
    const eintrag = nachtraege.get(id)
    if (eintrag !== undefined && !(eintrag.status === 'fehler' && Date.now() >= eintrag.wiederholenAb)) continue
    nachtraege.set(id, { status: 'laedt' })
    const generation = nachtragGeneration
    void ladeFokusNachtrag(workflow).then((daten) => {
      if (generation !== nachtragGeneration || nachtraege.get(id)?.status !== 'laedt') return
      nachtraege.set(id, daten === null ? { status: 'fehler', wiederholenAb: Date.now() + NACHTRAG_WIEDERHOLEN_MS } : { status: 'ok', daten })
      render()
    })
  }
}

/**
 * Zustand der Roadmap samt aktuellem Meilenstein.
 * @returns { zustand, meilenstein }
 */
function roadmapLage() {
  const zustand = roadmapZustand(roadmap)
  return { zustand, meilenstein: zustand === 'ok' ? aktuellerMeilenstein(roadmap) : null }
}

/**
 * Text für einen fehlenden aktuellen Meilenstein (B1, B9, B10).
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
 * true, wenn der geführte erste Schritt gilt (B14): keine Workitems, keine Roadmap und keine
 * Workflows. Sind die Workflows defekt (null) oder noch nicht da, gelten die normalen Blöcke —
 * ein wartender Workflow eines neuen Produkts darf nicht verdeckt werden (F-903).
 */
function istLeeresProdukt() {
  const workflows = letzterZustand?.workflows
  return Array.isArray(workitems) && workitems.length === 0 && roadmapZustand(roadmap) === 'nicht_vorhanden' && Array.isArray(workflows) && workflows.length === 0
}

// ─── Blöcke ──────────────────────────────────────────────────────────────────

/**
 * 1. Kopf (B1).
 * @returns HTML
 */
function kopfBlock() {
  const { zustand, meilenstein } = roadmapLage()
  const zeile = meilenstein !== null ? tx('uebersicht.meilenstein.aktuell', { titel: meilenstein.titel }) : escapeHtml(ohneMeilensteinText(zustand))
  return `<div class="page-heading uebersicht-kopf">
      <div>
        <div class="eyebrow">${tx('uebersicht.eyebrow')}</div>
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
 * Karte Produktfortschritt (B2).
 * @returns HTML
 */
function fortschrittKarte() {
  const { zustand, meilenstein } = roadmapLage()
  let inhalt
  if (meilenstein !== null) {
    const { abgenommen, gesamt } = zaehleMeilenstein(meilenstein)
    inhalt = `${ring(abgenommen, gesamt, { label: t('uebersicht.ring.label', { abgenommen: formatiereZahl(abgenommen), gesamt: formatiereZahl(gesamt) }) })}
      <div>
        <span class="eyebrow">${tx('uebersicht.fortschritt.eyebrow')}</span>
        <h2>${escapeHtml(formatiereZahl(abgenommen))} / ${escapeHtml(formatiereZahl(gesamt))} <span>${tx('uebersicht.fortschritt.abgenommen')}</span></h2>
        <p>${tx('uebersicht.fortschritt.text', { titel: meilenstein.titel })}</p>
        <button type="button" class="text-link" data-sprung="uebersicht-stand">${tx('uebersicht.fortschritt.link')} <span aria-hidden="true">→</span></button>
      </div>`
  } else {
    const text = zustand === 'ungueltig' || zustand === 'fehler' ? nichtVerfuegbar() : escapeHtml(ohneMeilensteinText(zustand))
    inhalt = `<div>
        <span class="eyebrow">${tx('uebersicht.fortschritt.eyebrow')}</span>
        <p>${text}</p>
      </div>`
  }
  return `<article class="cockpit-progress">${inhalt}</article>`
}

/**
 * Karte Aktuelle Rolle (B3): wartet auf Freigabe → „Deine Freigabe“, Rückfrage → „Deine
 * Rückfrage“, sonst die Rolle des laufenden Schritts, sonst „Keine aktive Rolle“.
 * @param l - lage()
 * @returns HTML
 */
function rolleKarte(l) {
  const kopf = `<span class="eyebrow">${tx('uebersicht.rolle.eyebrow')}</span>`
  if (l.zustand === null) return `<article class="cockpit-role">${kopf}${laedt()}</article>`
  if (!Array.isArray(l.zustand.workflows)) return `<article class="cockpit-role">${kopf}<p>${nichtVerfuegbar()}</p></article>`
  if (l.fokus === null) return `<article class="cockpit-role">${kopf}<h2>${tx('uebersicht.rolle.keine')}</h2><small>${tx('uebersicht.rolle.keinAblauf')}</small></article>`

  const art = l.fokus.naechster?.art
  let titel
  let unterzeile = ''
  if (art === 'haltFreigabe' || art === 'haltKlaerung') {
    titel = tx(art === 'haltFreigabe' ? 'uebersicht.rolle.freigabe' : 'uebersicht.rolle.rueckfrage')
    unterzeile = `<small>${tx('uebersicht.rolle.menschlich')}</small>`
  } else if (l.fokusNachtrag?.status === 'ok') {
    const laufend = l.fokusNachtrag.daten.schritte.find((s) => s.status === 'LAEUFT') ?? null
    titel = laufend !== null ? escapeHtml(rollenName(laufend.rolle)) : tx('uebersicht.rolle.keine')
    if (laufend !== null) unterzeile = `<small>${tx('uebersicht.rolle.schritt')} <code>${escapeHtml(laufend.schritt_id)}</code></small>`
  } else if (l.fokusNachtrag?.status === 'fehler') {
    titel = nichtVerfuegbar()
  } else {
    titel = tx('uebersicht.laedt')
  }
  return `<article class="cockpit-role">
      ${kopf}
      <h2>${titel}</h2>
      <p>${escapeHtml(titelVon({ id: l.fokus.workflowId, titel: l.fokus.ziel }))}</p>
      ${unterzeile}
      ${textLink(`#/workflows/${encodeURIComponent(l.fokus.workflowId)}`, t('uebersicht.rolle.link'))}
    </article>`
}

/**
 * Karte Deployer · Mensch (B4, Z): kein Veröffentlichungsstatus, deshalb nur der Satz und „kommt“.
 * @returns HTML
 */
function deployerKarte() {
  return `<article class="cockpit-deployer" aria-disabled="true">
      <span class="eyebrow">${tx('uebersicht.deployer.eyebrow')}</span>
      <h2>${tx('uebersicht.deployer.titel')} ${kommtBadge()}</h2>
      <small>${tx('uebersicht.deployer.text')}</small>
    </article>`
}

/**
 * Ein Wert der Vierer-Leiste (B5).
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
 * Vier Werte (B5). In Arbeit = aktiverLauf.aktiv ? 1 : 0; Deine Entscheidung = wartende
 * Workflows (filtereAttentionWorkflows); Abgenommen und Geplant aus dem aktuellen Meilenstein.
 * @returns HTML
 */
function werteBlock() {
  const zustand = letzterZustand
  const zahl = (n) => escapeHtml(formatiereZahl(n))
  const laedtText = `<span class="uebersicht-wert-laedt">${tx('uebersicht.laedt')}</span>`

  let inArbeit = laedtText
  let entscheidung = laedtText
  if (zustand !== null) {
    inArbeit = typeof zustand.aktiverLauf?.aktiv === 'boolean' ? zahl(zustand.aktiverLauf.aktiv ? 1 : 0) : nichtVerfuegbar()
    const wartend = filtereAttentionWorkflows(zustand.workflows ?? null)
    entscheidung = wartend === null ? nichtVerfuegbar() : zahl(wartend.length)
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
 * Ziel dieser Version (B6): die Vision unübersetzt; Schreiben ist Z.
 * @returns HTML
 */
function zielBlock() {
  const zustand = roadmapZustand(roadmap)
  let text
  if (zustand === 'laedt') text = tx('uebersicht.laedt')
  else if (zustand === 'ok' && typeof roadmap.vision === 'string' && roadmap.vision.trim() !== '') text = escapeHtml(roadmap.vision)
  else if (zustand === 'ok' || zustand === 'nicht_vorhanden') text = `<span class="subtle">${tx('uebersicht.ziel.leer')}</span>`
  else text = nichtVerfuegbar()
  return `<section class="product-brief-strip">
      <div>
        <div class="eyebrow">${tx('uebersicht.ziel.eyebrow')}</div>
        <p>${text}</p>
        <div class="uebersicht-brief-mehr">${kommtKnopf(t('uebersicht.ziel.zielgruppe'), { symbol: '▸' })}</div>
      </div>
      ${kommtKnopf(t('uebersicht.ziel.schaerfen'))}
    </section>`
}

/**
 * Einstieg Produktmanagement (statisch).
 * @returns HTML
 */
function produktzyklusBlock() {
  const phasen = ['strategie', 'nutzerwissen', 'planung', 'entwicklung', 'veroeffentlichung', 'lernen'].map((p) => tx(`uebersicht.zyklus.phase.${p}`)).join(' · ')
  return `<a class="cycle-entry" href="#/produktzyklus">
      <div>
        <span class="eyebrow">${tx('uebersicht.zyklus.eyebrow')}</span>
        <strong>${tx('uebersicht.zyklus.titel')}</strong>
        <p>${phasen}</p>
      </div>
      <span>${tx('uebersicht.zyklus.link')} <span aria-hidden="true">→</span></span>
    </a>`
}

/**
 * Eine Zeile in „Deine nächsten Entscheidungen“; die Direktaktion ist ein Link.
 * @param eintrag - Eintrag aus baueEntscheidungen
 * @returns HTML
 */
function entscheidungZeile(eintrag) {
  const art = tx(`attention.art.${eintrag.art}`)
  const eyebrow = eintrag.art === 'befund' ? `${art} · ${escapeHtml(eintrag.prioritaet)}` : art
  let satz
  if (eintrag.satz !== null) satz = escapeHtml(eintrag.satz)
  else if (eintrag.art === 'startproblem') satz = escapeHtml(eintrag.fehler ?? '')
  else satz = tx(`attention.satz.${eintrag.art}`)
  const ziel = eintrag.hash ?? '#/attention'
  return `<div class="pm-decision">
      <div>
        <div class="eyebrow">${eyebrow}</div>
        <h3>${escapeHtml(eintrag.titel)}</h3>
        <p>${satz}</p>
      </div>
      <a class="button" href="${escapeHtml(ziel)}">${tx(`uebersicht.entscheidungen.aktion.${eintrag.art}`)} <span aria-hidden="true">→</span></a>
    </div>`
}

/**
 * Deine nächsten Entscheidungen (B7): die ersten drei Einträge aus baueEntscheidungen.
 * @returns HTML
 */
function entscheidungenSpalte() {
  const kopf = (anzahlHtml) => `<div class="section-label">
      <h2>${tx('uebersicht.entscheidungen.titel')}</h2>
      <a class="uebersicht-alle" href="#/attention">${tx('uebersicht.entscheidungen.alle')} <span aria-hidden="true">→</span>${anzahlHtml}</a>
    </div>`
  if (letzterZustand === null) return `<section class="pm-focus">${kopf('')}${laedt()}</section>`
  const { eintraege, zaehler, defekt, alleLeer } = baueEntscheidungen(letzterZustand, p0p1)
  // Die Gesamtzahl nur, wenn alle vier Quellen da sind — nie eine Teilsumme als Gesamtzahl.
  const vollstaendig = Object.values(zaehler).every((z) => typeof z === 'number')
  const anzahlText = vollstaendig ? tx('uebersicht.entscheidungen.offen', { zahl: formatiereZahl(eintraege.length) }) : defekt ? tx('uebersicht.nichtVerfuegbar') : tx('uebersicht.laedt')
  const anzahl = `<span class="uebersicht-zaehler">${anzahlText}</span>`
  const hinweis = defekt ? `<p class="subtle">${tx('uebersicht.entscheidungen.defekt')}</p>` : ''
  let liste
  if (eintraege.length > 0) liste = eintraege.slice(0, ENTSCHEIDUNGEN_MAX).map(entscheidungZeile).join('')
  else if (alleLeer) liste = `<p class="pm-clear">${tx('uebersicht.entscheidungen.leer')}</p>`
  else if (defekt) liste = ''
  else liste = laedt()
  return `<section class="pm-focus">${kopf(anzahl)}${hinweis}${liste}</section>`
}

/**
 * Die Workforce gerade (B8): Status aus aktiverLauf bzw. dem Fokus-Workflow; „Als Nächstes
 * vorgesehen“ ist Z.
 * @param l - lage()
 * @returns HTML
 */
function workforceSpalte(l) {
  let titel
  let text
  let link = ''
  if (l.zustand === null) {
    titel = tx('uebersicht.laedt')
    text = ''
  } else if (l.zustand.aktiverLauf?.aktiv === true) {
    titel = tx('uebersicht.workforce.laeuft')
    const aufgabe = l.fokusNachtrag?.status === 'ok' ? l.fokusNachtrag.daten.aktivLauf?.aufgabe : null
    text = aufgabe ? escapeHtml(aufgabe) : tx('uebersicht.workforce.laeuft.text')
    const laufId = l.zustand.aktiverLauf.laufId
    if (typeof laufId === 'string' && laufId !== '') link = textLink(`#/runs/${encodeURIComponent(laufId)}`, t('uebersicht.workforce.lauf'))
  } else if (typeof l.zustand.aktiverLauf?.aktiv !== 'boolean') {
    titel = nichtVerfuegbar()
    text = ''
  } else if (l.fokus !== null && (l.fokus.naechster?.art === 'haltFreigabe' || l.fokus.naechster?.art === 'haltKlaerung')) {
    titel = tx('uebersicht.workforce.wartet')
    text = tx('uebersicht.workforce.ruhig')
    link = textLink(`#/workflows/${encodeURIComponent(l.fokus.workflowId)}`, t('uebersicht.rolle.link'))
  } else {
    titel = tx('uebersicht.workforce.keine')
    text = tx('uebersicht.workforce.keine.text')
  }
  return `<aside class="pm-now">
      <span class="eyebrow">${tx('uebersicht.workforce.eyebrow')}</span>
      <h2>${titel}</h2>
      ${text ? `<p>${text}</p>` : ''}
      ${link}
      <div class="pm-next" aria-disabled="true">
        <span class="eyebrow">${tx('uebersicht.workforce.naechstes')} ${kommtBadge()}</span>
        <p class="subtle">${tx('uebersicht.workforce.naechstes.leer')}</p>
      </div>
    </aside>`
}

/**
 * Der Weg zum Produkt (B9, F-905 nach Vorlage): alle Meilensteine kompakt, je eine Zeile mit
 * Titel, Status und „x / y abgenommen“; der aktuelle ist hervorgehoben. Keine Featurezeilen, keine
 * Zeitachse, keine Wochenspalten.
 * @returns HTML
 */
function wegBlock() {
  const kopf = `<div class="section-label"><h2>${tx('uebersicht.weg.titel')}</h2>${textLink('#/roadmap', t('uebersicht.weg.link'))}</div>`
  const { zustand, meilenstein: aktueller } = roadmapLage()
  let inhalt
  if (zustand === 'fehler') {
    inhalt = `<div class="note red"><strong>${tx('roadmap.fehler.titel')}</strong><p>${tx('roadmap.fehler.text')}</p><button type="button" class="button" data-uebersicht-erneut>${tx('roadmap.fehler.erneut')}</button></div>`
  } else if (zustand === 'ungueltig') {
    inhalt = `<div class="note red"><strong>${tx('roadmap.ungueltig.titel', { anzahl: roadmap.fehler.length })}</strong><p>${tx('roadmap.ungueltig.text')}</p></div>`
  } else if (zustand !== 'ok') {
    inhalt = `<p class="subtle">${escapeHtml(ohneMeilensteinText(zustand))}</p>`
  } else if (roadmap.meilensteine.length === 0) {
    inhalt = `<p class="subtle">${tx('roadmap.keineMeilensteine')}</p>`
  } else {
    const zeilen = roadmap.meilensteine
      .map((m) => {
        const { abgenommen, gesamt } = zaehleMeilenstein(m)
        const istAktuell = m === aktueller
        return `<li class="uebersicht-weg-zeile${istAktuell ? ' aktuell' : ''}"${istAktuell ? ' aria-current="step"' : ''}>
            <span class="uebersicht-weg-titel">${istAktuell ? `<span class="eyebrow">${tx('roadmap.meilenstein.aktuell')}</span>` : ''}<strong>${escapeHtml(titelVon(m))}</strong></span>
            <span class="uebersicht-weg-status">${featureStatus(m.status)}</span>
            <small class="uebersicht-weg-zaehler">${tx('roadmap.meilenstein.abgenommen', { abgenommen: formatiereZahl(abgenommen), gesamt: formatiereZahl(gesamt) })}</small>
          </li>`
      })
      .join('')
    inhalt = `<ol class="uebersicht-weg uebersicht-weg-liste">${zeilen}</ol>`
  }
  return `${kopf}${inhalt}`
}

/**
 * Wer macht was (B11): Zuvor, Jetzt, Danach aus den Schritten des Fokus-Workflows, erwarteter
 * Output = workflow.ziel, Zeile zu Worker und beobachtetem Modell. Die Spalten baut werSpalte aus
 * rollen-anzeige.js (lesbarer Rollenname statt ID, F-914; gemeinsam mit dem Detail der Entwicklung).
 * @param l - lage()
 * @returns HTML
 */
function werBlock(l) {
  const kopf = `<div class="section-label"><h2>${tx('uebersicht.wer.titel')}</h2></div>`
  if (l.zustand === null) return `${kopf}${laedt()}`
  if (!Array.isArray(l.zustand.workflows)) return `${kopf}<p>${nichtVerfuegbar()}</p>`
  if (l.fokus === null) return `${kopf}<p class="subtle">${tx('uebersicht.wer.leer')}</p>`
  if (l.fokusNachtrag?.status === 'fehler') return `${kopf}<p>${tx('uebersicht.wer.fehler')}</p>`
  if (l.fokusNachtrag?.status !== 'ok') return `${kopf}${laedt()}`

  const { zuvor, jetzt, danach } = schrittFolge(l.fokus, l.fokusNachtrag.daten.schritte)
  const art = l.fokus.naechster?.art
  const menschlich = art === 'haltFreigabe' ? tx('uebersicht.rolle.freigabe') : art === 'haltKlaerung' ? tx('uebersicht.rolle.rueckfrage') : ''
  const lauf = l.fokusNachtrag.daten.aktivLauf
  const modell =
    lauf !== null && typeof lauf.modellBeobachtet === 'string' && lauf.modellBeobachtet !== ''
      ? tx('uebersicht.wer.modell', { worker: lauf.worker ?? '–', modell: lauf.modellBeobachtet })
      : tx('uebersicht.wer.modellNichtBeobachtet')
  return `${kopf}
    <div class="execution-triptych">
      ${werSpalte(t('uebersicht.wer.zuvor'), zuvor)}
      ${werSpalte(t('uebersicht.wer.jetzt'), jetzt, { titelHtml: menschlich, zusatz: `<span class="model-label">${modell}</span>`, klasse: 'execution-current' })}
      ${werSpalte(t('uebersicht.wer.danach'), danach)}
    </div>
    <div class="expected-output">
      <span class="eyebrow">${tx('uebersicht.wer.output')}</span>
      <p>${escapeHtml(titelVon({ id: '–', titel: l.fokus.ziel }))}</p>
    </div>`
}

/**
 * Drei Kacheln Features / Bugs / Harness Improvements mit der Zahl offener Workitems je Typ
 * (Findings: Status OFFEN; Features: weder ABGESCHLOSSEN noch ABGEBROCHEN).
 * @returns HTML
 */
function kachelnBlock() {
  return `<div class="pm-category-links">${KACHEL_TYPEN.map((typ) => {
    let zeile
    if (workitems === undefined) zeile = tx('uebersicht.laedt')
    else if (workitems === null) zeile = nichtVerfuegbar()
    else {
      const anzahl = workitems.reduce((summe, w) => (w.typ === typ && (typ === 'FEATURE' ? w.status !== 'ABGESCHLOSSEN' && w.status !== 'ABGEBROCHEN' : w.status === 'OFFEN') ? summe + 1 : summe), 0)
      zeile = tx('uebersicht.kachel.offen', { anzahl, zahl: formatiereZahl(anzahl) })
    }
    return `<a class="pm-category-card" href="#/workboard">
        <span aria-hidden="true">${KACHEL_SYMBOL[typ]}</span>
        <div><strong>${tx(`uebersicht.kachel.${typ}`)}</strong><small>${zeile}</small></div>
        ${PFEIL}
      </a>`
  }).join('')}</div>`
}

/**
 * Eine Zeile des Entwicklungsstands: Titel (Link ins Workboard-Detail, außer Features ohne Akte),
 * ID und Art, Status, Priorität lesend als Z („ohne Priorität“ bei Features).
 * @param eintrag - Eintrag aus waehleEntwicklungsstand
 * @returns HTML
 */
function standZeile(eintrag) {
  const titel = `<strong>${escapeHtml(titelVon(eintrag))}</strong><small><code>${escapeHtml(eintrag.id)}</code> · ${tx(`uebersicht.stand.art.${eintrag.art}`)}</small>`
  const ohneAkte = eintrag.art === 'feature' && statusKategorie(eintrag.status) === 'ohne_akte'
  const name = ohneAkte ? `<span class="pm-item-name">${titel}</span>` : `<a class="pm-item-name" href="#/workboard/${encodeURIComponent(eintrag.id)}">${titel}</a>`
  const status = eintrag.art === 'feature' ? featureStatus(eintrag.status) : `<span class="roadmap-status" title="${escapeHtml(eintrag.status ?? '')}">${tx('uebersicht.stand.offen')}</span>`
  return `<div class="pm-status-row">${name}<span class="pm-row-status">${status}</span>${kommtKnopf(eintrag.prioritaet ?? t('uebersicht.stand.ohnePrioritaet'))}</div>`
}

/**
 * Entwicklungsstand (B10, F-905 nach Vorlage): offene P0–P2-Findings und offene Features des
 * aktuellen Meilensteins, zusammen höchstens acht, sortiert P0 → P1 → P2 → Features
 * (waehleEntwicklungsstand). Ändern der Priorität ist Z. Darunter „Alle ansehen“ und die drei
 * Typ-Kacheln. Fehlt eine der beiden Quellen, sagt eine Zeile, welche.
 * @returns HTML
 */
function standBlock() {
  const kopf = `<div class="section-label"><h2 id="uebersicht-stand-titel" tabindex="-1">${tx('uebersicht.stand.titel')}</h2></div>`
  const { zustand, meilenstein } = roadmapLage()
  const { eintraege } = waehleEntwicklungsstand(meilenstein, workitems)
  const hinweise = []
  if (workitems === undefined || zustand === 'laedt') hinweise.push(tx('uebersicht.laedt'))
  if (workitems === null) hinweise.push(tx('uebersicht.stand.befundeNichtVerfuegbar'))
  if (zustand === 'fehler' || zustand === 'ungueltig') hinweise.push(tx('uebersicht.stand.featuresNichtVerfuegbar'))
  let zeilen = ''
  if (eintraege.length > 0) zeilen = `<div class="pm-work-table">${eintraege.map(standZeile).join('')}</div>`
  else if (hinweise.length === 0) zeilen = `<p class="subtle">${tx('uebersicht.stand.leer')}</p>`
  const hinweisHtml = hinweise.map((h) => `<p class="subtle">${h}</p>`).join('')
  return `${kopf}${zeilen}${hinweisHtml}<p class="uebersicht-stand-alle">${textLink('#/workboard', t('uebersicht.stand.alle'))}</p>${kachelnBlock()}`
}

/**
 * Zuletzt umgesetzt (B12): der jüngste Lauf und sein Workflow, Schritte „x/y“ als kleiner Ring.
 * @param l - lage()
 * @returns HTML
 */
function zuletztBlock(l) {
  const eyebrow = `<span class="eyebrow">${tx('uebersicht.zuletzt.eyebrow')}</span>`
  if (l.zustand === null) return `<div>${eyebrow}${laedt()}</div>`
  if (!Array.isArray(l.zustand.laeufe)) return `<div>${eyebrow}<p>${nichtVerfuegbar()}</p></div>`
  if (l.lauf === null) return `<div>${eyebrow}<p class="subtle">${tx('uebersicht.zuletzt.leer')}</p></div>`

  const titel = titelVon({ id: titelVon({ id: l.lauf.laufId, titel: l.lauf.auftragsbezug?.titel }), titel: l.laufWorkflow?.ziel })
  const ergebnis = l.lauf.ergebnis ?? l.lauf.laufStatus?.status ?? null
  const zeit = l.lauf.zeitpunkt ? ` · <time datetime="${escapeHtml(l.lauf.zeitpunkt)}">${escapeHtml(formatiereDatum(l.lauf.zeitpunkt, { dateStyle: 'medium', timeStyle: 'short' }))}</time>` : ''
  let schritteHtml = ''
  if (l.laufWorkflow !== null) {
    if (l.laufNachtrag?.status === 'ok') {
      const schritte = l.laufNachtrag.daten.schritte
      const erledigt = schritte.filter((s) => s.status === 'ERFOLGREICH').length
      schritteHtml = ring(erledigt, schritte.length, { klein: true, label: t('uebersicht.zuletzt.schritte', { anzahl: schritte.length, erledigt: formatiereZahl(erledigt), gesamt: formatiereZahl(schritte.length) }) })
    } else if (l.laufNachtrag?.status === 'fehler') {
      schritteHtml = `<p class="subtle">${tx('uebersicht.zuletzt.schritteNichtVerfuegbar')}</p>`
    }
  }
  const links = [textLink(`#/runs/${encodeURIComponent(l.lauf.laufId)}`, t('uebersicht.zuletzt.lauf'))]
  if (l.laufWorkflow !== null) links.push(textLink(`#/workflows/${encodeURIComponent(l.laufWorkflow.workflowId)}`, t('uebersicht.rolle.link')))
  return `<div class="recent-delivery">
      <div>
        ${eyebrow}
        <h2>${escapeHtml(titel)}</h2>
        <p>${tx('uebersicht.zuletzt.ergebnis')} ${ergebnis === null ? tx('uebersicht.zuletzt.offen') : `<code>${escapeHtml(ergebnis)}</code>`} · <code>${escapeHtml(l.lauf.laufId)}</code>${zeit}</p>
        <div class="action-row">${links.join('')}</div>
      </div>
      ${schritteHtml}
    </div>`
}

/**
 * Was steckt dahinter (B13): drei Z-Knöpfe.
 * @returns HTML
 */
function dahinterBlock() {
  return `<section class="uebersicht-dahinter">
      <div>
        <span class="eyebrow">${tx('uebersicht.dahinter.eyebrow')}</span>
        <h2>${tx('uebersicht.dahinter.titel')}</h2>
        <p class="subtle">${tx('uebersicht.dahinter.text')}</p>
      </div>
      <div class="action-row">
        ${kommtKnopf(t('uebersicht.dahinter.architektur'))}
        ${kommtKnopf(t('uebersicht.dahinter.code'))}
        ${kommtKnopf(t('uebersicht.dahinter.health'))}
      </div>
    </section>`
}

/**
 * Betrieb (B16): Läufe, Workflows und Startfehler als ruhige Zeile mit Links.
 * @returns HTML
 */
function betriebBlock() {
  const zustand = letzterZustand
  const eintrag = (schluessel, liste, hash) => {
    let wertHtml
    if (zustand === null) wertHtml = tx('uebersicht.laedt')
    else if (!Array.isArray(liste)) wertHtml = nichtVerfuegbar()
    else wertHtml = `<strong>${escapeHtml(formatiereZahl(liste.length))}</strong>`
    return `<a href="${hash}">${tx(schluessel)} ${wertHtml}</a>`
  }
  return `<p class="uebersicht-betrieb"><span class="eyebrow">${tx('uebersicht.betrieb.eyebrow')}</span>
      ${eintrag('uebersicht.betrieb.laeufe', zustand?.laeufe, '#/runs')}
      ${eintrag('uebersicht.betrieb.workflows', zustand?.workflows, '#/runs')}
      ${eintrag('uebersicht.betrieb.startfehler', zustand?.startfehler, '#/runs')}
    </p>`
}

/**
 * Geführter erster Schritt (B14).
 * @returns HTML
 */
function ersterSchrittBlock() {
  const schritte = ['beschreiben', 'pruefen', 'freigeben'].map((s) => `<li><strong>${tx(`uebersicht.ersterSchritt.${s}`)}</strong><span>${tx(`uebersicht.ersterSchritt.${s}.text`)}</span></li>`).join('')
  return `<section class="first-step">
      <span class="eyebrow">${tx('uebersicht.ersterSchritt.eyebrow')}</span>
      <h2>${tx('uebersicht.ersterSchritt.titel')}</h2>
      <p>${tx('uebersicht.ersterSchritt.text')}</p>
      <div class="action-row"><a class="button primary" href="#/projekt">${tx('uebersicht.ersterSchritt.aktion')}</a></div>
      <ol class="onboarding-steps">${schritte}</ol>
    </section>`
}

// ─── Zusammenbau ────────────────────────────────────────────────────────────

/** Gerüst mit einem Container je Block; jeder Block zeigt zunächst „Lädt…“. */
function geruest() {
  const l = `<p class="subtle">${tx('uebersicht.laedt')}</p>`
  return `<div id="uebersicht-b1">${l}</div>
    <div id="uebersicht-erster-schritt" hidden></div>
    <div id="uebersicht-inhalt">
      <section class="product-cockpit" id="uebersicht-cockpit">${l}</section>
      <div id="uebersicht-werte">${l}</div>
      <div id="uebersicht-ziel">${l}</div>
      <div id="uebersicht-zyklus"></div>
      <div class="pm-focus-layout" id="uebersicht-fokus">${l}</div>
      <section class="pm-roadmap-section" id="uebersicht-weg">${l}</section>
      <section class="pm-roadmap-section" id="uebersicht-stand">${l}</section>
      <section class="execution-brief" id="uebersicht-wer">${l}</section>
      <section id="uebersicht-zuletzt">${l}</section>
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
  stelleNachtraegeSicher([l.fokus, l.laufWorkflow])
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
  setzeBlock('uebersicht-cockpit', () => fortschrittKarte() + rolleKarte(l) + deployerKarte())
  setzeBlock('uebersicht-werte', werteBlock)
  setzeBlock('uebersicht-ziel', zielBlock)
  setzeBlock('uebersicht-zyklus', produktzyklusBlock)
  setzeBlock('uebersicht-fokus', () => entscheidungenSpalte() + workforceSpalte(l))
  setzeBlock('uebersicht-weg', wegBlock)
  setzeBlock('uebersicht-stand', standBlock)
  setzeBlock('uebersicht-wer', () => werBlock(l))
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

/** Lädt die Roadmap neu (Betreten, Projektwechsel, „Erneut laden“ im Block Weg). */
function ladeRoadmap() {
  roadmap = null
  const abruf = ladeQuelle(
    'roadmap',
    () => holeRoadmap(),
    (antwort) => {
      roadmap = antwort
    },
    (fehler) => {
      roadmap = { status: 'fehler', grund: fehler instanceof Error ? fehler.message : String(fehler) }
    }
  )
  render()
  return abruf
}

/** Lädt Roadmap, alle Workitems und P0/P1 neu und verwirft die Fokus-Nachträge (frischer Stand, F-899) — beim Betreten und beim Projektwechsel, nie aus dem Poll. */
function ladeAlles() {
  workitems = undefined
  p0p1 = undefined
  nachtragGeneration++
  nachtraege.clear()
  void ladeRoadmap()
  void ladeQuelle(
    'workitems',
    () => holeWorkitems(),
    (antwort) => {
      workitems = Array.isArray(antwort?.workitems) ? antwort.workitems : null
    },
    () => {
      workitems = null
    }
  )
  void ladeQuelle(
    'p0p1',
    () => holeOffeneP0P1Workitems(),
    (antwort) => {
      p0p1 = Array.isArray(antwort?.workitems) ? antwort.workitems : null
    },
    () => {
      p0p1 = null
    }
  )
  render()
}

/** Klick-Delegation: Sprung zum Entwicklungsstand (B2) und „Erneut laden“ der Roadmap (B9) — beide ohne Schreibwirkung. */
function initBedienung() {
  document.getElementById('view-dashboard')?.addEventListener('click', (ereignis) => {
    if (!(ereignis.target instanceof Element)) return
    const sprung = ereignis.target.closest('[data-sprung]')
    if (sprung !== null) {
      const ziel = document.getElementById(sprung.getAttribute('data-sprung'))
      ziel?.scrollIntoView({ block: 'start' })
      document.getElementById('uebersicht-stand-titel')?.focus({ preventScroll: true })
      return
    }
    if (ereignis.target.closest('[data-uebersicht-erneut]') !== null) {
      void ladeRoadmap().then(() => document.querySelector('#view-dashboard h1')?.focus())
    }
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
  // F-860: Aggregat, Roadmap, Workitems, P0/P1 und Nachträge gehören zum Projekt — beim Wechsel
  // verwerfen. Bis das Aggregat des neuen Projekts da ist (projekt-kontext.js stößt den Abruf an),
  // zeigen die Blöcke „Lädt…“ statt der Daten des alten Projekts.
  abonniereProjektWechsel(() => {
    letzterZustand = null
    setzeGeruest()
    ladeAlles()
  })
}
