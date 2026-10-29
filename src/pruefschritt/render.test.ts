/**
 * Datei: src/pruefschritt/render.test.ts
 *
 * Zweck: node:test-Fälle für den Render-Nachweis im Lauf (F45 B3b-2a-1, F-1256): Fälligkeit (Ausführung im
 * Arbeitsordner, Prüfergebnis, render.json als Datei), die Vorbedingungen „.render-nachweis/ git-ignoriert“ und
 * „Skript check:render vorhanden“ (QA M2), ZEITGRENZE mit injizierter Grenze und der
 * Ablauf mit injiziertem argv (`node -e`, kein npm, kein Browser) in einem temporären git-Repo. Das echte
 * `npm run check:render` prüft scripts/render-im-lauf.test.mjs. Pfade nur über join (CI ubuntu-latest).
 *
 * Wird aufgerufen von: npm run test (SERIELL in scripts/teste.mjs — git check-ignore mit fester Zeitgrenze, Muster F-1210).
 */

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { schalteGitWartungAb, wegwerfOrdner } from '../../scripts/_wegwerf.ts'
import { validierePruefergebnisDaten } from './index.ts'
import { fuehreRenderNachweisDurch, registriereRenderNachweis, renderNachweisFaellig } from './render.ts'
import type { PruefergebnisV0Daten } from './types.ts'

const WEGWERF = wegwerfOrdner('pruefschritt-render')

/** argv eines node-Einzeilers ohne Shell (Muster pruefschritt.test.ts). @param ausdruck - Code @returns argv */
const knoten = (ausdruck: string): string[] => [process.execPath, '-e', ausdruck]

/**
 * Legt ein Projekt mit render.json an.
 * @param name - Ordnername
 * @param optionen - git (Repo anlegen), ignoriert (.render-nachweis/ in .gitignore), skript (check:render in package.json)
 * @returns Projektwurzel
 */
function projekt(name: string, optionen: { git?: boolean; ignoriert?: boolean; skript?: boolean } = {}): string {
  const wurzel = join(WEGWERF, name)
  mkdirSync(wurzel, { recursive: true })
  writeFileSync(join(wurzel, 'render.json'), '{}\n')
  const skripte = optionen.skript === false ? { build: 'node -e 0' } : { 'check:render': 'node render-nachweis.mjs' }
  writeFileSync(join(wurzel, 'package.json'), JSON.stringify({ name: 'stub', private: true, scripts: skripte }))
  writeFileSync(
    join(wurzel, '.gitignore'),
    optionen.ignoriert === false ? 'kontrollzustand/\n' : 'kontrollzustand/\n.render-nachweis/\n'
  )
  if (optionen.git !== false) {
    execFileSync('git', ['init', '--quiet'], { cwd: wurzel })
    schalteGitWartungAb(wurzel)
  }
  return wurzel
}

test('renderNachweisFaellig: nur Ausführung im Arbeitsordner, nur GRUEN, nur mit render.json als Datei', () => {
  const mit = projekt('faellig-mit', { git: false })
  const ohne = join(WEGWERF, 'faellig-ohne')
  mkdirSync(ohne, { recursive: true })
  const ordnerStattDatei = join(WEGWERF, 'faellig-ordner')
  mkdirSync(join(ordnerStattDatei, 'render.json'), { recursive: true })
  const faellig = (
    wurzel: string,
    pruefErgebnis: 'GRUEN' | 'ROT' | 'ZEITGRENZE' | 'FEHLER' = 'GRUEN',
    ausfuehrungImArbeitsordner = true
  ) => renderNachweisFaellig({ ausfuehrungImArbeitsordner, pruefErgebnis, wurzel })
  assert.equal(faellig(mit), true)
  assert.equal(faellig(ohne), false)
  assert.equal(faellig(ordnerStattDatei), false)
  assert.equal(faellig(join(WEGWERF, 'gibt-es-nicht')), false)
  for (const wert of ['ROT', 'ZEITGRENZE', 'FEHLER'] as const) assert.equal(faellig(mit, wert), false, wert)
  assert.equal(faellig(mit, 'GRUEN', false), false)
})

test('nicht ignoriert: FEHLER mit lesbarem Grund, kein Prozess', async () => {
  const wurzel = projekt('nicht-ignoriert', { ignoriert: false })
  const marke = join(wurzel, 'gelaufen')
  const daten = await fuehreRenderNachweisDurch('lauf-nicht-ignoriert', wurzel, {
    befehl: knoten(`require('fs').writeFileSync(${JSON.stringify(marke)}, '')`),
  })
  assert.equal(daten.ergebnis, 'FEHLER')
  assert.equal(daten.exit_code, null)
  assert.equal(
    daten.ausgabe_ende,
    'nicht ausgeführt: .render-nachweis/ steht nicht in .gitignore — Zeile .render-nachweis/ in .gitignore ergänzen'
  )
  assert.deepEqual(daten.befehl, ['npm', 'run', 'check:render'])
  assert.deepEqual(validierePruefergebnisDaten(daten), [])
  assert.equal(existsSync(marke), false)
})

test('kein git-Repo: FEHLER „nicht auswertbar“ statt stillem Überspringen', async () => {
  const wurzel = projekt('ohne-git', { git: false })
  const daten = await fuehreRenderNachweisDurch('lauf-ohne-git', wurzel, { befehl: knoten('process.exit(0)') })
  assert.equal(daten.ergebnis, 'FEHLER')
  assert.match(daten.ausgabe_ende, /^nicht ausgeführt: git check-ignore für \.render-nachweis\/ nicht auswertbar/)
  assert.deepEqual(validierePruefergebnisDaten(daten), [])
})

test('ignoriert: GRUEN bei Exit 0, ROT bei Exit 1 — registriert über den Rückruf', async () => {
  const wurzel = projekt('gruen-rot')
  const gruen = await fuehreRenderNachweisDurch('lauf-gruen', wurzel, { befehl: knoten('process.exit(0)') })
  assert.equal(gruen.ergebnis, 'GRUEN', gruen.ausgabe_ende)
  assert.equal(gruen.exit_code, 0)
  assert.deepEqual(validierePruefergebnisDaten(gruen), [])
  const registriert: PruefergebnisV0Daten[] = []
  const fehler: string[] = []
  await registriereRenderNachweis(
    'lauf-rot',
    wurzel,
    (d) => registriert.push(d),
    (t) => fehler.push(t),
    {
      befehl: knoten("console.log('Befund: Ueberlauf'); process.exit(1)"),
    }
  )
  assert.deepEqual(fehler, [])
  assert.equal(registriert.length, 1)
  assert.equal(registriert[0]?.ergebnis, 'ROT')
  assert.equal(registriert[0]?.exit_code, 1)
  assert.match(registriert[0]?.ausgabe_ende ?? '', /Befund: Ueberlauf/)
})

test('argv ohne Einspritzung: node + npm-cli.js + run check:render; werfender Rückruf ⇒ meldeFehler, kein Wurf', async () => {
  const wurzel = projekt('argv')
  // npm-cli.js fest auf ein Stub-Skript: belegt die argv-Form, ohne npm zu starten.
  const stub = join(WEGWERF, 'npm-cli.js')
  writeFileSync(stub, 'process.exit(process.argv.slice(2).join(" ") === "run check:render" ? 0 : 3)\n')
  const daten = await fuehreRenderNachweisDurch('lauf-argv', wurzel, { npmCli: stub })
  assert.deepEqual(daten.befehl, [process.execPath, stub, 'run', 'check:render'])
  assert.equal(daten.ergebnis, 'GRUEN', daten.ausgabe_ende)
  const fehler: string[] = []
  await registriereRenderNachweis(
    'lauf-wurf',
    wurzel,
    () => {
      throw new Error('Lineage blockiert')
    },
    (t) => fehler.push(t),
    { befehl: knoten('process.exit(0)') }
  )
  assert.equal(fehler.length, 1)
  assert.match(
    fehler[0] ?? '',
    /Render-Nachweis für Lauf 'lauf-wurf' konnte nicht registriert werden: Lineage blockiert/
  )
})

test('render.json ohne Skript check:render: FEHLER mit Grund statt ROT, kein Prozess (QA M2)', async () => {
  const wurzel = projekt('ohne-skript', { skript: false })
  const marke = join(wurzel, 'gelaufen')
  const stub = join(WEGWERF, 'npm-cli-marke.js')
  writeFileSync(stub, `require('fs').writeFileSync(${JSON.stringify(marke)}, '')\n`)
  const daten = await fuehreRenderNachweisDurch('lauf-ohne-skript', wurzel, { npmCli: stub })
  assert.equal(daten.ergebnis, 'FEHLER')
  assert.match(daten.ausgabe_ende, /^nicht ausgeführt: package\.json hat kein Skript check:render/)
  assert.equal(existsSync(marke), false)
})

test('Zeitgrenze überschritten ⇒ ZEITGRENZE im Schema v0 (QA TC-E)', async () => {
  const wurzel = projekt('zeitgrenze')
  const daten = await fuehreRenderNachweisDurch('lauf-zeitgrenze', wurzel, {
    befehl: knoten('setTimeout(() => process.exit(0), 5000)'),
    zeitgrenzeMs: 300,
  })
  assert.equal(daten.ergebnis, 'ZEITGRENZE')
  assert.equal(daten.exit_code, null)
  assert.deepEqual(validierePruefergebnisDaten(daten), [])
})
