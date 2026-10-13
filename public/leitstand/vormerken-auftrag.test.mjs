/**
 * Datei: public/leitstand/vormerken-auftrag.test.mjs
 *
 * Zweck: F-781 (F36 WS-1b) — reine Prüfung des Vormerken-Auftragstexts
 * (baueVormerkenAuftragstext). Ein vorgemerkter extern-Eintrag muss seit
 * F36 WS-1 name, beschreibung, unterart und bei mcp wirkung tragen, sonst
 * scheitert er an validiereRessourcenDaten (Gate check-f19-ressourcen).
 * F45 F-2b-2c: Vormerken aus der Sammlung (Skelett, Ref-URL, vormerkbar, NFKD-id).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ableiteRessourcenId, baueSammlungVormerkenAuftragstext, baueVormerkenAuftragstext, sammlungNichtVormerkbar, sammlungRefUrl } from './vormerken-auftrag.js'

const externKandidat = {
  name: 'Graft MCP',
  typ: 'extern',
  quelle_url: 'https://github.com/trailhq/Graft',
  capabilities: ['REPO_READ'],
  empfehlung: 'Pilot für Codekontext.',
}

const skillKandidat = {
  name: 'Humanizer',
  typ: 'skill',
  quelle_url: 'https://github.com/blader/humanizer',
  capabilities: ['TEXT_EDITING'],
  empfehlung: 'Aufnehmen.',
}

test('ableiteRessourcenId: kleinbuchstabig mit Bindestrich, nie leer', () => {
  assert.strictEqual(ableiteRessourcenId('Graft MCP'), 'graft-mcp')
  assert.strictEqual(ableiteRessourcenId('!!!'), 'kandidat')
})

test('baueVormerkenAuftragstext: extern nennt name, beschreibung, unterart und wirkung (bei mcp)', () => {
  const text = baueVormerkenAuftragstext(externKandidat, 'lauf-1')
  assert.match(text, /- id: "graft-mcp"/)
  assert.match(text, /- typ: "extern"/)
  assert.match(text, /- name: "Graft MCP"/)
  assert.match(text, /- beschreibung: /)
  assert.match(text, /- unterart: .*"skill".*"agent".*"mcp"/)
  assert.match(text, /- wirkung: .*"lokal".*"extern_lesend".*"extern_schreibend"/)
  assert.match(text, /nur bei unterart "mcp"/)
  assert.match(text, /herkunft: \{ "art": "extern", "url": "https:\/\/github.com\/trailhq\/Graft" \}/)
  assert.match(text, /freigabe: "OFFEN"/)
  assert.match(text, /Scout-Lauf 'lauf-1'/)
})

test('baueVormerkenAuftragstext: typ skill trägt weder name/beschreibung (R1) noch unterart/wirkung', () => {
  const text = baueVormerkenAuftragstext(skillKandidat, 'lauf-2')
  assert.match(text, /- typ: "skill"/)
  assert.doesNotMatch(text, /- name: /)
  assert.doesNotMatch(text, /- beschreibung: /)
  assert.doesNotMatch(text, /- unterart: /)
  assert.doesNotMatch(text, /- wirkung: /)
  assert.match(text, /"pfad": ".claude\/skills\/humanizer"/)
})

test('baueVormerkenAuftragstext: Name und URL mit Anführungszeichen bleiben gültige JSON-String-Literale', () => {
  const text = baueVormerkenAuftragstext({ ...externKandidat, name: 'Say "hi"', quelle_url: 'https://x.test/a"b' }, 'lauf-3')
  assert.match(text, /- name: "Say \\"hi\\""/)
  assert.match(text, /"url": "https:\/\/x\.test\/a\\"b" \}/)
})

test('baueVormerkenAuftragstext: lizenz des Scout-Kandidaten wird nur bei extern und nur wenn gesetzt weitergereicht', () => {
  assert.match(baueVormerkenAuftragstext({ ...externKandidat, lizenz: 'MIT' }, 'l'), /- lizenz: "MIT"/)
  assert.doesNotMatch(baueVormerkenAuftragstext(externKandidat, 'l'), /- lizenz: /)
  assert.doesNotMatch(baueVormerkenAuftragstext({ ...skillKandidat, lizenz: 'MIT' }, 'l'), /- lizenz: /)
})

// ─── F45 F-2b-2c: Vormerken aus der Sammlung ─────────────────────────────────

const SHA = 'a'.repeat(40)
const skillZeile = {
  id: 'ueber-skill',
  name: 'Über Skill',
  kurzbeschreibung: 'Schreibt Texte um.',
  lizenz: 'MIT',
  kosten: 'kostenlos',
  link: 'https://github.com/owner/repo/tree/main/skills/ueber',
  zeile: 42,
  urteil: 'Aufnehmen',
  zuordnung: { status: 'keine' },
  pruefbericht_letzter: { artefakt_id: 'pruefbericht-s-ueber-skill', version: 1, urteil: 'GEEIGNET', gepinnte_version: SHA, typ: 'skill', quelle: { art: 'git', repo: 'https://github.com/owner/repo.git', ref: 'main', sha: SHA, pfad: 'skills/ueber' }, bin: null, skill_md: true, uebersprungen: 0 },
}
const mcpZeile = {
  id: 'ctx',
  name: 'Context7 MCP',
  kurzbeschreibung: 'Aktuelle Doku.',
  lizenz: 'MIT',
  kosten: '',
  link: 'https://github.com/upstash/context7',
  zeile: 7,
  urteil: 'Aufnehmen',
  zuordnung: { status: 'keine' },
  pruefbericht_letzter: { artefakt_id: 'pruefbericht-s-ctx', version: 2, urteil: 'MIT_AUFLAGEN', gepinnte_version: '4.3.0', typ: 'mcp', quelle: { art: 'npm', paket: '@upstash/context7-mcp', version: '4.3.0', integrity: `sha512-${'x'.repeat(86)}==` }, bin: 'dist/index.js', skill_md: false, uebersprungen: 0 },
}

/** Skelett aus dem Text lesen. @param text - Auftragstext @returns Objekt */
const skelett = (text) => JSON.parse(/```json\n([\s\S]*?)\n```/.exec(text)[1])

test('ableiteRessourcenId (F45 F-2b-2c): NFKD — Umlaute verlieren nur das Zeichen, nicht den Buchstaben', () => {
  assert.strictEqual(ableiteRessourcenId('Über Skill'), 'uber-skill')
  assert.strictEqual(ableiteRessourcenId('Café-MCP'), 'cafe-mcp')
})

test('sammlungRefUrl: Repo + Ref ohne Unterpfad, HEAD ohne /tree', () => {
  assert.strictEqual(sammlungRefUrl({ repo: 'https://github.com/o/r.git', ref: 'main' }), 'https://github.com/o/r/tree/main')
  assert.strictEqual(sammlungRefUrl({ repo: 'https://github.com/o/r.git', ref: 'HEAD' }), 'https://github.com/o/r')
})

test('sammlungNichtVormerkbar: Katalog, Bericht, Urteil, Typ, ganzes Repo, Pfad-Segmente, SKILL.md', () => {
  assert.strictEqual(sammlungNichtVormerkbar(skillZeile), null)
  assert.strictEqual(sammlungNichtVormerkbar(mcpZeile), null)
  assert.strictEqual(sammlungNichtVormerkbar({ ...skillZeile, zuordnung: { status: 'zugeordnet', katalog_id: 'x' } }), 'katalog')
  assert.strictEqual(sammlungNichtVormerkbar({ ...skillZeile, zuordnung: { status: 'mehrdeutig', kandidaten: [] } }), 'katalog')
  assert.strictEqual(sammlungNichtVormerkbar({ ...skillZeile, pruefbericht_letzter: null }), 'ohne_bericht')
  const b = skillZeile.pruefbericht_letzter
  assert.strictEqual(sammlungNichtVormerkbar({ ...skillZeile, pruefbericht_letzter: { ...b, urteil: 'NICHT_GEEIGNET' } }), 'nicht_geeignet')
  assert.strictEqual(sammlungNichtVormerkbar({ ...skillZeile, pruefbericht_letzter: { ...b, typ: 'agent' } }), 'typ')
  assert.strictEqual(sammlungNichtVormerkbar({ ...skillZeile, pruefbericht_letzter: { ...b, quelle: { ...b.quelle, pfad: '' } } }), 'ganzes_repo')
  assert.strictEqual(sammlungNichtVormerkbar({ ...skillZeile, pruefbericht_letzter: { ...b, quelle: { ...b.quelle, pfad: 'skills/mit leer' } } }), 'skill_pfad')
  assert.strictEqual(sammlungNichtVormerkbar({ ...skillZeile, pruefbericht_letzter: { ...b, skill_md: false } }), 'ohne_skill_md')
  assert.strictEqual(sammlungNichtVormerkbar({ ...mcpZeile, link: null }), 'typ')
})

test('baueSammlungVormerkenAuftragstext Skill: Skelett gültiges JSON, Ref-URL, skill_pfad = quelle.pfad, OFFEN, Beleg, P5', () => {
  const text = baueSammlungVormerkenAuftragstext(skillZeile, skillZeile.pruefbericht_letzter)
  const e = skelett(text)
  assert.deepStrictEqual(e, {
    id: 'uber-skill',
    typ: 'extern',
    name: 'Über Skill',
    beschreibung: 'Schreibt Texte um.',
    unterart: 'skill',
    lizenz: 'MIT',
    kosten: 'kostenlos',
    capabilities: ['<CAPABILITY>'],
    freigabe: 'OFFEN',
    herkunft: { art: 'extern', url: 'https://github.com/owner/repo/tree/main' },
    installation_vorlage: { skill_pfad: 'skills/ueber' },
  })
  assert.match(text, /GENAU EINEN neuen Eintrag/)
  assert.match(text, /Prüfbericht 'pruefbericht-s-ueber-skill' Version 1 \(Urteil GEEIGNET\), gepinnte Version a{40}/)
  assert.match(text, /VERTRAG \(P5\)/)
  assert.doesNotMatch(text, /wirkung:/, 'Skill trägt keine wirkung')
})

test('baueSammlungVormerkenAuftragstext MCP: Paket, geprüftes bin fest, wirkung/werkzeuge offen; ohne bin Platzhalter mit Regel', () => {
  const text = baueSammlungVormerkenAuftragstext(mcpZeile, mcpZeile.pruefbericht_letzter)
  const e = skelett(text)
  assert.deepStrictEqual(e.herkunft, { art: 'extern', url: 'https://github.com/upstash/context7', paket: 'npm:@upstash/context7-mcp' })
  assert.deepStrictEqual(e.installation_vorlage, { bin: 'dist/index.js', args: [], werkzeuge: ['mcp__context7-mcp__<WERKZEUG>'] })
  assert.strictEqual(e.wirkung, '<WIRKUNG>')
  assert.strictEqual('kosten' in e, false, 'leere Kosten fallen weg')
  assert.match(text, /nur "lokal" ist über die Workforce installierbar/)
  assert.match(text, /angebotenen Werkzeuge/)
  assert.doesNotMatch(text, /- bin:/)
  const ohneBin = baueSammlungVormerkenAuftragstext(mcpZeile, { ...mcpZeile.pruefbericht_letzter, bin: null })
  assert.strictEqual(skelett(ohneBin).installation_vorlage.bin, '<BIN>')
  assert.match(ohneBin, /- bin: der Pfad aus dem Feld "bin" der package.json von @upstash\/context7-mcp@4.3.0/)
  // Werte der Sammlung mit Anführungszeichen bleiben gültiges JSON.
  assert.strictEqual(skelett(baueSammlungVormerkenAuftragstext({ ...mcpZeile, name: 'Say "hi"', kurzbeschreibung: 'a "b"' }, mcpZeile.pruefbericht_letzter)).name, 'Say "hi"')
})
