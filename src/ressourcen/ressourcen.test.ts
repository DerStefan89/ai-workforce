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
import { loeseRessourcenAuf, pruefeAbdeckung, ressourcenFuerCapability, validiereRessourcenDaten } from './index.ts'
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
        capabilities: ['BROWSER_AUTOMATION'],
        freigabe: 'OFFEN',
        herkunft: { art: 'extern', url: 'https://github.com/microsoft/playwright-mcp' },
      },
    ],
  }
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

test('validiereRessourcenDaten: R2 — typ extern muss freigabe OFFEN tragen', () => {
  const daten = gueltigeDaten()
  ;(daten.ressourcen as Record<string, unknown>[])[2].freigabe = 'FREIGEGEBEN'
  const verstoesse = validiereRessourcenDaten(daten)
  assert.ok(verstoesse.some((v) => v.includes('(R2)')), JSON.stringify(verstoesse))
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

test('loeseRessourcenAuf: typ extern ist immer verfuegbar false', () => {
  const repoWurzel = neuesTestRepo()
  try {
    const ressourcen: Ressource[] = [
      {
        id: 'playwright-mcp',
        typ: 'extern',
        name: 'Playwright MCP',
        beschreibung: 'Browser-Automatisierung.',
        capabilities: ['BROWSER_AUTOMATION'],
        freigabe: 'OFFEN',
        herkunft: { art: 'extern', url: 'https://github.com/microsoft/playwright-mcp' },
      },
    ]
    const [aufgeloest] = loeseRessourcenAuf(ressourcen, repoWurzel, 'startvorlagen/unbenutzt.json')
    assert.strictEqual(aufgeloest.verfuegbar, false)
    assert.strictEqual(aufgeloest.grund, 'extern, nicht auflösbar')
    assert.strictEqual(aufgeloest.name, 'Playwright MCP')
  } finally {
    raeumeVerzeichnis(repoWurzel)
  }
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
