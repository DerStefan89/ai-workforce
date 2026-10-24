/**
 * Datei: src/workboard/roadmap-regeln.ts
 *
 * Zweck: Status-Regel R1 der Roadmap (docs/projekt/fixpaket-f45.md §2 R1; F45 B5b-1a, features/F45/plan-b5b1-v2.md, löst den
 * Rest von F-1010): ein Meilenstein steht nur auf ABGESCHLOSSEN, wenn jedes seiner Features ABGESCHLOSSEN ist oder eine
 * begründete Ausnahme trägt. Die Ausnahmen sind Daten (`docs/projekt/roadmap-ausnahmen.json`, O1), nicht Code: B5b-1b entfernt
 * eine Ausnahme beim Bestätigen in der Bereinigungsliste, und Fremdprojekte haben kein Gate-Skript. Rein, kein I/O, wirft nicht.
 *
 * Seit F45 B5b-1b-2 auch die Bereinigungsliste (bereinigungsEintraege, pruefeEintrag) und der Vergleich alter/neuer Stand
 * (neueR1Befunde) — features/F45/plan-b5b1b2-v2.md §2.3.
 *
 * Wird aufgerufen von: scripts/check-akte-meilenstein.mjs, scripts/check-f45-b5b1a-planung.mjs, scripts/leitstand/routen-planung.mjs,
 * src/workboard/roadmap-schreiben.ts (leseStatusAusnahmen), src/workboard/roadmap-regeln.test.ts.
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

/** Ein Stand, gegen den R1 geprüft wird. */
export interface R1Stand {
  roadmap: RoadmapStruktur
  aktenStatus: Map<string, string>
  ausnahmen: StatusAusnahme[]
}

/**
 * R1-Befunde, die eine Änderung neu verursacht: Befundtext auf dem neuen Stand, der auf dem alten fehlt (Advisor B5b-1b B1,
 * B5b-1b-2 B3). Altbefunde blockieren nicht — sie können außerhalb der Änderung liegen. Eine Regel für PUT …/planung und die
 * Bereinigungsliste; alter und neuer Stand dürfen verschiedene Ausnahmen tragen.
 * @param alt - Stand vor der Änderung
 * @param neu - Stand nach der Änderung
 * @returns neue Befunde (leer = R1 lässt die Änderung zu)
 */
export function neueR1Befunde(alt: R1Stand, neu: R1Stand): string[] {
  const vorher = pruefeMeilensteinStatus(alt.roadmap, alt.aktenStatus, alt.ausnahmen).befunde
  return pruefeMeilensteinStatus(neu.roadmap, neu.aktenStatus, neu.ausnahmen).befunde.filter((befund) => !vorher.includes(befund))
}

/** Eine Entscheidung der Bereinigungsliste (F45 B5b-1b-2). */
export type BereinigungsEntscheidung = 'feature_abgeschlossen' | 'meilenstein_laeuft'

/** Ein angebotener Vorschlag mit Anzeigetext und Nebenwirkungen. */
export interface BereinigungsVorschlag {
  entscheidung: BereinigungsEntscheidung
  text: string
  nebenwirkung: string
}

/** Ein Eintrag der Bereinigungsliste: eine R1-Abweichung mit ihren erlaubten Entscheidungen. */
export interface BereinigungsEintrag extends StatusAbweichung {
  eintrag: string
  /** Abweichungen im selben Meilenstein (qa 1): „Meilenstein → LAEUFT“ gibt es erst bei 1 — die Anzeige kann das ankündigen. */
  abweichungen_im_meilenstein: number
  vorschlaege: BereinigungsVorschlag[]
}

/** Steuerzeichen oder `/` in einer Meilenstein-ID: nicht adressierbar bzw. nicht in eine Akte zu schreiben (cr 8, qa 3). */
const NICHT_ADRESSIERBAR = /[\/\u0000-\u001f\u007f\u2028\u2029]/

/**
 * Baut die Bereinigungsliste aus den R1-Abweichungen (F45 B5b-1b-2, features/F45/plan-b5b1b2-v2.md §2.3; auch Abweichungen ohne
 * Ausnahme). „Feature → ABGESCHLOSSEN“ nur bei einer Akte mit Status ≠ ABGEBROCHEN (der Text nennt den heutigen Status, Advisor
 * B5b-1b C11); „Meilenstein → LAEUFT“ nur, wenn der Meilenstein im aktuellen Stand genau eine Abweichung hat (B4, A2 = dynamisch:
 * auch M4 nach drei Einzelbestätigungen). Kein Verschieben (F-1187). Keine Sammel-Bestätigung: jeder Vorschlag betrifft genau
 * diesen Eintrag.
 * @param abweichungen - pruefeMeilensteinStatus(...).abweichungen
 * @returns Einträge in der Reihenfolge der Abweichungen
 */
export function bereinigungsEintraege(abweichungen: StatusAbweichung[]): BereinigungsEintrag[] {
  const jeMeilenstein = new Map<string, number>()
  for (const a of abweichungen) jeMeilenstein.set(a.meilenstein, (jeMeilenstein.get(a.meilenstein) ?? 0) + 1)
  return abweichungen.map((a) => {
    const ausnahme = a.ausnahme === null ? '' : `; die Ausnahme ${a.meilenstein}/${a.feature} in roadmap-ausnahmen.json entfällt`
    const vorschlaege: BereinigungsVorschlag[] = []
    const anzahl = jeMeilenstein.get(a.meilenstein) ?? 0
    // Eine Meilenstein-ID mit `/` oder Steuerzeichen ist nicht adressierbar: gelistet, aber ohne Vorschlag (von Hand).
    if (NICHT_ADRESSIERBAR.test(a.meilenstein)) return { eintrag: `${a.meilenstein}/${a.feature}`, ...a, abweichungen_im_meilenstein: anzahl, vorschlaege }
    if (a.featureStatus !== null && a.featureStatus !== 'ABGEBROCHEN') {
      vorschlaege.push({
        entscheidung: 'feature_abgeschlossen',
        text: `${a.feature} → ABGESCHLOSSEN (heute ${a.featureStatus})`,
        nebenwirkung: `Akte: Status ABGESCHLOSSEN, „Abgenommen: <Tag der Bestätigung>“ und eine Zeile unter „## Änderungen“; docs/STATUS.md: Status-Wort der Angabe zu ${a.feature}${ausnahme}`,
      })
    }
    if (anzahl === 1) {
      vorschlaege.push({
        entscheidung: 'meilenstein_laeuft',
        text: `${a.meilenstein} → LAEUFT`,
        nebenwirkung: `roadmap.json: ${a.meilenstein} steht wieder auf LAEUFT — steht ${a.meilenstein} vor dem heute laufenden Meilenstein, zeigt die Anzeige ${a.meilenstein} als aktuellen Meilenstein (sie nimmt den ersten laufenden); seine Features zählen wieder in der Prognose (ohne Schätzung erhöhen sie „ohne Schätzung“ späterer Meilensteine); zurück auf ABGESCHLOSSEN nur von Hand in roadmap.json (qa 2); keine Änderungszeile in Akten, der Grund steht in der Commit-Nachricht${ausnahme}; Überschriften in docs/STATUS.md bleiben Handarbeit`,
      })
    }
    return { eintrag: `${a.meilenstein}/${a.feature}`, ...a, abweichungen_im_meilenstein: anzahl, vorschlaege }
  })
}

/**
 * Zerlegt einen Eintrag `<Meilenstein>/<Feature-ID>` (genau ein `/`; Meilenstein-IDs mit `/` sind nicht adressierbar —
 * DEKLARIERT, Advisor C8).
 * @param wert - Rohwert von 'eintrag'
 * @param featureIdMuster - Muster der Feature-ID (FEATURE_ID_MUSTER, vom Aufrufer — die Regel bleibt ohne Importe)
 * @returns { meilenstein, feature } oder null
 */
export function pruefeEintrag(wert: unknown, featureIdMuster: RegExp): { meilenstein: string; feature: string } | null {
  if (typeof wert !== 'string') return null
  const teile = wert.split('/')
  if (teile.length !== 2 || teile[0].trim() === '' || NICHT_ADRESSIERBAR.test(teile[0]) || !featureIdMuster.test(teile[1])) return null
  return { meilenstein: teile[0], feature: teile[1] }
}
