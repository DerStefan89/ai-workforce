#!/usr/bin/env node
/**
 * Datei: scripts/check-f45-b2b3e2-formular.mjs
 *
 * Zweck: Gate F45 B2b-3e-2 „Budget-Feld + eine Regel für Bereiche + Formular-Reste“ (features/F45/plan-b2b3e2-v2.md,
 * Entscheidung A2 = Zwilling). Die Regel für `bereiche` und `budget_tokens` lebt in src/auftrag/index.ts (TS) und als Kopie
 * im Browser-Modul public/leitstand/arbeitspaket-felder.js; dieses Gate lässt beide über dieselbe Fall-Tabelle urteilen
 * (Muster check-f34-product-coach.mjs (i)) — jede Abweichung ist ein Befund.
 *
 * Fälle (jeder lädt seine Module selbst, Advisor A4 — gegen einen main-Abzug wird so jeder Fall einzeln rot):
 * (r1) pruefeBereich: Server (TS) und Formular (JS) liefern je Eintrag der Tabelle genau den erwarteten Grund.
 * (r2) Listenebene: validiereAuftragBereiche([e]) leer ⇔ gültig; leseBereiche(e) ok ⇔ gültig, sonst derselbe Grund;
 *      `Src/` und `src/` zusammen auf beiden Seiten gültig.
 * (r3) Regel ↔ Abgleich (A10): jeder gültige Eintrag mit Beispielpfad trifft ihn im Umfangs-Abgleich (Invariante: der
 *      Abgleich konnte `src/**` + Trenner schon); `Src/` trifft `src/a.ts` nicht. Dazu F-1123 (13): eine Umbenennung von
 *      außerhalb in den Kontrollzustand meldet den alten Pfad.
 * (r4) POST-Formular des Servers (pruefeAuftragsformular, rein): `bereiche: ['src/*.ts']` ⇒ abgewiesen mit „Muster“;
 *      `budget_tokens: 1e300` ⇒ abgewiesen; `bereiche: ['src/**' + '/']` ⇒ angenommen (Invariante).
 * (b1) pruefeBudgetTokens: Server und Formular gleich über die Werte-Tabelle; validiereArbeitspaketFelder folgt ihr.
 * (b2) leseBudget: leer ⇒ Standard, Tausendertrenner ⇒ Zahl, sonst ungültig.
 * (b3) BUDGET_STANDARD (Formular) gleich BUDGET_DEFAULTS (src/budget); `auftrag.budget.hinweis` trägt in allen Sprachen
 *      {fastLane}, {standard}, {hoch}.
 * (f1) Formular: `#auftrag-budget` steht in `details#auftrag-budget-bereich` direkt nach `#auftrag-bereiche-bereich`;
 *      projekt.js wählt die Meldung je Grund, jede Sprache hat sie für jeden Grund außer `leer`.
 * (i)  Invariante (auf main schon grün): starteWorkflowSchritt( in scripts/leitstand-server.mjs 6×. Den Rückfrage-Kanal
 *      (Schalter aus, Argv bitgleich) prüft weiter das Gate check-f45-b2b3b1-rueckfrage.mjs (a1); dieser Auftrag fasst ihn
 *      nicht an.
 * Zusätzlich in (r1)/(b1): die Rümpfe von pruefeBereich und pruefeBudgetTokens sind auf beiden Seiten zeichengleich.
 *
 * Wird aufgerufen von: `npm run check:gates` (und damit `npm run check`).
 *
 * Wichtig: legt nichts an und startet keinen Server — pruefeAuftragsformular ist rein, leitstand-server.mjs wird nur
 * importiert (Start nur am Haupteinstieg). Jeder Fall läuft für sich (fall()), ein Wurf trifft nur ihn.
 *
 * Aufruf: node scripts/check-f45-b2b3e2-formular.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { existsSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import { isDeepStrictEqual as gleich } from 'node:util'

const WURZEL = join(import.meta.dirname, '..')
const befunde = []
console.log('\n=== F45-B2b-3e-2-Formular-Check ===\n')

/**
 * Hält ein Ergebnis fest.
 * @param bedingung - true = in Ordnung
 * @param ok - Text für die Erfolgszeile
 * @param fehler - Befundtext
 */
function pruefe(bedingung, ok, fehler) {
  if (bedingung) console.log(`  ✓ ${ok}`)
  else befunde.push(fehler)
}

/**
 * Lädt ein Modul dieses Repos; scheitert das (gegen main), liefert es { fehler } statt zu werfen — der Fall meldet selbst.
 * @param pfad - repo-relativer Pfad
 * @returns { modul } oder { fehler }
 */
async function lade(pfad) {
  try {
    return { modul: await import(pathToFileURL(join(WURZEL, pfad)).href) }
  } catch (fehler) {
    return { fehler: fehler instanceof Error ? fehler.message.split('\n')[0] : String(fehler) }
  }
}

/** Liest eine Datei des Repos oder null. @param pfad - repo-relativ @returns Inhalt oder null */
const lies = (pfad) => (existsSync(join(WURZEL, pfad)) ? readFileSync(join(WURZEL, pfad), 'utf8') : null)

/**
 * Führt einen Fall aus; wirft er (z. B. gegen main ein fehlender Rückgabewert), wird das ein Befund dieses Falls und die
 * übrigen Fälle laufen weiter (Korrekturrunde, code-reviewer 4).
 * @param name - Kennung des Falls
 * @param pruefung - async Funktion des Falls
 */
async function fall(name, pruefung) {
  try {
    await pruefung()
  } catch (fehler) {
    befunde.push(`(${name}) Fall abgebrochen: ${fehler instanceof Error ? fehler.message : String(fehler)}`)
  }
}

/**
 * Rumpf einer Funktion im Quelltext (ab der ersten `{` nach der Signatur bis zur schließenden `}` am Zeilenanfang) — für
 * den wörtlichen Vergleich der Zwillinge ohne Signatur und Typannotationen (Korrekturrunde, code-reviewer 6).
 * @param text - Quelltext
 * @param name - Funktionsname
 * @returns Rumpf oder null
 */
function rumpf(text, name) {
  const anfang = text.indexOf(`export function ${name}(`)
  if (anfang < 0) return null
  const ende = text.indexOf('\n}\n', anfang)
  return ende < 0 ? null : text.slice(text.indexOf('{\n', anfang), ende)
}

/** Server-Regel und Formular-Kopie; null-Felder, wenn ein Export fehlt. @returns { server, formular, fehler } */
async function zwillinge() {
  const server = await lade('src/auftrag/index.ts')
  const formular = await lade('public/leitstand/arbeitspaket-felder.js')
  return { server: server.modul ?? {}, formular: formular.modul ?? {}, fehler: [server.fehler, formular.fehler].filter(Boolean).join('; ') }
}

/** Fall-Tabelle der einen Regel je Eintrag (Advisor A3, Delta-Pass 7): Eintrag, erwarteter Grund, Beispielpfad (nur gültige). */
const BEREICH_FAELLE = [
  { eintrag: '', grund: 'leer' },
  { eintrag: '   ', grund: 'leer' },
  { eintrag: 'a\tb', grund: 'steuerzeichen' },
  { eintrag: 'src/\u0000', grund: 'steuerzeichen' },
  { eintrag: ' /etc/', grund: 'absolut' },
  { eintrag: '/etc/', grund: 'absolut' },
  { eintrag: 'C:\\x', grund: 'absolut' },
  { eintrag: 'c:x', grund: 'absolut' },
  { eintrag: '\\\\server\\f', grund: 'absolut' },
  { eintrag: 'a/../b', grund: 'eltern' },
  { eintrag: '..', grund: 'eltern' },
  { eintrag: 'a\\..', grund: 'eltern' },
  { eintrag: 'src/./', grund: 'punkt' },
  { eintrag: 'a\\.\\b', grund: 'punkt' },
  { eintrag: 'src/.', grund: 'punkt' },
  { eintrag: 'src/*.ts', grund: 'muster' },
  { eintrag: 'src/**/x', grund: 'muster' },
  { eintrag: '**/x', grund: 'muster' },
  { eintrag: 'src/***', grund: 'muster' },
  { eintrag: 's*c/', grund: 'muster' },
  { eintrag: 'src/**/', grund: null, pfad: 'src/a.ts' },
  { eintrag: 'src\\**', grund: null, pfad: 'src/a.ts' },
  { eintrag: 'src\\**\\', grund: null, pfad: 'src/a.ts' },
  { eintrag: 'src/**', grund: null, pfad: 'src/x/a.ts' },
  { eintrag: 'src/*/', grund: null, pfad: 'src/a.ts' },
  { eintrag: ' src/ ', grund: null, pfad: 'src/a.ts' },
  { eintrag: './src', grund: null, pfad: 'src/a.ts' },
  { eintrag: '././src', grund: null, pfad: 'src/a.ts' },
  { eintrag: '.\\', grund: null, pfad: 'docs/a.md' },
  { eintrag: './', grund: null, pfad: 'docs/a.md' },
  { eintrag: '*/', grund: null, pfad: 'docs/a.md' },
  { eintrag: '*', grund: null, pfad: 'docs/a.md' },
  { eintrag: '**', grund: null, pfad: 'docs/a.md' },
  { eintrag: 'src/..ordner/', grund: null, pfad: 'src/..ordner/a.ts' },
  { eintrag: 'src/.config/', grund: null, pfad: 'src/.config/a.json' },
  { eintrag: 'Src/', grund: null, pfad: 'Src/a.ts' },
  { eintrag: 'README.md', grund: null, pfad: 'README.md' },
]

try {
  // ─── (r1) Zwilling pruefeBereich ────────────────────────────────────────────
  await fall('r1', async () => {
    const { server, formular, fehler } = await zwillinge()
    if (typeof server.pruefeBereich !== 'function' || typeof formular.pruefeBereich !== 'function') {
      befunde.push(`(r1) pruefeBereich fehlt (Server: ${typeof server.pruefeBereich}, Formular: ${typeof formular.pruefeBereich}) ${fehler}`)
    } else {
      const abweichend = BEREICH_FAELLE.filter((f) => server.pruefeBereich(f.eintrag) !== f.grund || formular.pruefeBereich(f.eintrag) !== f.grund).map(
        (f) => `${JSON.stringify(f.eintrag)}: erwartet ${f.grund}, Server ${server.pruefeBereich(f.eintrag)}, Formular ${formular.pruefeBereich(f.eintrag)}`
      )
      pruefe(abweichend.length === 0, `(r1) pruefeBereich: Server und Formular urteilen über ${BEREICH_FAELLE.length} Fälle gleich und wie erwartet.`, `(r1) pruefeBereich weicht ab: ${abweichend.join(' · ')}`)
      const [ts, js] = [rumpf(lies('src/auftrag/index.ts') ?? '', 'pruefeBereich'), rumpf(lies('public/leitstand/arbeitspaket-felder.js') ?? '', 'pruefeBereich')]
      pruefe(ts !== null && ts === js, '(r1) pruefeBereich: Rumpf auf beiden Seiten zeichengleich.', '(r1) pruefeBereich: die Rümpfe von Server und Formular unterscheiden sich (Zwilling auseinandergelaufen)')
    }
  })

  // ─── (r2) Listenebene ───────────────────────────────────────────────────────
  await fall('r2', async () => {
    const { server, formular, fehler } = await zwillinge()
    if (typeof server.validiereAuftragBereiche !== 'function' || typeof formular.leseBereiche !== 'function') {
      befunde.push(`(r2) validiereAuftragBereiche/leseBereiche fehlt ${fehler}`)
    } else {
      const abweichend = []
      for (const f of BEREICH_FAELLE) {
        const serverOk = server.validiereAuftragBereiche([f.eintrag]).length === 0
        if (serverOk !== (f.grund === null)) abweichend.push(`Server ${JSON.stringify(f.eintrag)}: ${serverOk ? 'angenommen' : 'abgewiesen'}`)
        if (f.grund === 'leer') continue // leere Zeilen überspringt das Formular (kein Eintrag)
        const gelesen = formular.leseBereiche(f.eintrag)
        if (gelesen.ok !== (f.grund === null) || (!gelesen.ok && gelesen.grund !== f.grund)) abweichend.push(`Formular ${JSON.stringify(f.eintrag)}: ${JSON.stringify(gelesen)}`)
      }
      const beide = formular.leseBereiche('Src/\nsrc/')
      if (server.validiereAuftragBereiche(['Src/', 'src/']).length !== 0 || !gleich(beide, { ok: true, bereiche: ['Src/', 'src/'] })) abweichend.push(`Src/ + src/: ${JSON.stringify(beide)}`)
      pruefe(abweichend.length === 0, '(r2) Listenebene: validiereAuftragBereiche und leseBereiche nehmen dieselben Einträge an, mit demselben Grund; Groß/klein unterschieden.', `(r2) ${abweichend.join(' · ')}`)
    }
  })

  // ─── (r3) Regel ↔ Abgleich (A10) und F-1123 (13) ───────────────────────────
  await fall('r3', async () => {
    const { modul, fehler } = await lade('src/umfang/index.ts')
    if (typeof modul?.gleicheUmfangAb !== 'function') befunde.push(`(r3) gleicheUmfangAb fehlt: ${fehler}`)
    else {
      const verfehlt = BEREICH_FAELLE.filter((f) => f.grund === null && modul.gleicheUmfangAb([{ pfad: f.pfad }], [f.eintrag]).ausserhalb.length !== 0).map((f) => `${JSON.stringify(f.eintrag)} ⇏ ${f.pfad}`)
      const grossKlein = modul.gleicheUmfangAb([{ pfad: 'src/a.ts' }], ['Src/']).ausserhalb
      pruefe(
        verfehlt.length === 0 && gleich(grossKlein, ['src/a.ts']),
        '(r3) Invariante: jeder gültige Eintrag trifft im Umfangs-Abgleich seinen Beispielpfad; Src/ trifft src/a.ts nicht.',
        `(r3) Regel und Abgleich passen nicht zusammen: ${verfehlt.join(' · ')} ${JSON.stringify(grossKlein)}`
      )
      const umbenannt = modul.gleicheUmfangAb([{ pfad: 'kontrollzustand/y.json', alter_pfad: 'docs/x.md' }], ['src/']).ausserhalb
      pruefe(gleich(umbenannt, ['docs/x.md']), '(r3) F-1123 (13): Umbenennung von außerhalb in den Kontrollzustand meldet den alten Pfad.', `(r3) F-1123 (13): Umbenennung meldet ${JSON.stringify(umbenannt)} statt ["docs/x.md"]`)
    }
  })

  // ─── (r4) POST-Formular des Servers (rein) ─────────────────────────────────
  await fall('r4', async () => {
    const { modul, fehler } = await lade('scripts/leitstand-server.mjs')
    if (typeof modul?.pruefeAuftragsformular !== 'function') befunde.push(`(r4) pruefeAuftragsformular fehlt: ${fehler}`)
    else {
      const basis = { titel: 'T', auftragstext: 'A' }
      const muster = modul.pruefeAuftragsformular({ ...basis, bereiche: ['src/*.ts'] })
      pruefe(muster.ok === false && /ist ein Muster/.test(muster.grund ?? ''), '(r4) POST-Formular: bereiche [src/*.ts] ⇒ abgewiesen mit Grund „Muster“.', `(r4) bereiche [src/*.ts] ⇒ ${JSON.stringify(muster)}`)
      const riesig = modul.pruefeAuftragsformular({ ...basis, budget_tokens: 1e300 })
      pruefe(riesig.ok === false, '(r4) POST-Formular: budget_tokens 1e300 ⇒ abgewiesen.', `(r4) budget_tokens 1e300 ⇒ ${JSON.stringify(riesig)}`)
      const endung = modul.pruefeAuftragsformular({ ...basis, bereiche: ['src/**/'], budget_tokens: 2000000 })
      pruefe(endung.ok === true && gleich(endung.bereiche, ['src/**/']) && endung.budget_tokens === 2000000, '(r4) Invariante: bereiche [src/**/] und budget_tokens 2000000 ⇒ angenommen.', `(r4) src/**/ ⇒ ${JSON.stringify(endung)}`)
    }
  })

  // ─── (b1) Zwilling pruefeBudgetTokens ──────────────────────────────────────
  await fall('b1', async () => {
    const { server, formular, fehler } = await zwillinge()
    if (typeof server.pruefeBudgetTokens !== 'function' || typeof formular.pruefeBudgetTokens !== 'function' || typeof server.validiereArbeitspaketFelder !== 'function') {
      befunde.push(`(b1) pruefeBudgetTokens fehlt (Server: ${typeof server.pruefeBudgetTokens}, Formular: ${typeof formular.pruefeBudgetTokens}) ${fehler}`)
    } else {
      const werte = [
        [1, true],
        [2000000, true],
        [Number.MAX_SAFE_INTEGER, true],
        [0, false],
        [-1, false],
        [1.5, false],
        ['5', false],
        [Number.NaN, false],
        [Number.POSITIVE_INFINITY, false],
        [Number.MAX_SAFE_INTEGER + 1, false],
        [1e300, false],
        [null, false],
      ]
      const abweichend = werte
        .filter(([w, erwartet]) => server.pruefeBudgetTokens(w) !== erwartet || formular.pruefeBudgetTokens(w) !== erwartet || (server.validiereArbeitspaketFelder({ budget_tokens: w }).length === 0) !== erwartet)
        .map(([w]) => String(w))
      pruefe(abweichend.length === 0, `(b1) pruefeBudgetTokens: Server, Formular und validiereArbeitspaketFelder gleich über ${werte.length} Werte.`, `(b1) pruefeBudgetTokens weicht ab bei: ${abweichend.join(', ')}`)
      const [ts, js] = [rumpf(lies('src/auftrag/index.ts') ?? '', 'pruefeBudgetTokens'), rumpf(lies('public/leitstand/arbeitspaket-felder.js') ?? '', 'pruefeBudgetTokens')]
      pruefe(ts !== null && ts === js, '(b1) pruefeBudgetTokens: Rumpf auf beiden Seiten zeichengleich.', '(b1) pruefeBudgetTokens: die Rümpfe von Server und Formular unterscheiden sich')
    }
  })

  // ─── (b2) leseBudget ───────────────────────────────────────────────────────
  await fall('b2', async () => {
    const { formular, fehler } = await zwillinge()
    if (typeof formular.leseBudget !== 'function') befunde.push(`(b2) leseBudget fehlt ${fehler}`)
    else {
      const gueltig = ['2000000', ' 2 000 000 ', '2.000.000', '2,000,000', '2\u00a0000\u00a0000', '2\u202f000\u202f000']
      const ungueltig = ['0', '1,5', '-5', 'abc', '2 00 000', '2.000,000', '1e6', '99999999999999999999']
      const abweichend = [
        ...(gleich(formular.leseBudget(''), { ok: true, budget: undefined }) ? [] : ["''"]),
        ...gueltig.filter((t) => !gleich(formular.leseBudget(t), { ok: true, budget: 2000000 })),
        ...ungueltig.filter((t) => formular.leseBudget(t).ok !== false),
      ]
      pruefe(abweichend.length === 0, '(b2) leseBudget: leer ⇒ Standard, Tausendertrenner ⇒ Zahl, sonst ungültig.', `(b2) leseBudget falsch für ${abweichend.map((t) => JSON.stringify(t)).join(', ')}`)
    }
  })

  // ─── (b3) Standards im Hinweis ─────────────────────────────────────────────
  await fall('b3', async () => {
    const { formular } = await zwillinge()
    const budget = await lade('src/budget/index.ts')
    pruefe(
      formular.BUDGET_STANDARD !== undefined && gleich({ ...formular.BUDGET_STANDARD }, { ...budget.modul?.BUDGET_DEFAULTS }),
      '(b3) BUDGET_STANDARD (Formular) gleich BUDGET_DEFAULTS (src/budget).',
      `(b3) BUDGET_STANDARD ${JSON.stringify(formular.BUDGET_STANDARD)} ≠ BUDGET_DEFAULTS ${JSON.stringify(budget.modul?.BUDGET_DEFAULTS)}`
    )
    const ohne = []
    for (const sprache of ['de', 'en', 'ru', 'tr']) {
      const { modul } = await lade(`public/leitstand/i18n/${sprache}.js`)
      const hinweis = modul?.default?.['auftrag.budget.hinweis']
      if (typeof hinweis !== 'string' || !['{fastLane}', '{standard}', '{hoch}'].every((p) => hinweis.includes(p))) ohne.push(sprache)
    }
    pruefe(ohne.length === 0, '(b3) auftrag.budget.hinweis nennt in allen vier Sprachen {fastLane}, {standard}, {hoch}.', `(b3) auftrag.budget.hinweis ohne die drei Standards: ${ohne.join(', ')}`)
  })

  // ─── (f1) Formular ─────────────────────────────────────────────────────────
  await fall('f1', async () => {
    const html = lies('public/leitstand/index.html') ?? ''
    const bereiche = html.indexOf('id="auftrag-bereiche-bereich"')
    const budget = html.indexOf('id="auftrag-budget-bereich"')
    const zwischen = bereiche >= 0 && budget > bereiche ? html.slice(bereiche, budget) : ''
    const feld = budget >= 0 ? html.slice(budget, html.indexOf('</details>', budget)) : ''
    pruefe(
      // Dazwischen nur das Ende der Bereiche und der Anfang des Budgets: genau ein </details> und ein <details.
      zwischen.split('</details>').length === 2 && zwischen.split('<details').length === 2 && /<input[^>]*id="auftrag-budget"/.test(feld) && /id="auftrag-budget-hinweis"/.test(feld),
      '(f1) index.html: #auftrag-budget mit Hinweis in details#auftrag-budget-bereich direkt nach den Bereichen.',
      '(f1) index.html: details#auftrag-budget-bereich mit #auftrag-budget fehlt oder steht nicht direkt nach #auftrag-bereiche-bereich'
    )
    const projekt = lies('public/leitstand/views/projekt.js') ?? ''
    pruefe(
      // Leerraum-tolerant (code-reviewer 7): ein Umbruch durch den Formatierer ändert das Urteil nicht.
      /t\(\s*`auftrag\.bereiche\.fehler\.\$\{bereiche\.grund\}`/.test(projekt) && /budget_tokens:\s*budget\.budget/.test(projekt),
      '(f1) projekt.js: Meldung je Grund, budget_tokens aus leseBudget im Körper.',
      '(f1) projekt.js: Meldung nicht je Grund oder budget_tokens nicht aus leseBudget'
    )
    const fehlend = []
    for (const sprache of ['de', 'en', 'ru', 'tr']) {
      const { modul } = await lade(`public/leitstand/i18n/${sprache}.js`)
      for (const grund of ['steuerzeichen', 'absolut', 'eltern', 'punkt', 'muster']) {
        if (typeof modul?.default?.[`auftrag.bereiche.fehler.${grund}`] !== 'string') fehlend.push(`${sprache}:${grund}`)
      }
    }
    pruefe(fehlend.length === 0, '(f1) i18n: Meldung je Grund in allen vier Sprachen.', `(f1) i18n: Meldung fehlt für ${fehlend.join(', ')}`)
  })

  // ─── (i) Invariante ────────────────────────────────────────────────────────
  await fall('i', async () => {
    const anzahl = [...(lies('scripts/leitstand-server.mjs') ?? '').matchAll(/starteWorkflowSchritt\(/g)].length
    pruefe(anzahl === 6, '(i) Invariante: starteWorkflowSchritt( in leitstand-server.mjs 6×.', `(i) starteWorkflowSchritt( in leitstand-server.mjs ${anzahl}× statt 6×`)
  })
} catch (fehler) {
  befunde.push(`Gate abgebrochen: ${fehler instanceof Error ? fehler.stack : fehler}`)
}

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e):`)
  for (const b of befunde) console.error(`  - ${b}`)
  process.exit(1)
}
console.log(`\n✓ Keine Befunde (${relative(WURZEL, import.meta.filename)}).`)
