/**
 * Datei: scripts/leitstand/ist-nach-abnahme.test.mjs
 *
 * Zweck: node:test für F45 B5b-3 „Ist nach Abnahme“ (R7) gegen ein Temp-Repo:
 * - über die echte Route POST …/abnahme (Ablauf ohne Arbeitsordner ⇒ Projektordner): ANGENOMMEN schreibt die eine laufende Zeile
 *   und liefert den Git-Block, die zweite Abnahme ist 409 und schreibt nicht doppelt; ANPASSUNG_ANGEFORDERT und ABGELEHNT schreiben
 *   nicht; zwei laufende Zeilen ⇒ Hinweis, Akte unverändert; Auftrag ohne feature_ref ⇒ kein Feld; Projekt ohne Akte ⇒ keine_akte.
 * - fuehreIstNachAbnahmeDurch direkt mit Arbeitsordner (echtes git): die Akte erscheint in `git status` des Arbeitsordners, kein
 *   Git-Block; CRLF ⇒ Hinweis, Akte unverändert.
 *
 * Wird aufgerufen von: `npm test` (node --test).
 */

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { registriereAuftrag } from '../../src/auftrag/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../../src/startvorlage/index.ts'
import { registriereWorkflow } from '../../src/workflow/index.ts'
import { raeumeVerzeichnis } from '../_aufraeumen.ts'
import { erzeugeRequestHandler } from '../leitstand-server.mjs'
import { fuehreIstNachAbnahmeDurch } from './ist-nach-abnahme.mjs'
import { schalteGitWartungAb } from '../_wegwerf.ts'

const KOPF = '| ID | Art | Titel | Status | Schätzung AT | Ist AT | Begonnen | Abgenommen | Notiz |\n|---|---|---|---|---|---|---|---|---|\n'

/** Akte F9 mit den Tabellenzeilen. @param zeilen - Workstream-Zeilen @returns Text */
const akte = (zeilen) => `# F9 — Test\n\n## Status\nStatus: IN_ARBEIT\n\n## Ziel\nZiel.\n\n## Workstreams\n\n${KOPF}${zeilen.join('\n')}\n\n## Änderungen\n- 2026-10-01 · Ziel · alt\n`
const EINE = akte(['| W1 | workstream | Eins | laeuft | 0,3 | – | 2026-10-21 | – | |'])
const ZWEI = akte(['| W1 | workstream | Eins | laeuft | 0,3 | – | 2026-10-21 | – | |', '| W2 | workstream | Zwei | laeuft | – | – | – | – | |'])

/**
 * Abgeschlossener Ablauf mit gelaufenem Bau (Muster scripts/leitstand-abnahme-stand.test.mjs).
 * @param workflowId - Kennung @param auftragId - Auftrag @returns WORKFLOW_V0
 */
function workflow(workflowId, auftragId) {
  const schritt = (schritt_id, rolle, worker, output_schema, nachfolger, lauf_id) => ({ schritt_id, rolle, werkzeugsatz: rolle === 'ausfuehrung' ? 'schreibend' : 'lesend', worker, modell: 'test-modell', eingaben: [], output_schema, freigabe: rolle === 'ausfuehrung' ? 'ZWINGEND' : 'AUTOMATISCH', risiko: 'Test-Fixture.', zeitgrenze_ms: 600000, nachfolger, status: 'ERFOLGREICH', lauf_id })
  return {
    workflow_schema: 'v0',
    workflow_id: workflowId,
    auftrag_id: auftragId,
    version: 1,
    ziel: 'F45 B5b-3: Ist nach Abnahme.',
    status: 'ABGESCHLOSSEN',
    aktiver_schritt_id: null,
    grenzen: { max_schritte: 6, max_replans: 1 },
    schritte: [schritt('schritt-1-ausfuehrung', 'ausfuehrung', 'claude-code', null, 'schritt-2-review', 'bau-1'), schritt('schritt-2-review', 'code-reviewer', 'codex', 'ergebnis-code-reviewer', null, 'review-1')],
  }
}

/**
 * Temp-Projekt mit laufendem Leitstand und einem abgeschlossenen Ablauf.
 * @param akteText - Inhalt von features/F9/feature.md oder null (keine Akte) @param featureRef - feature_ref des Auftrags oder undefined
 * @param fn - async ({ post, aktePfad, repo }) => void
 */
async function mitAblauf(akteText, featureRef, fn) {
  const repo = mkdtempSync(join(tmpdir(), 'aiw-b5b3-'))
  const basisVerzeichnis = join(repo, 'kontrollzustand')
  const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }
  const aktePfad = join(repo, 'features', 'F9', 'feature.md')
  if (akteText !== null) {
    mkdirSync(join(repo, 'features', 'F9'), { recursive: true })
    writeFileSync(aktePfad, akteText)
  }
  const profil = leiteProfilReferenzAb(ladeStartvorlage('startvorlagen/beispielprojekt.json'))
  const auftragId = `b5b3-${randomUUID()}`
  const workflowId = `b5b3-${randomUUID()}`
  registriereAuftrag(auftragId, profil, 'B5b-3 Test', 'Text.', { ...ladeOptionen, ...(featureRef === undefined ? {} : { feature_ref: featureRef }) })
  registriereWorkflow(workflow(workflowId, auftragId), profil, ladeOptionen)
  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, repoWurzel: repo }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${server.address().port}/api/workflows/${encodeURIComponent(workflowId)}/abnahme`
  const post = async (ergebnis) => {
    const antwort = await fetch(url, { method: 'POST', body: JSON.stringify({ ergebnis, begruendung: 'B5b-3 Test.' }) })
    return { status: antwort.status, koerper: await antwort.json() }
  }
  try {
    await fn({ post, aktePfad, workflowId })
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(repo)
  }
}

test('ANGENOMMEN schreibt die eine laufende Zeile im Projektordner; zweite Abnahme 409 ohne Doppel', async () => {
  await mitAblauf(EINE, 'F9', async ({ post, aktePfad, workflowId }) => {
    const erste = await post('ANGENOMMEN')
    assert.equal(erste.status, 200, JSON.stringify(erste.koerper))
    const r7 = erste.koerper.ist_nach_abnahme
    assert.equal(r7.art, 'geschrieben', JSON.stringify(r7))
    assert.equal(r7.workstream, 'W1')
    assert.equal(r7.pfad, 'features/F9/feature.md')
    assert.ok(r7.git.includes('git add -- features/F9/feature.md'), JSON.stringify(r7.git))
    const nachher = readFileSync(aktePfad, 'utf8')
    assert.match(nachher, /\| W1 \| workstream \| Eins \| erledigt \| 0,3 \| (\d+|–) \| 2026-10-21 \| \d{4}-\d{2}-\d{2} \| \|/)
    assert.ok(nachher.includes(`· Abnahme ${workflowId}\n`))
    const zweite = await post('ANGENOMMEN')
    assert.equal(zweite.status, 409)
    assert.equal(readFileSync(aktePfad, 'utf8'), nachher, 'kein Doppel')
  })
})

test('ANPASSUNG_ANGEFORDERT und ABGELEHNT schreiben nicht', async () => {
  for (const ergebnis of ['ANPASSUNG_ANGEFORDERT', 'ABGELEHNT']) {
    await mitAblauf(EINE, 'F9', async ({ post, aktePfad }) => {
      const antwort = await post(ergebnis)
      assert.equal(antwort.status, 200, JSON.stringify(antwort.koerper))
      assert.equal(antwort.koerper.ist_nach_abnahme, undefined)
      assert.equal(readFileSync(aktePfad, 'utf8'), EINE)
    })
  }
})

test('zwei laufende Zeilen ⇒ Hinweis mit Anzahl, Akte unverändert', async () => {
  await mitAblauf(ZWEI, 'F9', async ({ post, aktePfad }) => {
    const antwort = await post('ANGENOMMEN')
    assert.equal(antwort.status, 200)
    assert.deepEqual(antwort.koerper.ist_nach_abnahme, { art: 'hinweis', hinweis: 'Workstream nicht eindeutig (2 laufende Zeilen) — von Hand nachtragen' })
    assert.equal(readFileSync(aktePfad, 'utf8'), ZWEI)
  })
})

test('Begonnen leer ⇒ Ersatz aus der Anlage des Ablaufs (heute), Ist „–“, Herkunft in der Änderungszeile (qa 3)', async () => {
  const ohneBegonnen = akte(['| W1 | workstream | Eins | laeuft | 0,3 | – | – | – | |'])
  await mitAblauf(ohneBegonnen, 'F9', async ({ post, aktePfad }) => {
    const antwort = await post('ANGENOMMEN')
    assert.equal(antwort.koerper.ist_nach_abnahme?.art, 'geschrieben', JSON.stringify(antwort.koerper))
    const jetzt = new Date()
    const heute = `${jetzt.getFullYear()}-${String(jetzt.getMonth() + 1).padStart(2, '0')}-${String(jetzt.getDate()).padStart(2, '0')}`
    const text = readFileSync(aktePfad, 'utf8')
    assert.ok(text.includes(`| W1 | workstream | Eins | erledigt | 0,3 | – | ${heute} | ${heute} | |`), text)
    assert.ok(text.includes('Ist – AT, Begonnen aus der Anlage des Ablaufs · Abnahme '))
  })
})

test('Auftrag ohne feature_ref ⇒ kein Feld; Projekt ohne Akte ⇒ keine_akte, kein Fehler', async () => {
  await mitAblauf(EINE, undefined, async ({ post, aktePfad }) => {
    const antwort = await post('ANGENOMMEN')
    assert.equal(antwort.status, 200)
    assert.equal('ist_nach_abnahme' in antwort.koerper, false)
    assert.equal(readFileSync(aktePfad, 'utf8'), EINE)
  })
  await mitAblauf(null, 'F9', async ({ post }) => {
    const antwort = await post('ANGENOMMEN')
    assert.equal(antwort.status, 200)
    assert.deepEqual(antwort.koerper.ist_nach_abnahme, { art: 'keine_akte' })
  })
})

test('Arbeitsordner: die Akte erscheint in git status des Arbeitsordners, kein Git-Block; CRLF ⇒ Hinweis', async () => {
  const ordner = mkdtempSync(join(tmpdir(), 'aiw-b5b3-ao-'))
  const git = (...args) => execFileSync('git', ['-C', ordner, '-c', 'core.autocrlf=false', ...args], { encoding: 'utf8' })
  try {
    mkdirSync(join(ordner, 'features', 'F9'), { recursive: true })
    const pfad = join(ordner, 'features', 'F9', 'feature.md')
    writeFileSync(pfad, EINE)
    git('init', '-q')
    schalteGitWartungAb(ordner)
    git('add', '--', 'features/F9/feature.md')
    git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'akte')
    const basisVerzeichnis = join(ordner, 'kz-leer')
    const eingabe = {
      workflowId: 'wf-ao',
      workflowDaten: { auftrag_id: 'nicht-registriert' },
      laufort: () => ({ ok: true, wurzel: ordner, arbeitsordner: { pfad: ordner, branch: 'wf/wf-ao' } }),
      repoWurzel: join(ordner, 'projekt'),
      ladeOptionen: { basisVerzeichnis, schreiber: () => {} },
      datum: '2026-10-27',
    }
    // Ohne lesbaren Auftrag kein feature_ref ⇒ null (Feld fehlt in der Antwort).
    assert.equal(await fuehreIstNachAbnahmeDurch(eingabe), null)
    const profil = leiteProfilReferenzAb(ladeStartvorlage('startvorlagen/beispielprojekt.json'))
    registriereAuftrag('ao', profil, 'AO', 'Text.', { ...eingabe.ladeOptionen, feature_ref: 'F9' })
    const ergebnis = await fuehreIstNachAbnahmeDurch({ ...eingabe, workflowDaten: { auftrag_id: 'ao' } })
    assert.deepEqual(ergebnis, { art: 'geschrieben', workstream: 'W1', ist: 4, pfad: 'features/F9/feature.md' })
    assert.match(git('status', '--porcelain', '--', 'features'), /^ M features\/F9\/feature\.md/m)

    writeFileSync(pfad, EINE.replace(/\n/g, '\r\n'))
    const crlf = await fuehreIstNachAbnahmeDurch({ ...eingabe, workflowId: 'wf-ao-2', workflowDaten: { auftrag_id: 'ao' } })
    assert.equal(crlf.art, 'hinweis')
    assert.equal(readFileSync(pfad, 'utf8'), EINE.replace(/\n/g, '\r\n'))

    // cr 4 / qa 5: Rückbau bei scheiterndem Schreiben, Laufort wirft (cr 1) bzw. nicht verfügbar, Sperre im Projektordner.
    writeFileSync(pfad, EINE)
    const gescheitert = await fuehreIstNachAbnahmeDurch({ ...eingabe, workflowId: 'wf-ao-3', workflowDaten: { auftrag_id: 'ao' }, schreibe: (ziel) => writeFileSync(ziel, 'halb') })
    assert.equal(gescheitert.art, 'hinweis')
    assert.match(gescheitert.hinweis, /Rückbau: zurückgesetzt — git diff prüfen/)
    assert.equal(readFileSync(pfad, 'utf8'), EINE)
    const wirft = await fuehreIstNachAbnahmeDurch({ ...eingabe, workflowDaten: { auftrag_id: 'ao' }, laufort: () => { throw new Error('Kontrollzustand kaputt') } })
    assert.match(wirft.hinweis, /Kontrollzustand kaputt/)
    const fehlt = await fuehreIstNachAbnahmeDurch({ ...eingabe, workflowDaten: { auftrag_id: 'ao' }, laufort: () => ({ ok: false, grund: 'x' }) })
    assert.match(fehlt.hinweis, /Arbeitsordner des Ablaufs ist nicht verfügbar/)
    const projekt = { ...eingabe, workflowDaten: { auftrag_id: 'ao' }, laufort: () => ({ ok: true, wurzel: ordner, arbeitsordner: null }) }
    const gesperrt = await fuehreIstNachAbnahmeDurch({ ...projekt, workflows: async () => [{ workflowId: 'anderer', status: 'LAEUFT', auftragId: 'unlesbar' }], auftraege: async () => [] })
    assert.equal(gesperrt.art, 'hinweis')
    assert.match(gesperrt.hinweis, /Ablaufs 'anderer'.*Workstream danach von Hand nachtragen/)
    assert.equal(readFileSync(pfad, 'utf8'), EINE)
  } finally {
    raeumeVerzeichnis(ordner)
  }
})
