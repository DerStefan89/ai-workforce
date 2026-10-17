/**
 * Datei: scripts/leitstand/lauf-terminal-projektion.mjs
 *
 * Zweck: Projektionen aus `daten` der terminalen Wirkungsmarke eines Laufs für `GET /api/laeufe/<laufId>` — reine Lesehelfer über die
 * Checkpoint-Kette (D5: kein neuer Endpunkt, das Lauf-Detail bleibt der einzige Lieferant).
 * - `baueVerweigertDatenProjektion` (F13 WS-1 AK2), seit F45 B2b-3b-2b-2a-3 aus scripts/leitstand-server.mjs hierher umgezogen (unverändert).
 * - `baueRueckfrageKanalProjektion` (F45 B2b-3b-2b-2a-3, features/F45/plan-b2b3b2b2a3-v2.md): Felder des Rückfrage-Kanals für die Abnahme
 *   (Zählung, Abgleich-Grund, R3-Abweichung, bestätigte Ablehnungen durch Stefan).
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs (GET /api/laeufe/<laufId>, Kenntnisnahme-Prüfung, Sichtungs-Halt),
 * scripts/check-f45-b2b3b2b2a3-abnahme.mjs (p)/(s).
 *
 * Wichtig: nie raten — fehlt ein Feld oder hat es eine fremde Form, steht 'unbekannt' bzw. null; Texte (Grund, Abweichung) gehen roh
 * hinaus, die Oberfläche escaped sie (sie können aus einer gefälschten Protokoll-Datei stammen).
 */

import { ladeGueltigeCheckpoints } from '../../src/checkpoint-store/index.ts'

/** Ereignisse der Kettenprüfung werden hier nicht gebraucht (Muster STILLER_SCHREIBER im Server). */
const STILLER_SCHREIBER = () => {}

/** Antwortfelder der Zählung (seit B2b-3b-2b-2a-1) — ohne sie gilt die Zählung als nicht lesbar. */
const ANTWORT_FELDER = ['stefan_erlaubt', 'stefan_abgelehnt', 'frage_beantwortet', 'nicht_browser']
/** Unbeantwortete (seit B2b-3b-2b-2a-3) — fehlen sie in einer älteren Marke, stehen sie als null (Advisor M3). */
const UNBEANTWORTET_FELDER = ['abgelaufen', 'lauf_ende', 'automatisch']

/** Nicht-negative Ganzzahl. */
const istAnzahl = (wert) => Number.isInteger(wert) && wert >= 0

/**
 * daten der terminalen Wirkungsmarke (Sequenz laufStatus.terminalSequenz), oder null.
 * @param laufId - Lauf-Kennung
 * @param laufStatus - Ergebnis von stelleLaufstatusFest
 * @param basisVerzeichnis - Kontrollzustand-Wurzel
 * @returns { ergebnis, daten } oder null
 */
function terminalMarke(laufId, laufStatus, basisVerzeichnis) {
  const kette = ladeGueltigeCheckpoints(laufId, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
  const terminal = kette.find((eintrag) => eintrag.typ === 'wirkungsmarke' && eintrag.payload.sequenz === laufStatus.terminalSequenz)
  return terminal === undefined ? null : { ergebnis: terminal.payload.ergebnis, daten: terminal.payload.daten }
}

/**
 * F13 WS-1 (AK2): bei ABGESCHLOSSEN/VERWEIGERT das daten-Feld der terminalen Wirkungsmarke (bypass_verdacht_anzahl, is_error,
 * non_execution_kind — src/result-evaluator/index.ts) direkt aus der Checkpoint-Kette lesen. NICHT aus baueLaufakteProjektion (die Felder
 * liegen dort nicht). Ein Bestandslauf ohne daten-Feld ⇒ 'unbekannt' je fehlendem Feld, nie 0/false raten.
 * @param laufId - Lauf-Kennung
 * @param laufStatus - Ergebnis von stelleLaufstatusFest, unverändert übernommen
 * @param basisVerzeichnis - Kontrollzustand-Wurzel
 * @returns null außer bei ABGESCHLOSSEN/VERWEIGERT, sonst { bypassVerdachtAnzahl, isError, nonExecutionKind } (je 'unbekannt' bei fehlendem Feld)
 */
export function baueVerweigertDatenProjektion(laufId, laufStatus, basisVerzeichnis) {
  if (laufStatus.status !== 'ABGESCHLOSSEN' || laufStatus.ergebnis !== 'VERWEIGERT') return null

  const daten = terminalMarke(laufId, laufStatus, basisVerzeichnis)?.daten
  const hatDaten = typeof daten === 'object' && daten !== null

  return {
    bypassVerdachtAnzahl: hatDaten && typeof daten.bypass_verdacht_anzahl === 'number' ? daten.bypass_verdacht_anzahl : 'unbekannt',
    isError: hatDaten && 'is_error' in daten ? daten.is_error : 'unbekannt',
    nonExecutionKind: hatDaten && 'non_execution_kind' in daten ? daten.non_execution_kind : 'unbekannt',
  }
}

/**
 * Zählung aus daten.rueckfrage_zaehlung: die vier Antwortfelder Pflicht, die drei unbeantworteten je null, wenn sie fehlen.
 * @param roh - daten.rueckfrage_zaehlung
 * @returns Zählung oder null (fremde Form)
 */
function zaehlungAus(roh) {
  if (typeof roh !== 'object' || roh === null || !ANTWORT_FELDER.every((f) => istAnzahl(roh[f]))) return null
  return Object.fromEntries([...ANTWORT_FELDER.map((f) => [f, roh[f]]), ...UNBEANTWORTET_FELDER.map((f) => [f, istAnzahl(roh[f]) ? roh[f] : null])])
}

/**
 * F45 B2b-3b-2b-2a-3 (F-1128 (3), F-1132 (1)): Felder des Rückfrage-Kanals aus daten der Terminalmarke (bei ABGESCHLOSSEN, jedes Ergebnis).
 * Ohne Kanal trägt die Marke keines der Felder ⇒ null (die Oberfläche zeigt dann nichts).
 * @param laufId - Lauf-Kennung
 * @param laufStatus - Ergebnis von stelleLaufstatusFest
 * @param basisVerzeichnis - Kontrollzustand-Wurzel
 * @returns null oder { ergebnis, zaehlung: Zählung | null, abgleich: { art, grund } | null, abweichung: string | null, abgelehntDurchStefan: number | null }
 */
export function baueRueckfrageKanalProjektion(laufId, laufStatus, basisVerzeichnis) {
  if (laufStatus.status !== 'ABGESCHLOSSEN') return null
  const marke = terminalMarke(laufId, laufStatus, basisVerzeichnis)
  const daten = marke?.daten
  if (typeof daten !== 'object' || daten === null) return null
  if (!['rueckfrage_zaehlung', 'rueckfrage_abgleich', 'rueckfrage_abweichung'].some((feld) => feld in daten)) return null
  const abgleich = daten.rueckfrage_abgleich
  return {
    ergebnis: typeof marke.ergebnis === 'string' ? marke.ergebnis : null,
    zaehlung: zaehlungAus(daten.rueckfrage_zaehlung),
    // qa 6: ein vorhandenes, aber verformtes Feld wird nicht verschluckt — art 'unbekannt' (die Oberfläche zeigt „unbekannter Grund“).
    abgleich: !('rueckfrage_abgleich' in daten) ? null : typeof abgleich?.art === 'string' && typeof abgleich.grund === 'string' ? { art: abgleich.art, grund: abgleich.grund } : { art: 'unbekannt', grund: '' },
    abweichung: typeof daten.rueckfrage_abweichung === 'string' ? daten.rueckfrage_abweichung : null,
    abgelehntDurchStefan: istAnzahl(daten.abgelehnt_durch_stefan) ? daten.abgelehnt_durch_stefan : null,
  }
}
