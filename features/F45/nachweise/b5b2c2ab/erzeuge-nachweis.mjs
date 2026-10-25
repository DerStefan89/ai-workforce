#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/b5b2c2ab/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 B5b-2c-2-AB „Roadmap: Pflege & Fixes im Gantt, Restpunkte“ (features/F45/plan-b5b2c2-v2.md) —
 * Screenshots von #/roadmap und #/workboard gegen einen Leitstand auf einer WEGWERF-KOPIE dieses Repos: Gantt mit Zeile „Pflege &
 * Fixes“ zu und auf (bis zu 20 Befunde, „+ n weitere“), Detail der Pflege-Zeile und eines Befunds, Zähler „offene Befunde (P0–P2)“
 * an Feature und Meilenstein (Kurzinfo und Detail), Trennzeile mit Befunden und eingeblendet, Link „In der Entwicklung ansehen“ →
 * Kanban · Priorität mit vorgemerktem Filter, Bereinigungsliste mit Standard-Vorauswahl und nachrangigem „Meilenstein → LAEUFT“,
 * Befund-Detail „Zugeordnet zu“ (Feature und ohne Bezug). de dunkel/hell bei 1440 px und 390 px, tr/ru für lange Texte. Bilder als
 * WebP über die Canvas des Playwright-Chromium, übrige Messwerte in protokoll.json. Rein lesend: das Skript klickt keinen
 * schreibenden Knopf (nur Auswahl, Aufklappen, Navigation).
 *
 * Warten: jeder Schritt wartet mit scripts/nachweis-laden.mjs, bis der Bereich keinen Ladeplatzhalter der Lagensprache mehr zeigt
 * (F-1201, Advisor `advisor-b5b2c2.md` B9) — mit Zeitgrenze, die den restlichen Platzhalter nennt.
 *
 * Sicherheit (Kopie-Code übernommen aus features/F45/nachweise/b5b2c1/erzeuge-nachweis.mjs) — das Skript hat KEINE Standard-URL und
 * schreibt nie gegen einen fremden Leitstand oder den Arbeitsbaum:
 * 1. Es legt selbst `git clone --local --no-hardlinks` unter os.tmpdir() an, kopiert die geänderten und neuen Dateien des
 *    Arbeitsbaums hinein (ohne kontrollzustand/), präpariert eine R1-Abweichung für die Bereinigungsliste (F20 zurück auf
 *    FEATURE_GATE in Akte und STATUS.md, Ausnahme M4/F20 in roadmap-ausnahmen.json — die echte Liste ist seit #383 leer) und committet
 *    diesen Stand in der Kopie als Basis; dazu F-013 als BUG (rotes Quadrat im Bild, Prüfpass qa 3). Keine node_modules.
 * 2. Vor dem Start und vor dem Löschen: die Kopie liegt im Temp-Verzeichnis und enthält keine Verknüpfung; vor jedem git-Schreibbefehl
 *    in der Kopie ist `git rev-parse --show-toplevel` die Kopie.
 * 3. Es startet den Leitstand der Kopie selbst (cwd = Kopie, freier Port, Register/Fähigkeiten/Plugin-Kopien/TEMP auf Temp-Pfade).
 * 4. Am Ende (auch wenn der Start scheitert): Prozess stoppen und auf sein Ende warten, `.leitstand.lock` nur danach entfernen,
 *    Kopie löschen — läuft der Prozess noch, bleibt alles stehen und das Skript meldet den Pfad.
 *
 * Wird aufgerufen von: Hand — `node features/F45/nachweise/b5b2c2ab/erzeuge-nachweis.mjs` (aus dem Repo). Nicht Teil von
 * `npm run check`.
 */

import { execFileSync, spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { chromium } from 'playwright'
import { WOERTERBUECHER } from '../../../../public/leitstand/i18n.js'
import { ladePlatzhalter, warteBisGeladen } from '../../../../scripts/nachweis-laden.mjs'

const REPO = resolve(import.meta.dirname, '..', '..', '..', '..')
const ZIEL = import.meta.dirname
const LAGEN = [
  { name: 'de-1440-dunkel', breite: 1440, hoehe: 1100, theme: 'dark', voll: true },
  { name: 'de-1440-hell', breite: 1440, hoehe: 1100, theme: 'light', voll: true },
  { name: 'de-390-dunkel', breite: 390, hoehe: 1500, theme: 'dark', voll: true },
  { name: 'de-390-hell', breite: 390, hoehe: 1500, theme: 'light', voll: true },
  { name: 'tr-390-dunkel', breite: 390, hoehe: 1500, theme: 'dark', sprache: 'tr' },
  { name: 'ru-1440-hell', breite: 1440, hoehe: 1100, theme: 'light', sprache: 'ru' },
  // Prüfpass qa 2: Zeile „+ n weitere“ bei 390 px auch in ru; dg 4: 200 % (720 CSS-Pixel bei Faktor 2) mit reduzierter Bewegung.
  { name: 'ru-390-hell', breite: 390, hoehe: 1500, theme: 'light', sprache: 'ru' },
  { name: 'de-720-200prozent', breite: 720, hoehe: 1100, theme: 'dark', faktor: 2, reduziert: true },
]

/** WebP-Güte (0–1) der Umwandlung im Browser. */
const WEBP_GUETE = 0.8
/** Zeilenschlüssel (zeilenSchluessel in roadmap-anzeige.js) der Pflege-Zeile, des aktuellen Meilensteins und von F45. */
const PFLEGE = '["p"]'
const MEILENSTEIN = '["m","M5"]'
const FEATURE = '["f","M5","F45"]'

// ─── Wegwerf-Kopie (aus nachweise/b5b2c1) ─────────────────────────────────────

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
 * Ersetzt genau einen Text in einer Datei der Kopie (sonst Abbruch — die Präparation wäre unklar).
 * @param kopie - Repo-Kopie
 * @param datei - Pfad relativ zur Kopie
 * @param alt - gesuchter Text
 * @param neu - Ersatz
 */
function ersetzeEinmal(kopie, datei, alt, neu) {
  const pfad = join(kopie, datei)
  const text = readFileSync(pfad, 'utf8')
  if (text.split(alt).length !== 2) throw new Error(`${datei}: „${alt}“ nicht genau einmal gefunden — Präparation unklar`)
  writeFileSync(pfad, text.replace(alt, neu))
}

/**
 * Präparation der Bereinigungsliste: F20 zurück auf FEATURE_GATE (Akte, STATUS.md) und Ausnahme M4/F20 — eine R1-Abweichung, bei
 * der „F20 → ABGESCHLOSSEN“ und „M4 → LAEUFT“ möglich sind.
 * @param kopie - Repo-Kopie
 */
function praepariereBereinigung(kopie) {
  const akte = readFileSync(join(kopie, 'features', 'F20', 'feature.md'), 'utf8')
  const nl = akte.includes('\r\n') ? '\r\n' : '\n'
  ersetzeEinmal(kopie, 'features/F20/feature.md', `Status: ABGESCHLOSSEN${nl}Abgenommen: 2026-10-25${nl}`, `Status: FEATURE_GATE${nl}`)
  ersetzeEinmal(kopie, 'docs/STATUS.md', 'Akte `features/F20/feature.md`, Status `ABGESCHLOSSEN`', 'Akte `features/F20/feature.md`, Status `FEATURE_GATE`')
  // Einzeilig wie vor #383 — der POST entfernt genau einen einzeiligen Eintrag, die Vorprüfung verlangt diese Form.
  const pfad = join(kopie, 'docs', 'projekt', 'roadmap-ausnahmen.json')
  if (JSON.parse(readFileSync(pfad, 'utf8')).status_ausnahmen.length !== 0) throw new Error('roadmap-ausnahmen.json nicht leer — Präparation unklar')
  const eintrag = '    { "meilenstein": "M4", "feature": "F20", "grund": "Bereinigung offen — Bestätigung Stefan (Bereinigungsliste)" }'
  writeFileSync(pfad, `{\n  "schema": "v0",\n  "status_ausnahmen": [\n${eintrag}\n  ]\n}\n`)
}

/**
 * Präparation (Prüfpass qa 3): F-013 — der erste Befund unter „Pflege & Fixes“ (P1, ohne Bezug) — als Typ BUG, damit das rote Quadrat
 * im Bild steht; die echten ersten 20 enthalten keinen BUG.
 * @param kopie - Repo-Kopie
 */
function praepariereBug(kopie) {
  ersetzeEinmal(kopie, 'state/findings.md', '**F-013** · `PROCESS_IMPROVEMENT` · P1 ·', '**F-013** · `BUG` · P1 ·')
}

/**
 * Legt die Kopie an: git clone, geänderte und neue Dateien des Arbeitsbaums (ohne kontrollzustand/), Präparation, Basis-Commit.
 * @returns { basis, kopie, kopiert, uebersprungen }
 */
function legeKopieAn() {
  const basis = join(tmpdir(), `aiw-b5b2c2ab-${randomBytes(4).toString('hex')}`)
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
  praepariereBereinigung(kopie)
  praepariereBug(kopie)
  pruefeGitWurzel(kopie)
  git(kopie, ['add', '-A'])
  git(kopie, ['-c', 'user.name=Nachweis', '-c', 'user.email=nachweis@localhost', 'commit', '-q', '-m', 'Basis Render-Nachweis B5b-2c-2-AB (Wegwerf-Kopie, F20 präpariert)'])
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
 * Messwerte der Roadmap-Seite für die Klicktabelle.
 * @param seite - Playwright-Seite
 * @returns Messwerte
 */
async function messeRoadmap(seite) {
  return seite.evaluate(
    ([pflege, meilenstein, feature]) => {
      const text = (el) => el?.textContent.replace(/\s+/g, ' ').trim().slice(0, 240) ?? null
      const zeile = (schluessel) => document.querySelector(`[data-roadmap-waehlen='${schluessel}']`)?.closest('.rm-zeile') ?? null
      const dd = (titel) => [...document.querySelectorAll('.rm-detail dt')].find((dt) => dt.textContent.trim() === titel)?.nextElementSibling ?? null
      return {
        ueberlaufSeite: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        legende: [...document.querySelectorAll('.rm-legende .rm-leg[data-farbe]')].map((l) => `${l.getAttribute('data-farbe')}:${l.textContent.trim()}`),
        pflegeZeile: text(zeile(pflege)),
        pflegeOffen: document.querySelector(`[data-roadmap-klappe='${pflege}']`)?.getAttribute('aria-expanded') ?? null,
        befundZeilen: document.querySelectorAll('.rm-zeile[data-farbe="bug"], .rm-zeile[data-farbe="befund"]:not(.rm-weitere)').length,
        befundeRot: document.querySelectorAll('.rm-zeile[data-farbe="bug"]').length,
        weitere: text(document.querySelector('.rm-weitere')),
        meilensteinZeile: text(zeile(meilenstein)),
        featureZeile: text(zeile(feature)),
        trennzeile: text(document.querySelector('.rm-ausgeblendet')),
        detailTitel: text(document.querySelector('#rm-detail-titel')),
        detailChip: text(document.querySelector('.rm-detail-kopf .typ-chip')),
        offeneBefunde: text(dd('Offene Befunde')),
        detailLinks: [...document.querySelectorAll('.rm-detail > a, .rm-detail > button.text-link')].map((a) => text(a)),
        anpassen: document.querySelector('.rm-detail [data-roadmap-anpassen-details]') !== null,
        bereinigung: [...document.querySelectorAll('.rm-bereinigung-option')].map((o) => ({ klasse: o.className, text: text(o), gewaehlt: o.querySelector('input')?.checked ?? null })),
        fokus: document.activeElement?.outerHTML.slice(0, 120) ?? null,
      }
    },
    [PFLEGE, MEILENSTEIN, FEATURE]
  )
}

/**
 * Messwerte des Kanbans nach dem Link „In der Entwicklung ansehen“.
 * @param seite - Playwright-Seite
 * @returns Messwerte
 */
async function messeKanban(seite) {
  return seite.evaluate(() => ({
    ueberlaufSeite: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    hash: location.hash,
    modus: document.querySelector('#workboard-modi [aria-pressed="true"]')?.textContent.trim() ?? null,
    filter: [...document.querySelectorAll('#workboard-ansicht [aria-pressed="true"]')].map((c) => c.textContent.trim()),
    karten: document.querySelectorAll('#workboard-board .board-item').length,
    fokus: document.activeElement?.outerHTML.slice(0, 120) ?? null,
  }))
}

/**
 * Messwerte eines Befund-Details („Zugeordnet zu“).
 * @param seite - Playwright-Seite
 * @returns Messwerte
 */
async function messeDetail(seite) {
  return seite.evaluate(() => {
    const dd = (titel) => [...document.querySelectorAll('#workboard-detail-spalte dt')].find((dt) => dt.textContent.trim() === titel)?.nextElementSibling ?? null
    return {
      ueberlaufSeite: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      titel: document.querySelector('#workboard-detail-titel')?.textContent.trim() ?? null,
      zugeordnet: dd('Zugeordnet zu')?.textContent.replace(/\s+/g, ' ').trim() ?? null,
      zugeordnetLink: dd('Zugeordnet zu')?.querySelector('a')?.getAttribute('href') ?? null,
    }
  })
}

let kopieStand
try {
  kopieStand = legeKopieAn()
} catch (fehler) {
  console.error(`Wegwerf-Kopie nicht angelegt — Reste ggf. unter ${tmpdir()} (aiw-b5b2c2ab-*) von Hand prüfen:`, fehler)
  process.exit(1)
}
console.log(`Kopie ${kopieStand.kopie} (${kopieStand.kopiert} Dateien aus dem Arbeitsbaum übernommen)`)
let lauf = null
const protokoll = [
  { hinweis: 'Wegwerf-Kopie unter os.tmpdir() mit Basis-Commit (Arbeitsbaum + Präparation: F20 FEATURE_GATE in Akte und STATUS.md, Ausnahme M4/F20; F-013 als BUG), eigener Leitstand-Prozess, rein lesend (kein schreibender Klick).', uebersprungen: kopieStand.uebersprungen },
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
    const platzhalter = ladePlatzhalter(WOERTERBUECHER[sprache])
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
    /** Wartet, bis der Bereich fertig geladen ist (gemeinsame Hilfe, Zeitgrenze nennt den Rest). @param selektor - CSS-Selektor */
    const warte = async (selektor) => {
      await warteBisGeladen(seite, platzhalter, selektor)
      await seite.waitForTimeout(150)
    }
    /**
     * Bild (Bereich bei 1440 px, sichtbarer Ausschnitt bei 390 px) und Protokollzeile.
     * @param name - Schritt
     * @param bereich - CSS-Selektor für 1440 px, oder null (kein Bild)
     * @param messung - Messfunktion
     * @param mobilBereich - bei 390 px vorher dorthin scrollen (Standard: bereich)
     */
    const schritt = async (name, bereich, messung, mobilBereich = bereich) => {
      if (bereich !== null) {
        if (lage.breite <= 600 && mobilBereich !== null) await seite.locator(mobilBereich).first().scrollIntoViewIfNeeded()
        const png = lage.breite > 600 ? await seite.locator(bereich).first().screenshot() : await seite.screenshot()
        await alsWebp(png, `${lage.name}-${name}`)
      }
      protokoll.push({ lage: lage.name, schritt: name, bild: bereich === null ? null : `${lage.name}-${name}.webp`, ...(await messung(seite)) })
    }
    /** Klickt eine Gantt-Zeile bzw. Klappe über ihren Schlüssel. @param attribut - data-Attribut @param schluessel - Zeilenschlüssel */
    const klicke = async (attribut, schluessel) => {
      await seite.click(`[${attribut}='${schluessel}']`)
      await warte('#view-roadmap')
    }

    await seite.goto(`${BASIS}/#/roadmap`)
    await seite.waitForSelector(`[data-roadmap-waehlen='${PFLEGE}']`)
    await warte('#view-roadmap')
    // 01: Gantt mit Zeile „Pflege & Fixes“ (zu), Zähler an M5 und F45, Legende mit Bug und Pflege & Fixes.
    await schritt('01-gantt-pflege-zu', '.rm-gesamt', messeRoadmap, '.rm-legende')
    // 02: Pflege-Zeile auf und gewählt — bis zu 20 Befunde, „+ n weitere“, Detail der Spur.
    await klicke('data-roadmap-klappe', PFLEGE)
    await klicke('data-roadmap-waehlen', PFLEGE)
    await schritt('02-pflege-auf', '.rm-gesamt', messeRoadmap, `[data-roadmap-waehlen='${PFLEGE}']`)
    // 02b: Ausschnitt der Zeile „+ n weitere“ mit dem Link (Prüfpass dg 1/qa 2) — bei 390 px der sichtbare Ausschnitt um sie.
    await schritt('02b-weitere', '.rm-weitere', messeRoadmap)
    if (!lage.voll) {
      if (fehler.length > 0) protokoll.push({ lage: lage.name, schritt: 'Seitenfehler', fehler })
      await kontext.close()
      continue
    }
    // 03: ein Befund gewählt (erster unter „Pflege & Fixes“): Typ · Priorität, Teil von, „Befund öffnen →“, kein „Anpassen“.
    const ersterBefund = await seite.getAttribute(`.rm-zeile[data-farbe="bug"] [data-roadmap-waehlen], .rm-zeile[data-farbe="befund"] [data-roadmap-waehlen]`, 'data-roadmap-waehlen')
    await klicke('data-roadmap-waehlen', ersterBefund)
    await schritt('03-befund-detail', '.rm-detail', messeRoadmap)
    const pflegeBefundId = JSON.parse(ersterBefund)[1]
    // 04/05: Zähler an Feature F45 und am aktuellen Meilenstein (Kurzinfo und Detailfeld „Offene Befunde“).
    await klicke('data-roadmap-waehlen', FEATURE)
    await schritt('04-feature-zaehler', '.rm-raster', messeRoadmap, '.rm-detail')
    await klicke('data-roadmap-waehlen', MEILENSTEIN)
    await schritt('05-meilenstein-zaehler', '.rm-detail', messeRoadmap)
    // 06/07: Trennzeile mit „· n offene Befunde“, dann eingeblendet.
    await schritt('06-trennzeile', '.rm-ausgeblendet', messeRoadmap)
    await seite.click('[data-roadmap-abgeschlossene]')
    await warte('#view-roadmap')
    await schritt('07-eingeblendet', '.rm-gantt-rahmen', messeRoadmap, '.rm-ausgeblendet')
    await seite.click('[data-roadmap-abgeschlossene]')
    await warte('#view-roadmap')
    // 08: Bereinigungsliste (präpariert M4/F20): „F20 → ABGESCHLOSSEN“ vorgewählt, „M4 → LAEUFT“ nachrangig, keine Folgen in der Auswahl.
    await schritt('08-bereinigung-standard', '.rm-bereinigung', messeRoadmap)
    // 09: „In der Entwicklung ansehen“ (Zeile „+ n weitere“) → Kanban · Priorität mit vorgemerktem Filter „Pflege & Fixes“.
    await seite.locator('.rm-weitere [data-roadmap-entwicklung]').scrollIntoViewIfNeeded()
    await seite.click('.rm-weitere [data-roadmap-entwicklung]')
    await seite.waitForSelector('#workboard-board .prioritaets-board')
    await seite.waitForSelector('#workboard-ansicht [data-kanban-pflege="an"][aria-pressed="true"]')
    await warte('#workboard-board-bereich')
    await schritt('09-kanban-pflege-vorgemerkt', '#workboard-board-bereich', messeKanban, '#workboard-modi')
    // 10/11: Befund-Detail „Zugeordnet zu“ — an einem Feature (F-1186) und ohne Bezug (Befund aus der Pflege-Zeile).
    for (const [name, id] of [
      ['10-zugeordnet-feature', 'F-1186'],
      ['11-zugeordnet-ohne', pflegeBefundId],
    ]) {
      await seite.goto(`${BASIS}/#/workboard/${id}`)
      await seite.waitForSelector('#workboard-detail:not([hidden]) #workboard-detail-spalte dt')
      await warte('#workboard-detail-spalte')
      await schritt(name, '#workboard-detail-spalte', messeDetail)
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
