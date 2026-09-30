/**
 * Datei: scripts/check-f43-projekt-aufrufen.mjs
 *
 * Zweck: Gate für F43 „Projekt aufrufen/anzeigen“ (features/F43/feature.md, Variante A). Prüft:
 *   (a) Startvorlage: ohne die neuen Felder bitgenau gültig (committete Vorlagen unverändert);
 *       Rot: startbefehl leer/kein Array/.cmd/.bat/.com/.ps1, startZeitgrenzeMs außerhalb 1…Max,
 *       ergebnis_datei mit '..', absolut, Backslash, '*', leer;
 *   (b) Aufruf gegen einen echten HTTP-Testserver (Dispatcher /api/projekte/<id>/projekt-aufruf)
 *       mit einem Wegwerf-Repo: Grünfall mit Ergebnisdatei, Exit ≠ 0, Zeitgrenze überschritten →
 *       Prozess samt Kindprozess beendet und gemeldet, ungültiges Startziel zur Laufzeit, kein
 *       startbefehl → 409, zweiter paralleler Aufruf → 409, Laufstart während des Aufrufs → 409,
 *       aktiver Lauf dieses Projekts → 409 (eines anderen Projekts nicht), fremde Seite (CSRF) → 403
 *       ohne Ausführung;
 *   (c) ergebnis_datei: Binärdatei nur mit Größe, Übergröße gekürzt, veraltete Datei markiert,
 *       Symlink aus dem Repo heraus nicht gelesen (übersprungen, wenn das OS keinen Symlink erlaubt);
 *   (d) Anzeige: HTML in stdout/stderr/Ergebnisdatei wird escaped; Hinweise ohne vorschau_url bzw.
 *       ohne startbefehl;
 *   (e) Vorschau: erreichbar, nicht erreichbar (geschlossener Port, keine Antwort binnen Zeitgrenze),
 *       nicht-lokale URL wird nicht angefragt;
 *   (f) Regel 1j: die im Repo liegende Startvorlage geht weiter in die Prüfketten-Muster ein
 *       (Quelltext-Vertrag; der Verhaltensnachweis ist Fall (m) in check-fixpaket-f30-vorbedingungen.mjs).
 *
 * Wird aufgerufen von: npm run check.
 *
 * Aufruf: node scripts/check-f43-projekt-aufrufen.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { renderAufrufBereich, renderAufrufErgebnis, renderVorschau } from '../public/leitstand/projekt-aufruf-anzeige.js'
import { VORSCHAU_ZEITGRENZE_MS, fuehreAufrufDurch, pruefeVorschau } from '../src/projekt-aufruf/index.ts'
import { MAX_START_ZEITGRENZE_MS, validiereStartvorlageDaten } from '../src/startvorlage/index.ts'
import { erzeugeMultiProjektDispatcher, erzeugeRequestHandler } from './leitstand-server.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
console.log('\n=== F43-Projekt-aufrufen-Check ===\n')

const TEST_WURZEL = join(tmpdir(), `check-f43-${randomUUID()}`)
const BASIS_VORLAGE = JSON.parse(readFileSync('startvorlagen/beispielprojekt.json', 'utf8'))
const NODE = process.execPath

/** @param bedingung - erwartetes Ergebnis @param ok - Meldung bei Erfolg @param fehler - Befund sonst */
function pruefe(bedingung, ok, fehler) {
  if (bedingung) console.log(`✓ ${ok}`)
  else befunde.push(fehler)
}

/** Escaping wie escapeHtml (render.js), für den Vergleich erwarteter Anzeige-Texte. */
const escapeText = (t) => t.replace(/[&<>"']/g, (z) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[z])

const warte = (ms) => new Promise((r) => setTimeout(r, ms))

/** @param pid - Prozess-id @returns true, solange der Prozess lebt */
function lebt(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

// ─── (a) Startvorlage ─────────────────────────────────────────────────────────────────────────
for (const pfad of ['startvorlagen/beispielprojekt.json', 'startvorlagen/ai-workforce.json']) {
  const roh = readFileSync(pfad, 'utf8')
  const v = validiereStartvorlageDaten(JSON.parse(roh))
  pruefe(v.length === 0 && !/startbefehl|ergebnis_datei|startZeitgrenzeMs/.test(roh), `(a) ${pfad} ohne neue Felder bleibt unverändert gültig`, `(a) ${pfad}: ${v.join('; ')}`)
}
const rotStart = [[], [''], 'node', [String.raw`C:\x\npm.cmd`], [String.raw`C:\x\a.BAT`], [String.raw`C:\x\a.com`], [String.raw`C:\x\a.ps1`]]
for (const wert of rotStart) {
  const v = validiereStartvorlageDaten({ ...BASIS_VORLAGE, startbefehl: wert })
  pruefe(v.some((t) => t.includes('startbefehl')), `(a) startbefehl ${JSON.stringify(wert)} abgewiesen`, `(a) startbefehl ${JSON.stringify(wert)} fälschlich gültig`)
}
for (const wert of [0, -1, 1.5, '1000', MAX_START_ZEITGRENZE_MS + 1]) {
  const v = validiereStartvorlageDaten({ ...BASIS_VORLAGE, startbefehl: [NODE], startZeitgrenzeMs: wert })
  pruefe(v.some((t) => t.includes('startZeitgrenzeMs')), `(a) startZeitgrenzeMs ${JSON.stringify(wert)} abgewiesen`, `(a) startZeitgrenzeMs ${JSON.stringify(wert)} fälschlich gültig`)
}
for (const wert of ['..', '../x.md', 'a/../b.md', '/abs.md', 'C:/x.md', 'a\\b.md', '', 'ergebnis/*.md', 'a?.md', 7]) {
  const v = validiereStartvorlageDaten({ ...BASIS_VORLAGE, ergebnis_datei: wert })
  pruefe(v.some((t) => t.includes('ergebnis_datei')), `(a) ergebnis_datei ${JSON.stringify(wert)} abgewiesen`, `(a) ergebnis_datei ${JSON.stringify(wert)} fälschlich gültig`)
}
{
  const v = validiereStartvorlageDaten({ ...BASIS_VORLAGE, startbefehl: [NODE, 'x.mjs'], startZeitgrenzeMs: MAX_START_ZEITGRENZE_MS, ergebnis_datei: 'ausgabe/ergebnis.md' })
  pruefe(v.length === 0, '(a) gültige Aufruf-Felder werden angenommen', `(a) gültige Aufruf-Felder abgewiesen: ${v.join('; ')}`)
}

// ─── (b)–(e) echter Testserver ───────────────────────────────────────────────────────────────
const SKRIPTE = {
  'gruen.mjs': `import { writeFileSync } from 'node:fs'
writeFileSync('ergebnis.md', '# Ergebnis\\n<script>alert(1)</script>\\n')
console.log('<b>fett</b> aus stdout'); console.error('<img src=x onerror=alert(2)>')`,
  'rot.mjs': `console.error('kaputt'); process.exit(3)`,
  'haengt.mjs': `import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
const kind = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], { stdio: 'ignore' })
writeFileSync('pids.json', JSON.stringify([process.pid, kind.pid]))
setTimeout(() => {}, 60000)`,
  'langsam.mjs': `setTimeout(() => console.log('fertig'), 1500)`,
  'binaer.mjs': `import { writeFileSync } from 'node:fs'
writeFileSync('bild.png', Buffer.alloc(300, 1))`,
  'gross.mjs': `import { writeFileSync } from 'node:fs'
writeFileSync('gross.txt', 'x'.repeat(70000))`,
  'nichts.mjs': `console.log('schreibt nichts')`,
  'haengt-erbt.mjs': `import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
const kind = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'inherit' })
writeFileSync('pids.json', JSON.stringify([process.pid, kind.pid]))
setTimeout(() => {}, 60000)`,
  'echo.mjs': `console.log(JSON.stringify({ argv: process.argv.slice(2), leitstand: Object.keys(process.env).filter((k) => k.startsWith('LEITSTAND_')) }))`,
}

/**
 * Baut eine Projekt-Instanz mit eigenem Wegwerf-Repo und eigener Startvorlage.
 * @param name - Unterordner
 * @param felder - Aufruf-Felder der Startvorlage
 * @param extra - weitere erzeugeRequestHandler-Optionen
 * @returns { handler, repo, basisVerzeichnis, globalerLaufZustand }
 */
function baueInstanz(name, felder, extra = {}) {
  const repo = join(TEST_WURZEL, name)
  const basisVerzeichnis = join(repo, 'kontrollzustand')
  mkdirSync(basisVerzeichnis, { recursive: true })
  for (const [datei, inhalt] of Object.entries(SKRIPTE)) writeFileSync(join(repo, datei), inhalt)
  const startvorlagePfad = join(repo, 'startvorlage.json')
  writeFileSync(startvorlagePfad, JSON.stringify({ ...BASIS_VORLAGE, ...felder }))
  const globalerLaufZustand = { aktiv: false, laufId: null, abortController: null }
  const handler = erzeugeRequestHandler({
    fuehreAufgabeDurchFn: async () => ({ ok: false, stufe: 'gateway', grund: 'attrappe (F43-Gate)' }),
    basisVerzeichnis,
    startvorlagePfad,
    repoWurzel: repo,
    settingsPfad: join(repo, '.claude', 'settings.json'),
    aktuelleAutorisierungPfad: join(repo, 'state', 'aktuelle-autorisierung.json'),
    cwd: repo,
    globalerLaufZustand,
    projektId: name,
    ...extra,
  })
  return { handler, repo, basisVerzeichnis, globalerLaufZustand }
}

const instanzen = {
  gruen: baueInstanz('gruen', { startbefehl: [NODE, 'gruen.mjs'], ergebnis_datei: 'ergebnis.md' }),
  rot: baueInstanz('rot', { startbefehl: [NODE, 'rot.mjs'] }),
  haengt: baueInstanz('haengt', { startbefehl: [NODE, 'haengt.mjs'], startZeitgrenzeMs: 1500 }),
  langsam: baueInstanz('langsam', { startbefehl: [NODE, 'langsam.mjs'] }),
  ohne: baueInstanz('ohne', {}),
  relativ: baueInstanz('relativ', { startbefehl: ['node', 'gruen.mjs'] }),
  binaer: baueInstanz('binaer', { startbefehl: [NODE, 'binaer.mjs'], ergebnis_datei: 'bild.png' }),
  gross: baueInstanz('gross', { startbefehl: [NODE, 'gross.mjs'], ergebnis_datei: 'gross.txt' }),
  alt: baueInstanz('alt', { startbefehl: [NODE, 'nichts.mjs'], ergebnis_datei: 'alt.md' }),
  symlink: baueInstanz('symlink', { startbefehl: [NODE, 'nichts.mjs'], ergebnis_datei: 'link/geheim.md' }),
  lauf: baueInstanz('lauf', { startbefehl: [NODE, 'gruen.mjs'] }),
  erbt: baueInstanz('erbt', { startbefehl: [NODE, 'haengt-erbt.mjs'], startZeitgrenzeMs: 1500 }),
  fehltProgramm: baueInstanz('fehltProgramm', { startbefehl: [join(TEST_WURZEL, 'gibt-es-nicht.exe')] }),
  ordner: baueInstanz('ordner', { startbefehl: [NODE, 'nichts.mjs'], ergebnis_datei: 'ordner' }),
  fehltDatei: baueInstanz('fehltDatei', { startbefehl: [NODE, 'nichts.mjs'], ergebnis_datei: 'fehlt.md' }),
  echo: baueInstanz('echo', { startbefehl: [NODE, 'echo.mjs', 'a b', 'x&y', '%PATH%', '"q"'] }),
}
mkdirSync(join(instanzen.ordner.repo, 'ordner'))
process.env.LEITSTAND_F43_GATE_PROBE = '1'
writeFileSync(join(instanzen.alt.repo, 'alt.md'), 'von früher')

const map = new Map(Object.entries(instanzen).map(([id, i]) => [id, i.handler]))
const server = createServer(erzeugeMultiProjektDispatcher(map, instanzen.ohne.handler))
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const BASIS = `http://127.0.0.1:${server.address().port}`

/** POST auf den Aufruf-Endpunkt eines Projekts. @returns { status, koerper } */
async function rufeAuf(id, headers = {}) {
  const antwort = await fetch(`${BASIS}/api/projekte/${id}/projekt-aufruf`, { method: 'POST', body: '{}', headers })
  return { status: antwort.status, koerper: await antwort.json().catch(() => ({})) }
}

try {
  // Grünfall mit Ergebnisdatei und HTML in der Ausgabe
  {
    const { status, koerper } = await rufeAuf('gruen')
    const e = koerper.ergebnis
    pruefe(
      status === 200 && e?.ausgang === 'GRUEN' && e.exit_code === 0 && e.ergebnis_datei?.vorhanden && e.ergebnis_datei.ausDiesemAufruf && e.ergebnis_datei.text.includes('<script>'),
      '(b) Aufruf führt startbefehl einmal aus: Exit 0, Dauer, Ergebnisdatei aus diesem Aufruf gelesen',
      `(b) Grünfall: ${status} ${JSON.stringify(koerper)}`
    )
    const html = renderAufrufErgebnis(e)
    pruefe(
      !/<script>|<b>|<img/.test(html) && html.includes('&lt;script&gt;') && html.includes('&lt;b&gt;') && html.includes('&lt;img'),
      '(d) HTML in stdout, stderr und Ergebnisdatei wird escaped, nie gerendert',
      `(d) Escaping unvollständig: ${html}`
    )
    const get = await (await fetch(`${BASIS}/api/projekte/gruen/projekt-aufruf`)).json()
    pruefe(get.letzterAufruf?.gestartet_am === e?.gestartet_am && get.aktiv === false, '(b) GET nennt den letzten Aufruf (flüchtig gehalten)', `(b) GET ohne letzten Aufruf: ${JSON.stringify(get)}`)
  }

  {
    const { status, koerper } = await rufeAuf('rot')
    pruefe(status === 200 && koerper.ergebnis?.ausgang === 'ROT' && koerper.ergebnis.exit_code === 3 && koerper.ergebnis.stderr_ende.includes('kaputt'), '(b) Exit ≠ 0 wird mit Code und stderr gemeldet', `(b) Exit 3: ${JSON.stringify(koerper)}`)
  }

  // Zeitgrenze: Prozess samt Kindprozess beendet
  {
    const vorher = Date.now()
    const { status, koerper } = await rufeAuf('haengt')
    const dauer = Date.now() - vorher
    let pids = []
    try {
      pids = JSON.parse(readFileSync(join(instanzen.haengt.repo, 'pids.json'), 'utf8'))
    } catch {
      // pids fehlen → Befund unten
    }
    await warte(1000)
    const ueberlebende = pids.filter(lebt)
    pruefe(
      status === 200 && koerper.ergebnis?.ausgang === 'ZEITGRENZE' && koerper.ergebnis.exit_code === null && dauer < 15000 && pids.length === 2 && ueberlebende.length === 0,
      '(b) Zeitgrenze überschritten → ZEITGRENZE gemeldet, Prozess und Kindprozess beendet',
      `(b) Zeitgrenze: ${status} ${JSON.stringify(koerper.ergebnis)} Dauer ${dauer} ms, pids ${JSON.stringify(pids)}, überlebend ${JSON.stringify(ueberlebende)}`
    )
    for (const pid of ueberlebende) process.kill(pid)
  }

  // Enkel erbt stdout: Baum-Kill an der eigenen Zeitgrenze (Review P1)
  {
    const vorher = Date.now()
    const { status, koerper } = await rufeAuf('erbt')
    const dauer = Date.now() - vorher
    let pids = []
    try {
      pids = JSON.parse(readFileSync(join(instanzen.erbt.repo, 'pids.json'), 'utf8'))
    } catch {
      // pids fehlen → Befund unten
    }
    await warte(1000)
    const ueberlebende = pids.filter(lebt)
    pruefe(
      status === 200 && koerper.ergebnis?.ausgang === 'ZEITGRENZE' && pids.length === 2 && ueberlebende.length === 0 && dauer < 1500 + 4000,
      '(b) Enkel mit geerbter Ausgabe: Baum an der Zeitgrenze beendet, Aufruf endet ohne Hänger',
      `(b) Enkel erbt stdout: ${status} ${JSON.stringify(koerper.ergebnis)} Dauer ${dauer} ms, überlebend ${JSON.stringify(ueberlebende)}`
    )
    for (const pid of ueberlebende) process.kill(pid)
  }

  // Prozessende bleibt ganz aus (z. B. Nicht-Node-Kind, dessen Enkel die Pipe hält): harte Nachfrist löst auf
  {
    const vorher = Date.now()
    const e = await fuehreAufrufDurch([NODE, 'x.mjs'], instanzen.ohne.repo, 300, undefined, { starter: () => new Promise(() => {}), nachfristMs: 200 })
    pruefe(e.ausgang === 'ZEITGRENZE' && e.stderr_ende.includes('Ausgabe offen') && Date.now() - vorher < 3000, '(b) ohne Prozessende löst die harte Nachfrist den Aufruf auf (Sperre fällt)', `(b) Nachfrist: ${JSON.stringify(e)}`)
  }

  // Delta-Review P2: nach dem 'exit' des direkten Kindes (beiExit) wird dessen alte PID an der Grenze
  // NICHT mehr gekillt — sie könnte einem fremden Prozess gehören. Gegenprobe: ohne Exit wird sie beendet.
  // Abgesichert ist nur die Reihenfolge Exit → Timer; „Exit während taskkill läuft“ ist unter Windows
  // mit einer fremden PID nicht sinnvoll prüfbar (taskkill träfe sie ohnehin).
  {
    const fremd = spawn(NODE, ['-e', 'setTimeout(() => {}, 30000)'], { stdio: 'ignore' })
    const kind = spawn(NODE, ['-e', 'setTimeout(() => {}, 30000)'], { stdio: 'ignore' })
    const nachExit = await fuehreAufrufDurch([NODE, 'x.mjs'], instanzen.ohne.repo, 300, undefined, {
      starter: (_z, _t, o) => {
        o.beiStart(fremd.pid)
        o.beiExit()
        return new Promise(() => {})
      },
      nachfristMs: 200,
    })
    await fuehreAufrufDurch([NODE, 'x.mjs'], instanzen.ohne.repo, 300, undefined, {
      starter: (_z, _t, o) => {
        o.beiStart(kind.pid)
        return new Promise(() => {})
      },
      nachfristMs: 200,
    })
    await warte(3500)
    const fremdLebt = lebt(fremd.pid)
    const kindLebt = lebt(kind.pid)
    fremd.kill()
    kind.kill()
    pruefe(
      fremdLebt && !kindLebt && nachExit.ausgang === 'ZEITGRENZE',
      '(b) nach gemeldetem Exit kein Kill auf die freie PID; ein noch lebendes Kind wird an der Grenze beendet',
      `(b) PID-Schutz: fremd lebt ${fremdLebt} (erwartet true), Kind lebt ${kindLebt} (erwartet false)`
    )
  }

  {
    const { koerper } = await rufeAuf('fehltProgramm')
    pruefe(koerper.ergebnis?.ausgang === 'FEHLER' && koerper.ergebnis.stderr_ende.includes('keine existierende Datei'), '(b) nicht existierendes absolutes Startziel → FEHLER mit Grund', `(b) Startziel fehlt: ${JSON.stringify(koerper)}`)
    const echo = (await rufeAuf('echo')).koerper.ergebnis
    let gelesen = null
    try {
      gelesen = JSON.parse(echo?.stdout_ende ?? '')
    } catch {
      // Befund unten
    }
    pruefe(
      JSON.stringify(gelesen?.argv) === JSON.stringify(['a b', 'x&y', '%PATH%', '"q"']) && gelesen.leitstand.length === 0,
      '(b) argv kommt wörtlich an (keine Shell: Leerzeichen, &, %PATH%, Anführungszeichen) und ohne LEITSTAND_*-Variablen',
      `(b) argv/Umgebung: ${echo?.stdout_ende}`
    )
    const ordner = (await rufeAuf('ordner')).koerper.ergebnis?.ergebnis_datei
    const fehlt = (await rufeAuf('fehltDatei')).koerper.ergebnis?.ergebnis_datei
    pruefe(ordner?.vorhanden === false && ordner.grund.includes('keine reguläre Datei') && fehlt?.vorhanden === false && fehlt.grund.includes('fehlt'), '(c) ergebnis_datei als Verzeichnis bzw. fehlend → gemeldet, nicht gelesen', `(c) Verzeichnis/fehlt: ${JSON.stringify([ordner, fehlt])}`)
  }

  {
    const { status, koerper } = await rufeAuf('relativ')
    pruefe(status === 200 && koerper.ergebnis?.ausgang === 'FEHLER' && koerper.ergebnis.stderr_ende.includes('kein absoluter Pfad'), '(b) relatives Startziel scheitert zur Laufzeit an pruefeStartziel (FEHLER, kein Start)', `(b) relatives Startziel: ${JSON.stringify(koerper)}`)
  }

  {
    const { status, koerper } = await rufeAuf('ohne')
    const get = await (await fetch(`${BASIS}/api/projekte/ohne/projekt-aufruf`)).json()
    pruefe(status === 409 && koerper.grund.includes('startbefehl') && get.startbefehl === null, '(b) ohne startbefehl → 409 mit Hinweis', `(b) ohne startbefehl: ${status} ${JSON.stringify(koerper)}`)
    pruefe(
      get.startvorlage === 'startvorlage.json' && renderAufrufBereich(get, 'ohne').includes('<code>startbefehl</code>') && renderAufrufBereich(get, 'ohne').includes('<code>startvorlage.json</code>'),
      '(d) Anzeige nennt, wie startbefehl gesetzt wird, und die tatsächlich geladene Startvorlage',
      `(d) Hinweis zu startbefehl/Startvorlage fehlt: ${JSON.stringify(get)}`
    )
    const mitBefehl = renderAufrufBereich({ ...get, startbefehl: [NODE, 'a b.mjs'] }, 'ohne')
    pruefe(mitBefehl.includes(escapeText(JSON.stringify([NODE, 'a b.mjs']))), '(d) argv wird als Liste gezeigt (Argumentgrenzen erkennbar)', `(d) argv-Anzeige: ${mitBefehl}`)
  }

  // Parallel: zweiter Aufruf und Laufstart während des Aufrufs → 409
  {
    const erster = rufeAuf('langsam')
    await warte(150)
    const zweiter = await rufeAuf('langsam')
    const laufStart = await fetch(`${BASIS}/api/projekte/langsam/laeufe`, {
      method: 'POST',
      body: JSON.stringify({ laufId: `f43-${randomUUID()}`, rolle: 'ausfuehrung', anfragen: [], budget: {}, aufrufEingaben: { modell: 'test' }, werkzeugsatz: 'lesend', auftragId: 'a' }),
    })
    const ersterErgebnis = await erster
    pruefe(zweiter.status === 409 && ersterErgebnis.status === 200, '(b) zweiter paralleler Aufruf → 409, der erste läuft zu Ende', `(b) parallel: erster ${ersterErgebnis.status}, zweiter ${zweiter.status} ${JSON.stringify(zweiter.koerper)}`)
    pruefe(laufStart.status === 409, '(b) Laufstart im selben Projekt während eines Aufrufs → 409', `(b) Laufstart während Aufruf: ${laufStart.status}`)
    const danach = await rufeAuf('langsam')
    pruefe(danach.status === 200, '(b) nach dem Ende ist ein neuer Aufruf wieder möglich', `(b) Aufruf danach: ${danach.status}`)
  }

  // Aktiver Workforce-Lauf: dieses Projekt → 409, anderes Projekt → kein Hindernis
  {
    const i = instanzen.lauf
    const laufId = `lauf-${randomUUID()}`
    i.globalerLaufZustand.aktiv = true
    i.globalerLaufZustand.laufId = laufId
    const fremd = await rufeAuf('lauf')
    mkdirSync(join(i.basisVerzeichnis, laufId))
    const hier = await rufeAuf('lauf')
    i.globalerLaufZustand.aktiv = false
    i.globalerLaufZustand.laufId = null
    pruefe(hier.status === 409 && fremd.status === 200, '(b) aktiver Lauf dieses Projekts → 409; Lauf eines anderen Projekts sperrt nicht', `(b) Lauf aktiv: hier ${hier.status}, fremd ${fremd.status}`)
  }

  // CSRF: fremde Seite → 403, nichts ausgeführt
  {
    const i = baueInstanz('csrf', { startbefehl: [NODE, 'gruen.mjs'], ergebnis_datei: 'ergebnis.md' })
    map.set('csrf', i.handler)
    const a = await rufeAuf('csrf', { Origin: 'http://boese.example', 'Sec-Fetch-Site': 'cross-site' })
    const b = await rufeAuf('csrf', { 'Sec-Fetch-Site': 'cross-site' })
    const get = await (await fetch(`${BASIS}/api/projekte/csrf/projekt-aufruf`)).json()
    let geschrieben = true
    try {
      readFileSync(join(i.repo, 'ergebnis.md'))
    } catch {
      geschrieben = false
    }
    pruefe(a.status === 403 && b.status === 403 && get.letzterAufruf === null && !geschrieben, '(b) Aufruf von fremder Seite (ohne CSRF-Berechtigung) → 403, nichts ausgeführt', `(b) CSRF: ${a.status}/${b.status}, letzter ${JSON.stringify(get.letzterAufruf)}, geschrieben ${geschrieben}`)
  }

  // (c) Ergebnisdatei-Randfälle
  {
    const bin = (await rufeAuf('binaer')).koerper.ergebnis?.ergebnis_datei
    pruefe(bin?.vorhanden && bin.text === null && bin.bytes === 300, '(c) Nicht-Text-Datei: nur „vorhanden, n Bytes“', `(c) binär: ${JSON.stringify(bin)}`)
    const gross = (await rufeAuf('gross')).koerper.ergebnis?.ergebnis_datei
    pruefe(gross?.gekuerzt && gross.text.length === 64000 && gross.bytes === 70000, '(c) Übergroße Textdatei wird auf die Obergrenze gekürzt', `(c) groß: ${JSON.stringify({ ...gross, text: gross?.text?.length })}`)
    const alt = (await rufeAuf('alt')).koerper.ergebnis?.ergebnis_datei
    pruefe(alt?.vorhanden && alt.ausDiesemAufruf === false && renderAufrufErgebnis({ ...(await rufeAuf('alt')).koerper.ergebnis }).includes('unverändert seit vor dem Aufruf'), '(c) unveränderte Altdatei wird als solche markiert', `(c) alt: ${JSON.stringify(alt)}`)
    // Verzeichnis-Junction (Windows, ohne Adminrechte) bzw. Symlink: link/ zeigt aus dem Repo heraus.
    const aussen = join(TEST_WURZEL, 'aussen')
    mkdirSync(aussen)
    writeFileSync(join(aussen, 'geheim.md'), 'außerhalb')
    let symlinkMoeglich = true
    try {
      symlinkSync(aussen, join(instanzen.symlink.repo, 'link'), 'junction')
    } catch {
      symlinkMoeglich = false
    }
    if (symlinkMoeglich) {
      const link = (await rufeAuf('symlink')).koerper.ergebnis?.ergebnis_datei
      pruefe(link?.vorhanden === false && link.grund.includes('Repo-Wurzel'), '(c) Symlink aus dem Repo heraus wird nicht gelesen', `(c) Symlink: ${JSON.stringify(link)}`)
    } else {
      console.log('– (c) Symlink-Fall übersprungen: das Betriebssystem erlaubt diesem Benutzer keinen Symlink')
    }
  }

  // (e) Vorschau
  {
    const vorschauServer = createServer((_req, res) => res.end('ok'))
    await new Promise((r) => vorschauServer.listen(0, '127.0.0.1', r))
    const offen = `http://127.0.0.1:${vorschauServer.address().port}`
    const stummServer = createServer(() => {})
    await new Promise((r) => stummServer.listen(0, '127.0.0.1', r))
    const stumm = `http://127.0.0.1:${stummServer.address().port}`
    const iOffen = baueInstanz('vorschau', {}, { vorschauUrl: offen })
    map.set('vorschau', iOffen.handler)
    const erreichbar = await (await fetch(`${BASIS}/api/projekte/vorschau/projekt-aufruf`)).json()
    await new Promise((r) => vorschauServer.close(r))
    const zu = await pruefeVorschau(offen)
    const keineAntwort = await pruefeVorschau(stumm, 300)
    stummServer.closeAllConnections()
    await new Promise((r) => stummServer.close(r))
    const fremd = await pruefeVorschau('http://example.com:80')
    const umleitServer = createServer((_req, res) => {
      res.writeHead(302, { Location: 'http://127.0.0.1:1/' })
      res.end()
    })
    await new Promise((r) => umleitServer.listen(0, '127.0.0.1', r))
    const umleitung = await pruefeVorschau(`http://127.0.0.1:${umleitServer.address().port}`)
    await new Promise((r) => umleitServer.close(r))
    pruefe(umleitung.erreichbar === true && umleitung.grund === 'HTTP 302' && VORSCHAU_ZEITGRENZE_MS === 2000, '(e) Weiterleitung wird nicht verfolgt (HTTP 302 = erreichbar); Zeitgrenze der Prüfung 2000 ms', `(e) Weiterleitung/Grenze: ${JSON.stringify(umleitung)} ${VORSCHAU_ZEITGRENZE_MS}`)
    const ohne = await (await fetch(`${BASIS}/api/projekte/ohne/projekt-aufruf`)).json()
    pruefe(erreichbar.vorschau?.erreichbar === true && renderVorschau(erreichbar.vorschau).includes('target="_blank"'), '(e) vorschau_url erreichbar, mit „Öffnen“ im neuen Tab', `(e) erreichbar: ${JSON.stringify(erreichbar.vorschau)}`)
    pruefe(zu.erreichbar === false && keineAntwort.erreichbar === false && keineAntwort.grund.includes('300 ms'), '(e) nicht erreichbar bei geschlossenem Port und bei ausbleibender Antwort (Zeitgrenze)', `(e) nicht erreichbar: ${JSON.stringify([zu, keineAntwort])}`)
    pruefe(fremd.url === null && fremd.erreichbar === null, '(e) nicht-lokale URL wird nicht angefragt', `(e) fremde URL: ${JSON.stringify(fremd)}`)
    pruefe(ohne.vorschau?.url === null && renderVorschau(ohne.vorschau).includes('<code>vorschau_url</code>'), '(e) ohne vorschau_url: Hinweis, wie sie gesetzt wird', `(e) ohne URL: ${JSON.stringify(ohne.vorschau)}`)
  }

  // (f) Regel 1j: Startvorlage im Repo bleibt Teil der Prüfkette
  {
    const quelle = readFileSync('scripts/leitstand-server.mjs', 'utf8')
    pruefe(
      /const vorlageMuster = startvorlageImRepo/.test(quelle) && /wirksamePruefkettenMuster\(\[.*\.\.\.vorlageMuster\]\)/.test(quelle),
      '(f) Regel 1j überwacht die im Repo liegende Startvorlage (und damit startbefehl) — Verhalten: check-fixpaket-f30-vorbedingungen (m)',
      '(f) Die Startvorlage fehlt in den Prüfketten-Mustern von Regel 1j'
    )
  }
} finally {
  server.closeAllConnections()
  await new Promise((r) => server.close(r))
  raeumeVerzeichnis(TEST_WURZEL)
}

if (befunde.length > 0) {
  console.error(`\n${befunde.length} Befund(e):`)
  for (const b of befunde) console.error(`  - ${b}`)
  process.exit(1)
}
console.log('\nF43-Gate grün.')
