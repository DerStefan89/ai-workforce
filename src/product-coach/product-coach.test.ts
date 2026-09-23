/**
 * Datei: src/product-coach/product-coach.test.ts
 *
 * Zweck: node:test-Fälle für das Product-Coach-Modul (F34 WS-1, erweitert WS-3). Muster
 * src/jarvis/jarvis.test.ts — prüft validiereErgebnisProductCoach direkt
 * (Rot-/Grünfälle je Regel), baueCoachAuftragstext (Textbausteine),
 * baueAuftragAusScope (Determinismus), entferneIdPraefix und
 * baueAuftragAusProjektentwurf (F34 WS-3 Korrekturrunde, löst F-611/F-612 — Code-Review-
 * Befund derselben Runde: die ursprünglichen Fixes hatten keine ausführende Prüfung des
 * konkreten Präfix-Strip-Falls, nur eine Herleitung am Schreibtisch; hier real getestet).
 * scripts/check-f34-product-coach.mjs prüft zusätzlich die Schema-Beispiele und reale
 * HTTP-Rot-/Grünfälle (D5-Muster: kein zweiter, von Hand nachgebauter Regelsatz).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { baueAuftragAusProjektentwurf, baueAuftragAusScope, baueCoachAuftragstext, entferneIdPraefix, validiereErgebnisProductCoach, vergebeFeatureIds } from './index.ts'

const GUELTIGER_SCOPE = {
  titel: 'Design-Phase vor F30',
  problem: 'Mehrere Karten sind optisch unfertig.',
  ziel: 'Alle Optik-Findings gebündelt schließen.',
  in_scope: ['Bestehende Optik-Findings'],
  out_of_scope: ['Neue Views'],
  annahmen: ['Design-Tokens bleiben unverändert'],
  offene_fragen: ['Vor oder nach F34 WS-2?'],
  erfolgskriterium: 'Kein offenes Optik-Finding mehr.',
}

const GUELTIGE_ALTERNATIVEN = [
  { titel: 'A', beschreibung: 'x', abwaegung: 'x' },
  { titel: 'B', beschreibung: 'x', abwaegung: 'x' },
]

// ─── validiereErgebnisProductCoach ─────────────────────────────────────────

test('validiereErgebnisProductCoach: gültiges frage-Ergebnis liefert keine Verstöße', () => {
  assert.deepStrictEqual(validiereErgebnisProductCoach({ art: 'frage', antwort: 'x', alternativen: null, scope: null }), [])
})

test('validiereErgebnisProductCoach: gültiges alternativen-Ergebnis liefert keine Verstöße', () => {
  assert.deepStrictEqual(validiereErgebnisProductCoach({ art: 'alternativen', antwort: 'x', alternativen: GUELTIGE_ALTERNATIVEN, scope: null }), [])
})

test('validiereErgebnisProductCoach: gültiges scope_entwurf-Ergebnis liefert keine Verstöße', () => {
  assert.deepStrictEqual(validiereErgebnisProductCoach({ art: 'scope_entwurf', antwort: 'x', alternativen: null, scope: GUELTIGER_SCOPE }), [])
})

test('validiereErgebnisProductCoach: ältere claude-code-Form (Felder weggelassen statt null) bleibt gültig', () => {
  assert.deepStrictEqual(validiereErgebnisProductCoach({ art: 'frage', antwort: 'x' }), [])
})

test('validiereErgebnisProductCoach: Wurzel muss ein Objekt sein', () => {
  assert.deepStrictEqual(validiereErgebnisProductCoach('kein-objekt'), ['Wurzel ist kein Objekt'])
  assert.deepStrictEqual(validiereErgebnisProductCoach(null), ['Wurzel ist kein Objekt'])
  assert.deepStrictEqual(validiereErgebnisProductCoach([]), ['Wurzel ist kein Objekt'])
})

test('validiereErgebnisProductCoach: unbekanntes Top-Level-Feld wird gemeldet', () => {
  const verstoesse = validiereErgebnisProductCoach({ art: 'frage', antwort: 'x', alternativen: null, scope: null, laufId: 'x' })
  assert.ok(verstoesse.some((v) => v.includes("unbekanntes Feld 'laufId'")))
})

test("validiereErgebnisProductCoach: 'art' muss aus der Enum-Menge sein", () => {
  const verstoesse = validiereErgebnisProductCoach({ art: 'vorschlag', antwort: 'x', alternativen: null, scope: null })
  assert.ok(verstoesse.some((v) => v.includes("'art' muss einer von")))
})

test("validiereErgebnisProductCoach: 'antwort' muss ein nicht-leerer String sein", () => {
  const verstoesse = validiereErgebnisProductCoach({ art: 'frage', antwort: '', alternativen: null, scope: null })
  assert.ok(verstoesse.some((v) => v.includes("'antwort' muss ein nicht-leerer String sein")))
})

test("validiereErgebnisProductCoach: art 'alternativen' ohne 'alternativen' wird gemeldet", () => {
  const verstoesse = validiereErgebnisProductCoach({ art: 'alternativen', antwort: 'x', alternativen: null, scope: null })
  assert.ok(verstoesse.some((v) => v.includes("'alternativen' fehlt — bei art 'alternativen' Pflicht")))
})

test("validiereErgebnisProductCoach: art 'scope_entwurf' ohne 'scope' wird gemeldet", () => {
  const verstoesse = validiereErgebnisProductCoach({ art: 'scope_entwurf', antwort: 'x', alternativen: null, scope: null })
  assert.ok(verstoesse.some((v) => v.includes("'scope' fehlt — bei art 'scope_entwurf' Pflicht")))
})

test("validiereErgebnisProductCoach: 'alternativen' bei art 'frage' gesetzt wird gemeldet", () => {
  const verstoesse = validiereErgebnisProductCoach({ art: 'frage', antwort: 'x', alternativen: GUELTIGE_ALTERNATIVEN, scope: null })
  assert.ok(verstoesse.some((v) => v.includes("'alternativen' gesetzt, aber art ist nicht 'alternativen'")))
})

test("validiereErgebnisProductCoach: 'scope' bei art 'frage' gesetzt wird gemeldet", () => {
  const verstoesse = validiereErgebnisProductCoach({ art: 'frage', antwort: 'x', alternativen: null, scope: GUELTIGER_SCOPE })
  assert.ok(verstoesse.some((v) => v.includes("'scope' gesetzt, aber art ist nicht 'scope_entwurf'")))
})

test("validiereErgebnisProductCoach: 'alternativen' mit weniger als zwei Einträgen wird gemeldet", () => {
  const verstoesse = validiereErgebnisProductCoach({ art: 'alternativen', antwort: 'x', alternativen: [GUELTIGE_ALTERNATIVEN[0]], scope: null })
  assert.ok(verstoesse.some((v) => v.includes("'alternativen' muss mindestens zwei Einträge tragen")))
})

test("validiereErgebnisProductCoach: 'alternativen'-Eintrag mit fehlendem Feld wird gemeldet", () => {
  const verstoesse = validiereErgebnisProductCoach({ art: 'alternativen', antwort: 'x', alternativen: [{ titel: 'A', beschreibung: 'x' }, GUELTIGE_ALTERNATIVEN[1]], scope: null })
  assert.ok(verstoesse.some((v) => v.includes("'alternativen[0].abwaegung' fehlt")))
})

test("validiereErgebnisProductCoach: 'scope' mit fehlendem Feld wird gemeldet", () => {
  const { erfolgskriterium, ...ohneErfolgskriterium } = GUELTIGER_SCOPE
  const verstoesse = validiereErgebnisProductCoach({ art: 'scope_entwurf', antwort: 'x', alternativen: null, scope: ohneErfolgskriterium })
  assert.ok(verstoesse.some((v) => v.includes("'scope.erfolgskriterium' fehlt")))
})

test("validiereErgebnisProductCoach: 'scope' mit unbekanntem Feld wird gemeldet", () => {
  const verstoesse = validiereErgebnisProductCoach({ art: 'scope_entwurf', antwort: 'x', alternativen: null, scope: { ...GUELTIGER_SCOPE, extra: 'x' } })
  assert.ok(verstoesse.some((v) => v.includes("'scope' trägt unbekanntes Feld 'extra'")))
})

test("validiereErgebnisProductCoach: 'scope.in_scope' mit leerem String-Eintrag wird gemeldet", () => {
  const verstoesse = validiereErgebnisProductCoach({ art: 'scope_entwurf', antwort: 'x', alternativen: null, scope: { ...GUELTIGER_SCOPE, in_scope: [''] } })
  assert.ok(verstoesse.some((v) => v.includes("'scope.in_scope' muss ein Array aus nicht-leeren Strings sein")))
})

test('validiereErgebnisProductCoach: Codex-Form (explizites null) verhält sich wie eine fehlende Angabe', () => {
  const rot = validiereErgebnisProductCoach({ art: 'scope_entwurf', antwort: 'x', alternativen: null, scope: null })
  assert.ok(rot.some((v) => v.includes("'scope' fehlt — bei art 'scope_entwurf' Pflicht")))
  const gruen = validiereErgebnisProductCoach({ art: 'scope_entwurf', antwort: 'x', alternativen: null, scope: GUELTIGER_SCOPE })
  assert.deepStrictEqual(gruen, [])
})

// ─── baueCoachAuftragstext ──────────────────────────────────────────────────

test('baueCoachAuftragstext: enthält die Nutzer-Nachricht wörtlich am Ende', () => {
  const text = baueCoachAuftragstext('Sollen wir das Onboarding mit einbeziehen?')
  assert.ok(text.endsWith('Sollen wir das Onboarding mit einbeziehen?'))
})

test('baueCoachAuftragstext: nennt alle drei art-Enum-Werte und verbietet Codezäune', () => {
  const text = baueCoachAuftragstext('x')
  assert.ok(text.includes('"frage" | "alternativen" | "scope_entwurf"'))
  assert.ok(text.includes('kein Codezaun'))
})

test('baueCoachAuftragstext: leerer Verlauf enthält keinen Verlaufsblock', () => {
  const text = baueCoachAuftragstext('x', [])
  assert.ok(!text.includes('Bisheriger Gesprächsverlauf'))
})

test('baueCoachAuftragstext: mit Verlauf enthält den Verlaufsblock UND die Nachricht am Ende', () => {
  const text = baueCoachAuftragstext('Letzte Nachricht', [{ nachricht: 'Erste Nachricht', antwort: 'Erste Antwort' }])
  assert.ok(text.includes('Bisheriger Gesprächsverlauf'))
  assert.ok(text.includes('Mensch: Erste Nachricht'))
  assert.ok(text.includes('Coach: Erste Antwort'))
  assert.ok(text.endsWith('Letzte Nachricht'))
})

// ─── baueAuftragAusScope ────────────────────────────────────────────────────

test('baueAuftragAusScope: ist deterministisch (gleicher Scope liefert byte-identisches Ergebnis)', () => {
  const einmal = baueAuftragAusScope(GUELTIGER_SCOPE)
  const zweimal = baueAuftragAusScope(GUELTIGER_SCOPE)
  assert.deepStrictEqual(einmal, zweimal)
})

test('baueAuftragAusScope: titel wird 1:1 übernommen', () => {
  const { titel } = baueAuftragAusScope(GUELTIGER_SCOPE)
  assert.strictEqual(titel, GUELTIGER_SCOPE.titel)
})

test('baueAuftragAusScope: auftragstext enthält alle Scope-Felder', () => {
  const { auftragstext } = baueAuftragAusScope(GUELTIGER_SCOPE)
  assert.ok(auftragstext.includes(GUELTIGER_SCOPE.problem))
  assert.ok(auftragstext.includes(GUELTIGER_SCOPE.ziel))
  assert.ok(auftragstext.includes(GUELTIGER_SCOPE.in_scope[0]))
  assert.ok(auftragstext.includes(GUELTIGER_SCOPE.out_of_scope[0]))
  assert.ok(auftragstext.includes(GUELTIGER_SCOPE.annahmen[0]))
  assert.ok(auftragstext.includes(GUELTIGER_SCOPE.offene_fragen[0]))
  assert.ok(auftragstext.includes(GUELTIGER_SCOPE.erfolgskriterium))
})

test('baueAuftragAusScope: leere Listenfelder werden als "(keine)" statt einer leeren Sektion dargestellt', () => {
  const { auftragstext } = baueAuftragAusScope({ ...GUELTIGER_SCOPE, out_of_scope: [] })
  assert.ok(auftragstext.includes('## Out of Scope\n- (keine)'))
})

// ─── entferneIdPraefix (F34 WS-3 Korrekturrunde, löst F-612) ───────────────

test('entferneIdPraefix: entfernt "M6 — " (Em-Dash) vor einem Meilenstein-Titel', () => {
  assert.strictEqual(entferneIdPraefix('M6 — Aufräum-Werkzeug für Testrückstände'), 'Aufräum-Werkzeug für Testrückstände')
})

test('entferneIdPraefix: entfernt "F3 - " (ASCII-Bindestrich) vor einem Feature-Titel', () => {
  assert.strictEqual(entferneIdPraefix('F3 - On-Demand-Skript'), 'On-Demand-Skript')
})

test('entferneIdPraefix: entfernt "F1B: " (Buchstaben-Suffix, Doppelpunkt-Trenner)', () => {
  assert.strictEqual(entferneIdPraefix('F1B: Titel mit Suffix'), 'Titel mit Suffix')
})

test('entferneIdPraefix: lässt einen Titel OHNE führenden ID-Präfix unverändert (reales Fixture "Design-Phase vor F30" — F30 steht mitten im String, kein Treffer)', () => {
  assert.strictEqual(entferneIdPraefix('Design-Phase vor F30'), 'Design-Phase vor F30')
})

test('entferneIdPraefix: lässt gewöhnlichen Fließtext ohne jeden ID-Bezug unverändert', () => {
  assert.strictEqual(entferneIdPraefix('Ein ganz normaler Titel'), 'Ein ganz normaler Titel')
})

test('entferneIdPraefix: bekannte Grenze (F-619) — ein Titel, der EXAKT der ID ohne Trenner entspricht, wird NICHT bereinigt', () => {
  assert.strictEqual(entferneIdPraefix('M6'), 'M6')
})

// ─── baueAuftragAusProjektentwurf (F34 WS-3 Korrekturrunde, löst F-611/F-612) ──
//
// Reproduziert den realen Fall aus features/F34/nachweis-ws3.md: ein Meilenstein-Titel, den der
// Coach selbst mit einem ID-artigen Präfix begonnen hat, PLUS die reale, vom Server über
// vergebeFeatureIds vergebene ID — vorher entstand hier "### M6 — M6 — …" (F-612) und der
// Auftragstitel kam im Modus 'erweiterung' aus der unveränderten Gesamt-vision (F-611).

const PROJEKT_MIT_ID_PRAEFIX_IM_TITEL = {
  vision: 'AI Workforce führt ein Vorhaben von der Idee bis zum abgenommenen Ergebnis durch klar getrennte KI-Positionen.',
  zielgruppe: 'Stefan',
  ziele: ['x'],
  scope_in: ['x'],
  scope_out: ['x'],
  capabilities_bedarf: [],
  architektur_hinweise: [],
  offene_fragen: [],
  meilensteine: [
    {
      titel: 'M6 — Aufräum-Werkzeug für Testrückstände',
      ziel: 'z',
      features: [{ titel: 'F41 - On-Demand-Skript', ziel: 'z', nicht_ziele: [], akzeptanzkriterien: [], abhaengig_von_titel: [] }],
    },
  ],
}

function baueProjektMitEchtenIds() {
  const zugewiesen = vergebeFeatureIds(PROJEKT_MIT_ID_PRAEFIX_IM_TITEL, { features: [], meilensteine: [] })
  // auftragModus wird von baueAuftragAusProjektentwurf nicht gelesen (kommt als eigener
  // Parameter), muss aber laut ProjektEntwurfMitIds-Typ trotzdem vorhanden sein (spiegelt die
  // real persistierte Form, s. verarbeiteRollenChatErgebnis) — Wert hier beliebig, ungenutzt.
  return { ...PROJEKT_MIT_ID_PRAEFIX_IM_TITEL, meilensteine: zugewiesen.meilensteine, offene_fragen: zugewiesen.offene_fragen, auftragModus: 'erweiterung' as const }
}

test('baueAuftragAusProjektentwurf: ein vom Coach selbst mit ID-artigem Präfix begonnener Meilenstein-Titel wird NICHT doppelt vorangestellt (löst F-612)', () => {
  const { auftragstext } = baueAuftragAusProjektentwurf(baueProjektMitEchtenIds(), 'erweiterung')
  assert.ok(auftragstext.includes('### M1 — Aufräum-Werkzeug für Testrückstände'), `erwartet einfaches "### M1 — …", erhalten: ${auftragstext}`)
  assert.ok(!auftragstext.includes('M1 — M1'), `Dopplung gefunden: ${auftragstext}`)
})

test('baueAuftragAusProjektentwurf: dasselbe gilt für einen Feature-Titel mit ID-artigem Präfix (löst F-612)', () => {
  const { auftragstext } = baueAuftragAusProjektentwurf(baueProjektMitEchtenIds(), 'erweiterung')
  assert.ok(auftragstext.includes('- F1 — On-Demand-Skript'), `erwartet einfaches "- F1 — …", erhalten: ${auftragstext}`)
  assert.ok(!auftragstext.includes('F1 — F1'), `Dopplung gefunden: ${auftragstext}`)
})

test("baueAuftragAusProjektentwurf: Titel im Modus 'erweiterung' kommt aus dem (bereinigten) Meilenstein-Titel, NICHT aus vision (löst F-611)", () => {
  const { titel } = baueAuftragAusProjektentwurf(baueProjektMitEchtenIds(), 'erweiterung')
  assert.strictEqual(titel, 'Erweiterung: Aufräum-Werkzeug für Testrückstände')
  assert.ok(!titel.includes('AI Workforce führt ein Vorhaben'), `Titel sollte NICHT aus vision gebildet sein, erhalten: ${titel}`)
})

test("baueAuftragAusProjektentwurf: Titel im Modus 'neu' bleibt unverändert aus vision gebildet", () => {
  const { titel } = baueAuftragAusProjektentwurf(baueProjektMitEchtenIds(), 'neu')
  assert.ok(titel.startsWith('Projekt-Anlage: AI Workforce führt ein Vorhaben'), `erwartet vision-basierten Titel, erhalten: ${titel}`)
})

test("baueAuftragAusProjektentwurf: mehrere neue Meilensteine werden im Modus 'erweiterung' mit '; ' verbunden", () => {
  const projekt = {
    ...baueProjektMitEchtenIds(),
    meilensteine: [
      { id: 'M1', titel: 'Erster Meilenstein', ziel: 'z', features: [] },
      { id: 'M2', titel: 'Zweiter Meilenstein', ziel: 'z', features: [] },
    ],
  }
  const { titel } = baueAuftragAusProjektentwurf(projekt, 'erweiterung')
  assert.strictEqual(titel, 'Erweiterung: Erster Meilenstein; Zweiter Meilenstein')
})

test("baueAuftragAusProjektentwurf: keine neuen Meilensteine liefert im Modus 'erweiterung' einen erkennbaren Platzhaltertitel statt eines leeren/kaputten Strings", () => {
  const projekt = { ...baueProjektMitEchtenIds(), meilensteine: [] }
  const { titel } = baueAuftragAusProjektentwurf(projekt, 'erweiterung')
  assert.strictEqual(titel, 'Erweiterung: (kein neuer Meilenstein)')
})
