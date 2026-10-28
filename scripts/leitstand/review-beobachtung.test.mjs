/**
 * Datei: scripts/leitstand/review-beobachtung.test.mjs
 *
 * Zweck: F45 B1b-1 — Servertest über den echten HTTP-Pfad mit einer Attrappe für fuehreAufgabeDurch
 * (Muster scripts/check-f35-ws2-urteil-je-ak.mjs):
 * - F-937 (Teil Review): der Auftragstext des code-reviewer-Schritts trägt die Beobachtung des
 *   Ausführungslaufs (geladen gegen aufgerufen, Hintergrund-Aufrufe); ohne beobachtung (Codex-Lauf)
 *   den Satz „keine Beobachtung“. Seit F45 B2a-1 (F-1062) nur für den Worker claude-code; der Codex-Reviewer
 *   bekommt keinen Block (wohl aber die Projektkarte).
 * - F-1026: ein Ausführungslauf, den der Result Evaluator als FEHLGESCHLAGEN/'hintergrund_ausfuehrung'
 *   einordnet, hält den Workflow an (KLAERUNG_ERFORDERLICH) mit klarem Grund; der Review startet nicht.
 *
 * Wird aufgerufen von: npm run test (node --test).
 */

import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { fuehreGitSync } from '../../src/git-starter/index.ts'
import { ladeArtefaktVersion, registriereKernArtefakt } from '../../src/lineage-registry/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../../src/startvorlage/index.ts'
import { registriereWorkflow } from '../../src/workflow/index.ts'
import { raeumeVerzeichnis } from '../_aufraeumen.ts'
import { baueHintergrundHaltGrund, erzeugeRequestHandler } from '../leitstand-server.mjs'

const basis = mkdtempSync(join(tmpdir(), 'b1b1-review-'))
const repoWurzel = join(basis, 'projekt')
const basisVerzeichnis = join(basis, 'kontrollzustand')
mkdirSync(repoWurzel, { recursive: true })
for (const argumente of [
  ['init', '--quiet'],
  ['config', 'gc.auto', '0'],
  ['config', 'maintenance.auto', 'false'],
  ['config', 'maintenance.autoDetach', 'false'],
  ['config', 'user.email', 'test@example.invalid'],
  ['config', 'user.name', 'Test'],
  ['checkout', '--quiet', '-b', 'wegwerf-branch'],
]) {
  fuehreGitSync(argumente, { cwd: repoWurzel, encoding: 'utf8' })
}
writeFileSync(join(repoWurzel, 'README.md'), 'Zeile 1\n')
fuehreGitSync(['add', 'README.md'], { cwd: repoWurzel, encoding: 'utf8' })
fuehreGitSync(['commit', '--quiet', '-m', 'init'], { cwd: repoWurzel, encoding: 'utf8' })
// Codex braucht einen resolvierbaren (nicht notwendig existierenden) Startziel-Pfad (Muster check-f35-ws2).
const startvorlagePfad = join(basis, 'startvorlage.json')
writeFileSync(
  startvorlagePfad,
  JSON.stringify({ ...ladeStartvorlage('startvorlagen/beispielprojekt.json'), worker: { codex: { startziel: [String.raw`C:\b1b1-dummy\codex.exe`], versionDeklariert: 'codex-cli-fixture', sandbox: 'read-only' } } })
)
const vorlage = ladeStartvorlage(startvorlagePfad)
const profilReferenz = leiteProfilReferenzAb(vorlage)
after(() => raeumeVerzeichnis(basis))

const BEOBACHTUNG = {
  init_tools: ['Read', 'Bash'],
  init_agents: ['qa'],
  init_skills: ['ponytail', 'git-flow'],
  init_mcp_server: [],
  skill_aufrufe: ['ponytail'],
  subagent_aufrufe: [],
  mcp_aufrufe: [],
  navigate_adressen: [],
  hintergrund_aufrufe: [],
}

/**
 * Attrappe: merkt sich den Auftragstext je Rolle; legt für jeden Lauf eine Laufakte an (Ausführung mit
 * beobachtung nach Wunsch); die Ausführung endet mit ausfuehrungsErgebnis.
 */
function baueAttrappe({ beobachtung, ausfuehrungsKlassifikation = { ergebnis: 'ERFOLGREICH', bypass_verdacht_anzahl: 0 } }) {
  const texte = new Map()
  const fn = async (laufId, _profil, eingaben) => {
    texte.set(eingaben.rolle, eingaben.auftragstext ?? '')
    const rohstromPfad = join(basis, `rohstrom-${laufId}.json`)
    const ergebnis = eingaben.rolle === 'code-reviewer' ? JSON.stringify({ urteil: 'BEREIT', befunde: [], empfehlung: 'ok' }) : 'Fertig.'
    writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: ergebnis }) }))
    const daten = { worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad, inhalts_hash: 'x' }, ...(eingaben.rolle === 'ausfuehrung' && beobachtung !== undefined ? { beobachtung } : {}) }
    registriereKernArtefakt(`laufakte-${laufId}`, profilReferenz, { erzeuger: 'kern', schritt: 'test' }, daten, [], { basisVerzeichnis, schreiber: () => {} })
    const klassifikation = eingaben.rolle === 'ausfuehrung' ? ausfuehrungsKlassifikation : { ergebnis: 'ERFOLGREICH', bypass_verdacht_anzahl: 0 }
    return { ok: true, klassifikation, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: klassifikation.ergebnis } }
  }
  return { fn, texte }
}

/**
 * Startet Server, legt Auftrag + Zwei-Schritt-Workflow an, startet ihn und wartet auf das Ende.
 * F45 B2a-1 (F-1062): reviewWorker wählt den Worker des Review-Schritts — claude-code hier mit output_schema null (Bestand ohne
 * Schema; seit F45 B2b-2a ließe Regel 4b auch 'ergebnis-code-reviewer' zu, Gate check-f45-b2b2-pruefer).
 */
async function fuehreDurch(attrappe, reviewWorker = 'claude-code') {
  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, repoWurzel, installWurzel: process.cwd(), startvorlagePfad, fuehreAufgabeDurchFn: attrappe.fn }))
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const basisUrl = `http://127.0.0.1:${server.address().port}`
  try {
    const auftrag = await fetch(`${basisUrl}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: 'B1b-1', auftragstext: 'Ändere README.' }) })
    const { auftragId } = await auftrag.json()
    const workflowId = `wf-b1b1-${randomUUID()}`
    const schritt = (id, rolle, werkzeugsatz, worker, outputSchema, nachfolger, freigabe) => ({
      schritt_id: id,
      rolle,
      werkzeugsatz,
      worker,
      modell: worker === 'codex' ? 'gpt-6-astra' : 'claude-sonnet-5',
      eingaben: [],
      output_schema: outputSchema,
      freigabe,
      ...(freigabe === 'ZWINGEND' ? { freigabe_erteilt: true } : {}),
      risiko: 'Testfixture.',
      zeitgrenze_ms: 600000,
      nachfolger,
      status: 'OFFEN',
      lauf_id: null,
    })
    registriereWorkflow(
      {
        workflow_schema: 'v0',
        workflow_id: workflowId,
        auftrag_id: auftragId,
        version: 1,
        ziel: 'B1b-1-Test.',
        status: 'OFFEN',
        aktiver_schritt_id: 'schritt-1-ausfuehrung',
        grenzen: { max_schritte: 6, max_replans: 1 },
        schritte: [
          schritt('schritt-1-ausfuehrung', 'ausfuehrung', 'schreibend', 'claude-code', null, 'schritt-2-review', 'ZWINGEND'),
          schritt('schritt-2-review', 'code-reviewer', 'lesend', reviewWorker, reviewWorker === 'codex' ? 'ergebnis-code-reviewer' : null, null, 'AUTOMATISCH'),
        ],
      },
      profilReferenz,
      { basisVerzeichnis, schreiber: () => {} }
    )
    const start = await fetch(`${basisUrl}/api/workflows/${workflowId}/starten`, { method: 'POST' })
    assert.ok(start.status === 200 || start.status === 202, `starten: ${start.status} ${await start.text()}`)
    const ende = Date.now() + 15000
    let daten = null
    while (Date.now() < ende) {
      daten = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} })?.daten ?? null
      if (daten !== null && daten.status !== 'LAEUFT' && daten.status !== 'OFFEN') break
      await new Promise((r) => setTimeout(r, 50))
    }
    return daten
  } finally {
    await new Promise((r) => server.close(r))
  }
}

test('F-937: Review-Auftragstext trägt die Beobachtung des Ausführungslaufs (geladen gegen aufgerufen, Hintergrund)', async () => {
  const attrappe = baueAttrappe({ beobachtung: BEOBACHTUNG })
  await fuehreDurch(attrappe)
  const text = attrappe.texte.get('code-reviewer') ?? ''
  assert.match(text, /Beobachtung des Ausführungslaufs \(geladen gegen aufgerufen/)
  assert.match(text, /Skills geladen: ponytail, git-flow · aufgerufen: ponytail/)
  assert.match(text, /Hintergrund-Aufrufe: 0/)
  assert.doesNotMatch(attrappe.texte.get('ausfuehrung') ?? '', /Beobachtung des Ausführungslaufs/)
})

test('F-937: ohne beobachtung (Ausführung ohne init-Zeile) trägt der Review-Auftragstext „keine Beobachtung“', async () => {
  const attrappe = baueAttrappe({ beobachtung: undefined })
  await fuehreDurch(attrappe)
  assert.match(attrappe.texte.get('code-reviewer') ?? '', /keine Beobachtung \(Codex-Lauf oder Lauf ohne init-Zeile\)/)
})

test('F-1062: der Codex-Reviewer bekommt keinen Beobachtungsblock, aber die Projektkarte', async () => {
  const attrappe = baueAttrappe({ beobachtung: BEOBACHTUNG })
  await fuehreDurch(attrappe, 'codex')
  const text = attrappe.texte.get('code-reviewer') ?? ''
  assert.doesNotMatch(text, /Beobachtung des Ausführungslaufs/)
  assert.match(text, /# Projektkarte/)
})

test('F-1026: Ausführung FEHLGESCHLAGEN/hintergrund_ausfuehrung → KLAERUNG_ERFORDERLICH mit klarem Grund, kein Review', async () => {
  const attrappe = baueAttrappe({ beobachtung: { ...BEOBACHTUNG, hintergrund_aufrufe: ['Bash'] }, ausfuehrungsKlassifikation: { ergebnis: 'FEHLGESCHLAGEN', grund: 'hintergrund_ausfuehrung' } })
  const daten = await fuehreDurch(attrappe)
  assert.equal(daten?.status, 'KLAERUNG_ERFORDERLICH')
  assert.equal(daten?.aktiver_schritt_id, 'schritt-1-ausfuehrung')
  assert.match(daten?.grund ?? '', /Lauf hat Befehle in den Hintergrund geschoben — Ergebnis unvollständig \(1 Hintergrund-Aufruf, Lauf '/)
  assert.match(daten?.grund ?? '', /Reparaturfassung/)
  assert.equal(attrappe.texte.has('code-reviewer'), false)
})

test('F-1026: Halt-Grund nennt Anzahl, Lauf und Handlung; ohne beobachtung „Anzahl unbekannt“', () => {
  assert.match(baueHintergrundHaltGrund('s1', 'l1', 2), /\(2 Hintergrund-Aufrufe, Lauf 'l1'\)\. Die Abschaltung CLAUDE_CODE_DISABLE_BACKGROUND_TASKS hat nicht gegriffen: .*Reparaturfassung/)
  assert.match(baueHintergrundHaltGrund('s1', 'l1', undefined), /\(Anzahl unbekannt, Lauf 'l1'\)/)
})
