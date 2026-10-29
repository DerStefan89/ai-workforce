#!/usr/bin/env node
/**
 * Datei: scripts/render-nachweis.mjs
 *
 * Zweck: Render-Nachweis für UI-Projekte (F45 B3b-1): öffnet jede Seite aus `render.json` in einem echten Browser
 * (Playwright, Chromium headless) und schreibt Bilder und ein Protokoll nach `.render-nachweis/` (vorher geleert).
 * Je Seite fünf Varianten: 1440×900 hell und dunkel, 390×844 hell, 1440×900 mit „Bewegung reduzieren“, Zoom 200 %
 * (CSS-Viewport halbiert bei deviceScaleFactor 2). Bildfolge (hell und reduziert): je Zeitpunkt aus `bildfolgeMs` alle
 * Animationen der Seite (`document.getAnimations()`, CSS-Animationen und -Transitions) anhalten, `currentTime` setzen,
 * Bild. Rot bei: HTTP-Status ≥ 400 (oder keine Antwort), laufenden Animationen unter „Bewegung reduzieren“ (gezählt nach
 * zwei Frames, beendete wie beim `.01ms`-Reset zählen nicht), waagerechtem Überlauf bei 390 px, LCP über
 * `budget.lcpMs` oder nicht messbar (3 s ohne Eintrag), Summe `transferSize` über `budget.bytes`. LCP und Bytes misst
 * die Variante „reduziert“: Chromium meldet für ein Element, das aus `opacity: 0` einblendet, keinen LCP-Eintrag (auch
 * nicht danach, Probelauf F45 B3b-1) — gemessen wird die Lade- und Renderzeit ohne Einblendung. Auch der `.01ms`-Reset
 * beginnt bei `opacity: 0`: dann kein LCP (rot) — unter „Bewegung reduzieren“ `animation: none` verwenden.
 *
 * render.json (Projektwurzel, Pflicht; `{}` nimmt alle Standardwerte):
 *   { "ordner": "dist", "seiten": ["/"], "bildfolgeMs": [0, 150, 400, 1000], "budget": { "lcpMs": 2500, "bytes": 1000000 } }
 *   `ordner` (relativ, innerhalb des Projekts) wird über einen eigenen kurzlebigen Server auf 127.0.0.1 (Zufallsport,
 *   nur GET, kein Pfad-Ausbruch) ausgeliefert. Statt `ordner`: `"url": "http://127.0.0.1:<port>/"` oder `localhost`
 *   für einen schon laufenden Server.
 *
 * Grenzen: startet keinen Dev-Server und kein SSR; rAF-/JS-Animationen (z. B. GSAP) sieht `getAnimations()` nicht;
 * fertige Animationen ohne `fill` zählen nicht; LCP gegen localhost misst Renderzeit, nicht Netz; `transferSize` fremder
 * Herkunft ohne `Timing-Allow-Origin` ist 0. Browser-Code geht als Text an den Browser — so braucht die Typprüfung des
 * Projekts keine DOM-Typen, und playwright ist keine Abhängigkeit des Skeletts (dynamischer Import).
 *
 * Wird aufgerufen von: `npm run check:render` (package.json) — NICHT Teil von `npm run check` (braucht einen Browser).
 *
 * Aufruf: node scripts/render-nachweis.mjs
 * Exit 0 = alle Seiten im Rahmen, 1 = Befund, fehlende render.json, fehlendes playwright oder Fehler
 */

import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, isAbsolute, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Ausgabeordner in der Projektwurzel (gitignoriert, vor jedem Lauf geleert). */
const AUSGABE = '.render-nachweis'
/** Erlaubte `url`: nur dieser Rechner. */
const LOKAL = /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?(?:\/|$)/
/** Erlaubte Schlüssel in render.json (andere sind ein Tippfehler und machen rot). */
const SCHLUESSEL = new Set(['ordner', 'url', 'seiten', 'bildfolgeMs', 'budget'])
/** Inhaltstypen des kurzlebigen Servers (sonst application/octet-stream). */
const MIME = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.avif', 'image/avif'],
  ['.gif', 'image/gif'],
  ['.woff2', 'font/woff2'],
  ['.ico', 'image/x-icon'],
])

/**
 * @typedef {{ name: string, breite: number, hoehe: number, farbschema: 'light' | 'dark', zoom?: number,
 *   reduziert?: boolean, bildfolge?: boolean, messen?: boolean, ueberlauf?: boolean }} Variante
 * @typedef {{ ordner: string | null, url: string | null, seiten: string[], bildfolgeMs: number[],
 *   budget: { lcpMs: number, bytes: number } }} Konfig
 * @typedef {{ seite: string, variante: string, status: number, bilder: string[], animationen: number, laufend: number,
 *   ueberlauf?: boolean, lcpMs?: number | null, bytes?: number, befunde: string[] }} Ergebnis
 *
 * Nur die genutzten Teile der Playwright-API:
 * @typedef {{ evaluate: (ausdruck: string) => Promise<unknown>, addInitScript: (s: { content: string }) => Promise<void>,
 *   emulateMedia: (m: { colorScheme: 'light' | 'dark', reducedMotion: 'reduce' | 'no-preference' }) => Promise<void>,
 *   goto: (url: string, o: { waitUntil: 'load' }) => Promise<{ status: () => number } | null>,
 *   screenshot: (o: { path: string }) => Promise<unknown>,
 *   waitForTimeout: (ms: number) => Promise<void> }} Seite
 * @typedef {{ newPage: () => Promise<Seite>, close: () => Promise<void> }} Kontext
 * @typedef {{ newContext: (o: { viewport: { width: number, height: number }, deviceScaleFactor: number }) =>
 *   Promise<Kontext>, close: () => Promise<void> }} Browser
 */

/** @type {readonly Variante[]} */
export const VARIANTEN = [
  { name: 'desktop-hell', breite: 1440, hoehe: 900, farbschema: 'light', bildfolge: true },
  { name: 'desktop-dunkel', breite: 1440, hoehe: 900, farbschema: 'dark' },
  { name: 'mobil-hell', breite: 390, hoehe: 844, farbschema: 'light', ueberlauf: true },
  { name: 'reduziert', breite: 1440, hoehe: 900, farbschema: 'light', reduziert: true, bildfolge: true, messen: true },
  { name: 'zoom-200', breite: 1440, hoehe: 900, farbschema: 'light', zoom: 2 },
]

/** Merkt sich den letzten LCP-Eintrag (läuft vor jedem Skript der Seite). */
const LCP_BEOBACHTER = `window.__lcp = null
try {
  new PerformanceObserver((liste) => { for (const e of liste.getEntries()) window.__lcp = e.startTime })
    .observe({ type: 'largest-contentful-paint', buffered: true })
} catch {}`
/** Browser-Ausdruck: Summe `transferSize` von Dokument und allen Ressourcen. */
const BYTES = `performance.getEntriesByType('navigation').concat(performance.getEntriesByType('resource'))
  .reduce((summe, e) => summe + (e.transferSize || 0), 0)`
/** Browser-Ausdruck: wartet zwei Animation-Frames. */
const ZWEI_FRAMES = 'new Promise((fertig) => requestAnimationFrame(() => requestAnimationFrame(() => fertig(true))))'
/** Browser-Ausdruck: Ist die Seite breiter als das Fenster? */
const UEBERLAUF = 'document.documentElement.scrollWidth > document.documentElement.clientWidth'

/**
 * Browser-Ausdruck: Animationen anhalten und auf `ms` stellen (wie `animationenBei` der Workforce).
 * @param {number} ms - Zeitpunkt je Animation ab ihrem eigenen Start
 * @param {boolean} fertigeLassen - beendete Animationen nicht zurückstellen (Variante „reduziert“: ein Reset auf
 *   `.01ms` mit `fill: both` zeigt sonst den Startzustand)
 * @returns {string} Ausdruck, liefert [alle, nicht beendete] vor dem Anhalten
 */
function anhaltenBei(ms, fertigeLassen) {
  return `(() => {
  const alle = document.getAnimations()
  const laufend = alle.filter((a) => a.playState !== 'finished')
  for (const a of ${fertigeLassen ? 'laufend' : 'alle'}) { a.pause(); a.currentTime = ${Number(ms)} }
  return [alle.length, laufend.length]
})()`
}

/**
 * Prüft eine Liste aus render.json.
 * @template T
 * @param {unknown} wert - Rohwert
 * @param {T[]} standard - Standardwert, wenn `wert` fehlt
 * @param {(e: unknown) => boolean} gueltig - Prüfung je Eintrag
 * @param {string} name - Feldname für die Meldung
 * @returns {T[]} geprüfte Liste
 */
function liste(wert, standard, gueltig, name) {
  if (wert === undefined) return standard
  if (!Array.isArray(wert) || wert.length === 0 || !wert.every(gueltig)) throw new Error(`${name} ungültig`)
  return wert
}

/**
 * Prüft eine positive Zahl aus render.json.
 * @param {unknown} wert - Rohwert
 * @param {number} standard - Standardwert, wenn `wert` fehlt
 * @param {string} name - Feldname für die Meldung
 * @returns {number} geprüfte Zahl
 */
function positiv(wert, standard, name) {
  if (wert === undefined) return standard
  if (typeof wert !== 'number' || !(wert > 0)) throw new Error(`${name} muss eine Zahl > 0 sein`)
  return wert
}

/**
 * Ist `wert` ein JSON-Objekt (kein Array, nicht null)?
 * @param {unknown} wert - Rohwert
 * @returns {wert is Record<string, unknown>} true bei Objekt
 */
function istObjekt(wert) {
  return typeof wert === 'object' && wert !== null && !Array.isArray(wert)
}

/**
 * Prüft die Quelle: `ordner` (Standard dist) oder `url`, nicht beides.
 * @param {Record<string, unknown>} roh - render.json
 * @returns {{ ordner: string | null, url: string | null }} Quelle
 */
function leseQuelle(roh) {
  if (roh.url !== undefined && roh.ordner !== undefined) throw new Error('entweder "ordner" oder "url", nicht beides')
  if (roh.url !== undefined) {
    if (!(typeof roh.url === 'string' && LOKAL.test(roh.url)))
      throw new Error('"url" nur http://127.0.0.1 oder localhost')
    return { ordner: null, url: roh.url }
  }
  const ordner = roh.ordner ?? 'dist'
  if (!(typeof ordner === 'string' && ordner !== '' && !isAbsolute(ordner))) {
    throw new Error('"ordner" muss ein relativer Pfad sein')
  }
  if (ordner.split(/[\\/]/).includes('..')) throw new Error('"ordner" darf das Projekt nicht verlassen')
  return { ordner, url: null }
}

/**
 * Liest render.json (reine Funktion, wirft bei ungültigem Inhalt).
 * @param {string} text - Inhalt von render.json (eine BOM am Anfang ist erlaubt)
 * @returns {Konfig} Konfiguration mit Standardwerten
 */
export function leseKonfig(text) {
  const roh = JSON.parse(text.replace(/^﻿/, ''))
  if (!istObjekt(roh)) throw new Error('muss ein JSON-Objekt sein')
  const fremd = Object.keys(roh).filter((schluessel) => !SCHLUESSEL.has(schluessel))
  if (fremd.length > 0) throw new Error(`unbekannte Schlüssel: ${fremd.join(', ')}`)
  const budget = roh.budget ?? {}
  if (!istObjekt(budget)) throw new Error('"budget" muss ein Objekt sein')
  // Kein `//` oder `\` am Anfang: new URL machte daraus einen fremden Host.
  const seiten = liste(
    roh.seiten,
    ['/'],
    (s) => typeof s === 'string' && /^\/(?![/\\])/.test(s),
    '"seiten" (Pfade mit /)'
  )
  const bildfolgeMs = liste(
    roh.bildfolgeMs,
    [0, 150, 400, 1000],
    (z) => typeof z === 'number' && z >= 0,
    '"bildfolgeMs"'
  )
  if (new Set(seiten.map(kurzname)).size !== seiten.length) throw new Error('"seiten" ergeben gleiche Bildnamen')
  if (new Set(bildfolgeMs).size !== bildfolgeMs.length) throw new Error('"bildfolgeMs" doppelt')
  return {
    ...leseQuelle(roh),
    seiten,
    bildfolgeMs,
    budget: {
      lcpMs: positiv(budget.lcpMs, 2500, 'budget.lcpMs'),
      bytes: positiv(budget.bytes, 1_000_000, 'budget.bytes'),
    },
  }
}

/**
 * Löst einen URL-Pfad im ausgelieferten Ordner auf; null bei Ausbruch oder kaputter Kodierung.
 * @param {string} ordner - ausgelieferter Ordner
 * @param {string} urlPfad - Pfad der Anfrage (mit Query)
 * @returns {string | null} absoluter Dateipfad innerhalb von `ordner`
 */
export function loeseDateiPfad(ordner, urlPfad) {
  let pfad
  try {
    pfad = decodeURIComponent(urlPfad.split('?')[0] ?? '')
  } catch {
    return null
  }
  // '\' ablehnen: in URL-Pfaden nie gültig, so verhalten sich Windows und Linux gleich
  if (pfad.includes('\0') || pfad.includes('\\')) return null
  const basis = resolve(ordner)
  const ziel = resolve(basis, `.${pfad.startsWith('/') ? '' : '/'}${pfad}`)
  return ziel === basis || ziel.startsWith(basis + sep) ? ziel : null
}

/**
 * Beantwortet eine Anfrage an den kurzlebigen Server: nur GET, nur Dateien im Ordner (auch nach realpath).
 * @param {string} ordner - ausgelieferter Ordner (realpath)
 * @param {import('node:http').IncomingMessage} anfrage - Anfrage
 * @param {import('node:http').ServerResponse} antwort - Antwort
 */
function beantworte(ordner, anfrage, antwort) {
  if (anfrage.method !== 'GET') return void antwort.writeHead(405).end()
  try {
    let datei = loeseDateiPfad(ordner, anfrage.url ?? '/')
    if (datei !== null && existsSync(datei) && statSync(datei).isDirectory()) datei = join(datei, 'index.html')
    if (datei === null || !existsSync(datei) || !statSync(datei).isFile()) return void antwort.writeHead(404).end()
    const echt = realpathSync(datei)
    if (!echt.startsWith(ordner + sep)) return void antwort.writeHead(403).end()
    const typ = MIME.get(extname(echt).toLowerCase()) ?? 'application/octet-stream'
    antwort.writeHead(200, { 'content-type': typ }).end(readFileSync(echt))
  } catch (fehler) {
    // Datei verschwunden oder gesperrt: 500 statt Absturz des ganzen Laufs; die Seite wird dadurch rot (Status).
    console.error(`  Server: ${anfrage.url} — ${fehler instanceof Error ? fehler.message : String(fehler)}`)
    antwort.writeHead(500).end()
  }
}

/**
 * Startet den Server auf 127.0.0.1 mit Zufallsport.
 * @param {string} ordner - auszuliefernder Ordner
 * @returns {Promise<{ server: import('node:http').Server, url: string }>} Server und Basis-URL
 */
function starteServer(ordner) {
  const echt = realpathSync(ordner)
  const server = createServer((anfrage, antwort) => beantworte(echt, anfrage, antwort))
  return new Promise((fertig, fehler) => {
    server.once('error', fehler)
    server.listen(0, '127.0.0.1', () => {
      const adresse = server.address()
      fertig({ server, url: `http://127.0.0.1:${typeof adresse === 'object' && adresse ? adresse.port : 0}/` })
    })
  })
}

/**
 * Lädt playwright aus dem Projekt; null, wenn es nicht installiert ist (andere Ladefehler werfen).
 * @returns {Promise<{ chromium: { launch: () => Promise<Browser> } } | null>} Modul oder null
 */
async function ladePlaywright() {
  const name = 'playwright'
  try {
    return await import(name)
  } catch (fehler) {
    if (fehler instanceof Error && 'code' in fehler && fehler.code === 'ERR_MODULE_NOT_FOUND') return null
    throw fehler
  }
}

/**
 * Dateiname-Teil für einen Seitenpfad.
 * @param {string} seitenPfad - z. B. `/` oder `/preise.html`
 * @returns {string} z. B. `start` oder `preise-html`
 */
function kurzname(seitenPfad) {
  return seitenPfad.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'start'
}

/**
 * Misst LCP (bis 3 s warten) und übertragene Bytes.
 * @param {Seite} seite - geladene Seite
 * @returns {Promise<{ lcpMs: number | null, bytes: number }>} Messwerte, lcpMs null = kein Eintrag
 */
async function messe(seite) {
  let lcp = null
  for (let versuch = 0; versuch <= 30; versuch++) {
    lcp = await seite.evaluate('window.__lcp')
    if (typeof lcp === 'number') break
    await seite.waitForTimeout(100)
  }
  return { lcpMs: typeof lcp === 'number' ? Math.round(lcp) : null, bytes: Number(await seite.evaluate(BYTES)) }
}

/**
 * Bewertet ein Ergebnis gegen die Regeln (reine Funktion).
 * @param {Omit<Ergebnis, 'befunde'>} e - Messwerte
 * @param {Variante} variante - Variante
 * @param {Konfig['budget']} budget - Budget
 * @returns {string[]} Befunde
 */
export function bewerte(e, variante, budget) {
  const befunde = []
  const wo = `${e.seite} (${e.variante})`
  if (!(e.status >= 200 && e.status < 400)) befunde.push(`${wo}: Seite liefert HTTP ${e.status}`)
  if (variante.reduziert && e.laufend > 0)
    befunde.push(`${wo}: ${e.laufend} Animation(en) laufen trotz „Bewegung reduzieren“`)
  if (e.ueberlauf === true) befunde.push(`${wo}: waagerechter Überlauf`)
  if (e.lcpMs === null) {
    befunde.push(
      `${wo}: LCP nicht messbar (kein Eintrag nach 3 s) — beginnt der Inhalt unter „Bewegung reduzieren“ bei opacity 0 ` +
        '(z. B. Reset auf .01ms)? Dort mit animation: none abschalten'
    )
  }
  if (typeof e.lcpMs === 'number' && e.lcpMs > budget.lcpMs)
    befunde.push(`${wo}: LCP ${e.lcpMs} ms > ${budget.lcpMs} ms`)
  if (typeof e.bytes === 'number' && e.bytes > budget.bytes) befunde.push(`${wo}: ${e.bytes} Bytes > ${budget.bytes}`)
  return befunde
}

/**
 * Öffnet die Seite im Kontext mit Farbschema und Bewegungswunsch der Variante.
 * @param {Kontext} kontext - frischer Browser-Kontext
 * @param {string} basisUrl - Basis-URL
 * @param {string} seitenPfad - Seite
 * @param {Variante} variante - Variante
 * @returns {Promise<{ seite: Seite, status: number }>} geladene Seite und HTTP-Status (0 = keine Antwort)
 */
async function oeffne(kontext, basisUrl, seitenPfad, variante) {
  const seite = await kontext.newPage()
  await seite.emulateMedia({
    colorScheme: variante.farbschema,
    reducedMotion: variante.reduziert ? 'reduce' : 'no-preference',
  })
  if (variante.messen) await seite.addInitScript({ content: LCP_BEOBACHTER })
  // Relativ zur Basis (ein Unterpfad der url bleibt erhalten); fremder Host ist ausgeschlossen.
  const ziel = new URL(`.${seitenPfad}`, basisUrl)
  if (ziel.origin !== new URL(basisUrl).origin) throw new Error(`Seite ${seitenPfad} verlässt ${basisUrl}`)
  const antwort = await seite.goto(ziel.href, { waitUntil: 'load' })
  return { seite, status: antwort?.status() ?? 0 }
}

/**
 * Öffnet eine Seite in einer Variante (frischer Kontext, ohne Cache), nimmt Bilder und misst.
 * @param {Browser} browser - Browser
 * @param {string} basisUrl - Basis-URL
 * @param {string} seitenPfad - Seite
 * @param {Variante} variante - Variante
 * @param {Konfig} konfig - Konfiguration
 * @param {string} ausgabe - Ausgabeordner
 * @returns {Promise<Ergebnis>} Ergebnis mit Befunden
 */
async function nimmVariante(browser, basisUrl, seitenPfad, variante, konfig, ausgabe) {
  const zoom = variante.zoom ?? 1
  const viewport = { width: Math.round(variante.breite / zoom), height: Math.round(variante.hoehe / zoom) }
  const kontext = await browser.newContext({ viewport, deviceScaleFactor: zoom })
  try {
    const { seite, status } = await oeffne(kontext, basisUrl, seitenPfad, variante)
    // Zwei Frames abwarten: direkt nach `load` gilt auch eine `.01ms`-Animation (übliches Reset-Muster) noch als laufend.
    if (variante.reduziert) await seite.evaluate(ZWEI_FRAMES)
    const zeiten = variante.bildfolge ? konfig.bildfolgeMs : konfig.bildfolgeMs.slice(-1)
    /** @type {Omit<Ergebnis, 'befunde'>} */
    const e = {
      seite: seitenPfad,
      variante: variante.name,
      status,
      bilder: [],
      animationen: 0,
      laufend: 0,
    }
    for (const [i, ms] of zeiten.entries()) {
      const [alle, laufend] = /** @type {number[]} */ (
        await seite.evaluate(anhaltenBei(ms, variante.reduziert === true))
      )
      if (i === 0) Object.assign(e, { animationen: alle ?? 0, laufend: laufend ?? 0 })
      const bild = `${kurzname(seitenPfad)}-${variante.name}${variante.bildfolge ? `-${ms}ms` : ''}.png`
      await seite.screenshot({ path: join(ausgabe, bild) })
      e.bilder.push(bild)
    }
    if (variante.ueberlauf) e.ueberlauf = (await seite.evaluate(UEBERLAUF)) === true
    if (variante.messen) Object.assign(e, await messe(seite))
    return { ...e, befunde: bewerte(e, variante, konfig.budget) }
  } finally {
    await kontext.close()
  }
}

/**
 * Schreibt protokoll.md und protokoll.json (nur relative Namen, kein Ordnerpfad, kein Zufallsport).
 * @param {string} ausgabe - Ausgabeordner
 * @param {Konfig} konfig - Konfiguration
 * @param {Ergebnis[]} ergebnisse - Ergebnisse
 * @returns {string[]} alle Befunde
 */
function schreibeProtokoll(ausgabe, konfig, ergebnisse) {
  const befunde = ergebnisse.flatMap((e) => e.befunde)
  const ergebnis = befunde.length === 0 ? 'grün' : 'rot'
  const quelle = konfig.url === null ? `ordner: ${konfig.ordner}` : `url: ${konfig.url}`
  const zelle = (/** @type {unknown} */ w) => (w === undefined ? '–' : w === null ? 'nicht messbar' : String(w))
  const zeilen = ergebnisse.map(
    (e) =>
      `| ${e.seite} | ${e.variante} | ${e.status} | ${e.animationen} (${e.laufend} laufend) | ${zelle(e.ueberlauf)} | ` +
      `${zelle(e.lcpMs)} | ${zelle(e.bytes)} | ${e.bilder.join(', ')} |`
  )
  const md = [
    '# Render-Nachweis',
    '',
    `Quelle: ${quelle} · Bildfolge: ${konfig.bildfolgeMs.join(', ')} ms · Budget: LCP ${konfig.budget.lcpMs} ms, ${konfig.budget.bytes} Bytes`,
    '',
    '| Seite | Variante | HTTP | Animationen | Überlauf | LCP ms | Bytes | Bilder |',
    '|---|---|---|---|---|---|---|---|',
    ...zeilen,
    '',
    '## Befunde',
    '',
    ...(befunde.length === 0 ? ['keine'] : befunde.map((b) => `- ${b}`)),
    '',
    `Ergebnis: **${ergebnis}**`,
    '',
  ].join('\n')
  writeFileSync(join(ausgabe, 'protokoll.md'), md)
  const json = { ergebnis, quelle, bildfolgeMs: konfig.bildfolgeMs, budget: konfig.budget, ergebnisse, befunde }
  writeFileSync(join(ausgabe, 'protokoll.json'), `${JSON.stringify(json, null, 2)}\n`)
  return befunde
}

/**
 * Prüft die Voraussetzungen: render.json, auszuliefernder Ordner, playwright.
 * @param {string} wurzel - Projektordner
 * @returns {Promise<{ konfig: Konfig, ordner: string | null, launch: () => Promise<Browser> } | string>} Bereitschaft
 *   oder Fehlermeldung
 */
async function bereiteVor(wurzel) {
  const konfigPfad = join(wurzel, 'render.json')
  if (!existsSync(konfigPfad)) {
    return 'render.json fehlt — anlegen (Beispiel: docs/harness/gate-vorlage-node.md, Abschnitt UI-Projekte)'
  }
  let konfig
  try {
    konfig = leseKonfig(readFileSync(konfigPfad, 'utf8'))
  } catch (fehler) {
    return `render.json: ${fehler instanceof Error ? fehler.message : String(fehler)}`
  }
  const ordner = konfig.ordner === null ? null : join(wurzel, konfig.ordner)
  if (ordner !== null && !(existsSync(ordner) && statSync(ordner).isDirectory())) {
    return `Ordner „${konfig.ordner}“ fehlt — vorher bauen`
  }
  // Auch ein symbolischer Link darf nicht aus dem Projekt führen.
  if (ordner !== null && !realpathSync(ordner).startsWith(realpathSync(wurzel) + sep)) {
    return `Ordner „${konfig.ordner}“ liegt außerhalb des Projekts`
  }
  const playwright = await ladePlaywright()
  if (playwright === null)
    return 'playwright fehlt — installieren: docs/harness/gate-vorlage-node.md, Abschnitt UI-Projekte'
  return { konfig, ordner, launch: () => playwright.chromium.launch() }
}

/**
 * Nimmt alle Seiten in allen Varianten auf.
 * @param {Browser} browser - Browser
 * @param {string} basisUrl - Basis-URL
 * @param {Konfig} konfig - Konfiguration
 * @param {string} ausgabe - Ausgabeordner
 * @returns {Promise<Ergebnis[]>} Ergebnisse, Seite für Seite
 */
async function nimmAlleAuf(browser, basisUrl, konfig, ausgabe) {
  const ergebnisse = []
  for (const seitenPfad of konfig.seiten) {
    for (const variante of VARIANTEN) {
      ergebnisse.push(await nimmVariante(browser, basisUrl, seitenPfad, variante, konfig, ausgabe))
    }
  }
  return ergebnisse
}

/**
 * Führt den Render-Nachweis im Projektordner aus.
 * @param {string} wurzel - Projektordner
 * @returns {Promise<number>} Exit-Code
 */
async function main(wurzel) {
  const bereit = await bereiteVor(wurzel)
  if (typeof bereit === 'string') {
    console.error(`✗ ${bereit}`)
    return 1
  }
  const { konfig, ordner, launch } = bereit
  const ausgabe = join(wurzel, AUSGABE)
  const lokal = ordner === null ? null : await starteServer(ordner)
  let ergebnisse
  try {
    const browser = await launch()
    try {
      // Erst nach dem Browserstart leeren: fehlt Chromium, bleibt der alte Nachweis stehen.
      rmSync(ausgabe, { recursive: true, force: true })
      mkdirSync(ausgabe, { recursive: true })
      ergebnisse = await nimmAlleAuf(browser, lokal?.url ?? konfig.url ?? '', konfig, ausgabe)
    } finally {
      await browser.close()
    }
  } finally {
    lokal?.server.close()
  }
  const befunde = schreibeProtokoll(ausgabe, konfig, ergebnisse)
  for (const befund of befunde) console.error(`✗ ${befund}`)
  const zeichen = befunde.length === 0 ? '✓' : '✗'
  console.log(`${zeichen} Render-Nachweis: ${ergebnisse.length} Ansichten, ${AUSGABE}/protokoll.md`)
  return befunde.length === 0 ? 0 : 1
}

/**
 * Direkter Aufruf? Vergleich über realpath (wie check-dateigroesse.mjs).
 * @returns {boolean} true bei `node scripts/render-nachweis.mjs`
 */
function istHaupteinstieg() {
  try {
    return realpathSync(process.argv[1] ?? '') === realpathSync(fileURLToPath(import.meta.url))
  } catch {
    return false
  }
}

if (istHaupteinstieg()) {
  main(process.cwd()).then(
    (code) => {
      process.exitCode = code
    },
    (fehler) => {
      console.error(`✗ Render-Nachweis: ${fehler instanceof Error ? fehler.message : String(fehler)}`)
      process.exitCode = 1
    }
  )
}
