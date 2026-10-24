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
 * scripts/check-feature.mjs) — fehlt die Akte, ist ihr Status 'keine_akte'.
 *
 * leitstand-server.mjs registriert GET /api/roadmap ausschließlich gegen
 * baueRoadmapProjektion — keine zweite Kopie dieser Logik dort (D5, Muster
 * routen-verbrauch.mjs).
 *
 * F45 B5b-1a (features/F45/plan-b5b1-v2.md, E-B5-1 = A): additiv — die v0-Felder bleiben unverändert lesbar. Je Feature
 * zusätzlich prioritaet, abgenommen, workstreams (null = keine Planungsdaten), workstreams_fehlerhaft und planung_befunde
 * (Formfehler sichtbar, kein Wurf; Leser src/workboard/feature-planung.ts). Bei status 'ok' zusätzlich roadmap_hash (sha256 der
 * Bytes aus demselben Lesevorgang wie die Daten — Grundlage des Meilenstein-Wechsels in B5b-1b; createHash über die Bytes statt
 * sha256Hex aus src/checkpoint-store, der nur Text hasht — wie sha256 in routen-f35.mjs), zeitachse und kennzahlen (reine Funktionen,
 * src/workboard/roadmap-planung.ts). Der Status je Akte kommt seit B5b-1a aus leseFeatureStatus (eine Regel mit dem Gate:
 * nur innerhalb einer Zeile). „Pflege & Fixes“ und Kanban liefert die Projektion bewusst nicht (Event-Loop, P2): B5b-2 leitet
 * sie aus /api/workitems und prioritaet ab.
 */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { validiereRoadmapDaten } from '../../src/projektkontext/index.ts'
import { leseFeatureStatus } from '../../src/workboard/feature-akte-pruefung.ts'
import { lesePlanung } from '../../src/workboard/feature-planung.ts'
import { baueZeitachse, berechneKennzahlen, heuteIso } from '../../src/workboard/roadmap-planung.ts'

const TITEL_ABSCHNITT_MUSTER = /^##\s*Titel\s*\r?\n+([^\r\n]+)/m

/**
 * Liest Status, Titel (falls einfach lesbar) und Planungsdaten aus features/<id>/feature.md — Status über
 * leseFeatureStatus (dieselbe Regel wie scripts/check-feature.mjs), Planung über lesePlanung (F45 B5b-1a).
 *
 * F-595-Fix (Defense-in-Depth): `validiereRoadmapDaten` lehnt eine Feature-id, die nicht
 * `^F[0-9]+[A-Za-z]?$` entspricht, bereits VOR diesem Aufruf ab (baueRoadmapProjektion ruft sie
 * zuerst auf) — ein `../x` erreicht diese Funktion über den regulären Pfad also nie. Diese Funktion
 * prüft den aufgelösten Pfad trotzdem zusätzlich gegen `<repoWurzel>/features/` (path.resolve +
 * Präfixvergleich, nicht nur das Regex-Muster), falls sie je mit einer ungeprüften Feature-id
 * aufgerufen wird — liest nie außerhalb von `features/`.
 * @param featureId - Feature-id aus roadmap.json meilensteine[].features
 * @param repoWurzel - Repo-Wurzel, gegen die 'features/<id>/feature.md' aufgelöst wird
 * @returns { id, titel?, status, prioritaet, abgenommen, workstreams, planung_befunde } — ohne Akte nur { id, status: 'keine_akte' }
 */
function baueFeatureEintrag(featureId, repoWurzel) {
  const featuresWurzel = resolve(repoWurzel, 'features')
  const pfad = resolve(featuresWurzel, featureId, 'feature.md')
  const liegtUnterFeaturesWurzel = pfad === featuresWurzel || pfad.startsWith(featuresWurzel + sep)
  if (!liegtUnterFeaturesWurzel || !existsSync(pfad)) {
    return { id: featureId, status: 'keine_akte' }
  }
  const inhalt = readFileSync(pfad, 'utf8')
  const titelMatch = inhalt.match(TITEL_ABSCHNITT_MUSTER)
  const eintrag = { id: featureId, status: leseFeatureStatus(inhalt) ?? 'UNBEKANNT' }
  if (titelMatch !== null) eintrag.titel = titelMatch[1].trim()
  const planung = lesePlanung(inhalt)
  eintrag.prioritaet = planung.prioritaet
  eintrag.abgenommen = planung.abgenommen
  eintrag.workstreams = planung.workstreams
  eintrag.workstreams_fehlerhaft = planung.workstreams_fehlerhaft
  eintrag.planung_befunde = planung.befunde
  return eintrag
}

/**
 * Baut die Roadmap-Projektion für GET /api/roadmap (F33 WS-2). Wirft NIE —
 * jeder Fehlerfall (Datei fehlt, JSON kaputt, Schemaverstoß) ist ein
 * Fachergebnis im Rückgabewert.
 * @param optionen - { repoWurzel, roadmapPfad, heute? } — repoWurzel-relativer roadmapPfad (Muster erzeugeRequestHandler/roadmapPfad, scripts/leitstand-server.mjs); heute (JJJJ-MM-TT) nur für Tests
 * @returns { status: 'nicht_vorhanden' } | { status: 'ungueltig', fehler: string[] } | { status: 'ok', vision, roadmap_hash, meilensteine: [{ id, titel, status, features: [...] }], zeitachse: { heute, eintraege }, kennzahlen }
 */
export function baueRoadmapProjektion({ repoWurzel, roadmapPfad, heute = heuteIso() }) {
  const pfad = join(repoWurzel, roadmapPfad)
  if (!existsSync(pfad)) {
    return { status: 'nicht_vorhanden' }
  }

  let roh
  let roadmapHash
  try {
    // Hash und Daten aus demselben Lesevorgang (Advisor B2; Muster B6 aus B5a-1).
    const bytes = readFileSync(pfad)
    roadmapHash = createHash('sha256').update(bytes).digest('hex')
    roh = JSON.parse(bytes.toString('utf8'))
  } catch (fehler) {
    return { status: 'ungueltig', fehler: [`JSON-Parsefehler: ${fehler.message}`] }
  }

  const verstoesse = validiereRoadmapDaten(roh)
  if (verstoesse.length > 0) {
    return { status: 'ungueltig', fehler: verstoesse }
  }

  const meilensteine = roh.meilensteine.map((meilenstein) => ({
    id: meilenstein.id,
    titel: meilenstein.titel,
    status: meilenstein.status,
    features: meilenstein.features.map((featureId) => baueFeatureEintrag(featureId, repoWurzel)),
  }))
  // workstreams_fehlerhaft: nur Formfehler der Tabelle zählen (qa 1) — eine ungültige Priorität verschiebt keinen Balken.
  const planung = meilensteine.map((m) => ({
    id: m.id,
    status: m.status,
    features: m.features.map((f) => ({ id: f.id, status: f.status, workstreams: f.workstreams ?? null, workstreams_fehlerhaft: f.workstreams_fehlerhaft === true })),
  }))
  return {
    status: 'ok',
    vision: roh.vision,
    roadmap_hash: roadmapHash,
    meilensteine,
    zeitachse: { heute, eintraege: baueZeitachse(planung, heute) },
    kennzahlen: berechneKennzahlen(planung),
  }
}
