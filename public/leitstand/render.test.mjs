/**
 * Datei: public/leitstand/render.test.mjs
 *
 * Zweck: node:test-Fälle für ersetzeListeMitFokus (render.js, F44 WS-5b, Prüfpunkt WS-5a): schreibt
 * der Poll die Liste „Aufträge“ bzw. „Ausführungen“ neu, bleibt der Fokus auf derselben Zeile.
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ersetzeListeMitFokus } from './render.js'

/**
 * Schein-Liste: innerHTML erzeugt je data-lauf-id eine neue Zeile (alte Zeilen gelten als entfernt).
 * @returns Schein-Container
 */
function scheinListe() {
  const liste = {
    zeilen: [],
    set innerHTML(html) {
      this.zeilen = [...html.matchAll(/data-lauf-id="([^"]*)"/g)].map(([, id]) => ({
        dataset: { laufId: id },
        closest: (s) => (s === '.lauf-zeile' ? liste.zeilen.find((z) => z.dataset.laufId === id) : null),
        focus() {
          globalThis.document.activeElement = this
        },
      }))
      globalThis.document.activeElement = null
    },
    contains: (el) => liste.zeilen.includes(el),
    querySelectorAll: () => liste.zeilen,
  }
  return liste
}

globalThis.document = { activeElement: null }

test('Fokus liegt auf einer Zeile → nach dem Neuschreiben auf derselben Zeile', () => {
  const liste = scheinListe()
  liste.innerHTML = '<a data-lauf-id="a"></a><a data-lauf-id="b"></a>'
  liste.zeilen[1].focus()
  ersetzeListeMitFokus(liste, '<a data-lauf-id="neu"></a><a data-lauf-id="a"></a><a data-lauf-id="b"></a>', '.lauf-zeile', 'laufId')
  assert.equal(document.activeElement?.dataset.laufId, 'b')
  assert.equal(document.activeElement, liste.zeilen[2], 'die neue Zeile, nicht die entfernte')
})

test('Fokus außerhalb der Liste oder Zeile verschwunden → kein Fokus wird gesetzt', () => {
  const liste = scheinListe()
  liste.innerHTML = '<a data-lauf-id="a"></a>'
  document.activeElement = { closest: () => null }
  const aussen = document.activeElement
  ersetzeListeMitFokus(liste, '<a data-lauf-id="a"></a>', '.lauf-zeile', 'laufId')
  assert.equal(document.activeElement, null, 'nur das Neuschreiben (Schein) setzt null — kein Sprung in die Liste')
  assert.notEqual(document.activeElement, aussen)

  liste.zeilen[0].focus()
  ersetzeListeMitFokus(liste, '<a data-lauf-id="x"></a>', '.lauf-zeile', 'laufId')
  assert.equal(document.activeElement, null)
})
