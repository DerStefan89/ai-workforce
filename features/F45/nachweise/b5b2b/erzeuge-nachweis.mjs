#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/b5b2b/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 B5b-2b-1 „Roadmap: Anpassen“ (features/F45/plan-b5b2b-v2.md §4) — Screenshots von #/roadmap gegen
 * einen Leitstand auf einer WEGWERF-KOPIE dieses Repos: Anpassen offen (Feature, Workstream), Speichern deaktiviert ohne
 * Begründung, 409 mit „Neu laden“, Erfolg mit Git-Block (echter PUT einer Schätzung), dazu einmal ein echter Feature-PUT mit
 * Priorität und Meilenstein-Wechsel (Auswahl bleibt auf dem Feature im aufgeklappten Ziel, Advisor A5), Status-Pille im Detailkopf
 * und neutrale Auswahl — de dunkel/hell bei 1440 px und 390 px, tr und ru bei 390 px (lange Texte), de bei 200 % mit reduzierter
 * Bewegung. Bilder als WebP über die Canvas des Playwright-Chromium, übrige Schritte nur in protokoll.json.
 *
 * Sicherheit (Advisor A7, Challenger 25.10.2026 Entscheidung 6) — das Skript hat KEINE Standard-URL und schreibt nie gegen einen
 * fremden Leitstand oder den Arbeitsbaum:
 * 1. Es legt selbst `git clone --local --no-hardlinks` unter os.tmpdir() an, kopiert die geänderten und neuen Dateien des
 *    Arbeitsbaums hinein (ohne kontrollzustand/; übersprungene Pfade stehen im Protokoll) und committet diesen Stand in der Kopie
 *    als Basis — der Diff danach zeigt genau, was die PUTs geschrieben haben (Prüfpass qa 5). Keine node_modules.
 * 2. Vor dem Start und vor dem Löschen: die Kopie liegt im Temp-Verzeichnis und enthält keine Verknüpfung (Symlink/Junction).
 * 3. Es startet den Leitstand der Kopie selbst (cwd = Kopie, freier Port, Register/Fähigkeiten/Plugin-Kopien/TEMP auf Temp-Pfade)
 *    und schreibt nur gegen diesen Port. HOME wird nicht umgelenkt: der Server schreibt nach ~/.ai-workforce/ nur bei Läufen, und
 *    dieses Skript startet keinen.
 * 4. Am Ende (auch wenn der Start scheitert): Prozess stoppen und auf sein Ende warten, `.leitstand.lock` nur danach entfernen,
 *    Kopie löschen — läuft der Prozess noch, bleibt alles stehen und das Skript meldet den Pfad.
 * Der 409 ist im Browser beantwortet (page.route): der Hash wird frisch vor dem PUT gelesen, ein echter Konflikt ist nur im
 * Millisekundenfenster möglich — im Protokoll vermerkt. F-1201: jede Aufnahme wartet, bis kein „Lädt…“ mehr auf der Seite steht.
 *
 * Wird aufgerufen von: Hand — `node features/F45/nachweise/b5b2b/erzeuge-nachweis.mjs` (aus dem Repo). Nicht Teil von `npm run check`.
 */

import { execFileSync, spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { chromium } from 'playwright'
import { WOERTERBUECHER } from '../../../../public/leitstand/i18n.js'

const REPO = resolve(import.meta.dirname, '..', '..', '..', '..')
const ZIEL = import.meta.dirname
const LAGEN = [
  { name: 'de-1440-dunkel', breite: 1440, hoehe: 1800, theme: 'dark', voll: true, wechsel: true },
  { name: 'de-1440-hell', breite: 1440, hoehe: 1800, theme: 'light', voll: true },
  { name: 'de-390-dunkel', breite: 390, hoehe: 1600, theme: 'dark', voll: true },
  { name: 'de-390-hell', breite: 390, hoehe: 1600, theme: 'light', voll: true },
  { name: 'tr-390-dunkel', breite: 390, hoehe: 1600, theme: 'dark', sprache: 'tr' },
  { name: 'ru-390-hell', breite: 390, hoehe: 1600, theme: 'light', sprache: 'ru' },
  // 200 %: 1440 Gerätepixel bei Faktor 2 = 720 CSS-Pixel, dazu „Bewegung reduzieren“.
  { name: 'de-720-200prozent', breite: 720, hoehe: 1600, theme: 'dark', faktor: 2, reduziert: true },
]
/** WebP-Güte (0–1) der Umwandlung im Browser. */
const WEBP_GUETE = 0.8

// ─── Wegwerf-Kopie ────────────────────────────────────────────────────────────

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
 * Legt die Kopie an: git clone, geänderte und neue Dateien des Arbeitsbaums (ohne kontrollzustand/), Basis-Commit in der Kopie.
 * @returns { basis, kopie, kopiert, uebersprungen }
 */
function legeKopieAn() {
  const basis = join(tmpdir(), `aiw-b5b2b-${randomBytes(4).toString('hex')}`)
  const kopie = join(basis, 'repo')
  mkdirSync(basis)
  execFileSync('git', ['clone', '--local', '--no-hardlinks', '--quiet', REPO, kopie], { stdio: 'inherit' })
  // -z: Pfade mit Nicht-ASCII-Zeichen kämen sonst in Anführungszeichen und würden übersprungen (Prüfpass cr 8).
  const liste = (args) => git(REPO, [...args, '-z']).split('\0').filter((z) => z !== '' && !z.startsWith('kontrollzustand/'))
  const dateien = [...new Set([...liste(['diff', '--name-only', 'HEAD']), ...liste(['ls-files', '--others', '--exclude-standard'])])]
  const uebersprungen = []
  for (const datei of dateien) {
    const quelle = join(REPO, datei)
    if (!existsSync(quelle)) {
      // Im Arbeitsbaum gelöscht: auch in der Kopie löschen.
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
  git(kopie, ['add', '-A'])
  git(kopie, ['-c', 'user.name=Nachweis', '-c', 'user.email=nachweis@localhost', 'commit', '-q', '-m', 'Basis Render-Nachweis B5b-2b-1 (Wegwerf-Kopie)'])
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
 * Startet den Leitstand der Kopie; der Aufrufer erhält den Prozess sofort (damit raeumeAuf auch nach einem gescheiterten Start auf
 * das Prozessende wartet, Prüfpass cr 7) und wartet mit bereit() auf GET /api/roadmap.
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
  const lock = join(kopie, 'kontrollzustand', '.leitstand.lock')
  if (existsSync(lock)) rmSync(lock)
  pruefeKopie(basis)
  rmSync(basis, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 })
}

// ─── Aufnahme ─────────────────────────────────────────────────────────────────

/**
 * Wartet, bis die Seite fertig geladen ist (F-1201): Gantt da, kein „Lädt…“ der Lagensprache mehr in #view-roadmap.
 * @param seite - Playwright-Seite
 * @param laedt - Text „Lädt…“ der Sprache
 */
async function warteGeladen(seite, laedt) {
  await seite.waitForSelector('.rm-gantt')
  await seite.waitForFunction((text) => {
    const view = document.querySelector('#view-roadmap')
    return view !== null && document.querySelector('.rm-entwicklungsstand') !== null && document.querySelector('.roadmap-nicht-eingeplant') !== null && !view.textContent.includes(text)
  }, laedt)
  await seite.waitForTimeout(150)
}

/**
 * Zustand für die Klicktabelle.
 * @param seite - Playwright-Seite
 * @returns Messwerte
 */
async function messe(seite) {
  return seite.evaluate(() => {
    const knopf = document.querySelector('[data-roadmap-anpassen-aktion="speichern"]')
    const gewaehlt = document.querySelector('.rm-zeile.gewaehlt .rm-links')
    const pille = document.querySelector('.rm-detail-kopf .roadmap-status')
    const zeilenStatus = document.querySelector('.rm-status .roadmap-status')
    return {
      ueberlaufSeite: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      gewaehlt: document.querySelector('.rm-zeile.gewaehlt .rm-name-text')?.textContent ?? null,
      auswahlStreifen: gewaehlt === null ? null : getComputedStyle(gewaehlt).boxShadow,
      pilleRadiusDetail: pille === null ? null : getComputedStyle(pille).borderRadius,
      zeilenStatusRahmen: zeilenStatus === null ? null : getComputedStyle(zeilenStatus).borderTopStyle,
      detailRahmen: getComputedStyle(document.querySelector('.rm-detail') ?? document.body).borderTopColor,
      fragenHauptknopf: document.querySelector('[data-roadmap-jarvis-fragen]')?.classList.contains('primary') ?? null,
      anpassenOffen: document.querySelector('[data-roadmap-anpassen-details]')?.open ?? null,
      phase: document.querySelector('[data-roadmap-anpassen-details]')?.getAttribute('data-phase') ?? null,
      speichernAktiv: knopf === null ? null : !knopf.disabled,
      hinweis: document.querySelector('[data-roadmap-anpassen-hinweis]')?.textContent ?? null,
      meldung: document.querySelector('.rm-anpassen-meldung')?.textContent.replace(/\s+/g, ' ').trim().slice(0, 200) ?? null,
      neuLaden: document.querySelector('[data-roadmap-anpassen-aktion="neu-laden"]') !== null,
      gitBlock: document.querySelector('.rm-anpassen-ergebnis .befehlsblock')?.textContent.replace(/\s+/g, ' ').trim().slice(0, 240) ?? null,
      offeneMeilensteine: [...document.querySelectorAll('.rm-zeile.rm-ebene-0 [aria-expanded="true"]')].length,
      fusszeile: document.querySelector('.roadmap-fussnote')?.textContent ?? null,
    }
  })
}

const kopieStand = legeKopieAn()
console.log(`Kopie ${kopieStand.kopie} (${kopieStand.kopiert} Dateien aus dem Arbeitsbaum übernommen)`)
let lauf = null
const protokoll = [
  { hinweis: 'Wegwerf-Kopie unter os.tmpdir() mit Basis-Commit, eigener Leitstand-Prozess; 409 im Browser beantwortet (page.route), weil der Hash frisch vor dem PUT gelesen wird. Caret beim Neuschreiben ist nicht belegt (kein Neuschreiben während des Tippens auslösbar, ohne den Fokus zu bewegen).', uebersprungen: kopieStand.uebersprungen },
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

  for (const [index, lage] of LAGEN.entries()) {
    const sprache = lage.sprache ?? 'de'
    const laedt = WOERTERBUECHER[sprache]['roadmap.laedt']
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
    const schritt = async (name, bild = null) => {
      if (bild === 'seite') await alsWebp(await seite.screenshot({ fullPage: true }), `${lage.name}-${name}`)
      if (bild === 'gesamt') await alsWebp(await seite.locator('.rm-gesamt').screenshot(), `${lage.name}-${name}`)
      if (bild === 'detail') await alsWebp(await seite.locator('.rm-detail').screenshot(), `${lage.name}-${name}`)
      protokoll.push({ lage: lage.name, schritt: name, bild: bild === null ? null : `${lage.name}-${name}.webp`, ...(await messe(seite)) })
    }
    await seite.goto(`${BASIS}/#/roadmap`)
    await warteGeladen(seite, laedt)
    await schritt('01-start', index === 0 ? 'seite' : null)

    // Feature F45: Auswahl (neutraler Streifen, Pille im Detailkopf), Anpassen offen, dann Priorität ohne Begründung.
    await seite.locator(`[data-roadmap-waehlen='${JSON.stringify(['f', 'M5', 'F45'])}']`).click()
    await warteGeladen(seite, laedt)
    await seite.locator('[data-roadmap-anpassen-details] > summary').click()
    await schritt('02-feature-offen', lage.voll || lage.faktor ? 'gesamt' : 'detail')
    if (lage.faktor) {
      if (fehler.length > 0) protokoll.push({ lage: lage.name, schritt: 'Seitenfehler', fehler })
      await kontext.close()
      continue
    }
    await seite.selectOption('[data-roadmap-anpassen-feld="prioritaet"]', 'P1')
    await schritt('03-ohne-begruendung', lage.voll ? 'detail' : null)

    // Workstream von F45 (erste sichtbare Zeile mit Formular).
    const kandidaten = seite.locator(`[data-roadmap-waehlen^='["w","M5","F45",']`)
    const anzahl = await kandidaten.count()
    let gefunden = false
    for (let i = 0; i < anzahl && !gefunden; i++) {
      await kandidaten.nth(i).click()
      gefunden = (await seite.locator('[data-roadmap-anpassen-details]').count()) > 0
    }
    if (!gefunden) throw new Error('keine anpassbare Workstream-Zeile unter F45')
    await seite.locator('[data-roadmap-anpassen-details] > summary').click()
    await schritt('04-workstream-offen', 'detail')
    if (!lage.voll) {
      if (fehler.length > 0) protokoll.push({ lage: lage.name, schritt: 'Seitenfehler', fehler })
      await kontext.close()
      continue
    }

    // 409 (im Browser beantwortet), Eingaben bleiben, „Neu laden“ sichtbar.
    await seite.fill('[data-roadmap-anpassen-feld="min"]', '0,5')
    await seite.fill('[data-roadmap-anpassen-feld="max"]', String(1 + index))
    await seite.fill('[data-roadmap-anpassen-feld="grund"]', `Render-Nachweis B5b-2b-1 (${lage.name})`)
    await seite.route('**/planung', (route) =>
      route.request().method() === 'PUT' ? route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ grund: 'Die Akte wurde seit dem Lesen geändert — neu laden und erneut bearbeiten', hash: 'c'.repeat(64) }) }) : route.continue()
    )
    await seite.click('[data-roadmap-anpassen-aktion="speichern"]')
    await seite.waitForSelector('.rm-anpassen-meldung')
    await schritt('05-konflikt-409', 'detail')
    await seite.unroute('**/planung')

    // Erfolg: echter PUT gegen die Kopie, Git-Block, Auswahl bleibt.
    await seite.click('[data-roadmap-anpassen-aktion="speichern"]')
    await seite.waitForSelector('.rm-anpassen-ergebnis')
    await warteGeladen(seite, laedt)
    await schritt('06-erfolg-git', 'detail')
    // Zurück auf das Feature und wieder auf den Workstream: das Ergebnis bleibt im Zustand der Zeile (Prüfpass cr 1/qa 1).
    await seite.locator(`[data-roadmap-waehlen='${JSON.stringify(['f', 'M5', 'F45'])}']`).click()
    await kandidaten.first().click()
    await schritt('07-ergebnis-bleibt')
    await seite.click('[data-roadmap-anpassen-aktion="schliessen"]')
    await schritt('08-geschlossen')

    // Einmal: echter Feature-PUT mit Priorität und Meilenstein-Wechsel (F30 → V1-Backlog, zugeklappt) — Advisor A5.
    if (lage.wechsel) {
      await seite.locator(`[data-roadmap-waehlen='${JSON.stringify(['f', 'M5', 'F30'])}']`).click()
      await warteGeladen(seite, laedt)
      await seite.locator('[data-roadmap-anpassen-details] > summary').click()
      await seite.selectOption('[data-roadmap-anpassen-feld="prioritaet"]', 'P2')
      await seite.selectOption('[data-roadmap-anpassen-feld="meilenstein"]', 'V1-Backlog')
      await seite.fill('[data-roadmap-anpassen-feld="grund"]', 'Render-Nachweis B5b-2b-1: Meilenstein-Wechsel')
      await schritt('09-wechsel-vorher', 'detail')
      await seite.click('[data-roadmap-anpassen-aktion="speichern"]')
      await seite.waitForSelector('.rm-anpassen-ergebnis')
      await seite.waitForFunction(() => document.querySelector('.rm-zeile.gewaehlt .rm-name-text')?.textContent.startsWith('F30') === true && document.querySelector('.rm-anpassen-ergebnis') !== null)
      await warteGeladen(seite, laedt)
      await schritt('10-wechsel-erfolg', 'gesamt')
    }
    if (fehler.length > 0) protokoll.push({ lage: lage.name, schritt: 'Seitenfehler', fehler })
    await kontext.close()
  }
  await browser.close()
  const diff = git(kopieStand.kopie, ['diff', '--stat'])
  const roadmapDiff = git(kopieStand.kopie, ['diff', '--', 'docs/projekt/roadmap.json'])
  protokoll.push({ schritt: 'git diff der Kopie gegen ihren Basis-Commit — genau das, was die echten PUTs geschrieben haben', diff: diff.trim().split('\n'), roadmap: roadmapDiff.trim().split('\n') })
} finally {
  writeFileSync(join(ZIEL, 'protokoll.json'), `${JSON.stringify(protokoll, null, 2)}\n`)
  await raeumeAuf(kopieStand.basis, kopieStand.kopie, lauf)
  console.log(`Kopie gelöscht: ${!existsSync(kopieStand.basis)} · ${protokoll.length} Protokolleinträge unter ${ZIEL}`)
}
