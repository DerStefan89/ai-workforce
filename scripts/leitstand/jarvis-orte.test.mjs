/**
 * Datei: scripts/leitstand/jarvis-orte.test.mjs
 *
 * Zweck: Tests für scripts/leitstand/jarvis-orte.mjs (F45 B2b-4b) — Auswahl offener Arbeitsordner (Status, Ordner, Pfad,
 * höchstens 5, neueste zuerst), Titel (Auftragstitel, Ziel, einzeilig, gekürzt, Kennung nur ohne beides) und die Optionen für
 * den Jarvis-Auftrag (Blockform und Ortszeilen aus code-daten.js).
 *
 * Wird aufgerufen von: npm test (node --test).
 */

import assert from 'node:assert/strict'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import test from 'node:test'
import { BLOCK_FUSS, BLOCK_KOPF, ortZeile } from '../../public/leitstand/code-daten.js'
import { MAX_ABLAUF_ORTE, ablaufTitel, baueJarvisOrte, waehleOffeneArbeitsordner } from './jarvis-orte.mjs'

/**
 * Ein Eintrag wie für GET /api/arbeitsordner.
 * @param workflowId - Kennung
 * @param am - aktualisiert_am
 * @param zusatz - überschreibt Felder von daten bzw. ordnerVorhanden
 * @returns Eintrag
 */
function eintrag(workflowId, am, { status = 'BEREIT', pfad = `C:\\wt\\${workflowId}`, ordnerVorhanden = true } = {}) {
  return { workflowId, daten: { status, pfad, branch: `wf/${workflowId}`, basis_commit: null, grund: null, aktualisiert_am: am }, ordnerVorhanden }
}

test('waehleOffeneArbeitsordner: nur BEREIT mit vorhandenem Ordner und absolutem Pfad ohne Störzeichen, neueste zuerst, höchstens 5 + 1 (Signal „weitere“)', () => {
  const eintraege = [
    eintrag('a', '2026-10-01T00:00:00Z'),
    eintrag('b', '2026-10-07T00:00:00Z'),
    eintrag('c', '2026-10-03T00:00:00Z'),
    eintrag('d', '2026-10-05T00:00:00Z'),
    eintrag('e', '2026-10-02T00:00:00Z'),
    eintrag('f', '2026-10-06T00:00:00Z'),
    eintrag('g', '2026-10-09T00:00:00Z', { status: 'ENTFERNT' }),
    eintrag('h', '2026-10-09T00:00:00Z', { status: 'FEHLGESCHLAGEN' }),
    eintrag('i', '2026-10-09T00:00:00Z', { status: 'IN_VORBEREITUNG' }),
    eintrag('j', '2026-10-09T00:00:00Z', { ordnerVorhanden: false }),
    eintrag('k', '2026-10-09T00:00:00Z', { pfad: 'relativ\\k' }),
    eintrag('l', '2026-10-09T00:00:00Z', { pfad: 'C:\\wt\\l\nx' }),
    eintrag('n', '2026-10-09T00:00:00Z', { pfad: 'C:\\wt\\n\u2028x' }),
    eintrag('o', '2026-10-09T00:00:00Z', { pfad: 'C:\\wt\\o\u202ex' }),
    { workflowId: 'm', daten: null, ordnerVorhanden: false },
  ]
  const offene = waehleOffeneArbeitsordner(eintraege)
  assert.equal(MAX_ABLAUF_ORTE, 5)
  assert.deepEqual(
    offene.map((ao) => ao.workflowId),
    ['b', 'f', 'd', 'c', 'e', 'a'],
  )
  assert.deepEqual(waehleOffeneArbeitsordner([]), [])
})

test('ablaufTitel: Auftragstitel, sonst Ziel; einzeilig, Anführungszeichen ersetzt, ≤ 80 Codepoints; Kennung nur ohne beides', () => {
  assert.equal(ablaufTitel({ titel: 'Export als CSV', ziel: 'z', workflowId: 'wf-1' }), 'Export als CSV')
  assert.equal(ablaufTitel({ titel: '  ', ziel: 'Ziel\nmit\tUmbruch', workflowId: 'wf-1' }), 'Ziel mit Umbruch')
  assert.equal(ablaufTitel({ titel: 'Der „neue“ Export', ziel: '', workflowId: 'wf-1' }), "Der 'neue' Export")
  const lang = ablaufTitel({ titel: undefined, ziel: `${'ä'.repeat(100)}`, workflowId: 'wf-1' })
  assert.equal([...lang].length, 80)
  assert.ok(lang.endsWith('…'))
  assert.equal([...ablaufTitel({ titel: '😀'.repeat(90), workflowId: 'x' })].length, 80, 'Kürzung nach Codepoints')
  assert.equal(ablaufTitel({ titel: undefined, ziel: undefined, workflowId: 'wf-1' }), 'Ablauf wf-1')
  assert.equal(ablaufTitel({ titel: null, ziel: '\u0007', workflowId: 'wf-2' }), 'Ablauf wf-2')
  assert.equal(ablaufTitel({ titel: 'A\u202eB\u200bC\u2028D', workflowId: 'x' }), 'A B C D', 'Bidi-, Nullbreiten- und Trennzeichen raus')
})

test('baueJarvisOrte: Blockform und Ortszeilen aus code-daten.js, Reihenfolge bleibt, höchstens 5', () => {
  // repoWurzel geht durch resolve: echter absoluter Pfad der laufenden Plattform (C:\… wäre unter Linux relativ, CI);
  // die Ablauf-Pfade gehen nicht durch resolve und bleiben Windows-Pfade.
  const projekt = resolve(tmpdir(), 'haushalt')
  const orte = baueJarvisOrte(projekt, [
    { workflowId: 'b', pfad: "C:\\wt\\it's", titel: 'B' },
    { workflowId: 'a', pfad: 'C:\\wt\\a', ziel: 'Ziel A' },
  ])
  assert.deepEqual(orte.block, { kopf: BLOCK_KOPF, ortZeile: ortZeile(projekt), fuss: BLOCK_FUSS })
  assert.deepEqual(orte.ablaufOrte, [
    { titel: 'B', ortZeile: "Set-Location -LiteralPath 'C:\\wt\\it''s' -ErrorAction Stop" },
    { titel: 'Ziel A', ortZeile: ortZeile('C:\\wt\\a') },
  ])
  assert.equal(orte.weitereAblaufOrte, false)
  const sechs = Array.from({ length: 6 }, (_, i) => ({ workflowId: `w${i}`, pfad: `C:\\wt\\${i}`, titel: `T${i}` }))
  assert.equal(baueJarvisOrte('C:\\p', sechs).ablaufOrte.length, 5)
  assert.equal(baueJarvisOrte('C:\\p', sechs).weitereAblaufOrte, true)
  assert.equal(baueJarvisOrte('C:\\p', sechs.slice(0, 5)).weitereAblaufOrte, false)
  assert.deepEqual(baueJarvisOrte('C:\\p', []).ablaufOrte, [])
  assert.deepEqual(baueJarvisOrte('C:\\p', [{ workflowId: 'x', pfad: 'C:\\mein projekt-laeufe\\a[1]', titel: 'T' }]).ablaufOrte[0].ortZeile, "Set-Location -LiteralPath 'C:\\mein projekt-laeufe\\a[1]' -ErrorAction Stop")
})
