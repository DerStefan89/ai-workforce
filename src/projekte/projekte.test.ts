/**
 * Datei: src/projekte/projekte.test.ts
 *
 * Zweck: node:test-Fälle für das Feld vorschau_url (F36 WS-5a, E-F36-7) im Projektregister:
 * Validierung (nur http://localhost:<port> bzw. http://127.0.0.1:<port>, Port 1–65535, ohne Pfad) und
 * projektOriginsAus (Wert für {projekt_origins}), vorschauLeitstandSperre (F-849). Die übrigen Registerregeln prüft
 * scripts/check-f25-projekte.mjs.
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { VORSCHAU_LEITSTAND_PORT, VORSCHAU_LEITSTAND_PORT_UNBEKANNT, projektOriginsAus, validiereProjekteDaten, vorschauLeitstandSperre, vorschauPortAus } from './index.ts'

const EINTRAG = { id: 'p', name: 'P', repo_pfad: '.', startvorlage_pfad: 's.json', profil_pfad: 'p.json', basisverzeichnis: 'k', status: 'IDEE' }
const mit = (felder: Record<string, unknown>) => validiereProjekteDaten({ projekte_schema: 'v0', projekte: [{ ...EINTRAG, ...felder }] })

test('vorschau_url: optional; localhost und 127.0.0.1 mit Port sind gültig', () => {
  assert.deepEqual(mit({}), [])
  assert.deepEqual(mit({ vorschau_url: 'http://localhost:5173' }), [])
  assert.deepEqual(mit({ vorschau_url: 'http://127.0.0.1:65535' }), [])
})

test('vorschau_url: ohne Port, mit Pfad, https, fremder Host, Port 0/zu groß, kein String → abgelehnt', () => {
  for (const url of ['http://localhost', 'http://localhost:5173/', 'http://localhost:5173/app', 'https://localhost:5173', 'http://example.com:80', 'http://localhost:0', 'http://localhost:65536', 'http://localhost:099', 'http://127.0.0.1:80;http://x', '', 5173]) {
    assert.ok(mit({ vorschau_url: url }).some((v) => v.includes('vorschau_url')), `${String(url)} müsste abgelehnt werden`)
  }
})

test('projektOriginsAus: beide Origins mit Port, semikolongetrennt; ohne gültige URL null', () => {
  assert.equal(projektOriginsAus('http://127.0.0.1:4173'), 'http://localhost:4173;http://127.0.0.1:4173')
  assert.equal(projektOriginsAus('http://localhost:5173'), 'http://localhost:5173;http://127.0.0.1:5173')
  assert.equal(projektOriginsAus(undefined), null)
  assert.equal(projektOriginsAus(null), null)
  assert.equal(projektOriginsAus('http://localhost'), null)
  assert.equal(vorschauPortAus('http://localhost:8080'), 8080)
})

test('vorschauLeitstandSperre (F-849): gleicher Port (localhost/127.0.0.1) und unbekannter Port gesperrt, anderer Port frei', () => {
  assert.equal(vorschauLeitstandSperre('http://127.0.0.1:4200', 4200), VORSCHAU_LEITSTAND_PORT)
  assert.equal(vorschauLeitstandSperre('http://localhost:4200', 4200), VORSCHAU_LEITSTAND_PORT)
  assert.equal(vorschauLeitstandSperre('http://localhost:5173', 4200), null)
  // Portgrenzen: 1 und 65535 sind gültige Leitstand-Ports.
  assert.equal(vorschauLeitstandSperre('http://127.0.0.1:1', 1), VORSCHAU_LEITSTAND_PORT)
  assert.equal(vorschauLeitstandSperre('http://127.0.0.1:65535', 65535), VORSCHAU_LEITSTAND_PORT)
  assert.equal(vorschauLeitstandSperre('http://127.0.0.1:65535', 1), null)
  for (const port of [undefined, null, 0, 70000, 4200.5, '4200']) assert.equal(vorschauLeitstandSperre('http://localhost:4200', port), VORSCHAU_LEITSTAND_PORT_UNBEKANNT, String(port))
  // Ohne gültige vorschau_url keine Sperre — dafür gelten die bisherigen Regeln (PROJEKT_URL_FEHLT).
  assert.equal(vorschauLeitstandSperre(null, 4200), null)
  assert.equal(vorschauLeitstandSperre('http://example.com:4200', undefined), null)
})
