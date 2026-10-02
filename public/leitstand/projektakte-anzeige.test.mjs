/**
 * Datei: public/leitstand/projektakte-anzeige.test.mjs
 *
 * Zweck: node:test-Fälle für die Anzeigeregeln der Projektakte (F46 D1, projektakte-anzeige.js):
 * Abschnitte finden (eindeutig, ohne PR-Nummern als Überschrift), Klartext-Absätze escaped ohne
 * Markdown-Rendering, Datei-Zustände, Versionsziel — und dass „Wer diese Akte bekommt“ zum Code
 * passt: Der Test liest scripts/leitstand-server.mjs, sucht jede Stelle, an der der Server
 * Projektkontext über baueProjektkontextAnfragen an eine Rolle gibt, und vergleicht die Rollen mit
 * AKTE_EMPFAENGER.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { AKTE_EMPFAENGER, abschnitt, abschnitte, absaetzeHtml, dateiZustand, hauptabschnitte, versionsziel } from './projektakte-anzeige.js'

const BESCHREIBUNG = `# Projektbeschreibung

Einleitung.

## Für wen

Ein Nutzer, der zugleich
Vorarbeiter ist.

## Führungsprinzip

Dateien und Git führen.
#196, WS-3b #197 — keine Überschrift.
`

test('abschnitt: genau ein Abschnitt, Groß-/Kleinschreibung egal, PR-Nummern sind keine Überschrift', () => {
  assert.equal(abschnitt(BESCHREIBUNG, 'Für wen'), 'Ein Nutzer, der zugleich\nVorarbeiter ist.')
  assert.equal(abschnitt(BESCHREIBUNG, 'für WEN'), 'Ein Nutzer, der zugleich\nVorarbeiter ist.')
  assert.match(abschnitt(BESCHREIBUNG, 'Führungsprinzip'), /#196, WS-3b #197/)
  assert.equal(abschnitt(BESCHREIBUNG, 'Gibt es nicht'), null)
  assert.equal(abschnitt('## A\n\neins\n\n## A\n\nzwei', 'A'), null, 'zwei gleichnamige Abschnitte: nicht eindeutig')
  assert.equal(abschnitt('## Leer\n\n## B\n\nx', 'Leer'), null, 'leerer Abschnitt zählt nicht')
  assert.deepEqual(
    hauptabschnitte(BESCHREIBUNG).map((a) => a.titel),
    ['Für wen', 'Führungsprinzip']
  )
  assert.equal(abschnitte('').length, 1)
})

test('Codeblock: eine Rauten-Zeile darin ist keine Überschrift und zerschneidet den Abschnitt nicht', () => {
  const text = '## Aktuelle Phase\n\nVorher.\n\n```\n# kein Titel\n```\n\nNachher.\n\n## Weiter\n\nx'
  assert.equal(abschnitt(text, 'Aktuelle Phase'), 'Vorher.\n\n```\n# kein Titel\n```\n\nNachher.')
  assert.doesNotMatch(absaetzeHtml('```\n# kein Titel\n```'), /akte-zwischentitel/)
})

test('absaetzeHtml: escaped, Absätze, Zwischentitel ohne Rauten, Listenzeilen mit Umbruch, kein Markdown-Rendering', () => {
  const html = absaetzeHtml('## Titel <x>\n\nZeile eins\nZeile **zwei**\n\n- Punkt a\n- Punkt b\n\n<script>alert(1)</script>')
  assert.match(html, /<p class="akte-zwischentitel">Titel &lt;x&gt;<\/p>/)
  assert.match(html, /<p class="akte-text">Zeile eins Zeile \*\*zwei\*\*<\/p>/)
  assert.match(html, /<p class="akte-text">- Punkt a\n- Punkt b<\/p>/)
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
  assert.doesNotMatch(html, /<script>|<strong>|<em>|<a /)
})

test('dateiZustand: lädt, ok, fehlt, Fehler (auch bei unbekanntem Status oder fehlendem Eintrag)', () => {
  assert.deepEqual(dateiZustand(null, 'lagebild'), { zustand: 'laedt', datei: null })
  const antwort = { dateien: { lagebild: { status: 'ok', pfad: 'p', text: 't' }, anweisungen: { status: 'fehlt', pfad: 'q' }, beschreibung: { status: 'fehler', pfad: 'r' }, zielfassung: { status: 'seltsam' } } }
  assert.equal(dateiZustand(antwort, 'lagebild').zustand, 'ok')
  assert.equal(dateiZustand(antwort, 'anweisungen').zustand, 'fehlt')
  assert.equal(dateiZustand(antwort, 'beschreibung').zustand, 'fehler')
  assert.equal(dateiZustand(antwort, 'zielfassung').zustand, 'fehler')
  assert.equal(dateiZustand(antwort, 'roadmap').zustand, 'fehler')
  assert.equal(dateiZustand({ status: 'fehler' }, 'lagebild').zustand, 'fehler')
})

test('versionsziel: nur bei status ok mit Zielsatz; Kriterien leer → null', () => {
  assert.deepEqual(versionsziel({ versionsziel: { status: 'ok', meilenstein: 'M5', zielsatz: 'Z', kriterien: ['a'] } }), { meilenstein: 'M5', zielsatz: 'Z', kriterien: ['a'] })
  assert.deepEqual(versionsziel({ versionsziel: { status: 'ok', meilenstein: 'M5', zielsatz: 'Z', kriterien: [] } }), { meilenstein: 'M5', zielsatz: 'Z', kriterien: null })
  assert.equal(versionsziel({ versionsziel: { status: 'nicht_eindeutig', meilenstein: 'M5' } }), null)
  assert.equal(versionsziel({ versionsziel: { status: 'ok', zielsatz: '  ' } }), null)
  assert.equal(versionsziel(null), null)
})

/**
 * Entfernt ganze Kommentarzeilen ('//' bzw. '*' am Zeilenanfang). Bewusst kein Blockkommentar-Muster
 * über die ganze Datei: der Server enthält Zeichenketten wie 'Read(~/.claude/**)', die ein solches
 * Muster als Kommentaranfang läse und dabei Code verschluckte.
 * @param quelltext - Inhalt einer .mjs-Datei
 * @returns Quelltext ohne Kommentarzeilen
 */
function ohneKommentare(quelltext) {
  return quelltext
    .split('\n')
    .filter((zeile) => !/^\s*(\/\/|\/\*\*?|\*)/.test(zeile))
    .join('\n')
}

/**
 * Die Rollen, denen der Server Projektkontext gibt: jede Aufrufstelle von baueProjektkontextAnfragen
 * liegt in einem eingabenRoh-Objekt, dessen rolle ein Literal oder konfiguration.rolle ist; letzteres
 * steht für jede KONFIGURATION_*-Konstante mit Rollenliteral.
 * @param quelltext - Serverquelltext ohne Kommentare
 * @returns { rollen: Set, aufrufe: Anzahl, unaufgeloest: Anzahl }
 */
function rollenMitProjektkontext(quelltext) {
  const konfigurationsRollen = [...quelltext.matchAll(/const KONFIGURATION_\w+ = \{\s*rolle: '([^']+)'/g)].map((m) => m[1])
  const rollen = new Set()
  let aufrufe = 0
  let unaufgeloest = 0
  for (const treffer of quelltext.matchAll(/(?<!function )baueProjektkontextAnfragen\(/g)) {
    aufrufe++
    const davor = quelltext.slice(0, treffer.index)
    const objektStart = davor.lastIndexOf('const eingabenRoh = {')
    const ausschnitt = objektStart < 0 ? '' : davor.slice(objektStart)
    const rolle = ausschnitt.match(/rolle:\s*(?:'([^']+)'|(konfiguration\.rolle))/)
    if (rolle === null) unaufgeloest++
    else if (rolle[1] !== undefined) rollen.add(rolle[1])
    else for (const r of konfigurationsRollen) rollen.add(r)
  }
  return { rollen, aufrufe, unaufgeloest }
}

test('Wer diese Akte bekommt: die Liste passt zu den Aufrufstellen von baueProjektkontextAnfragen im Server', () => {
  const server = ohneKommentare(readFileSync(new URL('../../scripts/leitstand-server.mjs', import.meta.url), 'utf8'))
  const { rollen, aufrufe, unaufgeloest } = rollenMitProjektkontext(server)
  assert.ok(aufrufe >= 1, 'keine Aufrufstelle gefunden — der Test prüft dann nichts')
  assert.equal(unaufgeloest, 0, 'eine Aufrufstelle ohne erkennbare Rolle — Liste und Test nachziehen')
  const bekommen = new Set(AKTE_EMPFAENGER.filter((e) => e.bekommt).map((e) => e.rolle))
  assert.deepEqual([...rollen].sort(), [...bekommen].sort(), 'AKTE_EMPFAENGER (bekommt: true) weicht vom Server ab')
  for (const { rolle, bekommt } of AKTE_EMPFAENGER) if (!bekommt) assert.ok(!rollen.has(rolle), `${rolle} bekommt laut Server die Akte — Liste nachziehen (F-936)`)
})

test('Selbsttest der Server-Auswertung: eine zusätzliche Rolle fiele auf', () => {
  const kuenstlich = `const KONFIGURATION_X = {\n  rolle: 'jarvis',\n}\nconst eingabenRoh = {\n  rolle: 'architekt',\n  anfragen: filtereExistierendeAnfragen(baueProjektkontextAnfragen(a, b), w),\n}\nconst eingabenRoh = {\n  rolle: konfiguration.rolle,\n  anfragen: baueProjektkontextAnfragen(a, b),\n}`
  const { rollen, aufrufe } = rollenMitProjektkontext(kuenstlich)
  assert.equal(aufrufe, 2)
  assert.deepEqual([...rollen].sort(), ['architekt', 'jarvis'])
})
