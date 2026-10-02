/**
 * Datei: public/leitstand/views/auftrag-umgebung.test.mjs
 *
 * Zweck: F46 D4 — rechte Spalte von „Auftrag anlegen“ (views/auftrag-umgebung.js, umgebungHtml): Laden,
 * Fehler, Fehler mit Altdaten (Hinweis „veraltet“), main, detached HEAD, kein GitHub, fehlende
 * Register-Felder (Standard gekennzeichnet), Escaping und der cd-Befehl.
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { umgebungHtml } from './auftrag-umgebung.js'

const DATEN = {
  status: 'ok',
  absoluterPfad: 'C:\\Users\\stefa\\Projekte\\ai-workforce',
  arbeitsverzeichnis: { status: 'ok', vorhanden: true },
  branch: { status: 'ok', name: 'feat/x', losgeloest: false, commit: 'a48b344' },
  remoteWebUrl: { status: 'ok', url: 'https://github.com/o/r', origin: true },
  dateien: { status: 'ok', eintraege: [], anzahl: 0, gekappt: false },
  harness: { status: 'ok', claudeMd: true, settings: true, hooks: 5, agents: 5 },
  startvorlage: { status: 'ok', pfad: 'startvorlagen/ai-workforce.json', profilPfad: 'profiles/ai-workforce.json', modell: 'claude-sonnet-5', worker: ['claude-code', 'codex'], werkzeugsaetze: ['lesend'], pruefbefehl: 'npm run check', zeitgrenzeMs: 1800000, pruefZeitgrenzeMs: 900000, budget: { maxElemente: 20, maxBytes: 200000 } },
}
const PROJEKT = { id: 'ai-workforce', name: 'AI Workforce', repo_pfad: '.', status: 'IN_ENTWICKLUNG', basisverzeichnis: 'kontrollzustand', kontext_pfad: null, roadmap_pfad: null, vorschau_url: null }
const WERTE = { titel: 'Titel', ergebnis: 'Ergebnis', kontext: '' }
const html = (zusatz = {}) => umgebungHtml({ werte: WERTE, aktiverLauf: { aktiv: false, laufId: null }, codeStand: { zustand: 'ok', daten: DATEN }, projekt: PROJEKT, ...zusatz })

test('bereit: echte Werte, GitHub und VS Code als Link, cd-Befehl PowerShell-gequotet, Standardpfade gekennzeichnet', () => {
  const h = html()
  assert.match(h, /data-ton="ok">bereit</)
  assert.match(h, /href="https:\/\/github\.com\/o\/r" target="_blank" rel="noopener noreferrer"/)
  assert.match(h, /href="vscode:\/\/file\/C:\/Users\/stefa\/Projekte\/ai-workforce"/)
  assert.match(h, /cd &#39;C:\\Users\\stefa\\Projekte\\ai-workforce&#39;/)
  assert.match(h, /docs\/projekt\/kontext\/<\/code> <span class="umgebung-unter">Standard<\/span>/)
  assert.match(h, /npm run check/)
  assert.doesNotMatch(h, /Fehlt noch/)
})

test('laden, Fehler, Fehler mit Altdaten', () => {
  const laedt = umgebungHtml({ werte: WERTE, aktiverLauf: undefined, codeStand: { zustand: 'laedt', daten: null }, projekt: PROJEKT })
  assert.match(laedt, /noch nicht bereit/)
  assert.match(laedt, /Lädt/)
  const fehler = umgebungHtml({ werte: WERTE, aktiverLauf: { aktiv: false }, codeStand: { zustand: 'fehler', daten: null, fehler: 'Zeitüberschreitung' }, projekt: PROJEKT })
  assert.match(fehler, /class="note red"><strong>Der Code-Stand ist nicht ladbar\./)
  const veraltet = html({ codeStand: { zustand: 'fehler', daten: DATEN, fehler: 'Netz weg' } })
  assert.match(veraltet, /Aktualisieren fehlgeschlagen — angezeigt wird der letzte Stand\./)
})

test('main, laufender Lauf, detached HEAD, kein GitHub; offene Pflichtpunkte werden genannt', () => {
  const main = html({ codeStand: { zustand: 'ok', daten: { ...DATEN, branch: { ...DATEN.branch, name: 'main' } } }, aktiverLauf: { aktiv: true, laufId: 'lauf-1' } })
  assert.match(main, /Gerade ist main ausgecheckt\./)
  assert.match(main, /Lauf lauf-1 läuft/)
  assert.match(main, /Fehlt noch: Kein anderer Lauf aktiv/)
  const losgeloest = html({ codeStand: { zustand: 'ok', daten: { ...DATEN, branch: { status: 'ok', name: null, losgeloest: true, commit: 'abc1234' }, remoteWebUrl: { status: 'ok', url: null, origin: false } } } })
  assert.match(losgeloest, /\(losgelöst, kein Branch\)/)
  assert.match(losgeloest, /kein GitHub-Remote/)
  assert.match(losgeloest, /class="umgebung-werkzeug" role="link" tabindex="0" aria-disabled="true">.*GitHub/s)
  const leer = umgebungHtml({ werte: { titel: '', ergebnis: '', kontext: '' }, aktiverLauf: { aktiv: false }, codeStand: { zustand: 'ok', daten: DATEN }, projekt: PROJEKT })
  assert.match(leer, /Fehlt noch: Titel, Gewünschtes Ergebnis/)
})

test('Escaping: Titel, Pfad, Branch und Projektname aus Daten sind Text', () => {
  const boese = '<img src=x onerror=alert(1)>'
  const h = umgebungHtml({
    werte: { titel: boese, ergebnis: 'E', kontext: '' },
    aktiverLauf: { aktiv: false },
    codeStand: { zustand: 'ok', daten: { ...DATEN, absoluterPfad: `C:\\${boese}`, branch: { ...DATEN.branch, name: `feat/${boese}` } } },
    projekt: { ...PROJEKT, name: boese },
  })
  assert.doesNotMatch(h, /<img/)
  assert.match(h, /&lt;img src=x onerror=alert\(1\)&gt;/)
})
