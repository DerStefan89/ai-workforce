#!/usr/bin/env node
/**
 * Datei: scripts/check-fixpaket-f35-reallauf.mjs
 *
 * Zweck: Gate für das Fixpaket nach dem F35-Reallauf gegen haushaltsbuch2 (state/findings.md
 * F-750, F-752, F-753, F-754, F-760; Verträge state/tasks/fixpaket-f35-reallauf.md und
 * state/tasks/fix-f760-verweigert-bau.md). Damit ein Feature-Bau im Pfad 'hoch' echten
 * Produktcode erzeugt, entschiedene ADRs respektiert, die Ausführung Paket- und Prüfbefehle
 * ausführen darf UND ein Baulauf, der ausschließlich an dieser Bash-Allowlist abprallt, nicht in
 * einer Sackgasse ohne Review-Kette endet (F-760).
 *
 * (a) Unit: baueUmsetzungsInstruktion('feature') trägt Baupflicht und den Satz "Das Zurückschreiben
 *     des Entwurfs allein erfüllt den Auftrag NICHT."; baueUmsetzungsInstruktion('projekt') ist
 *     bitgenau gleich dem festen Erwartungstext vor diesem Fix (F-752).
 * (b) Realer Aufrufpfad (Regel e, F-708): POST /api/workflows/<id>/starten eines 'ausfuehrung'-
 *     Schritts im FEATURE-Modus nach einem Architekt-Lauf mit 'kategorie: stack'-Entscheidung —
 *     mit erfasster menschlicher Antwort enthält der Auftragstext die Stack-Instruktion, ohne
 *     Antwort nicht (F-753).
 * (c) Architekt-Auftragstext: am realen Schrittstart mit einem ADR 'Status: Entschieden' enthält er
 *     den bindenden Block (und bei offenem Stack den ADR-Stack-Hinweis); mit 'Status: Vorgeschlagen'
 *     oder nur TEMPLATE.md nicht; ohne docs/adr kein Wurf. Dazu Randfälle von leseEntschiedeneAdrs
 *     auf Unit-Ebene ('## Entscheidung (Mensch)', Kürzung, Status im Fließtext) (F-750).
 * (d) Advisor-Auftragstext analog (c) am realen Schrittstart: Grünfall plus ein Rotfall (F-750).
 * (e) Validator: nacktes "Bash", "Bash(git status:*)", "Bash(*)", "Bash(:*)", "Bash(npm:*)", die alten
 *     Regeln "Bash(npm install:*)"/"Bash(npm ci:*)"/"Bash(npx tsc:*)" (F-756),
 *     "PowerShell" → Fehler; die Allowlist E-F754 → gültig; startvorlagen/ai-workforce.json
 *     validiert. baueAufruf: '--tools' bekommt Werkzeugnamen, '--allowedTools' die Regeln,
 *     '--disallowedTools Bash(git:*)' nur bei Bash-Regeln; ein Satz ohne Bash bleibt bitgenau (F-754).
 * (f) cwd: der reale 'ausfuehrung'-Schrittstart reicht optionen.cwd = loeseProjektPfade(...).cwd
 *     (= Projekt-repoWurzel) an fuehreAufgabeDurchFn durch; Rotfall-Kalibrierung ohne cwd-Option.
 *     Weiter bis zum Spawn: src/execution-controller/index.ts (cwd: optionen.cwd) →
 *     src/claude-code-gateway/index.ts (starteProzess cwd) → prozessstart.ts (spawn cwd), dort
 *     belegt von scripts/check-f25-projekte.mjs (2c).
 * (g) F-760, Unit: baueUmsetzungsInstruktion('feature', true) trägt die aus ERLAUBTE_BASH_REGELN
 *     abgeleitete Befehlsliste; traegtBashRegeln=false/Default/Modus 'projekt' bleiben bitgenau
 *     ohne den Shell-Absatz.
 * (h) F-760, realer Aufrufpfad: ein 'ausfuehrung'-Lauf, der VERWEIGERT ohne Bypass-Verdacht endet
 *     (bypass_verdacht_anzahl 0), bekommt Änderungsübersicht UND Prüfergebnis registriert wie ein
 *     ERFOLGREICH und hält mit einem eigenen Grund, der die abgelehnten Befehle (aus dem Rohstrom
 *     gelesen) und 'F-760' nennt.
 * (i) F-760, Rotfall-Kalibrierung zu (h): derselbe Lauf MIT Bypass-Verdacht (bypass_verdacht_anzahl
 *     1) registriert nichts und hält mit dem bisherigen, generischen Regel-1-Text — kein
 *     F-760-Zusatz.
 * (j) F-760, realer Aufrufpfad: eine Reparaturfassung, die den Cursor nach einem VERWEIGERT-ohne-
 *     Bypass-Verdacht-Halt auf den Review-Folgeschritt setzt (schritt-1 behält status VERWEIGERT
 *     und lauf_id unverändert), löst dessen 'aenderungsuebersicht-@'/'pruefergebnis-@'-Eingaben
 *     real auf.
 * (k) F-760, QA-Befund: ein 'ausfuehrung'-Schritt OHNE architekt-Vorschritt (Muster
 *     workflow-vorlagen/standard.json, fast-lane.json) bekommt die Bash-Allowlist im Auftragstext
 *     trotzdem genannt — baueUmsetzungsInstruktion läuft dort nie (kein Architekturentwurf),
 *     baueBashAllowlistSatz() hängt sie unabhängig davon an.
 *
 * Jeder HTTP-Fall bekommt ein eigenes Wegwerf-Repo und einen eigenen Server (Muster
 * scripts/check-fixpaket-f30-vorbedingungen.mjs).
 *
 * Wird aufgerufen von: `npm run check`.
 *
 * Aufruf: node scripts/check-fixpaket-f35-reallauf.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { baueArchitektAuftragstext, baueUmsetzungsInstruktion, leseEntschiedeneAdrs } from '../src/architekt/index.ts'
import { baueArchitectureAdvisorAuftragstext } from '../src/architecture-advisor/index.ts'
import { baueAufruf } from '../src/claude-code-gateway/index.ts'
import { ladeArtefaktVersion, registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { ERLAUBTE_BASH_REGELN, ladeStartvorlage, leiteProfilReferenzAb, validiereStartvorlageDaten } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { registriereWorkflowEntscheidung } from './leitstand/routen-f39.mjs'
import { erzeugeRequestHandler, loeseProjektPfade } from './leitstand-server.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
console.log('\n=== Fixpaket-F35-Reallauf-Check ===\n')

const STILL = () => {}
const INSTALL_WURZEL = process.cwd()
const BAU_SATZ = 'Das Zurückschreiben des Entwurfs allein erfüllt den Auftrag NICHT.'
const ADR_UEBERSCHRIFT = 'Bereits entschiedene Projektentscheidungen (bindend):'
const ADR_STACK_HINWEIS_FRAGMENT = "nenne genau diese Wahl als 'empfehlung' deiner Stack-Entscheidung"
const STACK_INSTRUKTION_FRAGMENT = "Eine menschliche Entscheidung mit 'kategorie': 'stack' liegt vor"

/** Führt einen git-Befehl im Wegwerf-Repo aus. @returns stdout */
function git(repoWurzel, argumente) {
  return execFileSync('git', argumente, { cwd: repoWurzel, encoding: 'utf8' })
}

/**
 * Wegwerf-"Fremdprojekt" (nicht auf main, E-F39-1=B), optional mit docs/adr-Dateien.
 * @param adrDateien - { dateiname: inhalt } unter docs/adr/, oder null für "kein Ordner"
 * @returns absoluter Pfad
 */
function baueFremdprojekt(adrDateien = null) {
  const repoWurzel = mkdtempSync(join(tmpdir(), 'fixpaket-f35-repo-'))
  git(repoWurzel, ['init', '--quiet', '-b', 'wegwerf-branch'])
  git(repoWurzel, ['config', 'user.email', 'gate@example.invalid'])
  git(repoWurzel, ['config', 'user.name', 'Gate'])
  git(repoWurzel, ['config', 'core.autocrlf', 'false'])
  writeFileSync(join(repoWurzel, 'package.json'), `${JSON.stringify({ name: 'fremd', scripts: { check: 'node -e 0' } }, null, 2)}\n`)
  if (adrDateien !== null) {
    mkdirSync(join(repoWurzel, 'docs', 'adr'), { recursive: true })
    for (const [datei, inhalt] of Object.entries(adrDateien)) writeFileSync(join(repoWurzel, 'docs', 'adr', datei), inhalt)
  }
  git(repoWurzel, ['add', '-A'])
  git(repoWurzel, ['commit', '--quiet', '-m', 'init'])
  return repoWurzel
}

/** Test-ADR im Format von haushaltsbuch2 (Status-Zeile ohne Fettung, Abschnitt '## Entscheidung (Mensch)' danach). */
function adrText(status) {
  return [
    '# ADR-0003: Lokale Web-App mit TypeScript, Node.js und SQLite als Stack',
    '',
    `Status: ${status}`,
    'Datum: 2026-09-25',
    '',
    '## Kontext',
    '',
    'Stack war offen.',
    '',
    '## Entscheidung',
    '',
    'GATE-ADR-ENTSCHEIDUNG: Lokale Web-App mit TypeScript, Node.js und SQLite.',
    '',
    '## Alternativen',
    '',
    '- Browser-App mit IndexedDB (verworfen).',
    '',
    '## Entscheidung (Mensch)',
    '',
    'GATE-NICHT-IM-BLOCK',
    '',
  ].join('\n')
}

const TEMPLATE_TEXT = '# ADR-NNNN: <Titel>\n\nStatus: Entwurf | Entschieden | Verworfen\n\n## Entscheidung\n\nGATE-TEMPLATE\n'

// Codex braucht einen resolvierbaren (nicht notwendig existierenden) Startziel-Pfad (Muster check-f30).
const CODEX_BLOCK = { codex: { startziel: [String.raw`C:\fixpaket-f35-gate-dummy\codex.exe`], versionDeklariert: 'codex-cli-gate-fixture', sandbox: 'read-only' } }

/** Schreibt eine Wegwerf-Startvorlage (beispielprojekt + Codex-Block) außerhalb des Repos. @returns { pfad, verzeichnis } */
/**
 * @param optionen - { mitBashAllowlist } (F-760, Fall k: beispielprojekt.json trägt selbst keine
 *   Bash-Regeln — true hängt E-F754s Allowlist an werkzeugsaetze.schreibend an, damit der reale
 *   'traegtBashRegeln'-Pfad in scripts/leitstand-server.mjs real geprüft werden kann)
 */
function schreibeStartvorlage(optionen = {}) {
  const verzeichnis = mkdtempSync(join(tmpdir(), 'fixpaket-f35-vorlage-'))
  const pfad = join(verzeichnis, 'startvorlage.json')
  const basis = ladeStartvorlage('startvorlagen/beispielprojekt.json')
  const werkzeugsaetze =
    optionen.mitBashAllowlist === true
      ? { ...basis.werkzeugsaetze, schreibend: { ...basis.werkzeugsaetze.schreibend, erlaubte_werkzeuge: [...basis.werkzeugsaetze.schreibend.erlaubte_werkzeuge, ...ERLAUBTE_BASH_REGELN] } }
      : basis.werkzeugsaetze
  // pruefbefehl wie bei jedem echten Projekt (sonst fehlt der F-652-Hinweis im Auftragstext); ein No-op, damit der Kern-Prüfschritt schnell grün ist.
  writeFileSync(pfad, JSON.stringify({ ...basis, werkzeugsaetze, worker: CODEX_BLOCK, pruefbefehl: [process.execPath, '-e', '0'] }, null, 2))
  return { pfad, verzeichnis }
}

/** Wartet ms Millisekunden. @returns Promise */
function verzoegerung(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const STACK_ENTSCHEIDUNG = {
  frage: 'Welcher Stack?',
  optionen: [
    { titel: 'TypeScript/Node/SQLite', vorteile: ['lokal'], nachteile: ['Server nötig'] },
    { titel: 'Browser/IndexedDB', vorteile: ['kein Server'], nachteile: ['Datenverlust-Risiko'] },
  ],
  auswirkung_bestand: 'keine',
  empfehlung: 'TypeScript/Node/SQLite',
  begruendung: 'Gate-Fixture.',
  kategorie: 'stack',
}

/**
 * Startet genau einen Workflow-Schritt über den echten HTTP-Pfad und liefert, was der Worker sah.
 * @param fall - Fallkennung für Befundtexte
 * @param optionen - { adrDateien, rolle ('architekt'|'architecture-advisor'|'ausfuehrung'), stackEntscheidungErfasst, cwdAusRegister,
 *   verweigert ({ bypassVerdachtAnzahl, denials } — F-760: statt eines ERFOLGREICH-Ausgangs simuliert der Worker ein VERWEIGERT mit
 *   echter Laufakte/Rohstrom (permission_denials: denials), damit leseAbgelehnteBefehleAusRohstrom real etwas findet),
 *   ohneArchitekt (F-760, Fall k: rolle 'ausfuehrung' baut EIN Schritt ohne architekt-Vorschritt, Muster fast-lane.json,
 *   statt der sonstigen Zwei-Schritt-Fixtur architekt→ausfuehrung) }
 * @returns { auftragstext, laufOptionen, repoWurzel, erwartetesCwd, workflowStatus, workflowGrund, ausfuehrungsSchrittStatus,
 *   laufId1, uebersichtRegistriert, pruefergebnisRegistriert } oder null bei Vorbedingungsfehler
 */
async function starteSchritt(fall, optionen) {
  const basisVerzeichnis = `kontrollzustand-test-fixpaket-f35-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const repoWurzel = baueFremdprojekt(optionen.adrDateien ?? null)
  const { pfad: startvorlagePfad, verzeichnis } = schreibeStartvorlage({ mitBashAllowlist: optionen.ohneArchitekt === true })
  const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage(startvorlagePfad))
  const ladeOptionen = { basisVerzeichnis, schreiber: STILL }
  // (f): cwd so abgeleitet wie im CLI-Bindeblock (baueProjektHandlerMap → loeseProjektPfade).
  const erwartetesCwd = loeseProjektPfade({ repo_pfad: repoWurzel, basisverzeichnis: 'kontrollzustand', startvorlage_pfad: 'startvorlagen/x.json' }, INSTALL_WURZEL).cwd

  let gesehen = null
  const fuehreAufgabeDurchFn = async (laufId, _profilReferenz, eingaben, laufOptionen) => {
    gesehen = { auftragstext: eingaben.auftragstext, laufOptionen, anfragen: eingaben.anfragen }
    if (optionen.verweigert !== undefined) {
      // F-760 (h/i): eine echte Laufakte mit permission_denials im Rohstrom — sonst fände
      // leseAbgelehnteBefehleAusRohstrom nichts und der Halt-Grund bliebe ungeprüft ("keine im
      // Rohstrom lesbar").
      const rohstromPfad = join(basisVerzeichnis, `${laufId}-rohstrom.json`)
      writeFileSync(
        rohstromPfad,
        JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: 'GATE-VERWEIGERT-ERGEBNISTEXT', permission_denials: optionen.verweigert.denials }) })
      )
      registriereKernArtefakt(
        `laufakte-${laufId}`,
        profilReferenz,
        { erzeuger: 'kern', schritt: 'gate-fixture' },
        { laufakte_schema: 'v0', lauf_id: laufId, worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad } },
        [],
        ladeOptionen
      )
      return { ok: true, klassifikation: { ergebnis: 'VERWEIGERT', bypass_verdacht_anzahl: optionen.verweigert.bypassVerdachtAnzahl }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'VERWEIGERT' } }
    }
    return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  }
  const server = createServer(
    erzeugeRequestHandler({
      basisVerzeichnis,
      fuehreAufgabeDurchFn,
      repoWurzel,
      installWurzel: INSTALL_WURZEL,
      startvorlagePfad,
      ...(optionen.cwdAusRegister === false ? {} : { cwd: erwartetesCwd }),
    })
  )
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const basisUrl = `http://127.0.0.1:${server.address().port}`
  try {
    const auftragAntwort = await fetch(`${basisUrl}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: `F35-Fixpaket-Gate ${fall}`, auftragstext: 'GATE-PLANUNGSTEXT-F35-FIX' }) })
    const { auftragId } = await auftragAntwort.json().catch(() => ({}))
    if (auftragAntwort.status !== 201 || typeof auftragId !== 'string') {
      befunde.push(`${fall}: Vorbedingung POST /api/auftraege erwartet 201, erhalten ${auftragAntwort.status}`)
      return null
    }
    const workflowId = `fixpaket-f35-gate-${randomUUID()}`
    const schritte = []
    if (optionen.rolle === 'ausfuehrung' && optionen.ohneArchitekt === true) {
      // F-760 (QA-Pass 28.09.2026, Fall k): Muster workflow-vorlagen/fast-lane.json — EIN
      // 'ausfuehrung'-Schritt ohne architekt-Vorschritt, derselbe schreibende Werkzeugsatz wie
      // überall sonst in diesem Gate.
      schritte.push({
        schritt_id: 'schritt-1-ausfuehrung',
        rolle: 'ausfuehrung',
        werkzeugsatz: 'schreibend',
        worker: 'claude-code',
        modell: 'claude-sonnet-5',
        eingaben: [`artefakt:auftrag-${auftragId}`],
        output_schema: null,
        freigabe: 'ZWINGEND',
        freigabe_erteilt: true,
        risiko: 'Gate-Fixture.',
        zeitgrenze_ms: 600000,
        nachfolger: null,
        status: 'OFFEN',
        lauf_id: null,
      })
    } else if (optionen.rolle === 'ausfuehrung') {
      const architektLaufId = `${workflowId}-architekt-lauf`
      const ergebnisArchitektur = {
        modus: 'feature',
        zusammenfassung: 'Gate-Fixture.',
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
      // QA-Befund: der reale nächste Lauf ist Iteration n+1 nach "Anpassung anfordern" — dieselbe
      // deterministische Artefakt-ID, die der Schrittstart liest (F-648).
      if (optionen.anpassungAngefordert) {
        registriereKernArtefakt(
          `entscheidung-workflow-${workflowId}-abnahme`,
          profilReferenz,
          { erzeuger: 'kern', schritt: 'gate-fixture' },
          { ergebnis: 'ANPASSUNG_ANGEFORDERT', begruendung: 'GATE-ABNAHME-BEGRUENDUNG', bezug: {} },
          [],
          ladeOptionen
        )
      }
      if (optionen.stackEntscheidungErfasst) {
        registriereWorkflowEntscheidung(
          basisVerzeichnis,
          workflowId,
          profilReferenz,
          'schritt-1-architekt',
          [{ frage: STACK_ENTSCHEIDUNG.frage, gewaehlt: STACK_ENTSCHEIDUNG.empfehlung }],
          new Date().toISOString(),
          []
        )
      }
      schritte.push(
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
          freigabe: 'ZWINGEND',
          freigabe_erteilt: true,
          risiko: 'Gate-Fixture.',
          zeitgrenze_ms: 600000,
          nachfolger: null,
          status: 'OFFEN',
          lauf_id: null,
        }
      )
    } else {
      schritte.push({
        schritt_id: 'schritt-1',
        rolle: optionen.rolle,
        werkzeugsatz: 'lesend',
        worker: optionen.rolle === 'architekt' ? 'codex' : 'claude-code',
        modell: optionen.rolle === 'architekt' ? 'gpt-6-astra' : 'claude-sonnet-5',
        eingaben: [],
        output_schema: optionen.rolle === 'architekt' ? 'ergebnis-architektur' : null,
        freigabe: 'AUTOMATISCH',
        risiko: 'Gate-Fixture.',
        zeitgrenze_ms: 600000,
        nachfolger: null,
        status: 'OFFEN',
        lauf_id: null,
      })
    }
    registriereWorkflow(
      {
        workflow_schema: 'v0',
        workflow_id: workflowId,
        auftrag_id: auftragId,
        version: 1,
        ziel: 'F35-Fixpaket-Gate-Fixture.',
        status: optionen.rolle === 'ausfuehrung' && optionen.ohneArchitekt !== true ? 'LAEUFT' : 'OFFEN',
        aktiver_schritt_id: schritte.find((s) => s.status === 'OFFEN').schritt_id,
        grund: null,
        grenzen: { max_schritte: 4, max_replans: 1 },
        schritte,
      },
      profilReferenz,
      ladeOptionen
    )
    const start = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
    if (start.status !== 202) {
      befunde.push(`${fall}: Vorbedingung POST .../starten erwartet 202, erhalten ${start.status} (${await start.text()})`)
      return null
    }
    // Nachlauf abwarten, bevor Server und Verzeichnisse abgeräumt werden.
    const startzeit = Date.now()
    while (Date.now() - startzeit < 5000) {
      const status = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)?.daten?.status
      if (status !== 'LAEUFT' && status !== 'OFFEN') break
      await verzoegerung(50)
    }
    // F-760 (h/i): der Nachlauf-Zustand muss VOR dem finally-Aufräumen gelesen werden — danach
    // sind basisVerzeichnis/repoWurzel bereits gelöscht.
    const workflowEndDaten = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)?.daten ?? null
    const ausfuehrungsSchrittEnd = workflowEndDaten?.schritte?.find((s) => s.rolle === 'ausfuehrung') ?? null
    const laufId1 = ausfuehrungsSchrittEnd?.lauf_id ?? null
    const uebersichtRegistriert = laufId1 !== null && ladeArtefaktVersion(`aenderungsuebersicht-${laufId1}`, undefined, ladeOptionen) !== null
    const pruefergebnisRegistriert = laufId1 !== null && ladeArtefaktVersion(`pruefergebnis-${laufId1}`, undefined, ladeOptionen) !== null
    return {
      auftragstext: gesehen?.auftragstext ?? null,
      laufOptionen: gesehen?.laufOptionen ?? null,
      repoWurzel,
      erwartetesCwd,
      workflowStatus: workflowEndDaten?.status ?? null,
      workflowGrund: workflowEndDaten?.grund ?? null,
      ausfuehrungsSchrittStatus: ausfuehrungsSchrittEnd?.status ?? null,
      laufId1,
      uebersichtRegistriert,
      pruefergebnisRegistriert,
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
    raeumeVerzeichnis(repoWurzel)
    raeumeVerzeichnis(verzeichnis)
  }
}

// ─── (a) F-752: Feature-Instruktion mit Baupflicht, Projekt-Instruktion bitgenau ──────────────
{
  const vor = befunde.length
  const feature = baueUmsetzungsInstruktion('feature')
  const featureText = feature.join('\n')
  for (const fragment of ["package.json ein und rufst danach 'npm install'", 'BAU des Features', 'lauffähigen Code', 'durch Tests belegt', 'Teil 2 — Feature bauen', "'npm run check'", '.claude/skills/werkzeug-auswahl', 'Rückfrage', "'[FÜLLUNG]'-Marker", BAU_SATZ]) {
    if (!featureText.includes(fragment)) befunde.push(`(a) Feature-Instruktion: Fragment ${JSON.stringify(fragment)} fehlt`)
  }
  // Die vier Rückschreib-Punkte bleiben als ERSTER Teil, inhaltlich unverändert.
  const rueckschreibFragmente = ['docs/adr/TEMPLATE.md', 'schemas/examples/', 'features/<id>/feature.md', 'Entscheidung (Mensch)']
  const teil2 = feature.indexOf('Teil 2 — Feature bauen (danach, Pflicht):')
  for (const fragment of rueckschreibFragmente) {
    const index = feature.findIndex((zeile) => zeile.includes(fragment))
    if (index === -1 || teil2 === -1 || index > teil2) befunde.push(`(a) Rückschreib-Punkt ${JSON.stringify(fragment)} fehlt oder steht nicht vor Teil 2`)
  }
  const ERWARTET_PROJEKT = [
    "Zusätzlich liegt dir ein geprüfter Architekturentwurf (Rolle 'architekt', Schema 'ergebnis-architektur') als Eingabe vor — im Projektmodus ist er AUSSCHLIESSLICH Kontext für deine Entscheidungen, KEIN Bauauftrag.",
    'Der Scope des ursprünglichen Auftrags (oben im Auftragstext) hat Vorrang vor dem Architekturentwurf: setze NUR um, was der Auftrag tatsächlich verlangt — auch wenn der Entwurf weitere Module, ADRs oder Schemas beschreibt, die über diesen Scope hinausgehen.',
    'Solange der Auftrag nicht ausdrücklich mehr verlangt: kein Produktcode, keine Schemas (schemas/**), keine Skripte (scripts/**), keine Änderung an package.json oder scripts/check-*. Erlaubt sind Dokumentationsänderungen (docs/**, features/**, CLAUDE.md), soweit der Auftrag sie verlangt.',
    "Liegt eine bereits erfasste menschliche Architektur-Entscheidung vor (Eingabe 'entscheidung-@', nicht leer): übernimm sie als Dokumentation (z. B. ADR unter docs/adr/), nicht als Freibrief für weitergehende Umsetzung.",
    'Widerspricht dein Umsetzungsvorschlag diesem Scope, dokumentiere die Abweichung ausdrücklich statt sie stillschweigend umzusetzen (CLAUDE.md, Entscheidungsregel 5).',
  ].join('\n')
  if (baueUmsetzungsInstruktion('projekt').join('\n') !== ERWARTET_PROJEKT) befunde.push('(a) Projekt-Instruktion weicht vom festen Erwartungstext ab (muss bitgenau unverändert bleiben)')
  if (baueUmsetzungsInstruktion('projekt').join('\n').includes(BAU_SATZ)) befunde.push('(a) Projekt-Instruktion trägt den Bau-Satz (Rotfall-Kalibrierung verletzt)')
  if (befunde.length === vor) console.log('✓ (a) Feature-Instruktion verlangt den Bau (Tests je AK, eigener Prüflauf, Werkzeugwahl, ARCHITECTURE.md) nach den vier Rückschreib-Punkten; Projekt-Instruktion bitgenau unverändert (F-752).')
}

// ─── (b)+(f) F-753 + cwd: realer 'ausfuehrung'-Schrittstart im Feature-Modus ─────────────────
{
  const vor = befunde.length
  const gruen = await starteSchritt('(b) mit Stack-Entscheidung', { rolle: 'ausfuehrung', stackEntscheidungErfasst: true })
  const rot = await starteSchritt('(b) ohne Stack-Antwort', { rolle: 'ausfuehrung', stackEntscheidungErfasst: false })
  const iteration2 = await starteSchritt('(b) Iteration n+1', { rolle: 'ausfuehrung', stackEntscheidungErfasst: true, anpassungAngefordert: true })
  if (gruen !== null && rot !== null && iteration2 !== null) {
    if (typeof gruen.auftragstext !== 'string' || !gruen.auftragstext.includes(STACK_INSTRUKTION_FRAGMENT)) {
      befunde.push(`(b) Feature-Modus mit erfasster Stack-Entscheidung: Stack-Instruktion fehlt im Auftragstext (Ende: ${JSON.stringify(gruen.auftragstext?.slice(-300))})`)
    }
    if (typeof gruen.auftragstext !== 'string' || !gruen.auftragstext.includes(BAU_SATZ)) befunde.push('(b) Feature-Modus: Auftragstext der Ausführung trägt die Baupflicht (F-752) nicht')
    if (typeof rot.auftragstext !== 'string' || rot.auftragstext.includes(STACK_INSTRUKTION_FRAGMENT)) befunde.push('(b) Feature-Modus OHNE erfasste Antwort: Stack-Instruktion darf nicht angehängt sein')
    // Iteration n+1 (so läuft Iteration 2 des F35-Workflows): Baupflicht, Stack-Instruktion, Prüfhinweis und Korrekturauftrag stehen gemeinsam und in fester Reihenfolge im Text.
    const text2 = iteration2.auftragstext ?? ''
    const reihenfolge = [BAU_SATZ, STACK_INSTRUKTION_FRAGMENT, 'Kannst du sie mit deinen Werkzeugen selbst ausführen, tu es trotzdem', "'- [x] Blockiert'", 'VORRANGIGER AUFTRAG dieser Iteration', 'GATE-ABNAHME-BEGRUENDUNG'].map((fragment) => [fragment, text2.indexOf(fragment)])
    const fehlend = reihenfolge.filter(([, index]) => index === -1).map(([fragment]) => fragment)
    if (fehlend.length > 0) befunde.push(`(b) Iteration n+1: Fragmente fehlen ${JSON.stringify(fehlend)}`)
    else if (reihenfolge.some(([, index], i) => i > 0 && index < reihenfolge[i - 1][1])) befunde.push(`(b) Iteration n+1: Reihenfolge Baupflicht → Stack → Prüfhinweis → Blockade-Hinweis → Korrekturauftrag verletzt`)
    if (befunde.length === vor) console.log('✓ (b) Realer Schrittstart im Feature-Modus: Stack-Instruktion genau dann angehängt, wenn Stack-Entscheidung UND menschliche Antwort vorliegen (F-753); Iteration n+1 trägt Baupflicht, Stack-Instruktion, Prüfhinweis und Korrekturauftrag in fester Reihenfolge.')
  }

  // (f) eigener Kalibrierungslauf: ohne cwd-Option erreicht KEIN Projekt-cwd den Worker — die Grün-Prüfung ist also nicht trivial wahr.
  const ohneCwd = await starteSchritt('(f) ohne cwd-Option', { rolle: 'ausfuehrung', stackEntscheidungErfasst: true, cwdAusRegister: false })
  if (gruen !== null && ohneCwd !== null) {
    const vorF = befunde.length
    if (gruen.erwartetesCwd !== gruen.repoWurzel) befunde.push(`(f) loeseProjektPfade.cwd ('${gruen.erwartetesCwd}') ist nicht die Projekt-repoWurzel ('${gruen.repoWurzel}')`)
    if (gruen.laufOptionen?.cwd !== gruen.repoWurzel) befunde.push(`(f) 'ausfuehrung'-Start: laufOptionen.cwd erwartet '${gruen.repoWurzel}', erhalten '${gruen.laufOptionen?.cwd}'`)
    if (ohneCwd.laufOptionen?.cwd !== undefined) befunde.push(`(f) Rotfall-Kalibrierung: ohne cwd-Option sollte laufOptionen.cwd undefined sein, erhalten '${ohneCwd.laufOptionen?.cwd}'`)
    if (befunde.length === vorF) console.log('✓ (f) Realer \'ausfuehrung\'-Start reicht cwd = Projekt-repoWurzel (loeseProjektPfade) an fuehreAufgabeDurchFn durch; ohne cwd-Option nicht (Kalibrierung).')
  }
}

// ─── (c) F-750: Architekt-Auftragstext mit entschiedenen ADRs ─────────────────────────────────
{
  const vor = befunde.length
  const gruen = await starteSchritt('(c) Entschieden', { rolle: 'architekt', adrDateien: { 'TEMPLATE.md': TEMPLATE_TEXT, '0003-stack.md': adrText('Entschieden') } })
  const vorgeschlagen = await starteSchritt('(c) Vorgeschlagen', { rolle: 'architekt', adrDateien: { 'TEMPLATE.md': TEMPLATE_TEXT, '0003-stack.md': adrText('Vorgeschlagen') } })
  const nurTemplate = await starteSchritt('(c) nur TEMPLATE', { rolle: 'architekt', adrDateien: { 'TEMPLATE.md': TEMPLATE_TEXT } })
  const ohneOrdner = await starteSchritt('(c) ohne docs/adr', { rolle: 'architekt' })
  if (gruen !== null) {
    const text = gruen.auftragstext ?? ''
    for (const fragment of [ADR_UEBERSCHRIFT, 'Entschiedene ADRs nicht neu verhandeln', "kategorie 'sonstig'", '# ADR-0003', 'GATE-ADR-ENTSCHEIDUNG', ADR_STACK_HINWEIS_FRAGMENT]) {
      if (!text.includes(fragment)) befunde.push(`(c) Architekt mit ADR 'Status: Entschieden' (Stack laut CLAUDE.md offen): Fragment ${JSON.stringify(fragment)} fehlt`)
    }
    if (text.includes('GATE-NICHT-IM-BLOCK') || text.includes('GATE-TEMPLATE')) befunde.push("(c) Block enthält '## Entscheidung (Mensch)' oder TEMPLATE.md")
    if (text.indexOf(ADR_UEBERSCHRIFT) > text.indexOf('Planungsauftrag:')) befunde.push('(c) ADR-Block steht nicht vor dem Planungsauftrag')
  }
  for (const [bezeichnung, lauf] of [
    ['Vorgeschlagen', vorgeschlagen],
    ['nur TEMPLATE.md', nurTemplate],
    ['ohne docs/adr', ohneOrdner],
  ]) {
    if (lauf !== null && (typeof lauf.auftragstext !== 'string' || lauf.auftragstext.includes(ADR_UEBERSCHRIFT) || lauf.auftragstext.includes(ADR_STACK_HINWEIS_FRAGMENT))) {
      befunde.push(`(c) Architekt ${bezeichnung}: kein ADR-Block/-Hinweis erwartet, Auftragstext ${lauf.auftragstext === null ? 'fehlt' : 'trägt ihn'}`)
    }
  }
  // Unit-Randfälle.
  const unitRepo = mkdtempSync(join(tmpdir(), 'fixpaket-f35-adr-unit-'))
  try {
    if (leseEntschiedeneAdrs(unitRepo) !== '') befunde.push('(c) leseEntschiedeneAdrs ohne docs/adr: erwartet leeren Text')
    mkdirSync(join(unitRepo, 'docs', 'adr'), { recursive: true })
    writeFileSync(join(unitRepo, 'docs', 'adr', 'a-fett.md'), '# ADR A\n\n**Datum:** 2026-01-01\n**Status:** entschieden\n\n## Entscheidung\nFETT-OK\n')
    writeFileSync(join(unitRepo, 'docs', 'adr', 'b-lang.md'), `# ADR B\n\nStatus: Entschieden\n\n## Entscheidung\n${'x'.repeat(2000)}\n`)
    writeFileSync(join(unitRepo, 'docs', 'adr', 'c-zitat.md'), '# ADR C\n\nStatus: Vorschlag\n\n## Kontext\nStatus: Entschieden (nur zitiert)\n\n## Entscheidung\nZITAT-NICHT\n')
    writeFileSync(join(unitRepo, 'docs', 'adr', 'd-crlf.md'), '# ADR D\r\n\r\nStatus: Entschieden\r\n\r\n## Entscheidung\r\nCRLF-OK\r\n')
    writeFileSync(join(unitRepo, 'docs', 'adr', 'e-wertfett.md'), '# ADR E\n\nStatus: **Entschieden**\n\n## Entscheidung\nWERTFETT-OK\n')
    writeFileSync(join(unitRepo, 'docs', 'adr', 'f-ersetzt.md'), '# ADR F\n\nStatus: Ersetzt durch ADR-0009\n\n## Entscheidung\nERSETZT-NICHT\n')
    writeFileSync(join(unitRepo, 'docs', 'adr', 'g-verworfen.md'), '# ADR G\n\nStatus: Verworfen\n\n## Entscheidung\nVERWORFEN-NICHT\n')
    const block = leseEntschiedeneAdrs(unitRepo)
    if (!block.includes('FETT-OK')) befunde.push("(c) '**Status:** entschieden' (fett, klein) sollte zählen")
    if (!block.includes('WERTFETT-OK')) befunde.push("(c) 'Status: **Entschieden**' (fetter Wert) sollte zählen")
    if (block.includes('ERSETZT-NICHT') || block.includes('VERWORFEN-NICHT')) befunde.push("(c) 'Ersetzt durch …' und 'Verworfen' dürfen nicht zählen")
    if (block.indexOf('# ADR A') > block.indexOf('# ADR B')) befunde.push('(c) mehrere ADRs: Reihenfolge nicht alphabetisch nach Dateiname')
    if (!block.includes('CRLF-OK')) befunde.push('(c) CRLF-ADR sollte gelesen werden')
    if (block.includes('ZITAT-NICHT')) befunde.push('(c) Status-Zeile im Fließtext (nach der ersten ##-Überschrift) darf nicht zählen')
    if (!block.includes('… [gekürzt]') || block.includes('x'.repeat(1501))) befunde.push('(c) Entscheidung > 1500 Zeichen muss sichtbar gekürzt werden')
    if (baueArchitektAuftragstext('P') !== baueArchitektAuftragstext('P', 'feature', null, false, '')) befunde.push("(c) baueArchitektAuftragstext mit leerem ADR-Block muss bitgenau dem Default entsprechen")
  } finally {
    raeumeVerzeichnis(unitRepo)
  }
  if (befunde.length === vor) console.log("✓ (c) Architekt: realer Schrittstart trägt den bindenden ADR-Block (plus Stack-Hinweis bei offenem Stack) nur bei 'Status: Entschieden'; Vorgeschlagen/TEMPLATE/kein Ordner ohne Block und ohne Wurf; Randfälle (Fettung, CRLF, Kürzung, Zitat) korrekt (F-750).")
}

// ─── (d) F-750: Advisor-Auftragstext mit entschiedenen ADRs ───────────────────────────────────
{
  const vor = befunde.length
  const gruen = await starteSchritt('(d) Entschieden', { rolle: 'architecture-advisor', adrDateien: { '0003-stack.md': adrText('Entschieden') } })
  const rot = await starteSchritt('(d) Vorgeschlagen', { rolle: 'architecture-advisor', adrDateien: { '0003-stack.md': adrText('Vorgeschlagen') } })
  if (gruen !== null) {
    const text = gruen.auftragstext ?? ''
    for (const fragment of ["Rolle 'architecture-advisor'", ADR_UEBERSCHRIFT, 'Entschiedene ADRs nicht neu verhandeln', 'GATE-ADR-ENTSCHEIDUNG']) {
      if (!text.includes(fragment)) befunde.push(`(d) Advisor mit ADR 'Status: Entschieden': Fragment ${JSON.stringify(fragment)} fehlt`)
    }
  }
  if (rot !== null && (typeof rot.auftragstext !== 'string' || rot.auftragstext.includes(ADR_UEBERSCHRIFT))) befunde.push("(d) Advisor mit 'Status: Vorgeschlagen': kein ADR-Block erwartet")
  if (baueArchitectureAdvisorAuftragstext('P') !== baueArchitectureAdvisorAuftragstext('P', '')) befunde.push('(d) Advisor-Text mit leerem Block muss bitgenau dem Default entsprechen')
  if (befunde.length === vor) console.log("✓ (d) Advisor: realer Schrittstart trägt den bindenden ADR-Block bei 'Status: Entschieden', nicht bei 'Vorgeschlagen' (F-750).")
}

// ─── (e) F-754: Validator und Aufrufbau ────────────────────────────────────────────────────────
{
  const vor = befunde.length
  const basis = JSON.parse(readFileSync('startvorlagen/ai-workforce.json', 'utf8'))
  const mitSchreibend = (erlaubte) => ({ ...basis, werkzeugsaetze: { ...basis.werkzeugsaetze, schreibend: { art: 'schreibend', modus: 'DEKLARIERT', erlaubte_werkzeuge: erlaubte } } })
  const rotFaelle = [
    ['Bash', /nacktes 'Bash'/],
    ['Bash(git status:*)', /git über Bash/],
    ['Bash(*)', /Bash-Wildcard/],
    ['Bash(:*)', /Bash-Wildcard/],
    ['Bash(npm:*)', /nicht in der festen Allowlist/],
    ['PowerShell', /Shell-Werkzeug/],
    // F-756: die alten, breiteren Regeln sind jetzt Verstöße.
    ['Bash(npm install:*)', /nicht in der festen Allowlist/],
    ['Bash(npm ci:*)', /nicht in der festen Allowlist/],
    ['Bash(npx tsc:*)', /nicht in der festen Allowlist/],
    ['Bash(npm run check:*) && git', /zulässige Form/],
  ]
  for (const [eintrag, muster] of rotFaelle) {
    const verstoesse = validiereStartvorlageDaten(mitSchreibend(['Read', 'Write', eintrag]))
    if (!verstoesse.some((v) => muster.test(v))) befunde.push(`(e) Validator: '${eintrag}' sollte abgewiesen werden (${muster}), erhalten ${JSON.stringify(verstoesse)}`)
  }
  // F-756 (Stefan, 28.09.2026): npm install/npm ci exakt ohne ':*', npx tsc gestrichen.
  const allowlist = ['Bash(npm install)', 'Bash(npm ci)', 'Bash(npm run check:*)', 'Bash(npm run lint:*)', 'Bash(npm run typecheck:*)', 'Bash(npm run test:*)', 'Bash(npm run build:*)']
  if (JSON.stringify(ERLAUBTE_BASH_REGELN) !== JSON.stringify(allowlist)) befunde.push(`(e) ERLAUBTE_BASH_REGELN weicht von E-F754 ab: ${JSON.stringify(ERLAUBTE_BASH_REGELN)}`)
  const gruenVerstoesse = validiereStartvorlageDaten(mitSchreibend(['Read', 'Grep', 'Glob', 'Write', 'Edit', ...allowlist]))
  if (gruenVerstoesse.length > 0) befunde.push(`(e) Validator: die Allowlist E-F754 sollte gültig sein, erhalten ${JSON.stringify(gruenVerstoesse)}`)
  // Review-Befund: Bash-Regeln nur in art 'schreibend' — ein lesender Satz (Review/Advisor) darf keine tragen.
  const lesendMitBash = validiereStartvorlageDaten({ ...basis, werkzeugsaetze: { ...basis.werkzeugsaetze, lesend: { art: 'lesend', modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read', 'Bash(npm run check:*)'] } } })
  if (!lesendMitBash.some((v) => /nur in einem Werkzeugsatz mit art 'schreibend'/.test(v))) befunde.push(`(e) Validator: Bash-Regel im lesenden Satz sollte abgewiesen werden, erhalten ${JSON.stringify(lesendMitBash)}`)
  // Regression: eine Projektkopie der alten Vorlage (schreibend ohne Bash) bleibt gültig.
  const alteKopie = validiereStartvorlageDaten(mitSchreibend(['Read', 'Grep', 'Glob', 'Write', 'Edit']))
  if (alteKopie.length > 0) befunde.push(`(e) Validator: alte Vorlage ohne Bash muss gültig bleiben, erhalten ${JSON.stringify(alteKopie)}`)
  let echteVorlage = null
  try {
    echteVorlage = ladeStartvorlage('startvorlagen/ai-workforce.json')
  } catch (fehler) {
    befunde.push(`(e) startvorlagen/ai-workforce.json validiert nicht: ${fehler.message}`)
  }
  if (echteVorlage !== null && JSON.stringify(echteVorlage.werkzeugsaetze.schreibend.erlaubte_werkzeuge.filter((e) => e.startsWith('Bash('))) !== JSON.stringify(allowlist)) {
    befunde.push('(e) startvorlagen/ai-workforce.json: schreibend trägt nicht genau die Allowlist E-F754')
  }

  // Aufrufbau: Werkzeugnamen in --tools, Regeln in --allowedTools, git-Sperre nur bei Bash-Regeln.
  const wert = (tokens, flag) => (tokens.includes(flag) ? tokens[tokens.indexOf(flag) + 1] : undefined)
  const schreibend = baueAufruf({ modell: 'm', prompt: 'p', werkzeugsatz: { modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read', 'Write', ...allowlist] } })
  if (wert(schreibend, '--tools') !== 'Read,Write,Bash') befunde.push(`(e) baueAufruf: --tools erwartet 'Read,Write,Bash', erhalten '${wert(schreibend, '--tools')}'`)
  if (wert(schreibend, '--allowedTools') !== ['Read', 'Write', ...allowlist].join(',')) befunde.push('(e) baueAufruf: --allowedTools muss die vollen Regeln tragen')
  if (wert(schreibend, '--disallowedTools') !== 'Bash(git:*)') befunde.push(`(e) baueAufruf: --disallowedTools 'Bash(git:*)' erwartet, erhalten '${wert(schreibend, '--disallowedTools')}'`)
  const lesend = baueAufruf({ modell: 'm', prompt: 'p', werkzeugsatz: { modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read', 'Grep', 'Glob'] } })
  const lesendErwartet = ['--model', 'm', '--output-format', 'stream-json', '--verbose', '--setting-sources', 'project', '--tools', 'Read,Grep,Glob', '--allowedTools', 'Read,Grep,Glob', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '-p', 'p']
  if (JSON.stringify(lesend) !== JSON.stringify(lesendErwartet)) befunde.push(`(e) baueAufruf: Satz ohne Bash-Regel muss bitgenau bleiben, erhalten ${JSON.stringify(lesend)}`)
  const jarvis = baueAufruf({ modell: 'm', prompt: 'p', disallowedTools: 'Read(~/.claude/**)', werkzeugsatz: { modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read'] } })
  if (wert(jarvis, '--disallowedTools') !== 'Read(~/.claude/**)') befunde.push('(e) baueAufruf: bestehendes disallowedTools ohne Bash-Regel muss unverändert bleiben')
  const kombiniert = baueAufruf({ modell: 'm', prompt: 'p', disallowedTools: 'Read(~/.claude/**)', werkzeugsatz: { modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read', 'Bash(npm ci)'] } })
  if (wert(kombiniert, '--disallowedTools') !== 'Read(~/.claude/**),Bash(git:*)') befunde.push(`(e) baueAufruf: disallowedTools plus Bash-Regel erwartet 'Read(~/.claude/**),Bash(git:*)', erhalten '${wert(kombiniert, '--disallowedTools')}'`)
  if (befunde.length === vor) console.log("✓ (e) Validator weist nacktes Bash, git, Wildcards, Nicht-Allowlist-Regeln, PowerShell und Fehlformen ab; Allowlist E-F754 und startvorlagen/ai-workforce.json gültig; baueAufruf trennt --tools/--allowedTools und sperrt git nur bei Bash-Regeln (F-754).")
}

// ─── (g) F-760: die Instruktion trägt die aus ERLAUBTE_BASH_REGELN abgeleitete Befehlsliste ────
{
  const vor = befunde.length
  const mitBash = baueUmsetzungsInstruktion('feature', true).join('\n')
  const ohneBash = baueUmsetzungsInstruktion('feature', false).join('\n')
  const default_ = baueUmsetzungsInstruktion('feature').join('\n')
  for (const teil of ['npm install', 'npm ci', 'npm run check|lint|typecheck|test|build', "kein 'node -e'", 'macht den Lauf zu VERWEIGERT', 'Commits macht der Mensch']) {
    if (!mitBash.includes(teil)) befunde.push(`(g) Instruktion mit traegtBashRegeln=true: Fragment ${JSON.stringify(teil)} fehlt`)
  }
  if (ohneBash.includes('Shell: Du darfst ausschließlich')) befunde.push('(g) Instruktion mit traegtBashRegeln=false trägt trotzdem den Shell-Absatz')
  if (ohneBash !== default_) befunde.push("(g) baueUmsetzungsInstruktion('feature') ohne zweites Argument muss bitgenau traegtBashRegeln=false entsprechen")
  if (baueUmsetzungsInstruktion('projekt', true).join('\n').includes('Shell: Du darfst ausschließlich')) {
    befunde.push('(g) Modus projekt darf den Shell-Absatz nie tragen, auch nicht mit traegtBashRegeln=true')
  }
  if (befunde.length === vor) {
    console.log("✓ (g) baueUmsetzungsInstruktion('feature', true) trägt die aus ERLAUBTE_BASH_REGELN abgeleitete Befehlsliste; false/Default/Modus 'projekt' bleiben bitgenau ohne den Shell-Absatz (F-760).")
  }
}

// ─── (h) F-760: VERWEIGERT ohne Bypass-Verdacht registriert Artefakte, hält mit eigenem Grund ──
{
  const vor = befunde.length
  const denials = [
    { tool_name: 'Bash', tool_input: { command: 'git status' } },
    { tool_name: 'Bash', tool_input: { command: 'node -e 0' } },
  ]
  const lauf = await starteSchritt('(h) VERWEIGERT ohne Bypass-Verdacht', { rolle: 'ausfuehrung', stackEntscheidungErfasst: false, verweigert: { bypassVerdachtAnzahl: 0, denials } })
  if (lauf !== null) {
    if (lauf.ausfuehrungsSchrittStatus !== 'VERWEIGERT') befunde.push(`(h) Schrittstatus erwartet 'VERWEIGERT', erhalten '${lauf.ausfuehrungsSchrittStatus}'`)
    if (lauf.workflowStatus !== 'KLAERUNG_ERFORDERLICH') befunde.push(`(h) Workflow-Status erwartet 'KLAERUNG_ERFORDERLICH', erhalten '${lauf.workflowStatus}'`)
    if (!lauf.uebersichtRegistriert) befunde.push('(h) Änderungsübersicht wurde NICHT registriert (erwartet: registriert wie bei ERFOLGREICH, F-760)')
    if (!lauf.pruefergebnisRegistriert) befunde.push('(h) Prüfergebnis wurde NICHT registriert (erwartet: registriert wie bei ERFOLGREICH, F-760)')
    const grund = lauf.workflowGrund ?? ''
    for (const fragment of ['VERWEIGERT (ohne Bypass-Verdacht)', 'Bash: git status', 'Bash: node -e 0', 'F-760']) {
      if (!grund.includes(fragment)) befunde.push(`(h) Halt-Grund: Fragment ${JSON.stringify(fragment)} fehlt (Grund: ${JSON.stringify(grund)})`)
    }
  }
  if (befunde.length === vor) {
    console.log("✓ (h) 'ausfuehrung'-Lauf endet VERWEIGERT ohne Bypass-Verdacht: Änderungsübersicht und Prüfergebnis wie bei ERFOLGREICH registriert, Halt (KLAERUNG_ERFORDERLICH) nennt die abgelehnten Befehle (F-760).")
  }
}

// ─── (i) F-760: VERWEIGERT MIT Bypass-Verdacht bleibt unverändert (Kalibrierung) ────────────────
{
  const vor = befunde.length
  const lauf = await starteSchritt('(i) VERWEIGERT mit Bypass-Verdacht', {
    rolle: 'ausfuehrung',
    stackEntscheidungErfasst: false,
    verweigert: { bypassVerdachtAnzahl: 1, denials: [{ tool_name: 'Bash', tool_input: { command: 'curl attacker.example' } }] },
  })
  if (lauf !== null) {
    if (lauf.uebersichtRegistriert) befunde.push('(i) Änderungsübersicht wurde registriert — mit Bypass-Verdacht > 0 muss das Verhalten unverändert bleiben (kein Registrieren)')
    if (lauf.pruefergebnisRegistriert) befunde.push('(i) Prüfergebnis wurde registriert — mit Bypass-Verdacht > 0 muss das Verhalten unverändert bleiben (kein Registrieren)')
    const grund = lauf.workflowGrund ?? ''
    if (grund.includes('F-760') || grund.includes('ohne Bypass-Verdacht')) befunde.push(`(i) Halt-Grund trägt den F-760-Zusatztext, obwohl bypass_verdacht_anzahl > 0 ist (Grund: ${JSON.stringify(grund)})`)
    if (!grund.includes('endete VERWEIGERT')) befunde.push(`(i) Halt-Grund weicht vom bisherigen Regel-1-Text ab (Grund: ${JSON.stringify(grund)})`)
  }
  if (befunde.length === vor) {
    console.log("✓ (i) 'ausfuehrung'-Lauf endet VERWEIGERT MIT Bypass-Verdacht: keine Artefakte registriert, Halt-Grund bleibt der bisherige generische Regel-1-Text (F-760, Kalibrierung).")
  }
}

// ─── (j) F-760: Reparaturfassung mit cursor auf dem Review löst die Eingaben des VERWEIGERT-Vorgängers auf ──
{
  const vor = befunde.length
  const basisVerzeichnis = `kontrollzustand-test-fixpaket-f35-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const repoWurzel = baueFremdprojekt()
  const { pfad: startvorlagePfad, verzeichnis } = schreibeStartvorlage()
  const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage(startvorlagePfad))
  const ladeOptionen = { basisVerzeichnis, schreiber: STILL }

  let aufrufAnzahl = 0
  let zweiteAnfragen = null
  const fuehreAufgabeDurchFn = async (laufId, _profilReferenz, eingaben) => {
    aufrufAnzahl++
    if (aufrufAnzahl === 1) {
      // schritt-1-ausfuehrung: VERWEIGERT ohne Bypass-Verdacht, echte Laufakte im Rohstrom.
      const rohstromPfad = join(basisVerzeichnis, `${laufId}-rohstrom.json`)
      writeFileSync(
        rohstromPfad,
        JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: 'GATE-VERWEIGERT-ERGEBNISTEXT', permission_denials: [{ tool_name: 'Bash', tool_input: { command: 'git status' } }] }) })
      )
      registriereKernArtefakt(
        `laufakte-${laufId}`,
        profilReferenz,
        { erzeuger: 'kern', schritt: 'gate-fixture' },
        { laufakte_schema: 'v0', lauf_id: laufId, worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad } },
        [],
        ladeOptionen
      )
      return { ok: true, klassifikation: { ergebnis: 'VERWEIGERT', bypass_verdacht_anzahl: 0 }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'VERWEIGERT' } }
    }
    // schritt-2-review (Reparaturfassung): die real aufgelösten Eingaben festhalten.
    zweiteAnfragen = eingaben.anfragen
    return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  }

  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, fuehreAufgabeDurchFn, repoWurzel, installWurzel: INSTALL_WURZEL, startvorlagePfad }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const basisUrl = `http://127.0.0.1:${server.address().port}`
  try {
    const auftragAntwort = await fetch(`${basisUrl}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: 'F35-Fixpaket-Gate (j)', auftragstext: 'GATE-PLANUNGSTEXT-F35-FIX-J' }) })
    const { auftragId } = await auftragAntwort.json().catch(() => ({}))
    if (auftragAntwort.status !== 201 || typeof auftragId !== 'string') {
      befunde.push(`(j): Vorbedingung POST /api/auftraege erwartet 201, erhalten ${auftragAntwort.status}`)
    } else {
      const workflowId = `fixpaket-f35-gate-j-${randomUUID()}`
      const schritte = [
        {
          schritt_id: 'schritt-1-ausfuehrung',
          rolle: 'ausfuehrung',
          werkzeugsatz: 'schreibend',
          worker: 'claude-code',
          modell: 'claude-sonnet-5',
          eingaben: [],
          output_schema: null,
          freigabe: 'ZWINGEND',
          freigabe_erteilt: true,
          risiko: 'Gate-Fixture.',
          zeitgrenze_ms: 600000,
          nachfolger: 'schritt-2-review',
          status: 'OFFEN',
          lauf_id: null,
        },
        {
          schritt_id: 'schritt-2-review',
          rolle: 'architecture-advisor',
          werkzeugsatz: 'lesend',
          worker: 'claude-code',
          modell: 'claude-sonnet-5',
          eingaben: ['artefakt:aenderungsuebersicht-@schritt-1-ausfuehrung', 'artefakt:pruefergebnis-@schritt-1-ausfuehrung'],
          output_schema: null,
          freigabe: 'AUTOMATISCH',
          risiko: 'Gate-Fixture.',
          zeitgrenze_ms: 600000,
          nachfolger: null,
          status: 'OFFEN',
          lauf_id: null,
        },
      ]
      registriereWorkflow(
        {
          workflow_schema: 'v0',
          workflow_id: workflowId,
          auftrag_id: auftragId,
          version: 1,
          ziel: 'F35-Fixpaket-Gate-Fixture (j).',
          status: 'OFFEN',
          aktiver_schritt_id: 'schritt-1-ausfuehrung',
          grund: null,
          grenzen: { max_schritte: 4, max_replans: 1 },
          schritte,
        },
        profilReferenz,
        ladeOptionen
      )
      const start1 = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
      if (start1.status !== 202) {
        befunde.push(`(j): erster POST .../starten erwartet 202, erhalten ${start1.status} (${await start1.text()})`)
      } else {
        const startzeit1 = Date.now()
        while (Date.now() - startzeit1 < 5000) {
          const status = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)?.daten?.status
          if (status !== 'LAEUFT' && status !== 'OFFEN') break
          await verzoegerung(50)
        }
        const nachVerweigert = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)?.daten
        const schritt1NachVerweigert = nachVerweigert?.schritte.find((s) => s.schritt_id === 'schritt-1-ausfuehrung')
        if (nachVerweigert?.status !== 'KLAERUNG_ERFORDERLICH' || schritt1NachVerweigert?.status !== 'VERWEIGERT' || schritt1NachVerweigert?.lauf_id == null) {
          befunde.push(
            `(j): Vorbedingung — schritt-1 sollte VERWEIGERT mit lauf_id enden, Workflow KLAERUNG_ERFORDERLICH, erhalten ${JSON.stringify({ workflowStatus: nachVerweigert?.status, schritt1: schritt1NachVerweigert })}`
          )
        } else {
          // Reparaturfassung (Regel-1j-Muster, CLAUDE.md): cursor auf den Review-Folgeschritt,
          // schritt-1 behält status VERWEIGERT und lauf_id unverändert.
          registriereWorkflow({ ...nachVerweigert, version: 2, status: 'OFFEN', aktiver_schritt_id: 'schritt-2-review', grund: null }, profilReferenz, ladeOptionen)
          const start2 = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
          if (start2.status !== 202) {
            befunde.push(`(j): zweiter POST .../starten (Reparaturfassung) erwartet 202, erhalten ${start2.status} (${await start2.text()})`)
          } else {
            const startzeit2 = Date.now()
            while (Date.now() - startzeit2 < 5000) {
              const status = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)?.daten?.status
              if (status !== 'LAEUFT' && status !== 'OFFEN') break
              await verzoegerung(50)
            }
            const laufId1 = schritt1NachVerweigert.lauf_id
            const pfade = (zweiteAnfragen ?? []).map((a) => a.pfad)
            if (!pfade.includes(`artefakt:aenderungsuebersicht-${laufId1}`)) befunde.push(`(j): Review-Schritt bekam 'aenderungsuebersicht-@schritt-1-ausfuehrung' nicht aufgelöst (Anfragen: ${JSON.stringify(pfade)})`)
            if (!pfade.includes(`artefakt:pruefergebnis-${laufId1}`)) befunde.push(`(j): Review-Schritt bekam 'pruefergebnis-@schritt-1-ausfuehrung' nicht aufgelöst (Anfragen: ${JSON.stringify(pfade)})`)
          }
        }
      }
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
    raeumeVerzeichnis(repoWurzel)
    raeumeVerzeichnis(verzeichnis)
  }
  if (befunde.length === vor) {
    console.log("✓ (j) Reparaturfassung (cursor auf den Review-Folgeschritt, schritt-1 behält status VERWEIGERT/lauf_id) löst 'aenderungsuebersicht-@'/'pruefergebnis-@' des VERWEIGERT-Vorgängers auf (F-760).")
  }
}

// ─── (k) F-760 (QA-Befund): 'ausfuehrung' OHNE architekt-Vorschritt (fast-lane.json-Muster) bekommt die Allowlist trotzdem ──
{
  const vor = befunde.length
  const lauf = await starteSchritt('(k) ausfuehrung ohne architekt-Vorschritt', { rolle: 'ausfuehrung', ohneArchitekt: true })
  if (lauf !== null) {
    if (typeof lauf.auftragstext !== 'string' || !lauf.auftragstext.includes('Shell: Du darfst ausschließlich diese Befehle ausführen')) {
      befunde.push(`(k) 'ausfuehrung' ohne architekt-Vorschritt: Shell-Allowlist-Satz fehlt im Auftragstext (Ende: ${JSON.stringify(lauf.auftragstext?.slice(-300))})`)
    }
    if (typeof lauf.auftragstext === 'string' && !lauf.auftragstext.includes('npm run check|lint|typecheck|test|build')) {
      befunde.push(`(k) 'ausfuehrung' ohne architekt-Vorschritt: abgeleitete Befehlsliste fehlt im Auftragstext`)
    }
  }
  if (befunde.length === vor) {
    console.log("✓ (k) Ein 'ausfuehrung'-Schritt ohne architekt-Vorschritt (workflow-vorlagen/standard.json, fast-lane.json) bekommt die Bash-Allowlist trotzdem genannt — nicht nur im hoch-Pfad (F-760, QA-Befund).")
  }
}

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e):`)
  for (const befund of befunde) console.error(`  - ${befund}`)
  process.exit(1)
}
console.log('\n✓ Fixpaket-F35-Reallauf-Check sauber.')
