/**
 * Datei: scripts/leitstand/routen-f35.mjs
 *
 * Zweck: Orchestrierung für POST /api/features/<featureId>/auftrag (F35
 * WS-1, features/F35/feature.md) — aufgerufen über den projektpräfigierten
 * Pfad /api/projekte/<projektId>/features/<featureId>/auftrag (Muster
 * erzeugeMultiProjektDispatcher, scripts/leitstand-server.mjs: der Rest
 * nach der Projekt-id wird wieder mit '/api' zusammengesetzt, jede
 * erzeugeRequestHandler-Instanz sieht dadurch unverändert ihre eigenen
 * /api/...-Pfade).
 *
 * Liest features/<featureId>/feature.md aus der repoWurzel DIESES Projekts
 * (E-F41-2: Projektinhalt, nie die installWurzel — Muster
 * scripts/leitstand/routen-roadmap.mjs' baueFeatureEintrag, inkl. derselben
 * Pfadsicherheit: resolve + Präfixvergleich gegen '<repoWurzel>/features/',
 * nicht nur das featureId-Muster). Baut den Auftrag über
 * baueAuftragAusFeatureAkte (src/feature-auftrag/index.ts, F35 WS-1 AK3)
 * und registriert ihn über registriereAuftrag — denselben Pfad wie POST
 * /api/auftraege (D5, kein zweiter Registrierungsweg).
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs,
 * scripts/check-f35-ws1-feature-auftrag.mjs.
 */

import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { registriereAuftrag, validiereAuftragAkzeptanzkriterien, validiereAuftragNichtZiele } from '../../src/auftrag/index.ts'
import { baueAuftragAusFeatureAkte } from '../../src/feature-auftrag/index.ts'
import { FEATURE_ID_MUSTER } from '../../src/projektkontext/index.ts'

// Zwilling von public/leitstand/views/workboard.js' FEATURE_STATUS_NICHT_BAUBAR (F35 WS-1 AK6) —
// die Workboard-Sichtbarkeit des "Bauen"-Knopfs ist NICHT die einzige Durchsetzung: ohne diese
// serverseitige Prüfung könnte ein zweiter Browser-Tab, ein veralteter Poll-Zustand oder ein
// direkter API-Aufruf trotzdem einen Bau-Auftrag für eine bereits abgeschlossene/abgebrochene
// Feature-Akte anlegen (QA-Pass-Befund, frischer Kontext, 25.09.2026).
const STATUS_NICHT_BAUBAR = new Set(['ABGESCHLOSSEN', 'ABGEBROCHEN'])
const STATUS_ZEILE_MUSTER = /^Status:\s*(\S+)/m

/**
 * Löst features/<featureId>/feature.md sicher gegen repoWurzel auf (Muster
 * baueFeatureEintrag, scripts/leitstand/routen-roadmap.mjs) — liest nie
 * außerhalb von features/, auch wenn featureId (entgegen dem bereits vorher
 * geprüften FEATURE_ID_MUSTER) je ungeprüft ankäme.
 * @returns absoluter Pfad, oder null, wenn er außerhalb von <repoWurzel>/features/ läge
 */
function loeseFeatureAktePfadAuf(featureId, repoWurzel) {
  const featuresWurzel = resolve(repoWurzel, 'features')
  const pfad = resolve(featuresWurzel, featureId, 'feature.md')
  const liegtUnterFeaturesWurzel = pfad === featuresWurzel || pfad.startsWith(featuresWurzel + sep)
  return liegtUnterFeaturesWurzel ? pfad : null
}

/**
 * Baut den Auftrag aus features/<featureId>/feature.md und registriert ihn
 * (Muster POST /api/auftraege, F39 WS-2a herkunft). Wirft nicht — jeder
 * Fehlerfall ist ein Fachergebnis mit passendem HTTP-Status (Auftrags-
 * Vorgabe Punkt 4: 400/404/422).
 * @param featureId - Feature-id aus dem Pfad (noch ungeprüft)
 * @param repoWurzel - Repo-Wurzel DIESES Projekts (E-F41-2, NIE die installWurzel)
 * @param profilReferenz - Profilreferenz dieser Serverinstanz
 * @param registrierOptionen - { basisVerzeichnis, schreiber? } (Muster registriereAuftrag-Aufrufstellen)
 * @returns { ok: true, auftragId } | { ok: false, status: 400 | 404 | 422 | 500, grund }
 */
export function baueUndRegistriereAuftragAusFeatureAkte(featureId, repoWurzel, profilReferenz, registrierOptionen) {
  if (typeof featureId !== 'string' || !FEATURE_ID_MUSTER.test(featureId)) {
    return { ok: false, status: 400, grund: `featureId muss dem Muster ^F[0-9]+[A-Za-z]?$ entsprechen (F-595), erhalten ${JSON.stringify(featureId)}` }
  }

  const pfad = loeseFeatureAktePfadAuf(featureId, repoWurzel)
  if (pfad === null || !existsSync(pfad)) {
    return { ok: false, status: 404, grund: `features/${featureId}/feature.md nicht gefunden` }
  }

  const inhalt = readFileSync(pfad, 'utf8')
  const statusTreffer = STATUS_ZEILE_MUSTER.exec(inhalt)
  const status = statusTreffer !== null ? statusTreffer[1] : undefined
  if (status !== undefined && STATUS_NICHT_BAUBAR.has(status)) {
    return { ok: false, status: 422, grund: `Feature-Status '${status}' lässt keinen Bau-Auftrag mehr zu (ABGESCHLOSSEN/ABGEBROCHEN)` }
  }

  const ergebnis = baueAuftragAusFeatureAkte(inhalt, featureId)
  if (!ergebnis.ok) {
    return { ok: false, status: 422, grund: ergebnis.grund }
  }

  // Verteidigungslinie (Muster registriereWorkflowEntscheidung, scripts/leitstand/routen-f39.mjs):
  // baueAuftragAusFeatureAkte hat akzeptanzkriterien/nicht_ziele bereits selbst geprüft (u. a.
  // eindeutige IDs) — diese zweite, unabhängige Prüfung gegen denselben Regelsatz wie das
  // AUFTRAG_V0-Schema verhindert, dass ein künftiger Fehler in baueAuftragAusFeatureAkte je ein
  // schemawidriges Kernartefakt schreiben könnte, statt hier mit einem Fachergebnis zu enden.
  const akVerstoesse = validiereAuftragAkzeptanzkriterien(ergebnis.akzeptanzkriterien)
  const nichtZieleVerstoesse = validiereAuftragNichtZiele(ergebnis.nicht_ziele)
  if (akVerstoesse.length > 0 || nichtZieleVerstoesse.length > 0) {
    return { ok: false, status: 500, grund: `baueAuftragAusFeatureAkte lieferte ein Ergebnis, das gegen das Auftragsschema verstößt: ${[...akVerstoesse, ...nichtZieleVerstoesse].join('; ')}` }
  }

  const auftragId = randomUUID()
  try {
    registriereAuftrag(auftragId, profilReferenz, ergebnis.titel, ergebnis.auftragstext, {
      ...registrierOptionen,
      herkunft: ergebnis.herkunft,
      akzeptanzkriterien: ergebnis.akzeptanzkriterien,
      nicht_ziele: ergebnis.nicht_ziele,
    })
  } catch (fehler) {
    return { ok: false, status: 500, grund: `Auftrag konnte nicht registriert werden: ${fehler.message}` }
  }
  return { ok: true, auftragId }
}
