/**
 * Datei: public/leitstand/chat-anzeige.test.mjs
 *
 * Zweck: node:test für die reinen Regeln des Chat-Docks und der großen Ansicht (F44 WS-8a):
 * Rückkehr-Route merken, Ziel von „Gespräch verkleinern“, „Nächster Schritt“ der Kontextspalte.
 * Dazu die Tastaturregel der Register (naechsterRegisterIndex, faehigkeiten-anzeige.js), die das
 * Register Jarvis | Product Coach mitbenutzt, und der Vorfilter (jarvis-vorfilter.js): in Node ohne
 * DOM importierbar, Antwortsätze über i18n (in Node immer de).
 *
 * Wird aufgerufen von: `npm test` (node --test)
 *
 * Wichtig: loeseVorfilterAuf wird nur mit 'Status' geprüft — 'Was braucht mich?' löst einen
 * Workitem-Abruf aus (api.js), den es in Node nicht gibt. Die reine Erkennung (erkenneVorfilterMuster)
 * prüft auch die vier Vorschlagstexte (F44 WS-8b, F-967).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { STANDARD_RUECKKEHR, entwurfFuerCoach, fuegeEntwurfEin, istGrossansicht, leiteNaechstenSchrittAb, merkeRoute, zielBeimVerkleinern } from './chat-anzeige.js'
import { naechsterRegisterIndex } from './faehigkeiten-anzeige.js'
import { erkenneVorfilterMuster, loeseVorfilterAuf } from './jarvis-vorfilter.js'

const zustand = (workflows, laeufe) => ({ workflows, laeufe, startfehler: [], fehler: [] })
const freigabe = { workflowId: 'wf-1', ziel: 'Login bauen', naechster: { art: 'haltFreigabe' } }
const rueckfrage = { workflowId: 'wf-2', ziel: '', naechster: { art: 'haltKlaerung' } }
const lauf = { laufId: 'lauf-9', ergebnis: 'FEHLGESCHLAGEN', kenntnisgenommen: false, auftragsbezug: { titel: 'Tests reparieren' } }

test('merkeRoute: echte Seiten werden gemerkt, #/chat und #/start nicht', () => {
  assert.equal(merkeRoute(null, '#/workboard'), '#/workboard')
  assert.equal(merkeRoute('#/workboard', '#/workflows/router-a1'), '#/workflows/router-a1')
  assert.equal(merkeRoute('#/workboard', '#/chat'), '#/workboard')
  assert.equal(merkeRoute('#/workboard', '#/start'), '#/workboard')
  assert.equal(merkeRoute(null, '#/chat'), null)
})

test('istGrossansicht: nur genau #/chat', () => {
  assert.equal(istGrossansicht('#/chat'), true)
  assert.equal(istGrossansicht('#/chat/x'), false)
  assert.equal(istGrossansicht('#/workboard'), false)
  assert.equal(istGrossansicht(''), false)
})

test('merkeRoute: leerer oder fremder Hash ändert nichts', () => {
  assert.equal(merkeRoute('#/roadmap', ''), '#/roadmap')
  assert.equal(merkeRoute('#/roadmap', '#anker'), '#/roadmap')
  assert.equal(merkeRoute('#/roadmap', undefined), '#/roadmap')
})

test('zielBeimVerkleinern: gemerkte Route, sonst die Produktübersicht', () => {
  assert.equal(zielBeimVerkleinern('#/workboard'), '#/workboard')
  assert.equal(zielBeimVerkleinern(null), STANDARD_RUECKKEHR)
  assert.equal(zielBeimVerkleinern(''), STANDARD_RUECKKEHR)
  assert.equal(STANDARD_RUECKKEHR, '#/dashboard')
})

test('leiteNaechstenSchrittAb: vor dem ersten Poll-Tick lädt es', () => {
  assert.deepEqual(leiteNaechstenSchrittAb(null), { art: 'laedt' })
})

test('leiteNaechstenSchrittAb: Freigabe vor Rückfrage vor Lauf', () => {
  assert.deepEqual(leiteNaechstenSchrittAb(zustand([rueckfrage, freigabe], [lauf])), { art: 'eintrag', eintragArt: 'freigabe', titel: 'Login bauen', hash: '#/workflows/wf-1' })
  assert.deepEqual(leiteNaechstenSchrittAb(zustand([rueckfrage], [lauf])), { art: 'eintrag', eintragArt: 'rueckfrage', titel: 'wf-2', hash: '#/workflows/wf-2' })
  assert.deepEqual(leiteNaechstenSchrittAb(zustand([], [lauf])), { art: 'eintrag', eintragArt: 'lauf', titel: 'Tests reparieren', hash: '#/runs/lauf-9' })
})

test('leiteNaechstenSchrittAb: nichts wartet → leer; kenntnisgenommene Läufe zählen nicht', () => {
  assert.deepEqual(leiteNaechstenSchrittAb(zustand([], [{ ...lauf, kenntnisgenommen: true }])), { art: 'leer' })
})

test('leiteNaechstenSchrittAb: defekte Quelle ohne Treffer → defekt; mit Treffer aus der anderen Quelle → Eintrag', () => {
  assert.deepEqual(leiteNaechstenSchrittAb(zustand(null, [])), { art: 'defekt' })
  assert.equal(leiteNaechstenSchrittAb(zustand(null, [lauf])).art, 'eintrag')
})

test('Register-Tastatur (wie WS-7): Pfeile laufen um, Pos1/Ende, andere Tasten unberührt', () => {
  assert.equal(naechsterRegisterIndex(0, 2, 'ArrowRight'), 1)
  assert.equal(naechsterRegisterIndex(1, 2, 'ArrowRight'), 0)
  assert.equal(naechsterRegisterIndex(0, 2, 'ArrowLeft'), 1)
  assert.equal(naechsterRegisterIndex(1, 2, 'Home'), 0)
  assert.equal(naechsterRegisterIndex(0, 2, 'End'), 1)
  assert.equal(naechsterRegisterIndex(0, 2, 'Enter'), null)
})

test('Vorfilter: in Node importierbar, Muster unverändert, Statussatz über i18n (de)', async () => {
  assert.equal(erkenneVorfilterMuster('Was braucht mich?'), 'braucht_mich')
  assert.equal(erkenneVorfilterMuster('Status'), 'status')
  assert.equal(erkenneVorfilterMuster('Wo steht mein Projekt?'), null)
  const ohneZustand = await loeseVorfilterAuf('Status', null)
  assert.equal(ohneZustand.antwort, 'Der Zustand ist noch nicht geladen — bitte gleich noch einmal fragen.')
  const mitZustand = await loeseVorfilterAuf('Status?', { laeufe: [lauf], startfehler: [], workflows: null })
  assert.equal(mitZustand.antwort, 'Läufe: 1 · Startfehler: 0 · Workflows: nicht verfügbar · Braucht Aufmerksamkeit (Workflows/Läufe): nicht verfügbar')
  assert.equal(mitZustand.quelle, 'vorfilter')
})

test('Vorfilter (F-967): der Vorschlag „Was braucht mich?“ wird in allen vier Sprachen erkannt', () => {
  for (const text of ['Was braucht mich?', 'What needs me?', 'Neye ihtiyaç var?', 'Что требует меня?']) {
    assert.equal(erkenneVorfilterMuster(text), 'braucht_mich', text)
    // Trim und Satzzeichen am Ende sind egal, Groß-/Kleinschreibung auch.
    assert.equal(erkenneVorfilterMuster(`  ${text.replace(/\?$/, '')}  `), 'braucht_mich', `${text} ohne ?`)
    assert.equal(erkenneVorfilterMuster(`${text.replace(/\?$/, '')}!`), 'braucht_mich', `${text} mit !`)
    assert.equal(erkenneVorfilterMuster(text.toUpperCase()), 'braucht_mich', `${text} groß`)
  }
  assert.equal(erkenneVorfilterMuster('WHAT NEEDS ME'), 'braucht_mich')
  // Mehr Text als der Vorschlag geht weiter an Jarvis.
  assert.equal(erkenneVorfilterMuster('What needs me today?'), null)
  assert.equal(erkenneVorfilterMuster('Что требует меня сегодня?'), null)
  assert.equal(erkenneVorfilterMuster('Where does my project stand?'), null)
  // Die bestehenden Muster bleiben.
  assert.equal(erkenneVorfilterMuster('was braucht mich'), 'braucht_mich')
  assert.equal(erkenneVorfilterMuster('Status haushaltsbuch'), 'status')
  assert.equal(erkenneVorfilterMuster('Status, kannst du auch X prüfen?'), null)
})

test('entwurfFuerCoach (WS-8b): Titel und Ergebnis, getrimmt, leere Teile entfallen', () => {
  assert.equal(entwurfFuerCoach('  Login bauen ', ' Nutzer melden sich an. '), 'Login bauen\n\nNutzer melden sich an.')
  assert.equal(entwurfFuerCoach('', 'Nur Text'), 'Nur Text')
  assert.equal(entwurfFuerCoach('Nur Titel', '   '), 'Nur Titel')
  assert.equal(entwurfFuerCoach('', ''), '')
  assert.equal(entwurfFuerCoach(undefined, null), '')
})

test('fuegeEntwurfEin (WS-8b, qa S1): Getipptes bleibt, der Entwurf kommt nach einer Leerzeile', () => {
  assert.equal(fuegeEntwurfEin('', 'Login bauen'), 'Login bauen')
  assert.equal(fuegeEntwurfEin('   ', ' Login bauen '), 'Login bauen')
  assert.equal(fuegeEntwurfEin('Meine Frage an Jarvis\n', 'Login bauen'), 'Meine Frage an Jarvis\n\nLogin bauen')
  assert.equal(fuegeEntwurfEin('Meine Frage', ''), 'Meine Frage')
  assert.equal(fuegeEntwurfEin('Login bauen', 'Login bauen'), 'Login bauen')
  assert.equal(fuegeEntwurfEin(undefined, 'x'), 'x')
})

test('merkeRoute (WS-8b): die Anlege-Unterseite wird als Produktübersicht gemerkt', () => {
  assert.equal(merkeRoute('#/dashboard', '#/projekte-uebersicht/neu'), '#/projekte-uebersicht')
  assert.equal(merkeRoute(null, '#/projekte-uebersicht'), '#/projekte-uebersicht')
  assert.equal(zielBeimVerkleinern(merkeRoute('#/dashboard', '#/projekte-uebersicht/neu')), '#/projekte-uebersicht')
})
