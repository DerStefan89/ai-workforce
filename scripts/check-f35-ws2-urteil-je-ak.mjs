#!/usr/bin/env node
/**
 * Datei: scripts/check-f35-ws2-urteil-je-ak.mjs
 *
 * Zweck: Gate für F35 WS-2 (features/F35/feature.md, "Urteil je AK"). Nachweis am REALEN
 * Aufrufpfad (Muster scripts/check-f35-ws1-feature-auftrag.mjs, scripts/check-f659-review-
 * korrektur-begruendung.mjs): ein Wegwerf-"Fremdprojekt" trägt NUR features/<id>/feature.md;
 * ein echter HTTP-Testserver, ein echter zweistufiger Workflow (ausfuehrung -> code-reviewer,
 * beide AUTOMATISCH), der Worker ist gestubbt (fuehreAufgabeDurchFn), aber jede
 * Reviewer-Laufakte wird REAL registriert — der Automat (ermittleNaechstenSchritt, Regel 1i)
 * liest ihr Urteil/ak_urteile also am tatsächlichen Lese-/Prüfpfad, nicht an einem Mock davon.
 *
 * Prüft:
 * (a) Eine über POST /api/features/<id>/auftrag gebaute Auftrag (2 AK) erreicht den
 *     Review-Schritt mit einem Auftragstext, der beide AK-IDs und das Nicht-Ziel trägt.
 * (b) Rot: der Reviewer liefert urteil BEREIT, aber nur EIN ak_urteil (AK2 fehlt) → der
 *     Workflow hält (KLAERUNG_ERFORDERLICH), der Grund nennt das fehlende AK.
 * (c) Rot: ein ak_urteil NICHT_ERFUELLT bei Gesamturteil BEREIT → Halt, Grund nennt die AK-ID.
 * (d) Grün: beide AK ERFUELLT mit Beleg → der Workflow schließt normal ab (ABGESCHLOSSEN).
 * (e) Alt-Verhalten: ein Auftrag OHNE Akzeptanzkriterien (POST /api/auftraege, kein
 *     akzeptanzkriterien-Feld) schließt bei urteil BEREIT normal ab, UND der
 *     Review-Auftragstext bleibt gegenüber dem Ursprungstext bitgenau unverändert (kein
 *     AK-Block) — derselbe Nachweis wie check-f659 (a) für die Korrekturschleife.
 *
 * Wird aufgerufen von: `npm run check`.
 *
 * Aufruf: node scripts/check-f35-ws2-urteil-je-ak.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ladeArtefaktVersion, registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { erzeugeRequestHandler } from './leitstand-server.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
console.log('\n=== F35-WS2-Urteil-je-AK-Check ===\n')

/** @returns { basisUrl, schliessen } eines echten HTTP-Testservers (Muster check-f659/check-f35-ws1). */
async function starteTestserver(optionen) {
  const server = createServer(erzeugeRequestHandler(optionen))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  return {
    basisUrl: `http://127.0.0.1:${port}`,
    schliessen: () => new Promise((resolve) => server.close(resolve)),
  }
}

function verzoegerung(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Pollt bis pruefen() true liefert oder die Zeit abläuft (Muster check-f659). @returns der letzte Rückgabewert von pruefen() */
async function warteBis(pruefen, maxWartezeitMs) {
  const start = Date.now()
  let wert = await pruefen()
  while (!wert && Date.now() - start < maxWartezeitMs) {
    await verzoegerung(50)
    wert = await pruefen()
  }
  return wert
}

const INSTALL_WURZEL = process.cwd()
const FEATURE_ID = 'F9992'
const AKTE_MIT_2_AK = `# ${FEATURE_ID} — Gate-Feature WS-2

## Ziel
Ziel des Gate-Features WS-2.

## Nicht-Ziele
- Ein Nicht-Ziel, das der Review NIE als eigenen Befund übergehen darf.

## Akzeptanzkriterien
- Erstes Kriterium.
- Zweites Kriterium.
`

function git(repoWurzel, argumente) {
  return execFileSync('git', argumente, { cwd: repoWurzel, encoding: 'utf8' })
}

/**
 * Baut ein Wegwerf-"Fremdprojekt" (NUR features/, keine Workforce-Assets) — Muster
 * check-f35-ws1-feature-auftrag.mjs. Zusätzlich ein Git-Repo mit erstem Commit, NICHT auf
 * main/master (E-F39-1=B, Muster check-f659 neuesRepo) — ein 'ausfuehrung'-Schritt sperrt sonst
 * (F6a) mit ".git/HEAD nicht lesbar".
 */
function baueFremdprojekt(featureAkten) {
  const fremdprojekt = mkdtempSync(join(tmpdir(), 'check-f35-ws2-fremdprojekt-'))
  git(fremdprojekt, ['init', '--quiet'])
  git(fremdprojekt, ['config', 'user.email', 'test@example.invalid'])
  git(fremdprojekt, ['config', 'user.name', 'Test'])
  git(fremdprojekt, ['branch', '-m', 'wegwerf-branch'])
  for (const [featureId, inhalt] of Object.entries(featureAkten)) {
    const ordner = join(fremdprojekt, 'features', featureId)
    mkdirSync(ordner, { recursive: true })
    writeFileSync(join(ordner, 'feature.md'), inhalt, 'utf8')
  }
  git(fremdprojekt, ['add', '.'])
  git(fremdprojekt, ['commit', '--quiet', '-m', 'init'])
  return fremdprojekt
}

// Codex braucht einen resolvierbaren (nicht notwendig existierenden) Startziel-Pfad (Muster check-f659).
const CODEX_BLOCK = { codex: { startziel: [String.raw`C:\f35ws2-gate-dummy\codex.exe`], versionDeklariert: 'codex-cli-gate-fixture', sandbox: 'read-only' } }

function schreibeStartvorlage(verzeichnis) {
  const basis = ladeStartvorlage('startvorlagen/beispielprojekt.json')
  const pfad = join(verzeichnis, `startvorlage-${randomUUID()}.json`)
  writeFileSync(pfad, JSON.stringify({ ...basis, worker: CODEX_BLOCK }, null, 2))
  return pfad
}

/** Zweistufiger Workflow (ausfuehrung -> review), beide AUTOMATISCH (Muster check-f659). */
function baueWorkflowFixture(basisVerzeichnis, vorlage, auftragId) {
  const workflowId = `f35-ws2-gate-${randomUUID()}`
  registriereWorkflow(
    {
      workflow_schema: 'v0',
      workflow_id: workflowId,
      auftrag_id: auftragId,
      version: 1,
      ziel: 'F35-WS2-Gate-Fixture.',
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
          freigabe: 'AUTOMATISCH',
          risiko: 'Gate-Fixture, kein reales Risiko.',
          zeitgrenze_ms: 600000,
          nachfolger: 'schritt-2-review',
          status: 'OFFEN',
          lauf_id: null,
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
          status: 'OFFEN',
          lauf_id: null,
        },
      ],
    },
    leiteProfilReferenzAb(vorlage),
    { basisVerzeichnis, schreiber: () => {} }
  )
  return workflowId
}

function ladeWorkflow(workflowId, basisVerzeichnis) {
  return ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} })?.daten ?? null
}

/**
 * Fire-and-forget-Attrappe (Muster check-f659 baueAttrappe): fängt eingaben.auftragstext je
 * laufId ab. Bei rolle 'code-reviewer' registriert sie zusätzlich real eine 'laufakte-<laufId>'
 * mit dem Inhalt von reviewErgebnisRef.aktuell — der jeweils aktuell gewünschte Reviewer-Output
 * dieses Testfalls (mutable Referenz, weil dieselbe Attrappe über alle Testfälle hinweg
 * wiederverwendet wird, die sequenziell laufen).
 */
function baueAttrappe(basisVerzeichnis, profilReferenz, auftragstexte, reviewErgebnisRef) {
  return async (laufId, _profilReferenz, eingaben) => {
    auftragstexte.set(laufId, eingaben.auftragstext ?? null)
    if (eingaben.rolle === 'code-reviewer') {
      mkdirSync(basisVerzeichnis, { recursive: true })
      const rohstromPfad = join(basisVerzeichnis, `${laufId}-rohstrom.json`)
      writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: reviewErgebnisRef.aktuell }) }), 'utf8')
      registriereKernArtefakt(`laufakte-${laufId}`, profilReferenz, { erzeuger: 'check-f35-ws2-fake' }, { worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad } }, undefined, {
        basisVerzeichnis,
        schreiber: () => {},
      })
    }
    return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  }
}

{
  const basisVerzeichnis = `kontrollzustand-test-f35-ws2-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const fremdprojekt = baueFremdprojekt({ [FEATURE_ID]: AKTE_MIT_2_AK })
  const verzeichnis = mkdtempSync(join(tmpdir(), 'f35-ws2-gate-'))
  const startvorlagePfad = schreibeStartvorlage(verzeichnis)
  const vorlage = ladeStartvorlage(startvorlagePfad)
  const profilReferenz = leiteProfilReferenzAb(vorlage)
  const auftragstexte = new Map()
  const reviewErgebnisRef = { aktuell: null }
  const { basisUrl, schliessen } = await starteTestserver({
    basisVerzeichnis,
    fuehreAufgabeDurchFn: baueAttrappe(basisVerzeichnis, profilReferenz, auftragstexte, reviewErgebnisRef),
    repoWurzel: fremdprojekt,
    installWurzel: INSTALL_WURZEL,
    startvorlagePfad,
  })

  /** Legt einen frischen Auftrag aus der Feature-Akte an, baut+startet den Workflow, wartet bis er nicht mehr LAEUFT. @returns { workflowId, daten, reviewLaufId } oder null bei einem Vorbedingungsfehler (dann bereits in befunde eingetragen) */
  async function fuehreDurch(bezeichnung, reviewErgebnis) {
    reviewErgebnisRef.aktuell = reviewErgebnis
    const auftragAntwort = await fetch(`${basisUrl}/api/features/${encodeURIComponent(FEATURE_ID)}/auftrag`, { method: 'POST' })
    const auftragKoerper = await auftragAntwort.json().catch(() => ({}))
    if (auftragAntwort.status !== 201 || typeof auftragKoerper.auftragId !== 'string') {
      befunde.push(`${bezeichnung}: Vorbedingung POST .../auftrag erwartet 201, erhalten ${auftragAntwort.status} ${JSON.stringify(auftragKoerper)}`)
      return null
    }
    const workflowId = baueWorkflowFixture(basisVerzeichnis, vorlage, auftragKoerper.auftragId)
    const startAntwort = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
    if (startAntwort.status !== 202 && startAntwort.status !== 200) {
      befunde.push(`${bezeichnung}: Vorbedingung POST .../starten erwartet 200/202, erhalten ${startAntwort.status} (${await startAntwort.text()})`)
      return null
    }
    // F35 WS-3 (features/F35/feature.md): ein ak_urteile-Verstoß löst inzwischen (wie ein
    // BLOCKIERT-Urteil) automatisch eine Anpassung aus (Fälle (b)/(c) unten) — beide
    // Fixtur-Schritte tragen 'AUTOMATISCH', der zurückgesetzte Workflow bleibt dann dauerhaft auf
    // 'LAEUFT' stehen (niemand dispatcht ihn erneut, AK4), OHNE je 'nicht mehr LAEUFT/OFFEN' zu
    // erreichen. Die Wartebedingung stoppt deshalb ZUSÄTZLICH, sobald eine Abnahme-Entscheidung
    // entstanden ist — für (a)/(d)/(e) (keine automatische Anpassung) bleibt das Verhalten
    // bitgenau wie zuvor, weil dort nie eine entsteht.
    const daten = await warteBis(() => {
      const aktuell = ladeWorkflow(workflowId, basisVerzeichnis)
      if (aktuell === null) return null
      if (aktuell.status !== 'LAEUFT' && aktuell.status !== 'OFFEN') return aktuell
      const abnahme = ladeArtefaktVersion(`entscheidung-workflow-${workflowId}-abnahme`, undefined, { basisVerzeichnis, schreiber: () => {} })
      return abnahme !== null ? aktuell : null
    }, 3000)
    if (daten === null) {
      befunde.push(`${bezeichnung}: Workflow '${workflowId}' hat innerhalb der Wartezeit keinen Endzustand erreicht`)
      return null
    }
    const reviewLaufId = daten.schritte?.[1]?.lauf_id ?? null
    const abnahme = ladeArtefaktVersion(`entscheidung-workflow-${workflowId}-abnahme`, undefined, { basisVerzeichnis, schreiber: () => {} })
    return { workflowId, daten, reviewLaufId, abnahme }
  }

  try {
    // ── (b) Rot: ak_urteile trägt nur EIN Eintrag (AK2 fehlt) ────────────────────────────────
    // F35 WS-3 (features/F35/feature.md): Regel 1i hält den Automaten intern weiterhin an (davon
    // unverändert), ABER der neue Automaten-Hook löst danach zusätzlich eine automatische
    // Anpassung aus (der AK-Verstoß zählt wie BLOCKIERT als Auslöser) — beobachtbar wird das jetzt
    // am Abnahme-Artefakt (erzeuger 'kern', Begründung nennt 'AK2'), nicht mehr an
    // status/grund des Workflow-Datensatzes selbst (der bleibt hier 'LAEUFT', weil die
    // Fixtur-Schritte 'AUTOMATISCH' tragen, s. fuehreDurch-Kommentar oben).
    {
      const ergebnis = await fuehreDurch(
        '(b)',
        JSON.stringify({ urteil: 'BEREIT', befunde: [], empfehlung: 'Alles gut.', ak_urteile: [{ ak_id: 'AK1', urteil: 'ERFUELLT', beleg: 'src/beispiel.ts:1' }] })
      )
      if (ergebnis !== null) {
        const { daten, abnahme } = ergebnis
        if (abnahme === null || abnahme.herkunft?.erzeuger !== 'kern' || !abnahme.daten.begruendung?.includes('AK2') || daten.schritte?.[0]?.status !== 'OFFEN' || daten.schritte?.[0]?.lauf_id !== null) {
          befunde.push(`(b) fehlendes AK-Urteil: erwartet eine automatische Anpassung (erzeuger 'kern', Begründung nennt 'AK2') mit zurückgesetztem schritt-1-ausfuehrung — erhalten abnahme ${JSON.stringify(abnahme)}, schritt1 ${JSON.stringify(daten.schritte?.[0])}`)
        } else {
          console.log("✓ (b) Reviewer liefert urteil BEREIT, aber nur EIN ak_urteil — F35 WS-3 legt automatisch eine Anpassung an (erzeuger 'kern'), die Begründung nennt das fehlende AK2.")
        }
      }
    }

    // ── (c) Rot: ein ak_urteil NICHT_ERFUELLT bei Gesamturteil BEREIT ────────────────────────
    {
      const ergebnis = await fuehreDurch(
        '(c)',
        JSON.stringify({
          urteil: 'BEREIT',
          befunde: [],
          empfehlung: 'Alles gut.',
          ak_urteile: [
            { ak_id: 'AK1', urteil: 'ERFUELLT', beleg: 'src/beispiel.ts:1' },
            { ak_id: 'AK2', urteil: 'NICHT_ERFUELLT', beleg: 'Verhalten weicht ab, siehe Lauf.' },
          ],
        })
      )
      if (ergebnis !== null) {
        const { daten, abnahme } = ergebnis
        if (abnahme === null || abnahme.herkunft?.erzeuger !== 'kern' || !abnahme.daten.begruendung?.includes('AK2') || daten.schritte?.[0]?.status !== 'OFFEN' || daten.schritte?.[0]?.lauf_id !== null) {
          befunde.push(`(c) NICHT_ERFUELLT trotz Gesamturteil BEREIT: erwartet eine automatische Anpassung (erzeuger 'kern', Begründung nennt 'AK2') mit zurückgesetztem schritt-1-ausfuehrung — erhalten abnahme ${JSON.stringify(abnahme)}, schritt1 ${JSON.stringify(daten.schritte?.[0])}`)
        } else {
          console.log("✓ (c) Ein ak_urteil NICHT_ERFUELLT bei Gesamturteil BEREIT: F35 WS-3 legt automatisch eine Anpassung an, obwohl das Gesamturteil BEREIT ist.")
        }
      }
    }

    // ── (a)+(d) Grün: beide AK ERFUELLT mit Beleg — Auftragstext UND Endzustand ───────────────
    {
      const ergebnis = await fuehreDurch(
        '(a)/(d)',
        JSON.stringify({
          urteil: 'BEREIT',
          befunde: [],
          empfehlung: 'Alles gut.',
          ak_urteile: [
            { ak_id: 'AK1', urteil: 'ERFUELLT', beleg: 'src/beispiel.ts:1' },
            { ak_id: 'AK2', urteil: 'ERFUELLT', beleg: 'src/beispiel.ts:2' },
          ],
        })
      )
      if (ergebnis !== null) {
        const { daten, reviewLaufId } = ergebnis
        if (daten.status !== 'ABGESCHLOSSEN') {
          befunde.push(`(d) beide AK ERFUELLT: erwartet status 'ABGESCHLOSSEN', erhalten ${JSON.stringify(daten.status)} (grund ${JSON.stringify(daten.grund)})`)
        } else {
          console.log("✓ (d) Beide AK ERFUELLT mit Beleg — der Workflow schließt normal ab (ABGESCHLOSSEN).")
        }
        const reviewAuftragstext = reviewLaufId !== null ? (auftragstexte.get(reviewLaufId) ?? '') : ''
        const traegtAk1 = reviewAuftragstext.includes('AK1: Erstes Kriterium.')
        const traegtAk2 = reviewAuftragstext.includes('AK2: Zweites Kriterium.')
        const traegtNichtZiel = reviewAuftragstext.includes('Ein Nicht-Ziel, das der Review NIE als eigenen Befund übergehen darf.')
        if (!traegtAk1 || !traegtAk2 || !traegtNichtZiel) {
          befunde.push(`(a) Review-Auftragstext sollte beide AK-IDs und das Nicht-Ziel tragen — AK1: ${traegtAk1}, AK2: ${traegtAk2}, Nicht-Ziel: ${traegtNichtZiel}. Auftragstext: ${JSON.stringify(reviewAuftragstext)}`)
        } else {
          console.log('✓ (a) Der Review-Auftragstext trägt beide AK-IDs und die Nicht-Ziele.')
        }
      }
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
    raeumeVerzeichnis(fremdprojekt)
    raeumeVerzeichnis(verzeichnis)
  }
}

// ── (e) Alt-Verhalten: Auftrag OHNE Akzeptanzkriterien, eigener Serverlauf (kein Fremdprojekt nötig) ──
{
  const basisVerzeichnis = `kontrollzustand-test-f35-ws2-e-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const repoWurzelLeer = mkdtempSync(join(tmpdir(), 'f35-ws2-gate-repo-'))
  git(repoWurzelLeer, ['init', '--quiet'])
  git(repoWurzelLeer, ['config', 'user.email', 'test@example.invalid'])
  git(repoWurzelLeer, ['config', 'user.name', 'Test'])
  git(repoWurzelLeer, ['branch', '-m', 'wegwerf-branch'])
  writeFileSync(join(repoWurzelLeer, 'bestehend.txt'), 'Zeile 1\n')
  git(repoWurzelLeer, ['add', 'bestehend.txt'])
  git(repoWurzelLeer, ['commit', '--quiet', '-m', 'init'])
  const verzeichnis = mkdtempSync(join(tmpdir(), 'f35-ws2-gate-e-'))
  const startvorlagePfad = schreibeStartvorlage(verzeichnis)
  const vorlage = ladeStartvorlage(startvorlagePfad)
  const profilReferenz = leiteProfilReferenzAb(vorlage)
  const auftragstexte = new Map()
  const reviewErgebnisRef = {
    aktuell: JSON.stringify({ urteil: 'BEREIT', befunde: [], empfehlung: 'Alles gut.', ak_urteile: [] }),
  }
  const { basisUrl, schliessen } = await starteTestserver({
    basisVerzeichnis,
    fuehreAufgabeDurchFn: baueAttrappe(basisVerzeichnis, profilReferenz, auftragstexte, reviewErgebnisRef),
    repoWurzel: repoWurzelLeer,
    installWurzel: INSTALL_WURZEL,
    startvorlagePfad,
  })
  try {
    const URSPRUNGS_AUFTRAGSTEXT = 'Gate-Auftragstext OHNE Akzeptanzkriterien (F35 WS-2, Alt-Verhalten).'
    const auftragAntwort = await fetch(`${basisUrl}/api/auftraege`, {
      method: 'POST',
      body: JSON.stringify({ titel: 'F35-WS2-Gate-Alt-Verhalten', auftragstext: URSPRUNGS_AUFTRAGSTEXT }),
    })
    const { auftragId } = await auftragAntwort.json()
    const workflowId = baueWorkflowFixture(basisVerzeichnis, vorlage, auftragId)
    const startAntwort = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
    if (startAntwort.status !== 202 && startAntwort.status !== 200) {
      befunde.push(`(e) Vorbedingung: POST .../starten erwartet 200/202, erhalten ${startAntwort.status} (${await startAntwort.text()})`)
    } else {
      const daten = await warteBis(() => {
        const aktuell = ladeWorkflow(workflowId, basisVerzeichnis)
        return aktuell !== null && aktuell.status !== 'LAEUFT' && aktuell.status !== 'OFFEN' ? aktuell : null
      }, 3000)
      if (daten === null) {
        befunde.push(`(e) Workflow '${workflowId}' hat innerhalb der Wartezeit keinen Endzustand erreicht`)
      } else if (daten.status !== 'ABGESCHLOSSEN') {
        befunde.push(`(e) Auftrag ohne Akzeptanzkriterien: erwartet status 'ABGESCHLOSSEN', erhalten ${JSON.stringify(daten.status)} (grund ${JSON.stringify(daten.grund)})`)
      } else {
        const reviewLaufId = daten.schritte?.[1]?.lauf_id ?? null
        const reviewAuftragstext = reviewLaufId !== null ? (auftragstexte.get(reviewLaufId) ?? '') : ''
        if (reviewAuftragstext !== URSPRUNGS_AUFTRAGSTEXT) {
          befunde.push(`(e) ein Auftrag ohne Akzeptanzkriterien sollte den Review-Auftragstext bitgenau unverändert lassen (kein AK-Block), erhalten: ${JSON.stringify(reviewAuftragstext)}`)
        } else {
          console.log('✓ (e) Alt-Verhalten: Auftrag ohne Akzeptanzkriterien schließt normal ab (ABGESCHLOSSEN), der Review-Auftragstext bleibt bitgenau unverändert.')
        }
      }
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
    raeumeVerzeichnis(repoWurzelLeer)
    raeumeVerzeichnis(verzeichnis)
  }
}

// ─── Ergebnis ───────────────────────────────────────────────────────────────
console.log('')
if (befunde.length === 0) {
  console.log('✓ Keine Befunde.\n')
  process.exit(0)
}

console.log(`✗ ${befunde.length} Befund(e):\n`)
for (const b of befunde) console.log(`  - ${b}`)
console.log('')
process.exit(1)
