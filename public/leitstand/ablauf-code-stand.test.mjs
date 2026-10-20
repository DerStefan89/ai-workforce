/**
 * Datei: public/leitstand/ablauf-code-stand.test.mjs
 *
 * Zweck: node:test-Fälle für den Stand „Bereit zum Sichern“ je Ablauf (F45 B2b-4a-2b-2, ablauf-code-stand.js; F-1157 (4)(5)):
 * je Schlüssel höchstens ein Abruf (auch nach einem Fehlschlag), neuer Schlüssel ⇒ neuer Abruf, „Aktualisieren“ nur mit neu: true,
 * 409 mit Schlüssel als Lage, 409 ohne Schlüssel/404/Netz als Fehler, Überholschutz und Projektwechsel, Schlüssel vor jeder Meldung.
 * Attrappen zur Laufzeit (eingespeister Abruf), kein Netz.
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { erzeugeAblaufCodeStand, werteAblaufAntwortAus } from './ablauf-code-stand.js'

const warte = () => new Promise((ok) => setTimeout(ok, 5))

/**
 * Stand mit aufzeichnendem Abruf.
 * @param antwort - (id, n) => Promise<{ http, koerper }> bzw. wirft
 * @returns { s, abrufe, projekt }
 */
function baue(antwort) {
  const abrufe = []
  const projekt = { id: 'p1' }
  const s = erzeugeAblaufCodeStand({
    hole: (id) => {
      abrufe.push(id)
      return antwort(id, abrufe.length)
    },
    projektId: () => projekt.id,
    jetzt: () => 1000,
  })
  return { s, abrufe, projekt }
}

const OK = { http: 200, koerper: { status: 'ok', ablauf: { sichern: { bereit: true } } } }

test('5× derselbe Schlüssel ⇒ genau ein Abruf; neuer Schlüssel ⇒ zweiter', async () => {
  const { s, abrufe } = baue(async () => OK)
  for (let i = 0; i < 5; i++) s.stelleSicher('w-1', 'ABGESCHLOSSEN|BEREIT|-|1')
  await warte()
  for (let i = 0; i < 5; i++) s.stelleSicher('w-1', 'ABGESCHLOSSEN|BEREIT|-|1')
  assert.equal(abrufe.length, 1)
  assert.equal(s.stand('w-1').zustand, 'ok')
  s.stelleSicher('w-1', 'ABGESCHLOSSEN|ENTFERNT|-|1')
  assert.equal(abrufe.length, 2)
})

test('ein Fehlschlag zählt als gelaufen — kein Wiederholen im Takt', async () => {
  const { s, abrufe } = baue(async () => {
    throw new Error('Netz weg')
  })
  for (let i = 0; i < 5; i++) {
    s.stelleSicher('w-1', 'k')
    await warte()
  }
  assert.equal(abrufe.length, 1)
  assert.equal(s.stand('w-1').zustand, 'fehler')
  assert.match(s.stand('w-1').fehler, /Netz weg/)
})

test('lade nur mit neu: true; Aktualisieren meldet laedt und das Ergebnis, Schlüssel bleibt', async () => {
  const { s, abrufe } = baue(async () => OK)
  const meldungen = []
  s.abonniere((id) => meldungen.push(`${id}:${s.stand(id).zustand}`))
  s.stelleSicher('w-1', 'k')
  await warte()
  await s.lade('w-1')
  assert.equal(abrufe.length, 1, 'ohne neu kein Abruf')
  await s.lade('w-1', { neu: true })
  assert.equal(abrufe.length, 2)
  assert.deepEqual(meldungen, ['w-1:ok', 'w-1:laedt', 'w-1:ok'])
  s.stelleSicher('w-1', 'k')
  assert.equal(abrufe.length, 2, 'der Schlüssel bleibt nach Aktualisieren')
})

test('Schlüssel steht vor jeder Meldung — ein neu zeichnender Abonnent löst keinen zweiten Abruf aus', async () => {
  const { s, abrufe } = baue(async () => OK)
  s.abonniere(() => s.stelleSicher('w-1', 'k'))
  s.stelleSicher('w-1', 'k')
  await warte()
  await s.lade('w-1', { neu: true })
  assert.equal(abrufe.length, 2)
})

test('409 mit Schlüssel ist eine Lage; 409 ohne Schlüssel, 400, 404, 500 sind Fehler', () => {
  assert.deepEqual(werteAblaufAntwortAus({ http: 409, koerper: { grund: 'x', grund_schluessel: 'aufgeraeumt' } }).zustand, 'lage')
  assert.equal(werteAblaufAntwortAus({ http: 409, koerper: { grund: 'x', grund_schluessel: 'aufgeraeumt' } }).grundSchluessel, 'aufgeraeumt')
  for (const [http, koerper] of [
    [409, { grund: 'x', grund_schluessel: null }],
    [409, {}],
    [400, { grund: 'Form', grund_schluessel: null }],
    [404, { grund: 'Ablauf nicht gefunden', grund_schluessel: null }],
    [500, {}],
  ]) {
    const teil = werteAblaufAntwortAus({ http, koerper })
    assert.equal(teil.zustand, 'fehler', `${http}`)
    assert.match(teil.fehler, new RegExp(`^${http}`))
  }
  assert.equal(werteAblaufAntwortAus(OK).zustand, 'ok')
})

test('Überholschutz: eine späte Antwort eines älteren Abrufs überschreibt nicht', async () => {
  const freigaben = []
  const { s } = baue((_id, n) => new Promise((ok) => freigaben.push(() => ok({ http: 200, koerper: { n, ablauf: {} } }))))
  s.stelleSicher('w-1', 'k1')
  s.stelleSicher('w-1', 'k2')
  freigaben[1]()
  await warte()
  freigaben[0]()
  await warte()
  assert.equal(s.stand('w-1').daten.n, 2)
  assert.equal(s.stand('w-1').schluessel, 'k2')
})

test('Projektwechsel: der Stand gilt als leer, eine späte Antwort des alten Projekts wird verworfen', async () => {
  let freigabe
  const { s, abrufe, projekt } = baue(() => new Promise((ok) => (freigabe = () => ok(OK))))
  s.stelleSicher('w-1', 'k')
  projekt.id = 'p2'
  freigabe()
  await warte()
  assert.equal(s.stand('w-1').zustand, 'leer')
  s.stelleSicher('w-1', 'k')
  assert.equal(abrufe.length, 2, 'im neuen Projekt wird neu abgerufen')
})

test('Projektwechsel hin und zurück während eines Abrufs: kein Hängen auf „lädt“, neuer Abruf, alte Antwort verworfen (Code-Review 2)', async () => {
  const freigaben = []
  const { s, abrufe, projekt } = baue((_id, n) => new Promise((ok) => freigaben.push(() => ok({ http: 200, koerper: { n, ablauf: {} } }))))
  s.stelleSicher('w-1', 'k')
  assert.equal(s.stand('w-1').zustand, 'laedt')
  projekt.id = 'p2'
  assert.equal(s.stand('w-1').zustand, 'leer')
  projekt.id = 'p1'
  assert.equal(s.stand('w-1').zustand, 'leer', 'zurück in p1: der alte Eintrag „lädt“ ist verworfen')
  s.stelleSicher('w-1', 'k')
  assert.equal(abrufe.length, 2, 'derselbe Schlüssel ruft nach dem Wechsel neu ab')
  freigaben[0]()
  await warte()
  assert.equal(s.stand('w-1').zustand, 'laedt', 'die Antwort aus der Zeit vor dem Wechsel zählt nicht')
  freigaben[1]()
  await warte()
  assert.equal(s.stand('w-1').daten.n, 2)
})

test('Projektwechsel verwirft auch fertige Stände (kein alter Stand nach der Rückkehr)', async () => {
  const { s, abrufe, projekt } = baue(async () => OK)
  s.stelleSicher('w-1', 'k')
  await warte()
  projekt.id = 'p2'
  s.stelleSicher('w-9', 'k')
  projekt.id = 'p1'
  assert.equal(s.stand('w-1').zustand, 'leer')
  s.stelleSicher('w-1', 'k')
  assert.equal(abrufe.length, 3)
})

test('älterer Serverprozess (200 ohne Feld ablauf) ist ein Fehler mit „Leitstand neu starten“ (QA 8)', () => {
  const teil = werteAblaufAntwortAus({ http: 200, koerper: { status: 'ok', dateien: {} } })
  assert.equal(teil.zustand, 'fehler')
  assert.match(teil.fehler, /Leitstand neu starten/)
})

test('ohne workflowId kein Abruf', () => {
  const { s, abrufe } = baue(async () => OK)
  s.stelleSicher('', 'k')
  s.stelleSicher(undefined, 'k')
  void s.lade(undefined, { neu: true })
  assert.equal(abrufe.length, 0)
})
