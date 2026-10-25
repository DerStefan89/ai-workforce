/**
 * Datei: public/leitstand/befund-zuordnung.js
 *
 * Zweck: Reine Zuordnung eines Befunds (Finding aus GET …/workitems) zu einem Feature, einem Meilenstein oder der Spur
 * „Pflege & Fixes“ (F45 B5b-2c-1, features/F45/plan-b5b2c1-v2.md; Sollvorgabe Stefan §5 Punkt 1: „Bugs/HI hängen an ihrem
 * Feature oder Meilenstein. Nicht zugeordnete Befunde in einer Spur ‚Pflege & Fixes‘“). Quelle sind die Workitems, nicht die
 * Roadmap-Projektion (Advisor B5b-1 P2); aus GET …/roadmap kommen nur die IDs der Features und Meilensteine.
 *
 * Regel (eine Stelle, auch in features/F45/feature.md „Stand B5b-2c-1“):
 *   1. Nennt das Feld „Feature/Run“ (featureRun) eine ganze Feature-ID, die in roadmap.json steht ⇒ dieses Feature.
 *   2. Sonst: nennt es eine ganze Meilenstein-ID aus roadmap.json ⇒ dieser Meilenstein.
 *   3. Sonst ⇒ „Pflege & Fixes“.
 *   Mehrere IDs: die erste im Text gewinnt (DEKLARIERT — keine Gewichtung, kein Raten aus Freitext); ein Feature gewinnt immer vor
 *   einem Meilenstein, auch wenn der Meilenstein früher steht (z. B. trifft „F19-bridge“ das Feature F19, nie den Meilenstein). „Ganz“
 *   heißt dieselbe Grenze wie nenntFeature in eintrag-bausteine.js: davor kein Buchstabe, keine Ziffer, kein „-“, danach kein
 *   Buchstabe, keine Ziffer (ein „-“ dahinter ist erlaubt). So treffen „F-002“ und „AF-F001“ kein Feature, „F6b“ nicht F6a, „M1“
 *   nicht M10, „S-M3-01b“ nicht M3; „M3-Challenge“ trifft M3, „F21-Akte“ trifft F21.
 * „Offen P0–P2“ = Finding mit Status OFFEN und Priorität P0, P1 oder P2 (wie waehleEntwicklungsstand in roadmap-anzeige.js).
 *
 * Wird aufgerufen von:
 * - public/leitstand/entwicklung-daten.js (Filter „Pflege & Fixes“ im Kanban · Priorität)
 * - public/leitstand/befund-zuordnung.test.mjs (node:test)
 *
 * Wichtig:
 * - Import-sicher und rein: kein DOM, kein Netz, kein Storage.
 */

/** Grenzen einer ganzen ID (dieselben wie nenntFeature in eintrag-bausteine.js). */
const DAVOR = '(?<![A-Za-z0-9-])'
const DANACH = '(?![A-Za-z0-9])'

/** Ganze Feature-ID im Text (Kandidat; ob sie in roadmap.json steht, prüft zuordnungVon). */
const FEATURE_TOKEN = new RegExp(`${DAVOR}F[0-9]+[A-Za-z]?${DANACH}`, 'g')

/** Prioritäten, die als „offen P0–P2“ zählen. */
const P02 = new Set(['P0', 'P1', 'P2'])

/** Rang je Priorität für die Sortierung (kleiner = weiter oben). */
const RANG = { P0: 0, P1: 1, P2: 2 }

/**
 * Escapt einen Text für einen regulären Ausdruck.
 * @param text - Rohtext
 * @returns escapter Text
 */
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * IDs der Features und Meilensteine einer gültigen Projektion von GET …/roadmap, dazu das Muster der Meilenstein-IDs (einmal je
 * Projektion gebaut, nicht je Befund; längste IDs zuerst, damit „V1-Backlog“ vor einem Präfix greift).
 * @param roadmap - Antwort von GET …/roadmap
 * @returns { features: Set<string>, meilensteine: Set<string>, meilensteinMuster: RegExp | null } oder null ohne gültige Projektion
 */
export function roadmapIds(roadmap) {
  if (roadmap === null || typeof roadmap !== 'object' || roadmap.status !== 'ok' || !Array.isArray(roadmap.meilensteine)) return null
  const features = new Set()
  const meilensteine = new Set()
  for (const m of roadmap.meilensteine) {
    if (m === null || typeof m !== 'object') continue
    if (typeof m.id === 'string' && m.id !== '') meilensteine.add(m.id)
    for (const f of Array.isArray(m.features) ? m.features : []) if (typeof f?.id === 'string' && f.id !== '') features.add(f.id)
  }
  const alternativen = [...meilensteine].sort((a, b) => b.length - a.length).map(escapeRegex).join('|')
  return { features, meilensteine, meilensteinMuster: alternativen === '' ? null : new RegExp(`${DAVOR}(?:${alternativen})${DANACH}`) }
}

/**
 * Ordnet einen Befund nach der Regel im Dateikopf zu.
 * @param befund - Finding ({ featureRun })
 * @param ids - Ergebnis von roadmapIds
 * @returns { art: 'feature' | 'meilenstein', id } oder { art: 'pflege', id: null }
 */
export function zuordnungVon(befund, ids) {
  const text = typeof befund?.featureRun === 'string' ? befund.featureRun : ''
  for (const treffer of text.matchAll(FEATURE_TOKEN)) if (ids.features.has(treffer[0])) return { art: 'feature', id: treffer[0] }
  const meilenstein = ids.meilensteinMuster?.exec(text) ?? null
  return meilenstein === null ? { art: 'pflege', id: null } : { art: 'meilenstein', id: meilenstein[0] }
}

/**
 * true für ein offenes Finding mit Priorität P0–P2.
 * @param w - Workitem
 * @returns boolean
 */
export function offenerP02Befund(w) {
  return w?.quelle === 'finding' && w.status === 'OFFEN' && P02.has(w.prioritaet)
}

/**
 * Ordnet alle offenen P0–P2-Befunde zu.
 * @param workitems - GET …/workitems (ungefiltert) oder null/undefined
 * @param roadmap - Antwort von GET …/roadmap
 * @returns { jeFeature: Map<id, Befund[]>, jeMeilenstein: Map<id, Befund[]>, pflege: Befund[] } — je Liste nach Priorität, dann
 *   Quellreihenfolge — oder null ohne Workitem-Liste bzw. ohne gültige Roadmap
 */
export function ordneBefundeZu(workitems, roadmap) {
  const ids = roadmapIds(roadmap)
  if (!Array.isArray(workitems) || ids === null) return null
  const jeFeature = new Map()
  const jeMeilenstein = new Map()
  const pflege = []
  const sortiert = workitems
    .map((w, index) => ({ w, index }))
    .filter(({ w }) => offenerP02Befund(w))
    .sort((a, b) => RANG[a.w.prioritaet] - RANG[b.w.prioritaet] || a.index - b.index)
    .map(({ w }) => w)
  for (const w of sortiert) {
    const ziel = zuordnungVon(w, ids)
    if (ziel.art === 'pflege') pflege.push(w)
    else {
      const map = ziel.art === 'feature' ? jeFeature : jeMeilenstein
      if (!map.has(ziel.id)) map.set(ziel.id, [])
      map.get(ziel.id).push(w)
    }
  }
  return { jeFeature, jeMeilenstein, pflege }
}
