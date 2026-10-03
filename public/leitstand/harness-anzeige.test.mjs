/**
 * Datei: public/leitstand/harness-anzeige.test.mjs
 *
 * Zweck: node:test für die reinen Regeln des Harness-Aufbaus (harness-anzeige.js, F46 D6): Knotenname relativ
 * zum Ort der Spalte, Knoten je Baustein (Bremsen einzeln mit Schloss, fehlende und fehlerhafte Orte), Suche
 * eines Eintrags, Ordner zu einem Katalog-Pfad und der Abgleich `.claude/agents/` gegen den Katalog (Hinweis
 * nur, wenn er sich aus beiden Quellen ergibt).
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { agentsOhneKatalog, findeHarnessEintrag, harnessLeer, harnessOrtZuPfad, knotenFuerBaustein, knotenName } from './harness-anzeige.js'

const datei = (name) => ({ name, art: 'datei', groesse: 10, geaendert: '2026-10-03T08:00:00.000Z' })

/** Antwort wie GET /api/harness (gekürzt). */
const HARNESS = {
  status: 'ok',
  absoluterPfad: 'C:\\Projekte\\ai-workforce',
  name: 'ai-workforce',
  bausteine: [
    {
      id: 'regeln',
      ort: '/',
      eintraege: [
        { pfad: 'CLAUDE.md', art: 'datei', vorhanden: true, status: 'ok', groesse: 8046 },
        { pfad: 'README.md', art: 'datei', vorhanden: false, status: 'ok' },
      ],
    },
    { id: 'wissen', ort: 'docs/', eintraege: [{ pfad: 'docs/adr', art: 'ordner', vorhanden: true, status: 'ok', anzahl: 2, eintraege: [datei('a.md'), { name: 'alt', art: 'ordner' }], gekappt: false }] },
    {
      id: 'rollen',
      ort: '.claude/',
      eintraege: [
        { pfad: '.claude/agents', art: 'ordner', vorhanden: true, status: 'ok', anzahl: 3, eintraege: [datei('code-reviewer.md'), datei('design-guardian.md'), datei('qa.md')], gekappt: false },
        { pfad: '.claude/skills', art: 'ordner', vorhanden: true, status: 'ok', anzahl: 1, eintraege: [{ name: 'advisor-pass', art: 'ordner' }], gekappt: false },
      ],
    },
    {
      id: 'bremsen',
      ort: '.claude/',
      eintraege: [
        { pfad: '.claude/settings.json', art: 'datei', vorhanden: true, status: 'ok', geschuetzt: true },
        { pfad: '.claude/hooks', art: 'ordner', vorhanden: true, status: 'ok', geschuetzt: true, anzahl: 2, eintraege: [datei('commit-guard.cjs'), datei('guard-settings.js')], gekappt: false },
      ],
    },
    {
      id: 'pruefung',
      ort: 'scripts/ · .github/',
      eintraege: [
        { pfad: 'scripts', art: 'ordner', muster: 'check-*.mjs', vorhanden: true, status: 'ok', anzahl: 80, eintraege: [], gekappt: false },
        { pfad: '.github/workflows', art: 'ordner', vorhanden: true, status: 'fehler', grund: 'Verknüpfung zeigt außerhalb der Repo-Wurzel' },
      ],
    },
  ],
}

test('knotenName: relativ zum Ort der Spalte, Ordner mit „/“, Muster statt Pfad, mehrere Präfixe', () => {
  assert.equal(knotenName('CLAUDE.md', '/'), 'CLAUDE.md')
  assert.equal(knotenName('docs/STATUS.md', 'docs/'), 'STATUS.md')
  assert.equal(knotenName('docs/projekt/kontext', 'docs/', { ordner: true }), 'projekt/kontext/')
  assert.equal(knotenName('.claude/agents', '.claude/', { ordner: true }), 'agents/')
  assert.equal(knotenName('scripts', 'scripts/ · .github/', { ordner: true, muster: 'check-*.mjs' }), 'check-*.mjs')
  assert.equal(knotenName('.github/workflows', 'scripts/ · .github/', { ordner: true }), 'workflows/')
  assert.equal(knotenName('.worktreeinclude', 'scripts/ · .github/'), '.worktreeinclude')
})

test('knotenFuerBaustein: Bremsen einzeln mit Schloss; Ordner mit Anzahl; fehlend und fehlerhaft markiert', () => {
  const bremsen = knotenFuerBaustein(HARNESS.bausteine[3])
  assert.deepEqual(
    bremsen.map((k) => [k.name, k.pfad, k.art, k.geschuetzt]),
    [
      ['settings.json', '.claude/settings.json', 'datei', true],
      ['hooks/commit-guard.cjs', '.claude/hooks/commit-guard.cjs', 'datei', true],
      ['hooks/guard-settings.js', '.claude/hooks/guard-settings.js', 'datei', true],
    ]
  )
  const rollen = knotenFuerBaustein(HARNESS.bausteine[2])
  assert.deepEqual(
    rollen.map((k) => [k.name, k.art, k.anzahl, k.geschuetzt]),
    [
      ['agents/', 'ordner', 3, false],
      ['skills/', 'ordner', 1, false],
    ]
  )
  const regeln = knotenFuerBaustein(HARNESS.bausteine[0])
  assert.equal(regeln[1].vorhanden, false, 'README.md fehlt')
  const pruefung = knotenFuerBaustein(HARNESS.bausteine[4])
  assert.equal(pruefung[0].name, 'check-*.mjs')
  assert.equal(pruefung[1].fehler, true)
  assert.match(pruefung[1].grund, /außerhalb/)
  // Geschützter Ordner ohne Dateien (oder fehlend) bleibt ein Ordnerknoten.
  const ohneHooks = knotenFuerBaustein({ id: 'bremsen', ort: '.claude/', eintraege: [{ pfad: '.claude/hooks', art: 'ordner', vorhanden: false, status: 'ok', geschuetzt: true }] })
  assert.deepEqual(
    ohneHooks.map((k) => [k.name, k.art, k.vorhanden]),
    [['hooks/', 'ordner', false]]
  )
  // Ein Unterordner oder eine Verknüpfung in den Bremsen: nicht zerlegen, damit nichts still verschwindet.
  const gemischt = knotenFuerBaustein({ id: 'bremsen', ort: '.claude/', eintraege: [{ pfad: '.claude/hooks', art: 'ordner', vorhanden: true, status: 'ok', geschuetzt: true, anzahl: 3, eintraege: [datei('a.cjs'), { name: 'alt', art: 'ordner' }, { name: 'link.cjs', art: 'sonstiges' }], gekappt: false }] })
  assert.deepEqual(
    gemischt.map((k) => [k.name, k.art, k.anzahl, k.geschuetzt]),
    [['hooks/', 'ordner', 3, true]]
  )
  assert.deepEqual(knotenFuerBaustein(null), [])
  assert.deepEqual(knotenFuerBaustein({ eintraege: [null, 'x', { pfad: 1 }] }), [])
})

test('findeHarnessEintrag: Eintrag der Liste oder direkte Datei eines Ordners, sonst null', () => {
  assert.equal(findeHarnessEintrag(HARNESS, 'CLAUDE.md').eintrag.groesse, 8046)
  const hook = findeHarnessEintrag(HARNESS, '.claude/hooks/commit-guard.cjs')
  assert.equal(hook.eintrag.pfad, '.claude/hooks')
  assert.equal(hook.datei.name, 'commit-guard.cjs')
  assert.equal(hook.baustein.id, 'bremsen')
  assert.equal(findeHarnessEintrag(HARNESS, 'docs/adr/alt'), null, 'Unterordner ist keine Datei')
  assert.equal(findeHarnessEintrag(HARNESS, 'docs/adr/../CLAUDE.md'), null)
  assert.equal(findeHarnessEintrag(null, 'CLAUDE.md'), null)
})

test('harnessOrtZuPfad: Katalog-Pfad → gelisteter Ordner bzw. Datei; Unbekanntes → null', () => {
  assert.equal(harnessOrtZuPfad(HARNESS, '.claude/skills/advisor-pass'), '.claude/skills')
  assert.equal(harnessOrtZuPfad(HARNESS, '.claude/agents/qa.md'), '.claude/agents/qa.md', 'direkte Datei vor dem Ordner')
  assert.equal(harnessOrtZuPfad(HARNESS, '.claude/agents/gibt-es-nicht.md'), '.claude/agents', 'fehlt die Datei: der Ordner')
  assert.equal(harnessOrtZuPfad(HARNESS, '.claude/skills/'), '.claude/skills')
  assert.equal(harnessOrtZuPfad(HARNESS, 'CLAUDE.md'), 'CLAUDE.md')
  assert.equal(harnessOrtZuPfad(HARNESS, 'README.md'), null, 'fehlender Ort')
  assert.equal(harnessOrtZuPfad(HARNESS, 'src/irgendwas'), null)
  assert.equal(harnessOrtZuPfad(null, '.claude/skills/x'), null)
  assert.equal(harnessOrtZuPfad(HARNESS, ''), null)
})

test('agentsOhneKatalog: nur, was der Abgleich ergibt — design-guardian fehlt im Katalog', () => {
  const katalog = [
    { id: 'qa', typ: 'agent', herkunft: { art: 'agent', pfad: '.claude/agents/qa.md' } },
    { id: 'reviewer', typ: 'agent', herkunft: { art: 'agent', pfad: '.claude/agents/code-reviewer.md' } },
    { id: 'design-guardian', typ: 'skill' },
  ]
  assert.deepEqual(agentsOhneKatalog(HARNESS, katalog), ['design-guardian'], 'id nur als Skill zählt nicht; Pfad deckt code-reviewer')
  assert.deepEqual(agentsOhneKatalog(HARNESS, [...katalog, { id: 'design-guardian', typ: 'agent' }]), [], 'alle im Katalog → kein Hinweis')
  assert.deepEqual(agentsOhneKatalog(null, katalog), [], 'ohne Harness kein Hinweis')
  assert.deepEqual(agentsOhneKatalog(HARNESS, null), [], 'ohne Katalog kein Hinweis')
  const gekappt = structuredClone(HARNESS)
  gekappt.bausteine[2].eintraege[0].gekappt = true
  assert.deepEqual(agentsOhneKatalog(gekappt, katalog), [], 'unvollständige Liste → kein Hinweis')
  const fehlt = structuredClone(HARNESS)
  fehlt.bausteine[2].eintraege[0] = { pfad: '.claude/agents', art: 'ordner', vorhanden: false, status: 'ok' }
  assert.deepEqual(agentsOhneKatalog(fehlt, katalog), [])
})

test('harnessLeer: nur wenn kein einziger Ort vorhanden ist', () => {
  assert.equal(harnessLeer(HARNESS), false)
  assert.equal(harnessLeer({ bausteine: [{ eintraege: [{ pfad: 'CLAUDE.md', vorhanden: false }] }] }), true)
  assert.equal(harnessLeer({}), true)
})
