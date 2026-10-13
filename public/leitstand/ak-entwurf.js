/**
 * Datei: public/leitstand/ak-entwurf.js
 *
 * Zweck: F45 B2a-2 (F-938) — reines Modul für den AK-Entwurf von Click-to-Work aus einem Finding: der Entwurf entsteht
 * aus der „Maßnahme“ des Findings, Stefan sieht und ändert ihn vor dem Anlegen; angelegt wird nur mit mindestens einem
 * nicht leeren AK (Pflicht je Herkunft 'finding', validiereAuftragPflichtfelder in src/auftrag/index.ts).
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/workboard.js (Phase 'entwurf' von „Auftrag vorbereiten“)
 * - public/leitstand/ak-entwurf.test.mjs, scripts/check-f45-b2a2-arbeitspaket.mjs
 *
 * Wichtig: kein DOM, kein Netz. Die IDs vergibt baueAkzeptanzkriterien nach der Reihenfolge (AK1, AK2, …) — Stefan
 * bearbeitet nur Texte, keine IDs.
 */

/**
 * AK-Entwurf aus der Maßnahme eines Findings: genau ein Eintrag mit der Maßnahme (getrimmt); ohne Maßnahme ein leerer
 * Eintrag, den Stefan füllt.
 * @param workitem - Finding-Workitem ({ massnahme? })
 * @returns Texte des Entwurfs, mindestens einer
 */
export function baueAkEntwurf(workitem) {
  const massnahme = typeof workitem?.massnahme === 'string' ? workitem.massnahme.trim() : ''
  return [massnahme]
}

/**
 * Akzeptanzkriterien für POST /api/auftraege aus den bearbeiteten Texten: leere Einträge fallen weg, IDs AK1…n nach
 * der Reihenfolge.
 * @param texte - bearbeitete Texte
 * @returns [{ id, text }] (leer, wenn kein Text übrig bleibt)
 */
export function baueAkzeptanzkriterien(texte) {
  return texte
    .map((text) => String(text ?? '').trim())
    .filter((text) => text.length > 0)
    .map((text, index) => ({ id: `AK${index + 1}`, text }))
}
