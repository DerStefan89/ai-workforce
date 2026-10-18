/**
 * Datei: public/leitstand/rueckfrage-abnahme.test.mjs
 *
 * Zweck: node:test für rueckfrage-abnahme.js (F45 B2b-3b-2b-2a-3): Klassen der Abgleich-Codes (Drift gegen ABGLEICH_GRUENDE), Block mit
 * Zählung (B10-Beschriftung, bestätigte Ablehnungen, unbeantwortet, „keine Rückfrage“), Ursache statt Standardsatz nur bei Kanal-Klassen,
 * R3-Meldung escaped mit Masken; dazu die Einbindung in Lauf-Notiz, Sichtungs-Notiz, Startfehler-Liste und „Deine Entscheidungen“.
 * F45 B2b-3b-2b-2b-2b-2 (F-1145): Ursache je nicht_von_stefan aus der Zählung (Lauf B des Nachweislaufs ⇒ Regel), neutraler Text ohne
 * eindeutige Ursache, Überlauf der Protokollgrenze (gegen MAX_PROTOKOLL_JE_LAUF verankert) herausgerechnet und als Zusatz bei automatisch/echt;
 * F-1146: Grund jeder Klasse im Block (mitUrsache).
 *
 * Wird aufgerufen von: npm run check (node --test)
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ABGLEICH_GRUENDE } from '../../src/rueckfrage/protokoll.ts'
import { baueEntscheidungen } from './attention-daten.js'
import de from './i18n/de.js'
import en from './i18n/en.js'
import ru from './i18n/ru.js'
import tr from './i18n/tr.js'
import { MAX_PROTOKOLL_JE_LAUF } from '../../scripts/leitstand/rueckfrage-vermittlung.mjs'
import { ABGLEICH_KLASSE, automatischUrsache, KLASSEN_SCHLUESSEL, PROTOKOLL_GRENZE, PROTOKOLLGRENZE_SCHLUESSEL, protokollUeberlauf, URSACHE_SCHLUESSEL, abgleichKlasse, kanalUrsacheHtml, renderRueckfrageAbnahme, renderRueckfrageAbweichung } from './rueckfrage-abnahme.js'
import { renderLaufNotiz, renderStartfehlerListe } from './views/lauf-detail.js'
import { renderSichtungNotiz } from './views/workflow-eingriffe.js'

const NULL_ZAEHLUNG = { stefan_erlaubt: 0, stefan_abgelehnt: 0, frage_beantwortet: 0, nicht_browser: 0, abgelaufen: 0, lauf_ende: 0, automatisch: 0 }
const kanal = (feld = {}) => ({ ergebnis: 'VERWEIGERT', zaehlung: NULL_ZAEHLUNG, abgleich: null, abweichung: null, abgelehntDurchStefan: null, ...feld })

test('Drift: jeder Grund aus ABGLEICH_GRUENDE hat eine Klasse, jede Klasse literale Schlüssel in allen vier Sprachen', () => {
  assert.deepEqual(Object.keys(ABGLEICH_KLASSE).sort(), [...ABGLEICH_GRUENDE].sort())
  for (const schluessel of Object.values(KLASSEN_SCHLUESSEL).flatMap((s) => Object.values(s))) {
    for (const [sprache, woerter] of Object.entries({ de, en, tr, ru })) assert.equal(typeof woerter[schluessel], 'string', `${sprache}: ${schluessel}`)
  }
})

test('abgleichKlasse (Advisor V1/M6): echt, automatisch, nicht bestätigt, Protokoll, nicht geprüft, unbekannt', () => {
  assert.equal(abgleichKlasse(null), null)
  assert.equal(abgleichKlasse({ art: 'abgleich', grund: 'kein_eintrag' }), 'echt')
  assert.equal(abgleichKlasse({ art: 'kein_protokoll', grund: 'keine_rueckfrage_oder_nicht_lesbar' }), 'echt')
  assert.equal(abgleichKlasse({ art: 'abgleich', grund: 'nicht_von_stefan' }), 'automatisch')
  assert.equal(abgleichKlasse({ art: 'abgleich', grund: 'ablehnungstext_passt_nicht' }), 'nicht_bestaetigt')
  assert.equal(abgleichKlasse({ art: 'abgleich', grund: 'protokoll_fremd' }), 'protokoll')
  assert.equal(abgleichKlasse({ art: 'abweichung', grund: 'Länge abweichend' }), 'protokoll')
  assert.equal(abgleichKlasse({ art: 'nicht_geprueft', grund: 'umgehungsverdacht' }), 'nicht_geprueft')
  assert.equal(abgleichKlasse({ art: 'abgleich', grund: 'toString' }), 'unbekannt', 'geerbte Eigenschaft ist kein Code')
  assert.equal(abgleichKlasse({ art: '<x>', grund: 'y' }), 'unbekannt')
  assert.match(kanalUrsacheHtml(kanal({ abgleich: { art: 'unbekannt', grund: '' } })), /Unbekannter Grund/, 'qa 6: verformter Abgleich aus der Projektion')
})

test('kanalUrsacheHtml: ersetzt den Standardsatz nur bei Kanal-Klassen, „mindestens eine“, was tun, Code escaped', () => {
  assert.equal(kanalUrsacheHtml(null), '')
  assert.equal(kanalUrsacheHtml(kanal({ abgleich: { art: 'abgleich', grund: 'kein_eintrag' } })), '', 'echt ⇒ Standardsatz bleibt')
  assert.equal(kanalUrsacheHtml(kanal({ abgleich: { art: 'nicht_geprueft', grund: 'umgehungsverdacht' } })), '', 'E-186 nur im Block')
  const html = kanalUrsacheHtml(kanal({ abgleich: { art: 'abgleich', grund: 'ablehnungstext_passt_nicht' } }))
  assert.match(html, /Deine Ablehnung nicht bestätigt/)
  assert.match(html, /Mindestens eine Ablehnung/)
  assert.match(html, /Was tun:/)
  assert.match(html, /<code>ablehnungstext_passt_nicht<\/code>/)
  const fremd = kanalUrsacheHtml(kanal({ abgleich: { art: 'abgleich', grund: '<img src=x onerror=alert(1)>' } }))
  assert.match(fremd, /Unbekannter Grund/)
  assert.doesNotMatch(fremd, /<img/)
})

test('Block: ohne Kanal leer; alle 0 ⇒ „keine Rückfrage“; Zählung mit B10, bestätigt, unbeantwortet; Bestandsmarke ⇒ „nicht erfasst“', () => {
  assert.equal(renderRueckfrageAbnahme(null), '')
  assert.match(renderRueckfrageAbnahme(kanal({ ergebnis: 'ERFOLGREICH' })), /keine Rückfrage/)
  assert.match(renderRueckfrageAbnahme(kanal({ zaehlung: null })), /Zählung nicht lesbar/)
  const voll = renderRueckfrageAbnahme(kanal({ ergebnis: 'ERFOLGREICH', abgelehntDurchStefan: 2, zaehlung: { ...NULL_ZAEHLUNG, stefan_erlaubt: 1, stefan_abgelehnt: 3, nicht_browser: 1, abgelaufen: 2, lauf_ende: 1, automatisch: 4 } }))
  for (const text of ['Einmal erlaubt: 1', 'Abgelehnt: 3', 'davon nicht aus dem Browser: 1', 'auch Ablehnungen, die die Auswertung nicht bestätigt hat', 'als deine Ablehnung bestätigt: 2', 'Frist abgelaufen: 2', 'Beim Lauf-Ende abgelehnt: 1', 'Automatisch abgelehnt: 4']) assert.ok(voll.includes(text), text)
  assert.doesNotMatch(voll, /keine Rückfrage/)
  const nurAbgelaufen = renderRueckfrageAbnahme(kanal({ zaehlung: { ...NULL_ZAEHLUNG, abgelaufen: 1 } }))
  assert.doesNotMatch(nurAbgelaufen, /keine Rückfrage/, 'F-1132 (1): abgelaufene Rückfragen sehen nicht aus wie „Kanal nicht benutzt“')
  const alt = renderRueckfrageAbnahme(kanal({ zaehlung: { stefan_erlaubt: 1, stefan_abgelehnt: 0, frage_beantwortet: 0, nicht_browser: 0, abgelaufen: null, lauf_ende: null, automatisch: null } }))
  assert.equal(alt.match(/nicht erfasst/g).length, 3)
  assert.match(alt, /Frist abgelaufen: nicht erfasst/, 'kein doppelter Leerraum')
  const verweigert = renderRueckfrageAbnahme(kanal({ zaehlung: { ...NULL_ZAEHLUNG, stefan_abgelehnt: 1 }, abgleich: { art: 'nicht_geprueft', grund: 'umgehungsverdacht' } }))
  assert.match(verweigert, /bestätigt: keine — siehe Grund/, 'VERWEIGERT verweist auf den Grund')
  const timeout = renderRueckfrageAbnahme(kanal({ ergebnis: 'FEHLGESCHLAGEN', zaehlung: { ...NULL_ZAEHLUNG, stefan_abgelehnt: 1, lauf_ende: 1 } }))
  assert.match(timeout, /nicht ausgewertet/, 'code-reviewer 2: FEHLGESCHLAGEN ⇒ nicht ausgewertet statt „bestätigt: 0“')
  assert.doesNotMatch(timeout, /bestätigt: /)
  assert.match(verweigert, /Nicht geprüft — Umgehungsverdacht/, 'E-186 im Block')
  assert.match(renderRueckfrageAbnahme(kanal({ abgleich: { art: 'abgleich', grund: 'kein_eintrag' } })), /Echte Verweigerung/, 'echt im Block')
  assert.doesNotMatch(renderRueckfrageAbnahme(kanal({ abgleich: { art: 'abgleich', grund: 'nicht_von_stefan' } })), /kanal-grund/, 'Kanal-Klasse nicht doppelt (steht in der Notiz)')
})

test('R3: eigene rote Meldung, Grund escaped und täuschende Zeichen maskiert; im Block kein zweites Mal als Code', () => {
  assert.equal(renderRueckfrageAbweichung(null), '')
  const html = renderRueckfrageAbnahme(kanal({ abgleich: { art: 'abweichung', grund: 'x' }, abweichung: 'Länge abweichend <img src=x onerror=alert(1)>‮' }))
  assert.match(html, /note red rueckfrage-abweichung/)
  assert.match(html, /Fälschung, Schreibfehler/)
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/)
  assert.doesNotMatch(html, /<img/)
  assert.match(html, /⟦U\+202E⟧/)
  assert.doesNotMatch(html, /<code>x<\/code>/)
  assert.ok(html.indexOf('rueckfrage-abweichung') < html.indexOf('rueckfrage-abnahme'), 'design-guardian 2: R3 vor dem Zahlenblock')
  assert.match(html, /nicht offen/, 'qa 1: auch „Kanal für den Lauf nicht offen“ als mögliche Ursache')
  const notiz = kanalUrsacheHtml(kanal({ abgleich: { art: 'abweichung', grund: 'x' } }), { r3Darunter: true })
  assert.match(notiz, /Rückfrage-Protokoll unbrauchbar/)
  assert.doesNotMatch(notiz, /Was tun:/, 'design-guardian 3: im Lauf-Detail „was tun“ nur in der R3-Meldung')
  const sichtung = renderSichtungNotiz('wf', { schrittId: 's1', laufId: 'l', nachfolger: 's2', kanal: kanal({ abgleich: { art: 'abweichung', grund: 'x' } }) })
  assert.match(sichtung, /Was tun:/, 'code-reviewer Nachpass C: die Sichtung zeigt keine R3-Meldung und behält „was tun“')
})

test('Einbindung: Lauf-Notiz, Sichtungs-Notiz, Startfehler-Liste — ohne Kanal bitgleich', () => {
  const ls = { status: 'ABGESCHLOSSEN', ergebnis: 'VERWEIGERT' }
  const ohne = renderLaufNotiz('fehler', { laufStatus: ls })
  assert.equal(renderLaufNotiz('fehler', { laufStatus: ls, rueckfrageKanal: null }), ohne)
  assert.equal(renderLaufNotiz('fehler', { laufStatus: ls, rueckfrageKanal: kanal({ abgleich: { art: 'abgleich', grund: 'kein_eintrag' } }) }), ohne, 'echte Verweigerung ⇒ Standard')
  const mit = renderLaufNotiz('fehler', { laufStatus: ls, rueckfrageKanal: kanal({ abgleich: { art: 'abgleich', grund: 'nicht_von_stefan' } }) })
  assert.match(mit, /Der Kanal hat automatisch abgelehnt/)
  assert.doesNotMatch(mit, /Ursache in Klartext/)
  const fehlgeschlagen = renderLaufNotiz('fehler', { laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'FEHLGESCHLAGEN' }, rueckfrageKanal: kanal({ abgleich: { art: 'abgleich', grund: 'nicht_von_stefan' } }) })
  assert.match(fehlgeschlagen, /Ursache in Klartext/, 'nur VERWEIGERT')

  const sichtung = { schrittId: 's2', laufId: 'lauf-1', nachfolger: 's3' }
  const standard = renderSichtungNotiz('wf', sichtung)
  assert.equal(renderSichtungNotiz('wf', { ...sichtung, kanal: null }), standard)
  assert.equal(renderSichtungNotiz('wf', { ...sichtung, kanal: kanal({ abgleich: { art: 'kein_protokoll', grund: 'keine_rueckfrage_oder_nicht_lesbar' } }) }), standard)
  const kanalNotiz = renderSichtungNotiz('wf', { ...sichtung, kanal: kanal({ abgleich: { art: 'abgleich', grund: 'ablehnungstext_passt_nicht' } }) })
  assert.match(kanalNotiz, /wegen des Rückfrage-Kanals/)
  assert.doesNotMatch(kanalNotiz, /nur weil Befehle abgelehnt wurden/)
  assert.match(kanalNotiz, /data-aktion="sichtung-oeffnen"/, 'Knopf bleibt')

  const liste = renderStartfehlerListe([
    { zeitstempel: '2026-10-17T10:00:00Z', laufId: 'lauf-r3', fehler: 'Rückfrage-Protokoll … nicht bestätigt', art: 'rueckfrage_abweichung' },
    { zeitstempel: '2026-10-17T10:00:00Z', laufId: 'lauf-x', fehler: 'kaputt' },
  ])
  assert.equal(liste.match(/Protokoll-Abweichung/g).length, 1)
  assert.match(liste, /href="#\/runs\/lauf-r3"/)
  assert.match(liste, /kein Startproblem/)
})

test('„Deine Entscheidungen“: R3-Startfehler bleibt in der Gruppe, trägt abweichung und Link; andere unverändert', () => {
  const zustand = { laeufe: [], workflows: [], startfehler: [{ zeitstempel: 'z', laufId: 'lauf-r3', fehler: 'f', art: 'rueckfrage_abweichung' }, { zeitstempel: 'z', laufId: 'lauf-x', fehler: 'f' }] }
  const { eintraege } = baueEntscheidungen(zustand, [])
  const r3 = eintraege.find((e) => e.id === 'lauf-r3')
  const anderer = eintraege.find((e) => e.id === 'lauf-x')
  assert.equal(r3.art, 'startproblem')
  assert.equal(r3.abweichung, true)
  assert.equal(r3.hash, '#/runs/lauf-r3')
  assert.equal(anderer.hash, null)
  assert.equal('abweichung' in anderer, false, 'bisherige Einträge bitgleich')
})

/** Zählung von Lauf B des Nachweislaufs (features/F45/nachweise/b2b3b2b2b/auswertung-haushaltsbuch2-b-…md, P9: automatisch 1). */
const LAUF_B = { ergebnis: 'VERWEIGERT', zaehlung: { ...NULL_ZAEHLUNG, automatisch: 1 }, abgleich: { art: 'abgleich', grund: 'nicht_von_stefan' }, abweichung: null, abgelehntDurchStefan: null }

test('F-1145: Ursache aus der Zählung — Regel oder Frist; Lauf-Ende und Überlauf sind nie die Ursache; sonst unbestimmt', () => {
  assert.equal(PROTOKOLL_GRENZE, MAX_PROTOKOLL_JE_LAUF, 'Grenze der Oberfläche = Grenze der Vermittlung')
  assert.equal(automatischUrsache(LAUF_B.zaehlung), 'regel', 'Lauf B: Pfadgrenze, automatisch 1')
  assert.equal(automatischUrsache({ ...NULL_ZAEHLUNG, abgelaufen: 2 }), 'frist')
  // code-reviewer Nachpass 1: lauf_ende zählt beim Lesen nur offene Rückfragen ohne Eintrag (vor beendeLauf) — nie Ursache von nicht_von_stefan.
  assert.equal(automatischUrsache({ ...NULL_ZAEHLUNG, lauf_ende: 1, stefan_erlaubt: 3 }), 'unbestimmt', 'nur lauf_ende ⇒ unbestimmt, nicht „Lauf-Ende“')
  assert.equal(automatischUrsache({ ...NULL_ZAEHLUNG, lauf_ende: 1, automatisch: 1 }), 'regel', 'lauf_ende verdeckt die Regel nicht')
  assert.equal(automatischUrsache({ ...NULL_ZAEHLUNG, lauf_ende: 2, abgelaufen: 1 }), 'frist')
  // code-reviewer 1: eine Ablehnung über der Grenze hat keinen Eintrag (Abgleich kein_eintrag) — sie ist nie die Ursache von nicht_von_stefan.
  assert.equal(protokollUeberlauf({ ...NULL_ZAEHLUNG, stefan_erlaubt: 150, abgelaufen: 50, automatisch: 1 }), 1)
  assert.equal(automatischUrsache({ ...NULL_ZAEHLUNG, stefan_erlaubt: 150, abgelaufen: 50, automatisch: 1 }), 'frist', 'die eine automatische Ablehnung ist der Überlauf ⇒ Frist')
  assert.equal(automatischUrsache({ ...NULL_ZAEHLUNG, stefan_erlaubt: 150, automatisch: 52 }), 'regel', 'nach Abzug des Überlaufs bleiben Regel-Ablehnungen')
  assert.equal(protokollUeberlauf({ ...NULL_ZAEHLUNG, stefan_erlaubt: 200 }), 0, 'genau an der Grenze kein Überlauf')
  assert.equal(protokollUeberlauf({ ...NULL_ZAEHLUNG, abgelaufen: null }), null)
  assert.equal(automatischUrsache({ ...NULL_ZAEHLUNG, stefan_erlaubt: 149, abgelaufen: 50, automatisch: 1 }), 'unbestimmt', 'genau an der Grenze ist nichts übergelaufen; zwei Felder ⇒ unbestimmt')
  assert.equal(automatischUrsache({ ...NULL_ZAEHLUNG, automatisch: 1, abgelaufen: 1 }), 'unbestimmt')
  assert.equal(automatischUrsache(NULL_ZAEHLUNG), 'unbestimmt')
  assert.equal(automatischUrsache(null), 'unbestimmt')
  assert.equal(automatischUrsache({ ...NULL_ZAEHLUNG, automatisch: 1, abgelaufen: null }), 'unbestimmt', 'Bestandsmarke ohne die neuen Felder')
  for (const schluessel of [...Object.values(URSACHE_SCHLUESSEL).flatMap((s) => Object.values(s)), ...Object.values(PROTOKOLLGRENZE_SCHLUESSEL)]) {
    for (const [sprache, woerter] of Object.entries({ de, en, tr, ru })) assert.equal(typeof woerter[schluessel], 'string', `${sprache}: ${schluessel}`)
  }
})

test('F-1145: Lauf B bekommt den Regel-Text in Lauf-Notiz und Sichtung — nicht „Frist“ und nicht „rechtzeitig sichtbar“', () => {
  const ursache = kanalUrsacheHtml(LAUF_B)
  assert.match(ursache, /Der Kanal hat automatisch abgelehnt/)
  assert.match(ursache, /nach einer festen Regel selbst abgelehnt/)
  assert.match(ursache, /außerhalb des Arbeitsordners/)
  assert.match(ursache, /Du hast nichts versäumt/)
  assert.doesNotMatch(ursache, /Frist|rechtzeitig/)
  const sichtung = renderSichtungNotiz('wf', { schrittId: 's1', laufId: 'lauf-b', nachfolger: 's2', kanal: LAUF_B })
  assert.match(sichtung, /nach einer festen Regel selbst abgelehnt/)
  assert.doesNotMatch(sichtung, /innerhalb der Frist antworten/)
  assert.match(kanalUrsacheHtml({ ...LAUF_B, zaehlung: { ...NULL_ZAEHLUNG, abgelaufen: 1 } }), /bis die Wartefrist ablief[\s\S]*innerhalb der Frist antworten/)
  const laufEnde = kanalUrsacheHtml({ ...LAUF_B, zaehlung: { ...NULL_ZAEHLUNG, automatisch: 1, lauf_ende: 1 } })
  assert.match(laufEnde, /nach einer festen Regel selbst abgelehnt[\s\S]*kanal-lauf-ende">Mindestens eine Rückfrage an dich war noch offen, als der Lauf endete[\s\S]*warum der Lauf vorher endete/, 'Lauf-Ende als Zusatz')
  assert.doesNotMatch(kanalUrsacheHtml(LAUF_B), /kanal-lauf-ende/)
  assert.match(renderRueckfrageAbnahme({ ...LAUF_B, abgleich: { art: 'abgleich', grund: 'kein_eintrag' }, zaehlung: { ...NULL_ZAEHLUNG, lauf_ende: 1 } }), /Echte Verweigerung[\s\S]*kanal-lauf-ende/, 'kein_eintrag mit offenen Rückfragen beim Lauf-Ende: Zusatz im Block')
  const ueber = kanalUrsacheHtml({ ...LAUF_B, zaehlung: { ...NULL_ZAEHLUNG, automatisch: 201 } })
  assert.match(ueber, /nach einer festen Regel selbst abgelehnt[\s\S]*kanal-grenze">Der Lauf hat mehr Anfragen gestellt[\s\S]*höchstens 200 Einträge[\s\S]*Auftrag kleiner schneiden/, 'Regel als Ursache, Protokollgrenze als Zusatz')
  assert.doesNotMatch(kanalUrsacheHtml(LAUF_B), /kanal-grenze/, 'ohne Überlauf kein Zusatz')
  const echt = renderRueckfrageAbnahme({ ...LAUF_B, abgleich: { art: 'abgleich', grund: 'kein_eintrag' }, zaehlung: { ...NULL_ZAEHLUNG, stefan_erlaubt: 200, automatisch: 3 } })
  assert.match(echt, /Echte Verweigerung[\s\S]*kanal-grenze">Der Lauf hat mehr Anfragen gestellt/, 'kein_eintrag nach Überlauf: Zusatz im Block')
})

test('F-1145: ohne eindeutige Ursache ein neutraler Text, der Regel und Frist nennt', () => {
  for (const zaehlung of [null, { ...NULL_ZAEHLUNG, automatisch: 1, abgelaufen: 1 }]) {
    const html = kanalUrsacheHtml({ ...LAUF_B, zaehlung })
    assert.match(html, /nach einer festen Regel \(z\. B\. Pfadgrenze\) oder weil eine Rückfrage an dich bis zum Ablauf der Frist unbeantwortet blieb/)
    assert.match(html, /nicht eindeutig bestimmen/)
    assert.match(html, /Unter „Unbeantwortet“ nachsehen \(im Block „Rückfrage-Kanal im Lauf“, auch im Lauf-Detail\)[\s\S]*„Automatisch abgelehnt“[\s\S]*„Frist abgelaufen“[\s\S]*Rohstrom/, 'qa 6: sagt, wo die Zählung steht')
    // qa Nachpass 1: die zitierten Bezeichnungen stehen wörtlich so auf der Seite (alle vier Sprachen).
    for (const woerter of [de, en, tr, ru]) {
      const rat = woerter['abnahme.kanal.klasse.automatisch.wasTun']
      for (const schluessel of ['abnahme.kanal.unbeantwortet', 'abnahme.kanal.titel', 'abnahme.kanal.automatisch', 'abnahme.kanal.abgelaufen']) assert.ok(rat.includes(woerter[schluessel].replace(': {n}', '')), `${schluessel}: ${rat}`)
    }
  }
})

test('F-1146: Block mit Grund jeder Klasse (mitUrsache) — ohne Option bleibt das Lauf-Detail unverändert', () => {
  const ohne = renderRueckfrageAbnahme(LAUF_B)
  assert.doesNotMatch(ohne, /kanal-grund/, 'Lauf-Detail: der Grund steht in der Fehler-Notiz')
  const mit = renderRueckfrageAbnahme(LAUF_B, { mitUrsache: true })
  assert.match(mit, /Automatisch abgelehnt: 1/)
  assert.ok(mit.indexOf('<strong>Auswertung</strong>') < mit.indexOf('<strong>Antworten</strong>'), 'design-guardian Nachpass 2: auf der Abnahmeseite der Grund vor der Zählung')
  assert.ok(ohne.indexOf('Antworten') >= 0 && !ohne.includes('kanal-grund'), 'Lauf-Detail unverändert')
  assert.match(mit, /<strong>Auswertung<\/strong>[\s\S]*nach einer festen Regel selbst abgelehnt[\s\S]*Was tun:/)
  const r3 = renderRueckfrageAbnahme({ ...LAUF_B, abgleich: { art: 'abweichung', grund: 'x' }, abweichung: 'Länge abweichend' }, { mitUrsache: true })
  assert.equal(r3.match(/Was tun:/g).length, 1, 'R3 direkt darüber trägt „was tun“ allein')
  assert.equal(renderRueckfrageAbnahme({ ...LAUF_B, abgleich: null, ergebnis: 'ERFOLGREICH' }, { mitUrsache: true }).includes('kanal-grund'), false, 'ohne Abgleich kein Grund')
})
