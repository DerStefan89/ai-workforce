#!/usr/bin/env node
/**
 * Datei: scripts/check-f45-b2b3e1-pfade.mjs
 *
 * Zweck: Gate für F45 B2b-3e-1 „keine persönlichen Pfade in Render-Screenshots“ (F-1125, features/F45/plan-b2b3e1-v2.md).
 * Neue Module werden je Fall dynamisch geladen, damit jeder Fall gegen main (Rot-Nachweis per git archive, F-1127) seinen
 * eigenen Befund meldet. Legt nichts auf der Platte an (Entscheidung A5): die neutrale Umgebung läuft mit injizierter Wurzel
 * und aufzeichnendem Dateisystem.
 *
 * Prüft:
 * (p1)  Pfadprobe (scripts/render-pfadprobe.mjs): persönliche Pfade gefunden, Platzhalter und neutrale Wurzel sauber; zweiter
 *       Aufruf gleich (kein /g-Zustand); Wurf mit Ort.
 * (p2a) scripts/render-nachweis.mjs (nur als Text — das Skript startet main() beim Import): importiert die Probe, prüft in
 *       knappesScreenshot vor dem einzigen page.screenshot und vor dem Schreiben von protokoll.md/.json; importiert die
 *       neutrale Umgebung nicht (A6).
 * (p2b) genaue Dateimenge: jede instanz*.mjs unter features/**\/nachweise/ außerhalb der eingefrorenen Altliste hat
 *       scripts/neutrale-umgebung-starten.mjs als ersten Import, b2b3e1 ist dabei; die Module der neutralen Umgebung und die
 *       Probe importieren nur node:-Module bzw. einander.
 * (p3a) richteNeutraleUmgebungEin mit injizierter Wurzel, Umgebung und aufzeichnendem fs: Variablen gesetzt, sauber, Wurf bei
 *       persönlicher Wurzel vor jedem Anlegen, entferne löscht den Laufordner.
 * (p3b) Kindprozess: ruft richteNeutraleUmgebungEin mit seinem echten process.env (aufzeichnendes fs) — danach liefern
 *       os.tmpdir()/os.homedir() die neutralen Pfade (Mechanismus auf dieser Plattform, nichts angelegt).
 * (i)   Invariante (auf main schon grün): starteWorkflowSchritt( in scripts/leitstand-server.mjs 6×.
 *
 * Wird aufgerufen von: `npm run check:gates` (und damit `npm run check`).
 *
 * Aufruf: node scripts/check-f45-b2b3e1-pfade.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'

const WURZEL = join(import.meta.dirname, '..')
const befunde = []
console.log('\n=== F45-B2b-3e-1-Pfade-Check ===\n')

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
 * Lädt ein Modul dieses Repos; fehlt es (gegen main), liefert es { fehler } statt zu werfen — der Fall meldet dann selbst.
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
 * Alle Modul-Spezifizierer eines Quelltexts in Reihenfolge: statische `import … from`, `export … from` und `import('…')`
 * (Korrekturrunde, code-reviewer 6 — sonst umginge ein dynamischer Import die Erlaubnisliste). Ein `import(` ohne
 * Text-Literal zählt als '(dynamisch)' und ist damit nie erlaubt.
 * @param text - Quelltext
 * @returns Spezifizierer
 */
const importe = (text) =>
  [...text.matchAll(/^(?:import|export)\s[^'";]*?\bfrom\s*['"]([^'"]+)['"]|^import\s*['"]([^'"]+)['"]|\bimport\s*\(\s*(?:['"`]([^'"`]+)['"`])?/gm)]
    .sort((a, b) => a.index - b.index)
    .map((m) => m[1] ?? m[2] ?? m[3] ?? '(dynamisch)')

/** Aufzeichnendes Dateisystem (legt nichts an). @returns { fs, aufrufe } */
function aufzeichnendesFs() {
  const aufrufe = []
  return {
    aufrufe,
    fs: {
      mkdirSync: (pfad) => aufrufe.push(['mkdirSync', pfad]),
      mkdtempSync: (praefix) => {
        aufrufe.push(['mkdtempSync', praefix])
        return `${praefix}gate01`
      },
      rmSync: (pfad, optionen) => aufrufe.push(['rmSync', pfad, optionen]),
      rmdirSync: (pfad) => aufrufe.push(['rmdirSync', pfad]),
    },
  }
}

/** Instanzen von vor B2b-3e-1 — bleiben bewusst ohne neutrale Umgebung (Entscheidung A6, F-1125). Eingefroren. */
const ALTBESTAND = new Set([
  'features/F45/nachweise/b2a2/instanz.mjs',
  'features/F45/nachweise/b2a3/instanz.mjs',
  'features/F45/nachweise/b2a3b/instanz.mjs',
  'features/F45/nachweise/b2b1/instanz.mjs',
  'features/F45/nachweise/b2b1b2b/instanz.mjs',
  'features/F45/nachweise/b2b2a/instanz.mjs',
  'features/F45/nachweise/b2b2b2/instanz.mjs',
  'features/F45/nachweise/b2b3c/instanz.mjs',
  'features/F45/nachweise/b2b3d/instanz.mjs',
  'features/F45/nachweise/f2a/instanz-erneut.mjs',
  'features/F45/nachweise/f2b2/render/instanz.mjs',
  'features/F45/nachweise/f2b2c/instanz.mjs',
  'features/F45/nachweise/f3a2/instanz.mjs',
  'features/F45/nachweise/f3b1/instanz.mjs',
  'features/F45/nachweise/f3b2/instanz.mjs',
])

/**
 * Alle instanz*.mjs unter einem Ordner `nachweise` in features/.
 * @returns repo-relative Pfade mit /
 */
function findeInstanzen() {
  const treffer = []
  const gehe = (ordner) => {
    for (const eintrag of readdirSync(join(WURZEL, ordner), { withFileTypes: true })) {
      const pfad = `${ordner}/${eintrag.name}`
      if (eintrag.isDirectory()) gehe(pfad)
      else if (/^instanz.*\.mjs$/.test(eintrag.name) && pfad.split('/').includes('nachweise')) treffer.push(pfad)
    }
  }
  gehe('features')
  return treffer.sort()
}

try {
  // ─── (p1) Pfadprobe ────────────────────────────────────────────────────────
  {
    const { modul, fehler } = await lade('scripts/render-pfadprobe.mjs')
    if (modul === undefined) befunde.push(`(p1) scripts/render-pfadprobe.mjs nicht ladbar: ${fehler}`)
    else {
      const { findePersoenlichePfade, pruefeAufPersoenlichePfade } = modul
      const persoenlich = ['C:\\Users\\anna\\AppData\\Local\\Temp\\x', 'c:/users/anna', '/Users/anna/x', 'D:\\AppData', '/home/anna/x', 'C--Users-anna-Projekte']
      const sauber = ['C:\\Users\\<name>\\AppData\\Local\\Temp', '<HOME>\\AppData\\Local', '/Users/<name>/x', '/home/<name>', 'C:\\aiw-nachweis\\lauf-1\\temp', '/tmp/aiw-nachweis']
      const verfehlt = persoenlich.filter((t) => findePersoenlichePfade(t).length === 0)
      const falsch = sauber.filter((t) => findePersoenlichePfade(t).length > 0)
      pruefe(verfehlt.length === 0, '(p1) persönliche Pfade (Windows, macOS, Linux, AppData, C--Users-) werden gefunden.', `(p1) nicht gefunden: ${verfehlt.join(' | ')}`)
      pruefe(falsch.length === 0, '(p1) Platzhalter (<name>, <HOME>) und neutrale Wurzel sind sauber.', `(p1) fälschlich gefunden: ${falsch.join(' | ')}`)
      const a = JSON.stringify(findePersoenlichePfade(persoenlich[0]))
      pruefe(a === JSON.stringify(findePersoenlichePfade(persoenlich[0])) && JSON.parse(a).length === 2, '(p1) zweiter Aufruf gleich (kein /g-Zustand).', `(p1) zweiter Aufruf weicht ab oder falsche Anzahl: ${a}`)
      let meldung = ''
      try {
        pruefeAufPersoenlichePfade(persoenlich[0], 'Screenshot x.webp')
      } catch (f) {
        meldung = f instanceof Error ? f.message : String(f)
      }
      pruefe(meldung.includes('Screenshot x.webp'), '(p1) Treffer ⇒ Wurf mit Ort.', `(p1) kein Wurf mit Ort bei persönlichem Pfad (Meldung: '${meldung}')`)
    }
  }

  // ─── (p2a) Render-Helfer: Probe vor jedem Screenshot und vor dem Protokoll ─
  {
    const text = lies('scripts/render-nachweis.mjs') ?? ''
    const imp = importe(text)
    pruefe(/import\s*\{[^}]*\bpruefeAufPersoenlichePfade\b[^}]*\bsammleSichtbarenText\b[^}]*\}\s*from\s*'\.\/render-pfadprobe\.mjs'/.test(text) || /import\s*\{[^}]*\bsammleSichtbarenText\b[^}]*\bpruefeAufPersoenlichePfade\b[^}]*\}\s*from\s*'\.\/render-pfadprobe\.mjs'/.test(text), '(p2a) render-nachweis.mjs importiert die Pfadprobe.', '(p2a) render-nachweis.mjs importiert pruefeAufPersoenlichePfade/sammleSichtbarenText aus ./render-pfadprobe.mjs nicht')
    const screenshots = [...text.matchAll(/\bpage\.screenshot\(/g)].length
    const anfang = text.indexOf('const knappesScreenshot')
    const ende = text.indexOf('\n  }\n', anfang)
    const koerper = anfang >= 0 && ende > anfang ? text.slice(anfang, ende) : ''
    const probe = koerper.search(/pruefeAufPersoenlichePfade\(\s*await page\.evaluate\(sammleSichtbarenText\)/)
    const bild = koerper.indexOf('page.screenshot(')
    pruefe(screenshots === 1 && probe >= 0 && bild > probe, '(p2a) knappesScreenshot prüft den sichtbaren Text vor dem einzigen page.screenshot.', `(p2a) Probe nicht vor dem Screenshot (page.screenshot ${screenshots}×, Probe an ${probe}, Bild an ${bild})`)
    const schreibMd = text.search(/writeFileSync\(join\(ausgabeVerzeichnis, 'protokoll\.md'\)/)
    const schreibJson = text.search(/writeFileSync\(join\(ausgabeVerzeichnis, 'protokoll\.json'\)/)
    const probeMd = text.search(/pruefeAufPersoenlichePfade\(markdown,/)
    const probeJson = text.search(/pruefeAufPersoenlichePfade\(json,/)
    pruefe(probeMd >= 0 && probeJson >= 0 && schreibMd > Math.max(probeMd, probeJson) && schreibJson > Math.max(probeMd, probeJson), '(p2a) protokoll.md/.json werden vor dem Schreiben geprüft.', `(p2a) Protokoll ohne vorherige Probe (Probe md ${probeMd}, json ${probeJson}; Schreiben md ${schreibMd}, json ${schreibJson})`)
    pruefe(!imp.some((s) => s.includes('neutrale-umgebung')), '(p2a) render-nachweis.mjs importiert die neutrale Umgebung nicht (A6).', '(p2a) render-nachweis.mjs importiert die neutrale Umgebung (A6: nur Instanzen)')
  }

  // ─── (p2b) genaue Dateimenge der Instanzen, Importe der Module ─────────────
  {
    const instanzen = findeInstanzen()
    const neu = instanzen.filter((p) => !ALTBESTAND.has(p))
    const fehlendeAlte = [...ALTBESTAND].filter((p) => !instanzen.includes(p))
    pruefe(fehlendeAlte.length === 0, `(p2b) Altliste vollständig vorhanden (${ALTBESTAND.size} Dateien, ausgenommen von der Pflicht zur neutralen Umgebung).`, `(p2b) Altliste nennt fehlende Dateien: ${fehlendeAlte.join(', ')}`)
    pruefe(neu.includes('features/F45/nachweise/b2b3e1/instanz.mjs'), '(p2b) features/F45/nachweise/b2b3e1/instanz.mjs gehört zur Menge der neuen Instanzen.', '(p2b) features/F45/nachweise/b2b3e1/instanz.mjs fehlt')
    const ohne = neu.filter((p) => {
      const erster = importe(lies(p) ?? '')[0] ?? ''
      return !/^(\.\.\/)+scripts\/neutrale-umgebung-starten\.mjs$/.test(erster)
    })
    pruefe(neu.length > 0 && ohne.length === 0, `(p2b) ${neu.length} neue Instanz(en) mit neutrale-umgebung-starten.mjs als erstem Import.`, `(p2b) neue Instanzen ohne neutrale-umgebung-starten.mjs als ersten Import: ${ohne.join(', ') || '(keine neuen Instanzen)'}`)
    const erlaubt = {
      'scripts/neutrale-umgebung-starten.mjs': ['./neutrale-umgebung.mjs'],
      'scripts/neutrale-umgebung.mjs': ['./render-pfadprobe.mjs'],
      'scripts/render-pfadprobe.mjs': [],
    }
    for (const [datei, zusaetzlich] of Object.entries(erlaubt)) {
      const text = lies(datei)
      const fremd = text === null ? ['(Datei fehlt)'] : importe(text).filter((s) => !s.startsWith('node:') && !zusaetzlich.includes(s))
      pruefe(fremd.length === 0, `(p2b) ${datei} importiert nur node:-Module${zusaetzlich.length > 0 ? ` und ${zusaetzlich.join(', ')}` : ''}.`, `(p2b) ${datei}: unerlaubte Importe ${fremd.join(', ')}`)
    }
  }

  // ─── (p3a) neutrale Umgebung, injiziert ────────────────────────────────────
  {
    const { modul, fehler } = await lade('scripts/neutrale-umgebung.mjs')
    const probe = await lade('scripts/render-pfadprobe.mjs')
    if (modul === undefined || probe.modul === undefined) befunde.push(`(p3a) scripts/neutrale-umgebung.mjs bzw. render-pfadprobe.mjs nicht ladbar: ${fehler ?? probe.fehler}`)
    else {
      const { richteNeutraleUmgebungEin } = modul
      for (const [plattform, wurzel] of [['win32', 'C:\\aiw-gate'], ['linux', '/tmp/aiw-gate']]) {
        const { fs, aufrufe } = aufzeichnendesFs()
        const env = { HOME: '/home/anna', USERPROFILE: 'C:\\Users\\anna', TEMP: 'C:\\Users\\anna\\AppData\\Local\\Temp', TMP: 'C:\\Users\\anna\\AppData\\Local\\Temp' }
        const { laufordner, entferne } = richteNeutraleUmgebungEin({ wurzel, env, fs, plattform })
        const werte = [env.HOME, env.USERPROFILE, env.TEMP, env.TMP]
        const unterWurzel = werte.every((w) => typeof w === 'string' && w.startsWith(laufordner) && laufordner.startsWith(wurzel))
        const sauber = werte.every((w) => probe.modul.findePersoenlichePfade(w).length === 0)
        pruefe(unterWurzel && sauber && env.HOME !== env.TEMP, `(p3a) ${plattform}: HOME/USERPROFILE/TEMP/TMP im Laufordner ${laufordner}, ohne persönlichen Pfad.`, `(p3a) ${plattform}: Variablen nicht neutral: ${JSON.stringify(werte)}`)
        aufrufe.length = 0
        entferne()
        pruefe(aufrufe[0]?.[0] === 'rmSync' && aufrufe[0]?.[1] === laufordner && aufrufe[0]?.[2]?.maxRetries > 0, `(p3a) ${plattform}: entferne löscht den Laufordner mit Wiederholung.`, `(p3a) ${plattform}: entferne löscht nicht den Laufordner: ${JSON.stringify(aufrufe)}`)
      }
      const { fs, aufrufe } = aufzeichnendesFs()
      const env = { TEMP: 'vorher' }
      let geworfen = false
      try {
        richteNeutraleUmgebungEin({ wurzel: 'C:\\Users\\anna\\neutral', env, fs, plattform: 'win32' })
      } catch {
        geworfen = true
      }
      pruefe(geworfen && aufrufe.length === 0 && env.TEMP === 'vorher', '(p3a) persönliche Wurzel ⇒ Wurf vor jedem Anlegen und Setzen.', `(p3a) persönliche Wurzel nicht abgewiesen (geworfen ${geworfen}, Aufrufe ${aufrufe.length}, TEMP ${env.TEMP})`)
      let relativGeworfen = false
      try {
        richteNeutraleUmgebungEin({ wurzel: 'nachweis', env, fs, plattform: 'win32' })
      } catch {
        relativGeworfen = true
      }
      pruefe(relativGeworfen && aufrufe.length === 0 && env.TEMP === 'vorher', '(p3a) relative Wurzel ⇒ Wurf vor jedem Anlegen (landete sonst im aktuellen Ordner).', `(p3a) relative Wurzel nicht abgewiesen (geworfen ${relativGeworfen}, Aufrufe ${aufrufe.length})`)
    }
  }

  // ─── (p3b) Kindprozess: os.tmpdir()/os.homedir() nach dem Einrichten ────────
  {
    const wurzel = process.platform === 'win32' ? 'C:\\aiw-gate-p3b' : '/tmp/aiw-gate-p3b'
    const skript = [
      `import { tmpdir, homedir } from 'node:os'`,
      `const { richteNeutraleUmgebungEin } = await import(${JSON.stringify(pathToFileURL(join(WURZEL, 'scripts/neutrale-umgebung.mjs')).href)})`,
      `const fs = { mkdirSync() {}, mkdtempSync: (p) => p + 'kind01', rmSync() {}, rmdirSync() {} }`,
      `const { laufordner, home, temp } = richteNeutraleUmgebungEin({ wurzel: ${JSON.stringify(wurzel)}, fs })`,
      `console.log(JSON.stringify({ laufordner, home, temp, tmpdir: tmpdir(), homedir: homedir() }))`,
    ].join('\n')
    let ausgabe = null
    let fehler = ''
    try {
      ausgabe = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', skript], { cwd: WURZEL, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim().split('\n').pop())
    } catch (f) {
      fehler = f instanceof Error ? (f.stderr?.toString().split('\n').find((z) => /Error/.test(z)) ?? f.message.split('\n')[0]) : String(f)
    }
    pruefe(
      ausgabe !== null && ausgabe.tmpdir === ausgabe.temp && ausgabe.homedir === ausgabe.home && ausgabe.laufordner.startsWith(wurzel),
      `(p3b) im Kindprozess nach richteNeutraleUmgebungEin: os.tmpdir() = ${ausgabe?.tmpdir}, os.homedir() = ${ausgabe?.homedir} (nichts angelegt).`,
      `(p3b) os.tmpdir()/os.homedir() folgen der neutralen Umgebung nicht: ${ausgabe === null ? fehler : JSON.stringify(ausgabe)}`
    )
  }

  // ─── (i) Invariante ────────────────────────────────────────────────────────
  {
    const anzahl = [...(lies('scripts/leitstand-server.mjs') ?? '').matchAll(/starteWorkflowSchritt\(/g)].length
    pruefe(anzahl === 6, '(i) Invariante: starteWorkflowSchritt( in leitstand-server.mjs 6×.', `(i) starteWorkflowSchritt( in leitstand-server.mjs ${anzahl}× statt 6×`)
  }
} catch (fehler) {
  befunde.push(`Gate abgebrochen: ${fehler instanceof Error ? fehler.stack : fehler}`)
}

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e):`)
  for (const b of befunde) console.error(`  - ${b}`)
  process.exit(1)
}
console.log(`\n✓ Keine Befunde (${relative(WURZEL, import.meta.filename)}).`)
