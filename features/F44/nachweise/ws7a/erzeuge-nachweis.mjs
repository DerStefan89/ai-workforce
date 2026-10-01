/**
 * Datei: features/F44/nachweise/ws7a/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweise F44 WS-7a „Werkstatt-Gerüst, Werkzeuge, Rollen“ (`#/capabilities`, Vorlage V10
 * d_harness_phasen Kopf/Register, d_faehigkeiten, d_faehigkeiten_rollen; Abgleich F-725 J5–J8) — nur diese Seite:
 * - je Darstellung (1440 dunkel und hell, 390 dunkel, 1440 dunkel und ru mit 200 % Zoom, 1440 ru) EINE Folge:
 *   Werkzeuge (Standard) mit echtem Katalog; eine Kachel mit offenem Detail; Rollen & Besetzung mit einer
 *   Gap-Zeile; Details einer Rolle offen (echte Ebenen 1–4 aus GET …/ressourcen/rollen/<rolle>); Empfehlungen;
 *   Harness-Aufbau und Phasen & Rollen (Baustein „kommt“);
 * - Klicktabelle (1440 dunkel): Suche, Filter Typ und Freigabe, leere Trefferliste, Register per Tastatur
 *   (Pfeiltasten, Pos1, Ende), Details auf/zu, Filter + „Neu laden“, „Zum Workboard“;
 * - lange Namen/Beschreibungen bei 390 px (fester Katalog mit langen Werten, kein waagerechter Scroll);
 * - Zustände (1440 dunkel): leerer Katalog, Ladefehler je Quelle getrennt (die andere rendert weiter), Rolle
 *   ohne Worker, Fehler der Rollen-Details.
 * Die Abdeckung ist in allen Folgen eine feste Antwort (das laufende Projekt hat real keine Gap-Rolle); der
 * Katalog ist außer in „lang-390“ und „zustaende“ der echte (GET …/ressourcen ungestört). „Kandidaten suchen“
 * wird NICHT geklickt (startet einen echten Lauf) — der Sperrzustand ist per Code-Review belegt.
 * Baut je Folge eine klickfolge.json in einem Unterordner und ruft scripts/render-nachweis.mjs auf;
 * Screenshots als WebP. Vor dem Lauf leert das Skript die Ausgabeordner GENAU der Folgen, die es neu
 * erzeugt (fs.rmSync, recursive, force) — fremde Ordner und das Skript selbst bleiben unberührt.
 *
 * Wird aufgerufen von: Hand, gegen einen laufenden Leitstand dieses Worktrees —
 *   LEITSTAND_PORT=4199 node scripts/leitstand-server.mjs
 *   node features/F44/nachweise/ws7a/erzeuge-nachweis.mjs [basis] [nurOrdner]
 *   basis:     Standard http://127.0.0.1:4199
 *   nurOrdner: optional, nur diese Folge (Name des Unterordners)
 * Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const basis = process.argv[2] ?? 'http://127.0.0.1:4199'
const nur = process.argv[3]
/** Ausgabe neben diesem Skript, Repo-Wurzel vier Ebenen darüber — unabhängig vom Aufrufverzeichnis (rmSync löscht nur hier). */
const ziel = dirname(fileURLToPath(import.meta.url))
const wurzel = resolve(ziel, '../../../..')

/** Chatspalte eingeklappt (Vorlage: Chat als Dock, WS-8) — ab 1280 px bleibt sie trotzdem sichtbar. */
const CHAT_ZU = { 'leitstand-chat-offen': 'false' }

const BEOBACHTUNG = {
  texte: [
    { name: 'Ansicht', selector: '[data-view]:not([hidden])', attribut: 'data-view' },
    { name: 'data-theme', selector: 'html', attribut: 'data-theme' },
    { name: 'lang', selector: 'html', attribut: 'lang' },
    { name: 'Register gewählt', selector: '#werkstatt-register [aria-selected="true"]' },
    { name: 'Unterreiter gewählt', selector: '#faehigkeiten-register [aria-selected="true"]' },
    { name: 'Fokus-ID', selector: ':focus', attribut: 'id' },
    { name: 'Kennzahlen', selector: '#capabilities-kennzahlen' },
    { name: 'erste Kachel', selector: '#capabilities-library .werkzeug-karte h3' },
    { name: 'Leerzustand Werkzeuge', selector: '#capabilities-library .leer' },
    { name: 'Details aria-expanded', selector: '.werkstatt-rolle[data-rolle="qa"] .capabilities-rolle-details', attribut: 'aria-expanded' },
  ],
  vorhanden: [
    { name: 'Kachel-Detail offen', selector: '.werkzeug-detail[open]' },
    { name: 'Gap-Zeile mit „Kandidaten suchen“', selector: '.werkstatt-gap-zeile .capabilities-scout-link' },
    { name: 'Rollen-Details geladen', selector: '.werkstatt-rollen-detail:not([hidden]) .lauf-kopfdaten' },
    { name: 'Rollen-Select (muss fehlen)', selector: '#capabilities-rollen-auswahl' },
    { name: 'Aktivieren/Freigeben-Knopf (muss fehlen)', selector: '#view-capabilities [data-aktion="freigeben"], #view-capabilities [data-aktion="aktivieren"]' },
    { name: 'Fehler Werkzeuge', selector: '#capabilities-library > p.fehler' },
    { name: 'Fehler Abdeckung', selector: '#capabilities-abdeckung > p.fehler' },
    { name: 'Fehler Details', selector: '.werkstatt-rollen-detail p.fehler' },
    { name: 'ASSESSED-Zeile gefüllt', selector: '#capabilities-assessed .badge' },
  ],
  ueberlauf: true,
}

/** Feste Abdeckung: echte Rollen-IDs (Details laden echt), qa mit Gap bei codex, code-reviewer mit F-346-Ausnahme. */
const ABDECKUNG = {
  startvorlagePfad: 'startvorlagen/beispielprojekt.json',
  rollen: [
    { rolle: 'jarvis', benoetigteCapabilities: ['CHAT'], workerAbdeckung: [{ worker: 'claude-code', fehlend: [], f346Ausnahme: false, restFehlend: [] }], gedeckt: true },
    {
      rolle: 'code-reviewer',
      benoetigteCapabilities: ['CODE_REVIEW'],
      workerAbdeckung: [
        { worker: 'claude-code', fehlend: ['CODE_REVIEW'], f346Ausnahme: true, restFehlend: [] },
        { worker: 'codex', fehlend: [], f346Ausnahme: false, restFehlend: [] },
      ],
      gedeckt: true,
    },
    {
      rolle: 'qa',
      benoetigteCapabilities: ['ACCEPTANCE_TEST', 'BROWSER_TEST'],
      workerAbdeckung: [
        { worker: 'claude-code', fehlend: [], f346Ausnahme: false, restFehlend: [] },
        { worker: 'codex', fehlend: ['BROWSER_TEST'], f346Ausnahme: false, restFehlend: ['BROWSER_TEST'] },
      ],
      gedeckt: false,
    },
    { rolle: 'ausfuehrung', benoetigteCapabilities: ['CODE_WRITE'], workerAbdeckung: [{ worker: 'claude-code', fehlend: [], f346Ausnahme: false, restFehlend: [] }], gedeckt: true },
    // Rolle ohne registrierten erlaubten Worker (Server: gedeckt = workerAbdeckung.length > 0 && …).
    { rolle: 'scout', benoetigteCapabilities: ['WEB_RESEARCH'], workerAbdeckung: [], gedeckt: false },
  ],
}

const LANG_NAME = 'Barrierefreiheits-Prüfwerkzeug für Formularvalidierung und Fehlermeldungsverständlichkeit'
const LANG_TEXT = 'Prüft Formulare, Fehlermeldungen und Tastaturbedienung gegen WCAG-Kriterien – mit ausführlicher Begründung je Befund, Quellenangabe und einem Vorschlag zur Behebung, ohne selbst etwas zu ändern.'
const eintrag = (id, typ, name, beschreibung, freigabe, verfuegbar, fehlt = []) => ({
  id,
  typ,
  name,
  beschreibung,
  freigabe,
  verfuegbar,
  capabilities: [],
  grund: 'fest (Nachweis)',
  anzeigeGrund: freigabe === 'OFFEN' ? 'noch nicht freigegeben' : 'freigegeben und auflösbar',
  phasen: freigabe === 'OFFEN' ? ['DISCOVERED'] : ['DISCOVERED', 'APPROVED', 'AVAILABLE'],
  fehltFuerEinsatz: fehlt,
})
const KATALOG_LANG = {
  startvorlagePfad: 'startvorlagen/ein-sehr-langer-ordnername-fuer-startvorlagen/beispielprojekt-mit-langem-namen.json',
  assessedHinweis: 'ASSESSED: kein Eintrag erreicht diese Phase in v1 (fest, Nachweis).',
  eintraege: [
    eintrag('barrierefreiheits-pruefwerkzeug-fuer-formularvalidierung-und-fehlermeldungen', 'skill', LANG_NAME, LANG_TEXT, 'OFFEN', false, ['Freigabe in ressourcen.json fehlt', 'Installation unter .claude/skills/barrierefreiheits-pruefwerkzeug-fuer-formularvalidierung fehlt']),
    eintrag('claude-code', 'worker', 'Claude Code', 'Entwickelt Funktionen und setzt klare Arbeitsaufträge im Projekt um.', 'FREIGEGEBEN', true),
    eintrag('Donaudampfschifffahrtsgesellschaftskapitaensmuetzenabzeichen', 'extern', 'Donaudampfschifffahrtsgesellschaftskapitänsmützenabzeichen', 'Ein Wort ohne Trennstelle.', 'FREIGEGEBEN', true),
  ],
}

/** Feste Antwort der Abdeckung für alle Folgen (das laufende Projekt hat keine Gap-Rolle). */
const ANTWORTEN = [{ muster: '**/ressourcen/abdeckung', json: ABDECKUNG }]

/**
 * Eine Folge. Seitenbilder als Ausschnitt der Ansicht ab 1280 CSS-px, sonst Vollseite.
 * @param optionen - schritte, antworten, farbschema, breite, hoehe, zoom, sprache, vollseite (Standard true)
 * @returns Klickfolge
 */
function folge({ schritte, antworten = [], farbschema = 'dark', breite = 1440, hoehe = 1000, zoom = 1, sprache, vollseite = true }) {
  const breit = breite / zoom >= 1280
  return {
    url: `${basis}/#/capabilities`,
    viewport: { breite, hoehe },
    farbschema,
    zoom,
    screenshotQualitaet: 0.7,
    ...(breit ? { screenshotVollseite: vollseite, screenshotAusschnitt: { selector: '#view-capabilities' } } : { screenshotVollseite: vollseite }),
    localStorageSetzen: { ...CHAT_ZU, ...(sprache ? { 'leitstand-sprache': sprache } : {}) },
    anfragenAntworten: [...ANTWORTEN, ...antworten],
    beobachtete: BEOBACHTUNG,
    schritte,
  }
}

const warte = (selector, timeoutMs = 15000, zustandWert) => ({ warteAufSelector: { selector, timeoutMs, ...(zustandWert ? { zustand: zustandWert } : {}) } })

const DARSTELLUNGEN = {
  'dunkel-1440': { praefix: 'd1440' },
  'hell-1440': { praefix: 'l1440', farbschema: 'light' },
  'dunkel-390': { praefix: 'd390', breite: 390, hoehe: 844 },
  // 200 %: Viewport-Bilder — die Vollseite mit 42 Kacheln überschreitet bei doppelter Pixeldichte die Canvas-Grenze
  // der WebP-Umkodierung; ein Klick scrollt sein Ziel ins Bild.
  'dunkel-1440-zoom200': { praefix: 'd1440z2', zoom: 2, vollseite: false },
  'ru-1440': { praefix: 'ru1440', sprache: 'ru' },
  // Korrekturrunde (design-guardian 1): längster Knopftext „Перезагрузить“ im Kopf bei 200 %.
  'ru-1440-zoom200': { praefix: 'ru1440z2', sprache: 'ru', zoom: 2, vollseite: false },
}

const folgen = {}

for (const [name, { praefix, ...darstellung }] of Object.entries(DARSTELLUNGEN)) {
  folgen[`matrix-${name}`] = folge({
    schritte: [
      { label: 'Werkzeuge (Standard): Kopf, Register, Unterreiter, Kennzahlen echt gezählt, Suche/Filter, Kacheln, Hinweise', ...warte('#capabilities-library .werkzeug-karte'), screenshot: `${praefix}-1-werkzeuge.webp` },
      { label: 'Kachel-Detail der ersten Kachel offen (ID, Phasen, Grund, Fehlt für Einsatz)', klick: '#capabilities-library .werkzeug-karte .werkzeug-detail > summary', ...warte('.werkzeug-detail[open] dl'), screenshot: `${praefix}-2-kachel-detail.webp` },
      { label: 'Unterreiter Rollen & Besetzung: Hinweis, Liste je Rolle, Gap-Zeile bei qa (Zum Workboard, Kandidaten suchen), F-346-Ausnahme', klick: '#faehigkeiten-reiter-rollen', ...warte('.werkstatt-gap-zeile .capabilities-scout-link'), screenshot: `${praefix}-3-rollen.webp` },
      { label: 'Details der Rolle qa offen: Ebenen 1–4 lazy geladen', klick: '.werkstatt-rolle[data-rolle="qa"] .capabilities-rolle-details', ...warte('.werkstatt-rolle[data-rolle="qa"] .werkstatt-rollen-detail .lauf-kopfdaten'), screenshot: `${praefix}-4-rolle-details.webp` },
      { label: 'Unterreiter Empfehlungen: Verweis auf den Freigabeschritt', klick: '#faehigkeiten-reiter-empfehlungen', ...warte('#faehigkeiten-bereich-empfehlungen .werkstatt-link'), screenshot: `${praefix}-5-empfehlungen.webp` },
      { label: 'Register Harness-Aufbau: Baustein „kommt“', klick: '#werkstatt-reiter-harness', ...warte('#werkstatt-bereich-harness .kommt-badge'), screenshot: `${praefix}-6-harness.webp` },
      { label: 'Register Phasen & Rollen: Baustein „kommt“', klick: '#werkstatt-reiter-phasen', ...warte('#werkstatt-bereich-phasen .kommt-badge'), screenshot: `${praefix}-7-phasen.webp` },
    ],
    ...darstellung,
  })
}

folgen.klicktabelle = folge({
  schritte: [
    { label: 'Seite geladen (Werkzeuge)', ...warte('#capabilities-library .werkzeug-karte') },
    { label: 'Suche „codex“ (id/name/beschreibung, clientseitig)', tippen: { selector: '#capabilities-suche', text: 'codex' }, screenshot: 'd1440-k1-suche.webp' },
    { label: 'Suche leeren, Filter Typ = extern', tippen: { selector: '#capabilities-suche', text: '' }, auswaehlen: { selector: '#capabilities-filter-typ', wert: 'extern' } },
    { label: 'Filter Freigabe = Freigabe offen (kombiniert mit Typ extern)', auswaehlen: { selector: '#capabilities-filter-freigabe', wert: 'offen' }, screenshot: 'd1440-k2-filter.webp' },
    { label: 'Typ = worker bei Freigabe offen → eigener Leerzustand', auswaehlen: { selector: '#capabilities-filter-typ', wert: 'worker' }, ...warte('#capabilities-library .leer'), screenshot: 'd1440-k3-leer.webp' },
    { label: 'Filter zurück auf Alle', auswaehlen: { selector: '#capabilities-filter-typ', wert: '' } },
    { label: 'Filter Freigabe zurück auf Alle', auswaehlen: { selector: '#capabilities-filter-freigabe', wert: '' } },
    { label: 'Filter Typ = agent, dann „Neu laden“: Filter bleibt und wirkt auf die frisch geladenen Kacheln', auswaehlen: { selector: '#capabilities-filter-typ', wert: 'agent' } },
    { label: '„Neu laden“ mit aktivem Filter', klick: '#capabilities-neu-laden', ...warte('#capabilities-library .werkzeug-karte'), screenshot: 'd1440-k5-filter-neu-laden.webp' },
    { label: 'Filter Typ zurück auf Alle', auswaehlen: { selector: '#capabilities-filter-typ', wert: '' } },
    { label: 'Tastatur: Fokus auf Fähigkeiten, Pfeil links → Phasen & Rollen gewählt und fokussiert', fokus: '#werkstatt-reiter-faehigkeiten', taste: 'ArrowLeft' },
    { label: 'Tastatur: Pos1 → Harness-Aufbau', taste: 'Home' },
    { label: 'Tastatur: Pfeil links am Anfang → läuft um zu Fähigkeiten', taste: 'ArrowLeft' },
    { label: 'Tastatur: Unterreiter, Fokus auf Werkzeuge, Ende → Empfehlungen', fokus: '#faehigkeiten-reiter-werkzeuge', taste: 'End' },
    { label: 'Tastatur: Pfeil rechts am Ende → läuft um zu Werkzeuge', taste: 'ArrowRight' },
    { label: 'Tastatur: Pfeil rechts → Rollen & Besetzung', taste: 'ArrowRight', ...warte('.werkstatt-gap-zeile') },
    { label: 'Details qa öffnen (aria-expanded true, lädt lazy)', klick: '.werkstatt-rolle[data-rolle="qa"] .capabilities-rolle-details', ...warte('.werkstatt-rolle[data-rolle="qa"] .werkstatt-rollen-detail .lauf-kopfdaten') },
    { label: 'Details qa schließen (aria-expanded false, Container hidden)', klick: '.werkstatt-rolle[data-rolle="qa"] .capabilities-rolle-details', ...warte('.werkstatt-rolle[data-rolle="qa"] .werkstatt-rollen-detail', 5000, 'hidden') },
    { label: 'Details qa wieder öffnen, dann „Neu laden“: Details bleiben offen und laden frisch', klick: '.werkstatt-rolle[data-rolle="qa"] .capabilities-rolle-details', ...warte('.werkstatt-rolle[data-rolle="qa"] .werkstatt-rollen-detail .lauf-kopfdaten') },
    { label: '„Neu laden“', klick: '#capabilities-neu-laden', ...warte('.werkstatt-rolle[data-rolle="qa"] .werkstatt-rollen-detail .lauf-kopfdaten'), screenshot: 'd1440-k4-neu-laden.webp' },
    { label: '„Zum Workboard“ in der Gap-Zeile → #/workboard', klick: '.werkstatt-gap-zeile .capabilities-gap-link', ...warte('#view-workboard') },
  ],
})

folgen['lang-390'] = folge({
  breite: 390,
  hoehe: 844,
  antworten: [{ muster: '**/ressourcen', json: KATALOG_LANG }],
  schritte: [
    { label: 'Lange Namen/Beschreibungen/IDs bei 390 px: kein waagerechter Scroll', ...warte('#capabilities-library .werkzeug-karte'), screenshot: 'd390-lang-1-kacheln.webp' },
    { label: 'Detail der langen Kachel offen; Technik-Klappe mit langem Pfad', klick: '#capabilities-library .werkzeug-detail > summary', ...warte('.werkzeug-detail[open] dl') },
    { label: 'Technik-Klappe offen', klick: '.werkstatt-technik > summary', screenshot: 'd390-lang-2-detail.webp' },
  ],
})

folgen.zustaende = folge({
  antworten: [{ muster: '**/ressourcen', json: { startvorlagePfad: 'startvorlagen/beispielprojekt.json', assessedHinweis: 'ASSESSED: fest (Nachweis).', eintraege: [] } }],
  schritte: [
    { label: 'Leerer Katalog: Kennzahlen 0, eigener Leerzustand', ...warte('#capabilities-library .leer'), screenshot: 'd1440-z1-katalog-leer.webp' },
    {
      label: 'Nur der Katalog scheitert (500): Fehler nur bei den Werkzeugen, ohne ASSESSED/Startvorlage des letzten Ladens',
      anfragenAntworten: [{ muster: '**/ressourcen', status: 500, json: { grund: 'ressourcen.json nicht lesbar' } }],
      klick: '#capabilities-neu-laden',
      ...warte('#capabilities-library .fehler'),
      screenshot: 'd1440-z2-katalog-fehler.webp',
    },
    { label: 'Rollen & Besetzung lädt trotzdem (andere Quelle unberührt)', klick: '#faehigkeiten-reiter-rollen', ...warte('.werkstatt-rolle[data-rolle="scout"]'), screenshot: 'd1440-z3-rollen-ok-ohne-worker.webp' },
    {
      label: 'Katalog wieder da, nur die Abdeckung scheitert (500): Fehler nur bei Rollen & Besetzung',
      anfragenAntworten: [{ muster: '**/ressourcen', json: { startvorlagePfad: 'startvorlagen/beispielprojekt.json', assessedHinweis: 'ASSESSED: fest (Nachweis).', eintraege: [] } }, { muster: '**/ressourcen/abdeckung', status: 500, json: { grund: 'Startvorlage nicht lesbar' } }],
      klick: '#capabilities-neu-laden',
      ...warte('#capabilities-abdeckung .fehler'),
      screenshot: 'd1440-z4-abdeckung-fehler.webp',
    },
    {
      label: 'Abdeckung wieder da, Details der Rolle scheitern (404) — sonst kein Fehler auf der Seite',
      anfragenAntworten: [{ muster: '**/ressourcen/abdeckung', json: ABDECKUNG }, { muster: '**/ressourcen/rollen/*', status: 404, json: { grund: 'Rolle unbekannt' } }],
      klick: '#capabilities-neu-laden',
      ...warte('.capabilities-rolle-details'),
    },
    { label: 'Details qa öffnen → Fehler im Detail-Container', klick: '.werkstatt-rolle[data-rolle="qa"] .capabilities-rolle-details', ...warte('.werkstatt-rollen-detail .fehler'), screenshot: 'd1440-z5-details-fehler.webp' },
  ],
})

const auszufuehren = nur ? { [nur]: folgen[nur] } : folgen
if (nur && !folgen[nur]) throw new Error(`Unbekannte Folge: ${nur}`)

for (const [ordner, klickfolge] of Object.entries(auszufuehren)) {
  const verzeichnis = join(ziel, ordner)
  rmSync(verzeichnis, { recursive: true, force: true })
  mkdirSync(verzeichnis, { recursive: true })
  const datei = join(verzeichnis, 'klickfolge.json')
  writeFileSync(datei, `${JSON.stringify(klickfolge, null, 2)}\n`)
  console.log(`\n── ${ordner} ──`)
  execFileSync(process.execPath, [join(wurzel, 'scripts/render-nachweis.mjs'), datei, verzeichnis], { stdio: 'inherit', cwd: wurzel })
}
