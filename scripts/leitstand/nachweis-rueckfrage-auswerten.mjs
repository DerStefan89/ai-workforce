#!/usr/bin/env node
/**
 * Datei: scripts/leitstand/nachweis-rueckfrage-auswerten.mjs
 *
 * Zweck: Auswertung eines echten Nachweislaufs mit eingeschaltetem Rückfrage-Kanal (F45 B2b-3b-2b-2b-1, features/F45/plan-b2b3b2b2b1-v2.md,
 * Anleitung docs/harness/rueckfrage-nachweislauf.md). Liest Laufakte, hash-geprüften Rohstrom, Protokoll `rueckfragen-<laufId>` und
 * Terminalmarke eines Laufs und gibt je Prüfpunkt P1–P13 „erfüllt“, „nicht erfüllt“ oder „nicht belegbar“ mit Fundstelle als Markdown aus
 * — CLI-abhängige Punkte bei einer anderen CLI-Version als deklariert „erfüllt mit Abweichung“ (E-F-1136 (1) = B, Stefan 17.10.2026)
 * (für features/F45/nachweise/b2b3b2b2b/). Fail closed: ohne Mindestbasis ist ein Punkt nie „erfüllt“.
 * Drei Teile: `leseNachweisDaten` (nur lesen, stille Schreiber — Advisor M1), `werteNachweisAus` (rein), `alsMarkdown` (rein).
 *
 * Aufruf: node scripts/leitstand/nachweis-rueckfrage-auswerten.mjs --lauf <laufId> [--projekt <id>] [--aus <datei.md>]
 * Exit 0 = Bericht erzeugt (auch mit „nicht erfüllt“; ein nicht abgeschlossener Lauf mit Warnung auf stderr), Exit 1 = Aufruf- oder Lesefehler
 * mit Grund (Lauf unbekannt, Projekt unbekannt, Register kaputt, `--aus` verboten oder nicht schreibbar).
 *
 * Wird aufgerufen von: Stefan (Anleitung), scripts/check-f45-b2b3b2b2b1-nachweis.mjs (b)(c)(d),
 * scripts/leitstand/nachweis-rueckfrage-auswerten.test.mjs.
 *
 * Wichtig:
 * - Nur lesend: keine Schreibwirkung im Kontrollzustand oder in `kontrollzustand-roh` (Gate (c)); `--aus` darf dort nicht liegen (M4).
 * - Die mcp-config eines Laufs ist nirgends gespeichert (Argv, Advisor V3) — url, Token, `--permission-prompt-tool` und Werkzeugsatz sind nur
 *   indirekt belegt (P6, P8); Frist und timeout stehen im Code (`ergaenzeRueckfrageAufruf`), ihre Wirkung in der CLI ist DEKLARIERT.
 * - Die Ausgabe wird committet: Pfade neutralisiert (Arbeitsordner, Installation, Temp, Home), Geheimnis-Muster maskiert, Steuerzeichen als
 *   Marke ⟦U+XXXX⟧ (M8).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { kanonischesJson, ladeGueltigeCheckpoints, sha256Hex, stelleLaufstatusFest } from '../../src/checkpoint-store/index.ts'
import { ermittleToolErgebnisse } from '../../src/claude-code-gateway/index.ts'
import { ladeArtefaktVersion, listeVersionen } from '../../src/lineage-registry/index.ts'
import { ladeProjektregisterMitLokal } from '../../src/projekte/index.ts'
import { CLI_TIMEOUT_ZUSATZ_MS, FRAGE_WERKZEUG, liegtImArbeitsordner, RECHTE_WERKZEUG, RUECKFRAGE_SERVER, SCHREIB_WERKZEUGE, SKRIPT_FRIST_ZUSATZ_MS } from '../../src/rueckfrage/index.ts'
import { neutralisiereText, setzeProtokollZusammen } from '../../src/rueckfrage/protokoll.ts'
import { maskiereGeheimnisse } from './geheimnisse-maskieren.mjs'
import { loeseProjektPfade } from './projekt-pfade.mjs'
import { WARTE_GRENZE_MS, zaehleProtokollEintraege } from './rueckfrage-vermittlung.mjs'

/** Ergebnisse eines Prüfpunkts. */
export const ERFUELLT = 'erfüllt'
export const NICHT_ERFUELLT = 'nicht erfüllt'
export const NICHT_BELEGBAR = 'nicht belegbar'
/** E-F-1136 (1) = B: erfüllt, aber mit einer anderen CLI-Version als in der Startvorlage deklariert (nur CLI-abhängige Punkte). */
export const ERFUELLT_MIT_ABWEICHUNG = 'erfüllt mit Abweichung'

/** Punkte, die vom Verhalten der CLI im Lauf abhängen (Argv, Ablehnungen, tool_result, init-Zeile, Startfreigabe, Prompt-Werkzeug). */
const CLI_ABHAENGIG = new Set(['P1', 'P2', 'P4', 'P4b', 'P5', 'P7', 'P8', 'P10', 'P11'])
/** Versionsnummer in einer Versionsangabe („2.1.300 (Claude Code)“ bzw. „2.1.300“). */
const VERSION_MUSTER = /\d+\.\d+\.\d+/

/**
 * Vergleicht die deklarierte CLI-Version (Laufakte `werkzeug_version_deklariert`, aus der Startvorlage) mit der im Lauf (erste init-Zeile
 * des hash-geprüften Rohstroms, `claude_code_version`). Nur die Versionsnummer zählt; fehlt eine Seite ⇒ unbekannt.
 * @param laufakte - daten der Laufakte oder null
 * @param roh - zerlegter Rohstrom oder null
 * @returns { status: 'gleich' | 'abweichend' | 'unbekannt', text }
 */
function vergleicheCliVersion(laufakte, roh) {
  const deklariert = typeof laufakte?.werkzeug_version_deklariert === 'string' ? laufakte.werkzeug_version_deklariert : null
  const imLauf = typeof roh?.init?.zeile.claude_code_version === 'string' ? roh.init.zeile.claude_code_version : null
  const soll = deklariert?.match(VERSION_MUSTER)?.[0] ?? null
  const ist = imLauf?.match(VERSION_MUSTER)?.[0] ?? null
  const text = `deklariert ${deklariert ?? '—'} (Laufakte werkzeug_version_deklariert), im Lauf ${imLauf ?? '—'} (Rohstrom${roh?.init ? ` Z${roh.init.nr}` : ''} init claude_code_version)`
  if (soll === null || ist === null) return { status: 'unbekannt', text }
  return { status: soll === ist ? 'gleich' : 'abweichend', text }
}

/** Installationswurzel dieses Checkouts (Advisor M2: aus der Dateilage, nicht aus cwd). */
export const INSTALL_WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** Stiller Schreiber (M1): die Standard-Schreiber von Checkpoint-Store und Lineage schreiben auf stdout. */
const STILL = () => {}
/** Arten einer Frage im Protokoll; alles andere ist eine Rechte-Anfrage. */
const FRAGE_ARTEN = new Set(['frage_beantwortet', 'frage_ohne_antwort'])
/** Arten, mit denen eine Rechte-Anfrage bei Stefan war (vorgelegt, nicht automatisch). */
const AN_STEFAN = new Set(['stefan_erlaubt', 'stefan_abgelehnt', 'zeitueberschreitung', 'lauf_beendet'])
/** Arten einer Antwort von Stefan (tragen `herkunft`). */
const ANTWORT_ARTEN = new Set(['stefan_erlaubt', 'stefan_abgelehnt', 'frage_beantwortet'])
/** Felder der Zählung in der Terminalmarke (F-1132 (1)) — aus derselben Zählregel wie die Vermittlung. */
const ZAEHLUNG_FELDER = Object.keys(zaehleProtokollEintraege([]))

const istObjekt = (wert) => typeof wert === 'object' && wert !== null && !Array.isArray(wert)
const punkt = (id, titel, ergebnis, fundstelle, details = []) => ({ id, titel, ergebnis, fundstelle, details })

/**
 * Fasst Teilergebnisse zusammen: ein „nicht erfüllt“ gewinnt, „erfüllt“ nur, wenn alle erfüllt sind, sonst „nicht belegbar“.
 * @param teile - Liste der Teilergebnisse
 * @returns Gesamtergebnis
 */
function fasseZusammen(teile) {
  if (teile.includes(NICHT_ERFUELLT)) return NICHT_ERFUELLT
  return teile.length > 0 && teile.every((t) => t === ERFUELLT) ? ERFUELLT : NICHT_BELEGBAR
}

/**
 * Liest alles, was die Auswertung braucht, nur lesend aus dem Kontrollzustand der Instanz und dem Rohstrom unter der Installationswurzel.
 * @param {object} eingabe
 * @param {string} eingabe.laufId - Lauf
 * @param {string} eingabe.basisVerzeichnis - Kontrollzustand der Instanz des Projekts
 * @param {string} eingabe.installWurzel - Installationswurzel (Rohstrom `kontrollzustand-roh/<laufId>/rohstrom.json`, F-683)
 * @returns { laufId, laufakte, roh, protokoll, laufStatus, runPrepared, kettenLaenge, terminal } — wirft bei ungültiger laufId
 */
export function leseNachweisDaten({ laufId, basisVerzeichnis, installWurzel }) {
  const optionen = { basisVerzeichnis, schreiber: STILL }
  const laufakte = ladeArtefaktVersion(`laufakte-${laufId}`, undefined, optionen)?.daten ?? null
  const kette = ladeGueltigeCheckpoints(laufId, optionen)
  const laufStatus = stelleLaufstatusFest(laufId, optionen)
  const terminalEintrag = laufStatus.status === 'ABGESCHLOSSEN' ? kette.find((e) => e.typ === 'wirkungsmarke' && e.payload?.sequenz === laufStatus.terminalSequenz) : undefined
  const terminal = terminalEintrag === undefined ? null : { ergebnis: terminalEintrag.payload.ergebnis ?? null, daten: istObjekt(terminalEintrag.payload.daten) ? terminalEintrag.payload.daten : {} }
  const runPrepared = kette.some((e) => e.typ === 'wirkungsmarke' && e.payload?.art === 'run_prepared')
  return { laufId, laufakte, roh: leseRohstrom(laufakte, laufId, installWurzel), protokoll: leseProtokoll(laufId, optionen), laufStatus, runPrepared, kettenLaenge: kette.length, terminal }
}

/**
 * Rohstrom der Laufakte — nur am erwarteten Ort (M2) und nur mit passendem Hash (vor dem Parsen).
 * @param laufakte - daten der Laufakte oder null
 * @param laufId - Lauf
 * @param installWurzel - Installationswurzel
 * @returns { status: 'ok', zeilen } | { status, grund }
 */
function leseRohstrom(laufakte, laufId, installWurzel) {
  const referenz = laufakte?.rohstrom_referenz
  if (typeof referenz?.pfad !== 'string' || typeof referenz.inhalts_hash !== 'string') return { status: 'fehlt', grund: 'Laufakte ohne Rohstrom-Referenz' }
  const erwartet = [`kontrollzustand-roh/${laufId}/rohstrom.json`, `kontrollzustand-roh\\${laufId}\\rohstrom.json`]
  if (!erwartet.includes(referenz.pfad)) return { status: 'pfad', grund: 'Rohstrom-Pfad nicht am erwarteten Ort (kontrollzustand-roh/<laufId>/rohstrom.json)' }
  let inhalt
  try {
    inhalt = readFileSync(join(installWurzel, 'kontrollzustand-roh', laufId, 'rohstrom.json'), 'utf8')
  } catch (fehler) {
    return { status: 'fehlt', grund: `Rohstrom nicht lesbar (${fehler.code ?? fehler.message})` }
  }
  if (sha256Hex(inhalt) !== referenz.inhalts_hash) return { status: 'hash', grund: 'Rohstrom-Hash weicht von der Laufakte ab' }
  try {
    const roh = JSON.parse(inhalt)
    return typeof roh?.stdout === 'string' ? { status: 'ok', zeilen: roh.stdout.split('\n') } : { status: 'fehlt', grund: 'Rohstrom ohne stdout' }
  } catch {
    return { status: 'fehlt', grund: 'Rohstrom ist kein JSON' }
  }
}

/**
 * Protokoll `rueckfragen-<laufId>` wie im Controller zusammengesetzt (alle Versionen, lückenlos).
 * @param laufId - Lauf
 * @param optionen - { basisVerzeichnis, schreiber }
 * @returns { status: 'ok', eintraege, versionen } | { status: 'fehlt' | 'ungueltig', grund, versionen }
 */
function leseProtokoll(laufId, optionen) {
  const versionen = listeVersionen(`rueckfragen-${laufId}`, optionen)
  if (versionen.length === 0) return { status: 'fehlt', grund: 'kein Rückfrage-Protokoll im Kontrollzustand dieser Instanz', versionen: 0 }
  const zusammen = setzeProtokollZusammen(versionen, laufId)
  if (!zusammen.ok) return { status: 'ungueltig', grund: zusammen.grund, versionen: versionen.length }
  return { status: 'ok', eintraege: zusammen.daten.eintraege, versionen: versionen.length }
}

/**
 * Zerlegt den stdout des Rohstroms: erste init-Zeile, letzte result-Zeile, tool_result-Blöcke mit Zeile und Subagent-Bezug.
 * @param zeilen - NDJSON-Zeilen
 * @returns { init, initAnzahl, sitzungen, result, ergebnisse, toolResults }
 */
function zerlegeRohstrom(zeilen) {
  let init = null
  let initAnzahl = 0
  let result = null
  const sitzungen = new Set()
  const toolResults = []
  zeilen.forEach((roh, i) => {
    let zeile
    try {
      zeile = JSON.parse(roh.trim())
    } catch {
      return
    }
    if (!istObjekt(zeile)) return
    if (zeile.type === 'system' && zeile.subtype === 'init') {
      initAnzahl++
      if (typeof zeile.session_id === 'string') sitzungen.add(zeile.session_id)
      if (init === null) init = { nr: i + 1, zeile }
    }
    if (zeile.type === 'result') result = { nr: i + 1, zeile }
    const inhalt = zeile.type === 'user' && istObjekt(zeile.message) && Array.isArray(zeile.message.content) ? zeile.message.content : []
    for (const block of inhalt) {
      if (!istObjekt(block) || block.type !== 'tool_result' || typeof block.tool_use_id !== 'string') continue
      toolResults.push({ nr: i + 1, id: block.tool_use_id, fehler: block.is_error === true, text: typeof block.content === 'string' ? block.content : null, subagent: typeof zeile.parent_tool_use_id === 'string' })
    }
  })
  return { init, initAnzahl, sitzungen, result, ergebnisse: ermittleToolErgebnisse(zeilen), toolResults }
}

/**
 * Wertet einen Nachweislauf aus (rein). Fail closed: ohne Mindestbasis „nicht belegbar“.
 * @param daten - Ergebnis von leseNachweisDaten
 * @param kontext - { projektId, erwarteterUrlPfad }
 * @returns { kopf, punkte: [{ id, titel, ergebnis, fundstelle, details }] }
 */
export function werteNachweisAus(daten, kontext) {
  const roh = daten.roh?.status === 'ok' ? zerlegeRohstrom(daten.roh.zeilen) : null
  const rohGrund = daten.roh?.grund ?? 'Rohstrom nicht lesbar'
  const prot = daten.protokoll?.status === 'ok' ? daten.protokoll.eintraege : null
  const protGrund = daten.protokoll?.grund ?? 'Protokoll nicht lesbar'
  const denials = Array.isArray(roh?.result?.zeile.permission_denials) ? roh.result.zeile.permission_denials : null
  const resultStelle = roh?.result === null || roh === null ? 'Rohstrom (keine result-Zeile)' : `Rohstrom Z${roh.result.nr} permission_denials`
  /** Protokolleinträge je tool_use_id (Index). */
  const jeId = new Map()
  for (const [i, e] of (prot ?? []).entries()) {
    if (typeof e?.tool_use_id !== 'string') continue
    jeId.set(e.tool_use_id, [...(jeId.get(e.tool_use_id) ?? []), i])
  }
  const marke = daten.terminal?.daten ?? null
  const punkte = []

  // P1 F-1128 (4): permission_denials[].tool_input kanonisch gleich dem input an rechte_pruefen.
  if (roh === null) punkte.push(punkt('P1', 'F-1128 (4) Eingabe der Ablehnung = Eingabe an rechte_pruefen', NICHT_BELEGBAR, rohGrund))
  else if (prot === null) punkte.push(punkt('P1', 'F-1128 (4) Eingabe der Ablehnung = Eingabe an rechte_pruefen', NICHT_BELEGBAR, protGrund))
  else {
    const paare = (denials ?? []).flatMap((d, i) => (istObjekt(d) && jeId.has(d.tool_use_id) ? [{ i, d, k: jeId.get(d.tool_use_id)[0] }] : []))
    const details = paare.map(({ i, d, k }) => `${sha256Hex(kanonischesJson(d.tool_input ?? null)) === prot[k].input_hash ? 'gleich' : 'ABWEICHEND'}: permission_denials[${i}] (${d.tool_name}) ↔ Protokoll Eintrag ${k}`)
    const ohne = (denials ?? []).length - paare.length
    if (ohne > 0) details.push(`${ohne} Ablehnung(en) ohne Protokolleintrag (statisch gesperrt oder über der Protokollgrenze) — nicht verglichen`)
    const ergebnis = paare.length === 0 ? NICHT_BELEGBAR : details.some((z) => z.startsWith('ABWEICHEND')) ? NICHT_ERFUELLT : ERFUELLT
    punkte.push(punkt('P1', 'F-1128 (4) Eingabe der Ablehnung = Eingabe an rechte_pruefen', ergebnis, paare.length === 0 ? 'keine Ablehnung mit Protokolleintrag gleicher ID' : `${resultStelle} ↔ Protokoll`, details))
  }

  // P2 F-1128 (4): doppelte IDs in permission_denials.
  if (denials === null || denials.length === 0) punkte.push(punkt('P2', 'F-1128 (4) keine doppelte ID in permission_denials', NICHT_BELEGBAR, roh === null ? rohGrund : 'keine Ablehnung im Ergebnisobjekt'))
  else {
    const ids = denials.map((d) => d?.tool_use_id)
    const doppelt = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))]
    punkte.push(punkt('P2', 'F-1128 (4) keine doppelte ID in permission_denials', doppelt.length === 0 ? ERFUELLT : NICHT_ERFUELLT, resultStelle, [`${denials.length} Ablehnung(en)`, ...doppelt.map((id) => `doppelt: ${id}`)]))
  }

  // P3 F-1128 (4): --resume.
  if (roh === null || roh.init === null) punkte.push(punkt('P3', 'F-1128 (4) Verhalten bei --resume', NICHT_BELEGBAR, roh === null ? rohGrund : 'keine init-Zeile'))
  else {
    const mehrere = roh.initAnzahl > 1 || roh.sitzungen.size > 1
    punkte.push(
      punkt('P3', 'F-1128 (4) Verhalten bei --resume', mehrere ? NICHT_ERFUELLT : NICHT_BELEGBAR, `Rohstrom Z${roh.init.nr} (init)`, [
        `${roh.initAnzahl} init-Zeile(n), ${roh.sitzungen.size} Sitzung(en)`,
        mehrere ? 'mehr als eine Sitzung im Rohstrom — unerwartet, die Workforce startet jeden Lauf neu' : 'im Produkt nicht erreichbar: die Workforce ruft die CLI nie mit --resume auf (vorgaengerLaufId ist ein neuer Lauf)',
      ])
    )
  }

  // P4 / P4b O6: tool_result der von Stefan abgelehnten ID trägt den Ablehnungstext wörtlich als String.
  const abgelehnt = (prot ?? []).flatMap((e, k) => (e.art === 'stefan_abgelehnt' && typeof e.tool_use_id === 'string' ? [{ e, k }] : []))
  if (roh === null || prot === null || abgelehnt.length === 0) {
    const grund = roh === null ? rohGrund : prot === null ? protGrund : 'keine Ablehnung durch Stefan im Protokoll'
    punkte.push(punkt('P4', 'O6 Ablehnungstext wörtlich als String im tool_result', NICHT_BELEGBAR, grund))
    punkte.push(punkt('P4b', 'O6 dasselbe in Subagent-Zeilen', NICHT_BELEGBAR, grund))
  } else {
    const traegt = (b, e) => b.fehler && typeof b.text === 'string' && sha256Hex(b.text) === e.ablehnung_hash
    const details = abgelehnt.map(({ e, k }) => {
      const liste = roh.ergebnisse.get(e.tool_use_id) ?? []
      const ok = liste.length > 0 && liste.every((b) => traegt(b, e))
      const zeilen = roh.toolResults.filter((b) => b.id === e.tool_use_id).map((b) => `Z${b.nr}`)
      return `${ok ? 'wörtlich' : 'ABWEICHEND'}: Protokoll Eintrag ${k} ↔ ${zeilen.length > 0 ? zeilen.join(', ') : 'kein tool_result'}${liste.some((b) => b.text === null) ? ' (content kein String)' : ''}`
    })
    punkte.push(punkt('P4', 'O6 Ablehnungstext wörtlich als String im tool_result', details.every((z) => z.startsWith('wörtlich')) ? ERFUELLT : NICHT_ERFUELLT, 'Rohstrom tool_result ↔ Protokoll ablehnung_hash', details))
    const sub = abgelehnt.flatMap(({ e }) => roh.toolResults.filter((b) => b.subagent && b.id === e.tool_use_id).map((b) => ({ b, e })))
    if (sub.length === 0) punkte.push(punkt('P4b', 'O6 dasselbe in Subagent-Zeilen', NICHT_BELEGBAR, 'keine Subagent-Zeile zu einer abgelehnten ID (Werkzeugsatz ohne Agent-Werkzeug)'))
    else punkte.push(punkt('P4b', 'O6 dasselbe in Subagent-Zeilen', sub.every(({ b, e }) => traegt(b, e)) ? ERFUELLT : NICHT_ERFUELLT, sub.map(({ b }) => `Rohstrom Z${b.nr}`).join(', ')))
  }

  // P5 F-1126 (6): lehnt der Kanal Bash wegen unbekannter Felder ab?
  if (prot === null) punkte.push(punkt('P5', 'F-1126 (6) keine Ablehnung wegen unbekannter Bash-Felder', NICHT_BELEGBAR, protGrund))
  else {
    const gruppen = new Map()
    for (const e of prot.filter((x) => x.art === 'auto_deny')) {
      const gruppe = String(e.grund).split(':')[0]
      gruppen.set(gruppe, (gruppen.get(gruppe) ?? 0) + 1)
    }
    const unbekannt = prot.filter((e) => e.art === 'auto_deny' && String(e.grund).startsWith('unbekanntes Eingabefeld'))
    const anStefan = prot.filter((e) => e.tool_name === 'Bash' && AN_STEFAN.has(e.art)).length
    const ergebnis = unbekannt.length > 0 ? NICHT_ERFUELLT : anStefan === 0 ? NICHT_BELEGBAR : ERFUELLT
    punkte.push(
      punkt('P5', 'F-1126 (6) keine Ablehnung wegen unbekannter Bash-Felder', ergebnis, 'Protokoll auto_deny-Gründe', [
        `${anStefan} Bash-Anfrage(n) bei Stefan`,
        ...[...gruppen].map(([g, n]) => `auto_deny „${g}“: ${n}`),
        ...unbekannt.map((e) => `Grund: ${e.grund}`),
      ])
    )
  }

  // P6 F-1132 (2): API-Basis der Instanz (indirekt — ein fremdes Token ergibt 403 ohne Eintrag).
  punkte.push(
    prot !== null && prot.length > 0
      ? punkt('P6', 'F-1132 (2) url = API-Basis dieser Instanz (indirekt)', ERFUELLT, `Protokoll rueckfragen-${daten.laufId} im Kontrollzustand der Instanz ${kontext.projektId}`, [
          `${prot.length} Eintrag/Einträge in ${daten.protokoll.versionen} Version(en)`,
          `erwarteter url-Pfad: …${kontext.erwarteterUrlPfad} (rueckfrageOptionFuer)`,
        ])
      : punkt('P6', 'F-1132 (2) url = API-Basis dieser Instanz (indirekt)', NICHT_BELEGBAR, prot === null ? protGrund : 'Protokoll ohne Eintrag')
  )

  // P7 F-1132 (9): init-Zeile mit Rückfrage-Server.
  if (roh === null || roh.init === null) punkte.push(punkt('P7', 'F-1132 (9) init-Zeile mit Rückfrage-Server', NICHT_BELEGBAR, roh === null ? rohGrund : 'keine init-Zeile'))
  else {
    const server = Array.isArray(roh.init.zeile.mcp_servers) ? roh.init.zeile.mcp_servers : []
    const werkzeuge = Array.isArray(roh.init.zeile.tools) ? roh.init.zeile.tools : []
    const eintrag = server.find((s) => s?.name === RUECKFRAGE_SERVER)
    const teile = [eintrag?.status === 'connected', werkzeuge.includes(FRAGE_WERKZEUG), !werkzeuge.includes(RECHTE_WERKZEUG)]
    punkte.push(
      punkt('P7', 'F-1132 (9) init-Zeile mit Rückfrage-Server', teile.every(Boolean) ? ERFUELLT : NICHT_ERFUELLT, `Rohstrom Z${roh.init.nr} (init)`, [
        `Server ${RUECKFRAGE_SERVER}: ${eintrag === undefined ? 'fehlt' : String(eintrag.status)}`,
        `${FRAGE_WERKZEUG} in tools: ${teile[1] ? 'ja' : 'nein'}`,
        `${RECHTE_WERKZEUG} für das Modell verborgen: ${teile[2] ? 'ja' : 'nein'}`,
      ])
    )
  }

  // P8 Argv indirekt (Advisor V3): --permission-prompt-tool, frage_stefan erlaubt, --strict-mcp-config.
  if (roh === null || roh.init === null || prot === null) punkte.push(punkt('P8', 'Kanal-Argv indirekt belegt', NICHT_BELEGBAR, roh === null ? rohGrund : prot === null ? protGrund : 'keine init-Zeile'))
  else {
    const rechte = prot.filter((e) => !FRAGE_ARTEN.has(e.art))
    const fragen = prot.filter((e) => FRAGE_ARTEN.has(e.art))
    const frageAlsRechte = rechte.filter((e) => e.tool_name === FRAGE_WERKZEUG)
    const liste = Array.isArray(roh.init.zeile.mcp_servers) ? roh.init.zeile.mcp_servers : null
    const namen = (liste ?? []).map((s) => String(s?.name))
    const fremde = namen.filter((n) => n !== RUECKFRAGE_SERVER)
    // code-reviewer 1: ohne Server-Liste oder ohne rueckfrage kein Beleg (fail closed).
    const strikt = liste !== null && namen.includes(RUECKFRAGE_SERVER) && fremde.length === 0 ? ERFUELLT : NICHT_BELEGBAR
    const teile = [rechte.length > 0 ? ERFUELLT : NICHT_BELEGBAR, frageAlsRechte.length > 0 ? NICHT_ERFUELLT : fragen.length > 0 ? ERFUELLT : NICHT_BELEGBAR, strikt]
    punkte.push(
      punkt('P8', 'Kanal-Argv indirekt belegt', fasseZusammen(teile), `Protokoll + Rohstrom Z${roh.init.nr} (init)`, [
        `--permission-prompt-tool ${RECHTE_WERKZEUG}: ${teile[0]} (${rechte.length} Rechte-Anfrage(n) über den Kanal)`,
        `${FRAGE_WERKZEUG} in --allowedTools: ${teile[1]} (${fragen.length} Frage(n), ${frageAlsRechte.length} als Rechte-Anfrage)`,
        `--strict-mcp-config: ${teile[2]} (Server in init: ${liste === null ? 'Feld fehlt' : namen.join(', ') || 'keine'}${fremde.length > 0 ? ' — weitere Server können Katalog-MCPs des Laufs sein' : ''}; schwacher Beleg: ohne MCP-Server auf Nutzerebene sähe die init-Zeile auch ohne das Flag so aus)`,
      ])
    )
  }

  // P9 F-1132 (6): Zählung der Terminalmarke = Zählung aus der Protokoll-Datei (Ende zu Ende).
  const zaehlungMarke = marke?.rueckfrage_zaehlung
  if (prot === null || prot.length === 0) punkte.push(punkt('P9', 'F-1132 (6) Zählung Terminalmarke = Protokoll', NICHT_BELEGBAR, prot === null ? protGrund : 'Protokoll ohne Eintrag'))
  else if (!istObjekt(zaehlungMarke) || !ZAEHLUNG_FELDER.every((f) => Number.isInteger(zaehlungMarke[f]))) punkte.push(punkt('P9', 'F-1132 (6) Zählung Terminalmarke = Protokoll', NICHT_BELEGBAR, 'Terminalmarke ohne vollständige rueckfrage_zaehlung'))
  else {
    const datei = zaehleProtokollEintraege(prot)
    const abweichend = ZAEHLUNG_FELDER.filter((f) => datei[f] !== zaehlungMarke[f])
    const hinweis =
      abweichend.length === 1 && zaehlungMarke[abweichend[0]] > datei[abweichend[0]]
        ? abweichend[0] === 'automatisch'
          ? 'nur automatisch größer — Ablehnungen über der Protokollgrenze ohne Eintrag?'
          : abweichend[0] === 'lauf_ende'
            ? 'nur lauf_ende größer — lauf_beendet-Einträge nach dem Lauf-Ende nicht geschrieben?'
            : null
        : null
    punkte.push(
      punkt('P9', 'F-1132 (6) Zählung Terminalmarke = Protokoll', abweichend.length === 0 ? ERFUELLT : NICHT_ERFUELLT, 'Terminalmarke daten.rueckfrage_zaehlung ↔ Protokoll', [
        ...ZAEHLUNG_FELDER.map((f) => `${f}: Marke ${zaehlungMarke[f]}, Datei ${datei[f]}${datei[f] === zaehlungMarke[f] ? '' : ' — ABWEICHEND'}`),
        ...(hinweis === null ? [] : [hinweis]),
      ])
    )
  }

  // P10 F-1132 (9): Startfreigabe mit Kanal-Argv bestanden (run_prepared nach pruefeStartfreigabe, init-Zeile).
  if (!daten.runPrepared) punkte.push(punkt('P10', 'F-1132 (9) Startfreigabe mit Kanal-Argv bestanden', daten.kettenLaenge > 0 ? NICHT_ERFUELLT : NICHT_BELEGBAR, 'Checkpoint-Kette des Laufs', [daten.kettenLaenge > 0 ? 'kein run_prepared — Start verweigert?' : 'keine Checkpoint-Kette']))
  else if (roh === null || roh.init === null) punkte.push(punkt('P10', 'F-1132 (9) Startfreigabe mit Kanal-Argv bestanden', NICHT_BELEGBAR, roh === null ? rohGrund : 'keine init-Zeile'))
  else if (!(Array.isArray(roh.init.zeile.mcp_servers) && roh.init.zeile.mcp_servers.some((s) => s?.name === RUECKFRAGE_SERVER)))
    punkte.push(punkt('P10', 'F-1132 (9) Startfreigabe mit Kanal-Argv bestanden', NICHT_BELEGBAR, `Rohstrom Z${roh.init.nr} (init)`, ['Lauf ohne Rückfrage-Server in der init-Zeile — die Startfreigabe galt einem Argv ohne Kanal']))
  else punkte.push(punkt('P10', 'F-1132 (9) Startfreigabe mit Kanal-Argv bestanden', ERFUELLT, `Checkpoint-Kette run_prepared + Rohstrom Z${roh.init.nr} (init mit Server ${RUECKFRAGE_SERVER})`))

  // P11 Pfadgrenze: Datei-Werkzeug außerhalb ⇒ genau ein auto_deny mit Pfad-Grund, tool_result is_error.
  const schreib = (denials ?? []).filter((d) => SCHREIB_WERKZEUGE.has(d?.tool_name))
  if (roh === null || prot === null || schreib.length === 0) punkte.push(punkt('P11', 'Pfadgrenze: Schreibzugriff außerhalb automatisch abgelehnt', NICHT_BELEGBAR, roh === null ? rohGrund : prot === null ? protGrund : 'keine Write/Edit-Ablehnung im Lauf'))
  else {
    const teile = []
    const details = schreib.map((d) => {
      const idx = jeId.get(d.tool_use_id) ?? []
      if (idx.length === 0) {
        teile.push(NICHT_BELEGBAR)
        return `${d.tool_name}: kein Protokolleintrag (statisch gesperrt oder über der Protokollgrenze, nicht über den Kanal)`
      }
      const e = prot[idx[0]]
      const blocke = roh.ergebnisse.get(d.tool_use_id) ?? []
      const ok = idx.length === 1 && e.art === 'auto_deny' && String(e.grund).startsWith('Pfad außerhalb') && blocke.length > 0 && blocke.every((b) => b.fehler)
      teile.push(ok ? ERFUELLT : NICHT_ERFUELLT)
      return `${d.tool_name}: Protokoll Eintrag ${idx.join('/')} ${e.art} „${e.grund}“, tool_result is_error: ${blocke.length > 0 && blocke.every((b) => b.fehler) ? 'ja' : 'nein'}`
    })
    punkte.push(punkt('P11', 'Pfadgrenze: Schreibzugriff außerhalb automatisch abgelehnt', fasseZusammen(teile), `${resultStelle} ↔ Protokoll`, details))
  }

  // P12 F-1132 (6) Teil R3: Speicher = Datei im echten Pfad.
  if (marke === null) punkte.push(punkt('P12', 'F-1132 (6) R3: Speicher = Datei im echten Pfad', NICHT_BELEGBAR, 'keine Terminalmarke'))
  else {
    const abgleich = marke.rueckfrage_abgleich
    const bestaetigt = daten.terminal.ergebnis === 'ERFOLGREICH' && Number.isInteger(marke.abgelehnt_durch_stefan) && marke.abgelehnt_durch_stefan > 0
    const ergebnis = typeof marke.rueckfrage_abweichung === 'string' ? NICHT_ERFUELLT : bestaetigt || abgleich?.art === 'abgleich' ? ERFUELLT : NICHT_BELEGBAR
    punkte.push(
      punkt('P12', 'F-1132 (6) R3: Speicher = Datei im echten Pfad', ergebnis, 'Terminalmarke daten', [
        `Ergebnis ${daten.terminal.ergebnis}, abgelehnt_durch_stefan ${marke.abgelehnt_durch_stefan ?? '—'}, rueckfrage_abgleich ${istObjekt(abgleich) ? `${abgleich.art}/${abgleich.grund}` : '—'}`,
        typeof marke.rueckfrage_abweichung === 'string' ? `rueckfrage_abweichung: ${marke.rueckfrage_abweichung}` : 'keine rueckfrage_abweichung',
        'Grenze: ein positiver R3-Fall ist im echten Lauf nicht erzeugbar',
      ])
    )
  }

  // P13 E-B7: Herkunft aller Antworten aus dem echten Browser.
  const antworten = (prot ?? []).filter((e) => ANTWORT_ARTEN.has(e.art))
  if (antworten.length === 0) punkte.push(punkt('P13', 'E-B7 Antworten aus dem Browser', NICHT_BELEGBAR, prot === null ? protGrund : 'keine Antwort im Protokoll'))
  else {
    const fremd = antworten.filter((e) => e.herkunft !== 'browser').length
    const markeFremd = istObjekt(zaehlungMarke) ? zaehlungMarke.nicht_browser : null
    punkte.push(
      punkt('P13', 'E-B7 Antworten aus dem Browser', fremd === 0 && (markeFremd === null || markeFremd === 0) ? ERFUELLT : NICHT_ERFUELLT, 'Protokoll herkunft + Terminalmarke nicht_browser', [
        `${antworten.length} Antwort(en), davon nicht aus dem Browser: ${fremd}`,
        `Terminalmarke nicht_browser: ${markeFremd ?? '—'}`,
      ])
    )
  }

  // E-F-1136 (1) = B (Stefan, 17.10.2026): CLI-abhängige Punkte melden bei abweichender Version „erfüllt mit Abweichung“, ohne ermittelbare
  // Version „nicht belegbar“ — sie belegen das Verhalten der CLI im Lauf, nicht der deklarierten.
  const version = vergleicheCliVersion(daten.laufakte, roh)
  for (const p of punkte) {
    if (!CLI_ABHAENGIG.has(p.id) || p.ergebnis !== ERFUELLT) continue
    if (version.status === 'abweichend') {
      p.ergebnis = ERFUELLT_MIT_ABWEICHUNG
      p.details.push(`CLI-Version abweichend: ${version.text}`)
    } else if (version.status === 'unbekannt') {
      p.ergebnis = NICHT_BELEGBAR
      p.details.push(`CLI-Version nicht ermittelbar: ${version.text} — erfüllt nur mit bekannter Version`)
    }
  }

  const kopf = {
    projektId: kontext.projektId,
    laufId: daten.laufId,
    status: daten.laufStatus?.status ?? 'unbekannt',
    ergebnis: daten.terminal?.ergebnis ?? null,
    abgleich: istObjekt(marke?.rueckfrage_abgleich) ? `${marke.rueckfrage_abgleich.art}/${marke.rueckfrage_abgleich.grund}` : null,
    abweichung: typeof marke?.rueckfrage_abweichung === 'string' ? marke.rueckfrage_abweichung : null,
    abgelehntDurchStefan: Number.isInteger(marke?.abgelehnt_durch_stefan) ? marke.abgelehnt_durch_stefan : null,
    rohstrom: daten.roh?.status === 'ok' ? `Hash passt (${daten.roh.zeilen.length} Zeilen)` : rohGrund,
    protokoll: prot !== null ? `${prot.length} Eintrag/Einträge in ${daten.protokoll.versionen} Version(en)` : protGrund,
    arbeitsordner: typeof roh?.init?.zeile.cwd === 'string' ? roh.init.zeile.cwd : null,
    cliVersion: `${version.status === 'gleich' ? 'gleich' : version.status === 'abweichend' ? 'ABWEICHEND' : 'nicht ermittelbar'} — ${version.text}`,
    abgeschlossen: daten.laufStatus?.status === 'ABGESCHLOSSEN',
    fristen: `Wartegrenze ${WARTE_GRENZE_MS} ms, Skript-Frist ${WARTE_GRENZE_MS + SKRIPT_FRIST_ZUSATZ_MS} ms, CLI-timeout ${WARTE_GRENZE_MS + CLI_TIMEOUT_ZUSATZ_MS} ms — im Code festgelegt (ergaenzeRueckfrageAufruf), getestet; Wirkung in der CLI DEKLARIERT`,
  }
  return { kopf, punkte }
}

/**
 * Ersetzt einen Ort in allen drei Schreibweisen (roh, `/`, JSON-escaped), unter Windows ohne Groß-/Kleinschreibung.
 * @param text - Text
 * @param ort - absoluter Pfad oder leer
 * @param platzhalter - Ersatz
 * @returns Text
 */
function ersetzeOrt(text, ort, platzhalter) {
  if (typeof ort !== 'string' || ort.length < 2) return text
  let ergebnis = text
  for (const schreibweise of new Set([ort.replaceAll('\\', '\\\\'), ort, ort.replaceAll('\\', '/')])) {
    const muster = new RegExp(schreibweise.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), process.platform === 'win32' ? 'gi' : 'g')
    ergebnis = ergebnis.replace(muster, platzhalter)
  }
  return ergebnis
}

/**
 * Macht einen Text committbar (M8): Arbeitsordner des Laufs, Installation, Temp, Home neutralisiert, Geheimnis-Muster maskiert,
 * Steuer- und Formatzeichen als Marke, Backticks entschärft.
 * @param text - Rohtext
 * @param orte - { arbeitsordner, installWurzel }
 * @returns bereinigter Text
 */
function bereinige(text, orte) {
  let ergebnis = neutralisiereText(String(text), { arbeitsordner: orte.arbeitsordner ?? '', temp: '', home: '' })
  ergebnis = ersetzeOrt(ergebnis, orte.installWurzel, '<INSTALLATION>')
  ergebnis = neutralisiereText(ergebnis, { arbeitsordner: '', temp: tmpdir(), home: homedir() })
  ergebnis = maskiereGeheimnisse(ergebnis)
  return ergebnis.replace(/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}⟦⟧]/gu, (z) => `⟦U+${z.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}⟧`).replaceAll('`', "'").replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

/**
 * Bericht als Markdown (rein bis auf die Orte für die Neutralisierung).
 * @param bericht - Ergebnis von werteNachweisAus
 * @param orte - { installWurzel } (Arbeitsordner kommt aus dem Bericht)
 * @param zeitpunkt - ISO-Zeit der Auswertung
 * @returns Markdown mit LF
 */
export function alsMarkdown(bericht, orte, zeitpunkt = new Date().toISOString()) {
  const b = (text) => bereinige(text, { arbeitsordner: bericht.kopf.arbeitsordner, installWurzel: orte.installWurzel })
  const k = bericht.kopf
  const zeilen = [
    `# Auswertung Rückfrage-Nachweislauf ${b(k.laufId)}`,
    '',
    `Erzeugt ${zeitpunkt} von \`scripts/leitstand/nachweis-rueckfrage-auswerten.mjs\` (nur lesend). Anleitung \`docs/harness/rueckfrage-nachweislauf.md\`.`,
    '',
    '## Lauf',
    `- Projekt: \`${b(k.projektId)}\``,
    `- Status: ${b(k.status)} · Ergebnis: ${b(k.ergebnis ?? '—')}${k.abgeschlossen ? '' : ' — **Lauf nicht abgeschlossen: Punkte aus der Terminalmarke nicht belegbar, nach dem Lauf-Ende erneut auswerten**'}`,
    `- CLI-Version: ${b(k.cliVersion)}`,
    `- rueckfrage_abgleich: ${b(k.abgleich ?? '—')}`,
    `- rueckfrage_abweichung: ${k.abweichung === null ? '—' : `\`${b(k.abweichung)}\``}`,
    `- abgelehnt_durch_stefan: ${k.abgelehntDurchStefan ?? '—'}`,
    `- Rohstrom: ${b(k.rohstrom)}`,
    `- Protokoll: ${b(k.protokoll)}`,
    `- Fristen: ${b(k.fristen)}`,
    '',
    '## Übersicht',
    '| Punkt | Ergebnis |',
    '|---|---|',
    ...bericht.punkte.map((p) => `| ${p.id} ${b(p.titel)} | ${p.ergebnis} |`),
    '',
    '## Prüfpunkte',
  ]
  for (const p of bericht.punkte) {
    zeilen.push('', `### ${p.id} ${b(p.titel)} — ${p.ergebnis}`, `Fundstelle: ${b(p.fundstelle)}`, ...p.details.map((d) => `- ${b(d)}`))
  }
  return `${zeilen.join('\n')}\n`
}

/**
 * Liest die Argumente `--lauf`, `--projekt`, `--aus`.
 * @param argv - process.argv.slice(2)
 * @returns { lauf, projekt, aus } oder { fehler }
 */
export function leseArgumente(argv) {
  const werte = {}
  for (let i = 0; i < argv.length; i += 2) {
    const name = argv[i]
    if (!['--lauf', '--projekt', '--aus'].includes(name) || typeof argv[i + 1] !== 'string') return { fehler: `unbekanntes oder unvollständiges Argument: ${name}` }
    werte[name.slice(2)] = argv[i + 1]
  }
  if (typeof werte.lauf !== 'string' || !/^[A-Za-z0-9._-]{1,200}$/.test(werte.lauf) || werte.lauf.includes('..')) return { fehler: '--lauf <laufId> fehlt oder ist ungültig' }
  return werte
}

/**
 * Ziel von `--aus` erlaubt? Nie im Kontrollzustand der Instanz oder der Installation und nie in `kontrollzustand-roh` (M4, fail closed).
 * @param ziel - absoluter Zielpfad
 * @param verboten - absolute Ordner
 * @returns null oder Grund
 */
export function pruefeAusZiel(ziel, verboten) {
  for (const ordner of verboten) {
    const lage = liegtImArbeitsordner(ziel, ordner)
    if (lage.ok) return `--aus liegt in einem gesperrten Ordner (${ordner})`
    if (lage.grund.startsWith('nicht prüfbar')) return `--aus nicht prüfbar (${lage.grund})`
  }
  return null
}

/**
 * Kommandozeile: Projekt auflösen, auswerten, ausgeben.
 * @param argv - Argumente
 * @param installWurzel - Installationswurzel (Gate: Fixture-Wurzel)
 * @returns Exit-Code
 */
export function hauptprogramm(argv, installWurzel = INSTALL_WURZEL) {
  const args = leseArgumente(argv)
  if (args.fehler !== undefined) {
    console.error(`[nachweis] ${args.fehler}\nAufruf: node scripts/leitstand/nachweis-rueckfrage-auswerten.mjs --lauf <laufId> [--projekt <id>] [--aus <datei.md>]`)
    return 1
  }
  let projekte
  try {
    projekte = ladeProjektregisterMitLokal(join(installWurzel, 'projekte.json'), join(installWurzel, 'projekte.lokal.json'))
  } catch (fehler) {
    console.error(`[nachweis] Projektregister nicht lesbar: ${fehler.message}`)
    return 1
  }
  const selbst = projekte.find((p) => resolve(loeseProjektPfade(p, installWurzel).repoWurzel).toLowerCase() === resolve(installWurzel).toLowerCase())
  const projekt = args.projekt === undefined ? selbst : projekte.find((p) => p.id === args.projekt)
  if (projekt === undefined) {
    console.error(`[nachweis] Projekt '${args.projekt ?? '(Workforce)'}' nicht im Register (projekte.json, projekte.lokal.json)`)
    return 1
  }
  const pfade = loeseProjektPfade(projekt, installWurzel)
  // M3: Workforce-Instanz = repoWurzel gleich der Installationswurzel ⇒ url `/api`, sonst `/api/projekte/<id>` (rueckfrageOptionFuer).
  const erwarteterUrlPfad = projekt === selbst ? '/api' : `/api/projekte/${projekt.id}`
  let daten
  try {
    daten = leseNachweisDaten({ laufId: args.lauf, basisVerzeichnis: pfade.basisVerzeichnis, installWurzel })
  } catch (fehler) {
    console.error(`[nachweis] Lauf '${args.lauf}' nicht lesbar: ${fehler.message}`)
    return 1
  }
  if (daten.laufakte === null && daten.kettenLaenge === 0) {
    console.error(`[nachweis] Lauf '${args.lauf}' im Kontrollzustand des Projekts '${projekt.id}' unbekannt (weder Laufakte noch Checkpoint-Kette)`)
    return 1
  }
  let markdown
  try {
    markdown = alsMarkdown(werteNachweisAus(daten, { projektId: projekt.id, erwarteterUrlPfad }), { installWurzel })
  } catch (fehler) {
    console.error(`[nachweis] Auswertung von Lauf '${args.lauf}' gescheitert: ${fehler.message}`)
    return 1
  }
  // qa 10: ein laufender Lauf ergibt einen unvollständigen Bericht — sichtbar, nicht still.
  if (daten.laufStatus?.status !== 'ABGESCHLOSSEN') console.error(`[nachweis] Warnung: Lauf '${args.lauf}' ist nicht abgeschlossen (${daten.laufStatus?.status}) — nach dem Lauf-Ende erneut auswerten`)
  if (args.aus === undefined) {
    process.stdout.write(markdown)
    return 0
  }
  const ziel = resolve(args.aus)
  const grund = pruefeAusZiel(ziel, [pfade.basisVerzeichnis, join(installWurzel, 'kontrollzustand'), join(installWurzel, 'kontrollzustand-roh')])
  if (grund !== null) {
    console.error(`[nachweis] ${grund}`)
    return 1
  }
  try {
    mkdirSync(dirname(ziel), { recursive: true })
    writeFileSync(ziel, markdown, 'utf8')
  } catch (fehler) {
    console.error(`[nachweis] --aus nicht schreibbar (${fehler.code ?? fehler.message})`)
    return 1
  }
  console.log(`[nachweis] Auswertung geschrieben: ${bereinige(ziel, { installWurzel })}`)
  return 0
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = hauptprogramm(process.argv.slice(2))
}
