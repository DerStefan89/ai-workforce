/**
 * Datei: public/leitstand/sammlung-anzeige.test.mjs
 *
 * Zweck: Tests der Anzeigeregeln der Sammlung (F45 F-2b-1): Filter (Suche, Urteil, Stand), Gruppen nach Art, Link nur
 * https, Auswählen (kommt / Grund / Ausnahme), Detail mit Zuordnung und Prüfbericht, Escaping fremder Werte, alle
 * dynamischen i18n-Schlüssel vorhanden (das i18n-Gate prüft nur literale), Scout-Karte mit Sammlungsangabe — gegen die
 * echte Antwort der Bausteine (baueSammlungAnsicht über die Datei dieses Repos).
 *
 * Wird aufgerufen von: npm run test (node --test).
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { baueSammlungAnsicht } from '../../src/sammlung/index.ts'
import { WOERTERBUECHER } from './i18n.js'
import { auswahlHtml, detailHtml, filtereSammlung, gruppiereNachArt, linkHtml, renderSammlungKopf, renderSammlungListe, renderSammlungZustand, STAENDE, scoutSammlungHtml, standChip, urteilChip } from './sammlung-anzeige.js'

const WURZEL = join(import.meta.dirname, '..', '..')
const ANTWORT = (() => {
  const a = baueSammlungAnsicht({
    text: readFileSync(join(WURZEL, 'docs', 'harness', 'kandidaten-2026-09-15.md'), 'utf8'),
    stackText: readFileSync(join(WURZEL, 'docs', 'harness', 'stack-kandidaten.md'), 'utf8'),
    katalog: JSON.parse(readFileSync(join(WURZEL, 'ressourcen.json'), 'utf8')).ressourcen,
    katalogStatus: new Map(),
  })
  return { ...a, quelle: { ...a.quelle, pfad: 'docs/harness/kandidaten-2026-09-15.md' } }
})()
const BOESE = '<img src=x onerror=alert(1)>'

test('filtereSammlung: Suche über Name/Kurzbeschreibung/Lizenz (ohne Groß-/Klein und Akzente), Urteil, Stand', () => {
  assert.equal(filtereSammlung(ANTWORT.eintraege).length, 176)
  assert.ok(filtereSammlung(ANTWORT.eintraege, { suche: 'PLAYWRIGHT' }).some((e) => e.name === 'Playwright'))
  assert.ok(filtereSammlung(ANTWORT.eintraege, { urteil: 'Nur Ausnahme' }).every((e) => e.urteil === 'Nur Ausnahme'))
  assert.equal(filtereSammlung(ANTWORT.eintraege, { urteil: 'Nur Ausnahme' }).length, 9)
  assert.ok(filtereSammlung(ANTWORT.eintraege, { stand: 'vorgemerkt' }).length > 0)
  assert.equal(filtereSammlung(ANTWORT.eintraege, { suche: 'zzz-gibt-es-nicht' }).length, 0)
  assert.deepEqual(filtereSammlung([null, 1, 'x']), [])
})

test('gruppiereNachArt: Reihenfolge der Datei, nur nicht-leere Gruppen', () => {
  assert.deepEqual(
    gruppiereNachArt(ANTWORT.eintraege).map((g) => [g.art, g.eintraege.length]),
    [
      ['UI', 16],
      ['Repos', 137],
      ['Plugins', 11],
      ['Skills', 4],
      ['Tools', 2],
      ['MCP', 6],
    ]
  )
})

test('linkHtml: nur https mit noopener; sonst „Link fehlt“; Werte escaped', () => {
  assert.match(linkHtml({ name: 'A', link: 'https://github.com/a/b' }), /href="https:\/\/github\.com\/a\/b" target="_blank" rel="noopener noreferrer"/)
  assert.match(linkHtml({ name: 'A', link: 'javascript:alert(1)' }), /Link fehlt/)
  assert.match(linkHtml({ name: 'A', link: null }), /Link fehlt/)
  assert.doesNotMatch(linkHtml({ name: BOESE, link: 'https://x.example' }), /<img/)
})

test('auswahlHtml: auswählbar → Knopf „Auswählen“ (F-2b-2a wirksam); mit Bericht „Erneut prüfen“; laufender Ablauf ersetzt den Knopf; ausgeschlossen → Pflicht-Begründung; nicht auswählbar → Grund', () => {
  const ja = auswahlHtml({ id: 'repos-x', name: 'X', auswaehlbar: true, ausgeschlossen: false, typ: 'unbestimmt' })
  assert.doesNotMatch(ja, /aria-disabled/)
  assert.match(ja, /data-sm-auswaehlen="repos-x"/)
  assert.match(ja, /data-sm-typ-offen="true"/)
  assert.match(ja, />Auswählen</)
  assert.match(auswahlHtml({ id: 'y', auswaehlbar: true, pruefbericht_letzter: { urteil: 'GEEIGNET', gepinnte_version: '1', erstellt_am: '2026-10-12' } }), /Erneut prüfen/)
  assert.match(auswahlHtml({ id: 'z', auswaehlbar: true }, { phase: 'laedt' }), /data-pruef-phase="laedt"/)
  assert.match(auswahlHtml({ id: 'x', auswaehlbar: true, ausgeschlossen: true }), /Begründung „Ausnahme“/)
  assert.match(auswahlHtml({ auswaehlbar: false, nicht_auswaehlbar_grund: 'bibliothek', typ_quelle: 'stack-liste' }), /wählt der Architekt/)
  assert.match(auswahlHtml({ auswaehlbar: false, nicht_auswaehlbar_grund: 'plugin', typ_quelle: 'abschnitt' }), /Typ nur aus dem Abschnitt/)
  assert.match(auswahlHtml({ auswaehlbar: false, nicht_auswaehlbar_grund: 'ohne_link' }), /Link fehlt/)
})

test('detailHtml: Bewertung, Bedeutung des Urteils, Zuordnung, Typ mit Quelle, Prüfbericht; ausgeschlossen mit Grund; escaped', () => {
  const playwright = ANTWORT.eintraege.find((e) => e.zuordnung.katalog_id === 'playwright-mcp')
  const html = detailHtml(playwright, ANTWORT.urteil_bedeutung)
  assert.match(html, /Im Katalog als <code>playwright-mcp<\/code> \(über den Link\)/)
  assert.match(html, /ohne Prüfbericht \(vor F-2b freigegeben\)/)
  assert.match(html, /MCP <span class="subtle">\(aus dem Katalog\)<\/span>/)
  assert.match(html, /<strong>Aufnehmen:<\/strong> Priorisierter Kandidat/)
  const vayne = ANTWORT.eintraege.find((e) => e.name === 'Vayne')
  const vayneHtml = detailHtml(vayne, ANTWORT.urteil_bedeutung)
  assert.match(vayneHtml, /Ausgeschlossen durch den Auswahlfilter:/)
  // design-guardian 2: Bedeutung nur im Band, Bewertung nur einmal.
  assert.equal(vayneHtml.split('Außerhalb der Standardauswahl').length - 1, 1)
  assert.equal(vayneHtml.split(vayne.bewertung.slice(0, 30)).length - 1, 1)
  // QA 9: ein einziger Kandidat heißt „ein anderer Sammlungseintrag trifft denselben Katalogeintrag“.
  assert.match(detailHtml({ ...playwright, zuordnung: { status: 'mehrdeutig', kandidaten: ['x'], stufe: 'link' } }, {}), /ein anderer Sammlungseintrag trifft denselben Katalogeintrag <code>x<\/code>/)
  const boese = detailHtml({ ...playwright, bewertung: BOESE, name: BOESE }, {})
  assert.doesNotMatch(boese, /<img/)
  assert.match(detailHtml(playwright, {}, true), /<details class="sm-detail" data-sm-detail="[^"]+" open>/)
})

test('Chips: Urteil (ausgeschlossen rot), Stand übersetzt, benutzt mit Aufrufen', () => {
  assert.match(urteilChip({ urteil: 'Nur Ausnahme', ausgeschlossen: true }), /ablauf-status fehler/)
  assert.match(urteilChip({ urteil: 'Aufnehmen', ausgeschlossen: false }), /class="ablauf-status">Aufnehmen/)
  assert.match(standChip({ stand: 'nur_sammlung' }), /nur Sammlung/)
  assert.match(standChip({ stand: 'benutzt', aufrufe: 2 }), /2 Aufrufe im letzten Lauf/)
})

test('renderSammlungKopf/Liste: Kennzahlen, Selbstprüfungs-Band, Chips mit aria-pressed, Treffer, leer', () => {
  const kopf = renderSammlungKopf(ANTWORT, { urteil: 'Pilot' })
  assert.match(kopf, /<strong>176<\/strong> Einträge · <strong>172<\/strong> mit Link/)
  assert.match(kopf, /data-sm-filter="urteil" data-sm-wert="Pilot" aria-pressed="true"/)
  assert.doesNotMatch(kopf, /data-sm-band="selbstpruefung"/)
  assert.match(renderSammlungKopf({ ...ANTWORT, selbstpruefung: ['Selbstprüfung: x'] }), /data-sm-band="selbstpruefung"/)
  const liste = renderSammlungListe(ANTWORT, { urteil: 'Pilot' })
  assert.match(liste, /17 von 176 Einträgen gezeigt/)
  // design-guardian 1 und 6: keine zweite Live-Region; Plural nach gesamt.
  assert.doesNotMatch(liste, /role="status"/)
  assert.match(renderSammlungListe(ANTWORT, { suche: 'scraper' }), /1 von 176 Einträgen gezeigt/)
  // design-guardian 7: sichtbare Titel vor den Chip-Reihen; Code-Review 3: Band bei Fehler des Katalog-Status.
  assert.match(kopf, /<span class="subtle sm-chip-titel" id="sm-titel-urteil">Urteil<\/span><div class="library-chips" role="group" aria-labelledby="sm-titel-urteil">/)
  assert.match(renderSammlungKopf({ ...ANTWORT, stand_fehler: 'kaputt' }), /data-sm-band="stand-fehler">.*kaputt/)
  assert.match(liste, /<table class="sm-tabelle">/)
  assert.match(renderSammlungListe(ANTWORT, { suche: 'zzz' }), /Keine Einträge für diese Suche und Filter/)
  assert.match(renderSammlungListe({ eintraege: [] }), /Die Sammlung enthält keine Einträge/)
  assert.match(renderSammlungZustand('fehler', BOESE), /Sammlung nicht ladbar: &lt;img/)
})

test('alle dynamischen i18n-Schlüssel der Sammlung gibt es in de/en/ru/tr', () => {
  const dynamisch = [
    ...STAENDE.map((s) => `sammlung.stand.${s}`),
    ...['skill', 'mcp', 'agent', 'plugin', 'bibliothek', 'lokal', 'unbestimmt'].map((s) => `sammlung.typ.${s}`),
    ...['katalog', 'stack-liste', 'abschnitt', 'unbestimmt'].map((s) => `sammlung.typQuelle.${s}`),
    ...['alias', 'ohne_link', 'lokal', 'bibliothek', 'plugin', 'keine_quelle', 'freigegeben', 'mcp_ohne_paket'].map((s) => `sammlung.grund.${s}`),
    ...['ohne_vor_f2b', 'lokal', 'keiner', 'vorhanden'].map((s) => `sammlung.pruefbericht.${s}`),
    ...['UI', 'Repos', 'Plugins', 'Skills', 'Tools', 'MCP'].map((s) => `sammlung.art.${s}`),
    ...['name', 'urteil', 'lizenz', 'kosten', 'stand', 'link'].map((s) => `sammlung.spalte.${s}`),
    'sammlung.zuordnung.zugeordnet.link',
    'sammlung.zuordnung.zugeordnet.name',
  ]
  for (const sprache of ['de', 'en', 'ru', 'tr']) for (const k of dynamisch) assert.ok(Object.hasOwn(WOERTERBUECHER[sprache], k), `${sprache}: ${k}`)
  // Jeder Stand/Typ/Grund der echten Antwort ist abgedeckt.
  for (const e of ANTWORT.eintraege) {
    assert.ok(dynamisch.includes(`sammlung.stand.${e.stand}`))
    assert.ok(dynamisch.includes(`sammlung.typ.${e.typ}`))
    if (e.nicht_auswaehlbar_grund !== null) assert.ok(dynamisch.includes(`sammlung.grund.${e.nicht_auswaehlbar_grund}`))
  }
})

test('scoutSammlungHtml: Urteil laut Sammlung, Abweichung, Web; ohne Feld leer', () => {
  assert.match(scoutSammlungHtml({}, { treffer: { urteil: 'Aufnehmen' }, abweichung: false }), /Laut Sammlung \(aktueller Stand\):<\/span> <span class="ablauf-status">Aufnehmen<\/span>/)
  assert.match(scoutSammlungHtml({}, { treffer: { urteil: 'Nur Ausnahme' }, abweichung: false }), /ablauf-status fehler">Nur Ausnahme/)
  assert.match(scoutSammlungHtml({}, { treffer: { urteil: 'Aufnehmen' }, abweichung: true }), /weicht von der Sammlung ab/)
  assert.match(scoutSammlungHtml({ quelle: 'web' }, { treffer: null, abweichung: false }), /aus dem Web/)
  assert.equal(scoutSammlungHtml({}, undefined), '')
  assert.doesNotMatch(scoutSammlungHtml({}, { treffer: { urteil: BOESE }, abweichung: false }), /<img/)
})
