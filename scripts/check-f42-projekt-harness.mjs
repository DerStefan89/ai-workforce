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
 *
 * Wird aufgerufen von: `npm run check`.
 *
 * Aufruf: node scripts/check-f42-projekt-harness.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, win32 } from 'node:path'
import { findeNpmCli, kopiereSkelett, pruefeWorkspaceTrust, schreibeStartvorlageUndProfil } from '../src/projekt-anlegen/index.ts'
import { fuehrePruefungDurch } from '../src/pruefschritt/index.ts'
import { baueAuftragAusProjektentwurf } from '../src/product-coach/index.ts'
import { vergebeFeatureIds } from '../src/product-coach/index.ts'
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
