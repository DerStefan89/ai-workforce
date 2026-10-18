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
import { AUFTRAG_LANG, entscheidungsModus, hatInstallierbares, renderAuftragKarte, renderFreigabePanel, renderFreigabeSeite, seitenKopf, zeitgrenzeText } from './workflow-entscheiden.js'

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

test('F45 B2a-2 (F-1071): Karte „Arbeitspaket“ zeigt die Einrichtung mit Abhaken; ohne Liste bleibt sie „kommt“', async () => {
  const { renderFreigabeSeite } = await import('./workflow-entscheiden.js')
  const daten = { schritte: [{ schritt_id: 'b', rolle: 'ausfuehrung', worker: 'claude-code', status: 'OFFEN', nachfolger: null, lauf_id: null, freigabe: 'ZWINGEND' }] }
  const naechster = { art: 'haltFreigabe', schrittId: 'b' }
  const mit = renderFreigabeSeite({ workflowId: 'w1', daten, naechster, empfehlung: null, arbeitsordner: null, einrichtung: [{ id: 'E1', schritt: 'Konto', wann: 'vor_dem_bau', status: 'offen' }] })
  assert.match(mit, /entscheiden-einrichtung/)
  assert.match(mit, /Einrichtung durch dich/)
  assert.match(mit, /data-aktion="einrichtung" data-workflow-id="w1" data-id="E1" data-status="erledigt" aria-label="E1 als erledigt abhaken"/)
  const ohne = renderFreigabeSeite({ workflowId: 'w1', daten, naechster, empfehlung: null, arbeitsordner: null, einrichtung: null })
  assert.match(ohne, /aria-labelledby="freigabe-arbeitspaket" aria-disabled="true"/)
  assert.doesNotMatch(ohne, /Einrichtung durch dich/)
})

// ─── F45 B2b-1b-2b (features/F45/plan-b2b1b2.md, Plan 2b P3; F-1106): Plan und Befunde des Advisors ─────────────
const PLAN = { zusammenfassung: 'Plan <Zusammenfassung>', module: [{ name: 'export<x>', zweck: 'CSV <schreiben>' }], entscheidungen: [{ frage: 'Welcher <Stack>?', gewaehlt: 'TypeScript <Node>' }] }
const BEFUND = { id: 'A1', schwere: 'HOCH', evidenz: 'FAKT', fundstelle: 'src/<a>.ts:12', zusammenfassung: 'Fehlt <x>.', korrekturrichtung: 'Im Plan <v2> beheben.' }
const ADVISOR_UEBERARBEITEN = { urteil: 'UEBERARBEITEN', begruendung: 'Begründung <b>', befunde: [BEFUND] }
const RUECKWEG = { anlass_schritt_id: 'schritt-intern-adv', anlass_lauf_id: 'lauf-intern-adv', vorheriger_lauf_id: 'lauf-intern-v1' }
const freigabeMit = (planFreigabe) => renderFreigabeSeite({ daten: DATEN, naechster: NAECHSTER, empfehlung: null, planFreigabe })

test('B2b-1b-2b Freigabe vor Plan v2: „Plan v1 — wird überarbeitet“ mit Satz zu Plan v1, Befunde gehen an den Architekten', () => {
  const html = freigabeMit({ art: 'plan_v2', fassung: 1, plan: PLAN, advisor: ADVISOR_UEBERARBEITEN, advisorIstAnlass: true, keinPlanV2: null, rueckweg: RUECKWEG })
  assert.match(html, /Plan v1 — wird überarbeitet/)
  // Challenger-Entscheidung zum qa-Befund 2b (1): der Satz nennt die Lage ehrlich, der Knopfname kommt aus der Option der Spalte.
  assert.match(html, /Plan v1 lässt sich hier nicht unverändert freigeben, weil der Advisor Änderungen verlangt\. Mit „Ablehnen“ stoppst du den Ablauf\./)
  assert.doesNotMatch(html, /neuen Ablauf an/)
  assert.match(html, /Plan &lt;Zusammenfassung&gt;/)
  assert.match(html, /export&lt;x&gt;[\s\S]*CSV &lt;schreiben&gt;/)
  assert.match(html, /Welcher &lt;Stack&gt;\?[\s\S]*TypeScript &lt;Node&gt;/)
  assert.match(html, /Befunde des Advisors/)
  assert.match(html, /<span class="ablauf-status fehler">Überarbeiten<\/span>/)
  assert.match(html, /<span class="ablauf-status fehler">Hoch<\/span>/)
  assert.match(html, /<code>src\/&lt;a&gt;\.ts:12<\/code>/)
  assert.match(html, /Fehlt &lt;x&gt;\./)
  assert.match(html, /Im Plan &lt;v2&gt; beheben\./)
  assert.match(html, /Diese Befunde gehen an den Architekten\./)
  assert.doesNotMatch(html, /intern|anlass_|vorheriger_|lauf_id|schritt_id/, 'keine internen Kennungen oder Feldnamen')
  assert.ok(html.indexOf('Befunde des Advisors') < html.indexOf('Was startet'), 'die Karten stehen vor „Was startet“')
})

test('B2b-1b-2b Freigabe der Ausführung: Plan v2 mit eingearbeiteten Befunden; Plan v1 ohne Befunde; „Kein Plan v2“', () => {
  const v2 = freigabeMit({ art: 'ausfuehrung', fassung: 2, plan: PLAN, advisor: ADVISOR_UEBERARBEITEN, advisorIstAnlass: true, keinPlanV2: null, rueckweg: RUECKWEG })
  assert.match(v2, /Plan, den du freigibst/)
  assert.match(v2, /Plan v2/)
  assert.match(v2, /In Plan v2 eingearbeitet — bitte prüfen\./)
  assert.doesNotMatch(v2, /wird überarbeitet|lehnt ab und legt/)
  const v1 = freigabeMit({ art: 'ausfuehrung', fassung: 1, plan: PLAN, advisor: { urteil: 'FREIGEGEBEN', begruendung: 'Passt.', befunde: [] }, advisorIstAnlass: false, keinPlanV2: null, rueckweg: null })
  assert.match(v1, /Plan v1/)
  assert.match(v1, /<span class="ablauf-status ok">Freigegeben<\/span>/)
  assert.match(v1, /Keine Befunde\./)
  assert.doesNotMatch(v1, /eingearbeitet|Kein Plan v2/)
  const gesperrt = freigabeMit({ art: 'ausfuehrung', fassung: 2, plan: PLAN, advisor: ADVISOR_UEBERARBEITEN, advisorIstAnlass: false, keinPlanV2: 'Die <Grenze> ist erreicht.', rueckweg: RUECKWEG })
  assert.match(gesperrt, /Kein Plan v2: Die &lt;Grenze&gt; ist erreicht\./)
  assert.doesNotMatch(gesperrt, /eingearbeitet/, 'der Advisor hat Plan v2 erneut geprüft — seine Befunde sind nicht eingearbeitet')
})

test('B2b-1b-2b Freigabe: Plan/Advisor unlesbar ⇒ Satz; kein Advisor ⇒ keine Befund-Karte; ohne Projektion keine Karten', () => {
  const fehler = freigabeMit({ art: 'ausfuehrung', fassung: 1, plan: { fehler: 'nicht_lesbar' }, advisor: { fehler: 'nicht_lesbar' }, advisorIstAnlass: false, keinPlanV2: null, rueckweg: null })
  assert.match(fehler, /Der Plan ist nicht lesbar\./)
  assert.match(fehler, /Das Ergebnis des Advisors ist nicht lesbar\./)
  const ohneAdvisor = freigabeMit({ art: 'ausfuehrung', fassung: 1, plan: PLAN, advisor: null, advisorIstAnlass: false, keinPlanV2: null, rueckweg: null })
  assert.match(ohneAdvisor, /Plan, den du freigibst/)
  assert.doesNotMatch(ohneAdvisor, /Befunde des Advisors/)
  const ohne = freigabeMit(null)
  assert.doesNotMatch(ohne, /Plan, den du freigibst|Befunde des Advisors/)
})

test('F45 B2b-3b-2b-2b-2b-2 (F-1144): Auftragstext wörtlich und vollständig vor „Was startet“, nur als Text', () => {
  const text = 'Baue den Export.\n  - CSV <script>alert(1)</script>\n  - Zeile mit &amp;'
  const html = renderFreigabeSeite({ daten: DATEN, naechster: NAECHSTER, empfehlung: null, auftragstext: text })
  assert.match(html, /<h2 id="freigabe-auftrag">Auftrag für diesen Schritt<\/h2>/)
  assert.ok(html.includes('<pre class="entscheiden-auftrag-text">Baue den Export.\n  - CSV &lt;script&gt;alert(1)&lt;/script&gt;\n  - Zeile mit &amp;amp;</pre>'), 'wörtlich, Umbrüche und Einrückung erhalten, escaped')
  assert.doesNotMatch(html, /<script>/)
  assert.doesNotMatch(html, /<details class="entscheiden-auftrag-klappe"/, 'kurz ⇒ nicht eingeklappt')
  assert.match(html, /So wurde der Auftrag angelegt. Beim Start ergänzt oder umrahmt das System ihn je nach Rolle[\s\S]*Abnahmekriterien[\s\S]*Anpassungswünsche/, 'qa 4')
  assert.ok(html.indexOf('freigabe-auftrag') < html.indexOf('freigabe-was-startet'), 'vor „Was startet“')
})

test('F-1144: langer Auftragstext — Vorschau und aufklappbar der ganze Text; fehlt er, ein Hinweis statt leerer Fläche', () => {
  const zeilen = Array.from({ length: AUFTRAG_LANG.zeilen + 8 }, (_, i) => `Zeile ${i + 1}: Anforderung <${i}>`)
  const html = renderAuftragKarte(zeilen.join('\n'))
  assert.match(html, /entscheiden-auftrag-vorschau">Zeile 1: Anforderung &lt;0&gt;[\s\S]*…<\/pre>/)
  assert.match(html, /<details class="entscheiden-auftrag-klappe" data-klappe="auftrag"><summary>Ganzer Auftrag \([\d.]+ Zeichen\)<\/summary><pre class="entscheiden-auftrag-text">Zeile 1:/, 'design-guardian 5/6: Text passt auf- und zugeklappt, kein Zeilen-Plural')
  assert.ok(html.includes('Zeile 20: Anforderung &lt;19&gt;</pre></details>'), 'die letzte Zeile steht im aufgeklappten Text')
  assert.equal(html.match(/Zeile 20:/g).length, 1, 'die Vorschau endet vorher')
  assert.match(renderAuftragKarte('x'.repeat(AUFTRAG_LANG.zeichen + 1)), /data-klappe="auftrag"/, 'auch eine einzige lange Zeile klappt ein')
  for (const fehlt of [null, undefined, '', '  \n ']) {
    const leer = renderAuftragKarte(fehlt)
    assert.match(leer, /note amber entscheiden-auftrag-fehlt">Der Auftragstext ist nicht lesbar/, String(fehlt))
    assert.doesNotMatch(leer, /<pre/)
  }
  assert.match(renderFreigabeSeite({ daten: DATEN, naechster: NAECHSTER, empfehlung: null }), /Der Auftragstext ist nicht lesbar/, 'Detail ohne Feld')
  const mitPlan = freigabeMit({ art: 'ausfuehrung', fassung: 1, plan: PLAN, advisor: null })
  assert.ok(mitPlan.indexOf('freigabe-plan') < mitPlan.indexOf('freigabe-auftrag') && mitPlan.indexOf('freigabe-auftrag') < mitPlan.indexOf('freigabe-was-startet'), 'qa 5: nach dem Plan, vor „Was startet“')
})

test('F45 B2b-3b-2b-2b-2b-2: Freigabeseite zeigt die abweichende Claude-Code-Version als Zeile — nur mit vollständigem Hinweis', () => {
  const hinweis = { art: 'cliVersionGeaendert', installiert: '2.1.300 (Claude Code)', deklariert: '2.1.258 (Claude Code)', anleitung: 'docs/harness/startfreigabe-erneuern.md#projekt-startfreigabe-erneuern' }
  const html = renderFreigabeSeite({ daten: DATEN, naechster: NAECHSTER, empfehlung: null, auftragstext: 'a', projektCliHinweis: hinweis })
  assert.match(html, /^<div class="entscheiden-inhalt"><p class="note amber entscheiden-cli-hinweis">Die installierte Claude-Code-Version weicht von der Startfreigabe dieses Projekts ab \(installiert: 2\.1\.300 \(Claude Code\), Startfreigabe: 2\.1\.258 \(Claude Code\)\) — der Lauf startet trotzdem, sein Ergebnis gilt\. Startfreigabe des Projekts bei Gelegenheit erneuern\. Anleitung: docs\/harness\/startfreigabe-erneuern\.md#projekt-startfreigabe-erneuern<\/p>/, 'design-guardian 8: vor dem Start ohne Perfekt')
  for (const kein of [null, undefined, { ...hinweis, anleitung: 1 }, { ...hinweis, art: 'anders' }]) {
    assert.doesNotMatch(renderFreigabeSeite({ daten: DATEN, naechster: NAECHSTER, empfehlung: null, projektCliHinweis: kein }), /entscheiden-cli-hinweis/)
  }
  assert.match(renderFreigabePanel({ workflowId: 'w', empfehlung: null }), /Freigeben/, 'keine zusätzliche Bestätigung in der Spalte')
  assert.doesNotMatch(renderFreigabePanel({ workflowId: 'w', empfehlung: null }), /Claude-Code-Version/)
})
