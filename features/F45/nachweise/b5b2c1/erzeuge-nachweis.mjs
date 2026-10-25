#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/b5b2c1/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 B5b-2c-1 „Entwicklung: Zuordnung, Kanban · Priorität, Bug-Felder“ (features/F45/plan-b5b2c1-v2.md §4) —
 * Screenshots von #/workboard gegen einen Leitstand auf einer WEGWERF-KOPIE dieses Repos: Kanban · Priorität (de dunkel/hell bei
 * 1440 px und 390 px, tr/ru bei 390 px, ru bei 1440 px, 200 %), Filter „Pflege & Fixes“, Roadmap scheitert bzw. fehlt (im Browser
 * beantwortet), Rückweg vom Detail, Bug-Detail mit Bug-Feldern (F-1186) und ohne (F-1010), Feature-Detail
 * mit Priorität aus der Akte (F45, in der Kopie präpariert). Bilder als WebP über die Canvas des Playwright-Chromium, übrige Messwerte
 * in protokoll.json. Rein lesend: das Skript klickt keinen schreibenden Knopf.
 *
 * Sicherheit (Kopie-Code übernommen aus features/F45/nachweise/b5b2b2/erzeuge-nachweis.mjs) — das Skript hat KEINE Standard-URL und
 * schreibt nie gegen einen fremden Leitstand oder den Arbeitsbaum:
 * 1. Es legt selbst `git clone --local --no-hardlinks` unter os.tmpdir() an, kopiert die geänderten und neuen Dateien des
 *    Arbeitsbaums hinein (ohne kontrollzustand/), präpariert die Akten (`Priorität: P1` in F45, `Priorität: P2` in F30 — heute trägt
 *    keine Akte eine Priorität) und committet diesen Stand in der Kopie als Basis. Keine node_modules.
 * 2. Vor dem Start und vor dem Löschen: die Kopie liegt im Temp-Verzeichnis und enthält keine Verknüpfung; vor jedem git-Schreibbefehl
 *    in der Kopie ist `git rev-parse --show-toplevel` die Kopie.
 * 3. Es startet den Leitstand der Kopie selbst (cwd = Kopie, freier Port, Register/Fähigkeiten/Plugin-Kopien/TEMP auf Temp-Pfade).
 * 4. Am Ende (auch wenn der Start scheitert): Prozess stoppen und auf sein Ende warten, `.leitstand.lock` nur danach entfernen,
 *    Kopie löschen — läuft der Prozess noch, bleibt alles stehen und das Skript meldet den Pfad.
 *
 * Wird aufgerufen von: Hand — `node features/F45/nachweise/b5b2c1/erzeuge-nachweis.mjs` (aus dem Repo). Nicht Teil von `npm run check`.
 */

import { execFileSync, spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { chromium } from 'playwright'
import { WOERTERBUECHER } from '../../../../public/leitstand/i18n.js'

const REPO = resolve(import.meta.dirname, '..', '..', '..', '..')
const ZIEL = import.meta.dirname
const LAGEN = [
  { name: 'de-1440-dunkel', breite: 1440, hoehe: 1100, theme: 'dark', voll: true },
  { name: 'de-1440-hell', breite: 1440, hoehe: 1100, theme: 'light', voll: true },
  { name: 'de-390-dunkel', breite: 390, hoehe: 1500, theme: 'dark', voll: true },
  { name: 'de-390-hell', breite: 390, hoehe: 1500, theme: 'light', voll: true },
  { name: 'tr-390-dunkel', breite: 390, hoehe: 1500, theme: 'dark', sprache: 'tr' },
  { name: 'ru-390-hell', breite: 390, hoehe: 1500, theme: 'light', sprache: 'ru' },
  // Prüfpass qa 1: lange Filterzeile in ru bei 1440 px; dg 1: 200 % (1440 Gerätepixel bei Faktor 2 = 720 CSS-Pixel) mit reduzierter Bewegung.
  { name: 'ru-1440-hell', breite: 1440, hoehe: 1100, theme: 'light', sprache: 'ru' },
  { name: 'de-720-200prozent', breite: 720, hoehe: 1100, theme: 'dark', faktor: 2, reduziert: true },
]

/** Antwortet GET …/roadmap im Browser (page.route) — nur für die Lagen „Roadmap scheitert“ und „keine Roadmap“, nichts wird geschrieben. */
const ROADMAP_ROUTE = /\/roadmap(\?.*)?$/
/** WebP-Güte (0–1) der Umwandlung im Browser. */
const WEBP_GUETE = 0.8
/** Präparation: Akte → Zeile „Priorität:“ vor „## Ziel“. */
const PRIORITAETEN = { F45: 'P1', F30: 'P2' }

// ─── Wegwerf-Kopie (aus nachweise/b5b2b2) ─────────────────────────────────────

/**
 * Bricht ab, wenn der Pfad nicht unter os.tmpdir() liegt oder irgendwo eine Verknüpfung enthält.
 * @param pfad - Wurzel der Kopie
 */
function pruefeKopie(pfad) {
  const temp = realpathSync(tmpdir())
  const echt = realpathSync(pfad)
  if (!echt.startsWith(temp + sep) || echt === temp) throw new Error(`Kopie ${echt} liegt nicht im Temp-Verzeichnis ${temp} — Abbruch`)
  const stapel = [echt]
  while (stapel.length > 0) {
    const ordner = stapel.pop()
    for (const name of readdirSync(ordner)) {
      const kind = join(ordner, name)
      const info = lstatSync(kind)
      if (info.isSymbolicLink()) throw new Error(`Verknüpfung in der Kopie: ${kind} — Abbruch, nichts gelöscht`)
      if (info.isDirectory()) stapel.push(kind)
    }
  }
}

/**
 * git in einem Ordner, Ausgabe als Text.
 * @param cwd - Ordner
 * @param args - Argumente
 * @returns Text
 */
const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8' })

/**
 * Bricht ab, wenn git im Ordner nicht genau dieses Repo als Wurzel sieht.
 * @param kopie - Repo-Kopie
 */
function pruefeGitWurzel(kopie) {
  const wurzel = realpathSync(git(kopie, ['rev-parse', '--show-toplevel']).trim())
  if (wurzel !== realpathSync(kopie)) throw new Error(`git-Wurzel ${wurzel} ist nicht die Kopie ${kopie} — Abbruch`)
}

/**
 * Setzt „Priorität: Pn“ vor „## Ziel“ einer Akte der Kopie (Zeilenende der Akte bleibt).
 * @param kopie - Repo-Kopie
 * @param id - Feature-ID
 * @param prioritaet - P0..P3
 */
function setzePrioritaet(kopie, id, prioritaet) {
  const pfad = join(kopie, 'features', id, 'feature.md')
  const text = readFileSync(pfad, 'utf8')
  const nl = text.includes('\r\n') ? '\r\n' : '\n'
  if (/^Priorität:/m.test(text)) throw new Error(`${id} trägt schon eine Priorität — Präparation unklar`)
  const neu = text.replace(new RegExp(`${nl}## Ziel${nl}`), `${nl}Priorität: ${prioritaet}${nl}${nl}## Ziel${nl}`)
  if (neu === text) throw new Error(`${id}: „## Ziel“ nicht gefunden`)
  writeFileSync(pfad, neu)
}

/**
 * Legt die Kopie an: git clone, geänderte und neue Dateien des Arbeitsbaums (ohne kontrollzustand/), Präparation, Basis-Commit.
 * @returns { basis, kopie, kopiert, uebersprungen }
 */
function legeKopieAn() {
  const basis = join(tmpdir(), `aiw-b5b2c1-${randomBytes(4).toString('hex')}`)
  const kopie = join(basis, 'repo')
  mkdirSync(basis)
  execFileSync('git', ['clone', '--local', '--no-hardlinks', '--quiet', REPO, kopie], { stdio: 'inherit' })
  const liste = (args) => git(REPO, [...args, '-z']).split('\0').filter((z) => z !== '' && !z.startsWith('kontrollzustand/'))
  const dateien = [...new Set([...liste(['diff', '--name-only', 'HEAD']), ...liste(['ls-files', '--others', '--exclude-standard'])])]
  const uebersprungen = []
  for (const datei of dateien) {
    const quelle = join(REPO, datei)
    if (!existsSync(quelle)) {
      if (existsSync(join(kopie, datei))) rmSync(join(kopie, datei))
      uebersprungen.push(`${datei} (gelöscht)`)
      continue
    }
    if (!statSync(quelle).isFile()) {
      uebersprungen.push(`${datei} (keine Datei)`)
      continue
    }
    mkdirSync(dirname(join(kopie, datei)), { recursive: true })
    copyFileSync(quelle, join(kopie, datei))
  }
  for (const [id, prioritaet] of Object.entries(PRIORITAETEN)) setzePrioritaet(kopie, id, prioritaet)
  pruefeGitWurzel(kopie)
  git(kopie, ['add', '-A'])
  git(kopie, ['-c', 'user.name=Nachweis', '-c', 'user.email=nachweis@localhost', 'commit', '-q', '-m', 'Basis Render-Nachweis B5b-2c-1 (Wegwerf-Kopie, Prioritäten präpariert)'])
  for (const ordner of ['tmp', 'home']) mkdirSync(join(basis, ordner))
  pruefeKopie(basis)
  return { basis, kopie, kopiert: dateien.length - uebersprungen.length, uebersprungen }
}

/** Ein freier Port auf 127.0.0.1. @returns Promise<number> */
function freierPort() {
  return new Promise((erledigt, fehlschlag) => {
    const s = createServer()
    s.once('error', fehlschlag)
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address()
      s.close(() => erledigt(port))
    })
  })
}

/**
 * Startet den Leitstand der Kopie; der Aufrufer erhält den Prozess sofort und wartet mit bereit() auf GET /api/roadmap.
 * @param basis - Temp-Wurzel
 * @param kopie - Repo-Kopie
 * @returns Promise<{ prozess, port, beendet, log, bereit: () => Promise<void> }>
 */
async function starteLeitstand(basis, kopie) {
  const port = await freierPort()
  const env = {
    ...process.env,
    LEITSTAND_PORT: String(port),
    LEITSTAND_PROJEKTE_PFAD: join(kopie, 'projekte.json'),
    LEITSTAND_PROJEKTE_LOKAL_PFAD: join(basis, 'home', 'projekte.lokal.json'),
    LEITSTAND_FAEHIGKEITEN_LOKAL_PFAD: join(basis, 'home', 'faehigkeiten.lokal.json'),
    LEITSTAND_PLUGIN_KOPIEN_WURZEL: join(basis, 'home', 'plugin-kopien'),
    TEMP: join(basis, 'tmp'),
    TMP: join(basis, 'tmp'),
  }
  const prozess = spawn(process.execPath, ['scripts/leitstand-server.mjs'], { cwd: kopie, env, stdio: ['ignore', 'pipe', 'pipe'] })
  const log = []
  prozess.stdout.on('data', (d) => log.push(String(d)))
  prozess.stderr.on('data', (d) => log.push(String(d)))
  const beendet = new Promise((erledigt) => prozess.once('exit', () => erledigt()))
  const bereit = async () => {
    for (let i = 0; i < 100; i++) {
      if (prozess.exitCode !== null) throw new Error(`Leitstand der Kopie beendet: ${log.join('').slice(-800)}`)
      try {
        const antwort = await fetch(`http://127.0.0.1:${port}/api/roadmap`)
        if (antwort.ok) return
      } catch {
        // noch nicht bereit
      }
      await new Promise((r) => setTimeout(r, 300))
    }
    throw new Error(`Leitstand der Kopie antwortet nicht: ${log.join('').slice(-800)}`)
  }
  return { prozess, port, beendet, log, bereit }
}

/**
 * Stoppt den Prozess, wartet auf sein Ende, entfernt den Lock nur danach und löscht die Kopie (nach erneuter Prüfung).
 * @param basis - Temp-Wurzel
 * @param kopie - Repo-Kopie
 * @param lauf - { prozess, beendet } oder null
 */
async function raeumeAuf(basis, kopie, lauf) {
  if (lauf !== null) {
    if (lauf.prozess.exitCode === null) lauf.prozess.kill()
    await Promise.race([lauf.beendet, new Promise((r) => setTimeout(r, 10000))])
    if (lauf.prozess.exitCode === null && lauf.prozess.signalCode === null) throw new Error(`Leitstand der Kopie (PID ${lauf.prozess.pid}) läuft noch — Lock und Kopie bleiben: ${basis}`)
  }
  pruefeKopie(basis)
  const lock = join(kopie, 'kontrollzustand', '.leitstand.lock')
  if (existsSync(lock)) rmSync(lock)
  rmSync(basis, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 })
}

// ─── Aufnahme ─────────────────────────────────────────────────────────────────

/**
 * Wartet, bis das Prioritäts-Kanban fertig geladen ist (F-1201): Spalten da, kein „Lädt…“ und kein „Prioritäten … laden“.
 * @param seite - Playwright-Seite
 * @param w - Wörterbuch der Lagensprache
 */
async function warteKanban(seite, w) {
  await seite.waitForSelector('#workboard-board .prioritaets-board')
  await seite.waitForFunction(
    ([a, b]) => {
      const board = document.querySelector('#workboard-board')
      return board !== null && !board.textContent.includes(a) && !board.textContent.includes(b)
    },
    [w['entwicklung.laedt'], w['entwicklung.kanban.prioritaetenLaedt']]
  )
  await seite.waitForTimeout(150)
}

/**
 * Wartet, bis das Detail eines Eintrags fertig ist (Titel gesetzt, kein „Lädt…“ in Inhalt und rechter Spalte).
 * @param seite - Playwright-Seite
 * @param id - Eintrag
 * @param w - Wörterbuch der Lagensprache
 */
async function warteDetail(seite, id, w) {
  await seite.waitForFunction(
    ([eintrag, laedt]) => {
      const detail = document.querySelector('#workboard-detail')
      const spalte = document.querySelector('#workboard-detail-spalte')
      const inhalt = document.querySelector('#workboard-detail-inhalt')
      return detail !== null && !detail.hidden && document.querySelector('#workboard-detail-eyebrow')?.textContent.includes(eintrag) && spalte !== null && !spalte.textContent.includes(laedt) && inhalt !== null && inhalt.textContent.trim() !== '' && !inhalt.textContent.includes(laedt)
    },
    [id, w['entwicklung.laedt']]
  )
  await seite.waitForTimeout(150)
}

/**
 * Messwerte des Kanbans für die Klicktabelle.
 * @param seite - Playwright-Seite
 * @returns Messwerte
 */
async function messeKanban(seite) {
  return seite.evaluate(() => {
    const spalten = {}
    for (const s of document.querySelectorAll('#workboard-board .prioritaets-board .board-column')) {
      spalten[s.querySelector('h2')?.textContent.trim() ?? '?'] = { zahl: s.querySelector('.board-column-title > span')?.textContent.trim(), karten: s.querySelectorAll('.board-item').length, p4: s.querySelector('.board-kanban-p4')?.textContent.trim() ?? null, weitere: s.querySelector('[data-kanban-voll]')?.textContent.trim() ?? null }
    }
    return {
      ueberlaufSeite: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      modus: document.querySelector('#workboard-modi [aria-pressed="true"]')?.textContent.trim() ?? null,
      zeitleiste: document.querySelector('#workboard-modi [aria-disabled="true"]')?.textContent.replace(/\s+/g, ' ').trim() ?? null,
      filter: [...document.querySelectorAll('#workboard-ansicht [aria-pressed="true"]')].map((c) => c.textContent.trim()),
      pflegeGesperrt: document.querySelector('[data-kanban-pflege="an"]')?.getAttribute('aria-disabled') === 'true',
      pflegeGrund: document.querySelector('#workboard-kanban-pflege-grund')?.textContent.trim() ?? null,
      hinweise: [...document.querySelectorAll('#workboard-board .board-kanban-hinweis, #workboard-board .note')].map((h) => h.textContent.replace(/\s+/g, ' ').trim().slice(0, 200)),
      spalten,
      fokus: document.activeElement?.outerHTML.slice(0, 120) ?? null,
    }
  })
}

/**
 * Messwerte eines Details.
 * @param seite - Playwright-Seite
 * @returns Messwerte
 */
async function messeDetail(seite) {
  return seite.evaluate(() => {
    const text = (sel) => document.querySelector(sel)?.textContent.replace(/\s+/g, ' ').trim().slice(0, 300) ?? null
    const dd = (titel) => [...document.querySelectorAll('#workboard-detail-spalte dt')].find((dt) => dt.textContent.trim() === titel)?.nextElementSibling?.textContent.trim() ?? null
    return {
      ueberlaufSeite: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      titel: text('#workboard-detail-titel'),
      fehlerbild: text('.eintrag-fehlerbild'),
      fehlt: document.querySelectorAll('#workboard-detail-inhalt .eintrag-bugfeld-fehlt').length,
      bugfelder: document.querySelectorAll('#workboard-detail-inhalt .eintrag-bugfeld').length,
      prioritaet: dd('Priorität'),
      meilenstein: dd('Meilenstein'),
    }
  })
}

let kopieStand
try {
  kopieStand = legeKopieAn()
} catch (fehler) {
  console.error(`Wegwerf-Kopie nicht angelegt — Reste ggf. unter ${tmpdir()} (aiw-b5b2c1-*) von Hand prüfen:`, fehler)
  process.exit(1)
}
console.log(`Kopie ${kopieStand.kopie} (${kopieStand.kopiert} Dateien aus dem Arbeitsbaum übernommen)`)
let lauf = null
const protokoll = [
  { hinweis: 'Wegwerf-Kopie unter os.tmpdir() mit Basis-Commit (Arbeitsbaum + Präparation: „Priorität: P1“ in F45, „Priorität: P2“ in F30), eigener Leitstand-Prozess, rein lesend (kein schreibender Klick).', uebersprungen: kopieStand.uebersprungen },
]
try {
  lauf = await starteLeitstand(kopieStand.basis, kopieStand.kopie)
  await lauf.bereit()
  const BASIS = `http://127.0.0.1:${lauf.port}`
  console.log(`Leitstand der Kopie auf ${BASIS}`)
  const browser = await chromium.launch()
  const wandler = await browser.newPage()
  /**
   * Schreibt einen PNG-Screenshot als WebP.
   * @param png - PNG-Bytes
   * @param datei - Dateiname ohne Endung
   */
  const alsWebp = async (png, datei) => {
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

  for (const lage of LAGEN) {
    pruefeKopie(kopieStand.basis)
    const sprache = lage.sprache ?? 'de'
    const w = WOERTERBUECHER[sprache]
    const kontext = await browser.newContext({ viewport: { width: lage.breite, height: lage.hoehe }, deviceScaleFactor: lage.faktor ?? 1, reducedMotion: lage.reduziert ? 'reduce' : 'no-preference' })
    await kontext.addInitScript(
      ([theme, s]) => {
        localStorage.setItem('leitstand-theme', theme)
        localStorage.setItem('leitstand-sprache', s)
        localStorage.setItem('leitstand-chat-offen', 'false')
      },
      [lage.theme, sprache]
    )
    const seite = await kontext.newPage()
    const fehler = []
    seite.on('pageerror', (f) => fehler.push(String(f)))
    /**
     * Bild (Bereich bei 1440 px, sichtbarer Ausschnitt bei 390 px) und Protokollzeile.
     * @param name - Schritt
     * @param bereich - CSS-Selektor für 1440 px, oder null (kein Bild)
     * @param messung - Messfunktion
     */
    const schritt = async (name, bereich, messung) => {
      if (bereich !== null) {
        const png = lage.breite > 600 ? await seite.locator(bereich).screenshot() : await seite.screenshot()
        await alsWebp(png, `${lage.name}-${name}`)
      }
      protokoll.push({ lage: lage.name, schritt: name, bild: bereich === null ? null : `${lage.name}-${name}.webp`, ...(await messung(seite)) })
    }
    await seite.goto(`${BASIS}/#/workboard`)
    await seite.waitForSelector('#workboard-board .pm-board')
    await seite.click('[data-board-modus="prioritaet"]')
    await warteKanban(seite, w)
    await seite.locator('#workboard-modi').scrollIntoViewIfNeeded()
    await schritt('01-kanban', '#workboard-board-bereich', messeKanban)
    if (!lage.voll) {
      if (fehler.length > 0) protokoll.push({ lage: lage.name, schritt: 'Seitenfehler', fehler })
      await kontext.close()
      continue
    }
    // Filter „Pflege & Fixes“ (nur offene P0–P2 ohne Feature-/Meilenstein-Bezug; P3 und „ohne“ leer mit Satz).
    await seite.click('[data-kanban-pflege="an"]')
    await seite.locator('#workboard-modi').scrollIntoViewIfNeeded()
    await schritt('02-pflege', '#workboard-board-bereich', messeKanban)
    await seite.click('[data-kanban-pflege="aus"]')
    // „Alle n hier zeigen“ in P2 (nur Messung), Typfilter „Feature“ (Features mit Priorität aus der Akte).
    await seite.click('[data-kanban-voll="P2"]')
    await schritt('03-p2-aufgeklappt', null, messeKanban)
    await seite.click('[data-kanban-voll="P2"]')
    await seite.click('[data-kanban-typ="FEATURE"]')
    await seite.locator('#workboard-modi').scrollIntoViewIfNeeded()
    await schritt('04-nur-features', '#workboard-board-bereich', messeKanban)
    await seite.click('[data-kanban-typ=""]')

    if (lage.name === 'de-1440-dunkel' || lage.name === 'de-390-dunkel') {
      // Roadmap scheitert (500, im Browser beantwortet): Hinweis „nicht ladbar“, „Pflege & Fixes“ gesperrt mit Grund, Features unter „ohne“.
      await seite.route(ROADMAP_ROUTE, (route) => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ grund: 'Nachweis: Roadmap nicht lesbar' }) }))
      await seite.click('#workboard-neu-laden')
      await warteKanban(seite, w)
      await seite.focus('[data-kanban-pflege="an"]')
      await seite.locator('#workboard-modi').scrollIntoViewIfNeeded()
      await schritt('04b-roadmap-fehler', '#workboard-board-bereich', messeKanban)
      await seite.unroute(ROADMAP_ROUTE)
      // Keine roadmap.json (Fachergebnis nicht_vorhanden): neutraler Satz, kein Warnkasten (Prüfpass cr 1, qa 2).
      await seite.route(ROADMAP_ROUTE, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'nicht_vorhanden' }) }))
      await seite.click('#workboard-neu-laden')
      await warteKanban(seite, w)
      await seite.locator('#workboard-modi').scrollIntoViewIfNeeded()
      await schritt('04c-keine-roadmap', '#workboard-board-bereich', messeKanban)
      await seite.unroute(ROADMAP_ROUTE)
      await seite.click('#workboard-neu-laden')
      await warteKanban(seite, w)
    }

    // Rückweg: Karte im Prioritäts-Kanban öffnen, „← Kanban-Board“ — der Modus bleibt (qa 1).
    await seite.click('#workboard-board .prioritaets-board .board-item')
    await seite.waitForSelector('#workboard-detail:not([hidden])')
    await seite.click('#workboard-detail-schliessen')
    await warteKanban(seite, w)
    await schritt('04d-rueckweg', null, messeKanban)

    // Details: Bug mit Bug-Feldern (F-1186), Bug ohne (F-1010), Feature mit Priorität (F45).
    for (const [name, id, bereich] of [
      ['05-bug-mit-feldern', 'F-1186', '#workboard-detail'],
      ['06-bug-ohne-felder', 'F-1010', '#workboard-detail'],
      ['07-feature-prioritaet', 'F45', '#workboard-detail-spalte'],
    ]) {
      await seite.goto(`${BASIS}/#/workboard/${id}`)
      await warteDetail(seite, id, w)
      if (lage.breite <= 600) await seite.locator(bereich === '#workboard-detail' ? '#workboard-detail-inhalt' : bereich).scrollIntoViewIfNeeded()
      await schritt(name, bereich, messeDetail)
    }
    if (fehler.length > 0) protokoll.push({ lage: lage.name, schritt: 'Seitenfehler', fehler })
    await kontext.close()
  }
  await browser.close()
} finally {
  writeFileSync(join(ZIEL, 'protokoll.json'), `${JSON.stringify(protokoll, null, 2)}\n`)
  await raeumeAuf(kopieStand.basis, kopieStand.kopie, lauf)
  console.log(`Kopie gelöscht: ${!existsSync(kopieStand.basis)} · ${protokoll.length} Protokolleinträge unter ${ZIEL}`)
}
