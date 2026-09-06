/**
 * Datei: src/auftrag/index.ts
 *
 * Zweck: Auftrag-Modul (F11 WS-1, state/plan-v1-f11-auftrag-ws1.md
 * Abschnitt 2.1, state/tasks/f11-auftrag-ws1.md). Registriert einen
 * Auftrag (titel/auftragstext) als eigenständiges AUFTRAG_V0-Kernartefakt
 * unter der Artefakt-ID `auftrag-<auftragId>`.
 *
 * Eigenständiges Modul (D1, wie F5/F9 gegenüber F2): ruft F2s
 * registriereKernArtefakt ausschließlich von außen auf, kein Eingriff in
 * src/lineage-registry/. Ein Auftrag ist der Wurzelknoten eines
 * Vorhabensstrangs — er zitiert keine vorherigen Artefakte, `eingaben`
 * bleibt bewusst ein leeres Array (D2).
 */

import { registriereKernArtefakt } from '../lineage-registry/index.ts'
import type { ProfilReferenz } from '../checkpoint-store/types.ts'
import type { AuftragV0Daten, Ereignis, Optionen } from './types.ts'

function jetzt(): string {
  return new Date().toISOString()
}

function standardSchreiber(ereignis: Ereignis): void {
  console.log(JSON.stringify(ereignis))
}

function stillerLineageSchreiber(): void {
  // Unterdrückt F2s eigene lineage_*-Ereignisse — dieses Modul protokolliert
  // sein eigenes, höherstufiges auftrag_registriert-Ereignis (Muster F5).
}

function auftragArtefaktId(auftragId: string): string {
  return `auftrag-${auftragId}`
}

/**
 * Registriert einen Auftrag als AUFTRAG_V0-Kernartefakt über F2s
 * registriereKernArtefakt (AK1). eingaben bleibt [] — ein Auftrag ist der
 * Wurzelknoten eines Vorhabensstrangs, kein Zitat eines Vorgängerartefakts.
 * @param auftragId - eindeutige Kennung, bildet die Artefakt-ID auftrag-<auftragId>
 * @param profilReferenz - Profilbezug, unverändert an F2 gereicht
 * @param titel - kurzer, menschenlesbarer Titel des Auftrags
 * @param auftragstext - der eigentliche Auftragstext (AK2 liest ihn über AusfuehrungsEingaben)
 * @param optionen - basisVerzeichnis/schreiber, Muster F5/F2
 * @returns pfad, versionSequenz und inhaltsHash der geschriebenen Version
 */
export function registriereAuftrag(
  auftragId: string,
  profilReferenz: ProfilReferenz,
  titel: string,
  auftragstext: string,
  optionen: Optionen = {}
): { pfad: string; versionSequenz: number; inhaltsHash: string } {
  const schreiber = optionen.schreiber ?? standardSchreiber
  const lineageOptionen = { basisVerzeichnis: optionen.basisVerzeichnis, schreiber: stillerLineageSchreiber }

  const daten: AuftragV0Daten = {
    auftrag_schema: 'v0',
    auftrag_id: auftragId,
    titel,
    auftragstext,
    erstellt_am: jetzt(),
  }

  const { pfad, versionSequenz, inhaltsHash } = registriereKernArtefakt(
    auftragArtefaktId(auftragId),
    profilReferenz,
    { quelle: 'auftrag' },
    daten,
    [],
    lineageOptionen
  )

  schreiber({ ereignis: 'auftrag_registriert', zeitstempel: jetzt(), auftrag_id: auftragId, versionSequenz })
  return { pfad, versionSequenz, inhaltsHash }
}

// ─── Schemaprüfung (Gate-Skript, handgeschrieben, D5, kein ajv) ────────────

/** Reine Funktion: prüft ein geparstes Objekt gegen schemas/kontrollzustand-auftrag-payload.schema.json. */
export function validiereAuftragDaten(daten: unknown): string[] {
  if (typeof daten !== 'object' || daten === null || Array.isArray(daten)) {
    return ['Wurzel ist kein Objekt']
  }
  const obj = daten as Record<string, unknown>
  const verstoesse: string[] = []
  const erlaubt = new Set(['auftrag_schema', 'auftrag_id', 'titel', 'auftragstext', 'erstellt_am'])
  for (const feld of Object.keys(obj)) {
    if (!erlaubt.has(feld)) verstoesse.push(`unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  if (obj.auftrag_schema !== 'v0') verstoesse.push("'auftrag_schema' muss 'v0' sein")
  if (typeof obj.auftrag_id !== 'string' || obj.auftrag_id.length === 0) verstoesse.push("'auftrag_id' muss ein nicht-leerer String sein")
  if (typeof obj.titel !== 'string' || obj.titel.length === 0) verstoesse.push("'titel' muss ein nicht-leerer String sein")
  if (typeof obj.auftragstext !== 'string' || obj.auftragstext.length === 0) verstoesse.push("'auftragstext' muss ein nicht-leerer String sein")
  if (typeof obj.erstellt_am !== 'string' || obj.erstellt_am.length === 0) verstoesse.push("'erstellt_am' muss ein nicht-leerer String sein")
  return verstoesse
}
