/**
 * Datei: public/leitstand/roadmap-anzeige.test.mjs
 *
 * Zweck: node:test für die reinen Roadmap-Anzeigeregeln (roadmap-anzeige.js, F44 WS-2a):
 * Anzeigezustand (F-854: ein Serverfehler ist nie „keine Roadmap“), aktueller Meilenstein,
 * Zähler, Statuskategorie, offene/eingeklappte Meilensteine und „Noch nicht eingeplant“; seit F45 B5b-2a
 * der Gantt (Achse, Spur, Zeilen, Gruppen, Aufklappen) und die Kennzahlen „Bis <M> fertig“ und „Plan gegen Ist“.
 *
 * Wird aufgerufen von: npm run check (node --test)
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  aktuellerMeilenstein,
  aufklappbareSchluessel,
  baueAchse,
  baueSpur,
  bisFertig,
  featuresAbgenommen,
  ganttZeilen,
  gewaehlteZeile,
  IST_BREITE,
  MASSSTAB_PX,
  meilensteinOffen,
  nichtEingeplant,
  planGegenIst,
  roadmapZustand,
  STATUS_KATEGORIEN,
  STATUS_SYMBOL,
  statusKategorie,
  waehleEntwicklungsstand,
  zaehleGeplant,
  zaehleMeilenstein,
  zeilenSchluessel,
  zeitachseVon,
} from './roadmap-anzeige.js'

/** Baut eine gültige Projektion aus [id, status, features[]]-Tripeln. */
function roadmap(...meilensteine) {
  return { status: 'ok', vision: 'v', meilensteine: meilensteine.map(([id, status, features = []]) => ({ id, titel: `Titel ${id}`, status, features })) }
}

test('roadmapZustand: drei Fachergebnisse, alles andere ist Fehler (F-854)', () => {
  assert.equal(roadmapZustand(null), 'laedt')
  assert.equal(roadmapZustand({ status: 'nicht_vorhanden' }), 'nicht_vorhanden')
  assert.equal(roadmapZustand({ status: 'ungueltig', fehler: ['x'] }), 'ungueltig')
  assert.equal(roadmapZustand(roadmap(['M1', 'GEPLANT'])), 'ok')
  assert.equal(roadmapZustand({ status: 'fehler' }), 'fehler')
  // Ein 404/500-Körper ohne bekannten status darf nie als leer oder ok gelten.
  assert.equal(roadmapZustand({ grund: "Unbekanntes Projekt 'x'" }), 'fehler')
  assert.equal(roadmapZustand({ status: 'ungueltig' }), 'fehler')
  assert.equal(roadmapZustand({ status: 'ok', meilensteine: [{ id: 'M1' }] }), 'fehler')
  assert.equal(roadmapZustand('text'), 'fehler')
})

test('aktuellerMeilenstein: erster LAEUFT, sonst erster nicht abgeschlossener, sonst null', () => {
  assert.equal(aktuellerMeilenstein(roadmap(['M1', 'ABGESCHLOSSEN'], ['M2', 'GEPLANT'], ['M3', 'LAEUFT'])).id, 'M3')
  assert.equal(aktuellerMeilenstein(roadmap(['M1', 'ABGESCHLOSSEN'], ['M2', 'GEPLANT'], ['M3', 'GEPLANT'])).id, 'M2')
  assert.equal(aktuellerMeilenstein(roadmap(['M1', 'ABGESCHLOSSEN'])), null)
  assert.equal(aktuellerMeilenstein({ status: 'nicht_vorhanden' }), null)
  assert.equal(aktuellerMeilenstein(null), null)
})

test('zaehleMeilenstein: abgenommen = ABGESCHLOSSEN, gesamt inklusive keine_akte', () => {
  const m = { features: [{ id: 'F1', status: 'ABGESCHLOSSEN' }, { id: 'F2', status: 'IN_ARBEIT' }, { id: 'F3', status: 'keine_akte' }] }
  assert.deepEqual(zaehleMeilenstein(m), { abgenommen: 1, gesamt: 3 })
  assert.deepEqual(zaehleMeilenstein({ features: [] }), { abgenommen: 0, gesamt: 0 })
  assert.deepEqual(zaehleMeilenstein(undefined), { abgenommen: 0, gesamt: 0 })
})

test('statusKategorie: bekannte Werte je Kategorie, Unbekanntes → unbekannt', () => {
  assert.equal(statusKategorie('ABGESCHLOSSEN'), 'abgenommen')
  assert.equal(statusKategorie('FEATURE_GATE'), 'freigabe')
  assert.equal(statusKategorie('LAEUFT'), 'in_arbeit')
  assert.equal(statusKategorie('IN_ARBEIT'), 'in_arbeit')
  assert.equal(statusKategorie('BLOCKIERT'), 'klaerung')
  assert.equal(statusKategorie('ENTWURF'), 'geplant')
  assert.equal(statusKategorie('GEPLANT'), 'geplant')
  assert.equal(statusKategorie('ABGEBROCHEN'), 'abgebrochen')
  assert.equal(statusKategorie('keine_akte'), 'ohne_akte')
  assert.equal(statusKategorie('UNBEKANNT'), 'unbekannt')
  assert.equal(statusKategorie('toString'), 'unbekannt')
  assert.equal(statusKategorie(undefined), 'unbekannt')
  for (const kategorie of ['abgenommen', 'freigabe', 'in_arbeit', 'klaerung', 'geplant', 'abgebrochen', 'ohne_akte', 'unbekannt']) assert.ok(STATUS_KATEGORIEN.includes(kategorie))
})

test('meilensteinOffen: abgeschlossene vor dem aktuellen eingeklappt, aktueller und spätere offen', () => {
  const r = roadmap(['M1', 'ABGESCHLOSSEN'], ['M2', 'LAEUFT'], ['M3', 'GEPLANT'], ['M4', 'ABGESCHLOSSEN'])
  const [m1, m2, m3, m4] = r.meilensteine
  assert.equal(meilensteinOffen(r, m1), false)
  assert.equal(meilensteinOffen(r, m2), true)
  assert.equal(meilensteinOffen(r, m3), true)
  assert.equal(meilensteinOffen(r, m4), true)
  const alleFertig = roadmap(['M1', 'ABGESCHLOSSEN'], ['M2', 'ABGESCHLOSSEN'])
  assert.equal(meilensteinOffen(alleFertig, alleFertig.meilensteine[1]), false)
})

test('nichtEingeplant: Features ohne Meilenstein; nicht prüfbar → null', () => {
  const r = roadmap(['M1', 'LAEUFT', [{ id: 'F1', status: 'IN_ARBEIT' }]], ['M2', 'GEPLANT', [{ id: 'F2', status: 'ENTWURF' }]])
  const features = [{ id: 'F1' }, { id: 'F2' }, { id: 'F9', titel: 'Neu' }]
  assert.deepEqual(nichtEingeplant(r, features), [{ id: 'F9', titel: 'Neu' }])
  assert.deepEqual(nichtEingeplant(r, [{ id: 'F1' }]), [])
  assert.deepEqual(nichtEingeplant({ status: 'nicht_vorhanden' }, features), features)
  assert.equal(nichtEingeplant({ status: 'ungueltig', fehler: [] }, features), null)
  assert.equal(nichtEingeplant({ status: 'fehler' }, features), null)
  assert.equal(nichtEingeplant(r, null), null)
})

test('Randfälle: undefined lädt, leere Meilensteinliste ist ok, null-Meilenstein ist Fehler', () => {
  assert.equal(roadmapZustand(undefined), 'laedt')
  assert.equal(roadmapZustand({ status: 'ok', meilensteine: [] }), 'ok')
  assert.equal(roadmapZustand({ status: 'ok', meilensteine: [null] }), 'fehler')
  assert.equal(roadmapZustand({ status: 'ungueltig', fehler: [] }), 'ungueltig')
})

test('nichtEingeplant während die Roadmap lädt → null (nicht prüfbar)', () => {
  assert.equal(nichtEingeplant(null, [{ id: 'F1' }]), null)
})

test('ein geplanter Meilenstein vor dem laufenden bleibt offen', () => {
  const r = roadmap(['M1', 'GEPLANT'], ['M2', 'LAEUFT'])
  assert.equal(meilensteinOffen(r, r.meilensteine[0]), true)
  assert.equal(aktuellerMeilenstein(r).id, 'M2')
})

test('F-895: nichtEingeplant zeigt nur offene Features mit einer ID nach der Roadmap-Regel', () => {
  const r = roadmap(['M1', 'LAEUFT', [{ id: 'F1', status: 'IN_ARBEIT' }]])
  const features = [
    { id: 'F2', status: 'ENTWURF' },
    { id: 'F3b', status: 'IN_ARBEIT' },
    { id: 'F4', status: 'ABGESCHLOSSEN' },
    { id: 'F5', status: 'ABGEBROCHEN' },
    { id: 'AF-F001', status: 'ENTWURF' },
    { id: 'f6', status: 'ENTWURF' },
    { id: 'F1', status: 'IN_ARBEIT' },
  ]
  assert.deepEqual(
    nichtEingeplant(r, features).map((f) => f.id),
    ['F2', 'F3b']
  )
  assert.deepEqual(
    nichtEingeplant({ status: 'nicht_vorhanden' }, features).map((f) => f.id),
    ['F2', 'F3b', 'F1']
  )
})

test('B5 (F-904): zaehleGeplant zählt nur ENTWURF und READY_FOR_TECH', () => {
  const m = {
    features: [
      { id: 'F1', status: 'ENTWURF' },
      { id: 'F2', status: 'READY_FOR_TECH' },
      { id: 'F3', status: 'WORKSTREAM_SCHNITT_GENEHMIGT' },
      { id: 'F4', status: 'IN_ARBEIT' },
      { id: 'F5', status: 'ABGESCHLOSSEN' },
      { id: 'F6', status: 'keine_akte' },
    ],
  }
  assert.equal(zaehleGeplant(m), 2)
  assert.equal(statusKategorie('WORKSTREAM_SCHNITT_GENEHMIGT'), 'in_arbeit')
  assert.equal(zaehleGeplant(null), 0)
  assert.equal(zaehleGeplant({ features: null }), 0)
})

test('B1/B2: aktueller Meilenstein und Zähler ohne gültige Roadmap', () => {
  assert.equal(aktuellerMeilenstein({ status: 'nicht_vorhanden' }), null)
  assert.equal(aktuellerMeilenstein({ status: 'ungueltig', fehler: ['x'] }), null)
  assert.deepEqual(zaehleMeilenstein(null), { abgenommen: 0, gesamt: 0 })
})

test('STATUS_SYMBOL deckt jede Kategorie ab', () => {
  for (const kategorie of STATUS_KATEGORIEN) assert.equal(typeof STATUS_SYMBOL[kategorie], 'string')
})

test('B10 (F-905): waehleEntwicklungsstand — offene P0–P2-Findings vor offenen Features, höchstens 8', () => {
  const meilenstein = {
    features: [
      { id: 'F1', titel: 'Eins', status: 'IN_ARBEIT' },
      { id: 'F2', status: 'ABGESCHLOSSEN' },
      { id: 'F3', status: 'ABGEBROCHEN' },
      { id: 'F4', status: 'keine_akte' },
    ],
  }
  const workitems = [
    { quelle: 'finding', id: 'F-10', titel: 'zwei', status: 'OFFEN', prioritaet: 'P2' },
    { quelle: 'finding', id: 'F-11', titel: 'null', status: 'OFFEN', prioritaet: 'P0' },
    { quelle: 'finding', id: 'F-12', titel: 'drei', status: 'OFFEN', prioritaet: 'P3' },
    { quelle: 'finding', id: 'F-13', titel: 'erledigt', status: 'ERLEDIGT', prioritaet: 'P0' },
    { quelle: 'finding', id: 'F-14', titel: 'eins', status: 'OFFEN', prioritaet: 'P1' },
    { quelle: 'feature', typ: 'FEATURE', id: 'F1', titel: 'Eins', status: 'IN_ARBEIT' },
    { quelle: 'failed-run', id: 'lauf-1', status: 'OFFEN', prioritaet: 'P0' },
  ]
  const { eintraege, gesamt, findingsVerfuegbar } = waehleEntwicklungsstand(meilenstein, workitems)
  assert.deepEqual(
    eintraege.map((e) => e.id),
    ['F-11', 'F-14', 'F-10', 'F1', 'F4']
  )
  assert.equal(eintraege[3].prioritaet, null)
  assert.equal(gesamt, 5)
  assert.equal(findingsVerfuegbar, true)
})

test('B10: waehleEntwicklungsstand kürzt auf max, ohne Meilenstein nur Findings, ohne Workitems nur Features', () => {
  const viele = Array.from({ length: 10 }, (_, i) => ({ quelle: 'finding', id: `F-${i}`, status: 'OFFEN', prioritaet: 'P1' }))
  const gekuerzt = waehleEntwicklungsstand(null, viele)
  assert.equal(gekuerzt.eintraege.length, 8)
  assert.equal(gekuerzt.gesamt, 10)
  const ohneWorkitems = waehleEntwicklungsstand({ features: [{ id: 'F1', status: 'ENTWURF' }] }, null)
  assert.deepEqual(
    ohneWorkitems.eintraege.map((e) => e.id),
    ['F1']
  )
  assert.equal(ohneWorkitems.findingsVerfuegbar, false)
  assert.equal(waehleEntwicklungsstand(null, undefined).findingsVerfuegbar, false)
  assert.equal(waehleEntwicklungsstand(null, [], 3).eintraege.length, 0)
})

test('F46 D1: waehleEntwicklungsstand trägt den Typ und filtert nach Typen (Roadmap-Filter)', () => {
  const meilenstein = { features: [{ id: 'F1', titel: 'Eins', status: 'IN_ARBEIT' }] }
  const workitems = [
    { quelle: 'finding', typ: 'BUG', id: 'F-1', titel: 'b', status: 'OFFEN', prioritaet: 'P1' },
    { quelle: 'finding', typ: 'HARNESS_IMPROVEMENT', id: 'F-2', titel: 'h', status: 'OFFEN', prioritaet: 'P2' },
    { quelle: 'finding', typ: 'TECH_DEBT', id: 'F-3', titel: 't', status: 'OFFEN', prioritaet: 'P0' },
  ]
  const alle = waehleEntwicklungsstand(meilenstein, workitems)
  assert.deepEqual(
    alle.eintraege.map((e) => [e.id, e.typ]),
    [
      ['F-3', 'TECH_DEBT'],
      ['F-1', 'BUG'],
      ['F-2', 'HARNESS_IMPROVEMENT'],
      ['F1', 'FEATURE'],
    ]
  )
  assert.deepEqual(
    waehleEntwicklungsstand(meilenstein, workitems, 8, { typen: ['FEATURE'] }).eintraege.map((e) => e.id),
    ['F1']
  )
  const bugs = waehleEntwicklungsstand(meilenstein, workitems, 8, { typen: ['BUG'] })
  assert.deepEqual(
    bugs.eintraege.map((e) => e.id),
    ['F-1']
  )
  assert.equal(bugs.gesamt, 1)
  assert.equal(waehleEntwicklungsstand(meilenstein, workitems, 8, { typen: [] }).eintraege.length, 0)
})

// ─── F45 B5b-2a: Gantt lesend (features/F45/plan-b5b2a-v2.md) ─────────────────────────────────────

/** Workstream-Zeile der Akte (Form src/workboard/feature-planung.ts WorkstreamEintrag). */
function ws(id, art, status, schaetzung = null, ist = null) {
  return { id, art, titel: `Titel ${id}`, status, schaetzung, ist, begonnen: null, abgenommen: null, notiz: '' }
}

/**
 * Projektion mit Planungsdaten: M1 abgeschlossen; M2 läuft (F2 abgenommen, F3 in Arbeit mit vier Zeilen, F4 ohne Akte,
 * F5 mit fehlerhafter Tabelle, F7 abgeschlossen mit offener Zeile); M3 geplant (F6 ohne Planungsdaten).
 */
function planung() {
  const p = roadmap(
    ['M1', 'ABGESCHLOSSEN', [{ id: 'F1', status: 'ABGESCHLOSSEN', workstreams: null }]],
    [
      'M2',
      'LAEUFT',
      [
        { id: 'F2', titel: 'Zwei', status: 'ABGESCHLOSSEN', workstreams: null },
        { id: 'F3', titel: 'Drei', status: 'IN_ARBEIT', prioritaet: 'P1', workstreams: [ws('A', 'fixpaket', 'erledigt', { min: 1, max: 1 }, 1.5), ws('B', 'workstream', 'laeuft', { min: 0.5, max: 1 }), ws('C', 'design', 'geplant', { min: 1, max: 2 }), ws('D', 'workstream', 'geplant')], workstreams_fehlerhaft: false, planung_befunde: [] },
        { id: 'F4', status: 'keine_akte' },
        { id: 'F5', titel: 'Fünf', status: 'ENTWURF', workstreams: [], workstreams_fehlerhaft: true, planung_befunde: ['Zeile 3: neun Zellen erwartet'] },
        { id: 'F7', titel: 'Sieben', status: 'ABGESCHLOSSEN', workstreams: [ws('X', 'workstream', 'geplant', { min: 1, max: 1 })] },
      ],
    ],
    ['M3', 'GEPLANT', [{ id: 'F6', titel: 'Sechs', status: 'ENTWURF', workstreams: null }]]
  )
  p.zeitachse = {
    heute: '2026-10-25',
    eintraege: [
      { meilenstein: 'M2', feature: 'F3', workstream: 'A', status: 'erledigt', schaetzung_fehlt: false, nach_unbekannt: false, ist_start_at: -2, ist_ende_at: -1 },
      { meilenstein: 'M2', feature: 'F3', workstream: 'B', status: 'laeuft', schaetzung_fehlt: false, nach_unbekannt: false, start_at: 0, ende_min_at: 0.5, ende_max_at: 1 },
      { meilenstein: 'M2', feature: 'F3', workstream: 'C', status: 'geplant', schaetzung_fehlt: false, nach_unbekannt: false, start_at: 0.5, ende_min_at: 1.5, ende_max_at: 3 },
      { meilenstein: 'M2', feature: 'F3', workstream: 'D', status: 'geplant', schaetzung_fehlt: true, nach_unbekannt: false, fruehestens_ab_at: 1.5 },
      { meilenstein: 'M2', feature: 'F4', workstream: null, status: 'keine_akte', schaetzung_fehlt: true, nach_unbekannt: true, fruehestens_ab_at: 1.5 },
      { meilenstein: 'M2', feature: 'F5', workstream: null, status: 'ENTWURF', schaetzung_fehlt: true, nach_unbekannt: true, fruehestens_ab_at: 1.5 },
      { meilenstein: 'M3', feature: 'F6', workstream: null, status: 'ENTWURF', schaetzung_fehlt: true, nach_unbekannt: true, fruehestens_ab_at: 1.5 },
    ],
  }
  p.kennzahlen = {
    meilensteine: { abgeschlossen: 1, gesamt: 3, mit_abweichung: 0 },
    features_abgenommen: { abgenommen: 3, gesamt: 7 },
    bis_fertig: [
      { meilenstein: 'M2', berechenbar: false, min: null, max: null, ohne_schaetzung: 3 },
      { meilenstein: 'M3', berechenbar: false, min: null, max: null, ohne_schaetzung: 4 },
    ],
    plan_gegen_ist: { anzahl: 1, plan_min: 1, plan_max: 1, ist: 1.5, eintraege: [] },
  }
  return p
}

const ACHSE = baueAchse([], 'tage')

/** Zeile nach Schlüsselteilen. */
function zeile(lage, ...teile) {
  return [...lage.oben, ...lage.unten].find((z) => z.schluessel === zeilenSchluessel(...teile))
}

test('B5b-2a statusKategorie: Workstream-Status der Akte', () => {
  assert.equal(statusKategorie('geplant'), 'geplant')
  assert.equal(statusKategorie('laeuft'), 'in_arbeit')
  assert.equal(statusKategorie('erledigt'), 'abgenommen')
  assert.equal(statusKategorie('verworfen'), 'abgebrochen')
})

test('B5b-2a zeitachseVon: fehlendes oder kaputtes Feld ergibt [] (Advisor 1), ungültige Einträge fallen weg', () => {
  assert.deepEqual(zeitachseVon(roadmap(['M1', 'GEPLANT'])), [])
  assert.deepEqual(zeitachseVon({ ...roadmap(['M1', 'GEPLANT']), zeitachse: { eintraege: 'x' } }), [])
  assert.deepEqual(zeitachseVon({ status: 'nicht_vorhanden' }), [])
  const p = { ...roadmap(['M1', 'GEPLANT']), zeitachse: { eintraege: [null, { meilenstein: 'M1' }, { meilenstein: 'M1', feature: 'F1' }] } }
  assert.deepEqual(zeitachseVon(p), [{ meilenstein: 'M1', feature: 'F1' }])
})

test('B5b-2a baueAchse: mindestens zehn Spalten, fünf Spalten Platz hinter dem Ende, Zoom Tage/Wochen', () => {
  assert.equal(ACHSE.spalten.length, 10)
  assert.equal(ACHSE.px, MASSSTAB_PX.tage)
  assert.deepEqual(ACHSE.spalten[0], { nummer: 1, links: IST_BREITE })
  assert.equal(ACHSE.breite, IST_BREITE + 10 * 44)
  const lang = baueAchse([{ ende_max_at: 20 }, { fruehestens_ab_at: 3 }], 'tage')
  assert.equal(lang.spalten.length, 25)
  const wochen = baueAchse([{ ende_max_at: 20 }], 'wochen')
  assert.equal(wochen.px, 8.8)
  assert.equal(wochen.spalten.length, 10)
  assert.equal(baueAchse([], 'unsinn').massstab, 'tage')
})

test('B5b-2a baueSpur: läuft gefüllt, geplant Umriss, Spanne bis Max. nur bei Abstand, Mindestbreite', () => {
  const laeuft = baueSpur([{ status: 'laeuft', start_at: 0, ende_min_at: 0.5, ende_max_at: 1 }], {}, ACHSE)
  assert.deepEqual(laeuft.plan, { links: 96, breite: 22, form: 'gefuellt' })
  assert.deepEqual(laeuft.max, { links: 118, breite: 22 })
  assert.deepEqual(laeuft.label, { links: 146, seite: 'rechts', dauer: { min: 0.5, max: 1 }, ohneSchaetzung: 0, fruehestensAb: null })
  const geplant = baueSpur([{ status: 'geplant', start_at: 1, ende_min_at: 1.05, ende_max_at: 1.05 }], {}, ACHSE)
  assert.equal(geplant.plan.form, 'umriss')
  assert.equal(geplant.plan.breite, 4)
  assert.equal(geplant.max, null)
  assert.equal(baueSpur([{ status: 'geplant', start_at: 0, ende_min_at: 1, ende_max_at: 1 }], { laeuft: true }, ACHSE).plan.form, 'gefuellt')
})

test('B5b-2a baueSpur: ohne Schätzung nur die Marke, keine Länge (R4); leere Zeile ohne Formen', () => {
  const ohne = baueSpur([{ status: 'ENTWURF', schaetzung_fehlt: true, nach_unbekannt: true, fruehestens_ab_at: 2 }], {}, ACHSE)
  assert.equal(ohne.plan, null)
  assert.equal(ohne.max, null)
  assert.deepEqual(ohne.marke, { links: 184, ab: 2 })
  assert.deepEqual(ohne.label, { links: 196, seite: 'rechts', dauer: null, ohneSchaetzung: 1, fruehestensAb: 2 })
  const leer = baueSpur([], { istBand: true, ohneLage: true }, ACHSE)
  assert.deepEqual(leer, { istBand: true, ohneLage: true, plan: null, max: null, marke: null, label: null })
})

test('B5b-2a baueSpur: Balken und Marke zusammen, nach_unbekannt sichtbar als „frühestens ab“ (Advisor 3)', () => {
  const spur = baueSpur(
    [
      { status: 'geplant', start_at: 1, ende_min_at: 2, ende_max_at: 4, nach_unbekannt: true },
      { status: 'geplant', schaetzung_fehlt: true, fruehestens_ab_at: 2 },
    ],
    {},
    ACHSE
  )
  assert.notEqual(spur.plan, null)
  assert.notEqual(spur.marke, null)
  assert.deepEqual(spur.label.dauer, { min: 1, max: 3 })
  assert.equal(spur.label.ohneSchaetzung, 1)
  assert.equal(spur.label.fruehestensAb, 1)
  assert.equal(spur.label.links, 96 + 4 * 44 + 6)
})

test('B5b-2a ganttZeilen: Reihenfolge, Standard-Aufklappen, Gruppen der erledigten Kinder (eine Regel)', () => {
  const lage = ganttZeilen(planung(), { aufgeklappt: null, abgeschlosseneSichtbar: false, achse: ACHSE })
  const sichtbar = lage.oben.filter((z) => z.sichtbar).map((z) => `${z.ebene}:${z.art}:${z.id}`)
  assert.deepEqual(sichtbar, ['0:meilenstein:M2', '1:gruppe:M2', '1:feature:F3', '2:gruppe:F3', '2:workstream:B', '2:design:C', '2:workstream:D', '1:feature:F4', '1:feature:F5', '0:meilenstein:M3'])
  // Eingeklappt, aber vorhanden: abgenommene Features in der Gruppe, erledigte Zeilen, F7 abgeschlossen.
  assert.equal(zeile(lage, 'f', 'M2', 'F2').sichtbar, false)
  assert.equal(zeile(lage, 'w', 'M2', 'F3', 'A').sichtbar, false)
  assert.equal(zeile(lage, 'f', 'M2', 'F7').eltern, zeilenSchluessel('g', 'M2'))
  assert.equal(zeile(lage, 'g', 'M2').anzahl, 2)
  assert.equal(zeile(lage, 'h', 'M2', 'F3').anzahl, 1)
  assert.equal(zeile(lage, 'h', 'M2', 'F3').istAt, 1.5)
  assert.deepEqual([...lage.standardOffen].sort(), [zeilenSchluessel('f', 'M2', 'F3'), zeilenSchluessel('m', 'M2')].sort())
  // Abgeschlossene unter der Trennzeile, ausgeblendet; ihre Features direkt (keine Gruppe).
  assert.deepEqual(lage.trenner, { anzahl: 1, abgenommen: 1, gesamt: 1 })
  assert.deepEqual(
    lage.unten.map((z) => `${z.art}:${z.id}:${z.sichtbar}`),
    ['meilenstein:M1:false', 'feature:F1:false']
  )
  const ein = ganttZeilen(planung(), { aufgeklappt: new Set([zeilenSchluessel('m', 'M1')]), abgeschlosseneSichtbar: true, achse: ACHSE })
  assert.deepEqual(
    ein.unten.map((z) => z.sichtbar),
    [true, true]
  )
})

test('B5b-2a ganttZeilen: Farbe je art, Formen je Zeile, Hinweise sichtbar, ohne Akte, ohne Planlage, danach', () => {
  const lage = ganttZeilen(planung(), { aufgeklappt: null, abgeschlosseneSichtbar: false, achse: ACHSE })
  assert.equal(zeile(lage, 'w', 'M2', 'F3', 'A').farbe, 'fixpaket')
  assert.equal(zeile(lage, 'w', 'M2', 'F3', 'C').farbe, 'design')
  assert.equal(zeile(lage, 'w', 'M2', 'F3', 'A').spur.istBand, true)
  assert.equal(zeile(lage, 'w', 'M2', 'F3', 'B').spur.plan.form, 'gefuellt')
  assert.equal(zeile(lage, 'w', 'M2', 'F3', 'C').spur.plan.form, 'umriss')
  assert.equal(zeile(lage, 'w', 'M2', 'F3', 'D').spur.plan, null)
  assert.equal(zeile(lage, 'w', 'M2', 'F3', 'D').spur.marke.ab, 1.5)
  // Feature-Zeile: Sammelbalken + Marke, Ist-Band aus der erledigten Zeile, Ist-Summe.
  const f3 = zeile(lage, 'f', 'M2', 'F3')
  assert.deepEqual(f3.spur.label.dauer, { min: 1.5, max: 3 })
  assert.equal(f3.spur.label.ohneSchaetzung, 1)
  assert.equal(f3.spur.istBand, true)
  assert.equal(f3.istAt, 1.5)
  assert.equal(f3.danach.id, 'F4')
  assert.equal(zeile(lage, 'w', 'M2', 'F3', 'B').danach.id, 'C')
  // Ohne Akte: undefined-Felder (Advisor 6) — Titel = ID, keine Kinder.
  const f4 = zeile(lage, 'f', 'M2', 'F4')
  assert.equal(f4.titel, 'F4')
  assert.equal(f4.hatKinder, false)
  assert.equal(f4.kategorie, 'ohne_akte')
  // Formfehler und Befunde sichtbar.
  const f5 = zeile(lage, 'f', 'M2', 'F5')
  assert.deepEqual(f5.hinweise, ['fehlerhaft', 'befunde'])
  assert.deepEqual(f5.befunde, ['Zeile 3: neun Zellen erwartet'])
  // Offene Zeile unter abgeschlossenem Feature: keine Lage, sichtbarer Hinweis (Advisor 7).
  const x = zeile(lage, 'w', 'M2', 'F7', 'X')
  assert.deepEqual(x.hinweise, ['ohne_lage'])
  assert.equal(x.spur.ohneLage, true)
  assert.equal(x.spur.plan, null)
  // Meilensteine: „danach“ in Roadmap-Reihenfolge, nicht in Anzeigereihenfolge.
  assert.equal(zeile(lage, 'm', 'M2').danach.id, 'M3')
  assert.equal(zeile(lage, 'm', 'M3').danach, null)
  assert.equal(zeile(lage, 'm', 'M1').danach.id, 'M2')
})

test('B5b-2a ganttZeilen: Projektion ohne zeitachse (älterer Server) — Zeilen ohne Balken (Advisor 1)', () => {
  const p = roadmap(['M1', 'LAEUFT', [{ id: 'F1', status: 'IN_ARBEIT' }]])
  const lage = ganttZeilen(p, { aufgeklappt: null, abgeschlosseneSichtbar: false })
  assert.deepEqual(
    lage.oben.map((z) => [z.id, z.sichtbar, z.spur.plan, z.spur.marke]),
    [
      ['M1', true, null, null],
      ['F1', true, null, null],
    ]
  )
  assert.deepEqual(ganttZeilen({ status: 'fehler' }, { aufgeklappt: null }).oben, [])
})

test('B5b-2a aufklappbareSchluessel: alle Zeilen mit Kindern unter den sichtbaren Meilensteinen', () => {
  const aus = aufklappbareSchluessel(ganttZeilen(planung(), { aufgeklappt: null }), false)
  assert.deepEqual(aus, [zeilenSchluessel('m', 'M2'), zeilenSchluessel('g', 'M2'), zeilenSchluessel('f', 'M2', 'F7'), zeilenSchluessel('f', 'M2', 'F3'), zeilenSchluessel('h', 'M2', 'F3'), zeilenSchluessel('m', 'M3')])
  assert.deepEqual(aufklappbareSchluessel(ganttZeilen(planung(), { aufgeklappt: null }), true).slice(-1), [zeilenSchluessel('m', 'M1')])
})

test('B5b-2a bisFertig: aus kennzahlen.bis_fertig; fehlend oder kaputt → null', () => {
  const p = planung()
  assert.deepEqual(bisFertig(p, 'M2'), { berechenbar: false, min: null, max: null, ohne_schaetzung: 3 })
  assert.equal(bisFertig(p, 'M9'), null)
  assert.equal(bisFertig(p, null), null)
  assert.equal(bisFertig(roadmap(['M1', 'LAEUFT']), 'M1'), null)
  p.kennzahlen.bis_fertig = [{ meilenstein: 'M2', berechenbar: true, min: 1.5, max: 3, ohne_schaetzung: 0 }]
  assert.deepEqual(bisFertig(p, 'M2'), { berechenbar: true, min: 1.5, max: 3, ohne_schaetzung: 0 })
  p.kennzahlen.bis_fertig = [{ meilenstein: 'M2', berechenbar: true, min: null, max: null, ohne_schaetzung: 0 }]
  assert.equal(bisFertig(p, 'M2'), null)
})

test('B5b-2a planGegenIst: über, unter, im Plan, leer, Bezugsgröße 0 ohne Division (Advisor 4)', () => {
  const mit = (werte) => ({ ...roadmap(['M1', 'LAEUFT']), kennzahlen: { plan_gegen_ist: { anzahl: 2, plan_min: 2, plan_max: 4, ist: 3, ...werte } } })
  assert.equal(planGegenIst(mit({})).zustand, 'im_plan')
  assert.deepEqual([planGegenIst(mit({ ist: 5 })).zustand, planGegenIst(mit({ ist: 5 })).prozent], ['ueber', 25])
  assert.deepEqual([planGegenIst(mit({ ist: 1 })).zustand, planGegenIst(mit({ ist: 1 })).prozent], ['unter', -50])
  const null0 = planGegenIst(mit({ plan_min: 0, plan_max: 0, ist: 1 }))
  assert.deepEqual([null0.zustand, null0.prozent], ['ueber', null])
  assert.equal(planGegenIst(mit({ plan_min: 0, plan_max: 0, ist: 0 })).zustand, 'im_plan')
  assert.equal(planGegenIst(mit({ anzahl: 0, plan_min: 0, plan_max: 0, ist: 0 })).zustand, 'leer')
  assert.equal(planGegenIst(mit({ ist: 'x' })), null)
  assert.equal(planGegenIst(roadmap(['M1', 'LAEUFT'])), null)
  assert.equal(planGegenIst(planung()).prozent, 50)
})

test('B5b-2a Prüfpass: Beschriftung kippt weit rechts vor das Element, wenn links Platz ist (dg 2)', () => {
  const weit = baueSpur([{ status: 'ENTWURF', schaetzung_fehlt: true, fruehestens_ab_at: 7 }], {}, ACHSE)
  assert.deepEqual([weit.label.seite, weit.label.links], ['links', 96 + 7 * 44 - 12])
  const nah = baueSpur([{ status: 'geplant', start_at: 0, ende_min_at: 8, ende_max_at: 9 }], {}, ACHSE)
  assert.equal(nah.label.seite, 'rechts')
})

test('B5b-2a Prüfpass: Abweichung an der abgeschlossenen Zeile sichtbar, nicht erst nach Aufklappen (qa 4)', () => {
  const lage = ganttZeilen(planung(), { aufgeklappt: null, abgeschlosseneSichtbar: false, achse: ACHSE })
  assert.deepEqual(zeile(lage, 'f', 'M2', 'F7').hinweise, ['abweichung'])
  assert.deepEqual(zeile(lage, 'm', 'M1').hinweise, [])
  const r1 = roadmap(['M1', 'ABGESCHLOSSEN', [{ id: 'F1', status: 'FEATURE_GATE' }]], ['M2', 'LAEUFT'])
  assert.deepEqual(zeile(ganttZeilen(r1, { aufgeklappt: null }), 'm', 'M1').hinweise, ['abweichung'])
})

test('B5b-2a Prüfpass: gewaehlteZeile nur unter den sichtbaren — eingeklappt ⇒ sichtbare Elternzeile (dg 1/qa 5)', () => {
  const p = planung()
  const offen = ganttZeilen(p, { aufgeklappt: null, abgeschlosseneSichtbar: false, achse: ACHSE })
  assert.equal(gewaehlteZeile(p, offen, zeilenSchluessel('w', 'M2', 'F3', 'C')).id, 'C')
  // Ohne Wahl: Feature in Arbeit des aktuellen Meilensteins.
  assert.equal(gewaehlteZeile(p, offen, null).id, 'F3')
  // Erledigte Zeile A liegt in der eingeklappten Gruppe ⇒ Feature F3 (Gruppe übersprungen).
  assert.equal(gewaehlteZeile(p, offen, zeilenSchluessel('w', 'M2', 'F3', 'A')).id, 'F3')
  // Alles zu ⇒ Meilenstein M2.
  const zu = ganttZeilen(p, { aufgeklappt: new Set(), abgeschlosseneSichtbar: false, achse: ACHSE })
  assert.equal(gewaehlteZeile(p, zu, zeilenSchluessel('w', 'M2', 'F3', 'C')).id, 'M2')
  // Ausgeblendeter abgeschlossener Meilenstein ⇒ Rückfall.
  assert.equal(gewaehlteZeile(p, zu, zeilenSchluessel('m', 'M1')).id, 'M2')
  // Alle Meilensteine abgeschlossen und ausgeblendet ⇒ nichts sichtbar.
  const alleZu = roadmap(['M1', 'ABGESCHLOSSEN', [{ id: 'F1', status: 'ABGESCHLOSSEN' }]])
  const lage = ganttZeilen(alleZu, { aufgeklappt: null, abgeschlosseneSichtbar: false })
  assert.equal(lage.oben.length, 0)
  assert.deepEqual(lage.standardOffen, new Set())
  assert.equal(gewaehlteZeile(alleZu, lage, null), null)
  assert.equal(gewaehlteZeile(alleZu, ganttZeilen(alleZu, { aufgeklappt: null, abgeschlosseneSichtbar: true }), null).id, 'M1')
  assert.deepEqual(aufklappbareSchluessel(lage, false), [])
})

test('B5b-2a Prüfpass: featuresAbgenommen aus der Projektion (ohne ABGEBROCHEN), sonst Zählung (cr 3/qa 3)', () => {
  assert.deepEqual(featuresAbgenommen(planung()), { abgenommen: 3, gesamt: 7 })
  const ohne = roadmap(['M1', 'LAEUFT', [{ id: 'F1', status: 'ABGESCHLOSSEN' }, { id: 'F2', status: 'ABGEBROCHEN' }]])
  assert.deepEqual(featuresAbgenommen(ohne), { abgenommen: 1, gesamt: 2 })
  assert.deepEqual(featuresAbgenommen({ ...ohne, kennzahlen: { features_abgenommen: { abgenommen: 'x' } } }), { abgenommen: 1, gesamt: 2 })
})

test('B5b-2a Prüfpass: Plan gegen Ist knapp neben der Spanne nie „0 %“ (cr 10)', () => {
  const mit = (ist) => ({ ...roadmap(['M1', 'LAEUFT']), kennzahlen: { plan_gegen_ist: { anzahl: 1, plan_min: 100, plan_max: 100, ist } } })
  assert.equal(planGegenIst(mit(100.2)).prozent, 1)
  assert.equal(planGegenIst(mit(99.8)).prozent, -1)
})
