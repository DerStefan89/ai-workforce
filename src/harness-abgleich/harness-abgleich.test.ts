/**
 * Datei: src/harness-abgleich/harness-abgleich.test.ts
 *
 * Zweck: Tests des Harness-Abgleichs (F45 B1b-2, Beleg 12, Plan v2): DoD-Parser und stabile ID, Hook-Einträge aus
 * settings.json (ohne Befehl, mit Skript-Hash), Inventar gegen Wegwerf-Projekte (vollständig, fehlende/kaputte
 * Quellen, Verknüpfung nach außen — ohne Wurf), Validator der Zuordnung (Pflichtfelder je Status, Hook-Belege mit
 * Hash und Matcher, doppelte Schlüssel, Pfade), Laden mit Projektdatei, Abgleich ohne und mit Laufbelegen (wirksam,
 * ohne Beleg, negativer Beleg, ersetzt nur bei gelaufenem Schritt, fehlt_im_ablauf, offen — ein unbekannter Agent ist
 * offen), Kurzliste, geänderte Harness-Dateien, Ergebnis-Validator gegen die Schema-Beispiele, und die echte
 * harness-abgleich/standard.json gegen den Ist-Harness von ai-workforce (kein Eintrag offen, Text ↔ ID, Quellen
 * vorhanden).
 *
 * Wird aufgerufen von: npm run test (node --test).
 */

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'
import { raeumeVerzeichnis } from '../../scripts/_aufraeumen.ts'
import {
  baueFaehigkeitenKurzliste,
  berechneHarnessAbgleich,
  dodId,
  filtereHarnessDateien,
  ladeZuordnung,
  leseDodPunkte,
  leseHarnessInventar,
  leseHookEintraege,
  normalisiereDodText,
  validiereHarnessAbgleichDaten,
  validiereZuordnung,
  zuordnungsSchluessel,
} from './index.ts'
import type { GeladeneZuordnung, Laufbelege, ZuordnungEintrag } from './types.ts'

const INSTALLATION = join(import.meta.dirname, '..', '..')
const temp = mkdtempSync(join(tmpdir(), 'harness-abgleich-'))
after(() => raeumeVerzeichnis(temp))
let zaehler = 0

/**
 * Legt ein Wegwerf-Projekt an.
 * @param dateien - repo-relativer Pfad → Inhalt
 * @returns Wurzel
 */
function projekt(dateien: Record<string, string>): string {
  const wurzel = join(temp, `p-${++zaehler}`)
  for (const [pfad, inhalt] of Object.entries(dateien)) {
    const ziel = join(wurzel, ...pfad.split('/'))
    mkdirSync(join(ziel, '..'), { recursive: true })
    writeFileSync(ziel, inhalt)
  }
  mkdirSync(wurzel, { recursive: true })
  return wurzel
}

const sha = (text: string) => createHash('sha256').update(text).digest('hex')
const GUARD_INHALT = '// commit-guard Attrappe\n'
const CLAUDE_MD = ['# Projekt', '', '### Definition of Done', '- [ ] Punkt eins', '- [ ] Punkt zwei mit', '      Folgezeile', '- [x] `npm run check` → Exit 0', '', '---', '- [ ] nicht mehr DoD', ''].join('\n')
const SETTINGS = JSON.stringify({
  hooks: {
    PreToolUse: [
      { matcher: 'Bash|PowerShell', hooks: [{ type: 'command', command: 'node .claude/hooks/commit-guard.cjs' }] },
      { matcher: 'Edit|Write', hooks: [{ type: 'command', command: 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/guard-settings.js"' }] },
    ],
    SessionStart: [{ hooks: [{ type: 'command', command: 'TOKEN=geheim echo hallo' }] }],
  },
})

/**
 * Zuordnung im Speicher (ohne Datei).
 * @param eintraege - Einträge
 * @returns geladene Zuordnung
 */
function zuordnung(eintraege: ZuordnungEintrag[]): GeladeneZuordnung {
  return { eintraege: new Map(eintraege.map((e) => [zuordnungsSchluessel(e.art, e.name), e])), quellen: [{ pfad: 'harness-abgleich/standard.json', sha256: 'a'.repeat(64) }], fehler: null }
}

describe('DoD', () => {
  it('normalisiert Präfix, Kästchen und Leerraum; ID ist stabil und hängt nur am Text', () => {
    assert.equal(normalisiereDodText('- [ ]  Typisiert,   kein `any`  '), 'Typisiert, kein `any`')
    assert.equal(dodId('- [ ] A  B'), dodId('A B'))
    assert.match(dodId('A'), /^dod-[0-9a-f]{8}$/)
    assert.notEqual(dodId('A'), dodId('B'))
  })

  it('liest Punkte bis zur Linie, verbindet Folgezeilen', () => {
    const r = leseDodPunkte(CLAUDE_MD)
    assert.equal(r.ok, true)
    if (!r.ok) return
    assert.deepEqual(
      r.punkte.map((p) => p.text),
      ['Punkt eins', 'Punkt zwei mit Folgezeile', '`npm run check` → Exit 0']
    )
  })

  it('ohne Abschnitt oder ohne Punkte → Grund statt Wurf', () => {
    assert.deepEqual(leseDodPunkte('# nur Text'), { ok: false, grund: 'kein Abschnitt „Definition of Done“' })
    assert.equal(leseDodPunkte('## Definition of Done\n\nnur Fließtext\n').ok, false)
  })

  it('die echte CLAUDE.md von ai-workforce liefert zwölf Punkte', () => {
    const r = leseDodPunkte(readFileSync(join(INSTALLATION, 'CLAUDE.md'), 'utf8'))
    assert.equal(r.ok && r.punkte.length, 12)
  })
})

describe('Hooks aus settings.json', () => {
  it('ein Eintrag je Befehl mit Ereignis, Matcher, Skript, Hash; Befehl nie übernommen', () => {
    const e = leseHookEintraege(JSON.parse(SETTINGS), '.claude/settings.json', (datei) => (datei === 'commit-guard.cjs' ? 'h'.repeat(64) : null))
    assert.deepEqual(
      e.map((x) => [x.art, x.name, x.ereignis, x.matcher, x.quelle, x.skript_sha256, x.detail]),
      [
        ['hook', 'commit-guard', 'PreToolUse', 'Bash|PowerShell', '.claude/hooks/commit-guard.cjs', 'h'.repeat(64), null],
        ['hook', 'guard-settings', 'PreToolUse', 'Edit|Write', '.claude/hooks/guard-settings.js', null, null],
        ['hook', `ohne-skript-${sha('TOKEN=geheim echo hallo').slice(0, 8)}`, 'SessionStart', null, '.claude/settings.json', null, null],
      ]
    )
    assert.ok(!JSON.stringify(e).includes('geheim'))
  })

  it('kaputte Formen werden Quellen-Einträge, keine Hooks = leer', () => {
    assert.deepEqual(leseHookEintraege({}, 's'), [])
    assert.equal(leseHookEintraege([], 's')[0].art, 'quelle')
    assert.equal(leseHookEintraege({ hooks: 1 }, 's')[0].art, 'quelle')
    assert.equal(leseHookEintraege({ hooks: { X: 1 } }, 's')[0].art, 'quelle')
    assert.equal(leseHookEintraege({ hooks: { X: [{ hooks: [{}] }] } }, 's')[0].art, 'quelle')
    assert.equal(leseHookEintraege({ hooks: { X: [{}] } }, 's')[0].art, 'quelle')
  })
})

describe('Inventar', () => {
  it('vollständiges Projekt: DoD, Hooks (mit Hash der Datei), Agents, Skills, Commands; Punktdateien zählen nicht', () => {
    const wurzel = projekt({
      'CLAUDE.md': CLAUDE_MD,
      '.claude/settings.json': SETTINGS,
      '.claude/hooks/commit-guard.cjs': GUARD_INHALT,
      '.claude/agents/qa.md': 'x',
      '.claude/agents/.gitkeep': '',
      '.claude/agents/notiz.txt': 'x',
      '.claude/skills/git-flow/SKILL.md': 'x',
      '.claude/commands/lessons.md': 'x',
    })
    const inv = leseHarnessInventar(wurzel)
    assert.deepEqual(
      inv.map((e) => `${e.art}:${e.art === 'dod' ? (e.detail ?? '') : e.name}`),
      ['dod:Punkt eins', 'dod:Punkt zwei mit Folgezeile', 'dod:`npm run check` → Exit 0', 'hook:commit-guard', 'hook:guard-settings', `hook:ohne-skript-${sha('TOKEN=geheim echo hallo').slice(0, 8)}`, 'agent:qa', 'skill:git-flow', 'command:lessons']
    )
    assert.equal(inv.find((e) => e.name === 'commit-guard')?.skript_sha256, sha(GUARD_INHALT))
    assert.equal(inv.find((e) => e.name === 'guard-settings')?.skript_sha256, null)
  })

  it('fehlende CLAUDE.md und settings.json sind Quellen-Einträge; fehlende Ordner sind leer; fehlende Wurzel ohne Wurf', () => {
    const inv = leseHarnessInventar(projekt({ 'README.md': 'x' }))
    assert.deepEqual(
      inv.map((e) => [e.art, e.name, e.grund]),
      [
        ['quelle', 'CLAUDE.md', 'Datei fehlt'],
        ['quelle', '.claude/settings.json', 'Datei fehlt'],
      ]
    )
    const weg = leseHarnessInventar(join(temp, 'gibt-es-nicht'))
    assert.equal(weg.length, 1)
    assert.equal(weg[0].art, 'quelle')
  })

  it('kaputte settings.json, DoD ohne Abschnitt, Skill ohne SKILL.md → Quellen-Einträge mit Grund', () => {
    const inv = leseHarnessInventar(projekt({ 'CLAUDE.md': '# x', '.claude/settings.json': '{kaputt', '.claude/skills/leer/README.md': 'x' }))
    assert.deepEqual(
      inv.map((e) => [e.art, e.name]),
      [
        ['quelle', 'CLAUDE.md'],
        ['quelle', '.claude/settings.json'],
        ['quelle', '.claude/skills/leer'],
      ]
    )
    assert.match(inv[1].grund ?? '', /kein gültiges JSON/)
    assert.equal(inv[2].grund, 'Skill-Ordner ohne SKILL.md')
  })

  it('.claude als Verknüpfung nach außen → settings.json wird nicht gelesen (Quellen-Eintrag)', (t) => {
    const aussen = projekt({ '.claude/settings.json': SETTINGS, '.claude/agents/fremd.md': 'x', '.claude/commands/fremd.md': 'x' })
    const wurzel = projekt({ 'CLAUDE.md': CLAUDE_MD })
    try {
      symlinkSync(join(aussen, '.claude'), join(wurzel, '.claude'), 'junction')
    } catch {
      t.skip('Verknüpfung in dieser Umgebung nicht anlegbar')
      return
    }
    const inv = leseHarnessInventar(wurzel)
    const settings = inv.find((e) => e.name === '.claude/settings.json')
    assert.equal(settings?.art, 'quelle')
    assert.match(settings?.grund ?? '', /außerhalb/)
    assert.ok(!inv.some((e) => e.art === 'hook' || e.art === 'agent' || e.art === 'command'), 'nichts aus dem fremden Ordner gezählt')
    assert.deepEqual(
      inv.filter((e) => e.art === 'quelle').map((e) => e.name),
      ['.claude/settings.json', '.claude/agents', '.claude/commands']
    )
  })
})

describe('Zuordnung', () => {
  const gueltig = {
    harness_zuordnung_schema: 'v0',
    eintraege: [
      { art: 'hook', name: 'commit-guard', status: 'wirksam', beleg: { art: 'statisch', quelle: 'features/F45/nachweise/b1b2/zaehlung-hooks.json', skript_sha256: 'a'.repeat(64), matcher: 'Bash' } },
      { art: 'agent', name: 'code-reviewer', status: 'ersetzt_durch', schritt: { rolle: 'code-reviewer' }, fehlt_im_ablauf: { begruendung: 'fast-lane' } },
      { art: 'agent', name: 'qa', status: 'bewusst_nicht', begruendung: 'B2b' },
      { art: 'dod', name: 'dod-0123abcd', status: 'wirksam', beleg: { art: 'pruefschritt' }, text: 'x' },
      { art: 'dod', name: 'dod-0123abce', status: 'wirksam', beleg: { art: 'statisch', quelle: 'n.md' } },
    ],
  }

  it('gültige Zuordnung und das Schema-Beispiel ohne Verstoß; ungültiges Beispiel mit Verstoß', () => {
    assert.deepEqual(validiereZuordnung(gueltig), [])
    const lese = (n: string) => JSON.parse(readFileSync(join(INSTALLATION, 'schemas', 'examples', n), 'utf8'))
    assert.deepEqual(validiereZuordnung(lese('harness-zuordnung.valid.json')), [])
    assert.match(validiereZuordnung(lese('harness-zuordnung.invalid-ohne-begruendung.json')).join(), /begruendung ist bei bewusst_nicht Pflicht/)
  })

  it('Pflichtfelder je Status, Hook-Belege mit Hash und Matcher, fremde Felder, doppelte Schlüssel, Pfade', () => {
    const mit = (e: Record<string, unknown>) => validiereZuordnung({ harness_zuordnung_schema: 'v0', eintraege: [e] }).join(' | ')
    assert.match(mit({ art: 'dod', name: 'dod-0123abcd', status: 'wirksam' }), /beleg ist bei wirksam Pflicht/)
    assert.match(mit({ art: 'dod', name: 'dod-0123abcd', status: 'wirksam', beleg: { art: 'statisch' } }), /beleg\.quelle muss ein nicht-leerer String/)
    assert.match(mit({ art: 'dod', name: 'dod-0123abcd', status: 'wirksam', beleg: { art: 'statisch', quelle: '../aussen.md' } }), /'\.\.'/)
    assert.match(mit({ art: 'dod', name: 'dod-0123abcd', status: 'wirksam', beleg: { art: 'statisch', quelle: 'C:/abs.md' } }), /relativ/)
    assert.match(mit({ art: 'hook', name: 'x', status: 'wirksam', beleg: { art: 'statisch', quelle: 'n.md' } }), /skript_sha256 \(64 Hex\) ist bei Hooks Pflicht.*matcher ist bei Hooks Pflicht/)
    assert.match(mit({ art: 'dod', name: 'dod-0123abcd', status: 'wirksam', beleg: { art: 'statisch', quelle: 'n.md', matcher: 'Bash' } }), /nur bei Hooks/)
    assert.match(mit({ art: 'dod', name: 'dod-0123abcd', status: 'wirksam', beleg: { art: 'pruefschritt', quelle: 'n.md' } }), /nur bei art 'statisch'/)
    assert.match(mit({ art: 'skill', name: 'x', status: 'wirksam', beleg: { art: 'aufruf' } }), /beleg\.art muss statisch oder pruefschritt sein/)
    assert.match(mit({ art: 'agent', name: 'x', status: 'wirksam', beleg: { art: 'pruefschritt' }, schritt: { rolle: 'r' } }), /gehören zu ersetzt_durch/)
    assert.match(mit({ art: 'agent', name: 'x', status: 'ersetzt_durch' }), /schritt ist bei ersetzt_durch Pflicht/)
    assert.match(mit({ art: 'agent', name: 'x', status: 'ersetzt_durch', schritt: { rolle: 'r', bedingung: 'b' } }), /schritt: unbekanntes Feld 'bedingung'/)
    assert.match(mit({ art: 'agent', name: 'x', status: 'ersetzt_durch', schritt: { rolle: 'r' }, fehlt_im_ablauf: {} }), /fehlt_im_ablauf muss \{ begruendung \} sein/)
    assert.match(mit({ art: 'agent', name: 'x', status: 'bewusst_nicht' }), /begruendung ist bei bewusst_nicht Pflicht/)
    assert.match(mit({ art: 'agent', name: 'x', status: 'bewusst_nicht', begruendung: 'b', schritt: { rolle: 'r' } }), /weder 'beleg' noch 'schritt'/)
    assert.match(mit({ art: 'dod', name: 'falsch', status: 'bewusst_nicht', begruendung: 'b' }), /dod-<8 Hex>/)
    assert.match(mit({ art: 'plugin', name: 'x', status: 'bewusst_nicht', begruendung: 'b' }), /art muss eins von/)
    assert.match(mit({ art: 'agent', name: 'x', status: 'offen' }), /status muss eins von/)
    assert.match(mit({ art: 'agent', name: 'x', status: 'bewusst_nicht', begruendung: 'b', extra: 1 }), /unbekanntes Feld 'extra'/)
    assert.match(validiereZuordnung({ harness_zuordnung_schema: 'v0', eintraege: [gueltig.eintraege[2], gueltig.eintraege[2]] }).join(), /doppelt/)
    assert.deepEqual(validiereZuordnung([]), ['Wurzel ist kein Objekt'])
  })

  it('ladeZuordnung: Projektdatei überschreibt den Standard je Schlüssel; Fehler statt Wurf', () => {
    const install = projekt({
      'harness-abgleich/standard.json': JSON.stringify(gueltig),
      'harness-abgleich/projekt.json': JSON.stringify({ harness_zuordnung_schema: 'v0', eintraege: [{ art: 'agent', name: 'qa', status: 'ersetzt_durch', schritt: { rolle: 'qa' } }] }),
      'harness-abgleich/kaputt.json': '{',
    })
    const nurStandard = ladeZuordnung(install)
    assert.equal(nurStandard.fehler, null)
    assert.equal(nurStandard.eintraege.get('agent:qa')?.status, 'bewusst_nicht')
    const mitProjekt = ladeZuordnung(install, 'harness-abgleich/projekt.json')
    assert.equal(mitProjekt.eintraege.get('agent:qa')?.status, 'ersetzt_durch')
    assert.equal(mitProjekt.eintraege.get('hook:commit-guard')?.status, 'wirksam')
    assert.equal(mitProjekt.quellen.length, 2)
    assert.match(ladeZuordnung(install, 'harness-abgleich/kaputt.json').fehler ?? '', /kein gültiges JSON/)
    assert.match(ladeZuordnung(install, 'harness-abgleich/fehlt.json').fehler ?? '', /nicht lesbar/)
    assert.match(ladeZuordnung(install, '../aussen.json').fehler ?? '', /'\.\.'/)
    assert.match(ladeZuordnung(projekt({})).fehler ?? '', /standard\.json' nicht lesbar/)
  })
})

describe('Abgleich', () => {
  const wurzel = projekt({
    'CLAUDE.md': '## Definition of Done\n- [ ] `npm run check` → Exit 0\n- [ ] Kommentiert\n- [ ] Keine Commits\n',
    '.claude/settings.json': SETTINGS,
    '.claude/hooks/commit-guard.cjs': GUARD_INHALT,
    '.claude/hooks/guard-settings.js': 'anders\n',
    '.claude/agents/code-reviewer.md': 'x',
    '.claude/agents/architecture-advisor.md': 'x',
    '.claude/agents/qa.md': 'x',
    '.claude/agents/unbekannt.md': 'x',
    '.claude/skills/ponytail/SKILL.md': 'x',
  })
  const inventar = leseHarnessInventar(wurzel)
  const z = zuordnung([
    { art: 'dod', name: dodId('`npm run check` → Exit 0'), status: 'wirksam', beleg: { art: 'pruefschritt' } },
    { art: 'dod', name: dodId('Kommentiert'), status: 'bewusst_nicht', begruendung: 'B2a' },
    { art: 'dod', name: dodId('Keine Commits'), status: 'wirksam', beleg: { art: 'statisch', quelle: 'n.md' } },
    { art: 'hook', name: 'commit-guard', status: 'wirksam', beleg: { art: 'statisch', quelle: 'n.md', skript_sha256: sha(GUARD_INHALT), matcher: 'Bash|PowerShell' } },
    { art: 'hook', name: 'guard-settings', status: 'wirksam', beleg: { art: 'statisch', quelle: 'n.md', skript_sha256: sha('original\n'), matcher: 'Edit|Write' } },
    { art: 'hook', name: `ohne-skript-${sha('TOKEN=geheim echo hallo').slice(0, 8)}`, status: 'bewusst_nicht', begruendung: 'nur Gruß' },
    { art: 'agent', name: 'code-reviewer', status: 'ersetzt_durch', schritt: { rolle: 'code-reviewer' }, fehlt_im_ablauf: { begruendung: 'fast-lane ohne Review' } },
    { art: 'agent', name: 'architecture-advisor', status: 'ersetzt_durch', schritt: { rolle: 'architecture-advisor' } },
    { art: 'agent', name: 'qa', status: 'bewusst_nicht', begruendung: 'B2b (F-1031)' },
    { art: 'skill', name: 'ponytail', status: 'bewusst_nicht', begruendung: 'F' },
  ])
  const zeile = (r: ReturnType<typeof berechneHarnessAbgleich>, name: string) => r.eintraege.find((e) => e.name === name)
  const NPM = dodId('`npm run check` → Exit 0')

  it('ohne Laufbelege (Seite Workforce): laut Zuordnung, bestanden null; Hook mit fremdem Hash „ohne Beleg“; unbekannter Agent offen und zuerst', () => {
    const r = berechneHarnessAbgleich(inventar, z, null)
    assert.equal(r.eintraege[0].name, 'unbekannt')
    assert.equal(r.eintraege[0].offen_grund, 'nicht_in_zuordnung')
    assert.equal(r.bestanden, null)
    assert.equal(zeile(r, 'commit-guard')?.status, 'wirksam')
    assert.equal(zeile(r, 'commit-guard')?.beleg?.statisch, true)
    assert.equal(zeile(r, 'guard-settings')?.status, 'wirksam_ohne_beleg')
    assert.match(zeile(r, 'guard-settings')?.grund ?? '', /Hook weicht vom Nachweis ab: Skript-Hash/)
    assert.equal(zeile(r, NPM)?.status, 'wirksam')
    assert.equal(zeile(r, NPM)?.beleg?.im_lauf, null)
    assert.equal(zeile(r, 'code-reviewer')?.status, 'ersetzt_durch')
    assert.equal(zeile(r, 'code-reviewer')?.ersatz?.lage, null)
    assert.deepEqual(r.zaehlung, { wirksam: 3, wirksam_ohne_beleg: 1, ersetzt_durch: 2, bewusst_nicht: 4, offen: 1 })
  })

  const belege = (teil: Partial<Laufbelege> = {}): Laufbelege => ({
    schritte: [
      { schritt_id: 's1', rolle: 'ausfuehrung', status: 'ERFOLGREICH', lauf_id: 'L1' },
      { schritt_id: 's2', rolle: 'code-reviewer', status: 'ERFOLGREICH', lauf_id: 'L2' },
    ],
    ausfuehrung_lauf_id: 'L1',
    pruefergebnis: { ergebnis: 'GRUEN', lauf_id: 'L1' },
    beobachtung: { skill_aufrufe: ['ponytail', 'ponytail'], subagent_aufrufe: ['qa'], mcp_aufrufe: [] },
    ...teil,
  })

  it('mit Laufbelegen: Prüfschritt GRÜN zitiert, Review gelaufen, fehlender Advisor offen (ersatz_fehlt), Aufrufe angezeigt', () => {
    const r = berechneHarnessAbgleich(inventar, z, belege())
    assert.deepEqual([zeile(r, NPM)?.status, zeile(r, NPM)?.beleg?.ergebnis, zeile(r, NPM)?.beleg?.im_lauf, zeile(r, NPM)?.beleg?.lauf_id], ['wirksam', 'GRUEN', true, 'L1'])
    assert.deepEqual([zeile(r, 'code-reviewer')?.status, zeile(r, 'code-reviewer')?.ersatz?.lage, zeile(r, 'code-reviewer')?.ersatz?.lauf_id], ['ersetzt_durch', 'gelaufen', 'L2'])
    assert.deepEqual([zeile(r, 'architecture-advisor')?.status, zeile(r, 'architecture-advisor')?.offen_grund], ['offen', 'ersatz_fehlt'])
    assert.equal(zeile(r, 'ponytail')?.aufrufe, 2)
    assert.equal(zeile(r, 'qa')?.aufrufe, 1)
    assert.equal(r.bestanden, false)
  })

  it('negativer Beleg (Prüfung ROT) ist offen; fehlendes Prüfergebnis „ohne Beleg“ und nicht bestanden', () => {
    const rot = berechneHarnessAbgleich(inventar, z, belege({ pruefergebnis: { ergebnis: 'ROT', lauf_id: 'L1' } }))
    assert.deepEqual([zeile(rot, NPM)?.status, zeile(rot, NPM)?.offen_grund, zeile(rot, NPM)?.grund], ['offen', 'beleg_negativ', 'Prüfergebnis ROT'])
    const ohne = berechneHarnessAbgleich(inventar, z, belege({ pruefergebnis: null, beobachtung: null }))
    assert.deepEqual([zeile(ohne, NPM)?.status, zeile(ohne, NPM)?.beleg?.im_lauf], ['wirksam_ohne_beleg', false])
    assert.equal(zeile(ohne, 'ponytail')?.aufrufe, null)
  })

  it('Fast-Lane: Review fehlt → bewusst nicht mit Begründung aus fehlt_im_ablauf; Review im Ablauf, nicht gelaufen → offen', () => {
    const fast = berechneHarnessAbgleich(inventar, z, belege({ schritte: [{ schritt_id: 's1', rolle: 'ausfuehrung', status: 'ERFOLGREICH', lauf_id: 'L1' }] }))
    assert.deepEqual([zeile(fast, 'code-reviewer')?.status, zeile(fast, 'code-reviewer')?.begruendung, zeile(fast, 'code-reviewer')?.ersatz?.lage], ['bewusst_nicht', 'fast-lane ohne Review', 'nicht_im_ablauf'])
    const nichtGelaufen = berechneHarnessAbgleich(inventar, z, belege({ schritte: [{ schritt_id: 's2', rolle: 'code-reviewer', status: 'OFFEN', lauf_id: null }] }))
    assert.deepEqual([zeile(nichtGelaufen, 'code-reviewer')?.status, zeile(nichtGelaufen, 'code-reviewer')?.offen_grund], ['offen', 'ersatz_nicht_gelaufen'])
  })

  it('bestanden nur ohne offen und ohne „ohne Beleg“', () => {
    const inv = leseHarnessInventar(projekt({ 'CLAUDE.md': '## Definition of Done\n- [ ] `npm run check` → Exit 0\n', '.claude/settings.json': '{}' }))
    const zz = zuordnung([{ art: 'dod', name: NPM, status: 'wirksam', beleg: { art: 'pruefschritt' } }])
    assert.equal(berechneHarnessAbgleich(inv, zz, belege()).bestanden, true)
    assert.equal(berechneHarnessAbgleich(inv, zz, belege({ pruefergebnis: null })).bestanden, false)
  })

  it('Hook ohne Matcher (UserPromptSubmit) kann statisch wirksam sein; Matcher null muss angegeben sein', () => {
    const inv = leseHarnessInventar(projekt({ 'CLAUDE.md': '## Definition of Done\n- [ ] x\n', '.claude/settings.json': JSON.stringify({ hooks: { UserPromptSubmit: [{ hooks: [{ type: 'command', command: 'node .claude/hooks/erinnerung.cjs' }] }] } }), '.claude/hooks/erinnerung.cjs': GUARD_INHALT }))
    const zz = zuordnung([{ art: 'hook', name: 'erinnerung', status: 'wirksam', beleg: { art: 'statisch', quelle: 'n.md', skript_sha256: sha(GUARD_INHALT), matcher: null } }])
    assert.equal(berechneHarnessAbgleich(inv, zz, null).eintraege.find((e) => e.name === 'erinnerung')?.status, 'wirksam')
    assert.deepEqual(validiereZuordnung({ harness_zuordnung_schema: 'v0', eintraege: [{ art: 'hook', name: 'erinnerung', status: 'wirksam', beleg: { art: 'statisch', quelle: 'n.md', skript_sha256: 'a'.repeat(64), matcher: null } }] }), [])
    assert.match(validiereZuordnung({ harness_zuordnung_schema: 'v0', eintraege: [{ art: 'hook', name: 'erinnerung', status: 'wirksam', beleg: { art: 'statisch', quelle: 'n.md', skript_sha256: 'a'.repeat(64) } }] }).join(), /matcher ist bei Hooks Pflicht/)
  })

  it('Referenz-Inventar: im Arbeitsordner entfernte Einträge sind offen (im_lauf_entfernt), vorhandene nicht doppelt', () => {
    const referenz = leseHarnessInventar(projekt({ 'CLAUDE.md': '## Definition of Done\n- [ ] `npm run check` → Exit 0\n- [ ] Kommentiert\n', '.claude/settings.json': '{}', '.claude/agents/qa.md': 'x' }))
    const arbeitsordner = leseHarnessInventar(projekt({ 'CLAUDE.md': '## Definition of Done\n- [ ] Kommentiert\n', '.claude/settings.json': '{}' }))
    const r = berechneHarnessAbgleich(arbeitsordner, z, belege(), referenz)
    assert.deepEqual(
      r.eintraege.filter((e) => e.offen_grund === 'im_lauf_entfernt').map((e) => `${e.art}:${e.name}`),
      [`dod:${NPM}`, 'agent:qa']
    )
    assert.equal(r.bestanden, false)
    assert.equal(r.eintraege.filter((e) => e.name === dodId('Kommentiert')).length, 1)
  })

  it('ungültige Zuordnung macht jede Zeile offen mit Grund', () => {
    const r = berechneHarnessAbgleich(inventar, { eintraege: new Map(), quellen: [], fehler: 'kaputt' }, null)
    assert.ok(r.eintraege.every((e) => e.status === 'offen' && e.offen_grund === 'zuordnung_fehlerhaft' && e.grund === 'kaputt'))
  })
})

describe('Kurzliste und geänderte Harness-Dateien', () => {
  it('zählt Skills, Subagenten, MCP-Server; Hintergrund aus dem Feld; ohne Beobachtung null', () => {
    assert.deepEqual(baueFaehigkeitenKurzliste({ skill_aufrufe: ['a', 'b', 'a'], subagent_aufrufe: [], mcp_aufrufe: ['mcp__playwright__browser_navigate', 'mcp__playwright__browser_click', 'mcp__x__y'], hintergrund_aufrufe: [] }, 'L1'), {
      lauf_id: 'L1',
      skills: [
        { name: 'a', anzahl: 2 },
        { name: 'b', anzahl: 1 },
      ],
      subagenten: [],
      mcp_server: [
        { name: 'playwright', anzahl: 2 },
        { name: 'x', anzahl: 1 },
      ],
      hintergrund: 0,
    })
    assert.equal(baueFaehigkeitenKurzliste({ skill_aufrufe: [] }, 'L1')?.hintergrund, null)
    assert.equal(baueFaehigkeitenKurzliste(null, 'L1'), null)
    assert.equal(baueFaehigkeitenKurzliste({}, null), null)
  })

  it('filtert CLAUDE.md und .claude/** aus der Änderungsübersicht', () => {
    assert.deepEqual(filtereHarnessDateien([{ pfad: 'src/a.ts' }, { pfad: '.claude/agents/neu.md' }, { pfad: 'CLAUDE.md' }, { pfad: 'docs/CLAUDE.md' }, 'kaputt']), ['.claude/agents/neu.md', 'CLAUDE.md'])
    assert.equal(filtereHarnessDateien(null), null)
  })
})

describe('Ergebnis-Artefakt', () => {
  it('Beispiele: valid ohne Verstoß, invalid mit Verstoß (Zählung passt nicht)', () => {
    const lese = (n: string) => JSON.parse(readFileSync(join(INSTALLATION, 'schemas', 'examples', n), 'utf8'))
    assert.deepEqual(validiereHarnessAbgleichDaten(lese('kontrollzustand-harness-abgleich-payload.valid.json')), [])
    assert.match(validiereHarnessAbgleichDaten(lese('kontrollzustand-harness-abgleich-payload.invalid-zaehlung.json')).join(), /passt nicht zu den Einträgen/)
  })

  it('ein berechnetes Ergebnis ist gültig; bestanden muss zur Zählung passen', () => {
    const z = ladeZuordnung(INSTALLATION)
    const r = berechneHarnessAbgleich(leseHarnessInventar(INSTALLATION), z, null)
    const daten = {
      harness_abgleich_schema: 'v0',
      workflow_id: 'wf-test',
      wurzel: INSTALLATION,
      zuordnung_quellen: z.quellen,
      bezug: { ausfuehrung_lauf_id: null, pruefergebnis_hash: null },
      zaehlung: r.zaehlung,
      bestanden: r.bestanden,
      eintraege: r.eintraege,
      faehigkeiten: null,
      geaenderte_harness_dateien: null,
      berechnet_am: new Date().toISOString(),
    }
    assert.deepEqual(validiereHarnessAbgleichDaten(daten), [])
    assert.match(validiereHarnessAbgleichDaten({ ...daten, bestanden: false }).join(), /'bestanden' muss genau dann true sein/)
  })
})

describe('harness-abgleich/standard.json', () => {
  const z = ladeZuordnung(INSTALLATION)

  it('ist gültig und lässt im Ist-Harness von ai-workforce keinen Eintrag offen und keinen ohne Beleg', () => {
    assert.equal(z.fehler, null)
    const r = berechneHarnessAbgleich(leseHarnessInventar(INSTALLATION), z, null)
    assert.deepEqual(
      r.eintraege.filter((e) => e.status === 'offen' || e.status === 'wirksam_ohne_beleg').map((e) => `${e.art}:${e.name}:${e.grund}`),
      []
    )
  })

  it('jede DoD-ID passt zu ihrem Text, jede statische Quelle existiert', () => {
    for (const e of z.eintraege.values()) {
      if (e.art === 'dod') assert.equal(dodId(e.text ?? ''), e.name, `Text passt nicht zur ID ${e.name}`)
      if (e.beleg?.art === 'statisch') assert.ok(existsSync(join(INSTALLATION, ...(e.beleg.quelle ?? '').split('/'))), `Quelle fehlt: ${e.beleg.quelle}`)
    }
  })

  it('deckt die DoD des Projekt-Skeletts ab', () => {
    const r = leseDodPunkte(readFileSync(join(INSTALLATION, 'vorlagen', 'projekt-skelett', 'CLAUDE.md'), 'utf8'))
    assert.equal(r.ok, true)
    if (!r.ok) return
    for (const p of r.punkte) assert.ok(z.eintraege.has(zuordnungsSchluessel('dod', p.id)), `DoD des Skeletts fehlt in der Zuordnung: ${p.text}`)
  })

  it('ein unbekannter Agent im Projekt wird offen (Fixture)', () => {
    const wurzel = projekt({ 'CLAUDE.md': readFileSync(join(INSTALLATION, 'CLAUDE.md'), 'utf8'), '.claude/settings.json': '{}', '.claude/agents/unbekannter-agent.md': 'x' })
    const r = berechneHarnessAbgleich(leseHarnessInventar(wurzel), z, null)
    assert.deepEqual(
      r.eintraege.filter((e) => e.status === 'offen').map((e) => `${e.art}:${e.name}:${e.offen_grund}`),
      ['agent:unbekannter-agent:nicht_in_zuordnung']
    )
  })
})
