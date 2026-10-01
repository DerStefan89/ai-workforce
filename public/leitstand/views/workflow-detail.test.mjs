/**
 * Datei: public/leitstand/views/workflow-detail.test.mjs
 *
 * Zweck: node:test-Fälle für die Render-Bausteine von Auftrag & Ablauf (F44 WS-4a,
 * views/workflow-detail.js): Timeline in Planreihenfolge (auch bei Zyklus und Rest außerhalb der
 * Kette), Status- und Lageabbildung aus status/naechster.art, Verantwortung („Du“ bei einem Halt,
 * sonst die Rolle), Aktionen nur nach naechster.art bzw. status, Escaping aller Servertexte sowie
 * Leer- und Fehlerzustand der Liste „Aufträge“.
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 *
 * Wichtig: Das Modul wird ohne DOM importiert (Import-Sicherheit); i18n gilt in Node als de.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  beschreibeLage,
  lageKategorie,
  ordneSchritteNachPlan,
  renderAktionen,
  renderAufEinenBlick,
  renderTechnik,
  renderTimeline,
  renderWorkflowListe,
  renderWorkflowUngueltig,
  schrittStatusSatz,
  seitenTitel,
  verantwortung,
} from './workflow-detail.js'

/** Drei Schritte, absichtlich NICHT in Planreihenfolge niedergeschrieben. */
const SCHRITTE = [
  { schritt_id: 's3', rolle: 'code-reviewer', worker: 'codex', modell: 'gpt', freigabe: 'KEINE', status: 'OFFEN', nachfolger: null, lauf_id: null, zeitgrenze_ms: 1000 },
  { schritt_id: 's1', rolle: 'architekt', worker: 'codex', modell: 'gpt', freigabe: 'KEINE', status: 'ERFOLGREICH', nachfolger: 's2', lauf_id: 'l1', zeitgrenze_ms: 1000 },
  { schritt_id: 's2', rolle: 'ausfuehrung', worker: 'claude-code', modell: 'sonnet', freigabe: 'ZWINGEND', status: 'WARTET_FREIGABE', nachfolger: 's3', lauf_id: null, zeitgrenze_ms: 1000 },
]

test('Timeline: Schritte in Planreihenfolge, je Schritt Rollenname, Status als Satz und Verantwortung', () => {
  const geordnet = ordneSchritteNachPlan(SCHRITTE)
  assert.deepEqual(
    geordnet.map((e) => e.schritt.schritt_id),
    ['s1', 's2', 's3']
  )
  const html = renderTimeline(geordnet, { naechster: { art: 'haltFreigabe', schrittId: 's2' }, cursorId: 's2' })
  const reihenfolge = ['Architekt', 'Umsetzung', 'Code Review'].map((name) => html.indexOf(`<h3>${name}`))
  assert.ok(reihenfolge.every((i, n) => i > 0 && (n === 0 || i > reihenfolge[n - 1])), `Reihenfolge der Rollen: ${reihenfolge}`)
  assert.match(html, /<li class="done">\s*<h3>Architekt<\/h3>\s*<p>Abgeschlossen<\/p>/)
  assert.match(html, /<li class="current">\s*<h3>Umsetzung <span class="ablauf-marke">Deine Freigabe<\/span><\/h3>\s*<p>Wartet auf deine Freigabe<\/p>/)
  assert.match(html, /Verantwortung: claude-code · Start nur mit deiner Freigabe · <code>s2<\/code>/)
  assert.match(html, /<li>\s*<h3>Code Review<\/h3>\s*<p>Noch nicht begonnen<\/p>/)
  // Keine erfundenen Zweck-Sätze: je Schritt genau ein <p> (der Status).
  assert.equal((html.match(/<p>/g) ?? []).length, 3)
})

test('Timeline: Zyklus und Rest außerhalb der Kette werden ausgewiesen, nicht still eingereiht (F-247)', () => {
  const kaputt = [
    { schritt_id: 'a', rolle: 'ausfuehrung', status: 'OFFEN', nachfolger: 'b' },
    { schritt_id: 'b', rolle: 'qa', status: 'OFFEN', nachfolger: null },
    { schritt_id: 'x', rolle: 'scout', status: 'FEHLGESCHLAGEN', nachfolger: 'x' },
  ]
  const geordnet = ordneSchritteNachPlan(kaputt)
  assert.deepEqual(
    geordnet.map((e) => [e.schritt.schritt_id, e.inKette]),
    [
      ['a', true],
      ['b', true],
      ['x', false],
    ]
  )
  const html = renderTimeline(geordnet)
  assert.match(html, /<li class="fehler">\s*<h3>Scout <span class="ablauf-marke fehler">außerhalb der Kette<\/span>/)
  assert.match(renderTechnik({ daten: { status: 'OFFEN', schritte: kaputt }, versionSequenz: 1, naechster: null, geordnet }), /Schritte \(Planreihenfolge, 1 außerhalb der Kette\)/)
})

test('Statusabbildung: Lage und Farbe nur aus status und naechster.art; LAEUFT hat Vorrang', () => {
  assert.equal(beschreibeLage('WARTET_FREIGABE', { art: 'haltFreigabe' }), 'Wartet auf deine Freigabe')
  assert.equal(lageKategorie('WARTET_FREIGABE', { art: 'haltFreigabe' }), 'warten')
  assert.equal(beschreibeLage('LAEUFT', { art: 'haltFreigabe' }), 'Läuft')
  assert.equal(lageKategorie('LAEUFT', { art: 'haltFreigabe' }), 'ok')
  assert.equal(beschreibeLage('OFFEN', { art: 'starte' }), 'Bereit zum Start')
  assert.equal(beschreibeLage('ABGESCHLOSSEN', { art: 'fertig' }), 'Durchgelaufen')
  assert.equal(beschreibeLage('GESTOPPT', { art: 'haltGestoppt' }), 'Gestoppt')
  assert.equal(beschreibeLage('OFFEN', null), 'Nicht bestimmbar – die Fassung validiert nicht')
  assert.equal(lageKategorie('OFFEN', null), 'fehler')
  assert.equal(beschreibeLage('OFFEN', { art: 'neu<x>' }), 'Unbekannter Ausgang „neu<x>“')
  assert.equal(lageKategorie('OFFEN', { art: 'neu' }), 'neutral')
  assert.equal(schrittStatusSatz('UEBERSPRUNGEN'), 'Übersprungen')
  assert.equal(schrittStatusSatz('NEU'), 'NEU')
})

test('Auf einen Blick: Status, Projekt, aktueller Schritt; Verantwortung „Du“ bei einem Halt, sonst die Rolle', () => {
  const geordnet = ordneSchritteNachPlan(SCHRITTE)
  const halt = renderAufEinenBlick({ daten: { status: 'WARTET_FREIGABE', aktiver_schritt_id: 's2' }, naechster: { art: 'haltFreigabe', schrittId: 's2' }, geordnet, projektName: 'Projekt <A>' })
  assert.match(halt, /<dt>Status<\/dt><dd><span class="ablauf-status warten">Wartet auf deine Freigabe<\/span><\/dd>/)
  assert.match(halt, /<dt>Projekt<\/dt><dd>Projekt &lt;A&gt;<\/dd>/)
  assert.match(halt, /<dt>Aktueller Schritt<\/dt><dd>Umsetzung <code>s2<\/code><\/dd>/)
  assert.match(halt, /<dt>Verantwortung<\/dt><dd>Du<\/dd>/)

  const laeuft = renderAufEinenBlick({ daten: { status: 'LAEUFT', aktiver_schritt_id: 's3' }, naechster: { art: 'haltFreigabe', schrittId: 's3' }, geordnet, projektName: 'P' })
  assert.match(laeuft, /<dt>Verantwortung<\/dt><dd>Code Review<\/dd>/, 'LAEUFT hat Vorrang vor dem Halt')
  // Ohne Cursor der vom Server genannte nächste Schritt; ohne beides „–“.
  assert.equal(verantwortung('OFFEN', { art: 'starte', schrittId: 's1' }, geordnet[0].schritt), 'Architekt')
  assert.match(renderAufEinenBlick({ daten: { status: 'OFFEN', aktiver_schritt_id: null }, naechster: { art: 'starte', schrittId: 's1' }, geordnet, projektName: 'P' }), /<dd>Architekt <code>s1<\/code><\/dd>/)
  assert.match(renderAufEinenBlick({ daten: { status: 'ABGESCHLOSSEN', aktiver_schritt_id: null }, naechster: { art: 'fertig', schrittId: null }, geordnet, projektName: 'P' }), /<dt>Aktueller Schritt<\/dt><dd>–<\/dd>/)
})

test('Aktionen nur nach naechster.art bzw. status; kein Stopp bei ungültiger Fassung (F-241)', () => {
  const freigabe = renderAktionen('w<1>', 'WARTET_FREIGABE', { art: 'haltFreigabe', schrittId: 's2' })
  assert.match(freigabe, /data-aktion="freigabe-oeffnen" data-workflow-id="w&lt;1&gt;" aria-haspopup="dialog">Nächsten Schritt freigeben</)
  assert.match(freigabe, /data-aktion="stopp-oeffnen"[^>]*>Ausführung stoppen</)
  assert.doesNotMatch(freigabe, /data-aktion="starten"/)
  // Der Freigabeweg selbst (Begründung, Freigeben & starten) steht nur im Dialog, nie in der Zeile.
  assert.doesNotMatch(freigabe, /wf-freigabe-begruendung|data-aktion="freigeben"/)

  const starte = renderAktionen('w1', 'OFFEN', { art: 'starte', schrittId: 's1' })
  assert.match(starte, /data-aktion="starten"[^>]*>Starten</)
  assert.match(starte, /Darf ohne Rückfrage starten: <code>s1<\/code>/)
  assert.doesNotMatch(starte, /freigabe-oeffnen/)

  assert.doesNotMatch(renderAktionen('w1', 'OFFEN', { art: 'starte', schrittId: 's1' }, true), /stopp-oeffnen/)
  assert.equal(renderAktionen('w1', 'ABGESCHLOSSEN', { art: 'fertig', schrittId: null }), '')
  assert.equal(renderAktionen('w1', 'GESTOPPT', { art: 'haltGestoppt', schrittId: null }), '')
})

test('Escaping: Ziel, Grund, IDs, Worker und Verstöße erscheinen als Text', () => {
  const liste = renderWorkflowListe([{ workflowId: 'w"<1>', ziel: '<script>alert(1)</script>', status: 'KLAERUNG_ERFORDERLICH', versionSequenz: 3, aktiverSchrittId: 's<2>', grund: 'Grund <b>fett</b>', naechster: { art: 'haltKlaerung', schrittId: 's2' } }])
  assert.doesNotMatch(liste, /<script>|<b>fett/)
  assert.match(liste, /href="#\/workflows\/w%22%3C1%3E" data-workflow-id="w&quot;&lt;1&gt;"/)
  assert.match(liste, /<h3>&lt;script&gt;alert\(1\)&lt;\/script&gt;<\/h3>/)
  assert.match(liste, /<code>w&quot;&lt;1&gt;<\/code> · Fassung 3 · Schritt <code>s&lt;2&gt;<\/code>/)
  assert.match(liste, /Grund: Grund &lt;b&gt;fett&lt;\/b&gt;/)
  assert.match(liste, /<span class="ablauf-status warten">Steht – Klärung nötig<\/span>/)

  const timeline = renderTimeline([{ schritt: { schritt_id: 'x<1>', rolle: 'eigene<rolle>', worker: '<w>', status: 'OFFEN' }, inKette: true }])
  assert.match(timeline, /<h3>eigene&lt;rolle&gt;<\/h3>/)
  assert.match(timeline, /Verantwortung: &lt;w&gt;/)
  assert.match(renderWorkflowUngueltig(['Feld <x> fehlt']), /<li>Feld &lt;x&gt; fehlt<\/li>/)
  const technik = renderTechnik({ daten: { ziel: '<i>Z</i>', status: 'OFFEN', grund: '<u>', aktiver_schritt_id: null }, versionSequenz: 1, naechster: { art: 'starte', grund: '<g>', schrittId: null } })
  assert.doesNotMatch(technik, /<i>Z<\/i>|<u>|<g>/)
  // Der Titel ist Text (textContent); ohne Ziel die ID.
  assert.equal(seitenTitel('  ', 'w-1'), 'w-1')
  assert.equal(seitenTitel('Ziel', 'w-1'), 'Ziel')
})

test('Leer- und Fehlerzustand der Liste und der Timeline', () => {
  const leer = renderWorkflowListe([])
  assert.match(leer, /<div class="empty"><h3>Noch keine Aufträge mit Ablauf\.<\/h3>/)
  const fehler = renderWorkflowListe(null)
  assert.match(fehler, /<div class="note red"><strong>Aufträge nicht verfügbar\.<\/strong>/)
  assert.doesNotMatch(fehler, /Noch keine Aufträge/, 'eine defekte Quelle ist keine Entwarnung')
  assert.match(renderTimeline([]), /Diese Fassung trägt keine lesbaren Schritte\./)
  // F12 ohne Schritte: nur die Kopfdaten, keine leere Tabelle.
  const technik = renderTechnik({ daten: { status: 'OFFEN' }, versionSequenz: 1, naechster: null })
  assert.match(technik, /Verdikt des Automaten<\/th><td><span class="unbekannt">nicht bestimmbar<\/span>/)
  assert.doesNotMatch(technik, /ablauf-schritte/)
})

test('F12: Schritttabelle mit allen Feldern, Cursor, fällig, aktivem Lauf und Lauf-Verweis', () => {
  const geordnet = ordneSchritteNachPlan(SCHRITTE)
  const html = renderTechnik({ daten: { status: 'WARTET_FREIGABE', aktiver_schritt_id: 's2', version: 2 }, versionSequenz: 5, naechster: { art: 'haltFreigabe', grund: 'ZWINGEND', schrittId: 's2' }, geordnet, aktiveLaufIds: new Set(['l1']) })
  assert.match(html, /Version \(Plan \/ Artefakt\)<\/th><td>2 \/ 5<\/td>/)
  assert.match(html, /<code>s2<\/code> <span class="badge"[^>]*>Cursor<\/span> <span class="badge aktiv"[^>]*>fällig<\/span>/)
  assert.match(html, /<button type="button" class="workflow-lauf-verweis" data-lauf-id="l1">l1<\/button>/)
  assert.match(html, /ERFOLGREICH <span class="badge aktiv">läuft jetzt<\/span>/)
  assert.match(html, /ZWINGEND <span class="unbekannt">\(hält an\)<\/span>/)
  assert.match(html, /KEINE <span class="unbekannt">\(hält nicht an\)<\/span>/)
})

test('Timeline: der vom Server genannte Schritt ist „current“ mit Marke je Ausgang, auch wenn er schon gelaufen ist (Rückfrage des Architekten)', () => {
  const geordnet = ordneSchritteNachPlan(SCHRITTE)
  const html = renderTimeline(geordnet, { naechster: { art: 'haltKlaerung', schrittId: 's1' }, cursorId: 's1' })
  assert.match(html, /<li class="current">\s*<h3>Architekt <span class="ablauf-marke">Klärung nötig<\/span><\/h3>\s*<p>Abgeschlossen<\/p>/)
  // Der Cursor allein macht einen abgeschlossenen Schritt nicht „current“.
  assert.match(renderTimeline(geordnet, { naechster: { art: 'fertig', schrittId: null }, cursorId: 's1' }), /<li class="done">\s*<h3>Architekt<\/h3>/)
})
