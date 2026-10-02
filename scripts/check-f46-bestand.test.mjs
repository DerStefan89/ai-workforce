/**
 * Datei: scripts/check-f46-bestand.test.mjs
 *
 * Zweck: Grün- und Rot-Fälle für das Gate „Bestand bleibt“ (scripts/check-f46-bestand.mjs, Stefan
 * 02.10.2026): der echte Leitstand ist grün; je entferntes Bestandsmerkmal (Bild, Wortmarke, Zuletzt
 * geöffnet, Illustration, Profil, Persona an Chat-Knopf und Blase, ein Eintrag oben bzw. unten) ein
 * benannter Befund.
 *
 * Wird aufgerufen von: npm run check (node --test)
 */

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { pruefeBestand } from './check-f46-bestand.mjs'

const HTML = readFileSync('public/leitstand/index.html', 'utf8')
const ALLE_DA = () => true

test('Grünfall: der heutige Leitstand erfüllt den Bestand', () => {
  assert.deepEqual(pruefeBestand(HTML, (pfad) => existsSync(pfad)), [])
})

test('Rotfälle: jedes entfernte Bestandsmerkmal ist ein Befund', () => {
  const faelle = [
    ['Bild', HTML, (pfad) => !pfad.endsWith('gear.webp'), /Bild fehlt: public\/leitstand\/assets\/gear\.webp/],
    ['Persona-Bild-Datei', HTML, (pfad) => !pfad.endsWith('persona-gesicht.webp'), /Bild fehlt: public\/leitstand\/persona-gesicht\.webp/],
    ['Wortmarke', HTML.replace('class="brand" id="shell-marke"', 'class="marke" id="shell-marke"'), ALLE_DA, /Wortmarke/],
    ['Zuletzt geöffnet', HTML.replace('id="shell-zuletzt"', 'id="anders"'), ALLE_DA, /Zuletzt geöffnet/],
    ['Illustration', HTML.replace('<img class="side-art" src="/assets/gear.webp"', '<img class="side-art" src="/assets/anders.webp"'), ALLE_DA, /Illustration/],
    ['Profil', HTML.replace('id="shell-profil"', 'id="profil-weg"'), ALLE_DA, /Profil/],
    ['Persona am Chat-Knopf', HTML.replace(/(<button[^>]*id="chat-umschalter"[^>]*>)<img[^>]*>/, '$1'), ALLE_DA, /Persona-Bild .* #chat-umschalter/],
    ['Persona an der Blase', HTML.replace(/(<button[^>]*id="chat-blase"[^>]*>)<img[^>]*>/, '$1'), ALLE_DA, /Persona-Bild .* #chat-blase/],
    ['Eintrag oben', HTML.replace('data-nav-view="produktzyklus"', 'data-nav-view="weg"'), ALLE_DA, /Eintrag oben fehlt: Produktzyklus/],
    ['Eintrag unten', HTML.replace('data-nav-view="nutzung"', 'data-nav-view="weg"'), ALLE_DA, /Eintrag unten fehlt: Nutzung/],
    ['unterer Bereich', HTML.replace('<nav class="side-bottom"', '<div class="side-bottom"'), ALLE_DA, /nav\.side-bottom fehlt/],
  ]
  for (const [name, html, existiert, erwartet] of faelle) {
    // Die Markup-Rotfälle müssen den Quelltext wirklich verändern (sonst prüfte der Fall nichts).
    if (existiert === ALLE_DA) assert.notEqual(html, HTML, `${name}: der Rotfall verändert den Quelltext`)
    const befunde = pruefeBestand(html, existiert)
    assert.ok(befunde.some((b) => erwartet.test(b)), `${name}: erwartet ${erwartet}, erhalten ${JSON.stringify(befunde)}`)
  }
})
