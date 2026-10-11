#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/b1b2/abgleich-nachweis.mjs
 *
 * Zweck: F45 B1b-2 (Beleg 12) — Nachweis der Harness-Abgleich-Tabelle für ai-workforce, deterministisch und nur
 * lesend, mit denselben Funktionen wie der Server (scripts/leitstand/routen-harness-abgleich.mjs):
 * - `abgleich-ai-workforce.md`: Seite Workforce — Projekt-Harness von ai-workforce laut harness-abgleich/standard.json,
 *   ohne Laufbelege (Feld abgleich von GET /api/harness);
 * - `abgleich-workflow.md`: ein vorhandener, abgeschlossener Workflow mit Laufbelegen (Ausführung + Review
 *   ERFOLGREICH, Prüfergebnis GRÜN, Beobachtung vorhanden) — live gerechnet wie GET …/harness-abgleich ohne passendes
 *   Artefakt (der Ablauf lief vor B1b-2; sein Arbeitsordner ist aufgeräumt, gelesen wird der Projektordner).
 * Schreibt nichts in den Kontrollzustand.
 *
 * Wird aufgerufen von: Hand (`node features/F45/nachweise/b1b2/abgleich-nachweis.mjs [workflowId]`), nicht von
 * `npm run check`.
 */

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { baueHarnessAbgleichOhneLauf, berechneAbgleichFuerWorkflow } from '../../../../scripts/leitstand/routen-harness-abgleich.mjs'
import { ladeArtefaktVersion } from '../../../../src/lineage-registry/index.ts'

const HIER = import.meta.dirname
const INSTALLATION = join(HIER, '..', '..', '..', '..')
const WORKFLOW_ID = process.argv[2] ?? 'b1a1-nachweis-325d2a8f'
const ladeOptionen = { basisVerzeichnis: join(INSTALLATION, 'kontrollzustand'), schreiber: () => {} }

/** Escaped eine Tabellenzelle. @param text - Wert @returns Text */
const zelle = (text) => String(text ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')

/**
 * Dritte Spalte einer Zeile (Beleg, Ersatz, Begründung, Grund) als Text.
 * @param e - Zeile des Ergebnisses
 * @returns Text
 */
function belegText(e) {
  const teile = []
  if (e.status === 'offen') teile.push(`offen: ${e.offen_grund}`)
  if (e.beleg !== null) {
    const b = e.beleg
    teile.push(b.statisch ? `statischer Nachweis ${b.quelle}${b.skript_sha256 ? ` (Hash ${b.skript_sha256.slice(0, 12)}…, Matcher ${b.matcher})` : ''}` : `Prüfschritt${b.ergebnis ? ` ${b.ergebnis}` : ''}${b.lauf_id ? `, Lauf ${b.lauf_id}` : ''}${b.im_lauf === null ? ' (Beleg im Lauf)' : ''}`)
  }
  if (e.ersatz !== null) teile.push(`Schritt ${e.ersatz.rolle}${e.ersatz.lage ? ` — ${e.ersatz.lage}` : ''}${e.ersatz.lauf_id && e.ersatz.lage === 'gelaufen' ? `, Lauf ${e.ersatz.lauf_id}` : ''}`)
  if (e.grund) teile.push(e.grund)
  if (e.begruendung) teile.push(e.begruendung)
  if (Number.isInteger(e.aufrufe) && e.aufrufe > 0) teile.push(`im Lauf ${e.aufrufe}× aufgerufen`)
  return teile.join(' · ')
}

/**
 * Markdown einer Abgleich-Tabelle.
 * @param titel - Überschrift
 * @param daten - { zaehlung, bestanden, eintraege, … }
 * @param kopf - zusätzliche Zeilen über der Tabelle
 * @returns Markdown
 */
function alsMarkdown(titel, daten, kopf) {
  const z = daten.zaehlung
  const offen = daten.eintraege.filter((e) => e.status === 'offen')
  const zeilen = daten.eintraege.map((e) => `| ${zelle(e.art)} | ${zelle(e.art === 'dod' ? `${e.detail} (${e.name})` : `${e.name}${e.ereignis ? ` — ${e.ereignis}${e.matcher ? ` · ${e.matcher}` : ''}` : ''}`)} | ${zelle(e.status)} | ${zelle(belegText(e))} |`)
  return [
    `# ${titel}`,
    '',
    ...kopf,
    '',
    `**Harness: ${z.wirksam} wirksam · ${z.ersetzt_durch} ersetzt · ${z.bewusst_nicht} bewusst nicht · ${z.offen} offen${z.wirksam_ohne_beleg > 0 ? ` · ${z.wirksam_ohne_beleg} ohne Beleg` : ''}**${daten.bestanden === null || daten.bestanden === undefined ? '' : ` — Beleg 12 ${daten.bestanden ? 'erfüllt' : 'nicht erfüllt'}`}`,
    '',
    `Offen: ${offen.length === 0 ? 'keine' : offen.map((e) => `${e.art}:${e.name} (${e.offen_grund})`).join(', ')}`,
    '',
    '| Art | Eintrag | Status | Beleg / Ersatz / Begründung |',
    '|---|---|---|---|',
    ...zeilen,
    '',
  ].join('\n')
}

const workforce = baueHarnessAbgleichOhneLauf({ repoWurzel: INSTALLATION, installWurzel: INSTALLATION })
if (workforce.status !== 'ok') throw new Error(`Abgleich ohne Lauf fehlgeschlagen: ${workforce.grund}`)
writeFileSync(
  join(HIER, 'abgleich-ai-workforce.md'),
  alsMarkdown('Harness-Abgleich ai-workforce — Seite Workforce (ohne Laufbelege)', workforce, [
    `Erzeugt ${new Date().toISOString()} mit \`node features/F45/nachweise/b1b2/abgleich-nachweis.mjs\` (dieselbe Funktion wie das Feld \`abgleich\` von GET /api/harness).`,
    `Zuordnung: ${workforce.zuordnung_quellen.map((q) => `\`${q.pfad}\` (SHA-256 ${q.sha256.slice(0, 12)}…)`).join(', ')}. Ohne Laufbelege gibt es kein „bestanden“.`,
  ])
)

const fassung = ladeArtefaktVersion(`workflow-${WORKFLOW_ID}`, undefined, ladeOptionen)
if (fassung === null) throw new Error(`Workflow '${WORKFLOW_ID}' nicht im Kontrollzustand`)
const imLauf = berechneAbgleichFuerWorkflow({ workflowId: WORKFLOW_ID, workflowDaten: fassung.daten, wurzel: INSTALLATION, installWurzel: INSTALLATION, ladeOptionen })
if (!imLauf.ok) throw new Error(`Abgleich mit Laufbelegen fehlgeschlagen: ${imLauf.grund}`)
const d = imLauf.daten
const f = d.faehigkeiten
writeFileSync(
  join(HIER, 'abgleich-workflow.md'),
  alsMarkdown(`Harness-Abgleich mit Laufbelegen — Workflow \`${WORKFLOW_ID}\``, d, [
    `Erzeugt ${d.berechnet_am} (live, wie GET …/harness-abgleich ohne passendes Artefakt — der Ablauf lief vor B1b-2, sein Arbeitsordner ist aufgeräumt; gelesen wurde der Projektordner).`,
    `Ziel: ${fassung.daten.ziel} · Status ${fassung.daten.status} · Schritte: ${fassung.daten.schritte.map((s) => `${s.schritt_id} (${s.rolle}, ${s.status}, Lauf ${s.lauf_id})`).join('; ')}.`,
    `Bezug: Ausführungslauf \`${d.bezug.ausfuehrung_lauf_id}\`, Prüfergebnis-Hash \`${String(d.bezug.pruefergebnis_hash).slice(0, 16)}…\`.`,
    `Kurzliste (Ausführung): Skills ${f === null ? '—' : f.skills.map((s) => `${s.name}×${s.anzahl}`).join(', ') || 'keine'} · Subagenten ${f === null ? '—' : f.subagenten.map((s) => `${s.name}×${s.anzahl}`).join(', ') || 'keine'} · MCP ${f === null ? '—' : f.mcp_server.map((s) => `${s.name}×${s.anzahl}`).join(', ') || 'keine'} · Hintergrund ${f === null ? '—' : (f.hintergrund ?? 'nicht erfasst')}.`,
  ])
)
console.log(`Seite Workforce: ${JSON.stringify(workforce.zaehlung)}\nWorkflow ${WORKFLOW_ID}: ${JSON.stringify(d.zaehlung)} bestanden=${d.bestanden}`)
