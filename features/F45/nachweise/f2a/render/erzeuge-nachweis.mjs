/**
 * Datei: features/F45/nachweise/f2a/render/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 F-2a (F-1012 Oberfläche, F-1054, F-1055 (1), Beleg 13; Muster
 * features/F45/nachweise/b1b2/render/erzeuge-nachweis.mjs) gegen die laufende Testinstanz aus
 * features/F45/nachweise/f2a/beleg13.mjs (Port 4391, echtes Wegwerf-Projekt nach L1/L2):
 * - workforce-mit-eintraegen-<sprache>-<breite>: Seite Workforce, Unterreiter „Dieses Projekt“, echte Antwort von
 *   GET /api/faehigkeiten (MCP, Katalog-Skill, Projekt-Agents/-Skills, „Im letzten Lauf“ aus dem echten Lauf);
 * - workforce-leer: Antwort ohne Einträge (anfragenAntworten);
 * - workforce-ungueltig: lokale Datei ungültig (rotes Band, Schalter gesperrt);
 * - workforce-lauf-aktiv: lauf_aktiv → Schalter gesperrt mit Grund;
 * - workforce-abweichend: Projekt-Agent mit abweichendem Inhalt → „Freigeben nach Inhalt“ geöffnet (Pfad, Hash) und
 *   ein POST …/freigabe mit 409 → „Inhalt hat sich geändert, neu laden“;
 * - workforce-fremd: Band „Außerhalb des Leitstands geändert“ (F-1055 (1));
 * - lauf-detail-l1 / lauf-detail-l2: Lauf-Detail, Bereich „Fähigkeiten“ → „Fähigkeiten im Lauf“ der beiden echten Läufe;
 * - abnahme-l1: Abnahme des L1-Ablaufs mit Kurzzeile „Fähigkeiten im Lauf“;
 * - Varianten für die Design-Prüfung: ru-390, en-1440, hell, zoom 200 %.
 * Liest ablauf.json (Lauf-IDs) aus dem Ordner darüber; schreibt nur in eigene Unterordner.
 *
 * Wird aufgerufen von: Hand, während beleg13.mjs den Server offen hält —
 *   node features/F45/nachweise/f2a/render/erzeuge-nachweis.mjs [basis] [nurOrdner]
 * Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const basis = process.argv[2] ?? 'http://127.0.0.1:4391'
const nur = process.argv[3]
const ziel = dirname(fileURLToPath(import.meta.url))
const wurzel = resolve(ziel, '../../../../..')
const ablauf = JSON.parse(readFileSync(join(ziel, '..', 'ablauf.json'), 'utf8'))
const zaehlungL1 = JSON.parse(readFileSync(join(ziel, '..', 'zaehlung-l1-alle-an.json'), 'utf8'))

/** GET als JSON. @param pfad - API-Pfad @returns JSON */
async function hole(pfad) {
  const antwort = await fetch(`${basis}${pfad}`)
  if (!antwort.ok) throw new Error(`${pfad}: HTTP ${antwort.status}`)
  return antwort.json()
}

const echt = await hole('/api/faehigkeiten')
const H = 'b'.repeat(64)
const abweichend = {
  ...echt,
  eintraege: echt.eintraege.map((e) => (e.id === 'agent:qa' ? { ...e, freigabe: 'abweichend', hash: H, eingeschaltet: true, aktiv: false, grund: `Inhalt weicht von der Freigabe ab (Datei ${H.slice(0, 12)}…, Katalog ${String(e.katalog_hash ?? '').slice(0, 12)}…)` } : e)),
}
const ungueltig = { ...echt, lokale_datei: { zustand: 'ungueltig', pfad: echt.lokale_datei.pfad, grund: `'${echt.lokale_datei.pfad}' ist kein gültiges JSON (Unexpected token } in JSON at position 41) — Läufe mit Fähigkeiten starten in allen Projekten nicht, bis die Datei repariert oder gelöscht ist (E-F45-7)`, fremd_geaendert: null } }
const laufAktiv = { ...echt, lauf_aktiv: { aktiv: true, grund: `ein Lauf ('f45-f2a-beleg13-l3-${'0'.repeat(8)}') ist aktiv — Fähigkeiten ändern erst nach seinem Ende (E-F45-8)` } }
const fremd = { ...echt, lokale_datei: { ...echt.lokale_datei, fremd_geaendert: { bekannt_seit: '2026-10-12T09:41:00.000Z', quelle: 'route', geaendert_am: '2026-10-12T09:52:00.000Z' } } }
const leer = { ...echt, letzter_lauf_id: null, eintraege: [] }

const viewport = (breite) => ({ breite, hoehe: breite < 600 ? 844 : 900 })
const sprache = (code) => ({ 'leitstand-sprache': code })
const BEOBACHTUNG = {
  texte: [
    { name: 'lang', selector: 'html', attribut: 'lang' },
    { name: 'Band', selector: '#faehigkeiten-projekt .fp-band' },
    { name: 'Meldung', selector: '#faehigkeiten-projekt .fp-meldung' },
    { name: 'erste Gruppe', selector: '#faehigkeiten-projekt .fp-gruppe h3' },
    { name: 'qa-Zeile', selector: '#faehigkeiten-projekt tr[data-fp-id="agent:qa"]' },
  ],
  vorhanden: [
    { name: 'Schalter gesperrt', selector: '#faehigkeiten-projekt .fp-schalter:disabled' },
    { name: 'Freigabe-Block', selector: '#faehigkeiten-projekt .fp-freigabe' },
  ],
  ueberlauf: true,
}
const OEFFNE_REITER = [
  { label: 'Workforce geladen', warteAufSelector: { selector: '#werkstatt-reiter-faehigkeiten', timeoutMs: 15000 } },
  { label: 'Capability Library', klick: '#werkstatt-reiter-faehigkeiten' },
]

/** Klickfolgen: Name → Konfiguration für scripts/render-nachweis.mjs. */
const FOLGEN = {}
const workforce = (antwort, schritte, extra = {}) => ({
  url: `${basis}/#/capabilities`,
  viewport: viewport(1440),
  localStorageSetzen: sprache('de'),
  screenshotAusschnitt: { selector: '#faehigkeiten-bereich-projekt' },
  screenshotVollseite: true,
  beobachtete: BEOBACHTUNG,
  ...(antwort !== null ? { anfragenAntworten: [{ muster: '**/api/faehigkeiten', status: 200, json: antwort }] } : {}),
  schritte: [...OEFFNE_REITER, ...schritte],
  ...extra,
})
const projektReiter = (screenshot, warte = '#faehigkeiten-projekt .fp-bereich') => ({ label: 'Unterreiter „Dieses Projekt“', klick: '#faehigkeiten-reiter-projekt', warteAufSelector: { selector: warte, timeoutMs: 15000 }, screenshot })

for (const [name, code, breite] of [
  ['workforce-mit-eintraegen-de-1440', 'de', 1440],
  ['workforce-mit-eintraegen-de-390', 'de', 390],
  ['workforce-mit-eintraegen-ru-390', 'ru', 390],
  ['workforce-mit-eintraegen-en-1440', 'en', 1440],
]) {
  FOLGEN[name] = workforce(null, [projektReiter('01-dieses-projekt.png', '#faehigkeiten-projekt .fp-gruppe')], { viewport: viewport(breite), localStorageSetzen: sprache(code) })
}
FOLGEN['workforce-mit-eintraegen-de-1440-hell'] = { ...FOLGEN['workforce-mit-eintraegen-de-1440'], farbschema: 'light' }
FOLGEN['workforce-mit-eintraegen-de-1440-zoom200'] = { ...FOLGEN['workforce-mit-eintraegen-de-1440'], zoom: 2 }
FOLGEN['workforce-leer'] = workforce(leer, [projektReiter('01-leer.png', '#faehigkeiten-projekt .fp-leer')])
FOLGEN['workforce-ungueltig'] = workforce(ungueltig, [projektReiter('01-ungueltig.png', '#faehigkeiten-projekt [data-fp-band="ungueltig"]')])
FOLGEN['workforce-lauf-aktiv'] = workforce(laufAktiv, [projektReiter('01-lauf-aktiv.png', '#faehigkeiten-projekt [data-fp-band="lauf"]')])
// F-1061 (3): Band „Datei geprüft – Stand übernehmen“ — Knopf, Antwort 409 (Datei erneut geändert), Knopf gesperrt im Lauf.
FOLGEN['workforce-fremd'] = workforce(fremd, [
  projektReiter('01-stand-bestaetigen.png', '#faehigkeiten-projekt [data-fp-bestaetigen]'),
  {
    label: 'Bestätigt, Server antwortet 409 (Datei erneut geändert)',
    anfragenAntworten: [{ muster: '**/api/faehigkeiten/bestaetigung', methode: 'POST', status: 409, json: { grund: `'${echt.lokale_datei.pfad}' hat sich seit der Anzeige erneut geändert — neu laden und prüfen, nichts bestätigt` } }],
    klick: '#faehigkeiten-projekt [data-fp-bestaetigen]',
    warteAufSelector: { selector: '#faehigkeiten-projekt .fp-meldung', timeoutMs: 5000 },
    screenshot: '02-409.png',
  },
])
FOLGEN['workforce-fremd-lauf-aktiv'] = workforce({ ...fremd, lauf_aktiv: laufAktiv.lauf_aktiv }, [projektReiter('01-knopf-gesperrt.png', '#faehigkeiten-projekt [data-fp-bestaetigen][disabled]')])
FOLGEN['workforce-abweichend'] = workforce(abweichend, [
  projektReiter('01-abweichend.png', '#faehigkeiten-projekt [data-fp-freigabe-oeffnen="agent:qa"]'),
  { label: '„Freigeben nach Inhalt“ geöffnet', klick: '#faehigkeiten-projekt [data-fp-freigabe-oeffnen="agent:qa"]', warteAufSelector: { selector: '#faehigkeiten-projekt .fp-freigabe', timeoutMs: 5000 }, screenshot: '02-freigabe-offen.png' },
  {
    label: 'Bestätigt, Server antwortet 409 (Inhalt geändert)',
    anfragenAntworten: [{ muster: '**/api/faehigkeiten/freigabe', methode: 'POST', status: 409, json: { grund: `Inhalt von 'agent:qa' hat sich seit der Anzeige geändert (jetzt ${'c'.repeat(12)}…) — nichts freigegeben, neu laden` } }],
    klick: '#faehigkeiten-projekt [data-fp-freigabe-bestaetigen="agent:qa"]',
    warteAufSelector: { selector: '#faehigkeiten-projekt .fp-meldung', timeoutMs: 5000 },
    screenshot: '03-409.png',
  },
])
for (const [name, laufId] of [
  ['lauf-detail-l1', ablauf.laeufe.l1],
  ['lauf-detail-l2', ablauf.laeufe.l2],
]) {
  FOLGEN[name] = {
    url: `${basis}/#/runs/${laufId}`,
    viewport: viewport(1440),
    localStorageSetzen: sprache('de'),
    screenshotAusschnitt: { selector: '#lauf-faehigkeiten' },
    screenshotVollseite: true,
    beobachtete: { texte: [{ name: 'Zusammenfassung', selector: '.faehigkeiten-im-lauf-zeile' }, { name: 'Fremd', selector: '.faehigkeiten-im-lauf-fremd' }], ueberlauf: true },
    schritte: [
      { label: 'Lauf-Detail geladen', warteAufSelector: { selector: '#lauf-faehigkeiten', timeoutMs: 15000 } },
      { label: 'Fähigkeiten aufgeklappt', klick: '#lauf-faehigkeiten summary', warteAufSelector: { selector: '.faehigkeiten-im-lauf', timeoutMs: 15000 }, screenshot: '01-faehigkeiten-im-lauf.png' },
    ],
  }
}
FOLGEN['lauf-detail-l1-ru-390'] = { ...FOLGEN['lauf-detail-l1'], viewport: viewport(390), localStorageSetzen: sprache('ru') }
// design-guardian 8: Lauf-Detail auch hell und mit 200 % Zoom; Ladefehler des Bereichs „Dieses Projekt“.
FOLGEN['lauf-detail-l1-hell'] = { ...FOLGEN['lauf-detail-l1'], farbschema: 'light' }
FOLGEN['lauf-detail-l1-zoom200'] = { ...FOLGEN['lauf-detail-l1'], zoom: 2 }
FOLGEN['workforce-ladefehler'] = {
  ...workforce(null, [projektReiter('01-ladefehler.png', '#faehigkeiten-projekt [data-fp-band="ladefehler"]')]),
  anfragenAntworten: [{ muster: '**/api/faehigkeiten', status: 500, json: { grund: 'ressourcen.json ungültig: Fixture für den Render-Nachweis' } }],
}
FOLGEN['abnahme-l1'] = {
  url: `${basis}/#/workflows/${zaehlungL1.workflow_id}`,
  viewport: viewport(1440),
  localStorageSetzen: sprache('de'),
  screenshotAusschnitt: { selector: '.harness-kurzliste' },
  screenshotVollseite: true,
  beobachtete: { texte: [{ name: 'Kurzliste', selector: '.harness-kurzliste' }], ueberlauf: true },
  schritte: [{ label: 'Abnahme mit Kurzzeile „Fähigkeiten im Lauf“', warteAufSelector: { selector: '.harness-kurzliste', timeoutMs: 20000 }, screenshot: '01-kurzliste.png' }],
}

for (const [name, folge] of Object.entries(FOLGEN)) {
  if (nur !== undefined && nur !== name) continue
  const ordner = join(ziel, name)
  mkdirSync(ordner, { recursive: true })
  const datei = join(ordner, 'klickfolge.json')
  writeFileSync(datei, `${JSON.stringify(folge, null, 2)}\n`)
  console.log(`\n=== ${name} ===`)
  execFileSync(process.execPath, [join(wurzel, 'scripts', 'render-nachweis.mjs'), datei, ordner], { stdio: 'inherit', cwd: wurzel })
}
