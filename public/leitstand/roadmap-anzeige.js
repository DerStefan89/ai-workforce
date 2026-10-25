/**
 * Datei: public/leitstand/roadmap-anzeige.js
 *
 * Zweck: Reine Anzeigeregeln der Roadmap (F44 WS-2a, Abgleich F-725 D1–D4) über der Projektion
 * von GET …/roadmap (scripts/leitstand/routen-roadmap.mjs): aktueller Meilenstein, Zähler
 * „x / y abgenommen“, Statuskategorie für Symbol und Legende, welche Meilensteine offen stehen,
 * welche Features in keinem Meilenstein stehen, und in welchem Zustand die Antwort ist. Seit F45 B5b-2a zusätzlich der
 * Gantt lesend (features/F45/plan-b5b2a-v2.md): Achse je Zoom, Formen je Zeile (baueSpur), Zeilenliste Meilenstein → Feature
 * → Workstream/Fixpaket/Design mit Gruppen der erledigten Kinder (ganttZeilen), Kennzahlen „Bis <M> fertig“ und „Plan
 * gegen Ist“ aus kennzahlen der Projektion. Seit F45 B5b-2c-2-AB (features/F45/plan-b5b2c2-v2.md) mit optionaler Zuordnung der
 * Befunde (befund-zuordnung.js ordneBefundeZu, berechnet von der View): Zähler „offene Befunde (P0–P2)“ je Feature und Meilenstein,
 * an der Trennzeile, und die Zeile „Pflege & Fixes“ mit bis zu PFLEGE_MAX Befund-Zeilen.
 * Eine Stelle für diese Regeln, damit #/roadmap und in WS-2b der aktuelle Meilenstein und der
 * Fortschrittsring der Übersicht nicht auseinanderlaufen.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/roadmap.js (seit F46 D1 auch waehleEntwicklungsstand mit Typfilter — der
 *   Entwicklungsstand ist aus der Übersicht hierher gezogen)
 * - public/leitstand/views/dashboard.js (aktueller Meilenstein, Fortschrittsring, Vier Werte, Zuletzt
 *   umgesetzt)
 * - public/leitstand/views/projektakte.js (F46 D1: roadmapZustand für die Vision)
 * - public/leitstand/views/workboard-detail.js (F44 WS-3a/3b: statusKategorie für den Kartenstatus von Feature-Akten,
 *   roadmapZustand für den Meilenstein im Detail)
 * - public/leitstand/views/projekte-uebersicht.js über produkte-anzeige.js (F44 WS-6a: roadmapZustand, zaehleRoadmap —
 *   Ring je Produktkarte)
 * - public/leitstand/roadmap-anzeige.test.mjs (node:test)
 *
 * Wichtig:
 * - Import-sicher: kein Zugriff auf DOM, Storage oder Netz, keine Abhängigkeit — in Node
 *   importierbar.
 * - Die frühere Bento-Karte „Roadmap“ im Workboard mit eigener, engerer Regel ist seit F44 WS-3a
 *   entfernt (F-892).
 */

/** Status eines abgeschlossenen Meilensteins bzw. eines abgenommenen Features. */
const ABGESCHLOSSEN = 'ABGESCHLOSSEN'

/**
 * Statuswerte je Kategorie. Meilensteine kennen GEPLANT/LAEUFT/ABGESCHLOSSEN
 * (src/projektkontext/index.ts), Features die Status-Werte von scripts/check-feature.mjs, dazu
 * die Projektionswerte keine_akte und UNBEKANNT (routen-roadmap.mjs).
 */
const KATEGORIE_JE_STATUS = {
  ABGESCHLOSSEN: 'abgenommen',
  FEATURE_GATE: 'freigabe',
  LAEUFT: 'in_arbeit',
  IN_ARBEIT: 'in_arbeit',
  WORKSTREAM_SCHNITT_GENEHMIGT: 'in_arbeit',
  BLOCKIERT: 'klaerung',
  GEPLANT: 'geplant',
  ENTWURF: 'geplant',
  READY_FOR_TECH: 'geplant',
  ABGEBROCHEN: 'abgebrochen',
  keine_akte: 'ohne_akte',
  // F45 B5b-2a: Status einer Workstream-Zeile der Akte (src/workboard/feature-planung.ts WORKSTREAM_STATUS).
  geplant: 'geplant',
  laeuft: 'in_arbeit',
  erledigt: 'abgenommen',
  verworfen: 'abgebrochen',
}

/** Kategorien in Legendenreihenfolge (die ersten fünf wie die Vorlage). */
export const STATUS_KATEGORIEN = ['abgenommen', 'freigabe', 'in_arbeit', 'klaerung', 'geplant', 'abgebrochen', 'ohne_akte', 'unbekannt']

/** Symbol je Statuskategorie — die fünf der Vorlage (✓ ◉ ↻ ! ○), dazu Abgebrochen, Ohne Akte und Unbekannt. Gemeinsam für #/roadmap und die Übersicht (F44 WS-2b). */
export const STATUS_SYMBOL = Object.freeze({
  abgenommen: '✓',
  freigabe: '◉',
  in_arbeit: '↻',
  klaerung: '!',
  geplant: '○',
  abgebrochen: '–',
  ohne_akte: '◇',
  unbekannt: '?',
})

/**
 * Featurestatus, die in der Übersicht als „Geplant“ zählen (B5): noch nicht gestartet. Seit F-904
 * (Challenger, 01.10.2026) ohne WORKSTREAM_SCHNITT_GENEHMIGT — der zählt wie in den Zeilen
 * (statusKategorie) als „in Arbeit“.
 */
const GEPLANT_STATUS = new Set(['ENTWURF', 'READY_FOR_TECH'])

/** Rang der Finding-Prioritäten im Entwicklungsstand (B10); Features ohne Priorität stehen dahinter. */
const ENTWICKLUNG_RANG = { P0: 0, P1: 1, P2: 2 }

/** Höchstzahl der Zeilen im Entwicklungsstand der Übersicht (B10, F-905). */
export const ENTWICKLUNGSSTAND_MAX = 8

/** Feature-ID nach der Roadmap-Regel (src/projektkontext, validiereRoadmapDaten) — nur solche IDs kann ein Meilenstein aufnehmen (F-895). */
const ROADMAP_FEATURE_ID = /^F[0-9]+[A-Za-z]?$/

/** Status, mit denen ein Feature keine Planungsentscheidung mehr braucht (F-895). */
const ERLEDIGT_STATUS = new Set([ABGESCHLOSSEN, 'ABGEBROCHEN'])

/**
 * Meilensteine einer gültigen Projektion, sonst eine leere Liste.
 * @param roadmap - Antwort von GET …/roadmap
 * @returns Meilenstein-Liste
 */
function meilensteineVon(roadmap) {
  return roadmap !== null && typeof roadmap === 'object' && roadmap.status === 'ok' && Array.isArray(roadmap.meilensteine) ? roadmap.meilensteine : []
}

/**
 * Ordnet eine Antwort von GET …/roadmap einem Anzeigezustand zu (D4). Nur die drei
 * Fachergebnisse des Servers zählen als solche; jede andere Form (auch ein Körper ohne
 * bekannten status, z. B. { grund }) ist 'fehler' — ein Serverfehler erscheint so nie als
 * „keine Roadmap“ (F-854).
 * @param antwort - geparste Antwort, null solange geladen wird, oder { status: 'fehler' } nach einem Wurf
 * @returns 'laedt' | 'ok' | 'nicht_vorhanden' | 'ungueltig' | 'fehler'
 */
export function roadmapZustand(antwort) {
  if (antwort === null || antwort === undefined) return 'laedt'
  if (typeof antwort !== 'object') return 'fehler'
  if (antwort.status === 'nicht_vorhanden') return 'nicht_vorhanden'
  if (antwort.status === 'ungueltig' && Array.isArray(antwort.fehler)) return 'ungueltig'
  if (antwort.status === 'ok' && Array.isArray(antwort.meilensteine) && antwort.meilensteine.every((m) => m !== null && typeof m === 'object' && Array.isArray(m.features))) return 'ok'
  return 'fehler'
}

/**
 * Der aktuelle Meilenstein: der erste mit status LAEUFT, sonst der erste nicht abgeschlossene,
 * sonst null (alle abgeschlossen oder keine gültige Roadmap).
 * @param roadmap - Antwort von GET …/roadmap
 * @returns Meilenstein oder null
 */
export function aktuellerMeilenstein(roadmap) {
  const meilensteine = meilensteineVon(roadmap)
  return meilensteine.find((m) => m.status === 'LAEUFT') ?? meilensteine.find((m) => m.status !== ABGESCHLOSSEN) ?? null
}

/**
 * Zählt die Features eines Meilensteins.
 * @param meilenstein - Eintrag aus roadmap.meilensteine
 * @returns { abgenommen: Features mit status ABGESCHLOSSEN, gesamt: alle Features einschließlich keine_akte }
 */
export function zaehleMeilenstein(meilenstein) {
  const features = Array.isArray(meilenstein?.features) ? meilenstein.features : []
  return { abgenommen: features.filter((f) => f.status === ABGESCHLOSSEN).length, gesamt: features.length }
}

/**
 * Zählt die Features aller Meilensteine einer gültigen Projektion (F44 WS-6a, Ring „Erfasste
 * Einträge abgenommen“ je Karte auf `#/projekte-uebersicht`, Abgleich F-725 H1). Ein Feature, das
 * in zwei Meilensteinen steht, zählt zweimal — wie in der Projektion.
 * @param roadmap - Antwort von GET …/roadmap
 * @returns { abgenommen, gesamt } über alle Meilensteine; 0/0 ohne gültige Projektion
 */
export function zaehleRoadmap(roadmap) {
  return meilensteineVon(roadmap)
    .map(zaehleMeilenstein)
    .reduce((summe, z) => ({ abgenommen: summe.abgenommen + z.abgenommen, gesamt: summe.gesamt + z.gesamt }), { abgenommen: 0, gesamt: 0 })
}

/**
 * Zählt die Features eines Meilensteins, die noch nicht gestartet sind (B5 „Geplant“): Status
 * ENTWURF oder READY_FOR_TECH (F-904).
 * @param meilenstein - Eintrag aus roadmap.meilensteine, oder null
 * @returns Anzahl (0 ohne Meilenstein)
 */
export function zaehleGeplant(meilenstein) {
  const features = Array.isArray(meilenstein?.features) ? meilenstein.features : []
  return features.filter((f) => GEPLANT_STATUS.has(f?.status)).length
}

/**
 * Kategorie eines Meilenstein- oder Featurestatus für Symbol, Farbe und Legende.
 * @param status - roher Statuswert
 * @returns eine der STATUS_KATEGORIEN; unbekannte Werte → 'unbekannt'
 */
export function statusKategorie(status) {
  return (typeof status === 'string' && Object.hasOwn(KATEGORIE_JE_STATUS, status) ? KATEGORIE_JE_STATUS[status] : null) ?? 'unbekannt'
}

/**
 * Ob ein Meilenstein aufgeklappt erscheint: der aktuelle und alle späteren sind offen, ebenso
 * jeder nicht abgeschlossene; ein abgeschlossener vor dem aktuellen ist eingeklappt (D1).
 * @param roadmap - Antwort von GET …/roadmap
 * @param meilenstein - Eintrag aus roadmap.meilensteine
 * @returns true, wenn offen
 */
export function meilensteinOffen(roadmap, meilenstein) {
  if (meilenstein?.status !== ABGESCHLOSSEN) return true
  const meilensteine = meilensteineVon(roadmap)
  const aktueller = aktuellerMeilenstein(roadmap)
  if (aktueller === null) return false
  return meilensteine.indexOf(meilenstein) > meilensteine.indexOf(aktueller)
}

/**
 * Features aus dem Arbeitsvorrat, die in keinem Meilenstein stehen (D3). Seit F-895 (Challenger,
 * F44 WS-2b, reversibel) nur offene Features — Status weder ABGESCHLOSSEN noch ABGEBROCHEN — mit
 * einer ID nach der Roadmap-Regel; alle übrigen kann bzw. muss kein Meilenstein aufnehmen.
 * @param roadmap - Antwort von GET …/roadmap
 * @param featureWorkitems - Workitems aus GET …/workitems?typ=FEATURE, null bei defekter Quelle
 * @returns Liste (bei 'nicht_vorhanden' alle Features), oder null, wenn die Zuordnung nicht prüfbar ist (Workitems defekt, Roadmap ungültig, fehlerhaft oder noch nicht geladen)
 */
export function nichtEingeplant(roadmap, featureWorkitems) {
  if (!Array.isArray(featureWorkitems)) return null
  const zustand = roadmapZustand(roadmap)
  if (zustand !== 'ok' && zustand !== 'nicht_vorhanden') return null
  const planbar = featureWorkitems.filter((w) => typeof w?.id === 'string' && ROADMAP_FEATURE_ID.test(w.id) && !ERLEDIGT_STATUS.has(w.status))
  if (zustand === 'nicht_vorhanden') return planbar
  const eingeplant = new Set(meilensteineVon(roadmap).flatMap((m) => m.features.map((f) => f.id)))
  return planbar.filter((w) => !eingeplant.has(w.id))
}

/**
 * Auswahl und Reihenfolge des Entwicklungsstands der Übersicht (B10, F-905 nach Vorlage V10):
 * offene Findings mit Priorität P0–P2 (Status OFFEN) und die offenen Features des aktuellen
 * Meilensteins (Status weder ABGESCHLOSSEN noch ABGEBROCHEN), sortiert P0 → P1 → P2 → Features
 * („ohne Priorität“), höchstens `max` Einträge. Innerhalb einer Stufe bleibt die Reihenfolge der
 * Quelle (Findings wie geliefert, Features wie im Meilenstein). Rein, ohne DOM und Netz.
 * @param meilenstein - aktueller Meilenstein (aktuellerMeilenstein) oder null
 * @param workitems - alle Workitems aus GET …/workitems, null bei defekter Quelle, undefined solange geladen wird
 * @param max - Höchstzahl der Einträge (Standard ENTWICKLUNGSSTAND_MAX)
 * @param optionen - F46 D1 (Roadmap, Filter Alle · Features · Bugs · Harness · Tech Debt): { typen: Liste
 *   der Workitem-Typen (FEATURE, BUG, …), die bleiben — ohne: alle }. Die Features des Meilensteins
 *   zählen als Typ FEATURE.
 * @returns { eintraege: [{ art: 'finding' | 'feature', id, titel, status, prioritaet, typ }], gesamt: Anzahl vor dem Kürzen, findingsVerfuegbar: false, wenn die Workitems fehlen oder defekt sind }
 */
export function waehleEntwicklungsstand(meilenstein, workitems, max = ENTWICKLUNGSSTAND_MAX, optionen = {}) {
  const typen = Array.isArray(optionen.typen) ? new Set(optionen.typen) : null
  const findings = Array.isArray(workitems)
    ? workitems
        .filter((w) => w !== null && typeof w === 'object' && w.quelle === 'finding' && w.status === 'OFFEN' && Object.hasOwn(ENTWICKLUNG_RANG, w.prioritaet))
        .map((w, index) => ({ w, index }))
        .sort((a, b) => ENTWICKLUNG_RANG[a.w.prioritaet] - ENTWICKLUNG_RANG[b.w.prioritaet] || a.index - b.index)
        .map(({ w }) => ({ art: 'finding', id: w.id, titel: w.titel, status: w.status, prioritaet: w.prioritaet, typ: w.typ ?? null }))
    : []
  const features = (Array.isArray(meilenstein?.features) ? meilenstein.features : [])
    .filter((f) => f !== null && typeof f === 'object' && !ERLEDIGT_STATUS.has(f.status))
    .map((f) => ({ art: 'feature', id: f.id, titel: f.titel, status: f.status, prioritaet: null, typ: 'FEATURE' }))
  const alle = [...findings, ...features].filter((e) => typen === null || typen.has(e.typ))
  return { eintraege: alle.slice(0, max), gesamt: alle.length, findingsVerfuegbar: Array.isArray(workitems) }
}

// ─── Gantt (F45 B5b-2a, features/F45/plan-b5b2a-v2.md) ─────────────────────────────────────────────
// Lesend über zeitachse und kennzahlen der Projektion (src/workboard/roadmap-planung.ts). Keine Länge ohne Schätzung (R4);
// die Ist-Zone ist ein Band wie im Design, keine Skala (Advisor 2).

/** Pixel je Arbeitstag je Zoom (Design 03-roadmap: eine Spalte = 44 px = 1 AT bzw. 1 Woche = 5 AT). */
export const MASSSTAB_PX = Object.freeze({ tage: 44, wochen: 8.8 })

/** Breite einer Achsenspalte und der Ist-Zone „Ist · bis heute“ links von der Heute-Linie (px). */
export const SPALTE_PX = 44
export const IST_BREITE = 96

/** Mindestbreite eines Balkens (px), damit eine sehr kurze Spanne sichtbar bleibt. */
const BALKEN_MIN_PX = 4

/** Spalten Platz hinter dem letzten Element für die Beschriftung (5 × 44 px ≈ die längste Beschriftung). */
const RESERVE_SPALTEN = 5

/**
 * Beschriftung links vom Element statt rechts (Prüfpass dg 2/qa 6): sobald ihr rechter Ankerpunkt hinter AT 6 liegt — die
 * Startansicht zeigt bei 1440 px rund zehn Spalten — und links davon mindestens LABEL_LINKS_PX Platz bis zur Heute-Linie ist.
 */
const LABEL_KIPP_AB_PX = IST_BREITE + 6 * SPALTE_PX
const LABEL_LINKS_PX = 200

/** Höchstzahl der Befund-Zeilen unter „Pflege & Fixes“; der Rest steht als Zahl an der Pflege-Zeile (Feld weitere). */
export const PFLEGE_MAX = 20

/** Status einer offenen Workstream-Zeile (geplant/laeuft) und einer erledigten (erledigt/verworfen). */
const ZEILE_OFFEN = new Set(['geplant', 'laeuft'])
const ZEILE_ERLEDIGT = new Set(['erledigt', 'verworfen'])

/**
 * Rundet auf zwei Nachkommastellen (wie roadmap-planung.ts).
 * @param zahl - Wert
 * @returns gerundeter Wert
 */
function runde(zahl) {
  return Math.round(zahl * 100) / 100
}

/**
 * true für eine endliche Zahl.
 * @param wert - Kandidat
 * @returns boolean
 */
function istZahl(wert) {
  return typeof wert === 'number' && Number.isFinite(wert)
}

/**
 * Einträge der Zeitachse einer gültigen Projektion; fehlt das Feld (älterer Server, Testprojektion) oder ist es kaputt: [].
 * @param roadmap - Antwort von GET …/roadmap
 * @returns Liste der Einträge mit meilenstein und feature als Text
 */
export function zeitachseVon(roadmap) {
  const eintraege = roadmapZustand(roadmap) === 'ok' ? roadmap.zeitachse?.eintraege : null
  return Array.isArray(eintraege) ? eintraege.filter((e) => e !== null && typeof e === 'object' && typeof e.meilenstein === 'string' && typeof e.feature === 'string') : []
}

/**
 * Achse für einen Zoom: Spalten ab heute (AT 1 … bzw. W 1 …), mindestens zehn, dazu drei Spalten Platz für die Beschriftung
 * hinter dem letzten Balken.
 * @param eintraege - aus zeitachseVon
 * @param massstab - 'tage' | 'wochen' (Unbekanntes → 'tage')
 * @returns { massstab, px: Pixel je AT, spalten: [{ nummer, links }], breite: Gesamtbreite der Spur }
 */
export function baueAchse(eintraege, massstab) {
  const zoom = Object.hasOwn(MASSSTAB_PX, massstab) ? massstab : 'tage'
  const px = MASSSTAB_PX[zoom]
  const ende = Math.max(0, ...eintraege.flatMap((e) => [e.ende_max_at, e.fruehestens_ab_at].filter(istZahl)))
  const anzahl = Math.max(10, Math.ceil((ende * px) / SPALTE_PX) + RESERVE_SPALTEN)
  const spalten = Array.from({ length: anzahl }, (_, i) => ({ nummer: i + 1, links: IST_BREITE + i * SPALTE_PX }))
  return { massstab: zoom, px, spalten, breite: IST_BREITE + anzahl * SPALTE_PX }
}

/**
 * x-Position eines Arbeitstags ab heute (0 = Heute-Linie).
 * @param at - Arbeitstage ab heute (≥ 0)
 * @param achse - aus baueAchse
 * @returns px
 */
export function xVonAt(at, achse) {
  return runde(IST_BREITE + at * achse.px)
}

/**
 * Formen einer Zeile auf der Zeitspur (Plan v2 Nr. 2, 3, 7): Ist-Band, Planbalken (gefüllt = läuft, sonst Umriss), gestrichelte
 * Spanne bis Max., punktierte Marke ohne Schätzung, Beschriftung als Daten (Text baut die Anzeige über i18n).
 * @param eintraege - Zeitachsen-Einträge der Zeile (bei Feature/Meilenstein alle darunter)
 * @param optionen - { istBand: Ist-Band zeigen, laeuft: Zeile läuft (füllt den Balken), ohneLage: offene Zeile unter abgeschlossenem Eltern }
 * @param achse - aus baueAchse
 * @returns { istBand, ohneLage, plan: { links, breite, form } | null, max: { links, breite } | null, marke: { links, ab } | null, label: { links, seite: 'rechts' | 'links' (Ankerpunkt = linke bzw. rechte Kante des Texts), dauer: { min, max } | null, ohneSchaetzung, fruehestensAb } | null }
 */
export function baueSpur(eintraege, optionen, achse) {
  const mitSchaetzung = eintraege.filter((e) => istZahl(e.start_at) && istZahl(e.ende_min_at) && istZahl(e.ende_max_at))
  const ohneSchaetzung = eintraege.filter((e) => e.schaetzung_fehlt === true && istZahl(e.fruehestens_ab_at))
  const spur = { istBand: optionen.istBand === true, ohneLage: optionen.ohneLage === true, plan: null, max: null, marke: null, label: null }
  let rechts = null
  let start = null
  let dauer = null
  if (mitSchaetzung.length > 0) {
    start = Math.min(...mitSchaetzung.map((e) => e.start_at))
    const endeMin = Math.max(...mitSchaetzung.map((e) => e.ende_min_at))
    const endeMax = Math.max(...mitSchaetzung.map((e) => e.ende_max_at))
    const laeuft = optionen.laeuft === true || mitSchaetzung.some((e) => e.status === 'laeuft')
    spur.plan = { links: xVonAt(start, achse), breite: Math.max(runde((endeMin - start) * achse.px), BALKEN_MIN_PX), form: laeuft ? 'gefuellt' : 'umriss' }
    if (endeMax > endeMin) spur.max = { links: xVonAt(endeMin, achse), breite: runde((endeMax - endeMin) * achse.px) }
    dauer = { min: runde(endeMin - start), max: runde(endeMax - start) }
    rechts = Math.max(spur.plan.links + spur.plan.breite, xVonAt(endeMax, achse))
  }
  if (ohneSchaetzung.length > 0) {
    const ab = Math.min(...ohneSchaetzung.map((e) => e.fruehestens_ab_at))
    spur.marke = { links: xVonAt(ab, achse), ab: runde(ab) }
    rechts = Math.max(rechts ?? 0, spur.marke.links + 6)
  }
  if (rechts !== null) {
    // nach_unbekannt: die Lage ist nur eine Untergrenze — sichtbar als „frühestens ab AT x“ vor der Dauer (Advisor 3).
    const nachUnbekannt = dauer !== null && eintraege.some((e) => e.nach_unbekannt === true)
    // Weit rechts kippt die Beschriftung vor das erste Element, damit sie in der Startansicht lesbar bleibt (Prüfpass dg 2).
    const linkesEnde = Math.min(spur.plan?.links ?? Number.POSITIVE_INFINITY, (spur.marke?.links ?? Number.POSITIVE_INFINITY) - 6)
    const kippt = rechts > LABEL_KIPP_AB_PX && linkesEnde - IST_BREITE >= LABEL_LINKS_PX
    spur.label = {
      links: runde(kippt ? linkesEnde - 6 : rechts + 6),
      seite: kippt ? 'links' : 'rechts',
      dauer,
      ohneSchaetzung: ohneSchaetzung.length,
      fruehestensAb: dauer === null ? spur.marke.ab : nachUnbekannt ? runde(start) : null,
    }
  }
  return spur
}

/**
 * Schlüssel einer Gantt-Zeile (JSON, damit IDs mit „/“ oder Leerzeichen eindeutig bleiben).
 * @param teile - Art und IDs
 * @returns Text
 */
export function zeilenSchluessel(...teile) {
  return JSON.stringify(teile)
}

/**
 * Summe der Ist-AT erledigter Workstream-Zeilen, null ohne Ist.
 * @param zeilen - Workstream-Einträge
 * @returns Zahl oder null
 */
function istSumme(zeilen) {
  const werte = zeilen.filter((w) => w.status === 'erledigt' && istZahl(w.ist)).map((w) => w.ist)
  return werte.length === 0 ? null : runde(werte.reduce((s, w) => s + w, 0))
}

/**
 * Alle Zeilen des Gantt in Anzeigereihenfolge (Plan v2 Nr. 5): Meilenstein → Feature → Workstream/Fixpaket/Design je `art`.
 * Bei einer nicht abgeschlossenen Elternzeile stehen die erledigten Kinder in einer Gruppenzeile vorn (eine Regel für
 * „Erledigt in M5“ und „n erledigt“). Liefert auch die eingeklappten Zeilen (sichtbar = false) — die Anzeige filtert, das
 * Detailpanel findet so jede Auswahl. Der aktuelle Meilenstein steht oben, abgeschlossene unter der Trennzeile.
 * Mit zustand.zuordnung (F45 B5b-2c-2-AB): Feature-Zeilen tragen befundeOffen (Befunde an diesem Feature), Meilenstein-Zeilen
 * befundeOffen = direkt am Meilenstein + Summe seiner Features und befundeDirekt; ein Feature in zwei Meilensteinen zählt an beiden
 * (DEKLARIERT, wie zaehleRoadmap — derselbe Befund kann so in der Trennzeile zweimal zählen). Am Ende von `oben` steht die Zeile
 * „Pflege & Fixes“ (art 'pflege', Standard zu, leere Spur, Status 'geplant' wie die Vorlage) mit höchstens PFLEGE_MAX Kindern
 * (art 'befund', Farbe 'bug' bei Typ BUG, sonst 'befund') in der Reihenfolge der Zuordnung; der Rest steht als weitere an der
 * Pflege-Zeile, nicht als Zeile. Pflege- und Befund-Zeilen haben kein „danach“ (Advisor B2). Ohne Zuordnung (Workitems laden oder
 * fehlen) wie bisher: keine Pflege-Zeile, befundeOffen null.
 * @param roadmap - Antwort von GET …/roadmap
 * @param zustand - { aufgeklappt: Set der Zeilenschlüssel oder null = Standard, abgeschlosseneSichtbar, achse, zuordnung: Ergebnis von
 *   ordneBefundeZu oder null/undefined }
 * @returns { oben: Zeile[], unten: Zeile[], trenner: { anzahl, abgenommen, gesamt, befunde? } | null, standardOffen: Set }
 *   Zeile = { schluessel, eltern, ebene, art, farbe, id, titel, status, kategorie, hatKinder, offen, sichtbar, istAt, schaetzung,
 *   notiz, anzahl, hinweise: string[], spur, bezug: { meilenstein, feature, workstream }, danach, befundeOffen (Feature, Meilenstein),
 *   befundeDirekt (Meilenstein), weitere (Pflege), typ und prioritaet (Befund) }
 */
export function ganttZeilen(roadmap, zustand) {
  const meilensteine = meilensteineVon(roadmap)
  const aktueller = aktuellerMeilenstein(roadmap)
  const eintraege = zeitachseVon(roadmap)
  const achse = zustand.achse ?? baueAchse(eintraege, 'tage')
  const zuordnung = zustand.zuordnung ?? null
  /** Offene P0–P2-Befunde an einem Feature bzw. direkt an einem Meilenstein (null ohne Zuordnung). */
  const befundeAnFeature = (id) => (zuordnung === null ? null : (zuordnung.jeFeature.get(id)?.length ?? 0))
  const befundeAnMeilenstein = (id) => (zuordnung === null ? null : (zuordnung.jeMeilenstein.get(id)?.length ?? 0))
  const jeFeature = new Map()
  for (const e of eintraege) {
    const schluessel = zeilenSchluessel(e.meilenstein, e.feature)
    if (!jeFeature.has(schluessel)) jeFeature.set(schluessel, [])
    jeFeature.get(schluessel).push(e)
  }
  const standardOffen = new Set()
  if (aktueller !== null) {
    standardOffen.add(zeilenSchluessel('m', aktueller.id))
    for (const f of aktueller.features) if (statusKategorie(f?.status) === 'in_arbeit') standardOffen.add(zeilenSchluessel('f', aktueller.id, f.id))
  }
  const istOffen = (schluessel) => (zustand.aufgeklappt instanceof Set ? zustand.aufgeklappt.has(schluessel) : standardOffen.has(schluessel))

  /** Baut eine Zeile und hängt sie an; Kinder nur über die übergebene Funktion. */
  const zeilen = []
  const neu = (basis, sichtbar, kinder) => {
    const zeile = { hinweise: [], istAt: null, schaetzung: null, notiz: '', anzahl: null, danach: null, ...basis, sichtbar, hatKinder: kinder !== null }
    zeile.offen = zeile.hatKinder && istOffen(zeile.schluessel)
    zeilen.push(zeile)
    if (kinder !== null) kinder(sichtbar && zeile.offen)
    return zeile
  }

  const workstreamZeile = (m, f, w, eltern, ebene, sichtbar, elternZu) => {
    const eigene = (jeFeature.get(zeilenSchluessel(m.id, f.id)) ?? []).filter((e) => e.workstream === w.id)
    const ohneLage = elternZu && ZEILE_OFFEN.has(w.status)
    return neu(
      {
        schluessel: zeilenSchluessel('w', m.id, f.id, w.id),
        eltern,
        ebene,
        art: w.art,
        farbe: w.art,
        id: w.id,
        titel: w.titel || w.id,
        status: w.status,
        kategorie: statusKategorie(w.status),
        istAt: istZahl(w.ist) ? w.ist : null,
        schaetzung: w.schaetzung ?? null,
        notiz: typeof w.notiz === 'string' ? w.notiz : '',
        hinweise: ohneLage ? ['ohne_lage'] : [],
        spur: baueSpur(eigene, { istBand: w.status === 'erledigt', laeuft: w.status === 'laeuft', ohneLage }, achse),
        bezug: { meilenstein: m.id, feature: f.id, workstream: w.id },
      },
      sichtbar,
      null
    )
  }

  const featureZeile = (m, f, eltern, ebene, sichtbar) => {
    const workstreams = Array.isArray(f.workstreams) ? f.workstreams.filter((w) => w !== null && typeof w === 'object' && typeof w.id === 'string') : []
    const kategorie = statusKategorie(f.status)
    const geschlossen = ERLEDIGT_STATUS.has(f.status)
    const elternZu = geschlossen || m.status === ABGESCHLOSSEN
    const schluessel = zeilenSchluessel('f', m.id, f.id)
    const eigene = jeFeature.get(zeilenSchluessel(m.id, f.id)) ?? []
    const hinweise = []
    if (f.workstreams_fehlerhaft === true) hinweise.push('fehlerhaft')
    if (Array.isArray(f.planung_befunde) && f.planung_befunde.length > 0) hinweise.push('befunde')
    if (!geschlossen && m.status === ABGESCHLOSSEN) hinweise.push('ohne_lage')
    // Abgeschlossen, aber mit offenen Zeilen: schon an der Feature-Zeile sichtbar, nicht erst nach dem Aufklappen (qa 4).
    if (geschlossen && workstreams.some((w) => ZEILE_OFFEN.has(w.status))) hinweise.push('abweichung')
    const kinder =
      workstreams.length === 0
        ? null
        : (kinderSichtbar) => {
            const erledigt = geschlossen ? [] : workstreams.filter((w) => ZEILE_ERLEDIGT.has(w.status))
            const direkt = geschlossen ? workstreams : workstreams.filter((w) => !ZEILE_ERLEDIGT.has(w.status))
            if (erledigt.length > 0) {
              neu(
                {
                  schluessel: zeilenSchluessel('h', m.id, f.id),
                  eltern: schluessel,
                  ebene: ebene + 1,
                  art: 'gruppe',
                  farbe: 'workstream',
                  id: f.id,
                  titel: '',
                  status: 'erledigt',
                  kategorie: 'abgenommen',
                  anzahl: erledigt.length,
                  istAt: istSumme(erledigt),
                  spur: baueSpur([], { istBand: true }, achse),
                  bezug: { meilenstein: m.id, feature: f.id, workstream: null },
                },
                kinderSichtbar,
                (gruppeSichtbar) => {
                  for (const w of erledigt) workstreamZeile(m, f, w, zeilenSchluessel('h', m.id, f.id), ebene + 2, gruppeSichtbar, elternZu)
                }
              )
            }
            for (const w of direkt) workstreamZeile(m, f, w, schluessel, ebene + 1, kinderSichtbar, elternZu)
          }
    return neu(
      {
        schluessel,
        eltern,
        ebene,
        art: 'feature',
        farbe: 'feature',
        id: f.id,
        titel: typeof f.titel === 'string' && f.titel.trim() !== '' ? f.titel : f.id,
        status: f.status,
        kategorie,
        istAt: istSumme(workstreams),
        prioritaet: f.prioritaet ?? null,
        befunde: Array.isArray(f.planung_befunde) ? f.planung_befunde : [],
        befundeOffen: befundeAnFeature(f.id),
        hinweise,
        spur: baueSpur(eigene, { istBand: kategorie === 'abgenommen' || eigene.some((e) => istZahl(e.ist_ende_at)), laeuft: kategorie === 'in_arbeit', ohneLage: hinweise.includes('ohne_lage') }, achse),
        bezug: { meilenstein: m.id, feature: f.id, workstream: null },
      },
      sichtbar,
      kinder
    )
  }

  const meilensteinZeile = (m, sichtbar) => {
    const features = m.features.filter((f) => f !== null && typeof f === 'object' && typeof f.id === 'string')
    const schluessel = zeilenSchluessel('m', m.id)
    const abgeschlossen = m.status === ABGESCHLOSSEN
    const eigene = eintraege.filter((e) => e.meilenstein === m.id)
    const istAt = istSumme(features.flatMap((f) => (Array.isArray(f.workstreams) ? f.workstreams : [])))
    const befundeDirekt = befundeAnMeilenstein(m.id)
    return neu(
      {
        schluessel,
        eltern: null,
        ebene: 0,
        art: 'meilenstein',
        farbe: 'meilenstein',
        id: m.id,
        titel: typeof m.titel === 'string' && m.titel.trim() !== '' ? m.titel : m.id,
        status: m.status,
        kategorie: statusKategorie(m.status),
        istAt,
        aktuell: m === aktueller,
        zaehler: zaehleMeilenstein(m),
        befundeDirekt,
        befundeOffen: befundeDirekt === null ? null : features.reduce((summe, f) => summe + befundeAnFeature(f.id), befundeDirekt),
        // R1-Abweichung (abgeschlossen, aber ein Feature nicht): ein Fall der Bereinigungsliste, sichtbar an der Zeile (qa 4).
        hinweise: abgeschlossen && features.some((f) => f.status !== ABGESCHLOSSEN) ? ['abweichung'] : [],
        spur: baueSpur(eigene, { istBand: abgeschlossen || eigene.some((e) => istZahl(e.ist_ende_at)), laeuft: statusKategorie(m.status) === 'in_arbeit' }, achse),
        bezug: { meilenstein: m.id, feature: null, workstream: null },
      },
      sichtbar,
      features.length === 0
        ? null
        : (kinderSichtbar) => {
            const erledigt = abgeschlossen ? [] : features.filter((f) => f.status === ABGESCHLOSSEN)
            if (erledigt.length > 0) {
              neu(
                {
                  schluessel: zeilenSchluessel('g', m.id),
                  eltern: schluessel,
                  ebene: 1,
                  art: 'gruppe',
                  farbe: 'feature',
                  id: m.id,
                  titel: '',
                  status: ABGESCHLOSSEN,
                  kategorie: 'abgenommen',
                  anzahl: erledigt.length,
                  istAt: istSumme(erledigt.flatMap((f) => (Array.isArray(f.workstreams) ? f.workstreams : []))),
                  spur: baueSpur([], { istBand: true }, achse),
                  bezug: { meilenstein: m.id, feature: null, workstream: null },
                },
                kinderSichtbar,
                (gruppeSichtbar) => {
                  for (const f of erledigt) featureZeile(m, f, zeilenSchluessel('g', m.id), 2, gruppeSichtbar)
                }
              )
            }
            for (const f of abgeschlossen ? features : features.filter((x) => x.status !== ABGESCHLOSSEN)) featureZeile(m, f, schluessel, 1, kinderSichtbar)
          }
    )
  }

  const offen = [...(aktueller === null ? [] : [aktueller]), ...meilensteine.filter((m) => m !== aktueller && m.status !== ABGESCHLOSSEN)]
  const abgeschlossen = meilensteine.filter((m) => m !== aktueller && m.status === ABGESCHLOSSEN)
  for (const m of offen) meilensteinZeile(m, true)
  if (zuordnung !== null) pflegeZeile(zuordnung.pflege, neu, achse)
  const grenze = zeilen.length
  for (const m of abgeschlossen) meilensteinZeile(m, zustand.abgeschlosseneSichtbar === true)
  // „danach“: die nächste Zeile derselben Elternzeile (Gruppen übersprungen), wie im Design-Detail.
  const geschwister = new Map()
  for (const z of zeilen) {
    if (z.art === 'gruppe' || z.art === 'pflege' || z.art === 'befund') continue
    if (!geschwister.has(z.eltern)) geschwister.set(z.eltern, [])
    geschwister.get(z.eltern).push(z)
  }
  // Meilensteine stehen in der Anzeige umsortiert (aktueller oben); „danach“ folgt der Roadmap-Reihenfolge.
  geschwister.get(null)?.sort((a, b) => meilensteine.findIndex((m) => m.id === a.id) - meilensteine.findIndex((m) => m.id === b.id))
  for (const liste of geschwister.values()) liste.forEach((z, i) => (z.danach = liste[i + 1] ?? null))
  const zaehler = zaehleRoadmap({ status: 'ok', meilensteine: abgeschlossen })
  // Befunde an abgeschlossenen Meilensteinen bleiben dort; die Trennzeile nennt ihre Summe — nur mit Zuordnung (Advisor B3).
  const befunde = zuordnung === null ? null : zeilen.slice(grenze).filter((z) => z.art === 'meilenstein').reduce((summe, z) => summe + z.befundeOffen, 0)
  return {
    oben: zeilen.slice(0, grenze),
    unten: zeilen.slice(grenze),
    trenner: abgeschlossen.length === 0 ? null : { anzahl: abgeschlossen.length, ...zaehler, ...(befunde === null ? {} : { befunde }) },
    standardOffen,
  }
}

/**
 * Hängt die Zeile „Pflege & Fixes“ samt ihrer Befund-Zeilen an (Teil von ganttZeilen). Leere Spur — Befunde tragen keine Schätzung;
 * bei 0 Befunden nicht aufklappbar. bezug ist überall null (Advisor B1: gewaehlteZeile, Detailpanel und featureZeileVon lesen ihn).
 * @param befunde - zuordnung.pflege (sortiert P0 → P2, dann Quelle)
 * @param neu - Zeilenbauer aus ganttZeilen
 * @param achse - aus baueAchse
 */
function pflegeZeile(befunde, neu, achse) {
  const bezug = { meilenstein: null, feature: null, workstream: null }
  const schluessel = zeilenSchluessel('p')
  const sichtbare = befunde.slice(0, PFLEGE_MAX)
  const basis = { schluessel, eltern: null, ebene: 0, art: 'pflege', farbe: 'pflege', id: '', titel: '', status: 'geplant', kategorie: 'geplant' }
  neu(
    { ...basis, anzahl: befunde.length, weitere: befunde.length - sichtbare.length, spur: baueSpur([], {}, achse), bezug },
    true,
    befunde.length === 0
      ? null
      : (kinderSichtbar) => {
          for (const w of sichtbare) {
            const id = String(w.id ?? '')
            neu(
              {
                schluessel: zeilenSchluessel('b', id),
                eltern: schluessel,
                ebene: 1,
                art: 'befund',
                farbe: w.typ === 'BUG' ? 'bug' : 'befund',
                id,
                titel: typeof w.titel === 'string' && w.titel.trim() !== '' ? w.titel : id,
                status: 'geplant',
                kategorie: 'geplant',
                typ: w.typ ?? null,
                prioritaet: w.prioritaet ?? null,
                spur: baueSpur([], {}, achse),
                bezug,
              },
              kinderSichtbar,
              null
            )
          }
        }
  )
}

/**
 * Schlüssel aller aufklappbaren Zeilen unter den sichtbaren Meilensteinen („Alles aufklappen“) — aus einer schon gebauten Lage,
 * ohne ganttZeilen erneut zu rechnen (Prüfpass cr 11).
 * @param lage - Ergebnis von ganttZeilen
 * @param abgeschlosseneSichtbar - ob die abgeschlossenen Meilensteine eingeblendet sind
 * @returns Liste der Schlüssel
 */
export function aufklappbareSchluessel(lage, abgeschlosseneSichtbar) {
  return [...lage.oben, ...(abgeschlosseneSichtbar ? lage.unten : [])].filter((z) => z.hatKinder).map((z) => z.schluessel)
}

/**
 * Die gewählte Zeile, nur unter den sichtbaren (Prüfpass dg 1/qa 5): ist die Wahl eingeklappt, gilt die nächste sichtbare
 * Elternzeile (Gruppen übersprungen); ohne gültige Wahl das erste Feature „in Arbeit“ des aktuellen Meilensteins, sonst der
 * aktuelle Meilenstein, sonst die erste sichtbare Zeile.
 * @param roadmap - Antwort von GET …/roadmap
 * @param lage - Ergebnis von ganttZeilen
 * @param auswahl - Zeilenschlüssel oder null
 * @returns Zeile oder null, wenn keine Zeile sichtbar ist
 */
export function gewaehlteZeile(roadmap, lage, auswahl) {
  const alle = [...lage.oben, ...lage.unten]
  const jeSchluessel = new Map(alle.map((z) => [z.schluessel, z]))
  let zeile = auswahl === null ? null : (jeSchluessel.get(auswahl) ?? null)
  while (zeile !== null && (!zeile.sichtbar || zeile.art === 'gruppe')) zeile = zeile.eltern === null ? null : (jeSchluessel.get(zeile.eltern) ?? null)
  if (zeile !== null) return zeile
  const sichtbar = alle.filter((z) => z.sichtbar && z.art !== 'gruppe')
  const aktueller = aktuellerMeilenstein(roadmap)
  const imAktuellen = sichtbar.filter((z) => aktueller !== null && z.bezug.meilenstein === aktueller.id)
  return imAktuellen.find((z) => z.art === 'feature' && z.kategorie === 'in_arbeit') ?? imAktuellen.find((z) => z.art === 'meilenstein') ?? sichtbar[0] ?? null
}

/**
 * „Features x / y abgenommen“ aus kennzahlen.features_abgenommen der Projektion (ohne ABGEBROCHEN, Challenger 24.10.2026);
 * fehlt das Feld (älterer Server), zählt zaehleRoadmap (Prüfpass cr 3/qa 3).
 * @param roadmap - Antwort von GET …/roadmap
 * @returns { abgenommen, gesamt }
 */
export function featuresAbgenommen(roadmap) {
  const wert = roadmapZustand(roadmap) === 'ok' ? roadmap.kennzahlen?.features_abgenommen : null
  return wert !== null && typeof wert === 'object' && istZahl(wert.abgenommen) && istZahl(wert.gesamt) ? { abgenommen: wert.abgenommen, gesamt: wert.gesamt } : zaehleRoadmap(roadmap)
}

/**
 * R5 „Bis <M> fertig“ eines Meilensteins aus kennzahlen.bis_fertig.
 * @param roadmap - Antwort von GET …/roadmap
 * @param meilensteinId - ID oder null
 * @returns { berechenbar, min, max, ohne_schaetzung } oder null (kein Meilenstein, Feld fehlt oder kaputt)
 */
export function bisFertig(roadmap, meilensteinId) {
  const liste = roadmapZustand(roadmap) === 'ok' ? roadmap.kennzahlen?.bis_fertig : null
  if (!Array.isArray(liste) || meilensteinId === null) return null
  const eintrag = liste.find((e) => e?.meilenstein === meilensteinId) ?? null
  if (eintrag === null || typeof eintrag.berechenbar !== 'boolean' || !istZahl(eintrag.ohne_schaetzung)) return null
  if (eintrag.berechenbar && !(istZahl(eintrag.min) && istZahl(eintrag.max))) return null
  return { berechenbar: eintrag.berechenbar, min: eintrag.min ?? null, max: eintrag.max ?? null, ohne_schaetzung: eintrag.ohne_schaetzung }
}

/**
 * „Plan gegen Ist“ (Plan v2 Nr. 4): Ist gegen die Plan-Spanne der erledigten Zeilen mit Schätzung und Ist. Über plan_max →
 * „ueber“ mit +%, unter plan_min → „unter“ mit −%, dazwischen „im_plan“; ohne Bezugsgröße (0) keine Prozentzahl.
 * @param roadmap - Antwort von GET …/roadmap
 * @returns { zustand: 'leer' | 'im_plan' | 'ueber' | 'unter', prozent: Zahl oder null, anzahl, plan_min, plan_max, ist } oder null (Feld fehlt oder kaputt)
 */
export function planGegenIst(roadmap) {
  const p = roadmapZustand(roadmap) === 'ok' ? roadmap.kennzahlen?.plan_gegen_ist : null
  if (p === null || typeof p !== 'object' || ![p.anzahl, p.plan_min, p.plan_max, p.ist].every(istZahl)) return null
  const basis = { anzahl: p.anzahl, plan_min: p.plan_min, plan_max: p.plan_max, ist: p.ist }
  if (p.anzahl === 0) return { zustand: 'leer', prozent: null, ...basis }
  // Mindestens 1 %: knapp neben der Spanne nie „0 % über Plan“ (Prüfpass cr 10).
  if (p.ist > p.plan_max) return { zustand: 'ueber', prozent: p.plan_max > 0 ? Math.max(1, Math.round((p.ist / p.plan_max - 1) * 100)) : null, ...basis }
  if (p.ist < p.plan_min) return { zustand: 'unter', prozent: Math.min(-1, Math.round((p.ist / p.plan_min - 1) * 100)), ...basis }
  return { zustand: 'im_plan', prozent: 0, ...basis }
}
