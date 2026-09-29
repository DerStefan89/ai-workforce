/**
 * Datei: src/ressourcen/ressourcen.test.ts
 *
 * Zweck: node:test-Fälle für src/ressourcen/index.ts (F19 WS-2). Vier
 * Abschnitte: validiereRessourcenDaten (Rot-Abdeckung gegen
 * schemas/ressourcen.schema.json und R1/R2/R3, Muster router.test.ts),
 * loeseRessourcenAuf (eigene Test-Fixtures unter os.tmpdir(), kein
 * Schreiben ins echte Repo), ressourcenFuerCapability und pruefeAbdeckung
 * (reine Filter/Lookup-Funktionen, keine Fixtures nötig).
 */

import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { baueEmpfehlung, baueEmpfehlungsZeile, baueMcpAufruf, fehltFuerEinsatz, loeseRessourcenAuf, pruefeAbdeckung, pruefeAnwendbarkeit, ressourcenFuerCapability, validiereRessourcenDaten } from './index.ts'
import type { AufgelosteRessource, Ressource } from './types.ts'
import { raeumeVerzeichnis } from '../../scripts/_aufraeumen.ts'

// ─── validiereRessourcenDaten ───────────────────────────────────────────────

function gueltigeDaten(): Record<string, unknown> {
  return {
    ressourcen_schema: 'v0',
    ressourcen: [
      {
        id: 'claude-code',
        typ: 'worker',
        capabilities: ['CODE_WRITE', 'REPO_READ'],
        freigabe: 'FREIGEGEBEN',
        herkunft: { art: 'startvorlage', worker: 'claude-code' },
      },
      {
        id: 'advisor-pass',
        typ: 'skill',
        capabilities: ['PLAN_REVIEW'],
        freigabe: 'FREIGEGEBEN',
        herkunft: { art: 'skill', pfad: '.claude/skills/advisor-pass' },
      },
      {
        id: 'playwright-mcp',
        typ: 'extern',
        name: 'Playwright MCP',
        beschreibung: 'Browser-Automatisierung.',
        unterart: 'mcp',
        wirkung: 'lokal',
        capabilities: ['BROWSER_AUTOMATION'],
        freigabe: 'OFFEN',
        herkunft: { art: 'extern', url: 'https://github.com/microsoft/playwright-mcp' },
      },
    ],
  }
}

type Eintrag = Record<string, unknown>

/** Hängt einen Eintrag an gueltigeDaten() an und liefert die Verstöße. */
function verstoesseMit(eintrag: Eintrag): string[] {
  const daten = gueltigeDaten()
  ;(daten.ressourcen as Eintrag[]).push(eintrag)
  return validiereRessourcenDaten(daten)
}

function agentEintrag(overrides: Eintrag = {}): Eintrag {
  return { id: 'qa', typ: 'agent', capabilities: ['TEST_DESIGN'], freigabe: 'FREIGEGEBEN', herkunft: { art: 'agent', pfad: '.claude/agents/qa.md' }, ...overrides }
}

function externSkill(overrides: Eintrag = {}): Eintrag {
  return {
    id: 'taste-skill',
    typ: 'extern',
    name: 'taste-skill',
    beschreibung: 'Design-Tokens.',
    unterart: 'skill',
    capabilities: ['UI_UX_DESIGN'],
    freigabe: 'OFFEN',
    herkunft: { art: 'extern', url: 'https://github.com/x/taste-skill' },
    ...overrides,
  }
}

function externMcp(overrides: Eintrag = {}): Eintrag {
  return {
    id: 'obsidian-mcp',
    typ: 'extern',
    name: 'Obsidian MCP',
    beschreibung: 'Notizen.',
    unterart: 'mcp',
    wirkung: 'lokal',
    capabilities: ['NOTES_ACCESS'],
    freigabe: 'OFFEN',
    herkunft: { art: 'extern', url: 'https://github.com/x/mcp-obsidian' },
    ...overrides,
  }
}

const MCP_INSTALLATION = { version: '1.0.0', mcp_server: { command: 'npx', args: ['-y', 'mcp-obsidian'] }, werkzeuge: ['mcp__obsidian-mcp__search'] }

function hat(verstoesse: string[], teil: string): boolean {
  return verstoesse.some((v) => v.includes(teil))
}

test('validiereRessourcenDaten: gültige Daten liefern keine Verstöße', () => {
  assert.deepStrictEqual(validiereRessourcenDaten(gueltigeDaten()), [])
})

test('validiereRessourcenDaten: Wurzel muss ein Objekt sein', () => {
  assert.deepStrictEqual(validiereRessourcenDaten(null), ['Wurzel ist kein Objekt'])
  assert.deepStrictEqual(validiereRessourcenDaten([1, 2]), ['Wurzel ist kein Objekt'])
})

test('validiereRessourcenDaten: R1 — typ worker/skill dürfen name/beschreibung nicht tragen', () => {
  const daten = gueltigeDaten()
  ;(daten.ressourcen as Record<string, unknown>[])[0].name = 'Sollte nicht hier stehen'
  const verstoesse = validiereRessourcenDaten(daten)
  assert.ok(verstoesse.some((v) => v.includes('(R1)')), JSON.stringify(verstoesse))
})

test('validiereRessourcenDaten: R1 — typ extern verlangt name UND beschreibung', () => {
  const daten = gueltigeDaten()
  const extern = (daten.ressourcen as Record<string, unknown>[])[2]
  delete extern.name
  const verstoesse = validiereRessourcenDaten(daten)
  assert.ok(verstoesse.some((v) => v.includes("'ressourcen[2].name' ist bei typ 'extern' Pflicht (R1)")), JSON.stringify(verstoesse))
})

test('validiereRessourcenDaten: R2 (E-M5-5) — typ extern darf FREIGEGEBEN nicht ohne installation tragen', () => {
  const daten = gueltigeDaten()
  ;(daten.ressourcen as Record<string, unknown>[])[2].freigabe = 'FREIGEGEBEN'
  const verstoesse = validiereRessourcenDaten(daten)
  assert.ok(verstoesse.some((v) => v.includes('(R2, E-M5-5)')), JSON.stringify(verstoesse))
})

test('validiereRessourcenDaten: R3 — herkunft.art muss zu typ passen', () => {
  const daten = gueltigeDaten()
  ;(daten.ressourcen as Record<string, unknown>[])[0].herkunft = { art: 'skill', pfad: '.claude/skills/irgendwas' }
  const verstoesse = validiereRessourcenDaten(daten)
  assert.ok(verstoesse.some((v) => v.includes('(R3)')), JSON.stringify(verstoesse))
})

test('validiereRessourcenDaten: doppelte id wird gemeldet', () => {
  const daten = gueltigeDaten()
  ;(daten.ressourcen as Record<string, unknown>[])[1].id = 'claude-code'
  const verstoesse = validiereRessourcenDaten(daten)
  assert.ok(verstoesse.some((v) => v.includes('ist nicht eindeutig')), JSON.stringify(verstoesse))
})

test('validiereRessourcenDaten: unbekanntes Feld auf Wurzelebene wird gemeldet', () => {
  const verstoesse = validiereRessourcenDaten({ ...gueltigeDaten(), zusatz: 'x' })
  assert.ok(verstoesse.some((v) => v.includes("unbekanntes Feld 'zusatz'")))
})

// ─── F36 WS-1: agent, unterart/wirkung, installation, R2 neu, anwendbar_wenn ─

test('validiereRessourcenDaten: typ agent mit herkunft agent ist gültig', () => {
  assert.deepStrictEqual(verstoesseMit(agentEintrag()), [])
})

test('validiereRessourcenDaten: R3 — typ agent verlangt herkunft.art agent', () => {
  assert.ok(hat(verstoesseMit(agentEintrag({ herkunft: { art: 'skill', pfad: '.claude/skills/qa' } })), '(R3)'))
  assert.ok(hat(verstoesseMit(externSkill({ herkunft: { art: 'agent', pfad: '.claude/agents/qa.md' } })), '(R3)'))
})

test('validiereRessourcenDaten: herkunft agent — pfad muss .claude/agents/<name>.md sein, keine Zusatzfelder', () => {
  assert.ok(hat(verstoesseMit(agentEintrag({ herkunft: { art: 'agent', pfad: 'agents/qa.txt' } })), "'ressourcen[3].herkunft.pfad'"))
  assert.ok(hat(verstoesseMit(agentEintrag({ herkunft: { art: 'agent', pfad: '.claude/agents/qa.md', x: 1 } })), "unbekanntes Feld 'ressourcen[3].herkunft.x'"))
})

test('validiereRessourcenDaten: R1 — typ agent darf name/beschreibung nicht tragen', () => {
  assert.ok(hat(verstoesseMit(agentEintrag({ name: 'qa' })), "'ressourcen[3].name' darf bei typ 'agent' nicht gesetzt sein (R1)"))
  assert.ok(hat(verstoesseMit(agentEintrag({ beschreibung: 'x' })), "'ressourcen[3].beschreibung' darf bei typ 'agent' nicht gesetzt sein (R1)"))
})

test('validiereRessourcenDaten: extern — unterart ist Pflicht und aus skill|agent|mcp', () => {
  const ohne = externSkill()
  delete ohne.unterart
  assert.ok(hat(verstoesseMit(ohne), "'ressourcen[3].unterart' ist bei typ 'extern' Pflicht"))
  assert.ok(hat(verstoesseMit(externSkill({ unterart: 'plugin' })), "'ressourcen[3].unterart' muss einer von skill, agent, mcp sein"))
  assert.deepStrictEqual(verstoesseMit(externSkill({ unterart: 'agent' })), [])
})

test('validiereRessourcenDaten: unterart/wirkung nur bei typ extern zulässig', () => {
  assert.ok(hat(verstoesseMit(agentEintrag({ unterart: 'agent' })), "'ressourcen[3].unterart' ist nur bei typ 'extern' zulässig"))
  assert.ok(hat(verstoesseMit(agentEintrag({ wirkung: 'lokal' })), "'ressourcen[3].wirkung' ist nur bei typ 'extern' mit unterart 'mcp' zulässig"))
})

test('validiereRessourcenDaten: wirkung ist bei unterart mcp Pflicht, sonst unzulässig', () => {
  const ohne = externMcp()
  delete ohne.wirkung
  assert.ok(hat(verstoesseMit(ohne), "'ressourcen[3].wirkung' ist bei unterart 'mcp' Pflicht"))
  assert.ok(hat(verstoesseMit(externMcp({ wirkung: 'remote' })), "'ressourcen[3].wirkung' muss einer von lokal, extern_lesend, extern_schreibend sein"))
  assert.ok(hat(verstoesseMit(externSkill({ wirkung: 'lokal' })), "'ressourcen[3].wirkung' ist nur bei typ 'extern' mit unterart 'mcp' zulässig"))
  assert.deepStrictEqual(verstoesseMit(externMcp({ wirkung: 'extern_schreibend' })), [])
})

test('validiereRessourcenDaten: installation skill|agent — pfad (absolut oder ~) und version Pflicht', () => {
  assert.deepStrictEqual(verstoesseMit(externSkill({ installation: { pfad: '~/.claude/skills/taste-skill', version: '1.2.0' } })), [])
  assert.deepStrictEqual(verstoesseMit(externSkill({ installation: { pfad: 'C:\\Users\\x\\.claude\\skills\\taste', version: '1.2.0' } })), [])
  assert.deepStrictEqual(verstoesseMit(externSkill({ installation: { pfad: '/opt/skills/taste', version: '1.2.0' } })), [])
  assert.ok(hat(verstoesseMit(externSkill({ installation: { pfad: '.claude/skills/taste', version: '1' } })), "'ressourcen[3].installation.pfad' muss absolut sein oder mit ~ beginnen"))
  assert.ok(hat(verstoesseMit(externSkill({ installation: { pfad: '~/x' } })), "'ressourcen[3].installation.version' muss ein nicht-leerer String sein"))
  assert.ok(hat(verstoesseMit(externSkill({ installation: { pfad: '~/x', version: '1', werkzeuge: ['a'] } })), "unbekanntes Feld 'ressourcen[3].installation.werkzeuge'"))
})

test('validiereRessourcenDaten: installation mcp — version, mcp_server{command,args[]}, werkzeuge ≥1 Pflicht', () => {
  assert.deepStrictEqual(verstoesseMit(externMcp({ installation: MCP_INSTALLATION })), [])
  assert.ok(hat(verstoesseMit(externMcp({ installation: { ...MCP_INSTALLATION, version: '' } })), "'ressourcen[3].installation.version'"))
  assert.ok(hat(verstoesseMit(externMcp({ installation: { ...MCP_INSTALLATION, mcp_server: { command: 'npx' } } })), "'ressourcen[3].installation.mcp_server.args' muss ein Array aus Strings sein"))
  assert.ok(hat(verstoesseMit(externMcp({ installation: { ...MCP_INSTALLATION, mcp_server: { args: [] } } })), "'ressourcen[3].installation.mcp_server.command' muss ein nicht-leerer String sein"))
  assert.ok(hat(verstoesseMit(externMcp({ installation: { ...MCP_INSTALLATION, werkzeuge: [] } })), "'ressourcen[3].installation.werkzeuge' muss ein Array mit mindestens einem Eintrag sein"))
  assert.ok(hat(verstoesseMit(externMcp({ installation: { ...MCP_INSTALLATION, pfad: '~/x' } })), "unbekanntes Feld 'ressourcen[3].installation.pfad'"))
})

test('validiereRessourcenDaten: installation mcp — werkzeuge sind Einzelnamen mcp__<id>__<name>, keine Wildcard (Spike P3)', () => {
  const mit = (werkzeuge: string[]) => verstoesseMit(externMcp({ installation: { ...MCP_INSTALLATION, werkzeuge } }))
  assert.ok(hat(mit(['mcp__obsidian-mcp__*']), "'ressourcen[3].installation.werkzeuge[0]'"))
  assert.ok(hat(mit(['search']), "'ressourcen[3].installation.werkzeuge[0]'"))
  assert.ok(hat(mit(['mcp__anderer-server__search']), "'ressourcen[3].installation.werkzeuge[0]'"))
  assert.ok(hat(mit(['mcp__obsidian-mcp__search(x)']), "'ressourcen[3].installation.werkzeuge[0]'"))
  assert.ok(hat(mit(['mcp__obsidian-mcp__search', 'mcp__obsidian-mcp__search']), 'doppelt'))
})

test('validiereRessourcenDaten: installation nur bei typ extern zulässig', () => {
  assert.ok(hat(verstoesseMit(agentEintrag({ installation: { pfad: '~/x', version: '1' } })), "'ressourcen[3].installation' ist nur bei typ 'extern' zulässig"))
})

test('validiereRessourcenDaten: R2 (E-M5-5) — extern mit installation darf FREIGEGEBEN sein', () => {
  assert.deepStrictEqual(verstoesseMit(externSkill({ freigabe: 'FREIGEGEBEN', installation: { pfad: '~/x', version: '1' } })), [])
  assert.deepStrictEqual(verstoesseMit(externMcp({ freigabe: 'FREIGEGEBEN', installation: MCP_INSTALLATION })), [])
  assert.deepStrictEqual(verstoesseMit(externSkill({ unterart: 'agent', freigabe: 'FREIGEGEBEN', installation: { pfad: '~/.claude/agents/x.md', version: '1' } })), [])
  assert.ok(hat(verstoesseMit(externSkill({ freigabe: 'FREIGEGEBEN' })), '(R2, E-M5-5)'))
  assert.ok(hat(verstoesseMit(externSkill({ unterart: 'agent', freigabe: 'FREIGEGEBEN' })), '(R2, E-M5-5)'))
})

test('validiereRessourcenDaten: E-F36-4 — unterart mcp darf FREIGEGEBEN nur mit wirkung lokal', () => {
  const v = verstoesseMit(externMcp({ freigabe: 'FREIGEGEBEN', wirkung: 'extern_lesend', installation: MCP_INSTALLATION }))
  assert.ok(hat(v, '(E-F36-4)'), JSON.stringify(v))
  assert.ok(hat(verstoesseMit(externMcp({ freigabe: 'FREIGEGEBEN', wirkung: 'extern_schreibend', installation: MCP_INSTALLATION })), '(E-F36-4)'))
  assert.deepStrictEqual(verstoesseMit(externMcp({ freigabe: 'OFFEN', wirkung: 'extern_lesend' })), [])
})

test('validiereRessourcenDaten: anwendbar_wenn — gültig bei skill, agent, extern', () => {
  const aw = { task_typen_any: ['neues-feature', 'bugfix'], pfad_muster_any: ['src/**/*.ts'] }
  assert.deepStrictEqual(verstoesseMit(agentEintrag({ anwendbar_wenn: aw })), [])
  assert.deepStrictEqual(verstoesseMit(externSkill({ anwendbar_wenn: { task_typen_any: ['refactoring'] } })), [])
  const daten = gueltigeDaten()
  ;(daten.ressourcen as Eintrag[])[1].anwendbar_wenn = { pfad_muster_any: ['docs/**'] }
  assert.deepStrictEqual(validiereRessourcenDaten(daten), [])
})

test('validiereRessourcenDaten: anwendbar_wenn — nicht bei worker', () => {
  const daten = gueltigeDaten()
  ;(daten.ressourcen as Eintrag[])[0].anwendbar_wenn = { task_typen_any: ['bugfix'] }
  assert.ok(hat(validiereRessourcenDaten(daten), "'ressourcen[0].anwendbar_wenn' ist bei typ 'worker' nicht zulässig"))
})

test('validiereRessourcenDaten: anwendbar_wenn — mindestens ein Schlüssel, keine unbekannten, Enum/Globs geprüft', () => {
  assert.ok(hat(verstoesseMit(agentEintrag({ anwendbar_wenn: {} })), "'ressourcen[3].anwendbar_wenn' braucht mindestens einen Schlüssel"))
  assert.ok(hat(verstoesseMit(agentEintrag({ anwendbar_wenn: { task_typen_any: ['bugfix'], risiko: 'hoch' } })), "unbekanntes Feld 'ressourcen[3].anwendbar_wenn.risiko'"))
  assert.ok(hat(verstoesseMit(agentEintrag({ anwendbar_wenn: { task_typen_any: ['feature'] } })), "'ressourcen[3].anwendbar_wenn.task_typen_any[0]' muss einer von"))
  assert.ok(hat(verstoesseMit(agentEintrag({ anwendbar_wenn: { task_typen_any: [] } })), "'ressourcen[3].anwendbar_wenn.task_typen_any' muss ein Array mit mindestens einem Eintrag sein"))
  assert.ok(hat(verstoesseMit(agentEintrag({ anwendbar_wenn: { pfad_muster_any: [''] } })), "'ressourcen[3].anwendbar_wenn.pfad_muster_any[0]' muss ein nicht-leerer Glob"))
  assert.ok(hat(verstoesseMit(agentEintrag({ anwendbar_wenn: { pfad_muster_any: ['src\\**\\*.ts'] } })), 'kein Backslash'))
  assert.ok(hat(verstoesseMit(agentEintrag({ anwendbar_wenn: { pfad_muster_any: [] } })), "'ressourcen[3].anwendbar_wenn.pfad_muster_any' muss ein Array mit mindestens einem Eintrag sein"))
  assert.ok(hat(verstoesseMit(agentEintrag({ anwendbar_wenn: { pfad_muster_any: 'src/**' } })), "'ressourcen[3].anwendbar_wenn.pfad_muster_any' muss ein Array"))
  assert.ok(hat(verstoesseMit(agentEintrag({ anwendbar_wenn: { pfad_muster_any: [42] } })), "'ressourcen[3].anwendbar_wenn.pfad_muster_any[0]'"))
  assert.ok(hat(verstoesseMit(agentEintrag({ anwendbar_wenn: 'immer' })), "'ressourcen[3].anwendbar_wenn' ist kein Objekt"))
})

// ─── F36 WS-1b: lizenz/kosten (nur extern, optional, Anzeige vor „Freigeben & installieren“) ─

test('validiereRessourcenDaten: lizenz/kosten — optional bei extern, als nicht-leerer String gültig', () => {
  assert.deepStrictEqual(verstoesseMit(externSkill({ lizenz: 'MIT (GitHub-Metadaten)', kosten: 'Skill kostenlos; Modellquota' })), [])
  assert.deepStrictEqual(verstoesseMit(externMcp({ lizenz: 'Apache-2.0' })), [])
  assert.deepStrictEqual(verstoesseMit(externMcp({ kosten: 'Lokal; kostenlos' })), [])
})

test('validiereRessourcenDaten: lizenz/kosten — nur bei typ extern zulässig', () => {
  assert.ok(hat(verstoesseMit(agentEintrag({ lizenz: 'MIT' })), "'ressourcen[3].lizenz' ist nur bei typ 'extern' zulässig"))
  const daten = gueltigeDaten()
  ;(daten.ressourcen as Eintrag[])[0].lizenz = 'MIT'
  ;(daten.ressourcen as Eintrag[])[1].kosten = 'kostenlos'
  const verstoesse = validiereRessourcenDaten(daten)
  assert.ok(hat(verstoesse, "'ressourcen[0].lizenz' ist nur bei typ 'extern' zulässig"))
  assert.ok(hat(verstoesse, "'ressourcen[1].kosten' ist nur bei typ 'extern' zulässig"))
})

test('validiereRessourcenDaten: lizenz/kosten — leer oder kein String wird abgelehnt', () => {
  assert.ok(hat(verstoesseMit(externSkill({ lizenz: '' })), "'ressourcen[3].lizenz' muss ein nicht-leerer String sein"))
  assert.ok(hat(verstoesseMit(externSkill({ kosten: 0 })), "'ressourcen[3].kosten' muss ein nicht-leerer String sein"))
})

// ─── loeseRessourcenAuf ─────────────────────────────────────────────────────

function neuesTestRepo(): string {
  const repoWurzel = join(tmpdir(), `f19-ressourcen-test-${randomUUID()}`)
  mkdirSync(repoWurzel, { recursive: true })
  return repoWurzel
}

function schreibeJson(pfad: string, daten: unknown): void {
  mkdirSync(join(pfad, '..'), { recursive: true })
  writeFileSync(pfad, JSON.stringify(daten, null, 2))
}

test('loeseRessourcenAuf: typ worker (claude-code) verfuegbar true, wenn Startvorlage + freigabe FREIGEGEBEN', () => {
  const repoWurzel = neuesTestRepo()
  try {
    schreibeJson(join(repoWurzel, 'startvorlagen', 'test.json'), {
      werkzeugStartziel: ['C:\\irgendwo\\claude.exe'],
      werkzeugVersionDeklariert: '1.2.3',
    })
    const ressourcen: Ressource[] = [
      { id: 'claude-code', typ: 'worker', capabilities: ['CODE_WRITE'], freigabe: 'FREIGEGEBEN', herkunft: { art: 'startvorlage', worker: 'claude-code' } },
    ]
    const [aufgeloest] = loeseRessourcenAuf(ressourcen, repoWurzel, 'startvorlagen/test.json')
    assert.strictEqual(aufgeloest.verfuegbar, true)
    assert.strictEqual(aufgeloest.name, 'claude-code')
  } finally {
    raeumeVerzeichnis(repoWurzel)
  }
})

test('loeseRessourcenAuf: typ worker (codex) verfuegbar false, wenn worker.codex-Block fehlt', () => {
  const repoWurzel = neuesTestRepo()
  try {
    schreibeJson(join(repoWurzel, 'startvorlagen', 'test.json'), {
      werkzeugStartziel: ['C:\\irgendwo\\claude.exe'],
      werkzeugVersionDeklariert: '1.2.3',
    })
    const ressourcen: Ressource[] = [
      { id: 'codex', typ: 'worker', capabilities: ['CODE_REVIEW'], freigabe: 'FREIGEGEBEN', herkunft: { art: 'startvorlage', worker: 'codex' } },
    ]
    const [aufgeloest] = loeseRessourcenAuf(ressourcen, repoWurzel, 'startvorlagen/test.json')
    assert.strictEqual(aufgeloest.verfuegbar, false)
    assert.match(aufgeloest.grund, /worker\.codex/)
  } finally {
    raeumeVerzeichnis(repoWurzel)
  }
})

test('loeseRessourcenAuf: typ worker verfuegbar false, wenn Startvorlage fehlt (Rot-Fall, kein Wurf)', () => {
  const repoWurzel = neuesTestRepo()
  try {
    const ressourcen: Ressource[] = [
      { id: 'claude-code', typ: 'worker', capabilities: ['CODE_WRITE'], freigabe: 'FREIGEGEBEN', herkunft: { art: 'startvorlage', worker: 'claude-code' } },
    ]
    const [aufgeloest] = loeseRessourcenAuf(ressourcen, repoWurzel, 'startvorlagen/nicht-vorhanden.json')
    assert.strictEqual(aufgeloest.verfuegbar, false)
    assert.match(aufgeloest.grund, /nicht gefunden/)
  } finally {
    raeumeVerzeichnis(repoWurzel)
  }
})

test('loeseRessourcenAuf: typ skill verfuegbar true, wenn SKILL.md mit vollständigem Frontmatter + freigabe FREIGEGEBEN', () => {
  const repoWurzel = neuesTestRepo()
  try {
    const skillVerzeichnis = join(repoWurzel, '.claude', 'skills', 'test-skill')
    mkdirSync(skillVerzeichnis, { recursive: true })
    writeFileSync(join(skillVerzeichnis, 'SKILL.md'), '---\nname: test-skill\ndescription: Ein Testskill.\n---\n\n# Test\n')
    const ressourcen: Ressource[] = [
      { id: 'test-skill', typ: 'skill', capabilities: ['TEST_CAP'], freigabe: 'FREIGEGEBEN', herkunft: { art: 'skill', pfad: '.claude/skills/test-skill' } },
    ]
    const [aufgeloest] = loeseRessourcenAuf(ressourcen, repoWurzel, 'startvorlagen/unbenutzt.json')
    assert.strictEqual(aufgeloest.verfuegbar, true)
    assert.strictEqual(aufgeloest.name, 'test-skill')
    assert.strictEqual(aufgeloest.beschreibung, 'Ein Testskill.')
  } finally {
    raeumeVerzeichnis(repoWurzel)
  }
})

test('loeseRessourcenAuf: typ skill verfuegbar false, wenn SKILL.md fehlt', () => {
  const repoWurzel = neuesTestRepo()
  try {
    const ressourcen: Ressource[] = [
      { id: 'test-skill', typ: 'skill', capabilities: ['TEST_CAP'], freigabe: 'FREIGEGEBEN', herkunft: { art: 'skill', pfad: '.claude/skills/nicht-vorhanden' } },
    ]
    const [aufgeloest] = loeseRessourcenAuf(ressourcen, repoWurzel, 'startvorlagen/unbenutzt.json')
    assert.strictEqual(aufgeloest.verfuegbar, false)
    assert.match(aufgeloest.grund, /SKILL\.md fehlt/)
  } finally {
    raeumeVerzeichnis(repoWurzel)
  }
})

function externRessource(overrides: Partial<Ressource>): Ressource {
  return {
    id: 'playwright-mcp',
    typ: 'extern',
    name: 'Playwright MCP',
    beschreibung: 'Browser-Automatisierung.',
    unterart: 'mcp',
    wirkung: 'lokal',
    capabilities: ['BROWSER_AUTOMATION'],
    freigabe: 'OFFEN',
    herkunft: { art: 'extern', url: 'https://github.com/microsoft/playwright-mcp' },
    ...overrides,
  }
}

const PLAYWRIGHT_INSTALLATION = { version: '0.0.40', mcp_server: { command: 'npx', args: ['-y', '@playwright/mcp'] }, werkzeuge: ['mcp__playwright-mcp__browser_navigate'] }

test('loeseRessourcenAuf: typ extern mit freigabe OFFEN ist verfuegbar false, name aus dem Eintrag', () => {
  const [aufgeloest] = loeseRessourcenAuf([externRessource({ installation: PLAYWRIGHT_INSTALLATION })], tmpdir(), 'startvorlagen/unbenutzt.json')
  assert.strictEqual(aufgeloest.verfuegbar, false)
  assert.match(aufgeloest.grund, /freigabe 'OFFEN'/)
  assert.strictEqual(aufgeloest.name, 'Playwright MCP')
})

test('loeseRessourcenAuf: typ agent über Frontmatter aufgelöst, verfuegbar bei FREIGEGEBEN', () => {
  const repoWurzel = neuesTestRepo()
  try {
    mkdirSync(join(repoWurzel, '.claude', 'agents'), { recursive: true })
    writeFileSync(join(repoWurzel, '.claude', 'agents', 'qa.md'), '---\nname: qa\ndescription: Prüft Akzeptanz.\ntools: Read\n---\n\n# QA\n')
    const agent: Ressource = { id: 'qa', typ: 'agent', capabilities: ['TEST_DESIGN'], freigabe: 'FREIGEGEBEN', herkunft: { art: 'agent', pfad: '.claude/agents/qa.md' } }
    const [a, b, c] = loeseRessourcenAuf(
      [agent, { ...agent, freigabe: 'OFFEN' }, { ...agent, id: 'fehlt', herkunft: { art: 'agent', pfad: '.claude/agents/fehlt.md' } }],
      repoWurzel,
      'startvorlagen/unbenutzt.json'
    )
    assert.strictEqual(a.verfuegbar, true)
    assert.strictEqual(a.name, 'qa')
    assert.strictEqual(a.beschreibung, 'Prüft Akzeptanz.')
    assert.strictEqual(b.verfuegbar, false)
    assert.match(b.grund, /freigabe 'OFFEN'/)
    assert.strictEqual(c.verfuegbar, false)
    assert.match(c.grund, /fehlt/)
  } finally {
    raeumeVerzeichnis(repoWurzel)
  }
})

test('loeseRessourcenAuf: typ agent ohne vollständiges Frontmatter ist nicht verfuegbar', () => {
  const repoWurzel = neuesTestRepo()
  try {
    mkdirSync(join(repoWurzel, '.claude', 'agents'), { recursive: true })
    writeFileSync(join(repoWurzel, '.claude', 'agents', 'qa.md'), '# QA ohne Frontmatter\n')
    const [a] = loeseRessourcenAuf([{ id: 'qa', typ: 'agent', capabilities: ['TEST_DESIGN'], freigabe: 'FREIGEGEBEN', herkunft: { art: 'agent', pfad: '.claude/agents/qa.md' } }], repoWurzel, 'x.json')
    assert.strictEqual(a.verfuegbar, false)
    assert.match(a.grund, /Frontmatter/)
  } finally {
    raeumeVerzeichnis(repoWurzel)
  }
})

test('loeseRessourcenAuf: extern skill|agent verfuegbar nur bei FREIGEGEBEN und existierendem installation.pfad', () => {
  const repoWurzel = neuesTestRepo()
  try {
    const installiert = join(repoWurzel, 'global', 'taste-skill')
    mkdirSync(installiert, { recursive: true })
    const basis = externRessource({ id: 'taste-skill', unterart: 'skill', wirkung: undefined, freigabe: 'FREIGEGEBEN' })
    delete basis.wirkung
    const [da, fehlt, offen, agent] = loeseRessourcenAuf(
      [
        { ...basis, installation: { pfad: installiert, version: '1.0.0' } },
        { ...basis, installation: { pfad: join(repoWurzel, 'gibt-es-nicht'), version: '1.0.0' } },
        { ...basis, freigabe: 'OFFEN', installation: { pfad: installiert, version: '1.0.0' } },
        { ...basis, unterart: 'agent', installation: { pfad: installiert, version: '1.0.0' } },
      ],
      repoWurzel,
      'x.json'
    )
    assert.strictEqual(da.verfuegbar, true, da.grund)
    assert.strictEqual(fehlt.verfuegbar, false)
    assert.match(fehlt.grund, /existiert nicht/)
    assert.strictEqual(offen.verfuegbar, false)
    assert.strictEqual(agent.verfuegbar, true)
  } finally {
    raeumeVerzeichnis(repoWurzel)
  }
})

test('loeseRessourcenAuf: extern skill mit ~-Pfad wird gegen das Home-Verzeichnis aufgelöst', () => {
  const basis = externRessource({ id: 'taste-skill', unterart: 'skill', freigabe: 'FREIGEGEBEN', installation: { pfad: `~/f36-gibt-es-nicht-${randomUUID()}`, version: '1' } })
  delete basis.wirkung
  const [a] = loeseRessourcenAuf([basis], tmpdir(), 'x.json')
  assert.strictEqual(a.verfuegbar, false)
  assert.ok(!a.grund.includes('~'), a.grund)
})

test('loeseRessourcenAuf: extern mcp verfuegbar bei FREIGEGEBEN, wirkung lokal, installation — Grund nennt „Serverstart nicht geprüft“', () => {
  const [lokal, lesend, ohne] = loeseRessourcenAuf(
    [
      externRessource({ freigabe: 'FREIGEGEBEN', installation: PLAYWRIGHT_INSTALLATION }),
      externRessource({ wirkung: 'extern_lesend', installation: PLAYWRIGHT_INSTALLATION }),
      externRessource({ freigabe: 'FREIGEGEBEN' }),
    ],
    tmpdir(),
    'x.json'
  )
  assert.strictEqual(lokal.verfuegbar, true)
  assert.match(lokal.grund, /Serverstart nicht geprüft/)
  assert.strictEqual(lesend.verfuegbar, false)
  assert.strictEqual(ohne.verfuegbar, false)
  assert.match(ohne.grund, /installation fehlt/)
})

test('loeseRessourcenAuf: ungültige installation (unvalidierte Handbearbeitung) — kein Wurf, kein falsches Grün', () => {
  const kaputt = [
    externRessource({ freigabe: 'FREIGEGEBEN', installation: { ...PLAYWRIGHT_INSTALLATION, werkzeuge: ['mcp__playwright-mcp__*'] } }),
    externRessource({ freigabe: 'FREIGEGEBEN', installation: { version: '1', werkzeuge: ['mcp__playwright-mcp__browser_navigate'] } as unknown as Ressource['installation'] }),
    externRessource({ freigabe: 'FREIGEGEBEN', installation: null as unknown as Ressource['installation'] }),
    externRessource({ freigabe: 'FREIGEGEBEN', installation: 'npx x' as unknown as Ressource['installation'] }),
  ]
  for (const r of loeseRessourcenAuf(kaputt, tmpdir(), 'x.json')) {
    assert.strictEqual(r.verfuegbar, false)
    assert.match(r.grund, /installation ungültig/)
  }
})

test('loeseRessourcenAuf: extern OFFEN mit falschem installation.pfad meldet den Pfad schon vor der Freigabe', () => {
  const r = externRessource({ id: 'taste-skill', unterart: 'skill', installation: { pfad: join(tmpdir(), `f36-fehlt-${randomUUID()}`), version: '1' } })
  delete r.wirkung
  const [a] = loeseRessourcenAuf([r], tmpdir(), 'x.json')
  assert.strictEqual(a.verfuegbar, false)
  assert.match(a.grund, /existiert nicht/)
  assert.ok(fehltFuerEinsatz(r, a).some((z) => z.startsWith('nicht verfügbar:') && z.includes('existiert nicht')), JSON.stringify(fehltFuerEinsatz(r, a)))
})

// ─── pruefeAnwendbarkeit ────────────────────────────────────────────────────

function skillMit(anwendbar_wenn?: Ressource['anwendbar_wenn']): Ressource {
  const r: Ressource = { id: 'ponytail', typ: 'skill', capabilities: ['SIMPLICITY_REVIEW'], freigabe: 'FREIGEGEBEN', herkunft: { art: 'skill', pfad: '.claude/skills/ponytail' } }
  return anwendbar_wenn === undefined ? r : { ...r, anwendbar_wenn }
}

test('pruefeAnwendbarkeit: ohne anwendbar_wenn nie anwendbar', () => {
  const e = pruefeAnwendbarkeit(skillMit(), { task_typen: ['neues-feature'] })
  assert.strictEqual(e.anwendbar, false)
  assert.match(e.begruendung, /kein anwendbar_wenn/)
})

test('pruefeAnwendbarkeit: task_typen_any — ODER innerhalb des Schlüssels', () => {
  const r = skillMit({ task_typen_any: ['neues-feature', 'refactoring'] })
  assert.strictEqual(pruefeAnwendbarkeit(r, { task_typen: ['bugfix', 'refactoring'] }).anwendbar, true)
  const nein = pruefeAnwendbarkeit(r, { task_typen: ['bugfix'] })
  assert.strictEqual(nein.anwendbar, false)
  assert.match(nein.begruendung, /task_typen_any/)
})

test('pruefeAnwendbarkeit: pfad_muster_any — Glob-Treffer, Backslash-Pfade normalisiert', () => {
  const r = skillMit({ pfad_muster_any: ['src/**/*.ts', 'docs/*.md'] })
  assert.strictEqual(pruefeAnwendbarkeit(r, { task_typen: ['bugfix'], pfade: ['README.md', 'src\\a\\b.ts'] }).anwendbar, true)
  assert.strictEqual(pruefeAnwendbarkeit(r, { task_typen: ['bugfix'], pfade: ['README.md'] }).anwendbar, false)
})

test('pruefeAnwendbarkeit: fehlende pfade → pfad_muster_any nicht erfüllt, mit Begründung', () => {
  const e = pruefeAnwendbarkeit(skillMit({ pfad_muster_any: ['src/**'] }), { task_typen: ['bugfix'] })
  assert.strictEqual(e.anwendbar, false)
  assert.match(e.begruendung, /keine Pfade/)
})

test('pruefeAnwendbarkeit: UND zwischen den Schlüsseln', () => {
  const r = skillMit({ task_typen_any: ['bugfix'], pfad_muster_any: ['src/**'] })
  assert.strictEqual(pruefeAnwendbarkeit(r, { task_typen: ['bugfix'], pfade: ['src/x.ts'] }).anwendbar, true)
  assert.strictEqual(pruefeAnwendbarkeit(r, { task_typen: ['bugfix'], pfade: ['docs/x.md'] }).anwendbar, false)
  assert.strictEqual(pruefeAnwendbarkeit(r, { task_typen: ['refactoring'], pfade: ['src/x.ts'] }).anwendbar, false)
})

// ─── fehltFuerEinsatz ───────────────────────────────────────────────────────

function aufgeloestAus(r: Ressource, verfuegbar: boolean, grund = 'x'): AufgelosteRessource {
  return { ...r, name: r.name ?? r.id, beschreibung: r.beschreibung ?? '', verfuegbar, grund }
}

test('fehltFuerEinsatz: einsatzbereiter Skill mit anwendbar_wenn → leere Liste', () => {
  const r = skillMit({ task_typen_any: ['bugfix'] })
  assert.deepStrictEqual(fehltFuerEinsatz(r, aufgeloestAus(r, true)), [])
})

test('fehltFuerEinsatz: extern mcp OFFEN, extern_lesend, ohne installation, ohne anwendbar_wenn → alle Gründe in Klartext', () => {
  const r = externRessource({ wirkung: 'extern_lesend' })
  assert.deepStrictEqual(fehltFuerEinsatz(r, aufgeloestAus(r, false, 'extern, installation fehlt')), [
    'freigabe OFFEN',
    'installation fehlt',
    'wirkung extern_lesend: in V1 nicht freigebbar (E-F36-4)',
    'kein anwendbar_wenn: wird nie empfohlen',
  ])
})

test('fehltFuerEinsatz: freigegeben, aber technisch nicht verfügbar → Grund der Auflösung', () => {
  const r = skillMit({ task_typen_any: ['bugfix'] })
  assert.deepStrictEqual(fehltFuerEinsatz(r, aufgeloestAus(r, false, "SKILL.md fehlt unter 'x'")), ["nicht verfügbar: SKILL.md fehlt unter 'x'"])
})

test('fehltFuerEinsatz: extern FREIGEGEBEN mit fehlendem Pfad — technischer Grund vor dem Empfehlungshinweis', () => {
  const r = externRessource({ id: 'taste-skill', unterart: 'skill', freigabe: 'FREIGEGEBEN', installation: { pfad: '~/x', version: '1' } })
  delete r.wirkung
  assert.deepStrictEqual(fehltFuerEinsatz(r, aufgeloestAus(r, false, "extern, installation.pfad 'C:\\x' existiert nicht")), [
    "nicht verfügbar: extern, installation.pfad 'C:\\x' existiert nicht",
    'kein anwendbar_wenn: wird nie empfohlen',
  ])
})

test('fehltFuerEinsatz: reiner Freigabe-Grund wird nicht doppelt gemeldet', () => {
  const r: Ressource = { ...skillMit({ task_typen_any: ['bugfix'] }), freigabe: 'OFFEN' }
  assert.deepStrictEqual(fehltFuerEinsatz(r, aufgeloestAus(r, false, "SKILL.md vorhanden, aber freigabe 'OFFEN'")), ['freigabe OFFEN'])
  assert.deepStrictEqual(fehltFuerEinsatz(r, aufgeloestAus(r, false, "SKILL.md fehlt unter 'x'")), ['freigabe OFFEN', "nicht verfügbar: SKILL.md fehlt unter 'x'"])
})

test('fehltFuerEinsatz: Kopplung an die echten Grund-Texte — worker, skill, agent, extern mit OFFEN melden nur „freigabe OFFEN“', () => {
  const repoWurzel = neuesTestRepo()
  try {
    schreibeJson(join(repoWurzel, 'startvorlagen', 'test.json'), { werkzeugStartziel: ['claude.exe'], werkzeugVersionDeklariert: '1' })
    mkdirSync(join(repoWurzel, '.claude', 'skills', 's'), { recursive: true })
    writeFileSync(join(repoWurzel, '.claude', 'skills', 's', 'SKILL.md'), '---\nname: s\ndescription: S.\n---\n')
    mkdirSync(join(repoWurzel, '.claude', 'agents'), { recursive: true })
    writeFileSync(join(repoWurzel, '.claude', 'agents', 'a.md'), '---\nname: a\ndescription: A.\n---\n')
    const aw = { task_typen_any: ['bugfix' as const] }
    const extern = externRessource({ id: 'x', unterart: 'skill', installation: { pfad: repoWurzel, version: '1' }, anwendbar_wenn: aw })
    delete extern.wirkung
    const ressourcen: Ressource[] = [
      { id: 'claude-code', typ: 'worker', capabilities: ['C'], freigabe: 'OFFEN', herkunft: { art: 'startvorlage', worker: 'claude-code' } },
      { id: 's', typ: 'skill', capabilities: ['C'], freigabe: 'OFFEN', herkunft: { art: 'skill', pfad: '.claude/skills/s' }, anwendbar_wenn: aw },
      { id: 'a', typ: 'agent', capabilities: ['C'], freigabe: 'OFFEN', herkunft: { art: 'agent', pfad: '.claude/agents/a.md' }, anwendbar_wenn: aw },
      extern,
    ]
    for (const aufgeloest of loeseRessourcenAuf(ressourcen, repoWurzel, 'startvorlagen/test.json')) {
      assert.deepStrictEqual(fehltFuerEinsatz(aufgeloest, aufgeloest), ['freigabe OFFEN'], `${aufgeloest.id}: ${aufgeloest.grund}`)
    }
  } finally {
    raeumeVerzeichnis(repoWurzel)
  }
})

test('fehltFuerEinsatz: mcp mit gesperrter wirkung UND ungültiger installation zeigt beide Gründe', () => {
  const r = externRessource({ wirkung: 'extern_lesend', installation: { version: '1', werkzeuge: ['x'] } as unknown as Ressource['installation'] })
  const [a] = loeseRessourcenAuf([r], tmpdir(), 'x.json')
  const fehlt = fehltFuerEinsatz(r, a)
  assert.ok(fehlt.some((z) => z.includes('(E-F36-4)')), JSON.stringify(fehlt))
  assert.ok(fehlt.some((z) => z.includes('installation ungültig')), JSON.stringify(fehlt))
})

test('pruefeAnwendbarkeit: leere pfade-Liste gilt wie fehlende Pfade', () => {
  const e = pruefeAnwendbarkeit(skillMit({ pfad_muster_any: ['src/**'] }), { task_typen: ['bugfix'], pfade: [] })
  assert.strictEqual(e.anwendbar, false)
  assert.match(e.begruendung, /keine Pfade/)
})

test('fehltFuerEinsatz: worker braucht kein anwendbar_wenn', () => {
  const r: Ressource = { id: 'codex', typ: 'worker', capabilities: ['CODE_REVIEW'], freigabe: 'FREIGEGEBEN', herkunft: { art: 'startvorlage', worker: 'codex' } }
  assert.deepStrictEqual(fehltFuerEinsatz(r, aufgeloestAus(r, true)), [])
})

// ─── ressourcenFuerCapability ───────────────────────────────────────────────

function aufgeloesteRessource(overrides: Partial<AufgelosteRessource>): AufgelosteRessource {
  return {
    id: 'x',
    typ: 'skill',
    capabilities: ['CAP_A'],
    freigabe: 'FREIGEGEBEN',
    herkunft: { art: 'skill', pfad: 'x' },
    name: 'x',
    beschreibung: 'x',
    verfuegbar: true,
    grund: 'x',
    ...overrides,
  }
}

test('ressourcenFuerCapability: findet Ressourcen mit passender Capability', () => {
  const a = aufgeloesteRessource({ id: 'a', capabilities: ['CAP_A'] })
  const b = aufgeloesteRessource({ id: 'b', capabilities: ['CAP_B'] })
  assert.deepStrictEqual(ressourcenFuerCapability([a, b], 'CAP_A'), [a])
})

test('ressourcenFuerCapability: findet nichts, wenn keine Ressource die Capability trägt', () => {
  const a = aufgeloesteRessource({ id: 'a', capabilities: ['CAP_A'] })
  assert.deepStrictEqual(ressourcenFuerCapability([a], 'CAP_UNBEKANNT'), [])
})

// ─── pruefeAbdeckung ────────────────────────────────────────────────────────

test('pruefeAbdeckung: leeres Ergebnis bei voller Deckung', () => {
  const a = aufgeloesteRessource({ id: 'a', capabilities: ['CAP_A', 'CAP_B'], verfuegbar: true })
  assert.deepStrictEqual(pruefeAbdeckung([a], 'test-rolle', ['CAP_A', 'CAP_B']), [])
})

test('pruefeAbdeckung: Gap bei fehlender Ressource', () => {
  const a = aufgeloesteRessource({ id: 'a', capabilities: ['CAP_A'], verfuegbar: true })
  assert.deepStrictEqual(pruefeAbdeckung([a], 'test-rolle', ['CAP_A', 'CAP_FEHLT']), [{ capability: 'CAP_FEHLT', rolle: 'test-rolle' }])
})

test('pruefeAbdeckung: Gap wenn Ressource registriert, aber nicht verfuegbar (Red-2-Analog)', () => {
  const a = aufgeloesteRessource({ id: 'a', capabilities: ['CAP_A'], verfuegbar: false })
  assert.deepStrictEqual(pruefeAbdeckung([a], 'test-rolle', ['CAP_A']), [{ capability: 'CAP_A', rolle: 'test-rolle' }])
})

// ─── baueMcpAufruf (F36 WS-2) ───────────────────────────────────────────────

function lokalerMcp(ueberschreibung: Partial<Ressource> = {}): Ressource {
  return {
    id: 'playwright',
    typ: 'extern',
    unterart: 'mcp',
    wirkung: 'lokal',
    capabilities: ['BROWSER_TEST'],
    freigabe: 'FREIGEGEBEN',
    herkunft: { art: 'extern', url: 'https://github.com/microsoft/playwright-mcp' },
    installation: {
      version: '0.0.41',
      mcp_server: { command: 'npx', args: ['-y', '@playwright/mcp@0.0.41', '--headless'] },
      werkzeuge: ['mcp__playwright__browser_navigate', 'mcp__playwright__browser_snapshot'],
    },
    ...ueberschreibung,
  }
}

test('baueMcpAufruf: leere Eingabe ergibt bitgenau den heutigen Default', () => {
  assert.deepEqual(baueMcpAufruf([]), { mcpConfig: '{"mcpServers":{}}', zusatzWerkzeuge: [] })
})

test('baueMcpAufruf: ein lokaler MCP ergibt Config unter der Ressourcen-id und seine Einzelnamen', () => {
  const ergebnis = baueMcpAufruf([lokalerMcp()])
  assert.deepEqual(JSON.parse(ergebnis.mcpConfig), {
    mcpServers: { playwright: { command: 'npx', args: ['-y', '@playwright/mcp@0.0.41', '--headless'] } },
  })
  assert.deepEqual(ergebnis.zusatzWerkzeuge, ['mcp__playwright__browser_navigate', 'mcp__playwright__browser_snapshot'])
})

test('baueMcpAufruf: extern_lesend wirft (fail-closed, E-F36-4)', () => {
  assert.throws(() => baueMcpAufruf([lokalerMcp({ wirkung: 'extern_lesend' })]), /E-F36-4/)
})

test('baueMcpAufruf: nicht FREIGEGEBEN wirft', () => {
  assert.throws(() => baueMcpAufruf([lokalerMcp({ freigabe: 'OFFEN' })]), /FREIGEGEBEN/)
})

test('baueMcpAufruf: unterart skill oder fehlende installation wirft', () => {
  assert.throws(() => baueMcpAufruf([lokalerMcp({ unterart: 'skill' })]), /unterart 'mcp'/)
  assert.throws(() => baueMcpAufruf([lokalerMcp({ installation: undefined })]), /installation/)
})

test('baueMcpAufruf: Wildcard oder fremder Server-Präfix in werkzeuge wirft', () => {
  const mitWildcard = lokalerMcp()
  mitWildcard.installation = { version: '1', mcp_server: { command: 'npx', args: [] }, werkzeuge: ['mcp__playwright__*'] }
  assert.throws(() => baueMcpAufruf([mitWildcard]), /Einzelname/)
  const nurPraefix = lokalerMcp()
  nurPraefix.installation = { version: '1', mcp_server: { command: 'npx', args: [] }, werkzeuge: ['mcp__playwright__'] }
  assert.throws(() => baueMcpAufruf([nurPraefix]), /Einzelname/)
  const fremd = lokalerMcp()
  fremd.installation = { version: '1', mcp_server: { command: 'npx', args: [] }, werkzeuge: ['mcp__anderer__x'] }
  assert.throws(() => baueMcpAufruf([fremd]), /Einzelname/)
})

test('baueMcpAufruf: doppelte Ressourcen-id wirft', () => {
  assert.throws(() => baueMcpAufruf([lokalerMcp(), lokalerMcp()]), /doppelt/)
})

test('baueMcpAufruf: leere werkzeuge, leerer command oder Komma im Namen werfen (kein stilles Weglassen, keine eingeschleuste Regel)', () => {
  const leer = lokalerMcp()
  leer.installation = { version: '1', mcp_server: { command: 'npx', args: [] }, werkzeuge: [] }
  assert.throws(() => baueMcpAufruf([leer]), /werkzeuge/)
  const ohneCommand = lokalerMcp()
  ohneCommand.installation = { version: '1', mcp_server: { command: '', args: [] }, werkzeuge: ['mcp__playwright__browser_navigate'] }
  assert.throws(() => baueMcpAufruf([ohneCommand]), /command/)
  const komma = lokalerMcp()
  komma.installation = { version: '1', mcp_server: { command: 'npx', args: [] }, werkzeuge: ['mcp__playwright__x,Bash'] }
  assert.throws(() => baueMcpAufruf([komma]), /Einzelname/)
})

test('baueMcpAufruf: ungültige id (__proto__, Großbuchstaben) wirft', () => {
  assert.throws(() => baueMcpAufruf([lokalerMcp({ id: '__proto__' })]), /id verletzt/)
  assert.throws(() => baueMcpAufruf([lokalerMcp({ id: 'Playwright' })]), /id verletzt/)
})

test('baueMcpAufruf: typ ungleich extern bei unterart mcp wirft', () => {
  assert.throws(() => baueMcpAufruf([lokalerMcp({ typ: 'skill' })]), /unterart 'mcp'/)
})

test('baueMcpAufruf: zwei MCPs in Eingabereihenfolge, Eingabe unverändert', () => {
  const a = lokalerMcp()
  const b = lokalerMcp({ id: 'zweiter' })
  b.installation = { version: '1', mcp_server: { command: 'node', args: ['s.js'] }, werkzeuge: ['mcp__zweiter__lesen'] }
  const ergebnis = baueMcpAufruf([a, b])
  assert.deepEqual(Object.keys(JSON.parse(ergebnis.mcpConfig).mcpServers), ['playwright', 'zweiter'])
  assert.deepEqual(ergebnis.zusatzWerkzeuge, ['mcp__playwright__browser_navigate', 'mcp__playwright__browser_snapshot', 'mcp__zweiter__lesen'])
  const eingabeVorher = JSON.stringify([a, b])
  baueMcpAufruf([a, b])
  assert.equal(JSON.stringify([a, b]), eingabeVorher)
})

// ─── baueEmpfehlung (F36 WS-3) ──────────────────────────────────────────────

const MCP_INSTALL = (id: string) => ({ version: '1', mcp_server: { command: 'node', args: ['s.js'] }, werkzeuge: [`mcp__${id}__lesen`] })

/** Aufgelöster Katalogeintrag für baueEmpfehlung — Default: freigegebener, verfügbarer lokaler MCP mit beiden anwendbar_wenn-Schlüsseln. */
function kandidat(id: string, overrides: Partial<AufgelosteRessource> = {}): AufgelosteRessource {
  return {
    id,
    typ: 'extern',
    name: `Name ${id}`,
    beschreibung: 'b',
    unterart: 'mcp',
    wirkung: 'lokal',
    capabilities: ['X'],
    freigabe: 'FREIGEGEBEN',
    herkunft: { art: 'extern', url: 'https://example.invalid' },
    installation: MCP_INSTALL(id),
    anwendbar_wenn: { task_typen_any: ['bugfix'], pfad_muster_any: ['src/**'] },
    verfuegbar: true,
    grund: 'freigegeben',
    ...overrides,
  }
}

const KONTEXT = { task_typen: ['bugfix' as const], pfade: ['src/a.ts'] }
const NUR_TASK = { task_typen_any: ['bugfix' as const] }

test('baueEmpfehlung: Rangfolge — beide Schlüssel vor einem, danach id alphabetisch', () => {
  const e = baueEmpfehlung([kandidat('zeta'), kandidat('alpha', { anwendbar_wenn: NUR_TASK }), kandidat('mitte')], KONTEXT)
  assert.deepEqual(e.wirdGenutzt.map((x) => x.id), ['mitte', 'zeta', 'alpha'])
  assert.match(e.wirdGenutzt[0].grund, /task_typen_any erfüllt/)
})

test('baueEmpfehlung: höchstens drei je Liste, Rest als Anzahl (F-788)', () => {
  const genutzt = ['a', 'b', 'c', 'd', 'e'].map((id) => kandidat(id))
  const offen = ['p', 'q', 'r', 's'].map((id) => kandidat(id, { freigabe: 'OFFEN', installation: undefined, verfuegbar: false, grund: 'extern, installation fehlt' }))
  const e = baueEmpfehlung([...genutzt, ...offen], KONTEXT)
  assert.deepEqual(e.wirdGenutzt.map((x) => x.id), ['a', 'b', 'c'])
  assert.deepEqual(e.passtNichtImLauf.map((x) => x.id), ['p', 'q', 'r'])
  assert.deepEqual(e.weitereAnzahl, { wirdGenutzt: 2, passtNichtImLauf: 1 })
  assert.match(e.passtNichtImLauf[0].grund, /freigabe OFFEN; installation fehlt/)
})

test('baueEmpfehlung: deterministisch — gleiche Eingabe (auch umsortiert) gibt gleiche Ausgabe', () => {
  const eintraege = [kandidat('c'), kandidat('a', { anwendbar_wenn: NUR_TASK }), kandidat('b', { freigabe: 'OFFEN', verfuegbar: false }), kandidat('d')]
  const eins = baueEmpfehlung(eintraege, KONTEXT)
  assert.deepEqual(baueEmpfehlung(eintraege, KONTEXT), eins)
  assert.deepEqual(baueEmpfehlung([...eintraege].reverse(), KONTEXT), eins)
})

test('baueEmpfehlung: Skill/Agent (intern und extern) nie in wirdGenutzt, Grund nennt WS-5', () => {
  const internSkill = kandidat('skill-intern', { typ: 'skill', unterart: undefined, wirkung: undefined, installation: undefined, herkunft: { art: 'skill', pfad: '.claude/skills/x' } })
  const internAgent = kandidat('agent-intern', { typ: 'agent', unterart: undefined, wirkung: undefined, installation: undefined, herkunft: { art: 'agent', pfad: '.claude/agents/x.md' } })
  const externSkillFrei = kandidat('skill-extern', { unterart: 'skill', wirkung: undefined, installation: { pfad: '/x', version: '1' } })
  const externAgentFrei = kandidat('agent-extern', { unterart: 'agent', wirkung: undefined, installation: { pfad: '/x', version: '1' } })
  const e = baueEmpfehlung([internSkill, internAgent, externSkillFrei, externAgentFrei], KONTEXT)
  assert.deepEqual(e.wirdGenutzt, [])
  assert.equal(e.passtNichtImLauf.length + e.weitereAnzahl.passtNichtImLauf, 4)
  for (const x of e.passtNichtImLauf) assert.match(x.grund, /Skill\/Agent in der Ausführung erst ab WS-5/)
})

test('baueEmpfehlung: wirkung ≠ lokal steht in keiner Liste, nur in nichtFreigebbarAnzahl (E-F36-4)', () => {
  const e = baueEmpfehlung([kandidat('lesend', { wirkung: 'extern_lesend', freigabe: 'OFFEN' }), kandidat('schreibend', { wirkung: 'extern_schreibend', freigabe: 'OFFEN' })], KONTEXT)
  assert.deepEqual(e.wirdGenutzt, [])
  assert.deepEqual(e.passtNichtImLauf, [])
  assert.equal(e.nichtFreigebbarAnzahl, 2)
})

test('baueEmpfehlung: leere task_typen — nur reine Pfad-Einträge sind anwendbar', () => {
  const e = baueEmpfehlung([kandidat('mit-task'), kandidat('nur-pfad', { anwendbar_wenn: { pfad_muster_any: ['src/**'] } })], { task_typen: [], pfade: ['src/a.ts'] })
  assert.deepEqual(e.wirdGenutzt.map((x) => x.id), ['nur-pfad'])
  assert.deepEqual(e.passtNichtImLauf, [])
  const leer = baueEmpfehlung([kandidat('mit-task')], { task_typen: [], pfade: [] })
  assert.deepEqual(leer, { wirdGenutzt: [], passtNichtImLauf: [], weitereAnzahl: { wirdGenutzt: 0, passtNichtImLauf: 0 }, nichtFreigebbarAnzahl: 0 })
})

test('baueEmpfehlung: freigegebener MCP, aber nicht verfügbar → passtNichtImLauf mit Grund', () => {
  const e = baueEmpfehlung([kandidat('kaputt', { verfuegbar: false, grund: 'extern, installation ungültig: x' })], KONTEXT)
  assert.deepEqual(e.wirdGenutzt, [])
  assert.match(e.passtNichtImLauf[0].grund, /nicht verfügbar: extern, installation ungültig/)
})

test('baueEmpfehlungsZeile: leer → null, sonst eine Zeile mit id (name)', () => {
  assert.equal(baueEmpfehlungsZeile([]), null)
  assert.equal(
    baueEmpfehlungsZeile([{ id: 'a', name: 'A', typ: 'extern', unterart: 'mcp', grund: 'g' }]),
    'Freigegebene Katalog-Fähigkeiten in diesem Lauf: a (A) — nutzen, wo sie passen.'
  )
})
