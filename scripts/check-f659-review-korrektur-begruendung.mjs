/**
 * Datei: scripts/check-f659-review-korrektur-begruendung.mjs
 *
 * Zweck: Gate für F-659 (state/findings.md F-659, HARNESS_IMPROVEMENT P2).
 * baueReviewKorrekturInstruktion (src/korrekturschleife/index.ts) bekam
 * bislang nur vorherigeBefunde, nicht die menschliche Abnahme-Begründung —
 * anders als baueAusfuehrungKorrekturInstruktion direkt daneben. Real
 * beobachtet (F39-Versuch-4-Bau von F-518, 24.09.2026): der ZWEITE Review
 * einer Korrekturiteration meldete einen vom Menschen bereits bewusst
 * entschiedenen Punkt fälschlich als "offen", weil sein Auftragstext die
 * Abnahme-Begründung nie trug. Prüft über einen echten HTTP-Rundlauf (Muster
 * scripts/check-f652-pruefschritt.mjs, scripts/check-f23-abnahme.mjs (h5)):
 *
 * (a) Iteration 1 (kein Abnahme-Artefakt vorhanden): der Review-Auftragstext
 *     bleibt bitgenau unverändert — keine Begründung, kein Korrektur-Block.
 * (b) Iteration 2, nach echtem POST .../abnahme mit ergebnis
 *     'ANPASSUNG_ANGEFORDERT' auf ein reales BLOCKIERT-Urteil aus Iteration
 *     1 (samt Befund): der Auftragstext des ZWEITEN Review-Laufs enthält die
 *     Abnahme-Begründung wörtlich UND den vorherigen Befund.
 *
 * Aufruf: node scripts/check-f659-review-korrektur-begruendung.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ladeArtefaktVersion, registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { erzeugeRequestHandler } from './leitstand-server.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
console.log('\n=== F-659-Review-Korrektur-Begruendung-Check ===\n')

function git(repoWurzel, argumente) {
  return execFileSync('git', argumente, { cwd: repoWurzel, encoding: 'utf8' })
}

/** Wegwerf-Git-Repo, NICHT auf main/master (E-F39-1=B), mit einem ersten Commit. Muster check-f652-pruefschritt.mjs neuesRepo. */
function neuesRepo() {
  const repoWurzel = join(tmpdir(), `f659-gate-${randomUUID()}`)
  mkdirSync(repoWurzel, { recursive: true })
  git(repoWurzel, ['init', '--quiet'])
  git(repoWurzel, ['config', 'user.email', 'test@example.invalid'])
  git(repoWurzel, ['config', 'user.name', 'Test'])
  git(repoWurzel, ['branch', '-m', 'wegwerf-branch'])
  mkdirSync(join(repoWurzel, 'schemas'), { recursive: true })
  cpSync('schemas/ergebnis-code-reviewer.schema.json', join(repoWurzel, 'schemas', 'ergebnis-code-reviewer.schema.json'))
  writeFileSync(join(repoWurzel, 'bestehend.txt'), 'Zeile 1\n')
  git(repoWurzel, ['add', 'bestehend.txt', 'schemas/ergebnis-code-reviewer.schema.json'])
  git(repoWurzel, ['commit', '--quiet', '-m', 'init'])
  return repoWurzel
}

/** @returns { basisUrl, schliessen } eines echten HTTP-Testservers (Muster check-f652-pruefschritt.mjs). */
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

/** Pollt bis pruefen() true liefert oder die Zeit abläuft. @returns der letzte Rückgabewert von pruefen() */
async function warteBis(pruefen, maxWartezeitMs) {
  const start = Date.now()
  let wert = await pruefen()
  while (!wert && Date.now() - start < maxWartezeitMs) {
    await verzoegerung(50)
    wert = await pruefen()
  }
  return wert
}

// Codex braucht einen resolvierbaren (nicht notwendig existierenden) Startziel-Pfad, damit
// loeseAusfuehrungsEingabenAuf die Vorlage auflösen kann (Muster check-f656-pruefung-wiederholen.mjs
// CODEX_BLOCK) — fuehreAufgabeDurchFn ist unten gestubbt, der Pfad wird nie real ausgeführt.
const CODEX_BLOCK = { codex: { startziel: [String.raw`C:\f659-gate-dummy\codex.exe`], versionDeklariert: 'codex-cli-gate-fixture', sandbox: 'read-only' } }

function schreibeStartvorlage(verzeichnis) {
  const basis = ladeStartvorlage('startvorlagen/beispielprojekt.json')
  const pfad = join(verzeichnis, `startvorlage-${randomUUID()}.json`)
  writeFileSync(pfad, JSON.stringify({ ...basis, worker: CODEX_BLOCK }, null, 2))
  return pfad
}

/** Zweistufiger Workflow (ausfuehrung -> review), beide AUTOMATISCH, Muster check-f652-pruefschritt.mjs. */
function baueWorkflowFixture(basisVerzeichnis, vorlage, auftragId) {
  const workflowId = `f659-gate-${randomUUID()}`
  registriereWorkflow(
    {
      workflow_schema: 'v0',
      workflow_id: workflowId,
      auftrag_id: auftragId,
      version: 1,
      ziel: 'F-659-Gate-Fixture.',
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

const REALER_BEFUND = {
  schwere: 'MITTEL',
  fundstelle: 'src/beispiel.ts:12',
  zusammenfassung: 'Gate-Fixture-Befund für F-659 — muss im zweiten Review-Auftragstext auftauchen.',
  beleg: 'Synthetischer Beleg, Gate-Fixture.',
}

/**
 * Fire-and-forget-Attrappe (Muster check-f652-pruefschritt.mjs baueAttrappe): fängt
 * eingaben.auftragstext je laufId ab. Bei rolle 'code-reviewer' registriert sie zusätzlich real
 * eine 'laufakte-<laufId>' mit Urteil BLOCKIERT + REALER_BEFUND — der reale Auslöser des in F-659
 * beschriebenen Ablaufs: der Automat (Regel 1b, src/workflow/index.ts) hält danach echt auf
 * KLAERUNG_ERFORDERLICH, mit genau dieser Laufakte als Quelle für 'vorherigeBefunde'
 * (scripts/leitstand-server.mjs, F-648-Block).
 */
function baueAttrappe(basisVerzeichnis, profilReferenz, auftragstexte) {
  return async (laufId, _profilReferenz, eingaben) => {
    auftragstexte.set(laufId, eingaben.auftragstext ?? null)
    if (eingaben.rolle === 'code-reviewer') {
      mkdirSync(basisVerzeichnis, { recursive: true })
      const rohstromPfad = join(basisVerzeichnis, `${laufId}-rohstrom.json`)
      const ergebnisobjekt = { urteil: 'BLOCKIERT', befunde: [REALER_BEFUND], empfehlung: 'Bitte den oben benannten Punkt beheben.' }
      writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: JSON.stringify(ergebnisobjekt) }) }), 'utf8')
      registriereKernArtefakt(`laufakte-${laufId}`, profilReferenz, { erzeuger: 'check-f659-fake' }, { worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad } }, undefined, {
        basisVerzeichnis,
        schreiber: () => {},
      })
    }
    return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  }
}

{
  const basisVerzeichnis = `kontrollzustand-test-f659-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const repoWurzel = neuesRepo()
  const verzeichnis = mkdtempSync(join(tmpdir(), 'f659-gate-'))
  const startvorlagePfad = schreibeStartvorlage(verzeichnis)
  const vorlage = ladeStartvorlage(startvorlagePfad)
  const profilReferenz = leiteProfilReferenzAb(vorlage)
  const auftragstexte = new Map()
  const { basisUrl, schliessen } = await starteTestserver({
    basisVerzeichnis,
    fuehreAufgabeDurchFn: baueAttrappe(basisVerzeichnis, profilReferenz, auftragstexte),
    repoWurzel,
    startvorlagePfad,
  })
  try {
    // ── Iteration 1: Workflow von Grund auf starten, bis der Review-Lauf dispatcht ist ──────
    const auftragAntwort = await fetch(`${basisUrl}/api/auftraege`, {
      method: 'POST',
      body: JSON.stringify({ titel: 'F-659-Gate', auftragstext: 'Gate-Auftragstext.' }),
    })
    const { auftragId } = await auftragAntwort.json()
    const workflowId = baueWorkflowFixture(basisVerzeichnis, vorlage, auftragId)
    const startAntwort = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
    if (startAntwort.status !== 202) {
      befunde.push(`Vorbedingung: POST .../starten erwartet 202, erhalten ${startAntwort.status} (${await startAntwort.text()})`)
    } else {
      const nachIter1Review = await warteBis(() => {
        const daten = ladeWorkflow(workflowId, basisVerzeichnis)
        return daten?.status === 'KLAERUNG_ERFORDERLICH' ? daten : null
      }, 3000)
      const iter1ReviewLaufId = nachIter1Review?.schritte?.[1]?.lauf_id ?? null
      if (nachIter1Review === null || iter1ReviewLaufId === null) {
        befunde.push(`Vorbedingung: Iteration 1 sollte nach dem BLOCKIERT-Urteil auf KLAERUNG_ERFORDERLICH mit gesetzter Review-lauf_id landen, erhalten ${JSON.stringify(nachIter1Review)}`)
      } else {
        const iter1ReviewAuftragstext = auftragstexte.get(iter1ReviewLaufId) ?? ''

        // ── (a) Iteration 1: kein Korrektur-Block ────────────────────────────────────────────
        if (iter1ReviewAuftragstext.includes('Verbindliche Klarstellung') || iter1ReviewAuftragstext.includes('Diese Iteration folgt auf "Anpassung anfordern"')) {
          befunde.push(`(a) Iteration 1: der Review-Auftragstext sollte KEINEN Korrektur-Block tragen (kein Abnahme-Artefakt vorhanden), enthielt aber: ${JSON.stringify(iter1ReviewAuftragstext)}`)
        } else {
          console.log('✓ (a) Iteration 1 (kein Abnahme-Artefakt): der Review-Auftragstext bleibt bitgenau unverändert, kein Korrektur-Block.')
        }

        // ── Echter ADJUST auf das reale BLOCKIERT-Urteil aus Iteration 1 ─────────────────────
        const BEGRUENDUNG = 'F-659-Gate: Punkt 1 ist eine bewusste Entscheidung, KEIN offener Befund — bitte im zweiten Review als behoben werten.'
        const adjust = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/abnahme`, {
          method: 'POST',
          body: JSON.stringify({ ergebnis: 'ANPASSUNG_ANGEFORDERT', begruendung: BEGRUENDUNG }),
        })
        const adjustKoerper = await adjust.json().catch(() => ({}))
        // ADJUST selbst schreibt nur den zurückgesetzten Zustand (status 'LAEUFT', weil beide
        // Schritte 'AUTOMATISCH' tragen) — es startet NICHTS ("es wird nur geschrieben",
        // scripts/leitstand-server.mjs, ANPASSUNG_ANGEFORDERT-Block). POST .../freigabe akzeptiert
        // nur einen 'haltFreigabe'-Ausgang (ZWINGEND-Schritte) und würde hier mit 409 ablehnen —
        // der tatsächliche Dispatch eines bereits 'starte'-bereiten (AUTOMATISCH) Schritts läuft
        // über einen erneuten POST .../starten (dessen einzige Vorbedingung ausgang.art === 'starte'
        // ist, unabhängig vom bereits geschriebenen Status-Feld).
        if (adjust.status !== 200 || adjustKoerper.status !== 'LAEUFT') {
          befunde.push(`Vorbedingung: POST .../abnahme (ANPASSUNG_ANGEFORDERT) erwartet 200 mit status 'LAEUFT', erhalten ${adjust.status} ${JSON.stringify(adjustKoerper)}`)
        } else {
          const zweitesStarten = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
          if (zweitesStarten.status !== 200 && zweitesStarten.status !== 202) {
            befunde.push(`Vorbedingung: zweiter POST .../starten (Iteration 2) erwartet 200/202, erhalten ${zweitesStarten.status} (${await zweitesStarten.text()})`)
          }
          const nachIter2Review = await warteBis(() => {
            const daten = ladeWorkflow(workflowId, basisVerzeichnis)
            const reviewLaufId = daten?.schritte?.[1]?.lauf_id ?? null
            return reviewLaufId !== null && reviewLaufId !== iter1ReviewLaufId ? daten : null
          }, 3000)
          const iter2ReviewLaufId = nachIter2Review?.schritte?.[1]?.lauf_id ?? null
          if (iter2ReviewLaufId === null) {
            befunde.push('Vorbedingung: Iteration 2 sollte den Review-Schritt mit einer NEUEN lauf_id erneut dispatchen, tat es aber nicht (oder rechtzeitig)')
          } else {
            const iter2ReviewAuftragstext = auftragstexte.get(iter2ReviewLaufId) ?? ''

            // ── (b) Iteration 2: Begründung UND vorheriger Befund im Review-Auftragstext ────────
            const traegtBegruendung = iter2ReviewAuftragstext.includes(BEGRUENDUNG)
            const traegtVorrang = iter2ReviewAuftragstext.includes('Verbindliche Klarstellung des Auftrags durch den Menschen')
            const traegtBefund = iter2ReviewAuftragstext.includes(REALER_BEFUND.zusammenfassung)
            if (!traegtBegruendung || !traegtVorrang || !traegtBefund) {
              befunde.push(
                `(b) Iteration 2 (nach ANPASSUNG_ANGEFORDERT): der Review-Auftragstext sollte die Abnahme-Begründung wörtlich, den Vorrang-Hinweis UND den vorherigen Befund tragen — Begründung: ${traegtBegruendung}, Vorrang-Hinweis: ${traegtVorrang}, Befund: ${traegtBefund}. Auftragstext: ${JSON.stringify(iter2ReviewAuftragstext)}`
              )
            } else {
              console.log(
                '✓ (b) Iteration 2 (nach echtem ANPASSUNG_ANGEFORDERT auf ein reales BLOCKIERT-Urteil): der Review-Auftragstext trägt die Abnahme-Begründung wörtlich, den Vorrang-Hinweis und den vorherigen Befund.'
              )
            }
          }
        }
      }
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
    raeumeVerzeichnis(repoWurzel)
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
