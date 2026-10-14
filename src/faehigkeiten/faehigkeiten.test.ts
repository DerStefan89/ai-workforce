/**
 * Datei: src/faehigkeiten/faehigkeiten.test.ts
 *
 * Zweck: Tests der Fähigkeiten je Projekt (F45 F-1): lokale Datei (fehlt/gültig/kaputt → ungültig), Aktivierung und
 * Inhaltsfreigabe (rein), strenge Frontmatter-Positivliste, Identität nach Inhalt (Katalog gleich/abweichend,
 * Projekt-Freigabe, Opt-in, Sperrgründe, Hindernisse), Start-Bausteine (Agent-Sperrliste, Skill-Freigabe, Ort-B-Nach-
 * bearbeitung, enabledPlugins), Abgleich mit der Momentaufnahme, Init-Gate agents/plugins, Join in der Laufakte und
 * „aus“ in baueEmpfehlung.
 *
 * Wird aufgerufen von: npm run test (node --test)
 *
 * Wichtig: Fixtures liegen in os.tmpdir(); kein Test liest oder schreibt ~/.ai-workforce.
 */

import assert from 'node:assert/strict'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'
import { ermittleFaehigkeitsAufrufe, pruefeInitZeile, validiereLaufakteDaten, verbindeFaehigkeitenMitAufrufen } from '../claude-code-gateway/index.ts'
import { raeumeVerzeichnis } from '../../scripts/_aufraeumen.ts'
import { erfasseClaudeOrdner } from '../execution-controller/index.ts'
import { baueEmpfehlung } from '../ressourcen/index.ts'
import type { AufgelosteRessource, Ressource } from '../ressourcen/types.ts'
import {
  aendereAktivierung,
  ermittleProjektFaehigkeiten,
  hashLokaleDatei,
  katalogFreigaben,
  ladeFaehigkeitenLokal,
  leseEingebautReferenz,
  leseFrontmatterStreng,
  projektEinstellungen,
  pruefeGegenMomentaufnahme,
  schreibeFaehigkeitenLokal,
  setzeInhaltsfreigabe,
  validiereFaehigkeitenLokal,
} from './index.ts'
import { baueFaehigkeitenStart } from './start.ts'
import type { ProjektEinstellungen } from './types.ts'

const REPO = join(import.meta.dirname, '..', '..')
const SKELETT = join(REPO, 'vorlagen', 'projekt-skelett', '.claude')
const WERKZEUGE = ['Read', 'Grep', 'Glob', 'Write', 'Edit', 'Bash']
const aufraeumen: string[] = []
after(() => {
  for (const pfad of aufraeumen) raeumeVerzeichnis(pfad)
})

const referenzErgebnis = leseEingebautReferenz()
assert.ok(referenzErgebnis.ok, 'Referenzliste lesbar')
const REFERENZ = referenzErgebnis.referenz

/** Katalog wie ressourcen.json: qa (agent) und ponytail (skill) FREIGEGEBEN, Pfade in der Installation. */
const KATALOG: Ressource[] = [
  { id: 'qa', typ: 'agent', capabilities: ['QA'], freigabe: 'FREIGEGEBEN', herkunft: { art: 'agent', pfad: '.claude/agents/qa.md' } },
  { id: 'code-reviewer', typ: 'agent', capabilities: ['REVIEW'], freigabe: 'FREIGEGEBEN', herkunft: { art: 'agent', pfad: '.claude/agents/code-reviewer.md' } },
  { id: 'ponytail', typ: 'skill', capabilities: ['MINIMAL'], freigabe: 'FREIGEGEBEN', herkunft: { art: 'skill', pfad: '.claude/skills/ponytail' } },
]

/** Projekt mit den Skelett-Agents qa/code-reviewer und den Skills ponytail/advisor-pass, Command lessons. */
function baueProjekt(): string {
  const wurzel = mkdtempSync(join(tmpdir(), 'f45-f1-projekt-'))
  aufraeumen.push(wurzel)
  mkdirSync(join(wurzel, '.claude', 'agents'), { recursive: true })
  for (const a of ['qa', 'code-reviewer']) copyFileSync(join(SKELETT, 'agents', `${a}.md`), join(wurzel, '.claude', 'agents', `${a}.md`))
  for (const s of ['ponytail', 'advisor-pass']) {
    mkdirSync(join(wurzel, '.claude', 'skills', s), { recursive: true })
    copyFileSync(join(SKELETT, 'skills', s, 'SKILL.md'), join(wurzel, '.claude', 'skills', s, 'SKILL.md'))
  }
  copyFileSync(join(SKELETT, 'skills', 'ponytail', 'LICENSE'), join(wurzel, '.claude', 'skills', 'ponytail', 'LICENSE'))
  mkdirSync(join(wurzel, '.claude', 'commands'), { recursive: true })
  copyFileSync(join(SKELETT, 'commands', 'lessons.md'), join(wurzel, '.claude', 'commands', 'lessons.md'))
  return wurzel
}

/** Einstellungen eines Projekts. */
function einst(an: string[] = [], inhalt_freigaben: Record<string, string> = {}): ProjektEinstellungen {
  return { an, aus: [], inhalt_freigaben }
}

/** ermittleProjektFaehigkeiten mit Katalog der Installation. */
function ermittle(wurzel: string, e: ProjektEinstellungen) {
  return ermittleProjektFaehigkeiten(wurzel, { katalog: katalogFreigaben(KATALOG, REPO), einstellungen: e, werkzeugNamen: WERKZEUGE, referenz: REFERENZ })
}

describe('lokale Datei faehigkeiten.lokal.json', () => {
  it('fehlt → Standard; gültig → gueltig mit Hash; kaputt (JSON/Schema) → ungueltig mit Grund', () => {
    const dir = mkdtempSync(join(tmpdir(), 'f45-f1-lokal-'))
    aufraeumen.push(dir)
    const pfad = join(dir, 'faehigkeiten.lokal.json')
    assert.equal(ladeFaehigkeitenLokal(null).zustand, 'fehlt')
    assert.equal(ladeFaehigkeitenLokal(pfad).zustand, 'fehlt')
    assert.equal(hashLokaleDatei(pfad), 'fehlt')
    const daten = setzeInhaltsfreigabe(aendereAktivierung(aendereAktivierung({ faehigkeiten_lokal_schema: 'v0', projekte: {} }, 'hb2', 'agent:qa', true), 'hb2', 'playwright-mcp', false), 'hb2', 'skill:x', 'a'.repeat(64))
    schreibeFaehigkeitenLokal(pfad, daten)
    const geladen = ladeFaehigkeitenLokal(pfad)
    assert.equal(geladen.zustand, 'gueltig')
    assert.deepEqual(projektEinstellungen(geladen.zustand === 'gueltig' ? geladen.daten : daten, 'hb2'), { an: ['agent:qa'], aus: ['playwright-mcp'], inhalt_freigaben: { 'skill:x': 'a'.repeat(64) } })
    assert.match(readFileSync(pfad, 'utf8'), /^\{\n {2}"faehigkeiten_lokal_schema": "v0"/)
    writeFileSync(pfad, '{ kaputt')
    const kaputt = ladeFaehigkeitenLokal(pfad)
    assert.equal(kaputt.zustand, 'ungueltig')
    assert.match(kaputt.zustand === 'ungueltig' ? kaputt.grund : '', /kein gültiges JSON/)
    writeFileSync(pfad, JSON.stringify({ faehigkeiten_lokal_schema: 'v0', projekte: { hb2: { aus: ['agent:qa'] } } }))
    assert.equal(ladeFaehigkeitenLokal(pfad).zustand, 'ungueltig', "aus nimmt nur Katalog-ids (Delta B4)")
  })

  it('Validator: an nur agent:/skill:, aus nur Katalog-ids, inhalt_freigaben sha256, keine Doppelten', () => {
    assert.deepEqual(validiereFaehigkeitenLokal({ faehigkeiten_lokal_schema: 'v0', projekte: { p: { an: ['agent:qa', 'skill:ponytail'], aus: ['playwright-mcp'], inhalt_freigaben: { 'agent:qa': 'b'.repeat(64) } } } }), [])
    const v = validiereFaehigkeitenLokal({ faehigkeiten_lokal_schema: 'v1', projekte: { p: { an: ['qa', 'agent:qa', 'agent:qa'], aus: ['Agent'], inhalt_freigaben: { 'ohne-praefix': 'x' }, fremd: 1 } } })
    for (const m of [/v0/, /an\[0\]/, /an' enthält Doppelte/, /aus\[0\]/, /Schlüssel 'ohne-praefix'/, /sha256/, /unbekanntes Feld 'projekte\.p\.fremd'/]) assert.ok(v.some((x) => m.test(x)), `${m}: ${v.join(' | ')}`)
  })

  it('aendereAktivierung: Projekt-Eintrag in an (Opt-in), Katalog-id in aus; leere Projekte fallen weg', () => {
    const leer = { faehigkeiten_lokal_schema: 'v0' as const, projekte: {} }
    const an = aendereAktivierung(leer, 'p', 'agent:qa', true)
    assert.deepEqual(an.projekte.p, { an: ['agent:qa'] })
    assert.deepEqual(aendereAktivierung(an, 'p', 'agent:qa', false).projekte, {})
    assert.deepEqual(aendereAktivierung(leer, 'p', 'playwright-mcp', false).projekte.p, { aus: ['playwright-mcp'] })
    assert.deepEqual(aendereAktivierung(aendereAktivierung(leer, 'p', 'playwright-mcp', false), 'p', 'playwright-mcp', true).projekte, {})
  })
})

describe('strenge Frontmatter (Delta B2)', () => {
  const AGENT = new Set(['name', 'description', 'tools', 'model', 'color'])
  it('Skelett-Agents und -Skills bestehen', () => {
    assert.ok(leseFrontmatterStreng(readFileSync(join(SKELETT, 'agents', 'qa.md'), 'utf8'), AGENT).ok)
    assert.ok(leseFrontmatterStreng(readFileSync(join(SKELETT, 'skills', 'ponytail', 'SKILL.md'), 'utf8'), new Set(['name', 'description', 'argument-hint', 'license'])).ok, 'ponytail: gefaltete description, argument-hint, license')
  })
  it('Rotfälle: fremdes Feld, doppelt, YAML-Liste, Schlüssel unter description, Begrenzer mit Leerzeichen, Anführungszeichen am Schlüssel', () => {
    const faelle: [string, RegExp][] = [
      ['---\nname: qa\ndescription: x\ntools: Read\npermissionMode: bypassPermissions\n---\n', /permissionMode' nicht erlaubt/],
      ['---\nname: qa\nname: anders\ndescription: x\ntools: Read\n---\n', /doppelt/],
      ['---\nname: qa\ndescription: x\ntools:\n  - Read\n---\n', /nicht schlicht/],
      ['---\nname: qa\ndescription: >\n  text\n  hooks: x\ntools: Read\n---\n', /nicht schlicht/],
      ['--- \nname: qa\n---\n', /beginnt nicht/],
      ['---\n"name": qa\ndescription: x\n---\n', /nicht schlicht/],
      ['---\nname: qa\ndescription: x\nmcpServers: {}\n---\n', /mcpServers' nicht erlaubt/],
    ]
    for (const [inhalt, muster] of faelle) {
      const e = leseFrontmatterStreng(inhalt, AGENT)
      assert.ok(!e.ok && muster.test(e.grund), `${JSON.stringify(inhalt)} → ${e.ok ? 'ok' : e.grund}`)
    }
  })
})

describe('Identität nach Inhalt (F-816) und Opt-in (E-F45-6)', () => {
  it('Hash gleich Katalog: freigegeben (katalog), ohne an nicht aktiv; mit an aktiv', () => {
    const w = baueProjekt()
    const aus = ermittle(w, einst()).eintraege.find((e) => e.schluessel === 'agent:qa')
    assert.equal(aus?.freigabe, 'katalog')
    assert.equal(aus?.aktiv, false)
    assert.match(aus?.grund ?? '', /nicht eingeschaltet/)
    const ein = ermittle(w, einst(['agent:qa', 'skill:ponytail']))
    assert.deepEqual(
      ein.eintraege.filter((e) => e.aktiv).map((e) => e.schluessel),
      ['agent:qa', 'skill:ponytail']
    )
    assert.equal(ein.hindernis, null)
    assert.equal(ein.eintraege.find((e) => e.schluessel === 'skill:advisor-pass')?.grund, 'keine Freigabe (weder Katalogeintrag noch Projekt-Freigabe nach Inhalt)')
  })

  it('Inhalt abweichend: gesperrt mit beiden Hash-Präfixen; Projekt-Freigabe nach Inhalt macht ihn freigegeben', () => {
    const w = baueProjekt()
    writeFileSync(join(w, '.claude', 'agents', 'qa.md'), `${readFileSync(join(w, '.claude', 'agents', 'qa.md'), 'utf8')}\nZusatz.\n`)
    const abw = ermittle(w, einst(['agent:qa'])).eintraege.find((e) => e.schluessel === 'agent:qa')
    assert.equal(abw?.aktiv, false)
    assert.match(abw?.grund ?? '', /^Inhalt weicht von der Freigabe ab \(Datei [0-9a-f]{12}…, Katalog [0-9a-f]{12}…\)$/)
    const proj = ermittle(w, einst(['agent:qa'], { 'agent:qa': abw?.hash ?? '' })).eintraege.find((e) => e.schluessel === 'agent:qa')
    assert.equal(proj?.freigabe, 'projekt')
    assert.equal(proj?.aktiv, true)
  })

  it('Sperrgründe: Frontmatter-Name ≠ Datei, Unterordner, eingebauter Name, unerlaubtes Werkzeug, fremdes Feld', () => {
    const w = baueProjekt()
    const agents = join(w, '.claude', 'agents')
    writeFileSync(join(agents, 'anders.md'), '---\nname: qa2\ndescription: x\ntools: Read\n---\n')
    mkdirSync(join(agents, 'sub'))
    writeFileSync(join(agents, 'sub', 'tief.md'), '---\nname: tief\ndescription: x\ntools: Read\n---\n')
    writeFileSync(join(agents, 'Explore.md'), '---\nname: Explore\ndescription: x\ntools: Read\n---\n')
    writeFileSync(join(agents, 'mitagent.md'), '---\nname: mitagent\ndescription: x\ntools: Read, Agent\n---\n')
    writeFileSync(join(agents, 'bypass.md'), '---\nname: bypass\ndescription: x\ntools: Read\npermissionMode: bypassPermissions\n---\n')
    const fp = { 'agent:anders': 'x', 'agent:tief': 'x', 'agent:Explore': 'x', 'agent:mitagent': 'x', 'agent:bypass': 'x' }
    const e = ermittle(w, einst(Object.keys(fp)))
    const grund = (s: string) => e.eintraege.find((x) => x.schluessel === s)?.grund ?? ''
    assert.match(grund('agent:anders'), /Frontmatter-name 'qa2' ≠ Dateiname 'anders'/)
    assert.match(grund('agent:tief'), /Unterordner/)
    assert.match(grund('agent:Explore'), /eingebauten Agents/)
    assert.match(grund('agent:mitagent'), /außerhalb des Werkzeugsatzes: Agent/)
    assert.match(grund('agent:bypass'), /permissionMode' nicht erlaubt/)
    assert.equal(e.eintraege.filter((x) => x.aktiv).length, 0)
    assert.ok(e.agentNamen.includes('qa2') && e.agentNamen.includes('tief'), 'alle Namen für die Sperrliste')
  })

  it('Code-Review 1: Name aus verworfenem Frontmatter zählt für Eindeutigkeit und Sperrliste (permissionMode, Anführungszeichen)', () => {
    for (const inhalt of ['---\nname: qa\ndescription: x\ntools: Read\npermissionMode: bypassPermissions\n---\n', '---\nname: "qa"\ndescription: x\ntools: Read\n---\n']) {
      const w = baueProjekt()
      writeFileSync(join(w, '.claude', 'agents', 'alias.md'), inhalt)
      const e = ermittle(w, einst(['agent:qa']))
      assert.match(e.hindernis ?? '', /Agent-Name 'qa' mehrdeutig \(agents\/alias\.md, agents\/qa\.md\)/, inhalt)
      assert.ok(e.agentNamen.includes('alias') && e.agentNamen.includes('qa'))
    }
    // Delta-Nachpass 6: eingerückter Schlüssel, Kommentar, Schlüssel in Anführungszeichen → Name wird erkannt.
    for (const inhalt of ['---\n  name: qa\ndescription: x\n---\n', '---\nname: qa # Kommentar\ndescription: x\n---\n', '---\n"name": qa\ndescription: x\n---\n']) {
      const w = baueProjekt()
      writeFileSync(join(w, '.claude', 'agents', 'alias.md'), inhalt)
      assert.match(ermittle(w, einst(['agent:qa'])).hindernis ?? '', /Agent-Name 'qa' mehrdeutig/, inhalt)
    }
    // Delta-Nachpass 1: Name in der Folgezeile → nicht sperrbar → kein Start.
    const wf = baueProjekt()
    writeFileSync(join(wf, '.claude', 'agents', 'alias.md'), '---\nname:\n  qa\ndescription: x\n---\n')
    assert.match(ermittle(wf, einst(['agent:qa'])).hindernis ?? '', /Agent-Name nicht sperrbar: agents\/alias\.md \('\(name ohne Wert/)
    const w = baueProjekt()
    writeFileSync(join(w, '.claude', 'agents', 'krumm.md'), "---\nname: 'mit leer'\ndescription: x\ntools: Read\n---\n")
    assert.match(ermittle(w, einst(['agent:qa'])).hindernis ?? '', /Agent-Name nicht sperrbar: agents\/krumm\.md \('mit leer'\)/, 'Delta B3')
    const w2 = baueProjekt()
    mkdirSync(join(w2, '.claude', 'skills', 'alias'))
    writeFileSync(join(w2, '.claude', 'skills', 'alias', 'SKILL.md'), '---\nname: ponytail\ndescription: x\nallowed-tools: Bash\n---\n')
    assert.match(ermittle(w2, einst(['skill:ponytail'])).hindernis ?? '', /Skill-Name 'ponytail' mehrdeutig/)
  })

  it('model nur inherit (E-185); eingeschaltet, aber nicht vorhanden → sichtbar nicht aktiv (QA 1); .claude/agents als Verknüpfung → Hindernis', () => {
    const w = baueProjekt()
    writeFileSync(join(w, '.claude', 'agents', 'modell.md'), '---\nname: modell\ndescription: x\ntools: Read\nmodel: opus\n---\n')
    const e = ermittle(w, einst(['agent:modell', 'agent:fehlt']))
    assert.match(e.eintraege.find((x) => x.schluessel === 'agent:modell')?.grund ?? '', /model nur 'inherit'/)
    const fehlt = e.eintraege.find((x) => x.schluessel === 'agent:fehlt')
    assert.deepEqual([fehlt?.eingeschaltet, fehlt?.aktiv, fehlt?.grund], [true, false, 'eingeschaltet, aber im Ordner nicht vorhanden'])
    const w2 = baueProjekt()
    const ziel = mkdtempSync(join(tmpdir(), 'f45-f1-agents-ziel-'))
    aufraeumen.push(ziel)
    copyFileSync(join(SKELETT, 'agents', 'qa.md'), join(ziel, 'qa.md'))
    raeumeVerzeichnis(join(w2, '.claude', 'agents'))
    symlinkSync(ziel, join(w2, '.claude', 'agents'), 'junction')
    assert.match(ermittle(w2, einst(['skill:ponytail'])).hindernis ?? '', /Verknüpfung unter \.claude\/agents\|skills: agents/)
  })

  it('Hindernisse nur mit aktivem Eintrag: mehrdeutiger Agent-Name, Skill = Command, Verknüpfung', () => {
    const w = baueProjekt()
    writeFileSync(join(w, '.claude', 'agents', 'zz.md'), '---\nname: qa\ndescription: x\ntools: Read\n---\n')
    assert.equal(ermittle(w, einst()).hindernis, null, 'ohne aktiven Eintrag kein Hindernis')
    assert.match(ermittle(w, einst(['agent:qa'])).hindernis ?? '', /Agent-Name 'qa' mehrdeutig \(agents\/qa\.md, agents\/zz\.md\)/)
    const w2 = baueProjekt()
    writeFileSync(join(w2, '.claude', 'commands', 'ponytail.md'), '# p\n')
    assert.match(ermittle(w2, einst(['skill:ponytail'])).hindernis ?? '', /Skill-Name 'ponytail' mehrdeutig/)
    const w3 = baueProjekt()
    symlinkSync(join(w3, '.claude', 'skills', 'advisor-pass'), join(w3, '.claude', 'skills', 'verweis'), 'junction')
    assert.match(ermittle(w3, einst(['agent:qa'])).hindernis ?? '', /Verknüpfung unter \.claude\/agents\|skills: skills\/verweis/)
  })

  it('katalogFreigaben: nur exakter herkunft.pfad (Advisor A14), nur FREIGEGEBEN', () => {
    const k = katalogFreigaben(
      [...KATALOG, { id: 'x', typ: 'agent', capabilities: ['X'], freigabe: 'FREIGEGEBEN', herkunft: { art: 'agent', pfad: '.claude/agents/../agents/qa.md' } }, { id: 'y', typ: 'agent', capabilities: ['Y'], freigabe: 'OFFEN', herkunft: { art: 'agent', pfad: '.claude/agents/scout.md' } }],
      REPO
    )
    assert.deepEqual([...k.keys()].sort(), ['agent:code-reviewer', 'agent:qa', 'skill:ponytail'])
  })
})

describe('Start-Bausteine (baueFaehigkeitenStart)', () => {
  it('aktiver Agent: Agent(qa) erlaubt, eingebaute und übrige Projekt-Agents gesperrt; Skill aktiv: nicht gesperrt; Plugins aus', () => {
    const w = baueProjekt()
    const e = ermittle(w, einst(['agent:qa', 'skill:ponytail']))
    const s = baueFaehigkeitenStart({ projekt: e.eintraege, agentNamen: e.agentNamen, projektWurzel: w, referenz: REFERENZ })
    assert.ok(s.ok, s.ok ? '' : s.grund)
    if (!s.ok) return
    assert.deepEqual(s.start.werkzeugZusatz, ['Agent(qa)', 'Skill(ponytail)'])
    for (const n of ['claude', 'Explore', 'general-purpose', 'Plan', 'statusline-setup', 'code-reviewer']) assert.ok(s.start.disallowedTools.includes(`Agent(${n})`), n)
    assert.ok(!s.start.disallowedTools.includes('Agent(qa)'))
    assert.ok(!s.start.disallowedTools.includes('Skill(ponytail)') && s.start.disallowedTools.includes('Skill(advisor-pass)') && s.start.disallowedTools.includes('Skill(lessons)'))
    assert.ok(s.start.disallowedTools.includes('Write(**/.claude/**)'))
    const settings = JSON.parse(s.start.settings)
    assert.equal(settings.disableBundledSkills, true)
    assert.equal(settings.skillOverrides.ponytail, undefined)
    assert.equal(settings.skillOverrides['advisor-pass'], 'off')
    assert.deepEqual(settings.enabledPlugins, Object.fromEntries(REFERENZ.plugins.map((p) => [p, false])))
    assert.deepEqual(s.start.initGate.agents, { erlaubt: ['qa'], gesperrt: [...REFERENZ.agents, 'code-reviewer'].sort() })
    assert.deepEqual(s.start.initGate.skills, ['ponytail'])
    assert.match(s.start.instruktion ?? '', /Subagenten qa — nur im Vordergrund aufrufen \(Agent-Werkzeug mit run_in_background: false\)/)
  })

  it('nur Skill aktiv: kein Agent im Werkzeugsatz, Gate ohne agents; Ort-B wird nur nachbearbeitet', () => {
    const w = baueProjekt()
    const e = ermittle(w, einst(['skill:ponytail']))
    const s = baueFaehigkeitenStart({ projekt: e.eintraege, agentNamen: e.agentNamen, projektWurzel: w, referenz: REFERENZ })
    assert.ok(s.ok && s.start.initGate.agents === undefined && !s.start.werkzeugZusatz.some((x) => x.startsWith('Agent')))
    const ortB = { addDirs: ['C:\\cap\\x'], disallowedTools: ['Write(C:/cap/x/**)', 'Skill(design)', 'Skill(ponytail)'], settings: JSON.stringify({ disableBundledSkills: true, skillOverrides: { design: 'off', ponytail: 'off' } }), skillNamen: ['x'], projektSkillNamen: ['ponytail'], gesperrteNamen: ['design', 'ponytail'] }
    const mit = baueFaehigkeitenStart({ projekt: e.eintraege, agentNamen: e.agentNamen, projektWurzel: w, referenz: REFERENZ, ortB })
    assert.ok(mit.ok)
    if (!mit.ok) return
    assert.deepEqual(mit.start.disallowedTools, ['Write(C:/cap/x/**)', 'Skill(design)'])
    assert.deepEqual(JSON.parse(mit.start.settings), { disableBundledSkills: true, skillOverrides: { design: 'off' }, enabledPlugins: Object.fromEntries(REFERENZ.plugins.map((p) => [p, false])) })
    assert.deepEqual(mit.start.initGate, { skills: ['x', 'ponytail'], gesperrt: ['design'], pflichtSkills: ['ponytail'] })
    assert.deepEqual(mit.start.addDirs, ['C:\\cap\\x'])
  })

  it('verschachteltes .claude im Arbeitsordner → kein Start (Vorstart-Scan auch ohne Ort-B)', () => {
    const w = baueProjekt()
    mkdirSync(join(w, 'paket', '.claude', 'agents'), { recursive: true })
    const e = ermittle(w, einst(['agent:qa']))
    const s = baueFaehigkeitenStart({ projekt: e.eintraege, agentNamen: e.agentNamen, projektWurzel: w, referenz: REFERENZ })
    assert.ok(!s.ok && /verschachtelte \.claude-Ordner.*paket\/\.claude\/agents/.test(s.grund))
  })
})

describe('Abgleich vor dem Spawn (Advisor A6)', () => {
  it('gleich → null; Agent oder Skill nach der Prüfung geändert → Grund', () => {
    const w = baueProjekt()
    const e = ermittle(w, einst(['agent:qa', 'skill:ponytail'])).eintraege.map((x) => ({ quelle: 'projekt', aktiv: x.aktiv, typ: x.typ, name: x.name, pfad: x.pfad, hash: x.hash ?? undefined }))
    assert.equal(pruefeGegenMomentaufnahme(e, erfasseClaudeOrdner(w)), null)
    writeFileSync(join(w, '.claude', 'skills', 'ponytail', 'neu.md'), 'x')
    assert.match(pruefeGegenMomentaufnahme(e, erfasseClaudeOrdner(w)) ?? '', /verändert: skill:ponytail/)
    writeFileSync(join(w, '.claude', 'agents', 'qa.md'), 'anders')
    assert.match(pruefeGegenMomentaufnahme(e, erfasseClaudeOrdner(w)) ?? '', /agent:qa, skill:ponytail/)
    assert.match(pruefeGegenMomentaufnahme(e, null) ?? '', /nicht lesbar/)
    assert.equal(pruefeGegenMomentaufnahme([], null), null, 'ohne aktive Projekt-Einträge keine Prüfung')
  })
})

describe('Init-Gate agents/plugins (F-910 Teil Init-Gate, Fallback Spike F-1)', () => {
  const init = { type: 'system', subtype: 'init', tools: ['Task', 'Bash', 'Read'], skills: [], slash_commands: ['clear'], mcp_servers: [], plugins: [], agents: ['claude', 'Explore', 'general-purpose', 'Plan', 'qa', 'statusline-setup', 'code-reviewer'] }
  const erwartet = { skills: [], mcpServer: [], agents: { erlaubt: ['qa'], gesperrt: ['claude', 'code-reviewer', 'Explore', 'general-purpose', 'Plan', 'statusline-setup'] } }
  it('grün: Task in tools, init.agents ⊆ erlaubt ∪ gesperrt, plugins leer', () => {
    assert.equal(pruefeInitZeile(init, erwartet), null)
  })
  it('rot (QA 4): eingeschalteter Agent bzw. Skill nicht geladen', () => {
    assert.match(pruefeInitZeile({ ...init, agents: init.agents.filter((a) => a !== 'qa') }, erwartet) ?? '', /init\.agents ohne eingeschaltete Agents: qa/)
    assert.match(pruefeInitZeile(init, { ...erwartet, skills: ['ponytail'], pflichtSkills: ['ponytail'] }) ?? '', /init\.skills ohne eingeschaltete Skills: ponytail/)
    assert.equal(pruefeInitZeile({ ...init, skills: ['ponytail'], slash_commands: ['clear', 'ponytail'] }, { ...erwartet, skills: ['ponytail'], pflichtSkills: ['ponytail'] }), null)
  })
  it('rot: unbekannter Agent, fehlendes agents, Plugin geladen, Task ohne agents-Erwartung', () => {
    assert.match(pruefeInitZeile({ ...init, agents: [...init.agents, 'neu-eingebaut'] }, erwartet) ?? '', /init\.agents enthält unbekannte Agents: neu-eingebaut/)
    const { agents: _a, ...ohne } = init
    assert.match(pruefeInitZeile(ohne, erwartet) ?? '', /init\.agents fehlt/)
    assert.match(pruefeInitZeile({ ...init, plugins: [{ name: 'p', source: 'p@builtin' }] }, erwartet) ?? '', /init\.plugins nicht leer: p@builtin/)
    assert.match(pruefeInitZeile(init, { skills: [], mcpServer: [] }) ?? '', /init\.tools enthält Task/)
  })
})

describe('Laufakte faehigkeiten_im_lauf (Join, Advisor A9)', () => {
  it('aufrufe/fehlgeschlagen je Eintrag aus tool_use/tool_result, fremde Aufrufe getrennt; Validator', () => {
    const zeile = (o: unknown) => JSON.stringify(o)
    const zeilen = [
      zeile({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 't1', name: 'Agent', input: { subagent_type: 'qa', run_in_background: false } }] } }),
      zeile({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't1', content: 'OK' }] } }),
      zeile({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 't2', name: 'Task', input: { subagent_type: 'general-purpose' } }] } }),
      zeile({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't2', is_error: true, content: "Agent type 'general-purpose' has been denied" }] } }),
      zeile({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 't3', name: 'mcp__playwright-mcp__browser_navigate', input: {} }] } }),
    ]
    const faehigkeiten = [
      { id: 'agent:qa', name: 'qa', typ: 'agent' as const, quelle: 'projekt' as const, hash: 'a'.repeat(64), pfad: 'agents/qa.md', aktiv: true },
      { id: 'skill:ponytail', name: 'ponytail', typ: 'skill' as const, quelle: 'projekt' as const, aktiv: false, grund: 'nicht eingeschaltet' },
      { id: 'playwright-mcp', name: 'Playwright', typ: 'mcp' as const, quelle: 'katalog' as const, aktiv: true },
    ]
    const feld = verbindeFaehigkeitenMitAufrufen(faehigkeiten, ermittleFaehigkeitsAufrufe(zeilen), true)
    assert.deepEqual(
      feld.eintraege.map((e) => [e.id, e.aufrufe, e.fehlgeschlagen]),
      [
        ['agent:qa', 1, 0],
        ['skill:ponytail', 0, 0],
        ['playwright-mcp', 1, 0],
      ]
    )
    assert.deepEqual(feld.fremde_aufrufe, [{ art: 'agent', name: 'general-purpose', fehler: true }])
    assert.deepEqual(verbindeFaehigkeitenMitAufrufen(faehigkeiten, [], false).eintraege[0].aufrufe, null)
    const basis = { laufakte_schema: 'v0', lauf_id: 'l', werkzeug_version_deklariert: 'v', berechtigungskontext: 'k', arbeitsverzeichnis_pfad: 'p', modell_beobachtet: null, beobachtungsbasis_vollstaendig: true, rohstrom_referenz: { pfad: 'r', inhalts_hash: 'a'.repeat(64) }, erstellt_am: 'x' }
    assert.deepEqual(validiereLaufakteDaten({ ...basis, faehigkeiten_im_lauf: feld }), [])
    assert.ok(validiereLaufakteDaten({ ...basis, faehigkeiten_im_lauf: { eintraege: [{ id: 'x' }], fremde_aufrufe: [] } }).length > 0)
  })
})

describe('baueEmpfehlung mit aus (E-F45-6)', () => {
  const mcp = { id: 'pw', typ: 'extern', name: 'PW', beschreibung: 'b', unterart: 'mcp', wirkung: 'lokal', capabilities: ['BROWSER'], freigabe: 'FREIGEGEBEN', herkunft: { art: 'extern', url: 'https://x' }, installation: { version: '1', mcp_server: { command: 'node', args: [] }, werkzeuge: ['mcp__pw__a'] }, anwendbar_wenn: { task_typen_any: ['bugfix'] }, verfuegbar: true, grund: 'ok' } as unknown as AufgelosteRessource
  it('ohne aus bitgleich (kein deaktiviert-Feld); mit aus: nicht in „Wird genutzt“, sondern in deaktiviert', () => {
    const ohne = baueEmpfehlung([mcp], { task_typen: ['bugfix'] }, { projektUrlVorhanden: true })
    assert.equal(ohne.wirdGenutzt.length, 1)
    assert.ok(!('deaktiviert' in ohne))
    const mit = baueEmpfehlung([mcp], { task_typen: ['bugfix'] }, { projektUrlVorhanden: true, aus: ['pw'] })
    assert.equal(mit.wirdGenutzt.length, 0)
    assert.equal(mit.passtNichtImLauf.length, 0)
    assert.deepEqual(mit.deaktiviert?.map((e) => [e.id, e.grund]), [['pw', 'im Projekt deaktiviert']])
  })
})

describe('F45 F-3b-2: Start-Bausteine mit Plugin-Lauf-Kopien (baueFaehigkeitenStart, plugins)', () => {
  it('nur Plugins (kein Projekt-Eintrag): Skill(<name>:<s>) erlaubt, enabledPlugins <name>@inline true + eingebaute false, Gate mit Präfix und Soll, Instruktion', () => {
    const w = baueProjekt()
    const e = ermittle(w, einst())
    const s = baueFaehigkeitenStart({ projekt: e.eintraege, agentNamen: e.agentNamen, projektWurzel: w, referenz: REFERENZ, plugins: [{ name: 'superpowers', skills: ['systematic-debugging'], agents: [] }] })
    assert.ok(s.ok, s.ok ? '' : s.grund)
    if (!s.ok) return
    assert.deepEqual(s.start.werkzeugZusatz, ['Skill(superpowers:systematic-debugging)'])
    assert.deepEqual(JSON.parse(s.start.settings).enabledPlugins, { ...Object.fromEntries(REFERENZ.plugins.map((p) => [p, false])), 'superpowers@inline': true })
    assert.deepEqual(s.start.initGate.plugins, ['superpowers@inline'])
    assert.ok(s.start.initGate.skills.includes('superpowers:systematic-debugging'))
    assert.ok((s.start.initGate.pflichtSkills ?? []).includes('superpowers:systematic-debugging'))
    assert.equal(s.start.initGate.agents, undefined, 'ohne Plugin-Agent kein Agent-Werkzeug')
    assert.match(s.start.instruktion ?? '', /Plugin-Fähigkeiten in diesem Lauf \(von Stefan der Ausführung zugeordnet\): Skills superpowers:systematic-debugging \(Skill-Werkzeug\)/)
  })

  it('Plugin-Agent: Agent(<name>:<a>) erlaubt, eingebaute Agents gesperrt, agents.erlaubt mit Präfix; Ort-B-Zweig behält Plugins', () => {
    const w = baueProjekt()
    const e = ermittle(w, einst())
    const s = baueFaehigkeitenStart({ projekt: e.eintraege, agentNamen: e.agentNamen, projektWurzel: w, referenz: REFERENZ, plugins: [{ name: 'kraft', skills: [], agents: ['pruefer'] }] })
    assert.ok(s.ok, s.ok ? '' : s.grund)
    if (!s.ok) return
    assert.ok(s.start.werkzeugZusatz.includes('Agent(kraft:pruefer)'))
    for (const n of REFERENZ.agents) assert.ok(s.start.disallowedTools.includes(`Agent(${n})`), n)
    assert.deepEqual(s.start.initGate.agents?.erlaubt, ['kraft:pruefer'])
    const ortB = { addDirs: ['C:/cap/x'], disallowedTools: ['Skill(design)'], settings: JSON.stringify({ disableBundledSkills: true, skillOverrides: { design: 'off' } }), skillNamen: ['x'], projektSkillNamen: [], gesperrteNamen: ['design'] }
    const mit = baueFaehigkeitenStart({ projekt: e.eintraege, agentNamen: e.agentNamen, projektWurzel: w, referenz: REFERENZ, ortB, plugins: [{ name: 'superpowers', skills: ['systematic-debugging'], agents: [] }] })
    assert.ok(mit.ok)
    if (!mit.ok) return
    assert.equal(JSON.parse(mit.start.settings).enabledPlugins['superpowers@inline'], true)
    assert.deepEqual(mit.start.initGate.skills, ['x', 'superpowers:systematic-debugging'])
  })

  it('ohne plugins bzw. mit leerer Liste: Ergebnis gleich wie bisher (kein plugins-Feld im Gate)', () => {
    const w = baueProjekt()
    const e = ermittle(w, einst(['skill:ponytail']))
    const ohne = baueFaehigkeitenStart({ projekt: e.eintraege, agentNamen: e.agentNamen, projektWurzel: w, referenz: REFERENZ })
    const leer = baueFaehigkeitenStart({ projekt: e.eintraege, agentNamen: e.agentNamen, projektWurzel: w, referenz: REFERENZ, plugins: [] })
    assert.deepEqual(leer, ohne)
    assert.ok(ohne.ok && ohne.start.initGate.plugins === undefined)
  })
})
