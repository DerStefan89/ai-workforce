/**
 * Datei: scripts/check-f42-projekt-harness.mjs
 *
 * Zweck: F42-WS-1-Gate (features/F42/feature.md, Projekt-Harness, E-F41-3 = B).
 * Eigene Datei statt Erweiterung von check-f41-projekt-anlegen.mjs — F41 ist
 * ABGESCHLOSSEN mit stabilem Gate, jedes andere Feature in diesem Repo hat
 * sein eigenes check-fXX-*.mjs (etabliertes Muster).
 *
 * Prüft: (a) Skelett vorhanden — vorlagen/projekt-skelett/CLAUDE.md +
 * HERKUNFT.md existieren real in DIESEM Repo, HERKUNFT.md nennt die SHA
 * '9189959'; Rot-Fall: kopiereSkelett gegen eine installWurzel OHNE
 * vorlagen/projekt-skelett/ wirft. (b) Baseline unverändert — kopiereSkelett
 * überschreibt NIE eine bereits vorhandene Datei (Kollisionsschutz), belegt
 * an einer künstlichen Kollision mit einem Baseline-Pfad. (c) pruefbefehl
 * gesetzt UND real lauffähig — schreibeStartvorlageUndProfil liefert
 * [process.execPath, npm-cli.js, 'run', 'check:template'], fuehrePruefungDurch
 * damit gegen ein Wegwerf-Zielverzeichnis liefert GRUEN; Rot-Fall: derselbe
 * Aufruf mit dem VORHER geplanten, fehlerhaften Befehl ['npm', 'run', …]
 * (Advisor-Finding F1, state/advisor-findings-f42-projekt-harness-ws1.md)
 * liefert real FEHLER, nicht GRUEN — belegt, warum die Korrektur nötig war.
 * (c2) findeNpmCli (F-705, PR-CI-Fund) — Windows-Layout, Linux-Layout,
 * npm_execpath (Vorrang) und der Rot-Fall "kein Treffer" gegen injizierte
 * execPath/npmExecpath/existsSync, kein echtes Dateisystem-Layout nötig.
 * (d) Coach-Text ohne ai-workforce-Prüfungen im Fremdprojekt, MIT ECHTEN argv
 * (F-703, state/advisor-findings-f42-projekt-harness-ws1.md-Nachbarschaft) —
 * baueAuftragAusProjektentwurf mit istAiWorkforce:false nennt weder
 * validiereRoadmapDaten noch check-feature.mjs, zeigt für das echte, von
 * schreibeStartvorlageUndProfil erzeugte argv 'npm run check:template'
 * (nicht die rohen absoluten Pfade), für das echte startvorlagen/ai-
 * workforce.json-argv 'npm run check', und quotet ein Fremd-argv mit
 * Leerzeichen; mit true weiterhin beide ai-workforce-Prüfpfade.
 * (e) Trust-Erkennung — pruefeWorkspaceTrust gegen drei Fixture-Varianten
 * einer ~/.claude.json (true/false/fehlend) statt der echten Datei.
 * (f) F42 WS-2 (löst F-685): istStackOffen — fehlende CLAUDE.md → true,
 * Füllungs-Marker → true, gefüllte Zeile → false, DIESES Repo (ai-workforce,
 * Stack bereits gefüllt) → false, real belegt; validiereErgebnisArchitektur
 * mit stackOffen:true lehnt eine Entscheidungsliste ohne kategorie:'stack'
 * ab (Rot-Fall, F-685-Muster: nur eine fachliche Frage) und nimmt sie mit
 * einem solchen Eintrag an (Grün-Fall); stackOffen:false (Default) bleibt
 * für bestehende Ausgaben ohne 'kategorie' unverändert rückwärtskompatibel;
 * baueArchitektAuftragstext hängt den Zusatz-Hinweis nur bei stackOffen:true an.
 * (g) F42 WS-4 (löst F-712, real beobachtet im F42-WS-3-Reallauf gegen
 * haushaltsbuch2): pruefeProjektmodusScope (reine Funktion) UND der REALE
 * Aufrufpfad (POST /api/auftraege mit herkunft.art 'projekt_interview' →
 * echter Workflow-Schrittstart über POST /api/workflows/<id>/starten, echtes
 * Wegwerf-Git-Repo) — ein Projektmodus-'ausfuehrung'-Lauf, der außerhalb der
 * Allowlist (docs/**, features/**, CLAUDE.md) schreibt, hält auf
 * KLAERUNG_ERFORDERLICH mit dem Dateinamen im Grund; innerhalb der Allowlist
 * läuft er durch; derselbe Verstoß OHNE herkunft.art (Featuremodus) bleibt
 * FOLGENLOS (AK3-Regression).
 * (h) F42 WS-4 (löst F-714, real beobachtet im selben Reallauf): eine bereits
 * erfasste 'kategorie: stack'-Entscheidung hängt baueStackEntscheidungsInstruktion
 * an den Auftragstext des 'ausfuehrung'-Schritts an; bleibt CLAUDE.md danach
 * ungefüllt (istStackOffen weiterhin true), hält der Workflow auf
 * KLAERUNG_ERFORDERLICH ("Stack entschieden, aber CLAUDE.md nicht gefüllt
 * (F-714)"); füllt der Lauf CLAUDE.md real, läuft der Workflow durch.
 * (i) F42 WS-4 (löst F-711, state/findings.md F-711): statisches
 * Quelltext-Gate gegen public/leitstand/views/workflows.js (Muster
 * scripts/check-f15-workflow-oberflaeche.mjs — kein Import/keine
 * Browser-Ausführung, D5) — die Vorauswahl hängt an 'option.titel ===
 * frage.empfehlung', nicht an der Options-Position.
 *
 * Wird aufgerufen von: `npm run check`.
 *
 * Aufruf: node scripts/check-f42-projekt-harness.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join, win32 } from 'node:path'
import { findeNpmCli, kopiereSkelett, pruefeWorkspaceTrust, schreibeStartvorlageUndProfil } from '../src/projekt-anlegen/index.ts'
import { fuehrePruefungDurch } from '../src/pruefschritt/index.ts'
import { baueAuftragAusProjektentwurf } from '../src/product-coach/index.ts'
import { vergebeFeatureIds } from '../src/product-coach/index.ts'
import {
  baueArchitektAuftragstext,
  baueStackEntscheidungsInstruktion,
  baueUmsetzungsInstruktion,
  istStackOffen,
  pruefeProjektmodusScope,
  validiereErgebnisArchitektur,
} from '../src/architekt/index.ts'
import { ladeArtefaktVersion, registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { registriereWorkflowEntscheidung } from './leitstand/routen-f39.mjs'
import { erzeugeRequestHandler } from './leitstand-server.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
console.log('\n=== F42-Projekt-Harness-Check (WS-1) ===\n')

const TEST_WURZEL = join(tmpdir(), `check-f42-${randomUUID()}`)
mkdirSync(TEST_WURZEL, { recursive: true })

const ECHTE_INSTALL_WURZEL = process.cwd()

try {
  // ─── (a) Skelett vorhanden (dieses Repo) + Rot-Fall (fehlende installWurzel) ────────────
  {
    const vor = befunde.length
    const claudeMdPfad = join(ECHTE_INSTALL_WURZEL, 'vorlagen', 'projekt-skelett', 'CLAUDE.md')
    const herkunftPfad = join(ECHTE_INSTALL_WURZEL, 'vorlagen', 'projekt-skelett', 'HERKUNFT.md')
    if (!existsSync(claudeMdPfad)) befunde.push(`(a) 'vorlagen/projekt-skelett/CLAUDE.md' fehlt in diesem Repo (${claudeMdPfad})`)
    if (!existsSync(herkunftPfad)) {
      befunde.push(`(a) 'vorlagen/projekt-skelett/HERKUNFT.md' fehlt in diesem Repo (${herkunftPfad})`)
    } else if (!readFileSync(herkunftPfad, 'utf8').includes('9189959')) {
      befunde.push("(a) HERKUNFT.md nennt nicht die erwartete Quell-SHA '9189959'")
    }

    const installWurzelOhneSkelett = join(TEST_WURZEL, `install-ohne-skelett-${randomUUID()}`)
    mkdirSync(installWurzelOhneSkelett, { recursive: true })
    const zielRot = join(TEST_WURZEL, `ziel-a-rot-${randomUUID()}`)
    mkdirSync(zielRot, { recursive: true })
    let hatGeworfen = false
    try {
      kopiereSkelett(installWurzelOhneSkelett, zielRot)
    } catch {
      hatGeworfen = true
    }
    if (!hatGeworfen) befunde.push('(a) Rot-Fall: kopiereSkelett gegen eine installWurzel OHNE vorlagen/projekt-skelett/ hätte werfen müssen, hat es nicht')

    if (befunde.length === vor) console.log("✓ (a) Skelett vorhanden in diesem Repo (CLAUDE.md + HERKUNFT.md mit SHA 9189959), Rot-Fall (fehlende installWurzel) wirft real.")
  }

  // ─── (b) Baseline unverändert — kopiereSkelett überschreibt nie eine vorhandene Datei ────
  {
    const vor = befunde.length
    const installWurzel = join(TEST_WURZEL, `install-b-${randomUUID()}`)
    mkdirSync(join(installWurzel, 'vorlagen', 'projekt-skelett', '.claude'), { recursive: true })
    // Künstliche Kollision: das Fixture-Skelett trägt (nur für DIESEN Test) eine Datei unter
    // .claude/settings.json — genau dem Pfad, den kopiereBaseline in der Produktion schreibt.
    writeFileSync(join(installWurzel, 'vorlagen', 'projekt-skelett', '.claude', 'settings.json'), '{"skelett":true}')
    writeFileSync(join(installWurzel, 'vorlagen', 'projekt-skelett', 'CLAUDE.md'), '# Skelett\n')

    const ziel = join(TEST_WURZEL, `ziel-b-${randomUUID()}`)
    mkdirSync(join(ziel, '.claude'), { recursive: true })
    // Simuliert eine bereits von kopiereBaseline geschriebene settings.json (Schicht 1).
    writeFileSync(join(ziel, '.claude', 'settings.json'), '{"baseline":true}')

    const kopiert = kopiereSkelett(installWurzel, ziel)
    const zielInhalt = JSON.parse(readFileSync(join(ziel, '.claude', 'settings.json'), 'utf8'))
    if (zielInhalt.baseline !== true) befunde.push('(b) kopiereSkelett hat eine bereits vorhandene Baseline-Datei ÜBERSCHRIEBEN — Baseline gewinnt nicht mehr')
    if (kopiert.includes(join('.claude', 'settings.json'))) befunde.push('(b) kopiereSkelett meldet eine übersprungene Datei fälschlich als kopiert')
    if (!existsSync(join(ziel, 'CLAUDE.md'))) befunde.push('(b) kopiereSkelett hat eine NICHT kollidierende Datei fälschlich nicht kopiert')

    if (befunde.length === vor) console.log('✓ (b) Baseline unverändert: kopiereSkelett überschreibt keine bereits vorhandene Datei, kopiert nicht-kollidierende Dateien real.')
  }

  // ─── (c) pruefbefehl gesetzt UND real lauffähig (+ Rot-Fall: die vorher geplante, fehlerhafte Form) ──
  {
    const vor = befunde.length
    const quelle = join(TEST_WURZEL, `quelle-c-${randomUUID()}`)
    mkdirSync(join(quelle, 'startvorlagen'), { recursive: true })
    mkdirSync(join(quelle, 'profiles'), { recursive: true })
    writeFileSync(
      join(quelle, 'startvorlagen', 'ai-workforce.json'),
      JSON.stringify({ startvorlage_schema: 'v0', profilPfad: 'profiles/ai-workforce.json', werkzeugStartziel: ['irrelevant'], werkzeugVersionDeklariert: '0.0.0', berechtigungskontext: 'profil-standard', modell: 'test', standardBudget: {}, werkzeugsaetze: {} })
    )
    writeFileSync(join(quelle, 'profiles', 'ai-workforce.json'), JSON.stringify({ projekt: 'ai-workforce', version: 1, gates: [], dod: [], werkzeuge: {}, reviewRegeln: [] }))

    const ziel = join(TEST_WURZEL, `ziel-c-${randomUUID()}`)
    mkdirSync(ziel, { recursive: true })
    const eckdaten = schreibeStartvorlageUndProfil('probe-projekt', quelle, ziel)
    const geschrieben = JSON.parse(readFileSync(join(ziel, 'startvorlagen', 'probe-projekt.json'), 'utf8'))

    if (!Array.isArray(geschrieben.pruefbefehl) || geschrieben.pruefbefehl.length !== 4 || geschrieben.pruefbefehl[2] !== 'run' || geschrieben.pruefbefehl[3] !== 'check:template') {
      befunde.push(`(c) pruefbefehl hat nicht die erwartete Form: ${JSON.stringify(geschrieben.pruefbefehl)}`)
    }
    if (geschrieben.pruefZeitgrenzeMs !== 120000) befunde.push(`(c) pruefZeitgrenzeMs ist nicht 120000: ${geschrieben.pruefZeitgrenzeMs}`)

    // Zielverzeichnis für den echten Prüflauf: ein minimales package.json mit einem
    // 'check:template'-Script, das sofort exit 0 liefert (kein echter Docs-/Regel-/Vertrags-Scan
    // nötig, hier wird NUR geprüft, ob pruefbefehl über execFile ohne Shell überhaupt startet).
    const pruefZiel = join(TEST_WURZEL, `pruefziel-c-${randomUUID()}`)
    mkdirSync(pruefZiel, { recursive: true })
    writeFileSync(join(pruefZiel, 'package.json'), JSON.stringify({ name: 'probe', version: '0.0.0', scripts: { 'check:template': 'node -e "process.exit(0)"' } }))

    const gruenesErgebnis = await fuehrePruefungDurch(`check-f42-c-gruen-${randomUUID()}`, geschrieben.pruefbefehl, pruefZiel, 30000)
    if (gruenesErgebnis.ergebnis !== 'GRUEN') {
      befunde.push(`(c) Der real geschriebene pruefbefehl lief NICHT grün gegen ein triviales check:template-Script: ${JSON.stringify(gruenesErgebnis)}`)
    }

    // Rot-Fall (Advisor-Finding F1, state/advisor-findings-f42-projekt-harness-ws1.md): die vorher
    // GEPLANTE, fehlerhafte Form ['npm', 'run', 'check:template'] (bloßer Kommandoname statt
    // absolutem Pfad) darf NICHT grün laufen — execFile ohne Shell löst 'npm' unter Windows nur auf
    // npm.cmd auf.
    const rotesErgebnis = await fuehrePruefungDurch(`check-f42-c-rot-${randomUUID()}`, ['npm', 'run', 'check:template'], pruefZiel, 10000)
    if (rotesErgebnis.ergebnis === 'GRUEN') {
      console.log("ⓘ (c) Rot-Fall-Hinweis: ['npm', …] lief auf dieser Umgebung unerwartet GRUEN (evtl. PATH-Shell-Resolution dieser Maschine) — kein Befund, aber die Advisor-Begründung für den absoluten Pfad bleibt gültig (execFile ohne Shell ist plattformabhängig).")
    } else {
      console.log(`✓ (c) Rot-Fall bestätigt: der vorher geplante bloße Kommandoname liefert real '${rotesErgebnis.ergebnis}', nicht GRUEN — belegt die Notwendigkeit des absoluten Pfads.`)
    }

    void eckdaten
    if (befunde.length === vor) console.log('✓ (c) pruefbefehl gesetzt (absoluter Pfad, run check:template) und real lauffähig (GRUEN gegen ein triviales Zielverzeichnis).')
  }

  // ─── (c2) findeNpmCli: Windows-/Linux-Layout, npm_execpath, kein Treffer → Wurf (F-705) ────
  //
  // F-705 (BUG P1, real in der PR-CI gefunden): schreibeStartvorlageUndProfil leitete npm-cli.js
  // bisher NUR über das Windows-Layout ab — auf dem Linux-CI-Runner liegt npm unter
  // <prefix>/lib/node_modules/npm/bin/npm-cli.js, nicht <node-dir>/node_modules/npm/bin/npm-cli.js.
  // Injizierte execPath/npmExecpath/existsSync — kein echtes Dateisystem-Layout nötig.
  {
    const vor = befunde.length
    // npmExecpath: '' statt undefined — ?? fällt bei explizitem undefined auf process.env.
    // npm_execpath zurück (echte GitHub-Actions-Runner setzen diese Variable selbst, wenn der
    // Job über 'npm run check' gestartet wird) — ein LEERER String ist nicht nullish, deaktiviert
    // den Kandidaten also wirklich deterministisch, unabhängig von der echten CI-Umgebung.
    const windowsExecPath = 'C:\\Program Files\\nodejs\\node.exe'
    // win32 EXPLIZIT statt des Default-dirname/join (F-705, zweiter Fund): unter POSIX (Linux-CI)
    // zerlegt das plattformabhängige dirname/join einen mit Backslash geschriebenen Pfad nicht
    // korrekt — derselbe Grund, aus dem findeNpmCli selbst jetzt win32 für diesen Kandidaten nutzt.
    const windowsKandidat = win32.join(win32.dirname(windowsExecPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')
    const gefundenWindows = findeNpmCli({ execPath: windowsExecPath, npmExecpath: '', existsSync: (pfad) => pfad === windowsKandidat })
    if (gefundenWindows !== windowsKandidat) befunde.push(`(c2) Windows-Layout: erwartet '${windowsKandidat}', erhalten '${gefundenWindows}'`)

    const linuxExecPath = '/opt/hostedtoolcache/node/24.21.0/x64/bin/node'
    const linuxKandidat = join(dirname(linuxExecPath), '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js')
    const gefundenLinux = findeNpmCli({ execPath: linuxExecPath, npmExecpath: '', existsSync: (pfad) => pfad === linuxKandidat })
    if (gefundenLinux !== linuxKandidat) befunde.push(`(c2) Linux-Layout: erwartet '${linuxKandidat}', erhalten '${gefundenLinux}'`)

    // npm_execpath hat Vorrang vor beiden Layout-Kandidaten, wenn er existiert.
    const npmExecpathKandidat = '/custom/pfad/npm-cli.js'
    const gefundenExecpath = findeNpmCli({ execPath: linuxExecPath, npmExecpath: npmExecpathKandidat, existsSync: (pfad) => pfad === npmExecpathKandidat })
    if (gefundenExecpath !== npmExecpathKandidat) befunde.push(`(c2) npm_execpath: erwartet '${npmExecpathKandidat}', erhalten '${gefundenExecpath}'`)

    // Rot-Fall: kein Kandidat existiert → Wurf, Meldung nennt alle geprüften Pfade.
    let hatGeworfenOhneTreffer = false
    try {
      findeNpmCli({ execPath: linuxExecPath, npmExecpath: '', existsSync: () => false })
    } catch (fehler) {
      hatGeworfenOhneTreffer = true
      if (!fehler.message.includes(linuxKandidat)) befunde.push(`(c2) Rot-Fall-Meldung nennt nicht den geprüften Linux-Pfad: ${fehler.message}`)
    }
    if (!hatGeworfenOhneTreffer) befunde.push('(c2) findeNpmCli ohne jeden existierenden Kandidaten hätte werfen müssen, hat es nicht')

    if (befunde.length === vor) console.log('✓ (c2) findeNpmCli: Windows-Layout, Linux-Layout, npm_execpath (Vorrang) korrekt gefunden, Rot-Fall (kein Treffer) wirft real mit vollständiger Pfadliste.')
  }

  // ─── (d) Coach-Text ohne ai-workforce-Prüfungen im Fremdprojekt, MIT echten argv (F-703) ────
  //
  // F-703 (BUG P1): die ursprüngliche Fassung dieser Prüfung nutzte künstliches argv
  // (['node','npm-cli.js','run','check:template']), das bereits wie die gewünschte Anzeigeform
  // aussah — ein rohes .join(' ') des tatsächlichen, ABSOLUTEN Programmpfads
  // (schreibeStartvorlageUndProfil) wäre damit unentdeckt geblieben. Diese Fassung nutzt echte argv.
  {
    const vor = befunde.length
    const projektRoh = {
      vision: 'Testvision',
      zielgruppe: 'Test',
      ziele: [],
      scope_in: [],
      scope_out: [],
      capabilities_bedarf: [],
      architektur_hinweise: [],
      offene_fragen: [],
      meilensteine: [],
    }
    const zugewiesen = vergebeFeatureIds(projektRoh, { features: [], meilensteine: [] })
    const projekt = { ...projektRoh, meilensteine: zugewiesen.meilensteine, offene_fragen: zugewiesen.offene_fragen }

    const echtesAiWorkforceArgv = JSON.parse(readFileSync(join('startvorlagen', 'ai-workforce.json'), 'utf8')).pruefbefehl

    const quelleD = join(TEST_WURZEL, `quelle-d-${randomUUID()}`)
    mkdirSync(join(quelleD, 'startvorlagen'), { recursive: true })
    mkdirSync(join(quelleD, 'profiles'), { recursive: true })
    writeFileSync(
      join(quelleD, 'startvorlagen', 'ai-workforce.json'),
      JSON.stringify({ startvorlage_schema: 'v0', profilPfad: 'profiles/ai-workforce.json', werkzeugStartziel: ['irrelevant'], werkzeugVersionDeklariert: '0.0.0', berechtigungskontext: 'profil-standard', modell: 'test', standardBudget: {}, werkzeugsaetze: {} })
    )
    writeFileSync(join(quelleD, 'profiles', 'ai-workforce.json'), JSON.stringify({ projekt: 'ai-workforce', version: 1, gates: [], dod: [], werkzeuge: {}, reviewRegeln: [] }))
    const zielD = join(TEST_WURZEL, `ziel-d-${randomUUID()}`)
    mkdirSync(zielD, { recursive: true })
    schreibeStartvorlageUndProfil('d-probe', quelleD, zielD)
    const echtesNeuesProjektArgv = JSON.parse(readFileSync(join(zielD, 'startvorlagen', 'd-probe.json'), 'utf8')).pruefbefehl

    const fremd = baueAuftragAusProjektentwurf(projekt, 'neu', { istAiWorkforce: false, pruefbefehl: echtesNeuesProjektArgv })
    if (fremd.auftragstext.includes('validiereRoadmapDaten')) befunde.push('(d) Fremdprojekt-Auftragstext nennt validiereRoadmapDaten (ai-workforce-eigen)')
    if (fremd.auftragstext.includes('check-feature.mjs')) befunde.push('(d) Fremdprojekt-Auftragstext nennt check-feature.mjs (ai-workforce-eigen)')
    if (!fremd.auftragstext.includes('npm run check:template muss danach grün sein.')) {
      befunde.push(`(d/F-703) Fremdprojekt mit dem echten schreibeStartvorlageUndProfil-argv sollte 'npm run check:template' zeigen, nicht das rohe argv (${JSON.stringify(echtesNeuesProjektArgv)}): ${fremd.auftragstext}`)
    } else if (fremd.auftragstext.includes(echtesNeuesProjektArgv[0])) {
      befunde.push(`(d/F-703)-Rot-Fall-Beleg: der Auftragstext enthält noch den rohen absoluten Programmpfad '${echtesNeuesProjektArgv[0]}'`)
    }

    const fremdMitLeerzeichen = baueAuftragAusProjektentwurf(projekt, 'neu', { istAiWorkforce: false, pruefbefehl: ['C:\\Program Files\\Fremdtool\\tool.exe', '--run'] })
    if (!fremdMitLeerzeichen.auftragstext.includes('"C:\\Program Files\\Fremdtool\\tool.exe" --run muss danach grün sein.')) {
      befunde.push(`(d/F-703) Fremd-argv mit Leerzeichen im Pfad sollte gequotet erscheinen: ${fremdMitLeerzeichen.auftragstext}`)
    }

    const ohneKontext = baueAuftragAusProjektentwurf(projekt, 'neu')
    if (!ohneKontext.auftragstext.includes('Kein Prüfbefehl konfiguriert')) befunde.push("(d) Ohne kontext sollte 'Kein Prüfbefehl konfiguriert' erscheinen, nichts erfunden werden")

    const eigen = baueAuftragAusProjektentwurf(projekt, 'neu', { istAiWorkforce: true, pruefbefehl: echtesAiWorkforceArgv })
    if (!eigen.auftragstext.includes('validiereRoadmapDaten') || !eigen.auftragstext.includes('check-feature.mjs')) {
      befunde.push('(d) istAiWorkforce:true sollte weiterhin validiereRoadmapDaten/check-feature.mjs nennen')
    } else if (!eigen.auftragstext.includes('npm run check muss danach grün sein.')) {
      befunde.push(`(d/F-703) ai-workforce-Auftragstext sollte 'npm run check' zeigen (echtes argv ${JSON.stringify(echtesAiWorkforceArgv)}), erhalten: ${eigen.auftragstext}`)
    }

    if (befunde.length === vor) console.log('✓ (d) Coach-Text: Fremdprojekt ohne ai-workforce-eigene Prüfpfade, mit gegebenem pruefbefehl; ai-workforce selbst unverändert; ohne kontext nichts erfunden.')
  }

  // ─── (e) Trust-Erkennung: true/false/fehlend, gegen Fixtures statt echter ~/.claude.json ────
  {
    const vor = befunde.length
    const cwdPfad = join(TEST_WURZEL, 'ein-projekt')
    const normalisierterSchluessel = cwdPfad.split('\\').join('/')

    const fixtureTrue = join(TEST_WURZEL, `claude-json-true-${randomUUID()}.json`)
    writeFileSync(fixtureTrue, JSON.stringify({ projects: { [normalisierterSchluessel]: { hasTrustDialogAccepted: true } } }))
    const ergebnisTrue = pruefeWorkspaceTrust(cwdPfad, { claudeJsonPfad: fixtureTrue })
    if (ergebnisTrue.status !== 'true') befunde.push(`(e) Fixture 'true': erwartet status 'true', erhalten '${ergebnisTrue.status}'`)

    const fixtureFalse = join(TEST_WURZEL, `claude-json-false-${randomUUID()}.json`)
    writeFileSync(fixtureFalse, JSON.stringify({ projects: { [normalisierterSchluessel]: { hasTrustDialogAccepted: false } } }))
    const ergebnisFalse = pruefeWorkspaceTrust(cwdPfad, { claudeJsonPfad: fixtureFalse })
    if (ergebnisFalse.status !== 'false') befunde.push(`(e) Fixture 'false': erwartet status 'false', erhalten '${ergebnisFalse.status}'`)

    const fixtureFehlenderSchluessel = join(TEST_WURZEL, `claude-json-fehlend-${randomUUID()}.json`)
    writeFileSync(fixtureFehlenderSchluessel, JSON.stringify({ projects: { 'C:/ein/anderes/projekt': { hasTrustDialogAccepted: true } } }))
    const ergebnisFehlenderSchluessel = pruefeWorkspaceTrust(cwdPfad, { claudeJsonPfad: fixtureFehlenderSchluessel })
    if (ergebnisFehlenderSchluessel.status !== 'fehlend') befunde.push(`(e) Fixture 'fehlender Schlüssel': erwartet status 'fehlend', erhalten '${ergebnisFehlenderSchluessel.status}'`)

    const ergebnisFehlendeDatei = pruefeWorkspaceTrust(cwdPfad, { claudeJsonPfad: join(TEST_WURZEL, 'existiert-nicht.json') })
    if (ergebnisFehlendeDatei.status !== 'fehlend') befunde.push(`(e) Fehlende Datei: erwartet status 'fehlend', erhalten '${ergebnisFehlendeDatei.status}'`)

    // Rot-Fall Groß-/Kleinschreibung (F-702, bewusste Grenze, siehe pruefeWorkspaceTrust-Kopfkommentar):
    // ein Schlüssel mit abweichender Schreibweise wird NICHT als 'true' erkannt (exakter
    // String-Vergleich, kein Case-Folding). F-705-Nachbarfund (PR-CI, dritte Runde): eine feste
    // Windows-Laufwerksbuchstabe-Regel (/^[A-Z]:/) traf auf dem Linux-CI-Runner nie zu (TEST_WURZEL
    // liegt dort unter /tmp/…, kein Laufwerksbuchstabe) — die Fixture war dadurch identisch zum
    // echten Schlüssel, kein echter Rot-Fall. Jetzt plattformunabhängig: irgendein Buchstabe im
    // Schlüssel wird invertiert (Groß↔Klein) — funktioniert für jeden Pfad mit mindestens einem
    // kasussensitiven Zeichen (Windows-Laufwerksbuchstabe, UUID-Hexziffern, 'ein-projekt').
    const schluesselAndereSchreibweise = normalisierterSchluessel === normalisierterSchluessel.toUpperCase() ? normalisierterSchluessel.toLowerCase() : normalisierterSchluessel.toUpperCase()
    if (schluesselAndereSchreibweise === normalisierterSchluessel) {
      befunde.push('(e) Testfixture: normalisierterSchluessel enthält kein kasussensitives Zeichen — die Groß-/Kleinschreibungs-Grenze kann mit diesem cwdPfad nicht real geprüft werden')
    } else {
      const fixtureAndereSchreibweise = join(TEST_WURZEL, `claude-json-andere-schreibweise-${randomUUID()}.json`)
      writeFileSync(fixtureAndereSchreibweise, JSON.stringify({ projects: { [schluesselAndereSchreibweise]: { hasTrustDialogAccepted: true } } }))
      const ergebnisAndereSchreibweise = pruefeWorkspaceTrust(cwdPfad, { claudeJsonPfad: fixtureAndereSchreibweise })
      if (ergebnisAndereSchreibweise.status !== 'fehlend') befunde.push(`(e) bewusste Grenze verletzt: eine andere Schreibweise ('${schluesselAndereSchreibweise}' statt '${normalisierterSchluessel}') wurde fälschlich als '${ergebnisAndereSchreibweise.status}' statt 'fehlend' erkannt`)
    }

    if (befunde.length === vor) console.log("✓ (e) Trust-Erkennung: true/false/fehlender Schlüssel/fehlende Datei korrekt, read-only (keine Schreibfunktion importiert), bewusste Groß-/Kleinschreibungs-Grenze (F-702) bestätigt.")
  }

  // ─── (f) F42 WS-2 (löst F-685): istStackOffen + stackOffen-Kopplung in validiereErgebnisArchitektur ──
  {
    const vor = befunde.length

    // (f1) istStackOffen: fehlende CLAUDE.md → true.
    const projektOhneClaudeMd = join(TEST_WURZEL, `f-ohne-claude-md-${randomUUID()}`)
    mkdirSync(projektOhneClaudeMd, { recursive: true })
    if (istStackOffen(projektOhneClaudeMd) !== true) befunde.push('(f1) istStackOffen: fehlende CLAUDE.md sollte true liefern')

    // (f1) istStackOffen: Füllungs-Marker (Muster vorlagen/projekt-skelett/CLAUDE.md) → true.
    const projektMitMarker = join(TEST_WURZEL, `f-mit-marker-${randomUUID()}`)
    mkdirSync(projektMitMarker, { recursive: true })
    writeFileSync(join(projektMitMarker, 'CLAUDE.md'), '# Projekt\n\n## 🏗️ Technischer Stack [FÜLLUNG]\n\nNoch nicht entschieden.\n')
    if (istStackOffen(projektMitMarker) !== true) befunde.push('(f1) istStackOffen: CLAUDE.md mit Füllungs-Marker sollte true liefern')

    // (f1) istStackOffen: gefüllte Zeile (kein Marker) → false.
    const projektGefuellt = join(TEST_WURZEL, `f-gefuellt-${randomUUID()}`)
    mkdirSync(projektGefuellt, { recursive: true })
    writeFileSync(join(projektGefuellt, 'CLAUDE.md'), '# Projekt\n\n## 🏗️ Technischer Stack\n\nTypeScript auf Node.\n')
    if (istStackOffen(projektGefuellt) !== false) befunde.push('(f1) istStackOffen: CLAUDE.md mit gefüllter Stack-Zeile sollte false liefern')

    // (f1) Real gegen DIESES Repo (ai-workforce, Stack bereits gefüllt) — F-685-Beleg aus dem
    // Auftrag: "für ai-workforce muss sie false liefern".
    if (istStackOffen(ECHTE_INSTALL_WURZEL) !== false) befunde.push('(f1) istStackOffen: dieses Repo (ai-workforce, Stack bereits gefüllt) sollte false liefern')

    if (befunde.length === vor) console.log('✓ (f1) istStackOffen: fehlende CLAUDE.md und Füllungs-Marker liefern true, eine gefüllte Zeile liefert false — real gegen dieses Repo belegt (false).')
  }

  {
    const vor = befunde.length

    const NUR_FACHLICH = [{ frage: 'f', optionen: [{ titel: 'A', vorteile: [], nachteile: [] }], auswirkung_bestand: 'keine', empfehlung: 'A', begruendung: 'x', kategorie: 'fachlich' }]
    const MIT_STACK = [
      ...NUR_FACHLICH,
      {
        frage: 'Welcher Stack?',
        optionen: [
          { titel: 'Option A', vorteile: ['x'], nachteile: [] },
          { titel: 'Option B', vorteile: [], nachteile: ['x'] },
        ],
        auswirkung_bestand: 'keine',
        empfehlung: 'Option A',
        begruendung: 'x',
        kategorie: 'stack',
      },
    ]
    const basis = (entscheidungenMensch) => ({
      modus: 'projekt',
      zusammenfassung: 'x',
      module: [],
      adr_entwuerfe: [],
      schema_entwuerfe: [],
      entscheidungen_mensch: entscheidungenMensch,
      capabilities_bedarf: [],
      evidenz: [{ marker: '[Fakt]', aussage: 'x' }],
    })

    // (f2) Rot-Fall (F-685-Muster): Stack offen, nur eine fachliche Entscheidung vorgelegt.
    const rot = validiereErgebnisArchitektur(basis(NUR_FACHLICH), undefined, true)
    if (!rot.some((v) => v.includes('Stack offen, aber keine Entscheidung mit kategorie stack vorgelegt (F-685)'))) {
      befunde.push(`(f2) Rot-Fall: stackOffen:true ohne kategorie:'stack' sollte den F-685-Verstoß liefern, erhalten ${JSON.stringify(rot)}`)
    }

    // (f2) Grün-Fall: Stack offen, eine Entscheidung mit kategorie 'stack' vorgelegt.
    const gruen = validiereErgebnisArchitektur(basis(MIT_STACK), undefined, true)
    if (gruen.length > 0) befunde.push(`(f2) Grün-Fall: stackOffen:true MIT kategorie:'stack' sollte [] liefern, erhalten ${JSON.stringify(gruen)}`)

    // (f2) Rückwärtskompatibel: stackOffen Default (false) — dieselbe nur-fachliche Liste bleibt
    // gültig, UND eine bestehende Ausgabe ganz OHNE 'kategorie'-Feld bleibt ebenfalls gültig.
    const ohneStackOffen = validiereErgebnisArchitektur(basis(NUR_FACHLICH))
    if (ohneStackOffen.length > 0) befunde.push(`(f2) Rückwärtskompatibel (stackOffen Default false): erwartet [], erhalten ${JSON.stringify(ohneStackOffen)}`)
    const OHNE_KATEGORIE_FELD = [{ frage: 'f', optionen: [{ titel: 'A', vorteile: [], nachteile: [] }], auswirkung_bestand: 'keine', empfehlung: 'A', begruendung: 'x' }]
    const bestehendeAusgabe = validiereErgebnisArchitektur(basis(OHNE_KATEGORIE_FELD))
    if (bestehendeAusgabe.length > 0) befunde.push(`(f2) Rückwärtskompatibel: eine Entscheidung ganz ohne 'kategorie'-Feld sollte weiterhin gültig sein, erhalten ${JSON.stringify(bestehendeAusgabe)}`)

    if (befunde.length === vor) {
      console.log("✓ (f2) validiereErgebnisArchitektur: stackOffen:true lehnt eine rein fachliche Entscheidungsliste ab (F-685) und nimmt eine mit kategorie:'stack' an; stackOffen:false (Default) bleibt für bestehende Ausgaben — mit und ohne 'kategorie'-Feld — unverändert gültig.")
    }
  }

  {
    const vor = befunde.length
    const HINWEIS_MARKER = 'NICHT selbst fest'

    const mitStackOffen = baueArchitektAuftragstext('Architektur-Grundlage für ein neues Projekt.', 'projekt', null, true)
    if (!mitStackOffen.includes(HINWEIS_MARKER)) befunde.push(`(f3) baueArchitektAuftragstext mit stackOffen:true sollte den Zusatz-Hinweis enthalten, erhalten: ${mitStackOffen.slice(0, 200)}…`)

    const ohneStackOffenText = baueArchitektAuftragstext('Architektur-Grundlage für ein neues Projekt.', 'projekt', null, false)
    if (ohneStackOffenText.includes(HINWEIS_MARKER)) befunde.push('(f3) baueArchitektAuftragstext mit stackOffen:false sollte den Zusatz-Hinweis NICHT enthalten')

    const defaultText = baueArchitektAuftragstext('x')
    if (defaultText.includes(HINWEIS_MARKER)) befunde.push('(f3) baueArchitektAuftragstext ohne stackOffen-Argument (Default) sollte den Zusatz-Hinweis NICHT enthalten')

    if (befunde.length === vor) console.log('✓ (f3) baueArchitektAuftragstext hängt den Stack-Hinweis nur bei stackOffen:true an, Default (weggelassen) bleibt unverändert ohne Hinweis.')
  }

  // ─── (g) F42 WS-4 (löst F-712) ────────────────────────────────────────────────────────────
  {
    const vor = befunde.length

    // (g1) Reine Funktion: pruefeProjektmodusScope.
    const erlaubtePfade = ['docs/x.md', 'features/F1/feature.md', 'CLAUDE.md']
    const gruenErgebnis = pruefeProjektmodusScope(erlaubtePfade)
    if (gruenErgebnis.length > 0) befunde.push(`(g1) pruefeProjektmodusScope: erlaubte Pfade sollten [] liefern, erhalten ${JSON.stringify(gruenErgebnis)}`)

    const verbotenePfade = ['schemas/x.schema.json', 'scripts/check-x.mjs', 'package.json', 'src/foo.ts']
    const rotErgebnis = pruefeProjektmodusScope(verbotenePfade)
    if (rotErgebnis.length !== verbotenePfade.length) befunde.push(`(g1) pruefeProjektmodusScope: alle vier Pfade außerhalb der Allowlist sollten gemeldet werden, erhalten ${JSON.stringify(rotErgebnis)}`)

    if (befunde.length === vor) {
      console.log("✓ (g1) pruefeProjektmodusScope: docs/**, features/**, CLAUDE.md erlaubt; schemas/, scripts/, package.json, src/ sind ein Verstoß.")
    }
  }

  {
    const vor = befunde.length

    // (g2)-(g4) realer Aufrufpfad: POST /api/auftraege (optional herkunft.art
    // 'projekt_interview') → Fixture-'architekt'-Schritt (bereits ERFOLGREICH) → echter Start von
    // 'schritt-2-ausfuehrung' über POST /api/workflows/<id>/starten gegen ein echtes,
    // wegwerfbares Git-Repo. Der Stub schreibt real eine Datei in dieses Repo, BEVOR er ok:true
    // liefert — dieselbe git-basierte Änderungsübersicht-Ermittlung wie im echten Betrieb.
    const basisVerzeichnis = `kontrollzustand-test-f42-g-${randomUUID()}`
    raeumeVerzeichnis(basisVerzeichnis)
    const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }
    const vorlage = ladeStartvorlage('startvorlagen/beispielprojekt.json')
    const profilReferenz = leiteProfilReferenzAb(vorlage)

    const repoWurzelWegwerf = mkdtempSync(join(tmpdir(), 'f42-g-repo-'))
    execFileSync('git', ['init', '--quiet', '-b', 'wegwerf-branch'], { cwd: repoWurzelWegwerf })
    execFileSync('git', ['config', 'user.email', 'gate@example.com'], { cwd: repoWurzelWegwerf })
    execFileSync('git', ['config', 'user.name', 'Gate'], { cwd: repoWurzelWegwerf })
    writeFileSync(join(repoWurzelWegwerf, 'README.md'), '# Wegwerf-Projekt\n')
    execFileSync('git', ['add', '-A'], { cwd: repoWurzelWegwerf })
    execFileSync('git', ['commit', '--quiet', '-m', 'init'], { cwd: repoWurzelWegwerf })

    let zuSchreibenderPfad = null
    const fuehreAufgabeDurchFn = async (_laufId, _profilReferenz, _eingaben) => {
      if (zuSchreibenderPfad !== null) {
        const zielPfad = join(repoWurzelWegwerf, zuSchreibenderPfad)
        mkdirSync(dirname(zielPfad), { recursive: true })
        writeFileSync(zielPfad, '{}')
      }
      return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
    }

    const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, fuehreAufgabeDurchFn, repoWurzel: repoWurzelWegwerf }))
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    const { port } = server.address()
    const basisUrl = `http://127.0.0.1:${port}`

    /**
     * Baut real einen Auftrag, einen bereits ERFOLGREICH gelaufenen 'architekt'-Schritt
     * (Fixture-Laufakte) und einen zum Start fälligen 'ausfuehrung'-Folgeschritt, startet ihn real
     * und liefert die resultierenden Workflow-Felder (status, grund) aus der echten Laufakte.
     * @param herkunftGesetzt - true = Projektmodus (herkunft.art 'projekt_interview'), false = Featuremodus
     * @returns { status, grund } von 'workflow-<id>' NACH dem Lauf
     */
    async function starteAusfuehrungUndLiesWorkflow(herkunftGesetzt) {
      const auftragAntwort = await fetch(`${basisUrl}/api/auftraege`, {
        method: 'POST',
        body: JSON.stringify({ titel: 'F42-WS-4-Gate-g', auftragstext: 'GATE-PLANUNGSTEXT-F42-G', ...(herkunftGesetzt ? { herkunft: { art: 'projekt_interview' } } : {}) }),
      })
      const { auftragId } = await auftragAntwort.json()
      if (auftragAntwort.status !== 201 || typeof auftragId !== 'string') {
        throw new Error(`(g)-Vorbereitung: POST /api/auftraege erwartet 201 mit auftragId, erhalten ${auftragAntwort.status}`)
      }

      const workflowId = `gate-f42-g-${randomUUID()}`
      const architektLaufId = `${workflowId}-architekt-lauf`
      const ergebnisArchitektur = {
        modus: 'projekt',
        zusammenfassung: 'Gate-Fixture (F42 WS-4).',
        module: [],
        adr_entwuerfe: [],
        schema_entwuerfe: [],
        entscheidungen_mensch: [],
        capabilities_bedarf: [],
        evidenz: [{ marker: '[Fakt]', aussage: 'Gate-Fixture.' }],
      }
      mkdirSync(basisVerzeichnis, { recursive: true })
      const rohstromPfad = join(basisVerzeichnis, `${architektLaufId}-rohstrom.json`)
      writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: JSON.stringify(ergebnisArchitektur) }) }))
      registriereKernArtefakt(
        `laufakte-${architektLaufId}`,
        profilReferenz,
        { erzeuger: 'kern', schritt: 'gate-fixture' },
        { laufakte_schema: 'v0', lauf_id: architektLaufId, worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad } },
        [],
        ladeOptionen
      )

      registriereWorkflow(
        {
          workflow_schema: 'v0',
          workflow_id: workflowId,
          auftrag_id: auftragId,
          version: 1,
          ziel: 'Gate-Fixture (F42 WS-4, löst F-712).',
          status: 'LAEUFT',
          aktiver_schritt_id: 'schritt-2-ausfuehrung',
          grund: null,
          grenzen: { max_schritte: 4, max_replans: 1 },
          schritte: [
            {
              schritt_id: 'schritt-1-architekt',
              rolle: 'architekt',
              werkzeugsatz: 'lesend',
              worker: 'codex',
              modell: 'gpt-6-astra',
              eingaben: [],
              output_schema: 'ergebnis-architektur',
              freigabe: 'ZWINGEND',
              risiko: 'Gate-Fixture.',
              zeitgrenze_ms: 600000,
              nachfolger: 'schritt-2-ausfuehrung',
              status: 'ERFOLGREICH',
              lauf_id: architektLaufId,
            },
            {
              schritt_id: 'schritt-2-ausfuehrung',
              rolle: 'ausfuehrung',
              werkzeugsatz: 'schreibend',
              worker: 'claude-code',
              modell: 'claude-sonnet-5',
              eingaben: ['artefakt:ergebnis-@schritt-1-architekt'],
              output_schema: null,
              freigabe: 'AUTOMATISCH',
              risiko: 'Gate-Fixture.',
              zeitgrenze_ms: 600000,
              nachfolger: null,
              status: 'OFFEN',
              lauf_id: null,
            },
          ],
        },
        profilReferenz,
        ladeOptionen
      )

      const start = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
      if (start.status !== 202) {
        throw new Error(`(g)-Vorbereitung: POST /api/workflows/<id>/starten erwartet 202, erhalten ${start.status} (${await start.text()})`)
      }

      const workflowVersion = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)
      return { status: workflowVersion.daten.status, grund: workflowVersion.daten.grund }
    }

    /**
     * QA-Befund (F42 WS-4, TC-03): F-712s Allowlist-Prüfung ist an 'herkunft.art' und
     * 'schritt.rolle', NICHT an einen 'architekt'-Vorgänger gekoppelt (scripts/leitstand-
     * server.mjs, Regel-1g-Berechnung) — ein Projektmodus-Workflow OHNE 'architekt'-Schritt
     * (Muster workflow-vorlagen/fast-lane.json: ein einzelner 'ausfuehrung'-Schritt) ist ein real
     * erreichbarer Pfad (POST /api/workflows ohne den Router), bislang aber nicht getestet.
     * @returns { status, grund } von 'workflow-<id>' NACH dem Lauf
     */
    async function starteEinzelschrittAusfuehrungOhneArchitektUndLiesWorkflow() {
      const auftragAntwort = await fetch(`${basisUrl}/api/auftraege`, {
        method: 'POST',
        body: JSON.stringify({ titel: 'F42-WS-4-Gate-g5', auftragstext: 'GATE-PLANUNGSTEXT-F42-G5', herkunft: { art: 'projekt_interview' } }),
      })
      const { auftragId } = await auftragAntwort.json()
      if (auftragAntwort.status !== 201 || typeof auftragId !== 'string') {
        throw new Error(`(g5)-Vorbereitung: POST /api/auftraege erwartet 201 mit auftragId, erhalten ${auftragAntwort.status}`)
      }

      const workflowId = `gate-f42-g5-${randomUUID()}`
      registriereWorkflow(
        {
          workflow_schema: 'v0',
          workflow_id: workflowId,
          auftrag_id: auftragId,
          version: 1,
          ziel: 'Gate-Fixture (F42 WS-4, löst F-712, TC-03: kein architekt-Vorgänger).',
          status: 'LAEUFT',
          aktiver_schritt_id: 'schritt-1-ausfuehrung',
          grund: null,
          grenzen: { max_schritte: 4, max_replans: 1 },
          schritte: [
            {
              schritt_id: 'schritt-1-ausfuehrung',
              rolle: 'ausfuehrung',
              werkzeugsatz: 'schreibend',
              worker: 'claude-code',
              modell: 'claude-sonnet-5',
              eingaben: ['artefakt:auftrag-' + auftragId],
              output_schema: null,
              freigabe: 'AUTOMATISCH',
              risiko: 'Gate-Fixture.',
              zeitgrenze_ms: 600000,
              nachfolger: null,
              status: 'OFFEN',
              lauf_id: null,
            },
          ],
        },
        profilReferenz,
        ladeOptionen
      )

      const start = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
      if (start.status !== 202) {
        throw new Error(`(g5)-Vorbereitung: POST /api/workflows/<id>/starten erwartet 202, erhalten ${start.status} (${await start.text()})`)
      }

      const workflowVersion = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)
      return { status: workflowVersion.daten.status, grund: workflowVersion.daten.grund }
    }

    /** Committet den aktuellen Arbeitsbaum, damit der NÄCHSTE Sub-Fall wieder von einem sauberen `git diff HEAD` startet — sonst bliebe die vorherige Schreibung im Diff sichtbar. '--allow-empty', weil der Grün-Fall des jeweiligen Sub-Falls nichts geschrieben haben kann. */
    function commitAlles() {
      execFileSync('git', ['add', '-A'], { cwd: repoWurzelWegwerf })
      execFileSync('git', ['commit', '--quiet', '--allow-empty', '-m', 'gate-zwischenstand'], { cwd: repoWurzelWegwerf })
    }

    try {
      // (g2) Rot-Fall: Projektmodus, ausfuehrung schreibt außerhalb der Allowlist.
      zuSchreibenderPfad = 'schemas/gate-f42.schema.json'
      const rot = await starteAusfuehrungUndLiesWorkflow(true)
      // 'git status --porcelain' meldet ein GANZ neues, bislang untrackedes Verzeichnis
      // zusammengefasst als '?? schemas/' statt jede Datei einzeln aufzulisten — bestehendes
      // Verhalten von parseUntrackedDateien (src/aenderungsuebersicht/index.ts), hier NICHT
      // angetastet. Die Prüfung greift trotzdem: 'schemas/' erfüllt keine Allowlist-Regel.
      if (rot.status !== 'KLAERUNG_ERFORDERLICH' || !String(rot.grund ?? '').includes('schemas/')) {
        befunde.push(`(g2) Projektmodus + Scope-Verstoß sollte KLAERUNG_ERFORDERLICH mit dem Dateinamen liefern, erhalten status=${rot.status} grund=${JSON.stringify(rot.grund)}`)
      }
      commitAlles()

      // (g3) Grün-Fall: Projektmodus, ausfuehrung schreibt nur innerhalb der Allowlist.
      zuSchreibenderPfad = 'docs/gate-f42.md'
      const gruen = await starteAusfuehrungUndLiesWorkflow(true)
      if (gruen.status !== 'ABGESCHLOSSEN') {
        befunde.push(`(g3) Projektmodus + Doku-Änderung sollte ABGESCHLOSSEN liefern, erhalten status=${gruen.status} grund=${JSON.stringify(gruen.grund)}`)
      }
      commitAlles()

      // (g4) Featuremodus-Regression (AK3, Nicht-Ziel "Feature-Modus unverändert"): dieselbe
      // Scope-Überschreitung OHNE herkunft.art bleibt FOLGENLOS.
      zuSchreibenderPfad = 'schemas/gate-f42-feature.schema.json'
      const feature = await starteAusfuehrungUndLiesWorkflow(false)
      if (feature.status !== 'ABGESCHLOSSEN') {
        befunde.push(`(g4) Featuremodus mit derselben Scope-Überschreitung sollte NICHT blockieren (ABGESCHLOSSEN erwartet), erhalten status=${feature.status} grund=${JSON.stringify(feature.grund)}`)
      }
      commitAlles()

      // (g5) QA-Befund (TC-03): dieselbe Scope-Überschreitung in einem Projektmodus-Workflow OHNE
      // 'architekt'-Vorgänger (ein einzelner 'ausfuehrung'-Schritt, Muster fast-lane.json) hält
      // ebenfalls an — die Prüfung hängt an 'herkunft.art', nicht an einem Architekturentwurf.
      zuSchreibenderPfad = 'schemas/gate-f42-g5.schema.json'
      const ohneArchitekt = await starteEinzelschrittAusfuehrungOhneArchitektUndLiesWorkflow()
      if (ohneArchitekt.status !== 'KLAERUNG_ERFORDERLICH' || !String(ohneArchitekt.grund ?? '').includes('schemas/')) {
        befunde.push(
          `(g5) Projektmodus-Einzelschritt OHNE architekt-Vorgänger mit Scope-Verstoß sollte KLAERUNG_ERFORDERLICH liefern, erhalten status=${ohneArchitekt.status} grund=${JSON.stringify(ohneArchitekt.grund)}`
        )
      }

      if (befunde.length === vor) {
        console.log(
          '✓ (g2)-(g5) F-712 real über den Aufrufpfad: Projektmodus mit Scope-Verstoß hält (KLAERUNG_ERFORDERLICH mit Dateiname), Projektmodus innerhalb der Allowlist läuft durch, Featuremodus bleibt von derselben Prüfung unberührt (Regression), und die Prüfung greift auch OHNE architekt-Vorgänger (TC-03).'
        )
      }
    } finally {
      await new Promise((resolve) => server.close(resolve))
      raeumeVerzeichnis(basisVerzeichnis)
    }
  }

  // ─── (h) F42 WS-4 (löst F-714) ────────────────────────────────────────────────────────────
  {
    const vor = befunde.length

    const basisVerzeichnis = `kontrollzustand-test-f42-h-${randomUUID()}`
    raeumeVerzeichnis(basisVerzeichnis)
    const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }
    const vorlage = ladeStartvorlage('startvorlagen/beispielprojekt.json')
    const profilReferenz = leiteProfilReferenzAb(vorlage)

    const repoWurzelWegwerf = mkdtempSync(join(tmpdir(), 'f42-h-repo-'))
    execFileSync('git', ['init', '--quiet', '-b', 'wegwerf-branch'], { cwd: repoWurzelWegwerf })
    execFileSync('git', ['config', 'user.email', 'gate@example.com'], { cwd: repoWurzelWegwerf })
    execFileSync('git', ['config', 'user.name', 'Gate'], { cwd: repoWurzelWegwerf })
    const claudeMdPfad = join(repoWurzelWegwerf, 'CLAUDE.md')
    writeFileSync(claudeMdPfad, '# Projekt\n\n## 🏗️ Technischer Stack [FÜLLUNG]\n\nNoch nicht entschieden.\n')
    execFileSync('git', ['add', '-A'], { cwd: repoWurzelWegwerf })
    execFileSync('git', ['commit', '--quiet', '-m', 'init'], { cwd: repoWurzelWegwerf })

    const STACK_ENTSCHEIDUNG = {
      frage: 'Welcher Stack?',
      optionen: [
        { titel: 'TypeScript auf Node', vorteile: ['x'], nachteile: [] },
        { titel: 'Python', vorteile: [], nachteile: ['x'] },
      ],
      auswirkung_bestand: 'keine',
      empfehlung: 'TypeScript auf Node',
      begruendung: 'Gate-Fixture.',
      kategorie: 'stack',
    }

    /** true = der Lauf füllt CLAUDE.md real (Marker entfernt); false = der Lauf lässt CLAUDE.md unverändert. */
    let claudeMdFuellen = false
    /** true = der Lauf legt real ein ADR unter docs/adr/ an, das auf die Entscheidung verweist; false = kein ADR. */
    let adrSchreiben = false
    /** Der real gesehene Auftragstext des zuletzt gestarteten 'ausfuehrung'-Laufs (Muster (o)-Block, check-f39-architekt.mjs). */
    let gesehenerAuftragstext = null
    /** Die Entscheidungsartefakt-Id des zuletzt gestarteten Workflows (workflowEntscheidungArtefaktId-Format), für den ADR-Verweis im Stub. */
    let aktuelleEntscheidungArtefaktId = null
    const fuehreAufgabeDurchFn = async (_laufId, _profilReferenz, eingaben) => {
      gesehenerAuftragstext = eingaben.auftragstext
      if (claudeMdFuellen) {
        writeFileSync(claudeMdPfad, '# Projekt\n\n## 🏗️ Technischer Stack\n\nTypeScript auf Node (F42-WS-4-Gate).\n')
      }
      if (adrSchreiben) {
        const adrOrdner = join(repoWurzelWegwerf, 'docs', 'adr')
        mkdirSync(adrOrdner, { recursive: true })
        writeFileSync(join(adrOrdner, '0001-stack.md'), `# ADR 0001: Stack\n\nEntscheidung: ${aktuelleEntscheidungArtefaktId}\n`)
      }
      return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
    }

    const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, fuehreAufgabeDurchFn, repoWurzel: repoWurzelWegwerf }))
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    const { port } = server.address()
    const basisUrl = `http://127.0.0.1:${port}`

    async function starteAusfuehrungMitStackEntscheidungUndLiesWorkflow() {
      const auftragAntwort = await fetch(`${basisUrl}/api/auftraege`, {
        method: 'POST',
        body: JSON.stringify({ titel: 'F42-WS-4-Gate-h', auftragstext: 'GATE-PLANUNGSTEXT-F42-H', herkunft: { art: 'projekt_interview' } }),
      })
      const { auftragId } = await auftragAntwort.json()
      if (auftragAntwort.status !== 201 || typeof auftragId !== 'string') {
        throw new Error(`(h)-Vorbereitung: POST /api/auftraege erwartet 201 mit auftragId, erhalten ${auftragAntwort.status}`)
      }

      const workflowId = `gate-f42-h-${randomUUID()}`
      aktuelleEntscheidungArtefaktId = `workflow-entscheidung-${workflowId}`
      const architektLaufId = `${workflowId}-architekt-lauf`
      const ergebnisArchitektur = {
        modus: 'projekt',
        zusammenfassung: 'Gate-Fixture (F42 WS-4, löst F-714).',
        module: [],
        adr_entwuerfe: [],
        schema_entwuerfe: [],
        entscheidungen_mensch: [STACK_ENTSCHEIDUNG],
        capabilities_bedarf: [],
        evidenz: [{ marker: '[Fakt]', aussage: 'Gate-Fixture.' }],
      }
      mkdirSync(basisVerzeichnis, { recursive: true })
      const rohstromPfad = join(basisVerzeichnis, `${architektLaufId}-rohstrom.json`)
      writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: JSON.stringify(ergebnisArchitektur) }) }))
      registriereKernArtefakt(
        `laufakte-${architektLaufId}`,
        profilReferenz,
        { erzeuger: 'kern', schritt: 'gate-fixture' },
        { laufakte_schema: 'v0', lauf_id: architektLaufId, worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad } },
        [],
        ladeOptionen
      )

      // Bereits erfasste menschliche Entscheidung (Voraussetzung für baueStackEntscheidungsInstruktion
      // UND Regel 1h, Muster Regel 1c/findeWorkflowEntscheidungFuerSchritt).
      registriereWorkflowEntscheidung(
        basisVerzeichnis,
        workflowId,
        profilReferenz,
        'schritt-1-architekt',
        [{ frage: STACK_ENTSCHEIDUNG.frage, gewaehlt: STACK_ENTSCHEIDUNG.empfehlung }],
        new Date().toISOString(),
        []
      )

      registriereWorkflow(
        {
          workflow_schema: 'v0',
          workflow_id: workflowId,
          auftrag_id: auftragId,
          version: 1,
          ziel: 'Gate-Fixture (F42 WS-4, löst F-714).',
          status: 'LAEUFT',
          aktiver_schritt_id: 'schritt-2-ausfuehrung',
          grund: null,
          grenzen: { max_schritte: 4, max_replans: 1 },
          schritte: [
            {
              schritt_id: 'schritt-1-architekt',
              rolle: 'architekt',
              werkzeugsatz: 'lesend',
              worker: 'codex',
              modell: 'gpt-6-astra',
              eingaben: [],
              output_schema: 'ergebnis-architektur',
              freigabe: 'ZWINGEND',
              risiko: 'Gate-Fixture.',
              zeitgrenze_ms: 600000,
              nachfolger: 'schritt-2-ausfuehrung',
              status: 'ERFOLGREICH',
              lauf_id: architektLaufId,
            },
            {
              schritt_id: 'schritt-2-ausfuehrung',
              rolle: 'ausfuehrung',
              werkzeugsatz: 'schreibend',
              worker: 'claude-code',
              modell: 'claude-sonnet-5',
              eingaben: ['artefakt:ergebnis-@schritt-1-architekt', 'artefakt:entscheidung-@schritt-1-architekt'],
              output_schema: null,
              freigabe: 'AUTOMATISCH',
              risiko: 'Gate-Fixture.',
              zeitgrenze_ms: 600000,
              nachfolger: null,
              status: 'OFFEN',
              lauf_id: null,
            },
          ],
        },
        profilReferenz,
        ladeOptionen
      )

      gesehenerAuftragstext = null
      const start = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
      if (start.status !== 202) {
        throw new Error(`(h)-Vorbereitung: POST /api/workflows/<id>/starten erwartet 202, erhalten ${start.status} (${await start.text()})`)
      }

      const workflowVersion = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)
      return { status: workflowVersion.daten.status, grund: workflowVersion.daten.grund, auftragstext: gesehenerAuftragstext }
    }

    function commitAlles() {
      execFileSync('git', ['add', '-A'], { cwd: repoWurzelWegwerf })
      execFileSync('git', ['commit', '--quiet', '--allow-empty', '-m', 'gate-zwischenstand'], { cwd: repoWurzelWegwerf })
    }

    try {
      // (h1) Rot-Fall: Stack entschieden, weder CLAUDE.md noch ADR gepflegt.
      claudeMdFuellen = false
      adrSchreiben = false
      const rot = await starteAusfuehrungMitStackEntscheidungUndLiesWorkflow()
      if (rot.status !== 'KLAERUNG_ERFORDERLICH' || !String(rot.grund ?? '').includes('Stack entschieden, aber CLAUDE.md/ADR nicht vollständig gepflegt (F-714)')) {
        befunde.push(`(h1) Stack entschieden + nichts gepflegt sollte KLAERUNG_ERFORDERLICH mit dem F-714-Text liefern, erhalten status=${rot.status} grund=${JSON.stringify(rot.grund)}`)
      }
      if (!rot.auftragstext.includes('CLAUDE.md') || !rot.auftragstext.includes('docs/adr/')) {
        befunde.push(`(h1) Der Auftragstext des 'ausfuehrung'-Schritts sollte baueStackEntscheidungsInstruktion (CLAUDE.md + docs/adr/) enthalten, erhalten: ${rot.auftragstext?.slice(-400)}`)
      }
      commitAlles()

      // (h2) Rot-Fall (QA-Befund, F-714 nur zur Hälfte erzwungen): CLAUDE.md wird real gefüllt,
      // aber KEIN ADR geschrieben — baueStackEntscheidungsInstruktion verlangt BEIDE Schreibziele
      // als Pflicht, ein Lauf, der nur die Hälfte erfüllt, darf die Prüfung nicht bestehen.
      claudeMdFuellen = true
      adrSchreiben = false
      const halbGefuellt = await starteAusfuehrungMitStackEntscheidungUndLiesWorkflow()
      if (halbGefuellt.status !== 'KLAERUNG_ERFORDERLICH' || !String(halbGefuellt.grund ?? '').includes('F-714')) {
        befunde.push(`(h2) CLAUDE.md gefüllt, aber KEIN ADR sollte weiterhin KLAERUNG_ERFORDERLICH (F-714) liefern, erhalten status=${halbGefuellt.status} grund=${JSON.stringify(halbGefuellt.grund)}`)
      }
      commitAlles()

      // (h3) Grün-Fall: Stack entschieden, CLAUDE.md UND ein referenzierendes ADR werden real geschrieben.
      claudeMdFuellen = true
      adrSchreiben = true
      const gruen = await starteAusfuehrungMitStackEntscheidungUndLiesWorkflow()
      if (gruen.status !== 'ABGESCHLOSSEN') {
        befunde.push(`(h3) Stack entschieden + CLAUDE.md UND ADR real gepflegt sollte ABGESCHLOSSEN liefern, erhalten status=${gruen.status} grund=${JSON.stringify(gruen.grund)}`)
      }

      if (befunde.length === vor) {
        console.log(
          "✓ (h1)-(h3) F-714 real über den Aufrufpfad: baueStackEntscheidungsInstruktion hängt CLAUDE.md/ADR-Anweisung an; fehlt CLAUDE.md ODER das referenzierende ADR, hält der Workflow (KLAERUNG_ERFORDERLICH); erst wenn beide real gepflegt sind, läuft der Workflow durch."
        )
      }
    } finally {
      await new Promise((resolve) => server.close(resolve))
      raeumeVerzeichnis(basisVerzeichnis)
    }
  }

  // ─── (i) F42 WS-4 (löst F-711) ────────────────────────────────────────────────────────────
  {
    const vor = befunde.length
    const workflowsQuelltext = readFileSync(join(ECHTE_INSTALL_WURZEL, 'public', 'leitstand', 'views', 'workflows.js'), 'utf8')

    if (!workflowsQuelltext.includes('option.titel === frage.empfehlung')) {
      befunde.push("(i) public/leitstand/views/workflows.js: erwartet die Vorauswahl-Bedingung 'option.titel === frage.empfehlung' (F-711) — nicht gefunden")
    }
    if (!/\$\{empfohlen \? ' checked' : ''\}/.test(workflowsQuelltext)) {
      befunde.push("(i) public/leitstand/views/workflows.js: erwartet, dass das 'checked'-Attribut an die Variable 'empfohlen' gekoppelt ist — nicht gefunden")
    }
    // Regressionsschutz: eine index-basierte Vorauswahl (z. B. 'index === 0') darf nicht wieder auftauchen.
    if (/index\s*===\s*0\s*\?\s*' checked'/.test(workflowsQuelltext)) {
      befunde.push('(i) public/leitstand/views/workflows.js: eine index-basierte Vorauswahl (erste Option) wäre der F-711-Rückfall')
    }

    if (befunde.length === vor) {
      console.log("✓ (i) F-711: das Entscheidungsformular wählt die Option vor, deren titel der empfehlung entspricht (statisches Quelltext-Gate, Muster check-f15-workflow-oberflaeche.mjs).")
    }
  }
} finally {
  raeumeVerzeichnis(TEST_WURZEL)
}

// ─── Ergebnis ───────────────────────────────────────────────────────────────
console.log('')
if (befunde.length === 0) {
  console.log('✓ Keine Befunde.\n')
  process.exitCode = 0
} else {
  console.log(`✗ ${befunde.length} Befund(e):\n`)
  for (const b of befunde) console.log(`  - ${b}`)
  console.log('')
  process.exitCode = 1
}
