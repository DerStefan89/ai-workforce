#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/b2a2/instanz.mjs
 *
 * Zweck: Leitstand-Testinstanz für den Render-Nachweis F45 B2a-2 (render/erzeuge-nachweis.mjs). Installation und Projekt =
 * dieses Repo (echte Findings für den AK-Entwurf), Ablage in einem Wegwerf-Ordner. Beim Start läuft ein echter Ablauf
 * Architekt → Ausführung über den HTTP-Pfad an; den Architekten spielt eine Attrappe (kein CLI, kein Netz), die eine
 * Einrichtungsliste meldet — der Server übernimmt sie wie im Betrieb als Auftragsversion, der Ablauf wartet dann auf die
 * Freigabe des Baus. Die Ausführung startet hier nie (Attrappe würde nur „Fertig.“ melden).
 *
 * Wird aufgerufen von: Hand — `node features/F45/nachweise/b2a2/instanz.mjs`; gibt die workflowId aus und bleibt offen,
 * bis der Prozess beendet wird. Nicht Teil von `npm run check`.
 */

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { registriereKernArtefakt } from '../../../../src/lineage-registry/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../../../../src/startvorlage/index.ts'
import { registriereWorkflow } from '../../../../src/workflow/index.ts'
import { erzeugeRequestHandler } from '../../../../scripts/leitstand-server.mjs'

const INSTALL = join(import.meta.dirname, '..', '..', '..', '..')
const PORT = Number(process.env.B2A2_PORT ?? 4396)
const wurzel = mkdtempSync(join(tmpdir(), 'f45-b2a2-render-'))
const basisVerzeichnis = join(wurzel, 'kontrollzustand')
const startvorlagePfad = join(INSTALL, 'startvorlagen', 'ai-workforce.json')
const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage(startvorlagePfad))

const architektErgebnis = {
  ...JSON.parse(readFileSync(join(INSTALL, 'schemas', 'examples', 'ergebnis-architektur.valid-feature.json'), 'utf8')),
  entscheidungen_mensch: [],
  einrichtung: [
    { schritt: 'Testkonto beim Zahlungsdienst anlegen und den Schlüssel als Umgebungsvariable ZAHLUNG_TEST_SCHLUESSEL setzen — nur für den Bau, nie in eine Datei im Projekt (sehr langer Text, damit der Umbruch sichtbar wird).', wann: 'vor_dem_bau' },
    { schritt: 'Webhook-Adresse im Testkonto eintragen.', wann: 'vor_dem_bau' },
    { schritt: 'Freigabe des Testkontos durch den Anbieter abwarten.', wann: 'waehrend_des_baus' },
  ],
}

/** Attrappe für fuehreAufgabeDurch: Architekt mit Einrichtungsliste, alles andere „Fertig.“. */
async function attrappe(laufId, _profil, eingaben) {
  const rohstromPfad = join(wurzel, `rohstrom-${laufId}.json`)
  const ergebnis = eingaben.rolle === 'architekt' ? JSON.stringify(architektErgebnis) : 'Fertig.'
  writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: ergebnis }) }))
  registriereKernArtefakt(`laufakte-${laufId}`, profilReferenz, { erzeuger: 'kern', schritt: 'render-attrappe' }, { worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad, inhalts_hash: 'x' } }, [], { basisVerzeichnis, schreiber: () => {} })
  return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH', bypass_verdacht_anzahl: 0 }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
}

const leitstand = createServer(
  erzeugeRequestHandler({
    basisVerzeichnis,
    repoWurzel: INSTALL,
    installWurzel: INSTALL,
    startvorlagePfad,
    projektId: 'ai-workforce',
    istWorkforceInstanz: true,
    fuehreAufgabeDurchFn: attrappe,
    laufausgabeWurzel: join(wurzel, 'laufausgabe'),
    rohBasisVerzeichnis: join(wurzel, 'roh'),
  })
)
await new Promise((r) => leitstand.listen(PORT, '127.0.0.1', r))
const basis = `http://127.0.0.1:${PORT}`

const { auftragId } = await (await fetch(`${basis}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: 'Zahlungen anbinden', auftragstext: 'Binde den Zahlungsdienst im Testmodus an.' }) })).json()
const workflowId = `wf-b2a2-render-${Date.now()}`
const schritt = (id, rolle, werkzeugsatz, worker, outputSchema, nachfolger, freigabe, eingaben = []) => ({ schritt_id: id, rolle, werkzeugsatz, worker, modell: worker === 'codex' ? 'gpt-6-astra' : 'claude-sonnet-5', eingaben, output_schema: outputSchema, freigabe, risiko: 'Render-Nachweis.', zeitgrenze_ms: 600000, nachfolger, status: 'OFFEN', lauf_id: null })
registriereWorkflow(
  {
    workflow_schema: 'v0',
    workflow_id: workflowId,
    auftrag_id: auftragId,
    version: 1,
    ziel: 'Zahlungsdienst im Testmodus anbinden.',
    status: 'OFFEN',
    aktiver_schritt_id: 'schritt-1-architekt',
    grenzen: { max_schritte: 6, max_replans: 1 },
    schritte: [
      schritt('schritt-1-architekt', 'architekt', 'lesend', 'codex', 'ergebnis-architektur', 'schritt-2-ausfuehrung', 'AUTOMATISCH'),
      schritt('schritt-2-ausfuehrung', 'ausfuehrung', 'schreibend', 'claude-code', null, null, 'ZWINGEND', ['artefakt:ergebnis-@schritt-1-architekt']),
    ],
  },
  profilReferenz,
  { basisVerzeichnis, schreiber: () => {} }
)
const start = await fetch(`${basis}/api/workflows/${workflowId}/starten`, { method: 'POST' })
console.log(`starten: ${start.status}`)
console.log(`Testinstanz B2a-2 offen: ${basis}/#/workflows/${workflowId} (workflowId ${workflowId}, Wurzel ${wurzel}, beenden mit Strg+C)`)
