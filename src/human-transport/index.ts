/**
 * Datei: src/human-transport/index.ts
 *
 * Zweck: Human Transport (Feature 9, state/plan-v1-f9-human-transport.md +
 * state/tasks/f9-human-transport-bauauftrag.md). Erfasst einen BEDARF_V0,
 * bündelt ihn zu einem Transportpaket, bezeugt die Aushändigung an eine
 * menschliche Brücke mit F1Bs RUN_PREPARED, prüft eine zurückkommende
 * Antwort vor jeder Registrierung als untrusted Input gegen ein eigenes
 * Schema, und schließt den Lauf über ein F1B-Terminalartefakt ab.
 *
 * Eigenständiges Modul (D1, wie F2 gegenüber F1 und F3 gegenüber F1B): ruft
 * F1Bs schreibeWirkungsmarke/stelleLaufstatusFest und F2s
 * registriereKernArtefakt/pruefeStale/haltFestStaleEntscheidung
 * ausschließlich von außen auf, kein Eingriff in src/checkpoint-store/
 * oder src/lineage-registry/.
 *
 * D6 (Advisor-Pass B3): pruefeUndEntscheideStale/entscheideStale sind ein
 * eigener, für sich manuell auszulösender Gate-Schritt (Stufe-1-Prinzip,
 * kein Auto-Start) — der Aufrufer ruft ihn nach Rückkehr der Antwort, aber
 * vor jeder Weiterverwendung/Freigabe auf. Solange kein
 * entscheideStale-Aufruf real stattgefunden hat, liefert
 * pruefeUndEntscheideStale bei geänderter BEDARF_V0-Referenz weiterhin
 * freigegeben:false — kein stillschweigendes Weiterlaufen.
 */

import { kanonischesJson, schreibeWirkungsmarke, sha256Hex } from '../checkpoint-store/index.ts'
import type { ProfilReferenz } from '../checkpoint-store/types.ts'
import { haltFestStaleEntscheidung, ladeArtefaktVersion, pruefeStale, registriereKernArtefakt } from '../lineage-registry/index.ts'
import type { EingabeReferenz, Entscheidung } from '../lineage-registry/types.ts'
import type { BedarfV0Daten, TransportEinstufung, TransportpaketV1Daten, TransportpaketV2Daten, WerkzeugAuswahl } from './types.ts'

interface Optionen {
  basisVerzeichnis?: string
  /** Nur zum Stummschalten der Ereignisprotokollierung darunterliegender Module (Tests/Gate-Skript) — kein eigenes F9-Ereignisformat. */
  schreiber?: () => void
}

function jetzt(): string {
  return new Date().toISOString()
}

function bedarfArtefaktId(laufId: string): string {
  return `bedarf-${laufId}`
}

function transportArtefaktId(laufId: string): string {
  return `transport-${laufId}`
}

/** Synthetischer, nicht dateisystem-echter eingabe.pfad-Schlüssel für die pruefeStale-Referenz auf BEDARF_V0 (D2). */
function bedarfEingabeSchluessel(laufId: string): string {
  return `artefakt:${bedarfArtefaktId(laufId)}`
}

// ─── Erfassen / Erzeugen ────────────────────────────────────────────────────

export function erfasseBedarf(
  laufId: string,
  profilReferenz: ProfilReferenz,
  beschreibung: string,
  eingaben: EingabeReferenz[] = [],
  optionen: Optionen = {}
): { artefaktId: string; versionSequenz: number } {
  const daten: BedarfV0Daten = {
    bedarf_schema: 'v0',
    lauf_id: laufId,
    beschreibung,
    werkzeug_auswahl: null,
    erstellt_am: jetzt(),
  }
  const { versionSequenz } = registriereKernArtefakt(
    bedarfArtefaktId(laufId),
    profilReferenz,
    { erzeuger: 'mensch', schritt: 'bedarf-erfassung' },
    daten,
    eingaben,
    optionen
  )
  return { artefaktId: bedarfArtefaktId(laufId), versionSequenz }
}

/** Neue Version desselben BEDARF_V0-Artefakts mit befüllter werkzeug_auswahl (ARCHITECTURE.md:41 — versioniert, nicht überschrieben). */
export function befuelleWerkzeugAuswahl(
  laufId: string,
  profilReferenz: ProfilReferenz,
  werkzeugAuswahl: Exclude<WerkzeugAuswahl, null>,
  optionen: Optionen = {}
): { artefaktId: string; versionSequenz: number } {
  const bisherige = ladeArtefaktVersion(bedarfArtefaktId(laufId), undefined, optionen)
  if (bisherige === null) {
    throw new Error(`BEDARF_V0 '${bedarfArtefaktId(laufId)}' nicht gefunden — erfasseBedarf zuerst aufrufen`)
  }
  const bisherigeDaten = bisherige.daten as BedarfV0Daten
  const daten: BedarfV0Daten = { ...bisherigeDaten, werkzeug_auswahl: werkzeugAuswahl }
  const { versionSequenz } = registriereKernArtefakt(
    bedarfArtefaktId(laufId),
    profilReferenz,
    { erzeuger: 'mensch', schritt: 'werkzeug-auswahl-nachtrag' },
    daten,
    bisherige.eingaben,
    optionen
  )
  return { artefaktId: bedarfArtefaktId(laufId), versionSequenz }
}

export function erzeugeTransportpaket(
  laufId: string,
  profilReferenz: ProfilReferenz,
  bedarfVersionSequenz: number,
  inhalt: string,
  executor: string,
  optionen: Optionen = {}
): { artefaktId: string; versionSequenz: number } {
  const bedarfVersion = ladeArtefaktVersion(bedarfArtefaktId(laufId), bedarfVersionSequenz, optionen)
  if (bedarfVersion === null) {
    throw new Error(`BEDARF_V0 '${bedarfArtefaktId(laufId)}' Version ${bedarfVersionSequenz} nicht gefunden`)
  }

  const daten: TransportpaketV1Daten = {
    transport_schema: 'v0',
    bezieht_sich_auf_bedarf: { artefakt_id: bedarfArtefaktId(laufId), versionSequenz: bedarfVersionSequenz },
    inhalt,
    executor,
    status: 'ERSTELLT',
  }
  const eingaben: EingabeReferenz[] = [
    {
      pfad: bedarfEingabeSchluessel(laufId),
      zitierter_bereich: `BEDARF_V0 versionSequenz ${bedarfVersionSequenz}`,
      inhalts_hash: sha256Hex(kanonischesJson(bedarfVersion.daten)),
    },
  ]
  const { versionSequenz } = registriereKernArtefakt(
    transportArtefaktId(laufId),
    profilReferenz,
    { erzeuger: 'kern', schritt: 'transportpaket-erzeugung' },
    daten,
    eingaben,
    optionen
  )
  return { artefaktId: transportArtefaktId(laufId), versionSequenz }
}

// ─── Aushändigung ───────────────────────────────────────────────────────────

/** Schreibt RUN_PREPARED (F1B) vor jeder Aushändigung — die Außenwirkung beginnt mit dem manuellen Verlassen des Systems, nicht erst mit der Rückkehr der Antwort (D3). */
export function haendigeAus(laufId: string, profilReferenz: ProfilReferenz, optionen: Optionen = {}): { pfad: string; selbstHash: string } {
  return schreibeWirkungsmarke(laufId, profilReferenz, 'run_prepared', {}, optionen)
}

// ─── Validierung der beiden Payload-Schemas (Gate-Skript, A1) ──────────────

function validiereBezugBedarf(wert: unknown): string[] {
  if (typeof wert !== 'object' || wert === null || Array.isArray(wert)) {
    return ["'bezieht_sich_auf_bedarf' muss ein Objekt sein"]
  }
  const verstoesse: string[] = []
  const ref = wert as Record<string, unknown>
  const erlaubt = new Set(['artefakt_id', 'versionSequenz'])
  for (const feld of Object.keys(ref)) {
    if (!erlaubt.has(feld)) verstoesse.push(`unbekanntes Feld 'bezieht_sich_auf_bedarf.${feld}' (additionalProperties: false)`)
  }
  if (typeof ref.artefakt_id !== 'string' || ref.artefakt_id.length === 0) {
    verstoesse.push("'bezieht_sich_auf_bedarf.artefakt_id' muss ein nicht-leerer String sein")
  }
  if (!Number.isInteger(ref.versionSequenz) || (ref.versionSequenz as number) < 1) {
    verstoesse.push("'bezieht_sich_auf_bedarf.versionSequenz' muss ein Integer >= 1 sein")
  }
  return verstoesse
}

/** Reine Funktion: prüft ein geparstes Objekt gegen schemas/kontrollzustand-bedarf-payload.schema.json. */
export function validiereBedarfDaten(daten: unknown): string[] {
  if (typeof daten !== 'object' || daten === null || Array.isArray(daten)) {
    return ['Wurzel ist kein Objekt']
  }
  const obj = daten as Record<string, unknown>
  const verstoesse: string[] = []
  const erlaubt = new Set(['bedarf_schema', 'lauf_id', 'beschreibung', 'werkzeug_auswahl', 'erstellt_am'])
  for (const feld of Object.keys(obj)) {
    if (!erlaubt.has(feld)) verstoesse.push(`unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  if (obj.bedarf_schema !== 'v0') verstoesse.push("'bedarf_schema' muss 'v0' sein")
  if (typeof obj.lauf_id !== 'string' || obj.lauf_id.length === 0) {
    verstoesse.push("'lauf_id' muss ein nicht-leerer String sein")
  }
  if (typeof obj.beschreibung !== 'string' || obj.beschreibung.length === 0) {
    verstoesse.push("'beschreibung' muss ein nicht-leerer String sein")
  }
  if (obj.werkzeug_auswahl !== null) {
    if (typeof obj.werkzeug_auswahl !== 'object' || obj.werkzeug_auswahl === undefined || Array.isArray(obj.werkzeug_auswahl)) {
      verstoesse.push("'werkzeug_auswahl' muss null oder ein Objekt sein")
    } else {
      const wa = obj.werkzeug_auswahl as Record<string, unknown>
      const waErlaubt = new Set(['kandidat', 'quelle', 'manuell_bestaetigt_am'])
      for (const feld of Object.keys(wa)) {
        if (!waErlaubt.has(feld)) verstoesse.push(`unbekanntes Feld 'werkzeug_auswahl.${feld}' (additionalProperties: false)`)
      }
      for (const feld of ['kandidat', 'quelle', 'manuell_bestaetigt_am']) {
        if (typeof wa[feld] !== 'string' || (wa[feld] as string).length === 0) {
          verstoesse.push(`'werkzeug_auswahl.${feld}' muss ein nicht-leerer String sein`)
        }
      }
    }
  }
  if (typeof obj.erstellt_am !== 'string' || obj.erstellt_am.length === 0) {
    verstoesse.push("'erstellt_am' muss ein nicht-leerer String sein")
  }
  return verstoesse
}

function validiereTransportDatenV1(obj: Record<string, unknown>): string[] {
  const verstoesse: string[] = []
  const erlaubt = new Set(['transport_schema', 'bezieht_sich_auf_bedarf', 'inhalt', 'executor', 'status'])
  for (const feld of Object.keys(obj)) {
    if (!erlaubt.has(feld)) verstoesse.push(`unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  if (obj.transport_schema !== 'v0') verstoesse.push("'transport_schema' muss 'v0' sein")
  verstoesse.push(...validiereBezugBedarf(obj.bezieht_sich_auf_bedarf))
  if (typeof obj.inhalt !== 'string' || obj.inhalt.length === 0) verstoesse.push("'inhalt' muss ein nicht-leerer String sein")
  if (typeof obj.executor !== 'string' || obj.executor.length === 0) verstoesse.push("'executor' muss ein nicht-leerer String sein")
  if (obj.status !== 'ERSTELLT') verstoesse.push("'status' muss 'ERSTELLT' sein")
  return verstoesse
}

function validiereTransportDatenV2(obj: Record<string, unknown>): string[] {
  const verstoesse: string[] = []
  const erlaubt = new Set(['transport_schema', 'bezieht_sich_auf_bedarf', 'antwort', 'status', 'importiert_am'])
  for (const feld of Object.keys(obj)) {
    if (!erlaubt.has(feld)) verstoesse.push(`unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  if (obj.transport_schema !== 'v0') verstoesse.push("'transport_schema' muss 'v0' sein")
  verstoesse.push(...validiereBezugBedarf(obj.bezieht_sich_auf_bedarf))
  if (typeof obj.antwort !== 'string') verstoesse.push("'antwort' muss ein String sein")
  if (obj.status !== 'ANTWORT_EINGETROFFEN') verstoesse.push("'status' muss 'ANTWORT_EINGETROFFEN' sein")
  if (typeof obj.importiert_am !== 'string' || obj.importiert_am.length === 0) {
    verstoesse.push("'importiert_am' muss ein nicht-leerer String sein")
  }
  return verstoesse
}

/** Reine Funktion: prüft ein geparstes Objekt gegen schemas/kontrollzustand-transport-payload.schema.json — dispatcht nach status (Version 1 vs. Version 2). */
export function validiereTransportpaketDaten(daten: unknown): string[] {
  if (typeof daten !== 'object' || daten === null || Array.isArray(daten)) {
    return ['Wurzel ist kein Objekt']
  }
  const obj = daten as Record<string, unknown>
  if (obj.status === 'ERSTELLT') return validiereTransportDatenV1(obj)
  if (obj.status === 'ANTWORT_EINGETROFFEN') return validiereTransportDatenV2(obj)
  return ["'status' muss 'ERSTELLT' oder 'ANTWORT_EINGETROFFEN' sein"]
}

// ─── Schemaprüfung der importierten Antwort (untrusted Input) ──────────────

/** Handgeschriebene Feldprüfung (D5, kein ajv) der rohen, ungeprüften Antwort — vor jeder Registrierung. */
export function validiereTransportantwort(obj: unknown): string[] {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return ['Antwort muss ein Objekt sein']
  }
  const rec = obj as Record<string, unknown>
  const verstoesse: string[] = []
  const erlaubt = new Set(['antwort'])
  for (const feld of Object.keys(rec)) {
    if (!erlaubt.has(feld)) verstoesse.push(`unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  if (typeof rec.antwort !== 'string' || rec.antwort.length === 0) {
    verstoesse.push("'antwort' muss ein nicht-leerer String sein")
  }
  return verstoesse
}

// ─── Import ─────────────────────────────────────────────────────────────────

/**
 * Prüft die rohe Antwort gegen validiereTransportantwort. Bei Schemaverstoß:
 * keine Registrierung, stattdessen Terminalartefakt FEHLGESCHLAGEN (D4,
 * ARCHITECTURE.md:58 — ungültige Beobachtungsbasis). Bei gültiger Antwort:
 * Transportpaket Version 2 registrieren, danach Terminalartefakt mit der
 * übergebenen menschlichen Einstufung (ERFOLGREICH/VERWEIGERT).
 */
export function importiereAntwort(
  laufId: string,
  profilReferenz: ProfilReferenz,
  rohAntwort: unknown,
  einstufung: TransportEinstufung,
  optionen: Optionen = {}
): { ok: true; versionSequenz: number } | { ok: false; grund: string } {
  const verstoesse = validiereTransportantwort(rohAntwort)
  if (verstoesse.length > 0) {
    const grund = `Schemaverstoß: ${verstoesse.join('; ')}`
    schreibeWirkungsmarke(laufId, profilReferenz, 'terminal', { ergebnis: 'FEHLGESCHLAGEN', daten: { grund } }, optionen)
    return { ok: false, grund }
  }

  const bisherigeVersion = ladeArtefaktVersion(transportArtefaktId(laufId), undefined, optionen)
  if (bisherigeVersion === null) {
    throw new Error(`Transportpaket '${transportArtefaktId(laufId)}' hat keine Version 1 — erzeugeTransportpaket zuerst aufrufen`)
  }
  const bisherigeDaten = bisherigeVersion.daten as TransportpaketV1Daten

  const daten: TransportpaketV2Daten = {
    transport_schema: 'v0',
    bezieht_sich_auf_bedarf: bisherigeDaten.bezieht_sich_auf_bedarf,
    antwort: (rohAntwort as { antwort: string }).antwort,
    status: 'ANTWORT_EINGETROFFEN',
    importiert_am: jetzt(),
  }
  const { versionSequenz } = registriereKernArtefakt(
    transportArtefaktId(laufId),
    profilReferenz,
    { erzeuger: 'mensch', schritt: 'antwort-import' },
    daten,
    [],
    optionen
  )
  schreibeWirkungsmarke(laufId, profilReferenz, 'terminal', { ergebnis: einstufung }, optionen)
  return { ok: true, versionSequenz }
}

// ─── Staleness-Prüfung und -Entscheidung (D6) ──────────────────────────────

/**
 * Liest reale Dateien (Aufrufer liefert Pfad→Inhalt) UND ergänzt den
 * synthetischen BEDARF_V0-Eintrag zu einer gemeinsamen
 * aktuelleEingabeInhalte-Map (B5) — getrennt von einer generischen,
 * dateisystembasierten LeseFunktion, die den synthetischen Schlüssel nicht
 * befüllen würde.
 */
export function baueAktuelleEingabeInhalte(laufId: string, echteDateien: Record<string, string> = {}, optionen: Optionen = {}): Record<string, string> {
  const inhalte = { ...echteDateien }
  const bedarfVersion = ladeArtefaktVersion(bedarfArtefaktId(laufId), undefined, optionen)
  if (bedarfVersion !== null) {
    inhalte[bedarfEingabeSchluessel(laufId)] = kanonischesJson(bedarfVersion.daten)
  }
  return inhalte
}

/**
 * D6 (Advisor-Pass B3): prüft das Transportpaket gegen seine Eingaben
 * (inkl. der BEDARF_V0-Referenz). stale:true bedeutet freigegeben:false —
 * keine automatische Entscheidung, kein stillschweigendes Weiterlaufen mit
 * der veralteten Antwort. Der Aufrufer muss bei stale:true entscheideStale
 * aufrufen (menschliche Entscheidung), bevor er mit Freigabe/Weiterverwendung
 * fortfährt — dieser Aufruf selbst ändert das Vergleichsergebnis nicht
 * rückwirkend (haltFestStaleEntscheidung hält nur eine Entscheidung fest,
 * überschreibt keinen Inhalt).
 */
export function pruefeUndEntscheideStale(
  laufId: string,
  echteDateien: Record<string, string> = {},
  optionen: Optionen = {}
): { freigegeben: boolean; stale: boolean; geaenderteEingaben: string[] } {
  const version = ladeArtefaktVersion(transportArtefaktId(laufId), undefined, optionen)
  if (version === null) {
    throw new Error(`Transportpaket '${transportArtefaktId(laufId)}' nicht gefunden`)
  }
  const aktuelleEingabeInhalte = baueAktuelleEingabeInhalte(laufId, echteDateien, optionen)
  const { stale, geaenderteEingaben } = pruefeStale(transportArtefaktId(laufId), version.versionSequenz, aktuelleEingabeInhalte, optionen)
  return { freigegeben: !stale, stale, geaenderteEingaben }
}

/** Dünner Aufrufer von F2s haltFestStaleEntscheidung gegen die aktuelle Transportpaket-Version — hält die menschliche STALE-Entscheidung unveränderlich fest. */
export function entscheideStale(
  laufId: string,
  profilReferenz: ProfilReferenz,
  entscheidung: Entscheidung,
  begruendung?: string,
  optionen: Optionen = {}
): { pfad: string; versionSequenz: number } {
  const version = ladeArtefaktVersion(transportArtefaktId(laufId), undefined, optionen)
  if (version === null) {
    throw new Error(`Transportpaket '${transportArtefaktId(laufId)}' nicht gefunden`)
  }
  return haltFestStaleEntscheidung(transportArtefaktId(laufId), version.versionSequenz, profilReferenz, entscheidung, begruendung, undefined, optionen)
}
