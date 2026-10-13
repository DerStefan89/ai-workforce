/**
 * Datei: public/leitstand/faehigkeiten-projekt-anzeige.test.mjs
 *
 * Zweck: F45 F-2a (F-1012 Oberfläche, F-1054, F-1055 (1)) — Anzeigeregeln des Bereichs „Dieses Projekt“: Gruppen MCPs ·
 * Skills (Katalog) · Projekt-Skills · Projekt-Agents mit Standard-Satz, Spalten installiert/aktiv/im letzten Lauf
 * (Aufrufe, Fehler), Schalter (role=switch, Ziel umgekehrt), Sperre während eines Laufs und bei ungültiger Datei (mit
 * Grund), „Inhalt weicht ab“ mit „Freigeben nach Inhalt“ (Pfad, Hash gekürzt, Knopf trägt den vollen angezeigten
 * Hash), Bänder (ungültig, außerhalb geändert, Hindernis), leer, nicht installiert, Meldung, Escaping.
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { baenderHtml, freigabeStand, gruppiereFaehigkeiten, letzterLaufHtml, renderFaehigkeitenProjekt, renderFaehigkeitenProjektZustand, sperreFuer } from './faehigkeiten-projekt-anzeige.js'

const H = 'a'.repeat(64)
const katalog = (teil) => ({ id: 'playwright-mcp', name: 'Playwright', typ: 'mcp', quelle: 'katalog', beschreibung: 'Browser steuern', installiert: true, freigabe: 'FREIGEGEBEN', eingeschaltet: true, aktiv: true, grund: null, letzter_lauf: { im_lauf: 'aktiv', benutzt: true, aufrufe: 3, fehler: 1 }, ...teil })
const projekt = (teil) => ({ id: 'agent:qa', name: 'qa', typ: 'agent', quelle: 'projekt', beschreibung: 'Prüft Features', pfad: '.claude/agents/qa.md', installiert: true, freigabe: 'katalog', hash: H, katalog_hash: H, eingeschaltet: false, aktiv: false, grund: 'nicht eingeschaltet (Opt-in je Projekt, E-F45-6)', letzter_lauf: { im_lauf: 'nicht_im_lauf', benutzt: false }, ...teil })
const status = (teil) => ({ projekt_id: 'p', lokale_datei: { zustand: 'gueltig', pfad: '/home/x/.ai-workforce/faehigkeiten.lokal.json', fremd_geaendert: null }, lauf_aktiv: { aktiv: false }, letzter_lauf_id: 'lauf-1', hindernis: null, eintraege: [katalog(), katalog({ id: 'frontend-design', name: 'Frontend', typ: 'skill' }), projekt(), projekt({ id: 'skill:ponytail', name: 'ponytail', typ: 'skill', pfad: '.claude/skills/ponytail' }), katalog({ id: 'github-mcp', installiert: false, freigabe: 'OFFEN', aktiv: false, grund: 'freigabe OFFEN' })], ...teil })

test('gruppiereFaehigkeiten: vier Gruppen, nicht installierte Katalog-Einträge getrennt, Nicht-Objekte fallen weg', () => {
  const g = gruppiereFaehigkeiten([...status().eintraege, null, 'x'])
  assert.deepEqual(g.mcp.map((e) => e.id), ['playwright-mcp'])
  assert.deepEqual(g.skillKatalog.map((e) => e.id), ['frontend-design'])
  assert.deepEqual(g.projektAgent.map((e) => e.id), ['agent:qa'])
  assert.deepEqual(g.projektSkill.map((e) => e.id), ['skill:ponytail'])
  assert.deepEqual(g.nichtInstalliert.map((e) => e.id), ['github-mcp'])
  assert.deepEqual(gruppiereFaehigkeiten(undefined).mcp, [])
})

test('Default: Gruppen mit Standard-Satz, Spalten, Schalter mit umgekehrtem Ziel, Aufrufe/Fehler, „wirkt ab dem nächsten Lauf“', () => {
  const html = renderFaehigkeitenProjekt(status())
  assert.match(html, /MCPs und installierte Skills: an, bis du sie ausschaltest\./)
  assert.match(html, /Projekt-Agents und -Skills: aus, bis du sie einschaltest\./)
  assert.match(html, /Änderungen wirken ab dem nächsten Lauf\./)
  assert.match(html, /Im letzten Lauf/)
  assert.match(html, /data-fp-schalter="playwright-mcp" data-fp-ziel="false"/, 'an → Ziel aus')
  assert.match(html, /data-fp-schalter="agent:qa" data-fp-ziel="true"/, 'aus → Ziel an')
  assert.match(html, /role="switch" aria-checked="true"/)
  assert.match(html, /3 Aufrufe/)
  assert.match(html, /1 mit Fehler/)
  assert.match(html, /Browser steuern/)
  assert.match(html, /Nicht installiert \(1\)/)
  assert.doesNotMatch(html, /data-fp-schalter="github-mcp"/, 'nicht installiert: kein Schalter')
  assert.doesNotMatch(html, / disabled/, 'ohne Lauf und mit gültiger Datei nichts gesperrt')
  assert.match(html, /<code>lauf-1<\/code>/)
})

test('Lauf aktiv: alle Schalter gesperrt mit Grund (aria-describedby), Band mit Grund des Servers', () => {
  const s = status({ lauf_aktiv: { aktiv: true, grund: "ein Lauf ('lauf-x') ist aktiv" } })
  assert.equal(sperreFuer(s), 'lauf')
  const html = renderFaehigkeitenProjekt(s)
  assert.match(html, /data-fp-band="lauf" id="fp-sperre-lauf"/)
  assert.match(html, /Schalter gesperrt, solange ein Lauf aktiv ist\./)
  assert.match(html, /ein Lauf \(&#39;lauf-x&#39;\) ist aktiv/)
  const schalter = html.match(/<button type="button" class="fp-schalter"[^>]*>/g)
  assert.equal(schalter.length, 4)
  for (const knopf of schalter) assert.match(knopf, /disabled aria-describedby="fp-sperre-lauf"/)
})

test('ungültige Datei: rotes Band mit Pfad und Grund, Satz „Kein Lauf mit Fähigkeiten startet …“, Schalter gesperrt (vor Lauf)', () => {
  const s = status({ lokale_datei: { zustand: 'ungueltig', pfad: '/h/faehigkeiten.lokal.json', grund: "'/h/faehigkeiten.lokal.json' ist kein gültiges JSON <x>", fremd_geaendert: null }, lauf_aktiv: { aktiv: true, grund: 'x' } })
  assert.equal(sperreFuer(s), 'datei', 'Datei vor Lauf')
  const html = renderFaehigkeitenProjekt(s)
  assert.match(html, /class="note red fp-band" data-fp-band="ungueltig"/)
  assert.match(html, /kein gültiges JSON &lt;x&gt;/)
  assert.match(html, /disabled aria-describedby="fp-sperre-datei"/)
})

test('Inhalt weicht ab: Status, „Freigeben nach Inhalt“; offen → Pfad, Hash gekürzt, Knopf trägt den vollen angezeigten Hash', () => {
  const abw = projekt({ freigabe: 'abweichend', hash: 'b'.repeat(64), grund: 'Inhalt weicht von der Freigabe ab (Datei bbbbbbbbbbbb…, Katalog aaaaaaaaaaaa…)' })
  assert.equal(freigabeStand(abw), 'abweichend')
  assert.equal(freigabeStand(katalog()), null)
  const s = status({ eintraege: [abw] })
  const zu = renderFaehigkeitenProjekt(s)
  assert.match(zu, /Inhalt weicht von der Freigabe ab<\/span>/)
  assert.match(zu, /data-fp-freigabe-oeffnen="agent:qa"/)
  assert.doesNotMatch(zu, /data-fp-freigabe-bestaetigen/)
  const offen = renderFaehigkeitenProjekt(s, { offeneFreigabe: 'agent:qa' })
  assert.match(offen, /<code>\.claude\/agents\/qa\.md<\/code>/)
  assert.match(offen, /<code title="b{64}">b{12}…<\/code>/)
  assert.match(offen, /data-fp-freigabe-bestaetigen="agent:qa" data-fp-hash="b{64}"/)
  assert.match(offen, /Freigegeben wird genau dieser Inhalt\./)
  assert.doesNotMatch(offen, /data-fp-freigabe-oeffnen/, 'offen: kein zweiter Öffnen-Knopf')
  // „keine Freigabe“ bietet denselben Weg an; freigegebene Einträge nicht.
  assert.match(renderFaehigkeitenProjekt(status({ eintraege: [projekt({ freigabe: 'keine', katalog_hash: null })] })), /data-fp-freigabe-oeffnen="agent:qa"/)
  assert.doesNotMatch(renderFaehigkeitenProjekt(status({ eintraege: [projekt()] })), /data-fp-freigabe-oeffnen/)
})

test('außerhalb geändert (F-1055 (1)): gelbes Band mit Zeitpunkt und Quelle; Hindernis als eigenes Band', () => {
  const html = baenderHtml(status({ lokale_datei: { zustand: 'gueltig', pfad: '/h/f.json', fremd_geaendert: { bekannt_seit: '2026-10-12T08:00:00.000Z', quelle: 'route', geaendert_am: '2026-10-12T09:30:00.000Z' } }, hindernis: "Agent-Name 'qa' mehrdeutig" }))
  assert.match(html, /data-fp-band="fremd"/)
  assert.match(html, /Außerhalb des Leitstands geändert — Läufe mit Fähigkeiten gesperrt\./)
  assert.match(html, /zuletzt über diese Seite geschrieben/)
  assert.match(html, /<code>\/h\/f\.json<\/code> wurde nicht über diese Seite geändert \(Änderung: .+2026/)
  assert.match(html, /data-fp-band="hindernis"/)
  assert.match(html, /mehrdeutig/)
  const ohneZeit = baenderHtml(status({ lokale_datei: { zustand: 'fehlt', pfad: '/h/f.json', fremd_geaendert: { bekannt_seit: '2026-10-12T08:00:00.000Z', quelle: 'serverstart', geaendert_am: null } } }))
  assert.match(ohneZeit, /Zeitpunkt unbekannt, Datei fehlt/)
  assert.equal(baenderHtml(status()), '')
})

test('leer, laden, Fehler, Meldung; Escaping von Serverwerten', () => {
  assert.match(renderFaehigkeitenProjekt(status({ eintraege: [] })), /Dieses Projekt hat keine Fähigkeiten/)
  assert.match(renderFaehigkeitenProjektZustand('laedt'), /werden geladen/)
  assert.match(renderFaehigkeitenProjektZustand('fehler', '500 <b>'), /500 &lt;b&gt;/)
  assert.match(renderFaehigkeitenProjekt(status(), { meldung: { art: 'fehler', text: 'Nicht freigegeben — x' } }), /class="note red fp-meldung" tabindex="-1"/)
  assert.doesNotMatch(renderFaehigkeitenProjekt(status(), { meldung: { art: 'ok', text: 'x' } }), /role="status"/, 'keine zweite Live-Region (design-guardian 2)')
  const boese = renderFaehigkeitenProjekt(status({ eintraege: [projekt({ name: '<img onerror=x>', beschreibung: '"><script>' })] }))
  assert.doesNotMatch(boese, /<img onerror|<script>/)
})

test('letzterLaufHtml: aktiv ohne Beobachtung, nicht aktiv, nicht im Lauf, ohne Erfassung', () => {
  assert.match(letzterLaufHtml({ im_lauf: 'aktiv', benutzt: null, aufrufe: null, fehler: null }), /aktiv, nicht beobachtet/)
  assert.match(letzterLaufHtml({ im_lauf: 'aktiv', benutzt: false, aufrufe: 0, fehler: 0 }), /aktiv, nicht benutzt/)
  assert.match(letzterLaufHtml({ im_lauf: 'nicht_aktiv', benutzt: false }), /im Lauf aus/)
  assert.match(letzterLaufHtml({ im_lauf: 'nicht_im_lauf', benutzt: false }), /nicht im Lauf/)
  assert.match(letzterLaufHtml({ im_lauf: 'ohne_erfassung', benutzt: null }), /nicht erfasst/)
  assert.match(letzterLaufHtml(undefined), /nicht erfasst/)
})

test('QA 2: eingeschaltet, aber nicht aktiv → roter Chip und Band; im Ordner fehlend → „fehlt“ statt „abweichend“, kein Freigabe-Knopf', () => {
  const s = status({ eintraege: [projekt({ eingeschaltet: true, freigabe: 'abweichend', hash: 'b'.repeat(64) }), projekt({ id: 'agent:weg', name: 'weg', pfad: null, installiert: false, freigabe: 'fehlt', hash: undefined, eingeschaltet: true, grund: 'eingeschaltet, aber im Ordner nicht vorhanden' })] })
  const html = renderFaehigkeitenProjekt(s)
  assert.match(html, /data-fp-band="nicht-aktiv"/)
  assert.match(html, /<code>agent:qa<\/code>, <code>agent:weg<\/code> — solange das so ist, startet kein Lauf mit Fähigkeiten/)
  assert.equal((html.match(/eingeschaltet, nicht aktiv/g) ?? []).length, 2)
  assert.equal(freigabeStand(s.eintraege[1]), 'fehlt')
  assert.doesNotMatch(html, /data-fp-freigabe-oeffnen="agent:weg"/)
  assert.match(html, /data-fp-freigabe-oeffnen="agent:qa"/)
  assert.match(renderFaehigkeitenProjekt(status({ eintraege: [projekt({ id: 'agent:weg', installiert: false, freigabe: 'fehlt', eingeschaltet: false, hash: undefined })] })), /fehlt im Projektordner/)
})

test('Plural: 1 Aufruf, 3 Aufrufe', () => {
  assert.match(letzterLaufHtml({ im_lauf: 'aktiv', benutzt: true, aufrufe: 1, fehler: 0 }), /1 Aufruf</)
  assert.match(letzterLaufHtml({ im_lauf: 'aktiv', benutzt: true, aufrufe: 3, fehler: 0 }), /3 Aufrufe</)
})

test('F-1061 (3): unbestätigte Änderung von außen → rotes Band mit „Datei geprüft – Stand übernehmen“ (trägt den angezeigten Stand), alle Schalter gesperrt', () => {
  const s = status({ lokale_datei: { zustand: 'gueltig', pfad: '/h/f.json', hash: 'f'.repeat(64), fremd_geaendert: { bekannt_seit: '2026-10-12T08:00:00.000Z', quelle: 'bestaetigt', geaendert_am: '2026-10-12T09:00:00.000Z' } } })
  assert.equal(sperreFuer(s), 'fremd')
  const html = renderFaehigkeitenProjekt(s)
  assert.match(html, /class="note red fp-band" data-fp-band="fremd" data-fp-quelle="bestaetigt"><strong id="fp-sperre-fremd">/)
  assert.match(html, /Läufe mit Fähigkeiten gesperrt/)
  assert.match(html, /zuletzt hier bestätigt/)
  assert.match(html, /data-fp-bestaetigen="f{64}">Datei geprüft – Stand übernehmen</)
  for (const knopf of html.match(/<button type="button" class="fp-schalter"[^>]*>/g)) assert.match(knopf, /disabled aria-describedby="fp-sperre-fremd"/)
  // Während eines Laufs ist auch der Bestätigungsknopf gesperrt (Laufsperre der Route).
  const imLauf = renderFaehigkeitenProjekt({ ...s, lauf_aktiv: { aktiv: true, grund: 'x' } })
  assert.match(imLauf, /data-fp-bestaetigen="f{64}" disabled aria-describedby="fp-sperre-lauf"/)
})

test('design-guardian A: während ein POST läuft, ist auch „Datei geprüft – Stand übernehmen“ gesperrt (kein Doppelklick)', () => {
  const s = status({ lokale_datei: { zustand: 'gueltig', pfad: '/h/f.json', hash: 'f'.repeat(64), fremd_geaendert: { bekannt_seit: '2026-10-12T08:00:00.000Z', quelle: 'route', geaendert_am: null } } })
  const html = renderFaehigkeitenProjekt(s, { beschaeftigt: true })
  assert.match(html, /data-fp-bestaetigen="f{64}" disabled aria-describedby="fp-sperre-beschaeftigt"/)
  assert.match(html, /id="fp-sperre-beschaeftigt"/)
  assert.doesNotMatch(renderFaehigkeitenProjekt(s), /data-fp-bestaetigen="f{64}" disabled/)
})

test('baenderHtml (F45 F-2b-2c, F-1061 (1)): neustart nennt den Stand vor dem Neustart; unbekannt eigener Titel ohne „bekannt seit“', () => {
  const neustart = baenderHtml(status({ lokale_datei: { zustand: 'gueltig', pfad: '/h/f.json', hash: 'f'.repeat(64), fremd_geaendert: { bekannt_seit: '2026-10-12T08:00:00.000Z', quelle: 'neustart', geaendert_am: '2026-10-12T09:00:00.000Z' } } }))
  assert.match(neustart, /Außerhalb des Leitstands geändert[^]*Stand vor dem letzten Neustart des Leitstands/)
  const unbekannt = baenderHtml(status({ lokale_datei: { zustand: 'gueltig', pfad: '/h/f.json', hash: 'f'.repeat(64), fremd_geaendert: { bekannt_seit: null, quelle: 'unbekannt', geaendert_am: '2026-10-12T09:00:00.000Z' } } }))
  assert.match(unbekannt, /data-fp-quelle="unbekannt"/)
  assert.doesNotMatch(unbekannt, /Außerhalb des Leitstands geändert|bekannter Stand seit/)
  assert.match(unbekannt, /data-fp-bestaetigen="f{64}"/, 'Bestätigen bleibt der Weg')
})
