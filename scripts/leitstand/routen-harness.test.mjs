/**
 * Datei: scripts/leitstand/routen-harness.test.mjs
 *
 * Zweck: F46 D6 — Leseroute Harness-Aufbau (scripts/leitstand/routen-harness.mjs) in einem eigenen
 * Temp-Repo: Grünfall (sechs Bausteine, Dateien mit Größe, Ordner eine Ebene gezählt, Muster check-*.mjs
 * ohne Tests), fehlende Orte, Detail einer Datei aus der Liste und einer direkten Datei eines Ordners,
 * Pfad außerhalb der Liste, „..“, absolut, Verknüpfung nach außen, zu groß (gekappt), binär, Kappung der
 * Ordnerliste und per echtem HTTP-Aufruf Statuscodes und Herkunftsprüfung (Sec-Fetch-Site).
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { raeumeVerzeichnis } from '../_aufraeumen.ts'
import { erzeugeRequestHandler } from '../leitstand-server.mjs'
import { baueHarnessDatei, baueHarnessProjektion, HARNESS_BAUSTEINE, lesbareHarnessPfade, MAX_BYTES, MAX_ORDNER_EINTRAEGE, pruefeHarnessHerkunft, pruefeHarnessPfad } from './routen-harness.mjs'

/** Dateien des Grünfall-Repos (repo-relativ → Inhalt); ein Name auf '/' endet, ist ein leerer Ordner. */
const DATEIEN = {
  'CLAUDE.md': '# Regeln\n',
  'ARCHITECTURE.md': '# Architektur\n',
  'docs/STATUS.md': '# Status\n',
  'docs/adr/technischer-stack.md': '# ADR\n',
  'docs/adr/unterordner/tief.md': 'tief',
  'state/findings.md': '# Findings\n',
  'state/zwischenstand/.gitkeep': '',
  '.claude/agents/qa.md': '# qa\n',
  '.claude/agents/design-guardian.md': '# dg\n',
  '.claude/skills/advisor-pass/SKILL.md': '# skill\n',
  '.claude/settings.json': '{ "hooks": {} }\n',
  '.claude/hooks/commit-guard.cjs': '/** Datei: .claude/hooks/commit-guard.cjs */\n',
  'scripts/check-docs.mjs': '// check\n',
  'scripts/check-rules.mjs': '// check\n',
  'scripts/check-docs.test.mjs': '// test\n',
  'scripts/hilfe.mjs': '// kein check\n',
  'package.json': '{}\n',
}

/**
 * Legt ein Temp-Repo an, ruft fn auf und räumt danach auf.
 * @param fn - (repoWurzel) => void | Promise
 * @param dateien - repo-relativer Pfad → Inhalt
 */
async function mitRepo(fn, dateien = DATEIEN) {
  const repoWurzel = mkdtempSync(join(tmpdir(), 'f46-harness-'))
  try {
    for (const [pfad, inhalt] of Object.entries(dateien)) {
      mkdirSync(dirname(join(repoWurzel, pfad)), { recursive: true })
      writeFileSync(join(repoWurzel, pfad), inhalt)
    }
    await fn(repoWurzel)
  } finally {
    raeumeVerzeichnis(repoWurzel)
  }
}

/** Eintrag einer Projektion nach Pfad. */
function eintrag(projektion, pfad) {
  for (const b of projektion.bausteine) for (const e of b.eintraege) if (e.pfad === pfad) return e
  return undefined
}

test('Grünfall: sechs Bausteine in fester Reihenfolge, Dateien mit Größe, Ordner eine Ebene gezählt, Bremsen geschützt', async () => {
  await mitRepo((repoWurzel) => {
    const p = baueHarnessProjektion({ repoWurzel })
    assert.strictEqual(p.status, 'ok')
    assert.deepStrictEqual(
      p.bausteine.map((b) => b.id),
      ['regeln', 'wissen', 'gedaechtnis', 'rollen', 'bremsen', 'pruefung']
    )
    const claude = eintrag(p, 'CLAUDE.md')
    assert.strictEqual(claude.vorhanden, true)
    assert.strictEqual(claude.art, 'datei')
    assert.strictEqual(claude.groesse, DATEIEN['CLAUDE.md'].length)
    assert.match(claude.geaendert, /^\d{4}-\d\d-\d\dT/)

    // Ordner: nur eine Ebene; Unterordner zählt als ein Eintrag, sein Inhalt erscheint nicht.
    const adr = eintrag(p, 'docs/adr')
    assert.strictEqual(adr.anzahl, 2)
    assert.deepStrictEqual(
      adr.eintraege.map((e) => [e.name, e.art]),
      [
        ['technischer-stack.md', 'datei'],
        ['unterordner', 'ordner'],
      ]
    )
    assert.ok(!JSON.stringify(p).includes('tief.md'), 'nicht rekursiv')
    // Punkt-Namen zählen nicht; ein leerer Ordner ist vorhanden mit 0.
    assert.strictEqual(eintrag(p, 'state/zwischenstand').anzahl, 0)
    // Skills sind Ordner: gezählt, aber nicht als Datei lesbar.
    assert.deepStrictEqual(eintrag(p, '.claude/skills').eintraege, [{ name: 'advisor-pass', art: 'ordner' }])
    // Muster check-*.mjs ohne *.test.mjs und ohne andere Skripte.
    const pruef = eintrag(p, 'scripts')
    assert.strictEqual(pruef.muster, 'check-*.mjs')
    assert.strictEqual(pruef.anzahl, 2)
    assert.deepStrictEqual(
      pruef.eintraege.map((e) => e.name),
      ['check-docs.mjs', 'check-rules.mjs']
    )
    // Bremsen tragen das Schloss, sonst niemand.
    assert.strictEqual(eintrag(p, '.claude/settings.json').geschuetzt, true)
    assert.strictEqual(eintrag(p, '.claude/hooks').geschuetzt, true)
    assert.strictEqual(eintrag(p, 'CLAUDE.md').geschuetzt, undefined)
  })
})

test('fehlende Orte: vorhanden false mit Status ok — auch für eine nicht existierende Repo-Wurzel; nie ein Wurf', async () => {
  await mitRepo(
    (repoWurzel) => {
      const p = baueHarnessProjektion({ repoWurzel })
      const alle = p.bausteine.flatMap((b) => b.eintraege)
      assert.strictEqual(alle.length, HARNESS_BAUSTEINE.flatMap((b) => b.eintraege).length)
      for (const e of alle) {
        assert.strictEqual(e.vorhanden, false, e.pfad)
        assert.strictEqual(e.status, 'ok', e.pfad)
        assert.strictEqual(e.anzahl, undefined, e.pfad)
      }
    },
    { 'leer.txt': '' }
  )
  const p = baueHarnessProjektion({ repoWurzel: join(tmpdir(), `f46-harness-gibt-es-nicht-${randomUUID()}`) })
  assert.ok(p.bausteine.flatMap((b) => b.eintraege).every((e) => e.vorhanden === false))
})

test('Detail: Datei der Liste und direkte Datei eines gelisteten Ordners werden gelesen', async () => {
  await mitRepo((repoWurzel) => {
    const claude = baueHarnessDatei({ repoWurzel, pfad: 'CLAUDE.md' })
    assert.strictEqual(claude.http, 200)
    assert.strictEqual(claude.koerper.status, 'ok')
    assert.strictEqual(claude.koerper.text, '# Regeln\n')
    assert.strictEqual(claude.koerper.gekuerzt, false)
    const hook = baueHarnessDatei({ repoWurzel, pfad: '.claude/hooks/commit-guard.cjs' })
    assert.strictEqual(hook.koerper.status, 'ok')
    assert.match(hook.koerper.text, /commit-guard/)
    assert.strictEqual(baueHarnessDatei({ repoWurzel, pfad: 'docs/adr/technischer-stack.md' }).koerper.status, 'ok')
    assert.strictEqual(baueHarnessDatei({ repoWurzel, pfad: 'scripts/check-docs.mjs' }).koerper.status, 'ok')
  })
})

test('Pfad außerhalb der Liste: 400, nichts gelesen (Datei im Repo, Ordner, tiefer Pfad, Skill-Datei, Test, Fremdskript)', async () => {
  await mitRepo((repoWurzel) => {
    for (const pfad of ['package.json', 'docs/adr', 'docs/adr/unterordner/tief.md', '.claude/skills/advisor-pass/SKILL.md', 'scripts/check-docs.test.mjs', 'scripts/hilfe.mjs', 'README.md', 'state/zwischenstand/.gitkeep']) {
      const { http, koerper } = baueHarnessDatei({ repoWurzel, pfad })
      assert.strictEqual(http, 400, pfad)
      assert.strictEqual(koerper.text, undefined, pfad)
    }
  })
})

test('„..“, absolut, Backslash, Steuerzeichen und leer: 400 vor jeder Dateioperation', async () => {
  await mitRepo((repoWurzel) => {
    writeFileSync(join(dirname(repoWurzel), 'f46-harness-geheim.md'), 'GEHEIM')
    try {
      for (const pfad of ['../f46-harness-geheim.md', 'docs/../CLAUDE.md', '..', join(repoWurzel, 'CLAUDE.md'), 'C:/Windows/win.ini', '/etc/passwd', 'docs\\STATUS.md', 'CLAUDE.md\u0000', '', null, 'x'.repeat(400)]) {
        const { http, koerper } = baueHarnessDatei({ repoWurzel, pfad })
        assert.strictEqual(http, 400, String(pfad))
        assert.ok(!JSON.stringify(koerper).includes('GEHEIM'))
      }
    } finally {
      rmSync(join(dirname(repoWurzel), 'f46-harness-geheim.md'), { force: true })
    }
  })
  assert.strictEqual(pruefeHarnessPfad('docs/STATUS.md'), null)
  assert.match(pruefeHarnessPfad('a/../b'), /\.\./)
})

test('Verknüpfung nach außen: Ordner als Junction → Eintrag fehler, Datei darin nicht lesbar', async (t) => {
  const draussen = mkdtempSync(join(tmpdir(), 'f46-harness-draussen-'))
  try {
    writeFileSync(join(draussen, 'geheim.md'), 'GEHEIM')
    await mitRepo((repoWurzel) => {
      try {
        symlinkSync(draussen, join(repoWurzel, 'docs/harness'), 'junction')
      } catch (fehler) {
        t.skip(`Verknüpfung nicht anlegbar: ${fehler.message}`)
        return
      }
      const p = baueHarnessProjektion({ repoWurzel })
      const harness = eintrag(p, 'docs/harness')
      assert.strictEqual(harness.status, 'fehler')
      assert.strictEqual(harness.eintraege, undefined)
      assert.ok(!JSON.stringify(p).includes('geheim.md'))
      const { http, koerper } = baueHarnessDatei({ repoWurzel, pfad: 'docs/harness/geheim.md' })
      assert.strictEqual(http, 400)
      assert.ok(!JSON.stringify(koerper).includes('GEHEIM'))
      rmSync(join(repoWurzel, 'docs/harness'), { recursive: false, force: true })
    })
  } finally {
    raeumeVerzeichnis(draussen)
  }
})

test('Verknüpfung nach außen: Datei-Symlink in einem gelisteten Ordner ist „sonstiges“ und nicht lesbar', async (t) => {
  const draussen = mkdtempSync(join(tmpdir(), 'f46-harness-draussen-'))
  try {
    writeFileSync(join(draussen, 'geheim.cjs'), 'GEHEIM')
    await mitRepo((repoWurzel) => {
      try {
        symlinkSync(join(draussen, 'geheim.cjs'), join(repoWurzel, '.claude/hooks/geheim.cjs'), 'file')
      } catch (fehler) {
        t.skip(`Datei-Symlink nicht anlegbar (Windows ohne Rechte): ${fehler.message}`)
        return
      }
      const hooks = eintrag(baueHarnessProjektion({ repoWurzel }), '.claude/hooks')
      assert.deepStrictEqual(
        hooks.eintraege.find((e) => e.name === 'geheim.cjs'),
        { name: 'geheim.cjs', art: 'sonstiges' }
      )
      assert.strictEqual(baueHarnessDatei({ repoWurzel, pfad: '.claude/hooks/geheim.cjs' }).http, 400)
    })
  } finally {
    raeumeVerzeichnis(draussen)
  }
})

test('Verknüpfung nach außen: Junction in einem gelisteten Ordner ist „sonstiges“, ihr Inhalt erscheint nicht und ist nicht lesbar', async (t) => {
  const draussen = mkdtempSync(join(tmpdir(), 'f46-harness-draussen-'))
  try {
    writeFileSync(join(draussen, 'geheim.cjs'), 'GEHEIM')
    await mitRepo((repoWurzel) => {
      const verknuepft = join(repoWurzel, '.claude/hooks/aussen')
      try {
        symlinkSync(draussen, verknuepft, 'junction')
      } catch (fehler) {
        t.skip(`Verknüpfung nicht anlegbar: ${fehler.message}`)
        return
      }
      const hooks = eintrag(baueHarnessProjektion({ repoWurzel }), '.claude/hooks')
      assert.deepStrictEqual(
        hooks.eintraege.find((e) => e.name === 'aussen'),
        { name: 'aussen', art: 'sonstiges' }
      )
      for (const pfad of ['.claude/hooks/aussen', '.claude/hooks/aussen/geheim.cjs']) assert.strictEqual(baueHarnessDatei({ repoWurzel, pfad }).http, 400, pfad)
      rmSync(verknuepft, { recursive: false, force: true })
    })
  } finally {
    raeumeVerzeichnis(draussen)
  }
})

test('zu groß: höchstens MAX_BYTES, Kennzeichen gekuerzt; binär: kein Text', async () => {
  await mitRepo((repoWurzel) => {
    writeFileSync(join(repoWurzel, 'CLAUDE.md'), 'a'.repeat(MAX_BYTES + 5000))
    const gross = baueHarnessDatei({ repoWurzel, pfad: 'CLAUDE.md' }).koerper
    assert.strictEqual(gross.status, 'ok')
    assert.strictEqual(gross.gekuerzt, true)
    assert.strictEqual(Buffer.byteLength(gross.text), MAX_BYTES)
    assert.strictEqual(gross.groesse, MAX_BYTES + 5000)
    writeFileSync(join(repoWurzel, 'ARCHITECTURE.md'), Buffer.from([0x50, 0x4b, 0x00, 0x01]))
    const binaer = baueHarnessDatei({ repoWurzel, pfad: 'ARCHITECTURE.md' }).koerper
    assert.strictEqual(binaer.status, 'binaer')
    assert.strictEqual(binaer.text, undefined)
  })
})

test('Ordnerliste gekappt: gezählt wird alles, genannt und lesbar sind nur die ersten MAX_ORDNER_EINTRAEGE', async () => {
  const dateien = { ...DATEIEN }
  for (let i = 0; i < MAX_ORDNER_EINTRAEGE + 5; i++) dateien[`docs/harness/d${String(i).padStart(4, '0')}.md`] = 'x'
  await mitRepo((repoWurzel) => {
    const p = baueHarnessProjektion({ repoWurzel })
    const harness = eintrag(p, 'docs/harness')
    assert.strictEqual(harness.anzahl, MAX_ORDNER_EINTRAEGE + 5)
    assert.strictEqual(harness.eintraege.length, MAX_ORDNER_EINTRAEGE)
    assert.strictEqual(harness.gekappt, true)
    assert.ok(lesbareHarnessPfade(p).has('docs/harness/d0000.md'))
    assert.strictEqual(baueHarnessDatei({ repoWurzel, pfad: `docs/harness/d${String(MAX_ORDNER_EINTRAEGE + 4).padStart(4, '0')}.md` }).http, 400)
  }, dateien)
})

test('Herkunft: nur same-origin, none oder ohne Sec-Fetch-Site', () => {
  assert.strictEqual(pruefeHarnessHerkunft({ headers: {} }), null)
  assert.strictEqual(pruefeHarnessHerkunft({ headers: { 'sec-fetch-site': 'same-origin' } }), null)
  assert.strictEqual(pruefeHarnessHerkunft({ headers: { 'sec-fetch-site': 'none' } }), null)
  assert.notStrictEqual(pruefeHarnessHerkunft({ headers: { 'sec-fetch-site': 'cross-site' } }), null)
  assert.notStrictEqual(pruefeHarnessHerkunft({ headers: { 'sec-fetch-site': 'same-site' } }), null)
})

test('HTTP: GET /api/harness und /api/harness/datei — 200, 400 außerhalb der Liste, 403 von fremder Seite, nur GET', async () => {
  await mitRepo(async (repoWurzel) => {
    const basisVerzeichnis = `kontrollzustand-test-f46-harness-${randomUUID()}`
    const handler = erzeugeRequestHandler({ basisVerzeichnis, startvorlagePfad: 'startvorlagen/beispielprojekt.json', repoWurzel, globalerLaufZustand: { aktiv: false, laufId: null, abortController: null } })
    const server = createServer(handler)
    await new Promise((ok) => server.listen(0, '127.0.0.1', ok))
    try {
      const { port } = server.address()
      const basis = `http://127.0.0.1:${port}`
      const liste = await fetch(`${basis}/api/harness`)
      assert.strictEqual(liste.status, 200)
      assert.strictEqual((await liste.json()).bausteine.length, 6)
      const datei = await fetch(`${basis}/api/harness/datei?pfad=${encodeURIComponent('.claude/settings.json')}`)
      assert.strictEqual(datei.status, 200)
      assert.strictEqual((await datei.json()).text, DATEIEN['.claude/settings.json'])
      for (const pfad of ['package.json', '../x', '%2e%2e/x']) {
        const antwort = await fetch(`${basis}/api/harness/datei?pfad=${pfad}`)
        assert.strictEqual(antwort.status, 400, pfad)
      }
      assert.strictEqual((await fetch(`${basis}/api/harness/datei`)).status, 400)
      for (const route of ['/api/harness', '/api/harness/datei?pfad=CLAUDE.md']) {
        const fremd = await fetch(`${basis}${route}`, { headers: { 'sec-fetch-site': 'cross-site' } })
        assert.strictEqual(fremd.status, 403, route)
      }
      const post = await fetch(`${basis}/api/harness`, { method: 'POST', body: '{}' })
      assert.notStrictEqual(post.status, 200, 'nur GET')
    } finally {
      await new Promise((ok) => server.close(ok))
      raeumeVerzeichnis(basisVerzeichnis)
    }
  })
})
