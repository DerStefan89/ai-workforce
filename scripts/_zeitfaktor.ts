/**
 * Datei: scripts/_zeitfaktor.ts
 *
 * Zweck: Skaliert feste Wartegrenzen in Tests über die Umgebungsvariable AIW_TEST_ZEITFAKTOR (F45 T, F-1186).
 * Standard 1 — ohne Variable bleiben alle Grenzen wie geschrieben. Ein langsamer Rechner oder ein Lauf unter
 * Last kann die Grenzen z. B. mit AIW_TEST_ZEITFAKTOR=3 verdreifachen, ohne den Test zu ändern.
 *
 * Wird aufgerufen von:
 * - scripts/leitstand-arbeitsordner.test.mjs
 * - scripts/leitstand/routen-code.test.mjs
 * - scripts/leitstand/routen-harness-abgleich.test.mjs
 *
 * Wichtig:
 * - Nur Werte von 1 bis 100 sind erlaubt; alles andere (Text, 0, negativ, < 1, > 100) wirft — ein Tippfehler soll
 *   den Lauf nicht still mit verkürzten Grenzen fahren. Die Obergrenze hält skalierte Timer unter 2^31-1 ms (sonst
 *   macht Node aus einer übergroßen Zeitgrenze 1 ms, also das Gegenteil).
 * - scripts/teste.mjs setzt die Variable nicht (Begründung dort im Kopf).
 */

/** Größter zulässiger Faktor (größte skalierte Grenze heute 600 000 ms × 100 < 2^31-1). */
const MAX_FAKTOR = 100

/**
 * Liest den Zeitfaktor.
 * @param wert - Rohwert (Standard: process.env.AIW_TEST_ZEITFAKTOR)
 * @returns Faktor von 1 bis MAX_FAKTOR; 1, wenn die Variable fehlt oder leer ist
 */
export function zeitfaktor(wert: string | undefined = process.env.AIW_TEST_ZEITFAKTOR): number {
  if (wert === undefined || wert.trim() === '') return 1
  const zahl = Number(wert)
  if (!Number.isFinite(zahl) || zahl < 1 || zahl > MAX_FAKTOR) {
    throw new Error(`AIW_TEST_ZEITFAKTOR muss eine Zahl von 1 bis ${MAX_FAKTOR} sein, ist ${JSON.stringify(wert)}`)
  }
  return zahl
}

/**
 * Skaliert eine Wartegrenze mit dem Zeitfaktor.
 * @param ms - Grenze in Millisekunden beim Faktor 1
 * @returns gerundete Grenze in Millisekunden
 */
export function skaliert(ms: number): number {
  return Math.round(ms * zeitfaktor())
}
