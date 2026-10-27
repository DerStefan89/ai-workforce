/**
 * Datei: scripts/check-kette.test.mjs
 *
 * Zweck: Tests für den Gate-Läufer scripts/check-kette.mjs (F45 W2a): Liste, Parallelität aus der Umgebung, Ablauf,
 * Zusammenfassung und Exit-Codes des Haupteinstiegs. Gleichzeitigkeit und serielle Gruppe werden mit einem steuerbaren
 * Starter geprüft (keine Wanduhr, advisor-w2a.md B3); echte Prozesse nur für Exit-Code und stderr über die Shell, ein
 * absichtlich rotes Pseudo-Gate, die Wirkungslosigkeit des Imports und den Weg über `npm run check:gates`.
 *
 * Wird aufgerufen von: `npm run test` (scripts/teste.mjs).
 */

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { fuehreKetteAus, GATES, gleicheDatei, hauptprogramm, leseParallelitaet, pruefeListe, SERIELL, STANDARD_PARALLELITAET } from './check-kette.mjs'

const WURZEL = fileURLToPath(new URL('..', import.meta.url))
const KETTE = fileURLToPath(new URL('./check-kette.mjs', import.meta.url))

/**
 * Sammelt die Ausgabe des Läufers statt sie zu schreiben.
 * @returns { teile: { stdout, stderr }, aus } — aus wird an fuehreKetteAus/hauptprogramm übergeben
 */
function sammler() {
  const teile = { stdout: '', stderr: '' }
  return { teile, aus: { stdout: (t) => (teile.stdout += t), stderr: (t) => (teile.stderr += t) } }
}

/**
 * Starter ohne Prozess: jedes Gate endet nach einem Zug der Ereignisschleife mit dem vorgegebenen Ergebnis. Zählt die
 * gleichzeitig laufenden Gates und merkt sich, ob ein serielles Gate neben einem anderen lief.
 * @param exitJe - Exit-Code je Befehl (fehlt ⇒ 0)
 * @param seriell - serielle Befehle
 * @param ausgabeJe - Ausgabe je Befehl ({ stdout, stderr }); fehlt ⇒ „aus <befehl>“ bzw. bei Rot „fehler <befehl>“
 * @returns { stand: { aktiv, maxAktiv, ueberlappt, gestartet }, starte }
 */
function zaehlStarter(exitJe = {}, seriell = [], ausgabeJe = {}) {
  const stand = { aktiv: 0, maxAktiv: 0, ueberlappt: [], gestartet: [] }
  const starte = (befehl) => {
    if (seriell.includes(befehl) && stand.aktiv > 0) stand.ueberlappt.push(befehl)
    stand.aktiv += 1
    stand.maxAktiv = Math.max(stand.maxAktiv, stand.aktiv)
    stand.gestartet.push(befehl)
    return new Promise((fertig) =>
      setImmediate(() => {
        if (seriell.includes(befehl) && stand.aktiv > 1) stand.ueberlappt.push(befehl)
        stand.aktiv -= 1
        const exit = exitJe[befehl] ?? 0
        const vorgabe = ausgabeJe[befehl] ?? { stdout: `aus ${befehl}\n`, stderr: exit === 0 ? '' : `fehler ${befehl}\n` }
        fertig({ exit, ...vorgabe, ms: 10 })
      }),
    )
  }
  return { stand, starte }
}

/**
 * Erzeugt durchnummerierte Pseudo-Gate-Namen.
 * @param n - Anzahl
 * @param praefix - Namensanfang
 * @returns ['g1', 'g2', …]
 */
const gateNamen = (n, praefix = 'g') => Array.from({ length: n }, (_, i) => `${praefix}${i + 1}`)

/** Prüft Skriptpfade relativ zur Repo-Wurzel statt zum Arbeitsordner des Testlaufs. */
const gibtDateiInWurzel = (pfad) => existsSync(join(WURZEL, pfad))

test('leseParallelitaet: fehlt oder leer ⇒ Standard, ganze Zahl ≥ 1 ⇒ Wert, alles andere wirft', () => {
  assert.equal(leseParallelitaet({}), STANDARD_PARALLELITAET)
  assert.equal(leseParallelitaet({ AIW_GATES_PARALLEL: '' }), STANDARD_PARALLELITAET)
  assert.equal(leseParallelitaet({ AIW_GATES_PARALLEL: '1' }), 1)
  assert.equal(leseParallelitaet({ AIW_GATES_PARALLEL: '12' }), 12)
  assert.equal(leseParallelitaet({ AIW_GATES_PARALLEL: '1000' }), 1000, 'große Werte erlaubt; mehr als Gates laufen nie gleichzeitig')
  for (const falsch of ['0', '-1', '1.5', 'x', ' 2', '2 ', '02', 'Infinity']) {
    assert.throws(() => leseParallelitaet({ AIW_GATES_PARALLEL: falsch }), /AIW_GATES_PARALLEL/, falsch)
  }
})

test('pruefeListe: echte Liste ohne Fehler; lint, typecheck und die sechs Sicherheits-Gates sind Teil der Kette', () => {
  assert.deepEqual(pruefeListe(GATES, SERIELL, gibtDateiInWurzel), [])
  for (const pflicht of [
    'npm run lint',
    'npm run typecheck',
    'node scripts/check-f813-csrf.mjs',
    'node scripts/check-f814-host.mjs',
    'node scripts/check-f3-authorization-boundary.mjs',
    'node scripts/check-secrets.mjs',
    'node scripts/check-f1b-wirkungsmarke.mjs',
    'node scripts/check-f9-human-transport.mjs',
  ]) {
    assert.ok(GATES.includes(pflicht), pflicht)
  }
})

test('pruefeListe: doppelt, SERIELL ohne GATES-Eintrag, fehlende Datei; fehlt jedes Skript ⇒ ein Hinweis auf den Arbeitsordner', () => {
  const fehler = pruefeListe(['node a.mjs', 'node a.mjs', 'npm run lint', 'node fehlt.mjs'], ['node b.mjs', 'npm run lint', 'npm run lint'], (p) => p !== 'fehlt.mjs')
  assert.deepEqual(fehler, ['doppelt in GATES: node a.mjs', 'doppelt in SERIELL: npm run lint', 'SERIELL ohne Eintrag in GATES: node b.mjs', 'Gate-Skript fehlt: fehlt.mjs'])
  const falscherOrdner = pruefeListe(GATES, SERIELL, () => false)
  assert.equal(falscherOrdner.length, 1)
  assert.match(falscherOrdner[0], /Arbeitsordner ist nicht die Repo-Wurzel/)
})

test('fuehreKetteAus: zuerst SERIELL einzeln, danach höchstens N gleichzeitig, jedes Gate genau einmal', async () => {
  const seriell = ['s1', 's2']
  const gates = [...gateNamen(9), 's1', ...gateNamen(3, 'h'), 's2']
  for (const n of [1, 2, 4, 20]) {
    const { stand, starte } = zaehlStarter({}, seriell)
    const { aus } = sammler()
    const ergebnis = await fuehreKetteAus(gates, seriell, { parallelitaet: n, starte, aus })
    assert.equal(ergebnis.exit, 0)
    assert.equal(stand.maxAktiv, Math.min(n, gates.length - seriell.length), `N = ${n}`)
    assert.deepEqual(stand.ueberlappt, [], `N = ${n}`)
    assert.deepEqual(stand.gestartet, ['s1', 's2', ...gates.filter((g) => !seriell.includes(g))], `N = ${n}: seriell zuerst, sonst Listenreihenfolge`)
  }
})

test('fuehreKetteAus: Parallelität ohne ganze Zahl ≥ 1 wirft, statt die parallele Gruppe still auszulassen', async () => {
  const { starte } = zaehlStarter()
  const { aus } = sammler()
  for (const falsch of [0, -1, 1.5, Number.NaN, undefined]) {
    await assert.rejects(fuehreKetteAus(['a'], [], { parallelitaet: falsch, starte, aus }), /parallelitaet/, String(falsch))
  }
})

test('fuehreKetteAus: rote Gates ⇒ Exit 1, die übrigen laufen weiter, Zusammenfassung am Ende, letzte Zeile nennt das erste rote', async () => {
  const seriell = ['s1']
  const gates = ['g1', 'rot', 'g3', 'g4', 'g5', 's1']
  const { stand, starte } = zaehlStarter({ rot: 3, s1: 5 }, seriell)
  const { teile, aus } = sammler()
  const ergebnis = await fuehreKetteAus(gates, seriell, { parallelitaet: 2, starte, aus })
  assert.equal(ergebnis.exit, 1)
  assert.deepEqual(ergebnis.rot, ['s1', 'rot'])
  assert.equal(stand.gestartet.length, gates.length, 'nach Rot laufen alle übrigen')
  assert.match(teile.stdout, /^✗ rot \(0\.0 s, Exit 3\)$/m)
  assert.match(teile.stdout, /^✓ g1 \(0\.0 s\)$/m)
  assert.match(teile.stdout, /^▶ g5$/m)
  assert.match(teile.stderr, /^fehler rot$/m, 'stderr eines Gates bleibt auf stderr')
  assert.doesNotMatch(teile.stdout, /^fehler rot$/m)
  const zusammenfassung = teile.stdout.slice(teile.stdout.lastIndexOf('── check-kette:'))
  assert.match(zusammenfassung, /^── check-kette: 4 grün, 2 rot · Wanduhr [\d.]+ s · Σ Einzelzeiten 0\.1 s · parallel 2, seriell 1$/m)
  assert.ok(zusammenfassung.indexOf('✗ s1 (Exit 5)') < zusammenfassung.indexOf('✗ rot (Exit 3)'), 'zuerst rot gewordenes Gate zuerst')
  assert.match(zusammenfassung, /^ {4}fehler rot$/m, 'Ende der Ausgabe des roten Gates wiederholt')
  assert.ok(teile.stdout.endsWith('zuerst rot: s1 · rot: s1, rot\n'), 'letzte Zeile nennt das erste rote Gate')
  assert.match(teile.stderr, /check-kette: rot — s1, rot\n$/)
})

test('fuehreKetteAus: Zusammenfassung kürzt auf 20 Zeilen, trennt stdout/stderr sauber und meldet leere Ausgabe', async () => {
  const dreissig = `${gateNamen(30, 'zeile-').join('\n')}\n`
  const { starte } = zaehlStarter({ lang: 1, ohneUmbruch: 1, still: 1 }, [], {
    lang: { stdout: dreissig, stderr: '' },
    ohneUmbruch: { stdout: 'oben', stderr: 'unten' },
    still: { stdout: '', stderr: '' },
  })
  const { teile, aus } = sammler()
  await fuehreKetteAus(['lang', 'ohneUmbruch', 'still'], [], { parallelitaet: 1, starte, aus })
  const zusammenfassung = teile.stdout.slice(teile.stdout.lastIndexOf('── check-kette:'))
  assert.match(zusammenfassung, /^ {4}zeile-11$/m)
  assert.match(zusammenfassung, /^ {4}zeile-30$/m)
  assert.doesNotMatch(zusammenfassung, /^ {4}zeile-10$/m, 'nur die letzten 20 Zeilen')
  assert.match(zusammenfassung, /^ {4}oben\n {4}unten$/m, 'letzte stdout-Zeile nicht mit stderr verklebt')
  assert.match(zusammenfassung, /^✗ still \(Exit 1\) — letzte 20 Zeilen:\n {4}\(keine Ausgabe\)$/m)
})

test('fuehreKetteAus: alles grün ⇒ Exit 0, kein Rot-Block, nichts auf stderr; Gate nur mit stderr und Exit 0 bleibt grün', async () => {
  const { starte } = zaehlStarter({}, [], { warnt: { stdout: '', stderr: 'nur ein Hinweis\n' } })
  const { teile, aus } = sammler()
  const ergebnis = await fuehreKetteAus(['a', 'warnt', 'b'], [], { parallelitaet: 4, starte, aus })
  assert.equal(ergebnis.exit, 0)
  assert.equal(teile.stderr, 'nur ein Hinweis\n')
  assert.match(teile.stdout, /^✓ warnt \(0\.0 s\)$/m)
  assert.doesNotMatch(teile.stdout, /Rot \(|zuerst rot/)
  assert.match(teile.stdout, /── check-kette: 3 grün, 0 rot/)
})

test('fuehreKetteAus: ein Starter, der wirft, ergibt ein rotes Gate statt Abbruch', async () => {
  const { teile, aus } = sammler()
  const starte = async (befehl) => {
    if (befehl === 'kaputt') throw new Error('spawn EPERM')
    return { exit: 0, stdout: '', stderr: '', ms: 1 }
  }
  const ergebnis = await fuehreKetteAus(['a', 'kaputt', 'b'], [], { parallelitaet: 4, starte, aus })
  assert.equal(ergebnis.exit, 1)
  assert.deepEqual(ergebnis.rot, ['kaputt'])
  assert.equal(ergebnis.ergebnisse.length, 3)
  assert.match(teile.stderr, /Gate startet nicht: spawn EPERM/)
})

test('hauptprogramm: Exit 0 grün, 1 rot, 2 bei Zusatzargument, ungültigem AIW_GATES_PARALLEL oder inkonsistenter Liste — bei 2 startet kein Gate', async () => {
  const lauf = async (optionen, exitJe = {}) => {
    const { stand, starte } = zaehlStarter(exitJe)
    const { teile, aus } = sammler()
    const exit = await hauptprogramm({ env: {}, gates: ['node a.mjs', 'node b.mjs'], seriell: [], gibtDatei: () => true, starte, aus, ...optionen })
    return { exit, gestartet: stand.gestartet.length, teile }
  }
  assert.deepEqual((await lauf({})).exit, 0)
  const rot = await lauf({}, { 'node b.mjs': 1 })
  assert.equal(rot.exit, 1)
  for (const [name, optionen, meldung] of [
    ['Zusatzargument', { argv: ['x'] }, /keine Zusatzargumente/],
    ['AIW_GATES_PARALLEL', { env: { AIW_GATES_PARALLEL: '0' } }, /ganze Zahl/],
    ['Liste', { seriell: ['node fremd.mjs'] }, /SERIELL ohne Eintrag/],
    ['Arbeitsordner', { gibtDatei: () => false }, /Arbeitsordner ist nicht die Repo-Wurzel/],
  ]) {
    const ergebnis = await lauf(optionen)
    assert.equal(ergebnis.exit, 2, name)
    assert.equal(ergebnis.gestartet, 0, name)
    assert.match(ergebnis.teile.stderr, meldung, name)
  }
})

test('gleicheDatei: derselbe Pfad in anderer Schreibweise ist gleich, nicht vorhandene Pfade nicht', () => {
  assert.ok(gleicheDatei(KETTE, join(WURZEL, 'scripts', '..', 'scripts', 'check-kette.mjs')))
  if (process.platform === 'win32') assert.ok(gleicheDatei(KETTE, KETTE.toUpperCase()))
  assert.equal(gleicheDatei(KETTE, join(WURZEL, 'gibt-es-nicht.mjs')), false)
})

test('echte Prozesse über die Shell — Exit-Code, stderr, unbekannter Befehl, absichtlich rotes Pseudo-Gate', async () => {
  const gruen = `node -e "console.log('GRUEN-MARKE')"`
  const rot = `node -e "console.log('vorher');process.stderr.write('ROT-MARKE');process.exit(3)"`
  const unbekannt = 'aiw-befehl-gibt-es-nicht-w2a'
  const { teile, aus } = sammler()
  const ergebnis = await fuehreKetteAus([gruen, rot, unbekannt], [unbekannt], { parallelitaet: 2, aus })
  assert.equal(ergebnis.exit, 1)
  assert.equal(ergebnis.ergebnisse.find((e) => e.befehl === gruen)?.exit, 0)
  assert.equal(ergebnis.ergebnisse.find((e) => e.befehl === rot)?.exit, 3)
  assert.notEqual(ergebnis.ergebnisse.find((e) => e.befehl === unbekannt)?.exit, 0)
  assert.match(teile.stdout, /^GRUEN-MARKE$/m)
  assert.match(teile.stderr, /^ROT-MARKE$/m)
  assert.match(teile.stdout, /^ {4}ROT-MARKE$/m, 'Zusammenfassung zeigt das Ende des roten Gates')
})

test('Ende per Signal ist rot (nur POSIX)', { skip: process.platform === 'win32' ? 'Signale unter Windows nicht abbildbar' : false }, async () => {
  const { teile, aus } = sammler()
  const ergebnis = await fuehreKetteAus([`node -e "process.kill(process.pid,'SIGTERM')"`], [], { parallelitaet: 1, aus })
  assert.equal(ergebnis.exit, 1, 'Signal des Gates oder Exit 143 der Shell ⇒ rot')
  // Führt sh den Befehl per exec aus, meldet der Läufer das Signal; sonst endet die Shell mit 143 (128 + SIGTERM).
  assert.ok(/Signal SIGTERM/.test(teile.stderr) || /Exit 143/.test(teile.stdout), `${teile.stdout}\n${teile.stderr}`)
})

test('Import startet nichts; direkter Aufruf und `npm run check:gates` erreichen den Haupteinstieg (Exit 2 vor dem ersten Gate)', () => {
  const importLauf = spawnSync(process.execPath, ['-e', `import(${JSON.stringify(new URL('./check-kette.mjs', import.meta.url).href)}).then(() => console.log('nur-import'))`], { encoding: 'utf8' })
  assert.equal(importLauf.status, 0, importLauf.stderr)
  assert.equal(importLauf.stdout, 'nur-import\n')
  const zusatz = spawnSync(process.execPath, [KETTE, 'x'], { encoding: 'utf8', cwd: WURZEL })
  assert.equal(zusatz.status, 2)
  assert.match(zusatz.stderr, /keine Zusatzargumente/)
  const ueberNpm = spawnSync('npm run check:gates', { shell: true, encoding: 'utf8', cwd: WURZEL, env: { ...process.env, AIW_GATES_PARALLEL: '0' } })
  assert.equal(ueberNpm.status, 2, `${ueberNpm.stdout}\n${ueberNpm.stderr}`)
  assert.match(ueberNpm.stderr, /AIW_GATES_PARALLEL muss eine ganze Zahl/)
  assert.doesNotMatch(ueberNpm.stdout, /▶/)
})
