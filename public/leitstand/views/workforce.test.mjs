/**
 * Datei: public/leitstand/views/workforce.test.mjs
 *
 * Zweck: node:test für die beiden Register der Workforce (F46 D6): views/harness-aufbau.js (Skelett mit echten
 * Orten, „fehlt“, Schloss; Klick auf einen Hook lädt den Inhalt über GET …/harness/datei und zeigt ihn escaped
 * mit „Sichtbar, aber nicht direkt änderbar.“ und VS-Code-Link; Ordner zeigt seine Einträge ohne Netzabruf) und
 * views/capability-library.js (Kennzahlen, „12 von n“, Hinweis nur aus dem Abgleich, Detail escaped, „Prüfen &
 * freigeben“ nur bei offener Freigabe und über den F36-Weg POST …/installation/vorbereiten).
 *
 * Die Views laufen gegen ein minimales Schein-DOM (Elemente mit innerHTML und Klick-Handlern) und ein
 * aufzeichnendes fetch mit festen Antworten — kein Browser, kein Server.
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 *
 * Wichtig: Die Globals stehen VOR dem Import der Module (i18n und projekt-kontext lesen Storage beim Laden) —
 * deshalb dynamische Importe (Muster views/capabilities.test.mjs).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'

class ScheinElement {
  constructor(id = '') {
    this.id = id
    this.hidden = false
    this.innerHTML = ''
    this.value = ''
    this.placeholder = ''
    this.dataset = {}
    this.handler = {}
    this.inhalte = []
  }
  addEventListener(typ, fn) {
    if (this.handler[typ] === undefined) this.handler[typ] = []
    this.handler[typ].push(fn)
  }
  /** Löst alle Handler eines Typs aus und wartet auf sie. */
  async ausloesen(typ, ereignis) {
    for (const fn of this.handler[typ] ?? []) await fn(ereignis)
  }
  setAttribute() {}
  removeAttribute() {}
  getAttribute() {
    return null
  }
  querySelector() {
    return null
  }
  querySelectorAll() {
    return this.inhalte
  }
  contains() {
    return true
  }
  focus() {}
}

const elemente = new Map()
const speicher = () => {
  const werte = new Map()
  return { getItem: (s) => werte.get(s) ?? null, setItem: (s, w) => werte.set(s, String(w)), removeItem: (s) => werte.delete(s) }
}
globalThis.Element = ScheinElement
globalThis.document = {
  getElementById(id) {
    if (!elemente.has(id)) elemente.set(id, new ScheinElement(id))
    return elemente.get(id)
  },
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener() {},
  documentElement: new ScheinElement('html'),
}
Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true, writable: true })
globalThis.addEventListener = () => {}
Object.defineProperty(globalThis, 'location', { value: { hash: '#/capabilities' }, configurable: true, writable: true })
Object.defineProperty(globalThis, 'sessionStorage', { value: speicher(), configurable: true, writable: true })
Object.defineProperty(globalThis, 'localStorage', { value: speicher(), configurable: true, writable: true })

const HTML = '<img src=x onerror=alert(1)>'
const anfragen = []
/** Solange gesetzt, antwortet GET …/harness/datei?pfad=CLAUDE.md erst nach Erfüllen dieses Versprechens (Überholschutz). */
let warteAufClaude = null
globalThis.fetch = (url, optionen = {}) => {
  const pfad = String(url)
  anfragen.push(`${optionen.method ?? 'GET'} ${pfad}`)
  const antwort = (json, status = 200) => Promise.resolve(new Response(JSON.stringify(json), { status }))
  if (pfad.includes('/harness/datei?pfad=')) {
    const gewaehlt = decodeURIComponent(pfad.split('pfad=')[1])
    if (gewaehlt === 'CLAUDE.md' && warteAufClaude !== null) return warteAufClaude.then(() => antwort({ status: 'ok', pfad: gewaehlt, text: 'SPAET', gekuerzt: false }))
    if (gewaehlt === 'ARCHITECTURE.md') return antwort({ grund: 'pfad steht nicht in der Liste des Harness' }, 400)
    return antwort({ status: 'ok', pfad: gewaehlt, text: `/** ${HTML} */\n`, gekuerzt: true, groesse: 70000 })
  }
  if (pfad.endsWith('/installation/vorbereiten')) return antwort({ grund: 'nur typ extern mit unterart mcp oder skill' }, 400)
  return antwort({})
}

const { renderHarness, initHarnessAufbau, setzeHarnessZurueck } = await import('./harness-aufbau.js')
const { renderCapabilityLibrary, aktualisiereLibraryHinweis, initCapabilityLibrary } = await import('./capability-library.js')

const warte = () => new Promise((fertig) => setTimeout(fertig, 0))

const HARNESS = {
  status: 'ok',
  absoluterPfad: 'C:\\Projekte\\ai-workforce',
  name: `ai-workforce${HTML}`,
  bausteine: [
    { id: 'regeln', ort: '/', eintraege: [{ pfad: 'CLAUDE.md', art: 'datei', vorhanden: true, status: 'ok', groesse: 8046 }, { pfad: 'ARCHITECTURE.md', art: 'datei', vorhanden: true, status: 'ok', groesse: 9289 }, { pfad: 'README.md', art: 'datei', vorhanden: false, status: 'ok' }] },
    { id: 'rollen', ort: '.claude/', eintraege: [{ pfad: '.claude/agents', art: 'ordner', vorhanden: true, status: 'ok', anzahl: 3, eintraege: [{ name: 'design-guardian.md', art: 'datei', groesse: 5950 }, { name: 'qa.md', art: 'datei', groesse: 1066 }, { name: `x${HTML}.md`, art: 'datei', groesse: 10 }], gekappt: false }] },
    { id: 'bremsen', ort: '.claude/', eintraege: [{ pfad: '.claude/hooks', art: 'ordner', vorhanden: true, status: 'ok', geschuetzt: true, anzahl: 1, eintraege: [{ name: 'commit-guard.cjs', art: 'datei', groesse: 12107 }], gekappt: false }] },
  ],
}

/** Ziel eines Klicks: closest liefert den Knopf für passende Selektoren. */
const klickZiel = (knopf, selektoren) => Object.assign(new ScheinElement(), { closest: (s) => (selektoren.some((x) => s.includes(x)) ? knopf : null) })

test('Harness: Skelett mit echten Orten, fehlender Ort als „fehlt“, Name escaped, Schloss nur an Bremsen', () => {
  initHarnessAufbau()
  renderHarness(HARNESS)
  const html = document.getElementById('harness-skelett').innerHTML
  assert.match(html, /data-harness-pfad="CLAUDE\.md"/)
  assert.match(html, /data-harness-pfad="\.claude\/hooks\/commit-guard\.cjs"[^>]*data-geschuetzt="true"/)
  assert.match(html, /data-zustand="fehlt"/, 'README.md fehlt')
  assert.doesNotMatch(html, /<img/, 'Repo-Name escaped')
  assert.equal((html.match(/harness-schloss/g) ?? []).length, 1, 'genau ein Schloss (der eine Hook)')
  assert.match(document.getElementById('harness-detail').innerHTML, /harness-detail-leer/, 'ohne Auswahl der Leerzustand')
})

test('Harness: Klick auf einen Hook lädt den Inhalt — escaped, gekürzt, „nicht direkt änderbar“, VS Code', async () => {
  const knopf = { dataset: { harnessPfad: '.claude/hooks/commit-guard.cjs', harnessArt: 'datei' }, classList: { contains: () => false } }
  await document.getElementById('harness-skelett').ausloesen('click', { target: klickZiel(knopf, ['data-harness-pfad']) })
  await warte()
  const detail = document.getElementById('harness-detail').innerHTML
  assert.ok(anfragen.includes(`GET /api/harness/datei?pfad=${encodeURIComponent('.claude/hooks/commit-guard.cjs')}`))
  assert.match(detail, /&lt;img src=x onerror=alert\(1\)&gt;/, 'Dateiinhalt escaped')
  assert.doesNotMatch(detail, /<img/)
  assert.match(detail, /Sichtbar, aber nicht direkt änderbar\./)
  assert.match(detail, /harness-detail-eyebrow geschuetzt/)
  assert.match(detail, /href="vscode:\/\/file\/C:\/Projekte\/ai-workforce\/\.claude\/hooks\/commit-guard\.cjs"/)
  assert.match(detail, /aria-disabled="true"[^>]*>Änderung vorschlagen/, '„Änderung vorschlagen“ ist kommt')
  assert.match(detail, /Gekürzt auf die ersten 64 KB/)
})

test('Harness: Klick auf einen Ordner zeigt die direkten Einträge ohne Netzabruf; Namen escaped', async () => {
  const vorher = anfragen.length
  const knopf = { dataset: { harnessPfad: '.claude/agents', harnessArt: 'ordner' }, classList: { contains: () => false } }
  await document.getElementById('harness-skelett').ausloesen('click', { target: klickZiel(knopf, ['data-harness-pfad']) })
  const detail = document.getElementById('harness-detail').innerHTML
  assert.equal(anfragen.length, vorher, 'kein Abruf für einen Ordner')
  assert.match(detail, /data-harness-pfad="\.claude\/agents\/design-guardian\.md"/)
  assert.doesNotMatch(detail, /<img/)
  assert.doesNotMatch(detail, /nicht direkt änderbar/, 'kein Bremsen-Satz außerhalb der Bremsen')
})

/** Katalog mit 14 Einträgen: ein offener, installierbarer externer Skill mit HTML in der Beschreibung, ein offener, nicht installierbarer MCP, sonst freigegebene. */
const EINTRAEGE = [
  { id: 'qa', typ: 'agent', name: 'qa', beschreibung: 'Randfälle', freigabe: 'FREIGEGEBEN', verfuegbar: true, herkunft: { art: 'agent', pfad: '.claude/agents/qa.md' }, phasen: ['AVAILABLE'], fehltFuerEinsatz: [], anzeigeGrund: '' },
  { id: 'impeccable', typ: 'extern', unterart: 'skill', name: 'impeccable', beschreibung: `Design ${HTML}`, freigabe: 'OFFEN', verfuegbar: false, herkunft: { art: 'extern', url: 'https://github.com/pbakaus/impeccable' }, phasen: ['DISCOVERED'], fehltFuerEinsatz: ['freigabe OFFEN'], anzeigeGrund: 'Freigabe offen', installierbar: true, installationsGrund: null },
  { id: 'context7-mcp', typ: 'extern', unterart: 'mcp', name: 'context7-mcp', beschreibung: 'Doku', freigabe: 'OFFEN', verfuegbar: false, herkunft: { art: 'extern', url: 'https://github.com/upstash/context7' }, phasen: ['DISCOVERED'], fehltFuerEinsatz: ['freigabe OFFEN'], anzeigeGrund: 'Freigabe offen', installierbar: false, installationsGrund: "wirkung 'extern_lesend' — in V1 nur 'lokal' freigebbar (E-F36-4)" },
  ...Array.from({ length: 11 }, (_, i) => ({ id: `skill-${i}`, typ: 'skill', name: `skill-${i}`, beschreibung: '', freigabe: 'FREIGEGEBEN', verfuegbar: true, herkunft: { art: 'skill', pfad: `.claude/skills/skill-${i}` }, phasen: [], fehltFuerEinsatz: [], anzeigeGrund: '' })),
]

test('Library: Kennzahlen, „12 von 14“, Hinweis nur aus dem Abgleich mit dem Harness', () => {
  initCapabilityLibrary({ neuLaden: async () => {}, zeigeImHarnessAufbau: () => {} })
  renderCapabilityLibrary({ startvorlagePfad: 'startvorlagen/ai-workforce.json', assessedHinweis: 'x', eintraege: EINTRAEGE })
  const kennzahlen = document.getElementById('capabilities-kennzahlen').innerHTML
  assert.match(kennzahlen, /data-kennzahl="katalog"[\s\S]*<strong>14<\/strong>/)
  assert.match(kennzahlen, /data-kennzahl="aktiv"[\s\S]*<strong>12<\/strong>/)
  assert.match(kennzahlen, /data-kennzahl="offen"[\s\S]*<strong>2<\/strong>/)
  const tabelle = document.getElementById('capabilities-library').innerHTML
  assert.equal((tabelle.match(/class="library-zeile"/g) ?? []).length, 12)
  assert.match(tabelle, /12 von 14 gezeigt/)
  assert.doesNotMatch(tabelle, /<img/, 'Beschreibung escaped')
  const hinweis = document.getElementById('library-hinweis')
  assert.equal(hinweis.hidden, true, 'ohne Harness kein Hinweis')
  aktualisiereLibraryHinweis(HARNESS)
  assert.equal(hinweis.hidden, false)
  assert.match(hinweis.innerHTML, /^<p>2 Agents liegen im Harness unter <code>\.claude\/agents\/<\/code>, stehen aber noch nicht im Katalog: <strong>design-guardian<\/strong>, /, 'ein Satz für mehrere Namen')
  assert.doesNotMatch(hinweis.innerHTML, /<strong>qa<\/strong>/, 'qa steht im Katalog')
  assert.match(hinweis.innerHTML, /<strong>x&lt;img src=x onerror=alert\(1\)&gt;<\/strong>/, 'Dateiname aus dem Harness escaped')
  assert.doesNotMatch(hinweis.innerHTML, /<img/)
})

test('Library: Detail escaped; „Prüfen & freigeben“ nur bei offener Freigabe und über den F36-Weg', async () => {
  const liste = document.getElementById('capabilities-library')
  const waehle = (id) => liste.ausloesen('click', { target: klickZiel({ dataset: { libraryId: id } }, ['data-library-id']) })
  await waehle('qa')
  const detail = document.getElementById('library-detail')
  assert.match(detail.innerHTML, /Ausgewählt · aktiv/)
  assert.doesNotMatch(detail.innerHTML, /data-installation-aktion/, 'freigegeben → kein Freigabeweg')
  assert.match(detail.innerHTML, /library-zum-harness" data-harness-ort="\.claude\/agents\/qa\.md"/, 'die Datei selbst, nicht nur der Ordner')
  await waehle('impeccable')
  assert.match(detail.innerHTML, /Ausgewählt · nicht aktiv/)
  assert.doesNotMatch(detail.innerHTML, /<img/)
  assert.match(detail.innerHTML, /data-installation-aktion="vorbereiten" data-ressource-id="impeccable"/)
  assert.match(detail.innerHTML, /rel="noopener noreferrer"/)
  // Klick auf „Prüfen & freigeben“: derselbe Ablauf wie im Freigabedialog (empfehlung-installation.js).
  const platz = Object.assign(new ScheinElement(), { dataset: { installationFuer: 'impeccable' } })
  detail.inhalte = [platz]
  const knopf = Object.assign(new ScheinElement(), { dataset: { installationAktion: 'vorbereiten', ressourceId: 'impeccable' }, disabled: false })
  await detail.ausloesen('click', { target: klickZiel(knopf, ['data-installation-aktion']) })
  await warte()
  assert.ok(anfragen.includes('POST /api/ressourcen/impeccable/installation/vorbereiten'), 'F36: vorbereiten')
  assert.ok(!anfragen.some((a) => a === 'POST /api/ressourcen/impeccable/installation'), 'ohne Bestätigung keine Installation')
  assert.match(platz.innerHTML, /class="fehler"/, 'Ablehnung des Servers sichtbar')
})

test('Library: offene Freigabe ohne F36-Weg zeigt den Grund statt eines Knopfs, der sicher abgelehnt würde', async () => {
  const liste = document.getElementById('capabilities-library')
  await liste.ausloesen('click', { target: klickZiel({ dataset: { libraryId: 'context7-mcp' } }, ['data-library-id']) })
  const html = document.getElementById('library-detail').innerHTML
  assert.doesNotMatch(html, /data-installation-aktion/)
  assert.match(html, /Über die Workforce heute nicht installierbar: wirkung &#39;extern_lesend&#39;/)
})

test('Library: Laden leert Kennzahlen, Chips, Hinweis und Detail des letzten Stands (Projektwechsel)', async () => {
  const { zeigeCapabilityLibraryLaedt } = await import('./capability-library.js')
  zeigeCapabilityLibraryLaedt()
  for (const id of ['capabilities-kennzahlen', 'library-filter-typ', 'library-filter-status', 'library-detail']) assert.equal(document.getElementById(id).innerHTML, '', id)
  assert.equal(document.getElementById('library-hinweis').hidden, true)
})

test('Harness: späte Antwort einer Datei überschreibt ein danach gewähltes Ordnerdetail nicht (Überholschutz)', async () => {
  let freigeben
  warteAufClaude = new Promise((ok) => {
    freigeben = ok
  })
  const skelett = document.getElementById('harness-skelett')
  const klick = (pfad, art) => skelett.ausloesen('click', { target: klickZiel({ dataset: { harnessPfad: pfad, harnessArt: art }, classList: { contains: () => false } }, ['data-harness-pfad']) })
  await klick('CLAUDE.md', 'datei')
  await klick('.claude/agents', 'ordner')
  freigeben()
  warteAufClaude = null
  await warte()
  await warte()
  const detail = document.getElementById('harness-detail').innerHTML
  assert.match(detail, /harness-ordner-liste/, 'Ordnerdetail bleibt')
  assert.doesNotMatch(detail, /SPAET/)
})

test('Harness: eine Datei, die nicht mehr in der Liste steht (400), erscheint als „nicht mehr vorhanden“', async () => {
  const skelett = document.getElementById('harness-skelett')
  await skelett.ausloesen('click', { target: klickZiel({ dataset: { harnessPfad: 'ARCHITECTURE.md', harnessArt: 'datei' }, classList: { contains: () => false } }, ['data-harness-pfad']) })
  await warte()
  const detail = document.getElementById('harness-detail').innerHTML
  assert.match(detail, /Die Datei ist nicht mehr vorhanden/)
  assert.doesNotMatch(detail, /note red/)
})

test('Harness: Projektwechsel verwirft Auswahl und Detail des alten Projekts; eine Antwort ohne bausteine ist ein Fehler', () => {
  setzeHarnessZurueck()
  assert.match(document.getElementById('harness-detail').innerHTML, /harness-detail-leer/)
  assert.throws(() => renderHarness({ status: 'ok' }), /ohne bausteine/)
})
