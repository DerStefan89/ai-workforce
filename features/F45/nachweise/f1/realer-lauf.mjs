#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/f1/realer-lauf.mjs
 *
 * Zweck: F45 F-1 — echte Läufe als Nachweis (Beleg 13 Teil Agent/Skill, Advisor A8/B9) über den echten Startweg:
 * loeseAusfuehrungsEingabenAuf (scripts/leitstand-server.mjs, Katalog-Kontext mit lokaler Datei in tmp) →
 * fuehreAufgabeDurch (Controller: Abgleich vor dem Spawn, Init-Gate, Laufakte faehigkeiten_im_lauf) → echte CLI aus
 * startvorlagen/ai-workforce.json. Testprojekt = Wegwerf-Git-Repo mit dem .claude des Skeletts (Hooks, Agents qa/
 * code-reviewer/architecture-advisor, 7 Skills) — nie haushaltsbuch2, nie ai-workforce selbst. Startfreigabe über eine
 * F4-Fixture in tmp (Muster scripts/check-f36-ws5b-skill.mjs), ~/.ai-workforce bleibt unberührt außer dem gelesenen,
 * bereits installierten Ort-B-Skill frontend-design.
 * - L1 qa eingeschaltet + Ort-B-Skill frontend-design: Skill laden, qa im Vordergrund fragen, general-purpose fragen.
 *   Erwartung: Init-Gate grün (init.plugins = [], kein plugin-authoring), qa aktiv und aufgerufen, general-purpose
 *   gesperrt (falls versucht), frontend-design benutzt.
 * - L2 qa ausgeschaltet (an leer), sonst gleich ohne Ort-B: kein Agent im Lauf, qa aktiv false, keine Aufrufe.
 * - L3 nur qa eingeschaltet, ohne Ort-B (QA 6: eigener Skill-Sperrzweig und Vorstart-Scan): qa aufgerufen, Explore gesperrt.
 * Schreibt zaehlung-<lauf>.json neben dieses Skript; die Rohströme bleiben in tmp (nicht committen).
 *
 * Wird aufgerufen von: Hand (`node features/F45/nachweise/f1/realer-lauf.mjs`), nicht von `npm run check`.
 */

import { randomUUID } from 'node:crypto'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { registriereAuftrag } from '../../../../src/auftrag/index.ts'
import { sha256Hex } from '../../../../src/checkpoint-store/index.ts'
import { fuehreAufgabeDurch } from '../../../../src/execution-controller/index.ts'
import { ermittleProjektFaehigkeiten, katalogFreigaben, ladeFaehigkeitenLokal, leseEingebautReferenz, projektEinstellungen, projektKennung } from '../../../../src/faehigkeiten/index.ts'
import { fuehreGitSync } from '../../../../src/git-starter/index.ts'
import { ermittleIstZustand } from '../../../../src/invocation-policy/index.ts'
import { ladeArtefaktVersion } from '../../../../src/lineage-registry/index.ts'
import { loeseRessourcenAuf } from '../../../../src/ressourcen/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../../../../src/startvorlage/index.ts'
import { loeseAusfuehrungsEingabenAuf } from '../../../../scripts/leitstand-server.mjs'

const HIER = import.meta.dirname
const INSTALL = join(HIER, '..', '..', '..', '..')
const MODELL = 'claude-haiku-4-5'
const STARTVORLAGE = join(INSTALL, 'startvorlagen', 'ai-workforce.json')
const vorlage = ladeStartvorlage(STARTVORLAGE)
const profilReferenz = leiteProfilReferenzAb(vorlage)
const wurzel = mkdtempSync(join(tmpdir(), 'f45-f1-real-'))
console.log(`Wegwerf-Wurzel: ${wurzel}`)
const git = (cwd, ...a) => fuehreGitSync(a, { cwd, encoding: 'utf8' })

// ─── F4-Startfreigabe-Fixture (echtes Startziel und deklarierte Version der Startvorlage) ──
const STARTFREIGABE_REPO = join(wurzel, 'startfreigabe')
mkdirSync(STARTFREIGABE_REPO)
git(STARTFREIGABE_REPO, 'init', '-q')
git(STARTFREIGABE_REPO, 'config', 'user.email', 'nachweis@example.invalid')
git(STARTFREIGABE_REPO, 'config', 'user.name', 'Nachweis')
writeFileSync(join(STARTFREIGABE_REPO, '.gitattributes'), '* -text\n')
git(STARTFREIGABE_REPO, 'add', '.gitattributes')
git(STARTFREIGABE_REPO, 'commit', '-q', '-m', 'init')
function committe(relativ, inhalt) {
  const ziel = join(STARTFREIGABE_REPO, relativ)
  mkdirSync(dirname(ziel), { recursive: true })
  writeFileSync(ziel, inhalt)
  git(STARTFREIGABE_REPO, 'add', relativ)
  git(STARTFREIGABE_REPO, 'commit', '-q', '-m', relativ)
  return { pfad: ziel, commit_hash: git(STARTFREIGABE_REPO, 'rev-parse', 'HEAD').trim(), datei_hash: sha256Hex(inhalt) }
}
const F4 = join(wurzel, 'f4')
mkdirSync(join(F4, '.claude', 'hooks'), { recursive: true })
writeFileSync(join(F4, '.claude', 'hooks', 'guard.js'), 'hook-fixture')
const SETTINGS = join(F4, '.claude', 'settings.json')
writeFileSync(SETTINGS, JSON.stringify({ hooks: { PreToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command: 'node .claude/hooks/guard.js' }] }] } }))
const IST = ermittleIstZustand(SETTINGS)
const UEBRIG = { werkzeug_version_deklariert: vorlage.werkzeugVersionDeklariert, berechtigungskontext: vorlage.berechtigungskontext, arbeitsverzeichnis_pfad: process.cwd(), startziel_pfad: vorlage.werkzeugStartziel[0] }
const BASELINE = committe('baseline.json', JSON.stringify({ werkzeug_konfiguration: { pfad: '.claude/settings.json', hash: IST.werkzeug_konfiguration_hash }, schutzskripte: IST.schutzskripte }))
const NACHWEIS = committe('nachweis.json', JSON.stringify({ gueltigkeitsschluessel: { werkzeug_konfiguration_hash: IST.werkzeug_konfiguration_hash, schutzskript_hashes: IST.schutzskripte.map((e) => e.hash), ...UEBRIG }, rot_fall_beleg: 'F45 F-1 Nachweis — Fixture', geprueft_am: new Date().toISOString() }))
const AUTORISIERUNG = join(F4, 'aktuelle-autorisierung.json')
writeFileSync(AUTORISIERUNG, JSON.stringify({ baselineReferenz: BASELINE, wirksamkeitsnachweisReferenz: NACHWEIS }))
const F4_OPTIONEN = { settingsPfad: SETTINGS, aktuelleAutorisierungPfad: AUTORISIERUNG, startfreigabeRepoWurzel: STARTFREIGABE_REPO }

// ─── Testprojekt (Skelett-.claude), Katalog ──
const projekt = join(wurzel, 'testprojekt')
mkdirSync(projekt)
cpSync(join(INSTALL, 'vorlagen', 'projekt-skelett', '.claude'), join(projekt, '.claude'), { recursive: true })
writeFileSync(join(projekt, 'CLAUDE.md'), '# Testprojekt F45 F-1\n')
writeFileSync(join(projekt, 'package.json'), `${JSON.stringify({ name: 'f45-f1-test', private: true, scripts: { check: 'node -e 0' } }, null, 2)}\n`)
git(projekt, 'init', '-q', '-b', 'arbeit')
git(projekt, 'config', 'user.email', 'nachweis@example.invalid')
git(projekt, 'config', 'user.name', 'Nachweis')
git(projekt, 'config', 'core.autocrlf', 'false')
git(projekt, 'add', '-A')
git(projekt, 'commit', '-q', '-m', 'init')
const katalogRoh = JSON.parse(readFileSync(join(INSTALL, 'ressourcen.json'), 'utf8')).ressourcen
const ortB = loeseRessourcenAuf(katalogRoh, INSTALL, STARTVORLAGE).find((r) => r.id === 'frontend-design')
const basisVerzeichnis = join(wurzel, 'kontrollzustand')

/** Optional nur ein Lauf: `node realer-lauf.mjs l3-nur-qa`. */
const NUR = process.argv[2]

/** Ein Lauf über den echten Startweg; schreibt die Zählung. */
async function lauf(name, an, mitOrtB, auftragstext) {
  if (NUR !== undefined && NUR !== name) return
  const lokalPfad = join(wurzel, `${name}-faehigkeiten.lokal.json`)
  writeFileSync(lokalPfad, JSON.stringify({ faehigkeiten_lokal_schema: 'v0', projekte: { testprojekt: { ...(an.length > 0 ? { an } : {}) } } }))
  const auftragId = `f45-f1-${name}-${randomUUID()}`
  registriereAuftrag(auftragId, profilReferenz, `F45 F-1 ${name}`, auftragstext, { basisVerzeichnis, schreiber: () => {} })
  const eingabenRoh = { rolle: 'ausfuehrung', anfragen: [], budget: vorlage.standardBudget, aufrufEingaben: { modell: MODELL }, auftragId }
  const optionen = {
    ...(mitOrtB ? { skillEintraege: [ortB], capWurzel: join(homedir(), '.ai-workforce', 'cap') } : {}),
    projektOrdner: projekt,
    installWurzel: INSTALL,
    faehigkeitenKontext: { lokal: ladeFaehigkeitenLokal(lokalPfad), lokalPfad, projektId: 'testprojekt', katalog: katalogFreigaben(katalogRoh, INSTALL), deaktiviert: [] },
  }
  // F45 F-2a (Advisor A4): der Kontext verlangt die angezeigten Projekt-Kennungen — hier die aktiven Einträge des Testprojekts.
  const referenz = leseEingebautReferenz()
  const ermittelt = ermittleProjektFaehigkeiten(projekt, { katalog: optionen.faehigkeitenKontext.katalog, einstellungen: projektEinstellungen(optionen.faehigkeitenKontext.lokal.daten, 'testprojekt'), werkzeugNamen: [...new Set(vorlage.werkzeugsaetze.schreibend.erlaubte_werkzeuge.map((r) => r.split('(')[0]))], referenz: referenz.ok ? referenz.referenz : { cli_version: '', agents: [], plugins: [], plugin_skills: [] } })
  optionen.faehigkeitenKontext.angezeigteProjektKennungen = ermittelt.eintraege.filter((e) => e.aktiv).flatMap((e) => projektKennung(e) ?? [])
  const eingaben = loeseAusfuehrungsEingabenAuf(eingabenRoh, 'schreibend', auftragstext, vorlage, projekt, optionen)
  if (!eingaben.ok) throw new Error(`${name}: Start abgelehnt — ${eingaben.grund}`)
  const laufId = `f45-f1-${name}-${randomUUID()}`
  const start = Date.now()
  const ergebnis = await fuehreAufgabeDurch(laufId, profilReferenz, eingaben.eingaben, { ...F4_OPTIONEN, basisVerzeichnis, rohBasisVerzeichnis: join(wurzel, 'roh'), cwd: projekt, zeitgrenzeMs: 600000 })
  const laufakte = ladeArtefaktVersion(`laufakte-${laufId}`, undefined, { basisVerzeichnis, schreiber: () => {} })?.daten ?? null
  const roh = laufakte === null ? null : JSON.parse(readFileSync(laufakte.rohstrom_referenz.pfad, 'utf8'))
  const init = roh === null ? null : (roh.stdout.split('\n').map((z) => { try { return JSON.parse(z) } catch { return null } }).find((z) => z?.type === 'system' && z?.subtype === 'init') ?? null)
  const result = roh === null ? null : (roh.stdout.split('\n').map((z) => { try { return JSON.parse(z) } catch { return null } }).findLast((z) => z?.type === 'result') ?? null)
  const zaehlung = {
    lauf: name,
    lauf_id: laufId,
    modell: MODELL,
    cli: init?.claude_code_version ?? null,
    dauer_ms_wand: Date.now() - start,
    eingeschaltet: an,
    ort_b: mitOrtB ? 'frontend-design' : null,
    argv_tools: eingaben.eingaben.aufrufEingaben.werkzeugsatz.erlaubte_werkzeuge,
    argv_disallowed: eingaben.eingaben.aufrufEingaben.disallowedTools ?? null,
    argv_settings: eingaben.eingaben.aufrufEingaben.ortB?.settings ?? null,
    init_gate_erwartung: eingaben.eingaben.ortBLauf ?? null,
    ergebnis: ergebnis.ok ? { klassifikation: ergebnis.klassifikation.ergebnis, grund: ergebnis.klassifikation.grund ?? null } : { stufe: ergebnis.stufe, grund: ergebnis.grund ?? null },
    init_gate_verstoss: roh?.init_gate_verstoss ?? null,
    init: init === null ? null : { tools: init.tools, agents: init.agents, skills: init.skills, plugins: init.plugins, mcp_servers: init.mcp_servers },
    beobachtung: laufakte?.beobachtung ?? null,
    faehigkeiten_im_lauf: laufakte?.faehigkeiten_im_lauf ?? null,
    permission_denials: result?.permission_denials ?? null,
    ergebnistext: result?.result ?? null,
  }
  writeFileSync(join(HIER, `zaehlung-${name}.json`), `${JSON.stringify(zaehlung, null, 2)}\n`)
  console.log(`\n=== ${name} ===\n${JSON.stringify({ ...zaehlung, argv_disallowed: undefined }, null, 2)}`)
}

const SCHRITTE = [
  'Testlauf ohne Codeänderung. Führe diese Schritte nacheinander aus, ohne Rückfrage. Wird ein Schritt abgelehnt oder ist ein Werkzeug nicht verfügbar, notiere es und mache weiter; lies keine Dateien und ändere nichts.',
]
await lauf(
  'l1-qa-an',
  ['agent:qa'],
  true,
  [
    ...SCHRITTE,
    '1. Lade den Skill "frontend-design" über das Skill-Werkzeug; führe ihn nicht weiter aus.',
    '2. Frage den Subagenten "qa" über das Agent-Werkzeug (run_in_background: false): "Antworte nur mit OK-QA".',
    '3. Frage ebenso den Subagenten "general-purpose": "Antworte nur mit OK-GP".',
    '4. Antworte mit einer Zeile je Schritt: Ergebnis oder Fehlermeldung wörtlich.',
  ].join('\n')
)
await lauf(
  'l2-qa-aus',
  [],
  false,
  [...SCHRITTE, '1. Frage den Subagenten "qa" über das Agent-Werkzeug (run_in_background: false): "Antworte nur mit OK-QA".', '2. Antworte mit einer Zeile: Ergebnis oder Fehlermeldung wörtlich.'].join('\n')
)
await lauf(
  'l3-nur-qa',
  ['agent:qa'],
  false,
  [
    ...SCHRITTE,
    '1. Frage den Subagenten "qa" über das Agent-Werkzeug (run_in_background: false): "Antworte nur mit OK-QA".',
    '2. Frage ebenso den Subagenten "Explore": "Antworte nur mit OK-EX".',
    '3. Antworte mit einer Zeile je Schritt: Ergebnis oder Fehlermeldung wörtlich.',
  ].join('\n')
)
console.log(`\nRohströme und Kontrollzustand bleiben in ${wurzel} (nicht committen).`)
