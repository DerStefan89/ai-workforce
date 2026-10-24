/**
 * Datei: features/F45/nachweise/b5a2/render/erzeuge-nachweis.mjs
 *
 * Zweck: Render-Nachweis F45 B5a-2 „Akte anzeigen“ (features/F45/plan-b5a2-v2.md). Feature-Detail #/workboard/F9: „Bearbeiten“,
 * Kachel „Entscheidungen“ (gefüllt und leer), Formular (Speichern ohne Grund gesperrt, mit Grund frei), Doppelklick „Speichern“
 * mit verzögerter 409 Hash (Spalte „Anfragen speichern“ = 1, „Neu laden“), 409 Sperre mit Link, 422 mit Verstößen, 200 mit
 * geänderten Abschnitten und Git-Block, „Auftrag vorbereiten“ gesperrt, solange das Formular offen ist, unvollständige Akte mit
 * Warnhinweis. Coach #/chat: „Als Feature anlegen“ unter dem Entwurf, Doppelklick mit verzögerter 201 (Zähler 1), Ergebnis mit
 * Link und Git-Block, nach Neuladen wieder der Knopf (bekannte Grenze), 409 wörtlich. de 1440 hell/390 dunkel/200 %, en/tr/ru.
 *
 * Gegen die neutrale Testinstanz features/F45/nachweise/b2b3b2b2a3/instanz.mjs (Port 4408, neutrales HOME/TEMP — liefert Seite
 * und Zustand); Workitems, Aufträge, Roadmap, Akte, PUT/POST und der Coach-Verlauf kommen als feste Antworten mit neutralen
 * Pfaden. Die Pfadprobe des Render-Helfers prüft vor jedem Bild den sichtbaren Text (F-1125).
 *
 * Aufruf: Testinstanz starten (node features/F45/nachweise/b2b3b2b2a3/instanz.mjs), dann
 * node features/F45/nachweise/b5a2/render/erzeuge-nachweis.mjs [basis] [ansicht]
 * Wird aufgerufen von: Hand. Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const [basis = 'http://127.0.0.1:4408', nur] = process.argv.slice(2)
const ziel = dirname(fileURLToPath(import.meta.url))
const wurzel = resolve(ziel, '../../../../..')

const HASH = 'a1b2c3d4'.repeat(8)
const HASH_NEU = 'f0e1d2c3'.repeat(8)
const FEATURE = { quelle: 'feature', typ: 'FEATURE', id: 'F9', titel: 'Monatsexport prüfen', status: 'IN_ARBEIT', pfad: 'features/F9/feature.md' }
const ENTSCHEIDUNGEN = [
  { id: 'E-F9-1', text: '**E-F9-1 = A** (Stefan, 20.10.2026) — CSV mit Semikolon als Standard.' },
  { id: 'E-F9-2', text: '**E-F9-2 = B** (Stefan, 21.10.2026) — Doppelte Buchungen werden gemeldet, nicht entfernt; eine bewusst lange Entscheidung, damit der Umbruch in schmalen Ansichten sichtbar wird.' },
  { id: 'E-F9-3', text: '**E-F9-3 = A** (Stefan, 22.10.2026) — Datumsformat TT.MM.JJJJ.' },
]
const AKTE = {
  status: 'ok',
  id: 'F9',
  titel: 'Monatsexport prüfen',
  featureStatus: 'IN_ARBEIT',
  ziel: 'Ein Monatsexport (CSV) wird vor dem Versand geprüft: Summen, Datumsformat und doppelte Buchungen.',
  nicht_ziele: ['Kein automatisches Korrigieren der Buchungen', 'Keine Bankanbindung'],
  akzeptanzkriterien: [
    { id: 'AK1', text: 'Abweichende Summen werden mit Zeilennummer gemeldet.' },
    { id: 'AK2', text: 'Ein falsches Datumsformat wird erkannt.' },
  ],
  hash: HASH,
  entscheidungen: ENTSCHEIDUNGEN,
}
const AKTE_NEU = { ...AKTE, ziel: `${AKTE.ziel} Ergebnis als Liste.`, akzeptanzkriterien: [...AKTE.akzeptanzkriterien, { id: 'AK3', text: 'Doppelte Buchungen werden gemeldet.' }], hash: HASH_NEU }
const UNVOLLSTAENDIG = { status: 'unvollstaendig', id: 'F9', grund: "Abschnitt '## Akzeptanzkriterien' fehlt oder ist leer", featureStatus: 'IN_ARBEIT', hash: HASH, entscheidungen: [] }
const GIT = ['& {', "  Set-Location -LiteralPath 'C:\\Projekte\\haushaltsbuch'", '  git add -- features/F9/feature.md', "  git commit -m 'F9: Akte bearbeitet (Ziel, Akzeptanzkriterien) — AK3 ergänzt' -- features/F9/feature.md", '}']
const SCOPE = { titel: 'Skill: Monatsexport prüfen', problem: 'Fehler im Export fallen erst beim Steuerberater auf.', ziel: 'Ein Skill prüft den Export vor dem Versand.', in_scope: ['Auslöser: Export liegt unter exports/', 'Gutes Beispiel: falsche Summe mit Zeile 14'], out_of_scope: ['Nicht bei Entwürfen auslösen'], annahmen: [], offene_fragen: [], erfolgskriterium: 'Drei echte Fehler im Oktober-Export gefunden.' }

const get = (muster, json, status = 200, extra = {}) => ({ muster, status, json, methode: 'GET', ...extra })
const put = (status, json, extra = {}) => ({ muster: '**/api/features/F9/akte', methode: 'PUT', status, json, zaehlen: 'speichern', ...extra })
const post = (status, json, extra = {}) => ({ muster: '**/api/features', methode: 'POST', status, json, zaehlen: 'anlegen', ...extra })
const BASIS = [
  get('**/api/workitems**', { workitems: [FEATURE], befunde: [] }),
  get('**/api/auftraege', []),
  get('**/api/roadmap', { status: 'ok', vision: 'Haushaltsbuch', meilensteine: [{ id: 'M2', titel: 'M2 Export', features: [{ id: 'F9', titel: 'Monatsexport prüfen', status: 'IN_ARBEIT' }] }] }),
  get('**/api/features/F9/akte', AKTE),
]
const SPARRING = (auftragErstelltId = null) => get('**/api/sparring', { verlauf: [{ laufId: 'lauf-coach-1', nachricht: 'Ich möchte einen Skill, der meinen Monatsexport prüft.', coachAntwort: { art: 'scope_entwurf', antwort: 'Hier ist der Entwurf — Auslöser, Beispiele, Grenzen und Erfolgskriterium sind geklärt.', scope: SCOPE }, modus: 'feature', auftragErstelltId }] })
const CHAT = [get('**/api/chat', { verlauf: [] }), SPARRING()]

const warte = (selector, timeoutMs = 15000) => ({ warteAufSelector: { selector, timeoutMs } })
const SPEICHERN = '[data-akte-aktion="speichern"]'
const MELDUNG = '#workboard-akte-formular [data-akte-fokus]'

const BEOBACHTUNG = {
  texte: [
    { name: 'Meldung', selector: MELDUNG },
    { name: 'Fokus-id', selector: ':focus', attribut: 'id' },
    { name: 'Fokus-Aktion', selector: ':focus', attribut: 'data-akte-aktion' },
    { name: 'Grund', selector: '#akte-grund', eigenschaft: 'value' },
    { name: 'Ziel', selector: '#akte-ziel', eigenschaft: 'value' },
    { name: 'Sperre Auftrag', selector: '#workboard-auftrag-sperre' },
    { name: 'Coach-Ergebnis', selector: '.chat-feature-ergebnis' },
  ],
  vorhanden: [
    { name: 'Bearbeiten', selector: '#akte-bearbeiten' },
    { name: 'Formular', selector: '.akte-formular' },
    { name: 'Speichern gesperrt', selector: `${SPEICHERN}:disabled` },
    { name: 'Warnhinweis', selector: '[data-akte-warnung]' },
    { name: 'Auftrag vorbereiten gesperrt', selector: '#workboard-bauen:disabled' },
    { name: 'Entscheidungen', selector: '.eintrag-entscheidungen' },
    { name: 'Als Feature anlegen', selector: '.chat-feature-anlegen-btn' },
    { name: 'Feature angelegt', selector: '[data-feature-ergebnis="ok"]' },
    // Genau eine Live-Region im Dokument (die Persona; #plugins-status ist die entschiedene Ausnahme F-1094) — darf nicht vorhanden
    // sein (Muster nachweise/b0).
    { name: 'weitere Live-Region (darf nicht)', selector: '[aria-live]:not(#persona-text-status):not(#plugins-status), [role=status], [role=alert], [role=log]' },
  ],
  ueberlauf: true,
}

/** Detail mit „Bearbeiten“ und der Bedienfolge des Formulars. @param ansicht - Name @returns Schritte */
const detailFolge = (ansicht) => [
  { label: `01 Detail: „Bearbeiten“, Entscheidungen — ${ansicht}`, reload: true, ...warte('#akte-bearbeiten'), screenshot: `01-detail-${ansicht}.webp` },
  { label: '02 Klick „Bearbeiten“ ⇒ Formular, Speichern ohne Grund gesperrt, „Auftrag vorbereiten“ gesperrt', klick: '#akte-bearbeiten', ...warte('.akte-formular'), screenshot: `02-formular-${ansicht}.webp` },
  { label: '03 Grund tippen ⇒ Speichern frei', tippen: { selector: '#akte-grund', text: 'AK3 ergänzt nach Review' }, ...warte(`${SPEICHERN}:not(:disabled)`) },
  { label: '03b Ziel ändern, dann eine andere Seite (#/chat)', tippen: { selector: '#akte-ziel', text: 'Geändertes Ziel bleibt nach Rückkehr stehen.' }, navigiere: '#/chat', ...warte('#view-chat') },
  { label: '03c zurück zum Feature ⇒ Formular mit den getippten Werten (Prüfpass cr K1, qa AT-1)', navigiere: '#/workboard/F9', ...warte('.akte-formular'), screenshot: `03-rueckkehr-${ansicht}.webp` },
  { label: '04 Doppelklick „Speichern“, 409 Hash nach 1,5 s', anfragenAntworten: [put(409, { grund: 'Die Akte wurde seit dem Lesen geändert — neu laden und erneut bearbeiten', hash: HASH_NEU }, { verzoegerungMs: 1500 })], doppelklick: SPEICHERN },
  { label: '05 nach der 409 Hash: Hinweis, „Neu laden“, Eingaben bleiben', ...warte('[data-akte-aktion="neu-laden"]'), screenshot: `05-409-hash-${ansicht}.webp` },
]

/** Weitere Antwortfälle und das Ergebnis. @param ansicht - Name @returns Schritte */
const faelleFolge = (ansicht) => [
  { label: '06 Klick „Neu laden“ ⇒ Formular zu, Akte neu geladen', klick: '[data-akte-aktion="neu-laden"]', ...warte('#akte-bearbeiten') },
  { label: '07 Bearbeiten, Grund, Speichern ⇒ 409 Sperre mit Link', anfragenAntworten: [put(409, { grund: "Ablauf 'w-haushalt-export' (Status LAEUFT) arbeitet an F9 — Akte erst nach dessen Ende bearbeiten", workflowId: 'w-haushalt-export' })], klick: '#akte-bearbeiten', ...warte('.akte-formular') },
  { label: '07b Grund tippen und speichern', tippen: { selector: '#akte-grund', text: 'AK3 ergänzt' }, klick: SPEICHERN, ...warte('#workboard-akte-formular a[href^="#/workflows/"]'), screenshot: `07-409-sperre-${ansicht}.webp` },
  { label: '08 Speichern ⇒ 422 mit Verstößen', anfragenAntworten: [put(422, { grund: 'Das Ergebnis bestünde das Feature-Akte-Gate nicht', verstoesse: ['Status fehlt oder unbekannt', 'Abschnitt „## Nicht-Ziele“ enthält eine leere Zeile <leer>'] })], klick: SPEICHERN, ...warte('.akte-verstoesse'), screenshot: `08-422-${ansicht}.webp` },
  { label: '09 Speichern ⇒ 200, geänderte Abschnitte, Git-Block, Akte neu', anfragenAntworten: [put(200, { status: 'ok', id: 'F9', hash: HASH_NEU, geaendert: ['Ziel', 'Akzeptanzkriterien'], git: GIT }), get('**/api/features/F9/akte', AKTE_NEU)], klick: SPEICHERN, ...warte('.akte-formular[data-phase="gespeichert"]'), screenshot: `09-gespeichert-${ansicht}.webp` },
  { label: '10 unvollständige Akte ⇒ Formular mit Warnhinweis', anfragenAntworten: [get('**/api/features/F9/akte', UNVOLLSTAENDIG)], reload: true, ...warte('#akte-bearbeiten') },
  { label: '10b Klick „Bearbeiten“ ⇒ Warnhinweis sichtbar', klick: '#akte-bearbeiten', ...warte('[data-akte-warnung]'), screenshot: `10-unvollstaendig-${ansicht}.webp` },
  { label: '11 Akte ohne Entscheidungen ⇒ ruhiger Leersatz', anfragenAntworten: [get('**/api/features/F9/akte', { ...AKTE, entscheidungen: [] })], reload: true, ...warte('#akte-bearbeiten'), screenshot: `11-entscheidungen-leer-${ansicht}.webp` },
]

/** Coach: „Als Feature anlegen“. @param ansicht - Name @param voll - ganze Folge @returns Schritte */
const coachFolge = (ansicht, voll) => [
  { label: `20 Coach-Entwurf mit „Als Feature anlegen“ — ${ansicht}`, ...warte('.chat-feature-anlegen-btn'), screenshot: `20-coach-${ansicht}.webp` },
  ...(voll
    ? [
        { label: '21 Doppelklick „Als Feature anlegen“, 201 nach 1,5 s', anfragenAntworten: [post(201, { status: 'ok', id: 'F21', hash: HASH, git: GIT.map((z) => z.replaceAll('F9', 'F21').replace(/Akte bearbeitet.*— AK3 ergänzt/, 'Akte angelegt aus Coach-Scope')) }, { verzoegerungMs: 1500 })], doppelklick: '.chat-feature-anlegen-btn' },
        { label: '22 Ergebnis: F21 mit Link und Git-Block', ...warte('[data-feature-ergebnis="ok"]'), screenshot: `22-coach-angelegt-${ansicht}.webp` },
        { label: '23 neu geladen ⇒ Knopf wieder da (bekannte Grenze, F-1182)', anfragenAntworten: [post(201, { status: 'ok', id: 'F22', hash: HASH, git: null })], reload: true, ...warte('.chat-feature-anlegen-btn') },
        { label: '23b erneuter Klick ⇒ zweite Akte F22 (wie der echte Server: nächste freie Nummer) — bekannte Grenze F-1182', klick: '.chat-feature-anlegen-btn', ...warte('[data-feature-ergebnis="ok"]'), screenshot: `23-coach-zweite-akte-${ansicht}.webp` },
        { label: '24 Wettlauf: Anlage auf eine eben belegte ID ⇒ 409 wörtlich', anfragenAntworten: [post(409, { grund: 'features/F23/feature.md existiert bereits — nichts überschrieben', id: 'F23' })], reload: true, ...warte('.chat-feature-anlegen-btn') },
        { label: '24b Klick ⇒ 409 sichtbar', klick: '.chat-feature-anlegen-btn', ...warte('[data-feature-ergebnis="abgelehnt"]'), screenshot: `24-coach-409-${ansicht}.webp` },
      ]
    : []),
]

const ANSICHTEN = {
  'de-1440-hell': { viewport: { breite: 1440, hoehe: 1400 }, farbschema: 'light', detail: true, faelle: true, coach: true },
  'de-390-dunkel': { viewport: { breite: 390, hoehe: 2600 }, farbschema: 'dark', detail: true, faelle: true, coach: true },
  'de-1440-200prozent': { viewport: { breite: 1440, hoehe: 1400 }, farbschema: 'dark', zoom: 2, detail: true },
  'en-1440-hell': { viewport: { breite: 1440, hoehe: 1400 }, farbschema: 'light', sprache: 'en', kurz: true },
  'tr-390-hell': { viewport: { breite: 390, hoehe: 2600 }, farbschema: 'light', sprache: 'tr', kurz: true },
  'ru-390-dunkel': { viewport: { breite: 390, hoehe: 2600 }, farbschema: 'dark', sprache: 'ru', detail: true, coach: true },
}

/**
 * Klickfolge einer Ansicht.
 * @param ansicht - Name
 * @param einstellung - Viewport, Farbschema, Sprache und welche Folgen laufen
 * @returns Klickfolge
 */
function folge(ansicht, { sprache = 'de', detail = false, faelle = false, coach = false, kurz = false, ...einstellung }, art) {
  const schritte = art === 'coach' ? coachFolge(ansicht, coach) : [...(detail ? detailFolge(ansicht) : detailFolge(ansicht).slice(0, 2)), ...(faelle ? faelleFolge(ansicht) : [])]
  return {
    url: art === 'coach' ? `${basis}/#/chat` : `${basis}/#/workboard/F9`,
    ...einstellung,
    screenshotVollseite: true,
    localStorageSetzen: { 'leitstand-chat-offen': 'false', 'leitstand-sprache': sprache, 'leitstand-chat-modus': 'sparring', 'leitstand-chat-sparring-untermodus': 'feature' },
    anfragenAntworten: [...BASIS, ...CHAT],
    beobachtete: BEOBACHTUNG,
    schritte,
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

for (const [ansicht, einstellung] of Object.entries(ANSICHTEN)) {
  if (nur !== undefined && nur !== ansicht) continue
  lauf(ansicht, folge(ansicht, einstellung, 'detail'))
  if (einstellung.coach || einstellung.kurz) lauf(`${ansicht}-coach`, folge(ansicht, einstellung, 'coach'))
}
