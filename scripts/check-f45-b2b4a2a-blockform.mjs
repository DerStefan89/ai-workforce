#!/usr/bin/env node
/**
 * Datei: scripts/check-f45-b2b4a2a-blockform.mjs
 *
 * Zweck: Gate für F45 B2b-4a-2a „Blockform“ (features/F45/plan-b2b4a2a.md; F-1088 (5)): jeder Befehlsblock des Leitstands hat
 * die Form „& {“ / Set-Location -LiteralPath <Pfad> -ErrorAction Stop / Befehle / „}“ ohne Einzug — fehlt der Ordner, läuft
 * kein git-Befehl. Attrappen (Ordner, Pfade) entstehen zur Laufzeit, nichts eingecheckt (F-1134).
 * (a) Blockform aller Blöcke — Verhaltensproben der Erzeuger (code-daten.js sicherBefehle mit und ohne origin,
 *     pruefstandBefehle, befehlsBlock als reiner Orts-Block) für Pfade mit Leerzeichen, [1], ', ’, UNC und POSIX; Zählung ohne
 *     Kopf/Fuß; Enter-Hinweis unter jedem Block in Blockform und nur dort; Schlüssel befehl.enterHinweis in de/en/tr/ru.
 *     Quelltext (nur public/leitstand/views/** ohne Tests und befehlsblock.js; code-daten.js decken die Verhaltensproben ab):
 *     kein cdZeile(, kein Literal 'cd /"cd /`cd ; auftrag-umgebung.js baut seinen Block mit befehlsBlock(.
 *     Chat/Jarvis (Blockform in der Jarvis-Regel, F45 B2b-4b) prüft scripts/check-f45-b2b4b-jarvis.mjs, nicht dieses Gate.
 * (b) Rotfall „Ordner fehlt“ → kein git: echte PowerShell führt den erzeugten Block als ein -Command aus — Ordner fehlt ⇒
 *     Exit ≠ 0, Abbruch an Set-Location (kein Parse-Fehler) und kein „git version“ in stdout; Gegenprobe: vorhandene Ordner
 *     mit Leerzeichen, [1], ', ’, ` und $ ⇒ Exit 0, git lief (eine kaputte Quotierung fiele hier auf). Startfehler und
 *     Zeitgrenze zählen als Befund. Ohne PowerShell (powershell.exe, pwsh) übersprungen mit Meldung; (a) bleibt wirksam.
 * (c) starteWorkflowSchritt( genau 6× im Server (der Server ist in diesem Paket nicht berührt).
 * Gegenproben im Gate: verfälschte Blöcke (Folgezeile mit Einzug, ohne -ErrorAction Stop, cd als Folgezeile, ohne Fuß,
 * -Path), in echter PowerShell ein Block ohne -ErrorAction Stop (git läuft trotz fehlendem Ordner) und einer mit nicht
 * verdoppeltem Apostroph (vorhandener Ordner scheitert), Quelltext mit cdZeile(, HTML ohne Hinweis, fehlender ru-Schlüssel —
 * jede muss erkannt werden.
 *
 * Wird aufgerufen von: `npm run check:gates` (und damit `npm run check`).
 *
 * Aufruf: node scripts/check-f45-b2b4a2a-blockform.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { renderBefehlsblock, zaehleBefehle } from '../public/leitstand/befehlsblock.js'
import { befehlsBlock, pruefstandBefehle, psArgument, sicherBefehle } from '../public/leitstand/code-daten.js'
import de from '../public/leitstand/i18n/de.js'
import en from '../public/leitstand/i18n/en.js'
import ru from '../public/leitstand/i18n/ru.js'
import tr from '../public/leitstand/i18n/tr.js'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []

/**
 * Hält ein Ergebnis fest: ohne Befund ✓-Zeile, sonst Befund.
 * @param ok - Bedingung erfüllt
 * @param gruen - Meldung im Grünfall
 * @param rot - Befund
 */
function pruefe(ok, gruen, rot) {
  if (ok) console.log(`✓ ${gruen}`)
  else befunde.push(rot)
}

// ─── (a) Blockform ────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Prüft einen Block auf die Blockform für pfad.
 * @param zeilen - Zeilen des Blocks
 * @param pfad - erwarteter Ort
 * @returns Befunde (leer = Blockform)
 */
function pruefeBlock(zeilen, pfad) {
  const b = []
  if (!Array.isArray(zeilen) || zeilen.length < 3) return ['kein Block']
  if (zeilen[0] !== '& {') b.push(`Kopf ist ${JSON.stringify(zeilen[0])}`)
  if (zeilen[1] !== `Set-Location -LiteralPath ${psArgument(pfad)} -ErrorAction Stop`) b.push(`Ortszeile ist ${JSON.stringify(zeilen[1])}`)
  if (zeilen.at(-1) !== '}') b.push(`Fuß ist ${JSON.stringify(zeilen.at(-1))}`)
  if (zeilen.some((z) => z !== z.trimStart())) b.push('Zeile mit Einzug')
  if (zeilen.some((z) => /^cd\b/i.test(z.trim()))) b.push('Zeile mit cd')
  return b
}

/**
 * Antwort der Code-Route für einen Pfad (Grünfall mit einer Datei und origin).
 * @param pfad - absoluterPfad
 * @param origin - Remote „origin“ vorhanden
 * @returns Route-Antwort
 */
const route = (pfad, origin = true) => ({
  status: 'ok',
  absoluterPfad: pfad,
  branch: { status: 'ok', name: 'feat/f45-b2b4a2a-blockform', losgeloest: false },
  remoteWebUrl: { status: 'ok', url: null, origin },
  dateien: { status: 'ok', eintraege: [{ pfad: 'src/a b.ts', art: 'M', xy: ' M' }], anzahl: 1, gekappt: false },
  startvorlage: { status: 'ok', pruefbefehl: 'npm run check' },
})

const PFADE = [String.raw`C:\Projekte\mein projekt`, String.raw`C:\Projekte\ordner [1]`, String.raw`C:\Projekte\it's`, String.raw`C:\Projekte\it’s`, 'C:\\Projekte\\back`tick $x', String.raw`\\server\freigabe\projekt`, '/home/nutzer/mein projekt']

/**
 * Alle Leitstand-Blöcke für einen Pfad aus den Erzeugern.
 * @param pfad - absoluter Pfad
 * @returns [{ name, zeilen }]
 */
function bloeckeFuer(pfad) {
  const liste = []
  for (const [i, zeilen] of (sicherBefehle(route(pfad)).bloecke ?? []).entries()) liste.push({ name: `Sichern ${i + 1}`, zeilen })
  for (const zeilen of sicherBefehle(route(pfad, false)).bloecke ?? []) liste.push({ name: 'Sichern ohne origin', zeilen })
  for (const zeilen of pruefstandBefehle(route(pfad)).bloecke ?? []) liste.push({ name: 'Prüfstand', zeilen })
  liste.push({ name: 'Orts-Block (Auftrag anlegen)', zeilen: befehlsBlock(pfad, []) })
  return liste
}

{
  const b = []
  let anzahl = 0
  for (const pfad of PFADE) {
    const bloecke = bloeckeFuer(pfad)
    if (bloecke.length !== 5) b.push(`${pfad}: ${bloecke.length} Blöcke statt 5`)
    for (const { name, zeilen } of bloecke) {
      anzahl++
      for (const f of pruefeBlock(zeilen, pfad)) b.push(`${name} (${pfad}): ${f}`)
    }
  }
  pruefe(b.length === 0, `(a1) ${anzahl} erzeugte Blöcke (Sichern, ohne origin, Prüfstand, Orts-Block × ${PFADE.length} Pfade) in Blockform, ohne Einzug, ohne cd.`, `(a1) ${b.join(' | ')}`)
  const push = sicherBefehle(route(PFADE[0])).bloecke?.[1] ?? []
  pruefe(push.length === 4 && push[2].startsWith('git push '), '(a1) push in eigenem Block [Kopf, Ort, push, Fuß].', `(a1) push-Block ${JSON.stringify(push)}`)
  pruefe(befehlsBlock('relativ/ordner', []) === null && sicherBefehle(route('relativ')).grund === 'keinPfad', '(a1) ohne absoluten Pfad kein Block.', '(a1) relativer Pfad ergibt einen Block')
}

/**
 * Prüft Zählung und Enter-Hinweis eines gerenderten Blocks.
 * @param html - Ausgabe von renderBefehlsblock
 * @param blockform - true, wenn die Zeilen Blockform haben
 * @returns Befunde
 */
function pruefeHinweis(html, blockform) {
  const hat = /<\/code><\/pre>\s*<p class="befehlsblock-enter">[^<]+<\/p>/.test(html)
  if (blockform && !hat) return ['Enter-Hinweis fehlt unter dem Block in Blockform']
  if (!blockform && hat) return ['Enter-Hinweis bei einem Block ohne Blockform']
  return []
}

{
  const zeilen = befehlsBlock(PFADE[0], ['git status', 'git diff --stat'])
  const html = renderBefehlsblock({ sprache: 'powershell', zeilen }, { echteWerte: true })
  const b = [...pruefeHinweis(html, true), ...pruefeHinweis(renderBefehlsblock({ sprache: 'powershell', zeilen: ['git status'] }), false)]
  // Set-Location und die zwei git-Zeilen sind Befehle, Kopf und Fuß nicht.
  if (zaehleBefehle(zeilen) !== 3) b.push(`zaehleBefehle(Blockform) = ${zaehleBefehle(zeilen)} statt 3`)
  if (zaehleBefehle(['if ($x) {', 'git status', '}']) !== 3) b.push('zaehleBefehle zieht eine „}“ außerhalb der Blockform ab')
  pruefe(b.length === 0, '(a2) Enter-Hinweis unter jedem Block in Blockform und nur dort; Kopf/Fuß zählen nicht.', `(a2) ${b.join(' | ')}`)
}

/**
 * Prüft den Schlüssel befehl.enterHinweis in allen Sprachen.
 * @param sprachen - { de, en, tr, ru }
 * @returns Befunde
 */
function pruefeI18n(sprachen) {
  return Object.entries(sprachen)
    .filter(([, texte]) => typeof texte['befehl.enterHinweis'] !== 'string' || texte['befehl.enterHinweis'].trim() === '' || /wf\/|F-\d|B2b/.test(texte['befehl.enterHinweis']))
    .map(([sprache]) => `befehl.enterHinweis fehlt oder trägt eine Kennung in ${sprache}`)
}

{
  const b = pruefeI18n({ de, en, tr, ru })
  pruefe(b.length === 0, '(a3) befehl.enterHinweis in de/en/tr/ru, ohne interne Kennung.', `(a3) ${b.join(' | ')}`)
}

/**
 * Quelltextprüfung der Views und des Befehlsblocks: kein cdZeile(, kein cd-Literal; auftrag-umgebung.js nutzt befehlsBlock(.
 * @param dateien - [{ pfad, text }]
 * @returns Befunde
 */
function pruefeQuelltext(dateien) {
  const b = []
  for (const { pfad, text } of dateien) {
    if (/\bcdZeile\(/.test(text)) b.push(`${pfad}: ruft cdZeile( auf`)
    if (/['"`]cd /.test(text)) b.push(`${pfad}: Literal „cd “`)
  }
  const umgebung = dateien.find((d) => d.pfad.endsWith('auftrag-umgebung.js'))
  if (!umgebung?.text.includes('befehlsBlock(')) b.push('auftrag-umgebung.js baut seinen Block nicht mit befehlsBlock(')
  return b
}

const VIEWS = 'public/leitstand/views'
const QUELLEN = [
  ...readdirSync(VIEWS)
    .filter((n) => n.endsWith('.js') && !n.includes('.test.'))
    .map((n) => `${VIEWS}/${n}`),
  'public/leitstand/befehlsblock.js',
].map((pfad) => ({ pfad, text: readFileSync(pfad, 'utf8') }))
{
  const b = pruefeQuelltext(QUELLEN)
  pruefe(b.length === 0, `(a4) ${QUELLEN.length} Dateien (views/**, befehlsblock.js): kein cdZeile(, kein cd-Literal; „Auftrag anlegen“ über befehlsBlock(. Grenze: Chat/Jarvis → B2b-4b.`, `(a4) ${b.join(' | ')}`)
}

// ─── (b) Rotfall „Ordner fehlt“ in echter PowerShell ─────────────────────────────────────────────────────────────────

/**
 * Sucht eine PowerShell.
 * @returns Programmname oder null
 */
function findePowerShell() {
  for (const name of ['powershell.exe', 'pwsh']) {
    const r = spawnSync(name, ['-NoProfile', '-NonInteractive', '-Command', 'exit 0'], { encoding: 'utf8' })
    if (r.status === 0) return name
  }
  return null
}

/**
 * Führt einen Block als ein -Command aus (so übergibt PSReadLine einen eingefügten Block, powershell-versuch.md (c)).
 * @param ps - PowerShell
 * @param zeilen - Blockzeilen
 * @returns { exit, gitLief, ortFehler, startFehler } — ortFehler: stderr nennt Set-Location (und keinen Parse-Fehler);
 *   startFehler: PowerShell startete nicht oder lief in die Zeitgrenze
 */
function fuehreAus(ps, zeilen) {
  const r = spawnSync(ps, ['-NoProfile', '-NonInteractive', '-Command', zeilen.join('\n')], { cwd: tmpdir(), encoding: 'utf8', timeout: 60000 })
  const stderr = r.stderr ?? ''
  return { exit: r.status, gitLief: /git version/.test(r.stdout ?? ''), ortFehler: /Set-Location/.test(stderr) && !/ParserError|ParseException/.test(stderr), startFehler: r.error !== undefined || r.status === null }
}

/**
 * (b) Bewertet die Läufe: fehlt ⇒ Abbruch an Set-Location (kein Parse-Fehler, kein git); jeder vorhandene Ordner ⇒ Exit 0, git lief.
 * @param fehlt - Ergebnis mit fehlendem Ordner
 * @param vorhanden - [{ name, ergebnis }] mit vorhandenen Ordnern
 * @returns Befunde
 */
function pruefeLaeufe(fehlt, vorhanden) {
  const b = []
  if (fehlt.startFehler || fehlt.exit === 0 || fehlt.gitLief || !fehlt.ortFehler) b.push(`Ordner fehlt: Exit ${fehlt.exit}, git lief ${fehlt.gitLief}, Abbruch an Set-Location ${fehlt.ortFehler}, Startfehler ${fehlt.startFehler}`)
  for (const { name, ergebnis } of vorhanden) if (ergebnis.startFehler || ergebnis.exit !== 0 || !ergebnis.gitLief) b.push(`Ordner ${name} vorhanden: Exit ${ergebnis.exit}, git lief ${ergebnis.gitLief}`)
  return b
}

const ps = findePowerShell()
const aufraeumen = []
let rotPs = null
try {
  if (ps === null) {
    console.log('– (b) übersprungen: keine PowerShell (powershell.exe, pwsh) auf diesem Rechner — (a) bleibt wirksam.')
  } else {
    const wurzel = mkdtempSync(join(tmpdir(), 'f45-b2b4a2a-'))
    aufraeumen.push(wurzel)
    // Vorhandene Ordner mit jedem Zeichen, das die Quotierung tragen muss (qa 1): eine kaputte Quotierung wäre ein
    // Parse-Fehler — bei „fehlt“ nicht von einem Abbruch zu unterscheiden, hier aber rot.
    const NAMEN = ['mit ordner [1]', "it's da", 'it’s da', 'back`tick', 'geld $x']
    const vorhanden = NAMEN.map((name) => {
      const pfad = join(wurzel, name)
      mkdirSync(pfad)
      return { name, pfad }
    })
    const fehlend = join(wurzel, "gibt's nicht")
    const fehlt = fuehreAus(ps, befehlsBlock(fehlend, ['git --version']))
    const da = vorhanden.map(({ name, pfad }) => ({ name, ergebnis: fuehreAus(ps, befehlsBlock(pfad, ['git --version'])) }))
    const b = pruefeLaeufe(fehlt, da)
    pruefe(b.length === 0, `(b) ${ps}: Ordner fehlt ⇒ Exit ${fehlt.exit}, Abbruch an Set-Location, kein git; ${NAMEN.length} vorhandene Ordner (Leerzeichen, [1], ', ’, \`, $) ⇒ Exit 0, git lief.`, `(b) ${b.join(' | ')}`)
    // Gegenproben: ohne -ErrorAction Stop läuft git trotz fehlendem Ordner; mit kaputter Quotierung (Apostroph nicht
    // verdoppelt) scheitert der vorhandene Ordner — (b) muss beides melden.
    const ohneStop = befehlsBlock(fehlend, ['git --version']).map((z) => z.replace(' -ErrorAction Stop', ''))
    const kaputt = vorhanden[1]
    const ohneVerdopplung = ['& {', `Set-Location -LiteralPath '${kaputt.pfad}' -ErrorAction Stop`, 'git --version', '}']
    rotPs = [
      ['PowerShell ohne -ErrorAction Stop: git läuft', pruefeLaeufe(fuehreAus(ps, ohneStop), da)],
      ['PowerShell mit kaputter Quotierung', pruefeLaeufe(fehlt, [{ name: kaputt.name, ergebnis: fuehreAus(ps, ohneVerdopplung) }])],
    ]
  }
} finally {
  for (const pfad of aufraeumen) raeumeVerzeichnis(pfad)
}

// ─── (c) Server unberührt ─────────────────────────────────────────────────────────────────────────────────────────────

const SERVER = readFileSync('scripts/leitstand-server.mjs', 'utf8')
const starts = SERVER.split('starteWorkflowSchritt(').length - 1
pruefe(starts === 6, '(c) starteWorkflowSchritt( genau 6× im Server.', `(c) starteWorkflowSchritt( ${starts}×`)

// ─── Gegenproben ─────────────────────────────────────────────────────────────────────────────────────────────────────

{
  const p = PFADE[1]
  const gut = befehlsBlock(p, ['git status'])
  const rot = [
    // Einzug und cd nur auf Folgezeilen — die Ortszeile bleibt richtig, damit die Regel für sich allein geprüft wird (cr 1).
    ['Folgezeile mit Einzug', pruefeBlock(gut.map((z, i) => (i >= 2 && i < gut.length - 1 ? `  ${z}` : z)), p)],
    ['ohne -ErrorAction Stop', pruefeBlock(gut.map((z) => z.replace(' -ErrorAction Stop', '')), p)],
    ['cd als Folgezeile', pruefeBlock(['& {', gut[1], `cd ${psArgument(p)}`, 'git status', '}'], p)],
    ['ohne Fuß', pruefeBlock(gut.slice(0, -1), p)],
    ['-Path statt -LiteralPath', pruefeBlock(gut.map((z) => z.replace('-LiteralPath', '-Path')), p)],
    ['Hinweis fehlt', pruefeHinweis(renderBefehlsblock({ sprache: 'powershell', zeilen: gut }).replace(/<p class="befehlsblock-enter">[^<]+<\/p>/, ''), true)],
    ['ru ohne Schlüssel', pruefeI18n({ ru: { ...ru, 'befehl.enterHinweis': undefined } })],
    ['View mit cdZeile(', pruefeQuelltext(QUELLEN.map((d) => (d.pfad.endsWith('code.js') ? { ...d, text: `${d.text}\ncdZeile(x)` } : d)))],
    ['Auftrag anlegen ohne befehlsBlock(', pruefeQuelltext(QUELLEN.map((d) => (d.pfad.endsWith('auftrag-umgebung.js') ? { ...d, text: d.text.replaceAll('befehlsBlock(', 'irgendwas(') } : d)))],
  ]
  if (rotPs !== null) rot.push(...rotPs)
  const verfehlt = rot.filter(([, b]) => b.length === 0).map(([name]) => name)
  pruefe(verfehlt.length === 0, `(g) Gegenproben: ${rot.length} verfälschte Eingänge erkannt.`, `(g) nicht erkannt: ${verfehlt.join(', ')}`)
}

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e):`)
  for (const b of befunde) console.error(`  - ${b}`)
  process.exit(1)
}
console.log('\n✓ Keine Befunde.')
