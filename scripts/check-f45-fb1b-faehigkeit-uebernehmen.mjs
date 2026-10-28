#!/usr/bin/env node
/**
 * Datei: scripts/check-f45-fb1b-faehigkeit-uebernehmen.mjs
 *
 * Zweck: Gate für F45 FB-1b „Fähigkeit übernehmen/verwerfen“ (features/F45/plan-fb1b-v2.md, Advisor advisor-fb1b.md + -delta.md;
 * F-1167, F-1069). Attrappen entstehen zur Laufzeit (tmp-Repo auf main, Arbeitsordner über den echten Startweg mit
 * Attrappen-Worker, lokale Datei im tmp; nichts eingecheckt). Echter Handler, echter Dispatcher.
 * (u1) Skill übernehmen ⇒ 200, Ziel da (Hash = Start-Hash), Vorschlag weg, Freigabe nach Inhalt, `an` unverändert;
 * (u2) Agent ebenso — gelingt nur, wenn der Wächter den Stand aus (u1) kennt; (b3) eingeschaltet bzw. andere Freigabe ⇒ 409,
 * nichts bewegt, lokale Datei bitgleich; (h) Hash-Drift ⇒ 409; (z) Ziel in anderer Schreibweise vorhanden ⇒ 409; (i) Ziel
 * gitignoriert ⇒ 409 mit dem Wortlaut B13; (q1) unverändert im Basis-Commit ⇒ nicht in der Projektion, Route 404; geändert ⇒
 * sichtbar; (q4) Agent-Name kollidiert mit einem Agent in einem Unterordner ⇒ 409, Rücknahme; (q9) `con` ⇒ 400; (s) `.claude`,
 * `.claude/agents` bzw. ein Behälter unter vorschlaege/ als Verknüpfung ⇒ kein 200, fremder Ordner unverändert (übersprungen,
 * wenn keine Verknüpfung anlegbar); (a) Übernehmen vor dem Abschluss ⇒ 409, nach ANGENOMMEN ⇒ 200, nach ABGELEHNT ⇒ 409,
 * Verwerfen nach ABGELEHNT ⇒ 200; (l) Lauf aktiv ⇒ 409 beide; (o) ohne Arbeitsordner ⇒ 409; (v) Verwerfen ⇒ Vorschlag weg,
 * lokale Datei bitgleich; (k) unbekanntes Feld ⇒ 400, GET ⇒ 405, unbekannter Ablauf ⇒ 404 mit JSON-Grund, Artefakt mit
 * abweichender workflow_id ⇒ 404, Identitätszeile im Quelltext; (c) CSRF: fremde Herkunft ⇒ 403 direkt und über
 * /api/projekte/<id>/…, nichts bewegt; (r) aendere lehnt ab ⇒ 409 mit Rücknahme, Rücknahme scheitert ⇒ 500 mit beiden Orten;
 * (b4) nach der Übernahme meldet leseClaudeAenderungen das Ziel (Hinweis nötig), nach einem Sichern im Arbeitsordner nicht mehr;
 * (e) (gestrichen in F45 W2b-1: starteWorkflowSchritt( zählt nur check-f15-workflow).
 * Neue Funktionen werden dynamisch importiert: auf main fehlen sie ⇒ Befund je Fall (Rot-Nachweis per git archive). Auf main grün
 * ist (c) (der CSRF-Haken greift auch ohne Route) — ihr Rot-Nachweis ist eine Sabotage-Kopie (Route vor dem Haken).
 *
 * Wird aufgerufen von: `npm run check:gates` (und damit `npm run check`).
 *
 * Wichtig: git ohne globale Konfiguration des Entwicklers (GIT_CONFIG_GLOBAL, HOME/XDG_CONFIG_HOME), sonst hinge (i) an dessen
 * core.excludesFile. Weitere Randfälle (Phase B frisch und synchron, Körperformen, Dateisystem-Annahmen) belegen
 * scripts/leitstand/routen-faehigkeit-vorschlag.test.mjs und src/faehigkeiten/vorschlag.test.ts in derselben Kette.
 *
 * Aufruf: node scripts/check-f45-fb1b-faehigkeit-uebernehmen.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { leseClaudeAenderungen } from '../src/execution-controller/index.ts'
import { ermittleProjektFaehigkeiten } from '../src/faehigkeiten/index.ts'
import { registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { erzeugeMultiProjektDispatcher, erzeugeRequestHandler } from './leitstand-server.mjs'
import { schalteGitWartungAb } from './_wegwerf.ts'

const befunde = []
console.log('\n=== F45-FB-1b-Fähigkeit-übernehmen-Check ===\n')
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

/** Importiert ein Modul; fehlt es oder eine Funktion (main), null. @param pfad - relativer Pfad @returns Modul oder null */
async function neuesModul(pfad) {
  try {
    return await import(pfad)
  } catch (fehler) {
    console.error(`  (Modul ${pfad} nicht ladbar: ${fehler.message})`)
    return null
  }
}
const modul = await neuesModul('./leitstand/routen-faehigkeit-vorschlag.mjs')
const fuehreDurch = typeof modul?.fuehreVorschlagAktionDurch === 'function' ? modul.fuehreVorschlagAktionDurch : null
const ZIEL_IGNORIERT = modul?.ZIEL_IGNORIERT ?? 'Ziel ist gitignoriert — würde beim Sichern nicht mitgenommen'

/** Neues tmp-Verzeichnis. @param name - Präfix @returns Pfad */
function tmp(name) {
  const p = join(tmpdir(), `f45-fb1b-${name}-${randomUUID().slice(0, 8)}`)
  mkdirSync(p, { recursive: true })
  aufraeumen.push(p)
  return p
}

const gitKonfig = tmp('gitcfg')
process.env.GIT_CONFIG_GLOBAL = join(gitKonfig, 'leer')
process.env.GIT_CONFIG_NOSYSTEM = '1'
process.env.HOME = gitKonfig
process.env.XDG_CONFIG_HOME = gitKonfig

const VS = 'vorschlaege/faehigkeiten'
const skillText = (name) => `---\nname: ${name}\ndescription: Prüft etwas.\n---\n\nInhalt\n`
const agentText = (name, beschreibung = 'Liest Code.') => `---\nname: ${name}\ndescription: ${beschreibung}\ntools: Read, Grep\n---\n\nDu liest.\n`
const git = (cwd, argumente) => execFileSync('git', ['-c', 'user.email=t@example.invalid', '-c', 'user.name=T', '-c', 'core.autocrlf=false', ...argumente], { cwd, encoding: 'utf8' })

/** Schreibt Dateien unter wurzel (relativer Pfad mit '/' → Inhalt). @param wurzel - Wurzel @param dateien - Dateien */
function lege(wurzel, dateien) {
  for (const [rel, inhalt] of Object.entries(dateien)) {
    const voll = join(wurzel, ...rel.split('/'))
    mkdirSync(join(voll, '..'), { recursive: true })
    writeFileSync(voll, inhalt)
  }
}
const da = (wurzel, rel) => existsSync(join(wurzel, ...rel.split('/')))

/** Verknüpfung (Junction unter Windows, sonst Symlink) oder false. @param ziel - Ziel @param ort - Ort @returns angelegt? */
function verknuepfe(ziel, ort) {
  try {
    symlinkSync(ziel, ort, 'junction')
    return true
  } catch {
    return false
  }
}

const basis = tmp('server')
/** tmp-Repo mit einem Commit auf branch. @param name - Ordnername @param branch - Branch @returns Pfad */
function legeRepoAn(name, branch) {
  const wurzel = join(basis, name)
  mkdirSync(join(wurzel, '.claude'), { recursive: true })
  git(wurzel, ['init', '--quiet'])
  schalteGitWartungAb(wurzel)
  git(wurzel, ['checkout', '--quiet', '-b', branch])
  writeFileSync(join(wurzel, '.claude', 'settings.json'), '{}\n')
  writeFileSync(join(wurzel, 'README.md'), 'Zeile 1\n')
  git(wurzel, ['add', '.'])
  git(wurzel, ['commit', '--quiet', '-m', 'init'])
  return wurzel
}
const repoMit = legeRepoAn('projekt', 'main')
const repoOhne = legeRepoAn('projekt-ohne', 'arbeit')
const startvorlagePfad = join(basis, 'startvorlage.json')
writeFileSync(startvorlagePfad, JSON.stringify(ladeStartvorlage('startvorlagen/beispielprojekt.json'), null, 2))
const vorlage = ladeStartvorlage(startvorlagePfad)
const profilReferenz = leiteProfilReferenzAb(vorlage)
const werkzeugNamen = [...new Set(vorlage.werkzeugsaetze.schreibend.erlaubte_werkzeuge.map((r) => r.split('(')[0]))]

// (b3): die lokale Datei steht vor dem Serverstart (der Wächter kennt sie), mit einer eingeschalteten und einer fremden Freigabe.
const lokalPfad = join(tmp('lokal'), 'faehigkeiten.lokal.json')
writeFileSync(lokalPfad, `${JSON.stringify({ faehigkeiten_lokal_schema: 'v0', projekte: { 'ai-workforce': { an: ['agent:gesperrt'], inhalt_freigaben: { 'skill:anders': 'c'.repeat(64) } } } }, null, 2)}\n`)
const globalerLaufZustand = { aktiv: false, laufId: null, abortController: null }

/**
 * Handler und Dienst.
 * @param basisVerzeichnis - Kontrollzustand
 * @param arbeitsordner - Option Arbeitsordner
 * @param repoWurzel - Projektordner
 * @returns { basisUrl, ladeOptionen, handler }
 */
async function starteDienst(basisVerzeichnis, arbeitsordner, repoWurzel) {
  const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }
  const handler = erzeugeRequestHandler({
    basisVerzeichnis,
    repoWurzel,
    startvorlagePfad,
    installWurzel: process.cwd(),
    globalerLaufZustand,
    faehigkeitenLokalPfad: lokalPfad,
    fuehreAufgabeDurchFn: async (laufId, profil) => {
      const rohstromPfad = join(basis, `rohstrom-${laufId}.json`)
      writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: 'Fertig.' }) }))
      registriereKernArtefakt(`laufakte-${laufId}`, profil ?? profilReferenz, { erzeuger: 'check-f45-fb1b' }, { worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad, inhalts_hash: 'x' } }, [], ladeOptionen)
      return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH', bypass_verdacht_anzahl: 0 }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
    },
    arbeitsordner,
    arbeitsordnerNpm: async () => ({ code: 0, stdout: '', stderr: '', zeitueberschritten: false }),
    arbeitsordnerE183: () => ({ ok: true }),
    standCacheMs: 0,
  })
  const dienst = createServer((req, res) => handler(req, res))
  await new Promise((r) => dienst.listen(0, '127.0.0.1', r))
  dienste.push(dienst)
  return { basisUrl: `http://127.0.0.1:${dienst.address().port}`, ladeOptionen, handler }
}

const SCHREIBEND = { schritt_id: 'schritt-1-ausfuehrung', rolle: 'ausfuehrung', werkzeugsatz: 'schreibend', worker: 'claude-code', modell: 'claude-sonnet-5', eingaben: [], output_schema: null, freigabe: 'ZWINGEND', freigabe_erteilt: true, risiko: 'Gate-Fixture.', zeitgrenze_ms: 600000, nachfolger: null, status: 'OFFEN', lauf_id: null }

/** Wartet, bis pruefen wahr ist (höchstens 20 s). @param pruefen - asynchrone Prüfung @returns letzter Wert */
async function warteBis(pruefen) {
  const ende = Date.now() + 20000
  let wert = await pruefen()
  while (!wert && Date.now() < ende) {
    await new Promise((r) => setTimeout(r, 25))
    wert = await pruefen()
  }
  return wert
}
const json = async (url, optionen) => await (await fetch(url, optionen)).json()

/**
 * Ablauf anlegen und (bereit=true) bis ABGESCHLOSSEN fahren bzw. nur den Arbeitsordner vorbereiten.
 * @param dienst - Dienst
 * @param kennung - Teil der id
 * @param abschliessen - zweiten Start ausführen
 * @returns { id, pfad }
 */
async function legeAblaufAn(dienst, kennung, abschliessen = true) {
  const { auftragId } = await json(`${dienst.basisUrl}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: `Gate ${kennung}`, auftragstext: 'Baue einen Skill.' }) })
  const id = `f45-fb1b-${kennung}-${randomUUID()}`
  registriereWorkflow({ workflow_schema: 'v0', workflow_id: id, auftrag_id: auftragId, version: 1, ziel: `Gate ${kennung}.`, status: 'OFFEN', aktiver_schritt_id: SCHREIBEND.schritt_id, grenzen: { max_schritte: 6, max_replans: 1 }, schritte: [SCHREIBEND] }, profilReferenz, dienst.ladeOptionen)
  await fetch(`${dienst.basisUrl}/api/workflows/${id}/starten`, { method: 'POST' })
  await warteBis(async () => (await json(`${dienst.basisUrl}/api/workflows/${id}`)).arbeitsordner?.status === 'BEREIT')
  const pfad = (await json(`${dienst.basisUrl}/api/workflows/${id}`)).arbeitsordner?.pfad ?? null
  if (abschliessen) {
    await fetch(`${dienst.basisUrl}/api/workflows/${id}/starten`, { method: 'POST' })
    await warteBis(async () => (await json(`${dienst.basisUrl}/api/workflows/${id}`)).daten?.status === 'ABGESCHLOSSEN')
  }
  return { id, pfad }
}

/**
 * POST an die Vorschlag-Route.
 * @param url - Basis-URL (oder Präfix)
 * @param id - Ablaufkennung
 * @param aktion - uebernehmen | verwerfen
 * @param koerper - Körper (Objekt)
 * @param kopf - zusätzliche Header
 * @returns { status, inhalt }
 */
async function route(url, id, aktion, koerper, kopf = {}) {
  // Über den Präfix /api/projekte/<id> setzt der Dispatcher den Rest wieder zu /api/… zusammen.
  const api = url.includes('/api/projekte/') ? url : `${url}/api`
  const a = await fetch(`${api}/workflows/${encodeURIComponent(id)}/faehigkeit-vorschlag/${aktion}`, { method: 'POST', headers: kopf, body: JSON.stringify(koerper) })
  const text = await a.text()
  let inhalt = {}
  try {
    inhalt = JSON.parse(text)
  } catch {
    inhalt = { roh: text }
  }
  return { status: a.status, inhalt }
}
const grund = (a) => (typeof a.inhalt.grund === 'string' ? a.inhalt.grund : '')
/** Hash eines Vorschlags aus der Projektion. @param dienst - Dienst @param id - Ablauf @param name - Name @returns Hash oder 'f'×64 */
async function hashAus(dienst, id, name) {
  const p = (await json(`${dienst.basisUrl}/api/workflows/${id}/abnahme`)).faehigkeitVorschlaege ?? []
  return p.find((e) => e.name === name)?.hash ?? 'f'.repeat(64)
}
const lokal = () => JSON.parse(readFileSync(lokalPfad, 'utf8')).projekte['ai-workforce']

try {
  const mit = await starteDienst(join(basis, 'kontrollzustand'), true, repoMit)
  const ohne = await starteDienst(join(basis, 'kontrollzustand-ohne'), false, repoOhne)
  const dispatcher = createServer(erzeugeMultiProjektDispatcher(new Map([['p1', mit.handler]]), mit.handler))
  await new Promise((r) => dispatcher.listen(0, '127.0.0.1', r))
  dienste.push(dispatcher)
  const praefix = `http://127.0.0.1:${dispatcher.address().port}/api/projekte/p1`

  const w1 = await legeAblaufAn(mit, 'w1')
  const w2 = await legeAblaufAn(mit, 'w2', false)
  const w3 = await legeAblaufAn(mit, 'w3')
  const w5 = await legeAblaufAn(mit, 'w5')
  if ([w1, w2, w3, w5].some((w) => w.pfad === null)) befunde.push('(p0) Arbeitsordner nicht bereit')
  const ao = w1.pfad

  // ── (u1)(u2)(b4) ─────────────────────────────────────────────────────────────────────────────────────────────────────
  lege(ao, { [`${VS}/skills/pruefen/SKILL.md`]: skillText('pruefen'), [`${VS}/agents/leser.md`]: agentText('leser') })
  const hSkill = await hashAus(mit, w1.id, 'pruefen')
  const u1 = await route(mit.basisUrl, w1.id, 'uebernehmen', { typ: 'skill', name: 'pruefen', hash: hSkill })
  const startHash = ermittleProjektFaehigkeiten(ao, { katalog: new Map(), einstellungen: { an: [], aus: [], inhalt_freigaben: {} }, werkzeugNamen, referenz: { cli_version: '', agents: [], plugins: [], plugin_skills: [] } }).eintraege.find((e) => e.schluessel === 'skill:pruefen')?.hash
  pruefe(
    u1.status === 200 && u1.inhalt.eingeschaltet === false && startHash === hSkill && da(ao, '.claude/skills/pruefen/SKILL.md') && !da(ao, `${VS}/skills/pruefen`) && lokal().inhalt_freigaben?.['skill:pruefen'] === hSkill && JSON.stringify(lokal().an) === '["agent:gesperrt"]',
    '(u1) Skill übernommen: Ziel da (Hash = Start-Hash), Vorschlag weg, Freigabe nach Inhalt, an unverändert.',
    `(u1) ${fuehreDurch === null ? 'Route fehlt' : JSON.stringify({ u1, startHash, hSkill })}`
  )
  const claudeNachher = leseClaudeAenderungen(ao)
  pruefe(claudeNachher.includes('.claude/skills/pruefen/SKILL.md') && /sichern/.test(u1.inhalt.hinweis ?? ''), '(b4) nach der Übernahme meldet der Laufdiff das Ziel — die Antwort trägt den Hinweis „sichern“.', `(b4) ${JSON.stringify({ claudeNachher, hinweis: u1.inhalt.hinweis })}`)
  const hAgent = await hashAus(mit, w1.id, 'leser')
  const u2 = await route(mit.basisUrl, w1.id, 'uebernehmen', { typ: 'agent', name: 'leser', hash: hAgent })
  pruefe(u2.status === 200 && da(ao, '.claude/agents/leser.md') && !da(ao, `${VS}/agents/leser.md`) && lokal().inhalt_freigaben?.['agent:leser'] === hAgent, '(u2) Agent übernommen (der Wächter kennt den Stand aus (u1)).', `(u2) ${JSON.stringify(u2)}`)
  // Sichern nur, wenn beide Übernahmen da sind (auf main fehlen sie — dann bleibt (b4) rot, statt dass das Gate abbricht).
  const gesichert = da(ao, '.claude/skills/pruefen/SKILL.md') && da(ao, '.claude/agents/leser.md')
  if (gesichert) {
    git(ao, ['add', '--', '.claude/skills/pruefen/SKILL.md', '.claude/agents/leser.md'])
    git(ao, ['commit', '--quiet', '-m', 'sichern'])
  }
  const claudeGesichert = gesichert ? leseClaudeAenderungen(ao) : ['(nicht gesichert)']
  pruefe(u1.status === 200 && claudeGesichert.length === 0, '(b4) nach dem Sichern im Arbeitsordner meldet der Laufdiff nichts mehr.', `(b4) nach dem Sichern: ${JSON.stringify(claudeGesichert)}`)

  // ── (b3)(h)(z)(i)(q4)(q9)(v) ─────────────────────────────────────────────────────────────────────────────────────────
  lege(ao, {
    [`${VS}/agents/gesperrt.md`]: agentText('gesperrt'),
    [`${VS}/skills/anders/SKILL.md`]: skillText('anders'),
    [`${VS}/agents/qa.md`]: agentText('qa'),
    '.claude/agents/QA.md': agentText('QA'),
    '.gitignore': '.claude/skills/ign/\n',
    [`${VS}/skills/ign/SKILL.md`]: skillText('ign'),
    [`${VS}/agents/doppelt.md`]: agentText('doppelt'),
    '.claude/agents/sub/anders.md': agentText('doppelt'),
    [`${VS}/agents/weg.md`]: agentText('weg'),
  })
  const vorherLokal = readFileSync(lokalPfad)
  const b3a = await route(mit.basisUrl, w1.id, 'uebernehmen', { typ: 'agent', name: 'gesperrt', hash: await hashAus(mit, w1.id, 'gesperrt') })
  const b3b = await route(mit.basisUrl, w1.id, 'uebernehmen', { typ: 'skill', name: 'anders', hash: await hashAus(mit, w1.id, 'anders') })
  pruefe(
    b3a.status === 409 && /eingeschaltet/.test(grund(b3a)) && b3b.status === 409 && /überschreiben/.test(grund(b3b)) && da(ao, `${VS}/agents/gesperrt.md`) && !da(ao, '.claude/agents/gesperrt.md') && readFileSync(lokalPfad).equals(vorherLokal),
    '(b3) eingeschaltet bzw. andere Freigabe ⇒ 409, nichts bewegt, lokale Datei bitgleich.',
    `(b3) ${JSON.stringify([b3a, b3b])}`
  )
  const h = await route(mit.basisUrl, w1.id, 'uebernehmen', { typ: 'agent', name: 'weg', hash: 'e'.repeat(64) })
  pruefe(h.status === 409 && /geändert/.test(grund(h)) && da(ao, `${VS}/agents/weg.md`), '(h) Hash-Drift ⇒ 409, nichts bewegt.', `(h) ${JSON.stringify(h)}`)
  const z = await route(mit.basisUrl, w1.id, 'uebernehmen', { typ: 'agent', name: 'qa', hash: await hashAus(mit, w1.id, 'qa') })
  pruefe(z.status === 409 && /existiert schon/.test(grund(z)), '(z) Ziel in anderer Schreibweise vorhanden ⇒ 409.', `(z) ${JSON.stringify(z)}`)
  const i = await route(mit.basisUrl, w1.id, 'uebernehmen', { typ: 'skill', name: 'ign', hash: await hashAus(mit, w1.id, 'ign') })
  pruefe(i.status === 409 && grund(i) === ZIEL_IGNORIERT && da(ao, `${VS}/skills/ign/SKILL.md`), '(i) Ziel gitignoriert ⇒ 409 „Ziel ist gitignoriert — würde beim Sichern nicht mitgenommen“.', `(i) ${JSON.stringify(i)}`)
  const q4 = await route(mit.basisUrl, w1.id, 'uebernehmen', { typ: 'agent', name: 'doppelt', hash: await hashAus(mit, w1.id, 'doppelt') })
  pruefe(q4.status === 409 && /mehrdeutig/.test(grund(q4)) && da(ao, `${VS}/agents/doppelt.md`) && !da(ao, '.claude/agents/doppelt.md'), '(q4) Kollision mit einem Agent im Unterordner ⇒ 409, Vorschlag zurück, Ziel fehlt.', `(q4) ${JSON.stringify(q4)}`)
  const q9 = await route(mit.basisUrl, w1.id, 'uebernehmen', { typ: 'agent', name: 'con', hash: 'a'.repeat(64) })
  pruefe(q9.status === 400 && /anlegbar/.test(grund(q9)), '(q9) Gerätename con ⇒ 400.', `(q9) ${JSON.stringify(q9)}`)
  const vorherV = readFileSync(lokalPfad)
  const v = await route(mit.basisUrl, w1.id, 'verwerfen', { typ: 'agent', name: 'weg', hash: await hashAus(mit, w1.id, 'weg') })
  pruefe(v.status === 200 && v.inhalt.verworfen === true && !da(ao, `${VS}/agents/weg.md`) && readFileSync(lokalPfad).equals(vorherV), '(v) Verwerfen ⇒ Vorschlag weg, lokale Datei bitgleich.', `(v) ${JSON.stringify(v)}`)

  // ── (k) Körper, Methode, Kennung ─────────────────────────────────────────────────────────────────────────────────────
  const k1 = await route(mit.basisUrl, w1.id, 'verwerfen', { typ: 'agent', name: 'qa', hash: 'a'.repeat(64), projekt_id: 'x' })
  const k2 = await fetch(`${mit.basisUrl}/api/workflows/${w1.id}/faehigkeit-vorschlag/verwerfen`)
  const k3 = await route(mit.basisUrl, 'gibt-es-nicht', 'verwerfen', { typ: 'agent', name: 'qa', hash: 'a'.repeat(64) })
  registriereKernArtefakt('workflow-f45-fb1b-alias', profilReferenz, { erzeuger: 'check-f45-fb1b' }, { workflow_id: 'f45-fb1b-anders' }, [], mit.ladeOptionen)
  const k4 = await route(mit.basisUrl, 'f45-fb1b-alias', 'verwerfen', { typ: 'agent', name: 'qa', hash: 'a'.repeat(64) })
  const server = readFileSync('scripts/leitstand-server.mjs', 'utf8')
  const lageZeile = server.slice(server.indexOf('const vorschlagRoute = erkenneVorschlagRoute(pfad)'), server.indexOf('const vorschlagRoute = erkenneVorschlagRoute(pfad)') + 1200)
  pruefe(
    k1.status === 400 && /unbekannte Felder/.test(grund(k1)) && k2.status === 405 && k3.status === 404 && /nicht gefunden/.test(grund(k3)) && k4.status === 404 && /nicht gefunden/.test(grund(k4)) && lageZeile.includes('workflow?.workflow_id !== workflowId'),
    '(k) unbekanntes Feld ⇒ 400, GET ⇒ 405, unbekannter Ablauf und abweichende workflow_id ⇒ 404 mit Grund; Identitätszeile im Quelltext.',
    `(k) ${JSON.stringify({ k1, k2: k2.status, k3, k4, identitaet: lageZeile.includes('workflow?.workflow_id !== workflowId') })}`
  )

  // ── (c) CSRF direkt und über den Projekt-Präfix ──────────────────────────────────────────────────────────────────────
  {
    const koerper = { typ: 'agent', name: 'qa', hash: await hashAus(mit, w1.id, 'qa') }
    const proben = []
    for (const url of [mit.basisUrl, praefix]) for (const kopf of [{ origin: 'https://boese.example' }, { 'sec-fetch-site': 'cross-site' }]) for (const aktion of ['uebernehmen', 'verwerfen']) proben.push(await route(url, w1.id, aktion, koerper, kopf))
    pruefe(proben.every((p) => p.status === 403 && /abgelehnt/.test(grund(p))) && da(ao, `${VS}/agents/qa.md`), '(c) fremde Herkunft ⇒ 403 direkt und über /api/projekte/<id>/…, nichts bewegt (auf main grün, Sabotage-Kopie im Bericht).', `(c) ${JSON.stringify(proben.map((p) => p.status))}`)
    const ueberPraefix = await route(praefix, w1.id, 'verwerfen', koerper)
    pruefe(ueberPraefix.status === 200 && !da(ao, `${VS}/agents/qa.md`), '(c) gleiche Herkunft über den Projekt-Präfix erreicht die Route.', `(c) Präfix: ${JSON.stringify(ueberPraefix)}`)
  }

  // ── (l) Lauf aktiv ───────────────────────────────────────────────────────────────────────────────────────────────────
  lege(ao, { [`${VS}/agents/lauf.md`]: agentText('lauf') })
  const hLauf = await hashAus(mit, w1.id, 'lauf')
  globalerLaufZustand.aktiv = true
  globalerLaufZustand.laufId = 'gate-lauf'
  const l1 = await route(mit.basisUrl, w1.id, 'uebernehmen', { typ: 'agent', name: 'lauf', hash: hLauf })
  const l2 = await route(mit.basisUrl, w1.id, 'verwerfen', { typ: 'agent', name: 'lauf', hash: hLauf })
  globalerLaufZustand.aktiv = false
  globalerLaufZustand.laufId = null
  pruefe(l1.status === 409 && l2.status === 409 && /gate-lauf/.test(grund(l1)) && da(ao, `${VS}/agents/lauf.md`), '(l) Lauf aktiv ⇒ 409 für Übernehmen und Verwerfen.', `(l) ${JSON.stringify([l1, l2])}`)

  // ── (o) ohne Arbeitsordner ───────────────────────────────────────────────────────────────────────────────────────────
  const wo = await legeAblaufAn(ohne, 'wo')
  lege(repoOhne, { [`${VS}/agents/leser.md`]: agentText('leser') })
  const o = await route(ohne.basisUrl, wo.id, 'verwerfen', { typ: 'agent', name: 'leser', hash: 'a'.repeat(64) })
  pruefe(o.status === 409 && /keinen bereiten Arbeitsordner/.test(grund(o)) && da(repoOhne, `${VS}/agents/leser.md`), '(o) ohne Arbeitsordner (Bestand) ⇒ 409, Projektordner unberührt.', `(o) ${JSON.stringify(o)}`)

  // ── (a) Abnahme-Bedingung ────────────────────────────────────────────────────────────────────────────────────────────
  lege(w2.pfad, { [`${VS}/agents/leser.md`]: agentText('leser') })
  const a0 = await route(mit.basisUrl, w2.id, 'uebernehmen', { typ: 'agent', name: 'leser', hash: 'a'.repeat(64) })
  await fetch(`${mit.basisUrl}/api/workflows/${w2.id}/starten`, { method: 'POST' })
  await warteBis(async () => (await json(`${mit.basisUrl}/api/workflows/${w2.id}`)).daten?.status === 'ABGESCHLOSSEN')
  const angenommen = await fetch(`${mit.basisUrl}/api/workflows/${w2.id}/abnahme`, { method: 'POST', body: JSON.stringify({ ergebnis: 'ANGENOMMEN', begruendung: 'Gate.' }) })
  const a1 = await route(mit.basisUrl, w2.id, 'uebernehmen', { typ: 'agent', name: 'leser', hash: await hashAus(mit, w2.id, 'leser') })
  lege(w3.pfad, { [`${VS}/agents/leser.md`]: agentText('leser') })
  const h3 = await hashAus(mit, w3.id, 'leser')
  const abgelehnt = await fetch(`${mit.basisUrl}/api/workflows/${w3.id}/abnahme`, { method: 'POST', body: JSON.stringify({ ergebnis: 'ABGELEHNT', begruendung: 'Gate.' }) })
  const a2 = await route(mit.basisUrl, w3.id, 'uebernehmen', { typ: 'agent', name: 'leser', hash: h3 })
  const a3 = await route(mit.basisUrl, w3.id, 'verwerfen', { typ: 'agent', name: 'leser', hash: h3 })
  pruefe(
    a0.status === 409 && /offener Abnahme/.test(grund(a0)) && angenommen.status === 200 && a1.status === 200 && abgelehnt.status === 200 && a2.status === 409 && /offener Abnahme/.test(grund(a2)) && a3.status === 200,
    '(a) vor dem Abschluss 409, nach ANGENOMMEN 200, nach ABGELEHNT Übernehmen 409 und Verwerfen 200.',
    `(a) ${JSON.stringify({ a0, angenommen: angenommen.status, a1, abgelehnt: abgelehnt.status, a2, a3 })}`
  )

  // ── (q1) unverändert im Basis-Commit ─────────────────────────────────────────────────────────────────────────────────
  lege(repoMit, { [`${VS}/agents/alt.md`]: agentText('alt') })
  git(repoMit, ['add', '--', `${VS}/agents/alt.md`])
  git(repoMit, ['commit', '--quiet', '-m', 'vorschlag im basisstand'])
  const w4 = await legeAblaufAn(mit, 'w4')
  const vorAenderung = (await json(`${mit.basisUrl}/api/workflows/${w4.id}/abnahme`)).faehigkeitVorschlaege
  const hAlt = createHashDatei(join(w4.pfad ?? basis, ...VS.split('/'), 'agents', 'alt.md'))
  const q1a = await route(mit.basisUrl, w4.id, 'verwerfen', { typ: 'agent', name: 'alt', hash: hAlt })
  writeFileSync(join(w4.pfad ?? basis, ...VS.split('/'), 'agents', 'alt.md'), agentText('alt', 'Geändert.'))
  const nachAenderung = (await json(`${mit.basisUrl}/api/workflows/${w4.id}/abnahme`)).faehigkeitVorschlaege ?? []
  pruefe(
    vorAenderung === undefined && q1a.status === 404 && /Basis-Commit/.test(grund(q1a)) && nachAenderung.some((e) => e.name === 'alt' && e.grund === null),
    '(q1) unverändert im Basis-Commit ⇒ nicht in der Projektion, Route 404; nach Änderung sichtbar.',
    `(q1) ${JSON.stringify({ vorAenderung, q1a, nachAenderung })}`
  )

  // ── (s) Verknüpfungen ────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const fremd = tmp('fremd')
    const a5 = w5.pfad
    lege(a5, { [`${VS}/agents/leser.md`]: agentText('leser') })
    const h5 = await hashAus(mit, w5.id, 'leser')
    renameSync(join(a5, '.claude'), join(a5, '.claude-alt'))
    if (!verknuepfe(fremd, join(a5, '.claude'))) console.log('  – (s) übersprungen: keine Verknüpfung anlegbar')
    else {
      const s1 = await route(mit.basisUrl, w5.id, 'uebernehmen', { typ: 'agent', name: 'leser', hash: h5 })
      const s1fremd = readdirSync(fremd)
      rmSync(join(a5, '.claude'))
      renameSync(join(a5, '.claude-alt'), join(a5, '.claude'))
      verknuepfe(fremd, join(a5, '.claude', 'agents'))
      const s2 = await route(mit.basisUrl, w5.id, 'uebernehmen', { typ: 'agent', name: 'leser', hash: h5 })
      const s2fremd = readdirSync(fremd)
      const fremdSkills = tmp('fremd-skills')
      lege(fremdSkills, { 'x/SKILL.md': skillText('x') })
      verknuepfe(fremdSkills, join(a5, ...VS.split('/'), 'skills'))
      const s3 = await route(mit.basisUrl, w5.id, 'verwerfen', { typ: 'skill', name: 'x', hash: 'a'.repeat(64) })
      pruefe(
        s1.status === 409 && s1fremd.length === 0 && s2.status === 409 && s2fremd.length === 0 && s3.status === 404 && da(fremdSkills, 'x/SKILL.md') && da(a5, `${VS}/agents/leser.md`),
        '(s) .claude, .claude/agents bzw. ein Behälter als Verknüpfung ⇒ kein Bewegen, fremde Ordner unverändert.',
        `(s) ${JSON.stringify({ s1, s1fremd, s2, s2fremd, s3 })}`
      )
    }
  }

  // ── (r) Rücknahme (direkter Aufruf mit Rückruf-Attrappe) ─────────────────────────────────────────────────────────────
  if (fuehreDurch === null) befunde.push('(r) fuehreVorschlagAktionDurch fehlt')
  else {
    const w = tmp('r')
    git(w, ['init', '--quiet'])
    schalteGitWartungAb(w)
    lege(w, { 'README.md': 'x\n' })
    git(w, ['add', '.'])
    git(w, ['commit', '--quiet', '-m', 'basis'])
    const basisCommit = git(w, ['rev-parse', 'HEAD']).trim()
    lege(w, { [`${VS}/skills/pruefen/SKILL.md`]: skillText('pruefen') })
    const r0 = join(tmp('r-lokal'), 'faehigkeiten.lokal.json')
    const lage = () => ({ wurzel: w, basisCommit, laufGesperrt: null, abnahme: { faellig: true, offen: true, entscheidungStatus: 'nicht_vorhanden', ergebnis: null }, werkzeugNamen })
    const { erkenneFaehigkeitVorschlaege } = await import('../src/faehigkeiten/vorschlag.ts')
    const hash = erkenneFaehigkeitVorschlaege(w)[0]?.hash
    const kontext = (aendere) => ({ lage, projektId: 'p', lokalPfad: r0, waechter: null, aendere })
    const r1 = await fuehreDurch({ rohId: 'wf', aktion: 'uebernehmen' }, { ok: true, daten: { typ: 'skill', name: 'pruefen', hash } }, kontext(() => ({ ok: false, status: 500, grund: 'nicht schreibbar' })))
    const r1zurueck = da(w, `${VS}/skills/pruefen/SKILL.md`) && !da(w, '.claude/skills/pruefen')
    const r2 = await fuehreDurch({ rohId: 'wf', aktion: 'uebernehmen' }, { ok: true, daten: { typ: 'skill', name: 'pruefen', hash } }, kontext(() => {
      lege(w, { [`${VS}/skills/pruefen/fremd.txt`]: 'x\n' })
      return { ok: false, status: 409, grund: 'abgelehnt' }
    }))
    pruefe(
      r1.status === 409 && /nichts übernommen/.test(r1.koerper.grund) && r1zurueck && r2.status === 500 && r2.koerper.quelle === `${VS}/skills/pruefen` && r2.koerper.ziel === '.claude/skills/pruefen',
      '(r) aendere lehnt ab ⇒ 409 mit Rücknahme; Rücknahme scheitert ⇒ 500 mit beiden Orten.',
      `(r) ${JSON.stringify({ r1, r1zurueck, r2 })}`
    )
  }
} catch (fehler) {
  befunde.push(`Gate-Ausführung gescheitert: ${fehler.stack ?? fehler}`)
} finally {
  for (const d of dienste) if (d.listening) await new Promise((r) => d.close(() => r()))
  for (const pfad of aufraeumen) raeumeVerzeichnis(pfad)
}

/** sha256 der Bytes einer Datei (Agent-Hash) oder 'f'×64. @param pfad - Pfad @returns Hash */
function createHashDatei(pfad) {
  return existsSync(pfad) ? createHash('sha256').update(readFileSync(pfad)).digest('hex') : 'f'.repeat(64)
}

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e):`)
  for (const b of befunde) console.error(`  - ${b}`)
  process.exit(1)
}
console.log('\n✓ Keine Befunde.')
