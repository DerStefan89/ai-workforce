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
 * (scripts/leitstand/event-loop-messung.mjs). Ergebnis: features/F45/nachweise/<ausgabe>/messung-<etikett>.md
 * (Tabelle je Turn, Median und Max je Kennzahl, Umgebung) und .json.
 *
 * F45 P (Teil 1 Punkt 1): Modus --nur-leerlauf M — Leitstand mit offener Seite (Standard #/dashboard,
 * --seite <hash>) M Minuten ohne Chat-Turns; mit --seitenwechsel wird alle 60 s die nächste der sechs
 * Hauptseiten (SEITEN) angewählt und die Zeit bis „Inhalt sichtbar“ gemessen (Kriterium siehe
 * INHALT_SICHTBAR_SKRIPT). Zusätzlich je Minute Seitenmetriken aus dem DevTools-Protokoll (JS-Heap,
 * DOM-Knoten, Listener), Heap-Snapshot nach dem Laden und am Ende (HeapProfiler) samt Auswertung
 * (Top-Wachstum je Konstruktor, Detached DOM), Zeilen „Zustand-Quellen 60s“ und „Synchron > 200 ms“ des
 * Servers. --turns N hängt nach dem Leerlauf N Chat-Turns im selben Leitstand an (Standard 0).
 *
 * Aufruf (aus dem Hauptordner, Stefans Leitstand geschlossen):
 *   node scripts/messe-chat.mjs --modus jarvis|sparring --turns N --etikett <text>
 *     [--startvorlage <pfad>] [--warmlauf-min M] [--untermodus feature|projekt] [--port 4199]
 *     [--speicher-untergrenze-mb 1536] [--ausgabe b0|p]
 *   node scripts/messe-chat.mjs --nur-leerlauf M --etikett <text> [--seite '#/dashboard'] [--seitenwechsel]
 *     [--turns N] [--wechsel-takt-s 60] [--ausgabe p]
 *   node scripts/messe-chat.mjs --auswerten <messung.json> --bis <ISO-Zeit> --etikett <neu> [--grund <text>]
 *     (nachträglicher Zuschnitt einer gespeicherten Messung, z. B. Vorher-Basis = Teil vor einem Standby)
 *
 * Wird aufgerufen von: Hand (F45 B0 Vorher-/Nachher-Messung, WS P Leerlauf, später R). Nicht Teil von
 * `npm run check` — braucht echte Modell-Läufe und einen Browser (Muster scripts/render-nachweis.mjs).
 *
 * Wichtig:
 * - Echte Läufe: jede Testfrage beginnt mit „[Messung F45-B0]“ und landet im echten Chat-Verlauf.
 * - Obergrenze je Turn 5 min; danach gilt der Turn als „hängt“, das Skript fordert „Lauf abbrechen“ an
 *   und wartet höchstens 2 min auf das Ende, sonst bricht es die restlichen Turns ab.
 * - Löscht und überschreibt nur die eigenen zwei Ausgabedateien; der Leitstand wird am Ende beendet.
 *   Unter Windows beendet kind.kill() hart, ohne Aufräumen — das Skript entfernt danach genau die
 *   Instanz-Locks (kontrollzustand/.leitstand.lock je Registerprojekt), die die PID dieses Kindes tragen.
 * - Standby (Challenger 11.10.2026): fällt ein Modern-Standby-Fenster in die Messung, markiert die Messdatei den
 *   Abschnitt ab dem ersten „Standby beginnt“ als ungültig und schreibt zusätzlich messung-<etikett>-gueltig.md/.json
 *   (Zuschnitt bis dorthin). Der Energiemodus (reg.exe, lesend) steht in jeder Messung (F-1018).
 * - F-1015 (Challenger 11.10.2026): Seitenspeicher, JS-Heap, DOM-Knoten und Listener am Ende ≤ 1,2 × Wert 15 min nach
 *   dem Laden (die Aufwärmphase ist ausgenommen).
 * - Zwischenstand: jede Minute schreibt das Skript die bis dahin gesammelten Rohwerte nach
 *   messung-<etikett>.zwischenstand.json (F45 P: ein von außen beendeter Lauf — z. B. Speicherdruck — verlor sonst alle
 *   Werte); nach der regulären Auswertung wird die Datei entfernt.
 * - Heap-Snapshots (--nur-leerlauf) landen als heap-<etikett>-start/-ende.heapsnapshot neben der Messdatei; sie sind
 *   über .gitignore ausgeschlossen (je ≈ 15 MB), die Auswertung steht in der Messdatei.
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
import { join, relative, resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { setTimeout as warte } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const WURZEL = resolve(fileURLToPath(new URL('..', import.meta.url)))
/** @param ausgabe - Unterordner unter features/F45/nachweise (b0, p) @returns Ausgabeverzeichnis */
const ausgabeVerzeichnis = (ausgabe) => join(WURZEL, 'features', 'F45', 'nachweise', ausgabe)
const TURN_GRENZE_MS = 5 * 60 * 1000
/** Längste Wartezeit auf „Inhalt sichtbar“ nach einem Seitenwechsel; danach gilt der Wechsel als nicht erreicht. */
const SEITENWECHSEL_FRIST_MS = 10_000
/** Die sechs Hauptseiten (F45 P3) in Wechselreihenfolge; „Entwicklung“ ist #/workboard (Nav-Link der Seitenleiste). */
const SEITEN = ['#/dashboard', '#/roadmap', '#/workboard', '#/attention', '#/capabilities', '#/chat']
/** Argumente ohne Wert. */
const SCHALTER = new Set(['seitenwechsel'])

/**
 * Kriterium „Inhalt sichtbar“ je Seite, als Init-Skript in die Seite gelegt (window.__messeInhaltSichtbar):
 * - Hauptseiten: der Container [data-view] ist sichtbar (checkVisibility), trägt mindestens 40 Zeichen
 *   Text, und keine Zeile seines sichtbaren Texts ist ein Ladehinweis (LADE_ZEILEN = die deutschen
 *   *.laedt-Texte aus public/leitstand/i18n/de.js, die die Seiten bis zum Eintreffen ihrer Daten zeigen).
 * - #/chat: die Gesprächsfläche #chat-gespraech ist sichtbar und zeigt mindestens einen Verlaufseintrag
 *   oder den Leerzustand #chat-leer.
 * Geprüft wird nach jedem Animation-Frame, gemessen ab dem Setzen von location.hash.
 */
const INHALT_SICHTBAR_SKRIPT = () => {
  const LADE_ZEILEN = new Set(['Lädt…', 'Lädt …', 'Wird geladen …', 'Der Eintrag wird geladen …', 'Die Akte wird gelesen …', 'Der Ausführungsstand wird geladen …', 'Der Ablauf wird geladen …', 'Der Ausführungsstand wird geladen; Karten können danach die Spalte wechseln.'])
  const VIEWS = { '#/dashboard': 'dashboard', '#/roadmap': 'roadmap', '#/workboard': 'workboard', '#/attention': 'attention', '#/capabilities': 'capabilities' }
  window.__messeInhaltSichtbar = (hash) => {
    if (hash === '#/chat') {
      const flaeche = document.getElementById('chat-gespraech')
      if (flaeche === null || !flaeche.checkVisibility()) return false
      const eintraege = document.querySelectorAll('#chat-verlauf .chat-bubble-reihe').length
      return eintraege > 0 || document.getElementById('chat-leer')?.checkVisibility() === true
    }
    const container = document.querySelector(`[data-view="${VIEWS[hash]}"]`)
    if (container === null || container.hidden || !container.checkVisibility()) return false
    const text = container.innerText
    if (text.trim().length < 40) return false
    return !text.split('\n').some((zeile) => LADE_ZEILEN.has(zeile.trim()))
  }
}
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
 * @returns { modus, turns, etikett, startvorlage, warmlaufMin, untermodus, port, speicherUntergrenzeMb, nurLeerlauf, seite, seitenwechsel, wechselTaktS, ausgabe }
 */
function leseArgumente(argv) {
  const werte = {}
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) throw new Error(`Unerwartetes Argument: ${argv[i]}`)
    const schluessel = argv[i].slice(2)
    if (SCHALTER.has(schluessel)) {
      werte[schluessel] = true
      continue
    }
    if (argv[i + 1] === undefined) throw new Error(`Wert fehlt: ${argv[i]}`)
    werte[schluessel] = argv[++i]
  }
  const modus = werte.modus ?? 'jarvis'
  if (!['jarvis', 'sparring'].includes(modus)) throw new Error("--modus muss 'jarvis' oder 'sparring' sein")
  const nurLeerlauf = werte['nur-leerlauf'] !== undefined
  if (nurLeerlauf && werte['warmlauf-min'] !== undefined) throw new Error('--nur-leerlauf und --warmlauf-min schließen sich aus')
  const turns = Number(werte.turns ?? (nurLeerlauf ? 0 : 5))
  const warmlaufMin = Number(nurLeerlauf ? werte['nur-leerlauf'] : (werte['warmlauf-min'] ?? 0))
  const port = Number(werte.port ?? 4199)
  if (!Number.isInteger(turns) || turns < (nurLeerlauf ? 0 : 1)) throw new Error(`--turns muss eine ganze Zahl ≥ ${nurLeerlauf ? 0 : 1} sein`)
  if (!Number.isFinite(warmlaufMin) || warmlaufMin < 0) throw new Error('--warmlauf-min bzw. --nur-leerlauf muss ≥ 0 sein')
  const seite = werte.seite ?? (nurLeerlauf ? '#/dashboard' : '#/chat')
  if (!SEITEN.includes(seite)) throw new Error(`--seite muss eine der Hauptseiten sein: ${SEITEN.join(', ')}`)
  const seitenwechsel = werte.seitenwechsel === true
  const wechselTaktS = Number(werte['wechsel-takt-s'] ?? 60)
  if (!Number.isFinite(wechselTaktS) || wechselTaktS < 5) throw new Error('--wechsel-takt-s muss ≥ 5 sein')
  const ausgabe = werte.ausgabe ?? (nurLeerlauf ? 'p' : 'b0')
  if (!/^[a-z0-9-]+$/.test(ausgabe)) throw new Error('--ausgabe ist ein Unterordner (Kleinbuchstaben, Ziffern, Bindestrich)')
  if (typeof werte.etikett !== 'string' || !/^[a-z0-9-]+$/i.test(werte.etikett)) throw new Error('--etikett ist Pflicht (Buchstaben, Ziffern, Bindestrich)')
  const untermodus = werte.untermodus ?? 'feature'
  if (!['feature', 'projekt'].includes(untermodus)) throw new Error("--untermodus muss 'feature' oder 'projekt' sein")
  const speicherUntergrenzeMb = Number(werte['speicher-untergrenze-mb'] ?? SPEICHER_UNTERGRENZE_STANDARD_MB)
  if (!Number.isFinite(speicherUntergrenzeMb) || speicherUntergrenzeMb < 0) throw new Error('--speicher-untergrenze-mb muss ≥ 0 sein')
  return { modus, turns, etikett: werte.etikett, startvorlage: werte.startvorlage ?? null, warmlaufMin, untermodus, port, speicherUntergrenzeMb, nurLeerlauf, seite, seitenwechsel, wechselTaktS, ausgabe }
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
  /** Eine zusätzliche Probe außerhalb des Takts (F45 P: Basis direkt nach dem Laden, Endwert vor dem End-Snapshot). @returns Index der Probe */
  const messeJetzt = () => {
    pruefe()
    return proben.length - 1
  }
  return { proben, abbruch, stoppe: () => clearInterval(timer), unterschritten: () => grund, messeJetzt }
}

/**
 * Startet die minütliche Abfrage der Seitenmetriken über das DevTools-Protokoll (Performance.getMetrics):
 * JS-Heap belegt/gesamt, DOM-Knoten, Event-Listener, Dokumente, Layout-Objekte.
 * @param cdp - CDP-Sitzung der Seite
 * @returns { proben, stoppe, messeJetzt: () => Promise<void> }
 */
async function starteSeitenMetriken(cdp) {
  await cdp.send('Performance.enable')
  const proben = []
  const messeJetzt = async () => {
    try {
      const { metrics } = await cdp.send('Performance.getMetrics')
      const wert = (name) => metrics.find((m) => m.name === name)?.value ?? null
      const mb = (bytes) => (bytes === null ? null : Math.round(bytes / 1024 ** 2))
      proben.push({ zeit: new Date().toISOString(), jsHeapMb: mb(wert('JSHeapUsedSize')), jsHeapGesamtMb: mb(wert('JSHeapTotalSize')), knoten: wert('Nodes'), listener: wert('JSEventListeners'), dokumente: wert('Documents'), layoutObjekte: wert('LayoutObjects') })
    } catch {
      // Seite geschlossen oder Protokoll nicht verfügbar — Probe entfällt.
    }
  }
  await messeJetzt()
  const timer = setInterval(() => void messeJetzt(), SPEICHER_TAKT_MS)
  return { proben, stoppe: () => clearInterval(timer), messeJetzt }
}

/**
 * Nimmt einen Heap-Snapshot der Seite nach erzwungener Speicherbereinigung (HeapProfiler) und schreibt ihn als Datei.
 * @param cdp - CDP-Sitzung der Seite
 * @param datei - Zielpfad (.heapsnapshot)
 * @returns { datei, mb, zeit } — Dateigröße in MB, Zeitpunkt (ISO)
 */
async function nimmHeapSnapshot(cdp, datei) {
  await cdp.send('HeapProfiler.enable')
  await cdp.send('HeapProfiler.collectGarbage')
  const stuecke = []
  const sammle = (ereignis) => stuecke.push(ereignis.chunk)
  cdp.on('HeapProfiler.addHeapSnapshotChunk', sammle)
  await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false })
  cdp.off('HeapProfiler.addHeapSnapshotChunk', sammle)
  const inhalt = stuecke.join('')
  writeFileSync(datei, inhalt)
  return { datei, mb: Math.round((Buffer.byteLength(inhalt) / 1024 ** 2) * 10) / 10, zeit: new Date().toISOString() }
}

/**
 * Wertet einen Heap-Snapshot aus: Anzahl und Eigengröße je Gruppe (Objekte/native/Closures nach Name, sonst
 * nach Knotentyp), Gesamtgröße, Zahl der Detached-DOM-Knoten (Feld detachedness = 2 oder Name „Detached …“).
 * @param datei - Pfad des Snapshots
 * @returns { gesamtMb, knoten, detached, gruppen: Map<string, { anzahl, bytes }> }
 */
function werteHeapSnapshotAus(datei) {
  const snapshot = JSON.parse(readFileSync(datei, 'utf8'))
  const meta = snapshot.snapshot.meta
  const felder = meta.node_fields
  const breite = felder.length
  const typen = meta.node_types[0]
  const iTyp = felder.indexOf('type')
  const iName = felder.indexOf('name')
  const iGroesse = felder.indexOf('self_size')
  const iLos = felder.indexOf('detachedness')
  const gruppen = new Map()
  let bytes = 0
  let detached = 0
  const knoten = snapshot.nodes
  for (let i = 0; i < knoten.length; i += breite) {
    const typ = typen[knoten[i + iTyp]]
    const name = String(snapshot.strings[knoten[i + iName]] ?? '')
    const groesse = knoten[i + iGroesse]
    bytes += groesse
    if ((iLos >= 0 && knoten[i + iLos] === 2) || name.startsWith('Detached ')) detached++
    const schluessel = ['object', 'native', 'closure'].includes(typ) ? `${typ}: ${name.slice(0, 80)}` : `(${typ})`
    const gruppe = gruppen.get(schluessel)
    if (gruppe === undefined) gruppen.set(schluessel, { anzahl: 1, bytes: groesse })
    else {
      gruppe.anzahl++
      gruppe.bytes += groesse
    }
  }
  return { gesamtMb: Math.round((bytes / 1024 ** 2) * 10) / 10, knoten: knoten.length / breite, detached, gruppen }
}

/**
 * Heap-Diff zweier Auswertungen: die Gruppen mit dem größten Zuwachs an Eigengröße.
 * @param start - Auswertung nach dem Laden
 * @param ende - Auswertung am Ende
 * @param anzahl - Zahl der Zeilen (Standard 15)
 * @returns Liste { gruppe, anzahlStart, anzahlEnde, kbStart, kbEnde, kbZuwachs }
 */
function heapDiff(start, ende, anzahl = 15) {
  const schluessel = new Set([...start.gruppen.keys(), ...ende.gruppen.keys()])
  return [...schluessel]
    .map((gruppe) => {
      const a = start.gruppen.get(gruppe) ?? { anzahl: 0, bytes: 0 }
      const b = ende.gruppen.get(gruppe) ?? { anzahl: 0, bytes: 0 }
      return { gruppe, anzahlStart: a.anzahl, anzahlEnde: b.anzahl, kbStart: Math.round(a.bytes / 1024), kbEnde: Math.round(b.bytes / 1024), kbZuwachs: Math.round((b.bytes - a.bytes) / 1024) }
    })
    .sort((x, y) => y.kbZuwachs - x.kbZuwachs)
    .slice(0, anzahl)
}

/**
 * Wählt eine Hauptseite an und misst die Zeit bis „Inhalt sichtbar“ (INHALT_SICHTBAR_SKRIPT), in der Seite selbst
 * gemessen ab dem Setzen von location.hash.
 * @param page - Playwright-Seite
 * @param hash - Zielseite aus SEITEN
 * @returns { zeit, seite, ms, erreicht }
 */
async function wechsleSeite(page, hash) {
  const zeit = new Date().toISOString()
  const ergebnis = await page.evaluate(
    async ({ hash, fristMs }) => {
      const t0 = performance.now()
      location.hash = hash
      while (performance.now() - t0 < fristMs) {
        await new Promise((weiter) => requestAnimationFrame(() => weiter()))
        if (window.__messeInhaltSichtbar(hash)) return { ms: Math.round(performance.now() - t0), erreicht: true }
      }
      return { ms: null, erreicht: false }
    },
    { hash, fristMs: SEITENWECHSEL_FRIST_MS }
  )
  return { zeit, seite: hash, ...ergebnis }
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

/**
 * Fasst die Server-Zeilen „Zustand-Quellen 60s“ zusammen (F45 P, Teil 1 Punkt 2).
 * @param zeilen - Server-Zeilen { zeit, zeile }
 * @returns { fenster: [{ zeit, werte }], jeQuelle: siehe quellenJeQuelle }
 */
function werteQuellenZeilenAus(zeilen) {
  const praefix = '[leitstand] Zustand-Quellen 60s: '
  const fenster = []
  for (const z of zeilen) {
    if (!z.zeile.startsWith(praefix)) continue
    try {
      fenster.push({ zeit: new Date(z.zeit).toISOString(), werte: JSON.parse(z.zeile.slice(praefix.length)) })
    } catch {
      // Unvollständige Zeile — überspringen.
    }
  }
  return { fenster, jeQuelle: quellenJeQuelle(fenster) }
}

/**
 * Kennzahlen je Poll-Quelle über alle Fenster: größtes max, größtes p95, Median der p95, Summe der Aufrufe.
 * @param fenster - Liste { zeit, werte } aus werteQuellenZeilenAus
 * @returns { <quelle>: { maxMax, maxP95, medianP95, anzahl } }
 */
function quellenJeQuelle(fenster) {
  const jeQuelle = {}
  for (const quelle of new Set(fenster.flatMap((f) => Object.keys(f.werte)))) {
    const eintraege = fenster.map((f) => f.werte[quelle]).filter((e) => e !== undefined)
    jeQuelle[quelle] = {
      maxMax: Math.max(...eintraege.map((e) => e.max)),
      maxP95: Math.max(...eintraege.map((e) => e.p95)),
      medianP95: kennzahlen(eintraege.map((e) => e.p95)).median,
      anzahl: eintraege.reduce((summe, e) => summe + e.anzahl, 0),
    }
  }
  return jeQuelle
}

/**
 * Kennzahlen der Seitenwechsel je Seite (F45 P3).
 * @param wechsel - Liste { seite, ms, erreicht }
 * @returns { <seite>: { median, max, anzahl, nichtErreicht } }
 */
function seitenwechselJeSeite(wechsel) {
  const jeSeite = {}
  for (const seite of SEITEN) {
    const eigene = wechsel.filter((w) => w.seite === seite)
    if (eigene.length === 0) continue
    const k = kennzahlen(eigene.filter((w) => w.erreicht).map((w) => w.ms))
    jeSeite[seite] = { median: k.median, max: k.max, anzahl: eigene.length, nichtErreicht: eigene.filter((w) => !w.erreicht).length }
  }
  return jeSeite
}

/**
 * Zeilen zum F-1015-Kriterium (Challenger 11.10.2026): Ende ≤ 1,2 × Wert 15 min nach dem Laden, für Chromium-RSS und für
 * JS-Heap, DOM-Knoten und Listener.
 * @param f - speicher.zusammenfassung.f1015 oder undefined
 * @returns Markdown-Zeilen
 */
function f1015Zeilen(f) {
  if (f === undefined || f.chromiumNach15Mb === null) return ['F-1015 (Ende ≤ 1,2 × Wert nach 15 min): nicht bestimmbar (Leerlauf kürzer als 15 min oder keine Proben).', '']
  const erfuellt = [f.faktorChromium15, f.jsHeap.faktor, f.knoten.faktor, f.listener.faktor].every((x) => typeof x === 'number' && x <= 1.2)
  return [
    ...(f.median === null || f.median === undefined
      ? []
      : [
          `F-1015 über Mediane (Minute 15–20 gegen die letzten 5 min): Chromium ${f.median.chromiumMb.a} → ${f.median.chromiumMb.b} MB (${f.median.chromiumMb.faktor}), JS-Heap ${f.median.jsHeapMb.a} → ${f.median.jsHeapMb.b} MB (${f.median.jsHeapMb.faktor}), DOM-Knoten ${f.median.knoten.a} → ${f.median.knoten.b} (${f.median.knoten.faktor}), Listener ${f.median.listener.a} → ${f.median.listener.b} (${f.median.listener.faktor}) — ${[f.median.chromiumMb, f.median.jsHeapMb, f.median.knoten, f.median.listener].every((x) => typeof x.faktor === 'number' && x.faktor <= 1.2) ? 'erfüllt' : 'nicht erfüllt'}.`,
          '',
        ]),
    `F-1015 Einzelproben (Ende ≤ 1,2 × Wert nach 15 min): Chromium ${f.chromiumNach15Mb} → ${f.chromiumEndeMb} MB (Faktor ${f.faktorChromium15}), JS-Heap ${f.jsHeap.nach15} → ${f.jsHeap.ende} MB (${f.jsHeap.faktor}), DOM-Knoten ${f.knoten.nach15} → ${f.knoten.ende} (${f.knoten.faktor}), Listener ${f.listener.nach15} → ${f.listener.ende} (${f.listener.faktor}) — ${erfuellt ? 'erfüllt' : 'nicht erfüllt'}.`,
    '',
  ]
}

/** @param wert - Zahl oder null @returns Tabellenzelle */
const zelle = (wert) => (wert === null || wert === undefined ? '–' : String(wert))

/**
 * Schreibt Markdown und JSON der Messung.
 * @param ergebnis - Gesamtergebnis
 * @returns Basisname der geschriebenen Dateien (ohne Endung)
 */
function schreibeAusgabe(ergebnis) {
  const verzeichnis = ausgabeVerzeichnis(ergebnis.parameter.ausgabe)
  mkdirSync(verzeichnis, { recursive: true })
  const basisName = join(verzeichnis, `messung-${ergebnis.parameter.etikett}`)
  writeFileSync(`${basisName}.json`, `${JSON.stringify(ergebnis, null, 2)}\n`)
  const z = ergebnis.zusammenfassung
  const p = ergebnis.parameter
  const leerlaufZeilen = !p.nurLeerlauf
    ? []
    : [
        '## Seitenwechsel — Zeit bis „Inhalt sichtbar“ (ms, Ziel P3 ≤ 500)',
        '',
        'Kriterium (in der Seite, nach jedem Animation-Frame ab dem Setzen von `location.hash`): Hauptseiten — der Container `[data-view]` ist sichtbar, trägt ≥ 40 Zeichen Text, und keine Textzeile ist ein Ladehinweis (die deutschen `*.laedt`-Texte, z. B. „Lädt…“); `#/chat` — die Gesprächsfläche ist sichtbar und zeigt einen Verlaufseintrag oder den Leerzustand. Frist 10 s.',
        '',
        '| Seite | Median | Max | Wechsel | nicht erreicht |',
        '|---|---|---|---|---|',
        ...Object.entries(z.seitenwechsel).map(([seite, w]) => `| \`${seite}\` | ${zelle(w.median)} | ${zelle(w.max)} | ${w.anzahl} | ${w.nichtErreicht} |`),
        '',
        '## GET /api/zustand frisch und spät (ms, Ziel P1 p95 ≤ 300)',
        '',
        '| Abschnitt | Median | p95 | Max | Anzahl |',
        '|---|---|---|---|---|',
        `| frisch (erste 10 min) | ${zelle(z.zustandFrisch.median)} | ${zelle(z.zustandFrisch.p95)} | ${zelle(z.zustandFrisch.max)} | ${z.zustandFrisch.anzahl} |`,
        `| spät (letzte 10 min des Leerlaufs) | ${zelle(z.zustandSpaet.median)} | ${zelle(z.zustandSpaet.p95)} | ${zelle(z.zustandSpaet.max)} | ${z.zustandSpaet.anzahl} |`,
        '',
        '## Zeiten je Poll-Quelle (Server, je 60-s-Fenster, ms)',
        '',
        '| Quelle | max | größtes p95 | Median der p95 | Aufrufe |',
        '|---|---|---|---|---|',
        ...Object.entries(z.quellen).map(([quelle, q]) => `| ${quelle} | ${q.maxMax} | ${q.maxP95} | ${zelle(q.medianP95)} | ${q.anzahl} |`),
        '',
        `## Synchrone Strecken > 200 ms (Server): ${ergebnis.synchron.length}`,
        '',
        ...(ergebnis.synchron.length === 0
          ? ['keine', '']
          : ['| Zeit (UTC) | Strecke | ms |', '|---|---|---|', ...[...ergebnis.synchron].sort((a, b) => b.ms - a.ms).slice(0, 25).map((s) => `| ${s.zeit.slice(11, 19)} | \`${s.name}\` | ${s.ms} |`), '']),
        `## Event-Loop (Ziel P2 max ≤ 200 ms je 60-s-Fenster): ${z.eventLoopUeber200} von ${ergebnis.eventLoop.length} Fenstern über 200 ms`,
        '',
        ...ergebnis.eventLoop.filter((e) => e.max > 200).map((e) => `- ${e.zeit.slice(11, 19)} UTC: max ${e.max} ms, p99 ${e.p99} ms`),
        '',
        '## Seitenmetriken (DevTools-Protokoll, je Minute)',
        '',
        '| Zeit (UTC) | JS-Heap MB | JS-Heap gesamt MB | DOM-Knoten | Listener | Dokumente | Layout-Objekte |',
        '|---|---|---|---|---|---|---|',
        ...ergebnis.seitenMetriken.map((m) => `| ${m.zeit.slice(11, 19)} | ${zelle(m.jsHeapMb)} | ${zelle(m.jsHeapGesamtMb)} | ${zelle(m.knoten)} | ${zelle(m.listener)} | ${zelle(m.dokumente)} | ${zelle(m.layoutObjekte)} |`),
        '',
        '## Heap-Snapshots (nach erzwungener Speicherbereinigung)',
        '',
        ...(ergebnis.heap === null
          ? ['nicht erhoben', '']
          : [
              '| Zeitpunkt | Datei | Datei MB | Heap MB | Knoten | Detached DOM |',
              '|---|---|---|---|---|---|',
              ...['start', 'ende'].map((art) => {
                const h = ergebnis.heap[art]
                return `| ${art === 'start' ? 'nach dem Laden' : 'Ende'} | \`${h.datei}\` | ${h.mb} | ${h.gesamtMb} | ${h.knoten} | ${h.detached} |`
              }),
              '',
              'Top-Wachstum (Eigengröße, Gruppen nach Konstruktor bzw. Knotentyp):',
              '',
              '| Gruppe | Anzahl Start | Anzahl Ende | KB Start | KB Ende | KB Zuwachs |',
              '|---|---|---|---|---|---|',
              ...ergebnis.heap.topWachstum.map((g) => `| \`${g.gruppe.replace(/\|/g, '\\|').replace(/`/g, "'")}\` | ${g.anzahlStart} | ${g.anzahlEnde} | ${g.kbStart} | ${g.kbEnde} | ${g.kbZuwachs} |`),
              '',
            ]),
      ]
  const zeilen = [
    `# Messung „${p.etikett}“ (scripts/messe-chat.mjs)`,
    '',
    `Erzeugt von \`scripts/messe-chat.mjs\` am ${ergebnis.umgebung.ende}. Rohdaten: \`messung-${p.etikett}.json\`.`,
    '',
    '## Umgebung',
    '',
    p.nurLeerlauf
      ? `- Modus: nur Leerlauf ${p.warmlaufMin} min, Startseite \`${p.seite}\`, Seitenwechsel ${p.seitenwechsel ? `alle ${p.wechselTaktS} s` : 'aus'}, danach Turns: ${p.turns} (${p.modus})`
      : `- Modus: ${p.modus}${p.modus === 'sparring' ? ` (Untermodus ${p.untermodus})` : ''}, Turns: ${p.turns}, Warmlauf: ${p.warmlaufMin} min`,
    `- Startvorlage: ${p.startvorlage ?? 'Standard (ohne LEITSTAND_STARTVORLAGE_PFAD)'}`,
    `- Leitstand: \`${ergebnis.umgebung.startzeile}\``,
    ...ergebnis.umgebung.warnungen.map((w) => `- Warnung beim Start: \`${w}\``),
    `- Git: ${ergebnis.umgebung.git}, Node ${ergebnis.umgebung.node}, ${ergebnis.umgebung.plattform}, Arbeitsordner \`${ergebnis.umgebung.arbeitsordner}\``,
    `- Start ${ergebnis.umgebung.start}, Ende ${ergebnis.umgebung.ende}`,
    `- Modern Standby während der Messung: ${ergebnis.umgebung.standby === null ? 'nicht lesbar' : ergebnis.umgebung.standby.length === 0 ? 'keiner' : ergebnis.umgebung.standby.map((s) => `${s.ereignis} ${s.zeit.slice(11, 19)} UTC`).join(', ')}`,
    `- Energiemodus (Netzbetrieb / Akku): ${ergebnis.umgebung.energiemodus ? `${ergebnis.umgebung.energiemodus.ac?.name ?? '–'} / ${ergebnis.umgebung.energiemodus.dc?.name ?? '–'}` : 'nicht erhoben'}`,
    ...(ergebnis.zuschnitt ? ['', `**Zuschnitt:** ausgewertet bis ${ergebnis.zuschnitt.bis} (${ergebnis.zuschnitt.grund}); Quelle \`${ergebnis.zuschnitt.quelle}\`. Werte danach sind nicht enthalten.`] : []),
    ...(!ergebnis.zuschnitt && ersterStandbyBeginn(ergebnis.umgebung.standby) !== null ? ['', `**Ungültiger Abschnitt:** ab ${ersterStandbyBeginn(ergebnis.umgebung.standby)} (Standby) sind die Werte nicht verwertbar; der gültige Teil steht in \`messung-${p.etikett}-gueltig.md\`.`] : []),
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
    ...(ergebnis.turns.length > 0
      ? [
          `K4: ${z.sichtbarBeendet} von ${ergebnis.turns.length} Turns enden sichtbar (Antwort ${z.antworten}, Fehler mit Grund ${z.fehler}, hängt ${z.haengt}).`,
          '',
          'K3 nimmt die Client-Zeile (gesamt_ms), sonst die von außen gemessene Zeit bis zum Ende der Tipp-Punkte. K1 ebenso (absenden_bis_quittung_ms, sonst Klick → 202).',
          '',
        ]
      : []),
    ...(ergebnis.abbruch ? [`**Selbstabbruch:** ${ergebnis.abbruch}`, ''] : []),
    ...leerlaufZeilen,
    '## Speicherverlauf (je Minute)',
    '',
    ...f1015Zeilen(ergebnis.speicher.zusammenfassung.f1015),
    `Max RSS Server ${zelle(ergebnis.speicher.zusammenfassung.maxServerMb)} MB, max RSS Chromium ${zelle(ergebnis.speicher.zusammenfassung.maxChromiumMb)} MB, min. freier Speicher ${zelle(ergebnis.speicher.zusammenfassung.minFreiMb)} MB; Wachstum ab der ersten Probe nach dem Laden bis Ende Warmlauf/Leerlauf: Server ${zelle(ergebnis.speicher.zusammenfassung.wachstumServerProzent)} %, Chromium ${zelle(ergebnis.speicher.zusammenfassung.wachstumChromiumProzent)} % (Faktor ${zelle(ergebnis.speicher.zusammenfassung.faktorChromium)}, Ziel F-1015 ≤ 1,2).`,
    '',
    '| Zeit (UTC) | Server RSS MB | Chromium RSS MB | frei MB | claude.exe |',
    '|---|---|---|---|---|',
    ...ergebnis.speicher.proben.map((probe) => `| ${probe.zeit.slice(11, 19)} | ${zelle(probe.serverMb)} | ${zelle(probe.chromiumMb)} | ${zelle(probe.freiMb)} | ${zelle(probe.claude)} |`),
    '',
    ...(ergebnis.turns.length > 0
      ? [
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
      : []),
  ]
  writeFileSync(`${basisName}.md`, zeilen.join('\n'))
  return basisName
}

/** Hauptablauf: Leitstand starten, Seite öffnen, Warmlauf bzw. Leerlauf (mit Seitenwechseln), Turns, Auswertung, aufräumen. */
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
  const verzeichnis = ausgabeVerzeichnis(parameter.ausgabe)
  mkdirSync(verzeichnis, { recursive: true })
  console.log(`[messe-chat] Starte Leitstand auf ${basis} …`)
  const leitstand = await starteLeitstand(parameter)
  const browser = await chromium.launch({ headless: true })
  const ergebnis = { parameter, umgebung: {}, turns: [], zustand: [], eventLoop: [], synchron: [], seitenwechsel: [], seitenMetriken: [], heap: null, speicher: { proben: [], zusammenfassung: {} }, abbruch: null }
  let zustandsMessung = null
  let seitenMetriken = null
  const speicher = starteSpeicherUeberwachung(leitstand.kind.pid, process.pid, parameter.speicherUntergrenzeMb)
  let warmlaufEndeIndex = null
  /** Erste Speicherprobe NACH dem Laden der Seite — Basis des Wachstums (die Startprobe liegt vor dem Laden). */
  let basisIndex = null
  /** Ende des Leerlaufs (ms seit Epoche) — Grenze für „GET /api/zustand spät“. */
  let leerlaufEnde = null
  const heapSnapshots = {}
  const zwischenstandDatei = join(verzeichnis, `messung-${parameter.etikett}.zwischenstand.json`)
  /** Schreibt die bisher gesammelten Rohwerte (siehe Dateikopf „Zwischenstand“). */
  const schreibeZwischenstand = () => {
    const serverZeilen = leitstand.zeilen.filter((z) => /^\[leitstand\] (Event-Loop 60s|Zustand-Quellen 60s|Synchron > )/.test(z.zeile)).map((z) => ({ zeit: new Date(z.zeit).toISOString(), zeile: z.zeile }))
    const roh = { parameter, start, stand: new Date().toISOString(), speicher: speicher.proben, seitenMetriken: seitenMetriken?.proben ?? [], seitenwechsel: ergebnis.seitenwechsel, zustand: zustandsMessung?.messungen ?? [], serverZeilen, turns: ergebnis.turns }
    try {
      writeFileSync(zwischenstandDatei, `${JSON.stringify(roh)}\n`)
    } catch (fehler) {
      console.error(`[messe-chat] Zwischenstand nicht geschrieben: ${fehler.message}`)
    }
  }
  const zwischenstandTimer = setInterval(schreibeZwischenstand, SPEICHER_TAKT_MS)
  /** Wartet auf ein Versprechen oder den Speicher-Selbstabbruch, was zuerst kommt. */
  const oderAbbruch = (versprechen) => Promise.race([versprechen, speicher.abbruch.then((grund) => Promise.reject(new Error(`Speicher-Selbstabbruch: ${grund}`)))])
  try {
    const kontext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await kontext.addInitScript(
      ({ modus, untermodus, chatOffen }) => {
        localStorage.setItem('leitstand-chat-modus', modus)
        localStorage.setItem('leitstand-chat-sparring-untermodus', untermodus)
        localStorage.setItem('leitstand-chat-offen', chatOffen)
      },
      { modus: parameter.modus, untermodus: parameter.untermodus, chatOffen: parameter.nurLeerlauf ? 'false' : 'true' }
    )
    await kontext.addInitScript(INHALT_SICHTBAR_SKRIPT)
    const page = await kontext.newPage()
    const cdp = await kontext.newCDPSession(page)
    const clientZeilen = []
    page.on('console', async (meldung) => {
      if (!meldung.text().startsWith('[jarvis-latenz]')) return
      const wert = await meldung.args()[1]?.jsonValue().catch(() => null)
      clientZeilen.push(wert ?? null)
    })
    await page.goto(`${basis}/${parameter.seite}`)
    if (parameter.seite === '#/chat') await page.waitForSelector('#chat-eingabe', { timeout: 30_000 })
    else await page.waitForFunction((hash) => window.__messeInhaltSichtbar(hash), parameter.seite, { timeout: 30_000, polling: 100 })
    zustandsMessung = starteZustandsMessung(basis)
    seitenMetriken = await starteSeitenMetriken(cdp)
    if (parameter.nurLeerlauf) {
      await warte(5000)
      basisIndex = speicher.messeJetzt()
      heapSnapshots.start = await nimmHeapSnapshot(cdp, join(verzeichnis, `heap-${parameter.etikett}-start.heapsnapshot`))
      console.log(`[messe-chat] Heap-Snapshot nach dem Laden: ${heapSnapshots.start.mb} MB`)
    } else {
      basisIndex = speicher.proben.length
    }
    if (parameter.warmlaufMin > 0) {
      console.log(`[messe-chat] ${parameter.nurLeerlauf ? 'Leerlauf' : 'Warmlauf'} ${parameter.warmlaufMin} min mit offener Seite${parameter.seitenwechsel ? `, Seitenwechsel alle ${parameter.wechselTaktS} s` : ''} …`)
      const ende = Date.now() + parameter.warmlaufMin * 60_000
      if (parameter.seitenwechsel) {
        let index = SEITEN.indexOf(parameter.seite)
        while (Date.now() + parameter.wechselTaktS * 1000 <= ende) {
          await oderAbbruch(warte(parameter.wechselTaktS * 1000))
          index = (index + 1) % SEITEN.length
          const wechsel = await oderAbbruch(wechsleSeite(page, SEITEN[index]))
          ergebnis.seitenwechsel.push(wechsel)
          console.log(`[messe-chat] Seitenwechsel ${wechsel.seite}: ${wechsel.erreicht ? `${wechsel.ms} ms` : 'nicht erreicht'}`)
        }
      }
      const rest = ende - Date.now()
      if (rest > 0) await oderAbbruch(warte(rest))
      leerlaufEnde = Date.now()
      if (parameter.nurLeerlauf) {
        // Gleiche Lage wie beim Start-Snapshot: zurück auf die Startseite, kurz ruhen lassen.
        if (parameter.seitenwechsel) await wechsleSeite(page, parameter.seite)
        await warte(5000)
        warmlaufEndeIndex = speicher.messeJetzt()
        await seitenMetriken.messeJetzt()
        heapSnapshots.ende = await nimmHeapSnapshot(cdp, join(verzeichnis, `heap-${parameter.etikett}-ende.heapsnapshot`))
        console.log(`[messe-chat] Heap-Snapshot am Ende: ${heapSnapshots.ende.mb} MB`)
      } else {
        warmlaufEndeIndex = speicher.proben.length - 1
      }
    }
    if (parameter.turns > 0 && parameter.seite !== '#/chat') {
      await wechsleSeite(page, '#/chat')
      await page.waitForSelector('#chat-eingabe', { timeout: 30_000 })
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
    clearInterval(zwischenstandTimer)
    speicher.stoppe()
    seitenMetriken?.stoppe()
    if (zustandsMessung !== null) await zustandsMessung.stoppe()
    await browser.close().catch(() => {})
    await leitstand.beenden()
  }
  ergebnis.speicher = { proben: speicher.proben, zusammenfassung: {} }
  ergebnis.marken = {
    basisZeit: basisIndex === null ? null : (speicher.proben[basisIndex]?.zeit ?? null),
    endeZeit: warmlaufEndeIndex === null ? null : (speicher.proben[warmlaufEndeIndex]?.zeit ?? null),
    leerlaufEnde,
  }
  ergebnis.seitenMetriken = seitenMetriken?.proben ?? []
  if (heapSnapshots.start !== undefined && heapSnapshots.ende !== undefined) {
    const a = werteHeapSnapshotAus(heapSnapshots.start.datei)
    const b = werteHeapSnapshotAus(heapSnapshots.ende.datei)
    const kopf = (snapshot, auswertung) => ({ datei: relative(WURZEL, snapshot.datei).replace(/\\/g, '/'), mb: snapshot.mb, gesamtMb: auswertung.gesamtMb, knoten: auswertung.knoten, detached: auswertung.detached, zeit: snapshot.zeit })
    ergebnis.heap = { start: kopf(heapSnapshots.start, a), ende: kopf(heapSnapshots.ende, b), topWachstum: heapDiff(a, b) }
  }
  ergebnis.zustand = zustandsMessung?.messungen ?? []
  ergebnis.eventLoop = leitstand.zeilen
    .map((z) => ({ zeit: z.zeit, treffer: z.zeile.match(/^\[leitstand\] Event-Loop 60s: max (\d+) p99 (\d+)$/) }))
    .filter((z) => z.treffer !== null)
    .map((z) => ({ zeit: new Date(z.zeit).toISOString(), max: Number(z.treffer[1]), p99: Number(z.treffer[2]) }))
  ergebnis.synchron = leitstand.zeilen
    .map((z) => ({ zeit: z.zeit, treffer: z.zeile.match(/^\[leitstand\] Synchron > \d+ ms: (.+) (\d+) ms$/) }))
    .filter((z) => z.treffer !== null)
    .map((z) => ({ zeit: new Date(z.zeit).toISOString(), name: z.treffer[1], ms: Number(z.treffer[2]) }))
  ergebnis.quellenFenster = werteQuellenZeilenAus(leitstand.zeilen).fenster
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
    energiemodus: leseEnergiemodus(),
  }
  fasseZusammen(ergebnis)
  const datei = schreibeAusgabe(ergebnis)
  rmSync(zwischenstandDatei, { force: true })
  console.log(`[messe-chat] Geschrieben: ${datei}.md / .json`)
  // F45 P (Challenger 11.10.2026): fällt ein Standby-Fenster in die Messung, gilt der Abschnitt ab dem ersten
  // Standby als ungültig — zusätzlich entsteht die Auswertung des gültigen Teils.
  const standbyBeginn = ersterStandbyBeginn(ergebnis.umgebung.standby)
  if (standbyBeginn !== null) {
    const teil = schneideZu(ergebnis, standbyBeginn, `${parameter.etikett}-gueltig`, 'Standby-Fenster in der Messung (Kernel-Power 506)')
    fasseZusammen(teil)
    console.log(`[messe-chat] Standby ab ${standbyBeginn} — gültiger Teil: ${schreibeAusgabe(teil)}.md`)
  }
  if (ergebnis.abbruch !== null) process.exitCode = 2
}

/**
 * Liest den Energiemodus bei Netzbetrieb lesend aus der Registry (reg.exe, keine neue Abhängigkeit) — F45 P, F-1018:
 * „Beste Energieeffizienz“ drosselt den Leitstand-Prozess.
 * @returns { ac, dc } als GUID und Klartext, oder null außerhalb von Windows bzw. wenn nicht lesbar
 */
function leseEnergiemodus() {
  if (process.platform !== 'win32') return null
  const NAMEN = { '961cc777-2547-4f9d-8174-7d86181b8a7a': 'Beste Energieeffizienz', 'ded574b5-45a0-4f42-8737-46345c09c238': 'Beste Leistung', '00000000-0000-0000-0000-000000000000': 'Ausgeglichen' }
  const lies = (wert) => {
    try {
      const ausgabe = execFileSync('reg.exe', ['query', 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power\\User\\PowerSchemes', '/v', wert], { encoding: 'utf8', windowsHide: true })
      const guid = ausgabe.match(/REG_SZ\s+([0-9a-f-]{36})/i)?.[1]?.toLowerCase() ?? null
      return guid === null ? null : { guid, name: NAMEN[guid] ?? 'unbekannt' }
    } catch {
      return null
    }
  }
  return { ac: lies('ActiveOverlayAcPowerScheme'), dc: lies('ActiveOverlayDcPowerScheme') }
}

/** @param standby - Liste { zeit, ereignis } oder null @returns ISO-Zeit des ersten „Standby beginnt“ oder null */
function ersterStandbyBeginn(standby) {
  return standby?.find((s) => s.ereignis === 'Standby beginnt')?.zeit ?? null
}

/**
 * Schneidet ein Messergebnis auf alles bis grenzeIso zu (Vorher-Basis, gültiger Teil vor einem Standby). Werte mit
 * Zeitstempel danach fallen weg; ein Heap-Snapshot am Ende nach der Grenze entfällt (nur der Start bleibt genannt).
 * @param ergebnis - vollständiges Messergebnis
 * @param grenzeIso - letzte gültige Zeit (ISO)
 * @param etikett - Etikett des Zuschnitts (Dateiname)
 * @param grund - warum zugeschnitten wird (steht in der Messdatei)
 * @returns neues Ergebnisobjekt (das Original bleibt unverändert)
 */
function schneideZu(ergebnis, grenzeIso, etikett, grund) {
  const grenze = Date.parse(grenzeIso)
  const bis = (zeit) => (typeof zeit === 'number' ? zeit : Date.parse(zeit)) <= grenze
  const teil = structuredClone(ergebnis)
  // Ältere Messdateien (F45 B0) tragen Ausgabeordner, Seitenwechsel, Synchron- und Quellenzeilen noch nicht.
  teil.parameter.ausgabe ??= 'b0'
  for (const feld of ['seitenwechsel', 'synchron', 'quellenFenster', 'seitenMetriken', 'eventLoop', 'zustand', 'turns']) teil[feld] ??= []
  teil.parameter.etikett = etikett
  teil.zuschnitt = { quelle: `messung-${ergebnis.parameter.etikett}.json`, bis: new Date(grenze).toISOString(), grund }
  teil.speicher.proben = teil.speicher.proben.filter((p) => bis(p.zeit))
  teil.seitenMetriken = teil.seitenMetriken.filter((m) => bis(m.zeit))
  teil.zustand = teil.zustand.filter((m) => bis(m.zeit))
  teil.eventLoop = teil.eventLoop.filter((e) => bis(e.zeit))
  teil.synchron = teil.synchron.filter((s) => bis(s.zeit))
  teil.quellenFenster = (teil.quellenFenster ?? []).filter((f) => bis(f.zeit))
  teil.seitenwechsel = teil.seitenwechsel.filter((w) => bis(w.zeit))
  teil.turns = teil.turns.filter((t) => bis(t.startZeit))
  teil.marken = {
    basisZeit: teil.marken?.basisZeit ?? teil.speicher.proben[1]?.zeit ?? null,
    endeZeit: teil.speicher.proben.at(-1)?.zeit ?? null,
    leerlaufEnde: Math.min(teil.marken?.leerlaufEnde ?? Number.POSITIVE_INFINITY, grenze),
  }
  if (teil.heap !== null && teil.heap !== undefined && !(typeof teil.heap.ende?.zeit === 'string' && bis(teil.heap.ende.zeit))) teil.heap = null
  return teil
}

/**
 * F-1015 über Mediane: Fenster A = Minute 15–20 nach dem Laden, Fenster B = die letzten 5 min vor dem Ende.
 * @param proben - Speicherproben ({ zeit, chromiumMb })
 * @param metriken - Seitenmetriken ({ zeit, jsHeapMb, knoten, listener })
 * @param ab15Ms - Beginn von Fenster A (ms) oder null
 * @param endeMs - Ende der Messung (ms) oder null
 * @returns je Größe { a, b, faktor } oder null, wenn die Fenster sich überschneiden bzw. leer sind
 */
function medianVergleich(proben, metriken, ab15Ms, endeMs) {
  if (ab15Ms === null || endeMs === null || ab15Ms + 5 * 60_000 > endeMs - 5 * 60_000) return null
  const fenster = (liste, von, bis) => liste.filter((p) => Date.parse(p.zeit) >= von && Date.parse(p.zeit) <= bis)
  const median = (liste, feld) => kennzahlen(liste.map((p) => p[feld])).median
  const vergleich = (liste, feld) => {
    const a = median(fenster(liste, ab15Ms, ab15Ms + 5 * 60_000), feld)
    const b = median(fenster(liste, endeMs - 5 * 60_000, endeMs), feld)
    return { a, b, faktor: typeof a === 'number' && typeof b === 'number' && a > 0 ? Math.round((b / a) * 100) / 100 : null }
  }
  return { chromiumMb: vergleich(proben, 'chromiumMb'), jsHeapMb: vergleich(metriken, 'jsHeapMb'), knoten: vergleich(metriken, 'knoten'), listener: vergleich(metriken, 'listener') }
}

/**
 * Bildet alle Kennzahlen eines Messergebnisses aus seinen Rohwerten (ergebnis.speicher.zusammenfassung und
 * ergebnis.zusammenfassung, in place). Basis des Speicherwachstums ist die erste Probe nach dem Laden
 * (marken.basisZeit), Ende die Probe am Ende des Leerlaufs (marken.endeZeit). F-1015 (Challenger 11.10.2026):
 * zusätzlich je Wert der Stand 15 min nach der Basis — die Aufwärmphase ist ausgenommen.
 * @param ergebnis - Messergebnis mit Rohwerten
 */
function fasseZusammen(ergebnis) {
  const proben = ergebnis.speicher.proben
  const zeitVon = (wert) => (wert === null || wert === undefined ? null : Date.parse(wert))
  const basisMs = zeitVon(ergebnis.marken?.basisZeit)
  const endeMs = zeitVon(ergebnis.marken?.endeZeit)
  const probeBei = (liste, ms) => (ms === null ? undefined : liste.find((p) => Date.parse(p.zeit) >= ms))
  const probeBis = (liste, ms) => (ms === null ? undefined : liste.filter((p) => Date.parse(p.zeit) <= ms).at(-1))
  const basisProbe = probeBei(proben, basisMs)
  const endProbe = probeBis(proben, endeMs)
  const maxWert = (feld) => kennzahlen(proben.map((probe) => probe[feld])).max
  const faktor = (a, b) => (typeof a === 'number' && typeof b === 'number' && a > 0 ? Math.round((b / a) * 100) / 100 : null)
  const prozent = (a, b) => (typeof a === 'number' && typeof b === 'number' && a > 0 ? Math.round(((b - a) / a) * 100) : null)
  const nach15Ms = basisMs === null ? null : basisMs + 15 * 60_000
  const probe15 = endeMs !== null && nach15Ms !== null && nach15Ms < endeMs ? probeBei(proben, nach15Ms) : undefined
  const metrik15 = endeMs !== null && nach15Ms !== null && nach15Ms < endeMs ? probeBei(ergebnis.seitenMetriken, nach15Ms) : undefined
  const metrikEnde = probeBis(ergebnis.seitenMetriken, endeMs === null ? null : endeMs + 30_000)
  ergebnis.speicher.zusammenfassung = {
    maxServerMb: maxWert('serverMb'),
    maxChromiumMb: maxWert('chromiumMb'),
    minFreiMb: proben.length === 0 ? null : Math.min(...proben.map((probe) => probe.freiMb)),
    wachstumServerProzent: prozent(basisProbe?.serverMb, endProbe?.serverMb),
    wachstumChromiumProzent: prozent(basisProbe?.chromiumMb, endProbe?.chromiumMb),
    faktorChromium: faktor(basisProbe?.chromiumMb, endProbe?.chromiumMb),
    f1015: {
      chromiumNach15Mb: probe15?.chromiumMb ?? null,
      chromiumEndeMb: endProbe?.chromiumMb ?? null,
      faktorChromium15: faktor(probe15?.chromiumMb, endProbe?.chromiumMb),
      jsHeap: { nach15: metrik15?.jsHeapMb ?? null, ende: metrikEnde?.jsHeapMb ?? null, faktor: faktor(metrik15?.jsHeapMb, metrikEnde?.jsHeapMb) },
      knoten: { nach15: metrik15?.knoten ?? null, ende: metrikEnde?.knoten ?? null, faktor: faktor(metrik15?.knoten, metrikEnde?.knoten) },
      listener: { nach15: metrik15?.listener ?? null, ende: metrikEnde?.listener ?? null, faktor: faktor(metrik15?.listener, metrikEnde?.listener) },
      // QA-Nachpass F45 P: Einzelproben schwanken (ohne erzwungene Speicherbereinigung, Seite je nach Rotation) —
      // robuster ist der Median der Minuten 15–20 gegen den Median der letzten 5 min.
      median: medianVergleich(proben, ergebnis.seitenMetriken, nach15Ms, endeMs),
    },
  }
  const turns = ergebnis.turns
  const zustandStart = ergebnis.zustand[0]?.zeit ?? 0
  const zustandEnde = ergebnis.marken?.leerlaufEnde ?? Number.POSITIVE_INFINITY
  ergebnis.zusammenfassung = {
    k1: kennzahlen(turns.map((t) => t.k1Ms)),
    k2: kennzahlen(turns.map((t) => t.phasen?.k2)),
    prozess: kennzahlen(turns.map((t) => t.phasen?.prozess)),
    nachbereitung: kennzahlen(turns.map((t) => t.phasen?.nachbereitung)),
    quittungBisPoll: kennzahlen(turns.map((t) => t.client?.quittung_bis_pollergebnis_ms)),
    pollBisAnzeige: kennzahlen(turns.map((t) => t.client?.pollergebnis_bis_darstellung_ms)),
    k3: kennzahlen(turns.filter((t) => t.endart === 'Antwort').map((t) => t.k3Ms)),
    zustand: kennzahlen(ergebnis.zustand.map((m) => m.ms)),
    zustandFrisch: kennzahlen(ergebnis.zustand.filter((m) => m.zeit - zustandStart <= 10 * 60_000).map((m) => m.ms)),
    zustandSpaet: kennzahlen(ergebnis.zustand.filter((m) => m.zeit <= zustandEnde && zustandEnde - m.zeit <= 10 * 60_000).map((m) => m.ms)),
    eventLoopMax: kennzahlen(ergebnis.eventLoop.map((e) => e.max)),
    eventLoopUeber200: ergebnis.eventLoop.filter((e) => e.max > 200).length,
    seitenwechsel: seitenwechselJeSeite(ergebnis.seitenwechsel),
    quellen: quellenJeQuelle(ergebnis.quellenFenster ?? []),
    antworten: turns.filter((t) => t.endart === 'Antwort').length,
    fehler: turns.filter((t) => t.endart === 'Fehler').length,
    haengt: turns.filter((t) => t.endart === 'hängt').length,
    sichtbarBeendet: turns.filter((t) => t.endart !== 'hängt').length,
  }
}

/**
 * Nachträgliche Auswertung einer gespeicherten Messung bis zu einer Grenze (F45 P: Vorher-Basis = die ersten 60 min
 * vor dem Standby). Aufruf: node scripts/messe-chat.mjs --auswerten <messung.json> --bis <ISO-Zeit> --etikett <neu>
 * [--grund <text>]. Schreibt messung-<neu>.md/.json neben die Quelle (Ausgabeordner aus deren Parametern).
 * @param argv - process.argv.slice(2)
 */
function werteGespeicherteMessungAus(argv) {
  const werte = {}
  for (let i = 0; i < argv.length; i += 2) werte[argv[i].replace(/^--/, '')] = argv[i + 1]
  if (typeof werte.auswerten !== 'string' || typeof werte.bis !== 'string' || !/^[a-z0-9-]+$/i.test(werte.etikett ?? '')) throw new Error('Aufruf: --auswerten <messung.json> --bis <ISO-Zeit> --etikett <neu> [--grund <text>]')
  if (Number.isNaN(Date.parse(werte.bis))) throw new Error(`--bis ist keine Zeit: ${werte.bis}`)
  const ergebnis = JSON.parse(readFileSync(resolve(werte.auswerten), 'utf8'))
  const teil = schneideZu(ergebnis, werte.bis, werte.etikett, werte.grund ?? 'nachträglicher Zuschnitt')
  fasseZusammen(teil)
  console.log(`[messe-chat] Geschrieben: ${schreibeAusgabe(teil)}.md / .json`)
}

if (process.argv.includes('--auswerten')) {
  try {
    werteGespeicherteMessungAus(process.argv.slice(2))
  } catch (fehler) {
    console.error('[messe-chat] Abbruch:', fehler)
    process.exit(1)
  }
} else {
  main().catch((fehler) => {
    console.error('[messe-chat] Abbruch:', fehler)
    process.exit(1)
  })
}
