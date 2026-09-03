/**
 * Datei: scripts/erzeuge-invocation-policy-nachweise.test.mjs
 *
 * Zweck: Selbsttest für scripts/erzeuge-invocation-policy-nachweise.mjs
 * (F6b WS-E, state/tasks/f6b-ws-e-baseline-und-nachweis-real-erzeugen.md).
 * Prüft `ermittleHookPfade` gegen eine feste settings.json-Fixture (keine
 * hartkodierte Pfadliste im Produktionscode nötig) und `erzeugeNachweise`
 * gegen ein Wegwerf-Zielverzeichnis (mkdtempSync) — NICHT das reale
 * externe Autorisierungs-Repo. Liest dabei bewusst das reale lokale
 * `.claude/settings.json` samt Hook-Dateien (der Sinn des Skripts ist,
 * den echten Ist-Zustand zu messen) — nur das Schreibziel ist eine
 * Attrappe.
 *
 * Wird aufgerufen von:
 * - `npm run test` / `npm run check` (node --test, Standard-Glob für
 *   Dateien mit Endung ".test.mjs").
 *
 * Wichtig: Ruft `erzeugeNachweise` nie mit repoWurzel = dem realen
 * externen Repo auf (siehe NICHT-Klausel des Vertrags).
 */

import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { validiereBaselineEintrag, validiereWirksamkeitsnachweisEintrag } from '../src/invocation-policy/index.ts'
import { ermittleHookPfade, erzeugeNachweise } from './erzeuge-invocation-policy-nachweise.mjs'

const ISTUEBRIGEFELDER_FIXTURE = {
  werkzeug_version_deklariert: '2.1.241',
  berechtigungskontext: 'ws-e-selbsttest',
  arbeitsverzeichnis_pfad: 'C:\\Users\\stefa\\Projekte\\ai-workforce',
  startziel_pfad: 'C:\\Program Files\\claude\\claude.exe',
}

test('ermittleHookPfade: leitet Hook-Pfade strukturell aus geparstem settings.json ab (matcher + matcherlos, mehrere Ereignisse)', () => {
  const fixture = {
    hooks: {
      PreToolUse: [
        { matcher: 'Edit|Write', hooks: [{ type: 'command', command: 'node .claude/hooks/guard-settings.js' }] },
        { matcher: 'Bash', hooks: [{ type: 'command', command: 'node .claude/hooks/commit-guard.cjs' }] },
      ],
      UserPromptSubmit: [{ hooks: [{ type: 'command', command: 'node .claude/hooks/session-reminder.cjs' }] }],
    },
  }
  const pfade = ermittleHookPfade(fixture)
  assert.deepEqual(pfade, ['.claude/hooks/commit-guard.cjs', '.claude/hooks/guard-settings.js', '.claude/hooks/session-reminder.cjs'])
})

test('ermittleHookPfade: leeres/fehlendes hooks-Objekt liefert leeres Array, kein Wurf', () => {
  assert.deepEqual(ermittleHookPfade({}), [])
  assert.deepEqual(ermittleHookPfade(null), [])
})

test('ermittleHookPfade: normalisiert Backslash-Pfade und dedupliziert einen mehrfach referenzierten Hook', () => {
  const fixture = {
    hooks: {
      PreToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command: 'node .claude\\hooks\\guard-settings.js' }] }],
      SessionStart: [{ hooks: [{ type: 'command', command: 'node .claude/hooks/guard-settings.js' }] }],
    },
  }
  assert.deepEqual(ermittleHookPfade(fixture), ['.claude/hooks/guard-settings.js'])
})

test('erzeugeNachweise: schreibt Baseline + Wirksamkeitsnachweis gegen ein Wegwerf-Zielverzeichnis, beide schemakonform', () => {
  const repoWurzel = mkdtempSync(join(tmpdir(), 'ws-e-selbsttest-'))
  try {
    const ergebnis = erzeugeNachweise({
      repoWurzel,
      istUebrigeFelder: ISTUEBRIGEFELDER_FIXTURE,
      rotFallBeleg: 'Selbsttest — kein echter Rot-Fall-Nachweis',
      baselineId: 'selbsttest-baseline',
      nachweisId: 'selbsttest-nachweis',
    })

    assert.equal(ergebnis.baselinePfad, join(repoWurzel, 'invocation-policy-baseline', 'selbsttest-baseline.json'))
    assert.equal(ergebnis.nachweisPfad, join(repoWurzel, 'invocation-policy-wirksamkeitsnachweis', 'selbsttest-nachweis.json'))

    const baselineAufDisk = JSON.parse(readFileSync(ergebnis.baselinePfad, 'utf8'))
    const nachweisAufDisk = JSON.parse(readFileSync(ergebnis.nachweisPfad, 'utf8'))

    assert.deepEqual(validiereBaselineEintrag(baselineAufDisk), [])
    assert.deepEqual(validiereWirksamkeitsnachweisEintrag(nachweisAufDisk), [])

    assert.ok(baselineAufDisk.schutzskripte.length >= 1, 'mindestens ein real referenziertes Schutzskript erwartet')
    for (const eintrag of baselineAufDisk.schutzskripte) {
      assert.ok(eintrag.pfad.startsWith('.claude/hooks/'), `Schutzskript-Pfad sollte repo-relativ unter .claude/hooks/ liegen: ${eintrag.pfad}`)
      assert.match(eintrag.hash, /^[0-9a-f]{64}$/)
    }
    assert.equal(baselineAufDisk.werkzeug_konfiguration.pfad, '.claude/settings.json')
    assert.match(baselineAufDisk.werkzeug_konfiguration.hash, /^[0-9a-f]{64}$/)

    assert.equal(nachweisAufDisk.gueltigkeitsschluessel.werkzeug_konfiguration_hash, baselineAufDisk.werkzeug_konfiguration.hash)
    assert.deepEqual(
      nachweisAufDisk.gueltigkeitsschluessel.schutzskript_hashes.slice().sort(),
      baselineAufDisk.schutzskripte.map((e) => e.hash).sort()
    )
    assert.equal(nachweisAufDisk.gueltigkeitsschluessel.werkzeug_version_deklariert, ISTUEBRIGEFELDER_FIXTURE.werkzeug_version_deklariert)
    assert.equal(nachweisAufDisk.rot_fall_beleg, 'Selbsttest — kein echter Rot-Fall-Nachweis')
  } finally {
    rmSync(repoWurzel, { recursive: true, force: true })
  }
})

test('erzeugeNachweise: fehlendes Pflichtfeld im Gültigkeitsschlüssel wirft VOR jedem Schreibvorgang', () => {
  const repoWurzel = mkdtempSync(join(tmpdir(), 'ws-e-selbsttest-rotfall-'))
  try {
    assert.throws(
      () =>
        erzeugeNachweise({
          repoWurzel,
          istUebrigeFelder: { ...ISTUEBRIGEFELDER_FIXTURE, berechtigungskontext: '' },
          rotFallBeleg: 'Selbsttest',
        }),
      /verletzt sein Schema/
    )
  } finally {
    rmSync(repoWurzel, { recursive: true, force: true })
  }
})
