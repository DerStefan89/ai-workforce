/**
 * Datei: src/sammlung/sammlung.test.ts
 *
 * Zweck: Tests der Sammlung (F45 F-2b-1): Parser (nur Bewertungsmatrix, echte Datei 176/172, Fehlerfälle,
 * Selbstprüfung), Zuordnung Sammlung ↔ Katalog (eindeutig, mehrdeutig, keine, Alias, Groß-/Kleinschreibung), Typ,
 * prüfbare Quelle, Auswahlgrund, Stand, Scout-Anhang und Scout-Abgleich.
 *
 * Wird aufgerufen von: npm run test (node --test).
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  auswahl,
  baueSammlungAnsicht,
  baueScoutSammlung,
  berechneStand,
  bestimmeTyp,
  type KatalogEintragKurz,
  leseStackListe,
  normalisiereUrl,
  ordneZu,
  parseSammlung,
  pruefbareQuelle,
  pruefeScoutGegenSammlung,
} from './index.ts'

const WURZEL = join(import.meta.dirname, '..', '..')
const ECHT = readFileSync(join(WURZEL, 'docs', 'harness', 'kandidaten-2026-09-15.md'), 'utf8')
const STACK = readFileSync(join(WURZEL, 'docs', 'harness', 'stack-kandidaten.md'), 'utf8')

const KOPF = '| Name / Quelle | Urteil | Kurzbeschreibung | Lizenzbasis | Kosten | Sicherheits-/Fit-Bewertung |\n|---|---|---|---|---|---|'

/**
 * Baut eine kleine Sammlungsdatei mit einer Kostentabelle vor der Matrix (die nicht gelesen werden darf).
 * @param matrixZeilen - Abschnitte ### … mit Zeilen
 * @param angabe - Selbstangabe
 * @returns Markdown
 */
function datei(matrixZeilen: string, angabe: string): string {
  return [
    '# Sammlung',
    '## Entscheidungen lesen',
    '| Entscheidung | Konsequenz |',
    '|---|---|',
    '| Aufnehmen | Priorisierter Kandidat. |',
    '| Nur Ausnahme | Außerhalb der Standardauswahl. |',
    '## Konkrete Kosten',
    '| Name / Quelle | Urteil | Kurzbeschreibung | Lizenzbasis | Kosten | Sicherheits-/Fit-Bewertung |',
    '|---|---|---|---|---|---|',
    '| [Kostenzeile](https://example.com/kosten) | Aufnehmen | x | x | 5 USD | x |',
    '## Vollständige Bewertungsmatrix',
    angabe,
    matrixZeilen,
    '## Danach',
    '| [Nachzeile](https://example.com/nach) | Aufnehmen | x | x | x | x |',
  ].join('\n')
}

const ZWEI = `### Skills\n${KOPF}\n| [Alpha](https://github.com/a/alpha) | Aufnehmen | kann A | MIT | 0 | ok |\n| Beta (Link fehlt) | Nur Ausnahme | kann B | ? | 9 USD | teuer |`
const ZWEI_ANGABE = 'Erfasste Bewertungszeilen: **2**. Aufnehmen: 1, Nur Ausnahme: 1.'

test('parseSammlung: echte Datei — 176 Zeilen, 172 mit Link, Selbstprüfung grün', () => {
  const p = parseSammlung(ECHT)
  assert.equal(p.ok, true, p.ok ? '' : p.fehler.join('\n'))
  if (!p.ok) return
  assert.equal(p.zeilen.length, 176)
  assert.equal(p.zeilen.filter((z) => z.link !== null).length, 172)
  assert.equal(p.deklariert?.gesamt, 176)
  assert.deepEqual(p.selbstpruefung, [])
  assert.ok(p.bedeutung['Nur Ausnahme']?.includes('Standardauswahl'))
})

test('parseSammlung: liest nur die Matrix — Tabellen davor und danach zählen nicht', () => {
  const p = parseSammlung(datei(ZWEI, ZWEI_ANGABE))
  assert.equal(p.ok, true, p.ok ? '' : p.fehler.join('\n'))
  if (!p.ok) return
  assert.deepEqual(
    p.zeilen.map((z) => [z.id, z.name, z.link, z.urteil]),
    [
      ['skills-alpha', 'Alpha', 'https://github.com/a/alpha', 'Aufnehmen'],
      ['skills-beta', 'Beta', null, 'Nur Ausnahme'],
    ]
  )
})

test('parseSammlung: fehlende Spalte, leere Pflichtspalte, unbekanntes Urteil, doppelte id, falscher Kopf → Fehler', () => {
  const faelle: Array<[string, RegExp]> = [
    [`### Skills\n${KOPF}\n| [Alpha](https://github.com/a/alpha) | Aufnehmen | kann A | MIT | 0 |`, /5 statt 6 Spalten/],
    [`### Skills\n${KOPF}\n| [Alpha](https://github.com/a/alpha) | Aufnehmen | | MIT | 0 | ok |`, /Pflichtspalte leer \(Kurzbeschreibung\)/],
    [`### Skills\n${KOPF}\n| [Alpha](https://github.com/a/alpha) | Vielleicht | kann | MIT | 0 | ok |`, /unbekanntes Urteil 'Vielleicht'/],
    [`### Skills\n${KOPF}\n| [Alpha](https://github.com/a/alpha) | Aufnehmen | k | MIT | 0 | ok |\n| [Alpha](https://github.com/b/alpha) | Aufnehmen | k | MIT | 0 | ok |`, /id 'skills-alpha' doppelt/],
    [`### Skills\n| Name / Quelle | Urteil | Was | Lizenzbasis | Kosten | Sicherheits-/Fit-Bewertung |\n|---|---|---|---|---|---|`, /Tabellenkopf weicht ab/],
    [`### Agenten\n${KOPF}`, /unbekannter Unterabschnitt 'Agenten'/],
    [`### Skills\n${KOPF}\n| Alpha | Aufnehmen | k | MIT | 0 | ok |`, /Name\/Quelle unlesbar/],
  ]
  for (const [matrix, erwartet] of faelle) {
    const p = parseSammlung(datei(matrix, 'Erfasste Bewertungszeilen: **1**. Aufnehmen: 1.'))
    assert.equal(p.ok, false, `${erwartet} erwartet`)
    if (!p.ok) assert.ok(p.fehler.some((f) => erwartet.test(f)), `${erwartet} in ${p.fehler.join(' | ')}`)
  }
})

test('parseSammlung: Selbstprüfung — Zählabweichung bleibt lesbar mit Band (Delta B8); ohne Matrix → Fehler', () => {
  const gesamt = parseSammlung(datei(ZWEI, 'Erfasste Bewertungszeilen: **3**. Aufnehmen: 1, Nur Ausnahme: 1.'))
  assert.equal(gesamt.ok, true)
  if (gesamt.ok) {
    assert.equal(gesamt.zeilen.length, 2)
    assert.ok(gesamt.selbstpruefung.some((f) => /nennt 3 Zeilen, gelesen wurden 2/.test(f)))
  }
  const jeUrteil = parseSammlung(datei(ZWEI, 'Erfasste Bewertungszeilen: **2**. Aufnehmen: 2.'))
  assert.equal(jeUrteil.ok, true)
  if (jeUrteil.ok) assert.ok(jeUrteil.selbstpruefung.some((f) => /'Nur Ausnahme' — die Datei nennt 0, gelesen wurden 1/.test(f)))
  const ohneAngabe = parseSammlung(datei(ZWEI, ''))
  assert.equal(ohneAngabe.ok, true)
  if (ohneAngabe.ok) assert.ok(ohneAngabe.selbstpruefung.some((f) => /Selbstangabe .* fehlt/.test(f)))
  const ohne = parseSammlung('# leer\n')
  assert.equal(ohne.ok, false)
})

const KATALOG: KatalogEintragKurz[] = [
  { id: 'alpha-skill', typ: 'extern', name: 'Alpha Skill', unterart: 'skill', freigabe: 'OFFEN', herkunft: { art: 'extern', url: 'https://GitHub.com/A/Alpha.git' } },
  { id: 'gamma', typ: 'extern', name: 'Gamma', unterart: 'mcp', freigabe: 'FREIGEGEBEN', herkunft: { art: 'extern', url: 'https://github.com/c/gamma-server' } },
  { id: 'delta-1', typ: 'extern', name: 'Delta', unterart: 'skill', freigabe: 'OFFEN', herkunft: { art: 'extern', url: 'https://github.com/d/delta' } },
  { id: 'delta-2', typ: 'extern', name: 'Delta', unterart: 'skill', freigabe: 'OFFEN', herkunft: { art: 'extern', url: 'https://github.com/d/delta-zwei' } },
  { id: 'qa', typ: 'agent', freigabe: 'FREIGEGEBEN', herkunft: { art: 'agent', url: undefined } },
]

/** Zeile für Zuordnungstests. */
function zeile(id: string, name: string, link: string | null, urteil: 'Aufnehmen' | 'Alias' = 'Aufnehmen') {
  return { id, art: 'Repos' as const, name, link, urteil, kurzbeschreibung: 'k', lizenz: 'MIT', kosten: '0', bewertung: 'b', zeile: 1 }
}

test('ordneZu: Link (Groß-/Kleinschreibung, .git) → zugeordnet; Name → zugeordnet; mehrdeutig; keine; Alias', () => {
  const z = ordneZu(
    [
      zeile('a', 'Irgendwas', 'https://github.com/a/alpha/'),
      zeile('g', 'Gamma', 'https://example.com/gamma'),
      zeile('d', 'Delta', null),
      zeile('x', 'Unbekannt', 'https://github.com/x/y'),
      zeile('al', 'Gamma Alias', 'https://github.com/c/gamma-server', 'Alias'),
    ],
    KATALOG
  )
  assert.deepEqual(z.get('a'), { status: 'zugeordnet', katalog_id: 'alpha-skill', stufe: 'link' })
  assert.deepEqual(z.get('g'), { status: 'zugeordnet', katalog_id: 'gamma', stufe: 'name' })
  assert.deepEqual(z.get('d'), { status: 'mehrdeutig', kandidaten: ['delta-1', 'delta-2'], stufe: 'name' })
  assert.deepEqual(z.get('x'), { status: 'keine' })
  assert.deepEqual(z.get('al'), { status: 'alias' })
})

test('ordneZu: zwei Sammlungszeilen treffen denselben Katalogeintrag → beide mehrdeutig (nichts raten)', () => {
  const z = ordneZu([zeile('a1', 'Eins', 'https://github.com/a/alpha'), zeile('a2', 'Alpha Skill', null)], KATALOG)
  assert.equal(z.get('a1')?.status, 'mehrdeutig')
  assert.equal(z.get('a2')?.status, 'mehrdeutig')
})

test('bestimmeTyp: Katalog → Stack-Liste → Abschnitt (Vorschlag) → unbestimmt', () => {
  const stack = new Set([normalisiereUrl('https://github.com/shadcn-ui/ui') as string])
  assert.deepEqual(bestimmeTyp(zeile('a', 'A', 'https://github.com/a/alpha'), KATALOG[0], stack), { typ: 'skill', typ_quelle: 'katalog' })
  assert.deepEqual(bestimmeTyp(zeile('q', 'qa', null), KATALOG[4], stack), { typ: 'lokal', typ_quelle: 'katalog' })
  assert.deepEqual(bestimmeTyp(zeile('s', 'Shadcn', 'https://github.com/shadcn-ui/ui'), undefined, stack), { typ: 'bibliothek', typ_quelle: 'stack-liste' })
  assert.deepEqual(bestimmeTyp({ ...zeile('m', 'M', 'https://github.com/m/m'), art: 'MCP' }, undefined, stack), { typ: 'mcp', typ_quelle: 'abschnitt' })
  assert.deepEqual(bestimmeTyp(zeile('r', 'R', 'https://github.com/r/r'), undefined, stack), { typ: 'unbestimmt', typ_quelle: 'unbestimmt' })
})

test('pruefbareQuelle: strukturiert — Repo, tree-Unterpfad, npm; Org, blob, Gist, fremder Host → null', () => {
  assert.deepEqual(pruefbareQuelle('https://github.com/MS/Repo.git'), { art: 'git', owner: 'MS', repo: 'Repo', ref: null, unterpfad: '' })
  assert.deepEqual(pruefbareQuelle('https://github.com/a/b/tree/main/skills/x/'), { art: 'git', owner: 'a', repo: 'b', ref: 'main', unterpfad: 'skills/x' })
  assert.deepEqual(pruefbareQuelle('https://www.npmjs.com/package/@upstash/context7-mcp'), { art: 'npm', paket: '@upstash/context7-mcp' })
  assert.equal(pruefbareQuelle('https://github.com/a'), null)
  assert.equal(pruefbareQuelle('https://github.com/a/b/blob/main/README.md'), null)
  assert.equal(pruefbareQuelle('https://gist.github.com/a/123'), null)
  // Code-Review 2: ein ungültiges %xx wirft nicht.
  assert.equal(pruefbareQuelle('https://www.npmjs.com/package/%E0%A4%A'), null)
  assert.equal(pruefbareQuelle('https://www.kibo-ui.com/'), null)
  assert.equal(pruefbareQuelle(null), null)
})

test('auswahl: Gründe in fester Reihenfolge', () => {
  const git = pruefbareQuelle('https://github.com/a/b')
  assert.deepEqual(auswahl(zeile('a', 'A', 'https://github.com/a/b', 'Alias'), 'skill', git), { auswaehlbar: false, grund: 'alias' })
  assert.deepEqual(auswahl(zeile('a', 'A', null), 'skill', null), { auswaehlbar: false, grund: 'ohne_link' })
  assert.deepEqual(auswahl(zeile('a', 'A', 'https://github.com/a/b'), 'bibliothek', git), { auswaehlbar: false, grund: 'bibliothek' })
  assert.deepEqual(auswahl(zeile('a', 'A', 'https://github.com/a/b'), 'plugin', git), { auswaehlbar: false, grund: 'plugin' })
  assert.deepEqual(auswahl(zeile('a', 'A', 'https://example.com'), 'unbestimmt', null), { auswaehlbar: false, grund: 'keine_quelle' })
  assert.deepEqual(auswahl(zeile('a', 'A', 'https://github.com/a/b'), 'unbestimmt', git), { auswaehlbar: true, grund: null })
  // F-2b-2a (QA 2/3): freigegebener Katalogeintrag und MCP ohne npm-Paket sind nicht auswählbar.
  const k = (freigabe: string, paket?: string): KatalogEintragKurz => ({ id: 'k', typ: 'extern', unterart: 'mcp', freigabe, herkunft: { art: 'extern', url: 'https://github.com/a/b', ...(paket ? { paket } : {}) } })
  assert.deepEqual(auswahl(zeile('a', 'A', 'https://github.com/a/b'), 'mcp', git, k('FREIGEGEBEN', 'npm:x')), { auswaehlbar: false, grund: 'freigegeben' })
  assert.deepEqual(auswahl(zeile('a', 'A', 'https://github.com/a/b'), 'mcp', git, k('OFFEN')), { auswaehlbar: false, grund: 'mcp_ohne_paket' })
  assert.deepEqual(auswahl(zeile('a', 'A', 'https://github.com/a/b'), 'mcp', git, k('OFFEN', 'npm:x')), { auswaehlbar: true, grund: null })
  assert.deepEqual(auswahl(zeile('a', 'A', 'https://github.com/a/b'), 'mcp', git), { auswaehlbar: false, grund: 'mcp_ohne_paket' })
  // F-1074 (8): dieselbe Namensprüfung wie die Route (paketNameAus) — ein ungültiger Name zeigt kein „Auswählen“.
  assert.deepEqual(auswahl(zeile('a', 'A', 'https://github.com/a/b'), 'mcp', git, k('OFFEN', 'npm:UNGÜLTIG NAME')), { auswaehlbar: false, grund: 'mcp_ohne_paket' })
  assert.deepEqual(auswahl(zeile('a', 'A', 'https://www.npmjs.com/package/x'), 'mcp', { art: 'npm', paket: '../böse' }), { auswaehlbar: false, grund: 'mcp_ohne_paket' })
  assert.deepEqual(auswahl(zeile('a', 'A', 'https://www.npmjs.com/package/@a/x'), 'mcp', { art: 'npm', paket: '@a/x' }), { auswaehlbar: true, grund: null })
})

test('berechneStand: benutzt > aktiv > installiert > vorgemerkt; FREIGEGEBEN extern → ohne_vor_f2b', () => {
  assert.deepEqual(berechneStand(undefined, undefined), { stand: 'nur_sammlung', pruefbericht: 'keiner', aufrufe: null })
  assert.deepEqual(berechneStand(KATALOG[0], undefined), { stand: 'vorgemerkt', pruefbericht: 'keiner', aufrufe: null })
  const g = KATALOG[1]
  assert.equal(berechneStand(g, { id: 'gamma', installiert: true, aktiv: true, aufrufe: 2 }).stand, 'benutzt')
  assert.equal(berechneStand(g, { id: 'gamma', installiert: true, aktiv: true, aufrufe: 0 }).stand, 'aktiv')
  assert.equal(berechneStand(g, { id: 'gamma', installiert: true, aktiv: false, aufrufe: null }).stand, 'installiert')
  assert.equal(berechneStand(g, { id: 'gamma', installiert: true, aktiv: false, aufrufe: null }).pruefbericht, 'ohne_vor_f2b')
  assert.deepEqual(berechneStand(KATALOG[4], undefined), { stand: 'installiert', pruefbericht: 'lokal', aufrufe: null })
})

test('baueSammlungAnsicht: echte Daten — Zählung, playwright und frontend-design ohne Prüfbericht (vor F-2b)', () => {
  const katalog = JSON.parse(readFileSync(join(WURZEL, 'ressourcen.json'), 'utf8')).ressourcen as KatalogEintragKurz[]
  const a = baueSammlungAnsicht({ text: ECHT, stackText: STACK, katalog, katalogStatus: new Map() })
  assert.equal(a.status, 'ok')
  if (a.status !== 'ok') return
  assert.deepEqual(a.quelle, { zeilen: 176, mit_link: 172 })
  const playwright = a.eintraege.find((e) => e.zuordnung.status === 'zugeordnet' && e.zuordnung.katalog_id === 'playwright-mcp')
  assert.equal(playwright?.pruefbericht, 'ohne_vor_f2b')
  assert.equal(playwright?.typ, 'mcp')
  assert.equal(a.eintraege.filter((e) => e.zuordnung.status === 'mehrdeutig').length, 0)
  assert.equal(a.zaehlung.ausgeschlossen, 10)
})

test('baueSammlungAnsicht: Fehlerstand statt Wurf bei kaputter Datei', () => {
  const a = baueSammlungAnsicht({ text: '# nichts', stackText: null, katalog: [], katalogStatus: new Map() })
  assert.equal(a.status, 'fehler')
})

test('leseStackListe: Name und URL aus der Tabelle mit URL-Spalte', () => {
  const liste = leseStackListe(STACK)
  assert.ok(liste.some((e) => e.name === 'shadcn/ui' && e.url === 'https://github.com/shadcn-ui/ui'))
})

test('baueScoutSammlung: Regel + Liste; nicht lesbar → Hinweis', () => {
  const text = baueScoutSammlung(ECHT, STACK)
  assert.match(text, /^Sammlung zuerst \(verbindlich\)/)
  assert.match(text, /Sammlung \(176 Einträge\)/)
  assert.match(text, /- Playwright \| Plugins \| Aufnehmen \| Apache-2\.0 \(GitHub-Metadaten\) \| https:\/\/github\.com\/microsoft\/playwright-mcp/)
  assert.ok(text.length < 40_000, `Anhang ${text.length} Zeichen`)
  assert.match(baueScoutSammlung(null, null, 'ENOENT'), /^Sammlung nicht verfügbar \(ENOENT\)/)
  assert.match(baueScoutSammlung('# kaputt', null), /^Sammlung nicht verfügbar/)
})

test('pruefeScoutGegenSammlung: Treffer per Link, Abweichung bei falschem Urteil oder Sammlung ohne Treffer', () => {
  const p = parseSammlung(ECHT)
  assert.equal(p.ok, true)
  if (!p.ok) return
  const [richtig, falsch, ohne, web] = pruefeScoutGegenSammlung(
    [
      { quelle_url: 'https://github.com/microsoft/playwright-mcp', quelle: 'sammlung', urteil_sammlung: 'Aufnehmen' },
      { quelle_url: 'https://GITHUB.com/microsoft/playwright-mcp/', quelle: 'sammlung', urteil_sammlung: 'Referenz' },
      { quelle_url: 'https://github.com/nicht/da', quelle: 'sammlung' },
      { quelle_url: 'https://github.com/nicht/da', quelle: 'web' },
    ],
    p.zeilen
  )
  assert.equal(richtig.treffer?.urteil, 'Aufnehmen')
  assert.equal(richtig.abweichung, false)
  assert.equal(falsch.abweichung, true)
  assert.equal(ohne.abweichung, true)
  assert.deepEqual(web, { treffer: null, abweichung: false })
})

test('pruefeScoutGegenSammlung: Alias zählt nicht; mehrere Zeilen mit demselben Link → passend, wenn eines der Urteile stimmt (Code-Review 4)', () => {
  const zeilen = [
    { ...zeile('a', 'Haupt', 'https://github.com/x/y'), urteil: 'Pilot' as const },
    { ...zeile('b', 'Alias', 'https://github.com/x/y', 'Alias') },
    { ...zeile('c', 'Zweit', 'https://github.com/x/y'), urteil: 'Referenz' as const },
  ]
  const [pilot, referenz, alias] = pruefeScoutGegenSammlung(
    [
      { quelle_url: 'https://github.com/x/y', urteil_sammlung: 'Pilot' },
      { quelle_url: 'https://github.com/x/y', urteil_sammlung: 'Referenz' },
      { quelle_url: 'https://github.com/x/y', urteil_sammlung: 'Alias' },
    ],
    zeilen
  )
  assert.deepEqual([pilot.treffer?.id, pilot.abweichung], ['a', false])
  assert.deepEqual([referenz.treffer?.id, referenz.abweichung], ['c', false])
  assert.equal(alias.abweichung, true)
})
