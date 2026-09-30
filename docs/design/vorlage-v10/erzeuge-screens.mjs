#!/usr/bin/env node
/**
 * Datei: docs/design/vorlage-v10/erzeuge-screens.mjs
 *
 * Zweck: Erzeugt die Referenz-Screenshots der Designvorlage V10 (F-725,
 * WS-0) unter screens/. Liefert diesen Ordner über einen kleinen
 * node:http-Server auf 127.0.0.1 aus (keine neue Abhängigkeit) und
 * fotografiert ihn mit Playwright (Chromium, headless, wie
 * scripts/render-nachweis.mjs). Vier Serien:
 *   d_      Desktop 1440×1000, ganze Seite, dunkel
 *   m_      Mobil 390×844, ganze Seite, dunkel
 *   l_      Hell (localStorage jarvis-theme = "light"), 1440×1000, ganze Seite
 *   motion_ #/start bei 0/800/1600/2400 ms und die Kopf-Persona auf
 *           #/uebersicht bei 0/350/700 ms, dazu je ein Bild mit
 *           reducedMotion 'reduce'
 * Dateiname = Route mit „_“ statt „/“.
 *
 * Wird aufgerufen von:
 * - Hand: node docs/design/vorlage-v10/erzeuge-screens.mjs
 *   (nicht Teil von npm run check — braucht einen echten Browser)
 *
 * Wichtig:
 * - Die Vorlage bleibt unverändert; das Skript liest nur. Anfragen an fremde
 *   Hosts werden abgebrochen, damit die Bilder nicht vom Netz abhängen, und
 *   zählen als Fehler (V10 stellt keine).
 * - Motion-Bilder sind deterministisch: Alle Web-Animationen der Seite werden
 *   angehalten und auf den Zeitpunkt t gesetzt (document.getAnimations()),
 *   statt real zu warten. Nur „d_start“ wartet wie verlangt real 2,6 s.
 * - Die übrigen Seiten warten 800 ms und setzen danach alle endlichen
 *   Animationen auf ihr Ende. Gleich bleiben die Bilder, solange die Vorlage
 *   keine Endlos-Animation, kein Math.random und kein setInterval nutzt (V10:
 *   keines davon). Schriften (Georgia, Arial) kommen vom System; zwischen
 *   Rechnern können die Bilder daher abweichen.
 * - Seitenfehler, fehlgeschlagene Anfragen und HTTP-Status >= 400 zählen als
 *   Fehler (Exit 1). Vor dem Lauf werden alte *.png in screens/ gelöscht.
 * - Die Vorlage liest den Theme-Wert per JSON.parse; „light“ steht deshalb
 *   JSON-kodiert im localStorage.
 */

import { createServer } from 'node:http'
import { mkdir, readdir, readFile, stat, unlink } from 'node:fs/promises'
import { dirname, extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const WURZEL = dirname(fileURLToPath(import.meta.url))
const AUSGABE = join(WURZEL, 'screens')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
}

const DESKTOP_ROUTEN = [
  'start',
  'uebersicht',
  'projekt/ai-workforce/roadmap',
  'arbeit/board',
  'arbeit/prioritaeten',
  'arbeit/features',
  'arbeit/f35',
  'entscheidungen',
  'produktzyklus/ideate/strategy',
  'brain',
  'projekte',
  'projekt/neu',
  'harness/skelett',
  'harness/phasen',
  'harness/datei/architecture',
  'faehigkeiten',
  'faehigkeiten/rollen',
  'faehigkeiten/scout',
  'faehigkeiten/empfehlungen',
  'auftrag/neu',
  'workflow/neu',
  'workflow/klaerung',
  'abnahme/f35',
  'arbeit/verlauf',
  'ausfuehrung/failed',
  'nutzung',
  'einstellungen',
  'produkt',
  'jarvis',
  'jarvis/coach',
  'projekt/ai-workforce/technik/architecture',
  'projekt/ai-workforce/technik/health',
]
const MOBIL_ROUTEN = ['uebersicht', 'projekt/ai-workforce/roadmap', 'arbeit/board', 'projekte', 'workflow/neu', 'abnahme/f35']
const HELL_ROUTEN = ['uebersicht', 'arbeit/board', 'abnahme/f35']
const START_ZEITPUNKTE_MS = [0, 800, 1600, 2400]
const PERSONA_ZEITPUNKTE_MS = [0, 350, 700]

const DESKTOP = { width: 1440, height: 1000 }
const MOBIL = { width: 390, height: 844 }

/**
 * Startet einen statischen Server für WURZEL auf 127.0.0.1 mit freiem Port.
 * @returns {Promise<{ server: import('node:http').Server, basis: string }>} Server und Basis-URL
 */
async function starteServer() {
  const server = createServer(async (req, res) => {
    try {
      const pfadname = decodeURIComponent(new URL(req.url ?? '/', 'http://127.0.0.1').pathname)
      const relativ = pfadname === '/' ? 'index.html' : pfadname.slice(1)
      const datei = normalize(join(WURZEL, relativ))
      // Kein Weg aus dem Vorlage-Ordner hinaus (z. B. /../../package.json).
      if (datei !== WURZEL && !datei.startsWith(WURZEL + sep)) {
        res.writeHead(403).end()
        return
      }
      if (!(await stat(datei)).isFile()) throw new Error('keine Datei')
      res.writeHead(200, { 'content-type': MIME[extname(datei)] ?? 'application/octet-stream' })
      res.end(await readFile(datei))
    } catch {
      res.writeHead(404).end()
    }
  })
  await new Promise((fertig) => server.listen(0, '127.0.0.1', fertig))
  const adresse = server.address()
  if (adresse === null || typeof adresse === 'string') throw new Error('Server ohne Port')
  return { server, basis: `http://127.0.0.1:${adresse.port}/` }
}

/**
 * Macht aus einer Route den Dateinamen-Teil („projekt/neu“ → „projekt_neu“).
 * @param {string} route - Hash-Route ohne „#/“
 * @returns {string} Dateinamen-Teil
 */
function dateiteil(route) {
  return route.replaceAll('/', '_')
}

/**
 * Legt einen Browser-Kontext an, der nur 127.0.0.1 erreicht und optional ein Theme vorbelegt.
 * @param {import('playwright').Browser} browser - laufender Browser
 * @param {{ viewport: { width: number, height: number }, theme?: string, reducedMotion?: 'reduce' | 'no-preference', mobil?: boolean }} optionen - Kontextoptionen
 * @returns {Promise<import('playwright').BrowserContext>} vorbereiteter Kontext
 */
async function neuerKontext(browser, optionen) {
  const kontext = await browser.newContext({
    viewport: optionen.viewport,
    deviceScaleFactor: 1,
    isMobile: optionen.mobil === true,
    hasTouch: optionen.mobil === true,
    reducedMotion: optionen.reducedMotion ?? 'no-preference',
    colorScheme: 'dark',
  })
  await kontext.route('**/*', (route) => {
    const host = new URL(route.request().url()).hostname
    return host === '127.0.0.1' ? route.continue() : route.abort()
  })
  if (optionen.theme !== undefined) {
    await kontext.addInitScript((wert) => {
      localStorage.setItem('jarvis-theme', JSON.stringify(wert))
    }, optionen.theme)
  }
  return kontext
}

/**
 * Öffnet eine Route in einer neuen Seite und wartet, bis #main Inhalt hat.
 * @param {import('playwright').BrowserContext} kontext - Browser-Kontext
 * @param {string} basis - Basis-URL des Servers
 * @param {string} route - Hash-Route ohne „#/“
 * @param {string[]} fehler - Sammlung für Seitenfehler (wird ergänzt)
 * @returns {Promise<import('playwright').Page>} geladene Seite
 */
async function oeffne(kontext, basis, route, fehler) {
  const seite = await kontext.newPage()
  seite.on('pageerror', (e) => fehler.push(`#/${route}: ${e.message}`))
  // Ein fehlendes Asset erzeugt sonst stillschweigend ein kaputtes Referenzbild.
  seite.on('requestfailed', (anfrage) => fehler.push(`#/${route}: Anfrage fehlgeschlagen ${anfrage.url()}`))
  seite.on('response', (antwort) => {
    if (antwort.status() >= 400) fehler.push(`#/${route}: HTTP ${antwort.status()} ${antwort.url()}`)
  })
  await seite.goto(`${basis}#/${route}`, { waitUntil: 'load' })
  await seite.waitForFunction(() => (document.querySelector('#main')?.children.length ?? 0) > 0)
  return seite
}

/**
 * Hält alle Web-Animationen der Seite an und setzt sie auf den Zeitpunkt t.
 * @param {import('playwright').Page} seite - geladene Seite
 * @param {number} t - Zeitpunkt in Millisekunden seit Animationsbeginn
 * @returns {Promise<number>} Anzahl der gesetzten Animationen
 */
async function setzeAnimationen(seite, t) {
  return seite.evaluate((zeit) => {
    const animationen = document.getAnimations()
    for (const a of animationen) {
      a.pause()
      a.currentTime = zeit
    }
    return animationen.length
  }, t)
}

/**
 * Setzt alle endlichen Animationen auf ihr Ende (unendliche bleiben, wie sie sind).
 * @param {import('playwright').Page} seite - geladene Seite
 * @returns {Promise<void>}
 */
async function beendeAnimationen(seite) {
  await seite.evaluate(() => {
    for (const a of document.getAnimations()) {
      try {
        a.finish()
      } catch {
        // Unendliche Animation — finish() wirft; unverändert lassen.
      }
    }
  })
}

/**
 * Fotografiert eine Liste von Routen als ganze Seite.
 * @param {import('playwright').BrowserContext} kontext - Browser-Kontext
 * @param {string} basis - Basis-URL
 * @param {string[]} routen - Hash-Routen ohne „#/“
 * @param {string} praefix - Dateipräfix (d_, m_, l_)
 * @param {string[]} fehler - Sammlung für Seitenfehler
 * @returns {Promise<string[]>} geschriebene Dateinamen
 */
async function fotografiereRouten(kontext, basis, routen, praefix, fehler) {
  const dateien = []
  for (const route of routen) {
    const seite = await oeffne(kontext, basis, route, fehler)
    if (route === 'start') {
      await seite.waitForTimeout(2600)
    } else {
      await seite.waitForTimeout(800)
      await beendeAnimationen(seite)
    }
    const datei = `${praefix}${dateiteil(route)}.png`
    await seite.screenshot({ path: join(AUSGABE, datei), fullPage: true })
    dateien.push(datei)
    await seite.close()
  }
  return dateien
}

/**
 * Fotografiert die Motion-Serien (Startfläche im Viewport, Kopf-Persona als #topbar-Ausschnitt).
 * @param {import('playwright').Browser} browser - laufender Browser
 * @param {string} basis - Basis-URL
 * @param {string[]} fehler - Sammlung für Seitenfehler
 * @returns {Promise<string[]>} geschriebene Dateinamen
 */
async function fotografiereMotion(browser, basis, fehler) {
  const dateien = []
  const kontext = await neuerKontext(browser, { viewport: DESKTOP })
  for (const t of START_ZEITPUNKTE_MS) {
    const seite = await oeffne(kontext, basis, 'start', fehler)
    const anzahl = await setzeAnimationen(seite, t)
    if (anzahl === 0) fehler.push(`#/start: keine Animation gefunden (t=${t} ms)`)
    const datei = `motion_start_${String(t).padStart(4, '0')}ms.png`
    await seite.screenshot({ path: join(AUSGABE, datei) })
    dateien.push(datei)
    await seite.close()
  }
  for (const t of PERSONA_ZEITPUNKTE_MS) {
    const seite = await oeffne(kontext, basis, 'uebersicht', fehler)
    const anzahl = await setzeAnimationen(seite, t)
    if (anzahl === 0) fehler.push(`#/uebersicht: keine Animation gefunden (t=${t} ms)`)
    const datei = `motion_persona_${String(t).padStart(4, '0')}ms.png`
    await seite.locator('#topbar').screenshot({ path: join(AUSGABE, datei) })
    dateien.push(datei)
    await seite.close()
  }
  await kontext.close()

  const ruhig = await neuerKontext(browser, { viewport: DESKTOP, reducedMotion: 'reduce' })
  const start = await oeffne(ruhig, basis, 'start', fehler)
  await beendeAnimationen(start)
  await start.screenshot({ path: join(AUSGABE, 'motion_start_reduce.png') })
  dateien.push('motion_start_reduce.png')
  const persona = await oeffne(ruhig, basis, 'uebersicht', fehler)
  await beendeAnimationen(persona)
  await persona.locator('#topbar').screenshot({ path: join(AUSGABE, 'motion_persona_reduce.png') })
  dateien.push('motion_persona_reduce.png')
  await ruhig.close()
  return dateien
}

/**
 * Ablauf: Server starten, vier Serien fotografieren, Server und Browser schließen.
 * @returns {Promise<void>}
 */
async function main() {
  await mkdir(AUSGABE, { recursive: true })
  const { server, basis } = await starteServer()
  const fehler = []
  const dateien = []
  let browser = null
  try {
    // Erst der Browser, dann das Löschen: fehlt Chromium, bleiben die alten Bilder stehen.
    browser = await chromium.launch()
    // Alte Bilder weg, damit ein abgebrochener Lauf keine Mischung aus alten und neuen hinterlässt.
    for (const datei of await readdir(AUSGABE)) {
      if (datei.endsWith('.png')) await unlink(join(AUSGABE, datei))
    }
    const dunkel = await neuerKontext(browser, { viewport: DESKTOP })
    dateien.push(...(await fotografiereRouten(dunkel, basis, DESKTOP_ROUTEN, 'd_', fehler)))
    await dunkel.close()

    const mobil = await neuerKontext(browser, { viewport: MOBIL, mobil: true })
    dateien.push(...(await fotografiereRouten(mobil, basis, MOBIL_ROUTEN, 'm_', fehler)))
    await mobil.close()

    const hell = await neuerKontext(browser, { viewport: DESKTOP, theme: 'light' })
    dateien.push(...(await fotografiereRouten(hell, basis, HELL_ROUTEN, 'l_', fehler)))
    await hell.close()

    dateien.push(...(await fotografiereMotion(browser, basis, fehler)))
  } finally {
    await browser?.close()
    server.close()
  }
  console.log(`${dateien.length} Screenshots nach ${AUSGABE}`)
  if (fehler.length > 0) {
    console.log(`${fehler.length} Fehler:`)
    for (const f of fehler) console.log(`  - ${f}`)
    process.exitCode = 1
  }
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
