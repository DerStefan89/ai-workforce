/**
 * Datei: src/lineage-registry/index.ts
 *
 * Zweck: Artifact Registry / Lineage (Feature 2, plan-v2-feature2-
 * artifact-registry-lineage.md). Registriert Artefakt-Versionen (kern-
 * erzeugt mit eigener, inhaltsadressierter Identität; werkzeug-erzeugt als
 * reine Referenz), hält Eingaben fest, prüft mechanisch auf STALE und hält
 * eine menschliche STALE-Entscheidung unveränderlich fest.
 *
 * Architektur (plan-v2 Delta 1): Lineage-Einträge sind Checkpoints. Jede
 * Schreiboperation läuft ausschließlich über die echte, unveränderte
 * schreibeCheckpoint-Funktion aus src/checkpoint-store/index.ts (F1) auf
 * der Kette lauf_id = `lineage-${artefaktId}`. Kein eigener Dateibaum
 * unter kontrollzustand/, keine eigene version_sequenz-Zählung — die
 * Version ist die Checkpoint-sequenz. F1s eigene checkpoint_*-Ereignisse
 * werden beim internen Aufruf bewusst mit einem stillen Schreiber
 * unterdrückt (plan-v2 Offener Punkt 2) — diese Registry protokolliert
 * ihre eigenen, höherstufigen lineage_*-Ereignisse.
 */

import {
  kanonischesJson,
  ladeGueltigeCheckpoints,
  schreibeCheckpoint,
  sha256Hex,
  validiereCheckpointEintrag,
} from '../checkpoint-store/index.ts'
import type { KontrollzustandEintrag, ProfilReferenz } from '../checkpoint-store/types.ts'
import type {
  ArtefaktVersion,
  ArtefaktVersionDaten,
  EingabeReferenz,
  Entscheidung,
  Erzeugungsart,
  LineageEreignis,
  LineageSchreiber,
  StaleEntscheidungDaten,
} from './types.ts'

const DATEINAME_MUSTER = /^(\d+)-([0-9a-f]{64})\.json$/

interface Optionen {
  schreiber?: LineageSchreiber
  basisVerzeichnis?: string
}

function laufId(artefaktId: string): string {
  return `lineage-${artefaktId}`
}

function jetzt(): string {
  return new Date().toISOString()
}

function standardSchreiber(ereignis: LineageEreignis): void {
  console.log(JSON.stringify(ereignis))
}

function stillerCheckpointSchreiber(): void {
  // F1s eigene checkpoint_*-Ereignisse werden bewusst unterdrückt — siehe
  // Kopfkommentar / plan-v2 Offener Punkt 2. Nicht durchreichen.
}

/** versionSequenz aus dem von schreibeCheckpoint zurückgegebenen pfad lesen (Dateinamensmuster <sequenz>-<hash>.json). */
function versionSequenzAusPfad(pfad: string): number {
  const dateiname = pfad.split(/[\\/]/).pop() ?? ''
  const treffer = DATEINAME_MUSTER.exec(dateiname)
  if (!treffer) {
    throw new Error(`Dateiname entspricht nicht dem Muster <sequenz>-<hash>.json: ${dateiname}`)
  }
  return Number(treffer[1])
}

function istArtefaktVersion(daten: unknown): daten is ArtefaktVersionDaten {
  return (
    typeof daten === 'object' &&
    daten !== null &&
    (daten as Record<string, unknown>).typ === 'lineage' &&
    (daten as Record<string, unknown>).art === 'artefakt_version'
  )
}

// ─── Registrieren ────────────────────────────────────────────────────────

export function registriereKernArtefakt(
  artefaktId: string,
  profilReferenz: ProfilReferenz,
  herkunft: unknown,
  daten: unknown,
  eingaben?: EingabeReferenz[],
  optionen: Optionen = {}
): { pfad: string; versionSequenz: number; inhaltsHash: string } {
  const schreiber = optionen.schreiber ?? standardSchreiber
  const inhaltsHash = sha256Hex(kanonischesJson(daten))
  const lineageDaten: ArtefaktVersionDaten = {
    typ: 'lineage',
    art: 'artefakt_version',
    artefakt_id: artefaktId,
    erzeugungsart: 'kern',
    inhalts_hash: inhaltsHash,
    herkunft,
    eingaben: eingaben ?? [],
    daten,
  }

  const { pfad } = schreibeCheckpoint(laufId(artefaktId), profilReferenz, lineageDaten, {
    basisVerzeichnis: optionen.basisVerzeichnis,
    schreiber: stillerCheckpointSchreiber,
  })
  const versionSequenz = versionSequenzAusPfad(pfad)

  schreiber({ ereignis: 'lineage_registriert', artefakt_id: artefaktId, zeitstempel: jetzt(), versionSequenz })
  return { pfad, versionSequenz, inhaltsHash }
}

export function registriereWerkzeugReferenz(
  artefaktId: string,
  profilReferenz: ProfilReferenz,
  pfad: string,
  zitierterBereich: unknown,
  inhalt: string,
  herkunft?: unknown,
  eingaben?: EingabeReferenz[],
  optionen: Optionen = {}
): { pfad: string; versionSequenz: number; inhaltsHash: string } {
  const schreiber = optionen.schreiber ?? standardSchreiber
  const inhaltsHash = sha256Hex(inhalt)
  const lineageDaten: ArtefaktVersionDaten = {
    typ: 'lineage',
    art: 'artefakt_version',
    artefakt_id: artefaktId,
    erzeugungsart: 'werkzeug',
    inhalts_hash: inhaltsHash,
    ...(herkunft !== undefined ? { herkunft } : {}),
    eingaben: eingaben ?? [],
    pfad,
    zitierter_bereich: zitierterBereich,
  }

  const { pfad: geschriebenerPfad } = schreibeCheckpoint(laufId(artefaktId), profilReferenz, lineageDaten, {
    basisVerzeichnis: optionen.basisVerzeichnis,
    schreiber: stillerCheckpointSchreiber,
  })
  const versionSequenz = versionSequenzAusPfad(geschriebenerPfad)

  schreiber({ ereignis: 'lineage_registriert', artefakt_id: artefaktId, zeitstempel: jetzt(), versionSequenz })
  return { pfad: geschriebenerPfad, versionSequenz, inhaltsHash }
}

// ─── Lesen ────────────────────────────────────────────────────────────────

function artefaktVersionAusEintrag(artefaktId: string, eintrag: KontrollzustandEintrag): ArtefaktVersion {
  const daten = eintrag.payload.daten as ArtefaktVersionDaten
  return {
    artefaktId,
    versionSequenz: eintrag.payload.sequenz,
    erzeugungsart: daten.erzeugungsart,
    inhaltsHash: daten.inhalts_hash,
    herkunft: daten.herkunft,
    eingaben: daten.eingaben,
    ...(daten.daten !== undefined ? { daten: daten.daten } : {}),
  }
}

/** Alle artefakt_version-Einträge der Kette, aufsteigend nach sequenz. */
export function listeVersionen(artefaktId: string, optionen: Optionen = {}): ArtefaktVersion[] {
  const schreiber = optionen.schreiber ?? standardSchreiber
  const kandidaten = ladeGueltigeCheckpoints(laufId(artefaktId), {
    basisVerzeichnis: optionen.basisVerzeichnis,
    schreiber: stillerCheckpointSchreiber,
  })
  const versionen = kandidaten.filter((eintrag) => istArtefaktVersion(eintrag.payload.daten))
  if (versionen.length === 0) {
    schreiber({ ereignis: 'lineage_kein_gueltiger_gefunden', artefakt_id: artefaktId, zeitstempel: jetzt() })
    return []
  }
  schreiber({ ereignis: 'lineage_geladen', artefakt_id: artefaktId, zeitstempel: jetzt() })
  return versionen.map((eintrag) => artefaktVersionAusEintrag(artefaktId, eintrag))
}

/** Ohne versionSequenz: höchste sequenz unter den artefakt_version-Einträgen. Mit versionSequenz: exakter Treffer oder null (kein Wurf). */
export function ladeArtefaktVersion(artefaktId: string, versionSequenz?: number, optionen: Optionen = {}): ArtefaktVersion | null {
  const versionen = listeVersionen(artefaktId, { ...optionen, schreiber: stillerLineageSchreiber })
  const schreiber = optionen.schreiber ?? standardSchreiber

  let treffer: ArtefaktVersion | undefined
  if (versionSequenz === undefined) {
    treffer = versionen[versionen.length - 1]
  } else {
    treffer = versionen.find((v) => v.versionSequenz === versionSequenz)
  }

  if (treffer === undefined) {
    schreiber({ ereignis: 'lineage_kein_gueltiger_gefunden', artefakt_id: artefaktId, zeitstempel: jetzt() })
    return null
  }
  schreiber({ ereignis: 'lineage_geladen', artefakt_id: artefaktId, zeitstempel: jetzt(), versionSequenz: treffer.versionSequenz })
  return treffer
}

function stillerLineageSchreiber(): void {
  // ladeArtefaktVersion ruft listeVersionen intern auf und protokolliert
  // sein eigenes lineage_geladen/lineage_kein_gueltiger_gefunden separat
  // — die interne listeVersionen-Ereigniszeile wird deshalb unterdrückt.
}

// ─── STALE-Prüfung und -Entscheidung ────────────────────────────────────────

export function pruefeStale(
  artefaktId: string,
  versionSequenz: number,
  aktuelleEingabeInhalte: Record<string, string>,
  optionen: Optionen = {}
): { stale: boolean; geaenderteEingaben: string[] } {
  const schreiber = optionen.schreiber ?? standardSchreiber
  const version = ladeArtefaktVersion(artefaktId, versionSequenz, { ...optionen, schreiber: stillerLineageSchreiber })

  const geaenderteEingaben: string[] = []
  if (version !== null) {
    for (const eingabe of version.eingaben) {
      const aktuellerInhalt = aktuelleEingabeInhalte[eingabe.pfad]
      if (aktuellerInhalt === undefined) continue
      if (sha256Hex(aktuellerInhalt) !== eingabe.inhalts_hash) {
        geaenderteEingaben.push(eingabe.pfad)
      }
    }
  }

  const stale = geaenderteEingaben.length > 0
  schreiber({ ereignis: 'lineage_stale_geprueft', artefakt_id: artefaktId, zeitstempel: jetzt(), versionSequenz, geaenderteEingaben })
  return { stale, geaenderteEingaben }
}

export function haltFestStaleEntscheidung(
  artefaktId: string,
  versionSequenz: number,
  profilReferenz: ProfilReferenz,
  entscheidung: Entscheidung,
  begruendung?: string,
  betroffeneEingaben?: string[],
  optionen: Optionen = {}
): { pfad: string; versionSequenz: number } {
  if (entscheidung === 'unveraendert_gueltig' && (begruendung === undefined || begruendung.length === 0)) {
    throw new Error("'begruendung' ist bei entscheidung 'unveraendert_gueltig' Pflicht")
  }

  const schreiber = optionen.schreiber ?? standardSchreiber
  const lineageDaten: StaleEntscheidungDaten = {
    typ: 'lineage',
    art: 'stale_entscheidung',
    artefakt_id: artefaktId,
    bezieht_sich_auf: { sequenz: versionSequenz },
    entscheidung,
    ...(begruendung !== undefined ? { begruendung } : {}),
    ...(betroffeneEingaben !== undefined ? { betroffene_eingaben: betroffeneEingaben } : {}),
  }

  const { pfad } = schreibeCheckpoint(laufId(artefaktId), profilReferenz, lineageDaten, {
    basisVerzeichnis: optionen.basisVerzeichnis,
    schreiber: stillerCheckpointSchreiber,
  })
  const geschriebeneSequenz = versionSequenzAusPfad(pfad)

  schreiber({
    ereignis: 'lineage_entscheidung_festgehalten',
    artefakt_id: artefaktId,
    zeitstempel: jetzt(),
    versionSequenz: geschriebeneSequenz,
  })
  return { pfad, versionSequenz: geschriebeneSequenz }
}

// ─── Validierung ─────────────────────────────────────────────────────────

const ERZEUGUNGSARTEN = new Set<Erzeugungsart>(['kern', 'werkzeug'])
const ENTSCHEIDUNGEN = new Set<Entscheidung>(['neu_erzeugen', 'nachtrag', 'unveraendert_gueltig'])

function validiereArtefaktVersionDaten(daten: Record<string, unknown>): string[] {
  const verstoesse: string[] = []
  const erlaubt = new Set(['typ', 'art', 'artefakt_id', 'erzeugungsart', 'inhalts_hash', 'herkunft', 'eingaben', 'daten', 'pfad', 'zitierter_bereich'])
  for (const feld of Object.keys(daten)) {
    if (!erlaubt.has(feld)) verstoesse.push(`unbekanntes Feld 'daten.${feld}' (additionalProperties: false)`)
  }
  if (typeof daten.artefakt_id !== 'string' || daten.artefakt_id.length === 0) {
    verstoesse.push("'daten.artefakt_id' muss ein nicht-leerer String sein")
  }
  if (typeof daten.erzeugungsart !== 'string' || !ERZEUGUNGSARTEN.has(daten.erzeugungsart as Erzeugungsart)) {
    verstoesse.push("'daten.erzeugungsart' muss 'kern' oder 'werkzeug' sein")
  }
  if (typeof daten.inhalts_hash !== 'string' || daten.inhalts_hash.length < 64) {
    verstoesse.push("'daten.inhalts_hash' muss ein String mit mindestens 64 Zeichen sein")
  }
  if (!('herkunft' in daten)) {
    verstoesse.push("Pflichtfeld 'daten.herkunft' fehlt")
  }
  if (daten.erzeugungsart === 'werkzeug') {
    if (typeof daten.pfad !== 'string' || daten.pfad.length === 0) {
      verstoesse.push("'daten.pfad' ist bei erzeugungsart 'werkzeug' Pflicht")
    }
    if (!('zitierter_bereich' in daten)) {
      verstoesse.push("'daten.zitierter_bereich' ist bei erzeugungsart 'werkzeug' Pflicht")
    }
    if ('daten' in daten) {
      verstoesse.push("'daten.daten' ist bei erzeugungsart 'werkzeug' verboten")
    }
  }
  return verstoesse
}

function validiereStaleEntscheidungDaten(daten: Record<string, unknown>): string[] {
  const verstoesse: string[] = []
  const erlaubt = new Set(['typ', 'art', 'artefakt_id', 'bezieht_sich_auf', 'entscheidung', 'begruendung', 'betroffene_eingaben'])
  for (const feld of Object.keys(daten)) {
    if (!erlaubt.has(feld)) verstoesse.push(`unbekanntes Feld 'daten.${feld}' (additionalProperties: false)`)
  }
  if (typeof daten.artefakt_id !== 'string' || daten.artefakt_id.length === 0) {
    verstoesse.push("'daten.artefakt_id' muss ein nicht-leerer String sein")
  }
  const beziehtSich = daten.bezieht_sich_auf as Record<string, unknown> | undefined
  if (typeof beziehtSich !== 'object' || beziehtSich === null || !Number.isInteger(beziehtSich.sequenz)) {
    verstoesse.push("'daten.bezieht_sich_auf.sequenz' muss ein Integer sein")
  }
  if (typeof daten.entscheidung !== 'string' || !ENTSCHEIDUNGEN.has(daten.entscheidung as Entscheidung)) {
    verstoesse.push("'daten.entscheidung' muss 'neu_erzeugen', 'nachtrag' oder 'unveraendert_gueltig' sein")
  }
  if (daten.entscheidung === 'unveraendert_gueltig' && (typeof daten.begruendung !== 'string' || daten.begruendung.length === 0)) {
    verstoesse.push("'daten.begruendung' ist bei entscheidung 'unveraendert_gueltig' Pflicht")
  }
  return verstoesse
}

/** Reine Funktion: prüft zuerst die F1-Hülle (validiereCheckpointEintrag), bei Verstößen sofortige Rückgabe. Sonst zusätzlich payload.daten (Lineage-Payload). */
export function validiereLineageEintrag(eintrag: unknown): string[] {
  const huellenVerstoesse = validiereCheckpointEintrag(eintrag)
  if (huellenVerstoesse.length > 0) return huellenVerstoesse

  const obj = eintrag as { payload: { daten?: unknown } }
  const daten = obj.payload.daten
  if (typeof daten !== 'object' || daten === null || Array.isArray(daten)) {
    return ["'payload.daten' muss ein Objekt mit typ === 'lineage' sein"]
  }
  const datenObj = daten as Record<string, unknown>
  if (datenObj.typ !== 'lineage') {
    return ["'payload.daten.typ' muss 'lineage' sein"]
  }

  if (datenObj.art === 'artefakt_version') return validiereArtefaktVersionDaten(datenObj)
  if (datenObj.art === 'stale_entscheidung') return validiereStaleEntscheidungDaten(datenObj)
  return ["'payload.daten.art' muss 'artefakt_version' oder 'stale_entscheidung' sein"]
}
