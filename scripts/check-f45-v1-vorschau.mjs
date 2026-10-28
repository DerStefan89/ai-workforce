/**
 * Datei: scripts/check-f45-v1-vorschau.mjs
 *
 * Zweck: Gate für F45 V1 „Live-Vorschau des Projekts im Leitstand (Stufe 1)“ (features/F45/plan-v1.md, plan-v1-v2.md).
 * Prüft, je mit einem Rotfall im Gate selbst:
 *   (a) iframe nur auf die geprüfte localhost-URL: bei erreichbarer, zulässiger URL genau ein <iframe>, src = diese URL,
 *       sandbox exakt „allow-scripts allow-same-origin allow-forms“ (kein allow-top-navigation, kein allow-popups);
 *   (b) unerreichbar, keine URL, nicht zulässig (Leitstand-Port), Abruffehler, fremder Host, https, ohne Port ⇒ kein
 *       iframe, sondern „Start Building“ mit Weg zu #/projekt;
 *   (c) public/leitstand/index.html trägt im <head> genau eine meta-CSP mit exakt
 *       „frame-src http://localhost:* http://127.0.0.1:*“ — ohne 'self' (Entscheidung Stefan 28.10.2026);
 *   (d) kein Erreichbarkeitsaufruf im Poll-Pfad: vorschau-panel.js importiert weder zustand.js noch api.js; in
 *       views/dashboard.js steht der Ladeaufruf des Panels (vorschau.lade) nur in ladeAlles, nicht in render() und nicht im
 *       abonniere-Rückruf, und render() nennt #uebersicht-vorschau nicht;
 *   (e) Rahmen-Schutz: pruefeRahmen (rahmen-schutz.js) wirft bei simuliertem window.top !== window.self und ersetzt den
 *       Seiteninhalt durch den Hinweis, ohne Rahmen nicht; app.js importiert rahmen-schutz.js als ersten Import.
 *
 * Durchsetzungsgrad: ERZWUNGEN für (a)–(e) wie beschrieben. DEKLARIERT: (c) zählt nur meta-CSP in der Schreibweise
 * http-equiv vor content mit doppelten Anführungszeichen; (d) erkennt andere Aufrufformen nicht (Alias,
 * Umweg über eine Hilfsfunktion, Aufruf aus einem anderen Modul); (c) prüft den Text, nicht die Wirkung im Browser (die
 * zeigt der Render-Nachweis features/F45/nachweise/v1/). Ein Header-Schutz (frame-ancestors, X-Frame-Options) ist bewusst
 * NICHT gesetzt — Serveränderung außerhalb des Umfangs (Wachstumsbremse, ARCHITECTURE.md §1); das Restrisiko, dass eine
 * eingebettete App ihren Frame per Weiterleitung auf den Leitstand-Port umlenkt (die CSP lässt http://localhost:* zu),
 * deckt der Rahmen-Schutz (e) ab: der Leitstand startet im Rahmen nicht.
 *
 * Wird aufgerufen von: npm run check (scripts/check-kette.mjs).
 *
 * Aufruf: node scripts/check-f45-v1-vorschau.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { readFileSync } from 'node:fs'
import { pruefeRahmen } from '../public/leitstand/rahmen-schutz.js'
import { VORSCHAU_SANDBOX, vorschauHtml, vorschauZustand } from '../public/leitstand/vorschau-panel.js'

console.log('\n=== F45-V1-Vorschau-Check ===\n')
const befunde = []
const CSP = 'frame-src http://localhost:* http://127.0.0.1:*'
const SANDBOX = 'allow-scripts allow-same-origin allow-forms'
const LEITSTAND_PORT = '4173'

/** Liest eine Datei mit LF-Zeilenenden (Arbeitskopie unter Windows ggf. CRLF). @param pfad - Pfad @returns Text */
const lies = (pfad) => readFileSync(pfad, 'utf8').replace(/\r\n/g, '\n')

/** @param bedingung - erwartet @param ok - Meldung @param fehler - Befund */
function pruefe(bedingung, ok, fehler) {
  if (bedingung) console.log(`✓ ${ok}`)
  else befunde.push(fehler)
}

/**
 * Befunde zu (a) für ein HTML, das genau die URL einbetten soll.
 * @param html - Karte c @param url - geprüfte URL @returns Liste der Mängel
 */
function maengelIframe(html, url) {
  const rahmen = [...html.matchAll(/<iframe\b[^>]*>/g)].map((t) => t[0])
  if (rahmen.length !== 1) return [`${rahmen.length} iframes statt 1`]
  const m = []
  if (/<iframe\b[^>]*\bsrc="([^"]*)"/.exec(rahmen[0])?.[1] !== url) m.push('src ist nicht die geprüfte URL')
  const sandbox = /\bsandbox="([^"]*)"/.exec(rahmen[0])?.[1]
  if (sandbox !== SANDBOX) m.push(`sandbox „${sandbox}“`)
  if (/allow-top-navigation|allow-popups/.test(sandbox ?? '')) m.push('sandbox erlaubt Top-Navigation oder Pop-ups')
  return m
}

/** @param html - Karte c @returns Mängel zu (b) */
function maengelStart(html) {
  const m = []
  if (/<iframe\b/.test(html)) m.push('iframe vorhanden')
  if (!html.includes('Start Building')) m.push('„Start Building“ fehlt')
  if (!html.includes('href="#/projekt"')) m.push('Weg zu #/projekt fehlt')
  return m
}

/** @param html - index.html @returns Mängel zu (c) */
function maengelCsp(html) {
  const kopf = html.slice(0, html.indexOf('</head>'))
  const metas = [...html.matchAll(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"/gi)]
  if (metas.length !== 1) return [`${metas.length} meta-CSP statt 1`]
  const m = []
  if (!kopf.includes(metas[0][0])) m.push('meta-CSP nicht im <head>')
  if (metas[0][1] !== CSP) m.push(`Inhalt „${metas[0][1]}“`)
  if (metas[0][1].includes("'self'")) m.push("'self' enthalten")
  return m
}

/**
 * Rumpf einer Funktion (Deklaration `function name(`) bis zur ersten Zeile `}` am Zeilenanfang.
 * @param quelltext - Datei @param name - Funktionsname @returns Rumpf oder null
 */
function rumpf(quelltext, name) {
  const start = quelltext.search(
    new RegExp(`\\nfunction ${name}\\(|\\nexport function ${name}\\(|\\nasync function ${name}\\(`)
  )
  if (start < 0) return null
  const ende = quelltext.indexOf('\n}\n', start)
  return quelltext.slice(start, ende < 0 ? undefined : ende)
}

/** @param dashboard - Quelltext views/dashboard.js @param panel - Quelltext vorschau-panel.js @returns Mängel zu (d) */
function maengelPoll(dashboard, panel) {
  const m = []
  if (/from\s+['"]\.\/(zustand|api)\.js['"]/.test(panel)) m.push('vorschau-panel.js importiert zustand.js oder api.js')
  const render = rumpf(dashboard, 'render')
  const lade = rumpf(dashboard, 'ladeAlles')
  if (render === null || lade === null) return [...m, 'render() oder ladeAlles() nicht gefunden']
  if (/vorschau\.|holeProjektAufruf/.test(render)) m.push('render() ruft die Vorschau auf')
  if (render.includes('uebersicht-vorschau')) m.push('render() schreibt #uebersicht-vorschau')
  const abonniert = /abonniere\(\(zustand\) => \{([\s\S]*?)\n {2}\}\)/.exec(dashboard)?.[1] ?? null
  if (abonniert === null) m.push('abonniere-Rückruf nicht gefunden (fail-closed)')
  else if (/vorschau\.|holeProjektAufruf/.test(abonniert)) m.push('der abonniere-Rückruf ruft die Vorschau auf')
  if (!/vorschau\.lade\(/.test(lade)) m.push('ladeAlles() lädt die Vorschau nicht')
  const aufrufe = dashboard.match(/vorschau\.lade\(/g)?.length ?? 0
  if (aufrufe !== 1) m.push(`vorschau.lade( steht ${aufrufe}-mal in dashboard.js (erwartet genau einmal, in ladeAlles)`)
  return m
}

/** @param app - Quelltext app.js @returns Mängel zu (e), statischer Teil */
function maengelAppImport(app) {
  const erster = /^import\s+(?:[^'"]*from\s+)?['"]([^'"]+)['"]/m.exec(app)?.[1]
  return erster === './rahmen-schutz.js' ? [] : [`erster Import von app.js ist ${erster ?? 'keiner'}`]
}

/**
 * (e) Verhalten mit simuliertem Fenster.
 * @param imRahmen - true simuliert window.top !== window.self
 * @returns { geworfen, body }
 */
function rahmenFall(imRahmen) {
  const fenster = { self: {}, top: null }
  fenster.top = imRahmen ? {} : fenster.self
  const dokument = { body: { innerHTML: '<div id="shell">Leitstand</div>' } }
  let geworfen = false
  try {
    pruefeRahmen(fenster, dokument, () => 'de')
  } catch {
    geworfen = true
  }
  return { geworfen, body: dokument.body.innerHTML }
}

// ─── (a) ──────────────────────────────────────────────────────────────────────
for (const url of ['http://127.0.0.1:3000', 'http://localhost:5173']) {
  const zustand = vorschauZustand({ vorschau: { url, erreichbar: true, grund: 'HTTP 200' } }, LEITSTAND_PORT)
  const m = zustand.art === 'vorschau' ? maengelIframe(vorschauHtml(zustand, 'P'), url) : ['kein iframe']
  pruefe(
    m.length === 0,
    `(a) ${url} erreichbar ⇒ genau ein iframe auf diese URL, sandbox exakt`,
    `(a) ${url}: ${m.join('; ')}`
  )
}
pruefe(VORSCHAU_SANDBOX === SANDBOX, '(a) VORSCHAU_SANDBOX unverändert', `(a) VORSCHAU_SANDBOX „${VORSCHAU_SANDBOX}“`)
const rotA = [
  [
    'fremdes src',
    '<iframe src="http://evil.test:3000" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>',
  ],
  [
    'Top-Navigation',
    '<iframe src="http://127.0.0.1:3000" sandbox="allow-scripts allow-same-origin allow-forms allow-top-navigation"></iframe>',
  ],
  [
    'zwei iframes',
    '<iframe src="http://127.0.0.1:3000" sandbox="allow-scripts allow-same-origin allow-forms"></iframe><iframe src="x"></iframe>',
  ],
  ['ohne sandbox', '<iframe src="http://127.0.0.1:3000"></iframe>'],
]
for (const [name, html] of rotA)
  pruefe(
    maengelIframe(html, 'http://127.0.0.1:3000').length > 0,
    `(a) Rotfall „${name}“ gemeldet`,
    `(a) Rotfall „${name}“ nicht gemeldet`
  )

// ─── (b) ──────────────────────────────────────────────────────────────────────
const startFaelle = [
  ['nicht erreichbar', { vorschau: { url: 'http://127.0.0.1:3000', erreichbar: false, grund: 'ECONNREFUSED' } }],
  ['keine URL', { vorschau: { url: null, erreichbar: null, grund: 'keine vorschau_url gesetzt' } }],
  [
    'nicht zulässig',
    { vorschau: { url: `http://127.0.0.1:${LEITSTAND_PORT}`, erreichbar: null, grund: 'nicht zulässig' } },
  ],
  [
    'Leitstand-Port trotz erreichbar',
    { vorschau: { url: `http://localhost:${LEITSTAND_PORT}`, erreichbar: true, grund: 'HTTP 200' } },
  ],
  ['Abruffehler', null],
  ['fremder Host', { vorschau: { url: 'http://example.com:3000', erreichbar: true, grund: 'HTTP 200' } }],
  ['https', { vorschau: { url: 'https://localhost:3000', erreichbar: true, grund: 'HTTP 200' } }],
  ['ohne Port', { vorschau: { url: 'http://localhost', erreichbar: true, grund: 'HTTP 200' } }],
]
for (const [name, antwort] of startFaelle) {
  const m = maengelStart(vorschauHtml(vorschauZustand(antwort, LEITSTAND_PORT), 'P'))
  pruefe(m.length === 0, `(b) ${name} ⇒ Start Building ohne iframe`, `(b) ${name}: ${m.join('; ')}`)
}
pruefe(
  maengelStart('<iframe src="http://127.0.0.1:3000"></iframe>').length > 0,
  '(b) Rotfall „iframe statt Start Building“ gemeldet',
  '(b) Rotfall nicht gemeldet'
)

// ─── (c) ──────────────────────────────────────────────────────────────────────
const index = lies('public/leitstand/index.html')
const mc = maengelCsp(index)
pruefe(
  mc.length === 0,
  "(c) index.html: genau eine meta-CSP im <head>, nur frame-src, ohne 'self'",
  `(c) index.html: ${mc.join('; ')}`
)
const rotC = [
  ['fehlt', '<html><head></head></html>'],
  [
    "mit 'self'",
    `<head><meta http-equiv="Content-Security-Policy" content="frame-src 'self' http://localhost:* http://127.0.0.1:*" /></head>`,
  ],
  [
    'weitere Direktive',
    `<head><meta http-equiv="Content-Security-Policy" content="${CSP}; script-src 'self'" /></head>`,
  ],
  ['im body', `<head></head><body><meta http-equiv="Content-Security-Policy" content="${CSP}" /></body>`],
]
for (const [name, html] of rotC)
  pruefe(maengelCsp(html).length > 0, `(c) Rotfall „${name}“ gemeldet`, `(c) Rotfall „${name}“ nicht gemeldet`)

// ─── (d) ──────────────────────────────────────────────────────────────────────
const dashboard = lies('public/leitstand/views/dashboard.js')
const panel = lies('public/leitstand/vorschau-panel.js')
const md = maengelPoll(dashboard, panel)
pruefe(
  md.length === 0,
  '(d) Vorschau-Prüfung nur in ladeAlles, nicht im Poll-Pfad; Panel ohne zustand.js/api.js',
  `(d) ${md.join('; ')}`
)
const rotD = [
  [
    'Aufruf in render()',
    dashboard.replace(/\nfunction render\(\) \{\n/, '\nfunction render() {\n  void vorschau.lade(1, 2)\n'),
  ],
  ['Panel importiert zustand.js', null],
  [
    'Aufruf im abonniere-Rückruf',
    dashboard.replace('abonniere((zustand) => {\n', 'abonniere((zustand) => {\n    void vorschau.neuLaden()\n'),
  ],
]
for (const [name, quelltext] of rotD) {
  const m =
    quelltext === null
      ? maengelPoll(dashboard, `${panel}\nimport { abonniere } from './zustand.js'\n`)
      : maengelPoll(quelltext, panel)
  pruefe(
    m.length > 0 && (quelltext === null || quelltext !== dashboard),
    `(d) Rotfall „${name}“ gemeldet`,
    `(d) Rotfall „${name}“ nicht gemeldet`
  )
}

// ─── (e) ──────────────────────────────────────────────────────────────────────
const imRahmen = rahmenFall(true)
pruefe(
  imRahmen.geworfen && !imRahmen.body.includes('Leitstand</div>') && imRahmen.body.includes('rahmen-hinweis'),
  '(e) im Rahmen: Start abgebrochen, nur der Hinweis',
  `(e) im Rahmen: ${JSON.stringify(imRahmen)}`
)
const ohneRahmen = rahmenFall(false)
pruefe(
  !ohneRahmen.geworfen && ohneRahmen.body.includes('Leitstand</div>'),
  '(e) ohne Rahmen: Leitstand unverändert',
  `(e) ohne Rahmen: ${JSON.stringify(ohneRahmen)}`
)
const app = lies('public/leitstand/app.js')
const me = maengelAppImport(app)
pruefe(me.length === 0, '(e) app.js: rahmen-schutz.js ist der erste Import', `(e) ${me.join('; ')}`)
const rotE = app
  .replace("import './rahmen-schutz.js'\n", '')
  .replace(
    "import { initKommt } from './kommt.js'\n",
    "import { initKommt } from './kommt.js'\nimport './rahmen-schutz.js'\n"
  )
pruefe(
  maengelAppImport(rotE).length > 0,
  '(e) Rotfall „rahmen-schutz.js nicht zuerst“ gemeldet',
  '(e) Rotfall „rahmen-schutz.js nicht zuerst“ nicht gemeldet'
)

if (befunde.length > 0) {
  console.log('\nBefunde:')
  for (const b of befunde) console.log(`  - ${b}`)
  process.exit(1)
}
console.log('\n✓ Keine Befunde.')
