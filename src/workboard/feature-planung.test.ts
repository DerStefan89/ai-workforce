/**
 * Datei: src/workboard/feature-planung.test.ts
 *
 * Zweck: node:test für die Planungsdaten der Akte (F45 B5b-1a): Priorität, Abgenommen, strenger Abschnitt „## Workstreams“
 * (Kopf, Zellen, Art, Status, Schätzung, Ist, Daten, erledigt ⇒ Abgenommen), Bullet-Abschnitt bleibt Prosa, LF und CRLF,
 * Einbindung in pruefeFeatureAkteInhalt.
 *
 * Wird aufgerufen von: `npm test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pruefeFeatureAkteInhalt } from './feature-akte-pruefung.ts'
import { istIsoDatum, leseSchaetzung, lesePlanung, pruefePlanung, WORKSTREAM_KOPF } from './feature-planung.ts'

const TRENNER = '|---|---|---|---|---|---|---|---|---|'

/** Akte mit Workstream-Zeilen. @param zeilen - Tabellenzeilen @param kopf - Zeilen vor dem Abschnitt @returns Text */
function akte(zeilen: string[], kopf = 'Status: IN_ARBEIT'): string {
  return ['# F9', '', '## Status', kopf, '', '## Workstreams', '', WORKSTREAM_KOPF, TRENNER, ...zeilen, '', 'Prosa danach.', '', '## Danach', 'x', ''].join('\n')
}

test('leseSchaetzung: –, x, min–max mit Komma/Punkt, Formfehler', () => {
  assert.deepEqual(leseSchaetzung('–'), { ok: true, schaetzung: null })
  assert.deepEqual(leseSchaetzung('0,75'), { ok: true, schaetzung: { min: 0.75, max: 0.75 } })
  assert.deepEqual(leseSchaetzung('1–1,25'), { ok: true, schaetzung: { min: 1, max: 1.25 } })
  assert.deepEqual(leseSchaetzung('0.4 - 0.5'), { ok: true, schaetzung: { min: 0.4, max: 0.5 } })
  assert.deepEqual(leseSchaetzung('≈ 0,6'), { ok: false })
})

test('istIsoDatum: gültige und ungültige Kalenderdaten', () => {
  assert.equal(istIsoDatum('2026-10-24'), true)
  assert.equal(istIsoDatum('2026-02-30'), false)
  assert.equal(istIsoDatum('24.10.2026'), false)
})

test('strenger Abschnitt: gültige Zeilen werden gelesen', () => {
  const planung = lesePlanung(akte(['| A | workstream | Eins | erledigt | 0,5 | 0,6 | 2026-10-01 | 2026-10-02 | n |', '| B | fixpaket | Zwei | geplant | – | – | – | – | |']))
  assert.deepEqual(planung.befunde, [])
  assert.equal(planung.workstreams?.length, 2)
  assert.deepEqual(planung.workstreams?.[0], { id: 'A', art: 'workstream', titel: 'Eins', status: 'erledigt', schaetzung: { min: 0.5, max: 0.5 }, ist: 0.6, begonnen: '2026-10-01', abgenommen: '2026-10-02', notiz: 'n' })
  assert.equal(planung.workstreams?.[1].schaetzung, null)
})

test('strenger Abschnitt rot: min > max, erledigt ohne Datum, Art/Status/Datum/Zellen/doppelte ID', () => {
  const befunde = lesePlanung(
    akte([
      '| A | workstream | t | geplant | 2–1 | – | – | – | |',
      '| B | workstream | t | erledigt | 1 | – | – | – | |',
      '| C | bug | t | geplant | – | – | – | – | |',
      '| D | workstream | t | offen | – | – | – | – | |',
      '| E | workstream | t | geplant | – | – | 24.10.2026 | – | |',
      '| F | workstream | t | geplant | – | – |',
      '| A | workstream | t | geplant | – | – | – | – | |',
      '| G | workstream | t | geplant | – | viel | – | – | |',
    ])
  ).befunde
  for (const teil of ['min > max', 'erledigt ohne Abgenommen', 'Art „bug“', 'Status „offen“', 'Begonnen „24.10.2026“', '9 Zellen erwartet', 'ID „A“ doppelt', 'Ist AT „viel“']) {
    assert.ok(befunde.some((b) => b.includes(teil)), `${teil} fehlt in ${befunde.join(' | ')}`)
  }
})

test('strenger Abschnitt rot: falscher Kopf, fehlende Trennzeile', () => {
  const falscherKopf = lesePlanung('## Workstreams\n| ID | Art | Titel |\n|---|---|---|\n').befunde
  assert.ok(falscherKopf[0].includes('Kopfzeile'), falscherKopf.join(' | '))
  const ohneTrenner = lesePlanung(`## Workstreams\n${WORKSTREAM_KOPF}\n| A | workstream | t | geplant | – | – | – | – | |\n`).befunde
  assert.ok(ohneTrenner[0].includes('Trennzeile'), ohneTrenner.join(' | '))
})

test('Bullet-Abschnitt und Workstream-Liste bleiben Prosa (null, kein Befund)', () => {
  assert.deepEqual(lesePlanung('## Workstreams\n\n- WS-1: Text\n'), { prioritaet: null, abgenommen: null, workstreams: null, workstreams_fehlerhaft: false, befunde: [] })
  assert.equal(lesePlanung(`## Workstream-Liste\n${WORKSTREAM_KOPF}\n`).workstreams, null)
  assert.equal(lesePlanung(`## Workstreams (Teil 1)\n${WORKSTREAM_KOPF}\n`).workstreams, null)
})

test('Korrekturrunde: Leerzeile mitten in der Tabelle, Begonnen nach Abgenommen, Verortung über die Tabellenzeile, workstreams_fehlerhaft', () => {
  const unterbrochen = lesePlanung(akte(['| A | workstream | t | geplant | 1 | – | – | – | |', '', '| B | workstream | t | geplant | 1 | – | – | – | |']))
  assert.ok(unterbrochen.befunde.some((b) => b.includes('unterbrochen')), unterbrochen.befunde.join(' | '))
  assert.equal(unterbrochen.workstreams_fehlerhaft, true)
  const prosaTabelle = lesePlanung(akte(['| A | workstream | t | geplant | 1 | – | – | – | |']).replace('Prosa danach.', '| Spalte | andere |\n|---|---|\n| x | y |'))
  assert.deepEqual(prosaTabelle.befunde, [])
  const verdreht = lesePlanung(akte(['| A | workstream | t | erledigt | 1 | 1 | 2026-10-05 | 2026-10-01 | |'])).befunde
  assert.deepEqual(verdreht, ['## Workstreams, Tabellenzeile 3: Begonnen liegt nach Abgenommen'])
  const davor = lesePlanung(`Mehr\nZeilen\ndavor\n${akte(['| A | workstream | t | erledigt | 1 | 1 | 2026-10-05 | 2026-10-01 | |'])}`).befunde
  assert.deepEqual(davor, verdreht)
  assert.equal(lesePlanung(akte(['| A | workstream | t | geplant | 1 | – | – | – | |'])).workstreams_fehlerhaft, false)
})

test('gemischte Zeilenenden in einer Akte', () => {
  const text = akte(['| A | workstream | t | geplant | 1 | – | – | – | |', '| B | workstream | t | geplant | 2 | – | – | – | |'])
  const gemischt = text.split('\n').map((zeile, i) => (i % 2 === 0 ? `${zeile}\r` : zeile)).join('\n')
  assert.deepEqual(lesePlanung(gemischt), lesePlanung(text))
})

test('leere strenge Tabelle ergibt [] (nicht null)', () => {
  assert.deepEqual(lesePlanung(akte([])).workstreams, [])
})

test('LF und CRLF lesen dasselbe', () => {
  const text = akte(['| A | design | Eins | laeuft | 0,4–0,5 | – | 2026-10-24 | – | n |'], 'Status: IN_ARBEIT\nPriorität: P1\nAbgenommen: 2026-10-01 (Stefan)')
  assert.deepEqual(lesePlanung(text.replace(/\n/g, '\r\n')), lesePlanung(text))
  assert.equal(lesePlanung(text).prioritaet, 'P1')
  assert.equal(lesePlanung(text).abgenommen, '2026-10-01')
})

test('Priorität und Abgenommen: Formfehler; Prosa „Abgenommen durch …“ trifft nicht', () => {
  assert.ok(lesePlanung('Priorität: P4\n').befunde[0].includes('Priorität „P4“'))
  assert.ok(lesePlanung('Abgenommen: Stefan, 28.09.2026\n').befunde[0].includes('JJJJ-MM-TT'))
  assert.deepEqual(lesePlanung('Abgenommen durch Stefan am 28.09.2026.\n').befunde, [])
})

test('Abgenommen-Pflicht nur bei ABGESCHLOSSEN mit strengem Abschnitt', () => {
  const streng = akte([], 'Status: ABGESCHLOSSEN')
  assert.ok(pruefePlanung(streng, 'ABGESCHLOSSEN').some((b) => b.includes('verlangt die Zeile')))
  assert.deepEqual(pruefePlanung(akte([], 'Status: ABGESCHLOSSEN\nAbgenommen: 2026-10-24'), 'ABGESCHLOSSEN'), [])
  assert.deepEqual(pruefePlanung('Status: ABGESCHLOSSEN\n## Workstreams\n- WS-1\n', 'ABGESCHLOSSEN'), [])
})

test('pruefeFeatureAkteInhalt meldet Planungsfehler mit', () => {
  const befunde = pruefeFeatureAkteInhalt(akte(['| A | workstream | t | geplant | 2–1 | – | – | – | |']))
  assert.ok(befunde.some((b) => b.includes('min > max')), befunde.join(' | '))
})
