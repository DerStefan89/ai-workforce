/**
 * Datei: scripts/zustand-sichern.test.mjs
 *
 * Zweck: Prüft die reinen Teile von scripts/zustand-sichern.mjs (F-733):
 * Branchnamen-Vergabe mit Kollisionszähler (auch gegen Remote-Refs),
 * Porcelain-Parsen, Filterung „außerhalb kontrollzustand/“, die
 * Altlasten-Ausnahmeliste und den Mengenabgleich nach dem Staging. Der Git-
 * Ablauf selbst ist im Gate scripts/check-zustand-sichern.mjs belegt.
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  FREIGABE_HINWEIS,
  fehlendeGestagte,
  formatiereDatum,
  kurznamenAusRefs,
  istAltlast,
  istZustandPfad,
  naechsteBefehle,
  parsePorcelain,
  teileAenderungen,
  waehleBranchName,
} from './zustand-sichern.mjs'

test('waehleBranchName nimmt zustand/<datum>, wenn frei', () => {
  assert.equal(waehleBranchName('2026-09-25', new Set()), 'zustand/2026-09-25')
})

test('waehleBranchName zählt bei Kollision -2, -3 … hoch', () => {
  assert.equal(waehleBranchName('2026-09-25', new Set(['zustand/2026-09-25'])), 'zustand/2026-09-25-2')
  assert.equal(
    waehleBranchName('2026-09-25', new Set(['zustand/2026-09-25', 'zustand/2026-09-25-2'])),
    'zustand/2026-09-25-3'
  )
})

test('formatiereDatum liefert JJJJ-MM-TT mit führenden Nullen', () => {
  assert.equal(formatiereDatum(new Date(2026, 0, 5)), '2026-01-05')
})

test('istZustandPfad trifft nur kontrollzustand/ selbst, keinen Namensvetter', () => {
  assert.equal(istZustandPfad('kontrollzustand/a/b.json'), true)
  assert.equal(istZustandPfad('kontrollzustand'), true)
  assert.equal(istZustandPfad('kontrollzustand-alt/x.json'), false)
  assert.equal(istZustandPfad('src/kontrollzustand/x.ts'), false)
})

test('istAltlast: Präfix state/nachweis-runde2-* und exakt stdin-check.js', () => {
  assert.equal(istAltlast('state/nachweis-runde2-turns.sh'), true)
  assert.equal(istAltlast('stdin-check.js'), true)
  assert.equal(istAltlast('scripts/stdin-check.js'), false)
  assert.equal(istAltlast('state/nachweis-runde3-x.json'), false)
})

test('parsePorcelain liest -z-Ausgabe inklusive Umbenennung mit Ursprungspfad', () => {
  const ausgabe = '?? kontrollzustand/a.json\0 M src/x.ts\0R  kontrollzustand/neu.json\0alt/weg.json\0'
  assert.deepEqual(parsePorcelain(ausgabe), [
    { status: '??', pfad: 'kontrollzustand/a.json' },
    { status: ' M', pfad: 'src/x.ts' },
    { status: 'R ', pfad: 'kontrollzustand/neu.json' },
    { status: 'R ', pfad: 'alt/weg.json' },
  ])
})

test('teileAenderungen trennt kontrollzustand/, Altlasten und Fremdes', () => {
  const eintraege = parsePorcelain('?? kontrollzustand/a.json\0?? stdin-check.js\0?? state/nachweis-runde2-x.json\0 M README.md\0')
  assert.deepEqual(teileAenderungen(eintraege), {
    zustand: ['kontrollzustand/a.json'],
    altlasten: ['stdin-check.js', 'state/nachweis-runde2-x.json'],
    fremd: ['README.md'],
  })
})

test('teileAenderungen wertet eine bereits gestagte Altlast als fremd', () => {
  const eintraege = parsePorcelain('A  stdin-check.js\0?? state/nachweis-runde2-x.json\0')
  assert.deepEqual(teileAenderungen(eintraege), {
    zustand: [],
    altlasten: ['state/nachweis-runde2-x.json'],
    fremd: ['stdin-check.js'],
  })
})

test('kurznamenAusRefs streift refs/heads/ und refs/remotes/<remote>/ ab', () => {
  const ausgabe = 'refs/heads/zustand/2026-09-25\nrefs/remotes/origin/zustand/2026-09-25-2\nrefs/remotes/origin/HEAD\n'
  assert.deepEqual(kurznamenAusRefs(ausgabe), new Set(['zustand/2026-09-25', 'zustand/2026-09-25-2', 'HEAD']))
  assert.equal(waehleBranchName('2026-09-25', kurznamenAusRefs(ausgabe)), 'zustand/2026-09-25-3')
})

test('fehlendeGestagte meldet erwartete, aber nicht gestagte Pfade', () => {
  assert.deepEqual(fehlendeGestagte(['kontrollzustand/a', 'kontrollzustand/b'], ['kontrollzustand/a']), ['kontrollzustand/b'])
  assert.deepEqual(fehlendeGestagte(['kontrollzustand/a'], ['kontrollzustand/a']), [])
})

test('naechsteBefehle: Commit vor Push, keine Freigabe-Zeile, genau ein Freigabe-Hinweis (F-736)', () => {
  const befehle = naechsteBefehle('C:/repo', 'zustand/2026-09-25', '2026-09-25')
  const commitIndex = befehle.findIndex((b) => b.startsWith('git commit'))
  const pushIndex = befehle.findIndex((b) => b.startsWith('git push -u origin zustand/2026-09-25'))
  assert.ok(commitIndex >= 0 && pushIndex > commitIndex)
  assert.match(befehle[commitIndex], /chore\(zustand\): Kontrollzustand sichern 2026-09-25/)
  assert.equal(befehle.at(-1), 'git checkout main; git pull')
  assert.equal(befehle.filter((b) => b.includes('Set-Content')).length, 0)
  const freigabeZeilen = befehle.filter((b) => b.includes('freigabe-commit.md'))
  assert.deepEqual(freigabeZeilen, [FREIGABE_HINWEIS])
  assert.ok(FREIGABE_HINWEIS.startsWith('#'), 'der Hinweis muss als Kommentar, nicht als Befehl erscheinen')
})
