#!/usr/bin/env node
/**
 * Datei: scripts/check-f45-b2b3b2b2b1-nachweis.mjs
 *
 * Zweck: Gate für F45 B2b-3b-2b-2b-1 „Rückfrage-Kanal: Vorbereitung echter Nachweislauf“ (features/F45/plan-b2b3b2b2b1-v2.md, Advisor
 * features/F45/advisor-b2b3b2b2b1.md). Neue Module werden je Fall geladen, damit jeder Fall gegen main (Rot-Nachweis per git archive,
 * F-1127) seinen eigenen Befund zeigt.
 *
 * Prüft:
 * (a) Sichtung (E-R3-Sichtung = B): ohne R3 genau ein Klick (`data-aktion="sichtung"`), mit R3 in Schritt 1 keine Bestätigung, sondern
 *     „Protokoll-Abweichung ansehen“; Schritt 2 trägt den R3-Text escaped und die Bestätigung; workflows.js führt R3 im Kennzeichen und
 *     kennt die Aktion `sichtung-r3`; ist der Kanal-Stand nicht ladbar, gibt es keine Bestätigung (fail closed).
 * (b) Nachweis-Werkzeug Ende zu Ende an einer Fixture (Kontrollzustand + Rohstrom unter einer Fixture-Installation, Protokoll aus der echten
 *     Vermittlung mit dem echten Schreiber, Terminalmarke vom echten Evaluator): Lauf A (erlauben, ablehnen, Frage ⇒ ERFOLGREICH) und
 *     Lauf B (Write außerhalb ⇒ VERWEIGERT) mit dem Soll je Prüfpunkt; Rot: Ablehnungstext der CLI anders, Zählung abweichend,
 *     Rohstrom-Hash falsch; andere CLI-Version als deklariert ⇒ CLI-abhängige Punkte „erfüllt mit Abweichung“ (E-F-1136 (1) = B);
 *     Lauf ohne Terminalmarke ⇒ Bericht mit Exit 0; Exit 1 bei unbekanntem Lauf oder Projekt und bei `--aus` im
 *     Kontrollzustand, im Rohstrom-Ordner oder auf einem Ordner.
 * (c) nur lesend: Kontrollzustand und Rohstrom-Ordner der Fixture sind nach allen Aufrufen bitgleich (Pfade + Hash).
 * (d) Ausgabe ohne absolute Pfade (Fixture, Temp, Home) und ohne das Lauf-Token (zur Laufzeit zusammengesetzt, F-1134).
 * (e) Doku: Anleitung docs/harness/rueckfrage-nachweislauf.md und Abschnitt in docs/harness/startfreigabe-erneuern.md.
 * (w) Grenzen: leitstand-server.mjs ≤ Grenze der Wachstumsbremse, starteWorkflowSchritt( 6×, scripts/_rueckfrage-aus-pruefung.mjs
 *     unverändert (gepinnter Hash wie Gate f45-b2b3b2b2a3 (w)).
 *
 * Wird aufgerufen von: `npm run check:gates` (und damit `npm run check`).
 *
 * Aufruf: node scripts/check-f45-b2b3b2b2b1-nachweis.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { randomBytes, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { schreibeWirkungsmarke, sha256Hex } from '../src/checkpoint-store/index.ts'
import { leseRueckfrageProtokoll } from '../src/execution-controller/index.ts'
import { registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { klassifiziereLauf } from '../src/result-evaluator/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
console.log('\n=== F45-B2b-3b-2b-2b-1-Nachweis-Check ===\n')
const aufraeumen = []

/** Meldet einen Fall: ✓ bei erfüllter Bedingung, sonst ein Befund. */
function pruefe(bedingung, ok, fehler) {
  if (bedingung) console.log(`  ✓ ${ok}`)
  else befunde.push(fehler)
}

/** Lädt ein Modul; ein Ladefehler wird zum Objekt { fehler } statt zu werfen. */
async function lade(pfad) {
  try {
    return await import(pfad)
  } catch (fehler) {
    return { fehler: fehler.message.split('\n')[0] }
  }
}

/** Liest eine Datei als Text, fehlt sie ⇒ ''. */
const text = (pfad) => (existsSync(pfad) ? readFileSync(pfad, 'utf8').replace(/\r\n/g, '\n') : '')

/** Hash (LF) von scripts/_rueckfrage-aus-pruefung.mjs (Fassung #358, wie Gate f45-b2b3b2b2a3 (w)). */
const REGEL_HASH = '99bf07b69c126c0f8df9d789a779270139fd19842c2b26e47c4bc0b06d282d27'

/**
 * Schnappschuss eines Ordners: relative Pfade mit Hash (Gate (c)).
 * @param wurzel - Ordner
 * @returns sortierte Zeilen „pfad hash“
 */
function schnappschuss(wurzel) {
  const zeilen = []
  const gehe = (ordner, rel) => {
    if (!existsSync(ordner)) return
    for (const name of readdirSync(ordner).sort()) {
      const voll = join(ordner, name)
      if (statSync(voll).isDirectory()) gehe(voll, `${rel}${name}/`)
      else zeilen.push(`${rel}${name} ${sha256Hex(readFileSync(voll))}`)
    }
  }
  gehe(wurzel, '')
  return zeilen
}

try {
  // ── (a) Sichtung in zwei Schritten bei R3 ─────────────────────────────────────────────────────────────────────────────
  {
    const modul = await lade('../public/leitstand/views/workflow-eingriffe.js')
    if (modul.fehler !== undefined) befunde.push(`(a) Modul nicht ladbar: ${modul.fehler}`)
    else {
      const basis = { schrittId: 's2', laufId: 'l-2', nachfolger: 's3' }
      const ohne = modul.renderSichtungDialog('w-1', { ...basis, kanal: { abgleich: { art: 'abgleich', grund: 'nicht_von_stefan' }, abweichung: null } })
      pruefe(ohne.includes('data-aktion="sichtung"') && !ohne.includes('sichtung-r3'), '(a) ohne R3: „Sichtung bestätigt – weiter“ mit einem Klick (unverändert).', '(a) ohne R3 geändert')
      const r3 = 'Länge abweichend <img src=x>'
      const mit = modul.renderSichtungDialog('w-1', { ...basis, kanal: { abgleich: { art: 'abweichung', grund: r3 }, abweichung: r3 } })
      pruefe(!mit.includes('data-aktion="sichtung"') && mit.includes('data-aktion="sichtung-r3"') && mit.includes('id="wf-sichtung-r3"'), '(a) mit R3: Schritt 1 ohne Bestätigung, Knopf „Protokoll-Abweichung ansehen“.', '(a) mit R3 ist „Sichtung bestätigt – weiter“ in Schritt 1 mit einem Klick möglich')
      const schritt2 = typeof modul.renderSichtungR3Schritt === 'function' ? modul.renderSichtungR3Schritt('w-1', r3) : null
      pruefe(
        schritt2 !== null && schritt2.meldung.includes('&lt;img src=x&gt;') && !schritt2.meldung.includes('<img') && schritt2.knopf.includes('data-aktion="sichtung"'),
        '(a) Schritt 2: R3-Text escaped, Bestätigung über denselben Schreibweg.',
        '(a) Schritt 2 fehlt oder zeigt den R3-Text nicht escaped'
      )
      const unbekannt = modul.renderSichtungDialog('w-1', { ...basis, kanal: null, kanalUnbekannt: true })
      pruefe(!unbekannt.includes('data-aktion="sichtung'), '(a) Kanal-Stand nicht ladbar: keine Bestätigung (fail closed, qa 7).', '(a) Kanal-Stand nicht ladbar: Bestätigung mit einem Klick möglich')
      const workflows = text('public/leitstand/views/workflows.js')
      pruefe(workflows.includes("aktion === 'sichtung-r3'") && workflows.includes('sichtungsAbweichung(sichtung) !== null'), '(a) workflows.js: Aktion sichtung-r3 und R3 im Kennzeichen.', '(a) workflows.js ohne Aktion sichtung-r3 oder ohne R3 im Kennzeichen')
    }
  }

  // ── (b)(c)(d) Nachweis-Werkzeug an einer Fixture ──────────────────────────────────────────────────────────────────────
  const werkzeug = await lade('./leitstand/nachweis-rueckfrage-auswerten.mjs')
  const vermittlungModul = await lade('./leitstand/rueckfrage-vermittlung.mjs')
  const schreiberModul = await lade('./leitstand/rueckfrage-protokoll.mjs')
  if (werkzeug.fehler !== undefined) befunde.push(`(b) Modul fehlt: ${werkzeug.fehler}`)
  else {
    const wurzel = mkdtempSync(join(tmpdir(), 'f45-b2b3b2b2b1-'))
    aufraeumen.push(wurzel)
    const basis = join(wurzel, 'proj', 'kontrollzustand')
    const arbeitsordner = join(wurzel, 'proj', 'kontrollzustand', 'arbeitsordner-a')
    mkdirSync(arbeitsordner, { recursive: true })
    const eintragProjekt = (id, repo) => ({ id, name: id, repo_pfad: repo, startvorlage_pfad: 'startvorlagen/x.json', profil_pfad: 'profiles/x.json', basisverzeichnis: 'kontrollzustand', status: 'IDEE' })
    writeFileSync(join(wurzel, 'projekte.json'), JSON.stringify({ projekte_schema: 'v0', projekte: [eintragProjekt('ai-workforce', '.'), eintragProjekt('proj', 'proj')] }))
    const profil = leiteProfilReferenzAb(ladeStartvorlage('startvorlagen/beispielprojekt.json'))
    const still = { basisVerzeichnis: basis, schreiber: () => {} }
    // F-1134: Token zur Laufzeit zusammengesetzt.
    const token = randomBytes(32).toString('hex')
    const vermittlung = vermittlungModul.erzeugeRueckfrageVermittlung({
      protokolliere: schreiberModul.erzeugeRueckfrageProtokollSchreiber({ profilReferenz: profil, basisVerzeichnis: basis, home: homedir(), temp: tmpdir() }),
    })
    const INPUT_A = { command: "node -e \"require('fs').writeFileSync('kanal-probe-a.txt','a')\"", description: 'Probe a' }
    const INPUT_B = { command: "node -e \"require('fs').writeFileSync('kanal-probe-b.txt','b')\"", description: 'Probe b' }
    const INPUT_C = { file_path: join(tmpdir(), 'kanal-probe-c.txt'), content: 'c' }
    const init = { type: 'system', subtype: 'init', cwd: arbeitsordner, session_id: randomUUID(), claude_code_version: '2.1.300', tools: ['Bash', 'Edit', 'Read', 'Write', 'mcp__rueckfrage__frage_stefan'], mcp_servers: [{ name: 'rueckfrage', status: 'connected', source: 'dynamic' }] }
    const ergebnis = (id, inhalt, fehler) => JSON.stringify({ type: 'user', parent_tool_use_id: null, message: { content: [{ type: 'tool_result', tool_use_id: id, content: inhalt, is_error: fehler }] } })

    /**
     * Ein Lauf durch die echte Vermittlung, den echten Protokoll-Schreiber und den echten Evaluator; Laufakte und Rohstrom wie das Gateway.
     * @param schritte - (laufId) => Promise<{ zeilen, denials }> (stellt und beantwortet Rückfragen)
     * @param verfaelsche - { zaehlung?: (z) => z, text?: string } für Rot-Fälle
     * @returns { laufId, ergebnis }
     */
    async function fahreLauf(schritte, verfaelsche = {}) {
      const laufId = `gate-b1-${randomUUID()}`
      schreibeWirkungsmarke(laufId, profil, 'run_prepared', {}, still)
      vermittlung.oeffneLauf(laufId, { token, arbeitsordner, werkzeugNamen: ['Bash', 'Edit', 'Read', 'Write'] })
      const { zeilen, denials } = await schritte(laufId, verfaelsche)
      const zaehlungEcht = vermittlung.zugang(laufId, () => {}).zaehlung()
      vermittlung.beendeLauf(laufId)
      const stdout = [JSON.stringify(init), ...zeilen, JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: 'fertig', permission_denials: denials })].join('\n')
      const rohInhalt = JSON.stringify({ werkzeugStartziel: ['claude.exe'], stdout, stderr: '', exitCode: 0, startfehler: null, beendigungsart: null })
      mkdirSync(join(wurzel, 'kontrollzustand-roh', laufId), { recursive: true })
      const rohPfad = join(wurzel, 'kontrollzustand-roh', laufId, 'rohstrom.json')
      writeFileSync(rohPfad, rohInhalt)
      const laufakte = { laufakte_schema: 'v0', lauf_id: laufId, werkzeug_version_deklariert: verfaelsche.deklariert ?? '2.1.300 (Claude Code)', worker: 'claude-code', beobachtungsbasis_vollstaendig: true, rohstrom_referenz: { pfad: join('kontrollzustand-roh', laufId, 'rohstrom.json'), inhalts_hash: sha256Hex(rohInhalt) } }
      registriereKernArtefakt(`laufakte-${laufId}`, profil, { erzeuger: 'kern', schritt: 'claude-code-gateway-lauf' }, laufakte, [], still)
      const zaehlung = verfaelsche.zaehlung === undefined ? zaehlungEcht : verfaelsche.zaehlung(zaehlungEcht)
      const e = klassifiziereLauf(laufId, profil, { laufakte: { ...laufakte, rohstrom_referenz: { ...laufakte.rohstrom_referenz, pfad: rohPfad } }, rueckfragen: leseRueckfrageProtokoll(laufId, basis), rueckfrageZaehlung: zaehlung }, still)
      return { laufId, ergebnis: e.ergebnis }
    }

    /** Stellt eine Rückfrage und beantwortet sie (Browser); liefert die Entscheidung an das Skript. */
    async function frage(laufId, anfrage, antwort) {
      const gestellt = vermittlung.stelle(laufId, anfrage)
      if (gestellt.entscheidung !== undefined) return gestellt.entscheidung
      const warten = vermittlung.warte(laufId, gestellt.id)
      vermittlung.beantworte(gestellt.id, antwort, 'browser')
      return (await warten).entscheidung
    }

    const laufA = (laufId, verfaelsche) =>
      (async () => {
        await frage(laufId, { art: 'rechte', tool_name: 'Bash', input: INPUT_A, tool_use_id: 'toolu_a' }, { entscheidung: 'einmal_erlauben' })
        const b = await frage(laufId, { art: 'rechte', tool_name: 'Bash', input: INPUT_B, tool_use_id: 'toolu_b' }, { entscheidung: 'ablehnen' })
        await frage(laufId, { art: 'frage', frage: 'Welche Farbe soll in kanal-probe-d.txt stehen?', optionen: ['rot', 'grün', 'blau'], tool_use_id: 'toolu_d' }, { antwort: 'grün' })
        return {
          zeilen: [ergebnis('toolu_a', '(Bash completed with no output)', false), ergebnis('toolu_b', verfaelsche.text ?? b.message, true), ergebnis('toolu_d', 'Stefan entscheidet: grün', false)],
          denials: [{ tool_name: 'Bash', tool_use_id: 'toolu_b', tool_input: INPUT_B }],
        }
      })()
    const laufB = (laufId) =>
      (async () => {
        const c = await frage(laufId, { art: 'rechte', tool_name: 'Write', input: INPUT_C, tool_use_id: 'toolu_c' }, null)
        return { zeilen: [ergebnis('toolu_c', c.message, true)], denials: [{ tool_name: 'Write', tool_use_id: 'toolu_c', tool_input: INPUT_C }] }
      })()

    const a = await fahreLauf(laufA)
    const b = await fahreLauf(laufB)
    const textAnders = await fahreLauf(laufA, { text: 'Permission to use Bash has been denied.' })
    const zaehlungAnders = await fahreLauf(laufA, { zaehlung: (z) => ({ ...z, automatisch: z.automatisch + 1 }) })
    // E-F-1136 (1) = B: Projekt-Startvorlage deklariert eine ältere CLI als die im Lauf.
    const alteCli = await fahreLauf(laufA, { deklariert: '2.1.258 (Claude Code)' })
    // code-reviewer 2 (Advisor M9): ein Lauf ohne Terminalmarke (nur run_prepared) ergibt einen Bericht mit Exit 0.
    const offenId = `gate-b1-offen-${randomUUID()}`
    schreibeWirkungsmarke(offenId, profil, 'run_prepared', {}, still)
    const vorher = schnappschuss(wurzel)

    const ausgabe = join(wurzel, 'aus')
    /** Ruft das Werkzeug wie Stefan (mit --aus) und liest die Übersicht als { P1: 'erfüllt', … }. */
    const werte = (laufId, extra = []) => {
      const ziel = join(ausgabe, `${laufId}.md`)
      const exit = werkzeug.hauptprogramm(['--lauf', laufId, '--projekt', 'proj', '--aus', ziel, ...extra], wurzel)
      const md = text(ziel)
      const tabelle = Object.fromEntries([...md.matchAll(/^\| (P\d+b?) .* \| (erfüllt mit Abweichung|erfüllt|nicht erfüllt|nicht belegbar) \|$/gm)].map((m) => [m[1], m[2]]))
      return { exit, md, tabelle }
    }
    const soll = (ist, erwartet) => Object.entries(erwartet).filter(([id, e]) => ist[id] !== e).map(([id, e]) => `${id} ${ist[id] ?? 'fehlt'} statt ${e}`)

    const A = werte(a.laufId)
    const abwA = soll(A.tabelle, { P1: 'erfüllt', P2: 'erfüllt', P3: 'nicht belegbar', P4: 'erfüllt', P4b: 'nicht belegbar', P5: 'erfüllt', P6: 'erfüllt', P7: 'erfüllt', P8: 'erfüllt', P9: 'erfüllt', P10: 'erfüllt', P11: 'nicht belegbar', P12: 'erfüllt', P13: 'erfüllt' })
    pruefe(a.ergebnis === 'ERFOLGREICH' && A.exit === 0 && abwA.length === 0, '(b) Lauf A (erlauben, ablehnen, Frage): ERFOLGREICH, Prüfpunkte nach Soll.', `(b) Lauf A: Ergebnis ${a.ergebnis}, Exit ${A.exit}, ${abwA.join('; ')}`)
    pruefe(A.md.includes('abgelehnt_durch_stefan: 1') && A.md.includes('/api/projekte/proj'), '(b) Lauf A: abgelehnt_durch_stefan 1, erwarteter url-Pfad der Projektinstanz.', '(b) Lauf A: Kopf ohne abgelehnt_durch_stefan 1 oder ohne url-Pfad')
    const B = werte(b.laufId)
    const abwB = soll(B.tabelle, { P1: 'erfüllt', P2: 'erfüllt', P3: 'nicht belegbar', P4: 'nicht belegbar', P4b: 'nicht belegbar', P5: 'nicht belegbar', P6: 'erfüllt', P7: 'erfüllt', P8: 'nicht belegbar', P9: 'erfüllt', P10: 'erfüllt', P11: 'erfüllt', P12: 'erfüllt', P13: 'nicht belegbar' })
    pruefe(b.ergebnis === 'VERWEIGERT' && B.md.includes('abgleich/nicht_von_stefan') && abwB.length === 0, '(b) Lauf B (Write außerhalb): VERWEIGERT nicht_von_stefan, Pfadgrenze erfüllt.', `(b) Lauf B: Ergebnis ${b.ergebnis}, ${abwB.join('; ')}`)
    pruefe(werte(textAnders.laufId).tabelle.P4 === 'nicht erfüllt', '(b) Rot: Ablehnungstext der CLI anders ⇒ P4 nicht erfüllt.', '(b) Ablehnungstext anders nicht erkannt')
    const V = werte(alteCli.laufId)
    pruefe(V.tabelle.P10 === 'erfüllt mit Abweichung' && V.tabelle.P4 === 'erfüllt mit Abweichung' && V.tabelle.P9 === 'erfüllt' && V.md.includes('deklariert 2.1.258 (Claude Code) (Laufakte werkzeug_version_deklariert), im Lauf 2.1.300'), '(b) andere CLI-Version ⇒ CLI-abhängige Punkte „erfüllt mit Abweichung“ mit beiden Versionen und Quelle, übrige unverändert.', `(b) andere CLI-Version: P10 ${V.tabelle.P10}, P4 ${V.tabelle.P4}, P9 ${V.tabelle.P9}`)
    pruefe(werte(zaehlungAnders.laufId).tabelle.P9 === 'nicht erfüllt', '(b) Rot: Zählung der Marke ≠ Protokoll ⇒ P9 nicht erfüllt.', '(b) abweichende Zählung nicht erkannt')
    pruefe(werkzeug.hauptprogramm(['--lauf', 'gibt-es-nicht', '--projekt', 'proj'], wurzel) === 1, '(b) unbekannter Lauf ⇒ Exit 1.', '(b) unbekannter Lauf nicht Exit 1')
    pruefe(werkzeug.hauptprogramm(['--lauf', a.laufId, '--projekt', 'gibt-es-nicht'], wurzel) === 1, '(b) unbekanntes Projekt ⇒ Exit 1.', '(b) unbekanntes Projekt nicht Exit 1')
    const O = werte(offenId)
    pruefe(O.exit === 0 && O.md.includes('Lauf nicht abgeschlossen') && O.tabelle.P12 === 'nicht belegbar', '(b) Lauf ohne Terminalmarke ⇒ Bericht mit Exit 0, Hinweis, Terminal-Punkte nicht belegbar.', `(b) Lauf ohne Terminalmarke: Exit ${O.exit}, P12 ${O.tabelle.P12}`)
    const rohZiel = join(wurzel, 'kontrollzustand-roh', 'x.md')
    pruefe(werkzeug.hauptprogramm(['--lauf', a.laufId, '--projekt', 'proj', '--aus', rohZiel], wurzel) === 1 && !existsSync(rohZiel), '(b) --aus im Rohstrom-Ordner ⇒ Exit 1.', '(b) --aus im Rohstrom-Ordner nicht abgelehnt')
    mkdirSync(join(ausgabe, 'ordner'), { recursive: true })
    pruefe(werkzeug.hauptprogramm(['--lauf', a.laufId, '--projekt', 'proj', '--aus', join(ausgabe, 'ordner')], wurzel) === 1, '(b) --aus auf einen Ordner ⇒ Exit 1 mit Grund (kein Absturz).', '(b) --aus auf einen Ordner nicht Exit 1')
    pruefe(werkzeug.hauptprogramm(['--lauf', a.laufId, '--projekt', 'proj', '--aus', join(basis, 'x.md')], wurzel) === 1 && !existsSync(join(basis, 'x.md')), '(b) --aus im Kontrollzustand ⇒ Exit 1, nichts geschrieben.', '(b) --aus im Kontrollzustand nicht abgelehnt')

    // (c) bitgleich nach allen Aufrufen (die Ausgaben liegen unter aus/, außerhalb von proj/ und kontrollzustand-roh/).
    const nachher = schnappschuss(wurzel).filter((z) => !z.startsWith('aus/'))
    pruefe(JSON.stringify(nachher) === JSON.stringify(vorher), '(c) Kontrollzustand und Rohstrom nach allen Aufrufen bitgleich (nur lesend).', '(c) Werkzeug hat in der Fixture geschrieben')

    // (d) committbare Ausgabe.
    const alle = A.md + B.md
    pruefe(alle.length > 0 && !alle.includes(wurzel) && !alle.includes(homedir()) && !alle.includes(tmpdir()) && !alle.includes(token), '(d) Ausgabe ohne absolute Pfade und ohne Token.', '(d) absoluter Pfad oder Token in der Ausgabe')

    // Rohstrom-Hash falsch ⇒ Rohstrom-Punkte nicht belegbar (nach (c), weil die Fixture hier geändert wird).
    writeFileSync(join(wurzel, 'kontrollzustand-roh', a.laufId, 'rohstrom.json'), '{"stdout":""}')
    const H = werte(a.laufId)
    pruefe(H.tabelle.P1 === 'nicht belegbar' && H.tabelle.P7 === 'nicht belegbar' && H.md.includes('Rohstrom-Hash weicht'), '(b) Rohstrom-Hash falsch ⇒ Rohstrom-Punkte nicht belegbar.', `(b) Rohstrom-Hash falsch: P1 ${H.tabelle.P1}, P7 ${H.tabelle.P7}`)
  }

  // ── (e) Doku ──────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const anleitung = text('docs/harness/rueckfrage-nachweislauf.md')
    const fehlt = ['nachweis-rueckfrage-auswerten.mjs', "$env:LEITSTAND_RUECKFRAGE = '1'", 'Lauf A', 'Lauf B', 'haushaltsbuch2', 'werkzeugVersionDeklariert', 'F-1126 (5)'].filter((s) => !anleitung.includes(s))
    pruefe(fehlt.length === 0, '(e) Anleitung rueckfrage-nachweislauf.md mit Werkzeug, Kanal-Schalter, Lauf A/B, Projekt, Versionsprüfung, F-1126 (5).', `(e) Anleitung: fehlt ${fehlt.join(', ') || 'Datei'}`)
    const startfreigabe = text('docs/harness/startfreigabe-erneuern.md')
    const fehltS = ['--permission-prompt-tool', 'mcp__rueckfrage__rechte_pruefen', 'rueckfrage-mcp.mjs', 'rueckfrage-nachweislauf.md'].filter((s) => !startfreigabe.includes(s))
    pruefe(fehltS.length === 0, '(e) startfreigabe-erneuern.md nennt die Kanal-Argv und den Nachweislauf.', `(e) startfreigabe-erneuern.md: fehlt ${fehltS.join(', ')}`)
  }

  // ── (w) Grenzen ────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const server = text('scripts/leitstand-server.mjs')
    const grenze = JSON.parse(text('scripts/wachstumsbremse-server.json')).obergrenze_zeilen
    const zeilen = server.split('\n').length - (server.endsWith('\n') ? 1 : 0)
    pruefe(zeilen <= grenze, `(w) leitstand-server.mjs ${zeilen} Zeilen ≤ Grenze ${grenze}.`, `(w) leitstand-server.mjs ${zeilen} Zeilen > Grenze ${grenze}`)
    pruefe(server.split('starteWorkflowSchritt(').length - 1 === 6, '(w) starteWorkflowSchritt( in leitstand-server.mjs 6×.', `(w) starteWorkflowSchritt( ${server.split('starteWorkflowSchritt(').length - 1}×`)
    const regelHash = sha256Hex(text('scripts/_rueckfrage-aus-pruefung.mjs'))
    pruefe(regelHash === REGEL_HASH, '(w) scripts/_rueckfrage-aus-pruefung.mjs unverändert.', `(w) scripts/_rueckfrage-aus-pruefung.mjs geändert (Hash ${regelHash})`)
    // M6: eine Zählregel — die Vermittlung zählt über zaehleProtokollEintraege.
    pruefe(text('scripts/leitstand/rueckfrage-vermittlung.mjs').includes('const zaehlung = zaehleProtokollEintraege(lauf.protokoll)'), '(w) Vermittlung und Werkzeug zählen mit derselben Regel.', '(w) zaehlungVon nutzt zaehleProtokollEintraege nicht')
  }
} catch (fehler) {
  befunde.push(`Abbruch: ${fehler.stack ?? fehler}`)
} finally {
  for (const pfad of aufraeumen) raeumeVerzeichnis(pfad)
}

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e):`)
  for (const b of befunde) console.error(`  - ${b}`)
  process.exit(1)
}
console.log('\n✓ Keine Befunde (scripts/check-f45-b2b3b2b2b1-nachweis.mjs).')
