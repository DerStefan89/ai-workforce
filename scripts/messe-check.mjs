/**
 * Datei: scripts/messe-check.mjs
 *
 * Zweck: Misst Laufzeit und Speicher je Gate aus `check:gates` (GATES in scripts/check-kette.mjs) und je Testdatei (F45 T, F-1154). Jeder Befehl
 * läuft einzeln nacheinander; am Ende steht eine Markdown-Tabelle (Standard
 * features/F45/nachweise/t/messung-tabelle.md) mit den teuersten zuerst.
 *
 * Gemessen werden je Befehl:
 * - Laufzeit (Wanduhr);
 * - Spitzen-RSS je Node-Prozess: dieselbe Datei wird über NODE_OPTIONS=--import in jeden Node-Prozess des
 *   Befehls geladen (auch in Kindprozesse von `node --test`) und schreibt beim Beenden
 *   process.resourceUsage().maxRSS in eine Sammeldatei; ausgewiesen werden der größte Einzelwert und die
 *   Summe aller Spitzen (Obergrenze, die Spitzen liegen nicht zwingend gleichzeitig);
 * - Δ System: größter Rückgang von os.freemem() gegenüber dem Start des Befehls, alle 200 ms abgetastet —
 *   erfasst auch git, Biome und den nativen tsc, ist aber durch andere Prozesse auf dem Rechner verrauscht.
 *
 * Wird aufgerufen von:
 * - von Hand: `node scripts/messe-check.mjs [--nur gates|tests] [--aus <datei>]` (nicht Teil von npm run check)
 *
 * Wichtig:
 * - Nur Node-Bordmittel. Ein Prozess, der hart beendet wird (kill), schreibt keinen RSS-Wert; die Spalte
 *   „Node-Prozesse“ zählt nur die gemeldeten.
 * - Hakenmodus: Ist die Datei per --import geladen (nicht direkt aufgerufen) und AIW_MESS_DATEI gesetzt, tut sie
 *   nichts außer dem Eintrag beim Beenden.
 */

import { spawn } from 'node:child_process'
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { freemem, tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const istDirekterAufruf = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (!istDirekterAufruf && process.env.AIW_MESS_DATEI) {
  const sammeldatei = process.env.AIW_MESS_DATEI
  process.on('exit', () => {
    try {
      const eintrag = { pid: process.pid, maxRssKb: process.resourceUsage().maxRSS, argv: process.argv.slice(1).join(' ').slice(0, 160) }
      appendFileSync(sammeldatei, `${JSON.stringify(eintrag)}\n`)
    } catch {
      // Messung darf den gemessenen Prozess nie stören.
    }
  })
}

/**
 * Führt einen Befehl aus und misst Zeit, Node-RSS und Δ System.
 * @param befehl - Shell-Befehl
 * @param hakenUrl - file-URL dieser Datei für --import
 * @param raeume - räumt den Wegwerf-Ordner (raeumeVerzeichnis aus scripts/_aufraeumen.ts)
 * @returns { exit, sekunden, maxRssMb, summeRssMb, prozesse, unlesbar, deltaSystemMb, schwerster, ende }
 */
function messe(befehl, hakenUrl, raeume) {
  const ordner = mkdtempSync(join(tmpdir(), 'aiw-messung-'))
  const sammeldatei = join(ordner, 'rss.jsonl')
  writeFileSync(sammeldatei, '')
  const env = { ...process.env, AIW_MESS_DATEI: sammeldatei, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --import="${hakenUrl}"`.trim() }
  const startFrei = freemem()
  let tiefstFrei = startFrei
  const abtaster = setInterval(() => {
    tiefstFrei = Math.min(tiefstFrei, freemem())
  }, 200)
  const start = Date.now()
  return new Promise((fertig) => {
    const kind = spawn(befehl, { shell: true, env, stdio: ['ignore', 'pipe', 'pipe'] })
    let ende = ''
    const merke = (teil) => {
      ende = (ende + teil.toString()).slice(-2000)
    }
    kind.stdout.on('data', merke)
    kind.stderr.on('data', merke)
    kind.on('error', (fehler) => merke(`messe-check: Start scheitert: ${fehler.message}\n`))
    kind.on('close', (code, signal) => {
      clearInterval(abtaster)
      const sekunden = (Date.now() - start) / 1000
      // Zeilen paralleler Prozesse können sich unter Windows mischen: unlesbare überspringen und zählen.
      const eintraege = []
      let unlesbar = 0
      for (const zeile of readFileSync(sammeldatei, 'utf8').split('\n').filter((z) => z !== '')) {
        try {
          eintraege.push(JSON.parse(zeile))
        } catch {
          unlesbar += 1
        }
      }
      raeume(ordner)
      const schwerster = eintraege.reduce((a, b) => (b.maxRssKb > (a?.maxRssKb ?? -1) ? b : a), null)
      fertig({
        exit: code ?? `Signal ${signal}`,
        sekunden,
        maxRssMb: schwerster ? schwerster.maxRssKb / 1024 : 0,
        summeRssMb: eintraege.reduce((s, e) => s + e.maxRssKb, 0) / 1024,
        prozesse: eintraege.length,
        unlesbar,
        deltaSystemMb: Math.max(0, startFrei - tiefstFrei) / 1024 / 1024,
        schwerster: schwerster?.argv ?? '',
        ende,
      })
    })
  })
}

/**
 * Baut eine Markdown-Tabelle, absteigend nach Laufzeit.
 * @param titel - Überschrift
 * @param zeilen - Messergebnisse mit name
 * @returns Markdown-Text
 */
function tabelle(titel, zeilen) {
  const sortiert = [...zeilen].sort((a, b) => b.sekunden - a.sekunden)
  const z = (n) => n.toFixed(0)
  const kopf = `## ${titel}\n\n| # | Befehl | Exit | Zeit (s) | max RSS Node (MB) | Σ RSS Node (MB) | Node-Prozesse | Δ System (MB) |\n|---|---|---|---|---|---|---|---|\n`
  const koerper = sortiert
    .map((m, i) => `| ${i + 1} | \`${m.name}\` | ${m.exit} | ${m.sekunden.toFixed(1)} | ${z(m.maxRssMb)} | ${z(m.summeRssMb)} | ${m.prozesse} | ${z(m.deltaSystemMb)} |`)
    .join('\n')
  const summe = sortiert.reduce((s, m) => s + m.sekunden, 0)
  return `${kopf}${koerper}\n\nSumme Laufzeit: ${summe.toFixed(1)} s (${(summe / 60).toFixed(1)} min), ${sortiert.length} Befehle.\n`
}

if (istDirekterAufruf) {
  const argumente = process.argv.slice(2)
  const nur = argumente.includes('--nur') ? argumente[argumente.indexOf('--nur') + 1] : null
  const aus = argumente.includes('--aus') ? argumente[argumente.indexOf('--aus') + 1] : 'features/F45/nachweise/t/messung-tabelle.md'
  if ((nur !== null && nur !== 'gates' && nur !== 'tests') || typeof aus !== 'string' || aus.startsWith('--')) {
    console.error('messe-check: Aufruf node scripts/messe-check.mjs [--nur gates|tests] [--aus <datei>]')
    process.exit(2)
  }
  // Erst hier geladen: im Hakenmodus bleibt der Import-Aufwand je Node-Prozess klein.
  const { findeTestdateien } = await import('./teste.mjs')
  const { raeumeVerzeichnis } = await import('./_aufraeumen.ts')
  const { GATES } = await import('./check-kette.mjs')
  const hakenUrl = pathToFileURL(fileURLToPath(import.meta.url)).href
  const teile = []
  const kopf = `# Messung check:gates und Testdateien\n\nErzeugt von \`node scripts/messe-check.mjs\` am ${new Date().toISOString()} (Node ${process.version}, ${process.platform}). Jeder Befehl einzeln nacheinander.\n\n`

  for (const [art, befehle] of [
    ['Gates (check:gates)', nur === 'tests' ? [] : GATES.map((b) => ({ name: b, befehl: b }))],
    ['Testdateien (je Datei einzeln, node --test)', nur === 'gates' ? [] : findeTestdateien().map((d) => ({ name: d, befehl: `node --test "${d}"` }))],
  ]) {
    if (befehle.length === 0) continue
    const ergebnisse = []
    for (const { name, befehl } of befehle) {
      const m = await messe(befehl, hakenUrl, raeumeVerzeichnis)
      ergebnisse.push({ name, ...m })
      console.log(`${m.exit === 0 ? 'ok ' : 'ROT'} ${m.sekunden.toFixed(1).padStart(6)} s  ${m.maxRssMb.toFixed(0).padStart(5)} MB  Δ ${m.deltaSystemMb.toFixed(0).padStart(5)} MB  ${name}`)
      if (m.exit !== 0) console.log(m.ende.split('\n').slice(-15).join('\n'))
      if (m.unlesbar > 0) console.log(`  (${m.unlesbar} unlesbare RSS-Zeile(n) übersprungen)`)
    }
    teile.push(tabelle(art, ergebnisse))
  }
  mkdirSync(dirname(aus), { recursive: true })
  writeFileSync(aus, `${kopf}${teile.join('\n')}`)
  console.log(`messe-check: Tabelle in ${aus}`)
}
