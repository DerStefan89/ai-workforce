/**
 * Datei: scripts/leitstand/rueckfrage-protokoll.mjs
 *
 * Zweck: Schreiber des Rückfrage-Protokolls (F45 B2b-3b-1b, features/F45/plan-b2b3b1b-v2.md A2/A3). Rückruf `protokolliere`
 * der Vermittlung: registriert je Entscheidung die nächste Version des Kern-Artefakts `rueckfragen-<laufId>` im
 * Kontrollzustand (Hash-Kette, nicht im Arbeitsordner) mit ALLEN Einträgen des Laufs bis hier — die Liste führt die
 * Vermittlung, der Schreiber lädt nichts (A2: kein Lesen je Entscheidung; ein fehlgeschlagener Schreibvorgang wird mit der
 * nächsten Entscheidung nachgeholt).
 *
 * Je Textfeld (A3): erst neutralisieren (Arbeitsordner, Temp, Home ⇒ Platzhalter), dann maskieren (bekannte Geheimnis-Muster),
 * dann auf die Feldgrenze kappen (grund 500, befehl/frage/antwort 2000) — so bleibt kein Geheimnis an der Schnittkante halb
 * stehen. `tool_name` wird nicht gekürzt: über 200 Zeichen ⇒ Platzhalter '<zu lang>' (passt nie zu einer Ablehnung ⇒
 * VERWEIGERT). Vor dem Registrieren prüft validiereRueckfrageProtokoll; ein Verstoß oder ein Schreibfehler wirft — die
 * Vermittlung fängt den Wurf, die Entscheidung bleibt, die Auswertung fällt für die betroffene Ablehnung auf VERWEIGERT
 * (sichere Richtung).
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs (erzeugeRequestHandler, Standard-Vermittlung; darüber indirekt
 * scripts/check-f45-b2b3b1b-auswertung.mjs (p3)), scripts/leitstand/rueckfrage-protokoll.test.mjs.
 */

import { registriereKernArtefakt } from '../../src/lineage-registry/index.ts'
import { neutralisiereText, PROTOKOLL_GRENZEN, validiereRueckfrageProtokoll } from '../../src/rueckfrage/protokoll.ts'
import { maskiereGeheimnisse } from './geheimnisse-maskieren.mjs'

/** Platzhalter für einen Werkzeugnamen über der Grenze. */
export const TOOL_NAME_ZU_LANG = '<zu lang>'

/** Artefakt-ID des Protokolls eines Laufs. */
export const rueckfragenArtefaktId = (laufId) => `rueckfragen-${laufId}`

/**
 * Bereitet einen Rohtext für das Protokoll auf: neutralisieren, maskieren, kappen (A3).
 * @param text - Rohtext
 * @param orte - { arbeitsordner, temp, home }
 * @param grenze - Höchstlänge
 * @returns aufbereiteter Text
 */
function bereiteText(text, orte, grenze) {
  return maskiereGeheimnisse(neutralisiereText(String(text), orte)).slice(0, grenze)
}

/**
 * Ein Eintrag der Vermittlung als Protokolleintrag (nur Schemafelder).
 * @param eintrag - { tool_use_id, tool_name, input_hash, art, grund, zeit, befehl?, frage?, antwort? }
 * @param orte - Neutralisier-Orte
 * @returns Protokolleintrag
 */
function baueEintrag(eintrag, orte) {
  const toolName = typeof eintrag.tool_name === 'string' && eintrag.tool_name.length <= PROTOKOLL_GRENZEN.toolName ? eintrag.tool_name : TOOL_NAME_ZU_LANG
  return {
    tool_use_id: eintrag.tool_use_id ?? null,
    tool_name: toolName,
    input_hash: eintrag.input_hash,
    art: eintrag.art,
    grund: bereiteText(eintrag.grund ?? '', orte, PROTOKOLL_GRENZEN.grund),
    zeit: eintrag.zeit,
    ...(eintrag.befehl !== undefined ? { befehl: bereiteText(eintrag.befehl, orte, PROTOKOLL_GRENZEN.text) } : {}),
    ...(eintrag.frage !== undefined ? { frage: bereiteText(eintrag.frage, orte, PROTOKOLL_GRENZEN.text) } : {}),
    ...(eintrag.antwort !== undefined ? { antwort: bereiteText(eintrag.antwort, orte, PROTOKOLL_GRENZEN.text) } : {}),
  }
}

/**
 * Erzeugt den Rückruf `protokolliere` für die Vermittlung.
 * @param {object} optionen
 * @param {object} optionen.profilReferenz - Profil-Referenz des Handlers
 * @param {string} [optionen.basisVerzeichnis] - Kontrollzustand-Wurzel (dieselbe, aus der der Controller liest)
 * @param {string} optionen.home - Home-Verzeichnis (Neutralisierung)
 * @param {string} optionen.temp - Temp-Verzeichnis (Neutralisierung)
 * @param {(ereignis: object) => void} [optionen.schreiber] - Ereignis-Schreiber der Lineage (Standard still)
 * @returns (laufId, eintrag, { arbeitsordner, eintraege }) => void — wirft bei ungültigem Protokoll oder Schreibfehler
 */
export function erzeugeRueckfrageProtokollSchreiber({ profilReferenz, basisVerzeichnis, home, temp, schreiber = () => {} }) {
  return (laufId, _eintrag, kontext) => {
    const orte = { arbeitsordner: kontext?.arbeitsordner ?? '', temp, home }
    const daten = { rueckfragen_schema: 'v0', lauf_id: laufId, eintraege: (kontext?.eintraege ?? []).map((e) => baueEintrag(e, orte)) }
    const verstoesse = validiereRueckfrageProtokoll(daten)
    if (verstoesse.length > 0) throw new Error(`Rückfrage-Protokoll verstößt gegen schemas/kontrollzustand-rueckfragen-payload.schema.json: ${verstoesse.join('; ')}`)
    registriereKernArtefakt(rueckfragenArtefaktId(laufId), profilReferenz, { erzeuger: 'kern', schritt: 'rueckfrage-protokoll' }, daten, [], { basisVerzeichnis, schreiber })
  }
}
