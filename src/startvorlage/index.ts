/**
 * Datei: src/startvorlage/index.ts
 *
 * Zweck: Startvorlage-Modul (F11 WS-2, feature.md AK4). Liest die eine
 * versionierte, schemageprüfte Startvorlagendatei unter startvorlagen/,
 * validiert sie gegen schemas/startvorlage.schema.json und leitet daraus
 * die ProfilReferenz für einen Startauftrag frisch ab — der Server
 * vertraut nie einem im Repo mitgeführten Hash, sondern berechnet ihn beim
 * Laden selbst aus dem tatsächlichen Dateiinhalt (Muster: AK1 in
 * scripts/check-f10-leitstand.mjs).
 *
 * Eigenständiges Modul (D1, wie src/auftrag/): kein Eingriff in
 * src/checkpoint-store/ oder src/lineage-registry/, ruft sha256Hex nur von
 * außen auf. Die Startvorlage selbst ist kein Kernartefakt (kein F2-Aufruf)
 * — sie ist Konfiguration, analog zu profiles/*.json (F0), nur unter einem
 * eigenen Top-Level-Ordner, damit scripts/check-datenformate.mjs' Prüfung
 * von profiles/*.json gegen schemas/profile.schema.json nicht bricht (AK4).
 *
 * Wird aufgerufen von:
 * - scripts/leitstand-server.mjs (lädt die Startvorlage einmal beim
 *   Aufbau des Request-Handlers, löst je Startauftrag einen benannten
 *   Werkzeugsatz auf)
 */

import { readFileSync } from 'node:fs'
import { sha256Hex } from '../checkpoint-store/index.ts'
import type { ProfilReferenz } from '../checkpoint-store/types.ts'
import type { BenannterWerkzeugsatz, StartvorlageV0Daten } from './types.ts'

/** Reine Funktion: prüft ein geparstes Objekt gegen schemas/startvorlage.schema.json. Die JSON-Schema-Datei kann "mindestens je ein lesender/schreibender Werkzeugsatz" nicht ausdrücken (patternProperties kennt kein Gegenstück je Wert) — diese Regel prüft ausschließlich diese Funktion, D5-Analogie zu check-datenformate.mjs' handgeschriebenen Validatoren. */
export function validiereStartvorlageDaten(daten: unknown): string[] {
  if (typeof daten !== 'object' || daten === null || Array.isArray(daten)) {
    return ['Wurzel ist kein Objekt']
  }
  const obj = daten as Record<string, unknown>
  const verstoesse: string[] = []
  const erlaubt = new Set([
    'startvorlage_schema',
    'profilPfad',
    'werkzeugStartziel',
    'werkzeugVersionDeklariert',
    'berechtigungskontext',
    'modell',
    'standardBudget',
    'werkzeugsaetze',
  ])
  for (const feld of Object.keys(obj)) {
    if (!erlaubt.has(feld)) verstoesse.push(`unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }

  if (obj.startvorlage_schema !== 'v0') verstoesse.push("'startvorlage_schema' muss 'v0' sein")
  if (typeof obj.profilPfad !== 'string' || obj.profilPfad.length === 0) verstoesse.push("'profilPfad' muss ein nicht-leerer String sein")
  if (!Array.isArray(obj.werkzeugStartziel) || obj.werkzeugStartziel.length === 0 || obj.werkzeugStartziel.some((t) => typeof t !== 'string' || t.length === 0)) {
    verstoesse.push("'werkzeugStartziel' muss ein nicht-leeres Array nicht-leerer Strings sein")
  }
  if (typeof obj.werkzeugVersionDeklariert !== 'string' || obj.werkzeugVersionDeklariert.length === 0) {
    verstoesse.push("'werkzeugVersionDeklariert' muss ein nicht-leerer String sein")
  }
  if (typeof obj.berechtigungskontext !== 'string' || obj.berechtigungskontext.length === 0) {
    verstoesse.push("'berechtigungskontext' muss ein nicht-leerer String sein")
  }
  if (typeof obj.modell !== 'string' || obj.modell.length === 0) verstoesse.push("'modell' muss ein nicht-leerer String sein")

  if (typeof obj.standardBudget !== 'object' || obj.standardBudget === null || Array.isArray(obj.standardBudget)) {
    verstoesse.push("'standardBudget' muss ein Objekt sein")
  }

  if (typeof obj.werkzeugsaetze !== 'object' || obj.werkzeugsaetze === null || Array.isArray(obj.werkzeugsaetze)) {
    verstoesse.push("'werkzeugsaetze' muss ein Objekt sein")
  } else {
    const eintraege = Object.entries(obj.werkzeugsaetze as Record<string, unknown>)
    if (eintraege.length === 0) verstoesse.push("'werkzeugsaetze' braucht mindestens einen lesenden und einen schreibenden Eintrag")
    const arten = new Set<string>()
    for (const [name, wert] of eintraege) {
      if (typeof wert !== 'object' || wert === null || Array.isArray(wert)) {
        verstoesse.push(`'werkzeugsaetze.${name}' muss ein Objekt sein`)
        continue
      }
      const w = wert as Record<string, unknown>
      if (w.art !== 'lesend' && w.art !== 'schreibend') verstoesse.push(`'werkzeugsaetze.${name}.art' muss 'lesend' oder 'schreibend' sein`)
      else arten.add(w.art)
      if (w.modus !== 'DEKLARIERT') verstoesse.push(`'werkzeugsaetze.${name}.modus' muss 'DEKLARIERT' sein`)
      if (!Array.isArray(w.erlaubte_werkzeuge) || w.erlaubte_werkzeuge.length === 0 || w.erlaubte_werkzeuge.some((t) => typeof t !== 'string' || t.length === 0)) {
        verstoesse.push(`'werkzeugsaetze.${name}.erlaubte_werkzeuge' muss ein nicht-leeres Array nicht-leerer Strings sein`)
      }
    }
    if (eintraege.length > 0 && !arten.has('lesend')) verstoesse.push("'werkzeugsaetze' braucht mindestens einen Eintrag mit art='lesend' (AK4)")
    if (eintraege.length > 0 && !arten.has('schreibend')) verstoesse.push("'werkzeugsaetze' braucht mindestens einen Eintrag mit art='schreibend' (AK4)")
  }

  return verstoesse
}

/**
 * Lädt und validiert eine Startvorlagendatei. Wirft bei jedem Fehlschlag
 * (Datei fehlt, kein JSON, Schemaverstoß) — eine ungültige Startvorlage ist
 * ein Konfigurationsfehler des Servers, kein Fachergebnis eines
 * Startauftrags (Vorbedingungsverletzung, Muster lineage-registry/
 * index.ts:243-245). Der Aufrufer lädt deshalb einmal beim Serverstart,
 * nicht je Request.
 * @param pfad - Pfad zur Startvorlagendatei (z. B. startvorlagen/beispielprojekt.json)
 * @returns die validierte Startvorlage
 */
export function ladeStartvorlage(pfad: string): StartvorlageV0Daten {
  let geparst: unknown
  try {
    geparst = JSON.parse(readFileSync(pfad, 'utf8'))
  } catch (fehler) {
    throw new Error(`Startvorlage '${pfad}' nicht lesbar oder kein gültiges JSON: ${(fehler as Error).message}`)
  }
  const verstoesse = validiereStartvorlageDaten(geparst)
  if (verstoesse.length > 0) {
    throw new Error(`Startvorlage '${pfad}' verletzt Schema: ${verstoesse.join('; ')}`)
  }
  return geparst as StartvorlageV0Daten
}

/**
 * Löst einen benannten Werkzeugsatz aus einer geladenen Startvorlage auf
 * (AK4/AK5) — ein Startauftrag wählt ausschließlich über diesen Namen, nie
 * über eine freie erlaubte_werkzeuge-Liste.
 * @param vorlage - geladene Startvorlage
 * @param name - vom Startauftrag gewählter Werkzeugsatz-Name
 * @returns die Werkzeugsatz-Begrenzung (modus/erlaubte_werkzeuge) oder undefined, wenn der Name unbekannt ist
 */
export function loeseWerkzeugsatzAuf(vorlage: StartvorlageV0Daten, name: string): BenannterWerkzeugsatz | undefined {
  return vorlage.werkzeugsaetze[name]
}

/**
 * Berechnet eine ProfilReferenz frisch aus dem echten Dateiinhalt am
 * referenzierten profilPfad (Muster: AK1 in scripts/check-f10-leitstand.mjs)
 * — nie ein im Repo mitgeführter, potenziell veralteter Hash. Wirft bei
 * fehlendem/kein-Zahl-'version'-Feld (Konfigurationsfehler, Muster
 * ladeStartvorlage — fail fast statt eines unbemerkten `undefined` in der
 * ProfilReferenz).
 * @param vorlage - geladene Startvorlage
 * @returns ProfilReferenz mit real berechnetem Inhalts-Hash
 */
export function leiteProfilReferenzAb(vorlage: StartvorlageV0Daten): ProfilReferenz {
  const inhalt = readFileSync(vorlage.profilPfad, 'utf8')
  const geparst = JSON.parse(inhalt) as Record<string, unknown>
  if (!Number.isInteger(geparst.version)) {
    throw new Error(`Profil '${vorlage.profilPfad}' hat kein gültiges 'version'-Feld (Integer erwartet)`)
  }
  return { pfad: vorlage.profilPfad, hash: sha256Hex(inhalt), version: geparst.version as number }
}
