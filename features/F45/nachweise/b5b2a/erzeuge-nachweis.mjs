#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/b5b2a/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 B5b-2a „Roadmap: Gantt lesend“ — Screenshots von #/roadmap gegen einen laufenden Leitstand
 * auf diesem Repo (echte Projektion GET /api/roadmap): de dunkel/hell bei 1440 px und 390 px, tr dunkel 1440/hell 390, de bei 200 %
 * (720 CSS-px, Faktor 2), je Ausgangslage, Zoom Wochen, Alles aufklappen, Abgeschlossene eingeblendet, Wahl einer
 * Workstream-Zeile, Querscrollen und danach Wahl eines Features; dazu je Lage die
 * Klicktabelle (aria-pressed, aria-expanded, Überlauf der Seite, Breite des Gantt-Rollbereichs, linke Spalte nach Querscrollen,
 * Querscroll nach einem Klick — Prüfpass cr 1/qa 1).
 * Bilder nur für die Schritte mit eigener Aussage (01 ganze Seite; 02, 03, 06 nur „Gesamte Roadmap“ mit Detailpanel), als WebP
 * über die Canvas des Playwright-Chromium; die übrigen Schritte belegt allein protokoll.json. Zuletzt ein Seite-an-Seite-Bild mit
 * docs/design/neu/03-roadmap--Main.webp.
 *
 * Wird aufgerufen von: Hand — `node features/F45/nachweise/b5b2a/erzeuge-nachweis.mjs [basisUrl]` (Standard
 * http://127.0.0.1:4431). Nicht Teil von `npm run check`. Liest nur (kein PUT/POST).
 *
 * F-1201 (F45 B5b-2b-1): die erste Aufnahme wartet, bis „Entwicklungsstand“ und „Noch nicht eingeplant“ geladen sind (kein
 * „Lädt…“ der Lagensprache mehr auf der Seite) — vorher fest 600 ms.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { WOERTERBUECHER } from '../../../../public/leitstand/i18n.js'

const BASIS = process.argv[2] ?? 'http://127.0.0.1:4431'
const ZIEL = import.meta.dirname
const LAGEN = [
  { name: 'de-1440-dunkel', breite: 1440, hoehe: 1800, theme: 'dark' },
  { name: 'de-1440-hell', breite: 1440, hoehe: 1800, theme: 'light' },
  { name: 'de-390-dunkel', breite: 390, hoehe: 1600, theme: 'dark' },
  { name: 'de-390-hell', breite: 390, hoehe: 1600, theme: 'light' },
  { name: 'tr-1440-dunkel', breite: 1440, hoehe: 1800, theme: 'dark', sprache: 'tr' },
  { name: 'tr-390-hell', breite: 390, hoehe: 1600, theme: 'light', sprache: 'tr' },
  // 200 % Zoom: 1440 Gerätepixel bei Faktor 2 = 720 CSS-Pixel.
  { name: 'de-720-200prozent', breite: 720, hoehe: 1600, theme: 'dark', faktor: 2 },
]

/**
 * Zustand der Seite für die Klicktabelle.
 * @param seite - Playwright-Seite
 * @returns Objekt mit Messwerten
 */
async function messe(seite) {
  return seite.evaluate(() => {
    const gedrueckt = (sel) => [...document.querySelectorAll(sel)].filter((e) => e.getAttribute('aria-pressed') === 'true').map((e) => e.textContent.trim())
    const gantt = document.querySelector('.rm-gantt')
    const links = document.querySelector('.rm-zeilen .rm-links')
    return {
      ueberlaufSeite: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      gantt: gantt === null ? null : { sicht: gantt.clientWidth, inhalt: gantt.scrollWidth, quer: gantt.scrollLeft },
      linkeSpalteX: links === null ? null : Math.round(links.getBoundingClientRect().left - gantt.getBoundingClientRect().left),
      zoom: gedrueckt('[data-roadmap-zoom]'),
      zeilen: document.querySelectorAll('.rm-zeilen > .rm-zeile').length,
      offen: document.querySelectorAll('.rm-zeilen [aria-expanded="true"]').length,
      gewaehlt: document.querySelector('.rm-zeile.gewaehlt .rm-name-text')?.textContent ?? null,
      detail: document.querySelector('#rm-detail-titel')?.textContent ?? null,
      kennzahlen: [...document.querySelectorAll('.roadmap-kennzahl strong')].map((e) => e.textContent.trim()),
      marken: document.querySelectorAll('.rm-marke').length,
      balken: document.querySelectorAll('.rm-balken').length,
    }
  })
}

/** WebP-Güte (0–1) der Umwandlung im Browser. */
const WEBP_GUETE = 0.8

const browser = await chromium.launch()
// Umwandlung PNG → WebP über die Canvas des vorhandenen Chromium (kein zusätzliches Paket, Nachtrag Render-Nachweis verkleinern).
const wandler = await browser.newPage()

/**
 * Schreibt einen PNG-Screenshot als WebP.
 * @param png - PNG-Bytes
 * @param datei - Dateiname ohne Endung
 */
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
}

const protokoll = []
for (const lage of LAGEN) {
  const kontext = await browser.newContext({ viewport: { width: lage.breite, height: lage.hoehe }, deviceScaleFactor: lage.faktor ?? 1 })
  await kontext.addInitScript(([theme, sprache]) => {
    localStorage.setItem('leitstand-theme', theme)
    localStorage.setItem('leitstand-sprache', sprache)
    localStorage.setItem('leitstand-chat-offen', 'false')
  }, [lage.theme, lage.sprache ?? 'de'])
  const seite = await kontext.newPage()
  const fehler = []
  seite.on('pageerror', (f) => fehler.push(String(f)))
  await seite.goto(`${BASIS}/#/roadmap`)
  await seite.waitForSelector('.rm-gantt')
  await seite.waitForFunction((laedt) => {
    const view = document.querySelector('#view-roadmap')
    return view !== null && document.querySelector('.rm-entwicklungsstand') !== null && document.querySelector('.roadmap-nicht-eingeplant') !== null && !view.textContent.includes(laedt)
  }, WOERTERBUECHER[lage.sprache ?? 'de']['roadmap.laedt'])
  await seite.waitForTimeout(150)
  /**
   * Misst jeden Schritt ins Protokoll; ein Bild nur für Schritte mit eigener Aussage (Ausgangslage ganze Seite, sonst nur
   * „Gesamte Roadmap“ mit Detailpanel). Die übrigen Schritte belegt allein protokoll.json.
   */
  const schritt = async (name, bild = null) => {
    if (bild === 'seite') await alsWebp(await seite.screenshot({ fullPage: true }), `${lage.name}-${name}`)
    if (bild === 'roadmap') await alsWebp(await seite.locator('.rm-gesamt').screenshot(), `${lage.name}-${name}`)
    protokoll.push({ lage: lage.name, schritt: name, bild: bild === null ? null : `${lage.name}-${name}.webp`, ...(await messe(seite)) })
  }
  await schritt('01-start', 'seite')
  await seite.click('[data-roadmap-zoom="wochen"]')
  await schritt('02-wochen', 'roadmap')
  await seite.click('[data-roadmap-zoom="tage"]')
  await seite.click('[data-roadmap-alles]')
  await schritt('03-alles-auf', 'roadmap')
  await seite.click('[data-roadmap-alles]')
  await seite.click('[data-roadmap-abgeschlossene-kopf]')
  await schritt('04-abgeschlossene')
  await seite.click('[data-roadmap-abgeschlossene-kopf]')
  // Nach „Alles zuklappen“ sind alle Zeilen zu — für die Workstream-Wahl wieder aufklappen.
  await seite.click('[data-roadmap-alles]')
  await seite.locator("[data-roadmap-waehlen^='[\"w\"']").first().click()
  await schritt('05-workstream')
  await seite.$eval('.rm-gantt', (g) => {
    g.scrollLeft = 400
  })
  await schritt('06-quer', 'roadmap')
  // Prüfpass cr 1/qa 1: nach dem Querscrollen eine Zeile wählen — der Querscroll muss bleiben.
  await seite.locator("[data-roadmap-waehlen^='[\"f\"']").first().click()
  await schritt('07-quer-klick')
  if (fehler.length > 0) protokoll.push({ lage: lage.name, schritt: 'Seitenfehler', fehler })
  await kontext.close()
}

// Seite an Seite: Design-Vorlage links, Umsetzung (de-1440-dunkel 01) rechts.
const vergleich = await browser.newPage({ viewport: { width: 2000, height: 1400 } })
const b64 = (pfad, typ) => `data:${typ};base64,${readFileSync(pfad).toString('base64')}`
const design = b64(join(ZIEL, '..', '..', '..', '..', 'docs', 'design', 'neu', '03-roadmap--Main.webp'), 'image/webp')
const umsetzung = b64(join(ZIEL, 'de-1440-dunkel-01-start.webp'), 'image/webp')
await vergleich.setContent(
  `<body style="margin:0;display:flex;gap:16px;align-items:flex-start;font:14px sans-serif"><figure style="margin:0;width:50%"><figcaption>Design 03-roadmap--Main</figcaption><img src="${design}" style="width:100%"></figure><figure style="margin:0;width:50%"><figcaption>Umsetzung B5b-2a (dunkel, 1440 px)</figcaption><img src="${umsetzung}" style="width:100%"></figure></body>`
)
await vergleich.waitForTimeout(300)
await alsWebp(await vergleich.screenshot({ fullPage: true }), 'seite-an-seite')
await browser.close()

writeFileSync(join(ZIEL, 'protokoll.json'), `${JSON.stringify(protokoll, null, 2)}\n`)
console.log(`${protokoll.length} Einträge, Bilder unter ${ZIEL}`)
