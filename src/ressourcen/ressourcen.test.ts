/**
 * Datei: src/ressourcen/ressourcen.test.ts
 *
 * Zweck: node:test-Fälle für src/ressourcen/index.ts (F19 WS-2). Vier
 * Abschnitte: validiereRessourcenDaten (Rot-Abdeckung gegen
 * schemas/ressourcen.schema.json und R1/R2/R3, Muster router.test.ts),
 * loeseRessourcenAuf (eigene Test-Fixtures unter os.tmpdir(), kein
 * Schreiben ins echte Repo), ressourcenFuerCapability und pruefeAbdeckung
 * (reine Filter/Lookup-Funktionen, keine Fixtures nötig). Seit F36 WS-5a am Ende: herkunft.paket,
 * installation_vorlage, Platzhalter in args, empfehlungsKennung (F-808), Projekt-URL in der Empfehlung.
 */

import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  baueEmpfehlung,
  baueEmpfehlungsZeile,
  baueMcpAufruf,
  brauchtProjektOrigins,
  empfehlungsKennung,
  ersetzePlatzhalter,
  fehltFuerEinsatz,
  loeseRessourcenAuf,
  PROJEKT_SKILL_GESPERRT,
  PROJEKT_URL_FEHLT,
  paketNameAus,
  pruefeAbdeckung,
  pruefeAnwendbarkeit,
  pruefeInstallierbarkeit,
  ressourcenFuerCapability,
  validiereRessourcenDaten,
} from './index.ts'
import { berechneInhaltHash } from './skill-dateien.ts'
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

/** F36 WS-5b: R4-Form einer Skill-installation (Commit-SHA + inhalt_hash). */
const SHA = 'a'.repeat(40)
const HASH = 'b'.repeat(64)
function skillInstallation(pfad: string, inhaltHash: string = HASH): { pfad: string; version: string; inhalt_hash: string } {
  return { pfad, version: SHA, inhalt_hash: inhaltHash }
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

test('validiereRessourcenDaten: installation skill|agent — pfad (absolut oder ~) und version Pflicht; skill mit Commit-SHA + inhalt_hash (WS-5b)', () => {
  assert.deepStrictEqual(verstoesseMit(externSkill({ installation: skillInstallation('~/.claude/skills/taste-skill') })), [])
  assert.deepStrictEqual(verstoesseMit(externSkill({ installation: skillInstallation('C:\\Users\\x\\.claude\\skills\\taste') })), [])
  assert.deepStrictEqual(verstoesseMit(externSkill({ installation: skillInstallation('/opt/skills/taste') })), [])
  assert.ok(hat(verstoesseMit(externSkill({ installation: skillInstallation('.claude/skills/taste') })), "'ressourcen[3].installation.pfad' muss absolut sein oder mit ~ beginnen"))
  assert.ok(hat(verstoesseMit(externSkill({ installation: { pfad: '~/x', inhalt_hash: HASH } })), "'ressourcen[3].installation.version' muss ein nicht-leerer String sein"))
  assert.ok(hat(verstoesseMit(externSkill({ installation: { ...skillInstallation('~/x'), werkzeuge: ['a'] } })), "unbekanntes Feld 'ressourcen[3].installation.werkzeuge'"))
  // WS-5b (R4 skill): version = 40-stellige Commit-SHA, inhalt_hash = sha256 Pflicht.
  assert.ok(hat(verstoesseMit(externSkill({ installation: { ...skillInstallation('~/x'), version: '1.2.0' } })), "'ressourcen[3].installation.version' muss bei unterart 'skill' die 40-stellige Commit-SHA sein"))
  assert.ok(hat(verstoesseMit(externSkill({ installation: { pfad: '~/x', version: SHA } })), "'ressourcen[3].installation.inhalt_hash' muss bei unterart 'skill' ein sha256"))
  // agent bleibt {pfad, version} — ohne inhalt_hash, mit inhalt_hash abgelehnt.
  assert.deepStrictEqual(verstoesseMit(externSkill({ unterart: 'agent', installation: { pfad: '~/.claude/agents/x.md', version: '1' } })), [])
  assert.ok(hat(verstoesseMit(externSkill({ unterart: 'agent', installation: { pfad: '~/x.md', version: '1', inhalt_hash: HASH } })), "unbekanntes Feld 'ressourcen[3].installation.inhalt_hash'"))
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
  assert.deepStrictEqual(verstoesseMit(externSkill({ freigabe: 'FREIGEGEBEN', installation: skillInstallation('~/x') })), [])
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

test('loeseRessourcenAuf: extern skill|agent verfuegbar nur bei FREIGEGEBEN und existierendem installation.pfad (skill: SKILL.md + inhalt_hash, WS-5b)', () => {
  const repoWurzel = neuesTestRepo()
  try {
    const installiert = join(repoWurzel, 'global', 'taste-skill')
    mkdirSync(installiert, { recursive: true })
    writeFileSync(join(installiert, 'SKILL.md'), '---\nname: taste-skill\ndescription: T.\n---\n')
    const hash = berechneInhaltHash(installiert)
    const ohneSkillMd = join(repoWurzel, 'global', 'leer')
    mkdirSync(ohneSkillMd, { recursive: true })
    const basis = externRessource({ id: 'taste-skill', unterart: 'skill', wirkung: undefined, freigabe: 'FREIGEGEBEN' })
    delete basis.wirkung
    const [da, fehlt, offen, agent, hashAnders, keinSkillMd] = loeseRessourcenAuf(
      [
        { ...basis, installation: skillInstallation(installiert, hash) },
        { ...basis, installation: skillInstallation(join(repoWurzel, 'gibt-es-nicht'), hash) },
        { ...basis, freigabe: 'OFFEN', installation: skillInstallation(installiert, hash) },
        { ...basis, unterart: 'agent', installation: { pfad: installiert, version: '1.0.0' } },
        { ...basis, installation: skillInstallation(installiert, 'c'.repeat(64)) },
        { ...basis, installation: skillInstallation(ohneSkillMd, hash) },
      ],
      repoWurzel,
      'x.json'
    )
    assert.strictEqual(da.verfuegbar, true, da.grund)
    assert.match(da.grund, /inhalt_hash stimmt/)
    assert.strictEqual(fehlt.verfuegbar, false)
    assert.match(fehlt.grund, /existiert nicht/)
    assert.strictEqual(offen.verfuegbar, false)
    assert.strictEqual(agent.verfuegbar, true)
    assert.strictEqual(hashAnders.verfuegbar, false)
    assert.match(hashAnders.grund, /inhalt_hash .* weicht .* ab/)
    assert.strictEqual(keinSkillMd.verfuegbar, false)
    assert.match(keinSkillMd.grund, /SKILL.md fehlt/)
  } finally {
    raeumeVerzeichnis(repoWurzel)
  }
})

test('loeseRessourcenAuf: extern skill mit ~-Pfad wird gegen das Home-Verzeichnis aufgelöst', () => {
  const basis = externRessource({ id: 'taste-skill', unterart: 'skill', freigabe: 'FREIGEGEBEN', installation: skillInstallation(`~/f36-gibt-es-nicht-${randomUUID()}`) })
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
  const r = externRessource({ id: 'taste-skill', unterart: 'skill', installation: skillInstallation(join(tmpdir(), `f36-fehlt-${randomUUID()}`)) })
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
  const r = externRessource({ id: 'taste-skill', unterart: 'skill', freigabe: 'FREIGEGEBEN', installation: skillInstallation('~/x') })
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
    const skillOrdner = join(repoWurzel, '.claude', 'skills', 's')
    const extern = externRessource({ id: 'x', unterart: 'skill', installation: skillInstallation(skillOrdner, berechneInhaltHash(skillOrdner)), anwendbar_wenn: aw })
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

test('baueEmpfehlung (WS-5b): Agents und Projekt-Skills nie in wirdGenutzt; Agents behalten „erst ab WS-5“, Projekt-Skills „gesperrt“', () => {
  const internSkill = kandidat('skill-intern', { typ: 'skill', unterart: undefined, wirkung: undefined, installation: undefined, herkunft: { art: 'skill', pfad: '.claude/skills/x' } })
  const internAgent = kandidat('agent-intern', { typ: 'agent', unterart: undefined, wirkung: undefined, installation: undefined, herkunft: { art: 'agent', pfad: '.claude/agents/x.md' } })
  const externAgentFrei = kandidat('agent-extern', { unterart: 'agent', wirkung: undefined, installation: { pfad: '/x', version: '1' } })
  const e = baueEmpfehlung([internSkill, internAgent, externAgentFrei], KONTEXT)
  assert.deepEqual(e.wirdGenutzt, [])
  assert.equal(e.passtNichtImLauf.length, 3)
  const grund = (id: string) => e.passtNichtImLauf.find((x) => x.id === id)?.grund ?? ''
  assert.match(grund('agent-intern'), /Skill\/Agent in der Ausführung erst ab WS-5/)
  assert.match(grund('agent-extern'), /Skill\/Agent in der Ausführung erst ab WS-5/)
  assert.ok(grund('skill-intern').includes(PROJEKT_SKILL_GESPERRT))
  assert.doesNotMatch(grund('skill-intern'), /erst ab WS-5/)
})

test('baueEmpfehlung (WS-5b): extern skill FREIGEGEBEN + installation + verfügbar → wirdGenutzt mit empfehlungId id@hash; nicht verfügbar → Grund', () => {
  const inst = { pfad: '/cap/fd/.claude/skills/fd', version: 'a'.repeat(40), inhalt_hash: 'b'.repeat(64) }
  const frei = kandidat('fd', { unterart: 'skill', wirkung: undefined, installation: inst })
  const kaputt = kandidat('fd2', { unterart: 'skill', wirkung: undefined, installation: inst, verfuegbar: false, grund: 'extern, inhalt_hash des Skill-Ordners weicht ab' })
  const e = baueEmpfehlung([frei, kaputt], KONTEXT)
  assert.deepEqual(e.wirdGenutzt.map((x) => x.empfehlungId), [empfehlungsKennung(frei)])
  assert.match(e.wirdGenutzt[0].empfehlungId ?? '', /^fd@[0-9a-f]{64}$/)
  assert.match(e.passtNichtImLauf[0].grund, /inhalt_hash/)
  assert.doesNotMatch(e.passtNichtImLauf[0].grund, /erst ab WS-5/)
})

test('baueEmpfehlung (WS-5b): extern skill ohne installation — installierbar nur mit Vorlage und GitHub-Adresse, sonst Grund', () => {
  const offen = { freigabe: 'OFFEN' as const, installation: undefined, verfuegbar: false, grund: 'extern, installation fehlt', unterart: 'skill' as const, wirkung: undefined }
  const mit = kandidat('mit', { ...offen, herkunft: { art: 'extern', url: 'https://github.com/o/r/tree/main/plugins/x' }, installation_vorlage: { skill_pfad: 'skills/x' } })
  const ohne = kandidat('ohne', { ...offen, herkunft: { art: 'extern', url: 'https://github.com/o/r' } })
  const fremd = kandidat('fremd', { ...offen, herkunft: { art: 'extern', url: 'https://gitlab.com/o/r' }, installation_vorlage: { skill_pfad: 'x' } })
  const e = baueEmpfehlung([mit, ohne, fremd], KONTEXT)
  const eintrag = (id: string) => e.passtNichtImLauf.find((x) => x.id === id)
  assert.equal(eintrag('mit')?.installierbar, true)
  assert.equal('installierbar' in (eintrag('ohne') ?? {}), false)
  assert.match(eintrag('ohne')?.grund ?? '', /nicht installierbar: installation_vorlage \(skill_pfad\) fehlt/)
  assert.match(eintrag('fremd')?.grund ?? '', /nicht installierbar: herkunft.url/)
  assert.match(pruefeInstallierbarkeit(kandidat('ag', { unterart: 'agent', wirkung: undefined })) ?? '', /erst später/)
})

test('baueEmpfehlung (F-825): Reallauf-Fall — installierbares playwright-mcp vor nicht installierbaren Skills, übersteht die Obergrenze', () => {
  const offenerSkill = (id: string) =>
    kandidat(id, { freigabe: 'OFFEN', installation: undefined, verfuegbar: false, grund: 'extern, installation fehlt', unterart: 'skill', wirkung: undefined, herkunft: { art: 'extern', url: `https://github.com/o/${id}` } })
  const playwright = kandidat('playwright-mcp', {
    freigabe: 'OFFEN',
    installation: undefined,
    verfuegbar: false,
    grund: 'extern, installation fehlt',
    anwendbar_wenn: NUR_TASK,
    herkunft: { art: 'extern', url: 'https://github.com/microsoft/playwright-mcp', paket: 'npm:@playwright/mcp' },
    installation_vorlage: { bin: 'cli.js', args: [], werkzeuge: ['mcp__playwright-mcp__browser_navigate'] },
  })
  const e = baueEmpfehlung([offenerSkill('frontend-x'), offenerSkill('image-to-code'), offenerSkill('mengto-skills'), playwright], KONTEXT)
  // Ohne F-825 stünde playwright-mcp (Rang 1, id hinten) nur in der Zählzeile.
  assert.deepEqual(e.passtNichtImLauf.map((x) => x.id), ['playwright-mcp', 'frontend-x', 'image-to-code'])
  assert.equal(e.passtNichtImLauf[0].installierbar, true)
  assert.equal(e.weitereAnzahl.passtNichtImLauf, 1)
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

test('baueEmpfehlungsZeile (F-827): Vorschau-Satz nur mit {projekt_origins}-Eintrag UND Projekt-URL, sonst bitgenau', () => {
  const basis = 'Freigegebene Katalog-Fähigkeiten in diesem Lauf: pw (Name pw) — nutzen, wo sie passen.'
  const eintrag = [{ id: 'pw', name: 'Name pw', typ: 'extern' as const, unterart: 'mcp' as const, grund: 'g' }]
  const mitOrigins = kandidat('pw', { installation: { ...MCP_INSTALL('pw'), mcp_server: { command: 'node', args: ['s.js', '--allowed-origins', '{projekt_origins}'] } } })
  assert.equal(
    baueEmpfehlungsZeile(eintrag, 'http://127.0.0.1:5173', [mitOrigins]),
    `${basis} Projekt-Vorschau: http://127.0.0.1:5173 läuft bereits, zum Prüfen browser_navigate darauf nutzen, nicht selbst starten; keine file://-URLs.`
  )
  assert.equal(baueEmpfehlungsZeile(eintrag, null, [mitOrigins]), basis, 'ohne vorschau_url bitgenau')
  assert.equal(baueEmpfehlungsZeile(eintrag, 'http://127.0.0.1:5173', [kandidat('pw')]), basis, 'ohne {projekt_origins} bitgenau')
  assert.equal(baueEmpfehlungsZeile(eintrag), basis, 'Default-Argumente bitgenau')
  assert.equal(baueEmpfehlungsZeile([], 'http://127.0.0.1:5173', [mitOrigins]), null)
})

// ─── F36 WS-5a: herkunft.paket, installation_vorlage, Platzhalter, Hash ─────────

const VORLAGE = {
  bin: 'cli.js',
  args: ['--headless', '--output-dir', '{ausgabe_ordner}', '--allowed-origins', '{projekt_origins}'],
  werkzeuge: ['mcp__obsidian-mcp__search', 'mcp__obsidian-mcp__read'],
}
const PAKET_HERKUNFT = { art: 'extern', url: 'https://github.com/x/mcp-obsidian', paket: 'npm:@scope/mcp-obsidian' }

test('validiereRessourcenDaten (WS-5a): herkunft.paket + installation_vorlage bei extern mcp gültig', () => {
  assert.deepEqual(verstoesseMit(externMcp({ herkunft: PAKET_HERKUNFT, installation_vorlage: VORLAGE })), [])
  assert.deepEqual(verstoesseMit(externMcp({ herkunft: { ...PAKET_HERKUNFT, paket: 'npm:mcp-obsidian' } })), [])
})

test('validiereRessourcenDaten (WS-5a): herkunft.paket — Form npm:<name> nach npm-Regeln', () => {
  for (const paket of ['@scope/x', 'npm:', 'npm:Gross', 'npm:.punkt', 'npm:_unter', 'npm:@scope/', 'npm:a b', 'npm:../x', 'npm:-x', 'npm:--foo', 'npm:@-scope/x', 'pypi:x', `npm:${'a'.repeat(215)}`, 7]) {
    assert.ok(hat(verstoesseMit(externMcp({ herkunft: { ...PAKET_HERKUNFT, paket } })), 'herkunft.paket'), `paket ${String(paket).slice(0, 20)} müsste abgelehnt werden`)
  }
  assert.equal(paketNameAus('npm:@playwright/mcp'), '@playwright/mcp')
  assert.equal(paketNameAus('npm:a.b-c_d~e'), 'a.b-c_d~e')
  assert.equal(paketNameAus(`npm:${'a'.repeat(214)}`), 'a'.repeat(214))
})

test('validiereRessourcenDaten (WS-5a/5b): herkunft.paket nur bei mcp; installation_vorlage je unterart (mcp {bin,args,werkzeuge}, skill {skill_pfad}, agent keine)', () => {
  assert.ok(hat(verstoesseMit(externSkill({ herkunft: { art: 'extern', url: 'https://x', paket: 'npm:x' } })), "herkunft.paket' ist nur bei unterart 'mcp'"))
  assert.ok(hat(verstoesseMit(externSkill({ installation_vorlage: VORLAGE })), "unbekanntes Feld 'ressourcen[3].installation_vorlage.bin'"))
  assert.ok(hat(verstoesseMit(externSkill({ unterart: 'agent', installation_vorlage: { skill_pfad: 'x' } })), "installation_vorlage' ist nur bei typ 'extern' mit unterart 'mcp' oder 'skill'"))
  assert.ok(hat(verstoesseMit(agentEintrag({ installation_vorlage: VORLAGE })), "installation_vorlage' ist nur bei typ 'extern' mit unterart 'mcp' oder 'skill'"))
  assert.deepEqual(verstoesseMit(externSkill({ installation_vorlage: { skill_pfad: 'skills/frontend-design' } })), [])
  for (const skill_pfad of ['', '../x', 'a//b', '/abs', 'a\\b', 'a/./b', 'C:/x', 7]) assert.ok(hat(verstoesseMit(externSkill({ installation_vorlage: { skill_pfad } })), 'installation_vorlage.skill_pfad'), `skill_pfad ${String(skill_pfad)}`)
  assert.ok(hat(verstoesseMit(externSkill({ installation_vorlage: { skill_pfad: 'x', extra: 1 } })), 'installation_vorlage.extra'))
})

test('validiereRessourcenDaten (WS-5a): installation_vorlage — Form, bin relativ, werkzeuge wie R4', () => {
  const mit = (vorlage: unknown) => verstoesseMit(externMcp({ installation_vorlage: vorlage }))
  assert.ok(hat(mit('x'), "installation_vorlage' ist kein Objekt"))
  assert.ok(hat(mit({ ...VORLAGE, extra: 1 }), 'installation_vorlage.extra'))
  for (const bin of ['', '/abs/cli.js', 'C:/cli.js', '..\\cli.js', '../cli.js', 'a//b.js', 'a\\b.js']) assert.ok(hat(mit({ ...VORLAGE, bin }), 'installation_vorlage.bin'), `bin '${bin}'`)
  assert.deepEqual(mit({ ...VORLAGE, bin: 'dist/cli.js' }), [])
  assert.ok(hat(mit({ ...VORLAGE, args: 'x' }), 'installation_vorlage.args'))
  assert.ok(hat(mit({ ...VORLAGE, werkzeuge: [] }), 'installation_vorlage.werkzeuge'))
  assert.ok(hat(mit({ ...VORLAGE, werkzeuge: ['mcp__obsidian-mcp__*'] }), 'keine Wildcard'))
  assert.ok(hat(mit({ ...VORLAGE, werkzeuge: ['mcp__fremd__search'] }), 'installation_vorlage.werkzeuge[0]'))
  assert.ok(hat(mit({ ...VORLAGE, werkzeuge: ['mcp__obsidian-mcp__a', 'mcp__obsidian-mcp__a'] }), 'doppelt'))
})

test('validiereRessourcenDaten (WS-5a): Platzhalter — nur {projekt_origins}/{ausgabe_ordner}, in Vorlage UND installation', () => {
  const unbekannt = { ...VORLAGE, args: ['--x', '{projekt_url}'] }
  assert.ok(hat(verstoesseMit(externMcp({ installation_vorlage: unbekannt })), "unbekannten Platzhalter '{projekt_url}'"))
  const installation = { ...MCP_INSTALLATION, mcp_server: { command: 'node', args: ['cli.js', '--allowed-origins', '{projekt_origins}', '--out={ausgabe_ordner}'] } }
  assert.deepEqual(verstoesseMit(externMcp({ installation })), [])
  const falsch = { ...MCP_INSTALLATION, mcp_server: { command: 'node', args: ['{Projekt_Origins}'] } }
  assert.ok(hat(verstoesseMit(externMcp({ installation: falsch })), 'installation.mcp_server.args[0]'))
  // Einzelne Klammern ohne Platzhalterform bleiben erlaubt.
  assert.deepEqual(verstoesseMit(externMcp({ installation_vorlage: { ...VORLAGE, args: ['{', '}'] } })), [])
})

test('validiereRessourcenDaten (WS-5a): echter Katalog — playwright-mcp trägt paket und Vorlage mit E-F36-7-Startbedingungen', () => {
  // Regel, kein Zwischenstand: auch nach einer committeten Installation (installation + FREIGEGEBEN) grün.
  const katalog = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', 'ressourcen.json'), 'utf8'))
  assert.deepEqual(validiereRessourcenDaten(katalog), [])
  const pw = katalog.ressourcen.find((r: Ressource) => r.id === 'playwright-mcp')
  assert.equal(pw.herkunft.paket, 'npm:@playwright/mcp')
  assert.equal(pw.wirkung, 'lokal')
  assert.deepEqual(pw.installation_vorlage.args, ['--headless', '--isolated', '--output-dir', '{ausgabe_ordner}', '--allowed-origins', '{projekt_origins}'])
  assert.equal(pruefeInstallierbarkeit(pw), null)
  // Installiert heißt: die Startbedingungen aus der Vorlage stehen unverändert in der installation.
  if (pw.installation !== undefined) assert.deepEqual(pw.installation.mcp_server.args.slice(1), pw.installation_vorlage.args)
})

test('ersetzePlatzhalter: ersetzt beide, wirft bei fehlendem Wert oder unbekanntem Platzhalter', () => {
  const args = ['--output-dir', '{ausgabe_ordner}', '--allowed-origins', '{projekt_origins}', 'x={ausgabe_ordner}/y']
  assert.deepEqual(ersetzePlatzhalter(args, { projekt_origins: 'http://localhost:5173;http://127.0.0.1:5173', ausgabe_ordner: '/tmp/l' }), [
    '--output-dir',
    '/tmp/l',
    '--allowed-origins',
    'http://localhost:5173;http://127.0.0.1:5173',
    'x=/tmp/l/y',
  ])
  assert.throws(() => ersetzePlatzhalter(args, { ausgabe_ordner: '/tmp/l' }), /Projekt-URL \(vorschau_url\) fehlt/)
  assert.throws(() => ersetzePlatzhalter(['{ausgabe_ordner}'], { ausgabe_ordner: '' }), /kein Wert/)
  assert.throws(() => ersetzePlatzhalter(['{fremd}'], { ausgabe_ordner: '/x' }), /unbekannter Platzhalter/)
  assert.deepEqual(ersetzePlatzhalter(['--headless'], {}), ['--headless'])
})

test('baueMcpAufruf (WS-5a): Platzhalter ersetzt; ohne projekt_origins wirft er (fail-closed)', () => {
  const mitPlatzhalter = lokalerMcp({
    installation: { version: '1', mcp_server: { command: 'node', args: ['cli.js', '--allowed-origins', '{projekt_origins}', '--output-dir', '{ausgabe_ordner}'] }, werkzeuge: ['mcp__playwright__browser_navigate'] },
  })
  const aufruf = baueMcpAufruf([mitPlatzhalter], { projekt_origins: 'http://localhost:1;http://127.0.0.1:1', ausgabe_ordner: '/aus' })
  assert.deepEqual(JSON.parse(aufruf.mcpConfig).mcpServers.playwright.args, ['cli.js', '--allowed-origins', 'http://localhost:1;http://127.0.0.1:1', '--output-dir', '/aus'])
  assert.throws(() => baueMcpAufruf([mitPlatzhalter], { ausgabe_ordner: '/aus' }), /Projekt-URL \(vorschau_url\) fehlt/)
  assert.throws(() => baueMcpAufruf([mitPlatzhalter]), /Projekt-URL/)
})

test('empfehlungsKennung (F-808): id@sha256 der kanonischen installation — Schlüsselreihenfolge egal, jede Änderung ändert den Hash', () => {
  const kennung = empfehlungsKennung(kandidat('pw'))
  assert.match(kennung, /^pw@[0-9a-f]{64}$/)
  const umsortiert = kandidat('pw', { installation: { werkzeuge: ['mcp__pw__lesen'], mcp_server: { args: ['s.js'], command: 'node' }, version: '1' } })
  assert.equal(empfehlungsKennung(umsortiert), kennung)
  assert.notEqual(empfehlungsKennung(kandidat('pw', { installation: { ...MCP_INSTALL('pw'), mcp_server: { command: 'node', args: ['s.js', '--x'] } } })), kennung)
  assert.notEqual(empfehlungsKennung(kandidat('pw', { installation: { ...MCP_INSTALL('pw'), version: '2' } })), kennung)
})

test('baueEmpfehlung (WS-5a): wirdGenutzt trägt empfehlungId; {projekt_origins} ohne Projekt-URL → passtNichtImLauf mit Grund', () => {
  const mitOrigins = kandidat('pw', { installation: { ...MCP_INSTALL('pw'), mcp_server: { command: 'node', args: ['s.js', '--allowed-origins', '{projekt_origins}'] } } })
  assert.equal(brauchtProjektOrigins(mitOrigins), true)
  assert.equal(brauchtProjektOrigins(kandidat('x')), false)
  const ohne = baueEmpfehlung([mitOrigins, kandidat('x')], KONTEXT)
  assert.deepEqual(ohne.wirdGenutzt.map((e) => e.id), ['x'])
  assert.equal(ohne.wirdGenutzt[0].empfehlungId, empfehlungsKennung(kandidat('x')))
  assert.equal(ohne.passtNichtImLauf[0].id, 'pw')
  assert.ok(ohne.passtNichtImLauf[0].grund.includes(PROJEKT_URL_FEHLT))
  const mit = baueEmpfehlung([mitOrigins], KONTEXT, { projektUrlVorhanden: true })
  assert.deepEqual(mit.wirdGenutzt.map((e) => e.empfehlungId), [empfehlungsKennung(mitOrigins)])
})

test('baueEmpfehlung (WS-5a): installierbar nur für extern mcp lokal mit paket + Vorlage und ohne installation', () => {
  const offen = { freigabe: 'OFFEN' as const, installation: undefined, verfuegbar: false, grund: 'extern, installation fehlt' }
  const vorlage = { bin: 'cli.js', args: ['--allowed-origins', '{projekt_origins}'], werkzeuge: ['mcp__pw__lesen'] }
  const installierbar = kandidat('pw', { ...offen, herkunft: { art: 'extern', url: 'https://x', paket: 'npm:pw' }, installation_vorlage: vorlage })
  const ohnePaket = kandidat('ohne-paket', { ...offen, installation_vorlage: { ...vorlage, werkzeuge: ['mcp__ohne-paket__lesen'] } })
  const e = baueEmpfehlung([installierbar, ohnePaket], KONTEXT)
  assert.equal(e.passtNichtImLauf.find((x) => x.id === 'pw')?.installierbar, true)
  assert.ok((e.passtNichtImLauf.find((x) => x.id === 'pw')?.grund ?? '').includes(PROJEKT_URL_FEHLT))
  assert.equal('installierbar' in (e.passtNichtImLauf.find((x) => x.id === 'ohne-paket') ?? {}), false)
  assert.match(pruefeInstallierbarkeit(ohnePaket) ?? '', /herkunft.paket fehlt/)
  assert.match(pruefeInstallierbarkeit(kandidat('l', { wirkung: 'extern_lesend' })) ?? '', /E-F36-4/)
  assert.match(pruefeInstallierbarkeit(kandidat('s', { unterart: 'skill' })) ?? '', /installation_vorlage \(skill_pfad\) fehlt/)
  assert.match(pruefeInstallierbarkeit(kandidat('w', { typ: 'worker' })) ?? '', /nur typ 'extern' mit unterart 'mcp' oder 'skill'/)
  assert.match(pruefeInstallierbarkeit(kandidat('v', { herkunft: { art: 'extern', url: 'https://x', paket: 'npm:v' } })) ?? '', /installation_vorlage fehlt/)
})

test('loeseRessourcenAuf (WS-5a): mcp mit absolutem command oder bin, der fehlt, ist nicht verfügbar', () => {
  const repo = neuesTestRepo()
  try {
    const bin = join(repo, 'cli.js')
    writeFileSync(bin, '')
    const mit = (command: string, args: string[]) =>
      loeseRessourcenAuf([externRessource({ id: 'pw', unterart: 'mcp', wirkung: 'lokal', freigabe: 'FREIGEGEBEN', installation: { version: '1', mcp_server: { command, args }, werkzeuge: ['mcp__pw__a'] } })], repo, 'x.json')[0]
    assert.equal(mit(process.execPath, [bin, '--x']).verfuegbar, true)
    assert.equal(mit('node', ['relativ.js']).verfuegbar, true, 'nicht absolute Werte werden wie bisher nicht geprüft')
    const ohneBin = mit(process.execPath, [join(repo, 'fehlt.js')])
    assert.equal(ohneBin.verfuegbar, false)
    assert.match(ohneBin.grund, /fehlt\.js' existiert nicht/)
    assert.equal(mit(join(repo, 'kein-node.exe'), [bin]).verfuegbar, false)
  } finally {
    raeumeVerzeichnis(repo)
  }
})
