/**
 * Datei: public/leitstand/views/workflow-entscheiden.test.mjs
 *
 * Zweck: node:test-Fälle für views/workflow-entscheiden.js und views/entscheidung-panel.js (F46 D2):
 * Modus der Seite (Freigabe vor Abnahme, ungültige Fassung ohne Freigabe-Modus), Kopf je Modus, die
 * Hauptspalte der Freigabe (Schritte mit Rolle, fälliger Schritt, Werkzeugsatz, Zeitgrenze, Risiko,
 * „kommt“ für Kontrolltiefe, Schätzung und Arbeitspaket, Empfehlung nur lesend), die Spalte „Deine
 * Entscheidung“ (drei Optionen, „Freigeben & installieren“ nur bei installierbarer Empfehlung,
 * Absenden gesperrt) und bedienZustand. Escaping aller Serverwerte, keine Platzhalter der Vorlage.
 *
 * Wird aufgerufen von: `npm run test` (node --test). Die Module sind rein (in Node gilt de).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bedienZustand } from './entscheidung-panel.js'
import { entscheidungsModus, hatInstallierbares, renderFreigabePanel, renderFreigabeSeite, seitenKopf, zeitgrenzeText } from './workflow-entscheiden.js'

const schritt = (schritt_id, rolle, worker, felder = {}) => ({ schritt_id, rolle, worker, modell: 'm-1', werkzeugsatz: 'lesend', freigabe: 'AUTOMATISCH', status: 'OFFEN', lauf_id: null, zeitgrenze_ms: 600000, risiko: 'r', nachfolger: null, ...felder })
const DATEN = {
  status: 'WARTET_FREIGABE',
  ziel: 'Ziel <x>',
  schritte: [
    schritt('s1', 'architekt', 'codex', { status: 'ERFOLGREICH', lauf_id: 'l1', nachfolger: 's2' }),
    schritt('s2', 'ausfuehrung', 'claude-code', { werkzeugsatz: 'schreibend<b>', zeitgrenze_ms: 1800000, risiko: 'Schreibt <Code>', freigabe: 'ZWINGEND', nachfolger: 's3' }),
    schritt('s3', 'code-reviewer', 'codex'),
  ],
}
const NAECHSTER = { art: 'haltFreigabe', schrittId: 's2', grund: 'g' }
const ABNAHME_OFFEN = { workflowStatus: 'ABGESCHLOSSEN', freigabeHalt: null, entscheidung: { status: 'nicht_vorhanden' }, urteil: { status: 'noch_nicht_gelaufen' } }

test('Modus: Freigabe bei haltFreigabe, Abnahme bei entscheidbarer Abnahme, sonst null', () => {
  assert.equal(entscheidungsModus({ daten: DATEN, naechster: NAECHSTER, ungueltig: false }, null), 'freigabe')
  assert.equal(entscheidungsModus({ daten: DATEN, naechster: NAECHSTER, ungueltig: true }, null), null, 'ungültige Fassung: Reparatur statt Freigabe-Seite')
  assert.equal(entscheidungsModus({ daten: { status: 'ABGESCHLOSSEN' }, naechster: { art: 'fertig' } }, ABNAHME_OFFEN), 'abnahme')
  assert.equal(entscheidungsModus({ daten: { status: 'ABGESCHLOSSEN' }, naechster: { art: 'fertig' } }, { ...ABNAHME_OFFEN, entscheidung: { status: 'ok' } }), null, 'entschieden')
  assert.equal(entscheidungsModus({ daten: { status: 'LAEUFT' }, naechster: { art: 'starte' } }, ABNAHME_OFFEN), null, 'Abnahme-Antwort hinkt dem Detail hinterher')
  assert.equal(entscheidungsModus({ daten: { status: 'KLAERUNG_ERFORDERLICH' }, naechster: { art: 'haltKlaerung' } }, { ...ABNAHME_OFFEN, workflowStatus: 'KLAERUNG_ERFORDERLICH' }), null, 'vorab bleibt die heutige Ablaufseite')
  assert.equal(entscheidungsModus(null, null), null)
})

test('Kopf je Modus: Art · Eintrag, Frage, Einleitung; ohne Modus das Ziel', () => {
  assert.deepEqual(seitenKopf('freigabe', 'Ziel', null), { art: 'Freigabe', eintrag: 'Ziel', titel: 'Darf der Ablauf starten?', beschreibung: 'Hier siehst du, was startet und mit welchen Rollen. Freigeben braucht eine Begründung, Ablehnen ist ein Veto.' })
  assert.equal(seitenKopf('abnahme', 'Ziel', ABNAHME_OFFEN).titel, 'Passt das Ergebnis?')
  assert.equal(seitenKopf(null, 'Ziel', null).titel, 'Ziel')
  assert.equal(seitenKopf(null, 'Ziel', null).art, null)
})

test('Zeitgrenze lesbar', () => {
  assert.equal(zeitgrenzeText(1800000), '30 min je Lauf')
  assert.equal(zeitgrenzeText(45000), '45 s je Lauf')
  assert.equal(zeitgrenzeText(null), null)
  assert.equal(zeitgrenzeText(0), null)
})

test('Freigabe: Schritte mit Rolle und Worker, fälliger Schritt markiert, Kennzahlen echt bzw. „kommt“', () => {
  const html = renderFreigabeSeite({ daten: DATEN, naechster: NAECHSTER, empfehlung: null })
  const namen = [...html.matchAll(/entscheiden-schritt-name">([^<]*)</g)].map((m) => m[1])
  assert.deepEqual(namen, ['Architekt', 'Umsetzung', 'Code Review'])
  assert.match(html, /entscheiden-schritt-erledigt[\s\S]*erledigt/)
  assert.match(html, /entscheiden-schritt-faellig" aria-current="step"[\s\S]*Claude Code · m-1[\s\S]*startet bei Freigabe/)
  assert.match(html, /<dt>Kontrolltiefe<\/dt><dd><span class="kommt-badge">kommt<\/span><\/dd>/)
  assert.match(html, /<dt>Schätzung<\/dt><dd><span class="kommt-badge">kommt<\/span><\/dd>/)
  assert.match(html, /<dt>Werkzeugsatz<\/dt><dd><code>schreibend&lt;b&gt;<\/code><\/dd>/)
  assert.match(html, /<dt>Zeitgrenze<\/dt><dd>30 min je Lauf<\/dd>/)
  assert.match(html, /Risiko dieses Schritts:<\/span> Schreibt &lt;Code&gt;/)
  assert.match(html, /Arbeitspaket <span class="kommt-badge">kommt<\/span>/)
  assert.match(html, /Für diesen Schritt gibt es keine Katalog-Empfehlung\./)
  assert.doesNotMatch(html, /0,25|WS-8b|\[n\]|\[…\]|\{\{/, 'keine Beispielwerte der Vorlage')
})

test('Freigabe: Empfehlung nur lesend (wird genutzt / vorgeschlagen), kein Installationsknopf auf der Seite', () => {
  const empfehlung = {
    wirdGenutzt: [{ id: 'skill-a', name: 'A <s>', grund: 'passt' }],
    passtNichtImLauf: [{ id: 'mcp-b', name: 'B', grund: 'nicht im Lauf', installierbar: true }],
    weitereAnzahl: { wirdGenutzt: 0, passtNichtImLauf: 2 },
    nichtFreigebbarAnzahl: 0,
  }
  const html = renderFreigabeSeite({ daten: DATEN, naechster: NAECHSTER, empfehlung })
  assert.match(html, /faehigkeit-chip-genutzt">wird genutzt<\/span> <code>skill-a<\/code> A &lt;s&gt;/)
  assert.match(html, /faehigkeit-chip-vorgeschlagen">vorgeschlagen<\/span> <code>mcp-b<\/code>/)
  assert.match(html, /\+ 2 weitere Einträge im Freigabedialog/)
  assert.doesNotMatch(html, /data-installation-aktion/)
  assert.equal(hatInstallierbares(empfehlung), true)
  assert.match(renderFreigabeSeite({ daten: DATEN, naechster: NAECHSTER, empfehlung: { fehler: 'kaputt <x>' } }), /kaputt &lt;x&gt;/)
})

test('Spalte „Deine Entscheidung“ (Freigabe): drei Optionen, installieren nur mit installierbarer Empfehlung, Absenden gesperrt', () => {
  const ohne = renderFreigabePanel({ workflowId: 'w"1', empfehlung: null })
  const optionen = [...ohne.matchAll(/value="(\w+)" data-bestaetigen="([^"]*)"( disabled)?/g)].map((m) => [m[1], m[2], m[3] === ' disabled'])
  assert.deepEqual(optionen, [
    ['freigeben', 'Freigeben bestätigen', false],
    ['installieren', 'Zum Installieren', true],
    ['ablehnen', 'Ablehnen bestätigen', false],
  ])
  assert.match(ohne, /Keine installierbare Fähigkeit vorgeschlagen\./)
  assert.match(ohne, /Veto: der Ablauf startet nicht\./)
  assert.match(ohne, /<textarea id="wf-entscheidung-begruendung" rows="4" aria-required="true"/)
  assert.match(ohne, /class="button primary entscheidung-absenden wf-aktion" data-aktion="freigabe-bestaetigen" data-workflow-id="w&quot;1" data-option=""[^>]*disabled>Option wählen</)
  assert.match(ohne, /Jarvis empfiehlt:<\/span> <span class="kommt-badge">kommt<\/span>/)
  assert.equal((ohne.match(/button primary/g) ?? []).length, 1, 'genau ein Hauptknopf')
  const mit = renderFreigabePanel({ workflowId: 'w1', empfehlung: { wirdGenutzt: [], passtNichtImLauf: [{ id: 'mcp-b', grund: 'g', installierbar: true }], weitereAnzahl: { wirdGenutzt: 0, passtNichtImLauf: 0 }, nichtFreigebbarAnzahl: 0 } })
  assert.match(mit, /value="installieren" data-bestaetigen="Zum Installieren" \/>/)
  assert.match(ohne, /data-aktion="freigabe-bestaetigen"[^>]*aria-haspopup="dialog"/, 'der Knopf öffnet einen Dialog (Prüfpass cr 10)')
})

test('bedienZustand: gesperrt ohne Option, ohne Begründung oder mit gesperrter Option', () => {
  assert.deepEqual(bedienZustand(null, 'x'), { gesperrt: true, text: 'Option wählen', aktion: '' })
  assert.deepEqual(bedienZustand({ wert: 'freigeben', bestaetigen: 'Freigeben bestätigen', erlaubt: true }, '   '), { gesperrt: true, text: 'Freigeben bestätigen', aktion: 'freigeben' })
  assert.deepEqual(bedienZustand({ wert: 'freigeben', bestaetigen: 'Freigeben bestätigen', erlaubt: true }, 'weil'), { gesperrt: false, text: 'Freigeben bestätigen', aktion: 'freigeben' })
  assert.equal(bedienZustand({ wert: 'installieren', bestaetigen: 'x', erlaubt: false }, 'weil').gesperrt, true)
})
