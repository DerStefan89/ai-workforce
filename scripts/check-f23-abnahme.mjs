#!/usr/bin/env node
/**
 * Datei: scripts/check-f23-abnahme.mjs
 *
 * Zweck: Abnahme-Gate (F23, features/F23/feature.md) — WS-0 (Änderungsübersicht),
 * WS-1a (Entscheidungs-Schema), WS-2a (Abnahme-Lesepfad/-Schreibstelle/-View)
 * und WS-2b (ADJUST-Loop):
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
 * (f) [F23 WS-1a] Schema-Beispiele gegen validiereEntscheidungsDaten
 *     (Muster Block (0) in dieser Datei) — sechs valid-*.json (je 'art'
 *     eine) plus sechs invalid-*.json, darunter zwei gezielt für die
 *     planaenderung-Sonderregel (Pflichtfeld abgeschwaechte_freigaben,
 *     additionalProperties:false je Eintrag — QA-Pass 14.09.2026: bis
 *     dahin nur über src/entscheidung/entscheidung.test.ts abgedeckt,
 *     nicht über die Schema-Beispiele) und eine für die neue
 *     abnahme-Sonderregel (Pflichtfeld bezug, F23 WS-2a).
 * (g) [F23 WS-2a] GET/POST /api/workflows/<id>/abnahme: drei Rot-Fälle
 *     (ANGENOMMEN auf nicht abgeschlossenem Workflow, Abnahme ohne
 *     Begründung, Entscheidungsdaten ohne bezug — der vierte, ursprünglich
 *     hier stehende Rot-Fall für ANPASSUNG_ANGEFORDERT (400, "folgt in
 *     WS-2b") ist mit WS-2b entfallen: der Endpunkt bedient das Ergebnis
 *     jetzt, siehe Block (h)),
 *     ein POST-Grünfall (Entscheidungsartefakt mit korrektem bezug,
 *     Workflow-Status unverändert), ein Absturz-Regressionstest für GET auf
 *     einer strukturell ungültigen Fassung, ein GET-Grünfall (volle
 *     Projektion) und ein Bau-Ergebnis-Bindungs-Test (Nacharbeit 15.09.2026,
 *     F-384: GET markiert eine Entscheidung zu einem älteren
 *     Ausführungslauf als 'veraltet' statt 'ok' — bezug.ausfuehrung_lauf_id,
 *     NICHT workflow_version, ist der Diskriminator, s. Block (g8) — und
 *     eine zweite Entscheidung zu demselben Ausführungslauf wird abgelehnt)
 *     — je über einen echten Dispatch (Muster Block (c)/(d)), nicht nur
 *     über direkte Funktionsaufrufe. Block (g8) simuliert das Reparatur-
 *     ERGEBNIS (neue lauf_id), nicht den Reparatur-WEG selbst (kein
 *     baueReparaturEntwurf/ermittleNaechstenSchritt-Durchlauf) — die reale
 *     Lücke, dass ein ERFOLGREICHER Ausführungsschritt ohne manuellen
 *     Eingriff nie neu startet, schließt stattdessen eine neue Warnung in
 *     ermittleReparaturWarnungen (public/leitstand/views/workflows.js).
 * (h) [F23 WS-2b, AK21-AK26] POST .../abnahme mit ergebnis
 *     'ANPASSUNG_ANGEFORDERT': zwei Rot-Fälle (ohne Begründung -> 400, bei
 *     unzulässigem Workflow-Status -> 409) und ein Grünfall über einen
 *     echten Dispatch (ABGESCHLOSSEN -> ADJUST -> Ausführungs- und
 *     Review-Schritt zurückgesetzt, Eingabe-Referenz auf das
 *     Entscheidungsartefakt gesetzt -> Workflow landet real auf
 *     WARTET_FREIGABE, F15 AK7 hält am weiterhin ZWINGEND-Schritt, kein
 *     automatischer Lauf, AK24 -> GET .../abnahme meldet den Freigabe-Halt
 *     UND markiert die alte Entscheidung als 'veraltet' -> grenzen UND
 *     version bleiben byte-gleich, F-383/F-390), plus zwei Zusatzfälle
 *     über AK26 hinaus: (h4) für
 *     AK23 (ein zweiter ADJUST hängt die Eingabe-Referenz nicht doppelt an)
 *     und (h5, QA-Pass 15.09.2026, TC-06) ADJUST aus KLAERUNG_ERFORDERLICH
 *     mit dem Cursor auf dem Review- statt dem Ausführungsschritt.
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
import { validiereEntscheidungsDaten } from '../src/entscheidung/index.ts'
import { ladeArtefaktVersion } from '../src/lineage-registry/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { erzeugeRequestHandler, loeseSchrittEingabenAuf } from './leitstand-server.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []

console.log('\n=== F23-Abnahme-Check ===\n')

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
  // E-F39-1=B (löst F-643): der 'schreibend'-Fall braucht ein sauberes, NICHT main/master
  // Wegwerf-Git-Repo als repoWurzel — sonst liefe die neue Ausführungs-Vorbedingung
  // (loeseAusfuehrungsEingabenAuf) gegen DIESES Repos echten, unvorhersagbaren Git-Zustand
  // (process.cwd(), Default) statt gegen eine feste Fixture. Der 'lesend'-Fall bleibt
  // unbetroffen (die Vorbedingung greift nur für 'schreibend'), repoWurzel schadet ihm nicht.
  const repoWurzel = neuesRepo()
  // neuesRepo() lässt 'git init' den lokal konfigurierten Default-Branch wählen (auf dieser
  // Maschine real 'master', nicht 'main') — E-F39-1=B lehnt BEIDE ab, deshalb explizit umbenannt.
  git(repoWurzel, ['branch', '-m', 'wegwerf-branch'])
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn, repoWurzel })
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
    raeumeVerzeichnis(repoWurzel)
  }
}

// ─── (f) Schema-Beispiele Entscheidung gegen validiereEntscheidungsDaten (F23 WS-1a) ──
{
  const befundeVor = befunde.length
  const schemaPfad = 'schemas/kontrollzustand-entscheidung-payload.schema.json'
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
    { pfad: 'schemas/examples/kontrollzustand-entscheidung-payload.valid-freigabe.json', sollGueltigSein: true },
    { pfad: 'schemas/examples/kontrollzustand-entscheidung-payload.valid-stopp.json', sollGueltigSein: true },
    { pfad: 'schemas/examples/kontrollzustand-entscheidung-payload.valid-planaenderung.json', sollGueltigSein: true },
    { pfad: 'schemas/examples/kontrollzustand-entscheidung-payload.valid-terminal.json', sollGueltigSein: true },
    { pfad: 'schemas/examples/kontrollzustand-entscheidung-payload.valid-kenntnisnahme.json', sollGueltigSein: true },
    { pfad: 'schemas/examples/kontrollzustand-entscheidung-payload.valid-abnahme.json', sollGueltigSein: true },
    { pfad: 'schemas/examples/kontrollzustand-entscheidung-payload.invalid-unbekannte-art.json', sollGueltigSein: false },
    { pfad: 'schemas/examples/kontrollzustand-entscheidung-payload.invalid-ergebnis-ausserhalb-der-art.json', sollGueltigSein: false },
    { pfad: 'schemas/examples/kontrollzustand-entscheidung-payload.invalid-fehlendes-feld.json', sollGueltigSein: false },
    // QA-Pass 14.09.2026: die planaenderung-Sonderregel (Pflichtfeld abgeschwaechte_freigaben,
    // additionalProperties:false je Eintrag) war bis hierhin nur über direkte Aufrufe in
    // src/entscheidung/entscheidung.test.ts abgedeckt, nicht über die Schema-Beispiele/dieses
    // Gate — beide Fälle jetzt ergänzt.
    { pfad: 'schemas/examples/kontrollzustand-entscheidung-payload.invalid-planaenderung-ohne-abgeschwaechte-freigaben.json', sollGueltigSein: false },
    { pfad: 'schemas/examples/kontrollzustand-entscheidung-payload.invalid-planaenderung-abgeschwaechte-freigaben-unbekanntes-feld.json', sollGueltigSein: false },
    // F23 WS-2a: 'bezug' ist seit hier Pflichtfeld bei art 'abnahme' (Bauauftrag Punkt 2).
    { pfad: 'schemas/examples/kontrollzustand-entscheidung-payload.invalid-abnahme-ohne-bezug.json', sollGueltigSein: false },
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
    const verstoesse = validiereEntscheidungsDaten(obj)
    if (sollGueltigSein && verstoesse.length > 0) {
      befunde.push(`${pfad}: sollte gültig sein, aber verletzt: ${verstoesse.join('; ')}`)
    }
    if (!sollGueltigSein && verstoesse.length === 0) {
      befunde.push(`${pfad}: sollte ungültig sein, aber keine Regelverletzung gefunden`)
    }
  }
  if (befunde.length === befundeVor) {
    console.log('✓ (f) Schema-Beispiele Entscheidung: sechs valid-*.json (je art eine) erfüllen validiereEntscheidungsDaten, alle sechs invalid-*.json verletzen je eine benannte Regel (inkl. planaenderung-Sonderregel abgeschwaechte_freigaben, abnahme-Sonderregel bezug).')
  }
}

// ─── (g) GET/POST /api/workflows/<id>/abnahme (F23 WS-2a) ───────────────────
//
// (g1)/(g2)/(g4) Rot: ANGENOMMEN auf einem nicht abgeschlossenen Workflow (409), Abnahme ohne
// Begründung (400), Entscheidungsdaten art 'abnahme' ohne bezug (Validator, direkt). Der frühere
// (g3) — ANPASSUNG_ANGEFORDERT (400, verweist auf F23 WS-2b) — ist mit WS-2b entfallen: der
// Endpunkt bedient das Ergebnis jetzt, siehe Block (h).
// (g5) Grün: ein echter POST .../abnahme-Dispatch über einen Testserver (Muster Block (c)/(d))
// registriert ein Entscheidungsartefakt mit korrektem bezug und lässt den Workflow-Status
// unverändert.
// (g6) Reviewer-Pass 15.09.2026, kritischer Befund: GET .../abnahme stürzt auf einer
// strukturell ungültigen Fassung ('schritte' fehlt) nicht ab.
// (g7) Grün: echter GET .../abnahme-Dispatch — korrekte Projektion aller drei Zweige
// (aenderungsuebersicht, urteil, entscheidung) inkl. workflowStatus/-Version.
// (g8) Nacharbeit 15.09.2026, F-384 (kritisch)/TC-05: der volle Reparaturpfad ABGELEHNT -> ein
// echt NEUER Ausführungslauf -> erneut ABGESCHLOSSEN -> ANGENOMMEN, samt Schutz gegen eine
// zweite Entscheidung zu demselben Ausführungslauf und einem Zusatzfall (eine Fassung ohne
// neuen Ausführungslauf lässt 'ok' unangetastet).

/**
 * Legt einen bereits ABGESCHLOSSENEN zweistufigen Workflow (Muster workflow-vorlagen/
 * standard.json) direkt als Artefakt an — kein Automatendurchlauf nötig, GET/POST .../abnahme
 * lesen nur die abgelegte Fassung. workflowId/version optional übergebbar — version ist reines
 * Plandatum (Nacharbeit 15.09.2026, F-384: KEIN Diskriminator für den Reparaturpfad, das ist
 * bezug.ausfuehrung_lauf_id, s. Block (g8)).
 * @returns { workflowId, ausfuehrungLaufId, reviewLaufId, version }
 */
function baueAbgeschlossenenWorkflow(basisVerzeichnis, ladeOptionen, { workflowId = `f23-ws2a-gate-${randomUUID()}`, version = 3 } = {}) {
  const vorlage = ladeStartvorlage('startvorlagen/beispielprojekt.json')
  const ausfuehrungLaufId = `f23-ws2a-gate-ausfuehrung-${randomUUID()}`
  const reviewLaufId = `f23-ws2a-gate-review-${randomUUID()}`
  registriereWorkflow(
    {
      workflow_schema: 'v0',
      workflow_id: workflowId,
      auftrag_id: 'auftrag-f23-ws2a-gate-fixture',
      version,
      ziel: 'Gate-Fixture: bereits abgeschlossener Workflow für GET/POST .../abnahme.',
      status: 'ABGESCHLOSSEN',
      aktiver_schritt_id: null,
      grenzen: { max_schritte: 6, max_replans: 1 },
      schritte: [
        {
          schritt_id: 'schritt-1-ausfuehrung',
          rolle: 'ausfuehrung',
          werkzeugsatz: 'schreibend',
          worker: 'claude-code',
          modell: 'claude-sonnet-5',
          eingaben: [],
          output_schema: null,
          freigabe: 'ZWINGEND',
          risiko: 'Gate-Fixture, kein reales Risiko.',
          zeitgrenze_ms: 600000,
          nachfolger: 'schritt-2-review',
          status: 'ERFOLGREICH',
          lauf_id: ausfuehrungLaufId,
        },
        {
          schritt_id: 'schritt-2-review',
          rolle: 'code-reviewer',
          werkzeugsatz: 'lesend',
          worker: 'codex',
          modell: 'gpt-6-astra',
          eingaben: [],
          output_schema: 'ergebnis-code-reviewer',
          freigabe: 'AUTOMATISCH',
          risiko: 'Gate-Fixture, kein reales Risiko.',
          zeitgrenze_ms: 600000,
          nachfolger: null,
          status: 'ERFOLGREICH',
          lauf_id: reviewLaufId,
        },
      ],
    },
    leiteProfilReferenzAb(vorlage),
    ladeOptionen
  )
  return { workflowId, ausfuehrungLaufId, reviewLaufId, version }
}

// (g1) Rot: ANGENOMMEN auf einem nicht abgeschlossenen Workflow -> 409
{
  const basisVerzeichnis = `kontrollzustand-test-f23-g1-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis })
  try {
    const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }
    const vorlage = ladeStartvorlage('startvorlagen/beispielprojekt.json')
    const workflowId = `f23-ws2a-gate-g1-${randomUUID()}`
    registriereWorkflow(
      {
        workflow_schema: 'v0',
        workflow_id: workflowId,
        auftrag_id: 'auftrag-f23-ws2a-gate-fixture',
        version: 1,
        ziel: 'Gate-Fixture (g1): nicht abgeschlossener Workflow.',
        status: 'OFFEN',
        aktiver_schritt_id: 'schritt-1-ausfuehrung',
        grenzen: { max_schritte: 6, max_replans: 1 },
        schritte: [
          {
            schritt_id: 'schritt-1-ausfuehrung',
            rolle: 'ausfuehrung',
            werkzeugsatz: 'schreibend',
            worker: 'claude-code',
            modell: 'claude-sonnet-5',
            eingaben: [],
            output_schema: null,
            freigabe: 'ZWINGEND',
            risiko: 'Gate-Fixture, kein reales Risiko.',
            zeitgrenze_ms: 600000,
            nachfolger: null,
            status: 'OFFEN',
            lauf_id: null,
          },
        ],
      },
      leiteProfilReferenzAb(vorlage),
      ladeOptionen
    )
    const antwort = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/abnahme`, {
      method: 'POST',
      body: JSON.stringify({ ergebnis: 'ANGENOMMEN', begruendung: 'Testet den Statuscheck.' }),
    })
    if (antwort.status !== 409) {
      befunde.push(`(g1) ANGENOMMEN auf status OFFEN: erwartet 409, erhalten ${antwort.status} (${JSON.stringify(await antwort.json().catch(() => ({})))})`)
    } else {
      console.log("✓ (g1) 'ANGENOMMEN' auf einem nicht abgeschlossenen Workflow wird mit 409 abgelehnt.")
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// (g2) Rot: Abnahme ohne Begründung -> 400
{
  const basisVerzeichnis = `kontrollzustand-test-f23-g2-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis })
  try {
    const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }
    const { workflowId } = baueAbgeschlossenenWorkflow(basisVerzeichnis, ladeOptionen)
    const antwort = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/abnahme`, {
      method: 'POST',
      body: JSON.stringify({ ergebnis: 'ANGENOMMEN' }),
    })
    if (antwort.status !== 400) {
      befunde.push(`(g2) Abnahme ohne Begründung: erwartet 400, erhalten ${antwort.status} (${JSON.stringify(await antwort.json().catch(() => ({})))})`)
    } else {
      console.log('✓ (g2) Abnahme ohne Begründung wird mit 400 abgelehnt (Pflichtfeld).')
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// (g3) entfallen mit F23 WS-2b (ANPASSUNG_ANGEFORDERT ist jetzt bedienbar) — siehe Block (h).

// (g4) Rot: Entscheidungsdaten art 'abnahme' ohne bezug (Validator) — direkter Aufruf, kein HTTP nötig.
{
  const ohneBezug = { entscheidung_schema: 'v0', art: 'abnahme', ergebnis: 'ANGENOMMEN', begruendung: 'Test.', entschieden_am: new Date().toISOString() }
  const verstoesse = validiereEntscheidungsDaten(ohneBezug)
  if (!verstoesse.some((v) => v.includes("Pflichtfeld 'bezug' fehlt"))) {
    befunde.push(`(g4) Entscheidungsdaten art 'abnahme' ohne bezug: erwartet einen Verstoß gegen 'bezug', erhalten ${JSON.stringify(verstoesse)}`)
  } else {
    console.log("✓ (g4) validiereEntscheidungsDaten lehnt art 'abnahme' ohne 'bezug' ab.")
  }
}

// (g5) Grün: echter POST .../abnahme-Dispatch (ANGENOMMEN) über einen Testserver (Muster Block
// (c)/(d)) — Entscheidungsartefakt mit korrektem bezug registriert, Workflow-Status unverändert.
{
  const basisVerzeichnis = `kontrollzustand-test-f23-g5-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis })
  try {
    const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }
    const { workflowId } = baueAbgeschlossenenWorkflow(basisVerzeichnis, ladeOptionen)
    const antwort = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/abnahme`, {
      method: 'POST',
      body: JSON.stringify({ ergebnis: 'ANGENOMMEN', begruendung: 'Änderungsübersicht und Urteil geprüft, entspricht dem Auftrag.' }),
    })
    const koerper = await antwort.json().catch(() => ({}))
    if (antwort.status !== 200 || koerper.status !== 'ABGESCHLOSSEN') {
      befunde.push(`(g5) echter 'ANGENOMMEN'-Dispatch: erwartet 200 mit status 'ABGESCHLOSSEN' (unverändert), erhalten ${antwort.status} ${JSON.stringify(koerper)}`)
    } else {
      const artefakt = ladeArtefaktVersion(`entscheidung-workflow-${workflowId}-abnahme`, undefined, ladeOptionen)
      const workflowDanach = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)
      if (artefakt === null) {
        befunde.push("(g5) echter 'ANGENOMMEN'-Dispatch: kein Entscheidungsartefakt registriert")
      } else if (typeof artefakt.daten.bezug?.ausfuehrung_lauf_id !== 'string' || artefakt.daten.bezug?.workflow_version !== 3) {
        befunde.push(`(g5) echter 'ANGENOMMEN'-Dispatch: bezug fehlerhaft, erhalten ${JSON.stringify(artefakt.daten.bezug)}`)
      } else if (workflowDanach?.daten.status !== 'ABGESCHLOSSEN') {
        befunde.push(`(g5) echter 'ANGENOMMEN'-Dispatch: Workflow-Status darf sich nicht ändern, erhalten ${workflowDanach?.daten.status}`)
      } else {
        console.log("✓ (g5) echter POST .../abnahme-Dispatch ('ANGENOMMEN'): Entscheidungsartefakt mit korrektem bezug registriert, Workflow-Status bleibt ABGESCHLOSSEN.")
      }
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// (g6) Reviewer-Pass 15.09.2026, kritischer Befund: GET .../abnahme stürzt NICHT ab, wenn
// 'schritte' fehlt oder kein Array ist — findeAusfuehrungsSchritt/findeReviewSchritt sind für
// GET (anders als für POST, das vorher validiereWorkflowDaten aufruft) nicht hinter einer
// Schemaprüfung geschützt (Muster GET /api/workflows/<id>: eine ungültige Fassung bleibt
// ansehbar, das ist ihr erster Reparaturschritt). Ohne den Array.isArray-Guard in beiden Helfern
// würfe ein rohes '.find()' auf undefined einen TypeError aus einem async-Handler, dessen
// Promise niemand einsammelt — derselbe Absturzpfad, den dekodiereSegment schon einmal real den
// ganzen Server gekostet hat (siehe dortiger Kopfkommentar in leitstand-server.mjs).
{
  const basisVerzeichnis = `kontrollzustand-test-f23-g6-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis })
  try {
    const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }
    const vorlage = ladeStartvorlage('startvorlagen/beispielprojekt.json')
    const workflowId = `f23-ws2a-gate-g6-${randomUUID()}`
    // registriereWorkflow validiert nicht (Muster: dieselbe Freiheit, mit der eine ungültige
    // Fassung überhaupt entstehen kann) — 'schritte' fehlt hier bewusst.
    registriereWorkflow(
      {
        workflow_schema: 'v0',
        workflow_id: workflowId,
        auftrag_id: 'auftrag-f23-ws2a-gate-fixture',
        version: 1,
        ziel: 'Gate-Fixture (g6): strukturell ungültige Fassung, schritte fehlt.',
        status: 'ABGESCHLOSSEN',
        aktiver_schritt_id: null,
        grenzen: { max_schritte: 6, max_replans: 1 },
      },
      leiteProfilReferenzAb(vorlage),
      ladeOptionen
    )
    const antwort = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/abnahme`)
    const koerper = await antwort.json().catch(() => null)
    if (antwort.status !== 200 || koerper?.aenderungsuebersicht?.status !== 'kein_ausfuehrungs_schritt' || koerper?.urteil?.status !== 'kein_review_schritt') {
      befunde.push(`(g6) GET .../abnahme auf einer Fassung ohne 'schritte': erwartet 200 mit 'kein_ausfuehrungs_schritt'/'kein_review_schritt', erhalten ${antwort.status} ${JSON.stringify(koerper)}`)
    } else {
      // Server-Überlebensprobe (Muster 'der Server lebt danach'): ein weiterer, unabhängiger
      // Request muss noch bedient werden.
      const ueberlebt = await fetch(`${basisUrl}/api/startfehler`)
      if (!ueberlebt.ok) {
        befunde.push(`(g6) Serverprozess nach GET .../abnahme auf kaputter Fassung nicht mehr erreichbar (${ueberlebt.status})`)
      } else {
        console.log("✓ (g6) GET .../abnahme auf einer strukturell ungültigen Fassung ('schritte' fehlt) stürzt nicht ab — 200 mit benannten Gründen, der Server lebt danach.")
      }
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// (g7) Grün: echter GET .../abnahme-Dispatch auf einem abgeschlossenen, aber noch nicht
// abgenommenen Workflow — 'nicht_vorhanden'/'laufakte_fehlt' sind hier der ECHTE Zustand: die
// Gate-Fixture registriert bewusst keine Laufakte/Änderungsübersicht zu ihren erfundenen
// lauf_id, um diese beiden Zweige real (nicht nur behauptet) zu belegen.
{
  const basisVerzeichnis = `kontrollzustand-test-f23-g7-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis })
  try {
    const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }
    const { workflowId, ausfuehrungLaufId, reviewLaufId, version } = baueAbgeschlossenenWorkflow(basisVerzeichnis, ladeOptionen)
    const antwort = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/abnahme`)
    const koerper = await antwort.json().catch(() => null)
    const erwartet =
      antwort.status === 200 &&
      koerper?.workflowStatus === 'ABGESCHLOSSEN' &&
      koerper?.workflowVersion === version &&
      koerper?.aenderungsuebersicht?.status === 'nicht_vorhanden' &&
      koerper?.aenderungsuebersicht?.laufId === ausfuehrungLaufId &&
      koerper?.urteil?.status === 'laufakte_fehlt' &&
      koerper?.urteil?.laufId === reviewLaufId &&
      koerper?.entscheidung?.status === 'nicht_vorhanden'
    if (!erwartet) {
      befunde.push(`(g7) echter GET .../abnahme-Dispatch: Projektion stimmt nicht, erhalten ${antwort.status} ${JSON.stringify(koerper)}`)
    } else {
      console.log(
        "✓ (g7) echter GET .../abnahme-Dispatch: workflowStatus/-Version, aenderungsuebersicht ('nicht_vorhanden' mit korrektem laufId), urteil ('laufakte_fehlt' mit korrektem laufId) und entscheidung ('nicht_vorhanden') korrekt projiziert."
      )
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// (g8) Nacharbeit 15.09.2026 (F-384, korrigierte Maßnahme): der erste Versuch, den
// Reparaturpfad über workflow_version zu binden, war der falsche Diskriminator — version ist ein
// Plandatum, kein Fassungszähler, und der etablierte Reparaturweg (baueReparaturEntwurf,
// public/leitstand/views/workflows.js) reicht bewusst eine Fassung mit UNVERÄNDERTER version ein
// (F15 WS-2c/F-226/F-227 verlangen das). Der Bezug einer Abnahme hängt stattdessen am
// beurteilten BAU-ERGEBNIS: bezug.ausfuehrung_lauf_id. Dieser Fall belegt die SERVER-SEITIGE
// Vergleichslogik über einen echten HTTP-Dispatch der Abnahme-Endpunkte (Muster (g5)/(g7)) — ein
// Ausführungsschritt mit NEUER lauf_id simuliert das Ergebnis eines realen Neubaus (kein echter
// Kindprozess, kein echter Durchlauf von baueReparaturEntwurf/ermittleNaechstenSchritt, Muster
// (g5)/(g7): das ist bereits Gegenstand von check-f15-automat-real.mjs). GET markiert die alte
// Entscheidung danach als 'veraltet', ANGENOMMEN für den neuen Bau gelingt, eine zweite
// Entscheidung zu DEMSELBEN Ausführungslauf wird abgelehnt (TC-05), und eine Fassung OHNE neuen
// Ausführungslauf lässt eine bestehende Entscheidung korrekt auf 'ok' stehen.
//
// QA-Pass 15.09.2026 (kritischer Befund): REPARIERBARE_SCHRITT_STATUS enthält ERFOLGREICH nicht
// (Lineage-Grund) — der etablierte Reparaturweg (baueReparaturEntwurf) setzt einen ERFOLGREICHEN
// Ausführungsschritt deshalb NIE automatisch zurück, und ohne manuellen Eingriff im
// Reparatur-Textfeld entsteht in der Praxis NIE eine neue ausfuehrung_lauf_id — der Automat hält
// stattdessen mit KLAERUNG_ERFORDERLICH (Regel 3, kein bereits gelaufener Schritt startet
// zweimal), ohne neu zu bauen. Dieses Gate testet bewusst nur die Serverlogik in Isolation, NICHT
// das Zusammenspiel mit der Reparatur-UI — die reale Lücke ist stattdessen durch eine neue
// Warnung in ermittleReparaturWarnungen geschlossen (public/leitstand/views/workflows.js,
// F-384-Kommentar dort): der Mensch wird beim Öffnen eines Reparaturentwurfs ausdrücklich darauf
// hingewiesen, dass ein ERFOLGREICHER Ausführungsschritt manuell zurückgesetzt werden muss, sonst
// bleibt eine vorhandene Abnahme-Entscheidung gültig.
{
  const basisVerzeichnis = `kontrollzustand-test-f23-g8-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis })
  try {
    const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }
    const vorlage = ladeStartvorlage('startvorlagen/beispielprojekt.json')
    const profilReferenz = leiteProfilReferenzAb(vorlage)
    const { workflowId, ausfuehrungLaufId: ausfuehrungLaufId1 } = baueAbgeschlossenenWorkflow(basisVerzeichnis, ladeOptionen, { version: 1 })

    const ablehnung = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/abnahme`, {
      method: 'POST',
      body: JSON.stringify({ ergebnis: 'ABGELEHNT', begruendung: 'Entspricht nicht dem Auftrag.' }),
    })
    if (ablehnung.status !== 200) {
      befunde.push(`(g8) ABGELEHNT: erwartet 200, erhalten ${ablehnung.status} (${JSON.stringify(await ablehnung.json().catch(() => ({})))})`)
    } else {
      // Simuliertes Reparaturergebnis (NICHT über baueReparaturEntwurf/den realen Laufstart, s.
      // Blockkommentar oben): status zurück auf ABGESCHLOSSEN, der Ausführungsschritt bekommt
      // eine NEUE lauf_id (ausfuehrungLaufId2 !== ausfuehrungLaufId1) — das, und NICHT eine
      // geänderte version, ist das Signal, gegen das die Serverlogik unten geprüft wird.
      const ausfuehrungLaufId2 = `f23-ws2a-gate-g8-ausfuehrung-2-${randomUUID()}`
      const reviewLaufId2 = `f23-ws2a-gate-g8-review-2-${randomUUID()}`
      const bestand1 = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)
      registriereWorkflow(
        {
          ...bestand1.daten,
          status: 'ABGESCHLOSSEN',
          aktiver_schritt_id: null,
          schritte: bestand1.daten.schritte.map((schritt, index) => ({
            ...schritt,
            status: 'ERFOLGREICH',
            lauf_id: index === 0 ? ausfuehrungLaufId2 : reviewLaufId2,
          })),
        },
        profilReferenz,
        ladeOptionen
      )

      const getVeraltet = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/abnahme`)
      const koerperVeraltet = await getVeraltet.json().catch(() => null)
      if (koerperVeraltet?.entscheidung?.status !== 'veraltet') {
        befunde.push(`(g8) TC-04: nach neuem Ausführungslauf erwartet GET entscheidung.status 'veraltet', erhalten ${JSON.stringify(koerperVeraltet?.entscheidung)}`)
      } else {
        const annahme2 = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/abnahme`, {
          method: 'POST',
          body: JSON.stringify({ ergebnis: 'ANGENOMMEN', begruendung: 'Korrigierter Bau entspricht jetzt dem Auftrag.' }),
        })
        if (annahme2.status !== 200) {
          befunde.push(`(g8) TC-04: ANGENOMMEN für den neuen Bau trotz 'veraltet'-Vorentscheidung erwartet 200, erhalten ${annahme2.status} (${JSON.stringify(await annahme2.json().catch(() => ({})))})`)
        } else {
          const getOk = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/abnahme`)
          const koerperOk = await getOk.json().catch(() => null)
          const zweiteAnnahme2 = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/abnahme`, {
            method: 'POST',
            body: JSON.stringify({ ergebnis: 'ANGENOMMEN', begruendung: 'Zweiter Versuch, sollte abgelehnt werden.' }),
          })
          if (koerperOk?.entscheidung?.status !== 'ok' || koerperOk?.entscheidung?.ergebnis !== 'ANGENOMMEN') {
            befunde.push(`(g8) TC-04: nach ANGENOMMEN für den neuen Bau erwartet GET entscheidung.status 'ok', erhalten ${JSON.stringify(koerperOk?.entscheidung)}`)
          } else if (zweiteAnnahme2.status !== 409) {
            befunde.push(`(g8) TC-05: eine zweite Entscheidung zu demselben Ausführungslauf erwartet 409, erhalten ${zweiteAnnahme2.status} (${JSON.stringify(await zweiteAnnahme2.json().catch(() => ({})))})`)
          } else {
            // Bauauftrag Punkt 6, Zusatzfall: eine weitere Fassung OHNE neuen Ausführungslauf
            // (nur der Review-Schritt bekommt einen neuen Lauf, der Ausführungsschritt behält
            // ausfuehrungLaufId2 unverändert — Muster REPARIERBARE_SCHRITT_STATUS, das ERFOLGREICH
            // nicht enthält) lässt die bestehende, aktuelle Entscheidung korrekt auf 'ok' stehen.
            const bestand2 = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)
            registriereWorkflow(
              {
                ...bestand2.daten,
                schritte: bestand2.daten.schritte.map((schritt, index) => (index === 0 ? schritt : { ...schritt, lauf_id: `f23-ws2a-gate-g8-review-3-${randomUUID()}` })),
              },
              profilReferenz,
              ladeOptionen
            )
            const getOkOhneNeuenBau = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/abnahme`)
            const koerperOkOhneNeuenBau = await getOkOhneNeuenBau.json().catch(() => null)
            if (koerperOkOhneNeuenBau?.entscheidung?.status !== 'ok') {
              befunde.push(`(g8) Zusatzfall: eine Fassung ohne neuen Ausführungslauf muss entscheidung.status 'ok' belassen, erhalten ${JSON.stringify(koerperOkOhneNeuenBau?.entscheidung)}`)
            } else {
              console.log(
                "✓ (g8) Serverlogik (echter HTTP-Dispatch, simuliertes Reparaturergebnis): ein neuer Ausführungslauf macht die alte Entscheidung 'veraltet', ANGENOMMEN für den neuen Bau gelingt, eine zweite Entscheidung zu demselben Ausführungslauf wird abgelehnt (F-384/TC-05), und eine Fassung ohne neuen Ausführungslauf lässt 'ok' unangetastet."
              )
            }
          }
        }
      }
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (h) POST /api/workflows/<id>/abnahme, ergebnis ANPASSUNG_ANGEFORDERT (F23 WS-2b, AK21-AK26) ──
//
// (h1) Rot: ADJUST ohne Begründung -> 400 (Muster (g2)).
// (h2) Rot: ADJUST bei unzulässigem Workflow-Status (hier OFFEN) -> 409 (Muster (g1)).
// (h3) Grün, echter HTTP-Dispatch: ABGESCHLOSSEN -> ADJUST -> Ausführungs- UND Review-Schritt
//      zurück auf 'OFFEN'/lauf_id null, Ausführungsschritt trägt die neue Eingabe-Referenz -> der
//      Workflow landet real auf WARTET_FREIGABE (F15 AK7 hält am ZWINGEND-Schritt, kein
//      automatischer Lauf, AK24) -> GET .../abnahme meldet freigabeHalt UND markiert die alte
//      Entscheidung als 'veraltet' (bezug.ausfuehrung_lauf_id zeigt auf die jetzt zurückgesetzte
//      lauf_id null) -> grenzen UND version bleiben byte-gleich (AK22, kein Replan-Verbrauch,
//      F-383/F-390).
// (h4) Zusatzfall (über AK26 hinaus, direkt für AK23): eine bereits vorhandene Eingabe-Referenz
//      auf das Entscheidungsartefakt wird bei ADJUST nicht doppelt angehängt (Idempotenz).
// (h5) Zusatzfall (QA-Pass 15.09.2026, TC-06, über AK26 hinaus): ADJUST aus KLAERUNG_ERFORDERLICH
//      mit aktiver_schritt_id auf dem REVIEW-Schritt (realer Ursprung: ein BLOCKIERT-Urteil, Regel
//      1b) — belegt, dass der ADJUST-Zweig aktiver_schritt_id korrekt auf den Ausführungsschritt
//      überschreibt, statt den alten Review-Cursor zu übernehmen. Eigener Block, s. u.
{
  const basisVerzeichnis = `kontrollzustand-test-f23-h-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis })
  try {
    const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }
    const { workflowId } = baueAbgeschlossenenWorkflow(basisVerzeichnis, ladeOptionen)

    // (h1) Rot: ohne Begründung -> 400.
    const ohneBegruendung = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/abnahme`, {
      method: 'POST',
      body: JSON.stringify({ ergebnis: 'ANPASSUNG_ANGEFORDERT' }),
    })
    if (ohneBegruendung.status !== 400) {
      befunde.push(`(h1) ADJUST ohne Begründung: erwartet 400, erhalten ${ohneBegruendung.status} (${JSON.stringify(await ohneBegruendung.json().catch(() => ({})))})`)
    } else {
      console.log('✓ (h1) ADJUST ohne Begründung wird mit 400 abgelehnt (Pflichtfeld).')
    }

    // (h2) Rot: unzulässiger Workflow-Status (OFFEN) -> 409.
    const vorlage = ladeStartvorlage('startvorlagen/beispielprojekt.json')
    const profilReferenz = leiteProfilReferenzAb(vorlage)
    const offenerWorkflowId = `f23-ws2b-gate-h2-${randomUUID()}`
    registriereWorkflow(
      {
        workflow_schema: 'v0',
        workflow_id: offenerWorkflowId,
        auftrag_id: 'auftrag-f23-ws2b-gate-fixture',
        version: 1,
        ziel: 'Gate-Fixture (h2): nicht abgeschlossener Workflow.',
        status: 'OFFEN',
        aktiver_schritt_id: 'schritt-1-ausfuehrung',
        grenzen: { max_schritte: 6, max_replans: 1 },
        schritte: [
          {
            schritt_id: 'schritt-1-ausfuehrung',
            rolle: 'ausfuehrung',
            werkzeugsatz: 'schreibend',
            worker: 'claude-code',
            modell: 'claude-sonnet-5',
            eingaben: [],
            output_schema: null,
            freigabe: 'ZWINGEND',
            risiko: 'Gate-Fixture, kein reales Risiko.',
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
    const unzulaessig = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(offenerWorkflowId)}/abnahme`, {
      method: 'POST',
      body: JSON.stringify({ ergebnis: 'ANPASSUNG_ANGEFORDERT', begruendung: 'Test.' }),
    })
    if (unzulaessig.status !== 409) {
      befunde.push(`(h2) ADJUST auf status OFFEN: erwartet 409, erhalten ${unzulaessig.status} (${JSON.stringify(await unzulaessig.json().catch(() => ({})))})`)
    } else {
      console.log("✓ (h2) ADJUST bei unzulässigem Workflow-Status (OFFEN) wird mit 409 abgelehnt.")
    }

    // (h3) Grün: echter Dispatch über den vollen Weg.
    const bestandVorher = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)
    const grenzenVorher = JSON.stringify(bestandVorher.daten.grenzen)
    const versionVorher = bestandVorher.daten.version

    const adjust = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/abnahme`, {
      method: 'POST',
      body: JSON.stringify({ ergebnis: 'ANPASSUNG_ANGEFORDERT', begruendung: 'Bitte den Logger-Aufruf noch ergänzen.' }),
    })
    const adjustKoerper = await adjust.json().catch(() => ({}))
    if (adjust.status !== 200 || adjustKoerper.status !== 'WARTET_FREIGABE') {
      befunde.push(`(h3) ADJUST: erwartet 200 mit status 'WARTET_FREIGABE', erhalten ${adjust.status} ${JSON.stringify(adjustKoerper)}`)
    } else {
      const bestandNachher = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)
      const schrittAusfuehrung = bestandNachher.daten.schritte.find((s) => s.schritt_id === 'schritt-1-ausfuehrung')
      const schrittReview = bestandNachher.daten.schritte.find((s) => s.schritt_id === 'schritt-2-review')
      const abnahmeArtefaktRef = `artefakt:entscheidung-workflow-${workflowId}-abnahme`
      const zuruecksetzungKorrekt =
        bestandNachher.daten.status === 'WARTET_FREIGABE' &&
        schrittAusfuehrung?.status === 'OFFEN' &&
        schrittAusfuehrung?.lauf_id === null &&
        !('freigabe_erteilt' in schrittAusfuehrung) &&
        schrittAusfuehrung?.eingaben.includes(abnahmeArtefaktRef) &&
        schrittReview?.status === 'OFFEN' &&
        schrittReview?.lauf_id === null &&
        JSON.stringify(bestandNachher.daten.grenzen) === grenzenVorher &&
        bestandNachher.daten.version === versionVorher
      if (!zuruecksetzungKorrekt) {
        befunde.push(`(h3) ADJUST: Fortschreibung stimmt nicht, erhalten ${JSON.stringify(bestandNachher.daten)}`)
      } else {
        const getDanach = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/abnahme`)
        const koerperDanach = await getDanach.json().catch(() => null)
        if (
          koerperDanach?.workflowStatus !== 'WARTET_FREIGABE' ||
          koerperDanach?.freigabeHalt?.schrittId !== 'schritt-1-ausfuehrung' ||
          koerperDanach?.entscheidung?.status !== 'veraltet'
        ) {
          befunde.push(`(h3) GET .../abnahme nach ADJUST: erwartet freigabeHalt + entscheidung 'veraltet', erhalten ${JSON.stringify(koerperDanach)}`)
        } else {
          console.log(
            "✓ (h3) echter POST .../abnahme-Dispatch (ANPASSUNG_ANGEFORDERT): Ausführungs- und Review-Schritt zurückgesetzt, Eingabe-Referenz gesetzt, Workflow landet auf WARTET_FREIGABE (F15 AK7, kein automatischer Lauf), grenzen UND version unverändert (AK22, F-383/F-390), GET .../abnahme meldet freigabeHalt und 'veraltet'."
          )

          // (h4) Zusatzfall: ein zweiter ADJUST, dessen Ausführungsschritt die Eingabe-Referenz
          // aus (h3) bereits trägt, hängt sie nicht doppelt an (AK23) — direkt gegen die
          // Schreibstelle geprüft, ohne den vollen Freigabe-/Neubau-Umweg: der Workflow wird dafür
          // auf ABGESCHLOSSEN mit einem NEUEN Ausführungslauf zurückgeschrieben (Muster (g8)s
          // simuliertes Reparaturergebnis — ein echt neuer Lauf ist nötig, sonst lehnt (5) mangels
          // lauf_id oder der Doppelentscheidungs-Riegel (5b) mangels neuem Bau-Ergebnis ab), die
          // Eingaben-Liste selbst bleibt dabei unverändert (die Referenz steht schon drin).
          const ausfuehrungLaufIdFuerZweitenBau = `f23-ws2b-gate-h4-ausfuehrung-2-${randomUUID()}`
          registriereWorkflow(
            {
              ...bestandNachher.daten,
              status: 'ABGESCHLOSSEN',
              aktiver_schritt_id: null,
              schritte: bestandNachher.daten.schritte.map((schritt) =>
                schritt.schritt_id === 'schritt-1-ausfuehrung'
                  ? { ...schritt, status: 'ERFOLGREICH', lauf_id: ausfuehrungLaufIdFuerZweitenBau }
                  : { ...schritt, status: 'ERFOLGREICH', lauf_id: `f23-ws2b-gate-h4-review-2-${randomUUID()}` }
              ),
            },
            profilReferenz,
            ladeOptionen
          )
          const zweitesAdjust = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/abnahme`, {
            method: 'POST',
            body: JSON.stringify({ ergebnis: 'ANPASSUNG_ANGEFORDERT', begruendung: 'Zweite Anpassung, prüft Idempotenz der Eingabe-Referenz.' }),
          })
          if (zweitesAdjust.status !== 200) {
            befunde.push(`(h4) zweiter ADJUST: erwartet 200, erhalten ${zweitesAdjust.status} (${JSON.stringify(await zweitesAdjust.json().catch(() => ({})))})`)
          } else {
            const bestandNachZweitem = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)
            const eingabenNachZweitem = bestandNachZweitem.daten.schritte.find((s) => s.schritt_id === 'schritt-1-ausfuehrung')?.eingaben ?? []
            const anzahlReferenz = eingabenNachZweitem.filter((e) => e === abnahmeArtefaktRef).length
            if (anzahlReferenz !== 1) {
              befunde.push(`(h4) zweiter ADJUST: erwartet die Eingabe-Referenz genau einmal, gefunden ${anzahlReferenz}x in ${JSON.stringify(eingabenNachZweitem)}`)
            } else {
              console.log('✓ (h4) ein zweiter ADJUST hängt die Eingabe-Referenz auf das Entscheidungsartefakt nicht doppelt an (AK23).')
            }
          }
        }
      }
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// (h5) QA-Pass 15.09.2026 (TC-06): AK21 erlaubt ADJUST ausdrücklich auch bei Status
// KLAERUNG_ERFORDERLICH, real erreicht über ein BLOCKIERT-Urteil (Regel 1b) — dabei steht
// aktiver_schritt_id auf dem REVIEW-Schritt, nicht auf dem Ausführungsschritt, den der
// Ausführungsschritt aber real gelaufen ist (ERFOLGREICH, eigene lauf_id). Belegt, dass der
// ADJUST-Zweig aktiver_schritt_id korrekt auf den Ausführungsschritt überschreibt, statt den
// alten (Review-)Cursor stehen zu lassen — genau die Art Zustandslogik, an der dieses Feature laut
// F-384/TC-04/TC-05 bereits zweimal real brach.
{
  const basisVerzeichnis = `kontrollzustand-test-f23-h5-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis })
  try {
    const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }
    const vorlage = ladeStartvorlage('startvorlagen/beispielprojekt.json')
    const profilReferenz = leiteProfilReferenzAb(vorlage)
    const workflowId = `f23-ws2b-gate-h5-${randomUUID()}`
    const ausfuehrungLaufId = `f23-ws2b-gate-h5-ausfuehrung-${randomUUID()}`
    const reviewLaufId = `f23-ws2b-gate-h5-review-${randomUUID()}`
    registriereWorkflow(
      {
        workflow_schema: 'v0',
        workflow_id: workflowId,
        auftrag_id: 'auftrag-f23-ws2b-gate-h5-fixture',
        version: 1,
        ziel: 'Gate-Fixture (h5): KLAERUNG_ERFORDERLICH über ein BLOCKIERT-Urteil, Cursor auf dem Review-Schritt.',
        status: 'KLAERUNG_ERFORDERLICH',
        aktiver_schritt_id: 'schritt-2-review',
        grund: "Schritt 'schritt-2-review' (ergebnis-code-reviewer) trägt Urteil 'BLOCKIERT' — Gate-Fixture.",
        grenzen: { max_schritte: 6, max_replans: 1 },
        schritte: [
          {
            schritt_id: 'schritt-1-ausfuehrung',
            rolle: 'ausfuehrung',
            werkzeugsatz: 'schreibend',
            worker: 'claude-code',
            modell: 'claude-sonnet-5',
            eingaben: [],
            output_schema: null,
            freigabe: 'ZWINGEND',
            risiko: 'Gate-Fixture, kein reales Risiko.',
            zeitgrenze_ms: 600000,
            nachfolger: 'schritt-2-review',
            status: 'ERFOLGREICH',
            lauf_id: ausfuehrungLaufId,
          },
          {
            schritt_id: 'schritt-2-review',
            rolle: 'code-reviewer',
            werkzeugsatz: 'lesend',
            worker: 'codex',
            modell: 'gpt-6-astra',
            eingaben: [],
            output_schema: 'ergebnis-code-reviewer',
            freigabe: 'AUTOMATISCH',
            risiko: 'Gate-Fixture, kein reales Risiko.',
            zeitgrenze_ms: 600000,
            nachfolger: null,
            status: 'ERFOLGREICH',
            lauf_id: reviewLaufId,
          },
        ],
      },
      profilReferenz,
      ladeOptionen
    )

    const adjust = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/abnahme`, {
      method: 'POST',
      body: JSON.stringify({ ergebnis: 'ANPASSUNG_ANGEFORDERT', begruendung: 'Review-Urteil BLOCKIERT — bitte den Zugriffsfehler beheben.' }),
    })
    const adjustKoerper = await adjust.json().catch(() => ({}))
    if (adjust.status !== 200 || adjustKoerper.status !== 'WARTET_FREIGABE') {
      befunde.push(`(h5) ADJUST aus KLAERUNG_ERFORDERLICH (Cursor auf Review-Schritt): erwartet 200 mit status 'WARTET_FREIGABE', erhalten ${adjust.status} ${JSON.stringify(adjustKoerper)}`)
    } else {
      const bestandNachher = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)
      const schrittAusfuehrung = bestandNachher.daten.schritte.find((s) => s.schritt_id === 'schritt-1-ausfuehrung')
      const schrittReview = bestandNachher.daten.schritte.find((s) => s.schritt_id === 'schritt-2-review')
      const korrekt =
        bestandNachher.daten.status === 'WARTET_FREIGABE' &&
        bestandNachher.daten.aktiver_schritt_id === 'schritt-1-ausfuehrung' &&
        schrittAusfuehrung?.status === 'OFFEN' &&
        schrittAusfuehrung?.lauf_id === null &&
        schrittReview?.status === 'OFFEN' &&
        schrittReview?.lauf_id === null
      if (!korrekt) {
        befunde.push(`(h5) ADJUST aus KLAERUNG_ERFORDERLICH: aktiver_schritt_id/Schrittfelder stimmen nicht, erhalten ${JSON.stringify(bestandNachher.daten)}`)
      } else {
        const getDanach = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/abnahme`)
        const koerperDanach = await getDanach.json().catch(() => null)
        if (koerperDanach?.freigabeHalt?.schrittId !== 'schritt-1-ausfuehrung') {
          befunde.push(`(h5) GET .../abnahme nach ADJUST: erwartet freigabeHalt.schrittId 'schritt-1-ausfuehrung' (nicht der alte Review-Cursor), erhalten ${JSON.stringify(koerperDanach?.freigabeHalt)}`)
        } else {
          console.log(
            "✓ (h5) ADJUST aus KLAERUNG_ERFORDERLICH mit Cursor auf dem Review-Schritt (BLOCKIERT-Urteil): aktiver_schritt_id wird korrekt auf den Ausführungsschritt überschrieben, nicht der alte Review-Cursor übernommen — Workflow landet real auf WARTET_FREIGABE für 'schritt-1-ausfuehrung'."
          )
        }
      }
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
