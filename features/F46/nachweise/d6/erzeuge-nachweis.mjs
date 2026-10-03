/**
 * Datei: features/F46/nachweise/d6/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweise F46 D6 „Workforce: Harness-Aufbau und Capability Library“ — alles mit festen
 * Antworten (page.route), kein Dateizugriff aus dem Browser heraus, kein Modell-Lauf, keine Schreibanfrage
 * (jeder POST auf /api/auftraege/**, /api/laeufe/**, /api/workflows/** und /api/ressourcen/** bekäme 409 mit
 * der Marke „NACHWEIS: POST erkannt“):
 * - Harness-Aufbau: Skelett mit sechs Bausteinen, Detail einer Regel-Datei (CLAUDE.md), eines Hooks mit
 *   Schloss und „Sichtbar, aber nicht direkt änderbar.“, eines Ordners; „Zur Capability Library“;
 * - fehlende Orte (README.md, docs/harness, state/zwischenstand, .worktreeinclude) und ein Ort mit Fehler;
 * - Capability Library: Kennzahlen, Hinweis aus dem Abgleich (design-guardian), Filter Extern und Nicht aktiv,
 *   Suche, Detail mit „Prüfen & freigeben“ (nicht geklickt — der F36-Weg ist unverändert), „Im Harness-Aufbau
 *   zeigen“;
 * - Phasen & Rollen; Rollen & Besetzung mit „Kandidaten suchen“ (Scout) erreichbar;
 * - Matrix 1440 dunkel, 1440 hell, 390 dunkel, 1440 mit 200 % Zoom, ru — Harness mit Hook-Detail und Library
 *   mit Detail;
 * - Escape-Fall (HTML in Dateiinhalt, Datei- und Repo-Name, Katalogbeschreibung).
 * Die Folgen laufen über scripts/render-nachweis.mjs (klickfolge.json je Unterordner). Screenshots als WebP.
 * Vor dem Lauf leert das Skript die Ausgabeordner GENAU der Folgen, die es neu erzeugt — nur eigene, direkte
 * Unterordner (Pfadprüfung), nie etwas anderes.
 *
 * Wird aufgerufen von: Hand, gegen einen laufenden Leitstand dieses Worktrees —
 *   LEITSTAND_PORT=4199 node scripts/leitstand-server.mjs
 *   node features/F46/nachweise/d6/erzeuge-nachweis.mjs [basis] [nurOrdner]
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

const PROJEKTE = { projekte: [{ id: 'ai-workforce', name: 'AI Workforce', repo_pfad: '.', basisverzeichnis: 'kontrollzustand', status: 'IN_ENTWICKLUNG', laufAktiv: false }] }
const ZEIT = '2026-10-02T21:20:51.000Z'
const d = (name, groesse) => ({ name, art: 'datei', groesse, geaendert: ZEIT })
const o = (name) => ({ name, art: 'ordner' })
const datei = (pfad, groesse, zusatz = {}) => ({ pfad, art: 'datei', vorhanden: true, status: 'ok', groesse, geaendert: ZEIT, ...zusatz })
const ordner = (pfad, eintraege, zusatz = {}) => ({ pfad, art: 'ordner', vorhanden: true, status: 'ok', geaendert: ZEIT, anzahl: zusatz.anzahl ?? eintraege.length, eintraege, gekappt: false, ...zusatz })
const fehlt = (pfad, art = 'datei', zusatz = {}) => ({ pfad, art, vorhanden: false, status: 'ok', ...zusatz })

const CHECKS = ['check-akte-meilenstein.mjs', 'check-contract.mjs', 'check-docs.mjs', 'check-f20-design-tokens.mjs', 'check-f44-i18n.mjs', 'check-f46-bestand.mjs', 'check-f813-csrf.mjs', 'check-f814-host.mjs', 'check-rules.mjs']

/**
 * Antwort von GET /api/harness (Namen und Anzahlen wie im Repo am 03.10.2026, Zeiten fest).
 * @param ueber - Ersetzungen je Pfad (Eintrag) und { name }
 * @returns Projektion
 */
function harness(ueber = {}) {
  const e = (eintrag) => ueber[eintrag.pfad] ?? eintrag
  return {
    status: 'ok',
    absoluterPfad: 'C:\\Users\\stefa\\Projekte\\ai-workforce',
    name: ueber.name ?? 'ai-workforce',
    bausteine: [
      { id: 'regeln', ort: '/', eintraege: [datei('CLAUDE.md', 8046), datei('ARCHITECTURE.md', 9289), datei('README.md', 5457)].map(e) },
      {
        id: 'wissen',
        ort: 'docs/',
        eintraege: [
          datei('docs/STATUS.md', 46249),
          ordner('docs/adr', [d('TEMPLATE.md', 348), d('ausfuehrung-bash-allowlist.md', 6049), d('datenformate-kontrollzustand-und-profile.md', 1093), d('ein-ebenen-profilmodell.md', 1375), d('oberflaechentechnik-leitstand.md', 988), d('technischer-stack.md', 1194)]),
          ordner('docs/projekt/kontext', [d('anweisungen.md', 2525), d('beschreibung.md', 2434), d('lagebild.md', 13409)]),
          ordner('docs/harness', [d('HARNESS-CHANGELOG.md', 21000), d('HARNESS-GLOSSARY.md', 7000), d('HARNESS-LEARNING-STATE.md', 9000), d('HARNESS-OVERVIEW.md', 12000), o('programm-historie'), d('werkzeug-katalog.md', 15000)], { anzahl: 6 }),
        ].map(e),
      },
      {
        id: 'gedaechtnis',
        ort: 'state/',
        eintraege: [datei('state/findings.md', 900000), datei('state/gates.md', 21000), datei('state/assumption-ledger.md', 30000), datei('state/triggers.md', 4000), datei('state/memory-map.md', 6000), datei('state/tooling.md', 12000), ordner('state/zwischenstand', [d('VORLAGE.md', 900)])].map(e),
      },
      {
        id: 'rollen',
        ort: '.claude/',
        eintraege: [
          ordner('.claude/agents', [d('architecture-advisor.md', 2090), d('code-reviewer.md', 1659), d('design-guardian.md', 5950), d('qa.md', 1066), d('scout.md', 2758)]),
          ordner('.claude/skills', [o('advisor-pass'), o('git-flow'), o('handoff-vertrag'), o('ponytail'), o('repo-audit'), o('spec-schreiben'), o('werkzeug-auswahl')]),
          ordner('.claude/commands', [d('lessons.md', 1095)]),
        ].map(e),
      },
      {
        id: 'bremsen',
        ort: '.claude/',
        eintraege: [
          datei('.claude/settings.json', 1205, { geschuetzt: true }),
          ordner('.claude/hooks', [d('commit-guard.cjs', 12107), d('guard-settings.js', 1934), d('session-reminder.cjs', 1044), d('zwischenstand-laden.cjs', 1612), d('zwischenstand-pruefen.cjs', 2289)], { geschuetzt: true }),
        ].map(e),
      },
      {
        id: 'pruefung',
        ort: 'scripts/ · .github/',
        eintraege: [ordner('scripts', CHECKS.map((n) => d(n, 4000)), { muster: 'check-*.mjs', anzahl: 75, eintraege: CHECKS.map((n) => d(n, 4000)) }), ordner('.github/workflows', [d('ci.yml', 900)]), datei('.worktreeinclude', 149)].map(e),
      },
    ],
  }
}

const TEXT_CLAUDE = `<!--
[FÜLLUNG] Diese Datei ist zur Hälfte Skelett, zur Hälfte Füllung. Abschnitte
ohne Zusatz sind Skelett — Mechanik, unverändert übertragbar.
-->

# AI Workforce — Master-Kontext

## Pflichtlektüre
Lies \`ARCHITECTURE.md\` bevor du Code schreibst. Alle Konventionen dort sind
verbindlich. \`docs/projekt/zielfassung.md\`, wenn eine Anforderung, eine
Rolle, eine Grenze oder ein Fassung-1-Scope zu klären ist.
`
const TEXT_HOOK = `/**
 * Datei: .claude/hooks/commit-guard.cjs
 *
 * Zweck: PreToolUse-Hook auf Bash. Vier Aufgaben:
 * 1. Verweigert jeden Bash-Befehl, der \`.claude/settings.json\` referenziert
 *    (schließt die Bash-Lücke von guard-settings.js).
 * 2. Verweigert den Merge-Pfad nach main über \`gh\` (PR-Merge-Unterbefehl
 *    oder ein API-Pfad, der auf \`/merge\`/\`/merges\` endet).
 * 3. Verweigert \`git commit\` / \`git push\`, außer eine frische Freigabe-Datei
 *    (state/freigabe-commit.md, Frischefenster 10 Minuten) liegt vor. Bei
 *    gültiger Freigabe: Datei löschen, Befehl durchlassen — eine Freigabe
 *    gilt für genau einen Commit.
 * 4. Verweigert jeden Bash-Befehl, der \`state/freigabe-commit.md\`
 *    referenziert.
 */
`
const dateiAntwort = (pfad, text, groesse, gekuerzt = false) => ({ status: 'ok', pfad, absolut: `C:\\Users\\stefa\\Projekte\\ai-workforce\\${pfad.replaceAll('/', '\\')}`, groesse, geaendert: ZEIT, text, gekuerzt })
const datMuster = (pfad) => `**/api/harness/datei?pfad=${encodeURIComponent(pfad)}`

/** Katalog wie GET /api/ressourcen (Auszug, echte ids und Zustände). */
const r = (id, typ, freigabe, beschreibung, herkunft, zusatz = {}) => ({
  id,
  typ,
  name: id,
  beschreibung,
  freigabe,
  verfuegbar: freigabe === 'FREIGEGEBEN',
  herkunft,
  capabilities: [],
  phasen: freigabe === 'FREIGEGEBEN' ? ['APPROVED', 'AVAILABLE'] : ['DISCOVERED'],
  anzeigeGrund: freigabe === 'FREIGEGEBEN' ? 'einsatzbereit' : 'Freigabe offen — noch nicht geprüft',
  fehltFuerEinsatz: freigabe === 'FREIGEGEBEN' ? [] : ['freigabe OFFEN', 'installation fehlt'],
  grund: '',
  installierbar: false,
  installationsGrund: freigabe === 'OFFEN' ? "wirkung 'extern_lesend' — in V1 nur 'lokal' freigebbar (E-F36-4)" : null,
  ...zusatz,
})
const KATALOG = [
  r('claude-code', 'worker', 'FREIGEGEBEN', 'Baut: schreibt Code, führt Prüfungen aus.', { art: 'startvorlage', worker: 'claude-code' }),
  r('codex', 'worker', 'FREIGEGEBEN', 'Plant und prüft, nur lesend.', { art: 'startvorlage', worker: 'codex' }),
  r('advisor-pass', 'skill', 'FREIGEGEBEN', 'Plan vor dem Bau prüfen.', { art: 'skill', pfad: '.claude/skills/advisor-pass' }),
  r('spec-schreiben', 'skill', 'FREIGEGEBEN', 'Spezifikation aus einem Auftrag.', { art: 'skill', pfad: '.claude/skills/spec-schreiben' }),
  r('ponytail', 'skill', 'FREIGEGEBEN', 'Die einfachste Lösung, die wirklich funktioniert.', { art: 'skill', pfad: '.claude/skills/ponytail' }),
  r('code-reviewer', 'agent', 'FREIGEGEBEN', 'Code nach dem Bauen prüfen.', { art: 'agent', pfad: '.claude/agents/code-reviewer.md' }),
  r('qa', 'agent', 'FREIGEGEBEN', 'Akzeptanztests und Randfälle.', { art: 'agent', pfad: '.claude/agents/qa.md' }),
  r('architecture-advisor', 'agent', 'FREIGEGEBEN', 'Pläne vor dem Bau prüfen.', { art: 'agent', pfad: '.claude/agents/architecture-advisor.md' }),
  r('scout', 'agent', 'FREIGEGEBEN', 'Kandidaten für eine fehlende Fähigkeit suchen.', { art: 'agent', pfad: '.claude/agents/scout.md' }),
  r('playwright-mcp', 'extern', 'FREIGEGEBEN', 'Browser-Automatisierung über Accessibility-Snapshots.', { art: 'extern', url: 'https://github.com/microsoft/playwright-mcp' }, { unterart: 'mcp' }),
  r('frontend-design', 'extern', 'FREIGEGEBEN', 'Erstanbieter-Plugin für bessere Frontend-Ausgabe.', { art: 'extern', url: 'https://github.com/anthropics/claude-plugins-official' }, { unterart: 'skill' }),
  r('impeccable', 'extern', 'OFFEN', 'Design-Kontext-Protokoll: Zielgruppe, Markenpersönlichkeit und Gestaltungsregeln, bevor eine Oberfläche gebaut wird.', { art: 'extern', url: 'https://github.com/pbakaus/impeccable' }, { unterart: 'skill', installierbar: true, installationsGrund: null }),
  r('context7-mcp', 'extern', 'OFFEN', 'Versionsgenaue Bibliotheks-Doku.', { art: 'extern', url: 'https://github.com/upstash/context7' }, { unterart: 'mcp' }),
  r('github-mcp', 'extern', 'OFFEN', 'Repos, Issues und Pull Requests.', { art: 'extern', url: 'https://github.com/github/github-mcp-server' }, { unterart: 'mcp' }),
  r('firecrawl-mcp', 'extern', 'OFFEN', 'Web-Extraktion: scrapen, crawlen, suchen.', { art: 'extern', url: 'https://github.com/firecrawl/firecrawl-mcp-server' }, { unterart: 'mcp' }),
  r('taste-skill', 'extern', 'OFFEN', 'Gestaltungsgeschmack als Skill.', { art: 'extern', url: 'https://github.com/senlindesign/taste-skill' }, { unterart: 'skill' }),
]
const LIBRARY = (eintraege = KATALOG) => ({ startvorlagePfad: 'startvorlagen/ai-workforce.json', assessedHinweis: 'ASSESSED ist in v1 strukturell leer — eine Prüfung trägt noch kein eigenes Kennzeichen.', eintraege })
const ABDECKUNG = {
  startvorlagePfad: 'startvorlagen/ai-workforce.json',
  rollen: [
    { rolle: 'architekt', benoetigteCapabilities: ['PLAN'], workerAbdeckung: [{ worker: 'codex', fehlend: [], f346Ausnahme: false, restFehlend: [] }], gedeckt: true },
    { rolle: 'reviewer', benoetigteCapabilities: ['CODE_REVIEW', 'BROWSER_TEST'], workerAbdeckung: [{ worker: 'codex', fehlend: ['BROWSER_TEST'], f346Ausnahme: false, restFehlend: ['BROWSER_TEST'] }], gedeckt: false },
  ],
}

const zustand = () => ({ laeufe: [], startfehler: [], workflows: [], fehler: [], aktiverLauf: { aktiv: false, laufId: null }, pruefbefehl: null, istAiWorkforce: true })

const HTML = '<img src=x onerror=alert(1)> <b>fett</b>'

const get = (muster, json, status = 200) => ({ muster, methode: 'GET', status, json })
/**
 * Grundantworten aller Folgen; spätere Einträge haben Vorrang (Playwright).
 * @param varianten - { harnessAntwort, libraryAntwort, dateien: { pfad → Antwort } }
 * @returns Antwortliste
 */
function antworten({ harnessAntwort = harness(), libraryAntwort = LIBRARY(), dateien = {} } = {}) {
  const alleDateien = { 'CLAUDE.md': dateiAntwort('CLAUDE.md', TEXT_CLAUDE, 8046), '.claude/hooks/commit-guard.cjs': dateiAntwort('.claude/hooks/commit-guard.cjs', TEXT_HOOK, 12107), ...dateien }
  return [
    get('**/api/zustand', zustand()),
    get('**/api/projekte', PROJEKTE),
    get('**/api/workitems', { workitems: [], befunde: [], fehler: [] }),
    get('**/api/workitems?**', { workitems: [], befunde: [], fehler: [] }),
    get('**/api/auftraege', []),
    get('**/api/roadmap', { status: 'ok', vision: 'Nachweis', meilensteine: [] }),
    get('**/api/chat', { verlauf: [] }),
    get('**/api/ressourcen', libraryAntwort),
    get('**/api/ressourcen/abdeckung', ABDECKUNG),
    get('**/api/harness', harnessAntwort),
    get('**/api/harness/datei?**', { status: 'fehlt', pfad: 'unbekannt' }),
    ...Object.entries(alleDateien).map(([pfad, json]) => get(datMuster(pfad), json)),
    // Kein POST darf passieren: jede Schreibanfrage bekäme 409 mit Marke.
    { muster: '**/api/auftraege**', methode: 'POST', status: 409, json: { grund: 'NACHWEIS: POST erkannt' } },
    { muster: '**/api/laeufe**', methode: 'POST', status: 409, json: { grund: 'NACHWEIS: POST erkannt' } },
    { muster: '**/api/workflows/**', methode: 'POST', status: 409, json: { grund: 'NACHWEIS: POST erkannt' } },
    { muster: '**/api/ressourcen/**', methode: 'POST', status: 409, json: { grund: 'NACHWEIS: POST erkannt' } },
  ]
}

const BEOBACHTUNG = {
  texte: [
    { name: 'Ansicht', selector: '[data-view]:not([hidden])', attribut: 'data-view' },
    { name: 'data-theme', selector: 'html', attribut: 'data-theme' },
    { name: 'lang', selector: 'html', attribut: 'lang' },
    { name: 'Titel', selector: '#werkstatt-titel' },
    { name: 'Register aktiv', selector: '#werkstatt-register [aria-selected="true"]' },
    { name: 'Unterregister aktiv', selector: '#faehigkeiten-register [aria-selected="true"]' },
    { name: 'Gewählter Knoten', selector: '#harness-skelett [aria-pressed="true"]', attribut: 'data-harness-pfad' },
    { name: 'Detail: Pfad', selector: '#harness-detail .harness-detail-pfad' },
    { name: 'Detail: Satz Bremse', selector: '#harness-detail .harness-detail-satz' },
    { name: 'Detail: VS Code', selector: '#harness-detail a[href^="vscode:"]', attribut: 'href' },
    { name: 'Library: Hinweis', selector: '#library-hinweis:not([hidden])' },
    { name: 'Library: gezeigt', selector: '.library-fuss' },
    { name: 'Library: gewählt', selector: '#library-detail .library-detail-name' },
    { name: 'Library: Chips gewählt', selector: '.library-chips [aria-pressed="true"]' },
    { name: 'Fokus (id)', selector: ':focus', attribut: 'id' },
    { name: 'Fokus (Klasse)', selector: ':focus', attribut: 'class' },
  ],
  vorhanden: [
    { name: 'aria-live außer Persona (muss fehlen)', selector: '[aria-live]:not(#persona-text-status)' },
    { name: '<img> aus Daten (muss fehlen)', selector: 'main img[src="x"]' },
    { name: '<b> aus Daten (muss fehlen)', selector: '#harness-detail b, #library-detail b, #harness-skelett b' },
    { name: 'Schreibknopf außerhalb „kommt“ im Harness (muss fehlen)', selector: '#werkstatt-bereich-harness button.button:not([aria-disabled="true"])' },
    { name: 'Freigabe-Knopf F36 im Detail', selector: '#library-detail [data-installation-aktion="vorbereiten"]' },
  ],
  ueberlauf: true,
}

const warte = (selector, timeoutMs = 8000) => ({ warteAufSelector: { selector, timeoutMs } })
const SKELETT_DA = '#harness-skelett .harness-spalte'
const HOOK = '#harness-skelett [data-harness-pfad=".claude/hooks/commit-guard.cjs"]'
const HOOK_DA = '#harness-detail .harness-detail-inhalt'
const LIB = '#werkstatt-reiter-faehigkeiten'
const LIB_DA = '#capabilities-library .library-zeile'

/**
 * Eine Folge.
 * @param optionen - url, schritte, farbschema, breite, hoehe, zoom, sprache, varianten
 * @returns Klickfolge
 */
function folge({ url = '#/capabilities', schritte, farbschema = 'dark', breite = 1440, hoehe = 1000, zoom = 1, sprache, varianten }) {
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

// ─── Harness-Aufbau ─────────────────────────────────────────────────────────
folgen['harness-detail'] = folge({
  hoehe: 1300,
  schritte: [
    { label: '#/capabilities öffnet „Harness-Aufbau“: Legende (Vorlage, Genutzt von: kommt), Skelett mit sechs Bausteinen, echte Dateien und Anzahlen, Hooks einzeln mit Schloss; Detail leer', ...warte(SKELETT_DA), screenshot: 'd1440-harness.webp' },
    { label: 'Klick auf CLAUDE.md (Regel-Datei) → Detail lesend: Baustein · Datei · nur lesend, Größe, geändert, Genutzt von/Vorlage kommt, Inhalt, „Änderung vorschlagen“ kommt, „In VS Code öffnen“', klick: '#harness-skelett [data-harness-pfad="CLAUDE.md"]', ...warte(HOOK_DA), screenshot: 'k01-regel-claude-md.webp' },
    { label: 'Klick auf hooks/commit-guard.cjs → Bremse mit Schloss, „Sichtbar, aber nicht direkt änderbar.“', klick: HOOK, ...warte('#harness-detail .harness-detail-satz'), screenshot: 'k02-hook-schloss.webp' },
    { label: 'Klick auf agents/ · 5 → Ordner mit seinen direkten Einträgen (öffenbar)', klick: '#harness-skelett [data-harness-pfad=".claude/agents"]', ...warte('#harness-detail .harness-ordner-liste'), screenshot: 'k03-ordner-agents.webp' },
    { label: 'Klick auf qa.md in der Ordnerliste → Datei im Detail (Fokus im Detail)', klick: '#harness-detail [data-harness-pfad=".claude/agents/qa.md"]', screenshot: 'k04-ordner-datei.webp' },
    { label: '„Zur Capability Library →“ wechselt das Register', klick: '#harness-zur-library', ...warte(LIB_DA), screenshot: 'k05-zur-library.webp' },
  ],
  varianten: { dateien: { '.claude/agents/qa.md': dateiAntwort('.claude/agents/qa.md', '---\nname: qa\ndescription: Prueft ein Feature aus Sicht echter Nutzer.\ntools: Read, Grep, Glob\n---\n', 1066) } },
})
folgen['harness-fehlende-orte'] = folge({
  hoehe: 1200,
  varianten: {
    harnessAntwort: harness({
      'README.md': fehlt('README.md'),
      'docs/harness': fehlt('docs/harness', 'ordner'),
      'state/zwischenstand': fehlt('state/zwischenstand', 'ordner'),
      '.worktreeinclude': fehlt('.worktreeinclude'),
      '.github/workflows': { pfad: '.github/workflows', art: 'ordner', vorhanden: true, status: 'fehler', grund: 'Verknüpfung zeigt außerhalb der Repo-Wurzel' },
    }),
  },
  schritte: [{ label: 'Fehlende Orte gestrichelt mit „fehlt“, ein Ort mit Fehler „nicht lesbar“ (Grund als Text) — kein Knopf dafür', ...warte('#harness-skelett [data-zustand="fehlt"]'), screenshot: 'd1440-harness-fehlende-orte.webp' }],
})
folgen['harness-leer'] = folge({
  varianten: { harnessAntwort: { status: 'ok', absoluterPfad: 'C:\\Users\\stefa\\Projekte\\neues-projekt', name: 'neues-projekt', bausteine: harness().bausteine.map((b) => ({ ...b, eintraege: b.eintraege.map((e) => fehlt(e.pfad, e.art, e.geschuetzt ? { geschuetzt: true } : {})) })) } },
  schritte: [{ label: 'Projekt ohne Harness: Hinweis oben, alle Orte „fehlt“', ...warte('#harness-skelett .harness-leer'), screenshot: 'd1440-harness-leer.webp' }],
})

// ─── Capability Library ─────────────────────────────────────────────────────
folgen['library-filter'] = folge({
  hoehe: 1400,
  varianten: { dateien: { '.claude/agents/code-reviewer.md': dateiAntwort('.claude/agents/code-reviewer.md', '---\nname: code-reviewer\ndescription: Prueft fertigen Code.\ntools: Read, Grep, Glob\n---\n', 1659) } },
  schritte: [
    { label: 'Register „Capability Library“: Titel wechselt, Kennzahlen (im Katalog, aktiv, Freigabe offen), Chips mit Anzahl, Hinweis design-guardian aus dem Abgleich, Tabelle 12 von 16', klick: LIB, ...warte(LIB_DA), screenshot: 'd1440-library.webp' },
    { label: 'Chip „Extern“ → nur externe; Fokus bleibt auf dem Chip', klick: '[data-library-typ="extern"]', screenshot: 'k01-extern.webp' },
    { label: 'Chip „Nicht aktiv“ → externe mit offener Freigabe', klick: '[data-library-status="nicht_aktiv"]', screenshot: 'k02-nicht-aktiv.webp' },
    { label: 'Zeile context7-mcp → offene Freigabe ohne F36-Weg: Grund statt Knopf', klick: '#capabilities-library [data-library-id="context7-mcp"] .library-name', ...warte('#library-detail .library-nicht-installierbar'), screenshot: 'k03a-nicht-installierbar.webp' },
    { label: 'Zeile impeccable → Detail „Ausgewählt · nicht aktiv“ mit „Prüfen & freigeben“ (F36-Weg, nicht geklickt); Fokus auf dem Namen', klick: '#capabilities-library [data-library-id="impeccable"] .library-name', ...warte('#library-detail [data-installation-aktion="vorbereiten"]'), screenshot: 'k03-detail-impeccable.webp' },
    { label: 'Filter zurück, Suche „agents“ → Treffer über Beschreibung/ID', klick: '[data-library-typ=""]' },
    { label: 'Status „Alle“', klick: '[data-library-status=""]' },
    { label: 'Suche „review“ → impeccable ist ausgeblendet, das Detail sagt es', tippen: { selector: '#capabilities-suche', text: 'review' }, screenshot: 'k04-suche.webp' },
    { label: 'Zeile code-reviewer → Detail aktiv, „Im Harness-Aufbau zeigen“', klick: '#capabilities-library [data-library-id="code-reviewer"] .library-name', screenshot: 'k05-detail-aktiv.webp' },
    { label: '„Im Harness-Aufbau zeigen“ → Register Harness, die Datei .claude/agents/code-reviewer.md im Detail', klick: '#library-detail .library-zum-harness', ...warte('#harness-detail .harness-detail-pfad'), screenshot: 'k06-im-harness.webp' },
  ],
})
folgen['library-ohne-hinweis'] = folge({
  varianten: { libraryAntwort: LIBRARY([...KATALOG, r('design-guardian', 'agent', 'FREIGEGEBEN', 'Design-Treue gegen Referenzen prüfen.', { art: 'agent', pfad: '.claude/agents/design-guardian.md' })]) },
  schritte: [{ label: 'Steht design-guardian im Katalog, erscheint kein Hinweis (kein fester Text)', klick: LIB, ...warte(LIB_DA), screenshot: 'd1440-library-ohne-hinweis.webp' }],
})

// ─── Phasen & Rollen; Rollen & Besetzung; Scout ─────────────────────────────
folgen['phasen-rollen'] = folge({
  schritte: [
    { label: 'Register „Phasen & Rollen“ (Inhalt aus F44 WS-7a: kommt)', klick: '#werkstatt-reiter-phasen', screenshot: 'd1440-phasen.webp' },
    { label: 'Capability Library › Rollen & Besetzung: Coverage je Rolle; an der Lücke „Kandidaten suchen“ (Scout) erreichbar', klick: LIB },
    { label: 'Unterregister Rollen & Besetzung', klick: '#faehigkeiten-reiter-rollen', ...warte('#capabilities-abdeckung .capabilities-scout-link'), screenshot: 'k01-rollen-scout.webp' },
    { label: 'Tastatur: Pfeil links im Hauptregister → Harness-Aufbau', fokus: '#werkstatt-reiter-faehigkeiten', taste: 'ArrowLeft', screenshot: 'k02-tastatur.webp' },
  ],
})

// ─── Matrix ─────────────────────────────────────────────────────────────────
const DARSTELLUNGEN = {
  'dunkel-1440': { praefix: 'd1440' },
  'hell-1440': { praefix: 'l1440', farbschema: 'light' },
  'dunkel-390': { praefix: 'd390', breite: 390, hoehe: 844 },
  'dunkel-1440-zoom200': { praefix: 'd1440z2', zoom: 2 },
  'ru-1440': { praefix: 'ru1440', sprache: 'ru' },
}
for (const [dName, { praefix, ...darstellung }] of Object.entries(DARSTELLUNGEN)) {
  folgen[`matrix-${dName}`] = folge({
    hoehe: 1300,
    ...darstellung,
    schritte: [
      { label: 'Harness mit geöffnetem Hook (Schloss)', ...warte(SKELETT_DA), klick: HOOK },
      { label: 'Detail geladen', ...warte(HOOK_DA), screenshot: `${praefix}-harness.webp` },
      { label: 'Library mit Detail impeccable', klick: LIB, ...warte(LIB_DA) },
      { label: 'Detail', klick: '#capabilities-library [data-library-id="impeccable"] .library-name', ...warte('#library-detail .library-detail-name'), screenshot: `${praefix}-library.webp` },
    ],
  })
}

// ─── Escape ────────────────────────────────────────────────────────────────
folgen.escape = folge({
  breite: 1600,
  hoehe: 1300,
  varianten: {
    harnessAntwort: harness({ name: `ai-workforce${HTML}`, '.claude/commands': ordner('.claude/commands', [d(`lessons${HTML}.md`, 10)]) }),
    dateien: { 'CLAUDE.md': dateiAntwort('CLAUDE.md', `# Regeln\n\n${HTML}\n<script>alert(2)</script>\n`, 80) },
    libraryAntwort: LIBRARY([r('impeccable', 'extern', 'OFFEN', `Beschreibung ${HTML}`, { art: 'extern', url: 'javascript:alert(1)' }, { unterart: 'skill' }), ...KATALOG.slice(0, 4)]),
  },
  schritte: [
    { label: 'HTML im Repo-Namen und in einem Dateinamen erscheint als Text', ...warte(SKELETT_DA), klick: '#harness-skelett [data-harness-pfad=".claude/commands"]', screenshot: 'd1600-escape-skelett.webp' },
    { label: 'Dateiinhalt mit HTML und <script> erscheint als Text im <pre>', klick: '#harness-skelett [data-harness-pfad="CLAUDE.md"]', ...warte(HOOK_DA), screenshot: 'k01-escape-inhalt.webp' },
    { label: 'Katalogbeschreibung mit HTML, Quelle javascript: als Text (kein Link)', klick: LIB, ...warte(LIB_DA) },
    { label: 'Detail', klick: '#capabilities-library [data-library-id="impeccable"] .library-name', screenshot: 'k02-escape-library.webp' },
  ],
})

// ─── Ausführen ─────────────────────────────────────────────────────────────
if (nur && !(nur in folgen)) throw new Error(`Unbekannte Folge: ${nur}`)
const auszufuehren = nur ? { [nur]: folgen[nur] } : folgen

for (const [ordnerName, klickfolge] of Object.entries(auszufuehren)) {
  const verzeichnis = join(ziel, ordnerName)
  // Nur ein eigener, direkter Unterordner dieses Skripts (features/F46/nachweise/d6/<folge>) wird geleert — nie etwas anderes.
  if (!/^[a-z0-9-]+$/.test(ordnerName) || dirname(verzeichnis) !== ziel) throw new Error(`Ausgabeordner außerhalb von ${ziel}: ${verzeichnis}`)
  rmSync(verzeichnis, { recursive: true, force: true })
  mkdirSync(verzeichnis, { recursive: true })
  console.log(`\n── ${ordnerName} ──`)
  const pfad = join(verzeichnis, 'klickfolge.json')
  writeFileSync(pfad, `${JSON.stringify(klickfolge, null, 2)}\n`)
  execFileSync(process.execPath, [join(wurzel, 'scripts/render-nachweis.mjs'), pfad, verzeichnis], { stdio: 'inherit', cwd: wurzel })
}
