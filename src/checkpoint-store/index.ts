/**
 * Datei: src/checkpoint-store/index.ts
 *
 * Zweck: Checkpoint Store (Feature 1, state/plan-v2-feature1-checkpoint-store.md).
 * Persistiert einen Kontrollzustand-Checkpoint pro lauf_id als eigene, nie
 * überschriebene Datei (kontrollzustand/<lauf_id>/checkpoints/
 * <sequenz>-<selbst_hash>.json), lädt und validiert die gespeicherte Kette
 * beim Laden und bestimmt daraus den zuletzt gültigen Checkpoint.
 *
 * Kettenprüfung (D3): vollständiger Rückwärtslauf ab dem höchsten
 * vorhandenen sequenz-Wert — ein Kandidat gilt nur als gültig, wenn er
 * selbst strukturell/inhaltlich korrekt ist UND sein gesamter Vorgänger-
 * Pfad bis sequenz 1 durchgehend gültig ist. Eine reine interne
 * Selbst-Hash-Konsistenz genügt nicht (B6): der im Dateinamen kodierte
 * Hash muss zusätzlich zum real errechneten Inhalts-Hash passen, sonst
 * würde ein Checkpoint akzeptiert, dessen Inhalt geändert wurde, ohne den
 * Dateinamen anzupassen.
 */

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CheckpointPayload, Ereignis, KontrollzustandEintrag, ProfilReferenz, Schreiber } from './types.ts'

const STANDARD_BASISVERZEICHNIS = 'kontrollzustand'
const DATEINAME_MUSTER = /^(\d+)-([0-9a-f]{64})\.json$/
const MAX_RENAME_VERSUCHE = 5
const RENAME_WARTE_MS = 20

interface Optionen {
  schreiber?: Schreiber
  basisVerzeichnis?: string
}

interface Kandidat {
  sequenz: number
  hashImDateiname: string
  pfad: string
  eintrag?: KontrollzustandEintrag
}

// ─── Kanonische Serialisierung / Hash ───────────────────────────────────────

function sortiereRekursiv(wert: unknown): unknown {
  if (Array.isArray(wert)) return wert.map(sortiereRekursiv)
  if (wert !== null && typeof wert === 'object') {
    const sortiert: Record<string, unknown> = {}
    for (const schluessel of Object.keys(wert as Record<string, unknown>).sort()) {
      sortiert[schluessel] = sortiereRekursiv((wert as Record<string, unknown>)[schluessel])
    }
    return sortiert
  }
  return wert
}

export function kanonischesJson(wert: unknown): string {
  return JSON.stringify(sortiereRekursiv(wert))
}

export function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

function echterInhaltsHash(eintrag: KontrollzustandEintrag): string {
  const { selbst_hash: _selbst_hash, ...payloadOhneHash } = eintrag.payload
  return sha256Hex(kanonischesJson({ ...eintrag, payload: payloadOhneHash }))
}

// ─── Eingabevalidierung an der eigenen Schnittstelle (D2) ───────────────────

const RUECKWAERTSSCHRAEGSTRICH = String.fromCharCode(92)

function pruefeLaufId(laufId: string): void {
  if (typeof laufId !== 'string' || laufId.length === 0) {
    throw new Error('lauf_id muss ein nicht-leerer String sein')
  }
  const enthaeltSteuerzeichen = Array.from(laufId).some((zeichen) => zeichen.charCodeAt(0) < 32)
  const enthaeltRueckwaertsschraegstrich = laufId.includes(RUECKWAERTSSCHRAEGSTRICH)
  if (laufId.includes('/') || enthaeltRueckwaertsschraegstrich || laufId.includes('..') || enthaeltSteuerzeichen) {
    throw new Error(`lauf_id enthält unzulässige Zeichen: ${JSON.stringify(laufId)}`)
  }
}

function checkpointVerzeichnis(laufId: string, basisVerzeichnis: string): string {
  return join(basisVerzeichnis, laufId, 'checkpoints')
}

// ─── Validierung eines einzelnen Eintrags (Hülle + Payload + Selbst-Hash) ───

function validiereProfilReferenz(wert: unknown): string[] {
  const verstoesse: string[] = []
  if (typeof wert !== 'object' || wert === null || Array.isArray(wert)) {
    return ["'profil_referenz' muss ein Objekt sein"]
  }
  const ref = wert as Record<string, unknown>
  const erlaubt = new Set(['pfad', 'hash', 'version'])
  for (const feld of Object.keys(ref)) {
    if (!erlaubt.has(feld)) verstoesse.push(`unbekanntes Feld 'profil_referenz.${feld}' (additionalProperties: false)`)
  }
  for (const feld of ['pfad', 'hash', 'version']) {
    if (!(feld in ref)) verstoesse.push(`Pflichtfeld 'profil_referenz.${feld}' fehlt`)
  }
  if ('pfad' in ref && (typeof ref.pfad !== 'string' || ref.pfad.length < 1)) {
    verstoesse.push("'profil_referenz.pfad' muss ein nicht-leerer String sein")
  }
  if ('hash' in ref && (typeof ref.hash !== 'string' || ref.hash.length < 1)) {
    verstoesse.push("'profil_referenz.hash' muss ein nicht-leerer String sein")
  }
  if ('version' in ref && (!Number.isInteger(ref.version) || (ref.version as number) < 1)) {
    verstoesse.push("'profil_referenz.version' muss ein Integer >= 1 sein")
  }
  return verstoesse
}

/**
 * Reine Funktion: prüft einen geparsten Kontrollzustand-Eintrag gegen die
 * F0-Hülle, das Checkpoint-Payload-Schema und rechnet selbst_hash real
 * nach. Kennt keinen Dateinamen — der Dateiname-vs-Inhalt-Hash-Abgleich
 * (B6) passiert deshalb separat beim Laden, nicht hier.
 */
export function validiereCheckpointEintrag(eintrag: unknown): string[] {
  const verstoesse: string[] = []
  if (typeof eintrag !== 'object' || eintrag === null || Array.isArray(eintrag)) {
    return ['Wurzel ist kein Objekt']
  }
  const obj = eintrag as Record<string, unknown>

  const erlaubteHuellenfelder = new Set(['schema_version', 'typ', 'profil_referenz', 'payload'])
  for (const feld of Object.keys(obj)) {
    if (!erlaubteHuellenfelder.has(feld)) verstoesse.push(`unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  for (const feld of ['schema_version', 'typ', 'profil_referenz', 'payload']) {
    if (!(feld in obj)) verstoesse.push(`Pflichtfeld '${feld}' fehlt`)
  }
  if ('schema_version' in obj && (!Number.isInteger(obj.schema_version) || (obj.schema_version as number) < 1)) {
    verstoesse.push("'schema_version' muss ein Integer >= 1 sein")
  }
  if ('typ' in obj && obj.typ !== 'checkpoint') {
    verstoesse.push("'typ' muss 'checkpoint' sein")
  }
  if ('profil_referenz' in obj) {
    verstoesse.push(...validiereProfilReferenz(obj.profil_referenz))
  }

  if (!('payload' in obj) || typeof obj.payload !== 'object' || obj.payload === null || Array.isArray(obj.payload)) {
    if ('payload' in obj) verstoesse.push("'payload' muss ein Objekt sein")
    return verstoesse
  }
  const p = obj.payload as Record<string, unknown>

  const erlaubtePayloadFelder = new Set(['lauf_id', 'sequenz', 'vorgaenger_hash', 'selbst_hash', 'daten'])
  for (const feld of Object.keys(p)) {
    if (!erlaubtePayloadFelder.has(feld)) verstoesse.push(`unbekanntes Feld 'payload.${feld}' (additionalProperties: false)`)
  }
  for (const feld of ['lauf_id', 'sequenz', 'vorgaenger_hash', 'selbst_hash']) {
    if (!(feld in p)) verstoesse.push(`Pflichtfeld 'payload.${feld}' fehlt`)
  }
  if ('lauf_id' in p && (typeof p.lauf_id !== 'string' || (p.lauf_id as string).length < 1)) {
    verstoesse.push("'payload.lauf_id' muss ein nicht-leerer String sein")
  }
  if ('sequenz' in p && (!Number.isInteger(p.sequenz) || (p.sequenz as number) < 1)) {
    verstoesse.push("'payload.sequenz' muss ein Integer >= 1 sein")
  }
  if ('vorgaenger_hash' in p && p.vorgaenger_hash !== null) {
    if (typeof p.vorgaenger_hash !== 'string' || (p.vorgaenger_hash as string).length < 64) {
      verstoesse.push("'payload.vorgaenger_hash' muss null oder ein String mit mindestens 64 Zeichen sein")
    }
  }
  if ('sequenz' in p && Number.isInteger(p.sequenz)) {
    if (p.sequenz === 1 && p.vorgaenger_hash !== null) {
      verstoesse.push("'payload.vorgaenger_hash' muss bei sequenz 1 null sein (Kettenanfang)")
    }
    if (p.sequenz !== 1 && p.vorgaenger_hash === null) {
      verstoesse.push("'payload.vorgaenger_hash' darf nur bei sequenz 1 null sein")
    }
  }
  if ('selbst_hash' in p && (typeof p.selbst_hash !== 'string' || (p.selbst_hash as string).length < 64)) {
    verstoesse.push("'payload.selbst_hash' muss ein String mit mindestens 64 Zeichen sein")
  }

  if (verstoesse.length === 0) {
    const echterHash = echterInhaltsHash(obj as unknown as KontrollzustandEintrag)
    if (echterHash !== p.selbst_hash) {
      verstoesse.push(`'payload.selbst_hash' stimmt nicht mit dem real errechneten Hash überein (erwartet ${echterHash})`)
    }
  }

  return verstoesse
}

// ─── Atomares Schreiben (Temp-Datei + rename, Windows-Retry) ────────────────

function schlafeSynchron(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

/** Interner Helfer (plan-v1 SCOPE.3) — schreibt nie direkt über eine bestehende Datei. */
function atomarSchreiben(zielpfad: string, inhalt: string): void {
  const tempPfad = `${zielpfad}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`
  writeFileSync(tempPfad, inhalt, 'utf8')
  for (let versuch = 1; versuch <= MAX_RENAME_VERSUCHE; versuch++) {
    try {
      renameSync(tempPfad, zielpfad)
      return
    } catch (fehler) {
      const code = (fehler as NodeJS.ErrnoException).code
      if ((code === 'EPERM' || code === 'EBUSY') && versuch < MAX_RENAME_VERSUCHE) {
        schlafeSynchron(RENAME_WARTE_MS)
        continue
      }
      try {
        unlinkSync(tempPfad)
      } catch {
        // Aufräumversuch, kein Ausschlagen wenn er selbst fehlschlägt
      }
      throw fehler
    }
  }
}

// ─── Kandidaten-Ermittlung ───────────────────────────────────────────────────

function listeKandidaten(verzeichnis: string): Kandidat[] {
  if (!existsSync(verzeichnis)) return []
  const kandidaten: Kandidat[] = []
  for (const eintrag of readdirSync(verzeichnis, { withFileTypes: true })) {
    if (!eintrag.isFile()) continue
    const treffer = DATEINAME_MUSTER.exec(eintrag.name)
    if (!treffer) continue
    kandidaten.push({
      sequenz: Number(treffer[1]),
      hashImDateiname: treffer[2],
      pfad: join(verzeichnis, eintrag.name),
    })
  }
  kandidaten.sort((a, b) => b.sequenz - a.sequenz)
  return kandidaten
}

function jetzt(): string {
  return new Date().toISOString()
}

function standardSchreiber(ereignis: Ereignis): void {
  console.log(JSON.stringify(ereignis))
}

/**
 * Liest, parst und validiert einen einzelnen Kandidaten (Struktur, Payload,
 * interne Selbst-Hash-Konsistenz, Dateiname-vs-Inhalt-Sequenz, und — B6 —
 * Dateiname-vs-Inhalt-Hash). Protokolliert bei jedem Fehlschlag genau eine
 * checkpoint_validierungsfehler-Zeile und trägt bei Erfolg den geparsten
 * Eintrag in den Kandidaten ein.
 */
function pruefeEinzelnenKandidaten(kandidat: Kandidat, laufId: string, schreiber: Schreiber): boolean {
  let roh: string
  try {
    roh = readFileSync(kandidat.pfad, 'utf8')
  } catch (fehler) {
    schreiber({
      ereignis: 'checkpoint_validierungsfehler',
      lauf_id: laufId,
      zeitstempel: jetzt(),
      sequenz: kandidat.sequenz,
      pfad: kandidat.pfad,
      verstoesse: [`Datei nicht lesbar: ${(fehler as Error).message}`],
    })
    return false
  }

  let geparst: unknown
  try {
    geparst = JSON.parse(roh)
  } catch (fehler) {
    schreiber({
      ereignis: 'checkpoint_validierungsfehler',
      lauf_id: laufId,
      zeitstempel: jetzt(),
      sequenz: kandidat.sequenz,
      pfad: kandidat.pfad,
      verstoesse: [`kein gültiges JSON (${(fehler as Error).message})`],
    })
    return false
  }

  const verstoesse = validiereCheckpointEintrag(geparst)
  const eintrag = geparst as KontrollzustandEintrag

  if (verstoesse.length === 0 && eintrag.payload.sequenz !== kandidat.sequenz) {
    verstoesse.push(`Dateiname kodiert sequenz ${kandidat.sequenz}, Inhalt hat sequenz ${eintrag.payload.sequenz}`)
  }
  // B6: interne Selbst-Hash-Konsistenz allein genügt nicht — der im
  // Dateinamen kodierte Hash muss ebenfalls zum Inhalt passen, sonst würde
  // ein Checkpoint akzeptiert, dessen Inhalt (samt intern nachgezogenem
  // selbst_hash) geändert wurde, ohne den Dateinamen anzupassen.
  if (verstoesse.length === 0 && eintrag.payload.selbst_hash !== kandidat.hashImDateiname) {
    verstoesse.push(
      `Dateiname kodiert Hash ${kandidat.hashImDateiname}, Inhalt hat selbst_hash ${eintrag.payload.selbst_hash}`
    )
  }

  if (verstoesse.length > 0) {
    schreiber({
      ereignis: 'checkpoint_validierungsfehler',
      lauf_id: laufId,
      zeitstempel: jetzt(),
      sequenz: kandidat.sequenz,
      pfad: kandidat.pfad,
      verstoesse,
    })
    return false
  }

  kandidat.eintrag = eintrag
  return true
}

/**
 * D3: vollständiger Rückwärtslauf. Ein Kandidat ist nur gültig, wenn er
 * selbst besteht UND (bei sequenz > 1) sein Vorgänger existiert, selbst
 * gültig ist und dessen selbst_hash zu payload.vorgaenger_hash passt.
 */
function istKandidatGueltig(
  kandidat: Kandidat,
  laufId: string,
  schreiber: Schreiber,
  nachSequenz: Map<number, Kandidat>,
  cache: Map<number, boolean>
): boolean {
  const bekannt = cache.get(kandidat.sequenz)
  if (bekannt !== undefined) return bekannt
  cache.set(kandidat.sequenz, false) // Schutz gegen Zyklen während der Berechnung

  if (!pruefeEinzelnenKandidaten(kandidat, laufId, schreiber)) {
    return false
  }
  const eintrag = kandidat.eintrag as KontrollzustandEintrag

  let gueltig = true
  if (eintrag.payload.sequenz > 1) {
    const vorgaenger = nachSequenz.get(eintrag.payload.sequenz - 1)
    const vorgaengerGueltig = vorgaenger !== undefined && istKandidatGueltig(vorgaenger, laufId, schreiber, nachSequenz, cache)
    const passtZusammen = vorgaengerGueltig && vorgaenger?.eintrag?.payload.selbst_hash === eintrag.payload.vorgaenger_hash
    if (!passtZusammen) {
      gueltig = false
      schreiber({
        ereignis: 'checkpoint_validierungsfehler',
        lauf_id: laufId,
        zeitstempel: jetzt(),
        sequenz: kandidat.sequenz,
        pfad: kandidat.pfad,
        verstoesse: [
          `Vorgänger (sequenz ${eintrag.payload.sequenz - 1}) fehlt, ist ungültig oder passt nicht zu 'payload.vorgaenger_hash'`,
        ],
      })
    }
  }

  cache.set(kandidat.sequenz, gueltig)
  return gueltig
}

// ─── Öffentliche API ─────────────────────────────────────────────────────────

/**
 * Ermittelt sequenz und vorgaenger_hash aus dem aktuellen Kettenstand,
 * berechnet selbst_hash und schreibt den Eintrag atomar unter
 * <basisVerzeichnis>/<lauf_id>/checkpoints/<sequenz>-<selbst_hash>.json.
 */
export function schreibeCheckpoint(
  laufId: string,
  profilReferenz: ProfilReferenz,
  daten?: unknown,
  optionen: Optionen = {}
): { pfad: string; selbstHash: string } {
  pruefeLaufId(laufId)
  const basisVerzeichnis = optionen.basisVerzeichnis ?? STANDARD_BASISVERZEICHNIS
  const schreiber = optionen.schreiber ?? standardSchreiber
  const verzeichnis = checkpointVerzeichnis(laufId, basisVerzeichnis)
  mkdirSync(verzeichnis, { recursive: true })

  const vorhandene = listeKandidaten(verzeichnis)
  const hoechster = vorhandene[0]
  const naechsteSequenz = hoechster === undefined ? 1 : hoechster.sequenz + 1
  let vorgaengerHash: string | null = null
  if (hoechster !== undefined) {
    const vorherigerInhalt = JSON.parse(readFileSync(hoechster.pfad, 'utf8')) as KontrollzustandEintrag
    vorgaengerHash = vorherigerInhalt.payload.selbst_hash
  }

  const payloadOhneHash: Omit<CheckpointPayload, 'selbst_hash'> = {
    lauf_id: laufId,
    sequenz: naechsteSequenz,
    vorgaenger_hash: vorgaengerHash,
    ...(daten !== undefined ? { daten } : {}),
  }
  const eintragOhneHash = { schema_version: 1, typ: 'checkpoint', profil_referenz: profilReferenz, payload: payloadOhneHash }
  const selbstHash = sha256Hex(kanonischesJson(eintragOhneHash))
  const eintrag: KontrollzustandEintrag = {
    ...eintragOhneHash,
    payload: { ...payloadOhneHash, selbst_hash: selbstHash },
  }

  const dateiname = `${naechsteSequenz}-${selbstHash}.json`
  const zielpfad = join(verzeichnis, dateiname)
  atomarSchreiben(zielpfad, kanonischesJson(eintrag))

  schreiber({
    ereignis: 'checkpoint_geschrieben',
    lauf_id: laufId,
    zeitstempel: jetzt(),
    sequenz: naechsteSequenz,
    pfad: zielpfad,
  })

  return { pfad: zielpfad, selbstHash }
}

/**
 * Liefert den zuletzt gültigen Checkpoint der lauf_id, oder null, wenn
 * keiner existiert — ein regulärer, benannter Ausgang (D10), nie eine
 * Ausnahme für diesen Fall.
 */
export function ladeLetztenGueltigenCheckpoint(laufId: string, optionen: Optionen = {}): KontrollzustandEintrag | null {
  pruefeLaufId(laufId)
  const basisVerzeichnis = optionen.basisVerzeichnis ?? STANDARD_BASISVERZEICHNIS
  const schreiber = optionen.schreiber ?? standardSchreiber
  const verzeichnis = checkpointVerzeichnis(laufId, basisVerzeichnis)

  const kandidaten = listeKandidaten(verzeichnis)
  if (kandidaten.length === 0) {
    schreiber({ ereignis: 'checkpoint_kein_gueltiger_gefunden', lauf_id: laufId, zeitstempel: jetzt() })
    return null
  }

  const nachSequenz = new Map(kandidaten.map((k) => [k.sequenz, k]))
  const cache = new Map<number, boolean>()

  for (const kandidat of kandidaten) {
    if (istKandidatGueltig(kandidat, laufId, schreiber, nachSequenz, cache)) {
      schreiber({
        ereignis: 'checkpoint_geladen',
        lauf_id: laufId,
        zeitstempel: jetzt(),
        sequenz: kandidat.sequenz,
        pfad: kandidat.pfad,
      })
      return kandidat.eintrag as KontrollzustandEintrag
    }
  }

  // Jeder gescheiterte Kandidat wurde bereits einzeln mit
  // checkpoint_validierungsfehler protokolliert — kein zusätzliches
  // checkpoint_kein_gueltiger_gefunden hier (das Ereignis bedeutet
  // "keine Kandidaten vorhanden", nicht "alle abgelehnt").
  return null
}
