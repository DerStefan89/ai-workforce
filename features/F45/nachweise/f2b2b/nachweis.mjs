#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/f2b2b/nachweis.mjs
 *
 * Zweck: F45 F-2b-2b (F-1075 Variante C) — echter Nachweis „geprüft = installiert“ für npm über die Wege der Oberfläche:
 * (1) Prüflauf context7-mcp (Katalog, MCP, `@upstash/context7-mcp@latest`) nach neuem Verfahren — npm install mit derselben
 *     Funktion wie die Installation, Paketordner von der Platte, Modelllauf der Rolle eignungspruefung — gegen eine eigene
 *     Leitstand-Instanz der Workforce (installWurzel = diese Installation, Wegwerf-Kontrollzustand in %TEMP%);
 * (2) „Freigeben & installieren“ über die Routen gegen eine ZWEITE Instanz mit derselben Berichtsablage, aber einer
 *     TEMP-installWurzel: Kopie von ressourcen.json, in der context7-mcp auf `wirkung: lokal` mit `installation_vorlage`
 *     (bin dist/index.js, Werkzeuge resolve-library-id/query-docs) steht — im echten Katalog ist er `extern_lesend` und nicht
 *     installierbar (E-F36-4, F-3); das ist eine benannte Fixture-Abweichung dieses Nachweises. cap-Ordner in %TEMP%.
 * Ergebnis: bericht-context7-mcp.json, lauf-context7-mcp.json (Init-Zeile, Kosten), installation.json (Dauer, Dateien, Größe,
 * Abgleich), ablauf.json. Kein Rohstrom, kein Inhalt der Quelle.
 *
 * Wird aufgerufen von: Hand (`node features/F45/nachweise/f2b2b/nachweis.mjs`), nicht von `npm run check`. Kostet einen
 * Modelllauf (Modell der Startvorlage) und lädt das Paket samt Abhängigkeiten zweimal aus der Registry.
 *
 * Wichtig: schreibt nichts in den Kontrollzustand der Workforce und nicht in das echte ressourcen.json (sha256 vorher/nachher
 * geprüft, Abbruch mit Exit 1 bei Abweichung).
 */

import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ladeArtefaktVersion } from '../../../../src/lineage-registry/index.ts'
import { erzeugeRequestHandler } from '../../../../scripts/leitstand-server.mjs'

const HIER = import.meta.dirname
const INSTALL = join(HIER, '..', '..', '..', '..')
const STARTVORLAGE = join(INSTALL, 'startvorlagen', 'ai-workforce.json')
const ID = 'context7-mcp'
const PORT_A = Number(process.env.F2B2B_PORT ?? 4393)
const PORT_B = PORT_A + 1
const hash = (pfad) => createHash('sha256').update(readFileSync(pfad)).digest('hex')
const ECHT = join(INSTALL, 'ressourcen.json')
const echtVorher = hash(ECHT)

const wurzel = mkdtempSync(join(tmpdir(), 'f45-f2b2b-nachweis-'))
const basisVerzeichnis = join(wurzel, 'kontrollzustand')
const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }
console.log(`Wegwerf-Wurzel: ${wurzel}`)

// Zweite installWurzel: Kopie von ressourcen.json (context7-mcp installierbar gemacht) und der Sammlungsdateien.
const installTemp = join(wurzel, 'install')
mkdirSync(join(installTemp, 'docs', 'harness'), { recursive: true })
for (const d of ['kandidaten-2026-09-15.md', 'stack-kandidaten.md']) writeFileSync(join(installTemp, 'docs', 'harness', d), readFileSync(join(INSTALL, 'docs', 'harness', d)))
const katalog = JSON.parse(readFileSync(ECHT, 'utf8'))
const eintrag = katalog.ressourcen.find((r) => r.id === ID)
Object.assign(eintrag, { wirkung: 'lokal', installation_vorlage: { bin: 'dist/index.js', args: [], werkzeuge: [`mcp__${ID}__resolve-library-id`, `mcp__${ID}__query-docs`] } })
writeFileSync(join(installTemp, 'ressourcen.json'), `${JSON.stringify(katalog, null, 2)}\n`)

const gemeinsam = { basisVerzeichnis, repoWurzel: INSTALL, cwd: INSTALL, startvorlagePfad: STARTVORLAGE, projektId: 'ai-workforce', istWorkforceInstanz: true, rohBasisVerzeichnis: join(wurzel, 'roh'), laufausgabeWurzel: join(wurzel, 'laufausgabe'), capWurzel: join(wurzel, 'cap') }
const serverA = createServer(erzeugeRequestHandler({ ...gemeinsam, installWurzel: INSTALL }))
const serverB = createServer(erzeugeRequestHandler({ ...gemeinsam, installWurzel: installTemp }))
await new Promise((r) => serverA.listen(PORT_A, '127.0.0.1', r))
await new Promise((r) => serverB.listen(PORT_B, '127.0.0.1', r))
const senden = async (port, methode, pfad, koerper) => {
  const a = await fetch(`http://127.0.0.1:${port}${pfad}`, { method: methode, ...(koerper !== undefined ? { body: JSON.stringify(koerper) } : {}) })
  return { status: a.status, koerper: await a.json().catch(() => ({})) }
}

/**
 * Zählt Dateien und Bytes unter einem Ordner.
 * @param ordner - Pfad
 * @returns { dateien, bytes }
 */
function groesse(ordner) {
  let dateien = 0
  let bytes = 0
  for (const name of readdirSync(ordner, { recursive: true })) {
    const st = statSync(join(ordner, String(name)))
    if (st.isFile()) {
      dateien++
      bytes += st.size
    }
  }
  return { dateien, bytes }
}

const ablauf = { wurzel, zeit: new Date().toISOString(), id: ID }
let exit = 0
try {
  // ─── (1) Prüflauf ───
  const vor = await senden(PORT_A, 'POST', '/api/sammlung/pruefung/vorbereiten', { katalog_id: ID })
  console.log(`vorbereiten (Prüfung): ${vor.status} ${vor.koerper.grund ?? JSON.stringify(vor.koerper.quelle)}`)
  ablauf.vorbereiten = { status: vor.status, grund: vor.koerper.grund ?? null, quelle: vor.koerper.quelle ?? null }
  if (vor.status !== 200) throw new Error(`vorbereiten ${vor.status}`)
  const beginn = Date.now()
  const start = await senden(PORT_A, 'POST', '/api/sammlung/pruefung', { katalog_id: ID, quelle: vor.koerper.quelle })
  console.log(`start: ${start.status} ${start.koerper.laufId ?? start.koerper.grund}`)
  if (start.status !== 202) throw new Error(`start ${start.status} ${start.koerper.grund}`)
  const laufId = start.koerper.laufId
  let zustand = null
  let holenFertig = null
  while (Date.now() - beginn < 1_200_000) {
    zustand = (await senden(PORT_A, 'GET', `/api/sammlung/pruefung/${encodeURIComponent(laufId)}`)).koerper
    if (holenFertig === null && zustand.phase !== 'holen') holenFertig = Date.now()
    if (zustand.phase === 'fertig' || zustand.phase === 'fehler') break
    await new Promise((r) => setTimeout(r, 2000))
  }
  console.log(`Phase: ${zustand?.phase} ${zustand?.grund ?? ''} ${zustand?.bericht?.ergebnis?.urteil ?? ''}`)
  const laufakte = ladeArtefaktVersion(`laufakte-${laufId}`, undefined, ladeOptionen)?.daten ?? null
  let init = null
  let result = null
  try {
    const roh = laufakte === null ? null : JSON.parse(readFileSync(laufakte.rohstrom_referenz.pfad, 'utf8'))
    const zeilen = roh === null ? [] : String(roh.stdout ?? '').split('\n').map((z) => {
      try {
        return JSON.parse(z)
      } catch {
        return null
      }
    })
    init = zeilen.find((z) => z?.type === 'system' && z?.subtype === 'init') ?? null
    result = zeilen.findLast((z) => z?.type === 'result') ?? null
  } catch (fehler) {
    console.error('Rohstrom nicht lesbar:', fehler)
  }
  const lauf = {
    lauf_id: laufId,
    phase: zustand?.phase ?? null,
    grund: zustand?.grund ?? null,
    dauer_holen_s: holenFertig === null ? null : Math.round((holenFertig - beginn) / 1000),
    dauer_gesamt_s: Math.round((Date.now() - beginn) / 1000),
    cli: init?.claude_code_version ?? null,
    modell: init?.model ?? null,
    init: init === null ? null : { skills: init.skills, plugins: init.plugins, mcp_servers: init.mcp_servers, tools: init.tools, agents: init.agents ?? null, slash_commands_anzahl: Array.isArray(init.slash_commands) ? init.slash_commands.length : null },
    permission_denials: result?.permission_denials ?? null,
    kosten_usd: result?.total_cost_usd ?? null,
    klassifikation: laufakte?.klassifikation ?? null,
    lauf_status: laufakte?.lauf_status ?? null,
  }
  writeFileSync(join(HIER, `lauf-${ID}.json`), `${JSON.stringify(lauf, null, 2)}\n`)
  if (zustand?.bericht) writeFileSync(join(HIER, `bericht-${ID}.json`), `${JSON.stringify(zustand.bericht, null, 2)}\n`)
  ablauf.pruefung = { phase: lauf.phase, grund: lauf.grund, urteil: zustand?.bericht?.ergebnis?.urteil ?? null, artefakt: zustand?.bericht?.artefakt_id ?? null, dateien: zustand?.bericht?.inhalt?.dateien?.length ?? null, dauer_holen_s: lauf.dauer_holen_s, dauer_gesamt_s: lauf.dauer_gesamt_s, kosten_usd: lauf.kosten_usd }
  if (zustand?.phase !== 'fertig') throw new Error(`Prüflauf ${zustand?.phase}: ${zustand?.grund}`)

  // ─── (2) Installation gegen die TEMP-installWurzel ───
  const v = await senden(PORT_B, 'POST', `/api/ressourcen/${ID}/installation/vorbereiten`)
  console.log(`vorbereiten (Installation): ${v.status} ${v.koerper.grund ?? `${v.koerper.version} Sperre=${JSON.stringify(v.koerper.pruefbericht_sperre)}`}`)
  ablauf.installation_vorbereiten = { status: v.status, grund: v.koerper.grund ?? null, version: v.koerper.version ?? null, integrity: v.koerper.integrity ?? null, pruefbericht_sperre: v.koerper.pruefbericht_sperre ?? null, pruefbericht_urteil: v.koerper.pruefbericht?.urteil ?? null }
  if (v.status !== 200) throw new Error(`vorbereiten (Installation) ${v.status}`)
  const i = await senden(PORT_B, 'POST', `/api/ressourcen/${ID}/installation`, { version: v.koerper.version, integrity: v.koerper.integrity, eintragHash: v.koerper.eintragHash })
  console.log(`installieren: ${i.status} ${i.koerper.grund ?? `${i.koerper.dauerMs} ms, Werkzeuge ${JSON.stringify(i.koerper.werkzeugeGefunden)}`}`)
  const zielordner = i.koerper.zielordner ?? join(gemeinsam.capWurzel, ID)
  const paketOrdner = join(zielordner, 'node_modules', '@upstash', 'context7-mcp')
  const installation = {
    status: i.status,
    grund: i.koerper.grund ?? null,
    version: i.koerper.version ?? null,
    integrity: i.koerper.integrity ?? null,
    dauer_ms: i.koerper.dauerMs ?? null,
    werkzeuge_gefunden: i.koerper.werkzeugeGefunden ?? null,
    paketordner: i.status === 200 ? groesse(paketOrdner) : null,
    node_modules_gesamt: i.status === 200 ? groesse(join(zielordner, 'node_modules')) : null,
    abgleich: i.status === 200 ? 'installierter Paketordner = geprüfte Dateiliste (Pfade + sha256), sonst wäre die Route 422' : null,
    katalog_kopie_freigabe: JSON.parse(readFileSync(join(installTemp, 'ressourcen.json'), 'utf8')).ressourcen.find((r) => r.id === ID)?.freigabe ?? null,
  }
  writeFileSync(join(HIER, 'installation.json'), `${JSON.stringify(installation, null, 2)}\n`)
  ablauf.installation = { status: installation.status, grund: installation.grund, dauer_ms: installation.dauer_ms, paketordner: installation.paketordner }
  if (i.status !== 200) throw new Error(`Installation ${i.status}: ${i.koerper.grund}`)
} catch (fehler) {
  console.error('Nachweis abgebrochen:', fehler)
  ablauf.fehler = String(fehler instanceof Error ? fehler.message : fehler)
  exit = 1
} finally {
  const echtNachher = hash(ECHT)
  ablauf.echtes_ressourcen_json_unveraendert = echtNachher === echtVorher
  if (echtNachher !== echtVorher) {
    console.error('ressourcen.json der Workforce hat sich geändert — Abbruch')
    exit = 1
  }
  writeFileSync(join(HIER, 'ablauf.json'), `${JSON.stringify(ablauf, null, 2)}\n`)
  console.log(`\nablauf.json geschrieben. Wegwerf-Wurzel (Rohstrom, Kontrollzustand, cap): ${wurzel}`)
  serverA.close()
  serverB.close()
  process.exit(exit)
}
