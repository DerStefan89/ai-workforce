#!/usr/bin/env node
/**
 * Datei: scripts/messe-chat.mjs
 *
 * Zweck: Wiederholbare Messung des Chats (Jarvis, Product Coach) über die echte Oberfläche (F45 B0,
 * Abnahmekriterien K1–K4 in docs/projekt/fixpaket-f45.md). Startet einen eigenen Leitstand als
 * Kindprozess (LEITSTAND_ZEITMESSUNG=1, Port 4199 als Standard), bedient den Chat headless per
 * Playwright (Nachricht eintippen, Senden, warten bis Antwort oder Fehler sichtbar sind), sammelt je
 * Turn Client-Zeile „[jarvis-latenz]“, Server-Zeile „[leitstand] Zeitmessung '<laufId>'“, Worker und
 * Modell aus der Laufakte, Endart und die Zahl laufender claude.exe-/codex.exe-Prozesse beim Start.
 * Parallel misst es alle 2 s die Dauer von GET /api/zustand und liest die Event-Loop-Zeilen
 * (scripts/leitstand/event-loop-messung.mjs). Ergebnis: features/F45/nachweise/b0/messung-<etikett>.md
 * (Tabelle je Turn, Median und Max je Kennzahl, Umgebung) und .json.
 *
 * Aufruf (aus dem Hauptordner, Stefans Leitstand geschlossen):
 *   node scripts/messe-chat.mjs --modus jarvis|sparring --turns N --etikett <text>
 *     [--startvorlage <pfad>] [--warmlauf-min M] [--untermodus feature|projekt] [--port 4199]
 *     [--speicher-untergrenze-mb 1536]
 *
 * Wird aufgerufen von: Hand (F45 B0 Vorher-/Nachher-Messung, später WS P und R). Nicht Teil von
 * `npm run check` — braucht echte Modell-Läufe und einen Browser (Muster scripts/render-nachweis.mjs).
 *
 * Wichtig:
 * - Echte Läufe: jede Testfrage beginnt mit „[Messung F45-B0]“ und landet im echten Chat-Verlauf.
 * - Obergrenze je Turn 5 min; danach gilt der Turn als „hängt“, das Skript fordert „Lauf abbrechen“ an
 *   und wartet höchstens 2 min auf das Ende, sonst bricht es die restlichen Turns ab.
 * - Löscht und überschreibt nur die eigenen zwei Ausgabedateien; der Leitstand wird am Ende beendet.
 *   Unter Windows beendet kind.kill() hart, ohne Aufräumen — das Skript entfernt danach genau die
 *   Instanz-Locks (kontrollzustand/.leitstand.lock je Registerprojekt), die die PID dieses Kindes tragen.
 * - Die Zeilenformate der Server-Ausgabe (Zeitmessung, Event-Loop) und die Konsolenzeile des Clients
 *   sind die Schnittstelle — Änderungen dort brechen dieses Skript.
 * - Speicher (Challenger-Vorgabe nach dem Speicherabbruch des ersten Langlaufs): jede Minute RSS
 *   (Working Set) des Leitstand-Servers, RSS aller Chromium-Prozesse dieses Skripts, freier
 *   Systemspeicher und Zahl der claude.exe — als Tabelle in der Messdatei. Fällt der freie Speicher
 *   unter SPEICHER_UNTERGRENZE_STANDARD_MB (1,5 GB), bricht das Skript selbst ab: Leitstand und Chromium werden
 *   beendet, die gesammelten Werte und der Grund geschrieben, Exit 2.
 */

import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { freemem } from 'node:os'
import { join, resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { setTimeout as warte } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const WURZEL = resolve(fileURLToPath(new URL('..', import.meta.url)))
const AUSGABE_VERZEICHNIS = join(WURZEL, 'features', 'F45', 'nachweise', 'b0')
const TURN_GRENZE_MS = 5 * 60 * 1000
const ABBRUCH_WARTEN_MS = 2 * 60 * 1000
const ZUSTAND_TAKT_MS = 2000
const SPEICHER_TAKT_MS = 60_000
/** Selbstabbruch unter 1,5 GB freiem Systemspeicher (überschreibbar mit --speicher-untergrenze-mb, z. B. für die Probe des Abbruchwegs). */
const SPEICHER_UNTERGRENZE_STANDARD_MB = 1536

/**
 * Feste, kurze Testfragen je Modus; jede beginnt mit „[Messung F45-B0]“. Zwei Konstanten statt eines
 * Objekts mit Rollennamen als Schlüssel (scripts/check-f17-rollenvertrag.mjs AK1: keine zweite Rollenliste).
 */
const FRAGEN_JARVIS = [
    '[Messung F45-B0] Antworte bitte nur mit dem Wort OK.',
    '[Messung F45-B0] Wie heißt dieses Projekt? Antworte in einem Satz.',
    '[Messung F45-B0] Nenne den aktuellen Meilenstein in einem Satz.',
    '[Messung F45-B0] Was ist F45? Ein Satz genügt.',
    '[Messung F45-B0] Antworte nur mit der Zahl: Wie viel ist 7 mal 6?',
    '[Messung F45-B0] Nenne ein offenes P1-Finding mit ID, ohne Erklärung.',
    '[Messung F45-B0] Antworte nur mit Ja oder Nein: Ist F46 abgeschlossen?',
    '[Messung F45-B0] In welcher Sprache ist der Code dieses Projekts geschrieben? Ein Wort.',
    '[Messung F45-B0] Fasse das Projektziel in höchstens zehn Wörtern zusammen.',
    '[Messung F45-B0] Antworte bitte nur mit dem Wort Fertig.',
]
const FRAGEN_COACH = [
    '[Messung F45-B0] Idee: ein Knopf, der den Chatverlauf als Text kopiert. Stell mir nur eine kurze Rückfrage.',
    '[Messung F45-B0] Idee: im Leitstand die Uhrzeit des letzten Laufs anzeigen. Nur eine kurze Rückfrage, bitte.',
    '[Messung F45-B0] Idee: ein Filter für erledigte Findings. Nur eine kurze Rückfrage.',
    '[Messung F45-B0] Idee: ein Tastenkürzel zum Öffnen des Chats. Nur eine kurze Rückfrage.',
    '[Messung F45-B0] Idee: die Zahl offener Entscheidungen in der Seitenleiste. Nur eine kurze Rückfrage.',
]

/**
 * Liest die Kommandozeile.
 * @param argv - process.argv.slice(2)
 * @returns { modus, turns, etikett, startvorlage, warmlaufMin, untermodus, port, speicherUntergrenzeMb }
 */
function leseArgumente(argv) {
  const werte = {}
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i].startsWith('--') || argv[i + 1] === undefined) throw new Error(`Unerwartetes Argument: ${argv[i]}`)
    werte[argv[i].slice(2)] = argv[i + 1]
  }
  const modus = werte.modus ?? 'jarvis'
  if (!['jarvis', 'sparring'].includes(modus)) throw new Error("--modus muss 'jarvis' oder 'sparring' sein")
  const turns = Number(werte.turns ?? 5)
  const warmlaufMin = Number(werte['warmlauf-min'] ?? 0)
  const port = Number(werte.port ?? 4199)
  if (!Number.isInteger(turns) || turns < 1) throw new Error('--turns muss eine ganze Zahl ≥ 1 sein')
  if (!Number.isFinite(warmlaufMin) || warmlaufMin < 0) throw new Error('--warmlauf-min muss ≥ 0 sein')
  if (typeof werte.etikett !== 'string' || !/^[a-z0-9-]+$/i.test(werte.etikett)) throw new Error('--etikett ist Pflicht (Buchstaben, Ziffern, Bindestrich)')
  const untermodus = werte.untermodus ?? 'feature'
  if (!['feature', 'projekt'].includes(untermodus)) throw new Error("--untermodus muss 'feature' oder 'projekt' sein")
  const speicherUntergrenzeMb = Number(werte['speicher-untergrenze-mb'] ?? SPEICHER_UNTERGRENZE_STANDARD_MB)
  if (!Number.isFinite(speicherUntergrenzeMb) || speicherUntergrenzeMb < 0) throw new Error('--speicher-untergrenze-mb muss ≥ 0 sein')
  return { modus, turns, etikett: werte.etikett, startvorlage: werte.startvorlage ?? null, warmlaufMin, untermodus, port, speicherUntergrenzeMb }
}

/**
 * Liest Eintritt/Austritt Modern Standby (Kernel-Power 506/507) seit dem Messbeginn aus dem
 * Windows-Ereignisprotokoll — nur lesend. Belegt in der Vorher-Messung: ein „hängender“ Coach-Turn fiel
 * genau in ein Standby-Fenster (Netz getrennt, Event-Loop 272 s „blockiert“). Ohne diese Spalte wäre
 * ein solcher Turn als Serverfehler fehlgedeutet.
 * @param startIso - Messbeginn (ISO)
 * @returns Liste { zeit, ereignis } oder null, wenn das Protokoll nicht lesbar ist
 */
function leseStandbyEreignisse(startIso) {
  if (process.platform !== 'win32') return null
  const befehl = `Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-Kernel-Power'; Id=506,507; StartTime=[datetime]'${startIso}'} -ErrorAction SilentlyContinue | Sort-Object TimeCreated | ForEach-Object { '{0}|{1}' -f $_.TimeCreated.ToUniversalTime().ToString('o'), $_.Id }; exit 0`
  try {
    const ausgabe = execFileSync('powershell.exe', ['-NoProfile', '-Command', befehl], { encoding: 'utf8', windowsHide: true })
    return ausgabe
      .split(/\r?\n/)
      .filter((zeile) => zeile.includes('|'))
      .map((zeile) => {
        const [zeit, id] = zeile.trim().split('|')
        return { zeit, ereignis: id === '506' ? 'Standby beginnt' : 'Standby endet' }
      })
  } catch {
    return null
  }
}

/**
 * Eine Speicherprobe: Working Set des Servers (PID) und aller Chromium-Prozesse unter diesem Skript
 * (Prozessbaum ab process.pid aus Win32_Process, Name chrome bzw. headless_shell), freier Systemspeicher
 * (os.freemem), Zahl der claude.exe. Playwright startet Chromium als Kind dieses Node-Prozesses.
 * @param serverPid - PID des Leitstand-Kindprozesses
 * @param chromiumPid - Wurzel-PID für die Chromium-Suche (process.pid) oder null
 * @returns { zeit, serverMb, chromiumMb, freiMb, claude } — Felder null, wo nicht lesbar
 */
function speicherProbe(serverPid, chromiumPid) {
  const probe = { zeit: new Date().toISOString(), serverMb: null, chromiumMb: null, freiMb: Math.round(freemem() / 1024 ** 2), claude: null }
  if (process.platform !== 'win32') return probe
  try {
    const roh = execFileSync('powershell.exe', ['-NoProfile', '-Command', 'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,WorkingSetSize | ConvertTo-Json -Compress'], { encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024 })
    const prozesse = JSON.parse(roh)
    const mb = (bytes) => Math.round(bytes / 1024 ** 2)
    const server = prozesse.find((p) => p.ProcessId === serverPid)
    probe.serverMb = server ? mb(server.WorkingSetSize) : null
    if (chromiumPid !== null) {
      const baum = new Set([chromiumPid])
      let gewachsen = true
      while (gewachsen) {
        gewachsen = false
        for (const p of prozesse) {
          if (!baum.has(p.ProcessId) && baum.has(p.ParentProcessId)) {
            baum.add(p.ProcessId)
            gewachsen = true
          }
        }
      }
      const chromiumProzesse = prozesse.filter((p) => baum.has(p.ProcessId) && /chrom|headless_shell/i.test(String(p.Name)))
      probe.chromiumMb = mb(chromiumProzesse.reduce((summe, p) => summe + Number(p.WorkingSetSize ?? 0), 0))
    }
    probe.claude = prozesse.filter((p) => String(p.Name).toLowerCase() === 'claude.exe').length
  } catch {
    // Prozessliste nicht lesbar — nur der freie Speicher bleibt gesetzt.
  }
  return probe
}

/**
 * Startet die minütliche Speicherüberwachung mit Selbstabbruch-Signal.
 * @param serverPid - PID des Leitstands
 * @param chromiumPid - Wurzel-PID für die Chromium-Suche (process.pid) oder null
 * @param untergrenzeMb - Selbstabbruch unter diesem freien Systemspeicher (MB)
 * @returns { proben, abbruch: Promise<string> (löst bei Unterschreitung mit dem Grund auf), stoppe, unterschritten: () => string | null }
 */
function starteSpeicherUeberwachung(serverPid, chromiumPid, untergrenzeMb) {
  const proben = []
  let grund = null
  let melde
  const abbruch = new Promise((aufloesen) => {
    melde = aufloesen
  })
  const pruefe = () => {
    const probe = speicherProbe(serverPid, chromiumPid)
    proben.push(probe)
    if (grund === null && freemem() < untergrenzeMb * 1024 ** 2) {
      grund = `freier Systemspeicher ${probe.freiMb} MB < ${untergrenzeMb} MB (${probe.zeit})`
      melde(grund)
    }
  }
  pruefe()
  const timer = setInterval(pruefe, SPEICHER_TAKT_MS)
  return { proben, abbruch, stoppe: () => clearInterval(timer), unterschritten: () => grund }
}

/** @returns { claude, codex } — Zahl laufender claude.exe-/codex.exe-Prozesse (tasklist), null bei Fehler. */
function zaehleProzesse() {
  try {
    const ausgabe = execFileSync('tasklist', ['/FO', 'CSV', '/NH'], { encoding: 'utf8', windowsHide: true })
    const namen = ausgabe.split(/\r?\n/).map((zeile) => zeile.split('","')[0].replace(/^"/, '').toLowerCase())
    return { claude: namen.filter((n) => n === 'claude.exe').length, codex: namen.filter((n) => n === 'codex.exe').length }
  } catch {
    return { claude: null, codex: null }
  }
}

/** @param werte - Zahlen (null wird ignoriert) @returns { median, p95, max, anzahl } */
function kennzahlen(werte) {
  const zahlen = werte.filter((w) => typeof w === 'number' && Number.isFinite(w)).sort((a, b) => a - b)
  if (zahlen.length === 0) return { median: null, p95: null, max: null, anzahl: 0 }
  const mitte = Math.floor(zahlen.length / 2)
  const median = zahlen.length % 2 === 1 ? zahlen[mitte] : (zahlen[mitte - 1] + zahlen[mitte]) / 2
  const p95 = zahlen[Math.min(zahlen.length - 1, Math.ceil(zahlen.length * 0.95) - 1)]
  return { median: Math.round(median), p95: Math.round(p95), max: Math.round(zahlen.at(-1)), anzahl: zahlen.length }
}

/**
 * Startet den Leitstand als Kindprozess und wartet auf die Startzeile.
 * @param optionen - { port, startvorlage }
 * @returns { kind, zeilen, beenden } — zeilen sammelt jede stdout-/stderr-Zeile mit Zeitstempel
 */
async function starteLeitstand({ port, startvorlage }) {
  const env = { ...process.env, LEITSTAND_ZEITMESSUNG: '1', LEITSTAND_PORT: String(port) }
  if (startvorlage !== null) env.LEITSTAND_STARTVORLAGE_PFAD = startvorlage
  else delete env.LEITSTAND_STARTVORLAGE_PFAD
  const kind = spawn(process.execPath, ['scripts/leitstand-server.mjs'], { cwd: WURZEL, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
  const zeilen = []
  let beendet = false
  kind.on('exit', () => {
    beendet = true
  })
  for (const strom of [kind.stdout, kind.stderr]) {
    createInterface({ input: strom }).on('line', (zeile) => zeilen.push({ zeit: Date.now(), zeile }))
  }
  const frist = Date.now() + 60_000
  while (!zeilen.some((z) => z.zeile.startsWith('Leitstand läuft auf'))) {
    if (beendet) throw new Error(`Leitstand beendet sich beim Start:\n${zeilen.map((z) => z.zeile).join('\n')}`)
    if (Date.now() > frist) throw new Error('Leitstand meldet sich nicht innerhalb von 60 s')
    await warte(100)
  }
  const beenden = async () => {
    if (!beendet) kind.kill()
    for (let i = 0; i < 50 && !beendet; i++) await warte(100)
    entferneEigeneLocks(kind.pid)
  }
  return { kind, zeilen, beenden }
}

/**
 * Entfernt die Instanz-Locks (ARCHITECTURE.md §2) aller Registerprojekte, die die PID des beendeten
 * Kindprozesses tragen — fremde Locks bleiben unberührt.
 * @param pid - PID des beendeten Leitstands
 */
function entferneEigeneLocks(pid) {
  const repoPfade = new Set([WURZEL])
  for (const datei of ['projekte.json', 'projekte.lokal.json']) {
    try {
      for (const projekt of JSON.parse(readFileSync(join(WURZEL, datei), 'utf8')).projekte ?? []) repoPfade.add(resolve(WURZEL, projekt.repo_pfad))
    } catch {
      // Register fehlt oder ist ungültig — dann nur der eigene Ordner.
    }
  }
  for (const repo of repoPfade) {
    const lock = join(repo, 'kontrollzustand', '.leitstand.lock')
    try {
      if (existsSync(lock) && JSON.parse(readFileSync(lock, 'utf8')).pid === pid) rmSync(lock)
    } catch {
      // Unlesbarer Lock — nicht anfassen.
    }
  }
}

/**
 * Misst GET /api/zustand im Takt, bis stoppe() aufgerufen wird (immer nur eine Anfrage zur Zeit).
 * @param basis - http://127.0.0.1:<port>
 * @returns { messungen, stoppe }
 */
function starteZustandsMessung(basis) {
  const messungen = []
  let aktiv = true
  const schleife = (async () => {
    while (aktiv) {
      const start = performance.now()
      let status = null
      try {
        const antwort = await fetch(`${basis}/api/zustand`)
        status = antwort.status
        await antwort.arrayBuffer()
      } catch {
        status = 'netzfehler'
      }
      messungen.push({ zeit: Date.now(), ms: Math.round(performance.now() - start), status })
      await warte(ZUSTAND_TAKT_MS)
    }
  })()
  return {
    messungen,
    stoppe: async () => {
      aktiv = false
      await schleife
    },
  }
}

/** @param zeilen - Server-Zeilen @param laufId - gesuchte laufId @returns die zuletzt protokollierten Marken dieses Laufs, oder null */
function leseServerMarken(zeilen, laufId) {
  const praefix = `[leitstand] Zeitmessung '${laufId}': `
  const treffer = zeilen.filter((z) => z.zeile.startsWith(praefix)).at(-1)
  if (treffer === undefined) return null
  try {
    return JSON.parse(treffer.zeile.slice(praefix.length))
  } catch {
    return null
  }
}

/**
 * Leitet die Phasen aus den Server-Marken ab (performance.now()-Werte des Serverprozesses).
 * @param marken - Marken-Objekt oder null
 * @returns { k2, prozess, nachbereitung, serverGesamt } in ms (null, wo Marken fehlen)
 */
function serverPhasen(marken) {
  if (marken === null) return { k2: null, prozess: null, nachbereitung: null, serverGesamt: null }
  const differenz = (von, bis) => (typeof marken[von] === 'number' && typeof marken[bis] === 'number' ? Math.round(marken[bis] - marken[von]) : null)
  const ohneNachzuegler = Object.entries(marken).filter(([name]) => name !== 'prozess_close').map(([, wert]) => wert)
  const ende = ohneNachzuegler.length > 0 ? Math.max(...ohneNachzuegler) : null
  return {
    k2: differenz('request_eingang', 'prozess_gestartet'),
    prozess: differenz('prozess_gestartet', 'prozess_beendet'),
    nachbereitung: typeof marken.prozess_beendet === 'number' && ende !== null ? Math.round(ende - marken.prozess_beendet) : null,
    serverGesamt: typeof marken.request_eingang === 'number' && ende !== null ? Math.round(ende - marken.request_eingang) : null,
  }
}

/**
 * Liest den sichtbaren Ausgang des letzten Turns aus der Oberfläche.
 * @param page - Playwright-Seite
 * @returns { fehler: boolean, kopf, text, fehlerZeile }
 */
async function leseAusgang(page) {
  return page.evaluate(() => {
    const reihen = document.querySelectorAll('#chat-verlauf .chat-bubble-reihe-jarvis')
    const letzte = reihen[reihen.length - 1] ?? null
    const kopf = letzte?.querySelector('.chat-bubble-kopf')?.textContent?.trim() ?? ''
    const text = (letzte?.querySelector('.chat-bubble')?.textContent ?? '').replace(/\s+/g, ' ').trim()
    const fehlerAnzeige = document.getElementById('chat-fehler')
    const fehlerZeile = fehlerAnzeige && !fehlerAnzeige.hidden ? fehlerAnzeige.textContent.trim() : ''
    const fehler = letzte?.dataset.eintragArt === 'fehler' || kopf.startsWith('Lauf nicht erfolgreich')
    return { fehler, kopf, text, fehlerZeile }
  })
}

/**
 * Führt einen Turn aus: Eingabe, Senden, Warten auf Ende.
 * @param kontext - { page, basis, frage, clientZeilen, serverZeilen }
 * @returns Turn-Datensatz
 */
async function fuehreTurnAus({ page, basis, frage, clientZeilen, serverZeilen }) {
  const prozesse = zaehleProzesse()
  const clientZeilenVorher = clientZeilen.length
  await page.waitForFunction(() => !document.getElementById('chat-senden').disabled, null, { timeout: 30_000 })
  await page.fill('#chat-eingabe', frage)
  const antwortVersprechen = page.waitForResponse((r) => r.request().method() === 'POST' && /\/(chat|sparring)$/.test(new URL(r.url()).pathname), { timeout: 60_000 })
  const tKlick = performance.now()
  const startZeit = new Date().toISOString()
  await page.click('#chat-senden')
  let antwort
  try {
    antwort = await antwortVersprechen
  } catch {
    return { startZeit, frage, prozesse, endart: 'hängt', grund: 'keine Antwort auf das Absenden innerhalb von 60 s', laufId: null }
  }
  const tQuittung = performance.now()
  const status = antwort.status()
  const koerper = await antwort.json().catch(() => ({}))
  if (status !== 202) {
    const ausgang = await leseAusgang(page)
    return { startZeit, frage, prozesse, endart: 'Fehler', grund: `HTTP ${status}: ${koerper.grund ?? ausgang.fehlerZeile}`, laufId: null, k1NodeMs: Math.round(tQuittung - tKlick) }
  }
  const laufId = koerper.laufId
  let haengt = false
  try {
    await page.waitForFunction(() => document.querySelector('#chat-verlauf .chat-tippindikator') === null && !document.getElementById('chat-senden').disabled, null, { timeout: TURN_GRENZE_MS, polling: 100 })
  } catch {
    haengt = true
  }
  const tEnde = performance.now()
  if (haengt) {
    await page.click('#chat-abbrechen-btn').catch(() => {})
    await page.waitForFunction(() => document.querySelector('#chat-verlauf .chat-tippindikator') === null, null, { timeout: ABBRUCH_WARTEN_MS, polling: 500 }).catch(() => {})
  }
  // Nachzügler: Client-Konsolenzeile und Server-Marken kommen kurz nach dem Rendern bzw. Prozessende.
  await warte(1500)
  const ausgang = await leseAusgang(page)
  const clientZeile = clientZeilen.slice(clientZeilenVorher).at(-1) ?? null
  const marken = leseServerMarken(serverZeilen, laufId)
  let laufakte = null
  let laufStatus = null
  try {
    const detail = await (await fetch(`${basis}/api/laeufe/${encodeURIComponent(laufId)}`)).json()
    laufakte = detail.laufakte ?? null
    laufStatus = detail.laufStatus ?? null
  } catch {
    // Detail nicht lesbar — Worker/Modell bleiben leer, kein Abbruch der Messung.
  }
  const endart = haengt ? 'hängt' : ausgang.fehler ? 'Fehler' : 'Antwort'
  return {
    startZeit,
    frage,
    prozesse,
    laufId,
    endart,
    grund: endart === 'Antwort' ? null : ausgang.text || ausgang.fehlerZeile || null,
    antwortAuszug: ausgang.text.slice(0, 160),
    k1NodeMs: Math.round(tQuittung - tKlick),
    k3NodeMs: Math.round(tEnde - tKlick),
    client: clientZeile,
    serverMarken: marken,
    phasen: serverPhasen(marken),
    worker: laufakte?.status === 'ok' ? laufakte.worker : null,
    modellDeklariert: laufakte?.status === 'ok' ? laufakte.modellDeklariert : null,
    modellBeobachtet: laufakte?.status === 'ok' ? laufakte.modellBeobachtet : null,
    laufStatus,
  }
}

/** @param wert - Zahl oder null @returns Tabellenzelle */
const zelle = (wert) => (wert === null || wert === undefined ? '–' : String(wert))

/**
 * Schreibt Markdown und JSON der Messung.
 * @param ergebnis - Gesamtergebnis
 */
function schreibeAusgabe(ergebnis) {
  mkdirSync(AUSGABE_VERZEICHNIS, { recursive: true })
  const basisName = join(AUSGABE_VERZEICHNIS, `messung-${ergebnis.parameter.etikett}`)
  writeFileSync(`${basisName}.json`, `${JSON.stringify(ergebnis, null, 2)}\n`)
  const z = ergebnis.zusammenfassung
  const zeilen = [
    `# Chat-Messung „${ergebnis.parameter.etikett}“ (F45 B0)`,
    '',
    `Erzeugt von \`scripts/messe-chat.mjs\` am ${ergebnis.umgebung.ende}. Rohdaten: \`messung-${ergebnis.parameter.etikett}.json\`.`,
    '',
    '## Umgebung',
    '',
    `- Modus: ${ergebnis.parameter.modus}${ergebnis.parameter.modus === 'sparring' ? ` (Untermodus ${ergebnis.parameter.untermodus})` : ''}, Turns: ${ergebnis.parameter.turns}, Warmlauf: ${ergebnis.parameter.warmlaufMin} min`,
    `- Startvorlage: ${ergebnis.parameter.startvorlage ?? 'Standard (ohne LEITSTAND_STARTVORLAGE_PFAD)'}`,
    `- Leitstand: \`${ergebnis.umgebung.startzeile}\``,
    ...ergebnis.umgebung.warnungen.map((w) => `- Warnung beim Start: \`${w}\``),
    `- Git: ${ergebnis.umgebung.git}, Node ${ergebnis.umgebung.node}, ${ergebnis.umgebung.plattform}, Arbeitsordner \`${ergebnis.umgebung.arbeitsordner}\``,
    `- Start ${ergebnis.umgebung.start}, Ende ${ergebnis.umgebung.ende}`,
    `- Modern Standby während der Messung: ${ergebnis.umgebung.standby === null ? 'nicht lesbar' : ergebnis.umgebung.standby.length === 0 ? 'keiner' : ergebnis.umgebung.standby.map((s) => `${s.ereignis} ${s.zeit.slice(11, 19)} UTC`).join(', ')}`,
    '',
    '## Kennzahlen (ms)',
    '',
    '| Kennzahl | Median | Max | Anzahl |',
    '|---|---|---|---|',
    `| K1 Absenden → 202 (Client) | ${zelle(z.k1.median)} | ${zelle(z.k1.max)} | ${z.k1.anzahl} |`,
    `| K2 request_eingang → prozess_gestartet (Server) | ${zelle(z.k2.median)} | ${zelle(z.k2.max)} | ${z.k2.anzahl} |`,
    `| Prozess (prozess_gestartet → prozess_beendet) | ${zelle(z.prozess.median)} | ${zelle(z.prozess.max)} | ${z.prozess.anzahl} |`,
    `| Nachbereitung (prozess_beendet → letzte Marke) | ${zelle(z.nachbereitung.median)} | ${zelle(z.nachbereitung.max)} | ${z.nachbereitung.anzahl} |`,
    `| 202 → Poll-Ergebnis (Client) | ${zelle(z.quittungBisPoll.median)} | ${zelle(z.quittungBisPoll.max)} | ${z.quittungBisPoll.anzahl} |`,
    `| Poll-Ergebnis → Anzeige (Client) | ${zelle(z.pollBisAnzeige.median)} | ${zelle(z.pollBisAnzeige.max)} | ${z.pollBisAnzeige.anzahl} |`,
    `| K3 Absenden → Antwort sichtbar | ${zelle(z.k3.median)} | ${zelle(z.k3.max)} | ${z.k3.anzahl} |`,
    `| GET /api/zustand (alle 2 s) | ${zelle(z.zustand.median)} | ${zelle(z.zustand.max)} | ${z.zustand.anzahl} (p95 ${zelle(z.zustand.p95)}) |`,
    `| Event-Loop max je 60-s-Fenster | ${zelle(z.eventLoopMax.median)} | ${zelle(z.eventLoopMax.max)} | ${z.eventLoopMax.anzahl} |`,
    '',
    `K4: ${z.sichtbarBeendet} von ${ergebnis.turns.length} Turns enden sichtbar (Antwort ${z.antworten}, Fehler mit Grund ${z.fehler}, hängt ${z.haengt}).`,
    '',
    'K3 nimmt die Client-Zeile (gesamt_ms), sonst die von außen gemessene Zeit bis zum Ende der Tipp-Punkte. K1 ebenso (absenden_bis_quittung_ms, sonst Klick → 202).',
    '',
    ...(ergebnis.abbruch ? [`**Selbstabbruch:** ${ergebnis.abbruch}`, ''] : []),
    '## Speicherverlauf (je Minute)',
    '',
    `Max RSS Server ${zelle(ergebnis.speicher.zusammenfassung.maxServerMb)} MB, max RSS Chromium ${zelle(ergebnis.speicher.zusammenfassung.maxChromiumMb)} MB, min. freier Speicher ${zelle(ergebnis.speicher.zusammenfassung.minFreiMb)} MB; Wachstum im Warmlauf: Server ${zelle(ergebnis.speicher.zusammenfassung.wachstumServerProzent)} %, Chromium ${zelle(ergebnis.speicher.zusammenfassung.wachstumChromiumProzent)} %.`,
    '',
    '| Zeit (UTC) | Server RSS MB | Chromium RSS MB | frei MB | claude.exe |',
    '|---|---|---|---|---|',
    ...ergebnis.speicher.proben.map((p) => `| ${p.zeit.slice(11, 19)} | ${zelle(p.serverMb)} | ${zelle(p.chromiumMb)} | ${zelle(p.freiMb)} | ${zelle(p.claude)} |`),
    '',
    '## Turns',
    '',
    '| # | Start | Endart | K1 | K2 | Prozess | Nachber. | K3 | Worker | Modell | claude/codex | laufId | Grund / Auszug |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|---|',
    ...ergebnis.turns.map((t, i) => {
      const auszug = (t.endart === 'Antwort' ? t.antwortAuszug : t.grund) ?? ''
      return `| ${i + 1} | ${t.startZeit.slice(11, 19)} | ${t.endart} | ${zelle(t.k1Ms)} | ${zelle(t.phasen?.k2)} | ${zelle(t.phasen?.prozess)} | ${zelle(t.phasen?.nachbereitung)} | ${zelle(t.k3Ms)} | ${zelle(t.worker)} | ${zelle(t.modellBeobachtet ?? t.modellDeklariert)} | ${zelle(t.prozesse.claude)}/${zelle(t.prozesse.codex)} | ${t.laufId ? `\`${t.laufId.slice(-12)}\`` : '–'} | ${auszug.replace(/\|/g, '\\|').slice(0, 120)} |`
    }),
    '',
  ]
  writeFileSync(`${basisName}.md`, zeilen.join('\n'))
  return basisName
}

/** Hauptablauf: Leitstand starten, Seite öffnen, Warmlauf, Turns, Auswertung, aufräumen. */
async function main() {
  const parameter = leseArgumente(process.argv.slice(2))
  const basis = `http://127.0.0.1:${parameter.port}`
  const start = new Date().toISOString()
  const git = (() => {
    try {
      return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: WURZEL, encoding: 'utf8' }).trim()
    } catch {
      return 'unbekannt'
    }
  })()
  console.log(`[messe-chat] Starte Leitstand auf ${basis} …`)
  const leitstand = await starteLeitstand(parameter)
  const browser = await chromium.launch({ headless: true })
  const ergebnis = { parameter, umgebung: {}, turns: [], zustand: [], eventLoop: [], speicher: { proben: [], zusammenfassung: {} }, abbruch: null }
  let zustandsMessung = null
  const speicher = starteSpeicherUeberwachung(leitstand.kind.pid, process.pid, parameter.speicherUntergrenzeMb)
  let warmlaufEndeIndex = null
  /** Erste Speicherprobe NACH dem Laden der Seite — Basis des Warmlauf-Wachstums (die Startprobe liegt vor dem Laden). */
  let basisIndex = null
  /** Wartet auf ein Versprechen oder den Speicher-Selbstabbruch, was zuerst kommt. */
  const oderAbbruch = (versprechen) => Promise.race([versprechen, speicher.abbruch.then((grund) => Promise.reject(new Error(`Speicher-Selbstabbruch: ${grund}`)))])
  try {
    const kontext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await kontext.addInitScript(({ modus, untermodus }) => {
      localStorage.setItem('leitstand-chat-modus', modus)
      localStorage.setItem('leitstand-chat-sparring-untermodus', untermodus)
      localStorage.setItem('leitstand-chat-offen', 'true')
    }, parameter)
    const page = await kontext.newPage()
    const clientZeilen = []
    page.on('console', async (meldung) => {
      if (!meldung.text().startsWith('[jarvis-latenz]')) return
      const wert = await meldung.args()[1]?.jsonValue().catch(() => null)
      clientZeilen.push(wert ?? null)
    })
    await page.goto(`${basis}/#/chat`)
    await page.waitForSelector('#chat-eingabe', { timeout: 30_000 })
    zustandsMessung = starteZustandsMessung(basis)
    basisIndex = speicher.proben.length
    if (parameter.warmlaufMin > 0) {
      console.log(`[messe-chat] Warmlauf ${parameter.warmlaufMin} min mit offener Seite …`)
      await oderAbbruch(warte(parameter.warmlaufMin * 60_000))
      warmlaufEndeIndex = speicher.proben.length - 1
    }
    const fragen = parameter.modus === 'jarvis' ? FRAGEN_JARVIS : FRAGEN_COACH
    for (let i = 0; i < parameter.turns; i++) {
      const frage = fragen[i % fragen.length]
      console.log(`[messe-chat] Turn ${i + 1}/${parameter.turns}: ${frage}`)
      const turn = await oderAbbruch(fuehreTurnAus({ page, basis, frage, clientZeilen, serverZeilen: leitstand.zeilen }))
      turn.k1Ms = turn.client?.absenden_bis_quittung_ms ?? turn.k1NodeMs ?? null
      turn.k3Ms = turn.endart === 'hängt' ? null : (turn.client?.gesamt_ms ?? turn.k3NodeMs ?? null)
      ergebnis.turns.push(turn)
      console.log(`[messe-chat]   → ${turn.endart} (K1 ${zelle(turn.k1Ms)} ms, K2 ${zelle(turn.phasen?.k2)} ms, K3 ${zelle(turn.k3Ms)} ms, Worker ${zelle(turn.worker)})`)
      if (turn.endart === 'hängt' && (await page.$('#chat-verlauf .chat-tippindikator')) !== null) {
        console.log('[messe-chat] Lauf hängt auch nach dem Abbruch — restliche Turns entfallen.')
        break
      }
    }
  } catch (fehler) {
    if (speicher.unterschritten() === null) throw fehler
    ergebnis.abbruch = speicher.unterschritten()
    console.error(`[messe-chat] Selbstabbruch: ${ergebnis.abbruch}`)
  } finally {
    speicher.stoppe()
    if (zustandsMessung !== null) await zustandsMessung.stoppe()
    await browser.close().catch(() => {})
    await leitstand.beenden()
  }
  const proben = speicher.proben
  const maxWert = (feld) => kennzahlen(proben.map((p) => p[feld])).max
  const wachstum = (feld) => {
    const erste = basisIndex === null ? undefined : proben[basisIndex]?.[feld]
    const letzte = warmlaufEndeIndex === null ? null : proben[warmlaufEndeIndex]?.[feld]
    return typeof erste === 'number' && typeof letzte === 'number' && erste > 0 ? Math.round(((letzte - erste) / erste) * 100) : null
  }
  ergebnis.speicher = {
    proben,
    zusammenfassung: {
      maxServerMb: maxWert('serverMb'),
      maxChromiumMb: maxWert('chromiumMb'),
      minFreiMb: kennzahlen(proben.map((p) => p.freiMb)).median === null ? null : Math.min(...proben.map((p) => p.freiMb)),
      wachstumServerProzent: wachstum('serverMb'),
      wachstumChromiumProzent: wachstum('chromiumMb'),
    },
  }
  ergebnis.zustand = zustandsMessung?.messungen ?? []
  ergebnis.eventLoop = leitstand.zeilen
    .map((z) => z.zeile.match(/^\[leitstand\] Event-Loop 60s: max (\d+) p99 (\d+)$/))
    .filter((treffer) => treffer !== null)
    .map((treffer) => ({ max: Number(treffer[1]), p99: Number(treffer[2]) }))
  ergebnis.umgebung = {
    start,
    ende: new Date().toISOString(),
    git,
    node: process.version,
    plattform: `${process.platform} ${process.arch}`,
    arbeitsordner: WURZEL,
    startzeile: leitstand.zeilen.find((z) => z.zeile.startsWith('Leitstand läuft auf'))?.zeile ?? '',
    warnungen: leitstand.zeilen.filter((z) => /^\[F-391\]|^\[leitstand\] .*E-188/.test(z.zeile)).map((z) => z.zeile),
    standby: leseStandbyEreignisse(start),
  }
  const turns = ergebnis.turns
  ergebnis.zusammenfassung = {
    k1: kennzahlen(turns.map((t) => t.k1Ms)),
    k2: kennzahlen(turns.map((t) => t.phasen?.k2)),
    prozess: kennzahlen(turns.map((t) => t.phasen?.prozess)),
    nachbereitung: kennzahlen(turns.map((t) => t.phasen?.nachbereitung)),
    quittungBisPoll: kennzahlen(turns.map((t) => t.client?.quittung_bis_pollergebnis_ms)),
    pollBisAnzeige: kennzahlen(turns.map((t) => t.client?.pollergebnis_bis_darstellung_ms)),
    k3: kennzahlen(turns.filter((t) => t.endart === 'Antwort').map((t) => t.k3Ms)),
    zustand: kennzahlen(ergebnis.zustand.map((m) => m.ms)),
    eventLoopMax: kennzahlen(ergebnis.eventLoop.map((e) => e.max)),
    antworten: turns.filter((t) => t.endart === 'Antwort').length,
    fehler: turns.filter((t) => t.endart === 'Fehler').length,
    haengt: turns.filter((t) => t.endart === 'hängt').length,
    sichtbarBeendet: turns.filter((t) => t.endart !== 'hängt').length,
  }
  const datei = schreibeAusgabe(ergebnis)
  console.log(`[messe-chat] Geschrieben: ${datei}.md / .json`)
  if (ergebnis.abbruch !== null) process.exitCode = 2
}

main().catch((fehler) => {
  console.error('[messe-chat] Abbruch:', fehler)
  process.exit(1)
})
