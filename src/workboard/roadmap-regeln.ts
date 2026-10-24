/**
 * Datei: src/workboard/roadmap-regeln.ts
 *
 * Zweck: Status-Regel R1 der Roadmap (docs/projekt/fixpaket-f45.md §2 R1; F45 B5b-1a, features/F45/plan-b5b1-v2.md, löst den
 * Rest von F-1010): ein Meilenstein steht nur auf ABGESCHLOSSEN, wenn jedes seiner Features ABGESCHLOSSEN ist oder eine
 * begründete Ausnahme trägt. Die Ausnahmen sind Daten (`docs/projekt/roadmap-ausnahmen.json`, O1), nicht Code: B5b-1b entfernt
 * eine Ausnahme beim Bestätigen in der Bereinigungsliste, und Fremdprojekte haben kein Gate-Skript. Rein, kein I/O, wirft nicht.
 *
 * Wird aufgerufen von: scripts/check-akte-meilenstein.mjs, scripts/check-f45-b5b1a-planung.mjs,
 * src/workboard/roadmap-regeln.test.ts.
 *
 * Wichtig: Eine Ausnahme, die nicht mehr greift (Meilenstein fehlt oder ist nicht ABGESCHLOSSEN, das Feature steht nicht darin
 * oder ist inzwischen ABGESCHLOSSEN), ist selbst ein Befund — sonst bliebe sie still als Freibrief stehen (Muster AUSNAHMEN in
 * scripts/check-akte-meilenstein.mjs). Zwei Ausnahme-Orte (Skript für die ID-Regel, Datei für die Status-Regel) — DEKLARIERT.
 */

/** Eine begründete Ausnahme der Status-Regel R1. */
export interface StatusAusnahme {
  meilenstein: string
  feature: string
  grund: string
}

/** Eine Abweichung: Feature eines abgeschlossenen Meilensteins, das nicht ABGESCHLOSSEN ist. */
export interface StatusAbweichung {
  meilenstein: string
  feature: string
  /** Aktenstatus, null = keine Akte oder keine lesbare Status-Zeile */
  featureStatus: string | null
  ausnahme: StatusAusnahme | null
}

/** Ausschnitt von roadmap.json, den die Regel braucht. */
export interface RoadmapStruktur {
  meilensteine: { id: string; status: string; features: string[] }[]
}

/** Der Grund, den die Bestandsausnahmen von B5b-1a tragen. */
export const GRUND_BEREINIGUNG_OFFEN = 'Bereinigung offen — Bestätigung Stefan (Bereinigungsliste)'

/**
 * Liest die Ausnahmen-Datei. Fehlende Datei (text null) = keine Ausnahmen; ungültig = Befund, nie Wurf.
 * @param text - Inhalt von roadmap-ausnahmen.json oder null
 * @returns { ausnahmen, befunde }
 */
export function leseStatusAusnahmen(text: string | null): { ausnahmen: StatusAusnahme[]; befunde: string[] } {
  if (text === null) return { ausnahmen: [], befunde: [] }
  let daten: unknown
  try {
    daten = JSON.parse(text)
  } catch (fehler) {
    return { ausnahmen: [], befunde: [`roadmap-ausnahmen.json: JSON nicht lesbar (${fehler instanceof Error ? fehler.message : String(fehler)})`] }
  }
  if (daten === null || typeof daten !== 'object' || Array.isArray(daten)) return { ausnahmen: [], befunde: ['roadmap-ausnahmen.json: muss ein Objekt { schema, status_ausnahmen } sein'] }
  const obj = daten as Record<string, unknown>
  const befunde: string[] = []
  const fremd = Object.keys(obj).filter((k) => k !== 'schema' && k !== 'status_ausnahmen')
  if (fremd.length > 0) befunde.push(`roadmap-ausnahmen.json: unbekannte Felder ${fremd.join(', ')}`)
  if (obj.schema !== 'v0') befunde.push("roadmap-ausnahmen.json: schema muss 'v0' sein")
  if (!Array.isArray(obj.status_ausnahmen)) return { ausnahmen: [], befunde: [...befunde, 'roadmap-ausnahmen.json: status_ausnahmen muss eine Liste sein'] }
  const ausnahmen: StatusAusnahme[] = []
  const gesehen = new Set<string>()
  for (const [index, eintrag] of obj.status_ausnahmen.entries()) {
    const wo = `roadmap-ausnahmen.json: status_ausnahmen[${index}]`
    if (eintrag === null || typeof eintrag !== 'object' || Array.isArray(eintrag)) {
      befunde.push(`${wo} muss ein Objekt { meilenstein, feature, grund } sein`)
      continue
    }
    const e = eintrag as Record<string, unknown>
    const fremdFelder = Object.keys(e).filter((k) => !['meilenstein', 'feature', 'grund'].includes(k))
    if (fremdFelder.length > 0) befunde.push(`${wo}: unbekannte Felder ${fremdFelder.join(', ')}`)
    if (typeof e.meilenstein !== 'string' || e.meilenstein === '' || typeof e.feature !== 'string' || e.feature === '') {
      befunde.push(`${wo}: meilenstein und feature müssen nicht-leere Strings sein`)
      continue
    }
    if (typeof e.grund !== 'string' || e.grund.trim() === '') {
      befunde.push(`${wo} (${e.meilenstein}/${e.feature}): Begründung fehlt`)
      continue
    }
    const schluessel = `${e.meilenstein}|${e.feature}`
    if (gesehen.has(schluessel)) {
      befunde.push(`${wo}: Ausnahme ${e.meilenstein}/${e.feature} steht doppelt`)
      continue
    }
    gesehen.add(schluessel)
    ausnahmen.push({ meilenstein: e.meilenstein, feature: e.feature, grund: e.grund })
  }
  return { ausnahmen, befunde }
}

/**
 * Prüft die Status-Regel R1 gegen die Akten.
 * @param roadmap - geparstes roadmap.json (meilensteine[].id/status/features)
 * @param aktenStatus - Map Feature-ID → Aktenstatus (fehlt = keine Akte oder keine Status-Zeile)
 * @param ausnahmen - begründete Ausnahmen (leseStatusAusnahmen)
 * @returns { abweichungen (auch die mit Ausnahme), befunde (Verstöße ohne Ausnahme, verwaiste Ausnahmen) }
 */
export function pruefeMeilensteinStatus(roadmap: RoadmapStruktur, aktenStatus: Map<string, string>, ausnahmen: StatusAusnahme[]): { abweichungen: StatusAbweichung[]; befunde: string[] } {
  const abweichungen: StatusAbweichung[] = []
  const befunde: string[] = []
  const finde = (meilenstein: string, feature: string) => ausnahmen.find((a) => a.meilenstein === meilenstein && a.feature === feature) ?? null
  for (const meilenstein of roadmap.meilensteine) {
    if (meilenstein.status !== 'ABGESCHLOSSEN') continue
    for (const feature of meilenstein.features) {
      const featureStatus = aktenStatus.get(feature) ?? null
      if (featureStatus === 'ABGESCHLOSSEN') continue
      const ausnahme = finde(meilenstein.id, feature)
      abweichungen.push({ meilenstein: meilenstein.id, feature, featureStatus, ausnahme })
      if (ausnahme === null) befunde.push(`R1: Meilenstein ${meilenstein.id} ist ABGESCHLOSSEN, Feature ${feature} steht auf ${featureStatus ?? 'ohne Status'} — ohne begründete Ausnahme in roadmap-ausnahmen.json`)
    }
  }
  for (const ausnahme of ausnahmen) {
    const meilenstein = roadmap.meilensteine.find((m) => m.id === ausnahme.meilenstein)
    const wo = `Ausnahme ${ausnahme.meilenstein}/${ausnahme.feature} ist veraltet`
    if (meilenstein === undefined) befunde.push(`${wo}: Meilenstein unbekannt`)
    else if (meilenstein.status !== 'ABGESCHLOSSEN') befunde.push(`${wo}: Meilenstein steht auf ${meilenstein.status}`)
    else if (!meilenstein.features.includes(ausnahme.feature)) befunde.push(`${wo}: Feature steht nicht in diesem Meilenstein`)
    else if (aktenStatus.get(ausnahme.feature) === 'ABGESCHLOSSEN') befunde.push(`${wo}: Feature ist ABGESCHLOSSEN`)
  }
  return { abweichungen, befunde }
}
