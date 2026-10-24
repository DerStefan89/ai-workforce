#!/usr/bin/env node
/**
 * Datei: scripts/check-f45-b5a2-akte-anzeige.mjs
 *
 * Zweck: Gate für F45 B5a-2 „Akte anzeigen“ (features/F45/plan-b5a2-v2.md, Advisor features/F45/advisor-b5a2.md und
 * advisor-b5a2-delta.md; E-F45-1, F-912, F-991, F-995). Prüft die Oberfläche ohne Browser: die reinen Module mit einer
 * fetch-Attrappe, die Render-Funktionen und die Verdrahtung statisch. Je Fall eine Gegenprobe.
 * (a) Speichern sendet PUT …/features/<id>/akte mit dem gelesenen hash und dem grund (api.js speichereFeatureAkte mit
 *     baueAkteKoerper); workboard.js ruft es genau so; Gegenprobe: ohne Grund ist Speichern gesperrt, ein Aufruf ohne Hash fällt auf;
 * (b) alle Antwortfälle sichtbar: 200 (Git-Block, geänderte Abschnitte), 400, 409 Hash („Neu laden“), 409 Sperre (Link zum Ablauf),
 *     422 (Grund und Verstöße wörtlich, escaped); Gegenprobe: 409 ohne hash/workflowId ist ein Fehler, Hash-409 hat keinen Link;
 * (b5) eine unvollständige Akte trägt im Formular den Warnhinweis mit Akte-Link; Gegenprobe: vollständige Akte ohne Hinweis;
 * (b6) workboard.js verwirft überholte Akte-Ladungen (Zähler akteLadung);
 * (c) Kachel „Entscheidungen“ echt aus entscheidungen[]: Kennungen sichtbar, kein „kommt“ in der Kachel; leer ⇒ Leersatz;
 *     Gegenprobe: der alte „kommt“-Schlüssel ist aus dem Wörterbuch verschwunden;
 * (d) „Als Feature anlegen“ sendet POST /api/features { scope } (api.js legeFeatureAn), chat.js ruft es mit dem Scope des
 *     Eintrags; Gegenprobe: der Auftragsweg ruft weiter legeAuftragAn;
 * (e) eine offene Abnahme zählt: Persona „waiting_for_human“, zaehleWartendeAufStefan = 1, Spalte „Braucht dich“, Startfläche und
 *     Persona lesen die Zahl aus attention-daten.js; Gegenprobe abnahme.offen false;
 * (f) akte-bearbeiten.js und views/workboard-detail.js bleiben rein (kein fetch, document, window); Rot-Kalibrierung;
 * (g) Verdrahtung in workboard.js (statisch, je mit Gegenprobe): Sperre 'akte' zuletzt in auftragsSperre, Phase 'speichert' vor dem
 *     await (Doppelklick-Sperre im Zustand), Eingaben nach jeder Eingabe im Zustand (merkeAkteEingabe), Deep-Link lädt einmal neu;
 *     keine zusätzliche Live-Region in Formular und Coach-Knopf (genau eine im Dokument: die Persona);
 * (h) echter Fall F45 (Prüfpass qa AT-3): auf einer Kopie von features/F45/feature.md im Speicher ersetzt eine Änderung mit
 *     unverändertem Ziel das Ziel nicht; Gegenprobe: ein anderes Ziel wird ersetzt.
 *
 * Wichtig: Die statischen Prüfungen (a)(b6)(g) lesen Quelltext ohne Kommentare und erkennen nur die gebaute Aufrufform — eine
 * gleichwertige andere Schreibweise fiele als Befund auf (dann Gate und Code gemeinsam anpassen). (h) liest die echte Akte nur.
 *
 * Wird aufgerufen von: `npm run check:gates` (und damit `npm run check`).
 *
 * Aufruf: node scripts/check-f45-b5a2-akte-anzeige.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { readFileSync } from 'node:fs'
import { bearbeiteFeatureAkte, pruefeAkteAenderung } from '../src/feature-auftrag/akte-schreiben.ts'
import { findeAbschnitt, leseAbschnitt } from '../src/feature-auftrag/index.ts'
import { akteFormularHtml, akteGespeichertHtml, baueAkteFormular, baueAkteKoerper, darfSpeichern, deuteAkteAntwort } from '../public/leitstand/akte-bearbeiten.js'
import { legeFeatureAn, speichereFeatureAkte } from '../public/leitstand/api.js'
import { zaehleWartendeAufStefan } from '../public/leitstand/attention-daten.js'
import { baueVerknuepfung, spalteVon } from '../public/leitstand/entwicklung-daten.js'
import WOERTERBUCH from '../public/leitstand/i18n/de.js'
import { leitePersonaZustandAb } from '../public/leitstand/persona-state.js'
import { detailInhaltHtml } from '../public/leitstand/views/workboard-detail.js'

const befunde = []
console.log('\n=== F45-B5a-2-Akte-anzeigen-Check ===\n')

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

/** Quelltext ohne Block- und Zeilenkommentare (grob, reicht für die Aufrufmuster). @param pfad - Datei @returns Text */
const quelle = (pfad) =>
  readFileSync(pfad, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

const HASH = 'e'.repeat(64)
const AKTE = { status: 'ok', titel: 'T', featureStatus: 'IN_ARBEIT', ziel: 'Ziel', nicht_ziele: [], akzeptanzkriterien: [{ id: 'AK1', text: 'Eins' }], hash: HASH, entscheidungen: [] }

/**
 * Ruft fn mit einer fetch-Attrappe auf und liefert die aufgezeichnete Anfrage.
 * @param fn - () => Promise
 * @returns { url, methode, koerper }
 */
async function mitFetchAttrappe(fn) {
  const original = globalThis.fetch
  let anfrage = null
  globalThis.fetch = async (url, optionen = {}) => {
    anfrage = { url: String(url), methode: optionen.method ?? 'GET', koerper: optionen.body === undefined ? undefined : JSON.parse(optionen.body) }
    return new Response('{}', { status: 200 })
  }
  try {
    await fn()
  } finally {
    globalThis.fetch = original
  }
  return anfrage
}

try {
  // ── (a) PUT mit hash und grund ─────────────────────────────────────────────
  {
    const werte = { ...baueAkteFormular(AKTE), grund: 'Weil AK2 fehlte' }
    const anfrage = await mitFetchAttrappe(() => speichereFeatureAkte('F3', baueAkteKoerper(werte, HASH)))
    pruefe(
      anfrage?.methode === 'PUT' && anfrage.url === '/api/features/F3/akte' && anfrage.koerper?.hash === HASH && anfrage.koerper?.grund === 'Weil AK2 fehlte',
      '(a) Speichern ⇒ PUT /api/features/F3/akte mit gelesenem hash und grund.',
      `(a) Anfrage ${JSON.stringify(anfrage)}`
    )
    pruefe(!darfSpeichern({ ...werte, grund: '  ' }, 'offen') && darfSpeichern(werte, 'offen'), '(a) Gegenprobe: ohne Grund ist Speichern gesperrt, mit Grund frei.', '(a) Gegenprobe darfSpeichern falsch')
    const MUSTER = /speichereFeatureAkte\(\s*zustand\.featureId,\s*baueAkteKoerper\(\s*zustand\.werte,\s*zustand\.hash\s*\)\s*\)/
    const wb = quelle('public/leitstand/views/workboard.js')
    pruefe(MUSTER.test(wb) && !MUSTER.test('speichereFeatureAkte(zustand.featureId, baueAkteKoerper(zustand.werte))'), '(a) workboard.js sendet den beim Öffnen gelesenen Hash (statisch, mit Gegenprobe ohne Hash).', '(a) workboard.js ruft speichereFeatureAkte nicht mit baueAkteKoerper(zustand.werte, zustand.hash)')
  }

  // ── (b) Antwortfälle ───────────────────────────────────────────────────────
  {
    const formular = (deutung, phase) => akteFormularHtml({ featureId: 'F3', phase, werte: { ...baueAkteFormular(AKTE), grund: 'x' }, unvollstaendig: null, meldung: deutung, akteLinkHtml: '' })
    const ok = deuteAkteAntwort(200, { status: 'ok', hash: HASH, geaendert: ['Ziel'], git: ['& {', 'git add -- features/F3/feature.md', '}'] })
    const okHtml = akteGespeichertHtml({ featureId: 'F3', git: ok.git, geaendert: ok.geaendert })
    pruefe(ok.art === 'ok' && okHtml.includes('git add -- features/F3/feature.md') && okHtml.includes('data-befehl-kopieren') && okHtml.includes('Geändert: Ziel'), '(b) 200 ⇒ Git-Block mit Kopieren und geänderte Abschnitte.', `(b) 200: ${okHtml.slice(0, 300)}`)

    const b400 = deuteAkteAntwort(400, { grund: "'grund' fehlt <x>" })
    const b400Html = formular(b400, 'abgelehnt')
    pruefe(b400.art === 'abgelehnt' && /400: (&#39;|')grund(&#39;|') fehlt &lt;x&gt;/.test(b400Html) && !b400Html.includes('<x>'),'(b) 400 ⇒ Grund wörtlich, escaped.', `(b) 400: ${JSON.stringify(b400)}`)

    const hash409 = deuteAkteAntwort(409, { grund: 'geändert', hash: HASH })
    const hashHtml = formular(hash409, 'konflikt')
    pruefe(hash409.art === 'konflikt' && hashHtml.includes('data-akte-aktion="neu-laden"') && !hashHtml.includes('#/workflows/') && /data-akte-aktion="speichern" disabled/.test(hashHtml), '(b) 409 Hash ⇒ „inzwischen geändert“ mit „Neu laden“, Speichern gesperrt, kein Ablauf-Link.', `(b) 409 Hash: ${hashHtml.slice(0, 200)}`)

    const sperre409 = deuteAkteAntwort(409, { grund: 'Ablauf läuft', workflowId: 'w-7' })
    const sperreHtml = formular(sperre409, 'gesperrt')
    pruefe(sperre409.art === 'gesperrt' && sperreHtml.includes('href="#/workflows/w-7"') && sperreHtml.includes('<code>w-7</code>') && !sperreHtml.includes('neu-laden'), '(b) 409 Sperre ⇒ „gesperrt, solange Ablauf w-7 läuft“ mit Link.', `(b) 409 Sperre: ${JSON.stringify(sperre409)}`)

    const g422 = deuteAkteAntwort(422, { grund: 'Gate', verstoesse: ['Status fehlt oder unbekannt'] })
    const g422Html = formular(g422, 'abgelehnt')
    pruefe(g422.art === 'abgelehnt' && g422Html.includes('422: Gate') && g422Html.includes('<li>Status fehlt oder unbekannt</li>'), '(b) 422 ⇒ Grund und Verstöße wörtlich.', `(b) 422: ${g422Html.slice(0, 200)}`)

    pruefe(deuteAkteAntwort(409, { grund: 'ohne Form' }).art === 'fehler' && deuteAkteAntwort(200, {}).art === 'fehler', '(b) Gegenprobe: 409 ohne hash/workflowId und 200 ohne status ok sind Fehler, kein Erfolg.', '(b) Gegenprobe: Deutung zu großzügig')
  }

  // ── (b5) Warnhinweis bei unvollständiger Akte ──────────────────────────────
  {
    const mit = akteFormularHtml({ featureId: 'F45', phase: 'offen', werte: baueAkteFormular({ status: 'unvollstaendig' }), unvollstaendig: { grund: 'Ziel fehlt' }, meldung: null, akteLinkHtml: '<a class="text-link" href="vscode://file/x">Akte</a>' })
    const ohne = akteFormularHtml({ featureId: 'F3', phase: 'offen', werte: baueAkteFormular(AKTE), unvollstaendig: null, meldung: null, akteLinkHtml: '<a>Akte</a>' })
    pruefe(/data-akte-warnung[\s\S]*Speichern ersetzt diese Abschnitte[\s\S]*Ziel fehlt[\s\S]*vscode:\/\/file\/x/.test(mit) && !ohne.includes('data-akte-warnung'), '(b5) unvollständige Akte ⇒ Warnhinweis mit Grund und Akte-Link; Gegenprobe vollständig ohne.', '(b5) Warnhinweis fehlt bzw. steht auch bei vollständiger Akte')
  }

  // ── (b6) Ladezähler ────────────────────────────────────────────────────────
  {
    const wb = quelle('public/leitstand/views/workboard.js')
    pruefe(/const ladung = \+\+nachtrag\.akteLadung/.test(wb) && /nachtrag\.akteLadung !== ladung/.test(wb), '(b6) ladeAkteUndRoadmap verwirft überholte Antworten (akteLadung).', '(b6) Ladezähler akteLadung fehlt in workboard.js')
  }

  // ── (c) Kachel „Entscheidungen“ ────────────────────────────────────────────
  {
    const feature = { quelle: 'feature', typ: 'FEATURE', id: 'F3', titel: 'T', status: 'IN_ARBEIT', pfad: 'features/F3/feature.md' }
    const sicht = (akte) => ({ workitem: feature, workflow: null, verknuepfung: 'ok', schritte: undefined, abnahme: undefined, akte, roadmap: undefined, workitems: [], ctw: 'frei', repoPfad: null, kreisAuswahl: null, wasReiter: null })
    const kachel = (html) => html.slice(html.indexOf('eintrag-kachel-entscheidungen'), html.indexOf('Befunde aus diesem Feature'))
    const voll = kachel(detailInhaltHtml(sicht({ ...AKTE, entscheidungen: [{ id: 'E-F3-1', text: '**E-F3-1 = A** (Stefan) — gilt.' }] })))
    const leer = kachel(detailInhaltHtml(sicht(AKTE)))
    pruefe(voll.includes('<code>E-F3-1</code>') && !voll.includes('kommt-badge') && leer.includes(WOERTERBUCH['eintrag.verlauf.entscheidungenLeer']) && !leer.includes('kommt-badge'), '(c) Kachel zeigt die Entscheidungen der Akte; leer ⇒ ruhiger Satz, nie „kommt“.', `(c) Kachel: ${voll.slice(0, 200)} | ${leer.slice(0, 200)}`)
    pruefe(!Object.hasOwn(WOERTERBUCH, 'eintrag.verlauf.entscheidungenKommt'), '(c) Gegenprobe: der „kommt“-Satz der Kachel ist aus dem Wörterbuch entfernt.', '(c) eintrag.verlauf.entscheidungenKommt steht noch im Wörterbuch')
  }

  // ── (d) Als Feature anlegen ────────────────────────────────────────────────
  {
    const SCOPE = { titel: 'Neu', problem: 'p', ziel: 'z', in_scope: [], out_of_scope: [], annahmen: [], offene_fragen: [], erfolgskriterium: 'e' }
    const anfrage = await mitFetchAttrappe(() => legeFeatureAn(SCOPE))
    pruefe(anfrage?.methode === 'POST' && anfrage.url === '/api/features' && JSON.stringify(anfrage.koerper) === JSON.stringify({ scope: SCOPE }), '(d) „Als Feature anlegen“ ⇒ POST /api/features { scope }.', `(d) Anfrage ${JSON.stringify(anfrage)}`)
    const chat = quelle('public/leitstand/views/chat.js')
    const importiert = /import\s*\{[^}]*\blegeFeatureAn\b[^}]*\}\s*from\s*'\.\.\/api\.js'/.test(chat)
    const ruft = /legeFeatureAn\(\s*scope\s*\)/.test(chat) && /eintrag\.antwort\.scope/.test(chat)
    pruefe(importiert && ruft, '(d) chat.js importiert legeFeatureAn aus api.js und sendet den Scope des Eintrags.', `(d) chat.js: Import ${importiert}, Aufruf ${ruft}`)
    pruefe(/await legeAuftragAn\(\{ titel, auftragstext/.test(chat), '(d) Gegenprobe: der Auftragsweg ruft unverändert legeAuftragAn.', '(d) Auftragsweg (legeAuftragAn) verändert oder entfernt')
  }

  // ── (e) Offene Abnahme überall gezählt (F-991) ─────────────────────────────
  {
    const LEER = { fehler: [], startfehler: [], laeufe: [], workflows: [], aktiverLauf: { aktiv: false, laufId: null } }
    const wf = (offen) => ({ workflowId: 'w1', auftragId: 'a1', status: 'ABGESCHLOSSEN', naechster: { art: 'fertig' }, abnahme: { offen, status: offen ? 'nicht_vorhanden' : 'ok' } })
    const v = (offen) => baueVerknuepfung([wf(offen)], [{ auftragId: 'a1', feature_ref: 'F3' }])
    const feature = { quelle: 'feature', id: 'F3', status: 'IN_ARBEIT' }
    pruefe(
      leitePersonaZustandAb({ ...LEER, workflows: [wf(true)] }) === 'waiting_for_human' && zaehleWartendeAufStefan({ workflows: [wf(true)] }) === 1 && spalteVon(feature, v(true)) === 'braucht_dich',
      '(e) eine offene Abnahme ⇒ Persona „wartet auf dich“, Zähler 1, Spalte „Braucht dich“.',
      `(e) Persona ${leitePersonaZustandAb({ ...LEER, workflows: [wf(true)] })}, Zähler ${zaehleWartendeAufStefan({ workflows: [wf(true)] })}, Spalte ${spalteVon(feature, v(true))}`
    )
    pruefe(
      leitePersonaZustandAb({ ...LEER, workflows: [wf(false)] }) === 'idle' && zaehleWartendeAufStefan({ workflows: [wf(false)] }) === 0 && spalteVon(feature, v(false)) === 'in_arbeit',
      '(e) Gegenprobe: entschiedene Abnahme (offen false) zählt nicht.',
      '(e) Gegenprobe: entschiedene Abnahme wird gezählt'
    )
    const nutzt = (pfad, rel) => new RegExp(`import\\s*\\{[^}]*\\bzaehleWartendeAufStefan\\b[^}]*\\}\\s*from\\s*'${rel}attention-daten\\.js'`).test(quelle(pfad)) && /zaehleWartendeAufStefan\(zustand\)/.test(quelle(pfad))
    pruefe(nutzt('public/leitstand/views/start.js', '\\.\\./') && nutzt('public/leitstand/persona-state.js', '\\.\\/'), '(e) Startfläche und Persona zählen über zaehleWartendeAufStefan (attention-daten.js).', '(e) start.js oder persona-state.js zählt nicht über zaehleWartendeAufStefan')
  }

  // ── (f) reine Module ───────────────────────────────────────────────────────
  {
    const VERSTOSS = /\bfetch\s*\(|\bdocument\s*\.|\bwindow\s*\./
    const kal = VERSTOSS.test("document.getElementById('x')") && VERSTOSS.test("fetch('/api')") && !VERSTOSS.test('export const x = 1')
    const sauber = ['public/leitstand/akte-bearbeiten.js', 'public/leitstand/views/workboard-detail.js'].every((p) => !VERSTOSS.test(quelle(p)))
    pruefe(kal && sauber, '(f) akte-bearbeiten.js und workboard-detail.js ohne fetch, document, window (Rot-Kalibrierung grün).', `(f) Kalibrierung ${kal}, sauber ${sauber}`)
  }
  // ── (g) Verdrahtung ────────────────────────────────────────────────────────
  {
    const wb = quelle('public/leitstand/views/workboard.js')
    const sperre = /return \{ grund: 'abnahme', workflowId: massgeblich\.workflowId \}\s*if \(akteFormularOffen\(workitem\)\) return \{ grund: 'akte', workflowId: null \}/
    pruefe(sperre.test(wb) && !sperre.test("if (akteFormularOffen(workitem)) return { grund: 'akte', workflowId: null }"), '(g) „Auftrag vorbereiten“ ist bei offenem Formular gesperrt — Grund akte zuletzt, hinter abnahme.', '(g) Sperre akte fehlt oder steht vor den stärkeren Gründen')
    const phase = /zustand\.phase = 'speichert'[\s\S]{0,200}await speichereFeatureAkte\(/
    pruefe(phase.test(wb) && !phase.test('await speichereFeatureAkte(x)'), "(g) Doppelklick-Sperre im Zustand: Phase 'speichert' vor dem await.", "(g) Phase 'speichert' wird nicht vor dem PUT gesetzt")
    const eingabe = /addEventListener\('input'[\s\S]{0,200}merkeAkteEingabe\(\)/
    pruefe(eingabe.test(wb) && /letztesAkteFormularHtml = akteFormularInhalt\(workitem\)/.test(wb) && !eingabe.test("addEventListener('input', () => {})"), '(g) jede Eingabe geht in den Zustand (merkeAkteEingabe) — ein Neuschreiben verliert nichts.', '(g) Eingaben werden nicht nach jeder Eingabe übernommen')
    const deepLink = /if \(Array\.isArray\(alleWorkitems\) && findeWorkitem\(id\) === null\) void ladeAlleWorkitems\(\)/
    pruefe(deepLink.test(wb) && !deepLink.test('void ladeAlleWorkitems()'), '(g) Deep-Link auf eine unbekannte ID lädt die Workitems einmal neu.', '(g) Neuladen beim Deep-Link fehlt')
    const LIVE = /aria-live|role="(status|alert|log)"/
    const chat = readFileSync('public/leitstand/views/chat.js', 'utf8')
    const anlage = chat.slice(chat.indexOf('function renderFeatureAnlage'), chat.indexOf('async function legeFeatureAusEintragAn'))
    pruefe(
      !LIVE.test(readFileSync('public/leitstand/akte-bearbeiten.js', 'utf8')) && anlage.length > 0 && !LIVE.test(anlage) && LIVE.test('<p role="status">'),
      '(g) keine zusätzliche Live-Region in Formular und Coach-Knopf (Kalibrierung grün).',
      '(g) zusätzliche Live-Region in akte-bearbeiten.js oder renderFeatureAnlage'
    )
  }

  // ── (h) echter Fall F45 ────────────────────────────────────────────────────
  {
    // Kopie im Speicher mit festem Status IN_ARBEIT (Nachpass cr N1): sonst würde das Gate rot, sobald F45 abgeschlossen ist —
    // geprüft wird die Struktur der echten Akte (Ziel ohne Nicht-Ziele/AK), nicht ihr Status.
    const f45 = readFileSync('features/F45/feature.md', 'utf8').replace(/^Status: [A-Z_]+[ \t]*$/m, 'Status: IN_ARBEIT')
    const ziel = leseAbschnitt(f45, 'Ziel', true)
    if (ziel === null) {
      console.log('  ✓ (h) F45 ohne Abschnitt „## Ziel“ — Fall entfällt.')
    } else {
      const aenderung = (z) => pruefeAkteAenderung({ ziel: z, nicht_ziele: [], akzeptanzkriterien: [{ id: 'AK1', text: 'Gate-Probe.' }], grund: 'Gate', hash: '0'.repeat(64) })
      const bearbeite = (pruefung) => (pruefung.ok ? bearbeiteFeatureAkte(f45, 'F45', pruefung.aenderung, '2026-10-24') : pruefung)
      const e1 = bearbeite(aenderung(ziel))
      const e2 = bearbeite(aenderung('Anderes Ziel.'))
      const zielSpanne = (text) => {
        const s = findeAbschnitt(text, 'Ziel', true)
        return s === null ? null : text.slice(s.kopfStart, s.koerperEnde)
      }
      pruefe(
        e1.ok && !e1.geaendert.includes('Ziel') && zielSpanne(e1.inhalt) === zielSpanne(f45) && e2.ok && e2.geaendert.includes('Ziel'),
        '(h) F45-Kopie: unverändertes Ziel bleibt bytegleich, nur AK/Nicht-Ziele kommen hinzu; Gegenprobe: anderes Ziel wird ersetzt.',
        `(h) F45: ${JSON.stringify({ e1: e1.ok ? e1.geaendert : e1, e2: e2.ok ? e2.geaendert : e2 })}`
      )
    }
  }
} catch (fehler) {
  befunde.push(`Gate-Ausführung gescheitert: ${fehler.stack ?? fehler}`)
}

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e):`)
  for (const b of befunde) console.error(`  - ${b}`)
  process.exit(1)
}
console.log('\n✓ Keine Befunde.')
