#!/usr/bin/env node
/**
 * Datei: scripts/check-f45-b2b3b2a-absicherung.mjs
 *
 * Zweck: Gate für F45 B2b-3b-2a-1 „Rückfrage-Kanal: Absicherung vor dem Einschalten“ (features/F45/plan-b2b3b2a-v2.md mit
 * Nachtrag, Advisor features/F45/advisor-b2b3b2a.md und -delta.md). Der Kanal bleibt aus; eingeschaltet wird er hier nur über
 * die Option `rueckfrage` des Gate-Servers. Neue Exporte werden je Fall geprüft (`typeof … === 'function'`, Delta H3), damit
 * jeder Fall gegen main (Rot-Nachweis per git archive, F-1127) seinen eigenen Befund zeigt statt eines Gesamtabbruchs.
 *
 * Prüft:
 * (a1) F-1128 (1), rein: gefälschte Datei (stefan_abgelehnt für eine im Speicher auto_deny-ID), Speicher fehlt, Länge abweichend
 *      ⇒ VERWEIGERT; Datei = Speicher ⇒ ERFOLGREICH (Gegenprobe).
 * (a2) F-1128 (1), echter Server mit Kanal an: die Attrappe ruft die exportierte Controller-Funktion ermittleRueckfrageProtokoll
 *      mit den echten laufOptionen (basisVerzeichnis, seit B2b-3b-2b-1a rueckfrageZugang). Stefan lehnt t1 über die Antwort-Route ab ⇒
 *      ERFOLGREICH; auto_deny t2 über die Token-Route, dann (seit B2b-3b-2b-1a, Delta D3: je Version nur Zuwachs) eine angehängte
 *      gefälschte Version mit stefan_abgelehnt für t3, die nie über den Kanal lief ⇒ VERWEIGERT („Länge abweichend“) — und
 *      über den alten Pfad (nur Datei) ERFOLGREICH (Gegenprobe, Delta H5); ohne Leser bzw. nach dem Lauf-Ende ⇒ VERWEIGERT.
 *      Quelltext (Delta H4): die Klassifikation bildet `rueckfragen` aus ermittleRueckfrageProtokoll, leseRueckfrageProtokoll
 *      wird nur dort aufgerufen.
 * (l1) F-1128 (2), echter Server im Arbeitsordner: Lauf mit zu_loeschen-Block und abgelehnt_durch_stefan 1 ⇒ Datei bleibt,
 *      Löschliste nur als Hinweis (LOESCHLISTE_AUSGESETZT); Gegenprobe ohne Stefan-Ablehnung ⇒ gelöscht. Seit B2b-3b-2b-1a steht
 *      t1 aus (a2) im selben Lauf auch im Speicher — (l1) belegt den Klassifikations-Teil des ODER deshalb nicht allein; den
 *      Speicher-Teil prüft check-f45-b2b3b2b1a-rest (r2). Der Klassifikations-Teil ist bewusst redundante zweite Sicherung.
 * (o1) F-1126 (2) / F-1128 (5): 21. offene Rückfrage ⇒ auto_deny mit eigenem Grund; 201. Protokolleintrag ⇒ Ablehnung ohne
 *      Eintrag, offene behalten ihren Platz.
 * (z1) F-1126 (3): Befehl mit \r, ANSI (ESC, CSI), Bidi (U+202E, U+2066), BEL, U+200B, U+2028, einzelnem Surrogat ⇒ auto_deny;
 *      \n und \t ⇒ Stefan.
 * (f)  Grenzen: starteWorkflowSchritt( im Server 6×; kein Produktaufrufer übergibt `rueckfrage:` an erzeugeRequestHandler
 *      (beide gegen main grün, Invarianten); ARCHITECTURE §1 nennt F-1131 bei der W1-Regel (gegen main rot).
 *
 * Wird aufgerufen von: `npm run check:gates` (und damit `npm run check`).
 *
 * Nachgezogen in B2b-3b-2b-1b (F-1128 R1, features/F45/plan-b2b3b2b1b-v2.md): eine Ablehnung durch Stefan zählt nur noch, wenn das
 * tool_result ihrer ID genau den eindeutigen Ablehnungstext trägt — `klassifiziere` schreibt deshalb passende tool_result-Zeilen
 * (echte Texte aus dem Long-Poll, gefälschte mit dem Hash des statischen CLI-Texts bzw. eines erfundenen Texts), und jeder Eintrag
 * stefan_abgelehnt trägt ablehnung_hash. So prüfen (a1)/(a2) weiter Speicher gegen Datei, nicht den fehlenden Text.
 *
 * Wichtig: Durchsetzungsgrad der Quelltextprüfungen DEKLARIERT — (f) erkennt die Option `rueckfrage` nur als Literal in der
 * Argumentliste von erzeugeRequestHandler( bis zur ersten `)` (ein vorab gebautes Optionsobjekt fällt durch, Muster wie Gate
 * b2b3b1 (f)); (a2) verlangt den exakten Text der Klassifikationsstelle (eine Umformatierung macht es rot, sichere Richtung).
 * (a1), (a2), (l1), (o1), (z1) prüfen Verhalten. Ein Modul, das nicht lädt, macht nur die Fälle rot, die es brauchen.
 *
 * Aufruf: node scripts/check-f45-b2b3b2a-absicherung.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { kanonischesJson, sha256Hex } from '../src/checkpoint-store/index.ts'
import { ladeArtefaktVersion, registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { klassifiziereLauf } from '../src/result-evaluator/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { erzeugeRequestHandler } from './leitstand-server.mjs'

const befunde = []
console.log('\n=== F45-B2b-3b-2a-Absicherung-Check ===\n')

const aufraeumen = []
const dienste = []
const PROFIL = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }

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

/** Fehlende Exporte eines Moduls (gegen main: undefined statt Ladefehler, Delta H3). */
const fehlend = (modul, ...namen) => (modul.fehler !== undefined ? [modul.fehler] : namen.filter((n) => modul[n] === undefined))

const hashVon = (input) => sha256Hex(kanonischesJson(input ?? null))
const verzoegerung = (ms) => new Promise((r) => setTimeout(r, ms))
/** Wartet, bis pruefen() einen wahren Wert liefert (höchstens maxMs), und gibt ihn zurück. */
async function warteBis(pruefen, maxMs = 20000) {
  const ende = Date.now() + maxMs
  let wert = await pruefen()
  while (!wert && Date.now() < ende) {
    await verzoegerung(25)
    wert = await pruefen()
  }
  return wert
}

const protokollModul = await lade('../src/rueckfrage/protokoll.ts')
const regelModul = await lade('../src/rueckfrage/index.ts')
const controllerModul = await lade('../src/execution-controller/index.ts')
const vermittlungModul = await lade('./leitstand/rueckfrage-vermittlung.mjs')
const arbeitsordnerModul = await lade('../src/arbeitsordner/index.ts')

// ─── Klassifikation unter einer gegebenen laufId (Terminalmarke in einer Wegwerf-Ablage) ─────────────────────────────────
const KLASS_BASIS = join(tmpdir(), `f45-b2b3b2a-klass-${randomUUID().slice(0, 8)}`)
aufraeumen.push(KLASS_BASIS)

/**
 * Klassifiziert einen Lauf mit den gegebenen permission_denials und dem gegebenen Protokoll (Feld rueckfragen gesetzt).
 * @param laufId - Lauf (der Abgleich prüft lauf_id)
 * @param denials - permission_denials
 * @param rueckfragen - daten oder null
 * @param texte - B2b-3b-2b-1b: Map tool_use_id → Text des tool_result (is_error), vor der result-Zeile im Rohstrom
 * @returns Ergebnis von klassifiziereLauf ohne Wirkungsmarke
 */
function klassifiziere(laufId, denials, rueckfragen, texte = new Map()) {
  const ergebnisZeilen = [...texte].map(([id, text]) => JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, content: text, is_error: true }] } }))
  const roh = { stdout: [...ergebnisZeilen, JSON.stringify({ type: 'result', is_error: false, result: 'fertig', permission_denials: denials })].join('\n'), stderr: '', exitCode: 0 }
  const rohPfad = join(KLASS_BASIS, 'roh', `${laufId}-${randomUUID().slice(0, 8)}.json`)
  mkdirSync(join(KLASS_BASIS, 'roh'), { recursive: true })
  const inhalt = JSON.stringify(roh)
  writeFileSync(rohPfad, inhalt)
  const laufakte = { laufakte_schema: 'v0', lauf_id: laufId, werkzeug_version_deklariert: '2.1.241', berechtigungskontext: 'profil-standard', arbeitsverzeichnis_pfad: process.cwd(), modell_beobachtet: null, beobachtungsbasis_vollstaendig: true, rohstrom_referenz: { pfad: rohPfad, inhalts_hash: sha256Hex(inhalt) }, erstellt_am: '2026-10-16T00:00:00.000Z' }
  const { wirkungsmarke: _w, ...rest } = klassifiziereLauf(laufId, PROFIL, { laufakte, rueckfragen }, { basisVerzeichnis: join(KLASS_BASIS, `kz-${randomUUID().slice(0, 8)}`), schreiber: () => {} })
  return rest
}

const denial = (id, input, toolName = 'Bash') => ({ tool_name: toolName, tool_use_id: id, tool_input: input })
/** B2b-3b-2b-1b: Ablehnungstext je ID (Gate-Fixture) bzw. statischer CLI-Text, den eine Fälschung übernehmen kann. */
const TEXT = (id) => `Stefan hat den Befehl abgelehnt. (Ref ${id})`
const STATISCH = 'Permission to use Write has been denied.'
const eintrag = (id, art, input, toolName = 'Bash') => ({ tool_use_id: id, tool_name: toolName, input_hash: hashVon(input), art, grund: 'Gate', zeit: '2026-10-16T10:00:00.000Z', ...(art === 'stefan_abgelehnt' ? { ablehnung_hash: sha256Hex(TEXT(id)) } : {}) })
const speicherVon = (eintraege) => eintraege.map(({ tool_use_id, tool_name, input_hash, art, ablehnung_hash }) => ({ tool_use_id, tool_name, input_hash, art, ...(ablehnung_hash !== undefined ? { ablehnung_hash } : {}) }))

try {
  // ── (a1) Datei gegen Speicher, rein ────────────────────────────────────────────────────────────────────────────────────
  {
    const fehlt = fehlend(protokollModul, 'bestaetigeProtokoll')
    if (fehlt.length > 0) befunde.push(`(a1) src/rueckfrage/protokoll.ts: ${fehlt.join(', ')} fehlt`)
    else {
      const laufId = `a1-${randomUUID()}`
      const npm = { command: 'npm publish' }
      const aussen = { file_path: 'C:\\aussen.txt', content: 'x' }
      const echt = [eintrag('t1', 'stefan_abgelehnt', npm), eintrag('t2', 'auto_deny', aussen, 'Write')]
      // Die Fälschung übernimmt den Hash des statischen CLI-Texts von t2 (nachrechenbar) — nur der Speicher fängt sie.
      const gefaelscht = { rueckfragen_schema: 'v1', lauf_id: laufId, ab: 0, eintraege: [echt[0], { ...echt[1], art: 'stefan_abgelehnt', ablehnung_hash: sha256Hex(STATISCH) }] }
      const denials = [denial('t1', npm), denial('t2', aussen, 'Write')]
      const texte = new Map([
        ['t1', TEXT('t1')],
        ['t2', STATISCH],
      ])
      const ueber = (datei, speicher) => {
        const b = protokollModul.bestaetigeProtokoll(datei, speicher)
        return klassifiziere(laufId, denials, b.ok ? b.daten : null, texte).ergebnis
      }
      const ergebnisse = {
        gefaelscht: ueber(gefaelscht, speicherVon(echt)),
        speicherFehlt: ueber(gefaelscht, null),
        laenge: ueber(gefaelscht, speicherVon(echt).slice(0, 1)),
        alterPfad: klassifiziere(laufId, denials, gefaelscht, texte).ergebnis,
        gleich: ueber(gefaelscht, speicherVon(gefaelscht.eintraege)),
      }
      pruefe(
        ergebnisse.gefaelscht === 'VERWEIGERT' && ergebnisse.speicherFehlt === 'VERWEIGERT' && ergebnisse.laenge === 'VERWEIGERT' && ergebnisse.alterPfad === 'ERFOLGREICH' && ergebnisse.gleich === 'ERFOLGREICH',
        '(a1) gefälschte Datei (stefan_abgelehnt für auto_deny-ID), Speicher fehlt, Länge abweichend ⇒ VERWEIGERT; nur Datei (alter Pfad) bzw. Datei = Speicher ⇒ ERFOLGREICH (Gegenproben).',
        `(a1) ${JSON.stringify(ergebnisse)}`
      )
    }
  }

  // ── (o1) Obergrenzen je Lauf ───────────────────────────────────────────────────────────────────────────────────────────
  {
    const fehlt = fehlend(vermittlungModul, 'MAX_OFFENE_JE_LAUF', 'MAX_PROTOKOLL_JE_LAUF')
    if (fehlt.length > 0) befunde.push(`(o1) scripts/leitstand/rueckfrage-vermittlung.mjs: ${fehlt.join(', ')} fehlt`)
  }
  if (typeof vermittlungModul.erzeugeRueckfrageVermittlung !== 'function') befunde.push(`(o1) Vermittlung nicht ladbar: ${vermittlungModul.fehler ?? 'erzeugeRueckfrageVermittlung fehlt'}`)
  else {
    const ordner = process.platform === 'win32' ? 'C:\\proj\\wf' : '/proj/wf'
    const kanal = { token: 'b'.repeat(64), arbeitsordner: ordner, werkzeugNamen: ['Write', 'Bash'] }
    const bash = (id) => ({ art: 'rechte', tool_name: 'Bash', input: { command: `echo ${id}` }, tool_use_id: id })
    const schreibe = (id) => ({ art: 'rechte', tool_name: 'Write', input: { file_path: `../${id}`, content: 'x' }, tool_use_id: id })
    // Offene: 20 einreihen, die 21. muss automatisch abgelehnt werden (mit Eintrag).
    const offen = []
    const v1 = vermittlungModul.erzeugeRueckfrageVermittlung({ pfadOptionen: { realpath: (p) => p }, protokolliere: (_l, e) => offen.push(e) })
    v1.oeffneLauf('o1', kanal)
    const ids = Array.from({ length: 20 }, (_, i) => v1.stelle('o1', bash(`o${i}`)).id)
    const einundzwanzig = v1.stelle('o1', bash('o20'))
    v1.beantworte(ids[0], { entscheidung: 'ablehnen' })
    const danach = v1.stelle('o1', bash('o21'))
    v1.beendeLauf('o1')
    pruefe(
      ids.every(Boolean) && einundzwanzig.entscheidung?.behavior === 'deny' && /zu viele offene Rückfragen je Lauf \(20\)/.test(einundzwanzig.entscheidung?.message ?? '') && offen.some((e) => e.tool_use_id === 'o20' && e.art === 'auto_deny') && typeof danach.id === 'string',
      '(o1) 21. gleichzeitig offene Rückfrage ⇒ auto_deny mit eigenem Grund und Eintrag; nach einer Antwort wieder Platz.',
      `(o1) offene Grenze: 21. ${JSON.stringify(einundzwanzig)}, danach ${JSON.stringify(danach)}`
    )
    // Protokoll: 5 offene + 195 auto_deny = 200; jede weitere Anfrage ohne Eintrag abgelehnt, die offenen werden trotzdem entschieden.
    let eintraege = 0
    const v2 = vermittlungModul.erzeugeRueckfrageVermittlung({ pfadOptionen: { realpath: (p) => p }, protokolliere: () => eintraege++ })
    v2.oeffneLauf('o2', kanal)
    for (let i = 0; i < 5; i++) v2.stelle('o2', bash(`b${i}`))
    for (let i = 0; i < 195; i++) v2.stelle('o2', schreibe(`w${i}`))
    const vorher = eintraege
    const ueber = v2.stelle('o2', schreibe('w-zuviel'))
    const ueberEintraege = eintraege
    v2.beendeLauf('o2')
    pruefe(
      vorher === 195 && ueberEintraege === 195 && ueber.entscheidung?.behavior === 'deny' && /Obergrenze der Protokolleinträge je Lauf erreicht \(200\)/.test(ueber.entscheidung?.message ?? '') && eintraege === 200,
      '(o1) 201. Protokolleintrag ⇒ Ablehnung ohne Eintrag (eigener Grund); die fünf offenen werden beim Lauf-Ende trotzdem protokolliert (200).',
      `(o1) Protokollgrenze: vor ${vorher}, nach Anfrage ${ueberEintraege}, Ende ${eintraege}, Antwort ${JSON.stringify(ueber)}`
    )
  }

  // ── (z1) Steuer- und Formatzeichen ─────────────────────────────────────────────────────────────────────────────────────
  {
    const ordner = process.platform === 'win32' ? 'C:\\proj\\wf' : '/proj/wf'
    const vor = (command) => (typeof regelModul.vorentscheidung === 'function' ? regelModul.vorentscheidung('Bash', { command }, ordner, ['Bash'], { realpath: (p) => p }) : { art: `nicht ladbar: ${regelModul.fehler}` })
    const rot = ['echo a\rrm -rf x', 'echo \u001b[31mrot', 'echo \u009b31m', 'echo \u202Etxt.exe', 'echo \u2066x\u2069', 'echo \u0007', 'echo a\u200Bb', 'echo a\u2028b', 'echo \uD800']
    const durch = rot.filter((c) => vor(c).art !== 'auto_deny' || !/Steuer- oder Formatzeichen/.test(vor(c).grund ?? '')).map((c) => JSON.stringify(c))
    const gruen = ['echo a\necho b', 'printf "a\tb"'].filter((c) => vor(c).art !== 'frage_stefan').map((c) => JSON.stringify(c))
    pruefe(
      durch.length === 0 && gruen.length === 0,
      `(z1) ${rot.length} Befehle mit \\r, ANSI, Bidi, BEL, Null-Breite, Zeilentrenner, Surrogat ⇒ auto_deny; \\n und \\t ⇒ Stefan.`,
      `(z1) nicht mit Grund „Steuer- oder Formatzeichen“ abgelehnt: ${durch.join(', ') || '–'}; fälschlich abgelehnt: ${gruen.join(', ') || '–'}`
    )
  }

  // ── (a2)/(l1) echter Server ────────────────────────────────────────────────────────────────────────────────────────────
  {
    const git = (cwd, argumente) => execFileSync('git', argumente, { cwd, encoding: 'utf8' })
    const basis = join(tmpdir(), `f45-b2b3b2a-${randomUUID().slice(0, 8)}`)
    aufraeumen.push(basis)
    const repoWurzel = join(basis, 'projekt')
    mkdirSync(join(repoWurzel, '.claude'), { recursive: true })
    git(repoWurzel, ['init', '--quiet'])
    git(repoWurzel, ['config', 'user.email', 'test@example.invalid'])
    git(repoWurzel, ['config', 'user.name', 'Test'])
    git(repoWurzel, ['config', 'core.autocrlf', 'false'])
    git(repoWurzel, ['checkout', '--quiet', '-b', 'arbeit'])
    writeFileSync(join(repoWurzel, '.claude', 'settings.json'), '{}\n')
    writeFileSync(join(repoWurzel, 'README.md'), 'Zeile 1\n')
    writeFileSync(join(repoWurzel, 'alt.txt'), 'alt\n')
    git(repoWurzel, ['add', '.'])
    git(repoWurzel, ['commit', '--quiet', '-m', 'init'])
    const vorlageRoh = ladeStartvorlage('startvorlagen/beispielprojekt.json')
    const startvorlagePfad = join(basis, 'startvorlage.json')
    writeFileSync(startvorlagePfad, JSON.stringify({ ...vorlageRoh, werkzeugsaetze: { ...vorlageRoh.werkzeugsaetze, schreibend: { ...vorlageRoh.werkzeugsaetze.schreibend, erlaubte_werkzeuge: ['Read', 'Grep', 'Glob', 'Write', 'Edit', 'Bash(npm ci)'] } } }, null, 2))
    const vorlage = ladeStartvorlage(startvorlagePfad)
    const basisVerzeichnis = join(basis, 'kontrollzustand')

    const LOESCHTEXT = 'Fertig.\n\n```zu_loeschen\n{ "zu_loeschen": ["alt.txt"] }\n```\n'
    /** Je Lauf ein Verhalten (Warteschlange): { pruefen?: async (laufId, profil, eingaben, optionen) => void, stefanAbgelehnt } */
    const verhalten = []
    const aufrufe = []
    async function attrappe(laufId, profil, eingaben, optionen) {
      const v = verhalten.shift() ?? { stefanAbgelehnt: 0 }
      const aufruf = { laufId, eingaben, optionen }
      aufrufe.push(aufruf)
      try {
        if (v.pruefen !== undefined) await v.pruefen(laufId, profil, eingaben, optionen)
      } catch (fehler) {
        befunde.push(`(a2) Prüfung im Lauf abgebrochen: ${fehler.stack ?? fehler}`)
      }
      const wurzel = optionen.cwd ?? repoWurzel
      const rohPfad = join(basis, `roh-${laufId}.json`)
      writeFileSync(rohPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: LOESCHTEXT }) }))
      registriereKernArtefakt(`laufakte-${laufId}`, profil, { erzeuger: 'kern', schritt: 'test' }, { worker: 'claude-code', rohstrom_referenz: { pfad: rohPfad, inhalts_hash: 'x' } }, [], { basisVerzeichnis: optionen.basisVerzeichnis, schreiber: () => {} })
      aufruf.wurzel = wurzel
      const klassifikation = { ergebnis: 'ERFOLGREICH', bypass_verdacht_anzahl: 0, ...(v.stefanAbgelehnt > 0 ? { abgelehnt_durch_stefan: v.stefanAbgelehnt } : {}) }
      return { ok: true, klassifikation, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
    }
    let handler = null
    const dienst = createServer((req, res) => handler(req, res))
    await new Promise((r) => dienst.listen(0, '127.0.0.1', r))
    dienste.push(dienst)
    const basisUrl = `http://127.0.0.1:${dienst.address().port}`
    handler = erzeugeRequestHandler({
      basisVerzeichnis,
      repoWurzel,
      startvorlagePfad,
      installWurzel: process.cwd(),
      fuehreAufgabeDurchFn: attrappe,
      arbeitsordner: true,
      arbeitsordnerNpm: async () => ({ code: 0, stdout: '', stderr: '', zeitueberschritten: false }),
      arbeitsordnerE183: () => ({ ok: true }),
      standCacheMs: 0,
      rueckfrage: { an: true, url: basisUrl },
    })

    /** Legt einen Ein-Schritt-Workflow 'ausfuehrung' an und startet ihn (mit Vorbereitung des Arbeitsordners). */
    async function starteAblauf() {
      const { auftragId } = await (await fetch(`${basisUrl}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: 'Gate 3b-2a', auftragstext: 'Lege eine Datei an.' }) })).json()
      const workflowId = `f45-b2b3b2a-${randomUUID()}`
      registriereWorkflow(
        {
          workflow_schema: 'v0',
          workflow_id: workflowId,
          auftrag_id: auftragId,
          version: 1,
          ziel: 'Gate 3b-2a.',
          status: 'OFFEN',
          aktiver_schritt_id: 'schritt-1-ausfuehrung',
          grenzen: { max_schritte: 6, max_replans: 1 },
          schritte: [{ schritt_id: 'schritt-1-ausfuehrung', rolle: 'ausfuehrung', werkzeugsatz: 'schreibend', worker: 'claude-code', modell: 'claude-sonnet-5', eingaben: [], output_schema: null, freigabe: 'ZWINGEND', freigabe_erteilt: true, risiko: 'Gate-Fixture.', zeitgrenze_ms: 600000, nachfolger: null, status: 'OFFEN', lauf_id: null }],
        },
        leiteProfilReferenzAb(vorlage),
        { basisVerzeichnis, schreiber: () => {} }
      )
      const starte = () => fetch(`${basisUrl}/api/workflows/${workflowId}/starten`, { method: 'POST' })
      let start = await starte()
      if ((await start.clone().json()).vorbereitung === true) {
        await warteBis(async () => (await (await fetch(`${basisUrl}/api/workflows/${workflowId}`)).json()).arbeitsordner?.status === 'BEREIT')
        start = await starte()
      }
      const lauf = await warteBis(() => aufrufe.find((a) => a.eingaben.rolle === 'ausfuehrung' && !a.gesehen))
      if (lauf) lauf.gesehen = true
      const uebersicht = lauf ? await warteBis(() => ladeArtefaktVersion(`aenderungsuebersicht-${lauf.laufId}`, undefined, { basisVerzeichnis, schreiber: () => {} })?.daten) : null
      await warteBis(async () => (await (await fetch(`${basisUrl}/api/workflows/${workflowId}`)).json()).status !== 'LAEUFT', 10000)
      return { start, lauf, uebersicht }
    }

    // (a2) im Lauf, solange er in der Vermittlung offen ist.
    const a2 = {}
    verhalten.push({
      stefanAbgelehnt: 1,
      pruefen: async (laufId, profil, eingaben, optionen) => {
        a2.vorbedingung = eingaben.rueckfrageKanal !== undefined
        if (typeof controllerModul.ermittleRueckfrageProtokoll !== 'function' || typeof optionen.rueckfrageZugang?.speicher !== 'function') {
          a2.fehlt = [typeof controllerModul.ermittleRueckfrageProtokoll !== 'function' ? 'ermittleRueckfrageProtokoll (Controller)' : null, typeof optionen.rueckfrageZugang?.speicher !== 'function' ? 'laufOptionen.rueckfrageZugang (Server)' : null].filter(Boolean)
        }
        const tokenKopf = { authorization: `Bearer ${eingaben.rueckfrageKanal?.token}` }
        const npm = { command: 'npm publish' }
        const aussen = { file_path: join(basis, 'AUSSEN.txt'), content: 'x' }
        // t1: Bash in die Warteschlange, Stefan lehnt über die Antwort-Route ab.
        const gestellt = await (await fetch(`${basisUrl}/api/rueckfrage/anfrage`, { method: 'POST', headers: tokenKopf, body: JSON.stringify({ art: 'rechte', tool_name: 'Bash', input: npm, tool_use_id: 't1' }) })).json()
        const antwort = await fetch(`${basisUrl}/api/rueckfragen/${gestellt.id}/antwort`, { method: 'POST', body: JSON.stringify({ entscheidung: 'ablehnen' }) })
        a2.stefan = antwort.status
        // B2b-3b-2b-1b: Text der Ablehnung, wie ihn das MCP-Skript per Long-Poll holt und die CLI als tool_result zurückgibt.
        const textT1 = (await (await fetch(`${basisUrl}/api/rueckfrage/anfrage/${gestellt.id}/warten`, { method: 'POST', headers: tokenKopf, body: '{}' })).json()).entscheidung?.message
        a2.texte = new Map([['t1', textT1]])
        const ermittle = (leser) => (a2.fehlt === undefined ? controllerModul.ermittleRueckfrageProtokoll(laufId, optionen.basisVerzeichnis, leser) : null)
        a2.nurStefan = klassifiziere(laufId, [denial('t1', npm)], ermittle(optionen.rueckfrageZugang), a2.texte).ergebnis
        // t2: auto_deny über die Token-Route, dann eine angehängte gefälschte Version mit t3 stefan_abgelehnt (Delta D3).
        const t2 = await (await fetch(`${basisUrl}/api/rueckfrage/anfrage`, { method: 'POST', headers: tokenKopf, body: JSON.stringify({ art: 'rechte', tool_name: 'Write', input: aussen, tool_use_id: 't2' }) })).json()
        a2.autoDeny = t2.entscheidung?.behavior
        const echt = controllerModul.leseRueckfrageProtokoll(laufId, optionen.basisVerzeichnis)
        a2.echtArten = echt?.eintraege?.map((e) => e.art).join(',')
        const rm = { command: 'rm -rf x' }
        const t3 = { tool_use_id: 't3', tool_name: 'Bash', input_hash: hashVon(rm), art: 'stefan_abgelehnt', grund: 'gefälscht', zeit: '2026-10-16T10:00:00.000Z', ablehnung_hash: sha256Hex(TEXT('t3')) }
        registriereKernArtefakt(`rueckfragen-${laufId}`, profil, { erzeuger: 'kern', schritt: 'rueckfrage-protokoll' }, { rueckfragen_schema: 'v1', lauf_id: laufId, ab: echt?.eintraege?.length ?? 0, eintraege: [t3] }, [], { basisVerzeichnis: optionen.basisVerzeichnis, schreiber: () => {} })
        const beide = [denial('t1', npm), denial('t3', rm)]
        const texteBeide = new Map([...a2.texte, ['t3', TEXT('t3')]])
        a2.gefaelscht = klassifiziere(laufId, beide, ermittle(optionen.rueckfrageZugang), texteBeide).ergebnis
        // Alter Pfad: dieselbe Datei nur zusammengesetzt, ohne Speicher (der Angriff qa 3 aus F-1128 (1)).
        const nurDatei = controllerModul.leseRueckfrageProtokoll(laufId, optionen.basisVerzeichnis)
        a2.alterPfad = klassifiziere(laufId, beide, nurDatei, texteBeide).ergebnis
        a2.ohneLeser = klassifiziere(laufId, [denial('t1', npm)], ermittle(undefined), a2.texte).ergebnis
        a2.laufId = laufId
        a2.optionen = optionen
      },
    })
    const lauf1 = await starteAblauf()
    pruefe(lauf1.lauf && a2.vorbedingung, '(Vorbedingung) Ausführung im Arbeitsordner mit Rückfrage-Kanal gestartet.', `(Vorbedingung) Start ${lauf1.start.status}, Lauf ${Boolean(lauf1.lauf)}, Kanal ${a2.vorbedingung}`)
    if (a2.fehlt !== undefined) befunde.push(`(a2) fehlt: ${a2.fehlt.join(', ')}`)
    else if (lauf1.lauf) {
      const nachEnde = a2.optionen.rueckfrageZugang.speicher()
      const nachEndeErgebnis = klassifiziere(a2.laufId, [denial('t1', { command: 'npm publish' })], controllerModul.ermittleRueckfrageProtokoll(a2.laufId, a2.optionen.basisVerzeichnis, a2.optionen.rueckfrageZugang), a2.texte).ergebnis
      pruefe(
        a2.stefan === 200 && a2.nurStefan === 'ERFOLGREICH' && a2.autoDeny === 'deny' && a2.echtArten === 'stefan_abgelehnt,auto_deny' && a2.gefaelscht === 'VERWEIGERT' && a2.alterPfad === 'ERFOLGREICH' && a2.ohneLeser === 'VERWEIGERT' && nachEnde === null && nachEndeErgebnis === 'VERWEIGERT',
        '(a2) echter Server: Stefan-Ablehnung ⇒ ERFOLGREICH; angehängte gefälschte Version (t3 stefan_abgelehnt, nie über den Kanal) ⇒ VERWEIGERT, über den alten Pfad ERFOLGREICH (Gegenprobe); ohne Leser bzw. nach Lauf-Ende ⇒ VERWEIGERT.',
        `(a2) ${JSON.stringify({ ...a2, optionen: undefined, nachEnde, nachEndeErgebnis })}`
      )
    }
    // Quelltext (Delta H4): die Klassifikation nimmt rueckfragen aus ermittleRueckfrageProtokoll; leseRueckfrageProtokoll nur dort.
    {
      const quelle = readFileSync('src/execution-controller/index.ts', 'utf8')
      const code = quelle
        .split('\n')
        .filter((z) => !/^\s*(\/\/|\*|\/\*)/.test(z))
        .join('\n')
      const bildung = /const rueckfragen = eingaben\.rueckfrageKanal !== undefined \? ermittleRueckfrageProtokoll\(laufId, optionen\.basisVerzeichnis, optionen\.rueckfrageZugang\) : undefined/.test(code)
      const aufrufe = [...code.matchAll(/(?<!function )leseRueckfrageProtokoll\(/g)].map((t) => t.index)
      const start = code.indexOf('export function ermittleRueckfrageProtokoll(')
      const ende = start >= 0 ? code.indexOf('\n}\n', start) : -1
      pruefe(
        bildung && aufrufe.length === 1 && start >= 0 && aufrufe[0] > start && aufrufe[0] < ende,
        '(a2) Quelltext: Controller bildet rueckfragen aus ermittleRueckfrageProtokoll(laufId, optionen.basisVerzeichnis, optionen.rueckfrageZugang); leseRueckfrageProtokoll nur darin.',
        `(a2) Quelltext: Bildung ${bildung}, leseRueckfrageProtokoll-Aufrufe ${aufrufe.length}, innerhalb ${start >= 0 && aufrufe.every((i) => i > start && i < ende)}`
      )
    }

    // (l1) Löschliste nach Stefan-Ablehnung (Lauf 1) und Gegenprobe ohne (Lauf 2).
    {
      const ausgesetzt = arbeitsordnerModul.LOESCHLISTE_AUSGESETZT
      const bleibt = lauf1.lauf ? existsSync(join(lauf1.lauf.wurzel, 'alt.txt')) : null
      const liste1 = lauf1.uebersicht?.loeschliste
      verhalten.push({ stefanAbgelehnt: 0 })
      const lauf2 = await starteAblauf()
      const geloescht = lauf2.lauf ? !existsSync(join(lauf2.lauf.wurzel, 'alt.txt')) : null
      const liste2 = lauf2.uebersicht?.loeschliste
      pruefe(
        typeof ausgesetzt === 'string' && bleibt === true && liste1?.geloescht?.length === 0 && liste1?.abgelehnt?.[0]?.pfad === 'alt.txt' && liste1.abgelehnt[0].grund === ausgesetzt && geloescht === true && JSON.stringify(liste2?.geloescht) === '["alt.txt"]',
        '(l1) abgelehnt_durch_stefan 1 ⇒ alt.txt bleibt, Löschliste nur Hinweis (LOESCHLISTE_AUSGESETZT); ohne Stefan-Ablehnung ⇒ gelöscht (Gegenprobe).',
        `(l1) Export ${typeof ausgesetzt}, bleibt ${bleibt}, Liste ${JSON.stringify(liste1)}; Gegenprobe gelöscht ${geloescht}, Liste ${JSON.stringify(liste2)}`
      )
    }
  }

  // ── (f) Grenzen ────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const server = readFileSync('scripts/leitstand-server.mjs', 'utf8')
    const aufrufe = server.split('starteWorkflowSchritt(').length - 1
    pruefe(aufrufe === 6, '(f) starteWorkflowSchritt( in leitstand-server.mjs 6× (unverändert).', `(f) starteWorkflowSchritt( ${aufrufe}×`)
    // Produktaufrufer von erzeugeRequestHandler: Server-Start und Mehrprojekt-Dispatcher — keiner setzt die Option rueckfrage.
    const produkt = ['scripts/leitstand-server.mjs', ...readdirSync('scripts/leitstand').filter((n) => n.endsWith('.mjs') && !n.endsWith('.test.mjs')).map((n) => `scripts/leitstand/${n}`)]
    const mitKanal = produkt.filter((p) => /erzeugeRequestHandler\([^)]*\brueckfrage\s*:/s.test(readFileSync(p, 'utf8')))
    pruefe(mitKanal.length === 0, '(f) Kanal aus: kein Produktaufrufer übergibt die Option rueckfrage an erzeugeRequestHandler.', `(f) Option rueckfrage gesetzt in: ${mitKanal.join(', ')}`)
    const architektur = readFileSync('ARCHITECTURE.md', 'utf8')
    const w1 = architektur.slice(architektur.indexOf('Wachstumsbremse (F45 W1'), architektur.indexOf('Wachstumsbremse (F45 W1') + 4000)
    pruefe(/F-1131/.test(w1), '(f) ARCHITECTURE §1 nennt bei der W1-Regel F-1131 (Kollision mit check-f813-csrf (4)).', '(f) ARCHITECTURE §1: W1-Regel ohne Verweis auf F-1131')
  }
} catch (fehler) {
  befunde.push(`Gate abgebrochen: ${fehler.stack ?? fehler}`)
} finally {
  for (const dienst of dienste) if (dienst.listening) await new Promise((r) => dienst.close(() => r()))
  for (const pfad of aufraeumen) {
    try {
      execFileSync('git', ['worktree', 'prune'], { cwd: join(pfad, 'projekt'), stdio: 'ignore' })
    } catch {
      // ohne Repo nichts zu tun
    }
    raeumeVerzeichnis(pfad)
  }
}

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e):`)
  for (const b of befunde) console.error(`  - ${b}`)
  process.exit(1)
}
console.log('\n✓ Keine Befunde.')
