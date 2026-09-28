/**
 * Datei: public/leitstand/vormerken-auftrag.test.mjs
 *
 * Zweck: F-781 (F36 WS-1b) — reine Prüfung des Vormerken-Auftragstexts
 * (baueVormerkenAuftragstext). Ein vorgemerkter extern-Eintrag muss seit
 * F36 WS-1 name, beschreibung, unterart und bei mcp wirkung tragen, sonst
 * scheitert er an validiereRessourcenDaten (Gate check-f19-ressourcen).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ableiteRessourcenId, baueVormerkenAuftragstext } from './vormerken-auftrag.js'

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
