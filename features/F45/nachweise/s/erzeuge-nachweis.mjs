/**
 * Datei: features/F45/nachweise/s/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 S (F-1005) — maskierte Geheimnisse im Leitstand:
 * - #/live: Aktivität mit maskierten Befehlen (Authorization-Kopf, Token-Parameter, --password, URL mit
 *   Passwort) neben einem unveränderten harmlosen Befehl; „Mehr dazu“ und „Gerade“ ebenfalls maskiert;
 * - #/capabilities, Harness-Detail der Einstellungsdatei: jeder env-Wert und der token-Schlüssel maskiert,
 *   apiKeyHelper (ein Pfad) und permissions unverändert.
 * Die Antworten sind fest (page.route), aber mit den ECHTEN Serverfunktionen erzeugt: der Ringpuffer über
 * erzeugeAktivitaetsSpeicher/melde und zielFuerAnzeige (scripts/leitstand/lauf-aktivitaet.mjs), die
 * Harness-Antworten über baueHarnessProjektion/baueHarnessDatei (scripts/leitstand/routen-harness.mjs)
 * gegen ein Wegwerf-Repo mit Testdaten. Kein Modell-Lauf, keine Schreibanfrage (POST → 409 mit Marke).
 * Alle „Geheimnisse“ sind erfundene Testdaten.
 *
 * Wird aufgerufen von: Hand, gegen einen laufenden Leitstand dieses Worktrees —
 *   LEITSTAND_PORT=4199 node scripts/leitstand-server.mjs
 *   node features/F45/nachweise/s/erzeuge-nachweis.mjs [basis]
 * Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { raeumeVerzeichnis } from '../../../../scripts/_aufraeumen.ts'
import { erzeugeAktivitaetsSpeicher, zielFuerAnzeige } from '../../../../scripts/leitstand/lauf-aktivitaet.mjs'
import { baueHarnessDatei, baueHarnessProjektion } from '../../../../scripts/leitstand/routen-harness.mjs'

const basis = process.argv[2] ?? 'http://127.0.0.1:4199'
const ziel = dirname(fileURLToPath(import.meta.url))
const wurzel = resolve(ziel, '../../../..')

const JETZT = Date.now()
const vor = (minuten) => new Date(JETZT - minuten * 60000).toISOString()

// ─── Live: Ringpuffer mit der echten Maskierung ──────────────────────────────
const LAUF = 'lauf-f45s-live-5e2a'
const BEFEHLE = [
  ['Read', 'C:\\Users\\stefa\\Projekte\\ai-workforce\\CLAUDE.md'],
  ['Bash', 'git clone https://stefan:hunter2-test@example.invalid/repo.git'],
  ['Bash', 'mysql --password=Testpasswort123 -u root -e "select 1"'],
  ['Bash', 'npm run check'],
  ['Edit', 'C:\\Users\\stefa\\Projekte\\ai-workforce\\src\\git-starter\\index.ts'],
  ['Bash', 'curl -H "Authorization: Bearer test-abcdefghijklmnop" "https://api.example.invalid/v1?access_token=testtoken42&seite=2"'],
]
let minute = BEFEHLE.length
const speicher = erzeugeAktivitaetsSpeicher({ jetzt: () => vor(minute--) })
speicher.starte(LAUF)
for (const [werkzeug, zielText] of BEFEHLE) speicher.melde(LAUF, { werkzeug, ziel: zielText })
const AKTIVITAET = speicher.lese(LAUF)
const [letzterWerkzeug, letztesZiel] = BEFEHLE[BEFEHLE.length - 1]

const DETAIL_LIVE = {
  laufId: LAUF,
  checkpoints: [{ sequenz: 1, zeitstempel: vor(7), gueltig: true, typ: 'wirkungsmarke', wirkungsmarke: { art: 'run_prepared' }, lineage: null }],
  laufStatus: { status: 'KLAERUNG_ERFORDERLICH', grund: 'RUN_PREPARED ohne Terminalartefakt', blockerId: 'b-1', aufloesungsbedingung: 'Terminalmarke', resumeZiel: 'lauf', evidenz: { offeneRunPreparedSequenzen: [1] } },
  aktiv: true,
  fortschritt: { werkzeug: letzterWerkzeug, ziel: zielFuerAnzeige(letztesZiel) },
  aktivitaet: AKTIVITAET,
  verweigertDaten: null,
  nichtGestartet: null,
  startvorlageZeitgrenzeMs: 1800000,
  kontextpaket: { status: 'ok', rolle: 'ausfuehrung', elemente: [{ pfad: 'CLAUDE.md' }], ausgeschlossen: [] },
  auftrag: { status: 'ok', auftragId: 'auftrag-f45s', titel: 'F45 S · Nachweis Maskierung', auftragstext: 'Testdaten.' },
  laufakte: { status: 'nicht_vorhanden' },
  rohstrom: { status: 'laufakte_fehlt' },
  scoutErgebnis: null,
}
const LAUF_KOPF = { laufId: LAUF, laufStatus: DETAIL_LIVE.laufStatus, ergebnis: null, zeitpunkt: vor(0.2), auftragsbezug: { auftragId: 'auftrag-f45s', titel: DETAIL_LIVE.auftrag.titel }, anzahlCheckpoints: 1, kettenintegritaet: true, kenntnisgenommen: false }

// ─── Harness: Wegwerf-Repo mit Testdaten, echte Projektion und Maskierung ────
const EINSTELLUNGEN = ['.claude', 'settings.json'].join('/')
const SETTINGS = `{
  "env": {
    "ANTHROPIC_API_KEY": "sk-ant-test-0123456789abcdefghij",
    "INTERNER_DIENST_URL": "https://dienst.example.invalid",
    "MEIN_SCHLUESSEL": "klartext-ohne-muster"
  },
  "apiKeyHelper": "/usr/local/bin/schluessel-helfer.sh",
  "permissions": { "allow": ["Bash(npm run check)", "Read"] },
  "mcpServers": { "beispiel": { "token": "test-token-777" } }
}
`
const repo = mkdtempSync(join(tmpdir(), 'f45s-nachweis-'))
let harnessAntwort
let settingsAntwort
let claudeAntwort
try {
  mkdirSync(join(repo, '.claude', 'hooks'), { recursive: true })
  writeFileSync(join(repo, EINSTELLUNGEN), SETTINGS)
  writeFileSync(join(repo, '.claude', 'hooks', 'beispiel.cjs'), '// Hook\n')
  writeFileSync(join(repo, 'CLAUDE.md'), '# Regeln\n\nTestdaten: export GITHUB_TOKEN=ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123\n\nPrüfen mit `npm run check`.\n')
  harnessAntwort = baueHarnessProjektion({ repoWurzel: repo })
  settingsAntwort = baueHarnessDatei({ repoWurzel: repo, pfad: EINSTELLUNGEN }).koerper
  claudeAntwort = baueHarnessDatei({ repoWurzel: repo, pfad: 'CLAUDE.md' }).koerper
} finally {
  raeumeVerzeichnis(repo)
}

// ─── Feste Antworten ────────────────────────────────────────────────────────
const get = (muster, json, status = 200) => ({ muster, methode: 'GET', status, json })
const POST_SPERRE = ['**/api/laeufe**', '**/api/workflows/**', '**/api/entscheidungen', '**/api/chat', '**/api/auftraege**', '**/api/ressourcen/**'].map((muster) => ({ muster, methode: 'POST', status: 409, json: { grund: 'NACHWEIS: POST erkannt' } }))
const datMuster = (pfad) => `**/api/harness/datei?pfad=${encodeURIComponent(pfad)}`

const ANTWORTEN = [
  get('**/api/projekte', { projekte: [{ id: 'ai-workforce', name: 'AI Workforce', repo_pfad: '.', basisverzeichnis: 'kontrollzustand', status: 'IN_ENTWICKLUNG', laufAktiv: true }] }),
  get('**/api/zustand', { laeufe: [LAUF_KOPF], startfehler: [], workflows: [], fehler: [], aktiverLauf: { aktiv: true, laufId: LAUF }, pruefbefehl: 'npm run check', istAiWorkforce: true }),
  get('**/api/workitems', { workitems: [], befunde: [], fehler: [] }),
  get('**/api/workitems?**', { workitems: [], befunde: [], fehler: [] }),
  get('**/api/auftraege', [{ auftragId: 'auftrag-f45s', titel: DETAIL_LIVE.auftrag.titel, workitem_referenz: 'workitem:feature:F45' }]),
  get('**/api/chat', { verlauf: [] }),
  get('**/api/roadmap', { status: 'ok', vision: 'Nachweis', meilensteine: [] }),
  get('**/api/ressourcen', { startvorlagePfad: 'startvorlagen/ai-workforce.json', assessedHinweis: '', eintraege: [] }),
  get('**/api/ressourcen/abdeckung', { startvorlagePfad: 'startvorlagen/ai-workforce.json', rollen: [] }),
  get(`**/api/laeufe/${LAUF}`, DETAIL_LIVE),
  get('**/api/harness', harnessAntwort),
  get('**/api/harness/datei?**', { status: 'fehlt', pfad: 'unbekannt' }),
  get(datMuster(EINSTELLUNGEN), settingsAntwort),
  get(datMuster('CLAUDE.md'), claudeAntwort),
  ...POST_SPERRE,
]

const BEOBACHTUNG = {
  texte: [
    { name: 'Ansicht', selector: '[data-view]:not([hidden])', attribut: 'data-view' },
    { name: 'Gerade', selector: '#live-gerade:not([hidden])' },
    { name: 'Gewählter Aufruf', selector: '#live-aktivitaet .live-zeile[aria-pressed="true"] .live-ziel' },
    { name: 'Mehr dazu: Ziel', selector: '#live-mehr .live-mehr-kopf .live-ziel' },
    { name: 'Detail: Pfad', selector: '#harness-detail .harness-detail-pfad' },
    { name: 'Detail: Inhalt', selector: '#harness-detail .harness-detail-inhalt' },
  ],
  ueberlauf: true,
}
const warte = (selector, timeoutMs = 8000) => ({ warteAufSelector: { selector, timeoutMs } })

/**
 * Eine Folge.
 * @param optionen - url, schritte, hoehe
 * @returns Klickfolge
 */
function folge({ url, schritte, hoehe = 1100 }) {
  return {
    url: `${basis}/${url}`,
    viewport: { breite: 1440, hoehe },
    farbschema: 'dark',
    screenshotQualitaet: 0.75,
    screenshotVollseite: true,
    localStorageSetzen: { 'leitstand-chat-offen': 'false' },
    anfragenAntworten: ANTWORTEN,
    beobachtete: BEOBACHTUNG,
    schritte,
  }
}

const folgen = {
  'live-maskiert': folge({
    url: '#/live',
    hoehe: 1300,
    schritte: [
      { label: '#/live: Aktivität mit maskierten Befehlen (URL-Passwort, --password, Authorization: Bearer, access_token) — „npm run check“ und Pfade unverändert; „Gerade“ maskiert', ...warte('#live-aktivitaet .live-zeile'), screenshot: 'd1440-live-maskiert.webp' },
      { label: 'Klick auf den curl-Aufruf → Mehr dazu: Ziel maskiert', klick: '#live-aktivitaet li:first-child .live-zeile', ...warte('#live-mehr .live-felder'), screenshot: 'k01-mehr-dazu-maskiert.webp' },
    ],
  }),
  'harness-settings-maskiert': folge({
    url: '#/capabilities',
    schritte: [
      { label: '#/capabilities, Harness-Aufbau', ...warte('#harness-skelett .harness-spalte') },
      { label: 'Klick auf settings.json → Detail: jeder env-Wert „••••“, token in mcpServers „••••“; apiKeyHelper (Pfad) und permissions unverändert', klick: `#harness-skelett [data-harness-pfad="${EINSTELLUNGEN}"]`, ...warte('#harness-detail .harness-detail-inhalt'), screenshot: 'd1440-harness-settings-maskiert.webp' },
      { label: 'Klick auf CLAUDE.md → GITHUB_TOKEN maskiert, „npm run check“ unverändert', klick: '#harness-skelett [data-harness-pfad="CLAUDE.md"]', ...warte('#harness-detail .harness-detail-inhalt'), screenshot: 'k01-harness-claude-md-maskiert.webp' },
    ],
  }),
}

for (const [ordner, klickfolge] of Object.entries(folgen)) {
  const verzeichnis = join(ziel, ordner)
  // Nur ein eigener, direkter Unterordner dieses Skripts wird geleert — nie etwas anderes.
  if (!/^[a-z0-9-]+$/.test(ordner) || dirname(verzeichnis) !== ziel) throw new Error(`Ausgabeordner außerhalb von ${ziel}: ${verzeichnis}`)
  rmSync(verzeichnis, { recursive: true, force: true, maxRetries: 5 })
  mkdirSync(verzeichnis, { recursive: true })
  console.log(`\n── ${ordner} ──`)
  const pfad = join(verzeichnis, 'klickfolge.json')
  writeFileSync(pfad, `${JSON.stringify(klickfolge, null, 2)}\n`)
  execFileSync(process.execPath, [join(wurzel, 'scripts/render-nachweis.mjs'), pfad, verzeichnis], { stdio: 'inherit', cwd: wurzel })
}
