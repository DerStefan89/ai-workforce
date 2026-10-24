/**
 * Datei: src/workboard/status-md.ts
 *
 * Zweck: Die Standardform „`features/<ID>/feature.md`, Status `<WERT>`“ in docs/STATUS.md — eine Regel für das Gate
 * scripts/check-status-akten.mjs (Abgleich) und die Bereinigungsliste F45 B5b-1b-2 (features/F45/plan-b5b1b2-v2.md §2.1, Advisor
 * features/F45/advisor-b5b1b2.md B5): setzeStatusMdStatus ersetzt bei „Feature → ABGESCHLOSSEN“ nur das Status-Wort genau einer
 * Angabe (Entscheidung B6). Ausnahme zu „Kern liest den Projektordner nur“: ARCHITECTURE.md §2, docs/architektur/arbeitsordner.md.
 * Rein, ohne Importe (das Gate zieht nichts mit), wirft nicht.
 *
 * Regeln:
 * - Datei fehlt oder trägt keine einzige Standardform (Fremdprojekt ohne diese Konvention) ⇒ überspringen mit Hinweis
 *   (DEKLARIERT, Advisor B5b-1b B5).
 * - Konvention vorhanden, aber 0 oder mehr als 1 Angabe für die ID ⇒ „STATUS.md von Hand“ (B6, HTTP 422).
 * - CRLF ⇒ „von Hand“ (Entscheidung A1 = b: keine §7-Ausnahme für STATUS.md, der Kern schreibt LF).
 * - Nur das Wort zwischen den Backticks wird ersetzt, jedes andere Byte bleibt; Rundlauf über alle Angaben.
 *
 * Wird aufgerufen von: scripts/check-status-akten.mjs, scripts/leitstand/routen-planung.mjs, src/workboard/status-md.test.ts.
 */

/**
 * Standardform; \s* erlaubt die Umbrüche, mit denen STATUS.md Fließtext umbricht. Trägt /g — nur über matchAll verwenden, nie mit
 * .test/.exec und geteiltem lastIndex (Advisor B5b-1b C2).
 */
export const STATUS_MD_STANDARDFORM = /features\/([A-Za-z0-9-]+)\/\s*feature\.md`,?\s*Status\s*`([A-Z_]+)`/g

/** Eine Standardform-Angabe: ID, genannter Status, Lage des Status-Worts im Text, 1-basierte Zeile des Trefferbeginns (bei einem
 * Umbruch die Zeile mit `features/<ID>/`, nicht die des Status-Worts — cr 7). */
export interface StatusMdAngabe {
  id: string
  genannt: string
  wortStart: number
  zeile: number
}

export type StatusMdErgebnis = { ok: true; geaendert: true; text: string; zeile: number } | { ok: true; geaendert: false; hinweis: string } | { ok: false; grund: string }

/**
 * Sammelt alle Standardform-Angaben.
 * @param text - Inhalt von STATUS.md
 * @returns Angaben in Textreihenfolge
 */
export function sammleStatusMdAngaben(text: string): StatusMdAngabe[] {
  return [...text.matchAll(STATUS_MD_STANDARDFORM)].map((t) => ({
    id: t[1],
    genannt: t[2],
    wortStart: t.index + t[0].length - t[2].length - 1,
    zeile: text.slice(0, t.index).split('\n').length,
  }))
}

/**
 * Setzt das Status-Wort der einen Angabe für featureId (Regeln im Dateikopf).
 * @param text - Inhalt von STATUS.md oder null (Datei fehlt)
 * @param featureId - Feature-ID
 * @param status - neues Status-Wort
 * @returns geändert mit Text und Zeile (Trefferbeginn) | übersprungen mit Hinweis | { ok: false, grund } (HTTP 422)
 */
export function setzeStatusMdStatus(text: string | null, featureId: string, status: string): StatusMdErgebnis {
  if (text === null) return { ok: true, geaendert: false, hinweis: 'docs/STATUS.md fehlt — übersprungen' }
  const angaben = sammleStatusMdAngaben(text)
  if (angaben.length === 0) return { ok: true, geaendert: false, hinweis: 'docs/STATUS.md trägt keine Standardform „`features/<id>/feature.md`, Status `<WERT>`“ — übersprungen' }
  if (text.includes('\r')) return { ok: false, grund: 'docs/STATUS.md enthält CRLF-Zeilenenden — STATUS.md von Hand (der Leitstand schreibt nur LF)' }
  const eigene = angaben.filter((a) => a.id === featureId)
  if (eigene.length !== 1) return { ok: false, grund: `docs/STATUS.md nennt ${featureId} ${eigene.length}× in der Standardform „\`features/${featureId}/feature.md\`, Status \`…\`“ — maschinell nicht eindeutig, STATUS.md von Hand` }
  const [angabe] = eigene
  if (angabe.genannt === status) return { ok: true, geaendert: false, hinweis: `docs/STATUS.md nennt ${featureId} schon als ${status} — unverändert` }
  const neu = text.slice(0, angabe.wortStart) + status + text.slice(angabe.wortStart + angabe.genannt.length)
  const erwartet = angaben.map((a) => (a === angabe ? { id: a.id, genannt: status } : { id: a.id, genannt: a.genannt }))
  const gelesen = sammleStatusMdAngaben(neu).map((a) => ({ id: a.id, genannt: a.genannt }))
  if (JSON.stringify(gelesen) !== JSON.stringify(erwartet)) return { ok: false, grund: 'docs/STATUS.md liest sich nach der Änderung nicht wie erwartet — nichts geschrieben, STATUS.md von Hand' }
  return { ok: true, geaendert: true, text: neu, zeile: angabe.zeile }
}
