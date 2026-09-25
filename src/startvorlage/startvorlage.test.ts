/**
 * Datei: src/startvorlage/startvorlage.test.ts
 *
 * Zweck: node:test-Fälle für das Startvorlage-Modul (F11 WS-2, AK4). Belegt
 * validiereStartvorlageDaten (mindestens ein lesender und ein schreibender
 * Werkzeugsatz), ladeStartvorlage (wirft bei ungültiger Datei) und
 * loeseWerkzeugsatzAuf/leiteProfilReferenzAb gegen die reale Startvorlage
 * unter startvorlagen/beispielprojekt.json.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ladeStartvorlage, leiteProfilReferenzAb, loeseWerkzeugsatzAuf, validiereStartvorlageDaten } from './index.ts'

const GUELTIGE_VORLAGE = {
  startvorlage_schema: 'v0',
  profilPfad: 'profiles/beispielprojekt.json',
  werkzeugStartziel: ['node'],
  werkzeugVersionDeklariert: 'test',
  berechtigungskontext: 'test',
  modell: 'claude-sonnet-5',
  standardBudget: { maxElemente: 10 },
  werkzeugsaetze: {
    lesend: { art: 'lesend', modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read'] },
    schreibend: { art: 'schreibend', modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read', 'Write'] },
  },
}

test('validiereStartvorlageDaten: gültige Vorlage hat keine Verstöße', () => {
  assert.deepStrictEqual(validiereStartvorlageDaten(GUELTIGE_VORLAGE), [])
})

test('validiereStartvorlageDaten: fehlender schreibender Werkzeugsatz ist ein Verstoß (AK4)', () => {
  const ohneSchreibend = {
    ...GUELTIGE_VORLAGE,
    werkzeugsaetze: { lesend: GUELTIGE_VORLAGE.werkzeugsaetze.lesend },
  }
  const verstoesse = validiereStartvorlageDaten(ohneSchreibend)
  assert.ok(verstoesse.some((v) => v.includes("art='schreibend'")))
})

test('validiereStartvorlageDaten: fehlender lesender Werkzeugsatz ist ein Verstoß (AK4)', () => {
  const ohneLesend = {
    ...GUELTIGE_VORLAGE,
    werkzeugsaetze: { schreibend: GUELTIGE_VORLAGE.werkzeugsaetze.schreibend },
  }
  const verstoesse = validiereStartvorlageDaten(ohneLesend)
  assert.ok(verstoesse.some((v) => v.includes("art='lesend'")))
})

test('ladeStartvorlage: reale Datei startvorlagen/beispielprojekt.json ist valide und liefert benannte Werkzeugsätze', () => {
  const vorlage = ladeStartvorlage('startvorlagen/beispielprojekt.json')
  assert.strictEqual(vorlage.startvorlage_schema, 'v0')
  assert.ok(loeseWerkzeugsatzAuf(vorlage, 'lesend') !== undefined)
  assert.ok(loeseWerkzeugsatzAuf(vorlage, 'schreibend') !== undefined)
  assert.strictEqual(loeseWerkzeugsatzAuf(vorlage, 'unbekannt'), undefined)
})

test('ladeStartvorlage: wirft bei nicht existierender Datei', () => {
  assert.throws(() => ladeStartvorlage('startvorlagen/gibt-es-nicht.json'))
})

test('leiteProfilReferenzAb: berechnet Hash frisch aus der real referenzierten Profildatei', () => {
  const vorlage = ladeStartvorlage('startvorlagen/beispielprojekt.json')
  const referenz = leiteProfilReferenzAb(vorlage)
  assert.strictEqual(referenz.pfad, vorlage.profilPfad)
  assert.strictEqual(referenz.hash.length, 64)
  assert.strictEqual(typeof referenz.version, 'number')
})

// F14 WS-4 (F-177): zeitgrenzeMs ist optional — fehlt sie, kein Verstoß (Bestandsverhalten).
test('validiereStartvorlageDaten: fehlendes zeitgrenzeMs ist kein Verstoß (F-177, optional)', () => {
  assert.deepStrictEqual(validiereStartvorlageDaten(GUELTIGE_VORLAGE), [])
})

test('validiereStartvorlageDaten: gesetztes positives zeitgrenzeMs ist gültig (F-177)', () => {
  const mitZeitgrenze = { ...GUELTIGE_VORLAGE, zeitgrenzeMs: 60000 }
  assert.deepStrictEqual(validiereStartvorlageDaten(mitZeitgrenze), [])
})

test('validiereStartvorlageDaten: zeitgrenzeMs <= 0 oder nicht-ganzzahlig ist ein Verstoß (F-177)', () => {
  const negativ = validiereStartvorlageDaten({ ...GUELTIGE_VORLAGE, zeitgrenzeMs: -1000 })
  const null_ = validiereStartvorlageDaten({ ...GUELTIGE_VORLAGE, zeitgrenzeMs: 0 })
  const nichtGanzzahlig = validiereStartvorlageDaten({ ...GUELTIGE_VORLAGE, zeitgrenzeMs: 1.5 })
  const keineZahl = validiereStartvorlageDaten({ ...GUELTIGE_VORLAGE, zeitgrenzeMs: 'bald' })
  assert.ok(negativ.some((v) => v.includes('zeitgrenzeMs')))
  assert.ok(null_.some((v) => v.includes('zeitgrenzeMs')))
  assert.ok(nichtGanzzahlig.some((v) => v.includes('zeitgrenzeMs')))
  assert.ok(keineZahl.some((v) => v.includes('zeitgrenzeMs')))
})

// ─── F16 WS-1 (AK5): optionaler worker.codex-Block ──────────────────────────

const CODEX_BLOCK = {
  startziel: [String.raw`C:\Program Files\codex\codex.exe`],
  versionDeklariert: 'codex-cli 0.153.4',
  sandbox: 'read-only',
}

test('validiereStartvorlageDaten: Vorlage OHNE worker-Block bleibt gültig (F16 AK5, additiv)', () => {
  assert.deepStrictEqual(validiereStartvorlageDaten(GUELTIGE_VORLAGE), [])
})

test('validiereStartvorlageDaten: Vorlage MIT gültigem worker.codex-Block ist gültig (F16 AK5)', () => {
  const mitCodex = { ...GUELTIGE_VORLAGE, worker: { codex: CODEX_BLOCK } }
  assert.deepStrictEqual(validiereStartvorlageDaten(mitCodex), [])
})

test("validiereStartvorlageDaten: worker.codex.sandbox 'workspace-write' ist ein Verstoß (E-M3-2)", () => {
  const verstoesse = validiereStartvorlageDaten({
    ...GUELTIGE_VORLAGE,
    worker: { codex: { ...CODEX_BLOCK, sandbox: 'workspace-write' } },
  })
  assert.ok(verstoesse.some((v) => v.includes('worker.codex.sandbox')))
})

test('validiereStartvorlageDaten: leeres worker.codex.startziel ist ein Verstoß (F16 AK5)', () => {
  const verstoesse = validiereStartvorlageDaten({
    ...GUELTIGE_VORLAGE,
    worker: { codex: { ...CODEX_BLOCK, startziel: [] } },
  })
  assert.ok(verstoesse.some((v) => v.includes('worker.codex.startziel')))
})

test('validiereStartvorlageDaten: worker.codex.startziel[0] mit .cmd-Endung ist ein Verstoß (F-280)', () => {
  const verstoesse = validiereStartvorlageDaten({
    ...GUELTIGE_VORLAGE,
    worker: { codex: { ...CODEX_BLOCK, startziel: [String.raw`C:\Program Files\codex\codex.cmd`] } },
  })
  assert.ok(verstoesse.some((v) => v.includes('F-280')))
})

test('validiereStartvorlageDaten: unbekanntes Feld im worker.codex-Block ist ein Verstoß', () => {
  const verstoesse = validiereStartvorlageDaten({
    ...GUELTIGE_VORLAGE,
    worker: { codex: { ...CODEX_BLOCK, zusatz: 'x' } },
  })
  assert.ok(verstoesse.some((v) => v.includes('worker.codex.zusatz')))
})

test('validiereStartvorlageDaten: startvorlage_schema bleibt auch mit worker-Block v0 (Präzedenz zeitgrenzeMs, F14 WS-4)', () => {
  const mitCodex = { ...GUELTIGE_VORLAGE, worker: { codex: CODEX_BLOCK } }
  assert.strictEqual(mitCodex.startvorlage_schema, 'v0')
  assert.deepStrictEqual(validiereStartvorlageDaten(mitCodex), [])
})

// F16 AK12: die reale Vorlage trägt den worker.codex-Block jetzt wirklich —
// bis dahin belegte dieser Test seine Abwesenheit. Der Abwesenheitsfall
// (eine Vorlage ohne worker bleibt gültig, startvorlage_schema bleibt 'v0')
// ist unverändert durch GUELTIGE_VORLAGE oben abgedeckt und geht nicht
// verloren. ladeStartvorlage wirft bei Verstößen, der Ladevorgang selbst ist
// also bereits der Gültigkeitsbeleg; die Feldprüfungen pinnen zusätzlich die
// Werte, auf denen der Codex-Prozessstart beruht.
test('ladeStartvorlage: startvorlagen/ai-workforce.json ist mit worker.codex-Block gültig und bleibt v0 (F16 AK12)', () => {
  const vorlage = ladeStartvorlage('startvorlagen/ai-workforce.json')
  assert.strictEqual(vorlage.startvorlage_schema, 'v0')
  assert.strictEqual(vorlage.worker?.codex?.sandbox, 'read-only')
  // Form statt Exaktwert: der Test läse den Wert gegen dieselbe handgepflegte Datei,
  // die ihn liefert — das belegt nichts über die installierte Binary, ginge aber bei
  // jedem Codex-Update rot, ohne dass Code kaputt wäre. Der Exaktwert gehört in den
  // AK12-Nachweis, wo er gegen die reale --version-Ausgabe belegt wird.
  assert.match(vorlage.worker?.codex?.versionDeklariert ?? '', /^codex-cli \d+\.\d+\.\d+$/)
  const startziel = vorlage.worker?.codex?.startziel ?? []
  assert.ok(startziel.length >= 1 && startziel[0].length > 0)
  // F-280: ein Skript-Startziel hebt die Argv-Zusicherung auf. validiereStartvorlageDaten
  // prüft das bereits (ladeStartvorlage würde werfen) — hier zusätzlich an der realen
  // Datei festgehalten, weil genau dieser Pfad von Hand gepflegt wird.
  for (const endung of ['.cmd', '.bat', '.ps1']) {
    assert.ok(!startziel[0].toLowerCase().endsWith(endung), `startziel[0] darf nicht auf '${endung}' enden (F-280)`)
  }
})

// ─── F-652 (state/findings.md F-652): optionaler pruefbefehl/pruefZeitgrenzeMs-Block ───────────

test('validiereStartvorlageDaten: Vorlage OHNE pruefbefehl bleibt gültig (F-652, additiv)', () => {
  assert.deepStrictEqual(validiereStartvorlageDaten(GUELTIGE_VORLAGE), [])
})

test('validiereStartvorlageDaten: Vorlage MIT gültigem pruefbefehl/pruefZeitgrenzeMs ist gültig (F-652)', () => {
  const mitPruefbefehl = { ...GUELTIGE_VORLAGE, pruefbefehl: [process.execPath, 'npm-cli.js', 'run', 'check'], pruefZeitgrenzeMs: 600000 }
  assert.deepStrictEqual(validiereStartvorlageDaten(mitPruefbefehl), [])
})

test('validiereStartvorlageDaten: leeres pruefbefehl ist ein Verstoß (F-652)', () => {
  const verstoesse = validiereStartvorlageDaten({ ...GUELTIGE_VORLAGE, pruefbefehl: [] })
  assert.ok(verstoesse.some((v) => v.includes('pruefbefehl')))
})

test('validiereStartvorlageDaten: pruefbefehl[0] mit .cmd-Endung ist ein Verstoß (F-280)', () => {
  const verstoesse = validiereStartvorlageDaten({ ...GUELTIGE_VORLAGE, pruefbefehl: [String.raw`C:\Program Files\nodejs\npm.cmd`, 'run', 'check'] })
  assert.ok(verstoesse.some((v) => v.includes('pruefbefehl[0]')))
})

test('validiereStartvorlageDaten: pruefZeitgrenzeMs <= 0 oder nicht-ganzzahlig ist ein Verstoß (F-652)', () => {
  const negativ = validiereStartvorlageDaten({ ...GUELTIGE_VORLAGE, pruefZeitgrenzeMs: -1 })
  const null_ = validiereStartvorlageDaten({ ...GUELTIGE_VORLAGE, pruefZeitgrenzeMs: 0 })
  const nichtGanzzahlig = validiereStartvorlageDaten({ ...GUELTIGE_VORLAGE, pruefZeitgrenzeMs: 1.5 })
  assert.ok(negativ.some((v) => v.includes('pruefZeitgrenzeMs')))
  assert.ok(null_.some((v) => v.includes('pruefZeitgrenzeMs')))
  assert.ok(nichtGanzzahlig.some((v) => v.includes('pruefZeitgrenzeMs')))
})

test('ladeStartvorlage: startvorlagen/ai-workforce.json trägt einen gültigen pruefbefehl, der npm run check ausführt (F-652)', () => {
  const vorlage = ladeStartvorlage('startvorlagen/ai-workforce.json')
  assert.ok(Array.isArray(vorlage.pruefbefehl) && vorlage.pruefbefehl.length >= 3)
  const [programm, ...argumente] = vorlage.pruefbefehl ?? []
  for (const endung of ['.cmd', '.bat', '.ps1']) {
    assert.ok(!programm.toLowerCase().endsWith(endung), `pruefbefehl[0] darf nicht auf '${endung}' enden (F-280)`)
  }
  assert.ok(argumente.some((a) => a.toLowerCase().includes('npm-cli.js')), 'pruefbefehl muss über npm-cli.js laufen (Windows: npm selbst ist eine .cmd-Datei)')
  assert.deepStrictEqual(argumente.slice(-2), ['run', 'check'])
  assert.ok(typeof vorlage.pruefZeitgrenzeMs === 'number' && vorlage.pruefZeitgrenzeMs > 0)
})

// ─── F-735: optionales pruefketten_pfade (Regel 1j, stack-unabhängig) ─────────────────────────

test('validiereStartvorlageDaten: Vorlage ohne pruefketten_pfade bleibt gültig; gültige Glob-Muster (auch leeres Array) sind gültig (F-735)', () => {
  assert.deepStrictEqual(validiereStartvorlageDaten(GUELTIGE_VORLAGE), [])
  assert.deepStrictEqual(validiereStartvorlageDaten({ ...GUELTIGE_VORLAGE, pruefketten_pfade: ['pyproject.toml', 'tests/**/conftest.py', '.github/workflows/*', 'tools/'] }), [])
  assert.deepStrictEqual(validiereStartvorlageDaten({ ...GUELTIGE_VORLAGE, pruefketten_pfade: [] }), [])
})

test("validiereStartvorlageDaten: pruefketten_pfade lehnt '..', absolute Pfade, Backslashes, ?/[]/{}, Leerstrings und Nicht-Arrays ab (F-735)", () => {
  for (const muster of ['../x.toml', 'a/../b', '..', '/etc/passwd', 'C:/x.toml', 'c:x', String.raw`scripts\check-x.mjs`, '', 'tsconfig.?.json', 'test_[ab].py', '*.{js,ts}']) {
    const verstoesse = validiereStartvorlageDaten({ ...GUELTIGE_VORLAGE, pruefketten_pfade: [muster] })
    assert.ok(verstoesse.some((v) => v.includes('pruefketten_pfade[0]')), `'${muster}' sollte abgelehnt werden, erhalten ${JSON.stringify(verstoesse)}`)
  }
  assert.ok(validiereStartvorlageDaten({ ...GUELTIGE_VORLAGE, pruefketten_pfade: 'pyproject.toml' }).some((v) => v.includes('pruefketten_pfade')))
  // '..' nur als Segment unzulässig — ein Punktpaar im Dateinamen ist kein Ausbruch aus dem Repo.
  assert.deepStrictEqual(validiereStartvorlageDaten({ ...GUELTIGE_VORLAGE, pruefketten_pfade: ['a..b.toml'] }), [])
})
