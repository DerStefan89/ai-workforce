#!/usr/bin/env node
/**
 * Datei: scripts/check-f45-b2b4a1-sichern.mjs
 *
 * Zweck: Gate für F45 B2b-4a-1 „Bereit zum Sichern“, Server-Teil (features/F45/plan-b2b4a1.md; F-979, F-1087): die
 * Ableitung (scripts/leitstand/ablauf-sichern.mjs) und der Parameter ?workflow=<id> an GET /api/code und /api/code/diff.
 * Prüft über einen echten Handler mit Attrappen, die zur Laufzeit entstehen (tmp-Repo auf `main`, Arbeitsordner über den
 * echten Startweg mit Attrappen-Worker; nichts eingecheckt, F-1134):
 * (a) Ableitung: jeder Zweig, Reihenfolge, Rotfälle (je eine Bedingung gekippt ⇒ anderes Ergebnis), Texte ohne Kennung;
 *     Quelltextprüfung von loeseCodeOrt: die 409 setzt nie einen Schlüssel null (`?? 'nichtBestimmbar'`, Wettlauf), und eine
 *     laufende Vorbereitung bzw. ein laufendes Aufräumen ergibt 409 (`arbeitsordnerVorbereitungLaeuft.has(roh)`) — beides
 *     über HTTP nicht deterministisch erzeugbar; die Gegenprobe steht als Mutationsprobe im Bericht.
 * (b) ?workflow= über HTTP: Arbeitsordner bereit, Ablauf noch nicht abgeschlossen ⇒ 200 im Arbeitsordner, nichtAbgeschlossen;
 *     abgeschlossen ohne Änderung ⇒ nichtsOffen; Datei geändert ⇒ bereit/commit; Commit im Arbeitsordner ⇒ bereit/push;
 *     /api/code/diff im Arbeitsordner (ein Pfad nur im Projektordner ⇒ 400); ohne Arbeitsordner (kein Bedarf, Bestand) ⇒
 *     Projektordner, keinArbeitsordner; Vorbereitung läuft ⇒ 409 inVorbereitung; Pflicht ohne Ordner ⇒ 409 nichtAngelegt;
 *     Ordner entfernt ⇒ 409 ordnerFehlt; aufgeräumt ⇒ 409 aufgeraeumt; unbekannt ⇒ 404 (auch `a:b`, genau 200 Zeichen, Alias
 *     in anderer Schreibweise — nie 500); leer, `../x`, zu lang, Steuerzeichen, mehrfach ⇒ 400; fremde Herkunft ⇒ 403 (auch
 *     mit ungültiger id, vor der 400); kein Antworttext nennt die id oder gibt den Rohwert wieder.
 * (c) ohne Parameter bitgleich: GET /api/code = direkter Aufruf baueCodeProjektion (ohne Zeitfelder), kein Feld ablauf;
 *     gleichzeitige Abrufe mit und ohne Parameter desselben Orts teilen genau einen Aufbau, die Antwort ohne Parameter trägt
 *     kein ablauf; /api/code/diff ohne Parameter im Projektordner.
 * (d) die id ist nie ein Git-Argument: Spion über die Handler-Option codeGit — kein argv-Element enthält die id, cwd ist der
 *     Arbeitsordner bzw. der Projektordner.
 * (e) `starteWorkflowSchritt(` genau 6× im Server (die Zeilen-Ratsche prüft check-wachstumsbremse-server in derselben Kette).
 *
 * Wird aufgerufen von: `npm run check:gates` (und damit `npm run check`).
 *
 * Aufruf: node scripts/check-f45-b2b4a1-sichern.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { ladeArtefaktVersion, registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { arbeitsordnerGrund, leiteSichernLageAb, SICHERN_GRUENDE, SICHERN_GRUND_TEXT } from './leitstand/ablauf-sichern.mjs'
import { baueCodeProjektion, fuehreGitAus } from './leitstand/routen-code.mjs'
import { erzeugeRequestHandler } from './leitstand-server.mjs'

const befunde = []
console.log('\n=== F45-B2b-4a-1-Sichern-Check ===\n')

const aufraeumen = []
const dienste = []

/**
 * Meldet einen Fall: ✓ bei erfüllter Bedingung, sonst ein Befund.
 * @param bedingung - erfüllt?
 * @param ok - Text bei Erfolg
 * @param fehler - Befundtext
 */
function pruefe(bedingung, ok, fehler) {
  if (bedingung) console.log(`  ✓ ${ok}`)
  else befunde.push(fehler)
}

/** Wartet ms Millisekunden. @param ms - Dauer @returns Promise */
const verzoegerung = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Wartet, bis `pruefen` einen wahren Wert liefert, höchstens maxMs.
 * @param pruefen - (asynchrone) Prüffunktion
 * @param maxMs - Zeitgrenze
 * @returns letzter Wert von pruefen
 */
async function warteBis(pruefen, maxMs = 20000) {
  const ende = Date.now() + maxMs
  let wert = await pruefen()
  while (!wert && Date.now() < ende) {
    await verzoegerung(25)
    wert = await pruefen()
  }
  return wert
}

/** git im Ordner cwd (synchron, wirft bei Fehler). @param cwd - Ordner @param argumente - argv @returns stdout */
const git = (cwd, argumente) => execFileSync('git', argumente, { cwd, encoding: 'utf8' })

/**
 * Benennt um und wiederholt bei EPERM/EBUSY (Virenscanner, Indexdienst unter Windows; bekannte Falle CLAUDE.md).
 * @param von - Quelle
 * @param nach - Ziel
 */
async function benenneUm(von, nach) {
  for (let versuch = 1; ; versuch++) {
    try {
      renameSync(von, nach)
      return
    } catch (fehler) {
      if (versuch >= 10 || (fehler?.code !== 'EPERM' && fehler?.code !== 'EBUSY')) throw fehler
      await verzoegerung(100 * versuch)
    }
  }
}

// ── (a) Ableitung (rein) und Quelltext ─────────────────────────────────────────────────────────────────────────────────
{
  const p = (anzahl, voraus) => ({ status: 'ok', dateien: { status: 'ok', anzahl }, basis: { status: 'ok', voraus } })
  const lage = (workflowStatus, bedarf, projektion) => leiteSichernLageAb({ workflowStatus, bedarf, projektion })
  const faelle = [
    [lage('ABGESCHLOSSEN', 'pflicht', p(1, 0)), true, 'commit', null],
    [lage('ABGESCHLOSSEN', 'pflicht', p(0, 2)), true, 'push', null],
    [lage('ABGESCHLOSSEN', 'pflicht', p(0, 0)), false, null, 'nichtsOffen'],
    [lage('GESTOPPT', 'pflicht', p(1, 1)), false, null, 'nichtAbgeschlossen'],
    [lage('ABGESCHLOSSEN', 'kein_bedarf', p(1, 1)), false, null, 'keinArbeitsordner'],
    [lage('ABGESCHLOSSEN', 'pflicht', { ...p(1, 1), basis: { status: 'fehler' } }), false, null, 'nichtBestimmbar'],
  ]
  pruefe(
    faelle.every(([e, bereit, art, grund]) => e.bereit === bereit && e.art === art && e.grund === grund),
    '(a1) Ableitung: commit, push, nichtsOffen, nichtAbgeschlossen (GESTOPPT, auch nach Ablehnung), keinArbeitsordner, nichtBestimmbar.',
    `(a1) ${JSON.stringify(faelle.map(([e]) => e))}`
  )
  // Rotfälle: je eine Bedingung des Grünfalls gekippt ⇒ nicht mehr bereit.
  const gruen = lage('ABGESCHLOSSEN', 'pflicht', p(1, 1))
  const gekippt = [lage('LAEUFT', 'pflicht', p(1, 1)), lage('ABGESCHLOSSEN', 'bestand', p(1, 1)), lage('ABGESCHLOSSEN', 'pflicht', { ...p(1, 1), status: 'nicht_verfuegbar' }), lage('ABGESCHLOSSEN', 'pflicht', p(0, 0))]
  pruefe(gruen.bereit && gekippt.every((e) => !e.bereit && e.grund !== null), '(a2) Rotfälle: jede gekippte Bedingung nimmt „bereit“ zurück.', `(a2) ${JSON.stringify({ gruen, gekippt })}`)
  const ordner = [
    [{ status: 'fehlt' }, 'nichtAngelegt'],
    [{ status: 'ENTFERNT' }, 'aufgeraeumt'],
    [{ status: 'IN_VORBEREITUNG', vorbereitungLaeuft: true }, 'inVorbereitung'],
    [{ status: 'BEREIT', vorbereitungLaeuft: true, ordnerVorhanden: true }, 'inVorbereitung'],
    [{ status: 'FEHLGESCHLAGEN' }, 'fehlgeschlagen'],
    [{ status: 'BEREIT', ordnerVorhanden: false }, 'ordnerFehlt'],
    [{ status: 'BEREIT', ordnerVorhanden: true }, null],
    [{ status: 'kein_bedarf' }, null],
    [{ status: 'unbekannt' }, 'nichtBestimmbar'],
  ]
  pruefe(ordner.every(([ao, s]) => arbeitsordnerGrund(ao) === s), '(a3) Ordnerlage: nichtAngelegt, aufgeraeumt, inVorbereitung (auch Aufräumen läuft), fehlgeschlagen, ordnerFehlt, bereit, kein Bedarf, unbekannt.', `(a3) ${JSON.stringify(ordner.map(([ao]) => arbeitsordnerGrund(ao)))}`)
  const texte = Object.values(SICHERN_GRUND_TEXT)
  pruefe(
    isDeepStrictEqual(Object.keys(SICHERN_GRUND_TEXT).sort(), [...SICHERN_GRUENDE].sort()) && texte.every((x) => typeof x === 'string' && x !== '' && !/wf\/|workflow-|[A-Za-z]:\\|\\/.test(x)),
    '(a4) eine Liste der Gründe, je Grund ein Text ohne Kennung und ohne Pfad.',
    `(a4) ${JSON.stringify(SICHERN_GRUND_TEXT)}`
  )
  const server = readFileSync('scripts/leitstand-server.mjs', 'utf8')
  const quelle = server.slice(server.indexOf('function loeseCodeOrt('), server.indexOf('function loeseCodeOrt(') + 2500)
  pruefe(
    quelle.includes("arbeitsordnerGrund(baueArbeitsordnerProjektion(roh, version.daten)) ?? 'nichtBestimmbar'") && quelle.includes('if (!laufort.ok || arbeitsordnerVorbereitungLaeuft.has(roh))'),
    '(a5) Quelltextprüfung loeseCodeOrt: kein Schlüssel null in der 409; laufende Vorbereitung bzw. laufendes Aufräumen ⇒ 409, auch wenn der Ordner noch da ist.',
    '(a5) Rückfall ?? \'nichtBestimmbar\' oder Prüfung arbeitsordnerVorbereitungLaeuft.has(roh) fehlt in loeseCodeOrt'
  )
}

// ── Umgebung: tmp-Repo auf main, Handler mit Arbeitsordner, haltbarer npm-Attrappe und Git-Spion ──────────────────────
const basis = join(tmpdir(), `f45-b2b4a1-${randomUUID().slice(0, 8)}`)
aufraeumen.push(basis)
const repoWurzel = join(basis, 'projekt')
mkdirSync(join(repoWurzel, '.claude'), { recursive: true })
git(repoWurzel, ['init', '--quiet'])
git(repoWurzel, ['config', 'user.email', 'test@example.invalid'])
git(repoWurzel, ['config', 'user.name', 'Test'])
git(repoWurzel, ['config', 'core.autocrlf', 'false'])
git(repoWurzel, ['checkout', '--quiet', '-b', 'main'])
writeFileSync(join(repoWurzel, '.claude', 'settings.json'), '{}\n')
writeFileSync(join(repoWurzel, 'README.md'), 'Zeile 1\n')
git(repoWurzel, ['add', '.'])
git(repoWurzel, ['commit', '--quiet', '-m', 'init'])
const startvorlagePfad = join(basis, 'startvorlage.json')
writeFileSync(startvorlagePfad, JSON.stringify(ladeStartvorlage('startvorlagen/beispielprojekt.json'), null, 2))
const vorlage = ladeStartvorlage(startvorlagePfad)
const basisVerzeichnis = join(basis, 'kontrollzustand')
const profilReferenz = leiteProfilReferenzAb(vorlage)
const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }

/** Git-Aufrufe über codeGit: { cwd, argv } — der Spion reicht an den echten Ausführer weiter. */
const gitAufrufe = []
/** Wenn gesetzt: der erste `rev-parse --show-toplevel` im Projektordner wartet so lange (ms) — macht den geteilten Aufbau prüfbar. */
let toplevelBremse = 0
/** Wenn gesetzt: die npm-Attrappe der Vorbereitung wartet auf dieses Versprechen (Vorbereitung „läuft“). */
let npmHalt = null
const handler = erzeugeRequestHandler({
  basisVerzeichnis,
  repoWurzel,
  startvorlagePfad,
  installWurzel: process.cwd(),
  fuehreAufgabeDurchFn: async (laufId, profil) => {
    const rohstromPfad = join(basis, `rohstrom-${laufId}.json`)
    writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: 'Fertig.' }) }))
    registriereKernArtefakt(`laufakte-${laufId}`, profil ?? profilReferenz, { erzeuger: 'check-f45-b2b4a1' }, { worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad, inhalts_hash: 'x' } }, [], ladeOptionen)
    return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH', bypass_verdacht_anzahl: 0 }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  },
  arbeitsordner: true,
  arbeitsordnerNpm: async () => {
    if (npmHalt !== null) await npmHalt
    return { code: 0, stdout: '', stderr: '', zeitueberschritten: false }
  },
  arbeitsordnerE183: () => ({ ok: true }),
  standCacheMs: 0,
  codeGit: async (cwd, argv, optionen) => {
    gitAufrufe.push({ cwd, argv: [...argv] })
    if (toplevelBremse > 0 && argv.includes('--show-toplevel') && resolve(cwd) === resolve(repoWurzel)) {
      const ms = toplevelBremse
      toplevelBremse = 0
      await verzoegerung(ms)
    }
    return fuehreGitAus(cwd, argv, optionen)
  },
})
const dienst = createServer((req, res) => handler(req, res))
await new Promise((r) => dienst.listen(0, '127.0.0.1', r))
dienste.push(dienst)
const basisUrl = `http://127.0.0.1:${dienst.address().port}`

/**
 * GET mit Antwortkörper.
 * @param pfad - Pfad samt Query
 * @param kopf - zusätzliche Kopfzeilen
 * @returns { http, koerper, text }
 */
async function hole(pfad, kopf = {}) {
  const antwort = await fetch(`${basisUrl}${pfad}`, { headers: kopf })
  const text = await antwort.text()
  let koerper = null
  try {
    koerper = JSON.parse(text)
  } catch {
    // kein JSON — der Befund steht dann über http/koerper
  }
  return { http: antwort.status, koerper, text }
}

/** GET /api/code?workflow=<id>. @param id - Kennung (roh) @returns Antwort wie hole */
const ablaufCode = (id) => hole(`/api/code?workflow=${encodeURIComponent(id)}`)

/** Projektion ohne zeitabhängige Felder (für den Bitgleich-Vergleich). @param p - Projektion @returns Kopie */
function ohneZeit(p) {
  const kopie = JSON.parse(JSON.stringify(p))
  if (kopie.freigabeCommit) delete kopie.freigabeCommit.alterMinuten
  for (const e of kopie.verlauf?.eintraege ?? []) delete e.abstandMinuten
  return kopie
}

const SCHREIBEND = { schritt_id: 'schritt-1-ausfuehrung', rolle: 'ausfuehrung', werkzeugsatz: 'schreibend', worker: 'claude-code', modell: 'claude-sonnet-5', eingaben: [], output_schema: null, freigabe: 'ZWINGEND', freigabe_erteilt: true, risiko: 'Gate-Fixture.', zeitgrenze_ms: 600000, nachfolger: null, status: 'OFFEN', lauf_id: null }

/**
 * Auftrag + Workflow registrieren.
 * @param kennung - Teil von Titel und id
 * @param felder - Überschreibungen des Workflow-Datensatzes
 * @returns workflowId
 */
async function legeAblaufAn(kennung, felder = {}) {
  const { auftragId } = await (await fetch(`${basisUrl}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: `Gate ${kennung}`, auftragstext: 'Lege eine Datei an.' }) })).json()
  const workflowId = `f45-b2b4a1-${kennung}-${randomUUID()}`
  registriereWorkflow(
    { workflow_schema: 'v0', workflow_id: workflowId, auftrag_id: auftragId, version: 1, ziel: `Gate ${kennung}.`, status: 'OFFEN', aktiver_schritt_id: SCHREIBEND.schritt_id, grenzen: { max_schritte: 6, max_replans: 1 }, schritte: [SCHREIBEND], ...felder },
    profilReferenz,
    ladeOptionen
  )
  return workflowId
}

/** GET /api/workflows/<id> als JSON. @param id - Kennung @returns Körper */
const detail = async (id) => await (await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(id)}`)).json()

try {
  // ── (b) Ablauf mit Arbeitsordner ─────────────────────────────────────────────────────────────────────────────────────
  const w1 = await legeAblaufAn('w1')
  const start = await (await fetch(`${basisUrl}/api/workflows/${w1}/starten`, { method: 'POST' })).json()
  const bereit = start.vorbereitung === true && (await warteBis(async () => (await detail(w1)).arbeitsordner?.status === 'BEREIT'))
  const ao = (await detail(w1)).arbeitsordner
  pruefe(bereit && typeof ao?.pfad === 'string' && existsSync(ao.pfad) && ao.branch === `wf/${w1}`, '(b0) Arbeitsordner über den echten Startweg angelegt (Branch wf/<id>).', `(b0) ${JSON.stringify({ start, ao })}`)

  const offen = await ablaufCode(w1)
  pruefe(
    offen.http === 200 && resolve(offen.koerper?.absoluterPfad ?? '') === resolve(ao.pfad) && offen.koerper?.branch?.name === `wf/${w1}` && offen.koerper?.ablauf?.sichern?.grund === 'nichtAbgeschlossen' && offen.koerper?.ablauf?.bedarf === 'pflicht' && isDeepStrictEqual(offen.koerper?.ablauf?.arbeitsordner, { pfad: ao.pfad, branch: ao.branch }),
    '(b1) Arbeitsordner bereit, Ablauf offen ⇒ 200 im Arbeitsordner (Branch wf/<id>), sichern nichtAbgeschlossen.',
    `(b1) ${offen.http} ${JSON.stringify({ pfad: offen.koerper?.absoluterPfad, branch: offen.koerper?.branch, ablauf: offen.koerper?.ablauf })}`
  )

  await fetch(`${basisUrl}/api/workflows/${w1}/starten`, { method: 'POST' })
  const abgeschlossen = await warteBis(async () => (await detail(w1)).daten?.status === 'ABGESCHLOSSEN')
  const leer = await ablaufCode(w1)
  pruefe(abgeschlossen && leer.http === 200 && leer.koerper?.ablauf?.workflowStatus === 'ABGESCHLOSSEN' && leer.koerper?.ablauf?.sichern?.grund === 'nichtsOffen', '(b2) abgeschlossen, nichts geändert ⇒ nichtsOffen.', `(b2) ${JSON.stringify({ abgeschlossen, status: (await detail(w1)).daten?.status, sichern: leer.koerper?.ablauf?.sichern })}`)

  writeFileSync(join(ao.pfad, 'neu.txt'), 'aus dem Ablauf\n')
  writeFileSync(join(repoWurzel, 'nur-projekt.txt'), 'nur im Projektordner\n')
  gitAufrufe.length = 0
  const commit = await ablaufCode(w1)
  const diff = await hole(`/api/code/diff?workflow=${encodeURIComponent(w1)}&pfad=neu.txt`)
  const fremderPfad = await hole(`/api/code/diff?workflow=${encodeURIComponent(w1)}&pfad=nur-projekt.txt`)
  const aufrufeAblauf = [...gitAufrufe]
  pruefe(
    commit.koerper?.ablauf?.sichern?.bereit === true && commit.koerper.ablauf.sichern.art === 'commit' && commit.koerper.dateien?.eintraege?.some((e) => e.pfad === 'neu.txt') && !commit.koerper.dateien.eintraege.some((e) => e.pfad === 'nur-projekt.txt'),
    '(b3) Datei im Arbeitsordner geändert ⇒ bereit/commit; die Dateiliste ist die des Arbeitsordners.',
    `(b3) ${JSON.stringify({ sichern: commit.koerper?.ablauf?.sichern, dateien: commit.koerper?.dateien })}`
  )
  pruefe(diff.http === 200 && diff.koerper?.status === 'ok' && diff.koerper.text.includes('aus dem Ablauf') && fremderPfad.http === 400, '(b4) /api/code/diff?workflow= liest im Arbeitsordner; ein Pfad nur im Projektordner ⇒ 400.', `(b4) ${diff.http} ${fremderPfad.http} ${diff.text.slice(0, 200)}`)
  pruefe(
    aufrufeAblauf.length > 0 && aufrufeAblauf.every((a) => resolve(a.cwd) === resolve(ao.pfad) && a.argv.every((x) => !x.includes(w1))),
    `(d) id nie Git-Argument: ${aufrufeAblauf.length} Git-Aufrufe, cwd stets der Arbeitsordner, kein argv-Element enthält die id.`,
    `(d) ${JSON.stringify(aufrufeAblauf.filter((a) => resolve(a.cwd) !== resolve(ao.pfad) || a.argv.some((x) => x.includes(w1))))}`
  )

  git(ao.pfad, ['add', 'neu.txt'])
  git(ao.pfad, ['commit', '--quiet', '-m', 'Ablauf'])
  const push = await ablaufCode(w1)
  pruefe(push.koerper?.ablauf?.sichern?.bereit === true && push.koerper.ablauf.sichern.art === 'push' && push.koerper.ablauf.sichern.voraus === 1 && push.koerper.ablauf.sichern.offeneAenderungen === 0, '(b5) Commit im Arbeitsordner, noch nicht auf main ⇒ bereit/push.', `(b5) ${JSON.stringify(push.koerper?.ablauf?.sichern)}`)

  // ── (b) ohne Arbeitsordner: kein Bedarf (nur lesender Schritt) und Bestand (schreibender Schritt lief im Projektordner) ──
  const w3 = await legeAblaufAn('w3', { status: 'ABGESCHLOSSEN', aktiver_schritt_id: null, schritte: [{ ...SCHREIBEND, schritt_id: 'schritt-1-lesen', rolle: 'qa', werkzeugsatz: 'lesend', status: 'ERFOLGREICH' }] })
  const w5 = await legeAblaufAn('w5', { status: 'ABGESCHLOSSEN', aktiver_schritt_id: null, schritte: [{ ...SCHREIBEND, status: 'ERFOLGREICH', lauf_id: `bestand-${randomUUID()}` }] })
  const [keinBedarf, bestand] = await Promise.all([ablaufCode(w3), ablaufCode(w5)])
  const imProjekt = (a, bedarf) => a.http === 200 && resolve(a.koerper?.absoluterPfad ?? '') === resolve(repoWurzel) && a.koerper?.ablauf?.bedarf === bedarf && a.koerper.ablauf.sichern?.grund === 'keinArbeitsordner' && a.koerper.ablauf.arbeitsordner === null
  pruefe(imProjekt(keinBedarf, 'kein_bedarf') && imProjekt(bestand, 'bestand'), '(b6) ohne Arbeitsordner (kein Bedarf, Bestand) ⇒ Projektordner, keinArbeitsordner.', `(b6) ${JSON.stringify({ keinBedarf: keinBedarf.koerper?.ablauf, bestand: bestand.koerper?.ablauf })}`)

  // ── (c) geteilter Aufbau: mit und ohne Parameter derselbe Ort, genau ein Aufbau, Antwort ohne Parameter ohne ablauf ──
  gitAufrufe.length = 0
  toplevelBremse = 300
  const mitP = ablaufCode(w3)
  await verzoegerung(50)
  const ohneP = hole('/api/code')
  const [mit, ohne] = await Promise.all([mitP, ohneP])
  const toplevel = gitAufrufe.filter((a) => a.argv.includes('--show-toplevel') && resolve(a.cwd) === resolve(repoWurzel)).length
  pruefe(mit.http === 200 && 'ablauf' in (mit.koerper ?? {}) && ohne.http === 200 && !('ablauf' in (ohne.koerper ?? {})) && toplevel === 1, '(c0) gleichzeitig mit und ohne Parameter am selben Ort: genau ein Aufbau; die Antwort ohne Parameter trägt kein ablauf.', `(c0) ${JSON.stringify({ toplevel, mitHatAblauf: 'ablauf' in (mit.koerper ?? {}), ohneHatAblauf: 'ablauf' in (ohne.koerper ?? {}) })}`)

  // ── (c) ohne Parameter bitgleich ─────────────────────────────────────────────────────────────────────────────────────
  gitAufrufe.length = 0
  const http = await hole('/api/code')
  const direkt = await baueCodeProjektion({ repoWurzel, vorlage, startvorlagePfad })
  pruefe(http.http === 200 && isDeepStrictEqual(ohneZeit(http.koerper), ohneZeit(direkt)) && !('ablauf' in http.koerper), '(c1) GET /api/code ohne Parameter = baueCodeProjektion im Projektordner (ohne Zeitfelder), kein Feld ablauf.', `(c1) ${JSON.stringify({ http: ohneZeit(http.koerper), direkt: ohneZeit(direkt) }).slice(0, 600)}`)
  const diffOhne = await hole('/api/code/diff?pfad=nur-projekt.txt')
  pruefe(diffOhne.http === 200 && diffOhne.koerper?.status === 'ok' && diffOhne.koerper.text.includes('nur im Projektordner'), '(c2) /api/code/diff ohne Parameter liest im Projektordner.', `(c2) ${diffOhne.http} ${diffOhne.text.slice(0, 200)}`)
  pruefe(gitAufrufe.length > 0 && gitAufrufe.every((a) => resolve(a.cwd) === resolve(repoWurzel)), '(d2) ohne Parameter: cwd stets der Projektordner.', `(d2) ${JSON.stringify(gitAufrufe.map((a) => a.cwd))}`)

  // ── (b) 409: Vorbereitung läuft, nicht angelegt, Ordner fehlt, aufgeräumt ────────────────────────────────────────────
  let gibNpmFrei
  npmHalt = new Promise((r) => {
    gibNpmFrei = r
  })
  const w4 = await legeAblaufAn('w4')
  await fetch(`${basisUrl}/api/workflows/${w4}/starten`, { method: 'POST' })
  const vorbereitungSichtbar = await warteBis(async () => (await detail(w4)).arbeitsordner?.vorbereitungLaeuft === true)
  const inVorbereitung = await ablaufCode(w4)
  gibNpmFrei()
  npmHalt = null
  await warteBis(async () => (await detail(w4)).arbeitsordner?.vorbereitungLaeuft === false)
  const w2 = await legeAblaufAn('w2')
  const nichtAngelegt = await ablaufCode(w2)
  const weg = `${ao.pfad}-weg`
  await benenneUm(ao.pfad, weg)
  const ordnerFehlt = await ablaufCode(w1)
  await benenneUm(weg, ao.pfad)
  const aoVersion = ladeArtefaktVersion(`arbeitsordner-${w1}`, undefined, ladeOptionen)
  const am = new Date().toISOString()
  registriereKernArtefakt(`arbeitsordner-${w1}`, profilReferenz, { erzeuger: 'check-f45-b2b4a1' }, { ...aoVersion.daten, status: 'ENTFERNT', grund: null, aufraeumen: { begruendung: 'Gate', verworfen: true, branch_geloescht: false, hinweis: null, am }, aktualisiert_am: am }, [], ladeOptionen)
  const aufgeraeumt = await ablaufCode(w1)
  const ohneId = (a, id) => !a.text.includes(id)
  pruefe(
    vorbereitungSichtbar && inVorbereitung.http === 409 && inVorbereitung.koerper?.grund_schluessel === 'inVorbereitung' && ohneId(inVorbereitung, w4),
    '(b7) Vorbereitung läuft ⇒ 409 inVorbereitung, ohne id.',
    `(b7) ${JSON.stringify({ vorbereitungSichtbar })} ${inVorbereitung.http} ${inVorbereitung.text}`
  )
  pruefe(
    nichtAngelegt.http === 409 && nichtAngelegt.koerper?.grund_schluessel === 'nichtAngelegt' && ohneId(nichtAngelegt, w2) && ordnerFehlt.http === 409 && ordnerFehlt.koerper?.grund_schluessel === 'ordnerFehlt' && ohneId(ordnerFehlt, w1) && aufgeraeumt.http === 409 && aufgeraeumt.koerper?.grund_schluessel === 'aufgeraeumt' && ohneId(aufgeraeumt, w1),
    '(b8) Pflicht ohne Ordner ⇒ 409 nichtAngelegt; Ordner entfernt ⇒ 409 ordnerFehlt; aufgeräumt ⇒ 409 aufgeraeumt; Antwort ohne id.',
    `(b8) ${nichtAngelegt.http} ${nichtAngelegt.text} | ${ordnerFehlt.http} ${ordnerFehlt.text} | ${aufgeraeumt.http} ${aufgeraeumt.text}`
  )

  // ── (b) 404, 400, 403 ────────────────────────────────────────────────────────────────────────────────────────────────
  const unbekannt = await Promise.all([`nicht-da-${randomUUID()}`, 'a:b', 'x'.repeat(200), w3.toUpperCase(), `${w3}.`].map((id) => ablaufCode(id)))
  const ungueltig = await Promise.all(['', '../x', 'x'.repeat(201), 'a\u0001b'].map((id) => ablaufCode(id)))
  const mehrfach = await hole(`/api/code?workflow=${encodeURIComponent(w3)}&workflow=${encodeURIComponent(w5)}`)
  const ungueltigDiff = await hole('/api/code/diff?workflow=&pfad=neu.txt')
  pruefe(
    unbekannt.every((a) => a.http === 404 && a.koerper?.grund_schluessel === null),
    '(b9) unbekannt ⇒ 404 (auch a:b, genau 200 Zeichen, Alias in Großbuchstaben bzw. mit Punkt am Ende — nie 500).',
    `(b9) ${unbekannt.map((a) => `${a.http} ${a.text}`).join(' | ')}`
  )
  pruefe(
    ungueltig.every((a) => a.http === 400 && a.koerper?.grund_schluessel === null && !a.text.includes('../x') && !a.text.includes('xxxxxxxx')) && mehrfach.http === 400 && !mehrfach.text.includes(w3) && ungueltigDiff.http === 400,
    '(b10) leer, ../x, zu lang, Steuerzeichen, mehrfach ⇒ 400 ohne Rohwert, auch an /api/code/diff.',
    `(b10) ${ungueltig.map((a) => `${a.http} ${a.text}`).join(' | ')} | mehrfach ${mehrfach.http} ${mehrfach.text} | diff ${ungueltigDiff.http}`
  )
  const fremd = await hole(`/api/code?workflow=${encodeURIComponent(w3)}`, { 'Sec-Fetch-Site': 'cross-site' })
  const fremdDiff = await hole(`/api/code/diff?workflow=${encodeURIComponent(w3)}&pfad=neu.txt`, { 'Sec-Fetch-Site': 'cross-site' })
  const fremdUngueltig = await hole('/api/code?workflow=../x', { 'Sec-Fetch-Site': 'cross-site' })
  pruefe(fremd.http === 403 && fremdDiff.http === 403 && fremdUngueltig.http === 403, '(b11) fremde Herkunft mit ?workflow= ⇒ 403 an beiden Routen, auch mit ungültiger id (403 vor 400).', `(b11) ${fremd.http} ${fremdDiff.http} ${fremdUngueltig.http}`)

  // ── (e) starteWorkflowSchritt( unverändert ───────────────────────────────────────────────────────────────────────────
  const starts = readFileSync('scripts/leitstand-server.mjs', 'utf8').split('starteWorkflowSchritt(').length - 1
  pruefe(starts === 6, '(e) starteWorkflowSchritt( genau 6× im Server.', `(e) starteWorkflowSchritt( ${starts}×`)
} finally {
  for (const d of dienste) if (d.listening) await new Promise((r) => d.close(() => r()))
  for (const pfad of aufraeumen) raeumeVerzeichnis(pfad)
}

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e):`)
  for (const b of befunde) console.error(`  - ${b}`)
  process.exit(1)
}
console.log('\n✓ Keine Befunde.')
