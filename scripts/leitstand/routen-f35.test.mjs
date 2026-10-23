/**
 * Datei: scripts/leitstand/routen-f35.test.mjs
 *
 * Zweck: node:test für die Akte-Routen von F45 B5a-1 (scripts/leitstand/routen-f35.mjs): erkenneAkteRoute,
 * findeSperrendenAblauf (Regel der Anzeige, fail-closed bei unlesbarem Auftrag, beendete Abläufe sperren nicht) und
 * fuehreAkteRouteDurch gegen ein Attrappen-Projekt im tmp (lesen mit hash/entscheidungen, bearbeiten, anlegen,
 * Fehlerpfade). Den echten HTTP-Weg samt CSRF prüft scripts/check-f45-b5a1-akte.mjs. Plattformneutral: Pfade über join.
 * Hinweis: kein Wort für die HTTP-Weiche in dieser Datei (check-f813-csrf (4) liest auch Tests unter scripts/leitstand/).
 *
 * Wird aufgerufen von: `npm test` (node --test).
 */

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { raeumeVerzeichnis } from '../_aufraeumen.ts'
import { erkenneAkteRoute, findeSperrendenAblauf, fuehreAkteRouteDurch } from './routen-f35.mjs'

const wurzeln = []
after(() => {
  for (const w of wurzeln) raeumeVerzeichnis(w)
})

const AKTE = '# F3 — T\n\n## Titel\nT\n\n## Status\nStatus: IN_ARBEIT\n\n## Ziel\nZ.\n\n## Entscheidungen\n- **E-F3-1 = A** — eins.\n\n## Nicht-Ziele\n- N.\n\n## Akzeptanzkriterien\n- AK1: A.\n'
const SCOPE = { titel: 'Neu', problem: 'P.', ziel: 'Z.', in_scope: ['I'], out_of_scope: ['O'], annahmen: [], offene_fragen: [], erfolgskriterium: 'E.' }
const sha = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex')

/** Attrappen-Projekt mit features/<id>/feature.md. @param akten - { id: inhalt } @returns Wurzel */
function projekt(akten) {
  const wurzel = mkdtempSync(join(tmpdir(), 'f45-b5a1-routen-'))
  wurzeln.push(wurzel)
  for (const [id, inhalt] of Object.entries(akten)) {
    mkdirSync(join(wurzel, 'features', id), { recursive: true })
    writeFileSync(join(wurzel, 'features', id, 'feature.md'), inhalt)
  }
  return wurzel
}

/** Kontext ohne Abläufe. @param repoWurzel - Wurzel @param teil - Überschreibungen @returns Kontext */
function kontext(repoWurzel, teil = {}) {
  return { repoWurzel, workflows: async () => [], auftraege: async () => [], bestehendeIds: () => ({ features: readdirSync(join(repoWurzel, 'features')), meilensteine: [] }), datum: '2026-10-23', ...teil }
}

const koerper = (daten) => ({ ok: true, daten })
const bearbeitung = (hash, teil = {}) => koerper({ ziel: 'Neu.', nicht_ziele: ['N.'], akzeptanzkriterien: [{ id: 'AK1', text: 'A.' }], grund: 'weil', hash, ...teil })

test('erkenneAkteRoute: nur die beiden Pfade', () => {
  assert.deepEqual(erkenneAkteRoute('/api/features'), { art: 'anlegen' })
  assert.deepEqual(erkenneAkteRoute('/api/features/F3/akte'), { art: 'akte', rohId: 'F3' })
  assert.equal(erkenneAkteRoute('/api/features/F3/auftrag'), null)
  assert.equal(erkenneAkteRoute('/api/features/'), null)
})

test('findeSperrendenAblauf: offener Ablauf über feature_ref und über workitem_referenz sperrt, beendeter nicht', () => {
  const auftraege = [
    { auftragId: 'a1', feature_ref: 'F3' },
    { auftragId: 'a2', workitem_referenz: 'workitem:feature:F3' },
    { auftragId: 'a3', feature_ref: 'F4' },
  ]
  assert.equal(findeSperrendenAblauf('F3', [{ workflowId: 'w1', auftragId: 'a1', status: 'LAEUFT' }], auftraege).workflowId, 'w1')
  assert.equal(findeSperrendenAblauf('F3', [{ workflowId: 'w2', auftragId: 'a2', status: 'OFFEN' }], auftraege).workflowId, 'w2')
  assert.equal(findeSperrendenAblauf('F3', [{ workflowId: 'w3', auftragId: 'a1', status: null }], auftraege).workflowId, 'w3')
  assert.equal(findeSperrendenAblauf('F3', [{ workflowId: 'w4', auftragId: 'a1', status: 'ABGESCHLOSSEN' }, { workflowId: 'w5', auftragId: 'a2', status: 'GESTOPPT' }], auftraege), null)
  assert.equal(findeSperrendenAblauf('F3', [{ workflowId: 'w6', auftragId: 'a3', status: 'LAEUFT' }, { workflowId: 'w7', auftragId: null, status: 'LAEUFT' }], auftraege), null)
})

test('findeSperrendenAblauf: Auftrag nicht lesbar ⇒ fail-closed; keine Listen ⇒ gesperrt', () => {
  const sperre = findeSperrendenAblauf('F3', [{ workflowId: 'w8', auftragId: 'weg', status: 'LAEUFT' }], [])
  assert.equal(sperre.workflowId, 'w8')
  assert.match(sperre.grund, /nicht lesbar/)
  assert.notEqual(findeSperrendenAblauf('F3', undefined, []), null)
})

test('lesen: hash der Dateibytes und entscheidungen', async () => {
  const wurzel = projekt({ F3: AKTE })
  const antwort = await fuehreAkteRouteDurch({ art: 'akte', rohId: 'F3', aktion: 'lesen' }, null, kontext(wurzel))
  assert.equal(antwort.status, 200)
  assert.equal(antwort.koerper.hash, sha(AKTE))
  assert.deepEqual(antwort.koerper.entscheidungen, [{ id: 'E-F3-1', text: '**E-F3-1 = A** — eins.' }])
})

test('bearbeiten: 200 mit neuem Hash, Git-Block in Blockform, Datei geschrieben', async () => {
  const wurzel = projekt({ F3: AKTE })
  const antwort = await fuehreAkteRouteDurch({ art: 'akte', rohId: 'F3', aktion: 'bearbeiten' }, bearbeitung(sha(AKTE)), kontext(wurzel))
  assert.equal(antwort.status, 200, JSON.stringify(antwort))
  const neu = readFileSync(join(wurzel, 'features', 'F3', 'feature.md'), 'utf8')
  assert.equal(antwort.koerper.hash, sha(neu))
  assert.deepEqual(antwort.koerper.geaendert, ['Ziel'])
  assert.ok(neu.endsWith('## Änderungen\n- 2026-10-23 · Ziel · weil\n'))
  assert.equal(antwort.koerper.git[0], '& {')
  assert.equal(antwort.koerper.git.at(-1), '}')
  assert.ok(antwort.koerper.git.some((z) => z.startsWith('git add -- features/F3/feature.md')))
})

test('bearbeiten: Fehlerpfade 400/404/409/422, Datei unverändert', async () => {
  const wurzel = projekt({ F3: AKTE, F5: AKTE.replace('IN_ARBEIT', 'ABGESCHLOSSEN') })
  const pfad = join(wurzel, 'features', 'F3', 'feature.md')
  const route = (rohId) => ({ art: 'akte', rohId, aktion: 'bearbeiten' })
  const faelle = [
    [route('..%2Fx'), bearbeitung(sha(AKTE)), kontext(wurzel), 400],
    [route('%E0%A4%A'), bearbeitung(sha(AKTE)), kontext(wurzel), 400],
    [route('F99'), bearbeitung(sha(AKTE)), kontext(wurzel), 404],
    [route('F3'), bearbeitung(sha(AKTE), { grund: '' }), kontext(wurzel), 400],
    [route('F3'), { ok: false, status: 413, grund: 'zu groß' }, kontext(wurzel), 413],
    [route('F3'), bearbeitung('b'.repeat(64)), kontext(wurzel), 409],
    [route('F3'), bearbeitung(sha(AKTE)), kontext(wurzel, { workflows: async () => [{ workflowId: 'w1', auftragId: 'a1', status: 'LAEUFT' }], auftraege: async () => [{ auftragId: 'a1', feature_ref: 'F3' }] }), 409],
    [route('F3'), bearbeitung(sha(AKTE), { ziel: 'Z.' }), kontext(wurzel), 422],
    [route('F3'), bearbeitung(sha(AKTE)), kontext(wurzel, { workflows: async () => { throw new Error('kaputt') } }), 500],
  ]
  for (const [r, k, ktx, status] of faelle) {
    const antwort = await fuehreAkteRouteDurch(r, k, ktx)
    assert.equal(antwort.status, status, JSON.stringify({ r, antwort }))
  }
  assert.equal(readFileSync(pfad, 'utf8'), AKTE)
  const abgeschlossen = AKTE.replace('IN_ARBEIT', 'ABGESCHLOSSEN')
  assert.equal((await fuehreAkteRouteDurch(route('F5'), bearbeitung(sha(abgeschlossen)), kontext(wurzel))).status, 422)
  const hash409 = await fuehreAkteRouteDurch(route('F3'), bearbeitung('b'.repeat(64)), kontext(wurzel))
  assert.equal(hash409.koerper.hash, sha(AKTE))
})

test('anlegen: nächste freie ID, 201, zweiter Versuch auf belegte ID ⇒ 409 ohne Überschreiben', async () => {
  const wurzel = projekt({ F3: AKTE })
  const erste = await fuehreAkteRouteDurch({ art: 'anlegen', aktion: 'anlegen' }, koerper({ scope: SCOPE }), kontext(wurzel))
  assert.equal(erste.status, 201, JSON.stringify(erste))
  assert.equal(erste.koerper.id, 'F4')
  const inhalt = readFileSync(join(wurzel, 'features', 'F4', 'feature.md'), 'utf8')
  assert.equal(erste.koerper.hash, sha(inhalt))
  // Veraltete ID-Sicht: die bestehenden IDs ohne F4 ⇒ wieder F4 ⇒ 409, Datei bytegleich.
  const zweite = await fuehreAkteRouteDurch({ art: 'anlegen', aktion: 'anlegen' }, koerper({ scope: SCOPE }), kontext(wurzel, { bestehendeIds: () => ({ features: ['F3'], meilensteine: [] }) }))
  assert.equal(zweite.status, 409)
  assert.equal(readFileSync(join(wurzel, 'features', 'F4', 'feature.md'), 'utf8'), inhalt)
})

test('anlegen: Körperfehler ⇒ 400, kein Ordner angelegt', async () => {
  const wurzel = projekt({ F3: AKTE })
  for (const k of [koerper({}), koerper({ scope: SCOPE, mehr: 1 }), koerper({ scope: { ...SCOPE, ziel: '' } }), koerper([])]) {
    assert.equal((await fuehreAkteRouteDurch({ art: 'anlegen', aktion: 'anlegen' }, k, kontext(wurzel))).status, 400)
  }
  assert.equal(existsSync(join(wurzel, 'features', 'F4')), false)
})
