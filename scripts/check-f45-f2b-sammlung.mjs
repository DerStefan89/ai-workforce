/**
 * Datei: scripts/check-f45-f2b-sammlung.mjs
 *
 * Zweck: Gate F45 F-2b-1 (Sammlung im Leitstand, Scout liest die Sammlung zuerst — F-1057; Plan features/F45/plan-f2b.md v2.1).
 * Grün
 * (a) Die echte Sammlung docs/harness/kandidaten-2026-09-15.md: nur die Bewertungsmatrix, 176 Zeilen, davon 172 mit Link,
 *     jede Pflichtspalte gefüllt, Selbstprüfung gegen die Angabe der Datei ohne Abweichung (Entscheidung Stefan O1,
 *     12.10.2026: alle 176 zeigen, die 4 ohne Link nicht auswählbar). Jede Abweichung einer Zahl → Befund „Sammlung
 *     geändert — Zahl im Gate nachziehen“.
 * (b) Zuordnung Sammlung ↔ Katalog ohne „mehrdeutig“; playwright-mcp und frontend-design „ohne Prüfbericht (vor F-2b)“.
 * (c) Scout: der Anhang „Sammlung zuerst“ geht nur in den Prompt der Rolle scout; der gestartete Argv (Prompt per stdin,
 *     F-642) ist mit und ohne Anhang bitgleich (Delta B1); jede andere Rolle bekommt den Text unverändert.
 * (d) Schema ergebnis-scout additiv: valid-sammlung gültig, alte valid.json gültig, invalid-urteil-sammlung ungültig; die
 *     enum urteil_sammlung gleicht URTEILE (src/sammlung/index.ts, Code-Review 5).
 * (e) Server: Route GET /api/sammlung registriert, Scout-Anhang über ergaenzeScoutPrompt in POST /api/laeufe,
 *     starteWorkflowSchritt( genau 6-mal; Oberfläche: Reiter „Sammlung“ und Bereich in index.html.
 * Rot (Selbsttest)
 * (f) eine Matrixzeile weniger → Befund in der Zahlprüfung; eine leere Pflichtspalte → Strukturfehler.
 *
 * Wird aufgerufen von: npm run check
 *
 * Wichtig: Kein Netz, kein CLI-Start; die Sammlung wird nur gelesen.
 */

import { readFileSync } from 'node:fs'
import { baueAufruf } from '../src/claude-code-gateway/index.ts'
import { baueSammlungAnsicht, parseSammlung, URTEILE } from '../src/sammlung/index.ts'
import { validiereErgebnisScout } from '../src/scout/index.ts'
import { ladeStartvorlage } from '../src/startvorlage/index.ts'
import { loeseAusfuehrungsEingabenAuf } from './leitstand-server.mjs'
import { ergaenzeScoutPrompt } from './leitstand/routen-sammlung.mjs'

const befunde = []
console.log('\n=== F45-F-2b-1-Sammlung-Check ===\n')

/** Feste Zahlen der Sammlung (Stand 15.09.2026; nur hier, zur Laufzeit gilt die Selbstprüfung). */
const ERWARTET = { zeilen: 176, mitLink: 172 }
const HINWEIS = 'Sammlung geändert — Zahl im Gate nachziehen (scripts/check-f45-f2b-sammlung.mjs, ERWARTET)'

/**
 * Zahlprüfung einer Sammlungsdatei.
 * @param text - Inhalt
 * @returns Befunde (leer = in Ordnung)
 */
function pruefeZahlen(text) {
  const p = parseSammlung(text)
  if (!p.ok) return [`Sammlung nicht lesbar: ${p.fehler.slice(0, 5).join('; ')}`]
  const fehler = [...p.selbstpruefung]
  if (p.zeilen.length !== ERWARTET.zeilen) fehler.push(`${p.zeilen.length} statt ${ERWARTET.zeilen} Zeilen — ${HINWEIS}`)
  const mitLink = p.zeilen.filter((z) => z.link !== null).length
  if (mitLink !== ERWARTET.mitLink) fehler.push(`${mitLink} statt ${ERWARTET.mitLink} Zeilen mit Link — ${HINWEIS}`)
  return fehler
}

// (a)
const SAMMLUNG = readFileSync('docs/harness/kandidaten-2026-09-15.md', 'utf8')
const zahlen = pruefeZahlen(SAMMLUNG)
if (zahlen.length > 0) befunde.push(...zahlen.map((f) => `(a) ${f}`))
else console.log(`✓ (a) Sammlung: ${ERWARTET.zeilen} Zeilen, ${ERWARTET.mitLink} mit Link, Pflichtspalten gefüllt, Selbstprüfung ohne Abweichung.`)

// (b)
const katalog = JSON.parse(readFileSync('ressourcen.json', 'utf8')).ressourcen
const ansicht = baueSammlungAnsicht({ text: SAMMLUNG, stackText: readFileSync('docs/harness/stack-kandidaten.md', 'utf8'), katalog, katalogStatus: new Map() })
if (ansicht.status !== 'ok') befunde.push(`(b) Ansicht nicht baubar: ${ansicht.grund}`)
else {
  const mehrdeutig = ansicht.eintraege.filter((e) => e.zuordnung.status === 'mehrdeutig').map((e) => e.name)
  if (mehrdeutig.length > 0) befunde.push(`(b) mehrdeutige Zuordnung: ${mehrdeutig.join(', ')}`)
  for (const id of ['playwright-mcp', 'frontend-design']) {
    const e = ansicht.eintraege.find((x) => x.zuordnung.status === 'zugeordnet' && x.zuordnung.katalog_id === id)
    if (e?.pruefbericht !== 'ohne_vor_f2b') befunde.push(`(b) ${id}: Prüfbericht-Lage '${e?.pruefbericht}' statt 'ohne_vor_f2b'`)
  }
  if (!befunde.some((b) => b.startsWith('(b)'))) console.log('✓ (b) Zuordnung ohne „mehrdeutig“; playwright-mcp und frontend-design „ohne Prüfbericht (vor F-2b)“.')
}

// (c)
const vorlage = ladeStartvorlage('startvorlagen/ai-workforce.json')
const roh = { rolle: 'scout', anfragen: [], budget: {}, aufrufEingaben: { modell: 'sonnet' }, auftragId: 'gate' }
const ohneAnhang = loeseAusfuehrungsEingabenAuf(roh, 'recherchierend', 'AUFTRAG', vorlage, process.cwd())
const mitAnhang = loeseAusfuehrungsEingabenAuf(roh, 'recherchierend', ergaenzeScoutPrompt('scout', 'AUFTRAG', process.cwd()), vorlage, process.cwd())
if (!ohneAnhang.ok || !mitAnhang.ok) befunde.push(`(c) Scout-Eingaben nicht auflösbar: ${ohneAnhang.grund ?? mitAnhang.grund}`)
else {
  const tokens = (e) => baueAufruf({ ...e.eingaben.aufrufEingaben, prompt: e.eingaben.auftragstext })
  const a = tokens(ohneAnhang)
  const b = tokens(mitAnhang)
  if (JSON.stringify(a.slice(0, -1)) !== JSON.stringify(b.slice(0, -1))) befunde.push('(c) gestarteter Argv des Scouts ändert sich mit dem Anhang (nur der Prompt darf wachsen)')
  if (!b.at(-1).includes('Sammlung zuerst (verbindlich)')) befunde.push('(c) Scout-Prompt ohne „Sammlung zuerst“')
  if (ergaenzeScoutPrompt('router', 'AUFTRAG', process.cwd()) !== 'AUFTRAG' || ergaenzeScoutPrompt('ausfuehrung', 'AUFTRAG', process.cwd()) !== 'AUFTRAG') befunde.push('(c) andere Rolle bekommt den Anhang')
  if (!befunde.some((x) => x.startsWith('(c)'))) console.log('✓ (c) Scout-Prompt mit „Sammlung zuerst“, gestarteter Argv bitgleich; andere Rollen unverändert.')
}

// (d)
const beispiel = (pfad) => validiereErgebnisScout(JSON.parse(readFileSync(pfad, 'utf8')))
if (beispiel('schemas/examples/ergebnis-scout.valid-sammlung.json').length > 0) befunde.push('(d) valid-sammlung.json ungültig')
if (beispiel('schemas/examples/ergebnis-scout.valid.json').length > 0) befunde.push('(d) altes valid.json ungültig (nicht mehr additiv)')
if (beispiel('schemas/examples/ergebnis-scout.invalid-urteil-sammlung.json').length < 2) befunde.push('(d) invalid-urteil-sammlung.json nicht für quelle und urteil_sammlung abgelehnt')
const schema = JSON.parse(readFileSync('schemas/ergebnis-scout.schema.json', 'utf8'))
const kandidat = schema.properties.kandidaten.items
if (JSON.stringify(kandidat.properties.urteil_sammlung?.enum) !== JSON.stringify([...URTEILE])) befunde.push('(d) Schema urteil_sammlung.enum weicht von URTEILE (src/sammlung/index.ts) ab — Zwilling nachziehen')
if (kandidat.required.includes('quelle') || kandidat.required.includes('urteil_sammlung') || kandidat.properties.quelle === undefined || kandidat.properties.urteil_sammlung === undefined) befunde.push('(d) Schema: quelle/urteil_sammlung fehlen oder sind Pflicht')
if (!befunde.some((x) => x.startsWith('(d)'))) console.log('✓ (d) ergebnis-scout additiv: quelle und urteil_sammlung optional, alte und neue Beispiele wie erwartet; Urteile gleich in Schema und Sammlung.')

// (e)
const server = readFileSync('scripts/leitstand-server.mjs', 'utf8')
if (!server.includes("if (pfad === '/api/sammlung') {")) befunde.push('(e) Route GET /api/sammlung fehlt im Server')
if (!server.includes('let auftragstext = ergaenzeScoutPrompt(eingabenRoh.rolle, auftragVersion.daten.auftragstext, installWurzel)')) befunde.push('(e) Scout-Anhang in POST /api/laeufe fehlt')
const schritte = server.split('starteWorkflowSchritt(').length - 1
if (schritte !== 6) befunde.push(`(e) starteWorkflowSchritt( ${schritte}-mal statt 6-mal`)
const html = readFileSync('public/leitstand/index.html', 'utf8')
if (!html.includes('id="faehigkeiten-reiter-sammlung"') || !html.includes('<div id="sammlung"></div>')) befunde.push('(e) Reiter bzw. Bereich „Sammlung“ fehlt in index.html')
if (!befunde.some((x) => x.startsWith('(e)'))) console.log('✓ (e) Route, Scout-Anhang, starteWorkflowSchritt( 6-mal, Reiter „Sammlung“.')

// (f) Rot-Selbsttest
const zeilen = SAMMLUNG.split('\n')
const ersteMatrixzeile = zeilen.findIndex((z, i) => i > zeilen.indexOf('## Vollständige Bewertungsmatrix') && z.startsWith('| ['))
const ohneZeile = [...zeilen.slice(0, ersteMatrixzeile), ...zeilen.slice(ersteMatrixzeile + 1)].join('\n')
const rot1 = pruefeZahlen(ohneZeile)
const leereSpalte = zeilen.map((z, i) => (i === ersteMatrixzeile ? z.replace(/\| ([^|]+) \|$/, '|  |') : z)).join('\n')
const rot2 = pruefeZahlen(leereSpalte)
if (!rot1.some((f) => f.includes(HINWEIS))) befunde.push('(f) Rotfall „eine Zeile weniger“ ohne Befund')
if (!rot2.some((f) => f.includes('Pflichtspalte leer'))) befunde.push('(f) Rotfall „leere Pflichtspalte“ ohne Befund')
if (!befunde.some((x) => x.startsWith('(f)'))) console.log('✓ (f) Rotfälle: eine Zeile weniger und eine leere Pflichtspalte werden gemeldet.')

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e):`)
  for (const b of befunde) console.error(`  - ${b}`)
  process.exit(1)
}
console.log('\n✓ Keine Befunde.')
