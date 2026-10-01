/**
 * Datei: public/leitstand/views/workflow-eingriffe.test.mjs
 *
 * Zweck: node:test-Fälle für views/workflow-eingriffe.js (F44 WS-4b, Abgleich F-725 F6, F8, F9): die
 * Notizen über der Timeline (Rückfrage, Sichtung, Reparatur — rot bei ungültiger Fassung, sonst
 * bernstein), die Dialoginhalte, der Reparatureditor mit seinen IDs und die Reparaturwarnungen
 * F-219/223/226/240/384 mit unverändertem Inhalt; Escaping aller Serverwerte.
 *
 * Wird aufgerufen von: `npm run test` (node --test). Das Modul ist rein: der Import läuft in Node
 * ohne DOM (in Node gilt de).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  baueReparaturEntwurf,
  ermittleAbgeschwaechteFreigabenAnzeige,
  ermittleReparaturWarnungen,
  renderArchitekturEntscheidung,
  renderDialogInhalt,
  renderEingriffe,
  renderReparatur,
  renderReparaturWarnungen,
} from './workflow-eingriffe.js'

const FRAGE = (frage, empfehlung = 'B') => ({ frage, auswirkung_bestand: 'nur <Anzeige>', begruendung: 'weil', empfehlung, optionen: [{ titel: 'A', vorteile: ['schnell'], nachteile: ['<riskant>'] }, { titel: 'B', vorteile: [], nachteile: [] }] })

test('Notizen: Rückfrage mit erster Frage und „(+n weitere Fragen)“, Sichtung, Reparatur — in dieser Reihenfolge; ohne Eingriff leer', () => {
  assert.equal(renderEingriffe('w-1', 'OFFEN'), '')
  const html = renderEingriffe('w-1', 'KLAERUNG_ERFORDERLICH', false, { schrittId: 's1', fragen: [FRAGE('Erste <Frage>?'), FRAGE('Zweite?'), FRAGE('Dritte?')] }, { schrittId: 's2', laufId: 'l<2>', nachfolger: 's3' })
  const reihenfolge = ['wf-klaerung', 'wf-sichtung', 'wf-reparatur-notiz'].map((k) => html.indexOf(k))
  assert.ok(reihenfolge.every((i, n) => i > 0 && (n === 0 || i > reihenfolge[n - 1])), `Reihenfolge: ${reihenfolge}`)
  assert.match(html, /<div class="note amber wf-klaerung">\s*<strong>Jarvis braucht deine Entscheidung\.<\/strong>\s*<p>Erste &lt;Frage&gt;\? <span class="wf-weitere">\(\+2 weitere Fragen\)<\/span><\/p>/)
  assert.match(html, /data-aktion="klaerung-oeffnen" data-workflow-id="w-1" aria-haspopup="dialog">Rückfrage beantworten</)
  assert.match(html, /<strong>Abgelehnte Befehle sichten<\/strong>[\s\S]*Schritt <code>s2<\/code> endete VERWEIGERT[\s\S]*Laufs <code>l&lt;2&gt;<\/code>/)
  assert.match(html, /href="#\/runs\/l%3C2%3E"/)
  assert.match(html, /data-aktion="sichtung-oeffnen"/)
  assert.match(html, /<div class="note amber wf-reparatur-notiz">\s*<strong>Der Ablauf steht\.<\/strong>[\s\S]*data-aktion="reparatur"[^>]*>Ablauf reparieren</)
  assert.doesNotMatch(html, /Bedienung/, 'keine Überschrift „Bedienung“ mehr')
  // Eine einzige Frage: kein Zusatz „weitere“.
  assert.doesNotMatch(renderEingriffe('w-1', 'KLAERUNG_ERFORDERLICH', false, { schrittId: 's1', fragen: [FRAGE('Nur eine?')] }), /weitere/)
})

test('Notizen: ungültige Fassung rot („nicht gültig“), ohne Sichtung; Reparatur auch außerhalb GESTOPPT/KLAERUNG (F-247)', () => {
  const html = renderEingriffe('w-1', 'OFFEN', true, null, { schrittId: 's2', laufId: 'l', nachfolger: 's3' })
  assert.match(html, /<div class="note red wf-reparatur-notiz">\s*<strong>Dieser Ablauf ist nicht gültig\. Start und Freigabe sind gesperrt\.<\/strong>/)
  assert.match(html, /Diese Fassung validiert nicht — aus ihr startet kein Lauf\. Der Weg heraus ist eine neue Fassung derselben <code>workflow_id<\/code>\./)
  assert.doesNotMatch(html, /wf-sichtung/, 'mit Zusatzgründen bleibt allein die Reparatur (F-768)')
  assert.match(renderEingriffe('w-1', 'GESTOPPT'), /Der Ablauf steht\./)
})

test('Rückfrage-Formular: Empfehlung per Titel vorgewählt (F-711), Vor- und Nachteile, Begründung je Frage, Escaping', () => {
  const html = renderArchitekturEntscheidung('w-1', { schrittId: 's<1>', fragen: [FRAGE('F1', 'B'), FRAGE('F2', 'A')] })
  assert.match(html, /name="wf-architektur-frage-0" value="B" checked/)
  assert.doesNotMatch(html, /name="wf-architektur-frage-0" value="A" checked/)
  assert.match(html, /name="wf-architektur-frage-1" value="A" checked/)
  assert.match(html, /<span class="ablauf-marke">Empfehlung des Architekten<\/span>/)
  assert.match(html, /<li><span aria-hidden="true">− <\/span>&lt;riskant&gt;<\/li>/)
  assert.match(html, /Auswirkung auf den Bestand: nur &lt;Anzeige&gt;/)
  assert.match(html, /<textarea id="wf-architektur-begruendung-1"/)
  assert.match(html, /Der Architekt hat 2 offene Fragen zu Schritt <code>s&lt;1&gt;<\/code> gestellt/)
  assert.match(html, /data-aktion="architektur-entscheidung" data-workflow-id="w-1" data-schritt-id="s&lt;1&gt;">Entscheidung speichern</)
  assert.equal(renderArchitekturEntscheidung('w-1', null), '')
})

test('Dialoginhalte je Art: Rückfrage und Sichtung nur, wenn fällig; Freigabe mit „Anzeige = Start“; Stopp', () => {
  const basis = { workflowId: 'w-1', daten: { schritte: [{ schritt_id: 's2', rolle: 'ausfuehrung' }] }, naechster: { art: 'haltFreigabe', schrittId: 's2' }, empfehlung: null, architekturEntscheidung: null, sichtung: null }
  assert.equal(renderDialogInhalt('klaerung', basis), null)
  assert.equal(renderDialogInhalt('sichtung', basis), null)
  assert.equal(renderDialogInhalt('unbekannt', basis), null)
  assert.match(renderDialogInhalt('freigabe', basis), /id="wf-freigabe-begruendung"[\s\S]*data-aktion="freigeben"/)
  assert.match(renderDialogInhalt('stopp', basis), /id="wf-stopp-begruendung"[\s\S]*data-aktion="stoppen"/)
  const sichtung = renderDialogInhalt('sichtung', { ...basis, sichtung: { schrittId: 's2', laufId: 'l-2', nachfolger: 's3' } })
  assert.match(sichtung, /<h2 id="workflow-dialog-titel">Abgelehnte Befehle sichten<\/h2>/)
  assert.match(sichtung, /geht es mit <code>s3<\/code> weiter; <code>s2<\/code> bleibt als VERWEIGERT festgehalten/)
  assert.match(sichtung, /<textarea id="wf-sichtung-begruendung" rows="3" aria-required="true"/)
  assert.match(sichtung, /data-aktion="sichtung"[^>]*>Sichtung bestätigt – weiter</)
  assert.match(sichtung, /<p id="workflow-dialog-meldung" class="fehler" tabindex="-1" hidden><\/p>/)
  const klaerung = renderDialogInhalt('klaerung', { ...basis, architekturEntscheidung: { schrittId: 's1', fragen: [FRAGE('F1')] } })
  assert.match(klaerung, /<h2 id="workflow-dialog-titel">Rückfrage beantworten<\/h2>/)
  assert.match(klaerung, /wf-dialog-abbrechen/)
})

const DATEN = {
  workflow_id: 'w-1',
  status: 'GESTOPPT',
  aktiver_schritt_id: null,
  grund: 'G'.repeat(90),
  grenzen: { max_schritte: 1 },
  schritte: [
    { schritt_id: 's1', rolle: 'ausfuehrung', freigabe: 'ZWINGEND', status: 'ERFOLGREICH', lauf_id: 'l-1', nachfolger: 's2' },
    { schritt_id: 's2', rolle: 'code-reviewer', freigabe: 'ZWINGEND', status: 'VERWEIGERT', lauf_id: 'l-2', nachfolger: 's3' },
    { schritt_id: 's3', rolle: 'qa', freigabe: 'KEINE', status: 'OFFEN', lauf_id: null, nachfolger: null, freigabe_erteilt: true },
  ],
}

test('baueReparaturEntwurf: status OFFEN, gescheiterte Schritte zurückgesetzt, Cursor auf den ersten Schritt ohne lauf_id, grund bleibt', () => {
  const entwurf = baueReparaturEntwurf(DATEN)
  assert.equal(entwurf.status, 'OFFEN')
  assert.deepEqual(entwurf.schritte.map((s) => [s.schritt_id, s.status, s.lauf_id]), [
    ['s1', 'ERFOLGREICH', 'l-1'],
    ['s2', 'OFFEN', null],
    ['s3', 'OFFEN', null],
  ])
  assert.equal(entwurf.aktiver_schritt_id, 's2')
  assert.equal(entwurf.grund, DATEN.grund)
})

test('Reparaturwarnungen wie bisher: F-223, F-219, F-226, F-240 (Grund und Grenze), F-384 — Inhalt und Reihenfolge', () => {
  const entwurf = { ...baueReparaturEntwurf(DATEN), schritte: baueReparaturEntwurf(DATEN).schritte.map((s) => (s.schritt_id === 's2' ? { ...s, freigabe: 'KEINE' } : s)) }
  const warnungen = ermittleReparaturWarnungen(DATEN, entwurf)
  assert.deepEqual(
    warnungen.map((w) => w.slice(0, 6)),
    ['F-223:', 'F-219:', 'F-226:', 'F-240:', 'F-240:', 'F-384:']
  )
  assert.equal(warnungen[0], "F-223: Für 's3' ist eine Freigabe erteilt, der Schritt ist aber noch nicht gelaufen. Beim Einreichen verwirft der Server das Feld — der Schritt hält danach erneut an und muss neu freigegeben werden.")
  assert.equal(warnungen[1], "F-219: Die lauf_id von 's2' -> 's3' wird zurückgesetzt. Der Folgeschritt startet dann ohne vorgaengerLaufId — der Lineage-Verweis auf den Vorlauf fehlt. Kein Fehler, aber eine Entscheidung.")
  assert.equal(warnungen[2], "F-226: Dieser Entwurf nimmt die Freigabepflicht von 's2' zurück (ZWINGEND entfällt). Der Server verlangt dafür eine Begründung und hält sie als Entscheidung fest.")
  assert.match(warnungen[3], new RegExp(`^F-240: Der Halt-Grund \\(„${'G'.repeat(80)}…“\\) wird beim Einreichen auf null normalisiert`))
  assert.equal(warnungen[4], 'F-240: Der Entwurf trägt grenzen.max_schritte 1, und 1 Schritt(e) tragen bereits eine lauf_id. Der Automat hält damit sofort wieder an („Grenze erreicht“) — die Grenze gehört angehoben, sonst ist die Reparatur wirkungslos.')
  assert.match(warnungen[5], /^F-384: Der Ausführungsschritt ‚s1‘ ist ERFOLGREICH und behält seine lauf_id ‚l-1‘ — ein Reparaturzug startet ihn NICHT automatisch neu\./)
  // Die Warnung F-384 verschwindet, sobald der Mensch den Ausführungsschritt im Entwurf zurücksetzt.
  const zurueckgesetzt = { ...entwurf, schritte: entwurf.schritte.map((s) => (s.schritt_id === 's1' ? { ...s, status: 'OFFEN', lauf_id: null } : s)) }
  assert.ok(!ermittleReparaturWarnungen(DATEN, zurueckgesetzt).some((w) => w.startsWith('F-384')))
  assert.deepEqual(ermittleAbgeschwaechteFreigabenAnzeige(DATEN.schritte, entwurf.schritte), ['s2'])
  assert.deepEqual(ermittleAbgeschwaechteFreigabenAnzeige(DATEN.schritte, 'kaputt'), [])
})

test('Reparatureditor: IDs bleiben, Warnungen escaped, Leerzustand ohne Warnung, der Entwurf als JSON-Text', () => {
  const html = renderReparatur('w-<1>', { a: '<b>' }, ['F-219: <x>'])
  for (const id of ['workflow-reparatur-warnungen', 'wf-reparatur-begruendung', 'wf-reparatur-entwurf', 'wf-reparatur-einreichen', 'wf-reparatur-verwerfen', 'wf-reparatur-meldung']) assert.match(html, new RegExp(`id="${id}"`), id)
  assert.match(html, /Reparaturfassung für <code>w-&lt;1&gt;<\/code>/)
  assert.match(html, /<li>F-219: &lt;x&gt;<\/li>/)
  assert.match(html, /&quot;a&quot;: &quot;&lt;b&gt;&quot;/)
  assert.match(html, /data-workflow-id="w-&lt;1&gt;"/)
  assert.match(renderReparaturWarnungen([]), /Keine Warnungen zu diesem Entwurf\./)
})
