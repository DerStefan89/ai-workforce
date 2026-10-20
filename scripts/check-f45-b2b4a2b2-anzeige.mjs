#!/usr/bin/env node
/**
 * Datei: scripts/check-f45-b2b4a2b2-anzeige.mjs
 *
 * Zweck: Gate für F45 B2b-4a-2b-2 „Bereit zum Sichern – Anzeige“ (features/F45/plan-b2b4a2b2.md §4; F-979, F-1087, F-1157
 * (4)(5)(6)(8), V1, V3, Bauauflagen 3/6, Advisor advisor-b2b4a2b2.md 1–5, Prüfpass Code-Review/QA). Attrappen entstehen zur Laufzeit,
 * nichts eingecheckt. Quelltextprüfungen laufen auf normalisiertem Text (ohne Leerraum, " als ') — eine andere Formatierung kippt
 * das Gate nicht (Code-Review 3; Grünprobe „umformatiert“).
 * (a) Abruf nur bei geöffneter Karte bzw. Abnahme, nie im Poll: Stand-Modul mit Attrappe — 5× gleicher Schlüssel ⇒ 1 Abruf, Fehler +
 *     5× ⇒ 1, neuer Schlüssel ⇒ 2, Abonnent zeichnet neu ohne zweiten Abruf, Projektwechsel hin und zurück während eines Abrufs ⇒ neuer
 *     Abruf (Code-Review 2); Quelltext — zustand.js kennt den Stand nicht, Views rufen holeAblaufCode und stelleAblaufCodeStandSicher
 *     nie direkt (nur über sichernFuerAblauf mit sichernSchluessel), ladeAblaufCodeStand( nur mit neu: true, nichts davon in Poll- bzw.
 *     Auffrischer-Rückrufen, die Ablaufseite ruft nur auf der Detailroute ab, das Workboard abonniert den Stand (Advisor 1).
 * (b) ?workflow= bei jedem Ablauf mit Arbeitsordner: holeAblaufCode kodiert die Kennung und liest die 409; jeder Status außer
 *     kein_bedarf/bestand ⇒ Abschnitt mit Abruf; Ablaufseite und Workboard wählen über sichernFuerAblauf.
 * (c) genau ein Aufräumen je Seite: je Lage und Art genau ein [data-sichern-aufraeumen] (keins bei lädt/Fehler/aufgeräumt/Aufräumen
 *     läuft), nie ein Knopf im Abschnitt; Karte mit ohneKnopf + Aktionszeile ⇒ höchstens ein Knopf; workflows.js übergibt ohneKnopf;
 *     GESTOPPT-Texte (Änderungen, 0/0 ⇒ „Nichts offen“, unlesbar).
 * (d) Kopieren-Handler auf der Abnahme: behandleEntscheidenKlick mit Attrappe (Kopieren, Aktualisieren), Delegation an
 *     #workflow-entscheiden; das Workboard nutzt dieselbe Regel (behandleSichernKlick).
 * (e) 409 als Lage ohne Fehlerdarstellung (aufgeraeumt = Endzustand); 409 ohne Schlüssel, 400, 404, 200 ohne Feld ablauf ⇒ Fehler.
 * (f) i18n vollständig: jeder Schlüssel arbeitsordner.sichernAbschnitt.* / sichernGrund.* (neun Gründe) und befehl.enterHinweis (mit
 *     „>>“) in de/en/tr/ru, ohne interne Kennung (wf/, workflow-, F-<Zahl>, B2b); sichtbarer Text ohne workflowId.
 * (g) node_modules-Hinweis im Abschnitt nach derselben Regel wie #/code (nur bei nodeModulesAnzahl > 0), nie in git add.
 * (h) Server nicht gewachsen: starteWorkflowSchritt( genau 6×, Zeilen ≤ Ratsche (scripts/wachstumsbremse-server.json). Ob er
 *     unverändert ist, belegt der Diff gegen main (Bericht), nicht dieses Gate (Code-Review 4).
 * Gegenproben im Gate: je Teil verfälschte Module, Texte oder Eingänge — jede muss erkannt werden.
 *
 * Wird aufgerufen von: `npm run check:gates` (und damit `npm run check`).
 *
 * Aufruf: node scripts/check-f45-b2b4a2b2-anzeige.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Schein-Globals vor dem Laden der Leitstand-Module (projekt-kontext.js liest sessionStorage, workflows.js braucht window/location).
const speicher = () => {
  const werte = new Map()
  return { getItem: (s) => werte.get(s) ?? null, setItem: (s, w) => werte.set(s, String(w)), removeItem: (s) => werte.delete(s) }
}
for (const [name, wert] of Object.entries({ sessionStorage: speicher(), localStorage: speicher(), location: { hash: '#/runs' } })) {
  Object.defineProperty(globalThis, name, { value: wert, configurable: true, writable: true })
}
if (!('window' in globalThis)) Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true, writable: true })
globalThis.addEventListener ??= () => {}
globalThis.document ??= { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] }

const WURZEL = join(import.meta.dirname, '..')
const lies = (pfad) => readFileSync(join(WURZEL, pfad), 'utf8')
const { erzeugeAblaufCodeStand, werteAblaufAntwortAus } = await import('../public/leitstand/ablauf-code-stand.js')
const { renderSichernAbschnitt, aufraeumenArt, sichernFuerAblauf, SICHERN_GRUND_SCHLUESSEL } = await import('../public/leitstand/views/ablauf-sichern-anzeige.js')
const { renderArbeitsordnerKarte, renderArbeitsordnerAktion } = await import('../public/leitstand/views/arbeitsordner-anzeige.js')
const { holeAblaufCode } = await import('../public/leitstand/api.js')
const { behandleEntscheidenKlick } = await import('../public/leitstand/views/workflows.js')
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

const warte = () => new Promise((ok) => setTimeout(ok, 5))

/**
 * Normalisiert Quelltext für formatfeste Prüfungen: ohne jeden Leerraum, doppelte Anführungszeichen als einfache.
 * @param text - Quelltext
 * @returns normalisierter Text
 */
const norm = (text) => text.replace(/\s+/g, '').replaceAll('"', "'")

/**
 * Rumpf der ersten Rückruf-Funktion nach einem Aufruf (normalisierter Text): vom ersten „{“ nach start bis zur passenden „}“.
 * @param text - normalisierter Text
 * @param start - Index des Aufrufs
 * @returns Rumpf oder ''
 */
function rumpf(text, start) {
  const auf = text.indexOf('{', start)
  if (auf === -1) return ''
  let tiefe = 0
  for (let i = auf; i < text.length; i++) {
    if (text[i] === '{') tiefe++
    else if (text[i] === '}' && --tiefe === 0) return text.slice(auf, i + 1)
  }
  return ''
}

// ─── (a) Abruf ────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Prüft eine Stand-Fabrik mit Attrappen (die gewollten Fehlerlogs der Attrappe „Netz“ bleiben aus dem Protokoll).
 * @param erzeuge - wie erzeugeAblaufCodeStand
 * @returns Promise<Befunde>
 */
async function pruefeAbruf(erzeuge) {
  const fehlerVorher = console.error
  console.error = () => {}
  try {
    return await pruefeAbrufLeise(erzeuge)
  } finally {
    console.error = fehlerVorher
  }
}

/**
 * pruefeAbruf ohne Umleitung des Protokolls.
 * @param erzeuge - wie erzeugeAblaufCodeStand
 * @returns Promise<Befunde>
 */
async function pruefeAbrufLeise(erzeuge) {
  const b = []
  const projekt = { id: 'p' }
  const lauf = async (antwort, schritte) => {
    const abrufe = []
    projekt.id = 'p'
    const s = erzeuge({
      hole: async (id) => {
        abrufe.push(id)
        // Deckel: eine Gegenprobe, die bei jedem Zeichnen abruft, liefe über den Abonnenten sonst endlos.
        return abrufe.length > 20 ? new Promise(() => {}) : antwort()
      },
      projektId: () => projekt.id,
    })
    await schritte(s)
    return abrufe.length
  }
  const ok = () => ({ http: 200, koerper: { ablauf: { sichern: { bereit: true } } } })
  const netz = () => {
    throw new Error('Netz')
  }
  const fuenf = async (s, k = 'k1') => {
    for (let i = 0; i < 5; i++) {
      s.stelleSicher('w', k)
      await warte()
    }
  }
  if ((await lauf(ok, fuenf)) !== 1) b.push('5× gleicher Schlüssel ≠ 1 Abruf')
  if ((await lauf(netz, fuenf)) !== 1) b.push('Fehlschlag + 5× ≠ 1 Abruf')
  if ((await lauf(ok, async (s) => (await fuenf(s), await fuenf(s, 'k2')))) !== 2) b.push('neuer Schlüssel ≠ 2 Abrufe')
  const mitAbonnent = await lauf(ok, async (s) => {
    s.abonniere(() => s.stelleSicher('w', 'k1'))
    await fuenf(s)
    void s.lade('w', { neu: true })
    await warte()
    await warte()
  })
  if (mitAbonnent !== 2) b.push(`neu zeichnender Abonnent: ${mitAbonnent} statt 2 Abrufe`)
  if ((await lauf(ok, async (s) => (await fuenf(s), await s.lade('w')))) !== 1) b.push('lade ohne neu ruft ab')
  // Code-Review 2: Wechsel während eines Abrufs und zurück — derselbe Schlüssel muss neu abrufen (sonst hängt „lädt“).
  const wechsel = await lauf(
    () => new Promise(() => {}),
    async (s) => {
      s.stelleSicher('w', 'k1')
      projekt.id = 'q'
      s.stand('w')
      projekt.id = 'p'
      s.stelleSicher('w', 'k1')
    }
  )
  if (wechsel !== 2) b.push(`Projektwechsel hin und zurück: ${wechsel} statt 2 Abrufe`)
  return b
}

/**
 * Prüft die Aufrufstellen im (normalisierten) Quelltext.
 * @param q - { zustand, stand, anzeige, workflows, workboard, views: { Datei: Text } } — Rohtexte
 * @returns Befunde
 */
function pruefeAufrufstellen(q) {
  const b = []
  const n = Object.fromEntries(Object.entries(q).map(([k, v]) => [k, typeof v === 'string' ? norm(v) : Object.fromEntries(Object.entries(v).map(([d, t]) => [d, norm(t)]))]))
  if (/ablauf-code-stand|holeAblaufCode|stelleAblaufCodeStandSicher|ladeAblaufCodeStand/.test(n.zustand)) b.push('zustand.js (Poll) kennt den Ablauf-Stand')
  for (const [datei, text] of Object.entries(n.views)) {
    if (/holeAblaufCode/.test(text)) b.push(`${datei} ruft holeAblaufCode direkt`)
    if (/stelleAblaufCodeStandSicher\(/.test(text)) b.push(`${datei}: stelleAblaufCodeStandSicher direkt statt über sichernFuerAblauf`)
    for (const m of text.matchAll(/ladeAblaufCodeStand\(/g)) if (!text.slice(m.index, m.index + 120).includes('{neu:true}')) b.push(`${datei}: ladeAblaufCodeStand ohne neu: true`)
    for (const m of text.matchAll(/(?:abonniere|abonniereDetailAuffrischer)\(\(/g)) {
      if (/stelleAblaufCodeStandSicher|ladeAblaufCodeStand|sichernFuerAblauf/.test(rumpf(text, m.index))) b.push(`${datei}: Ablauf-Stand in einem Poll-/Auffrischer-Rückruf`)
    }
  }
  if (!n.stand.includes("import{holeAblaufCode}from'./api.js'")) b.push('Stand-Modul nutzt holeAblaufCode nicht')
  if (!n.anzeige.includes('stelle(workflowId,sichernSchluessel(detail))')) b.push('sichernFuerAblauf ruft nicht über den Neuladen-Schlüssel ab')
  if (!n.workflows.includes("constaufDetail=/^#\\/workflows\\/[^/]+$/.test(location.hash") || !n.workflows.includes('stelle:aufDetail?stelleAblaufCodeStandSicher:ablaufCodeStand')) b.push('Ablaufseite ruft auch außerhalb der Detailroute ab')
  if (!n.workboard.includes('stelle:stelleAblaufCodeStandSicher')) b.push('Workboard ruft nicht über sichernFuerAblauf ab')
  const abo = n.workboard.indexOf('abonniereAblaufCodeStand((workflowId)=>')
  if (abo === -1 || !rumpf(n.workboard, abo).includes('renderBearbeitungsAbschnitt(workitem,false)')) b.push('Workboard zeichnet nach dem Abruf nicht neu (Advisor 1)')
  return b
}

const VIEWS = ['public/leitstand/views/workflows.js', 'public/leitstand/views/workboard.js', 'public/leitstand/views/arbeitsordner-anzeige.js', 'public/leitstand/views/ablauf-sichern-anzeige.js', 'public/leitstand/views/code.js', 'public/leitstand/views/workflow-abnahme.js', 'public/leitstand/views/workflow-entscheiden.js']
const QUELLE = {
  zustand: lies('public/leitstand/zustand.js'),
  stand: lies('public/leitstand/ablauf-code-stand.js'),
  anzeige: lies('public/leitstand/views/ablauf-sichern-anzeige.js'),
  workflows: lies('public/leitstand/views/workflows.js'),
  workboard: lies('public/leitstand/views/workboard.js'),
  views: Object.fromEntries(VIEWS.map((d) => [d, lies(d)])),
}
/** Dieselben Quellen umformatiert (doppelte Anführungszeichen, Zeilenumbrüche, Tabs) — muss grün bleiben. */
const umformatiert = (text) => text.replaceAll("'", '"').replaceAll(', ', ',\n\t\t').replaceAll('({', '(\n\t{')
const QUELLE_UMFORMATIERT = Object.fromEntries(Object.entries(QUELLE).map(([k, v]) => [k, typeof v === 'string' ? umformatiert(v) : Object.fromEntries(Object.entries(v).map(([d, t]) => [d, umformatiert(t)]))]))

pruefe(
  [...(await pruefeAbruf(erzeugeAblaufCodeStand)), ...pruefeAufrufstellen(QUELLE), ...pruefeAufrufstellen(QUELLE_UMFORMATIERT).map((x) => `umformatiert: ${x}`)],
  '(a) Abruf je Schlüssel einmal (auch nach Fehler und Projektwechsel), nie aus dem Poll; Aufrufstellen formatfest geprüft; Workboard zeichnet neu.',
  '(a)'
)

/** Naive Fabrik: ruft bei jedem Zeichnen ab (Rotfall). @param abh - Abhängigkeiten @returns Stand */
const naiv = (abh) => {
  const echt = erzeugeAblaufCodeStand(abh)
  // Jeder Aufruf mit einem neuen Schlüssel — ruft immer ab, meldet aber (wie das Original) nicht synchron.
  return { ...echt, stelleSicher: (id) => echt.stelleSicher(id, Symbol('immer neu')) }
}
/** Fabrik, die den Projektwechsel nicht bemerkt (Rotfall Code-Review 2). @param abh - Abhängigkeiten @returns Stand */
const ohneWechsel = (abh) => erzeugeAblaufCodeStand({ ...abh, projektId: () => 'fest' })
gegenprobe('(a)', [
  ['Laden je Aufruf', await pruefeAbruf(naiv)],
  ['Projektwechsel nicht verworfen', await pruefeAbruf(ohneWechsel)],
  ['zustand.js importiert den Stand', pruefeAufrufstellen({ ...QUELLE, zustand: `${QUELLE.zustand}\nimport { stelleAblaufCodeStandSicher } from './ablauf-code-stand.js'` })],
  ['Aktualisieren ohne neu', pruefeAufrufstellen({ ...QUELLE, views: { ...QUELLE.views, x: 'ladeAblaufCodeStand(id)' } })],
  ['direkter Abruf in einer View', pruefeAufrufstellen({ ...QUELLE, views: { ...QUELLE.views, x: "stelleAblaufCodeStandSicher(id, 'fest')" } })],
  ['Abruf im Poll-Rückruf', pruefeAufrufstellen({ ...QUELLE, views: { ...QUELLE.views, x: 'abonniere((zustand) => {\n  sichernFuerAblauf({})\n})' } })],
  ['Workboard ohne Abonnent', pruefeAufrufstellen({ ...QUELLE, workboard: QUELLE.workboard.replace('abonniereAblaufCodeStand((workflowId) => {', 'abonniereX((workflowId) => {') })],
  ['Ablaufseite ohne Routenprüfung', pruefeAufrufstellen({ ...QUELLE, workflows: QUELLE.workflows.replace('stelle: aufDetail ? stelleAblaufCodeStandSicher', 'stelle: true ? stelleAblaufCodeStandSicher') })],
])

// ─── (b) ?workflow= ───────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Prüft Kodierung, 409 und Quellenwahl.
 * @param fuer - wie sichernFuerAblauf
 * @param hole - wie holeAblaufCode
 * @param texte - { workflows, workboard } (Rohtexte)
 * @returns Promise<Befunde>
 */
async function pruefeWorkflowParameter(fuer, hole, texte) {
  const b = []
  for (const status of ['fehlt', 'IN_VORBEREITUNG', 'BEREIT', 'FEHLGESCHLAGEN', 'ENTFERNT', 'NEU']) {
    const aufrufe = []
    const e = fuer({ workflowId: 'w', detail: { daten: { status: 'ABGESCHLOSSEN' }, arbeitsordner: { status } }, aufraeumen: { art: 'link' }, stelle: (id) => (aufrufe.push(id), { zustand: 'laedt' }) })
    if (e.quelle !== 'ablauf' || aufrufe.length !== 1) b.push(`${status} ⇒ ${e.quelle}, ${aufrufe.length} Abrufe`)
  }
  for (const [status, quelle] of [
    ['bestand', 'projekt'],
    ['kein_bedarf', 'keinBedarf'],
  ]) {
    const e = fuer({ workflowId: 'w', detail: { daten: {}, arbeitsordner: { status } }, aufraeumen: { art: 'link' }, stelle: () => b.push(`${status} ruft ab`) })
    if (e.quelle !== quelle) b.push(`${status} ⇒ ${e.quelle}`)
  }
  const urls = []
  const fetchVorher = globalThis.fetch
  globalThis.fetch = async (url) => {
    urls.push(String(url))
    return { status: 409, json: async () => ({ grund_schluessel: 'aufgeraeumt' }) }
  }
  try {
    const a = await hole('a b/&c')
    if (a.http !== 409 || a.koerper.grund_schluessel !== 'aufgeraeumt') b.push('holeAblaufCode liest die 409 nicht')
  } catch (fehler) {
    b.push(`holeAblaufCode wirft bei 409: ${fehler.message}`)
  } finally {
    globalThis.fetch = fetchVorher
  }
  if (!urls.some((u) => u.endsWith('/code?workflow=a%20b%2F%26c'))) b.push(`URL nicht kodiert: ${urls.join(', ')}`)
  for (const [name, text] of Object.entries(texte)) if (!norm(text).includes('sichernFuerAblauf({')) b.push(`${name} wählt nicht über sichernFuerAblauf`)
  return b
}

const texteB = { workflows: QUELLE.workflows, workboard: QUELLE.workboard }
pruefe(await pruefeWorkflowParameter(sichernFuerAblauf, holeAblaufCode, texteB), '(b) ?workflow= kodiert, 409 lesbar, jeder Ablauf mit Arbeitsordner über den Ablauf-Stand, Wahl über sichernFuerAblauf.', '(b)')
gegenprobe('(b)', [
  ['Quelle projekt für BEREIT', await pruefeWorkflowParameter((e) => (e.detail.arbeitsordner.status === 'BEREIT' ? { quelle: 'projekt', html: '' } : sichernFuerAblauf(e)), holeAblaufCode, texteB)],
  ['Kennung nicht kodiert', await pruefeWorkflowParameter(sichernFuerAblauf, async (id) => ({ http: (await globalThis.fetch(`/api/code?workflow=${id}`)).status, koerper: { grund_schluessel: 'aufgeraeumt' } }), texteB)],
  ['Workboard ohne Quellenwahl', await pruefeWorkflowParameter(sichernFuerAblauf, holeAblaufCode, { ...texteB, workboard: QUELLE.workboard.replaceAll('sichernFuerAblauf(', 'andereQuelle(') })],
])

// ─── Lagen für (c)(e)(f)(g) ───────────────────────────────────────────────────────────────────────────────────────────

const ID = 'wf-gate-0815'
const AO = { status: 'BEREIT', pfad: String.raw`C:\Projekte\haushaltsbuch-laeufe\x1`, branch: `wf/${ID}` }

/**
 * Antwort (200) von GET …/code?workflow=.
 * @param s - Felder von ablauf.sichern
 * @param zusatz - weitere Felder (workflowStatus, branch, dateien, remoteWebUrl)
 * @returns Antwort
 */
const antwort = (s = {}, zusatz = {}) => ({
  status: 'ok',
  branch: { status: 'ok', name: AO.branch, losgeloest: false, ...(zusatz.branch ?? {}) },
  remoteWebUrl: { status: 'ok', url: null, origin: true, ...(zusatz.remoteWebUrl ?? {}) },
  dateien: { status: 'ok', eintraege: [{ pfad: 'a.ts', art: 'M', xy: ' M' }], anzahl: 1, gekappt: false, nodeModules: 0, ...(zusatz.dateien ?? {}) },
  ablauf: { workflowId: ID, workflowStatus: zusatz.workflowStatus ?? 'ABGESCHLOSSEN', arbeitsordner: { pfad: AO.pfad, branch: AO.branch }, sichern: { bereit: true, art: 'commit', grund: null, offeneAenderungen: 1, voraus: 0, ...s } },
})
const ok = (daten) => ({ zustand: 'ok', daten, geladenAm: 1 })
const nb = (grund, s = {}, z = {}) => antwort({ bereit: false, art: null, grund, ...s }, z)
/** Lagen mit Soll-Anzahl Aufräumen-Elemente. */
const LAGEN = [
  ['laedt', { zustand: 'laedt' }, 0],
  ['fehler', { zustand: 'fehler', fehler: '404: x', geladenAm: 1 }, 0],
  ['409 aufgeraeumt', { zustand: 'lage', grundSchluessel: 'aufgeraeumt', geladenAm: 1 }, 0],
  ['409 inVorbereitung', { zustand: 'lage', grundSchluessel: 'inVorbereitung', geladenAm: 1 }, 0],
  ...['fehlgeschlagen', 'ordnerFehlt', 'nichtBestimmbar', 'nichtAngelegt'].map((k) => [`409 ${k}`, { zustand: 'lage', grundSchluessel: k, geladenAm: 1 }, 1]),
  ['bereit commit', ok(antwort()), 1],
  ['bereit push', ok(antwort({ art: 'push', offeneAenderungen: 0, voraus: 2 })), 1],
  ['bereit ohne origin', ok(antwort({}, { remoteWebUrl: { origin: false } })), 1],
  ['push-Grund Branch', ok(antwort({}, { branch: { name: 'feat/x' } })), 1],
  ['push-Grund losgelöst', ok(antwort({}, { branch: { losgeloest: true, name: null } })), 1],
  ['node_modules', ok(antwort({}, { dateien: { nodeModules: 12 } })), 1],
  ['GESTOPPT offen', ok(nb('nichtAbgeschlossen', { offeneAenderungen: 3, voraus: 0 }, { workflowStatus: 'GESTOPPT' })), 1],
  ['GESTOPPT 0/0', ok(nb('nichtAbgeschlossen', { offeneAenderungen: 0, voraus: 0 }, { workflowStatus: 'GESTOPPT' })), 1],
  ['GESTOPPT unlesbar', ok(nb('nichtAbgeschlossen', { offeneAenderungen: null, voraus: null }, { workflowStatus: 'GESTOPPT' })), 1],
  ['nichtsOffen', ok(nb('nichtsOffen', { offeneAenderungen: 0, voraus: 0 })), 1],
  ['nichtBestimmbar 200', ok(nb('nichtBestimmbar', { offeneAenderungen: null, voraus: null })), 1],
]
const ARTEN = ['aktionen', 'nachAbnahme', 'neutral', 'link']
const zahl = (html, muster) => (html.match(muster) ?? []).length

// ─── (c) genau ein Aufräumen ──────────────────────────────────────────────────────────────────────────────────────────

/**
 * Prüft Aufräumen je Lage/Art und Seite.
 * @param render - wie renderSichernAbschnitt
 * @param karte - wie renderArbeitsordnerKarte
 * @param workflowsText - Quelltext von workflows.js
 * @returns Befunde
 */
function pruefeAufraeumen(render, karte, workflowsText) {
  const b = []
  for (const [name, stand, soll] of LAGEN) {
    for (const art of ARTEN) {
      const html = render({ workflowId: ID, stand, aufraeumen: { art } })
      if (zahl(html, /data-sichern-aufraeumen/g) !== soll) b.push(`${name}/${art}: ${zahl(html, /data-sichern-aufraeumen/g)} statt ${soll}`)
      if (/aufraeumen-oeffnen/.test(html)) b.push(`${name}/${art}: Knopf im Abschnitt`)
    }
  }
  const text = (name) => render({ workflowId: ID, stand: LAGEN.find(([n]) => n === name)[1], aufraeumen: { art: 'aktionen' } })
  if (!/Nichts offen — weiter mit Aufräumen/.test(text('GESTOPPT 0/0'))) b.push('GESTOPPT 0/0 ohne „Nichts offen“')
  if (!/Gestoppt — ob im Arbeitsordner noch etwas offen ist/.test(text('GESTOPPT unlesbar'))) b.push('GESTOPPT unlesbar ohne eigenen Text')
  if (!/Gestoppt mit 3 offenen Änderungen\. Weg: Aufräumen — mit „Änderungen verwerfen“/.test(text('GESTOPPT offen'))) b.push('GESTOPPT mit Änderungen ohne Weg Aufräumen/Verwerfen')
  // Seite: Karte (mit Abschnitt, ohneKnopf) + Aktionszeile höchstens ein Knopf, in jedem Status.
  for (const status of ['ABGESCHLOSSEN', 'GESTOPPT']) {
    for (const abnahmeOffen of [true, false]) {
      const abschnitt = render({ workflowId: ID, stand: ok(antwort()), aufraeumen: { art: aufraeumenArt({ workflowStatus: status, ao: AO, abnahmeOffen }) } })
      const seite = karte(AO, null, { workflowId: ID, workflowStatus: status, abnahmeOffen, sichernHtml: abschnitt, ohneKnopf: true }) + renderArbeitsordnerAktion(ID, status, AO, abnahmeOffen)
      if (zahl(seite, /data-aktion="aufraeumen-oeffnen"/g) > 1) b.push(`${status}/${abnahmeOffen}: ${zahl(seite, /aufraeumen-oeffnen/g)} Knöpfe auf der Seite`)
      if (zahl(seite, /data-sichern-aufraeumen/g) !== 1) b.push(`${status}/${abnahmeOffen}: Aufräumen-Element nicht genau einmal`)
    }
  }
  if (!norm(workflowsText).includes('sichernHtml:sichernHtmlDerKarte(),ohneKnopf:true')) b.push('workflows.js baut die Karte nicht mit ohneKnopf (Code-Review 5)')
  return b
}

pruefe(pruefeAufraeumen(renderSichernAbschnitt, renderArbeitsordnerKarte, QUELLE.workflows), '(c) genau ein Aufräumen je Abschnitt in allen Lagen und Arten, nie ein Knopf darin; Seite ≤ 1 Knopf; workflows.js mit ohneKnopf; GESTOPPT-Texte.', '(c)')
gegenprobe('(c)', [
  ['zwei Aufräumen', pruefeAufraeumen((e) => `${renderSichernAbschnitt(e)}<p data-sichern-aufraeumen="x"></p>`, renderArbeitsordnerKarte, QUELLE.workflows)],
  ['Knopf im Abschnitt', pruefeAufraeumen((e) => `${renderSichernAbschnitt(e)}<button data-aktion="aufraeumen-oeffnen"></button>`, renderArbeitsordnerKarte, QUELLE.workflows)],
  ['Karte behält ihren Knopf', pruefeAufraeumen(renderSichernAbschnitt, (ao, cs, k) => renderArbeitsordnerKarte(ao, cs, { ...k, ohneKnopf: false }), QUELLE.workflows)],
  ['workflows.js ohne ohneKnopf', pruefeAufraeumen(renderSichernAbschnitt, renderArbeitsordnerKarte, QUELLE.workflows.replace('ohneKnopf: true', 'ohneKnopf: false'))],
  ['GESTOPPT 0/0 als Grundtext', pruefeAufraeumen((e) => renderSichernAbschnitt(e).replace('Nichts offen — weiter mit Aufräumen', 'Der Ablauf ist nicht abgeschlossen'), renderArbeitsordnerKarte, QUELLE.workflows)],
])

// ─── (d) Kopieren-Handler ─────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Prüft den Klick-Handler der Abnahmeseite mit Attrappen und seine Registrierung (auch die des Workboards).
 * @param handler - wie behandleEntscheidenKlick
 * @param texte - { workflows, workboard } (Rohtexte)
 * @returns Promise<Befunde>
 */
async function pruefeHandler(handler, texte) {
  const b = []
  const ziel = (sel, dataset = {}) => ({ dataset, closest: (s) => (s === sel ? ziel(sel, dataset) : null) })
  const aufrufe = []
  const abh = { kopiere: async (k) => aufrufe.push(`kopiere:${k.dataset.n}`), aktualisiere: async (id) => aufrufe.push(`neu:${id}`) }
  handler({ target: ziel('[data-befehl-kopieren]', { n: 7 }) }, abh)
  handler({ target: ziel('[data-sichern-aktualisieren]', { workflowId: 'w-3' }) }, abh)
  handler({ target: ziel('.anderes') }, abh)
  await warte()
  if (aufrufe.join(',') !== 'kopiere:7,neu:w-3') b.push(`Handler-Aufrufe: ${aufrufe.join(',') || 'keine'}`)
  const delegation = "getElementById('workflow-entscheiden').addEventListener('click',(ereignis)=>{behandleEntscheidenKlick(ereignis,{kopiere:kopiereBefehlsblock,aktualisiere:(id)=>ladeAblaufCodeStand(id,{neu:true})})"
  if (!norm(texte.workflows).includes(delegation)) b.push('Delegation an #workflow-entscheiden fehlt')
  if (!norm(texte.workboard).includes('behandleSichernKlick(ereignis,{kopiere:kopiereBefehlsblock,aktualisiere:(id)=>ladeAblaufCodeStand(id,{neu:true})})')) b.push('Workboard nutzt nicht dieselbe Klickregel')
  return b
}

const texteD = { workflows: QUELLE.workflows, workboard: QUELLE.workboard }
pruefe(await pruefeHandler(behandleEntscheidenKlick, texteD), '(d) Kopieren und Aktualisieren auf der Abnahme-/Ablaufseite: Handler mit Attrappe, Delegation an #workflow-entscheiden; Workboard mit derselben Regel.', '(d)')
gegenprobe('(d)', [
  ['Handler ohne Kopieren', await pruefeHandler((e, abh) => (e.target.closest('[data-sichern-aktualisieren]') ? abh.aktualisiere(e.target.dataset.workflowId) : false), texteD)],
  ['Delegation fehlt', await pruefeHandler(behandleEntscheidenKlick, { ...texteD, workflows: QUELLE.workflows.replace("getElementById('workflow-entscheiden').addEventListener('click', (ereignis) => {", 'x') })],
  ['Workboard mit eigener Klicklogik', await pruefeHandler(behandleEntscheidenKlick, { ...texteD, workboard: QUELLE.workboard.replace('behandleSichernKlick(ereignis,', 'eigeneKlicklogik(ereignis,') })],
])

// ─── (e) 409 als Lage ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Prüft die Auswertung und Darstellung der 409 (und der Antworten, die Fehler sind).
 * @param werte - wie werteAblaufAntwortAus
 * @param render - wie renderSichernAbschnitt
 * @returns Befunde
 */
function pruefe409(werte, render) {
  const b = []
  const lage = werte({ http: 409, koerper: { grund: 'x', grund_schluessel: 'aufgeraeumt' } })
  if (lage.zustand !== 'lage' || lage.grundSchluessel !== 'aufgeraeumt') b.push('409 mit Schlüssel keine Lage')
  for (const [http, koerper] of [
    [409, { grund: 'x', grund_schluessel: null }],
    [400, { grund: 'Form', grund_schluessel: null }],
    [404, { grund: 'nicht gefunden', grund_schluessel: null }],
    [200, { status: 'ok' }],
  ]) {
    if (werte({ http, koerper }).zustand !== 'fehler') b.push(`${http} ${JSON.stringify(koerper)} kein Fehler`)
  }
  if (!/Leitstand neu starten/.test(String(werte({ http: 200, koerper: { status: 'ok' } }).fehler))) b.push('älterer Server ohne „Leitstand neu starten“')
  for (const k of SICHERN_GRUND_SCHLUESSEL) {
    const html = render({ workflowId: ID, stand: { zustand: 'lage', grundSchluessel: k, geladenAm: 1 }, aufraeumen: { art: 'aktionen' } })
    if (/class="fehler"/.test(html)) b.push(`409 ${k} mit Fehlerfarbe`)
  }
  const ende = render({ workflowId: ID, stand: { zustand: 'lage', grundSchluessel: 'aufgeraeumt', geladenAm: 1 }, aufraeumen: { art: 'aktionen' } })
  if (!/Erledigt: Der Arbeitsordner ist aufgeräumt/.test(ende)) b.push('aufgeraeumt nicht als Endzustand')
  return b
}

pruefe(pruefe409(werteAblaufAntwortAus, renderSichernAbschnitt), '(e) 409 mit Schlüssel ist eine Lage ohne Fehlerfarbe (aufgeräumt = Endzustand); 409 ohne Schlüssel, 400, 404 und 200 ohne ablauf sind Fehler.', '(e)')
gegenprobe('(e)', [
  ['jede 409 als Lage', pruefe409((a) => (a.http === 409 ? { zustand: 'lage', grundSchluessel: a.koerper.grund_schluessel } : werteAblaufAntwortAus(a)), renderSichernAbschnitt)],
  ['200 ohne ablauf als Stand', pruefe409((a) => (a.http === 200 ? { zustand: 'ok', daten: a.koerper } : werteAblaufAntwortAus(a)), renderSichernAbschnitt)],
  ['409 mit Fehlerfarbe', pruefe409(werteAblaufAntwortAus, (e) => renderSichernAbschnitt(e).replace('subtle sichern-lage', 'fehler'))],
])

// ─── (f) i18n ─────────────────────────────────────────────────────────────────────────────────────────────────────────

const KENNUNG = /wf\/|workflow-|F-\d|B2b/

/**
 * Prüft die neuen Schlüssel in allen Sprachen.
 * @param woerterbuecher - { de, en, tr, ru }
 * @param render - wie renderSichernAbschnitt (sichtbarer Text ohne workflowId)
 * @returns Befunde
 */
function pruefeI18n(woerterbuecher, render) {
  const b = []
  const schluessel = Object.keys(woerterbuecher.de).filter((k) => k.startsWith('arbeitsordner.sichernAbschnitt.') || k.startsWith('arbeitsordner.sichernGrund.'))
  for (const k of SICHERN_GRUND_SCHLUESSEL) if (!schluessel.includes(`arbeitsordner.sichernGrund.${k}`)) b.push(`de ohne sichernGrund.${k}`)
  if (schluessel.length < 34) b.push(`nur ${schluessel.length} Schlüssel`)
  for (const [sprache, w] of Object.entries(woerterbuecher)) {
    for (const k of [...schluessel, 'befehl.enterHinweis']) {
      const wert = w[k]
      const texte = typeof wert === 'string' ? [wert] : wert !== null && typeof wert === 'object' ? Object.values(wert) : []
      if (texte.length === 0 || texte.some((s) => typeof s !== 'string' || s.trim() === '')) b.push(`${sprache} ohne ${k}`)
      else if (texte.some((s) => KENNUNG.test(s))) b.push(`${sprache} ${k} mit Kennung`)
    }
    if (!/>>/.test(String(w['befehl.enterHinweis']))) b.push(`${sprache}: Enter-Hinweis ohne „>>“`)
  }
  for (const [name, stand] of LAGEN) {
    for (const art of ARTEN) {
      const sichtbar = render({ workflowId: ID, stand, aufraeumen: { art } })
        .replace(/<pre[\s\S]*?<\/pre>/g, '')
        .replace(/<[^>]+>/g, ' ')
      if (sichtbar.includes(ID) || /sichernAbschnitt\.|sichernGrund\./.test(sichtbar)) b.push(`${name}/${art}: Kennung oder roher Schlüssel im Text`)
    }
  }
  return b
}

pruefe(pruefeI18n(sprachen, renderSichernAbschnitt), '(f) i18n de/en/tr/ru vollständig (Abschnitt, neun Gründe, Enter-Hinweis mit „>>“), ohne Kennung; sichtbarer Text ohne workflowId.', '(f)')
gegenprobe('(f)', [
  ['ru ohne Schlüssel', pruefeI18n({ ...sprachen, ru: { ...sprachen.ru, 'arbeitsordner.sichernGrund.aufgeraeumt': undefined } }, renderSichernAbschnitt)],
  ['tr mit Kennung', pruefeI18n({ ...sprachen, tr: { ...sprachen.tr, 'arbeitsordner.sichernAbschnitt.titel': 'wf/x' } }, renderSichernAbschnitt)],
  ['alter Enter-Hinweis', pruefeI18n({ ...sprachen, en: { ...sprachen.en, 'befehl.enterHinweis': 'After pasting, press Enter once.' } }, renderSichernAbschnitt)],
  ['Kennung im Text', pruefeI18n(sprachen, (e) => `${renderSichernAbschnitt(e)}<p>${ID}</p>`)],
])

// ─── (g) node_modules ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Prüft den node_modules-Hinweis im Abschnitt.
 * @param render - wie renderSichernAbschnitt
 * @returns Befunde
 */
function pruefeNodeModules(render) {
  const b = []
  const r = (daten) => render({ workflowId: ID, stand: ok(daten), aufraeumen: { art: 'aktionen' } })
  if (!/class="subtle code-node-modules">node_modules ausgelassen — fehlt in \.gitignore: 12 neue Dateien/.test(r(antwort({}, { dateien: { nodeModules: 12 } })))) b.push('Hinweis fehlt bei bereit')
  if (!/code-node-modules/.test(r(nb('nichtsOffen', { offeneAenderungen: 0, voraus: 0 }, { dateien: { eintraege: [], anzahl: 0, nodeModules: 4 } })))) b.push('Hinweis fehlt neben einem Grund')
  if (/code-node-modules/.test(r(antwort()))) b.push('Hinweis ohne ausgelassene Dateien')
  const alt = antwort()
  delete alt.dateien.nodeModules
  if (/code-node-modules/.test(r(alt))) b.push('Hinweis bei fehlendem Feld (älterer Server)')
  const mitNm = antwort({}, { dateien: { eintraege: [{ pfad: 'a.ts', art: 'M', xy: ' M' }, { pfad: 'node_modules/x/i.js', art: '??', xy: '??' }], anzahl: 2, nodeModules: 1 } })
  if (/git add[^<]*node_modules/.test(r(mitNm))) b.push('node_modules in git add')
  return b
}

pruefe(pruefeNodeModules(renderSichernAbschnitt), '(g) node_modules-Hinweis im Abschnitt nach derselben Regel wie #/code, nie in git add.', '(g)')
gegenprobe('(g)', [
  ['Hinweis fehlt', pruefeNodeModules((e) => renderSichernAbschnitt(e).replace(/<p class="subtle code-node-modules">[^<]*<\/p>/g, ''))],
  ['Hinweis immer', pruefeNodeModules((e) => `${renderSichernAbschnitt(e)}<p class="subtle code-node-modules">x</p>`)],
])

// ─── (h) Server nicht gewachsen ───────────────────────────────────────────────────────────────────────────────────────

/**
 * Prüft, dass der Server nicht gewachsen ist und starteWorkflowSchritt( 6× trägt.
 * @param server - Quelltext
 * @param obergrenze - Ratsche
 * @returns Befunde
 */
function pruefeServer(server, obergrenze) {
  const b = []
  const n = zahl(server, /starteWorkflowSchritt\(/g)
  if (n !== 6) b.push(`starteWorkflowSchritt( ${n}× statt 6×`)
  const zeilen = server.split('\n').length - (server.endsWith('\n') ? 1 : 0)
  if (zeilen > obergrenze) b.push(`Server ${zeilen} Zeilen > ${obergrenze}`)
  return b
}

const SERVER = lies('scripts/leitstand-server.mjs')
const RATSCHE = JSON.parse(lies('scripts/wachstumsbremse-server.json')).obergrenze_zeilen
pruefe(pruefeServer(SERVER, RATSCHE), `(h) Server nicht gewachsen: starteWorkflowSchritt( 6×, Zeilen ≤ ${RATSCHE}.`, '(h)')
gegenprobe('(h)', [
  ['siebter Aufruf', pruefeServer(`${SERVER}\nstarteWorkflowSchritt(x)`, RATSCHE)],
  ['Server über der Ratsche', pruefeServer(`${SERVER}${'// x\n'.repeat(RATSCHE + 1)}`, RATSCHE)],
])

if (befunde.length > 0) {
  console.error(`\n✗ check-f45-b2b4a2b2-anzeige: ${befunde.length} Befund(e):`)
  for (const b of befunde) console.error(`  - ${b}`)
  process.exit(1)
}
console.log('\n✓ check-f45-b2b4a2b2-anzeige: Bereit zum Sichern – Anzeige sauber.')
