/**
 * Datei: features/F45/nachweise/fb2/render/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 FB-2 „Fähigkeit bauen — Anzeige“ (features/F45/plan-fb2.md, plan-fb2-v2.md). Abnahme am Ablauf
 * #/workflows/<id> mit der Karte „Vorgeschlagene Fähigkeiten“: entscheidbar mit drei Vorschlägen (übernehmbar, Ziel existiert,
 * ungültig ohne Adresse; lange Namen und Beschreibungen), Verwerfen zweistufig (Stufe, Abbrechen), Doppelklick auf „Übernehmen“
 * mit verzögerter 409 (Spalte „Anfragen übernehmen“ = 1, Grund wörtlich), Übernehmen 200 mit Statussatz und danach dauerhaftem
 * Hinweis „ungesichert“ (auch nach Neuladen), Lagen vorab (KLAERUNG), Lauf (Zwischenstand), entschieden (nur Hinweis), „nicht
 * bestimmbar“ und der Umfangs-Satz. de 1440/390 hell/dunkel, en/tr 1440 bzw. 390, ru 390; scrollWidth/clientWidth im Protokoll.
 *
 * Gegen die neutrale Testinstanz features/F45/nachweise/b2b3b2b2a3/instanz.mjs (Port 4408, neutrales HOME/TEMP — liefert Seite
 * und Zustand); GET /api/workflows/<id>, …/abnahme, …/code?workflow=<id> und die POSTs …/faehigkeit-vorschlag/* kommen als feste
 * Antworten mit neutralen Pfaden. Die Pfadprobe des Render-Helfers prüft vor jedem Bild den sichtbaren Text (F-1125).
 *
 * Aufruf: Testinstanz starten (node features/F45/nachweise/b2b3b2b2a3/instanz.mjs), dann
 * node features/F45/nachweise/fb2/render/erzeuge-nachweis.mjs [basis] [ansicht] — mit [ansicht] nur diese (z. B. de-1440-freigabe-n1,
 * Nachtrag F-1173 N1: nur die Freigabe-Seite).
 * Wird aufgerufen von: Hand. Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const [basis = 'http://127.0.0.1:4408', nur] = process.argv.slice(2)
const ziel = dirname(fileURLToPath(import.meta.url))
const wurzel = resolve(ziel, '../../../../..')

const ID = 'w-haushalt-faehigkeit'
const PFAD = String.raw`C:\Projekte\haushaltsbuch-laeufe\f2b3c4d5`
const BRANCH = `wf/${ID}`
const AO = { status: 'BEREIT', pfad: PFAD, branch: BRANCH, basis_commit: 'abc1234def5678' }
const SCHRITTE = [{ schritt_id: 's1', rolle: 'ausfuehrung', worker: 'claude-code', modell: 'claude-sonnet', freigabe: 'ZWINGEND', status: 'ERFOLGREICH', nachfolger: null, lauf_id: 'l-bau' }]
const H1 = 'c0ffee12ab34cd56ef7890ab12cd34ef56ab7890cd12ef34ab56cd78ef90ab12'
const H2 = '5eed00aa11bb22cc33dd44ee55ff66007788990011223344556677889900aabb'

/** Antwort von GET /api/workflows/<id>. @param status - Workflow-Status @returns Detail */
const detail = (status) => ({ daten: { ziel: 'Prüf-Skill für Monatsexporte bauen', status, schritte: SCHRITTE }, naechster: null, arbeitsordner: AO, versionSequenz: 1 })

const VORSCHLAEGE = [
  { typ: 'skill', name: 'monatsexport-pruefen-mit-sehr-langem-namen-fuer-schmale-ansichten', pfad: 'vorschlaege/faehigkeiten/skills/monatsexport-pruefen-mit-sehr-langem-namen-fuer-schmale-ansichten', beschreibung: 'Prüft einen Monatsexport (CSV) auf Summen, Datumsformat und doppelte Buchungen und meldet Abweichungen mit Zeilennummer — eine bewusst lange Beschreibung, damit Umbrüche in schmalen Ansichten sichtbar werden.', hash: H1, grund: null, ziel_existiert: false, ziel_ignoriert: false, adressierbar: true },
  { typ: 'agent', name: 'buchungsleser', pfad: 'vorschlaege/faehigkeiten/agents/buchungsleser.md', beschreibung: 'Liest Buchungen und fasst sie zusammen.', hash: H2, grund: null, ziel_existiert: true, ziel_ignoriert: false, adressierbar: true },
  { typ: null, name: null, pfad: 'vorschlaege/faehigkeiten/skills/Ohne Name', beschreibung: null, hash: null, grund: 'Ordnername ist kein gültiger Name (nur Buchstaben, Ziffern, Punkt, _ und -)', ziel_existiert: null, ziel_ignoriert: null, adressierbar: false },
]
const SKILL = VORSCHLAEGE[0]
const UNGESICHERT = { status: 'ok', pfade: [`.claude/skills/${SKILL.name}/SKILL.md`], anzahl: 1 }

/**
 * Antwort von GET …/abnahme.
 * @param felder - Überschreibungen (workflowStatus, entscheidung, faehigkeitVorschlaege, faehigkeitUngesichert, umfang)
 * @returns Abnahme
 */
const abnahme = (felder = {}) => ({
  workflowId: ID,
  workflowStatus: 'ABGESCHLOSSEN',
  freigabeHalt: null,
  entscheidung: { status: 'nicht_vorhanden' },
  urteil: { status: 'noch_nicht_gelaufen' },
  aenderungsuebersicht: { status: 'ok', laufId: 'l-bau', daten: { basis_ref: 'abc1234', gekuerzt: false, dateien: [{ status: 'A', pfad: `vorschlaege/faehigkeiten/skills/${SKILL.name}/SKILL.md`, plus: 24, minus: null }] } },
  pruefergebnis: { status: 'ok', laufId: 'l-pruef', ergebnis: 'GRUEN', exitCode: 0, versionSequenz: 1 },
  faehigkeitVorschlaege: VORSCHLAEGE,
  ...felder,
})

/** Antwort von GET …/code?workflow=<id> (200, nichts offen). @returns Antwort */
const code = () => ({
  status: 'ok',
  absoluterPfad: PFAD,
  arbeitsverzeichnis: { vorhanden: true },
  branch: { status: 'ok', name: BRANCH, losgeloest: false, commit: 'def5678abc1234' },
  basis: { status: 'ok', ref: 'origin/main', voraus: 0, zurueck: 0 },
  remoteWebUrl: { status: 'ok', url: 'https://github.com/beispiel/haushaltsbuch', origin: true },
  dateien: { status: 'ok', eintraege: [], anzahl: 0, gekappt: false, nodeModules: 0 },
  verlauf: { status: 'ok', ref: 'origin/main', eintraege: [] },
  freigabeCommit: { status: 'ok', vorhanden: false, alterMinuten: null },
  harness: { status: 'ok', claudeMd: true, settings: true, hooks: 5, agents: 5 },
  startvorlage: { status: 'ok', pfad: 'startvorlagen/beispielprojekt.json', pruefbefehl: 'npm run check', werkzeugsaetze: ['lesend'], worker: ['claude-code'], modell: 'claude-sonnet' },
  ablauf: { workflowId: ID, bedarf: 'pflicht', workflowStatus: 'ABGESCHLOSSEN', arbeitsordner: { pfad: PFAD, branch: BRANCH }, sichern: { bereit: false, art: null, grund: 'nichtsOffen', offeneAenderungen: 0, voraus: 0 } },
})

const get = (muster, json, status = 200) => ({ muster, status, json, methode: 'GET' })
/** Feste Antworten einer Lage. @param d - Detail @param a - Abnahme @returns anfragenAntworten */
const lage = (d, a) => [get(`**/api/workflows/${ID}`, d), get(`**/api/workflows/${ID}/abnahme`, a), get('**/api/code?workflow=**', code())]
const post = (aktion, status, json, extra = {}) => ({ muster: `**/api/workflows/${ID}/faehigkeit-vorschlag/${aktion}`, methode: 'POST', status, json, zaehlen: aktion, ...extra })

const KNOPF = (aktion, name = SKILL.name) => `.wf-faehigkeit-vorschlag[data-aktion="${aktion}"][data-name="${name}"]`
const KARTE = '#abnahme-faehigkeiten-titel'
const warte = (selector, timeoutMs = 15000) => ({ warteAufSelector: { selector, timeoutMs } })
const GRUND_409 = 'Ein Lauf ist aktiv (Ablauf w-anderer) — nach seinem Ende erneut versuchen'

const BEOBACHTUNG = {
  texte: [
    { name: 'Meldung', selector: '#workflow-abnahme-meldung' },
    { name: 'Hinweis ungesichert', selector: '.abnahme-faehigkeit-ungesichert' },
    { name: 'Zwischenstand', selector: '.abnahme-faehigkeiten .note:not(.amber)' },
    { name: 'Fokus', selector: ':focus', attribut: 'data-aktion' },
    { name: 'Fokus-id', selector: ':focus', attribut: 'id' },
    { name: 'Begründung', selector: '#wf-abnahme-begruendung', eigenschaft: 'value' },
  ],
  vorhanden: [
    { name: 'Karte', selector: '.abnahme-faehigkeiten' },
    { name: 'Übernehmen', selector: '.wf-faehigkeit-vorschlag[data-aktion="uebernehmen"]' },
    { name: 'Verwerfen', selector: '.wf-faehigkeit-vorschlag[data-aktion="verwerfen"]' },
    { name: 'Wirklich verwerfen', selector: '.wf-faehigkeit-vorschlag[data-aktion="verwerfen-bestaetigt"]' },
    { name: 'Knöpfe gesperrt', selector: '.wf-faehigkeit-vorschlag:disabled' },
  ],
  ueberlauf: true,
}

const NACH_UEBERNAHME = abnahme({ faehigkeitVorschlaege: VORSCHLAEGE.slice(1), faehigkeitUngesichert: UNGESICHERT })

/** Volle Folge der Seite „entscheidbar“ samt Bedienung. @param ansicht - Name @returns Schritte */
const volleFolge = (ansicht) => [
  { label: `01 entscheidbar: drei Vorschläge — ${ansicht}`, reload: true, ...warte(KARTE), screenshot: `01-entscheidbar-${ansicht}.webp` },
  { label: '02 Klick „Verwerfen“ ⇒ Stufe', klick: KNOPF('verwerfen'), ...warte(KNOPF('verwerfen-bestaetigt')), screenshot: `02-verwerfen-stufe-${ansicht}.webp` },
  { label: '03 Klick „Abbrechen“ ⇒ zurück', klick: KNOPF('abbrechen'), ...warte(KNOPF('verwerfen')) },
  {
    label: '04 Doppelklick „Übernehmen“, 409 nach 1,5 s',
    anfragenAntworten: [post('uebernehmen', 409, { grund: GRUND_409 }, { verzoegerungMs: 1500 })],
    doppelklick: KNOPF('uebernehmen'),
  },
  { label: '05 nach der 409', ...warte('#workflow-abnahme-meldung:not(:empty)'), screenshot: `05-409-${ansicht}.webp` },
  {
    label: '06 Klick „Übernehmen“ ⇒ 200, Statussatz, Hinweis dauerhaft',
    anfragenAntworten: [post('uebernehmen', 200, { typ: 'skill', name: SKILL.name, hash: H1, ziel: `.claude/skills/${SKILL.name}/`, eingeschaltet: false, hinweis: 'Die Fähigkeit liegt jetzt ungesichert unter .claude/ …' }), get(`**/api/workflows/${ID}/abnahme`, NACH_UEBERNAHME)],
    klick: KNOPF('uebernehmen'),
    ...warte('.abnahme-faehigkeit-ungesichert'),
    screenshot: `06-uebernommen-${ansicht}.webp`,
  },
  { label: '07 neu geladen ⇒ Hinweis bleibt', reload: true, ...warte('.abnahme-faehigkeit-ungesichert'), screenshot: `07-neu-geladen-${ansicht}.webp` },
]

/** Detail im Freigabe-Halt (nächster Lauf, z. B. nach „Anpassung anfordern“). */
const FREIGABE_DETAIL = { daten: { ziel: 'Prüf-Skill für Monatsexporte bauen', status: 'WARTET_FREIGABE', schritte: [{ ...SCHRITTE[0], status: 'WARTET_FREIGABE', lauf_id: null }] }, naechster: { art: 'haltFreigabe', schrittId: 's1', grund: 'Freigabe nötig' }, ungueltig: false, arbeitsordner: AO, versionSequenz: 2 }

/**
 * Freigabe-Halt mit Hinweis „ungesichert“ — seit F-1173 N1 mit dem Ausweg „von Hand committen“ statt „Bereit zum Sichern“.
 * @param ansicht - Name @returns Schritt
 */
const freigabeSchritt = (ansicht) => ({
  label: `08e Freigabe-Halt (nächster Lauf) mit Hinweis „ungesichert“ — ${ansicht}`,
  anfragenAntworten: lage(FREIGABE_DETAIL, abnahme({ workflowStatus: 'WARTET_FREIGABE', freigabeHalt: { schrittId: 's1', grund: null }, faehigkeitVorschlaege: undefined, faehigkeitUngesichert: UNGESICHERT })),
  reload: true,
  ...warte('#workflow-entscheiden .abnahme-faehigkeit-ungesichert'),
  screenshot: `08e-freigabe-${ansicht}.webp`,
})

/** Lagen außerhalb von „entscheidbar“. @param ansicht - Name @returns Schritte */
const lagenFolge = (ansicht) => [
  { label: `08 vorab (KLAERUNG) — ${ansicht}`, anfragenAntworten: lage(detail('KLAERUNG_ERFORDERLICH'), abnahme({ workflowStatus: 'KLAERUNG_ERFORDERLICH' })), reload: true, ...warte(KARTE), screenshot: `08-vorab-${ansicht}.webp` },
  { label: '08a vorab: Begründung tippen, Klick „Verwerfen“ ⇒ Stufe, Begründung bleibt', tippen: { selector: '#wf-abnahme-begruendung', text: 'Begründung bleibt stehen' }, klick: KNOPF('verwerfen'), ...warte(KNOPF('verwerfen-bestaetigt')) },
  { label: '08b „Abbrechen“ ⇒ Begründung bleibt', klick: KNOPF('abbrechen'), ...warte(KNOPF('verwerfen')) },
  {
    label: '08c Doppelklick „Verwerfen“ (Knopf ohne „Übernehmen“ davor) ⇒ nur die Stufe, kein POST',
    anfragenAntworten: [post('verwerfen', 200, { typ: 'skill', name: SKILL.name, verworfen: true })],
    doppelklick: KNOPF('verwerfen'),
    ...warte('#nie-vorhanden', 900),
    screenshot: `08c-doppelklick-verwerfen-${ansicht}.webp`,
  },
  {
    label: '08d Klick „Wirklich verwerfen?“ ⇒ ein POST verwerfen, Meldung',
    anfragenAntworten: [get(`**/api/workflows/${ID}/abnahme`, abnahme({ workflowStatus: 'KLAERUNG_ERFORDERLICH', faehigkeitVorschlaege: VORSCHLAEGE.slice(1) }))],
    klick: KNOPF('verwerfen-bestaetigt'),
    ...warte('#workflow-abnahme-meldung:not(:empty)'),
    screenshot: `08d-verworfen-${ansicht}.webp`,
  },
  freigabeSchritt(ansicht),
  { label: `09 Lauf aktiv (Zwischenstand) — ${ansicht}`, anfragenAntworten: lage(detail('LAEUFT'), abnahme({ workflowStatus: 'LAEUFT', aenderungsuebersicht: { status: 'noch_nicht_gelaufen' }, pruefergebnis: { status: 'noch_nicht_gelaufen' } })), reload: true, ...warte(KARTE), screenshot: `09-lauf-${ansicht}.webp` },
  {
    label: `10 entschieden (ANGENOMMEN), nur ungesichert — ${ansicht}`,
    anfragenAntworten: lage(detail('ABGESCHLOSSEN'), abnahme({ entscheidung: { status: 'ok', ergebnis: 'ANGENOMMEN', begruendung: 'passt', entschiedenAm: '2026-10-23T10:00:00Z', versionSequenz: 1 }, faehigkeitVorschlaege: undefined, faehigkeitUngesichert: { status: 'ok', pfade: ['.claude/agents/buchungsleser.md', '.claude/settings.local.json'], anzahl: 2 } })),
    reload: true,
    ...warte(KARTE),
    screenshot: `10-entschieden-${ansicht}.webp`,
  },
  { label: `11 nicht bestimmbar — ${ansicht}`, anfragenAntworten: lage(detail('ABGESCHLOSSEN'), abnahme({ faehigkeitVorschlaege: undefined, faehigkeitUngesichert: { status: 'nicht_bestimmbar', grund: 'zeitgrenze' } })), reload: true, ...warte(KARTE), screenshot: `11-nicht-bestimmbar-${ansicht}.webp` },
  {
    label: `12 Umfang mit Vorschlagsdateien — ${ansicht}`,
    anfragenAntworten: lage(detail('ABGESCHLOSSEN'), abnahme({ umfang: { status: 'ok', ausserhalb: ['docs/notizen.md', `vorschlaege/faehigkeiten/skills/${SKILL.name}/SKILL.md`, 'vorschlaege/faehigkeiten/agents/buchungsleser.md'], bereiche: ['src/export/'] } })),
    reload: true,
    ...warte(KARTE),
    screenshot: `12-umfang-${ansicht}.webp`,
  },
]

const ANSICHTEN = {
  'de-1440-hell': { viewport: { breite: 1440, hoehe: 1400 }, farbschema: 'light', voll: true, lagen: true },
  'de-1440-dunkel': { viewport: { breite: 1440, hoehe: 1400 }, farbschema: 'dark', voll: true },
  'de-390-hell': { viewport: { breite: 390, hoehe: 2400 }, farbschema: 'light', voll: true },
  'de-390-dunkel': { viewport: { breite: 390, hoehe: 2400 }, farbschema: 'dark', voll: true, lagen: true },
  'en-1440-hell': { viewport: { breite: 1440, hoehe: 1400 }, farbschema: 'light', sprache: 'en' },
  'tr-390-hell': { viewport: { breite: 390, hoehe: 2400 }, farbschema: 'light', sprache: 'tr' },
  'ru-390-dunkel': { viewport: { breite: 390, hoehe: 2400 }, farbschema: 'dark', sprache: 'ru', voll: true, lagen: true },
  'de-1440-200prozent': { viewport: { breite: 1440, hoehe: 1400 }, farbschema: 'dark', zoom: 2, voll: true },
  // F-1173 N1 (Nachtrag 23.10.2026): nur die Freigabe-Seite, neuer Ausweg „von Hand committen“.
  'de-1440-freigabe-n1': { viewport: { breite: 1440, hoehe: 1400 }, farbschema: 'light', nurFreigabe: true },
}

/**
 * Klickfolge einer Ansicht.
 * @param ansicht - Name
 * @param einstellung - Viewport, Farbschema, Sprache, voll (ganze Bedienfolge, sonst nur 01), lagen (übrige Lagen)
 * @returns Klickfolge
 */
function folge(ansicht, { sprache = 'de', voll = false, lagen = false, nurFreigabe = false, ...einstellung }) {
  if (nurFreigabe) return { url: `${basis}/#/workflows/${ID}`, ...einstellung, screenshotVollseite: true, localStorageSetzen: { 'leitstand-chat-offen': 'false', 'leitstand-sprache': sprache }, anfragenAntworten: freigabeSchritt(ansicht).anfragenAntworten, beobachtete: BEOBACHTUNG, schritte: [freigabeSchritt(ansicht)] }
  const schritte = voll ? volleFolge(ansicht) : volleFolge(ansicht).slice(0, 1)
  return {
    url: `${basis}/#/workflows/${ID}`,
    ...einstellung,
    screenshotVollseite: true,
    localStorageSetzen: { 'leitstand-chat-offen': 'false', 'leitstand-sprache': sprache },
    anfragenAntworten: lage(detail('ABGESCHLOSSEN'), abnahme()),
    beobachtete: BEOBACHTUNG,
    schritte: [...schritte, ...(lagen ? lagenFolge(ansicht) : [])],
  }
}

/**
 * Führt eine Klickfolge in einem eigenen Verzeichnis aus.
 * @param name - Verzeichnisname
 * @param klickfolge - Klickfolge
 */
function lauf(name, klickfolge) {
  const verzeichnis = join(ziel, name)
  mkdirSync(verzeichnis, { recursive: true })
  for (const eintrag of readdirSync(verzeichnis)) if (/\.(webp|png)$|^protokoll\./.test(eintrag)) rmSync(join(verzeichnis, eintrag))
  const datei = join(verzeichnis, 'klickfolge.json')
  writeFileSync(datei, `${JSON.stringify(klickfolge, null, 2)}\n`)
  console.log(`\n=== ${name} ===`)
  execFileSync(process.execPath, [join(wurzel, 'scripts/render-nachweis.mjs'), datei, verzeichnis], { stdio: 'inherit', cwd: wurzel })
}

for (const [ansicht, einstellung] of Object.entries(ANSICHTEN)) if (nur === undefined || nur === ansicht) lauf(ansicht, folge(ansicht, einstellung))
