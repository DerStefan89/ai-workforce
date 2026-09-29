#!/usr/bin/env node
/**
 * Datei: features/F36/nachweis-ws5a-installation/echter-nachweis.mjs
 *
 * Zweck: F36 WS-5a — einmaliger ECHTER Installationsnachweis (nicht Teil von `npm run check`, braucht
 * Netz). Ruft bereiteInstallationVor und installiereRessource (src/ressourcen/installation.ts) mit den
 * echten Runnern (echtes npm, echter Serverstart) gegen eine TEMPORÄRE Kopie von ressourcen.json und
 * einen TEMPORÄREN cap-Ordner auf. Das echte ressourcen.json und ~/.ai-workforce bleiben unberührt
 * (am Ende per Hash bzw. Existenz geprüft). Ergebnis (Version, integrity, Dauer, Werkzeugnamen) als
 * ergebnis.json neben diesem Skript und auf stdout.
 *
 * Aufruf: node features/F36/nachweis-ws5a-installation/echter-nachweis.mjs
 */

import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { bereiteInstallationVor, installiereRessource } from '../../../src/ressourcen/installation.ts'
import { validiereRessourcenDaten } from '../../../src/ressourcen/index.ts'

const ECHT = join(process.cwd(), 'ressourcen.json')
const hash = (pfad) => createHash('sha256').update(readFileSync(pfad)).digest('hex')
const echtVorher = hash(ECHT)
const homeVorher = existsSync(join(homedir(), '.ai-workforce'))

const installWurzel = mkdtempSync(join(tmpdir(), 'aiw-ws5a-echt-install-'))
const capWurzel = join(mkdtempSync(join(tmpdir(), 'aiw-ws5a-echt-cap-')), 'cap')
copyFileSync(ECHT, join(installWurzel, 'ressourcen.json'))
const kontext = { installWurzel, capWurzel }

try {
  const t0 = Date.now()
  const vorbereitung = await bereiteInstallationVor('playwright-mcp', kontext)
  const dauerVorbereitenMs = Date.now() - t0
  if (!vorbereitung.ok) throw new Error(`Vorbereiten: ${vorbereitung.status} ${vorbereitung.grund}`)
  console.log('Vorbereitet:', vorbereitung.daten)

  const installiert = await installiereRessource('playwright-mcp', { version: vorbereitung.daten.version, integrity: vorbereitung.daten.integrity, eintragHash: vorbereitung.daten.eintragHash }, kontext)
  if (!installiert.ok) throw new Error(`Installieren: ${installiert.status} ${installiert.grund}`)

  const katalog = JSON.parse(readFileSync(join(installWurzel, 'ressourcen.json'), 'utf8'))
  const eintrag = katalog.ressourcen.find((r) => r.id === 'playwright-mcp')
  const ergebnis = {
    datum: new Date().toISOString(),
    node: process.version,
    paket: installiert.daten.paket,
    version: installiert.daten.version,
    integrity: installiert.daten.integrity,
    lizenzRegistry: vorbereitung.daten.lizenzRegistry,
    dauerVorbereitenMs,
    dauerInstallierenMs: installiert.daten.dauerMs,
    werkzeugeGefunden: installiert.daten.werkzeugeGefunden,
    werkzeugeFreigegeben: eintrag.installation.werkzeuge,
    katalogKopieGueltig: validiereRessourcenDaten(katalog).length === 0,
    katalogKopieFreigabe: eintrag.freigabe,
    installationArgsOhneAbsolutpfad: eintrag.installation.mcp_server.args.slice(1),
    echtesRessourcenJsonUnveraendert: hash(ECHT) === echtVorher,
    homeAiWorkforceUnveraendert: existsSync(join(homedir(), '.ai-workforce')) === homeVorher,
  }
  writeFileSync(join(import.meta.dirname, 'ergebnis.json'), `${JSON.stringify(ergebnis, null, 2)}\n`)
  console.log(JSON.stringify(ergebnis, null, 2))
  if (!ergebnis.echtesRessourcenJsonUnveraendert || !ergebnis.homeAiWorkforceUnveraendert || !ergebnis.katalogKopieGueltig) process.exitCode = 1
} catch (fehler) {
  console.error('✗ Echter Nachweis gescheitert:', fehler.message)
  process.exitCode = 1
} finally {
  rmSync(installWurzel, { recursive: true, force: true })
  rmSync(join(capWurzel, '..'), { recursive: true, force: true })
}
