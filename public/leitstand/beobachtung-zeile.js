/**
 * Datei: public/leitstand/beobachtung-zeile.js
 *
 * Zweck: F36 WS-4 (features/F36/feature.md AK8, F-730) — reiner Text der
 * kompakten Beobachtungszeile der Laufdetailansicht: was der Lauf geladen
 * (init-Zeile) und tatsächlich aufgerufen hat. Quelle ist das optionale
 * Laufakten-Feld `beobachtung` (GET /api/laeufe/<laufId>, detail.laufakte).
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/runs.js (renderLaufakte, Zeile „Beobachtung“)
 * - public/leitstand/beobachtung-zeile.test.mjs
 *
 * Seit F36 WS-5a (E-F36-7): die Adresse jedes browser_navigate (Feld navigate_adressen, optional —
 * ältere Laufakten tragen es nicht) als Zusatz „Navigiert: […]“.
 *
 * Wichtig: liefert reinen Text — das Escaping übernimmt der Aufrufer
 * (escapeHtml), Muster verbrauch-zeitraum.js.
 */

/**
 * Formt die Beobachtung zu einer Zeile, oder „nicht beobachtet“, wenn das Feld fehlt (alte Laufakte, Codex).
 * @param beobachtung - laufakte.beobachtung (BeobachtungV0), oder null/undefined
 * @returns Anzeigetext
 */
export function formatiereBeobachtung(beobachtung) {
  if (beobachtung === null || beobachtung === undefined) return 'nicht beobachtet'
  // Der Server reicht das Feld ungeprüft durch — eine von Hand veränderte Laufakte darf die Detailansicht nicht sprengen.
  const werte = (feld) => (Array.isArray(beobachtung[feld]) ? beobachtung[feld] : [])
  const liste = (feld) => `[${werte(feld).join(', ')}]`
  return (
    `Geladen: ${werte('init_skills').length} Skills · ${werte('init_agents').length} Agents · ${werte('init_mcp_server').length} MCP · ` +
    `Aufgerufen: Skills ${liste('skill_aufrufe')} · Subagenten ${liste('subagent_aufrufe')} · MCP ${liste('mcp_aufrufe')}` +
    (werte('navigate_adressen').length > 0 ? ` · Navigiert: ${liste('navigate_adressen')}` : '')
  )
}
