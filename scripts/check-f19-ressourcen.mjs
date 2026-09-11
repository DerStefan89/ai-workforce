/**
 * Datei: scripts/check-f19-ressourcen.mjs
 *
 * Zweck: Ressourcen-Gate (F19 WS-1/WS-2). Prüft, dass ressourcen.json
 * (Repo-Wurzel) gegen validiereRessourcenDaten gültig ist, dass jeder
 * 'worker'/'skill'-Eintrag gegen die laufende Umgebung auflösbar ist, dass
 * R1/R2 zusätzlich als Regressionsschutz direkt hier greifen, und — die
 * NEUE Regel aus state/findings.md F-346 — dass jeder in
 * ROLLENVERTRAEGE.erlaubte_worker genannte, registrierte Worker die
 * benoetigte_capabilities seiner Rolle vollständig deckt. Regel 7 verlangt
 * zusätzlich, dass jede benötigte Capability entweder über mindestens eine
 * Ressource registriert ist (unabhängig von verfuegbar) oder in
 * features/F19/bekannte-luecken.md als bekannte Lücke benannt ist.
 *
 * Kein generischer JSON-Schema-Validator (Muster check-datenformate.mjs,
 * D5): Regel 1 importiert die reale validiereRessourcenDaten statt einen
 * zweiten Regelsatz zu pflegen.
 *
 * Regel 6 trägt zwei eng benannte Ausnahmen (F346_AUSNAHMEN): 'router' und
 * 'code-reviewer' erlauben weiterhin 'claude-code', obwohl 'claude-code'
 * STRUCTURED_OUTPUT nicht bereitstellt (kein --output-schema-Mechanismus,
 * F-337) — beide Verengungen wurden geprüft und real verworfen
 * (src/rollen/index.ts, Kopfkommentar, F19 WS-2): ein Router-Lauf über den
 * direkten POST /api/laeufe-Pfad läuft strukturell IMMER als worker:
 * 'claude-code', ein Verengen auf ['codex'] machte den Router-Mechanismus
 * unbenutzbar; ein Verengen von 'code-reviewer' brach ~85 Assertions in
 * scripts/check-f15-workflow.mjs, deren geteilte Testfixtur 'code-reviewer'/
 * 'claude-code' als Default für einen claude-code-spezifischen Rotfall
 * nutzt. Jede Ausnahme deckt AUSSCHLIESSLICH die eine benannte Capability
 * für die eine benannte Rolle/Worker-Kombination ab — jede andere Lücke
 * bleibt ein Gate-Fehler. F-346 bleibt deshalb offen (state/findings.md).
 *
 * Wird aufgerufen von: npm run check.
 *
 * Aufruf: node scripts/check-f19-ressourcen.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { existsSync, readFileSync } from 'node:fs'
import { ROLLENVERTRAEGE } from '../src/rollen/index.ts'
import { loeseRessourcenAuf, validiereRessourcenDaten } from '../src/ressourcen/index.ts'

const REPO_WURZEL = process.cwd()
/** Zwilling von WORKER in src/workflow/index.ts — dieselbe Zwillings-Bauart wie src/rollen/types.ts. */
const WORKER = ['claude-code', 'codex']

const befunde = []

console.log('\n=== F19-Ressourcen-Check ===\n')

const ressourcenPfad = 'ressourcen.json'
const rohDaten = JSON.parse(readFileSync(ressourcenPfad, 'utf-8'))

// ─── (1) ressourcen.json ist gegen validiereRessourcenDaten gültig ─────────
const verstoesse = validiereRessourcenDaten(rohDaten)
if (verstoesse.length > 0) {
  befunde.push(`(1) ${ressourcenPfad} verletzt validiereRessourcenDaten: ${verstoesse.join('; ')}`)
} else {
  console.log(`✓ (1) ${ressourcenPfad}: gültig gegen validiereRessourcenDaten.`)
}

// ─── (2)+(3) Auflösbarkeit gegen die laufende Umgebung ─────────────────────
const aufgeloest = loeseRessourcenAuf(rohDaten.ressourcen, REPO_WURZEL, 'startvorlagen/ai-workforce.json')

const befundeVor23 = befunde.length
for (const r of aufgeloest) {
  if (r.typ === 'worker') {
    if (!WORKER.includes(r.herkunft.worker)) {
      befunde.push(`(2) Ressource '${r.id}': herkunft.worker '${r.herkunft.worker}' liegt nicht in WORKER (src/workflow/index.ts) — Kein-Zweitwahrheit-Invariante verletzt`)
    }
    if (!r.verfuegbar) {
      befunde.push(`(2) Ressource '${r.id}' (typ 'worker') ist gegen startvorlagen/ai-workforce.json nicht auflösbar: ${r.grund}`)
    }
  }
  if (r.typ === 'skill' && !r.verfuegbar) {
    befunde.push(`(3) Ressource '${r.id}' (typ 'skill') ist nicht auflösbar: ${r.grund}`)
  }
}
if (befunde.length === befundeVor23) {
  console.log('✓ (2) Jeder typ \'worker\' ist über startvorlagen/ai-workforce.json auflösbar, herkunft.worker liegt in WORKER.')
  console.log('✓ (3) Jeder typ \'skill\' zeigt auf ein existierendes SKILL.md mit vollständigem Frontmatter.')
}

// ─── (4)+(5) R1/R2 als Regressionsschutz direkt auf den Rohdaten ───────────
const befundeVor45 = befunde.length
for (const [i, r] of rohDaten.ressourcen.entries()) {
  if ((r.typ === 'worker' || r.typ === 'skill') && ('name' in r || 'beschreibung' in r)) {
    befunde.push(`(4) ressourcen[${i}] ('${r.id}', typ '${r.typ}') trägt name/beschreibung — R1-Regression`)
  }
  if (r.typ === 'extern' && r.freigabe !== 'OFFEN') {
    befunde.push(`(5) ressourcen[${i}] ('${r.id}', typ 'extern') trägt freigabe '${r.freigabe}' statt 'OFFEN' — R2-Regression`)
  }
}
if (befunde.length === befundeVor45) {
  console.log("✓ (4) Kein 'worker'/'skill'-Eintrag trägt name oder beschreibung (R1).")
  console.log("✓ (5) Jeder 'extern'-Eintrag trägt freigabe 'OFFEN' (R2).")
}

// ─── (6) F-346: erlaubte_worker müssen benoetigte_capabilities decken ──────
const capabilitiesJeWorker = new Map(rohDaten.ressourcen.filter((r) => r.typ === 'worker').map((r) => [r.id, r.capabilities]))

// Zwei eng benannte Ausnahmen (siehe Kopfkommentar): 'router' und
// 'code-reviewer' dürfen bei Worker 'claude-code' STRUCTURED_OUTPUT fehlen —
// jede ANDERE fehlende Capability bei diesen Kombinationen bleibt ein
// Gate-Fehler.
const F346_AUSNAHMEN = [
  { rolle: 'router', worker: 'claude-code', erlaubteLuecke: ['STRUCTURED_OUTPUT'] },
  { rolle: 'code-reviewer', worker: 'claude-code', erlaubteLuecke: ['STRUCTURED_OUTPUT'] },
]

const befundeVor6 = befunde.length
for (const [rolle, vertrag] of Object.entries(ROLLENVERTRAEGE)) {
  for (const worker of vertrag.erlaubte_worker) {
    const capabilities = capabilitiesJeWorker.get(worker)
    if (!capabilities) continue // Worker nicht (mehr) registriert — kein F-346-Fall, sondern AK7-Angelegenheit.
    let fehlend = vertrag.benoetigte_capabilities.filter((c) => !capabilities.includes(c))
    const ausnahme = F346_AUSNAHMEN.find((a) => a.rolle === rolle && a.worker === worker)
    if (ausnahme) {
      fehlend = fehlend.filter((c) => !ausnahme.erlaubteLuecke.includes(c))
    }
    if (fehlend.length > 0) {
      befunde.push(`(6) Rolle '${rolle}' erlaubt Worker '${worker}', der die benoetigte_capabilities nicht vollständig deckt: fehlend ${JSON.stringify(fehlend)} (F-346)`)
    }
  }
}
if (befunde.length === befundeVor6) {
  console.log(
    "✓ (6) Jeder in erlaubte_worker genannte, registrierte Worker deckt die benoetigte_capabilities seiner Rolle vollständig (F-346) — außer den beiden benannten Ausnahmen ('router'/'claude-code' und 'code-reviewer'/'claude-code', je Capability 'STRUCTURED_OUTPUT')."
  )
}

// ─── (7) Jede benötigte Capability ist registriert oder als Lücke benannt ──
const BEKANNTE_LUECKEN_PFAD = 'features/F19/bekannte-luecken.md'
const bekannteLueckenText = existsSync(BEKANNTE_LUECKEN_PFAD) ? readFileSync(BEKANNTE_LUECKEN_PFAD, 'utf-8') : ''
const alleRegistriertenCapabilities = new Set(rohDaten.ressourcen.flatMap((r) => r.capabilities))

const befundeVor7 = befunde.length
const alleBenoetigtenCapabilities = new Set(Object.values(ROLLENVERTRAEGE).flatMap((v) => v.benoetigte_capabilities))
for (const capability of alleBenoetigtenCapabilities) {
  const registriert = alleRegistriertenCapabilities.has(capability)
  const alsLueckeBenannt = bekannteLueckenText.includes(capability)
  if (!registriert && !alsLueckeBenannt) {
    befunde.push(`(7) Capability '${capability}' ist weder über eine Ressource registriert noch in ${BEKANNTE_LUECKEN_PFAD} benannt`)
  }
}
if (befunde.length === befundeVor7) {
  console.log(`✓ (7) Jede in ROLLENVERTRAEGE.benoetigte_capabilities genannte Capability ist registriert oder in ${BEKANNTE_LUECKEN_PFAD} benannt.`)
}

// ─── Ergebnis ───────────────────────────────────────────────────────────────
console.log('')
if (befunde.length === 0) {
  console.log('✓ Keine Befunde.\n')
  process.exitCode = 0
} else {
  console.log(`✗ ${befunde.length} Befund(e):\n`)
  for (const b of befunde) console.log(`  - ${b}`)
  console.log('')
  process.exitCode = 1
}
