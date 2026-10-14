#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/f3b2/beleg.mjs
 *
 * Zweck: F45 F-3b-2 — echter Beleg über den echten Startweg (Plan features/F45/plan-f3b.md v3 H, v3.1 Punkt 6; Muster
 * features/F45/nachweise/f1/realer-lauf.mjs): bereitePluginStartVor mit Stefans echter lokaler Datei (nur gelesen; Zuordnung
 * superpowers:systematic-debugging → ausfuehrung), echtem Bestand (claude plugin list), echten Prüfberichten dieses Checkouts und der
 * echten Kopie-Wurzel ~/.ai-workforce/plugin-kopien → loeseAusfuehrungsEingabenAuf (schreibt die Lauf-Kopie nach
 * ~/.ai-workforce/plugin-kopien/_lauf/<hash>, wie jeder echte Lauf) → fuehreAufgabeDurch (Init-Gate mit Plugin-Soll, Datenordner
 * vorher/nachher) → echte CLI der Startvorlage im Wegwerf-Repo. Startfreigabe über eine F4-Fixture in tmp, Kontrollzustand in tmp.
 * - L1 mit Zuordnung: Skill superpowers:systematic-debugging laden, eine Hilfsdatei des Skills lesen (Advisor A6).
 * - L2 ohne Zuordnung (Kopie der lokalen Datei ohne plugin_zuordnung, in tmp): derselbe Auftrag — das Plugin ist nicht geladen.
 * Schreibt zaehlung-<lauf>.json neben dieses Skript (Pfade geschwärzt, keine Sitzungs-ids); Rohströme bleiben in tmp.
 *
 * Wird aufgerufen von: Hand (`node features/F45/nachweise/f3b2/beleg.mjs [L1|L2]`), nicht von `npm run check`.
 */

import { randomUUID } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { registriereAuftrag } from '../../../../src/auftrag/index.ts'
import { sha256Hex } from '../../../../src/checkpoint-store/index.ts'
import { baueBeobachtungsBlock } from '../../../../src/claude-code-gateway/index.ts'
import { fuehreAufgabeDurch } from '../../../../src/execution-controller/index.ts'
import { ladeFaehigkeitenLokal } from '../../../../src/faehigkeiten/index.ts'
import { fuehreGitSync } from '../../../../src/git-starter/index.ts'
import { ermittleIstZustand } from '../../../../src/invocation-policy/index.ts'
import { ladeArtefaktVersion } from '../../../../src/lineage-registry/index.ts'
import { bereitePluginStartVor } from '../../../../src/plugin-lauf/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../../../../src/startvorlage/index.ts'
import { loeseAusfuehrungsEingabenAuf } from '../../../../scripts/leitstand-server.mjs'
import { leseBerichte } from '../../../../scripts/leitstand/routen-pruefung.mjs'
import { echterPluginListenLaeufer, erzeugePluginAbruf } from '../../../../scripts/leitstand/routen-plugins.mjs'

const HIER = import.meta.dirname
const INSTALL = join(HIER, '..', '..', '..', '..')
const HOME = homedir()
const STARTVORLAGE = join(INSTALL, 'startvorlagen', 'ai-workforce.json')
const vorlage = ladeStartvorlage(STARTVORLAGE)
const profilReferenz = leiteProfilReferenzAb(vorlage)
const SATZ = vorlage.werkzeugsaetze.schreibend.erlaubte_werkzeuge
const LOKAL_ECHT = join(HOME, '.ai-workforce', 'faehigkeiten.lokal.json')
const KOPIEN = join(HOME, '.ai-workforce', 'plugin-kopien')
const DATEN = join(process.env.CLAUDE_CONFIG_DIR ?? join(HOME, '.claude'), 'plugins', 'data')
const wurzel = mkdtempSync(join(tmpdir(), 'f45-f3b2-beleg-'))
console.log(`Wegwerf-Wurzel: ${wurzel}`)
const git = (cwd, ...a) => fuehreGitSync(a, { cwd, encoding: 'utf8' })

/** Schwärzt Wegwerf-Wurzel und Home rekursiv. */
function schwaerze(wert) {
  if (typeof wert === 'string') {
    let s = wert
    for (const [roh, ersatz] of [
      [wurzel, '<WURZEL>'],
      [HOME, '<HOME>'],
    ])
      for (const form of [roh, roh.replaceAll('\\', '/'), roh.replaceAll('\\', '\\\\')]) s = s.split(form).join(ersatz)
    return s.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '<ID>')
  }
  if (Array.isArray(wert)) return wert.map(schwaerze)
  if (wert !== null && typeof wert === 'object') return Object.fromEntries(Object.entries(wert).map(([k, v]) => [k, schwaerze(v)]))
  return wert
}

// ─── F4-Startfreigabe-Fixture (Muster F-1) ──
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
const NACHWEIS = committe('nachweis.json', JSON.stringify({ gueltigkeitsschluessel: { werkzeug_konfiguration_hash: IST.werkzeug_konfiguration_hash, schutzskript_hashes: IST.schutzskripte.map((e) => e.hash), ...UEBRIG }, rot_fall_beleg: 'F45 F-3b-2 Beleg — Fixture', geprueft_am: new Date().toISOString() }))
const AUTORISIERUNG = join(F4, 'aktuelle-autorisierung.json')
writeFileSync(AUTORISIERUNG, JSON.stringify({ baselineReferenz: BASELINE, wirksamkeitsnachweisReferenz: NACHWEIS }))
const F4_OPTIONEN = { settingsPfad: SETTINGS, aktuelleAutorisierungPfad: AUTORISIERUNG, startfreigabeRepoWurzel: STARTFREIGABE_REPO }

// ─── Wegwerf-Repo (Arbeitsordner) ──
const projekt = join(wurzel, 'testprojekt')
mkdirSync(projekt)
writeFileSync(join(projekt, 'README.md'), '# Testprojekt F45 F-3b-2\n')
git(projekt, 'init', '-q', '-b', 'arbeit')
git(projekt, 'config', 'user.email', 'nachweis@example.invalid')
git(projekt, 'config', 'user.name', 'Nachweis')
git(projekt, 'add', '-A')
git(projekt, 'commit', '-q', '-m', 'init')
const basisVerzeichnis = join(wurzel, 'kontrollzustand')
const pluginAbruf = erzeugePluginAbruf({ liste: echterPluginListenLaeufer(vorlage.werkzeugStartziel, INSTALL), werkzeugsatz: SATZ, projektPfad: INSTALL })
const berichte = leseBerichte(join(INSTALL, 'kontrollzustand'), () => {}).berichte

const AUFTRAG = [
  'Testlauf ohne Codeänderung. Führe diese Schritte nacheinander aus, ohne Rückfrage; wird ein Schritt abgelehnt oder fehlt ein Werkzeug, notiere es wörtlich und mache weiter. Ändere keine Datei.',
  '1. Lade den Skill "superpowers:systematic-debugging" über das Skill-Werkzeug; wende ihn nicht an.',
  '2. Lies mit dem Read-Werkzeug die Datei root-cause-tracing.md aus dem Ordner dieses Skills (Basisordner aus der Ausgabe des Skill-Werkzeugs) und nenne ihre erste Überschrift wörtlich.',
  '3. Antworte mit einer Zeile je Schritt: Ergebnis oder Fehlermeldung wörtlich.',
].join('\n')

/** Ein Lauf über den echten Startweg; schreibt die Zählung. */
async function lauf(name, mitZuordnung) {
  let lokalPfad = LOKAL_ECHT
  if (!mitZuordnung) {
    const daten = JSON.parse(readFileSync(LOKAL_ECHT, 'utf8'))
    for (const p of Object.values(daten.projekte ?? {})) delete p.plugin_zuordnung
    lokalPfad = join(wurzel, `${name}-faehigkeiten.lokal.json`)
    writeFileSync(lokalPfad, JSON.stringify(daten))
  }
  const lokal = ladeFaehigkeitenLokal(lokalPfad)
  if (lokal.zustand !== 'gueltig') throw new Error(`${name}: lokale Datei ${lokal.zustand} (${lokal.grund ?? ''})`)
  const vorbereitungStart = Date.now()
  const pluginStart = await bereitePluginStartVor({ lokal: lokal.daten, projektId: 'ai-workforce', rolle: 'ausfuehrung', worker: 'claude-code', art: 'schreibend', leseBestand: pluginAbruf.roh, berichte, kopienWurzel: KOPIEN, kopieWerkzeugsatz: SATZ, schrittWerkzeugNamen: [...new Set(SATZ.map((r) => r.split('(')[0]))] })
  const vorbereitungMs = Date.now() - vorbereitungStart
  if (pluginStart.art === 'fehler') throw new Error(`${name}: ${pluginStart.grund}`)
  if (mitZuordnung && (pluginStart.art !== 'start' || pluginStart.plugins.length === 0)) throw new Error(`${name}: keine Zuordnung mit Freigabe gefunden — Stefan: superpowers:systematic-debugging der Ausführung zuordnen`)
  const auftragId = `f45-f3b2-${name}-${randomUUID()}`
  registriereAuftrag(auftragId, profilReferenz, `F45 F-3b-2 ${name}`, AUFTRAG, { basisVerzeichnis, schreiber: () => {} })
  const eingabenRoh = { rolle: 'ausfuehrung', anfragen: [], budget: vorlage.standardBudget, aufrufEingaben: { modell: vorlage.modell }, auftragId }
  const optionen = {
    projektOrdner: projekt,
    installWurzel: INSTALL,
    faehigkeitenKontext: {
      lokal,
      lokalPfad,
      projektId: 'ai-workforce',
      katalog: new Map(),
      deaktiviert: [],
      angezeigteProjektKennungen: [],
      angezeigtePluginKennungen: pluginStart.art === 'start' ? pluginStart.kennungen : [],
      ...(pluginStart.art === 'start' ? { pluginStart } : {}),
      pluginLaufWurzel: join(KOPIEN, '_lauf'),
      pluginDatenordner: DATEN,
    },
  }
  const eingaben = loeseAusfuehrungsEingabenAuf(eingabenRoh, 'schreibend', AUFTRAG, vorlage, projekt, optionen)
  if (!eingaben.ok) throw new Error(`${name}: Start abgelehnt — ${eingaben.grund}`)
  const laufId = `f45-f3b2-${name}-${randomUUID()}`
  const start = Date.now()
  const ergebnis = await fuehreAufgabeDurch(laufId, profilReferenz, eingaben.eingaben, { ...F4_OPTIONEN, basisVerzeichnis, rohBasisVerzeichnis: join(wurzel, 'roh'), cwd: projekt, zeitgrenzeMs: 600000 })
  const laufakte = ladeArtefaktVersion(`laufakte-${laufId}`, undefined, { basisVerzeichnis, schreiber: () => {} })?.daten ?? null
  const roh = laufakte === null ? null : JSON.parse(readFileSync(laufakte.rohstrom_referenz.pfad, 'utf8'))
  const zeilen = roh === null ? [] : roh.stdout.split('\n').flatMap((z) => { try { return [JSON.parse(z)] } catch { return [] } })
  const init = zeilen.find((z) => z?.type === 'system' && z?.subtype === 'init') ?? null
  const result = zeilen.findLast((z) => z?.type === 'result') ?? null
  const aufrufe = zeilen.flatMap((z) => (z.message?.content ?? []).filter((b) => b?.type === 'tool_use').map((b) => ({ name: b.name, input: b.name === 'Read' ? { file_path: b.input?.file_path } : b.input, im_subagent: z.parent_tool_use_id != null })))
  const ergebnisseZuAufrufen = zeilen.flatMap((z) => (z.message?.content ?? []).filter((b) => b?.type === 'tool_result').map((b) => ({ is_error: b.is_error === true, text: (Array.isArray(b.content) ? b.content.map((c) => c.text ?? '').join(' ') : String(b.content ?? '')).slice(0, 200) })))
  const zaehlung = schwaerze({
    lauf: name,
    mit_zuordnung: mitZuordnung,
    gemessen_am: new Date().toISOString(),
    cli: init?.claude_code_version ?? null,
    modell: vorlage.modell,
    vorbereitung_ms: vorbereitungMs,
    dauer_ms_wand: Date.now() - start,
    plugin_start: pluginStart.art === 'start' ? { kennungen: pluginStart.kennungen, plugins: pluginStart.plugins.map((p) => ({ plugin_id: p.pluginId, name: p.name, kopie_hash: p.kopieHash, pruefbericht: p.pruefbericht, skills: p.skills, agents: p.agents })), nicht_geladen: pluginStart.nichtGeladen } : pluginStart,
    argv_plugin_dirs: eingaben.eingaben.aufrufEingaben.pluginDirs ?? null,
    argv_allowed: eingaben.eingaben.aufrufEingaben.werkzeugsatz.erlaubte_werkzeuge,
    argv_settings: eingaben.eingaben.aufrufEingaben.ortB?.settings ?? null,
    init_gate_erwartung: eingaben.eingaben.ortBLauf ?? null,
    instruktion_im_auftrag: eingaben.eingaben.auftragstext.split('\n').filter((z) => z.startsWith('Plugin-Fähigkeiten')),
    ergebnis: ergebnis.ok ? { klassifikation: ergebnis.klassifikation.ergebnis, grund: ergebnis.klassifikation.grund ?? null } : { stufe: ergebnis.stufe, grund: ergebnis.grund ?? null },
    init_gate_verstoss: roh?.init_gate_verstoss ?? null,
    init: init === null ? null : { tools: init.tools, agents: init.agents, skills: init.skills, plugins: init.plugins, mcp_servers: init.mcp_servers, slash_commands_mit_praefix: (init.slash_commands ?? []).filter((n) => n.includes(':')) },
    werkzeugaufrufe: aufrufe,
    werkzeugergebnisse: ergebnisseZuAufrufen,
    faehigkeiten_im_lauf: laufakte?.faehigkeiten_im_lauf ?? null,
    beobachtung: laufakte?.beobachtung ?? null,
    beobachtungsblock: baueBeobachtungsBlock(laufakte?.beobachtung),
    permission_denials: result?.permission_denials ?? null,
    ergebnistext: typeof result?.result === 'string' ? result.result.slice(0, 1200) : null,
  })
  writeFileSync(join(HIER, `zaehlung-beleg-${name}.json`), `${JSON.stringify(zaehlung, null, 2)}\n`)
  console.log(`\n=== ${name} ===\n${JSON.stringify({ ergebnis: zaehlung.ergebnis, init_plugins: zaehlung.init?.plugins, init_skills: zaehlung.init?.skills, aufrufe: zaehlung.werkzeugaufrufe, plugins: zaehlung.faehigkeiten_im_lauf?.plugins, eintraege: zaehlung.faehigkeiten_im_lauf?.eintraege, block: zaehlung.beobachtungsblock }, null, 2)}`)
}

const NUR = process.argv[2]
if (NUR === undefined || NUR === 'L1') await lauf('L1', true)
if (NUR === undefined || NUR === 'L2') await lauf('L2', false)
console.log(`\nRohströme und Kontrollzustand bleiben in ${wurzel} (nicht committen).`)
