/**
 * Datei: scripts/check-f21-ws2-workboard-oberflaeche.mjs
 *
 * Zweck: F21-WS-2-Gate (features/F21/feature.md AK5, AK8-Scope: Workboard-
 * Ansicht, Attention-View, Dashboard-Zahlen). Muster
 * scripts/check-f15-workflow-oberflaeche.mjs — eine reine Quelltextprüfung,
 * kein Rendern: sie belegt, dass die Oberfläche die genannten Container,
 * Routen und Verdrahtungen FÜHRT, nicht, dass ein Browser sie korrekt
 * darstellt (der reale Blick bleibt Sache des Nachweises vor dem PR).
 *
 * Geprüft wird:
 * (a) index.html — Workboard-Filter/-Liste/-Detail-Container, Nav-Link und
 *     Container der Attention-View.
 * (b) api.js — GET /api/workitems (holeWorkitems).
 * (c) views/workboard.js registriert `#/workboard` UND `#/workboard/<id>`
 *     SELBST (Muster views/runs.js); app.js registriert `#/workboard`
 *     NICHT mehr zentral (sonst träfen zwei Routen denselben Hash mit
 *     unterschiedlichem onEnter, Regressionsschutz für die Umstellung).
 * (d) attention-daten.js — die beiden Attention-Filterregeln (naechster.art
 *     ∈ {haltFreigabe, haltKlaerung}; ergebnis FEHLGESCHLAGEN UND
 *     kenntnisgenommen false), EINMAL geführt.
 * (e) views/attention.js UND views/dashboard.js beziehen ihre
 *     Attention-Zahlen NACHWEISLICH aus demselben geteilten Modul
 *     (attention-daten.js) statt je einer eigenen, potenziell
 *     abweichenden Filterregel — die eigentliche Zusage von (d) wäre ohne
 *     diesen Fall durch ein zweites, stillschweigend abweichendes
 *     Vorkommen unterlaufbar.
 * (f) Scope: weder workboard.js noch attention.js senden einen
 *     schreibenden Request (kein 'method: '<POST/PUT/DELETE>'' in den
 *     Bausteinen, die sie aufrufen) — F21 WS-2 ist rein lesend (Nicht-Ziel:
 *     Schreiben ist F23-Scope).
 * (g) Syntaxprüfung (node --check) auf allen neuen/geänderten Modulen —
 *     public/ liegt außerhalb von Biome/tsc (siehe check-f15-workflow-
 *     oberflaeche.mjs Fall (f)).
 *
 * Wird aufgerufen von: `npm run check`.
 *
 * Aufruf: node scripts/check-f21-ws2-workboard-oberflaeche.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const befunde = []
console.log('\n=== F21-WS-2-Check (Workboard-Ansicht, Attention-View, Dashboard-Zahlen) ===\n')

/** Siehe check-f15-workflow-oberflaeche.mjs — entfernt Kommentare, damit eine Quelltextprüfung über Code, nicht über Prosa urteilt. @param quelltext - Inhalt einer .js-Datei @returns derselbe Text ohne Block-/Zeilenkommentare */
function entferneKommentare(quelltext) {
  return quelltext.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

const htmlQuelltext = readFileSync('public/leitstand/index.html', 'utf8')
const workboardQuelltext = entferneKommentare(readFileSync('public/leitstand/views/workboard.js', 'utf8'))
const attentionQuelltext = entferneKommentare(readFileSync('public/leitstand/views/attention.js', 'utf8'))
const dashboardQuelltext = entferneKommentare(readFileSync('public/leitstand/views/dashboard.js', 'utf8'))
const attentionDatenQuelltext = entferneKommentare(readFileSync('public/leitstand/attention-daten.js', 'utf8'))
const apiQuelltext = entferneKommentare(readFileSync('public/leitstand/api.js', 'utf8'))
const appQuelltext = entferneKommentare(readFileSync('public/leitstand/app.js', 'utf8'))

/**
 * Eine einzelne Zusage: `muster` muss in `quelltext` vorkommen.
 * @param bereich - Kennung des Prüfblocks für die Befundmeldung
 * @param name - was die Zusage behauptet
 * @param quelltext - zu durchsuchender Text
 * @param muster - String oder RegExp, der vorkommen muss
 */
function verlangeVorkommen(bereich, name, quelltext, muster) {
  const gefunden = typeof muster === 'string' ? quelltext.includes(muster) : muster.test(quelltext)
  if (!gefunden) {
    befunde.push(`(${bereich}) ${name}: nicht im Quelltext gefunden (gesucht: ${muster})`)
  }
}

// ─── (a) index.html: Workboard-Container, Nav-Link, Attention-Container ────
verlangeVorkommen('a', "Nav-Link '#/attention'", htmlQuelltext, '<a href="#/attention" data-nav-view="attention">')
for (const id of ['workboard-befunde', 'workboard-filter', 'workboard-filter-typ', 'workboard-filter-status', 'workboard-filter-prioritaet', 'workboard-neu-laden', 'workboard-liste', 'workboard-detail', 'workboard-detail-titel', 'workboard-detail-inhalt', 'workboard-detail-schliessen']) {
  verlangeVorkommen('a', `Workboard-Container-id '${id}'`, htmlQuelltext, `id="${id}"`)
}
verlangeVorkommen('a', 'Abschnitt <section id="view-attention" data-view="attention"', htmlQuelltext, '<section id="view-attention" data-view="attention"')
for (const id of ['attention-leer', 'attention-abschnitt-workflows', 'attention-workflows', 'attention-abschnitt-laeufe', 'attention-laeufe', 'attention-abschnitt-startfehler', 'attention-startfehler', 'attention-abschnitt-workitems', 'attention-workitems']) {
  verlangeVorkommen('a', `Attention-Container-id '${id}'`, htmlQuelltext, `id="${id}"`)
}

// ─── (b) api.js: GET /api/workitems ─────────────────────────────────────────
verlangeVorkommen('b', 'api.js führt GET /api/workitems (holeWorkitems)', apiQuelltext, "fetch(`/api/workitems")
verlangeVorkommen('b', 'views/workboard.js ruft holeWorkitems(...) auf', workboardQuelltext, 'holeWorkitems(filter)')
verlangeVorkommen('b', 'attention-daten.js ruft holeWorkitems(...) auf', attentionDatenQuelltext, "holeWorkitems({ status: 'OFFEN' })")

// ─── (c) Workboard registriert seine Routen SELBST, app.js nicht mehr zentral ──
verlangeVorkommen('c', "views/workboard.js registriert '#/workboard'", workboardQuelltext, "registriere(/^#\\/workboard$/, 'workboard'")
verlangeVorkommen('c', "views/workboard.js registriert '#/workboard/<id>'", workboardQuelltext, "registriere(/^#\\/workboard\\/([^/]+)$/, 'workboard'")
if (/registriere\(\/\^#\\\/workboard\$\/,\s*'workboard'\)/.test(appQuelltext)) {
  befunde.push("(c) app.js registriert '#/workboard' weiterhin ZENTRAL — seit F21 WS-2 macht views/workboard.js das selbst (Muster views/runs.js), zwei Routen auf denselben Hash mit unterschiedlichem onEnter wären ein Regressionsrisiko")
}

// ─── (d) attention-daten.js: die beiden Attention-Filterregeln ─────────────
verlangeVorkommen('d', "Workflow-Filter: naechster.art === 'haltFreigabe'", attentionDatenQuelltext, "w.naechster?.art === 'haltFreigabe'")
verlangeVorkommen('d', "Workflow-Filter: naechster.art === 'haltKlaerung'", attentionDatenQuelltext, "w.naechster?.art === 'haltKlaerung'")
verlangeVorkommen('d', "Lauf-Filter: ergebnis === 'FEHLGESCHLAGEN'", attentionDatenQuelltext, "l.ergebnis === 'FEHLGESCHLAGEN'")
verlangeVorkommen('d', 'Lauf-Filter: kenntnisgenommen === false (F21 WS-1 AK4)', attentionDatenQuelltext, 'l.kenntnisgenommen === false')

// ─── (e) attention.js UND dashboard.js beziehen die Attention-Zahlen aus attention-daten.js ──
verlangeVorkommen('e', 'views/attention.js importiert filtereAttentionWorkflows aus attention-daten.js', attentionQuelltext, "import { filtereAttentionLaeufe, filtereAttentionWorkflows, holeOffeneP0P1Workitems } from '../attention-daten.js'")
verlangeVorkommen('e', 'views/dashboard.js importiert filtereAttentionWorkflows aus attention-daten.js', dashboardQuelltext, "import { filtereAttentionLaeufe, filtereAttentionWorkflows, holeOffeneP0P1Workitems } from '../attention-daten.js'")
// Die eigentliche Regressionsgrenze: KEINE der beiden Views darf workflows/laeufe SELBST filtern
// (workflows.filter(...)/laeufe.filter(...)) — das wäre ein zweiter Regelsatz für dieselbe
// Auswahl-Entscheidung (D5), am geteilten Modul vorbei. Eine reine ANZEIGE-Verzweigung auf
// naechster.art (welcher Text für ein bereits ausgewähltes Element steht) ist davon ausdrücklich
// NICHT betroffen — sie entscheidet nichts über die Zugehörigkeit, nur über das Label, und bliebe
// von einem pauschalen Verbot jedes naechster.art-Vorkommens fälschlich erfasst (real beim
// Kalibrieren dieses Gates aufgefallen). Gezielt auf die beiden Variablennamen statt auf JEDES
// '.filter(' im Modul (Code-Review-Befund): ein späteres, unverwandtes .filter() auf einer
// lokalen Hilfsliste soll dieses Gate nicht fälschlich rot färben.
const SELEKTIONS_MUSTER = /\b(workflows|workflowsAttention|laeufe|laeufeAttention)\.filter\(/
if (SELEKTIONS_MUSTER.test(attentionQuelltext) || SELEKTIONS_MUSTER.test(dashboardQuelltext)) {
  befunde.push('(e) views/attention.js oder views/dashboard.js filtert workflows/laeufe SELBST (<liste>.filter(...)) — die Auswahl attention-relevanter Workflows/Läufe gehört ausschließlich in attention-daten.js (filtereAttentionWorkflows/filtereAttentionLaeufe), sonst kann sie stillschweigend abweichen')
}

// ─── (f) Scope: kein schreibender Request in workboard.js/attention.js ──────
for (const [name, quelltext] of [
  ['views/workboard.js', workboardQuelltext],
  ['views/attention.js', attentionQuelltext],
]) {
  if (/method:\s*'(POST|PUT|DELETE|PATCH)'/.test(quelltext)) {
    befunde.push(`(f) ${name} sendet einen schreibenden Request — F21 WS-2 ist rein lesend (Schreiben ist F23-Scope)`)
  }
}

// ─── (g) Syntaxprüfung (node --check) ───────────────────────────────────────
for (const pfad of ['public/leitstand/views/workboard.js', 'public/leitstand/views/attention.js', 'public/leitstand/views/dashboard.js', 'public/leitstand/attention-daten.js', 'public/leitstand/api.js', 'public/leitstand/app.js']) {
  try {
    execFileSync(process.execPath, ['--check', pfad], { encoding: 'utf8' })
  } catch (fehler) {
    const meldung = String(fehler.stderr ?? fehler.message).trim().split(/\r?\n/)
    befunde.push(`(g) ${pfad} ist syntaktisch ungültig: ${meldung.find((z) => z.includes('Error')) ?? meldung[0]}`)
  }
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
