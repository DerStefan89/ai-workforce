/**
 * Datei: public/leitstand/views/abnahme-render.test.mjs
 *
 * Zweck: node:test-Fälle für views/abnahme-render.js (F45 B3b-2a-2, features/F45/plan-b3b2a2.md): Karte „Darstellung
 * (Render-Nachweis)“ — GRÜN ohne Hinweis, ROT/ZEITGRENZE mit `note amber`, FEHLER mit Grund im aufgeklappten Ausgabe-Ende
 * und eigenem Hinweis „nicht geprüft“ (F45 B3b-2b),
 * 'fehlt' ohne Karte, Escaping der Serverwerte, Kennung für das Poll-Kennzeichen; dazu die Einbindung in die Lagen
 * „entscheidbar“ (nach der qa-Karte, h2) und „vorab“ (h4) von views/workflow-abnahme.js.
 *
 * Wird aufgerufen von: `npm run test` (node --test). Das Modul ist rein: der Import läuft in Node ohne DOM (in Node gilt de).
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { pruefWertText, renderNachweisKennung, renderRenderNachweis } from './abnahme-render.js'
import { renderAbnahme } from './workflow-abnahme.js'

/** Projektion 'ok' mit Vorgaben; einzelne Felder überschreibbar. @param felder - Überschreibungen @returns Projektion */
const nachweis = (felder = {}) => ({
  status: 'ok',
  ergebnis: 'GRUEN',
  dauer_ms: 12345,
  ausgabe_ende: 'Render-Nachweis: 3 Bilder, keine Befunde',
  gestartet_am: '2026-10-29T10:00:00.000Z',
  ...felder,
})

test('GRÜN: Karte mit grünem Badge, Dauer, zugeklapptem Ausgabe-Ende und Ortssatz, ohne Hinweis', () => {
  const html = renderRenderNachweis(nachweis())
  assert.match(
    html,
    /<section class="entscheiden-karte abnahme-render abnahme-render-karte" aria-labelledby="abnahme-render-titel">/
  )
  assert.match(html, /<h2 id="abnahme-render-titel">Darstellung \(Render-Nachweis\)<\/h2>/)
  assert.match(html, /<span class="ablauf-status ok">GRÜN<\/span> · Dauer 12,3 s/)
  assert.match(
    html,
    /<details class="abnahme-details"><summary>Ausgabe-Ende<\/summary><pre class="abnahme-render-ausgabe">Render-Nachweis: 3 Bilder, keine Befunde<\/pre><\/details>/
  )
  assert.match(
    html,
    /Bilder und Protokoll liegen im Arbeitsordner unter <code>\.render-nachweis\/<\/code> — solange der Arbeitsordner besteht\./
  )
  assert.doesNotMatch(html, /note amber/)
  assert.doesNotMatch(html, /2026-10-29/, 'kein Zeitstempel, keine Kennung im sichtbaren Text')
})

test('ROT und ZEITGRENZE: amber Hinweis „Abnahme trotzdem möglich“, Badge in der Farbe der Notiz', () => {
  for (const ergebnis of ['ROT', 'ZEITGRENZE']) {
    const html = renderRenderNachweis(nachweis({ ergebnis }))
    assert.match(
      html,
      /<div class="note amber abnahme-render-hinweis" role="note"><p>Darstellung mit Befunden — Abnahme trotzdem möglich\./,
      ergebnis
    )
    assert.match(html, new RegExp(`<span class="ablauf-status warten">${ergebnis}</span>`), ergebnis)
    assert.match(html, /<details class="abnahme-details"><summary>/, `${ergebnis}: zugeklappt`)
    assert.match(html, /Bilder und Protokoll liegen im Arbeitsordner/, `${ergebnis}: Ortssatz`)
    assert.doesNotMatch(html, /die Bilder an/, 'der Hinweis verweist nicht auf Bilder, die es nicht geben muss (qa N1)')
  }
})

test('FEHLER: Grund im aufgeklappten Ausgabe-Ende, Hinweis „nicht geprüft“ (auch vorab), kein Ortssatz (qa N1)', () => {
  const html = renderRenderNachweis(
    nachweis({ ergebnis: 'FEHLER', ausgabe_ende: 'nicht ausgeführt: .render-nachweis/ steht nicht in .gitignore' })
  )
  assert.match(html, /<span class="ablauf-status warten">FEHLER<\/span>/)
  // F45 B3b-2b (F-1272): „nicht geprüft“ statt „mit Befunden“ — der qa-Schritt meldet die Darstellung als nicht prüfbar.
  assert.match(
    html,
    /<div class="note amber abnahme-render-hinweis" role="note"><p>Darstellung nicht geprüft — den Grund zeigt das Ausgabe-Ende\. Abnahme trotzdem möglich\./
  )
  assert.doesNotMatch(html, /mit Befunden/)
  const vorab = renderRenderNachweis(nachweis({ ergebnis: 'FEHLER' }), { ebene: 4, vorab: true })
  assert.match(
    vorab,
    /Darstellung nicht geprüft — sie ist nicht der Grund für den Halt\. Den Grund zeigt das Ausgabe-Ende\./
  )
  assert.doesNotMatch(vorab, /mit Befunden|Abnahme trotzdem möglich/)
  assert.doesNotMatch(html, /Bilder und Protokoll/)
  assert.match(
    html,
    /<details class="abnahme-details" open><summary>Ausgabe-Ende<\/summary><pre class="abnahme-render-ausgabe">nicht ausgeführt: \.render-nachweis\/ steht nicht in \.gitignore<\/pre>/
  )
})

test('fehlt, undefined, null: keine Karte', () => {
  for (const projektion of [{ status: 'fehlt' }, undefined, null, { status: 'unbekannt' }])
    assert.equal(renderRenderNachweis(projektion), '')
})

test('Escaping: Ausgabe-Ende und unbekanntes Ergebnis erscheinen roh und escaped; leere Ausgabe mit Satz', () => {
  const html = renderRenderNachweis(
    nachweis({ ergebnis: 'X<&>', ausgabe_ende: '<img src=x onerror=alert(1)> & "Pfad"' })
  )
  assert.match(html, /<span class="ablauf-status warten">X&lt;&amp;&gt;<\/span>/)
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt; &amp; (&quot;|")Pfad(&quot;|")/)
  assert.doesNotMatch(html, /<img/)
  assert.match(html, /note amber/, 'unbekannt ist nicht GRÜN')
  assert.match(
    renderRenderNachweis(nachweis({ ausgabe_ende: '  \n' })),
    /<summary>Ausgabe-Ende<\/summary><p class="subtle">Keine Ausgabe\.<\/p>/
  )
})

test('Dauer: 0 ms und große Werte mit Tausendertrennzeichen (de)', () => {
  assert.match(renderRenderNachweis(nachweis({ dauer_ms: 0 })), /· Dauer 0 s/)
  assert.match(renderRenderNachweis(nachweis({ dauer_ms: 1234567 })), /· Dauer 1.234,6 s/)
})

test('pruefWertText: vier Werte übersetzt, unbekannt roh, fehlend leer', () => {
  assert.deepEqual(['GRUEN', 'ROT', 'ZEITGRENZE', 'FEHLER', 'NEU', undefined].map(pruefWertText), [
    'GRÜN',
    'ROT',
    'ZEITGRENZE',
    'FEHLER',
    'NEU',
    '',
  ])
})

test('renderNachweisKennung: fester Wert ohne Projektion, ändert sich mit Status, Ergebnis, Zeitpunkt und Dauer', () => {
  assert.equal(renderNachweisKennung(undefined), '-')
  assert.equal(renderNachweisKennung({ status: 'fehlt' }), 'fehlt')
  const basis = renderNachweisKennung(nachweis())
  for (const felder of [{ ergebnis: 'ROT' }, { gestartet_am: '2026-10-29T11:00:00.000Z' }, { dauer_ms: 1 }])
    assert.notEqual(renderNachweisKennung(nachweis(felder)), basis)
  assert.notEqual(basis, renderNachweisKennung({ status: 'fehlt' }))
})

/** Abnahme-Projektion (Muster workflow-abnahme.test.mjs) mit Render-Nachweis. @param felder - Überschreibungen @returns Projektion */
const abnahme = (felder = {}) => ({
  workflowStatus: 'ABGESCHLOSSEN',
  freigabeHalt: null,
  entscheidung: { status: 'nicht_vorhanden' },
  urteil: { status: 'ok', laufId: 'l-review', urteil: 'BEREIT', empfehlung: 'Abnehmen.', befunde: [], ak_urteile: [] },
  aenderungsuebersicht: { status: 'ok', laufId: 'l-bau', daten: { basis_ref: 'abc', gekuerzt: false, dateien: [] } },
  pruefergebnis: { status: 'ok', laufId: 'l-bau', ergebnis: 'GRUEN', exitCode: 0 },
  qaErgebnis: { status: 'ok', laufId: 'l-qa', urteil: 'BEREIT', empfehlung: 'Gut.', befunde: [], testfaelle: [] },
  renderNachweis: nachweis({ ergebnis: 'ROT' }),
  ...felder,
})

test('Einbindung „entscheidbar“: Karte nach der qa-Karte, Abnehmen bleibt angeboten; ohne renderNachweis keine Karte', () => {
  const { lage, oben, spalte } = renderAbnahme('w-1', abnahme())
  assert.equal(lage, 'entscheidbar')
  assert.ok(oben.includes('abnahme-qa-karte') && oben.includes('abnahme-render-karte'), 'beide Karten da (qa N3)')
  assert.ok(oben.indexOf('abnahme-qa-karte') < oben.indexOf('abnahme-render-karte'), 'nach der qa-Karte')
  assert.ok(
    oben.indexOf('abnahme-render-karte') < oben.indexOf('id="abnahme-nachweise"'),
    'vor „Nachweise im Einzelnen“'
  )
  assert.match(oben, /<h2 id="abnahme-render-titel">/)
  assert.match(spalte, /value="ANGENOMMEN"/)
  assert.doesNotMatch(spalte, /value="ANGENOMMEN"[^>]*disabled/, 'ein ROT des Render-Nachweises sperrt nichts')
  assert.doesNotMatch(
    renderAbnahme('w-1', abnahme({ renderNachweis: { status: 'fehlt' } })).oben,
    /abnahme-render-karte/
  )
  assert.doesNotMatch(renderAbnahme('w-1', abnahme({ renderNachweis: undefined })).oben, /abnahme-render-karte/)
})

test('Einbindung „vorab“ (nach dem Bau): flache Karte mit h4 im Block; vor dem Bau, „offen“ und „entschieden“ ohne Karte', () => {
  const vorab = renderAbnahme('w-1', abnahme({ workflowStatus: 'KLAERUNG_ERFORDERLICH' }))
  assert.equal(vorab.lage, 'vorab')
  assert.match(
    vorab.unten,
    /<section class="abnahme-stand abnahme-vorab"[\s\S]*<section class="abnahme-render" aria-labelledby="abnahme-render-titel">\s*<h4 id="abnahme-render-titel">[\s\S]*<\/section>/
  )
  assert.doesNotMatch(
    vorab.unten,
    /abnahme-render-karte|entscheiden-karte/,
    'flach wie die Nachbarn (design-guardian 1)'
  )
  // Im Block „vorab“ ist „Abnehmen“ gesperrt — der Hinweis verspricht dort keine Abnahme (qa N2).
  assert.match(vorab.unten, /Darstellung mit Befunden — sie ist nicht der Grund für den Halt\./)
  assert.doesNotMatch(vorab.unten, /Abnahme trotzdem möglich/)
  const entschieden = renderAbnahme(
    'w-1',
    abnahme({
      entscheidung: {
        status: 'ok',
        ergebnis: 'ANGENOMMEN',
        begruendung: 'ok',
        entschiedenAm: '2026-10-29T12:00:00.000Z',
      },
    })
  )
  assert.equal(entschieden.lage, 'entschieden')
  assert.doesNotMatch(entschieden.unten, /abnahme-render/)
  const vorDemBau = renderAbnahme(
    'w-1',
    abnahme({ workflowStatus: 'KLAERUNG_ERFORDERLICH', aenderungsuebersicht: { status: 'noch_nicht_gelaufen' } })
  )
  assert.equal(vorDemBau.lage, 'vorab')
  assert.doesNotMatch(vorDemBau.unten, /abnahme-render/, 'vor dem Bau gibt es kein Ergebnis (qa N3)')
  const offen = renderAbnahme('w-1', abnahme({ workflowStatus: 'WARTET_FREIGABE' }))
  assert.equal(offen.lage, 'offen')
  assert.doesNotMatch(offen.unten, /abnahme-render/)
})

test('Poll-Kennzeichen: views/workflows.js nimmt renderNachweisKennung ins Abnahme-Kennzeichen (qa N3)', () => {
  const quelle = readFileSync(new URL('./workflows.js', import.meta.url), 'utf8')
  assert.match(quelle, /const kennzeichen = `[^`]*\$\{renderNachweisKennung\(abnahme\.renderNachweis\)\}/)
})
