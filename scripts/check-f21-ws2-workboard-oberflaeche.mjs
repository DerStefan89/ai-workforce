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
 *     F44 WS-2b (F-896): Geprüft wird die HERKUNFT, nicht mehr eine wörtliche
 *     Importzeile. Seit WS-2a/2b bauen beide Views ihre Auswahl über
 *     baueEntscheidungen bzw. filtereAttentionWorkflows; die wörtliche Zeile
 *     erzwang ungenutzte Importe (filtereAttentionLaeufe in beiden Views), die
 *     Biome nicht meldet. Die Invariante bleibt in zwei Teilen: (1) beide Views
 *     importieren aus '../attention-daten.js' (IMPORT_MUSTER), (2) keine der
 *     beiden filtert workflows/laeufe selbst (SELEKTIONS_MUSTER, unverändert).
 *     Ein Selbsttest (e-kal) belegt, dass eine View mit eigenem
 *     .filter auf workflows und eine View ohne den Import weiter rot sind.
 * (f) Scope: weder workboard.js noch attention.js noch dashboard.js (F44
 *     WS-2b: keine Schreibaktion auf der Übersicht) senden einen
 *     schreibenden Request (kein 'method: '<POST/PUT/DELETE>'' in den
 *     Bausteinen, die sie aufrufen) — F21 WS-2 ist rein lesend (Nicht-Ziel:
 *     Schreiben ist F23-Scope). Zusätzlich importiert dashboard.js aus api.js
 *     nur lesende hole*-Funktionen (Prüfpass WS-2b: ein importierter Schreiber
 *     wie sendeWorkflowFreigabe bliebe sonst unentdeckt). F44 WS-3b: Das Detail
 *     der Entwicklung ist nach views/workboard-detail.js ausgelagert (reines
 *     Rendern); (f) gilt dort ebenso (kein method: 'POST…', aus api.js höchstens
 *     hole*, kein fetch/document/window — mit Rot-Kalibrierung (f-kal)). workboard.js
 *     selbst schreibt weiter nur über die api.js-Bausteine
 *     von Click-to-Work. Kein Literal zieht um: alle IDs aus (a) bleiben in
 *     index.html, `holeWorkitems(filter)` bleibt in workboard.js.
 * (g) Syntaxprüfung (node --check) auf allen neuen/geänderten Modulen (F44 WS-3b:
 *     zusätzlich views/workboard-detail.js und rollen-anzeige.js) —
 *     public/ liegt außerhalb von Biome/tsc (siehe check-f15-workflow-
 *     oberflaeche.mjs Fall (f)).
 * (h) F44 WS-3a: Das Board der Seite „Entwicklung“ (entwicklung-daten.js)
 *     ordnet „Braucht dich“ über filtereAttentionWorkflows aus
 *     attention-daten.js zu und führt keine eigene Halt-Regel
 *     (naechster.art) — dieselbe Zusage wie (d)/(e), nur für den dritten
 *     Abnehmer; dazu, dass die Funktion auch aufgerufen (nicht nur importiert)
 *     wird. (h-kal) belegt die Rotfälle (eigene Regel, nur Import, kein
 *     Import) und den Grünfall. Das Bento (#workboard-bento) ist entfernt
 *     (F-892); (a) hat es nie verlangt, kein Literal zieht um.
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
const workboardDetailQuelltext = entferneKommentare(readFileSync('public/leitstand/views/workboard-detail.js', 'utf8'))
const attentionQuelltext = entferneKommentare(readFileSync('public/leitstand/views/attention.js', 'utf8'))
const dashboardQuelltext = entferneKommentare(readFileSync('public/leitstand/views/dashboard.js', 'utf8'))
const attentionDatenQuelltext = entferneKommentare(readFileSync('public/leitstand/attention-daten.js', 'utf8'))
const apiQuelltext = entferneKommentare(readFileSync('public/leitstand/api.js', 'utf8'))
const appQuelltext = entferneKommentare(readFileSync('public/leitstand/app.js', 'utf8'))
const entwicklungDatenQuelltext = entferneKommentare(readFileSync('public/leitstand/entwicklung-daten.js', 'utf8'))

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
// F25 WS-2a (AK10): mitPraefix() statt wörtlichem '/api/...'-String direkt in fetch() — trägt
// selbst kein zweites '/api' (Dispatcher-Kontrakt, real im AK15-Browser-Realtest gefunden).
verlangeVorkommen('b', 'api.js führt GET /api/workitems (holeWorkitems)', apiQuelltext, "fetch(mitPraefix(`/workitems")
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
// F44 WS-2b (F-896): Herkunft statt wörtlicher Zeile — ein named import aus '../attention-daten.js'.
const IMPORT_MUSTER = /import\s*\{[^}]*\b(baueEntscheidungen|filtereAttentionWorkflows|filtereAttentionLaeufe)\b[^}]*\}\s*from\s*'\.\.\/attention-daten\.js'/
verlangeVorkommen('e', 'views/attention.js bezieht Auswahl/Filter aus attention-daten.js', attentionQuelltext, IMPORT_MUSTER)
verlangeVorkommen('e', 'views/dashboard.js bezieht Auswahl/Filter aus attention-daten.js', dashboardQuelltext, IMPORT_MUSTER)
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

// (e-kal) Rot-Kalibrierung von (e): konstruierte Views, die rot bzw. grün sein MÜSSEN. Ein
// Gate, das hier nicht anschlägt, prüft nichts.
/**
 * Bewertet eine (kommentarfreie) View-Quelle nach (e).
 * @param quelltext - Quelltext ohne Kommentare
 * @returns true, wenn (e) die View beanstandet
 */
function verstoesstGegenE(quelltext) {
  return !IMPORT_MUSTER.test(quelltext) || SELEKTIONS_MUSTER.test(quelltext)
}
const KAL_IMPORT = "import { baueEntscheidungen } from '../attention-daten.js'\n"
const kalibrierung = [
  ['eigener .filter auf workflows', `${KAL_IMPORT}const wartend = zustand.workflows.filter((w) => w.naechster?.art === 'haltFreigabe')`, true],
  ['eigener .filter auf laeufe', `${KAL_IMPORT}const fehl = laeufe.filter((l) => l.ergebnis === 'FEHLGESCHLAGEN')`, true],
  ['kein Import aus attention-daten.js', "import { holeWorkitems } from '../api.js'\nconst x = 1", true],
  ['Import nur einer fremden Funktion aus attention-daten.js', "import { holeOffeneP0P1Workitems } from '../attention-daten.js'\n", true],
  ['sauber: Import, keine eigene Auswahl', `${KAL_IMPORT}const { eintraege } = baueEntscheidungen(zustand, p0p1)\nconst n = schritte.filter((s) => s.status === 'ERFOLGREICH').length`, false],
]
for (const [name, quelltext, erwartetRot] of kalibrierung) {
  if (verstoesstGegenE(quelltext) !== erwartetRot) befunde.push(`(e-kal) Rot-Kalibrierung '${name}': erwartet ${erwartetRot ? 'rot' : 'grün'}, Gate urteilt anders`)
}

// ─── (f) Scope: kein schreibender Request in workboard.js/attention.js ──────
for (const [name, quelltext] of [
  ['views/workboard.js', workboardQuelltext],
  ['views/workboard-detail.js', workboardDetailQuelltext],
  ['views/attention.js', attentionQuelltext],
  ['views/dashboard.js', dashboardQuelltext],
]) {
  if (/method:\s*'(POST|PUT|DELETE|PATCH)'/.test(quelltext)) {
    befunde.push(`(f) ${name} sendet einen schreibenden Request — F21 WS-2 ist rein lesend (Schreiben ist F23-Scope)`)
  }
}

// F44 WS-3b: views/workboard-detail.js rendert nur — kein fetch, kein DOM-Zugriff (Zusage im
// Dateikopf; Laden und DOM bleiben in workboard.js). (f-kal) belegt Rot- und Grünfall.
const NUR_RENDERN_VERSTOSS = /\bfetch\s*\(|\bdocument\s*\.|\bwindow\s*\./
if (NUR_RENDERN_VERSTOSS.test(workboardDetailQuelltext)) befunde.push('(f) views/workboard-detail.js greift auf fetch, document oder window zu — das Modul soll nur rendern')
for (const [name, quelltext, erwartetRot] of [
  ['fetch im Render-Modul', "const a = fetch('/api/x')", true],
  ['DOM im Render-Modul', "document.getElementById('x').innerHTML = ''", true],
  ['sauber', 'export function f(sicht) { return `<p>${sicht.id}</p>` }', false],
]) {
  if (NUR_RENDERN_VERSTOSS.test(quelltext) !== erwartetRot) befunde.push(`(f-kal) Rot-Kalibrierung '${name}': erwartet ${erwartetRot ? 'rot' : 'grün'}, Gate urteilt anders`)
}

// F44 WS-2b: Die Übersicht importiert aus api.js nur lesende hole*-Funktionen. F44 WS-3b: dasselbe
// für das ausgelagerte Detail der Entwicklung (views/workboard-detail.js) — es rendert nur und
// importiert heute gar nichts aus api.js; ein Import wäre nur als lesende hole*-Funktion zulässig.
for (const [name, quelltext] of [
  ['views/dashboard.js', dashboardQuelltext],
  ['views/workboard-detail.js', workboardDetailQuelltext],
]) {
  const apiImport = quelltext.match(/import\s*\{([^}]*)\}\s*from\s*'\.\.\/api\.js'/)
  if (apiImport === null) continue
  const schreibend = apiImport[1]
    .split(',')
    .map((eintrag) => eintrag.trim())
    .filter((eintrag) => eintrag !== '' && !eintrag.startsWith('hole'))
  if (schreibend.length > 0) befunde.push(`(f) ${name} importiert aus api.js nicht nur lesende hole*-Funktionen: ${schreibend.join(', ')}`)
}

// ─── (h) Entwicklung-Board: „Braucht dich“ aus attention-daten.js, keine eigene Halt-Regel ──
const H_IMPORT_MUSTER = /import\s*\{[^}]*\bfiltereAttentionWorkflows\b[^}]*\}\s*from\s*'\.\/attention-daten\.js'/
const H_AUFRUF_MUSTER = /\bfiltereAttentionWorkflows\(/
const H_EIGENE_REGEL_MUSTER = /naechster\??\.art/
/**
 * Bewertet eine (kommentarfreie) Quelle von entwicklung-daten.js nach (h).
 * @param quelltext - Quelltext ohne Kommentare
 * @returns Liste der Verstöße (leer = grün)
 */
function verstoesseGegenH(quelltext) {
  const verstoesse = []
  if (!H_IMPORT_MUSTER.test(quelltext)) verstoesse.push('importiert filtereAttentionWorkflows nicht aus attention-daten.js')
  if (!H_AUFRUF_MUSTER.test(quelltext)) verstoesse.push('ruft filtereAttentionWorkflows nicht auf (nur importiert)')
  if (H_EIGENE_REGEL_MUSTER.test(quelltext)) verstoesse.push('prüft naechster.art selbst — „wartet auf den Menschen“ gehört ausschließlich in attention-daten.js, sonst laufen Board und Entscheidungen auseinander')
  return verstoesse
}
for (const verstoss of verstoesseGegenH(entwicklungDatenQuelltext)) befunde.push(`(h) entwicklung-daten.js ${verstoss}`)

// (h-kal) Rot-Kalibrierung von (h), Muster (e-kal).
const H_KAL_IMPORT = "import { filtereAttentionWorkflows } from './attention-daten.js'\n"
const kalibrierungH = [
  ['eigene Halt-Regel', `${H_KAL_IMPORT}const wartet = (w) => filtereAttentionWorkflows([w]).length > 0 || w.naechster?.art === 'haltFreigabe'`, true],
  ['nur importiert, nie aufgerufen', `${H_KAL_IMPORT}const x = 1`, true],
  ['kein Import', "const wartet = (w) => filtereAttentionWorkflows([w]).length > 0", true],
  ['sauber', `${H_KAL_IMPORT}const wartet = (w) => filtereAttentionWorkflows([w]).length > 0`, false],
]
for (const [name, quelltext, erwartetRot] of kalibrierungH) {
  if (verstoesseGegenH(quelltext).length > 0 !== erwartetRot) befunde.push(`(h-kal) Rot-Kalibrierung '${name}': erwartet ${erwartetRot ? 'rot' : 'grün'}, Gate urteilt anders`)
}

// ─── (g) Syntaxprüfung (node --check) ───────────────────────────────────────
for (const pfad of ['public/leitstand/views/workboard.js', 'public/leitstand/views/workboard-detail.js', 'public/leitstand/rollen-anzeige.js', 'public/leitstand/views/attention.js', 'public/leitstand/views/dashboard.js', 'public/leitstand/views/nutzung.js', 'public/leitstand/attention-daten.js', 'public/leitstand/fokus-daten.js', 'public/leitstand/entwicklung-daten.js', 'public/leitstand/api.js', 'public/leitstand/app.js']) {
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
