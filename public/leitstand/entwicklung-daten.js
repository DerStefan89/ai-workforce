/**
 * Datei: public/leitstand/entwicklung-daten.js
 *
 * Zweck: Reine Regeln der Seite „Entwicklung“ (F44 WS-3a, Abgleich F-725 E1, E4, E5; Vorlage
 * d_arbeit_board.png). baueBoard ordnet die Workitems den vier Spalten des Status-Kanbans zu
 * (Geplant · In Arbeit · Braucht dich · Abgenommen), begrenzt und sortiert die Karten je Spalte;
 * sucheWorkitems ist die clientseitige Suche der Listen. Kein DOM, kein I/O. Seit F45 B5b-2c-1 (features/F45/plan-b5b2c1-v2.md)
 * zusätzlich das Prioritäts-Kanban lesend (baueKanbanPrioritaet, featurePrioritaeten; Regeln an der Funktion).
 *
 * Zuordnung in dieser Prüfreihenfolge (die erste zutreffende Zeile gewinnt):
 *   a) abgenommen:   Feature ABGESCHLOSSEN, Finding ERLEDIGT.
 *   b) braucht_dich: Feature FEATURE_GATE oder BLOCKIERT, oder ein verknüpfter Workflow wartet auf
 *                    den Menschen (filtereAttentionWorkflows aus attention-daten.js — keine zweite
 *                    Regel) oder hat eine offene Abnahme (filtereOffeneAbnahmen, F45 B5a-2, F-991).
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
 * - F46 D1: views/dashboard.js nutzt baueBoard (Arbeitsstand), baueVerknuepfung, verknuepfterWorkflow,
 *   workflowPhase und waehleFeatureInArbeit (Feature in Arbeit für den Rollen-Kreis).
 */

import { baueEntscheidungen, filtereAttentionWorkflows, filtereOffeneAbnahmen } from './attention-daten.js'
import { offenerP02Befund, roadmapIds, zuordnungVon } from './befund-zuordnung.js'

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
 * Ordnet jeder Workitem-Referenz ihre Workflows zu (über den Auftrag). F45 B2a-2 (F-989): trägt der Auftrag einen
 * Feature-Bezug (feature_ref), gilt `workitem:feature:<feature_ref>` vor der Referenzzeile aus dem Auftragstext.
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
    if (typeof auftrag?.auftragId !== 'string') continue
    const referenz = typeof auftrag.feature_ref === 'string' ? workitemReferenz({ quelle: 'feature', id: auftrag.feature_ref }) : auftrag.workitem_referenz
    if (typeof referenz === 'string') referenzJeAuftrag.set(auftrag.auftragId, referenz)
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
  if ((istFeature && FEATURE_BRAUCHT_DICH.has(status)) || filtereAttentionWorkflows(workflows).length > 0 || filtereOffeneAbnahmen(workflows).length > 0) return 'braucht_dich'
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
 * Ob ein Workflow noch fortgesetzt werden kann (NICHT_TERMINALE_WORKFLOW_STATUS, dieselbe Menge wie
 * Spaltenregel c) — F46 D1: Übersicht, Ablauf ohne Feature im Rollen-Kreis.
 * @param workflow - Workflow-Eintrag des Aggregats oder null
 * @returns true, wenn nicht terminal
 */
export function istNichtTerminal(workflow) {
  return NICHT_TERMINALE_WORKFLOW_STATUS.has(workflow?.status)
}

/**
 * Das Feature in Arbeit für „Wer arbeitet gerade“ der Übersicht (F46 D1, abgleich-f46.md §4.1): das
 * erste Feature mit einem nicht terminalen verknüpften Workflow (laufenderWorkflow); sonst das erste
 * Feature IN_ARBEIT bzw. WORKSTREAM_SCHNITT_GENEHMIGT — zuerst in der Reihenfolge des aktuellen
 * Meilensteins, dann in der Reihenfolge der Workitems. Der Workflow dazu ist verknuepfterWorkflow
 * (kann null sein: dann stehen alle Rollen des Kreises auf „offen“).
 * @param workitems - GET …/workitems (Liste; sonst null)
 * @param verknuepfung - Ergebnis von baueVerknuepfung
 * @param meilenstein - aktueller Meilenstein (roadmap-anzeige.js aktuellerMeilenstein) oder null
 * @returns { id, titel, status, workflow } oder null, wenn kein Feature in Arbeit ist
 */
export function waehleFeatureInArbeit(workitems, verknuepfung, meilenstein) {
  const features = (Array.isArray(workitems) ? workitems : []).filter((w) => w !== null && typeof w === 'object' && w.quelle === 'feature' && typeof w.id === 'string')
  const ergebnis = (eintrag) => {
    const referenz = { quelle: 'feature', id: eintrag.id }
    return { id: eintrag.id, titel: typeof eintrag.titel === 'string' ? eintrag.titel : null, status: eintrag.status ?? null, workflow: verknuepfterWorkflow(referenz, verknuepfung) }
  }
  const mitLauf = features.find((w) => laufenderWorkflow(w, verknuepfung) !== null)
  if (mitLauf !== undefined) return ergebnis(mitLauf)
  const ausMeilenstein = (Array.isArray(meilenstein?.features) ? meilenstein.features : []).find((f) => FEATURE_IN_ARBEIT.has(f?.status))
  if (ausMeilenstein !== undefined) return ergebnis(ausMeilenstein)
  const ausWorkitems = features.find((w) => FEATURE_IN_ARBEIT.has(w.status))
  return ausWorkitems === undefined ? null : ergebnis(ausWorkitems)
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

// ─── Kanban · Priorität (F45 B5b-2c-1, E-KANBAN = A, F-917 (a)) ────────────────

/** Spalten des Prioritäts-Kanbans in Anzeigereihenfolge (Vorlage d_arbeit_prioritaeten.png, dazu „ohne Priorität“). */
export const PRIORITAETS_SPALTEN = Object.freeze(['P0', 'P1', 'P2', 'P3', 'ohne'])

/** Prioritäten einer Akte (src/workboard/feature-planung.ts PRIORITAETEN) — P4 gibt es dort nicht. */
const AKTEN_PRIORITAETEN = new Set(['P0', 'P1', 'P2', 'P3'])

/** Feature-Status ohne offene Arbeit: stehen nicht im Prioritäts-Kanban. */
const FEATURE_ERLEDIGT = new Set(['ABGESCHLOSSEN', 'ABGEBROCHEN'])

/**
 * Prioritäten der Features aus GET …/roadmap (`features[].prioritaet`, Zeile „Priorität:“ der Akte, F45 B5b-1a) — die Projektion
 * liefert die Zeile schon; Kanban und Zuordnung rechnet sie nicht (Advisor B5b-1 P2, advisor-b5b2c.md A4).
 * @param roadmap - Antwort von GET …/roadmap
 * @returns Map<featureId, 'P0'..'P3'> (nur gesetzte Prioritäten) oder null ohne gültige Projektion
 */
export function featurePrioritaeten(roadmap) {
  if (roadmap === null || typeof roadmap !== 'object' || roadmap.status !== 'ok' || !Array.isArray(roadmap.meilensteine)) return null
  const prioritaeten = new Map()
  for (const m of roadmap.meilensteine) {
    for (const f of Array.isArray(m?.features) ? m.features : []) if (typeof f?.id === 'string' && AKTEN_PRIORITAETEN.has(f.prioritaet)) prioritaeten.set(f.id, f.prioritaet)
  }
  return prioritaeten
}

/**
 * Spalte einer Karte im Prioritäts-Kanban: Features nach ihrer Akten-Priorität, Findings nach ihrer Priorität, P4 (Alt-Bestand,
 * Gate f21 (5)) in „P3“ (advisor-b5b2c.md A2: keine Spalte für eine nicht mehr vergebbare Priorität), sonst „ohne“.
 * @param workitem - ein offenes Workitem
 * @param prioritaeten - featurePrioritaeten oder null
 * @returns Spaltenschlüssel aus PRIORITAETS_SPALTEN
 */
function prioritaetsSpalte(workitem, prioritaeten) {
  const prioritaet = workitem.quelle === 'feature' ? (prioritaeten?.get(workitem.id) ?? null) : workitem.prioritaet
  if (prioritaet === 'P4') return 'P3'
  return AKTEN_PRIORITAETEN.has(prioritaet) ? prioritaet : 'ohne'
}

/**
 * Offene Workitems im Sinn des Prioritäts-Kanbans: Feature-Akte nicht ABGESCHLOSSEN/ABGEBROCHEN (auch ein unbekannter Status zählt als
 * offen), Finding mit Status OFFEN.
 * @param workitems - Workitem-Liste
 * @returns offene Workitems in Quellreihenfolge
 */
const offeneKanbanItems = (workitems) => workitems.filter((w) => (w?.quelle === 'feature' ? !FEATURE_ERLEDIGT.has(w.status) : w?.quelle === 'finding' && w.status === 'OFFEN'))

/**
 * Typen der offenen Karten für die Typ-Chips (vor allen Filtern) — eigene Funktion, damit die Chips nicht das ganze Kanban rechnen
 * (Prüfpass cr 4).
 * @param workitems - GET …/workitems ungefiltert, oder null/undefined
 * @returns sortierte Typen ([] ohne Liste)
 */
export function kanbanTypen(workitems) {
  if (!Array.isArray(workitems)) return []
  return [...new Set(offeneKanbanItems(workitems).map((w) => w.typ).filter((typ) => typeof typ === 'string'))].sort()
}

/**
 * Ordnet die offenen Workitems den Spalten des Prioritäts-Kanbans zu (nur lesend, kein Ziehen).
 * Offen = Feature-Akte nicht ABGESCHLOSSEN/ABGEBROCHEN, Finding mit Status OFFEN. Je Spalte Features zuerst, dann Findings (P3 vor
 * P4), sonst die Quellreihenfolge; höchstens KARTEN_JE_SPALTE Karten, außer die Spalte ist aufgeklappt.
 * Filter: typ ('' = alle); pflege = true zeigt nur offene P0–P2-Findings ohne Feature-/Meilenstein-Bezug (befund-zuordnung.js) —
 * P3 und „ohne“ stehen dann leer (advisor-b5b2c.md A3); ohne gültige Roadmap ist der Filter wirkungslos (die View sperrt ihn).
 * @param workitems - GET …/workitems ungefiltert (null bei defekter Quelle, undefined solange er lädt)
 * @param roadmap - Antwort von GET …/roadmap (Feature-Prioritäten und IDs für die Zuordnung), oder null/undefined
 * @param optionen - { typ: string, pflege: boolean, voll: Set<Spaltenschlüssel> (aufgeklappte Spalten) }
 * @returns null ohne Workitem-Liste; sonst { spalten: je Spalte { karten, anzahl, weitere: Karten über der Grenze — bleibt auch in einer
 *   aufgeklappten Spalte > 0 (die View zeigt dann „Weniger zeigen“), p4 }, typen: kanbanTypen, prioritaeten: true, wenn die
 *   Feature-Prioritäten gelesen werden konnten }
 */
export function baueKanbanPrioritaet(workitems, roadmap, optionen = {}) {
  if (!Array.isArray(workitems)) return null
  const prioritaeten = featurePrioritaeten(roadmap)
  const ids = optionen.pflege === true ? roadmapIds(roadmap) : null
  const offen = offeneKanbanItems(workitems)
  const typen = kanbanTypen(workitems)
  const typ = typeof optionen.typ === 'string' ? optionen.typ : ''
  const gezeigt = offen.filter((w) => (typ === '' || w.typ === typ) && (ids === null || (offenerP02Befund(w) && zuordnungVon(w, ids).art === 'pflege')))
  const jeSpalte = Object.fromEntries(PRIORITAETS_SPALTEN.map((spalte) => [spalte, []]))
  gezeigt.forEach((workitem, index) => jeSpalte[prioritaetsSpalte(workitem, prioritaeten)].push({ workitem, index }))
  const reihe = (w) => (w.quelle === 'feature' ? 0 : w.prioritaet === 'P4' ? 2 : 1)
  const spalten = {}
  for (const spalte of PRIORITAETS_SPALTEN) {
    const sortiert = jeSpalte[spalte].sort((a, b) => reihe(a.workitem) - reihe(b.workitem) || a.index - b.index).map(({ workitem }) => workitem)
    const karten = optionen.voll instanceof Set && optionen.voll.has(spalte) ? sortiert : sortiert.slice(0, KARTEN_JE_SPALTE)
    spalten[spalte] = { karten, anzahl: sortiert.length, weitere: sortiert.length - Math.min(sortiert.length, KARTEN_JE_SPALTE), p4: sortiert.filter((w) => w.quelle === 'finding' && w.prioritaet === 'P4').length }
  }
  return { spalten, typen, prioritaeten: prioritaeten !== null }
}
