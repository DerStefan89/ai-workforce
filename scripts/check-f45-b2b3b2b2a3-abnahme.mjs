#!/usr/bin/env node
/**
 * Datei: scripts/check-f45-b2b3b2b2a3-abnahme.mjs
 *
 * Zweck: Gate für F45 B2b-3b-2b-2a-3 „Rückfrage-Kanal: Abnahme“ (features/F45/plan-b2b3b2b2a3-v2.md, Advisor
 * features/F45/advisor-b2b3b2b2a3.md). Neue Exporte werden je Fall geladen, damit jeder Fall gegen main (Rot-Nachweis per git archive,
 * F-1127) seinen eigenen Befund zeigt.
 *
 * Prüft:
 * (z) echte Vermittlung: Zählung mit den unbeantworteten (abgelaufen, beim Lesen offen ⇒ lauf_ende, automatisch inkl. Grenze ohne
 *     Eintrag); die beim Lesen offenen sind genau die beim Lauf-Ende abgelehnten (Advisor M1).
 * (f) echter Evaluator: TIMEOUT (FEHLGESCHLAGEN) mit Kanal trägt rueckfrage_zaehlung; ohne Kanal keine rueckfrage_*-Schlüssel.
 * (p) Projektion aus echten Terminalmarken (run_prepared + klassifiziereLauf): mit Kanal Felder, ohne Kanal null, Bestandsmarke mit vier
 *     Feldern ⇒ neue Felder null.
 * (s) echter Handler: GET /api/laeufe/<id> liefert rueckfrageKanal (VERWEIGERT mit Grund, ERFOLGREICH mit Zählung, ohne Kanal null).
 *     Das Feld art des R3-Startfehlers prüft Gate f45-b2b3b2b1a-rest (r3) über den echten Lauf.
 * (a) Anzeige: Block, „keine Rückfrage“, Kanal-Grund statt Standardsatz (nicht bei echter Verweigerung), R3 escaped.
 * (g) Regel: frage_stefan vor „- [x] Blockiert“, „Frage ungültig“ ⇒ einmal korrigiert neu, dann wie keine Antwort.
 * (w) Grenzen: starteWorkflowSchritt( 6×; scripts/_rueckfrage-aus-pruefung.mjs unverändert (gepinnter Hash, DEKLARIERT); im Controller kein
 *     await zwischen dem Lesen der Zählung und dem Ende von fuehreAufgabeDurch (Advisor M1).
 *
 * Wird aufgerufen von: `npm run check:gates` (und damit `npm run check`).
 *
 * Aufruf: node scripts/check-f45-b2b3b2b2a3-abnahme.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { randomUUID } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { kanonischesJson, ladeGueltigeCheckpoints, schreibeWirkungsmarke, sha256Hex, stelleLaufstatusFest } from '../src/checkpoint-store/index.ts'
import { klassifiziereLauf } from '../src/result-evaluator/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
console.log('\n=== F45-B2b-3b-2b-2a-3-Abnahme-Check ===\n')
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

/** Hash (LF) von scripts/_rueckfrage-aus-pruefung.mjs auf main nach #358. */
const REGEL_HASH = '99bf07b69c126c0f8df9d789a779270139fd19842c2b26e47c4bc0b06d282d27'
const NULL7 ={ stefan_erlaubt: 0, stefan_abgelehnt: 0, frage_beantwortet: 0, nicht_browser: 0, abgelaufen: 0, lauf_ende: 0, automatisch: 0 }
const profil = leiteProfilReferenzAb(ladeStartvorlage('startvorlagen/beispielprojekt.json'))
const kontroll = mkdtempSync(join(tmpdir(), 'f45-b2b3b2b2a3-'))
aufraeumen.push(kontroll)

/**
 * Schreibt run_prepared und klassifiziert einen Lauf mit dem echten Evaluator (Advisor M7: sonst NICHT_GESTARTET).
 * @param stdout - Rohstrom-stdout
 * @param zusatz - (laufId) => weitere Klassifikations-Eingaben (Kanal)
 * @param beendigungsart - optional 'TIMEOUT'
 * @returns { laufId, ergebnis, daten }
 */
function klassifiziere(stdout, zusatz, beendigungsart) {
  const laufId = `gate-a3-${randomUUID()}`
  schreibeWirkungsmarke(laufId, profil, 'run_prepared', {}, { basisVerzeichnis: kontroll, schreiber: () => {} })
  const pfad = join(kontroll, `roh-${laufId}.json`)
  const roh = JSON.stringify({ stdout, stderr: '', exitCode: beendigungsart === undefined ? 0 : null, ...(beendigungsart !== undefined ? { beendigungsart } : {}) })
  writeFileSync(pfad, roh)
  const laufakte = { worker: 'claude-code', beobachtungsbasis_vollstaendig: true, rohstrom_referenz: { pfad, inhalts_hash: sha256Hex(roh) } }
  const e = klassifiziereLauf(laufId, profil, { laufakte, ...zusatz(laufId) }, { basisVerzeichnis: kontroll, schreiber: () => {} })
  const daten = ladeGueltigeCheckpoints(laufId, { basisVerzeichnis: kontroll }).find((c) => c.payload.selbst_hash === e.wirkungsmarke.selbstHash)?.payload.daten
  return { laufId, ergebnis: e.ergebnis, daten }
}

const TEXT = 'Stefan hat den Befehl abgelehnt. (Ref a3)'
const DENIAL = { tool_name: 'Bash', tool_use_id: 'toolu_a3', tool_input: { command: 'npm publish' } }
const stdout = (denials, text = TEXT) =>
  `${JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'toolu_a3', content: text, is_error: true }] } })}\n${JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: 'fertig', permission_denials: denials })}`
const protokoll = (laufId) => ({ rueckfragen_schema: 'v1', lauf_id: laufId, ab: 0, eintraege: [{ tool_use_id: 'toolu_a3', tool_name: 'Bash', input_hash: sha256Hex(kanonischesJson(DENIAL.tool_input)), art: 'stefan_abgelehnt', grund: 'Stefan hat abgelehnt', zeit: '2026-10-17T10:00:00.000Z', befehl: 'npm publish', ablehnung_hash: sha256Hex(TEXT) }] })

try {
  // ── (z) Zählung in der echten Vermittlung ───────────────────────────────────────────────────────────────────────────
  {
    const { erzeugeRueckfrageVermittlung, MAX_PROTOKOLL_JE_LAUF } = await import('./leitstand/rueckfrage-vermittlung.mjs')
    const geschrieben = []
    const v = erzeugeRueckfrageVermittlung({ warteGrenzeMs: 20, pfadOptionen: { realpath: (p) => p }, protokolliere: (_l, e) => geschrieben.push(e) })
    const ORDNER = process.platform === 'win32' ? 'C:\\proj\\wf' : '/proj/wf'
    v.oeffneLauf('z1', { token: 'd'.repeat(64), arbeitsordner: ORDNER, werkzeugNamen: ['Read', 'Write', 'Bash'] })
    v.stelle('z1', { art: 'rechte', tool_name: 'Bash', input: { command: 'npm publish' }, tool_use_id: 'a1' })
    v.stelle('z1', { art: 'frage', frage: 'A?', tool_use_id: 'a2' })
    // qa 11: großzügiger Abstand zur Wartegrenze (20 ms), damit eine ausgelastete Maschine nicht einmalig rot wird.
    await new Promise((r) => setTimeout(r, 300))
    v.stelle('z1', { art: 'rechte', tool_name: 'Bash', input: { command: 'git push' }, tool_use_id: 'o1' })
    v.stelle('z1', { art: 'rechte', tool_name: 'Write', input: { file_path: '../x', content: 'x' }, tool_use_id: 'w1' })
    const z = v.zugang('z1', () => {}).zaehlung()
    v.beendeLauf('z1')
    const laufEnde = geschrieben.filter((e) => e.art === 'lauf_beendet' || (e.art === 'frage_ohne_antwort' && e.grund === 'Lauf beendet')).length
    pruefe(
      isDeepStrictEqual(z, { ...NULL7, abgelaufen: 2, lauf_ende: 1, automatisch: 1 }) && laufEnde === z?.lauf_ende,
      '(z) Zählung: abgelaufen 2, beim Lesen offen ⇒ lauf_ende 1 (= Lauf-Ende-Ablehnungen), auto_deny ⇒ automatisch 1.',
      `(z) Zählung ${JSON.stringify(z)}, Lauf-Ende-Einträge ${laufEnde}`
    )
    const g = erzeugeRueckfrageVermittlung({ pfadOptionen: { realpath: (p) => p } })
    g.oeffneLauf('z2', { token: 'e'.repeat(64), arbeitsordner: ORDNER, werkzeugNamen: ['Write'] })
    for (let i = 0; i <= MAX_PROTOKOLL_JE_LAUF; i++) g.stelle('z2', { art: 'rechte', tool_name: 'Write', input: { file_path: '../x', content: String(i) }, tool_use_id: `w${i}` })
    const zg = g.zugang('z2', () => {}).zaehlung()
    g.beendeLauf('z2')
    pruefe(zg?.automatisch === MAX_PROTOKOLL_JE_LAUF + 1, '(z) Ablehnung über der Protokollgrenze ohne Eintrag zählt unter automatisch.', `(z) Grenze: ${JSON.stringify(zg)}`)
  }

  // ── (f) Evaluator: Zählung auch bei FEHLGESCHLAGEN, ohne Kanal bitgleich ───────────────────────────────────────────
  {
    const zaehlung = { ...NULL7, lauf_ende: 1 }
    const mit = klassifiziere('', () => ({ rueckfragen: null, rueckfrageZaehlung: zaehlung }), 'TIMEOUT')
    const ohne = klassifiziere('', () => ({}), 'TIMEOUT')
    pruefe(
      mit.ergebnis === 'FEHLGESCHLAGEN' && isDeepStrictEqual(mit.daten?.rueckfrage_zaehlung, zaehlung) && Object.keys(ohne.daten ?? {}).every((k) => !k.startsWith('rueckfrage_')),
      '(f) TIMEOUT mit Kanal ⇒ rueckfrage_zaehlung in daten; ohne Kanal keine Kanal-Felder.',
      `(f) mit ${JSON.stringify(mit)}, ohne ${JSON.stringify(ohne.daten)}`
    )
  }

  // ── (p)/(s) Projektion und Handler ─────────────────────────────────────────────────────────────────────────────────
  const zaehlungV = { ...NULL7, stefan_abgelehnt: 1 }
  const verweigert = klassifiziere(stdout([DENIAL], 'Permission denied.'), (l) => ({ rueckfragen: protokoll(l), rueckfrageZaehlung: zaehlungV }))
  const erfolg = klassifiziere(stdout([DENIAL]), (l) => ({ rueckfragen: protokoll(l), rueckfrageZaehlung: zaehlungV }))
  const ohneKanal = klassifiziere(stdout([DENIAL]), () => ({}))
  const bestand = klassifiziere(stdout([]), () => ({ rueckfrageZaehlung: { stefan_erlaubt: 1, stefan_abgelehnt: 0, frage_beantwortet: 0, nicht_browser: 0 } }))
  const projektionModul = await lade('./leitstand/lauf-terminal-projektion.mjs')
  if (projektionModul.fehler !== undefined) befunde.push(`(p) Modul fehlt: ${projektionModul.fehler}`)
  else {
    const p = (lauf) => projektionModul.baueRueckfrageKanalProjektion(lauf.laufId, stelleLaufstatusFest(lauf.laufId, { basisVerzeichnis: kontroll, schreiber: () => {} }), kontroll)
    const [pv, pe, po, pb] = [p(verweigert), p(erfolg), p(ohneKanal), p(bestand)]
    pruefe(
      verweigert.ergebnis === 'VERWEIGERT' && pv?.ergebnis === 'VERWEIGERT' && isDeepStrictEqual(pv?.abgleich, { art: 'abgleich', grund: 'ablehnungstext_passt_nicht' }) && isDeepStrictEqual(pv?.zaehlung, zaehlungV) && pv?.abgelehntDurchStefan === null,
      '(p) VERWEIGERT mit Kanal ⇒ Projektion mit Abgleich-Grund und Zählung.',
      `(p) VERWEIGERT: ${JSON.stringify(pv)}`
    )
    pruefe(
      erfolg.ergebnis === 'ERFOLGREICH' && pe?.abgelehntDurchStefan === 1 && pe?.abgleich === null && po === null && pb?.zaehlung?.abgelaufen === null && pb?.zaehlung?.stefan_erlaubt === 1,
      '(p) ERFOLGREICH ⇒ bestätigte Ablehnung 1; ohne Kanal null; Bestandsmarke mit vier Feldern ⇒ neue Felder null.',
      `(p) ERFOLGREICH ${JSON.stringify(pe)}, ohne ${JSON.stringify(po)}, Bestand ${JSON.stringify(pb)}`
    )
  }
  {
    const { erzeugeRequestHandler } = await import('./leitstand-server.mjs')
    const handler = erzeugeRequestHandler({ basisVerzeichnis: kontroll, repoWurzel: kontroll, installWurzel: process.cwd(), startvorlagePfad: 'startvorlagen/beispielprojekt.json', standCacheMs: 0 })
    const dienst = createServer(handler)
    await new Promise((r) => dienst.listen(0, '127.0.0.1', r))
    try {
      const hole = async (laufId) => (await fetch(`http://127.0.0.1:${dienst.address().port}/api/laeufe/${laufId}`)).json()
      const [dv, de, dohne] = [await hole(verweigert.laufId), await hole(erfolg.laufId), await hole(ohneKanal.laufId)]
      pruefe(
        dv.rueckfrageKanal?.abgleich?.grund === 'ablehnungstext_passt_nicht' && de.rueckfrageKanal?.zaehlung?.stefan_abgelehnt === 1 && 'rueckfrageKanal' in dohne && dohne.rueckfrageKanal === null && dv.verweigertDaten?.bypassVerdachtAnzahl === 0,
        '(s) GET /api/laeufe/<id>: rueckfrageKanal mit Grund bzw. Zählung, ohne Kanal null; verweigertDaten nach dem Umzug unverändert.',
        `(s) ${JSON.stringify({ v: dv.rueckfrageKanal, e: de.rueckfrageKanal, ohne: dohne.rueckfrageKanal, vd: dv.verweigertDaten })}`
      )
    } finally {
      await new Promise((r) => dienst.close(r))
    }
  }

  // ── (a) Anzeige ───────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const anzeige = await lade('../public/leitstand/rueckfrage-abnahme.js')
    if (anzeige.fehler !== undefined) befunde.push(`(a) Modul fehlt: ${anzeige.fehler}`)
    else {
      const { renderLaufNotiz } = await import('../public/leitstand/views/lauf-detail.js')
      const { renderSichtungNotiz } = await import('../public/leitstand/views/workflow-eingriffe.js')
      const k = (feld) => ({ ergebnis: 'VERWEIGERT', zaehlung: NULL7, abgleich: null, abweichung: null, abgelehntDurchStefan: null, ...feld })
      const ls = { status: 'ABGESCHLOSSEN', ergebnis: 'VERWEIGERT' }
      const sicht = { schrittId: 's2', laufId: 'l', nachfolger: 's3' }
      const kanalGrund = k({ abgleich: { art: 'abgleich', grund: 'ablehnungstext_passt_nicht' } })
      const echt = k({ abgleich: { art: 'abgleich', grund: 'kein_eintrag' } })
      const r3 = anzeige.renderRueckfrageAbnahme(k({ abweichung: '<img src=x onerror=alert(1)>' }))
      pruefe(
        anzeige.renderRueckfrageAbnahme(null) === '' && /keine Rückfrage/.test(anzeige.renderRueckfrageAbnahme(k({}))) && !/keine Rückfrage/.test(anzeige.renderRueckfrageAbnahme(k({ zaehlung: { ...NULL7, abgelaufen: 1 } }))) && /nicht bestätigt hat/.test(anzeige.renderRueckfrageAbnahme(k({ zaehlung: { ...NULL7, stefan_abgelehnt: 1 } }))),
        '(a) Block: ohne Kanal leer, alle 0 ⇒ „keine Rückfrage“, abgelaufene ⇒ nicht „keine Rückfrage“, B10-Beschriftung.',
        '(a) Block falsch'
      )
      pruefe(
        /Deine Ablehnung nicht bestätigt/.test(renderLaufNotiz('fehler', { laufStatus: ls, rueckfrageKanal: kanalGrund })) &&
          renderLaufNotiz('fehler', { laufStatus: ls, rueckfrageKanal: echt }) === renderLaufNotiz('fehler', { laufStatus: ls }) &&
          /wegen des Rückfrage-Kanals/.test(renderSichtungNotiz('wf', { ...sicht, kanal: kanalGrund })) &&
          renderSichtungNotiz('wf', { ...sicht, kanal: echt }) === renderSichtungNotiz('wf', sicht),
        '(a) Kanal-Grund statt Standardsatz in Lauf-Notiz und Sichtung; echte Verweigerung ⇒ Standardsatz bitgleich.',
        '(a) Ursache/Standardsatz falsch'
      )
      pruefe(/note red rueckfrage-abweichung/.test(r3) && /&lt;img/.test(r3) && !/<img/.test(r3), '(a) R3 als eigene rote Meldung, Text escaped.', `(a) R3: ${r3.slice(0, 200)}`)
    }
  }

  // ── (g) Regel ──────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const { RUECKFRAGE_REGEL, FRAGE_WERKZEUG } = await import('../src/rueckfrage/index.ts')
    const blockiert = RUECKFRAGE_REGEL.find((z) => z.includes("'- [x] Blockiert'")) ?? ''
    const ungueltig = RUECKFRAGE_REGEL.find((z) => z.includes('Frage ungültig — nicht an Stefan gestellt')) ?? ''
    const mcp = readFileSync('scripts/leitstand/rueckfrage-mcp.mjs', 'utf8')
    pruefe(
      blockiert.includes(`Zuerst ${FRAGE_WERKZEUG};`) && blockiert.indexOf(FRAGE_WERKZEUG) < blockiert.indexOf("'- [x] Blockiert'") && /einmal korrigiert neu/.test(ungueltig) && /wie keine Antwort/.test(ungueltig) && mcp.includes('`Frage ungültig — nicht an Stefan gestellt: ${') && RUECKFRAGE_REGEL.every((z) => !/^-\s*\[[xX]\]/.test(z)),
      '(g) Regel: frage_stefan vor „- [x] Blockiert“; „Frage ungültig“ ⇒ einmal korrigiert neu, dann wie keine Antwort (Wortlaut wie MCP-Skript).',
      `(g) Regel: ${JSON.stringify(RUECKFRAGE_REGEL)}`
    )
  }

  // ── (w) Grenzen ────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const server = readFileSync('scripts/leitstand-server.mjs', 'utf8')
    pruefe(server.split('starteWorkflowSchritt(').length - 1 === 6, '(w) starteWorkflowSchritt( in leitstand-server.mjs 6×.', `(w) starteWorkflowSchritt( ${server.split('starteWorkflowSchritt(').length - 1}×`)
    // code-reviewer 5: Hash der Fassung von main (#358) statt eines Vergleichs mit main — DEKLARIERT: eine bewusste Änderung der gemeinsamen
    // Regel muss diesen Hash mit Begründung nachziehen (die Datei soll streng bleiben, nicht stillschweigend weicher werden).
    const regelHash = sha256Hex(readFileSync('scripts/_rueckfrage-aus-pruefung.mjs', 'utf8').replace(/\r\n/g, '\n'))
    pruefe(regelHash === REGEL_HASH, '(w) scripts/_rueckfrage-aus-pruefung.mjs unverändert (Hash der Fassung #358).', `(w) scripts/_rueckfrage-aus-pruefung.mjs geändert (Hash ${regelHash})`)
    // code-reviewer 4 / Advisor M1: zwischen dem Lesen der Zählung und dem Ende von fuehreAufgabeDurch kein await — sonst könnte die
    // Wartegrenze dazwischen feuern und `lauf_ende` stimmte nicht mehr (der Server ruft beendeLauf als Erstes im .then).
    const controller = readFileSync('src/execution-controller/index.ts', 'utf8').replace(/\r\n/g, '\n')
    const ab = controller.indexOf('const rueckfrageZaehlung =')
    const bis = controller.indexOf('\n}\n', ab)
    const strecke = ab < 0 || bis < 0 ? null : controller.slice(ab, bis)
    pruefe(strecke !== null && !/\bawait\b/.test(strecke), '(w) Controller: kein await zwischen dem Lesen der Zählung und dem Ende von fuehreAufgabeDurch (Invariante lauf_ende).', `(w) Controller: ${strecke === null ? 'Lesestelle nicht gefunden' : 'await nach dem Lesen der Zählung'}`)
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
console.log('\n✓ Keine Befunde (scripts/check-f45-b2b3b2b2a3-abnahme.mjs).')
