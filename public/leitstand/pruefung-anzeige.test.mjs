/**
 * Datei: public/leitstand/pruefung-anzeige.test.mjs
 *
 * Zweck: Tests der Anzeigeregeln der Eignungsprüfung (F45 F-2b-2a): Ablauf je Phase (Typwahl, Pin, Bestätigung mit
 * Ausnahme-Feld, läuft, Bericht, Fehler), Bericht (Fakten vor dem Urteil, Befunde, Auflagen, Ausnahme, escaped), Freigabedialog
 * (Sperrgrund ohne „Installieren“, Bericht sichtbar) — Urteile GEEIGNET/MIT_AUFLAGEN/NICHT_GEEIGNET.
 *
 * Wird aufgerufen von: npm run test (node --test).
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { renderInstallationsBestaetigung } from './empfehlung-installation.js'
import { letzterBerichtHtml, pruefUrteilChip, renderBerichtFuerFreigabe, renderPruefAblauf, renderPruefBericht } from './pruefung-anzeige.js'

const PAYLOAD = JSON.parse(readFileSync(new URL('../../schemas/examples/kontrollzustand-pruefbericht-payload.valid.json', import.meta.url), 'utf8'))
const EINTRAG = { id: 'mcp-x', name: 'X <b>' }

test('pruefUrteilChip: drei Urteile mit Klasse, Unbekanntes roh und escaped', () => {
  assert.match(pruefUrteilChip('GEEIGNET'), /class="ablauf-status"[^>]*>geeignet</)
  assert.match(pruefUrteilChip('MIT_AUFLAGEN'), /ablauf-status warten/)
  assert.match(pruefUrteilChip('NICHT_GEEIGNET'), /ablauf-status fehler/)
  assert.match(pruefUrteilChip('<x>'), /&lt;x&gt;/)
})

test('renderPruefBericht: Fakten vor dem Urteilstext, Lebenszyklus-Skripte hervorgehoben, Befunde, Auflagen, Ausnahme, Lauf-Link', () => {
  const b = { ...PAYLOAD, ausnahme_begruendung: 'Weil <script>', fakten: { ...PAYLOAD.fakten, paket: { lebenszyklus: { postinstall: 'node x.js' }, bin: ['ctx'], abhaengigkeiten: 1 }, hooks: ['hooks/hooks.json'] } }
  const html = renderPruefBericht(b)
  assert.ok(html.indexOf('pruef-fakten') < html.indexOf('pruef-zusammenfassung'), 'Fakten stehen vor der Zusammenfassung des Modells (C14)')
  assert.match(html, /pruef-fakt-warnung[^]*postinstall: node x\.js/)
  assert.match(html, /hooks\/hooks\.json/)
  assert.match(html, /Installationsweg/)
  assert.match(html, /Nur als extern_lesend/)
  assert.match(html, /Weil &lt;script&gt;/)
  assert.match(html, /href="#\/runs\/eignungspruefung-context7-mcp-0b3c"/)
  assert.match(html, /keine Freigabe/)
  assert.match(renderPruefBericht({ ergebnis: { urteil: 'GEEIGNET', befunde: [], auflagen: [] } }), /Keine Befunde/)
})

test('renderPruefAblauf: Phasen typwahl, laedt, bestaetigen (Ausnahme-Feld nur bei ausgeschlossen), läuft, fertig, fehler', () => {
  assert.match(renderPruefAblauf(EINTRAG, { phase: 'typwahl' }), /<select[^>]*data-sm-typ="mcp-x"/)
  assert.doesNotMatch(renderPruefAblauf(EINTRAG, { phase: "laedt" }), /role="status"/, "keine zweite Live-Region (design-guardian 1)")
  assert.match(renderPruefAblauf(EINTRAG, { phase: "laedt" }), /tabindex="-1" data-pruef-fokus/)
  const vorbereitung = { subjekt: { name: 'X' }, typ: 'mcp', quelle: PAYLOAD.quelle, urteil_sammlung: 'Nur Ausnahme', urteil_bedeutung: 'nur begründet', ausgeschlossen: true, letzter_bericht: { urteil: 'GEEIGNET', gepinnte_version: '4.2.0', erstellt_am: '2026-10-11T00:00:00Z', aktuell: false } }
  const best = renderPruefAblauf(EINTRAG, { phase: 'bestaetigen', vorbereitung, ausnahme: 'abc' })
  assert.match(best, /<textarea[^>]*data-sm-ausnahme="mcp-x"[^>]*>abc<\/textarea>/)
  assert.match(best, /npm:@upstash\/context7-mcp@4\.3\.0/)
  assert.match(best, /Nur Ausnahme — nur begründet/)
  assert.match(best, /für eine andere Version/)
  assert.match(best, /kostet einen Modelllauf/)
  assert.match(best, /data-sm-pruefung-start="mcp-x">Prüfung starten/)
  assert.doesNotMatch(renderPruefAblauf(EINTRAG, { phase: 'bestaetigen', vorbereitung: { ...vorbereitung, ausgeschlossen: false } }), /textarea/)
  assert.match(renderPruefAblauf(EINTRAG, { phase: 'startet', vorbereitung }), /disabled/)
  assert.match(renderPruefAblauf(EINTRAG, { phase: 'laeuft', zustand: { lauf_id: 'l1' } }), /Prüflauf läuft[^]*#\/runs\/l1/)
  assert.match(renderPruefAblauf(EINTRAG, { phase: 'fertig', zustand: { bericht: PAYLOAD } }), /data-pruef-bericht="MIT_AUFLAGEN"/)
  assert.match(renderPruefAblauf(EINTRAG, { phase: 'fehler', meldung: 'Quelle nicht pinnbar: Paketangabe fehlt' }), /class="fehler"[^>]*>Quelle nicht pinnbar/)
  assert.equal(renderPruefAblauf(EINTRAG, undefined), '')
})

test('Freigabedialog: ohne Bericht / NICHT_GEEIGNET → Sperrgrund, kein „Installieren“; passender Bericht → Bericht + Knopf', () => {
  const mcp = { art: 'mcp', id: 'pw', name: 'PW', paket: 'p', version: '1.0.0', integrity: 'sha512-x', lizenz: null, lizenzRegistry: null, kosten: null, wirkung: 'lokal', werkzeuge: [], zielordner: 'z', herkunftUrl: 'u', eintragHash: 'h' }
  const ohne = renderInstallationsBestaetigung({ ...mcp, pruefbericht: null, pruefbericht_sperre: 'ohne Prüfbericht zur angezeigten Version — erst „Eignung prüfen“' })
  assert.match(ohne, /Freigabe gesperrt:[^]*ohne Prüfbericht/)
  assert.doesNotMatch(ohne, /data-installation-aktion="installieren"/)
  assert.match(ohne, /<button[^>]*disabled aria-describedby="installation-sperre">Installieren<\/button>/, 'Knopf deaktiviert mit Grund (F-1075)')
  const nicht = renderInstallationsBestaetigung({ ...mcp, pruefbericht: { ...PAYLOAD, ergebnis: { ...PAYLOAD.ergebnis, urteil: 'NICHT_GEEIGNET' } }, pruefbericht_sperre: 'Prüfbericht zu 1.0.0 lautet NICHT_GEEIGNET' })
  assert.match(nicht, /data-pruef-bericht="NICHT_GEEIGNET"/)
  assert.doesNotMatch(nicht, /data-installation-aktion="installieren"/)
  const gut = renderInstallationsBestaetigung({ ...mcp, pruefbericht: PAYLOAD, pruefbericht_sperre: null })
  assert.match(gut, /data-pruef-bericht="MIT_AUFLAGEN"/)
  assert.match(gut, /data-installation-aktion="installieren"/)
  const skill = renderInstallationsBestaetigung({ art: 'skill', id: 's', name: 'S', repo: 'r', ref: 'HEAD', version: 'a'.repeat(40), skillPfad: 'p', quellPfad: 'p', lizenz: null, kosten: null, zielordner: 'z', herkunftUrl: 'u', hinweis: 'h', eintragHash: 'e', pruefbericht: null, pruefbericht_sperre: 'Prüfbericht nur für b, angezeigt ist a' })
  assert.doesNotMatch(skill, /data-installation-aktion="installieren"/)
  assert.equal(renderBerichtFuerFreigabe({ pruefbericht: null, pruefbericht_sperre: null }).gesperrt, false)
})

test('letzterBerichtHtml: Chip, Version und Datum; null → leer', () => {
  assert.match(letzterBerichtHtml({ urteil: 'GEEIGNET', gepinnte_version: 'abc', erstellt_am: '2026-10-12T10:00:00Z' }), /geeignet[^]*Version abc · 2026-10-12/)
  assert.equal(letzterBerichtHtml(null), '')
})

test('F45 F-2b-2c: „Eignung prüfen“ im Sperrblock nur mit Option und nur ohne Bericht; Präfix der DOM-ids; gemerkte Pfad-Eingabe', () => {
  const mcp = { art: 'mcp', id: 'pw', name: 'PW', paket: 'p', version: '1.0.0', integrity: 'sha512-x', lizenz: null, lizenzRegistry: null, kosten: null, wirkung: 'lokal', werkzeuge: [], zielordner: 'z', herkunftUrl: 'u', eintragHash: 'h' }
  const ohne = { ...mcp, pruefbericht: null, pruefbericht_sperre: 'ohne Prüfbericht zur angezeigten Version' }
  const mitKnopf = renderInstallationsBestaetigung(ohne, { eignungPruefen: true })
  assert.match(mitKnopf, /<button type="button" class="button primary" data-sm-auswaehlen="pw" data-sm-typ-offen="false">Eignung prüfen<\/button>/)
  assert.doesNotMatch(mitKnopf, /href="#\/capabilities"/)
  assert.match(renderInstallationsBestaetigung(ohne), /href="#\/capabilities"/, 'ohne Option (Workboard, Workflows) bleibt der Verweis')
  const mitBericht = renderBerichtFuerFreigabe({ ...mcp, pruefbericht: PAYLOAD, pruefbericht_sperre: 'Prüflauf hat 1 Datei übersprungen (binaer 1) — nicht installierbar (F-1078)' }, { eignungPruefen: true })
  assert.equal(mitBericht.gesperrt, true)
  assert.doesNotMatch(mitBericht.html, /data-sm-auswaehlen|href="#\/capabilities"/, 'ein neuer Lauf derselben Version änderte nichts')
  assert.match(mitBericht.html, /Prüflauf hat 1 Datei übersprungen/)
  const v = { quelle: { art: 'git', repo: 'https://github.com/o/r.git', ref: 'HEAD', sha: 'a'.repeat(40), pfad: 'skills/x' }, typ: 'skill' }
  const lib = renderPruefAblauf(EINTRAG, { phase: 'bestaetigen', vorbereitung: v, pfadEingabe: 'skills/y' }, {}, 'lib')
  assert.match(lib, /<label for="lib-pfad-mcp-x">/)
  assert.match(lib, /id="lib-pfad-mcp-x" data-sm-pfad="mcp-x" value="skills\/y"/)
  assert.doesNotMatch(lib, /id="sm-/)
})
