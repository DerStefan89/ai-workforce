/**
 * Datei: scripts/check-f45-b2a1-projektkarte.mjs
 *
 * Zweck: Gate F45 B2a-1 (Projektkarte; F-1064, F-1065, F-1066, F-1062, F-936, F-931, F-829; Plan features/F45/plan-b2a1.md v2).
 * Grün
 * (a) Zuschnitt: die Karte für architekt, architecture-advisor und code-reviewer trägt genau die Abschnitte der Tabelle
 *     (gegen die echten Dateien dieses Repos).
 * (b) Hash stabil bei gleichen Eingaben, anders bei geänderter ARCHITECTURE.md.
 * (c) [FÜLLUNG]: die Skelett-ARCHITECTURE.md wird als „Architektur noch nicht beschrieben“ gemeldet (kein Vorlagentext,
 *     Lücke in fehlend); dieses Repo gilt als beschrieben.
 * (d) Server, echter HTTP-Pfad mit Attrappe: Architekt-Auftrag (Codex, Modus feature) enthält Bestand,
 *     Ausführungsrahmen, Capability-Auszug und die Lese-Anweisung; eingaben.projektkarte (Laufakte) gesetzt.
 * (e) Server: architecture-advisor bekommt die Karte ohne Fähigkeiten-Abschnitt.
 * (f) Server: Codex-Review-Auftrag ohne Beobachtungsblock, mit Karte (Checkliste, Urteil je Punkt) — F-1062.
 * (g) Server: ohne ARCHITECTURE.md läuft der Architekt-Schritt, fehlend nennt die Lücke (fail-open).
 * (h) Argv bitgleich mit und ohne Karte (Prompt per stdin, beide Worker); jarvis/router/ausfuehrung ohne Karte;
 *     baueProjektkarte( genau einmal im Server (starteWorkflowSchritt( zählt seit F45 W2b-1 nur check-f15-workflow).
 * (i) F-1066: ARCHITECTURE.md in der Projektmodus-Allowlist; Laufakte mit projektkarte gültig.
 * Rot (Selbsttest)
 * (j) Laufakte mit kaputtem projektkarte-Feld wird abgelehnt; eine geänderte Kartenzeile ändert den Hash.
 * Grün (Korrekturrunde)
 * (k) Echte Größe: die Karte aus den echten Eingaben dieses Repos (Beschreibung, ARCHITECTURE.md, alle entschiedenen ADRs,
 *     git ls-files, DoD, Checkliste) trägt für jede Rolle Qualität vollständig (DoD; beim Review Checkliste und „Urteil je
 *     Punkt“), abschnitte nennt die Qualität (Code-Review 1, QA L1).
 *
 * Wird aufgerufen von: npm run check
 *
 * Wichtig: Kein Netz, kein CLI-Start (fuehreAufgabeDurchFn ist eine Attrappe); Wegwerf-Repos unter tmpdir.
 */

import { randomUUID } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { leseEntschiedeneAdrs, pruefeProjektmodusScope } from '../src/architekt/index.ts'
import { baueAufruf, validiereLaufakteDaten } from '../src/claude-code-gateway/index.ts'
import { baueCodexAufruf } from '../src/codex-gateway/index.ts'
import { fuehreGitSync } from '../src/git-starter/index.ts'
import { leseHarnessInventar } from '../src/harness-abgleich/index.ts'
import { ladeArtefaktVersion, registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { analysiereArchitektur, baueProjektkarte, istKarteRolle, ZUSCHNITT } from '../src/projektkarte/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { erzeugeRequestHandler } from './leitstand-server.mjs'

const befunde = []
console.log('\n=== F45-B2a-1-Projektkarte-Check ===\n')

const REPO_ARCH = readFileSync('ARCHITECTURE.md', 'utf8')
const SKELETT_ARCH = readFileSync('vorlagen/projekt-skelett/ARCHITECTURE.md', 'utf8')
const REPO_CLAUDE = readFileSync('CLAUDE.md', 'utf8')
const REPO_CHECKLISTE = readFileSync('.claude/agents/code-reviewer.md', 'utf8')
const TITEL = { vorhaben: '## Vorhaben', bestand: '## Bestand', ausfuehrungsrahmen: '## Ausführungsrahmen', faehigkeiten: '## Im Projekt eingeschaltete Fähigkeiten', qualitaet: '## Qualität' }

/**
 * Eingaben der Karte aus den echten Dateien dieses Repos.
 * @param architektur - Text von ARCHITECTURE.md
 * @returns ProjektkarteEingaben
 */
function repoEingaben(architektur = REPO_ARCH) {
  return {
    projektbeschreibung: { pfad: 'docs/projekt/kontext/beschreibung.md', text: readFileSync('docs/projekt/kontext/beschreibung.md', 'utf8') },
    auftrag: { titel: 'Gate', ziel: 'Gate-Ziel', akzeptanzkriterien: [{ id: 'AK1', text: 'x' }], nicht_ziele: [] },
    architektur: { pfad: 'ARCHITECTURE.md', text: architektur },
    adrs: '',
    dateien: ['package.json', 'src/projektkarte/index.ts'],
    rahmen: { werkzeuge: ['Read', 'Bash(npm ci)'], bashZeitgrenzeMs: 1200000, pruefbefehl: ['node', 'npm-cli.js', 'run', 'check'], arbeitsordner: true },
    faehigkeiten: [],
    dod: ['Typisiert'],
    reviewCheckliste: { pfad: '.claude/agents/code-reviewer.md', text: REPO_CHECKLISTE },
    lesefehler: [],
  }
}

// (a) Zuschnitt
{
  const vor = befunde.length
  for (const rolle of ['architekt', 'architecture-advisor', 'code-reviewer']) {
    const karte = baueProjektkarte(repoEingaben(), rolle)
    if (JSON.stringify(karte.abschnitte) !== JSON.stringify(ZUSCHNITT.get(rolle))) befunde.push(`(a) ${rolle}: Abschnitte ${karte.abschnitte.join(',')} statt ${ZUSCHNITT.get(rolle).join(',')}`)
    for (const [id, titel] of Object.entries(TITEL)) {
      if (karte.text.includes(`${titel}\n`) !== ZUSCHNITT.get(rolle).includes(id)) befunde.push(`(a) ${rolle}: Abschnitt '${titel}' ${ZUSCHNITT.get(rolle).includes(id) ? 'fehlt' : 'gehört nicht in den Zuschnitt'}`)
    }
  }
  // Korrekturrunde (Code-Review 1, QA L1): Bestand steht zuletzt, damit eine Gesamtkürzung nie die Qualität trifft.
  if (JSON.stringify(ZUSCHNITT.get('code-reviewer')) !== JSON.stringify(['vorhaben', 'qualitaet', 'bestand'])) befunde.push('(a) Zuschnitt code-reviewer weicht vom Plan ab')
  for (const rolle of ['architekt', 'architecture-advisor', 'code-reviewer']) if (ZUSCHNITT.get(rolle).at(-1) !== 'bestand') befunde.push(`(a) ${rolle}: Bestand steht nicht zuletzt`)
  if (befunde.length === vor) console.log('✓ (a) Zuschnitt: architekt 5 Abschnitte, architecture-advisor ohne Fähigkeiten, code-reviewer Vorhaben/Qualität/Bestand; Bestand jeweils zuletzt.')
}

// (b) Hash
{
  const vor = befunde.length
  const a = baueProjektkarte(repoEingaben(), 'architekt')
  const b = baueProjektkarte(repoEingaben(), 'architekt')
  const c = baueProjektkarte(repoEingaben(`${REPO_ARCH}\n- Gate-Änderung am Ende der Datei\n`), 'architekt')
  if (a.hash !== b.hash) befunde.push('(b) Hash bei gleichen Eingaben nicht stabil')
  if (a.hash === c.hash) befunde.push('(b) Hash ändert sich nicht bei geänderter ARCHITECTURE.md (auch hinter einer Kürzung)')
  if (befunde.length === vor) console.log('✓ (b) Hash stabil bei gleichen Eingaben, anders bei geänderter ARCHITECTURE.md (Quellstand im Text).')
}

// (c) [FÜLLUNG]
{
  const vor = befunde.length
  const karte = baueProjektkarte(repoEingaben(SKELETT_ARCH), 'architekt')
  if (!karte.text.includes('Architektur noch nicht beschrieben')) befunde.push('(c) Skelett-ARCHITECTURE.md: „Architektur noch nicht beschrieben“ fehlt')
  if (karte.text.includes('ORM-Konventionen') || karte.text.includes('Gate-Vorlage')) befunde.push('(c) Skelett-ARCHITECTURE.md: Vorlagentext steht in der Karte')
  if (!karte.fehlend.includes('ARCHITECTURE.md: Architektur noch nicht beschrieben')) befunde.push('(c) Lücke fehlt in fehlend')
  if (analysiereArchitektur(REPO_ARCH).nichtBeschrieben || analysiereArchitektur(REPO_ARCH).pflichtFehlt.length > 0) befunde.push('(c) ARCHITECTURE.md dieses Repos gilt fälschlich als nicht beschrieben (Kopfkommentar?)')
  if (befunde.length === vor) console.log('✓ (c) [FÜLLUNG]: Skelett → „Architektur noch nicht beschrieben“ ohne Vorlagentext; dieses Repo beschrieben.')
}

// (d)–(g) Server über den echten HTTP-Pfad
const basis = mkdtempSync(join(tmpdir(), 'b2a1-karte-'))
try {
  /**
   * Legt ein Wegwerf-Git-Repo an.
   * @param name - Ordnername
   * @param mitArchitektur - ARCHITECTURE.md anlegen
   * @returns absoluter Pfad
   */
  function legeRepoAn(name, mitArchitektur) {
    const wurzel = join(basis, name)
    mkdirSync(join(wurzel, 'docs', 'projekt', 'kontext'), { recursive: true })
    mkdirSync(join(wurzel, '.claude', 'agents'), { recursive: true })
    for (const argumente of [['init', '--quiet'], ['config', 'gc.auto', '0'], ['config', 'maintenance.auto', 'false'], ['config', 'maintenance.autoDetach', 'false'], ['config', 'user.email', 'gate@example.invalid'], ['config', 'user.name', 'Gate'], ['config', 'core.autocrlf', 'false'], ['checkout', '--quiet', '-b', 'gate']]) {
      fuehreGitSync(argumente, { cwd: wurzel, encoding: 'utf8' })
    }
    writeFileSync(join(wurzel, 'CLAUDE.md'), REPO_CLAUDE)
    writeFileSync(join(wurzel, 'docs', 'projekt', 'kontext', 'beschreibung.md'), 'Gate-Projekt: ein Haushaltsbuch.\n')
    writeFileSync(join(wurzel, '.claude', 'agents', 'code-reviewer.md'), REPO_CHECKLISTE)
    if (mitArchitektur) writeFileSync(join(wurzel, 'ARCHITECTURE.md'), REPO_ARCH)
    fuehreGitSync(['add', '.'], { cwd: wurzel, encoding: 'utf8' })
    fuehreGitSync(['commit', '--quiet', '-m', 'init'], { cwd: wurzel, encoding: 'utf8' })
    return wurzel
  }

  const basisVerzeichnis = join(basis, 'kontrollzustand')
  const vorlageRoh = ladeStartvorlage('startvorlagen/beispielprojekt.json')
  const codex = { codex: { startziel: [String.raw`C:\b2a1-dummy\codex.exe`], versionDeklariert: 'codex-cli-fixture', sandbox: 'read-only' } }
  const schreibend = { art: 'schreibend', modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read', 'Grep', 'Glob', 'Write', 'Edit', 'Bash(npm install)', 'Bash(npm run check:*)'] }
  const startvorlageMitPruef = join(basis, 'startvorlage-pruef.json')
  writeFileSync(
    startvorlageMitPruef,
    JSON.stringify({ ...vorlageRoh, worker: codex, zeitgrenzeMs: 1800000, bashZeitgrenzeMs: 1200000, pruefbefehl: ['C:\\n\\node.exe', 'C:\\n\\npm-cli.js', 'run', 'check'], werkzeugsaetze: { ...vorlageRoh.werkzeugsaetze, schreibend } })
  )
  // Ohne Prüfbefehl: im Review-Workflow läuft die Ausführung (Attrappe) — der Kern führte sonst den Prüfbefehl real aus.
  const startvorlageOhnePruef = join(basis, 'startvorlage.json')
  writeFileSync(startvorlageOhnePruef, JSON.stringify({ ...vorlageRoh, worker: codex }))
  const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage(startvorlageOhnePruef))

  /**
   * Attrappe für fuehreAufgabeDurch: merkt sich Auftragstext und Eingaben je Rolle, legt eine Laufakte an.
   * @returns { fn, gesehen }
   */
  function baueAttrappe() {
    const gesehen = new Map()
    const fn = async (laufId, _profil, eingaben) => {
      gesehen.set(eingaben.rolle, eingaben)
      const rohstromPfad = join(basis, `rohstrom-${laufId}.json`)
      writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: 'Fertig.' }) }))
      const daten = { worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad, inhalts_hash: 'x' }, ...(eingaben.rolle === 'ausfuehrung' ? { beobachtung: { init_tools: [], init_agents: [], init_skills: [], init_mcp_server: [], skill_aufrufe: [], subagent_aufrufe: [], mcp_aufrufe: [] } } : {}) }
      registriereKernArtefakt(`laufakte-${laufId}`, profilReferenz, { erzeuger: 'kern', schritt: 'gate' }, daten, [], { basisVerzeichnis, schreiber: () => {} })
      return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH', bypass_verdacht_anzahl: 0 }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
    }
    return { fn, gesehen }
  }

  /**
   * Schritt eines Wegwerf-Workflows.
   * @param id - schritt_id
   * @param rolle - Rolle
   * @param werkzeugsatz - Name des Werkzeugsatzes
   * @param worker - 'claude-code' oder 'codex'
   * @param outputSchema - Schemaname oder null
   * @param nachfolger - schritt_id des Nachfolgers oder null
   * @param freigabe - 'ZWINGEND' oder 'AUTOMATISCH'
   * @param freigabeErteilt - bei ZWINGEND: Freigabe schon erteilt (Standard true)
   * @returns Schritt
   */
  const schritt = (id, rolle, werkzeugsatz, worker, outputSchema, nachfolger, freigabe, freigabeErteilt = true) => ({
    schritt_id: id,
    rolle,
    werkzeugsatz,
    worker,
    modell: worker === 'codex' ? 'gpt-6-astra' : 'claude-sonnet-5',
    eingaben: [],
    output_schema: outputSchema,
    freigabe,
    ...(freigabe === 'ZWINGEND' && freigabeErteilt ? { freigabe_erteilt: true } : {}),
    risiko: 'Gate-Fixture.',
    zeitgrenze_ms: 600000,
    nachfolger,
    status: 'OFFEN',
    lauf_id: null,
  })

  /**
   * Startet einen Server gegen repoWurzel, legt Auftrag und Workflow an, startet ihn und wartet, bis der erste Schritt
   * nicht mehr läuft.
   * @param repoWurzel - Wegwerf-Repo
   * @param startvorlagePfad - Startvorlage
   * @param schritte - Workflow-Schritte
   * @param wartenAuf - Rolle, deren Lauf abgewartet wird
   * @returns gesehene Eingaben je Rolle
   */
  async function fuehreDurch(repoWurzel, startvorlagePfad, schritte, wartenAuf) {
    const attrappe = baueAttrappe()
    const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, repoWurzel, installWurzel: process.cwd(), startvorlagePfad, fuehreAufgabeDurchFn: attrappe.fn }))
    await new Promise((r) => server.listen(0, '127.0.0.1', r))
    const basisUrl = `http://127.0.0.1:${server.address().port}`
    try {
      const auftrag = await fetch(`${basisUrl}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: 'B2a-1-Gate', auftragstext: 'Füge einen CSV-Export hinzu.' }) })
      const { auftragId } = await auftrag.json()
      const workflowId = `wf-b2a1-${randomUUID()}`
      registriereWorkflow(
        { workflow_schema: 'v0', workflow_id: workflowId, auftrag_id: auftragId, version: 1, ziel: 'B2a-1-Gate-Ziel.', status: 'OFFEN', aktiver_schritt_id: schritte[0].schritt_id, grenzen: { max_schritte: 6, max_replans: 1 }, schritte },
        profilReferenz,
        { basisVerzeichnis, schreiber: () => {} }
      )
      const start = await fetch(`${basisUrl}/api/workflows/${workflowId}/starten`, { method: 'POST' })
      if (start.status !== 200 && start.status !== 202) throw new Error(`starten: ${start.status} ${await start.text()}`)
      const ende = Date.now() + 15000
      while (Date.now() < ende && !attrappe.gesehen.has(wartenAuf)) await new Promise((r) => setTimeout(r, 50))
      // Nachlauf des Schritts abwarten, damit der nächste Server nicht in einen laufenden Schritt startet.
      while (Date.now() < ende) {
        const daten = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} })?.daten
        if (daten !== undefined && daten.status !== 'LAEUFT') break
        await new Promise((r) => setTimeout(r, 50))
      }
      return attrappe.gesehen
    } finally {
      await new Promise((r) => server.close(r))
    }
  }

  const repoMit = legeRepoAn('projekt-mit', true)
  const repoOhne = legeRepoAn('projekt-ohne', false)
  const ausfuehrungOffen = schritt('schritt-2-ausfuehrung', 'ausfuehrung', 'schreibend', 'claude-code', null, null, 'ZWINGEND', false)

  // (d) Architekt (Codex, Modus feature)
  {
    const vor = befunde.length
    const gesehen = await fuehreDurch(repoMit, startvorlageMitPruef, [schritt('schritt-1-architekt', 'architekt', 'lesend', 'codex', 'ergebnis-architektur', 'schritt-2-ausfuehrung', 'AUTOMATISCH'), ausfuehrungOffen], 'architekt')
    const e = gesehen.get('architekt')
    const t = e?.auftragstext ?? ''
    for (const teil of ['"modus": "feature"', '# Projektkarte', '## Bestand', '### Ordnerstruktur', '## Ausführungsrahmen', 'Kein git', 'Prüfbefehl: npm run check', 'Shell: nur npm install, npm run check', 'Verfügbare Ressourcen (Capability-Auszug):', 'belege jede Aussage über den Bestand im evidenz-Array als [Fakt] mit Dateipfad', 'Gate-Projekt: ein Haushaltsbuch.']) {
      if (!t.includes(teil)) befunde.push(`(d) Architekt-Auftrag (feature) ohne ${JSON.stringify(teil)}`)
    }
    if (e?.projektkarte === undefined || e.projektkarte.abschnitte.length !== 5 || !/^[0-9a-f]{64}$/.test(e.projektkarte.hash)) befunde.push(`(d) eingaben.projektkarte fehlt oder unvollständig: ${JSON.stringify(e?.projektkarte)}`)
    else if (e.projektkarte.fehlend.length > 0) befunde.push(`(d) unerwartete Lücken: ${e.projektkarte.fehlend.join('; ')}`)
    if (befunde.length === vor) console.log('✓ (d) Architekt (Codex, Modus feature): Karte mit Bestand und Ausführungsrahmen, Capability-Auszug, Lese-Anweisung; eingaben.projektkarte mit 5 Abschnitten.')
  }

  // (e) architecture-advisor
  {
    const vor = befunde.length
    const gesehen = await fuehreDurch(repoMit, startvorlageMitPruef, [schritt('schritt-1-advisor', 'architecture-advisor', 'lesend', 'claude-code', null, 'schritt-2-ausfuehrung', 'AUTOMATISCH'), ausfuehrungOffen], 'architecture-advisor')
    const e = gesehen.get('architecture-advisor')
    const t = e?.auftragstext ?? ''
    if (!t.includes('## Ausführungsrahmen') || !t.includes('ist ein Befund') || t.includes(TITEL.faehigkeiten)) befunde.push('(e) Advisor-Karte: Rahmen mit Prüfpflicht erwartet, ohne Fähigkeiten-Abschnitt')
    if (JSON.stringify(e?.projektkarte?.abschnitte) !== JSON.stringify(ZUSCHNITT.get('architecture-advisor'))) befunde.push(`(e) Advisor-Abschnitte: ${JSON.stringify(e?.projektkarte?.abschnitte)}`)
    if (befunde.length === vor) console.log('✓ (e) Advisor-Schritt — Karte mit Vorhaben, Bestand, Ausführungsrahmen (Prüfpflicht), Qualität.')
  }

  // (f) Codex-Review ohne Beobachtungsblock (F-1062), mit Karte
  {
    const vor = befunde.length
    const gesehen = await fuehreDurch(
      repoMit,
      startvorlageOhnePruef,
      [schritt('schritt-1-ausfuehrung', 'ausfuehrung', 'schreibend', 'claude-code', null, 'schritt-2-review', 'ZWINGEND'), schritt('schritt-2-review', 'code-reviewer', 'lesend', 'codex', 'ergebnis-code-reviewer', null, 'AUTOMATISCH')],
      'code-reviewer'
    )
    const t = gesehen.get('code-reviewer')?.auftragstext ?? ''
    if (t === '') befunde.push('(f) Review-Schritt lief nicht')
    if (t.includes('Beobachtung des Ausführungslaufs')) befunde.push('(f) Codex-Review-Auftrag trägt den Beobachtungsblock (F-1062)')
    for (const teil of ['# Projektkarte', 'Prüfmaßstab', 'Checkliste (.claude/agents/code-reviewer.md', 'Urteil je Punkt']) if (!t.includes(teil)) befunde.push(`(f) Review-Karte ohne ${JSON.stringify(teil)}`)
    if (t.includes(TITEL.ausfuehrungsrahmen)) befunde.push('(f) Review-Karte trägt den Ausführungsrahmen (gehört nicht in den Zuschnitt)')
    const ausf = gesehen.get('ausfuehrung')
    if (ausf?.projektkarte !== undefined || (ausf?.auftragstext ?? '').includes('# Projektkarte')) befunde.push('(f) die Ausführung bekommt eine Karte (bewusst nicht, Plan v2 §1)')
    if (befunde.length === vor) console.log('✓ (f) Codex-Review: kein Beobachtungsblock (F-1062), Karte mit Prüfmaßstab, Checkliste und Urteil je Punkt; Ausführung ohne Karte.')
  }

  // (g) ohne ARCHITECTURE.md: fail-open
  {
    const vor = befunde.length
    const gesehen = await fuehreDurch(repoOhne, startvorlageMitPruef, [schritt('schritt-1-architekt', 'architekt', 'lesend', 'codex', 'ergebnis-architektur', 'schritt-2-ausfuehrung', 'AUTOMATISCH'), ausfuehrungOffen], 'architekt')
    const e = gesehen.get('architekt')
    if (e === undefined) befunde.push('(g) ohne ARCHITECTURE.md lief der Architekt-Schritt nicht (fail-open verletzt)')
    else if (!(e.projektkarte?.fehlend ?? []).includes('ARCHITECTURE.md: fehlt')) befunde.push(`(g) fehlend nennt die Lücke nicht: ${JSON.stringify(e.projektkarte?.fehlend)}`)
    if (befunde.length === vor) console.log('✓ (g) Ohne ARCHITECTURE.md läuft der Schritt; fehlend nennt „ARCHITECTURE.md: fehlt“.')
  }
} finally {
  raeumeVerzeichnis(basis)
}

// (h) Argv, Rollen, Quelltext
{
  const vor = befunde.length
  const karte = baueProjektkarte(repoEingaben(), 'architekt').text
  const claudeOhne = baueAufruf({ modell: 'claude-sonnet-5', prompt: 'P', werkzeugsatz: { modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read'] } })
  const claudeMit = baueAufruf({ modell: 'claude-sonnet-5', prompt: `P\n\n${karte}`, werkzeugsatz: { modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read'] } })
  if (JSON.stringify(claudeOhne.slice(0, -1)) !== JSON.stringify(claudeMit.slice(0, -1))) befunde.push('(h) Claude-Argv ändert sich durch die Karte (über den Prompt hinaus)')
  const codexOhne = baueCodexAufruf({ modell: 'm', prompt: 'P', ausgabeSchemaPfad: null })
  const codexMit = baueCodexAufruf({ modell: 'm', prompt: `P\n\n${karte}`, ausgabeSchemaPfad: null })
  if (JSON.stringify(codexOhne.slice(0, -1)) !== JSON.stringify(codexMit.slice(0, -1))) befunde.push('(h) Codex-Argv ändert sich durch die Karte (über den Prompt hinaus)')
  for (const rolle of ['jarvis', 'router', 'ausfuehrung', 'product-coach', 'qa']) if (istKarteRolle(rolle)) befunde.push(`(h) Rolle ${rolle} bekäme eine Karte`)
  const server = readFileSync('scripts/leitstand-server.mjs', 'utf8')
  const anzahl = (muster) => server.split(muster).length - 1
  if (anzahl('baueProjektkarte(') !== 1) befunde.push(`(h) baueProjektkarte( steht ${anzahl('baueProjektkarte(')}-mal im Server statt einmal (nur starteWorkflowSchritt)`)
  if (befunde.length === vor) console.log('✓ (h) Argv beider Worker bitgleich mit und ohne Karte (Prompt per stdin); jarvis/router/ausfuehrung ohne Karte; baueProjektkarte( einmal.')
}

// (i) Allowlist, Laufakte
{
  const vor = befunde.length
  if (pruefeProjektmodusScope(['ARCHITECTURE.md', 'CLAUDE.md', 'docs/x.md']).length !== 0) befunde.push('(i) ARCHITECTURE.md fehlt in der Projektmodus-Allowlist (F-1066)')
  if (pruefeProjektmodusScope(['src/x.ts']).length !== 1) befunde.push('(i) Allowlist zu weit (src/ erlaubt)')
  const laufakte = { laufakte_schema: 'v0', lauf_id: 'l', werkzeug_version_deklariert: 'v', berechtigungskontext: 'b', arbeitsverzeichnis_pfad: '/x', modell_beobachtet: null, beobachtungsbasis_vollstaendig: true, rohstrom_referenz: { pfad: '/r', inhalts_hash: 'a'.repeat(64) }, erstellt_am: 'jetzt' }
  const karte = baueProjektkarte(repoEingaben(), 'code-reviewer')
  const verstoesse = validiereLaufakteDaten({ ...laufakte, projektkarte: { hash: karte.hash, abschnitte: karte.abschnitte, fehlend: karte.fehlend } })
  if (verstoesse.length > 0) befunde.push(`(i) Laufakte mit projektkarte ungültig: ${verstoesse.join('; ')}`)
  if (validiereLaufakteDaten(laufakte).length > 0) befunde.push('(i) Laufakte ohne projektkarte ungültig (append-only verletzt)')
  if (befunde.length === vor) console.log('✓ (i) ARCHITECTURE.md in der Projektmodus-Allowlist; Laufakte mit und ohne projektkarte gültig.')
}

// (j) Rot-Selbsttest
{
  const vor = befunde.length
  const laufakte = { laufakte_schema: 'v0', lauf_id: 'l', werkzeug_version_deklariert: 'v', berechtigungskontext: 'b', arbeitsverzeichnis_pfad: '/x', modell_beobachtet: null, beobachtungsbasis_vollstaendig: true, rohstrom_referenz: { pfad: '/r', inhalts_hash: 'a'.repeat(64) }, erstellt_am: 'jetzt' }
  for (const [name, kaputt] of [
    ['Hash kein sha256', { hash: 'abc', abschnitte: [], fehlend: [] }],
    ['unbekannter Abschnitt', { hash: 'a'.repeat(64), abschnitte: ['roadmap'], fehlend: [] }],
    ['Zusatzfeld', { hash: 'a'.repeat(64), abschnitte: [], fehlend: [], text: 'x' }],
  ]) {
    if (validiereLaufakteDaten({ ...laufakte, projektkarte: kaputt }).length === 0) befunde.push(`(j) Rot-Fall '${name}': kaputtes projektkarte-Feld nicht abgelehnt`)
  }
  const a = baueProjektkarte(repoEingaben(), 'architekt')
  const b = baueProjektkarte({ ...repoEingaben(), dod: ['Typisiert!'] }, 'architekt')
  if (a.hash === b.hash) befunde.push('(j) Rot-Fall: geänderte DoD-Zeile ändert den Hash nicht')
  if (befunde.length === vor) console.log('✓ (j) Rot-Selbsttest: kaputte projektkarte-Felder abgelehnt; eine geänderte Zeile ändert den Hash.')
}

// (k) echte Größe dieses Repos
{
  const vor = befunde.length
  const dateien = fuehreGitSync(['-c', 'core.quotePath=false', 'ls-files', '-z'], { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 50_000_000 }).split('\0').filter((p) => p.length > 0)
  const echt = {
    ...repoEingaben(),
    adrs: leseEntschiedeneAdrs(process.cwd()),
    dateien,
    dod: leseHarnessInventar(process.cwd()).filter((e) => e.art === 'dod').map((e) => e.detail),
    rahmen: { werkzeuge: ladeStartvorlage('startvorlagen/ai-workforce.json').werkzeugsaetze.schreibend.erlaubte_werkzeuge, bashZeitgrenzeMs: 1200000, pruefbefehl: ['node', 'npm-cli.js', 'run', 'check'], arbeitsordner: true },
  }
  if (echt.adrs === '' || echt.dod.length === 0) befunde.push('(k) echte Eingaben unvollständig (ADRs oder DoD leer) — Gate prüft nicht die echte Größe')
  for (const rolle of ['architekt', 'architecture-advisor', 'code-reviewer']) {
    const karte = baueProjektkarte(echt, rolle)
    const qualitaet = karte.text.slice(karte.text.indexOf('## Qualität\n'))
    if (!karte.abschnitte.includes('qualitaet') || !qualitaet.includes('Definition of Done (CLAUDE.md):')) befunde.push(`(k) ${rolle}: Qualität fehlt oder ist gekürzt (${karte.text.length} Zeichen, abschnitte ${karte.abschnitte.join(',')})`)
    if (rolle === 'code-reviewer' && !(qualitaet.includes('Checkliste (') && qualitaet.includes('Urteil je Punkt'))) befunde.push('(k) Rolle Code-Reviewer — Checkliste oder „Urteil je Punkt“ fehlt in der echten Karte')
  }
  if (befunde.length === vor) console.log('✓ (k) Echte Größe dieses Repos: Qualität vollständig in allen drei Karten (Review mit Checkliste und Urteil je Punkt).')
}

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e):`)
  for (const befund of befunde) console.error(`  - ${befund}`)
  process.exit(1)
}
console.log('\n✓ Keine Befunde.')
