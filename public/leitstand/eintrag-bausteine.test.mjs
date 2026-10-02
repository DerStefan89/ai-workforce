/**
 * Datei: public/leitstand/eintrag-bausteine.test.mjs
 *
 * Zweck: node:test-Fälle für die Bausteine „Kurz gesagt“, „Status-Block“ und „Jetzt-Band“ sowie die
 * Lesehilfen findeFundstellenPfad, nenntFeature und befundeAusFeature (F46 D3, eintrag-bausteine.js):
 * Kürzen ohne Umformulieren, fehlende Werte als „kommt“, genau ein Hauptknopf, Escaping, eindeutige
 * Fundstelle, Feature-ID als eigenes Wort. Ausgabe in de (i18n.js ist in Node auf de festgelegt).
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { befundeAusFeature, findeFundstellenPfad, fundstelleHtml, jetztBandHtml, kuerzeText, kurzGesagtHtml, nenntFeature, statusBlockHtml } from './eintrag-bausteine.js'

test('kuerzeText: erster Absatz, erster Satz; lange Sätze an der Wortgrenze mit „…“; nichts wird umformuliert', () => {
  assert.equal(kuerzeText('Erster Satz. Zweiter Satz.'), 'Erster Satz.')
  assert.equal(kuerzeText('Absatz eins ohne Punkt\n\nAbsatz zwei.'), 'Absatz eins ohne Punkt')
  assert.equal(kuerzeText('Zeile eins\nZeile zwei.'), 'Zeile eins Zeile zwei.')
  assert.equal(kuerzeText('Version 1.2 bleibt. Danach mehr.'), 'Version 1.2 bleibt.', 'Punkt ohne Leerraum danach ist kein Satzende')
  assert.equal(kuerzeText('Auswahl über a bzw. b; Gate z. B. f28 mitziehen. Rest.'), 'Auswahl über a bzw. b; Gate z. B. f28 mitziehen.', 'Abkürzungen beenden keinen Satz')
  const lang = kuerzeText(`${'wort '.repeat(80)}ende.`, 40)
  assert.ok(lang.length <= 42, lang)
  assert.match(lang, /^wort( wort)* …$/)
  assert.equal(kuerzeText('   '), null)
  assert.equal(kuerzeText(null), null)
})

test('Kurz gesagt: Label und Wert; fehlender Wert erscheint als „kommt“', () => {
  const html = kurzGesagtHtml([
    { label: 'Was das ist:', wertHtml: 'Ein &lt;Ziel&gt;' },
    { label: 'Was <gerade>:', wertHtml: null },
  ])
  assert.match(html, /<h2 id="kurz-gesagt-titel" class="kurz-gesagt-titel">Kurz gesagt<\/h2>/)
  assert.match(html, /<strong>Was das ist:<\/strong> Ein &lt;Ziel&gt;/)
  assert.match(html, /<strong>Was &lt;gerade&gt;:<\/strong> <span class="kommt-badge">kommt<\/span>/, 'Label escaped, null → kommt')
})

test('Status-Block: Kopfzeile mit Ton, Schlüssel → Wert, fehlende Werte als „kommt“, unbekannter Ton neutral', () => {
  const html = statusBlockHtml({ kopfHtml: 'In Arbeit', ton: 'warten', zeilen: [{ schluessel: 'Phase', wertHtml: 'Bau' }, { schluessel: 'Rest', wertHtml: null }] })
  assert.match(html, /data-ton="warten"/)
  assert.match(html, /<dt>Phase<\/dt><dd>Bau<\/dd>/)
  assert.match(html, /<dt>Rest<\/dt><dd><span class="kommt-badge">kommt<\/span><\/dd>/)
  assert.match(statusBlockHtml({ kopfHtml: '', ton: 'grell', zeilen: [] }), /data-ton="neutral"/)
})

test('Jetzt-Band „dran“: höchstens ein Hauptknopf (gefüllt), Texte escaped; „ruhig“: Satz „Gerade wartet nichts auf dich.“ ohne Knopf', () => {
  const dran = jetztBandHtml({ zustand: 'dran', titel: 'Abnahme <x>', text: 'Satz & mehr', knopf: { href: '#/workflows/w%201', text: 'Ergebnis prüfen' }, nebenHtml: '<button class="button kommt-knopf" aria-disabled="true">X</button>' })
  assert.equal((dran.match(/button primary/g) ?? []).length, 1)
  assert.match(dran, /Jetzt · Deine Entscheidung/)
  assert.match(dran, /<h2 id="jetzt-band-titel">Abnahme &lt;x&gt;<\/h2>/)
  assert.match(dran, /<p>Satz &amp; mehr<\/p>/)
  assert.match(dran, /href="#\/workflows\/w%201">Ergebnis prüfen <span aria-hidden="true">→<\/span><\/a>/)
  assert.match(dran, /^<section class="jetzt-band-dran" aria-labelledby="jetzt-band-titel">[\s\S]*<\/section>$/)
  const ohneKnopf = jetztBandHtml({ zustand: 'dran', titel: 'T', text: '', knopf: null })
  assert.doesNotMatch(ohneKnopf, /button primary/)
  const ruhig = jetztBandHtml({ zustand: 'ruhig', link: { href: '#/workflows/w1', text: 'Ablauf ansehen' } })
  assert.match(ruhig, /<strong>Gerade wartet nichts auf dich\.<\/strong>/)
  assert.match(ruhig, /<a class="text-link" href="#\/workflows\/w1">Ablauf ansehen<\/a>/)
  assert.doesNotMatch(ruhig, /button/)
  assert.doesNotMatch(jetztBandHtml({ zustand: 'ruhig' }), /<a /)
})

test('findeFundstellenPfad: genau ein Repo-Pfad (Backticks oder ganzer Text), Zeile nur wenn einheitlich; sonst null', () => {
  assert.deepEqual(findeFundstellenPfad('`public/leitstand/attention-daten.js:33` (filtereAttentionWorkflows), `:101` (baueEntscheidungen)'), { pfad: 'public/leitstand/attention-daten.js', zeile: 33 })
  assert.deepEqual(findeFundstellenPfad('`public/leitstand/views/workboard-detail.js`'), { pfad: 'public/leitstand/views/workboard-detail.js', zeile: null })
  assert.deepEqual(findeFundstellenPfad('x/a.js:1'), { pfad: 'x/a.js', zeile: 1 })
  assert.equal(findeFundstellenPfad('a.js:1'), null, 'ohne Ordner kein eindeutiger Repo-Pfad')
  assert.equal(findeFundstellenPfad('`abnahme.offen`'), null, 'gepunkteter Bezeichner ist kein Pfad (Prüfpass cr 9)')
  assert.deepEqual(findeFundstellenPfad('`abnahme.offen` in `public/a.js:3`'), { pfad: 'public/a.js', zeile: 3 }, 'Bezeichner neben dem Pfad stört nicht')
  assert.deepEqual(findeFundstellenPfad('`x/a.js:1`, `x/a.js:9`'), { pfad: 'x/a.js', zeile: null }, 'derselbe Pfad, verschiedene Zeilen → ohne Zeile')
  assert.equal(findeFundstellenPfad('`public/leitstand/views/workboard-detail.js:276`; `ak_urteile` in `scripts/leitstand-server.mjs`'), null, 'zwei Pfade → nicht eindeutig')
  assert.equal(findeFundstellenPfad('`../geheim/datei.txt`'), null, 'kein ..-Segment')
  assert.equal(findeFundstellenPfad('`C:/abs/datei.js`'), null, 'kein absoluter Pfad')
  assert.equal(findeFundstellenPfad('`/etc/passwd`'), null)
  assert.equal(findeFundstellenPfad('Kopfleiste beim Projektwechsel'), null)
  assert.equal(findeFundstellenPfad(null), null)
})

test('nenntFeature und befundeAusFeature: Feature-ID als eigenes Wort im Feld „Feature/Run“', () => {
  assert.equal(nenntFeature('Entdeckt: F46 D2, Prüfpass qa 5.', 'F46'), true)
  assert.equal(nenntFeature('Entdeckt: F460.', 'F46'), false)
  assert.equal(nenntFeature('Entdeckt: F46a.', 'F46'), false)
  assert.equal(nenntFeature('siehe F-46', 'F46'), false)
  assert.equal(nenntFeature('(F46)', 'F46'), true)
  assert.equal(nenntFeature(null, 'F46'), false)
  const liste = [
    { quelle: 'finding', id: 'F-1', status: 'OFFEN', featureRun: 'Entdeckt: F46 D1.' },
    { quelle: 'finding', id: 'F-2', status: 'ERLEDIGT', featureRun: 'F46 D2' },
    { quelle: 'finding', id: 'F-3', status: 'OFFEN', featureRun: 'F44 WS-8' },
    { quelle: 'feature', id: 'F46', status: 'IN_ARBEIT' },
  ]
  assert.deepEqual(befundeAusFeature(liste, 'F46'), { offen: 1, gesamt: 2, ids: ['F-1', 'F-2'] })
  assert.equal(befundeAusFeature(null, 'F46'), null)
})

test('fundstelleHtml: Abschnitte in Backticks als <code>, übriger Text escaped; idPraefix und ohneSatz der Bausteine', () => {
  assert.equal(fundstelleHtml('`public/a.js:3` (<init>), `:9`'), '<code>public/a.js:3</code> (&lt;init&gt;), <code>:9</code>')
  assert.equal(fundstelleHtml('ohne Backticks <b>'), 'ohne Backticks &lt;b&gt;')
  assert.match(kurzGesagtHtml([], 'd4-kurz'), /aria-labelledby="d4-kurz-titel"[\s\S]*id="d4-kurz-titel"/)
  assert.match(jetztBandHtml({ zustand: 'dran', titel: 'T', knopf: null }, 'd4-band'), /aria-labelledby="d4-band-titel"[\s\S]*<h2 id="d4-band-titel">/)
  const laedt = jetztBandHtml({ zustand: 'ruhig', ohneSatz: true, text: 'Lädt…' })
  assert.match(laedt, /<span>Lädt…<\/span>/)
  assert.doesNotMatch(laedt, /Gerade wartet nichts/)
})
