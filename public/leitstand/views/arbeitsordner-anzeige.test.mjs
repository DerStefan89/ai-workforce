/**
 * Datei: public/leitstand/views/arbeitsordner-anzeige.test.mjs
 *
 * Zweck: node:test-Fälle für views/arbeitsordner-anzeige.js (F45 B1a-1, F-954): Karte „Wo gearbeitet wird“ in
 * allen Zuständen (nicht angelegt mit Muster und aktuellem Commit, wird vorbereitet, bereit, fehlgeschlagen,
 * aufgeräumt, Bestand, kein Bedarf), offene Änderungen des Projektordners (blockieren nicht, lädt, Fehler),
 * Aufräumen-Knopf nur bei beendetem Ablauf oder fehlgeschlagener Vorbereitung, Dialog mit Pflichtbegründung und
 * „verwerfen“, Muster für „Auftrag anlegen“ (Windows- und Posix-Pfade), Liste der Seite Code (leer, lädt, Fehler,
 * Einträge). Escaping aller Serverwerte.
 *
 * Wird aufgerufen von: `npm run test` (node --test). Das Modul ist rein (in Node gilt de).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  arbeitsordnerLage,
  arbeitsordnerMuster,
  aufraeumenMoeglich,
  kurzCommit,
  renderArbeitsordnerAktion,
  renderArbeitsordnerKarte,
  renderArbeitsordnerListe,
  renderAufraeumenDialog,
  umgebungArbeitsordnerZeile,
} from './arbeitsordner-anzeige.js'

const BASIS = '387f1a3e1dbc1581abd8f22a3b0b765825984c11'
const BEREIT = { status: 'BEREIT', pfad: 'C:\\P\\ai-workforce-laeufe\\wf-1', branch: 'wf/wf-1', basis_commit: BASIS, grund: null, vorbereitung: { worktree_ms: 900, npm_ci: { ergebnis: 'OK', dauer_ms: 21400 }, e183_ms: 4 }, aufraeumen: null, vorbereitungLaeuft: false, ordnerVorhanden: true }
const CODE_OK = { zustand: 'ok', daten: { absoluterPfad: 'C:\\P\\ai-workforce', branch: { status: 'ok', name: 'feat/x', commit: 'abcdef0123456' }, dateien: { status: 'ok', anzahl: 3 } } }

test('Karte: bereit mit Branch, Ordner, Basis und offenen Änderungen (blockieren nicht)', () => {
  const html = renderArbeitsordnerKarte(BEREIT, CODE_OK)
  assert.match(html, /Wo gearbeitet wird/)
  assert.match(html, /wf\/wf-1/)
  assert.match(html, /ai-workforce-laeufe/)
  assert.match(html, />387f1a3</)
  assert.match(html, /3 offene Änderungen — blockieren nicht/)
  assert.match(html, /Pakete in 21 s installiert/)
  assert.match(html, /Projektordner bleibt unberührt/)
  assert.doesNotMatch(html, /aria-live|role="status"/, 'keine zweite Live-Region (Design-Prüfung, Befund 1)')
})

test('Karte auf der Abnahme-Seite: Sichern-Hinweis, Löschliste mit Gründen, Knopf erst nach der Abnahme', () => {
  const kontext = { workflowId: 'wf-1', workflowStatus: 'ABGESCHLOSSEN', abnahmeOffen: true, loeschliste: { geloescht: ['a.txt'], abgelehnt: [{ pfad: '../x', grund: "Segment '..' nicht erlaubt" }] } }
  const offen = renderArbeitsordnerKarte(BEREIT, CODE_OK, kontext)
  // F45 B2b-4a-2b-2: die alte Zeile „bis „Bereit zum Sichern“ kommt“ ist weg — der Abschnitt kommt über kontext.sichernHtml.
  assert.doesNotMatch(offen, /Das Ergebnis liegt nur hier|bis „Bereit zum Sichern“/)
  assert.match(offen, /1 gelöscht, 1 abgelehnt/)
  assert.match(offen, /\.\.\/x<\/code> — Segment/)
  assert.doesNotMatch(offen, /aufraeumen-oeffnen/, 'vor der Abnahme kein Aufräumen')
  assert.match(renderArbeitsordnerKarte(BEREIT, CODE_OK, { ...kontext, abnahmeOffen: false }), /data-aktion="aufraeumen-oeffnen"/)
  assert.match(renderArbeitsordnerKarte({ ...BEREIT, status: 'FEHLGESCHLAGEN', grund: 'x' }, CODE_OK, {}), /Nächster Schritt/)
})

test('F45 B2b-4a-2b-2: Karte mit Abschnitt „Bereit zum Sichern“ in der Karte, ohneKnopf lässt den Kartenknopf weg', () => {
  const kontext = { workflowId: 'wf-1', workflowStatus: 'GESTOPPT', abnahmeOffen: false }
  const mit = renderArbeitsordnerKarte(BEREIT, CODE_OK, { ...kontext, sichernHtml: '<div data-sichern-abschnitt>X</div>', ohneKnopf: true })
  assert.equal((mit.match(/data-sichern-abschnitt/g) ?? []).length, 1, 'Abschnitt genau einmal, in der Karte')
  assert.ok(mit.indexOf('data-sichern-abschnitt') < mit.indexOf('</section>'), 'kein zweiter Block')
  assert.doesNotMatch(mit, /aufraeumen-oeffnen/, 'Kartenknopf entfällt — Aufräumen steht unter den Aktionen')
  // Advisor 5: auch ein leerer Abschnitt lässt den Knopf mit ohneKnopf weg (nicht an sichernHtml gebunden).
  assert.doesNotMatch(renderArbeitsordnerKarte(BEREIT, CODE_OK, { ...kontext, sichernHtml: '', ohneKnopf: true }), /aufraeumen-oeffnen/)
  assert.match(renderArbeitsordnerKarte(BEREIT, CODE_OK, kontext), /data-aktion="aufraeumen-oeffnen"/, 'ohne ohneKnopf wie bisher')
})

test('Karte: nicht angelegt zeigt Muster und den aktuellen Commit beim Start; Vorbereitung, Fehler, Aufgeräumt', () => {
  const fehlt = renderArbeitsordnerKarte({ status: 'fehlt', pfad: '/p/x-laeufe/wf-2', branch: 'wf/wf-2', basis_commit: null, vorbereitungLaeuft: false }, CODE_OK)
  assert.match(fehlt, /aktueller Commit beim Start · <code>abcdef0<\/code>/)
  assert.match(fehlt, /Wird beim Start angelegt/)
  assert.match(renderArbeitsordnerKarte({ ...BEREIT, status: 'IN_VORBEREITUNG', vorbereitungLaeuft: true }, CODE_OK), /wird vorbereitet/)
  const fehler = renderArbeitsordnerKarte({ ...BEREIT, status: 'FEHLGESCHLAGEN', grund: 'kein <Git>' }, CODE_OK)
  assert.match(fehler, /class="fehler arbeitsordner-lage"/)
  assert.match(fehler, /kein &lt;Git&gt;/)
  assert.match(renderArbeitsordnerKarte({ ...BEREIT, status: 'ENTFERNT', aufraeumen: { branch_geloescht: false } }, CODE_OK), /Branch bleibt bestehen/)
})

test('Karte: Bestand ohne Worktree-Angaben, kein Bedarf leer; offene Änderungen lädt/Fehler', () => {
  const bestand = renderArbeitsordnerKarte({ status: 'bestand' }, CODE_OK)
  assert.match(bestand, /arbeitet weiter im Projektordner/)
  assert.doesNotMatch(bestand, /Basis-Commit/)
  assert.equal(renderArbeitsordnerKarte({ status: 'kein_bedarf' }, CODE_OK), '')
  assert.equal(renderArbeitsordnerKarte(undefined, CODE_OK), '')
  assert.match(renderArbeitsordnerKarte(BEREIT, { zustand: 'laedt', daten: null }), /werden gelesen/)
  assert.match(renderArbeitsordnerKarte(BEREIT, { zustand: 'fehler', daten: null }), /nicht lesbar/)
})

test('Lage: alle Zustände haben einen Text', () => {
  for (const status of ['kein_bedarf', 'bestand', 'fehlt', 'IN_VORBEREITUNG', 'BEREIT', 'FEHLGESCHLAGEN', 'ENTFERNT']) {
    assert.ok(arbeitsordnerLage({ status, grund: 'g' }).text.length > 0, status)
  }
  assert.equal(arbeitsordnerLage({ status: 'FEHLGESCHLAGEN', grund: 'x' }).art, 'fehler')
})

test('Aufräumen nur bei beendetem Ablauf oder fehlgeschlagener Vorbereitung, nie während der Vorbereitung', () => {
  assert.equal(aufraeumenMoeglich('ABGESCHLOSSEN', BEREIT), true)
  assert.equal(aufraeumenMoeglich('GESTOPPT', BEREIT), true)
  assert.equal(aufraeumenMoeglich('LAEUFT', BEREIT), false)
  assert.equal(aufraeumenMoeglich('KLAERUNG_ERFORDERLICH', { ...BEREIT, status: 'FEHLGESCHLAGEN' }), true)
  assert.equal(aufraeumenMoeglich('ABGESCHLOSSEN', { ...BEREIT, status: 'ENTFERNT' }), false)
  assert.equal(aufraeumenMoeglich('ABGESCHLOSSEN', { ...BEREIT, vorbereitungLaeuft: true }), false)
  assert.equal(aufraeumenMoeglich('ABGESCHLOSSEN', BEREIT, true), false, 'Abnahme offen')
  assert.equal(aufraeumenMoeglich('GESTOPPT', BEREIT, true), true)
  assert.match(renderArbeitsordnerAktion('wf-1', 'ABGESCHLOSSEN', BEREIT), /data-aktion="aufraeumen-oeffnen"/)
  assert.doesNotMatch(renderArbeitsordnerAktion('wf-1', 'LAEUFT', BEREIT), /aufraeumen-oeffnen/)
  assert.equal(renderArbeitsordnerAktion('wf-1', 'LAEUFT', { status: 'kein_bedarf' }), '')
})

test('Dialog: Pflichtbegründung, „verwerfen“ ausdrücklich, Werte escaped', () => {
  const html = renderAufraeumenDialog({ workflowId: 'wf-"1', arbeitsordner: { ...BEREIT, pfad: 'C:\\<x>' } })
  assert.match(html, /id="wf-aufraeumen-begruendung"/)
  assert.match(html, /aria-required="true"/)
  assert.match(html, /type="checkbox" id="wf-aufraeumen-verwerfen"/)
  assert.match(html, /class="button danger wf-aktion" data-aktion="aufraeumen"/)
  assert.doesNotMatch(html, /checked/)
  assert.match(html, /C:\\&lt;x&gt;/)
  assert.match(html, /data-workflow-id="wf-&quot;1"/)
  assert.equal(renderAufraeumenDialog({ workflowId: 'w', arbeitsordner: null }), null)
})

test('Muster für „Auftrag anlegen“: Windows- und Posix-Pfade, ohne Pfad null', () => {
  assert.deepEqual(arbeitsordnerMuster('C:\\P\\ai-workforce\\'), { pfad: 'C:\\P\\ai-workforce-laeufe\\<Kurzname>', branch: 'wf/<Ablauf-ID>' })
  assert.deepEqual(arbeitsordnerMuster('/home/s/projekt'), { pfad: '/home/s/projekt-laeufe/<Kurzname>', branch: 'wf/<Ablauf-ID>' })
  assert.equal(arbeitsordnerMuster(null), null)
  const zeile = umgebungArbeitsordnerZeile(CODE_OK.daten, CODE_OK)
  assert.equal(zeile.basis, 'abcdef0')
  assert.match(zeile.aenderungen.text, /3 offene Änderungen/)
  assert.equal(kurzCommit('abc'), null)
})

test('Liste der Seite Code: lädt, Fehler, leer, Einträge mit Link und fehlendem Ordner', () => {
  assert.match(renderArbeitsordnerListe({ zustand: 'laedt', daten: null }), /werden gelesen/)
  assert.match(renderArbeitsordnerListe({ zustand: 'fehler', daten: null, fehler: '<500>' }), /&lt;500&gt;/)
  assert.match(renderArbeitsordnerListe({ zustand: 'ok', daten: { arbeitsordner: [] } }), /Noch kein Ablauf/)
  const html = renderArbeitsordnerListe({
    zustand: 'ok',
    daten: {
      arbeitsordner: [
        { workflowId: 'wf-1', status: 'BEREIT', pfad: 'C:\\x', branch: 'wf/wf-1', ordnerVorhanden: false },
        { workflowId: 'wf-2', status: 'ENTFERNT', pfad: 'C:\\y', branch: 'wf/wf-2', ordnerVorhanden: false },
      ],
    },
  })
  assert.match(html, /href="#\/workflows\/wf-1"/)
  assert.match(html, /Ordner fehlt auf der Platte/)
  assert.equal((html.match(/Ordner fehlt/g) ?? []).length, 1, 'aufgeräumte Einträge melden keinen fehlenden Ordner')
})
