#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/v1b/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 V1b „Live-Vorschau in voller Breite“ (features/F45/plan-v1b.md, E-VORSCHAU-2 = A) in neutraler
 * Umgebung, nach dem Muster von features/F45/nachweise/v1/erzeuge-nachweis.mjs: eine Test-App (node:http, freier Port, breite
 * Tabelle) als vorschau_url des Projekts „Haushaltsbuch“ (id mit-app), ein Projekt „Opportunity Scanner“ (id ohne-app) ohne
 * vorschau_url; beide Wegwerf-Projekte unter os.tmpdir() mit je einem offenen Finding (sonst Leerzustand). Der Leitstand läuft in
 * diesem Prozess (erzeugeRequestHandler + erzeugeMultiProjektDispatcher, freier Port, eigener Kontrollzustand).
 *
 * Bilder (WebP): Vorschau 1440 dunkel und hell, „Start Building“ 1440 dunkel, Vorschau 390 dunkel und hell, 1280 dunkel
 * (Container ≤ 1060 px: Produkt | Wer, darunter Fortschritt + Braucht dich, darunter die Vorschau). Der Chat ist ein
 * schwebendes Fenster und verengt den Hauptbereich nicht; er bleibt in allen Bildern zu. protokoll.json: Breiten der
 * Kopfkarten und der Vorschau, Höhe des iframes, Tabelle der App ungekürzt (scrollWidth ≤ clientWidth im Rahmen), dasselbe
 * iframe-Element vor und nach mehreren Poll-Ticks ohne Browser-Anfrage an die App, Höhe der „Start Building“-Zeile, kein
 * Querscroll bei 390 px.
 *
 * Wird aufgerufen von: Hand — `node features/F45/nachweise/v1b/erzeuge-nachweis.mjs` (aus dem Repo). Nicht Teil von
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
Feature/Run: F45 V1b, 29.10.2026.
`

/** Desktop-App mit fünf Spalten — bei ≈ 280 px (V1) war schon die dritte abgeschnitten. */
const APP_HTML = `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Haushaltsbuch</title>
<style>body{font-family:system-ui,sans-serif;margin:0;padding:24px;background:#f6f4ef;color:#1d2a2f}h1{margin:0 0 4px;font-size:22px}
p{margin:0 0 16px;color:#5b6b70}table{border-collapse:collapse;width:100%;min-width:640px;background:#fff}td,th{padding:8px 12px;border-bottom:1px solid #e2ddd2;text-align:left;white-space:nowrap}
td.b{text-align:right}</style></head><body><h1>Haushaltsbuch</h1><p>Oktober 2026 · Test-App des Render-Nachweises F45 V1b</p>
<table><tr><th>Datum</th><th>Posten</th><th>Kategorie</th><th>Konto</th><th>Betrag</th></tr>
<tr><td>01.10.</td><td>Miete</td><td>Wohnen</td><td>Giro</td><td class="b">−850,00 €</td></tr>
<tr><td>03.10.</td><td>Lebensmittel</td><td>Haushalt</td><td>Giro</td><td class="b">−64,20 €</td></tr>
<tr><td>15.10.</td><td>Gehalt</td><td>Einnahmen</td><td>Giro</td><td class="b">+2 400,00 €</td></tr></table></body></html>`

const protokoll = { erzeugt: new Date().toISOString(), schritte: [], belege: {} }
const wurzel = mkdtempSync(join(tmpdir(), 'v1b-nachweis-'))

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
/** Abrufe von …/projekt-aufruf (Beleg: nie aus dem Poll). */
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
 * @param projekt - { id, name } @param theme - 'dark' | 'light' @param breite - Viewport-Breite @param hoehe - Viewport-Höhe
 * @returns { kontext, seite, fehler }
 */
async function oeffne(projekt, theme, breite, hoehe = 1000) {
  const kontext = await browser.newContext({ viewport: { width: breite, height: hoehe } })
  await kontext.addInitScript(
    ([t, p]) => {
      localStorage.setItem('leitstand-theme', t)
      localStorage.setItem('leitstand-sprache', 'de')
      localStorage.setItem('leitstand-chat-offen', 'false')
      sessionStorage.setItem('leitstand-aktives-projekt', JSON.stringify(p))
      sessionStorage.setItem('leitstand-start-gezeigt', 'true')
    },
    [theme, { id: projekt.id, name: projekt.name }]
  )
  const seite = await kontext.newPage()
  const fehler = []
  seite.on('pageerror', (f) => fehler.push(String(f)))
  await seite.goto(`${BASIS}/#/dashboard`)
  await warteBisGeladen(seite, platzhalter, '#uebersicht-cockpit')
  await seite.waitForTimeout(600)
  return { kontext, seite, fehler }
}

/**
 * Maße des Cockpits: Breite je Kopfkarte (a, b, d) und der Vorschau, Höhe von Vorschau und iframe, Reihenfolge im DOM.
 * @param seite - Seite @returns Maße in px (gerundet)
 */
async function masse(seite) {
  return seite.evaluate(() => {
    const breite = (sel) => Math.round(document.querySelector(sel)?.getBoundingClientRect().width ?? -1)
    const hoehe = (sel) => Math.round(document.querySelector(sel)?.getBoundingClientRect().height ?? -1)
    const cockpit = document.getElementById('uebersicht-cockpit')
    const reihenfolge = [...(cockpit?.querySelectorAll('.uebersicht-karte') ?? [])].map((k) => [...k.classList].find((c) => c !== 'uebersicht-karte'))
    const oben = (sel) => Math.round(document.querySelector(sel)?.getBoundingClientRect().top ?? -1)
    const links = (sel) => Math.round(document.querySelector(sel)?.getBoundingClientRect().left ?? -1)
    return {
      fortschrittNebenBraucht: oben('.uebersicht-fortschritt') === oben('.uebersicht-braucht') && links('.uebersicht-fortschritt') < links('.uebersicht-braucht'),
      cockpit: breite('#uebersicht-cockpit'),
      produkt: breite('.uebersicht-produkt'),
      wer: breite('.uebersicht-wer'),
      spalte: breite('.uebersicht-spalte'),
      vorschau: breite('#uebersicht-vorschau'),
      vorschauHoehe: hoehe('#uebersicht-vorschau'),
      iframeBreite: breite('#uebersicht-vorschau iframe'),
      iframeHoehe: hoehe('#uebersicht-vorschau iframe'),
      vorschauUnterKarten: oben('#uebersicht-vorschau') >= Math.max(oben('.uebersicht-produkt') + hoehe('.uebersicht-produkt'), oben('.uebersicht-spalte') + hoehe('.uebersicht-spalte')),
      reihenfolgeDom: reihenfolge,
      keinQuerscroll: document.documentElement.scrollWidth <= window.innerWidth,
    }
  })
}

/** @param seite - Seite @returns { tabelleUngekuerzt, scrollWidth, clientWidth } aus dem Rahmen der Test-App */
async function appImRahmen(seite) {
  const rahmen = seite.frames().find((f) => f.url().startsWith(APP_URL))
  if (rahmen === undefined) return { fehler: 'Rahmen der Test-App nicht gefunden' }
  return rahmen.evaluate(() => ({
    tabelleUngekuerzt: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
}

/** @param seite - Seite @param datei - Bildname @param selektor - Ausschnitt */
async function bild(seite, datei, selektor = '#uebersicht-cockpit') {
  await alsWebp(await seite.locator(selektor).screenshot(), datei)
}

try {
  const [mitApp, ohneApp] = projekte
  // 1. Vorschau 1440 dunkel — Maße, App ungekürzt, iframe über Poll-Ticks dasselbe Element
  {
    const { kontext, seite, fehler } = await oeffne(mitApp, 'dark', 1440, 1300)
    await seite.locator('#uebersicht-vorschau iframe').waitFor()
    await seite.waitForTimeout(800)
    protokoll.belege.masse1440 = await masse(seite)
    protokoll.belege.app1440 = await appImRahmen(seite)
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
    protokoll.belege.seitenfehler1440 = fehler
    await kontext.close()
  }
  // 1b. Laptop-Höhe 1440 × 900: das iframe bleibt kleiner als das Fenster (70vh)
  {
    const { kontext, seite } = await oeffne(mitApp, 'dark', 1440, 900)
    await seite.locator('#uebersicht-vorschau iframe').waitFor()
    protokoll.belege.masse1440x900 = await masse(seite)
    await kontext.close()
  }
  // 2. Vorschau 1440 hell
  {
    const { kontext, seite } = await oeffne(mitApp, 'light', 1440, 1300)
    await seite.locator('#uebersicht-vorschau iframe').waitFor()
    await seite.waitForTimeout(800)
    await bild(seite, 'de-1440-hell-01-vorschau')
    await kontext.close()
  }
  // 3. „Start Building“ 1440 dunkel (Projekt ohne vorschau_url) — kompakte Zeile
  {
    const { kontext, seite } = await oeffne(ohneApp, 'dark', 1440)
    await seite.locator('#uebersicht-vorschau .uebersicht-vorschau-start').waitFor()
    await bild(seite, 'de-1440-dunkel-02-start-building')
    protokoll.belege.startBuilding = {
      ...(await masse(seite)),
      iframe: await seite.evaluate(() => document.querySelector('#uebersicht-vorschau iframe') !== null),
      link: await seite.evaluate(() => document.querySelector('#uebersicht-vorschau a[href="#/projekt"]') !== null),
    }
    await kontext.close()
  }
  // 4. 390 dunkel und hell (mobil): eine Spalte, Vorschau zuletzt, kein Querscroll
  for (const [theme, name] of [['dark', 'dunkel'], ['light', 'hell']]) {
    const { kontext, seite } = await oeffne(mitApp, theme, 390, 844)
    await seite.locator('#uebersicht-vorschau iframe').waitFor()
    await seite.locator('#uebersicht-vorschau').scrollIntoViewIfNeeded()
    await seite.waitForTimeout(800)
    await bild(seite, `de-390-${name}-01-vorschau`, '#uebersicht-vorschau')
    protokoll.belege[`masse390${name}`] = await masse(seite)
    await kontext.close()
  }
  // 5. 1280 dunkel: Container ≤ 1060 px — zwei Spalten, d als Zeile nebeneinander, Vorschau darunter
  {
    const { kontext, seite } = await oeffne(mitApp, 'dark', 1280, 1300)
    await seite.locator('#uebersicht-vorschau iframe').waitFor()
    await seite.waitForTimeout(800)
    await bild(seite, 'de-1280-dunkel-03-vorschau')
    protokoll.belege.masse1280 = await masse(seite)
    protokoll.belege.app1280 = await appImRahmen(seite)
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
