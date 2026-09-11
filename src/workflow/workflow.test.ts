/**
 * Datei: src/workflow/workflow.test.ts
 *
 * Zweck: node:test-Fälle für src/workflow/index.ts. Zwei Abschnitte:
 * validiereWorkflowDaten (F15 WS-1, unten zuerst) und
 * ermittleNaechstenSchritt (F15 WS-2a, am Ende der Datei — dort steht auch,
 * warum dieser Abschnitt eine eigene, typisierte Testbasis hat).
 *
 * Abschnitt 1 — validiereWorkflowDaten (F15 WS-1). Trägt die
 * Rot-Abdeckung der Formregeln, die scripts/check-f15-workflow.mjs bewusst
 * NICHT als eigene JSON-Fixture führt — Enums, Zahlgrenzen, leere Strings,
 * fehlende Pflichtfelder, unbekannte Felder, Nicht-Objekt-/Nicht-Array-
 * Wurzeln, eingaben-Format. Hier ist ein Rotfall eine Zeile, als Fixture
 * wäre er eine Datei; bei rund dreißig behaupteten Grenzen entscheidet das
 * über Lesbarkeit.
 *
 * Anlass (Reviewer-/QA-Pass 09.09.2026): ARCHITECTURE.md §8 — "Ohne
 * kalibrierten Rot- und Grün-Fall wird sie nicht ERZWUNGEN genannt." Vor
 * dieser Datei kalibrierten fünf Fixtures vier von rund dreißig Regeln;
 * das Streichen etwa der additionalProperties- oder der Enum-Prüfung wäre
 * unbemerkt grün durchgelaufen.
 *
 * Aufbau: jeder Rotfall mutiert genau EIN Feld der gemeinsamen, gültigen
 * Basis aus gueltigerWorkflow(). Bleibt der Grünfall grün und schlägt jede
 * Mutation einzeln fehl, ist die jeweilige Regel wirksam und nicht bloß
 * behauptet.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ermittleNaechstenSchritt, validiereWorkflowDaten } from './index.ts'
import type { WorkflowV0Daten, WorkflowV0Schritt } from './types.ts'

/** Baut einen frischen, gültigen Zweischritt-Workflow als Mutationsbasis. */
function gueltigerWorkflow(): Record<string, unknown> {
  return {
    workflow_schema: 'v0',
    workflow_id: 'test-workflow',
    auftrag_id: 'test-auftrag',
    version: 1,
    ziel: 'Testziel',
    status: 'OFFEN',
    aktiver_schritt_id: 'schritt-1',
    grenzen: { max_schritte: 8, max_replans: 2 },
    schritte: [gueltigerSchritt('schritt-1', 'schritt-2'), gueltigerSchritt('schritt-2', null)],
  }
}

/**
 * Baut einen gültigen Schritt als Mutationsbasis.
 * @param schrittId - schritt_id des Schritts
 * @param nachfolger - schritt_id des Folgeschritts oder null für das Ende
 * @returns gültiges schritte[]-Element
 */
function gueltigerSchritt(schrittId: string, nachfolger: string | null): Record<string, unknown> {
  return {
    schritt_id: schrittId,
    rolle: 'code-reviewer',
    werkzeugsatz: 'lesend',
    worker: 'claude-code',
    modell: 'test-modell',
    eingaben: ['artefakt:auftrag-test-auftrag'],
    output_schema: null,
    freigabe: 'AUTOMATISCH',
    risiko: 'Testrisiko',
    zeitgrenze_ms: 600000,
    nachfolger,
    status: 'OFFEN',
    lauf_id: null,
  }
}

/**
 * Wendet eine Mutation auf die gültige Basis an und liefert das Ergebnis.
 * @param mutiere - ändert den übergebenen Workflow in place
 * @returns Verstoßliste von validiereWorkflowDaten
 */
function pruefeMutiert(mutiere: (w: Record<string, unknown>) => void): string[] {
  const workflow = gueltigerWorkflow()
  mutiere(workflow)
  return validiereWorkflowDaten(workflow)
}

/** Greift auf den ersten Schritt der Basis zu (Testhilfe, spart Casts an jeder Mutation). */
function ersterSchritt(workflow: Record<string, unknown>): Record<string, unknown> {
  return (workflow.schritte as Record<string, unknown>[])[0]
}

test('Grünfall: die Mutationsbasis selbst ist gültig', () => {
  assert.deepStrictEqual(validiereWorkflowDaten(gueltigerWorkflow()), [])
})

test('Grünfall: leeres eingaben-Array und gesetzte optionale Felder sind gültig', () => {
  const verstoesse = pruefeMutiert((w) => {
    const schritt = ersterSchritt(w)
    schritt.eingaben = []
    schritt.output_schema = 'kontrollzustand-laufakte'
    schritt.status = 'ERFOLGREICH'
    schritt.lauf_id = 'lauf-1'
    schritt.worker = 'codex'
    schritt.freigabe = 'EMPFOHLEN'
    w.status = 'LAEUFT'
    w.aktiver_schritt_id = 'schritt-2'
  })
  assert.deepStrictEqual(verstoesse, [])
})

test('Grünfall: freigabe_erteilt darf fehlen und darf true oder false sein (WS-2c (b1))', () => {
  // Die Bestandsverträglichkeit selbst: jede vor (b1) geschriebene Version
  // trägt das Feld nicht und muss gültig bleiben (append-only,
  // ARCHITECTURE.md §7). Die Basis oben hat es nicht — das ist der erste Teil
  // der Zusage; die beiden Mutationen sind der zweite.
  assert.deepStrictEqual(validiereWorkflowDaten(gueltigerWorkflow()), [])
  for (const wert of [true, false]) {
    assert.deepStrictEqual(
      pruefeMutiert((w) => {
        ersterSchritt(w).freigabe_erteilt = wert
      }),
      []
    )
  }
})

test('Grünfall: aktiver_schritt_id darf null sein', () => {
  assert.deepStrictEqual(
    pruefeMutiert((w) => {
      w.aktiver_schritt_id = null
    }),
    []
  )
})

// ─── Rotfälle Wurzelebene ───────────────────────────────────────────────────

const wurzelRotfaelle: [string, (w: Record<string, unknown>) => void][] = [
  ['unbekanntes Feld auf Wurzelebene', (w) => { w.zusatz = 'verboten' }],
  ['unbekanntes Feld in grenzen', (w) => { (w.grenzen as Record<string, unknown>).max_dauer = 1 }],
  ['workflow_schema falsch', (w) => { w.workflow_schema = 'v1' }],
  ['workflow_id leer', (w) => { w.workflow_id = '' }],
  ['workflow_id fehlt', (w) => { delete w.workflow_id }],
  ['auftrag_id leer', (w) => { w.auftrag_id = '' }],
  ['ziel leer', (w) => { w.ziel = '' }],
  ['version 0', (w) => { w.version = 0 }],
  ['version nicht ganzzahlig', (w) => { w.version = 1.5 }],
  ['version als String', (w) => { w.version = '1' }],
  ['status außerhalb des Enums', (w) => { w.status = 'FERTIG' }],
  ['status fehlt', (w) => { delete w.status }],
  ['aktiver_schritt_id fehlt', (w) => { delete w.aktiver_schritt_id }],
  ['aktiver_schritt_id leerer String', (w) => { w.aktiver_schritt_id = '' }],
  ['grenzen fehlt', (w) => { delete w.grenzen }],
  ['grenzen kein Objekt', (w) => { w.grenzen = [] }],
  ['max_schritte 0', (w) => { (w.grenzen as Record<string, unknown>).max_schritte = 0 }],
  ['max_replans negativ', (w) => { (w.grenzen as Record<string, unknown>).max_replans = -1 }],
  ['schritte leer', (w) => { w.schritte = [] }],
  ['schritte kein Array', (w) => { w.schritte = {} }],
  ['schritte fehlt', (w) => { delete w.schritte }],
  ['schritte-Element kein Objekt', (w) => { w.schritte = ['schritt-1'] }],
]

for (const [name, mutiere] of wurzelRotfaelle) {
  test(`Rotfall Wurzel: ${name}`, () => {
    assert.ok(pruefeMutiert(mutiere).length > 0, `${name} wurde fälschlich als gültig gewertet`)
  })
}

// ─── Rotfälle Schrittebene ──────────────────────────────────────────────────

const schrittRotfaelle: [string, (s: Record<string, unknown>) => void][] = [
  ['unbekanntes Feld', (s) => { s.wiederholungen = 3 }],
  ['schritt_id leer', (s) => { s.schritt_id = '' }],
  ['rolle leer', (s) => { s.rolle = '' }],
  ['werkzeugsatz fehlt', (s) => { delete s.werkzeugsatz }],
  ['worker außerhalb des Enums', (s) => { s.worker = 'gemini' }],
  ['modell leer', (s) => { s.modell = '' }],
  ['eingaben kein Array', (s) => { s.eingaben = 'artefakt:x' }],
  ['eingaben ohne artefakt:-Präfix', (s) => { s.eingaben = ['auftrag-test-auftrag'] }],
  ['eingaben nur Präfix ohne Kennung', (s) => { s.eingaben = ['artefakt:'] }],
  ['eingaben-Element kein String', (s) => { s.eingaben = [42] }],
  ['output_schema fehlt', (s) => { delete s.output_schema }],
  ['output_schema leerer String', (s) => { s.output_schema = '' }],
  ['freigabe außerhalb des Enums', (s) => { s.freigabe = 'VIELLEICHT' }],
  ['risiko leer', (s) => { s.risiko = '' }],
  ['zeitgrenze_ms 0', (s) => { s.zeitgrenze_ms = 0 }],
  ['zeitgrenze_ms negativ', (s) => { s.zeitgrenze_ms = -1 }],
  ['zeitgrenze_ms nicht ganzzahlig', (s) => { s.zeitgrenze_ms = 1.5 }],
  ['nachfolger fehlt', (s) => { delete s.nachfolger }],
  ['status außerhalb des Enums', (s) => { s.status = 'FERTIG' }],
  ['lauf_id fehlt', (s) => { delete s.lauf_id }],
  ['lauf_id leerer String', (s) => { s.lauf_id = '' }],
  // WS-2c (b1): optional heißt „darf fehlen", nicht „darf alles sein".
  ['freigabe_erteilt als String', (s) => { s.freigabe_erteilt = 'true' }],
  ['freigabe_erteilt null', (s) => { s.freigabe_erteilt = null }],
]

for (const [name, mutiere] of schrittRotfaelle) {
  test(`Rotfall Schritt: ${name}`, () => {
    assert.ok(
      pruefeMutiert((w) => mutiere(ersterSchritt(w))).length > 0,
      `${name} wurde fälschlich als gültig gewertet`
    )
  })
}

// ─── Rotfälle Querverweise (zusätzlich zu den JSON-Fixtures des Gates) ───────

test('Rotfall Querverweis: Selbstverweis in nachfolger ist ein Zyklus', () => {
  const verstoesse = pruefeMutiert((w) => {
    ersterSchritt(w).nachfolger = 'schritt-1'
  })
  assert.deepStrictEqual(verstoesse, ["'schritte' enthält einen Zyklus über 'nachfolger': schritt-1 -> schritt-1"])
})

test('Rotfall Querverweis: Zweierzyklus wird genau einmal gemeldet', () => {
  const verstoesse = pruefeMutiert((w) => {
    // schritt-1 -> schritt-2 besteht bereits; die Rückkante schließt den Kreis.
    ;(w.schritte as Record<string, unknown>[])[1].nachfolger = 'schritt-1'
  })
  assert.deepStrictEqual(verstoesse, [
    "'schritte' enthält einen Zyklus über 'nachfolger': schritt-1 -> schritt-2 -> schritt-1",
  ])
})

test('Zyklus: ein Vorlauf in den Kreis meldet nur den Kreis, nicht den Vorlauf', () => {
  // schritt-0 -> schritt-1 -> schritt-2 -> schritt-1: schritt-0 gehört nicht dazu.
  //
  // Seit der Zusammenführungsregel (F15 WS-2b) meldet dieselbe Fixture ZWEI Verstöße, und
  // zwangsläufig: ein Vorlauf IN einen Kreis heißt, dass der Einstiegsknoten zwei Vorgänger
  // hat — den von außen und den aus dem Kreis. Beide Meldungen sind richtig. Der Prüfzweck
  // dieses Falls bleibt der Zyklus-Teil: GENAU EINE Zyklusmeldung, und schritt-0 steht nicht
  // darin.
  const workflow = gueltigerWorkflow()
  const schritte = workflow.schritte as Record<string, unknown>[]
  schritte.unshift(gueltigerSchritt('schritt-0', 'schritt-1'))
  schritte[2].nachfolger = 'schritt-1'
  const verstoesse = validiereWorkflowDaten(workflow)
  assert.deepStrictEqual(verstoesse.filter((v) => v.includes('Zyklus')), [
    "'schritte' enthält einen Zyklus über 'nachfolger': schritt-1 -> schritt-2 -> schritt-1",
  ])
  assert.deepStrictEqual(verstoesse, [
    "'schritte' führt 2 Schritte (schritt-0, schritt-2) auf denselben nachfolger 'schritt-1' zusammen — der Lineage-Vorgänger wäre nicht bestimmbar",
    "'schritte' enthält einen Zyklus über 'nachfolger': schritt-1 -> schritt-2 -> schritt-1",
  ])
})

test('Rotfall Querverweis: zwei Schritte auf denselben Nachfolger sind eine Zusammenführung — kein Zyklus, aber ungültig (F15 WS-2b)', () => {
  // Bis WS-2b war das ausdrücklich ein Grünfall. Der Startendpunkt bestimmt den
  // Lineage-Vorgänger über 'nachfolger === schritt_id && lauf_id !== null' und
  // kann bei einer Zusammenführung nur anhalten — ein solcher Plan ist nicht
  // ausführbar und wird deshalb schon beim Anlegen abgelehnt. Die Meldung nennt
  // NUR die Zusammenführung: der Zyklus-Aspekt bleibt richtig, die Gültigkeit nicht.
  const workflow = gueltigerWorkflow()
  const schritte = workflow.schritte as Record<string, unknown>[]
  schritte.unshift(gueltigerSchritt('schritt-0', 'schritt-2'))
  assert.deepStrictEqual(validiereWorkflowDaten(workflow), [
    "'schritte' führt 2 Schritte (schritt-0, schritt-1) auf denselben nachfolger 'schritt-2' zusammen — der Lineage-Vorgänger wäre nicht bestimmbar",
  ])
})

test('Grünfall: eine lineare Kette ist keine Zusammenführung (F15 WS-2b)', () => {
  // Der Grünfall neben der Regel — sonst wäre sie durch ein 'lehnt alles ab' erfüllbar.
  const workflow = gueltigerWorkflow()
  const schritte = workflow.schritte as Record<string, unknown>[]
  schritte.unshift(gueltigerSchritt('schritt-0', 'schritt-1'))
  assert.deepStrictEqual(validiereWorkflowDaten(workflow), [])
})

test('Rotfall Querverweis: leerer String in nachfolger ist ein Verstoß, null nicht', () => {
  assert.ok(pruefeMutiert((w) => { ersterSchritt(w).nachfolger = '' }).length > 0)
  assert.deepStrictEqual(pruefeMutiert((w) => { ersterSchritt(w).nachfolger = null }), [])
})

test('Rotfall Wurzel: Nicht-Objekte werden abgelehnt', () => {
  for (const wert of [null, undefined, 'text', 42, [], true]) {
    assert.deepStrictEqual(validiereWorkflowDaten(wert), ['Wurzel ist kein Objekt'], `Wert ${JSON.stringify(wert)}`)
  }
})

// ─── ermittleNaechstenSchritt (F15 WS-2a) ───────────────────────────────────
//
// Eigene, TYPISIERTE Basis statt der Record<string, unknown>-Mutationsbasis
// oben: validiereWorkflowDaten nimmt bewusst unknown entgegen (sie ist die
// Eingangsprüfung), ermittleNaechstenSchritt bewusst WorkflowV0Daten (sie
// läuft hinter der Prüfung). Beides mit derselben Basis zu bedienen hieße,
// an jeder Zeile zu casten.
//
// Jeder der fünf Ausgänge hat mindestens einen Fall; dazu die beiden Regeln,
// die man am leichtesten falsch baut — EMPFOHLEN startet (statt anzuhalten)
// und Codex hält an (statt still auf claude-code auszuweichen).

/**
 * Baut einen typisierten Schritt.
 * @param schrittId - schritt_id des Schritts
 * @param nachfolger - schritt_id des Folgeschritts oder null für das Ende
 * @param felder - Abweichungen von der Vorgabe (worker, freigabe, lauf_id, …)
 * @returns gültiger WORKFLOW_V0-Schritt
 */
function typisierterSchritt(schrittId: string, nachfolger: string | null, felder: Partial<WorkflowV0Schritt> = {}): WorkflowV0Schritt {
  return {
    schritt_id: schrittId,
    rolle: 'code-reviewer',
    werkzeugsatz: 'lesend',
    worker: 'claude-code',
    modell: 'test-modell',
    eingaben: ['artefakt:auftrag-test-auftrag'],
    output_schema: null,
    freigabe: 'AUTOMATISCH',
    risiko: 'Testrisiko',
    zeitgrenze_ms: 600000,
    nachfolger,
    status: 'OFFEN',
    lauf_id: null,
    ...felder,
  }
}

/**
 * Baut einen typisierten Workflow um eine Schrittliste herum.
 * @param schritte - die Schrittliste
 * @param felder - Abweichungen von der Vorgabe (grenzen, aktiver_schritt_id, …)
 * @returns gültiger WORKFLOW_V0-Datensatz
 */
function typisierterWorkflow(schritte: WorkflowV0Schritt[], felder: Partial<WorkflowV0Daten> = {}): WorkflowV0Daten {
  return {
    workflow_schema: 'v0',
    workflow_id: 'test-workflow',
    auftrag_id: 'test-auftrag',
    version: 1,
    ziel: 'Testziel',
    status: 'OFFEN',
    aktiver_schritt_id: schritte[0]?.schritt_id ?? null,
    grenzen: { max_schritte: 8, max_replans: 2 },
    schritte,
    ...felder,
  }
}

/** Die typisierte Basis muss auch die Laufzeitprüfung bestehen — sonst testen die Fälle unten eine Form, die real nie ankommt. */
test('ermittleNaechstenSchritt: die typisierte Testbasis ist auch laut validiereWorkflowDaten gültig', () => {
  const workflow = typisierterWorkflow([typisierterSchritt('schritt-1', 'schritt-2'), typisierterSchritt('schritt-2', null)])
  assert.deepStrictEqual(validiereWorkflowDaten(workflow), [])
})

test("Ausgang 'starte': Erststart ohne Vorschrittergebnis startet den Cursor-Schritt", () => {
  const workflow = typisierterWorkflow([typisierterSchritt('schritt-1', 'schritt-2'), typisierterSchritt('schritt-2', null)])
  const ergebnis = ermittleNaechstenSchritt(workflow)
  assert.equal(ergebnis.art, 'starte')
  assert.equal(ergebnis.aktiverSchrittId, 'schritt-1')
  assert.equal(ergebnis.art === 'starte' ? ergebnis.schritt.schritt_id : undefined, 'schritt-1')
})

test("Ausgang 'starte': Erststart ohne gesetzten Cursor nimmt den ersten Schritt der Liste", () => {
  const workflow = typisierterWorkflow([typisierterSchritt('schritt-1', 'schritt-2'), typisierterSchritt('schritt-2', null)], {
    aktiver_schritt_id: null,
  })
  const ergebnis = ermittleNaechstenSchritt(workflow)
  assert.equal(ergebnis.art, 'starte')
  assert.equal(ergebnis.aktiverSchrittId, 'schritt-1')
})

test("Ausgang 'starte': nach ERFOLGREICH startet der Folgeschritt", () => {
  const workflow = typisierterWorkflow([
    typisierterSchritt('schritt-1', 'schritt-2', { status: 'ERFOLGREICH', lauf_id: 'lauf-1' }),
    typisierterSchritt('schritt-2', null),
  ])
  const ergebnis = ermittleNaechstenSchritt(workflow, { schrittId: 'schritt-1', ergebnis: 'ERFOLGREICH', laufId: 'lauf-1' })
  assert.equal(ergebnis.art, 'starte')
  assert.equal(ergebnis.aktiverSchrittId, 'schritt-2')
})

test("Ausgang 'starte': freigabe EMPFOHLEN startet automatisch wie AUTOMATISCH (E-M3-1)", () => {
  // Der Unterschied zwischen AUTOMATISCH und EMPFOHLEN ist rein anzeigend und
  // gehört nach WS-3. Hielte der Automat bei EMPFOHLEN an, wäre daraus eine
  // zweite, stille Freigabestufe geworden.
  const workflow = typisierterWorkflow([
    typisierterSchritt('schritt-1', 'schritt-2', { status: 'ERFOLGREICH', lauf_id: 'lauf-1' }),
    typisierterSchritt('schritt-2', null, { freigabe: 'EMPFOHLEN' }),
  ])
  const ergebnis = ermittleNaechstenSchritt(workflow, { schrittId: 'schritt-1', ergebnis: 'ERFOLGREICH', laufId: 'lauf-1' })
  assert.equal(ergebnis.art, 'starte')
  assert.equal(ergebnis.aktiverSchrittId, 'schritt-2')
})

test("Ausgang 'haltFreigabe': freigabe ZWINGEND hält den Automaten an", () => {
  const workflow = typisierterWorkflow([
    typisierterSchritt('schritt-1', 'schritt-2', { status: 'ERFOLGREICH', lauf_id: 'lauf-1' }),
    typisierterSchritt('schritt-2', null, { freigabe: 'ZWINGEND' }),
  ])
  const ergebnis = ermittleNaechstenSchritt(workflow, { schrittId: 'schritt-1', ergebnis: 'ERFOLGREICH', laufId: 'lauf-1' })
  assert.deepStrictEqual(ergebnis, { art: 'haltFreigabe', schrittId: 'schritt-2', aktiverSchrittId: 'schritt-2' })
})

test("Ausgang 'haltFreigabe': ZWINGEND gilt auch beim Erststart", () => {
  const workflow = typisierterWorkflow([typisierterSchritt('schritt-1', null, { freigabe: 'ZWINGEND' })])
  assert.deepStrictEqual(ermittleNaechstenSchritt(workflow), { art: 'haltFreigabe', schrittId: 'schritt-1', aktiverSchrittId: 'schritt-1' })
})

for (const ausgang of ['VERWEIGERT', 'FEHLGESCHLAGEN'] as const) {
  test(`Ausgang 'haltKlaerung': Vorschritt ${ausgang} läuft nicht weiter`, () => {
    const workflow = typisierterWorkflow([
      typisierterSchritt('schritt-1', 'schritt-2', { status: ausgang, lauf_id: 'lauf-1' }),
      typisierterSchritt('schritt-2', null),
    ])
    const ergebnis = ermittleNaechstenSchritt(workflow, { schrittId: 'schritt-1', ergebnis: ausgang, laufId: 'lauf-1' })
    assert.equal(ergebnis.art, 'haltKlaerung')
    // Der Cursor bleibt auf dem gescheiterten Schritt stehen — dort ist zu klären, nicht weiter vorn.
    assert.equal(ergebnis.aktiverSchrittId, 'schritt-1')
    assert.match(ergebnis.art === 'haltKlaerung' ? ergebnis.grund : '', new RegExp(ausgang))
  })
}

test("Ausgang 'starte': worker 'codex' ist dispatchbar (F16 WS-3a, AK10)", () => {
  // Gegenstück zum bis F16 WS-2 hier stehenden Codex-Halt: die WS-2a-
  // [EMPFEHLUNG] ist eingelöst, 'codex' steht in WORKER und startet.
  const workflow = typisierterWorkflow([
    typisierterSchritt('schritt-1', 'schritt-2', { status: 'ERFOLGREICH', lauf_id: 'lauf-1' }),
    typisierterSchritt('schritt-2', null, { worker: 'codex' }),
  ])
  const ergebnis = ermittleNaechstenSchritt(workflow, { schrittId: 'schritt-1', ergebnis: 'ERFOLGREICH', laufId: 'lauf-1' })
  assert.equal(ergebnis.art, 'starte')
  assert.equal(ergebnis.aktiverSchrittId, 'schritt-2')
})

test("Ausgang 'haltFreigabe': ein Codex-Schritt mit ZWINGEND wird dem Menschen vorgelegt statt still zu starten", () => {
  // Bis F16 WS-2 schlug hier der Codex-Halt den Freigabe-Halt. Jetzt ist der
  // Schritt startbar — also ist die Freigabefrage nicht mehr folgenlos und
  // muss gestellt werden.
  const workflow = typisierterWorkflow([typisierterSchritt('schritt-1', null, { worker: 'codex', freigabe: 'ZWINGEND' })])
  assert.equal(ermittleNaechstenSchritt(workflow).art, 'haltFreigabe')
})

// ─── Regel 4b: output_schema an einem Claude-Code-Schritt (AK10) ────────────

test("Ausgang 'haltKlaerung': claude-code mit gesetztem output_schema hält an, statt es still zu ignorieren", () => {
  const workflow = typisierterWorkflow([
    typisierterSchritt('schritt-1', 'schritt-2', { status: 'ERFOLGREICH', lauf_id: 'lauf-1' }),
    typisierterSchritt('schritt-2', null, { worker: 'claude-code', output_schema: 'ergebnis-code-reviewer' }),
  ])
  const ergebnis = ermittleNaechstenSchritt(workflow, { schrittId: 'schritt-1', ergebnis: 'ERFOLGREICH', laufId: 'lauf-1' })
  assert.equal(ergebnis.art, 'haltKlaerung')
  assert.equal(ergebnis.aktiverSchrittId, 'schritt-2')
  assert.match(ergebnis.art === 'haltKlaerung' ? ergebnis.grund : '', /output_schema 'ergebnis-code-reviewer'/)
})

test("Regel 4b schlägt den ZWINGEND-Halt — ein so nicht startbarer Schritt wird nicht zur Freigabe vorgelegt", () => {
  const workflow = typisierterWorkflow([typisierterSchritt('schritt-1', null, { output_schema: 'ergebnis-code-reviewer', freigabe: 'ZWINGEND' })])
  assert.equal(ermittleNaechstenSchritt(workflow).art, 'haltKlaerung')
})

test('Regel 3 schlägt Regel 4b: ein bereits gelaufener Schritt meldet seine Startbereitschaft, nicht sein Schema', () => {
  // Reihenfolge festgenagelt (QA-Pass 11.09.2026): ohne diesen Fall ließe sich
  // Regel 4b vor Regel 3 schieben, und ein längst gelaufener Schritt bekäme
  // einen Grundtext über sein Ausgabeschema statt über seinen Zustand.
  const workflow = typisierterWorkflow(
    [typisierterSchritt('schritt-1', null, { output_schema: 'ergebnis-code-reviewer', status: 'ERFOLGREICH', lauf_id: 'lauf-1' })],
    { aktiver_schritt_id: 'schritt-1' }
  )
  const ergebnis = ermittleNaechstenSchritt(workflow)
  assert.equal(ergebnis.art, 'haltKlaerung')
  assert.match(ergebnis.art === 'haltKlaerung' ? ergebnis.grund : '', /ist nicht startbereit/)
})

test('Regel 4 schlägt Regel 4b: ein unbekannter Worker meldet seine Nicht-Dispatchbarkeit, nicht sein Schema', () => {
  const schritt = typisierterSchritt('schritt-1', null, { output_schema: 'ergebnis-code-reviewer' })
  ;(schritt as unknown as Record<string, unknown>).worker = 'gemini'
  const ergebnis = ermittleNaechstenSchritt(typisierterWorkflow([schritt]))
  assert.equal(ergebnis.art, 'haltKlaerung')
  assert.match(ergebnis.art === 'haltKlaerung' ? ergebnis.grund : '', /nicht dispatchbar/)
})

test("Regel 4b greift NICHT bei worker 'codex' — dort ist output_schema die vorgesehene Angabe", () => {
  // Grün-Gegenprobe: ohne sie wäre Regel 4b auch durch ein pauschales
  // „output_schema hält immer an" erfüllbar.
  const workflow = typisierterWorkflow([typisierterSchritt('schritt-1', null, { worker: 'codex', output_schema: 'ergebnis-code-reviewer' })])
  assert.equal(ermittleNaechstenSchritt(workflow).art, 'starte')
})

test("Ausgang 'haltGrenze': grenzen.max_schritte hält den Automaten an, bevor Worker oder Freigabe zählen", () => {
  const workflow = typisierterWorkflow(
    [
      typisierterSchritt('schritt-1', 'schritt-2', { status: 'ERFOLGREICH', lauf_id: 'lauf-1' }),
      typisierterSchritt('schritt-2', null),
    ],
    { grenzen: { max_schritte: 1, max_replans: 0 } }
  )
  const ergebnis = ermittleNaechstenSchritt(workflow, { schrittId: 'schritt-1', ergebnis: 'ERFOLGREICH', laufId: 'lauf-1' })
  assert.equal(ergebnis.art, 'haltGrenze')
  assert.equal(ergebnis.aktiverSchrittId, null)
})

test("Ausgang 'haltGrenze': der gemeldete Lauf zählt mit, auch wenn seine lauf_id noch nicht in der Liste steht", () => {
  // Sonst hinge die Grenze davon ab, ob der Aufrufer die Schrittliste VOR
  // oder NACH dem Aufruf fortschreibt — und wäre um eins zu spät wirksam.
  const workflow = typisierterWorkflow(
    [typisierterSchritt('schritt-1', 'schritt-2', { status: 'ERFOLGREICH' }), typisierterSchritt('schritt-2', null)],
    { grenzen: { max_schritte: 1, max_replans: 0 } }
  )
  assert.equal(ermittleNaechstenSchritt(workflow, { schrittId: 'schritt-1', ergebnis: 'ERFOLGREICH', laufId: 'lauf-1' }).art, 'haltGrenze')
})

test("Ausgang 'haltGrenze': eine noch nicht erreichte Grenze hält nicht an", () => {
  const workflow = typisierterWorkflow(
    [
      typisierterSchritt('schritt-1', 'schritt-2', { status: 'ERFOLGREICH', lauf_id: 'lauf-1' }),
      typisierterSchritt('schritt-2', null),
    ],
    { grenzen: { max_schritte: 2, max_replans: 0 } }
  )
  assert.equal(ermittleNaechstenSchritt(workflow, { schrittId: 'schritt-1', ergebnis: 'ERFOLGREICH', laufId: 'lauf-1' }).art, 'starte')
})

test("Ausgang 'fertig': ERFOLGREICH ohne nachfolger beendet den Workflow", () => {
  const workflow = typisierterWorkflow([typisierterSchritt('schritt-1', null, { status: 'ERFOLGREICH', lauf_id: 'lauf-1' })])
  assert.deepStrictEqual(ermittleNaechstenSchritt(workflow, { schrittId: 'schritt-1', ergebnis: 'ERFOLGREICH', laufId: 'lauf-1' }), {
    art: 'fertig',
    aktiverSchrittId: null,
  })
})

test("Ausgang 'fertig' schlägt die Grenze: ein beendeter Workflow läuft nicht in haltGrenze", () => {
  const workflow = typisierterWorkflow([typisierterSchritt('schritt-1', null, { status: 'ERFOLGREICH', lauf_id: 'lauf-1' })], {
    grenzen: { max_schritte: 1, max_replans: 0 },
  })
  assert.equal(ermittleNaechstenSchritt(workflow, { schrittId: 'schritt-1', ergebnis: 'ERFOLGREICH', laufId: 'lauf-1' }).art, 'fertig')
})

test('ermittleNaechstenSchritt: ein Ergebnis zu einer unbekannten schritt_id hält an, statt weiterzurechnen', () => {
  const workflow = typisierterWorkflow([typisierterSchritt('schritt-1', null)])
  const ergebnis = ermittleNaechstenSchritt(workflow, { schrittId: 'gibt-es-nicht', ergebnis: 'ERFOLGREICH', laufId: 'lauf-1' })
  assert.equal(ergebnis.art, 'haltKlaerung')
  assert.equal(ergebnis.aktiverSchrittId, null)
})

// ─── Wiederaufnahme ohne Vorschrittergebnis (Reviewer K1 / QA TC-A1..A3) ────
//
// Der gefährlichste Aufruf dieser Funktion ist nicht der nach einem
// Schrittergebnis, sondern der OHNE: so kommt eine Wiederaufnahme nach
// Serverneustart an. Ohne die Regeln unten liefe ein fertiger oder ein an
// einem Klärfall stehen gebliebener Workflow von vorn los — mit echten
// Werkzeugläufen, auf bereits erledigten Schritten.

test('Wiederaufnahme: ein Cursor auf einem bereits gelaufenen Schritt startet ihn NICHT erneut', () => {
  const workflow = typisierterWorkflow(
    [
      typisierterSchritt('schritt-1', 'schritt-2', { status: 'ERFOLGREICH', lauf_id: 'lauf-1' }),
      typisierterSchritt('schritt-2', null),
    ],
    { aktiver_schritt_id: 'schritt-1', status: 'LAEUFT' }
  )
  const ergebnis = ermittleNaechstenSchritt(workflow)
  assert.equal(ergebnis.art, 'haltKlaerung')
  assert.match(ergebnis.art === 'haltKlaerung' ? ergebnis.grund : '', /nicht startbereit/)
})

test('Wiederaufnahme: ein ABGESCHLOSSENER Workflow läuft nicht von vorn los', () => {
  const workflow = typisierterWorkflow([typisierterSchritt('schritt-1', null, { status: 'ERFOLGREICH', lauf_id: 'lauf-1' })], {
    status: 'ABGESCHLOSSEN',
    aktiver_schritt_id: null,
  })
  assert.deepStrictEqual(ermittleNaechstenSchritt(workflow), { art: 'fertig', aktiverSchrittId: null })
})

test('Wiederaufnahme: ein GESTOPPTER Workflow wird nicht automatisch fortgesetzt', () => {
  // F14: der Stopp ist eine Menschenentscheidung. Der Automat hebt sie nicht auf.
  // Alle Schritte bewusst OFFEN und ohne lauf_id — sonst hinge das Ergebnis an
  // der Startbereitschafts-Regel und der Fall prüfte daten.status gar nicht.
  //
  // Seit WS-2c (b1) ist der Ausgang 'haltGestoppt' statt 'haltKlaerung' — ein
  // eigener Ausgang, damit workflowStatusZuAusgang GESTOPPT zurückschreibt und
  // kein Automaten-Schreibpfad den Stopp überschreibt.
  const workflow = typisierterWorkflow([typisierterSchritt('schritt-1', null)], { status: 'GESTOPPT', aktiver_schritt_id: null })
  const ergebnis = ermittleNaechstenSchritt(workflow)
  assert.equal(ergebnis.art, 'haltGestoppt')
  assert.equal(ergebnis.aktiverSchrittId, null)
})

test("Ausgang 'haltGestoppt': der Cursor bleibt stehen, wo er stand", () => {
  // Ein Stopp verschiebt den Cursor nicht — der Ausgang darf ihn deshalb auch
  // nicht auf null zwingen, sonst verlöre ein Stopp mitten in der Kette die
  // Stelle, an der weitergemacht werden könnte.
  const workflow = typisierterWorkflow(
    [typisierterSchritt('schritt-1', 'schritt-2', { status: 'ERFOLGREICH', lauf_id: 'lauf-1' }), typisierterSchritt('schritt-2', null)],
    { status: 'GESTOPPT', aktiver_schritt_id: 'schritt-2' }
  )
  assert.deepStrictEqual(ermittleNaechstenSchritt(workflow), { art: 'haltGestoppt', aktiverSchrittId: 'schritt-2' })
})

test('Wiederaufnahme: ein auf VERWEIGERT stehen gebliebener Schritt wird nicht neu gestartet', () => {
  const workflow = typisierterWorkflow(
    [typisierterSchritt('schritt-1', 'schritt-2', { status: 'VERWEIGERT', lauf_id: 'lauf-1' }), typisierterSchritt('schritt-2', null)],
    { aktiver_schritt_id: 'schritt-1', status: 'KLAERUNG_ERFORDERLICH' }
  )
  assert.equal(ermittleNaechstenSchritt(workflow).art, 'haltKlaerung')
})

test('Wiederaufnahme: ein LAEUFT-Schritt wird nicht ein zweites Mal gestartet', () => {
  const workflow = typisierterWorkflow([typisierterSchritt('schritt-1', null, { status: 'LAEUFT', lauf_id: 'lauf-1' })], {
    aktiver_schritt_id: 'schritt-1',
    status: 'LAEUFT',
  })
  assert.equal(ermittleNaechstenSchritt(workflow).art, 'haltKlaerung')
})

test('Wiederaufnahme: ein UEBERSPRUNGEN-Schritt hält an, statt still übersprungen zu werden', () => {
  // Überspringen hieße, die Kette an ihm vorbei fortzusetzen — eine
  // Replan-Entscheidung, die WS-2a nicht trifft.
  const workflow = typisierterWorkflow(
    [typisierterSchritt('schritt-1', 'schritt-2', { status: 'UEBERSPRUNGEN' }), typisierterSchritt('schritt-2', null)],
    { aktiver_schritt_id: 'schritt-1' }
  )
  assert.equal(ermittleNaechstenSchritt(workflow).art, 'haltKlaerung')
})

test('Wiederaufnahme: WARTET_FREIGABE ist ein startbereiter Schritt-Status', () => {
  // Damit ein nach erteilter Freigabe fortgesetzter Schritt nicht an Regel 3
  // hängen bleibt. Das ist NICHT der Ausweg aus haltFreigabe: `freigabe` ist
  // ein Plandatum und ändert sich durch eine Freigabe nicht — ein Schritt mit
  // freigabe 'ZWINGEND' liefert weiterhin haltFreigabe, egal welchen Status er
  // trägt (nächster Test). Wie eine erteilte Freigabe den Automaten wirklich
  // weiterlaufen lässt, entwirft WS-2b (Reviewer-Pass 10.09.2026, V5/R3).
  const workflow = typisierterWorkflow([typisierterSchritt('schritt-1', null, { status: 'WARTET_FREIGABE' })], {
    aktiver_schritt_id: 'schritt-1',
    status: 'WARTET_FREIGABE',
  })
  assert.equal(ermittleNaechstenSchritt(workflow).art, 'starte')
})

test('Wiederaufnahme: WARTET_FREIGABE hebt ein ZWINGEND nicht auf', () => {
  const workflow = typisierterWorkflow([typisierterSchritt('schritt-1', null, { status: 'WARTET_FREIGABE', freigabe: 'ZWINGEND' })], {
    aktiver_schritt_id: 'schritt-1',
    status: 'WARTET_FREIGABE',
  })
  assert.equal(ermittleNaechstenSchritt(workflow).art, 'haltFreigabe')
})

// ─── Regel 5 mit erteilter Freigabe (WS-2c (b1), löst F-207/F-195) ──────────
//
// Der Ausweg aus WARTET_FREIGABE. Beide Seiten brauchen einen Fall: ohne den
// Grünfall wäre die Regel durch ein „startet nie" erfüllbar, ohne den Rotfall
// durch ein „startet immer" — und Letzteres hieße, dass ein ZWINGEND-Schritt
// ohne jede menschliche Entscheidung losliefe.

test("Ausgang 'starte': ZWINGEND mit freigabe_erteilt true ist startbar", () => {
  const workflow = typisierterWorkflow(
    [typisierterSchritt('schritt-1', null, { status: 'WARTET_FREIGABE', freigabe: 'ZWINGEND', freigabe_erteilt: true })],
    { aktiver_schritt_id: 'schritt-1', status: 'WARTET_FREIGABE' }
  )
  assert.equal(ermittleNaechstenSchritt(workflow).art, 'starte')
})

test("Ausgang 'haltFreigabe': ZWINGEND ohne das Feld hält unverändert an", () => {
  const workflow = typisierterWorkflow([typisierterSchritt('schritt-1', null, { freigabe: 'ZWINGEND' })], { aktiver_schritt_id: 'schritt-1' })
  assert.equal(ermittleNaechstenSchritt(workflow).art, 'haltFreigabe')
})

test("Ausgang 'haltFreigabe': freigabe_erteilt false ist keine Freigabe", () => {
  // Allowlist: nur exakt true startet. Ein false ist der ausdrückliche
  // Vorgabewert und darf sich nicht wie ein fehlendes Feld mit Zweifel lesen.
  const workflow = typisierterWorkflow([typisierterSchritt('schritt-1', null, { freigabe: 'ZWINGEND', freigabe_erteilt: false })], {
    aktiver_schritt_id: 'schritt-1',
  })
  assert.equal(ermittleNaechstenSchritt(workflow).art, 'haltFreigabe')
})

test('freigabe_erteilt hebt weder Regel 4b noch die Startbereitschafts-Regel auf', () => {
  // Die Freigabe erlaubt einen Schritt, sie erzwingt ihn nicht: die Regeln 2-4b
  // stehen VOR ihr und bleiben wirksam. Bis F16 WS-2 stand hier der Codex-Halt;
  // seit AK10 ist Codex dispatchbar, die Rolle übernimmt Regel 4b.
  const mitSchema = typisierterWorkflow(
    [typisierterSchritt('schritt-1', null, { freigabe: 'ZWINGEND', freigabe_erteilt: true, output_schema: 'ergebnis-code-reviewer' })],
    { aktiver_schritt_id: 'schritt-1' }
  )
  assert.equal(ermittleNaechstenSchritt(mitSchema).art, 'haltKlaerung')

  const gelaufen = typisierterWorkflow(
    [typisierterSchritt('schritt-1', null, { freigabe: 'ZWINGEND', freigabe_erteilt: true, status: 'ERFOLGREICH', lauf_id: 'lauf-1' })],
    { aktiver_schritt_id: 'schritt-1' }
  )
  assert.equal(ermittleNaechstenSchritt(gelaufen).art, 'haltKlaerung')
})

test('freigabe_erteilt true auf einem GESTOPPTEN Workflow startet nichts (Regel 0 schlägt Regel 5)', () => {
  const workflow = typisierterWorkflow([typisierterSchritt('schritt-1', null, { freigabe: 'ZWINGEND', freigabe_erteilt: true })], {
    status: 'GESTOPPT',
    aktiver_schritt_id: null,
  })
  assert.equal(ermittleNaechstenSchritt(workflow).art, 'haltGestoppt')
})

// ─── Regel 0 im Zweig MIT Vorschrittergebnis (Reviewer R1) ──────────────────
//
// Der Abbruch-Endpunkt antwortet sofort, ohne auf das Laufende zu warten —
// ein verspätetes Laufergebnis kann also auf einem bereits gestoppten
// Workflow eintreffen. Genau dieser Zweig war die verbliebene Lücke.

test('Regel 0: ein verspätetes ERFOLGREICH setzt einen GESTOPPTEN Workflow nicht fort', () => {
  const workflow = typisierterWorkflow(
    [
      typisierterSchritt('schritt-1', 'schritt-2', { status: 'ERFOLGREICH', lauf_id: 'lauf-1' }),
      typisierterSchritt('schritt-2', null),
    ],
    { status: 'GESTOPPT', aktiver_schritt_id: null }
  )
  // WS-2c (b1): Der Ausgang ist 'haltGestoppt', nicht 'haltKlaerung' — und
  // genau das ist der Punkt. Der Aufrufer schreibt den Ausgang unbesehen
  // zurück; ein haltKlaerung machte aus dem menschlichen Stopp Sekunden später
  // einen wieder fortsetzbaren Workflow.
  const ergebnis = ermittleNaechstenSchritt(workflow, { schrittId: 'schritt-1', ergebnis: 'ERFOLGREICH', laufId: 'lauf-1' })
  assert.equal(ergebnis.art, 'haltGestoppt')
  assert.equal(ergebnis.aktiverSchrittId, null)
})

test('Regel 0: ein Ergebnis zu einem bereits ABGESCHLOSSENEN Workflow ist ein Klärfall, kein Normalende', () => {
  const workflow = typisierterWorkflow(
    [
      typisierterSchritt('schritt-1', 'schritt-2', { status: 'ERFOLGREICH', lauf_id: 'lauf-1' }),
      typisierterSchritt('schritt-2', null),
    ],
    { status: 'ABGESCHLOSSEN', aktiver_schritt_id: null }
  )
  assert.equal(ermittleNaechstenSchritt(workflow, { schrittId: 'schritt-1', ergebnis: 'ERFOLGREICH', laufId: 'lauf-1' }).art, 'haltKlaerung')
})

test('Regel 0: fortsetzbare Workflow-Status bleiben fortsetzbar', () => {
  for (const status of ['OFFEN', 'WARTET_FREIGABE', 'LAEUFT', 'KLAERUNG_ERFORDERLICH'] as const) {
    const workflow = typisierterWorkflow([typisierterSchritt('schritt-1', null)], { status })
    assert.equal(ermittleNaechstenSchritt(workflow).art, 'starte', `status ${status} sollte fortsetzbar sein`)
  }
})

test('Wiederaufnahme mitten in der Kette: der Cursor auf einem offenen Schritt startet diesen', () => {
  const workflow = typisierterWorkflow(
    [
      typisierterSchritt('schritt-1', 'schritt-2', { status: 'ERFOLGREICH', lauf_id: 'lauf-1' }),
      typisierterSchritt('schritt-2', null),
    ],
    { aktiver_schritt_id: 'schritt-2', status: 'LAEUFT' }
  )
  const ergebnis = ermittleNaechstenSchritt(workflow)
  assert.equal(ergebnis.art, 'starte')
  assert.equal(ergebnis.aktiverSchrittId, 'schritt-2')
})

// ─── Allowlist statt Blacklist (Reviewer K2) ────────────────────────────────
//
// Diese beiden Fälle bilden nach, was passiert, wenn jemand WORKER oder
// FREIGABE in index.ts um einen Wert erweitert und types.ts vergisst: der
// Wert kommt real bis hierher. Er MUSS anhalten, nicht starten. Der Cast ist
// genau der Punkt des Tests — die Typen kennen den Wert nicht, die Laufzeit
// schon.

test('Allowlist: ein WORKER-Wert, den die Entscheidungsregel nicht kennt, startet nicht', () => {
  const schritt = typisierterSchritt('schritt-1', null)
  ;(schritt as unknown as Record<string, unknown>).worker = 'gemini'
  const ergebnis = ermittleNaechstenSchritt(typisierterWorkflow([schritt]))
  assert.equal(ergebnis.art, 'haltKlaerung')
  assert.match(ergebnis.art === 'haltKlaerung' ? ergebnis.grund : '', /nicht dispatchbar/)
})

test('Allowlist: eine FREIGABE-Stufe, die die Entscheidungsregel nicht kennt, startet nicht', () => {
  const schritt = typisierterSchritt('schritt-1', null)
  ;(schritt as unknown as Record<string, unknown>).freigabe = 'VIER_AUGEN'
  assert.equal(ermittleNaechstenSchritt(typisierterWorkflow([schritt])).art, 'haltFreigabe')
})

// ─── Verteidigende Zweige (QA TC-A7) ────────────────────────────────────────
//
// Bei validierten Daten unerreichbar — und genau deshalb prüft sonst
// niemand, ob sie noch tun, was ihr Kommentar behauptet.

test('Defensiv: eine leere schritte-Liste hält an, statt auf undefined weiterzurechnen', () => {
  const workflow = typisierterWorkflow([typisierterSchritt('schritt-1', null)])
  workflow.schritte = []
  workflow.aktiver_schritt_id = null
  const ergebnis = ermittleNaechstenSchritt(workflow)
  assert.equal(ergebnis.art, 'haltKlaerung')
  assert.equal(ergebnis.aktiverSchrittId, null)
})

test('Defensiv: ein nachfolger ins Leere hält an', () => {
  const workflow = typisierterWorkflow([
    typisierterSchritt('schritt-1', 'gibt-es-nicht', { status: 'ERFOLGREICH', lauf_id: 'lauf-1' }),
  ])
  const ergebnis = ermittleNaechstenSchritt(workflow, { schrittId: 'schritt-1', ergebnis: 'ERFOLGREICH', laufId: 'lauf-1' })
  assert.equal(ergebnis.art, 'haltKlaerung')
  assert.equal(ergebnis.aktiverSchrittId, null)
})

test('Defensiv: ein Cursor ins Leere hält an', () => {
  const workflow = typisierterWorkflow([typisierterSchritt('schritt-1', null)], { aktiver_schritt_id: 'gibt-es-nicht' })
  assert.equal(ermittleNaechstenSchritt(workflow).art, 'haltKlaerung')
})

// ─── Grenzzählung beim Wiederholungslauf (QA TC-A4) ─────────────────────────

test('Grenze: ein Wiederholungslauf desselben Schritts mit NEUER laufId wird mitgezählt', () => {
  // Vor der Korrektur prüfte die Zählung nur auf lauf_id === null und zählte
  // den Wiederholungslauf nicht mit — die Grenze wirkte um eins zu spät.
  const workflow = typisierterWorkflow(
    [
      typisierterSchritt('schritt-1', 'schritt-2', { status: 'ERFOLGREICH', lauf_id: 'lauf-1' }),
      typisierterSchritt('schritt-2', null),
    ],
    { grenzen: { max_schritte: 2, max_replans: 1 } }
  )
  assert.equal(ermittleNaechstenSchritt(workflow, { schrittId: 'schritt-1', ergebnis: 'ERFOLGREICH', laufId: 'lauf-2' }).art, 'haltGrenze')
})

test('Grenze: derselbe Lauf wird nicht doppelt gezählt', () => {
  const workflow = typisierterWorkflow(
    [
      typisierterSchritt('schritt-1', 'schritt-2', { status: 'ERFOLGREICH', lauf_id: 'lauf-1' }),
      typisierterSchritt('schritt-2', null),
    ],
    { grenzen: { max_schritte: 2, max_replans: 1 } }
  )
  assert.equal(ermittleNaechstenSchritt(workflow, { schrittId: 'schritt-1', ergebnis: 'ERFOLGREICH', laufId: 'lauf-1' }).art, 'starte')
})
