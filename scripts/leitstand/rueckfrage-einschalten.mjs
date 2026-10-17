/**
 * Datei: scripts/leitstand/rueckfrage-einschalten.mjs
 *
 * Zweck: Opt-in des Rückfrage-Kanals (F45 B2b-3b-2b-2a-1, features/F45/plan-b2b3b2b2a-v2.md). Reine Werte, kein I/O: aus der
 * Umgebung (`LEITSTAND_RUECKFRAGE=1`) und dem Port die API-Basis der Workforce-Instanz, daraus je Instanz die Handler-Option
 * `rueckfrage` und die Startzeile der Konsole.
 *
 * Grenzen:
 * - Nur der Wert `'1'` schaltet ein; jeder andere Wert (auch `'true'`) und eine fehlende Variable ⇒ aus.
 * - Die url muss vor dem Binden feststehen (die Handler entstehen vor `listen`) — Port 0 bzw. kein ganzzahliger Port ⇒ aus mit Grund.
 * - `rueckfrageOptionFuer` liefert `{}` oder `{ rueckfrage }` zum Spreaden; die Aufrufstellen im Server stehen nur in dieser Form
 *   (Gate f45-b2b3b2b2a-einschalten (o3) und die „Kanal aus“-Prüfung der Bestands-Gates über scripts/_rueckfrage-aus-pruefung.mjs).
 * - url = API-Basis der Instanz: Workforce `http://127.0.0.1:<port>/api`, Projekt `…/api/projekte/<id>` (das MCP-Skript hängt
 *   `/rueckfrage/anfrage…` an; der Multi-Projekt-Dispatcher schreibt `/api/projekte/<id>/…` auf `/api/…` der Instanz um).
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs (CLI-Bindeblock, baueProjektHandlerMap), scripts/check-f45-b2b3b2b2a-einschalten.mjs,
 * scripts/leitstand/rueckfrage-einschalten.test.mjs.
 */

import { ID_MUSTER } from '../../src/projekte/index.ts'

/** Name der Umgebungsvariable des Opt-in. */
export const RUECKFRAGE_SCHALTER = 'LEITSTAND_RUECKFRAGE'

/**
 * API-Basis der Workforce-Instanz, wenn der Kanal eingeschaltet ist.
 * @param {Record<string, string | undefined>} env - Umgebung (process.env)
 * @param {number} port - Port, an den der Leitstand bindet (vor dem Binden bekannt)
 * @returns {{ an: true, basis: string } | { an: false, grund: string }}
 */
export function rueckfrageBasisAusUmgebung(env, port) {
  const wert = env?.[RUECKFRAGE_SCHALTER]
  if (wert !== '1') return { an: false, grund: wert === undefined ? `${RUECKFRAGE_SCHALTER} nicht gesetzt` : `${RUECKFRAGE_SCHALTER}=${JSON.stringify(wert)} (nur 1 schaltet ein)` }
  if (!Number.isInteger(port) || port <= 0 || port > 65535) return { an: false, grund: `Port ${port} — die Adresse muss vor dem Binden feststehen` }
  return { an: true, basis: `http://127.0.0.1:${port}/api` }
}

/**
 * Handler-Option `rueckfrage` einer Instanz zum Spreaden.
 * @param {unknown} basis - API-Basis der Workforce-Instanz (nicht leerer String) oder etwas anderes (aus)
 * @param {string} [projektId] - Projekt-id (nur bei ID_MUSTER), fehlt für die Workforce-Instanz
 * @returns {{} | { rueckfrage: { an: true, url: string } }}
 */
export function rueckfrageOptionFuer(basis, projektId) {
  if (typeof basis !== 'string' || basis.length === 0) return {}
  if (projektId === undefined) return { rueckfrage: { an: true, url: basis } }
  if (typeof projektId !== 'string' || !ID_MUSTER.test(projektId)) return {}
  return { rueckfrage: { an: true, url: `${basis}/projekte/${projektId}` } }
}

/**
 * Konsolenzeile beim Start (Diagnose, kein UI-Text).
 * @param {{ an: true, basis: string } | { an: false, grund: string }} stand - Ergebnis von rueckfrageBasisAusUmgebung
 * @returns {string}
 */
export function rueckfrageStartzeile(stand) {
  if (stand?.an === true) return `Rückfrage-Kanal: an (${RUECKFRAGE_SCHALTER}=1, ${stand.basis}) — Rückfragen unter „Deine Entscheidungen“; Auswertung im Lauf folgt mit B2b-3b-2b-2a-3, echter Lauf mit 2b-2b — noch nicht für echte Läufe nutzen`
  return `Rückfrage-Kanal: aus (${stand?.grund ?? 'unbekannt'})`
}
