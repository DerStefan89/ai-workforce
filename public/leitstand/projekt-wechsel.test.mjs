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
 * Finding mit wartendem Workflow „Braucht dich“ zu. F44 WS-3b: Beim Wechsel lädt die Entwicklung nur,
 * wenn sie offen ist, sonst beim nächsten Betreten (F-920); das Detail zeigt beim Deep-Link bis zu
 * den Workitems einen Ladezustand (F-921), lädt Akte, Ablauf-Schritte und Abnahme genau einmal je
 * Öffnen (nie aus dem Poll) und blendet die Übersicht aus. F44 WS-4a (F-874, F-923): Ein offenes
 * Workflow-Detail samt Dialog, Bedienzustand und Reparaturentwurf wird beim Wechsel verworfen, der
 * Hash geht ohne neuen History-Eintrag auf #/runs, und der Auffrischer fragt den alten Workflow nicht
 * mehr ab; ein offenes #/workboard/<id> geht ebenso auf #/workboard.
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
// F44 WS-4a (F-923): router.js ersetzeRoute ersetzt den Hash per history.replaceState (kein neuer Eintrag).
const ersetzt = []
Object.defineProperty(globalThis, 'history', {
  value: {
    state: null,
    replaceState(_zustand, _titel, url) {
      ersetzt.push(url)
      location.hash = url
    },
    back() {},
  },
  configurable: true,
  writable: true,
})
Object.defineProperty(globalThis, 'sessionStorage', { value: speicher(), configurable: true, writable: true })
Object.defineProperty(globalThis, 'localStorage', { value: speicher(), configurable: true, writable: true })

/** Aufgezeichnete fetch-URLs. */
const aufrufe = []
/** Zurückgehaltene Antworten: URL-Präfix → { freigeben } — für den Überholschutz-Fall. */
const zurueckgehalten = new Map()

/** F44 WS-3b: Status des Ablaufs w-33 in projekt-w3 und seine Abnahme-Entscheidung (Tests schalten beides um). */
let statusW3 = 'LAEUFT'
let entscheidungW3 = 'fehlt'

/**
 * Antwortkörper je Endpunkt — genug, damit die Views ohne Fehler rendern.
 * @param url - angefragte URL
 * @returns JSON-Körper
 */
function koerperFuer(url) {
  // F46 D1: Projektakte je Projekt (Text nennt das Projekt — für den Überholschutz-Fall).
  if (url.includes('/projektakte')) {
    const projekt = url.match(/projekte\/([^/]+)\/projektakte/)?.[1] ?? 'standard'
    return { dateien: { beschreibung: { status: 'ok', pfad: 'docs/projekt/kontext/beschreibung.md', text: `## Für wen\n\nNutzer von ${projekt}` } }, versionsziel: { status: 'nicht_eindeutig', meilenstein: null } }
  }
  // F44 WS-4a: projekt-wf mit einem Workflow im Freigabe-Halt (Detail, Aktionen, Dialog).
  if (url.includes('/projekte/projekt-wf/zustand'))
    return { herkunft: url, laeufe: [], startfehler: [], workflows: [{ workflowId: 'wf-1', ziel: 'Ziel WF', status: 'WARTET_FREIGABE', naechster: { art: 'haltFreigabe', schrittId: 's1' } }], fehler: [], aktiverLauf: { aktiv: false, laufId: null } }
  if (url.includes('/projekte/projekt-wf/workflows/wf-1/abnahme'))
    return { workflowStatus: 'WARTET_FREIGABE', freigabeHalt: { schrittId: 's1' }, entscheidung: { status: 'fehlt' }, urteil: { status: 'noch_nicht_gelaufen' }, aenderungsuebersicht: { status: 'noch_nicht_gelaufen' }, pruefergebnis: { status: 'noch_nicht_gelaufen' } }
  if (url.includes('/projekte/projekt-wf/workflows/wf-1'))
    return { daten: { ziel: 'Ziel WF', status: 'WARTET_FREIGABE', aktiver_schritt_id: 's1', schritte: [{ schritt_id: 's1', rolle: 'ausfuehrung', worker: 'claude-code', freigabe: 'ZWINGEND', status: 'WARTET_FREIGABE', nachfolger: null, lauf_id: null }] }, naechster: { art: 'haltFreigabe', schrittId: 's1' }, empfehlung: null }
  // F44 WS-3a: projekt-v hat ein offenes Finding, dessen Workflow (über den Auftrag) auf Freigabe wartet.
  if (url.includes('/projekte/projekt-v/workitems'))
    return { workitems: [{ quelle: 'finding', typ: 'BUG', id: 'F-1', titel: 'Wartender Befund', status: 'OFFEN', statusRoh: 'offen', prioritaet: 'P1' }], befunde: [], fehler: [] }
  if (url.includes('/projekte/projekt-v/auftraege')) return [{ auftragId: 'a-v', titel: 'Auftrag V', erstellt_am: 'x', workitem_referenz: 'workitem:finding:F-1' }]
  if (url.includes('/projekte/projekt-v/zustand'))
    return { herkunft: url, laeufe: [], startfehler: [], workflows: [{ workflowId: 'w-v', auftragId: 'a-v', status: 'LAEUFT', ziel: 'Ziel V', naechster: { art: 'haltFreigabe', schrittId: 's1' } }], fehler: [], aktiverLauf: { aktiv: false, laufId: null } }
  // F44 WS-3a: Listenabruf (Tab Bugs) von projekt-q mit Parser-Befund — für den Überholschutz der Liste.
  if (url.includes('/projekte/projekt-q/workitems?typ=BUG'))
    return { workitems: [{ quelle: 'finding', typ: 'BUG', id: 'F-1', titel: 'Befund aus Q', status: 'OFFEN', statusRoh: 'offen', prioritaet: 'P1' }], befunde: [{ meldung: 'Parser-Befund aus Q' }], fehler: [] }
  // F44 WS-3b: projekt-ctw mit einem Finding für Click-to-Work (POST-Antworten über sonderAntworten).
  if (url.includes('/projekte/projekt-ctw/workitems'))
    return { workitems: [{ quelle: 'finding', typ: 'BUG', id: 'F-8', titel: 'Befund K', status: 'OFFEN', statusRoh: 'offen', prioritaet: 'P2' }], befunde: [], fehler: [] }
  if (url.includes('/projekte/projekt-ctw/auftraege')) return []
  // F44 WS-3b: projekt-w3 mit einem Finding, dessen Ablauf den Status wechselt (statusW3).
  if (url.includes('/projekte/projekt-w3/workitems'))
    return { workitems: [{ quelle: 'finding', typ: 'BUG', id: 'F-33', titel: 'Befund W3', status: 'OFFEN', statusRoh: 'offen', prioritaet: 'P2' }], befunde: [], fehler: [] }
  if (url.includes('/projekte/projekt-w3/auftraege')) return [{ auftragId: 'a-33', titel: 'Auftrag W3', erstellt_am: 'x', workitem_referenz: 'workitem:finding:F-33' }]
  if (url.includes('/projekte/projekt-w3/zustand'))
    return { herkunft: url, laeufe: [], startfehler: [], workflows: [{ workflowId: 'w-33', auftragId: 'a-33', status: statusW3, ziel: 'Ziel W3', naechster: null }], fehler: [], aktiverLauf: { aktiv: false, laufId: null } }
  if (url.includes('/projekte/projekt-w3/workflows/w-33/abnahme')) return { workflowStatus: statusW3, freigabeHalt: null, entscheidung: { status: entscheidungW3 } }
  if (url.includes('/projekte/projekt-w3/workflows/w-33')) return { daten: { status: statusW3, schritte: [{ schritt_id: 's1', rolle: 'ausfuehrung', worker: 'claude-code', status: statusW3 === 'LAEUFT' ? 'LAEUFT' : 'ERFOLGREICH', nachfolger: null }] } }
  // F44 WS-3b: projekt-z mit Feature F7, dessen abgeschlossener Ablauf (über den Auftrag) auf die Abnahme wartet.
  if (url.includes('/projekte/projekt-z/workitems'))
    return { workitems: [{ quelle: 'feature', typ: 'FEATURE', id: 'F7', titel: 'Feature <Sieben>', status: 'IN_ARBEIT', pfad: 'features/F7/feature.md' }], befunde: [], fehler: [] }
  if (url.includes('/projekte/projekt-z/auftraege')) return [{ auftragId: 'a-z', titel: 'Auftrag Z', erstellt_am: 'x', workitem_referenz: 'workitem:feature:F7' }]
  if (url.includes('/projekte/projekt-z/zustand'))
    return { herkunft: url, laeufe: [], startfehler: [], workflows: [{ workflowId: 'w-z', auftragId: 'a-z', status: 'ABGESCHLOSSEN', ziel: 'Ziel Z', naechster: null }], fehler: [], aktiverLauf: { aktiv: false, laufId: null } }
  if (url.includes('/projekte/projekt-z/workflows/w-z/abnahme')) return { workflowStatus: 'ABGESCHLOSSEN', freigabeHalt: null, entscheidung: { status: 'fehlt' } }
  if (url.includes('/projekte/projekt-z/workflows/w-z'))
    return { daten: { status: 'ABGESCHLOSSEN', schritte: [{ schritt_id: 's1', rolle: 'ausfuehrung', worker: 'claude-code', status: 'ERFOLGREICH', nachfolger: 's2' }, { schritt_id: 's2', rolle: 'code-reviewer', worker: 'codex', status: 'ERFOLGREICH', nachfolger: null }] } }
  if (url.includes('/projekte/projekt-z/features/F7/akte'))
    return { status: 'ok', id: 'F7', titel: 'Feature Sieben', featureStatus: 'IN_ARBEIT', ziel: 'Ziel <b>Z</b>', nicht_ziele: [], akzeptanzkriterien: [{ id: 'AK1', text: 'Kriterium <i>eins</i>' }] }
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

/**
 * F44 WS-3b: Antworten mit eigenem Status je Methode und URL (Click-to-Work), als Warteschlange:
 * Schlüssel `<METHODE> <url>` → [{ status, json }, …]; der letzte Eintrag bleibt stehen.
 */
const sonderAntworten = new Map()
/** Aufgezeichnete schreibende Anfragen (`<METHODE> <url>`). */
const schreibend = []

globalThis.fetch = (url, optionen = {}) => {
  aufrufe.push(String(url))
  const methode = optionen.method ?? 'GET'
  if (methode !== 'GET') schreibend.push(`${methode} ${url}`)
  const sonder = sonderAntworten.get(`${methode} ${url}`)
  if (sonder !== undefined) {
    const { status, json } = sonder.length > 1 ? sonder.shift() : sonder[0]
    return Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => json })
  }
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
const { initWorkflowsView } = await import('./views/workflows.js')
const { initProjektakteView } = await import('./views/projektakte.js')

initWorkboardView()
initDashboardView()
initProjektView()
initAttentionView()
initRoadmapView()
initNutzungView()
initWorkflowsView()
initProjektakteView()
await warte()

test('F-860: nach dem Projektwechsel laden Workboard, Dashboard und Direktstart mit dem neuen Präfix', async () => {
  aufrufe.length = 0
  setzeAktivesProjekt({ id: 'projekt-b', name: 'Projekt B' })
  await warte()

  const neu = '/api/projekte/projekt-b'
  const erwartet = {
    'Übersicht Workitems (ungefiltert)': (u) => u === `${neu}/workitems` || u === `${neu}/workitems?`,
    'Dashboard P0/P1 (status=OFFEN)': (u) => u.startsWith(`${neu}/workitems?`) && u.includes('status=OFFEN'),
    'Nutzung Verbrauch': (u) => u.startsWith(`${neu}/verbrauch`),
    'Direktstart Aufträge': (u) => u === `${neu}/auftraege`,
    'Direktstart Werkzeugsätze': (u) => u === `${neu}/startvorlage/werkzeugsaetze`,
  }
  for (const [name, passt] of Object.entries(erwartet)) {
    assert.ok(aufrufe.some(passt), `${name} wurde nach dem Wechsel nicht mit ${neu} geladen; Aufrufe: ${aufrufe.join(', ')}`)
  }
  // F-920 (F44 WS-3b): Die Seite „Entwicklung“ ist hier (noch) nicht betreten — sie lädt beim Wechsel
  // nichts; die Aufträge laden der Direktstart und seit F46 D1 die Übersicht (Verknüpfung Feature ↔
  // Ablauf für den Rollen-Kreis und den Arbeitsstand). Das Laden bei offener Seite prüft „F-920“ unten.
  assert.equal(aufrufe.filter((u) => u === `${neu}/auftraege`).length, 2, `Aufrufe: ${aufrufe.join(', ')}`)
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
  // Ausgenommen: P0/P1 (Dashboard, Entscheidungen) und typ=FEATURE (seit F46 D1 lädt die Roadmap-Seite
  // ungefiltert) — der gesetzte Workboard-Filter war BUG.
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
  // F46 D1: die Roadmap-Seite lädt alle Workitems (Entwicklungsstand mit Typfilter und „Noch nicht
  // eingeplant“) statt nur typ=FEATURE — ungefiltert laden sie Übersicht UND Roadmap-Seite.
  assert.ok(anzahl((u) => u === `${neu}/workitems`) >= 2, `Roadmap-Seite lädt die Workitems nicht neu; Aufrufe: ${aufrufe.join(', ')}`)
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
  // ungefilterte Workitems: die Übersicht (F-920: die nicht betretene Entwicklung lädt beim Wechsel nicht).
  assert.ok(anzahl((u) => u === `${neu}/roadmap`) >= 2, `Übersicht lädt die Roadmap nicht neu; Aufrufe: ${aufrufe.join(', ')}`)
  assert.ok(anzahl((u) => u === `${neu}/workitems` || u === `${neu}/workitems?`) >= 1, `Übersicht lädt die Workitems nicht neu; Aufrufe: ${aufrufe.join(', ')}`)
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
  // (gültige Roadmap ohne Meilensteine), stünde B14 nicht da und der Kopf meldete „alle
  // abgeschlossen“ statt „keine Roadmap“. F46 D1: die Vision steht nicht mehr auf der Übersicht
  // (Block uebersicht-ziel entfällt, Vision → #/projektakte) — geprüft wird deshalb der Kopf.
  assert.equal(document.getElementById('uebersicht-erster-schritt').hidden, false)
  assert.match(document.getElementById('uebersicht-b1').innerHTML, /Noch keine Roadmap hinterlegt/)
  assert.match(document.getElementById('uebersicht-b1').innerHTML, /Projekt M/)
})

test('F-903: kein Leerzustand B14, solange ein Workflow wartet — auch ohne Workitems und Roadmap', async () => {
  setzeAktivesProjekt({ id: 'projekt-w', name: 'Projekt W' })
  await warte()
  assert.equal(document.getElementById('uebersicht-erster-schritt').hidden, true, 'der geführte erste Schritt verdeckt eine wartende Freigabe')
  assert.equal(document.getElementById('uebersicht-inhalt').hidden, false)
  // F46 D1: „Deine nächsten Entscheidungen“ entfällt (→ Karte „Braucht dich“ mit Zahl, #/attention).
  assert.match(document.getElementById('uebersicht-cockpit').innerHTML, />1 Entscheidung</)
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

test('F-920: der Wechsel lädt die Entwicklung nur bei offener Seite; sonst lädt das nächste Betreten', async () => {
  const { dispatch } = await import('./router.js')
  const ansicht = document.getElementById('view-workboard')
  const auftraegeVon = (projekt) => aufrufe.filter((u) => u === `/api/projekte/${projekt}/auftraege`).length

  // Seite offen: der Wechsel lädt Workitems und Aufträge der Entwicklung (Aufträge zusätzlich zu
  // Direktstart und — seit F46 D1 — Übersicht).
  location.hash = '#/workboard'
  dispatch()
  await warte()
  aufrufe.length = 0
  setzeAktivesProjekt({ id: 'projekt-t', name: 'Projekt T' })
  await warte()
  assert.equal(auftraegeVon('projekt-t'), 3, `offene Seite; Aufrufe: ${aufrufe.join(', ')}`)

  // Seite verlassen (verborgen, hashchange): der Wechsel lädt für die Entwicklung nichts.
  ansicht.hidden = true
  for (const handler of hashchangeHandler) handler()
  await warte()
  aufrufe.length = 0
  setzeAktivesProjekt({ id: 'projekt-u', name: 'Projekt U' })
  await warte()
  assert.equal(auftraegeVon('projekt-u'), 2, `geschlossene Seite lädt mit; Aufrufe: ${aufrufe.join(', ')}`)

  // Erneutes Betreten lädt Workitems und Aufträge des neuen Projekts.
  aufrufe.length = 0
  ansicht.hidden = false
  dispatch()
  await warte()
  assert.equal(auftraegeVon('projekt-u'), 1, `Betreten; Aufrufe: ${aufrufe.join(', ')}`)
  assert.ok(aufrufe.some((u) => u === '/api/projekte/projekt-u/workitems' || u === '/api/projekte/projekt-u/workitems?'), `Betreten lädt die Workitems nicht; Aufrufe: ${aufrufe.join(', ')}`)
})

test('F44 WS-3b: Detail per Deep-Link — Ladezustand (F-921), Übersicht ausgeblendet, Nachtrag genau einmal, nie aus dem Poll', async () => {
  const { dispatch } = await import('./router.js')
  const { pollJetzt } = await import('./zustand.js')
  const halt = []
  zurueckgehalten.set('/api/projekte/projekt-z/workitems', halt)
  aufrufe.length = 0
  setzeAktivesProjekt({ id: 'projekt-z', name: 'Projekt Z' })
  location.hash = '#/workboard/F7'
  dispatch()
  await warte()
  const inhalt = document.getElementById('workboard-detail-inhalt')
  assert.match(inhalt.innerHTML, /Der Eintrag wird geladen/)
  assert.doesNotMatch(inhalt.innerHTML, /nicht gefunden|gibt es im aktuellen Projekt nicht/)
  assert.equal(document.getElementById('workboard-detail').hidden, false)
  assert.equal(document.getElementById('workboard-uebersicht').hidden, true)

  // Die Übersicht lädt für ihren Fokus-Ablauf (hier derselbe) eigene Nachträge — gezählt wird nur,
  // was nach dem Eintreffen der Workitems dazukommt (vorher kennt das Detail sein Workitem nicht).
  // F46 D1: Die Übersicht findet das Feature in Arbeit (F7) erst über dieselben, hier zurückgehaltenen
  // Workitems und lädt den Nachtrag seines Ablaufs (Rollen-Kreis) deshalb ebenfalls danach — je
  // einmal Übersicht und Detail, also 2; der Poll lädt danach nichts nach (unten).
  const anzahl = (ende) => aufrufe.filter((u) => u === `/api/projekte/projekt-z${ende}`).length
  const vorher = { akte: anzahl('/features/F7/akte'), schritte: anzahl('/workflows/w-z'), abnahme: anzahl('/workflows/w-z/abnahme') }
  assert.equal(vorher.akte, 0)
  zurueckgehalten.clear()
  for (const freigeben of halt) freigeben()
  await warte()
  await pollJetzt()
  await warte()
  assert.equal(anzahl('/features/F7/akte') - vorher.akte, 1, `Akte; Aufrufe: ${aufrufe.join(', ')}`)
  assert.equal(anzahl('/workflows/w-z') - vorher.schritte, 2, `Ablauf-Schritte; Aufrufe: ${aufrufe.join(', ')}`)
  assert.equal(anzahl('/workflows/w-z/abnahme') - vorher.abnahme, 2, `Abnahme; Aufrufe: ${aufrufe.join(', ')}`)
  assert.equal(document.getElementById('workboard-detail-titel').textContent, 'Feature <Sieben>')
  assert.equal(document.getElementById('workboard-detail-eyebrow').textContent, 'Feature · F7')
  assert.match(inhalt.innerHTML, /Ziel &lt;b&gt;Z&lt;\/b&gt;/, 'Ziel aus der Akte, escaped')
  assert.match(inhalt.innerHTML, /<code>AK1<\/code> Kriterium &lt;i&gt;eins&lt;\/i&gt;/, 'AK aus der Akte, escaped')
  assert.match(inhalt.innerHTML, /2 von 2 Schritten abgeschlossen/)
  assert.match(inhalt.innerHTML, /Umsetzung/, 'Rollenname statt ID (F-914)')
  // Abgeschlossener Ablauf mit offener Abnahme: Phase „Deine Abnahme“, gerade dran „Du“.
  assert.match(document.getElementById('workboard-detail-status').innerHTML, /Phase: <strong>Deine Abnahme<\/strong>.*Gerade dran: <strong>Du<\/strong>/)
  assert.match(document.getElementById('workboard-detail-aktion').innerHTML, /href="#\/workflows\/w-z">Ergebnis prüfen/)
  assert.match(document.getElementById('workboard-bearbeitung').innerHTML, /id="workboard-bauen"[^>]*>Auftrag vorbereiten/)

  // Weitere Poll-Ticks laden nichts nach.
  aufrufe.length = 0
  await pollJetzt()
  await pollJetzt()
  await warte()
  assert.deepEqual(
    aufrufe.filter((u) => !u.endsWith('/zustand')),
    [],
    `Poll lädt im Detail nach: ${aufrufe.join(', ')}`
  )

  // „← zurück“ führt zur Übersicht. F-926 (F44 WS-4b): Der vorige Eintrag war hier die Übersicht
  // (#/workboard aus dem vorigen Fall) — zurück geht es deshalb per history.back(), kein neuer Eintrag.
  // Der Schein-Browser springt dabei auf den vorigen Hash zurück und dispatcht.
  let zurueck = 0
  history.back = () => {
    zurueck += 1
    location.hash = '#/workboard'
    dispatch()
  }
  document.getElementById('workboard-detail-schliessen').handler.click({})
  history.back = () => {}
  assert.equal(zurueck, 1, '„← zurück“ nimmt history.back(), wenn der vorige Eintrag die Übersicht war')
  assert.equal(location.hash, '#/workboard')
  assert.equal(document.getElementById('workboard-detail').hidden, true)
  assert.equal(document.getElementById('workboard-uebersicht').hidden, false)
})

/**
 * Löst einen Klick im Click-to-Work-Bereich aus (Klick-Delegation in views/workboard.js).
 * @param selektor - Selektor, auf den closest() treffen soll
 * @param id - data-id des Knopfs
 */
function klickeBearbeitung(selektor, id) {
  document.getElementById('workboard-bearbeitung').handler.click({ target: { closest: (s) => (s === selektor ? { dataset: { id } } : null) } })
}

test('F44 WS-3b (E12): Konflikt 409 → „Wiederholen“ routet erneut, ohne einen zweiten Auftrag anzulegen; danach lädt die Seite die Aufträge neu', async () => {
  const { dispatch } = await import('./router.js')
  const neu = '/api/projekte/projekt-ctw'
  sonderAntworten.set(`POST ${neu}/auftraege`, [{ status: 201, json: { auftragId: 'a-k' } }])
  sonderAntworten.set(`POST ${neu}/auftraege/a-k/routen`, [
    { status: 409, json: { grund: 'Ein anderer Lauf ist aktiv <D13>' } },
    { status: 202, json: { laufId: 'l-k' } },
  ])
  setzeAktivesProjekt({ id: 'projekt-ctw', name: 'Projekt CTW' })
  location.hash = '#/workboard/F-8'
  dispatch()
  await warte()
  const bereich = document.getElementById('workboard-bearbeitung')
  assert.match(bereich.innerHTML, /id="workboard-bearbeiten"[^>]*>Auftrag vorbereiten/)

  schreibend.length = 0
  aufrufe.length = 0
  klickeBearbeitung('#workboard-bearbeiten', 'F-8')
  await warte()
  assert.match(bereich.innerHTML, /Es läuft bereits eine Ausführung\./)
  assert.match(bereich.innerHTML, /Ein anderer Lauf ist aktiv &lt;D13&gt;/, 'Servergrund escaped')
  assert.match(bereich.innerHTML, /class="button wb-wiederholen"/)
  assert.equal(aufrufe.filter((u) => u === `${neu}/auftraege`).length, 2, `POST und danach einmal GET der Aufträge; Aufrufe: ${aufrufe.join(', ')}`)

  klickeBearbeitung('.wb-wiederholen', 'F-8')
  await warte()
  assert.match(bereich.innerHTML, /Der Ablauf wird vorgeschlagen …[\s\S]*<code>l-k<\/code>/)
  assert.deepEqual(schreibend, [`POST ${neu}/auftraege`, `POST ${neu}/auftraege/a-k/routen`, `POST ${neu}/auftraege/a-k/routen`])
  sonderAntworten.clear()
  location.hash = '#/workboard'
  dispatch()
})

test('F44 WS-3b: Ein Phasenwechsel des verknüpften Ablaufs lädt Schritte und Abnahme genau einmal nach; ohne Übergang lädt der Poll nichts', async () => {
  const { dispatch } = await import('./router.js')
  const { pollJetzt } = await import('./zustand.js')
  statusW3 = 'LAEUFT'
  setzeAktivesProjekt({ id: 'projekt-w3', name: 'Projekt W3' })
  location.hash = '#/workboard/F-33'
  dispatch()
  await warte()
  await pollJetzt()
  await warte()
  const inhalt = document.getElementById('workboard-detail-inhalt')
  assert.match(document.getElementById('workboard-detail-status').innerHTML, /In Ausführung/)
  const anzahl = (ende) => aufrufe.filter((u) => u === `/api/projekte/projekt-w3${ende}`).length
  const vorher = { schritte: anzahl('/workflows/w-33'), abnahme: anzahl('/workflows/w-33/abnahme') }

  statusW3 = 'ABGESCHLOSSEN'
  await pollJetzt()
  await warte()
  assert.equal(anzahl('/workflows/w-33') - vorher.schritte, 1, 'Schritte beim Übergang genau einmal')
  assert.equal(anzahl('/workflows/w-33/abnahme') - vorher.abnahme, 1, 'Abnahme beim Übergang nach ABGESCHLOSSEN')
  assert.match(inhalt.innerHTML, /1 von 1 Schritt abgeschlossen/)
  assert.match(document.getElementById('workboard-detail-aktion').innerHTML, /Ergebnis prüfen/)
  assert.match(document.getElementById('workboard-bearbeitung').innerHTML, /class="button" data-id="F-33" disabled aria-disabled="true"/, '„Auftrag vorbereiten“ ist bei offener Abnahme gesperrt (F-922)')

  await pollJetzt()
  await pollJetzt()
  await warte()
  assert.equal(anzahl('/workflows/w-33') - vorher.schritte, 1, 'ohne Übergang kein weiterer Abruf')
  location.hash = '#/workboard'
  dispatch()
})

test('F44 WS-3b: Eine späte Akte des alten Projekts erscheint nach dem Wechsel nicht im Detail', async () => {
  const { dispatch } = await import('./router.js')
  const halt = []
  setzeAktivesProjekt({ id: 'projekt-z', name: 'Projekt Z' })
  zurueckgehalten.set('/api/projekte/projekt-z/features/F7/akte', halt)
  location.hash = '#/workboard/F7'
  dispatch()
  await warte()
  assert.ok(halt.length > 0, 'die Akte von Z ist unterwegs')
  zurueckgehalten.clear()
  setzeAktivesProjekt({ id: 'projekt-y', name: 'Projekt Y' })
  await warte()
  // F-923: der Wechsel hat das Detail geschlossen und den Hash auf #/workboard gesetzt — hier öffnet
  // der Nutzer dieselbe ID im neuen Projekt bewusst erneut.
  assert.equal(location.hash, '#/workboard')
  location.hash = '#/workboard/F7'
  dispatch()
  await warte()
  for (const freigeben of halt) freigeben()
  await warte()
  const inhalt = document.getElementById('workboard-detail-inhalt').innerHTML
  assert.doesNotMatch(inhalt, /Ziel &lt;b&gt;Z/)
  assert.match(inhalt, /Eintrag nicht gefunden/)
  location.hash = '#/workboard'
  dispatch()
})

test('F-922: „Auftrag vorbereiten“ gesperrt bei laufendem Ablauf und bei offener Abnahme, frei bei terminalem Ablauf ohne offene Abnahme', async () => {
  const { dispatch } = await import('./router.js')
  const { pollJetzt } = await import('./zustand.js')
  const bereich = document.getElementById('workboard-bearbeitung')
  /** Öffnet das Detail F-33 frisch (neuer Nachtrag) und wartet Poll und Nachtrag ab. */
  const oeffne = async () => {
    location.hash = '#/workboard'
    dispatch()
    location.hash = '#/workboard/F-33'
    dispatch()
    await warte()
    await pollJetzt()
    await warte()
  }
  const gesperrt = /id="workboard-bearbeiten" class="button" data-id="F-33" disabled aria-disabled="true"/

  statusW3 = 'LAEUFT'
  entscheidungW3 = 'fehlt'
  setzeAktivesProjekt({ id: 'projekt-w3', name: 'Projekt W3' })
  await oeffne()
  assert.match(bereich.innerHTML, gesperrt, 'laufender Ablauf sperrt')
  assert.match(bereich.innerHTML, /Für diesen Eintrag läuft bereits ein Ablauf\./)
  assert.match(bereich.innerHTML, /<a href="#\/workflows\/w-33">Ablauf öffnen<\/a>/)

  // Ein Klick auf den gesperrten Knopf legt nichts an.
  schreibend.length = 0
  bereich.handler.click({ target: { closest: (s) => (s === '[aria-disabled="true"]' || s === '#workboard-bearbeiten' ? { dataset: { id: 'F-33' } } : null) } })
  await warte()
  assert.deepEqual(schreibend, [])

  statusW3 = 'ABGESCHLOSSEN'
  entscheidungW3 = 'fehlt'
  await oeffne()
  assert.match(bereich.innerHTML, gesperrt, 'offene Abnahme sperrt')
  assert.match(bereich.innerHTML, /Der Ablauf wartet auf deine Abnahme\./)
  assert.match(bereich.innerHTML, /<a href="#\/workflows\/w-33">Ablauf öffnen<\/a>/)

  entscheidungW3 = 'ok'
  await oeffne()
  assert.match(bereich.innerHTML, /id="workboard-bearbeiten" class="button primary" data-id="F-33" data-ctw-fokus>Auftrag vorbereiten/, 'terminaler Ablauf ohne offene Abnahme: frei')
  assert.doesNotMatch(bereich.innerHTML, /disabled/)

  statusW3 = 'LAEUFT'
  entscheidungW3 = 'fehlt'
  location.hash = '#/workboard'
  dispatch()
})

test('F-874, F-923 (F44 WS-4a): Wechsel bei offenem Workflow-Detail und offenem Dialog — alles verworfen, Hash ohne neuen Eintrag auf #/runs, kein Abruf des alten Workflows', async () => {
  const { dispatch } = await import('./router.js')
  const { pollJetzt } = await import('./zustand.js')
  setzeAktivesProjekt({ id: 'projekt-wf', name: 'Projekt WF' })
  await warte()
  location.hash = '#/workflows/wf-1'
  dispatch()
  await warte()
  assert.equal(document.getElementById('workflow-detail').hidden, false)
  assert.equal(document.getElementById('workflow-detail-titel').textContent, 'Ziel WF')
  assert.match(document.getElementById('workflow-aktionen').innerHTML, /data-aktion="freigabe-oeffnen"/)

  // Dialog über die Aktionszeile öffnen; dazu ein angefangener Reparaturentwurf.
  const dialog = document.getElementById('workflow-dialog')
  let geschlossen = 0
  dialog.open = false
  dialog.showModal = () => {
    dialog.open = true
  }
  dialog.close = () => {
    dialog.open = false
    geschlossen += 1
  }
  document.getElementById('workflow-aktionen').handler.click({ target: { closest: (s) => (s === '.wf-aktion' ? { dataset: { aktion: 'freigabe-oeffnen', workflowId: 'wf-1' } } : null) } })
  assert.equal(dialog.open, true)
  assert.match(dialog.innerHTML, /data-aktion="freigeben" data-workflow-id="wf-1" data-schritt-id="s1">Freigeben &amp; starten/)
  document.getElementById('workflow-reparatur').innerHTML = '<p>Entwurf aus dem alten Projekt</p>'

  ersetzt.length = 0
  setzeAktivesProjekt({ id: 'projekt-wf2', name: 'Projekt WF2' })
  await warte()
  assert.equal(dialog.open, false, 'der Dialog des alten Projekts ist zu')
  assert.ok(geschlossen >= 1)
  assert.equal(document.getElementById('workflow-detail').hidden, true)
  assert.equal(document.getElementById('workflow-aktionen').innerHTML, '')
  assert.equal(document.getElementById('workflow-bedienung').innerHTML, '')
  assert.equal(document.getElementById('workflow-reparatur').innerHTML, '', 'der Reparaturentwurf des alten Projekts ist verworfen')
  assert.equal(location.hash, '#/runs')
  assert.deepEqual(ersetzt, ['#/runs'], 'der Hash wird ersetzt, kein neuer History-Eintrag')

  // F-874: weitere Poll-Ticks fragen den alten Workflow nicht mehr ab (früher: Dauer-404).
  aufrufe.length = 0
  await pollJetzt()
  await pollJetzt()
  await warte()
  assert.deepEqual(
    aufrufe.filter((u) => u.includes('/workflows/')),
    [],
    `Auffrischer fragt weiter ab: ${aufrufe.join(', ')}`
  )
})

test('F-923: Wechsel bei offenem #/workboard/<id> setzt den Hash ohne neuen Eintrag auf #/workboard', async () => {
  const { dispatch } = await import('./router.js')
  setzeAktivesProjekt({ id: 'projekt-v', name: 'Projekt V' })
  location.hash = '#/workboard/F-1'
  dispatch()
  await warte()
  assert.equal(document.getElementById('workboard-detail').hidden, false)
  ersetzt.length = 0
  setzeAktivesProjekt({ id: 'projekt-w', name: 'Projekt W' })
  await warte()
  assert.equal(location.hash, '#/workboard')
  assert.deepEqual(ersetzt, ['#/workboard'])
  assert.equal(document.getElementById('workboard-detail').hidden, true)
  // Ohne offenes Detail bleibt der Hash unberührt.
  ersetzt.length = 0
  setzeAktivesProjekt({ id: 'projekt-v', name: 'Projekt V' })
  await warte()
  assert.deepEqual(ersetzt, [])
})

test('F46 D1: Projektakte — Wechsel bei offener Seite lädt mit dem neuen Präfix; eine späte Antwort des alten Projekts wird verworfen', async () => {
  const { dispatch } = await import('./router.js')
  location.hash = '#/projektakte'
  dispatch()
  await warte()
  const halt = []
  zurueckgehalten.set('/api/projekte/projekt-pa/projektakte', halt)
  aufrufe.length = 0
  setzeAktivesProjekt({ id: 'projekt-pa', name: 'Projekt PA' })
  zurueckgehalten.clear()
  setzeAktivesProjekt({ id: 'projekt-pb', name: 'Projekt PB' })
  await warte()
  for (const freigeben of halt) freigeben()
  await warte()
  const html = document.getElementById('view-projektakte').innerHTML
  assert.match(html, /Projekt PB · Projektakte/)
  assert.match(html, /Nutzer von projekt-pb/)
  assert.doesNotMatch(html, /Nutzer von projekt-pa/, 'späte Antwort des alten Projekts')
  assert.ok(aufrufe.includes('/api/projekte/projekt-pb/projektakte'), `Aufrufe: ${aufrufe.join(', ')}`)
  assert.match(document.getElementById('uebersicht-cockpit').innerHTML, /Kein eindeutiges Versionsziel/, 'die Übersicht lädt die Projektakte des neuen Projekts ebenfalls')
})
