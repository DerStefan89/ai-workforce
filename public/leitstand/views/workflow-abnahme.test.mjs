/**
 * Datei: public/leitstand/views/workflow-abnahme.test.mjs
 *
 * Zweck: node:test-Fälle für views/workflow-abnahme.js (F44 WS-4b, Abgleich F-725 F13–F18): die drei
 * Lagen (entscheidbar, offen, entschieden), die veraltete Entscheidung, der F18-Hinweis nur bei
 * erzeuger 'kern', „Prüfung wiederholen“ nach unveränderter Regel, die Zeilen für „Auf einen Blick“,
 * kein erfundener Text „Was sich verbessert hat“ und Escaping aller Serverwerte. F46 D2: die Lage
 * „entscheidbar“ als Seite Entscheiden (Hauptspalte, Spalte „Deine Entscheidung“, Vorschau, AK-Zahlen).
 *
 * Wird aufgerufen von: `npm run test` (node --test). Das Modul ist rein: der Import läuft in Node
 * ohne DOM (in Node gilt de).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { abnahmeEinleitung, abnahmeLage, budgetKennung, erlaubteAbnahmeAktionen, pruefungWiederholbar, qaHinweise, qaHinweisKennung, renderAbnahme, renderAbnahmeBlick, renderKanalImLauf, reviewHinweise, renderUmfangHinweis, reviewHinweisKennung, umfangKennung, zaehleAkUrteile } from './workflow-abnahme.js'

const URTEIL = {
  status: 'ok',
  laufId: 'l-review',
  urteil: 'BEREIT',
  empfehlung: 'Abnehmen <b>bitte</b>',
  befunde: [{ schwere: 'MITTEL', fundstelle: 'src/a.ts:3', zusammenfassung: 'Name <unklar>', beleg: 'Zeile 3 "x"' }],
  ak_urteile: [
    { ak_id: 'AK1', urteil: 'ERFUELLT', beleg: 'Test <grün>' },
    { ak_id: 'AK2', urteil: 'NICHT_PRUEFBAR', beleg: 'kein Zugriff' },
  ],
}
const AENDERUNG = { status: 'ok', laufId: 'l-bau', daten: { basis_ref: 'abc123', gekuerzt: false, dateien: [{ status: 'M', pfad: 'src/<a>.ts', plus: 3, minus: null }] } }
const PRUEFUNG_GRUEN = { status: 'ok', laufId: 'l-pruef', ergebnis: 'GRUEN', exitCode: 0 }

/** Abnahme-Projektion mit Vorgaben; einzelne Felder überschreibbar. @param felder - Überschreibungen @returns Projektion */
const abnahme = (felder = {}) => ({
  workflowStatus: 'ABGESCHLOSSEN',
  freigabeHalt: null,
  entscheidung: { status: 'nicht_vorhanden' },
  urteil: URTEIL,
  aenderungsuebersicht: AENDERUNG,
  pruefergebnis: PRUEFUNG_GRUEN,
  ...felder,
})

test('erlaubteAbnahmeAktionen: heutige Regel (ANGENOMMEN nur bei ABGESCHLOSSEN, die anderen auch bei KLAERUNG_ERFORDERLICH)', () => {
  assert.deepEqual(erlaubteAbnahmeAktionen('ABGESCHLOSSEN'), { ANGENOMMEN: true, ANPASSUNG_ANGEFORDERT: true, ABGELEHNT: true })
  assert.deepEqual(erlaubteAbnahmeAktionen('KLAERUNG_ERFORDERLICH'), { ANGENOMMEN: false, ANPASSUNG_ANGEFORDERT: true, ABGELEHNT: true })
  for (const status of ['OFFEN', 'LAEUFT', 'WARTET_FREIGABE', 'GESTOPPT']) assert.deepEqual(Object.values(erlaubteAbnahmeAktionen(status)), [false, false, false], status)
})

test('entscheidbar (F46 D2): Hauptspalte mit Kriterien, Kacheln, Selbst ausprobieren und Nachweisen; Spalte „Deine Entscheidung“', () => {
  const a = abnahme()
  assert.equal(abnahmeLage(a), 'entscheidbar')
  const { oben, unten, spalte } = renderAbnahme('w-1', a, { url: 'http://127.0.0.1:3000', erreichbar: true, grund: 'ok' })
  assert.equal(unten, '')
  assert.match(oben, /<h2 id="abnahme-kriterien-titel">Abnahmekriterien<\/h2><span class="subtle">1 erfüllt · 0 nicht erfüllt · 1 nicht prüfbar · Urteil des Reviews, du hast das letzte Wort<\/span>/)
  assert.match(oben, /<code class="ak-id">AK1<\/code>[\s\S]*Test &lt;grün&gt;[\s\S]*ak-urteil-ok[\s\S]*Erfüllt/)
  assert.match(oben, /<code class="ak-id">AK2<\/code>[\s\S]*ak-urteil-warten[\s\S]*Nicht prüfbar/)
  assert.match(oben, /<span class="eyebrow">Prüfung<\/span><strong class="entscheiden-wert entscheiden-wert-ok">GRÜN<\/strong>[\s\S]*Exit-Code 0/)
  assert.match(oben, /<span class="eyebrow">Review<\/span>[\s\S]*Bereit<\/span> <span class="subtle">Codex<\/span>[\s\S]*Abnehmen &lt;b&gt;bitte&lt;\/b&gt;/, 'empfehlung bleibt roh und escaped')
  assert.match(oben, /Weitere Claude-Prüfer <span class="kommt-badge">kommt<\/span>/, 'B2b-2b-2 (Advisor A4): qa urteilt jetzt, code-reviewer und design-guardian noch nicht')
  assert.match(oben, /1 Datei geändert[\s\S]*1 Befund des Reviews[\s\S]*Alle Nachweise/)
  assert.match(oben, /<a class="button" href="http:\/\/127\.0\.0\.1:3000" target="_blank" rel="noopener noreferrer">Produkt öffnen/)
  assert.match(oben, /Änderungen im Code-Reiter <span class="kommt-badge">kommt<\/span>/)
  assert.match(oben, /<h3>Befunde<\/h3>[\s\S]*Mittel<\/span> <code>src\/a\.ts:3<\/code>[\s\S]*Name &lt;unklar&gt;[\s\S]*Beleg: Zeile 3 &quot;x&quot;/)
  assert.match(oben, /<summary>Geänderte Dateien · 1 Datei<\/summary>[\s\S]*<code>src\/&lt;a&gt;\.ts<\/code>[\s\S]*\+3[\s\S]*—/)
  assert.match(oben, /<details class="abnahme-details"><summary>Prüfbericht &amp; Nachweise<\/summary>[\s\S]*GRÜN[\s\S]*Exit 0/)
  assert.doesNotMatch(oben, /wf-pruefung-wiederholen/, 'GRÜN bei ABGESCHLOSSEN: kein „Prüfung wiederholen“')
  assert.doesNotMatch(oben, /wf-abnahme-begruendung|wf-abnahme-aktion/, 'die Entscheidung steht in der Spalte')
  assert.match(spalte, /<h2 id="wf-abnahme-option-titel">Abnehmen\?<\/h2>/)
  assert.match(spalte, /<textarea id="wf-abnahme-begruendung"/)
  const optionen = [...spalte.matchAll(/value="(\w+)" data-bestaetigen="([^"]*)"( disabled)?/g)].map((m) => [m[1], m[2], m[3] === ' disabled'])
  assert.deepEqual(optionen, [
    ['ANGENOMMEN', 'Annehmen bestätigen', false],
    ['ANPASSUNG_ANGEFORDERT', 'Anpassung anfordern', false],
    ['ABGELEHNT', 'Ablehnen bestätigen', false],
  ])
  assert.match(spalte, /class="button primary entscheidung-absenden wf-abnahme-aktion" data-workflow-id="w-1" data-aktion=""[^>]*disabled>Option wählen</, 'Absenden gesperrt, bis Option und Begründung da sind')
  for (const html of [oben, spalte]) {
    assert.doesNotMatch(html, /Was sich verbessert hat|\[n\]|\[…\]|\{\{/, 'kein erfundener Text, keine Platzhalter der Vorlage')
  }
})

test('entscheidbar (F46 D2): nicht erfülltes AK in Zusammenfassung, Einleitung und „Selbst ausprobieren“; Vorschau-Zustände', () => {
  const urteil = { ...URTEIL, ak_urteile: [{ ak_id: 'AK1', urteil: 'ERFUELLT', beleg: 'ok' }, { ak_id: 'AK<2>', urteil: 'NICHT_ERFUELLT', beleg: 'fehlt' }] }
  const a = abnahme({ urteil })
  const { oben } = renderAbnahme('w-1', a, null)
  assert.match(oben, /1 erfüllt · 1 nicht erfüllt · Urteil/)
  assert.match(oben, /ak-urteil-fehler[\s\S]*Nicht erfüllt/)
  assert.match(oben, /was das Review als nicht erfüllt beurteilt hat: <code>AK&lt;2&gt;<\/code>\./)
  assert.match(oben, /Die Vorschau des Projekts wird geprüft…/)
  assert.equal(abnahmeEinleitung(a), 'Der Ablauf ist abgeschlossen. Das Review hat 1 von 2 Abnahmekriterien als erfüllt beurteilt. Prüf die übrigen selbst und entscheide.')
  assert.equal(abnahmeEinleitung(abnahme({ urteil: { status: 'noch_nicht_gelaufen' } })), 'Der Ablauf ist abgeschlossen. Prüf das Ergebnis und entscheide.')
  assert.match(renderAbnahme('w-1', a, { url: null, erreichbar: false, grund: 'x' }).oben, /keine Vorschau-URL/)
  assert.match(renderAbnahme('w-1', a, { url: 'http://127.0.0.1:4100', erreichbar: null, grund: 'Leitstand-Port' }).oben, /nicht zulässig: Leitstand-Port/)
  assert.doesNotMatch(renderAbnahme('w-1', a, { url: 'http://127.0.0.1:4100', erreichbar: null, grund: 'Leitstand-Port' }).oben, /Produkt öffnen<\/a>|href="http:\/\/127/)
  assert.match(renderAbnahme('w-1', a, { fehler: true }).oben, /nicht abrufbar/)
  assert.deepEqual(zaehleAkUrteile(urteil.ak_urteile), { gesamt: 2, erfuellt: 1, nichtErfuellt: 1, nichtPruefbar: 0, nichtErfuellteIds: ['AK<2>'] })
})

test('Klärung nach dem Bau (Prüfung ROT): kein „Passt das Ergebnis?“, sondern „Ergebnis ablehnen …“ mit Dateien und offenem Prüfbericht samt „Prüfung wiederholen“', () => {
  const a = abnahme({ workflowStatus: 'KLAERUNG_ERFORDERLICH', urteil: { status: 'noch_nicht_gelaufen' }, pruefergebnis: { status: 'ok', laufId: 'l-p', ergebnis: 'ROT', exitCode: 1 } })
  assert.equal(abnahmeLage(a), 'vorab')
  assert.equal(pruefungWiederholbar(a), true)
  const { oben, unten } = renderAbnahme('w-<1>', a)
  assert.equal(oben, '', 'kein Abschnitt über der Timeline')
  assert.match(unten, /<h3 id="abnahme-vorab-titel">Ergebnis ablehnen oder Anpassung wünschen<\/h3>/)
  assert.match(unten, /<summary>Geänderte Dateien · 1 Datei<\/summary>/)
  assert.match(unten, /<details class="abnahme-details" open><summary>Prüfbericht/)
  assert.match(unten, /ROT<\/span> \(Exit 1\)[\s\S]*<button type="button" class="button wf-pruefung-wiederholen" data-workflow-id="w-&lt;1&gt;">Prüfung wiederholen<\/button>/)
  assert.equal((unten.match(/wf-pruefung-wiederholen/g) ?? []).length, 1, '„Prüfung wiederholen“ genau einmal')
  assert.deepEqual([...unten.matchAll(/wf-abnahme-aktion" data-aktion="(\w+)"/g)].map((m) => m[1]), ['ANPASSUNG_ANGEFORDERT', 'ABGELEHNT'])
  assert.doesNotMatch(unten, /ANGENOMMEN|disabled|Passt das Ergebnis|Empfehlung des Code Reviewers|Vereinbart/)
})

test('nicht entscheidbar (vor dem Bau, Freigabe-Halt): nur eine Zeile, keine „noch nicht gelaufen“-Zeilen, kein Verweis auf „Bedienung“', () => {
  for (const a of [
    abnahme({ workflowStatus: 'OFFEN', urteil: { status: 'noch_nicht_gelaufen' }, aenderungsuebersicht: { status: 'noch_nicht_gelaufen' }, pruefergebnis: { status: 'noch_nicht_gelaufen' } }),
    abnahme({ workflowStatus: 'WARTET_FREIGABE', freigabeHalt: { schrittId: 's2', grund: null } }),
  ]) {
    assert.equal(abnahmeLage(a), 'offen')
    const { oben, unten } = renderAbnahme('w-1', a)
    assert.equal(oben, '')
    assert.match(unten, /Deine Abnahme folgt, wenn Umsetzung und Prüfung abgeschlossen sind\./)
    assert.doesNotMatch(unten, /noch nicht gelaufen|Bedienung|wf-abnahme-aktion|wf-abnahme-begruendung/)
  }
})

test('entschieden: kompakte Zeile mit Ergebnis, Begründung und Datum; F18 nur bei erzeuger kern', () => {
  const mensch = abnahme({ entscheidung: { status: 'ok', ergebnis: 'ANGENOMMEN', begruendung: 'Passt <so>', entschiedenAm: '2026-10-01T08:30:00.000Z', erzeuger: 'mensch', automatische_iteration: null } })
  assert.equal(abnahmeLage(mensch), 'entschieden')
  const { oben, unten } = renderAbnahme('w-1', mensch)
  assert.equal(oben, '')
  assert.match(unten, /Deine Abnahme: <span class="ablauf-status ok">Abgenommen<\/span> — „Passt &lt;so&gt;“ · /)
  assert.match(unten, /2026/)
  assert.doesNotMatch(unten, /Automatisch angelegt|wf-abnahme-aktion/)

  const kern = abnahme({ workflowStatus: 'WARTET_FREIGABE', freigabeHalt: { schrittId: 's2' }, entscheidung: { status: 'ok', ergebnis: 'ANPASSUNG_ANGEFORDERT', begruendung: 'auto', entschiedenAm: '2026-10-01T08:30:00.000Z', erzeuger: 'kern', automatische_iteration: 2 } })
  assert.equal(abnahmeLage(kern), 'entschieden', 'eine aktuelle Entscheidung hat Vorrang vor dem Freigabe-Halt')
  const kernHtml = renderAbnahme('w-1', kern).unten
  assert.match(kernHtml, /Anpassung gewünscht/)
  assert.match(kernHtml, /class="note amber abnahme-automatisch"><strong>Automatisch angelegt · Korrekturrunde 2 · Start erfordert deine Freigabe<\/strong>/)
})

test('veraltet: die frühere Entscheidung bleibt sichtbar (Audit-Spur), die Abnahme ist wieder offen', () => {
  const a = abnahme({ entscheidung: { status: 'veraltet', ergebnis: 'ABGELEHNT', begruendung: 'alt <x>', entschiedenAm: '2026-09-30T10:00:00.000Z', erzeuger: 'mensch' } })
  assert.equal(abnahmeLage(a), 'entscheidbar')
  const { oben } = renderAbnahme('w-1', a)
  assert.match(oben, /Frühere Entscheidung \(bezieht sich auf eine frühere Fassung\): Abgelehnt am [^—]+— „alt &lt;x&gt;“/)
  assert.match(renderAbnahme('w-1', a).spalte, /wf-abnahme-aktion/)
  const offen = renderAbnahme('w-1', { ...a, workflowStatus: 'WARTET_FREIGABE', freigabeHalt: { schrittId: 's2' } })
  assert.match(offen.unten, /Deine Abnahme folgt[\s\S]*Frühere Entscheidung/)
})

test('„Prüfung wiederholen“ auch außerhalb des Abschnitts, wenn die Regel greift (Regel unverändert)', () => {
  const a = abnahme({ workflowStatus: 'KLAERUNG_ERFORDERLICH', entscheidung: { status: 'ok', ergebnis: 'ABGELEHNT', begruendung: 'x', entschiedenAm: '2026-10-01T08:30:00.000Z' }, pruefergebnis: { status: 'ok', laufId: 'l', ergebnis: 'ZEITGRENZE', exitCode: null } })
  const { unten } = renderAbnahme('w-1', a)
  assert.match(unten, /ZEITGRENZE<\/span> \(Exit unbekannt\)[\s\S]*wf-pruefung-wiederholen/)
  assert.equal(pruefungWiederholbar({ ...a, workflowStatus: 'ABGESCHLOSSEN' }), false)
  assert.equal(pruefungWiederholbar({ ...a, pruefergebnis: PRUEFUNG_GRUEN }), false)
})

test('Auf einen Blick: Review-Urteil sobald vorhanden, „Deine Abnahme“ offen oder Ergebnis, Hinweis der Vorlage; ohne Daten nichts', () => {
  assert.equal(renderAbnahmeBlick(null), '')
  const offen = renderAbnahmeBlick(abnahme())
  assert.match(offen, /<dt>Review-Urteil<\/dt><dd><span class="ablauf-status ok">Bereit<\/span><\/dd>/)
  assert.match(offen, /<dt>Deine Abnahme<\/dt><dd>Noch offen<\/dd>/)
  assert.match(offen, /„Ausführung erfolgreich“ heißt nur, dass ein Arbeitsschritt beendet ist\. Deine Abnahme ist eine eigene Entscheidung\./)
  const ohneUrteil = renderAbnahmeBlick(abnahme({ urteil: { status: 'noch_nicht_gelaufen' } }))
  assert.doesNotMatch(ohneUrteil, /Review-Urteil/)
  const entschieden = renderAbnahmeBlick(abnahme({ urteil: { ...URTEIL, urteil: 'BLOCKIERT' }, entscheidung: { status: 'ok', ergebnis: 'ABGELEHNT' } }))
  assert.match(entschieden, /ablauf-status fehler">Blockiert/)
  assert.match(entschieden, /<dd>Abgelehnt<\/dd>/)
  // Unbekannter Urteilswert: roh und escaped.
  assert.match(renderAbnahmeBlick(abnahme({ urteil: { ...URTEIL, urteil: '<NEU>' } })), /neutral">&lt;NEU&gt;/)
})

test('nicht-ok-Texte von Urteil, Änderungsübersicht und Prüfergebnis: Inhalt wie bisher', () => {
  const a = abnahme({ workflowStatus: 'ABGESCHLOSSEN', urteil: { status: 'nicht_lesbar' }, aenderungsuebersicht: { status: 'nicht_vorhanden' }, pruefergebnis: { status: 'nicht_vorhanden' } })
  const { oben } = renderAbnahme('w-1', a)
  assert.match(oben, /Das Urteil konnte nicht aus dem Rohstrom des Review-Laufs gelesen werden\./)
  assert.match(oben, /<summary>Geänderte Dateien<\/summary><p class="subtle">Zu diesem Lauf liegt keine Änderungsübersicht vor/)
  assert.match(oben, /Zu diesem Lauf liegt kein Prüfergebnis vor \(die Startvorlage trägt keinen pruefbefehl\)\./)
})

// Entscheidung Challenger (F44 WS-4b): „Passt das Ergebnis?“ nur, wenn die Ausführung gelaufen ist.
test('vorab: Aktion erlaubt, Ausführung nicht gelaufen → kompakter Block unter der Timeline, nur erlaubte Knöpfe, keine Ergebnis-Abschnitte', () => {
  for (const status of ['noch_nicht_gelaufen', 'kein_ausfuehrungs_schritt']) {
    const a = abnahme({ workflowStatus: 'KLAERUNG_ERFORDERLICH', urteil: { status: 'noch_nicht_gelaufen' }, aenderungsuebersicht: { status }, pruefergebnis: { status } })
    assert.equal(abnahmeLage(a), 'vorab', status)
    const { oben, unten } = renderAbnahme('w-1', a)
    assert.equal(oben, '', 'kein Abschnitt „Passt das Ergebnis?“ über der Timeline')
    assert.match(unten, /<h3 id="abnahme-vorab-titel">Auftrag ablehnen oder Anpassung wünschen<\/h3>/)
    assert.match(unten, /<textarea id="wf-abnahme-begruendung"/)
    const knoepfe = [...unten.matchAll(/wf-abnahme-aktion" data-aktion="(\w+)"/g)].map((m) => m[1])
    assert.deepEqual(knoepfe, ['ANPASSUNG_ANGEFORDERT', 'ABGELEHNT'], 'nur die erlaubten Knöpfe, keiner disabled')
    assert.doesNotMatch(unten, /disabled|Passt das Ergebnis|Dein letztes Wort|Vereinbart|Befunde|Geänderte Dateien|Prüfbericht|Empfehlung des Code Reviewers/)
  }
})

// Entscheidung Challenger zur offenen Fachfrage (F44 WS-4b): „Passt das Ergebnis?“ nur bei ABGESCHLOSSEN.
test('Regel: ABGESCHLOSSEN ohne Entscheidung → „Passt das Ergebnis?“, auch ohne Änderungsübersicht', () => {
  for (const aenderungsuebersicht of [AENDERUNG, { status: 'nicht_vorhanden' }, { status: 'noch_nicht_gelaufen' }]) {
    const a = abnahme({ workflowStatus: 'ABGESCHLOSSEN', aenderungsuebersicht })
    assert.equal(abnahmeLage(a), 'entscheidbar', aenderungsuebersicht.status)
    const { oben, unten } = renderAbnahme('w-1', a)
    assert.match(oben, /Abnahmekriterien/)
    assert.equal(unten, '')
  }
  // Rotfall: dieselbe Lage ohne ABGESCHLOSSEN (KLAERUNG_ERFORDERLICH nach dem Bau) darf nicht entscheidbar sein.
  assert.equal(abnahmeLage(abnahme({ workflowStatus: 'KLAERUNG_ERFORDERLICH', aenderungsuebersicht: AENDERUNG })), 'vorab')
})

test('Regel: Sichtungs-Halt nach dem Bau (VERWEIGERT, Übersicht nicht_vorhanden) → „Ergebnis ablehnen …“ unter der Timeline, nicht „Passt das Ergebnis?“', () => {
  const sichtung = abnahme({ workflowStatus: 'KLAERUNG_ERFORDERLICH', urteil: { status: 'noch_nicht_gelaufen' }, aenderungsuebersicht: { status: 'nicht_vorhanden' }, pruefergebnis: { status: 'nicht_vorhanden' } })
  assert.equal(abnahmeLage(sichtung), 'vorab')
  const { oben, unten } = renderAbnahme('w-1', sichtung)
  assert.equal(oben, '')
  assert.match(unten, /Ergebnis ablehnen oder Anpassung wünschen/)
  assert.match(unten, /<summary>Geänderte Dateien<\/summary><p class="subtle">Zu diesem Lauf liegt keine Änderungsübersicht vor/)
  assert.doesNotMatch(unten, /Passt das Ergebnis|data-aktion="ANGENOMMEN"/)
  // Rotfall: vor dem Bau heißt der Block „Auftrag ablehnen …“ und zeigt keine Ergebnis-Abschnitte.
  const vorDemBau = renderAbnahme('w-1', { ...sichtung, aenderungsuebersicht: { status: 'noch_nicht_gelaufen' } }).unten
  assert.match(vorDemBau, /Auftrag ablehnen oder Anpassung wünschen/)
  assert.doesNotMatch(vorDemBau, /Ergebnis ablehnen|Geänderte Dateien|Prüfbericht/)
})

test('Regel: Klärung nach dem Bau (KLAERUNG_ERFORDERLICH, Prüfung GRÜN) → Block „Ergebnis ablehnen …“; ohne erlaubte Aktion die Zeile „folgt“', () => {
  const klaerung = abnahme({ workflowStatus: 'KLAERUNG_ERFORDERLICH' })
  assert.equal(abnahmeLage(klaerung), 'vorab')
  const { oben, unten } = renderAbnahme('w-1', klaerung)
  assert.equal(oben, '')
  assert.match(unten, /Ergebnis ablehnen oder Anpassung wünschen[\s\S]*<details class="abnahme-details"><summary>Prüfbericht/)
  assert.doesNotMatch(unten, /wf-pruefung-wiederholen/, 'GRÜN: kein „Prüfung wiederholen“')
  // Rotfall: ohne erlaubte Aktion (LAEUFT) bleibt es bei der Zeile „folgt“, kein Block.
  const offen = abnahme({ workflowStatus: 'LAEUFT', aenderungsuebersicht: { status: 'noch_nicht_gelaufen' } })
  assert.equal(abnahmeLage(offen), 'offen')
  assert.match(renderAbnahme('w-1', offen).unten, /Deine Abnahme folgt/)
  assert.doesNotMatch(renderAbnahme('w-1', offen).unten, /wf-abnahme-aktion/)
})

test('entscheidbar (F46 D2, Prüfpass): frühere Entscheidung oben, Empfehlung des Reviews im Volltext unter „Nachweise im Einzelnen“', () => {
  const lang = `Langer Text <b>roh</b> ${'x '.repeat(400)}Ende`
  const a = abnahme({ urteil: { ...URTEIL, empfehlung: lang }, entscheidung: { status: 'veraltet', ergebnis: 'ABGELEHNT', begruendung: 'alt', entschiedenAm: '2026-09-30T10:00:00.000Z', erzeuger: 'mensch' } })
  const { oben } = renderAbnahme('w-1', a)
  assert.ok(oben.indexOf('Frühere Entscheidung') < oben.indexOf('Abnahmekriterien'), 'die veraltete Entscheidung steht vor den Kriterien')
  assert.match(oben, /<h3>Empfehlung des Reviews<\/h3><p class="entscheiden-empfehlung-voll">Langer Text &lt;b&gt;roh&lt;\/b&gt;[^<]*Ende<\/p>/)
})

test('F45 B1b-2: Harness im Lauf in der Abnahme — lädt, Zählzeile mit Tabelle und Kurzliste, vor dem Bau nichts', () => {
  const laedt = renderAbnahme('wf-1', abnahme())
  assert.match(laedt.oben, /Harness im Lauf/)
  assert.match(laedt.oben, /Harness-Abgleich lädt/)
  const antwort = {
    status: 'ok',
    quelle: 'artefakt',
    daten: {
      zaehlung: { wirksam: 3, wirksam_ohne_beleg: 0, ersetzt_durch: 1, bewusst_nicht: 20, offen: 0 },
      bestanden: true,
      geaenderte_harness_dateien: [],
      eintraege: [{ art: 'command', name: 'lessons', quelle: '.claude/commands/lessons.md', detail: null, ereignis: null, matcher: null, status: 'bewusst_nicht', beleg: null, ersatz: null, begruendung: 'Teil 2 (F-933)', aufrufe: null, offen_grund: null, grund: null }],
      faehigkeiten: { lauf_id: 'l-bau', skills: [], subagenten: [{ name: 'Explore', anzahl: 2 }], mcp_server: [], hintergrund: 0 },
    },
  }
  const html = renderAbnahme('wf-1', abnahme(), null, antwort).oben
  assert.match(html, /Harness: 3 wirksam · 1 ersetzt · 20 bewusst nicht · 0 offen/)
  assert.match(html, /Beleg 12 erfüllt/)
  assert.match(html, /<code>Explore<\/code> ×2/)
  const entschieden = renderAbnahme('wf-1', abnahme({ entscheidung: { status: 'ok', ergebnis: 'ANGENOMMEN', begruendung: 'ok', entschiedenAm: '2026-10-11T08:00:00.000Z' } }), null, antwort)
  assert.match(entschieden.unten, /Harness: 3 wirksam/)
  const vorDemBau = renderAbnahme('wf-1', abnahme({ workflowStatus: 'KLAERUNG_ERFORDERLICH', aenderungsuebersicht: { status: 'noch_nicht_gelaufen' }, pruefergebnis: { status: 'noch_nicht_gelaufen' } }), null, antwort)
  assert.doesNotMatch(`${vorDemBau.oben}${vorDemBau.unten}`, /Harness im Lauf/)
})

// ─── F45 B2a-3a: Fehlerfälle und Vertrag des Reviews sichtbar (Codex-Review-Spec §9.8) ──────────

test('reviewHinweise: ok ohne Hinweise → leer; alte Projektion ohne neue Felder → leer', () => {
  assert.deepEqual(reviewHinweise(URTEIL), [])
  assert.deepEqual(reviewHinweise({ ...URTEIL, policy_version: 'review-policy-1', vertrag_verstoesse: [], vertrag_hinweise: [], kontext_luecken: [] }), [])
  assert.deepEqual(reviewHinweise(undefined), [])
})

test('reviewHinweise: Vertrag verletzt (Halt), unvollständig (Hinweis), Kontext unvollständig', () => {
  const h = reviewHinweise({ ...URTEIL, vertrag_verstoesse: ['Satz fehlt'], vertrag_hinweise: ["Befund 1: 'evidenz' fehlt"], kontext_luecken: ['DoD: 2 Punkte nur Platzhalter', 'ARCHITECTURE.md: fehlt'] })
  assert.deepEqual(
    h.map((e) => e.art),
    ['vertragVerletzt', 'empfehlung', 'vertragUnvollstaendig', 'kontextUnvollstaendig']
  )
  assert.ok(h[1].text.includes('Empfehlung des Reviewers: Abnehmen <b>bitte</b>'))
  assert.match(h[3].text, /DoD: 2 Punkte nur Platzhalter; ARCHITECTURE.md: fehlt/)
})

test('reviewHinweise: fehlgeschlagen und nicht gelaufen nennen den Grund (oder „kein Grund festgehalten“)', () => {
  const f = reviewHinweise({ status: 'fehlgeschlagen', laufId: 'l-r', schrittStatus: 'FEHLGESCHLAGEN', grund: "Schritt 's2' endete FEHLGESCHLAGEN (Lauf 'l-r')" })
  assert.equal(f[0].art, 'fehlgeschlagen')
  assert.match(f[0].text, /FEHLGESCHLAGEN.*Lauf 'l-r'/)
  assert.match(reviewHinweise({ status: 'fehlgeschlagen', laufId: 'l-r', schrittStatus: 'VERWEIGERT', grund: null })[0].text, /kein Grund festgehalten/)
  const n = reviewHinweise({ status: 'nicht_gelaufen_klaerung', schrittId: 's2', grund: 'Werkzeug nicht startbar' })
  assert.equal(n[0].art, 'nichtGelaufen')
  assert.match(n[0].text, /Werkzeug nicht startbar/)
})

test('Blick: nur die Zählzeile (rot bei Fehlschlag), keine zweite Liste (design-guardian 2)', () => {
  const html = renderAbnahmeBlick(abnahme({ workflowStatus: 'KLAERUNG_ERFORDERLICH', urteil: { status: 'fehlgeschlagen', laufId: 'l-r', schrittStatus: 'FEHLGESCHLAGEN', grund: 'Zeitgrenze <x>' } }))
  assert.match(html, /ablauf-status fehler" data-review-hinweise-anzahl="1">1 — Details beim Review/)
  assert.doesNotMatch(html, /abnahme-review-hinweise/)
  assert.doesNotMatch(html, /Zeitgrenze <x>/)
})

test('Blick: verletzter Vertrag → Urteil neutral statt grün, Zählzeile rot (design-guardian 1)', () => {
  const html = renderAbnahmeBlick(abnahme({ workflowStatus: 'KLAERUNG_ERFORDERLICH', urteil: { ...URTEIL, befunde: [], vertrag_verstoesse: ['Satz fehlt'] } }))
  assert.match(html, /ablauf-status neutral">Bereit/)
  assert.match(html, /data-review-hinweise-anzahl="2"/)
  const ohne = renderAbnahmeBlick(abnahme())
  assert.match(ohne, /ablauf-status ok">Bereit/)
  assert.doesNotMatch(ohne, /data-review-hinweise-anzahl/)
})

test('Vorab-Block: Servertext in lang="de", escaped; Status übersetzt; Satz zum nächsten Schritt bei roter Notiz', () => {
  const r = renderAbnahme('wf-1', abnahme({ workflowStatus: 'KLAERUNG_ERFORDERLICH', urteil: { status: 'fehlgeschlagen', laufId: 'l-r', schrittStatus: 'VERWEIGERT', grund: 'Grund <x>' } }))
  assert.ok(r.unten.includes('Review-Lauf (Verweigert): <span lang="de">Grund &lt;x&gt;</span>'))
  assert.match(r.unten, /Nächster Schritt: Den Review allein kannst du nicht wiederholen/)
  const amber = renderAbnahme('wf-1', abnahme({ urteil: { ...URTEIL, kontext_luecken: ['x'] } }))
  assert.doesNotMatch(amber.oben, /Nächster Schritt/)
  assert.doesNotMatch(r.unten, /wf-pruefer-wiederholen/, 'ohne reviewWiederholbar kein Knopf')
})

test('F45 B2b-1a: reviewWiederholbar zeigt „Review wiederholen“ mit eigenem Satz in der roten Notiz (Lage vorab), Knopf auf eigener Zeile', () => {
  const a = abnahme({ workflowStatus: 'KLAERUNG_ERFORDERLICH', reviewWiederholbar: true, urteil: { status: 'fehlgeschlagen', laufId: 'l-r', schrittStatus: 'FEHLGESCHLAGEN', grund: 'Werkzeugausfall' } })
  const r = renderAbnahme('wf-<1>', a)
  assert.match(r.unten, /<\/p><p><button type="button" class="button wf-pruefer-wiederholen" data-workflow-id="wf-&lt;1&gt;">Review wiederholen<\/button><\/p>/)
  assert.match(r.unten, /du kannst den Review allein wiederholen \(zählt nicht als automatische Korrekturrunde\)/)
  assert.doesNotMatch(r.unten, /Den Review allein kannst du nicht wiederholen/)
  assert.doesNotMatch(r.unten, /wf-pruefung-wiederholen/, 'nicht verwechselt mit „Prüfung wiederholen“ (F-656)')
})

test('reviewHinweise: nicht lesbar und Laufakte fehlt sind rot sichtbar (qa 3)', () => {
  for (const status of ['nicht_lesbar', 'laufakte_fehlt']) {
    const h = reviewHinweise({ status, laufId: 'l-r' })
    assert.equal(h[0].art, 'nichtLesbar')
    assert.equal(h[0].server, null)
  }
  const r = renderAbnahme('wf-1', abnahme({ workflowStatus: 'KLAERUNG_ERFORDERLICH', urteil: { status: 'nicht_lesbar', laufId: 'l-r' } }))
  assert.match(r.unten, /note red abnahme-review-hinweise/)
})

test('Lage vorab (KLAERUNG_ERFORDERLICH nach Regel 1k): Block zeigt „Review-Vertrag verletzt“', () => {
  const a = abnahme({ workflowStatus: 'KLAERUNG_ERFORDERLICH', urteil: { ...URTEIL, befunde: [], vertrag_verstoesse: ['Satz fehlt'], vertrag_hinweise: [], kontext_luecken: [] } })
  const r = renderAbnahme('wf-1', a)
  assert.equal(r.lage, 'vorab')
  assert.match(r.unten, /abnahme-review-hinweise/)
  assert.match(r.unten, /Satz fehlt/)
})

test('Lage entscheidbar: Review-Kachel zeigt Kontextlücken; Befund v2 zeigt id, Dimension, Evidenz, Korrekturrichtung, KRITISCH', () => {
  const befund = { id: 'B1', dimension: 'sicherheit', evidenz: 'likely', korrekturrichtung: 'Pfad <prüfen>', schwere: 'KRITISCH', fundstelle: 'a.ts:1', zusammenfassung: 'z', beleg: 'b' }
  const r = renderAbnahme('wf-1', abnahme({ urteil: { ...URTEIL, befunde: [befund], kontext_luecken: ['Checkliste des Code-Reviewers: fehlt'] } }))
  assert.equal(r.lage, 'entscheidbar')
  assert.match(r.oben, /Checkliste des Code-Reviewers: fehlt/)
  assert.match(r.oben, /ablauf-status fehler">Kritisch/)
  assert.match(r.oben, /B1/)
  assert.match(r.oben, /Sicherheit/)
  assert.match(r.oben, /wahrscheinlich/i)
  assert.match(r.oben, /Pfad &lt;prüfen&gt;/)
})

test('Befund v1 (ohne neue Felder) rendert unverändert ohne leere Zusatzzeilen', () => {
  const r = renderAbnahme('wf-1', abnahme())
  assert.doesNotMatch(r.oben, /abnahme-befund-v2/)
})

test('F45 B2a-3b: Review veraltet / Stand nicht bestimmbar — amber, in Review-Kachel und Zählzeile; ohne Grund oder false still', () => {
  const stand = { commit: 'a'.repeat(40), inhalt: 'b'.repeat(64) }
  const veraltet = reviewHinweise({ ...URTEIL, geprueft_stand: stand, aktueller_stand: { ...stand, inhalt: 'c'.repeat(64) }, veraltet: true, stand_grund: null })
  assert.deepEqual(
    veraltet.map((h) => h.art),
    ['reviewVeraltet']
  )
  assert.match(veraltet[0].text, /Review veraltet — der Arbeitsordner hat sich seit dem Review geändert/)
  const unbestimmt = reviewHinweise({ ...URTEIL, geprueft_stand: stand, aktueller_stand: null, veraltet: null, stand_grund: 'kein Commit <HEAD>' })
  assert.equal(unbestimmt[0].art, 'standUnbestimmt')
  assert.match(unbestimmt[0].text, /Stand des Reviews nicht bestimmbar: kein Commit <HEAD>/)
  assert.deepEqual(reviewHinweise({ ...URTEIL, geprueft_stand: stand, aktueller_stand: stand, veraltet: false, stand_grund: null }), [])
  assert.deepEqual(reviewHinweise({ ...URTEIL, geprueft_stand: null, aktueller_stand: null, veraltet: null, stand_grund: null }), [], 'Abnahme nicht offen: still')
  const seite = renderAbnahme('wf-1', abnahme({ urteil: { ...URTEIL, veraltet: null, stand_grund: 'kein Commit <HEAD>' } }))
  assert.equal(seite.lage, 'entscheidbar')
  assert.match(seite.oben, /note amber abnahme-review-hinweise/)
  assert.ok(seite.oben.includes('<span lang="de">kein Commit &lt;HEAD&gt;</span>'))
  const kachel = renderAbnahme('wf-1', abnahme({ urteil: { ...URTEIL, veraltet: true } }))
  assert.match(kachel.oben, /data-review-hinweis="reviewVeraltet"/)
  const blick = renderAbnahmeBlick(abnahme({ urteil: { ...URTEIL, veraltet: true } }))
  assert.match(blick, /ablauf-status warten" data-review-hinweise-anzahl="1"/)
  assert.match(blick, /ablauf-status ok">Bereit/)
})

test('F45 B2a-3b (qa 1): reviewHinweisKennung ändert sich mit „veraltet“ und dem Grund — die offene Abnahme wird neu gezeichnet', () => {
  const frisch = reviewHinweisKennung({ ...URTEIL, veraltet: false, stand_grund: null })
  const veraltet = reviewHinweisKennung({ ...URTEIL, veraltet: true, stand_grund: null })
  const unbestimmtA = reviewHinweisKennung({ ...URTEIL, veraltet: null, stand_grund: 'Grund A' })
  const unbestimmtB = reviewHinweisKennung({ ...URTEIL, veraltet: null, stand_grund: 'Grund B' })
  assert.equal(frisch, '')
  assert.equal(new Set([frisch, veraltet, unbestimmtA, unbestimmtB]).size, 4)
  assert.equal(reviewHinweisKennung(undefined), '')
})

test('F45 B2b-1a (Prüfpass): reviewWiederholbar ohne roten Hinweis (unbekanntes Urteil) zeigt trotzdem rote Notiz mit Knopf', () => {
  const a = abnahme({ workflowStatus: 'KLAERUNG_ERFORDERLICH', reviewWiederholbar: true, urteil: { status: 'ok', urteil: 'GO', befunde: [], laufId: 'l-r' } })
  const r = renderAbnahme('wf-1', a)
  assert.match(r.unten, /class="note red abnahme-review-hinweise"/)
  assert.match(r.unten, /wf-pruefer-wiederholen/)
  assert.doesNotMatch(r.unten, /<ul><\/ul>/, 'keine leere Liste')
})

// ─── F45 B2b-2a: BEREIT mit schweren Befunden (F-1085 (4), Spec §8) und Claude-Reviewer (F-1085 (2)) ─────────

test('F45 B2b-2a: BEREIT mit schweren Befunden ⇒ amber Hinweis mit Anzahl, ohne Feldnamen und Kennungen; überall, wo die Review-Hinweise stehen', () => {
  const urteil = { ...URTEIL, befunde: [{ id: 'B1', schwere: 'HOCH', fundstelle: 'src/a.ts:3', zusammenfassung: 'x', beleg: 'y' }], schwere_bei_bereit: 1 }
  const h = reviewHinweise(urteil)
  assert.deepEqual(
    h.map((e) => e.art),
    ['schwereBeiBereit']
  )
  assert.equal(h[0].server, null)
  assert.match(h[0].text, /bereit/i)
  assert.match(h[0].text, /einen schweren Befund/, 'Singular ohne Ziffer (design-guardian 3: „: 1.“ las sich als Aufzählung)')
  assert.match(reviewHinweise({ ...urteil, schwere_bei_bereit: 2 })[0].text, /2 schwere Befunde/)
  assert.doesNotMatch(h[0].text, /schwere_bei_bereit|\bbefunde\b|B1|HOCH|KRITISCH|BEREIT/, 'kein Feldname, keine Kennung, kein Enum-Wert')
  const { oben } = renderAbnahme('w-1', abnahme({ urteil }), null)
  assert.match(oben, /note amber abnahme-review-hinweise[\s\S]*data-review-hinweis="schwereBeiBereit"/)
  assert.doesNotMatch(oben, /note red abnahme-review-hinweise/, 'kein Halt: amber, nicht rot')
  assert.match(renderAbnahmeBlick(abnahme({ urteil })), /data-review-hinweise-anzahl="1"/)
  // design-guardian 1: Badge „Bereit“ amber (warten) statt grün, in Kachel und Blick.
  assert.match(oben, /ablauf-status warten">Bereit<\/span> <span class="subtle">Codex/)
  assert.match(renderAbnahmeBlick(abnahme({ urteil })), /ablauf-status warten">Bereit/)
  assert.match(renderAbnahme('w-1', abnahme(), null).oben, /ablauf-status ok">Bereit/, 'ohne schwere Befunde bleibt es grün')
})

test('F45 B2b-2a: ohne schwere Befunde, bei 0 oder alter Projektion (ohne Feld) kein Hinweis', () => {
  assert.deepEqual(reviewHinweise({ ...URTEIL, schwere_bei_bereit: 0 }), [])
  assert.deepEqual(reviewHinweise(URTEIL), [])
  assert.deepEqual(reviewHinweise({ ...URTEIL, schwere_bei_bereit: 'zwei' }), [])
})

test('F45 B2b-2a (Advisor A7): reviewHinweisKennung ändert sich mit der Anzahl schwerer Befunde', () => {
  assert.notEqual(reviewHinweisKennung({ ...URTEIL, schwere_bei_bereit: 1 }), reviewHinweisKennung({ ...URTEIL, schwere_bei_bereit: 2 }))
})

test('F45 B2b-2a: Kachel „Review“ nennt den Worker aus der Projektion — Claude bei claude-code, sonst (auch ohne Feld) Codex', () => {
  assert.match(renderAbnahme('w-1', abnahme({ urteil: { ...URTEIL, worker: 'claude-code' } }), null).oben, /Bereit<\/span> <span class="subtle">Claude<\/span>/)
  assert.match(renderAbnahme('w-1', abnahme({ urteil: { ...URTEIL, worker: 'codex' } }), null).oben, /Bereit<\/span> <span class="subtle">Codex<\/span>/)
  assert.match(renderAbnahme('w-1', abnahme({ urteil: URTEIL }), null).oben, /Bereit<\/span> <span class="subtle">Codex<\/span>/, 'ohne Feld (alte Projektion)')
})

// ─── F45 B2b-2b-2: Prüfung aus Nutzersicht (qa) live (F-1117 (7), Plan B2b-2b-2 v1.1) ─────────

const QA = {
  status: 'ok',
  halt: false,
  laufId: 'l-qa',
  urteil: 'BEREIT',
  worker: 'claude-code',
  empfehlung: 'Abnehmen <ok>',
  befunde: [{ id: 'Q1', schwere: 'HOCH', evidenz: 'confirmed', fundstelle: 'src/liste.ts:8', zusammenfassung: 'Leere Liste <stürzt>', korrekturrichtung: 'Leerfall abfangen.', beleg: 'Durchgespielt.' }],
  testfaelle: [
    { name: 'AK1 Grundfall', schritte: ['Liste öffnen', 'Eintrag <neu>'], erwartet: 'Eintrag sichtbar', ergebnis: 'bestanden' },
    { name: 'Leere Liste', schritte: ['Liste leeren'], erwartet: 'Leerzustand', ergebnis: 'durchgefallen' },
    { name: 'Offline', schritte: ['Netz trennen'], erwartet: 'Hinweis', ergebnis: 'nicht_pruefbar' },
  ],
  schwere_bei_bereit: 1,
}
/** Kennungen und Feldnamen, die im sichtbaren Text nicht stehen dürfen (Auftrag: keine Feldnamen oder Kennungen). */
const KENNUNGEN = /schritt-3-qa|ergebnis-qa|qaErgebnis|schwere_bei_bereit|nicht_pruefbar|\bqa\b|BEREIT|BLOCKIERT|FEHLGESCHLAGEN/

test('F45 B2b-2b-2: entscheidbar — Karte „Prüfung aus Nutzersicht“ unter den Kacheln mit Urteil, Claude, Empfehlung, Hinweis, Befunden und Testfällen', () => {
  const { oben } = renderAbnahme('w-1', abnahme({ qaErgebnis: QA }), null)
  const karte = oben.slice(oben.lastIndexOf('<section', oben.indexOf('abnahme-qa-karte')), oben.indexOf('abnahme-selbst-titel'))
  assert.ok(oben.indexOf('entscheiden-kacheln') < oben.indexOf('abnahme-qa-karte') && oben.indexOf('abnahme-qa-karte') < oben.indexOf('abnahme-selbst-titel'), 'zwischen Kachelreihe und „Selbst ausprobieren“')
  assert.match(karte, /<h2 id="abnahme-qa-titel">Prüfung aus Nutzersicht<\/h2>/)
  assert.match(karte, /ablauf-status warten">Bereit<\/span> <span class="subtle">Claude<\/span>/, 'amber bei schwerem Befund trotz BEREIT')
  assert.match(karte, /Abnehmen &lt;ok&gt;/)
  assert.match(karte, /note amber abnahme-qa-hinweise[\s\S]*data-qa-hinweis="schwereBeiBereit"[\s\S]*Die Prüfung aus Nutzersicht sagt „bereit“, meldet aber einen schweren Befund/)
  assert.match(karte, /<code>src\/liste.ts:8<\/code>[\s\S]*Leere Liste &lt;stürzt&gt;[\s\S]*<code>Q1<\/code>[\s\S]*Korrekturrichtung: Leerfall abfangen\./)
  // design-guardian 1: Testfälle aufklappbar, die Zahlen je Ergebnis stehen zugeklappt in der Zusammenfassung.
  assert.match(karte, /<details class="abnahme-details abnahme-testfaelle-details"><summary>Testfälle · 1 bestanden · 1 durchgefallen · 1 nicht prüfbar<\/summary>/)
  assert.match(karte, /AK1 Grundfall<\/strong> <span class="ak-urteil abnahme-testfall-ok[^"]*"><span aria-hidden="true">✓ <\/span>Bestanden[\s\S]*<li>Liste öffnen<\/li><li>Eintrag &lt;neu&gt;<\/li>[\s\S]*Erwartet: Eintrag sichtbar/)
  assert.match(karte, /abnahme-qa-hinweise" role="note"><p><strong>Hinweise zur Prüfung aus Nutzersicht<\/strong>/, 'in der Karte wiederholt die Notiz den Kartentitel nicht')
  assert.match(karte, /abnahme-testfall-fehler[\s\S]*✗[\s\S]*Durchgefallen/)
  assert.match(karte, /abnahme-testfall-warten[\s\S]*\?[\s\S]*Nicht prüfbar/)
  assert.doesNotMatch(karte.replace(/<[^>]+>/g, ' '), KENNUNGEN, 'sichtbarer Text ohne Feldnamen und Kennungen')
  assert.match(renderAbnahme('w-1', abnahme({ qaErgebnis: { ...QA, schwere_bei_bereit: 0 } }), null).oben, /abnahme-qa-karte[\s\S]*ablauf-status ok">Bereit/, 'ohne schweren Befund grün')
})

test('F45 B2b-2b-2: Leerzustände — kein qa-Schritt ⇒ keine Karte; keine Befunde/Testfälle ⇒ Satz; nicht gelaufen ⇒ Satz', () => {
  assert.doesNotMatch(renderAbnahme('w-1', abnahme({ qaErgebnis: { status: 'kein_qa_schritt', halt: false } }), null).oben, /abnahme-qa-karte/)
  assert.doesNotMatch(renderAbnahme('w-1', abnahme(), null).oben, /abnahme-qa-karte/, 'alte Projektion ohne Feld')
  const leer = renderAbnahme('w-1', abnahme({ qaErgebnis: { ...QA, befunde: [], testfaelle: [], schwere_bei_bereit: 0 } }), null).oben
  assert.match(leer, /abnahme-qa-karte[\s\S]*Keine Befunde\.[\s\S]*Keine Testfälle\./)
  assert.match(renderAbnahme('w-1', abnahme({ qaErgebnis: { status: 'noch_nicht_gelaufen', halt: false } }), null).oben, /abnahme-qa-karte[\s\S]*Die Prüfung aus Nutzersicht ist noch nicht gelaufen\./)
})

test('F45 B2b-2b-2: qaHinweise — Ursache je Status ohne Kennungen (Advisor A2), neutraler Halt bei gültigem Ergebnis (A1), schwere Befunde', () => {
  const art = (qa) => qaHinweise(qa).map((h) => h.art)
  assert.deepEqual(art({ status: 'fehlgeschlagen', halt: true, schrittStatus: 'FEHLGESCHLAGEN', grund: "Schritt 'schritt-3-qa' (ergebnis-qa) …" }), ['ausgefallen'])
  assert.deepEqual(art({ status: 'fehlgeschlagen', halt: true, schrittStatus: 'VERWEIGERT' }), ['verweigert'])
  assert.deepEqual(art({ status: 'nicht_gelaufen_klaerung', halt: true }), ['nichtGestartet'])
  assert.deepEqual(art({ status: 'nicht_lesbar', halt: true, verstoesse: ['testfaelle fehlt'] }), ['nichtLesbar'])
  assert.deepEqual(art({ status: 'laufakte_fehlt', halt: true }), ['nichtLesbar'])
  assert.deepEqual(art({ ...QA, urteil: 'BLOCKIERT', halt: true, schwere_bei_bereit: 0 }), ['haltNachQa'])
  assert.deepEqual(art(QA), ['schwereBeiBereit'])
  assert.deepEqual(art({ ...QA, schwere_bei_bereit: 0 }), [])
  for (const leer of [null, undefined, { status: 'kein_qa_schritt' }, { status: 'noch_nicht_gelaufen', halt: false }]) assert.deepEqual(qaHinweise(leer), [])
  for (const h of [...qaHinweise({ status: 'fehlgeschlagen', halt: true, schrittStatus: 'FEHLGESCHLAGEN', grund: "Schritt 'schritt-3-qa'" }), ...qaHinweise({ ...QA, halt: true })]) assert.doesNotMatch(h.text, KENNUNGEN, h.art)
  assert.notEqual(qaHinweisKennung(QA), qaHinweisKennung({ ...QA, schwere_bei_bereit: 2 }))
  assert.equal(qaHinweisKennung(undefined), '')
})

test('F45 B2b-2b-2: vorab — Halt am qa ⇒ rote Notiz mit Ursache, Ausweg in einem Satz und Knopf (nur bei qaWiederholbar), kein Server-Grund', () => {
  const ausfall = { status: 'fehlgeschlagen', halt: true, laufId: 'l-qa', schrittStatus: 'FEHLGESCHLAGEN', grund: "Schritt 'schritt-3-qa' (ergebnis-qa) — Werkzeugausfall" }
  const r = renderAbnahme('wf-1', abnahme({ workflowStatus: 'KLAERUNG_ERFORDERLICH', qaErgebnis: ausfall, qaWiederholbar: true }))
  assert.equal(r.lage, 'vorab')
  assert.match(r.unten, /class="note red abnahme-qa-hinweise"[\s\S]*Prüfung aus Nutzersicht[\s\S]*Das Werkzeug der Prüfung aus Nutzersicht ist ausgefallen\./)
  assert.match(r.unten, /Ohne Prüfung aus Nutzersicht ist keine Abnahme möglich — wiederhole sie/)
  assert.match(r.unten, /<p><button type="button" class="button wf-pruefer-wiederholen" data-pruefer="qa" data-workflow-id="wf-1">Prüfung aus Nutzersicht wiederholen<\/button><\/p>/)
  assert.doesNotMatch(r.unten, /schritt-3-qa|ergebnis-qa|Werkzeugausfall/, 'der Server-Grund steht nicht in der Abnahme (F-1116 (5), A11)')
  const ohne = renderAbnahme('wf-1', abnahme({ workflowStatus: 'KLAERUNG_ERFORDERLICH', qaErgebnis: { status: 'nicht_gelaufen_klaerung', halt: true, grund: 'x' }, qaWiederholbar: false })).unten
  assert.match(ohne, /Die Prüfung aus Nutzersicht ist nicht gestartet\.[\s\S]*Ohne Prüfung aus Nutzersicht ist keine Abnahme möglich — repariere oder starte den Ablauf/)
  assert.doesNotMatch(ohne, /data-pruefer="qa"/, 'ohne qaWiederholbar kein Knopf')
})

test('F45 B2b-2b-2 (Advisor A1, A8 aus 2b-1): Halt am qa mit gültigem Ergebnis ⇒ Urteil, qa-Befunde und neutraler Satz, kein Knopf', () => {
  const blockiert = { ...QA, urteil: 'BLOCKIERT', halt: true, schwere_bei_bereit: 0, grund: 'Grenze …' }
  const r = renderAbnahme('wf-1', abnahme({ workflowStatus: 'KLAERUNG_ERFORDERLICH', qaErgebnis: blockiert, qaWiederholbar: false }))
  assert.match(r.unten, /class="note red abnahme-qa-hinweise"[\s\S]*ablauf-status fehler">Blockiert[\s\S]*Der Ablauf hält nach der Prüfung aus Nutzersicht — eine automatische Korrekturrunde startet nicht[\s\S]*<h4>Befunde<\/h4>[\s\S]*<code>src\/liste.ts:8<\/code>/)
  assert.doesNotMatch(r.unten, /<h3>Befunde<\/h3>/, 'design-guardian 2: unter dem h3 des Vorab-Blocks eine Ebene tiefer')
  // qa-Prüfpass 2: BEREIT mit HOCH bei einem Halt (Review beanstandet) — kein „bevor du abnimmst“, Abnehmen ist gesperrt.
  assert.deepEqual(
    qaHinweise({ ...QA, halt: true }).map((h) => h.art),
    ['haltNachQa']
  )
  assert.doesNotMatch(r.unten, /wf-pruefer-wiederholen/)
  assert.doesNotMatch(r.unten, /Ohne Prüfung aus Nutzersicht ist keine Abnahme möglich/, 'der A1-Satz trägt den Ausweg selbst')
})

test('F45 B2b-2b-2: Auf einen Blick — Zeile „Prüfung aus Nutzersicht“ mit Urteil und Befundzahl, Hinweiszahl bei Halt oder schweren Befunden', () => {
  const blick = renderAbnahmeBlick(abnahme({ qaErgebnis: QA }))
  assert.match(blick, /<dt>Prüfung aus Nutzersicht<\/dt><dd><span class="ablauf-status warten">Bereit<\/span> · 1 Befund<\/dd>/)
  // F-1118 (2): ohne Richtungswort — der Blick steht je Lage und Breite über oder unter den Details.
  assert.match(blick, /data-qa-hinweise-anzahl="1">1 — Details bei der Prüfung<\/span>/)
  assert.doesNotMatch(blick, /Details (unten|oben)/)
  const halt = renderAbnahmeBlick(abnahme({ workflowStatus: 'KLAERUNG_ERFORDERLICH', qaErgebnis: { status: 'fehlgeschlagen', halt: true, schrittStatus: 'FEHLGESCHLAGEN' } }))
  assert.match(halt, /ablauf-status fehler" data-qa-hinweise-anzahl="1"/)
  assert.doesNotMatch(renderAbnahmeBlick(abnahme()), /Prüfung aus Nutzersicht/, 'ohne qa keine Zeile')
})

test('F45 B2b-2b-2 (Prüfpass code-reviewer 1, qa 1): ein laufender qa ist kein Hinweis — Karte mit „läuft gerade“, keine Zeile im Blick', () => {
  const laeuft = { status: 'laeuft', halt: false, laufId: 'l-qa' }
  assert.deepEqual(qaHinweise(laeuft), [])
  assert.equal(qaHinweisKennung(laeuft), '')
  assert.match(renderAbnahme('w-1', abnahme({ qaErgebnis: laeuft }), null).oben, /abnahme-qa-karte[\s\S]*Die Prüfung aus Nutzersicht läuft gerade\./)
  assert.doesNotMatch(renderAbnahmeBlick(abnahme({ workflowStatus: 'LAEUFT', qaErgebnis: laeuft })), /data-qa-hinweise-anzahl/)
})

// ─── F45 B2b-2b-2, zweite Runde (Entscheidung Challenger): F-1118 (1), F-1119 (1) ─────────

test('F-1118 (1): ein hängender qa-Lauf nach einem Neustart (Halt, Schritt läuft noch) ⇒ rote Notiz mit Ursache und Ausweg', () => {
  const haengt = { status: 'abgebrochen', halt: true, laufId: 'l-qa', grund: "Schritt 'schritt-3-qa' …" }
  assert.deepEqual(
    qaHinweise(haengt).map((h) => h.art),
    ['abgebrochen']
  )
  const r = renderAbnahme('wf-1', abnahme({ workflowStatus: 'KLAERUNG_ERFORDERLICH', qaErgebnis: haengt, qaWiederholbar: false }))
  assert.match(r.unten, /class="note red abnahme-qa-hinweise"[\s\S]*Der Lauf der Prüfung aus Nutzersicht wurde unterbrochen[\s\S]*Ohne Prüfung aus Nutzersicht ist keine Abnahme möglich — repariere oder starte den Ablauf/)
  assert.doesNotMatch(r.unten, /schritt-3-qa/)
})

test('F-1119 (1): Halt am qa nach einer Beanstandung des Reviews ⇒ der Vorab-Block zeigt zusätzlich die Review-Befunde', () => {
  const qa = { ...QA, halt: true, schwere_bei_bereit: 0, reviewBeanstandet: true }
  const urteil = { ...URTEIL, urteil: 'BLOCKIERT', befunde: [{ id: 'B1', schwere: 'HOCH', fundstelle: 'src/review.ts:4', zusammenfassung: 'Review-Befund <x>', beleg: 'y' }] }
  const mit = renderAbnahme('wf-1', abnahme({ workflowStatus: 'KLAERUNG_ERFORDERLICH', urteil, qaErgebnis: qa })).unten
  assert.match(mit, /abnahme-qa-hinweise[\s\S]*<h4>Befunde des Reviews<\/h4>[\s\S]*<code>src\/review.ts:4<\/code>[\s\S]*Review-Befund &lt;x&gt;/)
  const ohne = renderAbnahme('wf-1', abnahme({ workflowStatus: 'KLAERUNG_ERFORDERLICH', urteil, qaErgebnis: { ...qa, reviewBeanstandet: false } })).unten
  assert.doesNotMatch(ohne, /Befunde des Reviews/, 'nur, wenn der Server die Beanstandung meldet (keine zweite Regel in der Oberfläche)')
})


// ─── F45 B2b-3c (F-981): Verbrauch gegen Budget in Blick und Kachel; die Halt-Notiz steht bei den Eingriffen ──────────────

const BUDGET_HALT = { status: 'ok', summe: 15234567, tokens: 14700000, quelle: 'default', gemessen: 3, ohneMessung: 0, ueberschritten: true, halt: true, erhoehbar: true, neu: 29934567, grundVeraltet: false }

test('F45 B2b-3c: Blick zeigt „Verbrauch“ — amber nur bei Überschreitung; Läufe ohne Messung nur, wenn es welche gibt (ru-Plural)', () => {
  const unter = renderAbnahmeBlick(abnahme({ budget: { ...BUDGET_HALT, summe: 1200, ueberschritten: false, halt: false, erhoehbar: false } }))
  assert.match(unter, /<dt>Verbrauch<\/dt><dd>1\.200 von 14\.700\.000 Tokens<\/dd>/)
  assert.doesNotMatch(unter, /ohne Messung/)
  const ueber = renderAbnahmeBlick(abnahme({ budget: { ...BUDGET_HALT, ohneMessung: 2 } }))
  assert.match(ueber, /ablauf-status warten" data-budget-ueberschritten="true">15\.234\.567 von 14\.700\.000 Tokens/)
  assert.match(ueber, /2 Läufe ohne Messung/)
  assert.match(renderAbnahmeBlick(abnahme({ budget: { ...BUDGET_HALT, ohneMessung: 1 } })), /1 Lauf ohne Messung/)
  assert.doesNotMatch(renderAbnahmeBlick(abnahme()), /Verbrauch/, 'ohne Projektion (alter Server) keine Zeile')
  assert.doesNotMatch(renderAbnahmeBlick(abnahme({ budget: { status: 'nicht_bestimmbar' } })), /Verbrauch/)
})

test('F45 B2b-3c: die Abnahme trägt keine zweite Budget-Notiz; die Seite „entscheidbar“ nennt den Verbrauch in der Kachel Nachweise', () => {
  const vorab = renderAbnahme('wf-1', abnahme({ workflowStatus: 'KLAERUNG_ERFORDERLICH', budget: BUDGET_HALT }))
  assert.equal(vorab.lage, 'vorab')
  assert.doesNotMatch(vorab.unten, /wf-budget-erhoehen|Budget erreicht/)
  const seite = renderAbnahme('wf-1', abnahme({ budget: { ...BUDGET_HALT, halt: false, erhoehbar: false } }))
  assert.match(seite.oben, /Verbrauch: <span class="ablauf-status warten">15\.234\.567 von 14\.700\.000 Tokens/)
  assert.doesNotMatch(seite.oben, /wf-budget-erhoehen/)
})

test('F45 B2b-3c: budgetKennung ändert sich mit Summe, Budget, Halt, Erhöhbarkeit und veraltetem Grund (Neuzeichnen beim Poll)', () => {
  assert.notEqual(budgetKennung(BUDGET_HALT), budgetKennung({ ...BUDGET_HALT, erhoehbar: false }))
  assert.notEqual(budgetKennung(BUDGET_HALT), budgetKennung({ ...BUDGET_HALT, tokens: 1 }))
  assert.notEqual(budgetKennung(BUDGET_HALT), budgetKennung({ ...BUDGET_HALT, halt: false }))
  assert.notEqual(budgetKennung(BUDGET_HALT), budgetKennung({ ...BUDGET_HALT, grundVeraltet: true }))
  assert.equal(budgetKennung(undefined), '-')
})

test('F45 B2b-3d: Umfangs-Hinweis — Dateien außerhalb als Liste ohne Kennungen; ohne Treffer, ohne Abgleich oder alter Server nichts', () => {
  const html = renderUmfangHinweis({ status: 'ok', ausserhalb: ['docs/<x>.md', 'lib/y.ts'] })
  assert.match(html, /Außerhalb der vereinbarten Bereiche geändert/)
  assert.match(html, /Nur ein Hinweis — der Ablauf wurde nicht angehalten/)
  assert.match(html, /<li><code>docs\/&lt;x&gt;\.md<\/code><\/li><li><code>lib\/y\.ts<\/code><\/li>/)
  assert.doesNotMatch(html.replace(/<[^>]*>/g, ''), /umfang|ausserhalb|bereiche/, 'keine Feldnamen im sichtbaren Text')
  assert.equal(renderUmfangHinweis({ status: 'ok', ausserhalb: [] }), '')
  // Korrekturrunde (qa 1): die vereinbarten Bereiche stehen darunter, escaped.
  assert.match(renderUmfangHinweis({ status: 'ok', ausserhalb: ['docs/x.md'], bereiche: ['scr/', 'a<b'] }), /Vereinbart: <code>scr\/<\/code>, <code>a&lt;b<\/code>/)
  assert.doesNotMatch(html, /Vereinbart/, 'ohne Bereiche in der Projektion (alter Server) keine Zeile')
  assert.equal(renderUmfangHinweis({ status: 'kein_abgleich', ausserhalb: [] }), '')
  assert.equal(renderUmfangHinweis({ status: 'noch_nicht_gelaufen', ausserhalb: [] }), '')
  assert.equal(renderUmfangHinweis(undefined), '')
  assert.match(renderUmfangHinweis({ status: 'nicht_bestimmbar', ausserhalb: [] }), /class="subtle[^"]*">Ob Dateien außerhalb der vereinbarten Bereiche liegen, ist nicht bestimmbar\./)
})

test('F45 B2b-3d: Umfangs-Hinweis kappt bei 50 Dateien mit „… und n weitere Dateien“', () => {
  const viele = Array.from({ length: 53 }, (_, i) => `d/${i}.md`)
  const html = renderUmfangHinweis({ status: 'ok', ausserhalb: viele })
  assert.equal((html.match(/<li>/g) ?? []).length, 50)
  assert.match(html, /… und 3 weitere Dateien/)
  assert.match(renderUmfangHinweis({ status: 'ok', ausserhalb: viele.slice(0, 51) }), /… und 1 weitere Datei</)
})

test('F45 B2b-3e-2 (F-1123 (14)): „Vereinbart: …“ zeigt höchstens 10 Bereiche, dann „… und n weitere“', () => {
  const bereiche = Array.from({ length: 12 }, (_, i) => `b${i}/`)
  const html = renderUmfangHinweis({ status: 'ok', ausserhalb: ['x.md'], bereiche })
  assert.equal((html.match(/<code>b\d+\/<\/code>/g) ?? []).length, 10)
  assert.match(html, /<code>b9\/<\/code> … und 2 weitere Bereiche</)
  assert.match(renderUmfangHinweis({ status: 'ok', ausserhalb: ['x.md'], bereiche: bereiche.slice(0, 11) }), /… und 1 weiterer Bereich</)
  assert.doesNotMatch(renderUmfangHinweis({ status: 'ok', ausserhalb: ['x.md'], bereiche: bereiche.slice(0, 10) }), /weitere/)
})

test('F45 B2b-3e-2 (F-1123 (12)): umfangKennung ändert sich mit den Bereichen', () => {
  const basis = { status: 'ok', ausserhalb: ['x.md'], bereiche: ['src/'] }
  assert.notEqual(umfangKennung(basis), umfangKennung({ ...basis, bereiche: ['scr/'] }))
  assert.notEqual(umfangKennung(basis), umfangKennung({ ...basis, bereiche: undefined }))
})

test('F45 B2b-3d: Umfangs-Hinweis auf der Seite „entscheidbar“ und im Block „vorab“ nach dem Bau; umfangKennung für das Neuzeichnen', () => {
  const umfang = { status: 'ok', ausserhalb: ['docs/x.md'] }
  assert.match(renderAbnahme('wf-1', abnahme({ umfang })).oben, /abnahme-umfang/)
  assert.match(renderAbnahme('wf-1', abnahme({ workflowStatus: 'KLAERUNG_ERFORDERLICH', umfang })).unten, /abnahme-umfang/)
  assert.doesNotMatch(renderAbnahme('wf-1', abnahme()).oben, /abnahme-umfang/)
  assert.notEqual(umfangKennung(umfang), umfangKennung({ status: 'ok', ausserhalb: [] }))
  assert.notEqual(umfangKennung(umfang), umfangKennung({ status: 'nicht_bestimmbar', ausserhalb: [] }))
  assert.equal(umfangKennung(undefined), '-')
})

/** Lauf A des Nachweislaufs (features/F45/nachweise/b2b3b2b2b/auswertung-haushaltsbuch2-a-…md: ERFOLGREICH, je 1 erlaubt/abgelehnt/beantwortet). */
const KANAL_A = { ergebnis: 'ERFOLGREICH', zaehlung: { stefan_erlaubt: 1, stefan_abgelehnt: 1, frage_beantwortet: 1, nicht_browser: 0, abgelaufen: 0, lauf_ende: 0, automatisch: 0 }, abgleich: null, abweichung: null, abgelehntDurchStefan: 1 }
const PROJEKT_CLI = { art: 'cliVersionGeaendert', installiert: '2.1.300 (Claude Code)', deklariert: '2.1.258 <b>', anleitung: 'docs/harness/startfreigabe-erneuern.md#projekt-startfreigabe-erneuern' }

test('F45 B2b-3b-2b-2b-2b-2 (F-1146): Abnahmeseite zeigt den Block „Rückfrage-Kanal im Lauf“ selbst (Lauf A), samt CLI-Zeile', () => {
  const { oben } = renderAbnahme('w-1', abnahme(), null, undefined, { kanal: KANAL_A, projektCliHinweis: PROJEKT_CLI })
  assert.match(oben, /note rueckfrage-abnahme[\s\S]*Rückfrage-Kanal im Lauf[\s\S]*Einmal erlaubt: 1[\s\S]*Abgelehnt: 1[\s\S]*Fragen beantwortet: 1[\s\S]*als deine Ablehnung bestätigt: 1/)
  assert.ok(oben.indexOf('abnahme-selbst-titel') < oben.indexOf('rueckfrage-abnahme'), 'design-guardian 2: ohne Grund ist die Zählung Detail — nach „Selbst ausprobieren“')
  assert.match(oben, /note amber entscheiden-cli-hinweis">Die installierte Claude-Code-Version weicht derzeit von der Startfreigabe dieses Projekts ab \(installiert: 2\.1\.300 \(Claude Code\), Startfreigabe: 2\.1\.258 &lt;b&gt;\) — das Ergebnis gilt trotzdem/, 'qa 3: heutiger Stand, nicht die Version des Laufs')
  assert.match(oben, /Anleitung: docs\/harness\/startfreigabe-erneuern\.md#projekt-startfreigabe-erneuern/)
  assert.doesNotMatch(oben, /<b>/)
  const ohne = renderAbnahme('w-1', abnahme()).oben
  assert.doesNotMatch(ohne, /rueckfrage-abnahme|entscheiden-cli-hinweis/, 'ohne Kanal und ohne Abweichung nichts')
  assert.equal(renderAbnahme('w-1', abnahme(), null, undefined, { kanal: null, projektCliHinweis: null }).oben, ohne)
  // Der Block steht nur auf der Seite „entscheidbar“ — im Block „vorab“ (Sichtungs-Halt) trägt die Notiz der Eingriffe die Ursache.
  assert.doesNotMatch(renderAbnahme('w-1', abnahme({ workflowStatus: 'KLAERUNG_ERFORDERLICH' }), null, undefined, { kanal: KANAL_A }).unten, /rueckfrage-abnahme/)
})

test('F-1146: lädt ⇒ Zeile; nicht ladbar ⇒ Hinweis mit Link ins Lauf-Detail; Lauf B ⇒ Regel-Text oben auf der Abnahmeseite', () => {
  assert.equal(renderKanalImLauf(undefined), '')
  assert.equal(renderKanalImLauf(null), '')
  assert.match(renderKanalImLauf({ laedt: true, laufId: 'l' }), /abnahme-kanal-laedt">Rückfrage-Kanal des Laufs wird geladen/)
  const fehler = renderKanalImLauf({ fehler: true, laufId: 'l <x>' })
  assert.match(fehler, /gerade nicht ladbar — er steht auch im Lauf-Detail\. <a class="text-link" href="#\/runs\/l%20%3Cx%3E">Lauf ansehen/, 'qa 2: Weg ins Lauf-Detail')
  assert.doesNotMatch(renderKanalImLauf({ fehler: true }), /<a /)
  const laufB = { ergebnis: 'VERWEIGERT', zaehlung: { stefan_erlaubt: 0, stefan_abgelehnt: 0, frage_beantwortet: 0, nicht_browser: 0, abgelaufen: 0, lauf_ende: 0, automatisch: 1 }, abgleich: { art: 'abgleich', grund: 'nicht_von_stefan' }, abweichung: null, abgelehntDurchStefan: null }
  assert.match(renderKanalImLauf(laufB), /nach einer festen Regel selbst abgelehnt/)
  const oben = renderAbnahme('w-1', abnahme(), null, undefined, { kanal: laufB }).oben
  assert.ok(oben.indexOf('rueckfrage-abnahme') < oben.indexOf('abnahme-selbst-titel'), 'mit Grund oben, unter den Kacheln')
  assert.ok(oben.indexOf('entscheiden-kacheln') < oben.indexOf('rueckfrage-abnahme'))
})
