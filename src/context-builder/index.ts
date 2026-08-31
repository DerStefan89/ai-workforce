/**
 * Datei: src/context-builder/index.ts
 *
 * Zweck: Context Builder (Feature 5, state/plan-v2-f5-context-builder.md +
 * state/tasks/f5-context-builder.md). Baut aus einer Anfrageliste (Pfad,
 * Frage, Begründung, vom Aufrufer bereits gelesener Inhalt) ein begrenztes
 * Kontextpaket je Auftrag und Rolle (§16.2), gezielt statt als Vollkopie
 * (Entscheidung 59/107): Rollenfilter, Duplikat-/Widerspruchserkennung über
 * einen zusammengesetzten Element-Schlüssel, zweiphasige Budget-Vergabe
 * (notwendige Anfragen zuerst — Evidenz vor Budget, Entscheidung 115).
 *
 * Eigenständiges Modul (D1, wie F2 gegenüber F1, F3/F9 gegenüber F1B/F2):
 * ruft F2s registriereKernArtefakt/pruefeStale ausschließlich von außen
 * auf, kein Eingriff in src/lineage-registry/. Liest keine Dateien selbst
 * (AC8) — jeder Inhalt kommt vom Aufrufer als Anfrage.inhalt.
 *
 * Kein Runtime-/Modell-Feld im Schema (E-191 N1/N2) — Rollenname bleibt vom
 * Anbieter-/Modellbezug getrennt.
 */

import { sha256Hex } from '../checkpoint-store/index.ts'
import type { ProfilReferenz } from '../checkpoint-store/types.ts'
import { pruefeStale, registriereKernArtefakt } from '../lineage-registry/index.ts'
import type { EingabeReferenz } from '../lineage-registry/types.ts'
import { ROLLEN_AUSSCHLUSSMUSTER } from './types.ts'
import type { Anfrage, Budget, Ereignis, KontextpaketAusschluss, KontextpaketElement, KontextpaketErgebnis, KontextpaketV0Daten, Schreiber } from './types.ts'

interface Optionen {
  basisVerzeichnis?: string
  schreiber?: Schreiber
}

function jetzt(): string {
  return new Date().toISOString()
}

function standardSchreiber(ereignis: Ereignis): void {
  console.log(JSON.stringify(ereignis))
}

function stillerLineageSchreiber(): void {
  // Unterdrückt F2s eigene lineage_*-Ereignisse — dieses Modul protokolliert
  // seine eigenen, höherstufigen kontextpaket_*-Ereignisse (Muster F1B/F2).
}

function kontextpaketArtefaktId(laufId: string): string {
  return `kontextpaket-${laufId}`
}

/** Anfrage → Element-Schlüssel: Pfad allein, oder Pfad+Bereichs-Kennung, wenn mehrere Zitate derselben Datei unterscheidbar bleiben müssen (Delta 1, löst B1). */
export function elementSchluessel(anfrage: Anfrage): string {
  return anfrage.bereichsKennung !== undefined ? `${anfrage.pfad}#${anfrage.bereichsKennung}` : anfrage.pfad
}

/** Exakte Gleichheit oder Verzeichnis-Präfix mit literalem Suffix "/**" — kein Regex, keine Glob-Dependency (Delta 3, D6, YAGNI). */
export function passtMuster(pfad: string, muster: string): boolean {
  if (muster.endsWith('/**')) return pfad.startsWith(muster.slice(0, -2))
  return pfad === muster
}

function byteLaenge(text: string): number {
  return Buffer.byteLength(text, 'utf8')
}

/**
 * Baut ein Kontextpaket für laufId/rolle aus anfragen — Ablauf in fester
 * Reihenfolge (state/tasks/f5-context-builder.md SCOPE.3):
 * 1. Rollenprüfung (unbekannte Rolle → Abbruch, Delta 2, löst B2)
 * 2. '#' im rohen Pfad → Abbruch (Nachtrag V3)
 * 3. Rollenfilter auf dem rohen Pfad (vor Schlüsselbildung)
 * 4. Element-Schlüsselbildung, Duplikat-Idempotenz, Widerspruchsprüfung (Nachtrag V4)
 * 5. Zweiphasige Budget-Vergabe: notwendige Anfragen zuerst, kumulativ
 *    gegen das volle Budget; passt eine nicht, Stopp ohne Phase B
 *    (Delta 4 + Nachtrag-Pseudocode, löst B4)
 * 6. Registrierung über F2s registriereKernArtefakt (AC6)
 *
 * Kein Wurf bei einem der benannten Fehlerzustände (D4-Muster) — jede
 * Ablehnung ist { ok: false, grund, … }.
 */
export function baueKontextpaket(
  laufId: string,
  rolle: string,
  anfragen: Anfrage[],
  profilReferenz: ProfilReferenz,
  budget: Budget,
  optionen: Optionen = {}
): KontextpaketErgebnis {
  const schreiber = optionen.schreiber ?? standardSchreiber
  const lineageOptionen = { basisVerzeichnis: optionen.basisVerzeichnis, schreiber: stillerLineageSchreiber }

  // 1. Rollenprüfung — fail-closed bei unbekannter Rolle (Delta 2)
  if (!Object.hasOwn(ROLLEN_AUSSCHLUSSMUSTER, rolle)) {
    schreiber({ ereignis: 'kontextpaket_unbekannte_rolle', zeitstempel: jetzt(), lauf_id: laufId, rolle })
    return { ok: false, grund: 'unbekannte_rolle', rolle }
  }

  // 2. '#' im rohen Pfad ist verboten — reserviert für die Schlüsselbildung (Nachtrag V3)
  for (const anfrage of anfragen) {
    if (anfrage.pfad.includes('#')) {
      schreiber({ ereignis: 'kontextpaket_ungueltiger_pfad', zeitstempel: jetzt(), lauf_id: laufId, pfad: anfrage.pfad })
      return { ok: false, grund: 'ungueltiger_pfad', pfad: anfrage.pfad }
    }
  }

  // 3. Rollenfilter auf dem rohen Pfad, vor jeder Schlüsselbildung
  const ausschlussmuster = ROLLEN_AUSSCHLUSSMUSTER[rolle]
  const ausgeschlossen: KontextpaketAusschluss[] = []
  const nachRollenfilter: Anfrage[] = []
  for (const anfrage of anfragen) {
    if (ausschlussmuster.some((muster) => passtMuster(anfrage.pfad, muster))) {
      ausgeschlossen.push({ pfad: anfrage.pfad, grund: 'rolle' })
    } else {
      nachRollenfilter.push(anfrage)
    }
  }

  // 4. Element-Schlüssel bilden, Duplikate überspringen, Widersprüche ablehnen
  interface Eintrag {
    anfrage: Anfrage
    schluessel: string
    hash: string
  }
  const bekannt = new Map<string, Eintrag>()
  const eindeutig: Eintrag[] = []
  for (const anfrage of nachRollenfilter) {
    const schluessel = elementSchluessel(anfrage)
    const hash = sha256Hex(anfrage.inhalt)
    const bestehender = bekannt.get(schluessel)
    if (bestehender !== undefined) {
      if (bestehender.hash === hash) continue // identisches zweites Vorkommen — Idempotenz, kein Ausschluss
      schreiber({ ereignis: 'kontextpaket_widerspruechliche_anfrage', zeitstempel: jetzt(), lauf_id: laufId, pfad: schluessel })
      return { ok: false, grund: 'widerspruechliche_anfrage', pfad: schluessel }
    }
    const eintrag: Eintrag = { anfrage, schluessel, hash }
    bekannt.set(schluessel, eintrag)
    eindeutig.push(eintrag)
  }

  // 5. Zweiphasige Budget-Vergabe (Delta 4 + Nachtrag)
  const notwendige = eindeutig.filter((e) => e.anfrage.notwendig === true)
  const optionale = eindeutig.filter((e) => e.anfrage.notwendig !== true)
  const maxElemente = budget.maxElemente ?? Number.POSITIVE_INFINITY
  const maxBytes = budget.maxBytes ?? Number.POSITIVE_INFINITY

  let restElemente = maxElemente
  let restBytes = maxBytes
  const nichtAufnehmbar: string[] = []
  const angenommen: Eintrag[] = []

  // Phase A — notwendige Anfragen, kumulativ gegen das volle Budget
  for (const eintrag of notwendige) {
    const bytes = byteLaenge(eintrag.anfrage.inhalt)
    if (restElemente - 1 < 0 || restBytes - bytes < 0) {
      nichtAufnehmbar.push(eintrag.schluessel) // nicht vom Budget abziehen, kein Abbruch bei der ersten
      continue
    }
    restElemente -= 1
    restBytes -= bytes
    angenommen.push(eintrag)
  }

  if (nichtAufnehmbar.length > 0) {
    schreiber({ ereignis: 'kontextpaket_evidenzluecke', zeitstempel: jetzt(), lauf_id: laufId, rolle })
    return { ok: false, grund: 'EVIDENZLUECKE', nichtAufnehmbar }
  }

  // Phase B — optionale Anfragen, gegen das nach Phase A verbleibende Restbudget
  for (const eintrag of optionale) {
    const bytes = byteLaenge(eintrag.anfrage.inhalt)
    if (restElemente - 1 < 0 || restBytes - bytes < 0) {
      ausgeschlossen.push({ pfad: eintrag.schluessel, grund: 'budget' })
      continue
    }
    restElemente -= 1
    restBytes -= bytes
    angenommen.push(eintrag)
  }

  // 6. Erfolg — registrieren über F2
  const elemente: KontextpaketElement[] = angenommen.map(({ schluessel, hash, anfrage }) => ({
    pfad: schluessel,
    zitierter_bereich: anfrage.bereichsKennung ?? null,
    inhalts_hash: hash,
  }))
  const eingaben: EingabeReferenz[] = elemente.map((element) => ({
    pfad: element.pfad,
    zitierter_bereich: element.zitierter_bereich,
    inhalts_hash: element.inhalts_hash,
  }))
  const paket: KontextpaketV0Daten = {
    kontextpaket_schema: 'v0',
    lauf_id: laufId,
    rolle,
    elemente,
    ausgeschlossen,
    erstellt_am: jetzt(),
  }

  const { pfad, versionSequenz, inhaltsHash } = registriereKernArtefakt(
    kontextpaketArtefaktId(laufId),
    profilReferenz,
    { rolle, quelle: 'context-builder' },
    paket,
    eingaben,
    lineageOptionen
  )

  schreiber({ ereignis: 'kontextpaket_gebaut', zeitstempel: jetzt(), lauf_id: laufId, rolle, versionSequenz })
  return { ok: true, pfad, versionSequenz, inhaltsHash, paket }
}

/**
 * Dünner Aufrufer von F2s pruefeStale gegen ein bereits gebautes
 * Kontextpaket — keine eigene Logik. aktuelleEingabeInhalte muss mit
 * denselben zusammengesetzten Schlüsseln befüllt werden, die im
 * zurückgegebenen paket.elemente[].pfad stehen. Bei nicht existierender
 * Referenz liefert F2s pruefeStale still { stale: false } (kein Wurf,
 * Delta 5, löst B5) — unverändert durchgereicht.
 */
export function pruefeKontextpaketFrisch(
  laufId: string,
  versionSequenz: number,
  aktuelleEingabeInhalte: Record<string, string>,
  optionen: Optionen = {}
): { stale: boolean; geaenderteEingaben: string[] } {
  const schreiber = optionen.schreiber ?? standardSchreiber
  const lineageOptionen = { basisVerzeichnis: optionen.basisVerzeichnis, schreiber: stillerLineageSchreiber }
  const { stale, geaenderteEingaben } = pruefeStale(kontextpaketArtefaktId(laufId), versionSequenz, aktuelleEingabeInhalte, lineageOptionen)
  schreiber({ ereignis: 'kontextpaket_stale_geprueft', zeitstempel: jetzt(), lauf_id: laufId, versionSequenz, stale })
  return { stale, geaenderteEingaben }
}

// ─── Schemaprüfung (Gate-Skript, handgeschrieben, D5, kein ajv) ────────────

function validiereKontextpaketElement(wert: unknown): string[] {
  if (typeof wert !== 'object' || wert === null || Array.isArray(wert)) {
    return ['Element muss ein Objekt sein']
  }
  const obj = wert as Record<string, unknown>
  const verstoesse: string[] = []
  const erlaubt = new Set(['pfad', 'zitierter_bereich', 'inhalts_hash'])
  for (const feld of Object.keys(obj)) {
    if (!erlaubt.has(feld)) verstoesse.push(`unbekanntes Feld 'elemente[].${feld}' (additionalProperties: false)`)
  }
  if (typeof obj.pfad !== 'string' || obj.pfad.length === 0) verstoesse.push("'elemente[].pfad' muss ein nicht-leerer String sein")
  if (obj.zitierter_bereich !== null && typeof obj.zitierter_bereich !== 'string') {
    verstoesse.push("'elemente[].zitierter_bereich' muss ein String oder null sein")
  }
  if (typeof obj.inhalts_hash !== 'string' || obj.inhalts_hash.length === 0) {
    verstoesse.push("'elemente[].inhalts_hash' muss ein nicht-leerer String sein")
  }
  return verstoesse
}

function validiereKontextpaketAusschluss(wert: unknown): string[] {
  if (typeof wert !== 'object' || wert === null || Array.isArray(wert)) {
    return ['Ausschluss muss ein Objekt sein']
  }
  const obj = wert as Record<string, unknown>
  const verstoesse: string[] = []
  const erlaubt = new Set(['pfad', 'grund'])
  for (const feld of Object.keys(obj)) {
    if (!erlaubt.has(feld)) verstoesse.push(`unbekanntes Feld 'ausgeschlossen[].${feld}' (additionalProperties: false)`)
  }
  if (typeof obj.pfad !== 'string' || obj.pfad.length === 0) verstoesse.push("'ausgeschlossen[].pfad' muss ein nicht-leerer String sein")
  if (obj.grund !== 'rolle' && obj.grund !== 'budget') verstoesse.push("'ausgeschlossen[].grund' muss 'rolle' oder 'budget' sein")
  return verstoesse
}

/** Reine Funktion: prüft ein geparstes Objekt gegen schemas/kontrollzustand-kontextpaket-payload.schema.json. */
export function validiereKontextpaketDaten(daten: unknown): string[] {
  if (typeof daten !== 'object' || daten === null || Array.isArray(daten)) {
    return ['Wurzel ist kein Objekt']
  }
  const obj = daten as Record<string, unknown>
  const verstoesse: string[] = []
  const erlaubt = new Set(['kontextpaket_schema', 'lauf_id', 'rolle', 'elemente', 'ausgeschlossen', 'erstellt_am'])
  for (const feld of Object.keys(obj)) {
    if (!erlaubt.has(feld)) verstoesse.push(`unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  if (obj.kontextpaket_schema !== 'v0') verstoesse.push("'kontextpaket_schema' muss 'v0' sein")
  if (typeof obj.lauf_id !== 'string' || obj.lauf_id.length === 0) verstoesse.push("'lauf_id' muss ein nicht-leerer String sein")
  if (typeof obj.rolle !== 'string' || obj.rolle.length === 0) verstoesse.push("'rolle' muss ein nicht-leerer String sein")
  if (!Array.isArray(obj.elemente)) {
    verstoesse.push("'elemente' muss ein Array sein")
  } else {
    obj.elemente.forEach((element, index) => {
      verstoesse.push(...validiereKontextpaketElement(element).map((v) => `elemente[${index}]: ${v}`))
    })
  }
  if (!Array.isArray(obj.ausgeschlossen)) {
    verstoesse.push("'ausgeschlossen' muss ein Array sein")
  } else {
    obj.ausgeschlossen.forEach((ausschluss, index) => {
      verstoesse.push(...validiereKontextpaketAusschluss(ausschluss).map((v) => `ausgeschlossen[${index}]: ${v}`))
    })
  }
  if (typeof obj.erstellt_am !== 'string' || obj.erstellt_am.length === 0) {
    verstoesse.push("'erstellt_am' muss ein nicht-leerer String sein")
  }
  return verstoesse
}
