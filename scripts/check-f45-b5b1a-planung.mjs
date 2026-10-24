#!/usr/bin/env node
/**
 * Datei: scripts/check-f45-b5b1a-planung.mjs
 *
 * Zweck: Gate für F45 B5b-1a „Planungsdaten lesen“ (features/F45/plan-b5b1-v2.md, Advisor features/F45/advisor-b5b1.md;
 * E-B5-1 = A, fixpaket-f45.md §2 R1–R5). Rot-Nachweis je Regel; Attrappen entstehen zur Laufzeit im tmp, nichts eingecheckt.
 * (a) Formfehler im strengen Abschnitt „## Workstreams“ (Kopf, Zellenzahl, Art, Status, Datum, doppelte ID) ⇒ Befund im
 *     Feature-Akte-Gate (pruefeFeatureAkteInhalt, dieselbe Regel wie check-feature);
 * (b) Schätzung min > max ⇒ Befund;
 * (c) Status erledigt ohne Abgenommen-Datum ⇒ Befund; ABGESCHLOSSEN mit strengem Abschnitt ohne Zeile „Abgenommen:“ ⇒ Befund;
 * (d) R1-Verstoß ohne Ausnahme ⇒ scripts/check-akte-meilenstein.mjs Exit 1 (präparierte Kopie), mit Ausnahme Exit 0;
 * (e) verwaiste Ausnahme in roadmap-ausnahmen.json ⇒ Exit 1;
 * (f) Projektion: Eintrag ohne Schätzung trägt „frühestens ab AT x“ und keine Länge (kein erfundener Balken, R4);
 * (f2) eine Zeile mit Formfehler verkürzt die Prognose nicht still: Feature trägt einen Eintrag „Schätzung fehlt“ (qa 1);
 * (g) „Bis M5 fertig“ nicht berechenbar bei fehlender Schätzung (auch leere Tabelle), mit Anzahl; Gegenprobe berechenbar;
 * (h) LF und CRLF der Akte ergeben dieselben Planungsdaten und dieselbe Projektion;
 * (i2) echte Kennzahlen unabhängig nachgezählt: Features abgenommen gegen die Akten, Meilensteine mit offener Bereinigung =
 *     Meilensteine der Ausnahmen, „Bis M5“ nur berechenbar, wenn F30 geschnitten und alles geschätzt ist, prioritaet je Feature;
 * (i) echte Daten: F45 und F30 tragen einen gültigen strengen Abschnitt, F30 ist ENTWURF, die Ausnahme ohne_akte F30 ist weg,
 *     roadmap-ausnahmen.json trägt genau die fünf R1-Ausnahmen, GET /api/roadmap liefert roadmap_hash = sha256 der Datei;
 * (j) Bullet-Altakten bleiben gültig (workstreams null) — keine echte Akte mit Bullet-Abschnitt hat einen Planungsbefund;
 * (k) Server unverändert: scripts/leitstand-server.mjs ruft keine Planungslogik (B5b-1a schreibt nichts).
 * Randfälle der reinen Funktionen belegen src/workboard/feature-planung.test.ts, roadmap-regeln.test.ts,
 * roadmap-planung.test.ts und workboard.test.ts (Bug-Felder).
 *
 * Wird aufgerufen von: `npm run check:gates` (und damit `npm run check`).
 *
 * Aufruf: node scripts/check-f45-b5b1a-planung.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { leseFeatureStatus, pruefeFeatureAkteInhalt } from '../src/workboard/feature-akte-pruefung.ts'
import { lesePlanung, WORKSTREAM_KOPF } from '../src/workboard/feature-planung.ts'
import { GRUND_BEREINIGUNG_OFFEN } from '../src/workboard/roadmap-regeln.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { AUSNAHMEN } from './check-akte-meilenstein.mjs'
import { baueRoadmapProjektion } from './leitstand/routen-roadmap.mjs'

const befunde = []
console.log('\n=== F45-B5b-1a-Planungsdaten-Check ===\n')
const AKTE_MEILENSTEIN_GATE = resolve(fileURLToPath(import.meta.url), '..', 'check-akte-meilenstein.mjs')
const TRENNER = '|---|---|---|---|---|---|---|---|---|'

/**
 * Meldet einen Fall: ✓ bei erfüllter Bedingung, sonst ein Befund.
 * @param bedingung - erfüllt?
 * @param ok - Text bei Erfolg
 * @param fehler - Befundtext
 */
function pruefe(bedingung, ok, fehler) {
  if (bedingung) console.log(`  ✓ ${ok}`)
  else befunde.push(fehler)
}

/**
 * Akte mit strengem Abschnitt.
 * @param zeilen - Tabellenzeilen
 * @param status - Status-Zeile(n)
 * @returns Text (LF)
 */
function akte(zeilen, status = 'Status: IN_ARBEIT') {
  return ['# F9', '', '## Titel', 'Probe', '', '## Status', status, '', '## Workstreams', '', WORKSTREAM_KOPF, TRENNER, ...zeilen, '', 'Prosa.', ''].join('\n')
}

/**
 * Enthält eine Befundliste einen Text?
 * @param liste - Befunde
 * @param teil - gesuchter Text
 * @returns boolean
 */
const enthaelt = (liste, teil) => liste.some((b) => b.includes(teil))

/**
 * Führt check-akte-meilenstein.mjs in einer präparierten Wurzel aus.
 * @param wurzel - Arbeitsverzeichnis mit features/ und docs/projekt/
 * @returns { exit, ausgabe }
 */
function laufeAkteMeilenstein(wurzel) {
  try {
    return { exit: 0, ausgabe: execFileSync(process.execPath, [AKTE_MEILENSTEIN_GATE], { cwd: wurzel, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }
  } catch (fehler) {
    return { exit: fehler.status ?? -1, ausgabe: `${fehler.stdout ?? ''}${fehler.stderr ?? ''}` }
  }
}

/**
 * Legt eine Mini-Wurzel an: Akten mit Status, roadmap.json, optional roadmap-ausnahmen.json.
 * @param wurzel - Zielordner
 * @param akten - { id: Akte-Text }
 * @param meilensteine - roadmap.json meilensteine
 * @param ausnahmen - status_ausnahmen oder null (Datei fehlt)
 */
function legeWurzelAn(wurzel, akten, meilensteine, ausnahmen) {
  for (const [id, text] of Object.entries(akten)) {
    mkdirSync(join(wurzel, 'features', id), { recursive: true })
    writeFileSync(join(wurzel, 'features', id, 'feature.md'), text)
  }
  mkdirSync(join(wurzel, 'docs', 'projekt'), { recursive: true })
  writeFileSync(join(wurzel, 'docs', 'projekt', 'roadmap.json'), JSON.stringify({ roadmap_schema: 'v0', vision: 'Probe', meilensteine }, null, 2))
  const ausnahmenPfad = join(wurzel, 'docs', 'projekt', 'roadmap-ausnahmen.json')
  if (ausnahmen !== null) writeFileSync(ausnahmenPfad, JSON.stringify({ schema: 'v0', status_ausnahmen: ausnahmen }, null, 2))
}

const basis = mkdtempSync(join(tmpdir(), 'check-f45-b5b1a-'))
try {
  // ── (a) Formfehler ───────────────────────────────────────────────────────────────────────────────────────────────
  {
    const gruen = pruefeFeatureAkteInhalt(akte(['| A | workstream | t | geplant | 0,5 | – | – | – | |']))
    const proben = [
      ['Kopf', pruefeFeatureAkteInhalt('Status: IN_ARBEIT\n## Workstreams\n| ID | Art | Titel |\n|---|---|---|\n'), 'Kopfzeile'],
      ['Zellen', pruefeFeatureAkteInhalt(akte(['| A | workstream | t | geplant |'])), 'Zellen erwartet'],
      ['Art', pruefeFeatureAkteInhalt(akte(['| A | bug | t | geplant | – | – | – | – | |'])), 'Art „bug“'],
      ['Status', pruefeFeatureAkteInhalt(akte(['| A | workstream | t | fertig | – | – | – | – | |'])), 'Status „fertig“'],
      ['Datum', pruefeFeatureAkteInhalt(akte(['| A | workstream | t | geplant | – | – | 24.10.2026 | – | |'])), 'Begonnen „24.10.2026“'],
      ['doppelte ID', pruefeFeatureAkteInhalt(akte(['| A | workstream | t | geplant | – | – | – | – | |', '| A | workstream | t | geplant | – | – | – | – | |'])), 'doppelt'],
    ]
    const fehlend = proben.filter(([, liste, teil]) => !enthaelt(liste, teil)).map(([name]) => name)
    pruefe(gruen.length === 0 && fehlend.length === 0, '(a) Formfehler (Kopf, Zellen, Art, Status, Datum, doppelte ID) ⇒ Befund im Feature-Akte-Gate; gültige Zeile grün.', `(a) grün ${JSON.stringify(gruen)}, nicht erkannt: ${fehlend.join(', ')}`)
  }

  // ── (b) min > max ────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const liste = pruefeFeatureAkteInhalt(akte(['| A | workstream | t | geplant | 2–1 | – | – | – | |']))
    const gegen = pruefeFeatureAkteInhalt(akte(['| A | workstream | t | geplant | 1–2 | – | – | – | |']))
    pruefe(enthaelt(liste, 'min > max') && gegen.length === 0, '(b) Schätzung „2–1“ ⇒ Befund min > max; „1–2“ grün.', `(b) ${JSON.stringify(liste)} / ${JSON.stringify(gegen)}`)
  }

  // ── (c) erledigt ohne Datum ──────────────────────────────────────────────────────────────────────────────────────
  {
    const ohne = pruefeFeatureAkteInhalt(akte(['| A | workstream | t | erledigt | 1 | 1 | – | – | |']))
    const mit = pruefeFeatureAkteInhalt(akte(['| A | workstream | t | erledigt | 1 | 1 | – | 2026-10-24 | |']))
    const abgeschlossen = pruefeFeatureAkteInhalt(akte([], 'Status: ABGESCHLOSSEN'))
    const abgeschlossenMit = pruefeFeatureAkteInhalt(akte([], 'Status: ABGESCHLOSSEN\nAbgenommen: 2026-10-24'))
    pruefe(
      enthaelt(ohne, 'erledigt ohne Abgenommen') && mit.length === 0 && enthaelt(abgeschlossen, 'Abgenommen: JJJJ-MM-TT') && abgeschlossenMit.length === 0,
      '(c) erledigt ohne Abgenommen ⇒ Befund; ABGESCHLOSSEN mit strengem Abschnitt ohne „Abgenommen:“ ⇒ Befund; mit Datum grün.',
      `(c) ${JSON.stringify([ohne, mit, abgeschlossen, abgeschlossenMit])}`
    )
  }

  // ── (d)/(e) R1 und verwaiste Ausnahme über das echte Gate in einer Kopie ─────────────────────────────────────────
  {
    const status = (wert) => `# F\n\n## Titel\nProbe\n\n## Status\nStatus: ${wert}\n`
    // AF-F001: die Ausnahme ohne_meilenstein im echten Gate verlangt die Akte (sonst „veraltet“).
    const akten = { 'AF-F001': status('ABGESCHLOSSEN'), F1: status('ABGESCHLOSSEN'), F2: status('FEATURE_GATE'), F3: status('IN_ARBEIT') }
    const meilensteine = [
      { id: 'M1', titel: 'Eins', status: 'ABGESCHLOSSEN', features: ['F1', 'F2'] },
      { id: 'M2', titel: 'Zwei', status: 'LAEUFT', features: ['F3'] },
    ]
    const ohneAusnahme = join(basis, 'r1-rot')
    legeWurzelAn(ohneAusnahme, akten, meilensteine, null)
    const rot = laufeAkteMeilenstein(ohneAusnahme)
    const mitAusnahme = join(basis, 'r1-gruen')
    legeWurzelAn(mitAusnahme, akten, meilensteine, [{ meilenstein: 'M1', feature: 'F2', grund: GRUND_BEREINIGUNG_OFFEN }])
    const gruen = laufeAkteMeilenstein(mitAusnahme)
    pruefe(rot.exit === 1 && rot.ausgabe.includes('R1: Meilenstein M1 ist ABGESCHLOSSEN, Feature F2') && gruen.exit === 0 && gruen.ausgabe.includes('R1-Ausnahme M1/F2'), '(d) R1-Verstoß ohne Ausnahme ⇒ check-akte-meilenstein Exit 1; mit begründeter Ausnahme Exit 0.', `(d) rot ${rot.exit}: ${rot.ausgabe.slice(-300)} / grün ${gruen.exit}: ${gruen.ausgabe.slice(-300)}`)

    const verwaist = join(basis, 'verwaist')
    legeWurzelAn(verwaist, akten, meilensteine, [
      { meilenstein: 'M1', feature: 'F2', grund: GRUND_BEREINIGUNG_OFFEN },
      { meilenstein: 'M2', feature: 'F3', grund: GRUND_BEREINIGUNG_OFFEN },
    ])
    const lauf = laufeAkteMeilenstein(verwaist)
    pruefe(lauf.exit === 1 && lauf.ausgabe.includes('Ausnahme M2/F3 ist veraltet'), '(e) verwaiste Ausnahme (Meilenstein nicht ABGESCHLOSSEN) ⇒ Exit 1.', `(e) ${lauf.exit}: ${lauf.ausgabe.slice(-300)}`)
  }

  // ── (f)/(g)/(h) Projektion über eine Probe-Wurzel ────────────────────────────────────────────────────────────────
  {
    const f1 = akte(['| A | fixpaket | t | erledigt | 0,3 | 0,5 | – | 2026-10-20 | |', '| B | fixpaket | t | geplant | – | – | – | – | |', '| C | fixpaket | t | geplant | 1–2 | – | – | – | |'])
    const f30 = akte([], 'Status: ENTWURF')
    const meilensteine = [{ id: 'M5', titel: 'Fünf', status: 'LAEUFT', features: ['F1', 'F30'] }]
    const lf = join(basis, 'projektion-lf')
    legeWurzelAn(lf, { F1: f1, F30: f30 }, meilensteine, null)
    const p = baueRoadmapProjektion({ repoWurzel: lf, roadmapPfad: 'docs/projekt/roadmap.json', heute: '2026-10-26' })
    const b = p.zeitachse?.eintraege.find((e) => e.workstream === 'B')
    const c = p.zeitachse?.eintraege.find((e) => e.workstream === 'C')
    pruefe(
      b !== undefined && b.schaetzung_fehlt && b.fruehestens_ab_at === 0 && !('ende_min_at' in b) && !('ende_max_at' in b) && !('start_at' in b) && c?.nach_unbekannt === true,
      '(f) Eintrag ohne Schätzung: schaetzung_fehlt, frühestens ab AT 0, keine Länge; Folgeeintrag nach_unbekannt.',
      `(f) ${JSON.stringify(p.zeitachse)}`
    )
    const m5 = p.kennzahlen?.bis_fertig.find((k) => k.meilenstein === 'M5')
    const gegen = join(basis, 'projektion-berechenbar')
    legeWurzelAn(gegen, { F1: akte(['| C | fixpaket | t | geplant | 1–2 | – | – | – | |']) }, [{ id: 'M5', titel: 'Fünf', status: 'LAEUFT', features: ['F1'] }], null)
    const m5Gegen = baueRoadmapProjektion({ repoWurzel: gegen, roadmapPfad: 'docs/projekt/roadmap.json', heute: '2026-10-26' }).kennzahlen?.bis_fertig[0]
    pruefe(
      m5?.berechenbar === false && m5.min === null && m5.ohne_schaetzung === 2 && m5Gegen?.berechenbar === true && m5Gegen.min === 1 && m5Gegen.max === 2,
      '(g) „Bis M5 fertig“ nicht berechenbar bei fehlender Schätzung (Zeile ohne Schätzung + leere Tabelle F30 = 2); Gegenprobe 1–2 AT.',
      `(g) ${JSON.stringify(m5)} / ${JSON.stringify(m5Gegen)}`
    )
    // (f2) qa 1: eine Zeile mit Formfehler fällt aus workstreams — die Prognose darf dadurch nicht still kürzer werden.
    const kaputt = join(basis, 'projektion-formfehler')
    legeWurzelAn(kaputt, { F1: akte(['| C | fixpaket | t | geplant | 1–2 | – | – | – | |', '| D | fixpaket | t | geplant | 1–1,4 | – | 24.10. | – | |']) }, [{ id: 'M5', titel: 'Fünf', status: 'LAEUFT', features: ['F1'] }], null)
    const pKaputt = baueRoadmapProjektion({ repoWurzel: kaputt, roadmapPfad: 'docs/projekt/roadmap.json', heute: '2026-10-26' })
    const zusatz = pKaputt.zeitachse?.eintraege.find((e) => e.feature === 'F1' && e.workstream === null)
    pruefe(
      pKaputt.meilensteine?.[0].features[0].planung_befunde.length > 0 && zusatz?.schaetzung_fehlt === true && pKaputt.kennzahlen?.bis_fertig[0].berechenbar === false,
      '(f2) Formfehler in einer offenen Zeile ⇒ Befund sichtbar, Feature trägt einen Eintrag „Schätzung fehlt“, „Bis M5“ nicht berechenbar (keine verkürzte Prognose).',
      `(f2) ${JSON.stringify({ befunde: pKaputt.meilensteine?.[0].features[0].planung_befunde, zusatz, bis: pKaputt.kennzahlen?.bis_fertig })}`
    )
    const crlf = join(basis, 'projektion-crlf')
    legeWurzelAn(crlf, { F1: f1.replace(/\n/g, '\r\n'), F30: f30.replace(/\n/g, '\r\n') }, meilensteine, null)
    const pCrlf = baueRoadmapProjektion({ repoWurzel: crlf, roadmapPfad: 'docs/projekt/roadmap.json', heute: '2026-10-26' })
    const ohneHash = (x) => JSON.stringify({ ...x, roadmap_hash: null })
    pruefe(
      ohneHash(p) === ohneHash(pCrlf) && JSON.stringify(lesePlanung(f1)) === JSON.stringify(lesePlanung(f1.replace(/\n/g, '\r\n'))) && pruefeFeatureAkteInhalt(f1.replace(/\n/g, '\r\n')).length === 0,
      '(h) LF und CRLF: gleiche Planungsdaten, gleiche Projektion, Gate grün.',
      '(h) LF und CRLF weichen ab'
    )
  }

  // ── (i) echte Daten ──────────────────────────────────────────────────────────────────────────────────────────────
  {
    const f45 = readFileSync('features/F45/feature.md', 'utf8')
    const f30 = readFileSync('features/F30/feature.md', 'utf8')
    const p45 = lesePlanung(f45)
    const p30 = lesePlanung(f30)
    const ausnahmen = JSON.parse(readFileSync('docs/projekt/roadmap-ausnahmen.json', 'utf8')).status_ausnahmen
    const paare = ausnahmen.map((a) => `${a.meilenstein}/${a.feature}`).sort()
    const projektion = baueRoadmapProjektion({ repoWurzel: process.cwd(), roadmapPfad: 'docs/projekt/roadmap.json' })
    const hash = createHash('sha256').update(readFileSync('docs/projekt/roadmap.json')).digest('hex')
    // Kennzahlen an den echten Daten, unabhängig nachgezählt (qa Lücke (i)) — strukturell, nicht als feste Zahl.
    const roadmapFeatures = projektion.meilensteine.flatMap((m) => m.features)
    const aktenStatus = (f) => (existsSync(join('features', f.id, 'feature.md')) ? leseFeatureStatus(readFileSync(join('features', f.id, 'feature.md'), 'utf8')) : null)
    const abgenommen = roadmapFeatures.filter((f) => aktenStatus(f) === 'ABGESCHLOSSEN').length
    // F45 B5b-1b-1 (Entscheidung Challenger, Advisor C5): ABGEBROCHEN zählt nicht zur Gesamtmenge.
    const gesamt = roadmapFeatures.filter((f) => aktenStatus(f) !== 'ABGEBROCHEN').length
    const k = projektion.kennzahlen
    const m5 = k.bis_fertig.find((b) => b.meilenstein === 'M5')
    const kennzahlenOk =
      k.features_abgenommen.abgenommen === abgenommen &&
      k.features_abgenommen.gesamt === gesamt &&
      k.meilensteine.mit_abweichung === new Set(ausnahmen.map((a) => a.meilenstein)).size &&
      m5 !== undefined &&
      m5.berechenbar === ((p30.workstreams?.length ?? 0) > 0 && m5.ohne_schaetzung === 0) &&
      roadmapFeatures.every((f) => f.status === 'keine_akte' || 'prioritaet' in f)
    pruefe(
      kennzahlenOk,
      `(i2) echte Kennzahlen: Features abgenommen ${k.features_abgenommen.abgenommen}/${k.features_abgenommen.gesamt} = Akten nachgezählt, Meilensteine ${k.meilensteine.abgeschlossen}/${k.meilensteine.gesamt} (${k.meilensteine.mit_abweichung} mit offener Bereinigung = Ausnahmen-Meilensteine), „Bis M5“ ${m5?.berechenbar ? 'berechenbar' : `nicht berechenbar (${m5?.ohne_schaetzung} ohne Schätzung)`}, prioritaet je Feature.`,
      `(i2) ${JSON.stringify({ k: { ...k, plan_gegen_ist: undefined }, abgenommen, gesamt })}`
    )
    pruefe(
      p45.befunde.length === 0 &&
        (p45.workstreams?.length ?? 0) > 0 &&
        p30.befunde.length === 0 &&
        Array.isArray(p30.workstreams) &&
        /^Status: ENTWURF$/m.test(f30) &&
        pruefeFeatureAkteInhalt(f45).length === 0 &&
        pruefeFeatureAkteInhalt(f30).length === 0 &&
        !AUSNAHMEN.some((a) => a.id === 'F30') &&
        JSON.stringify(paare) === JSON.stringify(['M3/F18', 'M4/F20', 'M4/F21', 'M4/F22', 'M4/F25']) &&
        ausnahmen.every((a) => a.grund === GRUND_BEREINIGUNG_OFFEN) &&
        projektion.roadmap_hash === hash,
      `(i) echte Daten: F45 (${p45.workstreams?.length} Zeilen) und F30 (ENTWURF, ${p30.workstreams?.length} Zeilen) streng und gültig, keine Ausnahme ohne_akte F30, fünf R1-Ausnahmen, roadmap_hash = sha256 der Datei.`,
      `(i) F45 ${JSON.stringify(p45.befunde)}, F30 ${JSON.stringify(p30.befunde)} ${JSON.stringify(p30.workstreams)}, Ausnahmen ${JSON.stringify(paare)}, Hash ${projektion.roadmap_hash} ≠ ${hash}?`
    )
  }

  // ── (j) Bullet-Altakten ──────────────────────────────────────────────────────────────────────────────────────────
  {
    const bullet = []
    const fehler = []
    for (const id of readdirSync('features')) {
      const pfad = join('features', id, 'feature.md')
      if (!existsSync(pfad)) continue
      const text = readFileSync(pfad, 'utf8')
      if (!/^## Workstreams[ \t]*\r?$/m.test(text)) continue
      const planung = lesePlanung(text)
      if (planung.workstreams === null) bullet.push(id)
      if (planung.befunde.length > 0) fehler.push(`${id}: ${planung.befunde[0]}`)
    }
    pruefe(bullet.length >= 18 && fehler.length === 0, `(j) ${bullet.length} Akten mit Bullet-Abschnitt „## Workstreams“ bleiben Prosa (workstreams null), keine Akte mit Planungsbefund.`, `(j) Bullet ${bullet.length}, Befunde ${fehler.join(' | ')}`)
  }

  // ── (k) Server unverändert ───────────────────────────────────────────────────────────────────────────────────────
  {
    const server = readFileSync('scripts/leitstand-server.mjs', 'utf8')
    const verboten = ['feature-planung', 'roadmap-planung', 'roadmap-regeln', 'roadmap-ausnahmen'].filter((name) => server.includes(name))
    pruefe(verboten.length === 0, '(k) scripts/leitstand-server.mjs kennt keine Planungslogik (B5b-1a liest nur, Projektion in routen-roadmap.mjs).', `(k) Server nennt ${verboten.join(', ')}`)
  }
} catch (fehler) {
  befunde.push(`Gate-Ausführung gescheitert: ${fehler.stack ?? fehler}`)
} finally {
  raeumeVerzeichnis(basis)
}

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e):`)
  for (const b of befunde) console.error(`  - ${b}`)
  process.exit(1)
}
console.log('\n✓ Keine Befunde.')
