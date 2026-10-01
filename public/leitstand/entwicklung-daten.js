/**
 * Datei: public/leitstand/entwicklung-daten.js
 *
 * Zweck: Reine Regeln der Seite „Entwicklung“ (F44 WS-3a, Abgleich F-725 E1, E4, E5; Vorlage
 * d_arbeit_board.png). baueBoard ordnet die Workitems den vier Spalten des Status-Kanbans zu
 * (Geplant · In Arbeit · Braucht dich · Abgenommen), begrenzt und sortiert die Karten je Spalte;
 * sucheWorkitems ist die clientseitige Suche der Listen. Kein DOM, kein I/O.
 *
 * Zuordnung in dieser Prüfreihenfolge (die erste zutreffende Zeile gewinnt):
 *   a) abgenommen:   Feature ABGESCHLOSSEN, Finding ERLEDIGT.
 *   b) braucht_dich: Feature FEATURE_GATE oder BLOCKIERT, oder ein verknüpfter Workflow wartet auf
 *                    den Menschen (filtereAttentionWorkflows aus attention-daten.js — keine zweite
 *                    Regel).
 *   c) in_arbeit:    Feature IN_ARBEIT oder WORKSTREAM_SCHNITT_GENEHMIGT, oder ein verknüpfter
 *                    Workflow ist nicht terminal.
 *   d) geplant:      Feature ENTWURF oder READY_FOR_TECH, Finding OFFEN.
 *   e) ausserhalb:   alles andere (ABGEBROCHEN, SONSTIGES, unbekannt) — nur als Zahl.
 * Weil die Zeilen der Reihe nach gelten, landet auch ein Feature ABGEBROCHEN oder ein Finding
 * SONSTIGES mit verknüpftem, wartendem bzw. laufendem Workflow unter „Braucht dich“ bzw. „In
 * Arbeit“ (bewusst: dort läuft real noch etwas), ein abgenommenes nie.
 *
 * Verknüpfung Workitem ↔ Workflow: workflow.auftragId → Auftrag (GET …/auftraege) →
 * auftrag.workitem_referenz === `workitem:<quelle>:<id>` (die Referenzzeile, die Click-to-Work und
 * „Bauen“ in den Auftragstext schreiben; scripts/leitstand-server.mjs leseWorkitemReferenz).
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/workboard.js (Board, Listen-Tabs, Suche)
 * - public/leitstand/entwicklung-daten.test.mjs (node:test)
 *
 * Wichtig:
 * - Import-sicher: kein Zugriff auf DOM oder Storage beim Import.
 * - Sortierung je Spalte: Priorität P0 → P4; Feature-Akten tragen keine Priorität und stehen wie
 *   in GET …/workitems (src/workboard/index.ts, FEATURE_RANG) hinter allen priorisierten Findings.
 *   Bei gleicher Stufe gehen Features vor Findings, sonst gilt die Quellreihenfolge.
 */

import { filtereAttentionWorkflows } from './attention-daten.js'

/** Die vier Spalten des Status-Kanbans in Anzeigereihenfolge. */
export const SPALTEN = ['geplant', 'in_arbeit', 'braucht_dich', 'abgenommen']

/** Höchstens so viele Karten je Spalte; der Rest erscheint als Zahl „weitere“. */
export const KARTEN_JE_SPALTE = 12

/** Listen-Tabs und ihre Workitem-Typen (E4, E5: „Weitere“ = TECH_DEBT und PROCESS_IMPROVEMENT). */
export const LISTEN_TABS = Object.freeze({
  features: Object.freeze(['FEATURE']),
  bugs: Object.freeze(['BUG']),
  harness: Object.freeze(['HARNESS_IMPROVEMENT']),
  weitere: Object.freeze(['TECH_DEBT', 'PROCESS_IMPROVEMENT']),
})

/**
 * Workflow-Status, aus denen ein Workflow noch fortgesetzt werden kann — übernommen aus
 * src/workflow/index.ts (FORTSETZBARE_WORKFLOW_STATUS). ABGESCHLOSSEN und GESTOPPT fehlen dort
 * absichtlich (terminal); als Allowlist fällt ein künftiger, unbekannter Status nicht stillschweigend
 * in „in Arbeit“.
 */
const NICHT_TERMINALE_WORKFLOW_STATUS = new Set(['OFFEN', 'WARTET_FREIGABE', 'LAEUFT', 'KLAERUNG_ERFORDERLICH'])

/** Feature-Status je Spaltenregel (gueltigeStatusWerte, src/workboard/feature-status.ts). */
const FEATURE_ABGENOMMEN = new Set(['ABGESCHLOSSEN'])
const FEATURE_BRAUCHT_DICH = new Set(['FEATURE_GATE', 'BLOCKIERT'])
const FEATURE_IN_ARBEIT = new Set(['IN_ARBEIT', 'WORKSTREAM_SCHNITT_GENEHMIGT'])
const FEATURE_GEPLANT = new Set(['ENTWURF', 'READY_FOR_TECH'])

/** Rang je Priorität; ohne Priorität (Feature-Akten) dahinter. */
const PRIORITAETS_RANG = { P0: 0, P1: 1, P2: 2, P3: 3, P4: 4 }
const RANG_OHNE_PRIORITAET = 5

/**
 * Der Listen-Tab eines Workitem-Typs.
 * @param typ - workitem.typ
 * @returns 'features' | 'bugs' | 'harness' | 'weitere', oder null für einen unbekannten Typ
 */
export function tabFuerTyp(typ) {
  for (const [tab, typen] of Object.entries(LISTEN_TABS)) if (typen.includes(typ)) return tab
  return null
}

/**
 * Die Referenzzeile eines Workitems, wie sie im Auftragstext steht.
 * @param workitem - { quelle, id }
 * @returns `workitem:<quelle>:<id>`
 */
export function workitemReferenz(workitem) {
  return `workitem:${workitem.quelle}:${workitem.id}`
}

/**
 * Ordnet jeder Workitem-Referenz ihre Workflows zu (über den Auftrag).
 * @param workflows - zustand.workflows (null bei defekter Quelle, undefined vor dem ersten Tick)
 * @param auftraege - GET …/auftraege (null bei Fehler, undefined solange er lädt)
 * @returns { jeReferenz: Map<Referenz, Workflow[]>, fehlend: nicht verfügbare Quellen (null), laedt: noch ladende Quellen (undefined) — je 'workflows' bzw. 'auftraege' }
 */
export function baueVerknuepfung(workflows, auftraege) {
  const fehlend = []
  const laedt = []
  for (const [name, quelle] of [
    ['workflows', workflows],
    ['auftraege', auftraege],
  ]) {
    if (quelle === undefined) laedt.push(name)
    else if (!Array.isArray(quelle)) fehlend.push(name)
  }
  const jeReferenz = new Map()
  if (fehlend.length > 0 || laedt.length > 0) return { jeReferenz, fehlend, laedt }
  const referenzJeAuftrag = new Map()
  for (const auftrag of auftraege) {
    if (typeof auftrag?.auftragId === 'string' && typeof auftrag.workitem_referenz === 'string') referenzJeAuftrag.set(auftrag.auftragId, auftrag.workitem_referenz)
  }
  for (const workflow of workflows) {
    const referenz = referenzJeAuftrag.get(workflow?.auftragId)
    if (referenz === undefined) continue
    const liste = jeReferenz.get(referenz) ?? []
    liste.push(workflow)
    jeReferenz.set(referenz, liste)
  }
  return { jeReferenz, fehlend, laedt }
}

/**
 * Die Spalte eines Workitems nach der Regel im Dateikopf.
 * @param workitem - Finding oder Feature-Akte aus GET …/workitems
 * @param verknuepfung - Ergebnis von baueVerknuepfung (ohne: keine Workflow-Regeln)
 * @returns 'geplant' | 'in_arbeit' | 'braucht_dich' | 'abgenommen' | 'ausserhalb'
 */
export function spalteVon(workitem, verknuepfung) {
  const istFeature = workitem?.quelle === 'feature'
  const istFinding = workitem?.quelle === 'finding'
  const status = workitem?.status
  const workflows = verknuepfung?.jeReferenz.get(workitemReferenz(workitem)) ?? []

  if ((istFeature && FEATURE_ABGENOMMEN.has(status)) || (istFinding && status === 'ERLEDIGT')) return 'abgenommen'
  if ((istFeature && FEATURE_BRAUCHT_DICH.has(status)) || filtereAttentionWorkflows(workflows).length > 0) return 'braucht_dich'
  if ((istFeature && FEATURE_IN_ARBEIT.has(status)) || workflows.some((w) => NICHT_TERMINALE_WORKFLOW_STATUS.has(w?.status))) return 'in_arbeit'
  if ((istFeature && FEATURE_GEPLANT.has(status)) || (istFinding && status === 'OFFEN')) return 'geplant'
  return 'ausserhalb'
}

/**
 * Sortierschlüssel einer Karte: Priorität, dann Feature vor Finding.
 * @param workitem - ein Workitem
 * @returns [Prioritätsrang, Quellrang]
 */
function rang(workitem) {
  const prioritaet = Object.hasOwn(PRIORITAETS_RANG, workitem.prioritaet) ? PRIORITAETS_RANG[workitem.prioritaet] : RANG_OHNE_PRIORITAET
  return [prioritaet, workitem.quelle === 'feature' ? 0 : 1]
}

/**
 * Baut das Status-Kanban.
 * @param workitems - GET …/workitems ungefiltert (null bei defekter Quelle, undefined solange er lädt)
 * @param workflows - zustand.workflows aus dem Poll
 * @param auftraege - GET …/auftraege
 * @returns null ohne Workitem-Liste; sonst { spalten: je Spalte { karten (höchstens KARTEN_JE_SPALTE), anzahl, weitere, weitereJeTab: [{ tab, anzahl }] }, ausserhalb: Anzahl, fehlend: nicht verfügbare Verknüpfungsquellen, laedt: noch ladende — solange eine fehlt oder lädt, stehen die Karten nur nach ihrem Status }
 */
export function baueBoard(workitems, workflows, auftraege) {
  if (!Array.isArray(workitems)) return null
  const verknuepfung = baueVerknuepfung(workflows, auftraege)
  const jeSpalte = Object.fromEntries(SPALTEN.map((spalte) => [spalte, []]))
  let ausserhalb = 0
  workitems.forEach((workitem, index) => {
    const spalte = spalteVon(workitem, verknuepfung)
    if (spalte === 'ausserhalb') ausserhalb++
    else jeSpalte[spalte].push({ workitem, index })
  })

  const spalten = {}
  for (const spalte of SPALTEN) {
    const sortiert = jeSpalte[spalte]
      .sort((a, b) => {
        const [pa, qa] = rang(a.workitem)
        const [pb, qb] = rang(b.workitem)
        return pa - pb || qa - qb || a.index - b.index
      })
      .map(({ workitem }) => workitem)
    const karten = sortiert.slice(0, KARTEN_JE_SPALTE)
    const rest = sortiert.slice(KARTEN_JE_SPALTE)
    const zaehlerJeTab = new Map()
    for (const workitem of rest) {
      const tab = tabFuerTyp(workitem.typ)
      if (tab !== null) zaehlerJeTab.set(tab, (zaehlerJeTab.get(tab) ?? 0) + 1)
    }
    spalten[spalte] = {
      karten,
      anzahl: sortiert.length,
      weitere: rest.length,
      weitereJeTab: Object.keys(LISTEN_TABS)
        .filter((tab) => zaehlerJeTab.has(tab))
        .map((tab) => ({ tab, anzahl: zaehlerJeTab.get(tab) })),
    }
  }
  return { spalten, ausserhalb, fehlend: verknuepfung.fehlend, laedt: verknuepfung.laedt }
}

/**
 * Clientseitige Suche der Listen über id und titel, ohne Groß-/Kleinschreibung.
 * @param liste - Workitems (null/undefined → leere Liste)
 * @param text - Suchtext; leer oder nur Leerzeichen → die Liste unverändert
 * @returns die passenden Workitems in Quellreihenfolge
 */
export function sucheWorkitems(liste, text) {
  if (!Array.isArray(liste)) return []
  const suche = typeof text === 'string' ? text.trim().toLowerCase() : ''
  if (suche === '') return liste
  return liste.filter((w) => `${w?.id ?? ''}\n${w?.titel ?? ''}`.toLowerCase().includes(suche))
}
