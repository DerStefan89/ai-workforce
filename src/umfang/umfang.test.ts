/**
 * Datei: src/umfang/umfang.test.ts
 *
 * Zweck: node:test-Fälle für den Umfangs-Abgleich (F45 B2b-3d, F-978, features/F45/plan-b2b3d-v2.md): Präfix-Abgleich der
 * berührten Dateien gegen die Bereiche des Arbeitspakets (Pfadtrenner / und \ gleich, Präfix-Falle, Umbenennung,
 * Ausnahme-Pfade), „ohne Bereiche kein Abgleich“ und die Zeile für Review und qa.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { baueUmfangsZeile, gleicheUmfangAb, MAX_ZEILEN_DATEIEN } from './index.ts'

const datei = (pfad: string, alter_pfad?: string) => ({ pfad, ...(alter_pfad !== undefined ? { alter_pfad } : {}) })

test('gleicheUmfangAb: ohne Bereiche (undefined oder leer) ⇒ null, kein Abgleich', () => {
  assert.equal(gleicheUmfangAb([datei('src/a.ts')], undefined), null)
  assert.equal(gleicheUmfangAb([datei('src/a.ts')], []), null)
})

test('gleicheUmfangAb: Datei innerhalb ⇒ leer, außerhalb ⇒ gemeldet, Bereiche wie im Auftrag', () => {
  const ergebnis = gleicheUmfangAb([datei('src/a.ts'), datei('docs/x.md'), datei('src/b/c.ts')], ['src/'])
  assert.deepEqual(ergebnis, { bereiche: ['src/'], ausserhalb: ['docs/x.md'] })
  assert.deepEqual(gleicheUmfangAb([datei('src/a.ts')], ['src']), { bereiche: ['src'], ausserhalb: [] })
})

test('gleicheUmfangAb: Pfadtrenner / und \\ gleich, führendes ./ und Glob-Endungen weg', () => {
  assert.deepEqual(gleicheUmfangAb([datei('src\\export\\csv.ts')], ['src/export'])?.ausserhalb, [])
  assert.deepEqual(gleicheUmfangAb([datei('src/export/csv.ts')], ['src\\export\\'])?.ausserhalb, [])
  assert.deepEqual(gleicheUmfangAb([datei('./src/export/csv.ts')], ['./src/export/**'])?.ausserhalb, [])
  assert.deepEqual(gleicheUmfangAb([datei('src/export/csv.ts')], ['src/export/*'])?.ausserhalb, [])
  assert.deepEqual(gleicheUmfangAb([datei('src//export/csv.ts')], ['src/export'])?.ausserhalb, [])
})

test('gleicheUmfangAb: Präfix-Falle — src/a trifft nicht src/ab.ts, aber die Datei src/a selbst', () => {
  assert.deepEqual(gleicheUmfangAb([datei('src/ab.ts'), datei('src/a'), datei('src/a/x.ts')], ['src/a'])?.ausserhalb, ['src/ab.ts'])
})

test('gleicheUmfangAb: Bereich „.“ trifft alles; leere Bereichseinträge treffen nichts', () => {
  assert.deepEqual(gleicheUmfangAb([datei('a/b.ts'), datei('c.md')], ['.'])?.ausserhalb, [])
  assert.deepEqual(gleicheUmfangAb([datei('a/b.ts')], ['  '])?.ausserhalb, ['a/b.ts'])
})

test('gleicheUmfangAb: Ordnerpfad aus git status (neuer Ordner) — innerhalb nur, wenn ein Bereich ihn ganz umfasst', () => {
  assert.deepEqual(gleicheUmfangAb([datei('src/neu/')], ['src'])?.ausserhalb, [])
  assert.deepEqual(gleicheUmfangAb([datei('src/neu/')], ['src/neu/'])?.ausserhalb, [])
  assert.deepEqual(gleicheUmfangAb([datei('src/neu/')], ['src/neu/index.ts'])?.ausserhalb, ['src/neu/'])
  assert.deepEqual(gleicheUmfangAb([datei('docs/')], ['src/'])?.ausserhalb, ['docs/'])
})

test('gleicheUmfangAb: Umbenennung — liegt der alte oder der neue Pfad außerhalb, wird der neue gemeldet', () => {
  assert.deepEqual(gleicheUmfangAb([datei('src/neu.ts', 'lib/alt.ts')], ['src/'])?.ausserhalb, ['src/neu.ts'])
  assert.deepEqual(gleicheUmfangAb([datei('lib/neu.ts', 'src/alt.ts')], ['src/'])?.ausserhalb, ['lib/neu.ts'])
  assert.deepEqual(gleicheUmfangAb([datei('src/neu.ts', 'src/alt.ts')], ['src/'])?.ausserhalb, [])
})

test('gleicheUmfangAb: Ausnahme-Pfade (Kontrollzustand u. a.) zählen nie als außerhalb', () => {
  assert.deepEqual(gleicheUmfangAb([datei('kontrollzustand/x.json'), datei('stdin-check.js'), datei('docs/y.md')], ['src/'])?.ausserhalb, ['docs/y.md'])
})

test('gleicheUmfangAb: Ergebnis sortiert und eindeutig, Groß-/Kleinschreibung zählt', () => {
  assert.deepEqual(gleicheUmfangAb([datei('z.md'), datei('a.md'), datei('z.md'), datei('SRC/a.ts')], ['src/'])?.ausserhalb, ['SRC/a.ts', 'a.md', 'z.md'])
})

test('baueUmfangsZeile: leer ⇒ leerer Text; sonst der Satz mit den Dateien', () => {
  assert.equal(baueUmfangsZeile([]), '')
  assert.equal(baueUmfangsZeile(['docs/x.md', 'lib/y.ts']), 'Diese Dateien liegen außerhalb der vereinbarten Bereiche: docs/x.md, lib/y.ts')
})

test('baueUmfangsZeile: mehr als die Höchstzahl ⇒ gekürzt mit „… und n weitere“', () => {
  const viele = Array.from({ length: MAX_ZEILEN_DATEIEN + 3 }, (_, i) => `d/${String(i).padStart(3, '0')}.md`)
  const zeile = baueUmfangsZeile(viele)
  assert.ok(zeile.endsWith(`d/${String(MAX_ZEILEN_DATEIEN - 1).padStart(3, '0')}.md … und 3 weitere`), zeile)
  assert.ok(!zeile.includes(`d/${String(MAX_ZEILEN_DATEIEN).padStart(3, '0')}.md`))
})

test('gleicheUmfangAb (Korrekturrunde): ./, .\\, *, ** und ./** bedeuten „das ganze Projekt“', () => {
  for (const alles of ['./', '.\\', '*', '**', './**']) {
    assert.deepEqual(gleicheUmfangAb([datei('a/b.ts'), datei('c.md')], [alles])?.ausserhalb, [], alles)
  }
})

test('gleicheUmfangAb (F45 B2b-3e-2, F-1123 (13)): Umbenennung von außerhalb in einen Ausnahme-Pfad meldet den alten Pfad (wie ein Löschen)', () => {
  assert.deepEqual(gleicheUmfangAb([datei('kontrollzustand/y.json', 'docs/x.md')], ['src/'])?.ausserhalb, ['docs/x.md'])
  assert.deepEqual(gleicheUmfangAb([datei('kontrollzustand/y.json', 'src/x.md')], ['src/'])?.ausserhalb, [], 'alter Pfad innerhalb ⇒ nichts')
  assert.deepEqual(gleicheUmfangAb([datei('kontrollzustand/y.json', 'kontrollzustand/x.json')], ['src/'])?.ausserhalb, [], 'beide Ausnahme ⇒ nichts')
  assert.deepEqual(gleicheUmfangAb([datei('kontrollzustand/y.json')], ['src/'])?.ausserhalb, [], 'ohne Umbenennung ⇒ nichts')
})
