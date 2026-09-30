/**
 * Datei: public/leitstand/projekt-aufruf-anzeige.js
 *
 * Zweck: F43 „Projekt aufrufen/anzeigen“ (features/F43/feature.md) — reine Render-Funktionen für
 * den Block „Vorschau & Aufruf“ je Projektkarte: vorschau_url mit Status und „Öffnen“ (neuer Tab),
 * startbefehl mit „Aufrufen“, Ergebnis des letzten Aufrufs. Quelle ist GET/POST
 * /api/projekte/<id>/projekt-aufruf.
 *
 * Wichtig: Projektinhalt (stdout, stderr, ergebnis_datei) wird nie als HTML gerendert — jeder Text
 * geht durch escapeHtml und steht in <pre>. Die Funktionen sind DOM-frei, damit
 * scripts/check-f43-projekt-aufrufen.mjs das Escaping direkt prüfen kann.
 *
 * Wird aufgerufen von: public/leitstand/views/projekte-uebersicht.js,
 * scripts/check-f43-projekt-aufrufen.mjs.
 */

import { escapeHtml } from './render.js'

/** Kurztext je Ausgang (Ausgänge des Prüfschritts, GRUEN = Exit 0). @param e - AufrufErgebnis @returns Text */
function ausgangText(e) {
  if (e.ausgang === 'ZEITGRENZE') return `Zeitgrenze (${e.zeitgrenze_ms} ms) überschritten — Prozess beendet`
  if (e.ausgang === 'FEHLER') return 'Fehler — nicht gestartet oder abgebrochen (Grund unter stderr)'
  return `Exit ${e.exit_code}`
}

/** @param titel - Überschrift @param text - Projekttext @returns <pre>-Block oder '' bei leerem Text */
function textBlock(titel, text) {
  return text ? `<p class="hinweis">${titel}</p><pre class="projekt-aufruf-text">${escapeHtml(text)}</pre>` : ''
}

/** @param d - ErgebnisDateiAnsicht oder null @returns HTML */
function ergebnisDateiHtml(d) {
  if (d === null) return ''
  const kopf = `Ergebnisdatei <code>${escapeHtml(d.pfad)}</code>`
  if (!d.vorhanden) return `<p class="hinweis">${kopf}: ${escapeHtml(d.grund)}</p>`
  const alt = d.ausDiesemAufruf ? '' : ' — <strong>unverändert seit vor dem Aufruf</strong>'
  if (d.text === null) return `<p class="hinweis">${kopf}: vorhanden, ${d.bytes} Bytes (keine Textanzeige für diesen Dateityp)${alt}</p>`
  const gekuerzt = d.gekuerzt ? ` (gekürzt, ${d.bytes} Bytes gesamt)` : ''
  return textBlock(`${kopf}${gekuerzt}${alt}`, d.text || ' ')
}

/**
 * Ergebnis eines Aufrufs.
 * @param e - AufrufErgebnis (src/projekt-aufruf/types.ts) oder null
 * @returns HTML
 */
export function renderAufrufErgebnis(e) {
  if (e === null || e === undefined) return '<p class="leer">Noch kein Aufruf seit dem Serverstart.</p>'
  const badge = e.ausgang === 'GRUEN' ? 'ok' : 'fehler'
  return `<p><span class="badge ${badge}">${escapeHtml(ausgangText(e))}</span> <span class="hinweis">Dauer ${e.dauer_ms} ms</span></p>
    ${textBlock('stdout (Ende)', e.stdout_ende)}${textBlock('stderr (Ende)', e.stderr_ende)}${ergebnisDateiHtml(e.ergebnis_datei)}`
}

/**
 * Vorschau-Zeile: URL, erreichbar/nicht erreichbar, „Öffnen“ — oder der Hinweis, wie vorschau_url gesetzt wird.
 * @param v - VorschauStatus oder null (noch nicht geprüft)
 * @returns HTML
 */
export function renderVorschau(v) {
  if (v === null) return '<p class="leer">Vorschau wird geprüft…</p>'
  if (v.url === null) {
    return `<p class="hinweis">Keine Vorschau-URL (${escapeHtml(v.grund)}). Setzen: Feld <code>vorschau_url</code>, z. B. <code>http://127.0.0.1:3000</code>, im Registereintrag des Projekts (projekte.json bzw. projekte.lokal.json), danach den Leitstand neu starten.</p>`
  }
  const status = v.erreichbar ? '<span class="badge ok">erreichbar</span>' : '<span class="badge fehler">nicht erreichbar</span>'
  return `<p class="projekt-aufruf-zeile"><code>${escapeHtml(v.url)}</code> ${status} <span class="hinweis">${escapeHtml(v.grund)}</span>
    <a class="btn" href="${escapeHtml(v.url)}" target="_blank" rel="noopener noreferrer" aria-label="Vorschau in neuem Tab öffnen">Öffnen</a></p>`
}

/**
 * Aufruf-Bereich: startbefehl mit „Aufrufen“ und letztem Ergebnis — oder der Hinweis, wie startbefehl gesetzt wird.
 * @param daten - Antwort von GET /api/projekte/<id>/projekt-aufruf
 * @param projektId - id des Projekts (data-Attribut des Knopfs)
 * @returns HTML
 */
export function renderAufrufBereich(daten, projektId) {
  const vorlage = `<code>${escapeHtml(daten.startvorlage ?? 'Startvorlage des Projekts')}</code>`
  if (daten.startbefehl === null) {
    return `<p class="hinweis">Kein Aufruf konfiguriert. Setzen: Feld <code>startbefehl</code> (argv, [0] absoluter Programmpfad, keine .cmd/.bat/.com/.ps1 — unter Windows also z. B. node.exe mit dem Skript statt npm.cmd), optional <code>startZeitgrenzeMs</code> und <code>ergebnis_datei</code>, in der vom Leitstand geladenen Startvorlage ${vorlage}, danach den Leitstand neu starten.</p>`
  }
  const datei = daten.ergebnis_datei === null ? '' : ` → <code>${escapeHtml(daten.ergebnis_datei)}</code>`
  // argv als JSON-Liste: Argumentgrenzen bleiben erkennbar (Review-Befund), Stand = Serverstart.
  return `<p class="hinweis">Stand beim Serverstart aus ${vorlage}:</p>
    <p class="projekt-aufruf-zeile"><code class="projekt-aufruf-befehl">${escapeHtml(JSON.stringify(daten.startbefehl))}</code>${datei}
    <button type="button" class="btn btn-primary projekt-aufrufen" data-id="${escapeHtml(projektId)}"${daten.aktiv ? ' disabled' : ''}>${daten.aktiv ? 'Läuft…' : 'Aufrufen'}</button></p>
    <p class="fehler projekt-aufruf-fehler" hidden></p>
    <div class="projekt-aufruf-ergebnis">${renderAufrufErgebnis(daten.letzterAufruf)}</div>`
}
