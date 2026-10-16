/**
 * Datei: public/leitstand/arbeitspaket-felder.js
 *
 * Zweck: F45 B2b-3d (F-978, F-1083 (1)) — reines Modul für die Arbeitspaket-Felder im Formular „Auftrag & Start“:
 * „Vereinbarte Bereiche“ (ein Ordner oder eine Datei je Zeile, relativ zum Projekt ⇒ Liste `bereiche`; gegen sie gleicht der
 * Server nach der Ausführung die berührten Dateien ab, nur ein Hinweis) und seit F45 B2b-3e-2 (F-1122 (1)) „Token-Budget“
 * (⇒ `budget_tokens`, leer = Standard der Kontrolltiefe).
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/projekt.js (legeAuftragAusFormularAn, initAuftragFormular)
 * - public/leitstand/arbeitspaket-felder.test.mjs
 * - scripts/check-f45-b2b3e2-formular.mjs (Zwillings-Gleichheit)
 *
 * Wichtig: kein DOM, kein Netz, keine Importe. `pruefeBereich`, `pruefeBudgetTokens` und `BUDGET_STANDARD` sind ZWILLINGE
 * (Entscheidung A2 = b, F45 B2b-3e-2) von `pruefeBereich`/`pruefeBudgetTokens` in src/auftrag/index.ts und `BUDGET_DEFAULTS`
 * in src/budget/index.ts — der Browser lädt kein .ts. Das Gate f45-b2b3e2 lässt beide Seiten über dieselbe Fall-Tabelle
 * urteilen; eine Änderung gehört wörtlich auf beide Seiten. Das Formular normalisiert (leere Zeilen und Doppelte still weg),
 * der Server weist Doppelte ab. Groß-/Kleinschreibung bleibt wie eingegeben (`Src/` ≠ `src/`, git ist case-sensitiv).
 */

/**
 * Die eine Regel je Eintrag von `bereiche` (Zwilling von src/auftrag pruefeBereich): getrimmt vor allen Prüfungen, Trenner
 * `/` und `\` gleich; abgewiesen wird, was im Umfangs-Abgleich still nichts träfe — absolute Pfade, `..`, ein Segment `.`
 * außer am Anfang (`./`), `*` mitten im Eintrag (`src/*.ts`). `*`/`**` als ganzer Eintrag oder als Endung bleiben erlaubt.
 * @param eintrag - ein Eintrag
 * @returns null, wenn gültig, sonst 'leer' | 'steuerzeichen' | 'absolut' | 'eltern' | 'punkt' | 'muster'
 */
export function pruefeBereich(eintrag) {
  const e = eintrag.trim()
  if (e === '') return 'leer'
  if (/[\u0000-\u001f\u007f]/.test(e)) return 'steuerzeichen'
  if (/^(?:[\\/]|[A-Za-z]:)/.test(e)) return 'absolut'
  const segmente = e.split(/[\\/]/).filter((s) => s !== '')
  if (segmente.includes('..')) return 'eltern'
  const ersterInhalt = segmente.findIndex((s) => s !== '.')
  if (ersterInhalt >= 0 && segmente.slice(ersterInhalt).includes('.')) return 'punkt'
  let rest = e
  for (let vorher = ''; vorher !== rest; ) {
    vorher = rest
    rest = rest.replace(/[\\/](?:\*\*?)?$/, '')
  }
  return rest !== '*' && rest !== '**' && rest.includes('*') ? 'muster' : null
}

/**
 * Die eine Regel für `budget_tokens` (Zwilling von src/auftrag pruefeBudgetTokens): ganze Zahl von 1 bis MAX_SAFE_INTEGER.
 * @param wert - der zu prüfende Wert
 * @returns true, wenn gültig
 */
export function pruefeBudgetTokens(wert) {
  return typeof wert === 'number' && Number.isSafeInteger(wert) && wert >= 1
}

/** Standard-Budget je Kontrolltiefe in Tokens — Zwilling von BUDGET_DEFAULTS (src/budget/index.ts), nur für den Hinweistext. */
export const BUDGET_STANDARD = Object.freeze({ 'fast-lane': 5_300_000, standard: 14_700_000, hoch: 14_700_000 })

/**
 * Liest das Feld „Vereinbarte Bereiche“.
 * @param text - Inhalt des Textfelds
 * @returns { ok: true, bereiche } — bereiche undefined bei leerem Feld (kein Abgleich), sonst getrimmte, eindeutige
 *   Einträge in Reihenfolge; oder { ok: false, eintrag, grund } mit dem ersten abgewiesenen Eintrag und dem Grund
 */
export function leseBereiche(text) {
  const bereiche = []
  for (const zeile of String(text ?? '').split(/\r?\n/)) {
    const eintrag = zeile.trim()
    if (eintrag === '') continue
    const grund = pruefeBereich(eintrag)
    if (grund !== null) return { ok: false, eintrag, grund }
    if (!bereiche.includes(eintrag)) bereiche.push(eintrag)
  }
  return { ok: true, bereiche: bereiche.length > 0 ? bereiche : undefined }
}

/** Ziffern, ohne Trenner oder in Dreiergruppen mit genau einer Art Tausendertrenner (Leerzeichen, NBSP, U+202F, Punkt, Komma). */
const BUDGET_TEXT = /^(?:\d+|\d{1,3}(?:( |\u00a0|\u202f|\.|,)\d{3})(?:\1\d{3})*)$/

/**
 * Liest das Feld „Token-Budget“. `1.500` heißt 1500 (Tausendertrenner, Tokens sind ganze Zahlen).
 * @param text - Inhalt des Eingabefelds
 * @returns { ok: true, budget } — budget undefined bei leerem Feld (Standard der Kontrolltiefe); oder { ok: false, eintrag }
 */
export function leseBudget(text) {
  const eintrag = String(text ?? '').trim()
  if (eintrag === '') return { ok: true, budget: undefined }
  const budget = BUDGET_TEXT.test(eintrag) ? Number(eintrag.replace(/\D/g, '')) : Number.NaN
  return pruefeBudgetTokens(budget) ? { ok: true, budget } : { ok: false, eintrag }
}
