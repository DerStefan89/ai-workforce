/**
 * Datei: public/leitstand/verbrauch-zeitraum.js
 *
 * Zweck: F32 WS-2 — reine Berechnung des `von`-Werts für die drei festen
 * Zeiträume der Verbrauchs-Karte (7 Tage / 30 Tage / gesamt). Kein freies
 * Datumsfeld — die drei Werte hier sind die einzige Quelle, die `von` an
 * GET /api/verbrauch übergibt, und liefern immer ein gültiges ISO-8601-Datum
 * mit `Z`-Suffix (Muster `erstellt_am`, jetzt().toISOString()). Der Server
 * prüft `?von=`/`?bis=` seit F-518 auf Format (YYYY-MM-DD oder voller
 * ISO-8601-Zeitstempel, scripts/leitstand/routen-verbrauch.mjs) — die hier
 * erzeugte volle Zeitstempelform bleibt gültig.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/dashboard.js (Zeitraum-Umschalter der Karte "Verbrauch")
 * - scripts/check-f32-verbrauch-ansicht.mjs (Gate, reine Funktionsprüfung)
 *
 * Wichtig: berechneVerbrauchsVon wirft nie und nimmt `jetzt` als Parameter
 * (keine versteckte `new Date()`-Abhängigkeit), damit die Berechnung
 * deterministisch testbar bleibt.
 */

export const VERBRAUCH_ZEITRAEUME = ['7t', '30t', 'gesamt']

/**
 * Berechnet den `von`-Wert (ISO-8601) für einen festen Zeitraum, oder undefined für 'gesamt'.
 * @param periode - '7t' | '30t' | 'gesamt'
 * @param jetzt - Bezugszeitpunkt (Date)
 * @returns ISO-8601-String, oder undefined bei 'gesamt' (kein Filter)
 */
export function berechneVerbrauchsVon(periode, jetzt) {
  if (periode === 'gesamt') return undefined
  const tage = periode === '7t' ? 7 : 30
  return new Date(jetzt.getTime() - tage * 24 * 60 * 60 * 1000).toISOString()
}
