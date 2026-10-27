/**
 * Datei: src/workboard/roadmap-planung.ts
 *
 * Zweck: Zeitachse und Kennzahlen der Roadmap aus den Planungsdaten der Akten — F45 B5b-1a (features/F45/plan-b5b1-v2.md;
 * fixpaket-f45.md §2 R2, R4, R5; F-944). Reine Funktionen mit `heute` als Parameter; die Anzeige baut B5b-2.
 *
 * Regeln:
 * - Offen ist eine Workstream-Zeile mit Status geplant/laeuft eines Features, das nicht ABGESCHLOSSEN/ABGEBROCHEN ist und
 *   nicht in einem ABGESCHLOSSEN-Meilenstein steht (eine R1-Abweichung dort ist ein Datenfall der Bereinigungsliste, keine
 *   offene Arbeit — sonst machten F18/F20/F21/F22/F25 jede Prognose unberechenbar). Ein
 *   solches Feature ohne strengen Abschnitt (null) oder mit leerer Tabelle ([]) zählt als EIN offener Eintrag ohne Schätzung
 *   (Advisor B5) — sonst wäre „Bis M5 fertig“ fälschlich berechenbar.
 * - Reihenfolge = Roadmap (Meilenstein, Feature, Tabellenzeile). Mit Schätzung: start_at = Σ min davor, ende_min_at = start +
 *   min, ende_max_at = Σ max bis einschließlich. Ohne Schätzung: nur fruehestens_ab_at = Σ min davor — nie eine Länge (R4).
 *   Einträge hinter einem Eintrag ohne Schätzung tragen nach_unbekannt (Advisor C3).
 * - Ist-Zone: erledigte Zeilen mit Abgenommen; ist_ende_at = −Arbeitstage (Mo–Fr) von Abgenommen bis heute, ist_start_at aus
 *   Begonnen, sonst ende − Ist AT, sonst nur ein Punkt (ist_start_at = ist_ende_at).
 * - Eine Tabelle mit Formfehlern (workstreams_fehlerhaft) trägt zusätzlich einen Eintrag ohne Schätzung (qa 1).
 * - Kennzahlen: R2 Meilensteine abgeschlossen/gesamt nach dem Status in roadmap.json, dazu mit_abweichung (abgeschlossen,
 *   aber ein Feature laut Akte nicht ABGESCHLOSSEN — offene Bereinigung, qa 2); Features abgenommen/gesamt gegen die Akten
 *   (Aktenstatus ABGESCHLOSSEN; jede Roadmap-Zeile zählt in gesamt, auch Meilensteine wie F19-bridge oder
 *   V1-Backlog — nur Features mit Status ABGEBROCHEN nicht, Entscheidung Challenger 24.10.2026, F45 B5b-1b-1); R5 bis_fertig je nicht abgeschlossenem Meilenstein (kumuliert, nicht berechenbar sobald ein offener Eintrag
 *   ohne Schätzung ist, dann mit Anzahl); plan_gegen_ist über erledigte Zeilen mit Schätzung und Ist.
 *
 * Wird aufgerufen von: scripts/leitstand/routen-roadmap.mjs, scripts/check-f45-b5b1a-planung.mjs,
 * src/workboard/roadmap-planung.test.ts, src/feature-auftrag/ist-nach-abnahme.ts (arbeitstageBis, F45 B5b-3 R7).
 *
 * Wichtig — bekannte Grenzen (DEKLARIERT): Summen werden auf zwei Nachkommastellen gerundet; Feiertage kennt die
 * Arbeitstag-Rechnung nicht. Eine Zeile laeuft zählt mit der vollen Schätzung (der Rest ist unbekannt, R7/B5b-3). Ein offenes
 * Feature, dessen Tabelle nur erledigte/verworfene Zeilen trägt, hat 0 Rest (anders als eine leere Tabelle). Eine Sammelzeile
 * neben ihren Teilpaketen (F45 B2b) zählt doppelt, sobald sie ein Ist trägt — Sammelzeilen tragen kein Ist. Ein Datum in der
 * Zukunft legt die Ist-Zone rechts von heute (der Leser prüft es nicht). heuteIso ist ein Zwilling von lokalesDatum in
 * scripts/leitstand/routen-f35.mjs (src/ importiert nie aus scripts/).
 */

import type { WorkstreamEintrag } from './feature-planung.ts'

/** Ein Feature, wie die Projektion es übergibt. */
export interface PlanungFeature {
  id: string
  /** Aktenstatus, 'keine_akte' oder 'UNBEKANNT' */
  status: string
  workstreams: WorkstreamEintrag[] | null
  /** true, wenn die Tabelle Formfehler trägt (lesePlanung) — dann ein zusätzlicher Eintrag ohne Schätzung */
  workstreams_fehlerhaft?: boolean
}

/** Ein Meilenstein, wie die Projektion es übergibt. */
export interface PlanungMeilenstein {
  id: string
  status: string
  features: PlanungFeature[]
}

/** Ein Eintrag der Zeitachse. */
export interface ZeitachsenEintrag {
  meilenstein: string
  feature: string
  /** null = das Feature selbst (ohne Workstream-Daten) */
  workstream: string | null
  status: string
  /** offen: frühester Beginn (Σ min davor) */
  start_at?: number
  ende_min_at?: number
  ende_max_at?: number
  /** offen ohne Schätzung: „Schätzung fehlt · frühestens ab AT x“ — keine Länge */
  fruehestens_ab_at?: number
  schaetzung_fehlt: boolean
  /** hinter einem Eintrag ohne Schätzung: Lage nur „frühestens“ */
  nach_unbekannt: boolean
  /** erledigt: Ist-Zone links von heute (≤ 0) */
  ist_start_at?: number
  ist_ende_at?: number
}

/** R5: Restaufwand bis einschließlich eines Meilensteins (kumuliert über die Roadmap-Reihenfolge). */
export interface BisFertig {
  meilenstein: string
  berechenbar: boolean
  min: number | null
  max: number | null
  ohne_schaetzung: number
}

/** Ein erledigter Eintrag mit Schätzung und Ist. */
export interface PlanGegenIstEintrag {
  feature: string
  workstream: string
  plan: { min: number; max: number }
  ist: number
}

/** Kennzahlen R2 und R5. meilensteine.mit_abweichung = abgeschlossene Meilensteine mit einem Feature ≠ ABGESCHLOSSEN (offene Bereinigung, qa 2). */
export interface Kennzahlen {
  meilensteine: { abgeschlossen: number; gesamt: number; mit_abweichung: number }
  features_abgenommen: { abgenommen: number; gesamt: number }
  bis_fertig: BisFertig[]
  plan_gegen_ist: { anzahl: number; plan_min: number; plan_max: number; ist: number; eintraege: PlanGegenIstEintrag[] }
}

const FEATURE_GESCHLOSSEN = new Set(['ABGESCHLOSSEN', 'ABGEBROCHEN'])
const OFFEN = new Set(['geplant', 'laeuft'])

/** Rundet auf zwei Nachkommastellen. @param zahl - Wert @returns gerundeter Wert */
function runde(zahl: number): number {
  return Math.round(zahl * 100) / 100
}

/**
 * Arbeitstage (Mo–Fr) von einem Datum bis heute, ohne den Starttag: Freitag → Montag = 1. Liegt das Datum nach heute, negativ.
 * @param datum - ISO-Datum JJJJ-MM-TT
 * @param heute - ISO-Datum JJJJ-MM-TT
 * @returns Anzahl Arbeitstage
 */
export function arbeitstageBis(datum: string, heute: string): number {
  // Tage seit 1970 über Date.parse (kein Date.UTC: das legte die Jahre 0–99 auf 1900+); O(1) über volle Wochen (code-reviewer H4).
  const tag = (iso: string) => Math.round(Date.parse(`${iso}T00:00:00Z`) / 86400000)
  const von = tag(datum)
  const bis = tag(heute)
  if (Number.isNaN(von) || Number.isNaN(bis)) return 0
  const [frueh, spaet] = von <= bis ? [von, bis] : [bis, von]
  const tage = spaet - frueh
  // 1970-01-01 war ein Donnerstag: Wochentag (0 = Sonntag) = (tag + 4) mod 7.
  let zaehler = Math.floor(tage / 7) * 5
  for (let t = frueh + Math.floor(tage / 7) * 7 + 1; t <= spaet; t++) {
    const wochentag = (((t + 4) % 7) + 7) % 7
    if (wochentag !== 0 && wochentag !== 6) zaehler += 1
  }
  return von <= bis ? zaehler : -zaehler
}

/**
 * Lokales Datum JJJJ-MM-TT.
 * @param jetzt - Zeitpunkt
 * @returns ISO-Datum
 */
export function heuteIso(jetzt: Date = new Date()): string {
  const zwei = (zahl: number) => String(zahl).padStart(2, '0')
  return `${jetzt.getFullYear()}-${zwei(jetzt.getMonth() + 1)}-${zwei(jetzt.getDate())}`
}

/**
 * Offene Einträge eines Features in Tabellenreihenfolge (Regeln im Dateikopf).
 * @param meilenstein - Meilenstein des Features
 * @param feature - Feature
 * @returns Einträge mit Schätzung oder null
 */
function offeneEintraege(meilenstein: PlanungMeilenstein, feature: PlanungFeature): { workstream: string | null; status: string; schaetzung: { min: number; max: number } | null }[] {
  if (meilenstein.status === 'ABGESCHLOSSEN' || FEATURE_GESCHLOSSEN.has(feature.status)) return []
  if (feature.workstreams === null || feature.workstreams.length === 0) return [{ workstream: null, status: feature.status, schaetzung: null }]
  const offen = feature.workstreams.filter((w) => OFFEN.has(w.status)).map((w) => ({ workstream: w.id as string | null, status: w.status as string, schaetzung: w.schaetzung }))
  // qa 1: fehlerhafte Zeilen fehlen in workstreams — das Feature trägt dann zusätzlich einen Eintrag ohne Schätzung, damit
  // die Prognose nicht still kürzer wird.
  return feature.workstreams_fehlerhaft === true ? [...offen, { workstream: null, status: feature.status, schaetzung: null }] : offen
}

/**
 * Baut die Zeitachse in Arbeitstagen ab heute.
 * @param meilensteine - Roadmap in Reihenfolge, je Feature Status und Workstreams
 * @param heute - ISO-Datum
 * @returns Einträge (offen und Ist-Zone)
 */
export function baueZeitachse(meilensteine: PlanungMeilenstein[], heute: string): ZeitachsenEintrag[] {
  const eintraege: ZeitachsenEintrag[] = []
  let summeMin = 0
  let summeMax = 0
  let unbekanntDavor = false
  for (const meilenstein of meilensteine) {
    for (const feature of meilenstein.features) {
      for (const w of feature.workstreams ?? []) {
        if (w.status !== 'erledigt' || w.abgenommen === null) continue
        // `|| 0`: −0 (Abnahme am Wochenende vor heute) als 0 ausgeben.
        const ende = -arbeitstageBis(w.abgenommen, heute) || 0
        const start = w.begonnen !== null ? -arbeitstageBis(w.begonnen, heute) || 0 : w.ist !== null ? runde(ende - w.ist) : ende
        eintraege.push({ meilenstein: meilenstein.id, feature: feature.id, workstream: w.id, status: w.status, schaetzung_fehlt: w.schaetzung === null, nach_unbekannt: false, ist_start_at: start, ist_ende_at: ende })
      }
      for (const offen of offeneEintraege(meilenstein, feature)) {
        const basis = { meilenstein: meilenstein.id, feature: feature.id, workstream: offen.workstream, status: offen.status, nach_unbekannt: unbekanntDavor }
        if (offen.schaetzung === null) {
          eintraege.push({ ...basis, schaetzung_fehlt: true, fruehestens_ab_at: runde(summeMin) })
          unbekanntDavor = true
          continue
        }
        const start = runde(summeMin)
        summeMin += offen.schaetzung.min
        summeMax += offen.schaetzung.max
        eintraege.push({ ...basis, schaetzung_fehlt: false, start_at: start, ende_min_at: runde(summeMin), ende_max_at: runde(summeMax) })
      }
    }
  }
  return eintraege
}

/**
 * Berechnet die Kennzahlen R2 und R5.
 * @param meilensteine - Roadmap in Reihenfolge
 * @returns Kennzahlen
 */
export function berechneKennzahlen(meilensteine: PlanungMeilenstein[]): Kennzahlen {
  const features = meilensteine.flatMap((m) => m.features)
  const bisFertig: BisFertig[] = []
  let summeMin = 0
  let summeMax = 0
  let ohneSchaetzung = 0
  for (const meilenstein of meilensteine) {
    for (const feature of meilenstein.features) {
      for (const offen of offeneEintraege(meilenstein, feature)) {
        if (offen.schaetzung === null) ohneSchaetzung += 1
        else {
          summeMin += offen.schaetzung.min
          summeMax += offen.schaetzung.max
        }
      }
    }
    if (meilenstein.status === 'ABGESCHLOSSEN') continue
    const berechenbar = ohneSchaetzung === 0
    bisFertig.push({ meilenstein: meilenstein.id, berechenbar, min: berechenbar ? runde(summeMin) : null, max: berechenbar ? runde(summeMax) : null, ohne_schaetzung: ohneSchaetzung })
  }
  const planGegenIst: PlanGegenIstEintrag[] = []
  for (const feature of features) {
    for (const w of feature.workstreams ?? []) {
      if (w.status === 'erledigt' && w.schaetzung !== null && w.ist !== null) planGegenIst.push({ feature: feature.id, workstream: w.id, plan: w.schaetzung, ist: w.ist })
    }
  }
  return {
    meilensteine: {
      abgeschlossen: meilensteine.filter((m) => m.status === 'ABGESCHLOSSEN').length,
      gesamt: meilensteine.length,
      mit_abweichung: meilensteine.filter((m) => m.status === 'ABGESCHLOSSEN' && m.features.some((f) => f.status !== 'ABGESCHLOSSEN')).length,
    },
    features_abgenommen: { abgenommen: features.filter((f) => f.status === 'ABGESCHLOSSEN').length, gesamt: features.filter((f) => f.status !== 'ABGEBROCHEN').length },
    bis_fertig: bisFertig,
    plan_gegen_ist: {
      anzahl: planGegenIst.length,
      plan_min: runde(planGegenIst.reduce((s, e) => s + e.plan.min, 0)),
      plan_max: runde(planGegenIst.reduce((s, e) => s + e.plan.max, 0)),
      ist: runde(planGegenIst.reduce((s, e) => s + e.ist, 0)),
      eintraege: planGegenIst,
    },
  }
}
