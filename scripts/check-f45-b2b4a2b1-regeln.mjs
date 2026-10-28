#!/usr/bin/env node
/**
 * Datei: scripts/check-f45-b2b4a2b1-regeln.mjs
 *
 * Zweck: Gate für F45 B2b-4a-2b-1 „Regeln und node_modules“ (features/F45/plan-b2b4a2b.md; F-1157 (1)(2)(3)(7), V1, V2, O2).
 * Attrappen (Antworten, Test-Repo) entstehen zur Laufzeit, nichts eingecheckt (F-1134).
 * (a) Quelle: sichernQuelle — jeder Ablauf mit Arbeitsordner (jeder Status außer kein_bedarf/bestand) ⇒ 'ablauf' (?workflow=);
 *     kein_bedarf ⇒ 'keinBedarf', bestand ⇒ 'projekt', fehlendes Feld ⇒ 'unbekannt' (kein stiller Projektordner).
 * (b) push/Branch/origin: ablaufSicherBefehle — fremder Branch, losgelöst, main, Branch nicht lesbar ⇒ kein Block; ohne origin
 *     Hinweis keinOrigin, origin nicht lesbar Hinweis originUnbekannt (nie still), je ohne push; passend ⇒ genau ein push-Block
 *     [& {, Ortszeile des Arbeitsordners, git push -u origin <Branch des Arbeitsordners>, }]; Ort nie aus absoluterPfad; gekappte
 *     Liste mit Commits voraus ⇒ trotzdem push (V2); gekappt ohne voraus ⇒ kein push und kein origin-Hinweis.
 * (c) node_modules: istNodeModulesPfad (auch „node_modules“ ohne Schrägstrich, Verknüpfung); echtes Test-Repo über
 *     baueCodeProjektion — neue Dateien unter node_modules (oben und als Pfadteil) fehlen in eintraege, zählen weder in anzahl
 *     noch in gekappt, Feld nodeModules = Anzahl; getrackte und gestagte Änderungen darunter bleiben; kein git add enthält eine
 *     neue node_modules-Datei; Hinweis 'nodeModules' neben Blöcken und neben einem Grund, nie ohne ausgelassene Dateien (auch
 *     nicht bei fehlendem Feld, älterer Server); älterer Server mit gekappter Liste ⇒ gekappt; #/code (views/code.js) zeigt den
 *     Hinweis nur bei nodeModulesAnzahl > 0, fügt ihn ein und hat für die leere Liste einen eigenen Text.
 * (d) Neuladen-Schlüssel (V1): sichernSchluessel wechselt bei Aufräumen (ENTFERNT), laufender Vorbereitung, neuer Fassung und
 *     Ablauf-Status, nicht bei gleichem Stand.
 * (e) i18n: jeder Grund und Hinweis, den die Regeln liefern können, und die neuen Texte von #/code in de/en/tr/ru, ohne interne
 *     Kennung (wf/, workflow-, F-<Zahl>, B2b).
 * Gegenproben im Gate: je Teil verfälschte Regeln bzw. Eingänge (Quelle 'projekt' für BEREIT, push trotz fremdem Branch, push an
 * die Kappung gebunden, origin nicht lesbar still, Ort aus absoluterPfad, node_modules in git add, getrackte node_modules
 * ausgelassen, Hinweis fehlt/unbedingt, Schlüssel nur Ablauf-Status, fehlender ru-Schlüssel) — jede muss erkannt werden.
 *
 * Wird aufgerufen von: `npm run check:gates` (und damit `npm run check`).
 *
 * Aufruf: node scripts/check-f45-b2b4a2b1-regeln.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ablaufSicherBefehle, istNodeModulesPfad, psArgument, sicherBefehle, sichernQuelle, sichernSchluessel } from '../public/leitstand/code-daten.js'
import de from '../public/leitstand/i18n/de.js'
import en from '../public/leitstand/i18n/en.js'
import ru from '../public/leitstand/i18n/ru.js'
import tr from '../public/leitstand/i18n/tr.js'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { baueCodeProjektion } from './leitstand/routen-code.mjs'
import { schalteGitWartungAb } from './_wegwerf.ts'

const befunde = []

/**
 * Hält ein Ergebnis fest: ohne Befund ✓-Zeile, sonst Befund.
 * @param b - Befunde des Teils
 * @param gruen - Meldung im Grünfall
 * @param teil - Kennung des Teils
 */
function pruefe(b, gruen, teil) {
  if (b.length === 0) console.log(`✓ ${gruen}`)
  else befunde.push(`${teil} ${b.join(' | ')}`)
}

// ─── (a) Quelle ───────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Prüft eine Quellen-Regel.
 * @param quelle - (ao) => Quelle
 * @returns Befunde
 */
function pruefeQuelle(quelle) {
  const b = []
  for (const status of ['fehlt', 'IN_VORBEREITUNG', 'BEREIT', 'FEHLGESCHLAGEN', 'ENTFERNT', 'UNBEKANNT_NEU']) if (quelle({ status }) !== 'ablauf') b.push(`${status} ⇒ ${quelle({ status })} statt ablauf`)
  if (quelle({ status: 'kein_bedarf' }) !== 'keinBedarf') b.push('kein_bedarf nicht getrennt')
  if (quelle({ status: 'bestand' }) !== 'projekt') b.push('bestand nicht Projektordner')
  if (quelle(null) !== 'unbekannt' || quelle(undefined) !== 'unbekannt') b.push('fehlendes Feld fällt still auf einen Ort zurück')
  return b
}

pruefe(pruefeQuelle(sichernQuelle), '(a) Quelle: jeder Ablauf mit Arbeitsordner über ?workflow=; kein_bedarf/bestand getrennt; unbekannt ohne Rückfall.', '(a)')

// ─── (b) push/Branch/origin ───────────────────────────────────────────────────────────────────────────────────────────

const AO_PFAD = join(tmpdir(), "haushaltsbuch-laeufe", "a1 [b]'c")
const AO_BRANCH = 'wf/ablauf-1'
const PROJEKT = join(tmpdir(), 'haushaltsbuch')
const ORT = `Set-Location -LiteralPath ${psArgument(AO_PFAD)} -ErrorAction Stop`
const PUSH = ['& {', ORT, `git push -u origin ${psArgument(AO_BRANCH)}`, '}']

/**
 * Antwort von GET …/code?workflow=<id> (Grünfall bereit/commit), mit Überschreibungen.
 * @param zusatz - Felder der Projektion
 * @param sichern - Felder von ablauf.sichern
 * @returns Antwort
 */
function antwort(zusatz = {}, sichern = {}) {
  return {
    status: 'ok',
    absoluterPfad: PROJEKT,
    branch: { status: 'ok', name: AO_BRANCH, losgeloest: false },
    remoteWebUrl: { status: 'ok', url: null, origin: true },
    dateien: { status: 'ok', eintraege: [{ pfad: 'src/a.ts', art: 'M', xy: ' M' }], anzahl: 1, gekappt: false, nodeModules: 0 },
    ablauf: { workflowId: 'ablauf-1', bedarf: 'pflicht', workflowStatus: 'ABGESCHLOSSEN', arbeitsordner: { pfad: AO_PFAD, branch: AO_BRANCH }, sichern: { bereit: true, art: 'commit', grund: null, offeneAenderungen: 1, voraus: 0, ...sichern } },
    ...zusatz,
  }
}

const hatPush = (e) => (e.bloecke ?? []).some((bl) => bl.zeilen.some((z) => z.startsWith('git push')))

/**
 * Prüft die Befehls-Regel eines Ablaufs.
 * @param regel - (antwort) => Ergebnis wie ablaufSicherBefehle
 * @returns Befunde
 */
function pruefePush(regel) {
  const b = []
  for (const [name, branch] of [
    ['fremder Branch', { status: 'ok', name: 'feat/anderer', losgeloest: false }],
    ['losgelöst', { status: 'ok', name: null, losgeloest: true }],
    ['main', { status: 'ok', name: 'main', losgeloest: false }],
    ['Branch nicht lesbar', { status: 'fehler', grund: 'x' }],
  ]) {
    const e = regel(antwort({ branch }, { voraus: 2 }))
    if ((e.bloecke ?? []).length > 0) b.push(`${name}: Block erzeugt`)
  }
  const ohne = regel(antwort({ remoteWebUrl: { status: 'ok', url: null, origin: false } }, { voraus: 2 }))
  if (hatPush(ohne) || !(ohne.hinweise ?? []).includes('keinOrigin')) b.push('ohne origin: push oder kein Hinweis')
  const unlesbar = regel(antwort({ remoteWebUrl: { status: 'fehler', grund: 'x' } }, { voraus: 2 }))
  if (hatPush(unlesbar) || !(unlesbar.hinweise ?? []).includes('originUnbekannt')) b.push('origin nicht lesbar: push oder still')
  const gut = regel(antwort())
  const pushBloecke = (gut.bloecke ?? []).filter((bl) => bl.art === 'push')
  if (pushBloecke.length !== 1 || JSON.stringify(pushBloecke[0].zeilen) !== JSON.stringify(PUSH)) b.push(`passend: push-Block ${JSON.stringify(pushBloecke.map((bl) => bl.zeilen))}`)
  if ((gut.bloecke ?? []).some((bl) => bl.zeilen[1] !== ORT)) b.push('Ort nicht aus ablauf.arbeitsordner.pfad')
  const gekappt = regel(antwort({ dateien: { status: 'ok', eintraege: [{ pfad: 'a', art: 'M', xy: ' M' }], anzahl: 900, gekappt: true, nodeModules: 0 } }, { voraus: 2 }))
  if (!hatPush(gekappt)) b.push('gekappt mit voraus: kein push (an die Kappung gebunden, V2)')
  const nurPush = regel(antwort({ dateien: { status: 'ok', eintraege: [], anzahl: 0, gekappt: false, nodeModules: 0 } }, { art: 'push', offeneAenderungen: 0, voraus: 1 }))
  if (!hatPush(nurPush)) b.push('bereit (push) ohne push-Block')
  const nichts = regel(antwort({ dateien: { status: 'ok', eintraege: [{ pfad: 'a', art: 'M' }], anzahl: 900, gekappt: true } }, { voraus: 0 }))
  if (hatPush(nichts)) b.push('gekappt ohne voraus: push ohne Commit')
  // origin-Hinweise nur, wenn ein push anstünde (cr 3).
  const nichtsOhneOrigin = regel(antwort({ dateien: { status: 'ok', eintraege: [{ pfad: 'a', art: 'M' }], anzahl: 900, gekappt: true }, remoteWebUrl: { status: 'ok', url: null, origin: false } }, { voraus: 0 }))
  if ((nichtsOhneOrigin.hinweise ?? []).includes('keinOrigin')) b.push('„ohne git push“-Hinweis, obwohl nichts zu pushen ist')
  return b
}

pruefe(pruefePush(ablaufSicherBefehle), '(b) push nur bei passendem Branch und origin, unabhängig von der Kappung; origin nicht lesbar sichtbar; Ort aus dem Arbeitsordner.', '(b)')

// ─── (c) node_modules ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Prüft die Regel istNodeModulesPfad.
 * @param regel - (pfad) => boolean
 * @returns Befunde
 */
function pruefeRegel(regel) {
  const b = []
  // „node_modules“ ohne Schrägstrich: so meldet git eine Verknüpfung (qa 1).
  for (const p of ['node_modules/a.js', 'paket/node_modules/x/y.js', 'node_modules']) if (!regel(p)) b.push(`${p} nicht erkannt`)
  for (const p of ['meine_node_modules/a.js', 'src/node_modules.ts', 'node_modules2/a.js']) if (regel(p)) b.push(`${p} fälschlich erkannt`)
  return b
}

/**
 * Prüft eine Projektion des Test-Repos.
 * @param p - Antwort von baueCodeProjektion
 * @param erwartet - { neu: Anzahl neuer node_modules-Dateien, bleiben: Pfade, die in der Liste stehen müssen }
 * @returns Befunde
 */
function pruefeProjektion(p, erwartet) {
  const b = []
  const eintraege = p.dateien?.eintraege ?? []
  const pfade = eintraege.map((e) => e.pfad)
  if (eintraege.some((e) => e.art === '??' && istNodeModulesPfad(e.pfad))) b.push('neue node_modules-Datei in der Liste')
  for (const pf of erwartet.bleiben) if (!pfade.includes(pf)) b.push(`${pf} fehlt (getrackt/gestagt muss bleiben)`)
  if (p.dateien?.anzahl !== erwartet.bleiben.length) b.push(`anzahl ${p.dateien?.anzahl} statt ${erwartet.bleiben.length}`)
  if (p.dateien?.gekappt !== false) b.push('neue node_modules-Dateien kappen die Liste')
  if (p.dateien?.nodeModules !== erwartet.neu) b.push(`nodeModules ${p.dateien?.nodeModules} statt ${erwartet.neu}`)
  const add = (sicherBefehle(p).bloecke ?? []).flat().filter((z) => z.startsWith('git add')).join(' ')
  if (/node_modules\/pkg|paket\/node_modules/.test(add)) b.push('neue node_modules-Datei in git add')
  if (!(sicherBefehle(p).hinweise ?? []).includes('nodeModules')) b.push('Hinweis nodeModules fehlt')
  return b
}

/**
 * Prüft die Hinweis-Regel (neben Blöcken und neben einem Grund) und dass git add keine neue node_modules-Datei eines älteren
 * Servers übernimmt.
 * @param befehle - (daten) => wie sicherBefehle
 * @param ablauf - (antwort) => wie ablaufSicherBefehle
 * @returns Befunde
 */
function pruefeHinweis(befehle, ablauf) {
  const b = []
  const mit = antwort({ dateien: { status: 'ok', eintraege: [{ pfad: 'src/a.ts', art: 'M', xy: ' M' }], anzahl: 1, gekappt: false, nodeModules: 3 } })
  if (!(befehle(mit).hinweise ?? []).includes('nodeModules')) b.push('#/code: Hinweis neben Blöcken fehlt')
  if (!(befehle({ ...mit, dateien: { ...mit.dateien, gekappt: true } }).hinweise ?? []).includes('nodeModules')) b.push('#/code: Hinweis neben Grund fehlt')
  if (!(ablauf({ ...mit, branch: { status: 'ok', name: 'x/y', losgeloest: false } }).hinweise ?? []).includes('nodeModules')) b.push('Ablauf: Hinweis neben Grund fehlt')
  if ((befehle(antwort()).hinweise ?? []).includes('nodeModules')) b.push('Hinweis ohne ausgelassene Dateien')
  const ohneFeld = antwort()
  delete ohneFeld.dateien.nodeModules
  if ((befehle(ohneFeld).hinweise ?? []).includes('nodeModules') || (ablauf(ohneFeld).hinweise ?? []).includes('nodeModules')) b.push('älterer Server ohne Feld: Hinweis erfunden')
  if ((ablauf(antwort()).hinweise ?? []).includes('nodeModules')) b.push('Ablauf: Hinweis ohne ausgelassene Dateien')
  if (!(ablauf(mit).hinweise ?? []).includes('nodeModules')) b.push('Ablauf: Hinweis neben Blöcken fehlt')
  // Älterer Server, gekappt, nur node_modules sichtbar: gekappt statt „nichts zu sichern“ (cr 1).
  const altGekappt = antwort({ dateien: { status: 'ok', eintraege: [{ pfad: 'node_modules/a.js', art: '??', xy: '??' }], anzahl: 900, gekappt: true } })
  if (befehle(altGekappt).grund !== 'gekappt') b.push(`älterer Server gekappt: ${befehle(altGekappt).grund} statt gekappt`)
  const alt = antwort({ dateien: { status: 'ok', eintraege: [{ pfad: 'src/a.ts', art: 'M', xy: ' M' }, { pfad: 'node_modules/neu.js', art: '??', xy: '??' }], anzahl: 2, gekappt: false } })
  for (const [name, e] of [
    ['#/code', befehle(alt).bloecke ?? []],
    ['Ablauf', (ablauf(alt).bloecke ?? []).map((bl) => bl.zeilen)],
  ])
    if (e.flat().some((z) => z.startsWith('git add') && z.includes('node_modules/neu.js'))) b.push(`${name}: neue node_modules-Datei (älterer Server) in git add`)
  return b
}

/** Quelltext von #/code: Hinweis nur bei nodeModulesAnzahl > 0. */
const CODE_VIEW = readFileSync('public/leitstand/views/code.js', 'utf8')

/**
 * Prüft, dass #/code den Hinweis bedingt zeigt.
 * @param text - Quelltext von views/code.js
 * @returns Befunde
 */
function pruefeView(text) {
  const b = []
  if (!text.includes('nodeModulesAnzahl(daten)')) b.push('views/code.js liest nodeModulesAnzahl nicht')
  if (!/nodeModules > 0 \? `[^`]*code\.dateien\.nodeModules/.test(text)) b.push('views/code.js zeigt code.dateien.nodeModules nicht nur bei nodeModules > 0')
  if (!/nodeModules > 0 \? tHtml\('code\.dateien\.nurNodeModules'/.test(text)) b.push('views/code.js: leere Liste mit node_modules nicht mit eigenem Text')
  if (!/\$\{nmHinweis\}/.test(text)) b.push('views/code.js fügt den Hinweis nicht ein')
  return b
}

const g = (repo, ...args) => execFileSync('git', ['-c', 'user.name=Gate', '-c', 'user.email=gate@example.invalid', '-c', 'commit.gpgsign=false', '-c', 'core.autocrlf=false', ...args], { cwd: repo, encoding: 'utf8' })
const repo = mkdtempSync(join(tmpdir(), 'f45-b2b4a2b1-nm-'))
let projektion
const BLEIBEN = ['b.txt', 'meine_node_modules/echt.js', 'node_modules/gestagt.js', 'node_modules/vendored.js']
const NEU = 505 + 1
try {
  g(repo, 'init', '-q', '-b', 'main')
  schalteGitWartungAb(repo)
  mkdirSync(join(repo, 'node_modules', 'pkg'), { recursive: true })
  writeFileSync(join(repo, 'node_modules', 'vendored.js'), 'alt\n')
  writeFileSync(join(repo, 'a.txt'), 'a\n')
  g(repo, 'add', 'a.txt', 'node_modules/vendored.js')
  g(repo, 'commit', '-q', '-m', 'start')
  g(repo, 'checkout', '-q', '-b', 'feat/f45-gate-nm')
  writeFileSync(join(repo, 'node_modules', 'vendored.js'), 'neu\n')
  writeFileSync(join(repo, 'node_modules', 'gestagt.js'), 'g\n')
  g(repo, 'add', 'node_modules/gestagt.js')
  for (let i = 0; i < 505; i++) writeFileSync(join(repo, 'node_modules', 'pkg', `f${String(i).padStart(3, '0')}.js`), 'x')
  mkdirSync(join(repo, 'paket', 'node_modules'), { recursive: true })
  writeFileSync(join(repo, 'paket', 'node_modules', 'y.js'), 'y')
  mkdirSync(join(repo, 'meine_node_modules'))
  writeFileSync(join(repo, 'meine_node_modules', 'echt.js'), 'e')
  writeFileSync(join(repo, 'b.txt'), 'b\n')
  projektion = await baueCodeProjektion({ repoWurzel: repo })
} finally {
  raeumeVerzeichnis(repo)
}

// Ohne lesbare Projektion (z. B. kein Git) ein sauberer Befund statt eines Abbruchs (cr 4).
const projektionOk = projektion?.dateien?.status === 'ok'
pruefe(
  [
    ...pruefeRegel(istNodeModulesPfad),
    ...(projektionOk ? pruefeProjektion(projektion, { neu: NEU, bleiben: BLEIBEN }) : [`Test-Repo nicht lesbar: ${projektion?.dateien?.grund ?? projektion?.grund ?? projektion?.status}`]),
    ...pruefeHinweis(sicherBefehle, ablaufSicherBefehle),
    ...pruefeView(CODE_VIEW),
  ],
  `(c) node_modules: ${NEU} neue Dateien ausgelassen und gezählt, getrackte/gestagte bleiben, nie in git add, Hinweis sichtbar und nur bei Bedarf.`,
  '(c)'
)

// ─── (d) Neuladen-Schlüssel ───────────────────────────────────────────────────────────────────────────────────────────

/**
 * Prüft eine Schlüssel-Regel.
 * @param schluessel - (detail) => Text
 * @returns Befunde
 */
function pruefeSchluessel(schluessel) {
  const b = []
  const basis = { daten: { status: 'ABGESCHLOSSEN' }, arbeitsordner: { status: 'BEREIT', vorbereitungLaeuft: false }, versionSequenz: 2 }
  const s = schluessel(basis)
  if (schluessel(structuredClone(basis)) !== s) b.push('gleicher Stand ⇒ anderer Schlüssel')
  for (const [name, d] of [
    ['Aufräumen (ENTFERNT)', { ...basis, arbeitsordner: { status: 'ENTFERNT', vorbereitungLaeuft: false } }],
    ['Vorbereitung/Aufräumen läuft', { ...basis, arbeitsordner: { status: 'BEREIT', vorbereitungLaeuft: true } }],
    ['neue Fassung', { ...basis, versionSequenz: 3 }],
    ['Ablauf-Status', { ...basis, daten: { status: 'GESTOPPT' } }],
  ])
    if (schluessel(d) === s) b.push(`${name} ⇒ gleicher Schlüssel`)
  return b
}

pruefe(pruefeSchluessel(sichernSchluessel), '(d) Neuladen-Schlüssel: Ablauf-Status, Ordner-Status, laufende Vorbereitung und Fassung.', '(d)')

// ─── (e) i18n ─────────────────────────────────────────────────────────────────────────────────────────────────────────

const SCHLUESSEL = [
  ...['nichtBereit', 'keinOrt', 'branchFehler', 'losgeloest', 'aufMain', 'fremderBranch', 'nurNodeModules', 'keineAenderungen', 'gekappt', 'keinBranch', 'dateienFehler', 'keinVorschlag'].map((g) => `code.sichern.grund.${g}`),
  ...['keinOrigin', 'originUnbekannt', 'nodeModules'].map((h) => `code.sichern.hinweis.${h}`),
  'code.dateien.nodeModules',
  'code.dateien.nurNodeModules',
]

/**
 * Prüft die Schlüssel in allen Sprachen.
 * @param sprachen - { de, en, tr, ru }
 * @returns Befunde
 */
function pruefeI18n(sprachen) {
  const b = []
  for (const [sprache, texte] of Object.entries(sprachen)) {
    for (const k of SCHLUESSEL) {
      const wert = texte[k]
      const alle = typeof wert === 'string' ? [wert] : wert !== null && typeof wert === 'object' ? Object.values(wert) : []
      if (alle.length === 0 || alle.some((x) => typeof x !== 'string' || x.trim() === '')) b.push(`${k} fehlt in ${sprache}`)
      else if (alle.some((x) => /wf\/|workflow-|F-\d|B2b/.test(x))) b.push(`${k} trägt eine Kennung in ${sprache}`)
    }
  }
  return b
}

pruefe(pruefeI18n({ de, en, tr, ru }), `(e) i18n: ${SCHLUESSEL.length} Gründe/Hinweise/Texte in de/en/tr/ru, ohne interne Kennung.`, '(e)')

// ─── Gegenproben ─────────────────────────────────────────────────────────────────────────────────────────────────────

{
  // Ignoriert den echten Branch (prüft ihn also nicht).
  const ohnePruefung = (a) => ablaufSicherBefehle({ ...a, branch: { status: 'ok', name: AO_BRANCH, losgeloest: false } })
  const anKappung = (a) => {
    const e = ablaufSicherBefehle(a)
    return a.dateien?.gekappt ? { ...e, bloecke: (e.bloecke ?? []).filter((bl) => bl.art !== 'push') } : e
  }
  const still = (a) => {
    const e = ablaufSicherBefehle(a)
    return { ...e, hinweise: (e.hinweise ?? []).filter((h) => h !== 'originUnbekannt') }
  }
  const ausProjekt = (a) => ablaufSicherBefehle({ ...a, ablauf: { ...a.ablauf, arbeitsordner: { ...a.ablauf.arbeitsordner, pfad: a.absoluterPfad } } })
  const mitNmAdd = (d) => {
    const e = sicherBefehle(d)
    return e.bloecke ? { ...e, bloecke: e.bloecke.map((bl, i) => (i === 0 ? [bl[0], bl[1], 'git add node_modules/neu.js', ...bl.slice(2)] : bl)) } : e
  }
  const ohneHinweis = (d) => {
    const e = sicherBefehle(d)
    return { ...e, hinweise: (e.hinweise ?? []).filter((h) => h !== 'nodeModules') }
  }
  const rot = [
    ['Quelle projekt für BEREIT', pruefeQuelle((ao) => (ao?.status === 'BEREIT' ? 'projekt' : sichernQuelle(ao)))],
    ['Quelle bestand = kein_bedarf', pruefeQuelle((ao) => (ao?.status === 'bestand' ? 'keinBedarf' : sichernQuelle(ao)))],
    ['push trotz fremdem Branch', pruefePush(ohnePruefung)],
    ['push an die Kappung gebunden', pruefePush(anKappung)],
    ['origin nicht lesbar still', pruefePush(still)],
    ['Ort aus absoluterPfad', pruefePush(ausProjekt)],
    ['Regel erkennt nur Anfang', pruefeRegel((p) => p.startsWith('node_modules/'))],
    ['Regel nur mit Schrägstrich (Verknüpfung)', pruefeRegel((p) => /(?:^|\/)node_modules\//.test(p))],
    ['node_modules in git add', pruefeHinweis(mitNmAdd, ablaufSicherBefehle)],
    ['Hinweis fehlt', pruefeHinweis(ohneHinweis, ablaufSicherBefehle)],
    ['Hinweis unbedingt in der Regel', pruefeHinweis((d) => ({ ...sicherBefehle(d), hinweise: ['nodeModules'] }), ablaufSicherBefehle)],
    ['Ablauf ohne Hinweis', pruefeHinweis(sicherBefehle, (a) => ({ ...ablaufSicherBefehle(a), hinweise: [] }))],
    ['älterer Server gekappt ⇒ nichts zu sichern', pruefeHinweis((d) => (d.dateien?.gekappt && d.dateien.eintraege.every((e) => e.art === '??') ? { grund: 'nurNodeModules' } : sicherBefehle(d)), ablaufSicherBefehle)],
    ['origin-Hinweis ohne fälligen push', pruefePush((a) => (a.remoteWebUrl?.origin === false ? { ...ablaufSicherBefehle(a), hinweise: ['keinOrigin'] } : ablaufSicherBefehle(a)))],
    ['Hinweis unbedingt in #/code', pruefeView(CODE_VIEW.replace(/nodeModules > 0 \? `/, 'true ? `'))],
    ['Hinweis nicht eingefügt', pruefeView(CODE_VIEW.replaceAll('${nmHinweis}', ''))],
    ['leere Liste ohne eigenen Text', pruefeView(CODE_VIEW.replace("tHtml('code.dateien.nurNodeModules'", "tHtml('code.dateien.keine'"))],
    ['Schlüssel nur Ablauf-Status', pruefeSchluessel((d) => String(d?.daten?.status))],
    ['ru ohne Schlüssel', pruefeI18n({ ru: { ...ru, 'code.sichern.hinweis.originUnbekannt': undefined } })],
    ['Kennung im Text', pruefeI18n({ de: { ...de, 'code.sichern.grund.keinOrt': 'Ordner wf/abc fehlt' } })],
  ]
  if (projektionOk) {
    rot.push(
      ['neue node_modules-Datei in der Liste', pruefeProjektion({ ...projektion, dateien: { ...projektion.dateien, eintraege: [...projektion.dateien.eintraege, { pfad: 'node_modules/pkg/f000.js', art: '??' }] } }, { neu: NEU, bleiben: BLEIBEN })],
      ['getrackte node_modules ausgelassen', pruefeProjektion({ ...projektion, dateien: { ...projektion.dateien, eintraege: projektion.dateien.eintraege.filter((e) => e.pfad !== 'node_modules/vendored.js'), anzahl: 3 } }, { neu: NEU, bleiben: BLEIBEN })]
    )
  }
  const verfehlt = rot.filter(([, b]) => b.length === 0).map(([name]) => name)
  pruefe(verfehlt.length === 0 ? [] : [`nicht erkannt: ${verfehlt.join(', ')}`], `(g) Gegenproben: ${rot.length} verfälschte Regeln/Eingänge erkannt.`, '(g)')
}

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e):`)
  for (const b of befunde) console.error(`  - ${b}`)
  process.exit(1)
}
console.log('\n✓ Keine Befunde.')
