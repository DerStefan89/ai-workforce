/**
 * Datei: public/leitstand/views/live-anzeige.test.mjs
 *
 * Zweck: node:test für das Render der Live-Ansicht (F46 D5, views/live-anzeige.js): Escape aller
 * Fremddaten (Werkzeugziel mit HTML), keine Live-Region in der Aktivität, „kommt“ ohne Quelle
 * (Warnungen, Schätzung, Erklärung, Arbeitspaket, Bremsen), Status-Block mit echten Werten,
 * Kontextpaket nur mit Liste, „Mehr dazu“ (VS Code nur für absolute Pfade), Zuletzt und Als Nächstes.
 *
 * Wird aufgerufen von: `npm test` (node --test). Texte aus dem deutschen Wörterbuch (Standard in Node).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  baueJarvisEntwurf,
  relativeZeit,
  renderAblaufleiste,
  renderAktivitaet,
  renderAlsNaechstes,
  renderBeruehrteDateien,
  renderBremsen,
  renderBuilderPaket,
  renderFaehigkeitenKarte,
  renderFremderLauf,
  renderGerade,
  renderKopfChips,
  renderMehrDazu,
  renderOutput,
  renderStatusBlock,
  renderZuletzt,
} from './live-anzeige.js'

const BOESE = '<img src=x onerror=alert(1)>'
const JETZT = Date.parse('2026-10-03T10:10:00Z')
const AKTIVITAET = {
  eintraege: [
    { zeit: '2026-10-03T10:09:50Z', werkzeug: 'Edit', ziel: `public/${BOESE}.js`, art: 'aendert' },
    { zeit: '2026-10-03T10:05:00Z', werkzeug: 'Bash', ziel: 'npm run check', art: 'befehl' },
  ],
  anzahlGesamt: 73,
  grenze: 50,
  beruehrteDateien: [`public/${BOESE}.js`],
  beruehrteGekappt: false,
}

test('Aktivität: neueste oben, Ziel escaped, keine Live-Region, Warnungen „kommt“, Gesamtzahl im Fuß', () => {
  const html = renderAktivitaet({ aktiv: true, aktivitaet: AKTIVITAET, filter: 'alle', gewaehlt: null, jetztMs: JETZT })
  assert.doesNotMatch(html, /<img/)
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/)
  assert.doesNotMatch(html, /aria-live/)
  assert.ok(html.indexOf('npm run check') > html.indexOf('&lt;img'), 'neueste oben')
  assert.match(html, /aria-disabled="true">Warnungen <span class="kommt-badge">/)
  assert.match(html, /\(73 insgesamt\)/)
  assert.match(html, /jetzt/)
  assert.match(html, /5 min/)
  const gefiltert = renderAktivitaet({ aktiv: true, aktivitaet: AKTIVITAET, filter: 'faehigkeit', jetztMs: JETZT })
  assert.match(gefiltert, /Keine Aufrufe dieser Art unter den letzten 50/)
  assert.match(renderAktivitaet({ aktiv: false, aktivitaet: null }), /nur während des Laufs gehalten/)
  assert.match(renderAktivitaet({ aktiv: true, aktivitaet: null }), /meldet der Server keine Aktivität/)
})

test('Gerade: letzter Aufruf mit Verb und escaptem Ziel; ohne Aufruf ein ehrlicher Hinweis', () => {
  assert.match(renderGerade(AKTIVITAET), /<strong>ändert<\/strong> <code class="live-ziel">public\/&lt;img/)
  assert.match(renderGerade(null, null), /Noch kein Werkzeugaufruf gemeldet/)
  assert.match(renderGerade({ eintraege: [] }, { werkzeug: 'Read', ziel: 'CLAUDE.md' }), /CLAUDE\.md/)
})

test('Status-Block: läuft seit, Zeitgrenze mit Rest, Schätzung „kommt“, Aufrufe; beendet: Dauer', () => {
  const html = renderStatusBlock({ aktiv: true, startIso: '2026-10-03T09:52:00Z', zeitgrenze: { grenzeMinuten: 30, restMinuten: 12, anteil: 0.6 }, aktivitaet: AKTIVITAET, abbrechenHtml: '<button>X</button>', jetztMs: JETZT })
  assert.match(html, /Läuft seit<\/dt><dd>18 min/)
  assert.match(html, /30 min · noch 12 min/)
  assert.match(html, /Schätzung<\/dt><dd><span class="kommt-badge">/)
  assert.match(html, /73 bisher/)
  assert.match(html, /aria-valuenow="60"/)
  assert.match(html, /<button>X<\/button>/)
  const beendet = renderStatusBlock({ aktiv: false, dauerMinuten: 84, jetztMs: JETZT })
  assert.match(beendet, /Dauer<\/dt><dd>1 h 24 min/)
  assert.doesNotMatch(beendet, /progressbar/)
})

test('Kopf-Chips: Rolle · Worker, Modell (Schritt oder Startvorlage), Werkzeugsatz, Zum Eintrag', () => {
  const html = renderKopfChips({ detail: {}, schritt: { rolle: 'ausfuehrung', worker: 'claude-code', modell: 'claude-sonnet-5', werkzeugsatz: 'schreibend' }, eintragHash: '#/workboard/F46' })
  assert.match(html, /Modell claude-sonnet-5/)
  assert.match(html, /Werkzeugsatz: schreibend/)
  assert.match(html, /href="#\/workboard\/F46"/)
  assert.match(renderKopfChips({ detail: { kontextpaket: { status: 'nicht_vorhanden' } } }), /Modell laut Startvorlage/)
  assert.doesNotMatch(renderKopfChips({ detail: {} }), /Zum Eintrag/)
})

test('Ablaufleiste: Stufen mit Status, Sichern/Merge „kommt“, Freigabe wartet; ohne Workflow ein Hinweis', () => {
  const html = renderAblaufleiste([
    { id: 'plan', status: 'ohne' },
    { id: 'freigabe', status: 'jetzt' },
    { id: 'bau', status: 'offen' },
    { id: 'sichern', status: 'kommt' },
  ])
  assert.match(html, /wartet auf dich/)
  assert.match(html, /aria-current="step"/)
  assert.match(html, /Sichern<\/span>\s*<span class="kommt-badge">/)
  assert.match(renderAblaufleiste(null), /gehört zu keinem Ablauf/)
})

test('Mehr dazu: Werkzeug, Ziel, Zeit echt und escaped; Erklärung, Ausschnitt, Im Umfang „kommt“; VS Code nur bei absolutem Pfad', () => {
  const relativ = renderMehrDazu({ eintrag: AKTIVITAET.eintraege[0], schritt: { rolle: 'ausfuehrung', worker: 'claude-code' } })
  assert.doesNotMatch(relativ, /<img/)
  assert.doesNotMatch(relativ, /vscode:\/\//)
  assert.match(relativ, /href="#\/code"/)
  assert.equal((relativ.match(/kommt-badge/g) ?? []).length, 4, 'Erklärung, Ausschnitt, Im Umfang, Arbeitspaket')
  const absolut = renderMehrDazu({ eintrag: { zeit: '2026-10-03T10:00:00Z', werkzeug: 'Write', ziel: 'C:\\repo\\a b.js', art: 'aendert' } })
  assert.match(absolut, /href="vscode:\/\/file\/C:\/repo\/a%20b\.js"/)
  const befehl = renderMehrDazu({ eintrag: AKTIVITAET.eintraege[1] })
  assert.doesNotMatch(befehl, /href="#\/code"/)
  assert.match(renderMehrDazu({ eintrag: null }), /Wähle einen Aufruf/)
  assert.doesNotMatch(relativ, /aria-live/)
})

test('Frag Jarvis: Entwurf mit Frage und Bezug, sendet nichts (reiner Text)', () => {
  assert.equal(baueJarvisEntwurf('Warum diese Änderung?', 'l-1', AKTIVITAET.eintraege[1]), 'Warum diese Änderung?\n\nBezug: Lauf l-1, Aufruf Bash npm run check')
  assert.equal(baueJarvisEntwurf('Wo steht der Lauf?', 'l-1', null), 'Wo steht der Lauf?\n\nBezug: Lauf l-1')
})

test('Karten: Berührte Dateien echt und escaped, nach Lauf Verweis; Bremsen „kommt“; Fähigkeiten nach Lauf aus der Laufakte', () => {
  const dateien = renderBeruehrteDateien({ aktiv: true, aktivitaet: AKTIVITAET })
  assert.doesNotMatch(dateien, /<img/)
  assert.match(dateien, /geändert/)
  assert.match(renderBeruehrteDateien({ aktiv: true, aktivitaet: { ...AKTIVITAET, beruehrteDateien: ['x'], beruehrteGekappt: true } }), /ersten 1 Dateien/)
  assert.match(renderBeruehrteDateien({ aktiv: false, aktivitaet: null }), /href="#\/code"/)
  assert.match(renderBremsen(), /kommt-badge/)
  assert.match(renderFaehigkeitenKarte({ aktiv: true, laufakte: null }), /nach dem Lauf in der Laufakte/)
  assert.match(renderFaehigkeitenKarte({ aktiv: false, laufakte: { status: 'nicht_vorhanden' } }), /unbekannt/)
})

test('Output und Builder-Paket: Schritte mit Status und Link; Kontextpaket nur mit Liste, sonst „kommt“', () => {
  const output = renderOutput({ workflow: { daten: { schritte: [{ schritt_id: 's1', rolle: 'architekt', worker: 'codex', status: 'ERFOLGREICH', lauf_id: 'l-0' }, { schritt_id: 's2', rolle: 'ausfuehrung', status: 'LAEUFT', lauf_id: 'l-1' }, { schritt_id: 's3', status: 'OFFEN' }] } }, laufId: 'l-1' })
  assert.match(output, /fertig/)
  assert.match(output, /href="#\/runs\/l-0"/)
  assert.doesNotMatch(output, /href="#\/runs\/l-1"/, 'kein Link auf den eigenen Lauf')
  assert.doesNotMatch(output, /s3/)
  assert.match(renderOutput({ workflow: null }), /Ohne Ablauf/)
  const paket = renderBuilderPaket({ status: 'ok', elemente: [{ pfad: `docs/${BOESE}.md` }] })
  assert.match(paket, /Kontextpaket · Dateien: 1/)
  assert.doesNotMatch(paket, /<img/)
  assert.match(renderBuilderPaket({ status: 'nicht_vorhanden' }), /Kontextpaket <span class="kommt-badge">/)
})

test('Zuletzt und Als Nächstes: echte Werte, Bericht „kommt“, Links; ohne Lauf bzw. ohne Nächstes ehrlich', () => {
  const zuletzt = renderZuletzt({ lauf: { laufId: 'l-9', zeitpunkt: '2026-10-03T10:04:00Z', auftragsbezug: { titel: BOESE } }, dauerMinuten: 24, ergebnisHtml: '<span>ok</span>', jetztMs: JETZT })
  assert.doesNotMatch(zuletzt, /<img/)
  assert.match(zuletzt, /vor 6 min/)
  assert.match(zuletzt, /24 min/)
  assert.match(zuletzt, /href="#\/runs\/l-9"/)
  assert.match(zuletzt, /Bericht<\/dt><dd><span class="kommt-badge">/)
  assert.match(renderZuletzt({ lauf: null }), /noch keinen Lauf/)
  const entscheidung = renderAlsNaechstes({ art: 'entscheidung', eintrag: { art: 'freigabe', titel: BOESE, satz: 'wartet' } })
  assert.match(entscheidung, /href="#\/attention"/)
  assert.doesNotMatch(entscheidung, /<img/)
  assert.match(renderAlsNaechstes({ art: 'schritt', workflow: { workflowId: 'wf-2', ziel: 'Review', naechster: { grund: 'bereit' } } }), /href="#\/workflows\/wf-2"/)
  assert.match(renderAlsNaechstes(null), /href="#\/projekt"/)
})

test('relativeZeit: jetzt, Minuten, Stunden, ungültig', () => {
  assert.equal(relativeZeit('2026-10-03T10:09:30Z', JETZT), 'jetzt')
  assert.equal(relativeZeit('2026-10-03T09:58:00Z', JETZT), '12 min')
  assert.equal(relativeZeit('2026-10-03T07:00:00Z', JETZT), '3 h')
  assert.equal(relativeZeit('kaputt', JETZT), '—')
})

test('Prüfpass D5: Hauptknopf bei offener Entscheidung, fremder Lauf ohne Startangebot, Fähigkeiten lesbar, Output mit Rollenname, kein VS-Code-Link auf gekürztes Ziel', () => {
  assert.match(renderAlsNaechstes({ art: 'entscheidung', eintrag: { art: 'freigabe', titel: 'X', satz: null } }), /class="button primary" href="#\/attention"/)
  const fremd = renderFremderLauf()
  assert.match(fremd, /nur ein Lauf zur Zeit/)
  assert.doesNotMatch(fremd, /#\/workflows\//)
  const faehig = renderFaehigkeitenKarte({ aktiv: false, laufakte: { status: 'ok', beobachtung: { skill_aufrufe: ['frontend-design'], subagent_aufrufe: [], mcp_aufrufe: [] } } })
  assert.match(faehig, /<code>frontend-design<\/code>/)
  assert.equal((faehig.match(/keine/g) ?? []).length, 2)
  assert.doesNotMatch(faehig, /\[\]/)
  const output = renderOutput({ workflow: { daten: { schritte: [{ schritt_id: 's1', rolle: 'architekt', worker: 'codex', status: 'ERFOLGREICH' }] } } })
  assert.ok(output.indexOf('<strong>') < output.indexOf('live-schritt-id'), 'Rollenname vor der Schritt-ID')
  const lang = `C:\\${'a'.repeat(298)}…`
  assert.doesNotMatch(renderMehrDazu({ eintrag: { zeit: null, werkzeug: 'Edit', ziel: lang, art: 'aendert' } }), /vscode:/)
})
