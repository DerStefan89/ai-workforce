/**
 * Datei: public/leitstand/views/lauf-detail.test.mjs
 *
 * Zweck: node:test-Fälle für das Render-Modul der Ausführungen (F44 WS-5a, views/lauf-detail.js):
 * Liste (Titel mit Rückfall, Kettenbruch, Kenntnisnahme, „läuft“ aus aktiverLauf, Leer- und
 * Fehlerzustand, Escaping), Startfehler, Timeline „Was passiert ist“ (Reihenfolge, Titel je typ mit
 * Rückfall, Punktfarben), die Notizen der Lagen a–e samt Aktionen, „Einordnung“, die Aufklappbereiche
 * und die Dialoginhalte (Pflichtfelder, kein Grundfeld beim Abbruch).
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  checkpointTitel,
  ermittleLaufLage,
  kopiereHash,
  laufStatusPunkt,
  renderAufklappInhalte,
  renderEinordnung,
  renderFaehigkeiten,
  renderFaehigkeitenImLauf,
  renderLaufDialog,
  renderLaufHarnessAbgleich,
  renderLaufListe,
  renderLaufNotiz,
  renderStartfehlerListe,
  renderWasPassiertIst,
} from './lauf-detail.js'

const BOESE = '<img src=x onerror=alert(1)>'

const lauf = (felder = {}) => ({
  laufId: 'lauf-1',
  laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'FEHLGESCHLAGEN' },
  ergebnis: 'FEHLGESCHLAGEN',
  zeitpunkt: '2026-10-01T10:42:00.000Z',
  auftragsbezug: { auftragId: 'a-1', titel: 'Browser-Prüfung' },
  anzahlCheckpoints: 3,
  kettenintegritaet: true,
  kenntnisgenommen: false,
  ...felder,
})

test('Liste: Titel = Auftragstitel, laufId als code, Statuspunkt, Zeit über Intl, Zeile führt zu #/runs/<laufId>; keine Worker/Rolle', () => {
  const html = renderLaufListe([lauf()], { aktiv: false, laufId: null })
  assert.match(html, /<a class="list-row lauf-zeile" href="#\/runs\/lauf-1" data-lauf-id="lauf-1">/)
  assert.match(html, /<h3>Browser-Prüfung<\/h3>/)
  assert.match(html, /<code>lauf-1<\/code>/)
  assert.match(html, /class="ablauf-status fehler">Fehlgeschlagen</)
  assert.match(html, /<time datetime="2026-10-01T10:42:00.000Z">/)
  assert.doesNotMatch(html, /Kettenintegrität|Zur Kenntnis genommen|Worker|Rolle/)
})

test('Liste: ohne Auftrag die laufId als Titel; Kettenbruch rot; Kenntnisnahme; ohne Zeit „Zeit unbekannt“', () => {
  const html = renderLaufListe([lauf({ auftragsbezug: null, kettenintegritaet: false, kenntnisgenommen: true, zeitpunkt: null })])
  assert.match(html, /<h3>lauf-1<\/h3>/)
  assert.match(html, /class="lauf-zeile-bruch">Kettenintegrität verletzt/)
  assert.match(html, /class="lauf-kenntnis">Zur Kenntnis genommen</)
  assert.match(html, /Zeit unbekannt/)
})

test('Liste: der aktive Lauf zeigt „Läuft“ statt „Klärung nötig“ (F-828, F-844); ohne aktiv „Klärung nötig“', () => {
  const offen = lauf({ laufStatus: { status: 'KLAERUNG_ERFORDERLICH' }, ergebnis: null })
  assert.match(renderLaufListe([offen], { aktiv: true, laufId: 'lauf-1' }), /class="ablauf-status ok">Läuft</)
  assert.match(renderLaufListe([offen], { aktiv: true, laufId: 'anderer' }), /class="ablauf-status warten">Klärung nötig</)
  assert.match(renderLaufListe([offen], undefined), /Klärung nötig/)
})

test('Liste: Leerzustand und Fehlerzustand im V10-Stil, keine Entwarnung bei null', () => {
  assert.match(renderLaufListe([]), /class="empty"><h3>Noch keine Ausführungen\.<\/h3>/)
  const fehler = renderLaufListe(null)
  assert.match(fehler, /class="note red"><strong>Ausführungen nicht verfügbar\.<\/strong>/)
  assert.doesNotMatch(fehler, /Noch keine Ausführungen/)
})

test('Liste: Serverwerte werden escaped (Titel, laufId)', () => {
  const html = renderLaufListe([lauf({ laufId: `x"${BOESE}`, auftragsbezug: { titel: BOESE } })])
  assert.doesNotMatch(html, /<img/)
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/)
  assert.match(html, /data-lauf-id="x&quot;&lt;img/)
})

test('Startfehler: Zeilen roh und escaped, leer, nicht verfügbar', () => {
  const html = renderStartfehlerListe([{ zeitstempel: '2026-10-01T09:00:00.000Z', laufId: 'l-9', fehler: BOESE }])
  assert.match(html, /<code>l-9<\/code>/)
  assert.match(html, /&lt;img src=x/)
  assert.doesNotMatch(html, /<img/)
  assert.match(renderStartfehlerListe([]), /Keine Startfehler\./)
  assert.match(renderStartfehlerListe(null), /class="note red"><strong>Startfehler nicht verfügbar\.<\/strong>/)
})

const CHECKPOINTS = [
  { sequenz: 2, zeitstempel: '2026-10-01T10:33:00.000Z', gueltig: true, typ: 'lineage/artefakt_version', lineage: { art: 'artefakt_version', artefaktId: 'kontextpaket-l', beschreibung: BOESE }, stale: { stale: true, geaenderteEingaben: ['a'] } },
  { sequenz: 1, zeitstempel: '2026-10-01T10:31:00.000Z', gueltig: true, typ: 'wirkungsmarke', wirkungsmarke: { art: 'run_prepared' } },
  { sequenz: 3, zeitstempel: null, gueltig: false, gruende: ['Hash weicht ab'], typ: '(ungültig)' },
  { sequenz: 4, zeitstempel: '2026-10-01T10:42:00.000Z', gueltig: true, typ: 'neuer_typ' },
]

test('Timeline: Reihenfolge nach sequenz, Titel je typ mit Rückfall auf den rohen typ, Unterzeile roh und escaped', () => {
  const html = renderWasPassiertIst(CHECKPOINTS, false)
  const titel = [...html.matchAll(/<h3>([^<]*)<\/h3>/g)].map((m) => m[1])
  assert.deepEqual(titel, ['Lauf vorbereitet', 'Artefakt erzeugt', 'Ungültiger Eintrag', 'neuer_typ'])
  assert.match(html, /&lt;img src=x/)
  assert.doesNotMatch(html, /<img/)
  assert.match(html, /Artefakt <code>kontextpaket-l<\/code>/)
  assert.match(html, /<p>Hash weicht ab<\/p>/)
  assert.equal(checkpointTitel({ typ: 'wirkungsmarke', wirkungsmarke: { art: 'terminal', ergebnis: 'FEHLGESCHLAGEN' } }), 'Ergebnis festgehalten')
  assert.equal(checkpointTitel({ typ: 'wirkungsmarke', wirkungsmarke: { art: 'unbekannt' } }), 'wirkungsmarke')
})

test('Timeline: Punkt rot bei ungültig, bernstein bei stale und beim letzten Eintrag eines nicht erfolgreichen Laufs, sonst erledigt', () => {
  const klassen = (html) => [...html.matchAll(/<li class="([^"]*)">/g)].map((m) => m[1])
  assert.deepEqual(klassen(renderWasPassiertIst(CHECKPOINTS, false)), ['done', 'current', 'fehler', 'current'])
  assert.deepEqual(klassen(renderWasPassiertIst(CHECKPOINTS, true)), ['done', 'current', 'fehler', 'done'])
  assert.match(renderWasPassiertIst([]), /Keine Checkpoints\./)
})

const FEHLGESCHLAGEN = { status: 'ABGESCHLOSSEN', ergebnis: 'FEHLGESCHLAGEN' }

test('Lage a (fehler): rote Notiz, Status neutral benannt, G3-Ursache als „kommt“, Kenntnisnahme und Fortsetzung, Aktualisieren', () => {
  const html = renderLaufNotiz('fehler', { laufStatus: FEHLGESCHLAGEN, fortsetzung: true, rohstrom: { status: 'ok', ergebnisobjekt: { status: 'ok', permissionDenials: { anzahl: 2, toolNamen: ['Bash', BOESE] } } } })
  assert.match(html, /class="note red/)
  assert.match(html, /Dieser Arbeitsschritt ist fehlgeschlagen\./)
  assert.match(html, /Ursache in Klartext <span class="kommt-badge">/)
  assert.match(html, /2 abgelehnte Werkzeugaufrufe: Bash, &lt;img/)
  assert.match(html, /data-aktion="kenntnisnahme-oeffnen" aria-haspopup="dialog">Fehler zur Kenntnis nehmen/)
  assert.match(html, /class="button primary lauf-aktion" data-aktion="fortsetzung">Fortsetzung vorbereiten/)
  assert.match(html, /data-aktion="aktualisieren"/)
  const verweigert = renderLaufNotiz('fehler', { laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'VERWEIGERT' }, verweigertDaten: { bypassVerdachtAnzahl: 0, nonExecutionKind: 'permission_denied' } })
  assert.match(verweigert, /Dieser Arbeitsschritt wurde verweigert\./)
  assert.match(verweigert, /<code>non_execution_kind<\/code> permission_denied/)
})

test('Lage a, schon zur Kenntnis genommen: kein Knopf, stattdessen die Zeile; der Dialog öffnet nicht mehr', () => {
  const html = renderLaufNotiz('fehler', { laufStatus: FEHLGESCHLAGEN, kenntnisgenommen: true, fortsetzung: true })
  assert.doesNotMatch(html, /kenntnisnahme-oeffnen/)
  assert.match(html, /Du hast diesen Fehler bereits zur Kenntnis genommen\./)
  assert.equal(renderLaufDialog('kenntnisnahme', { laufId: 'l', lage: 'fehler', kenntnisgenommen: true }), null)
})

test('Lage b (klaerung): bernsteinfarbene Notiz mit grund roh, „Klärung auflösen“ und Fortsetzung', () => {
  const html = renderLaufNotiz('klaerung', { laufStatus: { status: 'KLAERUNG_ERFORDERLICH', grund: BOESE }, fortsetzung: true })
  assert.match(html, /class="note amber/)
  assert.match(html, /Grund: &lt;img/)
  assert.match(html, /data-aktion="terminal-oeffnen"/)
  assert.match(html, /class="button lauf-aktion" data-aktion="fortsetzung"/)
})

test('Lage c (rueckfrage, F7): Bypass-Daten, „Rückfrage beantworten“ und Fortsetzung', () => {
  const html = renderLaufNotiz('rueckfrage', { laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'VERWEIGERT' }, verweigertDaten: { bypassVerdachtAnzahl: 3, isError: true, nonExecutionKind: 'bypass' }, fortsetzung: true })
  assert.match(html, /<code>bypass_verdacht_anzahl<\/code> 3/)
  assert.match(html, /<code>is_error<\/code> true/)
  assert.match(html, /<code>non_execution_kind<\/code> bypass/)
  assert.match(html, /data-aktion="antwort-oeffnen"/)
  assert.match(html, /data-aktion="fortsetzung"/)
})

test('Lage d (laeuft): Hinweis „Stand von …“ (F46 D5: die Seite zieht mit dem Poll nach), Aktualisieren und „Lauf abbrechen“, keine Entscheidung', () => {
  const html = renderLaufNotiz('laeuft', { laufStatus: { status: 'KLAERUNG_ERFORDERLICH' }, geladenAm: '2026-10-01T10:42:00.000Z' })
  assert.match(html, /Stand von /)
  assert.match(html, /data-aktion="aktualisieren"/)
  assert.match(html, /class="button danger lauf-aktion" data-aktion="abbrechen-oeffnen"/)
  assert.doesNotMatch(html, /terminal-oeffnen|kenntnisnahme-oeffnen|fortsetzung/)
  const angefordert = renderLaufNotiz('laeuft', { laufStatus: { status: 'KLAERUNG_ERFORDERLICH' }, abbruchAngefordert: true })
  assert.match(angefordert, /data-aktion="abbrechen-oeffnen" disabled>Abbruch angefordert</)
  assert.equal(renderLaufDialog('abbrechen', { laufId: 'l', lage: 'laeuft', abbruchAngefordert: true }), null)
})

test('Lage e (erfolg) und sonst: keine Aktion außer Aktualisieren', () => {
  for (const lage of ['erfolg', 'sonst']) {
    const html = renderLaufNotiz(lage, { laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } })
    const aktionen = [...html.matchAll(/data-aktion="([^"]+)"/g)].map((m) => m[1])
    assert.deepEqual(aktionen, ['aktualisieren'], lage)
  }
  assert.equal(ermittleLaufLage({ status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' }, null, false), 'erfolg')
  assert.equal(ermittleLaufLage({ status: 'NICHT_GESTARTET' }, null, false), 'sonst')
})

test('Statuspunkt: aktiv ohne Terminalmarke läuft; ABGESCHLOSSEN zeigt das Ergebnis auch im Nachlauf', () => {
  assert.deepEqual(laufStatusPunkt({ status: 'KLAERUNG_ERFORDERLICH' }, true), { kategorie: 'ok', schluessel: 'laeuft' })
  assert.deepEqual(laufStatusPunkt({ status: 'ABGESCHLOSSEN', ergebnis: 'VERWEIGERT' }, true), { kategorie: 'fehler', schluessel: 'VERWEIGERT' })
  assert.deepEqual(laufStatusPunkt({ status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' }), { kategorie: 'ok', schluessel: 'ERFOLGREICH' })
})

const DETAIL = {
  laufId: 'l-1',
  laufStatus: FEHLGESCHLAGEN,
  aktiv: false,
  verweigertDaten: null,
  checkpoints: CHECKPOINTS,
  auftrag: { status: 'ok', auftragId: 'a-1', titel: 'Bauen aus der Akte', auftragstext: 'Text' },
  kontextpaket: { status: 'ok', rolle: 'ausfuehrung', elemente: [{ pfad: 'features/F1/feature.md' }], ausgeschlossen: [] },
  laufakte: { status: 'ok', worker: 'codex', modellDeklariert: 'gpt-5', modellBeobachtet: null, beobachtungsbasisVollstaendig: true, arbeitsverzeichnisPfad: '/tmp/w', beobachtung: { geladen: ['playwright'], aufgerufen: [] } },
  rohstrom: { status: 'laufakte_fehlt' },
}

test('Einordnung: Auftrag, Rolle (lesbar), Worker (lesbar), Ergebnis, Zeit des letzten gültigen Checkpoints', () => {
  const html = renderEinordnung(DETAIL)
  assert.match(html, /<dd>Bauen aus der Akte<\/dd>/)
  assert.match(html, /<dt>Rolle<\/dt><dd>Umsetzung<\/dd>/)
  assert.match(html, /<dt>Worker<\/dt><dd>Codex<\/dd>/)
  assert.match(html, /ablauf-status fehler">Fehlgeschlagen/)
  assert.match(html, /datetime="2026-10-01T10:42:00.000Z"/)
  assert.match(renderEinordnung({ ...DETAIL, auftrag: { status: 'kein_auftragsbezug' }, kontextpaket: { status: 'nicht_vorhanden' }, laufakte: { status: 'nicht_vorhanden' } }), /Kein Auftragsbezug/)
})

test('Aufklappbereiche: Auftrag/Kontext, Laufakte mit Rang der Modelle, Protokoll mit Klärzustand, Rohstrom und Checkpoint-Tabelle, Fähigkeiten echt', () => {
  const inhalte = renderAufklappInhalte(DETAIL, { kettenintegritaet: false, anzahlCheckpoints: 3 })
  assert.match(inhalte.auftrag, /Auftrag: Bauen aus der Akte/)
  assert.match(inhalte.auftrag, /Kontextpaket \(Rolle: ausfuehrung\)/)
  assert.match(inhalte.herkunft, /<th>Modell \(deklariert\)<\/th><td>gpt-5<\/td>/)
  assert.match(inhalte.herkunft, /<th>Worker<\/th><td>codex<\/td>/, 'in der Laufakte roh')
  assert.match(inhalte.protokoll, /Klärzustand/)
  assert.match(inhalte.protokoll, /Keine Laufakte — kein Rohstrom-Bezug\./)
  assert.match(inhalte.protokoll, /Checkpoint-Kette/)
  assert.match(inhalte.protokoll, /Kettenintegrität: <span class="badge fehler">Nein<\/span> · Gültige Checkpoints: 3/, 'Kettenintegrität und Zahl aus den Kopfdaten des Servers')
  assert.match(renderAufklappInhalte(DETAIL).protokoll, /Kettenintegrität: <span class="unbekannt">unbekannt/, 'ohne Kopfdaten keine eigene Rechnung')
  assert.match(inhalte.faehigkeiten, /Beobachtung:<\/strong> /)
  assert.doesNotMatch(inhalte.faehigkeiten, /kommt-badge/, 'G5 ist echt angebunden, kein „kommt“')
  assert.match(renderAufklappInhalte({ ...DETAIL, laufakte: { status: 'nicht_vorhanden' } }).faehigkeiten, /nicht beobachtet/)
  assert.match(renderAufklappInhalte({ ...DETAIL, auftrag: { status: 'auftrag_fehlt', auftragId: 'a&b' } }).auftrag, /\(&#39;a&amp;b&#39;\)/, 'auftrag_fehlt genau einmal escaped')
})

test('Dialoge: Pflichtfelder für Kenntnisnahme, Klärung, Antwort; Abbruch ohne Grundfeld; Inhalt nur in seiner Lage', () => {
  const kenntnis = renderLaufDialog('kenntnisnahme', { laufId: BOESE, lage: 'fehler' })
  assert.match(kenntnis, /<textarea id="entscheidung-kenntnisnahme-begruendung"[^>]*aria-required="true"/)
  assert.match(kenntnis, /data-aktion="kenntnisnahme"/)
  assert.doesNotMatch(kenntnis, /<img/)
  const terminal = renderLaufDialog('terminal', { laufId: 'l', lage: 'klaerung' })
  assert.deepEqual([...terminal.matchAll(/<option value="([^"]+)">/g)].map((m) => m[1]), ['ERFOLGREICH', 'VERWEIGERT', 'FEHLGESCHLAGEN'])
  const antwort = renderLaufDialog('antwort', { laufId: 'l', lage: 'rueckfrage' })
  assert.deepEqual([...antwort.matchAll(/<option value="([^"]+)">/g)].map((m) => m[1]), ['ERFOLGREICH', 'VERWEIGERT'])
  assert.match(antwort, /id="entscheidung-antwort-text"/)
  const abbruch = renderLaufDialog('abbrechen', { laufId: 'l', lage: 'laeuft' })
  assert.doesNotMatch(abbruch, /<textarea|<select/)
  assert.match(abbruch, /Eine Begründung wird dafür nicht gespeichert\./)
  assert.match(abbruch, /class="button lauf-dialog-abbrechen">Zurück</)
  for (const [art, falscheLage] of [['kenntnisnahme', 'rueckfrage'], ['terminal', 'fehler'], ['antwort', 'fehler'], ['abbrechen', 'erfolg']]) {
    assert.equal(renderLaufDialog(art, { laufId: 'l', lage: falscheLage }), null, `${art} in ${falscheLage}`)
  }
  for (const html of [kenntnis, terminal, antwort, abbruch]) assert.doesNotMatch(html, /aria-live/)
})

test('F45 B1b-2: Harness-Abgleich im Lauf-Detail — Zuordnung offen, Einzellauf, lädt, Fehler', () => {
  assert.match(renderLaufHarnessAbgleich('zuordnung'), /Der Ablauf dieses Laufs wird ermittelt/)
  assert.match(renderLaufHarnessAbgleich('ohneAblauf'), /gehört zu keinem Ablauf/)
  assert.match(renderLaufHarnessAbgleich(undefined), /Harness-Abgleich lädt/)
  assert.match(renderLaufHarnessAbgleich({ fehler: '404 weg' }), /nicht ladbar: 404 weg/)
})

test('F45 F-2a (Beleg 13): „Fähigkeiten im Lauf“ — aktiv/aus mit Grund, Quelle, Hash gekürzt, Aufrufe/Fehler, fremde Aufrufe als eigene Zeile', () => {
  const feld = {
    eintraege: [
      { id: 'playwright-mcp', name: 'Playwright', typ: 'mcp', quelle: 'katalog', hash: 'c'.repeat(64), aktiv: true, aufrufe: 4, fehlgeschlagen: 1 },
      { id: 'agent:qa', name: 'qa', typ: 'agent', quelle: 'projekt', hash: 'a'.repeat(64), pfad: 'agents/qa.md', aktiv: true, aufrufe: 1, fehlgeschlagen: 0 },
      { id: 'skill:ponytail', name: 'ponytail', typ: 'skill', quelle: 'projekt', hash: 'b'.repeat(64), aktiv: false, grund: `nicht eingeschaltet ${BOESE}`, aufrufe: 0, fehlgeschlagen: 0 },
    ],
    fremde_aufrufe: [
      { art: 'agent', name: 'general-purpose', fehler: true },
      { art: 'agent', name: 'general-purpose', fehler: true },
    ],
  }
  const html = renderFaehigkeitenImLauf(feld)
  assert.match(html, /Fähigkeiten im Lauf/)
  assert.match(html, /2 aktiv · 2 benutzt · 1 aus · 2 fremde Aufrufe/)
  assert.match(html, /<code title="a{64}">a{12}…<\/code>/)
  // F45 F-2b-1 (F-1060 (6)): voller Hash per Tastatur erreichbar (details/summary), nicht nur im title.
  assert.match(html, /<details class="fp-hash-voll"><summary>ganzer Hash<\/summary><code>a{64}<\/code> <button type="button" class="button hash-kopieren" data-hash-kopieren="a{64}">Kopieren<\/button><span class="subtle hash-kopieren-hinweis" hidden>/)
  assert.match(html, /data-aktiv="true"><td[^>]*><strong>Playwright<\/strong><\/td><td[^>]*>MCP<\/td><td[^>]*>Katalog<\/td>/)
  assert.match(html, /4 · <span class="ablauf-status fehler">1 mit Fehler<\/span>/)
  assert.match(html, /<strong>qa<\/strong><\/td><td[^>]*>Agent<\/td><td[^>]*>Projekt<\/td><td[^>]*><span class="ablauf-status">aktiv<\/span>/)
  assert.match(html, /<span class="ablauf-status neutral">aus<\/span><br><span class="subtle">nicht eingeschaltet &lt;img/)
  assert.match(html, /data-fremd="true"><td[^>]*><strong>general-purpose<\/strong>.*fremder Aufruf.*2 · <span class="ablauf-status fehler">2 mit Fehler/)
  assert.doesNotMatch(html, /<img/)
})

test('F45 F-2a: „Fähigkeiten im Lauf“ ohne Feld → nicht erfasst; ohne Beobachtung → nicht beobachtet; im Aufklappbereich nur mit Laufakte', () => {
  assert.match(renderFaehigkeitenImLauf(null), /Nicht erfasst — nur Ausführungsläufe mit angezeigter Empfehlung tragen einen Fähigkeiten-Kontext/)
  assert.match(renderFaehigkeitenImLauf({ eintraege: [{ id: 'x', name: 'x', typ: 'agent', quelle: 'projekt', aktiv: true, aufrufe: null, fehlgeschlagen: null }], fremde_aufrufe: [] }), /nicht beobachtet/)
  assert.match(renderFaehigkeitenImLauf({ eintraege: [], fremde_aufrufe: [] }), /Keine Fähigkeiten in diesem Lauf/)
  const mitAkte = renderFaehigkeiten({ status: 'ok', beobachtung: null, faehigkeitenImLauf: { eintraege: [], fremde_aufrufe: [] } })
  assert.match(mitAkte, /Fähigkeiten im Lauf/)
  assert.doesNotMatch(renderFaehigkeiten({ status: 'nicht_vorhanden' }), /Fähigkeiten im Lauf/)
})

test('F45 F-2b-1 (F-1060 (6)): kopiereHash schreibt den Hash; ohne Zwischenablage wird der Hinweis sichtbar', async () => {
  const hinweis = { hidden: true }
  const knopf = { dataset: { hashKopieren: 'f'.repeat(64) }, textContent: 'Kopieren', parentElement: { querySelector: (s) => (s === '.hash-kopieren-hinweis' ? hinweis : null) } }
  const geschrieben = []
  await kopiereHash(knopf, { writeText: async (text) => geschrieben.push(text) })
  assert.deepEqual(geschrieben, ['f'.repeat(64)])
  assert.equal(knopf.textContent, 'Kopiert')
  assert.equal(hinweis.hidden, true)
  await kopiereHash(knopf, undefined)
  assert.equal(hinweis.hidden, false)
  const hinweis2 = { hidden: true }
  const knopf2 = { ...knopf, parentElement: { querySelector: (s) => (s === '.hash-kopieren-hinweis' ? hinweis2 : null) } }
  await kopiereHash(knopf2, { writeText: async () => Promise.reject(new Error('verweigert')) })
  assert.equal(hinweis2.hidden, false)
})
