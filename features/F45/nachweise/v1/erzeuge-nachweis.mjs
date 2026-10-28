#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/v1/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 V1 „Live-Vorschau des Projekts im Leitstand“ (features/F45/plan-v1.md, plan-v1-v2.md) in
 * neutraler Umgebung: eine kleine Test-App (node:http, freier Port) als vorschau_url des Projekts „Haushaltsbuch“
 * (id mit-app), ein zweites Projekt „Opportunity Scanner“ (id ohne-app) ohne vorschau_url. Beide sind Wegwerf-Projekte unter
 * os.tmpdir() der neutralen Umgebung mit je einem offenen Finding (sonst stünde die Übersicht im Leerzustand). Der Leitstand
 * läuft in diesem Prozess (erzeugeRequestHandler + erzeugeMultiProjektDispatcher, freier Port, eigener Kontrollzustand).
 *
 * Bilder (WebP): Vorschau 1440 dunkel/hell und 390 dunkel, Ausklapper „Rolle im Detail“ offen, „Start Building“ 1440
 * dunkel/hell, Test-App gestoppt ⇒ „Neu laden“ ⇒ Start Building. Echter DOM-Beleg in protokoll.json: dasselbe iframe-Element
 * vor und nach mehreren Poll-Ticks, Browser-Anfragen an die Test-App unverändert; „Neu laden“ ⇒ gleiches Element, eine
 * Browser-Anfrage mehr; Abrufe von …/projekt-aufruf nur bei Betreten und „Neu laden“; Rahmen-Schutz: der Leitstand in einem
 * iframe startet nicht.
 *
 * Wird aufgerufen von: Hand — `node features/F45/nachweise/v1/erzeuge-nachweis.mjs` (aus dem Repo). Nicht Teil von
 * `npm run check`.
 */

import '../../../../scripts/neutrale-umgebung-starten.mjs'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright'
import { WOERTERBUECHER } from '../../../../public/leitstand/i18n.js'
import { ladePlatzhalter, warteBisGeladen } from '../../../../scripts/nachweis-laden.mjs'
import { erzeugeMultiProjektDispatcher, erzeugeRequestHandler } from '../../../../scripts/leitstand-server.mjs'

const REPO = resolve(import.meta.dirname, '..', '..', '..', '..')
const ZIEL = import.meta.dirname
const WEBP_GUETE = 0.8
const POLL_WARTEN_MS = 7000

const FINDING = `# Findings-Register

**F-001** · \`BUG\` · P2 · offen
Titel: Beispielbefund für den Render-Nachweis.
Beschreibung: Damit die Übersicht nicht im Leerzustand steht.
Fundstelle: nirgends.
Auswirkung: keine.
Maßnahme: keine.
Feature/Run: F45 V1, 28.10.2026.
`

const APP_HTML = `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Haushaltsbuch</title>
<style>body{font-family:system-ui,sans-serif;margin:0;padding:24px;background:#f6f4ef;color:#1d2a2f}h1{margin:0 0 4px;font-size:22px}
p{margin:0 0 16px;color:#5b6b70}table{border-collapse:collapse;width:100%;background:#fff}td,th{padding:8px 12px;border-bottom:1px solid #e2ddd2;text-align:left}
td.b{text-align:right}</style></head><body><h1>Haushaltsbuch</h1><p>Oktober 2026 · Test-App des Render-Nachweises F45 V1</p>
<table><tr><th>Datum</th><th>Posten</th><th>Betrag</th></tr><tr><td>01.10.</td><td>Miete</td><td class="b">−850,00 €</td></tr>
<tr><td>03.10.</td><td>Lebensmittel</td><td class="b">−64,20 €</td></tr><tr><td>15.10.</td><td>Gehalt</td><td class="b">+2 400,00 €</td></tr></table></body></html>`

const protokoll = { erzeugt: new Date().toISOString(), schritte: [], belege: {} }
const wurzel = mkdtempSync(join(tmpdir(), 'v1-nachweis-'))

// ─── Test-App: zählt Browser-Anfragen (Chrome) getrennt von der Serverprüfung (Node-fetch) ──────────────────────────
const zaehler = { browser: 0, server: 0 }
const app = createServer((req, res) => {
  if (/Chrome/.test(req.headers['user-agent'] ?? '')) zaehler.browser++
  else zaehler.server++
  res.setHeader('content-type', 'text/html; charset=utf-8')
  res.end(APP_HTML)
})
await new Promise((r) => app.listen(0, '127.0.0.1', r))
const APP_URL = `http://127.0.0.1:${app.address().port}`

// ─── Wegwerf-Projekte und Leitstand ───────────────────────────────────────────────────────────────────────────────────
const startvorlagePfad = join(REPO, 'startvorlagen', 'beispielprojekt.json')
const globalerLaufZustand = { aktiv: false, laufId: null, abortController: null }
/** @param id - Projekt-id @returns Projektordner mit git, Findings und Kontrollzustand */
function legeProjektAn(id) {
  const ordner = join(wurzel, id)
  mkdirSync(join(ordner, 'state'), { recursive: true })
  mkdirSync(join(ordner, 'kontrollzustand'))
  writeFileSync(join(ordner, 'state', 'findings.md'), FINDING)
  execFileSync('git', ['init', '-q'], { cwd: ordner })
  return ordner
}
const projekte = [
  { id: 'mit-app', name: 'Haushaltsbuch', vorschau_url: APP_URL },
  { id: 'ohne-app', name: 'Opportunity Scanner' },
].map((p) => ({ ...p, ordner: legeProjektAn(p.id) }))
const map = new Map()
for (const p of projekte) {
  map.set(
    p.id,
    erzeugeRequestHandler({ basisVerzeichnis: join(p.ordner, 'kontrollzustand'), startvorlagePfad, repoWurzel: p.ordner, cwd: p.ordner, installWurzel: REPO, projektId: p.id, vorschauUrl: p.vorschau_url ?? null, globalerLaufZustand })
  )
}
const workforce = legeProjektAn('workforce')
const registerEintraege = projekte.map((p) => ({ id: p.id, name: p.name, repo_pfad: p.ordner, basisverzeichnis: 'kontrollzustand', startvorlage_pfad: startvorlagePfad, ...(p.vorschau_url ? { vorschau_url: p.vorschau_url } : {}) }))
const standard = erzeugeRequestHandler({ basisVerzeichnis: join(workforce, 'kontrollzustand'), startvorlagePfad, repoWurzel: workforce, cwd: workforce, installWurzel: REPO, projekte: registerEintraege, projektHandlerMap: map, globalerLaufZustand })
const dispatcher = erzeugeMultiProjektDispatcher(map, standard)
/** Abrufe von …/projekt-aufruf je Projekt (Beleg: nie aus dem Poll). */
const aufrufAbrufe = []
const leitstand = createServer((req, res) => {
  if ((req.url ?? '').includes('/projekt-aufruf')) aufrufAbrufe.push(req.url)
  return dispatcher(req, res)
})
await new Promise((r) => leitstand.listen(0, '127.0.0.1', r))
const BASIS = `http://127.0.0.1:${leitstand.address().port}`
console.log(`Test-App ${APP_URL}, Leitstand ${BASIS}`)

// ─── Browser ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const browser = await chromium.launch()
const wandler = await browser.newPage()
/** @param png - Bildpuffer @param datei - Name ohne Endung */
async function alsWebp(png, datei) {
  const daten = await wandler.evaluate(
    async ([quelle, guete]) => {
      const bild = new Image()
      bild.src = quelle
      await bild.decode()
      const leinwand = document.createElement('canvas')
      leinwand.width = bild.naturalWidth
      leinwand.height = bild.naturalHeight
      leinwand.getContext('2d').drawImage(bild, 0, 0)
      return leinwand.toDataURL('image/webp', guete).split(',')[1]
    },
    [`data:image/png;base64,${png.toString('base64')}`, WEBP_GUETE]
  )
  writeFileSync(join(ZIEL, `${datei}.webp`), Buffer.from(daten, 'base64'))
  protokoll.schritte.push({ bild: `${datei}.webp` })
}

const platzhalter = ladePlatzhalter(WOERTERBUECHER.de)
/**
 * Öffnet die Übersicht für ein Projekt.
 * @param projekt - { id, name } @param theme - 'dark' | 'light' @param breite - Viewport-Breite
 * @param optionen - { sprache (Standard de), zoom (Browser-Zoom: CSS-Viewport = breite / zoom) }
 * @returns { kontext, seite, fehler }
 */
async function oeffne(projekt, theme, breite, { sprache = 'de', zoom = 1 } = {}) {
  const kontext = await browser.newContext({ viewport: { width: Math.round(breite / zoom), height: Math.round(1000 / zoom) }, deviceScaleFactor: zoom })
  await kontext.addInitScript(
    ([t, p, s]) => {
      localStorage.setItem('leitstand-theme', t)
      localStorage.setItem('leitstand-sprache', s)
      localStorage.setItem('leitstand-chat-offen', 'false')
      sessionStorage.setItem('leitstand-aktives-projekt', JSON.stringify(p))
      sessionStorage.setItem('leitstand-start-gezeigt', 'true')
    },
    [theme, { id: projekt.id, name: projekt.name }, sprache]
  )
  const seite = await kontext.newPage()
  const fehler = []
  seite.on('pageerror', (f) => fehler.push(String(f)))
  await seite.goto(`${BASIS}/#/dashboard`)
  await warteBisGeladen(seite, sprache === 'de' ? platzhalter : ladePlatzhalter(WOERTERBUECHER[sprache]), '#uebersicht-cockpit')
  await seite.waitForTimeout(600)
  return { kontext, seite, fehler }
}

/** @param seite - Seite @param datei - Bildname @param selektor - Ausschnitt */
async function bild(seite, datei, selektor = '#uebersicht-cockpit') {
  await alsWebp(await seite.locator(selektor).screenshot(), datei)
}

try {
  const [mitApp, ohneApp] = projekte
  // 1. Vorschau, 1440 dunkel — mit DOM-Beleg
  {
    const { kontext, seite, fehler } = await oeffne(mitApp, 'dark', 1440)
    await seite.locator('#uebersicht-vorschau iframe').waitFor()
    await seite.waitForTimeout(800)
    const browserVorher = zaehler.browser
    const abrufeVorher = aufrufAbrufe.length
    await seite.evaluate(() => {
      window.__vorschauRahmen = document.querySelector('#uebersicht-vorschau iframe')
    })
    await bild(seite, 'de-1440-dunkel-01-vorschau')
    await seite.waitForTimeout(POLL_WARTEN_MS)
    const nachPoll = await seite.evaluate(() => ({
      gleich: document.querySelector('#uebersicht-vorschau iframe') === window.__vorschauRahmen,
      src: window.__vorschauRahmen?.getAttribute('src'),
      sandbox: window.__vorschauRahmen?.getAttribute('sandbox'),
    }))
    const zustandAbrufe = await seite.evaluate(() => performance.getEntriesByType('resource').filter((e) => e.name.includes('/zustand')).length)
    protokoll.belege.poll = { ...nachPoll, wartezeitMs: POLL_WARTEN_MS, zustandAbrufeSeitStart: zustandAbrufe, browserAnfragenAnApp: zaehler.browser - browserVorher, projektAufrufAbrufe: aufrufAbrufe.length - abrufeVorher }
    // Ausklapper „Rolle im Detail“: Klick auf eine Rolle öffnet ihn
    await seite.locator('[data-kreis-rolle="builder"]').click()
    await seite.waitForTimeout(300)
    protokoll.belege.ausklapper = await seite.evaluate(() => ({
      offen: document.getElementById('uebersicht-rolle-detail')?.hidden === false,
      ariaExpanded: document.querySelector('[data-rolle-umschalter]')?.getAttribute('aria-expanded'),
      iframeGleich: document.querySelector('#uebersicht-vorschau iframe') === window.__vorschauRahmen,
    }))
    await bild(seite, 'de-1440-dunkel-02-ausklapper-offen')
    // „Neu laden“: gleiches Element, eine Browser-Anfrage mehr
    const b = zaehler.browser
    const a = aufrufAbrufe.length
    await seite.locator('[data-vorschau-neu-laden]').click()
    await seite.waitForTimeout(2500)
    protokoll.belege.neuLaden = {
      gleich: await seite.evaluate(() => document.querySelector('#uebersicht-vorschau iframe') === window.__vorschauRahmen),
      browserAnfragenAnApp: zaehler.browser - b,
      projektAufrufAbrufe: aufrufAbrufe.length - a,
    }
    protokoll.belege.seitenfehler1440 = fehler
    await kontext.close()
  }
  // 2. Vorschau hell, 390 dunkel/hell, 200 % Zoom, ru mit offenem Ausklapper (Korrekturrunde, design-guardian A3)
  for (const [theme, breite, name, optionen] of [
    ['light', 1440, 'de-1440-hell-01-vorschau', {}],
    ['dark', 390, 'de-390-dunkel-01-vorschau', {}],
    ['light', 390, 'de-390-hell-01-vorschau', {}],
    ['dark', 1440, 'de-1440-200prozent-01-vorschau', { zoom: 2 }],
    ['light', 1440, 'ru-1440-hell-02-ausklapper-offen', { sprache: 'ru' }],
    ['light', 1440, 'de-1440-hell-02-ausklapper-offen', {}],
  ]) {
    const { kontext, seite } = await oeffne(mitApp, theme, breite, optionen)
    await seite.locator('#uebersicht-vorschau iframe').waitFor()
    await seite.waitForTimeout(800)
    if (name.includes('ausklapper')) {
      await seite.locator('[data-kreis-rolle="builder"]').click()
      await seite.waitForTimeout(300)
    }
    // Bei 200 % liegt Karte c unterhalb des Sichtfelds; Chromium zeichnet den fremden Rahmen erst im Sichtfeld.
    if (optionen.zoom === 2) {
      await seite.locator('#uebersicht-vorschau').scrollIntoViewIfNeeded()
      await seite.waitForTimeout(800)
    }
    await bild(seite, name, breite === 390 || optionen.zoom === 2 ? '#uebersicht-vorschau' : '#uebersicht-cockpit')
    if (breite === 390 || optionen.zoom === 2) protokoll.belege[`keinQuerscroll-${name}`] = await seite.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    await kontext.close()
  }
  // 2b. Projektwechsel im selben Tab über die Projektauswahl im Kopf: Haushaltsbuch → Opportunity Scanner → Haushaltsbuch
  {
    const { kontext, seite } = await oeffne(mitApp, 'dark', 1440)
    await seite.locator('#uebersicht-vorschau iframe').waitFor()
    await seite.evaluate(() => {
      window.__vorschauRahmen = document.querySelector('#uebersicht-vorschau iframe')
    })
    const a = aufrufAbrufe.length
    await seite.selectOption('#kopf-projekt-auswahl', ohneApp.id)
    await seite.locator('#uebersicht-vorschau .uebersicht-vorschau-start').waitFor()
    const nachWechsel = await seite.evaluate(() => ({ iframe: document.querySelector('#uebersicht-vorschau iframe') !== null, titel: document.querySelector('#uebersicht-vorschau h2')?.textContent }))
    const abrufeWechsel = aufrufAbrufe.slice(a)
    await seite.selectOption('#kopf-projekt-auswahl', mitApp.id)
    await seite.locator('#uebersicht-vorschau iframe').waitFor()
    const zurueck = await seite.evaluate(() => ({ neuesElement: document.querySelector('#uebersicht-vorschau iframe') !== window.__vorschauRahmen, src: document.querySelector('#uebersicht-vorschau iframe')?.getAttribute('src') }))
    protokoll.belege.projektwechsel = { nachWechsel, abrufeBeimWechsel: abrufeWechsel, zurueck, abrufeGesamt: aufrufAbrufe.slice(a) }
    await kontext.close()
  }
  // 3. Start Building (Projekt ohne vorschau_url, direkt geöffnet), dunkel und hell
  for (const theme of ['dark', 'light']) {
    const { kontext, seite } = await oeffne(ohneApp, theme, 1440)
    await seite.locator('#uebersicht-vorschau .uebersicht-vorschau-start').waitFor()
    await bild(seite, `de-1440-${theme === 'dark' ? 'dunkel' : 'hell'}-03-start-building`)
    if (theme === 'dark') {
      protokoll.belege.startBuilding = await seite.evaluate(() => ({
        iframe: document.querySelector('#uebersicht-vorschau iframe') !== null,
        text: document.querySelector('#uebersicht-vorschau h2')?.textContent,
        link: document.querySelector('#uebersicht-vorschau a[href="#/projekt"]') !== null,
      }))
    }
    await kontext.close()
  }
  // 4. Test-App gestoppt ⇒ „Neu laden“ ⇒ Start Building „antwortet nicht“
  {
    const { kontext, seite } = await oeffne(mitApp, 'dark', 1440)
    await seite.locator('#uebersicht-vorschau iframe').waitFor()
    app.closeAllConnections()
    await new Promise((r) => app.close(r))
    await seite.locator('[data-vorschau-neu-laden]').click()
    await seite.locator('#uebersicht-vorschau .uebersicht-vorschau-start').waitFor({ timeout: 8000 })
    await bild(seite, 'de-1440-dunkel-04-app-gestoppt')
    protokoll.belege.appGestoppt = await seite.evaluate(() => document.querySelector('#uebersicht-vorschau')?.innerText.slice(0, 300))
    await kontext.close()
  }
  // 5. Rahmen-Schutz: der Leitstand in einem iframe startet nicht
  {
    const kontext = await browser.newContext({ viewport: { width: 900, height: 500 } })
    const seite = await kontext.newPage()
    await seite.setContent(`<iframe id="r" src="${BASIS}/#/dashboard" style="width:880px;height:460px"></iframe>`)
    await seite.waitForTimeout(3000)
    const rahmen = seite.frames().find((f) => f.url().startsWith(BASIS))
    protokoll.belege.rahmenSchutz = rahmen === undefined ? { fehler: 'Rahmen nicht gefunden' } : await rahmen.evaluate(() => ({ text: document.body.innerText.slice(0, 200), shell: document.getElementById('shell') !== null }))
    await alsWebp(await seite.screenshot(), 'de-900-05-rahmen-schutz')
    await kontext.close()
  }
} finally {
  writeFileSync(join(ZIEL, 'protokoll.json'), `${JSON.stringify(protokoll, null, 2)}\n`)
  await browser.close()
  await new Promise((r) => leitstand.close(r))
  if (app.listening) await new Promise((r) => app.close(r))
  rmSync(wurzel, { recursive: true, force: true })
}
console.log(JSON.stringify(protokoll.belege, null, 2))
