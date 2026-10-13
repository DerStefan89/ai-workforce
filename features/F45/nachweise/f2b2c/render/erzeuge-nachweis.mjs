/**
 * Datei: features/F45/nachweise/f2b2c/render/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 F-2b-2c (Muster features/F45/nachweise/f2b/render/erzeuge-nachweis.mjs) gegen die Testinstanz
 * features/F45/nachweise/f2b2c/instanz.mjs (Port 4395):
 * - sammlung-vormerken-*: Sammlung → Suche „planning“ → „Details“ öffnet die volle Detailzeile (F-1068 (3)) → Prüfbericht und
 *   „Vormerken“ (F-1056 Rest) → Klick (Auftrag/Routen als Antwort-Attrappen) → „Vorgemerkt als Auftrag …“; dazu gstack mit dem
 *   Grund „ganzes Repo“; Varianten 1440/390, de/en, hell/dunkel;
 * - sammlung-tastatur: „Details“ per Enter öffnen und wieder schließen, der Fokus bleibt am Knopf;
 * - library-eignung-*: Capability Library → taste-skill (per Attrappe installierbar) → „Prüfen & freigeben“ → Sperre ohne
 *   Bericht mit „Eignung prüfen“ → Bestätigung im Platz des Details → „Prüfung starten“ → Bericht → der Dialog wird neu
 *   vorbereitet und zeigt den Bericht mit „Installieren“; Varianten 1440/390, de/en, hell;
 * - faehigkeiten-band-neustart-*: Seite Workforce → „Dieses Projekt“ → Band „Stand vor dem letzten Neustart“ (F-1061 (1));
 *   faehigkeiten-band-unbekannt-*: erster Start ohne gespeicherten Stand (Korrekturrunde, QA M3).
 * - Korrekturrunde (design-guardian 6): Zoom 200 %, reduzierte Bewegung, ru/tr, Warnung „übersprungen“ und Fehler beim Vormerken.
 * Schreibt nur in eigene Unterordner.
 *
 * Wird aufgerufen von: Hand, während instanz.mjs läuft — node features/F45/nachweise/f2b2c/render/erzeuge-nachweis.mjs [basis] [nurOrdner]
 * Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const basis = process.argv[2] ?? 'http://127.0.0.1:4395'
const nur = process.argv[3]
const ziel = dirname(fileURLToPath(import.meta.url))
const wurzel = resolve(ziel, '../../../../..')

/** GET als JSON. @param pfad - API-Pfad @returns JSON */
async function hole(pfad) {
  const antwort = await fetch(`${basis}${pfad}`)
  if (!antwort.ok) throw new Error(`${pfad}: HTTP ${antwort.status}`)
  return antwort.json()
}

const viewport = (breite) => ({ breite, hoehe: breite < 600 ? 844 : 900 })
const sprache = (code) => ({ 'leitstand-sprache': code })
const SHA = '3f2c9a1b7d4e5f60718293a4b5c6d7e8f9012345'
const ZUR_LIBRARY = [
  { label: 'Workforce geladen', warteAufSelector: { selector: '#werkstatt-reiter-faehigkeiten', timeoutMs: 15000 } },
  { label: 'Capability Library', klick: '#werkstatt-reiter-faehigkeiten' },
]

// ─── Sammlung: Detailzeile und Vormerken ───
const SAMMLUNG_BEOBACHTUNG = {
  texte: [
    { name: 'lang', selector: 'html', attribut: 'lang' },
    { name: 'Knopf Details', selector: '#sammlung [data-sm-detail-knopf]', attribut: 'aria-expanded' },
    { name: 'Vormerken-Zustand', selector: '#sammlung [data-sm-vormerken-fokus]' },
    { name: 'Grund (nicht vormerkbar)', selector: '#sammlung [data-sm-vormerken-grund]', attribut: 'data-sm-vormerken-grund' },
    { name: 'Fokus', selector: ':focus', attribut: 'class' },
  ],
  vorhanden: [
    { name: 'Detailzeile (colspan)', selector: '#sammlung tr.sm-detailzeile td[colspan="6"]' },
    { name: 'Vormerken', selector: '#sammlung [data-sm-vormerken]' },
    { name: 'Prüfbericht-Zeile', selector: '#sammlung .sm-detail [data-pruef-urteil]' },
  ],
  ueberlauf: true,
}
const ATTRAPPEN_VORMERKEN = [
  { muster: '**/api/auftraege', methode: 'POST', status: 201, json: { auftragId: 'render-vormerken' } },
  { muster: '**/api/auftraege/render-vormerken/routen', methode: 'POST', status: 200, json: { workflowId: 'router-render-vormerken' } },
]
const sammlungVormerken = (breite, code, extra = {}) => ({
  url: `${basis}/#/capabilities`,
  viewport: viewport(breite),
  localStorageSetzen: sprache(code),
  screenshotAusschnitt: { selector: '#sammlung .sm-liste', hoehe: 1400 },
  screenshotVollseite: true,
  beobachtete: SAMMLUNG_BEOBACHTUNG,
  anfragenAntworten: ATTRAPPEN_VORMERKEN,
  schritte: [
    ...ZUR_LIBRARY,
    { label: 'Unterreiter „Sammlung“', klick: '#faehigkeiten-reiter-sammlung', warteAufSelector: { selector: '#sammlung .sm-gruppe', timeoutMs: 15000 } },
    { label: 'Suche „planning“', tippen: { selector: '#sammlung-suche', text: 'planning' }, warteAufSelector: { selector: '#sammlung tr[data-sm-id="repos-planning-with-files"]', timeoutMs: 5000 }, screenshot: '01-zeile-zu.png' },
    { label: '„Details“ → volle Detailzeile mit Bericht und „Vormerken“', klick: '#sammlung [data-sm-detail-knopf="repos-planning-with-files"]', warteAufSelector: { selector: '#sammlung tr.sm-detailzeile [data-sm-vormerken]', timeoutMs: 5000 }, screenshot: '02-detail-vormerken.png' },
    { label: '„Vormerken“ (Auftrag + Routen als Attrappe)', klick: '#sammlung [data-sm-vormerken="repos-planning-with-files"]', warteAufSelector: { selector: '#sammlung [data-sm-vormerken-fokus] a[href^="#/workflows/"]', timeoutMs: 5000 }, screenshot: '03-vorgemerkt.png' },
    { label: 'Suche „gstack“, Details: Bericht über das ganze Repo → Grund', tippen: { selector: '#sammlung-suche', text: 'gstack' }, warteAufSelector: { selector: '#sammlung tr[data-sm-id="repos-gstack"]', timeoutMs: 5000 } },
    { label: 'Details gstack', klick: '#sammlung [data-sm-detail-knopf="repos-gstack"]', warteAufSelector: { selector: '#sammlung [data-sm-vormerken-grund="ganzes_repo"]', timeoutMs: 5000 }, screenshot: '04-grund-ganzes-repo.png' },
  ],
  ...extra,
})

/** Klickfolgen: Name → Konfiguration für scripts/render-nachweis.mjs. */
const FOLGEN = {}
FOLGEN['sammlung-vormerken-de-1440'] = sammlungVormerken(1440, 'de', { farbschema: 'dark' })
FOLGEN['sammlung-vormerken-de-1440-hell'] = sammlungVormerken(1440, 'de', { farbschema: 'light' })
FOLGEN['sammlung-vormerken-de-390'] = sammlungVormerken(390, 'de', { farbschema: 'dark' })
FOLGEN['sammlung-vormerken-en-1440'] = sammlungVormerken(1440, 'en', { farbschema: 'dark' })
FOLGEN['sammlung-vormerken-en-390-hell'] = sammlungVormerken(390, 'en', { farbschema: 'light' })
FOLGEN['sammlung-vormerken-ru-390'] = sammlungVormerken(390, 'ru', { farbschema: 'dark' })
FOLGEN['sammlung-vormerken-de-1440-zoom200'] = sammlungVormerken(1440, 'de', { farbschema: 'dark', zoom: 2 })
FOLGEN['sammlung-vormerken-de-1440-bewegung'] = sammlungVormerken(1440, 'de', { farbschema: 'dark', reduzierteBewegung: true })
// Korrekturrunde (design-guardian 6): Warnung bei übersprungenen Dateien (Antwort-Attrappe) und Fehler + „Erneut versuchen“.
const sammlungEcht = await hole('/api/sammlung')
const mitWarnung = { ...sammlungEcht, eintraege: sammlungEcht.eintraege.map((e) => (e.id === 'repos-planning-with-files' ? { ...e, pruefbericht_letzter: { ...e.pruefbericht_letzter, uebersprungen: 2 } } : e)) }
FOLGEN['sammlung-vormerken-fehler-warnung'] = {
  ...sammlungVormerken(1440, 'de', { farbschema: 'dark' }),
  anfragenAntworten: [
    { muster: '**/api/sammlung', status: 200, json: mitWarnung },
    { muster: '**/api/auftraege', methode: 'POST', status: 500, json: { grund: 'Render-Fixture: Ablage nicht schreibbar' } },
  ],
  schritte: [
    ...ZUR_LIBRARY,
    { label: 'Unterreiter „Sammlung“', klick: '#faehigkeiten-reiter-sammlung', warteAufSelector: { selector: '#sammlung .sm-gruppe', timeoutMs: 15000 } },
    { label: 'Suche „planning“', tippen: { selector: '#sammlung-suche', text: 'planning' }, warteAufSelector: { selector: '#sammlung tr[data-sm-id="repos-planning-with-files"]', timeoutMs: 5000 } },
    { label: 'Details: Warnung „2 Dateien übersprungen“', klick: '#sammlung [data-sm-detail-knopf="repos-planning-with-files"]', warteAufSelector: { selector: '#sammlung .sm-vormerken-warnung', timeoutMs: 5000 }, screenshot: '01-warnung.png' },
    { label: '„Vormerken“ → Fehler (500) mit „Erneut versuchen“ (primär)', klick: '#sammlung [data-sm-vormerken="repos-planning-with-files"]', warteAufSelector: { selector: '#sammlung .sm-vormerken .fehler', timeoutMs: 5000 }, screenshot: '02-fehler.png' },
  ],
}
FOLGEN['sammlung-tastatur'] = {
  ...sammlungVormerken(1440, 'de'),
  schritte: [
    ...ZUR_LIBRARY,
    { label: 'Unterreiter „Sammlung“', klick: '#faehigkeiten-reiter-sammlung', warteAufSelector: { selector: '#sammlung .sm-gruppe', timeoutMs: 15000 } },
    { label: 'Suche „planning“', tippen: { selector: '#sammlung-suche', text: 'planning' }, warteAufSelector: { selector: '#sammlung tr[data-sm-id="repos-planning-with-files"]', timeoutMs: 5000 } },
    { label: 'Fokus „Details“, Enter → offen, Fokus bleibt am Knopf', fokus: '#sammlung [data-sm-detail-knopf="repos-planning-with-files"]', taste: 'Enter', warteAufSelector: { selector: '#sammlung tr.sm-detailzeile', timeoutMs: 5000 }, screenshot: '01-enter-offen.png' },
    { label: 'Enter → zu', taste: 'Enter', warteAufSelector: { selector: '#sammlung tr.sm-detailzeile', zustand: 'detached', timeoutMs: 5000 }, screenshot: '02-enter-zu.png' },
  ],
}

// ─── Capability Library: „Eignung prüfen“ im Freigabedialog ───
const library = await hole('/api/ressourcen')
const mitInstallierbarem = { ...library, eintraege: library.eintraege.map((e) => (e.id === 'taste-skill' ? { ...e, installierbar: true, installationsGrund: null } : e)) }
const VORBEREITUNG_SKILL = { art: 'skill', id: 'taste-skill', name: 'taste-skill', repo: 'https://github.com/senlindesign/taste-skill.git', ref: 'HEAD', version: SHA, skillPfad: 'skills/taste', quellPfad: 'skills/taste', lizenz: 'MIT', kosten: 'kostenlos', zielordner: 'C:\\Users\\stefa\\.ai-workforce\\cap\\taste-skill', herkunftUrl: 'https://github.com/senlindesign/taste-skill', hinweis: 'Skripte im Skill werden nicht ausgeführt.', eintragHash: 'h'.repeat(64) }
const BERICHT = { artefakt_id: 'pruefbericht-taste-skill', version: 1, urteil: 'GEEIGNET', gepinnte_version: SHA, quelle: { art: 'git', repo: 'https://github.com/senlindesign/taste-skill.git', ref: 'HEAD', sha: SHA, pfad: 'skills/taste' }, erstellt_am: '2026-10-13T10:00:00.000Z', lauf_id: 'eignungspruefung-taste-skill-render', ergebnis: { urteil: 'GEEIGNET', typ: 'skill', gepinnte_version: SHA, befunde: [{ bereich: 'lizenz', schwere: 'info', beleg: 'LICENSE: MIT' }], auflagen: [], zusammenfassung: 'Render-Fixture: reine Anweisungsdatei ohne Skripte und Hooks.' }, fakten: { dateien: 2, bytes: 4096, uebersprungen: { je_grund: {}, liste: [] }, umbenannt: [], skripte: {}, paket: null, hooks: [], skill_dateien: ['SKILL.md'], agent_dateien: [] }, ausnahme_begruendung: null, urteil_sammlung: 'Pilot' }
const LIBRARY_BEOBACHTUNG = {
  texte: [
    { name: 'lang', selector: 'html', attribut: 'lang' },
    { name: 'Sperre', selector: '#library-detail [data-pruef-sperre]' },
    { name: 'Phase', selector: '#library-detail [data-pruef-phase]', attribut: 'data-pruef-phase' },
    { name: 'Bericht', selector: '#library-detail [data-pruef-bericht]', attribut: 'data-pruef-bericht' },
  ],
  vorhanden: [
    { name: 'Eignung prüfen', selector: '#library-detail [data-sm-auswaehlen="taste-skill"]' },
    { name: 'Installieren aktiv', selector: '#library-detail [data-installation-aktion="installieren"]' },
    { name: 'Eignung prüfen deaktiviert (Ablauf offen)', selector: '#library-detail [data-sm-auswaehlen="taste-skill"][disabled]' },
    { name: 'DOM-ids mit Präfix lib', selector: '#library-detail [id^="lib-"]' },
  ],
  ueberlauf: true,
}
const libraryEignung = (breite, code, extra = {}) => ({
  url: `${basis}/#/capabilities`,
  viewport: viewport(breite),
  localStorageSetzen: sprache(code),
  screenshotAusschnitt: { selector: '#library-detail', hoehe: 1600 },
  screenshotVollseite: true,
  beobachtete: LIBRARY_BEOBACHTUNG,
  anfragenAntworten: [
    { muster: '**/api/ressourcen', status: 200, json: mitInstallierbarem },
    { muster: '**/api/ressourcen/taste-skill/installation/vorbereiten', methode: 'POST', status: 200, json: { ...VORBEREITUNG_SKILL, pruefbericht: null, pruefbericht_sperre: 'ohne Prüfbericht zur angezeigten Version — erst die Eignung prüfen' } },
    { muster: '**/api/sammlung/pruefung/vorbereiten', methode: 'POST', status: 200, json: { subjekt: { name: 'taste-skill' }, typ: 'skill', quelle: BERICHT.quelle, urteil_sammlung: 'Pilot', urteil_bedeutung: 'Ausprobieren, bevor es Standard wird.', ausgeschlossen: false, letzter_bericht: null } },
    { muster: '**/api/sammlung/pruefung', methode: 'POST', status: 202, json: { laufId: 'eignungspruefung-taste-skill-render' } },
    { muster: '**/api/sammlung/pruefung/eignungspruefung-taste-skill-render', status: 200, json: { phase: 'fertig', lauf_id: 'eignungspruefung-taste-skill-render', bericht: BERICHT, bericht_kurz: BERICHT } },
  ],
  schritte: [
    ...ZUR_LIBRARY,
    { label: 'Suche „taste“', tippen: { selector: '#capabilities-suche', text: 'taste' }, warteAufSelector: { selector: '#capabilities-library [data-library-id="taste-skill"]', timeoutMs: 15000 } },
    { label: 'Katalog: taste-skill wählen', klick: '#capabilities-library [data-library-id="taste-skill"]', warteAufSelector: { selector: '#library-detail [data-installation-aktion="vorbereiten"]', timeoutMs: 15000 } },
    { label: '„Prüfen & freigeben“ → Sperre ohne Bericht mit „Eignung prüfen“', klick: '#library-detail [data-installation-aktion="vorbereiten"]', warteAufSelector: { selector: '#library-detail [data-sm-auswaehlen="taste-skill"]', timeoutMs: 5000 }, screenshot: '01-sperre-eignung-pruefen.png' },
    { label: '„Eignung prüfen“ → Bestätigung im Detail', klick: '#library-detail [data-sm-auswaehlen="taste-skill"]', warteAufSelector: { selector: '#library-detail [data-pruef-phase="bestaetigen"]', timeoutMs: 5000 }, screenshot: '02-bestaetigung.png' },
    {
      label: '„Prüfung starten“ → Prüflauf fertig → Dialog neu vorbereitet mit Bericht',
      klick: '#library-detail [data-sm-pruefung-start="taste-skill"]',
      anfragenAntworten: [{ muster: '**/api/ressourcen/taste-skill/installation/vorbereiten', methode: 'POST', status: 200, json: { ...VORBEREITUNG_SKILL, pruefbericht: BERICHT, pruefbericht_sperre: null } }],
      warteAufSelector: { selector: '#library-detail [data-installation-aktion="installieren"]', timeoutMs: 20000 },
      screenshot: '03-bericht-im-dialog.png',
    },
  ],
  ...extra,
})
FOLGEN['library-eignung-de-1440'] = libraryEignung(1440, 'de', { farbschema: 'dark' })
FOLGEN['library-eignung-de-1440-hell'] = libraryEignung(1440, 'de', { farbschema: 'light' })
FOLGEN['library-eignung-de-390'] = libraryEignung(390, 'de', { farbschema: 'dark' })
FOLGEN['library-eignung-en-1440'] = libraryEignung(1440, 'en', { farbschema: 'dark' })
FOLGEN['library-eignung-tr-1440'] = libraryEignung(1440, 'tr', { farbschema: 'dark' })
FOLGEN['library-eignung-de-1440-zoom200'] = libraryEignung(1440, 'de', { farbschema: 'dark', zoom: 2 })

// ─── F-1061 (1): Band nach dem Neustart ───
const band = (breite, code, extra = {}) => ({
  url: `${basis}/#/capabilities`,
  viewport: viewport(breite),
  localStorageSetzen: sprache(code),
  screenshotAusschnitt: { selector: '#faehigkeiten-bereich-projekt', hoehe: 700 },
  screenshotVollseite: true,
  beobachtete: { texte: [{ name: 'Band', selector: '[data-fp-band="fremd"]' }], vorhanden: [{ name: 'Knopf bestätigen', selector: '[data-fp-bestaetigen]' }], ueberlauf: true },
  schritte: [
    ...ZUR_LIBRARY,
    { label: 'Unterreiter „Dieses Projekt“', klick: '#faehigkeiten-reiter-projekt', warteAufSelector: { selector: '[data-fp-band="fremd"]', timeoutMs: 15000 }, screenshot: '01-band-neustart.png' },
  ],
  ...extra,
})
FOLGEN['faehigkeiten-band-neustart-de-1440'] = band(1440, 'de', { farbschema: 'dark' })
FOLGEN['faehigkeiten-band-neustart-en-390-hell'] = band(390, 'en', { farbschema: 'light' })
// Korrekturrunde (QA M3): erster Start nach dem Update — kein gespeicherter Stand (Antwort-Attrappe der Status-Route).
const faehigkeiten = await hole('/api/faehigkeiten')
const unbekannt = { ...faehigkeiten, lokale_datei: { ...faehigkeiten.lokale_datei, fremd_geaendert: { bekannt_seit: null, quelle: 'unbekannt', geaendert_am: faehigkeiten.lokale_datei.fremd_geaendert?.geaendert_am ?? null } } }
FOLGEN['faehigkeiten-band-unbekannt-de-1440'] = { ...band(1440, 'de', { farbschema: 'dark' }), anfragenAntworten: [{ muster: '**/api/faehigkeiten', status: 200, json: unbekannt }] }
FOLGEN['faehigkeiten-band-unbekannt-tr-390'] = { ...band(390, 'tr', { farbschema: 'light' }), anfragenAntworten: [{ muster: '**/api/faehigkeiten', status: 200, json: unbekannt }] }

for (const [name, folge] of Object.entries(FOLGEN)) {
  if (nur !== undefined && nur !== name) continue
  const ordner = join(ziel, name)
  mkdirSync(ordner, { recursive: true })
  const datei = join(ordner, 'klickfolge.json')
  writeFileSync(datei, `${JSON.stringify(folge, null, 2)}\n`)
  console.log(`\n=== ${name} ===`)
  execFileSync(process.execPath, [join(wurzel, 'scripts', 'render-nachweis.mjs'), datei, ordner], { stdio: 'inherit', cwd: wurzel })
}
