/**
 * Datei: features/F36/nachweis-ws1-ui/messung.mjs
 *
 * Zweck: Render-Nachweis F36 WS-1 (Spalte „Fehlt für Einsatz“, F-622) — misst
 * gegen einen laufenden Leitstand (Port als Argument) Breite und Überlauf der
 * Library-Tabelle mit und ohne die neue Spalte (achte Spalte per CSS
 * ausgeblendet = Stand vor WS-1) und schreibt Element-Screenshots der ganzen
 * Tabelle (Desktop 1400 px, mobil 400 px). Wegwerf-Nachweis, nicht Teil von
 * npm run check.
 *
 * Aufruf: node features/F36/nachweis-ws1-ui/messung.mjs <port>
 */

import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'

const port = process.argv[2] ?? '4391'
const ziel = 'features/F36/nachweis-ws1-ui'
const browser = await chromium.launch()
const zeilen = ['| Viewport | Variante | Tabelle scrollWidth | Container clientWidth | Tabelle breiter als Karte | Container overflow-x | Seite scrollt horizontal |', '| --- | --- | --- | --- | --- | --- | --- |']
try {
  for (const breite of [1400, 400]) {
    const page = await browser.newPage({ viewport: { width: breite, height: 900 } })
    await page.goto('about:blank') // wie render-nachweis.mjs (F-628): echte Navigation erzwingen
    await page.goto(`http://127.0.0.1:${port}/#/capabilities`)
    await page.waitForSelector('#capabilities-library table', { timeout: 15000 })
    // Varianten: Stand vor WS-1 (Spalte 8 aus, Fix per CSS aufgehoben), WS-1 ohne Fix, WS-1 mit Fix.
    for (const variante of [
      { name: 'vor WS-1 (Spalte 8 aus, overflow-x aufgehoben)', ohne: true, ohneFix: true },
      { name: 'WS-1 ohne Fix (overflow-x aufgehoben)', ohne: false, ohneFix: true },
      { name: 'WS-1 mit Fix', ohne: false, ohneFix: false },
    ]) {
      const { ohne, ohneFix } = variante
      await page.evaluate(({ ohne, ohneFix }) => {
        let stil = document.getElementById('messung-stil')
        if (!stil) {
          stil = document.createElement('style')
          stil.id = 'messung-stil'
          document.head.append(stil)
        }
        stil.textContent =
          (ohne ? '#capabilities-library th:nth-child(8), #capabilities-library td:nth-child(8) { display: none; }' : '') +
          (ohneFix ? '#capabilities-library { overflow-x: visible !important; }' : '')
      }, { ohne, ohneFix })
      const m = await page.evaluate(() => {
        const tabelle = document.querySelector('#capabilities-library table')
        const container = document.getElementById('capabilities-library')
        return { tabelle: tabelle.scrollWidth, container: container.clientWidth, overflowX: getComputedStyle(container).overflowX, seite: document.documentElement.scrollWidth > document.documentElement.clientWidth }
      })
      zeilen.push(`| ${breite} px | ${variante.name} | ${m.tabelle} | ${m.container} | ${m.tabelle > m.container ? 'ja' : 'nein'} | ${m.overflowX} | ${m.seite ? 'ja' : 'nein'} |`)
    }
    const zeile = page.locator('#capabilities-library tr', { hasText: 'context7-mcp' }).first()
    await zeile.scrollIntoViewIfNeeded()
    await page.evaluate(() => {
      document.getElementById('messung-stil').textContent = ''
      const c = document.getElementById('capabilities-library')
      c.scrollLeft = c.scrollWidth
    })
    const kasten = await page.locator('#capabilities-library').boundingBox()
    const zeileKasten = await zeile.boundingBox()
    if (kasten && zeileKasten) {
      // Sichtbarer Ausschnitt der Zeile innerhalb der gescrollten Karte — belegt, dass Spalte 8 lesbar erreichbar ist.
      await page.screenshot({ path: `${ziel}/03-zeile-context7-${breite}.png`, clip: { x: kasten.x, y: zeileKasten.y, width: kasten.width, height: zeileKasten.height } })
    }
    await page.evaluate(() => {
      document.getElementById('messung-stil').textContent = ''
      document.getElementById('capabilities-library').scrollLeft = 0
    })
    await page.close()
  }
} finally {
  await browser.close()
}
writeFileSync(`${ziel}/messung.md`, `${zeilen.join('\n')}\n`)
console.log(zeilen.join('\n'))
