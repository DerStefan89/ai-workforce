/**
 * Datei: src/workboard/index.ts
 *
 * Zweck: Barrel plus Zusammenführung für das Workboard-Modul (F21 WS-1,
 * AK3). GET /api/workitems ruft baueWorkitemListe mit den beiden bereits
 * geparsten Listen (Findings, Feature-Akten) und den Query-Filtern auf —
 * Merge, Filter und Sortierung sind hier eine reine Funktion, kein
 * I/O-Zugriff.
 *
 * Sortierung P0→P4 (AK3, P4 existiert real — F-368): eine Feature-Akte
 * trägt keine eigene Priorität (feature.md kennt das Feld nicht) und wird
 * deshalb HINTER allen priorisierten Findings einsortiert, intern stabil
 * nach id — eine kleine, dokumentierte Erfindung, kein stillschweigender
 * Fallback.
 */

import type { FeatureWorkitem, FindingWorkitem, Prioritaet, Workitem } from './types.ts'

export { parseFindings, normalisiereStatus } from './findings.ts'
export { parseFeatureAkten } from './features.ts'
export type { FeatureDatei } from './features.ts'
export { projiziereFehlgeschlageneLaeufe } from './failed-runs.ts'
export type { FailedRunWorkitem, LaufKopfdatenFuerProjektion } from './failed-runs.ts'
export type { Befund, FeatureWorkitem, FindingWorkitem, ParseErgebnis, Prioritaet, Workitem, WorkitemStatus } from './types.ts'

export interface WorkitemFilter {
  typ?: string
  status?: string
  prioritaet?: string
}

const PRIORITAET_RANG: Record<Prioritaet, number> = { P0: 0, P1: 1, P2: 2, P3: 3, P4: 4 }
/** Rang einer Feature-Akte ohne eigene Priorität — hinter P4 (siehe Dateikopf). */
const FEATURE_RANG = 5

function rang(workitem: Workitem): number {
  return workitem.quelle === 'finding' ? PRIORITAET_RANG[workitem.prioritaet] : FEATURE_RANG
}

/**
 * QA-Befund F21 WS-1, zwei bewusste v1-Entscheidungen statt stillschweigender
 * Lücken (CLAUDE.md-Entscheidungsregel): (1) status ist über die beiden
 * Quellen NICHT dasselbe Vokabular — Findings normalisieren auf OFFEN/
 * ERLEDIGT/SONSTIGES, Feature-Akten führen ihren rohen gueltigeStatusWerte-
 * Wert (ENTWURF, FEATURE_GATE, ...). Ein status-Filter trifft deshalb
 * strukturell nie beide Quellen gleichzeitig — WS-2 (Status-Filter-UI) muss
 * das beim Bau der Bedienung berücksichtigen, kein Bug hier. (2) ein
 * unbekannter Filterwert (z. B. typ=NOPE) liefert eine leere Liste statt
 * eines Fehlers — für ein lokales Einzelnutzer-Tool ausreichend, keine
 * Allowlist-Prüfung der Query-Werte in v1.
 */
function erfuelltFilter(workitem: Workitem, filter: WorkitemFilter): boolean {
  if (filter.typ !== undefined && workitem.typ !== filter.typ) return false
  if (filter.status !== undefined && workitem.status !== filter.status) return false
  if (filter.prioritaet !== undefined) {
    if (workitem.quelle !== 'finding' || workitem.prioritaet !== filter.prioritaet) return false
  }
  return true
}

/**
 * @param findings - Ergebnis von parseFindings(...).workitems
 * @param features - Ergebnis von parseFeatureAkten(...).workitems
 * @param filter - optionale Query-Filter (typ, status, prioritaet)
 * @returns gefilterte, nach Priorität P0→P4 (Feature-Akten zuletzt) sortierte Liste
 */
export function baueWorkitemListe(findings: FindingWorkitem[], features: FeatureWorkitem[], filter: WorkitemFilter = {}): Workitem[] {
  const alle: Workitem[] = [...findings, ...features]
  return alle
    .filter((workitem) => erfuelltFilter(workitem, filter))
    .sort((a, b) => rang(a) - rang(b) || a.id.localeCompare(b.id))
}
