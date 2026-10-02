/**
 * Datei: features/F46/nachweise/d0/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweise F46 D0 „Grundlage“ — alles mit festen Antworten, kein Modell-Lauf:
 * - `#/dashboard` mit Kopfleiste in zwei Zuständen (Lauf aktiv / kein Lauf), je Matrix 1440 dunkel,
 *   1440 hell, 390 dunkel, 1440 dunkel mit 200 % Zoom, 1440 ru — Kopf-Ausschnitt und ganze Seite, bei
 *   390 px und 200 % zusätzlich der Chip im mobilen Menü bzw. in der Sidebar;
 * - Staffelung des Live-Chips (Lauf aktiv): 1920, 1600, 1500 und 1340 (die gemessen engsten Stufen der
 *   Kopfleiste), 1200 (Werkzeuge in der Sidebar);
 * - Klicktabelle: Chip „Workforce arbeitet“ → #/runs/<laufId>; danach kein Lauf → Chip „Gerade läuft
 *   nichts“ → #/ausfuehrungen; Persona-Statuszeile bleibt die einzige aria-live-Region;
 * - Escape-Fall: Auftragstitel mit HTML erscheint als Text;
 * - Musterfeld der sechs Ebenen-Farben (voll, blass, Umriss für „geplant“) dunkel und hell — NUR im
 *   Nachweis: ein in den Testbrowser eingesetztes Element, nichts davon liegt im Produkt.
 * Die Folgen laufen über scripts/render-nachweis.mjs (klickfolge.json je Unterordner); das Musterfeld
 * fährt Playwright hier direkt. Screenshots als WebP. Vor dem Lauf leert das Skript die Ausgabeordner
 * GENAU der Folgen, die es neu erzeugt (fs.rmSync) — nie etwas anderes.
 *
 * Wird aufgerufen von: Hand, gegen einen laufenden Leitstand dieses Worktrees —
 *   LEITSTAND_PORT=4199 node scripts/leitstand-server.mjs
 *   node features/F46/nachweise/d0/erzeuge-nachweis.mjs [basis] [nurOrdner]
 * Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const basis = process.argv[2] ?? 'http://127.0.0.1:4199'
const nur = process.argv[3]
/** Ausgabe neben diesem Skript, Repo-Wurzel vier Ebenen darüber — unabhängig vom Aufrufverzeichnis. */
const ziel = dirname(fileURLToPath(import.meta.url))
const wurzel = resolve(ziel, '../../../..')

const LAUF_ID = '3f2a9c71-5b4e-4d0a-9e1f-2c7b8a6d4e10'
const TITEL = 'Live-Chip in der Kopfleiste nachweisen'
const TITEL_HTML = '<img src=x onerror=alert(1)> Auftrag mit <b>HTML</b> im Titel'

/** Kopfdaten eines laufenden Laufs (Form wie sammleLaufKopfdaten im Server). */
const kopfdaten = (titel) => ({ laufId: LAUF_ID, laufStatus: { status: 'NICHT_GESTARTET' }, ergebnis: null, zeitpunkt: '2026-10-02T09:12:00.000Z', auftragsbezug: { auftragId: 'auftrag-nachweis-d0', titel }, anzahlCheckpoints: 1, kettenintegritaet: true, kenntnisgenommen: false })
const zustand = (felder) => ({ laeufe: [], startfehler: [], workflows: [], fehler: [], aktiverLauf: { aktiv: false, laufId: null }, pruefbefehl: null, istAiWorkforce: true, ...felder })
const ZUSTAND_AKTIV = zustand({ laeufe: [kopfdaten(TITEL)], aktiverLauf: { aktiv: true, laufId: LAUF_ID } })
const ZUSTAND_RUHIG = zustand({})
const ZUSTAND_HTML = zustand({ laeufe: [kopfdaten(TITEL_HTML)], aktiverLauf: { aktiv: true, laufId: LAUF_ID } })

/** Lauf-Detail für den Klick auf den Chip (Form wie GET /api/laeufe/<id>). */
const LAUF_DETAIL = {
  laufId: LAUF_ID,
  fortschritt: { werkzeug: 'Edit', ziel: 'public/leitstand/live-chip.js' },
  scoutErgebnis: null,
  laufStatus: { status: 'NICHT_GESTARTET' },
  aktiv: true,
  verweigertDaten: null,
  auftrag: { status: 'ok', auftragId: 'auftrag-nachweis-d0', titel: TITEL, auftragstext: 'Fester Auftrag des Nachweises F46 D0.' },
  kontextpaket: { status: 'nicht_vorhanden' },
  laufakte: { status: 'nicht_vorhanden' },
  rohstrom: { status: 'laufakte_fehlt' },
  checkpoints: [{ sequenz: 1, zeitstempel: '2026-10-02T09:12:00.000Z', gueltig: true, typ: 'wirkungsmarke', wirkungsmarke: { art: 'run_prepared' } }],
}

const PROJEKTE = { projekte: [{ id: 'ai-workforce', name: 'AI Workforce', repo_pfad: 'C:\\Users\\stefa\\Projekte\\ai workforce', status: 'IN_ENTWICKLUNG', laufAktiv: true }] }
const ROADMAP = { status: 'ok', vision: 'Eine ruhige Kommandozentrale für die Zusammenarbeit mit KI.', meilensteine: [] }

const BEOBACHTUNG = {
  texte: [
    { name: 'Ansicht', selector: '[data-view]:not([hidden])', attribut: 'data-view' },
    { name: 'data-theme', selector: 'html', attribut: 'data-theme' },
    { name: 'lang', selector: 'html', attribut: 'lang' },
    { name: 'Persona-Status (Live-Region)', selector: '#persona-text-status' },
    { name: 'Chip-Text', selector: '#kopf-live-chip' },
    { name: 'Menü-Chip-Text', selector: '.menue-live-chip' },
    { name: 'Chip title', selector: '#kopf-live-chip', attribut: 'title' },
    { name: 'Chip href', selector: '#kopf-live-chip', attribut: 'href' },
    { name: 'Chip data-aktiv', selector: '#kopf-live-chip', attribut: 'data-aktiv' },
    { name: 'Punkt aria-hidden', selector: '#kopf-live-chip .live-chip-punkt', attribut: 'aria-hidden' },
    { name: 'Register aktiv', selector: '#runs-register [aria-current="page"]' },
    { name: 'Lauf-Detail Titel', selector: '#lauf-detail h1' },
    { name: 'Fokus (class)', selector: ':focus', attribut: 'class' },
    { name: 'Poll-Fehler', selector: '#poll-fehler:not([hidden])' },
  ],
  vorhanden: [
    { name: 'Chip sichtbar (nicht hidden)', selector: '#kopf-live-chip:not([hidden])' },
    { name: 'aria-live außer Persona (muss fehlen)', selector: '[aria-live]:not(#persona-text-status)' },
    { name: '<img> im Chip (muss fehlen)', selector: '#kopf-live-chip img' },
  ],
  getroffen: [
    { name: 'Live-Chip klickbar', selector: '#kopf-live-chip' },
    { name: 'Menü-Chip klickbar', selector: '.menue-live-chip' },
    { name: 'Projektauswahl klickbar', selector: '#kopf-projekt-auswahl' },
  ],
  ueberlauf: true,
}

const get = (muster, json) => ({ muster, methode: 'GET', json })
/** Grundantworten; zustandWert null = keine feste Zustands-Antwort (für anfragenBlockieren, sonst gewänne die Route). */
const grund = (zustandWert) => [...(zustandWert === null ? [] : [get('**/api/zustand', zustandWert)]), get('**/api/roadmap', ROADMAP), get('**/api/projekte', PROJEKTE), get(`**/api/laeufe/${LAUF_ID}`, LAUF_DETAIL)]
const warte = (selector, timeoutMs = 8000) => ({ warteAufSelector: { selector, timeoutMs } })

/**
 * Eine Folge.
 * @param optionen - url, schritte, zustandWert, farbschema, breite, hoehe, zoom, sprache, ausschnitt, blockieren
 * @returns Klickfolge
 */
function folge({ url = '#/dashboard', schritte, zustandWert, farbschema = 'dark', breite = 1440, hoehe = 1000, zoom = 1, sprache, ausschnitt, blockieren }) {
  return {
    ...(blockieren ? { anfragenBlockieren: blockieren } : {}),
    url: `${basis}/${url}`,
    viewport: { breite, hoehe },
    farbschema,
    zoom,
    screenshotQualitaet: 0.7,
    ...(ausschnitt ? { screenshotAusschnitt: ausschnitt } : {}),
    localStorageSetzen: { 'leitstand-chat-offen': 'false', ...(sprache ? { 'leitstand-sprache': sprache } : {}) },
    anfragenAntworten: grund(zustandWert),
    beobachtete: BEOBACHTUNG,
    schritte,
  }
}

const folgen = {}
const KOPF = { selector: '#shell-kopf' }

// ─── Matrix: Kopfleiste in zwei Zuständen ──────────────────────────────────
const DARSTELLUNGEN = {
  'dunkel-1440': { praefix: 'd1440' },
  'hell-1440': { praefix: 'l1440', farbschema: 'light' },
  'dunkel-390': { praefix: 'd390', breite: 390, hoehe: 844 },
  'dunkel-1440-zoom200': { praefix: 'd1440z2', zoom: 2 },
  'ru-1440': { praefix: 'ru1440', sprache: 'ru' },
}
const ZUSTAENDE = {
  aktiv: { zustandWert: ZUSTAND_AKTIV, text: '„Workforce arbeitet · Live-Chip in der Kopfleiste nachweisen“ (Mint-Punkt), Link #/runs/<laufId>', warteAuf: '#kopf-live-chip[data-aktiv="true"]' },
  ruhig: { zustandWert: ZUSTAND_RUHIG, text: '„Gerade läuft nichts“ (gedämpfter Punkt), Link #/ausfuehrungen', warteAuf: '#kopf-live-chip[data-aktiv="false"]' },
}
for (const [zName, z] of Object.entries(ZUSTAENDE)) {
  for (const [dName, { praefix, ...darstellung }] of Object.entries(DARSTELLUNGEN)) {
    folgen[`kopf-${zName}-${dName}`] = folge({
      zustandWert: z.zustandWert,
      ausschnitt: KOPF,
      schritte: [
        { label: `Kopfleiste, ${zName === 'aktiv' ? 'Lauf aktiv' : 'kein Lauf'}: ${z.text}; neben dem Persona-Status, kein Überlauf`, ...warte(z.warteAuf), screenshot: `${praefix}-${zName}-1-kopf.webp` },
        { label: 'Ganze Seite #/dashboard (bis 1150 CSS-px — 390 px und 200 % — steht der Chip in Sidebar bzw. mobilem Menü, nicht im Kopf)', screenshot: `${praefix}-${zName}-2-seite.webp`, ohneAusschnitt: true },
      ],
      ...darstellung,
    })
  }
}

// ─── Staffelung (Lauf aktiv) ───────────────────────────────────────────────
const STAFFEL = {
  'dunkel-1920': { breite: 1920, text: 'genug Platz: voller Text unter der Statuszeile' },
  'dunkel-1700': { breite: 1700, text: 'ab 1700 px: Eintrag sichtbar, auf den freien Platz gekürzt (Auslassung)' },
  'dunkel-1600': { breite: 1600, text: 'unter 1700 px: nur „Workforce arbeitet“, Eintrag nur für Screenreader und im title' },
  'dunkel-1500': { breite: 1500, text: 'engste Stufe (Werkzeuge beschriftet): Zustandstext ungekürzt, Projektauswahl ungekürzt' },
  'dunkel-1340': { breite: 1340, text: 'engste Stufe (Symbol + „kommt“): Zustandstext ungekürzt, notfalls zweizeilig' },
  'dunkel-1200': { breite: 1200, text: 'Werkzeuge in der Sidebar: mehr Platz für den Chip' },
}
// Bis 1150 CSS-px: Chip in der Sidebar (200 %, Fokus holt ihn in den Blick) bzw. im mobilen Menü (390 px).
for (const z of ['aktiv', 'ruhig']) {
  folgen[`kopf-${z}-dunkel-1440-zoom200`].schritte.push({ label: 'Sidebar: Fokus auf den Chip (scrollt die Sidebar), Chip mit Text über den Werkzeugen', fokus: '.menue-live-chip', screenshot: `d1440z2-${z}-3-sidebar.webp`, ohneAusschnitt: true })
  folgen[`kopf-${z}-dunkel-390`].schritte.push({ label: 'Mobiles Menü geöffnet: Chip mit Text über den Werkzeugen', klick: '#shell-menue-oeffner', ...warte('#shell.menue-offen .menue-live-chip'), screenshot: `d390-${z}-3-menue.webp`, ohneAusschnitt: true })
}

for (const [name, { breite, text }] of Object.entries(STAFFEL)) {
  folgen[`staffel-${name}`] = folge({
    zustandWert: ZUSTAND_AKTIV,
    breite,
    ausschnitt: KOPF,
    schritte: [{ label: `Staffelung ${breite} px: ${text}`, ...warte('#kopf-live-chip[data-aktiv="true"]'), screenshot: `d${breite}-staffel-kopf.webp` }],
  })
}

// Prüfpass D0 (qa 2, dg 2): ru und tr auf den engsten Stufen, beide Zustände — Zustandstext nie gekürzt.
for (const sprache of ['ru', 'tr']) {
  for (const breite of [1340, 1500]) {
    for (const [zName, z] of Object.entries(ZUSTAENDE)) {
      folgen[`staffel-${sprache}-${breite}-${zName}`] = folge({
        zustandWert: z.zustandWert,
        breite,
        sprache,
        ausschnitt: KOPF,
        schritte: [{ label: `Staffelung ${breite} px, ${sprache}, ${zName === 'aktiv' ? 'Lauf aktiv' : 'kein Lauf'}: Zustandstext ganz (notfalls zweizeilig), Projektauswahl ungekürzt, kein Überlauf`, ...warte(z.warteAuf), screenshot: `${sprache}${breite}-${zName}-staffel-kopf.webp` }],
      })
    }
  }
}

// Prüfpass D0 (qa 4): vor dem ersten Poll bzw. ohne je erfolgreichen Poll — Chip verborgen, Hinweis #poll-fehler.
folgen['vor-erstem-poll'] = folge({
  zustandWert: null,
  blockieren: ['**/api/zustand'],
  ausschnitt: KOPF,
  schritte: [{ label: 'GET /api/zustand scheitert (Netzfehler): kein Zustand bekannt → Chip verborgen, kein erfundener Wert', ...warte('#poll-fehler:not([hidden])'), screenshot: 'd1440-vor-erstem-poll-kopf.webp' }],
})

// ─── Klicktabelle ──────────────────────────────────────────────────────────
folgen.klicks = folge({
  zustandWert: ZUSTAND_AKTIV,
  schritte: [
    { label: 'Start #/dashboard, Lauf aktiv: Chip „Workforce arbeitet · …“, Persona „Arbeitet für dich“', ...warte('#kopf-live-chip[data-aktiv="true"]') },
    { label: 'Klick auf den Chip → #/runs/<laufId> (Lauf-Detail des festen Laufs)', klick: '#kopf-live-chip', ...warte('#lauf-detail:not([hidden])'), screenshot: 'k01-chip-zum-lauf.webp' },
    { label: 'Poll meldet: kein Lauf mehr (feste Antwort) → Chip „Gerade läuft nichts“, href #/ausfuehrungen; kein Neuladen', anfragenAntworten: [get('**/api/zustand', ZUSTAND_RUHIG)], ...warte('#kopf-live-chip[data-aktiv="false"]'), screenshot: 'k02-chip-ruhig.webp' },
    { label: 'Klick auf den Chip → #/ausfuehrungen (Register „Ausführungen“ aktiv)', klick: '#kopf-live-chip', ...warte('#runs-register [data-register="ausfuehrungen"][aria-current="page"]'), screenshot: 'k03-chip-zu-ausfuehrungen.webp' },
    { label: 'Tastatur: Fokus auf den Chip, Enter → Ziel bleibt #/ausfuehrungen (Link, kein Knopf)', fokus: '#kopf-live-chip', taste: 'Enter', screenshot: 'k04-chip-fokus.webp' },
    { label: 'Fokus bleibt auf dem Chip, Poll meldet wieder einen Lauf: Inhalt, Ziel und title wechseln, der Fokus bleibt (Spalte „Fokus“)', anfragenAntworten: [get('**/api/zustand', ZUSTAND_AKTIV)], ...warte('#kopf-live-chip[data-aktiv="true"]'), screenshot: 'k05-fokus-bleibt.webp' },
  ],
})

// ─── Escape-Fall ───────────────────────────────────────────────────────────
folgen['escape-titel'] = folge({
  zustandWert: ZUSTAND_HTML,
  breite: 1600,
  ausschnitt: KOPF,
  schritte: [{ label: 'Auftragstitel mit HTML (<img onerror>, <b>) erscheint als Text im Chip und im title; kein <img> im Chip', ...warte('#kopf-live-chip[data-aktiv="true"]'), screenshot: 'd1600-escape-kopf.webp' }],
})

// ─── Musterfeld der Ebenen-Farben (nur im Nachweis) ────────────────────────
const EBENEN = ['meilenstein', 'feature', 'workstream', 'fixpaket', 'design', 'bug']

/**
 * Kodiert ein PNG im Browser als WebP (wie scripts/render-nachweis.mjs, keine Bildbibliothek).
 * @param browser - Playwright-Browser
 * @param png - PNG-Buffer
 * @returns WebP-Buffer
 */
async function alsWebp(browser, png) {
  const hilfsseite = await browser.newPage()
  try {
    const daten = await hilfsseite.evaluate(async (base64) => {
      const bild = await new Promise((ok, fehl) => {
        const i = new Image()
        i.onload = () => ok(i)
        i.onerror = fehl
        i.src = `data:image/png;base64,${base64}`
      })
      const leinwand = document.createElement('canvas')
      leinwand.width = bild.naturalWidth
      leinwand.height = bild.naturalHeight
      leinwand.getContext('2d').drawImage(bild, 0, 0)
      return leinwand.toDataURL('image/webp', 0.8)
    }, png.toString('base64'))
    if (!daten.startsWith('data:image/webp')) throw new Error('Browser liefert kein WebP')
    return Buffer.from(daten.split(',')[1], 'base64')
  } finally {
    await hilfsseite.close()
  }
}

/**
 * Musterfeld je Theme: setzt im Testbrowser ein Element mit den sechs Ebenen (voll, blass, Umriss)
 * auf --panel ein, fotografiert es und schreibt die aufgelösten Farbwerte ins Protokoll.
 * @param verzeichnis - Ausgabeordner
 */
async function erzeugeMusterfeld(verzeichnis) {
  const browser = await chromium.launch()
  const zeilen = ['# Musterfeld Ebenen-Farben (F46 D0)', '', 'Nur im Nachweis eingesetztes Element; aufgelöste Werte per getComputedStyle.', '', '| Theme | Ebene | voll | blass |', '|---|---|---|---|']
  try {
    for (const [theme, datei] of [
      ['dark', 'musterfeld-dunkel.webp'],
      ['light', 'musterfeld-hell.webp'],
    ]) {
      const kontext = await browser.newContext({ viewport: { width: 900, height: 620 } })
      await kontext.addInitScript((wert) => localStorage.setItem('leitstand-theme', wert), theme)
      const page = await kontext.newPage()
      await page.route('**/api/zustand', (route) => route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify(ZUSTAND_RUHIG) }))
      await page.goto(`${basis}/#/einstellungen`)
      await page.waitForSelector('#kopf-live-chip:not([hidden])', { state: 'attached', timeout: 8000 })
      const werte = await page.evaluate((ebenen) => {
        const feld = document.createElement('section')
        feld.id = 'nachweis-musterfeld'
        feld.style.cssText = 'position:fixed;inset:20px;z-index:9999;background:var(--panel);color:var(--ink);padding:22px 26px;border:1px solid var(--line);border-radius:12px;font:13px var(--sans)'
        const kopf = '<tr><th style="text-align:left;padding:6px 10px">Ebene</th><th style="padding:6px 10px">voll</th><th style="padding:6px 10px">blass („Ist“)</th><th style="padding:6px 10px">Umriss („geplant“)</th><th style="padding:6px 10px">Balken Ist + geplant</th></tr>'
        const zeile = (e) =>
          `<tr><td style="padding:8px 10px">--ebene-${e}</td>` +
          `<td style="padding:8px 10px"><span style="display:block;width:90px;height:26px;border-radius:6px;background:var(--ebene-${e})"></span></td>` +
          `<td style="padding:8px 10px"><span style="display:block;width:90px;height:26px;border-radius:6px;background:var(--ebene-${e}-blass)"></span></td>` +
          `<td style="padding:8px 10px"><span style="display:block;width:86px;height:22px;border-radius:6px;border:2px solid var(--ebene-${e})"></span></td>` +
          `<td style="padding:8px 10px"><span style="display:flex;width:200px;height:12px"><span style="width:60%;background:var(--ebene-${e}-blass);border-left:3px solid var(--ebene-${e});border-radius:4px 0 0 4px"></span><span style="flex:1;border:1.5px solid var(--ebene-${e});border-left:0;border-radius:0 4px 4px 0"></span></span></td></tr>`
        feld.innerHTML = `<h2 style="margin:0 0 12px;font-family:var(--serif);font-weight:400">Ebenen-Farben · ${document.documentElement.dataset.theme ?? 'dark'}</h2><table style="border-collapse:collapse">${kopf}${ebenen.map(zeile).join('')}</table>`
        document.body.append(feld)
        const stil = getComputedStyle(document.documentElement)
        return ebenen.map((e) => ({ e, voll: stil.getPropertyValue(`--ebene-${e}`).trim(), blass: getComputedStyle(feld.querySelectorAll('tr')[ebenen.indexOf(e) + 1].children[2].firstElementChild).backgroundColor }))
      }, EBENEN)
      const png = await page.locator('#nachweis-musterfeld').screenshot()
      writeFileSync(join(verzeichnis, datei), await alsWebp(browser, png))
      for (const { e, voll, blass } of werte) zeilen.push(`| ${theme} | ${e} | \`${voll}\` | \`${blass}\` |`)
      await kontext.close()
      console.log(`  ✓ ${datei}`)
    }
  } finally {
    await browser.close()
  }
  writeFileSync(join(verzeichnis, 'protokoll.md'), `${zeilen.join('\n')}\n`)
}

const alle = { ...folgen, 'musterfeld-ebenen': null }
if (nur && !(nur in alle)) throw new Error(`Unbekannte Folge: ${nur}`)
const auszufuehren = nur ? { [nur]: alle[nur] } : alle

for (const [ordner, klickfolge] of Object.entries(auszufuehren)) {
  const verzeichnis = join(ziel, ordner)
  rmSync(verzeichnis, { recursive: true, force: true })
  mkdirSync(verzeichnis, { recursive: true })
  console.log(`\n── ${ordner} ──`)
  if (klickfolge === null) {
    await erzeugeMusterfeld(verzeichnis)
    continue
  }
  const datei = join(verzeichnis, 'klickfolge.json')
  writeFileSync(datei, `${JSON.stringify(klickfolge, null, 2)}\n`)
  execFileSync(process.execPath, [join(wurzel, 'scripts/render-nachweis.mjs'), datei, verzeichnis], { stdio: 'inherit', cwd: wurzel })
}
