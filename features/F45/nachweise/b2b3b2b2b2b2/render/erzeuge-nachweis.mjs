/**
 * Datei: features/F45/nachweise/b2b3b2b2b2b2/render/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 B2b-3b-2b-2b-2b-2 „Anzeige-Fixes aus dem Nachweislauf“ gegen die neutrale Testinstanz von 2a-3
 * (features/F45/nachweise/b2b3b2b2a3/instanz.mjs, Port 4408 — liefert nur Seite und Zustand; Workflow, Abnahme und Lauf-Detail kommen als
 * feste Antworten mit den Daten des Nachweislaufs vom 17.10.). Fälle:
 * - freigabe-auftrag : „Darf der Ablauf starten?“ mit langem Auftragstext (F-1144): 01 eingeklappt mit Vorschau, 02 nach „Ganzer Auftrag“,
 *   03 nach einem echten Neuzeichnen (der Zustand meldet ab Schritt 3 eine andere installierte Version ⇒ die Seitenzeile ändert sich,
 *   setzeHtml schreibt neu) — der Auftrag bleibt aufgeklappt (qa 1); dazu Band und Zeile der abweichenden Projekt-CLI-Version.
 * - freigabe-fehlt   : Auftrag nicht lesbar ⇒ Hinweis statt leerer Fläche.
 * - abnahme-lauf-b   : Abnahmeseite mit Lauf B — Block oben mit „Auswertung“ (Regel-Text).
 * - abnahme-fehler   : Lauf-Detail antwortet 500 ⇒ „gerade nicht ladbar“ mit Link ins Lauf-Detail (qa 2).
 * - abnahme-kanal-a  : Abnahmeseite mit dem Block „Rückfrage-Kanal im Lauf“ (F-1146, Zählung von Lauf A) und der CLI-Zeile.
 * - wastun-lauf-b    : F-760-Sichtung von Lauf B (nicht_von_stefan, automatisch 1) — „Was tun“ mit dem Regel-Text (F-1145).
 * Ansichten der drei Hauptfälle: de 1440 dunkel/hell, de 390 dunkel/hell, ru 390, de 1440 Zoom 200 %, de 1440 reduzierte Bewegung
 * (design-guardian 3); die Zusatzfälle in de 1440 und de 390. Die Pfadprobe des Render-Helfers prüft vor jedem Bild den sichtbaren Text (F-1125).
 *
 * Aufruf: Testinstanz starten (node features/F45/nachweise/b2b3b2b2a3/instanz.mjs), dann
 * node features/F45/nachweise/b2b3b2b2b2b2/render/erzeuge-nachweis.mjs [basis]
 * Wird aufgerufen von: Hand. Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const [basis = 'http://127.0.0.1:4408'] = process.argv.slice(2)
const ziel = dirname(fileURLToPath(import.meta.url))
const wurzel = resolve(ziel, '../../../../..')
const CHAT_ZU = { 'leitstand-chat-offen': 'false' }

const ANSICHTEN = {
  'de-1440': { viewport: { breite: 1440, hoehe: 1100 } },
  'de-1440-hell': { viewport: { breite: 1440, hoehe: 1100 }, farbschema: 'light' },
  'de-390': { viewport: { breite: 390, hoehe: 1600 } },
  'de-390-hell': { viewport: { breite: 390, hoehe: 1600 }, farbschema: 'light' },
  'de-1440-zoom200': { viewport: { breite: 1440, hoehe: 1100 }, zoom: 2 },
  'de-1440-reduziert': { viewport: { breite: 1440, hoehe: 1100 }, reduzierteBewegung: true },
  'ru-390': { viewport: { breite: 390, hoehe: 1600 }, localStorageSetzen: { 'leitstand-sprache': 'ru' } },
}

/** projektCliHinweis wie im Nachweislauf (haushaltsbuch2: deklariert 2.1.258, im Lauf 2.1.300). */
const PROJEKT_CLI = { art: 'cliVersionGeaendert', installiert: '2.1.300 (Claude Code)', deklariert: '2.1.258 (Claude Code)', anleitung: 'docs/harness/startfreigabe-erneuern.md#projekt-startfreigabe-erneuern' }
const NULL7 = { stefan_erlaubt: 0, stefan_abgelehnt: 0, frage_beantwortet: 0, nicht_browser: 0, abgelaufen: 0, lauf_ende: 0, automatisch: 0 }
/** Zählung der Terminalmarken aus den Auswertungen A und B (features/F45/nachweise/b2b3b2b2b/, P9 und P12). */
const KANAL_A = { ergebnis: 'ERFOLGREICH', zaehlung: { ...NULL7, stefan_erlaubt: 1, stefan_abgelehnt: 1, frage_beantwortet: 1 }, abgleich: null, abweichung: null, abgelehntDurchStefan: 1 }
const KANAL_B = { ergebnis: 'VERWEIGERT', zaehlung: { ...NULL7, automatisch: 1 }, abgleich: { art: 'abgleich', grund: 'nicht_von_stefan' }, abweichung: null, abgelehntDurchStefan: null }

/** Langer Auftragstext (über 12 Zeilen) mit HTML-Zeichen — muss als Text erscheinen. */
const AUFTRAGSTEXT = [
  'Haushaltsbuch: Monatsübersicht als CSV exportieren.',
  '',
  'Ziel: Auf der Seite „Übersicht“ ein Knopf „Als CSV herunterladen“, der die Buchungen des gewählten Monats exportiert.',
  '',
  'Anforderungen:',
  '- Spalten: Datum, Betrag, Kategorie, Notiz (in dieser Reihenfolge).',
  '- Beträge mit Punkt als Dezimaltrenner, ohne Tausendertrennzeichen.',
  '- Notizen mit Komma oder Anführungszeichen korrekt maskieren.',
  '- Leerer Monat: Datei nur mit Kopfzeile.',
  '- Dateiname: haushaltsbuch-<JJJJ-MM>.csv',
  '',
  'Nicht hier:',
  '- Kein Import, keine Excel-Datei, keine Änderung an bestehenden Buchungen.',
  '',
  'Fertig, wenn:',
  '- Tests für leeren Monat, Sonderzeichen und Sortierung grün sind.',
  '- Ein Text wie <b>fett</b> in einer Notiz erscheint wörtlich in der CSV.',
].join('\n')

const schritt = (id, rolle, status, freigabe, nachfolger, laufId) => ({ schritt_id: id, rolle, worker: rolle === 'code-reviewer' ? 'codex' : 'claude-code', modell: 'claude-sonnet', werkzeugsatz: rolle === 'ausfuehrung' ? 'schreibend' : 'lesend', freigabe, status, nachfolger, lauf_id: laufId, zeitgrenze_ms: 1800000, risiko: rolle === 'ausfuehrung' ? 'Schreibt Dateien im Arbeitsordner.' : '' })
const ZIEL = 'Monatsübersicht als CSV exportieren'
const listenEintrag = (workflowId, daten, naechster) => ({ workflowId, auftragId: daten.auftrag_id, ziel: daten.ziel, versionSequenz: 2, status: daten.status, aktiverSchrittId: daten.aktiver_schritt_id, grund: daten.grund ?? null, schritteAnzahl: daten.schritte.length, naechster })

/**
 * Freigabe-Halt vor der Ausführung.
 * @param workflowId - Kennung @param auftragstext - Text oder null (nicht lesbar)
 * @returns Fall
 */
function freigabeFall(workflowId = 'nw-freigabe', auftragstext = AUFTRAGSTEXT) {
  const daten = { workflow_id: workflowId, auftrag_id: 'nw-a', version: 1, ziel: ZIEL, status: 'WARTET_FREIGABE', aktiver_schritt_id: 's2', schritte: [schritt('s1', 'architekt', 'ERFOLGREICH', 'AUTOMATISCH', 's2', 'l-arch'), schritt('s2', 'ausfuehrung', 'OFFEN', 'ZWINGEND', 's3', null), schritt('s3', 'code-reviewer', 'OFFEN', 'AUTOMATISCH', null, null)] }
  const naechster = { art: 'haltFreigabe', schrittId: 's2', grund: 'freigabe ZWINGEND' }
  return {
    workflowId,
    antworten: [
      { muster: `**/api/workflows/${workflowId}`, json: { workflowId, versionSequenz: 2, daten, verstoesse: [], naechster, empfehlung: null, architekturEntscheidung: null, einrichtung: null, auftragstext, planFreigabe: null } },
      { muster: `**/api/workflows/${workflowId}/abnahme`, json: { workflowStatus: 'WARTET_FREIGABE', freigabeHalt: { schrittId: 's2' }, entscheidung: { status: 'nicht_vorhanden' }, urteil: { status: 'noch_nicht_gelaufen' }, aenderungsuebersicht: { status: 'noch_nicht_gelaufen' }, pruefergebnis: { status: 'noch_nicht_gelaufen' } } },
    ],
    liste: [listenEintrag(workflowId, daten, naechster)],
  }
}

/**
 * Offene Abnahme nach einem Lauf.
 * @param workflowId - Kennung @param lauf - Antwort für GET /api/laeufe/nw-lauf-a ({ json } oder { status })
 * @returns Fall
 */
function abnahmeFall(workflowId = 'nw-abnahme', lauf = { json: { laufId: 'nw-lauf-a', aktiv: false, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' }, rueckfrageKanal: KANAL_A } }) {
  const daten = { workflow_id: workflowId, auftrag_id: 'nw-a', version: 1, ziel: ZIEL, status: 'ABGESCHLOSSEN', aktiver_schritt_id: null, schritte: [schritt('s1', 'ausfuehrung', 'ERFOLGREICH', 'ZWINGEND', 's2', 'nw-lauf-a'), schritt('s2', 'code-reviewer', 'ERFOLGREICH', 'AUTOMATISCH', null, 'nw-lauf-review')] }
  const naechster = { art: 'fertig' }
  const abnahme = {
    workflowStatus: 'ABGESCHLOSSEN',
    freigabeHalt: null,
    entscheidung: { status: 'nicht_vorhanden' },
    urteil: { status: 'ok', laufId: 'nw-lauf-review', urteil: 'BEREIT', empfehlung: 'Abnehmen.', befunde: [], ak_urteile: [{ ak_id: 'AK1', urteil: 'ERFUELLT', beleg: 'Test grün.' }] },
    aenderungsuebersicht: { status: 'ok', laufId: 'nw-lauf-a', daten: { basis_ref: 'abc1234', gekuerzt: false, dateien: [{ status: 'A', pfad: 'src/export/csv.ts', plus: 42, minus: null }] } },
    pruefergebnis: { status: 'ok', laufId: 'nw-lauf-pruef', ergebnis: 'GRUEN', exitCode: 0 },
  }
  return {
    workflowId,
    antworten: [
      { muster: `**/api/workflows/${workflowId}`, json: { workflowId, versionSequenz: 3, daten, verstoesse: [], naechster, empfehlung: null, architekturEntscheidung: null, einrichtung: null, auftragstext: AUFTRAGSTEXT, planFreigabe: null } },
      { muster: `**/api/workflows/${workflowId}/abnahme`, json: abnahme },
      { muster: '**/api/laeufe/nw-lauf-a', ...lauf },
    ],
    liste: [listenEintrag(workflowId, daten, naechster)],
  }
}

/** F-760-Halt nach Lauf B (Pfadgrenze, automatisch abgelehnt). */
function laufBFall() {
  const workflowId = 'nw-lauf-b'
  const daten = {
    workflow_id: workflowId,
    auftrag_id: 'nw-a',
    version: 1,
    ziel: ZIEL,
    status: 'KLAERUNG_ERFORDERLICH',
    aktiver_schritt_id: 's1',
    grund: "Lauf endete VERWEIGERT (ohne Bypass-Verdacht). Abgelehnte Befehle: Write — menschliche Sichtung vor Fortsetzung (F-760, Schritt 's1', Lauf 'nw-lauf-b')",
    schritte: [schritt('s1', 'ausfuehrung', 'VERWEIGERT', 'ZWINGEND', 's2', 'nw-lauf-b'), schritt('s2', 'code-reviewer', 'OFFEN', 'AUTOMATISCH', null, null)],
  }
  const naechster = { art: 'haltKlaerung', grund: 'F-760', schrittId: 's1' }
  return {
    workflowId,
    antworten: [
      { muster: `**/api/workflows/${workflowId}`, json: { workflowId, versionSequenz: 2, daten, verstoesse: [], naechster, empfehlung: null, architekturEntscheidung: null, einrichtung: null, auftragstext: AUFTRAGSTEXT, planFreigabe: null } },
      { muster: `**/api/workflows/${workflowId}/abnahme`, json: { workflowStatus: 'KLAERUNG_ERFORDERLICH', freigabeHalt: null, entscheidung: { status: 'nicht_vorhanden' }, urteil: { status: 'noch_nicht_gelaufen' }, aenderungsuebersicht: { status: 'nicht_vorhanden' }, pruefergebnis: { status: 'nicht_vorhanden' } } },
      { muster: '**/api/laeufe/nw-lauf-b', json: { laufId: 'nw-lauf-b', aktiv: false, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'VERWEIGERT' }, rueckfrageKanal: KANAL_B } },
    ],
    liste: [listenEintrag(workflowId, daten, naechster)],
  }
}

const echterZustand = await (await fetch(`${basis}/api/zustand`)).json()
const warte = (selector, timeoutMs = 15000) => ({ warteAufSelector: { selector, timeoutMs } })
/** Wartet länger als zwei Poll-Takte (2 s): ein Selektor, den es nie gibt, mit Zeitgrenze — der Helfer verschluckt das Ausbleiben. */
const pause = (ms) => ({ warteAufSelector: { selector: '#gibt-es-nicht-b2b3b2b2b2b2', timeoutMs: ms } })

const BEOBACHTUNG = {
  texte: [
    { name: 'Titel', selector: '#workflow-detail-titel' },
    { name: 'Band', selector: '#start-hinweis' },
    { name: 'Band-Art', selector: '#start-hinweis', attribut: 'data-art' },
    { name: 'CLI-Zeile', selector: '.entscheiden-cli-hinweis' },
    { name: 'Auftrag-Klappe', selector: '.entscheiden-auftrag-klappe summary' },
    { name: 'Kanal-Block', selector: '#workflow-abnahme .rueckfrage-abnahme > strong' },
    { name: 'Was tun', selector: '.kanal-was-tun' },
  ],
  vorhanden: [
    { name: 'Auftragskarte', selector: '#freigabe-auftrag' },
    { name: 'Auftrag aufgeklappt', selector: '.entscheiden-auftrag-klappe[open]' },
    { name: '<b> gerendert (soll false)', selector: '.entscheiden-auftrag b' },
    { name: 'Kanal-Block auf der Abnahme', selector: '#workflow-abnahme .rueckfrage-abnahme' },
    { name: 'Sichtungs-Notiz mit Kanal-Grund', selector: '#workflow-bedienung .kanal-grund' },
  ],
  ueberlauf: true,
}

/**
 * Klickfolge eines Falls in einer Ansicht.
 * @param fall - { workflowId, antworten, liste } @param name - Fallname @param ansicht - Ansichtsname @param einstellung - Viewport/Sprache
 * @returns Klickfolge
 */
function folge(fall, name, ansicht, einstellung) {
  const schritte = []
  if (name === 'freigabe-fehlt') {
    schritte.push({ label: `Freigabe ohne lesbaren Auftrag — ${ansicht}`, ...warte('.entscheiden-auftrag-fehlt'), screenshot: `01-${ansicht}.webp` })
  } else if (name === 'abnahme-lauf-b') {
    schritte.push({ label: `Abnahmeseite mit Lauf B (Grund oben) — ${ansicht}`, ...warte('#workflow-abnahme .kanal-was-tun'), screenshot: `01-${ansicht}.webp` })
  } else if (name === 'abnahme-fehler') {
    schritte.push({ label: `Abnahmeseite, Lauf-Detail nicht ladbar — ${ansicht}`, ...warte('#workflow-abnahme .abnahme-kanal-fehler'), screenshot: `01-${ansicht}.webp` })
  } else if (name === 'freigabe-auftrag') {
    schritte.push({ label: `Freigabe mit Auftrag (eingeklappt) — ${ansicht}`, ...warte('#freigabe-auftrag'), screenshot: `01-${ansicht}.webp` })
    schritte.push({ label: `„Ganzer Auftrag“ aufgeklappt — ${ansicht}`, klick: '.entscheiden-auftrag-klappe summary', ...warte('.entscheiden-auftrag-klappe[open]'), screenshot: `02-${ansicht}.webp` })
    // qa 1: ab hier meldet der Zustand eine andere installierte Version ⇒ die Seitenzeile ändert sich, die Seite wird wirklich neu geschrieben.
    const neu = { muster: '**/api/zustand', json: { ...echterZustand, workflows: fall.liste, projektCliHinweis: { ...PROJEKT_CLI, installiert: '2.1.301 (Claude Code)' } } }
    schritte.push({ label: `nach echtem Neuzeichnen (2.1.301): bleibt aufgeklappt — ${ansicht}`, anfragenAntworten: [neu], ...pause(5000), screenshot: `03-${ansicht}.webp` })
  } else if (name === 'abnahme-kanal-a') {
    schritte.push({ label: `Abnahmeseite mit Kanal-Block (Lauf A) — ${ansicht}`, ...warte('#workflow-abnahme .rueckfrage-abnahme'), screenshot: `01-${ansicht}.webp` })
  } else {
    schritte.push({ label: `Sichtung Lauf B mit Regel-Text — ${ansicht}`, ...warte('#workflow-bedienung .kanal-was-tun'), screenshot: `01-${ansicht}.webp` })
  }
  return {
    url: `${basis}/#/workflows/${fall.workflowId}`,
    ...einstellung,
    screenshotVollseite: true,
    localStorageSetzen: { ...CHAT_ZU, ...(einstellung.localStorageSetzen ?? {}) },
    anfragenAntworten: [{ muster: '**/api/zustand', json: { ...echterZustand, workflows: fall.liste, projektCliHinweis: PROJEKT_CLI } }, ...fall.antworten],
    beobachtete: BEOBACHTUNG,
    schritte,
  }
}

const LAUF_B_DETAIL = { json: { laufId: 'nw-lauf-a', aktiv: false, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'VERWEIGERT' }, rueckfrageKanal: KANAL_B } }
const FAELLE = {
  'freigabe-auftrag': freigabeFall(),
  'abnahme-kanal-a': abnahmeFall(),
  'wastun-lauf-b': laufBFall(),
  'freigabe-fehlt': freigabeFall('nw-freigabe-fehlt', null),
  'abnahme-lauf-b': abnahmeFall('nw-abnahme-b', LAUF_B_DETAIL),
  'abnahme-fehler': abnahmeFall('nw-abnahme-fehler', { status: 500, json: { grund: 'Attrappe: Lauf-Detail nicht ladbar' } }),
}
const ZUSATZ = new Set(['freigabe-fehlt', 'abnahme-lauf-b', 'abnahme-fehler'])
for (const [name, fall] of Object.entries(FAELLE)) {
  for (const [ansicht, einstellung] of Object.entries(ANSICHTEN)) {
    if (ZUSATZ.has(name) && ansicht !== 'de-1440' && ansicht !== 'de-390') continue
    const verzeichnis = join(ziel, `${name}-${ansicht}`)
    mkdirSync(verzeichnis, { recursive: true })
    for (const eintrag of readdirSync(verzeichnis)) if (/\.(webp|png)$|^protokoll\./.test(eintrag)) rmSync(join(verzeichnis, eintrag))
    const datei = join(verzeichnis, 'klickfolge.json')
    writeFileSync(datei, `${JSON.stringify(folge(fall, name, ansicht, einstellung), null, 2)}\n`)
    console.log(`\n=== ${name}-${ansicht} ===`)
    execFileSync(process.execPath, [join(wurzel, 'scripts/render-nachweis.mjs'), datei, verzeichnis], { stdio: 'inherit', cwd: wurzel })
  }
}
