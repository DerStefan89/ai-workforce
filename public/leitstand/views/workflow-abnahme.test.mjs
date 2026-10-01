/**
 * Datei: public/leitstand/views/workflow-abnahme.test.mjs
 *
 * Zweck: node:test-Fälle für views/workflow-abnahme.js (F44 WS-4b, Abgleich F-725 F13–F18): die drei
 * Lagen (entscheidbar, offen, entschieden), die veraltete Entscheidung, der F18-Hinweis nur bei
 * erzeuger 'kern', „Prüfung wiederholen“ nach unveränderter Regel, die Zeilen für „Auf einen Blick“,
 * kein erfundener Text „Was sich verbessert hat“ und Escaping aller Serverwerte.
 *
 * Wird aufgerufen von: `npm run test` (node --test). Das Modul ist rein: der Import läuft in Node
 * ohne DOM (in Node gilt de).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { abnahmeLage, erlaubteAbnahmeAktionen, pruefungWiederholbar, renderAbnahme, renderAbnahmeBlick } from './workflow-abnahme.js'

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

test('entscheidbar: Abschnitt über der Timeline mit Empfehlung, Kriterien, Befunden, Dateien, Prüfbericht und Entscheidung inline', () => {
  const a = abnahme()
  assert.equal(abnahmeLage(a), 'entscheidbar')
  const { oben, unten } = renderAbnahme('w-1', a)
  assert.equal(unten, '')
  assert.match(oben, /<div class="eyebrow">Dein letztes Wort<\/div><h2 id="abnahme-titel">Passt das Ergebnis\?<\/h2>/)
  assert.match(oben, /Deine Abnahme fehlt/)
  assert.match(oben, /class="note abnahme-empfehlung"[\s\S]*Empfehlung des Code Reviewers: bereit zur Abnahme\./)
  assert.match(oben, /Abnehmen &lt;b&gt;bitte&lt;\/b&gt;/, 'empfehlung bleibt roh und escaped')
  assert.match(oben, /<h3>Vereinbart &amp; überprüft<\/h3>/)
  assert.match(oben, /aria-hidden="true">✓<\/span>[\s\S]*<code>AK1<\/code> Erfüllt[\s\S]*Nachweis: Test &lt;grün&gt;/)
  assert.match(oben, /<code>AK2<\/code> Nicht prüfbar/)
  assert.match(oben, /<h3>Befunde<\/h3>[\s\S]*Mittel<\/span> <code>src\/a\.ts:3<\/code>[\s\S]*Name &lt;unklar&gt;[\s\S]*Beleg: Zeile 3 &quot;x&quot;/)
  assert.match(oben, /<summary>Geänderte Dateien · 1 Datei<\/summary>[\s\S]*<code>src\/&lt;a&gt;\.ts<\/code>[\s\S]*\+3[\s\S]*—/)
  assert.match(oben, /<details class="abnahme-details"><summary>Prüfbericht &amp; Nachweise<\/summary>[\s\S]*GRÜN[\s\S]*Exit 0/)
  assert.doesNotMatch(oben, /wf-pruefung-wiederholen/, 'GRÜN bei ABGESCHLOSSEN: kein „Prüfung wiederholen“')
  assert.match(oben, /<textarea id="wf-abnahme-begruendung"/)
  const knoepfe = [...oben.matchAll(/class="([^"]*) wf-abnahme-aktion" data-aktion="(\w+)"[^>]*?(disabled)?>([^<]*)</g)].map((m) => [m[2], m[4], m[3] === 'disabled'])
  assert.deepEqual(knoepfe, [
    ['ANGENOMMEN', 'Ergebnis abnehmen', false],
    ['ANPASSUNG_ANGEFORDERT', 'Anpassung wünschen', false],
    ['ABGELEHNT', 'Ablehnen', false],
  ])
  assert.doesNotMatch(oben, /Was sich verbessert hat/, 'kein erfundener Text der Vorlage')
  assert.doesNotMatch(oben, /Block „Bedienung“|Block „Bedienung"/)
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
  assert.match(kernHtml, /class="note amber abnahme-automatisch"><strong>Automatisch angelegt · Iteration 2\/3 · Start erfordert deine Freigabe<\/strong>/)
})

test('veraltet: die frühere Entscheidung bleibt sichtbar (Audit-Spur), die Abnahme ist wieder offen', () => {
  const a = abnahme({ entscheidung: { status: 'veraltet', ergebnis: 'ABGELEHNT', begruendung: 'alt <x>', entschiedenAm: '2026-09-30T10:00:00.000Z', erzeuger: 'mensch' } })
  assert.equal(abnahmeLage(a), 'entscheidbar')
  const { oben } = renderAbnahme('w-1', a)
  assert.match(oben, /Frühere Entscheidung \(bezieht sich auf eine frühere Fassung\): Abgelehnt am [^—]+— „alt &lt;x&gt;“/)
  assert.match(oben, /wf-abnahme-aktion/)
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
    assert.match(oben, /Dein letztes Wort[\s\S]*Passt das Ergebnis\?/)
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
