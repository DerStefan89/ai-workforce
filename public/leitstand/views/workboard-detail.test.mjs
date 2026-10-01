/**
 * Datei: public/leitstand/views/workboard-detail.test.mjs
 *
 * Zweck: node:test-Fälle für die Anzeige-Bausteine des Details der Seite „Entwicklung“ (F44 WS-3b,
 * views/workboard-detail.js, Vorlage d_arbeit_f35): Abschnitte je Zustand (Ablauf vorhanden, lädt,
 * nicht verfügbar, keiner), Akte ok/unvollständig/Fehler, Finding-Felder, Planung, Insights als
 * Z-Element ohne Beispieldaten, Statuszeile („Gerade dran“), Escaping aller Akten-, Workitem- und
 * Servertexte. Ausgabe in de (i18n.js ist in Node auf de festgelegt).
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { detailEyebrow, detailInhaltHtml, detailStatusHtml, kartenStatus, phaseHtml } from './workboard-detail.js'

const feature = { quelle: 'feature', typ: 'FEATURE', id: 'F7', titel: 'Bauen <aus> der Akte', status: 'IN_ARBEIT', pfad: 'features/F7/feature.md' }
const finding = { quelle: 'finding', typ: 'BUG', id: 'F-9', titel: 'Fehler', status: 'OFFEN', statusRoh: 'offen <neu>', prioritaet: 'P1', beschreibung: 'Text <script>', fundstelle: 'a.js:1', auswirkung: null, massnahme: 'Fixen', featureRun: null }
const workflow = { workflowId: 'w1', status: 'LAEUFT', ziel: 'Ziel <des> Ablaufs', naechster: { art: 'starte', schrittId: 's2' }, aktiverSchrittId: 's2' }
const schritte = [
  { schritt_id: 's1', rolle: 'ausfuehrung', worker: 'claude-code', status: 'ERFOLGREICH', nachfolger: 's2' },
  { schritt_id: 's2', rolle: 'code-reviewer', worker: 'codex<x>', status: 'LAEUFT', nachfolger: null },
]
const akte = { status: 'ok', titel: 'T', featureStatus: 'IN_ARBEIT', ziel: 'Ein <b>Ziel</b>\nzweite Zeile', nicht_ziele: ['Kein <Ziel>'], akzeptanzkriterien: [{ id: 'AK1', text: 'Erstes <AK>' }] }
const roadmap = { status: 'ok', vision: 'V', meilensteine: [{ id: 'm1', titel: 'Verlässlich <arbeiten>', status: 'LAEUFT', features: [{ id: 'F7', status: 'IN_ARBEIT' }] }] }

/** Sicht mit Standardwerten (Feature, Ablauf, Schritte, Akte, Roadmap). */
const sicht = (aenderung = {}) => ({ workitem: feature, workflow, verknuepfung: 'ok', schritte, akte, roadmap, ...aenderung })

test('Feature mit Ablauf: Wer macht was, Stand x/y, AKs, Nicht-Ziele, Meilenstein — alles escaped', () => {
  const html = detailInhaltHtml(sicht())
  assert.match(html, /Wer macht was – und wofür\?/)
  assert.match(html, /<strong>Umsetzung<\/strong>/, 'Zuvor: Rollenname statt ID')
  assert.match(html, /<strong>Code Review<\/strong>/, 'Jetzt: Rollenname statt ID')
  assert.match(html, /codex&lt;x&gt; · läuft/)
  assert.match(html, /Ziel &lt;des&gt; Ablaufs/)
  assert.match(html, /Was soll möglich werden\?/)
  assert.match(html, /Ein &lt;b&gt;Ziel&lt;\/b&gt;\nzweite Zeile/)
  assert.match(html, /1 von 2 Schritten abgeschlossen/)
  assert.match(html, /50 %/)
  assert.match(html, /aria-valuenow="1"/)
  assert.match(html, /style="width: 50%"/)
  assert.match(html, /<code>AK1<\/code> Erstes &lt;AK&gt;/)
  assert.match(html, /1 Nicht-Ziel/)
  assert.match(html, /Kein &lt;Ziel&gt;/)
  assert.match(html, /Verlässlich &lt;arbeiten&gt;/)
  assert.match(html, /<code>features\/F7\/feature.md<\/code>/)
  assert.match(html, /href="#\/roadmap"/)
  assert.doesNotMatch(html, /<script>|<b>Ziel|<AK>/)
})

test('Z-Elemente: Zeitfenster, Ändern, Planung speichern, Insight hinzufügen sind „kommt“ — keine Beispielkarten', () => {
  const html = detailInhaltHtml(sicht())
  for (const text of ['Zeitfenster ändern', 'Ändern', 'Planung speichern', 'Insight hinzufügen']) {
    assert.match(html, new RegExp(`aria-disabled="true">${text} <span class="kommt-badge">kommt</span>`), text)
  }
  assert.match(html, /Noch keine Erkenntnisse/)
  assert.doesNotMatch(html, /insight-card/)
})

test('Ohne verknüpften Ablauf: Leerzustand in Wer macht was und Stand der Entwicklung', () => {
  const html = detailInhaltHtml(sicht({ workflow: null, schritte: undefined }))
  assert.match(html, /Für diesen Eintrag läuft noch kein Ablauf/)
  assert.match(html, /Noch kein Entwicklungsablauf gestartet/)
  assert.doesNotMatch(html, /progress-track/)
})

test('Verknüpfung lädt bzw. nicht verfügbar; Schritte laden bzw. nicht ladbar', () => {
  assert.match(detailInhaltHtml(sicht({ verknuepfung: 'laedt', workflow: null })), /Lädt…/)
  assert.match(detailInhaltHtml(sicht({ verknuepfung: 'fehlt', workflow: null })), /Ohne Ausführungsstand nicht bestimmbar/)
  assert.match(detailInhaltHtml(sicht({ schritte: undefined })), /Lädt…/)
  assert.match(detailInhaltHtml(sicht({ schritte: null })), /Die Schritte des Ablaufs konnten nicht geladen werden/)
  assert.match(detailInhaltHtml(sicht({ schritte: [] })), /Der Ablauf hat keine Schritte/)
})

test('Akte unvollständig: Grund und Pfad (escaped); Akte nicht lesbar: Fehlerhinweis; Akte lädt', () => {
  const unvollstaendig = detailInhaltHtml(sicht({ akte: { status: 'unvollstaendig', grund: "Abschnitt '## Ziel' fehlt <x>" } }))
  assert.match(unvollstaendig, /Die Akte ist unvollständig\./)
  assert.match(unvollstaendig, /Abschnitt &#39;## Ziel&#39; fehlt &lt;x&gt;|Abschnitt '## Ziel' fehlt &lt;x&gt;/)
  assert.match(unvollstaendig, /<code>features\/F7\/feature.md<\/code>/)
  assert.match(unvollstaendig, /Kein Ziel lesbar/)
  const fehler = detailInhaltHtml(sicht({ akte: { status: 'fehler', meldung: '404 <weg>' } }))
  assert.match(fehler, /Die Akte konnte nicht gelesen werden/)
  assert.match(fehler, /404 &lt;weg&gt;/)
  assert.match(detailInhaltHtml(sicht({ akte: undefined, roadmap: undefined })), /Die Akte wird gelesen/)
})

test('Meilenstein: nicht eingeplant, keine Roadmap, nicht verfügbar', () => {
  assert.match(detailInhaltHtml(sicht({ roadmap: { ...roadmap, meilensteine: [] } })), /Noch nicht eingeplant/)
  assert.match(detailInhaltHtml(sicht({ roadmap: { status: 'nicht_vorhanden' } })), /Keine Roadmap angelegt/)
  assert.match(detailInhaltHtml(sicht({ roadmap: { status: 'fehler' } })), /Roadmap nicht verfügbar/)
})

test('Finding: Frage nach Typ, Beschreibung und Felder escaped, Kriterien-Hinweis, Priorität ohne Meilenstein', () => {
  const html = detailInhaltHtml(sicht({ workitem: finding, akte: undefined, roadmap: undefined, workflow: null }))
  assert.match(html, /Was funktioniert nicht\?/)
  assert.match(html, /Text &lt;script&gt;/)
  assert.match(html, /<dt>Fundstelle<\/dt><dd>a.js:1<\/dd>/)
  assert.match(html, /<dt>Maßnahme<\/dt><dd>Fixen<\/dd>/)
  assert.match(html, /<dt>Auswirkung<\/dt><dd><span class="subtle">–<\/span><\/dd>/)
  assert.match(html, /Die Kriterien entstehen, wenn du einen Auftrag vorbereitest/)
  assert.match(html, /<dt>Priorität<\/dt><dd>P1<\/dd>/)
  assert.doesNotMatch(html, /Meilenstein|href="#\/roadmap"/)
  assert.match(detailInhaltHtml(sicht({ workitem: { ...finding, typ: 'HARNESS_IMPROVEMENT' }, workflow: null })), /Was soll besser werden\?/)
})

test('Statuszeile: Status, Phase, Gerade dran (Rolle des laufenden Schritts bzw. „Du“ beim Halt)', () => {
  const laeuft = detailStatusHtml(sicht())
  assert.match(laeuft, /In Ausführung/)
  assert.match(laeuft, /Gerade dran: <strong>Code Review<\/strong>/)
  const freigabe = detailStatusHtml(sicht({ workflow: { ...workflow, status: 'WARTET_FREIGABE', naechster: { art: 'haltFreigabe', schrittId: 's2' } } }))
  assert.match(freigabe, /Deine Freigabe/)
  assert.match(freigabe, /Gerade dran: <strong>Du<\/strong>/)
  assert.match(detailStatusHtml(sicht({ workflow: null })), /Phase: <strong>Kein Ablauf<\/strong>/)
  assert.match(detailStatusHtml(sicht({ verknuepfung: 'laedt', workflow: null })), /Phase: <strong>Lädt…<\/strong>/)
})

test('Kopf, Kartenstatus und Phase: Typ · ID, Rohstatus escaped im title', () => {
  assert.equal(detailEyebrow(feature), 'Feature · F7')
  assert.equal(detailEyebrow({ ...finding, typ: 'NEU<' }), 'NEU< · F-9')
  assert.match(kartenStatus(finding), /title="offen &lt;neu&gt;">Offen</)
  assert.match(phaseHtml({ ...workflow, status: 'NEU<' }), /title="NEU&lt;">Unbekannter Ablaufstatus/)
  assert.equal(phaseHtml(null), '')
})

test('Abgeschlossener Ablauf: letzter Schritt unter Zuvor, „Deine Abnahme“ unter Jetzt und „Du“ bei offener Abnahme', () => {
  const fertig = { ...workflow, status: 'ABGESCHLOSSEN', naechster: null }
  const erledigt = schritte.map((s) => ({ ...s, status: 'ERFOLGREICH' }))
  const offen = sicht({ workflow: fertig, schritte: erledigt, abnahmeOffen: true })
  const html = detailInhaltHtml(offen)
  assert.match(html, /Zuvor<\/span><strong>Code Review<\/strong>/)
  assert.match(html, /Jetzt<\/span><strong>Deine Abnahme<\/strong><p>Menschliche Entscheidung/)
  assert.match(detailStatusHtml(offen), /Gerade dran: <strong>Du<\/strong>/)
  const ohneAbnahme = sicht({ workflow: fertig, schritte: erledigt, abnahmeOffen: false })
  assert.match(detailInhaltHtml(ohneAbnahme), /Jetzt<\/span><strong>Ablauf abgeschlossen<\/strong>/)
  assert.match(detailStatusHtml(ohneAbnahme), /Gerade dran: <strong>–<\/strong>/)
})
