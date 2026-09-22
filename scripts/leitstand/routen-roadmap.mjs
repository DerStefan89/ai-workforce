/**
 * Datei: scripts/leitstand/routen-roadmap.mjs
 *
 * Zweck: Projektion für GET /api/roadmap (F33 WS-2, §12 "Wo stehen wir?" —
 * die ANTWORT selbst liefert bereits F40 über die Context-Builder-
 * Einspeisung, siehe features/F33/feature.md WS-2; diese Route liefert nur
 * die SICHTBARE Roadmap fürs Workboard, kein Chat, kein Prompt-Umbau).
 *
 * baueRoadmapProjektion liest roadmap.json über dieselbe Validierung wie
 * ladeRoadmap (src/projektkontext/index.ts, validiereRoadmapDaten), aber
 * OHNE deren Wurf: eine fehlende oder ungültige Datei ist hier ein
 * Fachergebnis ({ status: 'nicht_vorhanden' } bzw. { status: 'ungueltig',
 * fehler }), kein Serverfehler (kein 500, Auftrag F33 WS-2). Je Feature-id
 * eines Meilensteins wird zusätzlich features/<id>/feature.md gelesen (Muster
 * scripts/check-feature.mjs, Status-Regex identisch) — fehlt die Akte, ist
 * ihr Status 'keine_akte'.
 *
 * leitstand-server.mjs registriert GET /api/roadmap ausschließlich gegen
 * baueRoadmapProjektion — keine zweite Kopie dieser Logik dort (D5, Muster
 * routen-verbrauch.mjs).
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { validiereRoadmapDaten } from '../../src/projektkontext/index.ts'

const STATUS_ZEILE_MUSTER = /^Status:\s*(\S+)/m
const TITEL_ABSCHNITT_MUSTER = /^##\s*Titel\s*\r?\n+([^\r\n]+)/m

/** Liest Status + (falls einfach lesbar) Titel aus features/<id>/feature.md — Muster scripts/check-feature.mjs (identisches Status-Regex, kein zweiter Regelsatz). @param featureId - Feature-id aus roadmap.json meilensteine[].features @param repoWurzel - Repo-Wurzel, gegen die 'features/<id>/feature.md' aufgelöst wird @returns { id, titel?, status } */
function baueFeatureEintrag(featureId, repoWurzel) {
  const pfad = join(repoWurzel, 'features', featureId, 'feature.md')
  if (!existsSync(pfad)) {
    return { id: featureId, status: 'keine_akte' }
  }
  const inhalt = readFileSync(pfad, 'utf8')
  const statusMatch = inhalt.match(STATUS_ZEILE_MUSTER)
  const titelMatch = inhalt.match(TITEL_ABSCHNITT_MUSTER)
  const eintrag = { id: featureId, status: statusMatch !== null ? statusMatch[1] : 'UNBEKANNT' }
  if (titelMatch !== null) eintrag.titel = titelMatch[1].trim()
  return eintrag
}

/**
 * Baut die Roadmap-Projektion für GET /api/roadmap (F33 WS-2). Wirft NIE —
 * jeder Fehlerfall (Datei fehlt, JSON kaputt, Schemaverstoß) ist ein
 * Fachergebnis im Rückgabewert.
 * @param optionen - { repoWurzel, roadmapPfad } — repoWurzel-relativer roadmapPfad (Muster erzeugeRequestHandler/roadmapPfad, scripts/leitstand-server.mjs)
 * @returns { status: 'nicht_vorhanden' } | { status: 'ungueltig', fehler: string[] } | { status: 'ok', vision, meilensteine: [{ id, titel, status, features: [{ id, titel?, status }] }] }
 */
export function baueRoadmapProjektion({ repoWurzel, roadmapPfad }) {
  const pfad = join(repoWurzel, roadmapPfad)
  if (!existsSync(pfad)) {
    return { status: 'nicht_vorhanden' }
  }

  let roh
  try {
    roh = JSON.parse(readFileSync(pfad, 'utf8'))
  } catch (fehler) {
    return { status: 'ungueltig', fehler: [`JSON-Parsefehler: ${fehler.message}`] }
  }

  const verstoesse = validiereRoadmapDaten(roh)
  if (verstoesse.length > 0) {
    return { status: 'ungueltig', fehler: verstoesse }
  }

  return {
    status: 'ok',
    vision: roh.vision,
    meilensteine: roh.meilensteine.map((meilenstein) => ({
      id: meilenstein.id,
      titel: meilenstein.titel,
      status: meilenstein.status,
      features: meilenstein.features.map((featureId) => baueFeatureEintrag(featureId, repoWurzel)),
    })),
  }
}
