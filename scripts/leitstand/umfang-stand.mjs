/**
 * Datei: scripts/leitstand/umfang-stand.mjs
 *
 * Zweck: Umfangs-Abgleich eines Ablaufs (F45 B2b-3d, F-978, features/F45/plan-b2b3d-v2.md) — die Schale um src/umfang.
 * (1) Nach dem Ausführungslauf: das Ergebnis des Abgleichs als Feld `umfang` der Änderungsübersicht festhalten (Muster
 * `loeschliste`). Eigene Prüfung VOR dem Zusammensetzen: ein Wurf oder ein Formfehler lässt nur das Feld weg — ein Hinweis
 * darf die Übersicht nie verhindern (ohne Übersicht hält Regel 1j an, Advisor A1). Eine degradierte Übersicht (dateien leer
 * aus Unwissen) bekommt kein Feld (kein falsches „alles innerhalb“, Advisor A2). (2) Projektion für GET …/abnahme.
 * (3) Zeile für den Auftrag von Review und qa.
 *
 * Nur ein Hinweis, nie ein Halt. Durchsetzungsgrad DEKLARIERT (ARCHITECTURE.md §8). Synchron, wirft nie.
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs, scripts/check-f45-b2b3d-umfang.mjs, scripts/leitstand/umfang-stand.test.mjs.
 */

import { istAenderungsuebersichtDegradiert, validiereUmfang } from '../../src/aenderungsuebersicht/index.ts'
import { ladeArtefaktVersion } from '../../src/lineage-registry/index.ts'
import { baueUmfangsZeile, gleicheUmfangAb } from '../../src/umfang/index.ts'

/**
 * Feld `umfang` für die Änderungsübersicht eines Ausführungslaufs.
 * @param laufId - Lauf (nur für das Protokoll)
 * @param uebersicht - frisch erzeugte Änderungsübersicht (vor dem Zusammensetzen)
 * @param bereiche - `bereiche` des Auftrags (laufort.bereiche) oder undefined
 * @returns `{ umfang }` zum Einmischen oder `{}` (keine Bereiche, degradiert, Wurf oder Formfehler — dann protokolliert)
 */
export function ermittleUmfangFuerUebersicht(laufId, uebersicht, bereiche) {
  if (!Array.isArray(bereiche) || bereiche.length === 0) return {}
  try {
    if (istAenderungsuebersichtDegradiert(uebersicht)) {
      console.log(`[leitstand] Umfangs-Abgleich Lauf '${laufId}': Änderungsübersicht degradiert — nicht bestimmbar, kein Feld`)
      return {}
    }
    const umfang = gleicheUmfangAb(uebersicht.dateien, bereiche)
    if (umfang === null) return {}
    const verstoesse = validiereUmfang(umfang)
    if (verstoesse.length > 0) {
      console.error(`[leitstand] Umfangs-Abgleich Lauf '${laufId}' ungültig, Feld weggelassen: ${verstoesse.join('; ')}`)
      return {}
    }
    return { umfang }
  } catch (fehler) {
    console.error(`[leitstand] Umfangs-Abgleich Lauf '${laufId}' fehlgeschlagen, Feld weggelassen:`, fehler)
    return {}
  }
}

/**
 * Projektion `umfang` für GET …/abnahme.
 * @param bereiche - `bereiche` der neuesten Auftragsversion oder undefined
 * @param ausfuehrungGelaufen - true, wenn der Ausführungsschritt eine lauf_id trägt und nicht mehr läuft (die lauf_id steht schon
 *   beim Start; solange er läuft, gibt es noch keine Übersicht — code-reviewer 5)
 * @param uebersichtDaten - Daten der Änderungsübersicht dieses Laufs oder null
 * @returns { status: 'kein_abgleich' | 'noch_nicht_gelaufen' | 'nicht_bestimmbar' | 'ok', ausserhalb: string[], bereiche? } —
 *   'ok' nur aus dem festgehaltenen Feld, dann mit den vereinbarten Bereichen (die Abnahme nennt sie, qa 1); Bereiche ohne Feld (Alt-Artefakt, degradiert, Formfehler) ⇒ nicht_bestimmbar
 */
export function baueUmfangProjektion(bereiche, ausfuehrungGelaufen, uebersichtDaten) {
  const festgehalten = uebersichtDaten?.umfang
  if (festgehalten !== undefined && validiereUmfang(festgehalten).length === 0) return { status: 'ok', ausserhalb: festgehalten.ausserhalb, bereiche: festgehalten.bereiche }
  if (!Array.isArray(bereiche) || bereiche.length === 0) return { status: 'kein_abgleich', ausserhalb: [] }
  if (!ausfuehrungGelaufen) return { status: 'noch_nicht_gelaufen', ausserhalb: [] }
  return { status: 'nicht_bestimmbar', ausserhalb: [] }
}

/**
 * Zeile für den Auftrag von Review und qa aus der festgehaltenen Übersicht des Ausführungslaufs.
 * @param ausfuehrungLaufId - lauf_id des Ausführungsschritts oder null/undefined
 * @param ladeOptionen - Optionen der Lineage-Registry
 * @returns '' ohne Lauf, ohne Feld oder ohne Dateien außerhalb (Auftrag bleibt bitgleich), sonst die Zeile
 */
export function leseUmfangsZeile(ausfuehrungLaufId, ladeOptionen) {
  if (typeof ausfuehrungLaufId !== 'string') return ''
  try {
    const umfang = ladeArtefaktVersion(`aenderungsuebersicht-${ausfuehrungLaufId}`, undefined, ladeOptionen)?.daten?.umfang
    if (umfang === undefined || validiereUmfang(umfang).length > 0) return ''
    return baueUmfangsZeile(umfang.ausserhalb)
  } catch (fehler) {
    console.error(`[leitstand] Umfangs-Zeile für Lauf '${ausfuehrungLaufId}' nicht lesbar — Auftrag ohne Zeile:`, fehler)
    return ''
  }
}
