/**
 * Datei: public/leitstand/faehigkeit-vorschlag-anzeige.test.mjs
 *
 * Zweck: Tests der Karte „Vorgeschlagene Fähigkeiten“ (F45 FB-2, features/F45/plan-fb2-v2.md): nur mit Feld; Typ, Name,
 * Beschreibung, Hash-Präfix, Grund (escaped); „Übernehmen“ nur, wenn erlaubt (je Bedingung); Verwerfen zweistufig; nicht
 * adressierbar ⇒ kein Knopf; Zwischenstand während des eigenen Laufs; Hinweis „ungesichert“ dauerhaft in jeder Lage, auch ohne
 * Vorschläge, „nicht bestimmbar“; Kennung; Erfolgstexte; Umfangs-Satz; Einbau je Lage (renderAbnahme).
 *
 * Wird aufgerufen von: npm run test (node --test)
 *
 * Wichtig: ohne DOM; Texte der Standardsprache (de).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  abnahmeLaesstUebernehmenZu,
  faehigkeitVorschlagKennung,
  renderFaehigkeitVorschlaege,
  trenneVorschlagDateien,
  uebernehmenHindernis,
  vorschlagErfolg,
  vorschlagSchluessel,
} from './faehigkeit-vorschlag-anzeige.js'
import { renderAbnahme, renderUmfangHinweis } from './views/workflow-abnahme.js'
import { renderFreigabeSeite } from './views/workflow-entscheiden.js'

const H = 'abcdef0123456789'.repeat(4)
const AENDERUNG = { status: 'ok', laufId: 'l-bau', daten: { basis_ref: 'abc', gekuerzt: false, dateien: [] } }

/** Vorschlag mit Vorgaben. @param felder - Überschreibungen @returns Vorschlag */
const vorschlag = (felder = {}) => ({
  typ: 'skill',
  name: 'pruefen',
  pfad: 'vorschlaege/faehigkeiten/skills/pruefen',
  beschreibung: 'Prüft die Dinge.',
  hash: H,
  grund: null,
  ziel: '.claude/skills/pruefen/',
  ziel_existiert: false,
  ziel_ignoriert: false,
  adressierbar: true,
  ...felder,
})

/** Abnahme mit Vorgaben (Lage „entscheidbar“). @param felder - Überschreibungen @returns Projektion */
const abnahme = (felder = {}) => ({
  workflowStatus: 'ABGESCHLOSSEN',
  freigabeHalt: null,
  entscheidung: { status: 'nicht_vorhanden' },
  urteil: { status: 'noch_nicht_gelaufen' },
  aenderungsuebersicht: AENDERUNG,
  pruefergebnis: { status: 'noch_nicht_gelaufen' },
  faehigkeitVorschlaege: [vorschlag()],
  ...felder,
})

const knoepfe = (html) => [...html.matchAll(/data-aktion="([^"]+)"/g)].map((m) => m[1])

test('ohne beide Felder keine Karte; mit Vorschlag Typ, Name, Ziel, Beschreibung, Hash-Präfix und beide Knöpfe', () => {
  assert.equal(renderFaehigkeitVorschlaege('wf', abnahme({ faehigkeitVorschlaege: undefined })), '')
  assert.equal(renderFaehigkeitVorschlaege('wf', abnahme({ faehigkeitVorschlaege: [] })), '')
  const html = renderFaehigkeitVorschlaege('wf', abnahme(), { ebene: 2 })
  assert.match(html, /<h2 id="abnahme-faehigkeiten-titel">Vorgeschlagene Fähigkeiten<\/h2>/)
  assert.match(html, /<span class="ablauf-marke">Skill<\/span> <strong><code>pruefen<\/code><\/strong>/)
  assert.match(html, /Ziel: <code>\.claude\/skills\/pruefen\/<\/code>/)
  assert.match(html, /<p>Prüft die Dinge\.<\/p>/)
  assert.match(html, /Inhalt <code>abcdef012345<\/code>/)
  assert.doesNotMatch(html.replace(/data-hash="[^"]*"/g, ''), new RegExp(H), 'sichtbar nur das Präfix (der volle Hash steht in data-hash für den Körper)')
  assert.deepEqual(knoepfe(html), ['uebernehmen', 'verwerfen'])
  assert.match(html, /data-workflow-id="wf" data-typ="skill" data-name="pruefen" data-hash="abcdef/)
})

test('XSS: Name, Beschreibung, Grund und Pfad erscheinen nur escaped', () => {
  const boese = '<img src=x onerror=alert(1)>'
  const html = renderFaehigkeitVorschlaege('wf"><x', abnahme({ faehigkeitVorschlaege: [vorschlag({ name: boese, beschreibung: boese, grund: boese }), vorschlag({ typ: null, name: null, pfad: boese, adressierbar: false, hash: null, grund: boese })] }))
  assert.doesNotMatch(html, /<img/)
  assert.doesNotMatch(html, /<x/)
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/)
})

test('Übernehmen nur, wenn erlaubt — je Bedingung ein Grund statt des Knopfs', () => {
  const faelle = [
    [{ grund: 'Name ungültig' }, {}, 'grund'],
    [{ ziel_existiert: true }, {}, 'zielExistiert'],
    [{ ziel_existiert: null }, {}, 'zielExistiert'],
    [{ ziel_ignoriert: true }, {}, 'zielIgnoriert'],
    [{ ziel_ignoriert: null }, {}, 'zielIgnoriertUnbekannt'],
    [{ adressierbar: false }, {}, 'adressierbar'],
    [{}, { workflowStatus: 'KLAERUNG_ERFORDERLICH' }, 'lage'],
    [{}, { aenderungsuebersicht: { status: 'noch_nicht_gelaufen' } }, 'lage'],
    [{}, { entscheidung: { status: 'ok', ergebnis: 'ABGELEHNT' } }, 'lage'],
    [{}, { entscheidung: { status: 'ok', ergebnis: 'ANGENOMMEN' } }, null],
    [{}, { entscheidung: { status: 'veraltet', ergebnis: 'ABGELEHNT' } }, null],
    [{}, {}, null],
  ]
  for (const [v, a, erwartet] of faelle) {
    const ab = abnahme({ ...a, faehigkeitVorschlaege: [vorschlag(v)] })
    assert.equal(uebernehmenHindernis(ab, vorschlag(v)), erwartet, JSON.stringify([v, a]))
    const html = renderFaehigkeitVorschlaege('wf', ab)
    assert.equal(knoepfe(html).includes('uebernehmen'), erwartet === null, JSON.stringify([v, a]))
  }
  assert.equal(abnahmeLaesstUebernehmenZu(abnahme({ workflowStatus: 'LAEUFT' })), false)
})

test('nicht adressierbar ⇒ kein Knopf, Pfad zum Entfernen von Hand; Grund amber', () => {
  const html = renderFaehigkeitVorschlaege('wf', abnahme({ faehigkeitVorschlaege: [vorschlag({ typ: null, name: null, hash: null, adressierbar: false, grund: 'Frontmatter fehlt' })] }))
  assert.deepEqual(knoepfe(html), [])
  assert.match(html, /von Hand entfernen: <code>vorschlaege\/faehigkeiten\/skills\/pruefen<\/code>/)
  assert.match(html, /<span class="ablauf-status warten">Ungültig<\/span> Frontmatter fehlt/)
})

test('Verwerfen zweistufig: Stufe nur für genau diesen Vorschlag (Hash eingeschlossen)', () => {
  const a = abnahme({ faehigkeitVorschlaege: [vorschlag(), vorschlag({ name: 'zweiter' })] })
  const offen = vorschlagSchluessel('wf', vorschlag())
  const html = renderFaehigkeitVorschlaege('wf', a, { verwerfenOffen: offen })
  assert.deepEqual(knoepfe(html), ['verwerfen-bestaetigt', 'abbrechen', 'uebernehmen', 'verwerfen'])
  assert.match(html, /Wirklich verwerfen\?/)
  assert.match(html, /Löscht den Vorschlag im Arbeitsordner unwiderruflich\./)
  const neuerHash = renderFaehigkeitVorschlaege('wf', abnahme({ faehigkeitVorschlaege: [vorschlag({ hash: 'f'.repeat(64) })] }), { verwerfenOffen: offen })
  assert.deepEqual(knoepfe(neuerHash), ['uebernehmen', 'verwerfen'], 'ein anderer Hash hebt die Stufe auf')
})

test('Zwischenstand während des eigenen Laufs: Hinweis, keine Knöpfe', () => {
  const html = renderFaehigkeitVorschlaege('wf', abnahme({ workflowStatus: 'LAEUFT' }))
  assert.match(html, /Zwischenstand — der Lauf schreibt noch/)
  assert.deepEqual(knoepfe(html), [])
})

test('Hinweis „ungesichert“: auch ohne Vorschläge, mit Pfaden und Rest; Satz zur Freigabe nur bei skills/agents; nicht bestimmbar grau', () => {
  const nurUngesichert = abnahme({ faehigkeitVorschlaege: undefined, faehigkeitUngesichert: { status: 'ok', pfade: ['.claude/skills/neu/SKILL.md'], anzahl: 3 } })
  const html = renderFaehigkeitVorschlaege('wf', nurUngesichert)
  assert.match(html, /Ungesicherte Änderungen unter \.claude\//)
  assert.match(html, /<li><code>\.claude\/skills\/neu\/SKILL\.md<\/code><\/li>/)
  assert.match(html, /… und 2 weitere Dateien/)
  assert.match(html, /nach Sichern\/Merge unter Fähigkeiten einschalten/)
  assert.match(html, /Keine offenen Vorschläge\./)
  const nurSettings = renderFaehigkeitVorschlaege('wf', abnahme({ faehigkeitVorschlaege: undefined, faehigkeitUngesichert: { status: 'ok', pfade: ['.claude/settings.json'], anzahl: 1 } }))
  assert.doesNotMatch(nurSettings, /unter Fähigkeiten einschalten/)
  const unbestimmt = renderFaehigkeitVorschlaege('wf', abnahme({ faehigkeitVorschlaege: undefined, faehigkeitUngesichert: { status: 'nicht_bestimmbar', grund: 'zeitgrenze' } }))
  assert.match(unbestimmt, /<p class="subtle abnahme-faehigkeit-ungesichert">Stand von \.claude\/ nicht bestimmbar/)
  assert.equal(renderFaehigkeitVorschlaege('wf', abnahme({ faehigkeitVorschlaege: undefined, faehigkeitUngesichert: { status: 'ok', pfade: [] } })), '')
})

test('Einbau je Lage: entscheidbar in der Seite (h2), vorab/offen/entschieden unten (h3) — der Hinweis steht in jeder Lage', () => {
  const ungesichert = { status: 'ok', pfade: ['.claude/agents/x.md'], anzahl: 1 }
  const lagen = [
    ['entscheidbar', {}, 'oben', 'h2'],
    ['vorab', { workflowStatus: 'KLAERUNG_ERFORDERLICH' }, 'unten', 'h3'],
    ['offen', { workflowStatus: 'LAEUFT' }, 'unten', 'h3'],
    ['entschieden', { entscheidung: { status: 'ok', ergebnis: 'ANGENOMMEN', begruendung: 'gut', entschiedenAm: '2026-10-23T10:00:00Z' } }, 'unten', 'h3'],
  ]
  for (const [lage, felder, ort, h] of lagen) {
    const r = renderAbnahme('wf', abnahme({ ...felder, faehigkeitUngesichert: ungesichert }))
    assert.equal(r.lage, lage)
    assert.match(r[ort], new RegExp(`<${h} id="abnahme-faehigkeiten-titel">`), lage)
    assert.match(r[ort], /Ungesicherte Änderungen unter \.claude\//, lage)
  }
  assert.doesNotMatch(renderAbnahme('wf', abnahme({ faehigkeitVorschlaege: undefined })).oben, /abnahme-faehigkeiten/)
})

test('Kennung ändert sich mit Vorschlag, Stand von .claude/ und Lauf', () => {
  const basis = faehigkeitVorschlagKennung(abnahme())
  assert.notEqual(faehigkeitVorschlagKennung(abnahme({ faehigkeitVorschlaege: [vorschlag({ hash: 'f'.repeat(64) })] })), basis)
  assert.notEqual(faehigkeitVorschlagKennung(abnahme({ faehigkeitUngesichert: { status: 'ok', pfade: ['.claude/x'], anzahl: 1 } })), basis)
  assert.notEqual(faehigkeitVorschlagKennung(abnahme({ workflowStatus: 'LAEUFT' })), basis)
  assert.equal(faehigkeitVorschlagKennung(abnahme()), basis)
})

test('Erfolgstexte: übernommen mit Statussatz, Review veraltet nur bei offener Abnahme, Vorschlag geblieben als Hinweis; verworfen', () => {
  assert.equal(vorschlagErfolg('uebernehmen', { name: 'pruefen' }, false), '„pruefen“ übernommen, freigegeben nach Inhalt, noch nicht eingeschaltet — nach Sichern/Merge unter Fähigkeiten einschalten.')
  assert.match(vorschlagErfolg('uebernehmen', { name: 'p' }, true), /Das Review gilt danach als veraltet\.$/)
  const teil = vorschlagErfolg('uebernehmen', { name: 'p', vorschlag_geblieben: 'x' }, false)
  assert.equal(teil.art, 'hinweis')
  assert.match(teil.text, /Der Vorschlag blieb liegen — verwerfen\.$/)
  assert.equal(vorschlagErfolg('verwerfen', { name: 'p' }, true), 'Vorschlag „p“ verworfen.')
})

test('Umfang: Vorschlagsordner als ein Satz statt in der amber Liste — Dateien und Ordner-Einträge (cr 1); nur sie ⇒ keine amber Notiz', () => {
  assert.deepEqual(trenneVorschlagDateien(['src/a.ts', 'vorschlaege/faehigkeiten/agents/x.md']), { uebrige: ['src/a.ts'], vorschlaege: 1 })
  assert.deepEqual(trenneVorschlagDateien(['vorschlaege/', 'vorschlaege/faehigkeiten/', 'vorschlaegex/a', 'src/vorschlaege/']), { uebrige: ['vorschlaegex/a', 'src/vorschlaege/'], vorschlaege: 2 })
  const gemischt = renderUmfangHinweis({ status: 'ok', ausserhalb: ['src/a.ts', 'vorschlaege/faehigkeiten/agents/x.md', 'vorschlaege/faehigkeiten/skills/s/SKILL.md'], bereiche: ['docs/'] })
  assert.match(gemischt, /note amber/)
  assert.doesNotMatch(gemischt, /<code>vorschlaege\//)
  assert.match(gemischt, /Der Vorschlagsordner \(vorschlaege\/faehigkeiten\/\) liegt gewollt außerhalb der Bereiche/)
  const ordner = renderUmfangHinweis({ status: 'ok', ausserhalb: ['vorschlaege/'], bereiche: ['docs/'] })
  assert.doesNotMatch(ordner, /note amber/, 'ganz ungetrackter Ordner (?? vorschlaege/) ist kein Verstoß')
  assert.match(ordner, /Der Vorschlagsordner/)
})

test('Hauptknopf: auf der Seite „entscheidbar“ (ebene 2) ist „Übernehmen“ kein primary, sonst schon (design-guardian 1)', () => {
  assert.doesNotMatch(renderFaehigkeitVorschlaege('wf', abnahme(), { ebene: 2 }), /button primary/)
  assert.match(renderFaehigkeitVorschlaege('wf', abnahme({ entscheidung: { status: 'ok', ergebnis: 'ANGENOMMEN' } }), { ebene: 3 }), /button primary wf-faehigkeit-vorschlag" data-aktion="uebernehmen"/)
})

test('Stufe „Wirklich verwerfen?“: Warnung per aria-describedby am bestätigenden Knopf (qa 5)', () => {
  const html = renderFaehigkeitVorschlaege('wf', abnahme(), { verwerfenOffen: vorschlagSchluessel('wf', vorschlag()) })
  assert.match(html, /<p id="abnahme-faehigkeit-verwerfen-text">/)
  assert.match(html, /data-aktion="verwerfen-bestaetigt"[^>]*aria-describedby="abnahme-faehigkeit-verwerfen-text"/)
})

test('Freigabe-Seite zeigt den Hinweis „ungesichert“ (qa 1) — ohne Feld nichts', () => {
  const detail = { daten: { status: 'WARTET_FREIGABE', ziel: 'z', schritte: [] }, naechster: { art: 'haltFreigabe', schrittId: 's', grund: 'g' }, empfehlung: null }
  assert.match(renderFreigabeSeite({ ...detail, faehigkeitUngesichert: { status: 'ok', pfade: ['.claude/skills/neu/SKILL.md'], anzahl: 1 } }), /Ungesicherte Änderungen unter \.claude\/[\s\S]*\.claude\/skills\/neu\/SKILL\.md/)
  assert.match(renderFreigabeSeite({ ...detail, faehigkeitUngesichert: { status: 'nicht_bestimmbar', grund: 'x' } }), /Stand von \.claude\/ nicht bestimmbar/)
  assert.doesNotMatch(renderFreigabeSeite(detail), /abnahme-faehigkeit-ungesichert/)
})

test('Ausweg je Lage (F-1173 N1): Freigabe-Seite „von Hand committen“ ohne „Bereit zum Sichern“, abgeschlossene Abnahme mit', () => {
  const detail = { daten: { status: 'WARTET_FREIGABE', ziel: 'z', schritte: [] }, naechster: { art: 'haltFreigabe', schrittId: 's', grund: 'g' }, empfehlung: null }
  const ungesichert = { status: 'ok', pfade: ['.claude/skills/neu/SKILL.md'], anzahl: 1 }
  const freigabe = renderFreigabeSeite({ ...detail, faehigkeitUngesichert: ungesichert })
  assert.match(freigabe, /von Hand committen/)
  assert.doesNotMatch(freigabe, /Bereit zum Sichern/)
  const fertig = renderFaehigkeitVorschlaege('wf', abnahme({ faehigkeitUngesichert: ungesichert }))
  assert.match(fertig, /„Bereit zum Sichern“/)
  assert.doesNotMatch(fertig, /von Hand committen/)
  const vorab = renderFaehigkeitVorschlaege('wf', abnahme({ workflowStatus: 'KLAERUNG_ERFORDERLICH', faehigkeitUngesichert: ungesichert }))
  assert.match(vorab, /von Hand committen/)
  assert.doesNotMatch(vorab, /Bereit zum Sichern/)
})
