/**
 * Datei: scripts/leitstand/routen-faehigkeit-vorschlag.mjs
 *
 * Zweck: F45 „Fähigkeit bauen“ (F-1069, features/F45/plan-fb1-v2.md). FB-1a: die Projektion der Fähigkeit-Vorschläge für
 * GET /api/workflows/<id>/abnahme (Feld faehigkeitVorschlaege, additiv) — Erkennung aus src/faehigkeiten/vorschlag.ts plus
 * ziel_ignoriert (git check-ignore), mit kurzem Cache je Arbeitsordner, weil die Abnahme alle 2 s abgefragt wird (Advisor B8).
 * Die Routen „übernehmen“/„verwerfen“ folgen mit FB-1b in diesem Modul (Entscheidung Stefan E-FB1-1/E-FB1-2, 23.10.2026).
 *
 * Wird aufgerufen von:
 * - scripts/leitstand-server.mjs (GET …/abnahme; Regelzeile im Auftrag der Ausführung)
 * - scripts/leitstand/routen-faehigkeit-vorschlag.test.mjs, scripts/check-f45-fb1-faehigkeit-vorschlag.mjs
 *
 * Wichtig:
 * - nur lesend. Nur für einen Arbeitsordner aufrufen — im Projektordner bleibt der Kern lesend und es gibt keine Übernahme
 *   (ARCHITECTURE.md §2); die Auswahl des Orts trifft der Server (ermittleLaufort, nicht während Vorbereitung/Aufräumen).
 * - Der Cache hält höchstens einen Eintrag je Arbeitsordner, der je angezeigt wurde, auch nach dem Aufräumen (begrenzt durch
 *   die Zahl der Abläufe einer Serverinstanz). Die Erkennung selbst ist nicht gecacht — begrenzt durch VORSCHLAG_GRENZEN.
 */

import { erkenneFaehigkeitVorschlaege, FAEHIGKEIT_VORSCHLAG_REGEL, pruefeZielIgnoriert, zielPfad } from '../../src/faehigkeiten/vorschlag.ts'

export { FAEHIGKEIT_VORSCHLAG_REGEL }

/** Cache der check-ignore-Ergebnisse: Schlüssel Wurzel + Ziele → { zeit, versprechen }. */
const STANDARD_CACHE = new Map()

/**
 * Vorschläge eines Arbeitsordners für die Abnahme: Erkennung je Aufruf (begrenzt, ein lstat ohne Vorschläge), ziel_ignoriert
 * aus einem git-Aufruf, der für dieselbe Wurzel und dieselben Ziele höchstens cacheMs alt ist (laufende Aufrufe werden geteilt).
 * Wirft nie.
 * @param wurzel - absoluter Pfad des Arbeitsordners
 * @param optionen - { jetzt, cacheMs, cache } (Tests)
 * @returns Vorschläge mit ziel_ignoriert; [] ohne Vorschläge (der Server lässt das Feld dann weg)
 */
export async function baueVorschlagProjektion(wurzel, { jetzt = Date.now, cacheMs = 10000, cache = STANDARD_CACHE } = {}) {
  const vorschlaege = erkenneFaehigkeitVorschlaege(wurzel)
  if (vorschlaege.length === 0) return []
  const praefix = `${wurzel}\0`
  const schluessel = `${praefix}${vorschlaege.map((v) => zielPfad(v) ?? '').join('|')}`
  let eintrag = cache.get(schluessel)
  if (eintrag === undefined || jetzt() - eintrag.zeit >= cacheMs) {
    // Ältere Einträge derselben Wurzel verfallen mit (der Cache wächst nicht über einen Eintrag je Arbeitsordner).
    for (const k of cache.keys()) if (k.startsWith(praefix)) cache.delete(k)
    eintrag = { zeit: jetzt(), versprechen: pruefeZielIgnoriert(wurzel, vorschlaege) }
    cache.set(schluessel, eintrag)
  }
  const ignoriert = await eintrag.versprechen
  return vorschlaege.map((v) => ({ ...v, ziel_ignoriert: ignoriert.get(v.pfad) ?? null }))
}
