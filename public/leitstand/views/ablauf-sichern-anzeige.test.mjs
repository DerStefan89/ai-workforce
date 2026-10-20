/**
 * Datei: public/leitstand/views/ablauf-sichern-anzeige.test.mjs
 *
 * Zweck: node:test-Fälle für den Abschnitt „Bereit zum Sichern“ (F45 B2b-4a-2b-2, views/ablauf-sichern-anzeige.js) je Lage:
 * lädt, Fehler, 409-Lage (aufgeräumt = Endzustand, ohne Fehlerfarbe), bereit (commit), bereit (push), push-Grund (Branch/origin),
 * node_modules ausgelassen, GESTOPPT (offene Änderungen, nichts offen, Zahlen unlesbar), nicht bestimmbar; genau ein Aufräumen je
 * Abschnitt (V3) aus derselben Regel wie der Knopf unter den Aktionen (Bauauflage 3); Sätze projekt/keinBedarf/unbekannt; keine
 * workflowId im sichtbaren Text außerhalb der Befehle.
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { aufraeumenArt, behandleSichernKlick, renderSichernAbschnitt, renderSichernSatz, sichernFuerAblauf } from './ablauf-sichern-anzeige.js'

const ID = 'wf-geheim-4711'
const AO = { pfad: String.raw`C:\Projekte\haushaltsbuch-laeufe\a1b2c3`, branch: `wf/${ID}` }

/**
 * Antwort von GET …/code?workflow= (200).
 * @param felder - Überschreibungen { sichern, branch, remoteWebUrl, dateien, workflowStatus }
 * @returns Antwort
 */
function antwort({ sichern = {}, branch = {}, remoteWebUrl = {}, dateien = {}, workflowStatus = 'ABGESCHLOSSEN' } = {}) {
  return {
    status: 'ok',
    absoluterPfad: AO.pfad,
    branch: { status: 'ok', name: AO.branch, losgeloest: false, commit: 'abc1234def', ...branch },
    remoteWebUrl: { status: 'ok', url: 'https://github.com/beispiel/haushaltsbuch', origin: true, ...remoteWebUrl },
    dateien: { status: 'ok', eintraege: [{ pfad: 'src/a.ts', art: 'M', xy: ' M' }], anzahl: 1, gekappt: false, nodeModules: 0, ...dateien },
    ablauf: { workflowId: ID, bedarf: 'pflicht', workflowStatus, arbeitsordner: AO, sichern: { bereit: true, art: 'commit', grund: null, offeneAenderungen: 1, voraus: 0, ...sichern } },
  }
}
const ok = (daten) => ({ zustand: 'ok', daten, http: 200, grundSchluessel: null, fehler: null, geladenAm: Date.UTC(2026, 9, 20, 12, 0) })
const lage = (grundSchluessel) => ({ zustand: 'lage', daten: null, http: 409, grundSchluessel, fehler: null, geladenAm: 1 })
const render = (stand, art = 'aktionen') => renderSichernAbschnitt({ workflowId: ID, stand, aufraeumen: { art } })
const zahl = (html, muster) => (html.match(muster) ?? []).length
/** Sichtbarer Text ohne die Befehle (<pre>) und ohne Attribute. */
const sichtbar = (html) => html.replace(/<pre[\s\S]*?<\/pre>/g, '').replace(/<[^>]+>/g, ' ')

test('lädt und leer: Lesetext, keine Blöcke, kein Aufräumen', () => {
  for (const stand of [{ zustand: 'leer' }, { zustand: 'laedt', schluessel: 'k' }, undefined]) {
    const html = render(stand)
    assert.match(html, /Stand des Arbeitsordners wird gelesen/)
    assert.equal(zahl(html, /befehlsblock"/g), 0)
    assert.equal(zahl(html, /data-sichern-aufraeumen/g), 0)
  }
})

test('Fehler: Text mit Fehlerfarbe und Aktualisieren, keine Blöcke aus altem Stand', () => {
  const html = render({ zustand: 'fehler', daten: null, fehler: '404: Ablauf nicht gefunden', geladenAm: 1 })
  assert.match(html, /class="fehler">Der Stand des Arbeitsordners ist nicht lesbar \(404: Ablauf nicht gefunden\)/)
  assert.match(html, /data-sichern-aktualisieren data-workflow-id="wf-geheim-4711"/)
  assert.equal(zahl(html, /befehlsblock"/g), 0)
})

test('409-Lage: keine Fehlerfarbe; aufgeräumt ist Endzustand ohne Aufräumen; andere Lagen mit genau einem Aufräumen', () => {
  const ende = render(lage('aufgeraeumt'))
  assert.match(ende, /Erledigt: Der Arbeitsordner ist aufgeräumt\./)
  assert.doesNotMatch(ende, /class="fehler"/)
  assert.equal(zahl(ende, /data-sichern-aufraeumen/g), 0)
  // QA 5: während Vorbereitung bzw. Aufräumen läuft, kein zweiter Hinweis „Aufräumen …“.
  const laeuft = render(lage('inVorbereitung'))
  assert.match(laeuft, /gerade vorbereitet oder aufgeräumt/)
  assert.equal(zahl(laeuft, /data-sichern-aufraeumen/g), 0)
  for (const k of ['fehlgeschlagen', 'ordnerFehlt', 'nichtBestimmbar', 'unbekanntNeu']) {
    const html = render(lage(k))
    assert.doesNotMatch(html, /class="fehler"/, k)
    assert.equal(zahl(html, /data-sichern-aufraeumen/g), 1, k)
    assert.doesNotMatch(sichtbar(html), /sichernGrund|unbekanntNeu/, 'nie ein roher Schlüssel')
  }
})

test('bereit (commit): drei Schritte, commit- und push-Block, genau ein Aufräumen, Web-Link, keine Kennung im Text', () => {
  const html = render(ok(antwort({ sichern: { voraus: 0 } })))
  assert.match(html, /class="badge ok">Bereit zum Sichern/)
  assert.equal(zahl(html, /class="sichern-schritt"/g), 3)
  assert.equal(zahl(html, /class="befehlsblock"/g), 2)
  assert.match(html, /git add src\/a\.ts/)
  assert.match(html, /git push -u origin wf\/wf-geheim-4711/)
  assert.match(html, /Nach dem Commit den Branch pushen/)
  assert.equal(zahl(html, /data-sichern-aufraeumen/g), 1)
  assert.match(html, /data-sichern-aufraeumen="aktionen">Aufräumen: Knopf „Arbeitsordner aufräumen“ unter den Aktionen\./)
  assert.doesNotMatch(html, /aufraeumen-oeffnen/, 'kein eigener Knopf im Abschnitt')
  assert.match(html, /href="https:\/\/github\.com\/beispiel\/haushaltsbuch" target="_blank" rel="noopener noreferrer"/)
  assert.match(html, /Stand von \d\d:\d\d/)
  assert.doesNotMatch(sichtbar(html), /wf-geheim-4711|workflow-/)
})

test('bereit (push): „Commits noch nicht auf main“, nur push-Block, nichts zu committen', () => {
  const html = render(ok(antwort({ sichern: { art: 'push', offeneAenderungen: 0, voraus: 2 }, dateien: { eintraege: [], anzahl: 0 } })))
  assert.match(html, /2 Commits noch nicht auf main/)
  assert.match(html, /Nichts zu committen/)
  assert.equal(zahl(html, /class="befehlsblock"/g), 1)
  assert.match(html, /git push -u origin/)
})

test('push-Grund: fremder Branch, losgelöst ⇒ kein Block, Grund sichtbar; ohne bzw. unlesbares origin ⇒ Hinweis statt push', () => {
  const fremd = render(ok(antwort({ branch: { name: 'feat/anders' } })))
  assert.equal(zahl(fremd, /class="befehlsblock"/g), 0)
  assert.match(fremd, /anderer Branch ausgecheckt/)
  assert.match(fremd, /Kein Push, solange der Grund in Schritt 1 besteht/)
  const los = render(ok(antwort({ branch: { losgeloest: true, name: null } })))
  assert.match(los, /losgelöster Stand/)
  assert.equal(zahl(los, /class="befehlsblock"/g), 0)
  const ohne = render(ok(antwort({ remoteWebUrl: { origin: false, url: null } })))
  assert.equal(zahl(ohne, /git push -u/g), 0)
  assert.match(ohne, /Kein Remote „origin“/)
  const unlesbar = render(ok(antwort({ remoteWebUrl: { status: 'fehler', origin: null, url: null } })))
  assert.equal(zahl(unlesbar, /git push -u/g), 0)
  assert.match(unlesbar, /nicht lesbar — deshalb ohne git push/)
})

test('node_modules ausgelassen: derselbe Hinweis wie #/code, nie im git add; ohne ausgelassene Dateien kein Hinweis', () => {
  const html = render(ok(antwort({ dateien: { nodeModules: 1532 } })))
  assert.match(html, /class="subtle code-node-modules">node_modules ausgelassen — fehlt in \.gitignore: 1\.532 neue Dateien/)
  assert.doesNotMatch(html, /git add[^<]*node_modules/)
  assert.doesNotMatch(html, /Neue Dateien unter node_modules stehen in keinem git add/, 'keine Doppelung')
  assert.doesNotMatch(render(ok(antwort())), /code-node-modules/)
  const nichtBereit = render(ok(antwort({ sichern: { bereit: false, art: null, grund: 'nichtsOffen', offeneAenderungen: 0, voraus: 0 }, dateien: { eintraege: [], anzahl: 0, nodeModules: 3 } })))
  assert.match(nichtBereit, /code-node-modules/, 'auch neben einem Grund')
})

test('GESTOPPT: offene Änderungen ⇒ Aufräumen/Verwerfen; nur Commits; 0/0 ⇒ nichts offen; unlesbar ⇒ eigener Text', () => {
  const gestoppt = (sichern) => render(ok(antwort({ workflowStatus: 'GESTOPPT', sichern: { bereit: false, art: null, grund: 'nichtAbgeschlossen', ...sichern } })))
  const offen = gestoppt({ offeneAenderungen: 3, voraus: 0 })
  assert.match(offen, /Gestoppt mit 3 offenen Änderungen\. Weg: Aufräumen — mit „Änderungen verwerfen“/)
  assert.equal(zahl(offen, /data-sichern-aufraeumen/g), 1)
  assert.equal(zahl(offen, /class="befehlsblock"/g), 0)
  assert.match(gestoppt({ offeneAenderungen: 0, voraus: 2 }), /Gestoppt; 2 Commits noch nicht auf main\. Sie bleiben beim Aufräumen auf dem Branch\./)
  assert.match(gestoppt({ offeneAenderungen: 0, voraus: 0 }), /Nichts offen — weiter mit Aufräumen\./)
  assert.match(gestoppt({ offeneAenderungen: null, voraus: null }), /Gestoppt — ob im Arbeitsordner noch etwas offen ist, ist nicht lesbar/)
  for (const s of [{ offeneAenderungen: 0, voraus: 0 }, { offeneAenderungen: null, voraus: null }]) assert.equal(zahl(gestoppt(s), /data-sichern-aufraeumen/g), 1)
})

test('200 nicht bestimmbar: derselbe Grundtext wie die 409, nennt node_modules als häufige Ursache (Advisor 2)', () => {
  const html = render(ok(antwort({ sichern: { bereit: false, art: null, grund: 'nichtBestimmbar', offeneAenderungen: null, voraus: null } })))
  assert.match(html, /lässt sich nicht bestimmen.*node_modules ohne Eintrag in \.gitignore/)
  assert.doesNotMatch(html, /class="fehler"/)
})

test('Aufräumen-Art aus derselben Regel wie der Knopf unter den Aktionen (Bauauflage 3); Workboard-Link ohne Kennung im Text', () => {
  const bereit = { status: 'BEREIT', pfad: AO.pfad, branch: AO.branch }
  assert.equal(aufraeumenArt({ workflowStatus: 'GESTOPPT', ao: bereit }), 'aktionen')
  assert.equal(aufraeumenArt({ workflowStatus: 'ABGESCHLOSSEN', ao: bereit, abnahmeOffen: false }), 'aktionen')
  assert.equal(aufraeumenArt({ workflowStatus: 'ABGESCHLOSSEN', ao: bereit, abnahmeOffen: true }), 'nachAbnahme')
  assert.equal(aufraeumenArt({ workflowStatus: 'ABGESCHLOSSEN', ao: { ...bereit, vorbereitungLaeuft: true } }), 'neutral')
  assert.match(render(ok(antwort()), 'nachAbnahme'), /Aufräumen erst nach deiner Abnahme/)
  const link = render(ok(antwort()), 'link')
  assert.match(link, /href="#\/workflows\/wf-geheim-4711">Aufräumen auf der Seite des Ablaufs<\/a>/)
  assert.equal(zahl(link, /data-sichern-aufraeumen/g), 1)
  assert.match(render(ok(antwort()), 'knopf'), /data-sichern-aufraeumen="neutral"/, 'die gestrichene Art knopf fällt auf neutral')
})

test('Sätze: Projektordner mit Link zu Code, nichts zu sichern, unbekannt mit Link auf den Ablauf; ablauf ⇒ leer', () => {
  assert.match(renderSichernSatz('projekt', ID), /Im Projektordner gearbeitet — Sichern über <a class="text-link" href="#\/code">Code<\/a>\./)
  assert.match(renderSichernSatz('keinBedarf', ID), /Schreibt keine Dateien — nichts zu sichern\./)
  const unbekannt = renderSichernSatz('unbekannt', ID)
  assert.match(unbekannt, /href="#\/workflows\/wf-geheim-4711">Seite des Ablaufs<\/a>/)
  assert.doesNotMatch(sichtbar(unbekannt), /wf-geheim/)
  assert.equal(renderSichernSatz('ablauf', ID), '')
})

test('Schritt 3 ohne origin: eigener Titel und Text, kein „Pull Request im Web“ (QA 6); mit origin die Grenze zu main (QA 3)', () => {
  const ohne = render(ok(antwort({ remoteWebUrl: { origin: false, url: null } })))
  assert.match(ohne, /Übernehmen ohne Remote/)
  assert.match(ohne, /Ohne Remote „origin“ gibt es keinen Pull Request im Web/)
  assert.doesNotMatch(ohne, /Pull Request anlegen und im Web mergen/)
  assert.equal(zahl(ohne, /data-sichern-aufraeumen/g), 1)
  const mit = render(ok(antwort({ sichern: { voraus: 2 } })))
  assert.match(mit, /Pull Request anlegen und im Web mergen/)
  assert.match(mit, /Nach Push und Merge steht hier weiter „noch nicht auf main“ — der Leitstand fragt origin nicht ab\. Nach dem Merge aufräumen\./)
})

test('Fehler eines älteren Servers nennt „Leitstand neu starten“ (QA 8)', () => {
  const html = render({ zustand: 'fehler', daten: null, fehler: 'älterer Serverprozess ohne Stand je Ablauf — Leitstand neu starten', geladenAm: 1 })
  assert.match(html, /class="fehler">[^<]*Leitstand neu starten/)
})

test('sichernFuerAblauf (Workboard und Ablaufseite): ablauf ⇒ Abruf mit Neuladen-Schlüssel und Abschnitt; projekt/keinBedarf/unbekannt ⇒ Satz ohne Abruf', () => {
  const aufrufe = []
  const stelle = (id, schluessel) => (aufrufe.push(`${id}|${schluessel}`), ok(antwort()))
  const detail = (ao) => ({ daten: { status: 'ABGESCHLOSSEN' }, arbeitsordner: ao, versionSequenz: 3 })
  const ablauf = sichernFuerAblauf({ workflowId: ID, detail: detail({ status: 'BEREIT', pfad: AO.pfad, branch: AO.branch }), aufraeumen: { art: 'link' }, stelle })
  assert.equal(ablauf.quelle, 'ablauf')
  assert.deepEqual(aufrufe, [`${ID}|ABGESCHLOSSEN|BEREIT|-|3`])
  assert.match(ablauf.html, /data-sichern-aufraeumen="link"/)
  for (const [ao, quelle, muster] of [
    [{ status: 'bestand' }, 'projekt', /Im Projektordner gearbeitet/],
    [{ status: 'kein_bedarf' }, 'keinBedarf', /nichts zu sichern/],
    [undefined, 'unbekannt', /nicht bekannt/],
  ]) {
    const e = sichernFuerAblauf({ workflowId: ID, detail: detail(ao), aufraeumen: { art: 'link' }, stelle })
    assert.equal(e.quelle, quelle)
    assert.match(e.html, muster)
  }
  assert.equal(aufrufe.length, 1, 'ohne eigenen Arbeitsordner kein Abruf')
})

test('behandleSichernKlick: Kopieren und Aktualisieren, sonst unbehandelt', () => {
  const ziel = (sel, dataset = {}) => ({ dataset, closest: (s) => (s === sel ? ziel(sel, dataset) : null) })
  const aufrufe = []
  const abh = { kopiere: async () => aufrufe.push('kopiere'), aktualisiere: async (id) => aufrufe.push(`neu:${id}`) }
  assert.equal(behandleSichernKlick({ target: ziel('[data-befehl-kopieren]') }, abh), true)
  assert.equal(behandleSichernKlick({ target: ziel('[data-sichern-aktualisieren]', { workflowId: 'w-1' }) }, abh), true)
  assert.equal(behandleSichernKlick({ target: ziel('[data-sichern-aktualisieren]', {}) }, abh), false)
  assert.equal(behandleSichernKlick({ target: ziel('.anderes') }, abh), false)
  assert.deepEqual(aufrufe, ['kopiere', 'neu:w-1'])
})
