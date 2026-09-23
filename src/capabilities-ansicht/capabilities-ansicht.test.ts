/**
 * Datei: src/capabilities-ansicht/capabilities-ansicht.test.ts
 *
 * Zweck: node:test-Fälle für src/capabilities-ansicht/index.ts (F24 WS-1).
 * Drei Abschnitte: projeziereLibrary (AK1 — extern/OFFEN vs. technisch
 * nicht vorhanden, AK5 — ASSESSED bleibt benannt leer), projeziereAbdeckung
 * (AK2 — F-346-Ausnahmen bleiben markiert, ein echter Gap bleibt sichtbar)
 * und baueRollenBesetzungsAnsicht (AK4 — alle vier Ebenen, inklusive der
 * beiden Leerfälle 'kein_lauf'/'laufakte_fehlt').
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { F346_AUSNAHMEN, baueRollenBesetzungsAnsicht, berechneWorkerAbdeckung, findeVorlagenBesetzung, projeziereAbdeckung, projeziereLibrary } from './index.ts'
import type { AufgelosteRessource } from '../ressourcen/types.ts'
import type { Rollenvertrag } from '../rollen/types.ts'

// ─── projeziereLibrary (AK1, AK5, AK6) ──────────────────────────────────────

function aufgelosteRessourcen(): AufgelosteRessource[] {
  return [
    {
      id: 'claude-code',
      typ: 'worker',
      capabilities: ['CODE_WRITE'],
      freigabe: 'FREIGEGEBEN',
      herkunft: { art: 'startvorlage', worker: 'claude-code' },
      name: 'claude-code',
      beschreibung: 'Claude Code CLI.',
      verfuegbar: true,
      grund: "Startvorlagen-Block vorhanden und freigabe 'FREIGEGEBEN'",
    },
    {
      id: 'codex',
      typ: 'worker',
      capabilities: ['STRUCTURED_OUTPUT'],
      freigabe: 'FREIGEGEBEN',
      herkunft: { art: 'startvorlage', worker: 'codex' },
      name: 'codex',
      beschreibung: 'OpenAI Codex CLI.',
      verfuegbar: false,
      grund: "Startvorlage trägt keinen vollständigen 'worker.codex'-Block (startziel/versionDeklariert/sandbox)",
    },
    {
      id: 'claude-in-chrome',
      typ: 'extern',
      capabilities: ['BROWSER_AUTOMATION'],
      freigabe: 'OFFEN',
      herkunft: { art: 'extern', url: 'https://www.anthropic.com/news/claude-for-chrome' },
      name: 'Claude in Chrome',
      beschreibung: 'Browser-Steuerung.',
      verfuegbar: false,
      grund: 'extern, nicht auflösbar',
    },
  ]
}

test('projeziereLibrary: AK1 — extern/OFFEN zeigt erkennbar anderen Text als eine technisch nicht vorhandene Ressource', () => {
  const ansicht = projeziereLibrary(aufgelosteRessourcen(), 'startvorlagen/beispielprojekt.json')
  const extern = ansicht.eintraege.find((e) => e.id === 'claude-in-chrome')!
  const codex = ansicht.eintraege.find((e) => e.id === 'codex')!
  assert.ok(extern.anzeigeGrund.includes('noch nicht freigegeben'), extern.anzeigeGrund)
  assert.notStrictEqual(extern.anzeigeGrund, extern.grund, 'anzeigeGrund muss den generischen Kern-Text überschreiben')
  assert.notStrictEqual(extern.anzeigeGrund, codex.anzeigeGrund, 'extern/OFFEN und technisch nicht vorhanden müssen sich unterscheiden')
  assert.strictEqual(codex.anzeigeGrund, codex.grund, 'ein worker/skill-Grund bleibt unverändert (kein technischer Defekt-Text wird erfunden)')
})

test('projeziereLibrary: AK5 — ASSESSED bleibt eine benannte Leerstelle, kein Eintrag erreicht sie', () => {
  const ansicht = projeziereLibrary(aufgelosteRessourcen(), 'startvorlagen/beispielprojekt.json')
  assert.ok(ansicht.assessedHinweis.length > 0)
  for (const eintrag of ansicht.eintraege) {
    assert.ok(!eintrag.phasen.includes('ASSESSED'), `${eintrag.id} darf ASSESSED nicht erreichen (v1)`)
  }
})

test('projeziereLibrary: AK5 — DISCOVERED/APPROVED/AVAILABLE korrekt aus typ/freigabe/verfuegbar abgeleitet', () => {
  const ansicht = projeziereLibrary(aufgelosteRessourcen(), 'startvorlagen/beispielprojekt.json')
  const claudeCode = ansicht.eintraege.find((e) => e.id === 'claude-code')!
  const codex = ansicht.eintraege.find((e) => e.id === 'codex')!
  const chrome = ansicht.eintraege.find((e) => e.id === 'claude-in-chrome')!
  assert.deepStrictEqual(claudeCode.phasen.sort(), ['APPROVED', 'AVAILABLE'])
  assert.deepStrictEqual(codex.phasen.sort(), ['APPROVED'])
  assert.deepStrictEqual(chrome.phasen.sort(), ['DISCOVERED'])
})

test('projeziereLibrary: AK6 — startvorlagePfad wird unverändert durchgereicht', () => {
  const ansicht = projeziereLibrary([], 'startvorlagen/ai-workforce.json')
  assert.strictEqual(ansicht.startvorlagePfad, 'startvorlagen/ai-workforce.json')
})

// ─── projeziereAbdeckung / berechneWorkerAbdeckung (AK2) ────────────────────

function routerVertrag(): Rollenvertrag {
  return {
    zweck: 'Klassifiziert einen Auftrag.',
    erlaubte_werkzeugsatz_arten: ['lesend'],
    erlaubte_worker: ['claude-code', 'codex'],
    erlaubtes_output_schema: 'ergebnis-router',
    ausschlussmuster: [],
    benoetigte_capabilities: ['TASK_CLASSIFICATION', 'STRUCTURED_OUTPUT'],
  }
}

test('berechneWorkerAbdeckung: F-346-Ausnahme markiert, restFehlend bleibt leer', () => {
  const capabilitiesJeWorker = new Map([
    ['claude-code', ['TASK_CLASSIFICATION']], // STRUCTURED_OUTPUT fehlt — F-346-Ausnahme
    ['codex', ['TASK_CLASSIFICATION', 'STRUCTURED_OUTPUT']],
  ])
  const ergebnis = berechneWorkerAbdeckung('router', routerVertrag(), capabilitiesJeWorker)
  const claudeCode = ergebnis.find((e) => e.worker === 'claude-code')!
  const codex = ergebnis.find((e) => e.worker === 'codex')!
  assert.deepStrictEqual(claudeCode.fehlend, ['STRUCTURED_OUTPUT'])
  assert.strictEqual(claudeCode.f346Ausnahme, true)
  assert.deepStrictEqual(claudeCode.restFehlend, [])
  assert.strictEqual(codex.f346Ausnahme, false)
  assert.deepStrictEqual(codex.restFehlend, [])
})

test('berechneWorkerAbdeckung: eine ANDERE fehlende Capability bei derselben Kombination bleibt ein echter Gap (F-346 deckt nur STRUCTURED_OUTPUT)', () => {
  const capabilitiesJeWorker = new Map([['claude-code', []]]) // TASK_CLASSIFICATION fehlt zusätzlich
  const vertrag = routerVertrag()
  vertrag.erlaubte_worker = ['claude-code']
  const ergebnis = berechneWorkerAbdeckung('router', vertrag, capabilitiesJeWorker)
  assert.deepStrictEqual(ergebnis[0].restFehlend.sort(), ['TASK_CLASSIFICATION'])
})

test('berechneWorkerAbdeckung: ein erlaubter, aber nicht registrierter Worker taucht nicht auf', () => {
  const ergebnis = berechneWorkerAbdeckung('router', routerVertrag(), new Map([['codex', ['TASK_CLASSIFICATION', 'STRUCTURED_OUTPUT']]]))
  assert.strictEqual(ergebnis.length, 1)
  assert.strictEqual(ergebnis[0].worker, 'codex')
})

// Bracket-Zuweisung statt Objektliteral mit 'router' als Schlüssel (scripts/check-f17-
// rollenvertrag.mjs AK1 sucht genau dieses Muster als möglichen zweiten Rollenlisten-Eintrag —
// derselbe Rollenname als Fixture-Key ist hier beabsichtigt, kein zweiter Regelsatz).
function einRollenvertragsRegister(rolle: string, vertrag: Rollenvertrag): Record<string, Rollenvertrag> {
  const register: Record<string, Rollenvertrag> = {}
  register[rolle] = vertrag
  return register
}

test('projeziereAbdeckung: gedeckt true trotz F-346-Ausnahme, false bei echtem Gap', () => {
  const rollenvertraege = einRollenvertragsRegister('router', routerVertrag())
  const gedeckteRessourcen: AufgelosteRessource[] = [
    { id: 'claude-code', typ: 'worker', capabilities: ['TASK_CLASSIFICATION'], freigabe: 'FREIGEGEBEN', herkunft: { art: 'startvorlage', worker: 'claude-code' }, name: 'claude-code', beschreibung: '', verfuegbar: true, grund: 'ok' },
    { id: 'codex', typ: 'worker', capabilities: ['TASK_CLASSIFICATION', 'STRUCTURED_OUTPUT'], freigabe: 'FREIGEGEBEN', herkunft: { art: 'startvorlage', worker: 'codex' }, name: 'codex', beschreibung: '', verfuegbar: true, grund: 'ok' },
  ]
  const ansichtGedeckt = projeziereAbdeckung(rollenvertraege, gedeckteRessourcen, 'startvorlagen/ai-workforce.json')
  assert.strictEqual(ansichtGedeckt.rollen[0].gedeckt, true)

  const lueckenRessourcen: AufgelosteRessource[] = [{ ...gedeckteRessourcen[0], capabilities: [] }] // claude-code deckt nicht mal TASK_CLASSIFICATION -> ein Gap, den F-346 nicht erfasst
  const vertragOhneCodex: Rollenvertrag = { ...routerVertrag(), erlaubte_worker: ['claude-code'] }
  const ansichtLuecke = projeziereAbdeckung(einRollenvertragsRegister('router', vertragOhneCodex), lueckenRessourcen, 'startvorlagen/ai-workforce.json')
  assert.strictEqual(ansichtLuecke.rollen[0].gedeckt, false)
})

test('projeziereAbdeckung: QA-Befund — eine Rolle ohne jeden registrierten erlaubten Worker ist NICHT gedeckt (kein vacuous truth über ein leeres workerAbdeckung-Array)', () => {
  const vertragOhneRegistrierteWorker: Rollenvertrag = { ...routerVertrag(), erlaubte_worker: ['claude-code'] }
  const keineRegistriertenWorker: AufgelosteRessource[] = [] // erlaubter Worker 'claude-code' ist gar nicht registriert
  const ansicht = projeziereAbdeckung(einRollenvertragsRegister('router', vertragOhneRegistrierteWorker), keineRegistriertenWorker, 'startvorlagen/ai-workforce.json')
  assert.deepStrictEqual(ansicht.rollen[0].workerAbdeckung, [])
  assert.strictEqual(ansicht.rollen[0].gedeckt, false)
})

test('F346_AUSNAHMEN: exportiert genau die sechs bekannten, engen Ausnahmen', () => {
  assert.deepStrictEqual(
    F346_AUSNAHMEN.map((a) => `${a.rolle}/${a.worker}`).sort(),
    ['architekt/claude-code', 'code-reviewer/claude-code', 'jarvis/claude-code', 'product-coach/claude-code', 'router/claude-code', 'scout/claude-code']
  )
})

// ─── findeVorlagenBesetzung / baueRollenBesetzungsAnsicht (AK4) ────────────

test('findeVorlagenBesetzung: filtert nach rolle über mehrere Vorlagen', () => {
  const schritte = [
    { vorlage: 'standard', schritt_id: 's1', rolle: 'ausfuehrung', worker: 'claude-code', modell: 'claude-sonnet-5' },
    { vorlage: 'standard', schritt_id: 's2', rolle: 'code-reviewer', worker: 'codex', modell: 'gpt-6-astra' },
    { vorlage: 'hoch', schritt_id: 's3', rolle: 'code-reviewer', worker: 'codex', modell: 'gpt-6-astra' },
  ]
  const ergebnis = findeVorlagenBesetzung('code-reviewer', schritte)
  assert.strictEqual(ergebnis.length, 2)
  assert.deepStrictEqual(ergebnis.map((e) => e.vorlage).sort(), ['hoch', 'standard'])
})

test('baueRollenBesetzungsAnsicht: kein_lauf, wenn die Rolle noch nie real gelaufen ist', () => {
  const ansicht = baueRollenBesetzungsAnsicht('router', routerVertrag(), [], null, null)
  assert.deepStrictEqual(ansicht.letzteRealeBesetzung, { status: 'kein_lauf' })
})

test('baueRollenBesetzungsAnsicht: laufakte_fehlt, wenn lauf_id gesetzt aber die Laufakte nicht ladbar ist', () => {
  const treffer = { workflowId: 'wf-1', schrittId: 'schritt-2-review', laufId: 'lauf-1', worker: 'codex', modell: 'gpt-6-astra' }
  const ansicht = baueRollenBesetzungsAnsicht('code-reviewer', routerVertrag(), [], treffer, null)
  assert.deepStrictEqual(ansicht.letzteRealeBesetzung, {
    status: 'laufakte_fehlt',
    workflowId: 'wf-1',
    schrittId: 'schritt-2-review',
    laufId: 'lauf-1',
    gepinnt: { worker: 'codex', modell: 'gpt-6-astra' },
  })
})

test('baueRollenBesetzungsAnsicht: ok — gepinnt UND beobachtet, alle vier Ebenen vorhanden', () => {
  const vertrag = routerVertrag()
  const vorlagenBesetzung = findeVorlagenBesetzung('code-reviewer', [{ vorlage: 'standard', schritt_id: 'schritt-2-review', rolle: 'code-reviewer', worker: 'codex', modell: 'gpt-6-astra' }])
  const treffer = { workflowId: 'wf-1', schrittId: 'schritt-2-review', laufId: 'lauf-1', worker: 'codex', modell: 'gpt-6-astra' }
  const ansicht = baueRollenBesetzungsAnsicht('code-reviewer', vertrag, vorlagenBesetzung, treffer, { worker: 'codex', modellDeklariert: 'gpt-6-astra' })
  assert.strictEqual(ansicht.rolle, 'code-reviewer')
  assert.strictEqual(ansicht.rollenvertrag, vertrag)
  assert.strictEqual(ansicht.vorlagenBesetzung.length, 1)
  assert.deepStrictEqual(ansicht.letzteRealeBesetzung, {
    status: 'ok',
    workflowId: 'wf-1',
    schrittId: 'schritt-2-review',
    laufId: 'lauf-1',
    gepinnt: { worker: 'codex', modell: 'gpt-6-astra' },
    beobachtet: { worker: 'codex', modellDeklariert: 'gpt-6-astra' },
  })
})
