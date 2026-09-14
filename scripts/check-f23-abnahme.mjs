#!/usr/bin/env node
/**
 * Datei: scripts/check-f23-abnahme.mjs
 *
 * Zweck: Abnahme-Gate (F23 WS-0, features/F23/feature.md). Deckt bisher nur
 * den WS-0-Teil ab — die Änderungsübersicht als Kernartefakt:
 *
 * (0) Schema-Beispiele gegen validiereAenderungsuebersichtDaten (Muster
 *     check-f22-click-to-work.mjs).
 * (a) Rot-Fall: eine neu angelegte, nicht getrackte Datei fehlt in
 *     'git diff' vollständig (AK2) — dieser Rot-Fall belegt, dass
 *     erzeugeAenderungsuebersichtDaten sie trotzdem über
 *     'git status --porcelain' findet. Real gegen ein Wegwerf-Git-Repo
 *     (Muster src/authorization-boundary/authorization-boundary.test.ts),
 *     nicht angenommen.
 * (b) Rot-Fall: eine Workflow-Schritt-Eingabe
 *     'artefakt:aenderungsuebersicht-@<schrittId>' mit unbekannter
 *     schritt_id, mit einer bekannten schritt_id ohne lauf_id (Schritt noch
 *     nicht gestartet) ODER mit einer Selbstreferenz lehnt den
 *     Schritt-Start ab, statt mit einer stillschweigend leeren/veralteten
 *     Eingabe zu laufen (Bauauftrag Punkt 5, Reviewer-Pass 14.09.2026).
 *     Direkt gegen loeseSchrittEingabenAuf, kein HTTP-Server nötig.
 * (c)/(d) QA-Pass 14.09.2026, Befund 1: AK1/AK4 real über den echten
 *     Dispatchpfad (POST /api/laeufe -> starteLaufUndVergiss) belegt, nicht
 *     nur über direkte Funktionsaufrufe — ein 'schreibend'-Lauf, der real
 *     ERFOLGREICH/ABGESCHLOSSEN endet, bekommt eine Übersicht, ein
 *     'lesend'-Lauf keine. fuehreAufgabeDurchFn ist gestubbt (Muster
 *     check-f22-click-to-work.mjs Rot-Fall (b)) — der Punkt ist die
 *     Verdrahtung um F8 herum, nicht F8 selbst.
 *
 * Wird aufgerufen von: `npm run check`.
 *
 * Aufruf: node scripts/check-f23-abnahme.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { createServer } from 'node:http'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { erzeugeAenderungsuebersichtDaten, validiereAenderungsuebersichtDaten } from '../src/aenderungsuebersicht/index.ts'
import { ladeArtefaktVersion } from '../src/lineage-registry/index.ts'
import { ladeStartvorlage } from '../src/startvorlage/index.ts'
import { erzeugeRequestHandler, loeseSchrittEingabenAuf } from './leitstand-server.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []

console.log('\n=== F23-Abnahme-Check (WS-0) ===\n')

// ─── (0) Schema-Beispiele gegen validiereAenderungsuebersichtDaten ──────────
{
  const befundeVor = befunde.length
  const schemaPfad = 'schemas/kontrollzustand-aenderungsuebersicht-payload.schema.json'
  if (!existsSync(schemaPfad)) {
    befunde.push(`${schemaPfad}: Datei fehlt`)
  } else {
    try {
      JSON.parse(readFileSync(schemaPfad, 'utf-8'))
    } catch (fehler) {
      befunde.push(`${schemaPfad}: kein gültiges JSON (${fehler.message})`)
    }
  }

  const beispiele = [
    { pfad: 'schemas/examples/kontrollzustand-aenderungsuebersicht-payload.valid.json', sollGueltigSein: true },
    { pfad: 'schemas/examples/kontrollzustand-aenderungsuebersicht-payload.invalid-unbekannter-status.json', sollGueltigSein: false },
    { pfad: 'schemas/examples/kontrollzustand-aenderungsuebersicht-payload.invalid-fehlendes-feld.json', sollGueltigSein: false },
    { pfad: 'schemas/examples/kontrollzustand-aenderungsuebersicht-payload.invalid-unbekanntes-feld.json', sollGueltigSein: false },
  ]
  for (const { pfad, sollGueltigSein } of beispiele) {
    if (!existsSync(pfad)) {
      befunde.push(`${pfad}: Datei fehlt`)
      continue
    }
    let obj
    try {
      obj = JSON.parse(readFileSync(pfad, 'utf-8'))
    } catch (fehler) {
      befunde.push(`${pfad}: kein gültiges JSON (${fehler.message})`)
      continue
    }
    const verstoesse = validiereAenderungsuebersichtDaten(obj)
    if (sollGueltigSein && verstoesse.length > 0) {
      befunde.push(`${pfad}: sollte gültig sein, aber verletzt: ${verstoesse.join('; ')}`)
    }
    if (!sollGueltigSein && verstoesse.length === 0) {
      befunde.push(`${pfad}: sollte ungültig sein, aber keine Regelverletzung gefunden`)
    }
  }
  if (befunde.length === befundeVor) {
    console.log('✓ (0) Schema-Beispiele: valid.json erfüllt validiereAenderungsuebersichtDaten, alle drei invalid-*.json verletzen je eine benannte Regel.')
  }
}

function git(repoWurzel, argumente) {
  return execFileSync('git', argumente, { cwd: repoWurzel, encoding: 'utf8' })
}

/** Legt ein Wegwerf-Git-Repo mit einem ersten Commit an (Muster: src/authorization-boundary/authorization-boundary.test.ts). */
function neuesRepo() {
  const repoWurzel = join(tmpdir(), `f23-abnahme-gate-${randomUUID()}`)
  mkdirSync(repoWurzel, { recursive: true })
  git(repoWurzel, ['init', '--quiet'])
  git(repoWurzel, ['config', 'user.email', 'test@example.invalid'])
  git(repoWurzel, ['config', 'user.name', 'Test'])
  writeFileSync(join(repoWurzel, 'bestehend.txt'), 'Zeile 1\n')
  git(repoWurzel, ['add', 'bestehend.txt'])
  git(repoWurzel, ['commit', '--quiet', '-m', 'init'])
  return repoWurzel
}

// ─── (a) Rot-Fall: untracked Datei fehlt in 'git diff', muss über 'git status --porcelain' trotzdem erscheinen ──
{
  const repoWurzel = neuesRepo()
  try {
    writeFileSync(join(repoWurzel, 'neu-und-nie-committet.txt'), 'ganz neue Datei\n')

    // Kontrollmessung: 'git diff' ALLEIN zeigt die untracked Datei tatsächlich nicht (AK2-Prämisse).
    const reinerDiff = git(repoWurzel, ['diff', '--name-status', 'HEAD'])
    if (reinerDiff.includes('neu-und-nie-committet.txt')) {
      befunde.push("(a) Testaufbau ungültig: 'git diff --name-status HEAD' zeigt die untracked Datei bereits selbst — die AK2-Prämisse dieses Rot-Falls gilt hier nicht")
    }

    const daten = erzeugeAenderungsuebersichtDaten('gate-lauf', repoWurzel, 1_000_000)
    const eintrag = daten.dateien.find((d) => d.pfad === 'neu-und-nie-committet.txt')
    if (eintrag === undefined) {
      befunde.push("(a) AK2: eine neu angelegte, nicht getrackte Datei fehlt in der Änderungsübersicht — 'git status --porcelain' wurde nicht (mehr) ausgewertet")
    } else if (eintrag.status !== 'NEU') {
      befunde.push(`(a) AK2: die untracked Datei steht in der Übersicht, aber mit status '${eintrag.status}' statt 'NEU'`)
    } else {
      console.log("✓ (a) AK2: eine untracked Datei, die 'git diff' allein nicht zeigt, erscheint über 'git status --porcelain' korrekt als NEU.")
    }
  } finally {
    raeumeVerzeichnis(repoWurzel)
  }
}

// ─── (b) Rot-Fall: '@<schrittId>'-Platzhalter mit unbekannter schritt_id oder ohne lauf_id lehnt den Start ab ──
{
  const vorlage = ladeStartvorlage('startvorlagen/beispielprojekt.json')
  const repoWurzel = process.cwd()
  const ladeOptionen = { basisVerzeichnis: `kontrollzustand-test-f23-b-${randomUUID()}`, schreiber: () => {} }

  function baueSchritt(eingaben) {
    return {
      schritt_id: 'schritt-referenzierend',
      rolle: 'code-reviewer',
      werkzeugsatz: 'lesend',
      worker: 'claude-code',
      modell: 'claude-sonnet-5',
      eingaben,
      output_schema: null,
      freigabe: 'AUTOMATISCH',
      risiko: 'Gate-Fixture, kein reales Risiko.',
      zeitgrenze_ms: 600000,
      nachfolger: null,
      status: 'OFFEN',
      lauf_id: null,
    }
  }

  // (b1) unbekannte schritt_id
  {
    const schritt = baueSchritt(['artefakt:aenderungsuebersicht-@schritt-existiert-nicht'])
    const workflowDaten = { workflow_id: 'gate-f23-ws0-b1', schritte: [schritt] }
    const ergebnis = loeseSchrittEingabenAuf(schritt, workflowDaten, undefined, 'Gate-Auftragstext.', vorlage, repoWurzel, ladeOptionen)
    if (ergebnis.ok !== false || !ergebnis.grund.includes('keine bekannte schritt_id')) {
      befunde.push(`(b1) unbekannte schritt_id: erwartet ok:false mit Ablehnungsgrund 'keine bekannte schritt_id', erhalten ${JSON.stringify(ergebnis)}`)
    } else {
      console.log('✓ (b1) Platzhalter mit unbekannter schritt_id: Schritt-Start wird abgelehnt, nicht mit leerer Eingabe gestartet.')
    }
  }

  // (b2) bekannte schritt_id, aber lauf_id noch null (Zielschritt noch nicht gestartet)
  {
    const referenzierterSchritt = { ...baueSchritt([]), schritt_id: 'schritt-1', lauf_id: null }
    const schritt = baueSchritt(['artefakt:aenderungsuebersicht-@schritt-1'])
    const workflowDaten = { workflow_id: 'gate-f23-ws0-b2', schritte: [referenzierterSchritt, schritt] }
    const ergebnis = loeseSchrittEingabenAuf(schritt, workflowDaten, undefined, 'Gate-Auftragstext.', vorlage, repoWurzel, ladeOptionen)
    if (ergebnis.ok !== false || !ergebnis.grund.includes('noch keine lauf_id')) {
      befunde.push(`(b2) schritt_id ohne lauf_id: erwartet ok:false mit Ablehnungsgrund 'noch keine lauf_id', erhalten ${JSON.stringify(ergebnis)}`)
    } else {
      console.log('✓ (b2) Platzhalter auf einen noch nicht gestarteten Schritt (lauf_id: null): Schritt-Start wird abgelehnt.')
    }
  }

  // (b3) Selbstreferenz — Reviewer-Pass 14.09.2026: löst bei einem Retry sonst still auf die
  // Übersicht des VORHERIGEN, unabhängigen Versuchs auf, statt abzulehnen.
  {
    const schritt = { ...baueSchritt(['artefakt:aenderungsuebersicht-@schritt-referenzierend']), lauf_id: 'vorheriger-versuch-lauf-1' }
    const workflowDaten = { workflow_id: 'gate-f23-ws0-b3', schritte: [schritt] }
    const ergebnis = loeseSchrittEingabenAuf(schritt, workflowDaten, undefined, 'Gate-Auftragstext.', vorlage, repoWurzel, ladeOptionen)
    if (ergebnis.ok !== false || !ergebnis.grund.includes('verweist auf sich selbst')) {
      befunde.push(`(b3) Selbstreferenz: erwartet ok:false mit Ablehnungsgrund 'verweist auf sich selbst', erhalten ${JSON.stringify(ergebnis)}`)
    } else {
      console.log('✓ (b3) Selbstreferenz eines Schritts auf sich selbst wird abgelehnt, statt auf eine veraltete Übersicht eines Vorlaufs aufzulösen.')
    }
  }
}

/** @param optionen - an erzeugeRequestHandler durchgereicht @returns { basisUrl, schliessen } eines echten HTTP-Testservers (Muster check-f22-click-to-work.mjs) */
async function starteTestserver(optionen) {
  const server = createServer(erzeugeRequestHandler(optionen))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  return {
    basisUrl: `http://127.0.0.1:${port}`,
    schliessen: () => new Promise((resolve) => server.close(resolve)),
  }
}

// ─── (c)/(d) Echter Dispatch: AK1 ('schreibend' + real erfolgreich -> Übersicht liegt vor), AK4 ('lesend' -> keine) ──
//
// QA-Pass 14.09.2026, Befund 1: bisher war nur erzeugeAenderungsuebersichtDaten/
// loeseSchrittEingabenAuf direkt geprüft, nie der reale Weg POST /api/laeufe ->
// starteLaufUndVergiss -> werkzeugsatzArt-Auflösung -> Registrierung. fuehreAufgabeDurchFn ist
// gestubbt (Muster check-f22-click-to-work.mjs Rot-Fall (b)) — F8 selbst ist nicht Gegenstand
// dieses Gates, nur die Verdrahtung DARUM.
for (const { werkzeugsatz, rolle, sollUebersichtHaben } of [
  { werkzeugsatz: 'schreibend', rolle: 'ausfuehrung', sollUebersichtHaben: true },
  { werkzeugsatz: 'lesend', rolle: 'code-reviewer', sollUebersichtHaben: false },
]) {
  const basisVerzeichnis = `kontrollzustand-test-f23-cd-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const fuehreAufgabeDurchFn = async () => ({
    ok: true,
    klassifikation: { ergebnis: 'ERFOLGREICH' },
    laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' },
  })
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
  try {
    const auftragAntwort = await fetch(`${basisUrl}/api/auftraege`, {
      method: 'POST',
      body: JSON.stringify({ titel: `F23-Gate-${werkzeugsatz}`, auftragstext: 'Gate-Auftragstext.' }),
    })
    const { auftragId } = await auftragAntwort.json()
    const laufId = `f23-gate-${werkzeugsatz}-${randomUUID()}`

    const startAntwort = await fetch(`${basisUrl}/api/laeufe`, {
      method: 'POST',
      body: JSON.stringify({
        laufId,
        rolle,
        anfragen: [],
        budget: {},
        aufrufEingaben: { modell: 'claude-sonnet-5' },
        auftragId,
        werkzeugsatz,
      }),
    })
    if (startAntwort.status !== 202) {
      befunde.push(`(c/d) werkzeugsatz '${werkzeugsatz}': Start erwartet 202, erhalten ${startAntwort.status} (${await startAntwort.text()})`)
      continue
    }

    // fuehreAufgabeDurchFn löst sofort auf — der fire-and-forget-.then-Handler in
    // starteLaufUndVergiss läuft synchron (git-Aufrufe eingeschlossen), eine kurze Wartezeit
    // reicht, um den Rest der Microtask-/Event-Queue durchlaufen zu lassen (Muster
    // check-f22-click-to-work.mjs Rot-Fall (b), dortselbe Wartezeit).
    await new Promise((resolve) => setTimeout(resolve, 50))

    const uebersicht = ladeArtefaktVersion(`aenderungsuebersicht-${laufId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
    const vorhanden = uebersicht !== null
    if (vorhanden !== sollUebersichtHaben) {
      befunde.push(
        `(c/d) werkzeugsatz '${werkzeugsatz}': Änderungsübersicht ${sollUebersichtHaben ? 'erwartet, aber fehlt' : 'sollte fehlen, wurde aber registriert'} nach echtem Dispatch`
      )
    } else {
      console.log(
        `✓ (c/d) werkzeugsatz '${werkzeugsatz}': Änderungsübersicht ${sollUebersichtHaben ? 'liegt' : 'liegt korrekt NICHT'} nach echtem POST /api/laeufe-Dispatch vor.`
      )
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
  }
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
