#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/b2b3b2b2a3/instanz.mjs
 *
 * Zweck: Leitstand-Testinstanz für den Render-Nachweis F45 B2b-3b-2b-2a-3 „Rückfrage-Kanal: Abnahme“ (render/erzeuge-nachweis.mjs).
 * Neutrale Umgebung als erster Import (F-1125). Drei Läufe, deren Terminalmarken der echte Evaluator schreibt (run_prepared zuerst,
 * Advisor M7): `lauf-kanal-verweigert` (VERWEIGERT, Ablehnungstext passt nicht, Zählung mit abgelaufener Rückfrage), `lauf-kanal-erfolg`
 * (ERFOLGREICH allein durch Stefan, volle Zählung mit unbeantworteten) und `lauf-kanal-r3` (VERWEIGERT, Protokoll nicht bestätigt, Grund
 * mit `<img>`-Text und U+202E). Kein echter CLI-Lauf.
 *
 * Wird aufgerufen von: Hand — `node features/F45/nachweise/b2b3b2b2a3/instanz.mjs`; bleibt offen bis Strg+C (oder
 * B2B3B2B2A3_ENDE_NACH_MS). Nicht Teil von `npm run check`.
 *
 * Wichtig: `neutrale-umgebung-starten.mjs` muss der ERSTE Import bleiben (Gate f45-b2b3e1 (p2b)).
 */

import '../../../../scripts/neutrale-umgebung-starten.mjs'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { erzeugeRequestHandler } from '../../../../scripts/leitstand-server.mjs'
import { kanonischesJson, schreibeWirkungsmarke, sha256Hex } from '../../../../src/checkpoint-store/index.ts'
import { registriereKernArtefakt } from '../../../../src/lineage-registry/index.ts'
import { klassifiziereLauf } from '../../../../src/result-evaluator/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../../../../src/startvorlage/index.ts'

const INSTALL = join(import.meta.dirname, '..', '..', '..', '..')
const PORT = Number(process.env.B2B3B2B2A3_PORT ?? 4408)
const wurzel = mkdtempSync(join(tmpdir(), 'f45-b2b3b2b2a3-render-'))
const kontroll = join(wurzel, 'kontrollzustand')
mkdirSync(kontroll, { recursive: true })
writeFileSync(join(wurzel, 'README.md'), '# Haushaltsbuch\n')
const vorlagePfad = join(INSTALL, 'startvorlagen', 'beispielprojekt.json')
const profil = leiteProfilReferenzAb(ladeStartvorlage(vorlagePfad))
const STILL = { basisVerzeichnis: kontroll, schreiber: () => {} }

const TEXT = 'Stefan hat den Befehl abgelehnt. (Ref render)'
const DENIAL = { tool_name: 'Bash', tool_use_id: 'toolu_r', tool_input: { command: 'npm publish --access public' } }
const stdout = (denials, text) =>
  `${JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'toolu_r', content: text, is_error: true }] } })}\n${JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: 'fertig', permission_denials: denials })}`
const protokoll = (laufId) => ({ rueckfragen_schema: 'v1', lauf_id: laufId, ab: 0, eintraege: [{ tool_use_id: 'toolu_r', tool_name: 'Bash', input_hash: sha256Hex(kanonischesJson(DENIAL.tool_input)), art: 'stefan_abgelehnt', grund: 'Stefan hat abgelehnt', zeit: '2026-10-17T10:00:00.000Z', befehl: DENIAL.tool_input.command, ablehnung_hash: sha256Hex(TEXT) }] })
const z = (felder) => ({ stefan_erlaubt: 0, stefan_abgelehnt: 0, frage_beantwortet: 0, nicht_browser: 0, abgelaufen: 0, lauf_ende: 0, automatisch: 0, ...felder })

/**
 * Lauf mit run_prepared, Laufakte und Terminalmarke über den echten Evaluator.
 * @param laufId - Lauf
 * @param text - Rohstrom-stdout
 * @param zusatz - Kanal-Eingaben der Klassifikation
 */
function lauf(laufId, text, zusatz, beendigungsart) {
  schreibeWirkungsmarke(laufId, profil, 'run_prepared', {}, STILL)
  const pfad = join(kontroll, `roh-${laufId}.json`)
  const roh = JSON.stringify({ stdout: text, stderr: '', exitCode: beendigungsart === undefined ? 0 : null, ...(beendigungsart !== undefined ? { beendigungsart } : {}) })
  writeFileSync(pfad, roh)
  const laufakte = { worker: 'claude-code', beobachtungsbasis_vollstaendig: true, rohstrom_referenz: { pfad, inhalts_hash: sha256Hex(roh) } }
  registriereKernArtefakt(`laufakte-${laufId}`, profil, { erzeuger: 'kern', schritt: 'render' }, laufakte, [], STILL)
  const e = klassifiziereLauf(laufId, profil, { laufakte, ...zusatz }, STILL)
  console.log(`${laufId}: ${e.ergebnis}`)
}

lauf('lauf-kanal-verweigert', stdout([DENIAL], 'Permission to use Bash has been denied.'), { rueckfragen: protokoll('lauf-kanal-verweigert'), rueckfrageZaehlung: z({ stefan_abgelehnt: 1, abgelaufen: 1 }) })
lauf('lauf-kanal-erfolg', stdout([DENIAL], TEXT), { rueckfragen: protokoll('lauf-kanal-erfolg'), rueckfrageZaehlung: z({ stefan_erlaubt: 2, stefan_abgelehnt: 1, frage_beantwortet: 1, nicht_browser: 1, abgelaufen: 1, lauf_ende: 1, automatisch: 2 }) })
lauf('lauf-kanal-r3', stdout([DENIAL], TEXT), { rueckfragen: null, rueckfrageAbweichung: 'Länge abweichend (Speicher 2, Datei 3) <img src=x onerror=alert(1)>‮', rueckfrageZaehlung: z({ stefan_abgelehnt: 1 }) })
// Korrekturrunde (qa 5, design-guardian 5): R3-Grund mit 500 Zeichen ohne Leerzeichen (wird auf 500 gekappt); TIMEOUT mit Zählung (code-reviewer 2).
lauf('lauf-kanal-r3-lang', stdout([DENIAL], TEXT), { rueckfragen: null, rueckfrageAbweichung: `Version-3-ungueltig:${'a1b2c3d4'.repeat(80)}`, rueckfrageZaehlung: z({ stefan_abgelehnt: 1 }) })
lauf('lauf-kanal-timeout', '', { rueckfragen: null, rueckfrageZaehlung: z({ stefan_abgelehnt: 1, lauf_ende: 1 }) }, 'TIMEOUT')

const handler = erzeugeRequestHandler({ basisVerzeichnis: kontroll, repoWurzel: wurzel, installWurzel: INSTALL, startvorlagePfad: vorlagePfad, laufausgabeWurzel: join(wurzel, 'laufausgabe'), rohBasisVerzeichnis: join(wurzel, 'roh') })
const leitstand = createServer(handler)
await new Promise((r) => leitstand.listen(PORT, '127.0.0.1', r))
console.log(`Testinstanz B2b-3b-2b-2a-3 offen: http://127.0.0.1:${PORT}/#/runs/lauf-kanal-verweigert (beenden mit Strg+C)`)
const endeNachMs = Number(process.env.B2B3B2B2A3_ENDE_NACH_MS ?? 0)
if (endeNachMs > 0) setTimeout(() => process.exit(0), endeNachMs)
