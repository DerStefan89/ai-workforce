/**
 * Datei: features/F46/nachweise/d4/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweise F46 D4 „Entwicklung: Reiterzeile, Code, Tech Debt & Prozess, Auftrag anlegen“
 * — alles mit festen Antworten (page.route), kein Git-Aufruf aus dem Browser heraus, kein Modell-Lauf,
 * keine Schreibanfrage (jeder POST auf /api/auftraege/**, /api/laeufe/**, /api/workflows/** und
 * /api/features/** bekäme 409 mit der Marke „NACHWEIS: POST erkannt“):
 * - #/code mit Änderungen und gewählter Datei (Diff), Commit-Freigabe gültig, Klick auf eine zweite
 *   Datei, Verlaufsfilter „Fixes“, Reiter „Tech Debt & Prozess“ von #/code aus;
 * - #/code ohne Änderungen (sauberer Arbeitsbaum) und mit Git-Fehler (Feldstatus, Zeitgrenze);
 * - Tech Debt & Prozess mit Filter (Karte Prozess-Schuld, P2, alle Status);
 * - #/projekt mit rechter Spalte: bereit (Titel und Ergebnis getippt, Feature-Branch) und Hinweis main;
 * - Matrix 1440 dunkel, 1440 hell, 390 dunkel, 1440 mit 200 % Zoom, ru — für #/code, Tech Debt und
 *   #/projekt;
 * - Escape-Fall (HTML in Commit-Betreff, Dateiname, Branch und Diff).
 * Die Folgen laufen über scripts/render-nachweis.mjs (klickfolge.json je Unterordner). Screenshots als
 * WebP. Vor dem Lauf leert das Skript die Ausgabeordner GENAU der Folgen, die es neu erzeugt — nie etwas
 * anderes.
 *
 * Wird aufgerufen von: Hand, gegen einen laufenden Leitstand dieses Worktrees —
 *   LEITSTAND_PORT=4199 node scripts/leitstand-server.mjs
 *   node features/F46/nachweise/d4/erzeuge-nachweis.mjs [basis] [nurOrdner]
 * Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const basis = process.argv[2] ?? 'http://127.0.0.1:4199'
const nur = process.argv[3]
/** Ausgabe neben diesem Skript, Repo-Wurzel vier Ebenen darüber — unabhängig vom Aufrufverzeichnis. */
const ziel = dirname(fileURLToPath(import.meta.url))
const wurzel = resolve(ziel, '../../../..')

// ─── Feste Antworten ────────────────────────────────────────────────────────

/** Register wie im Repo: repo_pfad '.' (F-968 — VS Code kommt aus absoluterPfad der Leseroute). */
const PROJEKTE = { projekte: [{ id: 'ai-workforce', name: 'AI Workforce', repo_pfad: '.', basisverzeichnis: 'kontrollzustand', status: 'IN_ENTWICKLUNG', laufAktiv: false }] }

const befund = (felder) => ({ quelle: 'finding', typ: 'TECH_DEBT', status: 'OFFEN', statusRoh: 'offen', prioritaet: 'P3', beschreibung: null, fundstelle: null, auswirkung: null, massnahme: null, featureRun: null, zeile: 1, ...felder })
const SCHULDEN = [
  befund({ id: 'F-936', typ: 'PROCESS_IMPROVEMENT', prioritaet: 'P1', titel: 'Architekt, Advisor und Review (Codex) bekommen Vision und Projektkontext nicht als Eingabe.', massnahme: 'Fixpaket B2: Projektkontext in die Kontextpakete aller Planungsrollen.' }),
  befund({ id: 'F-929', typ: 'PROCESS_IMPROVEMENT', prioritaet: 'P2', titel: 'Unklar, wie Codex-Schritte (Architekt, Review) die Harness-Regeln bekommen.', massnahme: 'Fixpaket B1: Regeln je Rolle festlegen und belegen.' }),
  befund({ id: 'F-944', typ: 'PROCESS_IMPROVEMENT', prioritaet: 'P2', titel: 'Timeline aus Schätzungen statt Kalenderdaten.', massnahme: 'Fixpaket B5: Schätzfelder im Roadmap-Schema.' }),
  befund({ id: 'F-930', typ: 'PROCESS_IMPROVEMENT', prioritaet: 'P2', titel: 'F38 als „gestufter Kontext“ neu fassen.', massnahme: null }),
  befund({ id: 'F-943', prioritaet: 'P3', titel: 'Kette „Auftrag anlegen → routen → auf Vorschlag warten“ existiert zweimal.', massnahme: 'Beim Schnitt F-928 zusammenlegen.' }),
  befund({ id: 'F-928', prioritaet: 'P3', titel: 'views/workboard.js ist mit rund 1 400 Zeilen zu groß; Click-to-Work gehört in ein eigenes Modul.', massnahme: 'Fixpaket B5: Click-to-Work als eigenes Modul, Tests mitziehen.' }),
  befund({ id: 'F-941', prioritaet: 'P3', titel: 'views/workflows.js liegt mit rund 990 Zeilen knapp unter der Grenze.' }),
  befund({ id: 'F-942', prioritaet: 'P3', titel: 'Ausführungsliste ohne Worker und Rolle.' }),
  befund({ id: 'F-945', prioritaet: 'P3', titel: 'Zähler auf „Alle Produkte“ kosten je Karte drei Zusatzabrufe.' }),
  befund({ id: 'F-906', prioritaet: 'P2', status: 'ERLEDIGT', statusRoh: 'erledigt', titel: 'Erledigter Eintrag (nur unter „Alle Status“).', massnahme: 'Erledigt in F44.' }),
]
const FEATURE = { quelle: 'feature', typ: 'FEATURE', id: 'F46', titel: 'Design-Nachbau nach neuem Seitenaufbau', status: 'IN_ARBEIT', pfad: 'features/F46/feature.md' }
const WORKITEMS = { workitems: [FEATURE, ...SCHULDEN], befunde: [], fehler: [] }

const START = { status: 'ok', pfad: 'startvorlagen/ai-workforce.json', profilPfad: 'profiles/ai-workforce.json', modell: 'claude-sonnet-5', worker: ['claude-code', 'codex'], werkzeugsaetze: ['lesend', 'schreibend', 'recherchierend'], pruefbefehl: 'npm run check', zeitgrenzeMs: 1800000, pruefZeitgrenzeMs: 900000, budget: { maxElemente: 20, maxBytes: 200000 } }
const HARNESS = { status: 'ok', claudeMd: true, settings: true, hooks: 5, agents: 5 }

/** Verlauf auf main (die echten letzten Merges von origin/main, als feste Antwort). */
const commit = (kurz, zeit, betreff, abstandMinuten, zuordnung) => ({ hash: `${kurz}0000000000000000000000000000000000`.slice(0, 40), kurz, zeit, betreff, zuordnung, abstandMinuten })
const VERLAUF = {
  status: 'ok',
  ref: 'origin/main',
  eintraege: [
    commit('a48b344', '2026-10-02T23:05:26+02:00', 'F46 D3: Eintrag im Detail (Feature, Bug) nach Design 07, Bausteine Kurz gesagt, Status-Block, Jetzt-Band (#312)', 105, { feature: 'F46', ws: 'D3', pr: 312 }),
    commit('ec3b831', '2026-10-02T21:20:51+02:00', 'F46 D2: Entscheidungen und Entscheiden nach Design (09), Abnahme als Entscheidungsart (#311)', 105, { feature: 'F46', ws: 'D2', pr: 311 }),
    commit('add7c94', '2026-10-02T19:36:11+02:00', 'F46 D1: Produktuebersicht, Roadmap und Projektakte nach Design (02, 03, 09) (#310)', 105, { feature: 'F46', ws: 'D1', pr: 310 }),
    commit('9c4bf58', '2026-10-02T17:51:25+02:00', 'F46 D0b: Design-Referenz ins Repo; Fix F-986 (b) Chat erkennt nie gestarteten Lauf (#309)', 73, { feature: 'F46', ws: 'D0b', pr: 309 }),
    commit('51825aa', '2026-10-02T16:38:29+02:00', 'F46 D0: Grundlage Design-Nachbau, Ebenen-Tokens, Live-Chip (#308)', 95, { feature: 'F46', ws: 'D0', pr: 308 }),
    commit('5d1e0aa', '2026-10-02T15:03:07+02:00', 'Fix F-966: Codezaun mit innerem Zaun (#307)', 104, { feature: null, ws: null, pr: 307 }),
    commit('41eff91', '2026-10-02T13:18:59+02:00', 'Doku: Lagebild und Abgleich nachgezogen (#306)', null, { feature: null, ws: null, pr: 306 }),
  ],
}

const DATEIEN = [
  { pfad: 'public/leitstand/views/code.js', art: '??', xy: '??', plus: 412, minus: 0 },
  { pfad: 'public/leitstand/views/workboard.js', art: 'M', xy: ' M', plus: 168, minus: 22 },
  { pfad: 'public/leitstand/i18n/de.js', art: 'M', xy: ' M', plus: 197, minus: 8 },
  { pfad: 'public/leitstand/i18n/en.js', art: 'M', xy: ' M', plus: 197, minus: 8 },
  { pfad: 'scripts/leitstand/routen-code.mjs', art: '??', xy: '??', plus: 430, minus: 0 },
  { pfad: 'features/F46/feature.md', art: 'M', xy: ' M', plus: 40, minus: 2 },
  { pfad: 'state/findings.md', art: 'M', xy: ' M', plus: 24, minus: 4 },
]

/**
 * Antwort von GET /api/code.
 * @param zusatz - Überschreibungen
 * @returns Projektion
 */
const code = (zusatz = {}) => ({
  status: 'ok',
  absoluterPfad: 'C:\\Users\\stefa\\Projekte\\ai-workforce',
  arbeitsverzeichnis: { status: 'ok', vorhanden: true },
  branch: { status: 'ok', name: 'feat/f46-d4-entwicklung-code', losgeloest: false, commit: 'a48b344' },
  basis: { status: 'ok', ref: 'origin/main', voraus: 0, zurueck: 0 },
  remoteWebUrl: { status: 'ok', url: 'https://github.com/DerStefan89/ai-workforce', origin: true },
  dateien: { status: 'ok', eintraege: DATEIEN, anzahl: DATEIEN.length, gekappt: false },
  verlauf: VERLAUF,
  freigabeCommit: { status: 'ok', vorhanden: false, alterMinuten: null },
  harness: HARNESS,
  startvorlage: START,
  ...zusatz,
})

const DIFF_CODE = `diff --git a/public/leitstand/views/code.js b/public/leitstand/views/code.js
new file mode 100644
--- /dev/null
+++ b/public/leitstand/views/code.js
@@ -0,0 +1,12 @@
+/**
+ * Datei: public/leitstand/views/code.js
+ *
+ * Zweck: Entwicklung › Code \`#/code\` (F46 D4).
+ */
+
+import { holeCodeDiff } from '../api.js'
+
+/** Filter des Verlaufs in Anzeige-Reihenfolge. */
+const VERLAUF_FILTER = ['alle', 'feature', 'fix', 'doku']
+
+let seiteAktiv = false
`
const DIFF_WORKBOARD = `diff --git a/public/leitstand/views/workboard.js b/public/leitstand/views/workboard.js
index 1c2d3e4..5f6a7b8 100644
--- a/public/leitstand/views/workboard.js
+++ b/public/leitstand/views/workboard.js
@@ -253,8 +253,12 @@ function renderKopf() {
   document.getElementById('workboard-titel').textContent = t(\`entwicklung.tab.\${aktiverTab}.titel\`)
   document.getElementById('workboard-beschreibung').textContent = t(\`entwicklung.tab.\${aktiverTab}.beschreibung\`)
-  const knoepfe = TABS.map((tab) => {
-  document.getElementById('workboard-tabs').innerHTML = \`\${knoepfe}<a href="#/projekt">…</a>\`
+  // F46 D4: Reiterzeile nach §2 (entwicklung-reiter.js) — „Aufträge“ → #/runs, „Code“ → #/code.
+  document.getElementById('workboard-tabs').innerHTML = entwicklungsReiterHtml(aktiverTab)
   document.getElementById('workboard-board-bereich').hidden = aktiverTab !== 'board'
+  document.getElementById('workboard-filter').hidden = aktiverTab === 'weitere'
`
const diff = (pfad, text) => ({ status: 'ok', pfad, art: 'M', text, gekuerzt: false })

const zustand = (aktiv = false) => ({ laeufe: [], startfehler: [], workflows: [], fehler: [], aktiverLauf: { aktiv, laufId: aktiv ? 'lauf-nachweis-1' : null }, pruefbefehl: null, istAiWorkforce: true })

// Escape-Fall: HTML in Commit-Betreff, Dateiname, Branch und Diff.
const HTML = '<img src=x onerror=alert(1)> <b>fett</b>'
const CODE_HTML = code({
  branch: { status: 'ok', name: 'feat/f46-<b>x</b>', losgeloest: false, commit: 'a48b344' },
  dateien: { status: 'ok', eintraege: [{ pfad: `docs/${HTML}.md`, art: '??', plus: 1, minus: 0 }, ...DATEIEN.slice(0, 2)], anzahl: 3, gekappt: false },
  verlauf: { ...VERLAUF, eintraege: [{ ...VERLAUF.eintraege[0], betreff: `F46 D3: ${HTML} (#312)` }, ...VERLAUF.eintraege.slice(1)] },
})

const get = (muster, json, status = 200) => ({ muster, methode: 'GET', status, json })
/**
 * Grundantworten aller Folgen; spätere Einträge haben Vorrang (Playwright).
 * @param varianten - { code, diffs: { muster → Antwort }, laufAktiv }
 * @returns Antwortliste
 */
function antworten({ codeAntwort = code(), diffs = {}, laufAktiv = false } = {}) {
  return [
    get('**/api/zustand', zustand(laufAktiv)),
    get('**/api/projekte', PROJEKTE),
    get('**/api/workitems', WORKITEMS),
    get('**/api/workitems?**', WORKITEMS),
    get('**/api/auftraege', []),
    get('**/api/roadmap', { status: 'ok', vision: 'Nachweis', meilensteine: [] }),
    get('**/api/startvorlage/werkzeugsaetze', [{ name: 'lesend', modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read'] }]),
    get('**/api/projekte/ai-workforce/projekt-aufruf', { startbefehl: null, startvorlage: null, ergebnis_datei: null, aktiv: false, letzterAufruf: null, vorschau: null }),
    get('**/api/chat', { verlauf: [] }),
    get('**/api/code', codeAntwort),
    get('**/api/code/diff?**', diff('public/leitstand/views/code.js', DIFF_CODE)),
    ...Object.entries(diffs).map(([muster, json]) => get(muster, json)),
    // Kein POST darf passieren: jede Schreibanfrage bekäme 409 mit Marke.
    { muster: '**/api/auftraege**', methode: 'POST', status: 409, json: { grund: 'NACHWEIS: POST erkannt' } },
    { muster: '**/api/laeufe**', methode: 'POST', status: 409, json: { grund: 'NACHWEIS: POST erkannt' } },
    { muster: '**/api/workflows/**', methode: 'POST', status: 409, json: { grund: 'NACHWEIS: POST erkannt' } },
    { muster: '**/api/features/**', methode: 'POST', status: 409, json: { grund: 'NACHWEIS: POST erkannt' } },
  ]
}

const BEOBACHTUNG = {
  texte: [
    { name: 'Ansicht', selector: '[data-view]:not([hidden])', attribut: 'data-view' },
    { name: 'data-theme', selector: 'html', attribut: 'data-theme' },
    { name: 'lang', selector: 'html', attribut: 'lang' },
    { name: 'Nav aktiv', selector: '#shell-nav [aria-current="page"]' },
    { name: 'Reiter aktiv (#/code)', selector: '#code-tabs [aria-current="page"]' },
    { name: 'Reiter aktiv (#/workboard)', selector: '#workboard-tabs [aria-pressed="true"]' },
    { name: 'Gewählte Datei', selector: '#code-stand [aria-pressed="true"]', attribut: 'data-pfad' },
    { name: 'Diff-Pfad', selector: '#code-stand .code-diff-pfad' },
    { name: 'Sichern (erste Zeile)', selector: '#code-stand .befehlsblock-zeile' },
    { name: 'Commit-Freigabe', selector: '#code-freigabe .code-status-chip' },
    { name: 'Verlauf-Filter', selector: '#code-verlauf [aria-pressed="true"]' },
    { name: 'Kopf GitHub', selector: '#shell-kopf [data-werkzeug-github]', attribut: 'href' },
    { name: 'Kopf VS Code', selector: '#shell-kopf [data-werkzeug-vscode]', attribut: 'href' },
    { name: 'Tech Debt: Auszug', selector: '.techdebt-auszug' },
    { name: 'Bereit zum Start', selector: '#auftrag-umgebung .umgebung-chip' },
    { name: 'Fokus (id)', selector: ':focus', attribut: 'id' },
  ],
  vorhanden: [
    { name: 'aria-live außer Persona (muss fehlen)', selector: '[aria-live]:not(#persona-text-status)' },
    { name: '<img> aus Daten (muss fehlen)', selector: 'main img[src="x"]' },
    { name: 'Platzhalter <…> im Befehlsblock (muss fehlen)', selector: '.befehlsblock-platzhalter' },
    { name: 'Reiter „Ausführungen“ in der Entwicklung (muss fehlen)', selector: '#workboard-tabs a[href="#/ausfuehrungen"], #code-tabs a[href="#/ausfuehrungen"]' },
  ],
  ueberlauf: true,
}

const warte = (selector, timeoutMs = 8000) => ({ warteAufSelector: { selector, timeoutMs } })

/**
 * Eine Folge.
 * @param optionen - url, schritte, farbschema, breite, hoehe, zoom, sprache, varianten
 * @returns Klickfolge
 */
function folge({ url, schritte, farbschema = 'dark', breite = 1440, hoehe = 1000, zoom = 1, sprache, varianten }) {
  return {
    url: `${basis}/${url}`,
    viewport: { breite, hoehe },
    farbschema,
    zoom,
    screenshotQualitaet: 0.7,
    screenshotVollseite: true,
    localStorageSetzen: { 'leitstand-chat-offen': 'false', ...(sprache ? { 'leitstand-sprache': sprache } : {}) },
    anfragenAntworten: antworten(varianten),
    beobachtete: BEOBACHTUNG,
    schritte,
  }
}

const folgen = {}
const DIFF_DA = '#code-stand .code-diff-zeile'

// ─── #/code ─────────────────────────────────────────────────────────────────
folgen['code-aenderungen'] = folge({
  url: '#/code',
  varianten: { codeAntwort: code({ freigabeCommit: { status: 'ok', vorhanden: true, alterMinuten: 3 } }), diffs: { '**/api/code/diff?pfad=public%2Fleitstand%2Fviews%2Fworkboard.js': diff('public/leitstand/views/workboard.js', DIFF_WORKBOARD) } },
  schritte: [
    { label: '#/code mit Änderungen: erste Datei gewählt, Diff, Sichern mit echten Dateien (keine Platzhalter), Commit-Freigabe „gültig · noch 7 Min.“, Prüfstand „kommt“ mit echtem Prüfbefehl, Verlauf mit Zuordnung', ...warte(DIFF_DA), screenshot: 'd1440-code-aenderungen.webp' },
    { label: 'Klick auf workboard.js → Diff dieser Datei (Zeilen + / − / @@ farbig)', klick: '#code-stand [data-pfad="public/leitstand/views/workboard.js"]', ...warte('#code-stand .code-diff-zeile[data-art="minus"]'), screenshot: 'k01-zweite-datei.webp' },
    { label: 'Verlaufsfilter „Fixes“ → nur der Fix-Merge', klick: '#code-verlauf [data-verlauf-filter="fix"]', screenshot: 'k02-filter-fixes.webp' },
    { label: '„Ins Terminal“ ist „kommt“: Fokus + Enter ändert nichts', fokus: '#code-stand .befehlsblock .kommt-knopf', taste: 'Enter', screenshot: 'k03-ins-terminal-kommt.webp' },
    { label: 'Reiter „Tech Debt & Prozess“ von #/code aus → #/workboard im Register Tech Debt & Prozess', klick: '#code-tabs [data-tab="weitere"]', ...warte('.techdebt-karte'), screenshot: 'k04-reiter-techdebt.webp' },
    { label: 'Reiter „Code“ → zurück auf #/code', klick: '#workboard-tabs a[href="#/code"]', ...warte(DIFF_DA), screenshot: 'k05-reiter-code.webp' },
  ],
})
folgen['code-sauber'] = folge({
  url: '#/code',
  varianten: { codeAntwort: code({ dateien: { status: 'ok', eintraege: [], anzahl: 0, gekappt: false }, basis: { status: 'ok', ref: 'origin/main', voraus: 0, zurueck: 2 } }) },
  schritte: [{ label: '#/code ohne Änderungen: „Keine Änderungen — der Arbeitsbaum ist sauber“, Sichern mit Grund statt Befehl, Basis „2 zurück“, Commit-Freigabe „keine Freigabe“', ...warte('#code-stand .code-sauber'), screenshot: 'd1440-code-sauber.webp' }],
})
folgen['code-gitfehler'] = folge({
  url: '#/code',
  varianten: {
    codeAntwort: code({
      branch: { status: 'fehler', grund: 'Zeitgrenze von 5000 ms überschritten' },
      basis: { status: 'fehler', grund: 'weder origin/main noch main vorhanden' },
      dateien: { status: 'fehler', grund: 'Zeitgrenze von 5000 ms überschritten' },
      verlauf: { status: 'fehler', grund: "fatal: bad revision 'origin/main'", ref: 'origin/main' },
      remoteWebUrl: { status: 'ok', url: null, origin: false },
    }),
  },
  schritte: [{ label: '#/code mit Git-Fehler je Feld (Feldstatus statt 500): Branch, Dateien, Verlauf als Notiz mit Grund, Sichern ohne Befehl, GitHub im Kopf gesperrt', ...warte('#code-stand .note.red'), screenshot: 'd1440-code-gitfehler.webp' }],
})
folgen['code-nicht-verfuegbar'] = folge({
  url: '#/code',
  varianten: { codeAntwort: { status: 'nicht_verfuegbar', grund: 'git ist nicht installiert oder nicht im PATH', absoluterPfad: 'C:\\Users\\stefa\\Projekte\\ohne-git', harness: HARNESS, freigabeCommit: { status: 'ok', vorhanden: false, alterMinuten: null }, startvorlage: START } },
  schritte: [{ label: '#/code ohne Git: „Kein Git-Arbeitsverzeichnis gefunden“ mit Grund; Prüfbefehl bleibt echt', ...warte('#code-stand .note.amber'), screenshot: 'd1440-code-nicht-verfuegbar.webp' }],
})

// ─── Tech Debt & Prozess ────────────────────────────────────────────────────
folgen['techdebt-filter'] = folge({
  url: '#/workboard',
  schritte: [
    { label: 'Register „Tech Debt & Prozess“ öffnen: Karten mit Anzahl offen, Chips, Tabelle (Eingeplant = Maßnahme gekürzt)', klick: '#workboard-tabs [data-tab="weitere"]', ...warte('.techdebt-zeile'), screenshot: 'd1440-techdebt.webp' },
    { label: 'Karte „Prozess-Schuld“ als Filter → nur PROCESS_IMPROVEMENT', klick: '.techdebt-karte[data-td-art="PROCESS_IMPROVEMENT"]', screenshot: 'k01-karte-prozess.webp' },
    { label: 'Chip P2 → Prozess-Schuld mit P2', klick: '[data-td-prio="P2"]', screenshot: 'k02-p2.webp' },
    { label: 'Chip „Alle“ (Art) → beide Arten, P2 bleibt', klick: '[data-td-art=""]', screenshot: 'k03-alle-art.webp' },
    { label: 'P2 abwählen', klick: '[data-td-prio="P2"]' },
    { label: '„Alle Status“ → auch der erledigte Eintrag (F-906)', klick: '[data-td-status=""]', screenshot: 'k04-alle-status.webp' },
    { label: 'Zeile F-928 → Detail', klick: '.techdebt-zeile[data-id="F-928"] .techdebt-titel', ...warte('#workboard-detail:not([hidden]) #workboard-detail-titel'), screenshot: 'k05-detail.webp' },
  ],
})

// ─── Auftrag anlegen ────────────────────────────────────────────────────────
folgen['projekt-bereit'] = folge({
  url: '#/projekt',
  hoehe: 1300,
  schritte: [
    { label: 'Start: Titel und Ergebnis leer → „noch nicht bereit“, Prüfliste mit echten Werten aus der Leseroute', ...warte('#auftrag-umgebung .bereit-zeile'), screenshot: 'd1440-projekt-leer.webp' },
    { label: 'Titel tippen', tippen: { selector: '#auftrag-titel', text: 'Roadmap-Seite nach Design neu bauen' } },
    { label: 'Ergebnis tippen → „bereit“ (kein anderer Lauf aktiv, Feature-Branch)', tippen: { selector: '#auftrag-auftragstext', text: 'Die Roadmap zeigt Meilensteine und Features nach Bild 03.' }, screenshot: 'd1440-projekt-bereit.webp' },
  ],
})
folgen['projekt-main'] = folge({
  url: '#/projekt',
  hoehe: 1300,
  varianten: { codeAntwort: code({ branch: { status: 'ok', name: 'main', losgeloest: false, commit: 'a48b344' } }), laufAktiv: true },
  schritte: [{ label: 'Hinweis main: Git-Stand „prüfen“, Warnung „Gerade ist main ausgecheckt.“; dazu läuft ein anderer Lauf → nicht bereit', ...warte('#auftrag-umgebung .umgebung-warnung strong'), screenshot: 'd1440-projekt-main.webp' }],
})

// ─── Matrix ─────────────────────────────────────────────────────────────────
const DARSTELLUNGEN = {
  'hell-1440': { praefix: 'l1440', farbschema: 'light' },
  'dunkel-390': { praefix: 'd390', breite: 390, hoehe: 844 },
  'dunkel-1440-zoom200': { praefix: 'd1440z2', zoom: 2 },
  'ru-1440': { praefix: 'ru1440', sprache: 'ru' },
}
const MATRIX = {
  code: { url: '#/code', warteAuf: DIFF_DA, text: '#/code mit Änderungen und gewählter Datei' },
  techdebt: { url: '#/workboard', klick: '#workboard-tabs [data-tab="weitere"]', warteAuf: '.techdebt-zeile', text: 'Tech Debt & Prozess' },
  projekt: { url: '#/projekt', warteAuf: '#auftrag-umgebung .bereit-zeile', text: '#/projekt mit rechter Spalte' },
}
for (const [seite, m] of Object.entries(MATRIX)) {
  for (const [dName, { praefix, ...darstellung }] of Object.entries(DARSTELLUNGEN)) {
    folgen[`${seite}-${dName}`] = folge({ url: m.url, schritte: [{ label: m.text, ...(m.klick ? { klick: m.klick } : {}), ...warte(m.warteAuf), screenshot: `${praefix}-${seite}.webp` }], ...darstellung })
  }
}

// ─── Reduzierte Bewegung, lange Texte ──────────────────────────────────────
folgen['code-reduzierte-bewegung'] = { ...folge({ url: '#/code', schritte: [{ label: '#/code mit prefers-reduced-motion: reduce', ...warte(DIFF_DA), screenshot: 'd1440rm-code.webp' }] }), reduzierteBewegung: true }
const LANG = 'sehr-langer-name-ohne-umbruch-'.repeat(4)
const CODE_LANG = code({
  branch: { status: 'ok', name: `feat/f46-d4-${LANG}`, losgeloest: false, commit: 'a48b344' },
  dateien: { status: 'ok', eintraege: [{ pfad: `docs/${LANG}/unterordner/${LANG}.md`, art: '??', xy: '??', plus: 12, minus: 0 }, ...DATEIEN.slice(0, 2)], anzahl: 3, gekappt: false },
  verlauf: { ...VERLAUF, eintraege: [{ ...VERLAUF.eintraege[0], betreff: `F46 D3: ${'Ein sehr langer Betreff mit vielen Wörtern, der umbrechen muss, '.repeat(3)}(#312)` }, ...VERLAUF.eintraege.slice(1)] },
})
folgen['lange-texte-390'] = folge({
  url: '#/code',
  breite: 390,
  hoehe: 844,
  varianten: { codeAntwort: CODE_LANG },
  schritte: [
    { label: '390 px: langer Branch, langer Pfad, langer Betreff — kein Überlauf, Verlauf gestapelt', ...warte(DIFF_DA), screenshot: 'd390-lang-code.webp' },
    { label: '390 px: Tech Debt gestapelt (Titel und Maßnahme lang)', klick: '#code-tabs [data-tab="weitere"]', ...warte('.techdebt-zeile'), screenshot: 'd390-lang-techdebt.webp' },
  ],
})

// ─── Escape ────────────────────────────────────────────────────────────────
folgen.escape = folge({
  url: '#/code',
  breite: 1600,
  varianten: { codeAntwort: CODE_HTML, diffs: { '**/api/code/diff?**': { status: 'ok', pfad: `docs/${HTML}.md`, art: '??', text: `+++ b/docs/${HTML}.md\n@@ -0,0 +1 @@\n+${HTML}\n`, gekuerzt: false } } },
  schritte: [{ label: 'HTML in Dateiname (Liste, Diff-Kopf, Sichern), Branch, Diff und Commit-Betreff erscheint als Text; kein <img> aus Daten', ...warte(DIFF_DA), screenshot: 'd1600-escape-code.webp' }],
})

// ─── Ausführen ─────────────────────────────────────────────────────────────
if (nur && !(nur in folgen)) throw new Error(`Unbekannte Folge: ${nur}`)
const auszufuehren = nur ? { [nur]: folgen[nur] } : folgen

for (const [ordner, klickfolge] of Object.entries(auszufuehren)) {
  const verzeichnis = join(ziel, ordner)
  rmSync(verzeichnis, { recursive: true, force: true })
  mkdirSync(verzeichnis, { recursive: true })
  console.log(`\n── ${ordner} ──`)
  const pfad = join(verzeichnis, 'klickfolge.json')
  writeFileSync(pfad, `${JSON.stringify(klickfolge, null, 2)}\n`)
  execFileSync(process.execPath, [join(wurzel, 'scripts/render-nachweis.mjs'), pfad, verzeichnis], { stdio: 'inherit', cwd: wurzel })
}
