/**
 * Datei: scripts/check-f45-f1-faehigkeiten.mjs
 *
 * Zweck: Gate F45 F-1 (Fähigkeiten im Lauf; F-815/F-816/F-910 Teil Init-Gate; Spike state/spike-f45-f1-agents.md).
 * Prüft den echten Startweg loeseAusfuehrungsEingabenAuf (scripts/leitstand-server.mjs) mit einem Wegwerf-Projekt
 * aus dem Skelett (Agents qa/code-reviewer/architecture-advisor, 7 Skills, Command lessons) und dem echten Katalog:
 * Grün
 * (a) Katalog-Kontext ohne eingeschaltete Projekt-Einträge (E-F45-6): Tokens bitgleich wie ohne Kontext; faehigkeiten-
 *     ImLauf listet qa als „nicht eingeschaltet“, kein ortBLauf;
 * (b) agent:qa + skill:ponytail eingeschaltet: --tools mit Agent und Skill, --allowedTools Agent(qa)/Skill(ponytail),
 *     --disallowedTools Agent(<eingebaut>) + Agent(code-reviewer|architecture-advisor) + Skill(<übrige>) +
 *     Write/Edit(**\/.claude/**) + Bash(git:*), --settings mit enabledPlugins aus, Edit(./**) und leere MCP-Config
 *     bleiben, E-182 besteht; Auftragstext mit Vordergrund-Satz; ortBLauf.agents; passende init besteht das Gate;
 * Rot
 * (c) Inhalt von qa geändert, qa aber eingeschaltet → Start abgelehnt mit Grund „weicht ab“ (QA 1: kein Lauf ohne die
 *     eingeschaltete Fähigkeit), nicht eingeschaltet → Tokens wie (a); (d) kaputte lokale Datei → Start
 *     abgelehnt (E-F45-7); (e) zweite Agent-Datei mit name: qa → Start abgelehnt (mehrdeutig); (f) init mit unbekanntem
 *     Agent bzw. geladenem Plugin → Init-Gate-Verstoß; (g) Hash zwischen Prüfung und Spawn geändert → Abgleich meldet.
 *
 * Wird aufgerufen von: npm run check
 *
 * Wichtig: Kein Netz, kein CLI-Start, kein ~/.ai-workforce — der reale Nachweis steht in features/F45/nachweise/f1/.
 */

import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { baueAufruf, pruefeInitZeile } from '../src/claude-code-gateway/index.ts'
import { erfasseClaudeOrdner } from '../src/execution-controller/index.ts'
import { ermittleProjektFaehigkeiten, katalogFreigaben, ladeFaehigkeitenLokal, leseEingebautReferenz, projektEinstellungen, projektKennung, pruefeGegenMomentaufnahme } from '../src/faehigkeiten/index.ts'
import { pruefeAufrufparameter } from '../src/invocation-policy/index.ts'
import { ladeStartvorlage } from '../src/startvorlage/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { loeseAusfuehrungsEingabenAuf } from './leitstand-server.mjs'

const befunde = []
console.log('\n=== F45-F-1-Fähigkeiten-Check ===\n')

const INSTALL = process.cwd()
const vorlage = ladeStartvorlage('startvorlagen/ai-workforce.json')
const KATALOG = katalogFreigaben(JSON.parse(readFileSync(join(INSTALL, 'ressourcen.json'), 'utf8')).ressourcen, INSTALL)
const REFERENZ = JSON.parse(readFileSync(join(INSTALL, 'src', 'faehigkeiten', 'eingebaut-referenz.json'), 'utf8'))
const ordnerListe = []

/** Wegwerf-Projekt mit dem .claude des Skeletts. */
function projekt() {
  const wurzel = mkdtempSync(join(tmpdir(), 'f45-f1-gate-'))
  ordnerListe.push(wurzel)
  cpSync(join(INSTALL, 'vorlagen', 'projekt-skelett', '.claude'), join(wurzel, '.claude'), { recursive: true })
  return wurzel
}

/** Lokale Datei in tmp (nie ~/.ai-workforce). */
function lokal(inhalt) {
  const dir = mkdtempSync(join(tmpdir(), 'f45-f1-lokal-'))
  ordnerListe.push(dir)
  const pfad = join(dir, 'faehigkeiten.lokal.json')
  if (inhalt !== undefined) writeFileSync(pfad, typeof inhalt === 'string' ? inhalt : JSON.stringify(inhalt))
  return pfad
}

/**
 * F45 F-2a (Advisor A4): die Kennungen, die die Oberfläche für diesen Ordner angezeigt hätte (aktive Projekt-Einträge) —
 * der Kontext verlangt sie; das Gate prüft hier den F-1-Start, nicht die Anzeige-Bindung (die prüft der Servertest).
 */
function angezeigteKennungen(wurzel, lokal) {
  if (lokal.zustand === 'ungueltig') return []
  const referenz = leseEingebautReferenz()
  const werkzeugNamen = [...new Set(vorlage.werkzeugsaetze.schreibend.erlaubte_werkzeuge.map((r) => r.split('(')[0]))]
  const ermittelt = ermittleProjektFaehigkeiten(wurzel, { katalog: KATALOG, einstellungen: projektEinstellungen(lokal.daten, 'gate'), werkzeugNamen, referenz: referenz.ok ? referenz.referenz : { cli_version: '', agents: [], plugins: [], plugin_skills: [] } })
  return ermittelt.eintraege.filter((e) => e.aktiv).flatMap((e) => projektKennung(e) ?? [])
}

/** Start über loeseAusfuehrungsEingabenAuf mit optionalem Katalog-Kontext. */
function starte(wurzel, lokalPfad) {
  const roh = { rolle: 'ausfuehrung', anfragen: [], budget: vorlage.standardBudget, aufrufEingaben: { modell: 'claude-sonnet-5' }, auftragId: 'gate' }
  const optionen = { leseAusfuehrungsVorbedingung: () => ({ ok: true }) }
  if (lokalPfad !== undefined) {
    const lokal = ladeFaehigkeitenLokal(lokalPfad)
    optionen.faehigkeitenKontext = { lokal, lokalPfad, projektId: 'gate', katalog: KATALOG, deaktiviert: [], angezeigteProjektKennungen: angezeigteKennungen(wurzel, lokal) }
  }
  return loeseAusfuehrungsEingabenAuf(roh, 'schreibend', 'AUFTRAG', vorlage, wurzel, optionen)
}

const tokens = (e) => baueAufruf({ ...e.eingaben.aufrufEingaben, prompt: e.eingaben.auftragstext })
const flag = (t, f) => (t.indexOf(f) === -1 ? '' : t[t.indexOf(f) + 1])
const datei = (an) => ({ faehigkeiten_lokal_schema: 'v0', projekte: { gate: { an } } })

try {
  // (a) bitgleich ohne Einschalten
  {
    const vor = befunde.length
    const w = projekt()
    const ohne = starte(w)
    const mit = starte(w, lokal())
    if (!ohne.ok || !mit.ok) befunde.push(`(a) Start abgelehnt: ${ohne.grund ?? mit.grund}`)
    else {
      if (JSON.stringify(tokens(ohne)) !== JSON.stringify(tokens(mit))) befunde.push('(a) Tokens mit Katalog-Kontext ohne Einschalten nicht bitgleich')
      const qa = mit.eingaben.faehigkeitenImLauf?.find((f) => f.id === 'agent:qa')
      if (qa?.aktiv !== false || !/nicht eingeschaltet/.test(qa?.grund ?? '')) befunde.push(`(a) Eintrag agent:qa = ${JSON.stringify(qa)}`)
      if ('ortBLauf' in mit.eingaben) befunde.push('(a) ortBLauf gesetzt ohne aktive Fähigkeit')
    }
    if (befunde.length === vor) console.log('✓ (a) Katalog-Kontext ohne eingeschaltete Projekt-Einträge: Tokens bitgleich, qa „nicht eingeschaltet“, kein Init-Gate.')
  }

  // (b) qa + ponytail eingeschaltet
  {
    const vor = befunde.length
    const w = projekt()
    const e = starte(w, lokal(datei(['agent:qa', 'skill:ponytail'])))
    if (!e.ok) befunde.push(`(b) Start abgelehnt: ${e.grund}`)
    else {
      const t = tokens(e)
      const tools = flag(t, '--tools').split(',')
      const allowed = flag(t, '--allowedTools').split(',')
      const deny = flag(t, '--disallowedTools').split(',')
      if (!tools.includes('Agent') || !tools.includes('Skill')) befunde.push(`(b) --tools: ${tools}`)
      if (!allowed.includes('Agent(qa)') || !allowed.includes('Skill(ponytail)') || !allowed.includes('Edit(./**)') || allowed.includes('Agent') || allowed.includes('Write')) befunde.push(`(b) --allowedTools: ${allowed}`)
      for (const n of [...REFERENZ.agents, 'code-reviewer', 'architecture-advisor']) if (!deny.includes(`Agent(${n})`)) befunde.push(`(b) Agent(${n}) fehlt in --disallowedTools`)
      for (const r of ['Write(**/.claude/**)', 'Edit(**/.claude/**)', 'Skill(advisor-pass)', 'Skill(lessons)', 'Skill(design)', 'Bash(git:*)']) if (!deny.includes(r)) befunde.push(`(b) ${r} fehlt in --disallowedTools`)
      if (deny.includes('Agent(qa)') || deny.includes('Skill(ponytail)')) befunde.push('(b) aktive Einträge gesperrt')
      if (deny.at(-1) !== 'Bash(git:*)') befunde.push('(b) Bash(git:*) nicht am Ende')
      const settings = JSON.parse(flag(t, '--settings') || '{}')
      if (settings.disableBundledSkills !== true || settings.skillOverrides?.ponytail !== undefined || settings.skillOverrides?.['advisor-pass'] !== 'off') befunde.push(`(b) --settings skillOverrides: ${flag(t, '--settings')}`)
      if (JSON.stringify(settings.enabledPlugins) !== JSON.stringify(Object.fromEntries(REFERENZ.plugins.map((p) => [p, false])))) befunde.push(`(b) enabledPlugins: ${JSON.stringify(settings.enabledPlugins)}`)
      if (!t.includes('--strict-mcp-config') || flag(t, '--mcp-config') !== '{"mcpServers":{}}') befunde.push('(b) E-187 verletzt')
      if (!pruefeAufrufparameter(t).ok) befunde.push(`(b) E-182: ${pruefeAufrufparameter(t).grund}`)
      if (!/Subagenten qa — nur im Vordergrund aufrufen \(Agent-Werkzeug mit run_in_background: false\)/.test(e.eingaben.auftragstext)) befunde.push('(b) Vordergrund-Satz fehlt im Auftragstext')
      const gate = e.eingaben.ortBLauf
      if (JSON.stringify(gate?.agents?.erlaubt) !== '["qa"]' || !gate?.agents?.gesperrt.includes('general-purpose')) befunde.push(`(b) ortBLauf.agents: ${JSON.stringify(gate?.agents)}`)
      const init = { type: 'system', subtype: 'init', tools: ['Task', 'Bash', 'Edit', 'Glob', 'Grep', 'Read', 'Skill', 'Write'], agents: ['architecture-advisor', 'claude', 'code-reviewer', 'Explore', 'general-purpose', 'Plan', 'qa', 'statusline-setup'], skills: ['ponytail'], slash_commands: ['ponytail', 'clear', 'compact'], mcp_servers: [], plugins: [] }
      const erwartet = { skills: gate.skillNamen, mcpServer: gate.mcpServer, gesperrt: gate.gesperrteNamen, agents: gate.agents }
      const gruen = pruefeInitZeile(init, erwartet)
      if (gruen !== null) befunde.push(`(b) passende init besteht das Gate nicht: ${gruen}`)
      // (f) Rot: unbekannter Agent, geladenes Plugin
      if (!/init\.agents enthält unbekannte Agents: neu/.test(pruefeInitZeile({ ...init, agents: [...init.agents, 'neu'] }, erwartet) ?? '')) befunde.push('(f) unbekannter Agent nicht erkannt')
      if (!/init\.plugins nicht leer/.test(pruefeInitZeile({ ...init, plugins: [{ name: 'x', source: 'x@builtin' }] }, erwartet) ?? '')) befunde.push('(f) geladenes Plugin nicht erkannt')
      // (g) Abgleich vor dem Spawn
      const snap = erfasseClaudeOrdner(w)
      if (pruefeGegenMomentaufnahme(e.eingaben.faehigkeitenImLauf, snap) !== null) befunde.push('(g) unveränderter Stand meldet Abweichung')
      writeFileSync(join(w, '.claude', 'agents', 'qa.md'), 'verändert')
      if (!/agent:qa/.test(pruefeGegenMomentaufnahme(e.eingaben.faehigkeitenImLauf, erfasseClaudeOrdner(w)) ?? '')) befunde.push('(g) geänderter Agent nicht erkannt')
    }
    if (befunde.length === vor) console.log('✓ (b) qa + ponytail eingeschaltet: Agent/Skill im Werkzeugsatz, Sperrliste (eingebaut + übrige Projekt-Agents/-Skills), Plugins aus, E-182/E-187/Edit(./**)/Bash(git:*) unverändert, Vordergrund-Satz, Init-Gate grün; (f) unbekannter Agent/Plugin rot; (g) Abgleich vor dem Spawn.')
  }

  // (c) Inhalt abweichend, (d) kaputte Datei, (e) mehrdeutiger Name
  {
    const vor = befunde.length
    const w = projekt()
    const basis = starte(w, lokal())
    writeFileSync(join(w, '.claude', 'agents', 'qa.md'), `${readFileSync(join(w, '.claude', 'agents', 'qa.md'), 'utf8')}\nZusatz\n`)
    const c = starte(w, lokal(datei(['agent:qa'])))
    if (c.ok || !/eingeschaltet, aber im Arbeitsordner nicht aktiv — agent:qa \(Inhalt weicht von der Freigabe ab/.test(c.grund)) befunde.push(`(c) eingeschaltet + abweichend nicht abgelehnt: ${JSON.stringify(c.grund ?? 'ok')}`)
    const cAus = starte(w, lokal())
    if (!cAus.ok || !basis.ok || JSON.stringify(tokens(cAus)) !== JSON.stringify(tokens(basis))) befunde.push('(c) nicht eingeschaltet: Tokens nicht wie (a)')
    const d = starte(projekt(), lokal('{ kaputt'))
    if (d.ok || !/E-F45-7/.test(d.grund)) befunde.push(`(d) kaputte Datei nicht abgelehnt: ${JSON.stringify(d.grund ?? 'ok')}`)
    const w2 = projekt()
    writeFileSync(join(w2, '.claude', 'agents', 'zz.md'), '---\nname: qa\ndescription: x\ntools: Read\n---\n')
    const e = starte(w2, lokal(datei(['agent:qa'])))
    if (e.ok || !/mehrdeutig/.test(e.grund)) befunde.push(`(e) mehrdeutiger Name nicht abgelehnt: ${JSON.stringify(e.grund ?? 'ok')}`)
    // Code-Review 1: zweite Datei, die qa nur im verworfenen Frontmatter (permissionMode) trägt → ebenfalls mehrdeutig.
    const w3 = projekt()
    writeFileSync(join(w3, '.claude', 'agents', 'alias.md'), '---\nname: qa\ndescription: x\ntools: Read\npermissionMode: bypassPermissions\n---\n')
    const f = starte(w3, lokal(datei(['agent:qa'])))
    if (f.ok || !/mehrdeutig/.test(f.grund)) befunde.push(`(e) Name aus verworfenem Frontmatter nicht erkannt: ${JSON.stringify(f.grund ?? 'ok')}`)
    if (befunde.length === vor) console.log('✓ (c) Inhalt abweichend + eingeschaltet → Start abgelehnt, nicht eingeschaltet → Tokens unverändert; (e) auch über verworfenes Frontmatter (permissionMode); (d) kaputte lokale Datei → Start abgelehnt; (e) zweite Datei mit name: qa → Start abgelehnt.')
  }
} finally {
  for (const o of ordnerListe) raeumeVerzeichnis(o)
}

if (befunde.length > 0) {
  console.log(`\n✗ ${befunde.length} Befund(e):`)
  for (const b of befunde) console.log(`  - ${b}`)
  process.exit(1)
}
console.log('\n✓ F45-F-1-Fähigkeiten-Check sauber.')
