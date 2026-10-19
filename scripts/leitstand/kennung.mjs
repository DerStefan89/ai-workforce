/**
 * Datei: scripts/leitstand/kennung.mjs
 *
 * Zweck: Zeichenregel für Kennungen aus einer Anfrage (laufId, workflowId, auftragId) — eine Quelle für den Leitstand-Server
 * und die Routen-Module (F45 B2b-4a-1, Advisor-Delta 11: aus scripts/leitstand-server.mjs hierher gezogen, Inhalt
 * unverändert). Rein, kein I/O.
 *
 * - LAUFID_UNZULAESSIGE_ZEICHEN: dieselbe rein strukturelle Regel wie pruefeLaufId in src/checkpoint-store/index.ts.
 * - pruefeAblaufKennung: Formprüfung des Parameters ?workflow= von GET …/code und …/code/diff, vor jedem Dateizugriff. Neu
 *   gegenüber der Zeichenregel ist nur die Längengrenze ABLAUF_KENNUNG_MAX (gilt nur für diesen Parameter): sie hält auch den
 *   längsten Ordnernamen, der die id trägt („lineage-entscheidung-workflow-<id>-abnahme“, 238 Zeichen bei 200), unter der
 *   Grenze einer Pfadkomponente (255 unter NTFS). Mehrfach angegeben ⇒ 400 (Server loeseCodeOrt).
 *
 * Wird aufgerufen von:
 * - scripts/leitstand-server.mjs (überall, wo eine Kennung aus Pfad oder Körper geprüft wird; loeseCodeOrt)
 * - scripts/leitstand/kennung.test.mjs (node:test), scripts/check-f45-b2b4a1-sichern.mjs
 *
 * Wichtig: Gründe geben den Rohwert nie wieder (er kann eine Kennung oder Steuerzeichen enthalten).
 */

/** Spiegelt src/checkpoint-store/index.ts' pruefeLaufId (nicht exportiert) — dieselbe rein strukturelle Zeichenregel, kein zweiter fachlicher Regelsatz (D5). Fängt einen unzulässigen Wert ab, BEVOR laufIdBelegt() ihn ungeprüft in einen existsSync-Pfad einsetzt. */
export const LAUFID_UNZULAESSIGE_ZEICHEN = /[/\\]|\.\.|[\u0000-\u001f]/

/** Höchstlänge des Parameters ?workflow= (Zeichen). */
export const ABLAUF_KENNUNG_MAX = 200

/**
 * Formprüfung des Parameters ?workflow= (URLSearchParams hat schon dekodiert).
 * @param roh - Wert von searchParams.get('workflow'): null (fehlt) oder String
 * @returns null, wenn der Parameter fehlt oder zulässig ist; sonst ein Grund (ohne den Rohwert)
 */
export function pruefeAblaufKennung(roh) {
  if (roh === null) return null
  if (typeof roh !== 'string' || roh === '') return 'Der Parameter workflow ist leer'
  if (roh.length > ABLAUF_KENNUNG_MAX) return `Der Parameter workflow ist länger als ${ABLAUF_KENNUNG_MAX} Zeichen`
  if (LAUFID_UNZULAESSIGE_ZEICHEN.test(roh)) return 'Der Parameter workflow enthält unzulässige Zeichen (/, \\, .. oder Steuerzeichen)'
  return null
}
