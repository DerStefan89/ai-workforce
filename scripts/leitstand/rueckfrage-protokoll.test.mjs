/**
 * Datei: scripts/leitstand/rueckfrage-protokoll.test.mjs
 *
 * Zweck: Tests des Protokoll-Schreibers (F45 B2b-3b-1b, features/F45/plan-b2b3b1b-v2.md A2/A3; code-reviewer 2, qa):
 * je Aufruf eine neue Version von rueckfragen-<laufId> mit der übergebenen Liste, Arbeitsordner/Temp/Home neutralisiert,
 * Geheimnis vor dem Kappen maskiert (auch an der Schnittkante), tool_name über der Grenze ⇒ '<zu lang>', ungültiger
 * Eintrag ⇒ Wurf ohne neue Version.
 *
 * Wird aufgerufen von: `npm run test` (node --test)
 */

import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { kanonischesJson, sha256Hex } from '../../src/checkpoint-store/index.ts'
import { ladeArtefaktVersion, listeVersionen } from '../../src/lineage-registry/index.ts'
import { raeumeVerzeichnis } from '../_aufraeumen.ts'
import { erzeugeRueckfrageProtokollSchreiber, TOOL_NAME_ZU_LANG } from './rueckfrage-protokoll.mjs'

const PROFIL = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
const HOME = process.platform === 'win32' ? 'C:\\Users\\nutzer' : '/home/nutzer'
const TEMP = process.platform === 'win32' ? 'C:\\Users\\nutzer\\AppData\\Local\\Temp' : '/tmp'
const ORDNER = process.platform === 'win32' ? `${TEMP}\\wf\\lauf` : '/tmp/wf/lauf'
const GEHEIMNIS = 'sk-ant-api03-GEHEIMNISWERT1234567890'

/** Roh-Eintrag wie aus der Vermittlung. */
const roh = (felder = {}) => ({ tool_use_id: 'toolu_1', tool_name: 'Bash', input_hash: sha256Hex(kanonischesJson({ command: 'ls' })), art: 'stefan_abgelehnt', grund: 'Stefan hat abgelehnt', zeit: '2026-10-16T10:00:00.000Z', befehl: 'ls', ...felder })

function aufbau() {
  const basisVerzeichnis = mkdtempSync(join(tmpdir(), 'rueckfrage-protokoll-test-'))
  const schreibe = erzeugeRueckfrageProtokollSchreiber({ profilReferenz: PROFIL, basisVerzeichnis, home: HOME, temp: TEMP })
  const lies = (laufId) => ladeArtefaktVersion(`rueckfragen-${laufId}`, undefined, { basisVerzeichnis, schreiber: () => {} })?.daten ?? null
  const versionen = (laufId) => listeVersionen(`rueckfragen-${laufId}`, { basisVerzeichnis, schreiber: () => {} }).length
  return { basisVerzeichnis, schreibe, lies, versionen }
}

test('je Aufruf eine neue Version mit der ganzen Liste; Arbeitsordner, Temp und Home neutralisiert', () => {
  const { basisVerzeichnis, schreibe, lies, versionen } = aufbau()
  try {
    const erster = roh({ art: 'auto_deny', grund: `Pfad außerhalb: ${HOME}${process.platform === 'win32' ? '\\' : '/'}x`, befehl: undefined })
    schreibe('l1', erster, { arbeitsordner: ORDNER, eintraege: [erster] })
    const zweiter = roh({ tool_use_id: 'toolu_2', befehl: `node ${ORDNER}${process.platform === 'win32' ? '\\' : '/'}a.mjs ${TEMP}${process.platform === 'win32' ? '\\' : '/'}b` })
    schreibe('l1', zweiter, { arbeitsordner: ORDNER, eintraege: [erster, zweiter] })
    const daten = lies('l1')
    assert.equal(versionen('l1'), 2)
    assert.equal(daten.lauf_id, 'l1')
    assert.deepEqual(daten.eintraege.map((e) => e.art), ['auto_deny', 'stefan_abgelehnt'])
    assert.match(daten.eintraege[0].grund, /^Pfad außerhalb: <HOME>/)
    assert.match(daten.eintraege[1].befehl, /^node <ARBEITSORDNER>.a\.mjs <TEMP>.b$/)
    assert.equal(JSON.stringify(daten).includes('nutzer'), false)
    assert.equal(daten.eintraege[1].input_hash, zweiter.input_hash)
  } finally {
    raeumeVerzeichnis(basisVerzeichnis)
  }
})

test('A3: Geheimnis wird vor dem Kappen maskiert — auch an der Schnittkante (befehl 2000, grund 500)', () => {
  const { basisVerzeichnis, schreibe, lies } = aufbau()
  try {
    // Das Geheimnis beginnt 8 Zeichen vor der Grenze: ohne Maskieren vor dem Kappen bliebe „sk-ant-a“ stehen.
    const e = roh({ befehl: `${'x'.repeat(1991)} ${GEHEIMNIS}`, grund: `${'g'.repeat(491)} ${GEHEIMNIS}` })
    schreibe('l2', e, { arbeitsordner: ORDNER, eintraege: [e] })
    const [eintrag] = lies('l2').eintraege
    assert.equal(eintrag.befehl.length <= 2000 && eintrag.grund.length <= 500, true)
    assert.equal(eintrag.befehl.includes('ant-a') || eintrag.grund.includes('ant-a'), false)
    assert.equal(JSON.stringify(eintrag).includes('GEHEIMNIS'), false)
  } finally {
    raeumeVerzeichnis(basisVerzeichnis)
  }
})

test('tool_name über 200 Zeichen ⇒ Platzhalter; ungültiger Eintrag ⇒ Wurf ohne neue Version', () => {
  const { basisVerzeichnis, schreibe, lies, versionen } = aufbau()
  try {
    const lang = roh({ tool_name: 'T'.repeat(201) })
    schreibe('l3', lang, { arbeitsordner: ORDNER, eintraege: [lang] })
    assert.equal(lies('l3').eintraege[0].tool_name, TOOL_NAME_ZU_LANG)
    const kaputt = roh({ art: 'stefan_immer_erlaubt' })
    assert.throws(() => schreibe('l3', kaputt, { arbeitsordner: ORDNER, eintraege: [lang, kaputt] }), /verstößt gegen schemas\/kontrollzustand-rueckfragen-payload/)
    assert.equal(versionen('l3'), 1)
  } finally {
    raeumeVerzeichnis(basisVerzeichnis)
  }
})
