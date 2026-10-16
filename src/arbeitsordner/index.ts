/**
 * Datei: src/arbeitsordner/index.ts
 *
 * Zweck: Arbeitsordner je Ablauf (F45 B1a-1, E-F45-3 = A, löst F-954 Kern und F-715 mit loeschliste.ts).
 * Ein Workflow mit mindestens einem schreibenden Schritt arbeitet in einem eigenen Git-Worktree
 * `<Projektordner>-laeufe/<Kurzname>` (10 Hex des SHA-256 der Ablauf-ID, F-1025) auf dem Branch `wf/<workflowId>`; der Projektordner bleibt
 * unberührt. Diese Datei enthält:
 * - die reinen Regeln: Pfad/Branch ableiten (eigene Whitelist für die workflowId als Pfad- und
 *   Branch-Segment), Bedarf und Bestand eines Workflows, Payload-Validator des Kern-Artefakts
 *   'arbeitsordner-<workflowId>', Löschblock im Ergebnistext der Ausführung lesen und ausführen (fuehreLoeschlisteAus, seit
 *   F45 B2b-3b-2a ausgesetzt nach einer Ablehnung durch Stefan, F-1128 (2));
 * - die Git-Abläufe über den Git-Starter (src/git-starter, asynchron): Vorbereiten (idempotent —
 *   Wiederaufnahme statt Abbruch) und Entfernen (git worktree remove, git branch -d, nie -D);
 * - die Vorbedingung eines schreibenden Schritts im Worktree (synchron, Branch exakt wf/<id>).
 *
 * Der Server (scripts/leitstand-server.mjs) hält den Zustand als append-only Artefaktversionen und
 * entscheidet, wann vorbereitet wird; diese Datei schreibt keinen Kontrollzustand.
 *
 * Wird aufgerufen von:
 * - scripts/leitstand-server.mjs, scripts/leitstand/routen-arbeitsordner.mjs
 * - src/arbeitsordner/arbeitsordner.test.ts (node:test)
 *
 * Wichtig: ARCHITECTURE.md §2 erlaubt dem Kern im Arbeitsordner genau dies: Anlegen und Entfernen über
 * git, `npm ci --ignore-scripts`, Löschen geprüfter Dateien (loeschliste.ts). Kein rm -rf, kein
 * `git branch -D`; `git worktree remove --force` nur mit ausdrücklichem „verwerfen“ des Menschen.
 * Durchsetzungsgrad der Invariante „Projektordner unverändert“: geprüft (Tests, realer Nachweis), nicht
 * ERZWUNGEN — das .git ist mit dem Projekt geteilt.
 */

import { createHash } from 'node:crypto'
import { existsSync, realpathSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { pruefeArbeitsordnerVorbedingung } from '../ausfuehrung-vorbedingung/index.ts'
import { fuehreGitAsync, fuehreGitSync } from '../git-starter/index.ts'
import { arbeitsverzeichnisseGleich } from '../invocation-policy/index.ts'
import { baueAusgabeEnde, entferneLeitstandUmgebungsvariablen } from '../pruefschritt/index.ts'
import type { NpmRunner } from '../ressourcen/installation.ts'
import { loescheDateien, MAX_LOESCHPFADE } from './loeschliste.ts'
import type { ArbeitsordnerStatus, ArbeitsordnerV0Daten, LoeschErgebnis, NpmCiErgebnis, PruefErgebnis, Vorbereitung } from './types.ts'

export { loescheDateien, pruefeLoeschpfadText } from './loeschliste.ts'
export type { ArbeitsordnerV0Daten, LoeschErgebnis } from './types.ts'

/** workflowId als Pfad- und Branch-Segment (Advisor-Pass Befund 10): eng, damit weder Windows-Sonderzeichen noch Ref-Regeln greifen. */
const ID_MUSTER = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/

/** Präfix des Branches je Ablauf. */
export const BRANCH_PRAEFIX = 'wf/'

/** Zeitgrenze für `npm ci` bei der Vorbereitung. */
export const NPM_CI_ZEITGRENZE_MS = 10 * 60 * 1000

/** Zeitgrenze für `git worktree add` (checkt das ganze Projekt aus). */
const WORKTREE_ADD_ZEITGRENZE_MS = 5 * 60 * 1000

/** Gültige Status-Werte des Artefakts. */
const STATUS_WERTE: readonly ArbeitsordnerStatus[] = ['IN_VORBEREITUNG', 'BEREIT', 'FEHLGESCHLAGEN', 'ENTFERNT']

/** Länge des Ordnernamens je Ablauf (Hex des SHA-256 der Ablauf-ID). */
const ORDNERNAME_LAENGE = 10

/** Längster zulässiger Dateipfad unter Windows ohne Long-Path-Unterstützung (MAX_PATH 260 inkl. Endzeichen). */
export const WINDOWS_MAX_PFAD = 259

/**
 * Leitet Pfad und Branch des Arbeitsordners ab: Geschwisterordner `<Projektordner>-laeufe/<Kurzname>`, Branch
 * `wf/<workflowId>`. Der Ordnername ist ein kurzer, fester Hash der Ablauf-ID (realer Nachweis B1a-1, F-1025: die
 * volle ID verlängerte jeden Pfad so weit, dass eingecheckte Dateien unter Windows die Pfadgrenze rissen); die
 * Zuordnung steht im Artefakt und in der Anzeige.
 * @param repoWurzel - absoluter Projektordner
 * @param workflowId - Kennung des Workflows
 * @returns { ok: true, pfad, branch } oder { ok: false, grund }
 */
export function leiteArbeitsordnerAb(repoWurzel: string, workflowId: string): { ok: true; pfad: string; branch: string } | { ok: false; grund: string } {
  if (!ID_MUSTER.test(workflowId) || workflowId.endsWith('.') || workflowId.toLowerCase().endsWith('.lock')) {
    return { ok: false, grund: `Die Ablauf-ID '${workflowId}' taugt nicht als Ordner- und Branchname (erlaubt: Buchstaben, Ziffern, . _ -, höchstens 80 Zeichen)` }
  }
  const wurzel = resolve(repoWurzel)
  const name = basename(wurzel)
  if (name.length === 0 || dirname(wurzel) === wurzel) {
    return { ok: false, grund: 'Der Projektordner ist eine Laufwerkswurzel — daneben kann kein Arbeitsordner liegen' }
  }
  const kurzname = createHash('sha256').update(workflowId).digest('hex').slice(0, ORDNERNAME_LAENGE)
  return { ok: true, pfad: join(dirname(wurzel), `${name}-laeufe`, kurzname), branch: `${BRANCH_PRAEFIX}${workflowId}` }
}

/**
 * Längster Pfad, der im Arbeitsordner entstünde (Ordner + längster eingecheckter Pfad), gegen die Windows-Grenze.
 * Rein; außerhalb von Windows immer ok.
 * @param arbeitsordner - absoluter Pfad des Arbeitsordners
 * @param eingecheckt - repo-relative Pfade des Basis-Commits ('/'-getrennt)
 * @param plattform - process.platform
 * @returns { ok: true } oder { ok: false, grund } mit dem längsten Pfad
 */
export function pruefePfadlaengen(arbeitsordner: string, eingecheckt: readonly string[], plattform: string = process.platform): PruefErgebnis {
  if (plattform !== 'win32') return { ok: true }
  let laengster = ''
  for (const pfad of eingecheckt) if (pfad.length > laengster.length) laengster = pfad
  const gesamt = arbeitsordner.length + 1 + laengster.length
  if (gesamt <= WINDOWS_MAX_PFAD) return { ok: true }
  return {
    ok: false,
    grund: `Im Arbeitsordner wäre der längste Pfad ${gesamt} Zeichen lang (Windows-Grenze ${WINDOWS_MAX_PFAD}): ${laengster} — kürzeren Projektpfad wählen oder lange Dateinamen im Repo kürzen`,
  }
}

/** Minimale Sicht auf einen Workflow-Schritt (src/workflow bleibt unabhängig von diesem Modul). */
interface SchrittSicht {
  werkzeugsatz: string
  lauf_id: string | null
}

/**
 * true, wenn der Workflow einen Arbeitsordner braucht: mindestens ein Schritt mit schreibendem Werkzeugsatz.
 * @param schritte - Schritte des Workflows
 * @param artVon - Werkzeugsatzname → 'lesend' | 'schreibend' | undefined (Startvorlage)
 * @returns true bei Bedarf
 */
export function brauchtArbeitsordner(schritte: readonly SchrittSicht[], artVon: (name: string) => string | undefined): boolean {
  return schritte.some((schritt) => artVon(schritt.werkzeugsatz) === 'schreibend')
}

/**
 * true, wenn bereits ein schreibender Schritt gelaufen ist (lauf_id gesetzt). Ohne Artefakt heißt das
 * „Bestand“: der Ablauf lief vor B1a-1 im Projektordner und läuft dort weiter (Plan v2 i).
 * @param schritte - Schritte des Workflows
 * @param artVon - Werkzeugsatzname → Art
 * @returns true, wenn ein schreibender Schritt eine lauf_id trägt
 */
export function schreibenderSchrittGelaufen(schritte: readonly SchrittSicht[], artVon: (name: string) => string | undefined): boolean {
  return schritte.some((schritt) => artVon(schritt.werkzeugsatz) === 'schreibend' && schritt.lauf_id !== null)
}

/**
 * Validiert die Payload des Kern-Artefakts 'arbeitsordner-<workflowId>' (Handnachbau von
 * schemas/kontrollzustand-arbeitsordner-payload.schema.json, Muster validierePruefergebnisDaten).
 * @param daten - zu prüfender Wert
 * @returns Liste der Verstöße (leer = gültig)
 */
export function validiereArbeitsordnerDaten(daten: unknown): string[] {
  const verstoesse: string[] = []
  if (typeof daten !== 'object' || daten === null || Array.isArray(daten)) return ['Wurzel ist kein Objekt']
  const obj = daten as Record<string, unknown>
  const erlaubt = new Set(['arbeitsordner_schema', 'workflow_id', 'projekt_wurzel', 'pfad', 'branch', 'basis_commit', 'status', 'grund', 'vorbereitung', 'aufraeumen', 'aktualisiert_am'])
  for (const feld of Object.keys(obj)) if (!erlaubt.has(feld)) verstoesse.push(`unbekanntes Feld '${feld}'`)
  for (const feld of erlaubt) if (!(feld in obj)) verstoesse.push(`Pflichtfeld '${feld}' fehlt`)
  if (obj.arbeitsordner_schema !== 'v0') verstoesse.push("'arbeitsordner_schema' muss 'v0' sein")
  for (const feld of ['workflow_id', 'projekt_wurzel', 'pfad', 'branch', 'aktualisiert_am']) {
    if (typeof obj[feld] !== 'string' || (obj[feld] as string).length === 0) verstoesse.push(`'${feld}' muss ein nicht-leerer String sein`)
  }
  if (obj.basis_commit !== null && (typeof obj.basis_commit !== 'string' || !/^[0-9a-f]{40,64}$/.test(obj.basis_commit))) verstoesse.push("'basis_commit' muss null oder ein Commit-Hash sein")
  if (!STATUS_WERTE.includes(obj.status as ArbeitsordnerStatus)) verstoesse.push(`'status' muss einer von ${STATUS_WERTE.join(', ')} sein`)
  if (obj.grund !== null && typeof obj.grund !== 'string') verstoesse.push("'grund' muss null oder ein String sein")
  if (obj.vorbereitung !== null) {
    const v = obj.vorbereitung as Record<string, unknown> | undefined
    if (typeof v !== 'object' || v === null || Array.isArray(v)) verstoesse.push("'vorbereitung' muss null oder ein Objekt sein")
    else {
      for (const feld of Object.keys(v)) if (!['worktree_ms', 'npm_ci', 'e183_ms'].includes(feld)) verstoesse.push(`unbekanntes Feld 'vorbereitung.${feld}'`)
      for (const feld of ['worktree_ms', 'e183_ms']) if (v[feld] !== null && !(Number.isInteger(v[feld]) && (v[feld] as number) >= 0)) verstoesse.push(`'vorbereitung.${feld}' muss null oder eine ganze Zahl >= 0 sein`)
      if (v.npm_ci !== null) {
        const n = v.npm_ci as Record<string, unknown> | undefined
        if (typeof n !== 'object' || n === null || Array.isArray(n)) verstoesse.push("'vorbereitung.npm_ci' muss null oder ein Objekt sein")
        else {
          for (const feld of Object.keys(n)) if (!['ergebnis', 'exit_code', 'dauer_ms', 'ausgabe_ende'].includes(feld)) verstoesse.push(`unbekanntes Feld 'vorbereitung.npm_ci.${feld}'`)
          if (!['OK', 'FEHLER', 'ZEITGRENZE', 'UEBERSPRUNGEN'].includes(n.ergebnis as string)) verstoesse.push("'vorbereitung.npm_ci.ergebnis' unbekannt")
          if (n.exit_code !== null && !Number.isInteger(n.exit_code)) verstoesse.push("'vorbereitung.npm_ci.exit_code' muss null oder ganzzahlig sein")
          if (!Number.isInteger(n.dauer_ms) || (n.dauer_ms as number) < 0) verstoesse.push("'vorbereitung.npm_ci.dauer_ms' muss eine ganze Zahl >= 0 sein")
          if (typeof n.ausgabe_ende !== 'string') verstoesse.push("'vorbereitung.npm_ci.ausgabe_ende' muss ein String sein")
        }
      }
    }
  }
  if (obj.aufraeumen !== null) {
    const a = obj.aufraeumen as Record<string, unknown> | undefined
    if (typeof a !== 'object' || a === null || Array.isArray(a)) verstoesse.push("'aufraeumen' muss null oder ein Objekt sein")
    else {
      for (const feld of Object.keys(a)) if (!['begruendung', 'verworfen', 'branch_geloescht', 'hinweis', 'am'].includes(feld)) verstoesse.push(`unbekanntes Feld 'aufraeumen.${feld}'`)
      if (typeof a.begruendung !== 'string' || a.begruendung.trim().length === 0) verstoesse.push("'aufraeumen.begruendung' muss ein nicht-leerer String sein")
      if (typeof a.verworfen !== 'boolean' || typeof a.branch_geloescht !== 'boolean') verstoesse.push("'aufraeumen.verworfen'/'branch_geloescht' müssen boolean sein")
      if (a.hinweis !== null && typeof a.hinweis !== 'string') verstoesse.push("'aufraeumen.hinweis' muss null oder ein String sein")
      if (typeof a.am !== 'string') verstoesse.push("'aufraeumen.am' muss ein String sein")
    }
  }
  return verstoesse
}

/** Codeblock mit Info-String zu_loeschen am Zeilenanfang, Inhalt bis zur schließenden Zaunzeile. */
const LOESCHBLOCK = /^```zu_loeschen[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*$/gm

/**
 * Liest die Löschliste aus dem Ergebnistext eines Ausführungslaufs (strukturiertes 'result'-Feld des
 * Ereignisstroms, dieselbe Quelle wie Regel 1e). Form (schemas/ergebnis-ausfuehrung-loeschliste.schema.json):
 * genau ein Codeblock ```zu_loeschen mit JSON { "zu_loeschen": ["pfad", …] }.
 * @param text - Ergebnistext oder null
 * @returns 'keine' ohne Block, 'ok' mit Pfaden, 'ungueltig' mit Grund
 */
export function leseLoeschliste(text: string | null): { status: 'keine' } | { status: 'ok'; pfade: unknown[] } | { status: 'ungueltig'; grund: string } {
  if (text === null) return { status: 'keine' }
  const bloecke = [...text.matchAll(LOESCHBLOCK)]
  if (bloecke.length === 0) return { status: 'keine' }
  if (bloecke.length > 1) return { status: 'ungueltig', grund: 'mehr als ein zu_loeschen-Block' }
  let wert: unknown
  try {
    wert = JSON.parse(bloecke[0][1])
  } catch (fehler) {
    return { status: 'ungueltig', grund: `zu_loeschen-Block ist kein JSON (${(fehler as Error).message})` }
  }
  if (typeof wert !== 'object' || wert === null || Array.isArray(wert)) return { status: 'ungueltig', grund: 'zu_loeschen-Block ist kein Objekt' }
  const felder = Object.keys(wert)
  if (felder.length !== 1 || felder[0] !== 'zu_loeschen') return { status: 'ungueltig', grund: "zu_loeschen-Block muss genau das Feld 'zu_loeschen' tragen" }
  const pfade = (wert as { zu_loeschen: unknown }).zu_loeschen
  if (!Array.isArray(pfade)) return { status: 'ungueltig', grund: "'zu_loeschen' muss eine Liste sein" }
  if (pfade.length > MAX_LOESCHPFADE) return { status: 'ungueltig', grund: `'zu_loeschen' trägt mehr als ${MAX_LOESCHPFADE} Pfade` }
  return { status: 'ok', pfade }
}

/** F45 B2b-3b-2a (F-1128 (2)): Grund je Pfad, wenn die Löschliste nach einer Ablehnung durch Stefan nur als Hinweis steht. */
export const LOESCHLISTE_AUSGESETZT = 'nicht gelöscht: Stefan hat im Lauf einen Befehl abgelehnt — Löschliste nur als Hinweis (F-1128)'

/**
 * Führt die Löschliste eines Ausführungslaufs aus (Server-Nachlauf nach ERFOLGREICH): Block lesen, dann löschen. Hat Stefan im
 * Lauf einen Befehl abgelehnt (abgelehnt_durch_stefan > 0), wird nichts gelöscht — ein abgelehntes `rm …` darf nicht über den
 * zu_loeschen-Block doch wirken; die Pfade stehen dann mit LOESCHLISTE_AUSGESETZT unter `abgelehnt` (Hinweis in der Übersicht).
 * @param arbeitsordner - absoluter Pfad des Arbeitsordners (Worktree)
 * @param ergebnistext - Ergebnistext des Laufs oder null
 * @param stefanAbgelehnt - true, wenn die Klassifikation abgelehnt_durch_stefan > 0 trägt
 * @returns undefined (kein Block) oder gelöschte und abgelehnte Pfade
 */
export function fuehreLoeschlisteAus(arbeitsordner: string, ergebnistext: string | null, stefanAbgelehnt: boolean): LoeschErgebnis | undefined {
  const gelesen = leseLoeschliste(ergebnistext)
  if (gelesen.status === 'keine') return undefined
  if (gelesen.status === 'ungueltig') return { geloescht: [], abgelehnt: [{ pfad: '(zu_loeschen-Block)', grund: gelesen.grund }] }
  if (stefanAbgelehnt) return { geloescht: [], abgelehnt: gelesen.pfade.map((pfad) => ({ pfad: String(pfad), grund: LOESCHLISTE_AUSGESETZT })) }
  return loescheDateien(arbeitsordner, gelesen.pfade)
}

/** Satz für die Ausführungs-Instruktion (starteWorkflowSchritt) — nennt Feld, Form und Grenzen der Löschliste. */
export function baueLoeschlistenSatz(): string {
  return [
    'Hinweis: Du arbeitest in einem eigenen Arbeitsordner (Git-Worktree) dieses Ablaufs, nicht im Projektordner.',
    'Dateien löschst du nicht selbst. Soll eine Datei weg, nenne sie am Ende deines Ergebnisses in genau einem Block:',
    '```zu_loeschen',
    '{ "zu_loeschen": ["pfad/relativ/zur/wurzel.txt"] }',
    '```',
    'Der Server prüft und löscht danach: nur einzelne Dateien, relativ zur Wurzel, nichts unter .git, .claude/ oder kontrollzustand/, keine Verzeichnisse.',
  ].join('\n')
}

/** Ein Eintrag aus `git worktree list --porcelain`. */
interface WorktreeEintrag {
  pfad: string
  branch: string | null
  kopf: string | null
  gesperrt: boolean
  verwaist: boolean
}

/**
 * Liest `git worktree list --porcelain` (Blöcke durch Leerzeilen getrennt).
 * @param roh - Ausgabe
 * @returns Einträge mit Pfad, Branch-Ref (oder null), HEAD-Commit und den Marken locked/prunable
 */
export function parseWorktreeListe(roh: string): WorktreeEintrag[] {
  const eintraege: WorktreeEintrag[] = []
  for (const block of roh.replace(/\r/g, '').split('\n\n')) {
    const zeilen = block.split('\n')
    const pfadZeile = zeilen.find((zeile) => zeile.startsWith('worktree '))
    if (pfadZeile === undefined) continue
    const branchZeile = zeilen.find((zeile) => zeile.startsWith('branch '))
    const kopfZeile = zeilen.find((zeile) => zeile.startsWith('HEAD '))
    eintraege.push({
      pfad: pfadZeile.slice('worktree '.length),
      branch: branchZeile !== undefined ? branchZeile.slice('branch '.length) : null,
      kopf: kopfZeile !== undefined ? kopfZeile.slice('HEAD '.length) : null,
      gesperrt: zeilen.some((zeile) => zeile === 'locked' || zeile.startsWith('locked ')),
      verwaist: zeilen.some((zeile) => zeile === 'prunable' || zeile.startsWith('prunable ')),
    })
  }
  return eintraege
}

/**
 * Gleicher Ort zweier Pfade: zuerst über realpath (Groß/Klein, 8.3, Schrägstriche aus git), sonst normalisiert.
 * @param a - erster Pfad
 * @param b - zweiter Pfad
 * @returns true bei gleichem Ort
 */
function gleicherOrt(a: string, b: string): boolean {
  try {
    return arbeitsverzeichnisseGleich(realpathSync.native(a), realpathSync.native(b))
  } catch {
    return arbeitsverzeichnisseGleich(resolve(a), resolve(b))
  }
}

/**
 * Offene Änderungen eines frischen Worktrees außer node_modules/ (Plan v3 B6: Fremdprojekte ohne
 * node_modules in .gitignore).
 * @param statusRoh - `git status --porcelain`
 * @returns Anzahl unsauberer Zeilen
 */
function zaehleUnsauber(statusRoh: string): number {
  return statusRoh
    .replace(/\r/g, '')
    .split('\n')
    .filter((zeile) => zeile.length > 3 && !zeile.slice(3).startsWith('node_modules/') && zeile.slice(3) !== 'node_modules').length
}

/** Eingaben der Vorbereitung. */
export interface VorbereitungEingaben {
  repoWurzel: string
  workflowId: string
  /** basis_commit einer früheren Version (Wiederaufnahme), sonst null. */
  vorherigeBasis: string | null
  /** npm ohne Shell (src/ressourcen/installation.ts npmReal; Tests: Attrappe). */
  npm: NpmRunner
  /** E-183 gegen den Worktree (nur lesend). */
  pruefeE183: (arbeitsordner: string) => PruefErgebnis
  npmZeitgrenzeMs?: number
}

/** Ergebnis der Vorbereitung: die Felder, aus denen der Server die nächste Artefaktversion baut. */
export interface VorbereitungErgebnis {
  status: 'BEREIT' | 'FEHLGESCHLAGEN'
  pfad: string
  branch: string
  basis_commit: string | null
  grund: string | null
  vorbereitung: Vorbereitung
}

/**
 * Text einer Git-Fehlermeldung für einen Grund (eine Zeile, gekürzt).
 * @param stderr - stderr
 * @returns kurzer Text
 */
function gitText(stderr: string): string {
  // Fehlerzeilen zuerst (realer Nachweis B1a-1: Fortschrittszeilen verdrängten sonst den eigentlichen Grund).
  const zeilen = stderr.replace(/\r/g, '\n').split('\n').map((zeile) => zeile.trim()).filter((zeile) => zeile.length > 0)
  const fehler = zeilen.filter((zeile) => /^(fatal|error):/i.test(zeile))
  const text = (fehler.length > 0 ? [...fehler.slice(0, 1), ...fehler.slice(-1)].filter((z, i, a) => a.indexOf(z) === i) : zeilen.slice(-2)).join(' … ')
  return text.length > 400 ? `${text.slice(0, 400)}…` : text
}

/**
 * Bereitet den Arbeitsordner eines Workflows vor (idempotent, Plan v2 d): Projekt muss Git-Wurzel mit
 * Commit sein; registrierter Worktree auf wf/<id> wird wiederverwendet, ein stehengebliebener Branch ohne
 * Worktree wieder ausgecheckt, ein fremder Pfad hält an. Danach `npm ci --ignore-scripts` (nur mit
 * package.json und package-lock.json) und die E-183-Vorprüfung gegen den Worktree. Wirft nie.
 * @param eingaben - VorbereitungEingaben
 * @returns VorbereitungErgebnis (BEREIT oder FEHLGESCHLAGEN mit Grund)
 */
export async function bereiteArbeitsordnerVor(eingaben: VorbereitungEingaben): Promise<VorbereitungErgebnis> {
  const vorbereitung: Vorbereitung = { worktree_ms: null, npm_ci: null, e183_ms: null }
  const abgeleitet = leiteArbeitsordnerAb(eingaben.repoWurzel, eingaben.workflowId)
  const pfad = abgeleitet.ok ? abgeleitet.pfad : join(eingaben.repoWurzel, '..')
  const branch = abgeleitet.ok ? abgeleitet.branch : `${BRANCH_PRAEFIX}${eingaben.workflowId}`
  let basis: string | null = eingaben.vorherigeBasis
  const fehlschlag = (grund: string): VorbereitungErgebnis => ({ status: 'FEHLGESCHLAGEN', pfad, branch, basis_commit: basis, grund, vorbereitung })
  if (!abgeleitet.ok) return fehlschlag(abgeleitet.grund)

  const cwd = eingaben.repoWurzel
  const top = await fuehreGitAsync(['rev-parse', '--show-toplevel'], { cwd })
  if (top.code !== 0) return fehlschlag(`Das Projekt ist kein Git-Repository (${gitText(top.stderr)})`)
  if (!gleicherOrt(top.stdout.trim(), cwd)) return fehlschlag(`Der Projektordner ist nicht die Wurzel seines Git-Repositorys (Wurzel: ${top.stdout.trim()})`)
  const kopf = await fuehreGitAsync(['rev-parse', '--verify', '--quiet', 'HEAD^{commit}'], { cwd })
  if (kopf.code !== 0) return fehlschlag('Das Projekt hat noch keinen Commit — erst einen Commit anlegen, dann den Ablauf starten')

  const projektKopf = kopf.stdout.trim()

  // Pfadlänge vorab (F-1025): unter Windows riss der Checkout sonst erst nach Minuten an MAX_PATH.
  const eingecheckt = await fuehreGitAsync(['-c', 'core.quotePath=false', 'ls-tree', '-r', '--name-only', projektKopf], { cwd, maxBuffer: 256 * 1024 * 1024 })
  if (eingecheckt.code !== 0) return fehlschlag(`git ls-tree fehlgeschlagen (${gitText(eingecheckt.stderr)})`)
  const laenge = pruefePfadlaengen(pfad, eingecheckt.stdout.split('\n').filter((zeile) => zeile.length > 0))
  if (!laenge.ok) return fehlschlag(laenge.grund)
  const start = Date.now()
  const liste = await fuehreGitAsync(['worktree', 'list', '--porcelain'], { cwd })
  if (liste.code !== 0) return fehlschlag(`git worktree list fehlgeschlagen (${gitText(liste.stderr)})`)
  const aufraeumenHinweis = '„Arbeitsordner aufräumen“ wählen und den Ablauf danach neu starten'
  const vorhanden = parseWorktreeListe(liste.stdout).find((eintrag) => gleicherOrt(eintrag.pfad, pfad))
  if (vorhanden !== undefined) {
    // Wiederaufnahme (Plan v3 B5) nur auf einem vollständigen, eigenen, unveränderten Worktree.
    if (vorhanden.gesperrt || vorhanden.verwaist) return fehlschlag(`Der Arbeitsordner ${pfad} ist unvollständig (git meldet ${vorhanden.gesperrt ? 'locked' : 'prunable'}) — ${aufraeumenHinweis}`)
    if (vorhanden.branch !== `refs/heads/${branch}`) return fehlschlag(`Unter ${pfad} liegt ein Worktree auf einem anderen Branch (${vorhanden.branch ?? 'losgelöst'})`)
    if (basis !== null && vorhanden.kopf !== basis) return fehlschlag(`Der Arbeitsordner steht nicht mehr auf seinem Basis-Commit — ${aufraeumenHinweis}`)
    basis = vorhanden.kopf
  } else {
    if (existsSync(pfad)) return fehlschlag(`Der Ordner ${pfad} existiert bereits, ist aber kein Arbeitsordner dieses Ablaufs — bitte von Hand prüfen und entfernen, dann neu starten`)
    const branchDa = await fuehreGitAsync(['rev-parse', '--verify', '--quiet', `refs/heads/${branch}^{commit}`], { cwd })
    if (branchDa.code === 0) {
      // Branch ohne Worktree (z. B. nach abgebrochenem Anlegen) nur, wenn er noch auf dem Projekt-HEAD steht.
      if (branchDa.stdout.trim() !== projektKopf) return fehlschlag(`Der Branch ${branch} existiert bereits mit eigenem Stand — erst sichern oder von Hand löschen, dann neu starten`)
      const add = await fuehreGitAsync(['worktree', 'add', '--quiet', pfad, branch], { cwd, zeitgrenzeMs: WORKTREE_ADD_ZEITGRENZE_MS })
      if (add.code !== 0) return fehlschlag(`git worktree add fehlgeschlagen (${gitText(add.stderr)})`)
    } else {
      const add = await fuehreGitAsync(['worktree', 'add', '--quiet', '-b', branch, pfad, projektKopf], { cwd, zeitgrenzeMs: WORKTREE_ADD_ZEITGRENZE_MS })
      if (add.code !== 0) return fehlschlag(`git worktree add fehlgeschlagen (${gitText(add.stderr)})`)
    }
    basis = projektKopf
  }
  vorbereitung.worktree_ms = Date.now() - start

  // Sauberkeit des frischen Arbeitsordners (E-F39-1=B beim Anlegen, Plan v3 B6) — vor npm ci.
  const status = await fuehreGitAsync(['--no-optional-locks', 'status', '--porcelain'], { cwd: pfad })
  if (status.code !== 0) return fehlschlag(`git status im Arbeitsordner fehlgeschlagen (${gitText(status.stderr)})`)
  const unsauber = zaehleUnsauber(status.stdout)
  if (unsauber > 0) return fehlschlag(`Der Arbeitsordner ist nach dem Anlegen nicht sauber (${unsauber} Datei(en)) — ${aufraeumenHinweis}`)

  if (existsSync(join(pfad, 'package.json'))) {
    vorbereitung.npm_ci = await fuehreNpmCiAus(pfad, eingaben.npm, eingaben.npmZeitgrenzeMs ?? NPM_CI_ZEITGRENZE_MS)
    if (vorbereitung.npm_ci.ergebnis === 'FEHLER' || vorbereitung.npm_ci.ergebnis === 'ZEITGRENZE') {
      // QA-Pass B1a-1: die letzte Ausgabezeile gehört in den Grund (sonst sieht Stefan nur den Exit-Code).
      const letzte = vorbereitung.npm_ci.ausgabe_ende.trim().split('\n').pop()?.trim() ?? ''
      return fehlschlag(`npm ci im Arbeitsordner ${vorbereitung.npm_ci.ergebnis === 'ZEITGRENZE' ? 'hat die Zeitgrenze überschritten' : `ist fehlgeschlagen (Exit ${vorbereitung.npm_ci.exit_code})`}${letzte !== '' ? `: ${letzte.slice(0, 200)}` : ''}`)
    }
  }

  const e183Start = Date.now()
  let e183: PruefErgebnis
  try {
    e183 = eingaben.pruefeE183(pfad)
  } catch (fehler) {
    e183 = { ok: false, grund: (fehler as Error).message }
  }
  vorbereitung.e183_ms = Date.now() - e183Start
  if (!e183.ok) return fehlschlag(`Die Werkzeugkonfiguration im Arbeitsordner besteht die Startprüfung nicht: ${e183.grund}`)

  return { status: 'BEREIT', pfad, branch, basis_commit: basis, grund: null, vorbereitung }
}

/**
 * `npm ci --ignore-scripts` im Arbeitsordner (Lifecycle-Skripte wie `prepare` schrieben sonst ins
 * gemeinsame .git). Ohne package-lock.json übersprungen (npm ci verlangt ihn; npm install schriebe ihn).
 * @param pfad - Arbeitsordner
 * @param npm - npm-Runner
 * @param zeitgrenzeMs - Zeitgrenze
 * @returns NpmCiErgebnis
 */
async function fuehreNpmCiAus(pfad: string, npm: NpmRunner, zeitgrenzeMs: number): Promise<NpmCiErgebnis> {
  if (!existsSync(join(pfad, 'package-lock.json'))) {
    return { ergebnis: 'UEBERSPRUNGEN', exit_code: null, dauer_ms: 0, ausgabe_ende: 'kein package-lock.json — npm ci übersprungen' }
  }
  const start = Date.now()
  try {
    // Plan v3 B8: ohne LEITSTAND_*- und GIT_*-Variablen des Servers.
    const env = Object.fromEntries(Object.entries(entferneLeitstandUmgebungsvariablen()).filter(([name]) => !name.toUpperCase().startsWith('GIT_')))
    const lauf = await npm(['ci', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: pfad, timeoutMs: zeitgrenzeMs, env })
    const ergebnis = lauf.zeitueberschritten ? 'ZEITGRENZE' : lauf.code === 0 ? 'OK' : 'FEHLER'
    return { ergebnis, exit_code: lauf.code, dauer_ms: Date.now() - start, ausgabe_ende: baueAusgabeEnde(lauf.stdout, lauf.stderr) }
  } catch (fehler) {
    return { ergebnis: 'FEHLER', exit_code: null, dauer_ms: Date.now() - start, ausgabe_ende: `npm nicht startbar: ${(fehler as Error).message}` }
  }
}

/** Eingaben des Entfernens. */
export interface EntfernenEingaben {
  repoWurzel: string
  pfad: string
  branch: string
  /** true nur nach ausdrücklicher Bestätigung: offene Änderungen im Arbeitsordner werden verworfen. */
  verwerfen: boolean
}

/**
 * Entfernt den Arbeitsordner (git worktree remove, mit --force nur bei verwerfen) und löscht den Branch nur,
 * wenn git ihn als gemergt ansieht (git branch -d, nie -D). Wirft nie.
 * @param eingaben - EntfernenEingaben
 * @returns { ok: true, branchGeloescht, hinweis } oder { ok: false, grund } (Artefakt bleibt dann unverändert)
 */
export async function entferneArbeitsordner(eingaben: EntfernenEingaben): Promise<{ ok: true; branchGeloescht: boolean; hinweis: string | null } | { ok: false; grund: string }> {
  const cwd = eingaben.repoWurzel
  const liste = await fuehreGitAsync(['worktree', 'list', '--porcelain'], { cwd })
  const eintrag = liste.code === 0 ? parseWorktreeListe(liste.stdout).find((e) => gleicherOrt(e.pfad, eingaben.pfad)) : undefined
  if (existsSync(eingaben.pfad) || eintrag !== undefined) {
    // Offene Änderungen sprachunabhängig vorab (Code-Review B1a-1, Befund 9) — ohne „verwerfen“ wird nichts entfernt.
    if (!eingaben.verwerfen && existsSync(eingaben.pfad)) {
      const status = await fuehreGitAsync(['--no-optional-locks', 'status', '--porcelain'], { cwd: eingaben.pfad })
      const offen = status.code === 0 ? zaehleUnsauber(status.stdout) : 0
      if (offen > 0) {
        return { ok: false, grund: `Der Arbeitsordner hat ${offen} nicht gesicherte Änderung(en) — erst sichern (committen) oder „Änderungen verwerfen“ wählen` }
      }
    }
    // Ein beim Anlegen abgebrochener Worktree bleibt gesperrt („initializing“); --force allein entfernt ihn nicht
    // (Code-Review B1a-1, Befund 3). Entsperrt wird nur mit ausdrücklichem „verwerfen“.
    if (eintrag?.gesperrt === true) {
      if (!eingaben.verwerfen) return { ok: false, grund: 'Der Arbeitsordner ist gesperrt (abgebrochenes Anlegen) — zum Entfernen „Änderungen verwerfen“ wählen' }
      await fuehreGitAsync(['worktree', 'unlock', eingaben.pfad], { cwd })
    }
    if (!existsSync(eingaben.pfad)) {
      // Ordner von Hand gelöscht: git trägt den verwaisten Eintrag nur über prune aus (betrifft nur verwaiste Einträge).
      const ausgetragen = await fuehreGitAsync(['worktree', 'prune'], { cwd })
      if (ausgetragen.code !== 0) return { ok: false, grund: `git worktree prune fehlgeschlagen (${gitText(ausgetragen.stderr)})` }
    } else {
      const argumente = eingaben.verwerfen ? ['worktree', 'remove', '--force', eingaben.pfad] : ['worktree', 'remove', eingaben.pfad]
      const entfernt = await fuehreGitAsync(argumente, { cwd, zeitgrenzeMs: WORKTREE_ADD_ZEITGRENZE_MS })
      if (entfernt.code !== 0) return { ok: false, grund: `git worktree remove fehlgeschlagen (${gitText(entfernt.stderr)})` }
    }
  }
  const branchDa = await fuehreGitAsync(['rev-parse', '--verify', '--quiet', `refs/heads/${eingaben.branch}`], { cwd })
  if (branchDa.code !== 0) return { ok: true, branchGeloescht: false, hinweis: `Branch ${eingaben.branch} existiert nicht mehr` }
  const geloescht = await fuehreGitAsync(['branch', '-d', eingaben.branch], { cwd })
  if (geloescht.code === 0) return { ok: true, branchGeloescht: true, hinweis: null }
  return { ok: true, branchGeloescht: false, hinweis: `Branch ${eingaben.branch} bleibt bestehen — er ist nicht gemergt (git: ${gitText(geloescht.stderr)})` }
}

/**
 * Vorbedingung eines schreibenden Schritts im Arbeitsordner (Plan v3 B6, Entscheidungsbedarf E-F45-5): liest
 * HEAD per `git symbolic-ref -q HEAD` (im Worktree ist .git eine Datei) und prüft über die reine Funktion
 * pruefeArbeitsordnerVorbedingung nur den Branch. Synchron, weil loeseAusfuehrungsEingabenAuf synchron ist.
 * @param pfad - Arbeitsordner
 * @param branch - erwarteter Branch (wf/<id>)
 * @returns PruefErgebnis
 */
export function leseArbeitsordnerVorbedingung(pfad: string, branch: string): PruefErgebnis {
  if (!existsSync(pfad)) return { ok: false, grund: `Ausführung gesperrt: der Arbeitsordner ${pfad} fehlt.` }
  let kopfRef: string
  try {
    kopfRef = fuehreGitSync(['symbolic-ref', '-q', 'HEAD'], { cwd: pfad, encoding: 'utf8', timeout: 10_000 })
  } catch {
    kopfRef = ''
  }
  return pruefeArbeitsordnerVorbedingung(kopfRef, branch)
}
