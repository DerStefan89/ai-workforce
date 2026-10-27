#!/usr/bin/env node
/**
 * Datei: scripts/check-f45-fb2-faehigkeit-anzeige.mjs
 *
 * Zweck: Gate für F45 FB-2 „Fähigkeit bauen — Anzeige“ (features/F45/plan-fb2.md, plan-fb2-v2.md, Advisor advisor-fb2.md; F-1069,
 * F-1096, F-1167, F-1169). Attrappen entstehen zur Laufzeit, nichts eingecheckt. Quelltextprüfungen laufen auf normalisiertem Text
 * (ohne Leerraum, " als ') — eine andere Formatierung kippt das Gate nicht.
 * (a) Karte nur mit Feld: ohne faehigkeitVorschlaege und faehigkeitUngesichert ''; mit Vorschlag Typ, Name, Ziel, Beschreibung,
 *     Hash-Präfix, Grund.
 * (b) „Übernehmen“ nur, wenn erlaubt: je Bedingung (Grund, Ziel existiert/unbekannt, Ziel ignoriert/unbekannt, nicht adressierbar,
 *     Abnahme-Lage E-FB1-3, eigener Lauf) kein Knopf; erlaubt bei offener, veralteter oder ANGENOMMEN-Abnahme. Verwerfen zweistufig.
 * (c) XSS-Rotfall: <img onerror> bzw. "><script> in Name, Beschreibung, Grund, Pfad und Kennung erscheinen nur escaped.
 * (d) Hinweis „ungesichert“ dauerhaft: in jeder Lage (entscheidbar, vorab, offen/LAEUFT, entschieden), auch ohne Vorschläge; „nicht
 *     bestimmbar“ sichtbar; echte Projektion (tmp-Repo): ungetrackte .claude-Datei ⇒ Feld mit Pfad, gesichert ⇒ Feld fehlt, sauber ⇒ {}.
 * (n) Ausweg je Lage (F-1173 N1, Nachtrag 23.10.2026): Freigabe-Seite mit ungesichertem .claude-Stand ⇒ Hinweis „von Hand
 *     committen“ ohne „Bereit zum Sichern“; Abnahme eines ABGESCHLOSSENEN Ablaufs ⇒ mit, Abnahme vorab/offen ⇒ ohne; in de/en/tr/ru
 *     nennt nur der Abnahme-Text den Knopf (arbeitsordner.sichernAbschnitt.badge).
 * (e) Klickweg: .wf-faehigkeit-vorschlag an den drei Abnahme-Containern; fuehreVorschlagAktionAus ohne await, POST nur über
 *     sendeAbnahmeBedienung (Doppelklick-Sperre laufendeAbnahme), Fehlerfokus; sendeFaehigkeitVorschlag mit mitPraefix und
 *     kodierter Kennung; Kennzeichen enthält faehigkeitVorschlagKennung und die Verwerfen-Stufe.
 * (f) Cache je Wurzel (cr1): gleiche Signatur ⇒ ein Aufruf; Datei geändert ⇒ neu; vergissVorschlagStand ⇒ neu.
 * (g) i18n: jeder Schlüssel abnahme.faehigkeiten.* in de/en/tr/ru, ohne interne Kennung (F-<Zahl>, E-FB1, FB-, cr1, B13, q1);
 *     Umfangs-Hinweis nennt Vorschlagsdateien nur als Satz; VORSCHLAG_PRAEFIX = VORSCHLAG_ORDNER + '/'.
 * (h) Server (Zeilen-Ratsche und starteWorkflowSchritt( seit F45 W2b-1 nur in check-wachstumsbremse-server bzw. check-f15-workflow): die Abnahme
 *     mischt baueVorschlagFelder ein (keine eigene Projektion im Server), keine neue Route (/faehigkeit-vorschlag/ nur über
 *     erkenneVorschlagRoute).
 * (r) F-1096: die Plan-Karte der Freigabe zeigt die Zusammenfassung des Architekten (mit Form-Empfehlung) escaped.
 * Gegenproben im Gate: je Teil verfälschte Module, Texte oder Quelltexte — jede muss erkannt werden.
 *
 * Korrekturrunde (code-reviewer, qa, design-guardian): (a) kein Hauptknopf auf „entscheidbar“; (d) Hinweis auch auf der
 * Freigabe-Seite, eine Regex ohne Alternative; (e) Doppelklick-Schutz der Stufe, kein Kennzeichen-Reset; (g) Ordner-Eintrag
 * `vorschlaege/` im Umfang.
 *
 * Wird aufgerufen von: `npm run check:gates` (und damit `npm run check`).
 *
 * Wichtig: Läuft ohne Browser und ohne Server (Render-Funktionen, Quelltext, ein tmp-Repo für (d)); den echten Klickweg belegt der
 * Render-Nachweis features/F45/nachweise/fb2/. Die git-Konfiguration des Entwicklers ist ausgeblendet (leere globale Datei).
 *
 * Aufruf: node scripts/check-f45-fb2-faehigkeit-anzeige.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const WURZEL = join(import.meta.dirname, '..')
const lies = (pfad) => readFileSync(join(WURZEL, pfad), 'utf8')
const anzeige = await import('../public/leitstand/faehigkeit-vorschlag-anzeige.js')
const { renderAbnahme, renderUmfangHinweis } = await import('../public/leitstand/views/workflow-abnahme.js')
const { renderFreigabeSeite } = await import('../public/leitstand/views/workflow-entscheiden.js')
const modul = await import('./leitstand/routen-faehigkeit-vorschlag.mjs')
const { VORSCHLAG_ORDNER } = await import('../src/faehigkeiten/vorschlag.ts')
const sprachen = {
  de: (await import('../public/leitstand/i18n/de.js')).default,
  en: (await import('../public/leitstand/i18n/en.js')).default,
  tr: (await import('../public/leitstand/i18n/tr.js')).default,
  ru: (await import('../public/leitstand/i18n/ru.js')).default,
}

const befunde = []

/**
 * Hält ein Ergebnis fest: ohne Befund ✓-Zeile, sonst Befund.
 * @param b - Befunde des Teils
 * @param gruen - Meldung im Grünfall
 * @param teil - Kennung des Teils
 */
function pruefe(b, gruen, teil) {
  if (b.length === 0) console.log(`✓ ${gruen}`)
  else befunde.push(`${teil} ${b.join(' | ')}`)
}

/**
 * Gegenprobe: die verfälschte Eingabe muss mindestens einen Befund liefern.
 * @param teil - Kennung
 * @param faelle - [[Name, Befunde]]
 */
function gegenprobe(teil, faelle) {
  const still = faelle.filter(([, b]) => b.length === 0).map(([name]) => name)
  pruefe(
    still.map((n) => `Gegenprobe „${n}“ nicht erkannt`),
    `${teil} Gegenproben erkannt: ${faelle.map(([n]) => n).join(', ')}.`,
    `${teil}-rot`
  )
}

/** Normalisiert Quelltext: ohne Leerraum, " als '. @param text - Quelltext @returns Text */
const norm = (text) => text.replace(/\s+/g, '').replaceAll('"', "'")

/**
 * Rumpf der ersten Funktion ab start (normalisierter Text): vom ersten „{“ bis zur passenden „}“.
 * @param text - normalisierter Text @param start - Index
 * @returns Rumpf oder ''
 */
function rumpf(text, start) {
  if (start < 0) return ''
  const auf = text.indexOf('{', start)
  if (auf === -1) return ''
  let tiefe = 0
  for (let i = auf; i < text.length; i++) {
    if (text[i] === '{') tiefe++
    else if (text[i] === '}' && --tiefe === 0) return text.slice(auf, i + 1)
  }
  return ''
}

const H = '0123456789abcdef'.repeat(4)
const AENDERUNG = { status: 'ok', laufId: 'l-bau', daten: { basis_ref: 'abc', gekuerzt: false, dateien: [] } }
/** Vorschlag. @param f - Überschreibungen @returns Vorschlag */
const vorschlag = (f = {}) => ({ typ: 'agent', name: 'leser', pfad: `${VORSCHLAG_ORDNER}/agents/leser.md`, beschreibung: 'Liest.', hash: H, grund: null, ziel: '.claude/agents/leser.md', ziel_existiert: false, ziel_ignoriert: false, adressierbar: true, ...f })
/** Abnahme (Lage entscheidbar). @param f - Überschreibungen @returns Projektion */
const abnahme = (f = {}) => ({ workflowStatus: 'ABGESCHLOSSEN', freigabeHalt: null, entscheidung: { status: 'nicht_vorhanden' }, urteil: { status: 'noch_nicht_gelaufen' }, aenderungsuebersicht: AENDERUNG, pruefergebnis: { status: 'noch_nicht_gelaufen' }, faehigkeitVorschlaege: [vorschlag()], ...f })
const aktionen = (html) => [...html.matchAll(/data-aktion="([^"]+)"/g)].map((m) => m[1])

// ─── (a) Karte nur mit Feld ───────────────────────────────────────────────────────────────────────────────────────────

/** @param render - renderFaehigkeitVorschlaege @returns Befunde */
function pruefeA(render) {
  const b = []
  if (render('wf', abnahme({ faehigkeitVorschlaege: undefined })) !== '') b.push('Karte ohne Feld')
  const html = render('wf', abnahme({ faehigkeitVorschlaege: [vorschlag({ grund: 'Frontmatter: tools ungültig' })] }), { ebene: 2 })
  for (const [name, muster] of [
    ['Titel', /<h2 id="abnahme-faehigkeiten-titel">Vorgeschlagene Fähigkeiten<\/h2>/],
    ['Typ', /<span class="ablauf-marke">Agent<\/span>/],
    ['Name', /<code>leser<\/code>/],
    ['Ziel', /<code>\.claude\/agents\/leser\.md<\/code>/],
    ['Beschreibung', /<p>Liest\.<\/p>/],
    ['Hash-Präfix', /<code>0123456789ab<\/code>/],
    ['Grund', /Ungültig<\/span> Frontmatter: tools ungültig/],
  ])
    if (!muster.test(html)) b.push(`${name} fehlt`)
  // design-guardian 1: auf der Seite „entscheidbar“ ist „Übernehmen“ kein Hauptknopf.
  if (/button primary/.test(render('wf', abnahme(), { ebene: 2 }))) b.push('Übernehmen als Hauptknopf auf „entscheidbar“')
  return b
}
pruefe(pruefeA(anzeige.renderFaehigkeitVorschlaege), '(a) Karte nur mit Feld; Typ, Name, Ziel, Beschreibung, Hash-Präfix und Grund sichtbar; kein Hauptknopf auf „entscheidbar“.', '(a)')

// ─── (b) Übernehmen nur, wenn erlaubt ─────────────────────────────────────────────────────────────────────────────────

const B_FAELLE = [
  ['Grund', { grund: 'x' }, {}, false],
  ['Ziel existiert', { ziel_existiert: true }, {}, false],
  ['Ziel unbekannt', { ziel_existiert: null }, {}, false],
  ['Ziel ignoriert', { ziel_ignoriert: true }, {}, false],
  ['ignoriert unbekannt', { ziel_ignoriert: null }, {}, false],
  ['nicht adressierbar', { adressierbar: false }, {}, false],
  ['KLAERUNG', {}, { workflowStatus: 'KLAERUNG_ERFORDERLICH' }, false],
  ['vor dem Bau', {}, { aenderungsuebersicht: { status: 'noch_nicht_gelaufen' } }, false],
  ['ABGELEHNT', {}, { entscheidung: { status: 'ok', ergebnis: 'ABGELEHNT' } }, false],
  ['eigener Lauf', {}, { workflowStatus: 'LAEUFT' }, false],
  ['offen', {}, {}, true],
  ['veraltet', {}, { entscheidung: { status: 'veraltet', ergebnis: 'ABGELEHNT' } }, true],
  ['ANGENOMMEN', {}, { entscheidung: { status: 'ok', ergebnis: 'ANGENOMMEN' } }, true],
]

/** @param render - renderFaehigkeitVorschlaege @param schluessel - vorschlagSchluessel @returns Befunde */
function pruefeB(render, schluessel) {
  const b = []
  for (const [name, v, a, erwartet] of B_FAELLE) {
    const html = render('wf', abnahme({ ...a, faehigkeitVorschlaege: [vorschlag(v)] }))
    if (aktionen(html).includes('uebernehmen') !== erwartet) b.push(`${name}: Übernehmen ${erwartet ? 'fehlt' : 'angeboten'}`)
  }
  const stufe = aktionen(render('wf', abnahme(), { verwerfenOffen: schluessel('wf', vorschlag()) }))
  if (stufe.join(',') !== 'verwerfen-bestaetigt,abbrechen') b.push(`Verwerfen nicht zweistufig: ${stufe}`)
  if (aktionen(render('wf', abnahme())).join(',') !== 'uebernehmen,verwerfen') b.push('erste Stufe falsch')
  return b
}
pruefe(pruefeB(anzeige.renderFaehigkeitVorschlaege, anzeige.vorschlagSchluessel), `(b) Übernehmen nur, wenn erlaubt (${B_FAELLE.length} Fälle); Verwerfen zweistufig.`, '(b)')

// ─── (c) XSS ──────────────────────────────────────────────────────────────────────────────────────────────────────────

const BOESE = '"><img src=x onerror=alert(1)><script>x</script>'
/** @param render - renderFaehigkeitVorschlaege @returns Befunde */
function pruefeC(render) {
  const html = render(BOESE, abnahme({ faehigkeitVorschlaege: [vorschlag({ name: BOESE, beschreibung: BOESE, grund: BOESE }), vorschlag({ typ: null, name: null, hash: null, adressierbar: false, pfad: BOESE, grund: BOESE })], faehigkeitUngesichert: { status: 'ok', pfade: [BOESE], anzahl: 1 } }))
  const b = /<img|<script/.test(html) ? ['Serverwert unescaped'] : []
  if (!html.includes('data-workflow-id="&quot;&gt;&lt;img')) b.push('Kennung im Attribut unescaped')
  return b
}
pruefe(pruefeC(anzeige.renderFaehigkeitVorschlaege), '(c) Name, Beschreibung, Grund, Pfad und Kennung erscheinen nur escaped (XSS-Rotfall).', '(c)')

// ─── (d) Hinweis „ungesichert“ dauerhaft ──────────────────────────────────────────────────────────────────────────────

const LAGEN = [
  ['entscheidbar', {}, 'oben'],
  ['vorab', { workflowStatus: 'KLAERUNG_ERFORDERLICH' }, 'unten'],
  ['offen', { workflowStatus: 'LAEUFT' }, 'unten'],
  ['entschieden', { entscheidung: { status: 'ok', ergebnis: 'ANGENOMMEN', begruendung: 'b', entschiedenAm: '2026-10-23T10:00:00Z' } }, 'unten'],
]
/** Hinweis mit Titel, Pfad und Satz (code-reviewer 3: eine Regex ohne Alternative). */
const HINWEIS = /Ungesicherte Änderungen unter \.claude\/[\s\S]*Vor einem weiteren Lauf in diesem Ablauf sichern[\s\S]*<code>\.claude\/skills\/neu\/SKILL\.md<\/code>/
const UNGESICHERT = { status: 'ok', pfade: ['.claude/skills/neu/SKILL.md'], anzahl: 1 }
const FREIGABE_DETAIL = { daten: { status: 'WARTET_FREIGABE', ziel: 'z', schritte: [] }, naechster: { art: 'haltFreigabe', schrittId: 's', grund: 'g' }, empfehlung: null }
/** @param renderA - renderAbnahme @param renderF - renderFreigabeSeite @returns Befunde */
function pruefeD(renderA, renderF) {
  const b = []
  for (const [lage, f, ort] of LAGEN) {
    for (const ohne of [false, true]) {
      const r = renderA('wf', abnahme({ ...f, faehigkeitUngesichert: UNGESICHERT, ...(ohne ? { faehigkeitVorschlaege: undefined } : {}) }))
      if (r.lage !== lage || !HINWEIS.test(r[ort])) b.push(`${lage}${ohne ? ' ohne Vorschläge' : ''}: Hinweis fehlt`)
    }
  }
  if (!/Stand von \.claude\/ nicht bestimmbar/.test(renderA('wf', abnahme({ faehigkeitVorschlaege: undefined, faehigkeitUngesichert: { status: 'nicht_bestimmbar', grund: 'x' } })).oben)) b.push('nicht bestimmbar unsichtbar')
  // qa 1: auf der Freigabe-Seite (nächster Lauf) — dort ist der Weg mit der Karte zugeklappt.
  if (!HINWEIS.test(renderF({ ...FREIGABE_DETAIL, faehigkeitUngesichert: UNGESICHERT }))) b.push('Freigabe-Seite ohne Hinweis')
  return b
}
pruefe(pruefeD(renderAbnahme, renderFreigabeSeite), '(d) Hinweis „ungesichert“ in jeder Lage der Abnahme und auf der Freigabe-Seite, auch ohne Vorschläge; „nicht bestimmbar“ sichtbar.', '(d)')

// ─── (n) Ausweg je Lage (F-1173 N1) ───────────────────────────────────────────────────────────────────────────────────

const BADGE = 'arbeitsordner.sichernAbschnitt.badge'
/** Die Notiz „ungesichert“ aus einem HTML-Teil, oder ''. @param html - HTML @returns Notiz */
const notiz = (html) => /<div class="note amber abnahme-faehigkeit-ungesichert"[\s\S]*?<\/div>/.exec(html)?.[0] ?? ''
/**
 * @param renderA - renderAbnahme @param renderF - renderFreigabeSeite @param woerter - { de, en, tr, ru }
 * @returns Befunde
 */
function pruefeN(renderA, renderF, woerter) {
  const b = []
  /** @param html - Notiz @param mit - „Bereit zum Sichern“ erwartet? @param wo - Ort */
  const ausweg = (html, mit, wo) => {
    if (html === '') b.push(`${wo}: Hinweis fehlt`)
    else if (html.includes('Bereit zum Sichern') !== mit) b.push(`${wo}: „Bereit zum Sichern“ ${mit ? 'fehlt' : 'genannt'}`)
    else if (!mit && !html.includes('von Hand committen')) b.push(`${wo}: Weg „von Hand committen“ fehlt`)
  }
  ausweg(notiz(renderF({ ...FREIGABE_DETAIL, faehigkeitUngesichert: UNGESICHERT })), false, 'Freigabe-Seite')
  for (const [lage, f, ort] of LAGEN) {
    const r = renderA('wf', abnahme({ ...f, faehigkeitUngesichert: UNGESICHERT }))
    ausweg(notiz(r[ort]), (f.workflowStatus ?? 'ABGESCHLOSSEN') === 'ABGESCHLOSSEN', `Abnahme ${lage}`)
  }
  for (const [sprache, w] of Object.entries(woerter)) {
    const hand = w['abnahme.faehigkeiten.ungesichert.textHand']
    if (typeof hand !== 'string' || hand.includes(w[BADGE])) b.push(`${sprache}: Text „von Hand“ fehlt oder nennt „${w[BADGE]}“`)
    if (!String(w['abnahme.faehigkeiten.ungesichert.text']).includes(w[BADGE])) b.push(`${sprache}: Abnahme-Text ohne „${w[BADGE]}“`)
  }
  return b
}
pruefe(pruefeN(renderAbnahme, renderFreigabeSeite, sprachen), '(n) Ausweg je Lage: Freigabe-Seite und nicht abgeschlossene Abnahme „von Hand committen“ ohne „Bereit zum Sichern“, abgeschlossene Abnahme mit; de/en/tr/ru.', '(n)')
gegenprobe('(n)', [
  ['Freigabe mit „Bereit zum Sichern“', pruefeN(renderAbnahme, (d) => anzeige.renderUngesichertHinweis(d.faehigkeitUngesichert, { sichernMoeglich: true }), sprachen)],
  ['Abnahme immer von Hand', pruefeN((id, a) => { const r = renderAbnahme(id, a); return { ...r, oben: anzeige.renderUngesichertHinweis(a.faehigkeitUngesichert), unten: anzeige.renderUngesichertHinweis(a.faehigkeitUngesichert) } }, renderFreigabeSeite, sprachen)],
  ['en-Text von Hand nennt den Knopf', pruefeN(renderAbnahme, renderFreigabeSeite, { ...sprachen, en: { ...sprachen.en, 'abnahme.faehigkeiten.ungesichert.textHand': sprachen.en['abnahme.faehigkeiten.ungesichert.text'] } })],
])

const ordner = []
/** Neues tmp-Verzeichnis. @param name - Präfix @returns Pfad */
function tmp(name) {
  const p = mkdtempSync(join(tmpdir(), `fb2-${name}-`))
  ordner.push(p)
  return p
}
const gitKonfig = tmp('gitcfg')
writeFileSync(join(gitKonfig, 'leer'), '')
process.env.GIT_CONFIG_GLOBAL = join(gitKonfig, 'leer')
process.env.GIT_CONFIG_NOSYSTEM = '1'
process.env.HOME = gitKonfig
process.env.XDG_CONFIG_HOME = gitKonfig
const git = (cwd, argumente) => execFileSync('git', ['-c', 'user.email=t@example.invalid', '-c', 'user.name=T', '-c', 'core.autocrlf=false', ...argumente], { cwd, encoding: 'utf8' })

try {
  const w = tmp('repo')
  git(w, ['init', '--quiet'])
  writeFileSync(join(w, 'README.md'), 'x\n')
  git(w, ['add', 'README.md'])
  git(w, ['commit', '--quiet', '-m', 'basis'])
  const frisch = () => modul.baueVorschlagFelder(w, { cache: new Map() })
  const sauber = await frisch()
  mkdirSync(join(w, '.claude', 'skills', 'neu'), { recursive: true })
  writeFileSync(join(w, '.claude', 'skills', 'neu', 'SKILL.md'), '---\nname: neu\ndescription: Neu.\n---\n')
  const ungesichert = await frisch()
  git(w, ['add', '--', '.claude'])
  git(w, ['commit', '--quiet', '-m', 'gesichert'])
  const gesichert = await frisch()
  const d = []
  if (JSON.stringify(sauber) !== '{}') d.push(`sauber: ${JSON.stringify(sauber)}`)
  if (JSON.stringify(ungesichert) !== JSON.stringify({ faehigkeitUngesichert: { status: 'ok', pfade: ['.claude/skills/neu/SKILL.md'], anzahl: 1 } })) d.push(`ungesichert: ${JSON.stringify(ungesichert)}`)
  if (JSON.stringify(gesichert) !== '{}') d.push(`gesichert: ${JSON.stringify(gesichert)}`)
  pruefe(d, '(d) echte Projektion: sauber ⇒ {}, ungetrackte .claude-Datei ⇒ Feld mit Pfad, gesichert ⇒ Feld fehlt (bitgleich).', '(d-git)')

  // ─── (f) Cache je Wurzel ──────────────────────────────────────────────────────────────────────────────────────────────
  /** @param felder - baueVorschlagFelder @param vergiss - vergissVorschlagStand @returns Befunde */
  const pruefeF = async (felder, vergiss) => {
    const z = tmp('cache')
    mkdirSync(join(z, ...VORSCHLAG_ORDNER.split('/'), 'agents'), { recursive: true })
    writeFileSync(join(z, ...VORSCHLAG_ORDNER.split('/'), 'agents', 'a.md'), 'x')
    const cache = new Map()
    let aufrufe = 0
    const optionen = {
      cache,
      projektion: async () => {
        aufrufe++
        return []
      },
      ungesichert: async () => null,
    }
    const b = []
    await felder(z, optionen)
    await felder(z, optionen)
    if (aufrufe !== 1) b.push(`gleiche Signatur ⇒ ${aufrufe} Aufrufe`)
    writeFileSync(join(z, ...VORSCHLAG_ORDNER.split('/'), 'agents', 'a.md'), 'xyz')
    await felder(z, optionen)
    if (aufrufe !== 2) b.push('Änderung nicht erkannt')
    vergiss(z, cache)
    await felder(z, optionen)
    if (aufrufe !== 3) b.push('vergiss wirkungslos')
    return b
  }
  pruefe(await pruefeF(modul.baueVorschlagFelder, modul.vergissVorschlagStand), '(f) Cache je Wurzel: gleiche Signatur ⇒ ein Aufruf; Änderung ⇒ neu; nach einer Aktion ⇒ neu.', '(f)')
  gegenprobe('(f)', [
    ['ohne Cache', await pruefeF((w2, o) => modul.baueVorschlagFelder(w2, { ...o, cache: new Map() }), modul.vergissVorschlagStand)],
    ['vergiss ohne Wirkung', await pruefeF(modul.baueVorschlagFelder, () => {})],
  ])
} finally {
  for (const o of ordner) raeumeVerzeichnis(o)
}

// ─── (e) Klickweg ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** @param workflows - Quelltext workflows.js @param api - Quelltext api.js @returns Befunde */
function pruefeE(workflows, api) {
  const b = []
  const w = norm(workflows)
  const f = rumpf(w, w.indexOf('functionfuehreVorschlagAktionAus('))
  if (f === '') b.push('fuehreVorschlagAktionAus fehlt')
  if (/await/.test(f)) b.push('await in fuehreVorschlagAktionAus (Sperre käme zu spät)')
  if (!f.includes('sendeAbnahmeBedienung(workflowId,()=>sendeFaehigkeitVorschlag(')) b.push('POST nicht über sendeAbnahmeBedienung')
  if (!f.includes('if(laufendeAbnahme!==null')) b.push('keine Wache laufendeAbnahme')
  const schleife = w.indexOf("for(constidof['workflow-abnahme','workflow-abnahme-stand','workflow-entscheidung'])")
  if (schleife < 0 || !rumpf(w, schleife).includes("closest('.wf-faehigkeit-vorschlag')")) b.push('Delegation fehlt an den Abnahme-Containern')
  if (!/faehigkeitVorschlagKennung\(abnahme\)\}\|\$\{verwerfenOffen\?\?'-'\}/.test(w)) b.push('Kennzeichen ohne Karte/Stufe')
  if (!/fehlerFokus\)document\.getElementById\('workflow-abnahme-meldung'\)\.focus\(\)/.test(w)) b.push('kein Fehlerfokus')
  // qa 2, cr 2: „Wirklich verwerfen?“ nur als Einzelklick und nach der Sperrzeit; qa 3: die Stufe setzt das Kennzeichen nicht zurück.
  if (!f.includes("if(aktion==='verwerfen-bestaetigt'&&(ereignis.detail>1||Date.now()-verwerfenOffenSeit<VERWERFEN_SPERRE_MS))return")) b.push('Stufe ohne Doppelklick-Schutz')
  if (f.includes('abnahmeKennzeichen=null')) b.push('Stufe setzt das Kennzeichen zurück (Begründung ginge verloren)')
  if (!/closest\('\.wf-faehigkeit-vorschlag'\);?if\(vorschlagButton\)fuehreVorschlagAktionAus\(vorschlagButton,ereignis\)/.test(w)) b.push('Klick ohne Ereignis weitergegeben')
  const a = norm(api)
  const s = a.slice(a.indexOf('exportconstsendeFaehigkeitVorschlag='), a.indexOf('exportconstsendeFaehigkeitVorschlag=') + 300)
  if (!s.includes('mitPraefix(`/workflows/${encodeURIComponent(workflowId)}/faehigkeit-vorschlag/')) b.push('sendeFaehigkeitVorschlag ohne mitPraefix/Kodierung')
  return b
}
const workflowsQuelle = lies('public/leitstand/views/workflows.js')
const apiQuelle = lies('public/leitstand/api.js')
pruefe(pruefeE(workflowsQuelle, apiQuelle), '(e) Klick nur über sendeAbnahmeBedienung (ohne await davor, Wache laufendeAbnahme), Delegation, Kennzeichen, Fehlerfokus, kodierte Kennung; Stufe mit Doppelklick-Schutz, ohne Kennzeichen-Reset.', '(e)')
gegenprobe('(e)', [
  ['await davor', pruefeE(workflowsQuelle.replace('function fuehreVorschlagAktionAus(button, ereignis) {', 'async function fuehreVorschlagAktionAus(button, ereignis) {\n  await null'), apiQuelle)],
  ['Stufe ohne Schutz', pruefeE(workflowsQuelle.replace("aktion === 'verwerfen-bestaetigt' && (ereignis.detail > 1 ||", "aktion === 'verwerfen-bestaetigt' && (false ||"), apiQuelle)],
  ['Kennzeichen-Reset', pruefeE(workflowsQuelle.replace('    verwerfenOffenSeit = Date.now()\n', '    verwerfenOffenSeit = Date.now()\n    abnahmeKennzeichen = null\n'), apiQuelle)],
  ['ohne Sperre', pruefeE(workflowsQuelle.replace('void sendeAbnahmeBedienung(workflowId, () => sendeFaehigkeitVorschlag(', 'void fetch(workflowId, () => sendeFaehigkeitVorschlag('), apiQuelle)],
  ['ohne Kodierung', pruefeE(workflowsQuelle, apiQuelle.replace('faehigkeit-vorschlag/${', 'faehigkeit-vorschlag-x/${').replace('${encodeURIComponent(workflowId)}/faehigkeit-vorschlag-x', '${workflowId}/faehigkeit-vorschlag'))],
])

// ─── (g) i18n, Umfang, Präfix ─────────────────────────────────────────────────────────────────────────────────────────

const INTERN = /\bF-\d|E-FB1|\bFB-\d|\bcr1\b|\bB13\b|\bq1\b|workflow-|wf\//
/** @param woerter - { de, en, tr, ru } @returns Befunde */
function pruefeG(woerter) {
  const b = []
  const schluessel = Object.keys(woerter.de).filter((k) => k.startsWith('abnahme.faehigkeiten.'))
  if (schluessel.length < 30) b.push(`nur ${schluessel.length} Schlüssel`)
  for (const [sprache, w] of Object.entries(woerter)) {
    for (const k of schluessel) {
      const wert = w[k]
      if (wert === undefined) b.push(`${sprache}: ${k} fehlt`)
      else if (INTERN.test(JSON.stringify(wert))) b.push(`${sprache}: ${k} mit interner Kennung`)
    }
  }
  return b
}
pruefe(pruefeG(sprachen), '(g) i18n: abnahme.faehigkeiten.* in de/en/tr/ru vollständig, ohne interne Kennung.', '(g)')
gegenprobe('(g)', [
  ['Schlüssel fehlt in ru', pruefeG({ ...sprachen, ru: Object.fromEntries(Object.entries(sprachen.ru).filter(([k]) => k !== 'abnahme.faehigkeiten.titel')) })],
  ['interne Kennung', pruefeG({ ...sprachen, en: { ...sprachen.en, 'abnahme.faehigkeiten.titel': 'Proposals (F-1167)' } })],
])
const umfang = renderUmfangHinweis({ status: 'ok', ausserhalb: [`${VORSCHLAG_ORDNER}/agents/x.md`, 'src/a.ts'], bereiche: ['docs/'] })
// code-reviewer 1: ein ganz ungetrackter Vorschlagsordner kommt als Ordner-Eintrag (`?? vorschlaege/`).
const umfangOrdner = renderUmfangHinweis({ status: 'ok', ausserhalb: ['vorschlaege/'], bereiche: ['docs/'] })
pruefe(
  [
    ...(anzeige.VORSCHLAG_PRAEFIX === `${VORSCHLAG_ORDNER}/` ? [] : ['VORSCHLAG_PRAEFIX weicht ab']),
    ...(/<code>vorschlaege\//.test(umfang) || !/Der Vorschlagsordner/.test(umfang) || !/<code>src\/a\.ts<\/code>/.test(umfang) ? ['Umfang trennt Vorschlagsdateien nicht'] : []),
    ...(/note amber/.test(umfangOrdner) || !/Der Vorschlagsordner/.test(umfangOrdner) ? ['Ordner-Eintrag vorschlaege/ als Verstoß'] : []),
  ],
  '(g) Umfangs-Hinweis nennt den Vorschlagsordner (Dateien und Ordner-Eintrag) als Satz statt in der amber Liste; Präfix gleich dem Vorschlagsordner.',
  '(g-umfang)'
)

// ─── (h) Server ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** @param server - Quelltext @returns Befunde */
function pruefeH(server) {
  const b = []
  const s = norm(server)
  if (!s.includes('awaitbaueVorschlagFelder(vorschlagOrt.wurzel,') || !s.includes('...faehigkeitFelder,')) b.push('Abnahme mischt baueVorschlagFelder nicht ein')
  if (s.includes('baueVorschlagProjektion')) b.push('eigene Projektion im Server')
  if (s.includes('/faehigkeit-vorschlag/')) b.push('Pfad /faehigkeit-vorschlag/ im Server (neue Route?)')
  return b
}
const serverQuelle = lies('scripts/leitstand-server.mjs')
pruefe(pruefeH(serverQuelle), '(h) Felder über baueVorschlagFelder, keine neue Route.', '(h)')
gegenprobe('(h)', [
  ['eigene Route', pruefeH(serverQuelle.replace('...faehigkeitFelder,', "...faehigkeitFelder, r: '/faehigkeit-vorschlag/x',"))],
])

// ─── (r) F-1096 ───────────────────────────────────────────────────────────────────────────────────────────────────────

const PLAN = 'Form-Empfehlung: wiederkehrend und deterministisch → Skript/Gate <b>statt</b> Skill.'
/** @param render - renderFreigabeSeite @returns Befunde */
function pruefeR(render) {
  const html = render({ daten: { status: 'WARTET_FREIGABE', ziel: 'z', schritte: [] }, naechster: { art: 'haltFreigabe', schrittId: 's', grund: 'g' }, empfehlung: null, planFreigabe: { art: 'ausfuehrung', fassung: 1, plan: { zusammenfassung: PLAN, module: [], entscheidungen: [] }, advisor: null } })
  return html.includes('Form-Empfehlung: wiederkehrend und deterministisch → Skript/Gate &lt;b&gt;statt&lt;/b&gt; Skill.') ? [] : ['Zusammenfassung (Form-Empfehlung) fehlt oder unescaped']
}
pruefe(pruefeR(renderFreigabeSeite), '(r) F-1096: Plan-Karte zeigt die Zusammenfassung des Architekten mit Form-Empfehlung escaped.', '(r)')
gegenprobe('(r)', [['ohne Zusammenfassung', pruefeR((d) => renderFreigabeSeite({ ...d, planFreigabe: { ...d.planFreigabe, plan: { module: [], entscheidungen: [] } } }))]])

// ─── Gegenproben (a)–(d) ──────────────────────────────────────────────────────────────────────────────────────────────

const immerKnoepfe = (id, a, o) => anzeige.renderFaehigkeitVorschlaege(id, { ...a, entscheidung: { status: 'nicht_vorhanden' }, workflowStatus: 'ABGESCHLOSSEN', faehigkeitVorschlaege: (a.faehigkeitVorschlaege ?? []).map((v) => ({ ...v, grund: null, ziel_existiert: false, ziel_ignoriert: false, adressierbar: true })) }, o)
gegenprobe('(a)-(d)', [
  ['Karte immer', pruefeA((id, a, o) => anzeige.renderFaehigkeitVorschlaege(id, { ...a, faehigkeitUngesichert: { status: 'nicht_bestimmbar' } }, o))],
  ['ohne Beschreibung', pruefeA((id, a, o) => anzeige.renderFaehigkeitVorschlaege(id, { ...a, faehigkeitVorschlaege: a.faehigkeitVorschlaege?.map((v) => ({ ...v, beschreibung: '' })) }, o))],
  ['Übernehmen immer', pruefeB(immerKnoepfe, anzeige.vorschlagSchluessel)],
  ['Verwerfen einstufig', pruefeB(anzeige.renderFaehigkeitVorschlaege, () => 'nie')],
  ['unescaped', pruefeC((id, a) => `${anzeige.renderFaehigkeitVorschlaege(id, a)}${a.faehigkeitVorschlaege[0].name}`)],
  ['Hinweis nur mit Vorschlägen', pruefeD((id, a) => renderAbnahme(id, a.faehigkeitVorschlaege === undefined ? { ...a, faehigkeitUngesichert: undefined } : a), renderFreigabeSeite)],
  ['Freigabe ohne Hinweis', pruefeD(renderAbnahme, (d) => renderFreigabeSeite({ ...d, faehigkeitUngesichert: undefined }))],
  ['Hauptknopf auf entscheidbar', pruefeA((id, a, o) => anzeige.renderFaehigkeitVorschlaege(id, a, { ...o, ebene: 3 }))],
])

if (befunde.length > 0) {
  console.error('\n✗ Befunde:')
  for (const b of befunde) console.error(`  - ${b}`)
  process.exit(1)
}
console.log('\n✓ Keine Befunde.')
