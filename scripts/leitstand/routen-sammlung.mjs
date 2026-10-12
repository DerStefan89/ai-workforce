/**
 * Datei: scripts/leitstand/routen-sammlung.mjs
 *
 * Zweck: Bausteine der Sammlung im Leitstand (F45 F-2b-1; Arbeitsregel M5: der Server registriert nur, die Regeln stehen
 * in src/sammlung):
 * - GET /api/sammlung — Stefans Sammlung (docs/harness/kandidaten-2026-09-15.md, nur die Bewertungsmatrix) mit Zuordnung
 *   zum Katalog, Typ, Auswahlgrund und Stand dieses Projekts (installiert · aktiv · benutzt aus baueKatalogStatus, F-2a) —
 *   baueSammlungAntwort;
 * - Scout liest die Sammlung zuerst (F-1057, Advisor A12): baueScoutAnhang (Anhang an den Prompt eines Scout-Laufs) und
 *   baueScoutSammlungAbgleich (Serverwahrheit je Kandidat, Feld scoutSammlung neben dem unveränderten scoutErgebnis).
 * Beide Dateien liegen in der Installation (installWurzel), nicht im Projekt — dieselbe Sammlung für jedes Projekt.
 *
 * Wird aufgerufen von:
 * - scripts/leitstand-server.mjs (GET /api/sammlung, POST /api/laeufe mit rolle 'scout', baueScoutErgebnisProjektion)
 * - scripts/leitstand/routen-sammlung.test.mjs, scripts/check-f45-f2b-sammlung.mjs
 *
 * Wichtig:
 * - Nur lesen: die Sammlung und die Stack-Liste werden nie geschrieben.
 * - Nicht im Poll: GET /api/sammlung lädt die Seite Workforce bei Bedarf. Die Dateien werden nach (mtime, size)
 *   zwischengespeichert — sie ändern sich nur per Commit.
 * - Wirft nie: ein Lesefehler wird ein Fehlerstand (status 'fehler'), der Scout läuft dann mit Hinweis wie bisher.
 */

import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { baueSammlungAnsicht, baueScoutSammlung, parseSammlung, pruefeScoutGegenSammlung } from '../../src/sammlung/index.ts'
import { baueKatalogStatus } from './routen-faehigkeiten.mjs'

/** Pfade der Sammlung und der Stack-Liste relativ zur Installation. */
export const SAMMLUNG_PFAD = join('docs', 'harness', 'kandidaten-2026-09-15.md')
export const STACK_PFAD = join('docs', 'harness', 'stack-kandidaten.md')

/** Zwischenspeicher je absolutem Pfad: { schluessel: 'mtime:size', text }. */
const dateiCache = new Map()

/** Code-Review 9: zuletzt geparste Sammlung ({ text, geparst }) — das Lauf-Detail parst sonst bei jedem Abruf neu. */
let parseCache = { text: null, geparst: null }

/**
 * parseSammlung mit Zwischenspeicher für denselben Text.
 * @param text - Inhalt der Sammlung
 * @returns Ergebnis von parseSammlung
 */
function parseGecacht(text) {
  if (parseCache.text !== text) parseCache = { text, geparst: parseSammlung(text) }
  return parseCache.geparst
}

/**
 * Liest eine Datei mit Zwischenspeicher nach (mtime, size).
 * @param pfad - absoluter Pfad
 * @returns { text } oder { text: null, grund }
 */
function leseGecacht(pfad) {
  try {
    const st = statSync(pfad)
    const schluessel = `${st.mtimeMs}:${st.size}`
    const alt = dateiCache.get(pfad)
    if (alt !== undefined && alt.schluessel === schluessel) return { text: alt.text }
    const text = readFileSync(pfad, 'utf8')
    dateiCache.set(pfad, { schluessel, text })
    return { text }
  } catch (fehler) {
    return { text: null, grund: fehler instanceof Error ? fehler.message : String(fehler) }
  }
}

/**
 * Liest Sammlung und Stack-Liste aus der Installation.
 * @param installWurzel - Installationsordner der Workforce
 * @returns { text, stackText, grund }
 */
export function leseSammlungDateien(installWurzel) {
  const sammlung = leseGecacht(join(installWurzel, SAMMLUNG_PFAD))
  const stack = leseGecacht(join(installWurzel, STACK_PFAD))
  return { text: sammlung.text, stackText: stack.text, grund: sammlung.grund ?? null }
}

/**
 * Antwort von GET /api/sammlung.
 * @param eingabe - { installWurzel, katalog (aufgelöste Ressourcen), projektId, lokal (ladeFaehigkeitenLokal), letzterLauf
 *   ({ laufId, daten } | null), kennung (empfehlungsKennung) }
 * @returns { http, koerper }
 */
export function baueSammlungAntwort({ installWurzel, katalog, projektId, lokal, letzterLauf, kennung }) {
  const { text, stackText, grund } = leseSammlungDateien(installWurzel)
  if (text === null) return { http: 200, koerper: { status: 'fehler', grund: `${SAMMLUNG_PFAD} nicht lesbar: ${grund}` } }
  let katalogStatus
  // Code-Review 3: ein Fehler des Katalog-Status bleibt sichtbar (Band) — sonst stünden installierte MCPs still auf „vorgemerkt“.
  let standFehler = null
  try {
    katalogStatus = new Map(
      baueKatalogStatus({ projektId, lokal, katalog, letzterLauf, kennung }).map((e) => [e.id, { id: e.id, installiert: e.installiert, aktiv: e.aktiv, aufrufe: e.letzter_lauf?.aufrufe ?? null }])
    )
  } catch (fehler) {
    console.error('[sammlung] Katalog-Status nicht berechenbar:', fehler)
    katalogStatus = new Map()
    standFehler = fehler instanceof Error ? fehler.message : String(fehler)
  }
  let ansicht
  try {
    ansicht = baueSammlungAnsicht({ text, stackText, katalog, katalogStatus })
  } catch (fehler) {
    // Code-Review 2: „Wirft nie“ — ein unerwarteter Wurf wird ein Fehlerstand.
    console.error('[sammlung] Ansicht nicht baubar:', fehler)
    return { http: 200, koerper: { status: 'fehler', grund: `${SAMMLUNG_PFAD}: ${fehler instanceof Error ? fehler.message : String(fehler)}` } }
  }
  if (ansicht.status !== 'ok') return { http: 200, koerper: { status: 'fehler', grund: `${SAMMLUNG_PFAD}: ${ansicht.grund}` } }
  return { http: 200, koerper: { ...ansicht, stand_fehler: standFehler, quelle: { ...ansicht.quelle, pfad: SAMMLUNG_PFAD.replaceAll('\\', '/') } } }
}

/**
 * Anhang an den Prompt eines Scout-Laufs (F-1057): „Sammlung zuerst“ mit kompakter Liste; nicht lesbar → Hinweiszeile.
 * @param installWurzel - Installationsordner
 * @returns Text
 */
export function baueScoutAnhang(installWurzel) {
  const { text, stackText, grund } = leseSammlungDateien(installWurzel)
  return baueScoutSammlung(text, stackText, grund ?? 'nicht lesbar')
}

/**
 * Prompt eines direkt gestarteten Laufs (POST /api/laeufe): nur für die Rolle scout wird der Sammlungs-Anhang angehängt
 * (Plan v2.1, Delta B3); jede andere Rolle bekommt den Text unverändert. Ein Scout-Schritt über einen Workflow
 * (starteWorkflowSchritt) läuft nicht hier durch — bekannte Grenze (Akte F45, Stand F-2b-1).
 * @param rolle - eingabenRoh.rolle
 * @param auftragstext - Text des Auftrags
 * @param installWurzel - Installationsordner
 * @returns Prompttext
 */
export function ergaenzeScoutPrompt(rolle, auftragstext, installWurzel) {
  return rolle === 'scout' ? `${auftragstext}\n\n${baueScoutAnhang(installWurzel)}` : auftragstext
}

/**
 * Abgleich eines gültigen Scout-Ergebnisses mit der Sammlung (Serverwahrheit, Feld scoutSammlung im Lauf-Detail neben dem
 * unveränderten scoutErgebnis): je Kandidat { treffer, abweichung } in derselben Reihenfolge.
 * @param ergebnis - geparstes, gültiges ergebnis-scout
 * @param installWurzel - Installationsordner
 * @returns Abgleich je Kandidat oder null (Sammlung nicht lesbar, kein Ergebnis)
 */
export function baueScoutSammlungAbgleich(ergebnis, installWurzel) {
  const { text } = leseSammlungDateien(installWurzel)
  const geparst = text === null ? null : parseGecacht(text)
  if (geparst === null || !geparst.ok || !Array.isArray(ergebnis?.kandidaten)) return null
  return pruefeScoutGegenSammlung(ergebnis.kandidaten, geparst.zeilen)
}
