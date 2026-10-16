/**
 * Datei: public/leitstand/arbeitspaket-felder.js
 *
 * Zweck: F45 B2b-3d (F-978, F-1083 (1)) — reines Modul für das Feld „Vereinbarte Bereiche“ im Formular „Auftrag & Start“:
 * liest den Text (ein Ordner oder eine Datei je Zeile, relativ zum Projekt) in die Liste `bereiche` des Arbeitspakets.
 * Gegen diese Liste gleicht der Server nach der Ausführung die berührten Dateien ab (nur ein Hinweis, kein Halt).
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/projekt.js (legeAuftragAusFormularAn)
 * - public/leitstand/arbeitspaket-felder.test.mjs
 *
 * Wichtig: kein DOM, kein Netz. Absolute Pfade, `..` und `*` mitten im Eintrag (`src/*.ts` — der Abgleich kennt nur
 * Präfixe) werden abgewiesen, sie träfen nie eine Datei der Änderungsübersicht (Advisor A13, qa 3); `*`/`**` als ganzer
 * Eintrag oder als Endung (`src/**`) bleiben erlaubt; die Form der Einträge selbst (nicht leer, keine Doppelten) prüft der Server mit derselben Regel wie jeden
 * Auftrag (validiereArbeitspaketFelder).
 */

/** Absoluter Pfad: führender Schrägstrich/Backslash oder Laufwerksbuchstabe. */
const ABSOLUT = /^(?:[\\/]|[A-Za-z]:)/

/**
 * Liest das Feld „Vereinbarte Bereiche“.
 * @param text - Inhalt des Textfelds
 * @returns { ok: true, bereiche } — bereiche undefined bei leerem Feld (kein Abgleich), sonst getrimmte, eindeutige
 *   Einträge in Reihenfolge; oder { ok: false, eintrag } mit dem ersten abgewiesenen Eintrag
 */
export function leseBereiche(text) {
  const bereiche = []
  for (const zeile of String(text ?? '').split(/\r?\n/)) {
    const eintrag = zeile.trim()
    if (eintrag === '') continue
    const ohneEndung = eintrag.replace(/(^|[\\/])\*\*?$/, '')
    if (ABSOLUT.test(eintrag) || eintrag.split(/[\\/]/).includes('..') || ohneEndung.includes('*')) return { ok: false, eintrag }
    if (!bereiche.includes(eintrag)) bereiche.push(eintrag)
  }
  return { ok: true, bereiche: bereiche.length > 0 ? bereiche : undefined }
}
