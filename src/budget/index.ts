/**
 * Datei: src/budget/index.ts
 *
 * Zweck: Budget je Arbeitspaket (F45 B2b-3c, F-981, features/F45/plan-b2b3c.md §2). Einheit sind Tokens (input + output +
 * cache_read + cache_write), summiert über alle Läufe eines Ablaufs einschließlich Korrekturrunde; kein Geldbetrag
 * (`total_cost_usd` wird nie gelesen, Entscheidung 30). Das Budget kommt aus dem Arbeitspaket (`budget_tokens` des
 * Auftrags v0), sonst aus dem Default der Kontrolltiefe. Geprüft wird NACH jedem Schritt, nie mitten im Lauf: ist die
 * Summe größer als das Budget, macht wendeBudgetAn aus dem Ausgang des Automaten, der weiterlaufen würde, einen Halt
 * KLAERUNG_ERFORDERLICH mit lesbarem Grund. Rein und deterministisch, kein I/O — Summe und Kontrolltiefe liest der
 * Server (scripts/leitstand/budget-stand.mjs).
 *
 * Wird aufgerufen von: scripts/leitstand/budget-stand.mjs, scripts/leitstand-server.mjs,
 * scripts/check-f45-b2b3c-budget.mjs, src/budget/budget.test.ts.
 */

import type { Kontrolltiefe } from '../router/types.ts'
import type { NaechsterSchritt, WorkflowV0Schritt } from '../workflow/types.ts'

/**
 * Default je Kontrolltiefe in Tokens, abgeleitet aus realen Laufakten (features/F45/nachweise/b2b3c/budget-ableitung.mjs,
 * Ergebnis in features/F45/plan-b2b3c.md §1): Median der Ablauf-Summen × 3, aufgerundet auf 100 000. standard 4 Abläufe
 * → 14,7 Mio.; hoch 5 Abläufe → 14,3 Mio., angehoben auf standard (hoch enthält alle Schritte von standard plus Architekt
 * und Advisor — ein kleinerer Default wäre ein Stichprobenartefakt); fast-lane ohne gemessenen Ablauf → Median der
 * 19 Ausführungsläufe × 3 = 5,3 Mio. (fester Wert). Neu kalibrieren: F-1121.
 */
export const BUDGET_DEFAULTS: Readonly<Record<Kontrolltiefe, number>> = Object.freeze({ 'fast-lane': 5_300_000, standard: 14_700_000, hoch: 14_700_000 })

/** Anfang jedes Budget-Halt-Grunds — daran erkennt die Anzeige den Halt auch in einem längeren Server-Grund. */
const HALT_ANFANG = 'Budget erreicht: '

/** Budget eines Ablaufs mit seiner Quelle. */
export interface Budget {
  tokens: number
  quelle: 'arbeitspaket' | 'default'
}

/** Was wendeBudgetAn braucht: Summe, Budget und ob überschritten. */
export interface BudgetPruefung {
  summe: number
  tokens: number
  ueberschritten: boolean
}

/** true für eine ganze Zahl ≥ 0 (dieselbe Grenze wie das Laufakte-Schema). */
function istZaehlbar(wert: unknown): wert is number {
  return typeof wert === 'number' && Number.isInteger(wert) && wert >= 0
}

/**
 * Tokens eines Laufs aus seinem `verbrauch` (Laufakte, F32 WS-1): Summe der vier Token-Felder.
 * @param verbrauch - das Feld `verbrauch` der Laufakte (oder undefined/null)
 * @returns Summe oder null, wenn das Feld fehlt oder ein Wert keine ganze Zahl ≥ 0 ist (nie geschätzt)
 */
export function tokensDesVerbrauchs(verbrauch: unknown): number | null {
  if (typeof verbrauch !== 'object' || verbrauch === null) return null
  const v = verbrauch as Record<string, unknown>
  const felder = [v.input_tokens, v.output_tokens, v.cache_read_tokens, v.cache_write_tokens]
  if (!felder.every(istZaehlbar)) return null
  return felder.reduce((summe, wert) => summe + wert, 0)
}

/**
 * Kontrolltiefe aus den Schrittrollen — zur Laufzeit die einzige Quelle (Advisor B9: die Vorlagen unterscheiden sich
 * genau darin, gilt auch nach einer Reparaturfassung; dieselbe Regel wie im Ableitungsskript): architekt/architecture-advisor ⇒ hoch, code-reviewer ⇒ standard, sonst fast-lane.
 * @param schritte - Schritte des Ablaufs
 * @returns Kontrolltiefe
 */
export function kontrolltiefeAusSchritten(schritte: readonly Pick<WorkflowV0Schritt, 'rolle'>[]): Kontrolltiefe {
  const rollen = new Set(schritte.map((s) => s.rolle))
  if (rollen.has('architekt') || rollen.has('architecture-advisor')) return 'hoch'
  if (rollen.has('code-reviewer')) return 'standard'
  return 'fast-lane'
}

/**
 * Budget eines Ablaufs: das Feld des Arbeitspakets, wenn es eine ganze Zahl ≥ 1 ist, sonst der Default der Kontrolltiefe.
 * @param arbeitspaketTokens - `budget_tokens` des Auftrags (oder undefined)
 * @param kontrolltiefe - Kontrolltiefe des Ablaufs
 * @returns Budget mit Quelle
 */
export function bestimmeBudget(arbeitspaketTokens: number | undefined, kontrolltiefe: Kontrolltiefe): Budget {
  if (istZaehlbar(arbeitspaketTokens) && arbeitspaketTokens >= 1) return { tokens: arbeitspaketTokens, quelle: 'arbeitspaket' }
  return { tokens: BUDGET_DEFAULTS[kontrolltiefe], quelle: 'default' }
}

/**
 * Überschritten heißt echt größer — genau erreicht hält nicht an.
 * @param summe - Tokens aller gemessenen Läufe des Ablaufs
 * @param budget - Budget in Tokens
 * @returns true, wenn der Ablauf anhalten muss
 */
export function istUeberschritten(summe: number, budget: number): boolean {
  return summe > budget
}

/**
 * Neues Budget für „Budget erhöhen“: bisherige Summe plus ein Schritt — der Aufrufer gibt das aktuelle Budget
 * („noch einmal das gesetzte Budget“, Advisor B12). Liegt bei einem Schritt ≥ 1 immer über der Summe.
 * @param summe - bisherige Summe
 * @param schritt - Erhöhungsschritt in Tokens
 * @returns neues Budget
 */
export function erhoehtesBudget(summe: number, schritt: number): number {
  return summe + schritt
}

/** Zahl mit Tausenderpunkten (de), unabhängig von der Umgebung des Servers. */
function zahl(wert: number): string {
  return String(wert).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/**
 * Lesbarer Halt-Grund (Server, gespeichert am Ablauf). Die Oberfläche baut ihren Text aus den Zahlen selbst.
 * @param summe - Tokens bisher
 * @param budget - Budget in Tokens
 * @returns Grund
 */
export function baueBudgetHaltGrund(summe: number, budget: number): string {
  return `${HALT_ANFANG}${zahl(summe)} von ${zahl(budget)} Tokens — der Ablauf setzt erst fort, wenn das Budget erhöht wird („Budget erhöhen“); sonst ablehnen.`
}

/**
 * true, wenn ein gespeicherter Grund den Budget-Halt nennt (auch eingebettet, etwa in einen Startfehler-Grund).
 * @param grund - Grund des Ablaufs
 * @returns true beim Budget-Halt
 */
export function istBudgetHaltGrund(grund: string | null | undefined): boolean {
  return typeof grund === 'string' && grund.includes(HALT_ANFANG)
}

/**
 * Prüfung nach einem Schritt: würde der Automat weiterlaufen (starte) oder eine Freigabe erfragen (haltFreigabe) und ist
 * das Budget überschritten, wird daraus ein Halt mit Budget-Grund; der Cursor bleibt auf dem Schritt, der laufen würde,
 * damit „Budget erhöhen“ genau dort fortsetzt. Jeder andere Ausgang (fertig, Halt, Grenze, Stopp) bleibt unverändert.
 * @param naechster - Ausgang von ermittleNaechstenSchritt
 * @param pruefung - Budget-Stand oder null (nicht bestimmbar ⇒ keine Änderung)
 * @returns derselbe oder der Budget-Halt
 */
export function wendeBudgetAn(naechster: NaechsterSchritt, pruefung: BudgetPruefung | null): NaechsterSchritt {
  if (pruefung === null || !pruefung.ueberschritten) return naechster
  if (naechster.art !== 'starte' && naechster.art !== 'haltFreigabe') return naechster
  return { art: 'haltKlaerung', grund: baueBudgetHaltGrund(pruefung.summe, pruefung.tokens), aktiverSchrittId: naechster.aktiverSchrittId }
}
