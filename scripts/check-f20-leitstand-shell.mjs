/**
 * Datei: scripts/check-f20-leitstand-shell.mjs
 *
 * Zweck: F20-WS-1-Realnachweis für AK1 — die sechs bestehenden Bedienflüsse
 * (Auftrag anlegen, Lauf starten, Freigabe erteilen, Stoppen,
 * Reparaturfassung einreichen, Entscheidung) laufen nach der Modul-
 * Aufteilung von public/leitstand/app.js REAL UNVERÄNDERT. Anders als jedes
 * andere Gate in dieser Kette treibt dieses Skript einen echten, headless
 * Chrome gegen einen echten, isolierten Leitstand-Testserver (Muster
 * erzeugeRequestHandler + fuehreAufgabeDurchFn-Attrappe, wie
 * scripts/check-f10-leitstand.mjs) und KLICKT dort — kein DOM-Dump, kein
 * bloßes Navigieren. Genau die Lücke, die reine Quelltextprüfung oder reine
 * URL-Navigation nicht findet: ein nach dem Modul-Split falsch benannter
 * DOM-Id-Zugriff oder ein vertauschtes Argument in einem Klick-Handler wirft
 * erst beim echten Klick, nie beim Rendern (QA-Pass F20 WS-1, TC-01–TC-06).
 *
 * Fährt einen eigenständigen, minimalen CDP-Client über Node-Bordmittel
 * (globales fetch/WebSocket, kein npm-Paket) statt eines Browser-Automation-
 * Pakets — es gibt keine Netzwerkgarantie für einen npm-Install, und ein
 * neues Werkzeug bräuchte laut ARCHITECTURE.md §6 erst einen Lauf des Skills
 * werkzeug-auswahl.
 *
 * Isolation (keine Berührung der echten kontrollzustand/-Daten): eigenes
 * basisVerzeichnis unter kontrollzustand-test-f20-shell-<random>, eigener
 * Ephemeral-Loopback-Port, fuehreAufgabeDurchFn ist eine Attrappe — es
 * startet nie ein echtes Claude-Code/Codex-Kindprozess. publicVerzeichnis
 * bleibt der ECHTE public/leitstand/-Ordner (Default von erzeugeRequestHandler),
 * damit real die aktuelle Modul-Aufteilung geladen wird.
 *
 * Wird aufgerufen von:
 * - manuell / .github/workflows/ci.yml (node scripts/check-f20-leitstand-shell.mjs,
 *   eigener CI-Schritt) — NICHT in `npm run check` eingehängt: dieses Gate startet
 *   einen echten Chrome-Prozess und ist damit langsamer und infrastrukturabhängiger
 *   (Chrome/Edge-Installation nötig) als jedes andere Gate in der Kette. Ob es
 *   dauerhaft eingehängt wird, ist eine eigene Entscheidung (Auswirkung auf jede
 *   Umgebung, die `npm run check` ausführt).
 * - scripts/check-f20-leitstand-shell.test.mjs (node:test, Teil von `npm run check`)
 *   — importiert starteChrome/beendeProzessUndWarte und spawnt einen ATTRAPPEN-
 *   Prozess statt echtem Chrome (Muster scripts/erzeuge-invocation-policy-nachweise.mjs);
 *   der `istDirekterAufruf`-Wächter am Dateiende sorgt dafür, dass dieser Import NIE
 *   haupt() und damit NIE einen echten Chrome-Lauf auslöst.
 *
 * Befund BUG P0 (state/findings.md, GitHub-Actions-Lauf #34885699720, behoben):
 * starteChrome lehnte die Promise bei einem Timeout NUR ab (reject), killte den
 * gespawnten Chrome-Prozess aber nie — dessen offene stderr-Pipe hielt den
 * Node-Prozess am Leben, der CI-Job hing 20+ Minuten statt nach 15s rot zu werden.
 * Behoben über beendeProzessUndWarte (killt + wartet auf das echte Prozessende,
 * in JEDEM der drei Fehlerzweige von starteChrome) PLUS einen harten
 * Watchdog auf Skriptebene (WATCHDOG_OBERGRENZE_MS, siehe Dateiende) als zweite,
 * ursachenunabhängige Sicherung.
 *
 * Aufruf: node scripts/check-f20-leitstand-shell.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { existsSync, mkdirSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { erzeugeRequestHandler } from './leitstand-server.mjs'
import { schreibeWirkungsmarke } from '../src/checkpoint-store/index.ts'
import { registriereAuftrag } from '../src/auftrag/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []

const PROFIL_REFERENZ = leiteProfilReferenzAb(ladeStartvorlage('startvorlagen/beispielprojekt.json'))
const STILL = () => {}

// ─── Minimaler CDP-Client (kein npm-Paket, siehe Datei-Kommentar) ──────────

// Windows-Pfade zuerst (lokale Entwicklung), dann die Linux-Pfade des
// GitHub-Actions-Runners ubuntu-latest (Chrome ist dort vorinstalliert,
// Stand des Runner-Software-Manifests) — dieselbe Liste bedient beide.
const CHROME_KANDIDATEN = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
]

function findeChrome() {
  return CHROME_KANDIDATEN.find((pfad) => existsSync(pfad)) ?? null
}

/**
 * Baut ein eigenes, isoliertes Chrome-Profilverzeichnis unter os.tmpdir() —
 * ABSOLUT und kurz gehalten (nicht unter dem Repo-Pfad, der auf Windows
 * bereits tief verschachtelt sein kann und mit einer UUID-Suffix real an
 * MAX_PATH/260 Zeichen stoßen kann), und legt es vorab an
 * (mkdirSync .. recursive): Chrome legt ein fehlendes --user-data-dir nicht
 * in jeder Umgebung selbst an und bricht sonst mit einem nativen Fehler ab
 * ("Erstellen eines Datenverzeichnisses fehlgeschlagen"), der auch unter
 * --headless=new sichtbar wird und die DevTools-Adresse nie auf stderr
 * meldet. @returns absoluter Pfad zum angelegten Profilverzeichnis
 */
function legeChromeProfilAn() {
  const pfad = join(tmpdir(), `ct-f20-${randomUUID().slice(0, 8)}`)
  mkdirSync(pfad, { recursive: true })
  return pfad
}

/** Feste Chrome-Flags von starteChrome — als Konstante ausgekoppelt, damit ein Test einen Attrappen-Prozess (kein echtes Chrome) mit EIGENEN Argumenten spawnen kann (siehe starteChrome-Parameter 'argumente'), ohne die Produktionswerte zu duplizieren (D5). */
const STANDARD_CHROME_ARGUMENTE = ['--remote-debugging-port=0', '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-sync', '--disable-background-networking']

/** Die Chrome-Startfrist aus starteChrome (F20 WS-1-Kommentar oben) — als benannte Konstante, damit der Watchdog unten seine Obergrenze sichtbar relativ dazu begründen kann, statt eine zweite, unabhängig gepflegte Zahl zu tragen. */
const CHROME_DEVTOOLS_FRIST_MS = 15000

/**
 * Killt einen gespawnten Kindprozess und wartet auf sein TATSÄCHLICHES Ende,
 * statt sich auf kill() allein zu verlassen (kill() liefert nur an, dass das
 * Signal gesendet wurde, nicht dass der Prozess schon beendet ist). Ein
 * reject()/return OHNE dieses Warten hält eine offene stdio-Pipe des noch
 * laufenden Kindprozesses am Leben — genau das ließ diesen Gate-Schritt in
 * CI 20+ Minuten hängen, statt nach der 15s-Frist rot zu werden (real
 * beobachtet, GitHub-Actions-Lauf #34885699720): starteChrome lehnte die
 * Promise beim Timeout NUR ab, der gespawnte Chrome-Prozess lief weiter.
 * Bereits an einer Stelle (haupt()-finally) vorhanden gewesen — hierher
 * gezogen, damit starteChrome UND haupt() denselben Regelsatz benutzen
 * (D5), statt ihn zweimal leicht unterschiedlich zu pflegen.
 * @param prozess - ein von node:child_process.spawn zurückgegebenes ChildProcess, oder null (No-op)
 */
export async function beendeProzessUndWarte(prozess) {
  if (prozess === null) return
  if (prozess.exitCode !== null || prozess.signalCode !== null) return
  await new Promise((abschliessen) => {
    prozess.once('exit', abschliessen)
    prozess.kill()
  })
}

/**
 * Startet Chrome headless mit einem eigenen, isolierten Profil und einem vom
 * Betriebssystem zugewiesenen Debug-Port (`--remote-debugging-port=0`) —
 * NIEMALS ein geratener/fester Port: ein geratener Port könnte mit einer
 * bereits laufenden, fremden Chrome-Instanz (z. B. dem echten Browserfenster
 * des Menschen) kollidieren, und dieses Skript hätte dann versehentlich
 * DEREN Sitzung angesprochen statt der eigenen isolierten. Der tatsächlich
 * gewählte Port steht NUR auf dem stderr GENAU dieses gespawnten Prozesses
 * ("DevTools listening on ws://…") — das ist die einzige Quelle, aus der
 * dieser Code je einen Port oder eine WebSocket-Adresse liest.
 *
 * JEDER der drei Fehlerzweige (Timeout, Exit vor der DevTools-Meldung,
 * Spawn-Fehler wie ENOENT/EACCES über das 'error'-Ereignis) lehnt die
 * Promise ERST ab, NACHDEM beendeProzessUndWarte den Prozess nachweislich
 * beendet hat — kein Fehlerfall darf einen laufenden Prozess zurücklassen
 * (siehe beendeProzessUndWarte-Kommentar). Der Exit-Zweig ruft
 * beendeProzessUndWarte ebenfalls auf, obwohl der Prozess dort per
 * Definition bereits beendet ist (kill() wird dank der exitCode-Prüfung
 * dort zum No-op) — EIN Regelsatz für alle drei Zweige statt einer
 * stillschweigenden Ausnahme für den vermeintlich schon sicheren Fall.
 * @param profilVerzeichnis - absoluter, bereits existierender Pfad (legeChromeProfilAn)
 * @param optionen.argumente - Chrome-Flags ohne --user-data-dir (Default STANDARD_CHROME_ARGUMENTE; ein Test setzt hier eigene Argumente für einen Attrappen-Prozess ein)
 * @param optionen.timeoutMs - DevTools-Startfrist in ms (Default CHROME_DEVTOOLS_FRIST_MS; ein Test verkürzt das, um nicht real 15s zu warten)
 * @returns { prozess, browserWsUrl }
 */
export async function starteChrome(chromePfad, profilVerzeichnis, optionen = {}) {
  const { argumente = STANDARD_CHROME_ARGUMENTE, timeoutMs = CHROME_DEVTOOLS_FRIST_MS } = optionen
  const prozess = spawn(chromePfad, [...argumente, `--user-data-dir=${profilVerzeichnis}`], { stdio: ['ignore', 'ignore', 'pipe'] })
  const browserWsUrl = await new Promise((promiseAufloesen, promiseAblehnen) => {
    let puffer = ''
    let erledigt = false

    /**
     * Sorgt dafür, dass genau EIN Zweig die Promise abschließt (die drei Ereignis-Listener unten
     * können nach einem Spawn-Fehler alle noch feuern — Node garantiert 'error' UND 'exit' bei
     * einem gescheiterten Spawn, ab Node 15). Hängt den betroffenen Prozess als 'prozess' an den
     * Fehler — nicht Zierrat: der Regressionstest in check-f20-leitstand-shell.test.mjs beweist
     * darüber, dass der Prozess beim Reject nachweislich (Node-eigenes exitCode/signalCode) schon
     * beendet ist, statt sich auf eine reine Fehlertext-Prüfung zu verlassen (Bauauftrag).
     */
    async function ablehnenUndAufraeumen(fehler) {
      if (erledigt) return
      erledigt = true
      clearTimeout(timeout)
      await beendeProzessUndWarte(prozess)
      fehler.prozess = prozess
      promiseAblehnen(fehler)
    }

    const timeout = setTimeout(
      () => ablehnenUndAufraeumen(new Error(`Chrome hat innerhalb von ${timeoutMs}ms keine DevTools-Adresse auf stderr gemeldet. stderr bisher: ${puffer.trim().slice(-500) || '(leer)'}`)),
      timeoutMs
    )
    prozess.stderr.on('data', (chunk) => {
      puffer += chunk.toString()
      const treffer = puffer.match(/DevTools listening on (ws:\/\/\S+)/)
      if (treffer && !erledigt) {
        erledigt = true
        clearTimeout(timeout)
        promiseAufloesen(treffer[1])
      }
    })
    prozess.once('exit', (code) => {
      // ablehnenUndAufraeumen ist async (await beendeProzessUndWarte) — der Ereignis-Handler
      // selbst kann sie nicht awaiten; 'void' markiert das Nicht-Warten hier ausdrücklich als
      // beabsichtigt (kein verschlucktes Promise, lint/nursery/noFloatingPromises).
      void ablehnenUndAufraeumen(new Error(`Chrome ist vor der DevTools-Meldung beendet worden (Exit-Code ${code})`))
    })
    prozess.once('error', (fehler) => {
      void ablehnenUndAufraeumen(new Error(`Chrome konnte nicht gestartet werden: ${fehler.message}`))
    })
  })
  return { prozess, browserWsUrl }
}

/** Verbindet sich mit der Browser-Ebene der DevTools-Protokoll-WebSocket (aus starteChrome). @returns { send, schliessen } */
function verbindeBrowser(browserWsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(browserWsUrl)
    let naechsteId = 1
    const ausstehend = new Map()
    ws.addEventListener('message', (ereignis) => {
      const nachricht = JSON.parse(ereignis.data)
      if (nachricht.id !== undefined && ausstehend.has(nachricht.id)) {
        const { resolve: r, reject: j } = ausstehend.get(nachricht.id)
        ausstehend.delete(nachricht.id)
        if (nachricht.error) j(new Error(nachricht.error.message))
        else r(nachricht.result)
      }
    })
    ws.addEventListener('error', reject)
    ws.addEventListener('open', () => {
      const send = (method, params = {}, sessionId) =>
        new Promise((r, j) => {
          const id = naechsteId++
          ausstehend.set(id, { resolve: r, reject: j })
          const nachricht = sessionId === undefined ? { id, method, params } : { id, method, params, sessionId }
          ws.send(JSON.stringify(nachricht))
        })
      resolve({ send, schliessen: () => ws.close() })
    })
  })
}

/**
 * Erzeugt einen neuen Tab (Target.createTarget) auf der Browser-Verbindung,
 * hängt sich als eigene ("flache") Session daran (Target.attachToTarget) und
 * liefert send()/auswerten()/schliessen() für GENAU diesen Tab.
 * @returns Promise<Tab>
 */
async function oeffneTab(browser, url) {
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true })
  const send = (method, params = {}) => browser.send(method, params, sessionId)
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Page.navigate', { url })
  return {
    send,
    /** Führt einen Ausdruck im Seitenkontext aus. @param ausdruck - JS-Ausdruck (kein Statement-Block, IIFE bei mehreren Anweisungen) @param awaitPromise - true, wenn ausdruck ein Promise liefert @returns der Rückgabewert (per returnByValue) */
    async auswerten(ausdruck, awaitPromise = false) {
      const ergebnis = await send('Runtime.evaluate', { expression: ausdruck, returnByValue: true, awaitPromise })
      if (ergebnis.exceptionDetails) {
        throw new Error(`Seiten-Exception bei '${ausdruck.slice(0, 100)}': ${ergebnis.exceptionDetails.text}`)
      }
      return ergebnis.result?.value
    },
    schliessen: () => browser.send('Target.closeTarget', { targetId }),
  }
}

/** Navigiert den Tab zu einer neuen URL und wartet auf 'complete' plus eine kurze Verschnaufpause für async Ladevorgänge (ladeAuftraege, laden(), ...). */
async function navigiere(tab, url) {
  await tab.send('Page.navigate', { url })
  const start = Date.now()
  while (Date.now() - start < 10000) {
    const bereit = await tab.auswerten("document.readyState === 'complete'")
    if (bereit) break
    await new Promise((r) => setTimeout(r, 100))
  }
  await tab.auswerten('new Promise((r) => setTimeout(r, 400))', true)
}

const warte = (tab, ms) => tab.auswerten(`new Promise((r) => setTimeout(r, ${ms}))`, true)

// ─── Fixtures ────────────────────────────────────────────────────────────

function schrittFixture(schrittId, nachfolger, felder = {}) {
  return {
    schritt_id: schrittId,
    rolle: 'ausfuehrung',
    werkzeugsatz: 'lesend',
    worker: 'claude-code',
    modell: 'f20-shell-test-modell',
    eingaben: [],
    output_schema: null,
    freigabe: 'AUTOMATISCH',
    risiko: 'F20-WS-1-Realnachweis, kein echter Lauf.',
    zeitgrenze_ms: 600000,
    nachfolger,
    status: 'OFFEN',
    lauf_id: null,
    ...felder,
  }
}

function workflowFixture(workflowId, schritte, felder = {}) {
  return {
    workflow_schema: 'v0',
    workflow_id: workflowId,
    auftrag_id: 'f20-shell-test-auftrag',
    version: 1,
    ziel: 'F20-WS-1-Realnachweis.',
    status: 'OFFEN',
    aktiver_schritt_id: schritte[0].schritt_id,
    grenzen: { max_schritte: 8, max_replans: 2 },
    schritte,
    ...felder,
  }
}

// ─── Die sechs Testblöcke ───────────────────────────────────────────────

async function testAuftragAnlegen(tab, basisUrl) {
  await navigiere(tab, `${basisUrl}/#/projekt`)
  const titel = `f20-shell-auftrag-${Date.now()}`
  await tab.auswerten(
    `(() => {
      document.getElementById('auftrag-titel').value = ${JSON.stringify(titel)}
      document.getElementById('auftrag-auftragstext').value = 'F20-WS-1-Realnachweis: Auftrag anlegen.'
      document.getElementById('auftrag-anlegen').click()
    })()`
  )
  await warte(tab, 500)
  const fehlerSichtbar = await tab.auswerten("document.getElementById('auftrag-anlegen-fehler').hidden === false")
  if (fehlerSichtbar) {
    befunde.push(`Auftrag anlegen: Fehleranzeige nach Klick sichtbar: ${await tab.auswerten("document.getElementById('auftrag-anlegen-fehler').textContent")}`)
    return
  }
  const auftraege = await fetch(`${basisUrl}/api/auftraege`).then((r) => r.json())
  if (!auftraege.some((a) => a.titel === titel)) {
    befunde.push(`Auftrag anlegen: kein Auftrag mit Titel '${titel}' unter GET /api/auftraege gefunden — Klick hat nicht real geschrieben.`)
    return
  }
  console.log('✓ Auftrag anlegen: Klick auf "Auftrag anlegen" hat real POST /api/auftraege ausgelöst, Auftrag erscheint in GET /api/auftraege.')
}

async function testLaufStarten(tab, basisUrl) {
  // Bleibt bewusst auf #/projekt (derselbe Ladevorgang wie testAuftragAnlegen) — initAuftragFormular
  // hat #start-auftrag nach dem Anlegen bereits neu geladen (ladeAuftraege()), der neue (einzige)
  // Auftrag in diesem basisVerzeichnis ist damit schon vorausgewählt.
  await tab.auswerten(
    `(() => {
      document.getElementById('start-werkzeugsatz').selectedIndex = 0
      document.getElementById('start-starten').click()
    })()`
  )
  await warte(tab, 800)
  const fehlerSichtbar = await tab.auswerten("document.getElementById('start-fehler').hidden === false")
  if (fehlerSichtbar) {
    befunde.push(`Lauf starten: Fehleranzeige nach Klick sichtbar: ${await tab.auswerten("document.getElementById('start-fehler').textContent")}`)
    return
  }
  const erfolgSichtbar = await tab.auswerten("document.getElementById('start-erfolg').hidden === false")
  if (!erfolgSichtbar) {
    befunde.push('Lauf starten: weder Erfolgs- noch Fehlermeldung sichtbar nach Klick auf "Starten".')
    return
  }
  console.log('✓ Lauf starten: Klick auf "Starten" hat real POST /api/laeufe ausgelöst (Erfolgsmeldung sichtbar).')
}

async function testFreigabeErteilen(tab, basisUrl, workflowId) {
  await navigiere(tab, `${basisUrl}/#/workflows/${encodeURIComponent(workflowId)}`)
  const knopfVorhanden = await tab.auswerten("document.querySelector('.wf-aktion[data-aktion=\"freigeben\"]') !== null")
  if (!knopfVorhanden) {
    befunde.push(`Freigabe erteilen: kein 'Freigeben'-Button im DOM (Bedienblock: ${await tab.auswerten("document.getElementById('workflow-bedienung')?.textContent ?? ''")}).`)
    return
  }
  await tab.auswerten(
    `(() => {
      document.getElementById('wf-freigabe-begruendung').value = 'F20-WS-1-Realnachweis.'
      document.querySelector('.wf-aktion[data-aktion="freigeben"]').click()
    })()`
  )
  await warte(tab, 800)
  const detail = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}`).then((r) => r.json())
  const schritt = detail.daten?.schritte?.[0]
  const akzeptiert = schritt?.freigabe_erteilt === true || schritt?.status === 'LAEUFT' || schritt?.status === 'ERFOLGREICH'
  if (!akzeptiert) {
    befunde.push(`Freigabe erteilen: Schrittzustand nach Klick unerwartet (${JSON.stringify({ status: schritt?.status, freigabe_erteilt: schritt?.freigabe_erteilt })}), Meldung: '${await tab.auswerten("document.getElementById('workflow-bedienung-meldung')?.textContent ?? ''")}'`)
    return
  }
  console.log(`✓ Freigabe erteilen: Klick auf "Freigeben" hat real POST .../freigabe ausgelöst (Schrittstatus danach: '${schritt?.status}').`)
}

async function testStoppen(tab, basisUrl, workflowId) {
  await navigiere(tab, `${basisUrl}/#/workflows/${encodeURIComponent(workflowId)}`)
  const knopfVorhanden = await tab.auswerten("document.querySelector('.wf-aktion[data-aktion=\"stoppen\"]') !== null")
  if (!knopfVorhanden) {
    befunde.push('Stoppen: kein "Stoppen"-Button im DOM.')
    return
  }
  await tab.auswerten(
    `(() => {
      document.getElementById('wf-stopp-begruendung').value = 'F20-WS-1-Realnachweis.'
      document.querySelector('.wf-aktion[data-aktion="stoppen"]').click()
    })()`
  )
  await warte(tab, 500)
  const detail = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}`).then((r) => r.json())
  if (detail.daten?.status !== 'GESTOPPT') {
    befunde.push(`Stoppen: Workflow-Status nach Klick erwartet 'GESTOPPT', erhalten '${detail.daten?.status}'. Meldung: '${await tab.auswerten("document.getElementById('workflow-bedienung-meldung')?.textContent ?? ''")}'`)
    return
  }
  console.log('✓ Stoppen: Klick auf "Stoppen" hat real POST .../stoppen ausgelöst (Status danach GESTOPPT).')
}

async function testReparaturEinreichen(tab, basisUrl, workflowId) {
  await navigiere(tab, `${basisUrl}/#/workflows/${encodeURIComponent(workflowId)}`)
  const vorbereitenVorhanden = await tab.auswerten("document.querySelector('.wf-aktion[data-aktion=\"reparatur\"]') !== null")
  if (!vorbereitenVorhanden) {
    befunde.push('Reparaturfassung einreichen: kein "Reparaturfassung vorbereiten"-Button im DOM.')
    return
  }
  await tab.auswerten("document.querySelector('.wf-aktion[data-aktion=\"reparatur\"]').click()")
  await warte(tab, 600)
  const entwurfVorhanden = await tab.auswerten("document.getElementById('wf-reparatur-entwurf') !== null")
  if (!entwurfVorhanden) {
    befunde.push('Reparaturfassung einreichen: Entwurf-Textarea nach Klick auf "Reparaturfassung vorbereiten" nicht im DOM.')
    return
  }
  await tab.auswerten("document.getElementById('wf-reparatur-einreichen').click()")
  await warte(tab, 600)
  const detail = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}`).then((r) => r.json())
  if (!(detail.versionSequenz >= 2) || detail.daten?.status !== 'OFFEN') {
    befunde.push(`Reparaturfassung einreichen: erwartet neue Version mit status 'OFFEN', erhalten versionSequenz=${detail.versionSequenz} status=${detail.daten?.status}. Meldung: '${await tab.auswerten("document.getElementById('wf-reparatur-meldung')?.textContent ?? ''")}'`)
    return
  }
  console.log('✓ Reparaturfassung einreichen: Klick auf "Einreichen" hat real POST /api/workflows ausgelöst (neue Version, Status OFFEN).')
}

async function testEntscheidungKlaerung(tab, basisUrl, laufId) {
  await navigiere(tab, `${basisUrl}/#/runs/${encodeURIComponent(laufId)}`)
  const formularVorhanden = await tab.auswerten("document.getElementById('entscheidung-terminal-speichern') !== null")
  if (!formularVorhanden) {
    befunde.push(`Entscheidung (Klärung auflösen): Entscheidungs-Formular nicht im DOM (Detail-Titel: '${await tab.auswerten("document.getElementById('lauf-detail-titel')?.textContent ?? ''")}').`)
    return
  }
  await tab.auswerten(
    `(() => {
      document.getElementById('entscheidung-terminal-ergebnis').value = 'ERFOLGREICH'
      document.getElementById('entscheidung-terminal-begruendung').value = 'F20-WS-1-Realnachweis.'
      document.getElementById('entscheidung-terminal-speichern').click()
    })()`
  )
  await warte(tab, 500)
  const antwort = await fetch(`${basisUrl}/api/laeufe/${encodeURIComponent(laufId)}`).then((r) => r.json())
  if (antwort.laufStatus?.status !== 'ABGESCHLOSSEN' || antwort.laufStatus?.ergebnis !== 'ERFOLGREICH') {
    befunde.push(`Entscheidung (Klärung auflösen): LaufStatus nach Klick erwartet ABGESCHLOSSEN/ERFOLGREICH, erhalten ${JSON.stringify(antwort.laufStatus)}. Fehler: '${await tab.auswerten("document.getElementById('entscheidung-terminal-fehler')?.textContent ?? ''")}'`)
    return
  }
  console.log('✓ Entscheidung (Klärung auflösen): Klick auf "Entscheidung speichern" hat real POST /api/entscheidungen ausgelöst (Lauf ABGESCHLOSSEN/ERFOLGREICH).')
}

// ─── Aufbau, Ablauf, Aufräumen ───────────────────────────────────────────

async function haupt() {
  const chromePfad = findeChrome()
  if (chromePfad === null) {
    befunde.push('Kein Chrome/Edge unter den bekannten Installationspfaden gefunden — Realnachweis nicht durchführbar.')
    return
  }

  const basisVerzeichnis = `kontrollzustand-test-f20-shell-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const chromeProfilVerzeichnis = legeChromeProfilAn()
  let httpServer = null
  let chromeProzess = null
  let browser = null
  let tab = null

  try {
    // Auftrag für die Workflow-Fixtures REAL registrieren (nicht nur eine freie auftrag_id-Angabe)
    // — sonst schlägt der reale Start nach der Freigabe mit "Auftrag nicht gefunden" fehl, und der
    // Freigabe-Testfall bestünde nur zufällig über freigabe_erteilt statt über einen echten,
    // durchgelaufenen Start (real beobachtet, erster Lauf dieses Skripts).
    registriereAuftrag('f20-shell-test-auftrag', PROFIL_REFERENZ, 'F20-WS-1-Realnachweis', 'F20-WS-1-Realnachweis: Fixture-Auftrag für die Workflow-Bedienung.', { basisVerzeichnis, schreiber: STILL })

    const workflowFreigabeId = `f20-shell-freigabe-${randomUUID()}`
    registriereWorkflow(workflowFixture(workflowFreigabeId, [schrittFixture('schritt-1', null, { freigabe: 'ZWINGEND' })]), PROFIL_REFERENZ, { basisVerzeichnis, schreiber: STILL })

    const workflowStoppId = `f20-shell-stopp-${randomUUID()}`
    registriereWorkflow(workflowFixture(workflowStoppId, [schrittFixture('schritt-1', null)]), PROFIL_REFERENZ, { basisVerzeichnis, schreiber: STILL })

    const workflowReparaturId = `f20-shell-reparatur-${randomUUID()}`
    registriereWorkflow(
      workflowFixture(workflowReparaturId, [schrittFixture('schritt-1', null, { status: 'FEHLGESCHLAGEN' })], { status: 'GESTOPPT', grund: 'F20-WS-1-Realnachweis: für Reparatur vorbereitet.' }),
      PROFIL_REFERENZ,
      { basisVerzeichnis, schreiber: STILL }
    )

    const laufKlaerungId = `f20-shell-klaerung-${randomUUID()}`
    schreibeWirkungsmarke(laufKlaerungId, PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis, schreiber: STILL })

    const fuehreAufgabeDurchFn = async () => ({ ok: true, ergebnis: { klassifikation: 'ERFOLGREICH' } })
    httpServer = createServer(erzeugeRequestHandler({ basisVerzeichnis, fuehreAufgabeDurchFn }))
    await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve))
    const basisUrl = `http://127.0.0.1:${httpServer.address().port}`

    const { prozess, browserWsUrl } = await starteChrome(chromePfad, chromeProfilVerzeichnis)
    chromeProzess = prozess
    browser = await verbindeBrowser(browserWsUrl)
    tab = await oeffneTab(browser, `${basisUrl}/#/dashboard`)
    await warte(tab, 500)

    const anzahlVorher = befunde.length
    await testAuftragAnlegen(tab, basisUrl)
    if (befunde.length === anzahlVorher) await testLaufStarten(tab, basisUrl)
    await testFreigabeErteilen(tab, basisUrl, workflowFreigabeId)
    await testStoppen(tab, basisUrl, workflowStoppId)
    await testReparaturEinreichen(tab, basisUrl, workflowReparaturId)
    await testEntscheidungKlaerung(tab, basisUrl, laufKlaerungId)
  } catch (fehler) {
    befunde.push(`Unerwarteter Fehler im Testablauf: ${fehler.stack ?? fehler.message}`)
  } finally {
    try {
      await tab?.schliessen()
    } catch {
      // Tab evtl. schon weg (z. B. nach einem Absturz) — kein Zweitbefund dafür.
    }
    browser?.schliessen()
    // Auf das tatsächliche Prozessende warten, nicht nur auf kill(): Chrome hält sein
    // --user-data-dir-Verzeichnis (Lock-Dateien) bis zum echten Exit offen — ein rmSync direkt
    // nach kill() lief real in ein EPERM, weil der Prozess zu diesem Zeitpunkt noch lief.
    // beendeProzessUndWarte (Muster oben, jetzt gemeinsam mit starteChrome) übernimmt das.
    await beendeProzessUndWarte(chromeProzess)
    if (httpServer !== null) await new Promise((resolve) => httpServer.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
    try {
      raeumeVerzeichnis(chromeProfilVerzeichnis)
    } catch (fehler) {
      // Aufräumen des Chrome-Profils ist Hygiene, kein Testergebnis — ein hier noch
      // gesperrtes Temp-Verzeichnis (Virenscanner, Windows-Indexer) darf das Gate-Ergebnis
      // der sechs Bedienflüsse oben nicht überschreiben.
      console.error(`[check-f20-leitstand-shell] Chrome-Profilverzeichnis '${chromeProfilVerzeichnis}' konnte nicht aufgeräumt werden: ${fehler.message}`)
    }
  }
}

// Nur beim direkten Aufruf (`node scripts/check-f20-leitstand-shell.mjs`, so auch in
// .github/workflows/ci.yml) tatsächlich einen echten Chrome-Lauf starten — ein Import dieser
// Datei aus scripts/check-f20-leitstand-shell.test.mjs (testet starteChrome/beendeProzessUndWarte
// mit einem Attrappen-Prozess statt echtem Chrome) darf haupt() nicht mitausführen. Muster:
// scripts/erzeuge-invocation-policy-nachweise.mjs, scripts/leitstand-server.mjs.
const istDirekterAufruf = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (istDirekterAufruf) {
  console.log('\n=== F20-WS-1-Realnachweis (AK1, sechs Bedienflüsse per echtem Chrome-Klick) ===\n')

  // Harter Watchdog auf Skriptebene (Befund BUG P0, GitHub-Actions-Lauf #34885699720): egal WELCHE
  // Ursache ein offener Handle künftig noch hätte (nicht nur die jetzt behobene fehlende
  // Prozess-Beendigung in starteChrome) — dieses Gate darf in CI NIE wieder 20+ Minuten hängen,
  // statt zeitnah rot zu werden. Obergrenze bewusst deutlich über der 15s-Chrome-DevTools-Frist
  // (CHROME_DEVTOOLS_FRIST_MS): Raum für den worst case dort PLUS die sechs Testblöcke (je
  // 500-800ms feste Wartezeit plus Navigation) PLUS Aufräumen auf einem langsamen Runner — aber
  // weit unter der real beobachteten Hängedauer, damit ein echter Hänger den CI-Job zuverlässig
  // in Minuten statt in einer halben Stunde beendet.
  const WATCHDOG_OBERGRENZE_MS = 90_000
  const watchdog = setTimeout(() => {
    console.error(`\n✗ Watchdog: check-f20-leitstand-shell.mjs lief länger als ${WATCHDOG_OBERGRENZE_MS}ms (Obergrenze deutlich über der ${CHROME_DEVTOOLS_FRIST_MS}ms-Chrome-Frist) — erzwungenes Prozessende statt eines CI-Hängers (Befund BUG P0, state/findings.md).\n`)
    process.exit(1)
  }, WATCHDOG_OBERGRENZE_MS)

  await haupt()
  clearTimeout(watchdog)

  console.log('')
  if (befunde.length === 0) {
    console.log('✓ Keine Befunde.\n')
    process.exitCode = 0
  } else {
    console.log(`✗ ${befunde.length} Befund(e):\n`)
    for (const b of befunde) console.log(`  - ${b}`)
    console.log('')
    process.exitCode = 1
  }
}
