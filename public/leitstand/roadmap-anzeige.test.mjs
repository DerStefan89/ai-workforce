/**
 * Datei: public/leitstand/roadmap-anzeige.test.mjs
 *
 * Zweck: node:test für die reinen Roadmap-Anzeigeregeln (roadmap-anzeige.js, F44 WS-2a):
 * Anzeigezustand (F-854: ein Serverfehler ist nie „keine Roadmap“), aktueller Meilenstein,
 * Zähler, Statuskategorie, offene/eingeklappte Meilensteine und „Noch nicht eingeplant“.
 *
 * Wird aufgerufen von: npm run check (node --test)
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { aktuellerMeilenstein, meilensteinOffen, nichtEingeplant, roadmapZustand, STATUS_KATEGORIEN, statusKategorie, zaehleMeilenstein } from './roadmap-anzeige.js'

/** Baut eine gültige Projektion aus [id, status, features[]]-Tripeln. */
function roadmap(...meilensteine) {
  return { status: 'ok', vision: 'v', meilensteine: meilensteine.map(([id, status, features = []]) => ({ id, titel: `Titel ${id}`, status, features })) }
}

test('roadmapZustand: drei Fachergebnisse, alles andere ist Fehler (F-854)', () => {
  assert.equal(roadmapZustand(null), 'laedt')
  assert.equal(roadmapZustand({ status: 'nicht_vorhanden' }), 'nicht_vorhanden')
  assert.equal(roadmapZustand({ status: 'ungueltig', fehler: ['x'] }), 'ungueltig')
  assert.equal(roadmapZustand(roadmap(['M1', 'GEPLANT'])), 'ok')
  assert.equal(roadmapZustand({ status: 'fehler' }), 'fehler')
  // Ein 404/500-Körper ohne bekannten status darf nie als leer oder ok gelten.
  assert.equal(roadmapZustand({ grund: "Unbekanntes Projekt 'x'" }), 'fehler')
  assert.equal(roadmapZustand({ status: 'ungueltig' }), 'fehler')
  assert.equal(roadmapZustand({ status: 'ok', meilensteine: [{ id: 'M1' }] }), 'fehler')
  assert.equal(roadmapZustand('text'), 'fehler')
})

test('aktuellerMeilenstein: erster LAEUFT, sonst erster nicht abgeschlossener, sonst null', () => {
  assert.equal(aktuellerMeilenstein(roadmap(['M1', 'ABGESCHLOSSEN'], ['M2', 'GEPLANT'], ['M3', 'LAEUFT'])).id, 'M3')
  assert.equal(aktuellerMeilenstein(roadmap(['M1', 'ABGESCHLOSSEN'], ['M2', 'GEPLANT'], ['M3', 'GEPLANT'])).id, 'M2')
  assert.equal(aktuellerMeilenstein(roadmap(['M1', 'ABGESCHLOSSEN'])), null)
  assert.equal(aktuellerMeilenstein({ status: 'nicht_vorhanden' }), null)
  assert.equal(aktuellerMeilenstein(null), null)
})

test('zaehleMeilenstein: abgenommen = ABGESCHLOSSEN, gesamt inklusive keine_akte', () => {
  const m = { features: [{ id: 'F1', status: 'ABGESCHLOSSEN' }, { id: 'F2', status: 'IN_ARBEIT' }, { id: 'F3', status: 'keine_akte' }] }
  assert.deepEqual(zaehleMeilenstein(m), { abgenommen: 1, gesamt: 3 })
  assert.deepEqual(zaehleMeilenstein({ features: [] }), { abgenommen: 0, gesamt: 0 })
  assert.deepEqual(zaehleMeilenstein(undefined), { abgenommen: 0, gesamt: 0 })
})

test('statusKategorie: bekannte Werte je Kategorie, Unbekanntes → unbekannt', () => {
  assert.equal(statusKategorie('ABGESCHLOSSEN'), 'abgenommen')
  assert.equal(statusKategorie('FEATURE_GATE'), 'freigabe')
  assert.equal(statusKategorie('LAEUFT'), 'in_arbeit')
  assert.equal(statusKategorie('IN_ARBEIT'), 'in_arbeit')
  assert.equal(statusKategorie('BLOCKIERT'), 'klaerung')
  assert.equal(statusKategorie('ENTWURF'), 'geplant')
  assert.equal(statusKategorie('GEPLANT'), 'geplant')
  assert.equal(statusKategorie('ABGEBROCHEN'), 'abgebrochen')
  assert.equal(statusKategorie('keine_akte'), 'ohne_akte')
  assert.equal(statusKategorie('UNBEKANNT'), 'unbekannt')
  assert.equal(statusKategorie('toString'), 'unbekannt')
  assert.equal(statusKategorie(undefined), 'unbekannt')
  for (const kategorie of ['abgenommen', 'freigabe', 'in_arbeit', 'klaerung', 'geplant', 'abgebrochen', 'ohne_akte', 'unbekannt']) assert.ok(STATUS_KATEGORIEN.includes(kategorie))
})

test('meilensteinOffen: abgeschlossene vor dem aktuellen eingeklappt, aktueller und spätere offen', () => {
  const r = roadmap(['M1', 'ABGESCHLOSSEN'], ['M2', 'LAEUFT'], ['M3', 'GEPLANT'], ['M4', 'ABGESCHLOSSEN'])
  const [m1, m2, m3, m4] = r.meilensteine
  assert.equal(meilensteinOffen(r, m1), false)
  assert.equal(meilensteinOffen(r, m2), true)
  assert.equal(meilensteinOffen(r, m3), true)
  assert.equal(meilensteinOffen(r, m4), true)
  const alleFertig = roadmap(['M1', 'ABGESCHLOSSEN'], ['M2', 'ABGESCHLOSSEN'])
  assert.equal(meilensteinOffen(alleFertig, alleFertig.meilensteine[1]), false)
})

test('nichtEingeplant: Features ohne Meilenstein; nicht prüfbar → null', () => {
  const r = roadmap(['M1', 'LAEUFT', [{ id: 'F1', status: 'IN_ARBEIT' }]], ['M2', 'GEPLANT', [{ id: 'F2', status: 'ENTWURF' }]])
  const features = [{ id: 'F1' }, { id: 'F2' }, { id: 'F9', titel: 'Neu' }]
  assert.deepEqual(nichtEingeplant(r, features), [{ id: 'F9', titel: 'Neu' }])
  assert.deepEqual(nichtEingeplant(r, [{ id: 'F1' }]), [])
  assert.deepEqual(nichtEingeplant({ status: 'nicht_vorhanden' }, features), features)
  assert.equal(nichtEingeplant({ status: 'ungueltig', fehler: [] }, features), null)
  assert.equal(nichtEingeplant({ status: 'fehler' }, features), null)
  assert.equal(nichtEingeplant(r, null), null)
})

test('Randfälle: undefined lädt, leere Meilensteinliste ist ok, null-Meilenstein ist Fehler', () => {
  assert.equal(roadmapZustand(undefined), 'laedt')
  assert.equal(roadmapZustand({ status: 'ok', meilensteine: [] }), 'ok')
  assert.equal(roadmapZustand({ status: 'ok', meilensteine: [null] }), 'fehler')
  assert.equal(roadmapZustand({ status: 'ungueltig', fehler: [] }), 'ungueltig')
})

test('nichtEingeplant während die Roadmap lädt → null (nicht prüfbar)', () => {
  assert.equal(nichtEingeplant(null, [{ id: 'F1' }]), null)
})

test('ein geplanter Meilenstein vor dem laufenden bleibt offen', () => {
  const r = roadmap(['M1', 'GEPLANT'], ['M2', 'LAEUFT'])
  assert.equal(meilensteinOffen(r, r.meilensteine[0]), true)
  assert.equal(aktuellerMeilenstein(r).id, 'M2')
})
