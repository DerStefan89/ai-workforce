#!/usr/bin/env node
/**
 * Datei: scripts/jarvis-chat-nachweis.mjs
 *
 * Zweck: F26 WS-1 Glue-Skript (CLI, kein neuer HTTP-Endpunkt, Muster
 * scripts/route-auftrag.mjs). Nimmt die lauf_id eines bereits
 * ABGESCHLOSSENEN/ERFOLGREICHEN Laufs der Rolle 'jarvis' (ausgelöst über
 * POST /api/chat), liest dessen Laufakte, validiert das Ergebnis gegen
 * schemas/ergebnis-jarvis.schema.json (leseJarvisErgebnisAusLaufakte,
 * scripts/leitstand-server.mjs) und schreibt bei Erfolg einen
 * 'chat-<projektId>'-Kernartefakt (Checkpoint-Kette
 * 'lineage-chat-<projektId>') mit der Nachricht und der Jarvis-Antwort im
 * freien 'daten'-Feld (NICHT 'eingaben' — das ist für Datei-Referenzen mit
 * inhalts_hash reserviert). Validiert den geschriebenen Eintrag anschließend
 * gegen schemas/kontrollzustand-lineage-payload.schema.json
 * (validiereLineageEintrag) und gibt beides aus.
 *
 * Ersatz für die WS-2-View in diesem Auftrag (Chat-View + sichtbarer
 * Verlauf sind WS-2-Scope, features/F26/feature.md) — dieses Skript belegt
 * den Lineage-Mechanismus real, ohne ihn automatisch in POST /api/chat zu
 * verdrahten: die Handler-Instanz kennt ihre eigene Projekt-id nicht
 * (erzeugeRequestHandler bekommt sie nicht als Option, F25 WS-1), die
 * automatische Verlauf-Schreibung ist deshalb bewusst WS-2-Scope.
 *
 * Aufruf: node scripts/jarvis-chat-nachweis.mjs <lauf_id> <projekt_id> <nachricht>
 */

import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { ladeArtefaktVersion, registriereKernArtefakt, validiereLineageEintrag } from '../src/lineage-registry/index.ts'
import { ladeGueltigeCheckpoints } from '../src/checkpoint-store/index.ts'
import { leseJarvisErgebnisAusLaufakte } from './leitstand-server.mjs'

async function main() {
  const [laufId, projektId, nachricht] = process.argv.slice(2)
  if (!laufId || !projektId || !nachricht) {
    console.error('Nutzung: node scripts/jarvis-chat-nachweis.mjs <lauf_id> <projekt_id> <nachricht>')
    process.exitCode = 1
    return
  }

  const vorlage = ladeStartvorlage('startvorlagen/ai-workforce.json')
  const profilReferenz = leiteProfilReferenzAb(vorlage)

  const laufakteVersion = ladeArtefaktVersion(`laufakte-${laufId}`)
  if (laufakteVersion === null) {
    console.error(`Laufakte 'laufakte-${laufId}' nicht gefunden`)
    process.exitCode = 1
    return
  }

  const jarvisErgebnis = leseJarvisErgebnisAusLaufakte(laufakteVersion.daten)
  console.log('--- Jarvis-Ergebnis (aus Rohstrom gelesen, gegen ergebnis-jarvis.schema.json geprüft) ---')
  console.log(JSON.stringify(jarvisErgebnis, null, 2))

  if (!jarvisErgebnis.ok) {
    console.error('Jarvis-Ergebnis ist nicht valide — Abbruch, kein Lineage-Eintrag geschrieben.')
    process.exitCode = 1
    return
  }

  const { pfad, versionSequenz, inhaltsHash } = registriereKernArtefakt(
    `chat-${projektId}`,
    profilReferenz,
    { quelle: 'jarvis-chat', lauf_id: laufId },
    { nachricht, jarvisAntwort: jarvisErgebnis.ergebnis },
    undefined,
    {}
  )
  console.log('\n--- lineage-chat-Eintrag geschrieben ---')
  console.log(JSON.stringify({ pfad, versionSequenz, inhaltsHash }, null, 2))

  const eintraege = ladeGueltigeCheckpoints(`lineage-chat-${projektId}`)
  const letzter = eintraege[eintraege.length - 1]
  const verstoesse = validiereLineageEintrag(letzter)
  console.log('\n--- Validierung gegen schemas/kontrollzustand-lineage-payload.schema.json (validiereLineageEintrag) ---')
  console.log(JSON.stringify({ eintragAnzahl: eintraege.length, verstoesse }, null, 2))
  console.log('\n--- geschriebener Eintrag (payload.daten) ---')
  console.log(JSON.stringify(letzter.payload.daten, null, 2))
}

main().catch((fehler) => {
  console.error(fehler)
  process.exitCode = 1
})
