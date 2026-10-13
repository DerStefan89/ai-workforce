/**
 * Datei: src/ressourcen/npm-echt.test.ts
 *
 * Zweck: Beleg mit dem ECHTEN npm des Repos (F45 F-2b-2b, F-1075 Variante C, Befund Challenger 12.10.2026): eine lokal
 * gebaute .tgz (eigener minimaler ustar-Schreiber, keine Abhängigkeit) wird mit denselben Argumenten wie Prüflauf und
 * Installation (npmInstallArgs) plus --offline und eigenem --cache installiert. Belegt:
 * (a) npm entpackt package/node_modules/hidden/index.js auch OHNE bundleDependencies nach node_modules/<paket>/node_modules/,
 *     ohne Lockfile-Eintrag — pruefeNpmInstallation lehnt mit 422 „verschachtelte Abhängigkeiten …“ ab;
 * (b) npm verwirft einen Symlink im Tarball;
 * (c) bei doppeltem Eintrag gewinnt auf der Platte der letzte — und der Paketordner-Leser des Prüflaufs (holeNpmInhalt über
 *     eine Attrappe, die genau diese npm-Installation durchreicht) sieht genau diesen Stand.
 * Übersprungen nur, wenn npm-cli.js weder neben node noch unter ../lib/node_modules liegt (Advisor F10).
 *
 * Wird aufgerufen von: npm run test (node --test).
 */

import assert from 'node:assert/strict'
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, test } from 'node:test'
import { gzipSync } from 'node:zlib'
import { raeumeVerzeichnis } from '../../scripts/_aufraeumen.ts'
import { holeNpmInhalt } from '../sammlung/quelle.ts'
import { type NpmRunner, npmInstallArgs, npmReal, pruefeNpmInstallation } from './installation.ts'

const wurzeln: string[] = []
after(() => {
  for (const w of wurzeln) raeumeVerzeichnis(w)
})

/** npm-cli.js neben node (Windows, Installer) oder unter ../lib/node_modules (Linux, CI). */
const NPM_CLI = [join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'), join(dirname(process.execPath), '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js')].find((p) => existsSync(p))

/**
 * Echter npm-Runner über das gefundene npm-cli.js (npmReal sucht nur neben node).
 * @returns Runner
 */
function echterNpm(): NpmRunner {
  if (NPM_CLI === undefined) throw new Error('npm-cli.js fehlt')
  const neben = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')
  if (NPM_CLI === neben) return npmReal
  return async (args, optionen) => {
    const { spawnSync } = await import('node:child_process')
    const r = spawnSync(process.execPath, [NPM_CLI, ...args], { cwd: optionen.cwd, env: optionen.env ?? process.env, encoding: 'utf8', timeout: optionen.timeoutMs })
    return { code: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '', zeitueberschritten: r.error !== undefined && /ETIMEDOUT/.test(String(r.error)) }
  }
}

/**
 * Tar-Kopf (POSIX-ustar) mit gültiger Prüfsumme.
 * @param name - Name (≤ 100 Bytes)
 * @param groesse - Größe der Daten
 * @param typ - Typflag ('0' Datei, '2' Symlink)
 * @param ziel - Linkziel
 * @returns 512 Bytes
 */
function kopf(name: string, groesse: number, typ: string, ziel = ''): Buffer {
  const b = Buffer.alloc(512)
  b.write(name, 0, 100, 'utf8')
  b.write('0000644\0', 100)
  b.write('0000000\0', 108)
  b.write('0000000\0', 116)
  b.write(`${groesse.toString(8).padStart(11, '0')}\0`, 124)
  b.write('00000000000\0', 136)
  b.fill(0x20, 148, 156)
  b.write(typ, 156)
  b.write(ziel, 157, 100)
  b.write('ustar\0', 257)
  b.write('00', 263)
  let summe = 0
  for (const x of b) summe += x
  b.write(`${summe.toString(8).padStart(6, '0')}\0 `, 148)
  return b
}

/**
 * Baut ein .tgz aus Einträgen (Reihenfolge bleibt, Duplikate erlaubt).
 * @param eintraege - { name, inhalt?, symlink? }
 * @returns gzip-Bytes
 */
function tgz(eintraege: Array<{ name: string; inhalt?: string; symlink?: string }>): Buffer {
  const teile: Buffer[] = []
  for (const e of eintraege) {
    if (e.symlink !== undefined) {
      teile.push(kopf(e.name, 0, '2', e.symlink))
      continue
    }
    const daten = Buffer.from(e.inhalt ?? '')
    teile.push(kopf(e.name, daten.length, '0'), daten, Buffer.alloc((512 - (daten.length % 512)) % 512))
  }
  teile.push(Buffer.alloc(1024))
  return gzipSync(Buffer.concat(teile))
}

/**
 * Installiert eine lokale .tgz mit den Argumenten von Prüflauf/Installation (Spezifikation = Dateipfad statt paket@version),
 * offline, mit eigenem Cache.
 * @param datei - .tgz
 * @param ordner - leerer --prefix-Ordner
 * @returns Lockfile-Eintrag des Pakets
 */
async function installiereTgz(datei: string, ordner: string): Promise<{ version: string; integrity: string }> {
  writeFileSync(join(ordner, 'package.json'), JSON.stringify({ name: 'aiw-cap-probe', private: true }))
  const args = npmInstallArgs('probe-paket', '1.0.0', ordner)
  args[1] = datei
  const r = await echterNpm()([...args, '--offline', '--cache', join(dirname(ordner), 'cache')], { cwd: ordner, timeoutMs: 180_000, env: { ...process.env, npm_config_ignore_scripts: 'true' } })
  assert.equal(r.code, 0, `npm install: ${r.stderr}`)
  const lock = JSON.parse(readFileSync(join(ordner, 'package-lock.json'), 'utf8')) as { packages: Record<string, { version: string; integrity: string }> }
  assert.deepEqual(Object.keys(lock.packages).sort(), ['', 'node_modules/probe-paket'], 'kein Lockfile-Eintrag für etwas Verschachteltes')
  return lock.packages['node_modules/probe-paket']
}

const PJ = JSON.stringify({ name: 'probe-paket', version: '1.0.0' })

test('echtes npm (F-2b-2b): node_modules im Tarball landet verschachtelt ohne Lockfile-Eintrag → 422; Symlink verworfen; letzter Eintrag gewinnt', { skip: NPM_CLI === undefined ? 'npm-cli.js weder neben node noch unter ../lib/node_modules — kein npm im Testlauf' : false, timeout: 240_000 }, async () => {
  const basis = mkdtempSync(join(tmpdir(), 'aiw-test-npm-echt-'))
  wurzeln.push(basis)
  const datei = join(basis, 'probe.tgz')
  writeFileSync(
    datei,
    tgz([
      { name: 'package/package.json', inhalt: PJ },
      { name: 'package/index.js', inhalt: 'geprueft' },
      { name: 'package/index.js', inhalt: 'letzter' },
      { name: 'package/link.js', symlink: '../../../ausserhalb' },
      { name: 'package/node_modules/hidden/index.js', inhalt: 'versteckt' },
    ])
  )
  const ordner = join(basis, 'install')
  mkdirSync(ordner)
  const gesperrt = await installiereTgz(datei, ordner)
  const paketOrdner = join(ordner, 'node_modules', 'probe-paket')
  // (a) verschachtelt auf der Platte, nicht im Lockfile (oben geprüft) → gemeinsame Prüfung lehnt ab (Schritt „verschachtelt“).
  assert.equal(readFileSync(join(paketOrdner, 'node_modules', 'hidden', 'index.js'), 'utf8'), 'versteckt')
  const e = pruefeNpmInstallation(ordner, 'probe-paket', gesperrt.version, gesperrt.integrity)
  assert.ok(!e.ok && e.status === 422 && /^verschachtelte Abhängigkeiten oder bundleDependencies im Paketordner nicht unterstützt \(F-1075\)$/.test(e.grund), e.ok ? 'ok' : e.grund)
  // (b) Symlink verworfen.
  assert.equal(lstatSync(join(paketOrdner, 'link.js'), { throwIfNoEntry: false }), undefined)
  // (c) letzter Eintrag gewinnt.
  assert.equal(readFileSync(join(paketOrdner, 'index.js'), 'utf8'), 'letzter')
})

test('echtes npm (F-2b-2b): der Prüflauf liest genau, was npm geschrieben hat (letzter Eintrag, kein Symlink)', { skip: NPM_CLI === undefined ? 'npm-cli.js weder neben node noch unter ../lib/node_modules — kein npm im Testlauf' : false, timeout: 240_000 }, async () => {
  const basis = mkdtempSync(join(tmpdir(), 'aiw-test-npm-echt-pruef-'))
  wurzeln.push(basis)
  const datei = join(basis, 'probe.tgz')
  writeFileSync(
    datei,
    tgz([
      { name: 'package/package.json', inhalt: PJ },
      { name: 'package/index.js', inhalt: 'geprueft' },
      { name: 'package/index.js', inhalt: 'letzter' },
      { name: 'package/link.js', symlink: 'index.js' },
    ])
  )
  // Integrity, wie npm sie für die Datei ins Lockfile schreibt, aus einem Vorlauf.
  const vorlauf = join(basis, 'vorlauf')
  mkdirSync(vorlauf)
  const { integrity } = await installiereTgz(datei, vorlauf)
  // Attrappe reicht den echten npm-Aufruf durch und ersetzt nur paket@version durch die Datei.
  const npm: NpmRunner = (args, optionen) => echterNpm()([args[0], datei, ...args.slice(2), '--offline', '--cache', join(basis, 'cache')], optionen)
  const wurzel = join(basis, 'pruefung')
  mkdirSync(wurzel)
  const e = await holeNpmInhalt({ paket: 'probe-paket', version: '1.0.0', integrity }, npm, wurzel, 180_000)
  assert.ok(e.ok, e.ok ? '' : e.grund)
  assert.deepEqual(
    e.dateien.map((d) => d.pfad),
    ['index.js', 'package.json']
  )
  assert.equal(readFileSync(join(e.inhaltOrdner, 'index.js'), 'utf8'), 'letzter')
})
