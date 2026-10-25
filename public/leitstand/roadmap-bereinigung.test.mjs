/**
 * Datei: public/leitstand/roadmap-bereinigung.test.mjs
 *
 * Zweck: F45 B5b-2b-2 — reine Bausteine der Bereinigungsliste (roadmap-bereinigung.js): Deutung des GET (fail-closed bei fehlendem
 * `moeglich`), Sperren für „Bestätigen …“ und „Jetzt schreiben“ (Häkchen bei LAEUFT, qa2; genau ein Eintrag je Klick), Körper mit
 * den Hashes aus dem GET, Deutung der POST-Antworten (200 eigen, Rest wie deutePlanungAntwort), Sichtbarkeit des Abschnitts
 * (Advisor A4), HTML: deaktivierter Vorschlag mit Grund, Datumshinweis (qa6), „nicht zurücknehmbar“ (qa2), Erfolg mit festem
 * STATUS.md-Hinweis und hinweis (qa7), qa8-Satz, Zähler an der Trennzeile, escaped.
 *
 * Wird aufgerufen von: `npm run test` (node --test)
 *
 * Wichtig: rein, ohne DOM und Netz; Hashes sind Platzhalter.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { t } from './i18n.js'
import {
  baueBestaetigung,
  bereinigungHinweis,
  bereinigungHtml,
  bereinigungsAnzahl,
  darfBestaetigen,
  darfSchreiben,
  deuteBereinigung,
  deuteBestaetigungAntwort,
  neuerEintragsStand,
  trennzeileBereinigungHtml,
  zeigeBereinigung,
} from './roadmap-bereinigung.js'

const HASHES = { roadmap: 'a'.repeat(64), ausnahmen: 'b'.repeat(64), akte: 'c'.repeat(64), status_md: null }
const roh = (teil = {}) => ({
  eintrag: 'M3/F18',
  meilenstein: 'M3',
  feature: 'F18',
  featureStatus: 'FEATURE_GATE',
  ausnahme: { grund: 'x' },
  quelle: { roadmap: 'docs/projekt/roadmap.json', akte: 'features/F18/feature.md', ausnahme: null, status_md: 'docs/STATUS.md:421' },
  vorschlaege: [
    { entscheidung: 'feature_abgeschlossen', text: 'F18 → ABGESCHLOSSEN (heute FEATURE_GATE)', nebenwirkung: 'Akte …', moeglich: false, grund: 'docs/STATUS.md nennt F18 2× <b>' },
    { entscheidung: 'meilenstein_laeuft', text: 'M3 → LAEUFT', nebenwirkung: 'roadmap.json …', moeglich: true, grund: null },
  ],
  hashes: HASHES,
  ...teil,
})
const liste = (eintraege = [roh()], befunde = []) => deuteBereinigung({ status: 'ok', eintraege, befunde })
const stand = (teil = {}) => ({ ...neuerEintragsStand(), ...teil })

test('deuteBereinigung: ok, nicht_vorhanden, ungueltig; Vorschlag ohne moeglich: true ist nicht möglich (fail-closed)', () => {
  const l = liste([roh({ vorschlaege: [{ entscheidung: 'feature_abgeschlossen', text: 'x', nebenwirkung: 'y' }, { entscheidung: 'unbekannt' }] }), { eintrag: 'ohne Hashes' }], ['B1', 3])
  assert.equal(l.zustand, 'ok')
  assert.equal(l.eintraege.length, 1)
  assert.deepEqual(l.eintraege[0].vorschlaege, [{ entscheidung: 'feature_abgeschlossen', text: 'x', nebenwirkung: 'y', moeglich: false, grund: null }])
  assert.deepEqual(l.befunde, ['B1'])
  assert.equal(l.eintraege[0].statusMd, 'docs/STATUS.md:421')
  assert.deepEqual(deuteBereinigung({ status: 'nicht_vorhanden' }), { zustand: 'nicht_vorhanden' })
  assert.deepEqual(deuteBereinigung({ status: 'ungueltig', fehler: ['kaputt', 1] }), { zustand: 'ungueltig', fehler: ['kaputt'] })
  assert.deepEqual(deuteBereinigung({ status: 'ok' }), { zustand: 'ungueltig', fehler: [] })
  assert.deepEqual(deuteBereinigung(null), { zustand: 'ungueltig', fehler: [] })
  assert.equal(bereinigungsAnzahl(l), 1)
  assert.equal(bereinigungsAnzahl(null), 0)
})

test('darfBestaetigen/darfSchreiben: nur möglicher Vorschlag, Begründung, keine Sperre; LAEUFT nur mit Häkchen (qa2)', () => {
  const [e] = liste().eintraege
  assert.equal(darfBestaetigen(e, stand({ wahl: 'meilenstein_laeuft', grund: 'g' }), false), true)
  assert.equal(darfBestaetigen(e, stand({ wahl: 'feature_abgeschlossen', grund: 'g' }), false), false, 'nicht möglicher Vorschlag')
  assert.equal(darfBestaetigen(e, stand({ wahl: 'meilenstein_laeuft', grund: '  ' }), false), false, 'ohne Begründung')
  assert.equal(darfBestaetigen(e, stand({ wahl: 'meilenstein_laeuft', grund: 'g' }), true), false, 'andere Bestätigung läuft')
  assert.equal(darfBestaetigen(e, stand({ wahl: 'meilenstein_laeuft', grund: 'g', phase: 'sendet' }), false), false, 'Doppelklick')
  assert.equal(darfSchreiben(e, stand({ wahl: 'meilenstein_laeuft', grund: 'g' }), false), false, 'noch im Auswahlschritt')
  assert.equal(darfSchreiben(e, stand({ wahl: 'meilenstein_laeuft', grund: 'g', schritt: 'pruefen' }), false), false, 'ohne Häkchen')
  assert.equal(darfSchreiben(e, stand({ wahl: 'meilenstein_laeuft', grund: 'g', schritt: 'pruefen', haekchen: true }), false), true)
  const [f] = liste([roh({ vorschlaege: [{ entscheidung: 'feature_abgeschlossen', text: 'x', nebenwirkung: 'y', moeglich: true, grund: null }] })]).eintraege
  assert.equal(darfSchreiben(f, stand({ wahl: 'feature_abgeschlossen', grund: 'g', schritt: 'pruefen' }), false), true, 'ABGESCHLOSSEN ohne Häkchen')
})

test('bereinigungHinweis: sagt, was fehlt', () => {
  const [e] = liste().eintraege
  assert.equal(bereinigungHinweis(e, stand(), null), t('roadmap.bereinigung.erstWaehlen'))
  assert.equal(bereinigungHinweis(e, stand({ wahl: 'meilenstein_laeuft' }), null), t('roadmap.bereinigung.grundFehlt'))
  assert.equal(bereinigungHinweis(e, stand({ wahl: 'meilenstein_laeuft', grund: 'g', schritt: 'pruefen' }), null), t('roadmap.bereinigung.haekchenFehlt'))
  assert.equal(bereinigungHinweis(e, stand({ wahl: 'meilenstein_laeuft', grund: 'g' }), null), '')
  assert.equal(bereinigungHinweis(e, stand(), 'sendet'), t('roadmap.bereinigung.andereLaeuft'))
  assert.equal(bereinigungHinweis(e, stand(), 'laedt'), t('roadmap.bereinigung.laedtNeu'))
  assert.equal(bereinigungHinweis(e, stand(), 'erfolg'), t('roadmap.bereinigung.erstCommitten'), 'offener Git-Block sperrt (qa 2)')
})

test('baueBestaetigung: genau ein Eintrag, Hashes unverändert aus dem GET', () => {
  const [e] = liste().eintraege
  const koerper = baueBestaetigung(e, 'meilenstein_laeuft', 'weil')
  assert.deepEqual(koerper, { eintrag: 'M3/F18', entscheidung: 'meilenstein_laeuft', grund: 'weil', hashes: HASHES })
  assert.equal(koerper.hashes, e.hashes)
})

test('deuteBestaetigungAntwort: 200 eigen, 409 Sperre/Konflikt, 422, Fehler', () => {
  assert.deepEqual(deuteBestaetigungAntwort(200, { status: 'ok', eintrag: 'M4/F20', entscheidung: 'feature_abgeschlossen', geschrieben: ['a', 2], hinweis: 'h', git: ['git add -- a'] }), {
    art: 'ok',
    eintrag: 'M4/F20',
    entscheidung: 'feature_abgeschlossen',
    geschrieben: ['a'],
    hinweis: 'h',
    git: ['git add -- a'],
  })
  assert.equal(deuteBestaetigungAntwort(200, { status: 'ok' }).hinweis, null)
  assert.equal(deuteBestaetigungAntwort(409, { grund: 'Ablauf', workflowId: null }).art, 'gesperrt')
  assert.equal(deuteBestaetigungAntwort(409, { grund: 'geändert', hashes: {}, abweichend: ['akte'] }).art, 'konflikt')
  assert.deepEqual(deuteBestaetigungAntwort(422, { grund: 'R1', verstoesse: ['v'] }), { art: 'abgelehnt', status: 422, grund: 'R1', verstoesse: ['v'] })
  assert.equal(deuteBestaetigungAntwort(500, {}).art, 'fehler')
  assert.equal(deuteBestaetigungAntwort(200, { status: 'kaputt' }).art, 'fehler')
})

test('zeigeBereinigung: nur bei n > 0 — außer offener Erfolg, Meldung oben, Ladefehler, ungültige Liste (Advisor A4)', () => {
  assert.equal(zeigeBereinigung({ laden: 'laedt', liste: null, erfolge: [], oben: null }), false)
  assert.equal(zeigeBereinigung({ laden: 'ok', liste: liste([]), erfolge: [], oben: null }), false)
  assert.equal(zeigeBereinigung({ laden: 'ok', liste: { zustand: 'nicht_vorhanden' }, erfolge: [], oben: null }), false)
  assert.equal(zeigeBereinigung({ laden: 'ok', liste: liste(), erfolge: [], oben: null }), true)
  assert.equal(zeigeBereinigung({ laden: 'ok', liste: liste([]), erfolge: [{}], oben: null }), true)
  assert.equal(zeigeBereinigung({ laden: 'ok', liste: liste([]), erfolge: [], oben: { eintrag: 'x', meldung: {} } }), true)
  assert.equal(zeigeBereinigung({ laden: 'fehler', liste: null, erfolge: [], oben: null }), true)
  assert.equal(zeigeBereinigung({ laden: 'ok', liste: { zustand: 'ungueltig', fehler: [] }, erfolge: [], oben: null }), true)
})

const html = (teil = {}) => bereinigungHtml({ laden: 'ok', fehlerGrund: null, liste: liste(), staende: new Map(), erfolge: [], oben: null, sperre: null, datum: '2026-10-25', ...teil })

test('bereinigungHtml Auswahl: Zähler, qa8-Satz, deaktivierter Vorschlag mit Grund (escaped), Bestätigen gesperrt ohne Wahl', () => {
  const h = html()
  assert.match(h, /Bereinigung \(1\)/)
  assert.match(h, /Dauerhaft begründete Ausnahmen sind heute nicht vorgesehen\./)
  assert.match(h, /value="feature_abgeschlossen"[^>]*disabled/)
  assert.doesNotMatch(h, /value="meilenstein_laeuft"[^>]*disabled/)
  assert.match(h, /Nicht möglich, von Hand:/)
  assert.match(h, /2× &lt;b&gt;/)
  assert.doesNotMatch(h, /2× <b>/)
  assert.match(h, /class="button" data-roadmap-bereinigung-aktion="bestaetigen"[^>]*aria-describedby="rm-bereinigung-hinweis-0"[^>]*disabled/, 'gesperrt, kein Hauptknopf (dg 2), Grund verknüpft (dg 6)')
  assert.match(h, /id="rm-bereinigung-hinweis-0"/)
  assert.match(h, /aria-describedby="rm-bereinigung-grund-0-hinweis"/)
  assert.doesNotMatch(h, /<code>docs\/STATUS\.md nennt/, 'Grund als Prosa (dg 5)')
  const frei = html({ staende: new Map([['M3/F18', stand({ wahl: 'meilenstein_laeuft', grund: 'g' })]]) })
  assert.match(frei, /class="button primary" data-roadmap-bereinigung-aktion="bestaetigen"/)
  assert.doesNotMatch(html({ sperre: 'erfolg', staende: new Map([['M3/F18', stand({ wahl: 'meilenstein_laeuft', grund: 'g' })]]) }), /class="button primary" data-roadmap-bereinigung-aktion="bestaetigen"/, 'offener Erfolg sperrt')
  assert.match(h, /docs\/STATUS\.md:421/)
  const ohne = html({ liste: liste([roh({ vorschlaege: [], quelle: {} })]) })
  assert.match(ohne, /Kein Vorschlag \(Feature ohne Akte bzw\. Status, ABGEBROCHEN oder Meilenstein-ID nicht adressierbar\) — von Hand bereinigen\./)
  assert.doesNotMatch(ohne, /data-roadmap-bereinigung-aktion="bestaetigen"/)
})

test('bereinigungHtml Bestätigungsschritt: LAEUFT nicht zurücknehmbar mit Häkchen (qa2), ABGESCHLOSSEN mit Datumshinweis (qa6)', () => {
  const laeuft = html({ staende: new Map([['M3/F18', stand({ wahl: 'meilenstein_laeuft', grund: 'Grund <x>', schritt: 'pruefen' })]]) })
  assert.match(laeuft, /role="group"/)
  assert.match(laeuft, /Im Leitstand nicht zurücknehmbar/)
  assert.match(laeuft, /data-roadmap-bereinigung-feld="haekchen"/)
  assert.match(laeuft, /data-roadmap-bereinigung-aktion="schreiben"[^>]*disabled/)
  assert.match(laeuft, /Grund &lt;x&gt;/)
  assert.match(laeuft, /docs\/projekt\/roadmap\.json/)
  const mitHaekchen = html({ staende: new Map([['M3/F18', stand({ wahl: 'meilenstein_laeuft', grund: 'g', schritt: 'pruefen', haekchen: true })]]) })
  assert.doesNotMatch(mitHaekchen, /data-roadmap-bereinigung-aktion="schreiben"[^>]*disabled/)
  const fertig = liste([roh({ vorschlaege: [{ entscheidung: 'feature_abgeschlossen', text: 'F18 → ABGESCHLOSSEN', nebenwirkung: 'Akte …', moeglich: true, grund: null }] })])
  const ab = html({ liste: fertig, staende: new Map([['M3/F18', stand({ wahl: 'feature_abgeschlossen', grund: 'g', schritt: 'pruefen' })]]) })
  assert.match(ab, /„Abgenommen:“ in der Akte trägt das heutige Datum \(<code>2026-10-25<\/code>\)/)
  assert.doesNotMatch(ab, /data-roadmap-bereinigung-feld="haekchen"/)
  assert.doesNotMatch(ab, /data-roadmap-bereinigung-aktion="schreiben"[^>]*disabled/)
})

test('bereinigungHtml Erfolg und Meldungen: STATUS.md-Hinweis fest (qa7), hinweis zusätzlich, Git-Block; Meldung oben; Ladefehler', () => {
  const erfolg = { art: 'ok', eintrag: 'M4/F20', entscheidung: 'feature_abgeschlossen', geschrieben: ['features/F20/feature.md', 'docs/STATUS.md'], hinweis: 'docs/STATUS.md fehlt — übersprungen', git: ['git add -- "docs/STATUS.md"'], text: 'F20 → ABGESCHLOSSEN' }
  const h = html({ liste: liste([]), erfolge: [erfolg, { ...erfolg, eintrag: 'M4/F22', hinweis: null }] })
  assert.match(h, /Freitext und Überschriften in docs\/STATUS\.md von Hand prüfen\./)
  assert.match(h, /docs\/STATUS\.md fehlt — übersprungen/)
  assert.equal((h.match(/class="befehlsblock[ "]/g) ?? []).length, 2)
  assert.match(h, /data-roadmap-bereinigung-index="1"/)
  assert.match(h, /Geschrieben, nicht committet: <code>M4\/F20<\/code> · F20 → ABGESCHLOSSEN/)
  const oben = html({ liste: liste([]), oben: { eintrag: 'M4/F20', meldung: { art: 'abgelehnt', status: 422, grund: 'nicht <da>', verstoesse: [] } } })
  assert.match(oben, /Nicht geschrieben/)
  assert.match(oben, /nicht &lt;da&gt;/)
  assert.match(oben, /nicht mehr in der Liste — erledigt oder von Hand geändert/, 'Eintrag weg (qa 6)')
  assert.match(oben, /data-roadmap-bereinigung-aktion="oben-schliessen"/, 'Schließen (cr 6)')
  assert.match(oben, /data-roadmap-bereinigung-fokus="oben\|meldung"/, 'stabiler Fokusschlüssel (qa 1)')
  const amEintrag = html({ staende: new Map([['M3/F18', stand({ meldung: { art: 'gesperrt', grund: 'Ablauf', workflowId: 'wf-1' } })]]) })
  assert.match(amEintrag, /Erst nach dem Ende des Ablaufs erneut bestätigen\./)
  assert.match(amEintrag, /href="#\/workflows\/wf-1"/)
  assert.match(amEintrag, /data-roadmap-bereinigung-fokus="M3\/F18\|meldung"/)
  const fehler = html({ laden: 'fehler', fehlerGrund: 'HTTP 500', liste: null })
  assert.match(fehler, /Bereinigungsliste nicht ladbar/)
  assert.match(fehler, /data-roadmap-bereinigung-aktion="laden"/)
})

test('trennzeileBereinigungHtml: nur bei n > 0, pluralisiert', () => {
  assert.equal(trennzeileBereinigungHtml(0), '')
  assert.match(trennzeileBereinigungHtml(1), /1 Abweichung zur Bereinigung/)
  assert.match(trennzeileBereinigungHtml(5), /5 Abweichungen zur Bereinigung/)
})
