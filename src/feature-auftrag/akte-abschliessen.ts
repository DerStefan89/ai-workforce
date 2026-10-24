/**
 * Datei: src/feature-auftrag/akte-abschliessen.ts
 *
 * Zweck: F45 B5b-1b-2 „Bereinigungsliste“ (F-1010, R1; features/F45/plan-b5b1b2-v2.md §2.4, Advisor features/F45/advisor-b5b1b2.md)
 * — setzeAkteAbgeschlossen schreibt die Entscheidung „Feature → ABGESCHLOSSEN“ in die Akte (Entscheidung B6): Status-Wort,
 * `Abgenommen: <datum>` und eine Zeile unter '## Änderungen'. Nur auf Stefans Bestätigung genau eines Eintrags (Entscheidung
 * „Bereinigung nur bestätigt“); Lesen, Hash, Sperre und Schreiben liegen bei scripts/leitstand/routen-planung.mjs. Kein I/O,
 * wirft nicht.
 *
 * Regeln:
 * - Status fehlt, ist unbekannt, ABGESCHLOSSEN oder ABGEBROCHEN ⇒ 422; eine vorhandene `Abgenommen:`-Zeile ⇒ 422 „von Hand“ (fail-closed,
 *   Advisor B5b-1b O4).
 * - Nur das Status-Wort der ersten `Status:`-Zeile wird ersetzt; `Abgenommen: <datum>` steht direkt dahinter (im Markdown mit der
 *   Status-Zeile ein Absatz — kosmetisch, Advisor B5b-1b C12). Das Datum ist der Tag der Bestätigung, nicht der fachlichen Abnahme
 *   (DEKLARIERT, Advisor C4); der Grund steht in der Änderungszeile `- <datum> · Status ABGESCHLOSSEN (Bereinigung <M>) · <grund>`.
 * - Zeilenende: das erste der Datei (Ausnahme zu ARCHITECTURE.md §7 für bestehende Akten, wie B5a-1). Rest bytegleich.
 * - Akte-Gate wie B5a-1 (pruefeAkteGate: jeder Befund ⇒ 422); Rundlauf: Status ABGESCHLOSSEN, lesePlanung liefert das Datum.
 *
 * Wird aufgerufen von: scripts/leitstand/routen-planung.mjs, src/feature-auftrag/akte-abschliessen.test.ts (das Gate
 * scripts/check-f45-b5b1b2-bereinigung.mjs erreicht das Modul über die Route).
 */

import { leseFeatureStatus, pruefeFeatureAkteInhalt } from '../workboard/feature-akte-pruefung.ts'
import { lesePlanung } from '../workboard/feature-planung.ts'
import { gueltigeStatusWerte } from '../workboard/feature-status.ts'
import { erkenneZeilenende, haengeAenderungAn, pruefeAkteGate, STATUS_NICHT_BEARBEITBAR, wendeAn } from './akte-schreiben.ts'

const STATUS_ZEILE = /^Status:([ \t]*)(\S+)[^\r\n]*/m

/**
 * Setzt die Akte auf ABGESCHLOSSEN (Regeln im Dateikopf).
 * @param inhalt - aktueller Dateitext (bereits als gültiges UTF-8 gelesen)
 * @param angaben - { datum (JJJJ-MM-TT), grund (geprüft), meilenstein (Meilenstein des Eintrags) }
 * @returns { ok: true, inhalt } | { ok: false, grund, verstoesse? } (HTTP 422, nichts schreiben)
 */
export function setzeAkteAbgeschlossen(inhalt: string, angaben: { datum: string; grund: string; meilenstein: string }): { ok: true; inhalt: string } | { ok: false; grund: string; verstoesse?: string[] } {
  const status = leseFeatureStatus(inhalt)
  const zeile = STATUS_ZEILE.exec(inhalt)
  if (status === null || zeile === null) return { ok: false, grund: 'Die Akte hat keine Status-Zeile — von Hand abschließen' }
  if (!gueltigeStatusWerte.includes(status)) return { ok: false, grund: `Feature-Status '${status}' ist unbekannt — von Hand klären` }
  if (STATUS_NICHT_BEARBEITBAR.has(status)) return { ok: false, grund: `Feature-Status '${status}' — abgeschlossene oder abgebrochene Akten setzt die Bereinigung nicht (von Hand)` }
  if (/^Abgenommen:/m.test(inhalt)) return { ok: false, grund: 'Die Akte trägt schon eine Zeile „Abgenommen:“ — von Hand abschließen' }
  const eol = erkenneZeilenende(inhalt)
  const wortStart = zeile.index + 'Status:'.length + zeile[1].length
  const zeilenEnde = zeile.index + zeile[0].length
  const neu = wendeAn(inhalt, [
    { start: wortStart, ende: wortStart + zeile[2].length, text: 'ABGESCHLOSSEN' },
    { start: zeilenEnde, ende: zeilenEnde, text: `${eol}Abgenommen: ${angaben.datum}` },
    haengeAenderungAn(inhalt, `- ${angaben.datum} · Status ABGESCHLOSSEN (Bereinigung ${angaben.meilenstein}) · ${angaben.grund}`, eol),
  ])
  const gate = pruefeAkteGate(pruefeFeatureAkteInhalt(inhalt), neu)
  if (gate !== null) return { ok: false, ...gate }
  if (leseFeatureStatus(neu) !== 'ABGESCHLOSSEN' || lesePlanung(neu).abgenommen !== angaben.datum) return { ok: false, grund: 'Die bearbeitete Akte liest sich nicht wie angefragt (Status oder Abgenommen abweichend) — nichts geschrieben' }
  return { ok: true, inhalt: neu }
}
