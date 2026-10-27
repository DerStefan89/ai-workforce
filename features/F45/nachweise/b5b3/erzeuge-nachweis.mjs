#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/b5b3/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 B5b-3 „Ist nach Abnahme“ (R7; features/F45/plan-b5b3-v2.md) gegen einen Leitstand auf einer
 * WEGWERF-KOPIE dieses Repos (Muster und Kopie-Code aus features/F45/nachweise/b5b2c2ab/erzeuge-nachweis.mjs):
 * 1. Ablauf „zwei“ (feature_ref F45, Akte mit zwei laufenden Zeilen B5b-3 und V1) — Abnahme über die Oberfläche ⇒ Hinweis
 *    „Workstream nicht eindeutig (2 laufende Zeilen)“, Akte unverändert.
 * 2. Ablauf „eins“ (feature_ref F45, V1 wieder geplant, B5b-3 einzige laufende Zeile, Begonnen auf 2026-10-21 präpariert, damit ein
 *    Ist entsteht) — Abnahme ⇒ Erfolg mit Satz zu R7; danach #/code (Projekt: features/F45/feature.md geändert, Diff) und #/roadmap
 *    (Zeile B5b-3 erledigt, Ist im Detail).
 * Kleinpunkt: Befund-Detail mit Pille „Offen“ (hell und dunkel).
 * Beide Abläufe sind Bestand ohne Arbeitsordner (gelaufener Bau, keine Arbeitsordner-Kette) ⇒ Laufort = Projektordner der Kopie;
 * der Arbeitsordner-Fall ist in scripts/leitstand/ist-nach-abnahme.test.mjs mit echtem git belegt.
 * Bilder als WebP, Messwerte in protokoll.json.
 *
 * Sicherheit: keine Standard-URL; Kopie unter os.tmpdir() (git clone --local --no-hardlinks), geänderte und neue Dateien des
 * Arbeitsbaums hinein (ohne kontrollzustand/), Basis-Commit in der Kopie; eigener Leitstand-Prozess der Kopie mit Temp-Pfaden;
 * Aufräumen: Prozess stoppen, Lock entfernen, Kopie löschen. Aufträge und Abläufe werden nur in kontrollzustand/ der Kopie
 * registriert.
 *
 * Wird aufgerufen von: Hand — `node features/F45/nachweise/b5b3/erzeuge-nachweis.mjs` (aus dem Repo). Nicht Teil von
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
import { registriereAuftrag } from '../../../../src/auftrag/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../../../../src/startvorlage/index.ts'
import { registriereWorkflow } from '../../../../src/workflow/index.ts'

const REPO = resolve(import.meta.dirname, '..', '..', '..', '..')
const ZIEL = import.meta.dirname
const WEBP_GUETE = 0.8
const AKTE = 'features/F45/feature.md'
const B5B3 = '["w","M5","F45","B5b-3"]'

/** Bricht ab, wenn der Pfad nicht unter os.tmpdir() liegt oder eine Verknüpfung enthält. @param pfad - Wurzel der Kopie */
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

/** git in einem Ordner. @param cwd - Ordner @param args - Argumente @returns Text */
const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8' })

/** Bricht ab, wenn git im Ordner nicht genau die Kopie als Wurzel sieht. @param kopie - Repo-Kopie */
function pruefeGitWurzel(kopie) {
  const wurzel = realpathSync(git(kopie, ['rev-parse', '--show-toplevel']).trim())
  if (wurzel !== realpathSync(kopie)) throw new Error(`git-Wurzel ${wurzel} ist nicht die Kopie ${kopie} — Abbruch`)
}

/**
 * Ersetzt in einer Workstream-Zeile der Akte (Kopie) eine Zelle; Abbruch, wenn die Zeile fehlt.
 * @param kopie - Repo-Kopie @param id - Workstream-ID @param spalte - Zellindex (1 = ID) @param wert - neuer Inhalt
 */
function setzeZelle(kopie, id, spalte, wert) {
  const pfad = join(kopie, AKTE)
  const zeilen = readFileSync(pfad, 'utf8').split('\n')
  const i = zeilen.findIndex((z) => z.startsWith(`| ${id} |`))
  if (i === -1) throw new Error(`Zeile ${id} fehlt in der Akte — Präparation unklar`)
  const teile = zeilen[i].split('|')
  teile[spalte] = ` ${wert} `
  zeilen[i] = teile.join('|')
  writeFileSync(pfad, zeilen.join('\n'))
}

/** Legt die Kopie an. @returns { basis, kopie, uebersprungen } */
function legeKopieAn() {
  const basis = join(tmpdir(), `aiw-b5b3-${randomBytes(4).toString('hex')}`)
  const kopie = join(basis, 'repo')
  mkdirSync(basis)
  execFileSync('git', ['clone', '--local', '--no-hardlinks', '--quiet', REPO, kopie], { stdio: 'inherit' })
  const liste = (args) => git(REPO, [...args, '-z']).split('\0').filter((z) => z !== '' && !z.startsWith('kontrollzustand/'))
  const dateien = [...new Set([...liste(['diff', '--name-only', 'HEAD']), ...liste(['ls-files', '--others', '--exclude-standard'])])]
  const uebersprungen = []
  for (const datei of dateien) {
    const quelle = join(REPO, datei)
    if (!existsSync(quelle) || !statSync(quelle).isFile()) {
      uebersprungen.push(datei)
      continue
    }
    mkdirSync(dirname(join(kopie, datei)), { recursive: true })
    copyFileSync(quelle, join(kopie, datei))
  }
  // B5b-3 läuft seit 2026-10-21 (sonst Ist „–“ am selben Tag); V1 zusätzlich laufend für den Fall „zwei“.
  setzeZelle(kopie, 'B5b-3', 7, '2026-10-21')
  setzeZelle(kopie, 'V1', 4, 'laeuft')
  pruefeGitWurzel(kopie)
  git(kopie, ['add', '-A'])
  git(kopie, ['-c', 'user.name=Nachweis', '-c', 'user.email=nachweis@localhost', 'commit', '-q', '-m', 'Basis Render-Nachweis B5b-3 (Wegwerf-Kopie)'])
  for (const ordner of ['tmp', 'home']) mkdirSync(join(basis, ordner))
  pruefeKopie(basis)
  return { basis, kopie, uebersprungen }
}

/**
 * Registriert in der Kopie einen Auftrag mit feature_ref F45 und einen abgeschlossenen Ablauf mit gelaufenem Bau (Bestand).
 * @param kopie - Repo-Kopie @param name - Kurzname @returns workflowId
 */
function legeAblaufAn(kopie, name) {
  const ladeOptionen = { basisVerzeichnis: join(kopie, 'kontrollzustand'), schreiber: () => {} }
  const profil = leiteProfilReferenzAb(ladeStartvorlage(join(REPO, 'startvorlagen', 'beispielprojekt.json')))
  const id = `nachweis-b5b3-${name}-${randomBytes(3).toString('hex')}`
  registriereAuftrag(id, profil, `Nachweis B5b-3 (${name})`, 'Render-Nachweis R7.', { ...ladeOptionen, feature_ref: 'F45' })
  const schritt = (schritt_id, rolle, worker, output_schema, nachfolger, lauf_id) => ({ schritt_id, rolle, werkzeugsatz: rolle === 'ausfuehrung' ? 'schreibend' : 'lesend', worker, modell: 'nachweis', eingaben: [], output_schema, freigabe: rolle === 'ausfuehrung' ? 'ZWINGEND' : 'AUTOMATISCH', risiko: 'Nachweis-Fixture.', zeitgrenze_ms: 600000, nachfolger, status: 'ERFOLGREICH', lauf_id })
  registriereWorkflow(
    {
      workflow_schema: 'v0',
      workflow_id: id,
      auftrag_id: id,
      version: 1,
      ziel: `Nachweis B5b-3: Abnahme schreibt den Workstream fort (${name}).`,
      status: 'ABGESCHLOSSEN',
      aktiver_schritt_id: null,
      grenzen: { max_schritte: 6, max_replans: 1 },
      schritte: [schritt('schritt-1-ausfuehrung', 'ausfuehrung', 'claude-code', null, 'schritt-2-review', `bau-${id}`), schritt('schritt-2-review', 'code-reviewer', 'codex', 'ergebnis-code-reviewer', null, `review-${id}`)],
    },
    profil,
    ladeOptionen
  )
  return id
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

/** Startet den Leitstand der Kopie. @param basis - Temp-Wurzel @param kopie - Repo-Kopie @returns Promise<Lauf> */
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
  for (let i = 0; i < 100; i++) {
    if (prozess.exitCode !== null) throw new Error(`Leitstand der Kopie beendet: ${log.join('').slice(-800)}`)
    try {
      if ((await fetch(`http://127.0.0.1:${port}/api/roadmap`)).ok) return { prozess, port, beendet, log }
    } catch {
      // noch nicht bereit
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  return { prozess, port, beendet, log, fehler: `Leitstand antwortet nicht: ${log.join('').slice(-800)}` }
}

/** Stoppt den Prozess, entfernt den Lock, löscht die Kopie. @param basis - Temp-Wurzel @param kopie - Kopie @param lauf - Lauf oder null */
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

const stand = legeKopieAn()
console.log(`Kopie ${stand.kopie}`)
const ablaufZwei = legeAblaufAn(stand.kopie, 'zwei')
const ablaufEins = legeAblaufAn(stand.kopie, 'eins')
const protokoll = [{ hinweis: 'Wegwerf-Kopie (Arbeitsbaum + Präparation: B5b-3 Begonnen 2026-10-21, V1 laeuft), zwei Abläufe mit feature_ref F45 ohne Arbeitsordner (Laufort Projektordner der Kopie).', uebersprungen: stand.uebersprungen }]
let lauf = null
try {
  lauf = await starteLeitstand(stand.basis, stand.kopie)
  if (lauf.fehler !== undefined) throw new Error(lauf.fehler)
  const BASIS = `http://127.0.0.1:${lauf.port}`
  const browser = await chromium.launch()
  const wandler = await browser.newPage()
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
  for (const theme of ['dark', 'light']) {
    const lageName = `de-1440-${theme === 'dark' ? 'dunkel' : 'hell'}`
    const platzhalter = ladePlatzhalter(WOERTERBUECHER.de)
    const kontext = await browser.newContext({ viewport: { width: 1440, height: 1100 } })
    await kontext.addInitScript((t) => {
      localStorage.setItem('leitstand-theme', t)
      localStorage.setItem('leitstand-sprache', 'de')
      localStorage.setItem('leitstand-chat-offen', 'false')
    }, theme)
    const seite = await kontext.newPage()
    const fehler = []
    seite.on('pageerror', (f) => fehler.push(String(f)))
    const warte = async (selektor) => {
      await warteBisGeladen(seite, platzhalter, selektor)
      await seite.waitForTimeout(200)
    }
    const bild = async (name, selektor, messung = {}) => {
      await alsWebp(await seite.locator(selektor).first().screenshot(), `${lageName}-${name}`)
      protokoll.push({ lage: lageName, schritt: name, bild: `${lageName}-${name}.webp`, ...messung })
    }
    /** Nimmt einen Ablauf über das Entscheidungs-Panel ab. @param workflowId - Ablauf @returns Meldungstext */
    const nimmAb = async (workflowId) => {
      await seite.goto(`${BASIS}/#/workflows/${encodeURIComponent(workflowId)}`)
      await seite.waitForSelector('#wf-abnahme-begruendung')
      await warte('#view-runs')
      await seite.check('#workflow-entscheidung input[type="radio"][value="ANGENOMMEN"]')
      await seite.fill('#wf-abnahme-begruendung', 'Render-Nachweis B5b-3.')
      await seite.click('#workflow-entscheidung .entscheidung-absenden')
      await seite.waitForSelector('#workflow-abnahme-meldung:not([hidden])')
      return seite.evaluate(() => {
        const m = document.getElementById('workflow-abnahme-meldung')
        return { klasse: m.className, text: m.textContent.trim() }
      })
    }
    if (theme === 'dark') {
      // 01: Abnahme mit zwei laufenden Zeilen ⇒ Hinweis, Akte unverändert.
      const vorher = readFileSync(join(stand.kopie, AKTE), 'utf8')
      const meldungZwei = await nimmAb(ablaufZwei)
      await bild('01-abnahme-zwei-laufende', '#workflow-abnahme-meldung', { meldung: meldungZwei, akteUnveraendert: readFileSync(join(stand.kopie, AKTE), 'utf8') === vorher })
      // 02: V1 zurück auf geplant (wie von Hand nachgetragen und committet), dann Abnahme ⇒ fortgeschrieben.
      setzeZelle(stand.kopie, 'V1', 4, 'geplant')
      git(stand.kopie, ['-c', 'user.name=Nachweis', '-c', 'user.email=nachweis@localhost', 'commit', '-q', '-am', 'V1 geplant'])
      const meldungEins = await nimmAb(ablaufEins)
      const zeile = readFileSync(join(stand.kopie, AKTE), 'utf8').split('\n').find((z) => z.startsWith('| B5b-3 |'))
      await bild('02-abnahme-eindeutig', '#workflow-abnahme-meldung', { meldung: meldungEins, zeile })
      // 03: Code-Ansicht (Projekt): die Akte ist geändert — Git-Block und Diff.
      await seite.goto(`${BASIS}/#/code`)
      await seite.waitForSelector('#view-code')
      await warte('#view-code')
      const akteEintrag = seite.locator('#view-code', { hasText: 'features/F45/feature.md' })
      await bild('03-code-akte-geaendert', '#view-code', { akteSichtbar: (await akteEintrag.count()) > 0, diff: git(stand.kopie, ['diff', '--', AKTE]).slice(0, 1500) })
    }
    // 04: Roadmap — Zeile B5b-3 gewählt (erledigt, Ist im Detail).
    await seite.goto(`${BASIS}/#/roadmap`)
    await seite.waitForSelector('#view-roadmap .rm-gesamt')
    await warte('#view-roadmap')
    const klappe = seite.locator(`[data-roadmap-klappe='["f","M5","F45"]'][aria-expanded="false"]`)
    if ((await klappe.count()) > 0) await klappe.click()
    // Erledigte Workstream-Zeilen stehen in der Gruppenzeile „h“ (standardmäßig zu) — aufklappen, sonst fehlt B5b-3.
    const gruppe = seite.locator(`[data-roadmap-klappe='["h","M5","F45"]'][aria-expanded="false"]`)
    if ((await gruppe.count()) > 0) await gruppe.click()
    await seite.locator(`[data-roadmap-waehlen='${B5B3}']`).scrollIntoViewIfNeeded()
    await seite.click(`[data-roadmap-waehlen='${B5B3}']`)
    await warte('#view-roadmap')
    const detail = await seite.evaluate(() => document.querySelector('.rm-detail')?.textContent.replace(/\s+/g, ' ').trim().slice(0, 400) ?? null)
    await bild('04-roadmap-b5b3-erledigt', '.rm-gesamt', { detail })
    // 05: Befund-Detail mit Pille „Offen“ (Kleinpunkt F-1211 qa 8).
    const pflege = seite.locator(`[data-roadmap-klappe='["p"]']`)
    if ((await pflege.getAttribute('aria-expanded')) === 'false') await pflege.click()
    await warte('#view-roadmap')
    const befund = await seite.getAttribute('.rm-zeile[data-farbe="bug"] [data-roadmap-waehlen], .rm-zeile[data-farbe="befund"] [data-roadmap-waehlen]', 'data-roadmap-waehlen')
    await seite.click(`[data-roadmap-waehlen='${befund}']`)
    await warte('#view-roadmap')
    const pille = await seite.evaluate(() => ({ detail: document.querySelector('.rm-detail-kopf .roadmap-status')?.textContent.trim() ?? null, zeile: document.querySelector('.rm-zeile[data-farbe="befund"] .rm-status, .rm-zeile[data-farbe="bug"] .rm-status')?.textContent.trim() ?? null }))
    await bild('05-befund-pille-offen', '.rm-gesamt', { pille })
    if (fehler.length > 0) protokoll.push({ lage: lageName, schritt: 'Seitenfehler', fehler })
    await kontext.close()
  }
  await browser.close()
} finally {
  writeFileSync(join(ZIEL, 'protokoll.json'), `${JSON.stringify(protokoll, null, 2)}\n`)
  await raeumeAuf(stand.basis, stand.kopie, lauf)
  console.log(`Kopie gelöscht: ${!existsSync(stand.basis)} · ${protokoll.length} Protokolleinträge unter ${ZIEL}`)
}
