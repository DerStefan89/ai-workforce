/**
 * Datei: scripts/check-f45-b2b4b-jarvis.mjs
 *
 * Zweck: Gate F45 B2b-4b „Jarvis im Arbeitsordner“ (features/F45/plan-b2b4b.md; F-1085 (5), F-1088 (5)).
 * (a) Ortszeilen: höchstens 5 offene Arbeitsordner, neueste zuerst, bei mehr der Hinweis „weitere“, Titel aus dem Auftrag (Rückfall Ziel), keine Kennung im
 *     Text bei vorhandenem Titel.
 * (b) Bitgleich: (b1) ablaufOrte leer = fehlend; (b2) die drei neuen Ortsregelzeilen (feste Zeichenketten) gegen die alte
 *     cd-Zeile getauscht ⇒ Hash des Texts von 8ee5f8b — sonst nichts geändert; (b3) Hash des neuen Texts ohne Ordner.
 * (c) Blockform in der Jarvis-Regel: Kopf/Fuß/Ortszeile aus public/leitstand/code-daten.js; src/jarvis/index.ts ohne
 *     Set-Location-, Blockkopf- oder Quoting-Regel; jarvis-orte.mjs ruft ortZeile( und importiert aus code-daten.js.
 * (d) D13: zwei gleichzeitige POST /api/chat gegen den echten Handler (Attrappen zur Laufzeit: Wegwerf-Kontrollzustand mit
 *     Arbeitsordnern, Worker-Attrappe hält den Lauf offen) ⇒ genau ein 202, ein 409; der Auftrag des 202 trägt die
 *     Ortszeilen. Statisch (die eigentliche Sicherung, die Laufzeitprobe ist zeitabhängig): kein await zwischen
 *     `if (laufAktiv)` und starteRollenChatLauf( in beiden Chat-Routen; offeneAblaufOrte nicht async, ohne await/readdirAsync.
 * (e) starteWorkflowSchritt( genau 6-mal im Server.
 * (f) Rotfälle: je Prüfung ein verfälschter Eingang ⇒ Befund.
 *
 * Wird aufgerufen von: npm run check:gates. Ausgaben ohne Pfade (Wegwerf-Ordner unter os.tmpdir, danach entfernt).
 */

import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { BLOCK_FUSS, BLOCK_KOPF, ortZeile } from '../public/leitstand/code-daten.js'
import { validiereArbeitsordnerDaten } from '../src/arbeitsordner/index.ts'
import { registriereAuftrag } from '../src/auftrag/index.ts'
import { baueJarvisAuftragstext } from '../src/jarvis/index.ts'
import { registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { baueJarvisOrte, waehleOffeneArbeitsordner } from './leitstand/jarvis-orte.mjs'
import { erzeugeRequestHandler } from './leitstand-server.mjs'

const befunde = []
const sha256 = (text) => createHash('sha256').update(text).digest('hex')

const PROJEKT = String.raw`C:\Projekte\mein projekt`
const BLOCK = { kopf: BLOCK_KOPF, ortZeile: ortZeile(PROJEKT), fuss: BLOCK_FUSS }
/** sha256 von baueJarvisAuftragstext('Wie sichere ich?', [], { cdZeile: "cd 'C:\Projekte\mein projekt'" }) auf 8ee5f8b. */
const GOLDEN_ALT = '627017e6606ec923581578aeb159d73462e242371aa52511b564973da281b6bf'
/** sha256 des neuen Texts ohne Ordner (B2b-4b) mit denselben Eingaben und BLOCK. */
const GOLDEN_NEU = '6bc8fffca97c39f4e014ab17505c1dac9b0844c86544419f878c4bcc8dd0dbfb'
/** Die drei neuen Ortsregelzeilen als feste Zeichenketten (nicht über die Funktion gebaut) und die alte Zeile von 8ee5f8b. */
const NEUE_ZEILEN = [
  '- Jeder Block hat diese Form, ohne Einzug: erste Zeile „& {“, zweite Zeile die Ortszeile, danach die Befehle, letzte Zeile „}“ — fehlt der Ordner, bricht der Block ab.',
  String.raw`- Ortszeile für das Projekt: Set-Location -LiteralPath 'C:\Projekte\mein projekt' -ErrorAction Stop`,
  '- Pfade und Befehlsformen im bisherigen Gesprächsverlauf können veraltet sein; maßgeblich sind die Ortszeilen hier.',
].join('\n')
const ALTE_ZEILE = String.raw`- Erste Zeile jedes Blocks: cd 'C:\Projekte\mein projekt'`

/**
 * Ein Eintrag wie für GET /api/arbeitsordner.
 * @param workflowId - Kennung
 * @param am - aktualisiert_am
 * @param status - wirksamer Status
 * @param ordnerVorhanden - liegt der Ordner auf der Platte
 * @returns Eintrag
 */
const eintrag = (workflowId, am, status = 'BEREIT', ordnerVorhanden = true) => ({ workflowId, daten: { status, pfad: `C:\\p-laeufe\\${sha256(workflowId).slice(0, 8)}`, branch: `wf/${workflowId}`, basis_commit: null, grund: null, aktualisiert_am: am }, ordnerVorhanden })

/**
 * (a) Prüft die Ortszeilen eines Auftragstexts gegen die erwartete Reihenfolge.
 * @param text - Auftragstext
 * @param erwartet - Titel in erwarteter Reihenfolge
 * @param kennungen - Kennungen, die nicht im Text stehen dürfen
 * @param weitere - erwartet der Hinweis „weitere, ältere offene Arbeitsordner“ (mehr als 5 offen)
 * @returns Befunde
 */
function pruefeOrtszeilen(text, erwartet, kennungen = [], weitere = false) {
  const b = []
  const zeilen = text.split('\n').filter((z) => z.startsWith('  - „'))
  if (zeilen.length > 5) b.push(`(a) ${zeilen.length} Ortszeilen (höchstens 5)`)
  const titel = zeilen.map((z) => z.slice(5, z.indexOf('“:')))
  if (JSON.stringify(titel) !== JSON.stringify(erwartet)) b.push(`(a) Titel/Reihenfolge ${JSON.stringify(titel)}, erwartet ${JSON.stringify(erwartet)}`)
  for (const z of zeilen) if (!/: Set-Location -LiteralPath '.+' -ErrorAction Stop$/.test(z)) b.push(`(a) Ortszeile nicht in Blockform: ${z.slice(0, 60)}`)
  for (const k of kennungen) if (text.includes(k)) b.push(`(a) interne Kennung ${k} im Text`)
  if (erwartet.length > 0 && !text.includes('Wähle nie stillschweigend einen Ordner')) b.push('(a) Nachfrage-Regel fehlt')
  if (text.includes('Es gibt weitere, ältere offene Arbeitsordner') !== weitere) b.push(`(a) Hinweis auf weitere Arbeitsordner ${weitere ? 'fehlt' : 'ohne Grund'}`)
  return b
}

/**
 * (b) Bitgleichheit ohne Ordner.
 * @param bauen - (optionen) => Auftragstext
 * @returns Befunde
 */
function pruefeBitgleich(bauen) {
  const b = []
  const ohne = bauen({ block: BLOCK })
  if (bauen({ block: BLOCK, ablaufOrte: [] }) !== ohne) b.push('(b1) ablaufOrte: [] ändert den Text')
  if (!ohne.includes(NEUE_ZEILEN)) b.push('(b2) die zwei Ortsregelzeilen stehen nicht wörtlich im Text')
  else if (sha256(ohne.replace(NEUE_ZEILEN, ALTE_ZEILE)) !== GOLDEN_ALT) b.push('(b2) außer der Ortsregel hat sich der Text gegenüber 8ee5f8b geändert')
  if (sha256(ohne) !== GOLDEN_NEU) b.push(`(b3) Golden-Hash ohne Ordner abweichend: ${sha256(ohne)}`)
  return b
}

/**
 * (c) Blockform in Regeltext und Quellen.
 * @param text - Auftragstext mit BLOCK
 * @param jarvisQuelle - Quelltext src/jarvis/index.ts
 * @param orteQuelle - Quelltext scripts/leitstand/jarvis-orte.mjs
 * @returns Befunde
 */
function pruefeBlockform(text, jarvisQuelle, orteQuelle) {
  const b = []
  if (!text.includes(`erste Zeile „${BLOCK_KOPF}“, zweite Zeile die Ortszeile, danach die Befehle, letzte Zeile „${BLOCK_FUSS}“`)) b.push('(c) Formzeile ohne BLOCK_KOPF/BLOCK_FUSS')
  if (!text.includes(`- Ortszeile für das Projekt: ${ortZeile(PROJEKT)}`)) b.push('(c) Projekt-Ortszeile nicht aus ortZeile')
  if (/^- Erste Zeile jedes Blocks: cd /m.test(text)) b.push('(c) alte cd-Regel im Text')
  for (const verboten of ['Set-Location -LiteralPath', "'& {'", '"& {"', 'psArgument', "replace(/'/"]) if (jarvisQuelle.includes(verboten)) b.push(`(c) src/jarvis/index.ts enthält ${verboten}`)
  if (!orteQuelle.includes("import { BLOCK_FUSS, BLOCK_KOPF, befehlsBlock, ortZeile } from '../../public/leitstand/code-daten.js'")) b.push('(c) jarvis-orte.mjs importiert die Blockform nicht aus code-daten.js')
  if ((orteQuelle.match(/\bortZeile\(/g) ?? []).length < 2) b.push('(c) jarvis-orte.mjs baut die Ortszeilen nicht über ortZeile(')
  return b
}

/**
 * (d, statisch) Kein await im D13-Fenster der Chat-Routen; offeneAblaufOrte synchron.
 * @param server - Quelltext des Servers
 * @returns Befunde
 */
function pruefeD13Quelltext(server) {
  const b = []
  for (const route of ["pfad === '/api/chat')", "pfad === '/api/chat/zusammenfassen')"]) {
    const start = server.indexOf(route)
    const pruefung = server.indexOf('if (laufAktiv)', start)
    const laufstart = server.indexOf('starteRollenChatLauf(', pruefung)
    // bis zum Zeilenende des Aufrufs: auch ein await in seiner Argumentliste zählt (code-reviewer 5)
    const aufrufEnde = laufstart === -1 ? -1 : server.indexOf('\n', laufstart)
    if (start === -1 || pruefung === -1 || aufrufEnde === -1) b.push(`(d) Chat-Route ${route} nicht gefunden`)
    else if (/\bawait\b/.test(server.slice(pruefung, aufrufEnde))) b.push(`(d) await zwischen if (laufAktiv) und starteRollenChatLauf( (${route})`)
  }
  const kopf = server.indexOf('function offeneAblaufOrte(')
  const ende = kopf === -1 ? -1 : server.indexOf('\n  }\n', kopf)
  if (kopf === -1) b.push('(d) offeneAblaufOrte fehlt')
  else if (ende === -1) b.push('(d) Rumpf von offeneAblaufOrte nicht gefunden (Zeilenenden?)')
  else {
    const rumpf = server.slice(kopf, ende)
    if (server.slice(Math.max(0, kopf - 6), kopf) === 'async ') b.push('(d) offeneAblaufOrte ist async')
    for (const verboten of ['await', 'readdirAsync', 'leseKontrollzustandOrdner']) if (rumpf.includes(verboten)) b.push(`(d) offeneAblaufOrte enthält ${verboten}`)
  }
  return b
}

const SERVER = readFileSync('scripts/leitstand-server.mjs', 'utf8')
const JARVIS = readFileSync('src/jarvis/index.ts', 'utf8')
const ORTE = readFileSync('scripts/leitstand/jarvis-orte.mjs', 'utf8')
const bauen = (optionen) => baueJarvisAuftragstext('Wie sichere ich?', [], optionen)

// (a) Ortszeilen
const NEUN = [
  eintrag('wf-a', '2026-10-01T00:00:00Z'),
  eintrag('wf-b', '2026-10-07T00:00:00Z'),
  eintrag('wf-c', '2026-10-03T00:00:00Z'),
  eintrag('wf-d', '2026-10-05T00:00:00Z'),
  eintrag('wf-e', '2026-10-02T00:00:00Z'),
  eintrag('wf-f', '2026-10-06T00:00:00Z'),
  eintrag('wf-g', '2026-10-09T00:00:00Z', 'ENTFERNT'),
  eintrag('wf-h', '2026-10-09T00:00:00Z', 'FEHLGESCHLAGEN'),
  eintrag('wf-i', '2026-10-09T00:00:00Z', 'BEREIT', false),
]
const titelVon = (ao) => ({ ...ao, titel: `Titel ${ao.workflowId.slice(3).toUpperCase()}` })
const TEXT_A = bauen(baueJarvisOrte(PROJEKT, waehleOffeneArbeitsordner(NEUN).map(titelVon)))
{
  const vor = befunde.length
  befunde.push(...pruefeOrtszeilen(TEXT_A, ['Titel B', 'Titel F', 'Titel D', 'Titel C', 'Titel E'], ['wf-b', 'wf-f'], true))
  const ziel = bauen(baueJarvisOrte(PROJEKT, [{ workflowId: 'wf-z', pfad: 'C:\\wt\\z', ziel: 'Nur ein Ziel\nzweite Zeile' }]))
  befunde.push(...pruefeOrtszeilen(ziel, ['Nur ein Ziel zweite Zeile'], ['wf-z']))
  if (befunde.length === vor) console.log('✓ (a) Ortszeilen: 9 Einträge (aufgeräumt, fehlgeschlagen, ohne Ordner) ⇒ 6 offen ⇒ 5 + Hinweis „weitere“, neueste zuerst, Titel aus Auftrag bzw. Ziel einzeilig, keine Kennung, Nachfrage-Regel.')
}

// (b) Bitgleich
{
  const vor = befunde.length
  befunde.push(...pruefeBitgleich(bauen))
  if (befunde.length === vor) console.log('✓ (b) Bitgleich ohne Ordner: [] = fehlend; außer der Ortsregel identisch zu 8ee5f8b; Golden-Hash des neuen Texts.')
}

// (c) Blockform
{
  const vor = befunde.length
  befunde.push(...pruefeBlockform(bauen({ block: BLOCK }), JARVIS, ORTE))
  if (befunde.length === vor) console.log('✓ (c) Blockform: Kopf/Fuß/Ortszeile aus code-daten.js, keine zweite Quoting-Regel in src/jarvis.')
}

// (d) D13 statisch + (e)
{
  const vor = befunde.length
  befunde.push(...pruefeD13Quelltext(SERVER))
  const starte = SERVER.split('starteWorkflowSchritt(').length - 1
  if (starte !== 6) befunde.push(`(e) starteWorkflowSchritt( ${starte}-mal im Server (erwartet 6)`)
  if (befunde.length === vor) console.log('✓ (d) D13 statisch: kein await im Fenster beider Chat-Routen, offeneAblaufOrte synchron; (e) starteWorkflowSchritt( = 6.')
}

// (d) D13 über den echten Handler
const basis = mkdtempSync(join(tmpdir(), 'f45-b2b4b-'))
process.on('exit', () => raeumeVerzeichnis(basis))
{
  const vor = befunde.length
  const basisVerzeichnis = join(basis, 'kontrollzustand')
  const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }
  const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage('startvorlagen/beispielprojekt.json'))
  const orte = [
    { titel: 'Export als CSV', am: '2026-10-20T10:00:00Z' },
    { titel: 'Login reparieren', am: '2026-10-21T10:00:00Z' },
  ].map(({ titel, am }) => {
    const auftragId = randomUUID()
    const workflowId = `wf-b2b4b-${randomUUID()}`
    const pfad = join(basis, 'p-laeufe', sha256(workflowId).slice(0, 8))
    mkdirSync(pfad, { recursive: true })
    registriereAuftrag(auftragId, profilReferenz, titel, 'Gate-Auftrag.', ladeOptionen)
    const schritt = { schritt_id: 's1', rolle: 'ausfuehrung', werkzeugsatz: 'schreibend', worker: 'claude-code', modell: 'claude-sonnet-5', eingaben: [], output_schema: null, freigabe: 'AUTOMATISCH', risiko: 'Gate-Fixture.', zeitgrenze_ms: 600000, nachfolger: null, status: 'OFFEN', lauf_id: null }
    registriereWorkflow({ workflow_schema: 'v0', workflow_id: workflowId, auftrag_id: auftragId, version: 1, ziel: 'Gate-Ziel.', status: 'OFFEN', aktiver_schritt_id: 's1', grenzen: { max_schritte: 6, max_replans: 1 }, schritte: [schritt] }, profilReferenz, ladeOptionen)
    const daten = { arbeitsordner_schema: 'v0', workflow_id: workflowId, projekt_wurzel: basis, pfad, branch: `wf/${workflowId}`, basis_commit: null, status: 'BEREIT', grund: null, vorbereitung: null, aufraeumen: null, aktualisiert_am: am }
    const verstoesse = validiereArbeitsordnerDaten(daten)
    if (verstoesse.length > 0) befunde.push(`(d) Fixture-Arbeitsordner ungültig: ${verstoesse.join('; ')}`)
    registriereKernArtefakt(`arbeitsordner-${workflowId}`, profilReferenz, { erzeuger: 'check-f45-b2b4b' }, daten, [], ladeOptionen)
    return { titel, workflowId, pfad }
  })
  let freigeben = () => {}
  const gehalten = new Promise((r) => {
    freigeben = r
  })
  const gesehen = []
  const fuehreAufgabeDurchFn = async (_laufId, _profil, eingaben) => {
    gesehen.push(eingaben.auftragstext)
    await gehalten
    return { ok: false, stufe: 'startfreigabe', grund: 'Gate-Attrappe' }
  }
  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, projektId: 'gate-b2b4b', fuehreAufgabeDurchFn }))
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const url = `http://127.0.0.1:${server.address().port}/api/chat`
  try {
    const anfrage = () => fetch(url, { method: 'POST', body: JSON.stringify({ nachricht: 'Wie sichere ich den Export?' }) }).then((a) => a.status)
    const stati = (await Promise.all([anfrage(), anfrage()])).sort()
    if (JSON.stringify(stati) !== '[202,409]') befunde.push(`(d) zwei gleichzeitige Anfragen ⇒ ${JSON.stringify(stati)} (erwartet [202,409])`)
    for (let i = 0; i < 50 && gesehen.length === 0; i++) await new Promise((r) => setTimeout(r, 20))
    if (gesehen.length !== 1) befunde.push(`(d) ${gesehen.length} Läufe gestartet (erwartet 1)`)
    else
      befunde.push(
        ...pruefeOrtszeilen(
          gesehen[0],
          ['Login reparieren', 'Export als CSV'],
          orte.map((o) => o.workflowId),
        ),
      )
    if (gesehen[0] !== undefined && !orte.every((o) => gesehen[0].includes(ortZeile(o.pfad)))) befunde.push('(d) Ortszeilen der Arbeitsordner fehlen im Auftrag')
  } finally {
    freigeben()
    await new Promise((r) => setTimeout(r, 100))
    await new Promise((r) => server.close(r))
  }
  if (befunde.length === vor) console.log('✓ (d) D13 echt: zwei gleichzeitige POST /api/chat ⇒ 202 + 409, ein Lauf; sein Auftrag trägt beide Ortszeilen, neueste zuerst, ohne Kennung.')
}

// (f) Rotfälle
{
  const vor = befunde.length
  const sechsOffen = baueJarvisOrte(PROJEKT, NEUN.slice(0, 6).map((e) => ({ workflowId: e.workflowId, pfad: e.daten.pfad, titel: e.workflowId })))
  const rot = [
    ['6 Ortszeilen', pruefeOrtszeilen(bauen({ block: BLOCK, ablaufOrte: [...sechsOffen.ablaufOrte, sechsOffen.ablaufOrte[0]] }), sechsOffen.ablaufOrte.map((o) => o.titel))],
    ['Reihenfolge vertauscht', pruefeOrtszeilen(TEXT_A, ['Titel F', 'Titel B', 'Titel D', 'Titel C', 'Titel E'], [], true)],
    ['Kennung im Text', pruefeOrtszeilen(`${TEXT_A}\nwf-b`, ['Titel B', 'Titel F', 'Titel D', 'Titel C', 'Titel E'], ['wf-b'], true)],
    ['Hinweis „weitere“ fehlt', pruefeOrtszeilen(bauen({ ...baueJarvisOrte(PROJEKT, waehleOffeneArbeitsordner(NEUN).map(titelVon)), weitereAblaufOrte: false }), ['Titel B', 'Titel F', 'Titel D', 'Titel C', 'Titel E'], [], true)],
    ['await im Aufruf', pruefeD13Quelltext(SERVER.replace('baueJarvisOrte(repoWurzel, offeneAblaufOrte())), false', 'baueJarvisOrte(repoWurzel, await offeneAblaufOrte())), false'))],
    ['[] ändert den Text', pruefeBitgleich((o) => (Array.isArray(o.ablaufOrte) ? `${bauen(o)} ` : bauen(o)))],
    ['ein Zeichen anders', pruefeBitgleich((o) => bauen(o).replace('PowerShell (Windows)', 'PowerShell (Win)'))],
    ['Ortszeile mit cd', pruefeBlockform(bauen({ block: { ...BLOCK, ortZeile: `cd '${PROJEKT}'` } }), JARVIS, ORTE)],
    ['Quoting in src/jarvis', pruefeBlockform(bauen({ block: BLOCK }), `${JARVIS}\nconst x = 'Set-Location -LiteralPath'`, ORTE)],
    ['await im Fenster', pruefeD13Quelltext(SERVER.replace("if (pruefeGlobaleLaufSperre(res)) return\n\n      const verlaufsfenster = ladeRollenVerlaufsfenster(KONFIGURATION_JARVIS, 8", "if (pruefeGlobaleLaufSperre(res)) return\n      await null\n      const verlaufsfenster = ladeRollenVerlaufsfenster(KONFIGURATION_JARVIS, 8"))],
    ['offeneAblaufOrte async', pruefeD13Quelltext(SERVER.replace('function offeneAblaufOrte(', 'async function offeneAblaufOrte('))],
  ]
  for (const [name, ergebnis] of rot) if (ergebnis.length === 0) befunde.push(`(f) Rotfall '${name}' wird nicht erkannt`)
  if (befunde.length === vor) console.log(`✓ (f) Rot-Selbsttest: ${rot.length} verfälschte Eingänge erkannt.`)
}

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e) (scripts/check-f45-b2b4b-jarvis.mjs):`)
  for (const b of befunde) console.error(`  - ${b}`)
  process.exit(1)
}
console.log('\n✓ Keine Befunde (scripts/check-f45-b2b4b-jarvis.mjs).')
