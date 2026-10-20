/**
 * Datei: public/leitstand/code-daten-ablauf.test.mjs
 *
 * Zweck: F45 B2b-4a-2b-1 — reine Regeln „Bereit zum Sichern“ je Ablauf und die node_modules-Regel (code-daten.js):
 * sichernQuelle (F-1157 (7)), sichernSchluessel (V1), ablaufSicherBefehle (F-1157 (2)(3), V2, origin nicht lesbar),
 * istNodeModulesPfad/nodeModulesAnzahl und der node_modules-Hinweis in sicherBefehle (O2, Bauauflagen 1/2).
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ablaufSicherBefehle, istNodeModulesPfad, nodeModulesAnzahl, psArgument, sicherBefehle, sichernQuelle, sichernSchluessel } from './code-daten.js'

/** Neutraler Arbeitsordner mit Leerzeichen und Klammern (PowerShell-Quoting). */
const AO_PFAD = String.raw`C:\Projekte\haushaltsbuch-laeufe\a1 [b]`
const AO_BRANCH = 'wf/ablauf-1'
const ORT = `Set-Location -LiteralPath ${psArgument(AO_PFAD)} -ErrorAction Stop`
const PUSH = `git push -u origin ${psArgument(AO_BRANCH)}`

/**
 * Antwort von GET …/code?workflow=<id> im Grünfall (bereit, art commit).
 * @param zusatz - überschreibt Felder der Projektion
 * @param sichern - überschreibt ablauf.sichern
 * @returns Antwort
 */
function antwort(zusatz = {}, sichern = {}) {
  return {
    status: 'ok',
    // Absichtlich ein anderer Ort: die Befehle dürfen nur aus ablauf.arbeitsordner kommen (F-1157 (3)).
    absoluterPfad: String.raw`C:\Projekte\haushaltsbuch`,
    branch: { status: 'ok', name: AO_BRANCH, losgeloest: false },
    basis: { status: 'ok', ref: 'origin/main', voraus: 0, zurueck: 0 },
    remoteWebUrl: { status: 'ok', url: null, origin: true },
    dateien: { status: 'ok', eintraege: [{ pfad: 'src/a.ts', art: 'M', xy: ' M', plus: 1, minus: 0 }], anzahl: 1, gekappt: false, nodeModules: 0 },
    ablauf: { workflowId: 'ablauf-1', bedarf: 'pflicht', workflowStatus: 'ABGESCHLOSSEN', arbeitsordner: { pfad: AO_PFAD, branch: AO_BRANCH }, sichern: { bereit: true, art: 'commit', grund: null, offeneAenderungen: 1, voraus: 0, ...sichern } },
    ...zusatz,
  }
}

test('sichernQuelle: jeder Ablauf mit Arbeitsordner über ?workflow=, kein_bedarf und bestand getrennt, unbekannt ohne Rückfall', () => {
  for (const status of ['fehlt', 'IN_VORBEREITUNG', 'BEREIT', 'FEHLGESCHLAGEN', 'ENTFERNT', 'NEU_UNBEKANNT']) assert.equal(sichernQuelle({ status }), 'ablauf', status)
  assert.equal(sichernQuelle({ status: 'kein_bedarf' }), 'keinBedarf')
  assert.equal(sichernQuelle({ status: 'bestand' }), 'projekt')
  assert.equal(sichernQuelle(null), 'unbekannt')
  assert.equal(sichernQuelle(undefined), 'unbekannt')
})

test('sichernSchluessel (V1): Aufräumen, Vorbereitung und neue Fassung wechseln den Schlüssel, ein gleicher Stand nicht', () => {
  const basis = { daten: { status: 'ABGESCHLOSSEN' }, arbeitsordner: { status: 'BEREIT', vorbereitungLaeuft: false }, versionSequenz: 3 }
  const s = sichernSchluessel(basis)
  assert.equal(sichernSchluessel(structuredClone(basis)), s)
  assert.notEqual(sichernSchluessel({ ...basis, arbeitsordner: { status: 'ENTFERNT', vorbereitungLaeuft: false } }), s, 'Aufräumen')
  assert.notEqual(sichernSchluessel({ ...basis, arbeitsordner: { status: 'BEREIT', vorbereitungLaeuft: true } }), s, 'Aufräumen läuft')
  assert.notEqual(sichernSchluessel({ ...basis, versionSequenz: 4 }), s, 'Anpassungsrunde')
  assert.notEqual(sichernSchluessel({ ...basis, daten: { status: 'GESTOPPT' } }), s, 'Ablauf-Status')
  assert.equal(typeof sichernSchluessel(null), 'string')
})

test('ablaufSicherBefehle: commit- und push-Block nur aus dem Arbeitsordner, Blockform', () => {
  const e = ablaufSicherBefehle(antwort())
  assert.equal(e.grund, undefined)
  assert.deepEqual(
    e.bloecke.map((b) => b.art),
    ['commit', 'push']
  )
  assert.deepEqual(e.bloecke[0].zeilen.slice(0, 3), ['& {', ORT, 'git add src/a.ts'])
  assert.deepEqual(e.bloecke[1].zeilen, ['& {', ORT, PUSH, '}'])
  assert.ok(!JSON.stringify(e.bloecke).includes('haushaltsbuch\\'), 'nie absoluterPfad')
  assert.ok(!JSON.stringify(e.bloecke).includes("'C:\\Projekte\\haushaltsbuch'"), 'nie absoluterPfad')
  assert.deepEqual(e.hinweise, [])
  assert.equal(e.commitGrund, null)
})

test('ablaufSicherBefehle: Branch-Prüfung vor jedem Block (F-1157 (2)) und Ort nur aus dem Arbeitsordner (F-1157 (3))', () => {
  assert.equal(ablaufSicherBefehle(antwort({ branch: { status: 'ok', name: 'feat/anderer', losgeloest: false } })).grund, 'fremderBranch')
  assert.equal(ablaufSicherBefehle(antwort({ branch: { status: 'ok', name: null, losgeloest: true } })).grund, 'losgeloest')
  assert.equal(ablaufSicherBefehle(antwort({ branch: { status: 'ok', name: 'main', losgeloest: false } })).grund, 'aufMain')
  assert.equal(ablaufSicherBefehle(antwort({ branch: { status: 'fehler', grund: 'x' } })).grund, 'branchFehler')
  const ohneOrt = antwort()
  ohneOrt.ablauf.arbeitsordner = null
  assert.equal(ablaufSicherBefehle(ohneOrt).grund, 'keinOrt')
  const relativ = antwort()
  relativ.ablauf.arbeitsordner = { pfad: 'relativ/ordner', branch: AO_BRANCH }
  assert.equal(ablaufSicherBefehle(relativ).grund, 'keinOrt')
  assert.equal(ablaufSicherBefehle(antwort({}, { bereit: false, art: null, grund: 'nichtsOffen' })).grund, 'nichtBereit')
  assert.equal(ablaufSicherBefehle(null).grund, 'nichtBereit')
  for (const fall of [antwort({ branch: { status: 'ok', name: 'feat/anderer', losgeloest: false } }), ohneOrt]) assert.equal(fall.bloecke, undefined)
})

test('ablaufSicherBefehle (V2): push hängt an voraus und origin, nie an der Dateiliste oder der Kappung', () => {
  const gekappt = ablaufSicherBefehle(antwort({ dateien: { status: 'ok', eintraege: [{ pfad: 'a', art: 'M', xy: ' M' }], anzahl: 900, gekappt: true, nodeModules: 0 } }, { voraus: 2 }))
  assert.equal(gekappt.commitGrund, 'gekappt')
  assert.deepEqual(
    gekappt.bloecke.map((b) => b.art),
    ['push']
  )
  assert.equal(gekappt.voraus, 2)
  const nurPush = ablaufSicherBefehle(antwort({}, { art: 'push', offeneAenderungen: 0, voraus: 1 }))
  assert.deepEqual(
    nurPush.bloecke.map((b) => b.art),
    ['push']
  )
  const gekapptOhneVoraus = ablaufSicherBefehle(antwort({ dateien: { status: 'ok', eintraege: [{ pfad: 'a', art: 'M' }], anzahl: 900, gekappt: true } }, { voraus: 0 }))
  assert.deepEqual(gekapptOhneVoraus.bloecke, [], 'nichts zu pushen')
  const ohneOrigin = ablaufSicherBefehle(antwort({ remoteWebUrl: { status: 'ok', url: null, origin: false } }, { voraus: 3 }))
  assert.deepEqual(
    ohneOrigin.bloecke.map((b) => b.art),
    ['commit']
  )
  assert.deepEqual(ohneOrigin.hinweise, ['keinOrigin'])
  const unbekannt = ablaufSicherBefehle(antwort({ remoteWebUrl: { status: 'fehler', grund: 'git antwortet nicht' } }, { voraus: 3 }))
  assert.deepEqual(unbekannt.hinweise, ['originUnbekannt'], 'origin nicht lesbar: sichtbarer Hinweis, nicht still')
  assert.ok(!unbekannt.bloecke.some((b) => b.art === 'push'))
})

test('node_modules (O2): Regel, Anzahl und Hinweis unabhängig vom Ergebnis; nie in git add', () => {
  // „node_modules“ ohne Schrägstrich: so meldet git eine Verknüpfung (mklink /D) — qa 1.
  for (const p of ['node_modules/a.js', 'node_modules/@s/p/i.js', 'paket/node_modules/x/y.js', 'node_modules', 'paket/node_modules']) assert.equal(istNodeModulesPfad(p), true, p)
  for (const p of ['meine_node_modules/a.js', 'src/node_modules.ts', 'node_modules2/a.js', 'docs/node_modules-hinweis.md']) assert.equal(istNodeModulesPfad(p), false, p)
  assert.equal(nodeModulesAnzahl({ dateien: { nodeModules: 7 } }), 7)
  assert.equal(nodeModulesAnzahl({ dateien: {} }), 0, 'älterer Server')
  assert.equal(nodeModulesAnzahl({ dateien: { nodeModules: -1 } }), 0)
  // Älterer Server liefert sie noch: weder in git add noch gezählt als echte Änderung; getrackte bleiben.
  const alt = antwort({
    dateien: {
      status: 'ok',
      eintraege: [
        { pfad: 'node_modules/vendored.js', art: 'M', xy: ' M' },
        { pfad: 'node_modules/neu.js', art: '??', xy: '??' },
        { pfad: 'paket/node_modules/x.js', art: '??', xy: '??' },
      ],
      anzahl: 3,
      gekappt: false,
    },
  })
  const add = sicherBefehle(alt).bloecke[0].join('\n')
  assert.match(add, /git add node_modules\/vendored\.js/)
  assert.doesNotMatch(add, /node_modules\/neu|paket\/node_modules/)
  assert.equal(ablaufSicherBefehle(alt).bloecke[0].zeilen.filter((z) => z.includes('node_modules/neu')).length, 0)
  // Hinweis neben Blöcken und neben einem Grund (Bauauflage 2).
  const mitNm = antwort({ dateien: { status: 'ok', eintraege: [{ pfad: 'src/a.ts', art: 'M', xy: ' M' }], anzahl: 1, gekappt: false, nodeModules: 12 } })
  assert.deepEqual(sicherBefehle(mitNm).hinweise, ['nodeModules'])
  assert.deepEqual(ablaufSicherBefehle(mitNm).hinweise, ['nodeModules'])
  assert.equal(ablaufSicherBefehle(mitNm).nodeModules, 12)
  const fremd = ablaufSicherBefehle({ ...mitNm, branch: { status: 'ok', name: 'x/y', losgeloest: false } })
  assert.deepEqual([fremd.grund, fremd.hinweise], ['fremderBranch', ['nodeModules']])
  const gekappt = sicherBefehle({ ...mitNm, dateien: { ...mitNm.dateien, gekappt: true } })
  assert.deepEqual([gekappt.grund, gekappt.hinweise], ['gekappt', ['nodeModules']])
  // Nur node_modules offen: eigener Grund statt „sauber“, kein doppelter Hinweis.
  const nur = sicherBefehle({ ...mitNm, dateien: { status: 'ok', eintraege: [], anzahl: 0, gekappt: false, nodeModules: 4 } })
  assert.deepEqual(nur, { grund: 'nurNodeModules' })
  assert.deepEqual(sicherBefehle({ ...mitNm, dateien: { status: 'ok', eintraege: [], anzahl: 0, gekappt: false, nodeModules: 0 } }), { grund: 'keineAenderungen' })
  // Älterer Server, gekappt und nur node_modules sichtbar: gekappt, nie „nichts zu sichern“ (cr 1).
  const altGekappt = { ...alt, dateien: { status: 'ok', eintraege: [{ pfad: 'node_modules/a.js', art: '??', xy: '??' }], anzahl: 900, gekappt: true } }
  assert.equal(sicherBefehle(altGekappt).grund, 'gekappt')
  assert.equal(ablaufSicherBefehle(altGekappt).commitGrund, 'gekappt')
  // Nur node_modules offen, aber Commits noch nicht auf main: push-Block plus Hinweis.
  const nurPush = ablaufSicherBefehle(antwort({ dateien: { status: 'ok', eintraege: [], anzahl: 0, gekappt: false, nodeModules: 9 } }, { art: 'push', offeneAenderungen: 0, voraus: 1 }))
  assert.deepEqual([nurPush.bloecke.map((b) => b.art), nurPush.hinweise], [['push'], ['nodeModules']])
})

test('ablaufSicherBefehle: origin-Hinweise nur, wenn ein push anstünde (cr 3)', () => {
  const nichts = { status: 'ok', eintraege: [{ pfad: 'a', art: 'M', xy: ' M' }], anzahl: 900, gekappt: true, nodeModules: 0 }
  assert.deepEqual(ablaufSicherBefehle(antwort({ dateien: nichts, remoteWebUrl: { status: 'ok', url: null, origin: false } }, { voraus: 0 })).hinweise, [])
  assert.deepEqual(ablaufSicherBefehle(antwort({ dateien: nichts, remoteWebUrl: { status: 'fehler', grund: 'x' } }, { voraus: 0 })).hinweise, [])
})
