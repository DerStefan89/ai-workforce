/**
 * Datei: public/leitstand/harness-abgleich-anzeige.test.mjs
 *
 * Zweck: F45 B1b-2 (Beleg 12, F-937) — Anzeige des Harness-Abgleichs: Zählzeile „Harness: x wirksam · y ersetzt ·
 * z bewusst nicht · n offen“ (ohne Beleg nur, wenn vorhanden), offen-Zeilen rot und mit Grund, statischer Beleg mit
 * Quelle, Prüfschritt mit Ergebnis und Lauf, Ersatz mit Lage, Bestanden-Marke nur mit Laufbelegen, geänderte
 * Harness-Dateien, Kurzliste der Fähigkeiten (mit/ohne Beobachtung), Lade-/Fehlerzustand, Escaping von Serverwerten,
 * und die Texte in en (eine weitere Sprache).
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderFaehigkeitenKurzliste, renderHarnessAbgleich, renderHarnessAbgleichZustand, renderHarnessImLauf, zaehlZeileText } from './harness-abgleich-anzeige.js'
import { initialisiereSprache } from './i18n.js'

/**
 * Stellt die Sprache für einen Test ein (Muster i18n.test.mjs: Speicher und html als Attrappe).
 * @param code - de/en/tr/ru
 */
function setzeSprache(code) {
  globalThis.document = { documentElement: {} }
  Object.defineProperty(globalThis, 'localStorage', { value: { getItem: () => code }, configurable: true, writable: true })
  initialisiereSprache()
  delete globalThis.document
  delete globalThis.localStorage
}

const zeile = (teil) => ({ art: 'agent', name: 'x', quelle: '.claude/agents/x.md', detail: null, ereignis: null, matcher: null, status: 'bewusst_nicht', beleg: null, ersatz: null, begruendung: null, aufrufe: null, offen_grund: null, grund: null, ...teil })

const DATEN = {
  zaehlung: { wirksam: 2, wirksam_ohne_beleg: 0, ersetzt_durch: 1, bewusst_nicht: 1, offen: 1 },
  bestanden: false,
  geaenderte_harness_dateien: ['CLAUDE.md'],
  eintraege: [
    zeile({ name: 'unbekannter-agent', status: 'offen', offen_grund: 'nicht_in_zuordnung' }),
    zeile({ art: 'dod', name: 'dod-d5021306', quelle: 'CLAUDE.md', detail: '`npm run check` → Exit 0', status: 'wirksam', beleg: { art: 'pruefschritt', statisch: false, im_lauf: true, quelle: null, lauf_id: 'lauf-1', ergebnis: 'GRUEN', skript_sha256: null, matcher: null } }),
    zeile({ art: 'hook', name: 'commit-guard', quelle: '.claude/hooks/commit-guard.cjs', ereignis: 'PreToolUse', matcher: 'Bash|PowerShell', status: 'wirksam', beleg: { art: 'statisch', statisch: true, im_lauf: null, quelle: 'features/F45/nachweise/b1b2/zaehlung-hooks.json', lauf_id: null, ergebnis: null, skript_sha256: 'a'.repeat(64), matcher: 'Bash|PowerShell' } }),
    zeile({ name: 'code-reviewer', status: 'ersetzt_durch', ersatz: { rolle: 'code-reviewer', lage: 'gelaufen', schritt_id: 's2', lauf_id: 'lauf-2' }, aufrufe: 0 }),
    zeile({ name: 'qa', status: 'bewusst_nicht', begruendung: 'B2b <F-1031>', aufrufe: 2 }),
  ],
}

test('Zählzeile: vier Zahlen, „ohne Beleg“ nur, wenn vorhanden', () => {
  setzeSprache('de')
  assert.equal(zaehlZeileText(DATEN), 'Harness: 2 wirksam · 1 ersetzt · 1 bewusst nicht · 1 offen')
  assert.equal(zaehlZeileText({ zaehlung: { ...DATEN.zaehlung, wirksam_ohne_beleg: 3 } }), 'Harness: 2 wirksam · 1 ersetzt · 1 bewusst nicht · 1 offen · 3 ohne Beleg')
  assert.equal(zaehlZeileText(null), 'Harness: 0 wirksam · 0 ersetzt · 0 bewusst nicht · 0 offen')
})

test('Tabelle: offen rot mit Grund, statischer Beleg mit Quelle, Prüfschritt mit Ergebnis und Lauf, Ersatz mit Lage', () => {
  setzeSprache('de')
  const html = renderHarnessAbgleich(DATEN)
  assert.match(html, /<div class="note red">1 Eintrag ist offen/)
  assert.match(html, /<tr data-status="offen"><td data-spalte="Art">Agent<\/td><td class="harness-abgleich-eintrag" data-spalte="Eintrag"><code>unbekannter-agent<\/code><\/td><td data-spalte="Status"><span class="ablauf-status fehler">offen<\/span><\/td><td data-spalte="Beleg, Ersatz oder Begründung"><strong>nicht in der Zuordnung<\/strong><\/td><\/tr>/)
  assert.match(html, /statischer Nachweis · <code>features\/F45\/nachweise\/b1b2\/zaehlung-hooks\.json<\/code>/)
  assert.match(html, /Prüfschritt · Ergebnis GRUEN · Lauf <code>lauf-1<\/code>/)
  assert.match(html, /Schritt <code>code-reviewer<\/code> · gelaufen · Lauf <code>lauf-2<\/code>/)
  assert.match(html, /<span class="ablauf-status fehler">Beleg 12 nicht erfüllt<\/span>/)
  assert.match(html, /Der Lauf hat Harness-Dateien geändert: <code>CLAUDE\.md<\/code>/)
  assert.match(html, /im Lauf 2-mal aufgerufen/)
  assert.match(html, /B2b &lt;F-1031&gt;/, 'Begründung escaped')
  assert.match(html, /PreToolUse · Bash\|PowerShell/)
  assert.match(html, /<details class="harness-abgleich-details">/)
  assert.match(renderHarnessAbgleich(DATEN, { offen: true }), /<details class="harness-abgleich-details" open>/)
})

test('ohne Laufbelege: keine Bestanden-Marke, Quelle „laut Zuordnung“; leer und null', () => {
  setzeSprache('de')
  const html = renderHarnessAbgleich({ ...DATEN, bestanden: null, geaenderte_harness_dateien: null }, { quelle: 'zuordnung' })
  assert.doesNotMatch(html, /Beleg 12/)
  assert.doesNotMatch(html, /laut Zuordnung|<span class="subtle"><\/span>/, 'Quelle steht auf der Seite Workforce schon in der Einleitung')
  assert.doesNotMatch(html, /Harness-Dateien geändert/)
  assert.match(renderHarnessAbgleich({ zaehlung: DATEN.zaehlung, eintraege: [] }), /Kein Harness-Eintrag gefunden/)
  assert.match(renderHarnessAbgleich(null), /Kein Harness-Abgleich vorhanden/)
})

test('Hook mit abweichendem Hash: „ohne Beleg“ gelb mit Grund', () => {
  setzeSprache('de')
  const html = renderHarnessAbgleich({ zaehlung: { wirksam: 0, wirksam_ohne_beleg: 1, ersetzt_durch: 0, bewusst_nicht: 0, offen: 0 }, bestanden: false, eintraege: [zeile({ art: 'hook', name: 'guard-settings', status: 'wirksam_ohne_beleg', beleg: { art: 'statisch', statisch: true, im_lauf: null, quelle: 'n.md', lauf_id: null, ergebnis: null, skript_sha256: 'a'.repeat(64), matcher: 'Edit|Write' }, grund: 'Hook weicht vom Nachweis ab: Skript-Hash …' })] })
  assert.match(html, /<span class="ablauf-status warten">ohne Beleg<\/span>/)
  assert.match(html, /Hook weicht vom Nachweis ab/)
  assert.match(html, /<div class="note amber">1 Eintrag ist ohne Beleg/)
})

test('negativer Prüfbeleg: Grund nicht doppelt; im Lauf/Abnahme bei Auffälligem aufgeklappt', () => {
  setzeSprache('de')
  const rot = zeile({ art: 'dod', name: 'dod-d5021306', detail: 'npm', status: 'offen', offen_grund: 'beleg_negativ', grund: 'Prüfergebnis ROT', beleg: { art: 'pruefschritt', statisch: false, im_lauf: false, quelle: null, lauf_id: 'l', ergebnis: 'ROT', skript_sha256: null, matcher: null } })
  const html = renderHarnessImLauf({ status: 'ok', quelle: 'artefakt', daten: { zaehlung: { wirksam: 0, wirksam_ohne_beleg: 0, ersetzt_durch: 0, bewusst_nicht: 0, offen: 1 }, bestanden: false, eintraege: [rot], faehigkeiten: null } })
  assert.match(html, /Ergebnis ROT/)
  assert.doesNotMatch(html, /Prüfergebnis ROT/)
  assert.match(html, /<details class="harness-abgleich-details" open>/)
})

test('Kurzliste: Namen mit Anzahl, keine, nicht erfasst, ohne Beobachtung', () => {
  setzeSprache('de')
  const html = renderFaehigkeitenKurzliste({ lauf_id: 'lauf-1', skills: [{ name: 'ponytail', anzahl: 2 }], subagenten: [], mcp_server: [{ name: 'playwright', anzahl: 1 }], hintergrund: null })
  assert.match(html, /<code>ponytail<\/code> ×2/)
  assert.match(html, /<dt>Subagenten<\/dt><dd><span class="subtle">keine<\/span><\/dd>/)
  assert.match(html, /<code>playwright<\/code><\/dd>/)
  assert.match(html, /nicht erfasst/)
  assert.match(renderFaehigkeitenKurzliste(null), /Keine Beobachtung des Ausführungslaufs/)
})

test('Block „Harness im Lauf“: lädt, Fehler, Antwort (live gekennzeichnet)', () => {
  setzeSprache('de')
  assert.match(renderHarnessImLauf(undefined), /Harness-Abgleich lädt/)
  assert.match(renderHarnessImLauf({ fehler: '500 kaputt' }), /<div class="note red">Harness-Abgleich nicht ladbar: 500 kaputt/)
  const html = renderHarnessImLauf({ status: 'ok', quelle: 'live', daten: { ...DATEN, faehigkeiten: null } })
  assert.match(html, /<h3>Harness im Lauf<\/h3>/)
  assert.match(html, /live berechnet/)
  assert.match(html, /Keine Beobachtung/)
  assert.match(renderHarnessAbgleichZustand('laedt'), /lädt/)
})

test('en: Zählzeile und Status übersetzt', () => {
  setzeSprache('en')
  try {
    assert.equal(zaehlZeileText(DATEN), 'Harness: 2 effective · 1 replaced · 1 deliberately not · 1 open')
    assert.match(renderHarnessAbgleich(DATEN), /not in the mapping/)
  } finally {
    setzeSprache('de')
  }
})
