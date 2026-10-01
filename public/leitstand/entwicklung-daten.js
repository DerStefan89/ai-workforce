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
 * - public/leitstand/views/workboard.js (Board, Listen-Tabs, Suche, Detail)
 * - public/leitstand/entwicklung-daten.test.mjs (node:test)
 *
 * Wichtig:
 * - Import-sicher: kein Zugriff auf DOM oder Storage beim Import.
 * - Sortierung je Spalte (F-919, F44 WS-3b): P0, P1, Feature-Akten, P2, P3, P4, Findings ohne
 *   gültige Priorität; innerhalb einer Stufe die Quellreihenfolge. Feature-Akten tragen keine
 *   Priorität (src/workboard/types.ts); früher standen sie hinter allen Findings und gingen bei
 *   vielen offenen Befunden unter. „Abgenommen“ sortiert ebenso (Erledigungsdatum offen, F-915).
 * - F44 WS-3b: verknuepfterWorkflow und workflowPhase (Phase auf der Karte und im Detail, F-921)
 *   sowie schrittFortschritt (x/y im Detail). „Wartet auf den Menschen“ kommt auch hier aus
 *   attention-daten.js (baueEntscheidungen), keine eigene Regel (Gate f21-ws2 (h)).
 */

import { baueEntscheidungen, filtereAttentionWorkflows } from './attention-daten.js'

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

/**
 * Rang je Karte (F-919, F44 WS-3b): P0, P1, dann die Feature-Akten, dann P2, P3, P4 und zuletzt
 * Findings ohne gültige Priorität. Feature-Akten tragen keine Priorität (src/workboard/types.ts);
 * hinter allen Findings gingen sie bei vielen offenen Befunden unter.
 */
const PRIORITAETS_RANG = { P0: 0, P1: 1, P2: 3, P3: 4, P4: 5 }
const RANG_FEATURE = 2
const RANG_OHNE_PRIORITAET = 6

/** Phase eines Workflows je Status (workflowPhase), sofern er nicht auf den Menschen wartet. */
const PHASE_JE_STATUS = { OFFEN: 'bereit', WARTET_FREIGABE: 'bereit', LAEUFT: 'laeuft', KLAERUNG_ERFORDERLICH: 'klaerung', ABGESCHLOSSEN: 'abgeschlossen', GESTOPPT: 'gestoppt' }

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
 * Sortierschlüssel einer Karte (F-919): P0, P1, Feature-Akten, P2, P3, P4, ohne Priorität.
 * @param workitem - ein Workitem
 * @returns Rang (kleiner = weiter oben)
 */
function rang(workitem) {
  if (workitem.quelle === 'feature') return RANG_FEATURE
  return Object.hasOwn(PRIORITAETS_RANG, workitem.prioritaet) ? PRIORITAETS_RANG[workitem.prioritaet] : RANG_OHNE_PRIORITAET
}

/**
 * Der für ein Workitem maßgebliche verknüpfte Workflow (Karte und Detail, F44 WS-3b): zuerst einer,
 * der auf den Menschen wartet (Reihenfolge wie baueEntscheidungen: Freigabe vor Rückfrage), dann
 * ein nicht terminaler, sonst der letzte in der Reihenfolge des Aggregats.
 * @param workitem - { quelle, id }
 * @param verknuepfung - Ergebnis von baueVerknuepfung
 * @returns ein Workflow-Eintrag des Aggregats, oder null (keiner verknüpft bzw. Verknüpfung unvollständig)
 */
export function verknuepfterWorkflow(workitem, verknuepfung) {
  const workflows = (verknuepfung?.jeReferenz.get(workitemReferenz(workitem)) ?? []).filter((w) => w !== null && typeof w === 'object')
  if (workflows.length === 0) return null
  const wartend = baueEntscheidungen({ workflows }, []).gruppen.workflows[0]
  if (wartend !== undefined) return workflows.find((w) => w.workflowId === wartend.id) ?? null
  return workflows.find((w) => NICHT_TERMINALE_WORKFLOW_STATUS.has(w.status)) ?? workflows[workflows.length - 1]
}

/**
 * Ein verknüpfter Workflow, der nicht terminal ist (NICHT_TERMINALE_WORKFLOW_STATUS, dieselbe Menge
 * wie Spaltenregel c) — sperrt „Auftrag vorbereiten“ (F-922, F44 WS-3b).
 * @param workitem - { quelle, id }
 * @param verknuepfung - Ergebnis von baueVerknuepfung
 * @returns der erste nicht terminale verknüpfte Workflow in Aggregat-Reihenfolge, oder null
 */
export function laufenderWorkflow(workitem, verknuepfung) {
  const workflows = verknuepfung?.jeReferenz.get(workitemReferenz(workitem)) ?? []
  return workflows.find((w) => NICHT_TERMINALE_WORKFLOW_STATUS.has(w?.status)) ?? null
}

/**
 * Phase eines Workflows für Karte und Statuszeile des Details (F-921): 'freigabe' bzw.
 * 'rueckfrage', wenn er auf den Menschen wartet (baueEntscheidungen, keine eigene Regel), sonst nach
 * Status 'bereit' | 'laeuft' | 'klaerung' | 'abgeschlossen' | 'gestoppt', ein unbekannter Status
 * 'unbekannt'.
 * @param workflow - Workflow-Eintrag des Aggregats, oder null
 * @returns Phasenschlüssel, oder null ohne Workflow
 */
export function workflowPhase(workflow) {
  if (workflow === null || typeof workflow !== 'object') return null
  const wartend = baueEntscheidungen({ workflows: [workflow] }, []).gruppen.workflows[0]
  if (wartend !== undefined) return wartend.art
  return Object.hasOwn(PHASE_JE_STATUS, workflow.status) ? PHASE_JE_STATUS[workflow.status] : 'unbekannt'
}

/**
 * Schrittfortschritt eines Workflows (Detail „Stand der Entwicklung“): abgeschlossen sind Schritte
 * mit Status ERFOLGREICH — dieselbe Zählung wie „Zuletzt umgesetzt“ der Übersicht (B12).
 * @param schritte - Schritte aus GET …/workflows/<id> (daten.schritte)
 * @returns { erledigt, gesamt, prozent (ganzzahlig, 0 ohne Schritte) }
 */
export function schrittFortschritt(schritte) {
  const liste = Array.isArray(schritte) ? schritte : []
  const erledigt = liste.filter((s) => s?.status === 'ERFOLGREICH').length
  return { erledigt, gesamt: liste.length, prozent: liste.length === 0 ? 0 : Math.round((erledigt / liste.length) * 100) }
}

/**
 * Baut das Status-Kanban.
 * @param workitems - GET …/workitems ungefiltert (null bei defekter Quelle, undefined solange er lädt)
 * @param workflows - zustand.workflows aus dem Poll
 * @param auftraege - GET …/auftraege
 * @returns null ohne Workitem-Liste; sonst { spalten: je Spalte { karten (höchstens KARTEN_JE_SPALTE), anzahl, weitere: Karten über der Grenze, jeTab: [{ tab, anzahl }] — alle Workitems der Spalte je Listen-Tab (F-919: „Alle x anzeigen“ springt in den Tab mit der ganzen Spalte; ein unbekannter Typ zählt nur in anzahl) }, ausserhalb: Anzahl, fehlend: nicht verfügbare Verknüpfungsquellen, laedt: noch ladende — solange eine fehlt oder lädt, stehen die Karten nur nach ihrem Status —, verknuepfung: das Ergebnis von baueVerknuepfung (Phase der Karten, F-921) }
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
    const sortiert = jeSpalte[spalte].sort((a, b) => rang(a.workitem) - rang(b.workitem) || a.index - b.index).map(({ workitem }) => workitem)
    const karten = sortiert.slice(0, KARTEN_JE_SPALTE)
    const zaehlerJeTab = new Map()
    for (const workitem of sortiert) {
      const tab = tabFuerTyp(workitem.typ)
      if (tab !== null) zaehlerJeTab.set(tab, (zaehlerJeTab.get(tab) ?? 0) + 1)
    }
    spalten[spalte] = {
      karten,
      anzahl: sortiert.length,
      weitere: sortiert.length - karten.length,
      jeTab: Object.keys(LISTEN_TABS)
        .filter((tab) => zaehlerJeTab.has(tab))
        .map((tab) => ({ tab, anzahl: zaehlerJeTab.get(tab) })),
    }
  }
  return { spalten, ausserhalb, fehlend: verknuepfung.fehlend, laedt: verknuepfung.laedt, verknuepfung }
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
