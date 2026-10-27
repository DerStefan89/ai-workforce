/**
 * Datei: src/feature-auftrag/planung-schreiben.ts
 *
 * Zweck: F45 B5b-1b-1 „Planung schreiben“ (R6, F-984; features/F45/plan-b5b1b-v2.md, Advisor features/F45/advisor-b5b1b.md) —
 * reine Funktionen für PUT …/features/<id>/planung: pruefePlanungAenderung prüft und normalisiert den Körper,
 * bearbeitePlanungInAkte schreibt Priorität und Schätzungen in die Akte (Format src/workboard/feature-planung.ts, E-B5-1 = A) und
 * hängt eine Zeile unter '## Änderungen' an (E-B5-3). Den Meilenstein-Wechsel in roadmap.json rechnet
 * src/workboard/roadmap-schreiben.ts; Lesen, Hash, Sperre, Schreiben und Rückbau liegen bei scripts/leitstand/routen-planung.mjs.
 * Kein I/O, wirft nicht.
 *
 * Regeln (Plan v2 §2.2):
 * - Priorität: die erste Zeile `Priorität:` wird ersetzt, sonst eine neue Zeile direkt hinter der ersten `Status:`-Zeile angelegt.
 * - Schätzung: nur bei strengem Abschnitt `## Workstreams` ohne Formfehler; je angefragter ID wird ausschließlich der Inhalt der
 *   Zelle „Schätzung AT“ ersetzt (Leerraum der Zelle bleibt): `x` bei min = max, sonst `min–max`, Komma als Dezimalzeichen;
 *   keine Schätzung ⇒ `–`.
 * - Ein unveränderter Wert zählt nicht als Änderung; ohne jede Änderung (auch ohne Meilenstein-Wechsel) ⇒ 422.
 * - Zeilenende: das erste der Datei (Ausnahme zu ARCHITECTURE.md §7 für bestehende Akten, wie B5a-1). Rest bytegleich.
 * - Rundlauf: lesePlanung der neuen Akte liefert genau die angefragten Werte, die Status-Zeile bleibt. Das Feature-Akte-Gate
 *   (pruefeFeatureAkteInhalt) blockiert JEDEN Befund — wie B5a-1 (Advisor B1); „schon vor der Bearbeitung“ ändert nur die Meldung.
 *
 * Wird aufgerufen von: scripts/leitstand/routen-planung.mjs, src/feature-auftrag/ist-nach-abnahme.ts (workstreamZeilen,
 * ersetzeZelle; F45 B5b-3), src/feature-auftrag/planung-schreiben.test.ts (das Gate
 * scripts/check-f45-b5b1b1-planung-schreiben.mjs erreicht das Modul über die Route).
 *
 * Wichtig — bekannte Grenzen (DEKLARIERT): Workstream-Zeilen legt die Route nicht an (F30 bleibt bis zum Schnitt ohne Schätzung,
 * Advisor B5b-1 C7); Ausplanen (`meilenstein: null`) und Entfernen der Priorität (`prioritaet: null`) werden nicht unterstützt (qa 7); eine `Priorität:`-Zeile in einem Code-Fence vor der
 * echten zählt wie die echte (dieselbe Regel wie der Leser).
 */

import { leseFeatureStatus, pruefeFeatureAkteInhalt } from '../workboard/feature-akte-pruefung.ts'
import { type AktenPrioritaet, lesePlanung, PRIORITAETEN, type Schaetzung, WORKSTREAM_SPALTEN } from '../workboard/feature-planung.ts'
import { type Ersetzung, erkenneZeilenende, haengeAenderungAn, pruefeAkteGate, pruefeGrund, SHA256_MUSTER, STATUS_NICHT_BEARBEITBAR, wendeAn } from './akte-schreiben.ts'

/** Obergrenzen (Advisor C3: ohne Grenze schriebe String(n) Exponenten). */
export const PLANUNG_WORKSTREAM_OBERGRENZE = 100
export const SCHAETZUNG_OBERGRENZE = 1000

const SCHAETZUNG_ZAHL = /^\d+(?:\.\d{1,2})?$/

/** Ein normalisierter Planungsauftrag (Körper von PUT …/planung ohne Hashes). null = nicht angefragt. */
export interface PlanungAenderung {
  prioritaet: AktenPrioritaet | null
  meilenstein: string | null
  workstreams: { id: string; schaetzung: Schaetzung | null }[] | null
  grund: string
}

export type PlanungAenderungPruefung = { ok: true; aenderung: PlanungAenderung; hash: string; roadmapHash: string | null } | { ok: false; grund: string }

export type PlanungBearbeitung = { ok: true; inhalt: string; geaendert: string[] } | { ok: false; grund: string; verstoesse?: string[] }

/** Ein Meilenstein-Wechsel, wie ihn verschiebeFeature (src/workboard/roadmap-schreiben.ts) festgestellt hat. von null = Einplanen. */
export interface MeilensteinWechsel {
  von: string | null
  nach: string
}

/** true, wenn der Wert eine zulässige Schätzzahl ist (0–1000, höchstens zwei Nachkommastellen). @param wert - Rohwert @returns boolean */
function istSchaetzZahl(wert: unknown): wert is number {
  return typeof wert === 'number' && Number.isFinite(wert) && wert >= 0 && wert <= SCHAETZUNG_OBERGRENZE && SCHAETZUNG_ZAHL.test(String(wert))
}

/**
 * Prüft und normalisiert den Körper von PUT …/features/<id>/planung (genau { prioritaet?, meilenstein?, workstreams?, grund, hash,
 * roadmap_hash? }; roadmap_hash genau dann, wenn meilenstein da ist).
 * @param daten - geparster Körper
 * @returns { ok: true, aenderung, hash, roadmapHash } oder { ok: false, grund } (HTTP 400)
 */
export function pruefePlanungAenderung(daten: unknown): PlanungAenderungPruefung {
  const fehler = (grund: string): PlanungAenderungPruefung => ({ ok: false, grund })
  if (daten === null || typeof daten !== 'object' || Array.isArray(daten)) return fehler('Body muss ein JSON-Objekt { prioritaet?, meilenstein?, workstreams?, grund, hash, roadmap_hash? } sein')
  const obj = daten as Record<string, unknown>
  const erlaubt = ['prioritaet', 'meilenstein', 'workstreams', 'grund', 'hash', 'roadmap_hash']
  const fremd = Object.keys(obj).filter((k) => !erlaubt.includes(k))
  if (fremd.length > 0) return fehler(`unbekannte Felder: ${fremd.slice(0, 5).join(', ')} — erlaubt sind ${erlaubt.join(', ')}`)
  if (!('prioritaet' in obj) && !('meilenstein' in obj) && !('workstreams' in obj)) return fehler('mindestens eines von prioritaet, meilenstein, workstreams angeben')

  const grund = pruefeGrund(obj.grund)
  if (!grund.ok) return fehler(grund.grund)
  if (typeof obj.hash !== 'string' || !SHA256_MUSTER.test(obj.hash)) return fehler("'hash' muss ein sha256 (64 Hex-Zeichen, klein) sein — der Hash der gelesenen Akte")

  let prioritaet: AktenPrioritaet | null = null
  if ('prioritaet' in obj) {
    if (obj.prioritaet === null) return fehler('Entfernen der Priorität (prioritaet: null) wird nicht unterstützt — von Hand in der Akte')
    if (typeof obj.prioritaet !== 'string' || !(PRIORITAETEN as readonly string[]).includes(obj.prioritaet)) return fehler(`'prioritaet' muss eines von ${PRIORITAETEN.join(', ')} sein`)
    prioritaet = obj.prioritaet as AktenPrioritaet
  }

  let meilenstein: string | null = null
  let roadmapHash: string | null = null
  if ('meilenstein' in obj) {
    if (obj.meilenstein === null) return fehler('Ausplanen (meilenstein: null) wird nicht unterstützt — von Hand in roadmap.json')
    if (typeof obj.meilenstein !== 'string' || obj.meilenstein.trim() === '' || obj.meilenstein.length > 100 || /[\u0000-\u001f\u007f]/.test(obj.meilenstein)) return fehler("'meilenstein' muss eine Meilenstein-ID sein (nicht leer, höchstens 100 Zeichen, ohne Steuerzeichen)")
    if (typeof obj.roadmap_hash !== 'string' || !SHA256_MUSTER.test(obj.roadmap_hash)) return fehler("'roadmap_hash' fehlt oder ist kein sha256 — ein Meilenstein-Wechsel braucht den Hash der gelesenen roadmap.json (GET /api/roadmap)")
    meilenstein = obj.meilenstein
    roadmapHash = obj.roadmap_hash
  } else if ('roadmap_hash' in obj) {
    return fehler("'roadmap_hash' nur zusammen mit 'meilenstein'")
  }

  let workstreams: PlanungAenderung['workstreams'] = null
  if ('workstreams' in obj) {
    const liste = obj.workstreams
    if (!Array.isArray(liste) || liste.length === 0 || liste.length > PLANUNG_WORKSTREAM_OBERGRENZE) return fehler(`'workstreams' muss eine Liste mit 1 bis ${PLANUNG_WORKSTREAM_OBERGRENZE} Einträgen sein`)
    const ids = new Set<string>()
    workstreams = []
    for (const [index, eintrag] of liste.entries()) {
      const wo = `workstreams[${index}]`
      if (eintrag === null || typeof eintrag !== 'object' || Array.isArray(eintrag)) return fehler(`${wo} muss ein Objekt { id, schaetzung_min, schaetzung_max } sein`)
      const e = eintrag as Record<string, unknown>
      const fremdFelder = Object.keys(e).filter((k) => !['id', 'schaetzung_min', 'schaetzung_max'].includes(k))
      if (fremdFelder.length > 0 || !('schaetzung_min' in e) || !('schaetzung_max' in e)) return fehler(`${wo}: genau die Felder id, schaetzung_min, schaetzung_max`)
      if (typeof e.id !== 'string' || e.id.trim() === '' || e.id !== e.id.trim()) return fehler(`${wo}.id muss eine nicht-leere ID ohne Leerraum am Rand sein`)
      if (ids.has(e.id)) return fehler(`workstreams: ID '${e.id}' ist doppelt`)
      ids.add(e.id)
      if (e.schaetzung_min === null && e.schaetzung_max === null) {
        workstreams.push({ id: e.id, schaetzung: null })
        continue
      }
      if (!istSchaetzZahl(e.schaetzung_min) || !istSchaetzZahl(e.schaetzung_max)) return fehler(`${wo}: schaetzung_min und schaetzung_max sind beide null oder beide Zahlen von 0 bis ${SCHAETZUNG_OBERGRENZE} mit höchstens zwei Nachkommastellen`)
      if (e.schaetzung_min > e.schaetzung_max) return fehler(`${wo}: schaetzung_min ist größer als schaetzung_max`)
      workstreams.push({ id: e.id, schaetzung: { min: e.schaetzung_min, max: e.schaetzung_max } })
    }
  }

  return { ok: true, hash: obj.hash, roadmapHash, aenderung: { prioritaet, meilenstein, workstreams, grund: grund.wert } }
}

/**
 * Schreibt eine Schätzung im Zellformat des Lesers.
 * @param schaetzung - Schätzung oder null
 * @returns `–`, `x` oder `min–max` (Komma als Dezimalzeichen)
 */
export function formatiereSchaetzung(schaetzung: Schaetzung | null): string {
  if (schaetzung === null) return '–'
  const zahl = (wert: number) => String(wert).replace('.', ',')
  return schaetzung.min === schaetzung.max ? zahl(schaetzung.min) : `${zahl(schaetzung.min)}–${zahl(schaetzung.max)}`
}

/** true, wenn zwei Schätzungen gleich sind. @param a - Schätzung @param b - Schätzung @returns boolean */
function gleicheSchaetzung(a: Schaetzung | null, b: Schaetzung | null): boolean {
  return a === null || b === null ? a === b : a.min === b.min && a.max === b.max
}

/**
 * Die Tabellenzeilen des strengen Abschnitts `## Workstreams` mit ihrer Lage im Text (ab der dritten Tabellenzeile; Kopf und
 * Trennzeile zählen nicht). Vorausgesetzt ist eine Tabelle ohne Formfehler (lesePlanung).
 * @param inhalt - Dateitext
 * @returns je Zeile { start, text } (text ohne `\r`)
 */
export function workstreamZeilen(inhalt: string): { start: number; text: string }[] {
  const zeilen: { start: number; text: string }[] = []
  let start = 0
  for (const roh of inhalt.split('\n')) {
    zeilen.push({ start, text: roh.endsWith('\r') ? roh.slice(0, -1) : roh })
    start += roh.length + 1
  }
  const kopf = zeilen.findIndex((z) => /^##[ \t]+Workstreams[ \t]*$/.test(z.text))
  if (kopf === -1) return []
  const tabelle: { start: number; text: string }[] = []
  for (const z of zeilen.slice(kopf + 1)) {
    if (/^##(?:\s|$)/.test(z.text)) break
    if (z.text.trimStart().startsWith('|')) tabelle.push(z)
    else if (tabelle.length > 0) break
  }
  return tabelle.slice(2)
}

/**
 * Ersetzt den Inhalt einer Zelle einer Workstream-Zeile; der Leerraum der Zelle bleibt (auch F45 B5b-3, ist-nach-abnahme.ts).
 * @param zeile - Tabellenzeile ohne Zeilenende
 * @param spalte - Spaltenname aus WORKSTREAM_SPALTEN
 * @param wert - neuer Zellinhalt
 * @returns die Zeile mit ersetzter Zelle
 */
export function ersetzeZelle(zeile: string, spalte: (typeof WORKSTREAM_SPALTEN)[number], wert: string): string {
  const teile = zeile.split('|')
  // Feld 0 ist der Leerraum vor dem ersten `|`.
  const feld = WORKSTREAM_SPALTEN.indexOf(spalte) + 1
  const zelle = teile[feld] ?? ''
  teile[feld] = `${/^\s*/.exec(zelle)?.[0] ?? ''}${wert}${/\s*$/.exec(zelle)?.[0] ?? ''}`
  return teile.join('|')
}

/**
 * Schreibt Priorität und Schätzungen in die Akte und hängt die Änderungszeile an (Regeln im Dateikopf). Rein, wirft nicht.
 * @param inhalt - aktueller Dateitext (bereits als gültiges UTF-8 gelesen)
 * @param aenderung - normalisierte Änderung (pruefePlanungAenderung)
 * @param wechsel - Meilenstein-Wechsel oder null (kein Wechsel angefragt bzw. schon im Ziel)
 * @param datum - Datum der Änderungszeile (JJJJ-MM-TT)
 * @returns { ok: true, inhalt, geaendert } | { ok: false, grund, verstoesse? } (HTTP 422, nichts schreiben)
 */
export function bearbeitePlanungInAkte(inhalt: string, aenderung: PlanungAenderung, wechsel: MeilensteinWechsel | null, datum: string): PlanungBearbeitung {
  const status = leseFeatureStatus(inhalt)
  if (status !== null && STATUS_NICHT_BEARBEITBAR.has(status)) return { ok: false, grund: `Feature-Status '${status}' — abgeschlossene oder abgebrochene Akten werden im Leitstand nicht mehr bearbeitet (C15)` }
  const eol = erkenneZeilenende(inhalt)
  const planung = lesePlanung(inhalt)
  const ersetzungen: Ersetzung[] = []
  const felder: string[] = []
  const geaendert: string[] = []

  if (aenderung.prioritaet !== null && aenderung.prioritaet !== planung.prioritaet) {
    const zeile = /^Priorität:[^\r\n]*/m.exec(inhalt)
    if (zeile !== null) ersetzungen.push({ start: zeile.index, ende: zeile.index + zeile[0].length, text: `Priorität: ${aenderung.prioritaet}` })
    else {
      const statusZeile = /^Status:[^\r\n]*/m.exec(inhalt)
      if (statusZeile === null) return { ok: false, grund: 'Die Akte hat keine Status-Zeile — Priorität nicht einzuordnen, von Hand ergänzen' }
      const ende = statusZeile.index + statusZeile[0].length
      ersetzungen.push({ start: ende, ende, text: `${eol}Priorität: ${aenderung.prioritaet}` })
    }
    felder.push(`Priorität ${aenderung.prioritaet}`)
    geaendert.push('Priorität')
  }

  if (wechsel !== null) {
    felder.push(`Meilenstein ${wechsel.von ?? '–'} → ${wechsel.nach}`)
    geaendert.push('Meilenstein')
  }

  if (aenderung.workstreams !== null) {
    if (planung.workstreams === null) return { ok: false, grund: 'Die Akte hat keinen strengen Abschnitt „## Workstreams“ (Tabelle) — Schätzungen von Hand eintragen' }
    if (planung.workstreams_fehlerhaft) return { ok: false, grund: 'Der Abschnitt „## Workstreams“ hat Formfehler — erst von Hand beheben, dann erneut speichern', verstoesse: planung.befunde }
    const zeilen = workstreamZeilen(inhalt)
    const ids: string[] = []
    for (const anfrage of aenderung.workstreams) {
      const bestand = planung.workstreams.find((w) => w.id === anfrage.id)
      if (bestand === undefined) return { ok: false, grund: `Workstream '${anfrage.id}' steht nicht in „## Workstreams“ — Zeilen legt der Leitstand nicht an` }
      if (gleicheSchaetzung(bestand.schaetzung, anfrage.schaetzung)) continue
      const zeile = zeilen.find((z) => z.text.split('|')[1]?.trim() === anfrage.id)
      if (zeile === undefined) return { ok: false, grund: `Workstream '${anfrage.id}': Tabellenzeile nicht gefunden — von Hand eintragen` }
      ersetzungen.push({ start: zeile.start, ende: zeile.start + zeile.text.length, text: ersetzeZelle(zeile.text, 'Schätzung AT', formatiereSchaetzung(anfrage.schaetzung)) })
      ids.push(anfrage.id)
    }
    if (ids.length > 0) {
      felder.push(`Schätzung ${ids.join(', ')}`)
      geaendert.push('Schätzung')
    }
  }

  if (geaendert.length === 0) return { ok: false, grund: 'Keine Änderung an Priorität, Meilenstein oder Schätzungen — nichts geschrieben' }

  ersetzungen.push(haengeAenderungAn(inhalt, `- ${datum} · ${felder.join(', ')} · ${aenderung.grund}`, eol))
  const neu = wendeAn(inhalt, ersetzungen)

  // Akte-Gate wie B5a-1 (Advisor B1): jeder Befund blockiert, „schon vorher“ ändert nur die Meldung — dieselbe Funktion.
  const gate = pruefeAkteGate(pruefeFeatureAkteInhalt(inhalt), neu)
  if (gate !== null) return { ok: false, ...gate }
  const gelesen = lesePlanung(neu)
  const gleich =
    leseFeatureStatus(neu) === status &&
    (aenderung.prioritaet === null || gelesen.prioritaet === aenderung.prioritaet) &&
    (aenderung.workstreams ?? []).every((anfrage) => {
      const w = gelesen.workstreams?.find((eintrag) => eintrag.id === anfrage.id)
      return w !== undefined && gleicheSchaetzung(w.schaetzung, anfrage.schaetzung)
    })
  if (!gleich) return { ok: false, grund: 'Die bearbeitete Akte liest sich nicht wie angefragt (Priorität, Schätzung oder Status abweichend) — nichts geschrieben' }
  return { ok: true, inhalt: neu, geaendert }
}
