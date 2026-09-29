/**
 * Datei: public/leitstand/empfehlung-installation.test.mjs
 *
 * Zweck: node:test-Fälle für F36 WS-5a in der Oberfläche — Bestätigungsblock (alle Pflichtangaben,
 * Escaping, version/integrity am Knopf), Ergebniszeile, und in renderEmpfehlung: Projekt-URL, Knopf
 * „Freigeben & installieren“ nur bei installierbar, gehaltener Ablaufzustand je id, empfehlungId in
 * empfehlungIdsFuerFreigabe (F-808). Den Klickweg im Browser belegt features/F36/nachweis-ws5a-ui/.
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { empfehlungIdsFuerFreigabe, renderEmpfehlung, setzeInstallationsAnzeige, setzeInstallationsMeldung } from './empfehlung-anzeige.js'
import { installationsErfolgText, renderInstallationsBestaetigung, renderInstallationsErgebnis } from './empfehlung-installation.js'

const VORBEREITUNG = {
  id: 'playwright-mcp',
  name: 'Playwright <MCP>',
  paket: '@playwright/mcp',
  version: '0.0.83',
  integrity: 'sha512-abc+/=="><x',
  lizenz: 'Apache-2.0 (GitHub-Metadaten)',
  lizenzRegistry: 'Apache-2.0',
  kosten: 'lokal kostenlos',
  wirkung: 'lokal',
  werkzeuge: ['mcp__playwright-mcp__browser_navigate', 'mcp__playwright-mcp__browser_close'],
  zielordner: 'C:\\Users\\x\\.ai-workforce\\cap\\playwright-mcp',
  herkunftUrl: 'https://github.com/microsoft/playwright-mcp',
}

const EMPFEHLUNG = {
  schrittId: 's',
  wirdGenutzt: [{ id: 'gate-mcp', name: 'Gate', typ: 'extern', unterart: 'mcp', grund: 'passt', empfehlungId: `gate-mcp@${'a'.repeat(64)}` }],
  passtNichtImLauf: [
    { id: 'playwright-mcp', name: 'Playwright MCP', typ: 'extern', unterart: 'mcp', grund: 'freigabe OFFEN; installation fehlt', installierbar: true },
    { id: 'andere', name: 'Andere', typ: 'extern', unterart: 'skill', grund: 'erst ab WS-5' },
  ],
  weitereAnzahl: { wirdGenutzt: 0, passtNichtImLauf: 0 },
  nichtFreigebbarAnzahl: 0,
  hinweise: [],
  projektUrl: 'http://localhost:5173',
}

test('renderInstallationsBestaetigung: alle Angaben vor dem Klick, escaped; Knopf trägt genau version + integrity', () => {
  const html = renderInstallationsBestaetigung(VORBEREITUNG)
  for (const teil of ['npm:@playwright/mcp', '0.0.83', 'Apache-2.0 (GitHub-Metadaten) (Registry: Apache-2.0)', 'lokal kostenlos', 'Wirkung:', 'mcp__playwright-mcp__browser_close', '.ai-workforce\\cap\\playwright-mcp', 'Informationsadresse']) {
    assert.ok(html.includes(teil), `fehlt: ${teil}`)
  }
  assert.ok(html.includes('Playwright &lt;MCP&gt;'))
  assert.ok(!html.includes('"><x'), 'integrity wird escaped')
  assert.match(html, /data-installation-aktion="installieren" data-ressource-id="playwright-mcp" data-version="0.0.83" data-integrity="sha512-abc\+\/==&quot;&gt;&lt;x"/)
  assert.match(html, /data-installation-aktion="abbrechen"/)
})

test('renderInstallationsBestaetigung: fehlende Lizenz/Kosten → „nicht angegeben“', () => {
  const html = renderInstallationsBestaetigung({ ...VORBEREITUNG, lizenz: null, lizenzRegistry: null, kosten: null })
  assert.equal(html.split('nicht angegeben').length - 1, 2)
})

test('renderInstallationsErgebnis: Erfolg/Fehler mit Klasse, escaped', () => {
  assert.equal(renderInstallationsErgebnis(true, 'ok <b>'), '<p class="erfolg">ok &lt;b&gt;</p>')
  assert.equal(renderInstallationsErgebnis(false, 'nein'), '<p class="fehler">nein</p>')
})

test('renderEmpfehlung (WS-5a): Projekt-URL, Knopf nur bei installierbar, Ablaufzustand je id und Meldung bleiben über Neu-Rendering', () => {
  const html = renderEmpfehlung(EMPFEHLUNG)
  assert.match(html, /Projekt-URL: <code>http:\/\/localhost:5173<\/code>/)
  assert.equal(html.split('data-installation-aktion="vorbereiten"').length - 1, 1)
  assert.match(html, /data-ressource-id="playwright-mcp">Freigeben &amp; installieren<\/button><div class="empfehlung-installation" data-installation-fuer="playwright-mcp"><\/div>/)
  assert.match(renderEmpfehlung({ ...EMPFEHLUNG, projektUrl: null }), /Projekt-URL: nicht gesetzt/)
  assert.doesNotMatch(renderEmpfehlung({ ...EMPFEHLUNG, projektUrl: undefined, ...{} }), /Projekt-URL: <code>/)
  const { projektUrl: _weg, ...ohneFeld } = EMPFEHLUNG
  assert.doesNotMatch(renderEmpfehlung(ohneFeld), /Projekt-URL/)
  setzeInstallationsAnzeige('playwright-mcp', '<p class="hinweis">läuft</p>')
  setzeInstallationsMeldung('gate-mcp', '<p class="erfolg">fertig</p>')
  try {
    const neu = renderEmpfehlung(EMPFEHLUNG)
    assert.match(neu, /data-installation-fuer="playwright-mcp"><p class="hinweis">läuft<\/p><\/div>/)
    assert.match(neu, /<h3>Katalog-Empfehlung<\/h3>\s*<p class="erfolg">fertig<\/p>/)
    // Steht die id in „Passt, nicht im Lauf“ (z. B. ohne Projekt-URL), bleibt die Meldung sichtbar;
    // in einem Block ohne diese id nicht.
    assert.match(renderEmpfehlung({ ...EMPFEHLUNG, wirdGenutzt: [], passtNichtImLauf: [{ id: 'gate-mcp', name: 'G', typ: 'extern', grund: 'Projekt-URL (vorschau_url) fehlt' }] }), /fertig/)
    assert.doesNotMatch(renderEmpfehlung({ ...EMPFEHLUNG, wirdGenutzt: [], passtNichtImLauf: [] }), /fertig/)
  } finally {
    setzeInstallationsAnzeige('playwright-mcp', '')
    setzeInstallationsMeldung(null, '')
  }
  assert.doesNotMatch(renderEmpfehlung(EMPFEHLUNG), /läuft|fertig/)
})

test('empfehlungIdsFuerFreigabe (F-808): schickt die empfehlungId (<id>@<hash>)', () => {
  assert.deepEqual(empfehlungIdsFuerFreigabe(EMPFEHLUNG), [`gate-mcp@${'a'.repeat(64)}`])
})

const SKILL_VORBEREITUNG = {
  art: 'skill',
  id: 'frontend-design',
  name: 'frontend <design>',
  repo: 'https://github.com/anthropics/claude-plugins-official.git',
  ref: 'main',
  version: 'f'.repeat(40),
  skillPfad: 'skills/frontend-design',
  quellPfad: 'plugins/frontend-design/skills/frontend-design',
  lizenz: 'Apache-2.0 im Plugin-LICENSE',
  kosten: null,
  zielordner: 'C:/Users/x/.ai-workforce/cap/frontend-design/.claude/skills/<name aus SKILL.md>',
  herkunftUrl: 'https://github.com/anthropics/claude-plugins-official/tree/main/plugins/frontend-design',
  hinweis: 'Skill-Dateien können Skripte enthalten; ausgeführt werden nur Befehle, die der Werkzeugsatz der Ausführung zulässt – lesende Befehle lässt die CLI auch ohne Eintrag zu.',
  eintragHash: 'e'.repeat(64),
}

test('renderInstallationsBestaetigung (WS-5b): Skill zeigt Repo, Ref, SHA, skill_pfad, Lizenz, Kosten, Zielordner und Skript-Hinweis; Knopf trägt SHA + eintragHash', () => {
  const html = renderInstallationsBestaetigung(SKILL_VORBEREITUNG)
  for (const teil of ['Repo:', 'claude-plugins-official.git', 'Ref:', '<code>main</code>', 'Commit (SHA):', 'f'.repeat(40), 'skill_pfad:', 'skills/frontend-design', 'Lizenz:', 'Apache-2.0 im Plugin-LICENSE', 'Kosten:', 'Zielordner:', '&lt;name aus SKILL.md&gt;', 'Skript', 'Werkzeugsatz der Ausführung', 'lesende Befehle lässt die CLI auch ohne Eintrag zu']) {
    assert.ok(html.includes(teil), `fehlt: ${teil}`)
  }
  assert.ok(html.includes('frontend &lt;design&gt;'), 'Name escaped')
  assert.equal(html.split('nicht angegeben').length - 1, 1, 'Kosten null → „nicht angegeben“')
  assert.match(html, new RegExp(`data-installation-aktion="installieren" data-ressource-id="frontend-design" data-version="${'f'.repeat(40)}" data-integrity="" data-eintrag-hash="${'e'.repeat(64)}"`))
  assert.doesNotMatch(html, /npm:/)
})

test('installationsErfolgText (WS-5b): Skill nennt Name, Commit und Dateizahl; MCP bleibt Paket + Werkzeuge', () => {
  assert.match(installationsErfolgText({ art: 'skill', id: 'fd', name: 'frontend-design', version: 'a'.repeat(40), dateien: ['LICENSE.txt', 'SKILL.md'] }), /Skill 'frontend-design' @ a{40} \(2 Dateien\)/)
  assert.match(installationsErfolgText({ art: 'mcp', id: 'pw', paket: '@playwright/mcp', version: '0.0.83', werkzeugeGefunden: ['a', 'b'] }), /@playwright\/mcp@0\.0\.83 \(2 Werkzeuge/)
})
