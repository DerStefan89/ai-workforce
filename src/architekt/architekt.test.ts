/**
 * Datei: src/architekt/architekt.test.ts
 *
 * Zweck: node:test-Fälle für validiereErgebnisArchitektur und
 * baueArchitektAuftragstext (F39 WS-1). Muster
 * src/product-coach/product-coach.test.ts.
 */

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  baueArchitektAuftragstext,
  baueStackEntscheidungsInstruktion,
  baueUmsetzungsInstruktion,
  istStackOffen,
  pruefeProjektmodusScope,
  traegtAdrVerweisAufEntscheidung,
  validiereErgebnisArchitektur,
} from './index.ts'

function ladeBeispiel(name: string): unknown {
  return JSON.parse(readFileSync(`schemas/examples/ergebnis-architektur.${name}.json`, 'utf-8'))
}

test('validiereErgebnisArchitektur: Wurzel muss ein Objekt sein', () => {
  assert.deepStrictEqual(validiereErgebnisArchitektur(null), ['Wurzel ist kein Objekt'])
  assert.deepStrictEqual(validiereErgebnisArchitektur('text'), ['Wurzel ist kein Objekt'])
  assert.deepStrictEqual(validiereErgebnisArchitektur([]), ['Wurzel ist kein Objekt'])
})

test('validiereErgebnisArchitektur: valid-feature.json ist gültig', () => {
  assert.deepStrictEqual(validiereErgebnisArchitektur(ladeBeispiel('valid-feature')), [])
})

test('validiereErgebnisArchitektur: valid-projekt.json ist gültig', () => {
  assert.deepStrictEqual(validiereErgebnisArchitektur(ladeBeispiel('valid-projekt')), [])
})

test('validiereErgebnisArchitektur: invalid-unbekannter-modus.json wird abgelehnt', () => {
  const verstoesse = validiereErgebnisArchitektur(ladeBeispiel('invalid-unbekannter-modus'))
  assert.ok(verstoesse.some((v) => v.includes("'modus' muss einer von")))
})

test('validiereErgebnisArchitektur: invalid-fehlendes-feld.json wird abgelehnt', () => {
  const verstoesse = validiereErgebnisArchitektur(ladeBeispiel('invalid-fehlendes-feld'))
  assert.ok(verstoesse.some((v) => v.includes("Pflichtfeld 'capabilities_bedarf' fehlt")))
})

test('validiereErgebnisArchitektur: invalid-modul-fehlendes-feld.json wird abgelehnt', () => {
  const verstoesse = validiereErgebnisArchitektur(ladeBeispiel('invalid-modul-fehlendes-feld'))
  assert.ok(verstoesse.some((v) => v.includes("'module[0].abhaengigkeiten' fehlt")))
})

test('validiereErgebnisArchitektur: invalid-leere-evidenz.json wird abgelehnt', () => {
  const verstoesse = validiereErgebnisArchitektur(ladeBeispiel('invalid-leere-evidenz'))
  assert.ok(verstoesse.some((v) => v.includes("'evidenz' muss mindestens einen Eintrag tragen")))
})

test('validiereErgebnisArchitektur: invalid-entscheidung-erfundene-empfehlung.json wird abgelehnt', () => {
  const verstoesse = validiereErgebnisArchitektur(ladeBeispiel('invalid-entscheidung-erfundene-empfehlung'))
  assert.ok(verstoesse.some((v) => v.includes("nennt keinen Titel aus")))
})

test('validiereErgebnisArchitektur: invalid-json-schema-kein-json.json wird abgelehnt (F-638/Regel 1c)', () => {
  const verstoesse = validiereErgebnisArchitektur(ladeBeispiel('invalid-json-schema-kein-json'))
  assert.ok(verstoesse.some((v) => v.includes("'schema_entwuerfe[0].json_schema' ist kein gültiges JSON")))
})

test('validiereErgebnisArchitektur: eine erfundene ressource_id ist nur mit übergebenen bekannteRessourcenIds ein Verstoß', () => {
  const daten = ladeBeispiel('projekt-ressource-erfunden')
  assert.deepStrictEqual(validiereErgebnisArchitektur(daten), [], 'ohne bekannteRessourcenIds bleibt die Prüfung aus')
  const verstoesseMitIds = validiereErgebnisArchitektur(daten, ['echte-ressource'])
  assert.ok(verstoesseMitIds.some((v) => v.includes('ist im Capability-Auszug nicht vorhanden')))
})

test('validiereErgebnisArchitektur: unbekanntes Top-Level-Feld wird abgelehnt', () => {
  const daten = { ...(ladeBeispiel('valid-feature') as Record<string, unknown>), fremdfeld: 'x' }
  const verstoesse = validiereErgebnisArchitektur(daten)
  assert.ok(verstoesse.some((v) => v.includes("unbekanntes Feld 'fremdfeld'")))
})

const AUSZUG_MARKER = /Verfügbare Ressourcen \(Capability-Auszug\):/

test('baueArchitektAuftragstext: Modus feature nennt "modus": "feature" und den Planungstext', () => {
  const text = baueArchitektAuftragstext('Baue ein neues Modul X.', 'feature')
  assert.match(text, /"modus":\s*"feature"/)
  assert.match(text, /Baue ein neues Modul X\./)
  assert.doesNotMatch(text, AUSZUG_MARKER)
})

test('baueArchitektAuftragstext: Modus projekt nennt "modus": "projekt" und trägt den Capability-Auszug, wenn gesetzt', () => {
  const text = baueArchitektAuftragstext('Architektur-Grundlage für das neue Vorhaben.', 'projekt', '- res-1 (skill): CODE_WRITE — freigabe=FREIGEGEBEN, verfuegbar=true')
  assert.match(text, /"modus":\s*"projekt"/)
  assert.match(text, AUSZUG_MARKER)
  assert.match(text, /res-1/)
})

test('baueArchitektAuftragstext: Modus projekt ohne Capability-Auszug lässt den Abschnitt weg', () => {
  const text = baueArchitektAuftragstext('Architektur-Grundlage.', 'projekt', null)
  assert.doesNotMatch(text, AUSZUG_MARKER)
})

test('baueArchitektAuftragstext: Default-Modus ist feature', () => {
  const mitDefault = baueArchitektAuftragstext('x')
  const explizit = baueArchitektAuftragstext('x', 'feature')
  assert.strictEqual(mitDefault, explizit)
})

// F42 WS-2 (löst F-685): istStackOffen + stackOffen-Kopplung in validiereErgebnisArchitektur.

test('istStackOffen: fehlende CLAUDE.md liefert true', () => {
  const verzeichnis = mkdtempSync(join(tmpdir(), 'f42-stackoffen-fehlend-'))
  assert.strictEqual(istStackOffen(verzeichnis), true)
})

test('istStackOffen: Füllungs-Marker liefert true', () => {
  const verzeichnis = mkdtempSync(join(tmpdir(), 'f42-stackoffen-marker-'))
  writeFileSync(join(verzeichnis, 'CLAUDE.md'), '## 🏗️ Technischer Stack [FÜLLUNG]\n')
  assert.strictEqual(istStackOffen(verzeichnis), true)
})

test('istStackOffen: gefüllte Stack-Zeile (ohne Marker) liefert false', () => {
  const verzeichnis = mkdtempSync(join(tmpdir(), 'f42-stackoffen-gefuellt-'))
  writeFileSync(join(verzeichnis, 'CLAUDE.md'), '## 🏗️ Technischer Stack\n\nTypeScript auf Node.\n')
  assert.strictEqual(istStackOffen(verzeichnis), false)
})

test('istStackOffen: dieses Repo (ai-workforce, Stack bereits gefüllt) liefert false', () => {
  assert.strictEqual(istStackOffen(process.cwd()), false)
})

test('validiereErgebnisArchitektur: stackOffen:true ohne kategorie:"stack" wird abgelehnt (F-685)', () => {
  const daten = {
    ...(ladeBeispiel('valid-projekt') as Record<string, unknown>),
    entscheidungen_mensch: [{ frage: 'f', optionen: [{ titel: 'A', vorteile: [], nachteile: [] }], auswirkung_bestand: 'keine', empfehlung: 'A', begruendung: 'x', kategorie: 'fachlich' }],
  }
  const verstoesse = validiereErgebnisArchitektur(daten, undefined, true)
  assert.ok(verstoesse.some((v) => v.includes('Stack offen, aber keine Entscheidung mit kategorie stack vorgelegt (F-685)')))
})

test('validiereErgebnisArchitektur: stackOffen:true MIT kategorie:"stack" ist gültig', () => {
  const daten = {
    ...(ladeBeispiel('valid-projekt') as Record<string, unknown>),
    entscheidungen_mensch: [{ frage: 'f', optionen: [{ titel: 'A', vorteile: [], nachteile: [] }], auswirkung_bestand: 'keine', empfehlung: 'A', begruendung: 'x', kategorie: 'stack' }],
  }
  assert.deepStrictEqual(validiereErgebnisArchitektur(daten, undefined, true), [])
})

test('validiereErgebnisArchitektur: eine bestehende Entscheidung ganz ohne "kategorie"-Feld bleibt gültig (Rückwärtskompatibilität)', () => {
  assert.deepStrictEqual(validiereErgebnisArchitektur(ladeBeispiel('valid-feature')), [])
})

test('validiereErgebnisArchitektur: ein unbekannter "kategorie"-Wert wird abgelehnt', () => {
  const daten = {
    ...(ladeBeispiel('valid-projekt') as Record<string, unknown>),
    entscheidungen_mensch: [{ frage: 'f', optionen: [{ titel: 'A', vorteile: [], nachteile: [] }], auswirkung_bestand: 'keine', empfehlung: 'A', begruendung: 'x', kategorie: 'erfunden' }],
  }
  const verstoesse = validiereErgebnisArchitektur(daten)
  assert.ok(verstoesse.some((v) => v.includes("'entscheidungen_mensch[0].kategorie' muss 'null' oder einer von")))
})

test('baueArchitektAuftragstext: stackOffen:true hängt den Stack-Hinweis an, Default (false) nicht', () => {
  const mitStackOffen = baueArchitektAuftragstext('x', 'feature', null, true)
  const ohneStackOffen = baueArchitektAuftragstext('x', 'feature', null, false)
  assert.match(mitStackOffen, /NICHT selbst fest/)
  assert.doesNotMatch(ohneStackOffen, /NICHT selbst fest/)
  assert.doesNotMatch(baueArchitektAuftragstext('x'), /NICHT selbst fest/)
})

// ─── F42 WS-4 (löst F-712/F-714) ─────────────────────────────────────────────

test('baueUmsetzungsInstruktion: Default (kein Argument, Feature-Modus) bleibt bitgenau die bisherige Instruktion', () => {
  const zeilen = baueUmsetzungsInstruktion()
  assert.ok(zeilen.some((z) => z.includes('docs/adr/TEMPLATE.md')))
  assert.ok(zeilen.some((z) => z.includes('schemas/examples/')))
  assert.ok(!zeilen.some((z) => z.includes('Scope des ursprünglichen Auftrags')))
})

test("baueUmsetzungsInstruktion: modus 'feature' explizit ist bitgenau dasselbe wie das Default", () => {
  assert.deepStrictEqual(baueUmsetzungsInstruktion('feature'), baueUmsetzungsInstruktion())
})

test("baueUmsetzungsInstruktion: modus 'projekt' verlangt Scope-Vorrang statt Schema-/ADR-Bauauftrag (F-712)", () => {
  const zeilen = baueUmsetzungsInstruktion('projekt')
  const text = zeilen.join('\n')
  assert.match(text, /Scope des ursprünglichen Auftrags.*Vorrang/)
  assert.match(text, /kein Produktcode, keine Schemas.*keine Skripte/)
  assert.ok(!text.includes('docs/adr/TEMPLATE.md'))
})

test('baueStackEntscheidungsInstruktion: verlangt CLAUDE.md-Füllung und ein ADR mit Verweis auf das Entscheidungsartefakt (F-714)', () => {
  const zeilen = baueStackEntscheidungsInstruktion('workflow-entscheidung-gate-123')
  const text = zeilen.join('\n')
  assert.match(text, /CLAUDE\.md/)
  assert.match(text, /\[FÜLLUNG\]/)
  assert.match(text, /docs\/adr\//)
  assert.match(text, /workflow-entscheidung-gate-123/)
  // F-735: die Instruktion nennt das Startvorlagenfeld mit einem Nicht-Node-Beispiel.
  assert.match(text, /pruefketten_pfade/)
  assert.match(text, /pyproject\.toml/)
})

test('pruefeProjektmodusScope: docs/**, features/** und CLAUDE.md sind erlaubt', () => {
  assert.deepStrictEqual(pruefeProjektmodusScope(['docs/x.md', 'docs/adr/0001-x.md', 'features/F1/feature.md', 'CLAUDE.md']), [])
})

test('pruefeProjektmodusScope: alles außerhalb der Allowlist wird gemeldet', () => {
  const pfade = ['schemas/x.schema.json', 'scripts/check-x.mjs', 'package.json', 'src/foo.ts']
  assert.deepStrictEqual(pruefeProjektmodusScope(pfade), pfade)
})

test('pruefeProjektmodusScope: eine gemischte Liste meldet nur die Verstöße', () => {
  assert.deepStrictEqual(pruefeProjektmodusScope(['docs/x.md', 'schemas/y.json']), ['schemas/y.json'])
})

test('pruefeProjektmodusScope: ein leeres Array bleibt ein leeres Array', () => {
  assert.deepStrictEqual(pruefeProjektmodusScope([]), [])
})

test('traegtAdrVerweisAufEntscheidung: fehlender docs/adr/-Ordner liefert false', () => {
  const verzeichnis = mkdtempSync(join(tmpdir(), 'f42-adr-fehlend-'))
  assert.strictEqual(traegtAdrVerweisAufEntscheidung(verzeichnis, 'workflow-entscheidung-x'), false)
})

test('traegtAdrVerweisAufEntscheidung: leerer docs/adr/-Ordner liefert false', () => {
  const verzeichnis = mkdtempSync(join(tmpdir(), 'f42-adr-leer-'))
  mkdirSync(join(verzeichnis, 'docs', 'adr'), { recursive: true })
  assert.strictEqual(traegtAdrVerweisAufEntscheidung(verzeichnis, 'workflow-entscheidung-x'), false)
})

test('traegtAdrVerweisAufEntscheidung: TEMPLATE.md wird nicht als Treffer gezählt, selbst wenn sie die Id enthält', () => {
  const verzeichnis = mkdtempSync(join(tmpdir(), 'f42-adr-template-'))
  mkdirSync(join(verzeichnis, 'docs', 'adr'), { recursive: true })
  writeFileSync(join(verzeichnis, 'docs', 'adr', 'TEMPLATE.md'), 'workflow-entscheidung-x')
  assert.strictEqual(traegtAdrVerweisAufEntscheidung(verzeichnis, 'workflow-entscheidung-x'), false)
})

test('traegtAdrVerweisAufEntscheidung: ein ADR ohne Verweis auf die Entscheidung liefert false', () => {
  const verzeichnis = mkdtempSync(join(tmpdir(), 'f42-adr-ohneverweis-'))
  mkdirSync(join(verzeichnis, 'docs', 'adr'), { recursive: true })
  writeFileSync(join(verzeichnis, 'docs', 'adr', '0001-stack.md'), '# ADR 0001\n\nirgendein anderer Text.\n')
  assert.strictEqual(traegtAdrVerweisAufEntscheidung(verzeichnis, 'workflow-entscheidung-x'), false)
})

test('traegtAdrVerweisAufEntscheidung: ein ADR mit Verweis auf die Entscheidung liefert true', () => {
  const verzeichnis = mkdtempSync(join(tmpdir(), 'f42-adr-mitverweis-'))
  mkdirSync(join(verzeichnis, 'docs', 'adr'), { recursive: true })
  writeFileSync(join(verzeichnis, 'docs', 'adr', '0001-stack.md'), '# ADR 0001\n\nEntscheidung: workflow-entscheidung-x\n')
  assert.strictEqual(traegtAdrVerweisAufEntscheidung(verzeichnis, 'workflow-entscheidung-x'), true)
})
