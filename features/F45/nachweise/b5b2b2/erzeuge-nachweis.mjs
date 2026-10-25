#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/b5b2b2/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 B5b-2b-2 „Roadmap: Bereinigungsliste“ (features/F45/plan-b5b2b2-v2.md §3 und A3) — Screenshots von
 * #/roadmap gegen einen Leitstand auf einer WEGWERF-KOPIE dieses Repos: Liste mit möglichem und deaktiviertem Vorschlag (Grund
 * sichtbar), Zähler an der Trennzeile, Bestätigungsschritt „M3 → LAEUFT“ mit „nicht zurücknehmbar“ und Häkchen, Bestätigungsschritt
 * „F20 → ABGESCHLOSSEN“ mit Datumshinweis, Meldung nach einem 409 (im Browser beantwortet), Erfolg mit STATUS.md-Hinweis und
 * Git-Block (echter POST gegen die Kopie) — de dunkel/hell bei 1440 px und 390 px, dazu tr und ru bei 390 px (nur die Liste).
 * Bilder als WebP über die Canvas des Playwright-Chromium, übrige Schritte nur in protokoll.json.
 *
 * Sicherheit (Advisor A7 aus advisor-b5b2b.md; Kopie-Code übernommen aus features/F45/nachweise/b5b2b/erzeuge-nachweis.mjs, Advisor
 * B5b-2b-2 B11) — das Skript hat KEINE Standard-URL und schreibt nie gegen einen fremden Leitstand oder den Arbeitsbaum:
 * 1. Es legt selbst `git clone --local --no-hardlinks` unter os.tmpdir() an, kopiert die geänderten und neuen Dateien des
 *    Arbeitsbaums hinein (ohne kontrollzustand/), präpariert STATUS.md (zweite Standardform für F22 ⇒ „F22 → ABGESCHLOSSEN“ nicht
 *    möglich) und committet diesen Stand in der Kopie als Basis. Keine node_modules.
 * 2. Vor dem Start, vor jedem Zurücksetzen und vor dem Löschen: die Kopie liegt im Temp-Verzeichnis und enthält keine Verknüpfung.
 * 3. Es startet den Leitstand der Kopie selbst (cwd = Kopie, freier Port, Register/Fähigkeiten/Plugin-Kopien/TEMP auf Temp-Pfade)
 *    und schreibt nur gegen diesen Port.
 * 4. Wiederholbarkeit (Advisor A3, Variante a): vor jeder Lage `git reset --hard` der Kopie auf ihren Basis-Commit — der echte POST
 *    jeder Lage trifft denselben Stand. Bewusst ohne `git clean -fdx` (Abweichung von plan-b5b2b2-v2.md A3, Prüfpass cr 8): es löschte
 *    kontrollzustand/ samt .leitstand.lock des laufenden Servers; der POST legt keine neuen Dateien an. Vor jedem git-Schreibbefehl in
 *    der Kopie prüft das Skript, dass `git rev-parse --show-toplevel` die Kopie ist (sonst stiege git in Elternordner auf). Vor dem echten POST prüft das Skript, dass M4/F20 vorprüfend möglich ist (B10), sonst Abbruch.
 * 5. Am Ende (auch wenn der Start scheitert): Prozess stoppen und auf sein Ende warten, `.leitstand.lock` nur danach entfernen,
 *    Kopie löschen — läuft der Prozess noch, bleibt alles stehen und das Skript meldet den Pfad.
 *
 * Wird aufgerufen von: Hand — `node features/F45/nachweise/b5b2b2/erzeuge-nachweis.mjs` (aus dem Repo). Nicht Teil von `npm run check`.
 */

import { execFileSync, spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { appendFileSync, copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { chromium } from 'playwright'
import { WOERTERBUECHER } from '../../../../public/leitstand/i18n.js'

const REPO = resolve(import.meta.dirname, '..', '..', '..', '..')
const ZIEL = import.meta.dirname
const LAGEN = [
  { name: 'de-1440-dunkel', breite: 1440, hoehe: 1800, theme: 'dark', voll: true, konflikt: true },
  { name: 'de-1440-hell', breite: 1440, hoehe: 1800, theme: 'light', voll: true },
  { name: 'de-390-dunkel', breite: 390, hoehe: 1600, theme: 'dark', voll: true, konflikt: true },
  { name: 'de-390-hell', breite: 390, hoehe: 1600, theme: 'light', voll: true },
  { name: 'tr-390-dunkel', breite: 390, hoehe: 1600, theme: 'dark', sprache: 'tr' },
  { name: 'ru-390-hell', breite: 390, hoehe: 1600, theme: 'light', sprache: 'ru' },
  // 200 %: 1440 Gerätepixel bei Faktor 2 = 720 CSS-Pixel, dazu „Bewegung reduzieren“ (design-guardian dg 4).
  { name: 'de-720-200prozent', breite: 720, hoehe: 1600, theme: 'dark', faktor: 2, reduziert: true, dialog: true },
]
/** WebP-Güte (0–1) der Umwandlung im Browser. */
const WEBP_GUETE = 0.8
/** Präparation: zweite Standardform für F22 ⇒ STATUS.md nennt F22 2× ⇒ „F22 → ABGESCHLOSSEN“ nicht möglich. */
const PRAEPARATION = '\n- Nachweis B5b-2b-2: F22 ein zweites Mal (`features/F22/feature.md`, Status `FEATURE_GATE`).\n'

// ─── Wegwerf-Kopie (aus nachweise/b5b2b) ──────────────────────────────────────

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
 * Bricht ab, wenn git im Ordner nicht genau dieses Repo als Wurzel sieht (Prüfpass cr 8).
 * @param kopie - Repo-Kopie
 */
function pruefeGitWurzel(kopie) {
  const wurzel = realpathSync(git(kopie, ['rev-parse', '--show-toplevel']).trim())
  if (wurzel !== realpathSync(kopie)) throw new Error(`git-Wurzel ${wurzel} ist nicht die Kopie ${kopie} — Abbruch`)
}

/**
 * Legt die Kopie an: git clone, geänderte und neue Dateien des Arbeitsbaums (ohne kontrollzustand/), Präparation, Basis-Commit.
 * @returns { basis, kopie, kopiert, uebersprungen }
 */
function legeKopieAn() {
  const basis = join(tmpdir(), `aiw-b5b2b2-${randomBytes(4).toString('hex')}`)
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
  appendFileSync(join(kopie, 'docs', 'STATUS.md'), PRAEPARATION)
  pruefeGitWurzel(kopie)
  git(kopie, ['add', '-A'])
  git(kopie, ['-c', 'user.name=Nachweis', '-c', 'user.email=nachweis@localhost', 'commit', '-q', '-m', 'Basis Render-Nachweis B5b-2b-2 (Wegwerf-Kopie, F22 präpariert)'])
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
 * Wartet, bis die Seite fertig geladen ist (F-1201): Gantt, Bereinigung, Entwicklungsstand und „Noch nicht eingeplant“ da, kein
 * „Lädt…“ der Lagensprache mehr, keine Bereinigungs-Anfrage unterwegs (Knöpfe nicht wegen Neuladen gesperrt).
 * @param seite - Playwright-Seite
 * @param laedt - Text „Lädt…“ der Sprache
 * @param laedtNeu - Text „Liste wird neu geladen“ der Sprache
 */
async function warteGeladen(seite, laedt, laedtNeu) {
  await seite.waitForSelector('.rm-gantt')
  await seite.waitForFunction(
    ([a, b]) => {
      const view = document.querySelector('#view-roadmap')
      return view !== null && document.querySelector('[data-roadmap-bereinigung]') !== null && document.querySelector('.rm-entwicklungsstand') !== null && document.querySelector('.roadmap-nicht-eingeplant') !== null && !view.textContent.includes(a) && !view.textContent.includes(b)
    },
    [laedt, laedtNeu]
  )
  await seite.waitForTimeout(150)
}

/**
 * Zustand für die Klicktabelle.
 * @param seite - Playwright-Seite
 * @returns Messwerte
 */
async function messe(seite) {
  return seite.evaluate(() => {
    const text = (sel) => document.querySelector(sel)?.textContent.replace(/\s+/g, ' ').trim().slice(0, 240) ?? null
    const schreiben = document.querySelector('[data-roadmap-bereinigung-aktion="schreiben"]')
    return {
      ueberlaufSeite: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      titel: text('#rm-bereinigung-titel'),
      zaehlerTrennzeile: text('[data-roadmap-zur-bereinigung]'),
      eintraege: document.querySelectorAll('.rm-bereinigung-eintrag').length,
      deaktiviert: [...document.querySelectorAll('[data-roadmap-bereinigung-feld="wahl"]:disabled')].map((r) => `${r.getAttribute('data-roadmap-bereinigung-eintrag-id')} ${r.value}`),
      grundSichtbar: text('.rm-bereinigung-grund'),
      pruefen: text('.rm-bereinigung-pruefen strong'),
      haekchen: document.querySelector('[data-roadmap-bereinigung-feld="haekchen"]')?.checked ?? null,
      schreibenAktiv: schreiben === null ? null : !schreiben.disabled,
      notiz: text('.rm-bereinigung-pruefen .note'),
      meldung: text('.rm-bereinigung-meldung'),
      erfolg: text('.rm-bereinigung-erfolg > strong'),
      statusMdHinweis: document.querySelector('.rm-bereinigung-erfolg')?.textContent.includes('docs/STATUS.md') ?? null,
      gitBlock: text('.rm-bereinigung-erfolg .befehlsblock'),
      fokus: document.activeElement?.getAttribute('data-roadmap-bereinigung-fokus') ?? document.activeElement?.tagName ?? null,
      hinweisF25: text('[data-roadmap-bereinigung-hinweis="M4/F25"]'),
      bestaetigenF25Aktiv: (() => {
        const k = document.querySelector('[data-roadmap-bereinigung-aktion="bestaetigen"][data-roadmap-bereinigung-eintrag-id="M4/F25"]')
        return k === null ? null : !k.disabled
      })(),
    }
  })
}

let kopieStand
try {
  kopieStand = legeKopieAn()
} catch (fehler) {
  console.error(`Wegwerf-Kopie nicht angelegt — Reste ggf. unter ${tmpdir()} (aiw-b5b2b2-*) von Hand prüfen:`, fehler)
  process.exit(1)
}
console.log(`Kopie ${kopieStand.kopie} (${kopieStand.kopiert} Dateien aus dem Arbeitsbaum übernommen)`)
let lauf = null
const protokoll = [
  { hinweis: 'Wegwerf-Kopie unter os.tmpdir() mit Basis-Commit (Arbeitsbaum + Präparation: STATUS.md nennt F22 2×), eigener Leitstand-Prozess, vor jeder Lage git reset --hard auf die Basis; 409 im Browser beantwortet (page.route), der echte POST „F20 → ABGESCHLOSSEN“ je Lage gegen die Kopie. „M3 → LAEUFT“ wird nur bis zum Bestätigungsschritt gezeigt, nicht geschrieben.', uebersprungen: kopieStand.uebersprungen },
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
    pruefeKopie(kopieStand.basis)
    pruefeGitWurzel(kopieStand.kopie)
    git(kopieStand.kopie, ['reset', '--hard', '-q'])
    const sprache = lage.sprache ?? 'de'
    const laedt = WOERTERBUECHER[sprache]['roadmap.laedt']
    const laedtNeu = WOERTERBUECHER[sprache]['roadmap.bereinigung.laedtNeu']
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
      if (bild === 'gesamt') await alsWebp(await seite.locator('.rm-gesamt').screenshot(), `${lage.name}-${name}`)
      if (bild === 'abschnitt') await alsWebp(await seite.locator('[data-roadmap-bereinigung]').screenshot(), `${lage.name}-${name}`)
      if (bild === 'f18') await alsWebp(await seite.locator('[data-roadmap-bereinigung-eintrag="M3/F18"]').screenshot(), `${lage.name}-${name}`)
      if (bild === 'f20') await alsWebp(await seite.locator('[data-roadmap-bereinigung-eintrag="M4/F20"]').screenshot(), `${lage.name}-${name}`)
      protokoll.push({ lage: lage.name, schritt: name, bild: bild === null ? null : `${lage.name}-${name}.webp`, ...(await messe(seite)) })
    }
    await seite.goto(`${BASIS}/#/roadmap`)
    await warteGeladen(seite, laedt, laedtNeu)
    if (index === 0) {
      await schritt('00-trennzeile', 'gesamt')
      // Zähler-Klick: springt zum Abschnitt, Fokus auf dem Titel (Prüfpass qa 10).
      await seite.click('[data-roadmap-zur-bereinigung]')
      await schritt('00b-zaehler-klick')
    }
    await schritt('01-liste', 'abschnitt')
    if (!lage.voll && !lage.dialog) {
      if (fehler.length > 0) protokoll.push({ lage: lage.name, schritt: 'Seitenfehler', fehler })
      await kontext.close()
      continue
    }

    // „M3 → LAEUFT“: Bestätigungsschritt mit „nicht zurücknehmbar“, Häkchen schaltet „Jetzt schreiben“ frei; dann „Zurück“.
    await seite.check('[data-roadmap-bereinigung-eintrag-id="M3/F18"][value="meilenstein_laeuft"]')
    await seite.fill('[data-roadmap-bereinigung-feld="grund"][data-roadmap-bereinigung-eintrag-id="M3/F18"]', `Render-Nachweis B5b-2b-2 (${lage.name})`)
    await seite.click('[data-roadmap-bereinigung-aktion="bestaetigen"][data-roadmap-bereinigung-eintrag-id="M3/F18"]')
    await schritt('02-laeuft-ohne-haekchen')
    await seite.check('[data-roadmap-bereinigung-feld="haekchen"]')
    await schritt('03-laeuft-dialog', 'f18')
    await seite.click('[data-roadmap-bereinigung-aktion="zurueck"][data-roadmap-bereinigung-eintrag-id="M3/F18"]')
    if (!lage.voll) {
      if (fehler.length > 0) protokoll.push({ lage: lage.name, schritt: 'Seitenfehler', fehler })
      await kontext.close()
      continue
    }

    // „F20 → ABGESCHLOSSEN“: Bestätigungsschritt mit Datumshinweis.
    await seite.check('[data-roadmap-bereinigung-eintrag-id="M4/F20"][value="feature_abgeschlossen"]')
    await seite.fill('[data-roadmap-bereinigung-feld="grund"][data-roadmap-bereinigung-eintrag-id="M4/F20"]', `Render-Nachweis B5b-2b-2 (${lage.name})`)
    await seite.click('[data-roadmap-bereinigung-aktion="bestaetigen"][data-roadmap-bereinigung-eintrag-id="M4/F20"]')
    await schritt('04-abgeschlossen-dialog', 'f20')

    if (lage.konflikt) {
      // 409 (im Browser beantwortet): Meldung am Eintrag, Liste lädt neu, Wahl und Begründung bleiben.
      await seite.route('**/bereinigung/bestaetigen', (route) => route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ grund: 'Seit dem Lesen geändert: akte — Bereinigungsliste neu laden und erneut bestätigen', hashes: {}, abweichend: ['akte'] }) }))
      await seite.click('[data-roadmap-bereinigung-aktion="schreiben"][data-roadmap-bereinigung-eintrag-id="M4/F20"]')
      await seite.waitForSelector('.rm-bereinigung-meldung')
      await warteGeladen(seite, laedt, laedtNeu)
      await schritt('05-konflikt-409', 'f20')
      await seite.unroute('**/bereinigung/bestaetigen')
      await seite.click('[data-roadmap-bereinigung-aktion="bestaetigen"][data-roadmap-bereinigung-eintrag-id="M4/F20"]')
    }

    // Vorbedingung des echten POST (B10): M4/F20 ist vorprüfend möglich.
    const vorher = await (await fetch(`${BASIS}/api/roadmap/bereinigung`)).json()
    const f20 = vorher.eintraege?.find((e) => e.eintrag === 'M4/F20')?.vorschlaege.find((v) => v.entscheidung === 'feature_abgeschlossen')
    if (f20?.moeglich !== true) throw new Error(`M4/F20 ist in der Kopie nicht möglich: ${JSON.stringify(f20)}`)
    await seite.click('[data-roadmap-bereinigung-aktion="schreiben"][data-roadmap-bereinigung-eintrag-id="M4/F20"]')
    await seite.waitForSelector('.rm-bereinigung-erfolg')
    await warteGeladen(seite, laedt, laedtNeu)
    await schritt('06-erfolg', 'abschnitt')
    // Offener Git-Block sperrt weitere Bestätigungen (Prüfpass qa 2); „Schließen“ gibt frei, der Fokus fällt auf den Titel.
    await seite.check('[data-roadmap-bereinigung-eintrag-id="M4/F25"][value="feature_abgeschlossen"]')
    await seite.fill('[data-roadmap-bereinigung-feld="grund"][data-roadmap-bereinigung-eintrag-id="M4/F25"]', 'Nachweis Sperre')
    await schritt('07-gesperrt-bis-schliessen')
    await seite.click('[data-roadmap-bereinigung-aktion="erfolg-schliessen"]')
    await schritt('08-geschlossen')
    protokoll.push({ lage: lage.name, schritt: 'git diff der Kopie nach dem echten POST', diff: git(kopieStand.kopie, ['diff', '--stat']).trim().split('\n') })
    if (fehler.length > 0) protokoll.push({ lage: lage.name, schritt: 'Seitenfehler', fehler })
    await kontext.close()
  }
  await browser.close()
} finally {
  writeFileSync(join(ZIEL, 'protokoll.json'), `${JSON.stringify(protokoll, null, 2)}\n`)
  await raeumeAuf(kopieStand.basis, kopieStand.kopie, lauf)
  console.log(`Kopie gelöscht: ${!existsSync(kopieStand.basis)} · ${protokoll.length} Protokolleinträge unter ${ZIEL}`)
}
