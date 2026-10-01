/**
 * Datei: public/leitstand/projekt-wechsel.test.mjs
 *
 * Zweck: node:test-Fälle für den zentralen Neuladen-Hook beim Projektwechsel (F44 WS-1a, F-860).
 * Nach setzeAktivesProjekt() laden Workboard (Workitems, Roadmap), Dashboard (P0/P1, Verbrauch)
 * und Direktstart (Aufträge, Werkzeugsätze) mit dem Präfix des NEUEN Projekts neu; eine späte
 * Antwort des alten Projekts überschreibt die Auswahlliste des neuen nicht (Überholschutz). Eine
 * Zustandsabfrage (Poll), die vor dem Wechsel begann, wird verworfen; Workboard-Filter und eine
 * vorbereitete Wiederaufnahme im Direktstart gehen beim Wechsel zurück (Korrekturrunde WS-1a).
 * F44 WS-2a: „Deine Entscheidungen“ (P0/P1-Workitems) und die Seite #/roadmap (Roadmap und
 * Feature-Workitems) laden beim Wechsel ebenfalls neu. F44 WS-2b: Die Übersicht lädt Roadmap, alle
 * Workitems und P0/P1 neu (nie aus dem Poll; eine späte Roadmap-Antwort des alten Projekts wird
 * verworfen); der Verbrauch ist auf #/nutzung umgezogen (views/nutzung.js). F44 WS-3a: Die Seite
 * „Entwicklung“ lädt statt der Roadmap (Bento entfernt, F-892) die Aufträge für die Verknüpfung
 * Workitem ↔ Workflow — beim Betreten und beim Wechsel, nie aus dem Poll; das Board ordnet ein
 * Finding mit wartendem Workflow „Braucht dich“ zu.
 *
 * Die echten View-Module laufen gegen ein minimales Schein-DOM (jede id liefert ein
 * gleichbleibendes Schein-Element) und ein aufzeichnendes fetch — kein Browser, kein Server.
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 *
 * Wichtig: Die Globals (document, window, location, Storage, fetch) müssen VOR dem Import der
 * Module stehen — projekt-kontext.js liest sessionStorage bereits beim Laden. Deshalb dynamische
 * Importe unten.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'

/**
 * Baut ein Schein-Element mit den DOM-Methoden, die die Views beim Init und Laden benutzen.
 * @param id - Element-id (nur zur Fehlersuche)
 * @returns Schein-Element
 */
function scheinElement(id = '') {
  return {
    id,
    hidden: false,
    innerHTML: '',
    textContent: '',
    value: '',
    disabled: false,
    options: [],
    selectedIndex: -1,
    dataset: {},
    style: {},
    parentElement: { hidden: false },
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    // F44 WS-3a: Handler je Ereignistyp, damit ein Test einen Klick auf ein Register auslösen kann.
    handler: {},
    addEventListener(typ, fn) {
      this.handler[typ] = fn
    },
    removeEventListener() {},
    setAttribute() {},
    getAttribute: () => null,
    removeAttribute() {},
    querySelector: () => null,
    querySelectorAll: () => [],
    closest: () => null,
    contains: () => false,
    appendChild: (kind) => kind,
    append() {},
    prepend() {},
    insertAdjacentHTML() {},
    remove() {},
    focus() {},
    scrollIntoView() {},
  }
}

const elemente = new Map()
const speicher = () => {
  const werte = new Map()
  return { getItem: (s) => werte.get(s) ?? null, setItem: (s, w) => werte.set(s, String(w)), removeItem: (s) => werte.delete(s) }
}

globalThis.document = {
  getElementById(id) {
    if (!elemente.has(id)) elemente.set(id, scheinElement(id))
    return elemente.get(id)
  },
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => scheinElement(),
  addEventListener() {},
  documentElement: scheinElement('html'),
  head: scheinElement('head'),
  body: scheinElement('body'),
  activeElement: null,
}
Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true, writable: true })
// F44 WS-3a: views/workboard.js merkt sich über hashchange das Verlassen der Seite.
const hashchangeHandler = []
globalThis.addEventListener = (typ, fn) => {
  if (typ === 'hashchange') hashchangeHandler.push(fn)
}
Object.defineProperty(globalThis, 'location', { value: { hash: '#/workboard' }, configurable: true, writable: true })
Object.defineProperty(globalThis, 'sessionStorage', { value: speicher(), configurable: true, writable: true })
Object.defineProperty(globalThis, 'localStorage', { value: speicher(), configurable: true, writable: true })

/** Aufgezeichnete fetch-URLs. */
const aufrufe = []
/** Zurückgehaltene Antworten: URL-Präfix → { freigeben } — für den Überholschutz-Fall. */
const zurueckgehalten = new Map()

/**
 * Antwortkörper je Endpunkt — genug, damit die Views ohne Fehler rendern.
 * @param url - angefragte URL
 * @returns JSON-Körper
 */
function koerperFuer(url) {
  // F44 WS-3a: projekt-v hat ein offenes Finding, dessen Workflow (über den Auftrag) auf Freigabe wartet.
  if (url.includes('/projekte/projekt-v/workitems'))
    return { workitems: [{ quelle: 'finding', typ: 'BUG', id: 'F-1', titel: 'Wartender Befund', status: 'OFFEN', statusRoh: 'offen', prioritaet: 'P1' }], befunde: [], fehler: [] }
  if (url.includes('/projekte/projekt-v/auftraege')) return [{ auftragId: 'a-v', titel: 'Auftrag V', erstellt_am: 'x', workitem_referenz: 'workitem:finding:F-1' }]
  if (url.includes('/projekte/projekt-v/zustand'))
    return { herkunft: url, laeufe: [], startfehler: [], workflows: [{ workflowId: 'w-v', auftragId: 'a-v', status: 'LAEUFT', ziel: 'Ziel V', naechster: { art: 'haltFreigabe', schrittId: 's1' } }], fehler: [], aktiverLauf: { aktiv: false, laufId: null } }
  // F44 WS-3a: Listenabruf (Tab Bugs) von projekt-q mit Parser-Befund — für den Überholschutz der Liste.
  if (url.includes('/projekte/projekt-q/workitems?typ=BUG'))
    return { workitems: [{ quelle: 'finding', typ: 'BUG', id: 'F-1', titel: 'Befund aus Q', status: 'OFFEN', statusRoh: 'offen', prioritaet: 'P1' }], befunde: [{ meldung: 'Parser-Befund aus Q' }], fehler: [] }
  if (url.includes('/workitems')) return { workitems: [], befunde: [], fehler: [] }
  // F44 WS-2b: eine gültige Roadmap nur für projekt-l — für den Überholschutz-Fall der Übersicht.
  if (url.includes('/projekte/projekt-l/roadmap')) return { status: 'ok', vision: 'Vision von L', meilensteine: [] }
  if (url.includes('/roadmap')) return { status: 'nicht_vorhanden' }
  if (url.includes('/verbrauch')) return { status: 'ok' }
  if (url.includes('/auftraege')) return url.includes('projekt-b') ? [{ auftragId: 'b-1', titel: 'Auftrag B', erstellt_am: 'x' }] : [{ auftragId: 'a-1', titel: 'Auftrag A', erstellt_am: 'x' }]
  if (url.includes('/startvorlage/werkzeugsaetze')) return []
  // F44 WS-2b (F-903): projekt-w hat einen wartenden Workflow, projekt-x eine defekte Workflow-Quelle.
  if (url.includes('/projekte/projekt-w/zustand'))
    return { herkunft: url, laeufe: [], startfehler: [], workflows: [{ workflowId: 'w-1', status: 'LAEUFT', ziel: 'Wartet auf Freigabe', naechster: { art: 'haltFreigabe', schrittId: 's1' } }], fehler: [], aktiverLauf: { aktiv: false, laufId: null } }
  if (url.includes('/projekte/projekt-x/zustand')) return { herkunft: url, laeufe: [], startfehler: [], workflows: null, fehler: [{ quelle: 'workflows', grund: 'Test' }], aktiverLauf: { aktiv: false, laufId: null } }
  if (url.includes('/zustand')) return { herkunft: url, laeufe: [], startfehler: [], workflows: [], fehler: [], aktiverLauf: { aktiv: false, laufId: null } }
  return {}
}

globalThis.fetch = (url) => {
  aufrufe.push(String(url))
  const antwort = { ok: true, status: 200, json: async () => koerperFuer(String(url)) }
  for (const [praefix, halt] of zurueckgehalten) {
    if (String(url).startsWith(praefix)) return new Promise((ok) => halt.push(() => ok(antwort)))
  }
  return Promise.resolve(antwort)
}

/** Lässt alle anstehenden Promise-Ketten durchlaufen. */
const warte = () => new Promise((ok) => setTimeout(ok, 20))

const { setzeAktivesProjekt } = await import('./projekt-kontext.js')
const { initWorkboardView } = await import('./views/workboard.js')
const { initDashboardView } = await import('./views/dashboard.js')
const { initProjektView, wendeWiederaufnahmeAn } = await import('./views/projekt.js')
const { abonniere } = await import('./zustand.js')
const { initAttentionView } = await import('./views/attention.js')
const { initRoadmapView } = await import('./views/roadmap.js')
const { initNutzungView } = await import('./views/nutzung.js')

initWorkboardView()
initDashboardView()
initProjektView()
initAttentionView()
initRoadmapView()
initNutzungView()
await warte()

test('F-860: nach dem Projektwechsel laden Workboard, Dashboard und Direktstart mit dem neuen Präfix', async () => {
  aufrufe.length = 0
  setzeAktivesProjekt({ id: 'projekt-b', name: 'Projekt B' })
  await warte()

  const neu = '/api/projekte/projekt-b'
  const erwartet = {
    'Workboard Workitems (ungefiltert)': (u) => u === `${neu}/workitems` || u === `${neu}/workitems?`,
    'Dashboard P0/P1 (status=OFFEN)': (u) => u.startsWith(`${neu}/workitems?`) && u.includes('status=OFFEN'),
    'Nutzung Verbrauch': (u) => u.startsWith(`${neu}/verbrauch`),
    'Direktstart Aufträge': (u) => u === `${neu}/auftraege`,
    'Direktstart Werkzeugsätze': (u) => u === `${neu}/startvorlage/werkzeugsaetze`,
  }
  for (const [name, passt] of Object.entries(erwartet)) {
    assert.ok(aufrufe.some(passt), `${name} wurde nach dem Wechsel nicht mit ${neu} geladen; Aufrufe: ${aufrufe.join(', ')}`)
  }
  // F44 WS-3a: Aufträge laden Direktstart UND Workboard (Verknüpfung Workitem ↔ Workflow).
  assert.ok(aufrufe.filter((u) => u === `${neu}/auftraege`).length >= 2, `Workboard lädt die Aufträge nicht neu; Aufrufe: ${aufrufe.join(', ')}`)
  assert.deepEqual(
    aufrufe.filter((u) => !u.startsWith(neu)),
    [],
    'nach dem Wechsel darf kein Lader mehr das alte Projekt (Präfix /api) abfragen'
  )
})

test('F-860: eine späte Antwort des alten Projekts überschreibt die Auftragsliste des neuen nicht', async () => {
  // Zurück zum Standardprojekt, dessen Antwort zurückgehalten wird; danach sofort Wechsel nach B.
  const halt = []
  zurueckgehalten.set('/api/auftraege', halt)
  setzeAktivesProjekt({ id: 'ai-workforce', name: 'AI Workforce' })
  setzeAktivesProjekt({ id: 'projekt-b', name: 'Projekt B' })
  await warte()
  assert.match(document.getElementById('start-auftrag').innerHTML, /Auftrag B/)

  for (const freigeben of halt) freigeben()
  zurueckgehalten.clear()
  await warte()
  const liste = document.getElementById('start-auftrag').innerHTML
  assert.match(liste, /Auftrag B/, 'die Liste des neuen Projekts bleibt stehen')
  assert.doesNotMatch(liste, /Auftrag A/, 'die späte Antwort des alten Projekts wird verworfen')
})

test('F-860: ein werfender Abonnent blockiert die übrigen nicht', async () => {
  const { abonniereProjektWechsel } = await import('./projekt-kontext.js')
  const fehlerAusgabe = console.error
  console.error = () => {}
  try {
    let einmal = true
    abonniereProjektWechsel(() => {
      if (!einmal) return
      einmal = false
      throw new Error('Testfehler')
    })
    let nachher = false
    abonniereProjektWechsel(() => {
      nachher = true
    })
    setzeAktivesProjekt({ id: 'projekt-c', name: 'Projekt C' })
    assert.equal(nachher, true)
  } finally {
    console.error = fehlerAusgabe
  }
  await warte()
})

test('F-860: eine Zustandsabfrage, die vor dem Wechsel begann, wird verworfen; der Nachlauf holt das neue Projekt', async () => {
  const erhalten = []
  abonniere((zustand) => erhalten.push(zustand.herkunft))
  setzeAktivesProjekt({ id: 'projekt-b', name: 'Projekt B' })
  await warte()
  erhalten.length = 0

  const halt = []
  zurueckgehalten.set('/api/projekte/projekt-b/zustand', halt)
  const { pollJetzt } = await import('./zustand.js')
  const alterTick = pollJetzt()
  zurueckgehalten.clear()
  setzeAktivesProjekt({ id: 'projekt-c', name: 'Projekt C' })
  for (const freigeben of halt) freigeben()
  await alterTick
  await warte()
  assert.ok(!erhalten.some((u) => u.includes('projekt-b')), `Aggregat des alten Projekts verteilt: ${erhalten.join(', ')}`)
  assert.ok(erhalten.some((u) => u.includes('projekt-c')), `kein Aggregat des neuen Projekts: ${erhalten.join(', ')}`)
})

test('F-860: Workboard-Filter gehen beim Wechsel auf „Alle“ zurück — der erste Abruf im neuen Projekt ist ungefiltert', async () => {
  const typ = document.getElementById('workboard-filter-typ')
  // Die Chip-Gruppe liest ihren gewählten Wert per querySelector aus ihrem eigenen Markup.
  typ.querySelector = (selektor) => {
    const treffer = selektor.includes('aria-pressed="true"') ? typ.innerHTML.match(/data-wert="([^"]*)" aria-pressed="true"/) : null
    return treffer ? { dataset: { wert: treffer[1] } } : null
  }
  typ.innerHTML = '<button type="button" class="filter-chip" data-wert="" aria-pressed="false">Alle</button><button type="button" class="filter-chip" data-wert="BUG" aria-pressed="true">BUG</button>'
  aufrufe.length = 0
  setzeAktivesProjekt({ id: 'projekt-d', name: 'Projekt D' })
  await warte()
  assert.match(typ.innerHTML, /data-wert="" aria-pressed="true">Alle/)
  // Ausgenommen: P0/P1 (Dashboard, Entscheidungen) und typ=FEATURE der Roadmap-Seite (F44 WS-2a) —
  // der gesetzte Workboard-Filter war BUG.
  const workitemAbrufe = aufrufe.filter((u) => u.startsWith('/api/projekte/projekt-d/workitems') && !u.includes('status=OFFEN') && !u.includes('typ=FEATURE'))
  assert.ok(workitemAbrufe.length > 0, 'Workboard lädt die Workitems des neuen Projekts')
  assert.ok(workitemAbrufe.every((u) => !u.includes('typ=')), `Filter des alten Projekts im Abruf: ${workitemAbrufe.join(', ')}`)
})

test('F-860: Dashboard zeigt nach dem Wechsel „Lädt…“ statt der Kennzahlen des alten Projekts', async () => {
  const dashboard = document.getElementById('view-dashboard')
  dashboard.innerHTML = '<div class="dashboard-kennzahlen">233 Läufe</div>'
  const halt = []
  zurueckgehalten.set('/api/projekte/projekt-f/zustand', halt)
  setzeAktivesProjekt({ id: 'projekt-f', name: 'Projekt F' })
  assert.match(dashboard.innerHTML, /Lädt…/)
  assert.doesNotMatch(dashboard.innerHTML, /233 Läufe/)
  zurueckgehalten.clear()
  for (const freigeben of halt) freigeben()
  await warte()
})

test('F-860: Workboard schließt beim Wechsel ein offenes Detail samt Bearbeitungsbereich', async () => {
  document.getElementById('workboard-detail').hidden = false
  document.getElementById('workboard-bearbeitung').innerHTML = '<p>Vorschlag aus dem alten Projekt</p>'
  setzeAktivesProjekt({ id: 'projekt-g', name: 'Projekt G' })
  await warte()
  assert.equal(document.getElementById('workboard-detail').hidden, true)
  assert.equal(document.getElementById('workboard-bearbeitung').innerHTML, '')
})

test('F-860: ein Wechsel während der Wiederaufnahme-Vorbelegung belegt das neue Projekt nicht vor', async () => {
  setzeAktivesProjekt({ id: 'projekt-h', name: 'Projekt H' })
  await warte()
  const hinweis = document.getElementById('start-wiederaufnahme-hinweis')
  hinweis.hidden = true
  const halt = []
  zurueckgehalten.set('/api/projekte/projekt-h/auftraege', halt)
  const vorbelegung = wendeWiederaufnahmeAn({ auftrag: { status: 'ok', auftragId: 'h-1' }, kontextpaket: { status: 'fehlt' } }, 'lauf-aus-h', 'projekt-h')
  zurueckgehalten.clear()
  setzeAktivesProjekt({ id: 'projekt-i', name: 'Projekt I' })
  for (const freigeben of halt) freigeben()
  await vorbelegung
  await warte()
  assert.equal(hinweis.hidden, true, 'die Vorgänger-laufId aus Projekt H darf im Projekt I nicht gesetzt werden')
})

test('F-860: eine vorbereitete Wiederaufnahme des alten Projekts wird beim Wechsel verworfen', async () => {
  await wendeWiederaufnahmeAn({ auftrag: { status: 'fehlt' }, kontextpaket: { status: 'fehlt' } }, 'alter-lauf')
  assert.equal(document.getElementById('start-wiederaufnahme-hinweis').hidden, false)
  setzeAktivesProjekt({ id: 'projekt-e', name: 'Projekt E' })
  await warte()
  assert.equal(document.getElementById('start-wiederaufnahme-hinweis').hidden, true)
})

test('F44 WS-2a: Entscheidungen und Roadmap-Seite laden nach dem Wechsel mit dem neuen Präfix', async () => {
  aufrufe.length = 0
  setzeAktivesProjekt({ id: 'projekt-c', name: 'Projekt C' })
  await warte()

  const neu = '/api/projekte/projekt-c'
  const anzahl = (passt) => aufrufe.filter(passt).length
  // P0/P1 laden Dashboard UND Entscheidungen, die Roadmap Roadmap-Seite UND Übersicht (F44 WS-3a: ohne Bento).
  assert.ok(anzahl((u) => u.startsWith(`${neu}/workitems?`) && u.includes('status=OFFEN')) >= 2, `Entscheidungen laden P0/P1 nicht neu; Aufrufe: ${aufrufe.join(', ')}`)
  assert.ok(anzahl((u) => u === `${neu}/roadmap`) >= 2, `Roadmap-Seite lädt nicht neu; Aufrufe: ${aufrufe.join(', ')}`)
  assert.ok(anzahl((u) => u.startsWith(`${neu}/workitems?`) && u.includes('typ=FEATURE')) >= 1, 'Roadmap-Seite lädt die Feature-Workitems nicht neu')
  assert.deepEqual(
    aufrufe.filter((u) => !u.startsWith(neu)),
    [],
    'nach dem Wechsel darf kein Lader mehr ein anderes Projekt abfragen'
  )
  assert.match(document.getElementById('view-roadmap').innerHTML, /Projekt C · Roadmap/)
})

test('F44 WS-2b: die Übersicht lädt nach dem Wechsel Roadmap, alle Workitems und P0/P1 mit dem neuen Präfix', async () => {
  aufrufe.length = 0
  setzeAktivesProjekt({ id: 'projekt-j', name: 'Projekt J' })
  await warte()
  const neu = '/api/projekte/projekt-j'
  const anzahl = (passt) => aufrufe.filter(passt).length
  // Roadmap: Roadmap-Seite und Übersicht (F44 WS-3a: die Bento-Karte im Workboard ist entfernt);
  // ungefilterte Workitems: Workboard und Übersicht.
  assert.ok(anzahl((u) => u === `${neu}/roadmap`) >= 2, `Übersicht lädt die Roadmap nicht neu; Aufrufe: ${aufrufe.join(', ')}`)
  assert.ok(anzahl((u) => u === `${neu}/workitems` || u === `${neu}/workitems?`) >= 2, `Übersicht lädt die Workitems nicht neu; Aufrufe: ${aufrufe.join(', ')}`)
  assert.deepEqual(
    aufrufe.filter((u) => !u.startsWith(neu)),
    [],
    'nach dem Wechsel darf kein Lader mehr ein anderes Projekt abfragen'
  )
  assert.match(document.getElementById('uebersicht-b1').innerHTML, /Projekt J/)
})

test('F44 WS-2b: Leerzustand B14 bei leeren Workitems und ohne Roadmap', async () => {
  // koerperFuer liefert workitems [] und roadmap nicht_vorhanden.
  setzeAktivesProjekt({ id: 'projekt-k', name: 'Projekt K' })
  await warte()
  assert.equal(document.getElementById('uebersicht-erster-schritt').hidden, false)
  assert.equal(document.getElementById('uebersicht-inhalt').hidden, true)
  assert.match(document.getElementById('uebersicht-erster-schritt').innerHTML, /href="#\/projekt"/)
})

test('F44 WS-2b: ein Poll-Tick lädt weder Roadmap noch Workitems nach (nur beim Betreten und Wechsel)', async () => {
  setzeAktivesProjekt({ id: 'projekt-n', name: 'Projekt N' })
  await warte()
  aufrufe.length = 0
  const { pollJetzt } = await import('./zustand.js')
  await pollJetzt()
  await pollJetzt()
  await warte()
  assert.ok(aufrufe.some((u) => u.endsWith('/zustand')), 'der Poll fragt das Aggregat ab')
  assert.deepEqual(
    aufrufe.filter((u) => u.includes('/roadmap') || u.includes('/workitems')),
    [],
    `Poll löst Nachladen aus: ${aufrufe.join(', ')}`
  )
})

test('F44 WS-2b: eine späte Roadmap-Antwort des alten Projekts überschreibt die Übersicht des neuen nicht', async () => {
  const halt = []
  zurueckgehalten.set('/api/projekte/projekt-l/roadmap', halt)
  setzeAktivesProjekt({ id: 'projekt-l', name: 'Projekt L' })
  zurueckgehalten.clear()
  setzeAktivesProjekt({ id: 'projekt-m', name: 'Projekt M' })
  await warte()
  for (const freigeben of halt) freigeben()
  await warte()
  // M hat keine Roadmap und keine Workitems → B14; übernähme die Übersicht die späte Antwort von L
  // (gültige Roadmap mit Vision), stünden die Blöcke 2–11 mit „Vision von L“ da.
  assert.equal(document.getElementById('uebersicht-erster-schritt').hidden, false)
  assert.doesNotMatch(document.getElementById('uebersicht-ziel').innerHTML, /Vision von L/)
  assert.match(document.getElementById('uebersicht-b1').innerHTML, /Projekt M/)
})

test('F-903: kein Leerzustand B14, solange ein Workflow wartet — auch ohne Workitems und Roadmap', async () => {
  setzeAktivesProjekt({ id: 'projekt-w', name: 'Projekt W' })
  await warte()
  assert.equal(document.getElementById('uebersicht-erster-schritt').hidden, true, 'der geführte erste Schritt verdeckt eine wartende Freigabe')
  assert.equal(document.getElementById('uebersicht-inhalt').hidden, false)
  assert.match(document.getElementById('uebersicht-fokus').innerHTML, /Wartet auf Freigabe/)
})

test('F-903: kein Leerzustand B14 bei defekter Workflow-Quelle', async () => {
  setzeAktivesProjekt({ id: 'projekt-x', name: 'Projekt X' })
  await warte()
  assert.equal(document.getElementById('uebersicht-erster-schritt').hidden, true)
  assert.equal(document.getElementById('uebersicht-inhalt').hidden, false)
})

test('F44 WS-3a: Entwicklung — Betreten lädt Workitems und Aufträge, der Poll lädt nichts nach, das Board zeigt „Braucht dich“ über den Auftrag', async () => {
  const { dispatch } = await import('./router.js')
  setzeAktivesProjekt({ id: 'projekt-v', name: 'Projekt V' })
  await warte()
  // Betreten der Seite (bisher nicht betreten: der Test-Router wurde nie gestartet).
  aufrufe.length = 0
  location.hash = '#/workboard'
  dispatch()
  await warte()
  const neu = '/api/projekte/projekt-v'
  assert.ok(aufrufe.some((u) => u === `${neu}/workitems` || u === `${neu}/workitems?`), `Betreten lädt die Workitems nicht; Aufrufe: ${aufrufe.join(', ')}`)
  assert.ok(aufrufe.includes(`${neu}/auftraege`), `Betreten lädt die Aufträge nicht; Aufrufe: ${aufrufe.join(', ')}`)

  aufrufe.length = 0
  const { pollJetzt } = await import('./zustand.js')
  await pollJetzt()
  await pollJetzt()
  await warte()
  assert.deepEqual(
    aufrufe.filter((u) => u.includes('/auftraege') || u.includes('/workitems') || u.includes('/roadmap')),
    [],
    `Poll löst Nachladen aus: ${aufrufe.join(', ')}`
  )
  const board = document.getElementById('workboard-board').innerHTML
  const brauchtDich = board.slice(board.indexOf('board-spalte-braucht_dich'))
  assert.match(brauchtDich, /Wartender Befund/, 'das Finding mit wartendem Workflow steht unter „Braucht dich“')
  assert.doesNotMatch(board.slice(board.indexOf('board-spalte-geplant'), board.indexOf('board-spalte-in_arbeit')), /Wartender Befund/)

  // Ein Wechsel Board → Detail lädt nicht erneut.
  aufrufe.length = 0
  location.hash = '#/workboard/F-1'
  dispatch()
  await warte()
  assert.deepEqual(aufrufe.filter((u) => u.includes('/auftraege') || u.includes('/workitems')), [])
  location.hash = '#/workboard'
})

/**
 * Löst einen Klick auf ein Register der Seite „Entwicklung“ aus (Klick-Delegation in views/workboard.js).
 * @param tab - data-tab des Registers
 */
function klickeRegister(tab) {
  document.getElementById('workboard-tabs').handler.click({ target: { closest: (selektor) => (selektor === '[data-tab]' ? { dataset: { tab } } : null) } })
}

test('F44 WS-3a: eine späte Listenantwort des alten Projekts wird nach dem Wechsel verworfen (Parser-Befunde, Detail)', async () => {
  setzeAktivesProjekt({ id: 'projekt-q', name: 'Projekt Q' })
  await warte()
  const halt = []
  zurueckgehalten.set('/api/projekte/projekt-q/workitems?typ=BUG', halt)
  klickeRegister('bugs')
  await warte()
  assert.ok(halt.length > 0, 'der Listenabruf des Tabs Bugs läuft')
  zurueckgehalten.clear()
  setzeAktivesProjekt({ id: 'projekt-r', name: 'Projekt R' })
  await warte()
  for (const freigeben of halt) freigeben()
  await warte()
  assert.doesNotMatch(document.getElementById('workboard-befunde').innerHTML, /Parser-Befund aus Q/)
  // Das Detail von F-1 im neuen Projekt (R hat keine Workitems) darf nicht das Finding aus Q zeigen.
  location.hash = '#/workboard/F-1'
  const { dispatch } = await import('./router.js')
  dispatch()
  assert.doesNotMatch(document.getElementById('workboard-detail-inhalt').innerHTML, /Befund aus Q/)
  location.hash = '#/workboard'
  dispatch()
})

test('F44 WS-3a: „Neu laden“ lädt Workitems und Aufträge; erneutes Betreten nach dem Verlassen lädt neu', async () => {
  const { dispatch } = await import('./router.js')
  setzeAktivesProjekt({ id: 'projekt-s', name: 'Projekt S' })
  location.hash = '#/workboard'
  dispatch()
  await warte()
  const neu = '/api/projekte/projekt-s'
  const geladen = () => ({
    workitems: aufrufe.filter((u) => u === `${neu}/workitems` || u === `${neu}/workitems?`).length,
    auftraege: aufrufe.filter((u) => u === `${neu}/auftraege`).length,
  })

  aufrufe.length = 0
  document.getElementById('workboard-neu-laden').handler.click({})
  await warte()
  assert.deepEqual(geladen(), { workitems: 1, auftraege: 1 }, `„Neu laden“; Aufrufe: ${aufrufe.join(', ')}`)

  // Weiter auf der Seite: ein erneuter Routen-Eintritt lädt nicht.
  aufrufe.length = 0
  dispatch()
  await warte()
  assert.deepEqual(geladen(), { workitems: 0, auftraege: 0 })

  // Verlassen (Seite verborgen, hashchange), dann zurück: lädt neu.
  const ansicht = document.getElementById('view-workboard')
  ansicht.hidden = true
  for (const handler of hashchangeHandler) handler()
  await warte()
  ansicht.hidden = false
  dispatch()
  await warte()
  assert.deepEqual(geladen(), { workitems: 1, auftraege: 1 }, `erneutes Betreten; Aufrufe: ${aufrufe.join(', ')}`)

  // Eine überlagerte Route (Seite bleibt sichtbar) gilt nicht als Verlassen.
  aufrufe.length = 0
  for (const handler of hashchangeHandler) handler()
  await warte()
  dispatch()
  await warte()
  assert.deepEqual(geladen(), { workitems: 0, auftraege: 0 })
})
