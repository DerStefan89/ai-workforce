/**
 * Datei: scripts/leitstand/routen-harness.mjs
 *
 * Zweck: Leseroute GET /api/harness und GET /api/harness/datei (F46 D6, docs/design/abgleich-f46.md
 * §4.14) — was die Workforce beim Arbeiten an diesem Projekt lädt, prüft und befolgt: eine FESTE Liste
 * bekannter Orte unter der Repo-Wurzel, gruppiert in sechs Bausteine (HARNESS_BAUSTEINE), dazu der
 * gekappte Inhalt genau einer Datei daraus. Rein lesend — der Server schreibt hier nichts.
 *
 * Felder von GET /api/harness (wirft nie; Fehler stehen als Feldstatus am Eintrag, nie ein 500):
 * - status: 'ok'; absoluterPfad (Repo-Wurzel für „In VS Code öffnen“); name (letzter Teil der Wurzel)
 * - bausteine: [{ id, ort, eintraege: [Eintrag] }] in der Reihenfolge von HARNESS_BAUSTEINE
 * - Eintrag: { pfad, art: 'datei' | 'ordner', vorhanden, status: 'ok' | 'fehler', grund?, geschuetzt?,
 *   groesse? und geaendert? (Datei), anzahl?, muster?, eintraege? und gekappt? (Ordner) }
 *   Ein Ordner wird nur EINE Ebene tief gelesen und gezählt (mit `muster` nur passende Dateien), nie
 *   rekursiv; `eintraege` nennt höchstens MAX_ORDNER_EINTRAEGE direkte Einträge { name, art: 'datei' |
 *   'ordner' | 'sonstiges', groesse?, geaendert? }. Namen mit führendem Punkt zählen nicht (.gitkeep).
 *
 * GET /api/harness/datei?pfad=<repo-relativer Pfad>:
 * - Allowlist: `pfad` muss exakt ein vorhandener Datei-Eintrag der eben gebauten Liste sein oder eine
 *   direkte Datei (art 'datei') aus `eintraege` eines gelisteten Ordners. Kein Pfad wird aus der Anfrage
 *   gebaut — die Anfrage wählt nur aus der Liste, gelesen wird der Pfad aus der Liste.
 * - Vorher syntaktisch geprüft (pruefeHarnessPfad: Text, Länge, keine Steuerzeichen, nicht absolut, kein
 *   '..', kein Backslash); Verstoß oder nicht in der Liste → 400 { grund }.
 * - Gelesen über leseKontextDatei (routen-projektakte.mjs): realpath unter der echten Repo-Wurzel (eine
 *   Verknüpfung nach außen ist 'fehler'), nur reguläre Dateien, höchstens MAX_BYTES (64 KB, Feld
 *   'gekuerzt'). Enthält der gelesene Teil ein NUL-Byte, ist die Datei 'binaer' und es geht kein Text raus.
 * - Antwort 200 { status: 'ok' | 'binaer' | 'fehlt' | 'fehler', pfad, absolut?, text?, gekuerzt?, groesse?,
 *   geaendert?, grund? }.
 *
 * Sicherheitsgrenzen: nur GET; Herkunft wie /api/code (pruefeHarnessHerkunft, Sec-Fetch-Site); die
 * Host-Allowlist (F-814) greift zentral davor. Nicht gepollt — der Client fragt beim Betreten von
 * #/capabilities, per „Neu laden“ und beim Projektwechsel.
 *
 * Bekannte Grenzen (Prüfpass D6, cr 3; Durchsetzungsgrad: geprüft, nicht ERZWUNGEN):
 * - Zwischen realpath-Prüfung und Öffnen (leseKontextDatei) liegt ein Zeitfenster; wer im Repo schreiben kann,
 *   könnte eine Datei in diesem Moment gegen eine Verknüpfung nach außen tauschen.
 * - Ein Hardlink auf eine Datei außerhalb der Repo-Wurzel ist über realpath nicht erkennbar.
 *   Beides setzt Schreibzugriff auf das Repo voraus.
 * - Die Route liefert auch die Einstellungsdatei unter .claude/ aus (nur lesend, E-F46-2). Trüge ein Projekt dort
 *   Geheimnisse (etwa im env-Block), wären sie im Leitstand lesbar — gegen fremde Seiten durch Sec-Fetch-Site und
 *   die Host-Allowlist geschützt, für lokale Werkzeuge ohne diese Köpfe (curl) nicht.
 *
 * Wird aufgerufen von:
 * - scripts/leitstand-server.mjs (GET /api/harness, GET /api/harness/datei, je Projektinstanz über den
 *   Dispatcher)
 * - scripts/leitstand/routen-harness.test.mjs (node:test)
 *
 * Wichtig: Dateiinhalte und Namen gehen roh (als Text) an den Client; dort werden sie escaped und nie als
 * HTML oder Markdown gerendert (public/leitstand/views/harness-aufbau.js).
 */

import { lstatSync, readdirSync, realpathSync, statSync } from 'node:fs'
import { basename, isAbsolute, relative, resolve } from 'node:path'
import { leseKontextDatei, MAX_BYTES } from './routen-projektakte.mjs'

export { MAX_BYTES }

/** Höchstzahl direkter Einträge, die je Ordner genannt werden (gezählt wird trotzdem alles). */
export const MAX_ORDNER_EINTRAEGE = 200

/** Höchstlänge des Parameters pfad. */
const MAX_PFAD_LAENGE = 300

/** Steuerzeichen (C0, DEL) im Parameter pfad. */
const STEUERZEICHEN = /[\u0000-\u001f\u007f]/

/**
 * Die feste Liste: sechs Bausteine mit ihren bekannten Orten (repo-relativ, '/' als Trenner). `geschuetzt`
 * kennzeichnet Bremsen (nur lesend, E-F46-2); `muster` zählt in einem Ordner nur passende Dateinamen.
 */
export const HARNESS_BAUSTEINE = Object.freeze([
  {
    id: 'regeln',
    ort: '/',
    eintraege: [
      { pfad: 'CLAUDE.md', art: 'datei' },
      { pfad: 'ARCHITECTURE.md', art: 'datei' },
      { pfad: 'README.md', art: 'datei' },
    ],
  },
  {
    id: 'wissen',
    ort: 'docs/',
    eintraege: [
      { pfad: 'docs/STATUS.md', art: 'datei' },
      { pfad: 'docs/adr', art: 'ordner' },
      { pfad: 'docs/projekt/kontext', art: 'ordner' },
      { pfad: 'docs/harness', art: 'ordner' },
    ],
  },
  {
    id: 'gedaechtnis',
    ort: 'state/',
    eintraege: [
      { pfad: 'state/findings.md', art: 'datei' },
      { pfad: 'state/gates.md', art: 'datei' },
      { pfad: 'state/assumption-ledger.md', art: 'datei' },
      { pfad: 'state/triggers.md', art: 'datei' },
      { pfad: 'state/memory-map.md', art: 'datei' },
      { pfad: 'state/tooling.md', art: 'datei' },
      { pfad: 'state/zwischenstand', art: 'ordner' },
    ],
  },
  {
    id: 'rollen',
    ort: '.claude/',
    eintraege: [
      { pfad: '.claude/agents', art: 'ordner' },
      { pfad: '.claude/skills', art: 'ordner' },
      { pfad: '.claude/commands', art: 'ordner' },
    ],
  },
  {
    id: 'bremsen',
    ort: '.claude/',
    eintraege: [
      { pfad: '.claude/settings.json', art: 'datei', geschuetzt: true },
      { pfad: '.claude/hooks', art: 'ordner', geschuetzt: true },
    ],
  },
  {
    id: 'pruefung',
    ort: 'scripts/ · .github/',
    eintraege: [
      { pfad: 'scripts', art: 'ordner', muster: 'check-*.mjs' },
      { pfad: '.github/workflows', art: 'ordner' },
      { pfad: '.worktreeinclude', art: 'datei' },
    ],
  },
])

/**
 * Regel eines Musters wie 'check-*.mjs' als Prüffunktion. Testdateien (*.test.mjs) zählen nie mit — sie
 * prüfen ein Prüfskript, sind aber selbst keins. Rein.
 * @param muster - Muster mit genau einem '*'
 * @returns (name) => boolean
 */
function musterRegel(muster) {
  const [vorne, hinten] = muster.split('*')
  return (name) => name.startsWith(vorne) && name.endsWith(hinten) && name.length >= vorne.length + hinten.length && !name.endsWith('.test.mjs')
}

/**
 * Liegt der echte Ort (Verknüpfungen aufgelöst) unter der echten Repo-Wurzel?
 * @param wurzelEcht - realpath der Repo-Wurzel
 * @param absolut - aufgelöster Pfad
 * @returns true, wenn innerhalb (die Wurzel selbst zählt nicht)
 */
function liegtEchtInnerhalb(wurzelEcht, absolut) {
  const rel = relative(wurzelEcht, realpathSync(absolut))
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)
}

/**
 * Ein Ordner eine Ebene tief: Anzahl (ohne Punkt-Namen, mit Muster nur passende Dateien) und höchstens
 * MAX_ORDNER_EINTRAEGE direkte Einträge, nach Namen sortiert.
 * @param absolut - Ordnerpfad
 * @param muster - Muster oder undefined
 * @returns { anzahl, eintraege, gekappt }
 */
function leseOrdnerEbene(absolut, muster) {
  const passt = muster === undefined ? () => true : musterRegel(muster)
  const alle = readdirSync(absolut, { withFileTypes: true })
    .filter((e) => !e.name.startsWith('.'))
    .filter((e) => (muster === undefined ? true : e.isFile() && passt(e.name)))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
  const eintraege = alle.slice(0, MAX_ORDNER_EINTRAEGE).map((e) => {
    if (e.isDirectory()) return { name: e.name, art: 'ordner' }
    // Nur eine reguläre Datei (keine Verknüpfung, kein Gerät) ist im Detail lesbar.
    if (!e.isFile()) return { name: e.name, art: 'sonstiges' }
    try {
      const info = statSync(resolve(absolut, e.name))
      return { name: e.name, art: 'datei', groesse: info.size, geaendert: info.mtime.toISOString() }
    } catch {
      return { name: e.name, art: 'datei' }
    }
  })
  return { anzahl: alle.length, eintraege, gekappt: alle.length > eintraege.length }
}

/**
 * Liest einen Eintrag der festen Liste. Wirft nie.
 * @param wurzel - aufgelöste Repo-Wurzel
 * @param wurzelEcht - realpath der Repo-Wurzel (oder null, wenn sie nicht existiert)
 * @param vorgabe - Eintrag aus HARNESS_BAUSTEINE
 * @returns Eintrag der Antwort
 */
function leseEintrag(wurzel, wurzelEcht, vorgabe) {
  const basis = { pfad: vorgabe.pfad, art: vorgabe.art, ...(vorgabe.geschuetzt ? { geschuetzt: true } : {}), ...(vorgabe.muster ? { muster: vorgabe.muster } : {}) }
  const absolut = resolve(wurzel, vorgabe.pfad)
  try {
    if (wurzelEcht === null) return { ...basis, vorhanden: false, status: 'ok' }
    lstatSync(absolut)
  } catch (fehler) {
    if (fehler?.code === 'ENOENT' || fehler?.code === 'ENOTDIR') return { ...basis, vorhanden: false, status: 'ok' }
    return { ...basis, vorhanden: false, status: 'fehler', grund: fehler instanceof Error ? fehler.message : String(fehler) }
  }
  try {
    if (!liegtEchtInnerhalb(wurzelEcht, absolut)) return { ...basis, vorhanden: true, status: 'fehler', grund: 'Verknüpfung zeigt außerhalb der Repo-Wurzel' }
    const info = statSync(absolut)
    if (vorgabe.art === 'datei') {
      if (!info.isFile()) return { ...basis, vorhanden: true, status: 'fehler', grund: 'keine Datei' }
      return { ...basis, vorhanden: true, status: 'ok', groesse: info.size, geaendert: info.mtime.toISOString() }
    }
    if (!info.isDirectory()) return { ...basis, vorhanden: true, status: 'fehler', grund: 'kein Ordner' }
    return { ...basis, vorhanden: true, status: 'ok', geaendert: info.mtime.toISOString(), ...leseOrdnerEbene(absolut, vorgabe.muster) }
  } catch (fehler) {
    // Eine kaputte Verknüpfung (realpath scheitert) ist vorhanden, aber nicht lesbar.
    return { ...basis, vorhanden: true, status: 'fehler', grund: fehler instanceof Error ? fehler.message : String(fehler) }
  }
}

/**
 * Baut die Projektion für GET /api/harness. Wirft nie.
 * @param optionen - { repoWurzel } aus der Serverinstanz
 * @returns { status: 'ok', absoluterPfad, name, bausteine }
 */
export function baueHarnessProjektion({ repoWurzel }) {
  const wurzel = resolve(repoWurzel)
  let wurzelEcht = null
  try {
    wurzelEcht = realpathSync(wurzel)
  } catch (fehler) {
    // Eine fehlende Wurzel heißt nur „nichts vorhanden“; alles andere wird geloggt.
    if (fehler?.code !== 'ENOENT') console.error('GET /api/harness: Repo-Wurzel nicht lesbar:', fehler)
  }
  return {
    status: 'ok',
    absoluterPfad: wurzel,
    name: basename(wurzel),
    bausteine: HARNESS_BAUSTEINE.map((b) => ({ id: b.id, ort: b.ort, eintraege: b.eintraege.map((v) => leseEintrag(wurzel, wurzelEcht, v)) })),
  }
}

/**
 * Alle im Detail lesbaren Pfade einer Projektion: vorhandene Datei-Einträge ohne Fehler und die direkten
 * Dateien (art 'datei') gelisteter Ordner. Rein.
 * @param projektion - Ergebnis von baueHarnessProjektion
 * @returns Map pfad → { groesse?, geaendert? }
 */
export function lesbareHarnessPfade(projektion) {
  const pfade = new Map()
  for (const baustein of projektion?.bausteine ?? []) {
    for (const e of baustein.eintraege ?? []) {
      if (e.vorhanden !== true || e.status !== 'ok') continue
      if (e.art === 'datei') pfade.set(e.pfad, { groesse: e.groesse, geaendert: e.geaendert })
      else for (const kind of e.eintraege ?? []) if (kind.art === 'datei') pfade.set(`${e.pfad}/${kind.name}`, { groesse: kind.groesse, geaendert: kind.geaendert })
    }
  }
  return pfade
}

/**
 * Syntaktische Prüfung des Parameters pfad von /api/harness/datei (ohne Allowlist). Rein.
 * @param pfad - Wert des Query-Parameters
 * @returns null (zulässig) oder ein Grund
 */
export function pruefeHarnessPfad(pfad) {
  if (typeof pfad !== 'string' || pfad === '') return 'Parameter pfad fehlt'
  if (pfad.length > MAX_PFAD_LAENGE) return 'Parameter pfad ist zu lang'
  if (STEUERZEICHEN.test(pfad)) return 'Parameter pfad enthält Steuerzeichen'
  if (pfad.includes('\\')) return 'Parameter pfad enthält einen Backslash'
  if (isAbsolute(pfad) || /^[A-Za-z]:/.test(pfad) || pfad.startsWith('/')) return 'Parameter pfad ist absolut'
  if (pfad.split('/').includes('..')) return 'Parameter pfad enthält ".."'
  return null
}

/**
 * Baut die Antwort für GET /api/harness/datei. Wirft nie.
 * @param optionen - { repoWurzel, pfad } — pfad ist der rohe Query-Parameter
 * @returns { http: 200 | 400, koerper }
 */
export function baueHarnessDatei({ repoWurzel, pfad }) {
  const ungueltig = pruefeHarnessPfad(pfad)
  if (ungueltig !== null) return { http: 400, koerper: { grund: ungueltig } }
  // Allowlist gegen die eben gebaute Liste (exakter Vergleich der Zeichenkette).
  const lesbar = lesbareHarnessPfade(baueHarnessProjektion({ repoWurzel }))
  if (!lesbar.has(pfad)) return { http: 400, koerper: { grund: 'pfad steht nicht in der Liste des Harness' } }
  const treffer = pfad
  const meta = lesbar.get(treffer)
  const gelesen = leseKontextDatei(repoWurzel, treffer)
  if (gelesen.status !== 'ok') return { http: 200, koerper: { status: gelesen.status, pfad: treffer, ...(gelesen.grund ? { grund: gelesen.grund } : {}) } }
  const kopf = { pfad: treffer, absolut: gelesen.absolut, groesse: meta.groesse, geaendert: meta.geaendert }
  if (gelesen.text.includes('\u0000')) return { http: 200, koerper: { status: 'binaer', ...kopf } }
  return { http: 200, koerper: { status: 'ok', ...kopf, text: gelesen.text, gekuerzt: gelesen.gekuerzt } }
}

/**
 * Herkunft einer Anfrage an /api/harness*: wie /api/code (pruefeCodeHerkunft) — ein Browser schickt
 * Sec-Fetch-Site mit; alles außer 'same-origin' und 'none' kommt von einer fremden Seite und wird
 * abgelehnt. Ohne den Kopf (curl, Node-fetch) bleibt die Anfrage zulässig. Rein.
 * @param req - Anfrage (nur headers)
 * @returns null (zulässig) oder ein Grund
 */
export function pruefeHarnessHerkunft(req) {
  const herkunft = req?.headers?.['sec-fetch-site']
  if (typeof herkunft !== 'string' || herkunft === 'same-origin' || herkunft === 'none') return null
  return `Anfrage abgelehnt: /api/harness nur aus dem Leitstand selbst (Sec-Fetch-Site: ${herkunft})`
}
