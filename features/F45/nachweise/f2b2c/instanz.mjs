#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/f2b2c/instanz.mjs
 *
 * Zweck: Leitstand-Testinstanz für den Render-Nachweis F45 F-2b-2c (render/erzeuge-nachweis.mjs). Installation = dieses Repo
 * (echte Sammlung, echter Katalog), aber eine Wegwerf-Ablage im Temp-Ordner:
 * - zwei Prüfberichte aus der Sammlung (Kernartefakte wie beim Prüflauf): `repos-planning-with-files` als Skill mit Ordner
 *   und SKILL.md (→ „Vormerken“) und `repos-gstack` über das ganze Repo (→ Grund „ganzes Repo“);
 * - eine lokale Fähigkeiten-Datei mit gespeichertem Stand, der nicht passt (→ Band „Stand vor dem letzten Neustart“, F-1061 (1)).
 * Kein Netz, kein Modell, ~/.ai-workforce bleibt unberührt. Die Prüfberichte tragen eine erfundene Commit-SHA (Anzeige).
 *
 * Wird aufgerufen von: Hand — `node features/F45/nachweise/f2b2c/instanz.mjs`; der Server bleibt offen, bis der Prozess
 * beendet wird. Nicht Teil von `npm run check`.
 */

import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { standPfadFuer } from '../../../../src/faehigkeiten/stand.ts'
import { registrierePruefbericht } from '../../../../src/sammlung/pruefbericht.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../../../../src/startvorlage/index.ts'
import { erzeugeRequestHandler } from '../../../../scripts/leitstand-server.mjs'
import { erzeugeLokalWaechter } from '../../../../scripts/leitstand/routen-faehigkeiten.mjs'

const INSTALL = join(import.meta.dirname, '..', '..', '..', '..')
const PORT = Number(process.env.F2B2C_PORT ?? 4395)
const wurzel = mkdtempSync(join(tmpdir(), 'f45-f2b2c-render-'))
const basisVerzeichnis = join(wurzel, 'kontrollzustand')
const startvorlagePfad = join(INSTALL, 'startvorlagen', 'ai-workforce.json')
const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage(startvorlagePfad))
const SHA = '3f2c9a1b7d4e5f60718293a4b5c6d7e8f9012345'

/**
 * Prüfbericht eines Sammlungseintrags (Form wie der Prüflauf, Ergebnis frei erfunden für die Anzeige).
 * @param id - Sammlungs-id
 * @param repo - GitHub-Repo
 * @param pfad - geprüfter Ordner ('' = ganzes Repo)
 * @param skillMd - SKILL.md direkt im Ordner
 */
function bericht(id, repo, pfad, skillMd) {
  registrierePruefbericht(
    `s-${id}`,
    {
      ergebnis: { urteil: 'MIT_AUFLAGEN', typ: 'skill', gepinnte_version: SHA, befunde: [{ bereich: 'modell_anweisungen', schwere: 'mittel', beleg: 'SKILL.md: verlangt Schreibzugriff auf Planungsdateien im Projektordner' }], auflagen: ['Nur in Projekten mit eigenem Arbeitsordner.'], zusammenfassung: 'Render-Fixture: Skill mit Anweisungen, ohne Hooks und ohne Installationsskripte.' },
      quelle: { art: 'git', repo: `https://github.com/${repo}.git`, ref: 'HEAD', sha: SHA, pfad },
      typ: 'skill',
      katalog_id: null,
      sammlung_id: id,
      urteil_sammlung: 'Referenz',
      ausnahme_begruendung: null,
      fakten: { dateien: 3, bytes: 5120, uebersprungen: { je_grund: {}, liste: [] }, umbenannt: [], skripte: {}, paket: null, hooks: [], skill_dateien: skillMd ? ['SKILL.md'] : [], agent_dateien: [] },
      inhalt: { dateien: [{ pfad: 'SKILL.md', sha256: 'a'.repeat(64) }] },
      herkunft: { commit_zeit: null, geaendert: null, pfleger: [], lizenz_registry: null },
      lauf_id: `render-f2b2c-${id}`,
      auftrag_id: `render-f2b2c-${id}`,
      erstellt_am: '2026-10-13T09:30:00.000Z',
    },
    null,
    profilReferenz,
    { basisVerzeichnis, schreiber: () => {} }
  )
}
bericht('repos-planning-with-files', 'OthmanAdi/planning-with-files', 'skills/planning-with-files', true)
bericht('repos-gstack', 'garrytan/gstack', '', false)

// F-1061 (1): Stand vor dem „Neustart“ passt nicht zur Datei → Band + Sperre.
const lokalPfad = join(wurzel, 'ai-workforce-home', 'faehigkeiten.lokal.json')
mkdirSync(join(wurzel, 'ai-workforce-home'), { recursive: true })
writeFileSync(lokalPfad, `${JSON.stringify({ faehigkeiten_lokal_schema: 'v0', projekte: { 'ai-workforce': { an: ['agent:qa'] } } }, null, 2)}\n`)
writeFileSync(standPfadFuer(lokalPfad), `${JSON.stringify({ faehigkeiten_stand_schema: 'v0', pfad: lokalPfad, hash: 'b'.repeat(64), zeitpunkt: '2026-10-12T18:05:00.000Z', quelle: 'route' }, null, 2)}\n`)

const leitstand = createServer(
  erzeugeRequestHandler({
    basisVerzeichnis,
    repoWurzel: INSTALL,
    installWurzel: INSTALL,
    startvorlagePfad,
    projektId: 'ai-workforce',
    istWorkforceInstanz: true,
    faehigkeitenLokalPfad: lokalPfad,
    faehigkeitenLokalWaechter: erzeugeLokalWaechter(lokalPfad, undefined, standPfadFuer(lokalPfad)),
    laufausgabeWurzel: join(wurzel, 'laufausgabe'),
    rohBasisVerzeichnis: join(wurzel, 'roh'),
  })
)
await new Promise((r) => leitstand.listen(PORT, '127.0.0.1', r))
console.log(`Testinstanz F-2b-2c offen: http://127.0.0.1:${PORT}/#/capabilities (Wurzel ${wurzel}, beenden mit Strg+C)`)
