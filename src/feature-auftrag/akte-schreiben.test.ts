/**
 * Datei: src/feature-auftrag/akte-schreiben.test.ts
 *
 * Zweck: node:test für F45 B5a-1 „Akte schreiben“ (features/F45/plan-b5a1-v2.md): pruefeAkteAenderung (Körperregeln,
 * Normalisierung), bearbeiteFeatureAkte (nur die drei Abschnitte, Rest bytegleich bei LF und CRLF, Änderungszeile mit und
 * ohne Abschnitt, fehlende Abschnitte, Bearbeitbarkeit A3, Status C15, nichts geändert, Gate) und die neuen Leser
 * findeAbschnitt/leseFeatureEntscheidungen (src/feature-auftrag/index.ts). Plattformneutral: nur Zeichenketten, keine Pfade.
 *
 * Wird aufgerufen von: `npm test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { type AkteAenderung, bearbeiteFeatureAkte, erkenneZeilenende, pruefeAkteAenderung } from './akte-schreiben.ts'
import { findeAbschnitt, leseAbschnitt, leseFeatureAkteAnzeige, leseFeatureEntscheidungen } from './index.ts'

const HASH = 'a'.repeat(64)

const AKTE = [
  '# F9 — Gate',
  '',
  '## Titel',
  'Gate',
  '',
  '## Status',
  'Status: IN_ARBEIT',
  '',
  '## Ziel',
  'Altes Ziel.',
  '',
  '## Entscheidungen',
  '- **E-F9-1 = A** (Stefan) — erste.',
  '- **Sammlung als Basis** — keine Kennung, Muster E-F9-7 im Text.',
  '- E-188 ohne Sternchen.',
  '- E-Mail-Versand ist keine Kennung.',
  '',
  '## Nicht-Ziele',
  '- Nicht A.',
  '',
  '## Akzeptanzkriterien',
  '- AK1: Eins.',
  '- AK2: Zwei',
  '  weiter.',
  '',
  '## Stand X',
  'Bleibt **exakt** so.   ',
  '',
].join('\n')

/** Gültige Änderung (Basis: Werte der AKTE). @param teil - abweichende Felder @returns Änderung */
function aenderung(teil: Partial<AkteAenderung> = {}): AkteAenderung {
  return {
    ziel: 'Altes Ziel.',
    nicht_ziele: ['Nicht A.'],
    akzeptanzkriterien: [
      { id: 'AK1', text: 'Eins.' },
      { id: 'AK2', text: 'Zwei\nweiter.' },
    ],
    grund: 'Test',
    ...teil,
  }
}

/**
 * Entfernt die Spannen der genannten Abschnitte (Überschrift bis vor die nächste) — für den Bytevergleich außerhalb.
 * @param text - Akte
 * @param namen - Abschnittsnamen
 * @returns Rest
 */
function ohneAbschnitte(text: string, namen: string[]): string {
  let rest = text
  for (const name of namen) {
    const spanne = findeAbschnitt(rest, name)
    if (spanne !== null) rest = rest.slice(0, spanne.kopfStart) + rest.slice(spanne.koerperEnde)
  }
  return rest
}

test('pruefeAkteAenderung: gültig, normalisiert (Zeilenenden, Leerraum in grund)', () => {
  const p = pruefeAkteAenderung({ ziel: '  Z\r\n\r\nzwei  ', nicht_ziele: [' a \r\n b '], akzeptanzkriterien: [{ id: 'AK3', text: 'x' }], grund: ' kurz \n und gut ', hash: HASH })
  assert.ok(p.ok, JSON.stringify(p))
  assert.deepEqual(p.aenderung, { ziel: 'Z\n\nzwei', nicht_ziele: ['a\nb'], akzeptanzkriterien: [{ id: 'AK3', text: 'x' }], grund: 'kurz und gut' })
})

test('pruefeAkteAenderung: Rotfälle ⇒ Grund (HTTP 400)', () => {
  const basis = { ziel: 'Z', nicht_ziele: [], akzeptanzkriterien: [{ id: 'AK1', text: 'x' }], grund: 'g', hash: HASH }
  const rot: [unknown, RegExp][] = [
    [{ ...basis, grund: '   ' }, /grund/],
    [{ ...basis, grund: undefined }, /grund/],
    [{ ...basis, fremd: 1 }, /unbekannte Felder/],
    [{ ...basis, hash: 'ABC' }, /hash/],
    [{ ...basis, ziel: 'a\n## b' }, /##/],
    [{ ...basis, ziel: '' }, /leer/],
    [{ ...basis, nicht_ziele: ['[x] erledigt'] }, /Checkbox/],
    [{ ...basis, nicht_ziele: ['a\u0000'] }, /Steuerzeichen/],
    [{ ...basis, akzeptanzkriterien: [] }, /1 bis/],
    [{ ...basis, akzeptanzkriterien: [{ id: 'AK-1', text: 'x' }] }, /Muster/],
    [{ ...basis, akzeptanzkriterien: [{ id: 'AK1', text: 'x' }, { id: 'AK1', text: 'y' }] }, /doppelt/],
    [{ ...basis, akzeptanzkriterien: [{ id: 'AK1', text: 'x', mehr: 1 }] }, /nur id und text/],
    [[], /JSON-Objekt/],
  ]
  for (const [daten, muster] of rot) {
    const p = pruefeAkteAenderung(daten)
    assert.ok(!p.ok && muster.test(p.grund), JSON.stringify({ daten, p }))
  }
  const fehlend = { ...basis } as Record<string, unknown>
  delete fehlend.nicht_ziele
  const p = pruefeAkteAenderung(fehlend)
  assert.ok(!p.ok && /fehlen: nicht_ziele/.test(p.grund))
})

for (const [name, eol] of [
  ['LF', '\n'],
  ['CRLF', '\r\n'],
] as const) {
  test(`bearbeiteFeatureAkte (${name}): nur geänderte Abschnitte, Rest bytegleich, Zeilenende erhalten`, () => {
    const inhalt = AKTE.replace(/\n/g, eol)
    const neu = aenderung({ ziel: 'Neues Ziel\nzweite Zeile', akzeptanzkriterien: [{ id: 'AK1', text: 'Eins.' }, { id: 'AK2', text: 'Zwei\nweiter.' }, { id: 'AK4', text: 'Vier' }] })
    const r = bearbeiteFeatureAkte(inhalt, 'F9', neu, '2026-10-23')
    assert.ok(r.ok, JSON.stringify(r))
    assert.deepEqual(r.geaendert, ['Ziel', 'Akzeptanzkriterien'])
    // Außerhalb der drei Abschnitte und von „## Änderungen“ bytegleich (die Leerzeile vor dem neu angelegten
    // „## Änderungen“ am Dateiende gehört zur Einfügung).
    const namen = ['Ziel', 'Nicht-Ziele', 'Akzeptanzkriterien', 'Änderungen']
    assert.equal(ohneAbschnitte(r.inhalt, namen), ohneAbschnitte(inhalt, namen) + eol)
    // Nicht-Ziele unverändert ⇒ bytegleich.
    assert.ok(r.inhalt.includes(`## Nicht-Ziele${eol}- Nicht A.${eol}${eol}## Akzeptanzkriterien`))
    // Zeilenende: in CRLF kein nacktes \n, in LF kein \r.
    if (eol === '\r\n') assert.ok(!/[^\r]\n/.test(r.inhalt), 'nacktes LF in CRLF-Akte')
    else assert.ok(!r.inhalt.includes('\r'))
    assert.ok(r.inhalt.endsWith(`## Änderungen${eol}- 2026-10-23 · Ziel, Akzeptanzkriterien · Test${eol}`))
    const gelesen = leseFeatureAkteAnzeige(r.inhalt, 'F9')
    assert.ok(gelesen.ok)
    assert.equal(gelesen.ziel.replace(/\r\n/g, '\n'), 'Neues Ziel\nzweite Zeile')
    assert.deepEqual(gelesen.akzeptanzkriterien.at(-1), { id: 'AK4', text: 'Vier' })
  })
}

test('bearbeiteFeatureAkte: bestehendes „## Änderungen“ ⇒ Zeile nach der letzten Zeile, Folgeabschnitt bytegleich', () => {
  const inhalt = `${AKTE}\n## Änderungen\n- 2026-10-01 · Ziel · alt\n\n## Danach\nText\n`
  const r = bearbeiteFeatureAkte(inhalt, 'F9', aenderung({ nicht_ziele: [] }), '2026-10-23')
  assert.ok(r.ok, JSON.stringify(r))
  assert.deepEqual(r.geaendert, ['Nicht-Ziele'])
  assert.ok(r.inhalt.includes('## Nicht-Ziele\nkeine\n\n## Akzeptanzkriterien'))
  assert.ok(r.inhalt.endsWith('## Änderungen\n- 2026-10-01 · Ziel · alt\n- 2026-10-23 · Nicht-Ziele · Test\n\n## Danach\nText\n'))
})

test('bearbeiteFeatureAkte: fehlende Abschnitte werden vor „## Änderungen“ angelegt', () => {
  const inhalt = '# F9\n\n## Status\nStatus: ENTWURF\n\n## Änderungen\n- 2026-10-01 · angelegt · aus Coach-Scope\n'
  const r = bearbeiteFeatureAkte(inhalt, 'F9', aenderung(), '2026-10-23')
  assert.ok(r.ok, JSON.stringify(r))
  assert.deepEqual(r.geaendert, ['Ziel', 'Nicht-Ziele', 'Akzeptanzkriterien'])
  assert.equal(
    r.inhalt,
    '# F9\n\n## Status\nStatus: ENTWURF\n\n## Ziel\nAltes Ziel.\n\n## Nicht-Ziele\n- Nicht A.\n\n## Akzeptanzkriterien\n- AK1: Eins.\n- AK2: Zwei\n  weiter.\n\n## Änderungen\n- 2026-10-01 · angelegt · aus Coach-Scope\n- 2026-10-23 · Ziel, Nicht-Ziele, Akzeptanzkriterien · Test\n',
  )
})

test('bearbeiteFeatureAkte: nichts geändert ⇒ 422-Grund', () => {
  const r = bearbeiteFeatureAkte(AKTE, 'F9', aenderung(), '2026-10-23')
  assert.ok(!r.ok && /Keine Änderung/.test(r.grund))
})

test('bearbeiteFeatureAkte A3: Text außerhalb der Liste ⇒ 422, unveränderter Abschnitt mit Vortext stört nicht', () => {
  const mitVortext = AKTE.replace('## Akzeptanzkriterien\n', '## Akzeptanzkriterien\nVortext.\n### Unter\n')
  const r = bearbeiteFeatureAkte(mitVortext, 'F9', aenderung({ akzeptanzkriterien: [{ id: 'AK1', text: 'Neu' }] }), '2026-10-23')
  assert.ok(!r.ok && /außerhalb der Liste/.test(r.grund) && r.grund.includes('Vortext.'), JSON.stringify(r))
  const nurZiel = bearbeiteFeatureAkte(mitVortext, 'F9', aenderung({ ziel: 'Anders' }), '2026-10-23')
  assert.ok(nurZiel.ok && nurZiel.inhalt.includes('## Akzeptanzkriterien\nVortext.\n### Unter\n'), JSON.stringify(nurZiel))
})

test('bearbeiteFeatureAkte C15: ABGESCHLOSSEN und ABGEBROCHEN ⇒ 422', () => {
  for (const status of ['ABGESCHLOSSEN', 'ABGEBROCHEN']) {
    const r = bearbeiteFeatureAkte(AKTE.replace('Status: IN_ARBEIT', `Status: ${status}`), 'F9', aenderung({ ziel: 'X' }), '2026-10-23')
    assert.ok(!r.ok && r.grund.includes(status))
  }
})

test('bearbeiteFeatureAkte: Akte ohne gültigen Status besteht das Gate nicht ⇒ 422 mit Verstößen', () => {
  const r = bearbeiteFeatureAkte(AKTE.replace('Status: IN_ARBEIT', 'Status: UNSINN'), 'F9', aenderung({ ziel: 'X' }), '2026-10-23')
  assert.ok(!r.ok && r.verstoesse?.includes('Status fehlt oder unbekannt'), JSON.stringify(r))
})

test('bearbeiteFeatureAkte: Akte ohne „## Änderungen“ und ohne Zeilenende am Schluss', () => {
  const r = bearbeiteFeatureAkte('## Status\nStatus: ENTWURF\n\n## Ziel\nalt', 'F9', aenderung({ nicht_ziele: [] }), '2026-10-23')
  assert.ok(r.ok, JSON.stringify(r))
  assert.equal(r.inhalt, '## Status\nStatus: ENTWURF\n\n## Ziel\nAltes Ziel.\n\n## Akzeptanzkriterien\n- AK1: Eins.\n- AK2: Zwei\n  weiter.\n\n## Änderungen\n- 2026-10-23 · Ziel, Akzeptanzkriterien · Test\n')
})

// ─── Korrekturrunde (code-reviewer/qa B5a-1) ─────────────────────────────────

test('qa 1: unveränderter Eintrag mit Leerzeichen am Zeilenende gilt nicht als geändert, Abschnitt bytegleich', () => {
  const inhalt = AKTE.replace('- Nicht A.', '- Nicht A.  \n  zweite Zeile')
  const gelesen = leseFeatureAkteAnzeige(inhalt, 'F9')
  assert.ok(gelesen.ok)
  const p = pruefeAkteAenderung({ ziel: 'Anders.', nicht_ziele: gelesen.nicht_ziele, akzeptanzkriterien: gelesen.akzeptanzkriterien, grund: 'g', hash: HASH })
  assert.ok(p.ok, JSON.stringify(p))
  const r = bearbeiteFeatureAkte(inhalt, 'F9', p.aenderung, '2026-10-23')
  assert.ok(r.ok, JSON.stringify(r))
  assert.deepEqual(r.geaendert, ['Ziel'])
  assert.ok(r.inhalt.includes('## Nicht-Ziele\n- Nicht A.  \n  zweite Zeile\n'))
})

test('qa 2: eingerückter Text vor dem ersten Punkt ⇒ 422 statt stillem Verlust', () => {
  const inhalt = AKTE.replace('## Nicht-Ziele\n- Nicht A.', '## Nicht-Ziele\n  Hinweis: siehe unten.\n- Nicht A.')
  const r = bearbeiteFeatureAkte(inhalt, 'F9', aenderung({ nicht_ziele: ['B'] }), '2026-10-23')
  assert.ok(!r.ok && r.grund.includes('Hinweis: siehe unten.'), JSON.stringify(r))
  const ok = bearbeiteFeatureAkte(AKTE.replace('- Nicht A.', '- Nicht A.\n  Folgezeile'), 'F9', aenderung({ nicht_ziele: ['B'] }), '2026-10-23')
  assert.ok(ok.ok, 'eingerückte Folgezeile nach einem Punkt bleibt erlaubt')
})

test('qa 3: AK0 aus einer Bestandsakte geht im Rundlauf durch', () => {
  const inhalt = AKTE.replace('- AK1: Eins.', '- AK0 Null.\n- AK1: Eins.')
  const gelesen = leseFeatureAkteAnzeige(inhalt, 'F9')
  assert.ok(gelesen.ok && gelesen.akzeptanzkriterien[0].id === 'AK0')
  const p = pruefeAkteAenderung({ ziel: 'Anders.', nicht_ziele: gelesen.nicht_ziele, akzeptanzkriterien: gelesen.akzeptanzkriterien, grund: 'g', hash: HASH })
  assert.ok(p.ok, JSON.stringify(p))
  const r = bearbeiteFeatureAkte(inhalt, 'F9', p.aenderung, '2026-10-23')
  assert.ok(r.ok && JSON.stringify(r.geaendert) === '["Ziel"]', JSON.stringify(r))
})

test('code-reviewer V3: U+2028/U+2029 werden abgelehnt', () => {
  for (const zeichen of [String.fromCharCode(0x2028), String.fromCharCode(0x2029)]) {
    const p = pruefeAkteAenderung({ ziel: `a${zeichen}## Datenmodell`, nicht_ziele: [], akzeptanzkriterien: [{ id: 'AK1', text: 'x' }], grund: 'g', hash: HASH })
    assert.ok(!p.ok && /Steuerzeichen/.test(p.grund))
  }
})

test('AK-Text mit Checkbox-Form ist erlaubt (hinter „AK<n>: “ entfernt der Leser nichts)', () => {
  const p = pruefeAkteAenderung({ ziel: 'Z', nicht_ziele: [], akzeptanzkriterien: [{ id: 'AK1', text: '[x] erledigt' }], grund: 'g', hash: HASH })
  assert.ok(p.ok)
  const r = bearbeiteFeatureAkte(AKTE, 'F9', p.aenderung, '2026-10-23')
  assert.ok(r.ok, JSON.stringify(r))
})

test('CRLF mit bestehendem „## Änderungen“ und fehlenden Abschnitten', () => {
  const inhalt = '# F9\r\n\r\n## Status\r\nStatus: ENTWURF\r\n\r\n## Änderungen\r\n- 2026-10-01 · angelegt · aus Coach-Scope\r\n'
  const r = bearbeiteFeatureAkte(inhalt, 'F9', aenderung(), '2026-10-23')
  assert.ok(r.ok, JSON.stringify(r))
  assert.ok(!/[^\r]\n/.test(r.inhalt), 'nacktes LF')
  assert.ok(r.inhalt.endsWith('## Akzeptanzkriterien\r\n- AK1: Eins.\r\n- AK2: Zwei\r\n  weiter.\r\n\r\n## Änderungen\r\n- 2026-10-01 · angelegt · aus Coach-Scope\r\n- 2026-10-23 · Ziel, Nicht-Ziele, Akzeptanzkriterien · Test\r\n'))
})

test('„## Änderungen“ mit leerem Körper und Präfix-Überschrift „## Änderungen gegenüber v1“', () => {
  const leer = bearbeiteFeatureAkte(`${AKTE}\n## Änderungen\n\n## Danach\nx\n`, 'F9', aenderung({ ziel: 'Anders.' }), '2026-10-23')
  assert.ok(leer.ok && leer.inhalt.endsWith('## Änderungen\n- 2026-10-23 · Ziel · Test\n\n## Danach\nx\n'), JSON.stringify(leer))
  const praefix = bearbeiteFeatureAkte(`${AKTE}\n## Änderungen gegenüber v1\n- alt\n`, 'F9', aenderung({ ziel: 'Anders.' }), '2026-10-23')
  assert.ok(praefix.ok && praefix.inhalt.includes('## Änderungen gegenüber v1\n- alt\n\n## Änderungen\n- 2026-10-23 · Ziel · Test\n'), JSON.stringify(praefix))
})

test('qa 5: Gate-Verstoß, der schon vorher bestand, wird als solcher gemeldet', () => {
  const inhalt = AKTE.replace('## Stand X', '## Datenmodell\n\n## Stand X')
  const r = bearbeiteFeatureAkte(inhalt, 'F9', aenderung({ ziel: 'Anders.' }), '2026-10-23')
  assert.ok(!r.ok && /schon vor der Bearbeitung/.test(r.grund) && (r.verstoesse?.length ?? 0) > 0, JSON.stringify(r))
})

test('F45 B5b-1a (code-reviewer M1): kaputte Workstream-Zeile, PUT ändert die Zeilenzahl davor ⇒ „schon vor der Bearbeitung“', () => {
  const tabelle = ['## Workstreams', '', '| ID | Art | Titel | Status | Schätzung AT | Ist AT | Begonnen | Abgenommen | Notiz |', '|---|---|---|---|---|---|---|---|---|', '| A | workstream | t | geplant | 2–1 | – | – | – | |', ''].join('\n')
  const inhalt = AKTE.replace('## Stand X', `${tabelle}\n## Stand X`)
  const r = bearbeiteFeatureAkte(inhalt, 'F9', aenderung({ akzeptanzkriterien: [...aenderung().akzeptanzkriterien, { id: 'AK3', text: 'Drei\nZeilen\nlang.' }] }), '2026-10-24')
  assert.ok(!r.ok && /schon vor der Bearbeitung/.test(r.grund) && (r.verstoesse ?? []).some((v) => v.includes('min > max')), JSON.stringify(r))
})

test('erkenneZeilenende: erstes Vorkommen', () => {
  assert.equal(erkenneZeilenende('a\r\nb\n'), '\r\n')
  assert.equal(erkenneZeilenende('a\nb\r\n'), '\n')
  assert.equal(erkenneZeilenende('ohne'), '\n')
})

test('findeAbschnitt/leseAbschnitt: Spanne gleich dem Leser, Präfix-Treffer wie bisher', () => {
  const spanne = findeAbschnitt(AKTE, 'Ziel')
  assert.ok(spanne !== null)
  assert.equal(AKTE.slice(spanne.kopfEnde, spanne.koerperEnde), '\nAltes Ziel.\n\n')
  assert.equal(leseAbschnitt(AKTE, 'Ziel'), '\nAltes Ziel.\n\n')
  assert.equal(findeAbschnitt(AKTE, 'Fehlt'), null)
})

test('leseFeatureEntscheidungen: nur Kennungen am Bullet-Anfang mit Ziffer', () => {
  assert.deepEqual(leseFeatureEntscheidungen(AKTE), [
    { id: 'E-F9-1', text: '**E-F9-1 = A** (Stefan) — erste.' },
    { id: 'E-188', text: 'E-188 ohne Sternchen.' },
  ])
  assert.deepEqual(leseFeatureEntscheidungen('# ohne\n'), [])
})
